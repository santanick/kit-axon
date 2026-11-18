'use strict';
/* v44 G — 홈페이지 템플릿 갤러리 · 마법사를 기관 유형별로(대표님 11-18 「종류도 지금 카테고리 말고 기관 유형별로」)
   ① 칩 = 대학 · 학원(초중고) · 성인 · 1인 강사 · 기업 교육 · 공공 교육원 · 평생교육 · 직업훈련 · 전체, 기본 선택은 우리 기관 유형
   ② g44: 1 템플릿만 노출(예전 템플릿 숨김) — 그 유형의 g44가 없으면 예전 목록으로 대체
   ③ 예전 템플릿을 쓰는 사이트는 그대로 동작하고 「사용 중」 카드로 보인다
   ④ 새 기관 기본 사이트 · 학사 LMS 세부 맞춤 · HPT.pick/rec · 마법사 1단계(g44 테마만) · 시안의 tpl
   g44 템플릿은 다른 요원이 만드는 중이므로 window.실제 hp44 70종 기준으로 확인하고, g44가 없는 상태는 g44를 숨겨 재현한다(G44_DEMO=1은 g44가 하나도 없을 때만 가짜 3종씩 넣는다).
   사용: node tests/ui/gal44.js [캡처 폴더]  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const fails = []; const ok = (name, cond, info) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' ' + JSON.stringify(info || '')}`); if (!cond) fails.push(name); };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cross-origin-resource-policy': 'same-origin', 'x-content-type-options': 'nosniff' }); fs.createReadStream(f).pipe(r); }); /* v44.1: 운영 서버(service/server/app.js)와 같은 보안 헤더 — 불투명 출처 썸네일이면 사진이 막힌다 */
  let port = 9861; await new Promise((res, rej) => { const tryL = () => { srv.once('error', e => { if (e.code === 'EADDRINUSE' && port < 9880) { port++; tryL(); } else rej(e); }); srv.listen(port, '127.0.0.1', res); }; tryL(); });
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const open = async (type, ed, demo, w = 1360, no44 = false) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    if (demo) await ctx.addInitScript(() => { window.G44_DEMO = 1; });
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.evaluate(([type, ed, no44]) => { if (no44) TPL.forEach(t => { if (t.g44) t.hidden = 1; }); /* g44가 아직 없는 상태 재현 */ localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); createOrg(type, '센텀 배움 아카데미', ed); }, [type, ed, no44]);
    await page.waitForFunction(() => window.S && S.org); await page.waitForTimeout(400);
    await page.evaluate(() => { try { closeModal(); } catch (e) { } if (typeof fabClose === 'function') try { fabClose(); } catch (e) { } });
    return { ctx, page, errs };
  };
  const gal = async page => { await page.evaluate(() => ACT['tpl-gallery']()); await page.waitForSelector('.tpd-c', { timeout: 15000 }); await page.waitForTimeout(300); };
  const state = page => page.evaluate(() => { const root = document.querySelector('#hpsGal') || document;
    return { chips: [...root.querySelectorAll('[data-k="tpdT"]')].map(b => [b.dataset.v, b.textContent.trim(), b.classList.contains('on')]),
      cards: [...root.querySelectorAll('.tpd-c:not([hidden]):not(.tpd-alt)')].map(c => ({ v: c.dataset.v, sub: (c.querySelector('.tpd-sub') || {}).textContent || '', now: !!c.querySelector('.tpd-now') })),
      cnt: (root.querySelector('.tpd-cnt') || {}).textContent || '', sel: !!root.querySelector('#tpdSub'), alt: [...root.querySelectorAll('.tpd-c.tpd-alt')].map(c => c.dataset.v), lk: !!root.querySelector('[data-act="tpd-alt"]'),
      fd: [...root.querySelectorAll('[data-act="tpd-f"][role="tab"]')].map(b => [b.dataset.v, b.querySelector('span').textContent, +b.querySelector('em').textContent, b.classList.contains('on')]) }; });
  const chip = async (page, v) => { const root = await page.$('#hpsGal') ? '#hpsGal ' : ''; await page.click(`${root}[data-k="tpdT"][data-v="${v}"]`); await page.waitForTimeout(350); };
  try {
    /* A. g44가 없을 때(지금 저장소 상태): 유형 칩 · 기본 선택 · 예전 목록 대체 */
    { const { ctx, page, errs } = await open('k12', undefined, false, 1360, true); await gal(page); const s = await state(page);
      ok('A 칩 8개(기관 유형 7 + 전체, 1인 강사 칩 없음 · 학원(성인)으로 통합)', s.chips.length === 8 && s.chips.map(x => x[1]).join('|') === '대학|학원(초중고)|학원(성인)|기업 교육|공공 교육원|평생교육|직업훈련|전체', s.chips);
      ok('A 기본 선택 = 우리 기관 유형(학원 초중고)', (s.chips.find(x => x[2]) || [])[0] === 'k12', s.chips);
      ok('A g44 없음 → 예전 목록 대체 표시', s.cards.length >= 3 && s.cards.every(c => !/^t44-/.test(c.v)), s.cards.length);
      ok('A 새 기관 기본 사이트(예전 동작)', await page.evaluate(() => !!S.site.tpl && !/^t44-/.test(S.site.tpl) && siteHTML(S.site, false, 'ko').length > 1000));
      ok('A 스크립트 오류 0', !errs.length, errs); await ctx.close(); }

    /* B. G44_DEMO: 성인 기관 */
    { const { ctx, page, errs } = await open('adult', undefined, true);
      const def = await page.evaluate(() => ({ tpl: S.site.tpl, html: siteHTML(S.site, false, 'ko').length, n44: TPL.filter(t => t.g44).length, rec: HPT.rec('adult'), th: (TPL.find(t => t.id === tplFor('adult')[0].id) || {}).theme }));
      const D = await page.evaluate(() => { const L = k => G44.list(k).map(t => ({ id: t.id, sub: t.sub || '' })); return { adult: L('adult'), corp: L('corp'), all: G44.list('').length, solo: G44.list('adult').filter(G44.isSolo).map(t => t.id), voc: L('voc') }; });
      ok('B 새 기관 기본 사이트 = 그 유형 g44', D.adult.some(t => t.id === def.tpl) && def.html > 1000, def);
      ok('B HPT.rec = g44 템플릿 테마', def.rec === def.th, def);
      await gal(page); let s = await state(page);
      ok('B 기본 선택 = 성인', (s.chips.find(x => x[2]) || [])[0] === 'adult', s.chips);
      ok('B g44만 노출(예전 숨김) · 세부 유형 표시', s.cards.length === D.adult.length && s.cards.every(c => D.adult.some(t => t.id === c.v) && c.sub), s.cards);
      ok('B 사용 중 표시(기본 사이트 템플릿)', s.cards.some(c => c.now && c.v === def.tpl), s.cards);
      if (SHOT) await page.screenshot({ path: path.join(SHOT, 'gal44-adult-pc.jpg'), type: 'jpeg', quality: 70 });
      ok('B 1인 강사 · 크리에이터 템플릿은 학원(성인) 안에', D.solo.length >= 1 && D.solo.every(id => s.cards.some(c => c.v === id)), [D.solo, s.cards.length]); /* v44.1: 1인 강사 칩 제거 */
      await chip(page, 'corp'); s = await state(page);
      ok('B 기업 교육 칩 → 기업 g44만', s.cards.length === D.corp.length && s.cards.every(c => D.corp.some(t => t.id === c.v)), s.cards);
      await chip(page, 'all'); s = await state(page);
      ok('B 전체 칩 → g44 전부 · 세부 유형 선택 상자 없음(v44.2 교육 분야 칩으로 대체)', s.cards.length === D.all && s.cards.every(c => /^t44-/.test(c.v)) && !s.sel, [s.cards.length, D.all, s.sel]);
      /* 예전 템플릿을 쓰는 사이트: 그대로 동작 + 「사용 중」 카드 */
      await page.evaluate(() => { UI.tpdT = ''; UI.tpdSub = ''; UI.tpdF = ''; S.site = siteFromTpl(TPL.find(t => t.id === 'adult-cert')); save(); UI.siteGallery = false; try { if (typeof slClose === 'function') slClose(); } catch (e) { } go('site'); render(); });
      await page.waitForTimeout(500);
      ok('B 예전 템플릿 사이트 게시본 동작', await page.evaluate(() => S.site.tpl === 'adult-cert' && siteHTML(S.site, false, 'ko').length > 1000));
      await gal(page); s = await state(page);
      ok('B 예전 템플릿 = 맨 앞 「사용 중」 카드 · 나머지는 g44', s.cards[0] && s.cards[0].v === 'adult-cert' && s.cards[0].now && s.cards.slice(1).every(c => /^t44-/.test(c.v)), s.cards);
      await chip(page, 'corp'); s = await state(page);
      ok('B 다른 유형 칩에는 예전 템플릿 없음', s.cards.every(c => c.v !== 'adult-cert'), s.cards);
      if (SHOT) { await page.setViewportSize({ width: 390, height: 844 }); await chip(page, 'adult'); await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOT, 'gal44-adult-m.jpg'), type: 'jpeg', quality: 70 });
        ok('B 휴대폰 가로 넘침 0', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
      ok('B 스크립트 오류 0', !errs.length, errs); await ctx.close(); }

    /* C. 학사 LMS: 세부 맞춤 · 대학 칩 · pick */
    { const { ctx, page, errs } = await open('univ', 'lms', true); await page.waitForTimeout(200);
      const r = await page.evaluate(() => { const k = G44.pick('k12', '', '유아 아이들 놀이 수업') || {}; return { sub: (TPL.find(t => t.id === S.site.tpl) || {}).sub, kids: k.sub, pickTh: HPT.pick('k12', '', '유아 아이들 놀이 수업'), kidsTh: k.theme }; });
      ok('C 학사 LMS 기관 → 학사 LMS 세부 유형 g44로 시작', /LMS|강의실|학사/.test(r.sub || ''), r);
      ok('C AI 추천(G44.pick · HPT.pick)이 한 줄 설명의 세부 유형을 고름', /유아|초등|키즈/.test(r.kids || '') && r.pickTh === r.kidsTh, r);
      await gal(page); const s = await state(page);
      ok('C 대학 칩 기본 선택 · LMS 먼저', (s.chips.find(x => x[2]) || [])[0] === 'univ' && s.cards[0] && /LMS|강의실|학사/.test(s.cards[0].sub), s);
      ok('C 스크립트 오류 0', !errs.length, errs); await ctx.close(); }

    /* D. 처음 만들기 마법사: 1단계 = 우리 유형 g44 테마, 추천 = g44, 시안의 tpl = g44 */
    { const { ctx, page, errs } = await open('corp', undefined, true);
      await page.evaluate(() => { go('site'); render(); }); await page.waitForTimeout(300);
      await page.evaluate(() => hpwOpen()); await page.waitForSelector('.hpw-th');
      const w = await page.evaluate(() => { const ids = [...document.querySelectorAll('.hpw-th')].map(e => e.dataset.v); const G = G44.list('corp').map(t => t.theme); return { subs: G44.list('corp').map(t => String(t.sub || t.name)), ids, G, rec: HPW.st.rec, on: (document.querySelector('.hpw-th.on') || {}).dataset?.v, names: [...document.querySelectorAll('.hpw-th b')].map(b => b.textContent) }; });
      ok('D 마법사 1단계 = 기업 g44 테마만', w.ids.length >= 1 && w.ids.every(id => w.G.includes(id)), w);
      ok('D 추천 · 선택 = g44 테마(세부 유형 이름)', w.G.includes(w.rec) && w.on === w.rec && w.names.length === w.ids.length && w.names.every(n => w.subs.some(x => n.startsWith(x))), w);
      await page.click('.hpw-th.on'); await page.waitForSelector('[name=hw_brief]'); await page.click('[data-hw="gen"]');
      await page.waitForFunction(() => document.querySelectorAll('.hpw-d').length === 3, null, { timeout: 30000 });
      const d = await page.evaluate(() => HPW.st.drafts.map(x => x.site.tpl));
      const C = await page.evaluate(() => G44.list('corp').map(t => t.id));
      ok('D 시안의 tpl = 기업 g44 템플릿', d.every(v => C.includes(v)), d);
      ok('D 스크립트 오류 0', !errs.length, errs); await ctx.close(); }
    /* E. 휴대폰 390: 선택된 유형 칩(오른쪽 끝 「직업훈련」)이 가로 스크롤 안에 보이고, 페이지 세로 스크롤은 그대로 */
    { const { ctx, page, errs } = await open('voc', undefined, false, 390); await gal(page); await page.waitForTimeout(400);
      const v = await page.evaluate(() => { const w = [...document.querySelectorAll('.tpd-ty')].find(x => x.offsetParent); const b = w && w.querySelector('[data-k="tpdT"].on'); if (!b) return null; const wr = w.getBoundingClientRect(), br = b.getBoundingClientRect();
        return { v: b.dataset.v, in: br.left >= wr.left - 1 && br.right <= wr.right + 1, sx: Math.max(w.scrollLeft, b.parentElement.scrollLeft), over: document.documentElement.scrollWidth > innerWidth + 1 }; });
      ok('E 390 선택 칩(직업훈련)이 보임', v && v.v === 'voc' && v.in && v.sx > 0 && !v.over, v);
      if (SHOT) await page.screenshot({ path: path.join(SHOT, 'gal44-voc-m.jpg'), type: 'jpeg', quality: 70 });
      ok('E 스크립트 오류 0', !errs.length, errs); await ctx.close(); }
    /* F. v44.1 대표님 캡처: 운영 서버와 같은 헤더에서 70종 썸네일 전부 사진이 실제로 나오는지(휴대폰 「템플릿 고르기」 · PC 갤러리 · 큰 미리보기) */
    for (const w of [390, 1440]) { const { ctx, page, errs } = await open('adult', undefined, false, w); const blocked = [];
      const done = new Set(); page.on('requestfinished', q => done.add(q.url()));
      page.on('requestfailed', q => { if (/img\/stock|fonts\//.test(q.url())) blocked.push(q.url()); }); /* 다시 그리며 끊긴 요청은 나중에 받아지면 제외 */
      await gal(page); await chip(page, 'all');
      const ids = await page.evaluate(() => [...document.querySelectorAll('.tpd-c')].map(c => c.dataset.v));
      for (const id of ids) { await page.evaluate(v => { const c = document.querySelector(`.tpd-c[data-v="${v}"]`); c && c.scrollIntoView({ block: 'center' }); }, id); await page.waitForTimeout(90); }
      /* 썸네일은 한 장씩 차례로 그린다(hpgal 큐 · 문서가 interactive이면 먼저 보여 줌) — 다 그려지고(문서 load) 사진이 다 받아질 때까지 기다림 */
      await page.waitForFunction(() => [...document.querySelectorAll('.tpd-c .tpd-th')].every(th => { const f = th.querySelector('iframe'); if (!f) return false; let d = null; try { d = f.contentDocument; } catch (e) { return true; } if (!d || !d.body || d.URL === 'about:blank' || d.readyState !== 'complete') return false; return [...d.querySelectorAll('img')].every(i => i.complete); }), null, { timeout: 120000, polling: 500 }).catch(() => {}); /* v44.1 불안정 정리: 문서를 다 읽기 전(readyState loading · interactive)에는 img가 아직 없거나 일부라 「모두 complete」가 거짓으로 참이 됐다 → 문서 load 끝까지 */
      await page.waitForTimeout(500);
      const R = await page.evaluate(() => [...document.querySelectorAll('.tpd-c')].map(c => { const v = c.dataset.v; const tp = TPL.find(t => t.id === v); let want = 0; try { want = (siteHTML(TPD.fromTpl(tp), false, 'ko').match(/<img[^>]+img\/stock/g) || []).length; } catch (e) { }
        const fr = [...c.querySelectorAll('.tpd-th iframe')]; let ok = 0, bad = 0, opaque = 0;
        fr.forEach(f => { let d = null; try { d = f.contentDocument; } catch (e) { } if (!d) { opaque++; return; } [...d.querySelectorAll('img')].filter(i => /img\/stock/.test(i.currentSrc || i.src)).forEach(i => { if (i.complete && i.naturalWidth > 0) ok++; else if (i.complete) bad++; }); });
        return { v, want, ok, bad, opaque, fr: fr.length }; }));
      const g = R.filter(x => /^t44-/.test(x.v)); const noPic = g.filter(x => x.want && (x.ok === 0 || x.bad > 0));
      ok(`F ${w} 썸네일 ${g.length}종 · 사진 있는 템플릿은 모두 사진이 보임`, g.length >= 70 && !noPic.length && R.every(x => !x.opaque), { n: g.length, noPic: noPic.slice(0, 8), opaque: R.filter(x => x.opaque).length });
      /* 큰 미리보기 */
      const pid = g.find(x => x.want).v; await page.evaluate(v => document.querySelector(`.tpd-c[data-v="${v}"]`).click(), pid); await page.waitForSelector('#slSheet iframe'); await page.waitForTimeout(1500);
      const pv = await page.evaluate(() => { const f = document.querySelector('#slSheet iframe'); let d = null; try { d = f.contentDocument; } catch (e) { } if (!d) return { opaque: 1 }; const I = [...d.querySelectorAll('img')].filter(i => /img\/stock/.test(i.currentSrc || i.src)); return { n: I.length, ok: I.filter(i => i.naturalWidth > 0).length, sb: f.getAttribute('sandbox') }; });
      ok(`F ${w} 큰 미리보기 사진`, pv.n > 0 && pv.ok > 0 && !pv.opaque, pv);
      const bl = [...new Set(blocked)].filter(u => !done.has(u)).map(u => u.split('/').pop()); ok(`F ${w} 사진 · 글꼴 요청 막힘 0`, !bl.length, bl.slice(0, 6));
      if (SHOT) await page.screenshot({ path: path.join(SHOT, `gal44-photo-${w}.jpg`), type: 'jpeg', quality: 70 });
      ok(`F ${w} 스크립트 오류 0`, !errs.length, errs); await ctx.close(); }
    /* G. v44.1 기관 정보 › 기관 유형: 세부 유형 설명(기업 CS · 대리점 · 가맹점, 공공 진흥원 · 민간 협회, 대학 학사 LMS, 학원(성인) 민간 자격증) */
    { const { ctx, page, errs } = await open('corp', undefined, false, 390); await page.evaluate(() => { UI.settings = 'type'; go('settings'); render(); }); await page.waitForTimeout(600);
      const T = await page.evaluate(() => [...document.querySelectorAll('[data-act="type-chg"]')].map(b => [b.dataset.v, b.textContent.replace(/\s+/g, ' ')]));
      const tx = k => (T.find(x => x[0] === k) || [])[1] || '';
      ok('G 기관 유형 설명에 세부 유형', /콜센터/.test(tx('corp')) && /가맹점/.test(tx('corp')) && /경제진흥원/.test(tx('public')) && /정보진흥원/.test(tx('public')) && /협회/.test(tx('public')) && /학사 LMS/.test(tx('univ')) && /민간 자격증/.test(tx('adult')) && /학원\(성인\)/.test(tx('adult')), T);
      ok('G 390 가로 넘침 0', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (SHOT) await page.screenshot({ path: path.join(SHOT, 'settings-type-m.jpg'), type: 'jpeg', quality: 70, fullPage: true });
      ok('G 스크립트 오류 0', !errs.length, errs); await ctx.close(); }
    /* H. v44.2 교육 분야(2차 칩, 벤치마크 A안): 칩 수 · 0개 칩 없음 · 모든 g44에 분야 · 3종 이하 「다른 유형의 같은 분야」 링크 · hover 미리보기 */
    { const { ctx, page, errs } = await open('k12', undefined, false, 1440); await gal(page);
      const map = await page.evaluate(() => { const L = TPL.filter(t => t.g44 && !t.hidden); return { n: L.length, none: L.filter(t => !TPD_fields.of(t).length).map(t => t.id), org: L.filter(t => { const f = TPD_fields.of(t); return f.length === 1 && f[0] === 'org'; }).map(t => t.id), want: (() => { const c = {}; L.filter(t => t.types.includes('k12')).forEach(t => TPD_fields.of(t).forEach(f => { c[f] = (c[f] || 0) + 1; })); return c; })() }; });
      ok('H 모든 g44에 교육 분야', map.n >= 70 && !map.none.length, map);
      const guess = await page.evaluate(() => TPL.filter(t => t.g44 && !t.hidden && !TPD_fields.mapped(t)).map(t => `${t.id}(${t.sub}) → ${TPD_fields.of(t).join(' ')}`)); if (guess.length) console.log('  참고: 표에 없어 sub로 추정한 템플릿', guess); /* 새 템플릿(공공 위탁운영 등)은 추정 — 표에 추가 권장 */
      let s = await state(page); const fz = s.fd.filter(x => x[0]);
      ok('H 분야 칩 = 그 유형에 있는 분야만(개수 표시 · 0개 칩 없음)', fz.length === Object.keys(map.want).length && fz.every(x => x[2] > 0 && x[2] === map.want[x[0]]) && s.fd[0][0] === '' && s.fd[0][2] === s.cards.length && s.fd[0][3], { fd: s.fd, want: map.want });
      ok('H 세부 유형 선택 상자 없음', !s.sel);
      const tf = async v => { const root = await page.$('#hpsGal') ? '#hpsGal ' : ''; await page.click(`${root}[data-act="tpd-f"][role="tab"][data-v="${v}"]`); await page.waitForTimeout(400); return state(page); };
      s = await tf('arts'); ok('H 예체능 분야 → 그 분야만(3종 이하면 링크)', s.cards.length === map.want.arts && s.cards.length > 0 && s.lk === (s.cards.length <= 3), [s.cards.length, map.want.arts, s.lk]);
      s = await tf('lang'); const nLang = await page.evaluate(() => TPL.filter(t => t.g44 && !t.hidden && TPD_fields.of(t).includes('lang')).length);
      ok('H 3종 이하 → 「다른 유형의 같은 분야」 링크 · 추천 카드', s.cards.length <= 3 && s.lk && s.alt.length >= 1 && s.alt.length <= 3 && /다른 유형의 어학/.test(s.cnt), [s.cards.length, s.alt, s.cnt]);
      if (SHOT) await page.screenshot({ path: path.join(SHOT, 'gal44-field-1440.jpg'), type: 'jpeg', quality: 70 });
      await page.click('[data-act="tpd-alt"]'); await page.waitForTimeout(500); s = await state(page);
      ok('H 링크 → 전체 유형 + 같은 분야', (s.chips.find(x => x[2]) || [])[0] === 'all' && s.cards.length === nLang && (s.fd.find(x => x[3]) || [])[0] === 'lang', [s.cards.length, nLang]);
      await page.click('.tpd-lk'); await page.waitForTimeout(400); s = await state(page); ok('H 분야 해제', (s.fd.find(x => x[3]) || [])[0] === '', s.fd.filter(x => x[3]));
      /* hover 자동 스크롤 미리보기 */
      await chip(page, 'k12'); await page.waitForFunction(() => [...document.querySelectorAll('.tpd-c .tpd-th iframe')].some(f => { try { return f.contentDocument && f.contentDocument.body && f.contentDocument.documentElement.scrollHeight > 1500; } catch (e) { return false; } }), null, { timeout: 30000 });
      /* v44.1 불안정 정리: ① 카드를 :nth-of-type 위치로 다시 찾지 않고 고른 카드에 표시(data-qa-hv)를 붙여 같은 요소를 쓴다(다시 그려져도 엉뚱한 카드 · 빈 iframe에서 예외가 나지 않음)
         ② 자동 스크롤(rAF · 900px/초)과 떠날 때 처음으로(behavior:smooth)는 바쁠 때 고정 1.3초 · 1.2초를 넘긴다 → 스크롤 위치 조건 대기(최대 8초) */
      const hv = await page.evaluate(() => { const c = [...document.querySelectorAll('.tpd-c')].find(c => { const f = [...c.querySelectorAll('.tpd-th iframe')].pop(); try { return f && f.contentDocument && f.contentDocument.documentElement.scrollHeight > 1500; } catch (e) { return false; } }); if (c) c.dataset.qaHv = '1'; return !!c; });
      const TH = '.tpd-c[data-qa-hv] .tpd-th'; await page.evaluate(() => { window.__qaY = sel => { const t = document.querySelector(sel); const f = t && [...t.querySelectorAll('iframe')].pop(); try { return f && f.contentWindow ? f.contentWindow.scrollY : -1; } catch (e) { return -1; } }; });
      const fy = () => page.evaluate(sel => window.__qaY(sel), TH);
      if (hv) await page.hover(TH);
      await page.waitForFunction(sel => window.__qaY(sel) > 300, TH, { timeout: 8000 }).catch(() => {}); const y1 = await fy();
      const mt = await page.evaluate(sel => { const t = document.querySelector(sel); const m = t && t.parentElement.querySelector('.tpd-mt'); return m ? m.textContent : ''; }, TH);
      await page.mouse.move(5, 5);
      await page.waitForFunction(sel => { const y = window.__qaY(sel); return y >= 0 && y < 5; }, TH, { timeout: 8000 }).catch(() => {});
      const y2 = await fy();
      ok('H hover → 자동 스크롤 미리보기 · 떠나면 처음으로 · 「섹션 n · 약 m화면」', hv && y1 > 300 && y2 >= 0 && y2 < 5 && /섹션 \d+ · 약 \d+화면/.test(mt), { y1, y2, mt });
      ok('H 스크립트 오류 0', !errs.length, errs); await ctx.close(); }
    { const { ctx, page, errs } = await open('k12', undefined, false, 390); await gal(page); const s = await state(page);
      const v = await page.evaluate(() => { const w = [...document.querySelectorAll('.tpd-fd')].find(x => x.offsetParent); const r = w.getBoundingClientRect(); const B = [...w.querySelectorAll('button')]; return { row: B.every(b => Math.abs(b.getBoundingClientRect().top - B[0].getBoundingClientRect().top) < 2), h: Math.round(r.height), over: document.documentElement.scrollWidth > innerWidth + 1 }; });
      ok('H 390 분야 칩 = 가로 한 줄 · 넘침 0', v.row && v.h <= 60 && !v.over && s.fd.length >= 3, v);
      if (SHOT) await page.screenshot({ path: path.join(SHOT, 'gal44-field-390.jpg'), type: 'jpeg', quality: 70 });
      ok('H 390 스크립트 오류 0', !errs.length, errs); await ctx.close(); }
  } catch (e) { console.error(e); fails.push('예외: ' + e.message); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건: ${fails.join(' / ')}` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
