'use strict';
/* qa7 d1 · 메뉴 켜기 일치 점검 — 「켰습니다」 안내와 실제 왼쪽 메뉴 상태가 같은지
   ① 시연판(정적 파일) ② 실서버 비산타(SANTA_ADMIN_EMAILS 기본값) ③ 실서버 산타 관리자 — 기관 유형 8종 × 정운영자 · 부운영자 · 교수자
   경로 3가지: 설정 › 메뉴 스위치(sl-menu) · 메뉴 찾기 [켜기](ux-on) · AI SAM 「○○ 메뉴 켜줘」, 대상: 보안 · 운영자 · 로그(admins) + 정운영자는 꺼진 메뉴 전부
   덧붙여: 시연판 대학 LMS 「앱 출석」이 멈추지 않음(render 반복 없음) · 휴대폰 390 「메뉴 찾기」 창 닫기(닫기 · Esc · 바깥) · 머리 줄 aria-label 구분
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/kit_qa7_d1 NODE_PATH=$(npm root -g):service/server/node_modules node tests/ui/menu-toggle.js
         LIVE=0 이면 시연판만, DEMO=0 이면 실서버만. 실서버는 운영과 같게 MFA_DEV=1(MFA_OFF 없음), 포트 9981(비산타) · 9982(산타) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const os = require('node:os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const SVC = path.join(ROOT, 'service'); const DEMO = path.join(ROOT, 'didisam');
const DB = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/kit_qa7_d1';
const NP = [path.join(SVC, 'server/node_modules'), ...(process.env.NODE_PATH || '').split(path.delimiter), '/home/claude/kit-axon/service/server/node_modules'].filter(p => p && fs.existsSync(path.join(p, 'pg'))).join(path.delimiter);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const TYPES = [['k12'], ['adult'], ['corp'], ['public'], ['univ', 'lite'], ['univ', 'lms'], ['lifelong'], ['voc']];
const ROLES = ['owner', 'sub', 'teacher'];
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.error('✗', m, x ? JSON.stringify(x).slice(0, 400) : ''); } };
const wait = ms => new Promise(k => setTimeout(k, ms));

/* 페이지 안에서: 대상 메뉴를 끈 뒤 세 경로로 켜고, 안내 문구와 실제 표시(menuShown)를 모은다 */
const PROBE = ({ role, all }) => {
  const toastTxt = () => { const b = document.querySelector('#toasts'); return b ? b.textContent.trim() : ''; };
  const find = id => Object.values(S.nav.tabs).flat().find(x => x.id === id);
  const menuShown = id => Object.entries(S.nav.tabs).some(([w, L]) => (L || []).some(x => x.id === id) && S.nav.ws.includes(w) && wsTabs(w).includes(id)); /* 실제 왼쪽 메뉴 표시(화면 코드의 menuShown과 같은 기준을 시험이 따로 계산) */
  S.me.role = role; if (typeof LIVE !== 'undefined' && LIVE && LIVE.user) LIVE.user.role = role; closeModal(); render();
  const ids = new Set(['security', 'admins']);
  if (all) Object.values(S.nav.tabs).flat().filter(x => MENU[x.id] && !x.on).forEach(x => ids.add(x.id));
  /* 설정 › 메뉴 목록 · 메뉴 찾기 꺼진 메뉴 목록에 보이는지 */
  const listed = {}; try { const box = document.createElement('div'); box.innerHTML = typeof slMenusBody === 'function' ? slMenusBody() : VIEWS.menus(); ['security', 'admins'].forEach(id => { listed[id] = !!box.querySelector(`[data-act=sl-menu][data-v="${id}"]`); }); } catch (e) { listed.err = e.message; }
  const fsec = find('security'); const was = fsec && fsec.on; if (fsec) fsec.on = false; ACT['ux-find'](); listed.findSec = !!document.querySelector('#modal .uxfl [data-v="security"]'); closeModal(); if (fsec) fsec.on = was;
  const R = [];
  for (const id of ids) { const t = find(id); if (!t) { R.push({ id, none: 1 }); continue; }
    for (const how of ['sl-menu', 'ux-on', 'ai']) { const t0 = find(id); t0.on = false; save(); closeModal(); render(); const tb = document.querySelector('#toasts'); if (tb) tb.innerHTML = '';
      let msg = ''; try { if (how === 'ai') { const a = answer(`${mlabel(id)} 메뉴 켜줘`); msg = ((a && a.title) || '') + ' ' + ((a && a.text) || ''); } else { ACT[how]({ dataset: { v: id } }); msg = toastTxt(); } } catch (e) { msg = 'ERR ' + e.message; }
      closeModal(); render(); R.push({ id, how, shown: menuShown(id), claim: /켰습니다/.test(msg), msg: msg.slice(0, 90) }); } }
  const ai2 = answer('운영자 기록 메뉴 켜줘'); render();
  return { R, listed, ai2: ((ai2 && ai2.title) || '') + ' ' + ((ai2 && ai2.text) || ''), ai2shown: menuShown('admins'), santa: typeof LIVE !== 'undefined' && LIVE && LIVE.user ? !!LIVE.user.santa : null };
};

