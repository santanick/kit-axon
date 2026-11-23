'use strict';
/* v47 운영자 · 학습자 한도 점검(대표 지시 2026-11-24: 「하루 학습자 질문 횟수를 관리자가 원하는 숫자를 넣어 선택」 · 「내 학습에서 학습시간을 더 늘려 조정(현재 2시간 max)」)
   1) 관리자 「1인 하루 질문 수」: 칩 10 · 20 · 50 · 100 + 숫자 직접 입력(1~500), 범위 밖 값 보정, 학습자 게시본(lsSnapshot) 상한 500
   2) 학습자 튜터 「오늘 N회 남음」이 운영자 값(300)으로 표시
   3) 학습자 하루 목표(튜브 오늘 목표): 칩 · 30분 단위 −/+ · 직접 입력 · 3시간 저장 · 8시간 상한 보정 · 기존 저장값(20분) 호환
   4) 시험 목표 「하루에 쓸 수 있는 시간」: 3 · 4시간 칩 + 직접 입력(5시간) → 튜터 계획 m
   5) 서버 규칙(Node 원문): cleanTube goal 5~480 · 튜터 계획 m 480 · tutorRoute 상한 500, Java도 같은 상한
   사용: node tests/ui/v47-limits.js (정적 서버는 이 스크립트 안에서 띄우고 끈다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.webmanifest': 'application/json' };
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const LP = { tube: { goal: 20, sec: { [today]: 720 } } };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  try {
    /* 1) 관리자 */
    for (const w of [1280, 390]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' });
      await p.evaluate(async () => { createOrg('adult', '점검 기관'); await new Promise(o => setTimeout(o, 60)); go('rules'); render(); }); await p.waitForTimeout(200);
      const r0 = await p.evaluate(() => { const q = document.querySelector('.v47-dq'); return { has: !!q, chips: q ? [...q.querySelectorAll('[data-act=tud]')].map(b => b.textContent.trim()) : [], v: q ? q.querySelector('input[type=number]').value : '', max: q ? q.querySelector('input').max : '', range: !!document.querySelector('input[type=range][data-k=daily]') }; });
      ok(r0.has && r0.chips.join() === '10회,20회,50회,100회' && r0.v === '20' && r0.max === '500' && !r0.range, `관리자 ${w}: 칩 10 · 20 · 50 · 100 + 숫자 칸(기본 20, 최대 500) · 슬라이더 없음 — ${JSON.stringify(r0)}`);
      if (w === 390) { ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '관리자 390: 가로 넘침 없음'); ok(!errs.length, `관리자 390: 오류 없음 ${errs.join(' | ')}`); await ctx.close(); continue; }
      await p.click('.v47-dq [data-act=tud][data-v="100"]'); await p.waitForTimeout(100);
      ok(await p.evaluate(() => S.settings.tutor.daily === 100 && lsSnapshot().tutor.daily === 100 && document.querySelector('.v47-dq [data-v="100"]').classList.contains('on')), '칩 100 → 저장 · 게시본 100 · 칩 표시');
      const setN = async v => { await p.fill('.v47-dq input[type=number]', v); await p.evaluate(() => { window.__T = []; const i = document.querySelector('.v47-dq input[type=number]'); i.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(120);
        return p.evaluate(() => ({ s: S.settings.tutor.daily, pub: lsSnapshot().tutor.daily, v: (document.querySelector('.v47-dq input[type=number]') || {}).value, t: window.__T.join(' / ') })); };
      await p.evaluate(() => { new MutationObserver(M => M.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('toast')) (window.__T = window.__T || []).push(n.textContent); }))).observe(document.querySelector('#toasts'), { childList: true }); });
      let r = await setN('300'); ok(r.s === 300 && r.pub === 300 && r.v === '300', `직접 입력 300 → 저장 · 게시본 300 — ${JSON.stringify(r)}`);
      r = await setN('9999'); ok(r.s === 500 && r.pub === 500 && r.v === '500' && /500회로 맞췄습니다/.test(r.t), `9999 → 500으로 보정 + 안내 — ${JSON.stringify(r)}`);
      r = await setN('0'); ok(r.s === 1 && r.v === '1' && /1회로 맞췄습니다/.test(r.t), `0 → 1로 보정 — ${JSON.stringify(r)}`);
      r = await setN('37'); ok(r.s === 37 && /37회로 저장했습니다/.test(r.t), `37 → 그대로 저장 — ${JSON.stringify(r)}`);
      r = await setN(''); ok(r.s === 37 && r.v === '37' && /숫자/.test(r.t), `빈 값 → 바꾸지 않고 안내 — ${JSON.stringify(r)}`);
      ok(await p.evaluate(() => { S.settings.tutor.daily = 800; const a = lsSnapshot().tutor.daily; S.settings.tutor.daily = 'x'; const b = lsSnapshot().tutor.daily; S.settings.tutor.daily = 37; return a === 500 && b === 20; }), '게시본(lsSnapshot) 상한 500 · 숫자 아님은 20');
      ok(!errs.length, `관리자 오류 없음 ${errs.join(' | ')}`); await ctx.close();
    }

    /* 2) ~ 4) 학습자 앱 390 */
    const open = async (hash, o = {}) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.route(/learner-demo-adult\.json/, r => { const j = JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8')); j.tutor = { ...(j.tutor || {}), daily: 300 }; r.fulfill({ contentType: 'application/json', body: JSON.stringify(j) }); });
      await p.addInitScript(lp => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '', id: '20269000' })); if (!sessionStorage.getItem('v47.once')) { sessionStorage.setItem('v47.once', '1'); localStorage.setItem('didisam.room.sample.lp', JSON.stringify({ '20269000': lp })); } localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, o.lp || LP);
      await p.goto(`${base}/learner.html?demo=adult&app=1${hash}`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { ctx, p, errs }; };
    { const { ctx, p, errs } = await open('#home');
      /* 2) 튜터 남은 횟수 */
      await p.evaluate(() => { if (typeof ltOpen === 'function') ltOpen(); }); await p.waitForTimeout(250);
      const note = await p.evaluate(() => ((document.querySelector('.lt-note') || {}).textContent || '').replace(/\s+/g, ' '));
      ok(/오늘 300회 남/.test(note), `학습자 튜터: 「오늘 300회 남음」 — ${note}`);
      await p.evaluate(() => { const x = document.querySelector('[data-tact="close"]'); x && x.click(); }); await p.waitForTimeout(150);
      /* 3) 하루 목표 */
      const g0 = await p.evaluate(() => (e => e ? (e.getAttribute('aria-label') + ' ' + e.textContent) : '')([...document.querySelectorAll('[data-tb="goal"]')].find(x => x.offsetParent)) /* v47 통합: 홈 목표는 한 줄 링(.tb-gm), 카드(.tb-gb)는 더 보기 안 */ || ''); ok(/오늘 목표 20분/.test(g0), `기존 저장값 20분 그대로 — ${g0.replace(/\s+/g, ' ').slice(0, 60)}`);
      await p.locator('[data-tb="goal"] >> visible=true').first().click(); await p.waitForTimeout(150);
      const sh = await p.evaluate(() => ({ chips: [...document.querySelectorAll('.tb-gopt button')].map(b => b.textContent.trim()), on: (document.querySelector('.tb-gopt .on') || {}).textContent, inp: (document.querySelector('#tbGIn') || {}).value, max: (document.querySelector('#tbGIn') || {}).max, over: document.documentElement.scrollWidth > innerWidth + 1,
        tap: [...document.querySelectorAll('#apSheet button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height < 44; }).map(b => b.textContent.trim()) }));
      ok(sh.chips.join() === '10분,20분,30분,1시간,1시간 30분,2시간,3시간,4시간' && sh.on === '20분' && sh.inp === '20' && sh.max === '480', `목표 시트: 칩 8개(최대 4시간) + 직접 입력(최대 480분) — ${JSON.stringify(sh)}`);
      ok(!sh.over && !sh.tap.length, `목표 시트 390: 넘침 없음 · 누르는 곳 44px ${sh.tap.join(',')}`);
      await p.click('[data-tb=goal-step][data-v="30"]'); ok(await p.inputValue('#tbGIn') === '30', '+30분: 20 → 30(30분 단위로 맞춤)');
      await p.click('[data-tb=goal-step][data-v="30"]'); await p.click('[data-tb=goal-step][data-v="-30"]'); ok(await p.inputValue('#tbGIn') === '30', '+30 · −30 → 30');
      await p.fill('#tbGIn', '180'); await p.click('[data-tb=goal-in]'); await p.waitForTimeout(800);
      let t = await p.evaluate(() => ({ goal: LR.lp.tube.goal, gb: (e => e ? (e.getAttribute('aria-label') + ' ' + e.textContent) : '')([...document.querySelectorAll('[data-tb="goal"]')].find(x => x.offsetParent)) /* v47 통합: 홈 목표는 한 줄 링(.tb-gm), 카드(.tb-gb)는 더 보기 안 */.replace(/\s+/g, ' '), saved: (JSON.parse(localStorage.getItem('didisam.room.sample.lp') || '{}')['20269000'] || { tube: {} }).tube.goal, sheet: !!document.querySelector('#apSheet') }));
      ok(t.goal === 180 && /오늘 목표 3시간/.test(t.gb) && /12\/180분/.test(t.gb) /* v47 통합: 남은 시간 문구는 「더 보기」 목표 카드에만 */ && !t.sheet, `목표 3시간(180분) 저장 · 홈 표시 — ${JSON.stringify(t)}`);
      ok(t.saved === 180, `기기 저장(데모 lp)에도 180 — ${t.saved}`);
      await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(900);
      ok(await p.evaluate(() => LR.lp.tube.goal === 180 && /오늘 목표 3시간/.test(document.querySelector('.tb-gb').textContent)), '다시 열어도 3시간 유지');
      await p.locator('[data-tb="goal"] >> visible=true').first().click(); await p.waitForTimeout(120); ok(await p.inputValue('#tbGIn') === '180' && /3시간/.test(await p.textContent('.tb-gopt .on')), '시트를 다시 열면 3시간 선택');
      await p.fill('#tbGIn', '999'); await p.press('#tbGIn', 'Enter'); await p.waitForTimeout(250);
      t = await p.evaluate(() => ({ goal: LR.lp.tube.goal, toast: document.body.innerText })); ok(t.goal === 480 && /8시간으로 맞췄어요/.test(t.toast), `999분 → 8시간(480)으로 보정 + 안내 — ${t.goal}`);
      await p.locator('[data-tb="goal"] >> visible=true').first().click(); await p.waitForTimeout(120); await p.fill('#tbGIn', ''); await p.click('[data-tb=goal-in]'); await p.waitForTimeout(120);
      ok(await p.evaluate(() => !!document.querySelector('#apSheet') && /5분에서 8시간 사이/.test(document.querySelector('#apSheet .tb-gerr').textContent) && LR.lp.tube.goal === 480), '빈 값 → 저장하지 않고 시트 안 안내');
      await p.click('.tb-gopt button[data-v="90"]'); await p.waitForTimeout(200); ok(await p.evaluate(() => LR.lp.tube.goal === 90 && /1시간 30분/.test(document.querySelector('.tb-gb').textContent)), '칩 1시간 30분 → 90 저장');
      ok(!errs.length, `학습자 오류 없음 ${errs.join(' | ')}`); await ctx.close(); }

    /* 4) 시험 목표 하루 시간 */
    { const { ctx, p, errs } = await open('#home');
      await p.evaluate(() => { location.hash = '#notes/goal'; }); await p.waitForTimeout(300);
      const ent = await p.$('.lns-empty [data-lns=goal]');
      if (!ent) ok(false, '시험 목표 진입 버튼 없음'); else {
        await ent.click(); await p.waitForTimeout(120); await p.fill('#lnsGq', '정보처리'); await p.waitForTimeout(80); await p.click('.lns-opt[data-v="정보처리기사"]'); await p.waitForTimeout(80);
        const c = await p.evaluate(() => [...document.querySelectorAll('.lns-chip[data-lns=gh]')].map(b => b.textContent.trim())); ok(c.join() === '30분,1시간,2시간,3시간,4시간', `하루 시간 칩: 최대 4시간 + 직접 입력 — ${c.join(',')}`);
        await p.click('.lns-chip[data-lns=gh][data-v="180"]'); await p.waitForTimeout(80); ok(await p.inputValue('#lnsGh') === '180', '3시간 칩 → 입력 칸 180');
        await p.fill('#lnsGh', '300'); await p.evaluate(() => document.querySelector('#lnsGh').dispatchEvent(new Event('change', { bubbles: true }))); await p.waitForTimeout(100);
        ok(/5시간/.test(await p.textContent('.lns-ghin')), '직접 입력 300분 → 「5시간」 표시');
        const tap = await p.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth + 1, tap: [...document.querySelectorAll('.lns-chip[data-lns=gh]')].filter(b => { const r = b.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).length })); ok(!tap.over && !tap.tap, `시험 목표 390: 넘침 없음 · 칩 44px ${JSON.stringify(tap)}`);
        await p.click('[data-lns=gsave]'); await p.waitForTimeout(300);
        ok(await p.evaluate(() => LR.lp.tutor.plan.length >= 1 && LR.lp.tutor.plan.every(x => x.m === 300) && Object.keys(localStorage).some(k => /^didisam\.note\.goalh\./.test(k) && localStorage.getItem(k) === '300')), '저장: 튜터 계획 하루 300분 · 기기 저장 300');
        ok(/하루 5시간/.test(await p.textContent('#lm')), '목표 화면: 「하루 5시간」');
        await p.evaluate(() => { const k = Object.keys(localStorage).find(x => /^didisam\.note\.goalh\./.test(x)); localStorage.setItem(k, '9999'); location.hash = '#home'; }); await p.waitForTimeout(150); await p.evaluate(() => { location.hash = '#notes/goal'; }); await p.waitForTimeout(250);
        ok(/하루 8시간/.test(await p.textContent('#lm')), '저장값이 8시간을 넘으면 8시간으로 읽음'); }
      ok(!errs.length, `시험 목표 오류 없음 ${errs.join(' | ')}`); await ctx.close(); }

    /* 5) 서버 규칙 */
    { const src = fs.readFileSync(path.resolve(__dirname, '../../service/server/app.js'), 'utf8'); const blk = src.match(/const isNum[\s\S]*?\nfunction cleanTube[^\n]*\n(?:[^\n]*\n)*?[^\n]*return o; }\n/);
      const java = fs.readFileSync(path.resolve(__dirname, '../../service-egov/src/main/java/egovframework/didisam/pub/service/impl/PubServiceImpl.java'), 'utf8');
      if (blk) { const F = new Function(blk[0] + '; return { cleanTube };')(); ok(F.cleanTube({ goal: 480 }).goal === 480 && F.cleanTube({ goal: 180 }).goal === 180 && !('goal' in F.cleanTube({ goal: 481 })) && !('goal' in F.cleanTube({ goal: 4 })), 'Node cleanTube: goal 5~480'); }
      else ok(/g >= 5 && g <= 480\) o\.goal = g/.test(src), 'Node cleanTube: goal 5~480(원문)');
      ok(/Math\.min\(500, Math\.max\(1, Math\.round\(\+tu\.daily\) \|\| 20\)\)/.test(src) && !/Math\.min\(200, Math\.max\(1, \+tu\.daily/.test(src), 'Node tutorRoute: 1인 하루 상한 500');
      ok(/m: Math\.min\(480, Math\.max\(0, Math\.round\(\+x\.m/.test(src), 'Node cleanLP 튜터 계획 m 480');
      ok(/Math\.min\(500, Math\.max\(1, dl\)\)/.test(java) && /g >= 5 && g <= 480\) o\.put\("goal"/.test(java) && /Math\.min\(480, Math\.max\(0, round\(mm\)\)\)/.test(java), 'Java: 같은 상한(500 · 480 · 480)'); }
  } catch (e) { ok(false, '예외 ' + (e && e.stack || e)); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
