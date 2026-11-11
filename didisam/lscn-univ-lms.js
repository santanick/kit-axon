/* 시나리오 univ-lms — 학습자 앱. window.LSCN_PICK.push((type, ed) => 조건 ? 시나리오 객체 : null)
   v38(QA UL #11 · #12): 학사 LMS(대학 › 학사 LMS)에서 꺼진 기능(진단 · 배지 · 디지털북 · 결제 · 튜토리얼 · 강좌 둘러보기)을 학습자 화면에서 숨기고,
   일반 과정이 없을 때 '첫 강좌를 골라 보세요' 대신 이번 학기 수강 분반으로 안내한다. 화면 구조는 그대로 두고 그린 뒤 숨기기만 한다. */
(function () {
  'use strict';
  const on = () => { try { const o = typeof SITE === 'function' && SITE() && SITE().org; return !!(o && o.type === 'univ' && o.ed === 'lms'); } catch (e) { return false; } };
  const T = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  const hide = el => { if (el && !el.hasAttribute('data-ulms-off')) { el.hidden = true; el.setAttribute('data-ulms-off', '1'); el.style.setProperty('display', 'none', 'important'); } };
  const OFF_TAB = /^(디지털북|배지|결제|결제 · 환불|교재\/교구|진단)$/;
  /* 내 수강 분반 수(데모: 게시본이 아닌 기관 데이터룸 S.lms.a, 운영: 수강 분반 카드가 받은 값) */
  function mySecs() { try { const me = typeof LR !== 'undefined' && LR && LR.me; if (!me) return null; const r = typeof demoRoom === 'function' ? demoRoom() : null; const A = r && r.lms && r.lms.a; if (!A) return null;
    const m = String(me.sid || ''); return A.enr.filter(e => e.member_no === m && e.status === 'enrolled').length; } catch (e) { return null; } }
  function fix() {
    if (!on()) return; if (!document.getElementById('ulmsCss')) { const st = document.createElement('style'); st.id = 'ulmsCss'; st.textContent = '[data-ulms-off]{display:none!important}body.lapp .ap-call{white-space:nowrap}'; /* v38 #15 앱 머리 「물어보기」 줄바꿈 */ document.head.appendChild(st); } const lm = document.getElementById('lm') || document.body; if (!lm) return;
    /* 진단 · 수준 · 배지 · 디지털북 · 결제 · 튜토리얼 */
    lm.querySelectorAll('.chips2 > *').forEach(c => { if (/진단|단계부터|LEVEL|Explorer|Builder|Master/.test(T(c))) hide(c); });
    lm.querySelectorAll('.myhg, .mylv, .mpn, .my26-stat, section.prog, .ap-lv, .ap-badge, .ap-roadmap').forEach(hide);
    lm.querySelectorAll('nav.mytab a, nav.mytab button, .lux-tabs a, .lux-tabs button, .ap-seg a, .ap-seg button').forEach(a => { if (OFF_TAB.test(T(a))) hide(a); });
    lm.querySelectorAll('.mycard, .ap-card').forEach(c => { const h = T(c.querySelector('.ls-tx, .mh, .myhead, h2, h3')); if (/^(수준 로드맵|배지 지갑|디지털북|내 디지털북|내 배지|결제|튜토리얼 기록|진단 결과|내 과정단계별 코스)/.test(h)) hide(c); if (c.classList.contains('nextc') && /튜토리얼/.test(T(c))) hide(c); });
    lm.querySelectorAll('.lai-row, a.nx, .lai-l > li').forEach(r => { if (/추천 튜토리얼/.test(T(r))) hide(r); });
    lm.querySelectorAll('.lt-coach p, .lt-coach .lt-ch > div > b, .lt-coach .lt-ch b, .mycard p').forEach(p => { if (/추천 튜토리얼/.test(T(p)) && !p.querySelector('.mycard')) hide(p); });
    lm.querySelectorAll('.lai-sec').forEach(s => { const rows = s.querySelectorAll('.lai-row, .lai-l > li'); if (rows.length && [...rows].every(r => r.hidden)) hide(s); });
    /* 일반 과정이 없을 때의 '첫 강좌를 골라 보세요 · 강좌 둘러보기' → 이번 학기 수강 분반 안내 */
    lm.querySelectorAll('.mycard.lux-wide, .mycard').forEach(c => { if (/아직 수강 중인 (강좌|교과목)(이|가) 없/.test(T(c)) && !c.querySelector('[data-ulms-lead]')) hide(c); });
    lm.querySelectorAll('section.lux-cont').forEach(s => { if (!s.querySelector('.lux-cc.empty') || s.querySelector('[data-ulms-lead]')) return; const n = mySecs(); const inn = s.querySelector('.in') || s;
      inn.innerHTML = `<div class="lux-cc" data-ulms-lead="1"><b>${n ? `이번 학기 수강 분반 ${n}개` : '이번 학기 수강 분반'}</b><p class="mini">${n ? '과제 · 시험 · 성적과 출석, 강의실을 「내 학습」에서 바로 볼 수 있어요.' : '학교가 수강 등록을 마치면 이곳에 이번 학기 강의가 보여요.'}</p><div class="lbtns"><a class="lbtn pri" href="#my">내 학습</a><a class="lbtn ghost" href="#lms">과제 · 시험 · 성적</a></div></div>`; });
    /* 앱 「나」 머리: '아직 수강 중인 강좌가 없어요 · 강좌 둘러보기' → 수강 분반 안내 */
    lm.querySelectorAll('.ap-myh').forEach(h => { if (!/아직 수강 중인 (강좌|교과목)(이|가) 없/.test(T(h)) || h.querySelector('[data-ulms-lead]')) return; const n = mySecs(); const p = [...h.querySelectorAll('p, b, strong, h1, h2, span')].find(x => /아직 수강 중인/.test(x.textContent) && !x.children.length) || null;
      const txt = n ? `이번 학기 수강 분반 ${n}개 — 아래 「과제 · 시험 · 성적」 · 「내 강의실」에서 바로 시작해요.` : '학교가 수강 등록을 마치면 이번 학기 강의가 여기에 보여요.'; if (p) { p.textContent = `${(typeof LR !== 'undefined' && LR.me && LR.me.sid) || ''}님, ${txt}`; p.setAttribute('data-ulms-lead', '1'); } else h.insertAdjacentHTML('beforeend', `<p data-ulms-lead="1">${txt}</p>`); });
    lm.querySelectorAll('a, button').forEach(a => { if (/^(강좌|교과목) 둘러보기$/.test(T(a))) hide(a); });
    /* v38 2차 #11 앱 홈: 배지 수 · 추천 튜토리얼 카드 · 튜터 추천 행 */
    lm.querySelectorAll('.ap-st > span').forEach(x => { if (/배지/.test(T(x))) hide(x); });
    lm.querySelectorAll('a.ap-cd, a.lt-act, .ap-cd, .lt-act').forEach(x => { if (/추천 튜토리얼|AI Explorer|튜토리얼 ·/.test(T(x))) hide(x); });
    document.querySelectorAll('.lt-act').forEach(x => { if (/추천 튜토리얼|AI Explorer/.test(T(x))) hide(x); });
    /* v38 2차 #12 학습 캘린더: 일반 과정이 없을 때 문구 → 수강 분반 기준 */
    lm.querySelectorAll('.lq-empty').forEach(x => { if (!/아직 수강 중인/.test(T(x)) || x.dataset.ulms) return; const n = mySecs(); x.dataset.ulms = '1'; const p = x.querySelector('p'); if (n && p) p.textContent = `이번 학기 수강 분반 ${n}개의 시험 · 과제 마감과 학사 일정이 이 달력에 들어와요.`; else if (n) hide(x); });
    /* v38 #15 접근코드 재발급 요청 버튼: 휴대폰 터치 크기 44px */
    lm.querySelectorAll('button.lbtn.sm, a.lbtn.sm').forEach(b => { if (/재발급/.test(T(b)) && !b.dataset.ulmsH) { b.dataset.ulmsH = '1'; b.style.minHeight = '44px'; } });
    /* 비로그인 튜터 인사: 가격 문의 대신 학사 안내 */
    document.querySelectorAll('.lt-b p').forEach(p => { if (p.textContent.includes('가격을 바로 물어보세요')) p.textContent = p.textContent.replace('강좌 · 수강 방법 · 가격을 바로 물어보세요.', '수업 · 과제 · 출석 · 학사 일정을 바로 물어보세요.'); });
  }
  /* v38 2차 #7 학습 캘린더에 내 수강 분반의 과제 마감 · 시험(데모: 기관 데이터룸 S.lms.efh)을 기관 일정으로 넣는다(게시본 calx에 이 기기 화면에서만 덧붙임) */
  /* 운영 서버: 기존 학습자 API(GET /api/lms/a/my → 분반마다 /api/lms/e/my · /api/lms/f/my)로 받아 5분 동안 쓴다 */
  const LV = { at: 0, sid: '', busy: false, items: [] };
  const kstOf = t => { const d = new Date(Date.parse(t) + 9 * 3600e3).toISOString(); return { date: d.slice(0, 10), time: d.slice(11, 16) }; };
  function liveDue() { if (LV.busy || (LV.sid === String(LR.me.sid) && Date.now() - LV.at < 300e3) || typeof api !== 'function') return; LV.busy = true;
    (async () => { const my = await api('GET', '/api/lms/a/my'); const secs = ((my && my.sections) || []).filter(x => x.kind !== 'ta'); const out = [];
      for (const sc of secs.slice(0, 20)) { const nm = `${sc.course_name || sc.title || ''} ${sc.section_no || ''}분반`.trim();
        try { const e = await api('GET', '/api/lms/e/my?section=' + encodeURIComponent(sc.section_id)); ((e && e.assignments) || []).filter(g => g.due_at).forEach(g => { const k = kstOf(g.due_at); out.push({ id: 'lmse-' + g.asg_id, title: `과제 마감 — ${g.title} · ${nm}`.slice(0, 60), date: k.date, time: k.time, end: '', kind: '과제 마감', cls: '' }); }); } catch (x) { }
        try { const f = await api('GET', '/api/lms/f/my?section=' + encodeURIComponent(sc.section_id)); ((f && f.exams) || []).filter(x => x.open_at).forEach(x => { const k = kstOf(x.open_at); out.push({ id: 'lmsf-' + x.exam_id, title: `시험 — ${x.title} · ${nm}`.slice(0, 60), date: k.date, time: k.time, end: x.close_at ? kstOf(x.close_at).time : '', kind: '시험', cls: '' }); }); } catch (x) { } }
      LV.items = out; })().catch(() => { LV.items = []; }).finally(() => { LV.busy = false; LV.at = Date.now(); LV.sid = String(LR.me && LR.me.sid || ''); try { lrender(); } catch (e) { } }); }
  function addDue() { try { if (!on() || typeof LR === 'undefined' || !LR || !LR.me || !LR.site) return;
      if (LR.mode === 'live') { liveDue(); const C0 = Array.isArray(LR.site.calx) ? LR.site.calx : (LR.site.calx = []); LV.items.forEach(e => { const i = C0.findIndex(x => x.id === e.id); if (i < 0) C0.push(e); else C0[i] = e; }); return; } const r = typeof demoRoom === 'function' ? demoRoom() : null; const A = r && r.lms && r.lms.a; const X = r && r.lms && r.lms.efh; if (!A || !X) return;
      const m = String(LR.me.sid || ''); const rep = id => { const s0 = A.sections.find(x => x.section_id === id); return s0 && s0.rep_section_id ? s0.rep_section_id : id; };
      const my = new Set(A.enr.filter(e => e.member_no === m && e.status === 'enrolled').map(e => rep(e.section_id))); if (!my.size) return;
      const nm = id => { const s0 = A.sections.find(x => x.section_id === id) || {}; return ((A.courses.find(c => c.course_code === s0.course_code) || {}).name || '') + (s0.section_no ? ` ${s0.section_no}분반` : ''); };
      const kst = t => { const d = new Date(Date.parse(t) + 9 * 3600e3).toISOString(); return { date: d.slice(0, 10), time: d.slice(11, 16) }; };
      const add = []; (X.asg || []).filter(g => my.has(g.section_id) && g.status === 'published' && g.due_at).forEach(g => { const k = kst(g.due_at); add.push({ id: 'lmse-' + g.asg_id, title: `과제 마감 — ${g.title} · ${nm(g.section_id)}`.slice(0, 60), date: k.date, time: k.time, end: '', kind: '과제 마감', cls: '' }); });
      (X.exams || []).filter(x => my.has(x.section_id) && x.status === 'published' && x.open_at).forEach(x => { const k = kst(x.open_at); add.push({ id: 'lmsf-' + x.exam_id, title: `시험 — ${x.title} · ${nm(x.section_id)}`.slice(0, 60), date: k.date, time: k.time, end: x.close_at ? kst(x.close_at).time : '', kind: '시험', cls: '' }); });
      const C = Array.isArray(LR.site.calx) ? LR.site.calx : (LR.site.calx = []); add.forEach(e => { const i = C.findIndex(x => x.id === e.id); if (i < 0) C.push(e); else C[i] = e; }); } catch (e) { console.error('univ-lms cal', e); } }
  if (typeof lrender === 'function') { const base = lrender; lrender = function (...a) { addDue(); return base.apply(this, a); }; } // eslint-disable-line no-global-assign
  let q = 0; const kick = () => { if (q) return; q = 1; requestAnimationFrame(() => { q = 0; try { fix(); } catch (e) { console.error('univ-lms learner', e); } }); };
  const start = () => { try { new MutationObserver(kick).observe(document.body, { childList: true, subtree: true }); } catch (e) { } kick(); };
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
  addEventListener('hashchange', kick);
  window.ulmsFix = fix;
})();
