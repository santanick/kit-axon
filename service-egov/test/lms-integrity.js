'use strict';
/* x3 대조 테스트 — SFR-089 웹 시험 감독(묶음 F 확장) · SFR-016 대리출석 방지 본인 확인(묶음 G 확장: 패스키 · 인증 앱 · 이메일 어댑터)
   두 서버가 같은 DB를 쓴다. 패스키는 테스트가 P-256 키로 서명을 만들고(origin = 각 서버 주소), 인증 앱 번호는 테스트가 RFC 6238로 계산한다.
   무작위 값(감독 토큰 · challenge · 비밀키 · 메일 번호)이 들어간 응답은 본문 비교에서 뺀다(상태 코드는 비교).
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddx3 node test/lms-integrity.js http://127.0.0.1:8431 [http://127.0.0.1:8432] */
const crypto = require('node:crypto');
const { call, setup, setSql, run, STU } = require('./lms-efh-lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8431', process.argv[3] || ''];

const b64u = b => Buffer.from(b).toString('base64url');
const sha = b => crypto.createHash('sha256').update(b).digest();
function totp(secret, step) {
  const A32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, v = 0; const out = [];
  for (const ch of secret.replace(/=/g, '')) { v = (v << 5) | A32.indexOf(ch); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } }
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(step)); const h = crypto.createHmac('sha1', Buffer.from(out)).update(c).digest(); const o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}
/* 최소 JPEG(머리 표지 + 채움) — 서버는 JPEG 표지 · 크기만 본다 */
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 7), Buffer.from([0xff, 0xd9])]).toString('base64');

