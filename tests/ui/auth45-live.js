'use strict';
/* v45 운영 모드 진입 동선(FLOW §5 운영 N4–N6 · R1–R3 · C1–C3 · E1–E6 · A1) — 실제 Node 서버 + PostgreSQL + 모의 OAuth 제공자.
   진입 한 장(로그인 / 가입 탭 · 카카오 · Google · 이메일) → ① 기관(#suForm) → ② 홈페이지(나중에 고를게요 / 템플릿) → 대시보드, 재방문 · 이어가기 · 오류 문구.
   이 시험이 서버를 설정별로 띄우고 끈다(가입은 IP당 시간 10회 제한이 있어 묶음마다 새 서버):
     A 기본(구글 · 카카오, 초대 코드 없음) · A2 오류 묶음 · B 초대 코드(SIGNUP_CODE) · C 가입 받지 않음(SIGNUP=off) + 카카오 키 없음
   사용: node tests/ui/auth45-live.js
     DATABASE_URL(기본 postgres://didisam@127.0.0.1:5544/fac40s) · NODE_PATH(pg 모듈) · SHOT_DIR=폴더(PC 1440 · 휴대폰 390 캡처) · ONLY_W=1440|390
     STRICT=1이면 ② 화면(onb45.js)이 없을 때 건너뛰지 않고 실패로 셉니다(통합 전에는 ② 관련 확인을 '건너뜀'으로 표시). */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const net = require('node:net');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const SVC = path.join(ROOT, 'service');
const DB = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/fac40s';
const NP = [path.join(SVC, 'server/node_modules'), process.env.NODE_PATH, '/home/claude/kit-axon/service/server/node_modules'].filter(p => p && fs.existsSync(path.join(p, 'pg'))).join(path.delimiter);
const { Client } = require(require.resolve('pg', { paths: NP.split(path.delimiter) }));
const SHOT = process.env.SHOT_DIR || ''; const STRICT = process.env.STRICT === '1';
const PW = 'Auth45test2026';
let pass = 0, fail = 0, skip = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };
const UID = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── 모의 OAuth 제공자: /<p>/auth는 시험이 NEXT[p]에 넣어 둔 프로필로 곧바로 콜백(거부면 error=access_denied) ── */
const NEXT = {};
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const mock = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const [, p, what] = u.pathname.split('/');
  let body = ''; req.on('data', c => { body += c; }); req.on('end', () => {
    if (what === 'auth') { const cb = new URL(u.searchParams.get('redirect_uri')); const pr = NEXT[p]; cb.searchParams.set('state', u.searchParams.get('state') || '');
      if (!pr || pr === 'deny') cb.searchParams.set('error', 'access_denied'); else cb.searchParams.set('code', b64(pr));
      res.writeHead(302, { location: cb.toString() }); return res.end(); }
    if (what === 'token' && req.method === 'POST') { const f = new URLSearchParams(body); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ access_token: f.get('code'), token_type: 'bearer' })); }
    if (what === 'me') { const t = String(req.headers.authorization || '').replace(/^Bearer /, ''); try { const j = JSON.parse(Buffer.from(t, 'base64url').toString()); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(j)); } catch (e) { res.writeHead(401); return res.end(); } }
    res.writeHead(404); res.end();
  });
});
const kakaoP = (email, id) => ({ id: id || Number(String(Date.now()).slice(-9)) + Math.floor(Math.random() * 1000), kakao_account: { email, is_email_valid: true, is_email_verified: true } });
const googleP = (email, sub) => ({ sub: sub || 'g' + UID(), email, email_verified: true });

const freePort = () => new Promise(ok => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
let MOCK = '';
async function server(extra, tag) {
  const port = await freePort();
  const env = { ...process.env, NODE_PATH: NP, NODE_ENV: 'test', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SESSION_PEPPER: 'ci-only', PII_DEV_OTP: '1', DATABASE_URL: DB, PII_KEY: '0'.repeat(64), PORT: String(port),
    OAUTH_MOCK_URL: MOCK, OAUTH_GOOGLE_ID: 'gid', OAUTH_GOOGLE_SECRET: 'gsec', OAUTH_KAKAO_ID: 'kid', ...extra };
  delete env.SIGNUP_CODE; if (extra.SIGNUP_CODE) env.SIGNUP_CODE = extra.SIGNUP_CODE; for (const k of Object.keys(env)) if (env[k] == null) delete env[k];
  const ch = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env, stdio: ['ignore', 'pipe', 'pipe'] }); let log = '';
  ch.stdout.on('data', d => { log += d; }); ch.stderr.on('data', d => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) { try { const r = await fetch(base + '/api/health'); if (r.ok) break; } catch (e) { } if (ch.exitCode != null) throw new Error(`서버 ${tag} 종료: ${log.slice(-600)}`); await new Promise(k => setTimeout(k, 100)); }
  return { base, stop: () => new Promise(k => { if (ch.exitCode != null) return k(); ch.once('exit', k); ch.kill('SIGTERM'); setTimeout(() => ch.kill('SIGKILL'), 3000); }) };
}

