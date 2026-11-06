'use strict';
/* v32 미디어 작업기 — 대기열(lms_media_q)에서 일감을 집어 ffmpeg로 HLS 변환(360p · 720p H.264/AAC, 6초 세그먼트) · 자막용 음성 추출 · STT를 돌린다.
   Java 에디션 LmsVWorker와 같은 순서 · 같은 SQL 함수(lms_v_w_*)를 쓴다. 두 서버가 같은 DB를 보면 먼저 집은 쪽이 처리한다(for update skip locked).
   환경: MEDIA_WORKER=0이면 끈다 · FFMPEG(기본 ffmpeg) · FFPROBE · MEDIA_TMP · MEDIA_STT_CMD(<명령> <음성 파일> <언어> → 표준출력 WebVTT) · MEDIA_STT_ENGINE(표시 이름)
   STT 명령이 없으면 「데모 자막」(대사에 데모임을 밝힘)을 만든다 — 운영 이미지는 whisper.cpp(lms/media/stt-whispercpp.sh)를 넣는다(service/Dockerfile). */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const store = require('./store');

const FF = () => process.env.FFMPEG || 'ffmpeg';
const FP = () => process.env.FFPROBE || 'ffprobe';
const WID = 'node-' + os.hostname().slice(0, 20) + '-' + process.pid;
const MIME = { '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t', '.jpg': 'image/jpeg', '.m4a': 'audio/mp4' };

function run(cmd, args, { timeout = 4 * 3600e3, onOut } = {}) {
  return new Promise((ok, no) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let out = '', err = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); }, timeout);
    p.stdout.on('data', d => { out += d; if (out.length > 8e6) out = out.slice(-4e6); if (onOut) onOut(String(d)); });
    p.stderr.on('data', d => { err += d; if (err.length > 64e3) err = err.slice(-32e3); });
    p.on('error', e => { clearTimeout(t); no(e); });
    p.on('close', code => { clearTimeout(t); code === 0 ? ok(out) : no(new Error(`${path.basename(cmd)} 종료 코드 ${code}: ${err.split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 300)}`)); });
  });
}
const even = n => Math.max(2, Math.floor(n / 2) * 2);

