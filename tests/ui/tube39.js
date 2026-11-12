'use strict';
/* v39 디디쌤 튜브(학습자 앱 새 보기) 점검 — 기존 앱 보기 테스트와 나눈다(docs/parallel/v39-tube.md).
   1) 홈 피드: 칩 · 오늘 목표 · 이어 보기(재생 위치 · 남은 시간) · AI 튜터 제안(틀린 퀴즈) · 이번 주 차시 · 하단 탭 4칸(홈 · 일정 · 내 과정 · 나) · 늘 떠 있는 AI 튜터 아이콘
   2) 오늘 목표 시트 → lp.tube.goal 저장, 완료 화면(#done)
   3) 짧게 복습(#review): 틀린 퀴즈 과정의 챕터 구간 + 퀴즈 1문제(정답 → 기록, 목표 +1분), 하루 5개 제한, 진도 미반영 안내
   4) 영상 레슨: 챕터 칩 이동 · 아이콘으로 여는 장면 튜터 시트(키 없으면 기본 안내 + 장면 기준 표시), 재생 위치 문장(ltSceneLine)
   5) 직업훈련 · 학사 LMS: #review 안내 · 챕터는 이동 버튼이 아님
   6) 방문자(로그인 전)는 기존 화면 그대로 · 누르는 곳 44px · 글자 12px 이상(390px)
   7) 서버 sceneLine · cleanTube(Node) 규칙
   사용: node tests/ui/tube39.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
function fixture(j, type, ed) {
  j.org.type = type; if (ed) j.org.ed = ed; else delete j.org.ed;
  ((j.shop && j.shop.classes) || []).forEach(c => { c.price = 0; c.final = 0; delete c.kind; });
  const c0 = j.classes[0]; c0.thumb = ''; c0.teacher = '김강사';
  const v = c0.items.find(i => i.id === 'itcd8rdl0'); v.title = '피벗 테이블로 매출 보고서 10분 만에'; v.time = 18; v.chaps = [{ t: 0, n: '데이터 준비' }, { t: 300, n: '행 · 열 배치' }, { t: 600, n: '값 요약 방식' }, { t: 900, n: '차트' }];
  const q = c0.items.find(i => i.id === 'iti4jymw3'); q.title = 'VLOOKUP 퀴즈'; q.qs = [{ t: 'mc', q: '정확히 같은 상품 코드를 찾으려면 마지막 인수는?', opts: ['TRUE', 'FALSE'], a: 1, pts: 100 }];
  if (type === 'voc' && j.cpl) j.cpl.on = true;
  return j; }
const LP = { cls: { c0: { items: { itpom3lya: { done: true, at: '2026-11-12T10:00:00Z' }, itcd8rdl0: { pos: 754, w: 0.68, at: '2026-11-13T01:00:00Z' }, iti4jymw3: { score: 40, at: '2026-11-12T11:00:00Z' } } } }, tube: { goal: 20, sec: { [today]: 720 } } };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const open = async (hash, o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/learner-demo-adult\.json/, r => { const j = fixture(JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8')), o.type || 'adult', o.ed); if (o.patch) o.patch(j); r.fulfill({ contentType: 'application/json', body: JSON.stringify(j) }); });
    if (!o.guest) await p.addInitScript(([lp, inst]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '26년 10월 기수', id: '20269000' })); localStorage.setItem('didisam.room.sample.lp', JSON.stringify({ '20269000': lp })); if (!inst) localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, [o.lp || LP, !!o.inst]);
    await p.goto(`${base}/learner.html?demo=adult&app=1${hash}`, { waitUntil: 'load' }); await p.waitForTimeout(700); return { ctx, p, errs }; };
  const tube = p => p.evaluate(() => JSON.parse(JSON.stringify(LR.lp.tube || {})));

  /* 1) 홈 피드 */
  { const { ctx, p, errs } = await open('#home');
    const r = await p.evaluate(() => ({ tube: document.body.classList.contains('tube'), chips: [...document.querySelectorAll('.tb-chip')].map(x => x.textContent.trim()), goal: (document.querySelector('.tb-gb') || {}).textContent || '',
      cont: (document.querySelector('.tb-cont') || {}).getAttribute && document.querySelector('.tb-cont').getAttribute('href'), contTx: (document.querySelector('.tb-cont') || {}).textContent || '', sug: (document.querySelector('.tb-sug') || {}).textContent || '',
      week: document.querySelectorAll('.tb-tile').length, tabs: [...document.querySelectorAll('.ap-nav.tb-nav a')].map(x => x.textContent.trim()), on: (document.querySelector('.ap-nav a.on') || {}).textContent || '', bar: !!document.querySelector('.ap-bar') }));
    ok(r.tube && !r.bar, `홈: 튜브 보기 · 앱 머리 막대 없음`);
    ok(r.chips[0] === '전체' && r.chips.includes('이어 보기') && r.chips.includes('내 과정'), `홈: 칩 — ${r.chips.join(' · ')}`);
    ok(/오늘 목표 20분/.test(r.goal) && /12\/20분/.test(r.goal), `홈: 오늘 목표 12/20분 — ${r.goal.replace(/\s+/g, ' ')}`);
    ok(/itcd8rdl0/.test(r.cont) && /이어 보기 · 2차시/.test(r.contTx) && /12:34 \/ 18:00/.test(r.contTx) && /남은 시간 5분/.test(r.contTx), `홈: 이어 보기 카드(재생 위치 · 남은 시간) — ${r.contTx.replace(/\s+/g, ' ').slice(0, 90)}`);
    ok(/VLOOKUP 퀴즈/.test(r.sug) && /40점/.test(r.sug), `홈: AI 튜터 제안(틀린 퀴즈 근거) — ${r.sug.replace(/\s+/g, ' ')}`);
    ok(r.week >= 2, `홈: 이번 주 차시 ${r.week}개`);
    ok(r.tabs.join() === '홈,일정,내 강의,나' && r.on === '홈', `홈: 하단 탭 4칸 — ${r.tabs.join(' · ')} (선택 ${r.on})`);
    const fb = await p.evaluate(() => { const b = document.getElementById('tbFab'); if (!b) return null; const R = b.getBoundingClientRect(); const n = document.querySelector('.ap-nav.tb-nav').getBoundingClientRect(); return { t: b.textContent.trim(), l: b.getAttribute('aria-label'), w: R.width, above: R.bottom <= n.top, fixed: getComputedStyle(b).position }; });
    ok(fb && fb.t === 'AX 튜터' && /AX 튜터\(AI 튜터\) 열기/.test(fb.l) && fb.w >= 56 && fb.above && fb.fixed === 'fixed', `홈: AI 튜터 아이콘이 아래 탭 위에 떠 있음 — ${JSON.stringify(fb)}`);
    await p.click('#tbFab'); await p.waitForTimeout(250);
    const op = await p.evaluate(() => ({ on: document.body.classList.contains('lt-on'), fabHidden: getComputedStyle(document.getElementById('tbFab')).display === 'none' }));
    ok(op.on && op.fabHidden, `홈: 아이콘을 누르면 AI 튜터 창이 열림(아이콘은 숨김) ${JSON.stringify(op)}`);
    await p.click('[data-tact="close"]'); await p.waitForTimeout(200); ok(await p.evaluate(() => !document.body.classList.contains('lt-on') && getComputedStyle(document.getElementById('tbFab')).display !== 'none'), '홈: 창을 닫으면 아이콘이 다시 보임');
    const small = await p.evaluate(() => { const bad = []; document.querySelectorAll('.tb-home a, .tb-home button, .ap-nav.tb-nav a').forEach(e => { const b = e.getBoundingClientRect(); if (b.width && (b.height < 36 || (b.height < 44 && !e.classList.contains('tb-chip')))) bad.push(`${e.className || e.tagName}:${Math.round(b.height)}`); });
      document.querySelectorAll('.tb-home *, .ap-nav.tb-nav *').forEach(e => { if (!e.childElementCount && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12) bad.push(`글자 ${e.className || e.tagName} ${getComputedStyle(e).fontSize}`); });
      return bad.concat(document.documentElement.scrollWidth > 390 ? ['가로 넘침 ' + document.documentElement.scrollWidth] : []); });
    ok(!small.length, `홈: 누르는 곳 44px(칩 36px) · 글자 12px · 넘침 없음 ${small.slice(0, 5).join(' | ')}`);
    /* 칩: 내 과정 */
    await p.click('.tb-chip[data-v="mine"]'); await p.waitForTimeout(150);
    const rows = await p.$$eval('.tb-row', R => R.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ok(rows.length >= 1 && /엑셀/.test(rows.join()), `칩 내 과정: 목록 ${rows.length}개`);
    await p.click('.tb-chip[data-v="all"]'); await p.waitForTimeout(100);
    /* 오늘 목표 시트 */
    await p.click('.tb-gb'); await p.waitForTimeout(100); await p.click('.tb-gopt button[data-v="30"]'); await p.waitForTimeout(200);
    const g = await p.evaluate(() => ({ t: document.querySelector('.tb-gb').textContent, goal: LR.lp.tube.goal }));
    ok(g.goal === 30 && /12\/30분/.test(g.t), `오늘 목표 시트: 30분 저장 — ${g.t.replace(/\s+/g, ' ')}`);
    ok(!errs.length, `홈: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* 2) 완료 화면 · 목표를 넘기면 #done으로 */
  { const lp = JSON.parse(JSON.stringify(LP)); lp.tube.sec[today] = 20 * 60 - 3; const { ctx, p, errs } = await open('#home', { lp });
    await p.evaluate(() => { const L = LW; L.yp = { getPlayerState: () => 1, getCurrentTime: () => 10 }; }).catch(() => { });
    await p.evaluate(() => { location.hash = '#c/c0/itcd8rdl0'; }); await p.waitForTimeout(300);
    await p.evaluate(() => { LW.yp = { getPlayerState: () => 1, getCurrentTime: () => 10, getDuration: () => 1080 }; }); await p.waitForTimeout(5600);
    const t1 = await tube(p); ok(t1.sec[today] >= 1200, `재생 중이면 5초마다 학습 초를 센다 — ${t1.sec[today]}초`);
    await p.evaluate(() => { location.hash = '#done'; }); await p.waitForTimeout(250);
    const d = await p.evaluate(() => ({ h: (document.querySelector('.tb-done h1') || {}).textContent || '', wk: document.querySelectorAll('.tb-wk li').length, okd: document.querySelectorAll('.tb-wk li span.ok').length, tip: (document.querySelector('.tb-tip') || {}).textContent || '', btn: [...document.querySelectorAll('.tb-da a')].map(a => a.textContent) }));
    ok(d.h === '오늘 목표를 다 했어요' && d.wk === 7 && d.okd >= 1, `완료 화면: 제목 · 이번 주 7칸(달성 ${d.okd}) — ${d.h}`);
    ok(/2차시/.test(d.tip) && d.btn.join() === '내일 알림 받고 마치기,조금 더 볼래요', `완료 화면: 내일 시작 지점 · 버튼 — ${d.tip.replace(/\s+/g, ' ')}`);
    ok(!errs.length, `완료: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* 3) 짧게 복습 */
  { const { ctx, p, errs } = await open('#review');
    const s = await p.evaluate(() => ({ h: (document.querySelector('.tbs h1') || {}).textContent, tag: (document.querySelector('.tbs-tag') || {}).textContent, q: (document.querySelector('.tbs-q p') || {}).textContent, n: (document.querySelector('.tbs-top em') || {}).textContent, on: (document.querySelector('.ap-nav a.on') || {}).textContent }));
    ok(s.h === '데이터 준비' && /2차시 00:00부터 3분/.test(s.tag) && /마지막 인수/.test(s.q || '') && await p.evaluate(() => /진도에는 들어가지 않아요/.test(document.querySelector('.tbs-from').textContent)), `짧게 복습: 틀린 퀴즈 과정 구간 · 퀴즈 · 진도 미반영 안내 — ${s.h} / ${s.tag}`);
    ok(/오늘 0 \/ 5개/.test(s.n), `짧게 복습: 오늘 개수 — ${s.n}`);
    const sec0 = (await tube(p)).sec[today] || 0;
    await p.click('.tbs-qo button[data-v="FALSE"]'); await p.waitForTimeout(150);
    const a = await p.evaluate(() => ({ ok: !!document.querySelector('.tbs-qo button.ok[data-v="FALSE"]'), msg: document.querySelector('.tbs-qr').textContent }));
    const t = await tube(p); ok(a.ok && /정답이에요/.test(a.msg) && t.qr[today] === 1 && t.qn[today] === 1 && t.sec[today] === sec0 + 60, `짧게 복습 퀴즈: 정답 기록 · 목표 +1분 — ${a.msg}`);
    for (let i = 0; i < 5; i++) { const b = await p.$('[data-tb="sh-next"]'); if (b) { await b.click(); await p.waitForTimeout(120); } }
    const end = await p.evaluate(() => (document.querySelector('.tbs h1') || {}).textContent);
    ok(/오늘 짧게 복습 5개를 다 했어요/.test(end) && (await tube(p)).sh[today] === 5, `짧게 복습: 하루 5개에서 멈춤 — ${end}`);
    ok(!errs.length, `짧게 복습: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* 4) 영상 레슨: 챕터 · 튜터 패널 */
  { const { ctx, p, errs } = await open('#c/c0/itcd8rdl0');
    const w = await p.evaluate(() => ({ h: (document.querySelector('.tbw-hd h2') || {}).textContent, ch: [...document.querySelectorAll('.tbw-c')].map(x => x.tagName + ':' + x.textContent.trim()), on: (document.querySelector('.tbw-c.on') || {}).textContent, now: (document.querySelector('.tbw-now') || {}).textContent, tab: (document.querySelector('.ap-nav a.on') || {}).textContent }));
    ok(/^2차시 · 피벗/.test(w.h || '') && w.ch.length === 4 && w.ch.slice(0, 3).every(x => x.startsWith('BUTTON')) && w.ch[3].startsWith('SPAN') && /값 요약 방식/.test(w.on || ''), `영상: 챕터 칩 4개(본 구간까지만 버튼, 과정 규칙 watched) · 현재 챕터 ${w.on} — ${w.ch.join(' | ')}`);
    ok(/영상을 재생하면/.test(w.now) && /내 강의/.test(w.tab), `영상: 재생 전 안내 · 탭 내 강의(유형 용어) — ${w.now}`);
    const sh0 = await p.evaluate(() => ({ hid: document.getElementById('tbwTu').hidden, fab: document.getElementById('tbFab').textContent.trim() }));
    ok(sh0.hid && sh0.fab === '이 장면 질문', `영상: 튜터는 처음엔 닫혀 있고 아이콘이 '이 장면 질문' — ${JSON.stringify(sh0)}`);
    await p.click('#tbFab'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const t = document.getElementById('tbwTu'); return !t.hidden && getComputedStyle(t).position === 'fixed' && document.activeElement && document.activeElement.id === 'tbwQ'; }), '영상: 아이콘을 누르면 장면 튜터 시트가 열리고 입력칸에 초점');
    let seekTo = null; await p.exposeFunction('__seek', t => { seekTo = t; });
    await p.evaluate(() => { LW.yp = { getPlayerState: () => 2, getCurrentTime: () => 754, seekTo: t => window.__seek(t), playVideo() { } }; });
    await p.waitForTimeout(1100); const now = await p.$eval('.tbw-now', e => e.textContent); ok(now === '12:34 장면을 보고 있어요', `영상: 재생 시각 배지 — ${now}`);
    await p.click('.tbw-c[data-v="300"]'); await p.waitForTimeout(100); ok(seekTo === 300, `영상: 본 구간 챕터를 누르면 그 위치로(${seekTo})`);
    const sl = await p.evaluate(() => ({ t: ltSceneT(), line: ltSceneLine(SITE().classes[0].items.find(i => i.id === 'itcd8rdl0'), 754) }));
    ok(sl.t === 754 && /지금 재생 위치: 12:34 \(챕터 「값 요약 방식」 10:00~15:00\)/.test(sl.line) && /근거:/.test(sl.line), `영상: 장면 문장(서버와 같은 규칙) — t=${sl.t}`);
    await p.click('.tbw-qc button[data-v="3줄 요약"]'); await p.waitForTimeout(500);
    const m = await p.evaluate(() => [...document.querySelectorAll('.tbw-m')].map(x => x.className + '|' + x.textContent.replace(/\s+/g, ' ').slice(0, 60)));
    ok(m.length >= 2 && /me\|3줄 요약/.test(m[0]) && /12:34 장면 기준 · 기본 안내/.test(m[1]), `영상: 튜터 패널 대화(키 없음 → 기본 안내) — ${m.join(' / ')}`);
    await p.fill('#tbwQ', '<img src=x onerror=alert(1)> 이건 왜 평균이에요?'); await p.press('#tbwQ', 'Enter'); await p.waitForTimeout(400);
    const inj = await p.evaluate(() => !!document.querySelector('.tbw-ms img')); ok(!inj, '영상: 질문 글은 글자로만(HTML 실행 없음)');
    await p.click('[data-tb="sheet-x"]'); await p.waitForTimeout(150); ok(await p.evaluate(() => document.getElementById('tbwTu').hidden && document.activeElement && document.activeElement.id === 'tbFab'), '영상: 닫기 → 시트 닫힘 · 초점은 아이콘으로');
    ok(!errs.length, `영상: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* 5) 규정 대상: 직업훈련 · 학사 LMS */
  for (const [type, ed] of [['voc', ''], ['univ', 'lms']]) { const label = type + (ed ? '/' + ed : '');
    const { ctx, p, errs } = await open('#home', { type, ed });
    const tabs = await p.$$eval('.ap-nav.tb-nav a', A => A.map(x => x.textContent.trim()));
    ok(tabs.join() === (type === 'voc' ? '홈,일정,내 훈련,나' : '홈,일정,이번 학기 강의,나') && await p.$('#tbFab') !== null, `${label}: 탭 4칸 · AI 튜터 아이콘 — ${tabs.join(' · ')}`);
    await p.evaluate(() => { location.hash = '#review'; }); await p.waitForTimeout(250);
    const off = await p.evaluate(() => (document.querySelector('.tb-off h1') || {}).textContent || '');
    ok(/짧게 복습은 이 기관에서 쓰지 않아요/.test(off), `${label}: #review 안내 — ${off}`);
    await p.evaluate(() => { location.hash = '#c/c0/itcd8rdl0'; }); await p.waitForTimeout(400);
    const ch = await p.evaluate(() => ({ tags: [...document.querySelectorAll('.tbw-c')].map(x => x.tagName), note: (document.querySelector('.tbw-cn') || {}).textContent || '' }));
    ok(!ch.tags.length || (ch.tags.every(t => t === 'SPAN') && /건너뛸 수 없어요/.test(ch.note)), `${label}: 챕터는 이동 버튼 아님 — ${ch.tags.join(',') || '(레슨 잠김/없음)'}`);
    ok(!errs.length, `${label}: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* 6) 방문자 · PC */
  { const { ctx, p, errs } = await open('#home', { guest: true });
    const r = await p.evaluate(() => ({ tube: document.body.classList.contains('tube'), feed: !!document.querySelector('.tb-home'), app: document.body.classList.contains('lapp') }));
    ok(!r.tube && !r.feed && !(await p.$('#tbFab')), `방문자: 기존 앱 첫 화면 그대로(튜브 · 아이콘 없음, lapp=${r.app})`); ok(!errs.length, `방문자: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }
  { const { ctx, p, errs } = await open('#home', { w: 1280 });
    const r = await p.evaluate(() => ({ feed: !!document.querySelector('.tb-home'), w: Math.round(document.querySelector('.tb-home').getBoundingClientRect().width), sw: document.documentElement.scrollWidth }));
    ok(r.feed && r.w <= 640 && r.sw <= 1280, `PC 1280: 피드 폭 ${r.w}px · 넘침 없음`); ok(!errs.length, `PC: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* 7) 서버 규칙(Node) */
  { const src = fs.readFileSync(path.resolve(__dirname, '../../service/server/app.js'), 'utf8'); const blk = src.match(/const mmss[\s\S]*?근거 구간을 적습니다[^\n]*\n/)[0];
    const F = new Function(blk + '; return { cleanTube, sceneLine };')();
    const L = F.sceneLine({ chaps: [{ t: 0, n: '데이터 준비' }, { t: 600, n: '값 요약 방식' }, { t: 900, n: '차트' }] }, 754);
    ok(/12:34 \(챕터 「값 요약 방식」 10:00~15:00\)/.test(L) && F.sceneLine({}, '754') === '' && F.sceneLine({}, -1) === '' && F.sceneLine(null, 3) === '', `서버 sceneLine: 숫자 t만 · 챕터 구간`);
    const c = F.cleanTube({ goal: 999, sec: { '2026-11-13': 1e9, bad: 3, '2026-11-12': -5 }, sh: { '2026-11-13': 2.4 }, x: 1 });
    ok(!('goal' in c) && c.sec['2026-11-13'] === 86400 && c.sec['2026-11-12'] === 0 && !('bad' in c.sec) && c.sh['2026-11-13'] === 2 && !('x' in c) && F.cleanTube([]) === null, `서버 cleanTube: 범위 · 날짜 · 모르는 키 제거 ${JSON.stringify(c)}`);
    ok(Object.keys(F.cleanTube({ sec: Object.fromEntries([...Array(60)].map((_, i) => [new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), i])) }).sec).length === 40, '서버 cleanTube: 최근 40일만'); }

  /* 8) 스튜디오: 영상 챕터 입력 → 게시본 chaps */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' });
    const info = await p.evaluate(() => { createOrg('adult', '점검 기관'); let c = S.classes.find(x => (x.curriculum || []).some(i => i.type === 'video')); if (!c) { c = { id: uid('c'), name: '점검 과정', kind: 'period', sub: '', legal: false, level: 0, status: '운영중', price: 0, open: '전체', openTo: [], start: today(), end: addDays(today(), 60), teacher: '', group: '', learners: [], prog: {}, enr: {}, curriculum: [{ id: uid('it'), type: 'video', title: '점검 영상', src: 'youtube', url: '', week: 1 }], criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: 'manual', skip: false, speed: true, early: false, community: 'class', hours: 1, notices: [], desc: '' }; S.classes.push(c); }
      const i = c.curriculum.findIndex(x => x.type === 'video'); openEditor(c, i); return { cid: c.id, iid: c.curriculum[i].id, has: !!document.querySelector('[data-ed="chapsTx"]') }; });
    ok(info.has, '스튜디오: 영상 편집 창에 챕터 칸');
    await p.fill('[data-ed="chapsTx"]', '10:00 값 요약 방식\nabc 틀린 줄'); await p.click('#modal [data-mact="ok"], .mwrap [data-mact="ok"]'); await p.waitForTimeout(150);
    const stay = await p.evaluate(() => !!document.querySelector('[data-ed="chapsTx"]')); ok(stay, '스튜디오: 형식이 틀린 줄이 있으면 저장하지 않고 안내');
    await p.fill('[data-ed="chapsTx"]', '00:00 데이터 준비\n10:00 값 요약 방식\n1:02:03 <b>긴 영상</b>'); await p.click('#modal [data-mact="ok"], .mwrap [data-mact="ok"]'); await p.waitForTimeout(200);
    const r = await p.evaluate(([cid, iid]) => { const it = C(cid).curriculum.find(x => x.id === iid); const pub = lsSnapshot(); const y = ((pub.classes.find(x => x.id === cid) || {}).items || []).find(x => x.id === iid); return { saved: it.chaps, tx: 'chapsTx' in it, pub: y && y.chaps }; }, [info.cid, info.iid]);
    ok(JSON.stringify(r.saved) === JSON.stringify([{ t: 0, n: '데이터 준비' }, { t: 600, n: '값 요약 방식' }, { t: 3723, n: 'b긴 영상/b' }]) && !r.tx && JSON.stringify(r.pub) === JSON.stringify(r.saved), `스튜디오: 챕터 저장 · 게시본 반영 — ${JSON.stringify(r.pub)}`);
    ok(!errs.length, `스튜디오: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* 9) 관리자 설정 · 유형 시나리오 반영(2026-11-13 대표 점검 지시) */
  { const { ctx, p, errs } = await open('#home', { inst: true });
    const r = await p.evaluate(() => ({ ask: [...document.querySelectorAll('.tb-askr button')].map(b => b.textContent.trim()), links: [...document.querySelectorAll('.tb-links a')].map(a => a.getAttribute('href') + ':' + a.textContent.trim()), inst: !!document.querySelector('.tb-inst'), menu: !!document.querySelector('.tb-head [data-lux="menu"]') }));
    ok(r.ask.join() === '이번 주 계획,자격증 준비,복습 퀴즈', `성인: 유형별 AI 바로 묻기 — ${r.ask.join(' · ')}`);
    ok(r.links.join() === '#shop:둘러보기,#comm:커뮤니티,#notice:공지', `성인: 바로가기(하단 탭에서 빠진 둘러보기 · 커뮤니티 · 공지) — ${r.links.join(' ')}`);
    ok(r.inst && r.menu, '성인: 앱 설치 안내 · 전체 메뉴 버튼');
    await p.click('.tb-head [data-lux="menu"]'); await p.waitForTimeout(200);
    const m = await p.evaluate(() => [...document.querySelectorAll('#luxSheet a, #luxSheet button')].map(a => a.textContent.trim()).filter(Boolean));
    ok(m.some(x => /공지/.test(x)) && m.some(x => /진단|배지|강좌|둘러보기/.test(x)), `성인: 전체 메뉴 = 관리자 사이트 메뉴 — ${m.slice(0, 8).join(' · ')}`);
    await p.keyboard.press('Escape'); await p.click('.tb-inst [data-ap="inst-x"]'); await p.waitForTimeout(150); ok(!(await p.$('.tb-inst')), '성인: 설치 안내 닫기');
    await p.click('.tb-askr button'); await p.waitForTimeout(400); ok(await p.evaluate(() => document.body.classList.contains('lt-on') && /이번 주 학습 계획/.test(document.body.textContent)), '성인: AI 바로 묻기 → 대화 창에서 질문');
    ok(!errs.length, `관리자 설정: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }
  { const { ctx, p } = await open('#home', { type: 'voc' }); const a = await p.$$eval('.tb-askr button', B => B.map(b => b.textContent.trim())); ok(a.join() === '출석 확인,수료 기준,오늘 학습 한도', `직업훈련: AI 바로 묻기 — ${a.join(' · ')}`); await ctx.close(); }
  { const { ctx, p } = await open('#home', { type: 'univ', ed: 'lms' }); const l = await p.$$eval('.tb-links a', A => A.map(a => a.getAttribute('href'))); ok(l[0] === '#lms', `학사 LMS: 바로가기 첫 칸 수강 분반 — ${l.join(' ')}`); await ctx.close(); }
  { const { ctx, p, errs } = await open('#home', { patch: j => { j.tutor.enabled = false; j.pages = (j.pages || []).filter(x => x.id !== 'notice'); } });
    const r = await p.evaluate(() => ({ fab: !!document.getElementById('tbFab'), ask: !!document.querySelector('.tb-askr'), links: [...document.querySelectorAll('.tb-links a')].map(a => a.getAttribute('href')) }));
    ok(!r.fab && !r.ask && !r.links.includes('#notice'), `튜터 끔 · 공지 메뉴 끔: 아이콘 · 바로 묻기 · 공지 바로가기 없음 ${JSON.stringify(r)}`);
    await p.evaluate(() => { location.hash = '#c/c0/itcd8rdl0'; }); await p.waitForTimeout(400);
    const w = await p.evaluate(() => ({ ch: document.querySelectorAll('.tbw-c').length, tu: !!document.getElementById('tbwTu'), fab: !!document.getElementById('tbFab') }));
    ok(w.ch === 4 && !w.tu && !w.fab, `튜터 끔: 영상은 챕터만 ${JSON.stringify(w)}`); ok(!errs.length, `튜터 끔: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  await browser.close(); srv.close();
  if (fails.length) { console.error(`실패 ${fails.length}건`); process.exit(1); }
  console.log('✓ v39 디디쌤 튜브 점검 통과');
})().catch(e => { console.error(e); process.exit(1); });
