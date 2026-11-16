'use strict';
/* v43 K2 — 운영 모드(실제 Node 서버 + PostgreSQL): /api/pub/<tid>/pii 휴대폰 선택 수집(sms_noti) · /me mine.ap(추첨 · 승인 신청 상태)
   공공(공단): 이메일 회원 가입 → PUT pii phone(sms_noti) → consent.phone(목적 · 보관 · 시각) · 가린 번호 → 끄기 = 번호 · 동의 기록 삭제
   대학: 같은 요청을 403(sms_type)으로 막는다 / 학번 로그인 학습자의 mine.ap에 운영자 c.applies 상태가 내려온다
   사용: NODE_PATH=$(npm root -g):<server node_modules> FAC_DB=postgres://... PII_DEV_OTP=1 node tests/ui/k2-43-live.js */
const path = require('node:path'); const { spawn, execFileSync } = require('node:child_process'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const PORT = process.env.K2_PORT || '9643';
let B = process.env.BASE || ''; let srv = null;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };
const wait = ms => new Promise(k => setTimeout(k, ms));
(async () => {
  if (!B) {
    execFileSync(process.execPath, ['service/build-public.js', 'didisam', 'service/public'], { cwd: ROOT, stdio: 'ignore' });
    const env = { ...process.env, DATABASE_URL: process.env.FAC_DB || 'postgres://didisam@127.0.0.1:5544/fac40s', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SIGNUP_CODE: 'C0DE', PII_DEV_OTP: '1', SESSION_PEPPER: 'ci-only', PORT, PII_KEY: '0'.repeat(64) };
    srv = spawn(process.execPath, ['server/index.js'], { cwd: path.join(ROOT, 'service'), env, stdio: ['ignore', 'ignore', 'pipe'] }); let elog = ''; srv.stderr.on('data', d => { elog += d; });
    B = `http://127.0.0.1:${PORT}`; let up = false; for (let i = 0; i < 60 && !up; i++) { await wait(500); try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } }
    if (!up) { console.error('서버가 뜨지 않았습니다', elog.slice(-800)); process.exit(1); }
  }
  const br = await chromium.launch(); const H = { 'x-didisam': '1', origin: B };
  async function org(type, name, seed) { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const su = await ctx.request.post(B + '/api/signup', { headers: H, data: { email: `k2${type}${Date.now()}@example.com`, password: 'Contract2026x', orgName: name, type, code: 'C0DE' } });
    const tid = (await su.json()).tenant.tid; const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant, null, { timeout: 45000 });
    await p.evaluate(([type, name, seed]) => { if (!S || !S.org) createOrg(type, name); S.me.role = 'owner'; (new Function('S', seed))(S); save(); }, [type, name, seed || '']); await p.waitForFunction(() => !LIVE.dirty && !LIVE.saving, null, { timeout: 45000 }); await wait(300); await ctx.close(); return tid; }
  async function member(tid) { const c = await br.newContext(); const em = `m${Date.now()}${Math.random().toString(36).slice(2, 5)}@example.com`; const o = await (await c.request.post(`${B}/api/pub/${tid}/otp`, { headers: H, data: { email: em } })).json();
    const sg = await c.request.post(`${B}/api/pub/${tid}/signup`, { headers: H, data: { via: 'email', email: em, code: o.dev_code, nickname: 'k2', consent: { tos: true, privacy: true }, age14: true } }); return { c, st: sg.status(), body: (await sg.text()).slice(0, 160) }; }

  /* ① 공공(공단): 휴대폰 선택 수집 */
  const tp = await org('public', 'K2 공단');
  const m = await member(tp); ok(m.st === 200, `공단 이메일 회원 가입 ${m.st} ${m.st === 200 ? '' : m.body}`);
  if (m.st === 200) { const put = v => m.c.request.put(`${B}/api/pub/${tp}/pii`, { headers: H, data: { field: 'phone', purpose: 'sms_noti', value: v } });
    const r1 = await put('010-2345-6789'); const j1 = await r1.json().catch(() => ({})); ok(r1.status() === 200 && j1.mask === '010-****-6789' && j1.keep && j1.at, `켜기: 200 · 가린 번호 · 보관 · 시각 ${JSON.stringify(j1)}`);
    const g1 = await (await m.c.request.get(`${B}/api/pub/${tp}/pii`, { headers: H })).json(); const cp = (g1.consent || {}).phone || {};
    ok(cp.purpose === 'sms_noti' && cp.keep === 'withdraw' && !!cp.at && String(g1.phone || '').replace(/\D/g, '') === '01023456789', `동의 기록 consent.phone ${JSON.stringify(cp)}`);
    const bad = await m.c.request.put(`${B}/api/pub/${tp}/pii`, { headers: H, data: { field: 'phone', purpose: 'mkt', value: '01011112222' } }); ok(bad.status() === 400, `목적 없는 수집 400 (${bad.status()})`);
    const r2 = await put(''); ok(r2.status() === 200, '끄기 200'); const g2 = await (await m.c.request.get(`${B}/api/pub/${tp}/pii`, { headers: H })).json();
    ok(!g2.phone && !(g2.consent || {}).phone, `끄기 → 번호 · 동의 기록 삭제 ${JSON.stringify({ p: g2.phone, c: g2.consent })}`); }

  /* ② 공단 · 평생 외(기업): 받지 않음(403) — 대학은 이메일 가입 자체가 없어 더 막힌다 */
  { const tc = await org('corp', 'K2 기업', "S.settings = S.settings || {}; S.settings.acct = { ...(S.settings.acct || {}), mode: 'open' };"); const mc = await member(tc); if (mc.st === 200) { const r = await mc.c.request.put(`${B}/api/pub/${tc}/pii`, { headers: H, data: { field: 'phone', purpose: 'sms_noti', value: '01023456789' } }); ok(r.status() === 403, `기업 sms_noti → 403 (${r.status()})`); } else ok(false, `기업 가입 ${mc.st} ${mc.body}`); }
  /* 대학 */
  const tu = await org('univ', 'K2 대학', "S.settings = S.settings || {}; S.settings.acct = { ...(S.settings.acct || {}), mode: 'open' };");
  const mu = await member(tu); if (mu.st === 200) { const r = await mu.c.request.put(`${B}/api/pub/${tu}/pii`, { headers: H, data: { field: 'phone', purpose: 'sms_noti', value: '01023456789' } }); ok(r.status() === 403, `대학 sms_noti → 403 (${r.status()})`); }
  else ok(true, `대학 이메일 가입 자체가 막힘(${mu.st}) — 휴대폰을 받을 길 없음`);

  /* ③ mine.ap: 학번 로그인 학습자에게 운영자 신청 상태 */
  const ta = await org('lifelong', 'K2 평생', "const c = S.classes[0] || (S.classes.push({ id: 'ck2', name: '수채화', learners: [], curriculum: [], open: '전체' }), S.classes[S.classes.length - 1]); S.codes = [{ sid: 'K2001', dept: '', code: 'ABC234' }]; S.members.push({ id: 'm_k2', sid: 'K2001', name: 'K2001', group: '', grade: '정회원', joined: today(), last: today(), extra: {} }); c.applies = [{ id: 'm_k2', at: today(), st: 'req' }];");
  { const lc = await br.newContext(); const lp = await lc.newPage(); await lp.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await lp.goto(`${B}/learner.html?t=${ta}`, { waitUntil: 'load' }); await lp.waitForTimeout(500);
    const ap = await lp.evaluate(async () => { await LR.api.login('K2001', 'ABC234'); return (LR.mine || {}).ap || null; }); ok(ap && Object.values(ap).includes('req'), `mine.ap 신청 상태 ${JSON.stringify(ap)}`); await lc.close(); }

  await br.close(); if (srv) srv.kill(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); if (srv) srv.kill(); process.exit(1); });
