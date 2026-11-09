'use strict';
/* v36 썸네일(thumb.js) 점검: 분야 판별 · 생성 크기 · 고르기 화면(추천 3 · 템플릿 12+ · 실시간 과정명 · 다시 만들기 · 내 이미지) · 과정 상세 설정 연결 · 학습자 게시본.
   사용: node tests/ui/thumb.js [shots폴더] */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  for (const [vw, vh, tag] of [[1280, 860, 'pc'], [390, 844, 'm']]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => { errs.push(e.message); console.log('ERR', e.stack.split('\n').slice(0,4).join(' / ')); }); await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    if (tag === 'pc') {
      const r = await page.evaluate(async () => {
        const N = ['생성형 AI 업무 활용', '파이썬 데이터 분석 기초', '비즈니스 영어 회화', '중학 수학 함수 완성', '산업안전보건 정기교육', '직장 내 성희롱 예방교육', '개인정보보호 교육', '요양보호사 실무', '수채화 드로잉 입문', '피아노 기초', '제과제빵 기능사 실기', '요가 · 필라테스', '면접 완벽 대비', '전기기능사 필기', '시니어 스마트폰 활용', '유튜브 영상 편집', '예비 창업 사업계획서', '엑셀 업무 자동화', '마케팅 퍼포먼스 실무', '리더십과 조직 관리', '회계 원리', '드론 조종 자격'];
        const det = N.map(n => [n, THUMB.detect(n).k]);
        const out = []; for (const n of N.slice(0, 6)) { const g = await THUMB.gen({ name: n, target: '재직자' }); out.push([n, g.tpl, g.w, g.url.length, g.url.slice(0, 15)]); }
        return { det, out, list: THUMB.list().length, fams: [...new Set(THUMB.list().map(t => t.fam))].length, fields: THUMB.fields().length };
      });
      r.det.forEach(([n, k]) => console.log('   ', n, '→', k)); r.out.forEach(x => console.log('   gen', x.join(' · ')));
      ok(r.det.filter(([, k]) => k !== 'gen').length === r.det.length, '분야 판별 22개 모두 일반 아님');
      ok(r.fields >= 20 && r.list >= 12 && r.fams >= 5, `분야 ${r.fields} · 템플릿 ${r.list} · 계열 ${r.fams}`);
      ok(r.out.every(x => x[3] <= 70000 && x[2] <= 1280 && /webp|jpeg/.test(x[4])), '생성 이미지 70K 문자 이하 · 1280 이하 · webp/jpeg');
      const g2 = await page.evaluate(async () => { const a = await THUMB.gen({ name: '비즈니스 영어 회화' }, { seed: 1 }); const b = await THUMB.gen({ name: '비즈니스 영어 회화' }, { seed: 99 }); return a.url !== b.url; });
      ok(g2, '다른 seed → 다른 시안');
    }
    await page.evaluate(async () => { createOrg('corp', '산타 아카데미'); render(); let c = S.classes[0]; if (!c) { c = CF.create({ name: '생성형 AI 업무 활용 실무' }); await new Promise(ok => setTimeout(ok, 2500)); } c.name = '생성형 AI 업무 활용 실무'; c.thumb = ''; UI.cls = c.id; UI.clsT = 'set'; go('class'); render(); });
    await page.waitForTimeout(200);
    const slot = await page.$('.th-slot [data-act="thumb-pick"]'); ok(!!slot, `[${tag}] 과정 상세 설정에 썸네일 고르기 버튼`);
    if (!slot) { await ctx.close(); continue; }
    await slot.scrollIntoViewIfNeeded(); await slot.click(); await page.waitForSelector('#thumbPick .thp-c canvas'); await page.waitForTimeout(1500);
    const st = await page.evaluate(() => ({ rec: document.querySelectorAll('#thpRec .thp-c').length, grid: document.querySelectorAll('#thpGrid .thp-c').length, ow: document.documentElement.scrollWidth - innerWidth, fn: document.querySelector('#thpField').value }));
    ok(st.rec === 3 && st.grid >= 12, `[${tag}] 추천 ${st.rec} · 템플릿 ${st.grid}`); ok(st.ow <= 0, `[${tag}] 가로 넘침 없음`); ok(st.fn === 'ai', `[${tag}] 분야 자동 = ai (${st.fn})`);
    if (SHOT) await page.screenshot({ path: path.join(SHOT, `thumb-pick-${tag}.png`) });
    const px = () => page.evaluate(() => document.querySelector('#thpPv').toDataURL().length);
    const p0 = await px(); await page.fill('#thpName', '프롬프트 엔지니어링 심화'); await page.waitForTimeout(900); const p1 = await px(); ok(p0 !== p1, `[${tag}] 과정명 입력 → 미리보기 실시간 반영`);
    const k0 = await page.evaluate(() => document.querySelector('#thpRec .thp-c').dataset.k); await page.click('[data-th="regen"]'); await page.waitForTimeout(600); const k1 = await page.evaluate(() => document.querySelector('#thpRec .thp-c').dataset.k); ok(k0 !== k1, `[${tag}] 다시 만들기 → 다른 시안`);
    await page.click('.thp-chips [data-v="type"]'); const nT = await page.evaluate(() => document.querySelectorAll('#thpGrid .thp-c').length); ok(nT === 3, `[${tag}] 타이포 필터 ${nT}`); await page.click('.thp-chips [data-v="all"]');
    /* 내 이미지 올리기 */
    const img = path.join(ROOT, 'img/stock/lap-01-800.webp'); await page.setInputFiles('#thpFile', img); await page.waitForSelector('#thpMine:not([hidden]) .thp-c'); await page.waitForTimeout(500);
    const mine = await page.evaluate(() => document.querySelectorAll('#thpMine .thp-c').length); ok(mine === 2, `[${tag}] 내 이미지 2가지(그대로 · 글자 얹기)`);
    await page.click('#thpMine .thp-c:nth-child(2)'); await page.waitForTimeout(300);
    await page.click('#thpGrid .thp-c:nth-child(5)'); await page.waitForTimeout(500);
    if (SHOT && tag === 'm') { await page.evaluate(() => document.querySelector('.thp-b').scrollTop = 700); await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOT, `thumb-pick-m2.png`) }); }
    await page.click('[data-th="ok"]'); await page.waitForSelector('#thumbPick', { state: 'detached' }); await page.waitForTimeout(300);
    const res = await page.evaluate(() => { const c = C(UI.cls); return { len: (c.thumb || '').length, pre: (c.thumb || '').slice(0, 16), slotImg: !!document.querySelector('.th-slot img'), tpl: c.thumbSpec && c.thumbSpec.t }; });
    ok(res.len > 1000 && res.len <= 70000 && res.slotImg, `[${tag}] 고른 썸네일 저장 ${res.pre} ${res.len}자 · ${res.tpl}`);
    if (SHOT) await page.screenshot({ path: path.join(SHOT, `thumb-set-${tag}.png`) });
    if (tag === 'pc') {
      /* 교육과정 보기 카드 · 흐름 생성 시 자동 썸네일 */
      await page.evaluate(() => { UI.cls = null; go('class'); render(); }); await page.waitForTimeout(300); if (SHOT) await page.screenshot({ path: path.join(SHOT, 'thumb-list-pc.png') });
      const auto = await page.evaluate(async () => { if (!window.CF || !CF.create) return 'nocf'; const c = CF.create({ name: '산업안전보건 정기교육', target: '현장 근로자' }); await new Promise(ok => setTimeout(ok, 2500)); return (c.thumb || '').length; }).catch(e => 'err ' + e.message);
      ok(typeof auto === 'number' && auto > 1000, `흐름으로 만든 과정 자동 썸네일 (${auto})`);
    }
    ok(!errs.length, `[${tag}] 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
    await ctx.close();
  }
  await browser.close(); srv.close(); console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASSED'); process.exit(fails.length ? 1 : 0);
})();
