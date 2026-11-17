'use strict';
/* v43.6 셀프러닝 노트 · AI 튜터(lnote-ai.js) — 통합 명세 FINAL D2(S07 S05 훅 S08 S08b S13 S20) + 추가 지시 1(주간 돌아보기 · 질문 → 노트)
   사용: node tests/ui/note436-ai.js   (정적 서버는 이 스크립트 안에서 띄우고 끈다, 포트 9522) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const PORT = 9522;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const SHOT = process.env.SHOT_DIR || '';
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(PORT, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${PORT}`; const br = await chromium.launch();
  const learner = async (demo, sid, app, hash = 'home', theme) => { const ctx = await br.newContext({ viewport: { width: app ? 390 : 1280, height: app ? 844 : 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(([sid, app, theme]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); if (app) localStorage.setItem('didisam.app.instx', '1'); localStorage.setItem('didisam.lnote.noseed', '1'); if (theme) localStorage.setItem('didisam.theme', theme); } catch (e) { } }, [sid, app, theme]);
    await p.goto(`${base}/learner.html?demo=${demo}${app ? '&app=1' : ''}#${hash}`); await p.waitForTimeout(1200); return { ctx, p, errs }; };
  const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(350); };
  /* 390 관문: 가로 넘침 · 13px 미만 글자 · 44px 미만 누르는 칸(이 파일이 그린 부품만) */
  const gate = (p, sel) => p.evaluate(sel => { const R = { over: document.documentElement.scrollWidth > innerWidth + 1, small: [], tiny: [] }; document.querySelectorAll(sel).forEach(root => { root.querySelectorAll('*').forEach(e => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return; const t = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (t && parseFloat(getComputedStyle(e).fontSize) < 13) R.small.push(e.className + ':' + e.textContent.trim().slice(0, 20)); if (e.matches('button, a, input, select, textarea, [role=switch]')) { const b = e.getBoundingClientRect(); if (b.width && b.height < 43.5) R.tiny.push((e.className || e.tagName) + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16) + ':' + Math.round(b.height)); } }); }); return R; }, sel);

  /* ── 1. 앱(학원 성인) — 홈 카드 · 레슨 튜터 칩 · 초안 · 퀴즈 오답 · 오답노트 확인 · 영상 시트 · 주간 · 질문 → 노트 ── */
  { const { ctx, p, errs } = await learner('adult', '20269000', 1);
    ok(await p.evaluate(() => !!window.LNOTE && !!window.LNOTE_AI && ['weekly', 'weeklyDraft', 'qaToNote', 'diffLines', 'orig', 'hint', 'suggestCards', 'openYt'].every(k => typeof LNOTE_AI[k] === 'function')), 'LNOTE_AI 훅 노출');
    ok(await p.evaluate(() => { const t = document.querySelector('.ln-today'); const g = document.querySelector('.tb-goal'); return !!t && !!g && !!(g.compareDocumentPosition(t) & 4) && /나만의 노트를 시작해요/.test(t.textContent) && !/\b0(개|장)/.test(t.textContent); }), 'S13 홈: 처음 변형이 오늘 목표 아래(숫자 0 없음)');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ai-home-first.png') });
    { const g = await gate(p, '.ln-today'); ok(!g.over && !g.small.length && !g.tiny.length, '390 홈 카드 관문 ' + JSON.stringify(g)); }
    /* 레슨 영상 화면 → 튜터 칩 */
    const L = await p.evaluate(() => { const st = myStats(); const x = st.courses.find(y => y.next && y.next.type === 'video') || st.courses[0]; const c = x.c; const v = c.items.find(i => i.type === 'video'); const q = c.items.find(i => /quiz|exam/.test(i.type) && (i.qs || []).some(z => z.t === 'mc' || z.t === 'ox')); return { cid: c.id, vid: v && v.id, qid: q && q.id }; });
    ok(!!L.vid && !!L.qid, '시연 과정에 영상 · 퀴즈 레슨 ' + JSON.stringify(L));
    await go(p, `#c/${L.cid}/${L.vid}`); await p.evaluate(() => ltOpen()); await p.waitForTimeout(250);
    ok(await p.evaluate(() => { const b = document.querySelector('.lt-chip.ln-mk'); return !!b && b.dataset.v === '이 레슨 노트로 정리' && document.querySelectorAll('.lt-panel .lt-chip.ln-mk').length === 1; }), 'S07 레슨: 짙은 칩 「이 레슨 노트로 정리」 1개');
    const n0 = await p.evaluate(() => LNOTE.all().length);
    await p.click('.lt-panel .lt-chip.ln-mk'); await p.waitForTimeout(300);
    ok(await p.evaluate(n0 => { const d = [...document.querySelectorAll('.ln-tdraft')].pop(); return !!d && d.querySelectorAll('li').length >= 3 && d.querySelectorAll('li').length <= 5 && /튜터 초안/.test(d.textContent) && /확인 전/.test(d.textContent) && LNOTE.all().length === n0; }, n0), 'S07 답변 안 초안(3~5줄 · 「확인 전」) — 아직 저장 안 함');
    ok(await p.evaluate(() => /튜터가 만든 초안이에요\. 내 말로 고쳐서 저장해 주세요\./.test(document.querySelector('.lt-th').textContent)), '초안 안내 문구 원문');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ai-tutor-chip.png') });
    /* 버리기 → 저장 없음 */
    await p.click('.ln-tdraft [data-lna=discard]'); await p.waitForTimeout(200);
    ok(await p.evaluate(n0 => LNOTE.all().length === n0 && /초안을 버렸어요/.test(document.querySelector('.lt-th').textContent), n0), '「버리기」 = 저장 없음');
    /* 다시 만들어 「확인 · 고치기」 → st:draft 저장 + 개발자 1 편집 시트(초안 모드)로 */
    await p.click('.lt-panel .lt-chip.ln-mk'); await p.waitForTimeout(300); await p.click('.ln-tdraft:last-of-type [data-lna=edit]'); await p.waitForTimeout(400);
    const D = await p.evaluate(() => { const n = LNOTE.all().find(x => x.src === 'tutor'); return n && { id: n.id, st: n.st, b: n.b, hash: location.hash, orig: LNOTE_AI.orig(n.id), lid: n.lid }; });
    ok(D && D.st === 'draft' && D.hash === '#notes/' + D.id && D.orig === D.b && D.lid === L.vid, '「확인 · 고치기」 → st:draft 저장 · #notes/<id>(초안 모드) · 레슨 연결');
    ok(await p.evaluate(id => { const o = LNOTE_AI.orig(id); const a = LNOTE_AI.diffLines(o, o); const b = LNOTE_AI.diffLines(o, o + '\n- 피벗은 내가 정리한 한 줄'); const c = LNOTE_AI.diffLines(o, o.replace(/^- (.*)$/m, '- $1 — 예: 매출 합계')); return a.mine === 0 && b.mine === 1 && c.mine === 1 && b.lines.some(x => x.k === 'ai'); }, D.id), 'S05 diffLines: 원문 0 · 새 줄 1 · 고친 줄 1');
    ok(await p.evaluate(id => { const h = LNOTE_AI.hint(id); return typeof h === 'string' && h.length > 5 && !/정답은/.test(h); }, D.id), 'S05 튜터 점검(정답 문장 없음)');
    ok(await p.evaluate(id => { const K = LNOTE_AI.suggestCards(id); return Array.isArray(K) && K.length >= 1 && K.length <= 3 && K.every(k => k.f && k.f.length <= 120 && k.k.length <= 240); }, D.id), 'S04 「튜터에게 더 뽑아 달라기」 suggestCards 1~3장');
    ok(await p.evaluate(() => { const K = LNOTE_AI.suggest('- 피벗 테이블이란? 표를 요약하는 도구\n- **값 필드** 기본은 합계'); return K.length === 2 && /피벗 테이블이란\?/.test(K[0].f) && /표를 요약/.test(K[0].k); }), '본문 규칙 카드: 「질문? 답」 · **굵게**');

    /* S08 과정 퀴즈 — 모두 틀리게 제출 */
    await go(p, `#c/${L.cid}/${L.qid}`);
    const Q = await p.evaluate(qid => { const c = SITE().classes.find(x => x.items.some(i => i.id === qid)); const it = c.items.find(i => i.id === qid); return it.qs.map((q, k) => ({ k, t: q.t, a: String(q.a), n: q.t === 'ox' ? 2 : (q.opts || []).length })); }, L.qid);
    const FQ = async () => (await p.$('#a2qz')) ? '#a2qz' : '#qz'; const answerWrong = async () => { const F = await FQ(); for (const q of Q) { if (q.t === 'mc') { const v = String((+q.a + 1) % q.n); await p.check(`${F} input[name=q${q.k}][value="${v}"]`); } else if (q.t === 'ox') { await p.check(`${F} input[name=q${q.k}][value="${q.a.toUpperCase() === 'O' ? 'X' : 'O'}"]`); } else await p.fill(`${F} [name=q${q.k}]`, '모름'); } await p.click(`${F} [type=submit]`); await p.waitForTimeout(400); };
    await answerWrong(); const nW = Q.filter(q => q.t === 'mc' || q.t === 'ox').length;
    const W1 = await p.evaluate(() => ({ notes: LNOTE.all().filter(n => n.src === 'quiz' && n.st === 'draft').length, cards: LNOTE.cards().filter(c => c.src === 'quiz').length, qr: !!document.querySelector('.lna-qr'), rows: document.querySelectorAll('.lna-qr .lna-ql li.no').length, sol: document.querySelectorAll('.a2lsol li.ng .st-draft').length, box: /오답노트 초안 \d+개가 생겼어요/.test((document.querySelector('.lna-qr .ln-wrongbox') || {}).textContent || ''), b: (LNOTE.all().find(n => n.src === 'quiz') || {}).b || '' }));
    ok(W1.notes === nW && W1.cards === nW, `S08 틀린 ${nW}문항 → 오답 초안 ${W1.notes}개 · 카드 ${W1.cards}장(src quiz)`);
    ok(W1.qr && (W1.rows === nW || W1.sol === nW) && W1.box, 'S08 결과 화면: 머리 카드 · 문항 줄 ✕ · .ln-wrongbox');
    ok(/^\*\*문제\*\* .+\n\*\*내 답\*\* .+\n\*\*정답\*\* .+/.test(W1.b), '오답 본문 형식(문제 · 내 답 · 정답)');
    if (SHOT) { await p.evaluate(() => document.querySelector('.lna-qr').scrollIntoView({ block: 'start' })); await p.waitForTimeout(900); await p.screenshot({ path: path.join(SHOT, 'ai-quiz-result.png') }); }
    { const g = await gate(p, '.lna-qr'); ok(!g.over && !g.small.length && !g.tiny.length, '390 퀴즈 결과 관문 ' + JSON.stringify(g)); }
    /* 같은 문항을 또 틀림 → 새 노트 없이 「다시 틀림 2회」(0-7: 앞면 정규화 비교) */
    if (await p.$('#a2qz, #qz')) { await p.evaluate(() => document.querySelector('#a2qz, #qz').reset()); await answerWrong(); }
    else await p.evaluate(qid => { const c = SITE().classes.find(x => x.items.some(i => i.id === qid)); const it = c.items.find(i => i.id === qid); it.qs.forEach(q => { if (q.t === 'mc' || q.t === 'ox') LNOTE_AI.recordWrong(c, it, q, '모름'); }); }, L.qid);
    ok(await p.evaluate(nW => { const Q = LNOTE.all().filter(n => n.src === 'quiz'); return Q.length === nW && Q.every(n => /\*\*다시 틀림\*\* 2회/.test(n.b)) && LNOTE.cards().filter(c => c.src === 'quiz').length === nW; }, nW), '중복 오답 = 기존 노트 「다시 틀림 2회」 · 카드 늘지 않음');
    ok(await p.evaluate(() => LNOTE_AI.norm('1. 피벗 테이블,  무엇?') === LNOTE_AI.norm('피벗테이블 무엇')), '정규화(번호 · 공백 · 문장부호)');
    /* 튜터 칩이 퀴즈 결과에서는 「오답노트 확인하기」 */
    await p.evaluate(() => { ltOpen(); }); await p.waitForTimeout(200);
    ok(await p.evaluate(() => (document.querySelector('.lt-panel .lt-chip.ln-mk') || {}).dataset?.v === '오답노트 확인하기'), 'S07 퀴즈 결과: 칩 「오답노트 확인하기」');
    await p.evaluate(() => { LT.open = false; ltRender(); });
    /* S08b 오답노트 확인 */
    await p.click('.lna-qr [data-lna=wrong].lna-b.p, .lna-qr .lna-qf [data-lna=wrong]'); await p.waitForTimeout(300);
    ok(await p.evaluate(nW => { const s = document.getElementById('lnaWrong'); return !!s && new RegExp(`1 / ${nW}`).test(s.textContent) && document.getElementById('lnaWhyT').value === ''; }, nW), 'S08b 열림: 「1 / n」 · 「왜 틀렸을까요?」 빈 칸 시작');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ai-wrong-note.png') });
    { const g = await gate(p, '#lnaWrong'); ok(!g.over && !g.small.length && !g.tiny.length, '390 오답노트 확인 관문 ' + JSON.stringify(g)); }
    await p.click('#lnaWrong [data-lna=wok]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => /한 줄을 내 말로/.test(document.getElementById('lnaWW').textContent) && LNOTE.all().filter(n => n.src === 'quiz' && n.st === 'ok').length === 0), '이유를 안 쓰면 확인 안 됨(대필 방지)');
    await p.fill('#lnaWhyT', '합계와 개수를 헷갈렸어요'); await p.click('#lnaWrong [data-lna=reason][data-v="개념 헷갈림"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.getElementById('lnaWhyT').value === '합계와 개수를 헷갈렸어요'), '이유 칩을 눌러도 쓴 글 유지');
    await p.click('#lnaWrong [data-lna=wok]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const n = LNOTE.all().find(x => x.src === 'quiz' && x.st === 'ok'); const c = n && LNOTE.cards().find(k => k.nid === n.id); return !!n && /\*\*왜 틀렸나\*\* 합계와 개수를 헷갈렸어요/.test(n.b) && n.tags.includes('개념헷갈림') && n.src === 'quiz' && c && /헷갈렸어요/.test(c.k); }), 'S08b 확인: st ok · 「왜 틀렸나」 · 태그 #개념헷갈림 · 카드 뒷면에 이유');
    if (nW > 1) { await p.click('#lnaWrong [data-lna=wskip]'); await p.waitForTimeout(150); }
    await p.evaluate(() => { if (document.getElementById('lnaWrong')) document.querySelector('#lnaWrong [data-lna=wclose]').click(); });

    /* S13 홈 — 복습 · 초안 있음 */
    await p.evaluate(() => { const c = LNOTE.cards()[0]; LNOTE.saveCard({ id: c.id, due: LNOTE.today() }); }); await go(p, '#home'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => { const t = document.querySelector('.ln-today'); return !!t && /오늘의 셀프러닝/.test(t.textContent) && /복습 카드 1장/.test(t.textContent) && /확인할 초안 \d+개/.test(t.textContent) && t.querySelectorAll('.ft .lna-b').length === 1 && /복습 1장 시작하기/.test(t.querySelector('.ft').textContent) && (document.querySelector('.tb-gl strong') || {}).textContent === '복습 1장이면 오늘 목표를 채워요'; }), 'S13 복습 있음: 줄 3개 · 버튼 하나(복습 우선) · 목표 문구');
    ok(await p.evaluate(() => !/윤서아|20269000/.test(document.querySelector('.ln-today').textContent)), '홈 카드에 이름 · 학번 없음');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ai-home-today.png') });
    ok(await p.evaluate(() => { ltOpen(); return (document.querySelector('.lt-panel .lt-chip.ln-mk') || {}).dataset?.v === '오늘 복습 시작'; }), 'S07 홈(복습 있음): 칩 「오늘 복습 시작」');
    await p.click('.lt-panel .lt-chip.ln-mk'); await p.waitForTimeout(300); ok(await p.evaluate(() => /^#notes\/review/.test(location.hash)), '「오늘 복습 시작」 → #review');
    await go(p, '#home');

    /* 보통 답변 아래 흰 칩 「노트로 남기기 · 카드 1장」 */
    await p.evaluate(() => { ltOpen(); LT.msgs.push({ me: 1, t: '피벗 값 필드 기본 계산은?' }, { t: '값 필드에 숫자 열을 넣으면 기본으로 합계를 계산합니다. 개수나 평균으로 바꿀 수 있습니다.', src: '기본 안내' }); ltRender(); }); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !!document.querySelector('.lt-th .lna-keep [data-lna=keep]') && !!document.querySelector('.lt-th .lna-keep [data-lna=kcard]')), '답변 아래 「노트로 남기기 · 카드 1장」');
    const k0 = await p.evaluate(() => LNOTE.cards().length); await p.click('.lt-th .lna-keep [data-lna=kcard] >> nth=-1'); await p.waitForTimeout(150);
    ok(await p.evaluate(k0 => LNOTE.cards().length === k0 + 1 && !!document.querySelector('.lna-toast [data-lna=undo]'), k0), '「카드 1장」 → 카드 + 되돌리기 토스트');
    await p.click('.lna-toast [data-lna=undo]'); await p.waitForTimeout(100); ok(await p.evaluate(k0 => LNOTE.cards().length === k0, k0), '되돌리기 → 카드 삭제');
    await p.evaluate(() => { LT.open = false; ltRender(); });

    /* S20 영상으로 노트 만들기 */
    await p.evaluate(() => LNOTE_AI.openYt()); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const s = document.getElementById('lnaYt'); return !!s && /영상 내용은 읽지 않아요\. 제목과 내 메모로 초안을 만들어요\. 내 YouTube 계정 · 시청 기록은 쓰지 않아요\./.test(s.textContent); }), 'S20 시트 · 정직 문구');
    await p.fill('#lnaYu', 'https://example.com/v'); await p.click('#lnaYt [data-lna=ymk]'); await p.waitForTimeout(100);
    ok(/YouTube 영상 주소를 넣어 주세요/.test(await p.textContent('#lnaYe')), 'S20 잘못된 주소 거절');
    await p.fill('#lnaYu', 'https://youtu.be/R7q0r_YD0a4'); await p.waitForTimeout(100); await p.fill('#lnaYtt', '피벗 테이블 기초'); await p.click('#lnaYt [data-lna=ymk]'); await p.waitForTimeout(100);
    ok(/기억할 것을 한 줄 이상/.test(await p.textContent('#lnaYe')), 'S20 메모 필수');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ai-yt-sheet.png') });
    { const g = await gate(p, '#lnaYt'); ok(!g.over && !g.small.length && !g.tiny.length, '390 영상 시트 관문 ' + JSON.stringify(g)); }
    await p.fill('#lnaYm', '값 필드는 기본이 합계예요.\n원본을 고치면 새로 고침해야 해요.'); await p.click('#lnaYt [data-lna=ymk]'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => { const n = LNOTE.all().find(x => x.src === 'yt'); const K = n ? LNOTE.cards().filter(c => c.nid === n.id) : []; return !!n && n.st === 'draft' && /\*\*핵심\*\*/.test(n.b) && /\*\*질문\*\*/.test(n.b) && /\*\*내 생각\*\*/.test(n.b) && /youtu\.be/.test(n.b) && K.length === 3 && location.hash === '#notes/' + n.id && !document.getElementById('lnaYt'); }), 'S20 영상 노트 초안(핵심 · 질문 · 내 생각) + 카드 3장 → 초안 모드');

    /* 추가 지시 1: 주간 돌아보기 · 이번 주 정리 노트 · 질문 → 노트 */
    const W = await p.evaluate(() => LNOTE_AI.weekly()); ok(W && ['lessons', 'notes', 'cards', 'asks', 'days', 'from', 'to'].every(k => k in W) && W.notes >= 3 && W.from <= W.to, '주간 수치 ' + JSON.stringify({ l: W.lessons, n: W.notes, c: W.cards, a: W.asks }));
    ok(await p.evaluate(() => { const c = LNOTE.cards().find(x => x.src === 'quiz'); LNOTE.grade(c.id, 2); return LNOTE_AI.weekly().cards >= 1; }), '주간 복습 수 = 이번 주 채점한 카드');
    await go(p, '#notes?t=log'); await p.waitForTimeout(300); /* 통합: 주간 카드 자리 = 「기록」 탭(FINAL S24) */
    ok(await p.evaluate(() => !!document.querySelector('#lm .lna-week, #lm [data-ln-weekly]')), '#notes 허브에 주간 돌아보기(개발자 1 자리 없으면 감싸서)');
    ok(await p.evaluate(() => { const w = document.querySelector('#lm .ln-week'); return !!w && /이번 주 · \d+월 \d+일 ~ /.test(w.textContent) && w.querySelectorAll('.kp > div').length === 4 && w.querySelectorAll('.wk span').length === 7 && /이번 주 정리 노트 만들기/.test(w.textContent); }), 'S24 주간 카드: 눈썹 · 타일 4 · 7일 막대 · 「이번 주 정리 노트 만들기」');
    if (SHOT) { await p.evaluate(() => document.querySelector('#lm .ln-week').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOT, 'ai-weekly.png') }); }
    { const g = await gate(p, '#lm .ln-week'); ok(!g.over && !g.small.length && !g.tiny.length, '390 주간 카드 관문 ' + JSON.stringify(g)); }
    await p.click('#lm .ln-week [data-lna=weekly]'); await p.waitForTimeout(400);
    const wn = await p.evaluate(() => { const n = LNOTE.all().find(x => x.tags.includes('주간정리')); return n && { id: n.id, st: n.st, src: n.src, t: n.t, b: n.b, orig: LNOTE_AI.orig(n.id) === n.b, hash: location.hash, again: LNOTE_AI.weeklyDraft().id === n.id }; });
    ok(wn && wn.st === 'draft' && wn.src === 'tutor' && /^\d+월 \d주 정리$/.test(wn.t) && /이번 주: 레슨 \d+개 · 노트 \d+개 · 복습 \d+장 · 질문 \d+개/.test(wn.b) && /틀린 문제: /.test(wn.b) && /남긴 노트: /.test(wn.b) && /배운 것: \(내 말로 한 줄\)/.test(wn.b) && wn.orig && wn.hash === '#notes/' + wn.id && wn.again, '「이번 주 정리 노트」 초안(제목 n월 n주 정리 · 레슨 · 노트 · 틀린 문제) → 초안 모드 · 한 주에 하나 ' + JSON.stringify(wn && wn.t));
    ok(await p.evaluate(() => /이번 주 정리 노트 보기/.test(LNOTE_AI.weeklyHTML())), '이미 만들었으면 「이번 주 정리 노트 보기」');
    const qn = await p.evaluate(() => { LR.lp.tutor = LR.lp.tutor || {}; LR.lp.tutor.ask = [{ id: 'qx1', q: '피벗에서 개수로 바꾸려면?', cid: '', where: '엑셀 실무 마스터', at: new Date().toISOString() }]; LR.mine = LR.mine || {}; LR.mine.qa = [{ id: 'qx1', q: '피벗에서 개수로 바꾸려면?', a: '값 필드 설정에서 개수를 고르세요.' }]; const pre = LNOTE_AI.qaNote('qx1'); const n = LNOTE_AI.qaToNote('qx1'); const again = LNOTE_AI.qaToNote('qx1'); return n && { pre, st: n.st, src: n.src, b: n.b, tags: n.tags, same: again && again.id === n.id, seen: LNOTE_AI.qaNote('qx1').id === n.id, none: LNOTE_AI.qaToNote('zz') === null, w: LNOTE_AI.weekly().asks, card: LNOTE_AI.suggestCards(n.id).some(k => /개수/.test(k.f)) }; });
    ok(qn && qn.pre === null && qn.st === 'draft' && qn.src === 'me' && /^\*\*질문\*\* 피벗에서 개수로/.test(qn.b) && /\*\*답\*\* 값 필드 설정/.test(qn.b) && /원래 자리: AI 튜터/.test(qn.b) && qn.tags.includes('질문') && qn.same && qn.seen && qn.none && qn.w === 1 && qn.card, 'S23 질문 + 받은 답 → 노트 초안(src me · 원래 자리) · 옮긴 노트 보기 · 카드 제안');
    ok(await p.evaluate(() => { const n = LNOTE_AI.moveToNote({ kind: '댓글', q: '저도 같은 부분이 헷갈렸어요', where: '수강생 라운지' }); return n && n.tags[0] === '댓글' && /^\*\*댓글\*\* /.test(n.b) && !/\*\*답\*\*/.test(n.b); }), '댓글 → 노트로 옮기기(moveToNote)');
    /* 추가 2: 피드백 → 「다음에 고칠 점」 노트 · 약한 단원 */
    const fb = await p.evaluate(cid => { LR.mine.cls = LR.mine.cls || {}; LR.mine.cls[cid] = { ...(LR.mine.cls[cid] || {}), score: 82, fb: '20269000 학습자의 보고서는 구조가 좋습니다. 피벗 결과의 근거 설명이 부족합니다. 표 제목을 더 구체적으로 써 보세요.' }; const n = LNOTE_AI.fbToNote(cid, 'cls', '', { open: true }); const again = LNOTE_AI.fbToNote(cid, 'cls', ''); const C = LNOTE_AI.fbCands(n.id); const ai = LNOTE_AI.fbToNote(cid, 'ai', '', { text: '도입부가 길어요. 핵심 문장을 앞으로 옮기면 좋아요.' });
      return { st: n.st, src: n.src, tags: n.tags, b: n.b, hash: location.hash === '#notes/' + n.id, same: again.id === n.id, C, ai: ai && ai.tags.includes('AI피드백') && /AI 피드백/.test(ai.b), none: LNOTE_AI.fbToNote(cid, 'bk', 'zz') === null }; }, L.cid);
    ok(fb.st === 'draft' && fb.src === 'me' && fb.tags[0] === '피드백' && /^\*\*받은 피드백\*\*\(교수자 · 점수 82\)/.test(fb.b) && /\*\*내가 고칠 점\*\*\n- \[ \] \n\*\*다음 과제에서 확인\*\*/.test(fb.b) && /원래 자리: /.test(fb.b) && fb.hash && fb.same && fb.none, '피드백 → 노트 초안(받은 피드백 · 빈 고칠 점 · 다음 과제에서 확인) · 중복 없음');
    ok(!/20269000/.test(fb.b) && fb.C.length >= 1 && fb.C.some(x => /부족|구체/.test(x)) && !fb.b.includes('- [ ] 피벗'), '피드백: 학번 지움 · 고칠 점 후보만 제안(본문에 넣지 않음)');
    ok(fb.ai, 'AI 피드백은 「AI 피드백」으로 구분');
    ok(await p.evaluate(cid => { const W = LNOTE_AI.weakLessons(cid); return W.length >= 1 && W[0].wrong >= 2 && /^#notes\/review\?n=n/.test(W[0].href) && W[0].title && W.every((x, i) => !i || W[i - 1].wrong >= x.wrong); }, L.cid), '약한 단원: 틀린 수 순 · 「이 단원 카드로 복습」 링크(#review?n=)');
    ok(await p.evaluate(() => !/20269000/.test(JSON.stringify(LR.lp.notes))), '노트 데이터에 학번 없음');
    ok(!errs.length, '앱 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* ── 2. 다크 · 앱 홈 / 오답 시트 ── */
  { const { ctx, p, errs } = await learner('adult', '20269002', 1, 'home', 'dark');
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' && getComputedStyle(document.querySelector('.ln-today')).backgroundColor !== 'rgb(255, 255, 255)'), '다크: 홈 카드 면이 흰색이 아님');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ai-home-dark.png') });
    ok(!errs.length, '다크 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* ── 3. 웹 1280 — 학습 허브 홈 카드 · 튜터 칩 ── */
  { const { ctx, p, errs } = await learner('adult', '20269003', 0);
    ok(await p.evaluate(() => !!document.querySelector('#lm .ln-today')), '웹 학습 허브: 「오늘의 셀프러닝」 카드');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ai-web-home.png') });
    ok(!errs.length, '웹 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* ── 4. 대학 학습자 — 같은 기능 · 학번 없음 ── */
  { const { ctx, p, errs } = await learner('1', '20260001', 1);
    ok(await p.evaluate(() => !!document.querySelector('.ln-today') || !document.querySelector('.tb-goal')), '대학: 홈 카드(목표 카드가 있으면 그 아래)');
    const r = await p.evaluate(async () => { const st = myStats(); const x = st.courses.find(y => y.c.items.some(i => i.type === 'video')); if (!x) return null; const v = x.c.items.find(i => i.type === 'video'); location.hash = `#c/${x.c.id}/${v.id}`; await new Promise(o => setTimeout(o, 300)); const d = await LNOTE_AI.lessonDraft(); LNOTE_AI.openDraft(d); const n = LNOTE.get(d.nid); return n && JSON.stringify(n); });
    ok(r && !/20260001/.test(r), '대학: 튜터 초안에 학번 없음');
    ok(!errs.length, '대학 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  await br.close(); srv.close(); console.log(`note436-ai: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
