'use strict';
/* v47 AI 사용량 · 추가 충전(시연판) — 설정 카드 · 화면(막대 · 일별 그래프 · 기능별 표) · 충전 금액 선택(할인 · 부가세 포함 결제 금액) · 1년 이월 · 산타 관리(데모) · 80% · 100% 알림 · 권한 · 기존 기관 불변 · 휴대폰 폭
   사용: flock /tmp/pw.lock node tests/ui/v47-aiusage.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok));
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
  const R = await page.evaluate(async () => {
    localStorage.setItem('didisam.emptyStart', '0'); const out = []; const ok = (n, c, d) => out.push([!!c, n, d === undefined ? '' : JSON.stringify(d)]); const wait = ms => new Promise(r => setTimeout(r, ms));
    const main = () => document.querySelector('#main'); const open = () => { slSetOpen('aiuse'); UI.settings = 'aiuse'; go('settings'); render(); };
    /* ① 새 기관 체험 기본값 · 기존 기관 불변 */
    createOrg('univ', '사용량 대학'); await wait(900);
    ok('새 기관 aiplan · plan 체험 기본값', S.aiplan && S.aiplan.monthTokens === 1000000 && S.aiplan.overage === 'pack' && S.plan && S.plan.code === 'TRIAL', { a: S.aiplan, p: S.plan });
    delete S.aiplan; delete S.plan; S.aidemoUsed = 5e7; S.me.role = 'owner'; go('home'); render(); await wait(30);
    ok('기존 기관(aiplan 없음): 알림 없음 · 한도 없음', !document.querySelector('.aiu-alert') && AIUSE.data().state === 'off');
    open(); await wait(30); ok('기존 기관 화면: 「미설정(한도 없음)」 · 포함량 읽기 전용 · 산타 문의', /월 포함량 미설정/.test(main().innerText) && /한도 없음/.test(main().innerText) && !document.querySelector('#aiuTier') && /포함량 변경은 산타에 문의/.test(main().innerText));
    /* ② 산타 관리(데모 계정에서 보임): 기관 검색 → 요금제 코드 · 월 포함 토큰 · 메모 저장 → 변경 이력 */
    ok('설정 목차에 「산타 관리」(데모 정운영자)', [...document.querySelectorAll('.sx3-ti b')].some(x => x.textContent === '산타 관리'), [...document.querySelectorAll('.sx3-ti b')].map(x => x.textContent));
    slSetOpen('santa'); UI.settings = 'santa'; go('settings'); render(); await wait(40);
    ok('산타 관리 화면 · 데모 기관 3곳', main().querySelectorAll('.aiu-org').length === 3, main().querySelectorAll('.aiu-org').length);
    document.querySelector('#sQ').value = '사용량'; document.querySelector('[data-act="aiu-sfind"]').click(); await wait(30);
    ok('기관 검색', main().querySelectorAll('.aiu-org').length === 1 && /사용량 대학/.test(main().innerText));
    main().querySelector('[data-act="aiu-sorg"]').click(); await wait(30);
    const f = id => document.querySelector('#' + id); ok('산타 관리: 체험 기관 입력칸 유료 기본 2,500,000 미리 채움', f('sTokens').value === '2500000', f('sTokens').value);
    f('sCode').value = 'e1'; f('sTier').value = 'Enterprise'; f('sContract').value = 'sub'; f('sTokens').value = '2000000'; f('sMemo').value = '1차 계약';
    main().querySelector('[data-act="aiu-ssave"]').click(); await wait(40);
    ok('저장 → S.plan E1 · aiplan 200만 · 이력 · 감사', S.plan && S.plan.code === 'E1' && S.aiplan.monthTokens === 2000000 && /1차 계약/.test(main().innerText) && /E1 2,000,000/.test(main().innerText) && /산타 관리 — /.test(S.audit[0].what), { p: S.plan, a: S.aiplan });
    S.aidemoUsed = 1000000; open(); await wait(30);
    ok('설정 목차에 AI 사용량(AI 사용 정책 옆)', (() => { const b = [...document.querySelectorAll('.sx3-ti b')].map(x => x.textContent); const i = b.indexOf('AI 사용량'); return i > 0 && b[i - 1] === 'AI 사용 정책'; })(), [...document.querySelectorAll('.sx3-ti b')].map(x => x.textContent));
    const m = main(); const t = m.innerText;
    ok('요금제 읽기 전용 표시(E1 · Enterprise · 구독)', /E1 · Enterprise · 구독/.test(document.querySelector('#aiuPlanRo').innerText));
    ok('막대 50% · 정상', m.querySelector('.aiu-meter') && m.querySelector('.aiu-meter').getAttribute('aria-valuenow') === '50' && /정상/.test(t));
    ok('일별 그래프 막대', m.querySelectorAll('.aiu-ch rect').length >= 1, m.querySelectorAll('.aiu-ch rect').length);
    ok('기능별 표(튜터 · AI SAM · 채점 초안 · 비전)', ['학습자 AI 튜터', 'AI SAM', '채점 초안', '비전 대화'].every(x => t.includes(x)));
    ok('고정가 안내 · 1년 사용 문구 · 원가 자리값 없음', /100만 토큰당 20,000원\(부가세 포함 22,000원\)/.test(t) && t.includes('충전량은 충전일부터 1년 동안 써요(남은 양은 다음 달로 이어져요)') && !/확인 필요|원가/.test(t));
    /* 충전 금액 선택 → 받는 토큰 · 결제 금액 바로 표시 */
    const qt = () => document.querySelector('#aiuQuote').innerText;
    ok('기본 100만 원: 할인 10% · 55,555,555 토큰 · 1,100,000원', /55,555,555/.test(qt()) && /10%/.test(qt()) && /1,100,000원/.test(qt()), qt());
    m.querySelector('[data-act="aiu-won"][data-v="500000"]').click(); await wait(20);
    ok('50만 원 칩: 5% · 26,315,789 토큰 · 550,000원(공급가 + 부가세)', /26,315,789/.test(qt()) && /5%/.test(qt()) && /550,000원/.test(qt()) && /공급가 500,000원 \+ 부가세 50,000원/.test(qt()), qt());
    ok('2,000만 원 이상 30% 안내', /2,000만 원 이상 30%/.test(t));
    const wi = document.querySelector('#aiuWon'); wi.value = '30'; wi.dispatchEvent(new Event('input', { bubbles: true })); await wait(20);
    ok('직접 선택 30만 원: 할인 0% · 15,000,000 토큰 · 330,000원', /15,000,000/.test(qt()) && /330,000원/.test(qt()) && !document.querySelector('[data-act="aiu-buy"]').disabled, qt());
    wi.value = '15'; wi.dispatchEvent(new Event('input', { bubbles: true })); await wait(20);
    ok('15만 원(10만 원 단위 아님): 안내 · 충전 버튼 비활성', /10만 원 단위로/.test(qt()) && document.querySelector('[data-act="aiu-buy"]').disabled);
    /* ③ 80% 주의 · 100% 초과 알림(홈 · 다른 화면 머리) */
    S.aidemoUsed = 1700000; go('home'); render(); await wait(30);
    let al = document.querySelector('.aiu-alert'); ok('80% 주의 알림(홈)', al && !al.classList.contains('over') && /85%/.test(al.innerText), al && al.innerText);
    go('dash'); render(); await wait(30); ok('머리 알림(다른 화면)', !!document.querySelector('#main .aiu-alert'));
    S.aidemoUsed = 2100000; go('home'); render(); await wait(30);
    al = document.querySelector('.aiu-alert'); ok('100% 초과 알림', al && al.classList.contains('over') && /모두 썼습니다/.test(al.innerText) && /추가 충전/.test(al.innerText), al && al.innerText);
    /* ④ 데모 충전: 알림 → 설정 → 금액 → 가짜 승인 → 즉시 반영 · 충전 내역(충전일 · 만료일 · 남은 양) */
    al.querySelector('[data-act="aiu-open"]').click(); await wait(50);
    ok('알림 버튼 → AI 사용량 화면', UI.settings === 'aiuse' && !!main().querySelector('#aiuPacks'));
    ok('초과 상태 막대', main().querySelector('.aiu-meter.over') && /초과/.test(main().innerText));
    main().querySelector('[data-act="aiu-won"][data-v="100000"]').click(); await wait(20); main().querySelector('[data-act="aiu-buy"]').click(); await wait(30);
    const md = document.querySelector('#modal'); ok('결제(데모) 확인 창 · 금액 · 만료일', md && /110,000원/.test(md.innerText) && /5,000,000 토큰/.test(md.innerText) && /가짜 승인/.test(md.innerText) && /만료일 \d{4}-\d{2}-\d{2}/.test(md.innerText), md && md.innerText);
    md.querySelector('[data-mact="ok"]').click(); await wait(50);
    const d = AIUSE.data(); ok('충전 반영: 포함량 넘은 10만은 충전에서 → 남은 490만 · 정상', d.credit === 5e6 && d.creditLeft === 4900000 && d.remaining === 4900000 && d.state === 'ok', d);
    const ht = main().querySelector('#aiuPacks').innerText;
    ok('충전 내역: 충전일 · 만료일(1년) · 남은 양', /충전일/.test(ht) && /만료일/.test(ht) && /4,900,000/.test(ht) && d.credits[0].expires === new Date(Date.parse(d.credits[0].day + 'T00:00:00Z') + 365 * 864e5).toISOString().slice(0, 10), ht);
    ok('충전 기록 · 감사', (S.aicredit || []).length === 1 && /추가 충전 10만 원 · 5,000,000 토큰\(데모\)/.test(S.audit[0].what), S.audit[0]);
    const sm = AIUSE.simCredits([{ id: 'k', tokens: 1000, day: '2026-11-24' }], [], 0, '2027-11-24'); const sm2 = AIUSE.simCredits([{ id: 'k', tokens: 1000, day: '2026-11-24' }], [], 0, '2027-11-25');
    ok('화면 계산: 만료일 당일까지 · 다음 날 소멸', sm.left === 1000 && sm2.left === 0);
    go('home'); render(); await wait(30); ok('충전 뒤 알림 사라짐', !document.querySelector('.aiu-alert'));
    /* ⑤ 초과 처리 「차단」 → 충전 비활성 */
    open(); await wait(20); main().querySelector('[data-act="aiu-ov"][data-v="block"]').click(); await wait(30);
    ok('차단: 충전 버튼 비활성 · 안내', S.aiplan.overage === 'block' && S.aiplan.monthTokens === 2000000 && main().querySelector('[data-act="aiu-buy"]').disabled && /초과 처리가 「차단」/.test(main().innerText));
    main().querySelector('[data-act="aiu-ov"][data-v="pack"]').click(); await wait(20);
    /* ⑥ 권한: 부운영자 보기만 · 산타 관리 안 보임 · 교강사 접근 불가 */
    S.me.role = 'sub'; open(); await wait(20);
    ok('부운영자: 충전 · 초과 처리 비활성', main().querySelector('[data-act="aiu-buy"]').disabled && [...main().querySelectorAll('[data-act="aiu-ov"]')].every(b => b.disabled) && /추가 충전은 정운영자만/.test(main().innerText));
    ok('부운영자: 산타 관리 목차 없음', ![...document.querySelectorAll('.sx3-ti b')].some(x => x.textContent === '산타 관리'));
    S.aidemoUsed = 8e6; go('home'); render(); await wait(20); al = document.querySelector('.aiu-alert'); ok('부운영자 초과 알림 버튼은 「사용량 보기」', al && /사용량 보기/.test(al.innerText));
    S.me.role = 'teacher'; go('home'); render(); await wait(20); ok('교강사: 알림 없음', !document.querySelector('.aiu-alert'));
    S.me.role = 'owner'; S.aidemoUsed = 1000000;
    return out;
  });
  /* ⑦ 휴대폰 폭: 가로 넘침 없음 */
  await page.setViewportSize({ width: 390, height: 800 });
  const mob = await page.evaluate(async () => { slSetOpen('aiuse'); UI.settings = 'aiuse'; go('settings'); render(); await new Promise(r => setTimeout(r, 60)); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, has: !!document.querySelector('#aiuPacks') }; });
  R.push([mob.has && mob.sw <= mob.cw + 1, '휴대폰 폭 가로 넘침 없음', JSON.stringify(mob)]);
  R.push([errs.length === 0, '페이지 오류 없음', JSON.stringify(errs.slice(0, 3))]);
  await browser.close(); srv.close();
  let bad = 0; for (const [p, n, d] of R) { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} ${n}${p ? '' : ' ' + d}`); }
  console.log(`\n${R.length - bad}/${R.length} 통과`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
