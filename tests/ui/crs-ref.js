'use strict';
/* v35 과정 만들기 — 기준 과정 따라 만들기(F4).
   대표님이 보여 주신 기존 디디쌤 강좌 구성(14차시 · 차시마다 강의 영상 1 + 퀴즈 1 = 28개 · 무료 · 수강 90일 · 수료 = 영상 진도 80%)을
   운영자가 '과정 만들기' 흐름에서 화면 글자만 보고 클릭해 만들 수 있는지 끝까지 확인한다(내부 함수 직접 호출 없음, 확인용 읽기만).
   유형: 성인(adult) · 기업(corp) · 공공(public) · 평생(lifelong) PC 1280 + 성인 · 평생 휴대폰 390.
   경로: 레일 → [+ 만들기] → 이름 → [다음] → [목록 붙여 넣기](엑셀에서 복사한 14줄) → [이대로 차시 만들기] → [다음]
         → [파일 여러 개 한 번에 올리기](영상 14개, 이름 순) → [파일 14개 넣기] → [모든 차시에 퀴즈 넣기] → [14개 차시에 퀴즈 넣기] → [다음]
         → 수강 기간 90일 · [강의 영상 진도만] · 80% → [다음] → [개설하기] → [학습자에게 공개하기] → 학습자 화면.
   검사: 클릭 수(목표 ≤ 25) · 단계마다 가로 넘침 0 · pageerror 0 · 과정 항목 28(영상 14 · 퀴즈 14, 차시 순서 = 파일 이름 순) · 무료 · 90일 ·
         수료 기준(영상 14개 고른 가중치 합 100, 80%) · 학습자 게시본 항목 28 · crit 14 · thr 80 · 학습자 앱에서 영상만 보면 수료율 100 · 퀴즈만 하면 0.
   성인 PC에서는 [강좌 복사해서 시작하기]로 방금 만든 과정을 가져와 차시 14 · 콘텐츠 28이 초안에 들어오는지도 본다.
   F5 추가: ① 개설 뒤 영상을 더 넣거나 빼면 수료 항목(criteria.items)이 따라가는지(합 100) · 게시본 crit · 학습자 수료율까지(성인 PC)
            ② [파일 여러 개 한 번에 올리기]가 문서도 받는지: 같은 번호 영상 · 문서는 같은 차시, 남은 문서는 문서 없는 차시에 차례로, 위장 PDF는 넣지 않음(성인 PC 별도 흐름)
            ③ 수강 설정 질문이 4개를 넘는 유형(성인 · 공공 · 평생)은 위에 3개만 보이고 나머지는 '더 설정하기'에 접혀 지금 값을 한 줄로 보여 주는지
   사용: node tests/ui/crs-ref.js · REF_ONLY=adult,corp · CRS_SHOTS=<폴더>(단계별 화면) */
