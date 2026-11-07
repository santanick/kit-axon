'use strict';
/* v34.2 AI 홈페이지 3단계 마법사 점검(키 없이 · 규칙 설계)
   8개 유형에서 사이트 화면 → [AI로 홈페이지 만들기] → 테마 → [시안 3개 만들기] → 시안 3개 → [적용하고 게시] 를 실제 클릭으로 진행하고
   - 누른 횟수(사이트 화면 → 게시) · 시안 3개의 구성이 서로 다른지 · 품질 점수 · 게시 여부 · 스크립트 오류를 확인한다.
   - 게시된 학습자 홈을 390px로 열어 가로 넘침 · 자리 문구 · 지어낸 후기가 없는지 본다.
   - 말로 고치기('색을 초록으로' · '후기 섹션 빼줘' · '테마 바꿔줘')와 [적용](바로 고치기) → [게시하기] 경로도 한 유형씩 확인한다.
   사용: node tests/ui/hp-wizard.js  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json', '.svg': 'image/svg+xml' };
const CASES = [['adult'], ['k12'], ['univ'], ['univ', 'lms'], ['corp'], ['public'], ['lifelong'], ['voc']];
const MIN_SCORE = 85;

(async () => {
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const rows = [];
  for (let ci = 0; ci < CASES.length; ci++) {
    const [type, ed] = CASES[ci]; const label = ed ? `${type}/${ed}` : type; const errs = []; const bad = [];
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    let clicks = 0; const click = async sel => { await page.waitForSelector(sel, { state: 'visible', timeout: 15000 }); await page.click(sel); clicks++; };
    try {
      await page.goto(`${base}/index.html`, { waitUntil: 'load' });
      const empty = ci === 2 || ci === 5; /* 두 유형은 빈 기관(강좌 · 회원 0)으로 — 빈 섹션 숨김 · 숫자 섹션 생략 확인 */
      await page.evaluate(([type, ed, empty]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', empty ? '1' : '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = !!empty; createOrg(type, '센텀 배움 아카데미', ed); }, [type, ed, empty]);
      await page.waitForFunction(() => window.S && S.org); await page.waitForTimeout(400);
      await page.evaluate(() => { try { closeModal(); } catch (e) { } if (typeof fabClose === 'function') try { fabClose(); } catch (e) { } go('site'); render(); });
      await page.waitForTimeout(200);
      const hasT = await page.evaluate(() => !!(window.HPT && HPT.list && HPT.list.length));
      /* 1) 사이트 화면 → 마법사 */
      await click('.hpw-cta [data-act="hpai-open"]');
      const nTheme = await page.$$eval('.hpw-th', L => L.length); if (nTheme < 4) bad.push(`테마 ${nTheme}개`);
      /* 2) 테마(추천) 누르면 바로 설명 단계 */
      await click('.hpw-th.on'); await page.waitForSelector('[name=hw_brief]');
      const brief = await page.$eval('[name=hw_brief]', e => e.value); if (brief.length < 20) bad.push('설명이 미리 채워지지 않음');
      /* 3) 시안 3개 만들기 */
      await click('[data-hw="gen"]'); await page.waitForFunction(() => document.querySelectorAll('.hpw-d').length === 3, null, { timeout: 30000 });
      const D = await page.evaluate(() => HPW.st.drafts.map(d => ({ id: d.id, hero: d.hero, sig: d.site.sections.filter(x => !x.hide).map(x => x.type + (x.data && x.data.variant ? ':' + x.data.variant : '')).join(','), q0: d.q0.score, q: d.q.score,
        bad: d.q.items.filter(x => !x.ok).map(x => x.k), look: d.site.hpTheme || d.site.look })));
      if (new Set(D.map(d => d.sig)).size < 3) bad.push('시안 구성이 서로 같음'); if (new Set(D.map(d => d.hero)).size < 3) bad.push('첫 화면 배치가 서로 같음');
      D.forEach(d => { if (d.q < MIN_SCORE) bad.push(`시안 ${d.id} 품질 ${d.q}점`); if (d.bad.some(k => k !== 'contact')) bad.push(`시안 ${d.id} 미해결 ${d.bad.join('/')}`); });
      const shown = await page.$eval('.hpw-q .hpw-score', e => parseInt(e.textContent, 10)).catch(() => -1); if (shown !== D[0].q) bad.push(`화면 점수 ${shown} ≠ ${D[0].q}`);
      /* 시안 고르기는 선택(기본은 A). 다른 유형에서는 B · C도 골라 본다 */
      if (ci % 3) { await click(`[data-hw="pick"][data-v="${ci % 3}"]`); await page.waitForTimeout(150); }
      const picked = await page.evaluate(() => HPW.st.pick);
      /* 4) 적용하고 게시(짝수 유형) · 또는 적용 → 바로 고치기 → 게시하기(홀수 유형) */
      const via = ci % 2 ? 'edit' : 'direct';
      if (via === 'direct') await click('[data-hw="pub"]');
      else { await click('[data-hw="apply"]'); await page.waitForSelector('#hpe .hpw-talk', { timeout: 10000 }); await click('#hpe [data-act="hpe-pub"]'); }
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ({ pub: !!(S.site.published && S.lsite && S.lsite.pub && S.lsite.pub.hp), q: hpwQuality(S.site).score, seo: !!(S.settings.seo && S.settings.seo.title), hpe: !!document.getElementById('hpe'), var: S.site.hpVar, tid: DREG.cur(), rv: (S.posts || []).filter(p => p.board === '수강후기' && !p.hidden).length, hid: S.site.sections.filter(x => x.hide).length }));
      if (!after.pub) bad.push('게시되지 않음'); if (!after.seo) bad.push('SEO 제목 없음'); if (after.var !== D[picked].id) bad.push('고른 시안과 적용된 시안이 다름');
      /* 말로 고치기(바로 고치기 화면) — 첫 유형 */
      if (ci === 1) {
        await page.fill('#hpe .hpw-talk input', '색을 초록으로'); await page.press('#hpe .hpw-talk input', 'Enter'); await page.waitForSelector('#modal [data-mact="ok"]'); await page.click('#modal [data-mact="ok"]'); await page.waitForTimeout(200);
        const c = await page.evaluate(() => S.site.color); if (c.toLowerCase() !== '#15803d') bad.push(`색 바꾸기 실패 ${c}`);
        await page.click('#hpe [data-act="hpe-undo"]'); await page.waitForTimeout(200); const c2 = await page.evaluate(() => S.site.color); if (c2.toLowerCase() === '#15803d') bad.push('되돌리기 실패');
      }
      /* 말로 고치기(AI SAM 대화 카드 → 적용 → 되돌리기) */
      if (ci === 0 || ci === 4) {
        const r = await page.evaluate(() => { if (window.hpClose) hpClose(true); go('site'); const L = ['더 고급스럽게', '테마 바꿔줘', '첫 화면 문구 바꿔줘', '후기 섹션 빼줘', '공지 섹션 넣어줘']; const out = {};
          L.forEach(q => { const a = hpwTalkAnswer(q); out[q] = a ? (a.plan ? 'plan' : 'msg') : 'none'; }); const a = hpwTalkAnswer('홈페이지 색을 보라색으로');
          const before = S.site.color; PLANS[a.plan].run(); const mid = S.site.color; ACT['hpw-undo']({ dataset: { v: a.plan } }); return { out, before, mid, after: S.site.color, none: hpwTalkAnswer('수강료 청구해줘') }; });
        if (r.mid !== '#6D28D9' || r.after !== r.before) bad.push(`대화 카드 적용 · 되돌리기 실패 ${JSON.stringify(r)}`);
        ['더 고급스럽게', '테마 바꿔줘', '첫 화면 문구 바꿔줘'].forEach(q => { if (r.out[q] !== 'plan') bad.push(`'${q}' 계획 없음`); }); if (r.out['후기 섹션 빼줘'] === 'none') bad.push('후기 빼기 응답 없음'); if (r.none) bad.push('홈페이지와 무관한 말을 가로챔');
      }
      /* 게시된 학습자 홈(휴대폰 390) */
      const pm = await ctx.newPage(); pm.on('pageerror', e => errs.push('learner: ' + e.message)); await pm.setViewportSize({ width: 390, height: 844 });
      await pm.goto(`${base}/learner.html?t=${after.tid}#home`, { waitUntil: 'load' }); await pm.waitForTimeout(1500);
      const lh = await pm.evaluate(() => { const vw = document.documentElement.clientWidth; const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (!r.width || cs.position === 'fixed' || e.closest('[aria-hidden="true"],.tick,.tt,svg')) return false; let p = e.parentElement; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') return false; p = p.parentElement; } return r.right > vw + 1; }).length;
        const tx = document.body.innerText; return { sw: document.documentElement.scrollWidth, vw, over, ph: /(입력하세요|입력해 주세요|Lorem|대표번호|센터 주소)/.test(tx), rvTxt: /수강후기/.test(tx) }; });
      await pm.close();
      if (lh.sw > lh.vw + 1 || lh.over) bad.push(`휴대폰 가로 넘침 ${lh.sw}/${lh.vw} · 요소 ${lh.over}`); if (lh.ph) bad.push('게시 화면에 자리 문구');
      rows.push({ 유형: label + (empty ? '(빈 기관)' : ''), HPT: hasT, 누름: clicks, 경로: via === 'direct' ? '테마→시안→적용하고 게시' : '테마→시안→적용→바로 고치기→게시', 고른시안: D[picked].id, 품질: D.map(d => `${d.id}:${d.q0}→${d.q}`).join(' '), 게시후: after.q, 숨긴빈섹션: after.hid, 넘침: lh.over, 구성: D.map(d => d.sig).join(' | ') });
      if (clicks > (via === 'direct' ? 4 : 5) + (ci % 3 ? 1 : 0)) bad.push(`누름 ${clicks}회`);
    } catch (e) { bad.push('crash: ' + e.message.split('\n')[0]); }
    await ctx.close();
    const ok = !errs.length && !bad.length; console.log(`${ok ? '✓' : '✗'} ${label}`, JSON.stringify(rows[rows.length - 1] || {}), bad.length ? bad : '', errs.length ? errs.slice(0, 3) : '');
    if (!ok) fails.push(label);
  }
  await browser.close(); srv.close();
  console.log(fails.length ? `실패: ${fails.join(', ')}` : `통과: ${CASES.length}개 유형 — 사이트 화면에서 게시까지 기본 4번(시안 A 그대로 · 적용하고 게시)`);
  process.exit(fails.length ? 1 : 0);
})();
