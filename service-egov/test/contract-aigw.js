'use strict';
/* v46 Ver2 AI 게이트웨이 · 학습 이벤트 대조 — Node(aigw.js · lev.js)와 Java(DdAiGateway · lev 패키지)에 같은 시나리오를 돌려
   상태코드 · 오류 코드 · 응답 형태 · 모의 AI가 받은 지시문(system) · 힌트 상태(lp.hint) · 학습 이벤트 행 · 기능별 사용량이 같은지 본다.
   사용: MOCK_AI_PORT=9529 node test/contract-aigw.js http://127.0.0.1:<node> http://127.0.0.1:<java>  (서버는 test/env.sh와 같은 환경, ANTHROPIC_URL은 MOCK_AI_PORT)
   한쪽만: node test/contract-aigw.js <base> (형태 · 기대값만 확인) */
const http = require('node:http');
const [A, B] = [process.argv[2], process.argv[3]];
const MOCK_PORT = Number(process.env.MOCK_AI_PORT || 8099);
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
const mock = { cur: '', reqs: {} };
function startMock() {
  return new Promise(res => { const srv = http.createServer((req, r) => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => {
    let b = {}; try { b = JSON.parse(Buffer.concat(ch).toString('utf8')); } catch {} mock.reqs[mock.cur] = b;
    r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', content: [{ type: 'text', text: '모의 응답' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 3 } })); }); });
    srv.listen(MOCK_PORT, '127.0.0.1', () => res(srv)); });
}
async function call(base, method, p, { body, cookie } = {}) {
  const h = {}; if (method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined) h['content-type'] = 'application/json';
  if (p === '/api/signup' && body && process.env.SIGNUP_CODE) body = { ...body, code: process.env.SIGNUP_CODE };
  const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  const sc = (typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [])[0]; return { st: r.status, j, ck: sc ? sc.split(';')[0] : null };
}
const shape = v => v === null ? 'null' : Array.isArray(v) ? '[' + (v.length ? shape(v[0]) : '') + ']' : typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => k + ':' + shape(v[k])).join(',') + '}' : typeof v;
const canon = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
const AIPOL = { on: true, v: 1, lvl: 'L1', preset: { exam: 'L0', assign: 'L1' }, retain: 'term', evalNotice: true, train: false, quota: { tutor: 6 } };
const DOC = pol => ({
  org: { name: '정책 대학', type: 'univ', room: { mode: 'saas' } },
  settings: { tutor: { enabled: true, name: '디디 튜터', daily: 50, guestDaily: 20, model: 'claude-sonnet-4', help: 'hint' } },
  lsite: { pub: { org: { name: '정책 대학' }, classes: [{ id: 'c1', name: '파이썬', items: [{ id: 'a1', title: '과제' }] }] } },
  members: [{ id: 'm1', sid: '20260001', name: '홍길동' }],
  classes: [{ id: 'c1', name: '파이썬', learners: ['m1'], items: [{ id: 'e1', type: 'exam', title: '시험' }, { id: 'a1', type: 'assign', title: '과제', ai: { lvl: 'L1', sol: true } }, { id: 'a2', type: 'assign', ai: { lvl: 'L2' } }, { id: 'a3', type: 'assign' }],
    prog: { m1: { p: 50, assign: 'submitted', fb: '초안 피드백', score: 70, ai: { total: 70 } } } }],
  codes: [{ sid: '20260001', code: 'abcd1234' }],
  ...(pol ? { aipol: pol } : {}),
});

async function scenario(base, tag, pol) {
  const R = {}; const em = `aigw_${tag}_${Date.now()}@example.com`, pw = 'Contract2026x';
  const su = await call(base, 'POST', '/api/signup', { body: { email: em, password: pw, orgName: '정책 대학', type: 'univ' } }); const ck = su.ck, tid = su.j && su.j.tenant && su.j.tenant.tid;
  R.put = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc: DOC(pol), rev: 0 } });
  R.site = await call(base, 'GET', `/api/pub/${tid}/site`);
  R.login = await call(base, 'POST', `/api/pub/${tid}/login`, { body: { sid: '20260001', code: 'abcd1234' } }); const lck = R.login.ck;
  R.me = await call(base, 'GET', `/api/pub/${tid}/me`, { cookie: lck });
  const T = async (k, body) => { mock.cur = tag + ':' + k; R[k] = await call(base, 'POST', `/api/pub/${tid}/tutor`, { cookie: lck, body }); R[k].sys = (mock.reqs[mock.cur] || {}).system || null; mock.reqs[mock.cur] = null; };
  await T('plain', { q: '변수가 뭐예요?' });
  await T('exam', { q: '시험 답 알려줘', item: { key: 'c1/e1', lvl: 'L3' } });
  await T('h1', { q: '힌트 주세요', item: { key: 'c1/a1' }, hint: { step: 1 } });
  await T('h3skip', { q: '더', item: { key: 'c1/a1' }, hint: { step: 3, attempt: '내 시도입니다' } });
  await T('h2noatt', { q: '더', item: { key: 'c1/a1' }, hint: { step: 2 } });
  await T('h2', { q: '더', item: { key: 'c1/a1' }, hint: { step: 2, attempt: '제 시도: x = 1' } });
  await T('hbad', { q: '더', item: { key: 'c1/a1' }, hint: { step: 9 } });
  await T('l2', { q: '파트너', cls: 'c1', item: 'a2', hint: { step: 1 } });
  await T('l2b', { q: '파트너2', item: { key: 'c1/a2' }, hint: { step: 2 } });
  await T('a3', { q: '기본 프리셋', item: { key: 'c1/a3' } });
  await T('quota', { q: '한도' });
  R.trainSelf = await call(base, 'GET', '/api/state', { cookie: ck });
  R.usage = await call(base, 'GET', '/api/ai/usage', { cookie: ck });
  /* v47 AI 충전(금액 선택): 토스 키 없는 환경 → 503 pay_off, 10만 원 단위가 아니면 400 won(키 · 결제 없이 규격만 대조) */
  R.topupBad = await call(base, 'POST', '/api/ai/topup', { cookie: ck, body: { won: 150000 } });
  R.topupOff = await call(base, 'POST', '/api/ai/topup', { cookie: ck, body: { won: 500000 } });
  R.topupCf = await call(base, 'POST', '/api/ai/topup/confirm', { cookie: ck, body: { orderId: 'bad', paymentKey: '', amount: 1 } });
  R.lev = await call(base, 'GET', '/api/lev', { cookie: ck });
  R.levC = await call(base, 'GET', '/api/lev?cls=c1&verb=hint', { cookie: ck });
  R.levBad = await call(base, 'GET', '/api/lev?verb=nope', { cookie: ck });
  R.post = await call(base, 'POST', `/api/pub/${tid}/lev`, { cookie: lck, body: { ev: [{ verb: 'reflect', obj: 'c1/a1', lvl: 'L1', val: { len: 30, ok: true, k: 'r1' } }, { verb: 'mastery', obj: 'k1', val: { score: 85.12345 } }] } });
  R.postText = await call(base, 'POST', `/api/pub/${tid}/lev`, { cookie: lck, body: { ev: [{ verb: 'reflect', obj: 'c1/a1', text: '내 생각' }] } });
  R.postValText = await call(base, 'POST', `/api/pub/${tid}/lev`, { cookie: lck, body: { ev: [{ verb: 'reflect', obj: 'c1/a1', val: { t: '긴 글 입니다' } }] } });
  R.postVerb = await call(base, 'POST', `/api/pub/${tid}/lev`, { cookie: lck, body: { ev: [{ verb: 'zzz' }] } });
  R.postMany = await call(base, 'POST', `/api/pub/${tid}/lev`, { cookie: lck, body: { ev: Array.from({ length: 51 }, () => ({ verb: 'attempt' })) } });
  R.postEmpty = await call(base, 'POST', `/api/pub/${tid}/lev`, { cookie: lck, body: { ev: [] } });
  R.postNo = await call(base, 'POST', `/api/pub/${tid}/lev`, { body: { ev: [{ verb: 'attempt' }] } });
  /* lp 차이분: 완료 · 비전 · 목표, 학습자가 보낸 hint는 무시(서버 값 유지) */
  R.prog = await call(base, 'PUT', `/api/pub/${tid}/progress`, { cookie: lck, body: { lp: { cls: { c1: { items: { a1: { done: true, score: '88.44' } } } }, hint: { 'c1/a1': { step: 5 } },
    vision: { card: { who: '데이터 분석가 010-1234-5678', why: '이유', how: '방법' }, goals: [{ id: 'g1', t: '목표1', by: '2026-12', done: true }, { t: '목표2', by: 'x' }, 'bad', { t: '3' }, { t: '4' }], at: '2026-11-23T12:00:00Z', skip: true } } } });
  R.me2 = await call(base, 'GET', `/api/pub/${tid}/me`, { cookie: lck });
  R.lev2 = await call(base, 'GET', '/api/lev?after=0', { cookie: ck });
  R.putTrain = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc: { ...DOC(pol ? { ...pol, train: true } : null) }, rev: 1 } });
  /* v47 산타 관리(putTrain 뒤 — rev를 올리므로): 기관 정운영자 403 · 산타 관리자(SANTA_ADMIN_EMAILS 중 ctsanta_<tag>_…) 검색 · 입력 · 정운영자 변경 거부 */
  R.santaNo = await call(base, 'GET', '/api/santa/orgs?q=x', { cookie: ck });
  const sm = String(process.env.SANTA_ADMIN_EMAILS || '').split(',').map(x => x.trim()).find(x => x.startsWith(`ctsanta_${tag}_`));
  if (sm) {
    const ss = await call(base, 'POST', '/api/signup', { body: { email: sm, password: pw, orgName: '산타 본사', type: 'corp' } }); const sck = ss.ck;
    R.santaMe = await call(base, 'GET', '/api/me', { cookie: sck });
    R.santaBad = await call(base, 'PUT', `/api/santa/orgs/${tid}/plan`, { cookie: sck, body: { code: 'Q', aiMonthTokens: 1 } });
    R.santaOwner = await call(base, 'PUT', `/api/santa/orgs/${tid}/plan`, { cookie: ck, body: { code: 'E1', aiMonthTokens: 1 } });
    R.santaPut = await call(base, 'PUT', `/api/santa/orgs/${tid}/plan`, { cookie: sck, body: { code: 'e1', tier: 'Enterprise', contract: 'sub', aiMonthTokens: 3000000, since: '2026-11-01', memo: '1차 계약' } });
    R.santaFind = await call(base, 'GET', `/api/santa/orgs?q=${tid}`, { cookie: sck });
    R.usage2 = await call(base, 'GET', '/api/ai/usage', { cookie: ck });
    const st = await call(base, 'GET', '/api/state', { cookie: ck });
    R.ownerPut = await call(base, 'PUT', '/api/state', { cookie: ck, body: { doc: { ...st.j.doc, aiplan: { monthTokens: 9000000, overage: 'block' }, plan: { code: 'U0' } }, rev: st.j.rev } });
    R.usage3 = await call(base, 'GET', '/api/ai/usage', { cookie: ck });
    /* 체험 종료(since + 14일 경과): 포함량 0 · trialEnded → 운영자 · 학습자 429 trial_ended(문구 같음) */
    R.trialPut = await call(base, 'PUT', `/api/santa/orgs/${tid}/plan`, { cookie: sck, body: { code: 'TRIAL', aiMonthTokens: 1000000, since: '2026-01-01', memo: '체험 종료 시험' } });
    R.usage4 = await call(base, 'GET', '/api/ai/usage', { cookie: ck });
    mock.cur = tag + ':trialStudio'; R.trialStudio = await call(base, 'POST', '/api/ai/messages', { cookie: ck, body: { messages: [{ role: 'user', content: '안녕' }] } });
    await T('trialTutor', { q: '체험 끝?' });
    /* 체험 중(통합 결정 2026-11-25 「14일 합계 100만」): 월 집계 대신 since부터 누적 — usage.from · trialSince · plan.trialSince 같음 */
    const kst = new Date(Date.now() + 9 * 3600e3 - 3 * 864e5).toISOString().slice(0, 10); /* KST 오늘 - 3일 */
    R.trialNow = await call(base, 'PUT', `/api/santa/orgs/${tid}/plan`, { cookie: sck, body: { code: 'TRIAL', aiMonthTokens: 1000000, since: kst, memo: '체험 진행 시험' } });
    R.usage5 = await call(base, 'GET', '/api/ai/usage', { cookie: ck }); R.usage5.since = kst;
    mock.cur = tag + ':trialNowStudio'; R.trialNowStudio = await call(base, 'POST', '/api/ai/messages', { cookie: ck, body: { messages: [{ role: 'user', content: '안녕' }] } });
  }
  return R;
}
const pick = R => ({
  site: R.site.j && R.site.j.site && R.site.j.site.aipol,
  meCls: R.me.j && R.me.j.mine && R.me.j.mine.cls,
  levRows: ((R.lev.j && R.lev.j.rows) || []).map(r => [r.sid, r.verb, r.obj, r.lvl, canon(r.val), r.src, r.trust]),
  lev2: ((R.lev2.j && R.lev2.j.rows) || []).map(r => [r.verb, r.obj, r.lvl, canon(r.val), r.src, r.trust]),
  hint: R.me2.j && R.me2.j.lp && R.me2.j.lp.hint && Object.fromEntries(Object.entries(R.me2.j.lp.hint).map(([k, v]) => [k, { step: v.step, selfExp: v.selfExp, tries: (v.tries || []).map(t => [t.n, t.len]) }])),
  vision: R.me2.j && R.me2.j.lp && R.me2.j.lp.vision,
  byF: R.usage.j && R.usage.j.byFeature,
  month: R.usage.j && (({ used, included, credit, creditLeft, remaining, pct, state, plan, contractPlan, price, payOnline, credits }) => ({ used, included, credit, creditLeft, remaining, pct, state, plan, contractPlan, price, payOnline, credits }))(R.usage.j),
  topupOff: R.topupOff.j, santaPut: R.santaPut && R.santaPut.j && { ...R.santaPut.j, tid: !!R.santaPut.j.tid },
  santaFind: R.santaFind && R.santaFind.j && R.santaFind.j.orgs && R.santaFind.j.orgs.map(o => ({ n: o.name, ready: o.ready, plan: o.plan, aiplan: o.aiplan, used: o.used, memo: o.memo, log: o.log.map(l => [l.actor === undefined, l.before, l.after, l.memo]) })),
  usage2: R.usage2 && R.usage2.j && [R.usage2.j.included, R.usage2.j.plan, R.usage2.j.contractPlan], usage3: R.usage3 && R.usage3.j && [R.usage3.j.included, R.usage3.j.plan, R.usage3.j.contractPlan], usage4: R.usage4 && R.usage4.j && [R.usage4.j.included, R.usage4.j.plan, R.usage4.j.state, R.usage4.j.pct, R.usage4.j.remaining],
  usage5: R.usage5 && R.usage5.j && [R.usage5.j.included, R.usage5.j.plan, R.usage5.j.state, R.usage5.j.pct, R.usage5.j.used, R.usage5.j.from, R.usage5.j.trialSince],
  trialMsg: R.trialStudio && [R.trialStudio.j && R.trialStudio.j.message, R.trialTutor.j && R.trialTutor.j.message],
  monthFeature: R.usage.j && R.usage.j.monthFeature,
});
const KEYS = ['trialPut', 'usage4', 'trialStudio', 'trialTutor', 'trialNow', 'usage5', 'trialNowStudio', 'put', 'site', 'login', 'me', 'plain', 'exam', 'h1', 'h3skip', 'h2noatt', 'h2', 'hbad', 'l2', 'l2b', 'a3', 'quota', 'usage', 'lev', 'levC', 'levBad', 'post', 'postText', 'postValText', 'postVerb', 'postMany', 'postEmpty', 'postNo', 'prog', 'me2', 'lev2', 'putTrain', 'topupBad', 'topupOff', 'topupCf', 'santaNo', 'santaMe', 'santaBad', 'santaOwner', 'santaPut', 'santaFind', 'ownerPut'];