/* ── 화면 도우미(FLOW §2 선택자: #entry · #entrySoc · #entryMail · #entryErr · #suForm · #suEmpty · #suErr, ② #onbTpl · [data-act=onb-later] · .tpd-c · [data-act=onb-use|tpd-use]) ── */
let BR, W = 1440;
async function ctxNew() { return BR.newContext({ viewport: { width: W, height: W === 390 ? 844 : 900 }, ...(W === 390 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) }); }
async function open(ctx, url, errs) {
  const pg = await ctx.newPage(); pg.calls = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  pg.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) pg.calls.push(r.method() + ' ' + u.pathname); });
  await pg.goto(url, { waitUntil: 'load' }); await settle(pg); return pg;
}
const settle = async pg => { await pg.waitForFunction(() => !document.querySelector('.gen') && document.querySelector('#entry, #suForm, #onbTpl, #main'), null, { timeout: 12000 }).catch(() => {}); await pg.waitForTimeout(250); };
const scr = pg => pg.evaluate(() => { if (document.querySelector('#onbTpl')) return 'tpl'; if (document.querySelector('#entry')) return 'entry'; if (document.querySelector('#suForm')) return 'org'; if (document.querySelector('#main')) return (typeof S !== 'undefined' && S && S.onb && S.onb.tpl === 'pending') ? 'tpl?' : 'app'; return '?'; });
const view = pg => pg.evaluate(() => (window.SUV || {}).view);
const errTxt = (pg, sel = '#entryErr') => pg.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const onbOn = pg => pg.evaluate(() => typeof window.onbStart === 'function');
async function tab(pg, v) { if ((await view(pg)) === v) return; const s = `#entry [role=tab][data-v=${v}]`; if (await pg.$(s)) await pg.click(s); else { const T = await pg.$$('#entry [role=tab]'); if (T.length === 2) await T[v === 'login' ? 0 : 1].click(); } await pg.waitForTimeout(150); }
async function mail(pg, email, pw, code) {
  if (!(await pg.$('#lvMail'))) await pg.click('#entryMail [data-act=lv-mail]');
  await pg.fill('#lvMail [name=email]', email); await pg.fill('#lvMail [name=password]', pw);
  if (code != null && await pg.$('#lvMail [name=code]')) await pg.fill('#lvMail [name=code]', code);
  await pg.click('#lvMailGo'); await pg.waitForTimeout(250); await settle(pg);
}
async function social(pg, p) { await Promise.all([pg.waitForNavigation({ waitUntil: 'load', timeout: 12000 }), pg.click(`#entrySoc a.lvsb.${p}`)]); await settle(pg); }
async function org(pg, type, name, { ed, empty, code } = {}) {
  const card = ['k12', 'adult'].includes(type) ? 'academy' : type;
  await pg.click(`#suForm [data-act=su-type][data-v=${card}]`); if (card === 'academy') await pg.click(`#suForm [data-act=su-type][data-v=${type}]`);
  if (ed) await pg.click(`#suForm [data-act=su-ed][data-v=${ed}]`);
  await pg.fill('#suForm input[name=name]', name);
  if (empty != null && await pg.$('#suEmpty')) await pg.setChecked('#suEmpty', empty);
  if (code != null && await pg.$('#suForm [name=code]')) await pg.fill('#suForm [name=code]', code);
  await pg.click('#suForm button[type=submit]');
  await pg.waitForFunction(() => (typeof S !== 'undefined' && S && S.org && !document.querySelector('.gen')) || ((document.querySelector('#suErr') || {}).textContent || '').trim() || document.querySelector('#entry'), null, { timeout: 12000 }).catch(() => {});
  await pg.waitForTimeout(300); await settle(pg);
}
/* ② — onb45.js가 없으면(통합 전) 건너뜀으로 센다 */
async function tpl(pg, how, tag) {
  if ((await scr(pg)) !== 'tpl') { if (!STRICT && !(await onbOn(pg))) { skip++; console.log(`- ${tag}: ② 화면 건너뜀(onb45.js 미통합)`); return null; } ok(false, `${tag}: ② 홈페이지 화면 (${await scr(pg)})`); return null; }
  ok(true, `${tag}: ② 홈페이지 화면`); if (SHOT && !tpl.shot) { tpl.shot = 1; await shot(pg, 'tpl'); await a11y(pg, `${tag} ②`, '#onbTpl'); }
  if (how === 'later') { await pg.click('#onbTpl [data-act=onb-later] >> nth=0'); await pg.waitForTimeout(500); await settle(pg); return 'later'; }
  /* onb45.js: 카드를 고르면 선택 표시(또는 미리 보기 시트) → 시트의 tpd-use 또는 하단 onb-use */
  await pg.click('#onbTpl .tpd-c:not([hidden])'); await pg.waitForTimeout(400); let id;
  if (await pg.$('[data-act=tpd-use]:visible')) { id = await pg.getAttribute('[data-act=tpd-use]:visible', 'data-v'); await pg.click('[data-act=tpd-use]:visible'); }
  else { id = await pg.getAttribute('#onbTpl [data-act=onb-use]', 'data-v'); await pg.click('#onbTpl [data-act=onb-use]'); }
  await pg.waitForTimeout(500); await settle(pg); return id;
}
const shot = async (pg, n) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await pg.screenshot({ path: path.join(SHOT, `auth45-live_${W}_${n}.png`), fullPage: true }); };
/* 서버 문서(다른 컨텍스트에서도 같음) — 저장 디바운스를 기다려 조건이 맞을 때까지 */
async function doc(ctx, base, until = () => true) { let j = {}; for (let i = 0; i < 40; i++) { const r = await ctx.request.get(base + '/api/state'); j = r.ok() ? await r.json() : { st: r.status() }; if (until(j)) break; await new Promise(k => setTimeout(k, 250)); } return j; }
/* A1: 글자 대비 4.5:1(큰 글자 3:1) · 흰 바탕 · 390px 가로 스크롤 없음 */
async function a11y(pg, tag, root) {
  const r = await pg.evaluate(rs => {
    const num = s => (String(s).match(/[\d.]+/g) || []).map(Number);
    const L = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = num(cs.backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.6)) return c; } return [255, 255, 255]; };
    const R = document.querySelector(rs) || document.body; const bad = [];
    R.querySelectorAll('*').forEach(el => {
      if (!el.getClientRects().length || el.closest('[disabled],[aria-disabled="true"],[hidden],.sr-only')) return;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.5) return;
      const bg = bgOf(el); if (!bg) return; let fg = num(cs.color); if (fg[3] !== undefined && fg[3] < 1) fg = [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
      const a = L(fg), b = L(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const fs = parseFloat(cs.fontSize); const big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
      if (ratio < (big ? 3 : 4.5)) bad.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}「${el.textContent.trim().slice(0, 14)}」${ratio.toFixed(2)}`);
    });
    const rb = bgOf(R) || [0, 0, 0]; return { bad, white: L(rb) > 0.85, sx: document.documentElement.scrollWidth - innerWidth };
  }, root);
  ok(!r.bad.length, `${tag}: 글자 대비 4.5:1 이상 ${r.bad.slice(0, 4).join(' · ')}${r.bad.length > 4 ? ` 외 ${r.bad.length - 4}` : ''}`);
  ok(r.white, `${tag}: 흰 바탕`); ok(r.sx <= 0, `${tag}: 가로 스크롤 없음 (${r.sx}px)`);
}
const noPw = (pg, pw) => pg.evaluate(p => { const all = []; for (const s of [localStorage, sessionStorage]) for (let i = 0; i < s.length; i++) all.push(s.getItem(s.key(i)) || ''); return !all.some(v => v.includes(p)); }, pw);
const cnt = (pg, re) => pg.calls.filter(c => re.test(c)).length;

/* ── 묶음 A: N4 · R1 · N5 · R2 · N6 · C1 · C2 · C3 ── */
async function groupA(sv, db) {
  const B = sv.base; const errs = [];
  /* N4 이메일 → 기업 · 빈 스튜디오 끔 → 템플릿 */
  { const c = await ctxNew(); const p = await open(c, B + '/', errs); const em = `n4_${UID()}@example.com`; const T = `N4 ${W}`;
    ok((await scr(p)) === 'entry', `${T}: 첫 방문은 진입 화면 (${await scr(p)})`); ok((await view(p)) === 'signup', `${T}: 흔적 없으면 가입 탭 (${await view(p)})`);
    ok(await p.$('#entrySoc a.lvsb.kakao') && await p.$('#entrySoc a.lvsb.google') && await p.$('#entryMail [data-act=lv-mail]'), `${T}: 카카오 · Google · 이메일 버튼 3개`);
    ok((await p.getAttribute('#entryErr', 'role')) === 'alert', `${T}: 오류 줄 role=alert`);
    await shot(p, 'entry-signup'); await a11y(p, `${T} 진입 가입 탭`, '#entry');
    { const o = await p.evaluate(() => { const L = [...document.querySelectorAll('#entry a[href], #entry button, #entry input, #entry [tabindex]')].filter(e => e.getClientRects().length && !e.disabled); return { pos: L.some(e => e.tabIndex > 0), seq: L.map(e => e.dataset.lvp || e.dataset.act || '') }; });
      const i = k => o.seq.indexOf(k); ok(!o.pos && i('kakao') >= 0 && i('kakao') < i('google') && i('google') < i('lv-mail'), `${T}: 키보드 순서 카카오 → Google → 이메일 (${o.seq.filter(Boolean).join(' ')})`); }
    await mail(p, em, 'short1', null); ok((await errTxt(p)).includes('10자 이상'), `${T}: 비밀번호 규칙 문구 (${await errTxt(p)})`); ok((await scr(p)) === 'entry', `${T}: 규칙 위반이면 ①로 가지 않음`);
    await mail(p, 'bad@', PW, null); ok((await errTxt(p)).includes('이메일 형식'), `${T}: 이메일 형식 문구`);
    await mail(p, em, PW, null); ok((await scr(p)) === 'org', `${T}: [다음] → ① 기관 (${await scr(p)})`); ok(cnt(p, /\/api\/signup$/) === 0, `${T}: ①까지는 계정을 만들지 않음`);
    ok((await p.textContent('#suForm')).includes(em), `${T}: ① 계정 줄에 이메일`); await shot(p, 'org'); await a11y(p, `${T} ①`, '#suForm');
    await org(p, 'corp', '해운대테크', { empty: false }); ok(cnt(p, /POST \/api\/signup$/) === 1, `${T}: /api/signup 1회 (${cnt(p, /POST \/api\/signup$/)})`);
    const id = await tpl(p, 'pick', T); await settle(p);
    const d = await doc(c, B, j => j.rev >= 1 && (!id || (j.doc && j.doc.onb && j.doc.onb.tpl === 'picked')));
    ok(d.rev >= 1 && d.doc && d.doc.org.name === '해운대테크', `${T}: 서버 문서 저장 rev ${d.rev}`); ok((d.doc.members || []).length > 0, `${T}: 빈 스튜디오 끔 → 샘플 데이터 있음 (${(d.doc.members || []).length})`);
    if (id) { ok(d.doc.onb && d.doc.onb.tpl === 'picked' && d.doc.site && d.doc.site.tpl === id, `${T}: doc.onb.tpl=picked · site.tpl=${id} (${JSON.stringify(d.doc.onb)} ${d.doc.site && d.doc.site.tpl})`); ok(d.doc.bld && d.doc.bld.steps && d.doc.bld.steps.site && d.doc.bld.steps.site.done, `${T}: 시작 가이드 홈페이지 완료`); }
    ok((await scr(p)) === 'app', `${T}: 대시보드 진입 (${await scr(p)})`); await shot(p, 'dash');
    ok(await noPw(p, PW), `${T}: 비밀번호가 브라우저 저장소에 없음`); ok(await p.evaluate(() => localStorage.getItem('didisam.seen') === '1'), `${T}: didisam.seen=1`);
    /* R1 새로고침 · 로그아웃 → 로그인 */
    await p.reload({ waitUntil: 'load' }); await settle(p); ok((await scr(p)) === 'app', `R1 ${W}: 새로고침 → 대시보드 (${await scr(p)})`);
    await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.evaluate(() => ACT['live-logout']())]); await settle(p);
    ok((await scr(p)) === 'entry' && (await view(p)) === 'login', `R1 ${W}: 로그아웃 → 진입 · 로그인 탭 (${await scr(p)} ${await view(p)})`); await shot(p, 'entry-login'); await a11y(p, `R1 ${W} 로그인 탭`, '#entry');
    await mail(p, em, PW); await settle(p); ok((await scr(p)) === 'app' && await p.evaluate(() => S.org.name) === '해운대테크', `R1 ${W}: 이메일 로그인 → 마지막 기관 대시보드`);
    await c.close(); }
  /* N5 카카오 → 평생 → 나중에, R2 기존 회원 카카오 로그인 */
  const kEm = `n5_${UID()}@example.com`; const kP = kakaoP(kEm);
  { const c = await ctxNew(); const p = await open(c, B + '/', errs); const T = `N5 ${W}`; NEXT.kakao = kP;
    await social(p, 'kakao'); ok((await scr(p)) === 'org', `${T}: 카카오(처음) → ① (${await scr(p)})`); ok((await p.textContent('#suForm')).includes(kEm) && (await p.textContent('#suForm')).includes('카카오'), `${T}: ① 계정 줄 「카카오 계정 …으로 가입합니다」`);
    ok(await p.isChecked('#suEmpty').catch(() => false), `${T}: 빈 스튜디오 기본 켜짐`);
    await org(p, 'lifelong', '마린평생교육원'); ok(cnt(p, /POST \/api\/oauth\/signup$/) === 1, `${T}: /api/oauth/signup 1회`);
    const how = await tpl(p, 'later', T); await settle(p);
    const d = await doc(c, B, j => j.rev >= 1 && (!how || (j.doc && j.doc.onb && j.doc.onb.tpl === 'later')));
    ok(d.doc && (d.doc.members || []).length === 0, `${T}: 빈 스튜디오(샘플 없음)`);
    if (how) { const t0 = await p.evaluate(() => tplFor('lifelong')[0].id); ok(d.doc.onb.tpl === 'later' && d.doc.site.tpl === t0, `${T}: 나중에 → 추천 1번 ${t0} (${d.doc.site.tpl})`); }
    const q = await db.query('select o.provider from user_oauth o join users u on u.id = o.user_id where lower(u.email) = $1', [kEm]); ok(q.rows.length === 1 && q.rows[0].provider === 'kakao', `${T}: user_oauth 카카오 행`);
    await c.close(); }
  { const c = await ctxNew(); const p = await open(c, B + '/', errs); NEXT.kakao = kP; await social(p, 'kakao');
    ok((await scr(p)) === 'app' && await p.evaluate(() => S.org.name) === '마린평생교육원', `R2 ${W}: 기존 회원 카카오 → 대시보드 바로(② 없음) (${await scr(p)})`); await c.close(); }
  /* N6 Google → 직훈 → 템플릿 */
  { const c = await ctxNew(); const p = await open(c, B + '/', errs); const T = `N6 ${W}`; NEXT.google = googleP(`n6_${UID()}@gmail.com`);
    await social(p, 'google'); ok((await scr(p)) === 'org' && (await p.textContent('#suForm')).includes('Google'), `${T}: Google(처음) → ①`);
    await org(p, 'voc', '산타직업훈련원'); const id = await tpl(p, 'pick', T); await settle(p); const d = await doc(c, B, j => j.rev >= 1);
    ok(d.doc && d.doc.org.type === 'voc' && (await scr(p)) === 'app', `${T}: 직훈 기관 대시보드`); if (id) ok(d.doc.site.tpl === id, `${T}: 고른 템플릿 저장`); await c.close(); }
  /* C1 ②에서 창 닫기 → 다른 브라우저 컨텍스트에서 로그인 → ② 이어감 */
  { const c = await ctxNew(); const p = await open(c, B + '/', errs); const em = `c1_${UID()}@example.com`; const T = `C1 ${W}`;
    await mail(p, em, PW); await org(p, 'univ', '해운대대학교', { ed: 'lms' });
    const at2 = (await scr(p)) === 'tpl'; await doc(c, B, j => j.rev >= 1); await c.close();
    const c2 = await ctxNew(); const p2 = await open(c2, B + '/#login', errs); ok((await view(p2)) === 'login', `${T}: #login 해시로 로그인 탭`); await mail(p2, em, PW); await settle(p2);
    if (at2 || STRICT || await onbOn(p2)) { ok((await scr(p2)) === 'tpl', `${T}: 다른 컨텍스트 로그인 → ② 이어감 (${await scr(p2)})`); if ((await scr(p2)) === 'tpl') { await tpl(p2, 'later', T); ok((await scr(p2)) === 'app', `${T}: 이어서 마침 → 대시보드`); } }
    else { skip++; console.log(`- ${T}: ② 이어가기 건너뜀(onb45.js 미통합)`); }
    ok(await p2.evaluate(() => S.org.ed) === 'lms', `${T}: 대학 · 학사 LMS 유지`); await c2.close(); }
  /* C2 /api/signup 직후 저장 전에 닫힘(문서 없음) → 로그인 → ① 이어가기, API 추가 호출 없음 */
  { const c = await ctxNew(); const em = `c2_${UID()}@example.com`; const T = `C2 ${W}`;
    const r = await c.request.post(B + '/api/signup', { headers: { 'x-didisam': '1', origin: B }, data: { email: em, password: PW, orgName: '이어가기학원', type: 'adult' } }); ok(r.status() === 200, `${T}: 준비 — 계정만 만듦 ${r.status()}`); await c.clearCookies();
    const p = await open(c, B + '/#login', errs); await mail(p, em, PW); await settle(p);
    ok((await scr(p)) === 'org', `${T}: 로그인 → ① 이어가기 (${await scr(p)})`); ok(await p.inputValue('#suForm input[name=name]') === '이어가기학원', `${T}: 기관명 미리 채움`);
    ok(await p.evaluate(() => SU.type === 'adult'), `${T}: 유형 미리 채움`); ok(!!(await p.$('#suForm [data-act=live-logout]')), `${T}: 다른 계정으로 로그인`);
    const n0 = p.calls.length; await p.click('#suForm button[type=submit]'); await p.waitForTimeout(1200); await settle(p);
    ok(!p.calls.slice(n0).some(x => /signup/.test(x)), `${T}: 가입 API 추가 호출 없음 (${p.calls.slice(n0).join(',')})`);
    const d = await doc(c, B, j => j.rev >= 1); ok(d.rev >= 1 && d.doc.org.type === 'adult', `${T}: 첫 저장 rev ${d.rev}`); await c.close(); }
  /* C3 소셜 보류 중 해시 없이 다시 오면 ① */
  { const c = await ctxNew(); const p = await open(c, B + '/', errs); const T = `C3 ${W}`; const em = `c3_${UID()}@example.com`; NEXT.kakao = kakaoP(em);
    await social(p, 'kakao'); ok((await scr(p)) === 'org', `${T}: 보류 → ①`);
    await p.goto(B + '/', { waitUntil: 'load' }); await settle(p); ok((await scr(p)) === 'org' && (await p.textContent('#suForm')).includes(em), `${T}: 해시 없이 재방문 → ① 이어감 (${await scr(p)})`);
    await p.click('#suForm [data-act=lv-ocancel]'); await p.waitForTimeout(400); ok((await scr(p)) === 'entry', `${T}: 다른 방법으로 가입 → 진입`);
    await p.goto(B + '/', { waitUntil: 'load' }); await settle(p); ok((await scr(p)) === 'entry', `${T}: 보류 취소 후 재방문 → 진입`); await c.close(); }
  ok(!errs.length, `묶음 A ${W}: 페이지 오류 없음 ${errs.slice(0, 3).join(' | ')}`);
}