process.env.CRS_ROOT = process.env.CRS_ROOT || require('node:path').resolve(__dirname, '../../didisam');
const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const T = require('./crs-flow.js');
/* 기준 과정(테스트 안에서만 쓰는 이름 · 제목) */
const REF = { name: 'AI 기초와 활용', titles: ['AI가 무엇인지 알아보자', '생성형 AI가 무엇인가?', 'AI와 대화하는 기술', 'AI 활용 글쓰기', 'M365 Copilot 기본', 'MS 오피스 생산성을 높이는 MS Copilot 활용', 'Copilot 활용 문서 작성', 'Copilot 활용 엑셀 업무', 'Copilot 활용 프레젠테이션 제작', 'Copilot 활용 노트 작성 및 관리', 'Copilot 활용 이메일 작성 및 관리', 'M365 Copilot 활용 업무 자동화 실습', 'AI 활용 멀티미디어 제작', 'AI윤리'] };
/* 엑셀에서 복사한 모양: 차시 번호 \t 제목 \t 길이 */
const PASTE = REF.titles.map((t, i) => `${i + 1}차시\t${t}\t${20 + (i % 3)}:${String(10 + i).padStart(2, '0')}`).join('\n');
const WEBM = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAQ/EU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggQp7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiECPQAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYjcj5zi4W6cHZyBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhAJiWgDgibCBQLqBJJqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYjcj5zi4W6cHWfIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDEuMDAwMDAwMDAwAB9DtnVChOeBAKPBgQAAgFADAJ0BKkAAJAAARwiFhYiFhIgCAgJ1qgP4AgcI1WeZjzfSAP7/TRL//FhX8WFfxYV/8WFf/PzO7cX85gCjloEAKADRAQABEBAAGAAYWC/0AAiMAACjloEAUADRAQABEBAAGAAYWC/0AAiMAACjloEAeADRAQABEBAAGAAYWC/0AAiMAACjloEAoADRAQABEBAAGAAYWC/0AAiMAACjloEAyADRAQABEBAAGAAYWC/0AAiMAACjloEA8ADRAQABEBAAGAAYWC/0AAiMAACjlYEBGACxAQABEBAUYABhYL/QACIwAKOWgQFAANEBAAEQEAAYABhYL/QACIwAAKOWgQFoANEBAAEQEAAYABhYL/QACIwAAKOWgQGQANEBAAEQEAAYABhYL/QACIwAAKOWgQG4ANEBAAEQEAAYABhYL/QACIwAAKOWgQHgANEBAAEQEAAYABhYL/QACIwAAKOWgQIIANEBAAEQEAAYABhYL/QACIwAAKOWgQIwANEBAAEQEAAYABhYL/QACIwAAKOWgQJYANEBAAEQEAAYABhYL/QACIwAAKOWgQKAANEBAAEQEAAYABhYL/QACIwAAKOWgQKoANEBAAEQEAAYABhYL/QACIwAAKOVgQLQALEBAAEQEBRgAGFgv9AAIjAAo5aBAvgA0QEAARAQABgAGFgv9AAIjAAAo5aBAyAA0QEAARAQABgAGFgv9AAIjAAAo5aBA0gA0QEAARAQABgAGFgv9AAIjAAAo5aBA3AA0QEAARAQABgAGFgv9AAIjAAAo5aBA5gA0QEAARAQABgAGFgv9AAIjAAAo5aBA8AA0QEAARAQABgAGFgv9AAIjAAAHFO7a5G7j7OBALeK94EB8YIBn/CBAw==', 'base64'); /* 64×36 · 1초 빈 화면 */
/* 파일 이름 순서 확인: '강의2' < '강의10'(숫자 순). 고르는 순서는 일부러 섞는다 */
const FILES = [3, 1, 14, 2, 10, 4, 5, 6, 7, 8, 9, 11, 12, 13].map(n => ({ name: `강의${n}.webm`, mimeType: 'video/webm', buffer: WEBM }));
const CASES = [['adult', 'pc'], ['corp', 'pc'], ['public', 'pc'], ['lifelong', 'pc'], ['adult', 'm'], ['lifelong', 'm']];

