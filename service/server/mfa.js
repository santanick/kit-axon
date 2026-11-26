'use strict';
/* 보안 4차 #1 관리자 추가 인증(개인정보 안전성 확보조치 기준 제6조② "접속시 마다") — 2026-11-25 대표님 「모두 보완」 지시.
   - 운영자(owner · sub · teacher, 산타 관리자 포함)는 비밀번호(또는 소셜 로그인) 뒤 매번 2단계. 「이 기기 기억」 없음. 학습자는 대상 아님.
   - 기본: 이메일 인증번호 6자리(CSPRNG, 10분 유효, 티켓당 5회 틀리면 무효, 1회용, 해시만 저장).
   - 본인 선택: 인증 앱(TOTP, RFC 6238 · SHA1 · 30초 · 6자리 · ±1창 · 같은 시간창 재사용 방지). 비밀값은 AES-256-GCM 암호화 저장.
   - 기관 정책 tenant_state org.sec.mfa: 'email'(기본) | 'totp'(기관 전원 인증 앱). 정운영자만 변경(PUT /api/state에서 확인 · audit org.mfa).
   - 티켓: 무작위 32바이트, 서버에는 sha256만, 5분(재발송 때 5분 연장, 재발송 3회 · 30초 간격), 성공하면 삭제.
   - MFA_OFF=1: 시험 · 데모 전용(운영 기본 아님) — 2단계를 건너뛴다. MFA_DEV=1이고 메일 미설정이면 응답에 devCode.
   Java 동일: service-egov auth/service/impl/LoginMfa.java */
const crypto = require('node:crypto');
const { gcmDecipher } = require('./gcm');
const { createMailer } = require('./mail');

const MIGRATION = ['core/mfa_v1', `
  create table if not exists mfa_tickets (
    id text primary key,
    user_id uuid not null references users(id) on delete cascade,
    tenant_id text not null,
    kind text not null,
    via text not null default '',
    code_hash text not null default '',
    tries int not null default 0,
    sends int not null default 0,
    sent_at timestamptz,
    code_exp timestamptz,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  );
  create index if not exists mfa_tickets_user on mfa_tickets (user_id);
  create table if not exists user_totp (
    user_id uuid primary key references users(id) on delete cascade,
    secret text not null default '',
    pend text not null default '',
    last_step bigint not null default 0,
    on_at timestamptz,
    updated_at timestamptz not null default now()
  );
  do $$ begin if exists (select 1 from pg_roles where rolname = 'didisam_tenant') then revoke all on mfa_tickets from didisam_tenant; revoke all on user_totp from didisam_tenant; end if; end $$;`];
/* 최근 재인증(freshWithin): 2단계를 마지막으로 통과한 시각. 사용자당 한 줄, 서버 전용(기관 역할 권한 없음) */
const MIGRATION_V2 = ['core/mfa_v2', `
  create table if not exists mfa_fresh (
    user_id uuid primary key references users(id) on delete cascade,
    at timestamptz not null default now()
  );
  do $$ begin if exists (select 1 from pg_roles where rolname = 'didisam_tenant') then revoke all on mfa_fresh from didisam_tenant; end if; end $$;`];
