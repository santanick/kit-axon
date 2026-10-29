'use strict';
/* 디디쌤 스튜디오 운영 서버 — 정적 화면 + /api 를 한 컨테이너에서 제공한다(같은 출처 → 쿠키 세션 · CSRF 단순화).
   의존성: pg 하나. Node.js 22 내장 http · crypto · fetch만 쓴다. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inTenant } = require('./db');

const TYPES = ['corp', 'univ', 'k12', 'adult', 'lifelong', 'voc'];
const MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.yaml': 'text/plain; charset=utf-8', '.yml': 'text/plain; charset=utf-8', '.tf': 'text/plain; charset=utf-8', '.example': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mjs': 'text/javascript; charset=utf-8' };
const SESSION_DAYS = 14;
const STATE_MAX = 8 * 1024 * 1024;      // 기관 상태 최대 8MB(JSON)
const COOKIE = '__Host-dd_sid';

/* ── 도우미 ── */
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? no(e) : ok(k)));
async function hashPw(pw) { const salt = crypto.randomBytes(16); const k = await scrypt(pw, salt); return `scrypt$${salt.toString('base64')}$${k.toString('base64')}`; }
async function checkPw(pw, stored) {
  const [alg, s, h] = String(stored || '').split('$'); if (alg !== 'scrypt' || !s || !h) return false;
  const k = await scrypt(pw, Buffer.from(s, 'base64')); const H = Buffer.from(h, 'base64');
  return H.length === k.length && crypto.timingSafeEqual(H, k);
}
const DUMMY = 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64'); // 없는 계정도 같은 시간 소요
const newTid = () => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; const b = crypto.randomBytes(10); let s = 'tn_'; for (let i = 0; i < 10; i++) s += a[b[i] % a.length]; return s; };
const emailOk = e => typeof e === 'string' && e.length <= 120 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(e);
const pwOk = p => typeof p === 'string' && p.length >= 10 && p.length <= 200 && /[a-zA-Z]/.test(p) && /\d/.test(p);
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // KST 날짜

class HttpErr extends Error { constructor(status, msg, code) { super(msg); this.status = status; this.code = code; } }

/* 간단한 고정 창 제한(인스턴스 단위) — 로그인 · 가입 남용 방지 */
const RL = new Map();
function limit(key, max, winMs) {
  const now = Date.now(); const e = RL.get(key);
  if (!e || e.reset < now) { RL.set(key, { n: 1, reset: now + winMs }); return; }
  if (++e.n > max) throw new HttpErr(429, '시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'rate');
}
setInterval(() => { const now = Date.now(); for (const [k, v] of RL) if (v.reset < now) RL.delete(k); }, 60000).unref();

function readBody(req, max) {
  return new Promise((ok, no) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > max) { no(new HttpErr(413, '요청이 너무 큽니다.', 'too_large')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => { if (!n) return ok({}); try { ok(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { no(new HttpErr(400, '형식이 올바르지 않습니다.', 'bad_json')); } });
    req.on('error', no);
  });
}
const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

const SEC_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), geolocation=(), microphone=(self)',
  'cross-origin-opener-policy': 'same-origin'
};
const CSP = "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ytimg.com; frame-src 'self' blob: https://accounts.google.com; media-src 'self' blob:; connect-src 'self' https://www.googleapis.com https://accounts.google.com; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'none'";

const LCOOKIE = '__Host-dd_lsid';
const LCSP = "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: https://i.ytimg.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'self'";
const LP_MAX = 256 * 1024;
const TID_RE = /^tn_[a-z0-9]{8,16}$/; const SID_RE = /^[A-Za-z0-9_-]{4,20}$/;

