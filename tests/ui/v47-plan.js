'use strict';
/* v47 요금제 기능 묶음 — 3단계 × 메뉴 잠금 · 잠금 카드 · 설정 요금제 카드 · AI 레벨 비활성 · 기존 기관 전 기능 · 새 기관 TRIAL · 공개 데이터 plan 없음
   사용: flock /tmp/pw.lock node tests/ui/v47-plan.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok));
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
  const R = await page.evaluate(async () => {
    localStorage.setItem('didisam.emptyStart', '0'); const out = []; const ok = (n, c, d) => out.push([!!c, n, d === undefined ? '' : JSON.stringify(d).slice(0, 300)]); const wait = ms => new Promise(r => setTimeout(r, ms));
    const txt = () => (document.querySelector('#main') || document.body).innerText;
    const lockedTabs = w => { go(w); render(); return [...document.querySelectorAll('.wtabs [data-act="go"][data-pl-lock]')].map(b => b.dataset.v).sort(); };
    const card = id => { go(id); render(); const c = document.querySelector('#main [data-pl-lockcard]'); return c ? c.dataset.plLockcard + '|' + c.innerText : ''; };
    const setPlan = code => { if (code) S.plan = { code, tier: '', contract: 'annual', aiMonthTokens: 5000000, since: '2026-03-01' }; else delete S.plan; S.me.role = 'owner'; save(); render(); };

    /* ① 새로 가입한 기관 = TRIAL(Pro 14일) */
    createOrg('univ', '요금제 대학'); await wait(900);
    ok('가입 → TRIAL', S.plan && S.plan.code === 'TRIAL' && S.plan.tier === 'pro' && S.plan.since === today() && PLAN.tier() === 'pro', S.plan);
    ok('머리 요금제 표시(Pro 체험 D-14)', /Pro 체험 D-14/.test((document.querySelector('.pl-chip') || {}).textContent || ''));
    S.plan.since = '2020-01-01'; ok('체험 종료 → Standard', PLAN.tier() === 'standard' && PLAN.info().expired === true); S.plan.since = today();
    /* 메뉴 켜기(잠금 대상이 탭으로 보이게) */
    ['journey', 'badge', 'org', 'sales', 'billing'].forEach(id => { const w = MENU[id].ws; const L = S.nav.tabs[w] = S.nav.tabs[w] || []; const x = L.find(t => t.id === id); if (x) x.on = true; else L.push({ id, on: true }); });

    /* ② Standard */
    setPlan('U0');
    ok('Standard: 학습 공간 자물쇠(러닝 저니 · 배지)', JSON.stringify(lockedTabs('learn').filter(x => ['journey', 'badge', 'class', 'assess'].includes(x))) === '["badge","journey"]', lockedTabs('learn'));
    ok('Standard: 운영 공간 자물쇠(기관 관리 · 매출)', ['org', 'sales'].every(x => lockedTabs('ops').includes(x)), lockedTabs('ops'));
    let c = card('journey'); ok('Standard: 러닝 저니 잠금 카드(Pro · 합니다체)', /^pro\|/.test(c) && /이 기능은 Pro 요금제부터 이용할 수 있습니다/.test(c) && /요금제 안내/.test(c) && /산타에 문의/.test(c), c);
    c = card('org'); ok('Standard: 기관 관리 잠금 카드(Enterprise)', /^enterprise\|/.test(c) && /Enterprise 요금제부터/.test(c), c);
    ok('Standard: 기본 메뉴는 열림(과정 · 평가)', !card('class') && !card('assess'));
    ok('Standard: AI 레벨 상한 L1 · 채점 초안 불가', PLAN.maxLevel() === 'L1' && !PLAN.can('grade') && PLAN.can('cpl'));
    /* AI 레벨 비활성(정책 센터) */
    S.aipol = { on: true, v: 1, lvl: 'L1', preset: { exam: 'L0', assign: 'L1' }, max: 'L2', retain: 'term', evalNotice: true, train: false }; slSetOpen('aipol'); go('settings'); render(); await wait(30);
    const segL2 = document.querySelector('[data-act="ap-set"][data-k="assign"][data-v="L2"]'), segL1 = document.querySelector('[data-act="ap-set"][data-k="assign"][data-v="L1"]');
    ok('Standard: 레벨 L2 · L3 비활성 + 요금제 표시', segL2 && segL2.disabled && segL2.dataset.plLock === 'pro' && /Pro/.test(segL2.innerText) && document.querySelector('[data-act="ap-set"][data-k="max"][data-v="L3"]').dataset.plLock === 'enterprise' && !segL1.disabled);
    ACT['ap-set']({ dataset: { k: 'assign', v: 'L2' } }); ok('Standard: L2 직접 호출도 막음', S.aipol.preset.assign === 'L1');
    S.aipol.on = false; render(); await wait(20); const sw = document.querySelector('[data-act="ap-on"]'); ACT['ap-on']();
    ok('Standard: Ver2 학습 루프 켜기 잠금', S.aipol.on === false && sw && sw.disabled && /Pro 요금제부터/.test(sw.closest('.ap-row').innerText));
    S.aipol.on = true; const n0 = (document.querySelector('#toasts') || {}).innerText; ACT['g2-all'](); await wait(10);
    ok('Standard: 채점 초안 일괄 → 요금제 안내', /AI 채점 초안은 Pro 요금제부터/.test(document.querySelector('#toasts').innerText), n0);
    /* 설정 › 요금제 카드 */
    ACT['pl-open'](); await wait(30); let t = txt();
    ok('요금제 카드: 현재 · 단계 · 계약 · 구독료 · 토큰 · 갱신일', /U0 · 대학 사업단/.test(t) && /Standard/.test(t) && /연간 구독/.test(t) && /1,500만원/.test(t) && /VAT 별도/.test(t) && /VAT 포함 1,650만원/.test(t) && /5,000,000 토큰/.test(t) && /2027-03-01/.test(t), t.slice(0, 600));
    ok('요금제 카드: 단계별 기능 비교표', document.querySelectorAll('.pl table tbody tr').length >= 16 && /Ver2 학습 루프/.test(t) && /SSO · API · MCP/.test(t) && /직업훈련 규정 준수/.test(t) && document.querySelector('.pl th.cur').innerText.startsWith('Standard'));
    ok('설정 목차 요금제 요약', SXC_X && /U0/.test(document.body.innerText));

    /* ③ Pro */
    setPlan('E2');
    ok('Pro: 학습 · 운영 자물쇠는 기관 관리만', lockedTabs('learn').length === 0 && JSON.stringify(lockedTabs('ops')) === '["org"]', [lockedTabs('learn'), lockedTabs('ops')]);
    ok('Pro: 러닝 저니 · 배지 열림', !card('journey') && !card('badge'));
    slSetOpen('aipol'); go('settings'); render(); await wait(20);
    ok('Pro: L2 열림 · L3만 비활성', !document.querySelector('[data-act="ap-set"][data-k="assign"][data-v="L2"]').disabled && document.querySelector('[data-act="ap-set"][data-k="assign"][data-v="L3"]').dataset.plLock === 'enterprise');
    ok('Pro: MCP · API 키 연결 잠금', PLAN.connLocked('mcp') && PLAN.connLocked('claude') && !PLAN.connLocked('toss'));
    ACT['pl-open'](); await wait(20); t = txt(); ok('Pro 요금제 카드: E2 구독료 3,060만원', /3,060만원/.test(t) && /VAT 포함 3,366만원/.test(t) && document.querySelector('.pl th.cur').innerText.startsWith('Pro'), t.slice(0, 300));

    /* ④ Enterprise */
    setPlan('E3');
    ok('Enterprise: 자물쇠 없음', !lockedTabs('learn').length && !lockedTabs('ops').length && !lockedTabs('people').length && PLAN.maxLevel() === 'L3' && !PLAN.connLocked('mcp'));
    ACT['pl-open'](); await wait(20); t = txt(); ok('Enterprise 요금제 카드: 전담 매니저 포함', /8,400만원/.test(t) && /전담 매니저\s*포함/.test(t));
    setPlan('E4'); ACT['pl-open'](); await wait(20); ok('E4: 협의(하한)', /협의/.test(txt()) && /하한 1,200원/.test(txt()));

    /* ⑤ 기존 기관(plan 없음) = 전 기능 */
    setPlan('');
    const allMenus = Object.keys(MENU).filter(id => menuOn(id));
    const cards = []; for (const id of allMenus) { if (card(id)) cards.push(id); }
    ok('기존 기관: 모든 메뉴 잠금 0', !cards.length && !document.querySelector('[data-pl-lock]'), cards);
    ok('기존 기관: 머리 「기존 계약 · 전체 기능」', /기존 계약 · 전체 기능/.test((document.querySelector('.pl-chip') || {}).textContent || ''));
    ok('기존 기관: L3 · 채점 · MCP 가능', PLAN.lvOk('L3') && PLAN.can('grade') && !PLAN.connLocked('mcp'));
    ACT['pl-open'](); await wait(20); ok('기존 기관 요금제 카드', /전체 기능\(Enterprise 기준\)/.test(txt()) && /요금제 도입 전에 계약한 기관/.test(txt()));
    /* upgradeState가 plan을 만들지 않음 */
    upgradeState(); ok('기존 기관: upgradeState 뒤에도 plan 없음', S.plan === undefined);

    /* ⑥ 공개 데이터에 plan 없음 · 부운영자 */
    setPlan('E2'); const pub = JSON.stringify(typeof lsSnapshot === 'function' ? lsSnapshot() : {}); ok('게시본에 plan 없음', !/"TRIAL"|"E2"|"aiMonthTokens"|"contract"/.test(pub));
    S.me.role = 'sub'; const sc = card('org'); ok('부운영자: 잠금 카드에 요금제 안내 버튼 없음', !!sc && !/^요금제 안내$/m.test(sc) && !document.querySelector('#main [data-act="pl-open"]') && /정운영자가 볼 수 있습니다/.test(sc), [sc, CUR, (document.querySelector('#main') || {}).innerText.slice(0, 200)]); S.me.role = 'owner';
    return out;
  });
  let bad = 0; for (const [p, n, d] of R) { console.log(`${p ? '✓' : '✗'} ${n}${p ? '' : ' ' + d}`); if (!p) bad++; }
  if (errs.length) { console.log('페이지 오류:', errs.slice(0, 5)); bad++; }
  await browser.close(); srv.close();
  console.log(bad ? `✗ ${bad}건 실패 / ${R.length}` : `✓ v47 요금제 ${R.length}건 통과`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
