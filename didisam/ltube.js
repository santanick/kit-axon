/* v39 디디쌤 튜브 — 학습자 앱(body.lapp)의 기준 화면(대표님 2026-11-13 「이걸로 디자인 바꾸자」, 시안 Design 캔버스 9BQuDutXVxyUDeK6kaHV1w)
   - 로그인한 학습자: 홈 피드(흰 머리 · 칩 · 오늘 목표 · 이어 보기 · AI 튜터 제안 · 이번 주 차시) + 하단 탭 4칸(홈 · 일정 · 내 과정 · 나) + 늘 떠 있는 AI 튜터 아이콘(누르면 열림)
   - AI 튜터: 대표님(2026-11-13) 「아이콘 누르면 활성화, 앱에 상시로 떠 있어야」 → 모든 화면 오른쪽 아래 아이콘(#tbFab). 영상 레슨에서는 장면 튜터 시트, 그 밖에서는 선생님 대화 창(ltOpen)을 연다.
   - 영상 레슨(#c/과정/항목): 플레이어 아래 챕터 칩 + 장면 튜터 시트(지금 재생 위치 t를 서버에 함께 보냄 → 근거 구간)
   - 짧게 복습(#review): 틀린 퀴즈가 있는 과정에서 강사가 넣은 챕터 구간(it.chaps)만 세로 화면으로 + 그 과정 퀴즈 1문제. 하루 5개까지, 진도에는 넣지 않음.
     대표님(2026-11-13): 「쇼츠가 디디쌤 시나리오에 맞아?」 → 기관 수강은 진도 · 출결 · 수료 중심이라 쇼츠를 탭으로 두지 않고, AI 튜터 제안의 복습 보조로만 연다. 탭 자리는 일정(학습 캘린더 #cal).
   - 오늘 목표(#done): 하루 목표(분)를 채우면 완료 화면(이번 주 연속 · 내일 시작 지점)
   - 직업훈련(voc) · 대학 학사 LMS(univ/lms) · 고용노동부 규정 프로필: 짧게 복습 · 챕터 이동(건너뛰기)을 끈다(docs/compliance). 배속은 기존 과정 규칙(lcls.js) 그대로.
   - 보호자 · 방문자 · 기존 화면(classic)은 손대지 않는다. 기록은 LR.lp.tube(서버 cleanTube와 같은 모양)에만.
   learner.html에서 lkeep.js 다음, lboot.js 바로 앞(모든 lrender 감싸기의 가장 바깥). */
