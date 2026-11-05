'use strict';
/* 기존 스튜디오 화면이 Java(전자정부 표준프레임워크) 서버에 그대로 붙는지: 가입 → 기관 구성(대학 · 학사 LMS) → 서버 저장 → 새로고침 후 복원
   사용: node test/ui.js http://127.0.0.1:8090 */
const { chromium } = require('playwright');
const U = process.argv[2] || 'http://127.0.0.1:8090';
(async () => {
  const R = {}; const E = []; const sfx = Date.now().toString(36);
  const r = await fetch(U + '/api/signup', { method: 'POST', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: `ui${sfx}@example.com`, password: 'Passw0rd-aaa', orgName: '시범 국립대학교', type: 'univ' }) });
  const ck = r.headers.get('set-cookie').split(';')[0].split('=');
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/youtube|ytimg|googleapis|gstatic|jsdelivr/, x => x.abort());
  await ctx.addCookies([{ name: ck[0], value: ck[1], url: U }]); const P = await ctx.newPage();
  P.on('pageerror', e => E.push(e.message.slice(0, 200)));
  const api = []; P.on('response', x => { if (x.url().includes('/api/')) api.push(x.request().method() + ' ' + new URL(x.url()).pathname + ' ' + x.status()); });
  await P.goto(U + '/index.html'); await P.waitForTimeout(2500);
  R.boot = await P.evaluate(() => ({ live: typeof LIVE !== 'undefined' && !!LIVE.user, org: S && S.org && S.org.name }));
  const su = await P.$('#suForm');
  if (su) { await P.click('[data-act=su-type][data-v=univ]'); await P.click('[data-act=su-ed][data-v=lms]').catch(() => {}); await P.fill('#suForm [name=name]', '시범 국립대학교'); await P.click('#suForm button[type=submit]'); await P.waitForTimeout(3000); }
  R.after = await P.evaluate(() => ({ org: S.org && S.org.name, ed: S.org && S.org.ed }));
  const st = await P.evaluate(async () => (await fetch('/api/state')).json());
  R.server = { rev: st.rev, ed: st.doc && st.doc.org && st.doc.org.ed, tid: st.doc && st.doc.org && st.doc.org.room && st.doc.org.room.tid };
  await P.reload(); await P.waitForTimeout(2500);
  R.reload = await P.evaluate(() => ({ org: S.org && S.org.name, ed: S.org && S.org.ed }));
  await P.evaluate(() => go('sis')); await P.waitForTimeout(800);
  R.sis = await P.evaluate(() => !!document.querySelector('main, #main') && document.body.innerText.includes('학사'));
  await b.close();
  const ok = R.boot.live && R.server.rev >= 1 && R.server.ed === 'lms' && R.reload.ed === 'lms' && R.sis && !E.length && !api.some(x => / 5\d\d$/.test(x));
  console.log(JSON.stringify({ R, api: [...new Set(api)], errors: E }, null, 1));
  console.log(ok ? 'UI 확인: 통과' : 'UI 확인: 실패'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
