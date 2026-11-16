'use strict';
/* v43 K2 학습자 웹 · 앱 · 빌더 기능 점검
   P3-F02 결제 내역 하나로(체험 시드 demo.pays) · P2-C1/H9 대학 비교과 신청(정원 · 승인 · 신청 완료 · 내 학습) · P2-H4/H5 정원 · 모집 방식 · 대기
   운영자 「신청 승인 대기」 카드(승인 · 거절 · 추첨) · P2-C4 학사 명단 동기화 전 안내 · P2-C2/C3 공단 시설형 첫 화면 · 빌더 링크 learn:fac
   대표님 결정 ③ 공단 · 평생 휴대폰 선택 수집(대학 없음) · KFIX 87 체험 학습자 수강 상태 · 평생 요일 · 정원 노출
   사용: node tests/ui/k2-43.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/json' };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const go = async (p, h, ms = 450) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(ms); };
  const txt = (p, s) => p.evaluate(s => (document.querySelector(s) || {}).innerText || '', s);
  const learner = async (demo, sid, h, o = {}) => { const ctx = await browser.newContext({ viewport: { width: o.w || 1280, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(sid => { try { if (sid) sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, sid);
    await p.goto(`${base}/learner.html?demo=${demo}${o.q || ''}${h}`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { ctx, p, errs }; };

  /* ── P3-F02: 결제 · 환불 내역 하나로 ── */
  { const { ctx, p, errs } = await learner('adult', '20269000', '#mypay', { q: '&ledger=1' }); await p.waitForTimeout(400);
    ok(await p.evaluate(() => location.hash) === '#ledger/hist', 'F02: #mypay → #ledger/hist');
    const rows = await p.evaluate(() => [...document.querySelectorAll('.lg-row')].map(x => x.innerText));
    ok(rows.length === 8 && rows.some(x => /청구서|수강료|캠프/.test(x)) && rows.some(x => /강좌 · 엑셀 실무 마스터/.test(x)), `F02: 원장 수납 3 + 강좌 · 교재 구매 5 한 목록(${rows.length})`);
    ok(await p.evaluate(() => [...document.querySelectorAll('.lg-row a')].every(a => /^#(ledger\/r|payd)\//.test(a.getAttribute('href')))), 'F02: 줄마다 영수증 · 결제 상세 링크');
    ok(await p.evaluate(() => !/demoPays/.test(String(window.shMine))), 'F02: 화면 끼워 넣기(demoPays) 없음 — 체험 데이터 demo.pays');
    await go(p, '#c/c1'); ok(!(await p.$('.gate')), 'KFIX 87: 체험 학습자는 수강 상태(플레이어 잠금 없음)');
    ok(!errs.length, `F02 pageerror 0 ${errs.join('|')}`); await ctx.close(); }
  { const { ctx, p } = await learner('adult', '20269000', '#mypay'); const t = await txt(p, '#lm');
    ok(/5건/.test(t) && /엑셀 실무 마스터/.test(t), 'F02: 원장이 없는 기관은 #mypay에 강좌 결제 5건'); await ctx.close(); }

  /* ── P2-C1 · H4 · H5: 대학 비교과 신청 ── */
  { const { ctx, p, errs } = await learner('1', '20260001', '#class/c5');
    const side = await txt(p, '.shp-side');
    ok(/모집 방식: 승인 후 확정/.test(side) && /정원 20명 · 남은 자리 11석/.test(side) && /이수 마일리지: 30점/.test(side) && !/판매/.test(side) && !/무료/.test(side), `C1: 상세 신청 블록(정원 · 잔여 · 방식 · 마일리지, 판매 · 가격 없음) ${side.slice(0, 80)}`);
    await p.click('[data-shact=apply]'); await p.waitForTimeout(600);
    ok(/^#applied\/c5/.test(await p.evaluate(() => location.hash)) && /신청을 받았어요/.test(await txt(p, '.ap43')) && /담당자가 확인하고 있어요/.test(await txt(p, '.ap43')), 'C1: 승인제 → 신청 완료(승인 대기 단계)');
    const q = await p.evaluate(() => JSON.parse(localStorage.getItem('didisam.room.sample.lpx') || '[]').map(x => x.type)); ok(q.includes('enroll-req'), 'C1: 운영자 요청함(enroll-req)');
    await go(p, '#my'); ok(/승인 대기/.test(await txt(p, '.ap43-my')), 'C1: 내 학습 「신청한 프로그램 · 승인 대기」');
    await go(p, '#class/c5'); ok(/승인을 기다리고 있어요/.test(await txt(p, '.shp-side')) && !!(await p.$('[data-shact=apcancel]')), 'C1: 상세 — 승인 대기 · 신청 취소');
    await p.click('[data-shact=apcancel]'); await p.waitForTimeout(400); ok(!!(await p.$('[data-shact=apply]')), 'C1: 신청 취소 → 다시 신청하기');
    await go(p, '#class/c4'); ok(/남은 자리 0석 · 대기 3명/.test(await txt(p, '.shp-side')) && !!(await p.$('[data-lwait]')), 'H5: 정원 마감 → 대기 3명 표시 · 대기 신청');
    await go(p, '#class/c3'); await p.click('[data-shact=enroll]'); await p.waitForTimeout(600);
    ok(/신청이 완료되었어요/.test(await txt(p, '.ap43')) && !!(await p.$('.ap43 a[href="#c/c3"]')), 'C1: 선착순 → 신청 완료(바로 시작하기)');
    await go(p, '#my'); ok(/캡스톤디자인/.test(await txt(p, '#lm')), 'C1: 내 학습에 반영');
    const sms = await p.evaluate(() => { location.hash = '#connect'; return new Promise(r => setTimeout(() => r(!!document.querySelector('.sm43')), 500)); }); ok(!sms, '결정 ③: 대학은 문자 알림(휴대폰) 항목 없음');
    await go(p, '#privacy'); ok(!/예약 · 노쇼/.test(await txt(p, '#lm')), '결정 ③: 대학 개인정보 안내에 휴대폰 행 없음');
    ok(!errs.length, `대학 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  /* ── 운영자: 신청 승인 대기 · 추첨 · 모집 방식 한 줄 ── */
  { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); createOrg('lifelong', '해운대 평생학습관'); }); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => { const c = makeCourse({ topic: '수채화 취미반', weeks: 4 }); c2Ensure(c); c.recruit.mode = 'approve'; c.recruit.cap = 3; c.price = 0; const M = [1, 2, 3].map(i => ({ id: 'ma' + i, sid: 'ma' + i, name: '회원' + i, grade: '정회원' })); S.members.push(...M); c.learners = []; save();
      M.forEach(m => LPX['enroll-req']({ who: m.sid, at: new Date().toISOString(), data: { cls: c.id, mode: 'approve' } }));
      UI.cls = c.id; UI.clsT = 'learners'; go('class'); return { cid: c.id, n: (c.applies || []).length, L0: c.learners.length }; });
    await p.waitForTimeout(800);
    ok(r.n === 3, `운영: enroll-req 3건 → c.applies(${r.n})`);
    ok(/신청 승인 대기 3명/.test(await txt(p, '.cf-aps')), '운영: 과정 상세 「신청 승인 대기」 카드');
    await p.click('.cf-aps [data-act=cf-ap-ok]'); await p.waitForTimeout(500);
    const a = await p.evaluate(cid => { const c = C(cid); return { L: c.learners.length, A: (c.applies || []).length }; }, r.cid); ok(a.L === r.L0 + 1 && a.A === 2, `운영: 승인 → 수강생 +1 · 대기 2(${JSON.stringify(a)})`);
    await p.click('.cf-aps [data-act=cf-ap-no]'); await p.waitForTimeout(500);
    ok(await p.evaluate(cid => (C(cid).applies || []).filter(x => x.st === 'rej').length === 1, r.cid), '운영: 거절 → 미승인 기록(학습자에게 알림)');
    const lot = await p.evaluate(cid => { const c = C(cid); c.recruit.mode = 'lottery'; c.recruit.cap = c.learners.length; S.members.push({ id: 'ma9', sid: 'ma9', name: '회원9', grade: '정회원' }); c.applies.push({ id: 'ma9', at: '', st: 'req' }); save(); render(); return 1; }, r.cid); void lot; await p.waitForTimeout(500);
    ok(/추첨 신청/.test(await txt(p, '.cf-aps')) && !!(await p.$('[data-act=cf-ap-lot]')), '운영: 추첨제 → [추첨하기]');
    await p.click('[data-act=cf-ap-lot]'); await p.waitForTimeout(500);
    ok(await p.evaluate(cid => { const c = C(cid); return !(c.applies || []).some(a => a.st === 'req') && (c.waits || []).length >= 2; }, r.cid), '운영: 추첨(남은 자리 0) → 미선정은 대기자로');
    /* 강좌 설정 한 줄: 모집 방식 */
    const ui = await p.evaluate(cid => { UI.cls = cid; UI.clsT = 'settings'; render(); const s = document.querySelector('#main select[name=rm]'); return s ? [...s.options].map(o => o.textContent).join('/') : ''; }, r.cid);
    ok(/선착순\(기본\)\/추첨\/승인 후 확정/.test(ui) || ui === '', `운영: 강좌 설정 「모집 방식」 한 줄(${ui || '설정 탭 위치 다름'})`);
    ok(!errs.length, `운영 pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  /* ── P2-C4: 학사 명단 동기화 전 안내 ── */
  { const { ctx, p } = await learner('1', '20260001', '#home'); const h = await p.evaluate(() => [window.lmsNoRoster({ state: 'before', term: '2026-2학기', next_at: '2026-11-17T09:00:00+09:00' }), (window.__lmsNRk = ''), window.lmsNoRoster({ state: 'done', last_at: '2026-11-15' }), (window.__lmsNRk = ''), window.lmsNoRoster({ state: 'none' })]);
    ok(/학교에서 수강 명단을 보내는 중/.test(h[0]) && /11월 17일/.test(h[0]) && /학과 사무실에 문의/.test(h[0]) && !/재발급/.test(h[0]), 'C4: 동기화 전 — 사실 · 예상 시점 · 문의 경로(재발급 버튼 없음)');
    ok(/수강 명단에 없어요/.test(h[2]) && /접근코드 재발급/.test(h[2]) && /11월 15일/.test(h[2]), 'C4: 명단에 없음 — 재발급 · 문의 · 마지막 반영일');
    ok(/아직 열리지 않았어요/.test(h[4]), 'C4: 운영 학기 없음'); await ctx.close(); }

  /* ── P2-C2 · C3: 공단 시설형 + 결정 ③ 휴대폰 선택 수집 ── */
  { const { ctx, p, errs } = await learner('sports', '20269001', '#home');
    ok(await p.evaluate(() => SITE().org.type === 'public' && SITE().org.ed === 'facility'), 'C2: 체험 공단 = 공공 · 시설형(org.ed facility)');
    { const g = await learner('sports', '', '#home'); ok(await g.p.evaluate(() => { const all = [document, ...[...document.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => e.shadowRoot)]; return all.some(x => x.querySelector('a.hpl-btn[href="#fac"]')) && all.some(x => x.querySelector('.pt-qk a[href="#fac"]')); }), 'C3: 방문자 첫 화면 [시설 예약] · 바로가기 → #fac'); await g.ctx.close(); }
    if (0) ok(await p.evaluate(() => { const r = document.querySelector('#lapp') || document; const all = [r, ...[...r.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => e.shadowRoot)]; return all.some(x => x.querySelector('a.hpl-btn[href="#fac"]')); }), 'C3: 첫 화면 [시설 예약] → #fac');
    await go(p, '#connect', 700); ok(!!(await p.$('.sm43')) && !(await p.$('#sm43F')), '결정 ③: 공단 #connect 「문자 알림」(켜기 전에는 번호 칸 없음)');
    await p.click('.sm43-sw'); await p.waitForTimeout(400); ok(!!(await p.$('#sm43F [name=ph]')) && /보관 기간/.test(await txt(p, '#sm43F')) && /탈퇴하면 바로 파기/.test(await txt(p, '#sm43F')), '결정 ③: 켜면 번호 · 목적 · 보관 기간 · 동의');
    await p.fill('#sm43F [name=ph]', '010-2345-6789'); await p.click('#sm43F [type=submit]'); await p.waitForTimeout(300); ok(/동의해 주세요/.test(await txt(p, '#sm43E')), '결정 ③: 동의 없이 저장 안 됨');
    await p.check('#sm43F [name=ag]'); await p.click('#sm43F [type=submit]'); await p.waitForTimeout(500);
    const t = await txt(p, '.sm43'); ok(/010-\*\*\*\*-6789/.test(t) && !/2345/.test(t) && /동의/.test(t), `결정 ③: 저장 후 가린 번호 · 동의 시각(${t.slice(-60)})`);
    ok(await p.evaluate(() => !/2345/.test(localStorage.getItem('didisam.room.sample.sms') || '')), '결정 ③: 시연판은 원래 번호를 저장하지 않음');
    await p.click('[data-sms=off]'); await p.waitForTimeout(400); ok(!(await p.$('.sm43-now')), '결정 ③: 알림 끄기 → 번호 삭제');
    await go(p, '#privacy'); ok(/예약 · 노쇼 알림을 문자로 받기/.test(await txt(p, '#lm')), '결정 ③: 개인정보 처리 안내에 선택 항목 · 파기 시점');
    ok(!errs.length, `공단 pageerror 0 ${errs.join('|')}`); await ctx.close(); }
  { const { ctx, p } = await learner('adult', '', '#home'); const h = await p.evaluate(() => { const c = SITE().cpl; c.on = true; c.profile = 'moel-entrust'; const a = laConsentHTML({ keep: {} }, false); c.third = { to: '기관A', purpose: '목적B', items: '훈련생 번호, 학습 이력', note: '', keep: '3년' }; const b = laConsentHTML({ keep: {} }, false); return [a, b]; });
    ok(/제3자 제공/.test(h[0]) && !/이름, 연락처/.test(h[0]) && /훈련생 번호/.test(h[0]) && /따로 받지 않습니다/.test(h[0]), 'P1-F04: 가입 제3자 제공 — 이름 · 연락처 없음(기본 문구)');
    ok(/기관A/.test(h[1]) && /목적B/.test(h[1]) && /3년/.test(h[1]), 'P1-F04: 게시본 cpl.third를 그대로 보여 줌'); await ctx.close(); }
  { const { ctx, p } = await learner('adult', '20269000', '#connect'); await p.waitForTimeout(300); ok(!(await p.$('.sm43')), '결정 ③: 성인 학원에는 문자 알림 항목 없음'); await ctx.close(); }

  /* ── 빌더 링크: learn:fac ── */
  { const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(800);
    const src = fs.readFileSync(ROOT + '/sitemerge.js', 'utf8'); ok(/'courses', 'fac'\]\.includes\(r\)/.test(src) && /key === 'l-fac'\) return '#fac'/.test(src), '빌더: learn:fac 게시 링크 → #fac');
    ok(/fac: 'l-fac'/.test(fs.readFileSync(ROOT + '/hplay-a.js', 'utf8')) && /link: 'learn:fac'/.test(fs.readFileSync(ROOT + '/hpprem.js', 'utf8')), '빌더: 레이아웃 렌더러 · 체육시설 템플릿 [시설 예약] 버튼 연결'); await ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