async function scenario(base, tag) {
  const R = {}, P = []; const S = await setup(base, tag); const ck = S.ck; const L = S.L; const U = S.U;
  const G = (k, p) => call(base, 'GET', p, { cookie: ck }).then(r => (R[k] = r));
  const Po = (k, p, body) => call(base, 'POST', p, { cookie: ck, body }).then(r => (R[k] = r));
  const LP = (k, m, p, body) => call(base, 'POST', p, { cookie: L[m], body }).then(r => (R[k] = r));
  const LG = (k, m, p) => call(base, 'GET', p, { cookie: L[m] }).then(r => (R[k] = r));
  const hide = (k, ...keys) => { if (R[k] && R[k].j) for (const x of keys) if (x in R[k].j) R[k].j[x] = '*'; };

  /* ── ① 시험 감독 ── */
  await Po('bank', '/api/lms/f/bank-save', { name: '감독 은행', scope: 'section', section_id: S.sec });
  await Po('q', '/api/lms/f/q-save', { bank_id: R.bank.j.bank.bank_id, kind: 'tf', stem: '감독 문항', answer: 't', points: 1 });
  const qid = R.q.j.question.q_id;
  await Po('ex', '/api/lms/f/exam-save', { section_id: S.sec, title: '감독 시험', fixed: [qid], shuffle_q: false, shuffle_c: false, max_attempts: 3, status: 'published' });
  const ex = R.ex.j.exam.exam_id;
  await G('cfg0', '/api/lms/f/proctor-cfg?exam=' + ex);
  await Po('cfgBad', '/api/lms/f/proctor-cfg', { exam_id: ex, single_device: 'x' });
  await Po('cfgBadSnap', '/api/lms/f/proctor-cfg', { exam_id: ex, snap_sec: 5 });
  await Po('cfg', '/api/lms/f/proctor-cfg', { exam_id: ex, enabled: true, snap_sec: 30, single_device: 'kick', risk_flag: 20 });
  await call(base, 'POST', '/api/lms/f/proctor-cfg', { cookie: U.tnl, body: { exam_id: ex, enabled: false } }).then(r => (R.cfgNoScope = r));
  const me = STU[0];
  await LG('info', me, '/api/lms/f/proctor?exam=' + ex);
  await LG('infoOther', '20267777', '/api/lms/f/proctor?exam=' + ex);
  await LP('start', me, '/api/lms/f/start', { exam_id: ex });
  const at = R.start.j.attempt.attempt_id;
  await LP('ansNoBegin', me, '/api/lms/f/answer', { attempt_id: at, answers: { [qid]: 't' } });
  await LP('beginNoConsent', me, '/api/lms/f/proctor-begin', { attempt_id: at, checks: { camera: true } });
  await LP('beginNoCam', me, '/api/lms/f/proctor-begin', { attempt_id: at, consent: true, checks: { camera: false } });
  await LP('begin', me, '/api/lms/f/proctor-begin', { attempt_id: at, consent: true, device: 'desktop · Chrome', checks: { camera: true, mic: false, browser: true, network_ms: 40 } });
  const tok = R.begin.j && R.begin.j.ptoken; hide('begin', 'ptoken');
  await LP('ansTok', me, '/api/lms/f/answer', { attempt_id: at, ptoken: tok, answers: { [qid]: 'f' } });
  await LP('ansBadTok', me, '/api/lms/f/answer', { attempt_id: at, ptoken: 'nope', answers: { [qid]: 't' } });
  await LP('evBadKind', me, '/api/lms/f/proctor-event', { attempt_id: at, ptoken: tok, events: [{ kind: 'blur' }, { kind: 'bogus' }] });
  await LP('ev', me, '/api/lms/f/proctor-event', { attempt_id: at, ptoken: tok, events: [{ kind: 'blur', at: new Date().toISOString() }, { kind: 'fs_exit' }, { kind: 'paste', detail: { len: 120 } }, { kind: 'devtools', detail: { key: 'F12' } }] });
  await LP('evBeat', me, '/api/lms/f/proctor-event', { attempt_id: at, ptoken: tok, events: [] });
  await LP('snapId', me, '/api/lms/f/proctor-snap', { attempt_id: at, ptoken: tok, kind: 'id', b64: JPG, faces: 1, face_method: 'facedetector' });
  hide('snapId', 'purge_at');
  await LP('snapRate', me, '/api/lms/f/proctor-snap', { attempt_id: at, ptoken: tok, kind: 'periodic', b64: JPG, faces: 1, face_method: 'facedetector' });
  await LP('snapNotJpg', me, '/api/lms/f/proctor-snap', { attempt_id: at, ptoken: tok, kind: 'periodic', b64: Buffer.alloc(200, 1).toString('base64') });
  await setSql(S.tid, "update lms_proctor_snap set at = at - interval '1 minute' where attempt_id = $1", [at]);
  await LP('snapMulti', me, '/api/lms/f/proctor-snap', { attempt_id: at, ptoken: tok, kind: 'periodic', b64: JPG, faces: 2, face_method: 'heuristic' });
  hide('snapMulti', 'purge_at');
  /* 두 번째 기기(kick): 새 기기가 이어받고 옛 화면은 저장 불가 */
  await LP('begin2', me, '/api/lms/f/proctor-begin', { attempt_id: at, consent: true, device: 'mobile · Safari', checks: { camera: true } });
  const tok2 = R.begin2.j && R.begin2.j.ptoken; hide('begin2', 'ptoken');
  await LP('ansOld', me, '/api/lms/f/answer', { attempt_id: at, ptoken: tok, answers: { [qid]: 't' } });
  /* 막기(block): 응답 중인 기기가 있으면 세 번째 기기 시작 거부 */
  await Po('cfgBlock', '/api/lms/f/proctor-cfg', { exam_id: ex, single_device: 'block' });
  await LP('begin3', me, '/api/lms/f/proctor-begin', { attempt_id: at, consent: true, device: 'tablet', checks: { camera: true } });
  await LP('submit', me, '/api/lms/f/submit', { attempt_id: at, ptoken: tok2, answers: { [qid]: 't' } });
  await LP('evAfter', me, '/api/lms/f/proctor-event', { attempt_id: at, ptoken: tok2, events: [{ kind: 'blur' }] });
  /* 교수자 검토 */
  await G('review', '/api/lms/f/proctor-review?exam=' + ex);
  await G('timeline', '/api/lms/f/proctor-timeline?attempt=' + at);
  const snapId = R.snapId.j && R.snapId.j.snap_id;
  await G('photo', '/api/lms/f/proctor-photo?id=' + snapId);
  await call(base, 'GET', '/api/lms/f/proctor-photo?id=' + snapId, { cookie: L[me] }).then(r => (R.photoLearner = r));
  await Po('decideBad', '/api/lms/f/proctor-decide', { attempt_id: at, decision: 'void' });
  await Po('decide', '/api/lms/f/proctor-decide', { attempt_id: at, decision: 'warn', note: '창 전환 · 두 번째 기기 확인' });
  await G('views', '/api/lms/f/proctor-views?exam=' + ex);
  /* 보존 기간 · 자동 파기 */
  await G('pset0', '/api/lms/f/proctor-settings');
  await call(base, 'POST', '/api/lms/f/proctor-settings', { cookie: U.prof, body: { keep_days: 7 } }).then(r => (R.psetProf = r));
  await Po('psetBad', '/api/lms/f/proctor-settings', { keep_days: 0 });
  await Po('pset', '/api/lms/f/proctor-settings', { keep_days: 7 });
  await setSql(S.tid, "update lms_proctor_snap set at = at - interval '10 days' where snap_id = $1", [snapId]);
  await Po('pset2', '/api/lms/f/proctor-settings', { keep_days: 7 });
  await Po('purge', '/api/lms/f/proctor-purge', {});
  await G('photoPurged', '/api/lms/f/proctor-photo?id=' + snapId);
  await G('timeline2', '/api/lms/f/proctor-timeline?attempt=' + at);

  /* ── ② 본인 확인 ── */
  const m2 = STU[1];
  await LG('idv0', m2, '/api/lms/g/idv');
  await G('rule0', '/api/lms/g/idv-rule?section_id=' + S.sec);
  await Po('ruleBad', '/api/lms/g/idv-rule', { section_id: S.sec, method: 'face' });
  await Po('rule', '/api/lms/g/idv-rule', { section_id: S.sec, method: 'webauthn' });
  const sess = (await setSql(S.tid, "insert into lms_session (tenant_id, section_id, week_no, seq, kind, starts_at, ends_at) values (current_setting('app.tenant'), $1, 1, 1, 'class', now(), now() + interval '75 minutes'), (current_setting('app.tenant'), $1, 2, 1, 'class', now(), now() + interval '75 minutes') returning session_id::text", [S.sec])).rows.map(r => r.session_id);
  await Po('code', '/api/lms/g/code', { session_id: sess[0] });
  const code = R.code.j.code; hide('code', 'code', 'qr');
  await LP('ciNoIdv', m2, '/api/lms/g/checkin', { session_id: sess[0], member_no: m2, method: 'code', code });
  /* 패스키 등록 */
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }); const spki = b64u(kp.publicKey.export({ type: 'spki', format: 'der' }));
  const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const credId = Buffer.from('x3-passkey-cred-0001'); const host = new URL(base).hostname;
  const aData = (flags, cnt, withCred, rp = host) => { const c = Buffer.alloc(4); c.writeUInt32BE(cnt); const parts = [sha(rp), Buffer.from([flags]), c]; if (withCred) { const l = Buffer.alloc(2); l.writeUInt16BE(credId.length); parts.push(Buffer.alloc(16), l, credId); } return Buffer.concat(parts); };
  const cData = (type, ch, origin = base) => Buffer.from(JSON.stringify({ type, challenge: ch, origin, crossOrigin: false }));
  await LP('waOptNoCred', m2, '/api/lms/g/wa-options', { purpose: 'checkin', ref: sess[0] });
  await LP('waOpt', m2, '/api/lms/g/wa-options', { purpose: 'register' }); const o1 = { ...R.waOpt.j }; hide('waOpt', 'challenge', 'user');
  const reg = (over = {}) => ({ ch_id: o1.ch_id, client_data_json: b64u(cData('webauthn.create', o1.challenge)), authenticator_data: b64u(aData(0x45, 0, true)), public_key: spki, alg: -7, label: '내 노트북', ...over });
  await LP('regOrigin', m2, '/api/lms/g/wa-register', reg({ client_data_json: b64u(cData('webauthn.create', o1.challenge, 'https://evil.example')) }));
  await LP('regType', m2, '/api/lms/g/wa-register', reg({ client_data_json: b64u(cData('webauthn.get', o1.challenge)) }));
  await LP('regNoUv', m2, '/api/lms/g/wa-register', reg({ authenticator_data: b64u(aData(0x41, 0, true)) }));
  await LP('regRp', m2, '/api/lms/g/wa-register', reg({ authenticator_data: b64u(aData(0x45, 0, true, 'evil.example')) }));
  await LP('regKey', m2, '/api/lms/g/wa-register', reg({ alg: -257 }));
  await LP('regCh', m2, '/api/lms/g/wa-register', reg({ client_data_json: b64u(cData('webauthn.create', 'AAAA' + o1.challenge.slice(4))) }));
  await LP('regBadB64', m2, '/api/lms/g/wa-register', reg({ authenticator_data: 'a' }));
  await LP('reg', m2, '/api/lms/g/wa-register', reg());
  await LP('regAgain', m2, '/api/lms/g/wa-register', reg());
  await LG('idv1', m2, '/api/lms/g/idv');
  /* 출석 직전 확인 → 표 → 출석 */
  const verify = async (k, purpose, ref, cnt, { sigKey = kp.privateKey, origin } = {}) => {
    const o = { ...(await LP(k + 'Opt', m2, '/api/lms/g/wa-options', { purpose, ref })).j }; hide(k + 'Opt', 'challenge', 'user');
    const ad = aData(0x05, cnt, false); const cd = cData('webauthn.get', o.challenge, origin);
    const sig = crypto.sign('sha256', Buffer.concat([ad, sha(cd)]), sigKey);
    return LP(k, m2, '/api/lms/g/wa-verify', { ch_id: o.ch_id, cred_id: b64u(credId), client_data_json: b64u(cd), authenticator_data: b64u(ad), signature: b64u(sig) });
  };
  await verify('vaBadSig', 'checkin', sess[0], 1, { sigKey: crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey });
  await verify('va', 'checkin', sess[0], 1);
  await LP('ci', m2, '/api/lms/g/checkin', { session_id: sess[0], member_no: m2, method: 'code', code, idv: R.va.j && R.va.j.ticket });
  await verify('vaCounter', 'checkin', sess[1], 1);
  await verify('vaOther', 'exam', ex, 5);
  await LP('ciNotEnr', '20267777', '/api/lms/g/wa-options', { purpose: 'checkin', ref: sess[0] });
  /* 인증 앱 */
  await LP('totpNew', m2, '/api/lms/g/totp-new', {}); const sec = R.totpNew.j && R.totpNew.j.secret; hide('totpNew', 'secret', 'otpauth');
  await LP('totpPreExam', m2, '/api/lms/g/totp-verify', { purpose: 'exam', ref: ex, code: '123456' });
  await LP('totpFmt', m2, '/api/lms/g/totp-verify', { code: '12ab' });
  const st = Math.floor(Date.now() / 30000);
  await LP('totpWrong', m2, '/api/lms/g/totp-verify', { code: totp(sec, st - 5) });
  await LP('totpOk', m2, '/api/lms/g/totp-verify', { code: totp(sec, st) });
  await LP('totpReplay', m2, '/api/lms/g/totp-verify', { purpose: 'checkin', ref: sess[1], code: totp(sec, st) });
  await LP('totpCheck', m2, '/api/lms/g/totp-verify', { purpose: 'checkin', ref: sess[1], code: totp(sec, st + 1) });
  await LP('totpAgain', m2, '/api/lms/g/totp-new', {});
  /* 분반 규칙 any: 인증 앱 표로 2차시 출석 */
  await Po('ruleAny', '/api/lms/g/idv-rule', { section_id: S.sec, method: 'any' });
  await Po('code2', '/api/lms/g/code', { session_id: sess[1] }); const code2 = R.code2.j.code; hide('code2', 'code', 'qr');
  await LP('ci2', m2, '/api/lms/g/checkin', { session_id: sess[1], member_no: m2, method: 'code', code: code2 });
  /* 이메일 인증번호(어댑터) */
  const m3 = STU[2];
  await LP('mail', m3, '/api/lms/g/email-code', { purpose: 'checkin', ref: sess[1] });
  await LP('mailRate', m3, '/api/lms/g/email-code', { purpose: 'checkin', ref: sess[1] });
  await call(base, 'POST', '/api/lms/g/idv-mail-pull', { cookie: U.prof, body: {} }).then(r => (R.pullProf = r));
  await Po('pull', '/api/lms/g/idv-mail-pull', {}); const mcode = R.pull.j && R.pull.j.mails[0] && R.pull.j.mails[0].code; if (R.pull.j) R.pull.j.mails.forEach(x => { x.code = x.code ? '*' : x.code; });
  await Po('pull2', '/api/lms/g/idv-mail-pull', {});
  await LP('mailWrong', m3, '/api/lms/g/email-verify', { purpose: 'checkin', ref: sess[1], code: mcode === '000000' ? '111111' : '000000' });
  await LP('mailOk', m3, '/api/lms/g/email-verify', { purpose: 'checkin', ref: sess[1], code: mcode });
  await LP('ci3', m3, '/api/lms/g/checkin', { session_id: sess[1], member_no: m3, method: 'code', code: code2 });
  await Po('ruleEmail', '/api/lms/g/idv-rule', { section_id: S.sec, method: 'email' });
  await G('report', '/api/lms/g/idv-report?section_id=' + S.sec);
  await call(base, 'GET', '/api/lms/g/idv-report?section_id=' + S.sec2, { cookie: U.prof }).then(r => (R.reportScope = r));
  await call(base, 'GET', '/api/lms/g/idv', { cookie: ck }).then(r => (R.idvStaff = r));

  /* ── ③ 시험 본인 확인(인증 앱) ── */
  await Po('ex2', '/api/lms/f/exam-save', { section_id: S.sec, title: '본인 확인 시험', fixed: [qid], shuffle_q: false, status: 'published' });
  const ex2 = R.ex2.j.exam.exam_id;
  await Po('cfg2', '/api/lms/f/proctor-cfg', { exam_id: ex2, enabled: true, need_camera: false, idv: 'totp', snap_sec: 0 });
  await LP('start2', m2, '/api/lms/f/start', { exam_id: ex2 }); const at2 = R.start2.j.attempt.attempt_id;
  await LP('begin2NoIdv', m2, '/api/lms/f/proctor-begin', { attempt_id: at2, consent: true, checks: {} });
  await setSql(S.tid, 'update lms_totp set last_step = null where member_no = $1', [m2]);
  await LP('totpExam', m2, '/api/lms/g/totp-verify', { purpose: 'exam', ref: ex2, code: totp(sec, Math.floor(Date.now() / 30000)) });
  await LP('begin2Idv', m2, '/api/lms/f/proctor-begin', { attempt_id: at2, consent: true, checks: {} }); hide('begin2Idv', 'ptoken');
  await Po('cfgSb', '/api/lms/f/proctor-cfg', { exam_id: ex2, secure_browser: true });
  await LP('start3', STU[3], '/api/lms/f/start', { exam_id: ex2 });
  await LP('beginSb', STU[3], '/api/lms/f/proctor-begin', { attempt_id: R.start3.j.attempt.attempt_id, consent: true, checks: {} });
  await LP('waDel', m2, '/api/lms/g/wa-delete', { cred_id: b64u(credId) });
  await LP('waDel2', m2, '/api/lms/g/wa-delete', { cred_id: b64u(credId) });

  const ev = R.timeline.j ? R.timeline.j.events.map(e => e.kind) : [];
  P.push(
    [R.cfg0.j && R.cfg0.j.cfg.enabled === false && R.cfg0.j.limits.length >= 4, '감독 설정 기본값 · 웹 한계 안내'], [R.cfgBad.st === 400 && R.cfgBadSnap.st === 400, '감독 설정 검증'],
    [R.cfg.j && R.cfg.j.cfg.enabled === true && R.cfg.j.cfg.snap_sec === 30, '감독 켜기 · 사진 간격'], [R.cfgNoScope.st === 403, '담당 아닌 교수 403'],
    [R.info.j && /자동 파기/.test(R.info.j.consent) && R.info.j.keep_days === 30, '동의문 · 보존 기간'], [R.infoOther.st === 403, '미수강 403'],
    [R.ansNoBegin.st === 409 && R.ansNoBegin.j.error === 'proctor_begin', '감독 시작 전 답안 저장 막음'],
    [R.beginNoConsent.st === 400 && R.beginNoConsent.j.error === 'consent', '동의 없으면 시작 불가'], [R.beginNoCam.st === 409 && R.beginNoCam.j.error === 'device', '카메라 거부 시 시작 불가'],
    [R.begin.st === 200 && typeof tok === 'string' && tok.length >= 40, '감독 시작 · 토큰'], [R.ansTok.st === 200, '토큰으로 답안 저장'], [R.ansBadTok.st === 409 && R.ansBadTok.j.error === 'replaced', '다른 토큰 409'],
    [R.evBadKind.st === 400, '알 수 없는 사건 400'], [R.ev.j && R.ev.j.accepted === 4 && R.ev.j.risk === 27 && R.ev.j.flagged === true, '사건 4건 · 위험 점수 27 · 주의'],
    [R.snapId.j && R.snapId.j.faces === 1, '본인 확인 사진'], [R.snapRate.st === 429, '사진 간격 제한'], [R.snapNotJpg.st === 400, 'JPEG만'],
    [R.snapMulti.j && R.snapMulti.j.risk === 42, '얼굴 2개 → 위험 점수 +15'],
    [R.begin2.st === 200 && tok2 && tok2 !== tok, '두 번째 기기가 이어받음(kick)'], [R.ansOld.st === 409 && R.ansOld.j.error === 'replaced', '옛 화면 저장 불가'],
    [R.begin3.j && R.begin3.j.blocked === true, '막기 모드: 세 번째 기기 거부'], [R.submit.st === 200, '감독 토큰으로 제출'], [R.evAfter.j && R.evAfter.j.ended === true, '제출 뒤 사건은 종료 표시'],
    [R.review.j && R.review.j.summary.flagged === 1 && R.review.j.attempts[0].kinds.second_device === 1, '검토 목록 · 주의 1건 · 두 번째 기기'],
    [ev.includes('begin') && ev.includes('second_device') && ev.includes('blocked_device') && ev.includes('multi_face') && ev.includes('submit') && ev.includes('id_photo'), '타임라인 사건'],
    [R.timeline.j && R.timeline.j.snaps.length === 2, '타임라인 사진 2장'], [R.photo.j && R.photo.j.mime === 'image/jpeg' && R.photo.j.b64.length > 100, '사진 보기'], [R.photoLearner.st === 401 || R.photoLearner.st === 403, '학습자는 사진 못 봄'],
    [R.decideBad.st === 400 && R.decide.j && R.decide.j.decision === 'warn', '판정(사유 필수)'],
    [R.views.j && R.views.j.views.filter(v => v.what === 'photo').length === 1 && R.views.j.views.some(v => v.what === 'timeline'), '열람 기록'],
    [R.psetProf.st === 403 && R.psetBad.st === 400 && R.pset.j.keep_days === 7, '보존 일수(운영자만)'], [R.pset2.j && R.pset2.j.purged === 1, '보존 기간 지난 사진 파기'],
    [R.photoPurged.st === 410, '파기된 사진 410'], [R.timeline2.j && R.timeline2.j.snaps.filter(n => n.purged).length === 1, '파기 뒤 기록만 남음'],
    [R.ruleBad.st === 400 && R.rule.j.method === 'webauthn', '분반 확인 방식'], [R.ciNoIdv.st === 428 && R.ciNoIdv.j.error === 'idv_needed', '확인 없이 출석 428'],
    [R.waOptNoCred.st === 409, '패스키 없으면 확인 불가'], [R.waOpt.j && R.waOpt.j.rp_id === host && R.waOpt.j.exclude.length === 0, '등록 요청 · rp_id'],
    [R.regOrigin.j && R.regOrigin.j.error === 'wa_origin', 'origin 검사'], [R.regType.j && R.regType.j.error === 'wa_type', '종류 검사'], [R.regNoUv.j && R.regNoUv.j.error === 'wa_uv', '기기 잠금 확인 필수'],
    [R.regRp.j && R.regRp.j.error === 'wa_rp', 'rpId 검사'], [R.regKey.j && R.regKey.j.error === 'wa_key', '공개키 · 서명 방식 검사'], [R.regCh.j && R.regCh.j.error === 'wa_challenge', 'challenge 검사'], [R.regBadB64.st === 400, '형식 검사'],
    [R.reg.st === 200 && R.reg.j.cred.cred_id === b64u(credId), '패스키 등록(공개키만)'], [R.regAgain.st === 409, '같은 요청 재사용 409'],
    [R.idv1.j && R.idv1.j.passkeys.length === 1 && !JSON.stringify(R.idv1.j).includes(spki), '내 패스키 목록(공개키 노출 없음)'],
    [R.vaBadSig.st === 403 && R.vaBadSig.j.error === 'wa_sig', '남의 키 서명 403'], [R.va.j && R.va.j.ok === true && R.va.j.method === 'webauthn', '패스키 확인 → 표'],
    [R.ci.st === 200 && R.ci.j.evidence.idv === 'webauthn', '패스키 확인 출석'], [R.vaCounter.st === 403 && R.vaCounter.j.error === 'wa_counter', '서명 횟수 되돌림 403(복제 의심)'],
    [R.vaOther.j && R.vaOther.j.purpose === 'exam', '시험용 패스키 확인'], [R.ciNotEnr.st === 403, '미수강 확인 요청 403'],
    [R.totpNew.st === 200 && /^[A-Z2-7]{32}$/.test(sec || ''), '인증 앱 비밀키'], [R.totpPreExam.st === 409, '등록 확인 전 사용 불가'], [R.totpFmt.st === 400, '번호 형식'],
    [R.totpWrong.j && R.totpWrong.j.ok === false, '틀린 번호'], [R.totpOk.j && R.totpOk.j.confirmed === true, '인증 앱 등록 확인'], [R.totpReplay.j && R.totpReplay.j.ok === false, '같은 번호 재사용 막음'],
    [R.totpCheck.j && R.totpCheck.j.method === 'totp', '인증 앱 → 출석 표'], [R.totpAgain.st === 409, '재등록은 reset 필요'], [R.ci2.st === 200 && R.ci2.j.evidence.idv === 'totp', '인증 앱 확인 출석(any)'],
    [R.mail.j && R.mail.j.queued === true && !('code' in R.mail.j), '메일 대기열(번호 미노출)'], [R.mailRate.st === 429, '메일 1분 제한'], [R.pullProf.st === 403, '메일 가져가기 운영자만'],
    [/^\d{6}$/.test(mcode || ''), '게이트웨이가 번호를 가져감'], [R.pull2.j && R.pull2.j.mails.length === 0, '가져간 번호는 지움'], [R.mailWrong.j && R.mailWrong.j.ok === false, '틀린 메일 번호'],
    [R.mailOk.j && R.mailOk.j.method === 'email', '메일 확인 → 표'], [R.ci3.st === 200 && R.ci3.j.evidence.idv === 'email', '메일 확인 출석(any)'],
    [R.report.j && R.report.j.summary.n === 5 && R.report.j.summary.passkey === 1 && R.report.j.summary.totp === 1 && R.report.j.students.find(x => x.member_no === STU[2]).last_method === 'email', '분반 확인 현황'], [R.reportScope.st === 403, '남의 분반 현황 403'], [R.idvStaff.st === 401, '운영자 세션은 학습자 확인 화면 401'],
    [R.begin2NoIdv.st === 428 && R.begin2NoIdv.j.error === 'idv_needed', '시험 본인 확인 필요'], [R.totpExam.j && R.totpExam.j.ok === true, '시험용 인증 앱 표'], [R.begin2Idv.st === 200, '표로 감독 시작'],
    [R.beginSb.st === 428 && R.beginSb.j.error === 'secure_browser', '보안 브라우저 필수(어댑터)'], [R.waDel.j && R.waDel.j.deleted === 1 && R.waDel2.st === 404, '패스키 삭제']);
  return { R, P };
}
run('x3 시험 감독 · 본인 확인 대조', scenario, A, B, ['waOpt']).catch(e => { console.error(e); process.exit(1); });
