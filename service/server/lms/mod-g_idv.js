'use strict';
/* x3 · SFR-016 원격수업 대리출석 방지 — 출석 · 시험 직전 본인 확인(sql/a3_integrity.sql)
   ① 패스키(WebAuthn: 지문 · 얼굴 인식 · 기기 PIN) — 서버에는 공개키(SPKI)와 서명 횟수만 저장, 생체 정보는 기기 밖으로 나오지 않는다.
   ② 인증 앱(TOTP, RFC 6238 30초 · 6자리) — 계산은 SQL(lms_x_totp)이 해서 Node · Java가 같은 결과를 낸다.
   ③ 이메일 인증번호 — 어댑터(대기열 + 메일 게이트웨이가 가져가는 /idv-mail-pull). 문자(SMS)는 학교 게이트웨이 연동 후.
   분반 규칙(/idv-rule)이 있으면 lms_attendance 트리거가 학생 출석마다 확인 표 1장을 소비한다(없으면 428 idv_needed).
   서명 · clientDataJSON · authenticatorData 검사는 여기(Java: lms.g LmsGIdvServiceImpl)에서 하고, 상태(요청 · 표 · 횟수)는 SQL 함수가 갖는다.
   rp_id = WEBAUTHN_RP_ID 또는 요청 Host(포트 제외), 허용 origin = WEBAUTHN_ORIGINS(쉼표) 또는 {X-Forwarded-Proto|http(s)}://{Host}. */
const crypto = require('node:crypto');

const ROUTES = [
  ['GET /api/lms/g/idv', 'lms_g_idv', 'learner'],
  ['POST /api/lms/g/wa-options', 'lms_g_wa_options', 'learner', 4096],
  ['POST /api/lms/g/wa-register', 'lms_g_wa_reg_save', 'learner', 16384],
  ['POST /api/lms/g/wa-verify', 'lms_g_wa_done', 'learner', 16384],
  ['POST /api/lms/g/wa-delete', 'lms_g_wa_delete', 'learner', 4096],
  ['POST /api/lms/g/totp-new', 'lms_g_totp_new', 'learner', 4096],
  ['POST /api/lms/g/totp-verify', 'lms_g_totp_verify', 'learner', 4096],
  ['POST /api/lms/g/email-code', 'lms_g_email_code', 'learner', 4096],
  ['POST /api/lms/g/email-verify', 'lms_g_email_verify', 'learner', 4096],
  ['GET /api/lms/g/idv-rule', 'lms_g_idv_rule', 'staff'],
  ['POST /api/lms/g/idv-rule', 'lms_g_idv_rule_save', 'staff', 4096],
  ['GET /api/lms/g/idv-report', 'lms_g_idv_report', 'staff'],
  ['POST /api/lms/g/idv-mail-pull', 'lms_g_mail_pull', 'staff', 4096]
];
const WERR = {
  wa_bad: [400, '패스키 응답 형식이 올바르지 않습니다.'], wa_type: [400, '패스키 응답 종류가 맞지 않습니다.'],
  wa_origin: [400, '이 사이트에서 만든 패스키 응답이 아닙니다.'], wa_rp: [400, '이 사이트용 패스키가 아닙니다.'],
  wa_up: [400, '기기에서 사용자 확인이 되지 않았습니다.'], wa_uv: [400, '기기 잠금(지문 · 얼굴 · PIN) 확인이 필요합니다.'],
  wa_key: [400, '공개키를 읽을 수 없거나 서명 방식과 맞지 않습니다.'], wa_sig: [403, '패스키 서명이 맞지 않습니다. 본인 기기에서 다시 시도하세요.']
};

