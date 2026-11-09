/* v22 mem2 — 회원 · 계정(W6): 레거시 디디쌤 가이드 보완
   계정 모드(S.settings.acct) · 추가 질문 6(텍스트/파일/선택 · 필수 · 답변 잠금) · 승인/거절/준회원 승격 · 상세검색 · 선택 메시지
   팀 상세(이름 중복 금지 · 생성일 · 팀원 추가/빼기) · 초대(고정 토큰 · 재생성 · 공유 · 연락처/이메일/수동 계정) · 일괄 가입(검사 후 등록)
   보호자 연결(이름 · 연락처 입력 · 상태 칩 · 해제) · 운영자(회원 검색 추가 · 강사 담당 클래스 · 기관 담당자) · 기관 관리(LMS)
   시작 가이드 유형별 단계 · 학습자 → 운영자 큐(LPX) 처리 · 학습자 스냅샷(acct) */
'use strict';
const MB_SOC = [['kakao', '카카오'], ['naver', '네이버'], ['google', '구글'], ['apple', '애플'], ['facebook', '페이스북']];
const MB_LOGIN = { email: '이메일', code: '접근코드', kakao: '카카오', naver: '네이버', google: '구글', apple: '애플', facebook: '페이스북' };
const MB_QT = { text: '짧은 답', choice: '하나 고르기', multi: '여러 개 고르기', date: '날짜', consent: '동의 체크', file: '파일 첨부' }; /* v36 유형 확장(가입 추가 질문 편집기) */
/* v36 기관 유형별 노출: 보호자 연결은 학원(초중고)만, 결제 · 수납은 유료 운영 유형만(설정 › 서비스에서 바꿀 수 있음). 끄더라도 데이터는 지우지 않는다 */
const MB_GUARD_T = ['k12'];
const MB_PAY_DEF = { k12: true, adult: true, lifelong: true, voc: true, univ: false, corp: false, public: false };
const mbGuardOn = () => MB_GUARD_T.includes(S?.org?.type);
const mbPayOn = () => { const v = S?.settings?.payOn; return typeof v === 'boolean' ? v : MB_PAY_DEF[S?.org?.type] !== false; };
window.mbGuardOn = mbGuardOn; window.mbPayOn = mbPayOn;
/* 데모 해시(학습자 lacct.js와 같은 함수) — 운영: 서버에서 bcrypt/argon2 */
const mbHash = s => { let a = 0x811c9dc5, b = 0x9e3779b1; for (const ch of String(s)) { const c = ch.codePointAt(0); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ (c + a), 2654435761) >>> 0; } return a.toString(36) + b.toString(36); };
const mbPw = (id, pw) => 'h1:' + mbHash('didisam|' + String(id).toLowerCase() + '|' + pw);
const mbSid = email => 'u' + mbHash('sid|' + String(email).toLowerCase()).slice(0, 12);
const MB_PW_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[~!@#$%^&*])[A-Za-z\d~!@#$%^&*]{8,20}$/;
const MB_NICK_RE = /^[가-힣A-Za-z0-9_-]{2,20}$/;
const MB_PHONE_RE = /^01\d-?\d{3,4}-?\d{4}$/;
const MB_MAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const mbUniv = () => S?.org?.type === 'univ';
const mbPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : String(p || ''); };
const mbTok = () => { const a = new Uint8Array(9); crypto.getRandomValues(a); return [...a].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 14); };
const mbLURL = () => (typeof lsLearnerURL === 'function' ? lsLearnerURL() : location.origin + location.pathname.replace(/[^/]*$/, '') + 'learner.html?t=' + encodeURIComponent((typeof DREG !== 'undefined' && DREG.cur()) || ''));

/* ═════════ 데이터 보정 ═════════ */
function mbEnsure() {
  if (!S || !S.org || !S.settings) return; const st = S.settings; const ty = S.org.type;
  if (!st.acct) { const j = st.join || '자동 수락';
    st.acct = { mode: ty === 'univ' ? 'code' : j === '운영자 초대만' ? 'invite' : 'open', social: ty === 'univ' ? [] : MB_SOC.map(x => x[0]), extraQ: [], approve: j === '운영자 수락' ? 'manual' : 'auto', verify: ty !== 'univ', under14: !['corp', 'univ', 'public'].includes(ty), editAns: false, parent: ty === 'k12' || ty === 'lifelong' }; }
  const A = st.acct; if (!Array.isArray(A.extraQ)) A.extraQ = []; if (!Array.isArray(A.social)) A.social = [];
  (st.extraQ || []).forEach(q => { if (q && !A.extraQ.some(x => x.q === q) && A.extraQ.length < 6) A.extraQ.push({ q, type: 'text', req: false, opts: [] }); });
  A.extraQ = A.extraQ.slice(0, 6); st.extraQ = A.extraQ.map(x => x.q);
  ['invites', 'pacct', 'acctInq', 'inviteSent'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
  if (!S.inbox || typeof S.inbox !== 'object') S.inbox = {};
  (S.parents || []).forEach(p => { if (p.status === '연결 대기 중') p.status = '연결 요청'; if (!p.by) p.by = 'admin'; });
  (S.groups || []).forEach(g => { if (!g.at) g.at = S.org.created || S.org.empty || today(); });
  (S.orgs || []).forEach(o => { if (!Array.isArray(o.entries)) o.entries = []; });
  (S.admins || []).forEach(a => { if (!Array.isArray(a.classes)) a.classes = []; });
  if (!S.invites.some(i => i.target === 'student' && i.active && !i.cls)) S.invites.push({ id: uid('iv'), token: mbTok(), target: 'student', cls: '', uses: 0, active: true, at: today() });
}
function mbJoinSync() { const A = S.settings.acct; if (A.mode === 'invite') S.settings.join = '운영자 초대만'; else if (A.mode === 'open') S.settings.join = A.approve === 'manual' ? '운영자 수락' : '자동 수락'; S.settings.extraQ = A.extraQ.map(x => x.q); }
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { mbEnsure(); if (mbUnivFix()) { mbJoinSync(); save(); } } catch (e) { console.error(e); } return r; }; }
const mbInbox = (key, title, body, extra = {}) => { if (!key) return; S.inbox[key] = S.inbox[key] || []; S.inbox[key].unshift({ id: uid('n'), at: nowStr(), title: String(title).slice(0, 80), body: String(body || '').slice(0, 1000), read: false, ...extra }); S.inbox[key] = S.inbox[key].slice(0, 200); };
const mbParSync = mid => { const m = M(mid); if (m) m.parents = S.parents.filter(p => p.child === mid && p.status === '연결 완료').map(p => p.id); };
const mbTeacher = () => S.me && S.me.role === 'teacher' ? (S.admins.find(a => a.role === 'teacher' && a.name === S.me.name) || S.admins.find(a => a.role === 'teacher') || null) : null;
const mbAnsLocked = q => S.members.some(m => m.extra && m.extra[q] != null && m.extra[q] !== '');
const mbAns = v => v && typeof v === 'object' ? (v.file ? `📎 ${esc(v.file.name)} <small class="mini">${Math.round((v.file.size || 0) / 1024)}KB</small>` : esc(JSON.stringify(v))) : esc(v ?? '');

/* ═════════ 가입 · 계정 설정 ═════════ */
function mbAcctSummary() { const A = S.settings.acct; return `${esc(MB_MODE()[A.mode])}${A.mode === 'open' ? ` · ${A.approve === 'manual' ? '운영자 승인' : '자동 승인'}` : ''}${A.social.length ? ` · SNS ${A.social.length}종` : ''} · 추가 질문 ${A.extraQ.length}개`; }
const MB_MODE = () => mbUniv() ? { open: '학번 가입(학번 · 학과 · 비밀번호)', code: '접근코드 로그인(기관이 학번 · 코드 발급)' } : { open: '누구나 가입', invite: '초대받은 회원만(초대 링크 · 이메일 · 연락처)', code: '접근코드 로그인(기관이 번호 · 코드 발급)' };
/* v33 대학(univ · univ_lms)은 개인정보 최소 수집 원칙상 학번 · 학과 · 접근코드 방식만(QA #54) */
const MB_UNIV_NOTE = '대학은 개인정보 최소 수집 원칙에 따라 학번 · 학과 · 접근코드 방식만 쓸 수 있습니다(이메일 · 연락처 초대는 제공하지 않습니다).';
function mbUnivFix() { if (!mbUniv() || !S.settings) return false; let ch = false; const A = S.settings.acct; if (A) { if (A.mode === 'invite' || !['open', 'code'].includes(A.mode)) { A.mode = 'code'; ch = true; } if (A.social && A.social.length) { A.social = []; ch = true; } }
  if (S.settings.join === '운영자 초대만') { S.settings.join = '운영자 수락'; ch = true; } return ch; }
ACT['mb-acct'] = () => { mbEnsure(); const A = S.settings.acct; const U = mbUniv();
  modal('가입 · 계정 설정', `<p class="mini">학습자 사이트의 회원가입 · 로그인 방식입니다. 저장하면 바로 반영되고, 학습자 사이트를 다시 게시하면 게시본에도 들어갑니다.${U ? ' 대학 유형은 이름 · 연락처 · 이메일을 받지 않고 학번 · 학과만 저장합니다.' : ''}</p>
    <div class="fl"><span>가입 방식</span>${U ? `<small class="mini" id="mbUnivNote">${MB_UNIV_NOTE}</small>` : ''}<div class="mb-radios">${Object.entries(MB_MODE()).map(([k, l]) => `<label class="ckl"><input type="radio" name="mode" value="${k}" ${A.mode === k ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div></div>
    <div class="fl"><span>가입 승인(누구나 가입일 때)</span><div class="mb-radios"><label class="ckl"><input type="radio" name="approve" value="auto" ${A.approve !== 'manual' ? 'checked' : ''}> 자동 승인 — 가입 즉시 이용</label><label class="ckl"><input type="radio" name="approve" value="manual" ${A.approve === 'manual' ? 'checked' : ''}> 운영자 승인 — 승인 전에는 이용 불가</label></div><small class="mini">${U ? '접근코드로 로그인한 학생은 승인 없이 바로 이용합니다.' : '초대 링크 · 이메일 초대로 가입하면 승인 없이 바로 가입됩니다.'}</small></div>
    ${U ? '' : `<div class="fl"><span>SNS 간편 가입 · 로그인</span><div class="mb-radios">${MB_SOC.map(([k, l]) => `<label class="ckl"><input type="checkbox" name="soc_${k}" ${A.social.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div><small class="mini">이메일 가입은 항상 제공합니다. SNS 가입자는 비밀번호를 만들지 않습니다(데모: 모의 로그인 · 운영: OAuth 연동).</small></div>
    <label class="ckl"><input type="checkbox" name="verify" ${A.verify ? 'checked' : ''}> 휴대폰 본인인증을 마쳐야 정회원(미인증 · 일괄 가입은 준회원)</label>
    <label class="ckl"><input type="checkbox" name="under14" ${A.under14 ? 'checked' : ''}> 만 14세 미만 가입 허용(법정대리인 인증 · 동의)</label>
    ${mbGuardOn() ? `<label class="ckl"><input type="checkbox" name="parent" ${A.parent ? 'checked' : ''}> 보호자 계정 가입 · 가족 연결 사용</label>` : ''}`}
    <label class="ckl"><input type="checkbox" name="editAns" ${A.editAns ? 'checked' : ''}> 학습자가 마이페이지에서 추가 질문 답변을 확인 · 수정할 수 있음</label>
    <div class="bar2"><button type="button" class="btn sm" data-act="mem-q">추가 질문 설정 (${A.extraQ.length}/6)</button><button type="button" class="btn sm ghost" data-act="mem-invite">초대 링크</button></div>`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const g = n => (w.querySelector(`[name="${n}"]:checked`) || {}).value;
    A.mode = g('mode') || A.mode; if (U && !MB_MODE()[A.mode]) A.mode = 'code'; A.approve = g('approve') || 'auto'; if (!U) { A.social = MB_SOC.map(x => x[0]).filter(k => fv(w, 'soc_' + k)); A.verify = !!fv(w, 'verify'); A.under14 = !!fv(w, 'under14'); if (w.querySelector('[name=parent]')) A.parent = !!fv(w, 'parent'); } A.editAns = !!fv(w, 'editAns');
    mbJoinSync(); logAudit(`가입 · 계정 설정 — ${MB_MODE()[A.mode]}`); save(); render(); toast('가입 · 계정 설정을 저장했습니다.', 'ok'); } }]); };
{ const base = ACT.st; ACT.st = el => { if (el.dataset.k === 'join' && el.value === '운영자 초대만' && mbUniv()) { toast(MB_UNIV_NOTE, 'warn'); render(); return; } base(el); if (el.dataset.k !== 'join' || !S.settings.acct) return; const v = el.value, A = S.settings.acct; if (v === '운영자 초대만') A.mode = 'invite'; else { if (A.mode === 'invite') A.mode = 'open'; A.approve = v === '운영자 수락' ? 'manual' : 'auto'; } save(); }; }
{ const base = VIEWS.settings; VIEWS.settings = () => { const h = base(); if ((UI.settings || 'menu') !== 'service') return h; mbEnsure();
  return h + `<div class="card mb-card"><div class="ch"><b>회원가입 · 로그인</b><small>${mbAcctSummary()}</small><span class="sp"></span><button class="btn sm pri" data-act="mb-acct">가입 · 계정 설정</button></div><p class="mini">추가 질문(최대 6개 · 파일 첨부 · 필수), 초대 링크(재생성 시 이전 링크 무효), 본인인증 · 만 14세 미만 · 보호자 계정을 여기서 정합니다.</p></div>`; }; }

/* 추가 질문(최대 6개) — 질문별 유형 · 필수 · 선택지, 답변이 제출된 질문은 잠금 */
ACT['mem-q'] = () => { mbEnsure(); const A = S.settings.acct; const U = mbUniv();
  const row = i => { const x = A.extraQ[i] || { q: '', type: 'text', req: false, opts: [] }; const lock = x.q && mbAnsLocked(x.q);
    return `<div class="mb-qrow ${lock ? 'lock' : ''}"><b>${i + 1}</b><input name="q${i}" maxlength="20" value="${esc(x.q)}" placeholder="질문 ${i + 1}" ${lock ? 'readonly' : ''}><select name="t${i}" ${lock ? 'disabled' : ''}>${Object.entries(MB_QT).map(([k, l]) => `<option value="${k}" ${x.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select><label class="ckl"><input type="checkbox" name="r${i}" ${x.req ? 'checked' : ''} ${lock ? 'disabled' : ''}> 필수</label><input name="o${i}" maxlength="120" value="${esc((x.opts || []).join(', '))}" placeholder="선택지(쉼표 구분 · 선택형만)" ${lock ? 'readonly' : ''}>${lock ? tag('답변 있음 · 변경 불가', 'y') : ''}</div>`; };
  modal('추가 질문 설정', `<p class="mini">가입할 때 받는 추가 정보입니다. 최대 6개 · 질문별로 텍스트 / 파일 첨부 / 선택형과 필수 여부를 정합니다. 이미 답변이 제출된 질문은 바꿀 수 없습니다(삭제도 불가).${U ? ' 대학 유형은 개인정보 최소화를 위해 학번 · 학과 외 이름 · 연락처 · 이메일 질문을 받을 수 없습니다.' : ''}</p>${Array.from({ length: 6 }, (_, i) => row(i)).join('')}<label class="ckl"><input type="checkbox" name="editAns" ${A.editAns ? 'checked' : ''}> 학습자가 마이페이지에서 제출한 답변을 확인 · 수정할 수 있음</label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const out = []; let err = '';
      for (let i = 0; i < 6; i++) { const old = A.extraQ[i]; const q = fv(w, 'q' + i); if (old && old.q && mbAnsLocked(old.q)) { out.push(old); continue; } if (!q) continue;
        const type = fv(w, 't' + i) || 'text'; const opts = fv(w, 'o' + i).split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
        if (type === 'choice' && opts.length < 2) err = `「${q}」 선택형은 선택지를 2개 이상 입력하세요.`; if (out.some(x => x.q === q)) err = `「${q}」 질문이 중복됩니다.`; if (U && /이름|성명|연락처|전화|휴대폰|이메일|주소/.test(q)) err = `대학 유형은 「${q}」 같은 개인정보 질문을 받을 수 없습니다.`;
        out.push({ q, type, req: !!fv(w, 'r' + i), opts: type === 'choice' ? opts : [] }); }
      if (err) { toast(err, 'warn'); return false; } A.extraQ = out.slice(0, 6); A.editAns = !!fv(w, 'editAns'); mbJoinSync(); logAudit(`추가 질문 설정 ${A.extraQ.length}개`); save(); render(); toast('추가 질문을 저장했습니다.', 'ok'); } }], true); };

/* ═════════ 회원 목록 · 상세검색 · 선택 작업 ═════════ */
UI.mbSel = UI.mbSel || [];
function mbFiltered() { const f = UI.memF || 'all', q = (UI.memQ || '').toLowerCase(), A = UI.mbAdv || {}; const T = mbTeacher();
  const mine = T ? new Set(S.classes.filter(c => T.classes.includes(c.id) || (c.teachers || []).includes(T.id)).flatMap(c => c.learners || [])) : null;
  return S.members.filter(m => (f === 'all' || m.grade === f) && (!mine || (m.grade === '정회원' && mine.has(m.id))) && (A.wd || !m.withdrawn) /* v26 피그마 '탈퇴회원 보기': 기본은 숨김 */
    && (!q || [m.name, m.nick, m.email, m.phone, m.sid, ...Object.values(m.extra || {}).map(v => typeof v === 'string' ? v : '')].join(' ').toLowerCase().includes(q))
    && (!A.cls || (C(A.cls)?.learners || []).includes(m.id)) && (!A.from || (m.joined || '') >= A.from) && (!A.to || (m.joined || '') <= A.to)
    && (!A.team || m.group === A.team) && (!A.login || ((m.acct && m.acct.login) || 'email') === A.login)
    && (!A.q || String(((m.extra || {})[A.q] && typeof m.extra[A.q] === 'object' ? m.extra[A.q].file?.name : (m.extra || {})[A.q]) || '').toLowerCase().includes(String(A.v || '').toLowerCase()))); }
