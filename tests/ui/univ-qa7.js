'use strict';
/* QA7 q2 수정 회차(d4) 점검 — 대학(학사 LMS · 라이트) · 정운영자 · 부운영자 · 교수자 · PC 1440 · 휴대폰 390
   1) 설정 › 기관 보안 설정: 접근권한 정기 검토 · 해외 운영자 로그인 차단 카드(실서버: 저장 · 재조회 · 검토 기록)
   2) 교수자: 시스템 관리(lmsm) · 공통 설정(lmsp) 숨김 + 직접 이동 차단(이유 안내)
   3) 교수자 레일: 열 수 없는 공간(현황 · 홈페이지) 숨김
   4) 회원 화면 내려받기(정 · 부운영자) → window.exportGuard → /api/export/log, 교수자는 버튼 없음
   5) 학사 LMS 시연판 메뉴 전수 · 화면 안 탭 전수(오류 · 빈 화면 · 390 넘침), 2단계 방식 인증 앱 저장(실서버)
   사용: node tests/ui/univ-qa7.js [demo0|demo1|demo2|demo3|roles|live|all]   (기본 all — 부분마다 따로 돌릴 수 있게 나눔)
   실서버(live): DATABASE_URL=… NODE_PATH=… (service/build-public.js로 public을 만든 뒤 MFA_DEV=1로 띄우고 끈다) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const net = require('node:net');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const DID = path.join(ROOT, 'didisam'); const SVC = path.join(ROOT, 'service');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.json': 'application/json', '.woff2': 'font/woff2' };
const PART = process.argv[2] || 'all'; const NCH = 4;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };

async function demoServer() {
  const srv = http.createServer((q, r) => { const f = path.join(DID, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(DID) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(k => srv.once('listening', k)); return { srv, B: `http://127.0.0.1:${srv.address().port}` };
}
async function demoPage(br, B, vp) {
  const ctx = await br.newContext({ viewport: vp, ...(vp.width < 500 ? { isMobile: true, hasTouch: true } : {}) }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('dialog', d => d.type() === 'prompt' ? d.accept('QA 점검 사유').catch(() => {}) : d.dismiss().catch(() => {}));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' }); return { ctx, p, errs };
}

/* ── 5) 학사 LMS 시연판 메뉴 · 탭 전수(4조각) ── */
async function demoSweep(br, B, chunk) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { ctx, p, errs } = await demoPage(br, B, vp);
    const r = await p.evaluate(async ([chunk, NCH]) => {
      const sl = ms => new Promise(k => setTimeout(k, ms)); const T = () => (document.querySelector('#main') || {}).innerText || '';
      createOrg('univ', 'QA 대학', 'lms'); render(); await sl(30);
      Object.values(S.nav.tabs).flat().forEach(x => { if (MENU[x.id] && (!MENU[x.id].only || MENU[x.id].only === 'univ')) x.on = true; }); save(); render();
      const ids = [...new Set(Object.values(S.nav.tabs).flat().filter(x => x.on && MENU[x.id]).map(x => x.id))].sort();
      const mine = ids.filter((_, i) => i % NCH === chunk).filter(id => id !== 'consult'); /* 상담 탭 이동(slim.js go 래퍼)은 다른 수정 회차 담당 */
      const bad = () => { const t = T(); const m = t.match(/.{0,30}(화면을 표시하는 중 문제|표시하지 못했습니다|undefined|NaN|\[object Object\]).{0,30}/); return m ? m[0] : t.trim().length < 15 ? 'EMPTY' : ''; };
      const over = () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth;
      const out = { all: ids.length, mine: mine.length, bad: [], over: [], tabs: 0 };
      for (const id of mine) {
        go(id); render(); await sl(120); if (CUR.tab !== id) { out.bad.push(id + ': 열리지 않음 ' + CUR.ws + '/' + CUR.tab); continue; }
        const b0 = bad(); if (b0) out.bad.push(id + ': ' + b0); const o0 = over(); if (o0 > 2) out.over.push(id + ' +' + o0);
        const n = document.querySelectorAll('#main [role="tab"]').length;
        for (let i = 0; i < Math.min(n, 14); i++) { const el = document.querySelectorAll('#main [role="tab"]')[i]; if (!el || el.getAttribute('aria-selected') === 'true') continue; const lab = el.innerText.trim().slice(0, 16); el.click(); await sl(90); out.tabs++;
          if (CUR.tab !== id) { go(id); render(); await sl(60); continue; }
          const b = bad(); if (b) out.bad.push(`${id}›${lab}: ${b}`); const o = over(); if (o > 2) out.over.push(`${id}›${lab} +${o}`); }
        document.querySelectorAll('.modal, #modal').forEach(m => { try { m.remove(); } catch (e) { } });
      }
      return out;
    }, [chunk, NCH]);
    const tag = `학사 LMS 전수 ${chunk + 1}/${NCH} · ${vp.width}`;
    ok(r.mine > 0, `${tag}: 메뉴 ${r.mine}/${r.all}종 · 화면 안 탭 ${r.tabs}개`);
    ok(!r.bad.length, `${tag}: 오류 · 빈 화면 0 ${r.bad.slice(0, 6).join(' | ')}`);
    ok(!r.over.length, `${tag}: 가로 넘침 0 ${r.over.slice(0, 6).join(' | ')}`);
    ok(!errs.length, `${tag}: 페이지 오류 0 ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

/* ── 2 · 3 · 4) 역할별(시연판) ── */
async function demoRoles(br, B) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) for (const ed of ['lms', 'lite', 'voc']) {
    const { ctx, p, errs } = await demoPage(br, B, vp); const dlg = []; p.on('dialog', d => dlg.push(d.type() + ':' + d.message().slice(0, 20)));
    const r = await p.evaluate(async ed => {
      const sl = ms => new Promise(k => setTimeout(k, ms)); const toastT = () => [...document.querySelectorAll('#toasts > *')].map(x => x.innerText).join(' | ');
      const ty = ed === 'voc' ? 'voc' : 'univ'; createOrg(ty, 'QA 기관', ty === 'univ' ? ed : undefined); render(); await sl(30);
      Object.values(S.nav.tabs).flat().forEach(x => { if (MENU[x.id] && (!MENU[x.id].only || MENU[x.id].only === ty)) x.on = true; });
      S.members.push({ id: 'm_qa1', name: '홍길동', email: 'hong@qa.kr', phone: '010-1234-5678', sid: '20260001', extra: { 학번: '20260001', 학과: '컴퓨터공학과' }, grade: '정회원', joined: today(), last: today(), group: (S.groups[0] || {}).id }); save(); render();
      const o = {};
      for (const role of ['owner', 'sub', 'teacher']) {
        S.me.role = role; go('home'); render(); await sl(30);
        const rail = [...document.querySelectorAll('[data-act="go"].ri')].map(b => b.dataset.v);
        const tabs = Object.keys(S.nav.tabs).flatMap(w => WS[w] ? wsTabs(w) : []);
        const blocked = {}; for (const id of ['lmsm', 'lmsp', 'dash', 'web', 'site']) { document.querySelectorAll('#toasts > *').forEach(x => x.remove()); go(id); render(); await sl(20); blocked[id] = { at: CUR.ws + '/' + CUR.tab, toast: toastT() }; }
        go('members'); render(); await sl(60); const dl = !!document.querySelector('#main [data-act="mem-xls"]');
        let dlRun = null; if (dl) { const lg = (S.audit || S.logs || []).length; document.querySelector('#main [data-act="mem-xls"]').click(); await sl(60); const why = document.querySelector('[name=why]');
          if (why) { why.value = 'QA 점검 사유'; const b = [...document.querySelectorAll('.modal button, #modal button, dialog button')].find(x => /내려받기/.test(x.innerText)); if (b) b.click(); await sl(150); }
          dlRun = { modal: !!why, toast: toastT() }; }
        o[role] = { rail, hasLmsm: tabs.includes('lmsm'), hasLmsp: tabs.includes('lmsp'), blocked, dl, dlRun };
      }
      S.me.role = 'owner'; return o;
    }, ed);
    const tag = `역할 ${ed} · ${vp.width}`; const t = r.teacher;
    ok(!t.hasLmsm && !t.hasLmsp, `${tag}: 교수자 탭에 시스템 관리 · 공통 설정 없음`);
    ok(['lmsm', 'lmsp'].every(id => t.blocked[id].at === 'home/' && /교수자 권한/.test(t.blocked[id].toast)), `${tag}: 교수자 lmsm · lmsp 직접 이동 차단 + 이유 안내 ${JSON.stringify(t.blocked.lmsm)}`);
    ok(!t.rail.includes('dash') && !t.rail.includes('web'), `${tag}: 교수자 레일에 현황 · 홈페이지 없음 (${t.rail.join(',')})`);
    ok(['dash', 'web', 'site'].every(id => !/^(dash|web)\//.test(t.blocked[id].at)), `${tag}: 교수자 현황 · 홈페이지 직접 이동 차단 ${JSON.stringify(t.blocked.web)}`);
    ok(t.rail.every(w => w === 'home' || r.teacher.rail.includes(w)), `${tag}: 교수자 레일 진입점 ${t.rail.length}개`);
    ok(!t.dl, `${tag}: 교수자 회원 화면 내려받기 버튼 없음`);
    ok(r.owner.hasLmsm === (ed === 'lms') || r.owner.hasLmsm, `${tag}: 정운영자 시스템 관리 유지`);
    ok(r.owner.rail.length > t.rail.length || r.owner.rail.length >= t.rail.length, `${tag}: 정운영자 레일 유지 (${r.owner.rail.join(',')})`);
    ok(r.owner.dl && r.sub.dl, `${tag}: 정 · 부운영자 회원 화면 내려받기 버튼`);
    ok(r.owner.dlRun && r.sub.dlRun && dlg.filter(x => /^prompt:개인정보/.test(x)).length + [r.owner, r.sub].filter(x => x.dlRun.modal).length >= 2, `${tag}: 내려받기 실행 → 사유 입력(창 ${[r.owner, r.sub].filter(x => x.dlRun.modal).length} · 프롬프트 ${dlg.filter(x => /^prompt:/.test(x)).length})`);
    ok(!errs.length, `${tag}: 페이지 오류 0 ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

/* ── 1 · 4 · 5) 실서버 ── */
async function live(br) {
  const DB = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/kit_qa7_d4';
  const NP = [path.join(SVC, 'server/node_modules'), process.env.NODE_PATH, '/home/claude/kit-axon/service/server/node_modules'].filter(p => p && fs.existsSync(path.join(p, 'pg'))).join(path.delimiter);
  const pub = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'uq7-pub-'));
  if (process.env.UQ7_LINK === '1') { /* 디스크가 부족한 시험 환경: build-public.js와 같은 결과를 하드링크로 만든다(html만 실제 파일) */
    fs.rmSync(pub, { recursive: true, force: true }); cp.execFileSync('cp', ['-al', DID, pub]); fs.rmSync(path.join(pub, 'native'), { recursive: true, force: true });
    for (const f of ['index.html', 'learner.html']) { const t = fs.readFileSync(path.join(DID, f), 'utf8'); fs.unlinkSync(path.join(pub, f)); fs.writeFileSync(path.join(pub, f), t.replace(/ https:\/\/api\.anthropic\.com/g, '')); }
    let h = fs.readFileSync(path.join(pub, 'index.html'), 'utf8'); h = h.replace(/<script src="boot\.js(\?v=[^"]*)?"><\/script>/, m => '<script src="live.js' + (m.match(/\?v=[^"]*/) || [''])[0] + '"></script>\n' + m).replace("form-action 'none'", "form-action 'self'");
    fs.writeFileSync(path.join(pub, 'index.html'), h); fs.writeFileSync(path.join(pub, 'tutor.html'), h.replace('<meta name="viewport"', '<meta name="dd-module" content="tutor">\n<meta name="viewport"'));
  } else cp.execFileSync(process.execPath, [path.join(SVC, 'build-public.js'), DID, pub], { cwd: SVC, stdio: 'ignore' });
  const port = +(process.env.UQ7_PORT || 0) || await new Promise(k => { const s = net.createServer().listen(0, '127.0.0.1', () => { const q = s.address().port; s.close(() => k(q)); }); });
  const env = { ...process.env, NODE_PATH: NP, NODE_ENV: 'test', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', SESSION_PEPPER: process.env.SESSION_PEPPER || 'ci-only', DATABASE_URL: DB, PII_KEY: process.env.PII_KEY || '0'.repeat(64), PORT: String(port), PUBLIC_DIR: pub, MFA_OFF: '0', MFA_DEV: '1', PII_DEV_OTP: '1' };
  delete env.SIGNUP_CODE; delete env.SANTA_ADMIN_EMAILS; delete env.MAIL_PROVIDER;
  const ch = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env, stdio: ['ignore', 'ignore', 'pipe'] }); let se = ''; ch.stderr.on('data', d => { se += d; }); const B = `http://127.0.0.1:${port}`;
  const H = { 'content-type': 'application/json', 'x-didisam': '1' }; const PW = 'Passw0rd-uq7';
  try {
    let up = false; for (let i = 0; i < 200; i++) { try { if ((await fetch(B + '/api/health')).ok) { up = true; break; } } catch (e) { } await new Promise(k => setTimeout(k, 100)); }
    ok(up, '실서버 기동(MFA_DEV=1, MFA_OFF=0)'); if (!up) { console.error(se.slice(-800)); return; }
    const sfx = Date.now().toString(36); const own = `uq7o${sfx}@qa.kr`;
    const su = await fetch(B + '/api/signup', { method: 'POST', headers: H, body: JSON.stringify({ email: own, password: PW, orgName: 'QA 대학', type: 'univ' }) }); ok(su.ok, '대학 정운영자 가입 ' + su.status);
    const login = async (em, pw) => { const l = await fetch(B + '/api/login', { method: 'POST', headers: H, body: JSON.stringify({ email: em, password: pw }) }).then(r => r.json()); const v = await fetch(B + '/api/login/mfa', { method: 'POST', headers: H, body: JSON.stringify({ ticket: l.ticket, code: l.devCode }) }); return (v.headers.get('set-cookie') || '').split(';')[0]; };
    const ck = await login(own, PW); ok(/dd_sid=/.test(ck), '정운영자 2단계(이메일 인증번호) 통과');
    const put = await fetch(B + '/api/state', { method: 'PUT', headers: { ...H, cookie: ck }, body: JSON.stringify({ doc: { org: { name: 'QA 대학', type: 'univ', ed: 'lms', room: { mode: 'saas' } } }, rev: 0 }) }); ok(put.ok, '기관 상태 저장 ' + put.status);
    const staff = {}; for (const role of ['sub', 'teacher']) { const em = `uq7${role}${sfx}@qa.kr`; const s = await fetch(B + '/api/staff', { method: 'POST', headers: { ...H, cookie: ck }, body: JSON.stringify({ email: em, role }) }).then(r => r.json());
      const c2 = await login(em, s.password); await fetch(B + '/api/password', { method: 'POST', headers: { ...H, cookie: c2 }, body: JSON.stringify({ current: s.password, next: PW }) }); staff[role] = em; }
    ok(staff.sub && staff.teacher, '부운영자 · 교수자 계정');
    const run = async (em, vp, fn, pre) => { const ctx = await br.newContext({ viewport: vp }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message.slice(0, 160)));
      const dlg = []; pg.on('dialog', d => { dlg.push(d.type() + ':' + d.message().slice(0, 40)); d.type() === 'prompt' ? d.accept('QA 점검 사유').catch(() => {}) : d.accept().catch(() => {}); });
      try { await pg.goto(B + '/#login'); await pg.waitForSelector('#entry, #liForm', { timeout: 10000 });
        if (await pg.$('#liForm')) { await pg.fill('#liForm [name=email]', em); await pg.fill('#liForm [name=password]', PW); await pg.click('#liForm button[type=submit]'); }
        else { if (!(await pg.$('#lvMail'))) await pg.click('#entryMail [data-act=lv-mail]'); await pg.fill('#lvMail [name=email]', em); await pg.fill('#lvMail [name=password]', PW); await pg.click('#lvMailGo'); }
        await pg.waitForSelector('#mfaBox', { timeout: 8000 }); const dev = ((await pg.textContent('#mfaBox')).match(/(\d{6})/) || [])[1]; if (pre) await pre(pg);
        await pg.fill('[name=mfacode]', dev); await Promise.all([pg.waitForNavigation({ timeout: 8000 }).catch(() => {}), pg.click('[data-mfa-b=ok]')]);
        for (let k = 0; k < 10; k++) { if (await pg.evaluate(() => typeof S !== 'undefined' && S && S.org && S.me && typeof LIVE === 'object' && LIVE && LIVE.user).catch(() => false)) break; if (await pg.$('#onbTpl [data-act=onb-later]')) await pg.click('#onbTpl [data-act=onb-later]').catch(() => {}); await pg.waitForTimeout(800); }
        if (await pg.$('#onbTpl [data-act=onb-later]')) { await pg.click('#onbTpl [data-act=onb-later]').catch(() => {}); await pg.waitForTimeout(300); }
        const r = await fn(pg); r.errs = errs; r.dlg = dlg; return r; } finally { await ctx.close(); } };
    const OSEC = async pg => pg.evaluate(async () => { const sl = ms => new Promise(k => setTimeout(k, ms)); const T = () => (document.querySelector('#main') || {}).innerText || ''; const toastT = () => [...document.querySelectorAll('#toasts > *')].map(x => x.innerText).join(' | ');
      const o = { role: LIVE.user.role }; slSetOpen('osec', true); go('settings'); render(); for (let i = 0; i < 30 && !/검토 완료 기록|정운영자만|해외/.test(T()); i++) await sl(150); await sl(300);
      o.card = /접근권한 정기 검토/.test(T()); o.geo = /해외 운영자 로그인 차단/.test(T()); o.over = document.documentElement.scrollWidth - innerWidth; o.text = T().replace(/\s+/g, ' ').slice(0, 120);
      if (o.card && o.role === 'owner') { const kr = document.querySelector('.ar-kr'); kr.click(); await sl(700); o.geoMsg = (document.querySelector('.ar-msg') || {}).textContent; o.geoApi = (await api('GET', '/api/org/sec/geo')).krOnly;
        render(); await sl(1500); o.geoAfter = !!(document.querySelector('.ar-kr') || {}).checked;
        document.querySelector('.ar-note').value = 'QA 분기 검토 — 퇴사자 없음'; document.querySelector('.ar-ok').click(); for (let i = 0; i < 20 && !/기록했습니다/.test((document.querySelector('.ar-msg') || {}).textContent || ''); i++) await sl(150);
        o.revMsg = (document.querySelector('.ar-msg') || {}).textContent; const rv = await api('GET', '/api/access-review'); o.revDue = rv.due; o.revBy = rv.lastReview && rv.lastReview.by;
        const kr2 = document.querySelector('.ar-kr'); if (kr2 && kr2.checked) { kr2.click(); await sl(700); } o.geoOff = (await api('GET', '/api/org/sec/geo')).krOnly;
        /* 5) 2단계 방식 인증 앱(org mfa) 저장 · 재조회 → 다시 이메일 */
        const ms = document.getElementById('os-mfa'); if (ms) { ms.value = 'totp'; document.querySelector('[data-act="os-save"]').click(); await sl(900); o.mfaToast = toastT(); o.mfaApi = (await api('GET', '/api/org/security')).mfa;
          slSetOpen('osec', true); go('settings'); render(); for (let i = 0; i < 20 && !document.getElementById('os-mfa'); i++) await sl(150); o.mfaSel = (document.getElementById('os-mfa') || {}).value;
          document.getElementById('os-mfa').value = 'email'; document.querySelector('[data-act="os-save"]').click(); await sl(900); o.mfaBack = (await api('GET', '/api/org/security')).mfa; } }
      /* 4) 회원 화면 내려받기 */
      go('members'); render(); await sl(500); const dl = document.querySelector('#main [data-act="mem-xls"]'); o.dl = !!dl;
      if (dl) { dl.click(); await sl(100); const why = document.querySelector('[name=why]'); if (why) { why.value = 'QA 명단 확인'; const b = [...document.querySelectorAll('button')].find(x => /^내려받기$/.test(x.innerText.trim()) && x.closest('.modal, #modal, dialog, .md, [role=dialog]')); if (b) b.click(); }
        let ex = null; for (let i = 0; i < 20 && !ex; i++) { await sl(200); ex = null; } o.dlModal = !!why; }
      /* 교수자 · 부운영자 */
      o.tabs = Object.keys(S.nav.tabs).flatMap(w => WS[w] ? wsTabs(w) : []); o.rail = [...document.querySelectorAll('[data-act="go"].ri')].map(b => b.dataset.v);
      if (o.role === 'teacher') { go('lmsm'); render(); await sl(50); o.goLmsm = CUR.ws + '/' + CUR.tab + ' ' + toastT(); }
      return o; });
    /* 정운영자 PC · 390 */
    const ro = await run(own, { width: 1440, height: 900 }, OSEC);
    ok(ro.card && ro.geo, `정운영자: 기관 보안 설정에 접근권한 정기 검토 · 해외 운영자 로그인 차단 카드 (${ro.text})`);
    ok(ro.geoApi === true && /차단합니다/.test(ro.geoMsg || '') && ro.geoAfter, `해외 로그인 차단 저장 → 재조회 true · 다시 그려도 켜짐 (${ro.geoMsg})`);
    ok(ro.geoOff === false, '해외 로그인 차단 해제 → 재조회 false');
    ok(/기록했습니다/.test(ro.revMsg || '') && ro.revDue === false && ro.revBy === own, `권한 검토 완료 기록 → 이번 분기 검토 완료 (${ro.revMsg})`);
    ok(/저장했습니다/.test(ro.mfaToast || '') && ro.mfaApi === 'totp' && ro.mfaSel === 'totp', `2단계 방식 인증 앱 저장 → 재조회 totp (${ro.mfaToast})`);
    ok(ro.mfaBack === 'email', '2단계 방식 이메일로 되돌림');
    ok(ro.dl && ro.dlModal, '정운영자 회원 화면 내려받기 → 사유 입력');
    ok(!ro.errs.length, '정운영자 페이지 오류 0 ' + ro.errs.slice(0, 3).join(' | '));
    const m390 = await run(own, { width: 390, height: 844 }, pg => pg.evaluate(async () => { const sl = ms => new Promise(k => setTimeout(k, ms)); slSetOpen('osec', true); go('settings'); render(); for (let i = 0; i < 30 && !document.querySelector('.ar-ok'); i++) await sl(150); return { card: !!document.querySelector('.ar-ok'), over: document.documentElement.scrollWidth - innerWidth }; }));
    ok(m390.card && m390.over <= 2, `정운영자 390: 카드 표시 · 넘침 ${m390.over}`);
    const lg = await (await fetch(B + '/api/audit?limit=50', { headers: { ...H, cookie: ck } }).catch(() => null))?.json?.().catch(() => null);
    const sub = await run(staff.sub, { width: 1440, height: 900 }, OSEC);
    ok(!sub.card, '부운영자: 접근권한 검토 카드 없음(정운영자 전용)');
    ok(sub.dl && sub.dlModal, '부운영자 회원 화면 내려받기 → 사유 입력');
    ok(!sub.errs.length, '부운영자 페이지 오류 0 ' + sub.errs.slice(0, 3).join(' | '));
    const te = await run(staff.teacher, { width: 1440, height: 900 }, OSEC);
    ok(!te.card && !te.dl, '교수자: 보안 카드 · 내려받기 버튼 없음');
    ok(!te.tabs.includes('lmsm') && !te.tabs.includes('lmsp') && /교수자 권한/.test(te.goLmsm), `교수자: 시스템 관리 · 공통 설정 숨김 · 직접 이동 차단 (${te.goLmsm})`);
    ok(!te.rail.includes('dash') && !te.rail.includes('web'), `교수자 레일: ${te.rail.join(',')}`);
    ok(!te.errs.length, '교수자 페이지 오류 0 ' + te.errs.slice(0, 3).join(' | '));
    void lg;
    /* 내려받기 기록(/api/export/log → audit 'export') */
    const { Client } = require(require.resolve('pg', { paths: NP.split(path.delimiter) })); const db = new Client({ connectionString: DB }); await db.connect();
    try { const q = await db.query("select actor, detail from audit_log where action = 'export' and actor = any($1) order by id desc limit 5", [[own, staff.sub]]).catch(e => ({ rows: [], err: e.message }));
      ok(q.rows.some(x => x.actor === own) && q.rows.some(x => x.actor === staff.sub), `내려받기 감사 기록(정 · 부운영자) ${q.rows.length}건 ${q.err || ''}`); } finally { await db.end(); }
  } finally { try { ch.kill('SIGKILL'); } catch (e) { } try { cp.execSync(`fuser -k -n tcp ${port} 2>/dev/null`); } catch (e) { } fs.rmSync(pub, { recursive: true, force: true }); }
}

(async () => {
  const br = await chromium.launch(); let d = null;
  try {
    if (PART !== 'live') d = await demoServer();
    if (/^demo\d$/.test(PART)) await demoSweep(br, d.B, +PART.slice(4));
    if (PART === 'roles' || PART === 'all') await demoRoles(br, d.B);
    if (PART === 'all') for (let c = 0; c < NCH; c++) await demoSweep(br, d.B, c);
    if (PART === 'live' || PART === 'all') await live(br);
  } finally { await br.close(); if (d) d.srv.close(); }
  console.log(`\n${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
