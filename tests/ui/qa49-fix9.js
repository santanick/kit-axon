'use strict';
/* v49 QA9 가상 테스터 발견 9-1 ~ 9-7 회귀(fix9)
   9-1 앱 390 비로그인 홈: 떠 있는 튜터 버튼(#ltut .lt-fab)이 보내기(.ap-send)를 덮지 않음(홈 입력창이 있으면 숨김)
   9-2 브라우저 aiguard.js: system(문자열 · 블록 배열)의 주민번호 · 휴대폰도 가림
   9-3 닉네임 주민번호 · 휴대폰 · 전화번호 형태 거절(해요체 안내) · 보통 닉네임은 그대로 가입
   9-4 인라인 onfocus 없음 · data-selall 위임 focusin으로 전체 선택
   9-5 동의(#consent) · 승인 대기(#pending)의 앱 아래 탭: 허용 탭만 열림 · 나머지 aria-disabled + 안내 한 줄 · 게이트 유지
   9-6 종료일이 지난 과정의 차시: 웹 · 앱 모두 종료 안내 · 진도 저장 없음
   9-7 훈련 유의사항 창(voc): 「확인했습니다 · 나중에 볼게요」가 390 화면 안에 보임
   사용: node tests/ui/qa49-fix9.js   (PORT 9974) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const PORT = +process.env.PORT || 9974;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(o => srv.listen(PORT, '127.0.0.1', o).once('error', () => srv.listen(0, '127.0.0.1', o))); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const ctxOf = async (w = 390) => { const c = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500 }); const p = await c.newPage(); p.setDefaultTimeout(8000); const pe = []; p.on('pageerror', e => pe.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); return { c, p, pe }; };
  /* 스튜디오에서 기관을 만들고 게시 → tid */
  const mkOrg = async (p, type, ed, tweak) => { await p.goto(`${base}/index.html`); await p.evaluate(() => localStorage.setItem('didisam.emptyStart', '0')); await p.reload(); await p.waitForFunction(() => typeof createOrg === 'function', null, { timeout: 15000 });
    return p.evaluate(([type, ed, tw]) => { createOrg(type, 'QA 기관', ed); if (typeof mbEnsure === 'function') mbEnsure(); S.codes = S.codes || []; S.codes.unshift({ sid: 'QA9001', dept: '', code: 'QA9C0DE', at: today() }); if (tw) (0, eval)('(' + tw + ')')(); if (S.lsite) { S.lsite.pub = lsSnapshot(); S.lsite.pubAt = nowStr(); } save(); return DREG.cur(); }, [type, ed || null, tweak ? tweak.toString() : null]); };
  const L = async (p, tid, hash, app) => { await p.goto(`${base}/learner.html?t=${tid}${app ? '&app=1' : ''}${hash || '#home'}`); await p.waitForFunction(() => typeof LR !== 'undefined' && typeof SITE === 'function' && SITE(), null, { timeout: 15000 }); await wait(700); const sk = p.locator('.v2-vis [data-vis="skip"], .v2-vis [data-vis="close"]'); if (await sk.count()) await sk.first().click().catch(() => { }); };
  const codeLogin = p => p.evaluate(async () => { await LR.api.login('QA9001', 'QA9C0DE'); lrender(); });
  const join = async (p, nick) => { await p.evaluate(() => { location.hash = '#join'; }); await p.waitForSelector('#laJoin', { timeout: 8000 });
    await p.fill('#laJoin [name=email]', `qa9fix${Math.random().toString(36).slice(2, 8)}@example.com`); await p.click('#laJoin [data-ac="otp"][data-v="jv"]'); await p.waitForSelector('.la-demo-code b', { timeout: 8000 });
    await p.fill('#laJoin [name=vcode]', (await p.textContent('.la-demo-code b')).trim()); await p.fill('#laJoin [name=nick]', nick);
    const A = p.locator('#laJoin [data-ac=jall]'); if (await A.count() && !(await A.isChecked())) await A.check().catch(() => { }); const T = p.locator('#laJoin [name=third]'); if (await T.count()) await T.check().catch(() => { });
    await p.click('#laJoin button[type=submit]'); await wait(1000); return (await p.textContent('#laJErr').catch(() => '')) || ''; };

  try {
    /* 9-1 */
    for (const ty of ['adult', 'k12', 'voc']) { const { c, p, pe } = await ctxOf(390); const tid = await mkOrg(p, ty); await wait(800); await L(p, tid, '#home', true); await wait(800);
      const r = await p.evaluate(() => { const f = document.querySelector('#ltut .lt-fab'), s = document.querySelector('.ap-send'); if (!s) return { noSend: true }; const sr = s.getBoundingClientRect(); const e = document.elementFromPoint(sr.left + sr.width / 2, sr.top + sr.height / 2);
        const fr = f && getComputedStyle(f).display !== 'none' ? f.getBoundingClientRect() : null; const ov = fr && !(fr.right <= sr.left || fr.left >= sr.right || fr.bottom <= sr.top || fr.top >= sr.bottom); return { hit: !!e && s.contains(e), ov: !!ov }; });
      ok(!r.noSend && r.hit && !r.ov, `9-1 ${ty} 앱 390 비로그인 홈: 보내기 버튼이 튜터 버튼에 가려지지 않음 ${JSON.stringify(r)}`); ok(!pe.length, `9-1 ${ty} pageerror 없음 ${pe.slice(0, 1)}`); await c.close(); }

    /* 9-2 */
    { const { c, p } = await ctxOf(1440); const bodies = []; await p.unroute(/^https?:\/\/(?!127\.0\.0\.1)/); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => { if (/api\.anthropic\.com/.test(x.request().url())) { bodies.push(x.request().postData() || ''); return x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: 'ok' }], usage: {} }) }); } return x.abort(); });
      await mkOrg(p, 'adult');
      await p.evaluate(async () => { const u = 'https://api.anthropic.com/v1/messages'; const h = { 'content-type': 'application/json' };
        await fetch(u, { method: 'POST', headers: h, body: JSON.stringify({ model: 'm', max_tokens: 50, system: '학습자 메모: 주민 900101-1234567 · 연락 010-1234-5678 · a@b.co', messages: [{ role: 'user', content: '안녕' }] }) });
        await fetch(u, { method: 'POST', headers: h, body: JSON.stringify({ model: 'm', max_tokens: 50, system: [{ type: 'text', text: '회원 900101-1234567' }, { type: 'text', text: '전화 010-1234-5678', cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: '안녕' }] }) }); });
      ok(bodies.length === 2, `9-2 브라우저 요청 2건 가로챔(${bodies.length})`);
      ok(bodies.every(b => !/900101-1234567|010-1234-5678|a@b\.co/.test(b)), '9-2 system(문자열 · 배열)의 주민번호 · 휴대폰 · 이메일이 외부 AI 요청에 없음');
      ok(bodies.every(b => /주민등록번호 가림/.test(b) && /휴대폰 번호 가림/.test(b)), '9-2 가림 표시로 바뀜');
      ok(/cache_control/.test(bodies[1] || ''), '9-2 배열 블록의 다른 필드(cache_control)는 그대로'); await c.close(); }

    /* 9-3 */
    { const { c, p } = await ctxOf(390); const tid = await mkOrg(p, 'adult', null, () => { Object.assign(S.settings.acct, { mode: 'open', approve: 'auto' }); }); await wait(800);
      for (const nk of ['900101-1234567', '010-1234-5678', '01012345678', '02-123-4567', '반가워_010-1234-5678']) { await L(p, tid, '#home'); const er = await join(p, nk); ok(/개인정보를 쓸 수 없어요/.test(er) && !(await p.evaluate(() => !!LR.me)), `9-3 닉네임 「${nk}」 거절: ${er.slice(0, 40)}`); }
      await L(p, tid, '#home'); const er = await join(p, '큐에이2026'); ok(!er && (await p.evaluate(() => !!LR.me)), `9-3 보통 닉네임(숫자 포함 「큐에이2026」)은 가입 ${er}`);
      await c.close(); }

    /* 9-4 */
    { const src = ['acctlink.js', 'cls2.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n'); ok(!/\son(focus|click|input|change)="/.test(src), '9-4 acctlink.js · cls2.js에 인라인 이벤트 속성 없음');
      const { c, p } = await ctxOf(1440); await mkOrg(p, 'adult'); const r = await p.evaluate(async () => { document.body.insertAdjacentHTML('beforeend', '<input id="qaSel" readonly data-selall value="https://example.com/join/abc">'); const i = document.getElementById('qaSel'); i.focus(); await new Promise(r => setTimeout(r, 30)); const v = [i.selectionStart, i.selectionEnd, i.value.length]; i.remove(); return v; });
      ok(r[0] === 0 && r[1] === r[2], `9-4 data-selall 칸 포커스 → 전체 선택 ${r}`); await c.close(); }

    /* 9-5 동의 */
    { const { c, p, pe } = await ctxOf(390); const tid = await mkOrg(p, 'univ', 'lite'); await wait(800); await L(p, tid, '#home', true); await codeLogin(p); await wait(900);
      const st = await p.evaluate(() => ({ h: location.hash, tabs: [...document.querySelectorAll('.ap-nav > a')].map(a => [a.getAttribute('href'), a.getAttribute('aria-disabled')]), note: (document.querySelector('.ap-gnote') || {}).textContent || '' }));
      ok(st.h === '#consent', `9-5 대학 접근코드 첫 로그인 → #consent (${st.h})`);
      ok(st.tabs.length >= 3 && st.tabs.filter(([h]) => h !== '#acct').every(([, d]) => d === 'true') && st.tabs.filter(([h]) => h === '#acct').every(([, d]) => d !== 'true'), `9-5 동의 전 아래 탭: 나(#acct)만 열림 ${JSON.stringify(st.tabs)}`);
      ok(/약관 동의를 마치면/.test(st.note), `9-5 동의 전 안내 한 줄 「${st.note}」`);
      const nv = await p.evaluate(() => { const n = document.querySelector('.ap-gnote'), v = document.querySelector('.ap-nav'); const a = n.getBoundingClientRect(), b = v.getBoundingClientRect(); return a.bottom <= b.top + 1 && a.height > 0 && a.height < 60; }); ok(nv, '9-5 안내 줄이 아래 탭 바로 위(겹침 없음)');
      await p.locator('.ap-nav > a').first().tap({ force: true }); /* aria-disabled는 Playwright가 비활성으로 보므로 force(실제 손가락 탭과 같음) */ await wait(500); ok(await p.evaluate(() => location.hash === '#consent' && !!document.querySelector('.ltoast')), '9-5 막힌 탭(홈)을 누르면 #consent 유지 + 안내 토스트');
      await p.evaluate(() => { location.hash = '#my'; }); await wait(600); ok(await p.evaluate(() => location.hash === '#consent'), '9-5 주소로 #my 직접 이동해도 동의 게이트 유지(우회 없음)');
      await p.locator('.ap-nav > a[href="#acct"]').tap(); await wait(700); ok(await p.evaluate(() => location.hash === '#acct'), '9-5 「나」 탭은 열림(계정 · 로그아웃)');
      await p.evaluate(() => { location.hash = '#consent'; }); await wait(500); await p.check('#lcConsent [data-cn=all]'); await p.click('#lcConsent button[type=submit]'); await wait(900);
      const af = await p.evaluate(() => ({ off: document.querySelectorAll('.ap-nav > a[aria-disabled="true"]').length, note: !!document.querySelector('.ap-gnote') })); ok(af.off === 0 && !af.note, `9-5 동의 후 탭 모두 열림 · 안내 사라짐 ${JSON.stringify(af)}`);
      ok(!pe.length, `9-5 pageerror 없음 ${pe.slice(0, 1)}`); await c.close(); }
    /* 9-5 승인 대기 */
    { const { c, p, pe } = await ctxOf(390); const tid = await mkOrg(p, 'adult', null, () => { Object.assign(S.settings.acct, { mode: 'open', approve: 'manual' }); }); await wait(800); await L(p, tid, '#home', true); await join(p, '대기학습자'); await wait(300);
      await L(p, tid, '#home', true); await wait(600);
      const st = await p.evaluate(() => ({ h: location.hash, me: !!LR.me, tabs: [...document.querySelectorAll('.ap-nav > a')].map(a => [a.getAttribute('href'), a.getAttribute('aria-disabled')]), note: (document.querySelector('.ap-gnote') || {}).textContent || '' }));
      ok(st.h === '#pending' && !st.me, `9-5 승인 대기: 새로 고침 뒤 #pending ${st.h}`);
      ok(st.tabs.length >= 3 && st.tabs.every(([h, d]) => (/^#(login|join|find|privacy)/.test(h) ? d !== 'true' : d === 'true')), `9-5 대기 아래 탭: 로그인만 열림 ${JSON.stringify(st.tabs)}`);
      ok(/승인되면/.test(st.note), `9-5 대기 안내 한 줄 「${st.note}」`);
      await p.locator('.ap-nav > a').first().tap({ force: true }); await wait(500); ok(await p.evaluate(() => location.hash === '#pending'), '9-5 대기 중 막힌 탭은 #pending 유지');
      ok(!pe.length, `9-5 대기 pageerror 없음 ${pe.slice(0, 1)}`); await c.close(); }

    /* 9-6 */
    for (const app of [false, true]) { const { c, p, pe } = await ctxOf(app ? 390 : 1440); const tid = await mkOrg(p, 'lifelong', null, () => { const c = S.classes.find(x => (x.curriculum || []).length) || S.classes[0]; c.end = '2025-12-01'; c.start = '2025-09-01'; c.status = '운영중'; }); await wait(800);
      await L(p, tid, '#home', app); await codeLogin(p); await wait(700);
      const cls = await p.evaluate(() => { const C = SITE().classes; const c = C.find(x => x.end && x.end < '2026-01-01' && (x.items || []).length); const it = c && c.items.find(i => i.type !== 'chapter'); return c && it ? [c.id, it.id] : null; });
      ok(!!cls, `9-6 ${app ? '앱' : '웹'} 만료 과정 · 차시 있음`); if (!cls) { await c.close(); continue; }
      const before = await p.evaluate(c => JSON.stringify((LR.lp.cls || {})[c] || {}), cls[0]); await p.evaluate(h => { location.hash = h; }, `#c/${cls[0]}/${cls[1]}`); await wait(1800);
      const after = await p.evaluate(c => JSON.stringify((LR.lp.cls || {})[c] || {}), cls[0]); const note = await p.evaluate(() => { const n = document.querySelector('#lm .lexp-note'); if (!n) return ''; const r = n.getBoundingClientRect(); return r.height > 0 ? n.textContent : ''; });
      ok(/수강 기간이 끝난 과정이에요\(종료일 2025-12-01\)/.test(note), `9-6 ${app ? '앱' : '웹'} 만료 과정 차시에 종료 안내 「${note.slice(0, 40)}」`);
      ok(after === before, `9-6 ${app ? '앱' : '웹'} 만료 과정 진도 저장 없음`); ok(await p.evaluate(() => document.querySelectorAll('#lm .lexp-note').length === 1), `9-6 ${app ? '앱' : '웹'} 안내는 한 번만`);
      ok(!pe.length, `9-6 pageerror 없음 ${pe.slice(0, 1)}`); await c.close(); }
    /* 9-6 진행 중 과정에는 안내 없음 */
    { const { c, p } = await ctxOf(390); const tid = await mkOrg(p, 'lifelong'); await wait(800); await L(p, tid, '#home', true); await codeLogin(p); await wait(600);
      const cls = await p.evaluate(() => { const c = SITE().classes.find(x => (!x.end || x.end >= '2026-11-27') && (x.items || []).length); const it = c && c.items.find(i => i.type !== 'chapter'); return c && it ? [c.id, it.id] : null; });
      if (cls) { await p.evaluate(h => { location.hash = h; }, `#c/${cls[0]}/${cls[1]}`); await wait(1200); ok(await p.evaluate(() => !document.querySelector('.lexp-note')), '9-6 진행 중 과정은 종료 안내 없음'); } await c.close(); }

    /* 9-7 */
    { const { c, p } = await ctxOf(390); const tid = await mkOrg(p, 'voc'); await wait(800); await L(p, tid, '#home', true); await codeLogin(p); await wait(700); await p.evaluate(() => { location.hash = '#c/c0'; }); await wait(1500);
      const r = await p.evaluate(() => { const m = document.querySelector('#cplM'); if (!m) return null; const v = s => { const e = m.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.top >= 0 && r.bottom <= innerHeight && !!x && e.contains(x); }; return { later: v('#cplLater'), ack: v('#cplAck') }; });
      ok(r && r.later && r.ack, `9-7 voc 유의사항 창: 두 버튼이 390 화면 안에서 바로 눌림 ${JSON.stringify(r)}`);
      await p.tap('#cplAck'); await wait(600); ok(await p.evaluate(() => !document.querySelector('#cplM .cpl-mb h3') || !/유의사항/.test(document.querySelector('#cplM .cpl-mb h3').textContent)), '9-7 확인했습니다 → 유의사항 창 닫힘'); await c.close(); }
  } catch (e) { ok(false, '예외: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
