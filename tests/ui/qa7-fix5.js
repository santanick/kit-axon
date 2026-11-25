'use strict';
/* qa7 d5 · ① 운영 CSP에서 인라인 onerror 없이 깨진 썸네일 대체 · YouTube 제목 서버 프록시(GET /api/oembed) ② 교수자 「내 계정」(기관 설정은 차단)
   - 실서버(Node 9993 · Java 9994)는 운영과 같게 MFA_DEV=1(MFA_OFF 없음), OEMBED_MOCK=1(외부 접속 없이 서버 프록시 시험 모드)
   - 대조: /api/oembed 응답(상태 · 오류 코드 · 키)이 Node와 Java에서 같은지 + 교수자 권한(본인 API 200 · 기관 설정 API 403)
   - 화면(Node 실서버): 콘솔 CSP 위반 0, 외부 이미지 차단 상태에서 깨진 그림 0(대체 그림), YouTube 넣기 창 제목 자동 채움, 교수자 내 계정 진입 · 기관 설정 카드 없음
   - 시연판(정적): 교수자 설정 → 내 계정(시연 안내), 정운영자 설정은 그대로
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/kit_qa7_d5 NODE_PATH=$(npm root -g):service/server/node_modules node tests/ui/qa7-fix5.js
         JAVA=0 이면 Java 대조를 건너뜀(war: service-egov/target/didisam-egov.war, 먼저 mvn package) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const os = require('node:os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const SVC = path.join(ROOT, 'service'); const DEMO = path.join(ROOT, 'didisam');
const DB = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/kit_qa7_d5';
const NP = [path.join(SVC, 'server/node_modules'), ...(process.env.NODE_PATH || '').split(path.delimiter), '/home/claude/kit-axon/service/server/node_modules'].filter(p => p && fs.existsSync(path.join(p, 'pg'))).join(path.delimiter);
const WAR = path.join(ROOT, 'service-egov/target/didisam-egov.war');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.error('✗', m, x !== undefined ? JSON.stringify(x).slice(0, 500) : ''); } };
const wait = ms => new Promise(k => setTimeout(k, ms));
const YT = 'dQw4w9WgXcQ';
const kill = port => { try { cp.execSync(`fuser -k -n tcp ${port}`, { stdio: 'ignore' }); } catch (e) { } };

/* 쿠키 항아리를 가진 API 호출 */
const jar = U => { const J = {}; return async (method, p, body) => {
  const r = await fetch(U + p, { method, headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}), cookie: Object.entries(J).map(([k, v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (kv.slice(i + 1)) J[kv.slice(0, i)] = kv.slice(i + 1); else delete J[kv.slice(0, i)]; }
  const j = await r.json().catch(() => ({})); return { st: r.status, j, err: j.error || '', keys: Object.keys(j).sort().join(','), cookies: J }; }; };
/* 로그인(2단계 개발 코드 포함) */
async function login(call, email, pw) { const l = await call('POST', '/api/login', { email, password: pw }); if (l.j && l.j.mfa) return call('POST', '/api/login/mfa', { ticket: l.j.ticket, code: l.j.devCode }); return l; }

/* 서버 한 곳의 API 결과(대조용으로 값이 변하는 부분은 뺀다) */
async function apiRun(U, tag) {
  const sfx = tag + Date.now().toString(36); const OW = `f5o${sfx}@qa.kr`, TE = `f5t${sfx}@qa.kr`, PW = 'Fix5Test2026ok', PW2 = 'Fix5Teach2026ok';
  const anon = jar(U), o = jar(U), t = jar(U); const R = {};
  R.anon = (await anon('GET', '/api/oembed?url=' + encodeURIComponent('https://youtu.be/' + YT))).err;
  R.signup = (await o('POST', '/api/signup', { email: OW, password: PW, orgName: 'F5' + tag, type: 'k12' })).st;
  if (R.signup !== 200) { const l = await login(o, OW, PW); R.signupLogin = l.st; }
  const q = async (who, u) => { const r = await who('GET', '/api/oembed?url=' + encodeURIComponent(u)); return { st: r.st, err: r.err, keys: r.keys, title: r.j.title, th: r.j.thumbnail_url }; };
  R.yt1 = await q(o, 'https://youtu.be/' + YT);
  R.yt2 = await q(o, `https://www.youtube.com/watch?v=${YT}&t=10`);
  R.yt3 = await q(o, `https://m.youtube.com/shorts/${YT}`);
  R.yt4 = await q(o, `http://youtube.com/embed/${YT}`);
  R.yt1b = await q(o, 'https://youtu.be/' + YT); /* 캐시 */
  R.evil = await q(o, `https://evil.example/watch?v=${YT}`);
  R.suffix = await q(o, `https://youtube.com.evil.example/watch?v=${YT}`);
  R.loop = await q(o, `http://127.0.0.1/watch?v=${YT}`);
  R.meta = await q(o, `http://169.254.169.254/latest/meta-data`);
  R.cred = await q(o, `https://u:p@www.youtube.com/watch?v=${YT}`);
  R.port = await q(o, `https://www.youtube.com:8443/watch?v=${YT}`);
  R.ftp = await q(o, `ftp://youtube.com/watch?v=${YT}`);
  R.noid = await q(o, 'https://www.youtube.com/watch?v=short');
  R.empty = await q(o, '');
  /* 교수자: 운영자가 초대 → 로그인(2단계) → 임시 비밀번호 변경 */
  const s = await o('POST', '/api/staff', { email: TE, role: 'teacher' }); R.staff = s.st;
  const tl = await login(t, TE, s.j.password); R.tlogin = tl.st;
  R.tpw = (await t('POST', '/api/password', { current: s.j.password, next: PW2 })).st;
  { const me = (await t('GET', '/api/me')).j; R.tme = me.role || (me.user && me.user.role); }
  R.tyt = (await q(t, 'https://youtu.be/' + YT)).st;
  for (const [k, m, p, b] of [['sess', 'GET', '/api/me/sessions'], ['sessInfo', 'GET', '/api/session'], ['mfa', 'GET', '/api/me/mfa'], ['devices', 'GET', '/api/me/devices'],
    ['orgSec', 'GET', '/api/org/security'], ['orgSecW', 'POST', '/api/org/security', { idleMin: 10, maxSessions: 0, mfa: 'email' }], ['staffL', 'GET', '/api/staff'], ['staffW', 'POST', '/api/staff', { email: 'x' + TE, role: 'teacher' }], ['keys', 'GET', '/api/keys'], ['bench', 'POST', '/api/site/benchmark', { url: 'https://example.com' }]]) {
    const r = await t(m, p, b); R['t_' + k] = r.st; }
  R.tcookies = t; R.tcred = { email: TE, pw: PW2 }; R.ocred = { email: OW, pw: PW };
  return R;
}
function judgeApi(tag, R) {
  ok(R.anon === 'auth', `${tag} 비로그인 /api/oembed 401`, R.anon);
  for (const k of ['yt1', 'yt2', 'yt3', 'yt4', 'yt1b']) ok(R[k].st === 200 && R[k].keys === 'thumbnail_url,title' && R[k].title === '시험 영상 ' + YT && /^https:\/\/i\.ytimg\.com\//.test(R[k].th), `${tag} ${k}: title · thumbnail_url만`, R[k]);
  ok(R.evil.st === 400 && R.evil.err === 'not_youtube', `${tag} 다른 사이트 400`, R.evil);
  ok(R.suffix.st === 400 && R.suffix.err === 'not_youtube', `${tag} youtube.com.악성 400`, R.suffix);
  ok(R.loop.st === 400 && R.meta.st === 400, `${tag} 내부 · 메타데이터 주소 400`, [R.loop, R.meta]);
  ok(R.cred.st === 400 && R.port.st === 400 && R.ftp.st === 400, `${tag} 계정 정보 · 다른 포트 · ftp 400`, [R.cred, R.port, R.ftp]);
  ok(R.noid.err === 'bad_url' && R.empty.err === 'bad_url', `${tag} 영상 번호 없음 · 빈 주소 400 bad_url`, [R.noid, R.empty]);
  ok(R.staff === 200 && R.tlogin === 200 && R.tpw === 200 && R.tme === 'teacher', `${tag} 교수자 초대 · 로그인(2단계) · 비밀번호 변경`, [R.staff, R.tlogin, R.tpw, R.tme]);
  ok(R.tyt === 200, `${tag} 교수자 YouTube 제목 200`, R.tyt);
  ok(R.t_sess === 200 && R.t_sessInfo === 200 && R.t_mfa === 200 && R.t_devices === 200, `${tag} 교수자 본인 계정 API 200`, R);
  ok(R.t_orgSec === 403 && R.t_orgSecW === 403 && R.t_staffL === 403 && R.t_staffW === 403 && R.t_keys === 403 && R.t_bench === 403, `${tag} 교수자 기관 설정 API 403 유지`, { a: R.t_orgSec, b: R.t_orgSecW, c: R.t_staffL, d: R.t_staffW, e: R.t_keys, f: R.t_bench });
}
const strip = R => { const o = {}; for (const [k, v] of Object.entries(R)) if (!['tcookies', 'tcred', 'ocred', 'signupLogin'].includes(k)) o[k] = v; return o; };

/* 페이지: CSP 위반 · 오류 수집 */
async function newPage(BR, opt) {
  const ctx = await BR.newContext(opt); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); /* 외부(i.ytimg.com 등) 전부 차단 → 썸네일이 깨지는 상황 */
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || ''))); });
  const p = await ctx.newPage(); p.errs = []; p.csp = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (/Content Security Policy|violates the following/i.test(m.text())) p.csp.push(m.text().slice(0, 200)); }); p.on('dialog', d => d.dismiss());
  return { ctx, p };
}
const brokenImgs = p => p.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && i.offsetParent !== null).map(i => i.getAttribute('src').slice(0, 80)));
const cspAll = async p => [...p.csp, ...(await p.evaluate(() => window.__csp || []))];

