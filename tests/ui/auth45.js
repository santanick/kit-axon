'use strict';
/* v45 데모 모드 진입 동선(FLOW §5 데모 N1–N3 · R1 · R3 · C1 · E7 · A1) — 서버 없이 이 브라우저 안 가입.
   진입 한 장(#entry, 로그인 / 가입 탭, 카카오 · Google · 이메일) → ① 기관(#suForm) → ② 홈페이지(onb45.js #onbTpl) → 대시보드.
   사용: node tests/ui/auth45.js  (정적 서버를 시험 안에서 띄웠다 끔 · SHOT_DIR=폴더 · ONLY_W=1440|390)
   STRICT=1이 아니면 진입 화면(core.js renderEntry)이 아직 없을 때 '건너뜀'으로 표시합니다(통합 전). */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const SHOT = process.env.SHOT_DIR || ''; const STRICT = process.env.STRICT === '1'; const PW = 'Demo45pass2026';
let pass = 0, fail = 0, skip = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };
let BR, W = 1440, base = '';

async function ctxNew() { return BR.newContext({ viewport: { width: W, height: W === 390 ? 844 : 900 }, ...(W === 390 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) }); }
async function open(ctx, errs, hash = '') { const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept()); await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await pg.goto(base + 'index.html' + hash, { waitUntil: 'load' }); await settle(pg); return pg; }
const settle = async pg => { await pg.waitForFunction(() => !document.querySelector('.gen') && document.querySelector('#entry, #suForm, #onbTpl, #main'), null, { timeout: 12000 }).catch(() => {}); await pg.waitForTimeout(250); };
const scr = pg => pg.evaluate(() => document.querySelector('#onbTpl') ? 'tpl' : document.querySelector('#entry') ? 'entry' : document.querySelector('#suForm') ? 'org' : document.querySelector('#main') ? 'app' : '?');
const view = pg => pg.evaluate(() => (window.SUV || {}).view);
const st = pg => pg.evaluate(() => typeof S !== 'undefined' && S && S.org ? { name: S.org.name, type: S.org.type, ed: S.org.ed || '', onb: S.onb || null, site: S.site && S.site.tpl, guide: !!(S.bld && S.bld.steps && S.bld.steps.site && S.bld.steps.site.done) } : null);
async function tab(pg, v) { if ((await view(pg)) === v) return; const s = `#entry [role=tab][data-v=${v}]`; if (await pg.$(s)) await pg.click(s); else { const T = await pg.$$('#entry [role=tab]'); if (T.length === 2) await T[v === 'login' ? 0 : 1].click(); else await pg.click(`#entry button:has-text("${v === 'login' ? '로그인' : '3초 만에 시작'}")`); } await pg.waitForTimeout(200); }
const btn = (pg, txt) => pg.click(`#entry button:has-text("${txt}"), #entry a:has-text("${txt}")`);
async function mail(pg, email, pw) {
  if (!(await pg.$('#entry input[type=email]'))) await btn(pg, '이메일로 계속하기');
  await pg.fill('#entry input[type=email]', email); await pg.fill('#entry input[type=password]', pw);
  await pg.click('#entry button:has-text("다음"), #entry button[type=submit]'); await pg.waitForTimeout(300); await settle(pg);
}
async function org(pg, type, name, ed) {
  const card = ['k12', 'adult'].includes(type) ? 'academy' : type;
  await pg.click(`#suForm [data-act=su-type][data-v=${card}]`); if (card === 'academy') await pg.click(`#suForm [data-act=su-type][data-v=${type}]`);
  if (ed) await pg.click(`#suForm [data-act=su-ed][data-v=${ed}]`);
  await pg.fill('#suForm input[name=name]', name); await pg.click('#suForm button[type=submit]'); await pg.waitForTimeout(400);
  /* slim.js가 먼저 대시보드를 그리고 0.8초 뒤 ②로 바뀐다 */
  await pg.waitForFunction(() => document.querySelector('#onbTpl, #entry') || (document.querySelector('#main') && !document.querySelector('.gen') && !(typeof S !== 'undefined' && S && S.onb && S.onb.tpl === 'pending')), null, { timeout: 5000 }).catch(() => {}); await settle(pg);
}
/* ②: 카드를 고르고(미리 보기 시트가 열리면 그 버튼, 아니면 하단 「이 템플릿으로 시작」) / 나중에 */
async function pick(pg) {
  await pg.click('#onbTpl .tpd-c:not([hidden])'); await pg.waitForTimeout(400);
  let id;
  if (await pg.$('[data-act=tpd-use]:visible')) { id = await pg.getAttribute('[data-act=tpd-use]:visible', 'data-v'); await pg.click('[data-act=tpd-use]:visible'); }
  else { id = await pg.getAttribute('#onbTpl [data-act=onb-use]', 'data-v'); await pg.click('#onbTpl [data-act=onb-use]'); }
  await pg.waitForTimeout(500); await settle(pg); return id;
}
const later = async pg => { await pg.click('#onbTpl [data-act=onb-later]:visible >> nth=0'); await pg.waitForTimeout(500); await settle(pg); };
async function logout(pg, tag) {
  await pg.evaluate(() => go('settings')); await pg.waitForTimeout(250);
  const b = pg.locator('button:has-text("이 브라우저에서 로그아웃")');
  if (await b.count()) { await b.first().click(); await pg.waitForTimeout(400); await settle(pg); ok((await scr(pg)) === 'entry', `${tag}: 설정 › 계정 「이 브라우저에서 로그아웃」 → 진입`); }
  else { ok(false, `${tag}: 설정에 「이 브라우저에서 로그아웃」 버튼`); await pg.evaluate(() => { DREG.use(null); }); await pg.reload({ waitUntil: 'load' }); await settle(pg); }
}
const shot = async (pg, n) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await pg.screenshot({ path: path.join(SHOT, `auth45_${W}_${n}.png`), fullPage: true }); };
async function a11y(pg, tag, root) {
  const r = await pg.evaluate(rs => {
    const num = s => (String(s).match(/[\d.]+/g) || []).map(Number);
    const L = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = num(cs.backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.6)) return c; } return [255, 255, 255]; };
    const R = document.querySelector(rs) || document.body; const bad = [];
    R.querySelectorAll('*').forEach(el => {
      if (!el.getClientRects().length || el.closest('[disabled],[aria-disabled="true"],[hidden],.sr-only,.sr,iframe,.tpd-th')) return;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.5) return;
      const bg = bgOf(el); if (!bg) return; let fg = num(cs.color); if (fg[3] !== undefined && fg[3] < 1) fg = [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
      const a = L(fg), b = L(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const fs = parseFloat(cs.fontSize); const big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
      if (ratio < (big ? 3 : 4.5)) bad.push(`${el.tagName.toLowerCase()}「${el.textContent.trim().slice(0, 14)}」${ratio.toFixed(2)}`);
    });
    const rb = bgOf(R) || [0, 0, 0]; return { bad, white: L(rb) > 0.85, sx: document.documentElement.scrollWidth - innerWidth };
  }, root);
  ok(!r.bad.length, `${tag}: 글자 대비 4.5:1 이상 ${r.bad.slice(0, 4).join(' · ')}${r.bad.length > 4 ? ` 외 ${r.bad.length - 4}` : ''}`);
  ok(r.white, `${tag}: 흰 바탕`); ok(r.sx <= 0, `${tag}: 가로 스크롤 없음 (${r.sx}px)`);
}

