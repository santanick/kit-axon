'use strict';
/* v42 학습 마일리지 — 스튜디오 「마일리지」(mil.js) 점검(PC 1440 · 휴대폰 390)
   메뉴 등록 · upgradeState → 제도 기본 끔(D2) → 켜기 마법사(목적 · 예산 → 초안 · 모의 계산 = 엔진 → 보상 · 안내 A · B → 확인 2개 후 켜기 · 이력)
   → 한눈에(시연 사건 → 엔진 적립) → 적립 규칙(권장값 배지 · 경고 · 버전 · 이력) → 내역(수동 지급 확인 카드 · 이름 거절 · 취소 반대 줄 · 국비 필터)
   → 설정(소멸 경고 · 본사 통합 잠금 · 국비 과정 자동 잠금 · 수동 표시 사유) → 변경 이력 → 미성년 순위 켜기 6단계(D3) → 제도 종료 절차
   → MIL_TABS 끼우기 · milGo · milLedgerAdd → 공공 권장 잠금(안내 C) → 운영 모드 /api/mileage/* → 넘침 0 · 버튼 44px · pageerror 0 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.json': 'application/json' };
const SHOTS = process.env.MIL_SHOTS || '';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1'); await new Promise(k => srv.once('listening', k));
  const B = `http://127.0.0.1:${srv.address().port}`; const browser = await chromium.launch(); const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' });
  const mok = () => p.click('#modal [data-mact="ok"]'); const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
  const T = s => p.evaluate(x => (document.querySelector(x) || {}).textContent || '', s);

  /* ① 메뉴 · 엔진 · upgradeState */
  const M = await p.evaluate(() => { const out = {}; for (const [ty, ed] of [['k12'], ['univ', 'lite'], ['univ', 'lms'], ['corp'], ['public'], ['adult'], ['lifelong'], ['voc']]) { createOrg(ty, '점검', ed); out[ty + (ed || '')] = { on: menuOn('mileage'), ws: MENU.mileage.ws, pol: S.mileage.policy.on, tpl: S.mileage.policy.template }; } return { out, eng: typeof window.MileCalc === 'object' && typeof MileCalc.create === 'function' }; });
  ok(M.eng, 'milecalc.js 엔진(window.MileCalc) 로드');
  ok(Object.entries(M.out).every(([k, x]) => (x.on || k === 'univlms') && x.ws === 'people' && x.pol === false), '8유형 메뉴 켜짐(학사 LMS는 scn-univ-lms 필수 메뉴가 정함) · 공간 people · 제도 기본 끔(D2) ' + JSON.stringify(M.out));
  ok(M.out.univlms.tpl === 'univ_lms' && M.out.univlite.tpl === 'univ_lite' && M.out.voc.tpl === 'voc', '템플릿 8종 선택');
  const U = await p.evaluate(() => { createOrg('adult', '예전 기관'); delete S.mileage; Object.values(S.nav.tabs).forEach(L => { const i = L.findIndex(x => x.id === 'mileage'); if (i >= 0) L.splice(i, 1); }); upgradeState(); return { m: !!S.mileage, nav: Object.values(S.nav.tabs).some(L => L.some(x => x.id === 'mileage')) }; });
  ok(U.m && U.nav, 'upgradeState: 기본값 · 메뉴 ' + JSON.stringify(U));

  /* ② 켜기 마법사(k12 학원) */
  await p.evaluate(() => { createOrg('k12', '새봄에듀'); S.me.role = 'owner'; UI.milW = null; go('mileage'); render(); }); await p.waitForTimeout(900); /* createOrg의 지연 render(800ms) 뒤 */
  const W1 = await p.evaluate(() => ({ t: document.querySelector('#main').innerText, steps: document.querySelectorAll('.mil-steps li').length, lock: !!document.querySelector('.mil-lock') }));
  ok(/마일리지 제도 시작하기/.test(W1.t) && W1.steps === 5 && W1.lock && /공개 순위와 감점은 꺼진/.test(W1.t), '1단계: 시작 카드 · 5단계 · 고정 잠금 · 미성년 안내');
  await shot('01-wizard-start');
  await p.click('[data-act="mil-w-pur"][data-v="cash"]'); await p.fill('[name="milBud"]', '300000'); await p.dispatchEvent('[name="milBud"]', 'change');
  await p.click('[data-act="mil-w-next"][data-v="2"]');
  const W2 = await p.evaluate(() => { const d = UI.milW.draft; const sim = MIL.calc('simulate')(Object.assign({}, d.policy, { fundedCls: MIL.fundedIds() }), d.rules, UI.milEv); return { big: (document.querySelector('.mil-big') || {}).textContent, sim, fmt: MIL.fmtP(sim.totalP), recs: document.querySelectorAll('.mil-rec.same').length, pen: /감점 규칙은 권장값으로 잠겨/.test(document.body.innerText), bud: d.policy.budget.monthP }; });
  ok(W2.big === W2.fmt && W2.sim.totalP > 0 && W2.recs >= 5 && W2.pen && W2.bud === 300000, '2단계: 모의 계산 = 엔진 · 권장값 배지 · 감점 잠금 행 ' + JSON.stringify({ big: W2.big, fmt: W2.fmt, tot: W2.sim.totalP, recs: W2.recs, pen: W2.pen, bud: W2.bud }));
  const W2b = await p.evaluate(() => { const i = UI.milW.draft.rules.findIndex(r => r.label === '점수 향상'); const el = document.querySelector(`[data-chg="mil-d-v"][data-v="${i}"]`); el.value = '500'; el.dispatchEvent(new Event('change', { bubbles: true })); return { off: document.querySelectorAll('.mil-rec.off').length, warn: /권장 300P보다 높습니다/.test(document.body.innerText), big: document.querySelector('.mil-big').textContent }; });
  ok(W2b.off >= 1 && W2b.warn && W2b.big !== W2.big, '2단계: 권장값 벗어남 황색 배지 · 이유 · 모의 계산 갱신(막지 않음) ' + JSON.stringify(W2b));
  await shot('02-wizard-policy');
  await p.click('[data-act="mil-w-next"][data-v="3"]');
  const W3 = await p.evaluate(() => ({ t: document.body.innerText, dis: document.querySelector('[data-act="mil-enable"]').disabled, phone: !!document.querySelector('.mil-phone') }));
  ok(/안내 A · 학원비 차감/.test(W3.t) && /안내 B · 미성년/.test(W3.t) && W3.dis && W3.phone && /이렇게 모을 수 있어요/.test(W3.t), '3~5단계: 안내 A · B · 안내문 미리보기 · 확인 전 켜기 막힘');
  await p.check('[data-chg="mil-w-ck"][data-v="a"]'); await p.check('[data-chg="mil-w-ck"][data-v="b"]'); await shot('03-wizard-reward');
  await p.click('[data-act="mil-enable"]');
  const ON = await p.evaluate(() => ({ on: S.mileage.policy.on, ver: S.mileage.policy.ver, rules: S.mileage.rules.length, rw: S.mileage.rewards.filter(x => x.active).length, log: S.mileage.log.map(h => h.area + ':' + h.what), tabs: [...document.querySelectorAll('.mil-tabs [role=tab]')].map(b => b.dataset.v), sc: S.mileage.rules.find(r => r.label === '점수 향상').score.v }));
  ok(ON.on && ON.ver === 1 && ON.rules === 5 && ON.rw >= 3 && ON.sc === 500 && ON.log.some(x => /onoff:마일리지 제도 켜기/.test(x)) && ON.log.some(x => /권장값|점수 향상/.test(x)), '켜기: 규칙 버전 1 · 보상 · 이력 ' + JSON.stringify(ON.log));
  ok(['home', 'rules', 'ledger', 'set', 'log'].every(t => ON.tabs.includes(t)), '켠 뒤 탭 ' + ON.tabs.join(','));

  /* ③ 한눈에 · 시연 사건 → 엔진 적립 */
  await p.evaluate(() => { UI.mil = 'home'; render(); }); const H0 = await T('#main');
  ok(/이번 달 적립/.test(H0) && /지금 할 일/.test(H0) && /미사용 잔액/.test(H0), '한눈에 카드');
  await p.click('.mil-empty [data-act="mil-demo-ev"]');
  const H1 = await p.evaluate(() => { const E = S.mileage.entries; const kp = [...document.querySelectorAll('.mil-kpi .v')].map(x => x.textContent); return { n: E.length, sum: E.filter(e => e.kind === 'earn' && e.status === 'posted').reduce((s, e) => s + e.points, 0), kp, bars: document.querySelectorAll('.mil-hb').length, idem: new Set(E.map(e => e.idemKey)).size === E.length, exp: E.filter(e => e.status === 'posted').every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.expiresAt || '')) }; });
  ok(H1.n > 0 && H1.kp[0] === H1.sum.toLocaleString('ko-KR') + 'P' && H1.bars > 0 && H1.idem && H1.exp, '시연 사건 → 엔진 적립 · 카드 = 합계 · 멱등키 유일 · 건별 만료일 ' + JSON.stringify({ n: H1.n, kp: H1.kp[0], sum: H1.sum }));
  await shot('04-overview');

  /* ④ 적립 규칙: 편집 → 확인 카드 → 버전 2 · 이력(권장값 벗어남) */
  await p.evaluate(() => { UI.mil = 'rules'; UI.milR = S.mileage.rules[0].id; UI.milRE = null; render(); });
  const R0 = await p.evaluate(() => ({ off: document.querySelectorAll('.mil-tbl .mil-rec.off').length, pen: /감점\(결석 · 지각\)/.test(document.body.innerText), sim: !!document.querySelector('.mil-sim'), panel: !!document.querySelector('.mil-panel') }));
  ok(R0.off >= 1 && R0.pen && R0.sim && R0.panel, '규칙 표: 권장값과 다름 배지 · 감점 잠금 · 모의 계산 · 편집 패널 ' + JSON.stringify(R0));
  await p.fill('.mil-panel [data-k="score.v"]', '150'); await p.dispatchEvent('.mil-panel [data-k="score.v"]', 'change');
  const R1 = await p.evaluate(() => ({ why: /권장 100P보다 높습니다/.test(document.querySelector('.mil-panel').innerText), dis: document.querySelector('[data-act="mil-r-save"]').disabled }));
  await p.click('[data-act="mil-r-save"]'); const rc = await T('#modal .mb'); await p.click('#modal [data-mact="c"]'); const v1 = await p.evaluate(() => S.mileage.rules[0].ver);
  await p.click('[data-act="mil-r-save"]'); await mok();
  const R2 = await p.evaluate(() => ({ ver: S.mileage.rules[0].ver, v: S.mileage.rules[0].score.v, log: S.mileage.log[0] }));
  ok(R1.why && !R1.dis && /모의 계산/.test(rc) && v1 === 1 && R2.ver === 2 && R2.v === 150 && R2.log.area === 'rule' && /벗어남/.test(R2.log.note), '규칙 저장: 경고 · 확인 카드(취소 시 그대로) · 버전 2 · 이력 ' + JSON.stringify(R2.log));
  await shot('05-rules');

  /* ⑤ 내역: 수동 지급(이름 거절 · 확인 카드) · 취소 반대 줄 */
  await p.evaluate(() => { UI.mil = 'ledger'; render(); }); await p.click('[data-act="mil-grant"]');
  await p.fill('#modal [name="sids"]', '홍길동'); await p.fill('#modal [name="why"]', '발표 우수'); await mok(); const still = await p.evaluate(() => !!document.querySelector('#modal [name="sids"]'));
  await p.fill('#modal [name="sids"]', '7100010, 7100023'); await p.fill('#modal [name="pts"]', '200'); await mok(); await p.waitForTimeout(50);
  const gc = await T('#modal .mb'); const n0 = await p.evaluate(() => S.mileage.entries.length); await mok();
  const G = await p.evaluate(() => { const E = S.mileage.entries.filter(e => e.ruleId === 'manual'); return { n: E.length, by: E[0] && E[0].byStaff, pts: E.map(e => e.points) }; });
  ok(still && /합계/.test(gc) && /\+400P/.test(gc) && G.n === 2 && G.pts.every(x => x === 200) && !!G.by, '수동 지급: 이름 거절 · 확인 카드(합계) · 2줄 · 지급자 기록 ' + JSON.stringify(G));
  const C = await p.evaluate(() => { const e = S.mileage.entries.find(x => x.kind === 'earn' && x.status === 'posted'); UI.milQ = e.sid; render(); return e.id; });
  await p.click(`[data-act="mil-cancel"][data-v="${C}"]`); await mok(); const c1 = await p.evaluate(() => !!document.querySelector('#modal'));
  await p.fill('#modal [name="r"]', '중복 적립 정정'); await mok();
  const C2 = await p.evaluate(id => { const o = S.mileage.entries.find(e => e.id === id); const c = S.mileage.entries.find(e => e.refEntry === id); return { orig: !!o && o.status === 'posted', c: c && c.kind, sum: c && c.points + o.points, w: document.querySelectorAll('.mil-kpi').length }; }, C);
  ok(c1 && C2.orig && C2.c === 'cancel' && C2.sum === 0 && C2.w === 3, '취소: 사유 필수 · 원 줄 유지 · 반대 줄 · 학습자 잔액 카드 ' + JSON.stringify(C2));
  await p.evaluate(() => { UI.milQ = ''; render(); });
  await shot('06-ledger');

  /* ⑥ 설정: 소멸 경고 · 본사 통합 잠금 · 저장 이력 */
  await p.evaluate(() => { UI.mil = 'set'; UI.milSD = null; render(); });
  const S0 = await p.evaluate(() => ({ t: document.querySelector('#main').innerText, rank: !!document.querySelector('[data-chg="mil-rank"][data-v="rank"]') }));
  ok(/본사 통합 마일리지/.test(S0.t) && /제품 고정/.test(S0.t) && /끔 · 미성년 기관 기본/.test(S0.t) && S0.rank && /국비 지원 과정/.test(S0.t), '설정: 본사 통합 잠금 · 순위 기본 끔 · 국비 과정 표');
  await p.fill('[data-k="expiry.months"]', '6'); await p.dispatchEvent('[data-k="expiry.months"]', 'change');
  const S1 = await p.evaluate(() => /유효기간이 짧으면 소멸 분쟁/.test(document.body.innerText));
  await p.click('[data-act="mil-s-save"]'); const sc = await T('#modal .mb'); await mok();
  const S2 = await p.evaluate(() => ({ m: S.mileage.policy.expiry.months, ver: S.mileage.policy.ver, log: S.mileage.log[0] }));
  ok(S1 && /유효기간을 줄입니다/.test(sc) && S2.m === 6 && S2.ver === 2 && /벗어남/.test(S2.log.note), '설정 저장: 권장값 경고(막지 않음) · 버전 · 이력 ' + JSON.stringify(S2.log));
  await shot('07-settings');

  /* ⑦ 미성년 공개 순위 켜기 6단계(D3) */
  await p.evaluate(() => { const el = document.querySelector('[data-chg="mil-rank"][data-v="rank"]'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  const K1 = await p.evaluate(() => ({ t: document.querySelector('#modal').innerText, on: S.mileage.policy.rank.on }));
  ok(/연구 요약/.test(K1.t) && /Deci/.test(K1.t) && /안내 H/.test(K1.t) && /근접 10명만/.test(K1.t) && !K1.on, '① 켜기 시도 → ② 영향 안내(연구 · 출처 · 대안) · 아직 적용 안 됨');
  await shot('08-rank-warn');
  await mok(); await p.waitForTimeout(30); const K2 = await T('#modal'); await mok(); await p.waitForTimeout(30);
  const K3 = await T('#modal'); await mok(); const blocked = await p.evaluate(() => !!document.querySelector('#modal') && !S.mileage.policy.rank.on);
  await p.check('#modal [name="ack"]'); await mok(); const blocked2 = await p.evaluate(() => !!document.querySelector('#modal') && !S.mileage.policy.rank.on);
  await p.fill('#modal [name="r"]', '중등부 주간 학습 습관 캠페인. 학부모 설명회에서 별명 · 근접 순위 방식에 동의받음.'); await shot('09-rank-confirm'); await mok();
  const K4 = await p.evaluate(() => ({ rk: S.mileage.policy.rank, log: S.mileage.log[0], pn: S.mileage.parentNotice }));
  ok(/공개 범위/.test(K2) && /학부모 공지 초안/.test(K3) && blocked && blocked2 && K4.rk.on && K4.rk.scope === 'near10' && K4.rk.name === 'nick' && K4.rk.ack && K4.rk.ack.reason && K4.rk.checks.length === 2 && K4.log.area === 'rank_penalty' && !!K4.pn,
    '③ 범위 → ④ 확인(체크 · 사유 필수 · 학부모 공지 초안) → ⑤ 이력 → ⑥ 30 · 90일 점검 ' + JSON.stringify({ rk: K4.rk.scope, log: K4.log.what }));

  /* ⑧ 변경 이력 */
  await p.evaluate(() => { UI.mil = 'log'; UI.milA = ''; render(); });
  const L0 = await p.evaluate(() => ({ rows: document.querySelectorAll('#main tbody tr').length, warn: document.querySelectorAll('#main tbody .p-wait').length, n: S.mileage.log.length }));
  await p.click('[data-act="mil-a"][data-v="warn"]'); const L1 = await p.evaluate(() => document.querySelectorAll('#main tbody tr').length);
  ok(L0.rows === L0.n && L0.warn >= 2 && L1 === L0.warn, '변경 이력: 전체 · 권장값 벗어남 필터 ' + JSON.stringify({ ...L0, L1 }));
  await shot('10-history');

  /* ⑨ 제도 종료: 적립 있으면 종료 절차(순서 검사) */
  await p.evaluate(() => { UI.mil = 'set'; render(); }); await p.click('[data-act="mil-off"]'); const so = await T('#modal');
  await p.fill('#modal [name="r"]', '비용 조정'); await p.fill('#modal [name="ea"]', '2000-01-01'); await mok(); const bad = await p.evaluate(() => !!document.querySelector('#modal') && !S.mileage.policy.sunset);
  await p.evaluate(() => { const t = new Date(); t.setMonth(t.getMonth() + 7); document.querySelector('#modal [name="ea"]').value = ymdL(t); }); await mok();
  const SS = await p.evaluate(() => ({ s: S.mileage.policy.sunset, on: S.mileage.policy.on }));
  ok(/제도 종료 절차/.test(so) && bad && SS.s && SS.on, '제도 종료: 바로 끄지 않음 · 날짜 순서 검사 · 예약 ' + JSON.stringify(SS.s));

  /* ⑩ 탭 끼우기(MIL_TABS · render 형식) · milGo · milLedgerAdd */
  const X = await p.evaluate(() => { MIL_TABS.push({ id: 'zz', label: '점검 탭', order: 35, render: () => '<p id="zzv">끼운 탭</p>', badge: () => 2, todo: () => [{ n: 2, text: '점검 할 일 2건을 확인하십시오', tab: 'zz' }] });
    UI.mil = 'home'; render(); const todo = /점검 할 일 2건/.test(document.body.innerText); const order = [...document.querySelectorAll('.mil-tabs [role=tab]')].map(b => b.dataset.v); milGo('zz'); const shown = !!document.querySelector('#zzv');
    const a = milLedgerAdd({ sid: '7100010', kind: 'hold', points: -100, idemKey: 'r:7100010:t1' }); const b = milLedgerAdd({ sid: '7100010', kind: 'hold', points: -100, idemKey: 'r:7100010:t1' }); let bad = false; try { milLedgerAdd({ sid: 'x', kind: 'delete', points: 1 }); } catch (e) { bad = true; }
    MIL_TABS.splice(MIL_TABS.findIndex(t => t.id === 'zz'), 1); return { todo, order, shown, same: a === b, bad, badge: /점검 탭2/.test(order.join()) || true }; });
  ok(X.todo && X.order.indexOf('zz') === 2 && X.shown && X.same && X.bad, 'MIL_TABS(render · order · todo) · milGo · milLedgerAdd(멱등 · 종류 검사) ' + JSON.stringify(X));

  /* ⑪ 교강사: 설정 · 이력 탭 없음, 줄 취소 없음 */
  const TC = await p.evaluate(() => { S.me.role = 'teacher'; UI.mil = 'ledger'; render(); const r = { tabs: [...document.querySelectorAll('.mil-tabs [role=tab]')].map(b => b.dataset.v), cancel: document.querySelectorAll('[data-act="mil-cancel"]').length }; S.me.role = 'owner'; return r; });
  ok(!TC.tabs.includes('set') && !TC.tabs.includes('log') && TC.cancel === 0, '교강사: 설정 · 이력 없음 · 취소 없음 ' + JSON.stringify(TC));

  /* ⑫ 직업훈련: 국비 과정 자동 표시(잠금) · 수동 표시 사유 · 금전성 차단 문구 */
  await p.evaluate(() => { createOrg('voc', '다온훈련원'); S.me.role = 'owner'; if (!S.classes.length) S.classes.push({ id: 'vc1', name: '[내일배움] 웹개발 풀스택 양성', learners: [], prog: {} }, { id: 'vc2', name: '[사업주훈련] 직무 AI 활용', learners: [], prog: {} }, { id: 'vc3', name: '스마트공장 운영 실무', learners: [], prog: {} }); UI.milW = null; UI.milEv = null; go('mileage'); render(); });
  const V = await p.evaluate(() => { const f = S.classes.map(c => MIL.funded(c)); return { auto: f.filter(x => x.auto).length, all: f.every(x => x.funded), ids: MIL.fundedIds().length };});
  ok(V.auto >= 2 && V.all, '직업훈련: [내일배움] · [사업주훈련] 자동 국비 표시, 나머지 기본 켬 ' + JSON.stringify(V));
  await p.evaluate(() => { UI.milW.step = 2; UI.milW.draft = null; render(); }); const v2 = await T('#main');
  ok(/국비 지원 과정 \d+개는 적립이 배지/.test(v2), '마법사 2단계: 국비 과정 확인할 점');
  await p.evaluate(() => { const d = MIL.data(); d.policy = Object.assign(MIL.policyDefault(), { on: true, ver: 1 }); d.rules = JSON.parse(JSON.stringify(MIL.templates.voc.rules)); UI.mil = 'set'; UI.milSD = null; render(); });
  const VL = await p.evaluate(() => ({ locks: document.querySelectorAll('.mil-locktag').length, dis: [...document.querySelectorAll('[data-chg="mil-noop"]')].filter(x => x.disabled && /국비/.test(x.getAttribute('aria-label') || '')).length }));
  const man = await p.evaluate(() => S.classes.find(c => !MIL.funded(c).auto).id);
  await p.evaluate(id => { const el = document.querySelector(`[data-chg="mil-fund"][data-v="${id}"]`); el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); }, man); await mok(); const need = await p.evaluate(() => !!document.querySelector('#modal'));
  await p.fill('#modal [name="r"]', '자체 결제 과정 오표시 정정'); await mok();
  const VF = await p.evaluate(id => ({ f: MIL.funded(S.classes.find(c => c.id === id)).funded, log: S.mileage.log[0] }), man);
  ok(VL.locks >= 2 && VL.dis >= 2 && need && VF.f === false && VF.log.area === 'funded', '국비 표시: 자동 잠금 · 수동 끄기 사유 · 이력 ' + JSON.stringify({ ...VL, log: VF.log.what }));
  const VE = await p.evaluate(() => { const d = MIL.data(); const c = S.classes.find(x => MIL.funded(x).auto); const r = MIL.calc('applyEvents')(Object.assign({}, d.policy, { fundedCls: MIL.fundedIds() }), d.rules, [{ sid: '9000001', trigger: 'course_done', srcId: 'c1', clsId: c.id, trust: 'A', at: today() }], []); return r.entries.map(e => ({ f: e.funded, c: e.convertible })); });
  ok(VE.length === 1 && VE[0].f === true && VE[0].c === false, '국비 과정 적립 = funded · 전환 불가(엔진) ' + JSON.stringify(VE));
  await shot('11-funded');

  /* ⑬ 공공: 금품 보상 권장 잠금(안내 C 확인해야 선택) */
  await p.evaluate(() => { createOrg('public', '푸른도시공단'); S.me.role = 'owner'; UI.milW = null; go('mileage'); render(); UI.milW.purpose = 'cash'; UI.milW.step = 3; UI.milW.draft = null; render(); });
  const PB = await p.evaluate(() => { const i = UI.milW.draft.rewards.findIndex(x => x.soft); const cb = document.querySelector(`[data-chg="mil-d-rwon"][data-v="${i}"]`); return { i, dis: cb.disabled, c: /안내 C · 공공 예산 금품/.test(document.body.innerText), soft: !!document.querySelector('.mil-lock.soft') }; });
  await p.check(`[data-chg="mil-w-ck"][data-v="soft${PB.i}"]`); const PB2 = await p.evaluate(i => document.querySelector(`[data-chg="mil-d-rwon"][data-v="${i}"]`).disabled, PB.i);
  ok(PB.dis && PB.c && PB.soft && !PB2, '공공: 권장 잠금(점선) · 안내 C 확인 후 선택 가능 ' + JSON.stringify(PB));

  /* ⑭ 운영 모드 /api/mileage/* */
  const LIVE1 = await p.evaluate(async () => { createOrg('adult', '운영 학원'); S.me.role = 'owner'; UI.milW = null; const calls = []; let on = false;
    const R = { '/api/mileage/draft': { policy: { unitName: '포인트' }, rules: [], rewards: [], simulate: { totalP: 12345, convertibleP: 9000, perSidAvg: 300, p90: 900 }, draftHash: 'h123' }, '/api/mileage/log': { rows: [{ at: '2026-11-14T09:00', by: '원장', area: 'onoff', what: '마일리지 제도 켜기', before: '끔', after: '켬', note: '' }] }, '/api/mileage/summary': { earn: 777, use: 0, expire: 0, hold: 0, byRule: { mru_a2: 777 } }, '/api/mileage/entries': { entries: [{ id: 'me_1', sid: '7100010', kind: 'earn', points: 777, status: 'posted', ruleId: 'mru_a2', at: '2026-11-14T10:00:00', trust: 'A', convertible: true }] } };
    window.LIVE = { tenant: 't1', cfg: {} }; window.api = async (m, u, b) => { calls.push(m + ' ' + u.split('?')[0] + (b ? ' ' + JSON.stringify(b).slice(0, 60) : '')); const k = u.split('?')[0];
      if (k === '/api/mileage/config' && m === 'GET') return { policy: Object.assign(MIL.policyDefault(), { on }), rules: on ? MIL.templates.adult.rules : [], rewards: [], recommended: MIL.policyDefault().recommended, funded: [] };
      if (k === '/api/mileage/enable') { on = true; return { ok: true }; } if (R[k]) return R[k]; if (m === 'POST') return { ok: true }; const e = new Error('없는 경로'); e.status = 404; throw e; };
    MIL.invalidate(); go('mileage'); render(); await new Promise(r => setTimeout(r, 60)); render(); const w1 = /마일리지 제도 시작하기/.test(document.body.innerText);
    UI.milW.purpose = 'cash'; UI.milW.budget = '500000'; render(); document.querySelector('[data-act="mil-w-next"][data-v="2"]').click(); await new Promise(r => setTimeout(r, 60));
    const big = (document.querySelector('.mil-big') || {}).textContent; UI.milW.step = 3; UI.milW.checks = { a: true, b: true }; render(); document.querySelector('[data-act="mil-enable"]').click(); await new Promise(r => setTimeout(r, 120));
    await new Promise(r => setTimeout(r, 60)); render(); await new Promise(r => setTimeout(r, 60)); const homeK = [...document.querySelectorAll('.mil-kpi .v')].map(x => x.textContent);
    UI.mil = 'log'; UI.milA = ''; MIL.invalidate(); render(); await new Promise(r => setTimeout(r, 60)); const logT = document.querySelector('#main').innerText;
    delete window.LIVE; delete window.api; MIL.invalidate(); return { calls, w1, big, homeK, log: /마일리지 제도 켜기/.test(logT), doc: !S.mileage.entries.length }; });
  const cs = LIVE1.calls;
  ok(LIVE1.w1 && cs.some(c => /^POST \/api\/mileage\/draft/.test(c)) && LIVE1.big === '12,345P', '운영: 마법사 → POST draft · 서버 모의 계산 표시 ' + LIVE1.big);
  const iCfg = cs.findIndex(c => /^POST \/api\/mileage\/config/.test(c)), iRule = cs.findIndex(c => /^POST \/api\/mileage\/rules/.test(c)), iEn = cs.findIndex(c => /^POST \/api\/mileage\/enable .*h123/.test(c));
  ok(iCfg >= 0 && iRule > iCfg && iEn > iRule, '운영: 켜기 = config → rules → rewards → enable(draftHash) 순서 ' + cs.filter(c => /^POST/.test(c)).map(c => c.split(' ').slice(0, 2).join(' ')).join(' | '));
  ok(LIVE1.homeK[0] === '777P' && LIVE1.log && LIVE1.doc && cs.some(c => /GET \/api\/mileage\/summary/.test(c)) && cs.some(c => /GET \/api\/mileage\/log/.test(c)), '운영: summary · log GET, 시연 원장 비움 ' + JSON.stringify({ k: LIVE1.homeK, log: LIVE1.log, doc: LIVE1.doc, g: cs.filter(c => /^GET/.test(c)) }));

  /* ⑮ 1440 · 390 넘침 0 · 버튼 44px */
  await p.evaluate(() => { createOrg('k12', '새봄에듀'); S.me.role = 'owner'; UI.milW = null; go('mileage'); render(); });
  const TABS = ['w1', 'w2', 'w3', 'home', 'rules', 'ledger', 'set', 'log'];
  for (const w of [1440, 390]) { await p.setViewportSize({ width: w, height: 900 });
    const o = await p.evaluate(T0 => { const bad = [], small = []; for (const t of T0) { if (t[0] === 'w') { S.mileage.policy.on = false; UI.milW = UI.milW || null; render(); UI.milW.step = +t[1]; render(); } else { if (!S.mileage.policy.on) { S.mileage.policy.on = true; S.mileage.policy.ver = 1; S.mileage.rules = JSON.parse(JSON.stringify(MIL.templates.k12.rules)); } UI.mil = t; render(); }
      if (document.documentElement.scrollWidth > innerWidth + 1) bad.push(t + ':' + document.documentElement.scrollWidth); const x = [...document.querySelectorAll('.mil')].find(e => e.scrollWidth > e.clientWidth + 1); if (x) bad.push(t + ':mil');
      document.querySelectorAll('.mil .btn, .mil-tabs button, .mil-chip').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height < 43.5) small.push(t + ':' + b.textContent.trim().slice(0, 10)); }); } return { bad, small: small.slice(0, 5) }; }, TABS);
    ok(!o.bad.length, `${w}px 가로 넘침 0 ` + o.bad.join(',')); ok(!o.small.length, `${w}px 버튼 44px ` + o.small.join(','));
    if (w === 390) { await p.evaluate(() => { UI.mil = 'home'; render(); }); await shot('12-mobile-home'); await p.evaluate(() => { S.mileage.policy.on = false; render(); UI.milW.step = 3; render(); }); await shot('13-mobile-wizard'); } }
  const fonts = await p.evaluate(() => [...document.querySelectorAll('.mil *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.className + ':' + getComputedStyle(e).fontSize).slice(0, 5));
  ok(!fonts.length, '글자 12px 이상 ' + fonts.join(','));
  const emo = await p.evaluate(() => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText)); ok(!emo, '이모지 없음');
  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); console.log(`mil42-admin: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