(async () => {
  const srv = await startMock();
  for (const pol of [AIPOL, null]) {
    const P = pol ? 'on' : 'off';
    const RA = await scenario(A, 'a' + P, pol), RB = B ? await scenario(B, 'b' + P, pol) : null;
    /* 기대값(한쪽 기준) */
    if (process.env.DBG) console.log(JSON.stringify({ q: RA.quota, byF: RA.usage.j, me: RA.me.j }).slice(0, 1500));
    if (pol) {
      ok(RA.site.j.site.aipol && RA.site.j.site.aipol.lvl === 'L1', `${P} site.aipol`);
      ok(RA.exam.st === 403 && RA.exam.j.error === 'ai_level_off', `${P} exam L0 ${RA.exam.st} ${RA.exam.j && RA.exam.j.error}`);
      ok(RA.h1.st === 200 && RA.h1.j.lvl === 'L1' && RA.h1.j.hint.step === 1, `${P} h1 ${RA.h1.st} ${JSON.stringify(RA.h1.j)}`);
      ok(RA.h3skip.st === 409 && RA.h3skip.j.error === 'hint_locked', `${P} skip ${RA.h3skip.st}`);
      ok(RA.h2noatt.st === 409, `${P} noatt ${RA.h2noatt.st}`); ok(RA.h2.st === 200 && RA.h2.j.hint.step === 2, `${P} h2 ${RA.h2.st}`);
      ok(RA.hbad.st === 400 && RA.hbad.j.error === 'hint', `${P} hbad ${RA.hbad.st} ${RA.hbad.j && RA.hbad.j.error}`);
      ok(RA.l2b.st === 200 && RA.l2b.j.lvl === 'L2', `${P} L2 relax ${RA.l2b.st}`);
      ok(RA.quota.st === 429 && RA.quota.j.error === 'ai_feature_quota', `${P} quota ${RA.quota.st} ${RA.quota.j && RA.quota.j.error}`);
      ok(RA.h1.sys && RA.h1.sys.includes('[힌트 1단계'), `${P} directive`);
      { const mc = pick(RA).meCls; ok(mc && mc.c1 && mc.c1.fb === '' && mc.c1.score === null, `${P} fb hidden ${JSON.stringify(mc)}`); }
    } else {
      ok(!RA.site.j.site.aipol, `${P} no site.aipol`); ok(RA.exam.st === 200 && RA.exam.j.lvl === undefined, `${P} exam passes ${RA.exam.st}`);
      ok(RA.plain.sys && !RA.plain.sys.includes('[AI 레벨'), `${P} no directive`);
    }
    ok(RA.post.st === 200 && RA.post.j.n === 2, `${P} lev post ${RA.post.st} ${JSON.stringify(RA.post.j)}`);
    ok(RA.postText.j && RA.postText.j.error === 'lev_free_text' && RA.postValText.j.error === 'lev_free_text', `${P} free text`);
    ok(RA.postMany.j && RA.postMany.j.error === 'lev_batch' && RA.postVerb.j.error === 'lev_verb' && RA.postEmpty.j.error === 'lev_form' && RA.postNo.st === 401, `${P} lev errors`);
    ok(RA.usage.j && typeof RA.usage.j.month === 'string' && RA.usage.j.state === 'off' && RA.usage.j.price.perM === 20000 && RA.usage.j.price.discounts.length === 7 && RA.usage.j.contractPlan === null && 'remaining' in RA.usage.j, `${P} usage month ${JSON.stringify(RA.usage.j && RA.usage.j.state)}`);
    ok(RA.santaNo.st === 403 && RA.santaNo.j.error === 'santa', `${P} santa 403 ${RA.santaNo.st}`);
    if (RA.santaPut) {
      ok(RA.santaMe.j.user.santa === true && RA.santaBad.j.error === 'plan_code' && RA.santaOwner.st === 403 && RA.santaPut.st === 200 && RA.santaPut.j.plan.code === 'E1', `${P} santa put ${RA.santaPut.st} ${JSON.stringify(RA.santaPut.j)}`);
      ok(RA.santaFind.j.orgs.length === 1 && RA.santaFind.j.orgs[0].memo === '1차 계약' && RA.santaFind.j.orgs[0].log.length === 1, `${P} santa find`);
      ok(RA.usage2.j.included === 3000000 && RA.usage2.j.contractPlan.code === 'E1' && RA.ownerPut.st === 200 && RA.usage3.j.included === 3000000 && RA.usage3.j.plan.overage === 'block' && RA.usage3.j.contractPlan.code === 'E1', `${P} owner cannot change ${JSON.stringify(RA.usage3.j && RA.usage3.j.plan)}`);
    }
    if (RA.usage5) ok(RA.trialNow.st === 200 && RA.usage5.j.included === 1000000 && RA.usage5.j.trialSince === RA.usage5.since && RA.usage5.j.from === RA.usage5.since && RA.usage5.j.plan.trialSince === RA.usage5.since && !RA.usage5.j.plan.trialEnded && RA.trialNowStudio.st === 200, `${P} trial cumulative ${JSON.stringify(RA.usage5.j && [RA.usage5.j.from, RA.usage5.j.trialSince, RA.usage5.j.plan])} ${RA.trialNowStudio.st}`);
    if (RA.trialStudio) ok(RA.usage4.j.included === 0 && RA.usage4.j.plan.trialEnded === true && RA.usage4.j.state === 'over' && RA.trialStudio.st === 429 && RA.trialStudio.j.error === 'trial_ended' && /유료 요금제로 전환/.test(RA.trialStudio.j.message) && RA.trialTutor.st === 429 && RA.trialTutor.j.error === 'trial_ended' && /요$/.test(RA.trialTutor.j.message), `${P} trial ended ${RA.trialStudio.st} ${JSON.stringify(RA.trialStudio.j)} ${JSON.stringify(RA.trialTutor.j)}`);
    ok(RA.topupBad.st === 400 && RA.topupBad.j.error === 'won' && RA.topupOff.st === 503 && RA.topupOff.j.error === 'pay_off' && RA.topupCf.st === 400 && RA.topupCf.j.error === 'bad_pay', `${P} topup ${RA.topupOff.st} ${RA.topupOff.j && RA.topupOff.j.error}`);
    ok(RA.putTrain.st === 200, `${P} owner train ${RA.putTrain.st} ${JSON.stringify(RA.putTrain.j)}`);
    if (!RB) continue;
    for (const k of KEYS) {
      const a = RA[k], b = RB[k]; if (!a || !b) continue;
      ok(a.st === b.st, `${P} ${k} status ${a.st} vs ${b.st}`);
      ok((a.j && a.j.error) === (b.j && b.j.error), `${P} ${k} error ${a.j && a.j.error} vs ${b.j && b.j.error}`);
      if (!['site', 'me', 'me2', 'lev', 'lev2', 'levC', 'usage'].includes(k)) ok(shape(a.j) === shape(b.j), `${P} ${k} shape\n  N ${shape(a.j)}\n  J ${shape(b.j)}`);
      if (a.sys !== undefined) ok(a.sys === b.sys, `${P} ${k} system 다름\n  N ${a.sys && a.sys.slice(-300)}\n  J ${b.sys && b.sys.slice(-300)}`);
    }
    const pa = pick(RA), pb = pick(RB);
    for (const k of Object.keys(pa)) ok(canon(pa[k]) === canon(pb[k]), `${P} ${k}\n  N ${canon(pa[k])}\n  J ${canon(pb[k])}`);
  }
  srv.close();
  console.log(`contract-aigw: ${pass} 통과 · ${fail} 실패`); for (const e of errs) console.log('✗ ' + e);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