function mbList() { const U = mbUniv(); const f = UI.memF || 'all'; const L = mbFiltered(); const Lid = new Set(L.map(m => m.id)); const sel = UI.mbSel.filter(id => Lid.has(id)); UI.mbSel = sel; const A = UI.mbAdv || {}; const T = mbTeacher();
  const cnt = g => S.members.filter(m => m.grade === g).length; const inq = S.acctInq.filter(x => !x.done);
  const right = (T ? '' : `<button class="btn" data-act="mb-acct">가입 · 계정 설정</button>`) + (U ? `<button class="btn" data-act="mem-xls">엑셀 내려받기</button><button class="btn pri" data-act="go" data-v="enroll">+ 학번 등록</button>` : `<button class="btn" data-act="mem-q">추가 질문 설정</button><button class="btn" data-act="mem-xls">엑셀 내려받기</button><button class="btn" data-act="mem-bulk">일괄 가입</button><button class="btn pri" data-act="mem-invite">+ ${esc(t('learner'))} 추가</button>`);
  const sub = U ? `학번 · 학과만 저장합니다(이름 · 연락처 · 이메일 미수집) · ${mbAcctSummary()} ${guideRef('features/member/student.md')}` : `정회원 · 준회원(본인인증 전) · 승인 대기 · ${mbAcctSummary()} ${guideRef('features/member/student.md')}`;
  const alerts = (!T && cnt('승인 대기') ? `<div class="mb-note y"><b>가입 승인 대기 ${cnt('승인 대기')}명</b> — 승인 전에는 홈페이지를 이용할 수 없습니다. <button class="btn sm pri" data-act="tab" data-key="memF" data-v="승인 대기">확인</button></div>` : '') + (!T && inq.length ? `<div class="mb-note"><b>계정 문의 ${inq.length}건</b> — 아이디 · 비밀번호 찾기 실패 · 접근코드 재발급 요청 <button class="btn sm" data-act="mb-inq">보기</button></div>` : '');
  const adv = UI.mbAdvOpen ? `<div class="card mb-adv"><div class="ch"><b>회원 상세검색</b><small>클래스 · 가입일 · 추가정보 · ${esc(t('group'))} · 가입 수단</small><span class="sp"></span><button class="btn sm ghost" data-act="mb-advclr">초기화</button></div><div class="form2">
    <label>수강 ${esc(t('cls'))}<select data-chg="mb-advset" data-k="cls"><option value="">전체</option>${S.classes.map(c => `<option value="${c.id}" ${A.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label>가입일 시작<input type="date" data-chg="mb-advset" data-k="from" value="${esc(A.from || '')}"></label><label>가입일 끝<input type="date" data-chg="mb-advset" data-k="to" value="${esc(A.to || '')}"></label>
    <label>${esc(t('group'))}<select data-chg="mb-advset" data-k="team"><option value="">전체</option>${S.groups.map(g => `<option value="${g.id}" ${A.team === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
    ${U ? '' : `<label>가입 수단<select data-chg="mb-advset" data-k="login"><option value="">전체</option>${Object.entries(MB_LOGIN).map(([k, l]) => `<option value="${k}" ${A.login === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`}
    <label>추가정보 질문<select data-chg="mb-advset" data-k="q"><option value="">선택 안 함</option>${S.settings.acct.extraQ.map(x => `<option ${A.q === x.q ? 'selected' : ''}>${esc(x.q)}</option>`).join('')}</select></label><label>추가정보 값(포함)<input data-chg="mb-advset" data-k="v" value="${esc(A.v || '')}" maxlength="40"></label><label class="ckl mb-wd"><input type="checkbox" data-chg="mb-advwd" ${A.wd ? 'checked' : ''}> 탈퇴 회원 보기 <small class="mini">${S.members.filter(m => m.withdrawn).length}명 · 개인정보 삭제 · 학습 기록만 보관</small></label></div></div>` : '';
  const bulk = sel.length && !T ? `<div class="mb-bulk"><b>${sel.length}명 선택</b>${f === '승인 대기' || sel.some(id => ['승인 대기', '거절'].includes(M(id)?.grade)) ? '<button class="btn sm pri" data-act="mb-ok">승인</button><button class="btn sm" data-act="mb-no">거절</button>' : ''}<button class="btn sm" data-act="mb-msg">메시지 보내기</button>${U ? '' : '<button class="btn sm" data-act="mb-vreq">본인인증 안내</button>'}<button class="btn sm" data-act="mb-team">${esc(t('group'))} 지정</button><button class="btn sm red" data-act="mb-del">회원 삭제</button><button class="btn sm ghost" data-act="mb-selclr">선택 해제</button></div>` : '';
  const ck = m => `<input type="checkbox" data-chg="mb-sel" data-v="${m.id}" ${sel.includes(m.id) ? 'checked' : ''} aria-label="선택">`;
  const gtag = m => tag(m.grade, m.grade === '정회원' ? 'g' : m.grade === '준회원' ? '' : m.grade === '거절' ? 'r' : 'y');
  const act = m => (m.grade === '승인 대기' && !T ? `<button class="btn sm pri" data-act="mb-ok" data-v="${m.id}">승인</button><button class="btn sm" data-act="mb-no" data-v="${m.id}">거절</button>` : '') + `<button class="btn sm ghost" data-act="mem-open" data-v="${m.id}">상세</button>`;
  const badges = m => (m.acct?.manual ? ' ' + tag('수동 계정', 'mg') : '') + (m.acct?.login && !['email', 'code'].includes(m.acct.login) ? ' ' + tag(MB_LOGIN[m.acct.login] || m.acct.login) : '') + (m.acct?.minor ? ' ' + tag('14세 미만') : '');
  const cols = U ? ['', '학번', t('group'), 'AI 진단', '등급', '가입일', '최근 접속', ''] : ['', '이름', '이메일', '연락처', t('group'), '등급', '가입일', '최근 접속', ''];
  const lim = UI.mbLim || MB_PAGE; const rows = L.slice(0, lim).map(m => U ? [ck(m), `<a href="#" data-act="mem-open" data-v="${m.id}">${esc(typeof SID === 'function' ? SID(m) : m.sid || m.name)}</a>`, esc(m.extra?.['학과'] || gn(m.group)), m.diag ? tag(m.diag) : '<span class="mini">미응시</span>', gtag(m), m.joined, m.last <= addDays(today(), -30) ? tag(m.last, 'r') : m.last, act(m)]
    : [ck(m), `<a href="#" data-act="mem-open" data-v="${m.id}">${esc(m.name)}</a>${m.nick && m.nick !== m.name ? ` <small class="mini">${esc(m.nick)}</small>` : ''}${badges(m)}`, esc(m.email), esc(m.phone), gn(m.group), gtag(m), m.joined, m.last <= addDays(today(), -30) ? tag(m.last, 'r') : m.last, act(m)]);
  const allck = `<label class="ckl mb-all"><input type="checkbox" data-chg="mb-selall" ${L.length && sel.length === L.length ? 'checked' : ''}> 전체 선택(${L.length}명)</label>`;
  return head('', sub, right) + (T ? `<div class="mb-note">${esc(t('teacher'))}는 정회원 중 담당 ${esc(t('cls'))}(${T.classes.length}개)의 ${esc(t('learner'))}만 볼 수 있습니다.</div>` : '') + alerts +
    tabs('memF', [['all', '전체 ' + S.members.length], ['정회원', '정회원 ' + cnt('정회원')], ['준회원', '준회원 ' + cnt('준회원')], ['승인 대기', '승인 대기 ' + cnt('승인 대기')], ['거절', '거절 ' + cnt('거절')]], f) +
    `<div class="bar2"><input type="search" placeholder="${U ? '학번 · 학과 검색' : '이름 · 닉네임 · 이메일 · 연락처 · 추가정보 검색'}" value="${esc(UI.memQ || '')}" data-chg="memQ" aria-label="검색"><button class="btn sm ${UI.mbAdvOpen ? 'pri' : ''}" data-act="mb-adv">상세검색${Object.values(A).some(Boolean) ? ' · 적용 중' : ''}</button>${f === '승인 대기' && cnt('승인 대기') && !T ? '<button class="btn sm pri" data-act="mem-approve">일괄 승인</button>' : ''}${f === '준회원' && cnt('준회원') && !U && !T ? '<button class="btn sm" data-act="mb-vreq" data-all="1">준회원 전체에 본인인증 안내</button>' : ''}${allck}</div>` + adv + bulk + table(cols, rows, f === 'all' && !S.members.length ? `아직 ${tj('learner', '이')} 없습니다. 초대 링크를 공유하거나 일괄 가입으로 등록하세요.` : '조건에 맞는 회원이 없습니다.') + (L.length > lim ? `<div class="mb-more"><span>${lim.toLocaleString()}명 표시 · 전체 ${L.length.toLocaleString()}명</span><button type="button" class="btn" data-act="mb-lim">${Math.min(MB_PAGE, L.length - lim).toLocaleString()}명 더 보기</button><small class="mini">검색 · 상세검색으로 좁히면 빠릅니다</small></div>` : ''); }
const MB_PAGE = 100; /* v36 명단은 100명씩(5,000명 일괄 등록 뒤에도 화면이 느려지지 않게) */
ACT['mb-lim'] = () => { UI.mbLim = (UI.mbLim || MB_PAGE) + MB_PAGE; render(); };
{ const base = VIEWS.members; VIEWS.members = () => { mbEnsure(); if (UI.mem && M(UI.mem)) return base(); return mbList(); }; }
ACT['mb-sel'] = el => { const id = el.dataset.v; UI.mbSel = el.checked ? [...new Set([...UI.mbSel, id])] : UI.mbSel.filter(x => x !== id); render(); };
ACT['mb-selall'] = el => { UI.mbSel = el.checked ? mbFiltered().map(m => m.id) : []; render(); };
ACT['mb-selclr'] = () => { UI.mbSel = []; render(); };
ACT['mb-adv'] = () => { UI.mbAdvOpen = !UI.mbAdvOpen; render(); };
ACT['mb-advset'] = el => { UI.mbAdv = { ...(UI.mbAdv || {}), [el.dataset.k]: el.value }; render(); };
ACT['mb-advwd'] = el => { UI.mbAdv = { ...(UI.mbAdv || {}), wd: el.checked }; render(); };
ACT['mb-advclr'] = () => { UI.mbAdv = {}; render(); };
const mbTargets = el => el && el.dataset.v ? [el.dataset.v] : el && el.dataset.all ? S.members.filter(m => m.grade === '준회원').map(m => m.id) : UI.mbSel.slice();
function mbApprove(ids) { let n = 0; ids.forEach(id => { const m = M(id); if (!m || !['승인 대기', '거절'].includes(m.grade)) return; m.grade = '정회원'; delete m.reject; n++; mbInbox(m.id, '가입이 승인되었습니다', `${S.org.name} 홈페이지를 이용할 수 있습니다.`, { href: '#my' }); }); return n; }
ACT['mb-ok'] = el => { const n = mbApprove(mbTargets(el)); logAudit(`가입 승인 ${n}명`); UI.mbSel = []; save(); render(); toast(`${n}명을 승인했습니다.`, 'ok'); };
ACT['mem-approve'] = () => { const n = mbApprove(S.members.filter(m => m.grade === '승인 대기').map(m => m.id)); logAudit(`가입 일괄 승인 ${n}명`); save(); render(); toast(`${n}명을 승인했습니다.`, 'ok'); };
ACT['mb-no'] = el => { const ids = mbTargets(el); if (!ids.length) return; modal('가입 거절', `<p>${ids.length}명의 가입을 거절합니다. 거절된 회원은 로그인할 수 없고, 거절 탭에서 다시 승인할 수 있습니다.</p><label class="fl">거절 사유(학습자에게 안내)<input name="r" maxlength="80" placeholder="예: 재원생만 가입할 수 있습니다."></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '거절', kind: 'red', run: w => { const r = fv(w, 'r'); ids.forEach(id => { const m = M(id); if (!m) return; m.grade = '거절'; m.reject = r; mbInbox(m.id, '가입이 승인되지 않았습니다', r || '운영자에게 문의하세요.'); }); logAudit(`가입 거절 ${ids.length}명`); UI.mbSel = []; save(); render(); toast(`${ids.length}명을 거절했습니다.`, 'ok'); } }]); };
ACT['mb-vreq'] = el => { const ids = mbTargets(el).filter(id => M(id)?.grade === '준회원'); if (!ids.length) { toast('준회원이 없습니다.', 'warn'); return; } ids.forEach(id => mbInbox(id, '본인인증을 완료해 주세요', '휴대폰 본인인증을 마치면 정회원으로 바뀌어 수강 · 결제를 모두 이용할 수 있습니다. 마이페이지 › 회원정보 수정에서 인증하세요.', { href: '#acct' })); S.inviteSent.unshift({ at: nowStr(), ch: '알림톡 · 앱', kind: '본인인증 안내', n: ids.length }); logAudit(`본인인증 안내 ${ids.length}명`); save(); render(); toast(`준회원 ${ids.length}명에게 본인인증 안내를 보냈습니다(데모).`, 'ok'); };
ACT['mb-msg'] = el => { const ids = mbTargets(el); if (!ids.length) return; const np = S.parents.filter(p => ids.includes(p.child) && p.status === '연결 완료').length;
  modal(`메시지 보내기 — ${ids.length}명`, `<label class="fl">제목<input name="t" maxlength="60"></label><label class="fl">내용<textarea name="b" rows="5" maxlength="2000"></textarea></label>${np ? `<label class="ckl"><input type="checkbox" name="p"> 연결된 보호자에게도 보내기(${np}명)</label>` : '<p class="mini">연결된 보호자가 없으면 학습자에게만 보냅니다.</p>'}<p class="mini">앱 알림 + 이메일로 보냅니다. 학습자는 학습자 사이트 알림함(종 아이콘)에서 확인합니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '보내기', kind: 'pri', run: w => { const ti = fv(w, 't'), b = fv(w, 'b'); if (!ti || !b) { toast('제목과 내용을 입력하세요.', 'warn'); return false; } const par = !!fv(w, 'p');
      S.msgs = S.msgs || []; S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: 'sel', toIds: ids, parents: par, title: ti, body: b, imgs: [], ch: '앱 · 이메일', n: ids.length });
      ids.forEach(id => { mbInbox(id, ti, b, { kind: 'msg' }); if (par) S.parents.filter(p => p.child === id && p.status === '연결 완료').forEach(p => mbInbox(p.acct || p.id, ti, b, { kind: 'msg', child: M(id)?.name || '' })); });
      logAudit(`메시지 발송 ${ids.length}명${par ? ' + 보호자' : ''}`); save(); render(); toast(`${ids.length}명에게 보냈습니다.`, 'ok'); } }]); };
ACT['mb-team'] = el => { const ids = mbTargets(el); if (!ids.length) return; if (!S.groups.length) { toast(`먼저 ${tj('group', '을')} 만드세요.`, 'warn'); return; }
  modal(`${t('group')} 지정 — ${ids.length}명`, `<label class="fl">${esc(t('group'))}<select name="g">${S.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label><p class="mini">한 회원은 한 ${esc(t('group'))}에만 소속됩니다(기존 소속에서 옮겨집니다).</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '지정', kind: 'pri', run: w => { ids.forEach(id => { const m = M(id); if (m) m.group = fv(w, 'g'); }); logAudit(`${t('group')} 지정 ${ids.length}명`); save(); render(); } }]); };