/* ── 묶음 A2: E1 · E2 · E3 · E4 · R3 ── */
async function groupA2(sv) {
  const B = sv.base; const errs = []; const H = { 'x-didisam': '1', origin: B };
  /* E1 이미 가입된 이메일 */
  { const c = await ctxNew(); const em = `e1_${UID()}@example.com`; const T = `E1 ${W}`;
    await c.request.post(B + '/api/signup', { headers: H, data: { email: em, password: PW, orgName: '기존기관', type: 'corp' } }); await c.clearCookies();
    const p = await open(c, B + '/#signup', errs); await mail(p, em, PW); await org(p, 'corp', '중복기관');
    ok((await errTxt(p, '#suErr')).includes('이미 가입된 이메일'), `${T}: ① [다음] 409 문구 (${await errTxt(p, '#suErr')})`);
    await p.waitForTimeout(1500); ok((await scr(p)) === 'entry' && (await view(p)) === 'login', `${T}: 1.2초 뒤 로그인 탭`); ok(await p.inputValue('#lvMail [name=email]').catch(() => '') === em, `${T}: 이메일 미리 채움`);
    await c.close(); }
  /* E2 비밀번호 틀림 · 8회 초과 */
  { const c = await ctxNew(); const em = `e2_${UID()}@example.com`; const T = `E2 ${W}`;
    await c.request.post(B + '/api/signup', { headers: H, data: { email: em, password: PW, orgName: '틀림기관', type: 'corp' } }); await c.clearCookies();
    const p = await open(c, B + '/#login', errs); await mail(p, em, 'Wrong12345x'); ok((await errTxt(p)).includes('이메일 또는 비밀번호가 올바르지 않습니다'), `${T}: 401 문구`);
    ok(await p.inputValue('#lvMail [name=password]') === '' && await p.evaluate(() => document.activeElement && document.activeElement.name === 'password'), `${T}: 비밀번호 칸 비우고 포커스`);
    for (let i = 0; i < 8; i++) await mail(p, em, 'Wrong12345x'); ok((await errTxt(p)).includes('시도가 많습니다'), `${T}: 429 문구 (${await errTxt(p)})`); await c.close(); }
  /* E3 OAuth 거부 → 문구 · 탭 유지 */
  { const c = await ctxNew(); const p = await open(c, B + '/#signup', errs); const T = `E3 ${W}`; NEXT.kakao = 'deny';
    await social(p, 'kakao'); ok((await errTxt(p)).includes('로그인을 취소했습니다'), `${T}: 거부 문구 (${await errTxt(p)})`); ok((await view(p)) === 'signup', `${T}: 직전 탭(가입) 유지`);
    await tab(p, 'login'); NEXT.google = 'deny'; await social(p, 'google'); ok((await view(p)) === 'login', `${T}: 직전 탭(로그인) 유지`); await c.close(); }
  /* E4 보류 쿠키 만료 후 ① [다음] */
  { const c = await ctxNew(); const p = await open(c, B + '/#signup', errs); const T = `E4 ${W}`; const em = `e4_${UID()}@example.com`; NEXT.kakao = kakaoP(em);
    await social(p, 'kakao'); const ck = (await c.cookies()).filter(x => x.name !== 'dd_oauthp'); await c.clearCookies(); await c.addCookies(ck);
    await org(p, 'public', '해운대구청', { ed: 'facility' });
    ok((await scr(p)) === 'entry' && (await errTxt(p)).includes('가입 시간이 지났습니다'), `${T}: 만료 문구 · 진입 이동 (${await scr(p)} ${await errTxt(p)})`); ok((await view(p)) === 'signup', `${T}: 가입 탭`);
    await social(p, 'kakao'); ok((await scr(p)) === 'org' && await p.inputValue('#suForm input[name=name]') === '해운대구청' && await p.evaluate(() => SU.type === 'public' && SU.ed === 'facility'), `${T}: 다시 오면 유형 · 이름 보존`);
    await p.click('#suForm button[type=submit]'); await p.waitForTimeout(1200); await settle(p); ok(await p.evaluate(() => !!(S && S.org && S.org.ed === 'facility')), `${T}: 다시 가입 완료(공공 · 시설형)`); await c.close(); }
  /* R3 v44 기존 기관(onb 없음) → ② 안 뜸 */
  { const c = await ctxNew(); const em = `r3_${UID()}@example.com`; const T = `R3 ${W}`;
    await c.request.post(B + '/api/signup', { headers: H, data: { email: em, password: PW, orgName: '레거시학원', type: 'k12' } });
    const p = await open(c, B + '/', errs); await p.evaluate(async () => { await createOrg('k12', '레거시학원'); }); await p.waitForTimeout(1200);
    await p.evaluate(() => { delete S.onb; save(); }); await doc(c, B, j => j.rev >= 1 && j.doc && !j.doc.onb);
    await p.reload({ waitUntil: 'load' }); await settle(p); ok((await scr(p)) === 'app', `${T}: 기존 기관 → 대시보드(② 없음) (${await scr(p)})`); await c.close(); }
  ok(!errs.length, `묶음 A2 ${W}: 페이지 오류 없음 ${errs.slice(0, 3).join(' | ')}`);
}

