/* v40 시설 · 장비 예약 — 이용자 앱(body.lapp, 디디쌤 튜브) · 웹(기존 화면) 공용 화면.
   흐름: 찾기(#fac) → 날짜 · 시간 칸(#fac/<시설>) → 신청자 구분 · 요금 · 결제(#fac/<시설>/pay, 상품은 #fac/<시설>/buy/<상품>) → 완료(#fac/done/<번호>)
         → 당일 QR(#fac/qr/<번호>) → 내 예약 · 이용권 · 대여(#fac/my, 상세 #fac/bk|ps|rt/<번호>: 취소 · 환불 예상액 · 반납 기한 · 연체)
   앱 위치(03 결정 6): 홈 칩 「예약」 · 홈 맨 위 「오늘 예약」 QR 카드(오늘 이용이 있을 때만) · 일정 탭(#cal) 안 「내 예약」. 하단 탭은 늘리지 않는다.
   데이터: 설정은 운영자 게시본 SITE().fac(02 명세 3-1). 데모는 예약을 이 기기에 저장(didisam.fac.<기관>.<학번>), 운영은 /api/pub/<tid>/fac-*(02 명세 5-1).
   계산은 faccalc.js(window.facCalc, 스튜디오 · 서버와 같은 규칙). 개인정보: 대학은 학번 · 학과만, 차량번호 등 선택 항목은 목적 · 보관 기간을 먼저 보여 주고 동의할 때만 저장.
   learner.html에서 lapp.js 앞(faccalc.js 다음). 앱 홈 · 하단 탭 꾸미기는 모든 스크립트가 감싼 뒤(DOMContentLoaded) 가장 바깥에서 한다. */
