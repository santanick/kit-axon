'use strict';
/* 기관 유형별 현황 위젯(didisam/dashx.js) 스모크.
   유형 · 에디션마다 샘플 데이터 기관과 빈 스튜디오를 만들어 현황을 열고,
   ① 위젯이 그 유형의 기본 구성과 같은지 ② 모든 버튼이 오류 없이 화면을 옮기는지 ③ 1440 · 390 가로 넘침이 없는지
   ④ 교수자 구성 ⑤ 숨기기 · 순서(버튼 · Alt+↓ · 끌어 놓기) · 기본 구성 되돌리기를 확인한다.
   사용: node tests/ui/dashx.js  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json', '.svg': 'image/svg+xml' };
const CASES = [['univ', 'lms', 'ulms'], ['univ', 'lite', 'ulite'], ['voc', '', 'voc'], ['k12', '', 'k12'], ['adult', '', 'adult'], ['corp', '', 'corp'], ['public', '', 'public'], ['lifelong', '', 'lifelong']];
const TEACH = { ulms: 't_ulms', k12: 't_k12' };

(async () => {
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; let checks = 0;
  const ok = (c, m) => { checks++; if (!c) { fails.push(m); console.log('FAIL', m); } };

  for (const [type, ed, key] of CASES) for (const empty of [false, true]) for (const width of [1440, 390]) {
    const label = `${type}${ed ? '/' + ed : ''} ${empty ? '빈 스튜디오' : '샘플'} ${width}`;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await page.addInitScript(e => { try { localStorage.setItem('didisam.emptyStart', e ? '1' : '0'); } catch (x) { } }, empty);
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.evaluate(([type, ed]) => { createOrg(type, '점검 기관', ed || undefined); }, [type, ed]);
    await page.waitForTimeout(1000);
    const roles = width === 1440 && !empty ? ['owner', 'teacher'] : ['owner'];
    for (const role of roles) {
      const want = role === 'teacher' ? (TEACH[key] || 't_gen') : key;
      const r = await page.evaluate(async role => {
        S.me.role = role; UI.dxEdit = false; go('dash'); await new Promise(o => setTimeout(o, 250)); go('dash');
        const sec = document.querySelector('#main .dx'); if (!sec) return { none: true };
        const L = DASHX.layout(); const exp = L.order.filter(id => !L.hide.has(id));
        const got = [...sec.querySelectorAll('.dx-card')].map(c => c.dataset.w);
        const nums = [...sec.querySelectorAll('.dx-card .dx-n b')].map(b => b.textContent.trim());
        const bad = [...sec.querySelectorAll('.dx-card')].filter(c => c.querySelectorAll('button').length !== 1 || !c.querySelector('.dx-n b').textContent.trim()).map(c => c.dataset.w);
        const over = document.documentElement.scrollWidth - innerWidth;
        const cardOver = [...sec.querySelectorAll('.dx-card')].filter(c => c.scrollWidth > c.clientWidth + 1).map(c => c.dataset.w);
        return { lay: sec.dataset.lay, k: L.k, def: DASHX.LAY[L.k][0], exp, got, nums, bad, over, cardOver };
      }, role);
      if (r.none) { ok(false, `${label} ${role}: 현황 위젯 없음`); continue; }
      ok(r.lay === want && r.k === want, `${label} ${role}: 구성 ${r.lay} (기대 ${want})`);
      ok(JSON.stringify(r.got) === JSON.stringify(r.exp), `${label} ${role}: 보이는 위젯 ${r.got.join(',')} ≠ ${r.exp.join(',')}`);
      ok(r.got.length >= Math.min(3, r.def.length) && r.got.every(id => r.def.includes(id) || DASHX.LAY), `${label} ${role}: 기본 위젯 수 ${r.got.length}`);
      ok(!r.bad.length, `${label} ${role}: 숫자 · 버튼 형식 ${r.bad.join(',')}`);
      ok(r.over <= 0, `${label} ${role}: 가로 넘침 ${r.over}px`);
      ok(!r.cardOver.length, `${label} ${role}: 카드 넘침 ${r.cardOver.join(',')}`);
      if (!empty && role === 'owner') ok(r.nums.some(n => !/^(0|—|0\/0)$/.test(n)), `${label}: 샘플인데 모든 숫자가 0 (${r.nums.join(' | ')})`);
      /* 모든 버튼: 실제 클릭 → 화면 이동 · 오류 화면 없음 */
      const n = r.got.length;
      for (let i = 0; i < n; i++) {
        const before = errs.length;
        const id = await page.evaluate(async ({ i, role }) => { S.me.role = role; go('dash'); await new Promise(o => setTimeout(o, 50)); const b = document.querySelectorAll('#main .dx-card button')[i]; return b ? b.dataset.v : null; }, { i, role });
        if (!id) { ok(false, `${label} ${role}: ${i}번째 버튼 없음`); continue; }
        await page.locator('#main .dx-card button').nth(i).click();
        await page.waitForTimeout(150);
        const res = await page.evaluate(id => ({ cur: CUR, warn: !!(document.querySelector('#main .warn') && /화면을 표시하는 중 문제/.test(document.querySelector('#main').innerText)), toast: [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).filter(x => /권한|꺼져|정운영자만/.test(x)) }), id);
        const moved = res.cur.tab === id || res.cur.ws === id || (res.cur.ws !== 'dash' && res.cur.ws !== 'home');
        ok(moved && !res.warn && !res.toast.length && errs.length === before, `${label} ${role}: 버튼 ${id} → ${JSON.stringify(res.cur)} ${res.warn ? '오류 화면' : ''} ${res.toast.join('/')} ${errs.slice(before).join('|')}`);
      }
    }
    /* 사용자 편집(샘플 · 1440 · 운영자, 한 유형씩) */
    if (!empty && width === 1440) {
      const e = await page.evaluate(async () => {
        S.me.role = 'owner'; go('dash'); ACT['dx-edit'](); await new Promise(o => setTimeout(o, 30));
        const L0 = DASHX.layout(); const first = L0.order[0], second = L0.order[1];
        const rows = document.querySelectorAll('.dx-li').length;
        /* 숨기기 */
        const ck = document.querySelector(`.dx-li[data-w="${first}"] input[type=checkbox]`); ck.click(); await new Promise(o => setTimeout(o, 30));
        const hid = DASHX.layout().hide.has(first);
        /* 버튼으로 아래로 */
        document.querySelector(`.dx-li[data-w="${second}"] [data-act=dx-mv][data-d="1"]`).click(); await new Promise(o => setTimeout(o, 30));
        const o1 = DASHX.layout().order; const moved = o1.indexOf(second) === 2;
        /* 키보드 Alt+↑ */
        const li = document.querySelector(`.dx-li[data-w="${second}"]`); li.focus(); li.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true })); await new Promise(o => setTimeout(o, 30));
        const kb = DASHX.layout().order.indexOf(second) === 1 && document.activeElement && document.activeElement.dataset.w === second;
        /* 저장 위치 */
        const saved = !!(S.dashx && Object.values(S.dashx.u || {}).some(u => u[L0.k]));
        ACT['dx-edit'](); await new Promise(o => setTimeout(o, 30));
        const shown = [...document.querySelectorAll('.dx-card')].map(c => c.dataset.w);
        return { rows, hid, moved, kb, saved, hiddenGone: !shown.includes(first), k: L0.k };
      });
      ok(e.rows > 0 && e.hid && e.hiddenGone, `${label}: 숨기기 ${JSON.stringify(e)}`);
      ok(e.moved, `${label}: 순서 버튼`); ok(e.kb, `${label}: 키보드 Alt+↑ 순서 · 초점 유지`); ok(e.saved, `${label}: S.dashx 저장`);
      /* 끌어 놓기(실제 마우스) */
      await page.evaluate(() => { ACT['dx-edit'](); });
      const ord0 = await page.evaluate(() => DASHX.layout().order);
      await page.dragAndDrop(`.dx-li[data-w="${ord0[3]}"] .dx-grip`, `.dx-li[data-w="${ord0[0]}"]`, { targetPosition: { x: 20, y: 4 } });
      await page.waitForTimeout(100);
      const ord1 = await page.evaluate(() => DASHX.layout().order);
      ok(ord1[0] === ord0[3], `${label}: 끌어 놓기 ${ord0.slice(0, 4).join(',')} → ${ord1.slice(0, 4).join(',')}`);
      /* 되돌리기 */
      const rs = await page.evaluate(async () => { ACT['dx-reset'](); await new Promise(o => setTimeout(o, 30)); const L = DASHX.layout(); ACT['dx-edit'](); return { custom: L.custom, eq: JSON.stringify(L.order.filter(id => !L.hide.has(id))) === JSON.stringify(DASHX.LAY[L.k][0].filter(id => L.pool.includes(id))) }; });
      ok(!rs.custom && rs.eq, `${label}: 기본 구성으로 되돌리기 ${JSON.stringify(rs)}`);
      /* 다시 불러와도 유지되는가(저장 후 새로고침) */
      const pers = await page.evaluate(async () => { const L = DASHX.layout(); const h = L.order[0]; ACT['dx-vis']({ checked: false, dataset: { v: h } }); save(); return h; });
      await page.reload(); await page.waitForTimeout(900);
      const kept = await page.evaluate(h => { go('dash'); return DASHX.layout().hide.has(h) && !document.querySelector(`.dx-card[data-w="${h}"]`); }, pers);
      ok(kept, `${label}: 새로고침 뒤 내 구성 유지`);
    }
    ok(!errs.length, `${label}: pageerror ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(`dashx: ${checks - fails.length}/${checks} 통과`);
  console.log(fails.length ? `${fails.length} FAIL` : 'ALL OK');
  process.exit(fails.length ? 1 : 0);
})();