const sqlMigrations = () => [MIGRATION, MIGRATION_V2];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* RFC 4648 base32(패딩 없음) */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32(buf) { let bits = 0, v = 0, o = ''; for (const x of buf) { v = ((v << 8) | x) & 0xffff; bits += 8; while (bits >= 5) { o += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) o += B32[(v << (5 - bits)) & 31]; return o; }
function unb32(s) { const t = String(s || '').toUpperCase().replace(/[\s=]/g, ''); let bits = 0, v = 0; const o = []; for (const ch of t) { const i = B32.indexOf(ch); if (i < 0) return null; v = ((v << 5) | i) & 0xffff; bits += 5; if (bits >= 8) { o.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(o); }
/* RFC 4226 HOTP → RFC 6238 TOTP(SHA1 · 6자리) */
function hotp(key, ctr) { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(ctr)); const h = crypto.createHmac('sha1', key).update(b).digest(); const o = h[19] & 15; const n = (((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6; return String(n).padStart(6, '0'); }
const step = (now = Date.now()) => Math.floor(now / 30000);
/* ±1창, last보다 큰 시간창만(재사용 방지). 맞으면 그 시간창 번호, 아니면 0 */
function totpCheck(key, code, last, now = Date.now()) { const t = step(now); for (const d of [-1, 0, 1]) { const s = t + d; if (s > last && hotp(key, s) === code) return s; } return 0; }
const codeOk = c => typeof c === 'string' && /^\d{6}$/.test(c);
const maskEmail = e => { const [l, d] = String(e).split('@'); return (l.length <= 2 ? l[0] + '*' : l.slice(0, 2) + '*'.repeat(Math.min(6, l.length - 2))) + '@' + (d || ''); };
const otpUri = (email, secret) => `otpauth://totp/DIDISAM:${encodeURIComponent(email)}?secret=${secret}&issuer=DIDISAM&algorithm=SHA1&digits=6&period=30`;

function createMfa({ pool, env, inTenant, audit, HttpErr, readBody, limit, ip, sha, cookies, secure, checkPw, pepper, log = console }) {
  const off = String(env.MFA_OFF ?? process.env.MFA_OFF ?? '') === '1';
  const dev = String(env.MFA_DEV ?? process.env.MFA_DEV ?? '') === '1';
  if (off) (log.warn || (() => {}))('MFA_OFF=1: 운영자 2단계 인증을 건너뜁니다(시험 · 데모 전용).');
  const mailer = createMailer(env);
  const CK = secure ? '__Host-dd_mfa' : 'dd_mfa';
  const KEY = crypto.createHash('sha256').update('dd-totp|' + String(env.PII_KEY || pepper || '')).digest();
  /* 저장 형식 v1:base64url(iv12 | 암호문 | tag16) — Java Cipher GCM 출력 순서와 같다 */
  const enc = s => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', KEY, iv); const ct = Buffer.concat([c.update(s, 'utf8'), c.final()]); return 'v1:' + Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64url'); };
  const dec = s => { if (!s || !s.startsWith('v1:')) return ''; const b = Buffer.from(s.slice(3), 'base64url'); if (b.length < 28) throw new Error('gcm_tag'); const d = gcmDecipher(KEY, b.subarray(0, 12), b.subarray(b.length - 16)); return Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]).toString('utf8'); };
  const codeHash = (id, code) => sha('mfa|' + id + '|' + code);
  const addCookie = (res, c) => { const h = res.getHeader('set-cookie'); res.setHeader('set-cookie', [...(Array.isArray(h) ? h : h ? [String(h)] : []), c]); };
  const ticketCookie = (res, tok, sec) => addCookie(res, `${CK}=${tok}; Path=/api/login; HttpOnly; SameSite=Strict; Max-Age=${sec}${secure ? '; Secure' : ''}`);

  async function policy(tid) { const v = await inTenant(pool, tid, async c => ((await c.query("select doc->'org'->'sec'->>'mfa' m from tenant_state where tenant_id = $1", [tid])).rows[0] || {}).m).catch(() => null); return v === 'totp' ? 'totp' : 'email'; }
  async function totpRow(uid) { return (await pool.query('select secret, pend, last_step from user_totp where user_id = $1', [uid])).rows[0] || null; }

  async function sendCode(id, email, tid) {
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    await pool.query("update mfa_tickets set code_hash = $2, code_exp = now() + interval '10 minutes', sent_at = now(), sends = sends + 1, expires_at = greatest(expires_at, now() + interval '5 minutes') where id = $1", [id, codeHash(id, code)]);
    if (mailer.on) {
      const org = ((await pool.query('select name from tenants where id = $1', [tid])).rows[0] || {}).name || '디디쌤';
      await mailer.send({ to: email, subject: `[${String(org).slice(0, 40)}] 디디쌤 스튜디오 로그인 인증번호`, text: `디디쌤 스튜디오 로그인 인증번호는 ${code} 입니다.\n\n- 10분 동안 한 번만 쓸 수 있습니다.\n- 본인이 로그인하지 않았다면 이 메일을 무시하고 비밀번호를 변경하십시오.\n- 인증번호는 누구에게도 알려 주지 마십시오(디디쌤은 인증번호를 묻지 않습니다).` })
        .catch(e => { (log.warn || (() => {}))('mfa mail failed', e && e.message); throw new HttpErr(503, '인증번호 메일을 보내지 못했습니다. 잠시 후 다시 시도하십시오.', 'mfa_mail'); });
      return {};
    }
    if (dev) return { devCode: code };
    throw new HttpErr(503, '인증번호 메일을 보낼 수 없습니다. 메일 설정을 확인하거나 관리자에게 문의하십시오.', 'mfa_mail');
  }

  /* 비밀번호 · 소셜 확인이 끝난 뒤 부른다. 세션 대신 티켓을 준다 */
  async function start(res, u, via) {
    const pol = await policy(u.tenant_id); const t = await totpRow(u.id); const hasTotp = !!(t && t.secret);
    const kind = hasTotp ? 'totp' : 'email';
    const tok = crypto.randomBytes(32).toString('base64url'); const id = sha(tok);
    await pool.query('delete from mfa_tickets where user_id = $1 and (expires_at < now() or created_at < now() - interval \'1 hour\')', [u.id]);
    await pool.query("insert into mfa_tickets (id, user_id, tenant_id, kind, via, expires_at) values ($1, $2, $3, $4, $5, now() + interval '5 minutes')", [id, u.id, u.tenant_id, kind, String(via || '')]);
    const extra = kind === 'email' ? { to: maskEmail(u.email), ...(await sendCode(id, u.email, u.tenant_id)) } : {};
    if (via) ticketCookie(res, tok, 300); /* 소셜 로그인은 리다이렉트라 쿠키로 넘긴다 */
    return { mfa: kind, ticket: tok, ...extra, ...(pol === 'totp' && !hasTotp ? { totpSetup: true } : {}) };
  }

  const ticketOf = (req, b) => { const t = String(b.ticket || cookies(req)[CK] || ''); return /^[A-Za-z0-9_-]{43}$/.test(t) ? t : ''; };
  const BAD = () => new HttpErr(401, '인증번호가 올바르지 않습니다.', 'mfa_code');
  const GONE = () => new HttpErr(401, '인증 시간이 지났거나 5번 틀려 무효가 되었습니다. 처음부터 다시 로그인하십시오.', 'mfa_expired');

  /* POST /api/login/mfa — 맞으면 { uid, tid, email, kind, via } (세션 발급은 app.js finish) */
  async function verify(req, res) {
    limit('mfa:' + ip(req), 30, 600e3);
    const b = await readBody(req, 4096); const tok = ticketOf(req, b); const code = String(b.code == null ? '' : b.code).replace(/\s/g, '');
    if (!tok) throw GONE();
    const id = sha(tok);
    const r = (await pool.query('select t.user_id, t.tenant_id, t.kind, t.via, t.code_hash, t.tries, (t.code_exp > now()) live, u.email from mfa_tickets t join users u on u.id = t.user_id where t.id = $1 and t.expires_at > now() and t.tries < 5', [id])).rows[0];
    if (!r) throw GONE();
    let ok = false, st = 0;
    if (codeOk(code)) {
      if (r.kind === 'email') ok = r.live && !!r.code_hash && crypto.timingSafeEqual(Buffer.from(codeHash(id, code)), Buffer.from(r.code_hash));
      else { const t = await totpRow(r.user_id); const key = t && t.secret ? unb32(dec(t.secret)) : null; st = key ? totpCheck(key, code, +t.last_step) : 0; ok = st > 0; }
    }
    if (!ok) {
      const n = (await pool.query('update mfa_tickets set tries = tries + 1 where id = $1 returning tries', [id])).rows[0];
      await inTenant(pool, r.tenant_id, c => audit(c, r.tenant_id, r.email, 'mfa.fail', { kind: r.kind, tries: n ? n.tries : 5 })).catch(() => {});
      if (n && n.tries >= 5) { await pool.query('delete from mfa_tickets where id = $1', [id]); throw GONE(); }
      throw BAD();
    }
    const del = await pool.query('delete from mfa_tickets where id = $1 returning id', [id]); if (!del.rowCount) throw GONE(); /* 동시 요청도 1회만 */
    if (st) { const u = await pool.query('update user_totp set last_step = $2, updated_at = now() where user_id = $1 and last_step < $2', [r.user_id, st]); if (!u.rowCount) throw BAD(); }
    await pool.query('insert into mfa_fresh (user_id, at) values ($1, now()) on conflict (user_id) do update set at = excluded.at', [r.user_id]); /* freshWithin 기준 시각 */
    if (cookies(req)[CK]) ticketCookie(res, '', 0);
    const pol = r.kind === 'email' ? await policy(r.tenant_id) : 'email';
    return { uid: r.user_id, tid: r.tenant_id, email: r.email, kind: r.kind, via: r.via, totpSetup: pol === 'totp' };
  }

  async function resend(req) {
    limit('mfr:' + ip(req), 20, 600e3);
    const b = await readBody(req, 4096); const tok = ticketOf(req, b); if (!tok) throw GONE(); const id = sha(tok);
    const r = (await pool.query("select t.kind, t.sends, t.tenant_id, (t.sent_at > now() - interval '30 seconds') soon, u.email from mfa_tickets t join users u on u.id = t.user_id where t.id = $1 and t.expires_at > now() and t.tries < 5", [id])).rows[0];
    if (!r) throw GONE();
    if (r.kind !== 'email') throw new HttpErr(400, '인증 앱을 쓰는 계정입니다. 인증 앱의 6자리 번호를 입력하십시오.', 'mfa_kind');
    if (r.soon) throw new HttpErr(429, '30초 뒤에 다시 보낼 수 있습니다.', 'mfa_wait');
    if (r.sends >= 4) throw new HttpErr(429, '인증번호를 너무 많이 요청했습니다. 처음부터 다시 로그인하십시오.', 'mfa_resend');
    return { ok: true, to: maskEmail(r.email), ...(await sendCode(id, r.email, r.tenant_id)) };
  }

  /* 최근 재인증 여부 — 통합 관리 서버(core/group-d1) 등 민감 작업 앞에서 쓴다. Java LoginMfa.freshWithin과 같은 동작.
     user: 사용자 id(uuid 문자열) 또는 { uid } · { id } 객체(need(req) 결과 그대로). seconds: 몇 초 안에 2단계를 통과했는지(양의 정수, 소수는 버림).
     → Promise<boolean>. 잘못된 user · seconds(0 이하 · 숫자 아님)는 false. MFA_OFF=1(시험 · 데모 전용)은 2단계 자체가 없으므로 true. */
  async function freshWithin(user, seconds) {
    const uid = String(typeof user === 'string' ? user : (user && (user.uid || user.id)) || ''); const s = Math.floor(Number(seconds));
    if (!UUID_RE.test(uid) || !Number.isFinite(s) || s <= 0) return false;
    if (off) return true;
    return (await pool.query('select 1 from mfa_fresh where user_id = $1 and at > now() - make_interval(secs => $2::float8)', [uid, s])).rowCount > 0;
  }

  const pwAgain = async (a, b) => { limit('mfp:' + a.uid, 8, 600e3); const { rows } = await pool.query('select pw from users where id = $1', [a.uid]); if (!rows[0] || !(await checkPw(String(b.password || ''), rows[0].pw))) throw new HttpErr(401, '비밀번호가 올바르지 않습니다.', 'login'); };
  const routes = need => ({
    'GET /api/me/mfa': async req => { const a = await need(req); const t = await totpRow(a.uid); const pol = await policy(a.tid); return { method: t && t.secret ? 'totp' : 'email', totp: !!(t && t.secret), pending: !!(t && t.pend), policy: pol, off }; },
    /* { password } → 등록 시작(비밀값 · otpauth URI), { code } → 확인 후 사용 */
    'POST /api/me/mfa': async req => {
      const a = await need(req); const b = await readBody(req, 4096);
      if (b.code != null) {
        limit('mfc:' + a.uid, 10, 600e3);
        const t = await totpRow(a.uid); if (!t || !t.pend) throw new HttpErr(400, '인증 앱 등록을 먼저 시작하십시오.', 'mfa_pending');
        const code = String(b.code).replace(/\s/g, ''); const st = codeOk(code) ? totpCheck(unb32(dec(t.pend)), code, 0) : 0;
        if (!st) throw new HttpErr(400, '인증 앱의 번호가 맞지 않습니다. 기기 시간이 맞는지 확인하고 새 번호를 입력하십시오.', 'mfa_code');
        await pool.query("update user_totp set secret = pend, pend = '', last_step = $2, on_at = now(), updated_at = now() where user_id = $1", [a.uid, st]);
        await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'mfa.totp.on', null));
        return { ok: true, method: 'totp' };
      }
      await pwAgain(a, b);
      const secret = b32(crypto.randomBytes(20));
      await pool.query("insert into user_totp (user_id, pend) values ($1, $2) on conflict (user_id) do update set pend = excluded.pend, updated_at = now()", [a.uid, enc(secret)]);
      return { secret, uri: otpUri(a.email, secret) };
    },
    'DELETE /api/me/mfa': async req => {
      const a = await need(req); const b = await readBody(req, 4096); await pwAgain(a, b);
      if ((await policy(a.tid)) === 'totp') throw new HttpErr(403, '기관 정책상 인증 앱을 해제할 수 없습니다. 정운영자에게 문의하십시오.', 'mfa_policy');
      const r = await pool.query('delete from user_totp where user_id = $1 returning secret', [a.uid]);
      if (r.rowCount && r.rows[0].secret) await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'mfa.totp.off', null));
      return { ok: true, method: 'email' };
    },
  });
  return { off, start, verify, resend, routes, policy, freshWithin, CK };
}

module.exports = { createMfa, sqlMigrations, hotp, totpCheck, b32, unb32, maskEmail };