ACT['mb-del'] = el => { const ids = mbTargets(el); if (!ids.length) return; modal('회원 삭제', `<p><b>${ids.length}명</b>을 이 홈페이지에서 삭제합니다. 수강 권한이 사라지고 홈페이지에 접근할 수 없습니다.</p><p class="mini">디디쌤 통합 계정은 유지되며, 작성한 게시글은 자동으로 삭제되지 않습니다. 결제 내역은 매출 기록으로 남습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { mbRemove(ids); logAudit(`회원 삭제 ${ids.length}명`); UI.mbSel = []; UI.mem = null; save(); render(); toast(`${ids.length}명을 삭제했습니다.`, 'ok'); } }]); };
function mbRemove(ids) { const set = new Set(ids); S.members = S.members.filter(m => !set.has(m.id)); S.classes.forEach(c => { c.learners = (c.learners || []).filter(x => !set.has(x)); ids.forEach(id => { if (c.prog) delete c.prog[id]; if (c.enr) delete c.enr[id]; }); }); S.parents = S.parents.filter(p => !set.has(p.child)); ids.forEach(id => delete S.inbox[id]); }
ACT['mem-del'] = el => ACT['mb-del'](el);
ACT['mb-inq'] = () => { const L = S.acctInq; modal('계정 문의', L.length ? table(['접수', '유형', '내용', '상태'], L.slice(0, 50).map(x => [esc(x.at), esc(x.kind), esc([x.name, x.phone, x.id, x.body].filter(Boolean).join(' · ')), x.done ? tag('처리 완료', 'g') : `<button class="btn sm" data-act="mb-inqdone" data-v="${x.id}">처리 완료</button>`])) : '<div class="empty">문의가 없습니다.</div>', [{ id: 'c', label: '닫기' }], true); };
ACT['mb-inqdone'] = el => { const x = S.acctInq.find(y => y.id === el.dataset.v); if (x) { x.done = nowStr(); logAudit('계정 문의 처리 — ' + x.kind); save(); } ACT['mb-inq'](); };

/* ═════════ 회원 상세: 계정 · 추가 질문 · 보호자 ═════════ */
{ const base = memberDetail; memberDetail = m => { let h = base(m); if ((UI.memT || 'info') !== 'info') return h; const U = mbUniv(); const a = m.acct || {}; const A = S.settings.acct;
  h = h.replace(/<div class="bar2"><button class="btn sm" data-act="par-req"[\s\S]*?<\/div>/, '');
  h = h.replace(/(<option[^>]*>승인 대기<\/option>)(<\/select>)/, `$1<option ${m.grade === '거절' ? 'selected' : ''}>거절</option>$2`);
  const P = S.parents.filter(p => p.child === m.id);
  const acctCard = `<div class="card mb-card"><div class="ch"><b>계정</b><small>${a.manual ? '수동 계정 · 알림톡 수신 불가' : '디디쌤 계정'}</small><span class="sp"></span>${m.grade === '승인 대기' || m.grade === '거절' ? `<button class="btn sm pri" data-act="mb-ok" data-v="${m.id}">승인</button>` : ''}${m.grade === '승인 대기' ? `<button class="btn sm" data-act="mb-no" data-v="${m.id}">거절</button>` : ''}${m.grade === '준회원' && !U ? `<button class="btn sm" data-act="mb-vreq" data-v="${m.id}">본인인증 안내</button>` : ''}<button class="btn sm" data-act="mb-msg" data-v="${m.id}">메시지</button></div>
    <div class="mb-kv">${[['가입 수단', MB_LOGIN[a.login] || (U ? '접근코드' : '이메일')], ['연동 SNS', (a.links || []).filter(x => x !== 'email').map(x => MB_LOGIN[x]).join(', ') || '없음'], ['본인인증', a.verified ? '완료' + (a.verifiedBy === 'email' ? '(이메일)' : '(휴대폰)') : '미인증'], ['가입 경로', { self: '직접 가입', invite: '초대 링크', bulk: '일괄 가입', admin: '운영자 등록', manual: '수동 계정' }[m.src] || '—'], ['가입일', a.joined || m.joined || '—'], ...(a.minor ? [['법정대리인', `${a.guardian?.name || ''} ${a.guardian?.phone || ''} · 동의 완료`]] : []), ...(m.reject ? [['거절 사유', m.reject]] : [])].filter(([k]) => !(U && /SNS|본인인증/.test(k))).map(([k, v]) => `<span><small>${esc(k)}</small><b>${esc(v)}</b></span>`).join('')}</div></div>`;
  const qs = A.extraQ.filter(x => !(U && ['학번', '학과'].includes(x.q)));
  const qCard = qs.length ? `<div class="card mb-card"><div class="ch"><b>추가 질문 답변</b><small>${esc(t('learner'))} ${A.editAns ? '수정 허용' : '수정 불가'}</small></div><div class="mb-kv">${qs.map(x => `<span><small>${esc(x.q)}${x.req ? ' *' : ''}</small><b>${mbAns((m.extra || {})[x.q]) || '<i class="mini">미응답</i>'}</b></span>`).join('')}</div></div>` : '';
  const pCard = U || !mbGuardOn() ? '' : `<div class="card mb-card"><div class="ch"><b>보호자</b><small>출결 · 청구서 · 수업일 변경 · 메시지 알림</small><span class="sp"></span><button class="btn sm pri" data-act="par-req" data-v="${m.id}">보호자 +</button></div>${P.length ? `<div class="mb-chips">${P.map(p => `<button class="mb-chip ${p.status === '연결 완료' ? 'g' : p.status === '거절' ? 'r' : 'y'}" data-act="mb-parchip" data-v="${p.id}">${esc(p.name)}${p.rel ? ` (${esc(p.rel)})` : ''} · ${esc(p.status === '연결 요청' ? '연결 대기 중' : p.status)}</button>`).join('')}</div>` : '<p class="mini">연결된 보호자가 없습니다. [보호자 +]로 이름 · 연락처를 입력하면 보호자에게 연결 안내 알림톡이 갑니다.</p>'}<p class="mini">운영자가 보낸 연결 요청은 보호자가 거절할 수 없습니다. 상태 칩을 누르면 연결을 해제할 수 있습니다.</p></div>`;
  return h.replace('<div class="danger">', acctCard + qCard + pCard + '<div class="danger">'); }; }
{ const base = ACT['mem-set']; ACT['mem-set'] = el => { const m = M(el.dataset.v); if (!m) return; const k = el.dataset.k;
  if (k === 'nick' && el.value && !MB_NICK_RE.test(el.value)) { toast('닉네임은 2~20자 한글 · 영문 · 숫자 · - · _ 만 쓸 수 있습니다.', 'warn'); el.value = m.nick || ''; return; }
  if (k === 'phone' && el.value && !MB_PHONE_RE.test(el.value)) { toast('연락처 형식을 확인하세요(예: 010-1234-5678).', 'warn'); el.value = m.phone || ''; return; }
  const prev = m.grade; base(el); if (k === 'grade' && prev !== m.grade) { if (m.grade === '정회원' && ['승인 대기', '거절'].includes(prev)) mbInbox(m.id, '가입이 승인되었습니다', `${S.org.name} 홈페이지를 이용할 수 있습니다.`); logAudit(`등급 변경 — ${m.name} ${prev} → ${m.grade}`); save(); render(); } }; }

/* ═════════ 보호자 ═════════ */
ACT['par-req'] = el => { const child = el.dataset.v ? M(el.dataset.v) : null;
  modal('보호자 연결', `${child ? `<p><b>${esc(child.name)}</b> ${esc(t('learner'))}의 보호자를 연결합니다.</p>` : `<label class="fl">${esc(t('learner'))}<select name="c">${S.members.map(m => `<option value="${m.id}">${esc(m.name)}${m.phone ? ' · ' + esc(m.phone) : ''}</option>`).join('')}</select></label>`}
    <div class="form2"><label>관계<select name="rel">${['모', '부', '조부모', '기타 보호자'].map(x => `<option>${x}</option>`).join('')}</select></label><label>보호자 이름<input name="n" maxlength="20" required></label><label>보호자 연락처<input name="p" maxlength="13" placeholder="010-0000-0000" required></label></div>
    <p class="mini">입력한 연락처로 연결 안내 알림톡이 발송됩니다(데모). 보호자가 그 번호로 디디쌤 앱 · 학습자 사이트에 가입해 요청을 수락하면 연결이 완료됩니다. 운영자가 보낸 요청은 보호자가 거절할 수 없습니다.</p>`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: '연결 요청', kind: 'pri', run: w => { const cid = child ? child.id : fv(w, 'c'); const n = fv(w, 'n'), p = mbPhone(fv(w, 'p'));
    if (!cid || !n || !MB_PHONE_RE.test(p)) { toast('보호자 이름과 연락처를 확인하세요.', 'warn'); return false; }
    if (S.parents.some(x => x.child === cid && x.phone === p && x.status !== '거절')) { toast('이미 연결(요청)된 보호자입니다.', 'warn'); return false; }
    const pa = S.pacct.find(x => x.phone === p); const rec = { id: uid('p'), child: cid, name: n, phone: p, rel: fv(w, 'rel'), status: '연결 요청', by: 'admin', at: today(), acct: pa ? pa.id : '' }; S.parents.push(rec);
    if (pa) mbInbox(pa.id, '가족 연결 요청', `${S.org.name}에서 ${M(cid)?.name || ''} ${t('learner')}의 보호자로 연결을 요청했습니다. 가족 메뉴에서 수락해 주세요.`, { href: '#family' });
    S.inviteSent.unshift({ at: nowStr(), ch: '알림톡', kind: '보호자 연결 안내', name: n, to: p }); logAudit(`보호자 연결 요청 — ${M(cid)?.name || ''} · ${n}`); save(); render(); toast('보호자에게 연결 안내를 보냈습니다(데모).', 'ok'); } }]); };
ACT['par-resend'] = el => { const p = S.parents.find(x => x.id === el.dataset.v); if (p) { S.inviteSent.unshift({ at: nowStr(), ch: '알림톡', kind: '보호자 연결 재발송', name: p.name, to: p.phone }); if (p.acct) mbInbox(p.acct, '가족 연결 요청(재발송)', '가족 메뉴에서 연결 요청을 확인해 주세요.', { href: '#family' }); logAudit('보호자 연결 요청 재발송 — ' + p.name); save(); } toast('연결 요청을 다시 보냈습니다(데모).', 'ok'); };
ACT['mb-parchip'] = el => { const p = S.parents.find(x => x.id === el.dataset.v); if (!p) return;
  modal('보호자 연결', `<div class="mb-kv"><span><small>보호자</small><b>${esc(p.name)}${p.rel ? ' (' + esc(p.rel) + ')' : ''}</b></span><span><small>연락처</small><b>${esc(p.phone)}</b></span><span><small>${esc(t('learner'))}</small><b>${mn(p.child)}</b></span><span><small>상태</small><b>${esc(p.status === '연결 요청' ? '연결 대기 중' : p.status)}</b></span><span><small>요청</small><b>${{ admin: '운영자', parent: '보호자', child: t('learner') }[p.by] || '—'}${p.at ? ' · ' + esc(p.at) : ''}</b></span></div><p class="mini">연결을 해제하면 보호자는 즉시 자녀의 수업 · 청구서를 확인할 수 없고, 이전에 받은 자녀 관련 알림을 눌러도 조회할 수 없습니다.</p>`,
    [{ id: 'c', label: '닫기' }, ...(p.status === '연결 요청' ? [{ id: 'rs', label: '요청 재발송', run: () => ACT['par-resend']({ dataset: { v: p.id } }) }] : []), { id: 'un', label: '연결 해제', kind: 'red', run: () => { S.parents = S.parents.filter(x => x !== p); mbParSync(p.child); if (p.acct) mbInbox(p.acct, '가족 연결이 해제되었습니다', `${M(p.child)?.name || ''} ${t('learner')}와의 연결이 해제되었습니다.`); logAudit(`보호자 연결 해제 — ${p.name}`); save(); render(); toast('연결을 해제했습니다.', 'ok'); } }]); };
VIEWS.parents = () => { mbEnsure(); const f = UI.parF || 'all'; const L = S.parents.filter(p => f === 'all' || p.status === f);
  return head('보호자', `보호자 연결 · 출결 · 청구서 · 수업일 변경 · 메시지 알림 ${guideRef('features/member/parents.md')}`, `<button class="btn pri" data-act="par-req">+ 보호자 연결</button>`) +
    tabs('parF', [['all', '전체 ' + S.parents.length], ['연결 완료', '연결 완료'], ['연결 요청', '연결 대기 중 ' + S.parents.filter(p => p.status === '연결 요청').length], ['거절', '거절']], f) +
    table(['보호자', '관계', '연락처', '자녀', '요청', '상태', '요청일', ''], L.map(p => [esc(p.name), esc(p.rel || '—'), esc(p.phone), `<a href="#" data-act="mem-open" data-v="${p.child}">${mn(p.child)}</a>`, { admin: '운영자', parent: '보호자', child: esc(t('learner')) }[p.by] || '—', `<button class="mb-chip ${p.status === '연결 완료' ? 'g' : p.status === '거절' ? 'r' : 'y'}" data-act="mb-parchip" data-v="${p.id}">${esc(p.status === '연결 요청' ? '연결 대기 중' : p.status)}</button>`, esc(p.at || '—'), p.status === '연결 요청' ? `<button class="btn sm" data-act="par-resend" data-v="${p.id}">요청 재발송</button>` : '']), '연결된 보호자가 없습니다. 회원 상세의 [보호자 +] 또는 위 버튼으로 연결하세요.') +
    `<div class="card"><div class="ch"><b>보호자 계정</b><small>학습자 사이트에서 보호자로 가입한 계정 ${S.pacct.length}명</small></div>${table(['이름', '연락처', '이메일', '가입일', '연결 자녀'], S.pacct.map(a => [esc(a.name), esc(a.phone), esc(a.email), esc(a.joined), S.parents.filter(p => p.acct === a.id && p.status === '연결 완료').map(p => mn(p.child)).join(', ') || '—']), '보호자 계정이 없습니다.')}</div>`; };

/* ═════════ 팀(반 · 부서 · 학과) ═════════ */
const mbGName = (n, except) => S.groups.some(g => g.id !== except && g.name.trim().toLowerCase() === n.trim().toLowerCase());
VIEWS.groups = () => { mbEnsure(); const g = UI.mbGrp && S.groups.find(x => x.id === UI.mbGrp); if (g) return mbGroupDetail(g);
  return head(`${t('group')} 관리`, `${esc(t('group'))} 단위 수강 권한 · 메시지 발송 · 이름 중복 불가 ${guideRef('features/member/team.md')}`, `<button class="btn pri" data-act="grp-new">+ ${esc(t('group'))} 만들기</button>`) +
    table(['생성일', t('group'), '인원', '담당', '수강 중 ' + t('cls'), ''], S.groups.map(g => { const ms = S.members.filter(m => m.group === g.id); return [esc(g.at || '—'), `<a href="#" data-act="mb-grp" data-v="${g.id}"><b>${esc(g.name)}</b></a>`, ms.length + '명', esc(g.lead || '—'), S.classes.filter(c => (c.learners || []).some(id => ms.some(m => m.id === id))).length + '개', `<button class="btn sm ghost" data-act="mb-grp" data-v="${g.id}">상세</button><button class="btn sm ghost" data-act="grp-msg" data-v="${g.id}">메시지</button><button class="btn sm ghost" data-act="grp-del" data-v="${g.id}">삭제</button>`]; }), `아직 ${tj('group', '이')} 없습니다.`); };
function mbGroupDetail(g) { const ms = S.members.filter(m => m.group === g.id);
  return `<button class="link back" data-act="mb-grpback">← ${esc(t('group'))} 목록</button>` + headD(g.name, `생성일 ${esc(g.at || '—')} · ${ms.length}명 · 담당 ${esc(g.lead || '—')}`, `<button class="btn" data-act="mb-grpedit" data-v="${g.id}">이름 · 담당 변경</button><button class="btn" data-act="grp-msg" data-v="${g.id}">메시지</button><button class="btn pri" data-act="mb-grpadd" data-v="${g.id}">+ 팀원 추가</button>`) +
    table([mbUniv() ? '학번' : '이름', mbUniv() ? '학과' : '연락처', '등급', '가입일', ''], ms.map(m => [`<a href="#" data-act="mem-open" data-v="${m.id}">${esc(m.name)}</a>`, esc(mbUniv() ? m.extra?.['학과'] || '' : m.phone), tag(m.grade, m.grade === '정회원' ? 'g' : ''), m.joined, `<button class="btn sm ghost" data-act="mb-grprm" data-v="${m.id}">${esc(t('group'))}에서 빼기</button>`]), `팀원이 없습니다. [+ 팀원 추가]로 ${tj('learner', '을')} 넣으세요.`); }
ACT['mb-grp'] = el => { UI.mbGrp = el.dataset.v; render(); };
ACT['mb-grpback'] = () => { UI.mbGrp = null; render(); };
ACT['grp-new'] = () => modal(`${t('group')} 만들기`, `<label class="fl">이름<input name="n" maxlength="30"></label><label class="fl">담당자<input name="l" maxlength="20"></label><p class="mini">${esc(t('group'))} 이름은 중복될 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const n = fv(w, 'n'); if (!n) { toast('이름을 입력하세요.', 'warn'); return false; } if (mbGName(n)) { toast(`이미 있는 ${t('group')} 이름입니다.`, 'warn'); return false; } S.groups.push({ id: uid('g'), name: n, lead: fv(w, 'l'), at: today() }); logAudit(`${t('group')} 만들기 — ${n}`); save(); render(); } }]);
ACT['mb-grpedit'] = el => { const g = S.groups.find(x => x.id === el.dataset.v); modal(`${t('group')} 정보`, `<label class="fl">이름<input name="n" maxlength="30" value="${esc(g.name)}"></label><label class="fl">담당자<input name="l" maxlength="20" value="${esc(g.lead || '')}"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const n = fv(w, 'n'); if (!n || mbGName(n, g.id)) { toast(n ? `이미 있는 ${t('group')} 이름입니다.` : '이름을 입력하세요.', 'warn'); return false; } g.name = n; g.lead = fv(w, 'l'); save(); render(); } }]); };
ACT['mb-grpadd'] = el => { const g = S.groups.find(x => x.id === el.dataset.v); const L = S.members.filter(m => m.group !== g.id);
  modal(`팀원 추가 — ${g.name}`, L.length ? `<input type="search" id="mbGq" placeholder="이름 · 연락처 검색" aria-label="검색"><div class="mb-pick">${L.map(m => `<label class="ckl" data-k="${esc((m.name + ' ' + (m.phone || '') + ' ' + (m.nick || '')).toLowerCase())}"><input type="checkbox" name="m" value="${m.id}"> ${esc(m.name)} <small class="mini">${esc(m.phone || '')}${m.group ? ' · 현재 ' + gn(m.group) : ''}</small></label>`).join('')}</div><p class="mini">한 회원은 한 ${esc(t('group'))}에만 소속됩니다. 다른 ${esc(t('group'))} 소속이면 이 ${esc(tj('group', '으로'))} 옮겨집니다.</p>` : '<div class="empty">추가할 회원이 없습니다.</div>',
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { const ids = [...w.querySelectorAll('[name=m]:checked')].map(x => x.value); ids.forEach(id => { M(id).group = g.id; }); logAudit(`${g.name} 팀원 추가 ${ids.length}명`); save(); render(); toast(`${ids.length}명을 추가했습니다.`, 'ok'); } }]); };
ACT['mb-grprm'] = el => { const m = M(el.dataset.v); if (m) { m.group = ''; logAudit(`${t('group')}에서 빼기 — ${m.name}`); save(); render(); } };
document.addEventListener('input', e => { if (!e.target || !['mbGq', 'mbAq'].includes(e.target.id)) return; const q = e.target.value.trim().toLowerCase(); const box = e.target.parentElement.querySelector('.mb-pick'); box && box.querySelectorAll('[data-k]').forEach(l => { l.hidden = !!q && !l.dataset.k.includes(q); }); });

/* ═════════ 초대(연락처 · 링크 · 이메일 · 수동 계정 · 일괄) ═════════ */
function mbInvite(target, cls, role) { let iv = S.invites.find(i => i.active && i.target === target && (i.cls || '') === (cls || '') && (target !== 'admin' || i.role === role)); if (!iv) { iv = { id: uid('iv'), token: mbTok(), target, cls: cls || '', role: target === 'admin' ? role || 'sub' : '', uses: 0, active: true, at: today() }; S.invites.push(iv); save(); } return iv; }
const mbInvURL = iv => `${mbLURL()}#join/${iv.token}`;
const MB_IT = () => [['phone', '연락처(알림톡)'], ['link', '링크'], ['email', '이메일'], ['manual', '수동 계정'], ['bulk', '일괄 초대']];
function mbLinkPanel() { const tg = UI.mbInvT || 'student', cls = UI.mbInvC || '', role = UI.mbInvR || 'sub'; const A = S.settings.acct; const iv = mbInvite(tg, tg === 'student' ? cls : '', role); const url = mbInvURL(iv);
  return `<div class="form2"><label>초대 대상<select data-chg="mb-invset" data-k="mbInvT"><option value="student" ${tg === 'student' ? 'selected' : ''}>${esc(t('learner'))}</option>${A.parent && mbGuardOn() ? `<option value="parent" ${tg === 'parent' ? 'selected' : ''}>보호자</option>` : ''}<option value="admin" ${tg === 'admin' ? 'selected' : ''}>운영자 · ${esc(t('teacher'))}</option></select></label>
    ${tg === 'student' ? `<label>가입과 함께 수강 권한(선택)<select data-chg="mb-invset" data-k="mbInvC"><option value="">없음</option>${S.classes.map(c => `<option value="${c.id}" ${cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : tg === 'admin' ? `<label>권한<select data-chg="mb-invset" data-k="mbInvR"><option value="sub" ${role === 'sub' ? 'selected' : ''}>부운영자</option><option value="teacher" ${role === 'teacher' ? 'selected' : ''}>${esc(t('teacher'))}</option></select></label>` : ''}</div>
    <label class="fl">초대 링크 <small class="mini">가입 ${iv.uses}명 · 만든 날 ${esc(iv.at || '')}</small><input readonly id="mbInvU" value="${esc(url)}"></label>
    <div class="bar2"><button type="button" class="btn sm pri" data-act="mb-invcopy">복사</button><button type="button" class="btn sm" data-act="mb-invshare" data-v="kakao">카카오톡 공유</button><button type="button" class="btn sm" data-act="mb-invshare" data-v="facebook">페이스북 공유</button><button type="button" class="btn sm red" data-act="mb-invregen" data-v="${iv.id}">링크 재생성</button></div>
    <p class="mini">초대 링크로 가입하면 승인 절차 없이 즉시 가입됩니다${A.mode === 'invite' ? '(지금은 초대받은 회원만 가입 가능)' : ''}. 링크를 재생성하면 이전 링크는 쓸 수 없습니다.</p>`; }
function mbInvBody(tb) { if (tb === 'link') return mbLinkPanel();
  if (tb === 'phone') return `<label class="fl">이름, 연락처(한 줄에 한 명)<textarea name="l" rows="5" placeholder="홍길동, 010-1234-5678"></textarea></label><p class="mini">입력한 연락처로 알림톡이 발송되고, 홈페이지 가입 링크가 함께 갑니다. 국내 번호가 없으면 [수동 계정]을 만드세요(알림톡 수신 불가).</p>`;
  if (tb === 'email') return `<label class="fl">이메일(한 줄에 한 명)<textarea name="l" rows="5" placeholder="name@example.com"></textarea></label><p class="mini">초대 링크를 이메일로 보냅니다. 이메일 초대로 가입하면 승인 없이 즉시 가입됩니다.</p>`;
  if (tb === 'manual') return `<p class="mini">국내 휴대폰 번호가 없는 외국인 · 해외 거주자용 계정입니다. 본인인증 없이 정회원으로 만들어지고, 알림톡은 받을 수 없습니다(이메일 · 앱 알림만).</p><div class="form2"><label>이름<input name="n" maxlength="20"></label><label>이메일(아이디)<input name="e" type="email" maxlength="60"></label><label>임시 비밀번호<input name="pw" type="password" maxlength="20" placeholder="영문 · 숫자 · 특수문자 8자 이상"></label></div>`;
  return `<p>엑셀(CSV) 양식에 이메일 · 이름을 채워 올리면 한 번에 최대 ${MB_BULK_MAX.toLocaleString()}명까지 검사 후 등록합니다. 비밀번호는 받지 않습니다 — 등록된 ${esc(t('learner'))}은 이메일 인증번호로 로그인합니다.</p><button type="button" class="btn pri" data-act="mem-bulk">일괄 초대 열기</button>`; }
function mbInvModal() { const tb = UI.mbInvTab || 'link';
  modal(`${t('learner')} 추가 · 초대`, `<div class="seg2 full" role="tablist">${MB_IT().map(([k, l]) => `<button type="button" role="tab" class="${tb === k ? 'on' : ''}" aria-selected="${tb === k}" data-act="mb-invtab" data-v="${k}">${l}</button>`).join('')}</div><div id="mbInvB">${mbInvBody(tb)}</div>`,
    [{ id: 'c', label: '닫기' }, ...(['phone', 'email', 'manual'].includes(tb) ? [{ id: 'ok', label: tb === 'manual' ? '계정 만들기' : '초대 보내기', kind: 'pri', run: w => mbInvSend(tb, w) }] : [])], true); }
ACT['mem-invite'] = el => { mbEnsure(); if (mbUniv()) { toast('대학은 이름 · 연락처를 받지 않습니다. 학번 등록(접근코드 발급)으로 안내합니다.'); go('enroll'); return; } mbInvModal(); };
ACT['mb-invtab'] = el => { UI.mbInvTab = el.dataset.v; mbInvModal(); };
ACT['mb-invset'] = el => { UI[el.dataset.k] = el.value; const b = $('#mbInvB'); if (b) b.innerHTML = mbLinkPanel(); };
ACT['mb-invcopy'] = () => { const u = $('#mbInvU'); if (!u) return; (navigator.clipboard ? navigator.clipboard.writeText(u.value) : Promise.reject()).then(() => toast('초대 링크를 복사했습니다.', 'ok'), () => { u.select(); toast('링크를 선택했습니다. Ctrl+C로 복사하세요.'); }); };
ACT['mb-invshare'] = el => { const u = $('#mbInvU')?.value || ''; if (el.dataset.v === 'facebook') { window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u), '_blank', 'noopener,width=600,height=500'); } else { /* 운영: Kakao.Share.sendDefault({ objectType: 'feed', ... }) — 카카오 JavaScript 키 필요 */ toast('카카오톡 공유 창을 엽니다(데모: 카카오 JavaScript 키 연동 후 동작).'); }
  S.inviteSent.unshift({ at: nowStr(), ch: el.dataset.v === 'facebook' ? '페이스북' : '카카오톡', kind: '초대 링크 공유' }); save(); };
ACT['mb-invregen'] = el => { const iv = S.invites.find(i => i.id === el.dataset.v); if (!iv) return; if (!el.dataset.sure) { el.dataset.sure = '1'; el.textContent = '한 번 더 누르면 재생성(이전 링크 무효)'; return; } iv.active = false; iv.off = today(); S.invites.push({ ...iv, id: uid('iv'), token: mbTok(), uses: 0, active: true, at: today(), off: '' }); logAudit('초대 링크 재생성'); save(); const b = $('#mbInvB'); if (b) b.innerHTML = mbLinkPanel(); toast('새 링크를 만들었습니다. 이전 링크는 더 이상 쓸 수 없습니다.', 'ok'); };
function mbInvSend(tb, w) { const iv = mbInvite('student', '', ''); const url = mbInvURL(iv);
  if (tb === 'phone') { const L = fv(w, 'l').split('\n').map(s => s.split(',').map(x => x.trim())).filter(x => x[0]); const bad = L.filter(([n, p]) => !n || !MB_PHONE_RE.test(p || '')); if (!L.length || bad.length) { toast(bad.length ? `${bad.length}줄의 이름 · 연락처 형식을 확인하세요(예: 홍길동, 010-1234-5678).` : '이름과 연락처를 입력하세요.', 'warn'); return false; }
    L.forEach(([n, p]) => S.inviteSent.unshift({ at: nowStr(), ch: '알림톡', kind: '초대', name: n, to: mbPhone(p), url })); /* 운영: 알림톡 API — 홈페이지 링크 발송 */ logAudit(`연락처 초대 ${L.length}명`); save(); toast(`${L.length}명에게 초대 알림톡을 보냈습니다(데모).`, 'ok'); return; }
  if (tb === 'email') { const L = fv(w, 'l').split(/[\n,;]/).map(s => s.trim()).filter(Boolean); const bad = L.filter(e => !MB_MAIL_RE.test(e)); if (!L.length || bad.length) { toast(bad.length ? `이메일 형식 오류: ${bad.slice(0, 2).join(', ')}` : '이메일을 입력하세요.', 'warn'); return false; }
    L.forEach(e => S.inviteSent.unshift({ at: nowStr(), ch: '이메일', kind: '초대', to: e, url })); /* 운영: 메일 발송 API */ logAudit(`이메일 초대 ${L.length}명`); save(); toast(`${L.length}명에게 초대 메일을 보냈습니다(데모).`, 'ok'); return; }
  if (tb === 'manual') { const n = fv(w, 'n'), e = fv(w, 'e').toLowerCase(), pw = fv(w, 'pw'); if (!n || !MB_MAIL_RE.test(e)) { toast('이름과 이메일을 확인하세요.', 'warn'); return false; } if (!MB_PW_RE.test(pw)) { toast('비밀번호는 영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8자 이상입니다.', 'warn'); return false; } if (S.members.some(m => (m.email || '').toLowerCase() === e)) { toast('이미 가입된 이메일입니다.', 'warn'); return false; }
    S.members.push({ id: uid('m'), sid: mbSid(e), name: n, nick: n.slice(0, 20), email: e, phone: '', group: '', grade: '정회원', joined: today(), last: today(), extra: {}, src: 'manual', acct: { login: 'email', email: e, phone: '', pw: mbPw(e, pw), verified: false, manual: true, joined: today(), links: ['email'] } }); logAudit(`수동 계정 생성 — ${n}`); save(); render(); toast('수동 계정을 만들었습니다. 이메일 · 임시 비밀번호를 직접 전달하세요.', 'ok'); }
}

/* 일괄 가입: 업로드 → 유효성 검사 결과 → [등록] */
let MB_BULK = [];
ACT['mem-bulk'] = () => { mbEnsure(); if (mbUniv()) { toast('대학은 학번 등록(접근코드 발급)으로 안내합니다.'); go('enroll'); return; } MB_BULK = [];
  modal('일괄 초대(일괄 가입)', `<p class="mini">CSV(엑셀에서 'CSV UTF-8'로 저장) · 1회 최대 100명. 열 순서: 이름, 닉네임, 이메일, 비밀번호(영문 · 숫자 · 특수문자 8자 이상), 연락처(- 포함), 추가정보(${esc(S.settings.extraQ.join(', ') || '없음')}). 이미 가입한 이메일 · 연락처는 등록되지 않으니 초대 링크로 안내하세요. 등록된 회원은 준회원 목록에 들어가며, 파일의 로그인 정보로 로그인해 본인인증하면 정회원이 됩니다.</p><div class="bar2"><input type="file" accept=".csv,text/csv" id="mbBulkF" aria-label="CSV 파일"><button type="button" class="btn sm ghost" data-act="bulk-tpl">양식 내려받기</button></div><div id="mbBulkOut" class="mini"></div>`,
    [{ id: 'c', label: '닫기' }, { id: 'ok', label: '검사 통과 행 등록', kind: 'pri', run: () => { const ok = MB_BULK.filter(r => !r.err); if (!ok.length) { toast('등록할 행이 없습니다. 파일을 올리고 검사 결과를 확인하세요.', 'warn'); return false; }
      ok.forEach(r => S.members.push({ id: uid('m'), sid: mbSid(r.email), name: r.name.slice(0, 20), nick: (r.nick || r.name).slice(0, 20), email: r.email, phone: r.phone, group: S.groups[0]?.id || '', grade: '준회원', joined: today(), last: today(), extra: r.extra, src: 'bulk', acct: { login: 'email', email: r.email, phone: r.phone, pw: mbPw(r.email, r.pw), verified: false, joined: today(), links: ['email'] } }));
      logAudit(`일괄 가입 ${ok.length}명(준회원)`); save(); render(); toast(`${ok.length}명을 준회원으로 등록했습니다.`, 'ok'); } }], true); };
document.addEventListener('change', e => { if (!e.target || e.target.id !== 'mbBulkF') return; const f = e.target.files[0]; const out = $('#mbBulkOut'); if (!f || !out) return;
  if (!/\.csv$/i.test(f.name) || f.size > 1024 * 1024) { out.textContent = 'CSV 파일(1MB 이하)만 올릴 수 있습니다.'; return; }
  f.text().then(txt => { const rows = txt.replace(/^﻿/, '').split(/\r?\n/).filter(r => r.trim()).map(r => r.split(',').map(c => c.replace(/^"|"$/g, '').trim())); rows.shift();
    if (rows.length > 100) { MB_BULK = []; out.textContent = '1회 최대 100명입니다. 파일을 나눠 올리세요.'; return; }
    const seenE = new Set(), seenP = new Set(); const Q = S.settings.extraQ;
    MB_BULK = rows.map((r, i) => { const [name, nick, email0, pw, phone] = r; const email = (email0 || '').toLowerCase(); const dup = S.members.some(m => (m.email || '').toLowerCase() === email) ? '이미 존재하는 이메일' : S.members.some(m => m.phone && m.phone === phone) ? '이미 존재하는 전화번호' : '';
      const err = !name ? '이름 누락' : nick && !MB_NICK_RE.test(nick) ? '닉네임 규칙(2~20자, - _ 외 특수문자 불가)' : !MB_MAIL_RE.test(email) ? '이메일 형식' : !MB_PW_RE.test(pw || '') ? '비밀번호(영문 · 숫자 · 특수문자 8자 이상)' : !/^\d{2,3}-\d{3,4}-\d{4}$/.test(phone || '') ? '연락처 형식(- 포함)' : dup || (seenE.has(email) ? '파일 안 이메일 중복' : seenP.has(phone) ? '파일 안 연락처 중복' : '');
      seenE.add(email); seenP.add(phone); return { row: i + 2, name, nick, email, pw, phone, err, dup: !!dup, extra: Object.fromEntries(Q.map((q, j) => [q, (r[5 + j] || '').slice(0, 40)])) }; });
    const ok = MB_BULK.filter(r => !r.err).length;
    out.innerHTML = `<p><b>검사 결과: 등록 가능 ${ok}명 · 오류 ${MB_BULK.length - ok}행</b> — [검사 통과 행 등록]을 누르면 등록됩니다.</p>` + table(['행', '이름', '이메일', '결과'], MB_BULK.map(r => [r.row, esc(r.name || ''), esc(r.email || ''), r.err ? tag(r.err, 'r') + (r.dup ? ' <button type="button" class="btn sm" data-act="mb-invtab" data-v="link">초대 링크 보내기</button>' : '') : tag('통과', 'g')])); }); });
ACT['bulk-tpl'] = () => downloadCSV('일괄가입_양식.csv', ['이름', '닉네임', '이메일', '비밀번호', '연락처', ...S.settings.extraQ], [['홍길동', '길동', 'hong@example.com', 'Abcd1234!', '010-0000-0000', ...S.settings.extraQ.map(() => '')]]);

/* ═════════ 운영자 · 권한(회원 검색 추가 · 강사 담당 클래스 · 기관 담당자) ═════════ */
ROLE.orgmgr = '기관 담당자';
const mbAdmCls = a => S.classes.filter(c => a.classes.includes(c.id));
VIEWS.admins = () => { mbEnsure(); const own = owner();
  return head('운영자 · 권한', `정운영자 · 부운영자(매출 제외) · ${esc(t('teacher'))}(담당 ${esc(t('cls'))}만) · 기관 담당자(담당 기관 상세만) ${guideRef('features/member/administrator.md')}`, own ? `<button class="btn pri" data-act="adm-new">+ 운영자 추가</button>` : '') +
    table(['이름', '이메일 · 연락처', '권한', '담당', ''], S.admins.map(a => [esc(a.name), esc([a.email, a.phone].filter(Boolean).join(' · ')), tag(rl(a.role), a.role === 'owner' ? 'g' : a.role === 'orgmgr' ? 'mg' : ''),
      a.role === 'teacher' ? `${mbAdmCls(a).map(c => tag(c.name)).join(' ') || '<span class="mini">미지정</span>'} ${own ? `<button class="btn sm" data-act="mb-tcls" data-v="${a.id}">담당 ${esc(t('cls'))} 설정</button>` : ''}` : a.role === 'orgmgr' ? (S.orgs.filter(o => o.mgrId === a.id).map(o => tag(o.name)).join(' ') || '<span class="mini">기관 관리에서 담당 지정</span>') : '전체',
      own && a.role !== 'owner' ? `<select data-chg="adm-role" data-v="${a.id}" aria-label="권한 변경">${['sub', 'teacher', 'orgmgr'].map(r => `<option value="${r}" ${a.role === r ? 'selected' : ''}>${esc(rl(r))}</option>`).join('')}</select>${a.role === 'teacher' ? `<button class="btn sm ghost" data-act="as-teacher" data-v="${a.id}">이 ${esc(t('teacher'))} 화면으로 보기</button>` : ''}<button class="btn sm ghost" data-act="adm-owner" data-v="${a.id}">정운영자 위임</button><button class="btn sm ghost" data-act="adm-del" data-v="${a.id}">권한 삭제</button>` : ''])) +
    `<div class="card"><div class="ch"><b>메뉴별 권한</b><small>운영자 지정은 정운영자만 · 부운영자 · ${esc(t('teacher'))} 수 제한 없음 · 권한을 삭제하면 정회원으로 전환됩니다</small></div>${table(['메뉴', '정운영자', '부운영자', t('teacher'), '기관 담당자'], ['class', 'members', 'message', 'community', 'sales', 'site', 'org', 'settings', 'plan'].filter(id => MENU[id] || ['settings', 'plan'].includes(id)).map(id => [esc(mlabel(id)), '○', ['sales', 'plan'].includes(id) ? '×' : '○', ['class', 'members', 'community', 'message'].includes(id) ? (id === 'message' ? '○ (내역 보기 ×)' : '담당 범위') : '×', id === 'org' ? '담당 기관 상세만' : '×']))}</div>` +
    `<div class="card"><div class="ch"><b>감사 로그</b><small>최근 20건</small></div>${table(['시각', '운영자', '작업'], S.audit.slice(0, 20).map(a => [esc(a.at), esc(a.who), esc(a.what)]))}</div>`; };
ACT['adm-new'] = () => { if (!owner()) { toast('운영자 지정은 정운영자만 할 수 있습니다.', 'warn'); return; } const L = S.members.filter(m => !S.admins.some(a => a.email && a.email === m.email));
  modal('운영자 추가', `<label class="fl">권한<select name="r"><option value="sub">부운영자</option><option value="teacher">${esc(t('teacher'))}</option><option value="orgmgr">기관 담당자</option></select></label>
    <div class="fl"><span>기존 회원에서 선택(닉네임 · 전화번호 검색)</span><input type="search" id="mbAq" placeholder="닉네임 · 이름 · 전화번호" aria-label="회원 검색"><div class="mb-pick">${L.length ? L.slice(0, 300).map(m => `<label class="ckl" data-k="${esc([m.name, m.nick, m.phone, m.sid].join(' ').toLowerCase())}"><input type="radio" name="m" value="${m.id}"> ${esc(m.nick || m.name)} <small class="mini">${esc(m.name)}${m.phone ? ' · ' + esc(m.phone) : ''}</small></label>`).join('') : '<p class="mini">회원이 없습니다. 아래에 직접 입력하세요.</p>'}</div></div>
    <details class="mb-det"><summary>회원이 아닌 사람 직접 입력</summary><div class="form2"><label>이름<input name="n" maxlength="20"></label><label>이메일<input name="e" type="email" maxlength="60"></label></div></details>
    ${S.classes.length ? `<div class="fl"><span>담당 ${esc(t('cls'))}(${esc(t('teacher'))}일 때)</span><div class="mb-pick sm">${S.classes.map(c => `<label class="ckl"><input type="checkbox" name="c" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div></div>` : ''}`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { const mid = (w.querySelector('[name=m]:checked') || {}).value; const m = mid && M(mid); const name = m ? (m.nick || m.name) : fv(w, 'n'), email = m ? (m.email || '') : fv(w, 'e'); const role = fv(w, 'r');
    if (!name || (!m && !MB_MAIL_RE.test(email))) { toast('회원을 고르거나 이름 · 이메일을 입력하세요.', 'warn'); return false; }
    const a = { id: uid('a'), name, email, phone: m ? m.phone || '' : '', role, member: m ? m.id : '', classes: role === 'teacher' ? [...w.querySelectorAll('[name=c]:checked')].map(x => x.value) : [] }; S.admins.push(a); mbTSync(a);
    if (m) mbInbox(m.id, '운영자 권한이 부여되었습니다', `${rl(role)} 권한으로 스튜디오를 이용할 수 있습니다.`); logAudit(`운영자 추가 — ${name}(${rl(role)})`); save(); render(); } }], true); };
function mbTSync(a) { S.classes.forEach(c => { c.teachers = Array.isArray(c.teachers) ? c.teachers : []; const has = c.teachers.includes(a.id); const want = a.role === 'teacher' && a.classes.includes(c.id); if (want && !has) { c.teachers.push(a.id); if (!c.teacher) c.teacher = a.name; } if (!want && has) c.teachers = c.teachers.filter(x => x !== a.id); }); }
ACT['mb-tcls'] = el => { const a = S.admins.find(x => x.id === el.dataset.v); if (!a) return;
  modal(`담당 ${t('cls')} — ${a.name}`, S.classes.length ? `<p class="mini">${esc(t('teacher'))}는 담당 ${esc(t('cls'))}의 ${esc(t('learner'))} 관리 · 공지 · 커뮤니티만 이용할 수 있습니다.</p><div class="mb-pick">${S.classes.map(c => `<label class="ckl"><input type="checkbox" name="c" value="${c.id}" ${a.classes.includes(c.id) ? 'checked' : ''}> ${esc(c.name)} <small class="mini">${esc(c.status || '')}</small></label>`).join('')}</div>` : `<div class="empty">먼저 ${esc(tj('cls', '을'))} 만드세요.</div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { a.classes = [...w.querySelectorAll('[name=c]:checked')].map(x => x.value); mbTSync(a); logAudit(`담당 ${t('cls')} 설정 — ${a.name} ${a.classes.length}개`); save(); render(); toast('담당을 저장했습니다.', 'ok'); } }]); };
{ const base = ACT['adm-role']; ACT['adm-role'] = el => { base(el); const a = S.admins.find(x => x.id === el.dataset.v); if (a) { mbTSync(a); if (a.role !== 'orgmgr') S.orgs.forEach(o => { if (o.mgrId === a.id) { o.mgrId = ''; } }); save(); } }; }
ACT['adm-del'] = el => { const a = S.admins.find(x => x.id === el.dataset.v); if (!a) return; modal('운영자 권한 삭제', `<p><b>${esc(a.name)}</b>님의 ${esc(rl(a.role))} 권한을 삭제합니다. 삭제하면 일반 ${esc(t('learner'))}(정회원)으로 바뀝니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => {
  S.admins = S.admins.filter(x => x !== a); a.classes = []; a.role = ''; mbTSync(a); S.orgs.forEach(o => { if (o.mgrId === a.id) o.mgrId = ''; });
  if (!mbUniv()) { let m = (a.member && M(a.member)) || (a.email && S.members.find(x => (x.email || '').toLowerCase() === a.email.toLowerCase())); if (m) m.grade = '정회원'; else if (a.email) S.members.push({ id: uid('m'), sid: mbSid(a.email), name: a.name, nick: a.name, email: a.email, phone: a.phone || '', group: '', grade: '정회원', joined: today(), last: today(), extra: {}, src: 'admin' }); }
  logAudit(`운영자 권한 삭제 — ${a.name}(정회원 전환)`); save(); render(); toast('권한을 삭제하고 정회원으로 전환했습니다.', 'ok'); } }]); };

/* ═════════ 기관 관리(LMS) ═════════ */
const mbOrgSum = o => { const E = o.entries || []; const n = E.length ? E.reduce((s, e) => s + (+e.n || 0), 0) : +o.n || 0; const d = E.length ? E.reduce((s, e) => s + (+e.done || 0), 0) : +o.done || 0; const j = E.length ? E.reduce((s, e) => s + (+e.job || 0), 0) : +o.job || 0; return { cls: E.length, n, done: d, job: j, rate: n ? Math.round(d / n * 100) : 0 }; };
const mbOrgVis = () => { const as = UI.mbOrgAs || (S.me.role === 'orgmgr' ? (S.admins.find(a => a.name === S.me.name) || {}).id : ''); return as ? S.orgs.filter(o => o.mgrId === as) : S.orgs; };
VIEWS.org = () => { mbEnsure(); const o = UI.mbOrg && S.orgs.find(x => x.id === UI.mbOrg); const as = UI.mbOrgAs || ''; const lim = !!as || S.me.role === 'orgmgr'; if (o && (!lim || mbOrgVis().includes(o))) return mbOrgDetail(o, lim);
  const mg = S.admins.filter(a => a.role === 'orgmgr'); const L = mbOrgVis();
  return head('기관 관리', `기관 지정 · 기관 담당자(담당 기관 상세만 접근) · 클래스별 기간 · 인원 · 수료 · 취업 ${guideRef('features/lms.md')}`, (lim ? '' : `<button class="btn pri" data-act="mb-org" data-v="">+ 기관 지정</button>`)) +
    (owner() ? `<div class="bar2"><label class="mini">화면 보기 <select data-chg="mb-orgas" aria-label="기관 담당자 화면으로 보기"><option value="">정운영자(전체)</option>${mg.map(a => `<option value="${a.id}" ${as === a.id ? 'selected' : ''}>기관 담당자 — ${esc(a.name)}</option>`).join('')}</select></label>${mg.length ? '' : '<small class="mini">기관 담당자는 운영자 · 권한에서 역할을 \'기관 담당자\'로 지정합니다.</small>'}</div>` : '') +
    table(['', '기관', '담당자', '연락처', '회원 수', '운영 클래스', '평균 수료율', '취업', ''], L.map(o => { const s = mbOrgSum(o); const a = S.admins.find(x => x.id === o.mgrId); return [o.logo ? `<img class="mb-logo" src="${esc(o.logo)}" alt="">` : '<span class="mb-logo none"></span>', `<a href="#" data-act="mb-orgopen" data-v="${o.id}"><b>${esc(o.name)}</b></a>`, esc(a ? a.name : o.mgr || '미지정'), esc([o.tel, o.email].filter(Boolean).join(' · ') || '—'), s.n + '명', s.cls + '개', s.n ? s.rate + '%' : '—', s.job + '명', `<button class="btn sm ghost" data-act="mb-orgopen" data-v="${o.id}">상세</button>`]; }), lim ? '담당 기관이 없습니다.' : '지정된 기관이 없습니다.'); };
function mbOrgDetail(o, lim) { const s = mbOrgSum(o); const a = S.admins.find(x => x.id === o.mgrId);
  return `<button class="link back" data-act="mb-orgback">← 기관 목록</button>` + headD(o.name, `담당 ${esc(a ? a.name : o.mgr || '미지정')}${o.tel ? ' · ' + esc(o.tel) : ''}${o.email ? ' · ' + esc(o.email) : ''}`, (lim ? '' : `<button class="btn" data-act="mb-org" data-v="${o.id}">기관 정보 수정</button>`) + `<button class="btn pri" data-act="mb-oe" data-o="${o.id}" data-v="">+ 클래스 항목 추가</button>`) +
    `<div class="kpis">${kpi('총 클래스', s.cls + '개')}${kpi('수강생', s.n + '명')}${kpi('수료', s.done + '명', s.n ? `수료율 ${s.rate}%` : '')}${kpi('취업', s.job + '명', s.done ? `수료자 대비 ${Math.round(s.job / Math.max(1, s.done) * 100)}%` : '')}</div>` +
    table(['클래스명', '교육기관', '교육 기간', '교육 인원', '수료', '취업', ''], (o.entries || []).map(e => [`<a href="#" data-act="mb-oe" data-o="${o.id}" data-v="${e.id}">${esc(e.cls)}</a>`, esc(e.inst || o.name), esc(`${e.from || ''} ~ ${e.to || ''}`), (+e.n || 0) + '명', (+e.done || 0) + '명', (+e.job || 0) + '명', `<button class="btn sm ghost" data-act="mb-oe" data-o="${o.id}" data-v="${e.id}">수정</button>`]), '클래스 항목이 없습니다. [+ 클래스 항목 추가]로 교육 기간 · 인원 · 수료 · 취업 데이터를 입력하세요.') +
    (lim ? '' : `<div class="danger"><button class="btn sm red" data-act="mb-orgdel" data-v="${o.id}">기관 삭제</button></div>`); }
ACT['mb-orgas'] = el => { UI.mbOrgAs = el.value; UI.mbOrg = null; render(); };
ACT['mb-orgopen'] = el => { UI.mbOrg = el.dataset.v; render(); };
ACT['mb-orgback'] = () => { UI.mbOrg = null; render(); };
let MB_LOGO = null;
ACT['mb-org'] = el => { const o = el.dataset.v ? S.orgs.find(x => x.id === el.dataset.v) : null; MB_LOGO = o ? o.logo || '' : ''; const mg = S.admins.filter(a => a.role === 'orgmgr');
  modal(o ? '기관 정보 수정' : '기관 지정', `<div class="mb-logorow"><span id="mbLogoPv">${MB_LOGO ? `<img class="mb-logo lg" src="${esc(MB_LOGO)}" alt="">` : '<span class="mb-logo lg none"></span>'}</span><label class="btn sm">이미지 선택<input type="file" id="mbLogoF" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label><small class="mini">PNG · JPG · WEBP · SVG, 200KB 이하</small></div>
    <div class="form2"><label>기관명<input name="n" maxlength="30" value="${esc(o ? o.name : '')}"></label><label>담당자<select name="m"><option value="">미지정</option>${mg.map(a => `<option value="${a.id}" ${o && o.mgrId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label><label>연락처<input name="tel" maxlength="13" value="${esc(o ? o.tel || '' : '')}" placeholder="02-000-0000"></label><label>이메일<input name="e" type="email" maxlength="60" value="${esc(o ? o.email || '' : '')}"></label></div>
    <p class="mini">담당자는 운영자 · 권한에서 '기관 담당자'로 등록된 운영자만 고를 수 있습니다${mg.length ? '' : '(아직 없음)'}. 기관 담당자는 담당 기관의 상세 페이지에만 접근해 학습 데이터를 입력합니다.</p>`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: o ? '저장' : '지정', kind: 'pri', run: w => { const n = fv(w, 'n'); if (!n) { toast('기관명을 입력하세요.', 'warn'); return false; } if (S.orgs.some(x => x !== o && x.name === n)) { toast('이미 있는 기관명입니다.', 'warn'); return false; } const e = fv(w, 'e'); if (e && !MB_MAIL_RE.test(e)) { toast('이메일 형식을 확인하세요.', 'warn'); return false; }
    const mgr = S.admins.find(a => a.id === fv(w, 'm')); const x = o || { id: uid('o'), n: 0, done: 0, job: 0, entries: [] }; Object.assign(x, { name: n, mgrId: mgr ? mgr.id : '', mgr: mgr ? mgr.name : '미지정', tel: fv(w, 'tel'), email: e, logo: MB_LOGO || '' }); if (!o) S.orgs.push(x); logAudit(`기관 ${o ? '수정' : '지정'} — ${n}`); save(); render(); } }]); };
document.addEventListener('change', e => { if (!e.target || e.target.id !== 'mbLogoF') return; const f = e.target.files[0]; if (!f) return; if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) { toast('PNG · JPG · WEBP · SVG 이미지만 올릴 수 있습니다.', 'warn'); return; } if (f.size > 200 * 1024) { toast('200KB 이하 이미지만 올릴 수 있습니다.', 'warn'); return; }
  const r = new FileReader(); r.onload = () => { MB_LOGO = String(r.result); const pv = $('#mbLogoPv'); if (pv) pv.innerHTML = `<img class="mb-logo lg" src="${esc(MB_LOGO)}" alt="">`; }; r.readAsDataURL(f); });