/* 변환 계획(Java와 같은 규칙): 원본 높이를 넘지 않게 360 · 720, 같으면 하나만 */
function plan(h) {
  const a = Math.min(360, even(h || 360)), b = Math.min(720, even(h || 720));
  const L = [{ name: a + 'p', height: a, kbps: 800 }, { name: b + 'p', height: b, kbps: b >= 720 ? 2500 : 1400 }];
  return b <= a ? [L[0]] : L;
}
function ffArgs(src, out, R, hasAudio, ts, te) {
  const a = ['-hide_banner', '-y', '-nostdin'];
  if (ts != null) a.push('-ss', String(ts));
  a.push('-i', src);
  if (te != null) a.push('-t', String(Math.max(0.5, te - (ts || 0))));
  const split = R.length > 1 ? `[0:v]split=${R.length}${R.map((_, i) => `[s${i}]`).join('')};` : '[0:v]null[s0];';
  a.push('-filter_complex', split + R.map((r, i) => `[s${i}]scale=-2:${r.height}[v${i}]`).join(';'));
  R.forEach((r, i) => { a.push('-map', `[v${i}]`); if (hasAudio) a.push('-map', '0:a:0'); });
  a.push('-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-g', '48', '-keyint_min', '48', '-sc_threshold', '0');
  R.forEach((r, i) => a.push(`-b:v:${i}`, r.kbps + 'k', `-maxrate:v:${i}`, Math.round(r.kbps * 1.07) + 'k', `-bufsize:v:${i}`, Math.round(r.kbps * 1.5) + 'k'));
  if (hasAudio) a.push('-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '48000');
  a.push('-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_flags', 'independent_segments',
    '-hls_segment_filename', path.join(out, '%v', 'seg_%03d.ts'), '-master_pl_name', 'master.m3u8',
    '-var_stream_map', R.map((r, i) => (hasAudio ? `v:${i},a:${i}` : `v:${i}`) + `,name:${r.name}`).join(' '),
    '-progress', 'pipe:1', '-stats_period', '2', path.join(out, '%v', 'index.m3u8'));
  return a;
}

module.exports = function startWorker(ctx) {
  const { pool, inTenant, log } = ctx;
  if (process.env.MEDIA_WORKER === '0' || module.exports.started) return;
  module.exports.started = true;
  const W = { kind: 'worker', engine: 'ffmpeg' };
  const call = (tid, fn, a, c) => (c ? c.query(`select ${fn}($1::jsonb, $2::jsonb) r`, [JSON.stringify(W), JSON.stringify(a)]).then(x => x.rows[0].r)
    : inTenant(pool, tid, cc => cc.query(`select ${fn}($1::jsonb, $2::jsonb) r`, [JSON.stringify(W), JSON.stringify(a)]).then(x => x.rows[0].r)));
  let busy = false;

  async function claim() {
    const r = await pool.query(`update lms_media_q set status = 'running', locked_at = now(), worker = $1 where job_id = (select job_id from lms_media_q
      where status = 'queued' or (status = 'running' and locked_at < now() - interval '30 minutes') order by created_at limit 1 for update skip locked) returning job_id::text, tenant_id, kind`, [WID]);
    return r.rows[0] || null;
  }
  async function transcode(tid, J, tmp) {
    const src = path.join(tmp, 'src'); const fd = await fs.promises.open(src, 'w');
    try { for (let i = 0; i < J.chunks; i++) { const b = await inTenant(pool, tid, c => c.query('select data from lms_media_obj where media_id = $1 and path = $2', [J.media_id, 'src/' + String(i).padStart(6, '0')]).then(x => x.rows[0] && x.rows[0].data)); if (!b) throw new Error('원본 조각이 없습니다: ' + i); await fd.write(b); } }
    finally { await fd.close(); }
    await call(tid, 'lms_v_w_progress', { job_id: J.job_id, progress: 2, step: '원본 분석' });
    const pr = JSON.parse(await run(FP(), ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', src], { timeout: 120e3 }));
    const vs = (pr.streams || []).find(s => s.codec_type === 'video'); const hasAudio = (pr.streams || []).some(s => s.codec_type === 'audio');
    if (!vs) throw new Error('영상 트랙이 없습니다(동영상 파일인지 확인하세요).');
    let dur = Number(pr.format && pr.format.duration) || Number(vs.duration) || 0;
    const ts = J.trim_start != null ? Math.min(J.trim_start, Math.max(0, dur - 0.5)) : null; const te = J.trim_end != null && (!dur || J.trim_end < dur) ? J.trim_end : null;
    const R = plan(Number(vs.height) || 0); const out = path.join(tmp, 'out'); for (const r of R) await fs.promises.mkdir(path.join(out, r.name), { recursive: true });
    const total = Math.max(1, (te != null ? te : dur) - (ts || 0)); let last = 0;
    await call(tid, 'lms_v_w_progress', { job_id: J.job_id, progress: 5, step: 'HLS 변환(' + R.map(r => r.name).join(' · ') + ')' });
    await run(FF(), ffArgs(src, out, R, hasAudio, ts, te), { onOut: s => { const m = /out_time_us=(\d+)/.exec(s); if (m && Date.now() - last > 2000) { last = Date.now(); const p = Math.min(90, 5 + Math.round(85 * (Number(m[1]) / 1e6) / total)); call(tid, 'lms_v_w_progress', { job_id: J.job_id, progress: p, step: 'HLS 변환' }).catch(() => {}); } } });
    await run(FF(), ['-hide_banner', '-y', '-nostdin', '-ss', String(Math.min(1, total / 2) + (ts || 0)), '-i', src, '-frames:v', '1', '-vf', 'scale=-2:360', path.join(out, 'poster.jpg')], { timeout: 120e3 }).catch(() => {});
    if (hasAudio) { await fs.promises.mkdir(path.join(out, 'stt'), { recursive: true }); const ta = []; if (ts != null) ta.push('-ss', String(ts)); ta.push('-i', src); if (te != null) ta.push('-t', String(total));
      await run(FF(), ['-hide_banner', '-y', '-nostdin', ...ta, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'aac', '-b:a', '48k', path.join(out, 'stt', 'audio.m4a')]); }
    await call(tid, 'lms_v_w_progress', { job_id: J.job_id, progress: 92, step: '저장소에 올리는 중' });
    /* 결과 올리기: 재생목록 · 표지는 db, 세그먼트 · 음성은 어댑터 */
    const files = []; const walk = async d => { for (const e of await fs.promises.readdir(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) await walk(f); else files.push(path.relative(out, f).split(path.sep).join('/')); } };
    await walk(out); files.sort();
    let used = 'db';
    for (let i = 0; i < files.length; i += 20) await inTenant(pool, tid, async c => { for (const p of files.slice(i, i + 20)) { const ext = path.extname(p); const k = await store.put(c, tid, J.media_id, p, await fs.promises.readFile(path.join(out, p)), MIME[ext] || 'application/octet-stream', ext === '.m3u8' || ext === '.jpg'); if (ext === '.ts') used = k; } });
    const ph = R[R.length - 1].height; const pw = vs.width && vs.height ? even(Number(vs.width) * ph / Number(vs.height)) : null;
    return call(tid, 'lms_v_w_transcoded', { job_id: J.job_id, duration_sec: Math.round(total * 1000) / 1000, width: pw, height: ph, has_audio: hasAudio, renditions: R, storage: used });
  }
  async function stt(tid, J, tmp) {
    const cmd = (process.env.MEDIA_STT_CMD || '').trim(); const lang = J.lang || 'ko';
    if (!cmd || !J.has_audio) return call(tid, 'lms_v_w_stt', { job_id: J.job_id, engine: J.has_audio ? 'demo' : 'none', vtt: '' });
    await call(tid, 'lms_v_w_progress', { job_id: J.job_id, progress: 10, step: '음성 인식' });
    const o = await inTenant(pool, tid, c => c.query("select store from lms_media_obj where media_id = $1 and path = 'stt/audio.m4a'", [J.media_id]).then(x => x.rows[0]));
    if (!o) return call(tid, 'lms_v_w_stt', { job_id: J.job_id, engine: 'none', vtt: '' });
    const f = path.join(tmp, 'audio.m4a'); await fs.promises.writeFile(f, await inTenant(pool, tid, c => store.getBuf(c, tid, J.media_id, 'stt/audio.m4a', o.store)));
    const vtt = await run(cmd, [f, lang], { timeout: 3 * 3600e3 });
    return call(tid, 'lms_v_w_stt', { job_id: J.job_id, engine: (process.env.MEDIA_STT_ENGINE || path.basename(cmd)).slice(0, 40), vtt });
  }
  async function one() {
    const q = await claim(); if (!q) return false;
    const J = await call(q.tenant_id, 'lms_v_w_job', { job_id: q.job_id }).catch(e => { log.error && log.error('media job', e.message); return null; });
    if (!J) { await pool.query('delete from lms_media_q where job_id = $1', [q.job_id]); return true; }
    const tmp = await fs.promises.mkdtemp(path.join(process.env.MEDIA_TMP || os.tmpdir(), 'ddmedia-'));
    try { if (J.kind === 'transcode') await transcode(q.tenant_id, J, tmp); else await stt(q.tenant_id, J, tmp); }
    catch (e) { log.warn && log.warn('media job fail', J.kind, e.message); await call(q.tenant_id, 'lms_v_w_fail', { job_id: J.job_id, error: String(e.message || e).slice(0, 400) }).catch(() => {}); }
    finally { fs.promises.rm(tmp, { recursive: true, force: true }).catch(() => {}); }
    return true;
  }
  /* x2 실시간 수업 음성(lms_live_cap_audio, hook lmsVodSubtitleJob): 30초마다 기관별로 하나씩 집어 같은 STT 어댑터로 처리 */
  let lastLive = 0;
  async function live() {
    if (Date.now() - lastLive < 30000) return; lastLive = Date.now();
    const T = (await pool.query("select id from tenants where type = 'univ'")).rows;
    for (const t of T) {
      const J = await call(t.id, 'lms_v_w_live_claim', {}).catch(() => null); if (!J) continue;
      const tmp = await fs.promises.mkdtemp(path.join(process.env.MEDIA_TMP || os.tmpdir(), 'ddlive-'));
      try {
        const f = path.join(tmp, 'audio'); const fd = await fs.promises.open(f, 'w');
        try { for (const id of J.file_ids) { const b = await inTenant(pool, t.id, c => c.query('select data from lms_file where file_id = $1', [id]).then(x => x.rows[0] && x.rows[0].data)); if (!b) throw new Error('음성 조각이 없습니다'); await fd.write(b); } } finally { await fd.close(); }
        const cmd = (process.env.MEDIA_STT_CMD || '').trim(); let dur = 30;
        try { const pr = JSON.parse(await run(FP(), ['-v', 'error', '-print_format', 'json', '-show_format', f], { timeout: 60e3 })); dur = Number(pr.format && pr.format.duration) || 30; } catch (e) { /* 길이 모름 */ }
        if (!cmd) await call(t.id, 'lms_v_w_live_done', { job_id: J.job_id, engine: 'demo', duration_sec: dur });
        else await call(t.id, 'lms_v_w_live_done', { job_id: J.job_id, engine: (process.env.MEDIA_STT_ENGINE || path.basename(cmd)).slice(0, 40), vtt: await run(cmd, [f, J.lang || 'ko'], { timeout: 3 * 3600e3 }) });
      } catch (e) { await call(t.id, 'lms_v_w_live_done', { job_id: J.job_id, error: String(e.message || e) }).catch(() => {}); }
      finally { fs.promises.rm(tmp, { recursive: true, force: true }).catch(() => {}); }
    }
  }
  async function tick() { if (busy) return; busy = true; try { for (let i = 0; i < 4 && await one(); i++); await live(); } catch (e) { if (!/does not exist/.test(e.message)) log.warn && log.warn('media worker', e.message); } finally { busy = false; } }
  async function purge() {
    try { const T = (await pool.query("select id from tenants where type = 'univ'")).rows;
      for (const t of T) { const r = await call(t.id, 'lms_v_w_purge', {}).catch(() => null); for (const x of (r && r.purged) || []) if (x.storage !== 'db') await store.drop(t.id, x.media_id).catch(() => {}); } }
    catch (e) { log.warn && log.warn('media purge', e.message); }
  }
  const iv = Math.max(500, Number(process.env.MEDIA_POLL_MS || 3000));
  setInterval(tick, iv).unref(); setTimeout(tick, 1500).unref();
  setInterval(purge, 3600e3).unref(); setTimeout(purge, 60e3).unref();
  module.exports.kick = tick;
};
module.exports.plan = plan;
module.exports.ffArgs = ffArgs;
module.exports.WID = WID;
