/* v30 학사 LMS 묶음 M — 시스템 관리: 사용자 관리(조회 · 등록 · 수강정보 · 활동 통제) · 사용자 전환(감사 · 최대 30분) · 접속 통계 · 로그 검색 · 팝업/배너(사용자 유형별) · 시스템 모니터링(CPU · 메모리 · 디스크 · 학사연동 장애 · 임계치)
   운영 모드: /api/lms/m/... (서버 SQL lms_m · 지표는 서버 프로세스). 데모 모드: S.lms.m 상태 + 브라우저 지표(performance.memory 등).
   연동 지점: 위험 시 관리자 SMS 통지는 발송 대기열까지(연동 후 발송). 학사연동 장애는 lms_sis_sync_run 오류 건수. */
(function () {
  'use strict';
  const LMP = window.LMP; if (!LMP) return;
  LMP.GETS = LMP.GETS || {}; LMP.GETS.m = ['users.list', 'users.get', 'imp.current', 'stats', 'logs', 'popup.list', 'popup.preview', 'mon.th', 'mon.history'];
  const KIND = { student: '학생', professor: '교수', staff: '직원', external: '외부' };
  const STAT = { active: '재학 · 재직', leave: '휴학', graduated: '졸업', expelled: '제적', withdrawn: '자퇴', retired: '퇴직' };
  const AUD = { student: '학생', professor: '교수', staff: '직원', external: '외부', admin: '관리자' };
  const need = (v, m) => { if (!v) throw new Error(m); };
  const adm = () => need(LMP.isAdm(), '관리자만 사용할 수 있습니다.');

  /* ═════════ 화면 단순화 공용(묶음 M · O · P) — 탭 4개 + 더보기 · 「지금 할 일」 한 줄 · 접기 ═════════
     더보기 펼침 목록은 ux.js의 details.uxmore 처리(화면 기준 위치 · 바깥 클릭 닫기)를 그대로 쓴다. */
  const UX = LMP.ux = LMP.ux || {
    /* vis · more: [[id, 라벨]] — alias: 화면 id → 강조할 탭 id(합친 탭) */
    tabs(key, vis, more, cur, alias = {}) {
      const c = alias[cur] || cur; const b = ([id, l], mi) => `<button role="${mi ? 'menuitem' : 'tab'}" ${mi ? '' : `aria-selected="${id === c}"`} class="${id === c ? 'on' : ''}" data-act="tab" data-key="${esc(key)}" data-v="${esc(id)}">${esc(l)}</button>`;
      const inMore = (more || []).find(([id]) => id === c);
      return `<div class="seg2 lmp-tabs" role="tablist">${vis.map(t => b(t, false)).join('')}${more && more.length ? `<details class="uxmore lmp-tmore ${inMore ? 'on' : ''}"><summary>${inMore ? esc(inMore[1]) : '더보기'} <em>${more.length}</em></summary><div class="uxpop" role="menu">${more.map(t => b(t, true)).join('')}</div></details>` : ''}</div>`;
    },
    /* items: [[숫자, 라벨, 강조('r'|'y'|'')]] · btn: 주 버튼 HTML 하나 */
    todo(items, btn = '', note = '') {
      const L = (items || []).filter(Boolean);
      return `<div class="lmp-todo" role="status"><b class="lmp-todoh">지금 할 일</b><div class="lmp-todoi">${L.map(([n, l, t]) => `<span class="${t || ''}"><em>${esc(String(n))}</em> ${esc(l)}</span>`).join('') || '<span>처리할 일이 없습니다</span>'}</div>${btn}${note || UX.demo()}</div>`;
    },
    demo: () => (LMP.live() ? '' : '<small class="lmp-demo">데모: 브라우저에만 저장</small>'),
    fold(key, title, body, sub = '') { const o = (UI.lmpFold || {})[key]; return `<details class="lmp-fold" data-fold="${esc(key)}" ${o ? 'open' : ''}><summary><b>${esc(title)}</b>${sub ? ` <small>${esc(sub)}</small>` : ''}</summary><div class="lmp-foldb">${body}</div></details>`; },
    pri: (act, label, extra = '') => `<button class="btn pri sm" data-act="${act}" ${extra}>${esc(label)}</button>`
  };
  if (!window.__lmpFoldL) { window.__lmpFoldL = 1; document.addEventListener('toggle', e => { const d = e.target; if (d && d.matches && d.matches('details.lmp-fold')) { UI.lmpFold = UI.lmpFold || {}; UI.lmpFold[d.dataset.fold] = d.open; } }, true); }
  /* 묶음 A(학사 연동) 데모 학기 · 분반 · 구성원을 같이 쓴다 — 없으면 null */
  const A0 = () => { try { return !LMP.live() && typeof window.lmsaEns === 'function' ? window.lmsaEns() : null; } catch (e) { return null; } };
  LMP.demoA = A0;

  function ens() {
    const L = (S.lms = S.lms || {}); if (L.m) return L.m;
    const dep = ['CSE', 'BUS', 'NUR', 'DES']; const A = A0();
    /* 데모 구성원: 묶음 A 학사 데모(학번 · 학과 · 학적)를 그대로 쓰고, 없으면 자체 16명 */
    const persons = (A && A.persons.length ? A.persons.map(p => ({ id: LMP.uuid(), member_no: p.member_no, kind: p.kind, unit_code: p.unit_code, status: p.status, grade_year: p.grade_year, source: p.source || 'sis', last_login_at: null }))
      : Array.from({ length: 16 }, (_, i) => ({ id: LMP.uuid(), member_no: `2026${String(1001 + i)}`, kind: 'student', unit_code: dep[i % 4], status: i === 5 ? 'leave' : 'active', grade_year: 1 + (i % 4), source: 'sis', last_login_at: null }))
        .concat([{ id: LMP.uuid(), member_no: 'P2026001', kind: 'professor', unit_code: 'CSE', status: 'active', grade_year: null, source: 'sis', last_login_at: null }]))
      .concat([{ id: LMP.uuid(), member_no: 'S2026001', kind: 'staff', unit_code: 'OFFICE', status: 'active', grade_year: null, source: 'sis', last_login_at: null }]);
    const stu = persons.filter(p => p.kind === 'student'); const secT = A && A.sections.length ? A.sections.filter(s => !s.hidden).map(s => s.title) : ['프로그래밍 기초 01', '경영 데이터 분석 01'];
    const log = []; const now = Date.now(); const dv = ['pc', 'pc', 'mobile', 'tablet']; const br = ['chrome', 'edge', 'safari', 'whale'];
    for (let i = 0; i < 160; i++) { const at = new Date(now - ((i * 37) % 30) * 864e5 - ((i * 7) % 24) * 3600e3); log.push({ at: LMP.iso(at), principal: 'p:' + stu[i % Math.min(stu.length, 24)].member_no, kind: i % 9 === 0 ? 'login' : i % 13 === 0 ? 'upload' : 'view', path: i % 2 ? '/class' : '/my', device: dv[i % 4], browser: br[i % 4], ip: `10.20.${i % 8}.*`, bytes: i % 13 === 0 ? 2.5e6 : 0, section: secT[i % secT.length] }); }
    L.m = { persons, ctl: {}, imp: null, impHist: [], log, popups: [{ id: LMP.uuid(), kind: 'popup', group_key: 'g1', title: '수강 정정 기간 안내', body: '11월 10일 18시까지 정정할 수 있습니다.', link: '', audience: ['student'], sort: 1, enabled: true, starts_at: LMP.nowIso(), ends_at: null }, { id: LMP.uuid(), kind: 'popup', group_key: 'g1', title: '중간 강의평가', body: '강의평가에 참여해 주세요.', link: '', audience: ['student', 'professor'], sort: 2, enabled: true, starts_at: LMP.nowIso(), ends_at: null }, { id: LMP.uuid(), kind: 'banner', group_key: '', title: '중앙도서관 시험기간 연장 운영', body: '', link: '/library', audience: ['student', 'staff'], sort: 0, enabled: true, starts_at: LMP.nowIso(), ends_at: null }],
      th: { cpu_load: { warn: 70, crit: 90 }, mem_pct: { warn: 80, crit: 92 }, disk_pct: { warn: 80, crit: 90 }, heap_pct: { warn: 80, crit: 95 }, sis_fail: { warn: 1, crit: 3 } }, samples: [1, 6, 24].map((h, i) => ({ at: LMP.iso(now - h * 36e5), level: 'ok', cpu_load: 12 + i * 7, mem_pct: 41 + i * 3, disk_pct: 38, heap_pct: 30 + i * 2, sis_fail: 0, load: [0, 0, 0], cpus: 2, runtime: 'browser(데모)', uptime: 0 })) };
    L.m.impHist.push({ id: LMP.uuid(), target: (stu[3] || stu[0]).member_no, reason: '수강 화면 오류 문의 확인(데모)', started_at: LMP.iso(now - 50 * 36e5), expires_at: LMP.iso(now - 50 * 36e5 + 9e5), ended_at: LMP.iso(now - 50 * 36e5 + 6e5), active: false, admin: '학사지원팀' });
    if ((S && S.org && S.org.empty)) { L.m.log = []; L.m.popups = []; L.m.impHist = []; L.m.persons = []; } /* v38 빈 스튜디오: 샘플 접속 기록 · 팝업 · 구성원 없이 */
    return L.m;
  }
  /* v38 구성원은 학기 · 강좌(묶음 A) 구성원을 따라간다(학번 등록 · 엑셀로 늘어난 학번도 바로 보이게) */
  const P = () => { const M = ens(); const A = A0(); if (A && Array.isArray(A.persons)) { const have = new Set(M.persons.map(p => p.member_no)); A.persons.forEach(p => { if (!have.has(p.member_no)) M.persons.push({ id: LMP.uuid(), member_no: p.member_no, kind: p.kind, unit_code: p.unit_code, status: p.status, grade_year: p.grade_year, source: p.source || 'sis', last_login_at: null }); }); } return M.persons; };
  /* 데모 수강 정보: 묶음 A 수강(학기 · 학수번호 · 분반)이 있으면 그것을, 없으면 고정 2건 */
  const enrA = mno => { const A = A0(); if (!A) return null; return A.enr.filter(e => e.member_no === mno && e.status !== 'dropped').map(e => { const s = A.sections.find(x => x.section_id === e.section_id) || {}; return { title: s.title || '', term_id: s.term_id || '', course_code: s.course_code || '', kind: e.kind, status: e.status }; }); };
  const pOut = p => { const ea = enrA(p.member_no); return { ...p, enrolled: ea ? ea.length : p.kind === 'student' ? 2 : 0, blocked: !!(ens().ctl[p.member_no] || {}).blocked }; };
  const cnt = (a, f) => a.reduce((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {});
  LMP.demo.m = {
    'access.hit': q => { const M = ens(); M.log.unshift({ at: LMP.nowIso(), principal: M.imp ? 'p:' + M.imp.target : 'u:demo-' + S.me.role, imp_by: M.imp ? 'u:demo-owner' : null, kind: q.kind || 'view', path: q.path || '', device: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'pc', browser: /Edg\//.test(navigator.userAgent) ? 'edge' : /Chrome\//.test(navigator.userAgent) ? 'chrome' : 'other', ip: '127.0.0.*', bytes: +q.bytes || 0 }); M.log = M.log.slice(0, 2000); return { ok: true, as: M.imp ? M.imp.target : null }; },
    'users.list': q => { adm(); const L = P().filter(p => (!q.q || p.member_no.includes(q.q) || (p.unit_code || '').toLowerCase().includes(String(q.q).toLowerCase())) && (!q.kind || p.kind === q.kind)); return { total: L.length, items: L.slice(0, 50).map(pOut), kinds: cnt(P(), p => p.kind) }; },
    'users.get': q => { adm(); const p = P().find(x => x.member_no === q.member_no); need(p, '없는 구성원입니다.'); return { person: p, enrollments: enrA(p.member_no) || (p.kind === 'student' ? [{ title: '프로그래밍 기초 01', term_id: '2026-2', course_code: 'CSE1001', kind: 'regular', status: 'enrolled' }, { title: '경영 데이터 분석 01', term_id: '2026-2', course_code: 'BUS2001', kind: 'audit', status: 'enrolled' }] : []), access: ens().log.filter(l => l.principal === 'p:' + p.member_no).slice(0, 30), staff: [], control: ens().ctl[p.member_no] || null }; },
    'users.save': q => { adm(); need(/^[A-Za-z0-9_-]{4,20}$/.test(q.member_no || ''), '학번 · 사번은 영문 · 숫자 4~20자입니다.'); need(!q.name && !q.phone, '이름 · 연락처는 저장하지 않습니다(학번 · 학과 · 학적만).'); let p = P().find(x => x.member_no === q.member_no); if (!p) { p = { id: LMP.uuid(), member_no: q.member_no, source: 'manual', last_login_at: null }; P().push(p); }
      Object.assign(p, { kind: q.kind || 'student', unit_code: q.unit_code || null, status: q.status || 'active', grade_year: +q.grade_year || null }); logAudit('구성원 등록 · 수정 — ' + q.member_no); return { ok: true, person: p }; },
    'users.control': q => { adm(); ens().ctl[q.member_no] = { blocked: q.blocked !== false, reason: q.reason || '', until: q.until || null }; logAudit('활동 통제 — ' + q.member_no); return { ok: true }; },
    'imp.start': q => { need(S.me.role === 'owner', '사용자 전환은 정운영자만 할 수 있습니다.'); need(P().some(p => p.member_no === q.member_no), '없는 구성원입니다.'); need(String(q.reason || '').trim().length >= 5, '전환 사유를 5자 이상 입력하세요.'); const n = Math.max(1, Math.min(30, +q.minutes || 15)); const M = ens();
      M.imp = { id: LMP.uuid(), target: q.member_no, reason: q.reason, started_at: LMP.nowIso(), expires_at: LMP.iso(Date.now() + n * 6e4), ended_at: null, active: true }; M.impHist.unshift({ ...M.imp, admin: S.me.name }); logAudit(`사용자 전환 시작 — ${q.member_no} · ${n}분 · 사유: ${q.reason}`); return { ok: true, imp: M.imp, minutes: n }; },
    'imp.current': () => { const M = ens(); if (M.imp && new Date(M.imp.expires_at) <= new Date()) M.imp = null; return { current: M.imp, history: M.impHist.slice(0, 20) }; },
    'imp.end': () => { const M = ens(); need(M.imp, '진행 중인 사용자 전환이 없습니다.'); logAudit('사용자 전환 종료 — ' + M.imp.target); (M.impHist.find(h => h.id === M.imp.id) || {}).ended_at = LMP.nowIso(); M.imp = null; return { ok: true }; },
    'stats': () => { adm(); const L = ens().log; const d = l => new Date(l.at); const by = f => cnt(L, f); const first = {}; L.forEach(l => { first[l.principal] = first[l.principal] || l.at; });
      const secs = cnt(L, l => l.section); return { total: L.length, users: new Set(L.map(l => l.principal)).size, by_month: by(l => l.at.slice(0, 7)), by_day: by(l => l.at.slice(0, 10)), by_dow: by(l => String(d(l).getDay())), by_hour: by(l => l.at.slice(11, 13)), by_term: { '2026-2': L.length }, by_device: by(l => l.device), by_browser: by(l => l.browser), by_kind: by(l => l.kind),
        new_users: 4, returning_users: Math.max(0, new Set(L.map(l => l.principal)).size - 4), upload_bytes: L.reduce((a, l) => a + (l.kind === 'upload' ? l.bytes : 0), 0), top_sections: Object.entries(secs).map(([title, hits]) => ({ title, hits, users: 8 })), term_board: (() => { const A = A0(); const t = A && A.terms.find(x => x.is_operating); return t ? [{ term_id: t.term_id, name: t.name, operating: true, sections: A.sections.filter(s => s.term_id === t.term_id && !s.hidden).length, enrollments: A.enr.filter(e => e.status === 'enrolled').length, attendance_rate: 93.4 }] : [{ term_id: '2026-2', name: '2026학년도 2학기', operating: true, sections: 2, enrollments: 32, attendance_rate: 93.4 }]; })() }; },
    'logs': q => { adm(); const aud = (S.audit || []).slice(0, 80).map(a => ({ at: a.at, src: 'audit', kind: /성적/.test(a.what) ? 'grade' : 'admin', who: a.who, what: a.what, ip: '', browser: '', device: '', path: '' }));
      const acc = ens().log.slice(0, 200).map(l => ({ at: l.at, src: 'access', kind: l.kind, who: l.principal, what: l.kind + (l.imp_by ? ` (전환: ${l.imp_by})` : ''), ip: l.ip, browser: l.browser, device: l.device, path: l.path }));
      need(!q.kind || ['login', 'logout', 'grade', 'activity', 'view', 'upload', 'admin'].includes(q.kind), '로그 종류가 올바르지 않습니다.');
      return { page: 1, items: [...aud, ...acc].filter(x => (!q.kind || x.kind === q.kind) && (!q.who || String(x.who).includes(q.who))).slice(0, 100) }; },
    'popup.list': () => ({ items: ens().popups }),
    'popup.save': q => { adm(); need(['popup', 'banner'].includes(q.kind), '종류는 팝업 · 배너입니다.'); need(q.title, 'title 값을 입력하세요.'); need(!q.link || /^(https:\/\/|\/)/.test(q.link), '링크는 https:// 또는 /로 시작해야 합니다.'); const M = ens(); let x = q.id && M.popups.find(p => p.id === q.id); if (!x) { x = { id: LMP.uuid(), starts_at: LMP.nowIso(), ends_at: null }; M.popups.push(x); }
      Object.assign(x, { kind: q.kind, group_key: q.group_key || '', title: q.title, body: q.body || '', link: q.link || '', audience: (q.audience && q.audience.length ? q.audience : Object.keys(AUD)).slice().sort(), sort: +q.sort || 0, enabled: q.enabled !== false }); return { ok: true, item: x }; },
    'popup.del': q => { const M = ens(); M.popups = M.popups.filter(p => p.id !== q.id); return { ok: true }; },
    'popup.preview': q => { const a = q.audience || 'student'; const L = ens().popups.filter(p => p.enabled && p.audience.includes(a)); const g = {}; L.filter(p => p.kind === 'popup').forEach(p => (g[p.group_key || p.id] = g[p.group_key || p.id] || []).push(p)); return { audience: a, banners: L.filter(p => p.kind === 'banner'), popups: Object.entries(g).map(([group, slides]) => ({ group, slides: slides.sort((x, y) => x.sort - y.sort) })) }; },
    'mon.th': () => ({ thresholds: ens().th }),
    'mon.th_save': q => { adm(); need(+q.crit >= +q.warn, '임계치는 숫자이고 위험 ≥ 주의여야 합니다.'); ens().th[q.metric] = { warn: +q.warn, crit: +q.crit }; logAudit('모니터링 임계치 변경 — ' + q.metric); return { thresholds: ens().th }; },
    'mon.sample': () => { adm(); const M = ens(); const pm = performance.memory || {}; const cpus = navigator.hardwareConcurrency || 2; const t0 = performance.now(); let x = 0; for (let i = 0; i < 2e5; i++) x += i; const busy = Math.min(100, (performance.now() - t0) * 20);
      const st = navigator.storage && navigator.storage.estimate ? M.est || {} : {}; if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { M.est = e; }).catch(() => { });
      const v = { cpu_load: Math.round(busy * 10) / 10, mem_pct: pm.jsHeapSizeLimit ? Math.round(pm.totalJSHeapSize / pm.jsHeapSizeLimit * 1000) / 10 : 0, disk_pct: st.quota ? Math.round(st.usage / st.quota * 1000) / 10 : 0, heap_pct: pm.jsHeapSizeLimit ? Math.round(pm.usedJSHeapSize / pm.jsHeapSizeLimit * 1000) / 10 : 0, sis_fail: ((S.lms.sis && S.lms.sis.log) || []).filter(r => !r.ok).length, load: [0, 0, 0], cpus, runtime: 'browser(데모)', uptime: Math.round(performance.now() / 1000) };
      const alerts = Object.entries(M.th).filter(([k, t]) => v[k] >= t.warn).map(([k, t]) => ({ metric: k, value: v[k], level: v[k] >= t.crit ? 'crit' : 'warn', warn: t.warn, crit: t.crit }));
      const level = alerts.some(a => a.level === 'crit') ? 'crit' : alerts.length ? 'warn' : 'ok'; M.samples.unshift({ at: LMP.nowIso(), level, ...v }); M.samples = M.samples.slice(0, 60); return { level, values: v, alerts }; },
    'mon.history': () => ({ items: ens().samples, sis_runs: ((S.lms.sis && S.lms.sis.log) || []).slice(0, 10).map(r => ({ scope: r.k, at: r.at, errors: r.ok ? 0 : 1 })) })
  };

  LMP.menu({ lmsm: { label: '시스템 관리', ws: 'ops' } });
  const TABS = [['users', '사용자'], ['imp', '사용자 전환'], ['stats', '접속 통계'], ['logs', '로그 검색'], ['popup', '팝업 · 배너'], ['mon', '서버 상태']]; void TABS;
  const bars = (o, unit = '') => { const E = Object.entries(o || {}); const mx = Math.max(1, ...E.map(([, v]) => v)); return E.length ? E.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span class="lmp-meter" style="min-width:50%">${bar(v / mx * 100)} ${num(v)}${unit}</span></div>`).join('') : '<div class="empty">데이터가 없습니다.</div>'; };
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const LV = { ok: ['정상', ''], warn: ['주의', 'y'], crit: ['위험', 'r'] };
  const MET = { cpu_load: 'CPU 부하(%)', mem_pct: '메모리(%)', disk_pct: '디스크(%)', heap_pct: '앱 메모리(%)', sis_fail: '학사연동 장애(24시간)' };

  VIEWS.lmsm = LMP.guard(() => {
    if (!LMP.isAdm()) return '<div class="empty">시스템 관리는 운영자(정 · 부운영자)만 볼 수 있습니다.</div>';
    const tb = UI.lmsmT || 'users'; let b = '', td = '';
    /* 탭: 사용자 중심 3개 + 더보기(로그 · 팝업 · 서버 상태) — 화면 id · 탭 값은 그대로 */
    const top = head('시스템 관리', '구성원을 찾고, 필요하면 그 사람 화면으로 확인합니다. 구성원은 학번 · 학과 · 학적만 다루고, 모든 변경은 감사 기록에 남습니다.') +
      UX.tabs('lmsmT', [['users', '사용자'], ['imp', '사용자 전환'], ['stats', '접속 통계']], [['logs', '로그 검색'], ['popup', '팝업 · 배너'], ['mon', '서버 상태']], tb) + '@@TODO@@';
    if (tb === 'users') {
      const q = UI.lmsmQ || ''; const d = LMP.load('m:users:' + q, 'm', 'users.list', { q }); const sel = UI.lmsmSel; const g = sel ? LMP.load('m:user:' + sel, 'm', 'users.get', { member_no: sel }) : null;
      const items = (d && d.items) || []; const kinds = (d && d.kinds) || {};
      td = UX.todo([[num(d ? d.total : 0), '구성원'], [kinds.student || 0, '학생'], [kinds.professor || 0, '교수'], [items.filter(p => p.status === 'leave').length, '휴학', 'y'], [items.filter(p => p.blocked).length, '활동 통제', items.some(p => p.blocked) ? 'r' : '']], UX.pri('lmsm-new', '구성원 등록'));
      b = `<div class="bar2"><input type="search" id="lmsmQ" value="${esc(q)}" placeholder="학번 · 학과 코드 검색" aria-label="구성원 검색"><button class="btn sm" data-act="lmsm-q">검색</button></div>` +
        (g ? `<div class="card"><div class="ch"><b>${esc(g.person.member_no)}</b><small>${esc(KIND[g.person.kind] || '')} · ${esc(g.person.unit_code || '')} · ${esc(STAT[g.person.status] || g.person.status || '')}${g.person.grade_year ? ' · ' + g.person.grade_year + '학년' : ''}</small><span><button class="btn sm" data-act="lmsm-ctl" data-v="${esc(g.person.member_no)}" data-b="${g.control && g.control.blocked ? '0' : '1'}">${g.control && g.control.blocked ? '통제 해제' : '활동 통제'}</button> <button class="btn sm" data-act="lmsm-asme" data-v="${esc(g.person.member_no)}">이 사람 화면으로 보기</button> <button class="btn sm ghost" data-act="lmsm-sel" data-v="" aria-label="상세 닫기">닫기</button></span></div>
          <p class="mini"><b>수강 정보 ${g.enrollments.length}건</b></p>${table(['학기', '학수번호', '분반', '구분'], g.enrollments.map(e => [esc(e.term_id), esc(e.course_code), esc(e.title), e.kind === 'audit' ? tag('청강', 'y') : tag('정규')]), '수강 내역이 없습니다.')}
          <p class="mini"><b>최근 접속(30건)</b></p>${table(['시각', '종류', '경로', '기기'], g.access.map(a => [esc(LMP.ts(a.at)), esc(a.kind), esc(a.path), `${esc(a.device)} <small class="mini">${esc(a.browser)} · ${esc(a.ip || '')}</small>`]), '접속 기록이 없습니다.')}</div>` : '') +
        `<div class="card"><div class="ch"><b>구성원</b><small>${d ? d.total : 0}명 · 학번을 누르면 수강 · 접속 정보를 봅니다 · 이름 · 연락처는 학사(SSO) 조회로만 표시합니다</small></div>${d ? table(['학번 · 사번', '구분', '학과', '학적', '상태'], items.slice(0, UI.lmsmN || 20).map(p => [`<a href="#" class="lmp-link" data-act="lmsm-sel" data-v="${esc(p.member_no)}">${esc(p.member_no)}</a>`, esc(KIND[p.kind] || p.kind), esc(p.unit_code || '—'), esc(STAT[p.status] || p.status), p.blocked ? tag('활동 통제', 'r') : tag('정상')]), q ? '검색 결과가 없습니다.' : '구성원이 없습니다. 「구성원 등록」으로 추가하세요.') + (items.length > (UI.lmsmN || 20) ? `<div class="bar2"><button class="btn sm ghost" data-act="lmsm-more">${Math.min(20, items.length - (UI.lmsmN || 20))}명 더 보기</button><span class="mini">${UI.lmsmN || 20} / ${items.length}명 표시 · 찾는 사람은 위에서 학번으로 검색하세요</span></div>` : '') : '<div class="empty">불러오는 중…</div>'}</div>`;
    }
    if (tb === 'imp') { const d = LMP.load('m:imp', 'm', 'imp.current', {}); const c = d && d.current; const H = (d && d.history) || [];
      td = UX.todo([[c ? 1 : 0, '전환 중', c ? 'r' : ''], [H.length, '전환 이력']]);
      b = `<div class="card"><div class="ch"><b>사용자 전환</b><small>학생 · 교수 화면을 그대로 확인할 때 씁니다 · 정운영자 전용 · 사유 필수 · 최대 30분 · 모두 감사 기록</small></div>${c ? `<div class="lmp-banner" role="status">${tag('전환 중', 'r')} <b>${esc(c.target)}</b> 화면으로 보는 중 · ${esc(LMP.ts(c.expires_at))}까지 · 사유: ${esc(c.reason)} <button class="btn sm" data-act="lmsm-impend">전환 종료</button></div>` :
        `<div class="form2"><label>대상 학번 · 사번<input id="lmsmImpN" placeholder="20261001" value="${esc(UI.lmsmImpPre || '')}"></label><label>시간(분, 최대 30)<input id="lmsmImpM" type="number" min="1" max="30" value="15"></label></div><label class="fl">전환 사유(5자 이상)<input id="lmsmImpR" maxlength="200" placeholder="예: 수강 화면 오류 문의 확인"></label><button class="btn pri" data-act="lmsm-imp" ${S.me.role === 'owner' ? '' : 'disabled'}>전환 시작</button>`}</div>
        <div class="card"><div class="ch"><b>전환 이력</b></div>${table(['시작', '대상', '사유', '종료'], H.map(h => [`${esc(LMP.ts(h.started_at))} <small class="mini">${esc(h.admin || '')}</small>`, esc(h.target), esc(h.reason), h.ended_at ? esc(LMP.ts(h.ended_at)) : h.active && c && c.id === h.id ? tag('진행 중', 'r') : tag('시간 만료', 'y')]), '아직 전환한 적이 없습니다. 학생 문의를 확인할 때 위에서 시작하세요.')}</div>`; }
    if (tb === 'stats') { const d = LMP.load('m:stats', 'm', 'stats', {});
      td = d ? UX.todo([[num(d.total), '접속(30일)'], [num(d.users), '사용자'], [d.new_users, '신규'], [((d.term_board || [])[0] || {}).attendance_rate != null ? d.term_board[0].attendance_rate + '%' : '—', '출석률']]) : '';
      b = d ? `<div class="grid g2"><div class="card"><div class="ch"><b>학기 현황</b></div>${table(['학기', '분반', '수강', '출석률'], (d.term_board || []).map(t => [`${esc(t.name)} ${t.operating ? tag('운영') : ''}`, num(t.sections), num(t.enrollments), t.attendance_rate == null ? '—' : t.attendance_rate + '%']))}</div><div class="card"><div class="ch"><b>많이 쓰는 강좌(상위 10)</b></div>${table(['분반', '접속', '사용자'], (d.top_sections || []).slice(0, 10).map(s => [esc(s.title), num(s.hits), num(s.users)]))}</div>
        <div class="card"><div class="ch"><b>일별 추이(14일)</b></div>${bars(Object.fromEntries(Object.entries(d.by_day).sort().slice(-14)))}</div><div class="card"><div class="ch"><b>요일별</b></div>${bars(Object.fromEntries(Object.entries(d.by_dow).sort().map(([k, v]) => [DOW[+k] || k, v])))}</div></div>` +
        UX.fold('lmsm-stats-more', '자세한 통계', `<div class="grid g2"><div class="card"><div class="ch"><b>월별</b></div>${bars(d.by_month)}</div><div class="card"><div class="ch"><b>시간대별</b></div>${bars(Object.fromEntries(Object.entries(d.by_hour).sort()))}</div>
        <div class="card"><div class="ch"><b>기기 · 브라우저</b></div>${bars({ ...d.by_device, ...Object.fromEntries(Object.entries(d.by_browser).map(([k, v]) => ['브라우저 ' + k, v])) })}</div><div class="card"><div class="ch"><b>학기별 · 활동 종류</b></div>${bars({ ...d.by_term, ...Object.fromEntries(Object.entries(d.by_kind).map(([k, v]) => ['활동 ' + k, v])) })}</div></div><p class="mini">재방문 ${num(d.returning_users)}명 · 업로드 사용량 ${(d.upload_bytes / 1048576).toFixed(1)}MB</p>`, '월별 · 시간대별 · 기기 · 브라우저 · 업로드 사용량') : '<div class="empty">불러오는 중…</div>'; }
    if (tb === 'logs') { const k = UI.lmsmLk || ''; const w = UI.lmsmLw || ''; const d = LMP.load(`m:logs:${k}:${w}`, 'm', 'logs', { kind: k, who: w }); const L = (d && d.items) || [];
      td = UX.todo([[L.length, '로그(최근 7일 · 100건까지)'], [L.filter(x => x.kind === 'grade').length, '성적 변경'], [L.filter(x => x.kind === 'admin').length, '관리 작업']]);
      b = `<div class="bar2"><select data-chg="lmsm-lk" aria-label="로그 종류">${[['', '전체'], ['login', '로그인'], ['logout', '로그아웃'], ['grade', '성적 변경'], ['activity', '수업 활동'], ['view', '화면 열람'], ['upload', '업로드'], ['admin', '관리 작업']].map(([v, l]) => `<option value="${v}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input type="search" id="lmsmLw" value="${esc(w)}" placeholder="사용자(학번 · 이메일)" aria-label="사용자 검색"><button class="btn sm" data-act="lmsm-lw">검색</button><button class="btn sm ghost" data-act="lmsm-lcsv">엑셀(CSV) 내려받기</button></div>
        <div class="card"><div class="ch"><b>로그</b><small>IP는 끝자리를 가립니다</small></div>${table(['시각', '종류', '사용자', '내용'], L.map(x => [esc(LMP.ts(x.at)), esc(x.kind), esc(x.who), `${esc(x.what)}<small class="mini lmp-sub">${esc([x.src === 'audit' ? '감사 기록' : '접속 기록', x.path, x.browser, x.ip].filter(Boolean).join(' · '))}</small>`]), '조건에 맞는 로그가 없습니다.')}</div>`; }
    if (tb === 'popup') { const d = LMP.load('m:pop', 'm', 'popup.list', {}); const a = UI.lmsmAud || 'student'; const pv = LMP.load('m:prev:' + a, 'm', 'popup.preview', { audience: a }); const P2 = (d && d.items) || [];
      td = UX.todo([[P2.filter(p => p.enabled && p.kind === 'popup').length, '게시 중 팝업'], [P2.filter(p => p.enabled && p.kind === 'banner').length, '게시 중 배너'], [P2.filter(p => !p.enabled).length, '중지']], `<button class="btn pri sm" data-act="lmsm-pop" data-k="popup">팝업 추가</button>`);
      b = `<div class="card"><div class="ch"><b>팝업 · 배너</b><small>같은 묶음의 팝업은 한 창에서 넘겨 봅니다</small><button class="btn sm" data-act="lmsm-pop" data-k="banner">배너 추가</button></div>${table(['제목', '대상', '상태', ''], P2.map(p => [`${p.kind === 'popup' ? tag('팝업') : tag('배너', 'y')} ${esc(p.title)}`, esc(p.audience.map(x => AUD[x] || x).join(' · ')), p.enabled ? tag('게시') : tag('중지', 'y'), `<button class="btn sm ghost" data-act="lmsm-pdel" data-id="${esc(p.id)}">삭제</button>`]), '등록된 팝업 · 배너가 없습니다.')}</div>
        <div class="card"><div class="ch"><b>사용자 유형별 미리보기</b><select data-chg="lmsm-audsel" aria-label="미리볼 사용자 유형">${Object.entries(AUD).map(([k, l]) => `<option value="${k}" ${k === a ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${pv ? `${(pv.banners || []).map(x => `<div class="lmp-banner">${tag('배너', 'y')} <b>${esc(x.title)}</b> ${x.link ? `<span class="mini">${esc(x.link)}</span>` : ''}</div>`).join('')}${(pv.popups || []).map(g => `<div class="card"><div class="ch"><b>팝업 · ${g.slides.length}장</b></div>${g.slides.map((s, i) => `<p><b>${i + 1}. ${esc(s.title)}</b> <span class="mini">${esc(s.body)}</span></p>`).join('')}<label class="ul-ck"><input type="checkbox"> 오늘 하루 보지 않기</label></div>`).join('') || (!(pv.banners || []).length ? '<div class="empty">이 유형에 보이는 팝업 · 배너가 없습니다.</div>' : '')}` : ''}</div>`; }
    if (tb === 'mon') { const th = LMP.load('m:th', 'm', 'mon.th', {}); const s = UI.lmsmSample; const h = LMP.load('m:hist', 'm', 'mon.history', {}); const sr = (h && h.sis_runs) || [];
      td = UX.todo([[s ? LV[s.level][0] : '측정 전', '서버 상태', s && s.level !== 'ok' ? (s.level === 'crit' ? 'r' : 'y') : ''], [s ? s.alerts.length : 0, '임계치 넘음'], [sr.filter(r => r.errors).length, '학사 연동 오류']], UX.pri('lmsm-sample', '지금 측정'));
      b = `<p class="mini">${LMP.live() ? '서버 프로세스 지표(부하 · 메모리 · 디스크)' : '데모: 브라우저 지표로 대신 측정합니다'}</p>` +
        (s ? `<div class="kpis">${['cpu_load', 'mem_pct', 'disk_pct', 'heap_pct'].map(k => kpi(MET[k], (s.values[k] ?? 0) + '%', (s.alerts.find(a => a.metric === k) || {}).level === 'crit' ? '위험' : (s.alerts.find(a => a.metric === k) ? '주의' : '정상'))).join('')}</div>
          <div class="card"><div class="ch"><b>상태 ${tag(...LV[s.level])}</b><small>${esc(s.values.runtime || '')} · CPU ${s.values.cpus}개</small></div>${s.alerts.length ? s.alerts.map(a => `<div class="row"><span>${esc(MET[a.metric] || a.metric)}</span><span>${tag(...LV[a.level])} ${a.value} (주의 ${a.warn} · 위험 ${a.crit})</span></div>`).join('') : '<p class="mini">임계치를 넘은 지표가 없습니다.</p>'}<p class="mini">위험 단계가 되면 관리자에게 문자 알림을 보냅니다(발송 연동 후, 30분에 한 번).</p></div>` : '') +
        `<div class="card"><div class="ch"><b>측정 이력</b><small>학사 연동: 최근 ${sr.length}건 중 오류 ${sr.filter(r => r.errors).length}건</small></div>${table(['시각', '상태', 'CPU', '메모리'], ((h && h.items) || []).slice(0, 10).map(x => [esc(LMP.ts(x.at)), tag(...(LV[x.level] || [x.level])), x.cpu_load, x.mem_pct]), '아직 측정하지 않았습니다. 「지금 측정」을 누르세요.')}</div>` +
        UX.fold('lmsm-th', '경고 기준(임계치) 설정', Object.entries((th && th.thresholds) || {}).map(([k, t]) => `<div class="row"><span>${esc(MET[k] || k)}</span><span class="lmp-meter"><input type="number" aria-label="${esc(MET[k])} 주의" value="${t.warn}" id="lmsmW_${k}" style="width:72px"><input type="number" aria-label="${esc(MET[k])} 위험" value="${t.crit}" id="lmsmC_${k}" style="width:72px"><button class="btn sm" data-act="lmsm-th" data-k="${k}">저장</button></span></div>`).join(''), '주의 · 위험 값'); }
    return top.replace('@@TODO@@', td) + b;
  });
  ACT.lmsmT = el => { UI.lmsmT = el.dataset.v; render(); };
  ACT['lmsm-more'] = () => { UI.lmsmN = (UI.lmsmN || 20) + 20; render(); };
  ACT['lmsm-q'] = () => { UI.lmsmN = 20;  UI.lmsmQ = $('#lmsmQ').value.trim(); render(); };
  ACT['lmsm-sel'] = el => { UI.lmsmSel = el.dataset.v; render(); };
  ACT['lmsm-ctl'] = el => LMP.run('m', 'users.control', { member_no: el.dataset.v, blocked: el.dataset.b === '1', reason: el.dataset.b === '1' ? '관리자 활동 통제' : '' }, el.dataset.b === '1' ? '활동을 통제했습니다.' : '통제를 풀었습니다.', 'm:');
  ACT['lmsm-new'] = () => modal('구성원 등록', `<label class="fl">학번 · 사번<input name="member_no" maxlength="20" placeholder="20261099"></label><label class="fl">구분<select name="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label class="fl">학과 코드<input name="unit_code" maxlength="20" placeholder="CSE"></label><label class="fl">학적<select name="status">${Object.entries(STAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><p class="mini">이름 · 연락처는 저장하지 않습니다. 학사 연동 구성원은 학사가 원본입니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '등록', kind: 'pri', run: w => { LMP.run('m', 'users.save', { member_no: fv(w, 'member_no'), kind: fv(w, 'kind'), unit_code: fv(w, 'unit_code'), status: fv(w, 'status') }, '구성원을 등록했습니다.', 'm:'); } }]);
  ACT['lmsm-imp'] = async () => { const r = await LMP.run('m', 'imp.start', { member_no: $('#lmsmImpN').value.trim(), minutes: +$('#lmsmImpM').value, reason: $('#lmsmImpR').value }, r => `${r.minutes}분 동안 사용자 전환을 시작했습니다(감사 기록).`, 'm:'); if (r) LMP.drop('m:'); };
  ACT['lmsm-impend'] = () => LMP.run('m', 'imp.end', {}, '사용자 전환을 끝냈습니다.', 'm:');
  ACT['lmsm-lk'] = el => { UI.lmsmLk = el.value; render(); };
  ACT['lmsm-lw'] = () => { UI.lmsmLw = $('#lmsmLw').value.trim(); render(); };
  ACT['lmsm-lcsv'] = () => { const c = LMP.cache[`m:logs:${UI.lmsmLk || ''}:${UI.lmsmLw || ''}`]; const L = (c && c.v && c.v.items) || []; downloadCSV(`로그_${today()}.csv`, ['시각', '출처', '종류', '사용자', '내용', '경로', '브라우저', 'IP'], L.map(x => [x.at, x.src, x.kind, x.who, x.what, x.path, x.browser, x.ip])); };
  ACT.lmsmAud = el => { UI.lmsmAud = el.dataset.v; render(); };
  ACT['lmsm-audsel'] = el => { UI.lmsmAud = el.value; render(); };
  /* 구성원 상세 → 사용자 전환(학번을 채워 둔다) */
  ACT['lmsm-asme'] = el => { UI.lmsmImpPre = el.dataset.v; UI.lmsmT = 'imp'; render(); };
  ACT['lmsm-pop'] = el => { const k = el.dataset.k; modal(k === 'popup' ? '팝업 추가' : '배너 추가', `<label class="fl">제목<input name="title" maxlength="80"></label><label class="fl">내용<textarea name="body" rows="3" maxlength="2000"></textarea></label><label class="fl">링크(https:// 또는 /)<input name="link" maxlength="300"></label>${k === 'popup' ? '<label class="fl">그룹 키(같은 키는 한 팝업에서 넘겨 보기)<input name="group_key" maxlength="40" placeholder="예: 2026-2학기"></label>' : ''}<fieldset class="lmp-fs"><legend>대상 사용자 유형</legend>${Object.entries(AUD).map(([a, l]) => `<label class="ul-ck in"><input type="checkbox" name="a_${a}" ${a === 'student' ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { LMP.run('m', 'popup.save', { kind: k, title: fv(w, 'title'), body: fv(w, 'body'), link: fv(w, 'link'), group_key: k === 'popup' ? fv(w, 'group_key') : '', audience: Object.keys(AUD).filter(a => fv(w, 'a_' + a)) }, '저장했습니다.', 'm:'); } }]); };
  ACT['lmsm-pdel'] = el => LMP.run('m', 'popup.del', { id: el.dataset.id }, '지웠습니다.', 'm:');
  ACT['lmsm-sample'] = async () => { const r = await LMP.run('m', 'mon.sample', {}, null, 'm:hist'); if (r) { UI.lmsmSample = r; render(); } };
  ACT['lmsm-th'] = el => { const k = el.dataset.k; LMP.run('m', 'mon.th_save', { metric: k, warn: $('#lmsmW_' + k).value, crit: $('#lmsmC_' + k).value }, '임계치를 저장했습니다.', 'm:th'); };

  /* 전역: 사용자 전환 중 띠 · 접속 기록(운영 모드, 화면 바뀔 때 1회) */
  let lastHit = '';
  AFTER.push(cur => {
    if (!window.ULMS || !ULMS()) return; const key = cur.ws + '/' + (cur.tab || '');
    if (key !== lastHit) { lastHit = key; if (LMP.live()) { try { if (!sessionStorage.getItem('lmsm.login')) { sessionStorage.setItem('lmsm.login', '1'); LMP.call('m', 'access.hit', { kind: 'login', path: '/' }).catch(() => { }); } } catch (e) { } LMP.call('m', 'access.hit', { kind: 'view', path: '/' + key }).catch(() => { }); } else if (S.lms && S.lms.m) LMP.demo.m['access.hit']({ kind: 'view', path: '/' + key }); }
    const imp = S.lms && S.lms.m && S.lms.m.imp; const c = LMP.cache['m:imp'] && LMP.cache['m:imp'].v && LMP.cache['m:imp'].v.current; const cur2 = c || (imp && new Date(imp.expires_at) > new Date() ? imp : null);
    const main = $('#main'); if (main && cur2 && !$('#lmsmImpBar')) main.insertAdjacentHTML('afterbegin', `<div class="lmp-banner" id="lmsmImpBar" role="status">${tag('사용자 전환 중', 'r')} <b>${esc(cur2.target)}</b> · ${esc(LMP.ts(cur2.expires_at))}까지 · 모든 활동이 감사 기록에 남습니다. <a href="#" data-act="go" data-v="lmsm">관리로 가기</a></div>`);
  });
})();