module.exports = ctx => {
  const { HttpErr, readBody } = ctx;
  const bad = c => new HttpErr(WERR[c][0], WERR[c][1], c);
  /* efh_lib 실행기를 쓰되, 본문은 여기서 먼저 읽고 검사 · 가공한 것을 넘긴다 */
  const gw = require('./efh_lib')({ ...ctx, readBody: async req => req.__ddBody }, [...ROUTES, ['POST /api/lms/g/wa-verify#get', 'lms_g_wa_get', 'learner', 16384]]);
  const host = req => String(req.headers.host || '').trim().toLowerCase();
  const rpId = req => process.env.WEBAUTHN_RP_ID || host(req).replace(/:\d+$/, '');
  const origins = req => process.env.WEBAUTHN_ORIGINS ? process.env.WEBAUTHN_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [`${String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || (req.socket && req.socket.encrypted ? 'https' : 'http')}://${host(req)}`];
  const b64u = (v, max) => { if (typeof v !== 'string' || !v || v.length > max || !/^[A-Za-z0-9_-]+={0,2}$/.test(v) || v.replace(/=/g, '').length % 4 === 1) throw bad('wa_bad'); return Buffer.from(v.replace(/=/g, ''), 'base64url'); };
  function clientData(req, v, type) {
    const raw = b64u(v, 4096); let j; try { j = JSON.parse(raw.toString('utf8')); } catch { throw bad('wa_bad'); }
    if (!j || typeof j !== 'object' || typeof j.challenge !== 'string') throw bad('wa_bad');
    if (j.type !== type) throw bad('wa_type');
    if (!origins(req).includes(j.origin)) throw bad('wa_origin');
    return { raw, challenge: j.challenge };
  }
  function authData(req, v, needCred) {
    const b = b64u(v, 4096); if (b.length < 37) throw bad('wa_bad');
    if (!b.subarray(0, 32).equals(crypto.createHash('sha256').update(rpId(req)).digest())) throw bad('wa_rp');
    const fl = b[32]; if (!(fl & 1)) throw bad('wa_up'); if (!(fl & 4)) throw bad('wa_uv');
    const out = { b, count: b.readUInt32BE(33), uv: true, cred: null };
    if (needCred) { if (!(fl & 0x40) || b.length < 55) throw bad('wa_bad'); const L = b.readUInt16BE(53); if (L < 1 || L > 1023 || b.length < 55 + L) throw bad('wa_bad'); out.cred = b.subarray(55, 55 + L).toString('base64url'); }
    return out;
  }
  function pubKey(spki, alg) {
    let k; try { k = crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' }); } catch { throw bad('wa_key'); }
    const t = k.asymmetricKeyType; const d = k.asymmetricKeyDetails || {};
    if (!((alg === -7 && t === 'ec' && d.namedCurve === 'prime256v1') || (alg === -257 && t === 'rsa' && d.modulusLength >= 2048) || (alg === -8 && t === 'ed25519'))) throw bad('wa_key');
    return k;
  }
  const algOf = v => { const n = Number(v); if (![-7, -257, -8].includes(n) || String(v) !== String(n)) throw bad('wa_key'); return n; };
  async function body(req, max) { const b = await readBody(req, max); if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpErr(400, '입력값이 올바르지 않습니다.', 'bad_input'); return b; }

  const out = {};
  for (const [k, , , max] of ROUTES) {
    if (k.startsWith('GET ')) { out[k] = gw[k]; continue; }
    out[k] = async req => { req.__ddBody = await body(req, max); return gw[k](req); };
  }
  out['POST /api/lms/g/wa-options'] = async req => { req.__ddBody = await body(req, 4096); const r = await gw['POST /api/lms/g/wa-options'](req); return { ...r, rp_id: rpId(req) }; };
  out['POST /api/lms/g/wa-register'] = async req => {
    const a = await body(req, 16384);
    const cd = clientData(req, a.client_data_json, 'webauthn.create'); const ad = authData(req, a.authenticator_data, true);
    if (a.cred_id != null && a.cred_id !== ad.cred) throw bad('wa_bad');
    const alg = algOf(a.alg); pubKey(b64u(a.public_key, 2000), alg);
    req.__ddBody = { ch_id: a.ch_id, challenge: cd.challenge, cred_id: ad.cred, public_key: Buffer.from(a.public_key, 'base64url').toString('base64url'), alg, sign_count: ad.count, uv: ad.uv, label: a.label };
    return gw['POST /api/lms/g/wa-register'](req);
  };
  out['POST /api/lms/g/wa-verify'] = async req => {
    const a = await body(req, 16384);
    const cd = clientData(req, a.client_data_json, 'webauthn.get'); const ad = authData(req, a.authenticator_data, false); const sig = b64u(a.signature, 1024);
    if (typeof a.cred_id !== 'string' || !/^[A-Za-z0-9_-]{16,1400}$/.test(a.cred_id)) throw bad('wa_bad');
    req.__ddBody = { ch_id: a.ch_id, challenge: cd.challenge, cred_id: a.cred_id };
    const k = await gw['POST /api/lms/g/wa-verify#get'](req);
    const key = pubKey(Buffer.from(k.public_key, 'base64url'), k.alg);
    const data = Buffer.concat([ad.b, crypto.createHash('sha256').update(cd.raw).digest()]);
    let ok = false; try { ok = crypto.verify(k.alg === -8 ? null : 'sha256', data, key, sig); } catch { ok = false; }
    if (!ok) throw bad('wa_sig');
    req.__ddBody = { ch_id: a.ch_id, cred_id: a.cred_id, sign_count: ad.count, uv: ad.uv };
    return gw['POST /api/lms/g/wa-verify'](req);
  };
  return out;
};
module.exports.ROUTES = ROUTES;
module.exports.WERR = WERR;
