'use strict';
/* v47 LX-SPEC 웹(학습자 · 클래식 웹) 동선 점검 — D7 홈 · D8 내 학습 · D10 기록 더 보기 · D14/D15 항목 화면 · D16 #ai/#attend · D17 머리 메뉴
   4 기관 유형(univ · corp · voc · adult) × 1440 · 390 웹(앱 화면 아님), aipol 켜짐 · 꺼짐 1조합(univ 1440).
   사용: node tests/ui/lx47-web.js  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json' };
const RAW = fs.readFileSync(ROOT + '/learner-demo.json', 'utf8');
const TYPES = (process.env.TYPES || 'univ,corp,voc,adult').split(',');

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const go = async (p, h, ms = 600) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  /* 같은 목적지(#…) 링크 중 화면에 보이는 것의 최대 개수(머리 메뉴 포함, 닫힌 「더 보기」 · 드롭다운 안은 보이지 않으므로 제외) */
  const dupMax = p => p.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); if (e.closest('details:not([open]) > :not(summary)')) return false; /* 닫힌 「더 보기」 안(Chrome은 크기를 돌려줌) */ return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const C = {}; document.querySelectorAll('a[href^="#"]:not(.brand)').forEach(a => { if (!vis(a)) return; /* 로고(brand → #home)는 관례상 제외 */ const h = a.getAttribute('href').replace(/\?.*$/, ''); if (h.length > 1) C[h] = (C[h] || 0) + 1; });
    return Object.entries(C).sort((a, b) => b[1] - a[1])[0] || ['', 0]; });
  for (const ty of TYPES) for (const w of [1440, 390]) for (const pol of (ty === 'univ' && w === 1440 ? [1, 0] : [1])) {
    const K = `${ty}@${w}${pol ? '' : ' 꺼짐'}`; const vh = w === 390 ? 844 : 900;
    const ctx = await browser.newContext({ viewport: { width: w, height: vh } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/learner-demo\.json/, x => { const j = JSON.parse(RAW); j.org.type = ty; if (pol) j.aipol = { on: true, lvl: 'L1', retain: 'term', evalNotice: true }; x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j) }); });
    await p.addInitScript(() => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20260001', dept: '', id: '20260001' })); localStorage.setItem('didisam.app.instx', '1'); localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await p.goto(`${base}/learner.html?demo=1#home`, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    await p.evaluate(() => { try { LR.lp.vision = { skip: true, step: 0 }; lrender(); } catch (e) { } }); await p.waitForTimeout(500);
    const sk = await p.$('.v2-vis [data-vis="skip"], .v2-vis [data-vis="close"]'); if (sk) { await sk.click().catch(() => { }); await p.waitForTimeout(300); }

    /* D17 머리 메뉴 4개(홈 · 내 ○○ · 찾기 · 나), 기존 메뉴는 「찾기」 아래 */
    const M = await p.evaluate(() => { const n = document.querySelector('header.lh nav.ln'); if (!n) return null; return { kids: [...n.children].map(e => (e.matches('a') ? e : e.querySelector('button, a')).textContent.replace('▾', '').trim()), sub: [...n.querySelectorAll('.l47-find .lux-dd a')].map(a => a.getAttribute('href')) }; });
    ok(M && M.kids.length === 4 && M.kids[0] === '홈' && M.kids[3] === '나', `${K} 머리 메뉴 4개 「${M && M.kids.join(' · ')}」`);
    ok(M && M.sub.length >= 2 && !M.sub.includes('#home'), `${K} 「찾기」 아래 메뉴 ${M && M.sub.length}개(삭제 없음)`);

    /* D7 웹 홈 */
    const H = await p.evaluate(() => { const hm = document.querySelector('#lm .lhb-home'); if (!hm) return null; const more = hm.querySelector('details.lhb-more');
      const ord = [...hm.querySelectorAll(':scope > .lhb-hero, :scope > .lhb-in > *')].map(e => e.className.split(' ')[0]);
      return { ord, more: !!more, open: more && more.open, inMore: more ? [...more.querySelectorAll('.lhb-mb > *')].map(e => e.className.split(' ')[0]) : [], heroSts: !!hm.querySelector('.lhb-hero .sts'), heroTut: !!hm.querySelector('.lhb-hero .tut'), docH: document.documentElement.scrollHeight }; });
    ok(H && H.ord[0] === 'lhb-hero' && H.ord[H.ord.length - 1] === 'lhb-more', `${K} 홈 순서 ${H && H.ord.join(' > ')}`);
    ok(H && H.more && !H.open && !H.heroSts && !H.heroTut, `${K} 홈 「더 보기」 접힘 · 히어로 지표 칩 · 튜터 버튼은 더 보기 안`);
    if (pol) ok(H && !H.ord.includes('v2-vcard') && !H.ord.includes('lna-hubw'), `${K} 비전 · 노트 카드는 홈 본문이 아닌 더 보기 안(${H && H.inMore.join(',')})`);
    const dH = await dupMax(p); ok(dH[1] <= 2, `${K} 홈 같은 목적지 링크 최대 ${dH[1]}개(${dH[0]}) ≤ 2`);
    if (w === 1440) ok(H && H.docH <= vh * 2.3, `${K} 홈 길이 ${(H.docH / vh).toFixed(1)}화면 ≤ 2.3(오늘 익힐 것 축소 D4는 앱 담당 — 반영 후 1.8 목표)`);

    /* D8 · D10 내 학습 */
    await go(p, '#my', 800);
    const Y = await p.evaluate(() => { const lm = document.getElementById('lm'); return { hub: !!lm.querySelector('.lhb'), line: lm.querySelectorAll('.lhb-my1').length, tabs: [...lm.querySelectorAll('.lux-tabs [data-lux-tab]')].map(b => b.textContent.trim()), tab: lm.dataset.luxtab, docH: document.documentElement.scrollHeight,
      pri: [...lm.querySelectorAll('.lbtn.pri')].filter(e => e.getBoundingClientRect().height > 0).length, myLinks: [...lm.querySelectorAll('a[href="#my"]')].filter(e => e.getBoundingClientRect().height > 0).length }; });
    ok(Y && !Y.hub && Y.line <= 1, `${K} 내 학습 맨 위 홈 허브 재사용 없음(한 줄 요약 ${Y.line})`);
    ok(Y && Y.tabs.slice(0, 3).join('·') === '목록·일정·기록', `${K} 내 학습 세그먼트 ${Y && Y.tabs.join(' · ')}`);
    ok(Y && Y.docH <= vh * (w === 390 ? 4 : 2.5), `${K} 내 학습 길이 ${(Y.docH / vh).toFixed(1)}화면 ≤ ${w === 390 ? 4 : 2.5}`);
    ok(Y && Y.pri <= 1, `${K} 내 학습 주 버튼 ${Y.pri}개 ≤ 1`);
    const dY = await dupMax(p); ok(dY[1] <= 2, `${K} 내 학습 같은 목적지 링크 최대 ${dY[1]}개(${dY[0]}) ≤ 2`);
    await p.click('.lux-tabs [data-lux-tab="rec"]'); await p.waitForTimeout(200);
    const R = await p.evaluate(() => { const lm = document.getElementById('lm'); const d = lm.querySelector('.l47-rc details.l47-more'); return { tab: lm.dataset.luxtab, more: !!d, open: d && d.open, inside: d ? [...d.querySelectorAll('.mh[id], .lux-acct, .lcsec')].map(e => e.id || e.className.split(' ')[0]) : [] }; });
    ok(R.tab === 'rec' && R.more && !R.open && R.inside.includes('m-next'), `${K} 기록 › 「더 보기」 접힘, 지금 할 일 등 기존 카드 보존(${R.inside.join(',')})`);
    await p.click('.lux-tabs [data-lux-tab="learn"]'); await p.waitForTimeout(150);

    /* D16 #ai · #attend 랜딩 낙하 0 */
    await go(p, '#ai', 800); const ai = await p.evaluate(() => ({ h: location.hash, hub: !!document.querySelector('#lm .lhb-home') }));
    ok(ai.h === '#home' && ai.hub, `${K} #ai → ${ai.h}(학습 홈, 랜딩 아님)`);
    await go(p, '#attend', 900); const at = await p.evaluate(() => ({ h: location.hash, tab: (document.getElementById('lm') || {}).dataset.luxtab }));
    ok(at.h === '#my/plan' && at.tab === 'plan', `${K} #attend → ${at.h} 일정 세그먼트(${at.tab})`);
    await p.evaluate(() => { try { if (typeof LT === 'object' && LT.open) { const x = document.querySelector('[data-tact="close"]'); if (x) x.click(); } } catch (e) { } });

    /* D14 · D15 항목 화면(퀴즈) */
    const qh = await p.evaluate(() => { for (const c of SITE().classes) { const q = (c.items || []).find(i => i.type === 'quiz'); if (q) return `#c/${c.id}/${q.id}`; } return ''; });
    if (qh) { await go(p, qh, 900);
      const I = await p.evaluate(() => { const cw = document.querySelector('section.crsb .cw2'); const sd = cw && cw.querySelector('details.l47-sd'); const hp = document.getElementById('l47Help');
        return { sd: !!sd, sdOpen: sd && sd.open, panelIn: !!(sd && sd.querySelector('#lcPanel')), inMain: cw ? cw.querySelectorAll('.imain .v2-aib, .imain .a2lqa, .imain .lcaskb, .l26side .pl43ai').length : -1,
          fab: !!document.getElementById('l47Fab'), sheet: hp ? [...hp.querySelectorAll('.l47-hps:not([hidden])')].map(x => x.dataset.k) : [], info: !!cw.querySelector('details.l47-infd'), ail: !!cw.querySelector('.l47-ail') }; });
      ok(I.sd && !I.sdOpen && I.panelIn, `${K} 항목 옆 탭(학습노트 · 공지 · 커뮤니티 · 후기) 접힌 「더 보기」`);
      ok(I.inMain === 0 && I.fab, `${K} 항목 안 AI 코치 · 질문 · 강사 질문 블록 0개, 떠 있는 버튼 1개`);
      ok(I.sheet.includes('qa') && I.sheet.includes('ask') && (!pol || I.sheet.includes('coach')), `${K} 도움 시트 ${I.sheet.join(' · ')}`);
      ok(I.info && (!pol || I.ail), `${K} 응시 기간 표 → 한 줄${pol ? ' · AI 안내 한 줄(평가 참고 안내 유지)' : ''}`);
      await p.click('#l47Fab'); await p.waitForTimeout(200); const op = await p.evaluate(() => !document.getElementById('l47Help').hidden);
      await p.keyboard.press('Escape'); await p.waitForTimeout(100); const cl = await p.evaluate(() => document.getElementById('l47Help').hidden);
      ok(op && cl, `${K} 떠 있는 버튼으로 시트 열고 Esc로 닫기`);
      await p.click('details.l47-sd > summary'); await p.waitForTimeout(100); ok(await p.evaluate(() => localStorage.getItem('didisam.l47.side') === '1'), `${K} 옆 탭 펼침 상태 기억`);
      await p.evaluate(() => localStorage.removeItem('didisam.l47.side'));
      await go(p, '#home', 500); ok(!(await p.$('#l47Fab, #l47Help')), `${K} 항목 화면을 떠나면 떠 있는 버튼 · 시트 제거`); }
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(ov <= 1, `${K} 가로 넘침 ${ov}px`);
    ok(!errs.length, `${K} 스크립트 오류 ${errs.length}건${errs.length ? ' — ' + errs[0] : ''}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
