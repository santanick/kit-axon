'use strict';
/* v47 AI 사용량 · 추가 충전(시연판) — 설정 카드 · 화면(막대 · 일별 그래프 · 기능별 표 · 충전 상품) · 80% · 100% 알림 · 데모 충전 · 권한 · 기존 기관 불변 · 휴대폰 폭
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
    /* ① 새 기관 기본 포함량 · 기존 기관 불변 */
    createOrg('univ', '사용량 대학'); await wait(900);
    ok('새 기관 aiplan 기본값', S.aiplan && S.aiplan.monthTokens === 2000000 && S.aiplan.overage === 'pack', S.aiplan);
    delete S.aiplan; S.aidemoUsed = 5e7; S.me.role = 'owner'; go('home'); render(); await wait(30);
    ok('기존 기관(aiplan 없음): 알림 없음 · 한도 없음', !document.querySelector('.aiu-alert') && AIUSE.data().state === 'off');
    open(); await wait(30); ok('기존 기관 화면: 「미설정(한도 없음)」', /월 포함량 미설정/.test(main().innerText) && /한도 없음/.test(main().innerText));
    /* ② 포함량 선택(정운영자) → 화면 */
    const sel = document.querySelector('#aiuTier'); sel.value = '2000000'; sel.dispatchEvent(new Event('change', { bubbles: true })); await wait(30);
    ok('포함량 저장 + 감사 기록', S.aiplan && S.aiplan.monthTokens === 2000000 && /AI 사용량 — 월 포함량 2,000,000 토큰/.test(S.audit[0].what), S.audit[0]);
    S.aidemoUsed = 1000000; open(); await wait(30);
    ok('설정 목차에 AI 사용량(AI 사용 정책 옆)', (() => { const b = [...document.querySelectorAll('.sx3-ti b')].map(x => x.textContent); const i = b.indexOf('AI 사용량'); return i > 0 && b[i - 1] === 'AI 사용 정책'; })(), [...document.querySelectorAll('.sx3-ti b')].map(x => x.textContent));
    const m = main(); const t = m.innerText;
    ok('막대 50% · 정상', m.querySelector('.aiu-meter') && m.querySelector('.aiu-meter').getAttribute('aria-valuenow') === '50' && /정상/.test(t));
    ok('일별 그래프 막대', m.querySelectorAll('.aiu-ch rect').length >= 1, m.querySelectorAll('.aiu-ch rect').length);
    ok('기능별 표(튜터 · AI SAM · 채점 초안 · 비전)', ['학습자 AI 튜터', 'AI SAM', '채점 초안', '비전 대화'].every(x => t.includes(x)));
    const pr = AIUSE.price(1e6); ok('충전 상품 3종 · 가격(원가×2.5 + 부가세)', m.querySelectorAll('.aiu-pack').length === 3 && t.includes(pr.total.toLocaleString('ko-KR') + '원') && pr.supply === 18800 && pr.total === 20680, pr);
    ok('남은 추가 충전량 칸', /남은 추가 충전량/.test(t));
    /* ③ 80% 주의 · 100% 초과 알림(홈 · 다른 화면 머리) */
    S.aidemoUsed = 1700000; go('home'); render(); await wait(30);
    let al = document.querySelector('.aiu-alert'); ok('80% 주의 알림(홈)', al && !al.classList.contains('over') && /85%/.test(al.innerText), al && al.innerText);
    go('dash'); render(); await wait(30); ok('머리 알림(다른 화면)', !!document.querySelector('#main .aiu-alert'));
    S.aidemoUsed = 2100000; go('home'); render(); await wait(30);
    al = document.querySelector('.aiu-alert'); ok('100% 초과 알림', al && al.classList.contains('over') && /모두 썼습니다/.test(al.innerText) && /추가 충전/.test(al.innerText), al && al.innerText);
    /* ④ 데모 충전: 알림 → 설정 → 상품 → 가짜 승인 → 즉시 반영 */
    al.querySelector('[data-act="aiu-open"]').click(); await wait(50);
    ok('알림 버튼 → AI 사용량 화면', UI.settings === 'aiuse' && !!main().querySelector('#aiuPacks'));
    ok('초과 상태 막대', main().querySelector('.aiu-meter.over') && /초과/.test(main().innerText));
    main().querySelector('[data-act="aiu-buy"][data-v="p1m"]').click(); await wait(30);
    const md = document.querySelector('#modal'); ok('결제(데모) 확인 창 · 금액', md && /20,680원/.test(md.innerText) && /가짜 승인/.test(md.innerText));
    md.querySelector('[data-mact="ok"]').click(); await wait(50);
    const d = AIUSE.data(); ok('충전 반영: credit 100만 · 남은 90만 · 정상', d.credit === 1e6 && d.remaining === 900000 && d.state === 'ok' && d.creditLeft === 900000, d);
    ok('충전 기록 · 감사', (S.aicredit || []).length === 1 && /추가 충전 100만 토큰\(데모\)/.test(S.audit[0].what));
    go('home'); render(); await wait(30); ok('충전 뒤 알림 사라짐', !document.querySelector('.aiu-alert'));
    /* ⑤ 초과 처리 「차단」 → 충전 비활성 */
    open(); await wait(20); main().querySelector('[data-act="aiu-ov"][data-v="block"]').click(); await wait(30);
    ok('차단: 충전 버튼 비활성 · 안내', S.aiplan.overage === 'block' && [...main().querySelectorAll('[data-act="aiu-buy"]')].every(b => b.disabled) && /초과 처리가 「차단」/.test(main().innerText));
    main().querySelector('[data-act="aiu-ov"][data-v="pack"]').click(); await wait(20);
    /* ⑥ 권한: 부운영자 보기만 · 교강사 접근 불가 */
    S.me.role = 'sub'; open(); await wait(20);
    ok('부운영자: 충전 · 포함량 비활성', [...main().querySelectorAll('[data-act="aiu-buy"]')].every(b => b.disabled) && document.querySelector('#aiuTier').disabled && /추가 충전은 정운영자만/.test(main().innerText));
    S.aidemoUsed = 5e6; go('home'); render(); await wait(20); al = document.querySelector('.aiu-alert'); ok('부운영자 초과 알림 버튼은 「사용량 보기」', al && /사용량 보기/.test(al.innerText));
    S.me.role = 'teacher'; go('home'); render(); await wait(20); ok('교강사: 알림 없음', !document.querySelector('.aiu-alert'));
    S.me.role = 'owner'; S.aidemoUsed = 1000000;
    return out;
  });
  /* ⑦ 휴대폰 폭: 가로 넘침 없음 */
  await page.setViewportSize({ width: 390, height: 800 });
  const mob = await page.evaluate(async () => { slSetOpen('aiuse'); UI.settings = 'aiuse'; go('settings'); render(); await new Promise(r => setTimeout(r, 60)); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, has: !!document.querySelector('.aiu-packs') }; });
  R.push([mob.has && mob.sw <= mob.cw + 1, '휴대폰 폭 가로 넘침 없음', JSON.stringify(mob)]);
  R.push([errs.length === 0, '페이지 오류 없음', JSON.stringify(errs.slice(0, 3))]);
  await browser.close(); srv.close();
  let bad = 0; for (const [p, n, d] of R) { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} ${n}${p ? '' : ' ' + d}`); }
  console.log(`\n${R.length - bad}/${R.length} 통과`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