ACT['mb-oe'] = el => { const o = S.orgs.find(x => x.id === el.dataset.o); if (!o) return; const e = el.dataset.v ? o.entries.find(x => x.id === el.dataset.v) : null;
  modal(e ? '클래스 항목 수정' : '클래스 항목 추가', `<div class="form2"><label>클래스명<input name="c" maxlength="40" list="mbOeL" value="${esc(e ? e.cls : '')}"></label><datalist id="mbOeL">${S.classes.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist><label>교육기관명<input name="i" maxlength="30" value="${esc(e ? e.inst : o.name)}"></label><label>교육 시작<input type="date" name="f" value="${esc(e ? e.from : '')}"></label><label>교육 종료<input type="date" name="t" value="${esc(e ? e.to : '')}"></label><label>교육 인원<input type="number" min="0" max="100000" name="n" value="${e ? +e.n || 0 : ''}"></label><label>수료 인원<input type="number" min="0" name="d" value="${e ? +e.done || 0 : ''}"></label><label>취업 인원<input type="number" min="0" name="j" value="${e ? +e.job || 0 : ''}"></label></div>`,
    [{ id: 'c', label: '취소' }, ...(e ? [{ id: 'del', label: '항목 삭제', kind: 'red', run: () => { o.entries = o.entries.filter(x => x !== e); save(); render(); } }] : []), { id: 'ok', label: '저장', kind: 'pri', run: w => { const v = { cls: fv(w, 'c'), inst: fv(w, 'i'), from: fv(w, 'f'), to: fv(w, 't'), n: Math.max(0, +fv(w, 'n') || 0), done: Math.max(0, +fv(w, 'd') || 0), job: Math.max(0, +fv(w, 'j') || 0) };
      if (!v.cls) { toast('클래스명을 입력하세요.', 'warn'); return false; } if (v.from && v.to && v.from > v.to) { toast('교육 기간을 확인하세요.', 'warn'); return false; } if (v.done > v.n) { toast('수료 인원은 교육 인원보다 많을 수 없습니다.', 'warn'); return false; } if (v.job > v.n) { toast('취업 인원은 교육 인원보다 많을 수 없습니다.', 'warn'); return false; }
      if (e) Object.assign(e, v); else o.entries.push({ id: uid('oe'), ...v }); const s = mbOrgSum(o); Object.assign(o, { n: s.n, done: s.done, job: s.job }); logAudit(`기관 클래스 항목 ${e ? '수정' : '추가'} — ${o.name} · ${v.cls}`); save(); render(); } }]); };