async function liveUi(BR, B, R) {
  /* ① 정운영자: 콘텐츠 라이브러리 · 수업 · 수료증 */
  { const { ctx, p } = await newPage(BR, { viewport: { width: 1440, height: 900 } });
    const call = jar(B); const l = await login(call, R.ocred.email, R.ocred.pw); ok(l.st === 200, '정운영자 로그인', l.st);
    await ctx.addCookies(Object.entries(l.cookies).map(([name, value]) => ({ name, value, url: B })));
    await p.goto(B + '/', { waitUntil: 'load' });
    await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE && LIVE.user && (document.querySelector('#suForm') || (typeof S !== 'undefined' && S && S.org)), null, { timeout: 20000 }).catch(() => {});
    await p.evaluate(() => { if (!S || !S.org) createOrg('k12', '내 계정 점검'); }).catch(() => {}); await wait(1200);
    await p.evaluate(() => { const b = document.querySelector('[data-act=onb-later]'); if (b) b.click(); }).catch(() => {});
    await p.waitForFunction(() => S && S.org && S.nav && document.querySelector('#main'), null, { timeout: 20000 }).catch(() => {});
    await p.evaluate(() => { S.me.role = 'owner'; Object.values(S.nav.tabs).flat().forEach(x => { if (['clib', 'class', 'cert'].includes(x.id)) x.on = true; }); save(); go('clib'); });
    await wait(800);
    /* YouTube 넣기(콘텐츠 만들기 창 CT): 주소 입력 → 제목 자동 채움(서버 프록시 시험 모드) */
    await p.evaluate(() => ACT['clb-mk']({ dataset: { v: 'youtube' } }));
    await p.waitForSelector('#ctUrl', { timeout: 5000 }).catch(() => {});
    await p.fill('#ctUrl', 'https://youtu.be/' + YT);
    await p.waitForFunction(y => { const e = document.querySelector('.ct-ytp span'); return e && e.textContent.includes('시험 영상 ' + y); }, YT, { timeout: 6000 }).catch(() => {});
    const t1 = await p.evaluate(() => (document.querySelector('.ct-ytp span') || {}).textContent || '');
    ok(t1.includes('시험 영상 ' + YT), 'YouTube 링크 제목 자동 채움(CT)', t1);
    await p.evaluate(() => { const b = document.querySelector('[data-act=ct-done]'); if (b) b.click(); }); await wait(900);
    const lib = await p.evaluate(() => ({ txt: (document.querySelector('#main') || {}).innerText || '', imgs: document.querySelectorAll('#main img').length }));
    ok(lib.txt.includes('시험 영상 ' + YT), '넣은 영상이 자동 채운 제목으로 목록에 보임', lib.txt.slice(0, 300));
    await wait(800); ok(!(await brokenImgs(p)).length, '콘텐츠 라이브러리: 깨진 썸네일 없음(외부 차단 상태)', await brokenImgs(p));
    /* 공통 대체 그림: 화면에 깨진 <img>를 넣어도 깨진 아이콘 대신 대체 그림 */
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'fbT'; d.innerHTML = '<img id="fb1" src="/nope-404.png" alt=""><img id="fb2" src="https://i.ytimg.com/vi/xxxxxxxxxxx/mqdefault.jpg" alt="">'; document.querySelector('#main').prepend(d); });
    await wait(800);
    const fb = await p.evaluate(() => ['fb1', 'fb2'].map(id => { const i = document.getElementById(id); return { cls: i.className, data: /^data:image\/svg/.test(i.src), w: i.naturalWidth }; }));
    ok(fb.every(x => x.cls.includes('img-fb') && x.data && x.w > 0), '깨진 이미지 → 대체 그림(data: SVG)', fb);
    await p.evaluate(() => document.getElementById('fbT').remove());
    for (const tab of ['class', 'cert']) { await p.evaluate(tb => go(tb), tab); await wait(900); const br = await brokenImgs(p); ok(!br.length, `${tab}: 깨진 그림 없음`, br); }
    const csp = await cspAll(p); ok(!csp.length, '정운영자 화면 CSP 위반 0(인라인 onerror · oembed connect-src)', csp.slice(0, 4));
    ok(!p.errs.length, '정운영자 페이지 오류 없음', p.errs.slice(0, 4));
    /* 정운영자 설정은 그대로(기관 설정 카드 있음, 내 계정 버튼 없음) */
    await p.evaluate(() => go('settings')); await wait(600);
    const os = await p.evaluate(() => ({ ws: CUR.ws, mya: !!document.querySelector('.mya'), btn: !!document.getElementById('myaBtn'), sx: !!document.querySelector('.sx3') }));
    ok(os.ws === 'settings' && !os.mya && !os.btn && os.sx, '정운영자 설정 = 기존 설정 화면', os);
    await ctx.close(); }
  /* ② 교수자: 설정 → 내 계정 */
  { const { ctx, p } = await newPage(BR, { viewport: { width: 1440, height: 900 } });
    const call = jar(B); const l = await login(call, R.tcred.email, R.tcred.pw); ok(l.st === 200, '교수자 로그인(2단계)', l.st);
    await ctx.addCookies(Object.entries(l.cookies).map(([name, value]) => ({ name, value, url: B })));
    await p.goto(B + '/', { waitUntil: 'load' });
    await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE && LIVE.user && typeof S !== 'undefined' && S && S.org && document.querySelector('#main'), null, { timeout: 20000 }).catch(() => {});
    const role = await p.evaluate(() => S && S.me && S.me.role); ok(role === 'teacher', '교수자 스튜디오 진입', role);
    ok(await p.evaluate(() => !!document.getElementById('myaBtn')), '교수자 레일 「내 계정」 버튼');
    await p.click('#myaBtn').catch(() => p.evaluate(() => go('settings')));
    await p.waitForFunction(() => { const s = document.getElementById('mya-sess'); return s && !/불러오는 중/.test(s.textContent); }, null, { timeout: 8000 }).catch(() => {});
    await wait(400);
    const v = await p.evaluate(() => ({ ws: CUR.ws, h1: (document.querySelector('#main .wh h1') || {}).textContent, txt: document.querySelector('#main').innerText, pw: !!document.querySelector('#main [data-act=live-pw]'), out: !!document.querySelector('#main [data-act=live-logout]'),
      mfa: !!document.querySelector('#main [data-mfa=card]'), sx: !!document.querySelector('#main .sx3'), osec: !!document.querySelector('#os-body'), menuEd: !!document.querySelector('#main [data-act=sl-menu]'), cur: (document.getElementById('myaBtn') || {}).getAttribute && document.getElementById('myaBtn').getAttribute('aria-current') }));
    ok(v.ws === 'settings' && /내 계정/.test(v.txt) && v.txt.indexOf('내 계정') < 200, '교수자 설정 → 내 계정 화면', { ws: v.ws, t: v.txt.slice(0, 200) });
    ok(v.pw && v.out && /로그인 아이디/.test(v.txt) && v.txt.includes(R.tcred.email), '내 계정: 아이디 · 비밀번호 변경 · 로그아웃', v.txt.slice(0, 200));
    ok(/로그인 기기 · 세션/.test(v.txt) && v.mfa, '내 계정: 로그인 기기 · 2단계 인증', v.txt.slice(0, 400));
    ok(!v.sx && !v.osec && !v.menuEd && !/기관 보안 설정\b(?!\(|은)/.test(v.txt.replace('기관 설정(메뉴 · 보안 정책 · 운영자 · 결제)은 운영자에게', '')) && !/메뉴 구성|플랜 · 결제|데이터룸/.test(v.txt), '내 계정: 기관 설정 카드 없음', v.txt.slice(0, 400));
    ok(v.cur === 'page', '「내 계정」 버튼 현재 위치 표시', v.cur);
    /* 비밀번호 변경 창 열림 */
    await p.evaluate(() => document.querySelector('#main [data-act=live-pw]').click()); await wait(300);
    ok(await p.evaluate(() => !!document.querySelector('#modal input[name=cur]')), '비밀번호 변경 창 열림'); await p.evaluate(() => closeModal());
    /* 기관 설정 하위 화면으로 직접 가도 내 계정만 · 다른 금지 탭은 계속 차단 */
    const d = await p.evaluate(() => { const r = {}; UI.settings = 'osec'; go('settings'); r.osec = !!document.querySelector('#os-body') || !!document.querySelector('.sx3'); r.mya = !!document.querySelector('.mya');
      go('plan'); r.plan = CUR.ws + '|' + !!document.querySelector('.sx3'); go('admins'); r.admins = CUR.ws + '/' + CUR.tab; go('site'); r.site = CUR.ws + '/' + CUR.tab; return r; });
    ok(!d.osec && d.mya && /\|false$/.test(d.plan) && d.admins.indexOf('admins') < 0 && d.site.indexOf('site') < 0, '교수자: 기관 설정 하위 화면 · 금지 탭 직접 이동 차단', d);
    const api = await p.evaluate(async () => { const g = async (m, u, b) => (await fetch(u, { method: m, credentials: 'same-origin', headers: { 'x-didisam': '1', 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })).status;
      return { orgSec: await g('GET', '/api/org/security'), orgSecW: await g('POST', '/api/org/security', { idleMin: 10 }), staff: await g('GET', '/api/staff') }; });
    ok(api.orgSec === 403 && api.orgSecW === 403 && api.staff === 403, '교수자 화면에서 기관 설정 API 403', api);
    /* 휴대폰 390: 가로 넘침 없음 */
    await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => go('settings')); await wait(500);
    const ov = await p.evaluate(() => ({ d: document.documentElement.scrollWidth - innerWidth, el: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(e => e.tagName + '.' + e.className + '#' + e.id) })); ok(ov.d <= 1, '휴대폰 390 내 계정 가로 넘침 없음', ov);
    const csp = await cspAll(p); ok(!csp.length, '교수자 화면 CSP 위반 0', csp.slice(0, 4)); ok(!p.errs.length, '교수자 페이지 오류 없음', p.errs.slice(0, 4));
    await ctx.close(); }
}

