'use strict';
/* qa7 d3 · 운영자 · 기록 실서버 연결 + 메뉴 켜기 동선 점검
   ① 실서버(Node · MFA_DEV=1, MFA_OFF 없음): 「+ 운영자」 초대 → 서버 계정 목록(/api/staff) 반영 → 역할 변경(/api/staff/role) → 삭제(/api/staff/remove)
      기록 = 서버 감사 기록(/api/audit) + 무결성 표시(/api/audit/verify) · 필터(종류) · 내려받기(사유 입력 경로)
   ② 공통(시연판 · 실서버): 「상담」 메뉴를 켜고 누르면 상담 화면(설정 카드 아님) · 메뉴 카드 본문 클릭 · Enter/Space로 켜고 끄기 ·
      꺼진 메뉴로 들어오면 「꺼져 있습니다 · [켜기]」 안내 · 부운영자는 메뉴 구성을 바꾸지 못함 · 새 기관 정운영자에게 「운영자 · 기록」 기본 켬
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/kit_qa7_d3 NODE_PATH=$(npm root -g):service/server/node_modules node tests/ui/staff-audit.js
         PUB_DIR=<이미 만든 운영용 public>(없으면 build-public.js로 만든다) · LIVE=0 이면 시연판만 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const os = require('node:os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..'); const SVC = path.join(ROOT, 'service'); const DEMO = path.join(ROOT, 'didisam');
const DB = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/kit_qa7_d3'; const PORT = +(process.env.PORT_LIVE || 9987);
const NP = [path.join(SVC, 'server/node_modules'), ...(process.env.NODE_PATH || '').split(path.delimiter), '/home/claude/kit-axon/service/server/node_modules'].filter(p => p && fs.existsSync(path.join(p, 'pg'))).join(path.delimiter);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const TYPES = [['k12'], ['adult'], ['corp'], ['public'], ['univ', 'lite'], ['univ', 'lms'], ['lifelong'], ['voc']];
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.error('✗', m, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
const wait = ms => new Promise(k => setTimeout(k, ms));

/* 페이지 안: 상담 이동 · 카드 클릭 · 키보드 · 꺼진 메뉴 안내 · 부운영자 차단 */
async function common(p, tag) {
  const r = await p.evaluate(async () => {
    const W = ms => new Promise(k => setTimeout(k, ms)); const o = {}; const find = id => Object.values(S.nav.tabs).flat().find(x => x.id === id);
    S.me.role = 'owner'; if (typeof LIVE !== 'undefined' && LIVE && LIVE.user) LIVE.user.role = 'owner'; closeModal();
    o.admDefault = menuOn('admins');
    /* 상담: 켜고 탭 줄 버튼(data-act=go)으로 */
    if (find('consult')) { slMenuTry('consult', true); go('talk'); await W(100); const b = document.querySelector('#main [data-act=go][data-v=consult], [data-act=go][data-v=consult]'); if (b) b.click(); else go('consult'); await W(150);
      o.consult = { ws: CUR.ws, tab: CUR.tab, btn: !!b }; go('consult'); await W(50); o.consultGo = { ws: CUR.ws, tab: CUR.tab }; }
    /* 메뉴 카드 본문 클릭 · Space · Enter */
    slSetOpen('onoff', true); go('settings'); await W(150);
    const row = () => document.querySelector('.sl-row[role=switch][data-v=admins]');
    const st0 = menuOn('admins'); const r0 = row(); o.row = !!r0; o.rowAria = r0 && r0.getAttribute('aria-checked');
    if (r0) { r0.querySelector('.sl-tx b').click(); await W(150); o.afterName = menuOn('admins'); o.ariaAfter = row() && row().getAttribute('aria-checked');
      const r1 = row(); r1.focus(); r1.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); await W(150); o.afterSpace = menuOn('admins');
      const r2 = row(); r2.focus(); r2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(150); o.afterEnter = menuOn('admins'); }
    o.st0 = st0;
    /* 꺼진 메뉴로 들어오면 안내 + [켜기] */
    slMenuTry('admins', false); go('admins'); await W(150); const n = document.querySelector('#main .sl-offnote'); o.offNote = n ? n.textContent.trim().slice(0, 80) : ''; o.offBtn = !!(n && n.querySelector('[data-act=sl-offon]')); o.offTab = CUR.tab;
    if (o.offBtn) { n.querySelector('[data-act=sl-offon]').click(); await W(200); } o.offOn = menuOn('admins'); o.noteGone = !document.querySelector('#main .sl-offnote');
    /* 부운영자: 메뉴 구성 변경 불가 · 꺼진 메뉴 안내에 [켜기] 없음 */
    S.me.role = 'sub'; if (typeof LIVE !== 'undefined' && LIVE && LIVE.user) LIVE.user.role = 'sub';
    const off = Object.values(S.nav.tabs).flat().find(x => !x.on && MENU[x.id] && !MENU[x.id].owner && (!MENU[x.id].only || MENU[x.id].only === S.org.type));
    o.subTry = slMenuTry('message', !menuOn('message')).ok; o.subOffTry = off ? slMenuTry(off.id, true).ok : null;
    const box = document.createElement('div'); box.innerHTML = slMenusBody(); o.subSwitch = !!box.querySelector('[data-act=sl-menu]'); o.subNote = /정운영자만/.test(box.textContent);
    if (off) { go(off.id); await W(150); const n2 = document.querySelector('#main .sl-offnote'); o.subOff = { note: !!n2, btn: !!(n2 && n2.querySelector('[data-act=sl-offon]')), txt: n2 ? n2.textContent.slice(0, 60) : '' }; }
    S.me.role = 'owner'; if (typeof LIVE !== 'undefined' && LIVE && LIVE.user) LIVE.user.role = 'owner'; go('home'); return o; });
  ok(r.admDefault, `${tag}: 새 기관 정운영자 「운영자 · 기록」 기본 켬`, r);
  if (r.consult) { ok(r.consult.ws === 'talk' && r.consult.tab === 'consult', `${tag}: 상담 탭 버튼 → 상담 화면`, r.consult); ok(r.consultGo.ws === 'talk' && r.consultGo.tab === 'consult', `${tag}: go('consult') → 상담 화면`, r.consultGo); }
  ok(r.row && r.rowAria === String(r.st0), `${tag}: 메뉴 카드 role=switch · aria-checked`, r);
  ok(r.afterName === !r.st0 && r.ariaAfter === String(!r.st0), `${tag}: 카드 이름을 눌러도 켜고 끔`, r);
  ok(r.afterSpace === r.st0 && r.afterEnter === !r.st0, `${tag}: Space · Enter로 켜고 끔`, r);
  ok(r.offTab === 'admins' && /꺼져 있습니다/.test(r.offNote) && r.offBtn, `${tag}: 꺼진 메뉴 들어오면 안내 + [켜기]`, r);
  ok(r.offOn && r.noteGone, `${tag}: [켜기] 누르면 켜지고 안내 사라짐`, r);
  ok(r.subTry === false && r.subOffTry !== true && !r.subSwitch && r.subNote, `${tag}: 부운영자는 메뉴 구성 변경 불가 · 이유 안내`, r);
  if (r.subOff) ok(r.subOff.note && !r.subOff.btn && /정운영자/.test(r.subOff.txt), `${tag}: 부운영자 꺼진 메뉴 안내에 [켜기] 없음 · 이유`, r.subOff);
}