'use strict';
(() => {
  if (typeof lrender !== 'function') return;
  const TB = { f: 'all', msgs: {}, busy: false, sh: 0, shT: null, lastSave: 0, doneShown: '' };
  window.TUBE = TB;
  const $ = (s, r) => (r || document).querySelector(s);
  const SV = (d, s, o) => `<svg width="${s || 24}" height="${s || 24}" viewBox="0 0 24 24" aria-hidden="true" ${o || 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${d}</svg>`;
  const I = {
    play: s => SV('<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>', s),
    bell: s => SV('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>', s),
    search: s => SV('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', s),
    home: s => SV('<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="currentColor" stroke="none"/>', s),
    homeO: s => SV('<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>', s),
    cal: s => SV('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', s),
    shorts: s => SV('<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M11 9l4 3-4 3z" fill="currentColor"/>', s),
    spark: s => SV('<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="currentColor" stroke="none"/>', s),
    course: s => SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>', s),
    menu: s => SV('<path d="M4 7h16M4 12h16M4 17h16"/>', s),
    me: s => SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', s),
    back: s => SV('<path d="M15 5l-7 7 7 7"/>', s),
    up: s => SV('<path d="M12 19V5M5 12l7-7 7 7"/>', s),
    check: s => SV('<path d="M5 12l5 5 9-10"/>', s, 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'),
    film: s => SV('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>', s),
    /* v43 선 아이콘(그린 700 선 · 1.75) — 바로가기 타일 · 썸네일 패턴 · 재생 화면 */
    doc: s => SV('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', s),
    quiz: s => SV('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/>', s),
    edit: s => SV('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', s),
    live: s => SV('<circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4M5 5a10 10 0 000 14M19 5a10 10 0 010 14"/>', s),
    pin: s => SV('<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', s),
    send: s => SV('<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>', s),
    compass: s => SV('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', s),
    users: s => SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 010 6.4M18 14.8c1.8.7 3 2.4 3.5 5.2"/>', s),
    award: s => SV('<circle cx="12" cy="9" r="6"/><path d="M8.5 14.2L7 22l5-3 5 3-1.5-7.8"/>', s),
    mega: s => SV('<path d="M3 10v4a1 1 0 001 1h3l6 4V5L7 9H4a1 1 0 00-1 1z"/><path d="M17 8.5a5 5 0 010 7"/>', s),
    list: s => SV('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>', s),
    down: s => SV('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', s),
    next: s => SV('<path d="M9 5l7 7-7 7"/>', s),
    fac: s => SV('<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M3 21h18"/>', s)
  };
  const ty = () => (SITE() && SITE().org && SITE().org.type) || 'adult';
  const ed = () => (SITE() && SITE().org && SITE().org.ed) || '';
  const isPar = () => !!(LR.me && LR.me.kind === 'parent');
  /* 규정 대상: 직업훈련 · 학사 LMS · 고용노동부 원격훈련 프로필 — 짧게 복습 · 챕터 건너뛰기 없음 */
  const strict = () => { try { const c = SITE().cpl; return ty() === 'voc' || (ty() === 'univ' && ed() === 'lms') || !!(c && c.on && /^moel-/.test(String(c.profile || ''))); } catch (e) { return ty() === 'voc'; } };
  const on = () => { try { return document.body.classList.contains('lapp') && !!LR.me && !isPar() && !!SITE(); /* 어드민 학습자 화면 미리보기에서도 같은 화면 */ } catch (e) { return false; } };
  window.tubeOn = on;
  const day = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  const mmss = s => { s = Math.max(0, Math.floor(+s || 0)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const unit = () => (ty() === 'k12' ? '회차' : '차시');
  /* 관리자 설정 · 유형 용어: 튜터 켜기(tutor.enabled) · 튜터 이름(학습자가 고른 선생님 → 기관 튜터 이름) · 유형별 탭 이름 · 둘러보기 · 커뮤니티/공지 */
  const info = () => { try { return window.lappInfo ? window.lappInfo() : {}; } catch (e) { return {}; } };
  const tOn = () => { try { return TCFG().enabled !== false; } catch (e) { return true; } };
  const tNm = () => String(info().tName || (typeof TCFG === 'function' && TCFG().name) || 'AI 튜터');

  /* ── 학습 기록(lp.tube) ── */
  const rec = () => { const L = LR.lp || (LR.lp = {}); const t = L.tube && typeof L.tube === 'object' ? L.tube : (L.tube = {}); ['sec', 'sh', 'qr', 'qn'].forEach(k => { if (!t[k] || typeof t[k] !== 'object') t[k] = {}; }); return t; };
  const goal = () => { const g = +rec().goal; return g >= 5 && g <= 180 ? g : 20; };
  const secToday = () => +rec().sec[day()] || 0;
  const minToday = () => Math.floor(secToday() / 60);
  const reached = d => (+rec().sec[d] || 0) >= goal() * 60;
  const trim = m => { const k = Object.keys(m).sort(); k.slice(0, Math.max(0, k.length - 40)).forEach(x => delete m[x]); };
  function addSec(n) { const t = rec(); const d = day(); const before = reached(d); t.sec[d] = Math.min(86400, (+t.sec[d] || 0) + n); trim(t.sec);
    const now = Date.now(); if (now - TB.lastSave > 30000) { TB.lastSave = now; try { LR.api.save(); } catch (e) { } }
    if (!before && reached(d)) onGoal(); }
  function onGoal() { try { LR.api.save(); } catch (e) { } if (TB.doneShown === day()) return; TB.doneShown = day(); const a = route().a;
    if (a === 'home' || a === 'review') { location.hash = '#done'; return; }
    toast(`오늘 목표 ${goal()}분을 채웠어요. 오늘은 여기서 쉬어도 좋아요.`, 'ok'); }

  /* 재생 중인지(YouTube LW.yp · 업로드 영상 · 짧게 복습) — 화면이 보일 때만 5초마다 센다 */
  function playing() { try { if (document.visibilityState !== 'visible') return false; const p = typeof LW === 'object' && LW && LW.yp;
    if (/^#c\//.test(location.hash) && p && typeof p.getPlayerState === 'function' && p.getPlayerState() === 1) return true;
    const v = $('#lm video'); return !!(v && !v.paused && !v.ended); } catch (e) { return false; } } /* 짧게 복습 화면은 학습 시간으로 세지 않는다(요원 3: 화면만 열어 둬도 늘던 문제) */
  setInterval(() => { if (on() && playing()) addSec(5); }, 5000);

  /* ── 데이터: 내 과정 · 다음 차시 · 챕터 ── */
  const stats = () => { try { return myStats(); } catch (e) { return { courses: [] }; } };
  const lpItem = (cid, iid) => ((((LR.lp || {}).cls || {})[cid] || {}).items || {})[iid] || {};
  const seq = c => (c.items || []).filter(x => x.type !== 'chapter');
  const nOf = (c, it) => seq(c).indexOf(it) + 1;
  const durOf = (c, it) => { const r = lpItem(c.id, it.id); const t = +it.time > 0 ? it.time * 60 : 0; return Math.max(t, +r.max || 0, +r.dur || 0); };
  const chapsOf = it => (Array.isArray(it && it.chaps) ? it.chaps : []).filter(x => x && Number.isFinite(+x.t)).map(x => ({ t: Math.max(0, Math.floor(+x.t)), n: String(x.n || '').slice(0, 40) })).sort((a, b) => a.t - b.t);
  const COL = ['#053D1E', '#066B2A', '#0B3A1E', '#03271A', '#00862D', '#0F3D24']; /* v43: 보라 · 파랑 · 분홍 단색 → 짙은 그린 6단(흰 글자 4.5:1 이상) */
  const colOf = s => COL[[...String(s || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COL.length];
  /* 이어 볼 것: 최근 학습한(재생 위치가 있는) 영상 → 진행 중 과정의 다음 항목 */
  function cont() { const C = stats().courses.filter(x => !x.done); let best = null;
    C.forEach(x => seq(x.c).forEach(it => { if (it.type !== 'video') return; const r = lpItem(x.c.id, it.id); if (r.done || !(+r.pos > 0)) return; const at = String(r.at || ''); if (!best || at > best.at) best = { x, it, at }; }));
    if (best) return best; const x = C.find(y => y.next) || null; return x ? { x, it: x.next, at: '' } : null; }
  function hrefOf(c, it) { return `#c/${encodeURIComponent(c.id)}/${encodeURIComponent(it.id)}`; }
  /* v43 썸네일: 강좌 사진 → 강좌명과 장면이 맞는 스톡 사진(hpstock H2 규칙과 같은 원칙, 일반 장면은 쓰지 않음) → 그린 톤 패턴 4종.
     분홍 · 보라 단색(COL)은 더 쓰지 않는다. 패턴 위 아이콘은 항목 유형(영상 · 자료 · 퀴즈 · 과제 · 라이브). */
  const hsh = s => [...String(s || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const STK = [[/엑셀|데이터|통계|회계|재무|세무|전산|ERP|빅데이터/i, ['dat-01']], [/코딩|파이썬|프로그래밍|자바스크립트|웹 ?개발|앱 ?개발/i, ['cod-01', 'cod-02', 'cod-03', 'cod-04']], [/영어|토익|토플|어학|일본어|중국어|회화/i, ['lan-01', 'lan-02']],
    [/디자인|포토샵|피그마|일러스트레이터|UX|UI/i, ['dsk-04']], [/법정|의무교육|청렴|윤리|개인정보|성희롱|괴롭힘|컴플라이언스/, ['doc-01']], [/자격증|기출|필기|실기|모의고사|합격/, ['dsk-01', 'dsk-02']]];
  const stockOf = s => { const t = String(s || ''); const r = STK.find(([re]) => re.test(t)); return r ? r[1][hsh(t) % r[1].length] : ''; };
  const TYI = { video: 'play', doc: 'doc', quiz: 'quiz', exam: 'quiz', assign: 'edit', live: 'live', offline: 'pin' };
  const patHTML = (seed, ty, cls) => `<span class="${cls} tb-pat p${hsh(seed) % 4}" aria-hidden="true"><i>${I[TYI[ty] || 'film'](28)}</i></span>`;
  /* 사진 있는 썸네일: <img> 한 장(가로 꽉 채움). 없으면 패턴 */
  const photoOf = c => c.thumb || (stockOf(c.name) ? `img/stock/${stockOf(c.name)}-800.webp` : '');
  function thumbBlock(c, it, cls) { const ph = photoOf(c); return ph ? `<span class="${cls} img"><img src="${esc(ph)}" alt="" loading="lazy"></span>` : patHTML(c.name, it ? it.type : 'video', cls); }

  /* ── 홈 피드 ── */
  const CH = () => { const L = stats().courses; const live = liveSoon().length; const cert = L.some(x => /자격|시험|필기|실기/.test(x.c.name || '') || (x.c.items || []).some(i => i.type === 'exam'));
    return [['all', '전체', 1], ['cont', '이어 보기', !!cont()], ['mine', info().learn || '내 과정', L.length > 0], ['live', '라이브', live > 0], ['cert', '자격증', cert && ['adult', 'corp', 'lifelong', 'voc'].includes(ty())]].filter(x => x[2]); };
  function liveSoon() { const t0 = day(), t7 = day(new Date(Date.now() + 6 * 864e5)); const out = [];
    try { (SITE().classes || []).forEach(c => { const x = typeof lwCls === 'function' ? lwCls(c.id) : null; if (!x || x.enrolled === false) return; if (!stats().courses.some(y => y.c.id === c.id) && !x.enrolled) return; lwUnits(x).filter(u => u.date && u.date >= t0 && u.date <= t7 && (u.type === 'live' || u.link || x.kind === 'episode')).forEach(u => out.push({ c, u })); }); } catch (e) { }
    return out.sort((a, b) => (a.u.date + (a.u.from || '')).localeCompare(b.u.date + (b.u.from || ''))); }
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const wdOf = d => WD[new Date(d + 'T00:00:00Z').getUTCDay()];
  function headHTML() { let n = 0; try { n = typeof laItems === 'function' ? laItems().L.filter(x => !x.read).length : 0; } catch (e) { }
    const org = (SITE().org || {}).name || '';
    return `<header class="tb-head"><div class="tb-hr"><button type="button" class="tb-brand" data-ap="orgs" aria-label="기관 바꾸기 — 지금 ${esc(org)}"><span class="tb-logo">${I.play(12)}</span><b>${esc(org || '디디쌤')}</b></button>
      <a class="tb-ib" href="#inbox" aria-label="알림${n ? ` · 새 알림 ${n}개` : ''}">${I.bell(24)}${n ? `<i>${n > 99 ? '99+' : n}</i>` : ''}</a><button type="button" class="tb-ib" data-ap="srch" aria-label="검색">${I.search(24)}</button><button type="button" class="tb-ib" data-lux="menu" aria-haspopup="dialog" aria-expanded="false" aria-label="전체 메뉴 — 공지 · 둘러보기 · 기관 메뉴">${I.menu(24)}</button></div>
      <div class="tb-chips" role="tablist" aria-label="보기">${CH().map(([k, l]) => `<button type="button" role="tab" class="tb-chip${TB.f === k ? ' on' : ''}" aria-selected="${TB.f === k}" data-tb="f" data-v="${k}">${esc(l)}</button>`).join('')}</div></header>`; }
  /* 관리자가 상단 고정한 공지(내 과정 · 기관 전체) — 요원 2 */
  function pinHTML() { try { const mine = new Set(stats().courses.map(x => x.c.id)); const N = (SITE().notices || []).filter(n => n && n.pin && (!n.clsId || mine.has(n.clsId))).sort((a, b) => (a.ord || 0) - (b.ord || 0)); if (!N.length) return '';
    const n = N[0]; return `<a class="tb-pin" href="#notice"><em>공지</em><b>${esc(n.title)}</b>${N.length > 1 ? `<small>외 ${N.length - 1}건</small>` : ''}</a>`; } catch (e) { return ''; } }
  /* v43 질문형 헤드라인: 「서아님, 오늘 8분만 더 해 볼까요?」 — 화면 첫 줄 한 문장(디스플레이 28~32px/800). 이름이 없으면 인사 없이 질문만 */
  function hlHTML() { const g = goal(), m = Math.min(minToday(), 999), left = Math.max(0, g - m); const me = LR.me || {}; const nm = String(me.nick || me.name || '').trim();
    const q = m >= g ? `오늘 목표를 <em>다 채웠어요</em>` : m === 0 ? `오늘 <em>${g}분</em>, 시작해 볼까요?` : `오늘 <em>${left}분</em>만 더 해 볼까요?`;
    const dt = new Date(Date.now() + 9 * 3600e3); const eb = `${dt.getUTCMonth() + 1}월 ${dt.getUTCDate()}일 ${WD[dt.getUTCDay()]}요일`;
    return `<section class="tb-hl" aria-label="오늘 한 줄"><small class="tb-eb">${eb}</small><h1>${nm ? `${esc(nm)}님,<br>` : ''}${q}</h1></section>`; }
  /* 이번 주 7칸(월~일): 목표 달성일 · 오늘 · 앞날 — 홈 히어로와 완료 화면이 같이 쓴다 */
  function weekDays() { const d = day(); const now = new Date(Date.now() + 9 * 3600e3); const dow = (now.getUTCDay() + 6) % 7; const mon = new Date(now.getTime() - dow * 864e5);
    return [...Array(7)].map((_, i) => { const di = new Date(mon.getTime() + i * 864e5).toISOString().slice(0, 10); return { di, l: '월화수목금토일'[i], ok: reached(di), today: di === d, fut: di > d }; }); }
  function streakN() { const d = day(); let n = 0; for (let k = 0; k < 400; k++) { const di = day(new Date(Date.now() - k * 864e5)); if (reached(di)) n++; else if (k > 0 || di !== d) break; } return n; }
  /* 링(SVG): 오늘 목표 진행률. 색은 토큰(--gr300 위 트랙 흰 14%) */
  const ringSVG = (p, sz = 92, w = 9) => { const r = (sz - w) / 2, C = 2 * Math.PI * r; return `<svg class="tb-ring2" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" aria-hidden="true"><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="${w}"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="var(--gr300)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${sz / 2} ${sz / 2})"/></svg>`; };
  /* 오늘 목표 히어로(메시 1곳 허용): 링 + 한 줄 + 이번 주 7칸. 버튼 전체가 「목표 바꾸기」 */
  function goalHTML() { const g = goal(), m = Math.min(minToday(), 999), p = Math.min(100, Math.round(m / g * 100)); const done = m >= g; const st = streakN();
    const S = strict(); const t = S ? '스스로 정한 목표예요. 진도와는 따로 세요' : done ? '오늘은 여기서 쉬어도 좋아요' : m ? `${g - m}분 더 보면 오늘 목표 달성이에요` : '영상을 보면 자동으로 채워져요';
    return `<section class="tb-goal tb-hero${done ? ' done' : ''}" aria-label="오늘 목표"><button type="button" class="tb-gb" data-tb="goal" aria-label="오늘 목표 ${g}분 중 ${m}분${S ? ' · 참고용, 진도 · 출석에는 반영되지 않음' : ''} · 목표 바꾸기"><span class="tb-rg">${ringSVG(p)}<b class="tb-rn">${m}<small>/${g}분</small></b></span>
      <span class="tb-gl"><small>오늘 목표 ${g}분${S ? ' · 참고용(진도 · 출석과 별개)' : ''}${st ? ` · ${st}일 연속` : ''}</small><strong>${esc(t)}</strong><span class="tb-wd" aria-hidden="true">${weekDays().map(x => `<i class="${x.ok ? 'ok' : ''}${x.today ? ' td' : ''}">${x.l}</i>`).join('')}</span></span></button>${done ? `<a class="tb-gd" href="#done">완료 보기</a>` : ''}</section>`; }
  /* 빈 상태 공통: 그린 톤 SVG 일러스트 + 한 문장 + 주 버튼 1개 */
  const emptyArt = () => `<svg class="tb-ea" width="120" height="88" viewBox="0 0 120 88" aria-hidden="true"><rect x="14" y="14" width="92" height="60" rx="12" fill="var(--gr50)" stroke="var(--gr200)" stroke-width="2"/><rect x="24" y="24" width="72" height="40" rx="8" fill="var(--surface)" stroke="var(--gr200)" stroke-width="2"/><path d="M54 36l14 8-14 8z" fill="var(--gr700)"/><circle cx="98" cy="18" r="9" fill="var(--gr500)"/><path d="M94 18l3 3 5-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 80h60" stroke="var(--gr200)" stroke-width="4" stroke-linecap="round"/></svg>`;
  function contHTML() { const k = cont(); if (!k) { const lms = ty() === 'univ' && ed() === 'lms'; const f = info(); const h = lms ? '#lms' : (f.browse && f.browse !== '#home' ? f.browse : '#my'); const lb = lms ? '수강 분반 보기' : (f.find && f.browse !== '#home' ? f.find : `${f.learn || '내 과정'} 보기`);
      return `<section class="tb-empty" aria-label="이어 보기">${emptyArt()}<b>${lms ? '강의실에서 차시를 열면 여기서 이어 볼 수 있어요' : `아직 이어 볼 ${unit()}가 없어요`}</b><small>${lms ? '이번 학기 수강 분반에서 시작해요.' : `수강을 시작하면 보던 장면부터 여기서 이어 볼 수 있어요.`}</small><a class="tb-pri" href="${esc(h)}">${esc(lb)}</a></section>`; }
    const { x, it } = k; const c = x.c; const r = lpItem(c.id, it.id); const d = durOf(c, it); const pos = Math.min(+r.pos || 0, d || +r.pos || 0); const w = d ? Math.round(pos / d * 100) : Math.round((+r.w || 0) * 100);
    const left = d && pos ? Math.max(1, Math.round((d - pos) / 60)) : 0; const n = nOf(c, it); const ph = photoOf(c);
    return `<a class="tb-cont" href="${esc(hrefOf(c, it))}"><span class="tb-ct${ph ? ' img' : ` tb-pat p${hsh(c.name) % 4}`}">${ph ? `<img src="${esc(ph)}" alt="" loading="lazy">` : `<i class="tb-pi" aria-hidden="true">${I.play(30)}</i>`}<em class="tb-tag">${I.play(12)}이어 보기 · ${n}${unit()}</em>${left ? `<em class="tb-time">남은 시간 ${left}분</em>` : ''}<span class="tb-pb" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, w))}%"></i></span></span>
      <span class="tb-cm"><span class="tb-cx"><b>${esc(it.title || '')}</b><small>${[c.name, d ? `${mmss(pos)} / ${mmss(d)}` : '', `진도 ${x.p}%`].filter(Boolean).map(esc).join(' · ')}</small></span><span class="tb-pl" aria-hidden="true">${I.play(18)}</span></span></a>`; }
  /* AI 튜터 미니 바: 늘 떠 있는 아이콘과 같은 대화 창을 연다(튜터를 끄면 숨김) */
  function tutHTML() { if (!tOn()) return ''; const k = cont(); const ex = k ? `「${k.it.title}」 핵심이 뭐예요?` : '「이번 주에 뭘 들으면 돼요?」';
    return `<button type="button" class="tb-tut" data-tb="tutor" aria-label="${esc(tNm())}에게 묻기"><span class="tb-orb" aria-hidden="true">${I.spark(18)}</span><span class="tb-tx"><b>${esc(tNm())} <em class="tb-ai">AI</em></b><small>${esc(ex)}처럼 물어보세요</small></span><span class="tb-snd" aria-hidden="true">${I.send(18)}</span></button>`; }
  /* AI 튜터 제안: 틀린 퀴즈 → 멈춘 차시. 근거가 없으면 숨긴다 */
  function suggest() { const C = stats().courses; let q = null, v = null;
    C.forEach(x => (x.c.items || []).forEach(it => { const r = lpItem(x.c.id, it.id);
      if ((it.type === 'quiz' || it.type === 'exam') && r.score != null && +r.score < 70 && (!q || String(r.at || '') > String(q.r.at || ''))) q = { x, it, r };
      if (it.type === 'video' && !r.done && +r.pos > 30 && (!v || String(r.at || '') > String(v.r.at || ''))) v = { x, it, r }; }));
    const k = cont(); if (v && k && k.it === v.it) v = null; /* 이어 보기 카드와 같은 것이면 제안하지 않는다 */
    if (q) { const sh = freeC(q.x.c) ? shortsFor(q.x.c)[0] : null; return { t: `<b>${esc(q.it.title)}</b>에서 ${q.r.score}점을 받았어요. ${sh && !strict() ? '틀린 부분만 짧게 다시 볼까요?' : '틀린 부분을 같이 짚어 볼까요?'}`, h: sh && !strict() ? '#review' : '', ask: `「${q.it.title}」에서 헷갈린 개념을 쉽게 다시 설명해줘` }; }
    if (v) return { t: `<b>${esc(v.it.title)}</b> ${mmss(v.r.pos)}에서 멈췄어요. 그 장면부터 이어 볼까요?`, h: hrefOf(v.x.c, v.it) };
    return null; }
  /* 유형별 AI 튜터 바로 묻기(기존 앱 첫 화면 칩: 출석 확인 · 필수교육 마감 · 오늘 학습 한도 등) */
  function askHTML() { if (!tOn()) return ''; const C = (info().chips || []).slice(0, 3); if (!C.length) return '';
    return `<section class="tb-askr" aria-label="${esc(tNm())}에게 바로 묻기"><h2 class="sr">${esc(tNm())}에게 바로 묻기</h2>${C.map(([l, q]) => `<button type="button" data-tb="ask" data-v="${esc(q)}">${I.spark(14)}${esc(l)}</button>`).join('')}</section>`; }
  /* 바로가기: 둘러보기(유형 이름) · 커뮤니티 또는 공지 — 하단 탭 4칸에서 빠진 경로 */
  function linksHTML() { const f = info(); const L = []; const onSale = !!(SITE().shop && (SITE().shop.classes || []).some(c => c.sale !== false && c.status !== 'stop')); if (f.browse && f.browse !== '#home' && (f.browse !== '#shop' || onSale)) L.push([f.browse, f.find || '둘러보기']); if (ty() === 'univ' && ed() === 'lms') L.unshift(['#lms', '수강 분반']); const pg = id => (SITE().pages || []).some(p => p.id === id); const commOK = (() => { try { const B = (SITE().comm && SITE().comm.boards) || []; return B.some(b => (typeof lcBoardOK === 'function' ? lcBoardOK(b, false) : true)); } catch (e) { return false; } })(); if (commOK || pg('comm')) L.push(['#comm', '커뮤니티']); /* 내가 볼 수 있는 게시판이 있을 때만 */ if (pg('badges') && !(ty() === 'univ' && ed() === 'lms')) L.push(['#badges', (SITE().pages.find(p => p.id === 'badges') || {}).name || '배지']); if (pg('notice')) L.push(['#notice', (SITE().pages.find(p => p.id === 'notice') || {}).name || '공지']); /* 관리자 메뉴 설정에서 켠 것만 · 메뉴 이름 그대로(요원 1 · 2) */ /* 관리자 메뉴 설정에서 켠 것만 */
    const seen = new Set(); const U = L.filter(([h]) => !seen.has(h) && seen.add(h)); if (!U.length) return '';
    const LI = { '#comm': 'users', '#badges': 'award', '#notice': 'mega', '#lms': 'list' }; /* v43: 4색 → 그린 50 바탕 · 그린 700 선 아이콘 하나로 */
    return `<nav class="tb-links" aria-label="바로가기">${U.map(([h, l]) => `<a href="${esc(h)}"><span class="tb-li" aria-hidden="true">${I[LI[h] || 'compass'](20)}</span>${esc(l)}</a>`).join('')}</nav>`; }
  function instHTML() { const f = info(); if (!f.inst) return ''; return `<div class="tb-inst ap-inst" role="note"><span><b>홈 화면에 앱으로 설치</b><small>${f.ios ? '공유 버튼 → 「홈 화면에 추가」' : '한 번 누르면 앱처럼 바로 열려요'}</small></span><button type="button" class="tb-go" data-ap="install">설치</button><button type="button" class="tb-ib" data-ap="inst-x" aria-label="설치 안내 닫기">${SV('<path d="M6 6l12 12M18 6L6 18"/>', 18)}</button></div>`; }
  function sugHTML() { const s = suggest(); if (!s || (!tOn() && !s.h)) return '';
    return `<section class="tb-sug" aria-label="AI 튜터 제안"><span class="tb-sp" aria-hidden="true">${I.spark(16)}</span><p><em class="tb-ai">AI 제안</em>${s.t}</p>${s.h ? `<a class="tb-go" href="${esc(s.h)}">보기</a>` : `<button type="button" class="tb-go" data-tb="ask" data-v="${esc(s.ask || '')}">보기</button>`}</section>`; }
  const locked = (c, it) => { try { return typeof CPLL === 'object' && CPLL && typeof CPLL.lockBy === 'function' && !!CPLL.lockBy(c, it); } catch (e) { return false; } }; /* 규정 순차 학습으로 잠긴 차시 — 요원 3 */
  function nextTiles() { const out = []; const k = cont();
    stats().courses.filter(x => !x.done).forEach(x => { const S0 = seq(x.c); const i0 = k && k.x.c.id === x.c.id ? S0.indexOf(k.it) + 1 : S0.indexOf(x.next); S0.slice(Math.max(0, i0)).filter(it => !lpItem(x.c.id, it.id).done && !['survey'].includes(it.type) && !locked(x.c, it)).slice(0, 2).forEach(it => out.push({ c: x.c, it })); });
    const L = liveSoon().slice(0, 2).map(({ c, u }) => ({ c, u })); return { L, V: out.slice(0, 4 - Math.min(2, L.length)) }; }
  function weekHTML() { const { L, V } = nextTiles(); if (!L.length && !V.length) return '';
    const TY = { video: '영상', doc: '자료', quiz: '퀴즈', assign: '과제', exam: '시험', live: '라이브', offline: '오프라인' };
    /* v43 선반 타일: 그린 톤 패턴 썸네일(유형 아이콘 + 유형 칩) · 제목 2줄 · 한 줄 정보 */
    const tV = ({ c, it }) => { const d = durOf(c, it); return `<a class="tb-tile" href="${esc(hrefOf(c, it))}"><span class="tb-tt tb-pat p${hsh(c.name + it.id) % 4}"><i aria-hidden="true">${I[TYI[it.type] || 'film'](26)}</i><em>${esc(TY[it.type] || '')}${d ? ` · ${Math.max(1, Math.round(d / 60))}분` : ''}</em></span><b class="tb-tn">${esc(it.title)}</b><span class="tb-tl">${nOf(c, it)}${unit()} · ${esc(c.name)}</span></a>`; };
    const tL = ({ c, u }) => `<a class="tb-tile" href="#c/${esc(encodeURIComponent(c.id))}"><span class="tb-tt tb-pat p${hsh(c.name + u.date) % 4} lv"><i aria-hidden="true">${I[u.type === 'offline' ? 'pin' : 'live'](26)}</i><em class="lv">${u.type === 'offline' ? '오프라인' : '라이브'} ${esc(wdOf(u.date))} ${esc(u.from || '')}</em></span><b class="tb-tn">${esc(u.title || '라이브')}</b><span class="tb-tl">${esc(c.name)} · 입장 · 출결</span></a>`;
    return `<section class="tb-week" aria-labelledby="tbWk"><div class="tb-sh"><h2 id="tbWk">이번 주 볼 ${unit()}</h2><a href="#my">전체 보기</a></div><div class="tb-grid">${[...V.map(tV), ...L.map(tL)].join('')}</div></section>`; }
  function listHTML(f) { const L = stats().courses;
    if (f === 'mine') return `<section class="tb-list" aria-label="내 과정">${L.map(x => `<a class="tb-row" href="${esc(x.next ? hrefOf(x.c, x.next) : '#c/' + encodeURIComponent(x.c.id))}">${thumbBlock(x.c, null, 'tb-rt')}<span><b>${esc(x.c.name)}</b><small>${x.done ? '이수' : `진도 ${x.p}%${x.next ? ` · 다음 「${esc(x.next.title)}」` : ''}`}</small></span></a>`).join('')}</section>`;
    if (f === 'live') return `<section class="tb-list" aria-label="라이브">${liveSoon().map(({ c, u }) => `<a class="tb-row" href="#c/${esc(encodeURIComponent(c.id))}">${patHTML(c.name + u.date, 'live', 'tb-rt')}<span><b>${esc(u.title || c.name)}</b><small>${esc(wdOf(u.date))} ${esc(u.date.slice(5).replace('-', '.'))} ${esc(u.from || '')} · ${esc(c.name)}</small></span></a>`).join('')}</section>`;
    if (f === 'cert') return `<section class="tb-list" aria-label="자격증">${L.filter(x => /자격|시험|필기|실기/.test(x.c.name || '') || (x.c.items || []).some(i => i.type === 'exam')).map(x => { const ex = (x.c.items || []).find(i => i.type === 'exam' || i.type === 'quiz'); return `<a class="tb-row" href="${esc(ex ? hrefOf(x.c, ex) : '#c/' + encodeURIComponent(x.c.id))}">${thumbBlock(x.c, null, 'tb-rt')}<span><b>${esc(x.c.name)}</b><small>진도 ${x.p}%${ex ? ` · ${esc(ex.title)}` : ''}</small></span></a>`; }).join('')}</section>`;
    return ''; }
  function homeHTML() { const f = CH().some(x => x[0] === TB.f) ? TB.f : (TB.f = 'all');
    const body = f === 'all' ? hlHTML() + instHTML() + pinHTML() + goalHTML() + contHTML() + tutHTML() + sugHTML() + askHTML() + weekHTML() + linksHTML() : f === 'cont' ? hlHTML() + goalHTML() + contHTML() + sugHTML() : listHTML(f);
    return `<div class="tb-home">${headHTML()}<div class="tb-main">${body}</div></div>`; }

  /* ── 하단 탭 ── */
  /* v43 대표님 지시(11-16 05:01 「학습자 입장에서 가장 유용한 방향으로, 교육기관별 시나리오를 살펴보고」, plan/APP-TABS.md):
     하단 탭 = 홈 · [내 ○○] · [유형별 핵심] · 나. 가운데 두 칸은 lapp.js SCN(또는 기관 시나리오 LSCN_PICK)의 tabs. 시설(fac)을 켠 기관은 「시설」을 나 앞에 더해 5칸.
     「일정」이 탭에 없는 유형도 홈 학습 캘린더 카드 · 「내 ○○」 위 「목록 | 일정」 세그먼트 · #cal 링크로 그대로 들어간다. 클릭은 그냥 <a href>(v42.2 data-tbh 캐시) */
  const facOK = () => { try { return typeof window.facOn === 'function' && !!window.facOn(); } catch (e) { return false; } };
  const DEF_TABS = [['my', '#my', '내 강의'], ['cal', '#cal', '일정']];
  function tabsOf() { let T = null; try { T = typeof window.lappScn === 'function' ? window.lappScn().tabs : null; } catch (e) { T = null; }
    T = (Array.isArray(T) && T.length ? T : DEF_TABS).slice(0, 2).map(([k, h, l]) => [String(k), String(h), String(l)]);
    T = T.map(([k, h, l]) => { if (k === 'find') { const b = info().browse; if (b && b !== '#home') h = b; } if (k === 'my') l = info().learn || l; return [k, h, l]; }); /* 찾기 칸은 그 기관에서 실제로 열리는 목록(#shop · #courses) */
    const all = [['home', '#home', '홈'], ...T]; if (facOK() && !T.some(x => x[0] === 'fac')) all.push(['fac', '#fac', '시설']); all.push(['me', '#acct', '나']); return all; }
  const RT = { home: ['home', 'review', 'ai', 'done'], my: ['my', 'c', 'cert', 'badge', 'lms', 'knq'], cal: ['cal'], fac: ['fac'], me: ['acct', 'inbox', 'msg', 'mypay', 'connect', 'payd', 'mile', 'ledger'] };
  function curTab(T) { const a = route().a; T = T || tabsOf(); const keys = T.map(x => x[0]);
    const hit = T.find(([k, h]) => k === 'find' && h.slice(1).split('/')[0] === a); if (hit) return 'find';
    for (const k of keys) if ((RT[k] || []).includes(a)) return k;
    if (a === 'cal' || a === 'courses' || a === 'shop') return keys.includes('my') ? 'my' : ''; /* 일정 · 목록이 탭에 없으면 「내 ○○」에 속한다 */
    return ''; }
  const ICO = { home: null, my: 'course', cal: 'cal', find: 'compass', fac: 'fac', me: 'me' };
  function navHTML() { const T = tabsOf(); const cur = curTab(T);
    return T.map(([k, h, l]) => { const i = k === 'home' ? (cur === 'home' ? I.home(24) : I.homeO(24)) : I[ICO[k] || 'course'](24);
      return `<a href="${esc(h)}" class="tb-n-${esc(k)}${cur === k ? ' on' : ''}"${cur === k ? ' aria-current="page"' : ''}>${i}<span>${esc(l)}</span></a>`; }).join(''); }
  /* 「내 ○○」 위 세그먼트: 목록(#my) | 일정(#cal) — 두 화면 맨 위(하위 경로 없을 때) */
  function segHTML(a) { const k = a === 'cal' ? 'cal' : 'my';
    return `<nav class="tb-seg" aria-label="${esc(info().learn || '내 과정')}">${[['my', '#my', '목록'], ['cal', '#cal', '일정']].map(([x, h, l]) => `<a href="${h}" class="tb-sg-${x}${x === k ? ' on' : ''}"${x === k ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`; }

  /* ── 오늘 목표 설정 시트 ── */
  function goalSheet() { const g = goal(); const w = document.createElement('div'); w.className = 'ap-sheet'; w.id = 'apSheet';
    w.innerHTML = `<div class="ap-sh tb-gsh" role="dialog" aria-modal="true" aria-labelledby="tbGT"><h2 id="tbGT">하루 목표</h2><p>하루에 몇 분 공부할까요? 채우면 오늘은 쉬어도 좋다고 알려 드려요.</p>
      <div class="tb-gopt" role="radiogroup" aria-label="하루 목표 분">${[10, 20, 30, 60].map(m => `<button type="button" role="radio" aria-checked="${m === g}" class="${m === g ? 'on' : ''}" data-tb="goal-set" data-v="${m}">${m}분</button>`).join('')}</div>
      <nav><button type="button" data-ap="sheet-x">닫기</button></nav></div>`;
    document.body.appendChild(w); const b = w.querySelector('.tb-gopt .on') || w.querySelector('.tb-gopt button'); b && b.focus(); }

  /* ── 오늘 목표 완료(#done) ── */
  function doneHTML() { const t = rec(), d = day(); const m = minToday(), g = goal(); const sh = +t.sh[d] || 0, qr = +t.qr[d] || 0, qn = +t.qn[d] || 0;
    const wk = weekDays(); const streak = streakN();
    const k = cont(); const ok = m >= g; const S = strict();
    return `<section class="tb-done" aria-labelledby="tbDT"><div class="tb-dh"><span class="tb-ring${ok ? '' : ' part'}" style="--p:${Math.min(100, Math.round(m / g * 100))}"><i>${ok ? I.check(40) : `<b>${m}</b><small>/${g}분</small>`}</i></span>
      <h1 id="tbDT">${ok ? '오늘 목표를 다 했어요' : `오늘 목표까지 ${g - m}분 남았어요`}</h1><p>${[`영상 ${m}분 시청`, sh ? `짧게 복습 ${sh}개` : '', qn ? `퀴즈 ${qr}/${qn} 정답` : ''].filter(Boolean).join(' · ')}<br>${S ? '스스로 정한 참고용 목표예요. 진도 · 출석 · 수료는 「' + esc(info().learn || '내 과정') + '」에서 확인하세요.' : ok ? '오늘은 여기서 쉬어도 좋아요.' : '조금만 더 하면 오늘 목표를 채워요.'}</p></div>
      <section class="tb-wk" aria-label="이번 주"><div class="tb-wkh"><b>이번 주</b>${streak ? `<em>${streak}일 연속</em>` : ''}</div><ol>${wk.map(x => `<li><small>${x.l}</small><span class="${x.ok ? 'ok' : ''}${x.today ? ' td' : ''}" aria-label="${x.l}요일 ${x.ok ? '목표 달성' : x.fut ? '예정' : '미달성'}"></span></li>`).join('')}</ol></section>
      ${k ? `<section class="tb-tip" aria-label="AI 튜터 한마디"><span class="tb-sp" aria-hidden="true">${I.spark(14)}</span><p>${ok ? '내일은' : '다음은'} <b>${nOf(k.x.c, k.it)}${unit()} ${esc(k.it.title)}</b>부터 시작해요.${k.at && lpItem(k.x.c.id, k.it.id).pos ? ` ${mmss(lpItem(k.x.c.id, k.it.id).pos)} 장면부터 이어져요.` : ''}</p></section>` : ''}
      <div class="tb-da">${ok ? `<a class="tb-pri" href="#connect">내일 알림 받고 마치기</a>` : ''}<a class="${ok ? 'tb-sec' : 'tb-pri'}" href="${k ? esc(hrefOf(k.x.c, k.it)) : '#home'}">${ok ? '조금 더 볼래요' : '이어서 보기'}</a>${ok ? '' : '<a class="tb-sec" href="#home">홈으로</a>'}</div></section>`; }

  /* ── 짧게 복습(#review): 틀린 퀴즈가 있는 과정의 챕터 구간 + 퀴즈 1문제, 하루 5개, 진도 미반영 ── */
  const SH_MAX = 5;
  function shortsFor(c) { const out = []; seq(c).forEach(it => { if (it.type !== 'video') return; const C = chapsOf(it); const d = durOf(c, it);
      C.forEach((ch, i) => { const end = C[i + 1] ? C[i + 1].t : (d || ch.t + 90); const len = Math.min(180, Math.max(20, end - ch.t)); out.push({ c, it, ch, s: ch.t, e: ch.t + len, i }); }); });
    return out; }
  /* 복습 구간을 열어도 되는 과정: 법정(legal) · 건너뛰기 제한(c.skip이 free가 아님) · 규정 대상은 제외 — 요원 3 */
  const freeC = c => !c.legal && (!c.skip || c.skip === 'free' || c.skip === 'watched'); /* watched는 본 구간 안에서만 */
  function shortsAll() { const L = stats().courses.filter(x => freeC(x.c)); const out = []; L.forEach(x => shortsFor(x.c).forEach(s => { if (x.c.skip === 'watched' && s.s > maxW(x.c, s.it) + 1) return; out.push(s); }));
    const weak = new Set(L.filter(x => (x.c.items || []).some(it => { const r = lpItem(x.c.id, it.id); return it.type === 'quiz' && r.score != null && +r.score < 70; })).map(x => x.c.id));
    return out.filter(x => weak.has(x.c.id)); } /* 틀린 퀴즈가 있는 과정만(복습 보조) */
  function quizFor(c, it) { const S0 = seq(c); const i0 = S0.indexOf(it); const Q = [...S0.slice(i0 + 1), ...S0.slice(0, i0)].find(x => x.type === 'quiz' && (x.qs || []).some(q => ['mc', 'ox'].includes(q.t || 'mc') && (q.t === 'ox' || (q.opts || []).length >= 2)));
    if (!Q) return null; const q = Q.qs.find(q => ['mc', 'ox'].includes(q.t || 'mc') && (q.t === 'ox' || (q.opts || []).length >= 2)); const opts = q.t === 'ox' ? ['O', 'X'] : q.opts.slice(0, 4);
    const ans = q.t === 'ox' ? (String(q.a).toUpperCase() === 'X' || q.a === false || q.a === 1 ? 'X' : 'O') : (typeof q.a === 'number' ? opts[q.a] : String(q.a)); return { Q, q, opts, ans }; }
  function mediaHTML(s) { const yt = s.it.yt || ''; if (yt && /^[\w-]{11}$/.test(yt)) return `<iframe class="tbs-v" data-play="1" title="${esc(s.it.title)} ${esc(s.ch.n)} 구간" allow="autoplay; encrypted-media; picture-in-picture" src="https://www.youtube-nocookie.com/embed/${esc(yt)}?start=${s.s}&end=${s.e}&autoplay=1&playsinline=1&rel=0&modestbranding=1"></iframe>`;
    return `<div class="tbs-v tbs-ph" data-play="1" aria-hidden="true"></div>`; }
  function shortsHTML() { if (strict()) return `<section class="tb-off"><h1>짧게 복습은 이 기관에서 쓰지 않아요</h1><p>훈련 · 학사 과정은 정해진 순서와 학습 시간을 지켜야 해서 영상을 잘라 보지 않아요.</p><a class="tb-pri" href="#my">내 과정으로</a></section>`;
    const L = shortsAll(); const t = rec(), d = day(); const seen = +t.sh[d] || 0;
    const top = `<div class="tbs-top"><a class="tbs-ib" href="#home" aria-label="뒤로">${I.back(24)}</a><b>짧게 복습</b><em>오늘 ${Math.min(seen, SH_MAX)} / ${SH_MAX}개</em></div>`;
    if (!L.length) return `<section class="tbs tbs-empty">${top}<div class="tbs-c"><h1>지금은 다시 볼 부분이 없어요</h1><p>퀴즈에서 틀린 문제가 생기면, 강사가 나눠 둔 영상 구간 중 그 과정 부분을 1~3분씩 다시 볼 수 있어요.</p><a class="tb-pri" href="#my">내 과정 보기</a></div></section>`;
    if (seen >= SH_MAX) return `<section class="tbs tbs-empty">${top}<div class="tbs-c"><h1>오늘 짧게 복습 ${SH_MAX}개를 다 했어요</h1><p>짧게 여러 개보다 한 차시를 끝까지 보는 게 더 오래 남아요.</p><a class="tb-pri" href="#done">오늘 학습 보기</a></div></section>`;
    const s = L[TB.sh % L.length]; const qz = quizFor(s.c, s.it); const bg = colOf(s.c.name + s.it.id);
    return `<section class="tbs" style="--bg:${bg}" aria-label="짧게 복습">${top}
      <div class="tbs-body"><span class="tbs-tag">${nOf(s.c, s.it)}${unit()} ${mmss(s.s)}부터 ${Math.round((s.e - s.s) / 6) / 10}분</span><h1>${esc(s.ch.n || s.it.title)}</h1><p class="tbs-from">${esc(s.c.name)} · ${esc(s.it.title)} · 복습용이라 진도에는 들어가지 않아요</p>${mediaHTML(s)}</div>
      <div class="tbs-side"><button type="button" data-tb="sh-ask" data-v="${esc(`「${s.it.title}」 ${s.ch.n ? `「${s.ch.n}」 ` : ''}구간 내용을 쉽게 다시 설명해줘`)}" aria-label="튜터에게 질문"><span class="g">${I.spark(20)}</span>질문</button><a href="${esc(hrefOf(s.c, s.it))}" aria-label="원래 ${unit()}로"><span>${I.film(20)}</span>${unit()}로</a><button type="button" data-tb="sh-next" aria-label="다음 쇼츠"><span>${SV('<path d="M6 9l6 6 6-6"/>', 20)}</span>다음</button></div>
      ${qz ? `<section class="tbs-q" aria-label="확인 퀴즈"><div class="tbs-qh"><small>확인 퀴즈</small><em>복습용 · 진도 미반영</em></div><p>${esc(qz.q.q)}</p><div class="tbs-qo">${qz.opts.map(o => `<button type="button" data-tb="sh-q" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div><p class="tbs-qr" role="status" aria-live="polite"></p></section>` : ''}</section>`; }
  function shCount() { const t = rec(), d = day(); t.sh[d] = Math.min(999, (+t.sh[d] || 0) + 1); trim(t.sh); try { LR.api.save(); } catch (e) { } }
  function shAnswer(btn) { const L = shortsAll(); const s = L[TB.sh % L.length]; const qz = s && quizFor(s.c, s.it); if (!qz) return; const box = btn.closest('.tbs-q'); if (box.dataset.done) return; box.dataset.done = 1;
    const ok = btn.dataset.v === qz.ans; const t = rec(), d = day(); t.qn[d] = Math.min(999, (+t.qn[d] || 0) + 1); if (ok) t.qr[d] = Math.min(999, (+t.qr[d] || 0) + 1); trim(t.qn); trim(t.qr);
    box.querySelectorAll('button').forEach(b => { b.disabled = true; if (b.dataset.v === qz.ans) b.classList.add('ok'); else if (b === btn) b.classList.add('no'); });
    box.querySelector('.tbs-qr').textContent = ok ? '정답이에요! 잘 기억하고 있어요.' : `정답은 「${qz.ans}」예요. 원래 ${unit()}에서 이 부분을 다시 볼 수 있어요.`;
    try { LR.api.save(); } catch (e) { } }

  /* ── 영상 레슨: 챕터 칩 + AI 튜터 패널 ── */
  const nowT = () => (typeof ltSceneT === 'function' ? ltSceneT() : null);
  function cur() { const m = /^#c\/([^/]+)\/([^/?#]+)/.exec(location.hash); if (!m) return null; const c = (SITE().classes || []).find(x => x.id === decodeURIComponent(m[1])); const it = c && (c.items || []).find(x => x.id === decodeURIComponent(m[2])); return it && it.type === 'video' ? { c, it } : null; }
  /* 챕터 이동은 과정 재생 규칙(lcls.js c.skip)을 따른다: free = 어디든 · watched = 본 구간 안만 · 그 밖 · 규정 대상 = 이동 없음 */
  const maxW = (c, it) => { const r = lpItem(c.id, it.id); return Math.max(+r.max || 0, +r.pos || 0); };
  const seekOK = (c, it, t) => { if (strict()) return false; const sk = c.skip || 'free'; return sk === 'free' || (sk === 'watched' && it != null && t <= maxW(c, it) + 1); };
  function chapHTML(c, it) { const C = chapsOf(it); if (!C.length) return ''; const t = nowT() || +lpItem(c.id, it.id).pos || 0; const ci = C.reduce((k, x, j) => (x.t <= t ? j : k), -1); const anyK = C.some(x => seekOK(c, it, x.t));
    return `<div class="tbw-ch" role="list" aria-label="챕터">${C.map((x, j) => seekOK(c, it, x.t) ? `<button type="button" role="listitem" class="tbw-c${j === ci ? ' on' : ''}" data-tb="seek" data-v="${x.t}" aria-label="${esc(x.n)} ${mmss(x.t)}로 이동">${String(j + 1).padStart(2, '0')} ${esc(x.n)}${j === ci ? ' ▶' : ''}</button>` : `<span role="listitem" class="tbw-c${j === ci ? ' on' : ''}">${String(j + 1).padStart(2, '0')} ${esc(x.n)}</span>`).join('')}</div><p class="tbw-cn">강사가 넣은 챕터예요${anyK ? (C.every(x => seekOK(c, it, x.t)) ? '' : ' · 본 구간까지만 이동할 수 있어요') : ' · 이 과정은 앞으로 건너뛸 수 없어요'}</p>`; }
  const thread = iid => (TB.msgs[iid] = TB.msgs[iid] || []);
  function msgHTML(m) { return m.me ? `<div class="tbw-m me">${esc(m.t)}</div>` : `<div class="tbw-m">${nl(esc(m.t)).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}${m.ev ? `<small class="tbw-ev">${esc(m.ev)}</small>` : ''}${m.h || ''}</div>`; }
  const nl = s => String(s).replace(/\n/g, '<br>');
  function panelHTML(c, it) { const t = nowT(); const M = thread(it.id);
    return `<section class="tbw" aria-label="${unit()} 정보와 AI 튜터"><div class="tbw-hd"><h2>${nOf(c, it)}${unit()} · ${esc(it.title)}</h2>${chapHTML(c, it)}</div>
      <section class="tbw-tu${TB.open ? ' open' : ''}" id="tbwTu" role="dialog" aria-modal="false" aria-label="AI 튜터 — 이 장면 질문" ${TB.open ? '' : 'hidden'}><div class="tbw-th"><span class="tb-sp" aria-hidden="true">${I.spark(14)}</span><b>AI 튜터</b><em class="tbw-now" aria-live="off">${t != null ? `${mmss(t)} 장면을 보고 있어요` : '영상을 재생하면 그 장면을 함께 봐요'}</em><button type="button" class="tbw-x" data-tb="sheet-x" aria-label="AI 튜터 닫기">${SV('<path d="M6 6l12 12M18 6L6 18"/>', 20)}</button></div>
      <div class="tbw-ms" aria-live="polite">${M.map(msgHTML).join('')}${TB.busy ? '<div class="tbw-m"><span class="lt-dots"><i></i><i></i><i></i></span></div>' : ''}</div>
      <div class="tbw-qc">${['이 장면 다시 설명', '3줄 요약', '퀴즈 1문제'].map(x => `<button type="button" data-tb="wq" data-v="${x}">${x}</button>`).join('')}</div>
      <form class="tbw-f" id="tbwF"><label class="sr" for="tbwQ">질문 입력</label><input id="tbwQ" maxlength="400" autocomplete="off" placeholder="이 장면에 대해 물어보세요">${micBtn('tbwQ')}<button type="submit" aria-label="보내기">${I.up(20)}</button></form>
      <p class="tbw-note">과제 답은 대신 쓰지 않고 함께 풀어요 · 대화는 저장하지 않아요</p></section>${filesHTML(c, it)}${nextHTML(c, it)}</section>`; }
  /* v43 재생 화면: 자료 미리보기 2칸(항목 첨부 → 없으면 이어서 할 퀴즈 · 과제) + 아래 고정 「다음 차시」(52px) */
  const extOf = n => { const m = /\.([a-z0-9]{2,5})$/i.exec(String(n || '')); return m ? m[1].toUpperCase() : '자료'; };
  const kb = b => { b = +b || 0; return b >= 1048576 ? `${(b / 1048576).toFixed(1)}MB` : b ? `${Math.max(1, Math.round(b / 1024))}KB` : ''; };
  function filesHTML(c, it) { const F = (Array.isArray(it.files) ? it.files : []).filter(f => f && (f.name || f.n)).slice(0, 2);
    const TY = { doc: '자료', quiz: '퀴즈', assign: '과제', exam: '시험' }; const S0 = seq(c); const i0 = S0.indexOf(it);
    const N = F.length ? [] : S0.slice(i0 + 1).filter(x => TY[x.type]).slice(0, 2);
    if (!F.length && !N.length) return '';
    const card = (b, t, m, h, i) => `<a class="tbw-fc" href="${esc(h)}"${h.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}><span class="tbw-ft tb-pat p${i % 4}"><em>${esc(b)}</em></span><b>${esc(t)}</b><small>${esc(m)}</small></a>`;
    const body = F.length ? F.map((f, i) => card(extOf(f.name || f.n), f.name || f.n, [f.desc, kb(f.size)].filter(Boolean).join(' · ') || '첨부 자료', f.url || f.src || hrefOf(c, it), i)).join('')
      : N.map((x, i) => card(TY[x.type], x.title, `${nOf(c, x)}${unit()}${x.time ? ` · ${x.time}분` : ''}${lpItem(c.id, x.id).done ? ' · 완료' : ''}`, hrefOf(c, x), i + 1)).join('');
    return `<section class="tbw-files" aria-label="${F.length ? '자료 미리보기' : '이어서 할 것'}"><h3>${F.length ? `자료 ${F.length}` : '이어서 할 것'}</h3><div class="tbw-fg">${body}</div></section>`; }
  function nextHTML(c, it) { const S0 = seq(c); const nx = S0.slice(S0.indexOf(it) + 1).find(x => x.type !== 'survey'); if (!nx) return '';
    const F = (Array.isArray(it.files) ? it.files : []).filter(f => f && (f.url || f.src)); const f0 = F[0];
    return `<nav class="tbw-nx" aria-label="다음 ${unit()}">${f0 ? `<a class="tbw-dl" href="${esc(f0.url || f0.src)}" download aria-label="자료 내려받기">${I.down(22)}</a>` : ''}<a class="tbw-next" href="${esc(hrefOf(c, nx))}"><span>다음 ${unit()} · ${esc(nx.title)}</span>${I.next(20)}</a></nav>`; }
  /* ── 늘 떠 있는 AI 튜터 아이콘 ── */
  function fab() { let b = document.getElementById('tbFab'); if (!on() || !tOn()) { if (b) b.remove(); return; } const v = !!cur(); if (cur() && locked(cur().c, cur().it)) { if (b) b.remove(); return; } const nm = tNm(); const short = [...nm].length <= 6 ? nm : 'AI 튜터';
    const lab = v ? `${nm}(AI 튜터) — 이 장면 질문하기` : `${nm}(AI 튜터) 열기`; if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'tbFab'; b.className = 'tb-fab'; b.dataset.tb = 'fab'; document.body.appendChild(b); }
    const h = `${I.spark(24)}<span>${v ? '이 장면 질문' : esc(short)}</span>`; if (b.dataset.h !== h) { b.innerHTML = h; b.dataset.h = h; } b.setAttribute('aria-label', lab); b.setAttribute('aria-expanded', v ? String(!!TB.open) : String(!!(typeof LT === 'object' && LT.open))); }
  function sheet(o) { TB.open = o; const t = document.getElementById('tbwTu'); if (t) { t.hidden = !o; t.classList.toggle('open', o); } document.body.classList.toggle('tb-sheet', o); fab(); if (o) { const ms = t && t.querySelector('.tbw-ms'); if (ms) ms.scrollTop = ms.scrollHeight; setTimeout(() => { const i = document.getElementById('tbwQ'); i && i.focus(); }, 30); } else { const b = document.getElementById('tbFab'); b && b.focus(); } }
  const WQ = { '이 장면 다시 설명': t => `지금 ${t != null ? mmss(t) + ' ' : ''}장면에서 설명한 내용을 쉬운 말로 다시 설명해줘`, '3줄 요약': () => '이 레슨 내용을 3줄로 요약해줘', '퀴즈 1문제': () => '이 장면 내용으로 확인 퀴즈 1문제 내줘(정답은 내가 답한 뒤에 알려줘)' };
  async function ask(q, label) { const k = cur(); if (!k || TB.busy) return; q = String(q || '').trim(); if (!q) return; const C = TCFG(); const t = nowT(); const M = thread(k.it.id);
    const lim = +C.daily || 20; if (typeof ltUsed === 'function' && ltUsed() >= lim) { M.push({ me: 1, t: label || q }, { t: `오늘 질문 한도(${lim}회)를 모두 썼어요. 내일 다시 이어 가거나, 급한 질문은 선생님께 넘겨 주세요.` }); paint(); return; }
    M.push({ me: 1, t: label || q }); if (M.length > 20) M.splice(0, M.length - 20); try { typeof ltUse === 'function' && ltUse(); } catch (e) { } TB.busy = true; paint();
    let r = null; try { r = typeof ltAI === 'function' ? await ltAI(q) : null; } catch (e) { r = null; }
    let ev = ''; const ch = t != null && typeof ltChap === 'function' ? ltChap(k.it, t) : null;
    if (r && r.t) { const m = /\n?\s*근거\s*[:：]\s*([^\n]+)\s*$/.exec(r.t); if (m) { ev = '근거: ' + m[1].trim(); r.t = r.t.slice(0, m.index).trim(); } else if (ch && ch.ch) ev = `근거: ${nOf(k.c, k.it)}${unit()} ${mmss(ch.ch.t)}~${ch.end != null ? mmss(ch.end) : ''} 「${ch.ch.n}」 구간`; }
    else { try { r = (typeof ltRule === 'function' && (ltRule(q) || ltRule('?'))) || null; } catch (e) { r = null; } if (!r) r = { t: '지금은 답을 만들지 못했어요. 잠시 후 다시 물어봐 주세요.' }; ev = t != null ? `${mmss(t)} 장면 기준 · 기본 안내` : '기본 안내'; }
    M.push({ t: String(r.t || '').slice(0, 2000), ev, h: '' }); TB.busy = false; paint(); }
  function paint() { const k = cur(); const box = $('#lm .tbw'); if (!k || !box) return; const ms = box.querySelector('.tbw-ms'); if (ms) { ms.innerHTML = thread(k.it.id).map(msgHTML).join('') + (TB.busy ? '<div class="tbw-m"><span class="lt-dots"><i></i><i></i><i></i></span></div>' : ''); ms.scrollTop = ms.scrollHeight; } }
  function mountWatch() { const k = cur(); if (!k || locked(k.c, k.it)) return; if (!tOn() && !chapsOf(k.it).length) return; const lm = $('#lm'); if (!lm || lm.querySelector('.tbw')) return;
    const anchor = ['.imain .lw-rule', '.imain #wtxt', '.imain .wbar', '.imain .vbox', '.imain .novid', '.imain .lc'].map(q => lm.querySelector(q)).find(Boolean); const main = lm.querySelector('.imain');
    const html = panelHTML(k.c, k.it); if (anchor && anchor.parentElement) anchor.insertAdjacentHTML('afterend', html); else if (main) main.insertAdjacentHTML('beforeend', html); else return; if (!tOn()) { const t = lm.querySelector('#tbwTu'); t && t.remove(); } /* 관리자가 AI 튜터를 끄면 챕터만 */
    document.body.classList.add('tb-watch'); }
  /* 재생 시각 배지 · 현재 챕터 표시는 1초마다(대화는 다시 그리지 않음) */
  setInterval(() => { if (!on()) return; const k = cur(); const box = $('#lm .tbw'); if (!k || !box) return; const t = nowT(); const em = box.querySelector('.tbw-now'); if (em && t != null) em.textContent = `${mmss(t)} 장면을 보고 있어요`;
    const C = chapsOf(k.it); if (!C.length || t == null) return; const ci = C.reduce((a, x, j) => (x.t <= t ? j : a), -1); box.querySelectorAll('.tbw-c').forEach((b, j) => { const o = j === ci; if (b.classList.contains('on') !== o) { b.classList.toggle('on', o); b.textContent = `${String(j + 1).padStart(2, '0')} ${C[j].n}${o ? ' ▶' : ''}`; } }); }, 1000);
  function seek(t) { const k = cur(); if (!k || !seekOK(k.c, k.it, t)) return; try { const p = typeof LW === 'object' && LW && LW.yp; if (p && typeof p.seekTo === 'function') { p.seekTo(t, true); if (p.playVideo) p.playVideo(); return; } const v = $('#lm video'); if (v) { v.currentTime = t; v.play && v.play().catch(() => { }); } } catch (e) { } }

  /* ── 그리기(가장 바깥 감싸기) ── */
  function apply() { const B = document.body; B.classList.remove('tube', 'tb-full', 'tb-watch'); const a0 = route().a;
    if (document.body.classList.contains('lapp') && ['review', 'done'].includes(a0) && !on()) { location.replace('#home'); return; } /* 보호자 · 방문자: 튜브 전용 주소는 홈으로(요원 3) */
    if (!on()) return; if (a0 === 'ai' && !tOn()) { location.replace('#home'); return; } /* 튜터를 끄면 대화 화면 주소도 닫음(요원 2) */ const a = route().a; const lm = $('#lm'), app = $('#lapp'); if (!lm || !app) return;
    if (B.classList.contains('ap-pickon')) return; /* 선생님 고르기 화면은 그대로 */
    B.classList.add('tube');
    if (a === 'home') { const cal = lm.querySelector('a.lq-hc'); const calH = cal ? cal.outerHTML : ''; lm.innerHTML = homeHTML(); if (calH && TB.f === 'all') { const mn = lm.querySelector('.tb-main'); mn && mn.insertAdjacentHTML('beforeend', calH); } /* 학습 캘린더(lcal.js) 카드는 피드 끝에 그대로 */ B.classList.remove('ap-homeon'); B.classList.add('tb-full'); const bar = app.querySelector('.ap-bar'); if (bar) bar.remove(); }
    else if (a === 'review') { lm.innerHTML = shortsHTML(); if (!tOn()) lm.querySelectorAll('[data-tb="sh-ask"]').forEach(x => x.remove()); B.classList.add('tb-full', 'tb-dark'); const bar = app.querySelector('.ap-bar'); if (bar) bar.remove(); }
    else if (a === 'done') { lm.innerHTML = doneHTML(); B.classList.add('tb-full'); const bar = app.querySelector('.ap-bar'); if (bar) bar.remove(); }
    if (a !== 'review') B.classList.remove('tb-dark');
    if ((a === 'my' || a === 'cal') && !route().b && !lm.querySelector('.tb-seg')) lm.insertAdjacentHTML('afterbegin', segHTML(a));
    if (a === 'c') mountWatch(); if (!cur() && TB.open) { TB.open = false; B.classList.remove('tb-sheet'); }
    const nav = app.querySelector('.ap-nav'); if (nav) { nav.classList.add('tb-nav'); nav.classList.remove('lq-n6'); nav.setAttribute('aria-label', '아래 탭'); const h = navHTML(); if (nav.dataset.tbh !== h) { nav.innerHTML = h; nav.dataset.tbh = h; } } }
  { const base = lrender; lrender = (...x) => { const r = base(...x); try { apply(); fab(); } catch (e) { console.error('ltube', e); } return r; }; }
  /* 말로 묻기(기존 앱 첫 화면 마이크) — 대화 창 · 장면 튜터 입력칸 옆. 브라우저 음성 인식이 있을 때만 */
  const SRc = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = id => SRc() ? `<button type="button" class="tb-mic" data-tb="mic" data-v="${id}" aria-label="말로 묻기">${SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>', 20)}</button>` : '';
  function mic(btn) { const SR = SRc(); const inp = document.getElementById(btn.dataset.v); if (!SR || !inp) return; try { const r = new SR(); r.lang = 'ko-KR'; r.interimResults = false; btn.classList.add('on'); btn.setAttribute('aria-label', '듣는 중 — 말씀하세요');
    r.onresult = e => { inp.value = (e.results[0] && e.results[0][0] && e.results[0][0].transcript) || ''; inp.focus(); }; r.onend = () => { btn.classList.remove('on'); btn.setAttribute('aria-label', '말로 묻기'); }; r.onerror = r.onend; r.start(); } catch (e) { btn.classList.remove('on'); } }
  if (typeof ltRender === 'function') { const base = ltRender; ltRender = (...x) => { const r = base(...x); try { fab(); if (on()) { const f = document.getElementById('ltf'); const q = document.getElementById('ltq'); if (f && q && !f.querySelector('.tb-mic') && SRc()) q.insertAdjacentHTML('afterend', micBtn('ltq')); } } catch (e) { } return r; }; } /* 대화 창을 열고 닫을 때 아이콘 상태(aria-expanded) */
  window.tubeApply = apply;
  /* 선택 탭 다시 맞추기: lfac.js post()가 #fac에서 v39 탭 이름(tb-n-home · tb-n-cal)으로 선택을 바꾸므로 그 감싸기 바깥에서 한 번 더(lfac.js는 D3 담당 — 보고서 「공통 변경 요청」) */
  function markNav() { if (!on()) return; const nav = document.querySelector('#lapp .ap-nav.tb-nav'); if (!nav) return; const k = curTab();
    nav.querySelectorAll(':scope > a').forEach(x => { const o = !!k && x.classList.contains('tb-n-' + k); x.classList.toggle('on', o); if (o) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); }
  const lateNav = () => { setTimeout(() => { const base = lrender; lrender = (...x) => { const r = base(...x); try { markNav(); } catch (e) { } return r; }; try { markNav(); } catch (e) { } }, 0); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lateNav); else lateNav();

  /* ── 이벤트 ── */
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-tb]'); if (!el || !on()) return; const k = el.dataset.tb; e.preventDefault();
    if (k === 'f') { TB.f = el.dataset.v; lrender(); return; }
    if (k === 'goal') return goalSheet();
    if (k === 'goal-set') { const g = Math.max(5, Math.min(180, +el.dataset.v || 20)); rec().goal = g; try { LR.api.save(); } catch (x) { } const w = $('#apSheet'); w && w.remove(); toast(`하루 목표를 ${g}분으로 정했어요.`, 'ok'); lrender(); return; }
    if (k === 'ask') { try { ltAsk(el.dataset.v); } catch (x) { } return; }
    if (k === 'tutor') { if (typeof ltOpen === 'function') ltOpen(); return; } /* 대화 창(아이콘과 같은 창)에서 바로 묻는다 */
    if (k === 'fab') { if (cur()) return sheet(!TB.open); if (typeof LT === 'object' && LT.open) { const x = document.querySelector('[data-tact="close"]'); if (x) x.click(); return; } if (route().a === 'ai') { const q = document.getElementById('apQ'); if (q) { q.focus(); return; } } if (typeof ltOpen === 'function') ltOpen(); return; }
    if (k === 'sheet-x') return sheet(false);
    if (k === 'mic') return mic(el);
    if (k === 'sh-next') { TB.sh++; shCount(); lrender(); const s = $('.tbs'); s && s.focus && s.focus(); return; }
    if (k === 'sh-ask') { try { ltAsk(el.dataset.v); } catch (x) { } return; }
    if (k === 'sh-q') return shAnswer(el);
    if (k === 'seek') return seek(+el.dataset.v);
    if (k === 'wq') { const f = WQ[el.dataset.v]; return ask(f ? f(nowT()) : el.dataset.v, el.dataset.v); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && TB.open && on()) sheet(false); });
  /* 전체 메뉴(lux.js) 다듬기 — 유형 학습 이름 · 학사 LMS에서 꺼진 기능(진단 · 배지 · 디지털북 · 튜토리얼 · 결제 · 교재) 숨김(요원 1 · 3) */
  document.addEventListener('click', e => { if (!on() || !(e.target.closest && e.target.closest('[data-lux="menu"]'))) return; setTimeout(() => { const w = document.getElementById('luxSheet'); if (!w) return; const lr = info().learn;
    w.querySelectorAll('.lux-shg').forEach(g => { if (g.textContent.trim() === '내 학습' && lr) g.textContent = lr; });
    if (ty() === 'univ' && ed() === 'lms') w.querySelectorAll('a').forEach(a => { const h = a.getAttribute('href') || ''; if (/^#(mypay|mybooks|diag|dg|badges?|tutorials|bk|dbook|levels?)\b/.test(h) || /진단|배지|디지털북|튜토리얼|단계별 코스|결제|교재/.test(a.textContent)) a.remove(); }); }, 0); });
  document.addEventListener('submit', e => { if (e.target.id !== 'tbwF') return; e.preventDefault(); const i = e.target.querySelector('input'); const v = i.value; i.value = ''; ask(v); });
  /* 짧게 복습: 위로 밀면 다음(휴대폰) */
  let ty0 = null; document.addEventListener('touchstart', e => { ty0 = route().a === 'review' && on() && !e.target.closest('.tbs-q, .tbs-side') ? e.touches[0].clientY : null; }, { passive: true });
  document.addEventListener('touchend', e => { if (ty0 == null) return; const dy = ty0 - e.changedTouches[0].clientY; ty0 = null; if (dy > 80) { TB.sh++; shCount(); lrender(); } }, { passive: true });
})();
