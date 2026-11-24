'use strict';
/* 보안 4차 #1 관리자 추가 인증 화면 — 실제 Node 서버(MFA_OFF=0 · MFA_DEV=1, 메일 미설정 → devCode) + PostgreSQL.
   이메일 로그인 → 2단계 입력 창 → 틀린 번호 오류 → 맞는 번호 → 대시보드, 계정 설정 카드(window.mfaSettingsHTML).
   사용: DATABASE_URL=… NODE_PATH=… node tests/ui/mfa.js (포트 9811, 끝나면 서버를 끈다) */
const path = require('node:path'); const cp = require('node:child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const SVC = path.join(ROOT, 'service'); const PORT = process.env.PORT_MFA || '9811'; const B = `http://127.0.0.1:${PORT}`;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };
(async () => {
  cp.execFileSync(process.execPath, ['build-public.js'], { cwd: SVC, stdio: 'ignore' });
  const env = { ...process.env, COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SESSION_PEPPER: 'ci-only', PII_KEY: '0'.repeat(64), PORT, MFA_OFF: '0', MFA_DEV: '1', SIGNUP_CODE: '' };
  delete env.MAIL_PROVIDER; delete env.SIGNUP_CODE;
  const ch = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env, stdio: 'ignore' });
  const stop = () => { try { ch.kill('SIGKILL'); } catch (e) { } };
  try {
    for (let i = 0; i < 150; i++) { try { if ((await fetch(B + '/api/health')).ok) break; } catch (e) { } await new Promise(k => setTimeout(k, 100)); }
    const em = `ui${Date.now().toString(36)}@d.kr`, PW = 'Passw0rd-mfaui';
    const s = await fetch(B + '/api/signup', { method: 'POST', headers: { 'content-type': 'application/json', 'x-didisam': '1' }, body: JSON.stringify({ email: em, password: PW, orgName: 'MFA UI', type: 'corp' }) }); ok(s.status === 200, '가입(API)');
    const br = await chromium.launch(); const pg = await (await br.newContext({ viewport: { width: 1280, height: 860 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(B + '/#login'); await pg.waitForSelector('#entry, #liForm', { timeout: 8000 });
    if (await pg.$('#liForm')) { await pg.fill('#liForm [name=email]', em); await pg.fill('#liForm [name=password]', PW); await pg.click('#liForm button[type=submit]'); }
    else { if (!(await pg.$('#lvMail'))) await pg.click('#entryMail [data-act=lv-mail]'); await pg.fill('#lvMail [name=email]', em); await pg.fill('#lvMail [name=password]', PW); await pg.click('#lvMailGo'); }
    await pg.waitForSelector('#mfaBox', { timeout: 5000 }).catch(() => {});
    ok(!!(await pg.$('#mfaBox')), '비밀번호 뒤 2단계 입력 창');
    const txt = await pg.textContent('#mfaBox').catch(() => ''); ok(/등록된 이메일\(ui\*+@d\.kr\)로 보낸 인증번호 6자리를 입력하십시오/.test(txt), '합니다체 안내 · 가린 이메일');
    const dev = (txt.match(/개발 환경 인증번호: (\d{6})/) || [])[1]; ok(!!dev, 'MFA_DEV devCode 표시');
    await pg.fill('[name=mfacode]', dev === '000000' ? '111111' : '000000'); await pg.click('[data-mfa-b=ok]'); await pg.waitForTimeout(400);
    ok(/인증번호가 올바르지 않습니다/.test(await pg.textContent('#mfaBox [data-mfa=err]')), '틀린 번호 오류 문구');
    await pg.fill('[name=mfacode]', dev); await Promise.all([pg.waitForNavigation({ timeout: 8000 }).catch(() => {}), pg.click('[data-mfa-b=ok]')]);
    await pg.waitForSelector('#main, #onbTpl', { timeout: 8000 }).catch(() => {}); const me = await pg.evaluate(() => fetch('/api/me', { headers: { 'x-didisam': '1' } }).then(r => r.status));
    ok(me === 200 && !(await pg.$('#entry')), `인증 후 스튜디오 진입(세션 ${me})`);
    const card = await pg.evaluate(async () => { const d = document.createElement('div'); d.innerHTML = window.mfaSettingsHTML(); document.body.appendChild(d); await new Promise(k => setTimeout(k, 800)); return d.textContent; });
    ok(/2단계 인증/.test(card) && /이메일 인증번호/.test(card) && /인증 앱 등록/.test(card), '계정 설정 카드(mfaSettingsHTML)');
    ok(!errs.length, '스크립트 오류 없음 ' + errs.slice(0, 2).join(' | '));
    await br.close();
  } finally { stop(); }
  console.log(`mfa UI: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