(async () => {
  const BR = await chromium.launch(); const T0 = Date.now();
  /* ───── 시연판(정적) ───── */
  const srv = http.createServer((q, r) => { const f = path.join(DEMO, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(DEMO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(k => srv.once('listening', k)); const D0 = `http://127.0.0.1:${srv.address().port}`;
  try { const { ctx, p } = await newPage(BR, { viewport: { width: 1440, height: 900 } }); await p.goto(D0 + '/index.html', { waitUntil: 'load' });
    await p.evaluate(() => { createOrg('k12', '내 계정 시연'); render(); }); await wait(900);
    const r = await p.evaluate(() => { const o = {}; S.me.role = 'teacher'; render(); o.btn = !!document.getElementById('myaBtn'); go('settings'); o.ws = CUR.ws; o.mya = !!document.querySelector('.mya'); o.txt = document.querySelector('#main').innerText.slice(0, 300); o.sx = !!document.querySelector('.sx3');
      S.me.role = 'owner'; go('settings'); o.ownerSx = !!document.querySelector('.sx3'); o.ownerMya = !!document.querySelector('.mya'); o.ownerBtn = !!document.getElementById('myaBtn'); return o; });
    ok(r.btn && r.ws === 'settings' && r.mya && !r.sx && /시연판에는 로그인 계정이 없습니다/.test(r.txt), '시연 교수자: 설정 → 내 계정(시연 안내)', r);
    ok(r.ownerSx && !r.ownerMya && !r.ownerBtn, '시연 정운영자: 기존 설정', r);
    await p.evaluate(() => { Object.values(S.nav.tabs).flat().forEach(x => { if (x.id === 'clib') x.on = true; }); save(); go('clib'); ACT['clb-mk']({ dataset: { v: 'youtube' } }); });
    await p.waitForSelector('#ctUrl', { timeout: 5000 }).catch(() => {}); await p.fill('#ctUrl', 'https://youtu.be/' + YT); await wait(1200);
    const dt = await p.evaluate(() => ({ t: (document.querySelector('.ct-ytp span') || {}).textContent || '', img: (document.querySelector('.ct-ytp img') || {}).className || '' }));
    ok(/선택한 YouTube 영상/.test(dt.t) && /img-fb/.test(dt.img), '시연판 YouTube: 외부 요청 없이 기본 제목 · 미리보기 대체 그림', dt);
    const csp = await cspAll(p); ok(!csp.length, '시연판 CSP 위반 0', csp.slice(0, 4)); ok(!p.errs.length, '시연판 페이지 오류 없음', p.errs.slice(0, 4)); await ctx.close();
  } finally { srv.close(); }

  /* ───── 실서버 Node · Java ───── */
  const pub = fs.mkdtempSync(path.join(os.tmpdir(), 'f5-pub-'));
  cp.execFileSync(process.execPath, [path.join(SVC, 'build-public.js'), DEMO, pub], { cwd: SVC, stdio: 'ignore' });
  const base = { ...process.env, NODE_PATH: NP, NODE_ENV: 'test', DATABASE_URL: DB, PII_KEY: process.env.PII_KEY || 'cd'.repeat(32), SESSION_PEPPER: process.env.SESSION_PEPPER || 'f5-only-pepper', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', PII_DEV_OTP: '1', MFA_DEV: '1', OEMBED_MOCK: '1', PUBLIC_DIR: pub };
  delete base.MFA_OFF; delete base.SIGNUP_CODE; delete base.MAIL_PROVIDER;
  const kids = []; const up = async (B, ch) => { let o = false; for (let i = 0; i < 900 && !o; i++) { try { o = (await fetch(B + '/api/health')).ok; } catch (e) { } if (!o) { if (ch.exitCode != null) break; await wait(100); } } return o; };
  try {
    kill(9993); const nOut = []; const N = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env: { ...base, PORT: '9993' }, stdio: ['ignore', 'pipe', 'pipe'] }); kids.push([N, 9993]); N.stdout.on('data', d => nOut.push(d)); N.stderr.on('data', d => nOut.push(d));
    const BN = 'http://127.0.0.1:9993'; const nUp = await up(BN, N); ok(nUp, 'Node 실서버 기동', Buffer.concat(nOut).toString().slice(-400));
    let RN = null; if (nUp) { RN = await apiRun(BN, 'n'); judgeApi('Node', RN); }
    let RJ = null;
    if (process.env.JAVA !== '0' && fs.existsSync(WAR)) {
      kill(9994); const jOut = []; const u = new URL(DB);
      const J = cp.spawn('java', ['-jar', WAR], { cwd: path.join(ROOT, 'service-egov'), env: { ...base, PORT: '9994', JDBC_URL: `jdbc:postgresql://${u.host}${u.pathname}`, JDBC_USER: decodeURIComponent(u.username), JDBC_PASSWORD: decodeURIComponent(u.password || '') }, stdio: ['ignore', 'pipe', 'pipe'] });
      kids.push([J, 9994]); J.stdout.on('data', d => { jOut.push(d); if (jOut.length > 400) jOut.shift(); }); J.stderr.on('data', d => { jOut.push(d); if (jOut.length > 400) jOut.shift(); });
      const BJ = 'http://127.0.0.1:9994'; const jUp = await up(BJ, J); ok(jUp, 'Java 실서버 기동', Buffer.concat(jOut).toString().slice(-600));
      if (jUp) { RJ = await apiRun(BJ, 'j'); judgeApi('Java', RJ);
        if (RN) { const a = strip(RN), b = strip(RJ); const diff = Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])); ok(!diff.length, 'Node · Java /api/oembed · 교수자 권한 대조 일치', diff.map(k => [k, a[k], b[k]])); } }
    } else console.log('(Java 대조 건너뜀: JAVA=0 또는 war 없음)');
    if (nUp && RN) await liveUi(BR, BN, RN);
  } finally { for (const [c, port] of kids) { try { c.kill('SIGKILL'); } catch (e) { } kill(port); } fs.rmSync(pub, { recursive: true, force: true }); }
  await BR.close();
  console.log(`qa7-fix5: ${pass} 통과 · ${fail} 실패 (${Math.round((Date.now() - T0) / 1000)}초)`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