/* ── 묶음 B: E5 초대 코드 ── */
async function groupB(sv) {
  const B = sv.base; const errs = []; const T = `E5 ${W}`;
  { const c = await ctxNew(); const p = await open(c, B + '/#signup', errs); const em = `e5_${UID()}@example.com`;
    await p.click('#entryMail [data-act=lv-mail]'); ok(!!(await p.$('#lvMail [name=code]')), `${T}: 이메일 가입 칸 아래 「초대 코드」`);
    await mail(p, em, PW, ''); ok((await errTxt(p)).includes('초대 코드를 입력'), `${T}: 코드 없이 → 안내`);
    await mail(p, em, PW, 'NOPE'); await org(p, 'corp', '코드기관');
    ok((await scr(p)) === 'entry' && (await errTxt(p)).includes('초대 코드가 올바르지 않습니다'), `${T}: 틀린 코드 → 진입으로 · 403 문구 (${await errTxt(p)})`);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.name === 'code'), `${T}: 코드 칸 포커스`);
    await mail(p, em, PW, 'C0DE'); await org(p, 'corp', '코드기관'); ok(await p.evaluate(() => !!(S && S.org)), `${T}: 맞는 코드 → 가입`); await c.close(); }
  { const c = await ctxNew(); const p = await open(c, B + '/#signup', errs); NEXT.google = googleP(`e5g_${UID()}@gmail.com`); await social(p, 'google');
    ok(!!(await p.$('#suForm [name=code]')), `${T}: 소셜은 ① 아래 「초대 코드」`);
    await org(p, 'univ', '코드대학', { ed: 'lite', code: '' }); ok((await errTxt(p, '#suErr')).includes('초대 코드를 입력'), `${T}: 소셜 코드 없이 → 안내`);
    await p.fill('#suForm [name=code]', 'NOPE'); await p.click('#suForm button[type=submit]'); await p.waitForTimeout(700);
    ok((await scr(p)) === 'org' && (await errTxt(p, '#suErr')).includes('초대 코드가 올바르지 않습니다'), `${T}: 소셜 틀린 코드 → ①에 남음`);
    await p.fill('#suForm [name=code]', 'C0DE'); await p.click('#suForm button[type=submit]'); await p.waitForTimeout(1300); await settle(p); ok(await p.evaluate(() => !!(S && S.org && S.org.ed === 'lite')), `${T}: 소셜 맞는 코드 → 가입`); await c.close(); }
  ok(!errs.length, `묶음 B ${W}: 페이지 오류 없음 ${errs.slice(0, 3).join(' | ')}`);
}