'use strict';
(() => {
  if (typeof lrender !== 'function' || typeof viewPage !== 'function') return;
  const FX = { cat: 'all', day: {}, sel: null, f: {}, mf: 'all', my: null, myAt: 0, myBusy: false, av: {}, st: null, cx: null, qr: null };
  window.FAC_UI = FX;
  const CC = () => window.facCalc;
  /* ── 시각(KST) ── */
  const nowD = () => (window.__facNow ? new Date(window.__facNow) : new Date());
  const kst = () => new Date(nowD().getTime() + 9 * 3600e3).toISOString();
  const today = () => kst().slice(0, 10);
  const nowS = () => kst().slice(0, 16);
  const nowM = () => CC().toMin(kst().slice(11, 16));
  const abs = (d, hm) => Date.parse(d + 'T00:00:00Z') / 6e4 + (CC().toMin(hm) || 0); /* 분 단위(KST 벽시계 기준) */
  const absNow = () => abs(today(), kst().slice(11, 16)) + nowD().getUTCSeconds() / 60;
  const WD = '일월화수목금토';
  const fmtD = d => `${+d.slice(5, 7)}.${+d.slice(8, 10)}(${WD[CC().dow(d)]})`;
  const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
  const dur = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60); return h ? `${h}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`; };
  /* ── 설정(게시본) ── */
  /* 운영 모드: 공개 목록(fac-list, 서버가 게시본에서 내부 칸을 뺀 것)을 원본으로 — 처음 한 번 받아 둔다 */
  async function loadList() { if (FX.lsBusy || FX.ls) return; FX.lsBusy = true; try { const r = await fapi('GET', P('list')); const F = r.facilities || []; FX.ls = { on: F.length > 0, payOnline: !!r.payOnline, facilities: F.map(f => ({ ...f, products: undefined })), products: F.flatMap(f => (f.products || []).map(p => ({ ...p, fac: p.fac || f.id }))) }; } catch (e) { FX.ls = null; FX.lsErr = 1; } FX.lsBusy = false; if (FX.ls && ['fac', 'home', 'cal'].includes(route().a)) rer(); }
  const cfg = () => { try { if (live() && SITE() && SITE().fac && SITE().fac.on !== false) { if (FX.ls) return FX.ls.on ? FX.ls : null; if (!FX.lsErr) loadList(); } /* 게시본에 시설 예약이 켜진 기관만 서버에 묻는다 */ const f = SITE() && SITE().fac; return f && f.on !== false && Array.isArray(f.facilities) && f.facilities.some(x => x && x.on !== false) ? f : null; } catch (e) { return null; } };
  window.facOn = () => !!cfg();
  const FACS = () => (cfg().facilities || []).filter(f => f && f.id && f.on !== false);
  const facOf = id => FACS().find(f => f.id === id) || null;
  const prods = f => (cfg().products || []).filter(p => p && p.fac === f.id && p.on !== false);
  const prodOf = id => (cfg().products || []).find(p => p && p.id === id) || null;
  const ty = () => ((SITE() && SITE().org) || {}).type || 'adult';
  const univ = () => ty() === 'univ';
  const payOnline = () => { if (FX.onsiteOnly) return false; const c = cfg() || {}; return c.payOnline === true || !!(c.settings && c.settings.payOnline === true); }; /* 서버 /api/config · fac-list의 payOnline:false면 온라인 결제 숨김 */
  const AUD = { student: '학생', staff: '교직원', public: '일반', member: '수강생', resident: '지역주민', reduced: '감면 대상', employee: '임직원', external: '외부' };
  const audL = a => AUD[a] || a || '일반';
  const audsOf = f => { const A = (Array.isArray(f.audience) && f.audience.length ? f.audience : Object.keys(f.prices || {})).filter(a => AUD[a] || a); return A.length ? A : ['public']; };
  const CATRX = [[/골프|타석/, '골프'], [/테니스|코트/, '테니스'], [/배드민턴/, '배드민턴'], [/체육관|대관|강당/, '체육관'], [/수영/, '수영장'], [/강의실|세미나|실습실|강의/, '강의실'], [/회의실|교육장/, '회의실'], [/사물함|락커/, '사물함'], [/노트북|카메라|장비|태블릿|대여/, '장비']];
  const catOf = f => f.cat || (CATRX.find(([r]) => r.test(f.name || '')) || [0, f.kind === 'rent' ? '장비' : f.kind === 'pass' ? '이용권' : '시설'])[1];
  const unitOf = f => f.unitLabel || ({ 골프: '타석', 테니스: '면', 배드민턴: '면', 강의실: '석', 회의실: '석', 체육관: '팀' })[catOf(f)] || '자리';
  const resOf = f => { const R = (f.resources || []).filter(r => r && r.on !== false); if (R.length) return R; const n = Math.max(1, +(f.capacity || {}).res || 1); return [...Array(n)].map((_, i) => ({ id: 'r' + (i + 1), name: String(i + 1) })); };
  const perOf = f => Math.max(1, +(f.capacity || {}).perSlot || 1);
  const exclOf = f => ((f.rules || {}).exclGroup) || f.id;
  const IC = { golf: 'M8 21V4l9 4-9 4', tennis: 'M12 3a9 9 0 100 18 9 9 0 000-18zM5 7c4 2 4 8 0 10M19 7c-4 2-4 8 0 10', room: 'M3 5h18v11H3zM8 20h8M12 16v4', gym: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12', locker: 'M5 3h14v18H5zM12 3v18M9 10v2M15 10v2', cam: 'M4 7h4l2-2h4l2 2h4v12H4zM12 17a4 4 0 100-8 4 4 0 000 8z', laptop: 'M5 5h14v10H5zM2 19h20', ticket: 'M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z', qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z', cal: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', check: 'M5 12l5 5 9-10', pin: 'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.5', warn: 'M12 3l10 18H2zM12 10v5M12 17.5v.5', sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5', ref: 'M20 12a8 8 0 11-2.3-5.7M20 4v5h-5', chev: 'M9 6l6 6-6 6', x: 'M6 6l12 12M18 6L6 18' };
  const sv = (n, s = 20) => `<svg class="fx-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n] || IC.info}"/></svg>`;
  const icOf = f => ({ 골프: 'golf', 테니스: 'tennis', 배드민턴: 'tennis', 강의실: 'room', 회의실: 'room', 체육관: 'gym', 사물함: 'locker', 이용권: 'ticket' })[catOf(f)] || (/카메라/.test(f.name) ? 'cam' : f.kind === 'rent' ? 'laptop' : 'room');
  const tone = f => ({ golf: 'g', tennis: 'b', room: 'y', gym: 'p', locker: 'n', ticket: 'g', cam: 'r', laptop: 'n' })[icOf(f)] || 'n';
  const icBox = f => `<span class="fx-ic t-${tone(f)}">${sv(icOf(f), 22)}</span>`;
  /* ── 저장(데모: 이 기기) · 운영(서버) ── */
  const live = () => LR.mode === 'live';
  /* 서버 오류의 덧붙인 값(alt · opensAt · until · expected · auto · candidates)까지 받는 호출(lrun api와 같은 머리) */
  const fapi = async (method, url, body) => { const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; e.extra = j; throw e; } return j; };
  const P = act => `/api/pub/${encodeURIComponent(LR.tid)}/fac-${act}`;
  const sidMe = () => (LR.me && String(LR.me.sid || LR.me.id || '')) || '';
  const sk = () => `didisam.fac.${LR.tid || 'x'}.${sidMe() || 'guest'}`;
  function store() { if (FX.st && FX.st.k === sk()) return FX.st.v; let v = null; try { v = JSON.parse(localStorage.getItem(sk()) || 'null'); } catch (e) { v = null; }
    if (!v || typeof v !== 'object') v = {}; ['bk', 'ps', 'rt', 'ci'].forEach(k => { if (!Array.isArray(v[k])) v[k] = []; }); v.seq = +v.seq || 0; FX.st = { k: sk(), v }; return v; }
  function persist() { try { localStorage.setItem(sk(), JSON.stringify(store())); return true; } catch (e) { toast('이 기기에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.', 'bad'); return false; } }
  const rer = () => { const y = scrollY; lrender(); requestAnimationFrame(() => scrollTo(0, y)); };
  async function loadMy(force) { if (!live() || !LR.me || FX.myBusy) return; if (!force && FX.my && Date.now() - FX.myAt < 20000) return; FX.myBusy = true;
    try { const [u, o] = await Promise.all([fapi('GET', P('my') + '?scope=upcoming'), fapi('GET', P('my') + '?scope=past').catch(() => ({ bookings: [] }))]);
      const seen = new Set(); const B = [...(u.bookings || []), ...(o.bookings || [])].filter(b => b && !seen.has(b.id) && seen.add(b.id));
      FX.my = { bk: B.map(b => normB({ ...b, pay: b.pay || (b.passId ? 'pass' : b.payMode === 'free' ? (b.status === 'requested' ? 'approve' : 'free') : b.payMode) })), ps: (u.passes || []).map(normP), rt: (u.rentals || []).map(normR) }; FX.err = ''; }
    catch (e) { FX.my = FX.my || { bk: [], ps: [], rt: [] }; FX.err = e.message || '불러오지 못했어요'; }
    FX.myAt = Date.now(); FX.myBusy = false; if (['fac', 'home', 'cal'].includes(route().a)) rer(); }
  const mine = () => { if (!LR.me) return { bk: [], ps: [], rt: [] }; if (live()) { loadMy(); return FX.my || { bk: [], ps: [], rt: [] }; } return store(); };
  /* 예약 한 건을 화면용으로(서버 · 게시본 · 이 기기 모양을 하나로) */
  function normB(b) { const fid = b.fac || b.fac_id || b.facId; const f = facOf(fid); const S = f ? CC().slots(f, b.day) : []; const s0 = +(b.slot != null ? b.slot : b.start_slot) || 0; const n = Math.max(1, +b.slots || 1);
    const a = S[s0], z = S[s0 + n - 1]; return { ...b, fac: fid, slot: s0, slots: n, from: b.from || (a ? a.from : ''), to: b.to || (z ? z.to : ''), sm: b.sm != null ? b.sm : (a ? a.sm : 0), em: b.em != null ? b.em : (z ? z.em : 0), excl: b.excl || (f ? exclOf(f) : fid), amount: +b.amount || 0 }; }
  /* 서버 이용권 · 대여 모양(startsOn · endsOn · productId · fromDay · dueDay) → 화면 모양 */
  const normP = p => { const pr = prodOf(p.productId || p.product) || {}; return { ...p, product: p.product || p.productId, starts: p.starts || p.startsOn, ends: p.ends || p.endsOn, name: p.name || pr.name || '이용권', payStatus: p.payStatus || (p.status === 'pending' ? 'pending' : p.amount ? 'paid' : 'none') }; };
  const normR = r => { const pr = prodOf(r.productId || r.product) || {}; return { ...r, product: r.product || r.productId, from: r.from || r.fromDay, due: r.due || r.dueDay, name: r.name || pr.name || '대여', lateFeePerDay: r.lateFeePerDay != null ? r.lateFeePerDay : +pr.lateFeePerDay || 0, status: r.status === 'lent' && (r.due || r.dueDay) < today() ? 'overdue' : r.status }; };
  const ACT = ['requested', 'approved', 'confirmed', 'checked_in'];
  const activeB = () => mine().bk.filter(b => ACT.includes(b.status));
  const upcoming = () => activeB().filter(b => abs(b.day, b.to || '23:59') > absNow()).sort((a, b) => (a.day + a.from).localeCompare(b.day + b.from));
  const passLeft = p => p.kind === 'count' ? Math.max(0, (+p.total || 0) - (+p.used || 0)) : null;
  const passOK = p => p && p.status === 'active' && (!p.starts || p.starts <= today()) && (!p.ends || p.ends >= today()) && (p.kind !== 'count' || passLeft(p) > 0);
  const enteredToday = p => store().ci.some(c => c.pass === p.id && c.day === today()) || (p.lastEntry === today());
  /* ── 칸 상태 ── */
  function occ(f) { const D = ((cfg().demo || {}).bookings || []).map(normB).filter(b => b.fac === f.id && ACT.includes(b.status || 'confirmed') && String(b.sid || '') !== sidMe()); return D.concat(activeB().filter(b => b.fac === f.id)); }
  function avail(f, d) { const o = CC().isOpen(f, d, nowS()); const H = CC().dayHours(f, d);
    if (H && H.closed) return { st: 'closed', note: H.reason || '휴관', slots: [] }; if (!H) return { st: 'off', slots: [] };
    if (!o.open && o.reason === 'not_open') return { st: 'not_open', opensAt: o.opensAt, slots: [] };
    if (!o.open && o.reason === 'window') return { st: 'window', slots: [] };
    let S;
    if (live()) { const k = f.id + '|' + d; const c = FX.av[k]; if (!c || Date.now() - c.at > 15000) fetchAv(f, d); if (!c) return { st: 'loading', slots: [] };
      if (c.err) return { st: c.err, opensAt: c.opensAt, slots: [] }; S = CC().slots(f, d).map(s => { const x = (c.r.slots || []).find(y => +y.slot === s.slot) || {}; return { ...s, left: +x.left || 0, cap: resOf(f).length * perOf(f), off: !!x.closed, past: !!x.past }; }); }
    else { const R = resOf(f), per = perOf(f), all = occ(f).filter(b => b.day === d);
      S = CC().slots(f, d).map(s => { let left = 0; R.forEach((r, i) => { const used = all.filter(b => (b.res || R[0].id) === r.id && b.sm < s.em && s.sm < b.em).reduce((a, b) => a + Math.max(1, +b.n || 1), 0); left += Math.max(0, per - used); }); return { ...s, left, cap: R.length * per }; }); }
    const me = activeB().filter(b => b.day === d); const tdy = d === today(), nm = nowM();
    S.forEach(s => { s.past = s.past || (tdy && s.sm < nm); s.mine = me.find(b => b.fac === f.id && b.sm < s.em && s.sm < b.em) || null; s.dup = !s.mine && (f.rules || {}).dupSame !== false ? me.find(b => b.fac !== f.id && b.excl === exclOf(f) && b.sm < s.em && s.sm < b.em) || null : null; s.ok = !s.past && !s.off && !s.mine && !s.dup && s.left > 0; });
    return { st: 'ok', slots: S }; }
  async function fetchAv(f, d) { const k = f.id + '|' + d; if (FX.av[k] && FX.av[k].busy) return; FX.av[k] = { ...(FX.av[k] || {}), busy: true, at: Date.now() };
    try { const r = await fapi('GET', P('avail') + `?fac=${encodeURIComponent(f.id)}&day=${d}`); FX.av[k] = { at: Date.now(), r }; }
    catch (e) { FX.av[k] = { at: Date.now(), err: e.status === 409 && e.code === 'not_open' ? 'not_open' : 'err', opensAt: (e.extra || {}).opensAt || '', r: { slots: [] } }; }
    if (route().a === 'fac' && route().b === f.id) rer(); }
  const daysOf = f => { const n = Math.max(1, Math.min(31, +(f.open || {}).daysAhead || 7)); return [...Array(n)].map((_, i) => CC().addDays(today(), i)); };
  const maxOf = f => Math.max(1, +f.maxSlots || 3);
  const usedDay = (f, d) => activeB().filter(b => b.fac === f.id && b.day === d).reduce((a, b) => a + b.slots, 0);

  /* ── 공통 조각 ── */
  const head = (t, sub, right) => `<div class="fx-hd"><div><h1>${esc(t)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right || ''}</div>`;
  const stB = b => b.status === 'requested' ? ['y', '승인 대기'] : b.status === 'approved' ? ['y', '결제 대기'] : b.status === 'checked_in' ? ['g', '이용 중'] : b.status === 'done' ? ['n', '이용 완료'] : b.status === 'cancelled' ? ['n', '취소됨'] : b.status === 'no_show' ? ['r', '자동 취소'] : b.status === 'rejected' ? ['r', '반려됨'] : b.payStatus === 'pending' && b.pay === 'online' ? ['y', '결제 대기'] : b.payStatus === 'pending' ? ['g', '확정 · 현장 결제'] : ['g', '확정'];
  const badge = ([t, l]) => `<em class="fx-b t-${t}">${t === 'g' && /^확정/.test(l) ? sv('check', 14) : ''}${esc(l)}</em>`;
  const page = (cls, inner) => `<section class="fx ${cls || ''}"><div class="in fx-in">${inner}</div></section>`;
  const gate = back => { if (LR.me) return ''; return `<div class="fx-note t-b">${sv('info', 18)}<span>예약하려면 간편 로그인이 필요해요. 둘러보기는 로그인 없이 할 수 있어요.</span><a class="fx-btn sm" href="#login/${esc(back)}">로그인</a></div>`; };
  const timeOf = b => `${fmtD(b.day)} ${b.from}–${b.to}`;
  const flowBar = h => `<div class="fx-bar">${h}</div>`;

  /* ── 예약 홈(#fac) ── */
  function catsAll() { const C = []; FACS().forEach(f => { const c = catOf(f); if (!C.includes(c)) C.push(c); }); if ((cfg().products || []).some(p => /^pass-/.test(p.type)) && !C.includes('이용권')) C.push('이용권'); return C; }
  function passCard() { const L = mine().ps.filter(p => p.status === 'active' || p.status === 'pending'); if (!L.length) return '';
    const per = L.filter(p => p.kind !== 'count'), cnt = L.filter(p => p.kind === 'count'); const p0 = per[0] || cnt[0]; const f = facOf(p0.fac) || { name: '' };
    const left = p0.kind === 'count' ? `${passLeft(p0)}매 남음` : `${Math.max(0, CC().dayDiff(today(), p0.ends) + 1)}일 남음 · ${fmtD(p0.ends).slice(0, -3)}까지`;
    const pct = p0.kind === 'count' ? Math.round(passLeft(p0) / Math.max(1, +p0.total) * 100) : Math.round(Math.max(0, CC().dayDiff(today(), p0.ends) + 1) / Math.max(1, CC().dayDiff(p0.starts, p0.ends) + 1) * 100);
    const can = passOK(p0) && !enteredToday(p0);
    return `<section class="fx-pass" aria-label="내 이용권"><div class="fx-ph"><b>내 이용권</b><span>${L.length}장</span></div><div class="fx-pm"><div><h3>${esc(p0.name)}</h3><span class="fx-pb" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span><small>${esc(left)} · ${p0.status === 'pending' ? '현장 결제 후 열려요' : enteredToday(p0) ? '오늘 입장 완료' : '오늘 입장 전'}</small></div>${can ? `<a class="fx-btn pri" href="#fac/qr/${esc(p0.id)}">${sv('qr', 18)}입장 QR</a>` : ''}</div>
      ${cnt.filter(x => x !== p0).slice(0, 1).map(x => `<a class="fx-pr" href="#fac/ps/${esc(x.id)}"><span><b>${esc(x.name)}</b> ${passLeft(x)}매 남음${x.ends ? ` · 사용기한 ${esc(x.ends.replace(/-/g, '.'))}` : ''}</span><em>보기 ›</em></a>`).join('')}</section>`; }
  function nextCard() { const b = upcoming()[0]; if (!b) return ''; const f = facOf(b.fac) || { name: b.fac };
    const qa = abs(b.day, b.from) - 15; const hint = b.status === 'requested' ? '담당자가 확인하면 알려 드려요' : b.day === today() ? (absNow() >= qa ? '지금 체크인할 수 있어요' : `${CC().toHM(((qa % 1440) + 1440) % 1440)}부터 체크인할 수 있어요`) : `이용일 당일 시작 15분 전부터 QR이 열려요`;
    return `<a class="fx-card fx-next" href="#fac/bk/${esc(b.id)}">${icBox(f)}<span class="fx-ct"><small>${b.day === today() ? '오늘' : fmtD(b.day)} · ${esc(b.from)}–${esc(b.to)}</small><b>${esc(f.name)}</b><small>${esc(hint)}</small></span>${badge(stB(b))}</a>`; }
  function facRow(f) { const d = today(); let tag = ['n', ''], sub2 = '';
    if (f.kind === 'time') { const A = avail(f, d); if (A.st === 'closed') tag = ['n', '오늘은 쉬어요']; else if (A.st === 'off') tag = ['n', '오늘 운영 없음']; else if (A.st === 'loading') tag = ['n', '확인 중'];
      else if (A.st === 'ok') { const L = A.slots.filter(s => s.ok); const sum = L.reduce((a, s) => Math.max(a, s.left), 0); tag = L.length ? (f.approval ? ['b', '승인제'] : ['g', `${sum}${unitOf(f)} 남음`]) : ['n', '오늘 마감']; if (!L.length) { const nd = daysOf(f).slice(1).find(x => (avail(f, x).slots || []).some(s => s.ok)); if (nd) sub2 = `${fmtD(nd)} ${f.open && f.open.at ? f.open.at + ' 오픈' : '예약 가능'}`; } }
      else tag = ['n', A.st === 'not_open' ? '오픈 전' : '신청 기간 아님']; }
    else if (f.kind === 'rent') { const P0 = prods(f); tag = f.approval ? ['b', '승인제'] : ['g', `대여 가능 ${resOf(f).length - mine().rt.filter(r => r.fac === f.id && ['requested', 'approved', 'lent'].includes(r.status)).length}`]; if (!P0.length) tag = ['n', '준비 중']; }
    else tag = ['g', '이용권'];
    const q = f.kind === 'time' ? CC().quote({ fac: f, aud: audsOf(f)[0], slots: 1 }) : null; const pp = prods(f).map(p => +((p.prices || {})[audsOf(f)[0]] || Object.values(p.prices || {})[0] || 0)).filter(x => x > 0);
    const price = f.kind === 'time' ? (q.final ? `${audL(audsOf(f)[0])} ${won(q.final)}~` : f.approval ? '구성원 무료' : '무료') : pp.length ? `${won(Math.min(...pp))}~` : '';
    return `<a class="fx-row" href="#fac/${esc(f.id)}">${icBox(f)}<span class="fx-ct"><b>${esc(f.name)}</b><small>${esc([f.place, f.kind === 'time' ? `${resOf(f).length > 1 ? resOf(f).length + unitOf(f) : '정원 ' + perOf(f) + '명'}` : f.kind === 'rent' ? '대여' : '이용권'].filter(Boolean).join(' · '))}</small></span><span class="fx-rt">${tag[1] ? badge(tag) : ''}<small>${esc(sub2 || price)}</small></span></a>`; }
  function homeView() { const c = cfg(); const C = catsAll(); if (!C.includes(FX.cat) && FX.cat !== 'all') FX.cat = 'all';
    const L = FACS().filter(f => FX.cat === 'all' || catOf(f) === FX.cat || (FX.cat === '이용권' && prods(f).some(p => /^pass-/.test(p.type))));
    const chips = `<div class="fx-chips" role="tablist" aria-label="시설 종류">${[['all', '전체'], ...C.map(x => [x, x])].map(([k, l]) => `<button type="button" role="tab" class="fx-chip${FX.cat === k ? ' on' : ''}" aria-selected="${FX.cat === k}" data-fx="cat" data-v="${esc(k)}">${esc(l)}</button>`).join('')}</div>`;
    return page('fx-home', `${head('시설 예약', esc((SITE().org || {}).name || ''), LR.me ? `<a class="fx-btn sm" href="#fac/my">${sv('cal', 18)}내 예약</a>` : '')}${chips}${gate('fac')}${LR.me ? passCard() + nextCard() : ''}
      <div class="fx-sh"><h2>${FX.cat === 'all' ? '오늘 이용 가능' : esc(FX.cat)}</h2><small>${esc(fmtD(today()))} ${esc(kst().slice(11, 16))} 기준</small></div>
      <div class="fx-list">${L.map(facRow).join('') || '<p class="fx-empty">이 종류의 시설이 아직 없어요.</p>'}</div>${c.notice ? `<p class="fx-foot">${esc(c.notice)}</p>` : ''}`); }

  /* ── 시설 상세 · 날짜 · 시간(#fac/<시설>) ── */
  function rulesLine(f) { const R = f.rules || {}; const out = []; const H = f.hours || {}; const wk = [1, 2, 3, 4, 5].map(i => H[i]).find(Boolean), sa = H[6], su = H[0];
    if (wk) out.push(['clock', `평일 ${wk[0]}–${wk[1]}${sa ? ` · 토 ${sa[0]}–${sa[1]}` : ' · 토 휴무'}${su ? ` · 일 ${su[0]}–${su[1]}` : ''}`]);
    if (f.note) out.push(['warn', f.note]); if (R.noShowMin) out.push(['info', `시작 ${R.noShowMin}분 안에 체크인하지 않으면 자동 취소돼요`]);
    return `<div class="fx-tags">${out.map(([i, t]) => `<span class="fx-tag">${sv(i, 16)}${esc(t)}</span>`).join('')}</div>`; }
  function heroOf(f) { const sub = f.kind === 'time' ? `${esc(f.place || '')}${f.place ? ' · ' : ''}${CC().toHM(Math.max(5, +f.slotMin || 60)).replace(/^0(\d):00$/, '$1시간').replace(/^00:(\d+)$/, '$1분')} 단위 · 하루 최대 ${maxOf(f)}칸` : esc(f.place || '');
    return `<div class="fx-hero t-${tone(f)}"><small>${esc(catOf(f))}${f.approval ? ' · 승인제' : ''}</small><h2>${esc(f.name)}</h2><p>${sub}</p>${f.photo && /^(https:|data:image)/.test(f.photo) ? `<img src="${esc(f.photo)}" alt="">` : ''}</div>`; }
  function detailView(f) { if (f.kind !== 'time') return prodView(f);
    const D = daysOf(f); let d = FX.day[f.id]; if (!d || !D.includes(d)) { d = D.find(x => avail(f, x).st === 'ok' && avail(f, x).slots.some(s => s.ok)) || D[0]; FX.day[f.id] = d; }
    const A = avail(f, d); const sel = FX.sel && FX.sel.fac === f.id && FX.sel.day === d ? FX.sel : null;
    const strip = `<div class="fx-sh"><h2>날짜</h2><small>${+d.slice(5, 7)}월</small></div><div class="fx-days" role="radiogroup" aria-label="날짜">${D.map(x => { const a = avail(f, x); const off = a.st === 'closed' || a.st === 'off'; return `<button type="button" role="radio" aria-checked="${x === d}" class="fx-day${x === d ? ' on' : ''}${off ? ' off' : ''}" data-fx="day" data-v="${x}"><small>${off ? (a.st === 'closed' ? '휴관' : '쉬는 날') : WD[CC().dow(x)]}</small><b>${+x.slice(8)}</b></button>`; }).join('')}</div>`;
    let grid;
    if (A.st === 'closed') grid = `<div class="fx-note t-n">${sv('info', 18)}<span>${esc(fmtD(d))}은 쉬어요${A.note ? ` · ${esc(A.note)}` : ''}. 다른 날짜를 골라 주세요.</span></div>`;
    else if (A.st === 'off') grid = `<div class="fx-note t-n">${sv('info', 18)}<span>${esc(fmtD(d))}은 운영하지 않아요.</span></div>`;
    else if (A.st === 'not_open') grid = `<div class="fx-note t-y">${sv('clock', 18)}<span>${A.opensAt ? `${esc(fmtD(A.opensAt.slice(0, 10)))} ${esc(A.opensAt.slice(11, 16))}에 예약이 열려요.` : '아직 예약이 열리지 않았어요.'}</span></div>`;
    else if (A.st === 'window') grid = `<div class="fx-note t-y">${sv('clock', 18)}<span>지금은 신청 기간이 아니에요.${(f.windows || []).filter(w => w.from > today())[0] ? ` 다음 신청은 ${esc(fmtD(f.windows.filter(w => w.from > today())[0].from))}부터예요.` : ''}</span></div>`;
    else if (A.st === 'loading') grid = `<p class="fx-empty" role="status">빈자리를 확인하고 있어요…</p>`;
    else if (A.st !== 'ok') grid = `<div class="fx-note t-r">${sv('warn', 18)}<span>빈자리를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</span></div>`;
    else grid = `<div class="fx-sh"><h2>시간 <small>${esc(fmtD(d))}</small></h2><small>1회 최대 ${maxOf(f)}칸${usedDay(f, d) ? ` · 이날 내 예약 ${usedDay(f, d)}칸` : ''}</small></div>
      <div class="fx-grid" role="group" aria-label="시간 칸">${A.slots.map(s => { const on = sel && s.slot >= sel.s0 && s.slot < sel.s0 + sel.n; const cls = on ? 'sel' : s.mine ? 'mine' : s.dup ? 'dup' : s.past ? 'past' : s.left <= 0 || s.off ? 'full' : '';
        const lab = on ? '선택' : s.mine ? '내 예약' : s.dup ? '다른 예약' : s.past ? '지났어요' : s.left <= 0 || s.off ? '마감' : `${s.left}${unitOf(f)}`;
        return `<button type="button" class="fx-slot ${cls}" data-fx="slot" data-v="${s.slot}" aria-pressed="${!!on}" aria-label="${s.from}부터 ${s.to}까지 ${lab}"${s.past || s.mine ? ' aria-disabled="true"' : ''}><b>${s.from}</b><small>${lab}</small></button>`; }).join('') || '<p class="fx-empty">이날은 예약할 수 있는 칸이 없어요.</p>'}</div>
      <ul class="fx-leg" aria-label="칸 표시"><li><i></i>남은 ${unitOf(f)} 수</li><li><i class="full"></i>마감</li><li><i class="mine"></i>내 예약</li><li><i class="sel"></i>선택</li></ul><p class="fx-msg" id="fxMsg" role="status" aria-live="polite">${esc(FX.msg || '')}</p>`;
    FX.msg = '';
    const q = sel ? CC().quote({ fac: f, aud: audsOf(f)[0], slots: sel.n, day: d, sm: A.slots.find(s => s.slot === sel.s0).sm }) : null; const S0 = sel && A.slots.find(s => s.slot === sel.s0), S1 = sel && A.slots.find(s => s.slot === sel.s0 + sel.n - 1);
    const bar = flowBar(`<div class="fx-bs">${sel ? `<small>${esc(fmtD(d))} ${S0.from}–${S1.to} · ${dur(S1.em - S0.sm)}</small><b>${q.final ? `${esc(audL(audsOf(f)[0]))} ${won(q.final)}` : f.approval ? '무료 · 승인 후 확정' : '무료'}</b>` : `<small>시간 칸을 골라 주세요</small><b>${esc(f.name)}</b>`}</div><button type="button" class="fx-btn pri big" data-fx="next"${sel ? '' : ' disabled'}>다음</button>`);
    const P0 = prods(f);
    return page('fx-det fx-flow', `${head(f.name, '', f.link && /^https:/.test(f.link) ? `<a class="fx-ib" href="${esc(f.link)}" target="_blank" rel="noopener" aria-label="위치 · 외부 안내">${sv('pin', 22)}</a>` : '')}${heroOf(f)}${rulesLine(f)}${gate('fac/' + f.id)}${strip}${grid}
      ${P0.length ? `<div class="fx-sh"><h2>이용권</h2></div><div class="fx-list">${P0.map(p => prodRow(f, p)).join('')}</div>` : ''}${bar}`); }
  function prodRow(f, p) { const a = audsOf(f)[0]; const pr = +((p.prices || {})[a] || Object.values(p.prices || {})[0] || 0); const q = CC().quote({ fac: f, product: { ...p, prices: { [a]: pr } }, aud: a });
    const sub = p.type === 'pass-count' ? `${+p.count || 1}회 · 사용기한 ${+p.expireDays || 365}일` : p.type === 'rent' ? `${p.per === 'month' ? '월' : '일'} 단위 · 최대 ${+p.maxUnits || (p.per === 'month' ? 6 : 7)}${p.per === 'month' ? '개월' : '일'}${p.deposit ? ` · 보증금 ${won(p.deposit)}` : ''}` : `결제일 포함 ${+p.days || 30}일 · 1일 ${+p.perDayEntry || 1}회 입장${p.transferable === false || p.transferable == null ? ' · 양도 불가' : ''}`;
    return `<a class="fx-row" href="#fac/${esc(f.id)}/buy/${esc(p.id)}">${icBox(f)}<span class="fx-ct"><b>${esc(p.name)}</b><small>${esc(sub)}</small></span><span class="fx-rt">${q.off ? `<em class="fx-b t-g">${esc(String(p.discountRate))}% 할인</em>` : ''}<small>${q.final ? won(q.final) : '무료'}${p.type === 'rent' ? `/${p.per === 'month' ? '월' : '일'}` : ''}</small></span></a>`; }
  function prodView(f) { const P0 = prods(f); const rentN = f.kind === 'rent' ? resOf(f).length - mine().rt.filter(r => r.fac === f.id && ['requested', 'approved', 'lent', 'overdue'].includes(r.status)).length : 0;
    return page('fx-det', `${head(f.name)}${heroOf(f)}${rulesLine(f)}${gate('fac/' + f.id)}${f.kind === 'rent' ? `<div class="fx-note t-g">${sv('info', 18)}<span>지금 대여 가능 ${Math.max(0, rentN)}개 · 반납은 프론트에서 확인해요${f.approval ? ' · 담당자 승인 후 수령해요' : ''}</span></div>` : ''}
      <div class="fx-sh"><h2>${f.kind === 'rent' ? '대여 상품' : '이용권'}</h2></div><div class="fx-list">${P0.map(p => prodRow(f, p)).join('') || '<p class="fx-empty">준비 중이에요.</p>'}</div>`); }

  /* ── 신청 · 요금 · 결제(#fac/<시설>/pay · /buy/<상품>) ── */
  function form(f, p) { const k = f.id + '|' + (p ? p.id : ''); if (!FX.f[k]) { const A = audsOf(f); const def = univ() && A.includes('student') ? 'student' : A.includes('member') ? 'member' : A[0]; FX.f[k] = { aud: def, sid: univ() ? sidMe() : '', dept: (LR.me && LR.me.dept) || '', n: 1, units: 1, start: today(), car: '', carOn: false, consent: false, purpose: '', agree: false, method: '' }; } return FX.f[k]; }
  function methods(f, q, F, pass, p) { const M = []; if (pass) M.push(['pass', '이용권으로 예약', `${pass.name} · ${pass.kind === 'count' ? `예약할 때 1회 차감 · 취소하면 돌려드려요(남은 ${passLeft(pass)}회)` : '기간 안 무료'}`]);
    if (q.pay === 'after-approve' || (f.approval && q.final > 0)) M.push(['approve', '승인 요청하기', q.final > 0 ? '담당자가 승인하면 결제 안내를 드려요' : '결제 없음 · 담당자가 확인하면 확정돼요']);
    else if (q.pay === 'free') M.push(['free', '무료 예약', '바로 확정돼요']);
    else { if (q.pay === 'online' && payOnline()) M.push(['online', '온라인 결제', '카드 · 간편결제(토스) · 바로 확정']); M.push(['onsite', '현장 결제', `프론트에서 카드 · 계좌 · ${p && /^pass-/.test(p.type) ? '결제하면 이용권이 열려요' : '이용 30분 전까지'}`]); }
    if (!M.some(m => m[0] === F.method)) F.method = M[0][0]; return M; }
  function refundText(f, p) { const R = (p && p.refund) || f.refund || {}; if (R.type === 'pass-period' || (p && /^pass-/.test(p.type))) return `기간 시작 후에는 환불 신청으로 처리해요 · 미사용 당일은 수수료 ${+R.feeRate || 10}% · 1~5회 이용은 일일권 5회분, 6~10회는 10회분을 빼요 · 11회 이상은 환불이 없어요`;
    if (p && p.type === 'rent') return '수령 전에는 취소할 수 있어요 · 보증금은 반납 확인 후 돌려드려요(연체료 · 파손은 차감) · 이용료는 일할 환불이 없어요';
    const S = (R.steps && R.steps.length ? R.steps : [{ beforeH: 24, rate: 100 }, { rate: 0 }]); const t = S.map(s => s.beforeH != null ? `${s.beforeH}시간 전까지 ${s.rate}%` : `그 뒤 ${s.rate ? s.rate + '%' : '환불 없음'}`).join(' · ');
    return `${t}${(f.rules || {}).noShowMin ? ` · 시작 ${f.rules.noShowMin}분이 지나도 체크인하지 않으면 자동 취소돼요(환불 없음)` : ''}`; }
  function payView(f, p) { if (!LR.me) return page('fx-pay', head('신청 · 결제') + gate(location.hash.slice(1)));
    const F = form(f, p); const A = audsOf(f); const time = !p; let sel = null, A0 = null, S0 = null, S1 = null;
    if (time) { sel = FX.sel && FX.sel.fac === f.id ? FX.sel : null; if (!sel) return page('fx-pay', `${head('신청 · 결제')}<div class="fx-note t-y">${sv('info', 18)}<span>시간 칸을 먼저 골라 주세요.</span><a class="fx-btn sm" href="#fac/${esc(f.id)}">시간 고르기</a></div>`);
      A0 = avail(f, sel.day); S0 = A0.slots.find(s => s.slot === sel.s0); S1 = A0.slots.find(s => s.slot === sel.s0 + sel.n - 1); if (!S0 || !S1) { FX.sel = null; return page('fx-pay', `${head('신청 · 결제')}<div class="fx-note t-y"><span>고른 칸을 다시 확인해 주세요.</span><a class="fx-btn sm" href="#fac/${esc(f.id)}">시간 고르기</a></div>`); } }
    const units = p && p.type === 'rent' ? Math.max(1, Math.min(+p.maxUnits || (p.per === 'month' ? 6 : 7), +F.units || 1)) : 1;
    const q = time ? CC().quote({ fac: f, aud: F.aud, slots: sel.n, day: sel.day, sm: S0.sm }) : CC().quote({ fac: f, product: p, aud: F.aud, units });
    const pass = time ? mine().ps.find(x => x.fac === f.id && passOK(x)) : null; const M = methods(f, q, F, pass, p);
    const sum = time ? `${fmtD(sel.day)} ${S0.from}–${S1.to} · ${dur(S1.em - S0.sm)}${F.n > 1 ? ` · ${F.n}명` : ''}` : p.type === 'rent' ? `${units}${p.per === 'month' ? '개월' : '일'} · ${fmtD(F.start)}부터` : `${fmtD(F.start)}부터${p.days ? ` ${p.days}일` : ''}${p.count ? ` · ${p.count}회` : ''}`;
    const verifyNote = univ() ? (F.aud === 'student' ? '구성원 확인에는 학번 · 학과만 써요. 다른 정보는 받지 않아요. 운영자가 재학생 명단과 대조해 승인하고, 학번이 맞지 않으면 일반 요금으로 바뀔 수 있어요.' : F.aud === 'staff' ? '교직원은 소속만 받아요(사번은 받지 않아요). 운영자가 확인해 승인해요.' : '') : '';
    const ex = (f.extra || []).filter(x => x && x.key && x.purpose && +x.keepDays > 0)[0];
    const total = M.find(m => m[0] === F.method)[0] === 'pass' ? 0 : q.final; const btnL = F.method === 'pass' ? '이용권으로 예약하기' : F.method === 'approve' ? '승인 요청하기' : F.method === 'free' ? '무료로 예약하기' : F.method === 'online' ? `${won(total)} 결제하기` : `현장 결제로 ${p ? '신청' : '예약'}하기`;
    const maxN = Math.max(1, +f.maxPeople || 1);
    return page('fx-pay fx-flow', `${head('신청 · 결제')}<ol class="fx-step" aria-label="진행 단계"><li class="ok">${sv('check', 14)}${time ? '시간 선택' : '상품 선택'}</li><li class="on" aria-current="step"><i>2</i>신청 정보 · 결제</li><li><i>3</i>완료</li></ol>
      <div class="fx-card fx-sum">${icBox(f)}<span class="fx-ct"><b>${esc(p ? p.name : f.name)}</b><small>${esc(sum)}</small></span><a class="fx-lk" href="#fac/${esc(f.id)}">변경</a></div>
      <form id="fxPay" data-fac="${esc(f.id)}" data-p="${esc(p ? p.id : '')}" novalidate>
      <fieldset class="fx-fs"><legend>신청자 구분</legend><div class="fx-seg" role="radiogroup">${A.map(a => `<label class="${F.aud === a ? 'on' : ''}"><input type="radio" name="aud" value="${esc(a)}" ${F.aud === a ? 'checked' : ''}><span>${esc(audL(a))}</span></label>`).join('')}</div>
      ${univ() && F.aud === 'student' ? `<div class="fx-two"><label class="fx-fl"><span>학번</span><input name="sid" inputmode="numeric" autocomplete="off" maxlength="12" value="${esc(F.sid)}" required></label><label class="fx-fl"><span>학과</span><input name="dept" maxlength="30" value="${esc(F.dept)}" required></label></div>` : univ() && F.aud === 'staff' ? `<label class="fx-fl"><span>소속</span><input name="dept" maxlength="30" value="${esc(F.dept)}" required></label>` : ''}
      ${verifyNote ? `<p class="fx-hint">${esc(verifyNote)}</p>` : `<p class="fx-hint">이름 · 연락처는 받지 않아요. 안내는 앱 알림으로 보내요.</p>`}</fieldset>
      ${time && maxN > 1 ? `<label class="fx-fl"><span>이용 인원</span><select name="n">${[...Array(maxN)].map((_, i) => `<option value="${i + 1}" ${+F.n === i + 1 ? 'selected' : ''}>${i + 1}명</option>`).join('')}</select></label>` : ''}
      ${p && p.type === 'rent' ? `<div class="fx-two"><label class="fx-fl"><span>시작일</span><input type="date" name="start" min="${today()}" max="${CC().addDays(today(), 14)}" value="${esc(F.start)}"></label><label class="fx-fl"><span>기간</span><select name="units">${[...Array(+p.maxUnits || (p.per === 'month' ? 6 : 7))].map((_, i) => `<option value="${i + 1}" ${units === i + 1 ? 'selected' : ''}>${i + 1}${p.per === 'month' ? '개월' : '일'}</option>`).join('')}</select></label></div>` : p ? `<label class="fx-fl"><span>이용 시작일</span><input type="date" name="start" min="${today()}" max="${CC().addDays(today(), 7)}" value="${esc(F.start)}"></label><p class="fx-hint">시작일은 오늘부터 7일 뒤까지 고를 수 있어요. 기간은 시작일부터 계산하고 휴관일도 기간에 들어가요.</p>` : ''}
      ${f.approval ? `<label class="fx-fl"><span>사용 목적</span><input name="purpose" maxlength="60" placeholder="예: 캡스톤 디자인 회의" value="${esc(F.purpose)}" required></label><p class="fx-hint">승인 판단에만 쓰고 처리 후 6개월 뒤 지워요.</p>` : ''}
      ${ex ? `<div class="fx-opt"><label class="fx-ck"><input type="checkbox" name="carOn" ${F.carOn ? 'checked' : ''}><span>${esc(ex.label || '차량번호')} 등록(선택)</span></label><p class="fx-hint">왜 받나요: ${esc(ex.purpose)} · 언제 지우나요: 이용 종료 후 ${+ex.keepDays}일</p>
        ${F.carOn ? `<label class="fx-fl"><span>${esc(ex.label || '차량번호')}</span><input name="car" maxlength="12" placeholder="12가 3456" value="${esc(F.car)}"></label><label class="fx-ck"><input type="checkbox" name="consent" ${F.consent ? 'checked' : ''}><span>위 목적과 보관 기간에 동의해요</span></label>` : ''}</div>` : ''}
      <div class="fx-bill">${q.lines.map(l => `<div><span>${esc(time ? `${f.name} (${audL(F.aud)}) ${l}` : l)}</span></div>`).join('')}<div class="fx-tot"><span>${F.method === 'pass' ? '이용권 사용' : '결제 금액'}</span><b>${won(total)}</b></div></div>
      <fieldset class="fx-fs"><legend>${M.length > 1 || M[0][0] === 'onsite' || M[0][0] === 'online' ? '결제 방법' : '신청 방법'}</legend><div class="fx-rad">${M.map(([k, l, s]) => `<label class="${F.method === k ? 'on' : ''}"><input type="radio" name="method" value="${k}" ${F.method === k ? 'checked' : ''}><span><b>${esc(l)}</b><small>${esc(s)}</small></span></label>`).join('')}</div></fieldset>
      ${q.pay === 'online' && !payOnline() ? `<p class="fx-note t-b">${sv('info', 18)}<span>지금은 현장 결제로 받고 있어요. 온라인 결제가 열리면 여기서 바로 낼 수 있어요.</span></p>` : ''}
      <div class="fx-rule"><b>환불 규정 요약</b> · ${esc(refundText(f, p))}</div>
      <p class="fx-msg" id="fxErr" role="alert">${esc(FX.err2 || '')}</p>
      ${flowBar(`<label class="fx-ck"><input type="checkbox" name="agree" ${F.agree ? 'checked' : ''}><span>환불 규정과 이용 수칙을 확인했어요</span></label><button type="submit" class="fx-btn pri big wide">${esc(btnL)}</button>`)}</form>`); }
  FX.err2 = '';

  /* ── 완료(#fac/done/<번호>) ── */
  const findAny = id => { const M = mine(); return { b: M.bk.find(x => x.id === id), p: M.ps.find(x => x.id === id), r: M.rt.find(x => x.id === id) }; };
  function doneView(id) { const { b, p, r } = findAny(id); const x = b || p || r; if (!x) return page('fx-done', `${head('신청 완료')}<p class="fx-empty">예약을 찾지 못했어요. <a href="#fac/my">내 예약</a>에서 확인해 주세요.</p>`);
    const f = facOf(x.fac) || { name: x.facName || '' }; const req = x.status === 'requested';
    const kv = b ? [['시설', f.name], ['일시', timeOf(b)], ['신청자', [audL(b.aud), b.dept, b.n > 1 ? b.n + '명' : ''].filter(Boolean).join(' · ')], ['결제', b.pay === 'pass' ? '이용권 사용' : b.pay === 'approve' ? (b.amount ? `${won(b.amount)} · 승인 후 결제` : '무료 · 승인 후 확정') : b.amount ? `${won(b.amount)} · ${b.pay === 'online' ? '온라인' : '현장 결제'}` : '무료'], ['예약 번호', b.no || b.id]]
      : p ? [['이용권', p.name], ['기간', `${fmtD(p.starts)} – ${fmtD(p.ends)}`], ['결제', p.payStatus === 'pending' ? `${won(p.amount)} · 현장 결제(프론트에서 결제하면 열려요)` : p.amount ? won(p.amount) : '무료'], ['번호', p.no || p.id]]
        : [['대여', r.name], ['기간', `${fmtD(r.from)} – ${fmtD(r.due)} 반납`], ['보증금', r.deposit ? won(r.deposit) : '없음'], ['번호', r.no || r.id]];
    const payTag = b && b.amount && b.pay !== 'approve' ? `<em class="fx-b t-${b.payStatus === 'paid' ? 'g' : 'y'}">${b.payStatus === 'paid' ? '결제 완료' : '현장 결제'}</em>` : '';
    const perm = typeof Notification !== 'undefined' && Notification.permission !== 'granted';
    const qa = b ? abs(b.day, b.from) - 15 : 0; const hm = m => CC().toHM(((Math.round(m) % 1440) + 1440) % 1440);
    return page('fx-done fx-flow', `${head(req ? '신청 완료' : '예약 완료')}<div class="fx-ok"><span class="fx-okc">${sv('check', 40)}</span><h2>${req ? '승인을 요청했어요' : p ? '이용권을 신청했어요' : r ? '대여를 신청했어요' : '예약했어요'}</h2><p>${req ? '담당자가 확인하면 앱 알림으로 알려 드려요. 보통 영업일 기준 1일 안에 답해요.' : '확인 알림을 앱으로 보냈어요.'}</p></div>
      ${perm ? `<div class="fx-note t-y">${sv('warn', 18)}<span>알림이 꺼져 있어요. 켜 두면 이용 1시간 전에 알려 드려요.</span><a class="fx-btn sm" href="#connect">설정</a></div>` : ''}
      <dl class="fx-kv">${kv.map(([a, v], i) => `<div><dt>${esc(a)}</dt><dd>${esc(v)}${i === 3 && b ? payTag : ''}</dd></div>`).join('')}</dl>
      <div class="fx-two">${b ? `<button type="button" class="fx-btn" data-fx="ics" data-v="${esc(b.id)}">${sv('cal', 18)}캘린더에 추가</button>` : ''}<a class="fx-btn" href="#fac/qr/${esc(x.id)}">${sv('qr', 18)}입장 QR 보기</a></div>
      ${b && !req ? `<section class="fx-card fx-tl" aria-label="이용 당일까지"><h3>이용 당일까지</h3><ol><li class="ok"><i>${sv('check', 14)}</i><span><b>예약 확인 알림</b><small>방금 보냈어요</small></span></li><li><i></i><span><b>1시간 전 알림</b><small>${esc(fmtD(b.day))} ${esc(hm(abs(b.day, b.from) - 60))}</small></span><label class="fx-sw"><input type="checkbox" data-fx="remind" data-v="${esc(b.id)}" ${b.remind !== false ? 'checked' : ''} aria-label="1시간 전 알림"><i></i></label></li><li><i></i><span><b>체크인 ${esc(hm(qa))} – ${esc(hm(qa + 15 + ((f.rules || {}).noShowMin || 15)))}</b><small>입구 키오스크나 프론트에 QR을 대 주세요 · ${(f.rules || {}).noShowMin || 15}분 지나면 자동 취소</small></span></li></ol></section>` : ''}
      <p class="fx-hint">이 QR은 본인만 쓸 수 있어요(공유 불가).${b ? ' 일정 탭의 캘린더에도 들어갔어요.' : ''}</p>${flowBar(`<a class="fx-btn pri big wide" href="#fac/my">내 예약으로 가기</a>`)}`); }

  /* ── 당일 QR(#fac/qr/<번호>) ── */
  let QRL = null; const qrLib = () => QRL || (QRL = new Promise(ok => { if (typeof window.qrcode === 'function') return ok(true); const s = document.createElement('script'); s.src = 'vendor/qrcode.js'; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); }));
  function qrSvg(txt) { try { const q = window.qrcode(0, 'M'); q.addData(txt); q.make(); const n = q.getModuleCount(); let d = ''; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`; return `<svg viewBox="0 0 ${n + 4} ${n + 4}" role="img" aria-label="입장 QR 코드" shape-rendering="crispEdges"><rect width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#212121"/></svg>`; } catch (e) { return ''; } }
  function qrState(id) { const { b, p, r } = findAny(id); const x = b || p || r; if (!x) return null; const f = facOf(x.fac) || { name: '', rules: {} }; const H = CC().dayHours(f, today()); const close = H && !H.closed ? CC().toHM(H.to) : '23:59';
    if (b) { const st = abs(b.day, b.from), en = abs(b.day, b.to), n = absNow(); const pass = b.passId ? mine().ps.find(z => z.id === b.passId) : null;
      const why = b.status === 'requested' ? '승인되면 QR이 열려요' : !ACT.includes(b.status) ? '취소되었거나 끝난 예약이에요' : b.day !== today() ? `이용일(${fmtD(b.day)}) 당일 ${CC().toHM(((st - 15) % 1440 + 1440) % 1440)}부터 열려요` : n < st - 15 ? `${CC().toHM(((st - 15) % 1440 + 1440) % 1440)}부터 열려요` : n > en ? '이용 시간이 끝났어요' : '';
      return { x, f, kind: 'b', on: !why, why, title: `${f.name}${pass ? ' · ' + pass.name : ''}`, until: b.to, left: why ? (n < st - 15 && b.day === today() ? `열리기까지 ${dur(st - 15 - n)}` : '') : `남은 시간 ${dur(en - n)}`, entry: null, pass, no: b.no || b.id }; }
    if (p) { const ent = enteredToday(p); const why = p.status === 'pending' ? '프론트에서 결제하면 열려요' : !passOK(p) ? '사용할 수 없는 이용권이에요' : ent ? '오늘은 이미 이용했어요(1일 1회)' : '';
      return { x, f, kind: 'p', on: !why, why, title: `${f.name} · ${p.name}`, until: close, left: why ? '' : `남은 시간 ${dur(Math.max(0, CC().toMin(close) - nowM()))}`, entry: `${ent ? 1 : 0} / 1회`, pass: p, no: p.no || p.id }; }
    const why = r.status === 'requested' ? '승인되면 수령 QR이 열려요' : ['returned', 'cancelled', 'rejected'].includes(r.status) ? '끝난 대여예요' : '';
    return { x, f, kind: 'r', on: !why, why, title: `${f.name} · ${r.name}`, until: close, left: r.status === 'lent' || r.status === 'overdue' ? `반납 기한 ${fmtD(r.due)}` : '수령할 때 보여 주세요', entry: null, pass: null, no: r.no || r.id }; }
  function token(Q) { if (FX.qr && FX.qr.id === Q.x.id && FX.qr.tok && Date.now() < FX.qr.next) return FX.qr.tok; if (live()) { qrFetch(Q); return FX.qr && FX.qr.id === Q.x.id ? FX.qr.tok : ''; }
    const j = new Uint8Array(8); crypto.getRandomValues(j); const pl = { t: LR.tid, [Q.kind]: Q.x.id, f: Q.x.fac, d: today(), jti: Array.from(j, v => v.toString(16).padStart(2, '0')).join('') };
    const tok = 'v1.' + btoa(unescape(encodeURIComponent(JSON.stringify(pl)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '.demo'; FX.qr = { id: Q.x.id, tok, next: Date.now() + 30000 }; return tok; }
  async function qrFetch(Q) { if (FX.qrBusy) return; FX.qrBusy = true; const body = Q.kind === 'b' ? { booking: Q.x.id } : Q.kind === 'p' ? { passId: Q.x.id } : { rental: Q.x.id };
    try { const r = await fapi('POST', P('qr'), body); FX.qr = { id: Q.x.id, tok: r.token, next: Date.now() + 30000 }; } catch (e) { FX.qr = { id: Q.x.id, tok: '', next: Date.now() + 30000, err: e.message }; }
    FX.qrBusy = false; paintQR(); }
  function qrView(id) { const Q = qrState(id); if (!Q) return page('fx-qr', `${head('입장 QR')}<p class="fx-empty">예약을 찾지 못했어요. <a href="#fac/my">내 예약</a>에서 확인해 주세요.</p>`);
    const pass = Q.kind === 'p' && Q.pass && Q.pass.kind === 'count' ? Q.pass : null;
    return page('fx-qr fx-flow', `${head('입장 QR')}<div class="fx-note t-y">${sv('sun', 20)}<span>화면 밝기를 가장 밝게 올려 주세요. 키오스크가 더 빨리 읽어요.</span></div>
      <div class="fx-card fx-qc"><h2>${esc(Q.title)}</h2><p>${Q.kind === 'b' ? esc(timeOf(Q.x)) : '오늘 ' + esc(fmtD(today()))} · 본인만 쓸 수 있어요</p><div class="fx-qbox${Q.on ? '' : ' off'}" id="fxQr" data-id="${esc(id)}">${Q.on ? '' : `<span>${sv('clock', 28)}<b>${esc(Q.why)}</b></span>`}</div>${Q.on ? `<p class="fx-qt" id="fxQt" aria-live="off">${sv('ref', 16)}<span>새 코드를 만들고 있어요</span></p>` : ''}</div>
      <div class="fx-two fx-st"><div class="fx-card"><small>${Q.kind === 'b' ? '이용 시간' : '입장 가능 시간'}</small><b>${esc(Q.until)}까지</b><em id="fxLeft">${esc(Q.left)}</em></div><div class="fx-card"><small>${Q.entry ? '오늘 입장' : '예약 번호'}</small><b>${esc(Q.entry || Q.no)}</b><em>${Q.entry ? '1일 1회 · 양도 불가' : '본인 이용 원칙'}</em></div></div>
      ${pass ? `<div class="fx-note t-g">${sv('ticket', 20)}<span><b>입장하면 ${esc(pass.name)} 1회가 차감돼요</b><br>${passLeft(pass)}회 → ${Math.max(0, passLeft(pass) - 1)}회${Q.f.kind === 'time' && resOf(Q.f).length > 1 ? ` · ${esc(unitOf(Q.f))}은 입장 때 배정돼요` : ''}</span></div>` : ''}
      <p class="fx-hint c">QR이 안 읽히면 프론트에 예약 번호 ${esc(Q.no)}을 말해 주세요.</p>`); }
  function paintQR() { const box = document.getElementById('fxQr'); if (!box) { clearInterval(FX.qrT); FX.qrT = null; return; } const Q = qrState(box.dataset.id); if (!Q || !Q.on) return;
    const tok = token(Q); const t = document.getElementById('fxQt'); if (FX.qr && FX.qr.err) { box.innerHTML = `<span>${sv('warn', 28)}<b>${esc(FX.qr.err)}</b></span>`; return; }
    if (tok && box.dataset.tok !== tok) { qrLib().then(ok => { if (!ok) { box.innerHTML = `<span><b>QR을 그리지 못했어요. 예약 번호로 체크인해 주세요.</b></span>`; return; } box.innerHTML = qrSvg(tok); box.dataset.tok = tok; }); }
    const s = FX.qr ? Math.max(0, Math.ceil((FX.qr.next - Date.now()) / 1000)) : 30; if (t) t.querySelector('span').textContent = `0:${String(s).padStart(2, '0')} 뒤 새 코드로 바뀌어요(캡처 사용 방지)`;
    const L = document.getElementById('fxLeft'); if (L && Q.left) L.textContent = Q.left; }

  /* ── 내 예약 · 이용권 · 대여(#fac/my) ── */
  function myView() { if (!LR.me) return page('fx-my', head('내 예약') + gate('fac/my')); const M = mine(); const U = upcoming(); const past = M.bk.filter(b => !U.includes(b)).sort((a, b) => (b.day + b.from).localeCompare(a.day + a.from)).slice(0, 10);
    const PS = M.ps.filter(p => !['refunded', 'expired'].includes(p.status)); const RT = M.rt.filter(r => !['returned', 'cancelled', 'rejected'].includes(r.status)); const f = FX.mf;
    const chips = [['all', '전체'], ['bk', `예약 ${U.length}`], ['ps', `이용권 ${PS.length}`], ['rt', `대여 ${RT.length}`]];
    const rowB = b => { const fc = facOf(b.fac) || { name: b.facName || b.fac }; return `<a class="fx-row" href="#fac/bk/${esc(b.id)}">${icBox(fc)}<span class="fx-ct"><b>${esc(fc.name)}</b><small>${esc(timeOf(b))}${b.amount ? ` · ${won(b.amount)}${b.payStatus === 'paid' ? ' 결제' : ''}` : ''}</small></span>${badge(stB(b))}</a>`; };
    const rowP = p => { const fc = facOf(p.fac) || { name: '' }; const left = p.kind === 'count' ? `${passLeft(p)}회 남음` : `${Math.max(0, CC().dayDiff(today(), p.ends) + 1)}일 남음`; const pct = p.kind === 'count' ? passLeft(p) / Math.max(1, +p.total) : Math.max(0, CC().dayDiff(today(), p.ends) + 1) / Math.max(1, CC().dayDiff(p.starts, p.ends) + 1);
      return `<a class="fx-row" href="#fac/ps/${esc(p.id)}">${icBox(fc)}<span class="fx-ct"><b>${esc(p.name)}</b>${p.kind !== 'count' ? `<span class="fx-pb" aria-hidden="true"><i style="width:${Math.round(pct * 100)}%"></i></span>` : ''}<small>${esc(p.kind === 'count' ? `${passLeft(p)}회 남음${p.ends ? ` · ${p.ends.replace(/-/g, '.')}까지` : ''}` : `${p.starts.slice(5).replace('-', '.')} – ${p.ends.slice(5).replace('-', '.')} · 입장 ${+p.used || 0}회`)}</small></span>${p.status === 'pending' ? badge(['y', '현장 결제 대기']) : `<em class="fx-b t-g">${esc(passOK(p) && !enteredToday(p) && p.kind === 'count' ? 'QR' : left)}</em>`}</a>`; };
    const rowR = r => { const fc = facOf(r.fac) || { name: '' }; const lf = CC().lateFee({ dueDay: r.due, returnDay: today(), perDay: +r.lateFeePerDay || 0, cap: +r.deposit || 0 }); const over = ['lent', 'overdue'].includes(r.status) && r.due < today(); const dd = CC().dayDiff(today(), r.due);
      return `<a class="fx-row${over ? ' late' : ''}" href="#fac/rt/${esc(r.id)}">${icBox(fc)}<span class="fx-ct"><b>${esc(r.name)}</b><small>${over ? `기한 ${esc(fmtD(r.due))}${r.lateFeePerDay ? ` · 연체료 하루 ${won(r.lateFeePerDay)}` : ''}` : `반납 기한 ${esc(fmtD(r.due))}`}</small></span>${r.status === 'requested' ? badge(['y', '승인 대기']) : over ? `<em class="fx-b t-rr">연체 ${lf.days}일</em>` : dd <= 3 ? badge(['y', dd ? `D-${dd}` : '오늘 반납']) : badge(['g', r.status === 'approved' ? '수령 대기' : '대여 중'])}</a>`; };
    const sec = (k, t, L, fn, right) => (f === 'all' || f === k) ? `<div class="fx-sh"><h2>${t}</h2>${right || ''}</div><div class="fx-list">${L.map(fn).join('') || `<p class="fx-empty">${k === 'bk' ? '다가오는 예약이 없어요. <a href="#fac">예약하러 가기</a>' : k === 'ps' ? '가진 이용권이 없어요.' : '대여 중인 물품이 없어요.'}</p>`}</div>` : '';
    return page('fx-my', `${head('내 예약', '', `<a class="fx-ib" href="#cal" aria-label="캘린더로 보기">${sv('cal', 22)}</a>`)}<div class="fx-chips" role="tablist" aria-label="보기">${chips.map(([k, l]) => `<button type="button" role="tab" class="fx-chip${f === k ? ' on' : ''}" aria-selected="${f === k}" data-fx="mf" data-v="${k}">${esc(l)}</button>`).join('')}</div>
      ${live() && FX.myBusy && !FX.my ? '<p class="fx-empty" role="status">내 예약을 불러오고 있어요…</p>' : ''}${FX.err ? `<p class="fx-msg">${esc(FX.err)}</p>` : ''}
      ${sec('bk', '다가오는 예약', U, rowB)}${sec('ps', '이용권', PS, rowP)}${sec('rt', '대여', RT, rowR, '<small>반납은 프론트에서 확인해요</small>')}
      ${(f === 'all' || f === 'bk') && past.length ? `<details class="fx-past"><summary>지난 예약 ${past.length}건</summary><div class="fx-list">${past.map(rowB).join('')}</div></details>` : ''}<p class="fx-foot"><a href="#fac">${sv('chev', 16)}새로 예약하기</a></p>`); }

  /* ── 상세 · 취소 · 환불 예상(#fac/bk|ps|rt/<번호>) ── */
  function refundOf(x, kind) { const f = facOf(x.fac) || {}; if (kind === 'bk') { const paid = x.payStatus === 'paid' ? x.amount : 0; const R = f.refund && f.refund.type ? f.refund : { type: 'time', steps: (f.refund && f.refund.steps) || [{ beforeH: 24, rate: 100 }, { rate: 0 }] };
      const r = CC().refund({ rule: R, paid: x.amount, startAt: x.day + 'T' + x.from, now: nowS() }); return paid ? r : { auto: 0, lines: x.amount ? [`아직 결제하지 않은 현장 결제 예약이에요 — 낼 금액(${won(x.amount)})이 없어지고 환불할 금액은 없어요`, `참고: 결제했다면 ${r.lines[0]}`] : ['무료 예약이라 환불할 금액이 없어요'] }; }
    if (kind === 'ps') { const p = prodOf(x.product) || {}; const R = p.refund || { type: x.kind === 'count' ? 'pass-count' : 'pass-period', feeRate: 10 }; const unit = typeof R.unitPrice === 'object' ? +(R.unitPrice[x.aud] || Object.values(R.unitPrice)[0] || 0) : +R.unitPrice || 0;
      if (x.payStatus === 'pending') return { auto: 0, lines: ['아직 결제하지 않은 이용권이에요 — 취소하면 바로 없어져요'] }; return CC().refund({ rule: { ...R, unitPrice: unit }, paid: x.amount, usedCount: +x.used || 0 }); }
    const lf = CC().lateFee({ dueDay: x.due, returnDay: today(), perDay: +x.lateFeePerDay || 0, cap: +x.deposit || 0 }); return CC().refund({ rule: { type: 'rent' }, deposit: +x.deposit || 0, lateFee: x.due < today() ? lf.fee : 0 }); }
  function itemView(kind, id) { const M = mine(); const L = kind === 'bk' ? M.bk : kind === 'ps' ? M.ps : M.rt; const x = L.find(z => z.id === id);
    if (!x) return page('fx-it', `${head('내 예약')}<p class="fx-empty">찾지 못했어요. <a href="#fac/my">내 예약</a>으로 돌아가요.</p>`); const f = facOf(x.fac) || { name: '' }; const cx = FX.cx === id;
    let kv, can = false, canTxt = '', qrOK = false;
    if (kind === 'bk') { kv = [['상태', stB(x)[1]], ['시설', f.name], ['일시', timeOf(x)], ['신청자', [audL(x.aud), x.dept, x.verify === 'pending' ? '구성원 확인 대기' : ''].filter(Boolean).join(' · ')], ['결제', x.pay === 'pass' ? '이용권 사용' : x.amount ? `${won(x.amount)} · ${x.payStatus === 'paid' ? '결제 완료' : '현장 결제(이용 전 프론트)'}` : '무료'], ...(x.extra && x.extra.car ? [['차량번호', `${x.extra.car} · ${x.extra.purge_at}에 지워요`]] : []), ['예약 번호', x.no || x.id]];
      const st = abs(x.day, x.from); can = ACT.includes(x.status) && x.status !== 'checked_in' && absNow() < st; canTxt = can ? '' : ACT.includes(x.status) ? '시작한 뒤에는 취소할 수 없어요. 프론트에 문의해 주세요.' : ''; qrOK = ACT.includes(x.status) && x.day === today(); }
    else if (kind === 'ps') { kv = [['이용권', x.name], ['기간', `${fmtD(x.starts)} – ${fmtD(x.ends)}`], ['남은', x.kind === 'count' ? `${passLeft(x)}회 / ${x.total}회` : `${Math.max(0, CC().dayDiff(today(), x.ends) + 1)}일 · 입장 ${+x.used || 0}회`], ['결제', x.payStatus === 'pending' ? `${won(x.amount)} · 현장 결제 대기` : won(x.amount)], ['규칙', '1일 1회 입장 · 양도 불가 · 휴관일도 기간에 포함'], ['번호', x.no || x.id]]; can = ['active', 'pending'].includes(x.status); qrOK = passOK(x); }
    else { const lf = CC().lateFee({ dueDay: x.due, returnDay: today(), perDay: +x.lateFeePerDay || 0, cap: +x.deposit || 0 }); const over = x.due < today() && ['lent', 'overdue'].includes(x.status);
      kv = [['물품', x.name], ['상태', x.status === 'requested' ? '승인 대기' : x.status === 'approved' ? '수령 대기' : over ? `연체 ${lf.days}일` : '대여 중'], ['기간', `${fmtD(x.from)} – ${fmtD(x.due)}`], ['반납 기한', `${fmtD(x.due)}${over ? ` · ${lf.days}일 지남` : ` · ${CC().dayDiff(today(), x.due) ? 'D-' + CC().dayDiff(today(), x.due) : '오늘'}`}`], ...(over && x.lateFeePerDay ? [['연체료', `${won(lf.fee)}(하루 ${won(x.lateFeePerDay)}, 보증금 한도)`]] : []), ['보증금', x.deposit ? won(x.deposit) : '없음'], ['번호', x.no || x.id]];
      can = ['requested', 'approved'].includes(x.status); canTxt = can ? '' : '수령한 뒤에는 취소 대신 반납해 주세요. 반납은 프론트에서 확인해요.'; qrOK = !['returned', 'cancelled', 'rejected'].includes(x.status); }
    const R = refundOf(x, kind); const ttl = kind === 'bk' ? '예약 상세' : kind === 'ps' ? '이용권 상세' : '대여 상세';
    const cxPanel = cx ? `<section class="fx-card fx-cx" aria-label="${kind === 'ps' ? '환불 신청' : '취소'}"><h3>${kind === 'ps' ? '환불 예상액' : '취소하면 환불 예상액'}</h3><ul>${R.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul><div class="fx-tot"><span>예상 환불액</span><b>${won(R.auto)}</b></div><p class="fx-hint">${kind === 'ps' && x.payStatus !== 'pending' ? '환불은 운영자 승인 후 처리되고 입금까지 영업일 기준 3~5일 걸려요.' : '실제 금액은 운영자가 확인해 확정해요. 입금까지 영업일 기준 3~5일 걸려요.'}</p>
      <label class="fx-fl"><span>사유(선택)</span><select name="why" id="fxWhy"><option value="">고르지 않음</option><option>일정이 바뀌었어요</option><option>다른 시간으로 다시 예약할게요</option>${kind === 'ps' ? '<option>부상 · 입원 · 전출(증빙은 프론트에)</option>' : ''}<option>기타</option></select></label>
      <div class="fx-two"><button type="button" class="fx-btn" data-fx="cx-x">그대로 둘게요</button><button type="button" class="fx-btn warn" data-fx="cx-go" data-k="${kind}" data-v="${esc(id)}">${kind === 'ps' && x.payStatus !== 'pending' ? '환불 신청하기' : '취소하기'}</button></div></section>` : '';
    return page('fx-it', `${head(ttl)}<div class="fx-card fx-sum">${icBox(f)}<span class="fx-ct"><b>${esc(kind === 'bk' ? f.name : x.name)}</b><small>${esc(kind === 'bk' ? timeOf(x) : f.name)}</small></span>${kind === 'bk' ? badge(stB(x)) : ''}</div>
      <dl class="fx-kv">${kv.map(([a, v]) => `<div><dt>${esc(a)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="fx-two">${qrOK ? `<a class="fx-btn pri" href="#fac/qr/${esc(id)}">${sv('qr', 18)}${kind === 'rt' ? '수령 · 반납 QR' : '입장 QR'}</a>` : ''}${kind === 'bk' && ACT.includes(x.status) ? `<button type="button" class="fx-btn" data-fx="ics" data-v="${esc(id)}">${sv('cal', 18)}캘린더에 추가</button>` : ''}</div>
      ${can && !cx ? `<button type="button" class="fx-btn wide" data-fx="cx" data-v="${esc(id)}">${kind === 'ps' ? '환불 예상액 보기' : '예약 취소 · 환불 예상액'}</button>` : ''}${canTxt ? `<p class="fx-hint">${esc(canTxt)}</p>` : ''}${cxPanel}
      ${x.status === 'done' && kind === 'bk' ? `<a class="fx-btn wide" href="#fac/${esc(x.fac)}">다음에도 예약</a>` : ''}`); }

  /* ── 신청 처리 ── */
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const noOf = d => { const s = store(); s.seq++; return `F-${(d || today()).slice(5).replace('-', '')}-${String(s.seq).padStart(4, '0')}`; };
  function readForm(fm) { const k = fm.dataset.fac + '|' + fm.dataset.p; const F = FX.f[k]; if (!F) return null; const v = n => fm.elements[n]; const g = n => v(n) ? String(v(n).value || '').trim() : null;
    const aud = (fm.querySelector('[name=aud]:checked') || {}).value; if (aud) F.aud = aud; ['sid', 'dept', 'car', 'purpose', 'start'].forEach(n => { const x = g(n); if (x != null) F[n] = x.replace(/[<>]/g, ''); });
    if (v('n')) F.n = +v('n').value || 1; if (v('units')) F.units = +v('units').value || 1; if (v('carOn')) F.carOn = v('carOn').checked; if (v('consent')) F.consent = v('consent').checked; if (v('agree')) F.agree = v('agree').checked;
    const m = fm.querySelector('[name=method]:checked'); if (m) F.method = m.value; return F; }
  async function submit(fm) { const F = readForm(fm); const f = facOf(fm.dataset.fac); const p = fm.dataset.p ? prodOf(fm.dataset.p) : null; if (!F || !f || !LR.me) return;
    const err = m => { FX.err2 = m; const e = document.getElementById('fxErr'); if (e) { e.textContent = m; e.scrollIntoView({ block: 'center' }); } };
    if (univ() && F.aud === 'student') { if (!/^\d{4,12}$/.test(F.sid)) return err('학번을 숫자로 입력해 주세요.'); if (!F.dept) return err('학과를 입력해 주세요.'); }
    if (univ() && F.aud === 'staff' && !F.dept) return err('소속을 입력해 주세요.');
    if (f.approval && !F.purpose) return err('사용 목적을 한 줄로 적어 주세요. 승인 판단에 써요.');
    const ex = (f.extra || []).filter(x => x && x.key && x.purpose && +x.keepDays > 0)[0];
    if (ex && F.carOn) { if (!/^[0-9가-힣 ]{5,12}$/.test(F.car)) return err(`${ex.label || '차량번호'}를 확인해 주세요(예: 12가 3456).`); if (!F.consent) return err('선택 항목을 저장하려면 목적 · 보관 기간에 동의해 주세요.'); }
    if (!F.agree) return err('환불 규정과 이용 수칙을 확인했다고 체크해 주세요.');
    const extra = ex && F.carOn && F.consent ? { [ex.key]: F.car, purpose: ex.purpose, keepDays: +ex.keepDays } : null;
    const btn = fm.querySelector('button[type=submit]'); if (btn) btn.disabled = true; FX.err2 = '';
    try { const id = p ? await buyProd(f, p, F, extra) : await bookTime(f, F, extra); if (!id) { if (btn) btn.disabled = false; return; } FX.f[fm.dataset.fac + '|' + fm.dataset.p] = null; location.hash = '#fac/done/' + encodeURIComponent(id); }
    catch (e) { if (btn) btn.disabled = false; err(e.fx || e.message || '신청하지 못했어요. 잠시 후 다시 시도해 주세요.'); } }
  const fxErr = m => Object.assign(new Error(m), { fx: m });
  async function bookTime(f, F, extra) { const sel = FX.sel; if (!sel || sel.fac !== f.id) throw fxErr('시간 칸을 다시 골라 주세요.'); const A = avail(f, sel.day); const S = A.slots.filter(s => s.slot >= sel.s0 && s.slot < sel.s0 + sel.n);
    if (S.some(s => s.mine || s.dup)) throw fxErr('같은 시간에 예약이 있어요. 다른 시간을 골라 주세요.'); if (S.length !== sel.n || S.some(s => !s.ok)) { FX.sel = null; throw fxErr('방금 마감됐어요. 다른 시간을 골라 주세요.'); }
    if (usedDay(f, sel.day) + sel.n > maxOf(f)) throw fxErr(`이날은 한 사람이 최대 ${maxOf(f)}칸까지 예약할 수 있어요.`);
    const q = CC().quote({ fac: f, aud: F.aud, slots: sel.n, day: sel.day, sm: S[0].sm }); const pass = F.method === 'pass' ? mine().ps.find(x => x.fac === f.id && passOK(x)) : null;
    if (live()) { try { const r = await fapi('POST', P('book'), { fac: f.id, day: sel.day, slot: sel.s0, slots: sel.n, aud: F.aud, passId: pass ? pass.id : undefined, payMode: { online: 'online', onsite: 'onsite', free: 'free' }[F.method], amount: pass ? undefined : q.final, memberNo: univ() && F.aud !== 'public' ? (F.sid || sidMe()) : undefined, note: [F.purpose, F.dept && univ() ? F.dept : '', F.n > 1 ? F.n + '명' : ''].filter(Boolean).join(' · ') || undefined, extra: extra ? { [Object.keys(extra)[0]]: extra[Object.keys(extra)[0]] } : undefined, consent: { extra: !!extra }, idem: FX.idem || (FX.idem = uid('i')) });
        FX.idem = '';
        FX.av = {}; FX.sel = null; await loadMy(true); if (FX.my && !FX.my.bk.some(z => z.id === r.booking.id)) FX.my.bk.push(normB({ ...r.booking, fac: f.id, day: sel.day, slot: sel.s0, slots: sel.n, aud: F.aud, pay: F.method, passId: pass ? pass.id : '' })); if (r.next === 'pay' && F.method === 'online') toast('온라인 결제 창은 결제 연결 후 열려요. 지금은 현장 결제로 처리돼요.', 'warn'); return r.booking.id; }
      catch (e) { throw liveErr(e, f); } }
    const R = resOf(f), per = perOf(f), all = occ(f).filter(b => b.day === sel.day); const res = R.find(r => S.every(s => all.filter(b => (b.res || R[0].id) === r.id && b.sm < s.em && s.sm < b.em).reduce((a, b) => a + Math.max(1, +b.n || 1), 0) < per));
    if (!res) throw fxErr('방금 마감됐어요. 다른 시간을 골라 주세요.');
    const st = store(); const ex = extra ? { ...extra, purge_at: CC().addDays(sel.day, extra.keepDays) } : null; const m = F.method;
    const b = { id: uid('bk_'), no: noOf(sel.day), fac: f.id, res: res.id, sid: sidMe(), day: sel.day, slot: sel.s0, slots: sel.n, sm: S[0].sm, em: S[S.length - 1].em, from: S[0].from, to: S[S.length - 1].to, excl: exclOf(f), aud: F.aud, dept: univ() ? F.dept : '', n: F.n,
      status: m === 'approve' ? 'requested' : 'confirmed', pay: m, payStatus: m === 'online' ? 'paid' : m === 'onsite' && q.final ? 'pending' : 'none', amount: m === 'pass' ? 0 : q.final, lines: q.lines, passId: pass ? pass.id : '', purpose: F.purpose || '', extra: ex, verify: univ() && F.aud !== 'public' ? 'pending' : '', remind: true, created: new Date().toISOString() };
    if (pass && pass.kind === 'count') pass.used = (+pass.used || 0) + 1; /* 서버와 같이 이용권 예약은 예약할 때 1회 차감(취소하면 되돌림) */
    st.bk.push(b); if (st.bk.length > 300) st.bk.splice(0, st.bk.length - 300); if (!persist()) return null; FX.sel = null; if (m === 'online') toast('체험판이라 실제 결제는 하지 않았어요.', 'ok'); return b.id; }
  /* 서버 오류 → 이용자 안내(덧붙인 값 활용) */
  function liveErr(e, f) { const c = e.code, x = e.extra || {}; FX.idem = c === 'idem' ? '' : FX.idem; if (['taken', 'dup_same', 'not_open', 'closed', 'onsite_only', 'amount'].includes(c)) FX.idem = '';
    if (c === 'dup_same') return fxErr('같은 시간에 예약이 있어요. 한 사람이 같은 시간에 두 곳을 잡을 수 없어요.');
    if (c === 'taken') { FX.av = {}; const alt = (x.alt || []).map(id => (resOf(f).find(r => r.id === id) || {}).name || id).slice(0, 3); return fxErr(alt.length ? `방금 다른 분이 예약했어요. 같은 시간에 ${alt.join(', ')}이(가) 비어 있어요 — 시간 칸을 다시 골라 주세요.` : '방금 마감됐어요. 다른 시간을 골라 주세요.'); }
    if (c === 'not_open') return fxErr(x.opensAt ? `${fmtD(String(x.opensAt).slice(0, 10))} ${String(x.opensAt).slice(11, 16)}에 열려요.` : '아직 예약이 열리지 않았어요.');
    if (c === 'onsite_only') { FX.onsiteOnly = true; FX.f = {}; rer(); return fxErr('지금은 현장 결제만 가능해요. 결제 방법을 현장 결제로 바꿨어요.'); }
    if (c === 'suspended') return fxErr(x.until ? `노쇼가 쌓여 ${fmtD(x.until)}까지 예약할 수 없어요.` : e.message);
    if (c === 'verify') return fxErr(e.message || '구성원 확인이 안 됐어요. 학번을 다시 입력하거나 일반 요금으로 신청해 주세요.');
    if (c === 'amount') { FX.av = {}; return fxErr(`요금이 바뀌었어요${x.expected != null ? `(${won(x.expected)})` : ''}. 화면을 새로 고쳐 다시 확인해 주세요.`); }
    return fxErr(e.message || '신청하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  async function buyProd(f, p, F, extra) { const units = Math.max(1, +F.units || 1); const q = CC().quote({ fac: f, product: p, aud: F.aud, units }); const start = /^\d{4}-\d{2}-\d{2}$/.test(F.start) && F.start >= today() ? F.start : today(); const m = F.method;
    if (live()) { const pm = { online: 'online', onsite: 'onsite', free: 'free' }[m]; const mem = univ() && F.aud !== 'public' ? (F.sid || sidMe()) : undefined; const idem = FX.idem || (FX.idem = uid('i'));
      try { const r = p.type === 'rent' ? await fapi('POST', P('rent'), { fac: f.id, productId: p.id, from: start, aud: F.aud, payMode: pm, memberNo: mem, idem }) : await fapi('POST', P('buy'), { productId: p.id, aud: F.aud, payMode: pm, memberNo: mem, idem }); FX.idem = ''; await loadMy(true); const id = (r.pass || r.rental || {}).id; if (id && FX.my) { if (r.pass && !FX.my.ps.some(z => z.id === id)) FX.my.ps.push(normP({ ...r.pass, fac: f.id })); if (r.rental && !FX.my.rt.some(z => z.id === id)) FX.my.rt.push(normR({ ...r.rental, fac: f.id, productId: p.id, fromDay: start })); } return id; }
      catch (e) { throw liveErr(e, f); } }
    const st = store();
    if (p.type === 'rent') { if (st.rt.some(r => r.product === p.id && ['requested', 'approved', 'lent', 'overdue'].includes(r.status)) && !(f.rules || {}).multi) throw fxErr('같은 종류는 한 번에 하나만 빌릴 수 있어요.'); if (st.rt.some(r => r.due < today() && ['lent', 'overdue'].includes(r.status))) throw fxErr('반납이 늦어진 물품이 있어요. 반납한 뒤에 새로 신청할 수 있어요.');
      const due = p.per === 'month' ? CC().addDays(start, 30 * units - 1) : CC().addDays(start, units); const r = { id: uid('rt_'), no: noOf(start), fac: f.id, product: p.id, name: p.name, sid: sidMe(), aud: F.aud, from: start, due, deposit: +p.deposit || 0, lateFeePerDay: +p.lateFeePerDay || 0, amount: q.final, pay: m, payStatus: m === 'online' ? 'paid' : q.final && m === 'onsite' ? 'pending' : 'none', status: f.approval || m === 'approve' ? 'requested' : 'approved', extra, created: new Date().toISOString() };
      st.rt.push(r); return persist() ? r.id : null; }
    if (st.ps.some(x => x.product === p.id && passOK(x))) throw fxErr('같은 이용권이 아직 남아 있어요. 끝나는 날 다음 날부터 이어서 쓰려면 프론트에 연장을 요청해 주세요.');
    const kind = p.type === 'pass-count' ? 'count' : p.type === 'pass-course' ? 'course' : 'period'; const ends = kind === 'count' ? CC().addDays(start, (+p.expireDays || 365) - 1) : CC().addDays(start, (+p.days || 30) - 1);
    const x = { id: uid('ps_'), no: noOf(start), fac: f.id, product: p.id, name: p.name, sid: sidMe(), aud: F.aud, kind, total: kind === 'count' ? +p.count || 1 : 0, used: 0, starts: start, ends, amount: q.final, pay: m, payStatus: m === 'online' ? 'paid' : q.final && m === 'onsite' ? 'pending' : 'none', status: q.final && m === 'onsite' ? 'pending' : m === 'approve' ? 'requested' : 'active', created: new Date().toISOString() };
    st.ps.push(x); return persist() ? x.id : null; }
  async function cancel(kind, id) { const why = (document.getElementById('fxWhy') || {}).value || ''; const M = mine(); const L = kind === 'bk' ? M.bk : kind === 'ps' ? M.ps : M.rt; const x = L.find(z => z.id === id); if (!x) return; const R = refundOf(x, kind);
    if (live()) { try { if (kind !== 'bk') { toast('이용권 환불 · 대여 취소는 프론트에서 접수해요. 예상액은 화면 계산과 같아요.', 'warn'); FX.cx = null; return rer(); } const r = await fapi('POST', P('cancel'), { booking: id, reason: why }); FX.cx = null; await loadMy(true); toast(`취소했어요. 환불 예상액은 ${won((r.refund || R).auto)}이에요.`, 'ok'); } catch (e) { toast(e.message || '취소하지 못했어요. 프론트에 문의해 주세요.', 'bad'); } return; }
    if (kind === 'ps' && x.payStatus !== 'pending') { x.status = 'refund_req'; } else x.status = 'cancelled'; x.cancelReason = why; if (kind === 'bk' && x.passId) { const ps = store().ps.find(z => z.id === x.passId); if (ps && ps.kind === 'count' && ps.used > 0) ps.used--; } x.refund = { auto: R.auto, lines: R.lines, at: new Date().toISOString() }; if (x.extra) x.extra = null; /* 취소하면 선택 수집 항목은 바로 지운다 */
    persist(); FX.cx = null; rer(); toast(kind === 'ps' && x.status === 'refund_req' ? `환불을 신청했어요. 예상액 ${won(R.auto)} · 운영자 승인 후 처리돼요.` : `취소했어요.${R.auto ? ` 환불 예상액 ${won(R.auto)}이에요.` : ''}`, 'ok'); }
  /* .ics 한 건(캘린더 앱으로) — 학습 캘린더(lcal)에는 자동으로 들어간다 */
  function icsOne(b) { const f = facOf(b.fac) || { name: '' }; const z = (d, hm) => { const t = new Date(Date.parse(d + 'T' + hm + ':00+09:00')); return t.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); }; const tx = v => String(v || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//didisam//fac//KO', 'BEGIN:VEVENT', `UID:${b.id}@didisam-fac`, `DTSTAMP:${z(today(), kst().slice(11, 16))}`, `DTSTART:${z(b.day, b.from)}`, `DTEND:${z(b.day, b.to)}`, `SUMMARY:${tx('예약 · ' + f.name)}`, `LOCATION:${tx(f.place || '')}`, `DESCRIPTION:${tx(`예약 번호 ${b.no || b.id} · 시작 15분 전부터 입장 QR`)}`, 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${tx(f.name)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'); }
  /* 학습 캘린더(lcal.js)에 예약 일정 넣기 */
  (window.LCAL_SRC = window.LCAL_SRC || []).push(() => { if (!cfg() || !LR.me) return []; return activeB().map(b => { const f = facOf(b.fac) || { name: '' }; return { id: 'f:' + b.id, date: b.day, time: b.from, end: b.to, k: '예약', title: `예약 · ${f.name}`, place: f.place || '', note: b.status === 'requested' ? '승인 대기' : `예약 번호 ${b.no || b.id}`, src: 'fac', href: '#fac/bk/' + encodeURIComponent(b.id), hrefL: '예약 상세 보기' }; }); });

  /* ── 라우팅 ── */
  { const base = viewPage; viewPage = (id, ...a) => { if (id !== 'fac') return base(id, ...a); if (!cfg()) return page('fx-off', `${head('시설 예약')}<p class="fx-empty">이 기관은 아직 시설 예약을 쓰지 않아요.</p>`);
      if (!CC()) return page('fx-off', '<p class="fx-empty">예약 화면을 불러오지 못했어요. 새로 고침해 주세요.</p>');
      const seg = decodeURIComponent(location.hash.slice(1)).split(/[?#]/)[0].split('/').slice(1); const [b, c, d] = seg;
      try { if (!b) return homeView(); if (b === 'my') return myView(); if (b === 'qr') return qrView(c); if (b === 'done') return doneView(c); if (['bk', 'ps', 'rt'].includes(b)) return itemView(b, c);
        const f = facOf(b); if (!f) return page('fx-off', `${head('시설 예약')}<p class="fx-empty">시설을 찾지 못했어요. <a href="#fac">예약 홈</a>으로 가요.</p>`);
        if (c === 'pay') return payView(f, null); if (c === 'buy') { const p = prodOf(d); return p && p.fac === f.id ? payView(f, p) : prodView(f); } return detailView(f); }
      catch (e) { console.error('lfac', e); return page('fx-off', '<p class="fx-empty">예약 화면을 그리지 못했어요. 새로 고침해 주세요.</p>'); } }; }
  /* 웹 머리 메뉴 「예약」(lcal과 같은 방식) */
  { const base = shell; shell = (inner, cur, ...a) => { let h = base(inner, cur, ...a); try { if (cfg() && !/href="#fac"/.test(h.split('</header>')[0])) { const on = route().a === 'fac'; const lk = `<a href="#fac" class="${on ? 'on' : ''}"${on ? ' aria-current="page"' : ''}>시설 예약</a>`; const i = h.indexOf('<nav class="ln"'); if (i >= 0) { const j = h.indexOf('</nav>', i); if (j > 0) h = h.slice(0, j) + lk + h.slice(j); } } } catch (e) { console.error('lfac shell', e); } return h; }; }

  /* ── 가장 바깥 꾸미기: 앱 홈 칩 · 오늘 예약 카드 · 하단 탭 · 일정 탭 내 예약 ── */
  function todayCard() { if (!LR.me) return ''; const t = today(); const b = upcoming().find(x => x.day === t && x.status !== 'requested'); const p = !b ? mine().ps.find(x => passOK(x) && !enteredToday(x)) : null; if (!b && !p) return '';
    const f = facOf((b || p).fac) || { name: '' }; const qa = b ? abs(b.day, b.from) - 15 : 0; const on = b ? absNow() >= qa : true;
    return `<section class="fx-today" aria-label="오늘 예약"><span class="fx-tt">${icBox(f)}<span><small>${b ? '오늘 예약' : '오늘 입장 가능'}</small><b>${esc(b ? f.name : p.name)}</b><small>${esc(b ? `${b.from}–${b.to}${on ? ' · 지금 체크인할 수 있어요' : ` · ${CC().toHM(((qa % 1440) + 1440) % 1440)}부터 QR`}` : `${f.name} · 1일 1회 입장`)}</small></span></span><a class="fx-btn pri big" href="#fac/qr/${esc((b || p).id)}">${sv('qr', 20)}QR 열기</a></section>`; }
  function post() { if (!SITE() || !SITE().org) return; const B = document.body; const a = route().a; const on = !!cfg(); B.classList.toggle('fx-flowon', on && a === 'fac' && !!document.querySelector('#lm .fx-flow'));
    if (!on) return; const lm = document.getElementById('lm'); if (!lm) return;
    if (a === 'home' && B.classList.contains('tube')) { const ch = lm.querySelector('.tb-chips'); if (ch && !ch.querySelector('.fx-chip-go')) ch.insertAdjacentHTML('beforeend', `<a class="tb-chip fx-chip-go" href="#fac">예약</a>`);
      const mn = lm.querySelector('.tb-main'); const tc = todayCard(); if (mn && tc && !mn.querySelector('.fx-today') && (!window.TUBE || window.TUBE.f === 'all')) mn.insertAdjacentHTML('afterbegin', tc); }
    if (a === 'fac' && B.classList.contains('lapp')) { const b = route().b; const tab = ['my', 'bk', 'ps', 'rt'].includes(b) ? 'cal' : 'home'; const nav = document.querySelector('#lapp .ap-nav'); if (nav) nav.querySelectorAll(':scope > a').forEach(x => { const o = x.classList.contains('tb-n-' + tab); x.classList.toggle('on', o); if (o) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); }
    if (a === 'cal' && LR.me && !lm.querySelector('.fx-calc')) { const U = upcoming(); const M = mine(); const n = M.ps.filter(passOK).length, r = M.rt.filter(x => ['approved', 'lent', 'overdue'].includes(x.status)).length; const nx = U[0];
      const h = `<a class="fx-card fx-calc" href="#fac/my">${sv('cal', 22)}<span class="fx-ct"><b>내 예약</b><small>${esc([`예정 ${U.length}건`, n ? `이용권 ${n}` : '', r ? `대여 ${r}` : '', nx ? `다음 ${fmtD(nx.day)} ${nx.from} ${(facOf(nx.fac) || {}).name || ''}` : ''].filter(Boolean).join(' · '))}</small></span>${sv('chev', 18)}</a>`;
      const anc = lm.querySelector('.lq-top'); if (anc) anc.insertAdjacentHTML('beforebegin', h); else lm.insertAdjacentHTML('afterbegin', h); }
    if (a === 'fac') { document.title = `${SITE().org.name} · 시설 예약`; if (route().b === 'qr') { paintQR(); if (!FX.qrT) FX.qrT = setInterval(paintQR, 1000); } } }
  const late = () => { if (FX.late) return; FX.late = 1; const base = lrender; lrender = (...x) => { const r = base(...x); try { post(); } catch (e) { console.error('lfac post', e); } return r; }; try { if (document.getElementById('lm')) post(); } catch (e) { } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late); else setTimeout(late, 0);

  /* ── 이벤트 ── */
  function pickSlot(f, i) { const d = FX.day[f.id]; const A = avail(f, d); const s = A.slots.find(x => x.slot === i); if (!s) return; const msg = m => { FX.msg = m; rer(); };
    if (s.mine) return msg('이 시간은 이미 내 예약이에요. 내 예약에서 확인할 수 있어요.'); if (s.dup) return msg('같은 시간에 예약이 있어요. 한 사람이 같은 시간에 두 곳을 잡을 수 없어요.'); if (s.past) return msg('이미 지난 시간이에요.'); if (!s.ok) return msg('마감된 시간이에요. 다른 시간을 골라 주세요.');
    let S = FX.sel && FX.sel.fac === f.id && FX.sel.day === d ? { ...FX.sel } : null; const room = maxOf(f) - usedDay(f, d);
    if (room <= 0) return msg(`이날은 한 사람이 최대 ${maxOf(f)}칸까지 예약할 수 있어요.`);
    if (S && i === S.s0 + S.n && S.n < room) S.n++; else if (S && i === S.s0 - 1 && S.n < room) { S.s0--; S.n++; } else if (S && i === S.s0 && S.n > 1) { S.s0++; S.n--; } else if (S && i === S.s0 + S.n - 1 && S.n > 1) S.n--; else if (S && S.n === 1 && i === S.s0) S = null;
    else { if (S && (i === S.s0 + S.n || i === S.s0 - 1)) FX.msg = `한 번에 최대 ${room}칸까지 고를 수 있어요.`; S = { fac: f.id, day: d, s0: i, n: 1 }; }
    FX.sel = S; rer(); }
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-fx]'); if (!el || !cfg()) return; const k = el.dataset.fx; if (k === 'remind') return; e.preventDefault(); const f = facOf(route().b);
    if (k === 'cat') { FX.cat = el.dataset.v; return rer(); }
    if (k === 'mf') { FX.mf = el.dataset.v; return rer(); }
    if (k === 'day' && f) { FX.day[f.id] = el.dataset.v; if (FX.sel && FX.sel.day !== el.dataset.v) FX.sel = null; return rer(); }
    if (k === 'slot' && f) return pickSlot(f, +el.dataset.v);
    if (k === 'next' && f) { if (!FX.sel) return; if (!LR.me) { location.hash = '#login/fac/' + f.id; return; } location.hash = `#fac/${encodeURIComponent(f.id)}/pay`; return; }
    if (k === 'cx') { FX.cx = el.dataset.v; rer(); setTimeout(() => { const x = document.querySelector('.fx-cx'); x && x.scrollIntoView({ block: 'center' }); }, 30); return; }
    if (k === 'cx-x') { FX.cx = null; return rer(); }
    if (k === 'cx-go') return cancel(el.dataset.k, el.dataset.v);
    if (k === 'ics') { const b = mine().bk.find(x => x.id === el.dataset.v); if (!b) return; try { const bl = new Blob([icsOne(b)], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `didisam-booking-${b.day}.ics`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('일정 파일을 받았어요. 캘린더 앱에서 열어 주세요. 일정 탭에도 들어가 있어요.', 'ok'); } catch (x) { toast('파일을 만들지 못했어요.', 'bad'); } return; } });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.fx === 'remind') { const b = mine().bk.find(x => x.id === t.dataset.v); if (b && !live()) { b.remind = t.checked; persist(); } toast(t.checked ? '1시간 전에 알려 드릴게요.' : '1시간 전 알림을 껐어요.', 'ok'); return; }
    const fm = t.form; if (!fm || fm.id !== 'fxPay') return; readForm(fm); FX.err2 = ''; const er = document.getElementById('fxErr'); if (er) er.textContent = ''; if (['aud', 'method', 'carOn', 'units', 'n', 'start'].includes(t.name)) rer(); });
  document.addEventListener('input', e => { const fm = e.target.form; if (fm && fm.id === 'fxPay') readForm(fm); });
  document.addEventListener('submit', e => { if (!e.target || e.target.id !== 'fxPay') return; e.preventDefault(); submit(e.target); });
  addEventListener('hashchange', () => { if (!/^#fac\/qr\//.test(location.hash)) { clearInterval(FX.qrT); FX.qrT = null; } if (!/^#fac\/(bk|ps|rt)\//.test(location.hash)) FX.cx = null; FX.err2 = ''; });
})();
