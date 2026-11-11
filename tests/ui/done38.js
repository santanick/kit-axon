'use strict';
/* v38 수료 판정 한 곳(mods.js clsDone) — 운영자 · HRD-Net · 수료보고 CSV · 엑셀 · 학습자 화면이 같은 값을 쓰는지,
   그리고 V · U · C · A 실사용 QA에서 나온 수료 · 평가 · 출결 · 법정교육 항목이 다시 생기지 않는지 점검한다.
   근거 수치: docs/compliance/README.md(수료 = 진도율 80% · 평가 60점 · 출결 수업 출석률 80%) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1'); await new Promise(k => srv.once('listening', k));
  const B = `http://127.0.0.1:${srv.address().port}`; const browser = await chromium.launch(); const errs = [];
  const open = async (ctx, url, vp) => { const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + url, { waitUntil: 'load' }); return p; };
  const ctx = await browser.newContext(); const a = await open(ctx, '/index.html');
  /* ① 운영자: 직업훈련 — 출석 60% · 진도 100% · 평가 90 은 수료 아님(V3), 같은 화면 출석률 일치(V4), 의심 건 없음(V5), 이름 표시(V6) */
  const R = await a.evaluate(async () => { createOrg('voc', '해운대 훈련원'); const r = {};
    S.members = [0, 1, 2].map(i => ({ id: 'm' + i, sid: 'uabc' + i + 'defghij', name: ['김민수', '이지영', '박준호'][i], group: '', grade: '정회원', joined: today(), last: today(), extra: {}, src: 'bulk' }));
    const past = k => addDays(today(), -10 + k); const off = [0, 1, 2, 3, 4].map(k => ({ id: 'of' + k, type: 'offline', title: '집체 실습 ' + (k + 1), date: past(k) }));
    const ex = { id: 'ex1', type: 'exam', title: '최종평가', time: 30, qs: Array.from({ length: 6 }, (_, i) => ({ t: 'mc', q: 'Q' + i, opts: ['a', 'b'], a: 0, pts: 10 })) };
    S.classes = [{ id: 'c1', name: '설비 훈련과정', kind: 'period', status: '운영중', start: addDays(today(), -20), end: addDays(today(), 20), curriculum: [{ id: 'v1', type: 'video', title: '1차시', cplMin: 1 }, ...off, ex], learners: ['m0', 'm1', 'm2'], prog: { m0: { p: 100, exam: 90, assign: 'none' }, m1: { p: 100, exam: 90, assign: 'none' }, m2: { p: 100, exam: 90, assign: 'none', att: 0 } }, criteria: { threshold: 80 }, hours: 10, enr: {} }];
    const c = S.classes[0]; c.att = {}; const set = (mid, L) => L.forEach((st, k) => { (c.att['of' + k] = c.att['of' + k] || {})[mid] = st; });
    set('m0', ['출석', '출석', '출석', '출석', '출석']); set('m1', ['출석', '출석', '지각', '지각', '지각']); set('m2', ['출석', '결석', '출석', '결석', '지각']);
    r.att = ['m0', 'm1', 'm2'].map(id => clsAtt(c, id)); r.done = ['m0', 'm1', 'm2'].map(id => clsDone(c, id)); r.cpl = ['m0', 'm1', 'm2'].map(id => cplDone(c, id));
    r.low = lowAtt().map(x => x.id); r.lowN = lowAttN();
    go('hrd'); render(); const hrd = document.querySelector('#main').innerText; r.hrdFake = /동일 IP 동시 접속 2건|무입력 40분|연속 입력 간격 3초/.test(hrd); r.hrdNone = /의심 건이 없습니다/.test(hrd); r.hrdLow = (hrd.match(/출석률 80% 미만\s*(\d+)명/) || [])[1]; r.hrdDone = (hrd.match(/수료 요건 충족\s*(\d+)명/) || [])[1];
    const CSV = []; const dl0 = window.downloadCSV; window.downloadCSV = (n, h, rows) => CSV.push({ n, h, rows }); ACT['cpl-rep-csv'](); window.downloadCSV = dl0; r.csv = CSV[0];
    S.org.cpl.on = true; UI.cpl = 'att'; UI.cplC = 'c1'; go('cpl'); render(); const at = document.querySelector('#main').innerText; r.attName = at.includes('박준호') && at.includes('60%'); r.attRawOnly = /^\s*uabc2defghij\s*$/m.test(at);
    UI.cpl = null; go('cpl'); render(); const home = document.querySelector('#main').innerText; r.homeLow = (home.match(/출석률 80% 미만 (\d+)명/) || [])[1];
    /* 평가 없는 과정 경고(V13) */ S.classes.push({ id: 'c2', name: '평가 없는 과정', kind: 'period', status: '운영중', start: today(), end: addDays(today(), 30), curriculum: [{ id: 'v9', type: 'video', title: '1차시' }], learners: [], prog: {}, criteria: { threshold: 80 }, hours: 1, enr: {} });
    r.noEval = cplNoEval().map(x => x.id); r.req = (cplReqList().find(x => /평가\(시험\) 1개 이상/.test(x.label)) || {}).st; S.classes.pop();
    /* 엑셀: 과제 없는 과정은 '—', 출석률은 clsAtt(C11 · V4) */ const cols = OPS36.lCols(c); const iA = cols.indexOf('과제'), iT = cols.indexOf('출석률(%)'); r.xls = c.learners.map(id => OPS36.lRow(c, id)).map(x => [x[iA], x[iT]]);
    /* 자동 발급 대장(C10): 학습 기록 반영 때 수료자만 발급 */ S.certs = []; localStorage.setItem(lpKey(), JSON.stringify(Object.fromEntries(S.members.map(m => [m.sid, { cls: { c1: { items: { v1: { done: true } } } }, at: new Date().toISOString() }])))); lpApply(); await new Promise(k => setTimeout(k, 10)); /* 학습 기록이 들어온 훈련생만 자동 발급 */ r.certs = S.certs.map(x => x.who).sort();
    return r; });
  ok(JSON.stringify(R.att) === '[100,80,60]', '출석률 공용 계산 ' + R.att);
  ok(JSON.stringify(R.done) === '[true,true,false]', 'V3 출석 60%는 수료 아님(진도 100 · 평가 90) ' + R.done);
  ok(JSON.stringify(R.low) === '["m2"]' && R.lowN === 1 && R.hrdLow === '1' && R.homeLow === '1', 'V4 출석률 80% 미만 숫자 일치(출결 · HRD-Net · 한눈에) ' + JSON.stringify([R.low, R.hrdLow, R.homeLow]));
  ok(!R.hrdFake && R.hrdNone, 'V5 꾸며낸 부정훈련 의심 없음');
  ok(R.hrdDone === '2', 'HRD-Net 수료 요건 충족 = clsDone ' + R.hrdDone);
  ok(R.csv && R.csv.h.includes('아이디') && R.csv.rows.some(x => x[1] === '박준호' && x[2] === 'uabc2defghij' && x[x.length - 1] === '미수료'), 'V6 수료보고 CSV 이름 · 아이디 · 판정 ' + JSON.stringify(R.csv && R.csv.rows[2]));
  ok(R.attName && !R.attRawOnly, 'V6 출결 환산 표에 이름');
  ok(R.noEval.includes('c2') && R.req === '설정 필요', 'V13 평가 없는 직업훈련 과정 점검 ' + JSON.stringify(R.noEval) + R.req);
  ok(R.xls.every(x => x[0] === '—') && JSON.stringify(R.xls.map(x => x[1])) === '[100,80,60]', 'C11 엑셀 과제 — · 출석률 ' + JSON.stringify(R.xls));
  ok(JSON.stringify(R.certs) === '["m0","m1"]', 'C10 자동 발급 대장 = 수료자 ' + R.certs);

  /* ② 기업: 법정 이름 → 법정 여부 묻기(C1) · 설정 탭 토글 · 미이수자 독려 0명 차단 · 마감일 포함(C4) */
  const K = await a.evaluate(async () => { createOrg('corp', '해운대정밀'); const r = {}; const scn = (window.CF && CF.cfg && CF.cfg.corp) || null; r.scn = !!scn; if (scn) { const W = scn.check({ name: '2026 직장 내 성희롱 예방교육', cat: 'job', sessions: 2, mins: 30, rate: 80 }); const w = W.find(x => x.k === 'cat' && x.fix && x.fix.cat === 'legal'); r.ask = !!w; }
    S.members = [{ id: 'e1', name: '김지훈', group: '', grade: '정회원', joined: today(), last: today(), extra: {} }];
    S.classes = [{ id: 'l1', name: '직장 내 성희롱 예방교육', kind: 'period', status: '운영중', legal: false, start: today(), end: addDays(today(), 28), curriculum: [{ id: 'd1', type: 'doc', title: '교안' }], learners: ['e1'], prog: { e1: { p: 0 } }, criteria: { threshold: 100 }, enr: {}, recruit: { on: false }, discount: {}, period: { mode: 'days', days: 28 } }];
    ACT['legal-nudge'](); r.zeroModal = !!document.querySelector('#modal');
    const h = c2Settings(S.classes[0]); r.toggle = /data-chg="cls-legal"/.test(h); ACT['cls-legal']({ dataset: { v: 'l1' }, checked: true }); r.legal = S.classes[0].legal;
    ACT['legal-nudge'](); const m = document.querySelector('#modal'); r.body = m ? m.innerText : ''; const b = m && [...m.querySelectorAll('button')].find(x => /보내기/.test(x.textContent)); const n0 = S.msgs.length; if (b) b.click(); r.sent = S.msgs.length - n0;
    return r; });
  ok(!K.scn || K.ask, 'C1 법정 이름이면 법정 의무교육 여부를 묻는다');
  ok(!K.zeroModal, 'C4 대상 0명이면 발송 창을 열지 않음');
  ok(K.toggle && K.legal, 'C1 과정 설정에서 법정 의무교육 지정');
  ok(/이수 마감 \d{4}-\d{2}-\d{2} \(D-28\)/.test(K.body) && K.sent === 1, 'C4 독려 메시지에 마감일 ' + K.body.slice(0, 120));

  /* ③ 학습자: 직업훈련 과정 — 시험 전 '수료' 아님(V7) · 수강평 쓰기 버튼(V1) · 유의사항 ↔ mOTP 반복 없음(V2) · 출석률 안내(V8) · 통과 점수(V9) */
  const P = await a.evaluate(() => { createOrg('voc', '해운대 훈련원'); S.members = [{ id: 'm0', sid: 'T0001', name: '김민수', group: '', grade: '정회원', joined: today(), last: today(), extra: {} }]; S.codes = [{ sid: 'T0001', dept: '1반', code: 'ABC234' }];
    const off = [0, 1, 2, 3, 4].map(k => ({ id: 'of' + k, type: 'offline', title: '집체 ' + (k + 1), date: addDays(today(), -10 + k) }));
    S.classes = [{ id: 'c1', name: '설비 훈련과정', kind: 'period', status: '운영중', start: addDays(today(), -20), end: addDays(today(), 20), curriculum: [{ id: 'v1', type: 'video', title: '1차시', cplMin: 1 }, ...off, { id: 'ex1', type: 'exam', title: '최종평가', time: 30, cplN: 2, qs: Array.from({ length: 6 }, (_, i) => ({ t: 'mc', q: 'Q' + i, opts: ['a', 'b'], a: 0, pts: 10 })) }], learners: ['m0'], prog: { m0: { p: 100 } }, criteria: { threshold: 80 }, hours: 10, enr: {} }];
    const c = S.classes[0]; c.att = {}; ['출석', '결석', '출석', '결석', '지각'].forEach((st, k) => { c.att['of' + k] = { m0: st }; }); S.org.cpl.idv = { phone: false, motp: true };
    c.items = undefined; ACT['ls-pub'](); save(); return { tid: DREG.cur() }; });
  const l = await open(ctx, `/learner.html?t=${P.tid}&cplt=1`); await l.waitForTimeout(400);
  const SHOT = process.env.SHOT; if (SHOT) { await l.evaluate(async () => { await LR.api.login('T0001', 'ABC234'); const M = (LR.lp.cls._cpl = LR.lp.cls._cpl || {}); M.ack = { c1: new Date().toISOString() }; location.hash = '#c/c1/ex1'; lrender(); }); await l.waitForTimeout(400); await l.screenshot({ path: SHOT + '/f3_exam_pc.png', fullPage: true }); await l.setViewportSize({ width: 390, height: 844 }); await l.evaluate(() => { location.hash = '#c/c1/v1'; lrender(); }); await l.waitForTimeout(400); await l.screenshot({ path: SHOT + '/f3_att_390.png', fullPage: true }); await l.setViewportSize({ width: 1280, height: 800 }); await a.evaluate(() => { go('hrd'); render(); }); }
  const L = await l.evaluate(async () => { const r = {}; await LR.api.login('T0001', 'ABC234'); const M = (LR.lp.cls._cpl = LR.lp.cls._cpl || {}); M.ack = { c1: new Date().toISOString() }; M.v = M.v || {}; M.rv = M.rv || {}; const wait = t => new Promise(k => setTimeout(k, t));
    location.hash = '#c/c1/v1'; lrender(); await wait(200); const st = myStats().courses.find(x => x.c.id === 'c1'); r.statDone = st.done; r.att = st.att;
    const ring = document.querySelector('.crsh .ring'); r.ringDone = ring && ring.dataset.done; const pc = document.querySelector('.l26pc'); r.side = pc ? pc.textContent : ''; r.cert = !!document.querySelector('.l26cert, .crsh a[href^="#cert/"]');
    r.kpi = (document.querySelector('.lw-kpi') || {}).innerText || ''; r.warn = !!document.querySelector('.lw-warn'); r.crit = (document.querySelector('.l26crit') || {}).textContent || '';
    location.hash = '#c/c1/ex1'; lrender(); await wait(200); r.why = (document.querySelector('.a2lwhy') || {}).textContent || ''; const rb = document.querySelector('[data-cpl-rv]'); r.rvBtn = !!rb; r.pass = (document.querySelector('.a2linfo') || {}).innerText || '';
    if (rb) { rb.click(); await wait(50); document.getElementById('cplRt').value = '실습이 도움이 됐어요.'; document.getElementById('cplRo').click(); await wait(150); }
    const sb = document.querySelector('[data-a2="start"]'); r.start = !!sb; let loops = 0;
    if (sb) { sb.click(); await wait(50); if (document.getElementById('cplEx')) { document.getElementById('cplEx').click(); await wait(50); }
      for (let i = 0; i < 3 && document.getElementById('cplS'); i++) { document.getElementById('cplS').click(); await wait(60); const code = (document.getElementById('cplC') || {}).textContent; const inp = document.getElementById('cplI'); if (inp) { inp.value = code; document.getElementById('cplOk').click(); } await wait(150); if (document.getElementById('cplEx')) { loops++; document.getElementById('cplEx').click(); await wait(80); } } }
    r.loops = loops; r.running = !!(A2L.run && A2L.run.item === 'ex1'); r.form = !!document.getElementById('a2qz');
    return r; });
  ok(L.statDone === false && L.ringDone === '0' && !/수료/.test(L.side.replace('수료 기준', '')) && !L.cert, 'V7 시험 전 · 출석 60%면 수료 표시 없음 ' + JSON.stringify([L.statDone, L.ringDone, L.side]));
  ok(L.att === 60 && /출석률\s*60%/.test(L.kpi) && L.warn, 'V8 학습자 출석률 · 80% 기준 경고 ' + JSON.stringify([L.att, L.kpi.slice(0, 40)]));
  ok(/평가 60점/.test(L.crit) && /출석 80%/.test(L.crit), 'V9 수료 기준 문구에 평가 · 출석 ' + L.crit);
  ok(/수강평/.test(L.why) && L.rvBtn, 'V1 수강평 관문에 [수강평 쓰기] ' + L.why);
  ok(/60점\(훈련 수료 기준\)/.test(L.pass), 'V9 통과 점수 = 훈련 규정 ' + L.pass.replace(/\n/g, ' ').slice(0, 120));
  ok(L.start && L.loops === 0 && (L.running || L.form), 'V2 유의사항 → mOTP → 문항(반복 없음) ' + JSON.stringify(L));

  /* ④ 학습자 일반 과정: 평가 기준 과정에서 시험 미통과면 '100% 수료' 아님(U1) · 운영자가 '모든 콘텐츠 진도'로 정하면 '진도 80%'(A2) */
  const Q = await a.evaluate(() => { createOrg('adult', '한빛 아카데미'); S.members = [{ id: 'm0', sid: 'T0002', name: '서준', group: '', grade: '정회원', joined: today(), last: today(), extra: {} }]; S.codes = [{ sid: 'T0002', dept: '', code: 'ABC235' }];
    const ex = { id: 'ex1', type: 'exam', title: '중간고사', qs: [{ t: 'mc', q: 'Q', opts: ['a', 'b'], a: 0 }], rules: { pass: { on: true, v: 60 }, retry: { mode: 'count', v: 3 } } };
    S.classes = [{ id: 'u1', name: '교과목', kind: 'period', status: '운영중', start: today(), end: addDays(today(), 30), curriculum: [{ id: 'd1', type: 'doc', title: '교안' }, ex, { id: 'q1', type: 'quiz', title: '퀴즈', qs: [{ t: 'ox', q: 'Q', a: 'O' }], rules: { retry: { mode: 'count', v: 3 } } }], learners: ['m0'], prog: { m0: { p: 100, exam: 31 } }, criteria: { threshold: 80, items: [{ id: 'd1', w: 60 }, { id: 'ex1', w: 40 }] }, enr: {} },
      { id: 'u2', name: '진도 과정', kind: 'period', status: '운영중', start: today(), end: addDays(today(), 30), curriculum: [{ id: 'd2', type: 'doc', title: '교안' }, { id: 'q2', type: 'quiz', title: '퀴즈', qs: [{ t: 'ox', q: 'Q', a: 'O' }] }], learners: ['m0'], prog: { m0: { p: 0 } }, criteria: { threshold: 80, by: 'all', items: [{ id: 'd2', w: 50 }, { id: 'q2', w: 50 }] }, enr: {} }];
    ['u1', 'u2'].forEach(id => { C(id).items = undefined; }); ACT['ls-pub'](); save(); return { tid: DREG.cur(), opDone: clsDone(C('u1'), 'm0') }; });
  const l2 = await open(ctx, `/learner.html?t=${Q.tid}`); await l2.waitForTimeout(300);
  const U = await l2.evaluate(async () => { const r = {}; await LR.api.login('T0002', 'ABC235'); const wait = t => new Promise(k => setTimeout(k, t)); LR.lp.cls.u1 = { items: { d1: { done: true }, ex1: { done: true, score: 31, tries: [{ score: 31 }] } } }; LR.lp.cls.u2 = { items: {} };
    location.hash = '#c/u1/d1'; lrender(); await wait(200); r.side = (document.querySelector('.l26pc') || {}).textContent || ''; r.ring = (document.querySelector('.crsh .ring') || {}).dataset; r.ring = r.ring && r.ring.done; r.stat = myStats().courses.find(x => x.c.id === 'u1').done;
    location.hash = '#c/u2/d2'; lrender(); await wait(200); r.crit2 = (document.querySelector('.l26crit') || {}).textContent || '';
    location.hash = '#c/u2/q2'; lrender(); await wait(200); const t = (document.querySelector('.a2lmain') || document.querySelector('.imain') || {}).innerText || ''; r.quizTxt = t; r.quizStart = !!document.querySelector('[data-a2="start"]'); r.quizForm = !!document.getElementById('a2qz');
    LR.lp.cls.u2.items = { d2: { done: true }, q2: { done: true, score: 0 } }; LR.api.save(); location.hash = '#cert/u2'; lrender(); await wait(200); r.certTxt = (document.querySelector('#lapp') || document.body).innerText; await wait(700); return r; });
  ok(Q.opDone === false && U.stat === false && U.ring === '0' && !/수료$/.test(U.side.trim()), 'U1 시험 31점(통과 60) — 학습자 · 운영자 모두 수료 아님 ' + JSON.stringify([U.side, U.ring, U.stat]));
  ok(/진도 80%/.test(U.crit2) && !/점 이상/.test(U.crit2), "A2 '모든 콘텐츠 진도' 과정 = 진도 80% " + U.crit2);
  ok(!/시험 보기 전에/.test(U.quizTxt) && !/3번 남았어요/.test(U.quizTxt), 'A15 퀴즈는 퀴즈 · 1회 뒤 남은 횟수 ' + U.quizTxt.replace(/\n/g, ' ').slice(0, 160));

  ok(!U.quizStart && U.quizForm, 'L12 확인 퀴즈는 시작 버튼 · 시간 제한 없이 바로 풀기 ' + JSON.stringify([U.quizStart, U.quizForm, U.quizTxt.slice(0, 200)]));
  ok(/닉네임/.test(U.certTxt) && /실명을 입력/.test(U.certTxt), 'C10 · L5 닉네임 수료증이면 실명 입력 안내');
  const CT = await a.evaluate(() => { S.certs = []; lpApply(); return { p: (C('u2').prog.m0 || {}).p, certs: S.certs.filter(x => x.cls === 'u2').map(x => [x.who, !!x.no, !!x.at]) }; });
  ok(JSON.stringify(CT.certs) === '[["m0",true,true]]', 'C10 · L6 학습자 수료 → 운영자 발급 대장(번호 · 발급일) ' + JSON.stringify(CT));
  /* V14 과정 상세 집계(강의 수 · 오프라인 수업 · 영상 시간) · V15 입과하면 '수강 중' */
  const V14 = await a.evaluate(() => { const c = S.classes[0]; c.curriculum = [{ id: 'd1', type: 'doc', title: '교안' }, { id: 'vv', type: 'video', title: '영상', mins: 10 }, { id: 'e1', type: 'exam', title: '시험', qs: [] }, ...[1, 2, 3, 4, 5].map(k => ({ id: 'of' + k, type: 'offline', title: '집체 ' + k }))]; const sn = sl2Snap(); const x = (sn.classes || []).find(y => y.id === c.id) || {}; return { items: x.items, off: x.off, vmin: x.vmin }; });
  ok(V14.items === 3 && V14.off === 5 && V14.vmin === 10, 'V14 강의 수 3 · 오프라인 5 · 영상 10분 ' + JSON.stringify(V14));
  const V15 = await l2.evaluate(() => { LR.lp.cls._cpl = { ack: { u2: new Date().toISOString() } }; LR.lp.cls.u2 = { items: {} }; const x = myStats().courses.find(y => y.c.id === 'u2'); return { started: x.started, p: x.p }; });
  ok(V15.started === true, 'V15 입과(유의사항 확인)하면 진도 0%여도 수강 중 ' + JSON.stringify(V15));
  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
