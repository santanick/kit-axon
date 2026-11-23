'use strict';
/* v46 Ver2 학습자 — ① 과제별 AI 레벨 띠 ② 힌트 사다리 5단계 + 먼저 시도 잠금 · 데모 aiguard 레벨 판정(lv2.js · aiguard.js)
   A. 정책 꺼짐(aipol 없음 · 기존 기관): 띠 · 사다리 · 비전 · 튜터 문구 변화 0
   B. 정책 켜짐: 레벨 띠(L1 이유 · 기관 기본 · 시험 L0 · 과제 L0 질문 넘기기) · 튜터 숨김 · 사다리 잠금(20자 · 90% 일치 · 30자 복사) · 4단계 · 자기 설명 50자 · 풀이
     · 다시 열어도 단계 유지 · 이벤트(글 원문 없음) · aiguard 403 ai_level_off · 409 hint_locked · 단계 지시문 · 휴대폰 390 가로 넘침 0
   사용: node tests/ui/v2-hint.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const RAW = fs.readFileSync(ROOT + '/learner-demo.json', 'utf8');
const SID = '20260001';
const A1 = 'itqb9j8fz', QZ = 'itkhjo04h', EX = 'itsu19hkh', A0 = 'itgo4y4yi';
function siteOn() { const j = JSON.parse(RAW); j.aipol = { on: true, lvl: 'L1', retain: 'term', evalNotice: true };
  const c = j.classes.find(x => x.id === 'c2'); const it = id => c.items.find(x => x.id === id);
  it(A1).ai = { lvl: 'L1', why: '개념을 스스로 익히는 과제라 힌트만 열어 둡니다', sol: true, solTxt: '정답 풀이: 막대 그래프로 범주를 비교합니다.' };
  it(A0).ai = { lvl: 'L0' }; return JSON.stringify(j); }

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const go = async (p, h, ms = 450) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  const T = (p, s) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', s);
  const open = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 1280, height: 860 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    if (o.ai) await p.route(/^https:\/\/api\.anthropic\.com\//, async x => { const b = JSON.parse(x.request().postData() || '{}'); o.ai.push(b); await x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ model: 'claude-haiku-5-5', content: [{ type: 'text', text: `Claude 힌트 ${o.ai.length}번: 어떤 비교가 필요한지 먼저 생각해 볼까요?` }] }) }); });
    if (o.on) await p.route(/learner-demo\.json/, x => x.fulfill({ status: 200, contentType: 'application/json', body: siteOn() }));
    await p.addInitScript(([sid, key]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); localStorage.setItem('didisam.app.instx', '1'); localStorage.setItem('didisam.app.classic', '1'); if (key) localStorage.setItem('didisam.app.claude.sample', JSON.stringify({ key: 'sk-ant-test-000000000000', model: 'claude-haiku-5-5' })); } catch (e) { }
      window.__ev = []; window.LEV = { __test: true, emit: (v, o, x) => window.__ev.push([v, o, x]), flush() { } }; }, [SID, !!o.ai]);
    await p.goto(`${base}/learner.html?demo=1${o.h || '#home'}`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { ctx, p, errs }; };

  /* ── A. 꺼짐 ── */
  { const { ctx, p, errs } = await open();
    ok(!(await p.evaluate(() => LV2.on())), '꺼짐: LV2.on() false(aipol 없음)'); ok(!(await p.$('#v2vis')) && !(await p.$('.v2-vcard')), '꺼짐: 비전 자동 시작 · 홈 카드 없음');
    await go(p, `#c/c2/${A1}`); ok(!(await p.$('.v2-aib')), '꺼짐: 과제 레벨 띠 없음');
    await p.evaluate(() => ltOpen()); await p.waitForTimeout(250);
    ok(!(await p.$('.v2-tabs, .v2-lad, .v2-pill')), '꺼짐: 튜터 패널 사다리 · 탭 없음'); ok(/대화는 저장하지 않아요/.test(await T(p, '.lt-note')), '꺼짐: 튜터 안내 문구 그대로');
    await go(p, `#c/c2/${EX}`); ok(await p.evaluate(() => !document.getElementById('ltut').hidden), '꺼짐: 시험 화면 튜터 그대로(차단 없음)');
    ok(!errs.length, `꺼짐: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* ── B. 켜짐 · PC ── */
  { const { ctx, p, errs } = await open({ on: true, h: `#c/c2/${A1}` }); await p.evaluate(() => { const x = document.querySelector('[data-vis="later"]'); if (x) x.click(); }); await p.waitForTimeout(200);
    await go(p, `#c/c2/${A1}`);
    const b = await T(p, '.v2-aib'); ok(/이 과제의 AI: 코치/.test(b) && /개념을 스스로 익히는 과제라/.test(b), `L1 띠 + 이유(${b.slice(0, 50)})`); ok(/평가에 참고될 수 있어요/.test(b), '평가 참고 사전 고지');
    ok(await p.evaluate(() => { const a = document.querySelector('.imain .v2-aib'); const h = document.querySelector('.imain h2'); return !!(a && h && (h.compareDocumentPosition(a) & 4)); }), '띠 위치: 항목 제목 바로 아래');
    await go(p, `#c/c2/${QZ}`); ok(/기관 기본: 코치/.test(await T(p, '.v2-aib')), '레벨 미지정 퀴즈: 「기관 기본: 코치」');
    await go(p, `#c/c2/${EX}`); const ex = await T(p, '.v2-aib'); ok(/이 과제는 AI 없이 풀어요/.test(ex) && !(await p.$('.v2-aib button')), '시험(프리셋 L0): AI 없이 · 질문 넘기기도 없음');
    ok(await p.evaluate(() => document.getElementById('ltut').hidden), '시험 L0: 튜터 버튼 숨김');
    await p.evaluate(() => ltAsk('정답 알려줘')); await p.waitForTimeout(200); ok(!(await p.evaluate(() => LT.msgs.some(m => m.me && /정답 알려줘/.test(m.t)))), '시험 L0: 튜터 질문 차단');
    await go(p, `#c/c2/${A0}`); ok(/이 과제는 AI 없이 풀어요/.test(await T(p, '.v2-aib')) && await p.evaluate(() => document.getElementById('ltut').hidden), '과제 L0: 띠 · 튜터 숨김');
    const n0 = await p.evaluate(() => (LR.lp.tutor && LR.lp.tutor.ask || []).length); await p.click('[data-v2="esc0"]'); await p.fill('.v2-esc0 textarea', '요구사항 2번이 무슨 뜻인지 모르겠어요'); await p.click('.v2-esc0 button[type=submit]'); await p.waitForTimeout(250);
    ok(await p.evaluate(n => (LR.lp.tutor.ask || []).length === n + 1, n0), '과제 L0: 「선생님께 질문 넘기기」 전송');
    /* 사다리 */
    await go(p, `#c/c2/${A1}`); ok(await p.evaluate(() => !document.getElementById('ltut').hidden), 'L1: 튜터 보임'); await p.click('[data-v2="ladder"]'); await p.waitForTimeout(300);
    const L = await p.evaluate(() => ({ lm: !!document.querySelector('.lt-panel.v2-lmode'), st: document.querySelectorAll('.v2-st').length, pill: (document.querySelector('.v2-pill') || {}).textContent, note: document.querySelector('.lt-note').textContent, lh: document.querySelector('.v2-lh').textContent }));
    ok(L.lm && L.st === 5, `힌트 받기 → 사다리 5단계(${L.st})`); ok(/이 과제의 AI: 코치/.test(L.pill || ''), '튜터 머리: 레벨 표시'); ok(/이번 학기 동안 보관해요/.test(L.note), '보존 정책 문구(term)'); ok(/먼저 내 생각을 적어 주세요/.test(L.lh), '빈 상태 문구');
    const click = async s => { await p.click(s); await p.waitForTimeout(250); };
    const msg = () => T(p, '.v2-msg'); const send = async t => { await p.fill('#v2t', t); await click('.v2-try button[type=submit]'); };
    await click('.v2-st.nx [data-v2="open"]'); ok(await p.evaluate(() => LV2.hintState('c2/itqb9j8fz').step === 1) && !!(await p.$('.v2-st.cur .v2-box')), '1단계(개념 질문): 시도 없이 바로 열림');
    ok(/먼저 내 생각을 적어 주세요/.test(await T(p, '.v2-st.nx')) && !(await p.$('.v2-st.nx [data-v2="open"]')), '2단계: 시도 전 잠김');
    await send('선 그래프요'); ok(/20자 이상/.test(await msg()), '20자 미만 → 「시도를 조금 더 적어 주세요(20자 이상).」');
    const T1 = '월별 매출 변화라서 시간 흐름을 보이려고 선 그래프로 그려 봤어요'; await send(T1); ok(/2단계를 열 수 있어요/.test(await msg()), '20자 이상 시도 → 2단계 열 수 있음');
    await click('.v2-st.nx [data-v2="open"]'); ok(await p.evaluate(() => LV2.hintState('c2/itqb9j8fz').step === 2), '2단계 열림');
    ok(/먼저 내 생각을/.test(await T(p, '.v2-st.nx')), '3단계: 2단계 뒤 새 시도 없으면 잠김');
    await send(T1 + '.'); ok(/거의 같아요/.test(await msg()), '90% 이상 같은 시도 → 「앞의 시도와 거의 같아요…」');
    const box = await T(p, '.v2-st.cur .v2-box'); await send('제 생각은 ' + box.slice(0, 40)); ok(/그대로 옮긴 글/.test(await msg()), `AI 문장 30자 복사 → 시도로 안 셈`);
    await send('범주끼리 비교하는 거라면 막대 그래프가 더 나을 수도 있겠다고 생각했어요'); await click('.v2-st.nx [data-v2="open"]');
    await send('지역별 매출을 비교한다면 막대로, 월별 추세는 선으로 나눠서 그리면 될 것 같아요'); await click('.v2-st.nx [data-v2="open"]');
    ok(await p.evaluate(() => LV2.hintState('c2/itqb9j8fz').step === 4), '3 · 4단계: 단계마다 새 시도 후 열림');
    const f5 = await p.evaluate(() => ({ f: document.querySelector('.v2-try').dataset.v2f, nx: (document.querySelector('.v2-st.nx') || {}).textContent }));
    ok(f5.f === 'sx' && /어떻게 풀었는지/.test(f5.nx || ''), '5단계: 자기 설명 요구(허용 과제)');
    await send('막대와 선을 나눠 그렸어요'); ok(/50자 이상/.test(await msg()), '자기 설명 50자 미만 → 열리지 않음');
    await send('처음엔 시간 흐름이라 선 그래프를 골랐는데, 지역별 비교도 해야 해서 막대 그래프와 선 그래프를 나눠 그리는 방법을 생각했어요. 범례와 축 이름도 넣었어요.');
    await click('.v2-st.nx [data-v2="open"]'); ok(/정답 풀이: 막대 그래프로/.test(await T(p, '.v2-st.cur .v2-box')), '자기 설명 50자 이상 → 5단계 풀이');
    ok(await p.evaluate(() => LV2.canOpen({ step: 4, tries: [{ s: 4 }], selfExp: true }, 5, 'L1', { ai: { lvl: 'L1' } })) === '풀이는 선생님이 허용한 과제에서만 볼 수 있어요.', '풀이 허용 꺼짐: 끝까지 5단계 안 열림');
    ok(await p.evaluate(() => LV2.canOpen({ step: 0, tries: [] }, 3, 'L3', {})) === '앞 단계를 먼저 열어 주세요.' && await p.evaluate(() => LV2.canOpen({ step: 2, tries: [] }, 3, 'L3', {})) === '', 'L3: 시도 잠금 없음(순서만)');
    ok(await p.evaluate(() => LV2.checkTry('열 글자짜리 시도입니다', { tries: [] }, 'L2', 'x')) === '', 'L2: 최소 10자');
    const ev = await p.evaluate(() => window.__ev); const at = ev.filter(e => e[0] === 'attempt'), hi = ev.filter(e => e[0] === 'hint');
    ok(at.length === 3 && hi.length === 5 && hi.every(e => e[1].item === 'itqb9j8fz' && e[1].lvl === 'L1'), `attempt ${at.length} · hint ${hi.length} 이벤트(항목 · 레벨)`);
    ok(ev.every(e => Object.values(e[2] || {}).every(v => typeof v === 'number')), '이벤트 값: 숫자만(글 원문 없음)');
    await click('[data-v2="esc"]'); ok(await p.evaluate(() => LT.escNext && !document.querySelector('.lt-panel.v2-lmode')), '「선생님께 질문 넘기기」: 대화 탭 · 넘기기 입력');
    await p.reload(); await p.waitForTimeout(900); await go(p, `#c/c2/${A1}`); await p.evaluate(() => { const x = document.querySelector('[data-vis="later"]'); if (x) x.click(); });
    ok(await p.evaluate(() => LV2.hintState('c2/itqb9j8fz').step === 5 && LV2.hintState('c2/itqb9j8fz').tries.length === 3), '다시 접속해도 열린 단계 · 시도 유지');
    ok(!errs.length, `켜짐 PC: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* ── C. 데모 aiguard 레벨 판정 · 단계 지시문(브라우저 키) ── */
  { const AI = []; const { ctx, p, errs } = await open({ on: true, ai: AI, h: `#c/c2/${A1}` }); await p.evaluate(() => { const x = document.querySelector('[data-vis="later"]'); if (x) x.click(); }); await go(p, `#c/c2/${A1}`);
    await p.click('[data-v2="ladder"]'); await p.waitForTimeout(250); await p.click('.v2-st.nx [data-v2="open"]'); await p.waitForTimeout(500);
    const sys = AI[0] ? JSON.stringify(AI[0].system) : ''; ok(/힌트 1단계 · 개념 질문/.test(sys) && /AI 레벨 L1 코치/.test(sys), '데모: 단계 · 레벨 지시문을 system에 덧붙임');
    ok(/Claude 힌트 1번/.test(await T(p, '.v2-st.cur .v2-box')), '데모: Claude 응답을 1단계 힌트로 표시');
    const g = await p.evaluate(async () => { const keep = window.LV2; const call = async c => { window.LV2 = { on: () => true, ctx: () => c }; try { const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'x', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] }) }); return [r.status, (await r.json()).error.type]; } finally { window.LV2 = keep; } };
      return [await call({ lvl: 'L0' }), await call({ lvl: 'L1', hint: { step: 3, cur: 1, tries: [0] } }), await call({ lvl: 'L1', hint: { step: 3, cur: 2, tries: [0] } }), await call({ lvl: 'L1', sol: false, hint: { step: 5, cur: 4, tries: [4] } })]; });
    ok(g[0][0] === 403 && g[0][1] === 'ai_level_off', `L0 → 403 ai_level_off(${g[0]})`); ok(g[1][0] === 409 && g[2][0] === 409 && g[3][0] === 409 && g.slice(1).every(x => x[1] === 'hint_locked'), `단계 건너뛰기 · 새 시도 없음 · 풀이 미허용 → 409 hint_locked(${g.slice(1).map(x => x[0])})`);
    ok(!errs.length, `aiguard: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* ── D. 휴대폰 390 ── */
  { const { ctx, p, errs } = await open({ on: true, w: 390, h: `#c/c2/${A1}` }); await p.evaluate(() => { const x = document.querySelector('[data-vis="later"]'); if (x) x.click(); }); await go(p, `#c/c2/${A1}`);
    ok(await p.evaluate(() => { const a = document.querySelector('.v2-aib'); return !!(a && a.getBoundingClientRect().width > 0); }), '390: 레벨 띠 보임');
    await p.click('[data-v2="ladder"]'); await p.waitForTimeout(300);
    const m = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth - innerWidth, lad: !!document.querySelector('.v2-lad'), small: [...document.querySelectorAll('.v2-lad button, .v2-tabs button')].filter(b => b.getBoundingClientRect().height && b.getBoundingClientRect().height < 44).map(b => b.textContent.trim()) }));
    ok(m.lad && m.ov <= 0, `390: 사다리 · 가로 넘침 없음(${m.ov})`); ok(!m.small.length, `390: 누르는 곳 44px(${m.small.join('/')})`);
    ok(!errs.length, `390: pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
