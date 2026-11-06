'use strict';
/* v32 미디어 파이프라인(ECR-002 · SFR-062 · ECR-003 · SFR-073) 대조 테스트 — Node · Java에 같은 시나리오를 돌려 상태코드 · 본문을 비교한다.
   올리기(조각) → 변환(ffmpeg HLS, 두 서버의 작업기 중 먼저 집은 쪽) → 서명 주소 · 스트리밍 → 배치(묶음 I · B) → 접근 제한 · URL 재생성 · 도메인 → 자막(STT · 편집 · 번역 · 게시) → 삭제
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddx1 node test/lms-v.js http://127.0.0.1:8411 [http://127.0.0.1:8412]
   준비: ffmpeg · ffprobe가 PATH에 있어야 한다(시험 영상을 만든다). */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { call, setup, setSql, run, STU } = require('./lms-efh-lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8411', process.argv[3] || ''];

/* 시험 영상: 6초 · 640×480 · 톤 음성(ffmpeg 내장 소스) — 두 서버에 같은 바이트 */
const VID = path.join(os.tmpdir(), 'lmsv-test.mp4');
if (!fs.existsSync(VID)) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=640x480:rate=24:duration=6', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', VID]);
const BYTES = fs.readFileSync(VID);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function raw(base, p, { cookie, ref } = {}) { const h = {}; if (cookie) h.cookie = cookie; if (ref) h.referer = ref; const r = await fetch(base + p, { headers: h }); const b = Buffer.from(await r.arrayBuffer());
  return { st: r.status, ct: r.headers.get('content-type'), cc: r.headers.get('cache-control'), len: b.length, text: /mpegurl|json/.test(r.headers.get('content-type') || '') ? b.toString('utf8') : null }; }

