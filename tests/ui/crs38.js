'use strict';
/* v38 실사용 QA 수정(F4) 회귀 — 과정 만들기 흐름 · AI SAM 지시 이해 · 콘텐츠 채우기 · 개설/공개 상태.
   U-2 · U-3 · U-4 · U-5 · U-6 · U-11 · U-15 / A-3 · A-4 · A-5 · A-6 · A-8 · A-12 · A-13 · A-16 · A-19 / C-5 · C-14 · C-16 / V-11 · V-13 / P-2 · P-4 · P-5 · P-6 · P-17
   사용: node tests/ui/crs38.js */
const { chromium } = require('playwright');
const { serve, openOrg } = require('./crs-flow.js');

const P = []; let pass = 0; const ok = (c, m) => { if (c) pass++; else P.push(m); console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); };
const BAD_Q = /요점이다|「왜 필요할까요\?」|「핵심 개념」에 해당|현장에서 자주 마주치는 문제|「[^」]*\d+:?\s*시작하기」/; /* 차시 순서 문항(「시작하기」 바로 다음…)은 뜻이 통하므로 허용 */

/* 흐름을 끝까지: [다음]만 누르고 [개설하기] */
async function runFlow(p, prefill, from = 'menu') {
  await p.evaluate(([pf, from]) => { try { CF.dropDraft(); } catch (e) { } CF.open({ fresh: true, from, prefill: pf }); }, [prefill, from]);
  for (let i = 0; i < 8; i++) { const done = await p.evaluate(() => { const c = CF.cur(); if (!c) return true; if (c.i === c.n - 1) return true; CF.next(); return false; }); if (done) break; await p.waitForTimeout(120); }
}
const draft = p => p.evaluate(() => JSON.parse(JSON.stringify(CF.draft || {})));
async function create(p) { await p.click('#crsFlow [data-cfgo=create]'); await p.waitForTimeout(400); const m = await p.$('#modal [data-mact=go]'); if (m) { await m.click(); await p.waitForTimeout(400); } return p.evaluate(() => { const c = CF.last; return c && JSON.parse(JSON.stringify(c)); }); }

