'use strict';
/* 운영 모드 전 구간: 실제 Node 서버 + PostgreSQL + 학습자 브라우저. 사용: BASE=http://127.0.0.1:8091 node tests/ui/compliance-live.js */
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8091';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const br = await chromium.launch(); const admin = await br.newContext(); const H = { 'x-didisam': '1', origin: B };
  const su = await admin.request.post(B + '/api/signup', { headers: H, data: { email: `lv${Date.now()}@example.com`, password: 'Contract2026x', orgName: '라이브', type: 'voc', code: 'C0DE' } }); const tid = (await su.json()).tenant.tid;
  const rev = (await (await admin.request.get(B + '/api/state')).json()).rev || 0; const qs = Array.from({ length: 6 }, (_, i) => ({ t: 'mc', q: 'Q' + i, opts: ['가', '나'], a: 0, pts: 10 }));
  const itemsPub = [{ id: 'v1', type: 'video', title: '1차시', cplSec: 600, qs: [] }, { id: 'e1', type: 'exam', title: '최종평가', time: 30, cplN: 2, srv: 1, qs: [{ t: 'ph', q: '', opts: [] }, { t: 'ph', q: '', opts: [] }] }];
  const pub = { org: { name: '라이브', type: 'voc' }, terms: {}, pages: [], levels: [{ name: 'L', color: '#123456' }], badges: [], tuts: [], diags: [], notices: [], settings: {}, tracks: [], ctypes: [], types: [], books: [], classes: [{ id: 'c1', name: '과정', level: 0, thr: 80, items: itemsPub }], cpl: { on: true, profile: 'moel-entrust', single: true, dayMax: 8, itemMin: 50, rate: 80, pass: 60, surveyFirst: true, idv: { phone: true, motp: true }, copyThr: 80 } };
  const doc = { org: { name: '라이브', type: 'voc', room: { mode: 'saas' }, cpl: { on: true, single: true, dayMax: 8, pass: 60, profile: 'moel-entrust' } }, codes: [{ sid: 'T0001', dept: '1반', code: 'ABC234' }], members: [{ id: 'm1', sid: 'T0001', name: 'T0001' }], classes: [{ id: 'c1', name: '과정', learners: ['m1'], prog: {}, curriculum: [{ id: 'v1', type: 'video' }, { id: 'e1', type: 'exam', time: 30, cplN: 2, qs }] }], lsite: { pub } };
  const pr = await admin.request.put(B + '/api/state', { headers: H, data: { doc, rev } }); ok(pr.status() === 200, '상태 저장 ' + pr.status());
  const c1 = await br.newContext(); const p = await c1.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(`${B}/learner.html?t=${tid}`, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const R = await p.evaluate(async () => { const r = { mode: LR.mode }; const site = SITE(); r.noAns = !JSON.stringify(site).includes('"a":'); await LR.api.login('T0001', 'ABC234'); r.me = !!LR.me; const c = site.classes[0], it = c.items.find(i => i.id === 'e1');
    location.hash = '#c/c1'; lrender(); await new Promise(k => setTimeout(k, 150)); r.ph = !!document.getElementById('cplS'); document.getElementById('cplS').click(); await new Promise(k => setTimeout(k, 200)); r.ph501 = !document.getElementById('cplM'); r.pending = !!LR.lp.cls._cpl.v.phone_pending;
    CPLL.add('c1', 'v1', 30); await CPLL.flush(); r.today = CPLL.today; const R0 = LR.lp.cls.c1.items.v1; r.sec = R0.sec;
    await CPLL.startExam(c, it); r.n = A2L.run.order.length; r.noA = A2L.run.order.every(k => it.qs[k].a === undefined); const good = {}; A2L.run.order.forEach(k => { good[k] = '0'; }); const s = await CPLL.submitExam(c, it, good); r.score = s.score; r.pass = s.pass; await LR.api.save(); return r; });
  ok(R.mode === 'live' && R.me, '운영 모드 로그인 ' + R.mode); ok(R.noAns, '게시본 정답 없음'); ok(R.ph && R.ph501 && R.pending, '본인확인 미연동 시 학습을 막지 않음'); ok(R.today === 30, '서버 학습시간 판정 ' + R.today); ok(R.n === 2 && R.noA && R.score === 100 && R.pass === true, '서버 채점 ' + JSON.stringify(R));
  await p.waitForTimeout(4000);
  const me = await (await c1.request.get(`${B}/api/pub/${tid}/me`)).json(); ok(me.lp && me.lp.cls && me.lp.cls._cpl && me.lp.cls._cpl.v.phone_pending && me.lp.cls.c1.items.v1.sec === 30, '학습 기록 저장 유지 ' + JSON.stringify(me.lp).slice(0, 300));
  const ex = await (await admin.request.get(B + '/api/cpl/exams')).json(); ok(ex.rows.length === 1 && ex.rows[0].score === 100, '운영자 채점 원본'); const sm = await (await admin.request.get(B + '/api/cpl/summary')).json(); ok(sm.rows[0].secs === 30 && sm.rows[0].ips >= 1, '운영자 활동 집계');
  /* 위조: 학습 기록에 점수를 넣어도 운영자 원본은 그대로 */
  const c2 = await br.newContext(); const p2 = await c2.newPage(); await p2.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p2.goto(`${B}/learner.html?t=${tid}`, { waitUntil: 'load' }); await p2.waitForTimeout(400); await p2.evaluate(() => LR.api.login('T0001', 'ABC234'));
  const kicked = await c1.request.get(`${B}/api/pub/${tid}/me`); ok(kicked.status() === 401, '다른 기기 로그인 시 이전 접속 종료 ' + kicked.status());
  await p.evaluate(async () => { CPLL.add('c1', 'v1', 5); await CPLL.flush(); }); await p.waitForTimeout(300); ok(await p.evaluate(() => !LR.me), '종료된 화면 로그아웃');
  ok(!errs.length, '페이지 오류 ' + errs.slice(0, 3).join(' | ')); await br.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