ACT['mb-orgdel'] = el => { const o = S.orgs.find(x => x.id === el.dataset.v); if (!o) return; modal('기관 삭제', `<p><b>${esc(o.name)}</b>과 클래스 항목 ${o.entries.length}건을 삭제합니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { S.orgs = S.orgs.filter(x => x !== o); UI.mbOrg = null; logAudit('기관 삭제 — ' + o.name); save(); render(); } }]); };

/* ═════════ 시작 가이드: 기관 유형별 단계(레거시 온보딩 순서) ═════════ */
const MB_STEPS = [
  { after: 'site', id: 'mkt', n: '마케팅 세팅', d: '검색 노출(SEO) · 네이버 플레이스 · 픽셀', view: 'site', types: ['k12', 'adult', 'lifelong'] },
  { after: 'course', id: 'recruit', n: () => `${t('learner')} 모집`, d: '사전 수강신청 · 모집 기간 · 팝업', view: 'class', types: ['adult', 'public', 'lifelong'] },
  { after: 'course', id: 'pg', n: '매출 · 청구 세팅', d: '토스페이먼츠 가입 신청 · 청구서', view: 'sales', types: ['k12', 'adult', 'lifelong', 'voc'] },
  { after: 'pg', id: 'consult', n: '상담 연동', d: '채널톡 · 카카오 채널 · 상담 카테고리', view: 'consult', types: ['k12', 'adult'] },
  { after: 'people', id: 'team', n: () => `${t('group')} 등록`, d: () => `${t('group')} 만들기 · ${t('learner')} 배정`, view: 'groups', types: ['corp', 'public', 'voc', 'k12'] },
  { after: 'people', id: 'admins', n: () => `운영자 · ${t('teacher')}`, d: () => `부운영자 · ${t('teacher')} 지정 · 담당 ${t('cls')}`, view: 'admins', types: ['k12', 'adult', 'corp', 'public', 'lifelong', 'voc', 'univ'] },
  { after: 'admins', id: 'parents', n: '보호자 연결', d: '보호자 연락처 · 출결 · 청구 알림', view: 'parents', types: ['k12'] },
  { after: 'parents', id: 'comm', n: '소통 세팅', d: '메시지 · 공지 · 커뮤니티 게시판', view: 'message', types: ['k12', 'adult', 'lifelong'] }
];
MB_STEPS.forEach(x => { if (BLD_STEPS.some(s => s.id === x.id)) return; const s = { id: x.id, n: x.n, d: x.d, view: x.view, def: ty => x.types.includes(ty) };
  Object.defineProperty(s, 'only', { get: () => (typeof S !== 'undefined' && S && S.org && x.types.includes(S.org.type)) ? S.org.type : '-none-', enumerable: true });
  if (typeof x.d === 'function') Object.defineProperty(s, 'd', { get: x.d, enumerable: true });
  const i = BLD_STEPS.findIndex(y => y.id === x.after); BLD_STEPS.splice(i < 0 ? BLD_STEPS.length : i + 1, 0, s); });
{ const base = bQ; bQ = id => ({ mkt: ['홈페이지 SEO 제목 · 설명 만들어줘'], recruit: [`${t('cls')} 모집 기간이랑 얼리버드 설정할게`], pg: ['토스페이먼츠 결제 연결 도와줘', '결제 연결은 나중에 할게'], consult: ['채널톡 연동할게'], team: [`${t('group')} 3개 만들어줘`], admins: [`${t('teacher')} 추가하고 담당 ${t('cls')} 지정할게`], parents: ['보호자 연결 요청 보내줘'], comm: ['수강생 전체에 공지 메시지 보내줘'] })[id] || base(id); }
{ const base = bGuideText; bGuideText = id => ({
  mkt: '포털 검색에 홈페이지가 노출되도록 SEO 제목 · 설명 · 키워드와 네이버 플레이스 · 픽셀 코드를 설정합니다. 홈페이지 › 설정에서 입력하거나 "SEO 제안해줘"라고 말씀하세요.',
  recruit: `사전 수강신청(모집 기간 · 인원 · 얼리버드 할인)과 팝업으로 ${tj('learner', '을')} 모읍니다. ${t('cls')} 설정의 판매 · 모집에서 정합니다.`,
  pg: '유료 클래스 · 교재를 팔려면 토스페이먼츠 가입을 신청합니다. 신청하면 이 단계는 끝나고, 심사(최대 4주)가 끝나는 날 학습자 결제가 자동으로 열립니다. 그전까지 학습자 화면에는 \'결제 준비 중\'으로 보입니다.',
  consult: '채널톡 · 카카오 비즈니스 채널을 연동하면 상담 내용이 스튜디오에 모이고 AI가 요약합니다. 상담 카테고리는 상위 > 하위 2단계입니다.',
  team: `${tj('group', '을')} 만들고 ${tj('learner', '을')} 배정하면 ${t('group')} 단위로 수강 권한 · 메시지를 보낼 수 있습니다. 이름은 중복될 수 없습니다.`,
  admins: `부운영자(매출 제외) · ${t('teacher')}(담당 ${t('cls')}만)를 기존 회원에서 검색해 지정하고, ${t('teacher')}에게 담당 ${tj('cls', '을')} 정해 주세요. 지정은 정운영자만 할 수 있습니다.`,
  parents: '회원 상세의 [보호자 +]로 보호자 이름 · 연락처를 입력하면 연결 안내가 갑니다. 연결된 보호자는 출결 · 청구서 · 수업일 변경 알림을 받습니다.',
  comm: '메시지(개별 · 반 · 클래스 · 보호자 포함), 공지, 커뮤니티 게시판으로 소통합니다. 학습자는 학습자 사이트 알림함에서 확인합니다.'
})[id] || base(id); }
const mbTcnt = () => S.admins.filter(a => a.role === 'teacher').reduce((n, a) => n + (a.classes || []).length, 0);
const MB_AUTO = { team: () => S.groups.length > (S.bld.base2?.team ?? 0), admins: () => S.admins.length > (S.bld.base2?.admins ?? 1) || mbTcnt() > (S.bld.base2?.tcls ?? 0), parents: () => S.parents.some(p => p.by === 'admin' && p.at), pg: () => ['심사중', '승인'].includes(S.settings.pgInfo?.status) || (S.bills || []).length > (S.bld.base2?.bills ?? 0), mkt: () => !!(S.settings.seo?.title && S.settings.seo?.desc), consult: () => !!(S.settings.consultKeys || S.settings.kakao), comm: () => (S.msgs || []).length > (S.bld.base2?.msgs ?? 0) };
AFTER.unshift(() => { if (S && S.org && S.settings && !S.settings.acct) { mbEnsure(); save(); } if (!S || !S.org || !S.bld || !S.bld.steps) return; let ch = 0; const ty = S.org.type;
  if (!S.bld.base2) { S.bld.base2 = { tcls: mbTcnt(), team: S.groups.length, admins: S.admins.length, bills: (S.bills || []).length, msgs: (S.msgs || []).length }; ch = 1; }
  MB_STEPS.forEach(x => { if (!x.types.includes(ty)) return; const st = S.bld.steps[x.id]; if (!st) { S.bld.steps[x.id] = { on: true, done: false }; ch = 1; return; } if (st.on && !st.done && MB_AUTO[x.id]) { try { if (MB_AUTO[x.id]()) { st.done = true; ch = 1; } } catch (e) { } } });
  if (ch) save(); });

/* ═════════ 학습자 스냅샷: 가입 · 계정 설정(공개 부분) ═════════ */
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { mbEnsure(); const A = S.settings.acct; const T = S.settings.terms || {};
  r.acct = { mode: A.mode, social: A.social.slice(), approve: A.approve, verify: !!A.verify, under14: !!A.under14, parent: !!A.parent && mbGuardOn(), editAns: !!A.editAns, extraQ: A.extraQ.map(x => ({ q: x.q, type: x.type, req: !!x.req, opts: (x.opts || []).slice(), ...(x.help ? { help: x.help } : {}) })), policy: { tos: String(T.tos || '').slice(0, 6000), privacy: String(T.privacy || '').slice(0, 6000) } }; } catch (e) { console.error(e); } return r; }; }

/* 학습 기록 동기화(lpApply)가 보호자 계정 기록으로 가짜 학습자를 만들지 않게 */
{ const base = lpApply; lpApply = (...a) => { const n = base(...a); try { if (S && (S.pacct || []).length) { const ps = new Set(S.pacct.map(p => p.sid)); const bad = S.members.filter(m => ps.has(m.sid) && !m.acct); if (bad.length) mbRemove(bad.map(m => m.id)); } } catch (e) { console.error(e); } return n; }; }

/* ═════════ 학습자 → 운영자 큐(LPX) ═════════ */
const mbBySid = sid => S.members.find(m => m.sid === sid) || null;
LPX['acct-join'] = x => { mbEnsure(); const d = x.data || {}; const A = S.settings.acct; const U = mbUniv(); const email = String(d.email || '').toLowerCase().slice(0, 80);
  const iv = d.token ? S.invites.find(i => i.token === d.token && i.active) : null;
  if (d.kind === 'parent') { if (S.pacct.some(p => p.email === email)) return; const pa = { id: uid('pa'), sid: d.sid, name: String(d.name || d.nick || '').slice(0, 20), nick: String(d.nick || '').slice(0, 20), phone: mbPhone(d.phone), email, login: d.login || 'email', pw: d.pw || '', verified: !!d.verified, joined: today(), links: [d.login || 'email'] }; S.pacct.push(pa);
    S.parents.filter(p => p.phone === pa.phone && !p.acct).forEach(p => { p.acct = pa.id; mbInbox(pa.id, '가족 연결 요청', `${S.org.name}에서 ${M(p.child)?.name || ''} ${t('learner')}의 보호자로 연결을 요청했습니다.`, { href: '#family' }); });
    if (iv) iv.uses++; logAudit(`보호자 계정 가입 — ${pa.name}`); toast(`보호자 계정 가입 1건 — ${pa.name}`, 'ok'); return; }
  const exist = S.members.find(m => (email && (m.email || '').toLowerCase() === email && m.acct) || (d.sid && m.sid === d.sid && m.acct)); if (exist) return;
  const grade = iv ? (d.verified || !A.verify || U ? '정회원' : '준회원') : A.mode === 'invite' ? '승인 대기' : A.approve === 'manual' ? '승인 대기' : (d.verified || !A.verify || U ? '정회원' : '준회원');
  const extra = {}; A.extraQ.forEach(q => { const v = (d.extra || {})[q.q]; if (v == null || v === '') return; extra[q.q] = q.type === 'file' && v && typeof v === 'object' ? { file: { name: String(v.name || '').slice(0, 120), size: +v.size || 0, type: String(v.type || '').slice(0, 60) } } : String(v).slice(0, 200); });
  if (U) { extra['학번'] = d.sid; if (d.dept) extra['학과'] = String(d.dept).slice(0, 30); }
  let m = mbBySid(d.sid); /* 학습 기록 동기화(lpApply)가 먼저 만든 회원이면 합칩니다 */
  if (!m) { m = { id: uid('m'), sid: d.sid, group: '', last: today() }; S.members.push(m); }
  const grp = U && d.dept ? (S.groups.find(g => g.name === d.dept) || {}).id : '';
  Object.assign(m, { name: U ? d.sid : String(d.name || d.nick || '').slice(0, 20), nick: U ? '' : String(d.nick || '').slice(0, 20), email: U ? '' : email, phone: U ? '' : mbPhone(d.phone), group: m.group || grp || '', grade, joined: today(), extra, src: iv ? 'invite' : 'self',
    acct: { login: d.login || 'email', email: U ? '' : email, phone: U ? '' : mbPhone(d.phone), pw: d.pw || '', verified: !!d.verified, verifiedBy: d.verifiedBy || '', joined: today(), minor: !!d.minor, guardian: d.minor ? { name: String(d.guardian?.name || '').slice(0, 20), phone: mbPhone(d.guardian?.phone) } : null, consent: { tos: !!d.consent?.tos, privacy: !!d.consent?.privacy, mkt: !!d.consent?.mkt, at: x.at }, links: [d.login || 'email'], photo: '' } });
  if (iv) { iv.uses++; if (iv.target === 'student' && iv.cls) { const c = C(iv.cls); if (c && !c.learners.includes(m.id)) { c.learners.push(m.id); c.prog = c.prog || {}; c.prog[m.id] = c.prog[m.id] || { p: 0, exam: null, assign: 'none', att: 0 }; if (c.enr) c.enr[m.id] = { at: today(), end: null, src: 'invite', status: 'active', paid: null }; } }
    if (iv.target === 'admin') S.admins.push({ id: uid('a'), name: m.nick || m.name, email, phone: m.phone, role: iv.role || 'sub', member: m.id, classes: [] }); }
  /* v32.8 기업 · 공공: 가입한 임직원 · 교육생에게 법정(필수)교육을 바로 배정하고, 부서 · 소속 답변을 조직에 연결(QA U3 · U7) */
  if (['corp', 'public'].includes(S.org.type) && grade !== '승인 대기' && (!iv || iv.target !== 'admin')) {
    if (!m.group) { const dv = String(extra['부서'] || extra['소속'] || '').trim(); const g = dv && S.groups.find(x => x.name === dv || x.name.includes(dv) || dv.includes(x.name)); if (g) m.group = g.id; }
    S.classes.filter(c => c.legal && c.status !== '종료').forEach(c => { if (c.learners.includes(m.id)) return; c.learners.push(m.id); c.prog = c.prog || {}; c.prog[m.id] = c.prog[m.id] || { p: 0, exam: null, assign: 'none', att: 0 }; if (c.enr) c.enr[m.id] = { at: today(), end: c.end || null, src: 'auto-legal', status: 'active', paid: null }; }); }
  mbInbox(m.id, grade === '승인 대기' ? '가입 신청이 접수되었습니다' : `${S.org.name}에 오신 것을 환영합니다`, grade === '승인 대기' ? '운영자 승인 후 이용할 수 있습니다.' : grade === '준회원' ? '본인인증을 마치면 정회원이 됩니다.' : '지금 바로 학습을 시작하세요.');
  logAudit(`학습자 가입 — ${m.nick || m.name}(${grade})`); toast(`새 가입 1건 — ${m.nick || m.name} · ${grade}`, grade === '승인 대기' ? 'warn' : 'ok'); };
LPX['acct-verify'] = x => { const m = mbBySid(x.data?.sid || x.who); if (!m) return; m.acct = m.acct || {}; m.acct.verified = true; m.acct.verifiedBy = x.data?.by || 'pass'; if (x.data?.phone && !mbUniv()) { m.phone = mbPhone(x.data.phone); m.acct.phone = m.phone; } if (m.grade === '준회원') { m.grade = '정회원'; mbInbox(m.id, '정회원이 되었습니다', '본인인증을 완료해 모든 기능을 이용할 수 있습니다.'); } logAudit(`본인인증 — ${m.nick || m.name}`); };
LPX['acct-pw'] = x => { const d = x.data || {}; /* v25 다른 계정 비밀번호 바꾸기 차단: 로그인 상태면 본인(who)만, 대상은 번호와 이메일이 모두 맞아야 함 */ if (!d.sid || (x.who && x.who !== d.sid)) return; const id = String(d.email || '').toLowerCase(); const m = S.members.find(y => y.acct && y.sid === d.sid && (!id || (y.acct.email || '').toLowerCase() === id)); const p = S.pacct.find(y => y.sid === d.sid && (!id || String(y.email || '').toLowerCase() === id)); const t0 = m ? m.acct : p; if (!t0 || !d.pw) return; t0.prevPw = t0.pw || ''; t0.pw = d.pw; if (m && !(m.acct.links || []).includes('email')) m.acct.links = [...(m.acct.links || []), 'email']; logAudit(`비밀번호 ${d.reset ? '재설정' : '변경'} — ${(m && (m.nick || m.name)) || (p && p.name)}`); };
LPX['acct-profile'] = x => { const d = x.data || {}; const m = mbBySid(d.sid || x.who); const p = !m && S.pacct.find(y => y.sid === (d.sid || x.who)); const T = m || p; if (!T) return; const A = S.settings.acct;
  if (d.nick && MB_NICK_RE.test(d.nick) && !mbUniv()) { if (m) { m.acct = m.acct || {}; const mon = today().slice(0, 7); m.acct.nickLog = (m.acct.nickLog || []).filter(z => String(z).startsWith(mon)); if (m.acct.nickLog.length < 5 && m.nick !== d.nick) { m.acct.nickLog.push(today()); m.nick = d.nick; } } else p.nick = d.nick; }
  if (d.phone && MB_PHONE_RE.test(d.phone) && !mbUniv()) { T.phone = mbPhone(d.phone); if (m) { m.acct.phone = T.phone; m.acct.verified = true; } }
  if (d.photo !== undefined && m) m.acct.photo = String(d.photo || '').length <= 280000 ? String(d.photo || '') : m.acct.photo;
  if (Array.isArray(d.links) && m) m.acct.links = d.links.filter(k => MB_LOGIN[k]).slice(0, 6);
  if (d.extra && m && A.editAns) A.extraQ.forEach(q => { if (!(q.q in d.extra) || (mbUniv() && ['학번'].includes(q.q))) return; const v = d.extra[q.q]; m.extra = m.extra || {}; m.extra[q.q] = q.type === 'file' && v && typeof v === 'object' ? { file: { name: String(v.name || '').slice(0, 120), size: +v.size || 0, type: String(v.type || '').slice(0, 60) } } : String(v || '').slice(0, 200); });
  logAudit(`회원정보 수정 — ${T.nick || T.name}`); };
LPX['acct-leave'] = x => { const m = mbBySid(x.data?.sid || x.who); if (m) { mbRemove([m.id]); logAudit(`홈페이지 탈퇴 — ${m.nick || m.name}${x.data?.reason ? ' · ' + x.data.reason : ''}`); toast(`회원 탈퇴 1건 — ${m.nick || m.name}`); return; } const p = S.pacct.find(y => y.sid === (x.data?.sid || x.who)); if (p) { S.pacct = S.pacct.filter(y => y !== p); S.parents.forEach(z => { if (z.acct === p.id) z.acct = ''; }); logAudit('보호자 계정 탈퇴 — ' + p.name); } };
LPX['acct-del'] = x => LPX['acct-leave'](x);
LPX['acct-inq'] = x => { const d = x.data || {}; S.acctInq.unshift({ id: uid('aq'), at: nowStr(), kind: d.kind || '계정 찾기 문의', name: String(d.name || '').slice(0, 20), phone: String(d.phone || '').slice(0, 13), id: String(d.id || '').slice(0, 60), body: String(d.body || '').slice(0, 500), done: '' }); toast('계정 문의 1건이 들어왔습니다.', 'warn'); };
LPX['code-req'] = x => { const d = x.data || {}; S.acctInq.unshift({ id: uid('aq'), at: nowStr(), kind: '접근코드 재발급 요청', id: String(d.sid || '').slice(0, 20), body: String(d.dept || d.body || '').slice(0, 200), done: '' }); toast('접근코드 재발급 요청 1건', 'warn'); };
LPX['fam-req'] = x => { const d = x.data || {}; const ph = mbPhone(d.phone);
  if (d.from === 'parent') { const pa = S.pacct.find(y => y.sid === (d.sid || x.who)); const ch = S.members.find(m => m.phone === ph && (!d.name || m.name === d.name || m.nick === d.name)); if (!pa || !ch || S.parents.some(p => p.child === ch.id && p.acct === pa.id && p.status !== '거절')) return;
    S.parents.push({ id: uid('p'), child: ch.id, name: pa.name, phone: pa.phone, rel: d.rel || '보호자', status: '연결 요청', by: 'parent', at: today(), acct: pa.id }); mbInbox(ch.id, '가족 연결 요청', `${pa.name}님이 보호자로 연결을 요청했습니다. 가족 메뉴에서 수락하거나 거절하세요.`, { href: '#family' }); logAudit(`가족 연결 요청(보호자) — ${pa.name} → ${ch.name}`); return; }
  const ch = mbBySid(d.sid || x.who); if (!ch) return; const pa = S.pacct.find(y => y.phone === ph); if (S.parents.some(p => p.child === ch.id && p.phone === ph && p.status !== '거절')) return;
  S.parents.push({ id: uid('p'), child: ch.id, name: String(d.name || '').slice(0, 20), phone: ph, rel: d.rel || '보호자', status: '연결 요청', by: 'child', at: today(), acct: pa ? pa.id : '' }); if (pa) mbInbox(pa.id, '가족 연결 요청', `${ch.nick || ch.name}님이 가족 연결을 요청했습니다.`, { href: '#family' }); logAudit(`가족 연결 요청(${t('learner')}) — ${ch.name}`); };
LPX['fam-res'] = x => { const d = x.data || {}; const p = S.parents.find(y => y.id === d.pid); if (!p || p.status !== '연결 요청') return; if (!d.ok && p.by === 'admin') return; /* 운영자가 보낸 요청은 거절 불가 */
  if (d.ok) { p.status = '연결 완료'; if (d.acct) p.acct = p.acct || d.acct; } else p.status = '거절'; p.resAt = today(); mbParSync(p.child); if (p.status === '연결 완료') { mbInbox(p.child, '가족이 연결되었습니다', `${p.name}님과 연결되었습니다.`); if (p.acct) mbInbox(p.acct, '가족이 연결되었습니다', `${M(p.child)?.name || ''}님과 연결되었습니다. 자녀의 출결 · 수업을 확인할 수 있습니다.`, { href: '#family' }); } logAudit(`가족 연결 ${p.status} — ${p.name}`); };
LPX['inbox-read'] = x => { const d = x.data || {}; const L = S.inbox[d.key]; if (!L) return; L.forEach(n => { if ((d.ids || []).includes(n.id)) n.read = true; }); };
LPX['inbox-del'] = x => { const d = x.data || {}; if (!S.inbox[d.key]) return; S.inbox[d.key] = S.inbox[d.key].filter(n => !(d.ids || []).includes(n.id)); };

/* ═════════ v33 AI SAM 대화 기록 개인정보 가림(QA #61) ═════════
   저장 · 표시 · 서버 전송 전에 가린다. 순서는 주민번호 → 카드 → 휴대폰 · 전화 → 계좌(학습자 lsam.js mask와 같은 원칙: 주민번호 먼저).
   ① 모든 대화 입력의 맨 바깥(chatSend)에서 가린 뒤 넘긴다 ② 화면 그리기 전 S.chat을 다시 훑는다 ③ 기존 저장분은 불러올 때(upgradeState) 가린다. */
const SAM_PII = ['rrn', 'card', 'mobile', 'phone', 'acct'];
function samMask(s) { const t = String(s == null ? '' : s);
  if (typeof AIG === 'object' && AIG.redact) { const r = AIG.redact(t, SAM_PII); return { text: r.text, n: Object.values(r.hits).reduce((a, b) => a + b, 0) }; }
  let n = 0; const o = t.replace(/(?<!\d)\d{6}[-\s]?[1-8]\d{6}(?!\d)/g, () => (n++, '[주민등록번호 가림]')).replace(/(?<!\d)0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)/g, () => (n++, '[전화번호 가림]')); return { text: o, n }; }
function samChatScrub() { let n = 0; (S && Array.isArray(S.chat) ? S.chat : []).forEach(m => { if (!m || m.role !== 'user') return; ['text', 'md'].forEach(k => { if (typeof m[k] !== 'string') return; const r = samMask(m[k]); if (r.n) { m[k] = r.text; n += r.n; } }); }); return n; }
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (samChatScrub()) save(); } catch (e) { console.error(e); } return r; }; }
{ const base = threadHTML; threadHTML = (...a) => { try { if (samChatScrub()) save(); } catch (e) { } return base(...a); }; }
(function samWrap() { const wrap = () => { if (typeof chatSend !== 'function' || chatSend.samMasked) return; const base = chatSend;
    const f = (q, ...r) => { const m = samMask(q); if (m.n) { try { toast(`주민번호 · 전화번호 등 개인정보로 보이는 값 ${m.n}건을 가린 뒤 저장 · 전송합니다.`, 'warn'); } catch (e) { } } return base(m.text, ...r); };
    f.samMasked = true; chatSend = f; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrap); else wrap(); })();

/* ═════════ v33 강사 ↔ 학습자 메시지 왕복(QA #26) ═════════
   ① 학습자 질문: 학습자 강의 · 과제 화면 · 메시지함 → lpxPush('msg-ask', { id, cls, item, body }) → 강사 질문함(S.tq, 출처 '메시지') + 강사 알림(S.tnoti)
   ② 강사 답변(tq-send) → 학습자 메시지함 · 알림(S.inbox[회원 id], ask: 질문 id)
   ③ 재제출 요청(채점 모달 '재제출 요청') → 학습자 알림 ④ 학습자 재제출(a2-sub 2차 이상) → 강사 알림
   강사는 담당 강좌(tCls) 학습자의 질문 · 알림만 본다(pend() 필터와 같은 원칙). 운영: 같은 이벤트를 POST /api/pub/<tid>/events로 받는다. */
const mbClsTeach = cid => (S.admins || []).filter(a => a.role === 'teacher' && (a.classes || []).includes(cid));
const mbMyCids = () => S.me && S.me.role === 'teacher' && typeof tCls === 'function' ? new Set(tCls().map(c => c.id)) : null;
const mbTnoti = (cid, kind, title, body, extra = {}) => { S.tnoti = Array.isArray(S.tnoti) ? S.tnoti : []; S.tnoti.unshift({ id: uid('tn'), at: nowStr(), cid: cid || '', to: mbClsTeach(cid).map(a => a.id), kind, title: String(title).slice(0, 80), body: String(body || '').slice(0, 400), read: false, ...extra }); S.tnoti = S.tnoti.slice(0, 200); };
const mbTnotiMine = () => { const L = Array.isArray(S.tnoti) ? S.tnoti : []; const my = mbMyCids(); return my ? L.filter(n => my.has(n.cid)) : L; };
const mbMemOf = x => (x.mid && M(x.mid)) || (x.sid && mbBySid(x.sid)) || null;
LPX['msg-ask'] = x => { const d = x.data || {}; const m = typeof cmWho === 'function' ? cmWho(x.who) : mbBySid(x.who); if (!m) return; const body = samMask(String(d.body || '').trim().slice(0, 1000)).text; if (!body) return;
  if (typeof tqEnsure === 'function') tqEnsure(); S.tq = Array.isArray(S.tq) ? S.tq : []; const id = String(d.id || uid('qa')).slice(0, 24); if (S.tq.some(y => y.id === id)) return;
  const c = d.cls && C(d.cls); const enrolled = c && ((c.learners || []).includes(m.id) || (c.prog || {})[m.id]); const it = enrolled && d.item && (c.curriculum || []).find(i => i.id === d.item);
  S.tq.unshift({ id, mid: m.id, sid: m.sid || '', q: body, cls: enrolled ? c.name : '', cid: enrolled ? c.id : '', item: it ? it.id : '', where: it ? it.title : (enrolled ? c.name : '메시지함'), src: '메시지', st: 'open', at: nowStr() });
  mbTnoti(enrolled ? c.id : '', 'ask', `학습자 질문${enrolled ? ' · ' + c.name : ''}`, body.slice(0, 120), { tq: id });
  logAudit(`학습자 질문 접수 — ${enrolled ? c.name : '메시지함'}`); };
{ const base = ACT['tq-send']; if (base) ACT['tq-send'] = el => { const id = el.dataset.v || ''; base(el); try { const x = (S.tq || []).find(y => y.id === id); if (!x || x.st !== 'answered' || x.sentTo) return; const m = mbMemOf(x); if (!m) return;
  const tch = (x.cid && mbClsTeach(x.cid)[0]) || (S.me.role === 'teacher' && typeof tMe === 'function' && tMe()) || null;
  mbInbox(m.id, `[답변] ${x.cls ? x.cls + ' ' : ''}질문에 ${t('teacher')}이 답했습니다`, `Q. ${x.q}\n\nA. ${x.a}`, { from: tch ? `${tch.name} ${t('teacher')}` : S.org.name, ask: x.id, ...(x.cid ? { href: `#c/${x.cid}${x.item ? '/' + x.item : ''}` } : {}) });
  x.sentTo = m.id; (S.tnoti || []).forEach(n => { if (n.tq === x.id) n.read = true; }); save(); } catch (e) { console.error(e); } }; }
{ const base = ACT.grade; ACT.grade = el => { const r = base(el); try { const c = C(el.dataset.c), id = el.dataset.v, p = c && c.prog[id]; const w = $('#modal'); const b = w && w.querySelector('[data-mact="ret"]'); if (!p || !b) return r;
  b.addEventListener('click', () => { const was = [p.assign, p.fb, p.score].join('|'); setTimeout(() => { if (p.assign !== 'returned' || [p.assign, p.fb, p.score].join('|') === was) return; const it = (c.curriculum || []).find(i => i.type === 'assign');
    mbInbox(id, `[재제출 요청] ${c.name}`, `「${it ? it.title : c.name}」 과제에 재제출 요청이 왔습니다.\n피드백: ${p.fb || ''}\n과제 화면에서 고쳐서 다시 제출해 주세요.`, { from: `${(S.me.role === 'teacher' && typeof tMe === 'function' && tMe() ? tMe().name + ' ' : '')}${t('teacher')}`, href: `#c/${c.id}${it ? '/' + it.id : ''}`, kind: 'resub' });
    save(); }, 0); }, true); } catch (e) { console.error(e); } return r; }; }
{ const base = LPX['a2-sub']; if (base) LPX['a2-sub'] = x => { const d = x.data || {}; const c = C(d.cls); const it = c && (c.curriculum || []).find(i => i.id === d.item); const m = c && (typeof a2Mem === 'function' ? a2Mem(x.who) : mbBySid(x.who));
  const prev = c && it && m ? (((c.subs || {})[it.id]) || []).filter(s => s.who === m.id) : []; const wasRet = m && c && ((c.prog || {})[m.id] || {}).assign === 'returned';
  base(x); try { if (c && it && m && (prev.length || wasRet)) mbTnoti(c.id, 'resub', `재제출 · ${c.name}`, `${S.org.type === 'univ' ? (m.sid || '학습자') : (m.nick || m.name)} — 「${it.title}」 ${prev.length + 1}차 제출. 평가 · 채점에서 확인하세요.`, { mid: m.id }); } catch (e) { console.error(e); } }; }
