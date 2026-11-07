'use strict';
/* v23 학습자 간편가입 · 개인정보 분리(데이터 최소화)
   - 학습 데이터(learner_accounts · learner_progress · tenant_state)는 가명 learner_id(uuid) + 닉네임만 안다.
   - 신원(이메일 · SNS 식별자 · 휴대폰 · 이름 · 비밀번호 해시 · 동의 기록)은 pii 스키마에만 저장한다.
     값은 앱에서 AES-256-GCM으로 암호화(키: env PII_KEY, 32바이트 hex/base64 — 로그 · 응답에 절대 남기지 않는다),
     조회는 HMAC 블라인드 인덱스(email_bidx · provider_sub_hash)로만 한다.
   - 트랜잭션 안에서 SET LOCAL ROLE로 역할을 나눈다: 학습 쪽 = didisam_tenant(pii 권한 없음), 신원 쪽 = didisam_pii(pii 스키마만).
     학습 코드 경로는 pii를 조인하지 않는다(권한상 불가능).
   - 탈퇴: pii 행 즉시 완전 삭제(hard delete), 학습 기록은 가명으로 남긴다. pii 열람 · 수정 · 삭제는 pii.access_log에 남는다.
   운영: SNS OAuth 토큰 검증 · 이메일 발송 · 본인확인(PASS) 실제 연동은 아래 '운영:' 주석 지점에서 붙인다. */
const crypto = require('node:crypto');

const PROVIDERS = ['kakao', 'naver', 'google', 'apple'];
const NICK_RE = /^[가-힣A-Za-z0-9_-]{2,20}$/;
const STU_RE = /^[0-9]{6,10}$/;
const MAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const PHONE_RE = /^01\d-?\d{3,4}-?\d{4}$/;
const PURPOSES = { cert: '수료증 발급', refund: '결제 · 환불 처리', alimtalk: '알림톡 수신', legal: '법령상 요청' };
const IDV_REASONS = { refund: '고용보험 환급 과정', adult: '성인 인증 콘텐츠', credit: '학점 인정' };

const { pwRule } = require('./pwrule');
const { createMailer } = require('./mail');
const G = require('./aiguard');
function piiKeys(env) {
  const raw = String(env.PII_KEY || '').trim(); if (!raw) return null;
  const k = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (k.length !== 32) return null;
  return { enc: Buffer.from(crypto.hkdfSync('sha256', k, Buffer.alloc(0), 'didisam-pii-enc-v1', 32)), idx: Buffer.from(crypto.hkdfSync('sha256', k, Buffer.alloc(0), 'didisam-pii-bidx-v1', 32)) };
}
const maskEmail = e => { const [a, b] = String(e || '').split('@'); if (!b) return ''; const [d, ...t] = b.split('.'); return `${a.slice(0, 2)}${'*'.repeat(Math.max(2, a.length - 2))}@${d.slice(0, 1)}${'*'.repeat(Math.max(2, d.length - 1))}.${t.join('.')}`; };
const normPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : ''; };

/* v33 학습자 → 운영자 요청함 기록(가명 sid만). L = 학습 역할 쿼리 */
const evIns = (L, tid, sid, type, data) => L('insert into learner_events (tenant_id, sid, type, data) values ($1, $2, $3, $4)', [tid, sid || '', type, JSON.stringify(data || {})]);
/* 개인정보 가림: 문자열 값은 주민번호 · 전화 · 이메일 · 카드 · 계좌 등을 가린다(emailMask 같은 이미 가린 값은 그대로) */
function redactDeep(v, depth = 0, key = '') { if (depth > 6) return null; if (typeof v === 'string') return /mask$/i.test(key) ? v.slice(0, 120) : G.redact(v).text; if (Array.isArray(v)) return v.slice(0, 100).map(x => redactDeep(x, depth + 1)); if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v).slice(0, 60)) { if (!/^[\w.$\-가-힣 ]{1,40}$/.test(k) || ['pw', 'password', 'pw2', 'code', 'email', 'phone', 'name'].includes(k)) continue; o[k] = redactDeep(x, depth + 1, k); } return o; } return typeof v === 'number' || typeof v === 'boolean' || v === null ? v : null; }
const cleanExtra = x => { if (!x || typeof x !== 'object' || Array.isArray(x)) return {}; const o = {}; for (const [k, v] of Object.entries(x).slice(0, 20)) { const kk = String(k).slice(0, 40); if (typeof v === 'string') o[kk] = G.redact(v.slice(0, 100)).text; else if (v && typeof v === 'object') o[kk] = { name: String(v.name || '').slice(0, 120), size: +v.size || 0, type: String(v.type || '').slice(0, 60) }; } return o; };