function createApp({ pool, env = process.env, publicDir, log = console }) {
  const secure = env.COOKIE_SECURE !== '0';
  const cookieName = secure ? COOKIE : 'dd_sid'; // __Host- 접두어는 Secure 필수
  const aiKey = /^sk-ant-/.test(env.ANTHROPIC_API_KEY || '') ? env.ANTHROPIC_API_KEY.trim() : ''; // 'none' 등 자리표시는 꺼짐
  const aiUrl = env.ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages';
  const aiDaily = Number(env.AI_DAILY_CALLS || 400);
  const signupCode = (env.SIGNUP_CODE || '').trim();
  const allowSignup = env.SIGNUP !== 'off';
  const pubRoot = publicDir ? path.resolve(publicDir) : null;

  function send(res, status, body, headers = {}) {
    const h = { ...SEC_HEADERS, 'cache-control': 'no-store', ...headers };
    if (secure) h['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
    if (body === undefined || body === null) { res.writeHead(status, h); return res.end(); }
    if (Buffer.isBuffer(body) || typeof body === 'string') { res.writeHead(status, h); return res.end(body); }
    h['content-type'] = 'application/json; charset=utf-8'; res.writeHead(status, h); res.end(JSON.stringify(body));
  }
  const setSid = (res, token) => res.setHeader('set-cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`);
  const clearSid = res => res.setHeader('set-cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
  const ip = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  async function newSession(res, userId, tid) {
    const token = crypto.randomBytes(32).toString('base64url');
    await pool.query('insert into sessions (id, user_id, tenant_id, expires_at) values ($1, $2, $3, now() + $4::interval)', [sha(token), userId, tid, `${SESSION_DAYS} days`]);
    setSid(res, token);
  }
  async function auth(req) {
    const t = cookies(req)[cookieName]; if (!t || t.length > 100) return null;
    const { rows } = await pool.query(`select s.id sid, u.id uid, u.email, u.role, t.id tid, t.name, t.type, t.mode from sessions s join users u on u.id = s.user_id join tenants t on t.id = s.tenant_id where s.id = $1 and s.expires_at > now()`, [sha(t)]);
    return rows[0] || null;
  }
  const need = async req => { const a = await auth(req); if (!a) throw new HttpErr(401, '로그인이 필요합니다.', 'auth'); return a; };
  const audit = (c, tid, actor, action, detail) => c.query('insert into audit_log (tenant_id, actor, action, detail) values ($1, $2, $3, $4)', [tid, actor, action, detail ? JSON.stringify(detail) : null]);
  const meOut = a => ({ user: { email: a.email, role: a.role }, tenant: { tid: a.tid, name: a.name, type: a.type, mode: a.mode } });

  /* ── 학습자(v10) ── */
  const pepper = env.SESSION_PEPPER || env.SIGNUP_CODE || 'didisam-learner';
  const codeFp = (tid, sid, code) => crypto.createHmac('sha256', pepper).update(`${tid}|${sid}|${String(code).toUpperCase()}`).digest('hex');
  const lcookieName = secure ? LCOOKIE : 'dd_lsid';
  /* 어드민이 발급한 접근코드(S.codes)를 학습자 로그인 표로 동기화 — 바뀐 코드만 scrypt로 다시 해시 */
  async function syncLearners(c, tid, codes) {
    if (!Array.isArray(codes)) return;
    const cur = new Map((await c.query('select sid, code_fp from learners where tenant_id = $1', [tid])).rows.map(r => [r.sid, r.code_fp]));
    const keep = new Set(); let n = 0;
    for (const x of codes.slice(0, 5000)) {
      const sid = String(x && x.sid || ''); const code = String(x && x.code || ''); if (!SID_RE.test(sid) || code.length < 4 || code.length > 20) continue; keep.add(sid);
      const fp = codeFp(tid, sid, code); if (cur.get(sid) === fp) continue;
      if (++n > 300) break; // 한 번 저장에 최대 300건(나머지는 다음 저장 때)
      await c.query('insert into learners (tenant_id, sid, dept, code_fp, code_hash) values ($1, $2, $3, $4, $5) on conflict (tenant_id, sid) do update set dept = excluded.dept, code_fp = excluded.code_fp, code_hash = excluded.code_hash', [tid, sid, String(x.dept || '').slice(0, 40), fp, await hashPw(code.toUpperCase())]);
    }
    const gone = [...cur.keys()].filter(sid => !keep.has(sid));
    if (gone.length) { await c.query('delete from learners where tenant_id = $1 and sid = any($2)', [tid, gone]); await pool.query('delete from learner_sessions where tenant_id = $1 and sid = any($2)', [tid, gone]); }
  }
  async function lauth(req, tid) {
    const t = cookies(req)[lcookieName]; if (!t || t.length > 100) return null;
    const { rows } = await pool.query('select tenant_id, sid from learner_sessions where id = $1 and expires_at > now()', [sha(t)]);
    return rows[0] && rows[0].tenant_id === tid ? rows[0] : null;
  }
  /* 학습자 본인 데이터만: 배지 · 과정 진도(어드민 상태에서 학번으로 찾음) */
  function mineOf(doc, sid) {
    const m = (doc.members || []).find(x => x && (x.sid === sid || x.name === sid)); if (!m) return { badges: [], cls: {} };
    return { badges: (doc.badges || []).flatMap(b => (b.issued || []).filter(i => i.who === m.id && i.st === '유효').map(i => ({ id: b.id, name: b.name, at: i.at, no: i.no }))),
      cls: Object.fromEntries((doc.classes || []).filter(c => c.prog && c.prog[m.id]).map(c => { const g = c.prog[m.id]; const thr = (c.criteria && c.criteria.threshold) || 80; return [c.id, { p: Math.round(+g.p || 0), st: g.assign || 'none', fb: String(g.fb || '').slice(0, 1000), score: g.score ?? null, done: (+g.p || 0) >= thr }]; })) };
  }
  const cleanLP = lp => { const o = { tut: {}, cls: {}, diag: {}, at: new Date().toISOString() }; if (!lp || typeof lp !== 'object') return o; for (const k of ['tut', 'cls', 'diag']) if (lp[k] && typeof lp[k] === 'object' && !Array.isArray(lp[k])) o[k] = Object.fromEntries(Object.entries(lp[k]).filter(([id]) => /^[\w-]{1,40}$/.test(id)).slice(0, 500)); if (lp.days && typeof lp.days === 'object') o.days = Object.fromEntries(Object.entries(lp.days).filter(([d, n]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(+n)).slice(-370).map(([d, n]) => [d, Math.min(999, Math.max(0, Math.round(+n)))])); return o; };
  async function pubRoute(req, res, m) {
    const [, tid, act] = m; if (!TID_RE.test(tid)) throw new HttpErr(404, '없는 기관입니다.', 'tenant');
    const key = `${req.method} ${act}`;
    if (key === 'GET site') {
      const site = await inTenant(pool, tid, async c => (await c.query("select doc->'lsite'->'pub' pub from tenant_state where tenant_id = $1", [tid])).rows[0]);
      if (!site || !site.pub) throw new HttpErr(404, '아직 게시되지 않은 학습자 사이트입니다.', 'unpublished');
      return { site: site.pub };
    }
    if (key === 'POST login') {
      const b = await readBody(req, 2048); const sid = String(b.sid || '').trim(); const code = String(b.code || '').trim().toUpperCase();
      limit('ll:' + ip(req), 40, 600e3); limit(`lls:${tid}:${sid}`, 8, 600e3);
      const L = SID_RE.test(sid) ? await inTenant(pool, tid, async c => (await c.query('select sid, dept, code_hash from learners where tenant_id = $1 and sid = $2', [tid, sid])).rows[0]) : null;
      const ok = await checkPw(code, L ? L.code_hash : DUMMY);
      if (!L || !ok) throw new HttpErr(401, '번호 또는 접근코드가 올바르지 않습니다.', 'login');
      const token = crypto.randomBytes(32).toString('base64url');
      await pool.query('insert into learner_sessions (id, tenant_id, sid, expires_at) values ($1, $2, $3, now() + interval \'30 days\')', [sha(token), tid, sid]);
      res.setHeader('set-cookie', `${lcookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 86400}${secure ? '; Secure' : ''}`);
      return inTenant(pool, tid, async c => { await c.query('update learners set last_login = now() where tenant_id = $1 and sid = $2', [tid, sid]); const lp = (await c.query('select lp from learner_progress where tenant_id = $1 and sid = $2', [tid, sid])).rows[0]; const d = (await c.query('select doc from tenant_state where tenant_id = $1', [tid])).rows[0]; return { me: { sid, dept: L.dept }, lp: lp ? lp.lp : null, mine: d ? mineOf(d.doc, sid) : { badges: [], cls: {} } }; });
    }
    const s = await lauth(req, tid); if (!s) throw new HttpErr(401, '로그인이 필요합니다.', 'auth');
    if (key === 'GET me') return inTenant(pool, tid, async c => { const L = (await c.query('select dept from learners where tenant_id = $1 and sid = $2', [tid, s.sid])).rows[0]; const lp = (await c.query('select lp from learner_progress where tenant_id = $1 and sid = $2', [tid, s.sid])).rows[0]; const d = (await c.query('select doc from tenant_state where tenant_id = $1', [tid])).rows[0]; return { me: { sid: s.sid, dept: L ? L.dept : '' }, lp: lp ? lp.lp : null, mine: d ? mineOf(d.doc, s.sid) : { badges: [], cls: {} } }; });
    if (key === 'PUT progress') { const b = await readBody(req, LP_MAX); const lp = cleanLP(b.lp); const j = JSON.stringify(lp); if (j.length > LP_MAX) throw new HttpErr(413, '학습 기록이 너무 큽니다.', 'too_large');
      await inTenant(pool, tid, c => c.query('insert into learner_progress (tenant_id, sid, lp, bytes) values ($1, $2, $3, $4) on conflict (tenant_id, sid) do update set lp = excluded.lp, bytes = excluded.bytes, updated_at = now()', [tid, s.sid, j, j.length])); return { ok: true }; }
    if (key === 'POST logout') { const t = cookies(req)[lcookieName]; await pool.query('delete from learner_sessions where id = $1', [sha(t)]); res.setHeader('set-cookie', `${lcookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`); return { ok: true }; }
    throw new HttpErr(404, '없는 주소입니다.', 'not_found');
  }

  /* ── API ── */
  const routes = {
    'GET /api/health': async () => { await pool.query('select 1'); return { ok: true }; },
    'GET /api/config': async () => ({ live: true, signup: allowSignup, signupCode: !!signupCode, ai: !!aiKey, models: MODELS, aiDaily }),

    'POST /api/signup': async (req, res) => {
      if (!allowSignup) throw new HttpErr(403, '지금은 새 기관 가입을 받지 않습니다.', 'signup_off');
      limit('su:' + ip(req), 10, 3600e3);
      const b = await readBody(req, 16384);
      const email = String(b.email || '').trim().toLowerCase(); const name = String(b.orgName || '').trim();
      if (signupCode && String(b.code || '') !== signupCode) throw new HttpErr(403, '가입 코드가 올바르지 않습니다.', 'code');
      if (!emailOk(email)) throw new HttpErr(400, '이메일 형식을 확인하세요.', 'email');
      if (!pwOk(b.password)) throw new HttpErr(400, '비밀번호는 10자 이상, 영문과 숫자를 함께 쓰세요.', 'password');
      if (!name || name.length > 30) throw new HttpErr(400, '기관명을 30자 이내로 입력하세요.', 'name');
      if (!TYPES.includes(b.type)) throw new HttpErr(400, '기관 유형을 고르세요.', 'type');
      const pw = await hashPw(b.password); const tid = newTid();
      const c = await pool.connect(); let uid;
      try {
        await c.query('begin');
        const dup = await c.query('select 1 from users where lower(email) = $1', [email]);
        if (dup.rowCount) throw new HttpErr(409, '이미 가입된 이메일입니다. 로그인하세요.', 'exists');
        await c.query('insert into tenants (id, name, type) values ($1, $2, $3)', [tid, name, b.type]);
        uid = (await c.query('insert into users (tenant_id, email, pw, role) values ($1, $2, $3, $4) returning id', [tid, email, pw, 'owner'])).rows[0].id;
        await c.query('commit');
      } catch (e) { await c.query('rollback').catch(() => {}); if (e.code === '23505') throw new HttpErr(409, '이미 가입된 이메일입니다. 로그인하세요.', 'exists'); throw e; } finally { c.release(); }
      await inTenant(pool, tid, cl => audit(cl, tid, email, 'tenant.create', { type: b.type }));
      await newSession(res, uid, tid);
      return { user: { email, role: 'owner' }, tenant: { tid, name, type: b.type, mode: 'saas' } };
    },

    'POST /api/login': async (req, res) => {
      const b = await readBody(req, 4096); const email = String(b.email || '').trim().toLowerCase();
      limit('li:' + ip(req), 30, 600e3); limit('le:' + email, 8, 600e3);
      const { rows } = await pool.query('select id, tenant_id, pw from users where lower(email) = $1', [email]);
      const u = rows[0]; const ok = await checkPw(String(b.password || ''), u ? u.pw : DUMMY);
      if (!u || !ok) throw new HttpErr(401, '이메일 또는 비밀번호가 올바르지 않습니다.', 'login');
      await pool.query('update users set last_login = now() where id = $1', [u.id]);
      await pool.query('delete from sessions where user_id = $1 and expires_at < now()', [u.id]);
      await newSession(res, u.id, u.tenant_id);
      await inTenant(pool, u.tenant_id, c => audit(c, u.tenant_id, email, 'login', null));
      const a = await pool.query('select t.id tid, t.name, t.type, t.mode, $2::text email, u.role from tenants t join users u on u.tenant_id = t.id where u.id = $1', [u.id, email]);
      return meOut(a.rows[0]);
    },
    'POST /api/logout': async (req, res) => { const t = cookies(req)[cookieName]; if (t) await pool.query('delete from sessions where id = $1', [sha(t)]); clearSid(res); return { ok: true }; },
    'GET /api/me': async req => meOut(await need(req)),

    'GET /api/state': async req => {
      const a = await need(req);
      return inTenant(pool, a.tid, async c => { const { rows } = await c.query('select doc, rev, updated_at from tenant_state where tenant_id = $1', [a.tid]); return rows[0] ? { doc: rows[0].doc, rev: rows[0].rev, at: rows[0].updated_at } : { doc: null, rev: 0 }; });
    },
    'PUT /api/state': async req => {
      const a = await need(req);
      const b = await readBody(req, STATE_MAX + 4096);
      const doc = b.doc; const rev = Number(b.rev || 0);
      if (!doc || typeof doc !== 'object' || !doc.org) throw new HttpErr(400, '상태 형식이 올바르지 않습니다.', 'state');
      if (doc.org.room && doc.org.room.tid && doc.org.room.tid !== a.tid) throw new HttpErr(403, '다른 기관의 데이터는 저장할 수 없습니다.', 'tenant');
      doc.org.room = { ...(doc.org.room || {}), tid: a.tid };
      const s = JSON.stringify(doc); if (s.length > STATE_MAX) throw new HttpErr(413, '데이터가 8MB를 넘었습니다. 오래된 기록을 정리하세요.', 'too_large');
      return inTenant(pool, a.tid, async c => {
        if (rev === 0) {
          const r = await c.query('insert into tenant_state (tenant_id, doc, rev, bytes) values ($1, $2, 1, $3) on conflict (tenant_id) do nothing returning rev', [a.tid, s, s.length]);
          if (!r.rowCount) throw new HttpErr(409, '다른 곳에서 먼저 저장했습니다.', 'conflict');
          await syncLearners(c, a.tid, doc.codes);
          return { rev: 1 };
        }
        const r = await c.query('update tenant_state set doc = $2, rev = rev + 1, bytes = $3, updated_at = now() where tenant_id = $1 and rev = $4 returning rev', [a.tid, s, s.length, rev]);
        if (!r.rowCount) throw new HttpErr(409, '다른 창이나 운영자가 먼저 저장했습니다. 최신 내용을 불러옵니다.', 'conflict');
        await syncLearners(c, a.tid, doc.codes);
        const m = doc.org.room.mode; if (m && m !== a.mode) await pool.query('update tenants set mode = $2, name = $3 where id = $1', [a.tid, String(m).slice(0, 20), String(doc.org.name || a.name).slice(0, 30)]);
        return { rev: r.rows[0].rev };
      });
    },

    'POST /api/ai/messages': async req => {
      const a = await need(req);
      if (!aiKey) throw new HttpErr(503, '서버에 AI 키가 설정되지 않았습니다.', 'ai_off');
      const b = await readBody(req, 600 * 1024);
      const model = MODELS.includes(b.model) ? b.model : MODELS[0];
      const max = Math.min(Math.max(Number(b.max) || 1200, 16), 8000);
      if (!Array.isArray(b.messages) || !b.messages.length || b.messages.length > 40) throw new HttpErr(400, '메시지 형식이 올바르지 않습니다.', 'messages');
      // 데이터룸 정책: 이 기관의 AI 경로 · 외부 연결 허용을 서버에서도 확인
      const pol = await inTenant(pool, a.tid, async c => {
        const st = await c.query("select doc->'org'->'room' room from tenant_state where tenant_id = $1", [a.tid]);
        const room = st.rows[0] && st.rows[0].room || {};
        if ((room.ai && room.ai !== 'anthropic') || (room.egress && room.egress.ai === false)) throw new HttpErr(403, '이 기관의 데이터룸 정책에서 AI 외부 연결이 꺼져 있습니다.', 'policy');
        const u = await c.query('insert into ai_usage (tenant_id, day, calls) values ($1, $2, 1) on conflict (tenant_id, day) do update set calls = ai_usage.calls + 1 returning calls', [a.tid, today()]);
        if (u.rows[0].calls > aiDaily) throw new HttpErr(429, `오늘 AI 사용 한도(${aiDaily}회)를 넘었습니다.`, 'quota');
        return room;
      });
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 90000);
      let r, j;
      try {
        r = await fetch(aiUrl, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': aiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: max, system: typeof b.system === 'string' ? b.system.slice(0, 60000) : undefined, messages: b.messages, ...(Array.isArray(b.tools) ? { tools: b.tools.slice(0, 4) } : {}) }) });
        j = await r.json().catch(() => ({}));
      } catch (e) { throw new HttpErr(502, e.name === 'AbortError' ? 'AI 응답 시간이 초과되었습니다.' : 'AI 서버에 연결하지 못했습니다.', 'ai_net'); } finally { clearTimeout(to); }
      if (!r.ok) { log.warn && log.warn('ai upstream', r.status, j && j.error && j.error.type); throw new HttpErr(r.status === 429 ? 429 : 502, r.status === 429 ? 'AI 요청이 많아 잠시 후 다시 시도하세요.' : r.status === 404 ? `모델(${model})을 쓸 수 없습니다.` : 'AI 서버 오류입니다.', 'ai_upstream'); }
      const u = j.usage || {};
      await inTenant(pool, a.tid, c => c.query('update ai_usage set tin = tin + $3, tout = tout + $4 where tenant_id = $1 and day = $2', [a.tid, today(), u.input_tokens || 0, u.output_tokens || 0]));
      void pol;
      return { content: j.content || [], usage: u, model: j.model || model, stop_reason: j.stop_reason };
    },
    'GET /api/ai/usage': async req => {
      const a = await need(req);
      return inTenant(pool, a.tid, async c => { const { rows } = await c.query("select day::text, calls, tin::int, tout::int from ai_usage where tenant_id = $1 and day > current_date - 31 order by day desc", [a.tid]); return { daily: aiDaily, days: rows }; });
    },
    'GET /api/learners/progress': async req => {
      const a = await need(req);
      return inTenant(pool, a.tid, async c => ({ lp: Object.fromEntries((await c.query('select sid, lp from learner_progress where tenant_id = $1 order by updated_at desc limit 5000', [a.tid])).rows.map(r => [r.sid, r.lp])) }));
    },
    'GET /api/audit': async req => {
      const a = await need(req); if (a.role !== 'owner') throw new HttpErr(403, '정운영자만 볼 수 있습니다.', 'role');
      return inTenant(pool, a.tid, async c => ({ rows: (await c.query('select at, actor, action, detail from audit_log where tenant_id = $1 order by at desc limit 200', [a.tid])).rows }));
    },
    'POST /api/tenant/delete': async (req, res) => {
      const a = await need(req); if (a.role !== 'owner') throw new HttpErr(403, '정운영자만 파기할 수 있습니다.', 'role');
      const b = await readBody(req, 4096);
      const { rows } = await pool.query('select pw from users where id = $1', [a.uid]);
      if (!rows[0] || !(await checkPw(String(b.password || ''), rows[0].pw))) throw new HttpErr(401, '비밀번호가 올바르지 않습니다.', 'login');
      if (String(b.confirm || '') !== a.name) throw new HttpErr(400, '기관명을 정확히 입력하세요.', 'confirm');
      await pool.query('delete from tenants where id = $1', [a.tid]); // 상태 · 사용자 · 세션 · 로그 모두 cascade
      log.info && log.info('tenant deleted', a.tid);
      clearSid(res); return { ok: true };
    }
  };

  /* ── 정적 파일 ── */
  function serveStatic(req, res, pathname) {
    if (!pubRoot) return send(res, 404, { error: 'not_found' });
    let p = decodeURIComponent(pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.resolve(pubRoot, '.' + p);
    if (!f.startsWith(pubRoot + path.sep) && f !== pubRoot) return send(res, 403, 'forbidden');
    fs.stat(f, (e, st) => {
      if (e || !st.isFile()) { if (!path.extname(p) && !p.startsWith('/api')) return send(res, 302, null, { location: p + '/' }); return send(res, 404, 'not found', { 'content-type': 'text/plain; charset=utf-8' }); }
      const ext = path.extname(f).toLowerCase(); const isHtml = ext === '.html';
      const h = { ...SEC_HEADERS, 'content-type': MIME[ext] || 'application/octet-stream', 'content-length': st.size, 'cache-control': isHtml ? 'no-cache' : 'public, max-age=300' };
      if (isHtml) h['content-security-policy'] = path.basename(f) === 'learner.html' ? LCSP : CSP;
      if (path.basename(f) === 'learner.html') h['x-frame-options'] = 'SAMEORIGIN';
      if (secure) h['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
      res.writeHead(200, h); if (req.method === 'HEAD') return res.end();
      fs.createReadStream(f).pipe(res);
    });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'); const key = `${req.method} ${url.pathname}`;
    try {
      if (url.pathname.startsWith('/api/')) {
        const pm = url.pathname.match(/^\/api\/pub\/([^/]+)\/(site|login|me|progress|logout)$/);
        const fn = pm ? (rq, rs) => pubRoute(rq, rs, pm) : routes[key]; if (!fn) throw new HttpErr(404, '없는 주소입니다.', 'not_found');
        if (req.method !== 'GET') {
          // CSRF: SameSite=Strict 쿠키 + 사용자 정의 헤더 + 같은 출처
          if (req.headers['x-didisam'] !== '1') throw new HttpErr(403, '허용되지 않은 요청입니다.', 'csrf');
          const o = req.headers.origin; if (o && new URL(o).host !== req.headers.host) throw new HttpErr(403, '허용되지 않은 출처입니다.', 'origin');
        }
        const out = await fn(req, res);
        return send(res, 200, out);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method');
      return serveStatic(req, res, url.pathname);
    } catch (e) {
      if (e instanceof HttpErr) return send(res, e.status, { error: e.code || 'error', message: e.message });
      log.error && log.error('api error', key, e && e.message);
      return send(res, 500, { error: 'server', message: '서버 오류가 발생했습니다.' });
    }
  });
}

module.exports = { createApp, hashPw, checkPw, newTid };