async function run(br, base, type, dev, shots) {
  const P = [], W = [], errs = []; const vp = dev === 'm' ? { width: 390, height: 844 } : { width: 1280, height: 900 };
  const { ctx, p } = await T.openOrg(br, base, [type], { empty: true, vp, errs }); const log = []; const C = T.clicker(p, log); let inputs = 0; let si = 0; let picks = 0; /* 파일 고르기 창도 클릭 1회로 센다 */
  const shot = async tag => { const m = await T.measure(p); if (m.over > 0) P.push(`${tag} 가로 넘침 ${m.over}px`); if (m.cut.length) P.push(`${tag} 잘림 ${m.cut.join(' ')}`); if (m.jargon.length) W.push(`${tag} 어려운 말 ${m.jargon.join(',')}`); if (shots) await p.screenshot({ path: path.join(shots, `${type}_${dev}_${++si}_${tag}.png`) }); };
  const btn = (re, scope = '#crsFlow') => T.btnByText(p, re, scope).first();
  const need = async (loc, what) => { if (!(await loc.count())) throw new Error(`'${what}' 버튼을 화면에서 찾지 못함`); return loc; };
  const next = async () => { await C.clk(await need(p.locator('#crsFlow [data-cfgo=next]').filter({ visible: true }).last(), '다음'), '다음'); await p.waitForTimeout(300); };
  const step = async () => (await T.rootInfo(p)).step;
  const sheetGone = async () => { for (let i = 0; i < 60 && await p.locator('#ctSheet').count(); i++) await p.waitForTimeout(250); };
  try {
    if (!(await T.enterFlow(p, C, log))) throw new Error('흐름 진입 실패');
    /* ① 이름 */
    await shot('1basic'); await p.locator('#crsFlow input[type=text]:visible').first().fill(REF.name); inputs++; await next();
    if (await step() !== 'outline') P.push('2단계로 넘어가지 않음: ' + await step());
    /* ② 차시 목록: 붙여 넣기 */
    await C.clk(await need(btn(/목록 붙여 넣기/), '목록 붙여 넣기'), '목록 붙여 넣기');
    await p.locator('#crsFlow [data-cfbulkt]').fill(PASTE); inputs++; await p.waitForTimeout(150);
    const cnt = await p.locator('#crsFlow [data-cfbulkn]').innerText(); if (!/14줄/.test(cnt)) P.push('붙여 넣기 줄 수 안내 없음: ' + cnt);
    await shot('2paste');
    await C.clk(await need(btn(/이대로 .*만들기/), '이대로 차시 만들기'), '이대로 차시 만들기');
    const wp = await p.evaluate(() => (CF.draft.weekPlan || []).map(w => w.title)); if (wp.length !== 14) P.push(`붙여 넣은 차시 ${wp.length}개(14 기대)`); if (wp.join('|') !== REF.titles.join('|')) P.push('차시 제목이 붙여 넣은 목록과 다름: ' + wp.slice(0, 3).join(' / '));
    const sv = await p.locator('#crsFlow [data-cf=sessions]').inputValue().catch(() => ''); if (sv !== '14') P.push('차시 수 칸이 14로 맞춰지지 않음: ' + sv);
    await shot('2outline'); await next();
    /* ③ 차시 채우기: 영상 여러 개 → 모든 차시에 퀴즈 */
    if (await step() !== 'fill') P.push('3단계 아님: ' + await step());
    await shot('3fill');
    const c0 = C.n;
    await C.clk(await need(btn(/파일 여러 개 한 번에 올리기/), '파일 여러 개 한 번에 올리기'), '파일 여러 개 올리기');
    await p.setInputFiles('#ctFiles', FILES); log.push('파일 14개 고르기'); picks++; await p.waitForTimeout(300);
    const map = await p.locator('#ctSheet .ctb-map li').allInnerTexts(); if (map.length !== 14) P.push(`올리기 확인 목록 ${map.length}줄`); else if (!/강의1\.webm/.test(map[0]) || !/강의2\.webm/.test(map[1]) || !/강의10\.webm/.test(map[9])) P.push('파일 이름 순서(숫자 순)가 아님: ' + map.slice(0, 3).join(' / '));
    await shot('3vmap');
    await C.clk(await need(btn(/파일 14개 넣기/, '#ctSheet'), '파일 14개 넣기'), '파일 14개 넣기'); await sheetGone();
    await C.clk(await need(btn(/모든 차시에 퀴즈 넣기/), '모든 차시에 퀴즈 넣기'), '모든 차시에 퀴즈 넣기'); await shot('3qsheet');
    await C.clk(await need(btn(/14개 차시에 퀴즈 넣기/, '#ctSheet'), '14개 차시에 퀴즈 넣기'), '14개 차시에 퀴즈 넣기'); await sheetGone();
    const fillClicks = C.n - c0 + picks;
    const dr = await p.evaluate(() => { const L = CF.draft.curriculum || []; return { n: L.length, v: L.filter(i => i.type === 'video').map(i => [i.week, i.file, i.title]), q: L.filter(i => i.type === 'quiz').map(i => [i.week, (i.qs || []).length]) }; });
    if (dr.n !== 28) P.push(`초안 콘텐츠 ${dr.n}개(28 기대)`);
    dr.v.forEach(([w, f, t]) => { if (f !== `강의${w}.webm`) P.push(`${w}차시 영상이 ${f}`); if (t !== REF.titles[w - 1]) P.push(`${w}차시 영상 제목 '${t}'`); });
    if (new Set(dr.q.map(x => x[0])).size !== 14) P.push('퀴즈가 14개 차시에 하나씩 들어가지 않음'); if (dr.q.some(x => x[1] < 3)) P.push('문항 3개 미만 퀴즈');
    const sum = await p.locator('#crsFlow .ctf-sum').innerText(); if (!/14 \/ 14/.test(sum)) P.push('채움 표시 ' + sum.replace(/\s+/g, ' '));
    await shot('3filled'); await next();
    /* ④ 수강 설정: 무료 · 90일 · 영상 진도만 · 80% */
    if (await step() !== 'setup') P.push('4단계 아님: ' + await step());
    const pick = async (k, re, what) => { const b = p.locator(`#crsFlow [data-cfset=${k}]`).filter({ hasText: re }).first(); if (!(await b.count())) { P.push(`수강 설정에 '${what}' 선택지 없음`); return; } if ((await b.getAttribute('aria-checked')) !== 'true') { if (!(await b.isVisible())) await C.clk(p.locator('#cfMore > summary'), '더 설정하기'); await C.clk(b, what); } };
    /* F5: 수강 설정 질문 수 — 위에 보이는 결정 4개 이하, 넘치면 '더 설정하기'(지금 값 한 줄) */
    const sq = await p.evaluate(() => { const R = document.querySelector('#crsFlow'); const top = [...R.querySelectorAll('.cf-f[data-cff]')].filter(e => !e.closest('details') && e.offsetParent && e.dataset.cff !== 'price'); const m = R.querySelector('#cfMore'); return { top: top.map(e => e.dataset.cff), more: m ? [...m.querySelectorAll('.cf-f[data-cff]')].map(e => e.dataset.cff) : [], open: m ? m.open : null, sum: m ? m.querySelector('.cf-more-s').innerText : '' }; });
    if (sq.top.length > 4) P.push(`수강 설정 위 질문 ${sq.top.length}개(4개 이하 기대): ${sq.top.join(',')}`);
    if (['adult', 'public', 'lifelong'].includes(type) && (!sq.more.length || sq.open || !/지금 값/.test(sq.sum))) P.push('더 설정하기 접기 없음 ' + JSON.stringify(sq)); else log.push(`수강 설정 위 ${sq.top.join(',')} · 접힘 ${sq.more.join(',')}`);
    /* v36 B: 수강 기간 '직접 정하기'(날짜 · 일수) 선택지가 있고, 시험 · 과제가 없으면 평가 기준은 접혀 '진도로만'으로 보인다 */
    { const v = await p.evaluate(k => { const R = document.querySelector('#crsFlow'); const e = R.querySelector('#cfEval'); return { custom: !!R.querySelector(`[data-cfset=${k}][data-v=custom]`), ev: e ? { open: e.open, s: e.querySelector('.cf-more-s').innerText } : null }; }, type === 'corp' ? 'dur' : 'days');
      if (!v.custom) P.push("수강 기간 '직접 정하기' 없음"); if (!v.ev || v.ev.open || !/진도로만/.test(v.ev.s)) P.push('평가 기준(시험 없음) 접힘 표시 ' + JSON.stringify(v.ev)); }
    if (type === 'corp') await pick('dur', /약 90일/, '13주(약 90일)'); else await pick('days', /^\s*90일/, '90일');
    await pick('critBy', /강의 영상 진도만/, '강의 영상 진도만'); await pick('rate', /80%/, '80% 이상');
    const pr = p.locator('#crsFlow [data-cf=price]'); if (await pr.count() && (await pr.inputValue()) !== '0' && (await pr.inputValue()) !== '') P.push('수강료 기본값이 0(무료)이 아님');
    await shot('4setup'); await next();
    /* ⑤ 확인 → 개설 */
    const pv = (await T.rootInfo(p)).text; if (!/강의 영상 진도 80% 이상/.test(pv)) P.push('미리보기에 수료 기준(강의 영상 진도 80%) 없음'); if (!/90일|13주|약 90/.test(pv) && type !== 'corp') P.push('미리보기에 수강 기간 90일 없음'); if (['adult', 'lifelong'].includes(type) && !/무료/.test(pv)) P.push('미리보기에 무료 표시 없음');
    await shot('5open');
    const before = await p.evaluate(() => S.classes.map(c => c.id));
    await C.clk(await need(p.locator('#crsFlow [data-cfgo=create]').filter({ visible: true }), '개설하기'), '개설하기'); await p.waitForTimeout(500);
    const id = await p.evaluate(b => (S.classes.find(c => !b.includes(c.id)) || {}).id, before); if (!id) throw new Error('개설되지 않음');
    await shot('6done');
    const total = C.n + picks;
    /* 과정 데이터 확인 */
    const c = await p.evaluate(id => { const c = S.classes.find(x => x.id === id); const cr = c.criteria || {}; const V = c.curriculum.filter(i => i.type === 'video'); return { n: c.curriculum.length, nv: V.length, nq: c.curriculum.filter(i => i.type === 'quiz').length, price: c.price, days: (c.period || {}).days, span: Math.round((new Date(c.end) - new Date(c.start)) / 864e5), thr: cr.threshold, by: cr.by, items: (cr.items || []).length, w: (cr.items || []).reduce((a, x) => a + (+x.w || 0), 0), onlyV: (cr.items || []).every(k => V.some(v => v.id === k.id)), video: cr.video, wp: (c.weekPlan || []).length }; }, id);
    if (c.n !== 28 || c.nv !== 14 || c.nq !== 14) P.push(`과정 항목 ${c.n}(영상 ${c.nv} · 퀴즈 ${c.nq})`); if (c.wp !== 14) P.push(`차시 ${c.wp}`);
    if (c.price !== 0) P.push('무료가 아님 ' + c.price); if (type === 'corp' ? c.span < 89 || c.span > 91 : c.days !== 90) P.push(`수강 기간 ${type === 'corp' ? c.span + '일(교육 기간)' : c.days + '일'}`);
    if (c.thr !== 80 || c.by !== 'video' || c.items !== 14 || c.w !== 100 || !c.onlyV) P.push('수료 기준 ' + JSON.stringify(c));
    /* ⑥ 학습자에게 공개 → 학습자 화면 */
    await C.clk(await need(p.locator('[data-cfdone=site]').filter({ visible: true }), '학습자에게 공개하기'), '학습자에게 공개하기', { count: false }); await p.waitForTimeout(500);
    try { await p.evaluate(() => closeModal()); } catch (e) { }
    const sn = await p.evaluate(id => { const x = (lsSnapshot().classes || []).find(y => y.id === id); return x ? { n: (x.items || []).length, crit: (x.crit || []).length, thr: x.thr, files: (x.items || []).filter(i => i.type === 'video' && i.src === 'upload').length } : null; }, id);
    if (!sn) P.push('게시본에 과정 없음'); else { if (sn.n !== 28) P.push(`게시본 항목 ${sn.n}`); if (sn.crit !== 14 || sn.thr !== 80) P.push(`게시본 수료 기준 crit ${sn.crit} · thr ${sn.thr}`); if (sn.files !== 14) P.push(`게시본 올린 영상 ${sn.files}`); }
    const tid = await p.evaluate(() => DREG.cur()); const l = await ctx.newPage(); l.on('pageerror', e => errs.push('learner: ' + e.message)); await l.setViewportSize(vp);
    await l.goto(base + `learner.html?t=${encodeURIComponent(tid)}#class/${id}`); await l.waitForFunction(() => typeof LR !== 'undefined' && LR.site, null, { timeout: 8000 }).catch(() => {}); await l.waitForTimeout(900);
    const lr = await l.evaluate(([id, name]) => { const c = ((LR.site && LR.site.classes) || []).find(x => x.id === id); if (!c) return null; const r = { name: document.body.innerText.includes(name), n: c.items.length, crit: (c.crit || []).length, thr: c.thr };
      if (typeof a2lRate === 'function') { const keep = [LR.lp, LR.mine]; const V = c.items.filter(i => i.type === 'video'), Q = c.items.filter(i => i.type === 'quiz'); const rate = done => { LR.mine = LR.mine || { cls: {} }; LR.lp = { ...(LR.lp || {}), cls: { [id]: { items: Object.fromEntries(done.map(i => [i.id, i.type === 'quiz' ? { score: 100, tries: [{ score: 100 }] } : { done: true }])) } } }; return a2lRate(c); };
        r.allV = rate(V); r.v12 = rate(V.slice(0, 12)); r.v11 = rate(V.slice(0, 11)); r.onlyQ = rate(Q); [LR.lp, LR.mine] = keep; } return r; }, [id, REF.name]);
    if (shots) await l.screenshot({ path: path.join(shots, `${type}_${dev}_${++si}_learner.png`) }); await l.close();
    if (!lr) P.push('학습자 앱 게시본에 과정 없음'); else { if (!lr.name) P.push('학습자 화면에 과정 이름 없음'); if (lr.n !== 28) P.push(`학습자 앱 항목 ${lr.n}`); if (lr.crit !== 14 || lr.thr !== 80) P.push(`학습자 앱 수료 기준 crit ${lr.crit} thr ${lr.thr}`);
      if (lr.allV != null && (lr.allV !== 100 || lr.v12 < 80 || lr.v11 >= 80 || lr.onlyQ !== 0)) P.push(`학습자 수료율 영상 전부 ${lr.allV} · 영상 12개 ${lr.v12} · 11개 ${lr.v11} · 퀴즈만 ${lr.onlyQ}`); }
    /* ⑦ 성인 PC: 방금 만든 과정 복사해서 시작 */
    if (type === 'adult' && dev === 'pc') { const C2 = T.clicker(p, []); await p.evaluate(() => { try { closeModal(); } catch (e) { } });
      const bk = p.locator('#main [data-act=cls-back]').filter({ visible: true }); if (await bk.count()) await C2.clk(bk.first(), '강좌 목록');
      if (!(await T.enterFlow(p, C2, []))) P.push('복사 확인: 흐름 다시 열기 실패'); else {
        const fr = p.locator('[data-cfgo=fresh]').filter({ visible: true }); if (await fr.count()) await C2.clk(fr.first(), '새로 만들기');
        const cp = btn(/복사해서 시작하기/); if (!(await cp.count())) P.push('[강좌 복사해서 시작하기] 없음'); else { await C2.clk(cp, '복사해서 시작'); await C2.clk(await need(p.locator(`#modal [data-cfcopy="${id}"], .mwrap [data-cfcopy="${id}"]`).first(), '복사할 과정'), '과정 고르기');
          const d = await p.evaluate(() => ({ n: (CF.draft.curriculum || []).length, w: (CF.draft.weekPlan || []).length, by: CF.draft.critBy, days: CF.draft.days, name: CF.draft.name })); if (d.n !== 28 || d.w !== 14 || d.by !== 'video' || +d.days !== 90) P.push('복사해서 시작: ' + JSON.stringify(d)); else log.push(`복사 시작 ${C2.n}클릭 → 차시 ${d.w} · 콘텐츠 ${d.n}`); await shot('7copy'); } } }
    /* F5 ①: 개설 뒤 영상 추가 · 삭제 → 수료 항목 자동 맞춤(저장 시점 · 게시본) */
    if (type === 'adult' && dev === 'pc') { const vs = await p.evaluate(id => { const c = S.classes.find(x => x.id === id); const cr = () => { const K = c.criteria.items || []; return { n: K.length, w: K.reduce((a, x) => a + (+x.w || 0), 0), ids: K.map(k => k.id) }; };
        const add = { id: 'it_f5v', type: 'video', title: '추가 영상', week: 14, src: 'link', link: 'https://example.com/v.mp4' }; c.curriculum.push(add); save(); const a = cr(); const inA = a.ids.includes('it_f5v');
        const V = c.curriculum.filter(i => i.type === 'video'); const gone = [V[0].id, V[1].id]; c.curriculum = c.curriculum.filter(i => !gone.includes(i.id)); const sn = (lsSnapshot().classes || []).find(y => y.id === id) || {}; const b = cr(); const st = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => (localStorage.getItem(k) || '').includes('it_f5v')) || 'null') || 'null');
        return { a: [a.n, a.w, inA], b: [b.n, b.w, gone.some(g => b.ids.includes(g))], snap: [(sn.crit || []).length, (sn.crit || []).reduce((s, x) => s + x.w, 0)], saved: !!st }; }, id);
      if (vs.a[0] !== 15 || vs.a[1] !== 100 || !vs.a[2]) P.push('영상 추가 뒤 수료 항목 ' + JSON.stringify(vs.a)); if (vs.b[0] !== 13 || vs.b[1] !== 100 || vs.b[2]) P.push('영상 삭제 뒤 수료 항목 ' + JSON.stringify(vs.b)); if (vs.snap[0] !== 13 || vs.snap[1] !== 100) P.push('영상 삭제 뒤 게시본 crit ' + JSON.stringify(vs.snap)); else log.push(`영상 추가 → 수료 항목 ${vs.a[0]}(합 ${vs.a[1]}) · 2개 삭제 → ${vs.b[0]}(합 ${vs.b[1]}) · 게시본 crit ${vs.snap[0]}`); }
    if (total > 25) P.push(`클릭 ${total}회(목표 25 이하)`);
    return { P, W, errs, clicks: total, fill: fillClicks, inputs, log };
  } catch (e) { P.push('예외 ' + e.message.split('\n')[0]); return { P, W, errs, clicks: C.n + picks, inputs, log }; } finally { await ctx.close(); }
}