ACT['tn-open'] = el => { const n = (S.tnoti || []).find(y => y.id === el.dataset.v); if (!n) return; n.read = true; save(); if (n.tq && ACT['tq-open']) return ACT['tq-open']({ dataset: { v: n.tq } }); go('assess'); };
ACT['tn-readall'] = () => { mbTnotiMine().forEach(n => { n.read = true; }); save(); render(); };
function mbTnotiCard() { const L = mbTnotiMine().slice(0, 8); const un = mbTnotiMine().filter(n => !n.read).length; const Q = (Array.isArray(S.tq) ? S.tq : []).filter(x => x.src === '메시지' && x.st !== 'answered' && (!mbMyCids() || mbMyCids().has(x.cid)));
  if (!L.length && !Q.length) return '';
  return `<div class="card tnoti" id="tnoti"><div class="ch"><b>학습자 질문 · 재제출 알림</b><small>${un ? `새 알림 ${un}건` : '새 알림 없음'} · 답변은 ${esc(t('learner'))} 메시지함 · 알림으로 갑니다</small><span class="sp"></span>${un ? `<button class="btn sm ghost" data-act="tn-readall">모두 읽음</button>` : ''}</div>
    ${table(['받은 때', '내용', ''], L.map(n => [esc(n.at), `${n.read ? '' : tag('새 알림', 'mg') + ' '}<b>${esc(n.title)}</b><br><small class="mini">${esc(n.body)}</small>`, `<button class="btn sm ${n.read ? '' : 'ink'}" data-act="tn-open" data-v="${esc(n.id)}">${n.kind === 'ask' ? '답변하기' : '채점 열기'}</button>`]), '받은 알림이 없습니다.')}</div>`; }
if (typeof tHome === 'function') { const base = tHome; tHome = (...a) => { const h = base(...a); try { return mbTnotiCard() + h; } catch (e) { return h; } }; }
document.addEventListener('DOMContentLoaded', () => { const base = VIEWS.message; if (base) VIEWS.message = (...a) => { const h = base(...a); try { const k = mbTnotiCard(); if (!k) return h; const i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + k + h.slice(i) : k + h; } catch (e) { return h; } }; });

/* ═════════ v36 E — 교육생(학습자) 관리 개선 ═════════
   ① 기관 유형별 노출: 보호자 연결은 학원(초중고)만, 결제 · 수납은 유료 운영 유형만(데이터는 지우지 않음)
   ② 엑셀(CSV) 일괄 등록 한 번에 최대 5,000명 — 머리글로 열을 찾고, 요약 + 오류 행만 표로, 500명씩 나눠 등록(화면이 멈추지 않게)
   ③ 가입 추가 질문 편집기: 카드형(유형 고르기) · 끌어서 순서 바꾸기 · 필수 켜고 끄기 · 민감정보 차단/경고 · 학습자 가입 화면 실시간 미리보기(PC · 휴대폰) */
if (MENU.parents) MENU.parents.only = 'k12';
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org && S.nav && S.nav.tabs && !mbGuardOn()) { let ch = 0; Object.values(S.nav.tabs).forEach(L => (L || []).forEach(x => { if (x.id === 'parents' && x.on) { x.on = false; ch = 1; } })); if (ch) save(); } } catch (e) { console.error(e); } return r; }; }
/* 다른 층(간단히 보기 등)이 화면을 감싼 뒤에도 적용되도록 문서 로드 뒤에 감싼다 */
document.addEventListener('DOMContentLoaded', () => { const base = VIEWS.parents; VIEWS.parents = (...a) => { if (S && S.org && !mbGuardOn()) { const n = (S.parents || []).length;
  return `<div class="card mb-off"><b>${esc(TYPES[S.org.type]?.name || '이 기관')} 유형은 보호자 연결을 쓰지 않습니다</b><p class="mini">보호자 연결은 학원(초중고)처럼 미성년 ${esc(t('learner'))}의 출결 · 청구 알림이 보호자에게 가야 하는 기관에서만 씁니다.${n ? ` 이전에 연결한 보호자 ${n}명의 기록은 지우지 않고 보관합니다.` : ''}</p></div>`; } return base(...a); }; });
/* 회원 상세: 결제 탭은 결제를 쓰는 기관에서만 */
{ const base = memberDetail; memberDetail = m => { if (!mbPayOn() && UI.memT === 'pay') UI.memT = 'info'; let h = base(m); if (!mbPayOn()) h = h.replace(/<button role="tab"[^>]*data-key="memT" data-v="pay">[^<]*<\/button>/, '');
  /* 추가 질문 답변은 아래 '추가 질문 답변' 카드에 한 번만(위 입력 칸 묶음에 같은 값이 한 번 더 보이던 것 정리) */
  if ((UI.memT || 'info') === 'info' && m && /추가 질문 답변/.test(h)) Object.entries(m.extra || {}).forEach(([k, v]) => { if (typeof v === 'string' && !(mbUniv() && ['학번', '학과'].includes(k))) h = h.replace(`<label>${esc(k)}<input value="${esc(v)}" disabled></label>`, ''); });
  return h; }; }
/* 설정 › 서비스: 결제 · 수납, 보호자 연결 사용 여부(유형 기본값 + 사유) */
const MB_PAY_WHY = { k12: '수강료 청구 · 수납이 운영의 중심입니다', adult: '강좌를 판매합니다(카드 · 간편결제)', lifelong: '유료 강좌 학습비를 받고 반환 기준을 지킵니다', voc: '국민내일배움카드 자부담금 · 일반 과정 훈련비를 받습니다', univ: '교과목은 등록금에 포함되어 학생이 따로 결제하지 않습니다', corp: '교육비는 회사가 부담해 임직원이 결제하지 않습니다', public: '교육비는 기관 예산으로 집행해 교육생이 결제하지 않습니다' };
document.addEventListener('DOMContentLoaded', () => { const base = VIEWS.settings; VIEWS.settings = (...a) => { const h = base(...a); if ((UI.settings || 'menu') !== 'service' || !S || !S.org) return h; const ty = S.org.type; const on = mbPayOn(); const def = MB_PAY_DEF[ty] !== false;
  return h + `<div class="card mb-card mb-pay"><div class="ch"><b>결제 · 수납</b><small>${on ? '켜짐' : '꺼짐'}${typeof S.settings.payOn === 'boolean' ? ' · 직접 설정' : ' · 기관 유형 기본값'}</small><span class="sp"></span><button type="button" class="sl-sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="결제 · 수납 ${on ? '끄기' : '켜기'}" data-act="mb-payset"><i></i></button></div>
    <p class="mini">${esc(TYPES[ty]?.name || '')} 기본값: ${def ? '켜짐' : '꺼짐'} — ${esc(MB_PAY_WHY[ty] || '')}. 끄면 ${esc(t('learner'))} 상세의 결제 탭이 숨겨집니다(결제 기록은 보관).</p>
    <p class="mini">보호자 연결: ${mbGuardOn() ? '사용 — 학원(초중고)은 출결 · 청구 알림을 보호자에게 보냅니다.' : `사용 안 함 — ${esc(TYPES[ty]?.name || '')} 유형에는 필요하지 않아 메뉴 · 가입 화면에서 숨깁니다(기존 기록 보관).`}</p></div>`; }; });
ACT['mb-payset'] = () => { const on = !mbPayOn(); S.settings.payOn = on; logAudit(`결제 · 수납 ${on ? '켬' : '끔'}`); save(); render(); toast(`결제 · 수납을 ${on ? '켰습니다' : '껐습니다'}.`, 'ok'); };
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { if (r) r.pay = mbPayOn(); } catch (e) { } return r; }; }

