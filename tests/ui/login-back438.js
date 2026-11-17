'use strict';
/* v43.8 로그인 후 원래 경로로 돌아가기(QA: #login/<경로>로 들어가 로그인해도 그 경로로 돌아가지 않음)
   학습자 사이트(learner.html · 게시 미리보기 데이터룸)에서 #login/my · #login/class/<id>로 들어간 뒤
   ① 이메일 인증번호 로그인 ② 비밀번호 로그인 ③ SNS 로그인 ④ 로그인 화면의 「간편가입」으로 가입 ⑤ 처음 온 SNS 계정 → 가입
   ⑥ 이미 로그인한 상태로 #login/<경로> 를 열면 바로 그 경로, 그리고 외부 주소 · javascript: · //호스트 back은 막히는지 본다.
   휴대폰 390(앱 화면) · PC 1280(기존 화면) 두 폭.
   사용: node tests/ui/login-back438.js  (정적 서버를 테스트 안에서 띄웠다 끈다 · SHOT_DIR=폴더 를 주면 화면을 남긴다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const H = require('./hp-visual/lib.js');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const SHOT = process.env.SHOT_DIR || '';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };

const hashOf = pg => pg.evaluate(() => decodeURIComponent(location.hash.slice(1)));
const logout = pg => pg.evaluate(async () => { await LR.api.logout(); location.hash = '#home'; lrender(); });
const go = async (pg, h) => { await pg.evaluate(h => { location.hash = h; }, h); await pg.waitForTimeout(700); };
/* 이메일 인증번호(데모: 화면에 번호가 보임) */
const otp = async (pg, form) => { await pg.click(`${form} [data-ac=otp]`); await pg.waitForSelector(`${form} .la-demo-code b`, { timeout: 5000 }); await pg.fill(`${form} [name=vcode]`, (await pg.textContent(`${form} .la-demo-code b`)).trim()); };
const joinEmail = async (pg, email, nick, pw) => {
  await pg.waitForSelector('#laJoin', { timeout: 6000 });
  await consent(pg); await pg.fill('#laJoin [name=email]', email); await otp(pg, '#laJoin'); await pg.fill('#laJoin [name=nick]', nick);
  if (pw) { await pg.evaluate(() => { const d = document.querySelector('#laJoin .la-pwopt'); if (d) d.open = true; }); await pg.fill('#laJoin [name=pw]', pw); await pg.fill('#laJoin [name=pw2]', pw); }
  await pg.click('#laJoin button[type=submit]'); await pg.waitForTimeout(900); };
const loginOtp = async (pg, email) => { await pg.waitForSelector('#laLogin', { timeout: 6000 }); const b = await pg.$('#laLogin [data-ac=lmode][data-v=otp]'); if (b) { await b.click(); await pg.waitForTimeout(150); }
  await pg.fill('#laLogin [name=lid]', email); await otp(pg, '#laLogin'); await pg.click('#laLogin button[type=submit]'); await pg.waitForTimeout(900); };
const loginPw = async (pg, email, pw) => { await pg.waitForSelector('#laLogin', { timeout: 6000 }); const b = await pg.$('#laLogin [data-ac=lmode][data-v=pw]'); if (b) { await b.click(); await pg.waitForTimeout(150); }
  await pg.fill('#laLogin [name=lid]', email); await pg.fill('#laLogin [name=pw]', pw); await pg.click('#laLogin button[type=submit]'); await pg.waitForTimeout(900); };
