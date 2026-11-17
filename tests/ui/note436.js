'use strict';
/* v43.6 셀프러닝 노트(lnote.js) — 허브 · 편집 · 저장 · 삭제 · 태그 · 검색 · 복습 · 390 넘침 · 대학 학습자 · 데이터 제한 · 레슨 미니 패널 · 진입점
   사용: node tests/ui/note436.js  (정적 서버를 스크립트 안에서 띄웠다 끔, 포트 9511 — 쓰이고 있으면 빈 포트) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const SHOT = process.env.NOTE_SHOT || ''; /* 캡처 폴더(저장소 밖) — 비우면 찍지 않음 */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(o => { srv.once('error', () => srv.listen(0, '127.0.0.1', o)); srv.listen(9511, '127.0.0.1', o); });
  const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const open = async ({ demo = 'adult', sid = '20269000', app = true, hash = 'notes', seed = false, w } = {}) => {
    const ctx = await br.newContext({ viewport: { width: w || (app ? 390 : 1280), height: app ? 844 : 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(([sid, app, seed]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); if (app) localStorage.setItem('didisam.app.instx', '1'); if (!seed) localStorage.setItem('didisam.lnote.noseed', '1'); } catch (e) { } }, [sid, app, seed]);
    await p.goto(`${base}/learner.html?demo=${demo}${app ? '&app=1' : ''}#${hash}`); await p.waitForTimeout(1100); return { ctx, p, errs }; };
  const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(250); };
  const shot = async (p, n) => { if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await p.screenshot({ path: path.join(SHOT, n + '.png') }); } };
  /* 390 관문: 가로 넘침 · 13px 미만 글자 · 44px 미만 누르는 칸(노트 화면 안) */
  const gate = (p, sel) => p.evaluate(sel => { const R = { over: document.documentElement.scrollWidth > innerWidth + 1, small: [], tiny: [] };
    document.querySelectorAll(sel).forEach(root => root.querySelectorAll('*').forEach(e => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return; const cs = getComputedStyle(e); const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (own && parseFloat(cs.fontSize) < 13 && cs.visibility !== 'hidden' && !e.closest('.sr')) R.small.push(e.className + ':' + e.textContent.trim().slice(0, 12) + ':' + cs.fontSize);
      if (e.matches('button, a[href], input:not([type=hidden]), select, textarea, [role=button]') && !e.closest('.sr') && !e.classList.contains('ln-dim') && !e.closest('.ln-chk')) { const b = e.getBoundingClientRect(); if (b.width && b.height && (b.height < 43.5 || b.width < 43.5) && !e.matches('.ln-card *')) R.tiny.push(e.className + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 14) + ':' + Math.round(b.width) + 'x' + Math.round(b.height)); }
      const b = e.getBoundingClientRect(); if (b.right > innerWidth + 1 && cs.position !== 'fixed' && !e.closest('.ln-chips, .pins')) R.small.push('잘림 ' + e.className + ':' + Math.round(b.right)); })); return R; }, sel);

  /* 1. 학원 학습자 앱 390 — 빈 허브 → 새 노트(카드 제안) → 보기 → 고치기 → 태그 · 검색 → 삭제 · 되돌리기 */
  { const { ctx, p, errs } = await open();
    ok(await p.evaluate(() => typeof LNOTE === 'object' && ['all', 'get', 'save', 'del', 'cards', 'saveCard', 'delCard', 'due', 'grade', 'on', 'open', 'md'].every(k => typeof LNOTE[k] === 'function')), 'LNOTE 계약 API 전부');
    ok(!!(await p.$('.ln-empty')) && /아직 노트가 없어요/.test(await p.textContent('#lm')), '빈 허브: 사진 빈 상태 · 문장');
    ok(await p.evaluate(() => !/(^|\s)0(개|장)/.test(document.querySelector('.ln-hub').innerText)), '빈 허브: 숫자 0을 보이지 않음');
    ok(!!(await p.$('.ln-flow, .ln-nodes')), '빈 허브: 노트 → 카드 → 복습 흐름');
    await shot(p, 'app-empty'); { const g = await gate(p, '.ln-hub'); ok(!g.over && !g.small.length && !g.tiny.length, '390 빈 허브 관문 ' + JSON.stringify(g)); }
    let ev = 0; await p.evaluate(() => { window.__ev = 0; LNOTE.on(() => { window.__ev++; }); });
    await p.click('.ln-empty ~ .ln-ea [data-ln=new], .ln-ea [data-ln=new]'); await p.waitForTimeout(300);
    ok(/#notes\/new$/.test(p.url()) && !!(await p.$('#lnOv.sheet .ln-sheet')), '새 노트: 앱 하단 시트');
    await p.click('#lnSave'); ok(/제목을 한 줄/.test(await p.textContent('#lnOv .ln-err')), '빈 제목 저장 막음');
    await p.fill('#lnF [name=t]', '피벗 테이블 '.repeat(20)); ok((await p.inputValue('#lnF [name=t]')).length === 80, '제목 80자 제한(입력)');
    await p.fill('#lnF [name=t]', '피벗 테이블 정리');
    await p.fill('#lnF [name=b]', '- **값 요약**: 합계를 평균으로 바꿀 수 있어요\n- 행 영역에는 무엇을 넣나요? 범주 필드\n코드 `=SUM(A1:A3)` 와 a < b');
    await p.fill('#lnF [name=tags]', '피벗, 엑셀, 함수');
    ok(await p.getAttribute('[data-ln=kmsw]', 'aria-checked') === 'true', '새 노트: 카드 스위치 기본 켜짐'); await p.waitForTimeout(500);
    const sug = await p.$$eval('#lnF .kmk .fc input', x => x.map(i => i.value)); ok(sug.length >= 2 && sug.some(v => /행 영역/.test(v)) && sug.some(v => /값 요약/.test(v)), '카드 제안(질문? 답 · **굵게**) ' + JSON.stringify(sug));
    ok(/카드 \d장/.test(await p.textContent('#lnSave')), '저장 버튼에 카드 수');
    await shot(p, 'app-edit');
    { const g = await gate(p, '#lnOv'); ok(!g.over && !g.small.length && !g.tiny.length, '390 편집 시트 관문 ' + JSON.stringify(g)); }
    await p.click('#lnSave'); await p.waitForTimeout(400);
    const st = await p.evaluate(() => ({ A: LNOTE.all(), K: LNOTE.cards(), h: location.hash, ev: window.__ev, td: LNOTE.today() }));
    ok(st.A.length === 1 && st.A[0].st === 'ok' && st.A[0].src === 'me' && st.A[0].tags.join() === '피벗,엑셀,함수', '저장: 노트 1개(내가 · 확인됨 · 태그 3)');
    ok(st.K.length === sug.length && st.K.every(c => c.nid === st.A[0].id && c.due > st.td && c.src === 'note'), '저장: 제안 카드가 노트에 연결 · 첫 복습 내일');
    ok(st.h === '#notes/' + st.A[0].id && !!(await p.$('#lnOv .ln-md')), '저장 후 보기 화면'); ok(st.ev > 0, 'LNOTE.on 알림');
    ok(await p.evaluate(() => !!document.querySelector('#lnOv .ln-md code') && !!document.querySelector('#lnOv .ln-md b') && !!document.querySelector('#lnOv .ln-md li') && /a &lt; b/.test(document.querySelector('#lnOv .ln-md').innerHTML)), '보기: 마크다운 일부(목록 · 굵게 · 코드) · HTML 이스케이프');
    await shot(p, 'app-view'); { const g = await gate(p, '#lnOv'); ok(!g.over && !g.small.length && !g.tiny.length, '390 보기 관문 ' + JSON.stringify(g)); }
    /* 고치기 → 태그 6개 막음 */
    await p.click('#lnOv [data-ln=edit]'); await p.fill('#lnF [name=tags]', 'a,b,c,d,e,f'); await p.click('#lnSave'); ok(/5개까지/.test(await p.textContent('#lnOv .ln-err')), '태그 6개 막음');
    await p.fill('#lnF [name=tags]', '피벗, 요약'); await p.click('#lnSave'); await p.waitForTimeout(300); ok(await p.evaluate(() => LNOTE.all()[0].tags.join() === '피벗,요약'), '고치기 저장');
    /* 튜터 초안(다른 개발자가 API로 넣는 경우) → 허브 「확인할 초안」 · 열면 바로 편집 */
    await p.evaluate(() => { LNOTE.save({ t: '튜터 요약 초안', b: '- 피벗은 요약 표예요', src: 'tutor', tags: ['피벗'] }); LNOTE.save({ t: '영어 회의 표현', b: 'Let me circle back', tags: ['영어'] }); });
    await go(p, '#notes'); ok(/확인할 초안 1개/.test(await p.textContent('.ln-drafts')), '허브: 확인할 초안 줄');
    ok(await p.evaluate(() => document.querySelectorAll('.ln-card.draft').length === 1 && !!document.querySelector('.ln-card .ln-src[data-s=tutor]')), '초안 카드: 점선 · 튜터 배지');
    await shot(p, 'app-hub'); { const g = await gate(p, '.ln-hub'); ok(!g.over && !g.small.length && !g.tiny.length, '390 허브 관문 ' + JSON.stringify(g)); }
    await p.click('.ln-card.draft'); await p.waitForTimeout(300); ok(!!(await p.$('#lnOv #lnF')) && /확인하고 저장/.test(await p.textContent('#lnSave')), '초안은 바로 편집 · 「확인하고 저장」');
    await p.click('#lnOv [data-ln=keepdraft]'); await p.waitForTimeout(300); ok(await p.evaluate(() => LNOTE.all().find(n => n.src === 'tutor').st === 'draft'), '초안으로 두기');
    await go(p, '#notes'); await p.click('.ln-card.draft'); await p.waitForTimeout(250); ok(/초안 확인하기/.test(await p.textContent('#lnSt')) && !!(await p.$('#lnOv .ln-steps')) && !!(await p.$('#lnOv .ln-card.draft, #lnOv .ln-draftnote')), '초안 확인 모드(단계 · 안내)');
    await p.click('#lnSave'); ok(/한 줄 이상 고쳐/.test(await p.textContent('#lnOv .ln-err')), '대필 방지: 고친 줄 없으면 막음');
    await p.fill('#lnF [name=b]', '- 피벗은 요약 표예요\n- 내 말로: 행 · 열 · 값을 끌어 놓아 묶어 봐요'); await p.click('#lnSave'); ok(/체크해/.test(await p.textContent('#lnOv .ln-err')), '대필 방지: 확인 체크 없으면 막음');
    await p.check('#lnF [name=ok]'); await p.click('#lnSave'); await p.waitForTimeout(300); ok(await p.evaluate(() => { const n = LNOTE.all().find(n => n.src === 'tutor'); return n.st === 'ok' && /내 말로/.test(n.b); }), '확인하고 저장 → 확인됨(출처는 튜터 그대로)');
    await p.evaluate(() => LNOTE.save({ t: '오답: 정규화', b: '**문제** 3NF는?\n**정답** 이행 종속 제거', src: 'quiz' })); await go(p, '#notes'); await p.click('.ln-card.draft'); await p.waitForTimeout(250); await p.check('#lnF [name=ok]'); await p.click('#lnSave'); ok(/왜 틀렸을까요/.test(await p.textContent('#lnOv .ln-err')), '오답 초안: 「왜 틀렸을까요?」 없으면 막음');
    await p.fill('#lnF [name=why]', '2NF와 헷갈렸어요'); await p.click('#lnSave'); await p.waitForTimeout(300); ok(await p.evaluate(() => /왜 틀렸나\*\* 2NF와 헷갈렸어요/.test(LNOTE.all().find(n => n.src === 'quiz').b)), '오답 초안: 내 이유를 본문에 더해 저장');
    await p.evaluate(() => LNOTE.del(LNOTE.all().find(n => n.src === 'quiz').id));
    /* 태그 · 검색 */
    await go(p, '#notes'); await p.click('.ln-chips [data-v="영어"]'); { const tt = await p.evaluate(() => [...document.querySelectorAll('#lnList .ln-card .t')].map(x => x.textContent).join()); ok(tt === '영어 회의 표현', '태그 칩 거르기 ' + tt); }
    await p.click('.ln-chips [data-v=""]'); await p.fill('#lnQ', '피벗'); await p.waitForTimeout(100); ok(await p.evaluate(() => document.querySelectorAll('#lnList .ln-card').length === 2 && /2개 찾았어요/.test(document.querySelector('.ln-cnt').textContent)), '검색: 제목 · 본문 · 태그');
    await p.fill('#lnQ', '범주 필드'); await p.waitForTimeout(100); ok(await p.evaluate(() => document.querySelectorAll('#lnList .ln-card').length === 1), '검색: 카드 내용도 찾음');
    await p.fill('#lnQ', '없는낱말'); await p.waitForTimeout(100); ok(/찾는 노트가 없어요/.test(await p.textContent('#lnList')), '검색 결과 없음 문장');
    await p.click('#lnList [data-ln=new]'); await p.waitForTimeout(250); ok((await p.inputValue('#lnF [name=t]')) === '없는낱말', '결과 없음 → 이 내용으로 새 노트');
    await go(p, '#notes'); await p.click('[data-ln=clear]').catch(() => { }); await p.evaluate(() => { const q = document.getElementById('lnQ'); if (q) { q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); } });
    /* 고정 */
    const nid = await p.evaluate(() => LNOTE.all().find(n => n.t === '피벗 테이블 정리').id); await go(p, '#notes/' + nid); await p.click('#lnOv [data-ln=pin]'); await p.waitForTimeout(200); await go(p, '#notes'); ok(!!(await p.$('.pins .ln-card')), '고정한 노트 선반');
    /* .md 내려받기: 이름 · 학번 없음 */
    await go(p, '#notes/' + nid); { const [d] = await Promise.all([p.waitForEvent('download'), p.click('#lnOv [data-ln=mdone]')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(/^# 피벗 테이블 정리/.test(t) && !/20269000/.test(t), '.md 내려받기(학번 없음)'); }
    /* 삭제 → 카드도 지우기 → 되돌리기 */
    const k0 = await p.evaluate(() => LNOTE.cards().length); const kn = await p.evaluate(id => LNOTE.cards().filter(c => c.nid === id).length, nid);
    await p.click('#lnOv [data-ln=del]'); await p.waitForTimeout(100); ok(!!(await p.$('#lnOv .ln-delc [data-ln=delall]')), '지우기 확인: 카드 처리 고르기');
    await p.click('#lnOv [data-ln=delall]'); await p.waitForTimeout(300); ok(await p.evaluate(() => !LNOTE.all().some(n => n.t === '피벗 테이블 정리') && location.hash === '#notes'), '노트 지움');
    ok(await p.evaluate(([k0, kn]) => kn > 0 && LNOTE.cards().length === k0 - kn, [k0, kn]), '카드도 지움');
    await p.click('.ln-undo [data-ln=undo]'); await p.waitForTimeout(300); ok(await p.evaluate(k0 => LNOTE.all().some(n => n.t === '피벗 테이블 정리') && LNOTE.cards().length === k0, k0), '되돌리기: 노트 · 카드 복구');
    /* 진입점: 「나」 목록 */
    await go(p, '#acct'); ok(!!(await p.$('.ls-list a[href="#notes"]')), '앱 「나」 목록에 내 노트');
    /* 저장된 값(이 기기) — 계약 모양 */
    await p.waitForTimeout(700); ok(await p.evaluate(() => { const all = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /lp/i.test(k) && localStorage.getItem(k).includes('"notes"')) || '{}')); const v = Object.values(all)[0] || {}; return v.notes && v.notes.v === 1 && Array.isArray(v.notes.items) && Array.isArray(v.notes.cards); }), '이 기기 학습 기록에 notes 저장');
    ok(!errs.length, '학원 앱 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* 2. 오늘 복습: 카드 뒤집기 · 다시/알쏭/앎 · 다시는 이번 회차 끝에 한 번 더 · 끝 화면 · 탭바 숨김 · 이 노트 카드만 */
  { const { ctx, p, errs } = await open({ hash: 'home' });
    await p.evaluate(() => { const n = LNOTE.save({ t: '정규화', b: '3NF', tags: ['정규화'] }); const t = LNOTE.today(); for (let i = 0; i < 3; i++) LNOTE.saveCard({ f: `질문 ${i + 1}?`, k: `답 ${i + 1}`, nid: n.id, due: t }); LNOTE.saveCard({ f: '내일 카드', k: '답', due: LNOTE.addD(t, 1) }); window.__nid = n.id; });
    await go(p, '#notes'); ok(/3장/.test(await p.textContent('.ln-hero')) && !!(await p.$('.ln-hero a[href="#notes/review"]')), '허브 머리: 오늘 복습 3장 · 시작 버튼');
    await go(p, '#notes/review'); ok(await p.evaluate(() => document.body.classList.contains('ln-focus') && getComputedStyle(document.querySelector('.ap-nav') || document.body).display !== 'flex' || !document.querySelector('.ap-nav') || getComputedStyle(document.querySelector('.ap-nav')).display === 'none'), '#notes/review: 아래 탭 숨김');
    ok(/1 \/ 3/.test(await p.textContent('.ln-rvn')) && /질문 1/.test(await p.textContent('.ln-flip')), '복습: 첫 카드 앞면');
    await shot(p, 'app-review-front'); { const g = await gate(p, '.ln-rv'); ok(!g.over && !g.small.length && !g.tiny.length, '390 복습 관문 ' + JSON.stringify(g)); }
    await p.click('.ln-flip'); ok(/답 1/.test(await p.textContent('.ln-flip')) && (await p.$$('.ln-grade button')).length === 3, '뒤집기 → 정답 · 채점 3칸');
    await shot(p, 'app-review-back');
    await p.click('.ln-grade .g2'); ok(await p.evaluate(() => { const c = LNOTE.cards().find(x => x.f === '질문 1?'); return c.n === 1 && c.due > LNOTE.today() && c.ef > 2.5; }), '앎: 간격 · 쉬움 계수 갱신');
    await p.keyboard.press(' '); await p.keyboard.press('1'); ok(await p.evaluate(() => { const c = LNOTE.cards().find(x => x.f === '질문 2?'); return c.iv === 1 && c.ef < 2.5; }), '키보드: 스페이스 · 1(다시)');
    await p.click('.ln-flip'); ok(/오늘 한 번 더/.test(await p.textContent('.ln-grade .g0')), '「다시」 아래 문구 = 오늘 한 번 더'); await p.click('.ln-grade .g1'); await p.waitForTimeout(100);
    ok(/3장 다 봤어요/.test(await p.textContent('.ln-again')) && /질문 2/.test(await p.textContent('.ln-again')), '다시 라운드: 다시 고른 카드만 한 번 더 볼까요');
    await shot(p, 'app-review-again'); await p.click('[data-ln=again]'); await p.waitForTimeout(100); ok(/질문 2/.test(await p.textContent('.ln-flip')) && /1 \/ 1/.test(await p.textContent('.ln-rvn')), '다시 라운드 1장');
    await p.click('.ln-flip'); await p.click('.ln-grade .g2'); await p.waitForTimeout(100); ok(/오늘 복습 끝/.test(await p.textContent('.ln-rvdone')) && /앎/.test(await p.textContent('.ln-rvdone')) && !!(await p.$('.ln-bars')), '끝 화면: 결과 타일 · 앞으로 7일');
    ok(await p.evaluate(() => LNOTE.cards().find(x => x.f === '질문 2?').iv === 1), '다시 라운드는 일정(내일)을 바꾸지 않음');
    await shot(p, 'app-review-end'); { const g = await gate(p, '.ln-rv'); ok(!g.over && !g.small.length && !g.tiny.length, '390 복습 끝 관문 ' + JSON.stringify(g)); }
    ok(await p.evaluate(() => LNOTE.due().length === 0), '복습 후 오늘 남은 카드 없음');
    await go(p, '#notes'); await go(p, '#notes/review'); ok(/오늘 복습할 카드가 없어요/.test(await p.textContent('.ln-rv')) && /내일 \d+장/.test(await p.textContent('.ln-rv')), '0장: 문장 · 내일 예고');
    await shot(p, 'app-review-zero');
    await go(p, '#notes/' + await p.evaluate(() => window.__nid)); await p.click('#lnOv a[href^="#notes/review?n="]'); await p.waitForTimeout(300); ok(/정규화 카드만/.test(await p.textContent('.ln-rvh')) && /\/ 3/.test(await p.textContent('.ln-rvn')), '#notes/review?n= 이 노트 카드만');
    ok(!errs.length, '복습 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* 3. 데이터 제한 · 정리(계약) */
  { const { ctx, p, errs } = await open({ hash: 'home' });
    const r = await p.evaluate(() => { const o = {}; const n = LNOTE.save({ t: 'x'.repeat(200), b: 'y'.repeat(3000), tags: ['#a', 'b', 'c', 'd', 'e', 'f', 'g'.repeat(40)], src: 'hack', pin: 'yes', name: '홍길동' }); o.n = n; o.keys = Object.keys(n).sort().join();
      for (let i = 0; i < 130; i++) LNOTE.save({ t: '노트 ' + i, b: 'b' }); o.cnt = LNOTE.all().length; o.full = LNOTE.save({ t: '하나 더' });
      const c = LNOTE.saveCard({ f: 'f'.repeat(200), k: 'k'.repeat(400), iv: 999, ef: 9, nid: 'nzzz' }); o.c = c; for (let i = 0; i < 310; i++) LNOTE.saveCard({ f: 'c' + i, k: 'k' }); o.kc = LNOTE.cards().length;
      o.g = LNOTE.goal({ exam: '정보처리기사', date: '2027-03-08' }); o.gb = LNOTE.goal({ exam: '', date: 'x' }); o.sy = LNOTE.sync('notion', { on: true, page: 'p'.repeat(90), key: 'secret_abc' }); o.raw = JSON.stringify(LR.lp.notes); return o; });
    ok(r.n.t.length === 80 && r.n.b.length === 1500 && r.n.tags.length === 5 && r.n.tags[0] === 'a' && r.n.src === 'me' && r.n.pin === false, '노트 제한: 제목 80 · 본문 1500 · 태그 5 · 출처 · 고정 정리');
    ok(r.keys === 'at,b,cid,id,lid,pin,src,st,t,tags,up' && /^n[0-9a-z]+$/.test(r.n.id), '노트 키는 계약만(이름 버림) · id n+base36');
    ok(r.cnt === 120 && r.full === null, '노트 120개 제한');
    ok(r.c.f.length === 120 && r.c.k.length === 240 && r.c.iv === 180 && r.c.ef === 2.8 && r.c.nid === '' && /^k[0-9a-z]+$/.test(r.c.id), '카드 제한 · 없는 노트 연결 끊음');
    ok(r.kc === 300, '카드 300장 제한');
    ok(r.g && r.g.exam === '정보처리기사' && r.gb === null && r.sy.page.length === 60 && !/secret_abc/.test(r.raw) && !/홍길동/.test(r.raw), '목표 · 동기화 정리(비밀값 · 이름 없음)');
    ok(!errs.length, '제한 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* 3b. 모아보기(추가 지시 1): 구분 · 질문(답 · 노트로 옮기기) · 댓글 · 글 · 학습 기록 · 고정/숨기기(marks) · 통합 검색 · 기간 끝남 · 저장 상태 */
  { const { ctx, p, errs } = await open({ hash: 'home' });
    await p.evaluate(() => { const c = SITE().classes[0]; window.__cid = c.id; const it = (c.items || []).find(x => x.type !== 'chapter');
      LR.lp.tutor = { plan: [], ask: [{ id: 'eq1', q: '정규화에서 3NF는 왜 필요한가요?', cls: c.name, cid: c.id, where: it ? it.title : '', at: '2026-11-16T01:00:00.000Z' }], planAt: '' };
      LR.mine.qa = [{ id: 'eq1', q: '정규화에서 3NF는 왜 필요한가요?', a: '이행 종속을 없애 갱신 이상을 막기 위해서예요.', at: '2026-11-16T03:00:00.000Z' }];
      const r = LR.lp.cls[c.id] = LR.lp.cls[c.id] || { items: {} }; r.items = r.items || {}; if (it) r.items[it.id] = { ...(r.items[it.id] || {}), done: true, tries: [{ at: '2026-11-15T02:00:00.000Z', score: 80, pass: true }] };
      const st = lcStore(); st.posts.push({ id: 'poT1', board: '자유', title: '피벗 질문 아닌 글', body: '오늘 배운 피벗 정리 공유해요', cls: c.id, at: '2026-11-14T02:00:00.000Z', au: lcMe() }); st.cmts.push({ id: 'cmT1', post: 'poT1', parent: '', body: '정규화 표 예시도 좋아요', at: '2026-11-14T03:00:00.000Z' });
      LNOTE.save({ t: '정규화 요약', b: '- 3NF', cid: c.id }); });
    await go(p, '#notes'); await p.waitForTimeout(150);
    const seg = await p.$$eval('#lnSeg [data-v]', x => x.map(b => b.dataset.v + ':' + b.textContent.trim()));
    ok(['all', 'note', 'q', 'cmt', 'post', 'log'].every(k => seg.some(v => v.startsWith(k + ':'))) && seg.some(v => /^q:질문 1/.test(v)), '모아보기 구분: 전체 · 노트 · 질문 · 댓글 · 글 · 학습 기록(개수) ' + seg.join(' | '));
    { const g = await gate(p, '.ln-hub'); ok(!g.over && !g.small.length && !g.tiny.length, '390 모아보기 관문 ' + JSON.stringify(g)); }
    await p.click('#lnSeg [data-v=q]'); await p.waitForTimeout(100);
    ok(/새 답변/.test(await p.textContent('#lnList')) && !!(await p.$('#lnList .ln-item[data-k=q] details.ln-ans')) && !!(await p.$('#lnList .ln-item a[href^="#c/"]')), '질문: 새 답변 배지 · 답 펼치기 · 원래 자리로');
    await shot(p, 'app-agg-q'); { const g = await gate(p, '.ln-hub'); ok(!g.over && !g.small.length && !g.tiny.length, '390 질문 구분 관문 ' + JSON.stringify(g)); }
    await p.click('#lnList .ln-item[data-k=q] [data-ln=tonote2]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => { const n = LNOTE.get(decodeURIComponent(location.hash.split('/')[1])); return n && n.st === 'draft' && n.src === 'me' && /\*\*질문\*\*/.test(n.b) && /이행 종속/.test(n.b); }) && !!(await p.$('#lnOv #lnF')), '질문 → 노트로 옮기기(질문 + 답 · 초안 · 편집으로)');
    ok(await p.evaluate(() => !LR.lp.tutor.ask.length === false && LR.mine.qa.length === 1), '원본(튜터 질문 · 답)은 그대로');
    await go(p, '#notes'); await p.click('#lnSeg [data-v=log]'); await p.waitForTimeout(100); ok(/퀴즈/.test(await p.textContent('#lnList')) && /80점/.test(await p.textContent('#lnList')) && !!(await p.$('#lnList .ln-h3')), '학습 기록: 주 단위 묶음 · 퀴즈 점수');
    await p.click('#lnList .ln-item[data-k=log] [data-ln=mkpin]'); await p.waitForTimeout(100); ok(await p.evaluate(() => Object.entries(LNOTE.marks()).some(([k, v]) => /^log:/.test(k) && v.pin)), 'marks: 학습 기록 고정');
    await p.click('#lnSeg [data-v=cmt]'); await p.waitForTimeout(100); ok(/정규화 표 예시/.test(await p.textContent('#lnList')), '댓글: 내가 남긴 댓글');
    await p.click('#lnList .ln-item[data-k=cmt] [data-ln=mkhide]'); await p.waitForTimeout(100); ok(await p.evaluate(() => LNOTE.marks()['cmt:cmT1'] && LNOTE.marks()['cmt:cmT1'].hide && !document.querySelector('#lnList .ln-item[data-k=cmt]') && /숨긴 항목 1개/.test(document.getElementById('lnList').textContent)), 'marks: 댓글 숨기기 · 숨긴 항목 보기');
    await p.click('#lnSeg [data-v=post]'); await p.waitForTimeout(100); ok(/피벗 질문 아닌 글/.test(await p.textContent('#lnList')), '글: 내가 쓴 게시글');
    /* 통합 검색: 노트 구분에서 찾으면 다른 활동도 */
    await p.click('#lnSeg [data-v=note]'); await p.fill('#lnQ', '정규화'); await p.waitForTimeout(150);
    ok(/다른 활동에서도 찾았어요/.test(await p.textContent('#lnList')) && !!(await p.$('#lnList .ln-item[data-k=q]')) && !!(await p.$('#lnList .ln-card')), '통합 검색: 노트 + 질문(숨긴 댓글 제외)');
    await p.click('#lnSeg [data-v=all]'); await p.waitForTimeout(100); ok(/모두에서/.test(await p.textContent('#lnList .ln-cnt')), '전체 구분 + 검색');
    await shot(p, 'app-agg-search');
    await p.fill('#lnQ', ''); await p.waitForTimeout(100);
    /* 저장 상태 · 기간 끝남 */
    const id = await p.evaluate(() => LNOTE.all().find(n => n.t === '정규화 요약').id); await go(p, '#notes/' + id); await p.click('#lnOv [data-ln=edit]'); await p.fill('#lnF [name=b]', '- 3NF 이행 종속'); await p.click('#lnSave'); await p.waitForTimeout(250);
    ok(/저장됨 · 방금/.test(await p.textContent('#lnSst')), '저장 상태: 저장됨 · 방금');
    await p.evaluate(() => { const c = SITE().classes[0]; c.end = '2020-01-01'; c.ends = {}; }); await go(p, '#notes'); await go(p, '#notes/' + id);
    ok(/기간 끝남/.test(await p.textContent('#lnOv')) && !(await p.$('#lnOv [data-ln=edit]')) && /읽기만/.test(await p.textContent('#lnOv')), '기간 끝난 과정: 배지 · 읽기 전용');
    ok(!errs.length, '모아보기 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* 4. 대학 학습자(웹 1280) — 레일 · 머리 메뉴 「내 노트」 · 마이페이지 카드 · 시연 노트 · .md에 학번 없음 · 레슨 미니 패널 */
  { const { ctx, p, errs } = await open({ demo: '1', sid: '20260001', app: false, seed: true });
    ok(await p.evaluate(() => LNOTE.all().length >= 2 && LNOTE.cards().length >= 1), '체험판: 내 과정으로 시연 노트 · 카드');
    ok(await p.evaluate(() => !JSON.stringify(LR.lp.notes).includes('20260001')), '대학: 노트에 학번 없음');
    ok(!!(await p.$('.ln-rail .ri')) && !!(await p.$('.ln-hero')), '웹: 왼쪽 레일 · 머리 카드');
    ok(await p.evaluate(() => [...document.querySelectorAll('header nav.ln a')].some(a => a.getAttribute('href') === '#notes' && /내 노트/.test(a.textContent))), '웹 머리 메뉴 「내 노트」');
    await shot(p, 'web-hub');
    const id = await p.evaluate(() => LNOTE.all().find(n => n.st === 'ok').id); await go(p, '#notes/' + id); ok(!!(await p.$('#lnOv.panel')), '웹: 오른쪽 패널');
    await shot(p, 'web-view');
    { const [d] = await Promise.all([p.waitForEvent('download'), p.click('#lnOv [data-ln=mdone]')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(!/20260001/.test(t), '대학 .md에 학번 없음'); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(250); ok(!(await p.$('#lnOv')) && /#notes$/.test(p.url()), 'Esc로 닫기');
    await go(p, '#my'); ok(!!(await p.$('.ln-hc')), '마이페이지 노트 카드');
    const les = await p.evaluate(() => { const n = LNOTE.all().find(x => x.cid && x.lid); return n ? `#c/${n.cid}/${n.lid}` : ''; });
    if (les) { await go(p, les); await p.waitForTimeout(300); ok(!!(await p.$('.ln-lbtn')), '레슨 화면 「노트」 버튼');
      await p.click('.ln-lbtn'); ok(!!(await p.$('#lnMini .ln-card')), '미니 패널: 이 레슨 노트');
      await p.fill('#lnMq', '이 레슨에서 기억할 한 줄'); const n0 = await p.evaluate(() => LNOTE.all().length); await p.click('#lnMini [type=submit]'); await p.waitForTimeout(200);
      ok(await p.evaluate(([n0, h]) => { const [, c, l] = h.slice(1).split('/'); const n = LNOTE.all()[0]; return LNOTE.all().length === n0 + 1 && n.cid === c && n.lid === l && n.b === '이 레슨에서 기억할 한 줄'; }, [n0, les]), '미니 패널: 빠른 노트(과정 · 레슨 연결)');
      await shot(p, 'web-lesson'); } else ok(false, '시연 노트에 레슨 연결이 없음');
    ok(!errs.length, '대학 웹 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* 5. 대학 앱 390 · 웹 390 관문 */
  { const { ctx, p, errs } = await open({ demo: '1', sid: '20260001', seed: true });
    { const g = await gate(p, '.ln-hub'); ok(!g.over && !g.small.length && !g.tiny.length, '대학 앱 390 허브 관문 ' + JSON.stringify(g)); }
    await shot(p, 'app-hub-univ');
    ok(!errs.length, '대학 앱 오류 없음 ' + errs.join(' | ')); await ctx.close(); }
  { const { ctx, p, errs } = await open({ app: false, w: 390, seed: true });
    { const g = await gate(p, '.ln-hub'); ok(!g.over && !g.small.length && !g.tiny.length, '웹 390 허브 관문 ' + JSON.stringify(g)); }
    const id = await p.evaluate(() => LNOTE.all()[0].id); await go(p, '#notes/' + id); { const g = await gate(p, '#lnOv'); ok(!g.over && !g.small.length && !g.tiny.length, '웹 390 패널(시트) 관문 ' + JSON.stringify(g)); }
    ok(!errs.length, '웹 390 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  await br.close(); srv.close(); console.log(`note436: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
