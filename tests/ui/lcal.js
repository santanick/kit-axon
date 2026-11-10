'use strict';
/* v37.4 학습자 학습 캘린더(lcal.js) 점검 — 앱(body.lapp) · 웹(기존 화면), PC 1280 · 휴대폰 390.
   ① 대학 · 학원 · 기업: 내 수강 과정 일정 자동 표시(시작 · 주차/차시 · 회차 · 과제 · 종료), 월 · 주 · 목록 보기, 오늘 · 이번 주 요약
   ② 운영자가 넣은 기관 일정(calx '학습자에게 보이기') → 게시 → 학습자 캘린더에 보임, 내부 일정(회의)은 안 보임, 다른 과정 묶인 일정은 안 보임
   ③ 날짜 클릭 → 그날 창 · 일정 클릭 → 상세(과정 · 차시로 바로 가기 링크), 내 일정 추가 · 수정 · 삭제(이 기기 저장 — 새로 고침 뒤에도 남음)
   ④ 진입: 앱 홈 카드 · 「나」 목록 · 웹 머리 메뉴 · 마이페이지 카드, [내 캘린더로 보내기] .ics, 웹 #connect(연결 · 알림)
   ⑤ 학원 보호자: 자녀 일정 · 자녀 이름 표시, 내 일정 추가 버튼 없음
   ⑥ 390 가로 넘침 0 · 오류 0
   사용: node tests/ui/lcal.js  (SHOTS=폴더 를 주면 화면을 찍는다) */
