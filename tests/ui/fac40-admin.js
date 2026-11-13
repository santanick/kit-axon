'use strict';
/* v40 시설 · 장비 예약 — 스튜디오(운영자) 화면 점검
   계산 벡터 대조 → 유형별 프리셋 · 템플릿 → 등록 → 게시 → 예약 현황 → 현장 예약 · 중복 거절 → 승인 → 체크인(코드 · 이용권 1일 1회) → 노쇼 자동 취소 · 되살리기
   → 현장 결제 → 환불 계산(수정 사유 필수) → 반납 · 연체 → 정산 · CSV → AI SAM 7종 → 교강사 제한 → 운영 서버 실패 안내 → 키오스크 → PC 1440 · 390 넘침 0 · pageerror 0 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const VEC = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fac-vectors.json'), 'utf8'));
const SHOTS = process.env.FAC_SHOTS || '';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1'); await new Promise(k => srv.once('listening', k));
  const B = `http://127.0.0.1:${srv.address().port}`; const browser = await chromium.launch(); const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' });

  /* ① 계산 벡터(화면 계산 = 서버 · Java와 같은 값) */
  const V = await p.evaluate(V => { const F = window.facCalc; const fac = x => typeof x === 'string' ? V.facilities[x] : x, pr = x => typeof x === 'string' ? V.products[x] : x;
    const sub = (o, e) => e === null || typeof e !== 'object' ? o === e : Object.keys(e).every(k => JSON.stringify(o[k]) === JSON.stringify(e[k]));
    const run = { quote: i => F.quote({ ...i, fac: fac(i.fac), product: i.product ? pr(i.product) : undefined }), slots: i => { const L = F.slotsOf(fac(i.fac), i.day); return { count: L.length, first: L[0], last: L[L.length - 1] }; }, slotTime: i => F.slotTime(fac(i.fac), i.day, i.startSlot, i.slots), openState: i => F.openState(fac(i.fac), i.day, i.now), refund: i => F.refund({ ...i, rule: typeof i.rule === 'string' ? V.facilities[i.rule].refund : i.rule }), lateFee: i => F.lateFee(i), noShow: i => F.isNoShow(i), suspension: i => F.suspension(i), dupSame: i => F.dupSame(i.existing, i.req) };
    const bad = []; let n = 0; for (const k in run) for (const v of V[k] || []) { n++; let e = v.out; if (k === 'slotTime') e = { startAt: Date.parse(e.startAt), endAt: Date.parse(e.endAt) }; if (k === 'slots' && !e.first) e = { count: e.count }; const o = run[k](v.in); if (!sub(o, e)) bad.push(k + ':' + (v.name || '') + ' ' + JSON.stringify(o)); } return { n, bad }; }, VEC);
  ok(V.n >= 30 && !V.bad.length, `계산 벡터 ${V.n}개 일치 ` + V.bad.join(' | '));

  /* ② 유형별 메뉴 · 기본 템플릿 */
  const P = await p.evaluate(() => { const out = {}; for (const [ty, ed] of [['univ', 'lite'], ['corp'], ['k12'], ['public']]) { createOrg(ty, '점검', ed); out[ty] = { on: menuOn('fac'), tpl: S.fac.tpl, n: S.fac.facilities.length, verify: S.fac.facilities[0].verify, pay: S.fac.facilities[0].pay, appr: S.fac.facilities[0].approval }; } return out; });
  ok(P.univ.on && P.univ.tpl === 'univ' && P.univ.verify === 'sid' && P.univ.appr && P.univ.pay === 'free', '대학: 학번 확인 · 무료 · 승인제 ' + JSON.stringify(P.univ));
  ok(P.corp.on && P.corp.tpl === 'corp' && P.corp.verify === 'none', '기업: 회의실 ' + JSON.stringify(P.corp));
  ok(P.k12.on && P.k12.tpl === 'room' && P.public.on && P.public.tpl === 'sports', '학원 · 공공(스포츠센터) 템플릿 ' + P.k12.tpl + '/' + P.public.tpl);
  /* 기존 저장 사용자(upgradeState): S.fac 없음 → 기본값 · 메뉴 자리 */
  const U = await p.evaluate(() => { createOrg('adult', '예전 기관'); delete S.fac; Object.values(S.nav.tabs).forEach(L => { const i = L.findIndex(x => x.id === 'fac'); if (i >= 0) L.splice(i, 1); }); upgradeState(); return { fac: !!S.fac && S.fac.facilities.length > 0, nav: Object.values(S.nav.tabs).flat().some(x => x.id === 'fac') }; });
  ok(U.fac && U.nav, 'upgradeState: 기본값 · 메뉴 ' + JSON.stringify(U));

  /* ③ 스포츠센터: 등록 → 게시 */
  const td = await p.evaluate(() => { UI.facNow = today() + 'T14:20'; createOrg('public', '창원대 스포츠진흥원'); UI.facNow = today() + 'T14:20'; S.me.role = 'owner'; go('fac'); UI.fac = 'list'; render(); return today(); });
  await p.click('[data-act="fac-new"]'); await p.fill('#modal [name="n"]', '테니스 코트 C'); await p.click('#modal [data-mact="ok"]');
  const R1 = await p.evaluate(() => { const f = S.fac.facilities.find(x => x.name === '테니스 코트 C'); const el = document.querySelector('[data-k="prices.public.slot"]'); el.value = '12000'; el.dispatchEvent(new Event('change', { bubbles: true })); const cl = document.querySelectorAll('.fc-ed').length; return { id: f && f.id, sel: UI.facSel === (f && f.id), price: f && f.prices.public.slot, cl }; });
  ok(R1.id && R1.sel && R1.price === 12000 && R1.cl === 1, '등록 · 요금표 편집 ' + JSON.stringify(R1));
  await p.click('[data-act="fac-pub"]');
  const R2 = await p.evaluate(id => { const pub = S.lsite && S.lsite.pub && S.lsite.pub.fac; const f = pub && pub.facilities.find(x => x.id === id); return { has: !!f, price: f && f.prices.public.slot, noDemo: pub && !('demo' in pub) && !JSON.stringify(pub).includes('kioskPin'), online: pub && pub.facilities.every(x => x.pay !== 'online') }; }, R1.id);
  ok(R2.has && R2.price === 12000 && R2.noDemo && R2.online, '게시본: 공개 설정만 · 토스 키 없으면 온라인 숨김 ' + JSON.stringify(R2));
  /* 휴관 추가(영향 안내) */
  await p.evaluate(() => { UI.facSel = 'f_tennis'; render(); }); await p.click('[data-act="fac-cl-add"]'); const imp = await p.textContent('#fcImp'); await p.click('#modal [data-mact="ok"]');
  ok(/영향받는|취소됩니다/.test(imp), '휴관 영향 안내 ' + imp);
  ok(await p.evaluate(() => S.fac.facilities.find(x => x.id === 'f_tennis').closed.length === 1), '휴관 등록');
  if (SHOTS) { await p.evaluate(() => { UI.facSel = 'f_golf'; render(); }); await p.evaluate(() => { scrollTo(0, 0); const m = document.querySelector('#main'); if (m) m.scrollTop = 0; const t = document.querySelector('#toasts'); if (t) t.innerHTML = ''; }); await p.screenshot({ path: path.join(SHOTS, 'fac-07-facility.png') }); }

  /* ④ 예약 현황 타임라인 */
  const T = await p.evaluate(() => { UI.fac = 'tl'; render(); const b = [...document.querySelectorAll('.fc-blk')]; return { n: b.length, txt: b.map(x => x.textContent).join('|'), now: !!document.querySelector('.fc-now'), closed: document.querySelector('#main').innerText.includes('승인 대기') }; });
  ok(T.n > 5 && /확정|입장/.test(T.txt) && T.now && T.closed, '타임라인 블록 · 상태 글자 · 현재선 ' + T.n);
  if (SHOTS) await p.evaluate(() => { scrollTo(0, 0); const m = document.querySelector('#main'); if (m) m.scrollTop = 0; const t = document.querySelector('#toasts'); if (t) t.innerHTML = ''; }); await p.screenshot({ path: path.join(SHOTS, 'fac-08-timeline.png') });
  /* 현장 예약 등록 → 같은 칸 다시 → 거절 */
  const walk = async () => { await p.click('[data-act="fac-walk"]'); await p.selectOption('#modal [name="fr"]', 'f_golf|f_golf_r1'); await p.evaluate(() => { const s = document.querySelector('#modal [name="sm"]'); s.value = String(16 * 60); s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.selectOption('#modal [name="aud"]', 'public'); await p.fill('#modal [name="sid"]', '20239999'); await p.click('#modal [data-mact="ok"]'); };
  await p.evaluate(() => { S.fac.demo.bookings = S.fac.demo.bookings.filter(b => !(b.res === 'f_golf_r1' && b.sm < 17 * 60 && b.em > 16 * 60)); save(); });
  const n0 = await p.evaluate(() => S.fac.demo.bookings.length); await walk(); const n1 = await p.evaluate(() => S.fac.demo.bookings.length); await walk(); const n2 = await p.evaluate(() => S.fac.demo.bookings.length); await p.evaluate(() => closeModal());
  ok(n1 === n0 + 1 && n2 === n1, `현장 예약 등록 · 중복 거절 ${n0}/${n1}/${n2}`);
  const wb = await p.evaluate(() => S.fac.demo.bookings[S.fac.demo.bookings.length - 1]); ok(wb.payStatus === 'pending' && wb.amount === 8000 && wb.pay === 'onsite', '현장 예약 금액(일반 8,000원) · 현장 결제 대기 ' + wb.amount);

  /* ⑤ 승인 */
  const A = await p.evaluate(td => { S.fac.demo.bookings.push({ id: 'bk_t_req', fac: 'f_gym', res: 'f_gym_r1', day: td, sm: 15 * 60, em: 17 * 60, n: 80, sid: '20231111', who: '학생회', aud: 'student', status: 'requested', pay: 'free', amount: 0, payStatus: 'none', created: td + ' 09:00', label: '학생회 행사' }); UI.fac = 'appr'; render(); return document.querySelectorAll('[data-act="fac-approve"]').length; }, td);
  await p.click('[data-act="fac-approve"][data-v="bk_t_req"]');
  ok(A >= 1 && (await p.evaluate(() => S.fac.demo.bookings.find(b => b.id === 'bk_t_req').status)) === 'confirmed', '승인 대기함 → 승인');
  await p.click('[data-act="fac-reject"]').catch(() => { }); const rj = await p.evaluate(() => !!document.querySelector('#modal')); if (rj) { await p.click('#modal [data-mact="ok"]'); const still = await p.evaluate(() => !!document.querySelector('#modal')); ok(still, '반려 사유 없으면 막음'); await p.evaluate(() => closeModal()); }

  /* ⑥ 체크인: 코드 입력 · 결제 미수 · 이용권 1일 1회 */
  await p.evaluate(td => { S.fac.demo.bookings.push({ id: 'bk_t_in', fac: 'f_tennis', res: 'f_tennis_r1', day: td, sm: 14 * 60 + 30, em: 15 * 60 + 30, n: 1, sid: '20232222', who: '박*준', aud: 'student', status: 'confirmed', pay: 'onsite', amount: 4000, payStatus: 'paid' }, { id: 'bk_t_pay', fac: 'f_tennis', res: 'f_tennis_r2', day: td, sm: 14 * 60 + 30, em: 15 * 60 + 30, n: 1, sid: '20233333', who: '정*호', aud: 'public', status: 'confirmed', pay: 'onsite', amount: 10000, payStatus: 'pending' }); S.fac.facilities.find(f => f.id === 'f_tennis').closed = []; UI.fac = 'chk'; render(); }, td);
  await p.fill('#fcCode', 'bk_t_in'); await p.click('[data-act="fac-code"]');
  const C1 = await p.evaluate(() => ({ st: S.fac.demo.bookings.find(b => b.id === 'bk_t_in').status, res: document.querySelector('.fc-res') && document.querySelector('.fc-res').innerText }));
  ok(C1.st === 'checked_in' && /입장했어요/.test(C1.res), '체크인(코드 입력) ' + JSON.stringify(C1));
  await p.fill('#fcCode', 'bk_t_in'); await p.click('[data-act="fac-code"]'); ok(/이미 입장/.test(await p.textContent('.fc-res')), '같은 예약 재입장 거절');
  await p.fill('#fcCode', 'bk_t_pay'); await p.click('[data-act="fac-code"]'); ok(/현장 결제/.test(await p.textContent('.fc-res')), '현장 결제 미수 → 결제 후 입장 안내');
  await p.click('.fc-res [data-act="fac-paybk"]'); await p.click('#modal [data-mact="ok"]');
  ok(await p.evaluate(() => { const b = S.fac.demo.bookings.find(x => x.id === 'bk_t_pay'); return b.status === 'checked_in' && b.payStatus === 'paid' && S.fac.demo.pays.some(x => x.target.id === 'bk_t_pay' && x.amount === 10000); }), '결제 기록 후 입장');
  const ps = await p.evaluate(() => S.fac.demo.passes.find(x => x.kind === 'count' && x.used < x.total) || S.fac.demo.passes[0]);
  await p.evaluate(id => { const x = S.fac.demo.passes.find(y => y.id === id); x.lastIn = ''; x.starts = addDays(today(), -1); x.ends = addDays(today(), 20); if (x.kind === 'count') { x.total = 10; x.used = 2; } }, ps.id);
  await p.fill('#fcCode', ps.id); await p.click('[data-act="fac-code"]'); const pc1 = await p.textContent('.fc-res'); await p.fill('#fcCode', ps.id); await p.click('[data-act="fac-code"]'); const pc2 = await p.textContent('.fc-res');
  ok(/입장했어요/.test(pc1) && /1일 1회|오늘 이미/.test(pc2), '이용권 입장 · 1일 1회 ' + pc1 + ' / ' + pc2);
  await p.fill('#fcCq', '2222'); await p.click('[data-act="fac-cq"]'); ok(/박\*준/.test(await p.textContent('#main')), '학번 끝 4자리 검색');
  if (SHOTS) { await p.evaluate(() => { UI.facCq = ''; UI.facLast = { ok: true, msg: '입장했어요 · 테니스 코트 코트 A · 14:30–15:30', who: '박*준' }; render(); }); await p.evaluate(() => { scrollTo(0, 0); const m = document.querySelector('#main'); if (m) m.scrollTop = 0; const t = document.querySelector('#toasts'); if (t) t.innerHTML = ''; }); await p.screenshot({ path: path.join(SHOTS, 'fac-09-checkin.png') }); }

  /* ⑦ 노쇼 자동 취소(15분) · 3회 누적 정지 · 되살리기 */
  const N = await p.evaluate(td => { const D = S.fac.demo; D.bookings.push({ id: 'bk_t_ns', fac: 'f_golf', res: 'f_golf_r2', day: td, sm: 14 * 60, em: 15 * 60, n: 1, sid: '20234444', who: '한*결', aud: 'public', status: 'confirmed', pay: 'onsite', amount: 8000, payStatus: 'pending' }, { id: 'bk_t_ok', fac: 'f_golf', res: 'f_golf_r3', day: td, sm: 14 * 60 + 10, em: 15 * 60 + 10, n: 1, sid: '20235555', who: '최*린', aud: 'public', status: 'confirmed', pay: 'onsite', amount: 8000, payStatus: 'pending' }); D.noshowCnt['20234444'] = [addDays(td, -3), addDays(td, -9)];
    UI.fac = 'ns'; render(); const a = D.bookings.find(b => b.id === 'bk_t_ns'), b = D.bookings.find(b => b.id === 'bk_t_ok'); return { a: a.status, auto: a.auto, b: b.status, ban: D.bans['20234444'], log: D.log[0] && D.log[0].text }; }, td);
  ok(N.a === 'no_show' && N.auto && N.b === 'confirmed' && N.ban && /정지/.test(N.log), '노쇼 자동 취소(15분 경과만) · 3회 누적 정지 ' + JSON.stringify(N));
  await p.click('[data-act="fac-restore"][data-v="bk_t_ns"]'); ok((await p.evaluate(() => { render(); return S.fac.demo.bookings.find(b => b.id === 'bk_t_ns').status; })) === 'confirmed', '노쇼 되살리기(다시 자동 취소 안 됨)');

  /* ⑧ 환불: 월이용권 3회 사용 = 150,000 − 12,000×5 − 15,000 = 75,000 · 금액 수정은 사유 필수 */
  await p.evaluate(td => { const D = S.fac.demo; D.passes.push({ id: 'ps_t_m', product: 'p_m1', fac: 'f_gpass', name: '월이용권 1개월', sid: '20236666', who: '이*아', aud: 'public', kind: 'period', total: 0, used: 3, starts: td, ends: addDays(td, 29), status: 'active', paid: 150000 }); D.pays.push({ id: 'fp_t_m', target: { t: 'ps', id: 'ps_t_m' }, fac: 'f_gpass', label: '골프연습장 이용권', method: 'card_onsite', amount: 150000, list: 150000, receipt: 'R1', day: td, at: td + ' 10:00', by: '프론트', status: 'paid' }); UI.fac = 'ref'; render(); }, td);
  await p.click('[data-act="fac-ref"][data-v="fp_t_m"]'); const calc = await p.textContent('#modal .fc-calc');
  await p.fill('#modal [name="a"]', '70000'); await p.click('#modal [data-mact="ok"]'); const blocked = await p.evaluate(() => !!document.querySelector('#modal') && S.fac.demo.refunds.length === 0);
  await p.fill('#modal [name="why"]', '고객 요청 · 대표 승인'); await p.click('#modal [data-mact="ok"]');
  const RF = await p.evaluate(() => S.fac.demo.refunds[S.fac.demo.refunds.length - 1]);
  ok(/75,000원/.test(calc) && /일일권 12,000원 × 5회/.test(calc), '환불 공식 자동 계산 줄 ' + calc.replace(/\s+/g, ' '));
  ok(blocked && RF && RF.auto === 75000 && RF.amount === 70000 && RF.reason, '수정 사유 없으면 막고 · 있으면 확정 ' + JSON.stringify(RF && { a: RF.auto, m: RF.amount }));

  /* ⑨ 반납 · 연체 */
  const RT = await p.evaluate(() => { const r = S.fac.demo.rentals.find(x => x.status === 'overdue') || S.fac.demo.rentals.find(x => x.status === 'lent'); return r && r.id; });
  if (RT) { await p.evaluate(() => { UI.fac = 'ns'; render(); }); await p.click(`[data-act="fac-ret"][data-v="${RT}"]`); await p.click('#modal [data-mact="ok"]'); ok((await p.evaluate(id => S.fac.demo.rentals.find(x => x.id === id).status, RT)) === 'returned', '반납 확인'); }

  /* ⑩ 정산 · 통계 */
  const ST = await p.evaluate(() => { UI.fac = 'stat'; render(); const m = document.querySelector('#main').innerText; return { kpi: /총 매출/.test(m) && /노쇼/.test(m), bars: document.querySelectorAll('.fc-bc').length, heat: document.querySelectorAll('.fc-heat tbody tr').length, s: facStats(today().slice(0, 8) + '01', today()) }; });
  ok(ST.kpi && ST.bars >= 1 && ST.heat >= 4 && ST.s.rf >= 70000 && ST.s.total === ST.s.on + ST.s.off - ST.s.rf, '정산 KPI · 일별 막대 · 가동률 ' + JSON.stringify({ b: ST.bars, h: ST.heat, rf: ST.s.rf }));
  const CSV = await p.evaluate(() => { const base = downloadCSV; let got = null; downloadCSV = (n, c, r) => { got = { n, c, rows: r.length, neg: r.some(x => x[4] < 0) }; }; document.querySelector('[data-act="fac-csv"]').click(); downloadCSV = base; return got; });
  ok(CSV && /시설정산/.test(CSV.n) && CSV.rows > 5 && CSV.neg, 'CSV 내려받기(결제 + 환불 행) ' + JSON.stringify(CSV));
  if (SHOTS) await p.evaluate(() => { scrollTo(0, 0); const m = document.querySelector('#main'); if (m) m.scrollTop = 0; const t = document.querySelector('#toasts'); if (t) t.innerHTML = ''; }); await p.screenshot({ path: path.join(SHOTS, 'fac-10-stats.png') });

  /* ⑪ AI SAM 7종 */
  const AI = await p.evaluate(() => { go('fac'); const r = {}; const Q = { cl: '다음 주 화요일 체육관 휴관 처리', ns: '오늘 노쇼 몇 건이야', fee: '테니스 코트 평일 18시 이후 요금 3,000원 올려줘', fee2: '테니스 코트 요금 3,000원 올려줘', apr: '승인 대기 전부 승인해', ret: '반납 안 된 사물함 알려줘', use: '이번 달 체육관 이용률', open: '사물함 5월 신청 12일 09:00 오픈으로' };
    S.fac.demo.bookings.push({ id: 'bk_t_r2', fac: 'f_gym', res: 'f_gym_r1', day: addDays(today(), 2), sm: 600, em: 720, n: 1, sid: '2023x', who: '동아리', aud: 'student', status: 'requested', pay: 'free', amount: 0, payStatus: 'none', created: today() + ' 10:00' });
    for (const k in Q) { const a = answer(Q[k]) || {}; r[k] = { title: a.title || '', text: a.text || '', plan: a.plan || '', html: a.html || '' }; }
    const g = S.fac.facilities.find(f => f.id === 'f_gym'); const c0 = g.closed.length; if (r.cl.plan) PLANS[r.cl.plan].run(); r.clRun = g.closed.length === c0 + 1;
    const t = S.fac.facilities.find(f => f.id === 'f_tennis'); const p0 = t.prices.public.slot; if (r.fee2.plan) PLANS[r.fee2.plan].run(); r.feeRun = t.prices.public.slot === p0 + 3000;
    if (r.apr.plan) PLANS[r.apr.plan].run(); r.aprRun = !S.fac.demo.bookings.some(b => b.status === 'requested');
    const l = S.fac.facilities.find(f => f.id === 'f_locker'); if (r.open.plan) PLANS[r.open.plan].run(); r.openRun = l.windows.length === 1 && /-05-12$/.test(l.windows[0].from) && l.open.at === '09:00';
    r.chips = scxDefs('fac').map(x => x[1]); return r; });
  ok(AI.cl.plan && /체육관/.test(AI.cl.title) && /영향 예약/.test(AI.cl.text) && AI.clRun, 'SAM 휴관 처리 카드 → 실행 ' + AI.cl.title);
  ok(!AI.ns.plan && /노쇼는 \d+건/.test(AI.ns.text), 'SAM 노쇼 조회(바로 답) ' + AI.ns.text);
  ok(!AI.fee.plan && /시간대별 할증/.test(AI.fee.text) && AI.fee2.plan && /변경 전/.test(AI.fee2.html) && AI.feeRun, 'SAM 요금 변경(전 · 후 카드) · 시간대 할증은 미지원 안내');
  ok(AI.apr.plan && AI.aprRun, 'SAM 승인 대기 일괄 승인');
  ok(!AI.ret.plan && /반납되지 않은/.test(AI.ret.text), 'SAM 반납 조회 ' + AI.ret.text);
  ok(!AI.use.plan && /가동률/.test(AI.use.text) && /체육관/.test(AI.use.html), 'SAM 이용률 표');
  ok(AI.open.plan && /변경 전/.test(AI.open.html) && AI.openRun, 'SAM 오픈 시각 · 신청 기간');
  ok(AI.chips.length >= 4, 'SAM 화면 칩 ' + AI.chips.join(','));
  const AI2 = await p.evaluate(() => { S.fac.demo.rentals.push({ id: 'rt_t_o', fac: 'f_locker', res: 'f_locker_r12', product: 'p_lk', sid: '20237777', who: '윤*아', aud: 'student', from: addDays(today(), -40), due: addDays(today(), -2), returned: '', deposit: 0, status: 'overdue' }); const a = answer('연체 안내 보내') || {}; const n0 = S.fac.demo.notes.length; if (a.plan) PLANS[a.plan].run(); return { plan: !!a.plan, draft: /반납 기한/.test(a.html || ''), sent: S.fac.demo.notes.length > n0 }; });
  ok(AI2.plan && AI2.draft && AI2.sent, 'SAM 연체 안내(문구 초안 → 확인 후 발송) ' + JSON.stringify(AI2));

  /* ⑫ 교강사: 예약 현황 · 체크인 · 반납만 */
  const TC = await p.evaluate(() => { S.me.role = 'teacher'; UI.fac = 'list'; go('fac'); render(); const t = [...document.querySelectorAll('#main [data-key="fac"][role="tab"]')].map(b => b.dataset.v); const a = answer('다음 주 화요일 체육관 휴관 처리') || {}; S.me.role = 'owner'; return { t, deny: !a.plan }; });
  ok(TC.t.join() === 'tl,chk,ns' && TC.deny, '교강사 탭 제한 · 휴관 거절 ' + TC.t);

  /* ⑬ 운영 모드: /api/fac/* 실패 시 안내 */
  const LV = await p.evaluate(async () => { const calls = []; window.LIVE = { tenant: 't1', cfg: {} }; window.api = async (m, u) => { calls.push(m + ' ' + u); const e = new Error('없는 경로'); e.status = 404; e.code = 'not_found'; throw e; }; UI.fac = 'tl'; UI.facDay = today(); render(); await new Promise(k => setTimeout(k, 80)); const err = (document.querySelector('.fc-err') || {}).textContent || ''; delete window.LIVE; delete window.api; render(); return { calls, err }; });
  ok(LV.calls.some(c => c.startsWith('GET /api/fac/bookings?from=')) && /운영 서버의 시설 예약 기능에 연결하지 못했습니다\(404/.test(LV.err), '운영 모드 호출 · 실패 안내 ' + LV.calls[0]);

  /* ⑭ 키오스크: PIN 설정 → 입장 → PIN으로만 종료 */
  await p.evaluate(td => { S.fac.demo.bookings.push({ id: 'bk_t_k', fac: 'f_yoga', res: 'f_yoga_r1', day: td, sm: 14 * 60 + 30, em: 15 * 60 + 30, n: 1, sid: '20238888', who: '서*훈', aud: 'student', status: 'confirmed', pay: 'free', amount: 0, payStatus: 'none' }); UI.fac = 'chk'; render(); }, td);
  await p.click('[data-act="fac-kiosk"]'); await p.fill('#modal [name="p"]', '4321'); await p.click('#modal [data-mact="ok"]'); await p.waitForSelector('#facKiosk');
  await p.fill('#fcKin', 'bk_t_k'); await p.keyboard.press('Enter'); const kr = await p.textContent('#fcKres');
  await p.click('[data-kx]'); await p.fill('#modal [name="p"]', '0000'); await p.click('#modal [data-mact="ok"]'); const still = await p.evaluate(() => !!document.querySelector('#facKiosk'));
  await p.fill('#modal [name="p"]', '4321'); await p.click('#modal [data-mact="ok"]'); const gone = await p.evaluate(() => !document.querySelector('#facKiosk'));
  ok(/입장했어요/.test(kr) && still && gone, '키오스크 입장 · PIN 종료 ' + kr);

  /* ⑮ 화면 크기: 1440 · 390 가로 넘침 0, 버튼 높이 */
  const TABS = ['list', 'tl', 'appr', 'chk', 'pay', 'ref', 'ns', 'stat'];
  for (const w of [1440, 390]) { await p.setViewportSize({ width: w, height: 900 }); const o = await p.evaluate(T => { const bad = []; for (const t of T) { UI.fac = t; render(); if (document.documentElement.scrollWidth > innerWidth + 1) bad.push(t + ':' + document.documentElement.scrollWidth); } return bad; }, TABS); ok(!o.length, `${w}px 가로 넘침 0 ` + o.join(',')); }
  const small = await p.evaluate(() => { UI.fac = 'chk'; render(); return [...document.querySelectorAll('.fc .btn:not(.sm)')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).length; }); ok(small === 0, '주요 버튼 44px ' + small);
  if (SHOTS) { await p.setViewportSize({ width: 1440, height: 900 }); }

  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
