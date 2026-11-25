'use strict';
/* 홈 요금제 카드(AI 토큰 · 8 시나리오) + 요금 안내 상세 화면 — 대표님 지시 2026-11-25
   ① 포함량 80% 주의 · 100% 충전분 차감 ② 포함량 소진 + 충전 0 → AI 멈춤(정운영자 충전하기 · 부운영자/교수자 요청) ③ Enterprise ④ 체험 남은 일수
   ⑤ 기존 계약 ⑥ 회원 · 메시지 한도 근접 ⑦ 시연판 가상값 ⑧ 서버 오류 · AI 미연결
   + 요금 안내(정운영자 · 부운영자) · 390/1440 넘침 · 합니다체 · 화면 금액 = 스킬(v1.5) · aiprice.js 값
   사용: flock /tmp/pw.lock node tests/ui/plan-guide.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const AP = require('../../service/server/aiprice');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
/* didisam-pricing 스킬 v1.5 값(2절 · 3절 · 1절 원칙 2) — 스킬을 바꾸면 이 표와 plan.js PLAN_TABLE을 함께 고친다 */
const SKILL = {
  price: { E1: [500, 2000], E2: [1500, 1700], E3: [5000, 1400], A1: [500, 1500], A2: [2000, 1200], A3: [10000, 800], U0: [1000, 15000], U1: [5000, 5000], U2: [12000, 4000], U3: [25000, 3200], G1: [1000, 1500], G2: [5000, 800], G3: [20000, 400] },
  floor: { E4: 1200, A4: 600, U4: 2500 },
  multi: [[2, 10], [3, 15]], upkeep: 15,
  addons: { '온보딩': 1500000, '데이터 마이그레이션': 1000000, 'POC': 3000000, '쌤페이지 맞춤 구성 · 디자인 패키지': 1500000, '홈페이지 리디자인': 2500000, 'SSO 연동': 6000000, 'API 연동': 4000000, '기관 전용 서버': 1000000, '도메인 · SSL': 300000, '본인인증': 500000, '성과 리포트 맞춤': 2000000, 'Open Badge 발급': 1000, 'VOD 저장': 50000, 'VOD 전송': 300000, '디지털북 제작': 3000000, '전담 매니저(포함 요금제 외)': 1500000 }
};
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok));
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
  const out = []; const ok = (n, c, d) => out.push([!!c, n, d === undefined ? '' : JSON.stringify(d).slice(0, 300)]);

  /* 화면 상수 = 스킬 · 서버 */
  const T = await page.evaluate(() => JSON.parse(JSON.stringify(window.PLAN_TABLE)));
  ok('AI 단가 = aiprice.js(100만 토큰당 · 단위 · 범위 · 할인 구간)', T.ai.perM === AP.PRICE_PER_M && T.ai.perMVat === Math.round(AP.PRICE_PER_M * 1.1) && T.ai.step === AP.STEP && T.ai.min === AP.MIN_WON && T.ai.max === AP.MAX_WON && JSON.stringify(T.ai.discounts) === JSON.stringify(AP.DISCOUNTS) && T.ai.trialTokens === AP.TRIAL_TOKENS && T.ai.creditDays === AP.CREDIT_DAYS, T.ai);
  ok('AI 단가 = 스킬 3-1-1(2만 원 · 10만 원 단위 · 최대 30%)', T.ai.perM === 20000 && T.ai.step === 100000 && Math.max(...T.ai.discounts.map(x => x[1])) === 30);
  ok('구독 단가 = 스킬 2절', Object.entries(SKILL.price).every(([c, [cap, u]]) => T.price[c][1] === cap && T.price[c][2] === u) && Object.entries(SKILL.floor).every(([c, f]) => T.price[c][2] === null && T.price[c][4] === f));
  ok('다년 할인 · 유지보수 = 스킬', JSON.stringify(T.multi) === JSON.stringify(SKILL.multi) && T.buildUpkeep === SKILL.upkeep);
  const addMap = Object.fromEntries(T.addons.filter(a => a[1] != null).map(a => [a[0], a[1]]));
  ok('부가서비스 단가 = 스킬 3절', JSON.stringify(addMap) === JSON.stringify(SKILL.addons), addMap);
  /* 스킬 원문이 이 기기에 있으면 원문 숫자도 대조 */
  try { const base = '/root/.claude/skills/synced'; const dir = fs.existsSync(base) ? fs.readdirSync(base).map(d => path.join(base, d, 'didisam-pricing/SKILL.md')).find(f => fs.existsSync(f)) : null;
    if (dir) { const md = fs.readFileSync(dir, 'utf8'); const miss = Object.values(SKILL.addons).map(n => n.toLocaleString('en-US')).filter(x => !md.includes(x));
      ok('스킬 원문에 부가서비스 금액 존재', !miss.length && /100만 토큰당 2만 원/.test(md) && /2년 10%, 3년 15%/.test(md), miss); } } catch (e) { }

  const R = await page.evaluate(async () => {
    localStorage.setItem('didisam.emptyStart', '0'); const res = []; const ok = (n, c, d) => res.push([!!c, n, d === undefined ? '' : JSON.stringify(d).slice(0, 300)]); const wait = ms => new Promise(r => setTimeout(r, ms));
    createOrg('univ', '요금 안내 대학'); await wait(900); S.me.role = 'owner';
    const card = () => { go('dash'); render(); const c = document.querySelector('.d26-plan'); return c ? c.innerText : ''; };
    const plain = /(이에요|예요|해요|돼요|어요|아요|세요)[.!\s]/;
    const setPlan = (code, since) => { if (code) S.plan = { code, tier: '', contract: 'annual', aiMonthTokens: 5000000, since: since || '2026-03-01' }; else delete S.plan; };
    S.aiplan = { monthTokens: 5000000, overage: 'pack' }; S.aicredit = [];

    /* 요금제 이름 = plan.js 출처 · 합니다체 · 기본 행 */
    setPlan('E2'); S.aidemoUsed = 2000000; let t = card();
    ok('이름: Pro 요금제를 이용 중입니다(프리미엄 제거)', /Pro 요금제를 이용 중입니다/.test(t) && !/프리미엄|이용 중이에요/.test(t), t);
    ok('행: 회원(요금제 인원 1,500) · 메시지 · AI 포함량 · 충전 잔액 · 콘텐츠', /회원 수/.test(t) && /\/1,500명/.test(t) && /이번 달 메시지/.test(t) && /AI 토큰 · 이번 달 포함량/.test(t) && /200만\/500만/.test(t) && /충전 잔액\s*없음/.test(t) && /콘텐츠/.test(t), t);
    ok('버튼: 요금 안내 · 충전 · 업그레이드 문의', ['pl-open', 'aiu-open', 'pl-ask'].every(a => document.querySelector(`.d26-plan [data-act="${a}"]`)) && /업그레이드 문의/.test(t));
    ok('⑦ 시연판 예시 값 표시', /시연판 예시 값/.test(t));
    ok('합니다체(해요체 없음)', !plain.test(t + ' '), t);

    /* ① 80% 주의 · 100% 충전분 차감 */
    S.aidemoUsed = 4300000; t = card(); ok('① 80% 이상 주의(충전 없음 → 멈춤 예고)', /포함량의 86%를 썼습니다/.test(t) && /AI 기능이 멈춥니다/.test(t) && document.querySelector('.d26-plan .d26m-warn'), t);
    S.aicredit = [{ id: 'c1', tokens: 10000000, amount: 200000, day: today(), at: today() }]; S.aidemoUsed = 6000000; t = card();
    const exp = AIUSE.data().credits[0].expires;
    ok('① 100% → 충전분 차감 중 · 잔액 토큰 · 원 환산 · 만료일', /충전분에서 차감 중입니다/.test(t) && /900만 토큰 · 약 180,000원/.test(t) && t.includes('가장 빠른 만료일') && t.includes(exp), t);

    /* ② 충전 0 + 포함량 소진 → 멈춤 */
    S.aicredit = []; S.aidemoUsed = 5200000; t = card();
    ok('② 소진 → AI 기능 멈춤 + 충전하기(정운영자)', /AI 기능이 멈췄습니다/.test(t) && document.querySelector('.d26-plan .d26-al-bad [data-act="aiu-open"]') && /충전하기/.test(t), t);
    S.me.role = 'sub'; t = card();
    ok('② 부운영자 → 정운영자에게 요청', /정운영자에게 요청/.test(t) && !document.querySelector('.d26-plan .d26-al-bad [data-act="aiu-open"]'), t);
    ACT['d26-aireq'](); await wait(10); S.me.role = 'teacher'; t = d26PlanCard(5, 0, 0);
    ok('② 교수자 → 정운영자에게 요청(요금 버튼 없음)', /정운영자에게 요청/.test(t) && !/data-act="pl-open"/.test(t), t);
    S.me.role = 'owner'; t = card(); ok('② 정운영자 카드에 요청 표시', /AI 충전 요청 1건/.test(t) && S.aiReq.length === 1, t);
    ACT['d26-aireqok'](); S.aidemoUsed = 1000000;

    /* ③ Enterprise */
    setPlan('E3'); t = card(); ok('③ Enterprise: 산타가 넣음 + 산타에 문의', /Enterprise 요금제를 이용 중입니다/.test(t) && /월 포함량은 계약에 따라 산타가 넣습니다/.test(t) && /산타에 문의/.test(t), t);
    /* ④ 체험 */
    setPlan('TRIAL', today()); t = card(); ok('④ 체험: 남은 일수', /Pro 체험을 이용 중입니다/.test(t) && /체험 기간이 14일 남았습니다/.test(t), t);
    const d = new Date(); d.setDate(d.getDate() - 12); S.plan.since = d.toISOString().slice(0, 10); t = card(); ok('④ 체험 종료 임박 주의', /체험 종료까지 [0-3]일/.test(t), t);
    S.plan.since = '2020-01-01'; t = card(); ok('④ 체험 종료 → Standard', /체험이 끝나 Standard/.test(t), t);
    /* ⑤ 기존 계약 */
    setPlan(''); t = card(); ok('⑤ 기존 계약', /기존 계약\(전체 기능\)을 이용 중입니다/.test(t) && /산타에 문의/.test(t), t);
    /* ⑥ 회원 · 메시지 한도 근접 */
    setPlan('U0'); const M0 = S.members; S.members = Array.from({ length: 950 }, (_, i) => ({ id: 'm' + i, name: 'm' + i })); const ml = S.settings.msgLimit; S.settings.msgLimit = 1000; S.msgs = [{ n: 960, at: today() }];
    t = card(); ok('⑥ 회원 95% 주의(1,000명 구간)', /950\/1,000명/.test(t) && /요금제 인원의 95%/.test(t), t);
    ok('⑥ 메시지 한도 근접', /메시지 한도의 9\d%|메시지 한도\(1,000건\)를 모두/.test(t) || (typeof cmMonthUsed === 'function' && cmMonthUsed() < 900), [t, typeof cmMonthUsed === 'function' && cmMonthUsed()]);
    S.members = M0; S.settings.msgLimit = ml; S.msgs = [];
    /* ⑧ 서버 오류 · AI 미연결(운영 모드 흉내 — 불러오기 결과만 주입) */
    setPlan('E2'); window.LIVE = { user: { id: 'u' }, cfg: { ai: true } }; D26.ai = { d: null, err: '서버에 연결하지 못했습니다.', at: Date.now(), busy: false };
    let h = d26PlanCard(10, 0, 0); ok('⑧ 서버 오류 → 명확한 안내 + 다시 시도', /AI 사용량을 불러오지 못했습니다\. 서버에 연결하지 못했습니다/.test(h) && /d26-aire/.test(h) && !/확인 중/.test(h), h);
    window.LIVE.cfg.ai = false; h = d26PlanCard(10, 0, 0); ok('⑧ AI 미연결 → 연결 요청 안내', /AI가 아직 연결되지 않아/.test(h) && !/확인 중/.test(h), h);
    window.LIVE.cfg.ai = true; D26.ai = { d: { state: 'ok', used: 100, included: 1000, creditLeft: 0, credits: [] }, err: 'x', at: Date.now(), busy: false }; h = d26PlanCard(10, 0, 0); ok('⑧ 갱신 실패 → 마지막 값 + 안내', /마지막으로 받은 값/.test(h), h);
    delete window.LIVE; D26.ai = { d: null, err: null, at: 0, busy: false };

    /* 요금 안내 상세 */
    setPlan('E2'); ACT['pl-open']({ dataset: { v: 'guide' } }); await wait(40); const main = () => (document.querySelector('#main') || document.body).innerText; t = main();
    const sec = k => !!document.querySelector(`[data-pl-${k}]`);
    ok('요금 안내: 섹션(구독료 · AI 포함 · 충전 · 차감 · 계약 · 부가 · FAQ · 문의)', ['guide', 'ai', 'topup', 'order', 'contract', 'addon', 'faq', 'contact'].every(sec), ['guide', 'ai', 'topup', 'order', 'contract', 'addon', 'faq', 'contact'].filter(k => !sec(k)));
    ok('요금 안내: 구독료(E2 3,060만원 · VAT 포함 3,366만원 · 협의 하한)', /3,060만원/.test(t) && /3,366만원/.test(t) && /계약 시 견적/.test(t) && /하한 1,200원·인·월/.test(t));
    ok('요금 안내: 충전 할인 7구간 · 최대 30% · 단가 14,000원', document.querySelectorAll('[data-pl-topup] tbody tr').length === 7 && /30%/.test(t) && /14,000원/.test(t) && /100만 토큰당 20,000원/.test(t) && /VAT 포함 22,000원/.test(t));
    ok('요금 안내: 이월 · 차감 순서 · 약정 할인 없음', /만료일이 빠른 충전분/.test(t) && /365일/.test(t) && /AI 사용료\(충전\)는 약정 할인이 없습니다/.test(t) && /2년 10% · 3년 15%/.test(t) && /세금계산서/.test(t));
    const fq = document.querySelectorAll('[data-pl-faq] details').length; ok('요금 안내: FAQ 5~8개', fq >= 5 && fq <= 8, fq);
    ok('요금 안내: 문의(채널톡 · 메일)', !!document.querySelector('[data-pl-contact] a[href="https://newdidisam.channel.io/home"]') && !!document.querySelector('[data-pl-contact] a[href^="mailto:support@didisam.com"]'));
    ok('요금 안내: 합니다체', !plain.test(t + ' '), (t.match(plain) || [])[0]);
    S.me.role = 'sub'; ACT['pl-open']({ dataset: { v: 'guide' } }); await wait(40); ok('부운영자도 요금 안내 열람', !!document.querySelector('[data-pl-guide]') && !document.getElementById('plDemo'), main().slice(0, 200));
    S.me.role = 'teacher'; const before = !!document.querySelector('[data-pl-guide]'); ACT['pl-open']({ dataset: { v: 'guide' } }); await wait(20); ok('교수자는 요금 안내 불가(안내 문구)', /정운영자 · 부운영자가 볼 수 있습니다/.test(document.querySelector('#toasts').innerText), before);
    S.me.role = 'owner'; S.aiplan = { monthTokens: 5000000, overage: 'pack' }; save();
    return res;
  });
  out.push(...R);

  /* 390 · 1440 넘침(홈 · 요금 안내) */
  for (const w of [390, 1440]) {
    await page.setViewportSize({ width: w, height: 860 });
    const o = await page.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const r = {};
      go('dash'); render(); await wait(60); const c = document.querySelector('.d26-plan'); r.home = document.documentElement.scrollWidth - innerWidth; r.card = c ? c.scrollWidth - c.clientWidth : -1;
      ACT['pl-open']({ dataset: { v: 'guide' } }); await wait(60); r.guide = document.documentElement.scrollWidth - innerWidth;
      r.cards = [...document.querySelectorAll('.pl .card')].map(x => x.scrollWidth - x.clientWidth).filter(x => x > 1).length; return r; });
    ok(`${w}px: 넘침 없음(홈 · 카드 · 요금 안내)`, o.home <= 1 && o.card <= 1 && o.card >= 0 && o.guide <= 1 && o.cards === 0, o);
  }
  let bad = 0; for (const [p, n, d] of out) { console.log(`${p ? '✓' : '✗'} ${n}${p ? '' : ' ' + d}`); if (!p) bad++; }
  if (errs.length) { console.log('페이지 오류:', errs.slice(0, 5)); bad++; }
  await browser.close(); srv.close();
  console.log(bad ? `✗ ${bad}건 실패 / ${out.length}` : `✓ 요금 안내 · 홈 요금제 카드 ${out.length}건 통과`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