/* F5 ②: 파일 여러 개 한 번에 올리기 — 영상 + 문서(같은 번호 짝짓기 · 남은 문서는 차례로 · 위장 PDF 거절) */
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
async function runDocs(br, base, dev, shots) {
  const P = [], errs = []; const vp = dev === 'm' ? { width: 390, height: 844 } : { width: 1280, height: 900 }; const { ctx, p } = await T.openOrg(br, base, ['adult'], { empty: true, vp, errs }); const C = T.clicker(p, []);
  const btn = (re, scope = '#crsFlow') => T.btnByText(p, re, scope).first(); const need = async (loc, what) => { if (!(await loc.count())) throw new Error(`'${what}' 버튼을 화면에서 찾지 못함`); return loc; };
  const next = async () => { await C.clk(await need(p.locator('#crsFlow [data-cfgo=next]').filter({ visible: true }).last(), '다음'), '다음'); await p.waitForTimeout(300); };
  try { if (!(await T.enterFlow(p, C, []))) throw new Error('흐름 진입 실패'); await p.locator('#crsFlow input[type=text]:visible').first().fill('문서 함께 올리기'); await next();
    await C.clk(await need(btn(/목록 붙여 넣기/), '목록 붙여 넣기'), '목록 붙여 넣기'); await p.locator('#crsFlow [data-cfbulkt]').fill('오리엔테이션\n기초 개념\n응용\n정리'); await C.clk(await need(btn(/이대로 .*만들기/), '이대로'), '이대로'); await next();
    await C.clk(await need(btn(/파일 여러 개 한 번에 올리기/), '파일 여러 개'), '파일 여러 개');
    const acc = await p.locator('#ctFiles').getAttribute('accept'); if (!/\.pdf/.test(acc) || !/\.hwp/.test(acc) || !/\.pptx/.test(acc)) P.push('파일 고르기 accept에 문서 없음: ' + acc);
    const F = [['2강.webm', 'video/webm', WEBM], ['1강 자료.pdf', 'application/pdf', PDF], ['1강.webm', 'video/webm', WEBM], ['2강 자료.pdf', 'application/pdf', PDF], ['3강 정리.pdf', 'application/pdf', PDF], ['위장.pdf', 'application/pdf', WEBM], ['표.xlsx', 'application/vnd.ms-excel', PDF]].map(([name, mimeType, buffer]) => ({ name, mimeType, buffer }));
    await p.setInputFiles('#ctFiles', F); await p.waitForTimeout(300); if (shots) await p.screenshot({ path: path.join(shots, `docs_${dev}_map.png`) });
    const map = await p.locator('#ctSheet .ctb-map li').allInnerTexts(); const errT = await p.locator('#ctSheet .ct-err').allInnerTexts();
    const m1 = map.find(x => /^1/.test(x)) || '', m2 = map.find(x => /^2/.test(x)) || '', m3 = map.find(x => /^3/.test(x)) || '', m4 = map.find(x => /^4/.test(x)) || '';
    if (!(/1강\.webm/.test(m1) && /1강 자료\.pdf/.test(m1))) P.push('1차시 짝짓기: ' + m1.replace(/\s+/g, ' ')); if (!(/2강\.webm/.test(m2) && /2강 자료\.pdf/.test(m2))) P.push('2차시 짝짓기: ' + m2.replace(/\s+/g, ' '));
    if (!/3강 정리\.pdf/.test(m3)) P.push('3차시 문서: ' + m3.replace(/\s+/g, ' ')); if (!/위장\.pdf/.test(m4)) P.push('4차시 문서: ' + m4.replace(/\s+/g, ' '));
    if (!errT.some(x => /표\.xlsx/.test(x))) P.push('지원하지 않는 형식(xlsx) 안내 없음');
    await C.clk(await need(btn(/파일 6개 넣기/, '#ctSheet'), '파일 6개 넣기'), '파일 6개 넣기'); for (let i = 0; i < 60 && await p.locator('#ctSheet').count(); i++) await p.waitForTimeout(250); await p.waitForTimeout(300);
    const dr = await p.evaluate(() => (CF.draft.curriculum || []).map(i => [i.week, i.type, i.file])); const has = (w, ty, f) => dr.some(x => x[0] === w && x[1] === ty && x[2] === f);
    if (!(has(1, 'video', '1강.webm') && has(1, 'doc', '1강 자료.pdf') && has(2, 'video', '2강.webm') && has(2, 'doc', '2강 자료.pdf') && has(3, 'doc', '3강 정리.pdf'))) P.push('넣은 결과 ' + JSON.stringify(dr));
    if (dr.some(x => x[2] === '위장.pdf')) P.push('위장 PDF가 들어감'); if (dr.length !== 5) P.push(`넣은 항목 ${dr.length}개(5 기대)`);
    const toast = await p.evaluate(() => (document.getElementById('toasts') || {}).innerText || ''); if (!/올리지 못했습니다/.test(toast)) P.push('위장 파일 실패 안내 없음: ' + toast.slice(0, 80));
    if (shots) await p.screenshot({ path: path.join(shots, `docs_${dev}_filled.png`) });
    const m = await T.measure(p); if (m.over > 0) P.push(`가로 넘침 ${m.over}px`);
  } catch (e) { P.push('예외 ' + e.message.split('\n')[0]); } finally { await ctx.close(); }
  return { P, errs };
}