function judge(tag, mode, role, r) {
  const bad = r.R.filter(x => !x.none && x.claim !== x.shown); ok(!bad.length, `${tag} ${role}: 「켰습니다」 안내 = 실제 표시`, bad.slice(0, 4));
  const err = r.R.filter(x => /^ERR/.test(x.msg)); ok(!err.length, `${tag} ${role}: 켜기 경로 오류 없음`, err.slice(0, 3));
  const sec = r.R.filter(x => x.id === 'security'), adm = r.R.filter(x => x.id === 'admins');
  const secOk = mode !== 'nonsanta' && role === 'owner';
  ok(sec.every(x => x.shown === secOk), `${tag} ${role}: 보안 ${secOk ? '켜짐' : '켜지지 않음'}`, sec);
  if (!secOk) ok(sec.every(x => x.msg.trim()), `${tag} ${role}: 보안 못 켤 때 이유 안내`, sec);
  if (mode === 'nonsanta') { ok(sec.every(x => /보안 메뉴는 산타 관리자 전용입니다/.test(x.msg) || role === 'teacher'), `${tag} ${role}: 비산타 보안 안내 문구`, sec); ok(!r.listed.security && !r.listed.findSec, `${tag} ${role}: 비산타 메뉴 목록 · 메뉴 찾기에 보안 없음`, r.listed); }
  if (mode !== 'nonsanta' && role === 'owner') ok(r.listed.security, `${tag} owner: 메뉴 목록에 보안 스위치`, r.listed);
  const admOk = role === 'owner'; /* qa7 d3: 메뉴 구성은 정운영자만(부운영자 · 교수자는 이유 안내) */
  ok(adm.every(x => x.shown === admOk), `${tag} ${role}: 운영자 · 로그 ${admOk ? '켜짐' : '켜지지 않음(정운영자 전용)'}`, adm);
  if (!admOk) ok(adm.every(x => x.msg.trim()), `${tag} ${role}: 운영자 · 로그 못 켤 때 이유 안내`, adm);
  if (role === 'owner') ok(r.listed.admins, `${tag} owner: 메뉴 목록에 운영자 · 로그 스위치`, r.listed);
  ok(!/켰습니다/.test(r.ai2) || r.ai2shown, `${tag} ${role}: AI 「운영자 기록 메뉴 켜줘」 응답 = 실제`, { ai2: r.ai2, shown: r.ai2shown });
  if (mode === 'santa') ok(r.santa === true, `${tag}: 서버 santa 플래그`, r.santa);
  if (mode === 'nonsanta') ok(r.santa === false, `${tag}: 비산타 플래그`, r.santa);
}

/* 휴대폰 390: 머리 줄 버튼 이름 구분 + 메뉴 찾기 창 닫기 3가지 */
async function mobileFind(p, tag) {
  const L = await p.evaluate(() => [...document.querySelectorAll('header button[aria-label], .top button[aria-label]')].map(b => b.getAttribute('aria-label')));
  ok(!L.includes('메뉴 열기') || !L.includes('메뉴 찾기'), `${tag} 390 머리 줄 「메뉴 열기」/「메뉴 찾기」 구분`, L);
  ok(new Set(L).size === L.length, `${tag} 390 머리 줄 aria-label 중복 없음`, L);
  const res = {};
  for (const how of ['x', 'esc', 'out']) { await p.evaluate(() => { closeModal(); document.body.classList.remove('nav-open'); });
    const b = await p.$('[data-act=ux-find]'); if (b && await b.isVisible()) await b.click(); else await p.evaluate(() => ACT['ux-find']()); await wait(200);
    const open = await p.evaluate(() => !!document.querySelector('#modal .uxfl'));
    if (how === 'x') await p.click('#modal [data-act=modal-close]', { timeout: 3000 }).catch(() => {}); else if (how === 'esc') await p.keyboard.press('Escape'); else await p.mouse.click(195, 838);
    await wait(200); res[how] = open && !(await p.evaluate(() => !!document.querySelector('#modal'))); }
  ok(res.x && res.esc && res.out, `${tag} 390 메뉴 찾기 창: 닫기 · Esc · 바깥 누르기로 닫힘`, res);
}