/* ── ② 일괄 등록(최대 5,000명) ── */
const MB_BULK_MAX = 5000;
/* CSV 읽기: 큰따옴표 · 따옴표 안 쉼표/줄바꿈 · BOM · CRLF, 탭으로 나뉜 붙여넣기도 */
function mbCSV(txt) { txt = String(txt || '').replace(/^﻿/, ''); const first = txt.slice(0, txt.indexOf('\n') + 1 || txt.length); const D = !first.includes(',') && first.includes('\t') ? '\t' : ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"' && f === '') q = true; else if (c === D) { row.push(f.trim()); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f.trim()); f = ''; if (row.some(x => x)) rows.push(row); row = []; } else f += c; }
  row.push(f.trim()); if (row.some(x => x)) rows.push(row); return rows; }
const MB_BCOL = { email: /^(이메일|e-?mail|메일|아이디)/i, name: /^(이름|성명|name)$/i, nick: /^(닉네임|별명|nick)/i, phone: /^(연락처|휴대폰|휴대전화|전화|핸드폰|phone|mobile)/i, pw: /^(비밀번호|password|pw)$/i, group: /^(소속|부서|반|학과|기수|훈련반|팀|group)$/i };
let MB_BK = null;
function mbBulkParse(txt) { const R = mbCSV(txt); if (!R.length) return { err: '파일에 내용이 없습니다.' }; const H = R[0].map(h => h.replace(/\s|\*|\(.*?\)/g, ''));
  const Q = S.settings.acct.extraQ.map(x => x.q); const gl = t('group');
  const has = H.some(h => MB_BCOL.email.test(h)); const col = {}; let body = R;
  if (has) { body = R.slice(1); H.forEach((h, i) => { for (const [k, re] of Object.entries(MB_BCOL)) if (col[k] == null && (re.test(h) || (k === 'group' && h === gl))) { col[k] = i; return; } const qi = Q.findIndex(q => q.replace(/\s/g, '') === h); if (qi >= 0) col['q' + qi] = i; }); }
  else { Object.assign(col, { name: 0, nick: 1, email: 2, pw: 3, phone: 4 }); Q.forEach((_, j) => { col['q' + j] = 5 + j; }); } /* 머리글 없는 이전 양식: 이름, 닉네임, 이메일, 비밀번호, 연락처, 추가정보… */
  if (body.length > MB_BULK_MAX) return { err: `한 번에 최대 ${MB_BULK_MAX.toLocaleString()}명입니다(이 파일 ${body.length.toLocaleString()}행). 파일을 나눠 올리세요.` };
  const seenE = new Set(S.members.map(m => String(m.email || (m.acct && m.acct.email) || '').toLowerCase()).filter(Boolean)), seenP = new Set(S.members.map(m => m.phone).filter(Boolean)), fileE = new Set(), fileP = new Set();
  const gset = new Set(S.groups.map(g => g.name.trim().toLowerCase())); const newG = new Set(); const ok = [], bad = []; const v = (r, k) => col[k] == null ? '' : String(r[col[k]] || '').trim();
  body.forEach((r, i) => { const email = v(r, 'email').toLowerCase(), name = v(r, 'name').slice(0, 20), nick = v(r, 'nick'), ph0 = v(r, 'phone'), grp = v(r, 'group').slice(0, 30); const phone = ph0 ? mbPhone(ph0) : '';
    const why = !email ? '이메일 누락' : !MB_MAIL_RE.test(email) ? '이메일 형식' : !name && !nick ? '이름(또는 닉네임) 누락' : nick && !MB_NICK_RE.test(nick) ? '닉네임 규칙(2~20자, - _ 외 특수문자 불가)' : ph0 && !MB_PHONE_RE.test(phone) ? '연락처 형식(예: 010-1234-5678)'
      : seenE.has(email) ? '이미 등록된 이메일' : fileE.has(email) ? '파일 안 이메일 중복' : phone && seenP.has(phone) ? '이미 등록된 연락처' : phone && fileP.has(phone) ? '파일 안 연락처 중복' : '';
    if (why) { bad.push({ row: i + (has ? 2 : 1), email, name: name || nick, why }); return; }
    fileE.add(email); if (phone) fileP.add(phone); if (grp && !gset.has(grp.toLowerCase())) newG.add(grp);
    ok.push({ email, name: name || nick, nick: (nick || name).slice(0, 20), phone, grp, extra: Object.fromEntries(Q.map((q, j) => [q, v(r, 'q' + j).slice(0, 200)]).filter(([, x]) => x)) }); });
  return { total: body.length, ok, bad, newG: [...newG].slice(0, 200), pw: col.pw != null && body.some(r => v(r, 'pw')), head: has }; }
function mbBkOut() { const B = MB_BK; const out = $('#mbBkOut'); if (!out) return; if (!B) { out.innerHTML = ''; return; } if (B.err) { out.innerHTML = `<p class="mb-bad">${esc(B.err)}</p>`; return; }
  const ex = B.ok.slice(0, 5); const E = B.bad.slice(0, 200);
  out.innerHTML = `<div class="mbk-sum"><span><small>읽은 행</small><b>${B.total.toLocaleString()}</b></span><span class="g"><small>등록 가능</small><b>${B.ok.length.toLocaleString()}명</b></span><span class="${B.bad.length ? 'r' : ''}"><small>오류</small><b>${B.bad.length.toLocaleString()}행</b></span><span><small>새 ${esc(t('group'))}</small><b>${B.newG.length}개</b></span></div><div class="mbk-prog" hidden><i></i><span></span></div>
    ${B.pw ? '<p class="mini mb-warnl">파일의 비밀번호 열은 읽지 않았습니다 — 개인정보 보호를 위해 비밀번호는 받지 않고, 등록된 분은 이메일 인증번호로 로그인합니다.</p>' : ''}
    ${B.newG.length ? `<p class="mini">처음 보는 ${esc(t('group'))} ${B.newG.length}개(${esc(B.newG.slice(0, 5).join(', '))}${B.newG.length > 5 ? ' …' : ''})는 등록할 때 새로 만듭니다.</p>` : ''}
    ${E.length ? `<div class="mbk-err"><div class="ch"><b>오류 행</b><small>${B.bad.length > 200 ? `처음 200행만 표시 · 전체 ${B.bad.length.toLocaleString()}행` : '고쳐서 다시 올리면 이 행만 추가로 등록됩니다'}</small><span class="sp"></span><button type="button" class="btn sm" data-act="mb-bulkerr">오류 행 내려받기</button></div><div class="mbk-scroll">${table(['행', '이메일', '이름', '이유'], E.map(r => [r.row, esc(r.email), esc(r.name), tag(r.why, 'r') + (/이미 등록/.test(r.why) ? ' <button type="button" class="btn sm" data-act="mb-invtab" data-v="link">초대 링크 보내기</button>' : '')]))}</div></div>` : ''}
    ${ex.length ? `<div class="mbk-ok"><b>등록 미리보기</b> <small class="mini">처음 ${ex.length}명</small>${table(['이메일', '이름', t('group'), '연락처'], ex.map(r => [esc(r.email), esc(r.name), esc(r.grp || '—'), esc(r.phone || '—')]))}</div>` : ''}
`;
  const mf = $('#modal .mf'); if (mf) { let b = mf.querySelector('[data-act="mb-bulkrun"]'); if (!b) { mf.insertAdjacentHTML('beforeend', '<button type="button" class="btn pri" data-act="mb-bulkrun"></button>'); b = mf.lastElementChild; } b.disabled = !B.ok.length; b.textContent = B.ok.length ? `${B.ok.length.toLocaleString()}명 등록하기` : '등록할 행이 없습니다'; } }
ACT['mem-bulk'] = () => { mbEnsure(); if (mbUniv()) { toast('대학은 학번 등록(접근코드 발급)으로 안내합니다.'); go('enroll'); return; } MB_BK = null;
  modal('엑셀로 일괄 등록', `<div class="mbk"><p class="mini">엑셀 파일(.xlsx)을 그대로 올리거나 CSV로 올리세요. 한 번에 <b>최대 ${MB_BULK_MAX.toLocaleString()}명</b>, 5MB 이하. 열: <b>이메일 · 이름</b>(필수), ${esc(t('group'))} · 연락처 · 추가 질문(선택). 비밀번호는 받지 않습니다.</p>
    <label class="mbk-drop"><input type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" id="mbBkF"><span>${ic('doc' in IC ? 'doc' : 'book', 22)}<b>엑셀 · CSV 파일 고르기</b><small>또는 여기로 끌어다 놓기</small></span></label>
    <div class="bar2"><button type="button" class="btn sm ghost" data-act="bulk-tpl">양식 내려받기</button></div><div id="mbBkOut" aria-live="polite"></div></div>`, [{ id: 'c', label: '닫기' }], true); };
ACT['bulk-tpl'] = () => { const Q = S.settings.acct ? S.settings.acct.extraQ.map(x => x.q) : S.settings.extraQ; downloadCSV(`${t('learner')}_일괄등록_양식.csv`, ['이메일', '이름', '닉네임(선택)', t('group'), '연락처(선택)', ...Q], [['hong@example.com', '홍길동', '', (S.groups[0] || {}).name || '', '', ...Q.map(() => '')]]); };
const mbBkFile = f => { const out = $('#mbBkOut'); if (!f || !out) return; if (!/\.(csv|txt|xlsx)$/i.test(f.name) || f.size > 5 * 1024 * 1024) { MB_BK = { err: '엑셀(.xlsx) 또는 CSV 파일(5MB 이하)만 올릴 수 있습니다.' }; mbBkOut(); return; }
  out.innerHTML = '<p class="mini">검사하는 중…</p>'; (window.XLSX36 && XLSX36.fileText ? XLSX36.fileText(f) : f.text()).catch(() => '').then(txt => { const t0 = performance.now(); MB_BK = mbBulkParse(txt); MB_BK.ms = Math.round(performance.now() - t0); mbBkOut(); }); };
document.addEventListener('change', e => { if (e.target && e.target.id === 'mbBkF') mbBkFile(e.target.files[0]); });
document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('.mbk-drop'); if (d) { e.preventDefault(); d.classList.add('on'); } });
document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('.mbk-drop'); if (d) d.classList.remove('on'); });
document.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('.mbk-drop'); if (!d) return; e.preventDefault(); d.classList.remove('on'); mbBkFile(e.dataTransfer.files[0]); });
ACT['mb-bulkerr'] = () => { if (MB_BK && MB_BK.bad) downloadCSV(`일괄등록_오류행_${today()}.csv`, ['행', '이메일', '이름', '이유'], MB_BK.bad.map(r => [r.row, r.email, r.name, r.why])); };
ACT['mb-bulkrun'] = el => { const B = MB_BK; if (!B || !B.ok || !B.ok.length || B.running) return; B.running = true; el.disabled = true; el.textContent = '등록하는 중…'; const pr = $('#mbBkOut .mbk-prog'); if (pr) { pr.hidden = false; pr.scrollIntoView({ block: 'nearest' }); }
  const gid = new Map(S.groups.map(g => [g.name.trim().toLowerCase(), g.id])); B.newG.forEach(n => { const g = { id: uid('g'), name: n, lead: '', at: today() }; S.groups.push(g); gid.set(n.toLowerCase(), g.id); });
  const L = B.ok; let i = 0; const d = today();
  const step = () => { const end = Math.min(L.length, i + 500);
    for (; i < end; i++) { const r = L[i]; S.members.push({ id: uid('m'), sid: mbSid(r.email), name: r.name, nick: r.nick, email: r.email, phone: r.phone, group: (r.grp && gid.get(r.grp.toLowerCase())) || '', grade: '정회원', joined: d, last: '', extra: r.extra, src: 'bulk', acct: { login: 'email', email: r.email, phone: r.phone, pw: '', verified: false, joined: d, links: ['email'] } }); }
    if (pr) { pr.querySelector('i').style.width = Math.round(i / L.length * 100) + '%'; pr.querySelector('span').textContent = `${i.toLocaleString()} / ${L.length.toLocaleString()}명`; }
    if (i < L.length) return setTimeout(step, 0);
    logAudit(`일괄 등록 ${L.length}명${B.newG.length ? ` · 새 ${t('group')} ${B.newG.length}개` : ''}`); save(); MB_BK = null; closeModal(); UI.mbLim = 0; render(); toast(`${L.length.toLocaleString()}명을 등록했습니다. 이메일 인증번호로 로그인하도록 초대 링크를 보내 주세요.`, 'ok'); };
  step(); };

/* 대학: 학번 등록(접근코드 발급) — 한 번에 최대 5,000명, 파일(CSV)로도 */
ACT['en-codes'] = () => { const ta = $('#enL'); if (!ta) return; const raw = ta.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean); const lines = raw.map(s => s.split(/[,\t]/).map(x => x.trim())).filter(x => /^\d{6,10}$/.test(x[0] || ''));
  if (!lines.length) { toast('학번(숫자 6~10자리)을 줄마다 입력하세요.', 'warn'); return; } if (lines.length > MB_BULK_MAX) { toast(`한 번에 최대 ${MB_BULK_MAX.toLocaleString()}명입니다(지금 ${lines.length.toLocaleString()}줄). 나눠서 발급하세요.`, 'warn'); return; }
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const mk = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => ch[b % ch.length]).join(''); const U = S.org.type === 'univ';
  const have = new Set(S.codes.map(c => c.sid)); const mem = new Set(S.members.flatMap(m => [m.sid, (m.extra || {}).학번]).filter(Boolean)); const gid = new Map(S.groups.map(g => [g.name, g.id])); let nm = 0, nc = 0; const add = [];
  lines.forEach(([sid, dept]) => { const dp = (dept || '').slice(0, 20); if (!have.has(sid)) { add.push({ sid, dept: dp, code: mk(), at: today() }); have.add(sid); nc++; }
    if (U && !mem.has(sid)) { S.members.push({ id: uid('m'), name: sid, nick: '', email: '', phone: '', sid, group: gid.get(dp) || S.groups[0]?.id || '', grade: '정회원', joined: today(), last: '', extra: { 학번: sid, 학과: dp } }); mem.add(sid); nm++; } });
  S.codes.unshift(...add.reverse()); logAudit(`접근코드 발급 ${nc}건`); save(); render(); const skip = raw.length - lines.length;
  toast(`${nc.toLocaleString()}건 발급했습니다${nm ? ` · 명단에 ${nm.toLocaleString()}명 추가` : ''}${lines.length - nc ? ` · 이미 발급한 ${lines.length - nc}건은 그대로` : ''}${skip > 0 ? ` · 형식이 맞지 않는 ${skip}줄은 건너뛰었습니다(학번 숫자 6~10자리)` : ''}. 학과 사무실에 배포하세요.`, skip > 0 ? 'warn' : 'ok'); };
document.addEventListener('change', e => { if (!e.target || e.target.id !== 'enF') return; const f = e.target.files[0]; const ta = $('#enL'); if (!f || !ta) return; if (f.size > 5 * 1024 * 1024) { toast('5MB 이하 파일만 올릴 수 있습니다.', 'warn'); return; }
  f.text().then(txt => { const R = mbCSV(txt).filter(r => /^\d{6,10}$/.test(r[0] || '')); ta.value = R.map(r => `${r[0]}, ${r[1] || ''}`).join('\n'); toast(`학번 ${R.length.toLocaleString()}줄을 읽었습니다. [접근코드 발급]을 누르세요.`, R.length ? 'ok' : 'warn'); }); });
{ const base = VIEWS.enroll; VIEWS.enroll = (...a) => { let h = base(...a); try { h = h.replace('일괄 등록은 1회 최대 100명입니다.', `엑셀(CSV)로 한 번에 최대 ${MB_BULK_MAX.toLocaleString()}명까지 등록합니다.`)
    .replace('CSV 양식(이름, 닉네임, 이메일, 비밀번호, 연락처, 추가정보…)으로 올리면 형식 · 중복을 검사하고 준회원으로 등록합니다.', `CSV 양식(이메일 · 이름 · ${esc(t('group'))} · 연락처 · 추가 질문)으로 올리면 형식 · 중복을 검사해 한 번에 최대 ${MB_BULK_MAX.toLocaleString()}명까지 등록합니다. 비밀번호는 받지 않습니다.`)
    .replace('<button class="btn ink" data-act="en-codes">접근코드 발급</button>', `<div class="bar2"><button class="btn ink" data-act="en-codes">접근코드 발급</button><label class="btn mb-file">파일(CSV)에서 불러오기<input type="file" id="enF" accept=".csv,.txt,text/csv"></label><small class="mini">한 번에 최대 ${MB_BULK_MAX.toLocaleString()}명</small></div>`);
    if (mbUniv()) h = h.replace('<div class="ch"><b>초대</b></div><p class="mini">연락처(알림톡) · 링크 · 이메일로 초대합니다.</p><div class="bar2"><button class="btn" data-act="mem-invite">초대 보내기</button>', '<div class="ch"><b>안내 · 가입 질문</b></div><p class="mini">대학은 연락처 · 이메일 초대 대신 학번 · 접근코드로 안내합니다. 가입할 때 더 물어볼 내용은 가입 추가 질문에서 정합니다.</p><div class="bar2">' + (S.codes.length ? '<button class="btn" data-act="en-copy">안내 문구 복사</button>' : '')); } catch (e) { console.error(e); } return h; }; }

