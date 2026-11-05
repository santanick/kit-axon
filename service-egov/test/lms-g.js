'use strict';
/* v30 묶음 G 대조 테스트 — 출결(인증번호 · 회전 QR · NFC · BLE · 사진 · 본인 재인증 · 수동 · 공결 · 장애 조정 · 연강 복사 · 휴보강 · 출석부 · 비정상 행동).
   Node 서버와 Java(전자정부) 서버에 같은 시나리오를 돌려 상태코드 · 오류 코드/문구 · 응답 본문(uuid · 시각 · 인증번호 · QR 정규화)을 비교한다.
   또 Node mod-g.js의 SQL과 Java 매퍼 lms_g.xml의 SQL이 글자 그대로 같은지 확인한다.
   사용: node test/lms-g.js http://127.0.0.1:<node> [http://127.0.0.1:<java>] (두 번째를 생략하면 Node만 돌리고 기대값만 확인) */
const L = require('./lms-w3lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8221', process.argv[3] || ''];

async function scenario(base, tag) {
  const R = {}; const call = L.caller(base);
  const ck = await L.signup(base, 'g' + tag);
  R.noAuth = await call('GET', '/api/lms/g/sections');
  R.csrf = await call('POST', '/api/lms/g/seed', { cookie: ck, body: {}, csrf: false });
  R.seed = await call('POST', '/api/lms/g/seed', { cookie: ck, body: {} });
  R.seed2 = await call('POST', '/api/lms/g/seed', { cookie: ck, body: {} });
  R.sections = await call('GET', '/api/lms/g/sections', { cookie: ck });
  const sec = R.seed.j.section_id;
  R.sessNo = await call('GET', '/api/lms/g/sessions', { cookie: ck });
  R.sessBad = await call('GET', '/api/lms/g/sessions?section_id=xyz', { cookie: ck });
  R.sessions = await call('GET', '/api/lms/g/sessions?section_id=' + sec, { cookie: ck });
  const S = (w, q = 1) => R.sessions.j.find(x => x.week_no === w && x.seq === q).session_id;
  const ago = m => new Date(Date.now() - m * 60000).toISOString();
  R.set1 = await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(1), starts_at: ago(2), room: '공학관 301' } });
  R.set2 = await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(2), starts_at: ago(15) } });
  R.set3 = await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(3), starts_at: ago(40) } });
  R.set4 = await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(4), starts_at: ago(-60) } });
  R.setBad = await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(4), starts_at: '어제' } });
  R.setNf = await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: '00000000-0000-0000-0000-000000000000', note: 'x' } });
  R.codeTtl = await call('POST', '/api/lms/g/code', { cookie: ck, body: { session_id: S(1), ttl_sec: 5 } });
  R.code = await call('POST', '/api/lms/g/code', { cookie: ck, body: { session_id: S(1), ttl_sec: 300, rotate_sec: 30 } });
  const code = R.code.j.code;
  const ci = (b) => call('POST', '/api/lms/g/checkin', { cookie: ck, body: { session_id: S(1), ...b } });
  R.ciWrong = await ci({ member_no: '20269001', method: 'code', code: code === '000000' ? '111111' : '000000' });
  R.ciCode = await ci({ member_no: '20269001', method: 'code', code });
  R.ciDup = await ci({ member_no: '20269001', method: 'code', code });
  R.ciAudit = await ci({ member_no: '20269009', method: 'code', code });
  R.ciNone = await ci({ member_no: '99999999', method: 'code', code });
  R.ciMethod = await ci({ member_no: '20269002', method: 'otp', code });
  R.qr = await call('GET', '/api/lms/g/qr?session_id=' + S(1), { cookie: ck });
  R.ciQrBad = await ci({ member_no: '20269002', method: 'qr', qr: 'DDATT1.x.1.abc' });
  R.ciQr = await ci({ member_no: '20269002', method: 'qr', qr: R.qr.j.qr });
  R.ciTagBad = await ci({ member_no: '20269003', method: 'ble', tag_id: 'NFC-ENG301' });
  R.ciNfc = await ci({ member_no: '20269003', method: 'nfc', tag_id: 'NFC-ENG301' });
  R.ciGeo0 = await ci({ member_no: '20269004', method: 'photo' });
  R.ciGeoBad = await ci({ member_no: '20269004', method: 'photo', lat: 123, lng: 1 });
  R.ciPhoto = await ci({ member_no: '20269004', method: 'photo', lat: 35.1595454, lng: 126.8526012, taken_at: '2026-11-06T09:01:00+09:00' });
  R.code2 = await call('POST', '/api/lms/g/code', { cookie: ck, body: { session_id: S(2) } });
  R.ciLate = await call('POST', '/api/lms/g/checkin', { cookie: ck, body: { session_id: S(2), member_no: '20269001', method: 'code', code: R.code2.j.code } });
  R.code3 = await call('POST', '/api/lms/g/code', { cookie: ck, body: { session_id: S(3) } });
  R.ciClosed = await call('POST', '/api/lms/g/checkin', { cookie: ck, body: { session_id: S(3), member_no: '20269001', method: 'code', code: R.code3.j.code } });
  R.ciNotOpen = await call('POST', '/api/lms/g/checkin', { cookie: ck, body: { session_id: S(4), member_no: '20269001', method: 'nfc', tag_id: 'NFC-ENG301' } });
  R.ruleGet = await call('GET', '/api/lms/g/rule?section_id=' + sec, { cookie: ck });
  R.ruleSet = await call('POST', '/api/lms/g/rule', { cookie: ck, body: { section_id: sec, methods: ['code', 'qr', 'photo', 'manual', 'online', 'hack'], require_identity: true, late_after_min: 10, online_min_pct: 80 } });
  R.ruleBad = await call('POST', '/api/lms/g/rule', { cookie: ck, body: { section_id: sec, online_min_pct: 5 } });
  R.ciIdv = await call('POST', '/api/lms/g/checkin', { cookie: ck, body: { session_id: S(2), member_no: '20269002', method: 'code', code: R.code2.j.code } });
  R.ciIdvOk = await call('POST', '/api/lms/g/checkin', { cookie: ck, body: { session_id: S(2), member_no: '20269002', method: 'code', code: R.code2.j.code, idv: 'sso-demo-token' } });
  R.ciNfcOff = await call('POST', '/api/lms/g/checkin', { cookie: ck, body: { session_id: S(2), member_no: '20269003', method: 'nfc', tag_id: 'NFC-ENG301', idv: 'x' } });
  R.markNoReason = await call('POST', '/api/lms/g/mark', { cookie: ck, body: { session_id: S(1), member_no: '20269005', status: 'excused' } });
  R.markEx = await call('POST', '/api/lms/g/mark', { cookie: ck, body: { session_id: S(1), member_no: '20269005', status: 'excused', reason: '병결(진단서)', evidence_ref: 'file:evid-001' } });
  R.markAudit = await call('POST', '/api/lms/g/mark', { cookie: ck, body: { session_id: S(1), member_no: '20269009', status: 'present' } });
  R.markBad = await call('POST', '/api/lms/g/mark', { cookie: ck, body: { session_id: S(1), member_no: '20269006', status: 'gone' } });
  R.adjust = await call('POST', '/api/lms/g/adjust', { cookie: ck, body: { session_id: S(1), from: 'absent', to: 'present', reason: '인증 서버 장애(10:02~10:10)' } });
  R.adjustNoReason = await call('POST', '/api/lms/g/adjust', { cookie: ck, body: { session_id: S(1), from: 'absent', to: 'present' } });
  R.log = await call('GET', '/api/lms/g/log?session_id=' + S(1), { cookie: ck });
  for (const m of ['20269001', '20269002', '20269003']) await call('POST', '/api/lms/g/mark', { cookie: ck, body: { session_id: S(10), member_no: m, status: m === '20269003' ? 'late' : 'present' } });
  R.copy = await call('POST', '/api/lms/g/copy', { cookie: ck, body: { session_id: S(10) } });
  R.copyNone = await call('POST', '/api/lms/g/copy', { cookie: ck, body: { session_id: S(11) } });
  R.holiday = await call('POST', '/api/lms/g/session', { cookie: ck, body: { session_id: S(5), kind: 'holiday', note: '개교기념일' } });
  R.codeHoliday = await call('POST', '/api/lms/g/code', { cookie: ck, body: { session_id: S(5) } });
  R.makeup = await call('POST', '/api/lms/g/makeup', { cookie: ck, body: { session_id: S(5), starts_at: '2026-10-10T10:00:00+09:00', room: '공학관 205' } });
  R.online = await call('POST', '/api/lms/g/online', { cookie: ck, body: { section_id: sec } });
  R.roster = await call('GET', '/api/lms/g/roster?section_id=' + sec, { cookie: ck });
  R.export = await call('GET', '/api/lms/g/export?section_id=' + sec, { cookie: ck });
  R.beacons = await call('GET', '/api/lms/g/beacons', { cookie: ck });
  R.beacon = await call('POST', '/api/lms/g/beacon', { cookie: ck, body: { beacon_id: 'BLE-HUM101', kind: 'ble', room: '인문관 101' } });
  R.beaconBad = await call('POST', '/api/lms/g/beacon', { cookie: ck, body: { beacon_id: 'X1', kind: 'wifi', room: 'a' } });
  R.anomalies = await call('GET', '/api/lms/g/anomalies?section_id=' + sec, { cookie: ck });
  R.rosterNf = await call('GET', '/api/lms/g/roster?section_id=00000000-0000-0000-0000-000000000000', { cookie: ck });
  return R;
}