(async () => {
  const BR = await chromium.launch(); const T0 = Date.now();
  /* ───── ① 시연판 ───── */
  const srv = http.createServer((q, r) => { const f = path.join(DEMO, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(DEMO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(k => srv.once('listening', k)); const DB0 = `http://127.0.0.1:${srv.address().port}`;
  const page = async (opt) => { const ctx = await BR.newContext(opt); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); const p = await ctx.newPage(); p.errs = []; p.closed = false; p.on('pageerror', e => p.errs.push(e.message)); p.on('close', () => { p.closed = true; }); p.on('crash', () => { p.closed = true; }); p.on('dialog', d => d.dismiss()); return { ctx, p }; };
  try { if (process.env.DEMO !== '0') {
    { const { ctx, p } = await page({ viewport: { width: 1440, height: 900 } }); await p.goto(DB0 + '/index.html', { waitUntil: 'load' });
      for (const [ty, ed] of TYPES) { const tag = `시연 ${ty}${ed ? '/' + ed : ''}`; await p.evaluate(([t, e]) => { createOrg(t, '메뉴 점검', e); render(); }, [ty, ed]); await wait(900);
        for (const role of ROLES) judge(tag, 'demo', role, await p.evaluate(PROBE, { role, all: role === 'owner' })); }
      ok(!p.errs.length, '시연판 1440 페이지 오류 없음', p.errs.slice(0, 5)); await ctx.close(); }
    /* ③ 대학 LMS 앱 출석: render 반복 없음 · 탭 유지 · 버튼 클릭 */
    { const { ctx, p } = await page({ viewport: { width: 1440, height: 900 } }); await p.goto(DB0 + '/index.html', { waitUntil: 'load' });
      await p.evaluate(() => { createOrg('univ', '앱 출석 점검', 'lms'); render(); }); await wait(900);
      for (const role of ['owner', 'teacher']) {
        const r = await Promise.race([p.evaluate(async role => { S.me.role = role; Object.values(S.nav.tabs).flat().forEach(x => { if (['lmsp-app', 'lmsg'].includes(x.id)) x.on = true; }); save(); let n = 0; const b = render; render = (...a) => { n++; return b(...a); };
          go('lmsp-app'); await new Promise(k => setTimeout(k, 1500)); const n1 = n; const t1 = document.querySelector('#main').innerText;
          const acts = [...document.querySelectorAll('#main [data-act]')].filter(x => x.getBoundingClientRect().width && !/^(go|nav-more)$/.test(x.dataset.act)).map(x => x.dataset.act);
          for (const a of [...new Set(acts)]) { const el = document.querySelector(`#main [data-act="${a}"]`); if (el) el.click(); await new Promise(k => setTimeout(k, 300)); go('lmsp-app'); }
          go('lmsg'); await new Promise(k => setTimeout(k, 1200)); const n2 = n - n1; render = b; return { n1, n2, t1: t1.slice(0, 160), acts, cur: CUR.tab }; }, role), wait(20000).then(() => ({ hang: true }))]);
        ok(!r.hang && !p.closed, `대학 LMS 앱 출석(${role}): 멈추거나 탭이 닫히지 않음`, r);
        ok(r.n1 < 15 && r.n2 < 40, `대학 LMS 앱 출석(${role}): render 반복 없음`, r);
        ok(/출석/.test(r.t1 || ''), `대학 LMS 앱 출석(${role}): 화면 표시`, r); if (r.hang || p.closed) break; }
      ok(!p.errs.length, '앱 출석 페이지 오류 없음', p.errs.slice(0, 5)); await ctx.close(); }
    /* ④ 휴대폰 390(시연판) */
    { const { ctx, p } = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await p.goto(DB0 + '/index.html', { waitUntil: 'load' });
      await p.evaluate(() => { createOrg('corp', '휴대폰 점검'); render(); }); await wait(900); await mobileFind(p, '시연 corp'); await ctx.close(); }
  } } finally { srv.close(); }

  /* ───── ②③ 실서버 ───── */
  if (process.env.LIVE !== '0') {
    const pub = process.env.PUB_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'mt-pub-')); if (!process.env.PUB_DIR) cp.execFileSync(process.execPath, [path.join(SVC, 'build-public.js'), DEMO, pub], { cwd: SVC, stdio: 'ignore' }); /* PUB_DIR: 이미 만든 운영용 public(디스크 절약) */
    const stamp = Date.now().toString(36);
    for (const [mode, port] of [['nonsanta', 9981], ['santa', 9982]]) {
      const em = TYPES.map(([t, e]) => `mt-${mode[0]}-${t}${e || ''}-${stamp}@qa.kr`); const PW = 'MenuTest2026ok';
      try { cp.execSync(`fuser -k -n tcp ${port}`, { stdio: 'ignore' }); } catch (e) { }
      const env = { ...process.env, NODE_PATH: NP, NODE_ENV: 'test', DATABASE_URL: DB, PII_KEY: 'ab'.repeat(32), SESSION_PEPPER: 'mt-only', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', PII_DEV_OTP: '1', MFA_DEV: '1', PUBLIC_DIR: pub, PORT: String(port) };
      delete env.MFA_OFF; delete env.SIGNUP_CODE; delete env.MAIL_PROVIDER; delete env.SANTA_ADMIN_EMAILS; if (mode === 'santa') env.SANTA_ADMIN_EMAILS = em.join(',');
      const ch = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env, stdio: ['ignore', 'pipe', 'pipe'] }); let out = ''; ch.stdout.on('data', d => out += d); ch.stderr.on('data', d => out += d);
      const B = `http://127.0.0.1:${port}`; let up = false; for (let i = 0; i < 200 && !up; i++) { try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } if (!up) await wait(100); }
      try {
        ok(up, `실서버(${mode}) 기동`, out.slice(-400)); if (!up) continue;
        for (let i = 0; i < TYPES.length; i++) { const [ty, ed] = TYPES[i]; const tag = `실서버(${mode}) ${ty}${ed ? '/' + ed : ''}`;
          const ctx = await BR.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
          const H = { 'x-didisam': '1', 'content-type': 'application/json' };
          const su = await ctx.request.post(B + '/api/signup', { headers: H, data: { email: em[i], password: PW, orgName: '메뉴 점검', type: ty } }); ok(su.ok(), `${tag} 가입`, await su.text().catch(() => ''));
          await ctx.request.put(B + '/api/state', { headers: H, data: { doc: { org: { name: '메뉴 점검', type: ty, ...(ed ? { ed } : {}), room: { mode: 'saas' } } }, rev: 0 } });
          const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.dismiss());
          await p.goto(B + '/', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE && LIVE.user && (document.querySelector('#suForm') || (S && S.org)), null, { timeout: 15000 }).catch(() => {});
          /* ① 기관 단계: 화면의 [다음]과 같은 createOrg(유형 · 학사 LMS 여부)로 기관을 만든다 */
          await p.evaluate(([t, e]) => { if (!S || !S.org) { createOrg(t, '메뉴 점검', e); } }, [ty, ed]).catch(() => {}); await wait(1200);
          await p.evaluate(() => { const b = document.querySelector('[data-act=onb-later]'); if (b) b.click(); }).catch(() => {});
          await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE && LIVE.user && typeof S !== 'undefined' && S && S.org && S.nav && document.querySelector('#main'), null, { timeout: 20000 }).catch(() => {});
          const boot = await p.evaluate(() => ({ live: typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user), org: typeof S !== 'undefined' && !!(S && S.org), main: !!document.querySelector('#main'), txt: document.body.innerText.slice(0, 120) }));
          ok(boot.live && boot.org && boot.main, `${tag} 스튜디오 진입`, boot);
          if (boot.live && boot.org) for (const role of ROLES) judge(tag, mode, role, await p.evaluate(PROBE, { role, all: role === 'owner' && i < 2 }));
          if (i === 2 && boot.org) { await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { S.me.role = 'owner'; go('home'); render(); }); await wait(300); await mobileFind(p, tag); }
          ok(!p.errs.length, `${tag} 페이지 오류 없음`, p.errs.slice(0, 4)); await ctx.close(); }
      } finally { ch.kill('SIGKILL'); await wait(300); try { cp.execSync(`fuser -k -n tcp ${port}`, { stdio: 'ignore' }); } catch (e) { } }
    }
    if (!process.env.PUB_DIR) fs.rmSync(pub, { recursive: true, force: true });
  }
  await BR.close();
  console.log(`menu-toggle: ${pass} 통과 · ${fail} 실패 (${Math.round((Date.now() - T0) / 1000)}초)`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