(async () => {
  const only = (process.env.REF_ONLY || '').split(',').filter(Boolean); const shots = process.env.CRS_SHOTS || ''; if (shots) fs.mkdirSync(shots, { recursive: true });
  const { srv, base } = await T.serve(); const br = await chromium.launch(); let F = 0; const cases = CASES.filter(([t]) => !only.length || only.includes(t));
  for (const [type, dev] of cases) { const r = await run(br, base, type, dev, shots); if (r.errs.length) r.P.push('pageerror ' + [...new Set(r.errs)].slice(0, 2).join(' / '));
    console.log(`${r.P.length ? '✗' : '✓'} ${type} ${dev === 'm' ? '390' : 'PC'}  클릭 ${r.clicks}(차시 채우기 ${r.fill ?? '-'}) · 입력 ${r.inputs}`); r.P.forEach(x => console.log('   ✗ ' + x)); r.W.forEach(x => console.log('   △ ' + x)); if (process.env.REF_LOG) console.log('   경로: ' + r.log.join(' › '));
    if (r.P.length) F++; }
  let nD = 0; if (!only.length || only.includes('docs')) for (const dev of ['pc', 'm']) { nD++; const r = await runDocs(br, base, dev, shots); if (r.errs.length) r.P.push('pageerror ' + [...new Set(r.errs)].slice(0, 2).join(' / ')); console.log(`${r.P.length ? '✗' : '✓'} 문서 함께 올리기 ${dev === 'm' ? '390' : 'PC'}`); r.P.forEach(x => console.log('   ✗ ' + x)); if (r.P.length) F++; }
  await br.close(); srv.close(); const tot = cases.length + nD; console.log(F ? `✗ crs-ref 실패 ${F}/${tot}` : `✓ crs-ref 통과 ${tot}/${tot}`); process.exit(F ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