const EXPECT = { noAuth: 401, csrf: 403, seed: 200, sessNo: 400, sessBad: 400, set1: 200, setBad: 400, setNf: 404, codeTtl: 400, code: 200, ciWrong: 400, ciCode: 200, ciDup: 409, ciAudit: 403, ciNone: 403, ciMethod: 400,
  qr: 200, ciQrBad: 400, ciQr: 200, ciTagBad: 400, ciNfc: 200, ciGeo0: 400, ciGeoBad: 400, ciPhoto: 200, ciLate: 200, ciClosed: 409, ciNotOpen: 409, ruleSet: 200, ruleBad: 400, ciIdv: 428, ciIdvOk: 200, ciNfcOff: 403,
  markNoReason: 400, markEx: 200, markAudit: 403, markBad: 400, adjust: 200, adjustNoReason: 400, log: 200, copy: 200, copyNone: 404, holiday: 200, codeHoliday: 409, makeup: 200, online: 200, roster: 200, export: 200,
  beacons: 200, beacon: 200, beaconBad: 400, anomalies: 200, rosterNf: 404 };
function checks(R, ok) {
  ok(R.ciCode.j && R.ciCode.j.status === 'present' && R.ciCode.j.method === 'code', 'code → present');
  ok(R.ciLate.j && R.ciLate.j.status === 'late', '15분 지각');
  ok(R.ciPhoto.j && R.ciPhoto.j.evidence.lat === 35.15955 && !('photo' in R.ciPhoto.j.evidence), '사진: 위치만 저장(5자리)');
  ok(R.ciIdvOk.j && R.ciIdvOk.j.evidence.idv === 'sso_pending', '재인증 증적');
  ok(R.adjust.j && R.adjust.j.changed === 3, '장애 조정 3명 ' + JSON.stringify(R.adjust.j));
  ok(R.copy.j && R.copy.j.copied === 3 && R.copy.j.seq === 2, '연강 복사 3명');
  ok(R.ruleSet.j && JSON.stringify(R.ruleSet.j.methods) === '["code","manual","online","photo","qr"]', '허용 방식 필터');
  ok(R.roster.j && R.roster.j.students.length === 8 && R.roster.j.audit_excluded === 1, '청강생 제외 8명');
  ok(R.export.j && R.export.j.rows.length === 8 && R.export.j.rows[0][2] === '○' && R.export.j.columns.length === R.export.j.rows[0].length, '출석부 양식');
  ok(R.makeup.j && R.makeup.j.seq === 2 && R.makeup.j.makeup_of, '보강 차시');
  ok(/^\d{6}$/.test(R.code.j.code) && /^DDATT1\./.test(R.qr.j.qr), '코드 · QR 형식');
}

L.run({ name: 'G', A, B, scenario, EXPECT, checks, bundle: 'g' });
