'use strict';
/* QA6(v49) AI 점검 회귀 — 기능표(ai-menu-admin · ai-menu-learner · ai.json)와 실제 동작 대조에서 나온 항목
   A. 관리자: 발송이 들어간 화면 칩 계획 카드(scxMsgPlan)는 [승인하고 실행] 뒤 「실행 전 확인」 창 → 확인 전 데이터 변화 0, 취소하면 그대로, 확인하면 발송(P-AI-9 · P-AI-14)
   B. 관리자 문서 첨부(P-AI-20): 개인정보 가림 · 미연결이면 찾은 조각 + 연결 안내 · 가짜 Claude 요청에 <sources> 포함 · 원문 전화번호 없음 · 지원 안 하는 형식 안내 · pdf/docx 라이브러리 같은 출처
   C. 관리자 Claude 오류(가짜 응답 500): 규칙 엔진으로 답하고 그 사실을 note로 표시(P-AI-11)
   D. 학습자 튜터 하루 한도(P-AI-48): 방문자 0회 = 로그인 안내(10회로 바뀌지 않음) · 기본 10회 표시 · 로그인 학습자 한도 소진 문구
   E. 학습자 튜터 사용량 초과 · 체험 종료(P-AI-54): 서버 코드 ai_month_quota · trial_ended → 그 사유가 답으로, 기본 안내로 덮지 않음
   F. 힌트 사다리(P-AI-6): 운영 요청 본문 hint.attempt = 시도 글(숫자 아님) · 5단계에 selfExp · L2는 시도 잠금 없음(서버 hintCheck와 같음)
   Claude · 서버 요청은 모두 가로채 가짜 응답(실제 키 없음). 사용: node tests/ui/qa49-ai.js (PORT_QA6, 기본 9963) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const PORT = +(process.env.PORT_QA6 || 9963);
const FAKE = 'sk-ant-DEMO-FAKE-not-a-real-key';
const RAW = fs.readFileSync(ROOT + '/learner-demo.json', 'utf8');
const A1 = 'itqb9j8fz';
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(PORT, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${PORT}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const sl = ms => new Promise(o => setTimeout(o, ms));

  /* ── 관리자 ── */
  const studio = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/^https:\/\/api\.anthropic\.com\//, async x => { if (x.request().method() === 'OPTIONS') return x.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } }); const b = x.request().postData() || ''; (o.calls || []).push(b);
      if (o.fail) return x.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'Internal' } }) });
      x.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: '문서 기준 마감일은 12월 5일입니다 [1].' }], usage: { input_tokens: 9, output_tokens: 9 } }) }); });
    await p.goto(base + '/index.html'); await p.waitForFunction(() => typeof createOrg === 'function');
    await p.evaluate(([t, k]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = false; if (k) localStorage.setItem('didisam.claude', JSON.stringify({ key: k, model: 'claude-haiku-5-5', chat: true, docs: true, site: true, mv: 2 })); createOrg(t, '디디 기관'); }, [o.type || 'corp', o.key || '']);
    await p.waitForFunction(() => !document.querySelector('#app .gen'), null, { timeout: 9000 }).catch(() => { }); await p.waitForTimeout(900); await p.evaluate(k => { try { closeModal(); } catch (e) { } if (k) try { CL.set({ key: k, model: 'claude-haiku-5-5', chat: true, docs: true, site: true }); } catch (e) { } }, o.key || '');
    return { ctx, p, errs }; };

  /* A. 발송 계획 카드 재확인 */
  { const { ctx, p, errs } = await studio(); const r = await p.evaluate(async () => { const sl = ms => new Promise(o => setTimeout(o, ms)); CUR = { ws: MENU.message.ws, tab: 'message' }; render(); await sl(200);
      const ids = (S.members || []).slice(0, 3).map(m => m.id); const m = scxMsgPlan('학습 안내', '이번 주 학습을 마쳐 주세요.', ids, '시험 대상'); S.chat.push({ role: 'ai', ...m }); const n0 = (S.msgs || []).length;
      ACT['plan-ok']({ dataset: { v: m.plan } }); await sl(150); const modal1 = !!document.querySelector('#modal [data-mact="ok"], .mwrap [data-mact="ok"]'); const txt = ((document.querySelector('.mwrap .modal') || {}).textContent || '').replace(/\s+/g, ' '); const n1 = (S.msgs || []).length;
      const c = document.querySelector('.mwrap [data-mact="c"]'); if (c) c.click(); await sl(150); const n2 = (S.msgs || []).length; const still = !!PLANS[m.plan];
      ACT['plan-ok']({ dataset: { v: m.plan } }); await sl(150); const okb = document.querySelector('.mwrap [data-mact="ok"]'); if (okb) okb.click(); await sl(300);
      return { n: ids.length, modal1, txt, n0, n1, n2, still, n3: (S.msgs || []).length, done: S.chat.some(x => x.role === 'ai' && /^완료했습니다/.test(x.text || '') && /보냈습니다/.test(x.text || '')) }; });
    ok(r.n > 0 && r.modal1 && /발송/.test(r.txt), `발송 계획 카드: 승인 뒤 「실행 전 확인」 창(${r.txt.slice(0, 60)})`);
    ok(r.n1 === r.n0 && r.n2 === r.n0 && r.still, '확인 전 · 취소 뒤 메시지 0건 · 카드 그대로');
    ok(r.n3 === r.n0 + 1 && r.done, `확인하고 실행 → 1건 발송 · 완료 문구(${r.n0}→${r.n3})`);
    /* 발송이 없는 계획(공지)은 한 번 승인으로 실행 — 기존 흐름 유지 */
    const r2 = await p.evaluate(async () => { const sl = ms => new Promise(o => setTimeout(o, ms)); const m = scxPlan('시험', '시험 계획', () => { window.__ran = 1; return '실행'; }); S.chat.push({ role: 'ai', ...m }); ACT['plan-ok']({ dataset: { v: m.plan } }); await sl(150); return { ran: window.__ran === 1, modal: !!document.querySelector('.mwrap [data-mact="ok"]') }; });
    ok(r2.ran && !r2.modal, '발송 없는 계획 카드: 창 없이 실행(기존 그대로)');
    ok(!errs.length, `A pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* B. 문서 첨부 — 미연결 */
  const DOC = '사업 계획서\n\n1. 목적: 재직자 AI 활용 교육을 운영합니다.\n\n2. 일정: 신청 마감일은 12월 5일이며 교육은 12월 10일에 시작합니다.\n\n3. 담당: 김담당 010-1234-5678, plan@example.com\n\n4. 예산: 1,200만 원';
  { const { ctx, p, errs } = await studio(); const r = await p.evaluate(async doc => { const sl = ms => new Promise(o => setTimeout(o, ms));
      const msgs = await RG.add([new File([doc], '계획서.txt', { type: 'text/plain' })]); const d = RG.docs()[0]; const all = d.chunks.join('\n');
      const bad = await RG.add([new File(['a,b'], '표.xlsx', { type: 'application/vnd.ms-excel' })]);
      CUR = { ws: 'home', tab: '' }; render(); await sl(200); const before = S.chat.length; chatSend('첨부 문서에서 신청 마감일 알려줘'); await sl(700);
      const last = S.chat[S.chat.length - 1] || {}; let pdf = false, docx = false; try { pdf = !!(await RG.lib('vendor/pdf.min.js', 'pdfjsLib')); } catch (e) { } try { docx = !!(await RG.lib('vendor/mammoth.browser.min.js', 'mammoth')); } catch (e) { }
      return { msgs, masked: !/010-1234-5678|plan@example\.com/.test(all) && /\[전화번호 가림\]/.test(all) && /\[이메일 가림\]/.test(all), bad: bad.join(' '), added: S.chat.length - before, text: String(last.text || ''), note: String(last.note || ''), rg: (last.rg || []).length, pdf, docx,
        bar: !!document.querySelector('.composer .rg-att input[type=file]') }; }, DOC);
    ok(/조각으로 읽었습니다/.test(r.msgs.join(' ')) && r.masked, `첨부: 조각 저장 · 전화번호 · 이메일 가림(${r.msgs.join(' ')})`);
    ok(/지원하지 않는 형식/.test(r.bad), `지원하지 않는 형식(.xlsx) 안내 — ${r.bad.slice(0, 60)}`);
    ok(r.text.includes('12월 5일') && /Claude가 연결되지 않아/.test(r.note) && r.rg > 0, `미연결: 찾은 조각 + 연결 안내(지어낸 답 없음) — ${r.note.slice(0, 40)}`);
    ok(r.pdf && r.docx, 'pdf · docx 추출 라이브러리(같은 출처 vendor) 로드');
    ok(r.bar, '입력창 왼쪽 [문서 첨부]');
    ok(!errs.length, `B pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  /* B2. 문서 첨부 — 가짜 Claude */
  { const calls = []; const { ctx, p, errs } = await studio({ key: FAKE, calls }); const r = await p.evaluate(async doc => { const sl = ms => new Promise(o => setTimeout(o, ms)); await RG.add([new File([doc], '계획서.txt', { type: 'text/plain' })]);
      CUR = { ws: 'home', tab: '' }; render(); await sl(200); chatSend('첨부 문서에서 신청 마감일 알려줘'); for (let i = 0; i < 30 && S.chat.some(x => x.typing); i++) await sl(150);
      const last = S.chat[S.chat.length - 1] || {}; return { md: String(last.md || ''), via: String(last.via || ''), rg: (last.rg || []).length }; }, DOC);
    const body = calls.join('\n'); ok(calls.length >= 1 && /<sources>/.test(body) && /12월 5일/.test(body), `가짜 Claude 요청에 문서 근거(<sources>) 포함 — 호출 ${calls.length}회`);
    ok(!/010-1234-5678|plan@example\.com/.test(body), 'Claude로 보낸 본문에 원문 전화번호 · 이메일 없음');
    ok(/12월 5일/.test(r.md) && /문서 맥락/.test(r.via) && r.rg > 0, `답 · 출처 표시(${r.via})`);
    ok(!errs.length, `B2 pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  /* C. Claude 오류 → 규칙 엔진 + note */
  { const { ctx, p, errs } = await studio({ key: FAKE, fail: true }); const r = await p.evaluate(async () => { const sl = ms => new Promise(o => setTimeout(o, ms)); CUR = { ws: 'home', tab: '' }; render(); await sl(200);
      await chatSend('이번 주 운영 현황 요약해줘'); for (let i = 0; i < 40 && S.chat.some(x => x.typing); i++) await sl(150); const last = S.chat.filter(x => x.role === 'ai').pop() || {}; return { via: String(last.via || ''), note: String(last.note || ''), text: String(last.text || last.md || '').slice(0, 60) }; });
    ok(/규칙 엔진/.test(r.via + r.note) && /연결 실패/.test(r.note) && r.text.length > 3, `Claude 오류: 규칙 엔진 답 + 「Claude 연결 실패」 표시(${r.note.slice(0, 50)})`);
    ok(!errs.length, `C pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  /* ── 학습자 ── */
  const learner = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 1280, height: 860 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    if (o.site) await p.route(/learner-demo\.json/, x => x.fulfill({ status: 200, contentType: 'application/json', body: o.site() }));
    await p.addInitScript(([sid]) => { try { if (sid) sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); localStorage.setItem('didisam.app.instx', '1'); localStorage.setItem('didisam.app.classic', '1'); localStorage.setItem('didisam.cookie', '1'); } catch (e) { } }, [o.sid || '']);
    await p.goto(`${base}/learner.html?demo=1${o.h || '#home'}`, { waitUntil: 'load' }); await p.waitForFunction(() => typeof SITE === 'function' && SITE(), null, { timeout: 15000 }).catch(() => { }); await p.waitForTimeout(800);
    await p.evaluate(() => { const x = document.querySelector('[data-vis="later"]'); if (x) x.click(); });
    return { ctx, p, errs }; };
  const tuSite = tu => () => { const j = JSON.parse(RAW); j.tutor = { ...(j.tutor || {}), ...tu }; return JSON.stringify(j); };
  /* D. 하루 한도 */
  { const { ctx, p, errs } = await learner({ site: tuSite({ guestDaily: 0 }) }); const r = await p.evaluate(async () => { ltOpen(); await new Promise(o => setTimeout(o, 200)); const note = (document.querySelector('.lt-note') || {}).textContent || ''; await ltAsk('어떤 강좌가 있나요?'); const last = LT.msgs[LT.msgs.length - 1] || {}; return { note, t: String(last.t || ''), h: String(last.h || '') }; });
    ok(/0회 남음/.test(r.note) && !/10회 남음/.test(r.note), `방문자 0회 기관: 「오늘 0회 남음」(${r.note.match(/오늘 \d+회 남음/) || r.note.slice(-20)})`);
    ok(/로그인한 뒤에 쓸 수 있습니다/.test(r.t) && /#login/.test(r.h), '방문자 0회 기관: 질문하면 로그인 안내(서버 401과 같음)');
    ok(!errs.length, `D1 pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  { const { ctx, p, errs } = await learner({ site: tuSite({ guestDaily: undefined }) }); const r = await p.evaluate(async () => { ltOpen(); await new Promise(o => setTimeout(o, 200)); return (document.querySelector('.lt-note') || {}).textContent || ''; });
    ok(/10회 남음/.test(r), `방문자 한도 미설정: 기본 10회(${(r.match(/오늘 \d+회 남음/) || [''])[0]})`); ok(!errs.length, `D2 pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  { const { ctx, p, errs } = await learner({ sid: '20260001', site: tuSite({ daily: 3 }) }); const r = await p.evaluate(async () => { ltOpen(); for (let i = 0; i < 3; i++) await ltAsk('오늘 할 일 알려줘 ' + i); const note = (document.querySelector('.lt-note') || {}).textContent || ''; await ltAsk('하나 더 물어볼게요'); const last = LT.msgs[LT.msgs.length - 1] || {}; return { note, t: String(last.t || ''), h: String(last.h || '') }; });
    ok(/0회 남음/.test(r.note) && /오늘 질문 한도\(3회\)를 모두 썼습니다/.test(r.t) && /선생님께 질문 넘기기/.test(r.h), `로그인 학습자 하루 3회 소진: 한도 문구 + 질문 넘기기(${r.t.slice(0, 30)})`);
    ok(!errs.length, `D3 pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  /* E. 운영 모드 서버 오류 코드 */
  for (const [code, msg, src] of [['ai_month_quota', '이번 달 AI 사용량을 모두 썼어요', '이번 달 AI 사용량 소진'], ['trial_ended', '무료 체험 기간이 끝나', '무료 체험 종료']]) {
    const { ctx, p, errs } = await learner({ sid: '20260001' });
    await p.route(/\/api\/config$/, x => x.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true}' }));
    await p.route(/\/api\/pub\/[^/]+\/tutor$/, x => x.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: code, message: code === 'trial_ended' ? '' : '' }) }));
    await p.route(/\/api\/pub\/[^/]+\/(progress|events|lev)$/, x => x.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    const r = await p.evaluate(async () => { LR.mode = 'live'; LT.ai = true; ltOpen(); await ltAsk('이 개념이 잘 이해가 안 돼요'); const last = LT.msgs[LT.msgs.length - 1] || {}; return { t: String(last.t || ''), src: String(last.src || ''), h: String(last.h || '') }; });
    ok(r.t.includes(msg) && r.src === src && /선생님께 질문 넘기기/.test(r.h), `운영 ${code}: 사유를 답으로(${r.src} · ${r.t.slice(0, 30)})`);
    ok(!errs.length, `E ${code} pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  /* F. 힌트 사다리 운영 요청 본문 */
  { const siteOn = () => { const j = JSON.parse(RAW); j.aipol = { on: true, lvl: 'L1', retain: 'term', evalNotice: true }; const c = j.classes.find(x => x.id === 'c2'); const it = c.items.find(x => x.id === A1); it.ai = { lvl: 'L1', sol: true, solTxt: '정답 풀이' }; return JSON.stringify(j); };
    const { ctx, p, errs } = await learner({ sid: '20260001', site: siteOn, h: `#c/c2/${A1}` }); const bodies = [];
    await p.route(/\/api\/config$/, x => x.fulfill({ status: 200, contentType: 'application/json', body: '{"ai":true}' }));
    await p.route(/\/api\/pub\/[^/]+\/tutor$/, x => { bodies.push(JSON.parse(x.request().postData() || '{}')); x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '서버 힌트입니다. 어떤 비교가 필요한지 생각해 볼까요?', model: 'claude-haiku-5-5' }) }); });
    await p.route(/\/api\/pub\/[^/]+\/(progress|events|lev)$/, x => x.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    const TRY = '월별 매출 변화라서 시간 흐름을 보이려고 선 그래프로 그려 봤어요';
    const SX = '처음엔 시간 흐름이라 선 그래프를 골랐는데, 지역별 비교도 해야 해서 막대 그래프와 선 그래프를 나눠 그리는 방법을 생각했어요.';
    await p.evaluate(([TRY, SX]) => { const st = LV2.hintState('c2/itqb9j8fz'); st.step = 1; st.tries = [{ n: 1, len: 30, at: '', s: 1 }]; st.last = TRY; LR.mode = 'live'; LT.ai = true; ltOpen(); }, [TRY, SX]); await p.waitForTimeout(250);
    const lad = async () => { if (!(await p.$('.v2-lad'))) { const b = p.locator('[data-v2="ladder"] >> visible=true').first(); if (await b.count()) await b.click(); else if (await p.$('#l47Fab')) { await p.click('#l47Fab'); await p.waitForTimeout(250); await p.locator('[data-v2="ladder"] >> visible=true').first().click(); } await p.waitForTimeout(250); } };
    await lad(); await p.click('.v2-st.nx [data-v2="open"]'); await p.waitForTimeout(500);
    const b2 = bodies[bodies.length - 1] || {}; ok(b2.hint && b2.hint.step === 2 && b2.hint.attempt === TRY && b2.item && b2.item.lvl === 'L1', `2단계 요청: hint.attempt = 시도 글(${JSON.stringify(b2.hint || {}).slice(0, 60)})`);
    await p.evaluate(([TRY, SX]) => { const st = LV2.hintState('c2/itqb9j8fz'); st.step = 4; st.tries.push({ n: 2, len: 40, at: '', s: 4 }); st.selfExp = true; st.sx = SX; ltRender(); }, [TRY, SX]); await p.waitForTimeout(200); await lad();
    await p.click('.v2-st.nx [data-v2="open"]'); await p.waitForTimeout(500);
    const b5 = bodies[bodies.length - 1] || {}; ok(b5.hint && b5.hint.step === 5 && b5.hint.selfExp === true && b5.hint.attempt === SX, `5단계 요청: selfExp + 자기 설명(${JSON.stringify(b5.hint || {}).slice(0, 50)})`);
    const L2 = await p.evaluate(() => [LV2.canOpen({ step: 1, tries: [] }, 2, 'L2', {}), LV2.canOpen({ step: 1, tries: [] }, 2, 'L1', {}), LV2.canOpen({ step: 0, tries: [] }, 2, 'L2', {})]);
    ok(L2[0] === '' && /먼저 내 생각/.test(L2[1]) && /앞 단계/.test(L2[2]), `L2 시도 잠금 없음 · L1은 잠금 · 순서는 유지(${L2.map(x => x || '열림').join(' / ')})`);
    ok(!errs.length, `F pageerror 0 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
