'use strict';
/* 가디언 4차 세션 화면(didisam/session.js) — 실제 Node 서버 + PostgreSQL. 만료 5분 전 안내 · [계속 사용] · 다른 기기 배너 · 설정 「로그인 기기 · 세션」 · 「기관 보안 설정」
   사용: DATABASE_URL=… NODE_PATH=… node tests/ui/session.js  (service/build-public.js로 public을 만든 뒤 서버를 띄우고 끈다) */
const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const net = require('node:net'); const crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const SVC = path.join(ROOT, 'service');
const DB = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/kit_sec4_d2';
const NP = [path.join(SVC, 'server/node_modules'), process.env.NODE_PATH, '/home/claude/kit-axon/service/server/node_modules'].filter(p => p && fs.existsSync(path.join(p, 'pg'))).join(path.delimiter);
const { Client } = require(require.resolve('pg', { paths: NP.split(path.delimiter) }));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

(async () => {
  const pub = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ss-pub-'));
  cp.execFileSync(process.execPath, [path.join(SVC, 'build-public.js'), path.join(ROOT, 'didisam'), pub], { cwd: SVC, stdio: 'ignore' });
  const port = await new Promise(k => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => k(p)); }); });
  const env = { ...process.env, NODE_PATH: NP, NODE_ENV: 'test', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SESSION_PEPPER: 'ci-only', DATABASE_URL: DB, PII_KEY: '0'.repeat(64), PORT: String(port), PUBLIC_DIR: pub, MFA_OFF: '1' };
  delete env.SIGNUP_CODE;
  const ch = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env, stdio: 'ignore' }); const B = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) { try { if ((await fetch(B + '/api/health')).ok) break; } catch (e) { } await new Promise(k => setTimeout(k, 100)); }
  const pg = new Client({ connectionString: DB }); await pg.connect(); const errs = [];
  const BR = await chromium.launch();
  try {
    const em = `ui${Date.now().toString(36)}@d.kr`, PW = 'Passw0rd-ui1';
    const ctx = await BR.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    const H = { 'x-didisam': '1', 'content-type': 'application/json' };
    const su = await ctx.request.post(B + '/api/signup', { headers: H, data: { email: em, password: PW, orgName: 'UI', type: 'corp' } }); ok(su.ok(), '가입');
    await ctx.request.put(B + '/api/state', { headers: H, data: { doc: { org: { name: 'UI', type: 'corp', room: { mode: 'saas' } } }, rev: 0 } });
    const sid = (await ctx.cookies()).find(c => c.name === 'dd_sid').value;
    ok((await ctx.cookies()).find(c => c.name === 'dd_sid').expires === -1, '운영자 쿠키는 세션 쿠키');
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(B + '/', { waitUntil: 'load' }); await p.waitForFunction(() => window.SESS && window.SESS.info, null, { timeout: 15000 }).catch(() => {});
    await pg.query("update sessions set expires_at = now() + interval '4 minutes' where id = $1", [sha(sid)]); /* 부팅 API 호출은 세션을 연장하므로 부팅 뒤에 줄인다 */
    await p.evaluate(() => window.SESS.poll());
    await p.waitForSelector('#ss-warn', { timeout: 15000 }).catch(() => {});
    const t = await p.textContent('#ss-warn').catch(() => '');
    ok(/분 뒤 자동으로 로그아웃됩니다\. 계속 사용하려면 \[계속 사용\]을 누르십시오\./.test(t), '만료 5분 전 안내: ' + t);
    await p.click('#ss-warn [data-ss=touch]'); await p.waitForTimeout(800);
    ok(!(await p.$('#ss-warn')), '계속 사용 → 안내 닫힘');
    ok((await pg.query('select extract(epoch from expires_at - now())::int s from sessions where id = $1', [sha(sid)])).rows[0].s > 3500, '계속 사용 → 60분 연장');
    /* 다른 기기 로그인이 있는 상태에서 로그인 응답 others → 배너 */
    await fetch(B + '/api/login', { method: 'POST', headers: H, body: JSON.stringify({ email: em, password: PW }) });
    await p.evaluate(([e, w]) => fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: w }) }), [em, PW]);
    await p.waitForSelector('#ss-others', { timeout: 5000 }).catch(() => {});
    ok(/다른 기기에서도 로그인되어 있습니다/.test(await p.textContent('#ss-others').catch(() => '')), '다른 기기 배너');
    /* 기관 첫 화면(①)을 거치지 않은 시험 계정이라 S가 없을 수 있다 → 설정 본문을 직접 붙여 확인 */
    const mount = k => p.evaluate(k => { if (typeof S !== 'undefined' && S) { UI.settings = k; go('settings'); return; } let b = document.getElementById('ssbox'); if (!b) { b = document.createElement('div'); b.id = 'ssbox'; document.body.appendChild(b); } const id = k === 'sess' ? 'ss-body' : 'os-body'; b.innerHTML = `<div id="${id}"></div>`; return (k === 'sess' ? window.SESS.sessHTML() : window.SESS.osecHTML()).then(h => { document.getElementById(id).innerHTML = h; }); }, k);
    await mount('sess'); await p.waitForSelector('#ss-body table', { timeout: 8000 }).catch(() => {});
    ok((await p.$$('#ss-body tbody tr')).length === 2, '로그인 기기 · 세션 목록 2줄');
    await p.fill('#ss-wr', '성적 일괄 입력').catch(() => {}); await p.selectOption('#ss-wm', '120').catch(() => {}); await p.$eval('[data-act=ss-work]', el => el.click()).catch(() => {}); await p.waitForTimeout(900);
    ok((await pg.query("select count(*)::int n from audit_log where actor = $1 and action = 'session.work'", [em])).rows[0].n === 1, '작업 모드 켜기 → audit');
    await p.$eval('[data-act=ss-out]', el => el.click()).catch(() => {}); await p.waitForTimeout(900);
    ok((await pg.query('select count(*)::int n from sessions s join users u on u.id = s.user_id where u.email = $1', [em])).rows[0].n === 1, '다른 기기 모두 로그아웃');
    await mount('osec'); await p.waitForSelector('#os-idle', { timeout: 8000 }).catch(() => {});
    await p.selectOption('#os-idle', '20').catch(() => {}); await p.selectOption('#os-mfa', 'totp').catch(() => {}); await p.$eval('[data-act=os-save]', el => el.click()).catch(() => {}); await p.waitForTimeout(900);
    const o = await (await ctx.request.get(B + '/api/org/security')).json(); ok(o.idleMin === 20 && o.mfa === 'totp', '기관 보안 설정 저장 ' + JSON.stringify(o));
    ok(!errs.length, '페이지 오류 없음 ' + errs.slice(0, 3).join(' | '));
  } finally { await BR.close(); await pg.end(); ch.kill('SIGTERM'); fs.rmSync(pub, { recursive: true, force: true }); }
  console.log(`session UI: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
