'use strict';
/* v43 K1 기능 점검 — 대표님 결정(11-16) · 기획 검수 치명 · 높음(스튜디오 · 서버 쪽)
   ① 공공 세부 유형 3분류(시민 교육형 · 시설형 · 직원 교육형): 가입 선택 · 메뉴 · 용어 · 홈 위젯 · AI 문구 · 시연 데이터 · 하위 호환
   ② 돈 메뉴 2개(수납 · 매출) · #billing 딥링크 · 평생교육원 반환은 수납 › 환불 한 곳(법정 기한 열)
   ③ 숫자 일원화(DDStat): 출석률 80% 미만 · 수료 기준 미달 · 환불 · 매출이 화면마다 같은 값
   ④ 권한 · 정책: 강사 수납 · 매출 · 시설 숨김(P3-F01), 직업훈련 접근코드 기본 · 자동 수락 금지(P1-F01), 국비 마일리지 금전성 잠금(P1-F09), 빈 스튜디오 거짓 요약 없음(P3-F12)
   ⑤ AI SAM 요일 · 시간 → 요일반(P3-F05)
   사용: NODE_PATH=$(npm root -g) node tests/ui/k43.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m.slice(0, 160)); } else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(x => srv.once('listening', x));
  const B = `http://127.0.0.1:${srv.address().port}`; const browser = await chromium.launch(); const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' });
  const E = (fn, a) => p.evaluate(fn, a);
  await E(() => localStorage.setItem('didisam.emptyStart', '0')); /* 시연 데이터로 만든다(빈 스튜디오는 ④ 마지막에 따로) */

  /* ① 가입 화면: 공공을 고르면 세부 유형 3개 · 고르기 전에는 시작 불가 */
  const su = await E(() => { try { Store.clear(); } catch (e) { } S = null; SU = { type: '', name: '', email: '' }; SUV.step = 'org'; renderSignup(); document.querySelector('[data-act="su-type"][data-v="public"]').click(); /* v45: 기관 유형 카드는 진입(로그인/가입) 다음 ① 단계에 있다 */ const b0 = document.querySelector('#suForm button[type=submit]').disabled; const n = document.querySelectorAll('.su-pub [data-act="su-ed"]').length; document.querySelector('.su-pub [data-v="facility"]').click(); { const nm = document.querySelector('#suForm [name=name]'); nm.value = '공공 점검'; nm.dispatchEvent(new Event('input', { bubbles: true })); } /* v45: 기관명까지 채워야 「다음」이 켜진다(FLOW ①) */ return { n, b0, b1: document.querySelector('#suForm button[type=submit]').disabled, pv: (document.querySelector('.pv') || {}).innerText || '' }; });
  ok(su.n === 3 && su.b0 && !su.b1 && /시설형/.test(su.pv) && /회원/.test(su.pv), 'v43 가입: 공공 세부 유형 3개 · 고르면 시작 · 시설형 용어(회원) ' + JSON.stringify(su));

  const T = await E(() => { const out = {}; const on = () => Object.values(S.nav.tabs).flat().filter(x => x.on).map(x => x.id);
    for (const ed of ['citizen', 'facility', 'staff']) { createOrg('public', '공공 ' + ed, ed); render(); out[ed] = { ed: S.org.ed, name: TYPES.public.name, learner: t('learner'), cls: t('cls'), on: on(), legalCls: S.classes.filter(c => c.legal).length, priced: S.classes.filter(c => c.price > 0).length, exq: EXQ.public[0], who: typeof AIH_WHO !== 'undefined' ? AIH_WHO.public : '', fac: S.fac && S.fac.tpl, flav: S.ledger && S.ledger.flavor, snapEd: (lsSnapshot().org || {}).ed }; }
    /* 하위 호환: ed 없는 기존 공공 → 직원 교육형 */
    createOrg('public', '옛 공공'); delete S.org.ed; upgradeState(); out.legacy = S.org.ed; return out; });
  ok(T.staff.on.includes('compliance') && !T.staff.on.includes('ledger') && !T.staff.on.includes('fac') && T.staff.legalCls >= 4 && T.staff.learner === '교육생', 'v43 직원 교육형: 법정의무교육 켬 · 수납 · 시설 없음 ' + JSON.stringify(T.staff.on));
  ok(T.citizen.on.includes('ledger') && T.citizen.on.includes('sales') && !T.citizen.on.includes('compliance') && T.citizen.legalCls === 0 && T.citizen.cls === '강좌' && /강좌/.test(T.citizen.exq) && T.citizen.fac === 'room', 'v43 시민 교육형: 강좌 · 출석 · 수료 + 수납 · 매출, 법정교육 없음 ' + JSON.stringify(T.citizen));
  ok(T.facility.on.includes('fac') && T.facility.on.includes('ledger') && T.facility.on.includes('sales') && !T.facility.on.includes('compliance') && T.facility.learner === '회원' && T.facility.cls === '강습' && T.facility.priced >= 3 && T.facility.fac === 'sports' && T.facility.flav === 'sports' && /시설/.test(T.facility.who), 'v43 시설형: 시설 · 강습 · 회원 · 수납 중심 ' + JSON.stringify(T.facility));
  ok(T.facility.name === '공공기관(시설형)' && T.facility.snapEd === 'facility' && T.legacy === 'staff', 'v43 유형 이름 · 게시본 org.ed · 기존 공공은 직원 교육형(하위 호환) ' + JSON.stringify([T.facility.name, T.facility.snapEd, T.legacy]));
  const W = await E(() => { const o = {}; for (const ed of ['citizen', 'facility', 'staff']) { createOrg('public', 'w', ed); go('dash'); render(); o[ed] = (document.querySelector('#main') || {}).innerText || ''; } return { c: /신청/.test(o.citizen) && !/법정의무교육 미이수/.test(o.citizen), f: /순매출|환불/.test(o.facility) && !/법정의무교육 미이수/.test(o.facility), s: /법정의무교육/.test(o.staff) }; });
  ok(W.c && W.f && W.s, 'v43 홈 위젯: 시민 = 신청 · 시설 = 매출 · 환불 · 직원 = 법정교육 ' + JSON.stringify(W));
  const sw = await E(() => { createOrg('public', 's', 'citizen'); UI.settings = 'menu'; ACT['pub-ed']({ dataset: { v: 'facility' } }); document.querySelector('#modal [data-mact="ok"]').click(); return { ed: S.org.ed, fac: menuOn('fac'), learner: t('learner') }; });
  ok(sw.ed === 'facility' && sw.fac && sw.learner === '회원', 'v43 설정에서 세부 유형 바꾸기 ' + JSON.stringify(sw));

  /* ② 돈 메뉴 2개 */
  const M = await E(() => { const o = {}; const on = () => Object.values(S.nav.tabs).flat().filter(x => x.on).map(x => x.id).filter(id => ['ledger', 'sales', 'billing', 'crmbill'].includes(id));
    for (const ty of ['adult', 'k12', 'lifelong', 'corp']) { createOrg(ty, '돈 ' + ty); render(); o[ty] = on(); }
    createOrg('adult', '딥링크'); go('billing'); render(); o.billing = { tab: CUR.tab, ui: UI.ledger, txt: /청구/.test(document.querySelector('#main').innerText) };
    go('sales'); render(); const tabsRev = [...document.querySelectorAll('#main [data-key="ledRev"]')].map(b => b.dataset.v); o.rev = { tabs: tabsRev, label: mlabel('sales'), x: !!document.querySelector('#main .lg-x'), cpn: !!document.querySelector('.cpn-card') || !S.settings.pg };
    go('ledger'); render(); o.col = { tabs: [...document.querySelectorAll('#main [data-key="ledger"]')].map(b => b.dataset.v), label: mlabel('ledger') };
    createOrg('k12', '딥'); go('billing'); render(); o.k12billing = CUR.tab; return o; });
  ok(JSON.stringify(M.adult.sort()) === '["ledger","sales"]' && JSON.stringify(M.lifelong.sort()) === '["ledger","sales"]' && JSON.stringify(M.k12.sort()) === '["crmbill","sales"]' && !M.corp.length, 'v43 돈 메뉴 2개(수납 · 매출), 기업은 기본 끔 ' + JSON.stringify(M));
  ok(M.billing.tab === 'ledger' && M.billing.ui === 'charge' && M.k12billing === 'crmbill', 'v43 #billing → 수납 › 청구(학원 초중고는 수납 화면) ' + JSON.stringify([M.billing, M.k12billing]));
  ok(M.rev.label === '매출' && M.col.label === '수납' && M.rev.tabs.includes('book') && M.rev.tabs.includes('stat') && !M.rev.tabs.includes('refund') && M.col.tabs.includes('refund') && M.col.tabs.includes('charge') && !M.col.tabs.includes('book') && M.rev.x, 'v43 수납 = 청구 · 미납 · 환불, 매출 = 원장 · 통계 · 정산 ' + JSON.stringify([M.rev, M.col]));

  /* 평생교육원 반환: 학습비 화면은 기한 감시판 → [처리하러 가기] → 수납 › 환불(법정 기한 열) · 같은 건수 */
  const L = await E(() => { createOrg('lifelong', '평생'); render(); const n = DDStat.refundN(); go('lifelong'); render(); const w = document.querySelector('#llRfWatch'); const rows = w ? w.querySelectorAll('tbody tr').length : -1; document.querySelector('#llRfWatch [data-act="go-refund"]').click(); render(); const tab0 = CUR.tab;
    const m = document.querySelector('#main'); const pr = m.querySelector('#lgPayRef'); const dash = (() => { go('dash'); render(); return document.querySelector('#main').innerText; })();
    return { n, rows, tab: tab0, ui: UI.ledger, col: !!pr && /법정 기한/.test(pr.innerText), prRows: pr ? pr.querySelectorAll('tbody tr').length : -1, law: pr && /평생교육법/.test(pr.innerText), dash: new RegExp('학습비 반환 신청\\s*' + n).test(dash.replace(/\n/g, ' ')) || dash.includes(String(n)) }; });
  ok(L.n >= 1 && L.rows === L.n && L.tab === 'ledger' && L.ui === 'refund' && L.col && L.law && L.prRows >= 1 && L.prRows <= L.n, /* 감시판 n = 강좌 결제 신청 + 원장 확정 대기, 수납 › 환불은 두 카드로 나뉨 */ 'v43 평생교육원 반환: 감시판 → 수납 › 환불 · 법정 기한 열 · 같은 건수 ' + JSON.stringify(L));

  /* ③ 숫자 일원화(voc): 홈 · HRD-Net 보고 · 인가 한눈에 · 모니터링 */
  const N = await E(() => { createOrg('voc', '숫자'); render(); const low = DDStat.lowAttN(); const und = DDStat.undoneN(); const all = DDStat.learnerN();
    go('hrd'); render(); const hrd = document.querySelector('#main').innerText + ' ' + [...document.querySelectorAll('#main .kpi')].map(k => k.textContent).join(' '); UI.cpl = 'home'; go('cpl'); render(); const cpl = document.querySelector('#main').innerText; UI.cpl = 'mon'; go('cpl'); render(); const mon = document.querySelector('#main').innerText;
    const num = (t, re) => { const m = t.replace(/\s+/g, ' ').match(re); return m ? +m[1] : null; };
    return { low, und, all, hrdLow: num(hrd, /출석(?:률)? 80% 미만\s*(\d+)\s*명/), hrdAll: num(hrd, /훈련생\s*(\d+)\s*명\s*운영 중 과정/), hrdLowK: num(hrd, /출석률 80% 미만\s*(\d+)\s*명\s*출결 과정/), hrdDone: num(hrd, /수료 요건 충족\s*(\d+)\s*명/), cplLow: low ? num(cpl, /출석률 80% 미만\s*(\d+)\s*명/) : 0, monAll: num(mon, /훈련생\s*(\d+)/), monUnd: num(mon, /수료 기준 미달\s*(\d+)/), lowAttN: lowAttN() }; });
  ok(N.hrdLow === N.low && N.hrdLowK === N.low && N.hrdAll === N.all && N.cplLow === N.low && N.lowAttN === N.low && N.hrdDone === N.all - N.und && N.monAll === N.all && N.monUnd === N.und, 'v43 P1-F03 숫자 일원화: HRD · 한눈에 · 모니터링 · 홈 같은 값 ' + JSON.stringify(N));
  const R = await E(() => { createOrg('adult', '매출'); render(); const r = DDStat.revenue(); go('sales'); render(); const t = document.querySelector('#main .lg-hero').innerText.replace(/\s+/g, ' '); return { net: r.net, src: r.src, hero: t.includes(r.net.toLocaleString('ko-KR') + '원') }; });
  ok(R.src === 'ledger' && R.hero, 'v43 매출 합계 = 원장 요약(DDStat.revenue) ' + JSON.stringify(R));

  /* ④ 권한 · 정책 */
  const P = await E(() => { createOrg('k12', '강사'); S.me = { name: S.admins.find(a => a.role === 'teacher').name, role: 'teacher' }; render(); const ops = wsTabs('ops'); let blocked = true; for (const id of ['ledger', 'sales', 'fac', 'crmbill', 'billing']) { go(id); if (CUR.tab === id) blocked = false; } S.me = { name: '관리자', role: 'owner' }; return { ops, blocked }; });
  ok(!P.ops.some(x => ['ledger', 'sales', 'fac', 'crmbill'].includes(x)) && P.blocked, 'v43 P3-F01 강사: 수납 · 매출 · 시설 메뉴 · 직접 이동 막힘 ' + JSON.stringify(P));
  const V = await E(() => { createOrg('voc', '가입'); mbEnsure(); const A = S.settings.acct; const o = { mode: A.mode, ap: A.approve, join: S.settings.join }; const el = { dataset: { k: 'join' }, value: '자동 수락' }; ACT.st(el); o.after = S.settings.join; A.mode = 'open'; A.approve = 'auto'; mbJoinSync(); o.sync = A.approve; o.third = (cplPublic().third || {}).items || ''; return o; });
  /* QA7(2026-11-25) 대표님 학습자 가입 정책: 직업훈련은 이메일 · SNS 가입을 열되 운영자 승인 후 이용(접근코드도 계속 사용 가능) — 핵심인 '자동 수락 금지'는 그대로 본다 */
  ok(['code', 'open'].includes(V.mode) && V.ap === 'manual' && V.join !== '자동 수락' && V.after !== '자동 수락' && V.sync === 'manual', 'v43 P1-F01 직업훈련: 가입은 승인제 · 자동 수락 막음 ' + JSON.stringify(V));
  ok(!/이름|연락처/.test(V.third) && /훈련생 번호/.test(V.third), 'v43 P1-F04 제3자 제공 항목 = 실제 보유 항목(이름 · 연락처 제외) ' + V.third);
  const MI = await E(() => { createOrg('voc', '마일'); UI.milW = null; go('mileage'); render(); const lock = !!document.querySelector('#milCashLock') || !document.querySelector('[data-act="mil-w-pur"][data-v="cash"]'); ACT['mil-w-pur']({ dataset: { v: 'cash' } }); const pur = UI.milW && UI.milW.purpose; const rw = (S.mileage && S.mileage.rewards || []).filter(r => r.cash && r.active).map(r => r.title); return { lock, pur, rw }; });
  ok(MI.pur !== 'cash' && !MI.rw.some(x => /교재 교환권/.test(x)), 'v43 P1-F09 국비(직업훈련원): 할인 · 장학 연계 잠금 · 교재 교환권 없음 ' + JSON.stringify(MI));
  const EM = await E(() => { localStorage.setItem('didisam.emptyStart', '1'); createOrg('k12', '빈 학원'); render(); const out = {}; for (const id of ['crmbill', 'crmatt', 'enroll']) { go(id); render(); out[id] = document.querySelector('#main').innerText; } localStorage.setItem('didisam.emptyStart', '0'); return { bill: /모두 발생했습니다/.test(out.crmbill), att: /모두 입력/.test(out.crmatt), inv: /활성 초대 링크/.test(out.enroll), n: S.members.length }; });
  ok(!EM.bill && !EM.att && !EM.inv, 'v43 P3-F12 빈 스튜디오: 거짓 요약 없음 ' + JSON.stringify(EM));

  /* ⑤ AI SAM 요일 · 시간 */
  const SA = await E(() => { createOrg('k12', 'SAM'); const p0 = CSAM.parse('중2 수학 A반 수업 만들어줘. 월수금 오후 4시'); const p1 = CSAM.schedParse('화목 19:00~20:30'); const p2 = CSAM.schedParse('월 수강료 28만원 11월 수학'); const card = answer('중2 수학 A반 수업 만들어줘. 월수금 오후 4시');
    CSAM.open('중2 수학 A반 수업 만들어줘. 월수금 오후 4시', 'sam'); const wz = typeof WZ !== 'undefined' && WZ ? { kind: WZ.kind, sub: WZ.sub, name: WZ.name, days: (WZ.w2 || {}).days, from: (WZ.w2 || {}).from, to: (WZ.w2 || {}).to } : null; try { closeModal(); } catch (e) { }
    return { p0: { d: p0.wdays, f: p0.from, t: p0.to, n: p0.name }, p1, p2, text: card && card.text, wz }; });
  ok(JSON.stringify(SA.p0.d) === '[1,3,5]' && SA.p0.f === '16:00' && SA.p0.t === '17:30' && !SA.p2.wdays && JSON.stringify(SA.p1.wdays) === '[2,4]' && SA.p1.to === '20:30', 'v43 P3-F05 요일 · 시간 읽기 ' + JSON.stringify(SA));
  ok(SA.wz && SA.wz.kind === 'episode' && SA.wz.sub === '요일반' && JSON.stringify(SA.wz.days) === '[1,3,5]' && SA.wz.from === '16:00' && /월 · 수 · 금 16:00~17:30 요일반/.test(SA.text || ''), 'v43 P3-F05 SAM → 요일반 마법사 · 응답 문구 ' + JSON.stringify([SA.wz, SA.text]));

  ok(!errs.length, '페이지 오류 없음 ' + errs.slice(0, 4).join(' | '));
  await browser.close(); srv.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