(async () => {
  const { srv, base } = await serve(); const br = await chromium.launch(); const errs = [];
  try {
    /* ── 대학 lite ── */
    { const { ctx, p } = await openOrg(br, base, ['univ', 'lite'], { empty: true, errs });
      const q1 = '비교과 프로그램 「AI 글쓰기 클리닉」 4주로 만들어줘. 신청은 11월 25일까지, 정원 20명';
      const r = await p.evaluate(q => { const x = CSAM.parse(q); return { one: CSAM.isOne(q), ...x }; }, q1);
      ok(r.one, `U-2 한 줄 지시를 과정 만들기로 이해(${r.one})`);
      ok(r.name === 'AI 글쓰기 클리닉' && r.sessions === 4 && r.cap === 20 && /-11-25$/.test(r.rTo || '') && r.rdays === 'custom' && r.credit === 0, `U-2 이름 · 4주 · 마감 · 정원 · 학점 없음 추출 ${JSON.stringify({ n: r.name, s: r.sessions, cap: r.cap, rTo: r.rTo, cr: r.credit })}`);
      await p.evaluate(q => chatSend(q), q1); await p.waitForTimeout(900);
      const d1 = await draft(p); const msg = await p.evaluate(() => (S.chat.slice(-1)[0] || {}).text || '');
      ok(d1.name === 'AI 글쓰기 클리닉' && +d1.sessions === 4 && +d1.cap === 20 && d1.rTo && +d1.credit === 0, `U-2 확인 화면에 채움 ${JSON.stringify({ n: d1.name, s: d1.sessions, cap: d1.cap, rTo: d1.rTo, cr: d1.credit })}`);
      ok(/신청 마감 11월 25일/.test(msg) && /정원 20명/.test(msg), `U-2 답에 마감 · 정원을 읽었다고 알림: ${msg.slice(0, 120)}`);
      await p.evaluate(() => CF.close(false));
      const r2 = await p.evaluate(() => CSAM.parse('비교과 프로그램 만들어줘'));
      ok(!r2.name && r2.sessions === 4 && r2.credit === 0, `U-2 '비교과 프로그램 만들어줘' → 이름 비움 · 4주 · 학점 없음 ${JSON.stringify(r2)}`);
      /* 흐름: [비교과] 이름 · 특강 기본값 · 정원 칸 · 지난 신청 기간 경고 · 콘텐츠 0 → 준비 중 */
      await runFlow(p, { name: '[비교과] 생성형 AI 활용 역량 특강' });
      const d2 = await draft(p); ok(+d2.sessions === 4 && +d2.credit === 0 && +d2.per === 1, `U-6 이름에 특강 → 4주 · 학점 없음 · 주 1차시 ${JSON.stringify({ s: d2.sessions, cr: d2.credit, per: d2.per })}`);
      await p.evaluate(() => { CF.open({ resume: true, _asked: true }); });
      await p.evaluate(() => { let c = CF.cur(); while (c && c.i > 0 && CF.cur().id !== 'setup') { CF.prev(); c = CF.cur(); } });
      await p.waitForTimeout(200); const capF = await p.$('#crsFlow [data-cff=cap]'); ok(!!capF, 'U-4 개강 · 공개 단계에 정원 칸');
      await p.evaluate(() => { const d = CF.draft; d.rdays = 'custom'; d.rFrom = '2026-11-01'; d.rTo = '2026-11-10'; CF.repaint(); }); await p.waitForTimeout(150);
      await p.evaluate(() => { const set = (k, v) => { const el = document.querySelector(`#crsFlow [data-cf=${k}]`); if (el) el.value = v; }; set('cap', '30'); set('rFrom', '2026-11-01'); set('rTo', '2026-11-10'); CF.next(); });
      await p.waitForTimeout(250); const pv = await p.evaluate(() => document.querySelector('#crsFlow .cf-body').innerText);
      ok(/신청 마감일\(11월 10일\)이 이미 지났습니다/.test(pv), 'U-15 지난 신청 마감일 경고');
      ok(/준비 중\(비공개\)/.test(pv), 'P-4 확인 화면: 콘텐츠 없이 개설하면 준비 중(비공개) 안내');
      await p.evaluate(() => { const d = CF.draft; d.rFrom = typeof today === 'function' ? today() : d.rFrom; d.rTo = '2026-12-31'; CF.repaint(); });
      const c = await create(p);
      ok(c && c.name === '[비교과] 생성형 AI 활용 역량 특강', `U-5 대괄호 머리말 유지: ${c && c.name}`);
      ok(c && c.status === '준비중' && c.open === '비공개' && c.crs && c.crs.hold, `U-3 · P-4 콘텐츠 0 → 준비 중 · 비공개 ${c && [c.status, c.open]}`);
      ok(c && c.recruit && +c.recruit.cap === 30, `U-4 정원 저장 ${c && c.recruit && c.recruit.cap}`);
      ok(c && c.period && c.period.mode === 'range' && c.period.days === 28, `U-6 수강 기간 = 4주(28일) ${c && JSON.stringify(c.period)}`);
      const dn = await p.evaluate(() => document.querySelector('#crsFlow .cf-done')?.innerText || '');
      ok(/준비 중\(비공개\)/.test(dn) && /내용을 넣은 뒤/.test(dn), 'A-6 · U-3 완료 창: 준비 중 안내 · 3번은 채운 뒤 공개');
      /* 빈 과정 배정 → 알림 보류 · 공개 막힘 → AI 채우기 → 공개 → 알림 */
      const g = await p.evaluate(id => { S.members = S.members || []; const m = { id: 'mx1', name: '20269999', grade: '정회원', email: '', group: '' }; S.members.push(m); const c = S.classes.find(x => x.id === id);
        c.learners.push('mx1'); /* 권한 부여 함수 내부 after와 같은 처리: 직접 호출 */ return 1; }, c.id);
      const notif0 = await p.evaluate(id => { const c = S.classes.find(x => x.id === id); c.learners = []; return 1; }, c.id);
      await p.evaluate(id => { UI.cls = id; UI.clsT = 'curriculum'; go('class'); }, c.id); await p.waitForTimeout(400);
      await p.evaluate(id => { const sel = m => true; window.pickTargets = (t, a, go2) => go2(['mx1']); ACT['cls-grant']({ dataset: { v: id } }); }, c.id); await p.waitForTimeout(300);
      const ib0 = await p.evaluate(() => (S.inbox && S.inbox.mx1 || []).length);
      ok(ib0 === 0, `U-3 콘텐츠 없는 과정 배정 → '지금 바로 수강' 알림 보내지 않음(${ib0})`);
      await p.evaluate(id => ACT['c2-golive']({ dataset: { v: id } }), c.id); await p.waitForTimeout(200);
      const st1 = await p.evaluate(id => { const c = S.classes.find(x => x.id === id); return [c.status, c.open]; }, c.id);
      ok(st1[0] === '준비중' && st1[1] === '비공개', `P-4 콘텐츠 없이 [운영 시작하기] 막음 ${st1}`);
      const note = await p.evaluate(() => document.querySelector('#main .c2ready')?.innerText || '');
      ok(/콘텐츠가 없어/.test(note), `U-3 과정 상세 머리: 무엇을 채우면 공개되는지 ${note.slice(0, 60)}`);
      const fl = await p.evaluate(id => { ACT['ai-fill']({ dataset: { v: id } }); const c = S.classes.find(x => x.id === id); return { n: c.curriculum.length, qs: c.curriculum.filter(x => x.qs).flatMap(x => x.qs.map(q => q.q)), weeks: new Set(c.curriculum.map(x => x.week)).size }; }, c.id);
      ok(fl.n >= 8 && fl.weeks === 4, `A-3 · C-5 빈 주차 4개에 콘텐츠 채움(항목 ${fl.n})`);
      ok(!fl.qs.some(q => BAD_Q.test(q)), `A-4 채운 퀴즈에 뜻 없는 문항 없음 ${fl.qs.filter(q => BAD_Q.test(q)).slice(0, 2)}`);
      await p.evaluate(id => ACT['c2-golive']({ dataset: { v: id } }), c.id); await p.waitForTimeout(200);
      const st2 = await p.evaluate(id => { const c = S.classes.find(x => x.id === id); return [c.status, c.open, (S.inbox.mx1 || []).map(x => x.title).join('|')]; }, c.id);
      ok(st2[0] === '운영중' && st2[1] !== '비공개' && /수강을 시작할 수 있습니다/.test(st2[2]), `U-3 채운 뒤 공개 → 그때 알림 ${st2}`);
      await ctx.close(); }

    /* ── 성인: 채우기 · 문항 · 차시 제목 · 칩 · 대화로 넣기 ── */
    { const { ctx, p } = await openOrg(br, base, ['adult'], { empty: true, errs });
      await runFlow(p, { name: 'ITQ 엑셀 자격증 8주 완성', sessions: 10 });
      const wp = await draft(p); const T = (wp.weekPlan || []).map(w => w.title);
      ok(T.length === 10 && !T.some(t => t.startsWith('ITQ')), `A-12 차시 제목이 강좌명으로 시작하지 않음: ${T.slice(0, 2).join(' / ')}`);
      const c = await create(p); ok(c && c.status === '준비중', 'A-5 콘텐츠 없는 강좌는 준비 중');
      const qs = await p.evaluate(() => { const L = AI.questions('ITQ 엑셀 자격증 8주 완성 1: 시작하기', 30); return L.map(q => q.q); });
      ok(!qs.some(q => BAD_Q.test(q)), `A-4 규칙 문항에 뜻 없는 문장 없음 ${qs.filter(q => BAD_Q.test(q)).slice(0, 2)}`);
      ok(new Set(qs.map(q => q.replace(/^\d+\.\s*/, ''))).size >= 15, `A-4 문항이 되풀이되지 않음(서로 다른 ${new Set(qs.map(q => q.replace(/^\d+\.\s*/, ''))).size}개)`);
      ok(qs.some(q => /SUM|\$A\$1|엑셀|피벗/.test(q)), 'A-4 엑셀 주제 문항 포함');
      /* 대화: 빈 차시 채워줘 · 영상 2개랑 퀴즈 하나 */
      await p.evaluate(() => { location.hash = ''; go('home'); }); await p.waitForTimeout(300);
      await p.evaluate(() => chatSend('ITQ 엑셀 자격증 8주 완성 빈 차시 채워줘')); await p.waitForTimeout(900);
      const f1 = await p.evaluate(id => S.classes.find(x => x.id === id).curriculum.length, c.id);
      ok(f1 > 10, `P-5 '빈 차시 채워줘'를 이해해 채움(항목 ${f1})`);
      const n0 = await p.evaluate(id => S.classes.find(x => x.id === id).curriculum.length, c.id);
      await p.evaluate(() => chatSend('ITQ 엑셀 자격증 8주 완성에 영상 2개랑 확인 퀴즈 하나 넣어줘')); await p.waitForTimeout(900);
      const f2 = await p.evaluate(id => { const L = S.classes.find(x => x.id === id).curriculum; return { n: L.length, last: (S.chat.slice(-1)[0] || {}).text || '' }; }, c.id);
      ok(f2.n === n0 + 3 && /영상 2개 · 확인 퀴즈 1개/.test(f2.last), `P-6 영상 2개 + 퀴즈 1개 넣기(${f2.n - n0}) ${f2.last.slice(0, 60)}`);
      /* 과정 상세 칩 · 유형 칩 */
      const fq = await p.evaluate(id => { UI.cls = id; CUR.tab = 'class'; const a = FILLQ().class; UI.cls = null; const b = FILLQ().class; return [a, b]; }, c.id);
      ok(/ITQ 엑셀 자격증 8주 완성/.test(fq[0]) && !/업무 자동화/.test(fq[0] + fq[1]), `A-13 · P-5 상세 칩은 그 강좌 기준: ${fq[0]}`);
      /* 조사 */
      const jo = await p.evaluate(() => [tj('cls', '을')]); ok(/강좌를/.test(jo[0]), `A-19 조사 ${jo}`);
      await ctx.close(); }

    /* ── 직업훈련: 평가 없는 과정 경고 · 칩 · 한 줄 지시 ── */
    { const { ctx, p } = await openOrg(br, base, ['voc'], { empty: true, errs });
      const r = await p.evaluate(() => { const q = '용접기능사 실기 훈련과정 20차시로 만들어줘. 최종평가 넣고'; return { one: CSAM.isOne(q), ...CSAM.parse(q), chip: FILLQ().class }; });
      ok(r.one && r.name === '용접기능사 실기' && r.sessions === 20, `V-11 한 줄 지시 이해 ${JSON.stringify({ one: r.one, n: r.name, s: r.sessions })}`);
      ok(/용접|훈련과정/.test(r.chip) && !/업무 자동화/.test(r.chip), `V-11 [훈련과정 만들기] 칩 문장: ${r.chip}`);
      await runFlow(p, { name: '설비 점검 기초' }); const pv = await p.evaluate(() => document.querySelector('#crsFlow .cf-body').innerText);
      ok(/평가\(시험\)가 없습니다/.test(pv), 'V-13 평가 없는 직업훈련 과정 경고');
      await p.evaluate(() => CF.close(false)); await ctx.close(); }

    /* ── 기업: 홈 칩 이름 · 공공: 설문 ── */
    { const { ctx, p } = await openOrg(br, base, ['corp'], { empty: true, errs });
      const q = await p.evaluate(() => FILLQ().class); const r = await p.evaluate(q => CSAM.parse(q), q);
      ok(!/업무 자동화/.test(q) && r.name && r.name.length >= 4, `C-14 칩 과정 이름이 잘리지 않음: ${q} → ${r.name}`);
      await ctx.close(); }
    { const { ctx, p } = await openOrg(br, base, ['public'], { empty: false, errs });
      const sv = await p.evaluate(() => { const F = FILL.find(f => f.id === 'survey'); const c = S.classes[0] || makeCourse({ topic: '시민 디지털 역량 기초', weeks: 4 }); const n0 = c.curriculum.length; F.run({ tc: () => c, target: () => c.name, q: '' }); const it = c.curriculum.filter(x => x.type === 'survey').slice(-1)[0]; return it.qs.map(x => x.t); }).catch(e => 'ERR ' + e.message);
      ok(Array.isArray(sv) && sv[4] === 'text' && sv[0] === 'likert', `P-2 만족도 설문 자유 의견은 글 응답 ${sv}`);
      await ctx.close(); }
    /* ── 복사(다음 기수) · 빈 스튜디오 디지털북 · 현황 법정 문구 · 규정 점검표 ── */
    { const { ctx, p } = await openOrg(br, base, ['voc'], { empty: true, errs });
      const r = await p.evaluate(() => { const c = makeCourse({ topic: '설비 점검 기초', weeks: 4 }); c.status = '운영중'; c.open = '전체'; UI.cls = c.id; go('class'); const btn = !!document.querySelector('#main .phr [data-act=cls-copy]');
        ACT['cls-copy']({ dataset: { v: c.id } }); const n = S.classes[0]; ACT['cls-copy']({ dataset: { v: n.id } }); const m = S.classes[0]; return { btn, n: [n.name, n.open, n.status], m: m.name, books: ((S.lsite || {}).dbooks || []).length }; });
      ok(r.btn, 'U-11 과정 상세 머리에 [복사해 다음 기수 만들기]');
      ok(r.n[0] === '설비 점검 기초 2기' && r.n[1] === '비공개' && r.n[2] === '준비중' && r.m === '설비 점검 기초 3기', `P-17 복사본은 비공개 · 준비 중 · 기수 증가 ${JSON.stringify(r)}`);
      ok(r.books === 0, `A-8 빈 스튜디오에 샘플 디지털북 없음(${r.books})`);
      const cp = await p.evaluate(() => { S.classes.forEach(c => { c.curriculum = c.curriculum.filter(i => i.type !== 'exam'); }); go('compliance'); return document.querySelector('#main').innerText; });
      ok(!/시험 문제 수 충족/.test(cp) || /평가 없는 과정/.test(cp), 'V-13 규정 점검: 평가 없는 과정을 충족으로 표시하지 않음');
      await ctx.close(); }
    { const { ctx, p } = await openOrg(br, base, ['public'], { empty: true, errs });
      const d = await p.evaluate(() => { go('dash'); return document.querySelector('#main').innerText; });
      ok(!/법정의무교육 미이수\s*0\s*명[^]*마감 전 안내가 필요합니다/.test(d), 'P-16 법정 과정이 없으면 마감 전 안내 문구 없음');
      await ctx.close(); }
    /* ── 평생교육: 정원 · 대기자 · 결제 미연결 · 유료 템플릿 · 분류 낱말 이름 ── */
    { const { ctx, p } = await openOrg(br, base, ['lifelong'], { empty: true, errs });
      const tp = await p.evaluate(() => { const t = CF.cfg.lifelong.templates.find(x => x.id === 'l-barista'); return t.prefill.price; }); ok(tp > 0, `L-9 유료 템플릿 학습비 채움(${tp})`);
      await p.evaluate(() => { S.settings.pg = 'none'; if (S.settings.toss) S.settings.toss.status = '미가입'; });
      await runFlow(p, { name: '바리스타 2급 자격 준비', price: 180000, paid: true });
      const pv = await p.evaluate(() => document.querySelector('#crsFlow .cf-body').innerText); ok(/결제가 아직 연결되지 않았습니다/.test(pv), 'L-3 결제 미연결 유료 강좌 개설 경고');
      await p.evaluate(() => { CF.close(false); });
      const w = await p.evaluate(() => { const c = makeCourse({ topic: '수채화 취미반', weeks: 4 }); c.recruit.cap = 1; const m1 = { id: 'mw1', sid: 'mw1', name: '순자', grade: '정회원' }, m2 = { id: 'mw2', sid: 'mw2', name: '영수', grade: '정회원' }; S.members.push(m1, m2); c.learners = ['mw1'];
        LPX['wait-req']({ who: 'mw2', data: { cls: c.id } }); const n1 = (c.waits || []).length; UI.cls = c.id; UI.clsT = 'learners'; go('class'); const card = !!document.querySelector('.cf-waits');
        ACT['cf-wait-up']({ dataset: { c: c.id, v: 'mw2' } }); const ok2 = document.querySelector('#modal [data-mact=ok]'); if (ok2) ok2.click(); return { n1, card, L: c.learners.slice(), cap: c.recruit.cap, ib: ((S.inbox || {}).mw2 || []).map(x => x.title) }; });
      ok(w.n1 === 1 && w.card, `L-2 대기 신청 → 운영자 대기자 명단 ${JSON.stringify(w)}`);
      ok(w.L.includes('mw2') && w.cap === 2 && /자리가 났습니다/.test(w.ib.join()), 'L-2 정원 늘리고 올리기 + 알림');
      const nm = await p.evaluate(() => { const r = typeof siPlan === 'function' ? siPlan('평생교육 강좌 3개 만들어줘') : null; return JSON.stringify(r && r.steps ? r.steps.map(x => x.need || x.siNeed || x.names || x.l) : r).slice(0, 300); });
      ok(!/평생교육 1/.test(nm), `L-11 '평생교육 1 · 2 · 3' 이름을 만들지 않음 ${nm}`);
      await ctx.close(); }
    /* ── 2차(R2): 공개 전 알림 보류 · 공개 제안 · 칩 이름 · 승인 버튼 · 지난 신청 기간 · 차시 제목 · 퀴즈마다 다른 문항 · 어르신 문구 · 쿠폰 · 대기 신청(방문자) ── */
    { const { ctx, p } = await openOrg(br, base, ['corp'], { empty: false, errs });
      await runFlow(p, { name: '개인정보 보호 교육', sessions: 2 }); const c = await create(p); await p.evaluate(() => { try { document.querySelector('#crsFlow [data-cfdone=close]').click(); } catch (e) { } });
      const r1 = await p.evaluate(id => { const c = S.classes.find(x => x.id === id); c.legal = true; if (!S.members.length) S.members.push({ id: 'mz1', sid: 'mz1', name: '김점검', grade: '정회원', group: '' }); const m = S.members[0]; window.pickTargets = (t, a, go2) => go2([m.id]); ACT['cls-grant']({ dataset: { v: id } }); const ib = ((S.inbox || {})[m.id] || []).filter(x => x.title.includes(c.name)).length; const lg = legalUndone().filter(x => x.c.id === id).length; return { ib, lg, mid: m.id }; }, c.id);
      ok(r1.ib === 0 && r1.lg === 0, `C-R1 준비 중 · 비공개 과정은 배정 알림 · 법정 독려 대상 아님 ${JSON.stringify(r1)}`);
      await p.evaluate(id => { UI.cls = id; UI.clsT = 'curriculum'; go('class'); ACT['ai-fill']({ dataset: { v: id } }); }, c.id); await p.waitForTimeout(600);
      const md = await p.evaluate(() => (document.querySelector('#modal') || {}).innerText || ''); ok(/이제 공개할까요/.test(md), 'C-R1 콘텐츠를 채우면 [운영 시작 · 공개]를 바로 제안');
      await p.click('#modal [data-mact=ok]'); await p.waitForTimeout(300);
      const r2 = await p.evaluate(([id, mid]) => { const c = S.classes.find(x => x.id === id); return { st: c.status, open: c.open, ib: ((S.inbox || {})[mid] || []).filter(x => x.title.includes(c.name)).length, lg: legalUndone().filter(x => x.c.id === id).length }; }, [c.id, r1.mid]);
      ok(r2.st === '운영중' && r2.open !== '비공개' && r2.ib === 1 && r2.lg === 1, `C-R1 공개하는 순간 보류 알림 발송 · 독려 대상 포함 ${JSON.stringify(r2)}`);
      const c14 = await p.evaluate(() => { const q = '업무 자동화 기초 6차시 과정 만들어줘'; return { one: CSAM.isOne(q), n: CSAM.parse(q).name }; }); ok(c14.one && c14.n === '업무 자동화 기초', `C-14 '업무 자동화 기초'를 자르지 않음 ${JSON.stringify(c14)}`);
      await p.evaluate(() => { go('home'); chatSend('14일 미접속자에게 독려 메시지 보내줘'); }); await p.waitForTimeout(900);
      const bt = await p.evaluate(() => [...document.querySelectorAll('[data-act=plan-ok]')].map(b => b.textContent.trim())); ok(bt.length && bt.every(x => x === '승인하고 실행'), `P-20 승인 버튼 문구 통일 ${bt}`);
      await ctx.close(); }
    { const { ctx, p } = await openOrg(br, base, ['univ', 'lite'], { empty: true, errs });
      await runFlow(p, { name: '취업 특강', sessions: 4 }); await p.evaluate(() => { const d = CF.draft; d.rdays = 'custom'; d.rFrom = '2026-11-01'; d.rTo = '2026-11-10'; });
      await p.click('#crsFlow [data-cfgo=create]'); await p.waitForTimeout(400); const md = await p.evaluate(() => (document.querySelector('#modal') || {}).innerText || '');
      ok(/신청 기간이 이미 끝났습니다/.test(md), 'U-15 지난 신청 마감일이면 개설 전에 묻는다'); await p.click('#modal [data-mact=fix]'); await p.waitForTimeout(200);
      const d = await draft(p); ok(d.rTo >= '2026-11-11', `U-15 [오늘부터 2주로 고치기] ${d.rFrom}~${d.rTo}`); await p.evaluate(() => CF.close(false)); await ctx.close(); }
    { const { ctx, p } = await openOrg(br, base, ['adult'], { empty: true, errs });
      const T = await p.evaluate(() => CF.planFrom({ name: 'ITQ 엑셀 자격증 8주 완성', sessions: 12 }).map(w => w.title)); ok(new Set(T).size === 12 && !T.some(t => /—|\s\d+$|ITQ/.test(t)) && T.every(t => t.length <= 12), `A-12 차시 제목이 짧고 모두 다름 ${T.join(' / ')}`);
      const q = await p.evaluate(() => { const c = makeCourse({ topic: '엑셀 실무 기초', weeks: 4 }); c.curriculum = []; ACT['ai-fill']({ dataset: { v: c.id } }); try { closeModal(); } catch (e) { } return c.curriculum.filter(i => i.type === 'quiz').map(i => (i.qs || []).map(x => x.q.replace(/^\d+\.\s*/, '')).join('|')); });
      ok(q.length >= 3 && new Set(q.map(x => x.split('|')[0])).size === q.length, `8 퀴즈마다 첫 문항이 다름 ${q.map(x => x.split('|')[0].slice(0, 18)).join(' / ')}`);
      const h = await p.evaluate(() => { S.org.name = '늘봄 컴퓨터 교실'; return SITEGEN('').sections[0]; }); ok(!/실무에 바로 쓰는/.test(JSON.stringify(h)), 'A-20 어르신 교실에는 실무 문구 대신 생활 문구');
      await ctx.close(); }
    { const { ctx, p } = await openOrg(br, base, ['adult'], { empty: false, errs });
      const pr = await p.evaluate(() => { S.settings.pg = 'toss'; S.settings.toss = Object.assign(S.settings.toss || {}, { status: '승인', stage: 99 }); const c = S.classes.find(x => (x.curriculum || []).length && x.kind !== 'sub' && x.kind !== 'episode') || makeCourse({ topic: '엑셀 실무', weeks: 4 }); c.status = '운영중'; c.open = '전체'; c.price = 100000; c.discount = { on: false, type: 'rate', v: 0, until: '' }; if (c.recruit) c.recruit.early = { on: false, until: '', rate: 0 };
        S.coupons = [{ id: 'k1', code: 'WELCOME10', type: 'rate', v: 10, until: '2099-12-31', max: 0, cls: [], on: true }]; go('sales'); const card = !!document.querySelector('.cpn-card');
        if (!S.members.some(m => m.id === 'mt8')) S.members.push({ id: 'mt8', sid: 'T9002', name: '다른 학습자', grade: '정회원', group: '' }); const L = S.members.find(m => m.id === 'mt8'); const n0 = S.pays.length; LPX.pay({ who: L.sid || L.id, at: new Date().toISOString(), data: { payId: 'pay-t1', itemType: 'class', ref: c.id, amount: 1, cpn: 'welcome10', status: '결제 완료' } }); const py = S.pays.find(x => x.id === 'pay-t1');
        const code = { sid: 'T9001', code: 'ABC234', at: today(), dept: '' }; S.codes = (S.codes || []).concat([code]); if (!S.members.some(m => m.sid === 'T9001')) S.members.push({ id: 'mt9', sid: 'T9001', name: '쿠폰 학습자', nick: '쿠폰', grade: '정회원', group: '', joined: today() }); if (S.members.length < 3) S.members.push({ id: 'mt8', sid: 'T9002', name: '다른 학습자', grade: '정회원', group: '' }); const cap = S.classes.find(x => x.id !== c.id && (x.curriculum || []).length && x.kind !== 'sub' && x.kind !== 'episode') || makeCourse({ topic: '파워포인트 실무', weeks: 4 }); if (cap) { cap.status = '운영중'; cap.open = '전체'; if (!cap.learners.length) cap.learners.push(S.members.find(m => m.sid !== code.sid).id); cap.recruit = Object.assign(cap.recruit || {}, { on: false, cap: Math.max(1, cap.learners.length) }); }
        save(); (typeof smPublish === 'function' ? smPublish : ACT['ls-pub'])(); return { card, amt: py && py.amount, off: py && py.cpnOff, cid: c.id, code, tid: DREG.cur(), capId: cap && cap.id, capMid: cap && cap.learners.includes((S.members.find(m => m.sid === code.sid) || {}).id) }; });
      await p.waitForTimeout(300); { const pm = await p.$('#modal [data-mact=ok]'); if (pm) { await pm.click(); await p.waitForTimeout(200); } }
      ok(pr.card && pr.amt === 90000 && pr.off === 10000, `A-17 운영자 쿠폰 카드 · 결제 기록 때 쿠폰을 다시 계산 ${JSON.stringify({ card: pr.card, amt: pr.amt, off: pr.off })}`);
      const lp = await ctx.newPage(); lp.on('pageerror', e => errs.push('ln: ' + e.message)); await lp.goto(base + `learner.html?t=${pr.tid}#class/${pr.capId}`); await lp.waitForTimeout(900);
      const v1 = await lp.evaluate(() => document.querySelector('main, #lm, body').innerText); ok(/정원 마감/.test(v1) && /로그인하고 대기 신청하기/.test(v1), `L-1 · L-2 방문자: 정원 마감 + 로그인하고 대기 신청 ${(v1.replace(/\s+/g, ' ').match(/수강 신청:.{0,160}/) || [''])[0]}`);
      await lp.evaluate(id => { location.hash = '#class/' + id; }, pr.cid); await lp.waitForTimeout(500); const dl = await lp.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => /배울 수 있는 내용/.test(x.textContent)); const n = h && h.nextElementSibling; const box = h ? h.parentElement.innerText : ''; return { ul: !!document.querySelector('.shp-dl li'), raw: /(^|\n)\s*- \S/.test(box) || /\[교육 목표\]/.test(box) }; });
      ok(dl.ul && !dl.raw, `C-16 과정 소개의 '- ' · '[교육 목표]'를 목록 · 제목으로 ${JSON.stringify(dl)}`);
      await lp.evaluate(async c => { await LR.api.login(c.sid, c.code); lrender(); }, pr.code); await lp.evaluate(id => { location.hash = '#pay/class/' + id; }, pr.cid); await lp.waitForTimeout(600);
      await lp.fill('#shpPay [name=cpn]', 'welcome10'); await lp.click('#shpPay [data-lcpn]'); await lp.waitForTimeout(300);
      const tot = await lp.evaluate(() => [document.querySelector('#p26cpm').textContent, document.querySelector('.p26amt dd.tot').textContent]); ok(/적용/.test(tot[0]) && /90,000/.test(tot[1]), `A-17 학습자 결제 화면 쿠폰 적용 ${tot}`);
      await lp.fill('#shpPay [name=cpn]', 'nope'); await lp.click('#shpPay [data-lcpn]'); await lp.waitForTimeout(300); const bad = await lp.evaluate(() => [document.querySelector('#p26cpm').textContent, document.querySelector('.p26amt dd.tot').textContent]); ok(/없는 쿠폰/.test(bad[0]) && /100,000/.test(bad[1]), `A-17 틀린 코드는 원래 금액 ${bad}`);
      if (!pr.capMid) { await lp.evaluate(id => { location.hash = '#class/' + id; }, pr.capId); await lp.waitForTimeout(500); const wb = await lp.$('[data-lwait]'); ok(!!wb, 'L-2 로그인 학습자: [대기 신청하기]'); if (wb) { await wb.click(); await lp.waitForTimeout(300); } }
      await p.reload(); await p.waitForFunction(() => window.S && S.org); await p.waitForTimeout(900); const ws = await p.evaluate(id => ((S.classes.find(c => c.id === id) || {}).waits || []).length, pr.capId); ok(pr.capMid || ws === 1, `L-2 운영자 대기자 명단에 들어옴(${ws})`);
      await ctx.close(); }
  } catch (e) { console.error(e); P.push('예외: ' + e.message); }
  ok(!errs.length, `pageerror 0 ${errs.slice(0, 3)}`);
  await br.close(); srv.close();
  console.log(`\n${pass} 통과 · ${P.length} 실패`); if (P.length) { P.forEach(x => console.log(' - ' + x)); process.exit(1); }
})();
