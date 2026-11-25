'use strict';
/* v46 Ver2 학습자 — ④ 오늘의 숙달 목표(홈 첫 카드) ⑩ 작은 성취 · 나의 여정 · 마일리지 트리거(mastcalc.js · ljourney.js)
   A. 정책 꺼짐(aipol 없음 · 기존 기관): 홈 카드 · 여정 화면 · 마이페이지 링크 0, 기존 #journey 처리 그대로
   B. 켜짐 PC(클래식 홈): 첫 카드 · 상태 칩 3종 · [바로 학습] 이동 · 다른 개념으로 · 모두 숙달 완료 카드 + 작은 성취 · goal 이벤트 · 빈 상태 2종
      여정: 비전 없음 → 비전 만들기, 성취 0 → 첫 작은 성취, 정거장 남은 개념 · 마일리지 0점 · 꺼짐(MILE_HOOK 0) · 켜면 srcId 1건씩
   C. 켜짐 휴대폰 390(앱 홈): 카드 표시 · 가로 넘침 0
   사용: flock /tmp/pw.lock node tests/ui/v2-journey.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const RAW = fs.readFileSync(ROOT + '/learner-demo.json', 'utf8');
const SID = '20260001'; const Q1 = 'itkhjo04h', Q3 = 'itds3czoa';
function siteOn(ach) { const j = JSON.parse(RAW); j.aipol = { on: true, lvl: 'L1', retain: 'term', evalNotice: true }; if (ach) j.aipol.ach = ach; return JSON.stringify(j); }
const ago = d => new Date(Date.now() - d * 864e5).toISOString();

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const go = async (p, h, ms = 450) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  const T = (p, s) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', s);
  const open = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 1280, height: 860 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    if (o.on) await p.route(/learner-demo\.json/, x => x.fulfill({ status: 200, contentType: 'application/json', body: siteOn(o.ach) }));
    await p.addInitScript(([sid, classic]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); localStorage.setItem('didisam.app.instx', '1'); if (classic) localStorage.setItem('didisam.app.classic', '1'); } catch (e) { }
      window.__ev = []; window.LEV = { __test: true, emit: (v, o, x) => window.__ev.push([v, o, x]), flush() { } }; window.__mile = []; window.MILE_HOOK = a => window.__mile.push(...a); }, [SID, o.w !== 390]);
    await p.goto(`${base}/learner.html?demo=1${o.h || '#home'}`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { ctx, p, errs }; };
  /* 기록 넣기: 1주차 퀴즈 서로 다른 날 2회 90점(숙달) · 3주차 퀴즈 어제 70점(익히는 중) */
  const seed = async (p, extra) => { const r = await p.evaluate(([q1, q3, a, extra]) => { const c = LR.lp.cls.c2 = LR.lp.cls.c2 || { items: {} }; c.items = c.items || {};
    c.items[q1] = { tries: [{ at: a[0], score: 90 }, { at: a[1], score: 100 }], score: 100, done: true }; c.items[q3] = { tries: [{ at: a[2], score: 70 }], score: 70, done: true }; delete LR.lp.mtoday; delete LR.lp.mgoal; delete LR.lp.mlast; delete LR.lp.mach;
    if (!extra) LR.lp.vision = { skip: true, step: 0 }; /* 통합 v46: 켜짐 기관 첫 진입 비전 대화(D4)를 건너뛴 학습자로 */
    if (extra === 'vision') LR.lp.vision = { card: { who: '데이터로 문제를 푸는 사람' }, txt: '데이터로 문제를 푸는 사람', goals: [{ t: '개념 5개 숙달' }, { t: '보고서 완성' }], at: new Date().toISOString(), step: 6 };
    lrender(); }, [Q1, Q3, [ago(3), ago(2), ago(1)], extra || '']); const sk = await p.$('.v2-vis [data-vis="skip"], .v2-vis [data-vis="close"]'); if (sk) { await sk.click(); await p.waitForTimeout(200); } return r; };
  const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  /* ── A. 꺼짐 ── */
  { const { ctx, p, errs } = await open(); await seed(p); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => MJ.on())), '꺼짐: MJ.on() false(aipol 없음)'); ok(!(await p.$('.mj-card, .mj-home')), '꺼짐: 홈 첫 카드 없음');
    await go(p, '#journey'); ok(!(await p.$('.mj-jr')), '꺼짐: #journey 여정 화면 없음(기존 처리 그대로)');
    await go(p, '#my'); ok(!(await p.$('.mj-mylink')), '꺼짐: 마이페이지 「나의 여정」 링크 없음');
    ok(!(await p.evaluate(() => window.__ev.some(e => e[0] === 'mastery' || e[0] === 'goal'))) && !(await p.evaluate(() => 'mtoday' in LR.lp || 'mgoal' in LR.lp)), '꺼짐: 이벤트 · 학습자 기록 추가 0');
    ok(!errs.length, `꺼짐: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* ── B. 켜짐 PC ── */
  { const { ctx, p, errs } = await open({ on: true }); await seed(p); await p.waitForTimeout(300);
    ok(await p.evaluate(() => MJ.on()), '켜짐: MJ.on() true');
    ok(await p.evaluate(() => { const c = document.querySelector('.mj-card'); return !!(c && c.offsetParent); }), '켜짐: 홈에 「오늘 익힐 것」 카드 표시');
    ok(/오늘 익힐 것/.test(await T(p, '.mj-card h2')), '문구: 「오늘 익힐 것」');
    const rows = await p.$$eval('.mj-row', L => L.map(x => ({ k: x.dataset.mjk, st: x.querySelector('.v2-ms').textContent.trim(), go: (x.querySelector('.mj-go') || {}).getAttribute && x.querySelector('.mj-go').getAttribute('href'), tx: x.querySelector('small').textContent })));
    ok(rows.length >= 1 && rows.length <= 3, `개념 1~3줄(${rows.length})`); ok(rows.every(r => /^(미도달|익히는 중|숙달)$/.test(r.st)), '상태 칩 3종 중 하나');
    ok(rows[0] && /익히는 중/.test(rows[0].st) && /다음: 숙달 확인 5문항/.test(rows[0].tx), `① 순서: 최근 익히는 중 먼저 · 「익히는 중 · 다음: 숙달 확인 5문항」(${rows[0] && rows[0].tx})`);
    ok(rows.every(r => /^#c\/c\d+\//.test(r.go || '')), /* 통합 v46: CONCEPT.ensure가 모든 과정에 개념을 만듦 */ `[바로 학습] → 해당 차시 항목(#c/c2/…)(${rows.map(r => r.go).join(' ')})`);
    ok(!rows.some(r => r.k === 'c2/w1'), '숙달한 1주차 개념은 새로 고르지 않음');
    ok(await p.evaluate(() => (LR.lp.mtoday || {}).ids && LR.lp.mtoday.ids.length > 0), '오늘 고른 개념을 lp.mtoday에 저장(같은 날 유지)');
    ok(await p.evaluate(() => window.__ev.some(e => e[0] === 'mastery' && e[1] === 'c2/w1' && e[2].st === 'done')), '숙달 변화 → mastery 이벤트(글 원문 없음)');
    ok(!(await p.$('.mj-home .mj-sum')), 'v47 D4: 홈 카드에 작은 성취 요약 줄 없음(「내 학습」으로 옮김)');
    await go(p, '#my', 500); if (!(await p.$('.mj-sum'))) await go(p, '#rec', 500); /* v47 통합: 웹 내 학습은 성취 3칸 대신 「기록」(#rec) */ ok(/이번 주 작은 성취/.test(await T(p, '.mj-sum')) && /연속 학습/.test(await T(p, '.mj-sum')), '요약 줄(v47 D4: 홈 → 마이페이지): 이번 주 작은 성취 · 연속 학습'); await go(p, '#home', 600);
    /* 바로 학습 이동 */
    const h0 = rows[0].go; await p.click('.mj-row .mj-go'); await p.waitForTimeout(500); ok(decodeURIComponent(await p.evaluate(() => location.hash)) === decodeURIComponent(h0), '[바로 학습] 누르면 그 항목으로 이동');
    ok(await p.evaluate(() => !!document.querySelector('.lp2l, #lm h2')), '항목 화면 표시'); await go(p, '#home', 600);
    /* 다른 개념으로 */
    const ids0 = await p.evaluate(() => LR.lp.mtoday.ids.slice()); const sw = await p.$('.mj-sw');
    if (sw) { await sw.click(); await p.waitForTimeout(400); const ids1 = await p.evaluate(() => LR.lp.mtoday.ids.slice()); ok(ids1.join() !== ids0.join() && ids1.length === ids0.length, `「다른 개념으로」 한 줄 바꿈(${ids0[0]}→${ids1[0]})`); } else ok(false, '「다른 개념으로」 버튼 있음');
    /* 모두 숙달 → 완료 카드 + 작은 성취 + goal 이벤트 */
    await p.evaluate(() => { LR.lp.mtoday = { d: MAST.day(Date.now()), ids: ['c2/w1'], skip: [] }; lrender(); }); await p.waitForTimeout(400);
    ok(/오늘 목표를 모두 해냈어요!/.test(await T(p, '.mj-card')), '모두 숙달 → 「오늘 목표를 모두 해냈어요!」');
    ok(await p.evaluate(() => (LR.lp.mgoal || []).length === 1 && window.__ev.filter(e => e[0] === 'goal').length === 1), '오늘 목표 완료 기록 1건 + goal 이벤트 1건');
    await p.evaluate(() => lrender()); await p.waitForTimeout(300); ok(await p.evaluate(() => (LR.lp.mgoal || []).length === 1 && window.__ev.filter(e => e[0] === 'goal').length === 1), '다시 그려도 중복 적립 0');
    ok(await p.evaluate(() => MJ.data().A.some(a => a.k === 'goal')), '작은 성취 「오늘 목표 완료」 적립');
    /* 빈 상태 2종 */
    const empty = await p.evaluate(() => { const b = myStats; myStats = () => ({ courses: [] }); /* eslint-disable-line no-global-assign */ const a = MJ.cardHTML(); myStats = b; /* eslint-disable-line no-global-assign */ return a; });
    ok(/아직 듣는 과정이 없어요\. 과정을 찾아볼까요\?/.test(empty) && /#courses/.test(empty), '빈 상태: 듣는 과정 없음 → 과정 찾기');
    const all = await p.evaluate(() => { const b = MAST.course; MAST.course = (...a) => b(...a).map(k => ({ ...k, st: 'done', reg: false, due: '' })); delete LR.lp.mtoday; const h = MJ.cardHTML(); MAST.course = b; return h; });
    ok(/지금 익힐 개념을 모두 숙달했어요\. 복습할 개념을 골라 볼까요\?/.test(all), '빈 상태: 모두 숙달 → 복습 안내');
    /* 여정 */
    await go(p, '#journey', 600); ok(/나의 여정/.test(await T(p, '.mj-jh h1')) && /지금 여기까지 왔어요/.test(await T(p, '.mj-jh')), '여정: 「나의 여정」 — 「지금 여기까지 왔어요」');
    ok(!!(await p.$('.mj-dest.is-ph [data-mj=vision]')), '여정: 비전 없음 → 도착지 자리에 「비전 만들기」');
    ok(/작은 성취 \+1 · (개념 숙달|오늘 목표 완료)/.test(await T(p, '.mj-week')), /* 통합 v46: 모든 과정 개념화로 첫 성취 종류가 데이터에 따라 다름 */ `여정: 이번 주 목록 「작은 성취 +1 · 개념 숙달: …」(${(await T(p, '.mj-week')).slice(0, 120)})`);
    ok(/작은 성취 적립은 이 기관에서 쓰지 않아요/.test(await T(p, '.mj-mile')) && !(await p.$('.mj-week .v2-jl__pt')), '마일리지 기본 0점 · 꺼짐(+P 표시 0)');
    ok(await p.evaluate(() => window.__mile.length === 0), '꺼짐: 마일리지 엔진으로 넘긴 이벤트 0');
    await seed(p, 'vision'); await go(p, '#home', 300); await go(p, '#journey', 600);
    ok(/데이터로 문제를 푸는 사람/.test(await T(p, '.mj-dest')) && (await p.$$('.mj-stop[data-k=stn]')).length === 2, '여정: 비전 카드 도착지 · 정거장 2개(학기 목표)');
    ok(/다음 정거장까지 개념 \d+개 남았어요/.test(await T(p, '.mj-left')), '여정: 「다음 정거장까지 개념 n개 남았어요」');
    const stOk = await p.evaluate(() => { const D = MJ.data(); const S = MAST.stations(LR.lp.vision.goals, D.all); return S.every(s => s.n === D.all.filter((k, i, A) => { const per = Math.ceil(A.length / S.length); const j = S.indexOf(s); return i >= j * per && i < (j + 1) * per && k.st === 'done'; }).length); });
    ok(stOk, '정거장 진척 = 연결 개념 숙달 판정과 일치');
    await go(p, '#my'); ok(!!(await p.$('.mj-mylink[href="#journey"]')), '마이페이지 › 「나의 여정」 링크');
    ok(!errs.length, `켜짐 PC: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* ── B2. 작은 성취 적립 켠 기관: 마일리지 srcId 1건씩 ── */
  { const { ctx, p, errs } = await open({ on: true, ach: { on: true } }); await seed(p); await p.waitForTimeout(300);
    const m1 = await p.evaluate(() => window.__mile.map(e => e.srcId)); ok(m1.length > 0 && new Set(m1).size === m1.length && m1.every(x => /^[a-z]+:/.test(x)), `켜짐: 작은 성취 → 마일리지 이벤트 srcId 고유(${m1.length}건)`);
    ok(await p.evaluate(() => window.__mile.find(e => e.trigger === 'v2_mastery').value === 10), '켜짐 기본 점수: 숙달 10');
    await p.evaluate(() => lrender()); await p.waitForTimeout(300); ok(await p.evaluate(n => window.__mile.length === n, m1.length), '다시 그려도 같은 srcId 재전송 0');
    await go(p, '#journey', 500); ok(/작은 성취로 받은 \d+P/.test(await T(p, '.mj-mile')), /* 통합 v46: 이번 주 목록은 요일에 따라 비어 있을 수 있어(월요일 등) 누적 P로 확인 */ `켜짐: 여정에 +P 표시(${(await T(p, '.mj-mile')).slice(0, 80)}|${(await T(p, '.mj-week')).slice(0, 80)})`);
    ok(!errs.length, `적립 켜짐: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* ── C. 휴대폰 390(앱 홈) ── */
  { const { ctx, p, errs } = await open({ on: true, w: 390 }); await seed(p); await p.waitForTimeout(400);
    await p.waitForSelector('.mj-card', { timeout: 4000 }).catch(() => { });
    ok(await p.evaluate(() => { const c = document.querySelector('.mj-card'); return !!(c && c.offsetParent); }), `390: 앱 홈에 「오늘 익힐 것」 카드(${await p.evaluate(() => { const c = document.querySelector('.mj-card'); if (!c) return 'none:' + location.hash + ':' + document.body.className + ':' + ((document.querySelector('h1,h2') || {}).textContent || '').slice(0, 40); let e = c; while (e && getComputedStyle(e).display !== 'none') e = e.parentElement; return e ? (e.id || e.className) : 'visible?'; })})`);
    ok(await p.evaluate(() => { const c = document.querySelector('.mj-home'); const a = document.querySelector('#lm .tb-main > .tb-now'); /* v47 D1: 튜브 홈은 「지금 할 일」 바로 아래(오늘 목표 카드는 「더 보기」로 접힘) */ return !!c && !!a && a.nextElementSibling === c; }), '390: 「지금 할 일」 바로 아래 「오늘 익힐 것」');
    ok(await p.evaluate(() => [...document.querySelectorAll('.mj-row .mj-go')].every(a => !a.classList.contains('pri'))), 'v47 D4: 「바로 학습」은 보조 버튼(첫 화면 주 버튼은 「지금 할 일」 1개)');
    ok((await overflow(p)) <= 0, '390: 홈 가로 넘침 0'); await go(p, '#journey', 600); ok(!!(await p.$('.mj-jr')) && (await overflow(p)) <= 0, '390: 여정 가로 넘침 0');
    ok(!errs.length, `390: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
