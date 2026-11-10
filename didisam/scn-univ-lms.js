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
  const ESS = ['lmsa', 'sis', 'lmsb', 'lmsc', 'lmsi', 'lmse', 'lmsf', 'lmsg', 'grade', 'lmsj', 'members', 'enroll', 'groups', 'lmsd', 'community', 'message', 'lmsl-cal', 'lmsl-noti', 'site', 'admins', 'lmsm', 'lmso', 'aigov', 'auto'];
  const ess = () => ESS.filter(id => window.MENU && MENU[id]);
  document.addEventListener('DOMContentLoaded', () => { const base = window.slimEss; if (typeof base !== 'function') return; window.slimEss = (...a) => UL() ? ess() : base(...a); });
  if (typeof AFTER !== 'undefined') AFTER.push(() => { try { if (!UL() || !S.nav || !S.nav.tabs || S.nav.ul38) return; S.nav.ul38 = 1;
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
      const ev = ((L.l && L.l.ev) || []).filter(e => e && e.scope === 'academic' && e.starts_at && e.title).slice(0, 200).map(e => ({ id: 'lmsl-' + e.id, title: String(e.title).slice(0, 60), date: String(e.starts_at).slice(0, 10), time: e.all_day ? '' : String(e.starts_at).slice(11, 16), end: '', kind: '학사 일정', cls: '' }));
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
})();