const consent = async pg => { const all = await pg.$('#laJoin [data-ac=jall]'); if (all) await all.check().catch(() => all.click()); const a14 = await pg.$('#laJoin [name=age14][value="1"]'); if (a14) await a14.check().catch(() => {}); else { const c14 = await pg.$('#laJoin [name=age14]'); if (c14 && await c14.getAttribute('type') === 'checkbox') await c14.check().catch(() => {}); } };
const snsDlg = async (pg, act, sub, nick) => { if (act === 'jsns') { await pg.waitForSelector('#laJoin', { timeout: 6000 }); await consent(pg); } await pg.click(`[data-ac=${act}][data-v=kakao]`); await pg.waitForSelector('#laSoc', { timeout: 4000 }); await pg.fill('#laSoc [name=sub]', sub); if (nick) await pg.fill('#laSoc [name=nick]', nick); await pg.click('#laSoc button[type=submit]'); await pg.waitForTimeout(900); };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(+process.env.PORT || 9761, '127.0.0.1');
  await new Promise((o, x) => { srv.once('listening', o); srv.once('error', x); }); const base = `http://127.0.0.1:${srv.address().port}/`;
  const br = await chromium.launch(); const errs = [];
  try {
    const o = await H.mkOrg(br, base, 'adult', errs, 'filled');
    await o.op.evaluate(() => { S.settings.acct = Object.assign({}, S.settings.acct, { mode: 'open', social: ['kakao', 'naver'], approve: 'auto' }); save(); smPublish(); }); await H.dismiss(o.op);
    const cls = await o.op.evaluate(() => S.classes.filter(c => c.status === '운영중').map(c => c.id));
    for (const W of [390, 1280]) {
      const tag = W === 390 ? '휴대폰 390' : 'PC 1280'; const sfx = W;
      const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message)); pg.on('dialog', d => d.accept()); await pg.setViewportSize({ width: W, height: W === 390 ? 844 : 860 });
      const navs = []; pg.on('framenavigated', f => { if (f === pg.mainFrame()) navs.push(f.url()); });
      await pg.goto(base + `learner.html?t=${o.tid}#join`); await pg.waitForTimeout(900);
      /* 준비: 이메일(비밀번호 포함) 계정 · SNS 계정 */
      await joinEmail(pg, `back${sfx}@ex.kr`, `돌아가기${sfx}`, 'Abcd1234!'); ok(await pg.evaluate(() => !!LR.me), `${tag}: 준비 — 이메일 가입`); await logout(pg);
      await go(pg, '#join'); await snsDlg(pg, 'jsns', `kakao-back-${sfx}`, `카카오${sfx}`); ok(await pg.evaluate(() => !!LR.me), `${tag}: 준비 — SNS 가입`); await logout(pg);

      /* ① 이메일 인증번호 로그인 */
      await go(pg, '#login/my'); ok(await pg.evaluate(() => (document.querySelector('#laLogin') || {}).dataset?.back) === 'my', `${tag}: #login/my 로그인 양식이 돌아갈 곳을 앎`);
      await loginOtp(pg, `back${sfx}@ex.kr`); ok(await hashOf(pg) === 'my', `${tag}: #login/my → 인증번호 로그인 후 #my (${await hashOf(pg)})`); await logout(pg);
      await go(pg, '#login/class/' + cls[0]); await loginOtp(pg, `back${sfx}@ex.kr`); ok(await hashOf(pg) === 'class/' + cls[0], `${tag}: #login/class/<id> → 인증번호 로그인 후 강좌 화면 (${await hashOf(pg)})`);
      if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await pg.screenshot({ path: path.join(SHOT, `login-back438_${sfx}_class.jpg`), type: 'jpeg', quality: 60 }); }
      await logout(pg);
      /* ② 비밀번호 로그인 */
      await go(pg, '#login/class/' + cls[1]); await loginPw(pg, `back${sfx}@ex.kr`, 'Abcd1234!'); ok(await hashOf(pg) === 'class/' + cls[1], `${tag}: 비밀번호 로그인 후 강좌 화면 (${await hashOf(pg)})`); await logout(pg);
      /* ③ SNS 로그인(가입한 계정) */
      await go(pg, '#login/class/' + cls[2]); await snsDlg(pg, 'soclogin', `kakao-back-${sfx}`); ok(await hashOf(pg) === 'class/' + cls[2], `${tag}: SNS 로그인 후 강좌 화면 (${await hashOf(pg)})`); await logout(pg);
      await go(pg, '#login/my'); await snsDlg(pg, 'soclogin', `kakao-back-${sfx}`); ok(await hashOf(pg) === 'my', `${tag}: #login/my → SNS 로그인 후 #my (${await hashOf(pg)})`); await logout(pg);
      /* ④ 로그인 화면의 간편가입 링크 → 가입 → 원래 경로 */
      await go(pg, '#login/class/' + cls[3]); await pg.locator('#lm a[href="#join"]:visible').first().click(); await pg.waitForTimeout(700);
      await joinEmail(pg, `new${sfx}@ex.kr`, `새회원${sfx}`); ok(await hashOf(pg) === 'class/' + cls[3], `${tag}: 로그인 화면 → 간편가입 후 강좌 화면 (${await hashOf(pg)})`); await logout(pg);
      /* ⑤ 처음 온 SNS 계정으로 로그인 → 가입 마무리 → 원래 경로 */
      await go(pg, '#login/class/' + cls[4]); await snsDlg(pg, 'soclogin', `kakao-first-${sfx}`); ok(await hashOf(pg) === 'join', `${tag}: 처음 온 SNS → 가입 화면 (${await hashOf(pg)})`);
      await consent(pg); await pg.click('#laJoin button[type=submit]'); await pg.waitForTimeout(900);
      ok(await hashOf(pg) === 'class/' + cls[4], `${tag}: 처음 온 SNS 가입 후 강좌 화면 (${await hashOf(pg)})`);
      /* ⑥ 이미 로그인한 상태 */
      await go(pg, '#login/class/' + cls[0]); ok(await hashOf(pg) === 'class/' + cls[0], `${tag}: 로그인 상태로 #login/class/<id> → 바로 강좌 화면 (${await hashOf(pg)})`);
      await go(pg, '#login/my'); ok(await hashOf(pg) === 'my', `${tag}: 로그인 상태로 #login/my → 바로 #my (${await hashOf(pg)})`);
      /* 외부 back 차단(로그인 상태) */
      for (const bad of ['https://evil.example/x', '//evil.example', 'javascript:alert(1)', 'javascript%3Aalert(1)', '%2F%2Fevil.example']) {
        await go(pg, '#login/' + bad); const h = await hashOf(pg);
        ok(!/evil|javascript|:/i.test(h) && (await pg.evaluate(() => location.origin)) === base.slice(0, -1), `${tag}: 로그인 상태 외부 back 차단 '${bad}' → #${h}`); }
      await logout(pg);
      /* 외부 back 차단(로그인 양식) */
      for (const bad of ['https://evil.example/x', '//evil.example', 'javascript:alert(1)', 'JavaScript%3Aalert(1)']) {
        await go(pg, '#login/' + bad); const db = await pg.evaluate(() => (document.querySelector('#laLogin') || {}).dataset?.back || '');
        ok(!/evil|javascript|:|\/\//i.test(db), `${tag}: 로그인 양식 back에 외부 주소 없음 '${bad}' → '${db}'`);
        await loginOtp(pg, `back${sfx}@ex.kr`); const h = await hashOf(pg);
        ok(h === 'my' && (await pg.evaluate(() => location.origin)) === base.slice(0, -1), `${tag}: 외부 back '${bad}' 로그인 후 기본 #my (${h})`); await logout(pg); }
      /* lSafeBack 단위 점검 */
      const U = await pg.evaluate(() => [['my', 'my'], ['class/qc0', 'class/qc0'], ['#pay/class/qc1', 'pay/class/qc1'], ['c/qc0/l1', 'c/qc0/l1'], ['https://evil.example', ''], ['//evil.example', ''], ['javascript:alert(1)', ''], ['JAVASCRIPT%3Aalert(1)', ''], ['/\\evil.example', ''], ['login/my', ''], ['join', ''], ['', ''], ['x'.repeat(300), ''], ['data:text/html,1', ''], ['my\nx', '']].map(([i, e]) => [i.slice(0, 30), lSafeBack(i), e]));
      U.forEach(([i, g, e]) => ok(g === e, `${tag}: lSafeBack(${JSON.stringify(i)}) = '${g}' (기대 '${e}')`));
      ok(navs.every(u => u.startsWith(base)), `${tag}: 사이트 밖으로 이동한 적 없음`);
      ok(!perr.length, `${tag}: 학습자 화면 오류 없음 ${perr.slice(0, 2).join(' | ')}`);
      await pg.close();
    }
    ok(!errs.length, '스튜디오 오류 없음 ' + errs.slice(0, 2).join(' | '));
    await o.ctx.close();
  } finally { await br.close(); srv.close(); }
  console.log(`login-back438: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
