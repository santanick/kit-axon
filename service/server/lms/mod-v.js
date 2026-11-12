'use strict';
/* v32 미디어 파이프라인(자체 CMS · 스트리밍 · 녹화 · 자동자막) — ECR-002 · SFR-062 · ECR-003 · SFR-073
   업무 규칙 · 응답 JSON은 sql/a1_media.sql의 lms_v_* 함수가 만든다(Java lms.v가 같은 함수를 부른다). 이 파일은 경로 표 + 스트리밍 응답 + 작업기 시작만 맡는다.
   흐름: create(제목 · 크기 · 형식) → chunk(1MB씩 base64) → finish(대기열) → 작업기 ffmpeg HLS(360p · 720p) → ready → url(서명 · 만료 주소) → hls(재생목록 · 세그먼트)
   「CDN」: GET /api/lms/v/hls가 캐시 머리말(세그먼트 public · immutable, 재생목록 private 30초)을 붙여 내보내는 스트리밍 원본이다.
          운영은 이 경로(또는 MEDIA_STORE=gcs 버킷) 앞에 Cloud CDN을 두고, 설정에서 전송 위치를 cdn으로 바꾸면 재생 주소가 CDN 주소로 나간다. */
const crypto = require('node:crypto');
const store = require('./media/store');

const ROUTES = [
  ['GET /api/lms/v/settings', 'lms_v_settings', 'staff'],
  ['POST /api/lms/v/settings', 'lms_v_settings_save', 'staff', 16384],
  ['POST /api/lms/v/create', 'lms_v_create', 'staff', 16384],
  ['POST /api/lms/v/chunk', 'lms_v_chunk', 'staff', 1500000],
  ['POST /api/lms/v/finish', 'lms_v_finish', 'staff', 4096],
  ['GET /api/lms/v/list', 'lms_v_list', 'staff'],
  ['GET /api/lms/v/get', 'lms_v_get', 'staff'],
  ['POST /api/lms/v/place', 'lms_v_place', 'staff', 4096],
  ['POST /api/lms/v/access', 'lms_v_access', 'staff', 16384],
  ['POST /api/lms/v/rotate', 'lms_v_rotate', 'staff', 4096],
  ['POST /api/lms/v/delete', 'lms_v_delete', 'staff', 4096],
  ['GET /api/lms/v/log', 'lms_v_log', 'staff'],
  ['GET /api/lms/v/url', 'lms_v_url', 'any'],
  ['POST /api/lms/v/stt', 'lms_v_stt', 'staff', 4096],
  ['GET /api/lms/v/captions', 'lms_v_caps', 'staff'],
  ['POST /api/lms/v/caption', 'lms_v_cap_save', 'staff', 400000],
  ['POST /api/lms/v/caption-publish', 'lms_v_cap_publish', 'staff', 4096]
];

module.exports = ctx => {
  const { pool, inTenant, need, HttpErr, limit } = ctx;
  const out = require('./efh_lib')(ctx, ROUTES);
  /* 삭제: SQL이 표를 지운 뒤 disk · gcs 객체도 지운다 */
  const del = out['POST /api/lms/v/delete'];
  out['POST /api/lms/v/delete'] = async (req, res) => { const r = await del(req, res); if (r && r.store && r.store !== 'db') { const a = await need(req); await store.drop(a.tid, r.media_id).catch(() => {}); } return r; };
  /* 하트비트 대신 대기열을 바로 깨우기(마침 · 자막 요청 직후) */
  for (const k of ['POST /api/lms/v/finish', 'POST /api/lms/v/stt']) { const f = out[k]; out[k] = async (req, res) => { const r = await f(req, res); const w = require('./media/worker'); if (w.kick) setTimeout(() => w.kick(), 50); return r; }; }

  const hops = Math.max(0, Math.min(5, Number(process.env.TRUST_PROXY_HOPS == null ? 1 : process.env.TRUST_PROXY_HOPS)));
  const ipOf = req => { const L = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean); return ((hops && L.length >= hops ? L[L.length - hops] : '') || String(req.socket.remoteAddress || '')).replace(/^::ffff:/, ''); };
  const lcookie = process.env.COOKIE_SECURE !== '0' ? '__Host-dd_lsid' : 'dd_lsid';
  const cookieOf = (req, n) => { for (const x of String(req.headers.cookie || '').split(';')) { const i = x.indexOf('='); if (i > 0 && x.slice(0, i).trim() === n) return decodeURIComponent(x.slice(i + 1).trim()); } return null; };
  const refHost = req => { for (const h of [req.headers.origin, req.headers.referer]) { if (!h) continue; try { return new URL(h).host.toLowerCase(); } catch (e) { /* 무시 */ } } return null; };

  /* 스트리밍: 기관(t) · 서명(s) · 만료(e)는 SQL이 확인. 재생목록은 로그인 세션(origin 전송) · 허용 도메인, 세그먼트는 서명만(CDN 캐시 가능) */
  out['GET /api/lms/v/hls'] = async (req, res) => {
    const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams); const t = String(q.t || '');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(t)) throw new HttpErr(403, '재생 주소가 올바르지 않습니다.', 'bad_sig');
    limit('lmsv-hls:' + ipOf(req), 6000, 60000);
    let c = { kind: 'none' };
    try { const a = await need(req); if (a && a.tid === t) c = { kind: 'staff', uid: a.uid, email: a.email, role: a.role }; } catch (e) { /* 세션 없음 */ }
    if (c.kind === 'none') { const tk = cookieOf(req, lcookie); if (tk && tk.length <= 100) { const s = (await pool.query('select tenant_id, sid from learner_sessions where id = $1 and expires_at > now()', [crypto.createHash('sha256').update(tk).digest('hex')])).rows[0]; if (s && s.tenant_id === t) c = { kind: 'learner', sid: s.sid }; } }
    c.ip = ipOf(req); c.ref = refHost(req);
    const a = { t, m: q.m || '', e: q.e || '', s: q.s || '', f: q.f || '' };
    const r = await inTenant(pool, t, async cl => {
      let x;
      try { x = (await cl.query('select lms_v_hls($1::jsonb, $2::jsonb) r', [JSON.stringify(c), JSON.stringify(a)])).rows[0].r; }
      catch (e) { const m = /^dd:(\d{3}):([a-z_]+)$/.exec(e.detail || ''); if (m) throw new HttpErr(+m[1], e.message, m[2]); throw e; }
      if (x.kind === 'obj') { const g = await store.get(cl, t, x.media_id, x.path, x.store); x.buf = g.buf; x.stream = g.stream; }
      return x;
    });
    const h = { 'content-type': r.mime, 'cache-control': r.cache, 'x-content-type-options': 'nosniff', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin', 'x-media-origin': 'didisam' };
    if (r.kind === 'text') { const b = Buffer.from(r.body, 'utf8'); h['content-length'] = b.length; res.writeHead(200, h); res.end(b); return; }
    if (r.buf) { h['content-length'] = r.buf.length; res.writeHead(200, h); res.end(r.buf); return; }
    if (r.size != null) h['content-length'] = r.size;
    res.writeHead(200, h); r.stream.on('error', () => res.destroy()); r.stream.pipe(res);
  };
  try { require('./media/worker')(ctx); } catch (e) { ctx.log && ctx.log.warn && ctx.log.warn('media worker start', e.message); }
  return out;
};
module.exports.ROUTES = ROUTES;