function createPii({ pool, env, HttpErr, readBody, limit, ip, audit, hashPw, checkPw, DUMMY, newLearnerSession }) {
  const K = piiKeys(env);
  const devOtp = env.PII_DEV_OTP === '1';     // 개발 · 테스트 전용: 응답에 인증번호 · 보호자 토큰을 돌려준다
  const devOauth = env.OAUTH_DEV === '1';     // 개발 · 테스트 전용: SNS 토큰 대신 dev_sub 허용
  const devIdv = env.IDV_DEV === '1';         // 개발 · 테스트 전용: 본인확인 모의 성공
  const mailer = createMailer(env); const prod = env.NODE_ENV === 'production';
  /* v33 메일 미설정: 운영(NODE_ENV=production)은 '발송 미설정' 안내(503), 개발은 응답에 인증번호(dev_code)를 돌려준다 */
  const devCode = devOtp || (!mailer.on && !prod);
  const need = () => { if (!K) throw new HttpErr(503, '개인정보 암호화 키(PII_KEY)가 설정되지 않아 가입 · 로그인을 처리할 수 없습니다.', 'pii_key'); return K; };
  const bidx = (tid, kind, v) => crypto.createHmac('sha256', need().idx).update(`${tid}|${kind}|${String(v).trim().toLowerCase()}`).digest('base64url');
  const enc = (v, aad) => { if (v == null || v === '') return null; const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', need().enc, iv); c.setAAD(Buffer.from(aad)); const ct = Buffer.concat([c.update(String(v), 'utf8'), c.final()]); return `v1.${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${ct.toString('base64url')}`; };
  const dec = (s, aad) => { if (!s) return ''; const [v, iv, tag, ct] = String(s).split('.'); if (v !== 'v1') return ''; const d = crypto.createDecipheriv('aes-256-gcm', need().enc, Buffer.from(iv, 'base64url')); d.setAAD(Buffer.from(aad)); d.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'); };
  const aad = (tid, lid, f) => `${tid}|${lid}|${f}`;
  const codeHash = (tid, b, code) => crypto.createHmac('sha256', need().idx).update(`otp|${tid}|${b}|${code}`).digest('base64url');

  /* 한 트랜잭션 · 두 역할: L(학습) · P(신원). 같은 커넥션에서 SET LOCAL ROLE을 바꿔 가며 쓴다(서로의 표는 권한상 볼 수 없음). */
  async function tx(tid, fn) {
    const c = await pool.connect(); let role = '';
    const as = async r => { if (role !== r) { await c.query(`set local role ${r}`); role = r; } };
    const L = async (sql, a) => { await as('didisam_tenant'); return c.query(sql, a); };
    const P = async (sql, a) => { await as('didisam_pii'); return c.query(sql, a); };
    try { await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [tid]); const r = await fn({ L, P }); await c.query('commit'); return r; }
    catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  }
  const plog = (P, tid, actor, action, lid, purpose, fields) => P('insert into pii.access_log (tid, actor, action, learner_id, purpose, fields) values ($1, $2, $3, $4, $5, $6)', [tid, String(actor).slice(0, 80), action, lid || null, purpose || null, fields || []]);
  async function orgOf(L, tid) {
    const d = (await L("select doc->'org'->>'type' type, doc->'settings'->'acct' acct, doc->'org'->'cpl' cpl from tenant_state where tenant_id = $1", [tid])).rows[0] || {};
    const a = d.acct || {}; return { approve: a.approve === 'manual' ? 'manual' : 'auto', strictPw: !!(d.cpl && d.cpl.on && /^moel-/.test(String(d.cpl.profile || ''))), type: d.type || '', mode: a.mode || 'open', under14: !!a.under14, social: Array.isArray(a.social) ? a.social : PROVIDERS, idv: a.idv && a.idv.on ? { on: true, reason: String(a.idv.reason || '') } : { on: false } };
  }

  /* SNS 식별자 → 해시. 운영: 공급자 토큰을 서버에서 검증해 sub(회원 번호)를 받는다.
     카카오 GET https://kapi.kakao.com/v2/user/me · 네이버 GET https://openapi.naver.com/v1/nid/me · 구글 id_token 검증(tokeninfo/JWKS) · 애플 id_token JWKS 검증.
     이메일 · 이름 · 프로필은 동의 항목에서 받지 않는다(닉네임만 선택 제공). */
  async function snsSub(b) {
    const prov = String(b.provider || ''); if (!PROVIDERS.includes(prov)) throw new HttpErr(400, '지원하지 않는 로그인 방식입니다.', 'provider');
    /* 운영: const sub = await verifyOAuth(prov, b.token) */
    if (devOauth && /^[\w.-]{3,80}$/.test(String(b.dev_sub || ''))) return { prov, sub: String(b.dev_sub) };
    throw new HttpErr(501, 'SNS 로그인 연동(OAuth 앱 등록)이 아직 설정되지 않았습니다.', 'oauth_unset');
  }
  async function useOtp(P, tid, b, purpose, code) {
    const r = (await P('select code_hash, tries, expires_at from pii.otp where tid = $1 and bidx = $2 and purpose = $3', [tid, b, purpose])).rows[0];
    if (!r || new Date(r.expires_at) < new Date()) throw new HttpErr(400, '인증번호가 만료되었습니다. 다시 받으세요.', 'otp_expired');
    if (r.tries >= 5) throw new HttpErr(429, '인증번호를 5회 잘못 입력했습니다. 다시 받으세요.', 'otp_tries');
    const h = codeHash(tid, b, String(code || '').trim()); const ok = h.length === r.code_hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(r.code_hash));
    /* v33 틀린 횟수는 별도 트랜잭션으로 확정한다(같은 트랜잭션이면 오류로 되돌려져 5회 제한이 걸리지 않았음) */
    if (!ok) { await tx(tid, ({ P: P2 }) => P2('update pii.otp set tries = tries + 1 where tid = $1 and bidx = $2 and purpose = $3', [tid, b, purpose])); throw new HttpErr(400, '인증번호가 올바르지 않습니다.', 'otp_bad'); }
    await P('delete from pii.otp where tid = $1 and bidx = $2 and purpose = $3', [tid, b, purpose]);
  }

  /* ── 공개(세션 없음) ── */
  async function otp(req, res, tid) {
    const b = await readBody(req, 2048); const email = String(b.email || '').trim().toLowerCase(); const purpose = ['signup', 'login', 'find'].includes(b.purpose) ? b.purpose : 'signup';
    limit('otp:' + ip(req), 20, 600e3); if (!MAIL_RE.test(email) || email.length > 120) throw new HttpErr(400, '이메일 형식을 확인하세요.', 'email');
    const e = bidx(tid, 'email', email); limit(`otpe:${tid}:${e}`, 5, 600e3);
    if (!mailer.on && !devCode) throw new HttpErr(503, '메일 발송이 아직 설정되지 않았습니다. 기관에 문의해 주세요.', 'mail_unset');
    const code = String(crypto.randomInt(100000, 1000000));
    const orgName = await tx(tid, async ({ L, P }) => { const n = mailer.on ? ((await L("select doc->'org'->>'name' n from tenant_state where tenant_id = $1", [tid])).rows[0] || {}).n : ''; await P('insert into pii.otp (tid, bidx, purpose, code_hash, tries, expires_at) values ($1, $2, $3, $4, 0, now() + interval \'10 minutes\') on conflict (tid, bidx, purpose) do update set code_hash = excluded.code_hash, tries = 0, expires_at = excluded.expires_at', [tid, e, purpose, codeHash(tid, e, code)]); return String(n || '디디쌤').slice(0, 40); });
    /* 이메일 발송(환경변수 어댑터) — 제목 「[기관명] 인증번호」, 본문에 6자리 코드 · 10분 유효. 계정 존재 여부와 관계없이 같은 응답(계정 추측 방지). */
    if (mailer.on) { try { await mailer.send({ to: email, subject: `[${orgName}] 인증번호`, text: `${orgName} 학습 사이트 인증번호는 ${code}입니다.\n10분 안에 입력해 주세요. 요청하지 않았다면 이 메일을 무시하세요.` }); }
      catch (x) { throw new HttpErr(502, '인증번호 메일을 보내지 못했습니다. 잠시 후 다시 시도하거나 기관에 문의해 주세요.', 'mail_fail'); } }
    return { ok: true, ttl: 600, ...(devCode ? { dev_code: code } : {}) };
  }

  async function signup(req, res, tid) {
    limit('lsu:' + ip(req), 20, 3600e3);
    const b = await readBody(req, 8192); const via = String(b.via || '');
    const consent = b.consent || {}; if (!consent.tos || !consent.privacy) throw new HttpErr(400, '필수 약관(이용약관 · 개인정보 수집 · 이용)에 동의해 주세요.', 'consent');
    const out = await tx(tid, async ({ L, P }) => {
      const org = await orgOf(L, tid); const univ = org.type === 'univ';
      if (org.strictPw && !consent.third) throw new HttpErr(400, '개인정보 제3자 제공(고용노동부, 한국산업인력공단)에 동의해 주세요.', 'consent_third');
      if (org.mode === 'code' && !univ) throw new HttpErr(403, '이 기관은 접근코드로만 로그인합니다.', 'mode');
      if (org.mode === 'invite') throw new HttpErr(403, '초대받은 회원만 가입할 수 있습니다.', 'mode');
      let nick = String(b.nickname || '').trim(); let login = via, sub = null, email = '', stu = null, dept = '';
      if (univ) { if (via !== 'univ') throw new HttpErr(400, '대학 계정은 학번으로 가입합니다.', 'via');
        stu = String(b.student_no || '').trim(); dept = String(b.dept || '').trim().slice(0, 40);
        if (!STU_RE.test(stu)) throw new HttpErr(400, '학번은 숫자 6~10자리입니다.', 'student_no'); if (!dept) throw new HttpErr(400, '학과를 입력하세요.', 'dept');
        if (String(b.pw || '').length < 8) throw new HttpErr(400, '비밀번호는 8자 이상입니다.', 'pw'); if (org.strictPw && !pwRule(b.pw)) throw new HttpErr(400, '비밀번호는 영문 · 숫자 · 특수문자 중 2종 10자 이상 또는 3종 8자 이상입니다.', 'pw_rule'); sub = bidx(tid, 'univ', stu); if (!nick) nick = stu.slice(-4) + '학번'; }
      else if (via === 'email') { email = String(b.email || '').trim().toLowerCase(); if (!MAIL_RE.test(email)) throw new HttpErr(400, '이메일 형식을 확인하세요.', 'email'); await useOtp(P, tid, bidx(tid, 'email', email), 'signup', b.code); }
      else if (via === 'sns') { const s = await snsSub(b); if (!org.social.includes(s.prov)) throw new HttpErr(403, '이 기관에서 쓰지 않는 로그인 방식입니다.', 'provider'); login = s.prov; sub = bidx(tid, 'sub:' + s.prov, s.sub); }
      else throw new HttpErr(400, '가입 방법을 고르세요.', 'via');
      if (!NICK_RE.test(nick)) throw new HttpErr(400, '닉네임은 2~20자 한글 · 영문 · 숫자 · - · _ 만 쓸 수 있습니다.', 'nickname');
      const minor = !univ && b.age14 !== true; let gContact = '';
      if (minor) { if (!org.under14) throw new HttpErr(403, '이 기관은 만 14세 이상만 가입할 수 있습니다.', 'age');
        gContact = String((b.guardian && b.guardian.contact) || '').trim(); const ph = normPhone(gContact);
        if (!MAIL_RE.test(gContact) && !PHONE_RE.test(ph || '-')) throw new HttpErr(400, '보호자 이메일 또는 휴대폰 번호를 입력하세요.', 'guardian'); if (ph) gContact = ph; }
      if (org.strictPw && b.pw && !pwRule(b.pw)) throw new HttpErr(400, '비밀번호는 영문 · 숫자 · 특수문자 중 2종 10자 이상 또는 3종 8자 이상입니다.', 'pw_rule');
      const pw = b.pw ? (String(b.pw).length >= 8 && String(b.pw).length <= 64 ? await hashPw(String(b.pw)) : (() => { throw new HttpErr(400, '비밀번호는 8~64자입니다.', 'pw'); })()) : null;
      const st = minor ? 'guardian_pending' : 'active'; const pend = !minor && org.approve === 'manual';
      let lid;
      try { lid = (await L('insert into learner_accounts (tenant_id, kind, login, nickname, student_no, dept, status, minor, mkt) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning learner_id', [tid, 'learner', univ ? 'univ' : login, nick, stu, dept, st, minor, !!consent.mkt])).rows[0].learner_id; }
      catch (e) { if (e.code === '23505') throw new HttpErr(409, '이미 가입한 학번입니다. 로그인하거나 비밀번호를 찾으세요.', 'exists'); throw e; }
      const cons = { tos: true, privacy: true, ...(consent.third ? { third: true } : {}), mkt: !!consent.mkt, ver: String(consent.ver || 'v23').slice(0, 20), at: new Date().toISOString() };
      try { await P('insert into pii.identity (tid, learner_id, provider, provider_sub_hash, email_bidx, email_enc, email_mask, pw_hash, consent) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [tid, lid, univ ? 'univ' : login, sub, email ? bidx(tid, 'email', email) : null, email ? enc(email, aad(tid, lid, 'email')) : null, email ? maskEmail(email) : null, pw, JSON.stringify(cons)]); }
      catch (e) { if (e.code === '23505') throw new HttpErr(409, univ ? '이미 가입한 학번입니다.' : via === 'email' ? '이미 가입한 이메일입니다. 로그인하세요.' : '이미 가입한 SNS 계정입니다. 로그인하세요.', 'exists'); throw e; }
      let gtok = '';
      if (minor) { gtok = crypto.randomBytes(24).toString('base64url'); await P('insert into pii.guardian (tid, learner_id, contact_enc, token_hash, expires_at) values ($1, $2, $3, $4, now() + interval \'7 days\')', [tid, lid, enc(gContact, aad(tid, lid, 'guardian')), crypto.createHash('sha256').update(gtok).digest('hex')]);
        /* 운영: 보호자에게 동의 링크 발송(이메일 또는 알림톡) — learner.html?t=<tid>#guardian/<토큰>. 7일 안에 동의하지 않으면 가입 정보는 자동 삭제. */ }
      await plog(P, tid, 'self', 'create', lid, 'signup', [email ? 'email' : '', sub ? 'provider_sub' : '', pw ? 'pw' : '', minor ? 'guardian' : ''].filter(Boolean));
      await L('insert into audit_log (tenant_id, actor, action, detail) values ($1, $2, $3, $4)', [tid, 'learner:' + lid, 'learner.signup', JSON.stringify({ login: univ ? 'univ' : login, minor })]);
      /* v33 운영자 요청함으로 가입 알림(가명 sid · 닉네임 · 가린 이메일만). 보호자 동의가 필요한 가입은 동의 후에 보낸다 */
      const jd = { kind: 'learner', login: univ ? 'univ' : login, sid: lid, nick, emailMask: email ? maskEmail(email) : '', dept, minor, consent: { tos: true, privacy: true, mkt: !!consent.mkt, at: cons.at }, extra: cleanExtra(b.extra) };
      if (!minor) await evIns(L, tid, lid, 'acct-join', jd);
      return { lid, st, nick, login: univ ? 'univ' : login, gtok, pend };
    });
    if (out.st === 'active' && !out.pend) await newLearnerSession(res, tid, out.lid);
    return { me: { sid: out.lid, nickname: out.nick, login: out.login, status: out.pend ? 'pending' : out.st }, ...(out.st === 'guardian_pending' ? { guardian: 'sent', ...(devCode ? { dev_token: out.gtok } : {}) } : {}) };
  }

  async function guardian(req, res, tid) {
    const b = await readBody(req, 2048); limit('lg:' + ip(req), 20, 600e3); const th = crypto.createHash('sha256').update(String(b.token || '')).digest('hex');
    return tx(tid, async ({ L, P }) => {
      const g = (await P("select id, learner_id from pii.guardian where tid = $1 and token_hash = $2 and status = 'pending' and expires_at > now()", [tid, th])).rows[0];
      if (!g) throw new HttpErr(404, '사용할 수 없는 동의 링크입니다. 만료되었거나 이미 처리했습니다.', 'token');
      if (b.ok !== true) { await P('delete from pii.guardian where id = $1', [g.id]); await P('delete from pii.identity where tid = $1 and learner_id = $2', [tid, g.learner_id]); await plog(P, tid, 'guardian', 'delete', g.learner_id, 'guardian_refused', ['all']);
        await L("update learner_accounts set status = 'withdrawn', nickname = '탈퇴 회원', withdrawn_at = now() where tenant_id = $1 and learner_id = $2", [tid, g.learner_id]); return { ok: true, status: 'refused' }; }
      await P("update pii.guardian set status = 'ok', confirmed_at = now() where id = $1", [g.id]); await plog(P, tid, 'guardian', 'consent', g.learner_id, 'guardian_consent', []);
      await L("update learner_accounts set status = 'active' where tenant_id = $1 and learner_id = $2 and status = 'guardian_pending'", [tid, g.learner_id]);
      const a = (await L('select login, nickname, dept, mkt from learner_accounts where tenant_id = $1 and learner_id = $2', [tid, g.learner_id])).rows[0] || {}; const im = (await P('select email_mask from pii.identity where tid = $1 and learner_id = $2', [tid, g.learner_id])).rows[0] || {};
      await evIns(L, tid, g.learner_id, 'acct-join', { kind: 'learner', login: a.login || 'email', sid: g.learner_id, nick: a.nickname || '', emailMask: im.email_mask || '', dept: a.dept || '', minor: true, consent: { tos: true, privacy: true, mkt: !!a.mkt, at: new Date().toISOString() }, extra: {}, guardian: { ok: true, at: new Date().toISOString() } });
      return { ok: true, status: 'active' };
    });
  }

  async function login(req, res, tid, b) {
    limit('ll:' + ip(req), 40, 600e3); const via = String(b.via || '');
    const lid = await tx(tid, async ({ L, P }) => {
      let row = null;
      if (via === 'email') { const email = String(b.email || '').trim().toLowerCase(); if (!MAIL_RE.test(email)) throw new HttpErr(400, '이메일 형식을 확인하세요.', 'email'); const e = bidx(tid, 'email', email); limit(`lle:${tid}:${e}`, 8, 600e3);
        row = (await P('select learner_id, pw_hash from pii.identity where tid = $1 and email_bidx = $2', [tid, e])).rows[0];
        if (b.code) { await useOtp(P, tid, e, 'login', b.code); if (!row) throw new HttpErr(401, '가입한 계정이 없습니다. 가입하기를 눌러 주세요.', 'login'); }
        else { const ok = await checkPw(String(b.pw || ''), row && row.pw_hash ? row.pw_hash : DUMMY); if (!row || !ok) throw new HttpErr(401, '이메일 또는 비밀번호가 올바르지 않습니다. 비밀번호가 없다면 이메일 인증번호로 로그인하세요.', 'login'); } }
      else if (via === 'sns') { const s = await snsSub(b); row = (await P('select learner_id from pii.identity where tid = $1 and provider = $2 and provider_sub_hash = $3', [tid, s.prov, bidx(tid, 'sub:' + s.prov, s.sub)])).rows[0]; if (!row) throw new HttpErr(404, '가입한 계정이 없습니다. 같은 SNS로 간편가입을 진행하세요.', 'no_account'); }
      else if (via === 'univ') { const stu = String(b.student_no || '').trim(); limit(`llu:${tid}:${stu}`, 8, 600e3); row = STU_RE.test(stu) ? (await P("select learner_id, pw_hash from pii.identity where tid = $1 and provider = 'univ' and provider_sub_hash = $2", [tid, bidx(tid, 'univ', stu)])).rows[0] : null;
        const ok = await checkPw(String(b.pw || ''), row && row.pw_hash ? row.pw_hash : DUMMY); if (!row || !ok) throw new HttpErr(401, '학번 또는 비밀번호가 올바르지 않습니다.', 'login'); }
      else throw new HttpErr(400, '로그인 방법을 고르세요.', 'via');
      const a = (await L('select status from learner_accounts where tenant_id = $1 and learner_id = $2', [tid, row.learner_id])).rows[0];
      if (!a || a.status === 'withdrawn') throw new HttpErr(401, '탈퇴했거나 없는 계정입니다.', 'login');
      if (a.status === 'guardian_pending') throw new HttpErr(403, '보호자 동의를 기다리고 있습니다. 보호자에게 보낸 동의 링크를 확인해 주세요.', 'guardian_pending');
      await approval(L, tid, row.learner_id);
      return row.learner_id;
    });
    await newLearnerSession(res, tid, lid);
    return lid;
  }

  /* v33 운영자 승인: 스튜디오 회원(상태 문서 members)의 등급으로 판단한다. 승인제 기관은 회원으로 등록되어 승인 대기 · 거절이 아닐 때만 로그인 */
  async function approval(L, tid, lid) {
    const r = (await L("select doc->'settings'->'acct'->>'approve' ap, (select jsonb_build_object('g', m->>'grade', 'r', m->>'reject') from jsonb_array_elements(case when jsonb_typeof(doc->'members') = 'array' then doc->'members' else '[]'::jsonb end) m where m->>'sid' = $2 limit 1) m from tenant_state where tenant_id = $1", [tid, lid])).rows[0] || {};
    const m = r.m || null;
    if (m && m.g === '거절') throw new HttpErr(403, '가입이 승인되지 않았습니다.' + (m.r ? ' 사유: ' + String(m.r).slice(0, 200) : '') + ' 운영자에게 문의하세요.', 'rejected');
    if ((m && m.g === '승인 대기') || (!m && r.ap === 'manual')) throw new HttpErr(403, '운영자 승인을 기다리고 있습니다. 승인되면 로그인할 수 있어요.', 'pending');
  }

  /* ── 본인 세션 필요 ── */
  const acctOf = async (L, tid, sid) => (await L('select learner_id, kind, login, nickname, student_no, dept, status, minor, idv_ok, mkt from learner_accounts where tenant_id = $1 and learner_id::text = $2', [tid, sid])).rows[0] || null;
  async function meExtra(c, tid, sid) { if (!/^[0-9a-f-]{36}$/.test(sid)) return null; const a = (await c.query('select kind, login, nickname, student_no, dept, status, minor, idv_ok from learner_accounts where tenant_id = $1 and learner_id = $2', [tid, sid])).rows[0]; return a ? { nickname: a.nickname, kind: a.kind, login: a.login, student_no: a.student_no, dept: a.dept, minor: a.minor, idv_ok: a.idv_ok, status: a.status } : null; }

  const isAccount = sid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(sid));
  const changePw = (tid, lid, cur, pw) => tx(tid, async ({ P }) => { const r = (await P('select pw_hash from pii.identity where tid = $1 and learner_id = $2', [tid, lid])).rows[0]; if (!r || (r.pw_hash && !(await checkPw(cur, r.pw_hash)))) throw new HttpErr(401, '비밀번호가 올바르지 않습니다.', 'login'); await P('update pii.identity set pw_hash = $3 where tid = $1 and learner_id = $2', [tid, lid, await hashPw(pw)]); await plog(P, tid, 'self', 'pw_change', lid, 'self', []); });
  async function myPii(req, res, tid, s) {
    if (req.method === 'GET') return tx(tid, async ({ P }) => { const r = (await P('select learner_id, provider, email_enc, phone_enc, name_enc, consent, created_at from pii.identity where tid = $1 and learner_id::text = $2', [tid, s.sid])).rows[0]; if (!r) throw new HttpErr(404, '계정 정보가 없습니다.', 'none');
      await plog(P, tid, 'self', 'view', r.learner_id, 'self_access', ['email', 'phone', 'name']);
      return { provider: r.provider, email: dec(r.email_enc, aad(tid, r.learner_id, 'email')), phone: dec(r.phone_enc, aad(tid, r.learner_id, 'phone')), name: dec(r.name_enc, aad(tid, r.learner_id, 'name')), consent: r.consent, created_at: r.created_at }; });
    const b = await readBody(req, 2048); const f = String(b.field || ''); const purpose = String(b.purpose || '');
    if (!['name', 'phone'].includes(f)) throw new HttpErr(400, '수정할 수 있는 항목이 아닙니다.', 'field');
    if (!PURPOSES[purpose] || (f === 'phone' && !['alimtalk', 'refund'].includes(purpose)) || (f === 'name' && !['cert', 'refund'].includes(purpose))) throw new HttpErr(400, '수집 목적을 확인하세요.', 'purpose');
    let v = String(b.value || '').trim(); if (f === 'phone' && v) { v = normPhone(v); if (!v) throw new HttpErr(400, '휴대폰 번호 형식을 확인하세요.', 'phone'); } if (f === 'name' && v.length > 30) throw new HttpErr(400, '이름은 30자 이내입니다.', 'name');
    return tx(tid, async ({ P }) => { const r = (await P(`update pii.identity set ${f}_enc = $3 where tid = $1 and learner_id::text = $2 returning learner_id`, [tid, s.sid, v ? enc(v, aad(tid, s.sid, f)) : null])).rows[0]; if (!r) throw new HttpErr(404, '계정 정보가 없습니다.', 'none');
      await plog(P, tid, 'self', v ? 'update' : 'erase', r.learner_id, purpose, [f]); return { ok: true, field: f, purpose: PURPOSES[purpose] }; });
  }

  async function withdraw(req, res, tid, s) {
    const b = await readBody(req, 2048); void b;
    await tx(tid, async ({ L, P }) => {
      const a = await acctOf(L, tid, s.sid); if (!a) throw new HttpErr(404, '계정 정보가 없습니다.', 'none');
      const idr = (await P('select email_bidx from pii.identity where tid = $1 and learner_id = $2', [tid, a.learner_id])).rows[0];
      if (idr && idr.email_bidx) await P('delete from pii.otp where tid = $1 and bidx = $2', [tid, idr.email_bidx]);
      await P('delete from pii.guardian where tid = $1 and learner_id = $2', [tid, a.learner_id]);
      await P('delete from pii.identity where tid = $1 and learner_id = $2', [tid, a.learner_id]); /* 완전 삭제 — 복구 불가 */
      await plog(P, tid, 'self', 'delete', a.learner_id, 'withdraw', ['all']);
      await L("update learner_accounts set status = 'withdrawn', nickname = '탈퇴 회원', student_no = null, dept = '', mkt = false, withdrawn_at = now() where tenant_id = $1 and learner_id = $2", [tid, a.learner_id]);
      await L('insert into audit_log (tenant_id, actor, action, detail) values ($1, $2, $3, $4)', [tid, 'learner:' + a.learner_id, 'learner.withdraw', JSON.stringify({ keep: 'pseudonymous_learning_records' })]);
    });
    await pool.query('delete from learner_sessions where tenant_id = $1 and sid = $2', [tid, s.sid]);
    return { ok: true, deleted: 'pii', kept: 'pseudonymous_learning_records' };
  }

  /* 선택 본인확인(기본 꺼짐): 기관이 법적으로 필요한 경우에만 켠다(고용보험 환급 · 성인 인증 · 학점 인정). 결과 플래그만 저장하고 이름 · 생년월일 · CI는 저장하지 않는다. */
  async function verify(req, res, tid, s) {
    const b = await readBody(req, 2048);
    return tx(tid, async ({ L, P }) => {
      const org = await orgOf(L, tid); if (!org.idv.on) throw new HttpErr(409, '이 기관은 본인확인을 사용하지 않습니다.', 'idv_off');
      const a = await acctOf(L, tid, s.sid); if (!a) throw new HttpErr(404, '계정 정보가 없습니다.', 'none');
      /* 운영: PASS(통신3사) · NICE 본인확인 결과 토큰(b.token)을 서버에서 검증 → 성공 여부만 쓴다. CI는 중복 가입 방지가 꼭 필요할 때만 HMAC으로 pii에. */
      if (!(devIdv && b.dev_ok === true)) throw new HttpErr(501, '본인확인 기관 연동이 아직 설정되지 않았습니다.', 'idv_unset');
      await L('update learner_accounts set idv_ok = true where tenant_id = $1 and learner_id = $2', [tid, a.learner_id]);
      await plog(P, tid, 'self', 'idv', a.learner_id, org.idv.reason || 'idv', []);
      return { ok: true, idv_ok: true, reason: IDV_REASONS[org.idv.reason] || '' };
    });
  }

  /* ── 운영자 ── */
  async function adminList(a) {
    return tx(a.tid, async ({ L, P }) => {
      const acc = (await L("select learner_id, kind, login, nickname, student_no, dept, status, minor, idv_ok, created_at from learner_accounts where tenant_id = $1 and status <> 'withdrawn' order by created_at desc limit 5000", [a.tid])).rows;
      const masks = new Map((await P('select learner_id, email_mask from pii.identity where tid = $1', [a.tid])).rows.map(r => [r.learner_id, r.email_mask]));
      await plog(P, a.tid, a.email, 'list_masked', null, 'member_list', ['email_mask']);
      return { accounts: acc.map(r => ({ ...r, email_mask: masks.get(r.learner_id) || '' })) };
    });
  }
  async function adminPii(a, req) {
    if (a.role !== 'owner') throw new HttpErr(403, '정운영자만 개인정보를 열람할 수 있습니다.', 'role');
    const b = await readBody(req, 2048); const f = String(b.field || ''); const purpose = String(b.purpose || ''); const lid = String(b.learner_id || '');
    if (!['name', 'email', 'phone'].includes(f) || !['cert', 'refund', 'legal'].includes(purpose) || !/^[0-9a-f-]{36}$/.test(lid)) throw new HttpErr(400, '열람 항목 · 목적을 확인하세요.', 'bad');
    return tx(a.tid, async ({ P }) => { const r = (await P(`select ${f}_enc v from pii.identity where tid = $1 and learner_id = $2`, [a.tid, lid])).rows[0]; if (!r) throw new HttpErr(404, '없는 계정이거나 탈퇴했습니다.', 'none');
      await plog(P, a.tid, a.email, 'view', lid, purpose, [f]); return { field: f, value: dec(r.v, aad(a.tid, lid, f)), purpose: PURPOSES[purpose] }; });
  }
  async function adminLog(a) {
    if (a.role !== 'owner') throw new HttpErr(403, '정운영자만 볼 수 있습니다.', 'role');
    return tx(a.tid, async ({ P }) => ({ rows: (await P('select at, actor, action, learner_id, purpose, fields from pii.access_log where tid = $1 order by at desc, id desc limit 300', [a.tid])).rows }));
  }

  /* 보존 기간: 만료된 인증번호 · 7일 안에 보호자 동의가 없는 미성년 가입 정보는 자동 삭제(기관 구분 없이 — 소유자 연결로 실행) */
  async function purge() {
    const T = (await pool.query('select id from tenants')).rows.map(r => r.id); let n = 0;
    for (const tid of T) await tx(tid, async ({ L, P }) => {
      await P('delete from pii.otp where tid = $1 and expires_at < now()', [tid]);
      const g = (await P("delete from pii.guardian where tid = $1 and status = 'pending' and expires_at < now() returning learner_id", [tid])).rows;
      for (const r of g) { n++; await P('delete from pii.identity where tid = $1 and learner_id = $2', [tid, r.learner_id]); await plog(P, tid, 'system', 'delete', r.learner_id, 'guardian_expired', ['all']);
        await L("update learner_accounts set status = 'withdrawn', nickname = '탈퇴 회원', withdrawn_at = now() where tenant_id = $1 and learner_id = $2 and status = 'guardian_pending'", [tid, r.learner_id]); }
    });
    return n;
  }

  const hasPw = (tid, lid) => tx(tid, async ({ P }) => !!((await P('select pw_hash from pii.identity where tid = $1 and learner_id = $2', [tid, lid])).rows[0] || {}).pw_hash);
  return { evIns, redactDeep, isAccount, changePw, hasPw, pubOpen: { 'POST otp': otp, 'POST signup': signup, 'POST guardian': guardian }, pubAuth: { 'GET pii': myPii, 'PUT pii': myPii, 'POST withdraw': withdraw, 'POST verify': verify }, login, meExtra, adminList, adminPii, adminLog, purge, maskEmail };
}

module.exports = { createPii, piiKeys, maskEmail };