const path = require('node:path'); const fs = require('node:fs'); const http = require('node:http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const SH = process.env.SHOTS || '';
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const shot = async (pg, n) => { if (!SH) return; fs.mkdirSync(SH, { recursive: true }); await pg.screenshot({ path: path.join(SH, n + '.png') }); };

(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const br = await chromium.launch(); const errs = [];
  const mkOrg = async (type) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`[${type} admin] ${e.message}`)); p.on('dialog', d => d.accept());
    await p.goto(base + 'index.html'); await p.waitForFunction(() => typeof createOrg === 'function');
    const R = await p.evaluate(ty => { localStorage.setItem('didisam.emptyStart', '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg(ty, '캘린더 점검 기관', ty === 'univ' ? 'lite' : undefined);
      const code = lxDemo(); const c0 = S.classes.find(c => c.learners.some(id => (M(id) || {}).sid === code.sid)) || S.classes[0]; const other = S.classes.find(c => !c.learners.some(id => (M(id) || {}).sid === code.sid));
      const k = ty === 'univ' ? '학사 일정' : ty === 'k12' ? '보강' : '집합 교육';
      S.calx = { ev: [{ id: 'cxA', title: '기관 공개 일정', date: today(), kind: k }, { id: 'cxB', title: '내부 운영 회의', date: today(), kind: '회의' }, { id: 'cxC', title: '과정 특강 안내', date: addDays(today(), 2), time: '19:00', kind: k, cls: c0.id }, ...(other ? [{ id: 'cxD', title: '다른 과정 일정', date: today(), kind: k, cls: other.id }] : [])] };
      return { code, tid: DREG.cur(), c0: c0.id, c0n: c0.name, kid: c0.learners.find(id => (M(id) || {}).sid === code.sid) || c0.learners[0] }; }, type);
    /* 운영자 화면: 일정 추가 창에 '학습자 캘린더에도 보이기' */
    const pubBox = await p.evaluate(() => { ACT['cx-add']({ dataset: { v: today() } }); const x = document.querySelector('#slSheet [name="cxP"]'); const r = !!x && x.checked; try { slClose(); } catch (e) { } return r; });
    ok(pubBox, `[${type}] 운영자 일정 추가 창: 학습자 캘린더에도 보이기(기본 켜짐)`);
    const snap = await p.evaluate(() => lsSnapshot().calx.map(e => e.title)); ok(snap.includes('기관 공개 일정') && !snap.includes('내부 운영 회의'), `[${type}] 게시본 calx: 공개 일정만 — ${snap.join(' · ')}`);
    await p.evaluate(() => (typeof smPublish === 'function' ? smPublish : ACT['ls-pub'])()); await p.waitForTimeout(250); const m = await p.$('#modal [data-mact=ok]'); if (m) await m.click(); await p.waitForTimeout(200);
    if (type === 'k12') await p.evaluate(kid => { S.pacct = S.pacct || []; S.parents = S.parents || []; S.pacct.push({ id: 'pa_t', sid: 'pT0001', kind: 'parent', nick: '수학맘', grade: '정회원' }); S.parents.push({ id: 'pr_t', acct: 'pa_t', child: kid, status: '연결 완료', rel: '자녀', name: '수학맘', by: 'admin', at: today() }); }, R.kid);
    await p.evaluate(() => save()); return { ctx, p, ...R }; };
  const learner = async (o, mode, w, me) => { const ctx = await br.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, acceptDownloads: true }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    /* 같은 브라우저 저장소(데모 데이터룸)를 쓰기 위해 운영자 탭의 localStorage를 옮긴다 */
    const st = await o.p.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))));
    await ctx.addInitScript(([s, mode]) => { if (sessionStorage.getItem('lcal.init')) return; sessionStorage.setItem('lcal.init', '1'); const S0 = JSON.parse(s); Object.entries(S0).forEach(([k, v]) => localStorage.setItem(k, v)); if (mode === 'web') localStorage.setItem('didisam.app.classic', '1'); else localStorage.removeItem('didisam.app.classic'); }, [st, mode]);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`[${mode} ${w}] ${e.message}`)); p.on('dialog', d => d.accept());
    if (me) await p.addInitScript(([tid, me]) => { sessionStorage.setItem('didisam.learner.' + tid, JSON.stringify(me)); }, [o.tid, me]);
    await p.goto(base + `learner.html?t=${o.tid}#home`); await p.waitForFunction(() => typeof LR !== 'undefined' && LR.site, null, { timeout: 10000 });
    if (!me) { await p.evaluate(async c => { await LR.api.login(c.sid, c.code); lrender(); }, o.code); await p.waitForTimeout(300);
      for (let i = 0; i < 2; i++) { await p.evaluate(() => { location.hash = '#my'; }); await p.waitForTimeout(400); if (await p.evaluate(() => location.hash === '#consent' && !!document.querySelector('#lcConsent'))) { await p.check('#lcConsent [data-cn=all]'); await p.click('#lcConsent button[type=submit]'); await p.waitForTimeout(500); } } }
    await p.evaluate(() => { document.head.insertAdjacentHTML('beforeend', '<style>.ltoast{display:none!important}</style>'); }); return { ctx, p }; };
  const go = (p, h) => p.evaluate(h => { location.hash = h; }, h).then(() => p.waitForTimeout(350));
  const over = p => p.evaluate(() => { const A = []; document.querySelectorAll('#lm *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.right > innerWidth + 1 && !el.closest('.lq-month')) A.push(el.className || el.tagName); }); return { sx: document.documentElement.scrollWidth > innerWidth + 1, A: A.slice(0, 3) }; });

  try {
    for (const type of ['univ', 'k12', 'corp', 'adult']) {
      const o = await mkOrg(type);
      for (const mode of ['app', 'web']) for (const w of [1280, 390]) {
        const tag = `[${type} ${mode} ${w}]`; const { ctx, p } = await learner(o, mode, w);
        ok(await p.evaluate(m => document.body.classList.contains('lapp') === (m === 'app'), mode), `${tag} 화면 모드`);
        /* 진입 */
        if (mode === 'app') { await p.evaluate(() => { LR.lp.tutor = { ...(LR.lp.tutor || {}), persona: { k: 'warm', n: '하루쌤', at: new Date().toISOString() } }; LR.api.save(); }); await go(p, '#home'); ok(await p.locator('#lm a.lq-hc[href="#cal"]').count() === 1, `${tag} 앱 홈: 학습 캘린더 카드`); if (w === 390) await shot(p, `${type}_app_home_${w}`);
          await go(p, '#acct'); ok(await p.locator('#lm .ls-list a[href="#cal"]').count() === 1, `${tag} 「나」 목록: 학습 캘린더`); }
        else { ok(await p.locator('header.lh nav.ln a[href="#cal"]').count() >= 1, `${tag} 웹 머리 메뉴: 캘린더`); await go(p, '#my'); ok(await p.locator('#lm a.lq-hc[href="#cal"]').count() === 1, `${tag} 마이페이지: 학습 캘린더 카드`); }
        await go(p, '#cal'); await p.waitForTimeout(150);
        const E = await p.evaluate(() => lcalEvents().map(e => ({ k: e.k, t: e.title, src: e.src, id: e.id, date: e.date, iid: e.iid || '', cls: e.cls || '' })));
        const ks = [...new Set(E.map(e => e.k))];
        ok(ks.includes('시작') && ks.includes('종료') && E.filter(e => e.src === 'auto').length >= 3, `${tag} 과정 일정 자동 표시 — ${ks.join(' · ')}`);
        if (type === 'univ') ok(ks.includes('주차'), `${tag} 대학: 주차 수업`);
        ok(E.some(e => e.t === '기관 공개 일정' && e.src === 'org') && E.some(e => e.t === '과정 특강 안내') && !E.some(e => /내부 운영 회의|다른 과정 일정/.test(e.t)), `${tag} 기관 일정: 공개 · 내 과정만`);
        ok(await p.locator('#lm .lq-sum .lq-r').count() >= 1, `${tag} 오늘 · 이번 주 요약`);
        const ov = await over(p); ok(!ov.sx && !ov.A.length, `${tag} 가로 넘침 없음 ${ov.A.join(',')}`);
        if (w === 1280 || mode === 'app') await shot(p, `${type}_${mode}_cal_${w}`);
        if (mode === 'app' && w === 390 || mode === 'web' && w === 1280) {
          /* 월 · 주 · 목록 */
          for (const v of ['month', 'week', 'list']) { await p.click(`#lm .lq-seg [data-v="${v}"]`); await p.waitForTimeout(200); const sel = { month: '.lq-month .lq-day[data-lcday]', week: '.lq-week .lq-wc', list: '.lq-list, .lq-none.big' }[v]; ok(await p.locator('#lm ' + sel).count() >= 1, `${tag} ${v} 보기`); if (v !== 'list' && type === 'univ') await shot(p, `${type}_${mode}_${v}_${w}`); }
          await p.click('#lm .lq-seg [data-v="month"]'); await p.waitForTimeout(200);
          /* 과정 일정 상세 → 바로 가기 */
          const ym = await p.evaluate(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; });
          const cand = E.filter(e => e.src === 'auto' && e.date.startsWith(ym)); const a = cand.find(e => e.iid) || cand[0];
          await p.locator(`#lm .lq-month [data-lcal="ev"][data-v="${a.id}"]`).first().click();
          await p.waitForTimeout(200); const det = await p.evaluate(() => { const d = document.getElementById('lcalDlg'); return d ? { t: d.querySelector('h2').textContent, html: d.innerHTML.slice(0, 500), go: [...d.querySelectorAll('a[href^="#c/"]')].map(x => x.getAttribute('href')) } : null; });
          ok(det && det.go.length >= 1 && det.go.some(h => h.includes(a.cls)), `${tag} 일정 상세 · 바로 가기 ${det ? det.go.join(' ') : '없음'}${det && !det.go.length ? det.t + ' ' + JSON.stringify(a) + det.html : ''}`); await shot(p, `${type}_${mode}_detail_${w}`);
          if (!det || !det.go.length) await p.evaluate(() => { const d = document.getElementById('lcalDlg'); if (d) d.remove(); });
          if (det && det.go.length) { await p.click('#lcalDlg a[href^="#c/"] >> nth=0'); await p.waitForTimeout(400); ok(await p.evaluate(() => route().a === 'c' && !document.getElementById('lcalDlg')), `${tag} 바로 가기 → 강의 화면`); await go(p, '#cal'); }
          /* 날짜 클릭 → 그날 창 → 내 일정 추가 */
          const d0 = await p.evaluate(() => { const t = new Date(); t.setDate(t.getDate() + 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; });
          await p.evaluate(d => { LR._lcd = d; }, d0); const cell = p.locator(`#lm .lq-day[data-lcday="${d0}"] .lq-dn`); if (await cell.count()) await cell.click(); else await p.click('#lm .lq-seg [data-v="list"]').then(() => p.click(`#lm [data-lcal="day"]`));
          await p.waitForTimeout(200); ok(await p.locator('#lcalDlg [data-lcal="add"]').count() === 1, `${tag} 날짜 클릭 → 그날 창 + [이 날 내 일정 추가]`);
          await p.click('#lcalDlg [data-lcal="add"]'); await p.waitForTimeout(150); await p.fill('#lcalF [name=t]', '스터디 모임'); await p.fill('#lcalF [name=d]', d0); await p.fill('#lcalF [name=s]', '19:00'); await p.fill('#lcalF [name=e]', '18:00'); await p.click('#lcalDlg button[type=submit]'); await p.waitForTimeout(150);
          ok(await p.evaluate(() => /끝나는 시간/.test((document.getElementById('lcalErr') || {}).textContent || '')), `${tag} 시간 검사(끝 < 시작)`);
          await p.fill('#lcalF [name=e]', '21:00'); if (w === 390) await shot(p, `${type}_${mode}_add_${w}`); await p.click('#lcalDlg button[type=submit]'); await p.waitForTimeout(300);
          ok(await p.evaluate(d => lcalEvents().some(e => e.src === 'me' && e.title === '스터디 모임' && e.date === d && e.time === '19:00'), d0), `${tag} 내 일정 추가`);
          await p.reload(); await p.waitForFunction(() => typeof LR !== 'undefined' && LR.site); await p.waitForTimeout(400);
          ok(await p.evaluate(() => lcalEvents().some(e => e.src === 'me' && e.title === '스터디 모임')), `${tag} 새로 고침 뒤에도 내 일정(이 기기 저장)`);
          ok(await p.evaluate(() => !JSON.stringify(LR.lp).includes('스터디 모임')), `${tag} 내 일정은 서버 학습 기록(lp)에 싣지 않음`);
          /* 수정 · 삭제 */
          const uid = await p.evaluate(() => lcalEvents().find(e => e.title === '스터디 모임').id);
          await p.evaluate(id => { document.querySelector('[data-lcal="send"]'); const b = document.createElement('button'); b.dataset.lcal = 'ev'; b.dataset.v = id; document.body.appendChild(b); b.click(); b.remove(); }, uid); await p.waitForTimeout(150);
          await p.fill('#lcalF [name=t]', '스터디 모임(변경)'); await p.click('#lcalDlg button[type=submit]'); await p.waitForTimeout(250);
          ok(await p.evaluate(() => lcalEvents().some(e => e.title === '스터디 모임(변경)')), `${tag} 내 일정 수정`);
          await p.evaluate(id => { const b = document.createElement('button'); b.dataset.lcal = 'ev'; b.dataset.v = id; document.body.appendChild(b); b.click(); b.remove(); }, uid); await p.waitForTimeout(150);
          await p.click('#lcalDlg [data-lcal="del"]'); await p.click('#lcalDlg [data-lcal="del"]'); await p.waitForTimeout(250);
          ok(await p.evaluate(() => !lcalEvents().some(e => /스터디 모임/.test(e.title))), `${tag} 내 일정 삭제(두 번 눌러 확인)`);
          /* 내 캘린더로 보내기 */
          await p.click('#lm [data-lcal="send"]'); await p.waitForTimeout(150); ok(await p.locator('#lcalDlg [data-lcal="ics"]').count() === 1 && await p.locator('#lcalDlg a[href="#connect"]').count() === 1, `${tag} 내 캘린더로 보내기: .ics · 리마인더`); if (w === 390 || mode === 'web') await shot(p, `${type}_${mode}_send_${w}`);
          const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('#lcalDlg [data-lcal="ics"]')]);
          const txt = await p.evaluate(() => lcalICS()); ok(!!dl && /BEGIN:VCALENDAR/.test(txt) && /기관 공개 일정/.test(txt) && (txt.match(/BEGIN:VEVENT/g) || []).length >= 3, `${tag} .ics 받기(일정 ${(txt.match(/BEGIN:VEVENT/g) || []).length}개)`);
          if (mode === 'web') { await go(p, '#connect'); ok(await p.locator('#lm .lai-more, #lm .lai-sec').count() >= 1, `${tag} 웹 #connect: 연결 · 리마인더 카드`); await shot(p, `${type}_web_connect_${w}`); }
        }
        await ctx.close();
      }
      /* 학원 보호자 */
      if (type === 'k12') for (const mode of ['app', 'web']) for (const w of [1280, 390]) { const tag = `[k12 보호자 ${mode} ${w}]`;
        const { ctx, p } = await learner(o, mode, w, { sid: 'pT0001', id: 'pT0001', kind: 'parent', acct: 'code', nick: '수학맘', grade: '정회원' });
        await go(p, '#home'); ok(await p.locator('#lm a.lq-hc[href="#cal"]').count() === 1, `${tag} 보호자 홈: 자녀 일정 카드`); if (w === 390) await shot(p, `k12_parent_${mode}_home_${w}`);
        await go(p, '#cal'); const r = await p.evaluate(() => ({ E: lcalEvents(), h: document.title, add: !!document.querySelector('#lm [data-lcal="add"]') }));
        ok(r.E.some(e => e.who && e.src === 'auto') && /자녀 일정/.test(r.h), `${tag} 자녀 일정(자녀 이름 표시 ${r.E.filter(e => e.who).length}개)`);
        ok(!r.add, `${tag} 보호자: 내 일정 추가 버튼 없음`); const ov = await over(p); ok(!ov.sx && !ov.A.length, `${tag} 가로 넘침 없음`); await shot(p, `k12_parent_${mode}_cal_${w}`); await ctx.close(); }
      await o.ctx.close();
    }
  } catch (e) { console.error(e); fails++; }
  ok(!errs.length, '페이지 오류 0' + (errs.length ? ' — ' + errs.slice(0, 4).join(' | ') : ''));
  await br.close(); srv.close(); console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과'); process.exit(fails ? 1 : 0);
})();