async function run() {
  const errs = [];
  /* 통합 확인: 진입 화면이 아직 없으면(core.js 개발 1 미통합) 건너뜀 */
  { const c = await ctxNew(); const p = await open(c, errs); const has = (await scr(p)) === 'entry'; await c.close();
    if (!has && !STRICT) { skip++; console.log(`- ${W}: 데모 진입 화면(#entry) 없음 — core.js 통합 전이라 건너뜀`); return; } }
  /* N1 카카오 → 대학 · 학사 LMS → 템플릿, C1 ②에서 새로고침, R1 두 번째 기관 · 로그아웃 · 마지막 기관 */
  const c = await ctxNew(); const p = await open(c, errs); const T = `N1 ${W}`;
  ok((await view(p)) === 'signup', `${T}: 저장된 기관 없으면 가입 탭 (${await view(p)})`);
  ok(/데모입니다/.test(await p.textContent('body')), `${T}: 데모 안내 문구`);
  for (const t of ['카카오로 계속하기', 'Google로 계속하기', '이메일로 계속하기']) ok(await p.locator(`#entry :is(button,a):has-text("${t}")`).count() > 0, `${T}: 「${t}」`);
  await shot(p, 'entry-signup'); await a11y(p, `${T} 진입`, '#entry');
  await btn(p, '카카오로 계속하기'); await settle(p); ok((await scr(p)) === 'org', `${T}: 카카오 → ① (${await scr(p)})`);
  ok(/1\/2/.test(await p.textContent('body')), `${T}: 진행 표시 1/2`); ok(!!(await p.$('#suEmpty')), `${T}: ① 아래 빈 스튜디오`);
  await shot(p, 'org'); await a11y(p, `${T} ①`, '#suForm');
  await org(p, 'univ', '해운대대학교', 'lms'); ok((await scr(p)) === 'tpl', `${T}: ② 홈페이지 (${await scr(p)})`);
  ok(await p.evaluate(() => [...document.querySelectorAll('#onbTpl .tpd-ty .on, #onbTpl .tpd-ty [aria-pressed=true], #onbTpl .tpd-ty [aria-selected=true]')].some(x => /대학/.test(x.textContent))), `${T}: ② 유형 칩 = 대학`);
  await shot(p, 'tpl'); await a11y(p, `${T} ②`, '#onbTpl');
  await p.reload({ waitUntil: 'load' }); await settle(p); ok((await scr(p)) === 'tpl', `C1 ${W}: ②에서 새로고침 → ② 이어감`);
  const id = await pick(p); let s = await st(p);
  ok(s && s.ed === 'lms' && s.site === id && s.onb && s.onb.tpl === 'picked' && s.guide, `${T}: ed=lms · site.tpl=${id} · onb=picked · 가이드 완료 (${JSON.stringify(s)})`); ok((await scr(p)) === 'app', `${T}: 대시보드`); await shot(p, 'dash');
  await logout(p, `R1 ${W}`); ok((await view(p)) === 'login', `R1 ${W}: 저장된 기관 있으면 로그인 탭`);
  /* N2 (같은 브라우저 두 번째 기관) Google → 학원 · 초중고 → 나중에 */
  await tab(p, 'signup'); await btn(p, 'Google로 계속하기'); await settle(p); await org(p, 'k12', '마린수학학원'); await later(p);
  s = await st(p); const t0 = await p.evaluate(() => tplFor('k12')[0].id); ok(s && s.type === 'k12' && s.site === t0 && s.onb.tpl === 'later', `N2 ${W}: 나중에 → 추천 1번 ${t0} (${JSON.stringify(s)})`);
  await p.reload({ waitUntil: 'load' }); await settle(p); ok((await scr(p)) === 'app' && (await st(p)).name === '마린수학학원', `R1 ${W}: 새로고침 → 마지막 기관(두 번째) 대시보드`);
  await logout(p, `R1 ${W}`); await btn(p, '카카오로 계속하기').catch(() => {}); await p.waitForTimeout(250);
  const L = await p.$$('[data-act=dr-switch]'); ok(L.length === 2, `R1 ${W}: 로그인 탭 「이 브라우저의 기관」 2개 (${L.length})`); await shot(p, 'entry-login');
  if (L.length) { await p.click('[data-act=dr-switch]:has-text("해운대대학교")'); await p.waitForTimeout(500); await settle(p); ok((await scr(p)) === 'app' && (await st(p)).name === '해운대대학교', `R1 ${W}: 고른 기관 대시보드`); }
  await c.close();
  /* N3 이메일(잘못된 비번) → 공공 · 시설형 → 템플릿, 비밀번호 저장 안 됨 */
  { const c3 = await ctxNew(); const p3 = await open(c3, errs, '#signup'); const T3 = `N3 ${W}`;
    await mail(p3, 'n3@example.com', 'short'); ok((await scr(p3)) === 'entry' && /10자 이상/.test(await p3.textContent('#entry')), `${T3}: 비밀번호 규칙 문구 · ①로 가지 않음`);
    await mail(p3, 'n3@example.com', PW); ok((await scr(p3)) === 'org', `${T3}: 이메일 → ①`); await org(p3, 'public', '해운대구 체육시설', 'facility'); const id3 = await pick(p3); const s3 = await st(p3);
    ok(s3 && s3.ed === 'facility' && s3.site === id3 && s3.onb.tpl === 'picked', `${T3}: 공공 · 시설형 템플릿 (${JSON.stringify(s3)})`);
    ok(await p3.evaluate(pw => { const a = []; for (const x of [localStorage, sessionStorage]) for (let i = 0; i < x.length; i++) a.push(x.getItem(x.key(i)) || ''); return !a.some(v => v.includes(pw)); }, PW), `${T3}: 비밀번호가 브라우저 저장소에 없음`); await c3.close(); }
  /* E7 로그인 탭에서 저장된 기관 없음 */
  { const c7 = await ctxNew(); const p7 = await open(c7, errs, '#login'); const T7 = `E7 ${W}`; ok((await view(p7)) === 'login', `${T7}: #login 해시`);
    await btn(p7, '카카오로 계속하기'); await p7.waitForTimeout(300); ok(/이 브라우저에 저장된 기관이 없습니다/.test(await p7.textContent('body')), `${T7}: 빈 상태 문구`);
    const g = p7.locator('#entry button:has-text("가입으로")'); ok(await g.count() > 0, `${T7}: [가입으로]`); if (await g.count()) { await g.first().click(); await p7.waitForTimeout(200); ok((await view(p7)) === 'signup', `${T7}: 가입 탭으로`); } await c7.close(); }
  /* R3 v44 기존 기관(createOrg 직접 · onb 없음) → ② 없음 */
  { const c8 = await ctxNew(); const p8 = await open(c8, errs); await p8.evaluate(() => createOrg('corp', '레거시기업')); await p8.waitForTimeout(1100); await settle(p8); ok((await scr(p8)) === 'app' && !(await st(p8)).onb, `R3 ${W}: createOrg 직접 호출 → ② 없이 대시보드`);
    await p8.reload({ waitUntil: 'load' }); await settle(p8); ok((await scr(p8)) === 'app', `R3 ${W}: 새로고침해도 대시보드`); await c8.close(); }
  ok(!errs.length, `${W}: 페이지 오류 없음 ${errs.slice(0, 3).join(' | ')}`);
}

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(k => srv.once('listening', k)); base = `http://127.0.0.1:${srv.address().port}/`;
  BR = await chromium.launch();
  try { for (const w of (process.env.ONLY_W ? [+process.env.ONLY_W] : [1440, 390])) { W = w; console.log(`── ${W === 390 ? '휴대폰 390' : 'PC 1440'}`); try { await run(); } catch (e) { ok(false, `${W}: ${e.message.split('\n')[0]}`); } } }
  finally { await BR.close(); srv.close(); }
  console.log(`pass ${pass} fail ${fail}${skip ? ` skip ${skip}` : ''}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