/* ── 묶음 C: E6 가입 받지 않음 + 카카오 키 없음 ── */
async function groupC(sv) {
  const B = sv.base; const errs = []; const T = `E6 ${W}`;
  const c = await ctxNew(); const p = await open(c, B + '/#signup', errs);
  ok((await view(p)) === 'login', `${T}: 가입 받지 않으면 로그인 탭`);
  ok(await p.evaluate(() => !document.querySelector('#entry [role=tab][data-v=signup], #entry [data-act=lv-signup]') && !/3초 만에 시작/.test(document.querySelector('#entry').innerText)), `${T}: 가입 탭 · 전환 링크 숨김`);
  NEXT.google = googleP(`e6_${UID()}@gmail.com`); await social(p, 'google'); ok((await errTxt(p)).includes('지금은 새 기관 가입을 받지 않습니다'), `${T}: 소셜 신규 → signup_off 문구 (${await errTxt(p)})`);
  ok(!!(await p.$('#entrySoc [data-act=lv-kakao-off]')), `카카오 키 없음 ${W}: 버튼은 남김`);
  await p.click('#entrySoc [data-act=lv-kakao-off]'); ok((await errTxt(p)).includes('카카오 로그인 준비 중입니다'), `카카오 키 없음 ${W}: 준비 중 안내`);
  await c.close(); ok(!errs.length, `묶음 C ${W}: 페이지 오류 없음 ${errs.slice(0, 3).join(' | ')}`);
}

