'use strict';
/* QA7 학습자 회원가입 · 연동 로그인 · 가입 승인 — 실제 Node 서버 + PostgreSQL + 브라우저(앱 390 · 웹 1440), 모의 OAuth 제공자(키 · 비밀값 없음)
   ① 누구나 가입(open): 로그인 화면 「처음이신가요? 회원가입」 → 이메일 인증번호 가입 → 바로 학습 · 카카오 가입 → 다른 기기 카카오 로그인 · 키 없는 구글 「준비 중」
   ② 기관 승인 후 활동(approval): 가입 → 승인 대기(새로 고침 · 홈 이동 잠금) → 스튜디오 승인 → [승인 확인] → 바로 학습 / 거절(사유) → 사유 표시
   ③ 접근코드 기관: 가입 막힘 안내
   사용: NODE_PATH=$(npm root -g) QA7_DB=postgres://postgres@127.0.0.1:5544/kit_qa7_l1 node tests/ui/learner-signup.js */
const path = require('node:path'); const http = require('node:http'); const { spawn, execFileSync } = require('node:child_process'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const PORT = process.env.QA7_PORT || '9961'; const MPORT = process.env.QA7_MPORT || '9962';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const wait = ms => new Promise(k => setTimeout(k, ms));
(async () => {
  /* 모의 OAuth: 동의 화면 대신 바로 콜백으로 돌려보낸다(인가 코드 = 다음 회원 번호) */
  let nextSub = 'kakao-1';
  const mock = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => { const u = new URL(q.url, 'http://x'); const [, p, act] = u.pathname.split('/');
    if (act === 'auth') { r.writeHead(302, { location: `${u.searchParams.get('redirect_uri')}?code=${encodeURIComponent(nextSub)}&state=${encodeURIComponent(u.searchParams.get('state'))}` }); return r.end(); }
    const out = j => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify(j)); };
    if (act === 'token') return out({ access_token: 'at.' + new URLSearchParams(b).get('code') });
    if (act === 'me') { const sub = String(q.headers.authorization || '').replace('Bearer at.', ''); return out(p === 'naver' ? { resultcode: '00', response: { id: sub } } : { id: sub }); }
    r.writeHead(404); r.end(); }); }).listen(+MPORT, '127.0.0.1');
  execFileSync(process.execPath, ['service/build-public.js', 'didisam', 'service/public'], { cwd: ROOT, stdio: 'ignore' });
  const env = { ...process.env, DATABASE_URL: process.env.QA7_DB || 'postgres://postgres@127.0.0.1:5544/kit_qa7_l1', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SIGNUP_CODE: 'C0DE', PII_DEV_OTP: '1', SESSION_PEPPER: 'ci-only', PORT, PII_KEY: '0'.repeat(64), MFA_OFF: '1',
    OAUTH_MOCK_URL: `http://127.0.0.1:${MPORT}`, LEARNER_OAUTH_KAKAO_ID: 'mock-kakao', LEARNER_OAUTH_NAVER_ID: 'mock-naver', LEARNER_OAUTH_NAVER_SECRET: 'mock-naver-secret' }; /* 구글 키 없음 → 「준비 중」 */
  delete env.OAUTH_GOOGLE_ID; delete env.LEARNER_OAUTH_GOOGLE_ID;
  const srv = spawn(process.execPath, ['server/index.js'], { cwd: path.join(ROOT, 'service'), env, stdio: ['ignore', 'ignore', 'pipe'] }); let elog = ''; srv.stderr.on('data', d => { elog += d; });
  const B = `http://127.0.0.1:${PORT}`; let up = false; for (let i = 0; i < 60 && !up; i++) { await wait(500); try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } }
  const end = async code => { try { srv.kill('SIGTERM'); } catch (e) { } mock.close(); process.exit(code); };
  if (!up) { console.error('서버가 뜨지 않았습니다', elog.slice(-800)); return end(1); }
  const br = await chromium.launch(); const errs = []; const H = { 'x-didisam': '1', origin: B };
  /* 기관 만들기 + 가입 설정 + 학습자 사이트 게시(스튜디오 운영 모드) — 운영자 페이지를 돌려준다 */
  async function org(type, name, acct) { const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const su = await ctx.request.post(B + '/api/signup', { headers: H, data: { email: `qa7${type}${Date.now()}@example.com`, password: 'Contract2026x', orgName: name, type, code: 'C0DE' } });
    const tid = (await su.json()).tenant.tid; const p = await ctx.newPage(); p.on('pageerror', e => errs.push('운영 ' + e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(B + '/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant, null, { timeout: 45000 });
    await p.evaluate(([type, name, acct]) => { if (!S || !S.org) createOrg(type, name); S.me.role = 'owner'; mbEnsure(); Object.assign(S.settings.acct, acct); if (S.lsite) { S.lsite.pub = lsSnapshot(); S.lsite.pubAt = nowStr(); } save(); }, [type, name, acct]);
    await p.waitForFunction(() => !LIVE.dirty && !LIVE.saving, null, { timeout: 45000 }); await wait(300); return { tid, p, ctx }; }
  async function learner(tid, w, hash) { const c = await br.newContext({ viewport: w === 390 ? { width: 390, height: 844 } : { width: 1440, height: 900 } }); const lp = await c.newPage(); lp.on('pageerror', e => errs.push(`학습자${w} ` + e.message + ' @' + lp.url() + ' ' + String(e.stack).slice(0, 300))); await lp.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await lp.goto(`${B}/learner.html?t=${tid}${w === 390 ? '&app=1' : ''}${hash || '#login'}`, { waitUntil: 'load' }); await lp.waitForFunction(() => typeof LR !== 'undefined' && LR.mode === 'live' && typeof SITE === 'function' && SITE(), null, { timeout: 20000 }); await wait(600); return { c, lp }; }
  const txt = lp => lp.evaluate(() => (document.querySelector('#lapp') || document.body).innerText).catch(() => '');
  const emailJoin = async (lp, email, nick) => {
    await lp.click('.la-new a[href="#join"]'); await lp.waitForSelector('#laJoin [name=email]', { timeout: 10000 });
    await lp.fill('#laJoin [name=email]', email); await lp.click('#laJoin [data-ac="otp"][data-v="jv"]'); await lp.waitForSelector('.la-demo-code b', { timeout: 10000 });
    const code = await lp.textContent('.la-demo-code b'); await lp.fill('#laJoin [name=vcode]', code.trim()); await lp.fill('#laJoin [name=nick]', nick);
    await wait(300); for (const L of await lp.locator('#laJoin input[name^=xq]:not([type=checkbox]):not([type=radio]):not([type=file])').all()) await L.fill('교육팀').catch(() => { }); for (const n of ['tos', 'privacy', 'third']) { const L = lp.locator(`#laJoin [name=${n}]`); if (await L.count()) await L.check().catch(() => { }); }
    await lp.click('#laJoin button[type=submit]'); await wait(1200); const er = await lp.textContent('#laJErr').catch(() => ''); if (er) console.error('  가입 오류:', er); };
  const consentAndSubmit = async lp => { await wait(300); for (const L of await lp.locator('#laJoin input[name^=xq]:not([type=checkbox]):not([type=radio]):not([type=file])').all()) await L.fill('교육팀').catch(() => { }); for (const n of ['tos', 'privacy', 'third']) { const L = lp.locator(`#laJoin [name=${n}]`); if (await L.count()) await L.check().catch(() => { }); } await lp.click('#laJoin button[type=submit]'); await wait(1200); };

  try {
    /* ① 누구나 가입(open) */
    const O = await org('adult', 'QA7 열린 아카데미', { mode: 'open', approve: 'auto', social: ['kakao', 'google', 'naver'] });
    for (const w of [1440, 390]) {
      const { c, lp } = await learner(O.tid, w);
      ok(await lp.isVisible('.la-new a[href="#join"]'), `${w} 로그인 화면 「처음이신가요? 회원가입」`);
      await emailJoin(lp, `qa7o${w}${Date.now()}@example.com`, `열린${w}`);
      const t = await txt(lp); ok(/가입이 완료되었습니다/.test(t) || (w === 390 && /님, 오늘/.test(t)), `${w} 이메일 가입 즉시 완료(앱은 바로 홈) ${t.slice(0, 120)}`);
      ok(await lp.evaluate(() => !!(LR.me && LR.me.sid)), `${w} 가입 즉시 로그인(정회원)`); await c.close();
    }
    for (const w of [390, 1440]) {
      const { c, lp } = await learner(O.tid, w, '#join'); await lp.waitForSelector('.la-sb.kakao', { timeout: 10000 }); await lp.waitForFunction(() => Array.isArray(LA.ready) && LA.ready.length > 0 && !document.querySelector('.la-sb.kakao.off'), null, { timeout: 10000 }).catch(() => { });
      /* qa8(2026-11-25) 대표님 「회원가입 · 로그인 심플하게」: 키가 없는 제공자는 「준비 중」으로 보이지 않고 아예 숨긴다 */
      /* qa8 대표님 「구글로 가입 및 계속하기도 꼭 있어야」: 구글 버튼은 항상 보인다 */
      ok(await lp.evaluate(() => !!document.querySelector('.la-sb.google') && !/준비 중/.test(document.body.innerText)), `${w} 구글 버튼은 항상 보임 · 「준비 중」 표시 없음`);
      ok(await lp.isVisible('.la-sb.naver:not(.off)'), `${w} 네이버 버튼(키 있음)`);
      /* (qa8) 구글 버튼이 없으니 「준비 중」 누름 확인은 뺀다 */
      nextSub = `kakao-${w}-${Date.now()}`; await lp.click('.la-sb.kakao'); await lp.waitForFunction(() => !!document.body && /카카오 계정을 확인했습니다/.test(document.body.innerText), null, { timeout: 15000, polling: 300 }).catch(() => { });
      ok(/카카오 계정을 확인했습니다/.test(await txt(lp)), `${w} 카카오 동의 뒤 가입 화면(?oa=join-kakao) ${lp.url()}`);
      await lp.fill('#laJoin [name=nick]', `카카오${w}`); await consentAndSubmit(lp);
      ok(/가입이 완료되었습니다|님, 오늘/.test(await txt(lp)), `${w} 카카오 가입 완료 ${(await txt(lp)).slice(0, 100)}`); await c.close();
      const L2 = await learner(O.tid, w); await L2.lp.click('.la-sb.kakao'); await L2.lp.waitForFunction(() => typeof LR !== 'undefined' && LR.me && LR.me.sid, null, { timeout: 15000 }).catch(() => { });
      ok(await L2.lp.evaluate(() => !!(LR.me && LR.me.sid && LR.me.nick)), `${w} 다른 기기 카카오 로그인 → 바로 학습`); await L2.c.close();
    }

    /* ② 기관 승인 후 활동(approval) */
    const A = await org('corp', 'QA7 승인 기업', { mode: 'open', approve: 'manual', social: ['kakao'] });
    const pend = {};
    for (const w of [390, 1440]) {
      const L = await learner(A.tid, w); await emailJoin(L.lp, `qa7a${w}${Date.now()}@example.com`, `대기${w}`);
      ok(/가입 신청이 접수되었습니다/.test(await txt(L.lp)), `${w} 승인 정책: 신청 접수 ${(await txt(L.lp)).slice(0, 100)}`);
      ok(await L.lp.evaluate(() => !LR.me), `${w} 대기 중 세션 없음`);
      await L.lp.goto(`${B}/learner.html?t=${A.tid}${w === 390 ? '&app=1' : ''}#home`, { waitUntil: 'load' }); await wait(1500);
      const t = await txt(L.lp); ok(/#pending$/.test(L.lp.url()) && /가입 승인을 기다리고 있어요/.test(t) && t.includes(`대기${w}`), `${w} 새로 고침 · 홈 이동해도 대기 화면(신청 정보) ${L.lp.url()} ${t.slice(0, 160)}`);
      pend[w] = L;
    }
    /* 스튜디오: 요청함 가입 신청 → 회원 › 승인 대기 → 390은 승인, 1440은 거절(사유) */
    const P = A.p; await P.reload({ waitUntil: 'load' }); await P.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant && S && S.members && S.members.filter(m => m.grade === '승인 대기').length >= 2, null, { timeout: 30000 }).catch(() => { });
    const M2 = await P.evaluate(() => S.members.filter(m => m.grade === '승인 대기').map(m => ({ id: m.id, nick: m.nick || m.name })));
    ok(M2.length >= 2, '스튜디오 승인 대기 목록 ' + JSON.stringify(M2));
    await P.evaluate(() => { UI.memF = '승인 대기'; go('members'); render(); }); await wait(500);
    const mA = M2.find(m => /390/.test(m.nick)); const mR = M2.find(m => /1440/.test(m.nick));
    if (mA) { const dr = P.waitForResponse(r => r.url().endsWith('/api/learners/decide'), { timeout: 15000 }).catch(() => null); await P.click(`[data-act="mb-ok"][data-v="${mA.id}"]`); const r = await dr; ok(r && r.status() === 200, '승인 → 서버 decide 200'); }
    if (mR) { await P.click(`[data-act="mb-no"][data-v="${mR.id}"]`); await P.fill('#modal [name=r]', '재직자만 가입할 수 있어요'); const dr = P.waitForResponse(r => r.url().endsWith('/api/learners/decide'), { timeout: 15000 }).catch(() => null); await P.click('#modal [data-mact="ok"]'); const r = await dr; ok(r && r.status() === 200, '거절 → 서버 decide 200'); }
    await P.waitForFunction(() => !LIVE.dirty && !LIVE.saving, null, { timeout: 30000 }).catch(() => { });
    { const lp = pend[390].lp; await lp.click('[data-ac="pchk"]'); await lp.waitForFunction(() => typeof LR !== 'undefined' && LR.me && LR.me.sid, null, { timeout: 15000 }).catch(() => { });
      ok(await lp.evaluate(() => !!(LR.me && LR.me.sid) && !/pending/.test(location.hash)), `390 승인 확인 → 바로 학습 ${lp.url()}`); }
    { const lp = pend[1440].lp; await lp.click('[data-ac="pchk"]'); await wait(1500); const t = await txt(lp);
      ok(/가입이 승인되지 않았어요/.test(t) && /재직자만 가입할 수 있어요/.test(t), `1440 거절 사유 표시 ${t.slice(0, 160)}`);
      await lp.click('[data-ac="pclr"]'); await wait(800); ok(/#login$/.test(lp.url()), '다른 계정으로 로그인 → 대기 표 지움'); }
    const au = await (await A.ctx.request.get(B + '/api/audit', { headers: H })).json().catch(() => ({}));
    const acts = JSON.stringify(au).match(/learner\.(approve|reject)/g) || []; ok(acts.includes('learner.approve') && acts.includes('learner.reject'), '감사 기록 learner.approve · reject ' + acts.join(','));
    /* 승인 정책 · 카카오: 대기 → 카카오 다시 로그인도 대기 화면 */
    { const L = await learner(A.tid, 390, '#join'); nextSub = `kakao-apr-${Date.now()}`; await L.lp.click('.la-sb.kakao'); await L.lp.waitForSelector('#laJoin [name=nick]', { timeout: 15000 }).catch(() => { }); await L.lp.fill('#laJoin [name=nick]', '카카오대기'); await consentAndSubmit(L.lp);
      ok(/가입 신청이 접수되었습니다/.test(await txt(L.lp)), '카카오 가입도 승인 대기'); await L.c.close();
      const L2 = await learner(A.tid, 1440); await L2.lp.click('.la-sb.kakao'); await wait(2500); ok(/#pending$/.test(L2.lp.url()) && /가입 승인을 기다리고 있어요/.test(await txt(L2.lp)), '다른 기기 카카오 로그인도 대기 ' + L2.lp.url()); await L2.c.close(); }

    /* ③ 접근코드 기관: 가입 막힘 안내 */
    const C = await org('voc', 'QA7 훈련원', { mode: 'code' });
    { const L = await learner(C.tid, 390); const t = await L.lp.textContent('.la-new').catch(() => ''); ok(/처음이신가요/.test(t) && /초대받은 사람만 가입할 수 있어요/.test(t), '접근코드 기관 안내 ' + t); await L.c.close(); }
    /* ④ 대학 소셜 가입: 스튜디오에서 켜기 · 안내 한 줄 · 학번 · 학과만 받고 가입 → 다른 기기 같은 SNS 로그인 */
    const Un = await org('univ', 'QA7 대학 사업단', { mode: 'open', approve: 'auto', social: ['kakao'] });
    { const kept = await Un.p.evaluate(() => S.settings.acct.social.join()); ok(kept === 'kakao', '대학 SNS 설정 유지(upgrade에서 지우지 않음) ' + kept);
      await Un.p.evaluate(() => ACT['mb-acct']()); await Un.p.waitForSelector('#mbUnivSns', { timeout: 8000 }).catch(() => { }); const note = await Un.p.textContent('#mbUnivSns').catch(() => '');
      ok(/학번 · 학과만 받습니다/.test(note) && await Un.p.locator('.modal [name=soc_kakao]').count() > 0, '대학 설정 화면 SNS 켜기 + 안내 ' + note); await Un.p.keyboard.press('Escape').catch(() => { });
      /* 신규 기관 기본 가입 정책 — 대학 학사 LMS · 직업훈련 = 승인, 나머지 = 누구나 가입 */
      const D = await Un.p.evaluate(() => { const o0 = { ...S.org }, a0 = S.settings.acct, v0 = S.settings.voc43, out = {};
        for (const [ty, ed] of [['univ', 'lms'], ['univ', 'lite'], ['voc', ''], ['k12', ''], ['adult', ''], ['corp', ''], ['public', ''], ['lifelong', '']]) { S.org.type = ty; S.org.ed = ed; delete S.settings.acct; delete S.settings.voc43; S.settings.join = '자동 수락'; mbEnsure(); mbVocFix(); out[ty + (ed ? '_' + ed : '')] = mbPol(S.settings.acct); }
        Object.assign(S.org, o0); S.settings.acct = a0; if (v0 === undefined) delete S.settings.voc43; else S.settings.voc43 = v0; mbJoinSync(); return out; });
      ok(JSON.stringify(D) === JSON.stringify({ univ_lms: 'approval', univ_lite: 'open', voc: 'approval', k12: 'open', adult: 'open', corp: 'open', public: 'open', lifelong: 'open' }), '신규 기관 기본 가입 정책 ' + JSON.stringify(D));
      const L = await learner(Un.tid, 390, '#join'); nextSub = `kakao-univ-${Date.now()}`; await L.lp.click('.la-sb.kakao'); await L.lp.waitForSelector('#laJoin [name=sid]', { timeout: 15000 }).catch(() => { });
      ok(/학번 · 학과만 적으면/.test(await txt(L.lp)) && !(await L.lp.locator('#laJoin [name=email], #laJoin [name=pw]').count()), '대학 소셜 가입 화면: 학번 · 학과만');
      await L.lp.fill('#laJoin [name=sid]', '20269011'); await L.lp.fill('#laJoin [name=dept]', '컴퓨터공학과'); await consentAndSubmit(L.lp); await wait(800);
      const me = await L.lp.evaluate(t => fetch(`/api/pub/${t}/me`).then(r => r.json()), Un.tid); ok(me.me && me.me.acct && me.me.acct.login === 'kakao', '대학 소셜 가입 완료 ' + JSON.stringify(me).slice(0, 120)); await L.c.close();
      const L2 = await learner(Un.tid, 1440); ok(await L2.lp.locator('.la-sb.kakao').count() > 0, '대학 로그인 화면에 카카오'); await L2.lp.click('.la-sb.kakao'); await wait(2500);
      const me2 = await L2.lp.evaluate(t => fetch(`/api/pub/${t}/me`).then(r => r.status), Un.tid); ok(me2 === 200, '다른 기기 카카오 로그인(대학) ' + me2); await L2.c.close(); }
  } catch (e) { fail++; console.error('✗ 예외', e && e.stack || e); }
  ok(!errs.length, '스크립트 오류 없음 ' + errs.slice(0, 3).join(' | '));
  console.log(`learner-signup: 통과 ${pass} · 실패 ${fail}`); await br.close(); return end(fail ? 1 : 0);
})();
