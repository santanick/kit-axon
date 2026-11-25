'use strict';
/* QA7 q3 수정 확인(d2) — 실제 Node 서버 + PostgreSQL + 브라우저(앱 390 · 웹 1440), 대학 학사 LMS · 마일리지 꺼진 기관
   #1 학사 명단 연결: 등록 학번은 실시간 수업 · 내 강의실이 열리고, 미등록 학번은 403 대신 안내 카드(해요체)
   #2 마일리지 꺼진 기관: 홈 · 나 · 내 학습에서 /mile-my를 부르지 않음
   #3 #mile · 알 수 없는 주소 → 홈, 「본문 바로가기」는 주소를 바꾸지 않고 본문 포커스
   #4 #guardian 토큰 없음 → 서버 호출 0 · 안내 1회 · 화면을 옮기면 지난 토스트 정리
   #5 테마 「라이트」 · 「다크」 · 「기기 설정」 실제 전환 + aria-pressed
   #6 대학 방문자 #join · #login에 학교 SSO 「준비 중」 없음
   사용: NODE_PATH=$(npm root -g):service/server/node_modules QA7_DB=postgres://didisam@127.0.0.1:5544/kit_qa7_d2 node tests/ui/learner-qa7.js */
const path = require('node:path'); const { spawn, execFileSync } = require('node:child_process'); const { chromium } = require('playwright');
let pg; try { pg = require('pg'); } catch { pg = require(path.resolve(__dirname, '../../service/server/node_modules/pg')); }
const ROOT = path.resolve(__dirname, '../..'); const PORT = process.env.QA7_PORT || '9985'; const DB = process.env.QA7_DB || 'postgres://didisam@127.0.0.1:5544/kit_qa7_d2';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const wait = ms => new Promise(k => setTimeout(k, ms));
const REG = '20261001', NOREG = '20269999';
(async () => {
  execFileSync(process.execPath, ['service/build-public.js', 'didisam', 'service/public'], { cwd: ROOT, stdio: 'ignore' });
  const env = { ...process.env, DATABASE_URL: DB, COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', PII_DEV_OTP: '1', SESSION_PEPPER: 'ci-only', PORT, PII_KEY: '0'.repeat(64), MFA_OFF: '1' };
  delete env.SIGNUP_CODE;
  const srv = spawn(process.execPath, ['server/index.js'], { cwd: path.join(ROOT, 'service'), env, stdio: ['ignore', 'ignore', 'pipe'] }); let elog = ''; srv.stderr.on('data', d => { elog += d; });
  const B = `http://127.0.0.1:${PORT}`; let up = false; for (let i = 0; i < 80 && !up; i++) { await wait(400); try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } }
  const end = code => { try { srv.kill('SIGTERM'); } catch (e) { } process.exit(code); };
  if (!up) { console.error('서버가 뜨지 않았습니다', elog.slice(-800)); return end(1); }
  const br = await chromium.launch(); const H = { 'x-didisam': '1', origin: B };
  try {
    /* 기관: 대학 학사 LMS · 마일리지 꺼짐(S.mileage 없음) · 접근코드 2개(학사 등록 · 미등록) */
    const actx = await br.newContext({ viewport: { width: 1280, height: 900 } });
    const su = await actx.request.post(B + '/api/signup', { headers: H, data: { email: `qa7d2${Date.now()}@example.com`, password: 'Contract2026x', orgName: 'QA7 대학', type: 'univ' } });
    const tid = (await su.json()).tenant.tid; const ap = await actx.newPage(); await ap.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await ap.goto(B + '/index.html', { waitUntil: 'load' }); await ap.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant, null, { timeout: 45000 });
    await ap.evaluate(async ([REG, NOREG]) => { try { localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } createOrg('univ', 'QA7 대학', 'lms'); await new Promise(o => setTimeout(o, 1200)); S.me.role = 'owner'; delete S.mileage;
      while (S.members.filter(m => m && m.id).length < 2) S.members.push({ id: 'm' + Math.random().toString(36).slice(2, 8), name: '학생' + S.members.length, sid: '' });
      const ms = S.members.filter(m => m && m.id).slice(0, 2); ms[0].sid = REG; ms[1].sid = NOREG;
      S.codes = [{ sid: REG, dept: '', code: 'QAREG123', at: today() }, { sid: NOREG, dept: '', code: 'QANOR123', at: today() }];
      S.lsite.pub = lsSnapshot(); S.lsite.pubAt = nowStr(); save(); }, [REG, NOREG]);
    await ap.waitForFunction(() => !LIVE.dirty && !LIVE.saving, null, { timeout: 45000 }); await wait(400);
    await actx.request.post(B + '/api/learners/sync', { headers: H, data: {} });
    /* 학사 DB: 학기 · 분반 · 등록 학번(REG)만 학생으로, 수강 등록 */
    const c = new pg.Client({ connectionString: DB }); await c.connect();
    await c.query("select set_config('app.tenant', $1, false)", [tid]);
    await c.query("insert into lms_term (tenant_id, term_id, name, starts_on, ends_on, is_operating) values ($1, 'Q7', 'QA7 학기', '2026-09-01', '2026-12-31', true) on conflict do nothing", [tid]);
    await c.query("insert into lms_course (tenant_id, course_code, name, credits, category) values ($1, 'QA701', 'QA7 자료구조', 3, 'major') on conflict do nothing", [tid]);
    const sec = (await c.query("insert into lms_section (tenant_id, term_id, course_code, section_no, title) values ($1, 'Q7', 'QA701', '01', 'QA7 자료구조 01분반') returning section_id", [tid])).rows[0].section_id;
    await c.query("delete from lms_person where tenant_id = $1 and member_no = $2", [tid, NOREG]);
    const pid = (await c.query("insert into lms_person (tenant_id, member_no, kind) values ($1, $2, 'student') on conflict (tenant_id, member_no) do update set kind = 'student' returning person_id", [tid, REG])).rows[0].person_id;
    await c.query("insert into lms_enrollment (tenant_id, section_id, person_id, kind) values ($1, $2, $3, 'regular') on conflict do nothing", [tid, sec, pid]); await c.end();
    await actx.close();

    for (const w of [390, 1440]) {
      const T = `[${w}]`; const ctx = await br.newContext({ viewport: w === 390 ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: w === 390, hasTouch: w === 390 });
      const p = await ctx.newPage(); const errs = []; const reqs = []; p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { if (/\/api\//.test(r.url())) reqs.push(r.method() + ' ' + r.url().replace(B, '')); });
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      const url = `${B}/learner.html?t=${tid}${w === 390 ? '&app=1' : ''}`;
      const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await wait(700); };
      const text = () => p.evaluate(() => (document.querySelector('#lm') || document.body).innerText);
      await p.goto(url + '#join', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LR !== 'undefined' && LR.mode === 'live' && typeof SITE === 'function' && SITE(), null, { timeout: 30000 }); await wait(800);
      /* #6 SSO 「준비 중」 숨김 */
      ok(!/준비 중/.test(await text()) && !(await p.$('.la-sso')), `${T} #6 방문자 #join에 SSO 「준비 중」 없음`);
      await go('#login'); ok(!(await p.$('.la-sso')) && !/SSO.*준비 중/.test(await text()), `${T} #6 #login에도 SSO 항목 없음`);
      /* 로그인 헬퍼 */
      const login = async (sid, code) => { await go('#login'); const det = await p.$('details.la-code:not([open]) > summary'); if (det) await det.click().catch(() => { });
        await p.evaluate(([sid, code]) => { const f = document.querySelector('form#li'); f.elements.sid.value = sid; f.elements.code.value = code; f.querySelector('button[type=submit]').click(); }, [sid, code]);
        await p.waitForFunction(() => !!LR.me, null, { timeout: 15000 }); await wait(900);
        if (/consent/.test(await p.evaluate(() => location.hash))) { await p.evaluate(async () => { const f = document.querySelector('#lcConsent'); if (!f) return; f.querySelectorAll('input[type=checkbox]').forEach(x => { x.checked = true; }); f.querySelector('button[type=submit]').click(); }); await wait(1500); } const sk = await p.$('.v2-vis [data-vis="skip"], .v2-vis [data-vis="close"]'); if (sk) await sk.click().catch(() => { }); };
      /* #1 미등록 학번 → 안내 카드 */
      await login(NOREG, 'QANOR123'); await go('#my'); await p.waitForFunction(() => !/불러오는 중/.test((document.querySelector('#lvMy') || {}).textContent || '불러오는 중') && !/불러오는 중/.test((document.querySelector('#lmsxMy') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => { });
      const nr = await p.evaluate(() => ({ n: document.querySelectorAll('[data-noreg]').length, t: (document.querySelector('[data-noreg]') || {}).textContent || '', lv: !!document.querySelector('#lvMy [data-noreg]'), lx: !!document.querySelector('#lmsxMy [data-noreg]') }));
      ok(nr.lv && nr.lx && /아직 학사 명단에 등록되지 않았어요\.\s*학과 사무실이나 담당 교수에게 문의해 주세요/.test(nr.t), `${T} #1 미등록 학번: 실시간 수업 · 내 강의실 안내 카드 ${JSON.stringify(nr)}`);
      ok(!/학사 구성원으로 등록되지 않은|학사 정보에 등록된 학번이 아닙니다/.test(await text()), `${T} #1 서버 오류 문구 대신 안내`);
      /* #2 마일리지 꺼짐: 홈 · 나 · 내 학습에서 mile-my 호출 없음 */
      for (const h of ['#home', '#acct', '#my']) await go(h);
      ok(!reqs.some(r => /mile-/.test(r)), `${T} #2 마일리지 꺼진 기관은 mile-* 호출 0 (${reqs.filter(r => /mile-/.test(r)).join(',')})`);
      /* #3 #mile · 알 수 없는 주소 → 홈, 본문 바로가기 */
      await go('#mile'); await wait(300); ok(/#home$/.test(p.url()) && (await text()).trim().length > 10, `${T} #3 #mile(꺼짐) → 홈 ${p.url().split('#')[1]}`);
      await go('#zzz-none'); await wait(500); ok(/#home$/.test(p.url()) && (await text()).trim().length > 10, `${T} #3 알 수 없는 주소 → 홈 ${p.url().split('#')[1]}`);
      await go('#lm'); await wait(300); ok(/#home$/.test(p.url()), `${T} #3 #lm 직접 열기 → 홈`);
      await go('#my'); const before = p.url(); await p.evaluate(() => { const a = document.querySelector('a.skip'); a.focus(); }); await p.keyboard.press('Enter'); await wait(300);
      ok(p.url() === before && (await p.evaluate(() => document.activeElement && document.activeElement.id)) === 'lm' && (await text()).trim().length > 10, `${T} #3 본문 바로가기: 주소 그대로 · 본문 포커스`);
      /* #4 #guardian 토큰 없음 */
      const n0 = reqs.length; await go('#guardian'); await wait(400);
      const g = await p.evaluate(() => ({ t: document.querySelector('#lm').innerText, no: !!document.querySelector('[data-ac="gno"]') }));
      ok(/동의 링크를 확인해 주세요/.test(g.t) && !g.no && !reqs.slice(n0).some(r => /guardian/.test(r)), `${T} #4 토큰 없는 #guardian: 호출 0 · 안내 화면`);
      await p.evaluate(() => toast('지난 안내예요.', 'bad')); await wait(600); await go('#home'); ok(!(await p.$('.ltoast')), `${T} #4 화면을 옮기면 지난 토스트 정리`);
      /* #3 회귀: 원래 있는 화면은 홈으로 옮기지 않는다 */
      { const moved = []; for (const h of ['#my', '#rec', '#cal', '#acct', '#msg', '#notice', '#comm', '#notes', '#courses', '#tutorials', '#my/plan']) { await go(h); await wait(300); const now = '#' + p.url().split('#')[1]; if (now !== h) moved.push(h + '→' + now); }
        ok(!moved.filter(x => /→#home$/.test(x)).length, `${T} #3 있는 화면은 그대로 (${moved.join(', ')})`); }
      /* #5 테마 */
      await go('#acct'); await p.waitForSelector('.thm-box [data-thm="light"]', { timeout: 8000 }).catch(() => { });
      if (!(await p.$('.thm-box'))) console.error('  테마 상자 없음:', (await text()).slice(0, 200).replace(/\n/g, ' '), await p.evaluate(() => !!document.querySelector('.ls-me')));
      for (const v of ['dark', 'light', 'system', 'dark']) {
        await p.click(`.thm-box [data-thm="${v}"]`, { timeout: 5000 }); await wait(250);
        const st = await p.evaluate(v => ({ th: document.documentElement.getAttribute('data-theme'), pr: [...document.querySelectorAll('.thm-box [data-thm]')].map(b => b.dataset.thm + ':' + b.getAttribute('aria-pressed')).join(','), sv: DDTheme.get() }), v);
        const want = v === 'system' ? await p.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : v;
        ok(st.th === want && st.sv === v && st.pr.includes(v + ':true') && (st.pr.match(/:true/g) || []).length === 1, `${T} #5 테마 ${v} 적용 · aria-pressed ${JSON.stringify(st)}`);
      }
      await p.click('.thm-box [data-thm="system"]');
      /* #1 등록 학번: 실시간 수업 · 내 강의실 정상 */
      await p.evaluate(async () => { try { await LR.api.logout(); } catch (e) { } }); await wait(400);
      const k0 = reqs.length; await login(REG, 'QAREG123'); await go('#my'); await p.waitForFunction(() => /QA7 자료구조/.test((document.querySelector('#lmsxMy') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => { });
      const rg = await p.evaluate(() => ({ nr: document.querySelectorAll('[data-noreg]').length, lv: ((document.querySelector('#lvMy') || {}).textContent || '').slice(0, 80), lx: ((document.querySelector('#lmsxMy') || {}).textContent || '').slice(0, 120) }));
      ok(!rg.nr && /QA7 자료구조/.test(rg.lx) && /실시간 수업 없|실시간 수업이 없|교수님이 수업을 열면/.test(rg.lv), `${T} #1 등록 학번: 내 강의실 · 실시간 수업 정상 ${JSON.stringify(rg)}`);
      void k0;
      ok(!errs.length, `${T} pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close();
    }
  } catch (e) { console.error(e); fail++; }
  await br.close();
  console.log(`learner-qa7: ${pass + fail}항목 중 ${pass} 통과 · ${fail} 실패`); end(fail ? 1 : 0);
})();