async function scenario(base, tag) {
  const R = {}, P = []; const S = await setup(base, tag); const ck = S.ck; const L = S.L;
  const G = (k, p, o = {}) => call(base, 'GET', p, { cookie: ck, ...o }).then(r => (R[k] = r));
  const Po = (k, p, body, o = {}) => call(base, 'POST', p, { cookie: ck, body, ...o }).then(r => (R[k] = r));
  const ses = (await setSql(S.tid, "insert into lms_session (tenant_id, section_id, week_no, seq, kind, starts_at) values ($1, $2, 1, 1, 'online', now() - interval '1 day'), ($1, $2, 2, 1, 'online', now() + interval '6 day') returning session_id::text", [S.tid, S.sec])).rows.map(r => r.session_id);
  await G('noAuth', '/api/lms/v/list', { cookie: undefined });
  await Po('csrf', '/api/lms/v/create', {}, { csrf: false });
  await call(base, 'GET', '/api/lms/v/list', { cookie: L[STU[0]] }).then(r => (R.learnerList = r));
  await G('settings0', '/api/lms/v/settings');
  await Po('setCdnNoBase', '/api/lms/v/settings', { delivery: 'cdn' });
  await Po('setBadDomain', '/api/lms/v/settings', { domains: ['bad domain'] });
  await Po('setTeacher', '/api/lms/v/settings', { ttl_sec: 600 }, { cookie: S.U.prof });
  await Po('set1', '/api/lms/v/settings', { ttl_sec: 900, targets: ['en', 'ja', 'zh', 'vi'], retain_days: 180 });
  /* 올리기 */
  await Po('createBadMime', '/api/lms/v/create', { title: '보고서', mime: 'application/pdf', size: 10 });
  await Po('createBig', '/api/lms/v/create', { title: '큰 영상', mime: 'video/mp4', size: 3 * 1024 ** 3 });
  await Po('createRecNoConsent', '/api/lms/v/create', { title: '녹화', mime: 'video/webm', size: 100, kind: 'record' });
  await Po('createBadTrim', '/api/lms/v/create', { title: 'x', mime: 'video/mp4', size: 100, trim_start: 5, trim_end: 2 });
  await Po('create', '/api/lms/v/create', { title: '1주차 강의 영상', name: 'week1.mp4', mime: 'video/mp4', size: BYTES.length, stt: true, stt_lang: 'en', session_id: ses[0], place_title: '1주차 · 자료구조 개요' });
  const mid = R.create.j && R.create.j.media && R.create.j.media.media_id; const cs = R.create.j.media.chunk_size; const n = R.create.j.media.chunks;
  P.push([n === Math.ceil(BYTES.length / cs), '조각 수 계산']);
  await Po('chunkBadSize', '/api/lms/v/chunk', { media_id: mid, seq: 0, b64: Buffer.from('abc').toString('base64') });
  await Po('chunkBadSeq', '/api/lms/v/chunk', { media_id: mid, seq: n, b64: 'aGk=' });
  await call(base, 'POST', '/api/lms/v/chunk', { cookie: S.U.tnl, body: { media_id: mid, seq: 0, b64: 'aGk=' } }).then(r => (R.chunkOtherTeacher = r));
  await Po('finishEarly', '/api/lms/v/finish', { media_id: mid });
  for (let i = 0; i < n; i++) await Po('chunk' + i, '/api/lms/v/chunk', { media_id: mid, seq: i, b64: BYTES.subarray(i * cs, (i + 1) * cs).toString('base64') });
  await Po('finish', '/api/lms/v/finish', { media_id: mid });
  await Po('finishAgain', '/api/lms/v/finish', { media_id: mid });
  await Po('urlNotReady', '/api/lms/v/stt', { media_id: mid });
  /* 변환 대기(최대 180초) */
  let g; for (let i = 0; i < 180; i++) { g = await call(base, 'GET', '/api/lms/v/get?media_id=' + mid, { cookie: ck }); if (g.j && ['ready', 'failed'].includes(g.j.status)) break; await sleep(1000); }
  P.push([g.j.status === 'ready', '변환 완료(ready): ' + (g.j && (g.j.status + ' ' + (g.j.error || '')))]);
  P.push([(g.j.renditions || []).map(r => r.name).join(',') === '360p,480p', '화질 목록(원본 480 → 360p · 480p, 키우지 않음)']);
  P.push([g.j.files && g.j.files.segments >= 2, 'HLS 세그먼트 생성']);
  P.push([g.j.places.length === 1, '자동 배치(차시)']);
  R.get = { st: g.st, j: { status: g.j.status, renditions: g.j.renditions, duration_sec: g.j.duration_sec, has_audio: g.j.has_audio, places: g.j.places, jobs: g.j.jobs.map(x => ({ kind: x.kind, status: x.status })).sort((a, b) => a.kind < b.kind ? -1 : 1) } };
  await G('list', '/api/lms/v/list');
  /* 재생 주소 · 스트리밍 */
  await G('url', '/api/lms/v/url?media_id=' + mid);
  if (!R.url.j || !R.url.j.url) { console.log('url 실패', base, JSON.stringify(R.url), JSON.stringify(R.get)); return { R, P: [...P, [false, 'url']] }; }
  const u = R.url.j.url;
  await call(base, 'GET', '/api/lms/v/url?media_id=media:' + mid, { cookie: L[STU[0]] }).then(r => (R.urlLearner = r));
  await call(base, 'GET', '/api/lms/v/url?media_id=' + mid, { cookie: L['20267777'] }).then(r => (R.urlNotEnrolled = r));
  R.master = await raw(base, u, { cookie: ck }); R.masterLearner = await raw(base, u, { cookie: L[STU[0]] }); R.masterNoCookie = await raw(base, u);
  R.masterBadSig = await raw(base, u.replace(/&s=[0-9a-f]+/, '&s=00000000000000000000000000000000'), { cookie: ck });
  R.badFile = await raw(base, u.replace('master.m3u8', '../etc/passwd'), { cookie: ck });
  const variant = (R.master.text || '').split('\n').find(l => l && !l.startsWith('#')) || '';
  P.push([/^hls\?t=.+&f=360p\/index\.m3u8$/.test(variant), '재생목록 서명 다시 쓰기: ' + variant.slice(0, 80)]);
  R.variant = await raw(base, '/api/lms/v/' + variant, { cookie: ck });
  const seg = (R.variant.text || '').split('\n').find(l => l && !l.startsWith('#')) || '';
  R.segment = await raw(base, '/api/lms/v/' + seg);
  P.push([R.segment.st === 200 && R.segment.ct === 'video/mp2t' && R.segment.len > 1000 && /immutable/.test(R.segment.cc || ''), '세그먼트(서명만 · CDN 캐시 머리말)']);
  R.poster = await raw(base, R.url.j.poster, { cookie: ck });
  for (const k of ['master', 'masterLearner', 'masterNoCookie', 'masterBadSig', 'badFile', 'variant', 'segment', 'poster']) R[k] = { st: R[k].st, j: { ct: String(R[k].ct).split(';')[0], cc: R[k].cc, text: R[k].text && R[k].text.replace(/&e=\d+&s=[0-9a-f]+/g, '&e=E&s=S').replace(/t=tn_[a-z0-9]+/g, 't=TID') } };
  /* 접근 제한 · 도메인 · URL 재생성 */
  await Po('accessStaff', '/api/lms/v/access', { media_id: mid, access: 'staff' });
  await call(base, 'GET', '/api/lms/v/url?media_id=' + mid, { cookie: L[STU[0]] }).then(r => (R.urlRestricted = r));
  await Po('accessDomain', '/api/lms/v/access', { media_id: mid, access: 'enrolled', domains: ['eclass.example.ac.kr'] });
  R.domainBad = await raw(base, u, { cookie: ck, ref: 'https://evil.example.com/x' }); R.domainOk = await raw(base, u, { cookie: ck, ref: 'https://eclass.example.ac.kr/lms' });
  R.domainBad = { st: R.domainBad.st }; R.domainOk = { st: R.domainOk.st };
  await Po('accessReset', '/api/lms/v/access', { media_id: mid, domains: [] });
  await Po('rotate', '/api/lms/v/rotate', { media_id: mid });
  R.afterRotate = { st: (await raw(base, u, { cookie: ck })).st };
  /* 묶음 I 재생(진도 · 하트비트) — src는 media: 키 */
  const cid = g.j.places[0].content_id;
  await call(base, 'POST', '/api/lms/i/play/start', { cookie: L[STU[1]], body: { content_id: cid } }).then(r => (R.playStart = r));
  P.push([R.playStart.j && R.playStart.j.src === 'media:' + mid, '묶음 I 재생 시작 src = media:키']);
  /* 수동 배치(2주차) · 묶음 B 자원 */
  await Po('placeBad', '/api/lms/v/place', { media_id: mid, session_id: '00000000-0000-0000-0000-000000000000' });
  await Po('place2', '/api/lms/v/place', { media_id: mid, session_id: ses[1] });
  await call(base, 'GET', '/api/lms/b/overview?section=' + S.sec, { cookie: ck }).then(r => { const res = ((r.j && r.j.weeks) || []).flatMap(w => (w.sessions || []).flatMap(x => x.resources || [])).filter(x => x.kind === 'video'); R.bVideo = { st: r.st, j: res.map(x => ({ title: x.title, kind: x.kind, media: !!(x.body && x.body.media_id) })) }; });
  /* 자막: STT 자동(stt: true) → 편집 · 번역 · 게시 */
  let cp; for (let i = 0; i < 120; i++) { cp = await call(base, 'GET', '/api/lms/v/captions?media_id=' + mid, { cookie: ck }); if (cp.j && cp.j.job && ['done', 'failed'].includes(cp.j.job.status)) break; await sleep(1000); }
  P.push([cp.j.job && cp.j.job.status === 'done' && cp.j.captions.length === 1, '자동자막 작업 완료']);
  R.captions = { st: cp.st, j: { job: cp.j.job && { kind: cp.j.job.kind, status: cp.j.job.status, lang: cp.j.job.lang }, captions: cp.j.captions.map(c => ({ lang: c.lang, status: c.status, source: c.source, n: c.cues.length > 0 })) } };
  await Po('sttBadLang', '/api/lms/v/stt', { media_id: mid, lang: 'xx' });
  await Po('capBad', '/api/lms/v/caption', { media_id: mid, lang: 'ko', cues: [{ s: 3, e: 1, t: 'x' }] });
  await Po('capEdit', '/api/lms/v/caption', { media_id: mid, lang: 'ko', cues: [{ s: 0.5, e: 2.5, t: '안녕하세요. 1주차 강의입니다.' }, { s: 3, e: 5.5, t: '오늘은 배열을 배웁니다.' }] });
  await Po('capVtt', '/api/lms/v/caption', { media_id: mid, lang: 'en', source: 'upload', text: 'WEBVTT\n\n00:00:00.500 --> 00:00:02.500\nHello, this is week 1.\n\n00:00:03.000 --> 00:00:05.500\nToday we learn arrays.\n' });
  await Po('capTr', '/api/lms/v/caption', { media_id: mid, lang: 'ja', source: 'translate', engine: 'claude', cues: [{ s: 0.5, e: 2.5, t: 'こんにちは。第1週の講義です。' }] });
  await Po('pubNone', '/api/lms/v/caption-publish', { media_id: mid, lang: 'vi' });
  await Po('pubKo', '/api/lms/v/caption-publish', { media_id: mid, lang: 'ko' });
  await call(base, 'GET', '/api/lms/i/subtitles?content_id=' + cid, { cookie: L[STU[1]] }).then(r => (R.iSubs = r));
  await G('caps', '/api/lms/v/captions?media_id=' + mid);
  R.caps = { st: R.caps.st, j: R.caps.j.captions.map(c => ({ lang: c.lang, status: c.status, source: c.source, engine: c.engine, cues: c.source === 'stt' || c.source === 'demo' ? 'auto' : c.cues })) };
  await G('log', '/api/lms/v/log?media_id=' + mid);
  R.log = { st: R.log.st, j: [...new Set(R.log.j.log.map(x => x.action))].sort() };
  /* 녹화(동의) · 자르기 · 삭제 */
  await Po('createRec', '/api/lms/v/create', { title: '화면 녹화', mime: 'video/webm;codecs=vp9', size: 10, kind: 'record', consent: true, consent_items: ['screen', 'mic'], trim_start: 1, trim_end: 4 });
  await Po('delete', '/api/lms/v/delete', { media_id: mid });
  await G('getDeleted', '/api/lms/v/get?media_id=' + mid);
  R.afterDelete = { st: (await raw(base, R.url.j.url, { cookie: ck })).st };
  if (process.env.DUMP) for (const [k, v] of Object.entries(R)) console.log(k, v.st, String(JSON.stringify(v.j)).slice(0, +process.env.DUMP));
  return { R, P };
}

run('lms-v(미디어)', scenario, A, B, ['url', 'urlLearner', 'list', 'create', 'createRec', 'finish', 'set1', 'settings0']).catch(e => { console.error(e); process.exit(1); });
