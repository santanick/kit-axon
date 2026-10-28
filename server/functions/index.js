/* KIT AX ON — Cloud Functions (Firebase, 2nd gen, 서울 리전)
 * 저장 원칙: 학번 · 학과 · 학습 기록만 저장. 접근코드 · 비밀번호는 원문 없이 해시만 저장.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
setGlobalOptions({ region: 'asia-northeast3', maxInstances: 20 });
const db = admin.firestore();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const norm = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const validSid = (s) => /^\d{6,12}$/.test(String(s || ''));
const pwOk = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const eq = (a, b) => a && b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const pwHash = (pw, salt) => crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
const LOCK_MAX = 8, LOCK_MS = 15 * 60 * 1000;
function newCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const r = crypto.randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) { s += A[r[i] % A.length]; if (i === 3) s += '-'; } return s; }
const codeHash = (sid, code) => sha('code:' + sid + ':' + norm(code));

async function requireAdmin(req) {
  const email = req.auth && req.auth.token && req.auth.token.email;
  if (!email || !req.auth.token.email_verified) throw new HttpsError('permission-denied', '관리자 로그인이 필요합니다.');
  const d = await db.doc('admins/' + email.toLowerCase()).get();
  if (!d.exists) throw new HttpsError('permission-denied', '관리자로 등록되지 않은 계정입니다.');
  return email;
}
async function guard(ref, st) {
  if (st.lockUntil && st.lockUntil > Date.now()) throw new HttpsError('resource-exhausted', '시도 횟수를 넘었습니다. 15분 뒤 다시 시도해 주세요.');
}
async function fail(ref, st, msg) {
  const n = (st.fails || 0) + 1;
  await ref.update(n >= LOCK_MAX ? { fails: 0, lockUntil: Date.now() + LOCK_MS } : { fails: n });
  throw new HttpsError('unauthenticated', msg);
}
async function token(sid, dept) { return admin.auth().createCustomToken('s_' + sid, { role: 'student', sid, dept }); }

/* 학생: 학번 + 접근코드 → 비밀번호 설정 */
exports.activateStudent = onCall(async (req) => {
  const { sid, code, password } = req.data || {};
  if (!validSid(sid)) throw new HttpsError('invalid-argument', '학번 형식을 확인해 주세요.');
  const ref = db.doc('students/' + sid); const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', '등록되지 않은 학번입니다. 학과 사무실에 등록을 요청해 주세요.');
  const st = snap.data(); await guard(ref, st);
  if (st.status === 'active') throw new HttpsError('already-exists', '이미 비밀번호를 설정한 학번입니다. 로그인해 주세요.');
  if (!eq(codeHash(sid, code), st.codeHash)) await fail(ref, st, '접근코드가 맞지 않습니다.');
  if (!pwOk(password)) throw new HttpsError('invalid-argument', '비밀번호는 영문과 숫자를 섞어 8자 이상으로 정해 주세요.');
  const salt = crypto.randomBytes(16).toString('hex');
  await ref.update({ status: 'active', pwHash: pwHash(password, salt), salt, activatedAt: Date.now(), lastSeen: Date.now(), codeHash: admin.firestore.FieldValue.delete(), fails: 0, lockUntil: 0 });
  return { token: await token(sid, st.dept), dept: st.dept };
});

/* 학생: 학번 + 비밀번호 로그인 */
exports.studentLogin = onCall(async (req) => {
  const { sid, password } = req.data || {};
  if (!validSid(sid)) throw new HttpsError('invalid-argument', '학번 형식을 확인해 주세요.');
  const ref = db.doc('students/' + sid); const snap = await ref.get();
  if (!snap.exists || snap.data().status !== 'active') throw new HttpsError('failed-precondition', '처음 이용하는 학번이면 [처음 이용]에서 접근코드로 비밀번호를 먼저 설정해 주세요.');
  const st = snap.data(); await guard(ref, st);
  if (!eq(pwHash(String(password || ''), st.salt), st.pwHash)) await fail(ref, st, '비밀번호가 맞지 않습니다.');
  await ref.update({ lastSeen: Date.now(), fails: 0 });
  return { token: await token(sid, st.dept), dept: st.dept };
});

/* 관리자 */
exports.whoAmI = onCall(async (req) => { try { await requireAdmin(req); return { admin: true }; } catch (e) { return { admin: false }; } });