(async () => {
  const BR = await chromium.launch(); const T0 = Date.now();
  const page = async (opt) => { const ctx = await BR.newContext(opt); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return { ctx, p }; };
  /* ───── 시연판 ───── */
  const srv = http.createServer((q, r) => { const f = path.join(DEMO, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(DEMO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(k => srv.once('listening', k)); const D0 = `http://127.0.0.1:${srv.address().port}`;
  try { const { ctx, p } = await page({ viewport: { width: 1440, height: 900 } }); await p.goto(D0 + '/index.html', { waitUntil: 'load' });
    for (const [ty, ed] of TYPES) { await p.evaluate(([t, e]) => { createOrg(t, '운영자 점검', e); render(); }, [ty, ed]); await wait(600); await common(p, `시연 ${ty}${ed ? '/' + ed : ''}`); }
    /* 시연판 운영자 화면은 로컬 그대로(서버 표 없음 · + 운영자 = 로컬 추가 창) */
    const d = await p.evaluate(async () => { createOrg('k12', '시연 운영자'); render(); go('admins'); await new Promise(k => setTimeout(k, 200)); const has = !!document.querySelector('#stfCard'); ACT['adm-new'](); const m = document.querySelector('#modal'); const t = m ? m.textContent.slice(0, 40) : ''; closeModal(); return { has, t, txt: document.querySelector('#main').innerText.slice(0, 80) }; });
    ok(!d.has && /운영자 추가/.test(d.t), '시연판: 운영자 화면은 로컬(서버 표 없음 · 로컬 추가 창)', d);
    ok(!p.errs.length, '시연판 페이지 오류 없음', p.errs.slice(0, 4)); await ctx.close(); } finally { srv.close(); }

  /* ───── 실서버 ───── */
  if (process.env.LIVE !== '0') {
    let pub = process.env.PUB_DIR; const own = !pub; if (own) { pub = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-pub-')); cp.execFileSync(process.execPath, [path.join(SVC, 'build-public.js'), DEMO, pub], { cwd: SVC, stdio: 'ignore' }); }
    try { cp.execSync(`fuser -k -n tcp ${PORT}`, { stdio: 'ignore' }); } catch (e) { }
    const env = { ...process.env, NODE_PATH: NP, NODE_ENV: 'test', DATABASE_URL: DB, PII_KEY: 'cd'.repeat(32), SESSION_PEPPER: 'sa-only', COOKIE_SECURE: '0', TRUST_PROXY_HOPS: '0', PII_DEV_OTP: '1', MFA_DEV: '1', PUBLIC_DIR: pub, PORT: String(PORT) };
    delete env.MFA_OFF; delete env.SIGNUP_CODE; delete env.MAIL_PROVIDER; delete env.SANTA_ADMIN_EMAILS;
    const ch = cp.spawn(process.execPath, ['server/index.js'], { cwd: SVC, env, stdio: ['ignore', 'pipe', 'pipe'] }); let out = ''; ch.stdout.on('data', x => out += x); ch.stderr.on('data', x => out += x);
    const B = `http://127.0.0.1:${PORT}`; let up = false; for (let i = 0; i < 200 && !up; i++) { try { up = (await fetch(B + '/api/health')).ok; } catch (e) { } if (!up) await wait(100); }
    try { ok(up, '실서버 기동', out.slice(-400));
      if (up) for (const [ty, full] of [['k12', true], ['adult', false], ['univ', false]]) { const stamp = Date.now().toString(36); const OW = `sa-${ty}-${stamp}@qa.kr`; const tag = `실서버 ${ty}`;
        const ctx = await BR.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
        const H = { 'x-didisam': '1', 'content-type': 'application/json' };
        const su = await ctx.request.post(B + '/api/signup', { headers: H, data: { email: OW, password: 'StaffAudit2026ok', orgName: '운영자 점검', type: ty } }); ok(su.ok(), `${tag} 가입`, await su.text().catch(() => ''));
        const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
        p.on('dialog', d => d.type() === 'prompt' ? d.accept('감사 기록 점검') : d.dismiss());
        await p.goto(B + '/', { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE && LIVE.user && (document.querySelector('#suForm') || (S && S.org)), null, { timeout: 15000 }).catch(() => {});
        await p.evaluate(t => { if (!S || !S.org) createOrg(t, '운영자 점검'); }, ty).catch(() => {}); await wait(1000);
        await p.evaluate(() => { const b = document.querySelector('[data-act=onb-later]'); if (b) b.click(); }).catch(() => {});
        await p.waitForFunction(() => typeof S !== 'undefined' && S && S.org && document.querySelector('#main'), null, { timeout: 20000 }).catch(() => {});
        await common(p, tag);
        if (full) {
          const SUB = `sa-sub-${stamp}@qa.kr`; const staff = async () => (await (await ctx.request.get(B + '/api/staff', { headers: H })).json()).rows || [];
          await p.evaluate(() => { closeModal(); go('admins'); }); await p.waitForSelector('#stfCard', { timeout: 8000 }).catch(() => {});
          ok(await p.$('#stfCard') && await p.$('#audCard'), `${tag}: 운영자 · 기록 = 서버 계정 · 감사 기록`);
          await p.click('[data-act=stf-new]'); await p.fill('#modal input[name=e]', SUB); await p.selectOption('#modal select[name=r]', 'sub'); await p.click('#modal [data-mact=ok]');
          await p.waitForSelector('#stfPw', { timeout: 8000 }).catch(() => {}); const pw = await p.$eval('#stfPw', e => e.textContent).catch(() => '');
          const note = await p.$eval('#modal', e => e.textContent).catch(() => '');
          ok(pw.length >= 10 && /초대 메일 발송은 설정되어 있지 않습니다/.test(note), `${tag}: 초대 → 임시 비밀번호 1회 표시 · 메일 미설정 안내`, { pw: !!pw, note: note.slice(0, 80) });
          let L = await staff(); ok(L.some(r => r.email === SUB && r.role === 'sub'), `${tag}: 서버 계정 목록에 초대한 운영자(부운영자)`, L);
          const lg = await fetch(B + '/api/login', { method: 'POST', headers: H, body: JSON.stringify({ email: SUB, password: pw }) }); ok(lg.status === 200, `${tag}: 초대한 계정으로 실제 로그인(서버 계정 생성)`, lg.status);
          await p.evaluate(() => closeModal()); await p.waitForSelector(`#stfCard tr[data-email="${SUB}"]`, { timeout: 8000 }).catch(() => {});
          ok(!!await p.$(`#stfCard tr[data-email="${SUB}"]`), `${tag}: 화면 목록에 반영`);
          await p.selectOption(`[data-chg=stf-role][data-v="${SUB}"]`, 'teacher'); await wait(800);
          L = await staff(); ok(L.some(r => r.email === SUB && r.role === 'teacher'), `${tag}: 역할 변경 → 서버 교수자`, L);
          const aud = await p.evaluate(async () => { await new Promise(k => setTimeout(k, 300)); const c = document.querySelector('#audCard'); return { txt: c ? c.innerText : '', rows: c ? c.querySelectorAll('tbody tr').length : 0 }; });
          ok(/운영자 초대/.test(aud.txt) && /역할 변경/.test(aud.txt) && /무결성 확인됨/.test(aud.txt), `${tag}: 기록 = 서버 감사 기록(초대 · 역할 변경) + 무결성 표시`, aud.txt.slice(0, 300));
          const srvN = ((await (await ctx.request.get(B + '/api/audit', { headers: H })).json()).rows || []).length; ok(aud.rows === Math.min(srvN, 200) && aud.rows > 0, `${tag}: 화면 기록 수 = 서버 감사 기록 수`, { ui: aud.rows, srvN });
          await p.selectOption('[data-chg=aud-f][data-k=kind]', 'staff'); await wait(200);
          const fk = await p.$$eval('#audCard tbody tr td:nth-child(3)', T => T.map(t => t.textContent)); ok(fk.length >= 2 && fk.every(x => /운영자|역할/.test(x)), `${tag}: 종류 필터(운영자)`, fk);
          const dl = p.waitForEvent('download', { timeout: 8000 }).catch(() => null); await p.click('[data-act=aud-dl]'); const f = await dl;
          const exp = ((await (await ctx.request.get(B + '/api/audit', { headers: H })).json()).rows || []).filter(r => r.action === 'export');
          ok(!!f && exp.some(r => /audit_csv/.test(JSON.stringify(r.detail || ''))), `${tag}: 내려받기 = 사유 입력 → 서버 내려받기 기록`, { file: f && f.suggestedFilename(), exp: exp.slice(0, 2) });
          await p.click(`[data-act=stf-del][data-v="${SUB}"]`); await p.click('#modal [data-mact=ok]'); await wait(800);
          L = await staff(); ok(!L.some(r => r.email === SUB), `${tag}: 삭제 → 서버 목록에서 빠짐`, L);
          ok(!await p.$(`#stfCard tr[data-email="${SUB}"]`), `${tag}: 화면 목록에서도 빠짐`);
          /* 부운영자 화면: 서버 기록 대신 정운영자 전용 안내 */
          const sv = await p.evaluate(() => { S.me.role = 'sub'; LIVE.user.role = 'sub'; const h = VIEWS.admins(); S.me.role = 'owner'; LIVE.user.role = 'owner'; return h; }); ok(/정운영자만 볼 수 있습니다/.test(sv) && !/stfCard/.test(sv), `${tag}: 부운영자는 운영자 · 기록 안내만`);
        }
        ok(!p.errs.length, `${tag} 페이지 오류 없음`, p.errs.slice(0, 4)); await ctx.close(); }
    } finally { ch.kill('SIGKILL'); await wait(300); try { cp.execSync(`fuser -k -n tcp ${PORT}`, { stdio: 'ignore' }); } catch (e) { } if (own) fs.rmSync(pub, { recursive: true, force: true }); }
  }
  await BR.close();
  console.log(`staff-audit: ${pass} 통과 · ${fail} 실패 (${Math.round((Date.now() - T0) / 1000)}초)`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
