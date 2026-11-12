/* 시나리오 univ-lms — 어드민. 작성 규칙은 저장소 루트의 CLAUDE.md를 따른다. */
(function () {
  'use strict';
  /* v34 화면 가이드(slim-g.js의 GUIDE 표를 학사 LMS 문구로 덮어쓴다) */
  (window.SLG_PICK = window.SLG_PICK || []).push((type, ed) => type === 'univ' && ed === 'lms' ? {
    class: { d: '교과목 강의실을 만들고 학생을 배정해요', a: ['이번 학기 강의실 만들어줘', '학생이 없는 강의실 찾아줘', '강의실 공지 써줘'] },
    attend: { a: ['결석이 많은 학생 보여줘', '출결 이의신청 보여줘', '오늘 출석 현황 알려줘'] },
    dash: { a: ['이번 학기 운영 현황 요약해줘', '위험군 학생 찾아줘', '과제 제출률 낮은 강좌 보여줘'] } } : null);

  const UL = () => { try { return !!(typeof S !== 'undefined' && S && S.org && S.org.type === 'univ' && S.org.ed === 'lms'); } catch (e) { return false; } };

  /* v38 #13 학사 LMS 기본 메뉴: 업무 단위 메뉴(lms/nav.js — 수업 · 학생 · 소통 · 사이트 · 운영)에 묶인 학사 화면을 켠다.
     slim.js는 학사 LMS일 때 「지금 켜진 탭 앞 7개」만 남겨 학생 명단 · 사이트 · 과제 · 강의실이 꺼졌다. 일반 화면(과정 · 평가 · 출결 · 캘린더)은 학사 화면과 겹치므로 기본으로 끈다. */
  const ESS = ['lmsa', 'sis', 'class', 'clib', 'lmsb', 'lmsc', 'lmsi', 'lmse', 'lmsf', 'lmsg', 'grade', 'lmsj', 'members', 'enroll', 'groups', 'lmsd', 'community', 'message', 'lmsl-cal', 'lmsl-noti', 'site', 'admins', 'lmsm', 'lmso', 'aigov', 'auto'];
  const ess = () => ESS.filter(id => typeof MENU !== 'undefined' && MENU[id]); /* MENU는 전역 const(window 속성 아님) */
  document.addEventListener('DOMContentLoaded', () => { const base = window.slimEss; if (typeof base !== 'function') return; window.slimEss = (...a) => UL() ? ess() : base(...a); });
  if (typeof AFTER !== 'undefined') AFTER.push(() => { try { if (!UL() || !S.nav || !S.nav.tabs || !S.slim34 || S.nav.ul38b) return; S.nav.ul38b = 1; /* slim.js 정리(slim34)가 끝난 뒤에 한 번 — 순서가 바뀌면 다시 꺼지던 문제(2차 #13) */
    ess().forEach(id => { if (typeof navAdd === 'function') navAdd(id, true); Object.values(S.nav.tabs).forEach(A => (A || []).forEach(x => { if (x.id === id) x.on = true; })); });
    if (typeof save === 'function') save(); setTimeout(() => { try { render(); } catch (e) { } }, 0); } catch (e) { console.error('univ-lms nav', e); } });

  /* v38 #8 AI SAM으로 교과목을 만들면(학사 LMS) 일반 과정(S.classes)이 아니라 학기 · 강좌의 교과목 + 01분반(15주 강의실)으로 만든다 */
  /* crs-flow.js가 나중에 makeCourse를 새로 정의하므로, 모든 스크립트를 읽은 뒤(DOMContentLoaded) 감싼다 */
  document.addEventListener('DOMContentLoaded', () => { if (typeof makeCourse === 'function') { const base = makeCourse; makeCourse = function (x) { // eslint-disable-line no-global-assign
    if (!UL() || typeof window.lmsaEns !== 'function' || typeof window.lmsaDemo !== 'function') return base.apply(this, arguments);
    const name = String((x && (x.topic || x.name)) || '').trim().slice(0, 60) || '새 교과목'; const A = window.lmsaEns();
    const term = (A.terms.find(t => t.is_operating) || A.terms[0] || {}).term_id; let n = A.courses.length + 1, code; const yy = String(new Date().getFullYear()).slice(2);
    do { code = `C${yy}${String(n++).padStart(3, '0')}`; } while (A.courses.some(c => c.course_code === code));
    const live = typeof LIVE !== 'undefined' && LIVE && LIVE.user; const sec = { term_id: term, course_code: code, section_no: '01', mode: 'blended', capacity: 40 };
    const ex = A.courses.find(c => c.name === name);
    if (live && typeof window.lmsaX === 'function') { window.lmsaX('course', { course_code: ex ? ex.course_code : code, name, credits: 3, category: 'general' }).then(() => window.lmsaX('section', { ...sec, course_code: ex ? ex.course_code : code })).catch(e => toast(e.message, 'warn')); }
    else { try { if (!ex) window.lmsaDemo('course', { course_code: code, name, credits: 3, category: 'general' }); } catch (e) { if (typeof toast === 'function') toast(e.message, 'warn'); } try { if (term) window.lmsaDemo('section', { ...sec, course_code: ex ? ex.course_code : code }); } catch (e) { /* 같은 분반이 이미 있으면 건너뜀 */ } }
    UI.lmsaMade = Date.now(); if (typeof logAudit === 'function') logAudit(`학사 교과목 ${ex ? ex.course_code : code} ${name} · 01분반 개설(AI SAM)`);
    return { id: 'lmsa:' + (ex ? ex.course_code : code), name, weekPlan: Array.from({ length: 15 }, (_, i) => ({ w: i + 1, title: `${i + 1}주차` })), curriculum: [], learners: [], status: '준비중', lmsa: true }; }; } });
  /* 만든 뒤 「과정」 화면으로 가려는 이동은 학기 · 강좌로 */
  if (typeof go === 'function') { const g0 = go; go = function (id, keep) { try { if (UL() && (id === 'class' || id === 'learn') && UI.lmsaMade && Date.now() - UI.lmsaMade < 120000) { UI.lmsaMade = 0; id = 'lmsa'; } } catch (e) { } return g0.call(this, id, keep); }; } // eslint-disable-line no-global-assign

  /* v38 #7 학사 일정(일정 · 알림 › 통합 달력의 「학사」)과 강의 게시판 공지를 학습자 사이트 게시본에 넣는다
     → 학습자 캘린더 「기관 일정」 · 공지(#notice) · 홈에 보인다. 개인 일정 · 비공개 글 · 강좌 일정(분반 소속 미확인)은 넣지 않는다. */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = function () { const snap = base.apply(this, arguments); // eslint-disable-line no-global-assign
    try { if (!UL() || !snap) return snap; const L = S.lms || {};
      /* 결정(3차 재검토): 구분이 '학사'인 일정만 학습자에게. '개인'은 제목과 상관없이 절대 게시하지 않는다(시험 출제 메모 등 유출 방지).
         예전 기본값 '개인'으로 저장된 학사 같은 일정은 통합 달력 위 확인 카드에서 운영자가 골라 '학사'로 바꾼다(lms/l.js) */
      const pubEv = e => e && e.scope === 'academic' && e.starts_at && e.title;
      const ev = ((L.l && L.l.ev) || []).filter(pubEv).slice(0, 200).map(e => ({ id: 'lmsl-' + e.id, title: String(e.title).slice(0, 60), date: String(e.starts_at).slice(0, 10), time: e.all_day ? '' : String(e.starts_at).slice(11, 16), end: '', kind: '학사 일정', cls: '' }));
      if (ev.length) snap.calx = [...(Array.isArray(snap.calx) ? snap.calx : []), ...ev.filter(e => !(snap.calx || []).some(x => x.id === e.id))];
      const B = L.bcd; if (B && B.d && Array.isArray(B.d.posts)) { const room = id => (B.sections || []).find(r => r.id === id);
        const N = B.d.posts.filter(q => q && q.kind === 'notice' && !q.deleted_at && !q.private && q.status !== 'hidden').map(q => { const r = room(q.sec); return { id: 'lmsd-' + q.id, title: String(q.title || '').slice(0, 200), at: String(q.at || '').slice(0, 10), pin: !!q.pinned, cls: r ? r.title : '', lsec: r && r.lmsa ? r.lmsa : '', body: String(q.body || '').replace(/<[^>]+>/g, ' ').slice(0, 2000) }; });
        if (N.length) snap.notices = [...(snap.notices || []), ...N].sort((a, b) => (b.pin - a.pin) || String(b.at).localeCompare(String(a.at))).slice(0, 60); } } catch (e) { console.error('univ-lms snapshot', e); }
    return snap; }; }

  /* v38 #5 교수 화면 홈 「내 강의」: 학사 LMS는 학기 · 강좌에서 내가 담당(교수 · 공동교수)인 분반을 보여 준다(학기 · 강좌 · 성적과 같은 숫자) */
  if (typeof aihCoursesHTML === 'function') { const base = aihCoursesHTML; aihCoursesHTML = function () { // eslint-disable-line no-global-assign
    try { if (!UL() || typeof window.lmsaEns !== 'function' || (typeof LIVE !== 'undefined' && LIVE && LIVE.user)) return base.apply(this, arguments); const A = window.lmsaEns(); const me = A.scopes && A.scopes.teacher && A.scopes.teacher.member_no;
      const mine = A.sections.filter(s0 => !s0.hidden && A.staff.some(t => t.section_id === s0.section_id && t.member_no === me && t.status === 'active' && (t.role === 'professor' || t.role === 'co_professor')));
      const n = id => new Set(A.enr.filter(e => (e.section_id === id || A.sections.some(y => y.rep_section_id === id && y.section_id === e.section_id)) && e.status === 'enrolled' && e.kind !== 'audit').map(e => e.member_no)).size; const cn = c => (A.courses.find(x => x.course_code === c) || {}).name || c;
      return `<section class="aih-sec" aria-labelledby="aihMc"><div class="aih-sh"><h2 id="aihMc">내 분반 <small>${mine.length}개</small></h2><span class="sp"></span><button type="button" class="aih-lk" data-act="go" data-v="lmsa">학기 · 강좌</button></div>
        ${mine.length ? `<ul class="aih-al">${mine.slice(0, 6).map(s0 => `<li class="aih-cr"><div><b>${esc(cn(s0.course_code))} ${esc(s0.section_no)}분반</b><small>${esc(s0.course_code)} · 수강 ${n(s0.section_id)}명</small></div><button type="button" class="btn sm" data-act="go" data-v="lmse">과제</button></li>`).join('')}</ul>` : `<p class="mini">담당 분반이 없습니다. 학기 · 강좌 › 분반 관리에서 담당 교수로 지정되면 여기에 보입니다${me ? '' : '(교수 사번이 아직 연결되지 않았습니다)'}.</p>`}</section>`; } catch (e) { console.error(e); return base.apply(this, arguments); } }; }

  /* v38 #11 학사 LMS에서 꺼진 기능의 흔적을 운영자 표에서 숨긴다: 학생 명단의 AI 진단 열, 권한표의 매출 · 요금제(plan) 줄 */
  if (typeof AFTER !== 'undefined') AFTER.push(cur => { try { if (!UL()) return; const main = document.getElementById('main'); if (!main) return; const tab = cur && cur.tab;
    if (['members', 'enroll', 'groups'].includes(tab)) main.querySelectorAll('table').forEach(tb => { const hs = [...tb.querySelectorAll('thead th, tr:first-child th')]; hs.forEach((th, i) => { if (/진단/.test(th.textContent)) { tb.querySelectorAll('tr').forEach(tr => { const c = tr.children[i]; if (c) c.hidden = true; }); } }); });
    if (['admins', 'lmsm', 'org'].includes(tab)) main.querySelectorAll('table tr').forEach(tr => { const c = tr.firstElementChild; if (c && /^\s*(매출|plan|요금제|결제 · 수납)\s*$/.test(c.textContent)) tr.hidden = true; });
  } catch (e) { console.error('univ-lms hide', e); } });

  /* v38 학사 LMS 화면 추천 칩 — 화면마다 그 질문에 맞는 실제 데이터 답 + 바로 가기(btn). 데이터가 없으면 「아직 ○○가 없습니다 — [만들기]」.
     규칙 엔진 답이 「이해하지 못했습니다」인데 아래 표에도 없는 칩만 화면 설명 + 현황으로 대신 답한다. 데모: 이 브라우저의 기관 데이터(S.lms.*), 운영: 각 화면에서 서버 값 확인 */
  const ULC = (() => {
    const tb = (c, r, e) => (typeof scxTbl === 'function' ? scxTbl(c, r, e) : '');
    const ans = (text, go, label, rows, cols) => ({ text, html: rows && rows.length ? tb(cols, rows) : '', btn: { act: 'go', v: go, label } });
    const iga = w => { const c = String(w).slice(-1).charCodeAt(0) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 ? '이' : '가'; };
    const none = (what, go, label) => ({ text: `아직 ${what}${iga(what)} 없습니다.`, html: '', btn: { act: 'go', v: go, label } });
    const dm = (b, op, q) => { try { return window.LMP && LMP.demo && LMP.demo[b] && LMP.demo[b][op] ? LMP.demo[b][op](q || {}) : null; } catch (e) { return null; } }; /* 데모 저장소를 처음 쓸 때 만들게(샘플 기관은 샘플 포함) */
    const efhSeed = () => { try { if (window.EFH && EFH.aOn && EFH.aOn()) SECS().forEach(x => { EFH.call('GET', '/api/lms/e/list', { section: x.section_id }).catch(() => { }); }); } catch (e) { } };
    const A = () => (typeof window.lmsaEns === 'function' ? window.lmsaEns() : null);
    const L = () => (S && S.lms) || {};
    const T0 = () => { const a = A(); return a ? (a.terms.find(t => t.is_operating) || a.terms[0] || {}) : {}; };
    const SECS = () => { const a = A(); const t = T0(); return a ? a.sections.filter(x => x.term_id === t.term_id && !x.hidden && x.status !== 'archived') : []; };
    const SN = id => { const a = A(); const x = a && a.sections.find(y => y.section_id === id); if (!x) return '분반'; return `${(a.courses.find(c => c.course_code === x.course_code) || {}).name || x.course_code} ${x.section_no}분반`; };
    const fmt = t => { if (!t) return '-'; const d = new Date(t); return isNaN(d) ? String(t) : d.toLocaleString('ko-KR', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
    const roster = sid => { const a = A(); return a ? a.enr.filter(e => e.status === 'enrolled' && e.kind !== 'audit' && (e.section_id === sid || a.sections.some(y => y.rep_section_id === sid && y.section_id === e.section_id))).map(e => e.member_no) : []; };
    const M = {
      sis: () => { const I = typeof window.lmsEns === 'function' ? window.lmsEns().sis : {}; const a = A(); const R = a ? a.runs.slice().sort((x, y) => y.run_id - x.run_id) : []; const last = (I && I.last) || (R[0] && R[0].at); const errN = R.slice(0, 10).reduce((n, r) => n + (r.errors_n || 0), 0);
        if (!last && !R.length) return none('학사 동기화 · 업로드 기록', 'sis', '학사 연동 열기');
        return ans(`마지막 동기화 ${fmt(last)} · 최근 오류 ${errN}건${errN ? ' — 오류 행은 학기 · 강좌 › 엑셀로 올리기 기록에서 확인합니다' : ''}.`, 'sis', '학사 연동 열기', R.slice(0, 5).map(r => [fmt(r.at), r.scope, `${r.counts.inserted}건 반영`, `${r.errors_n || 0}건`]), ['때', '종류', '반영', '오류']); },
      lmsb: () => { const B = L().bcd; const R = B ? B.sections.filter(r => r.lmsa && SECS().some(x => x.section_id === r.lmsa)) : []; if (!R.length) return none('이번 학기 강의실', 'lmsa', '분반 개설하기');
        const rows = R.map(r => { const W = B.weeks.filter(w => w.sec === r.id); const ses = B.sessions.filter(x => x.sec === r.id); const emptyW = W.filter(w => !ses.filter(x => x.week_no === w.week_no).some(x => B.res.some(z => z.session_id === x.id && !z.deleted_at && !/수업 자료를 올려|대면 수업 안내|사전 학습 영상/.test(z.title || '') || (z.body && z.body.url)))).length; return [r.title, W.length, emptyW]; });
        return ans(`강의실 ${R.length}곳 · 자료가 비어 있는 주차가 있는 강의실 ${rows.filter(x => x[2] > 0).length}곳입니다.`, 'lmsb', '강의실 열기', rows, ['강의실', '주차', '빈 주차']); },
      lmsc: () => { const C = (L().bcd || {}).c || {}; const n = k => (C[k] || []).length; if (!n('forums') && !n('wiki') && !n('teams') && !n('polls')) return none('토론 · 위키 · 팀 활동', 'lmsc', '학습활동 만들기');
        return ans(`토론 ${n('forums')}개(글 ${n('posts')}건) · 위키 ${n('wiki')}개 · 팀 ${n('teams')}개 · 간편 설문 ${n('polls')}개입니다.`, 'lmsc', '학습활동 열기'); },
      lmsi: () => { const W = L().w3 || {}; const C = W.contents || []; if (!C.length) return none('올린 강의 영상', 'lmsv', '영상 올리기');
        const low = new Set(); (W.persons || []).forEach(p => { const mine = C.filter(c => { const ses = (W.sessions || []).find(x => x.session_id === c.session_id); return ses && (p.secs || []).includes(ses.section_id); }); if (!mine.length) return; const avg = mine.reduce((s0, c) => s0 + (((W.prog || {})[c.content_id + '|' + p.person_id] || {}).pct || 0), 0) / mine.length; if (avg < 50) low.add(p.member_no); });
        return ans(`강의 영상 ${C.length}개 · 평균 진도 50% 미만 학생 ${low.size}명입니다.`, 'lmsi', '진도 화면 열기', [...low].slice(0, 8).map(m => [m]), ['진도 낮은 학번']); },
      lmse: () => { efhSeed(); const X = L().efh || {}; const now = Date.now(); const G = (X.asg || []).filter(g => g.status === 'published' && SECS().some(x => x.section_id === g.section_id)); if (!G.length) return none('공개한 과제', 'lmse', '과제 만들기');
        const rows = G.map(g => { const done = new Set((X.subs || []).filter(x => x.asg_id === g.asg_id && x.status !== 'draft').map(x => x.owner_key)); const R = roster(g.section_id); const miss = R.filter(m => ![...done].some(k => String(k).includes(m))).length; return [g.title, SN(g.section_id), fmt(g.due_at), miss, g.due_at ? Date.parse(g.due_at) - now : Infinity]; }).sort((x, y) => x[4] - y[4]);
        const soon = rows.filter(r => r[4] > 0 && r[4] < 3 * 864e5).length; return ans(`공개 과제 ${G.length}개 · 3일 안 마감 ${soon}개 · 미제출 합계 ${rows.reduce((n, r) => n + r[3], 0)}건입니다.`, 'lmse', '과제 화면 열기', rows.slice(0, 6).map(r => r.slice(0, 4)), ['과제', '분반', '마감', '미제출']); },
      lmsj: () => { const W = L().w3 || {}; const P = (W.persons || []).filter(p => (p.secs || []).length && p.ekind !== 'audit'); if (!P.length) return none('분석할 수강생', 'lmsa', '수강생 등록하기');
        const abs = P.map(p => [p.member_no, Object.entries(W.att || {}).filter(([k, v]) => k.endsWith('|' + p.person_id) && v && v.status === 'absent').length]).filter(x => x[1] >= 2).sort((x, y) => y[1] - x[1]);
        return ans(`수강생 ${P.length}명 중 결석 2회 이상 ${abs.length}명입니다(도움이 필요한 학생).`, 'lmsj', '학습 분석 열기', abs.slice(0, 8), ['학번', '결석']); },
      groups: () => { const a = A(); const U = a ? a.units.filter(u => u.kind === 'dept' || u.kind === 'major') : []; if (!U.length) return none('등록된 학과', 'groups', '학과 만들기');
        return ans(`학과 ${U.length}개입니다. 학생은 학번 등록 때 적은 학과로 자동 배정됩니다.`, 'groups', '학과 화면 열기', U.slice(0, 10).map(u => [u.name, a.persons.filter(p => p.unit_code === u.unit_code && p.kind === 'student').length]), ['학과', '학생']); },
      lmsd: () => { const D = (L().bcd || {}).d || {}; const P = (D.posts || []).filter(q => !q.deleted_at); if (!P.length) return none('강의 게시판 글', 'lmsd', '공지 쓰기');
        const qa = P.filter(q => q.kind === 'qna' && q.status === 'open').length; return ans(`공지 ${P.filter(q => q.kind === 'notice').length}건 · 답변 기다리는 Q&A ${qa}건 · 1:1 상담 ${P.filter(q => q.kind === 'counsel' && q.status === 'open').length}건입니다.`, 'lmsd', '강의 게시판 열기'); },
      'lmsl-cal': () => { dm('l', 'cal.list'); const E = ((L().l || {}).ev || []).filter(e => e.scope !== 'personal'); const now = new Date().toISOString().slice(0, 10), to = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10); const U = E.filter(e => String(e.starts_at).slice(0, 10) >= now && String(e.starts_at).slice(0, 10) <= to);
        if (!E.length) return none('학사 · 강좌 일정', 'lmsl-cal', '일정 추가하기'); return ans(`앞으로 2주 일정 ${U.length}건입니다(학사 일정은 학생 캘린더에도 보입니다).`, 'lmsl-cal', '통합 달력 열기', U.slice(0, 8).map(e => [String(e.starts_at).slice(0, 10), e.scope === 'academic' ? '학사' : '강좌', e.title]), ['날짜', '구분', '일정']); },
      'lmsl-noti': () => { dm('l', 'noti.rules'); const X = L().l || {}; const R = X.rules || []; if (!R.length) return none('알림 규칙', 'lmsl-noti', '규칙 추가하기');
        return ans(`알림 규칙 ${R.length}개 중 ${R.filter(r => r.enabled).length}개 켜짐 · 발송 대기 ${(X.outbox || []).filter(o => o.status !== 'sent').length}건입니다.`, 'lmsl-noti', '알림 규칙 열기'); },
      admins: () => { const D = S.admins || []; return ans(`운영자 ${D.length}명입니다. 운영자 화면에서 이메일로 초대하거나, 교수 초대 링크로 교수 권한을 줍니다.`, 'admins', '운영자 화면 열기', D.slice(0, 8).map(x => [x.name || x.email || '-', ({ owner: '정운영자', sub: '부운영자', teacher: '교수자' })[x.role] || x.role]), ['이름', '권한']); },
      lmsm: () => { dm('m', 'users.list'); const X = L().m || {}; const P = X.persons || []; if (!P.length) return none('등록된 사용자', 'enroll', '학번 등록하기');
        return ans(`사용자 ${P.length}명 · 활동 제한 ${Object.values(X.ctl || {}).filter(c => c && c.blocked).length}명 · 켜진 팝업 ${(X.popups || []).filter(p => p.enabled).length}개입니다.`, 'lmsm', '시스템 관리 열기'); },
      lmso: () => { try { if (typeof window.lmsoEns === 'function') window.lmsoEns(); } catch (e) { } const X = L().o || {}; if (!(X.docs || []).length && !(X.faq || []).length) return none('AI가 참고할 강의자료', 'lmso', '강의자료 올리기');
        return ans(`AI 참고 자료 ${(X.docs || []).length}개 · 자주 묻는 질문 ${(X.faq || []).length}개 · 이번 달 AI 호출 ${(X.calls || []).length}건입니다.`, 'lmso', 'AI 학습 지원 열기'); },
      aigov: () => { const I = typeof window.lmsEns === 'function' ? window.lmsEns().ai : null; const on = I ? I.models.filter(m => m.on).map(m => m.n) : [];
        return ans(`AI 사용 ${(S.ai && S.ai.usage) || 0}회 · 켜진 모델 ${on.length ? on.join(' · ') : '없음'}입니다.`, 'aigov', 'AI 관리 열기'); },
      lmsg: () => { const W = L().w3 || {}; const secs = (W.sections || []).filter(x => SECS().some(y => y.section_id === x.section_id)); if (!secs.length) return none('출결을 받을 분반', 'lmsa', '분반 개설하기');
        const now = Date.now(); const today = (W.sessions || []).filter(x => secs.some(y => y.section_id === x.section_id) && Math.abs(Date.parse(x.starts_at) - now) < 12 * 36e5);
        return ans(`출결 분반 ${secs.length}개 · 오늘 차시 ${today.length}개입니다.`, 'lmsg', '출결 화면 열기', today.slice(0, 6).map(x => [SN(x.section_id), `${x.week_no}주 ${x.seq}차시`, fmt(x.starts_at)]), ['분반', '차시', '시작']); },
      grade: () => { efhSeed(); const X = L().efh || {}; const I = (X.items || []).filter(i => SECS().some(x => x.section_id === i.section_id)); if (!I.length) return none('평가 항목', 'grade', '평가 비율 등록하기');
        const secs = [...new Set(I.map(i => i.section_id))]; return ans(`평가 항목이 있는 분반 ${secs.length}개 · 항목 ${I.length}개 · 확정된 분반 ${secs.filter(s0 => (X.final || {})[s0]).length}개입니다.`, 'grade', '성적 화면 열기'); }
    };
    return M; })();
  window.ulmsChipAns = ULC;
  /* v38 운영 서버 모드(LIVE.user): 칩 답은 데모 S.lms가 아니라 각 화면이 운영에서 쓰는 /api/lms/* 조회(묶음별 호출기 lmsaX · LMSX.call · EFH.call · W3.call · LMP.call)로 만든다.
     먼저 「불러오는 중」을 남기고, 받으면 그 대화 말풍선을 고친다. 실패하면 「지금 불러오지 못했습니다 — [화면 열기]」 */
  const LIVE_U = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const ULV = (() => {
    const go = (v, label) => ({ act: 'go', v, label }); const A = (text, v, label) => ({ text, html: '', btn: go(v, label) });
    const ex = async (L, n, f) => { const out = []; for (const x of (L || []).slice(0, n)) { try { out.push(await f(x)); } catch (e) { out.push(null); } } return out; };
    const efhSecs = async () => ((await EFH.call('GET', '/api/lms/e/sections')) || {}).sections || [];
    const w3Secs = async () => (await W3.call('GET', '/api/lms/g/sections', {})) || [];
    const kst = t => { const d = new Date(t); return isNaN(d) ? '-' : d.toLocaleString('ko-KR', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
    return {
      sis: async () => { const ov = await window.lmsaX('overview', null, true); const R = ((ov && ov.runs) || []).slice().sort((a, b) => b.run_id - a.run_id); if (!R.length) return A('아직 학사 동기화 · 업로드 기록이 없습니다.', 'sis', '학사 연동 열기');
        const e = R.slice(0, 10).reduce((n, r) => n + (r.errors_n || 0), 0); return A(`마지막 동기화 ${kst(R[0].at)} · 최근 오류 ${e}건(운영 서버).`, 'sis', '학사 연동 열기'); },
      groups: async () => { const ov = await window.lmsaX('overview', null, true); const U = ((ov && ov.units) || []).filter(u => u.kind === 'dept' || u.kind === 'major'); return U.length ? A(`학과 ${U.length}개입니다(운영 서버).`, 'groups', '학과 화면 열기') : A('아직 등록된 학과가 없습니다.', 'groups', '학과 만들기'); },
      lmsb: async () => { const r = await LMSX.call('b', 'sections', {}); const L = (r && r.sections) || []; if (!L.length) return A('아직 이번 학기 강의실이 없습니다.', 'lmsa', '분반 개설하기');
        return A(`강의실 ${L.length}곳 · 학습 자원이 없는 강의실 ${L.filter(x => !x.resources).length}곳입니다(운영 서버).`, 'lmsb', '강의실 열기'); },
      lmsc: async () => { const r = await LMSX.call('b', 'sections', {}); const L = (r && r.sections) || []; const F = await ex(L, 10, x => LMSX.call('c', 'forums', { section: x.id })); const n = F.reduce((a, f) => a + (((f && (f.forums || f.items)) || []).length), 0);
        return n ? A(`토론 ${n}개입니다(운영 서버).`, 'lmsc', '학습활동 열기') : A('아직 토론 · 위키 · 팀 활동이 없습니다.', 'lmsc', '학습활동 만들기'); },
      lmse: async () => { const S0 = await efhSecs(); const G = (await ex(S0, 10, x => EFH.call('GET', '/api/lms/e/list', { section: x.section_id }))).flatMap(r => (r && r.assignments) || []).filter(g => g.status === 'published');
        if (!G.length) return A('아직 공개한 과제가 없습니다.', 'lmse', '과제 만들기'); const now = Date.now(); const soon = G.filter(g => g.due_at && Date.parse(g.due_at) > now && Date.parse(g.due_at) - now < 3 * 864e5).length; const miss = G.reduce((a, g) => a + Math.max(0, (g.targets || 0) - (g.submitted || 0)), 0);
        return A(`공개 과제 ${G.length}개 · 3일 안 마감 ${soon}개 · 미제출 합계 ${miss}건입니다(운영 서버).`, 'lmse', '과제 화면 열기'); },
      grade: async () => { const S0 = await efhSecs(); const B = (await ex(S0, 10, x => EFH.call('GET', '/api/lms/h/board', { section: x.section_id }))).filter(Boolean); const items = B.reduce((a, b) => a + ((b.items || []).length), 0);
        return items ? A(`평가 항목이 있는 분반 ${B.filter(b => (b.items || []).length).length}개 · 항목 ${items}개입니다(운영 서버).`, 'grade', '성적 화면 열기') : A('아직 평가 항목이 없습니다.', 'grade', '평가 비율 등록하기'); },
      lmsg: async () => { const L = await w3Secs(); if (!L.length) return A('아직 출결을 받을 분반이 없습니다.', 'lmsa', '분반 개설하기'); const now = Date.now();
        const T = (await ex(L, 10, x => W3.call('GET', '/api/lms/g/sessions', { section_id: x.section_id }))).flatMap(r => r || []).filter(x => Math.abs(Date.parse(x.starts_at) - now) < 12 * 36e5);
        return A(`출결 분반 ${L.length}개 · 오늘 차시 ${T.length}개입니다(운영 서버).`, 'lmsg', '출결 화면 열기'); },
      lmsi: async () => { const L = await w3Secs(); const P = (await ex(L, 10, x => W3.call('GET', '/api/lms/i/progress', { section_id: x.section_id }))).filter(Boolean); const C = P.reduce((a, p) => a + ((p.contents || []).length), 0); if (!C) return A('아직 올린 강의 영상이 없습니다.', 'lmsv', '영상 올리기');
        const low = new Set(); P.forEach(p => (p.students || []).forEach(st => { const v = st.avg_pct != null ? st.avg_pct : Array.isArray(st.pct) ? st.pct.reduce((a, b) => a + (+b || 0), 0) / Math.max(1, st.pct.length) : st.pct; if (v != null && v < 50) low.add(st.member_no); }));
        return A(`강의 영상 ${C}개 · 평균 진도 50% 미만 학생 ${low.size}명입니다(운영 서버).`, 'lmsi', '진도 화면 열기'); },
      lmsj: async () => { const L = await w3Secs(); const R = (await ex(L, 10, x => W3.call('GET', '/api/lms/j/risk', { section_id: x.section_id }))).filter(Boolean); const d = R.reduce((a, r) => a + ((r.summary || {}).danger || 0) + ((r.summary || {}).warn || 0), 0);
        return R.length ? A(`위험 · 주의 학생 ${d}명입니다(운영 서버).`, 'lmsj', '학습 분석 열기') : A('아직 분석할 수강생이 없습니다.', 'lmsa', '수강생 등록하기'); },
      lmsd: async () => { const r = await LMSX.call('b', 'sections', {}); const B = (await ex((r && r.sections) || [], 10, x => LMSX.call('d', 'boards', { section: x.id }))).filter(Boolean).flatMap(b => b.boards || []);
        if (!B.some(b => b.posts)) return A('아직 강의 게시판 글이 없습니다.', 'lmsd', '공지 쓰기'); return A(`게시판 글 ${B.reduce((a, b) => a + (b.posts || 0), 0)}건 · 답변 기다리는 글 ${B.reduce((a, b) => a + (b.open || 0), 0)}건입니다(운영 서버).`, 'lmsd', '강의 게시판 열기'); },
      'lmsl-cal': async () => { const r = await LMP.call('l', 'cal.list', {}, true); const E = ((r && r.items) || []).filter(e => e.scope !== 'personal'); const now = new Date().toISOString().slice(0, 10), to = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
        if (!E.length) return A('아직 학사 · 강좌 일정이 없습니다.', 'lmsl-cal', '일정 추가하기'); return A(`앞으로 2주 일정 ${E.filter(e => String(e.starts_at).slice(0, 10) >= now && String(e.starts_at).slice(0, 10) <= to).length}건입니다(운영 서버).`, 'lmsl-cal', '통합 달력 열기'); },
      'lmsl-noti': async () => { const r = await LMP.call('l', 'noti.rules', {}, true); const R = (r && r.items) || []; return R.length ? A(`알림 규칙 ${R.length}개 중 ${R.filter(x => x.enabled).length}개 켜짐입니다(운영 서버).`, 'lmsl-noti', '알림 규칙 열기') : A('아직 알림 규칙이 없습니다.', 'lmsl-noti', '규칙 추가하기'); },
      lmsm: async () => { const r = await LMP.call('m', 'users.list', {}, true); const n = (r && r.total) || 0; return n ? A(`사용자 ${n}명입니다(운영 서버).`, 'lmsm', '시스템 관리 열기') : A('아직 등록된 사용자가 없습니다.', 'enroll', '학번 등록하기'); },
      lmso: async () => { const d = await api('GET', '/api/lms/o/rag/docs'); const f = await api('GET', '/api/lms/o/qa/faq').catch(() => null); const nd = ((d && (d.docs || d.items)) || []).length, nf = ((f && (f.faq || f.items)) || []).length;
        return nd || nf ? A(`AI 참고 자료 ${nd}개 · 자주 묻는 질문 ${nf}개입니다(운영 서버).`, 'lmso', 'AI 학습 지원 열기') : A('아직 AI가 참고할 강의자료가 없습니다.', 'lmso', '강의자료 올리기'); }
    }; })();
  /* 받은 답을 그 말풍선에 반영 */
  let ulReq = 0;
  function ulLive(k) { const id = 'ul' + (++ulReq) + Date.now().toString(36); const L0 = typeof mlabel === 'function' ? mlabel(k) : k;
    const put = r => { let n = 0; const tick = () => { const m = (S.chat || []).find(x => x && x.ulmsReq === id); if (!m) { if (n++ < 40) setTimeout(tick, 100); return; } delete m.typing; Object.assign(m, { text: r.text, html: r.html || '', btn: r.btn }); delete m.ulmsReq; try { save(); } catch (e) { } try { renderThreads(); } catch (e) { try { render(); } catch (x) { } } }; tick(); };
    Promise.resolve().then(() => ULV[k]()).then(put, () => put({ text: '지금 불러오지 못했습니다.', btn: { act: 'go', v: k, label: `${L0} 화면 열기` } }));
    return { text: '운영 서버에서 불러오는 중입니다…', html: '', ulmsReq: id }; }
  window.ulmsLiveAns = ULV;
  document.addEventListener('DOMContentLoaded', () => { if (typeof scxDefs !== 'function') return; const base = scxDefs;
    const NO = /이해하지 못했습니다|처리할 수 없는/; const WEAK = /^운영 현황 요약$/;
    const brief = k => { const L0 = typeof mlabel === 'function' ? mlabel(k) : k; let hub = null; try { const f = window.LMSNAV && LMSNAV.find(LMSNAV.tree(), k); hub = f && f.h; } catch (e) { }
      return { text: `「${L0}」 화면입니다. ${hub && hub.desc ? hub.desc + '.' : ''}`.trim(), html: '', btn: { act: 'go', v: k, label: `${L0} 열기` } }; };
    scxDefs = function (k) { const D = base.apply(this, arguments) || []; if (!UL()) return D;
      return D.map(c => { if (!Array.isArray(c) || typeof c[2] !== 'function') return c; const run = c[2]; return [c[0], c[1], (...a) => { const r = run(...a); if (!r || r.plan || !(NO.test(r.text || '') || WEAK.test(r.text || ''))) return r; try { if (LIVE_U()) { if (ULV[k]) return ulLive(k); if (!['admins', 'aigov'].includes(k)) return brief(k); } if (ULC[k]) return ULC[k](); } catch (e) { console.error('ulms chip', e); } return brief(k); }, c[3]]; }); }; }); // eslint-disable-line no-global-assign
})();
