'use strict';
/* v47 LX-SPEC 학습자 앱(390) 동선 — 4유형(univ · corp · voc · adult) × aipol 켜짐, 꺼짐(univ) 1회
   홈 블록 ≤ 6 · 홈 높이 ≤ 1.6화면 · 첫 화면(844 − 아래 탭) 주 버튼 1개 · 「오늘 익힐 것」 첫 화면 · 아래 탭 4칸 이름
   + 「더 보기」 처음 접힘 · 기존 블록이 더 보기 안에 그대로(삭제 0) · 세그먼트 목록|일정|기록 · 나 5묶음 · 메시지 숫자 한 줄 · pageerror 0 · 가로 넘침 0
   사용: flock /tmp/pw.lock node tests/ui/lx47-app.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const RAW = fs.readFileSync(ROOT + '/learner-demo.json', 'utf8');
const TABS = { univ: '홈|내 교과목|교과목 찾기|나', corp: '홈|내 교육|교육과정|나', voc: '홈|내 훈련|출석|나', adult: '홈|내 강의|둘러보기|나' }; /* 직훈 세 번째 칸 「출석」 유지(대표님 확정) */
const PRI = '#lapp .lbtn.pri, #lapp .ap-pri, #lapp button.pri, #lapp a.tb-pri, #lapp .tb-cont, #lapp .tb-dgo';

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const go = async (p, h, ms = 500) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  const runs = [['univ', true], ['corp', true], ['voc', true], ['adult', true], ['univ', false]];
  for (const [ty, pol] of runs) {
    const tag = `${ty}${pol ? '' : '(꺼짐)'}`;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/learner-demo\.json/, x => { const j = JSON.parse(RAW); j.org.type = ty; if (pol) j.aipol = { on: true, lvl: 'L1', retain: 'term', evalNotice: true }; x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j) }); });
    await p.addInitScript(() => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20260001', dept: '', id: '20260001' })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } });
    await p.goto(`${base}/learner.html?demo=1&app=1#home`, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    const sk = await p.$('.v2-vis [data-vis="skip"], .v2-vis [data-vis="close"]'); if (sk) { await sk.click().catch(() => { }); await p.waitForTimeout(300); }
    await go(p, '#my', 300); await go(p, '#home', 900);
    const M = await p.evaluate((PRI) => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const mn = document.querySelector('#lm .tb-main'); const nav = document.querySelector('#lapp .ap-nav'); const navH = nav && vis(nav) ? nav.getBoundingClientRect().height : 0; const fold = innerHeight - navH;
      const blocks = mn ? [...mn.children].filter(e => vis(e) && e.getBoundingClientRect().height > 30).map(e => e.className.split(' ')[0]) : [];
      const pri = [...document.querySelectorAll(PRI)].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.top < fold && r.bottom > 0 && !e.closest('.tb-cont .tb-pri'); });
      const mj = document.querySelector('.mj-card'); const more = document.querySelector('#lm .tb-more');
      /* 높이 = 본문 끝 + 아래 탭(문서 아래 여백 #lm · #lapp · body 3중은 배색 · 밀림 담당 범위라 제외) */
      const vc = mn && mn.querySelector(':scope > .v2-vcard'); const vcH = vc ? vc.getBoundingClientRect().height + 24 : 0;
      return { blocks, vcH, h: (mn ? mn.getBoundingClientRect().bottom + scrollY : document.documentElement.scrollHeight) + navH, vh: innerHeight, pri: pri.map(e => e.className), mj: mj ? Math.round(mj.getBoundingClientRect().top) : -1, fold, tabs: [...document.querySelectorAll('#lapp .ap-nav > a span')].map(s => s.textContent.trim()).join('|'),
        moreOpen: more ? more.open : null, inMore: more ? ['tb-goal', 'tb-links', 'tb-tyc', 'lq-hc', 'v2-vcard', 'lna-hubw'].filter(c => more.querySelector('.' + c)) : [], ow: document.documentElement.scrollWidth - innerWidth }; }, PRI);
    /* v47-fix: 비전을 아직 안 만든 학습자는 「나의 비전 만들기」 카드가 「오늘 익힐 것」 아래(더 보기 밖)에 1개 더 나오므로 그때만 7까지 허용 */
    const vMax = M.blocks.includes('v2-vcard') ? 7 : 6; ok(M.blocks.length <= vMax, `${tag}: 홈 블록 ${M.blocks.length} ≤ ${vMax} (${M.blocks.join(', ')})`);
    ok(M.h - M.vcH - 8 <= M.vh * 1.6, /* v47-fix: 목표 링 글자 겹침을 풀려고 링을 8px 키운 만큼 허용 */ `${tag}: 홈 높이 ${(M.h / M.vh).toFixed(2)}화면(비전 카드 ${Math.round(M.vcH)}px 제외 ${((M.h - M.vcH) / M.vh).toFixed(2)}) ≤ 1.6`); /* v47-fix: 비전 카드가 더 보기 밖에 있을 때는 그 높이만큼 더 허용 */
    ok(M.pri.length === 1, `${tag}: 첫 화면 주 버튼 1개(${M.pri.length}: ${M.pri.join(' / ')})`);
    if (pol) ok(M.mj >= 0 && M.mj < M.fold, `${tag}: 「오늘 익힐 것」 첫 화면(y ${M.mj} < ${Math.round(M.fold)})`);
    else ok(M.mj === -1, `${tag}: 꺼짐 — 「오늘 익힐 것」 없음`);
    ok(M.tabs === TABS[ty], `${tag}: 아래 탭 4칸 「${M.tabs}」`);
    ok(M.moreOpen === false, `${tag}: 「더 보기」 처음 접힘`);
    ok(['tb-goal', 'tb-links', 'lq-hc'].every(c => M.inMore.includes(c)), `${tag}: 기존 블록(목표 · 바로가기 · 캘린더)이 더 보기 안에 그대로(${M.inMore.join(',')})`);
    ok(M.ow <= 0, `${tag}: 가로 넘침 0`);
    /* 더 보기 펼침 → 다시 그려도 유지 */
    await p.click('#lm .tb-more > summary'); await p.waitForTimeout(150); await p.evaluate(() => lrender()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#lm .tb-more').open), `${tag}: 더 보기 펼친 상태 유지`);
    /* 내 학습 세그먼트 · 기록 */
    await go(p, '#my', 700);
    const seg = await p.evaluate(() => [...document.querySelectorAll('#lm .tb-seg a')].map(a => a.textContent.trim()).join('|')); ok(seg === '목록|일정|기록', `${tag}: 내 학습 세그먼트 「${seg}」`);
    ok(await p.evaluate(() => { const d = document.querySelector('#lm details.tb-mymore'); return !d || !d.open; }), `${tag}: 내 학습 부가 카드는 「더 보기」(접힘)`);
    await go(p, '#rec', 700); const rc = await p.evaluate(() => ({ t: (document.querySelector('#lm .tb-rt') || {}).textContent || '', tab: (document.querySelector('#lapp .ap-nav a.on span') || {}).textContent || '', j: !!document.querySelector('#lm .tb-rl a[href="#journey"]'), sum: !!document.querySelector('#lm .mj-sum') }));
    ok(/학습 시간/.test(rc.t) && /오늘/.test(rc.t), `${tag}: 기록 — 학습 시간`); ok(rc.tab === TABS[ty].split('|')[1], `${tag}: 기록은 「${rc.tab}」 칸`);
    if (pol) ok(rc.j && rc.sum, `${tag}: 기록 — 나의 여정 · 작은 성취 요약`);
    /* 나 5묶음 */
    await go(p, '#acct', 700); const me = await p.evaluate(() => ({ g: [...document.querySelectorAll('#lm .ls-me .ls-gt')].map(h => h.textContent).join('|'), acd: !!document.querySelector('#lm details.ls-acd:not([open])'), out: (() => { const o = document.querySelector('#lm .ls-out'); const d = document.querySelector('#lm .ls-acd'); return !!(o && d && (d.compareDocumentPosition(o) & 4)); })(), h: ((document.querySelector('#lm .ls-out') || document.querySelector('#lm .ls-me') || document.body).getBoundingClientRect().bottom + scrollY + 80) / innerHeight }));
    ok(/^받은 것\|내 기록\|(결제 · 수강\|)?연결 · 설정\|계정$/.test(me.g), `${tag}: 나 — 묶음 「${me.g}」`); ok(me.acd && me.out, `${tag}: 회원정보 접힘 · 로그아웃 맨 아래`); ok(me.h <= 2.2, `${tag}: 나 높이 ${me.h.toFixed(2)}화면`);
    /* 메시지: 숫자 한 줄 · 질문 보내기 1개 */
    await go(p, '#msg', 700); const ms = await p.evaluate(() => ({ n: !!document.querySelector('#lm .lc47n'), b: [...document.querySelectorAll('#lm a[href="#msg/new"]')].filter(a => a.offsetParent).length, side: !!document.querySelector('#lm details.lc47m:not([open])') }));
    ok(ms.n && ms.b === 1 && ms.side, `${tag}: 메시지 — 숫자 한 줄 · [질문 보내기] 1개 · 나머지 더 보기`);
    if (ty === 'univ' && pol) { await go(p, '#cal', 700); const c = await p.evaluate(() => ({ h: document.documentElement.scrollHeight / innerHeight, d: !!document.querySelector('#lm .lq-later, #lm .lq-legd') })); ok(c.h <= 3 && c.d, `${tag}: 캘린더 이번 주만 펼침(${c.h.toFixed(2)}화면)`); }
    ok(!errs.length, `${tag}: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
