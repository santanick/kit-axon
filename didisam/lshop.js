/* v22 lshop — 학습자 화면: 클래스 목록 · 상세 · 수강 신청 · 결제 · 결제/환불 내역 · 구독 관리 · 청구서 납부 · 교재/교구 구매 · 전자책 다운로드 · 배송지
   데이터: 공개 판매 정보 = 게시본 LR.site.shop(운영자 sales2.js가 lsSnapshot 감싸기로 넣음, 데모는 데이터룸 게시본을 매번 새로 읽음)
           내 결제 · 청구서 · 수강 권한 = 데모는 데이터룸 문서에서 내 것만 골라 읽고(운영: GET /api/pub/<tid>/me/shop), 아직 운영자에게 반영되지 않은 내 요청(lpx 큐)을 겹쳐 보여 준다.
   학습자 동작은 lpxPush(type, data)로 운영자 큐에 남긴다(운영: PG 승인 결과 서버 검증 후 기록). */
'use strict';
(() => {
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }; /* v22 현지 날짜(자정~09시 KST에 전날로 찍히던 문제) */
  const addD = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return ymdL(t); };
  const addM = (d, n) => { const t = new Date(d); t.setMonth(t.getMonth() + n); return ymdL(t); };
  const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
  const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const KIND = { period: '기간', episode: '회차', sub: '구독', pack: '과정' };
  const SUBN = { 요일반: '요일반', 특강반: '특강반', '회차 차감반': '회차 차감반' };
  const MY = ['shop', 'class', 'pay', 'payok', 'payd', 'mypay', 'bill', 'textbooks', 'tb', 'mybooks'];

  /* ── 데이터 ── */
  const roomDoc = () => { if (!['demo', 'preview'].includes(LR.mode) || !LR.tid || LR.tid === 'sample') return null; try { return JSON.parse(localStorage.getItem('didisam.room.' + LR.tid) || 'null'); } catch (e) { return null; } };
  const SHOP = () => { const d = LR.mode === 'preview' && LR.site && LR.site.shop ? null : roomDoc(); /* 운영자 미리보기는 어드민 초안(lsSnapshot)의 판매 정보를 쓴다 */ return (d && d.lsite && d.lsite.pub && d.lsite.pub.shop) || (LR.site && LR.site.shop) || null; };
  const meKeys = () => LR.me ? [LR.me.sid, LR.me.id, LR.me.pid, LR.me.email, ...(typeof laPacct === 'function' && LR.me.kind === 'parent' ? [(laPacct() || {}).id] : [])].filter(Boolean).map(String) : []; /* v32.8 보호자는 가족 연결 id로도 찾는다(QA U8) */
  const meM = doc => { const K = meKeys(); if (!K.length || !doc) return null; return (doc.members || []).find(m => [m.id, m.sid, m.email, m.extra && m.extra.학번, m.acct && m.acct.email].some(v => v && K.includes(String(v)))) || null; };
  const qAll = () => { try { return JSON.parse(localStorage.getItem('didisam.room.' + LR.tid + '.lpx') || '[]'); } catch (e) { return []; } };
  const priceOf = x => { if (!x) return 0; let p = +x.price || 0; const d = x.discount; if (d && d.on && (!d.until || today() <= d.until)) p -= d.type === 'amount' ? (+d.v || 0) : Math.round(p * (+d.v || 0) / 100); const e = x.recruit && x.recruit.early; if (e && e.on && (!e.until || today() <= e.until)) p -= Math.round(p * (+e.rate || 0) / 100); return Math.max(0, Math.round(p)); };
  /* v43 K2(P3-F02): 체험판 지난 결제 기록은 화면에서 끼워 넣지 않고 체험 데이터(learner-demo-*.json demo.pays)에서 읽는다.
     샘플 사이트(LR.tid 'sample')에서 이 기기 요청함이 비었을 때만 — 수강 권한(grant)은 바꾸지 않는다. 운영 · 게시된 방은 그대로 */
  function seedPays(R, shop) { if (LR.mode !== 'demo' || LR.tid !== 'sample' || !LR.me || R.pays.length) return; const S = (SITE().demo || {}).pays; if (!Array.isArray(S) || !S.length) return;
    const it = x => x.itemType === 'book' ? (shop.books || []).find(b => b.id === x.ref) : (shop.classes || []).find(c => c.id === x.ref);
    R.pays = S.map(x => { const i = it(x); if (!i) return null; const amt = x.amount != null ? +x.amount : (priceOf(i) || +i.price || 0); return { id: x.id, at: x.at, item: i.name, itemType: x.itemType, ref: i.id, amount: amt, method: x.method, status: x.status, refund: x.refund ? { amount: amt, ...x.refund } : null, demo: true }; }).filter(Boolean); }
  function mine() {
    const doc = roomDoc(); const m = meM(doc); const id = m && m.id; const shop = SHOP() || { classes: [], books: [] };
    const R = { m, pays: [], bills: [], subs: [], enr: {}, books: {}, ship: {}, ap: {} };
    if (doc && id) (doc.classes || []).forEach(c => (c.applies || []).forEach(a => { if (a.id === id) R.ap[c.id] = a.st || 'req'; })); /* v43 K2: 추첨 · 승인 신청(운영자 c.applies) */
    if (LR.mode === 'live' && LR.mine && LR.mine.ap) Object.assign(R.ap, LR.mine.ap);
    if (doc && id) {
      R.pays = (doc.pays || []).filter(p => p.who === id).map(p => ({ ...p, refund: p.refund ? { ...p.refund } : null }));
      R.bills = (doc.bills || []).filter(b => b.who === id || (b.to || []).some(t => t.who === id)).map(b => ({ ...b }));
      R.subs = (doc.subs || []).filter(s => s.who === id).map(s => ({ ...s }));
      (doc.classes || []).forEach(c => { const e = c.enr && c.enr[id]; if (e) R.enr[c.id] = { ...e }; else if ((c.learners || []).includes(id)) R.enr[c.id] = { status: 'active', at: c.start, end: c.end || null, src: 'admin' }; });
      (doc.books || []).forEach(b => { const g = (b.grants || []).find(x => x.who === id && !x.off); if (g) R.books[b.id] = { ...g, until: addD(g.at, (b.dl && +b.dl.days) || 30) }; const s = (b.ship || []).find(x => x.who === id); if (s) R.ship[b.id] = { ...s }; });
    }
    if (doc && !id) { const K0 = meKeys(); const P = (doc.parents || []).filter(p => (K0.includes(String(p.id)) || K0.includes(String(p.acct || ''))) && (!p.acct || /연결 완료/.test(p.status || ''))); if (P.length) { const kids = new Set(P.map(p => p.child)), pids = new Set(P.map(p => p.id)); R.bills = (doc.bills || []).filter(b => kids.has(b.who) || (b.to || []).some(t => pids.has(t.who) || kids.has(t.who))).map(b => ({ ...b })); } } /* 보호자 계정: 연결된 모든 자녀의 청구서(v38 — 행 id가 아니라 보호자 계정 id로 찾음, QA K4) */
    if (LR.mode === 'live' && LR.mine && LR.mine.shop) Object.assign(R, LR.mine.shop); /* 운영: 서버가 내 판매 데이터를 내려줌 */
    const K = meKeys();
    const grant = (type, ref, at, payId, ship) => { if (type === 'class') R.enr[ref] = { status: 'active', at, end: null, src: 'pay', paid: payId, pending: true };
      if (type === 'book') { const b = shop.books.find(x => x.id === ref); R.books[ref] = { who: id, at, dl: 0, pay: payId, until: addD(at, (b && b.dl && +b.dl.days) || 30), pending: true }; if (b && b.kind !== '전자책') R.ship[ref] = { done: false, memo: ship || '' }; }
      if (type === 'sub') { let s = R.subs.find(x => x.cls === ref && x.status !== '해지'); if (!s) { s = { id: rid('sb'), cls: ref, status: '구독중', n: 0, start: at }; R.subs.push(s); } s.status = '구독중'; s.n = (s.n || 0) + 1; s.next = addM(at, 1); s.pay = payId; s.pending = true; R.enr[ref] = { status: 'active', at, end: s.next, src: 'pay', pending: true }; } };
    qAll().filter(x => K.includes(String(x.who)) || (x.type === 'bill-pay' && R.bills.some(b => b.id === (x.data || {}).billId))).forEach(x => { const d = x.data || {}; const at = lLocal(x.at).slice(0, 10) || today(); const P = R.pays.find(p => p.id === d.payId);
      if (x.type === 'pay' && !P) { const it = d.itemType === 'book' ? shop.books.find(b => b.id === d.ref) : shop.classes.find(c => c.id === d.ref); R.pays.unshift({ id: d.payId, at, item: (it && it.name) || d.item || '', itemType: d.itemType, ref: d.ref, amount: priceOf(it), method: d.method, status: d.status, vacct: d.vacct || null, ship: d.ship || '', pending: true }); if (d.status === '결제 완료') grant(d.itemType, d.ref, at, d.payId, d.ship); }
      if (x.type === 'vacct-paid' && P && P.status === '결제 대기') { P.status = '결제 완료'; P.pending = true; grant(P.itemType, P.ref, at, P.id, P.ship); }
      if (x.type === 'pay-cancel' && P && P.status === '결제 대기') { P.status = '취소'; P.pending = true; }
      if (x.type === 'refund-req' && P && P.status === '결제 완료') { P.status = '환불 신청'; P.refund = { at, reason: d.reason, state: '신청', amount: P.amount }; P.pending = true; if (R.enr[P.ref]) R.enr[P.ref].hold = true; if (R.books[P.ref]) R.books[P.ref].hold = true; }
      if (x.type === 'refund-cancel' && P && P.refund && P.refund.state === '신청') { P.status = '결제 완료'; P.refund = null; P.pending = true; if (R.enr[P.ref]) delete R.enr[P.ref].hold; if (R.books[P.ref]) delete R.books[P.ref].hold; }
      if (x.type === 'enroll') R.enr[d.cls] = { status: 'active', at, end: null, src: 'self', pending: true };
      if (x.type === 'enroll-req' && !R.ap[d.cls]) R.ap[d.cls] = 'req';
      if (x.type === 'enroll-req-cancel' && R.ap[d.cls] === 'req') delete R.ap[d.cls];
      if (x.type === 'bill-pay') { const b = R.bills.find(y => y.id === d.billId); if (b && b.status === '미납') { b.status = '납부 완료'; b.payAt = at; b.method = d.method; b.pending = true; } }
      if (x.type === 'sub-cancel') { const s = R.subs.find(y => y.id === d.subId) || R.subs.find(y => y.cls === d.cls && y.status === '구독중'); if (s && s.status === '구독중') { s.status = '해지 예약'; s.pending = true; } }
      if (x.type === 'book-dl' && R.books[d.bookId]) R.books[d.bookId].dl = (R.books[d.bookId].dl || 0) + 1;
      if (x.type === 'book-ship') R.ship[d.bookId] = { ...(R.ship[d.bookId] || { done: false }), memo: d.memo };
      if (x.type === 'book-free') grant('book', d.bookId, at, '', d.memo);
    });
    Object.entries(R.enr).forEach(([cid, e]) => { if (e.status === 'excluded' && e.hold) e.status = 'hold'; if (e.hold) e.status = 'hold'; });
    seedPays(R, shop);
    if (LR.mode === 'demo' && LR.tid === 'sample' && LR.me) ((SITE().demo || {}).enr || []).forEach(id => { if (!R.enr[id]) R.enr[id] = { status: 'active', at: today(), end: null, src: 'demo' }; }); /* v43 K2(KFIX 87): 체험판 시연 학습자는 결제한 강좌 · 체험 강좌를 수강 중(플레이어 잠금 화면 대신 강의) */
    return R;
  }
  /* v23 lux.js(쉬운 학습자 화면)용 읽기 전용 도우미: 내 수강 상태 · 판매가 */
  window.shMine = () => { try { return mine(); } catch (e) { return null; } };
  window.shState = id => { try { const sh = SHOP(); const c = sh && sh.classes.find(x => x.id === id); return c ? enrState(c, mine()) : 'none'; } catch (e) { return 'none'; } };
  window.shPrice = id => { const sh = SHOP(); const c = sh && sh.classes.find(x => x.id === id); return c ? priceOf(c) : 0; };
  window.shInfo = () => SHOP();
  const visible = (x, R) => { const o = x.open || '전체'; if (o === '전체') return true; if (o === '비공개') return false; if (o === '회원') return !!(R && R.m) || !!LR.me || LR.mode === 'preview'; /* v35 대학 '우리 학교 학생만'(crs-scn univ) = 로그인한 회원 */ const m = R && R.m; return !!(m && (x.openTo || []).some(v => v === m.id || v === m.team || v === m.group)); };
  const enrState = (c, R) => { const e = R.enr[c.id]; if (!e) return 'none'; if (e.status === 'hold' || e.hold) return 'hold'; if (e.status !== 'active') return 'none'; if (e.end && e.end < today()) return 'ended'; return 'active'; };
  /* v43 K2(P2-C1 · H4 · H5 · H9): 모집 방식 · 정원 · 대기 · 신청 승인. 선착순이 기본, 추첨 · 승인은 기관이 강좌 설정(모집 방식)에서 고른다.
     대학 비교과(학사 LMS 제외)는 판매 정보가 없어도 게시본 과정(SITE().classes)으로 신청 블록을 연다(무료 · 결제 없음) */
  const MODE = { fcfs: '선착순', lottery: '추첨', approve: '승인 후 확정' };
  const modeOf = c => { const m = c && c.recruit && c.recruit.mode; return MODE[m] ? m : 'fcfs'; };
  const UNIV = () => { const o = (SITE() || {}).org || {}; return o.type === 'univ' && o.ed !== 'lms'; };
  const synthC = id => { if (!UNIV()) return null; const b = (SITE().classes || []).find(x => x.id === id); if (!b) return null; const R = b.recruit || null;
    return { id: b.id, name: b.name, price: 0, kind: 'period', period: b.start ? { mode: 'range', start: b.start, end: b.end } : null, recruit: R, n: +(b.n ?? (R && R.n)) || 0, waitN: +(b.waitN ?? (R && R.waitN)) || 0, open: b.open || '전체', items: (b.items || []).filter(i => i.type !== 'chapter').length, thr: b.thr, desc: b.desc || '', teachers: b.teachers || [], mile: b.mile || 0, prog: 1 }; };
  const shopFor = id => { const sh = SHOP(); if (sh && sh.classes.some(x => x.id === id)) return sh; const c = synthC(id); return c ? { v: 1, pg: { use: 'none' }, classes: [c], books: [], synth: 1 } : sh; };
  const clsOf = id => { const sh = shopFor(id); return sh ? sh.classes.find(x => x.id === id) : null; };
  const apKey = id => `didisam.apply.${LR.tid || 'x'}.${(LR.me && (LR.me.sid || LR.me.id)) || 'x'}.${id}`;
  const apState = (id, R) => { const s = R && R.ap && R.ap[id]; if (s) return s; if (LR.mode !== 'live') return ''; try { return localStorage.getItem(apKey(id)) ? 'req' : ''; } catch (e) { return ''; } }; /* 운영은 서버가 반영하기 전까지 이 기기 표시 */
  const daysTxt = c => (c.days || []).length ? `매주 ${[...c.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => '일월화수목금토'[d]).join('·')}${c.time && c.time.from ? ' ' + c.time.from : ''}` : '';
  const seatTxt = c => { const R = c.recruit || {}; const cap = +R.cap || 0; const n = +(c.n ?? R.n) || 0; const w = +(c.waitN ?? R.waitN) || 0; if (!cap) return ''; return `정원 ${cap}명 · 남은 자리 ${Math.max(0, cap - n)}석${w ? ` · 대기 ${w}명` : ''}`; };
  window.shApplies = () => { try { const R = mine(); return Object.entries(R.ap).filter(([id]) => { const e = R.enr[id]; return !(e && e.status === 'active'); }).map(([id, st]) => { const c = clsOf(id) || {}; return { id, st, name: c.name || '', mode: modeOf(c) }; }); } catch (e) { return []; } };
  /* v35.3: 강의가 하나도 없는 과정(회차 일정 · 묶음 제외)은 '준비 중' — 신청 버튼 대신 안내 */
  const prepOf = c => !!c && c.items != null && +c.items === 0 && !(+c.sessions > 0) && c.kind !== 'pack';
  function recruitState(c) { if (prepOf(c)) return { ok: false, label: '준비 중', prep: true }; const R = c.recruit; const t = today();
    if (c.saleEnd && c.saleEnd <= t) return { ok: false, label: '판매 종료' };
    if (R && R.on) { if (R.from && t < R.from) return { ok: false, label: `모집 예정 · ${R.from}부터` }; if (R.to && t > R.to) return { ok: false, label: '모집 마감' }; if (R.cap && (c.n || 0) >= +R.cap && modeOf(c) !== 'lottery') return { ok: false, label: `정원 마감(${R.cap}명)`, full: true }; return { ok: true, label: `모집 중${R.to ? ` · ${R.to}까지` : ''}${R.cap ? ` · 잔여 ${Math.max(0, R.cap - (c.n || 0))}석` : ''}` }; }
    if (R && !R.on && +R.cap > 0 && (c.n || 0) >= +R.cap && modeOf(c) !== 'lottery') return { ok: false, label: `정원 마감(${R.cap}명)`, full: true }; /* v38 L-1: 신청 기간을 정하지 않아도 정원은 지킨다 */
    const P = c.period; if (P && P.mode !== 'days' && P.end && P.end < t) return { ok: false, label: '수강 기간 종료' };
    try { const sh = SHOP(); if (sh && sh.pg && sh.pg.use === 'none' && priceOf(c) > 0) return { ok: true, label: '결제 준비 중', pend: true }; } catch (e) { } /* v25.1: 결제 미연결 유료 강좌에 '수강 신청 가능'이 함께 뜨던 문제 */
    return { ok: true, label: '수강 신청 가능' }; }
  const periodTxt = c => { const P = c.period; if (Array.isArray(c.span) && c.span[0]) return `${c.span[0]} ~ ${c.span[1]}`; /* v38 회차 수업은 실제 수업 기간(QA K17) */ if (!P) return ''; return P.mode === 'days' ? `수강 신청 후 ${P.days}일` : `${P.start || ''} ~ ${P.end || ''}`; };
  /* v37 L1: 결제를 쓰지 않는 기관(대학 · 기업 · 공공 기본, 운영자 설정 S.settings.payOn → 게시본 pay:false)은 강좌 가격 · '무료' 표시 · 결제 단계를 감춘다 */
  const payOff = () => { try { return SITE().pay === false || (!SHOP() && UNIV()); } catch (e) { return false; } }; /* v43 K2: 판매 정보 없이 여는 대학 비교과 신청도 무료 표시 · 결제 단계 없음 */
  const critOf = c => { try { const b = (SITE().classes || []).find(x => x.id === c.id) || c; return typeof a2lCritTxt === 'function' ? a2lCritTxt({ ...b, thr: b.thr || c.thr }) : { s: `진도 ${c.thr || 80}%`, l: `진도 ${c.thr || 80}% 이상` }; } catch (e) { return { s: `진도 ${c.thr || 80}%`, l: `진도 ${c.thr || 80}% 이상` }; } };
  const priceHTML = x => { const f = priceOf(x); if (payOff() && ['period', 'episode', 'sub', 'pack'].includes(x.kind || 'period')) return ''; if (!+x.price) return '<b class="shp-free">무료</b>'; return f < x.price ? `<s>${won(x.price)}</s> <b>${won(f)}</b>${x.kind === 'sub' ? '<small>/월</small>' : ''}` : `<b>${won(f)}</b>${x.kind === 'sub' ? '<small>/월</small>' : ''}`; };
  const thumb = (x, cls = '') => x.thumb ? `<img class="shp-th ${cls}" src="${esc(x.thumb)}" alt="">` : window.LHB ? `<span class="shp-th shp-th0 shp-thp ${cls}" aria-hidden="true" style="background-image:url('${esc(typeof window.lPhoto === 'function' ? window.lPhoto(x.name, x.id, cls === 'big') : window.LHB.photo(x.name))}')"></span>` : `<span class="shp-th shp-th0 ${cls}" aria-hidden="true">${esc(String(x.name || '').slice(0, 6))}</span>`; /* v43 썸네일이 없으면 글자 상자 대신 학습 사진(lhub.js LHB.photo) */
  const sec = (h, inner, crumb) => { const r = route(); /* v43 Q2: 공통 머리 — 목록 · 강좌 상세 · 결제 내역은 숫자까지, 결제 · 교재 상세 같은 아래 화면은 짧은 머리 */ return `${lPageHead({ key: r.a, crumb: `<a href="#home">홈</a> › ${crumb || esc(h)}`, title: h, desc: r.a === 'shop' && !r.b ? '지금 신청할 수 있는 강좌예요. 사진을 눌러 커리큘럼 · 수강료 · 수료 기준을 확인하세요.' : '', compact: !['shop', 'class', 'mypay', 'tb'].includes(r.a) || (r.a === 'shop' && !!r.b) })}<section class="sec shp"><div class="in">${inner}</div></section>`; };
  const shopT = () => (typeof LAPP_FIND === 'function' && LAPP_FIND()) || '클래스';
  const noShop = () => { const uv = ((SITE().org || {}).type) === 'univ'; /* v43 D-C(P2 C1): 대학 비교과는 「판매」 대신 신청 안내 빈 상태 — 신청 버튼 자체는 (기능) 항목 */
    if (!uv) return sec(shopT(), '<p class="empty">아직 판매 정보가 게시되지 않았습니다. 운영자가 학습자 사이트를 게시하면 보입니다.</p>');
    const c = route().a === 'class' ? (SITE().classes || []).find(x => x.id === route().b) : null;
    return sec(c ? c.name : shopT(), `<div class="cd43-wait"><div class="empty2 cd43-we"><p><b>이 프로그램은 아직 신청을 받지 않아요.</b><br>신청이 열리면 알려 드릴게요.</p><div class="cd43-wb"><a class="lbtn pri" href="${LR.me ? '#connect' : '#login/connect'}">알림 받기</a><a class="lbtn ghost" href="#courses">다른 프로그램 보기</a></div></div>
      <aside class="cd43-guide" aria-label="신청 기간 · 방법 안내"><h3>신청 기간 · 방법 안내</h3><ol><li><b>1</b><span><strong>신청 기간</strong>학과 · 사업단 공지로 먼저 알려 드려요. 공지에서 일정을 확인하세요.</span></li><li><b>2</b><span><strong>신청 방법</strong>신청이 열리면 이 화면에 [신청하기] 버튼이 생겨요. 학번으로 로그인한 상태에서 누르면 돼요.</span></li><li><b>3</b><span><strong>승인 · 이수</strong>담당 부서가 승인하면 내 학습에 강좌가 보이고, 이수하면 마일리지 · 배지가 쌓여요.</span></li></ol><a class="lbtn ghost blk" href="#notice">공지에서 일정 보기</a></aside></div>`); };
  const gradeBlock = R => { const g = R.m && R.m.grade; if (g === '준회원') return '정회원만 결제할 수 있습니다. 본인인증 후 정회원이 되면 결제할 수 있습니다.'; if (g === '승인 대기') return '가입 승인 후 이용할 수 있습니다.'; if (g === '거절') return '가입이 거절된 계정입니다. 운영자에게 문의하세요.'; return ''; };
  const pv = () => { if (LR.mode === 'preview') { toast('미리보기에서는 신청 · 결제를 할 수 없습니다.', 'warn'); return true; } return false; };

  /* ── 모달 ── */
  function shModal(title, body, acts) { shClose(); const w = document.createElement('div'); w.className = 'shp-mw'; w.id = 'shpModal';
    w.innerHTML = `<div class="shp-m" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="shp-mh"><b>${esc(title)}</b><button type="button" class="shp-x" data-shx="1" aria-label="닫기">${ico('x', 18)}</button></div><div class="shp-mb">${body}</div><div class="shp-mf">${(acts || []).map((a, i) => `<button type="button" class="lbtn ${a.kind || 'ghost'} sm" data-shm="${i}">${esc(a.label)}</button>`).join('')}</div></div>`;
    document.body.appendChild(w); w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-shx]')) { shClose(); return; } const b = e.target.closest('[data-shm]'); if (!b) return; const a = acts[+b.dataset.shm]; if (!a.run || a.run(w) !== false) shClose(); });
    const f = w.querySelector('input,select,textarea,button.lbtn'); f && f.focus(); return w; }
  const shClose = () => { const m = document.getElementById('shpModal'); m && m.remove(); };
  addEventListener('keydown', e => { if (e.key === 'Escape') shClose(); });

  /* ── 클래스 목록 ── */
  function viewShop() { const sh = SHOP(); if (!sh) return noShop(); const R = mine(); const F = LR.shopF || {};
    const L = sh.classes.filter(c => visible(c, R) && !c.tossTemp).filter(c => (!F.cat || c.cat === F.cat || (sh.cats || []).some(x => x.id === c.cat && x.parent === F.cat)) && (!F.kind || c.kind === F.kind));
    const top = (sh.cats || []).filter(x => !x.parent).sort((a, b) => a.order - b.order); const subs = F.cat ? (sh.cats || []).filter(x => x.parent === F.cat || (x.id === F.cat && x.parent)) : [];
    const parentOf = F.cat ? ((sh.cats || []).find(x => x.id === F.cat) || {}).parent : null;
    const chip = (k, v, l, on) => `<button type="button" class="shp-chip ${on ? 'on' : ''}" data-shf="${k}" data-v="${esc(v)}">${esc(l)}</button>`;
    const kinds = [...new Set(sh.classes.map(c => c.kind))];
    return sec(shopT(), `<div class="shp-filt"><input type="search" id="shpQ" placeholder="클래스 · 강사 검색" value="${esc(F.q || '')}" aria-label="클래스 검색">
      ${top.length ? `<div class="shp-chips" aria-label="카테고리">${chip('cat', '', '전체', !F.cat)}${top.map(x => chip('cat', x.id, x.name, F.cat === x.id || parentOf === x.id)).join('')}</div>` : ''}
      ${(parentOf || subs.length) ? `<div class="shp-chips sub">${(sh.cats || []).filter(x => x.parent === (parentOf || F.cat)).map(x => chip('cat', x.id, x.name, F.cat === x.id)).join('')}</div>` : ''}
      ${kinds.length > 1 ? `<div class="shp-chips">${chip('kind', '', '모든 유형', !F.kind)}${kinds.map(k => chip('kind', k, KIND[k] || k, F.kind === k)).join('')}</div>` : ''}</div>
      <div class="shp-grid">${L.map(c => { const rs = recruitState(c); const st = enrState(c, R);
        return `<a class="shp-card" href="#class/${esc(c.id)}" data-s="${esc((c.name + ' ' + (c.teachers || []).join(' ') + ' ' + (c.desc || '')).toLowerCase())}">${thumb(c)}<div class="shp-cb"><div class="shp-tags"><span class="tg">${esc(KIND[c.kind] || '기간')}${c.sub ? ' · ' + esc(SUBN[c.sub] || c.sub) : ''}</span>${c.legal ? '<span class="tg r">법정</span>' : ''}${st === 'active' ? '<span class="tg g">수강 중</span>' : ''}</div><h3>${esc(c.name)}</h3><p class="mini">${[esc((c.teachers || []).filter(n => !/^(관리자|운영자|기관 담당자)$/.test(String(n).trim())).join(', ')), daysTxt(c) ? esc(daysTxt(c)) : periodTxt(c) ? esc(periodTxt(c)) : '', seatTxt(c) ? esc(seatTxt(c).replace(/^정원 \d+명 · /, '')) : ''].filter(Boolean).join(' · ')}</p>${priceHTML(c) ? `<div class="shp-pr">${priceHTML(c)}</div>` : ''}<small class="shp-rs ${rs.ok ? '' : 'off'}">${esc(rs.label)}</small></div></a>`; }).join('') || `<div class="empty shp-empty"><p>${LR.me ? '지금 신청할 수 있는 클래스가 없습니다. 배정받은 과정은 「내 학습」에서 바로 볼 수 있습니다.' : '지금 신청할 수 있는 클래스가 없습니다. 로그인하면 배정받은 과정을 볼 수 있습니다.'}</p><a class="lbtn sm ${LR.me ? 'pri' : 'ghost'}" href="${LR.me ? '#my' : '#login'}">${LR.me ? '내 학습으로 가기' : '로그인'}</a></div>`}</div><p class="empty" id="shpNo" hidden>검색 결과가 없습니다.</p>`); }

  /* ── 클래스 상세 ── */
  /* v38 L-2 대기 신청: 운영자 대기자 명단(LPX 'wait-req')에 올리고, 자리가 나면 운영자가 올리면서 알림을 보낸다 */
  const waitKey = id => `didisam.wait.${(LR.me && (LR.me.sid || LR.me.id)) || 'x'}.${id}`;
  const waited = id => { try { return !!localStorage.getItem(waitKey(id)); } catch (e) { return false; } };
  const waitCta = (id, label) => waited(id) ? `<button class="lbtn blk" disabled>대기 신청했어요</button><p class="mini">${esc(label)} — 자리가 나면 알림으로 알려 드려요.</p>` : `<button type="button" class="lbtn pri blk" data-lwait="${esc(id)}">대기 신청하기</button><p class="mini">${esc(label)}이에요. 대기 신청하면 자리가 났을 때 알림으로 알려 드려요.</p>`;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lwait]'); if (!b) return; e.preventDefault(); const id = b.dataset.lwait; const c = ((SHOP() || {}).classes || []).find(x => x.id === id);
    try { if (typeof lpxPush === 'function') lpxPush('wait-req', { cls: id, name: c ? c.name : '' }); } catch (er) { console.error(er); } try { localStorage.setItem(waitKey(id), new Date().toISOString()); } catch (er) { }
    b.outerHTML = `<button class="lbtn blk" disabled>대기 신청했어요</button>`; try { if (typeof ltoast === 'function') ltoast('대기 신청했어요. 자리가 나면 알려 드려요.'); } catch (er) { } });
  /* v38 C-16: 소개 글의 '[교육 목표]' 머리 · '- ' 줄을 제목 · 목록으로(마크다운 기호가 그대로 보이던 문제) */
  const mdLite = t => { const L = String(t || '').split(/\r?\n/); let h = '', ul = []; const flush = () => { if (ul.length) { h += `<ul class="shp-dl">${ul.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; ul = []; } };
    L.forEach(x => { const s = x.trim(); if (!s) { flush(); return; } const m = s.match(/^[-•·*]\s+(.+)$/); if (m) { ul.push(m[1]); return; } flush(); const hd = s.match(/^\[(.+?)\]$/) || s.match(/^#{1,4}\s+(.+)$/); h += hd ? `<p><b>${esc(hd[1])}</b></p>` : `<p>${esc(s)}</p>`; }); flush(); return h; };
  /* v43 D-C: 강좌 상세 — 차시 카드(번호 · 유형 칩 · 시간 · 잠금) · 강사 프로필 카드. 데이터는 그대로, 마크업만 */
  const CD_TY = { video: ['play', '영상'], doc: ['book', '강의자료'], quiz: ['check', '퀴즈'], exam: ['award', '시험'], assign: ['edit', '과제'], survey: ['spark', '설문'], live: ['video', '라이브'], offline: ['pin', '오프라인'] };
  const cdMin = i => { const m = +i.time || +i.mins || Math.round((+i.cplSec || 0) / 60); return m ? m + '분' : ''; };
  function cdCur(c, items, st) { const L = items.filter(i => i.type !== 'chapter'); let k = 0;
    const body = items.map(i => { if (i.type === 'chapter') return `<li class="cd43-ch">${esc(i.title)}</li>`; k++; const t = CD_TY[i.type] || ['layers', '학습']; const mn = cdMin(i);
      return `<li class="cd43-it"><span class="cd43-n">${String(k).padStart(2, '0')}</span><span class="cd43-tt"><b>${esc(i.title)}</b><small><i aria-hidden="true">${ico(t[0], 13)}</i>${t[1]}${mn ? ` · ${mn}` : ''}</small></span><span class="cd43-lk${st === 'active' ? ' on' : ''}" aria-label="${st === 'active' ? '수강 가능' : '신청 후 열림'}">${ico(st === 'active' ? 'arrow' : 'lock', 15)}</span></li>`; }).join('');
    const sum = Object.entries(L.reduce((a, i) => { const n = (CD_TY[i.type] || [0, '학습'])[1]; a[n] = (a[n] || 0) + 1; return a; }, {})).map(([n, v]) => `${n} ${v}`).join(' · ');
    return `<h2 id="shp-curx">커리큘럼 <small class="mini">${L.length}개 차시${sum ? ` · ${esc(sum)}` : ''}</small></h2><ol class="shp-cur cd43-cur">${body || '<li class="mini">커리큘럼을 준비 중입니다.</li>'}</ol>`; }
  function cdTeach(c, items) { const T = (c.intro || []).length ? c.intro : (c.teachers || []).filter(n => !/^(관리자|운영자|기관 담당자)$/.test(String(n).trim())).map(n => ({ name: n, bio: '' })); if (!T.length) return '';
    const term = (typeof lcTerm === 'function' && lcTerm('teacher')) || '강사'; const nv = items.filter(i => i.type !== 'chapter').length;
    return `<h2>담당 ${esc(term)}님을 소개합니다</h2><div class="shp-ins cd43-ins">${T.map(i => { const nm = String(i.name || '').replace(/^(강사|교수|선생님)\s*/, ''); return `<div class="cd43-pf">${i.photo ? `<img src="${esc(i.photo)}" alt="">` : `<span class="cd43-av" aria-hidden="true">${esc(nm.slice(0, 1) || 'T')}</span>`}<div class="cd43-pi"><small>${esc(term)}</small><b>${esc(i.name)}</b><p class="mini">${i.bio ? nl(i.bio) : `「${esc(c.name)}」 ${nv ? nv + '개 차시를 ' : ''}직접 설명하고, 과제 피드백과 질문 답변을 맡아요.`}</p>
      <ul class="cd43-ps">${c.n ? `<li><b>${lphN(c.n)}</b>명 수강</li>` : ''}${nv ? `<li><b>${nv}</b>개 차시</li>` : ''}<li><b>${esc(critOf(c).s)}</b>수료 기준</li></ul></div><a class="lbtn ghost cd43-q" href="#comm">질문 남기기</a></div>`; }).join('')}</div>`; }
  function viewClass(id) { const sh = shopFor(id); if (!sh) return noShop(); const c = sh.classes.find(x => x.id === id); const R = mine();
    if (!c || !visible(c, R)) return sec('클래스', '<p class="empty">클래스를 찾지 못했거나 공개되지 않은 클래스입니다.</p>', '<a href="#shop">클래스</a>');
    const base = ((SITE().classes || []).find(x => x.id === id) || {}); const items = base.items || []; const st = enrState(c, R); const rs = recruitState(c); const f = payOff() ? 0 : priceOf(c);
    const sub = R.subs.find(s => s.cls === id && s.status !== '해지') || R.subs.find(s => s.cls === id); const cnt = c.subsc ? +c.subsc.count || 0 : 0;
    let cta = ''; const md = modeOf(c), ap = LR.me && st !== 'active' ? apState(id, R) : '', U = !!sh.synth || UNIV(); const nW = U ? '프로그램' : '강좌';
    const apCta = () => `<button class="lbtn pri blk" data-shact="apply" data-v="${esc(id)}">${md === 'lottery' ? '추첨 신청하기' : U ? '신청하기' : '수강 신청하기'}</button><p class="mini">${md === 'lottery' ? `신청 기간${c.recruit && c.recruit.to ? `(${esc(c.recruit.to)}까지)` : ''}이 끝나면 추첨해 결과를 알림으로 알려 드려요. 신청이 정원보다 적으면 모두 선정돼요.` : `담당자가 확인해 승인하면 내 학습에 ${nW}이 들어와요. 결과는 알림으로 알려 드려요.`}</p>`;
    if (ap === 'req' && st === 'none') cta = `<button class="lbtn blk" disabled>${md === 'lottery' ? '추첨 결과를 기다리고 있어요' : '승인을 기다리고 있어요'}</button><p class="mini">${md === 'lottery' ? '추첨이 끝나면 알림으로 알려 드려요.' : '담당자가 확인하면 알림으로 알려 드려요. 승인되면 내 학습에 바로 보여요.'}</p><button type="button" class="lbtn ghost blk" data-shact="apcancel" data-v="${esc(id)}">신청 취소</button>`;
    else if (ap === 'rej' && st === 'none') cta = `<div class="shp-warn">${md === 'lottery' ? '이번 추첨에서는 선정되지 않았어요.' : '이번 신청은 승인되지 않았어요.'}</div>${waitCta(id, '자리가 나면 순서대로 알려 드려요')}`;
    else if (rs.prep && st !== 'active') cta = `<button class="lbtn blk" disabled>준비 중</button><p class="mini">강의를 준비하고 있어요. 준비가 끝나면 이 화면에서 신청할 수 있어요.</p>`;
    else if (!LR.me && rs.full) cta = `<button class="lbtn blk" disabled>${esc(rs.label)}</button><a class="lbtn pri blk" data-lwg="1" href="#login/class/${esc(id)}">로그인하고 대기 신청하기</a><p class="mini">자리가 나면 알림으로 알려 드려요.</p>`; /* v38 L-1 · L-2: 방문자도 목록과 같은 정원 판정 + 대기 신청 길 */
    else if (!LR.me && !rs.ok && !rs.pend) cta = `<button class="lbtn blk" disabled>${esc(rs.label)}</button>`;
    else if (!LR.me) cta = f > 0 && sh.pg.use === 'none' ? `<button class="lbtn blk" disabled>결제 준비 중</button><p class="mini">운영자가 결제 연결을 마치면 이 화면에서 바로 신청할 수 있습니다.</p>` : `<a class="lbtn pri blk" href="#login/class/${esc(id)}">로그인하고 수강 신청</a>`; /* v25: 결제 연결 전에는 방문자도 '결제 준비 중'(가입 후 막다른 길 방지) */
    else if (st === 'active') cta = `<a class="lbtn pri blk" href="#c/${esc(id)}">이어서 수강하기</a>${items[0] ? `<a class="lbtn ghost blk" href="#c/${esc(id)}/${esc(items[0].id)}">처음부터 수강하기</a>` : ''}${c.kind === 'sub' && sub ? `<p class="mini">구독 ${sub.status} · ${sub.n || 1}회차${cnt ? `/${cnt}` : ''} · 다음 결제일 ${esc(sub.next || '')}</p>` : ''}`;
    else if (st === 'hold') cta = `<div class="shp-warn">환불 신청 중입니다. 신청한 순간부터 이 클래스는 수강할 수 없습니다.</div><a class="lbtn ghost blk" href="#mypay/refund">환불 내역 보기</a>`;
    else if (st === 'ended' && !(c.kind === 'sub' && (!cnt || (sub && sub.n < cnt)))) cta = `<div class="shp-warn">수강 기간이 종료되었습니다. 같은 클래스는 다시 신청 · 결제할 수 없습니다. 연장이 필요하면 운영자에게 문의하세요.</div>`;
    else if (c.kind === 'sub' && cnt && sub && sub.n >= cnt && sub.status === '해지') cta = `<div class="shp-warn">설정된 구독 회차(${cnt}회)를 모두 이용했습니다.</div>`;
    else if (!rs.ok && rs.full) cta = waitCta(id, rs.label); /* v38 L-2: 정원이 차면 대기 신청 */
    else if (!rs.ok) cta = `<button class="lbtn blk" disabled>${esc(rs.label)}</button>`;
    else if (gradeBlock(R) && f > 0) cta = `<div class="shp-warn">${esc(gradeBlock(R))}</div>`;
    else if (f > 0 && sh.pg.use === 'none') cta = `<button class="lbtn blk" disabled>결제 준비 중</button><p class="mini">운영자가 결제(PG) 연결을 마치면 신청할 수 있습니다.</p>`;
    else if (md !== 'fcfs' && ap !== 'ok' && LR.me) cta = apCta(); /* 추첨 · 승인: 먼저 신청 → 선정 · 승인 뒤 결제(유료) 또는 바로 수강(무료) */
    else if (c.kind === 'sub') cta = `<a class="lbtn pri blk" href="#pay/sub/${esc(id)}">구독 신청 · 월 ${won(f)}</a><p class="mini">결제 수단을 등록하면 매월 같은 날 자동 결제됩니다.${cnt ? ` 최대 ${cnt}회차.` : ' 회차 제한 없음.'}${sub && sub.status === '해지' ? ` 지난 진도율은 유지됩니다.` : ''}</p>`;
    else if (f > 0) cta = `<a class="lbtn pri blk" href="#pay/class/${esc(id)}">결제하고 수강 신청 · ${won(f)}</a>`;
    else cta = `<button class="lbtn pri blk" data-shact="enroll" data-v="${esc(id)}">${payOff() ? '수강 신청하기' : '수강 신청(무료)'}</button>`;
    const vmin = c.vmin || items.filter(i => i.type === 'video').reduce((a, i) => a + (+i.time || 0), 0);
    return sec(c.name, `<div class="shp-det"><div class="shp-main">${thumb(c, 'big')}
        <div class="shp-box cd43-band">${(() => { const n = c.items != null ? +c.items : items.filter(i => i.type !== 'chapter' && i.type !== 'offline').length; const off = +c.off || items.filter(i => i.type === 'offline').length; const cell = (ic, l, v) => `<div><i aria-hidden="true">${ico(ic, 18)}</i><small>${l}</small><b>${v}</b></div>`; return (!n && +c.sessions > 0 ? cell('clock', '수업', `${+c.sessions}회`) : cell('layers', '강의 수', n ? n + '개' : off ? '없음' : '준비 중') + (off ? cell('pin', '오프라인 수업', `${off}회`) : '')) + (vmin ? cell('video', '총 영상 시간', vmin >= 60 ? Math.floor(vmin / 60) + '시간 ' + (vmin % 60) + '분' : vmin + '분') : '') + cell('award', '수료 기준', esc(critOf(c).s)) + cell('clock', '수강 기간', esc(periodTxt(c) || '상시')); })()}</div>
        <nav class="shp-tabs" aria-label="클래스 안내"><a href="#" data-l26jump="shp-intro" class="on">클래스 소개</a><a href="#" data-l26jump="shp-curx">커리큘럼</a><a href="#" data-l26jump="shp-extx">수강후기 · 커뮤니티</a></nav>
        <div id="shp-intro"></div>${c.desc ? `<h2>클래스에서 배울 수 있는 내용이에요</h2>${mdLite(c.desc)}` : ''}
        ${cdTeach(c, items)}
        ${cdCur(c, items, st)}
        <div id="shp-extx"></div>${['lcNoticeHTML', 'lcCommHTML', 'lcReviewsHTML'].map(f => { try { return typeof window[f] === 'function' ? `<div class="shp-ext">${window[f](id) || ''}</div>` : ''; } catch (e) { console.error(e); return ''; } }).join('')}
        <p class="mini">클래스 유형: ${esc(KIND[c.kind] || '기간')} ${c.kind === 'sub' ? '— 기간 클래스와 커리큘럼이 같고 매월 정기 결제됩니다.' : (c.days || []).length ? '— 매주 정해진 요일 · 시간에 현장에서 수업합니다.' : c.kind === 'episode' ? '— 정해진 회차(일정)에 맞춰 수업합니다.' : c.kind === 'pack' ? '— 여러 클래스를 묶은 과정입니다.' : '— 정해진 기간 동안 온라인으로 수강합니다.'}</p></div>
      <aside class="shp-side"><h3 class="shp-sname">${esc(c.name)}</h3>${priceHTML(c) ? `<div class="shp-pr big">${priceHTML(c)}</div>` : ''}${c.discount && c.discount.on && c.discount.until ? `<small class="mini">할인 ${esc(c.discount.until)}까지</small>` : ''}${c.recruit && c.recruit.early && c.recruit.early.on && (!c.recruit.early.until || today() <= c.recruit.early.until) ? `<small class="shp-rs">얼리버드 ${c.recruit.early.rate}% 할인${c.recruit.early.until ? ` · ${esc(c.recruit.early.until)}까지` : ''}</small>` : ''}
        <ul class="shp-meta"><li>수강 신청: ${esc(rs.label)}</li>${c.recruit && (c.recruit.on || c.recruit.mode || +c.recruit.cap) ? `<li>모집 방식: ${MODE[md]}</li>` : ''}${c.recruit && c.recruit.on ? `<li>신청 기간: ${esc(c.recruit.from || '상시')} ~ ${esc(c.recruit.to || '상시')}</li>` : ''}${seatTxt(c) ? `<li class="shp-seat">${esc(seatTxt(c))}</li>` : c.recruit && c.recruit.on ? '<li>정원: 제한 없음</li>' : ''}${c.mile ? `<li>이수 마일리지: ${+c.mile}점</li>` : ''}${(c.days || []).length ? `<li class="shp-seat">요일 · 시간: 매주 ${[...c.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => '일월화수목금토'[d]).join('·')}${c.time && c.time.from ? ` ${esc(c.time.from)}${c.time.to ? '–' + esc(c.time.to) : ''}` : ''}</li>` : ''}${c.place ? `<li>장소: ${esc(c.place)}</li>` : ''}${c.target ? `<li>대상: ${esc(c.target)}</li>` : ''}${c.sessions ? `<li>회차: ${c.sessions}회</li>` : ''}<li>수강 기간: ${esc(periodTxt(c) || '상시')}</li><li>수료 기준: ${esc(critOf(c).l)}</li></ul>${cta}<button type="button" class="lbtn ghost blk shp-share" data-l26share="${esc(id)}">공유하기</button></aside></div>`, '<a href="#shop">클래스</a> › ' + esc(c.name)); }

  /* ── 결제 화면 ── */
  function viewPay(kind, id) { const sh = SHOP(); if (!sh) return noShop(); if (kind !== 'book' && payOff()) return sec('수강 신청', `<p class="lead">이 기관은 결제 없이 수강 신청해요.</p><a class="lbtn pri" href="#class/${esc(id)}">강좌 안내로 돌아가기</a>`); /* v37 L1 */ if (!LR.me) return needLogin(`pay/${kind}/${id}`); const R = mine();
    const x = kind === 'book' ? sh.books.find(b => b.id === id) : sh.classes.find(c => c.id === id); if (!x || !visible(x, R)) return sec('결제', '<p class="empty">결제할 상품을 찾지 못했습니다.</p>');
    const f = priceOf(x); const gb = gradeBlock(R); const back = kind === 'book' ? `#tb/${id}` : `#class/${id}`;
    if (gb) return sec('결제', `<div class="shp-warn">${esc(gb)}</div><a class="lbtn ghost" href="${back}">돌아가기</a>`);
    if (sh.pg.use === 'none') return sec('결제', '<div class="shp-warn">아직 결제를 받을 수 없습니다(운영자 PG 연결 전).</div>');
    if (kind !== 'book' && ['active', 'hold'].includes(enrState(x, R))) return sec('결제', `<p class="empty">이미 신청한 클래스입니다.</p><a class="lbtn pri" href="#c/${esc(id)}">강의 보러 가기</a>`);
    if (kind === 'book' && R.books[id]) return sec('결제', `<p class="empty">이미 구매한 교재입니다.</p><a class="lbtn pri" href="#mybooks">내 교재/교구</a>`);
    const sub = kind === 'sub'; const phys = kind === 'book' && x.kind !== '전자책'; const req = phys && x.req && x.req.on;
    const methods = sub ? [['신용카드', '신용카드 · 체크카드(정기결제 등록)']] : [['신용카드', '신용카드 · 체크카드'], ['계좌이체', '실시간 계좌이체'], ['간편결제', '간편결제(토스페이 · 카카오페이 · 네이버페이)'], ['가상계좌', '가상계좌(기한 안에 입금)'], ...(sh.pg.intl ? [['해외카드', '해외카드(VISA · Master)']] : [])];
    const disc = (+x.price || 0) - f;
    /* v26.2 — 피그마 User Page › 결제하기 벤치마크: 가운데 한 장의 카드(주문 상품 · 결제 금액 · 결제 방식 타일 · 유의사항 · 동의 · 취소/결제하기) */
    const MD = { 신용카드: '신용카드 · 체크카드', 계좌이체: '실시간 계좌이체', 간편결제: '간편결제', 가상계좌: '가상계좌', 해외카드: '해외카드' };
    const MS = { 신용카드: sub ? '정기결제 카드 등록' : '모든 국내 카드', 계좌이체: '내 계좌에서 바로', 간편결제: '토스페이 · 카카오페이 · 네이버페이', 가상계좌: '기한 안에 입금', 해외카드: 'VISA · Master' };
    const pol = (sh.policy && sh.policy.text ? String(sh.policy.text).split(/\n+/).map(s => s.replace(/^[-·*•]\s*/, '').trim()).filter(Boolean) : ['환불은 홈페이지 운영 정책에 따라 승인 여부와 금액이 정해집니다.']).concat([kind === 'book' ? (x.kind === '전자책' ? '전자책은 결제일로부터 7일 이내 신청할 수 있고, 한 번이라도 내려받으면 환불할 수 없습니다.' : '실물 교재/교구는 결제일로부터 7일 이내 신청할 수 있고, 이미 전달받았다면 환불할 수 없습니다.') : '환불을 신청하면 즉시 수강할 수 없고, 운영자 승인 후 환불이 완료됩니다.', `결제는 ${sh.pg.name || 'PG사'} 결제창에서 안전하게 진행됩니다.`]);
    return sec('결제하기', `<form id="shpPay" class="shp-pay p26" novalidate data-kind="${esc(kind)}" data-id="${esc(id)}"><div class="p26c"><div class="p26l">
      <h2 class="p26h">주문 상품</h2>
      <div class="shp-item">${thumb(x)}<div><small>${kind === 'book' ? esc(x.kind) : esc(KIND[x.kind] || '클래스')}</small><b>${esc(x.name)}</b>${kind !== 'book' && periodTxt(x) ? `<small>수강 기간: ${esc(periodTxt(x))}</small>` : ''}${kind === 'book' && x.kind === '전자책' ? `<small>결제 후 ${(x.dl && x.dl.days) || 30}일 동안 내려받을 수 있습니다.</small>` : ''}</div></div>
      ${req ? `<label class="fl">${esc(x.req.q || '배송지 · 요청사항')}${x.req.must ? ' (필수)' : ''}<textarea name="ship" rows="3" maxlength="300" ${x.req.must ? 'required' : ''} placeholder="예: 부산광역시 해운대구 ○○로 12, 101동 1001호 / 문 앞에 놓아 주세요"></textarea></label>` : ''}
      ${sub ? `<label class="fl">구독 시작일(비우면 결제 즉시 시작)<input type="date" name="start" min="${today()}"></label><p class="mini">결제 수단을 등록하면 매월 같은 날 ${won(f)}이 자동 결제됩니다. 구독을 취소하면 남은 기간은 수강할 수 있고 다음 달부터 결제되지 않습니다. 결제가 실패하면 재시도 기간 동안 수강 권한이 유지되고, 끝내 실패하면 자동 만료됩니다.</p>` : ''}
      <h2 class="p26h" id="p26mh">결제 방식</h2>
      <div class="shp-mth p26m" role="radiogroup" aria-labelledby="p26mh">${methods.map(([v], i) => `<label class="p26t"><input type="radio" name="m" value="${v}" ${i === 0 ? 'checked' : ''}><b>${esc(MD[v] || v)}</b><small>${esc(MS[v] || '')}</small></label>`).join('')}</div>
      <h2 class="p26h">유의사항</h2>
      <ul class="p26n">${pol.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      </div><aside class="p26r">
      <h2 class="p26h">결제 금액</h2>
      <dl class="shp-sum p26amt"><dt>상품 금액</dt><dd>${won(x.price)}</dd><dt>할인 금액</dt><dd>${disc ? '-' + won(disc) : '0원'}</dd>${(() => { try { if (!(window.mileOn && window.mileOn() && window.LMIL && LMIL.model)) return ''; const M = LMIL.model(LR.me.sid); return `<dt>마일리지 차감</dt><dd>0원</dd><dd class="p26mi">보유 ${Number(M.balance || 0).toLocaleString('ko-KR')}${esc(M.unit || '점')} · <a href="#mile/rewards">보상에서 학원비 차감으로 바꿔 쓸 수 있어요</a></dd>`; } catch (e) { return ''; } })()}<dt class="tot">최종 결제 금액</dt><dd class="tot"><b>${won(f)}</b>${sub ? '/월' : ''}</dd></dl>
      ${kind === 'class' && f > 0 && typeof cpnCalc === 'function' ? `<div class="p26cp"><label class="fl" for="p26cpn">쿠폰 · 할인 코드(있으면)</label><div class="cpn-row"><input id="p26cpn" name="cpn" maxlength="20" autocomplete="off" placeholder="예: WELCOME10" style="text-transform:uppercase"><button type="button" class="lbtn ghost" data-lcpn="1">적용</button></div><p class="mini" id="p26cpm" role="status" aria-live="polite"></p></div>` : ''}
      <label class="shp-agree p26a"><input type="checkbox" name="agree"> 주문 내용을 확인하였으며, 약관에 동의합니다.</label>
      <p class="p26err" role="alert" hidden>결제를 진행하려면 주문 내용 확인 및 약관 동의에 체크해 주세요.</p>
      <div class="p26btn"><a class="lbtn ghost" href="${back}">취소</a><button class="lbtn pri" type="submit">${won(f)} 결제하기</button></div>
    </aside></div></form>`, `<a href="${back}">${esc(x.name)}</a> › 결제`); }
  function pgWindow(title, amount, done, onFail) { const sh = SHOP() || { pg: {} };
    shModal(`토스페이먼츠 결제창(데모)`, `<p><b>${esc(title)}</b></p><p class="shp-amt">${won(amount)}</p><p class="mini">실제 운영에서는 PG사 결제창(팝업)이 열립니다. <!-- 운영: TossPayments.requestPayment / 나이스 결제창 --> 데모에서는 승인 결과를 고릅니다.</p>`,
      [{ label: '결제 실패 테스트', run: () => { setTimeout(() => (onFail || payFail)(), 0); } }, { label: '결제 승인', kind: 'pri', run: () => { setTimeout(done, 0); } }]); }
  window.lshopPG = pgWindow; /* v40 시설 예약(lfac.js)도 같은 결제창 흐름을 쓴다 */
  function payFail() { shModal('결제가 완료되지 않았습니다', `<p class="mini">다음을 먼저 확인해 주세요.</p><ul class="shp-chk"><li>팝업 차단 해제 — 결제창은 팝업으로 열립니다.</li><li>크롬(Chrome) 브라우저 권장</li><li>방문 기록 · 쿠키(캐시) 삭제 후 다시 시도</li><li>카드 한도 초과 · 잔액 부족 여부</li><li>카드 유효기간 만료 여부</li><li>법인카드는 개인 결제 제한 여부</li><li>해외 카드는 국내 결제 모듈에서 결제가 어려울 수 있습니다${(SHOP() || { pg: {} }).pg.intl ? '(이 홈페이지는 VISA · Master 해외카드 결제를 지원합니다)' : ''}.</li></ul><p class="mini">해결되지 않으면 홈페이지 운영자에게 오류 내용을 알려 주세요.</p>`, [{ label: '닫기', kind: 'pri' }]); }

  /* ── 결제 완료 · 결제 상세 · 결제 관리 ── */
  /* v33 R2(#20): 결제 직후 첫 강의(단원 머리 제외)로 바로 간다 */
  const firstHref = ref => { const c = ((typeof SITE === 'function' ? SITE() : LR.site) || {}).classes; const lc = (c || []).find(x => x.id === ref); const L = ((lc && lc.items) || []).filter(x => x.type !== 'chapter'); const r = (((LR.lp || {}).cls || {})[ref] || {}).items || {}; const fi = L.find(x => !(r[x.id] || {}).done) || L[0]; return '#c/' + ref + (fi ? '/' + fi.id : ''); };
  function viewPayOk(pid) { const R = mine(); const p = R.pays.find(x => x.id === pid); if (!p) return sec('결제 결과', '<p class="empty">결제 정보를 찾지 못했습니다.</p>');
    const go = p.itemType === 'book' ? `<a class="lbtn pri" href="#mybooks">내 교재/교구</a>` : p.itemType === 'bill' ? '' : `<a class="lbtn pri" href="${esc(firstHref(p.ref))}">강의 보러 가기</a>`;
    return sec(p.status === '결제 대기' ? '입금을 기다리고 있습니다' : '결제가 완료되었습니다', `<div class="shp-done">${p.status === '결제 대기' && p.vacct ? `<p>아래 가상계좌로 <b>${esc(p.vacct.until)}</b>까지 ${won(p.amount)}을 입금해야 결제가 완료됩니다.</p><p class="shp-acct">${esc(p.vacct.bank)} <b>${esc(p.vacct.no)}</b> (예금주 ${esc(SITE().org.name)})</p><div class="shp-row"><button class="lbtn ghost sm" data-shact="vpaid" data-v="${esc(p.id)}">입금 완료(데모)</button></div>` : `<p>${esc(p.item)} · ${won(p.amount)} · ${esc(p.method || '')}</p>`}<div class="shp-row">${p.status === '결제 완료' ? go : ''}<a class="lbtn ghost" href="#payd/${esc(p.id)}">결제 상세</a><a class="lbtn ghost" href="#mypay">결제 관리</a></div></div>`); }
  function refundBlock(p, R) { const sh = SHOP() || { books: [] };
    if (p.refund && p.refund.state === '거절') return '환불이 거절된 건은 다시 신청할 수 없습니다. 운영자에게 문의하세요.';
    if (p.status !== '결제 완료') return '';
    if (p.itemType === 'bill') return '청구서 납부 건의 환불은 운영자에게 문의하세요.';
    if (p.itemType === 'book') { const b = sh.books.find(x => x.id === p.ref) || {}; const g = R.books[p.ref]; if (days(p.at, today()) > 7) return '결제일로부터 7일이 지나 환불을 신청할 수 없습니다.'; if (b.kind === '전자책' && g && g.dl > 0) return '전자책을 내려받은 이력이 있어 환불을 신청할 수 없습니다.'; if (b.kind !== '전자책' && R.ship[p.ref] && R.ship[p.ref].done) return '이미 전달받은 교재는 환불을 신청할 수 없습니다.'; }
    if (p.itemType === 'sub') { const s = R.subs.find(x => x.cls === p.ref); if (s && s.pay && s.pay !== p.id) return '구독은 현재 회차 결제만 환불을 신청할 수 있습니다.'; }
    return null; }
  const stTag = p => { const s = p.refund ? (p.refund.state === '신청' ? '환불 신청' : p.refund.state === '승인' ? (p.status === '부분 환불' ? '부분 환불' : '환불 완료') : '환불 거절') : p.status; return `<span class="tg ${/완료$/.test(s) && !/환불/.test(s) ? 'g' : /대기|신청/.test(s) ? 'y' : /거절|취소/.test(s) ? 'r' : ''}">${esc(s)}</span>${p.pending ? '<span class="tg">반영 중</span>' : ''}`; };
  function viewPayD(pid) { if (!LR.me) return needLogin('payd/' + pid); const R = mine(); const p = R.pays.find(x => x.id === pid); if (!p) return sec('결제 상세', '<p class="empty">결제 내역을 찾지 못했습니다.</p>', '<a href="#mypay">결제 관리</a>');
    const rb = refundBlock(p, R);
    const acts = [p.status === '결제 대기' ? `<button class="lbtn ghost sm" data-shact="pcancel" data-v="${esc(p.id)}">결제 취소</button>${p.vacct ? `<button class="lbtn ghost sm" data-shact="vpaid" data-v="${esc(p.id)}">입금 완료(데모)</button>` : ''}` : '', p.refund && p.refund.state === '신청' ? `<button class="lbtn ghost sm" data-shact="rcancel" data-v="${esc(p.id)}">환불 요청 취소</button>` : '', rb === null ? `<button class="lbtn pri sm" data-shact="refund" data-v="${esc(p.id)}">환불 신청</button>` : ''].join('');
    return sec('결제 상세', `<div class="shp-card2"><div class="shp-row sp"><b>${esc(p.item)}</b><span>${acts}</span></div>
      <dl class="shp-dl"><dt>결제 금액</dt><dd>${won(p.amount)}</dd><dt>결제 일시</dt><dd>${esc(p.at)}${p.refund && p.refund.at ? `<br><small class="mini">환불 신청일 ${esc(p.refund.at)}</small>` : ''}</dd><dt>결제 수단</dt><dd>${esc(p.method || '')}</dd><dt>결제 상태</dt><dd>${stTag(p)}</dd>${p.vacct ? `<dt>가상계좌</dt><dd>${esc(p.vacct.bank)} ${esc(p.vacct.no)} · ${esc(p.vacct.until)}까지</dd>` : ''}${p.ship ? `<dt>요청사항</dt><dd>${esc(p.ship)}</dd>` : ''}${p.refund ? `<dt>환불 사유</dt><dd>${esc(p.refund.reason || '')}</dd>${p.refund.state === '승인' ? `<dt>환불 금액</dt><dd>${won(p.refund.amount)} · ${esc(p.refund.done || '')}</dd>` : ''}${p.refund.note ? `<dt>거절 사유</dt><dd>${esc(p.refund.note)}</dd>` : ''}` : ''}</dl>
      ${rb ? `<p class="mini">${esc(rb)}</p>` : ''}${p.refund && p.refund.state === '신청' ? '<p class="mini">운영자가 승인하면 환불이 완료됩니다. 카드 결제 취소 · 금액 반환은 영업일 기준 며칠 걸릴 수 있습니다.</p>' : ''}</div>`, '<a href="#mypay">결제 관리</a> › 결제 상세'); }
  /* v43 R4(103): 기간 칩 → 숨은 #py26p 값 · change 이벤트(lles26 필터) */
  document.addEventListener('click', e => { const b = e.target.closest('[data-py26p]'); if (!b) return; const i = document.getElementById('py26p'); if (!i) return; i.value = b.dataset.py26p; b.parentElement.querySelectorAll('button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); i.dispatchEvent(new Event('change', { bubbles: true })); });
  function viewMyPay(tb) { if (!LR.me) return needLogin('mypay'); tb = tb || (LR.me.kind === 'parent' ? 'bill' : 'pay'); const R = mine(); const sh = SHOP() || { classes: [] };
    if (tb === 'pay' && typeof window.ledgerOn === 'function' && window.ledgerOn()) { setTimeout(() => { if (/^#mypay(\/pay)?$/.test(location.hash)) location.replace('#ledger/hist'); }, 0); return sec('결제 내역', `<p class="empty" role="status">결제 내역으로 이동하고 있어요… <a href="#ledger/hist">바로 가기</a></p>`); } /* v43 K2(P3-F02): 결제 내역은 #ledger/hist 한 목록(청구서 수납 + 강좌 · 교재 구매) */
    const par = LR.me.kind === 'parent'; if (par && !['bill', 'pay', 'refund'].includes(tb)) tb = 'bill'; const tabs = par ? [['bill', '청구서'], ['pay', '결제 내역'], ['refund', '환불 내역']] : [['pay', '결제 내역'], ['refund', '환불 내역'], ['sub', '구독 관리'], ['bill', '청구서']]; /* v38 보호자: 청구서 먼저, 구독 관리 없음(QA K13) */
    const nm = id => ((sh.classes.find(c => c.id === id) || {}).name) || '구독 클래스';
    let body = '';
    if (tb === 'pay') { const pend = R.bills.filter(b => b.status === '미납');
      body = (R.pays.length && typeof window.ledgerOn === 'function' && window.ledgerOn() ? `<p class="py43lk">${ico('brief', 16)}<span>기관이 보낸 청구서 결제 · 영수증은 <a href="#ledger/hist">결제 화면</a>에 따로 모여 있어요.</span></p>` : '') + (pend.length ? `<h3 class="shp-h">결제 대기</h3><ul class="shp-list">${pend.map(b => `<li><a href="#bill/${esc(b.id)}"><span><b>${esc(b.title)}</b><small>청구서 · 마감 ${esc(b.due)}</small></span><span>${won(b.items.reduce((a, i) => a + (+i[1] || 0), 0))} <span class="tg y">결제 대기</span></span></a></li>`).join('')}</ul>` : '') +
        /* v43 R4(103): 결제 내역 = 8+4 두 열. 왼쪽: 기간 칩(#py26p 값은 숨은 입력 — lles26 필터 그대로) · 검색 · 아바타 행(강좌 · 교재 · 구독 아이콘, 결제 번호 · 수단 · 유형, 금액 · 상태)
           오른쪽: 숫자 3 · 월별 결제 막대(6개월) · 결제 수단 분포 · 영수증 · 환불 안내. 행 선택자(.py26t a.py26r · data-at · data-q)와 상세(#payd) 링크는 그대로. */
        (R.pays.length ? (() => { const P = R.pays; const ok = P.filter(p => !/환불 완료/.test(p.status || '')); const sum = ok.reduce((a, p) => a + (+p.amount || 0), 0);
          const d0 = new Date(); const M = [...Array(6)].map((_, i) => { const d = new Date(d0.getFullYear(), d0.getMonth() - 5 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
          const mv = M.map(m => ok.filter(p => String(p.at || '').slice(0, 7) === m).reduce((a, p) => a + (+p.amount || 0), 0));
          const meth = {}; P.forEach(p => { const k = p.method || '기타'; meth[k] = (meth[k] || 0) + 1; });
          const icn = p => p.itemType === 'book' ? 'book' : p.itemType === 'sub' || /구독/.test(p.item || '') ? 'layers' : 'video';
          const rows = P.map(p => `<a class="py26r r4row" role="row" href="#payd/${esc(p.id)}" data-at="${esc(String(p.at || '').slice(0, 10))}" data-q="${esc(String(p.item || '').toLowerCase())}">${R4.av(p.item, icn(p))}<span class="r4t" role="cell"><small>${esc(String(p.at || '').slice(0, 10) || '—')} · ${/구독|정기/.test((p.kind || '') + (p.item || '')) || p.sub || p.itemType === 'sub' ? '정기 결제' : '일반 결제'}</small><b>${esc(p.item)}</b><span class="py26no">${esc(String(p.id).slice(-10).toUpperCase())} · ${esc(p.method || '결제')}</span></span><span class="r4m" role="cell"><b>${won(p.amount)}</b>${stTag(p)}</span></a>`).join('');
          /* v43 R8 103: 기간 칩 · 검색은 표 카드 안 도구줄로(위 탭과 두 줄 칩이 겹치지 않게), 표 아래 영수증 묶음 */
          const bar = `<div class="py26bar r4bar py43bar"><input type="hidden" id="py26p" value="">${R4.chips([['', '전체'], ['1', '1개월'], ['3', '3개월'], ['6', '6개월']], '', 'data-py26p')}<label class="r4q">${ico('search', 16)}<input type="search" id="py26q" placeholder="강좌 · 교재 이름으로 찾기" aria-label="결제 내역 검색"></label></div>`;
          const okL = ok.filter(p => p.amount > 0); const rcp = [['receipt', '카드 영수증', `${okL.filter(p => /카드|토스|페이/.test(p.method || '')).length}건`, '결제마다 내려받을 수 있어요'], ['doc', '거래명세서', `${okL.length}건`, '회사 제출용 · 사업자 정보 포함'], ['card', '현금영수증', '신청 시 발급', '계좌이체 결제에서 신청해요']];
          const left = R4.card(R4.head('결제 내역', `<span id="py26c">${P.length}건</span>`, '<a href="#ledger/hist">영수증 모아 보기</a>'), `${bar}<div class="py26t" role="table" aria-label="결제 내역">${rows}</div>`, { cls: 'flush' })
            + `<div class="py43rc">${rcp.map(([i, t, n, d]) => `<a href="#ledger/hist"><i>${ico(ICP[i] ? i : 'brief', 20)}</i><span><b>${t}</b><small>${d}</small></span><em>${n}</em></a>`).join('')}</div>`
            + (R.subs.length ? R4.card(R4.head('다음 결제 예정', `구독 ${R.subs.length}개`, '<a href="#mypay/sub">구독 관리</a>'), `<ul class="r4list">${R.subs.map(x => { const c = sh.classes.find(y => y.id === x.cls) || {}; return `<li><span>${ico('layers', 16)}</span><span>${esc(nm(x.cls))}<small>${esc(x.status)}${x.next ? ` · 다음 결제 ${esc(x.next)}` : ''}${c.price ? ` · ${won(c.price)}` : ''}</small></span></li>`; }).join('')}</ul>`) : '');
          const side = R4.card(R4.head('이번 학기 결제'), `<div class="r4ks" style="--n:2">${R4.kpi(R4.won(sum), '원', '누적 결제액')}${R4.kpi(P.filter(p => p.refund).length, '건', '환불')}</div><div style="margin-top:18px"><div class="py43ch">${R4.cols(mv, M.map(m => +m.slice(5) + '월'), v => v >= 10000 ? (Math.round(v / 1000) / 10).toLocaleString('ko-KR') + '만' : R4.won(v))}</div><p class="py43cn">${mv.filter(Boolean).length ? `최근 6개월 중 ${mv.filter(Boolean).length}개월 결제 · 월평균 ${R4.won(Math.round(mv.reduce((a, b) => a + b, 0) / Math.max(1, mv.filter(Boolean).length)))}원` : '최근 6개월 결제가 없어요'}</p></div>`)
            + R4.card(R4.head('결제 수단'), R4.bars(Object.entries(meth).map(([k, v]) => [k, v, v + '건'])))
            + R4.card(R4.head('영수증 · 환불'), `<ul class="r4list"><li><span>${ico('receipt', 16)}</span><span>결제 상세에서 카드 영수증 · 현금영수증을 내려받아요<small>회사 제출용 거래명세서도 같은 곳에 있어요</small></span></li><li><span>${ico('clock', 16)}</span><span>수강 시작 7일 안, 진도 10% 미만이면 전액 환불<small>그 뒤에는 남은 기간 비율로 계산해요</small></span></li></ul>`, { cls: 'tint' });
          return `<div class="r4g"><div>${left}</div><div>${side}</div></div>`; })() : (typeof window.ledgerOn === 'function' && window.ledgerOn() ? `<div class="empty2 py43to"><p>청구서 결제와 영수증은 <b>결제</b> 화면에 있어요.</p><a class="lbtn pri" href="#ledger/hist">결제 화면으로</a></div>` : '<ul class="shp-list"><li class="empty">결제 내역이 없습니다.</li></ul>')); }
    if (tb === 'refund') body = `<ul class="shp-list">${R.pays.filter(p => p.refund).map(p => `<li><a href="#payd/${esc(p.id)}"><span><b>${esc(p.item)}</b><small>신청 ${esc(p.refund.at)} · ${esc(p.refund.reason || '')}${p.refund.note ? ` · 거절 사유: ${esc(p.refund.note)}` : ''}</small></span><span>${p.refund.state === '승인' ? won(p.refund.amount) : ''} ${stTag(p)}</span></a></li>`).join('') || '<li class="empty">환불 내역이 없습니다.</li>'}</ul>`;
    if (tb === 'sub') body = `<ul class="shp-list">${R.subs.map(s => { const c = sh.classes.find(x => x.id === s.cls) || {}; const cnt = c.subsc ? +c.subsc.count || 0 : 0; return `<li><div class="shp-li"><span><b>${esc(nm(s.cls))}</b><small>${esc(s.status)} · ${s.n || 1}회차${cnt ? `/${cnt}` : ''} · 시작 ${esc(s.start || '')}${s.status === '구독중' ? ` · 다음 결제일 ${esc(s.next || '')}` : s.status === '해지 예약' ? ` · ${esc(s.next || s.end || '')}까지 수강 가능` : ''}</small></span><span>${s.status === '구독중' ? `<button class="lbtn ghost sm" data-shact="subpm" data-v="${esc(s.id)}">결제 수단 변경</button><button class="lbtn ghost sm" data-shact="subcancel" data-v="${esc(s.id)}" data-c="${esc(s.cls)}">구독 취소</button>` : s.status === '해지' && (!cnt || (s.n || 0) < cnt) ? `<a class="lbtn ghost sm" href="#pay/sub/${esc(s.cls)}">다시 구독</a>` : ''}${s.pending ? '<span class="tg">반영 중</span>' : ''}</span></div></li>`; }).join('') || '<li class="empty">구독 중인 클래스가 없습니다.</li>'}</ul><p class="mini">구독 취소는 환불이 아니라 다음 결제부터 자동 결제를 멈추는 기능입니다. 이번 결제 기간은 끝까지 수강할 수 있습니다.</p>`;
    if (tb === 'bill') body = `<ul class="shp-list">${R.bills.map(b => `<li><a href="#bill/${esc(b.id)}"><span><b>${esc(b.title)}</b><small>마감 ${esc(b.due)}${b.payAt ? ` · 납부 ${esc(b.payAt)}` : ''}</small></span><span>${won(b.items.reduce((a, i) => a + (+i[1] || 0), 0))} <span class="tg ${b.status === '미납' ? 'y' : 'g'}">${b.status === '미납' ? '결제 대기' : esc(b.status)}</span>${b.pending ? '<span class="tg">반영 중</span>' : ''}</span></a></li>`).join('') || '<li class="empty">받은 청구서가 없습니다.</li>'}</ul>`;
    return sec('결제 관리', `<nav class="shp-tabs">${tabs.map(([k, l]) => `<a href="#mypay/${k}" class="${tb === k ? 'on' : ''}">${l}</a>`).join('')}</nav>${body}`, '<a href="#my">마이페이지</a> › 결제 관리'); }

  /* ── 청구서(알림톡 [납부하러 가기] 링크 — 로그인 없이 열림) ── */
  function viewBill(id) { const doc = roomDoc(); let b = doc && (doc.bills || []).find(x => x.id === id); if (LR.mode === 'live' && LR.mine && LR.mine.shop) b = (LR.mine.shop.bills || []).find(x => x.id === id) || b;
    if (!b) return sec('청구서', '<p class="empty">청구서를 찾지 못했습니다. 링크가 만료되었거나 잘못되었습니다.</p>');
    b = { ...b }; if (b.status === '미납' && qAll().some(x => x.type === 'bill-pay' && (x.data || {}).billId === id)) { b.status = '납부 완료'; b.pending = true; }
    const tot = b.items.reduce((a, i) => a + (+i[1] || 0), 0); const m = (doc && (doc.members || []).find(x => x.id === b.who)) || {}; const sh = SHOP() || { pg: {} };
    return sec(b.title, `<div class="shp-card2"><p class="mini">${esc(SITE().org.name)} · ${esc(m.name || '')} 님 · 납부 마감 <b>${esc(b.due)}</b></p>
      <table class="shp-tb"><thead><tr><th>청구 항목</th><th>금액</th></tr></thead><tbody>${b.items.map(i => `<tr><td>${esc(i[0])}</td><td>${won(i[1])}</td></tr>`).join('')}</tbody><tfoot><tr><th>합계</th><th>${won(tot)}</th></tr></tfoot></table>
      ${b.status === '미납' ? `${b.due < today() ? '<div class="shp-warn">납부 마감일이 지났습니다. 지금 납부하거나 운영자에게 문의하세요.</div>' : ''}<fieldset class="shp-mth"><legend>결제 수단</legend>${[['신용카드', '신용카드 · 체크카드'], ['계좌이체', '실시간 계좌이체'], ['간편결제', '간편결제']].map(([v, l], i) => `<label><input type="radio" name="bm" value="${v}" ${i ? '' : 'checked'}> ${l}</label>`).join('')}</fieldset><button class="lbtn pri blk" data-shact="billpay" data-v="${esc(b.id)}">${won(tot)} 납부하기</button>${sh.pg.use !== 'toss' ? '<p class="mini">청구서 결제는 토스페이먼츠로 처리됩니다.</p>' : ''}`
        : `<p class="shp-ok">${esc(b.status)}${b.payAt ? ` · ${esc(b.payAt)}` : ''}${b.method ? ` · ${esc(b.method)}` : ''}${b.pending ? ' (반영 중)' : ''}</p>${b.items.some(i => i[2]) ? '<p class="mini">청구서에 연결된 클래스 · 교재는 납부 후 수강 권한이 생깁니다.</p>' : ''}`}</div>`, LR.me ? '<a href="#mypay/bill">청구서</a>' : '청구서'); }

  /* ── 교재/교구 ── */
  function viewBooks() { const sh = SHOP(); if (!sh) return noShop(); const R = mine(); const L = sh.books.filter(b => visible(b, R));
    return sec('교재/교구', `<p class="lead">클래스만으로 부족한 내용을 교재/교구로 채워 보세요. 전자책은 결제 후 내려받고, 실물 교재/교구는 운영자가 직접 전달합니다.</p><div class="shp-grid">${L.map(b => `<a class="shp-card" href="#tb/${esc(b.id)}">${thumb(b)}<div class="shp-cb"><div class="shp-tags"><span class="tg">${esc(b.kind === '전자책' ? '전자책' : '실물 교재/교구')}</span>${R.books[b.id] ? '<span class="tg g">보유</span>' : ''}</div><h3>${esc(b.name)}</h3><p class="mini">${esc((b.authors || []).map(a => a.name).join(', '))}</p><div class="shp-pr">${priceHTML(b)}</div></div></a>`).join('') || '<p class="empty">판매 중인 교재/교구가 없습니다.</p>'}</div>`); }
  function viewBook(id) { const sh = SHOP(); if (!sh) return noShop(); const R = mine(); const b = sh.books.find(x => x.id === id); if (!b || !visible(b, R)) return sec('교재/교구', '<p class="empty">교재를 찾지 못했습니다.</p>', '<a href="#textbooks">교재/교구</a>');
    const g = R.books[id]; const eb = b.kind === '전자책'; const f = priceOf(b); let cta;
    if (!LR.me) cta = `<a class="lbtn pri blk" href="#login/tb/${esc(id)}">로그인하고 ${f ? '구매' : '신청'}하기</a>`;
    else if (g) cta = eb ? dlBtn(b, g) : `<p class="shp-ok">신청 완료 · ${esc(g.at)}${R.ship[id] && R.ship[id].done ? ' · 전달 완료' : ' · 전달 대기'}</p><a class="lbtn ghost blk" href="#mybooks">내 교재/교구</a>`;
    else if (gradeBlock(R) && f) cta = `<div class="shp-warn">${esc(gradeBlock(R))}</div>`;
    else if (f && sh.pg.use === 'none') cta = '<button class="lbtn blk" disabled>결제 준비 중</button>';
    else if (f) cta = `<a class="lbtn pri blk" href="#pay/book/${esc(id)}">구매하기 · ${won(f)}</a>`;
    else cta = `<button class="lbtn pri blk" data-shact="bookfree" data-v="${esc(id)}">${eb ? '무료로 받기' : '무료 신청'}</button>`;
    /* v26.4 피그마 User Page › 교재/교구 상세: 🔔 안내 상자 · 📚 교재 소개 · ✨ 저자 소개(카드) */
    const nb = eb ? ['직접 파일을 다운받는 전자책이에요.', [`PDF 파일로 제공되며, 결제 후 마이페이지 › 내 교재/교구에서 직접 내려받을 수 있어요.`, `결제 직후 ${(b.dl && b.dl.days) || 30}일까지 ${b.dl && +b.dl.limit ? `최대 ${b.dl.limit}회` : '자유롭게'} 다운로드할 수 있으며, 그 이후에는 다운로드 버튼이 비활성화돼요.`, '환불 신청은 결제일로부터 7일 동안 가능하나, 한 번이라도 교재를 다운로드한 이력이 있으면 환불할 수 없어요.']]
      : ['운영자가 직접 전달하는 실물 교재/교구예요.', ['결제(신청) 후 운영자가 오프라인 · 택배로 전달해요. 전달 방법은 운영자에게 문의하세요.', '환불 신청은 결제일로부터 7일 동안 가능하나, 이미 전달받았다면 환불할 수 없어요.']];
    return sec(b.name, `<div class="shp-det"><div class="shp-main">${thumb(b, 'big')}<div class="tb26n"><b>${esc(nb[0])}</b><ul>${nb[1].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${b.intro ? `<h2 class="tb26h">교재를 소개합니다.</h2><p>${nl(b.intro)}</p>` : ''}${(b.authors || []).length ? `<h2 class="tb26h">저자를 소개합니다.</h2><div class="tb26a">${b.authors.map(a => `<div class="tb26p"><span class="tb26av" aria-hidden="true">${esc(String(a.name || '저').slice(0, 1))}</span><div><b>${esc(a.name)}</b><p>${nl(a.bio || '')}</p></div></div>`).join('')}</div>` : ''}</div>
      <aside class="shp-side"><div class="shp-pr big">${priceHTML(b)}</div>${b.file && eb ? `<small class="mini">PDF · ${(b.file.size / 1048576).toFixed(1)}MB</small>` : ''}${cta}<p class="mini">교재 배송 · 내용 문의는 이 홈페이지 운영자에게 해 주세요.</p></aside></div>`, '<a href="#textbooks">교재/교구</a> › ' + esc(b.name)); }
  const dlLeft = (b, g) => (b.dl && +b.dl.limit) ? Math.max(0, +b.dl.limit - (g.dl || 0)) : Infinity;
  const dlBtn = (b, g) => { if (g.hold) return '<p class="mini">환불 신청 중이라 내려받을 수 없습니다.</p>'; if (g.until < today()) return `<button class="lbtn blk" disabled>다운로드 기간 만료(${esc(g.until)})</button>`; if (!dlLeft(b, g)) return '<button class="lbtn blk" disabled>다운로드 횟수를 모두 썼습니다</button>'; return `<button class="lbtn pri blk" data-shact="dl" data-v="${esc(b.id)}">다운로드</button><small class="mini">${esc(g.until)}까지${dlLeft(b, g) !== Infinity ? ` · 남은 횟수 ${dlLeft(b, g)}회` : ''} · ${g.dl || 0}회 받음</small>`; };
  function viewMyBooks() { if (!LR.me) return needLogin('mybooks'); const sh = SHOP() || { books: [] }; const R = mine(); const L = sh.books.filter(b => R.books[b.id]);
    return sec('내 교재/교구', `<ul class="shp-list">${L.map(b => { const g = R.books[b.id]; const s = R.ship[b.id] || {}; return `<li><div class="shp-li"><span><b>${esc(b.name)}</b><small>${b.kind === '전자책' ? `전자책 · 다운로드 기간 ${esc(g.at)} ~ ${esc(g.until)} · ${g.dl || 0}회 받음` : `실물 · 주문일 ${esc(g.at)} · ${s.done ? '전달 완료' : '전달 대기'}${s.memo ? ` · 요청사항: ${esc(s.memo)}` : ''}`}</small></span><span>${b.kind === '전자책' ? dlBtn(b, g).replace(/ blk/g, ' sm') : !s.done ? `<button class="lbtn ghost sm" data-shact="ship" data-v="${esc(b.id)}">배송지 · 요청사항 수정</button>` : ''}${g.pending ? '<span class="tg">반영 중</span>' : ''}</span></div></li>`; }).join('') || '<li class="empty">구매한 교재/교구가 없습니다. <a href="#textbooks">교재/교구 둘러보기</a></li>'}</ul><p class="mini">배송 · 교재 내용 문의는 홈페이지 운영자에게 해 주세요.</p>`, '<a href="#my">마이페이지</a> › 내 교재/교구'); }

  /* ── 동작 ── */
  function push(type, data) { if (typeof lpxPush !== 'function') { toast('지금은 요청을 보낼 수 없습니다.', 'bad'); return null; } return lpxPush(type, data); }
  const vacct = () => ({ bank: ['우리은행', '신한은행', 'KB국민은행'][Math.floor(Math.random() * 3)], no: '5' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0').replace(/(\d{3})(\d{6})(\d{3})/, '$1-$2-$3'), until: addD(today(), 3) });
  /* v38 A-17 쿠폰 적용: 데모는 이 브라우저의 기관 데이터, 운영은 서버가 확인(코드 목록은 학습자에게 보내지 않는다) */
  document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-lcpn]'); if (!b) return; e.preventDefault(); const f = b.closest('#shpPay'); if (!f) return; const id = f.dataset.id; const sh = SHOP(); const x = sh && sh.classes.find(c => c.id === id); if (!x) return;
    const msg = (t, ok) => { const m = f.querySelector('#p26cpm'); if (m) { m.textContent = t; m.className = 'mini ' + (ok ? 'ok' : 'bad'); } }; const code = (f.querySelector('[name=cpn]') || {}).value || ''; const base = priceOf(x); let R;
    try { if (LR.mode === 'live') R = await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/coupon`, { code, cls: id }); else { const doc = roomDoc() || {}; const k = cpnNorm(code); const used = (doc.pays || []).filter(p => p && cpnNorm(p.cpn) === k && !/취소/.test(p.status || '')).length; R = cpnCalc(doc.coupons || [], code, id, base, used, today()); } } catch (er) { R = { ok: false, msg: errMsg(er, '쿠폰을 확인하지 못했어요. 잠시 뒤 다시 해 주세요.') }; }
    const dd = f.querySelectorAll('.p26amt dd'); if (!R || !R.ok) { delete f.dataset.cpn; delete f.dataset.final; if (dd[1]) dd[1].textContent = (+x.price || 0) - base ? '-' + won((+x.price || 0) - base) : '0원'; if (dd[2]) dd[2].innerHTML = `<b>${won(base)}</b>`; msg((R && R.msg) || '쓸 수 없는 쿠폰이에요.', false); return; }
    f.dataset.cpn = R.code; f.dataset.final = String(R.final); if (dd[1]) dd[1].textContent = '-' + won((+x.price || 0) - base + R.off); if (dd[2]) dd[2].innerHTML = `<b>${won(R.final)}</b>`; msg(`쿠폰 ${R.code} 적용 — ${R.label} · ${won(R.off)} 할인돼요.`, true); });
  document.addEventListener('input', e => { const i = e.target; if (!i || i.name !== 'cpn') return; const f = i.closest('#shpPay'); if (f && f.dataset.cpn) { delete f.dataset.cpn; delete f.dataset.final; const m = f.querySelector('#p26cpm'); if (m) m.textContent = '코드를 바꿨어요. [적용]을 다시 눌러 주세요.'; const x = ((SHOP() || {}).classes || []).find(c => c.id === f.dataset.id); const dd = f.querySelectorAll('.p26amt dd'); if (x) { const b0 = priceOf(x); if (dd[1]) dd[1].textContent = (+x.price || 0) - b0 ? '-' + won((+x.price || 0) - b0) : '0원'; if (dd[2]) dd[2].innerHTML = `<b>${won(b0)}</b>`; } } });
  document.addEventListener('submit', e => { const f = e.target; if (f.id !== 'shpPay') return; e.preventDefault(); e.stopImmediatePropagation(); if (pv()) return;
    const kind = f.dataset.kind, id = f.dataset.id; const sh = SHOP(); const x = kind === 'book' ? sh.books.find(b => b.id === id) : sh.classes.find(c => c.id === id); if (!x) return;
    if (!f.agree.checked) { const er = f.querySelector('.p26err'); if (er) { er.hidden = false; f.agree.focus(); } else toast('결제 동의에 체크하세요.', 'warn'); return; }
    const ship = f.ship ? f.ship.value.trim() : ''; if (f.ship && x.req && x.req.must && !ship) { toast('배송지 · 요청사항을 입력하세요.', 'warn'); f.ship.focus(); return; }
    const method = (f.querySelector('[name=m]:checked') || {}).value || '신용카드'; const cpn = kind === 'class' && f.dataset.cpn ? f.dataset.cpn : ''; const amount = cpn ? Math.max(0, +f.dataset.final || 0) : priceOf(x); /* v38 A-17: 적용한 쿠폰 — 운영 서버 · 운영자 화면이 다시 계산해 확인한다 */ const payId = rid('pay'); const itemType = kind === 'book' ? 'book' : kind === 'sub' ? 'sub' : 'class';
    const data = { payId, itemType, ref: id, item: x.name, amount, method, ship, ...(cpn ? { cpn } : {}), start: f.start ? f.start.value : '', subId: kind === 'sub' ? rid('sb') : '' };
    pgWindow(x.name, amount, () => { if (method === '가상계좌') { data.status = '결제 대기'; data.vacct = vacct(); } else data.status = '결제 완료'; push('pay', data); toast(data.status === '결제 대기' ? '가상계좌가 발급되었습니다. 기한 안에 입금하세요.' : '결제가 완료되었습니다.', 'ok'); location.hash = '#payok/' + payId; });
  }, true);
  document.addEventListener('click', e => { const el = e.target.closest('[data-shact],[data-shf]'); if (!el) return; e.preventDefault();
    if (el.dataset.shf) { LR.shopF = { ...(LR.shopF || {}), [el.dataset.shf]: el.dataset.v, q: ($('#shpQ') || {}).value || '' }; lrender(); return; }
    const k = el.dataset.shact, v = el.dataset.v; if (pv()) return;
    if (k === 'apply') { if (!LR.me) { location.hash = '#login/class/' + v; return; } const c = clsOf(v); push('enroll-req', { cls: v, mode: modeOf(c), name: c ? c.name : '' }); try { localStorage.setItem(apKey(v), new Date().toISOString()); } catch (x) { } location.hash = '#applied/' + encodeURIComponent(v); return; }
    if (k === 'apcancel') { push('enroll-req-cancel', { cls: v }); try { localStorage.removeItem(apKey(v)); } catch (x) { } toast('신청을 취소했어요.', 'ok'); lrender(); return; }
    if (k === 'enroll' && UNIV() && LR.me) { push('enroll', { cls: v }); location.hash = '#applied/' + encodeURIComponent(v); return; } /* v43 K2(P2-C1): 대학 비교과 신청 → 신청 완료 화면 → 내 학습 */
    if (k === 'enroll') { if (!LR.me) { location.hash = '#login/class/' + v; return; } push('enroll', { cls: v }); const on = (() => { try { const e = (mine().enr || {})[v]; return !!(e && e.status === 'active'); } catch (x) { return false; } })(); toast(on ? '수강 신청이 완료되었습니다. 바로 학습을 시작할 수 있어요.' : '수강 신청이 완료되었습니다.', 'ok'); if (on) { location.hash = '#c/' + encodeURIComponent(v); return; } lrender(); } /* v38 신청 뒤 같은 상세 화면에 머물던 것 → 바로 강좌로(QA V15) */
    if (k === 'vpaid') { push('vacct-paid', { payId: v }); toast('입금이 확인되었습니다(데모).', 'ok'); lrender(); }
    if (k === 'pcancel') shModal('결제 취소', `<label class="fl">취소 사유<select name="r"><option>결제 수단 변경</option><option>단순 변심</option><option>중복 주문</option><option>기타</option></select></label>`, [{ label: '닫기' }, { label: '결제 취소', kind: 'pri', run: w => { push('pay-cancel', { payId: v, reason: w.querySelector('[name=r]').value }); toast('결제를 취소했습니다.', 'ok'); setTimeout(lrender, 0); } }]);
    if (k === 'refund') { const R = mine(); const p = R.pays.find(x => x.id === v); if (!p) return; const rb = refundBlock(p, R); if (rb) { toast(rb, 'warn'); return; } const sh = SHOP() || {};
      shModal('환불 신청', `<p class="mini">${esc(p.item)} · ${won(p.amount)}</p><label class="fl">환불 사유<select name="r"><option>단순 변심</option><option>수강 일정 변경</option><option>콘텐츠 내용 불만족</option><option>중복 결제</option><option>기타</option></select></label><label class="fl">상세 사유(선택)<input name="d" maxlength="100"></label>
        <div class="shp-pol2"><b>환불 규정</b><p class="mini">${sh.policy && sh.policy.text ? nl(String(sh.policy.text).slice(0, 600)) : '환불은 홈페이지 환불 운영 정책에 따라 승인 여부와 환불 금액이 달라질 수 있습니다.'}</p><p class="mini">환불을 신청하는 즉시 해당 ${p.itemType === 'book' ? '교재를 이용' : '클래스를 수강'}할 수 없습니다. 승인 전에는 신청을 취소할 수 있습니다.</p></div><label class="shp-agree"><input type="checkbox" name="ok"> 환불 규정을 확인했고 동의합니다.</label>`,
        [{ label: '취소' }, { label: '확인', kind: 'pri', run: w => { if (!w.querySelector('[name=ok]').checked) { toast('환불 규정에 동의하세요.', 'warn'); return false; } const r = w.querySelector('[name=r]').value + (w.querySelector('[name=d]').value.trim() ? ' — ' + w.querySelector('[name=d]').value.trim() : ''); push('refund-req', { payId: v, reason: r }); toast('환불을 신청했습니다. 운영자 승인 후 완료됩니다.', 'ok'); setTimeout(lrender, 0); } }]); }
    if (k === 'rcancel') { if (!confirm('환불 요청을 취소할까요?')) return; push('refund-cancel', { payId: v }); toast('환불 요청을 취소했습니다.', 'ok'); lrender(); }
    if (k === 'billpay') { const doc = roomDoc(); const b = doc && (doc.bills || []).find(x => x.id === v); if (!b) return; const m = (document.querySelector('[name=bm]:checked') || {}).value || '신용카드'; const tot = b.items.reduce((a, i) => a + (+i[1] || 0), 0);
      pgWindow(b.title, tot, () => { push('bill-pay', { billId: v, method: m }); toast('납부가 완료되었습니다.', 'ok'); lrender(); }); }
    if (k === 'subcancel') shModal('구독 취소', '<p>구독을 취소하면 이번 결제 기간이 끝날 때까지 수강할 수 있고, 다음 달부터 자동 결제가 중단됩니다. 결제한 금액이 환불되지는 않습니다.</p>', [{ label: '닫기' }, { label: '구독 취소', kind: 'pri', run: () => { push('sub-cancel', { subId: v, cls: el.dataset.c }); toast('구독을 취소했습니다(해지 예약).', 'ok'); setTimeout(lrender, 0); } }]);
    if (k === 'subpm') shModal('결제 수단 변경', `<p class="mini">다음 정기 결제부터 새 카드로 결제됩니다. <!-- 운영: 토스 빌링키 재발급 --></p><label class="fl">카드번호(데모)<input inputmode="numeric" maxlength="19" placeholder="0000-0000-0000-0000"></label>`, [{ label: '닫기' }, { label: '변경', kind: 'pri', run: () => { toast('결제 수단을 변경했습니다(데모).', 'ok'); } }]);
    if (k === 'dl') { const sh = SHOP(); const b = sh.books.find(x => x.id === v); const g = mine().books[v]; if (!b || !g) return; if (g.until < today() || !dlLeft(b, g) || g.hold) { toast('지금은 내려받을 수 없습니다.', 'warn'); return; }
      push('book-dl', { bookId: v }); /* 운영: 서명된 URL(유효 시간 제한)로 PDF 내려받기 */
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`${b.name}\n\n데모 전자책입니다. 실제 운영에서는 운영자가 올린 PDF(${b.file ? b.file.name : '파일'})가 내려받아집니다.\n${SITE().org.name}`], { type: 'text/plain' })); a.download = `${b.name}_데모.txt`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('다운로드를 시작했습니다. 다운로드 후에는 환불할 수 없습니다.', 'ok'); setTimeout(lrender, 50); }
    if (k === 'bookfree' || k === 'ship') { const sh = SHOP(); const b = sh.books.find(x => x.id === v); if (!b) return; const R = mine(); if (gradeBlock(R) && k === 'bookfree' && priceOf(b) > 0) return;
      if (b.kind === '전자책' && k === 'bookfree') { push('book-free', { bookId: v }); toast('교재를 받았습니다. 내 교재/교구에서 내려받으세요.', 'ok'); lrender(); return; }
      if (!(b.req && b.req.on) && k === 'bookfree') { push('book-free', { bookId: v }); toast('신청이 완료되었습니다.', 'ok'); lrender(); return; }
      shModal(k === 'ship' ? '배송지 · 요청사항 수정' : '교재/교구 신청', `<label class="fl">${esc((b.req && b.req.q) || '배송지 · 요청사항')}${b.req && b.req.must ? ' (필수)' : ''}<textarea name="m" rows="3" maxlength="300">${esc((R.ship[v] || {}).memo || '')}</textarea></label>`, [{ label: '닫기' }, { label: k === 'ship' ? '저장' : '신청', kind: 'pri', run: w => { const m = w.querySelector('[name=m]').value.trim(); if (b.req && b.req.must && !m) { toast('내용을 입력하세요.', 'warn'); return false; } push(k === 'ship' ? 'book-ship' : 'book-free', { bookId: v, memo: m }); toast(k === 'ship' ? '저장했습니다.' : '신청이 완료되었습니다.', 'ok'); setTimeout(lrender, 0); } }]); }
  });
  document.addEventListener('input', e => { if (e.target.id !== 'shpQ') return; const q = e.target.value.trim().toLowerCase(); LR.shopF = { ...(LR.shopF || {}), q: e.target.value }; let n = 0; $$('.shp-grid .shp-card').forEach(c => { const on = !q || c.dataset.s.includes(q); c.hidden = !on; if (on) n++; }); const no = $('#shpNo'); if (no) no.hidden = n > 0; });

  /* v43 K2(P2-C1): 신청 완료 — 확정(바로 내 학습) · 승인 대기 · 추첨 대기를 한 화면에서. 다음 할 일 버튼 2개 */
  function viewApplied(id) { if (!LR.me) return needLogin('class/' + id); const c = clsOf(id); if (!c) return sec('신청', '<p class="empty">신청한 프로그램을 찾지 못했어요.</p><a class="lbtn ghost" href="#courses">프로그램 보기</a>');
    const R = mine(); const st = enrState(c, R); const ap = apState(id, R); const md = modeOf(c); const on = st === 'active'; const nm = UNIV() ? '프로그램' : '강좌';
    const step = (n, h, d, s) => `<li class="ap43-s ${s}"><b aria-hidden="true">${s === 'done' ? ico('check', 16) : n}</b><span><strong>${h}</strong>${d}</span></li>`;
    const steps = on ? [step(1, '신청', '신청이 접수됐어요', 'done'), step(2, '확정', md === 'fcfs' ? '선착순으로 자리가 확정됐어요' : '승인 · 선정이 끝났어요', 'done'), step(3, '내 학습', `내 학습에 ${nm}이 들어왔어요`, 'done')]
      : [step(1, '신청', '신청이 접수됐어요', 'done'), step(2, md === 'lottery' ? '추첨' : '승인', ap === 'rej' ? (md === 'lottery' ? '이번에는 선정되지 않았어요' : '승인되지 않았어요') : md === 'lottery' ? `신청 기간${c.recruit && c.recruit.to ? `(${esc(c.recruit.to)})` : ''}이 끝나면 추첨해요` : '담당자가 확인하고 있어요', ap === 'rej' ? 'bad' : 'now'), step(3, '내 학습', '확정되면 내 학습에 바로 보여요', '')];
    const h = on ? '신청이 완료되었어요' : ap === 'rej' ? '신청 결과를 알려 드려요' : '신청을 받았어요';
    const lead = on ? `「${esc(c.name)}」 ${nm}을 지금 바로 시작할 수 있어요.` : ap === 'rej' ? '대기 신청하면 자리가 났을 때 순서대로 알려 드려요.' : `「${esc(c.name)}」 신청을 받았어요. 결과는 알림으로 알려 드려요.`;
    return sec('신청 완료', `<div class="ap43" role="status"><span class="ap43-ic" aria-hidden="true">${ico(on ? 'check' : 'clock', 28)}</span><h2>${h}</h2><p class="lead">${lead}</p>${seatTxt(c) ? `<p class="mini">${esc(seatTxt(c))} · 모집 방식 ${MODE[md]}</p>` : ''}
      <ol class="ap43-st" aria-label="신청 진행 단계">${steps.join('')}</ol>
      <div class="ap43-b">${on ? `<a class="lbtn pri" href="#c/${esc(id)}">바로 시작하기</a><a class="lbtn ghost" href="#my">내 학습에서 보기</a>` : `<a class="lbtn pri" href="#my">내 학습에서 보기</a><a class="lbtn ghost" href="#class/${esc(id)}">${nm} 안내로</a>`}</div></div>`, `<a href="#class/${esc(id)}">${esc(c.name)}</a> › 신청 완료`); }
  /* ── 라우터 · 셸 · 마이페이지 감싸기 ── */
  const ROUTES = { shop: () => viewShop(), class: b => viewClass(b), pay: (b, r) => viewPay(b, r[1]), payok: b => viewPayOk(b), payd: b => viewPayD(b), mypay: b => viewMyPay(b), bill: b => viewBill(b), textbooks: () => viewBooks(), tb: b => viewBook(b), mybooks: () => viewMyBooks(), applied: b => viewApplied(b) };
  const CUR = { applied: 'my', shop: 'shop', class: 'shop', pay: 'shop', payok: 'my', payd: 'my', mypay: 'my', bill: 'my', textbooks: 'textbooks', tb: 'textbooks', mybooks: 'my' };
  function gateCourse(id) { const sh = SHOP(); if (!sh || !LR.me || LR.mode === 'preview') return ''; const c = sh.classes.find(x => x.id === id); if (!c || (priceOf(c) <= 0 && c.kind !== 'sub')) return ''; const R = mine(); const st = enrState(c, R);
    if (st === 'active') return ''; const msg = st === 'hold' ? '환불 신청 중이라 수강할 수 없습니다. 승인 전에는 결제 상세에서 환불 요청을 취소할 수 있습니다.' : st === 'ended' ? '수강 기간이 종료되었습니다.' : '수강 신청(결제) 후 들을 수 있는 클래스입니다.';
    return sec(c.name, `<div class="gate">${ico('lock', 28)}<h2>${st === 'hold' ? '환불 신청 중' : st === 'ended' ? '수강 기간 종료' : '수강 신청이 필요합니다'}</h2><p class="lead">${esc(msg)}</p><a class="lbtn pri" href="${st === 'hold' ? '#mypay/refund' : '#class/' + esc(id)}">${st === 'hold' ? '환불 내역 보기' : '클래스 상세 보기'}</a></div>`, '<a href="#shop">클래스</a>'); }
  { const base = lrender; lrender = function (...a) { try {
      const app = $('#lapp'); const r = route(); const parts = decodeURIComponent(location.hash.slice(1)).split('/').slice(1);
      if (SITE() && (ROUTES[r.a] || (r.a === 'c' && gateCourse(r.b)))) { if (typeof PLAYER !== 'undefined' && PLAYER && PLAYER.stop) PLAYER.stop(); if (typeof bkStop === 'function') bkStop(); shClose();
        const inner = r.a === 'c' ? gateCourse(r.b) : ROUTES[r.a](r.b, parts); document.body.className = 'look-' + (SITE().look || 'clean') + (LR.mode === 'preview' ? ' pv' : '');
        app.innerHTML = shell(inner, CUR[r.a] || 'shop'); document.title = `${SITE().org.name} · ${r.a === 'textbooks' || r.a === 'tb' ? '교재/교구' : '클래스'}`; if (!location.hash.includes('/') || ['class', 'tb', 'pay', 'payok', 'bill'].includes(r.a)) window.scrollTo(0, 0); return; }
    } catch (e) { console.error(e); } return base.apply(this, a); }; }
  { const base = shell; shell = function (inner, cur, ...a) { let h = base.call(this, inner, cur, ...a); const sh = SHOP(); if (!sh) return h; const R = LR.me ? mine() : { m: null, enr: {}, books: {} };
      const nC = sh.classes.filter(c => visible(c, R) && !c.tossTemp).length, nB = sh.books.filter(b => visible(b, R)).length;
      const add = (nC ? `<a href="#shop" class="${cur === 'shop' ? 'on' : ''}">클래스</a>` : '') + (nB ? `<a href="#textbooks" class="${cur === 'textbooks' ? 'on' : ''}">교재/교구</a>` : '');
      if (add) h = h.replace('</nav><div class="acct">', add + '</nav><div class="acct">'); return h; }; }
  const apCard = () => { const A = window.shApplies(); if (!A.length) return ''; return `<section class="sec mypage shp-my ap43-my"><div class="in"><div class="mycard"><div class="mh"><h3>신청한 ${UNIV() ? '프로그램' : '강좌'} ${A.length}개</h3></div><ul class="shp-list sm">${A.map(x => `<li><a href="#class/${esc(x.id)}"><span>${esc(x.name)}</span><span class="tg ${x.st === 'rej' ? 'r' : 'y'}">${x.st === 'rej' ? (x.mode === 'lottery' ? '미선정' : '미승인') : x.st === 'ok' ? '선정 · 결제 대기' : x.mode === 'lottery' ? '추첨 대기' : '승인 대기'}</span></a></li>`).join('')}</ul></div></div></section>`; };
  { const base = viewMy; viewMy = function (...a) { const h0 = base.apply(this, a); if (!LR.me) return h0; let ac = ''; try { ac = apCard(); } catch (e) { } const h = h0 + ac; if (!SHOP()) return h; let R; try { R = mine(); } catch (e) { return h; }
      const unpaid = R.bills.filter(b => b.status === '미납').length + R.pays.filter(p => p.status === '결제 대기').length; const rq = R.pays.filter(p => p.refund && p.refund.state === '신청').length; const subs = R.subs.filter(s => s.status !== '해지').length; const nb = Object.keys(R.books).length;
      return h + `<section class="sec mypage shp-my"><div class="in"><div class="mygrid"><div class="mycard"><div class="mh"><h3>결제 관리</h3></div><ul class="shp-list sm"><li><a href="#mypay/pay"><span>결제 내역</span><span>${R.pays.length}건${unpaid ? ` <span class="tg y">결제 대기 ${unpaid}</span>` : ''}</span></a></li><li><a href="#mypay/refund"><span>환불 내역</span><span>${R.pays.filter(p => p.refund).length}건${rq ? ` <span class="tg y">진행 ${rq}</span>` : ''}</span></a></li><li><a href="#mypay/sub"><span>구독 관리</span><span>${subs}건</span></a></li><li><a href="#mypay/bill"><span>청구서</span><span>${R.bills.length}건</span></a></li></ul></div>
        <div class="mycard"><div class="mh"><h3>내 교재/교구</h3></div><p class="mini">${nb ? `보유 ${nb}개 · 전자책은 기간 안에 여러 번 내려받을 수 있습니다.` : '아직 구매한 교재/교구가 없습니다.'}</p><a class="lbtn ghost sm" href="#mybooks">내 교재/교구</a> <a class="lbtn ghost sm" href="#textbooks">둘러보기</a></div></div></div></section>`; }; }
  /* 운영자 반영(데이터룸 갱신) 즉시 다시 그리기 */
  addEventListener('storage', e => { if (!e.key || !LR.tid) return; if (e.key === 'didisam.room.' + LR.tid && MY.includes(route().a) && !document.getElementById('shpModal') && !(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) lrender(); });
})();