/* ── ③ 가입 추가 질문 편집기 ── */
const MBQ_MAX = 6;
const MBQ_SVG = { text: '<path d="M4 7h16M4 12h10M4 17h7"/>', choice: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>', multi: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l3 3 5-6"/>', date: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', consent: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>', file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>' };
const mbqIc = k => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MBQ_SVG[k] || MBQ_SVG.text}</svg>`;
const MBQ_TYPES = [['text', '짧은 답', '부서 · 회사명처럼 한 줄'], ['choice', '하나 고르기', '학년 · 수강 목적 중 하나'], ['multi', '여러 개 고르기', '관심 분야를 여러 개'], ['date', '날짜', '입사일 · 희망 시작일'], ['consent', '동의 체크', '사진 활용 · 안내 수신 동의'], ['file', '파일 첨부', '재직 증명 · 수료증 사본']];
const MBQ_SUG = { univ: [['학년', 'choice', ['1학년', '2학년', '3학년', '4학년']], ['관심 분야', 'multi', ['AI · 데이터', '취업 · 진로', '어학', '창업']], ['학습 안내 메시지 수신 동의', 'consent']],
  corp: [['부서', 'text'], ['직급', 'choice', ['사원', '대리', '과장', '차장', '부장 이상']], ['입사일', 'date']], public: [['소속', 'text'], ['직급', 'choice', ['9급', '8급', '7급', '6급', '5급 이상']], ['임용일', 'date']],
  k12: [['학년', 'choice', ['초등', '중1', '중2', '중3', '고1', '고2', '고3']], ['다니는 학교', 'text'], ['수업 안내 문자 수신 동의', 'consent']], adult: [['수강 목적', 'choice', ['자격증', '이직 · 취업', '업무 활용', '취미']], ['알게 된 경로', 'choice', ['검색', '지인 추천', 'SNS', '광고']], ['관심 분야', 'multi', ['엑셀', '디자인', '코딩', 'AI']]],
  lifelong: [['거주 지역(시 · 구)', 'text'], ['관심 분야', 'multi', ['인문 · 교양', '디지털', '건강 · 생활', '자격증']], ['강좌 사진 촬영 · 홍보 활용 동의', 'consent']], voc: [['훈련 참여 유형', 'choice', ['재직자', '구직자', '기타']], ['국민내일배움카드', 'choice', ['있음', '없음', '발급 신청 중']], ['희망 훈련 시작일', 'date']] };
/* 개인정보보호법: 고유식별정보(제24조) · 민감정보(제23조)는 가입 질문으로 받지 않는다 — 차단. 일반 개인정보는 최소 수집 경고 */
const MBQ_BLOCK = [[/주민\s*(등록)?\s*번호|외국인\s*등록|여권|운전\s*면허/, '고유식별정보(주민등록번호 · 여권 · 운전면허 · 외국인등록번호)는 법령 근거 없이 받을 수 없습니다.'],
  [/건강|병력|질병|질환|장애|복용|진단명|임신|혈액형/, '건강 정보는 민감정보라 가입 질문으로 받을 수 없습니다.'], [/종교|신앙|정치|정당|노조|노동조합|사상|성적\s*(지향|취향)|성생활|범죄|전과|유전|인종|민족/, '민감정보(종교 · 정치 · 범죄 경력 등)는 받을 수 없습니다.'],
  [/카드\s*번호|계좌|비밀\s*번호|password|패스워드/i, '카드 · 계좌 · 비밀번호는 질문으로 받지 않습니다(결제는 결제대행사가 처리합니다).']];
const MBQ_WARN = [[/이름|성명|실명/, '이름은 수료증 · 환불이 필요할 때 따로 받습니다. 꼭 필요한지 확인하세요.'], [/연락처|전화|휴대폰|핸드폰/, '휴대폰 번호는 알림톡 신청 때 따로 받습니다. 꼭 필요한지 확인하세요.'], [/이메일|메일\s*주소/, '이메일은 가입 수단으로 이미 받습니다.'],
  [/주소|거주지/, '상세 주소 대신 시 · 구까지만 받는 것을 권장합니다.'], [/생년월일|나이|출생/, '생년월일은 고용보험 환급 훈련처럼 꼭 필요한 과정에서만 받으세요.'], [/성별/, '성별은 꼭 필요한 경우에만 받으세요.']];
function mbqCheck(x) { const s = String(x.q || ''); for (const [re, m] of MBQ_BLOCK) if (re.test(s)) return { lv: 'bad', m };
  if (mbUniv()) { if (/^(학번|학과)$/.test(s.trim())) return { lv: 'bad', m: '학번 · 학과는 대학 가입 화면에 기본으로 있습니다.' }; if (/이름|성명|연락처|전화|휴대폰|이메일/.test(s)) return { lv: 'bad', m: '대학은 개인정보 최소 수집 원칙에 따라 이름 · 연락처 · 이메일을 받지 않습니다.' }; }
  for (const [re, m] of MBQ_WARN) if (re.test(s)) return { lv: 'warn', m }; return null; }
const MBQ = { list: [], hid: [], editAns: false, dirty: false, tab: 'ed', dev: 'pc', drag: null };
const mbqBuiltIn = x => mbUniv() && ['학번', '학과'].includes(String(x.q || '').trim()); /* 대학 가입 화면에 기본으로 있는 칸 — 편집 목록에서 숨기고 저장 때 그대로 둔다 */
const mbqMax = () => MBQ_MAX - MBQ.hid.length;
const mbqClone = L => L.map(x => ({ q: x.q, type: MB_QT[x.type] ? x.type : 'text', req: !!x.req, opts: (x.opts || []).slice(), help: x.help || '', lock: !!(x.q && mbAnsLocked(x.q)), orig: x.q }));
function mbqCard(x, i) { const c = mbqCheck(x); const L = x.lock; const opt = x.type === 'choice' || x.type === 'multi';
  return `<li class="mbq-c ${L ? 'lock' : ''} ${c ? c.lv : ''}" data-i="${i}" draggable="true">
    <div class="mbq-ch"><span class="mbq-grip" title="끌어서 순서 바꾸기" aria-hidden="true"><i></i><i></i><i></i></span><b class="mbq-n">${i + 1}</b><span class="mbq-tt">${mbqIc(x.type)}${esc(MB_QT[x.type])}</span><span class="sp"></span>
      <button type="button" class="mbq-ib" data-act="mbq-mv" data-v="${i}:-1" ${i ? '' : 'disabled'} aria-label="${i + 1}번 질문 위로">▲</button><button type="button" class="mbq-ib" data-act="mbq-mv" data-v="${i}:1" ${i < MBQ.list.length - 1 ? '' : 'disabled'} aria-label="${i + 1}번 질문 아래로">▼</button>
      <button type="button" class="mbq-ib del" data-act="mbq-del" data-v="${i}" ${L ? 'disabled title="답변이 있어 지울 수 없습니다"' : ''} aria-label="${i + 1}번 질문 지우기">${ic('x', 16)}</button></div>
    <label class="fl mbq-q"><span>${x.type === 'consent' ? '동의 문구' : '질문'}</span><input data-mbq="q" data-i="${i}" maxlength="30" value="${esc(x.q)}" placeholder="${x.type === 'consent' ? '예: 교육 사진 촬영 · 홍보 활용에 동의합니다' : '예: ' + (x.type === 'date' ? '입사일' : x.type === 'file' ? '재직 증명서' : opt ? '관심 분야' : '소속 부서')}" ${L ? 'readonly' : ''}></label>
    ${opt ? `<div class="mbq-opts" aria-label="선택지">${x.opts.map((o, k) => `<span class="mbq-o">${esc(o)}${L ? '' : `<button type="button" data-act="mbq-odel" data-v="${i}:${k}" aria-label="선택지 ${esc(o)} 지우기">${ic('x', 12)}</button>`}</span>`).join('')}${L || x.opts.length >= 10 ? '' : `<input data-mbq="opt" data-i="${i}" maxlength="20" placeholder="${x.opts.length ? '선택지 더 넣기' : '선택지 입력 후 Enter'}" aria-label="선택지 추가">`}</div>` : ''}
    <label class="fl mbq-help"><span>설명 <small>(선택)</small></span><input data-mbq="help" data-i="${i}" maxlength="60" value="${esc(x.help)}" placeholder="가입 화면 질문 아래에 작게 보입니다"></label>
    <div class="mbq-cf"><label class="mbq-ty"><span class="sr">유형</span><select data-mbq="type" data-i="${i}" ${L ? 'disabled' : ''} aria-label="질문 유형">${MBQ_TYPES.map(([k, l]) => `<option value="${k}" ${x.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <span class="sp"></span><span class="mbq-rl">필수</span><button type="button" class="sl-sw ${x.req ? 'on' : ''}" role="switch" aria-checked="${x.req}" aria-label="${i + 1}번 질문 필수" data-act="mbq-req" data-v="${i}"><i></i></button></div>
    <p class="mbq-msg" role="${c && c.lv === 'bad' ? 'alert' : 'status'}">${c ? esc(c.m) : L ? '이미 답변이 있어 질문 · 유형은 바꿀 수 없습니다(순서 · 필수 · 설명은 바꿀 수 있음).' : ''}</p></li>`; }
function mbqAddHTML() { if (MBQ.list.length >= mbqMax()) return `<p class="mbq-full">질문은 최대 ${MBQ_MAX}개입니다. 꼭 필요한 질문만 남기면 가입을 끝까지 하는 분이 늘어납니다.</p>`;
  const sug = (MBQ_SUG[S.org.type] || []).filter(([q]) => !MBQ.list.some(x => x.q === q));
  return `<div class="mbq-add"><b>질문 추가</b><small>어떤 형식으로 받을까요?</small><div class="mbq-types">${MBQ_TYPES.map(([k, l, d]) => `<button type="button" class="mbq-t" data-act="mbq-add" data-v="${k}"><span class="mbq-ti">${mbqIc(k)}</span><b>${l}</b><small>${d}</small></button>`).join('')}</div>
    ${sug.length ? `<div class="mbq-sug"><small>${esc(TYPES[S.org.type]?.name || '')} 추천</small>${sug.map(([q, k], i) => `<button type="button" class="mbq-s" data-act="mbq-sug" data-v="${esc(q)}">+ ${esc(q)} <em>${esc(MB_QT[k])}</em></button>`).join('')}</div>` : ''}</div>`; }
function mbqListHTML() { return `<ol class="mbq-list" aria-label="가입 추가 질문 ${MBQ.list.length}개">${MBQ.list.map(mbqCard).join('')}</ol>${MBQ.list.length ? '' : '<p class="mbq-empty">아직 추가 질문이 없습니다. 아래에서 형식을 골라 추가하세요. 질문이 없으면 가입 화면이 가장 간단합니다.</p>'}${mbqAddHTML()}`; }
function mbqDraw(focus) { const w = $('#mbqEd'); if (!w) return; const b = w.querySelector('.mbq-edin'); if (b) b.innerHTML = mbqListHTML(); const n = w.querySelector('.mbq-cnt'); if (n) n.textContent = `${MBQ.list.length}/${mbqMax()}`;
  if (focus) { const el = w.querySelector(focus); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } } mbqPost(); }
let MBQ_T = 0;
function mbqPost(fi) { clearTimeout(MBQ_T); MBQ_T = setTimeout(() => { const f = $('#mbqFrame'); if (!f || !f.contentWindow) return; try { f.contentWindow.postMessage({ t: 'mbq', q: MBQ.list.filter(x => x.q.trim()).map(({ q, type, req, opts, help }) => ({ q, type, req, opts, help })), focus: fi }, location.origin); } catch (e) { } }, 120); }
function mbqFit() { const box = $('#mbqEd .mbq-frame'); const f = $('#mbqFrame'); if (!box || !f) return; const W = MBQ.dev === 'm' ? 390 : 1100; const s = Math.min(1, box.clientWidth / W); f.style.width = W + 'px'; f.style.height = Math.round(box.clientHeight / s) + 'px'; f.style.transform = `scale(${s})`; }
ACT['mem-q'] = () => { mbEnsure(); const A = S.settings.acct; closeModal(); if (typeof slClose === 'function') slClose(); MBQ.hid = A.extraQ.filter(mbqBuiltIn); MBQ.list = mbqClone(A.extraQ.filter(x => !mbqBuiltIn(x))); MBQ.dev = innerWidth < 1000 ? 'm' : 'pc'; MBQ.editAns = !!A.editAns; MBQ.dirty = false; MBQ.tab = 'ed';
  const old = $('#mbqEd'); if (old) old.remove(); const w = document.createElement('div'); w.className = 'mbq-wrap'; w.id = 'mbqEd'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', '가입 추가 질문');
  w.innerHTML = `<div class="mbq"><header class="mbq-h"><div class="mbq-hl"><b>가입 추가 질문 <span class="mbq-cnt">${MBQ.list.length}/${mbqMax()}</span></b><small>가입할 때 ${esc(t('learner'))}에게 더 물어볼 내용입니다${mbUniv() ? '(학번 · 학과는 기본으로 받습니다)' : ''}. 오른쪽이 실제 가입 화면입니다.</small></div><span class="sp"></span><button type="button" class="btn" data-act="mbq-x">닫기</button><button type="button" class="btn pri" data-act="mbq-save">저장</button></header>
    <div class="mbq-seg seg2" role="tablist"><button type="button" role="tab" class="on" aria-selected="true" data-act="mbq-tab" data-v="ed">질문 편집</button><button type="button" role="tab" aria-selected="false" data-act="mbq-tab" data-v="pv">가입 화면 미리보기</button></div>
    <div class="mbq-body" data-tab="ed"><section class="mbq-ed" aria-label="질문 편집"><div class="mbq-note">${ic('check', 16)}<span><b>꼭 필요한 것만 물어보세요.</b> 주민등록번호 · 건강 · 종교처럼 민감한 정보는 받을 수 없게 막아 둡니다.</span></div><div class="mbq-edin"></div>
      <label class="ckl mbq-ea"><input type="checkbox" id="mbqEA" ${MBQ.editAns ? 'checked' : ''}> ${esc(t('learner'))}이 마이페이지에서 답변을 보고 고칠 수 있게 하기</label></section>
      <section class="mbq-pv" aria-label="가입 화면 미리보기"><div class="mbq-pvh"><b>가입 화면 미리보기</b><div class="mbq-dev" role="group" aria-label="화면 크기">${[['pc', 'PC'], ['m', '휴대폰']].map(([k, l]) => `<button type="button" class="${MBQ.dev === k ? 'on' : ''}" aria-pressed="${MBQ.dev === k}" data-act="mbq-dev" data-v="${k}">${l}</button>`).join('')}</div></div>
        <div class="mbq-frame ${MBQ.dev}"><iframe id="mbqFrame" title="학습자 가입 화면 미리보기" src="learner.html?preview=1&pvjoin=1#join"></iframe></div><small class="mini">학습자 사이트의 실제 가입 화면입니다. 입력해 볼 수 있지만 가입되지는 않습니다. 저장해야 학습자 사이트에 반영됩니다.</small></section></div></div>`;
  document.body.appendChild(w); mbqDraw(); $('#mbqFrame').addEventListener('load', () => { mbqFit(); mbqPost(); }); requestAnimationFrame(mbqFit); const f = w.querySelector('input,button.mbq-t'); if (f) f.focus({ preventScroll: true }); };
addEventListener('resize', () => { if ($('#mbqEd')) mbqFit(); });
const mbqClose = () => { const w = $('#mbqEd'); if (w) w.remove(); };
ACT['mbq-x'] = () => { if (MBQ.dirty && !confirm('저장하지 않은 변경이 있습니다. 닫을까요?')) return; mbqClose(); };
ACT['mbq-tab'] = el => { MBQ.tab = el.dataset.v; const w = $('#mbqEd'); w.querySelector('.mbq-body').dataset.tab = MBQ.tab; w.querySelectorAll('[data-act="mbq-tab"]').forEach(b => { const on = b.dataset.v === MBQ.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); if (MBQ.tab === 'pv') { mbqFit(); mbqPost(); } };
ACT['mbq-dev'] = el => { MBQ.dev = el.dataset.v; const w = $('#mbqEd'); const fr = w.querySelector('.mbq-frame'); fr.className = 'mbq-frame ' + MBQ.dev; w.querySelectorAll('[data-act="mbq-dev"]').forEach(b => { const on = b.dataset.v === MBQ.dev; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); mbqFit(); };
ACT['mbq-add'] = el => { if (MBQ.list.length >= mbqMax()) return; const k = el.dataset.v; MBQ.list.push({ q: '', type: k, req: k === 'consent' ? false : false, opts: [], help: '', lock: false }); MBQ.dirty = true; mbqDraw(`.mbq-c[data-i="${MBQ.list.length - 1}"] [data-mbq="q"]`); };
ACT['mbq-sug'] = el => { if (MBQ.list.length >= mbqMax()) return; const s = (MBQ_SUG[S.org.type] || []).find(([q]) => q === el.dataset.v); if (!s) return; MBQ.list.push({ q: s[0], type: s[1], req: false, opts: (s[2] || []).slice(), help: '', lock: false }); MBQ.dirty = true; mbqDraw(`.mbq-c[data-i="${MBQ.list.length - 1}"] [data-mbq="q"]`); };
ACT['mbq-del'] = el => { const i = +el.dataset.v; const x = MBQ.list[i]; if (!x || x.lock) return; MBQ.list.splice(i, 1); MBQ.dirty = true; mbqDraw(); toast(`「${x.q || '빈 질문'}」을 지웠습니다. 저장해야 반영됩니다.`); };
ACT['mbq-mv'] = el => { const [i, d] = el.dataset.v.split(':').map(Number); const j = i + d; if (j < 0 || j >= MBQ.list.length) return; const L = MBQ.list; [L[i], L[j]] = [L[j], L[i]]; MBQ.dirty = true; mbqDraw(`.mbq-c[data-i="${j}"] [data-act="mbq-mv"][data-v="${j}:${d}"]`); };
ACT['mbq-req'] = el => { const x = MBQ.list[+el.dataset.v]; if (!x) return; x.req = !x.req; MBQ.dirty = true; el.classList.toggle('on', x.req); el.setAttribute('aria-checked', x.req); mbqPost(+el.dataset.v); };
ACT['mbq-odel'] = el => { const [i, k] = el.dataset.v.split(':').map(Number); const x = MBQ.list[i]; if (!x || x.lock) return; x.opts.splice(k, 1); MBQ.dirty = true; mbqDraw(`.mbq-c[data-i="${i}"] [data-mbq="opt"]`); };
const mbqOptAdd = el => { const i = +el.dataset.i; const x = MBQ.list[i]; const v = el.value.replace(/,/g, ' ').trim().slice(0, 20); if (!x || !v) return false; if (x.opts.includes(v)) { toast('이미 있는 선택지입니다.', 'warn'); return false; } if (x.opts.length >= 10) return false; x.opts.push(v); MBQ.dirty = true; mbqDraw(`.mbq-c[data-i="${i}"] [data-mbq="opt"]`); return true; };
document.addEventListener('keydown', e => { const el = e.target; if (!el || !el.closest || !el.closest('#mbqEd')) return;
  if (e.key === 'Escape') { e.preventDefault(); ACT['mbq-x'](); return; }
  if (e.key === 'Enter' && el.dataset.mbq === 'opt') { e.preventDefault(); mbqOptAdd(el); }
  if (e.key === 'Backspace' && el.dataset.mbq === 'opt' && !el.value) { const i = +el.dataset.i; const x = MBQ.list[i]; if (x && x.opts.length) { x.opts.pop(); MBQ.dirty = true; mbqDraw(`.mbq-c[data-i="${i}"] [data-mbq="opt"]`); } } }, true);
document.addEventListener('input', e => { const el = e.target; if (!el || !el.dataset || !el.dataset.mbq || !el.closest('#mbqEd')) return; const i = +el.dataset.i; const x = MBQ.list[i]; if (!x) return;
  if (el.dataset.mbq === 'q') { x.q = el.value; const c = mbqCheck(x); const li = el.closest('.mbq-c'); li.classList.toggle('bad', !!c && c.lv === 'bad'); li.classList.toggle('warn', !!c && c.lv === 'warn'); li.querySelector('.mbq-msg').textContent = c ? c.m : ''; }
  else if (el.dataset.mbq === 'help') x.help = el.value; else if (el.dataset.mbq === 'opt') { if (/,/.test(el.value)) { el.value.split(',').forEach((v, k, A) => { if (k < A.length - 1) { el.value = v; mbqOptAdd(el); } }); return; } return; }
  MBQ.dirty = true; mbqPost(i); });
document.addEventListener('change', e => { const el = e.target; if (!el || !el.closest || !el.closest('#mbqEd')) return;
  if (el.dataset.mbq === 'type') { const x = MBQ.list[+el.dataset.i]; if (!x || x.lock) return; x.type = el.value; if (!['choice', 'multi'].includes(x.type)) x.opts = x.opts; MBQ.dirty = true; mbqDraw(`.mbq-c[data-i="${el.dataset.i}"] [data-mbq="type"]`); }
  if (el.id === 'mbqEA') { MBQ.editAns = el.checked; MBQ.dirty = true; }
  if (el.dataset.mbq === 'opt' && el.value.trim()) mbqOptAdd(el); });
/* 끌어서 순서 바꾸기(마우스) — 키보드 · 휴대폰은 ▲▼ 버튼 */
document.addEventListener('dragstart', e => { const li = e.target.closest && e.target.closest('#mbqEd .mbq-c'); if (!li) return; if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName) && li.contains(document.activeElement)) { e.preventDefault(); return; } MBQ.drag = +li.dataset.i; li.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(MBQ.drag)); } catch (x) { } });
document.addEventListener('dragover', e => { const li = e.target.closest && e.target.closest('#mbqEd .mbq-c'); if (!li || MBQ.drag == null) return; e.preventDefault(); document.querySelectorAll('#mbqEd .mbq-c.over').forEach(x => x !== li && x.classList.remove('over')); li.classList.add('over'); });
document.addEventListener('drop', e => { const li = e.target.closest && e.target.closest('#mbqEd .mbq-c'); if (!li || MBQ.drag == null) return; e.preventDefault(); const from = MBQ.drag, to = +li.dataset.i; MBQ.drag = null; if (from === to) { mbqDraw(); return; } const [x] = MBQ.list.splice(from, 1); MBQ.list.splice(to, 0, x); MBQ.dirty = true; mbqDraw(); toast(`${from + 1}번 질문을 ${to + 1}번으로 옮겼습니다.`); });
document.addEventListener('dragend', () => { if (MBQ.drag != null) { MBQ.drag = null; document.querySelectorAll('#mbqEd .mbq-c.drag,#mbqEd .mbq-c.over').forEach(x => x.classList.remove('drag', 'over')); } });
ACT['mbq-save'] = () => { const A = S.settings.acct; const out = []; const bad = (i, m) => { toast(`${i + 1}번 질문: ${m}`, 'warn'); mbqDraw(`.mbq-c[data-i="${i}"] [data-mbq="q"]`); return false; };
  for (let i = 0; i < MBQ.list.length; i++) { const x = MBQ.list[i]; const q = String(x.q || '').trim().slice(0, 30);
    if (x.lock) { const o = A.extraQ.find(y => y.q === x.orig) || x; out.push({ q: o.q, type: o.type, req: !!x.req, opts: (o.opts || []).slice(), ...(x.help.trim() ? { help: x.help.trim().slice(0, 60) } : {}) }); continue; }
    if (!q) return bad(i, '질문을 입력하세요(필요 없으면 지우세요).'); const c = mbqCheck({ q }); if (c && c.lv === 'bad') return bad(i, c.m);
    if (out.some(y => y.q === q)) return bad(i, `「${q}」 질문이 중복됩니다.`); if ((x.type === 'choice' || x.type === 'multi') && x.opts.length < 2) return bad(i, '선택지를 2개 이상 넣으세요.');
    out.push({ q, type: x.type, req: !!x.req, opts: ['choice', 'multi'].includes(x.type) ? x.opts.slice(0, 10) : [], ...(x.help.trim() ? { help: x.help.trim().slice(0, 60) } : {}) }); }
  A.extraQ = [...MBQ.hid, ...out].slice(0, MBQ_MAX); A.editAns = MBQ.editAns; mbJoinSync(); logAudit(`가입 추가 질문 저장 ${A.extraQ.length}개`); save(); MBQ.dirty = false; mbqClose(); render(); toast(`가입 추가 질문 ${out.length}개를 저장했습니다. 학습자 사이트를 다시 게시하면 반영됩니다.`, 'ok'); };
/* 이전 데이터 보정: 유형이 없거나 모르는 값이면 짧은 답 */
{ const base = mbEnsure; mbEnsure = (...a) => { base(...a); try { const A = S && S.settings && S.settings.acct; if (A) A.extraQ.forEach(x => { if (!MB_QT[x.type]) x.type = 'text'; }); } catch (e) { } }; }