exports.registerStudents = onCall(async (req) => {
  const by = await requireAdmin(req);
  const rows = (req.data && req.data.rows) || []; if (rows.length > 3000) throw new HttpsError('invalid-argument', '한 번에 3,000명까지 등록할 수 있습니다.');
  const results = []; let batch = db.batch(), n = 0;
  for (const r of rows) {
    if (!validSid(r.sid) || !r.dept) { results.push({ sid: r.sid, dept: r.dept, error: '형식 오류' }); continue; }
    const ref = db.doc('students/' + r.sid); const ex = await ref.get();
    if (ex.exists && ex.data().status === 'active') { results.push({ sid: r.sid, dept: ex.data().dept, error: '이미 활성화됨(코드 재발급은 학습자 상세에서)' }); continue; }
    const code = newCode();
    batch.set(ref, { sid: r.sid, dept: String(r.dept).slice(0, 40), status: 'invited', codeHash: codeHash(r.sid, code), invitedAt: Date.now(), invitedBy: by }, { merge: true });
    results.push({ sid: r.sid, dept: r.dept, code });
    if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  await batch.commit();
  return { results };
});

exports.reissueCode = onCall(async (req) => {
  await requireAdmin(req); const sid = req.data && req.data.sid;
  const ref = db.doc('students/' + sid); if (!(await ref.get()).exists) throw new HttpsError('not-found', '없는 학번입니다.');
  const code = newCode();
  await ref.update({ status: 'invited', codeHash: codeHash(sid, code), pwHash: admin.firestore.FieldValue.delete(), salt: admin.firestore.FieldValue.delete(), invitedAt: Date.now(), fails: 0, lockUntil: 0 });
  try { await admin.auth().revokeRefreshTokens('s_' + sid); } catch (e) {}
  return { code };
});

exports.reviewSubmission = onCall(async (req) => {
  const by = await requireAdmin(req); const { sid, n, decision, note } = req.data || {};
  if (![1, 2, 3].includes(n)) throw new HttpsError('invalid-argument', '단계 오류');
  const p = await db.doc('progress/' + sid).get(); const L = p.exists && p.data().p && p.data().p.lv && p.data().p.lv[n];
  if (!L || !L.sub) throw new HttpsError('failed-precondition', '제출 기록이 없습니다.');
  const t = new Date(Date.now() + 9 * 3600e3); const stamp = t.toISOString().slice(0, 16).replace('T', ' ').replace(/-/g, '.');
  const lv = decision === 'approve'
    ? { review: 'approved', reviewAt: stamp, badge: true, badgeAt: stamp, badgeId: 'KIT-AX-' + n + '-' + String(sid).slice(-4) + crypto.randomInt(10, 99), reviewNote: '' }
    : { review: 'returned', reviewAt: stamp, badge: false, reviewNote: String(note || '').slice(0, 300) };
  await db.doc('approvals/' + sid).set({ lv: { [n]: lv }, updatedAt: Date.now() }, { merge: true });
  await db.collection('reviewLog').add({ sid, n, decision, note: lv.reviewNote || '', by, at: Date.now() });
  return { lv };
});

/* 학습자 목록 (운영 초기 1만 명 규모 — 관리자 화면 진입 시 1회 조회) */
exports.adminListStudents = onCall({ memory: '1GiB', timeoutSeconds: 120 }, async (req) => {
  await requireAdmin(req);
  const [st, pr, ap] = await Promise.all([db.collection('students').select('sid', 'dept', 'status', 'invitedAt', 'activatedAt', 'lastSeen').get(), db.collection('progress').get(), db.collection('approvals').get()]);
  const P = {}, A = {}; pr.forEach((d) => { P[d.id] = d.data(); }); ap.forEach((d) => { A[d.id] = d.data().lv || {}; });
  const students = st.docs.map((d) => {
    const s = d.data(), pp = P[d.id] || {}, prog = pp.p || null;
    if (prog) { prog.lv = prog.lv || {}; [1, 2, 3].forEach((n) => { const a = A[d.id] && A[d.id][n]; const L = prog.lv[n] || {}; prog.lv[n] = a ? Object.assign({}, L, a, a.review === 'returned' ? { sub: '' } : {}) : Object.assign({}, L, { badge: false, review: L.review === 'approved' ? 'pending' : L.review }); }); }
    const upd = pp.updatedAt && pp.updatedAt.toMillis ? pp.updatedAt.toMillis() : 0;
    return { sid: d.id, dept: s.dept, status: s.status, invitedAt: s.invitedAt || 0, activatedAt: s.activatedAt || 0, lastSeen: Math.max(s.lastSeen || 0, upd), progress: prog };
  });
  return { students };
});

/* AI 행정 비서 — 집계 지표와 학번 단위 기록만 전달(개인정보 없음) */
exports.adminAssistant = onCall({ secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60 }, async (req) => {
  await requireAdmin(req);
  const { question, context } = req.data || {};
  const system = '당신은 경남정보대학교 KIT AX ON 온라인 센터의 행정 비서입니다. 담당 선생님이 학습자 진도 · 배지 검수 · KPI를 관리하도록 돕습니다. ' +
    '주어진 JSON 데이터(kpi: 전체 지표, depts: [학과, 등록, 가입률%, 평균진도%, 배지 수, 검수대기, 14일 미접속], targets: KPI 목표, student: 특정 학번 기록)만 근거로 답하고, 없는 수치는 만들지 마십시오. ' +
    '문어체 · 격식체로 간결하게 쓰고, 보고서 · 공지 초안을 요청하면 바로 쓸 수 있는 완성 문안을 주십시오. 학생 연락처는 저장하지 않으므로 공지는 학과 사무실 · 학교 공지 경로로 안내하도록 쓰십시오.';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY.value(), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 1500, system, messages: [{ role: 'user', content: '데이터:\n' + JSON.stringify(context).slice(0, 60000) + '\n\n질문: ' + String(question || '').slice(0, 2000) }] })
  });
  if (!r.ok) throw new HttpsError('internal', 'AI 응답 오류 ' + r.status);
  const j = await r.json();
  return { answer: (j.content || []).map((c) => c.text || '').join('') };
});