(async () => {
  cp.execFileSync(process.execPath, ['build-public.js'], { cwd: SVC, stdio: 'ignore' });
  await new Promise(k => mock.listen(0, '127.0.0.1', k)); MOCK = `http://127.0.0.1:${mock.address().port}`;
  const db = new Client({ connectionString: DB }); await db.connect();
  BR = await chromium.launch();
  try {
    for (const w of (process.env.ONLY_W ? [+process.env.ONLY_W] : [1440, 390])) {
      W = w; tpl.shot = 0; console.log(`── ${W === 390 ? '휴대폰 390' : 'PC 1440'}`);
      for (const [fn, env, tag] of [[groupA, {}, 'A'], [groupA2, {}, 'A2'], [groupB, { SIGNUP_CODE: 'C0DE' }, 'B'], [groupC, { SIGNUP: 'off', OAUTH_KAKAO_ID: null }, 'C']]) {
        const sv = await server(env, tag); try { await fn(sv, db); } catch (e) { ok(false, `묶음 ${tag} ${W}: ${e.message.split('\n')[0]}`); } finally { await sv.stop(); }
      }
    }
  } finally { await BR.close(); await db.end(); mock.close(); }
  console.log(`pass ${pass} fail ${fail}${skip ? ` skip ${skip}` : ''}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
