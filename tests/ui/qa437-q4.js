'use strict';
/* v43.7 QA 요원 Q4 — 학습자 앱(390) · 학습자 웹(1280) 레이아웃 회귀
   검사: ① 가로 넘침 ② 부모 밖으로 나간 자식 ③ 가려진 버튼(고정 머리 · 탭바 · AI 버튼이 덮는 것 포함) ⑤ 누르는 칸(휴대폰 32px 미만 — ::after로 넓힌 누르는 칸 포함, 44px 기준은 사람 눈 점검표 Q4-FINDINGS)
   + 이번에 고친 것: AI 튜터 대화 화면 높이 · 떠 있는 버튼 숨김, 수치 칸 0 표시, 알림함 줄 글자 크기, 대학 「나」 바로 가기
   사용: node tests/ui/qa437-q4.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
/* 화면 안에서 도는 검사(①②③⑤). 의도된 가장자리 흘림 줄(가로 스크롤 칩 줄: margin 0 -16px)은 부모가 아니라 자기 스크롤이라 ②에서 뺀다 */
const CHECK = () => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); if (!(r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0)) return false; if (e.closest('details:not([open]) > :not(summary)')) return false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const q = getComputedStyle(a); if (+q.opacity === 0 || q.visibility === 'hidden') return false; } return true; };
  const sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '');
  const fx = x => { for (let a = x; a && a !== document.body; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === 'fixed' || p === 'sticky') return a; } return null; };
  const scx = x => { for (let a = x.parentElement; a && a !== document.body; a = a.parentElement) { if (/auto|scroll/.test(getComputedStyle(a).overflowX) && a.scrollWidth > a.clientWidth) return a; } return null; };
  const host = document.querySelector('#lapp') || document.body; const R = { ov: document.documentElement.scrollWidth - innerWidth, out: [], hid: [], small: [] };
  for (const e of host.querySelectorAll('section, article, .card, [class*="card"], [class*="-c"], li, a, button')) {
    if (!vis(e)) continue; const s = getComputedStyle(e); if (s.position === 'absolute' || s.position === 'fixed' || s.display === 'inline') continue; if (/auto|scroll/.test(s.overflowX)) continue; const p = e.parentElement; if (!p) continue; const ps = getComputedStyle(p);
    if (/auto|scroll|hidden|clip/.test(ps.overflowX) || /inline|contents/.test(ps.display)) continue; const r = e.getBoundingClientRect(), pr = p.getBoundingClientRect(); const lim = pr.right - parseFloat(ps.paddingRight) - parseFloat(ps.borderRightWidth);
    if (r.right > lim + 1.5 && r.right > innerWidth - 1 && r.width > 24) R.out.push(`${sel(e)} +${Math.round(r.right - lim)}px`);
  }
  for (const e of [...host.querySelectorAll('button, [data-lact], a[href], summary')].filter(vis)) {
    const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const clip = (() => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { if (getComputedStyle(a).overflow !== 'visible') { const q = a.getBoundingClientRect(); if (cx < q.left || cx > q.right || cy < q.top || cy > q.bottom) return true; } } return false; })(); /* 안쪽 스크롤 칸(대화 목록 등) 밖으로 밀려 잘린 것은 「가려짐」이 아니다 */
    if (!clip && cy > 2 && cy < innerHeight - 2 && cx > 2 && cx < innerWidth - 2) { const h = document.elementFromPoint(cx, cy); if (h && h !== e && !e.contains(h) && !h.contains(e) && !(fx(h) && fx(h) !== fx(e)) && !(h.closest('label') && h.closest('label').contains(e))) R.hid.push(`${sel(e)}「${(e.innerText || '').trim().slice(0, 16)}」 ← ${sel(h)}`); }
    if ((r.right > innerWidth + 1 || r.left < -1) && !scx(e)) R.hid.push(`${sel(e)} 화면 밖`);
    if (innerWidth < 500 && !(getComputedStyle(e).display === 'inline' && e.tagName === 'A') && r.height + Math.max(0, -2 * (parseFloat(getComputedStyle(e, '::after').top) || 0)) * (getComputedStyle(e, '::after').position === 'absolute' ? 1 : 0) < 32) R.small.push(`${sel(e)}「${(e.innerText || '').trim().slice(0, 16)}」 ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  /* 떠 있는 AI 튜터 버튼이 덮는 버튼 */
  const fab = document.getElementById('tbFab'); if (fab && vis(fab)) { const f = fab.getBoundingClientRect(); for (const e of [...host.querySelectorAll('button, a[href]')].filter(vis)) { if (fx(e)) continue; const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx > f.left && cx < f.right && cy > f.top && cy < f.bottom) R.hid.push(`${sel(e)} ← AI 튜터 버튼`); } }
  return R;
};
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const open = async (demo, sid, app) => { const ctx = await br.newContext({ viewport: { width: app ? 390 : 1280, height: app ? 844 : 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(([sid, app]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); if (app) localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, [sid, app]);
    await p.goto(`${base}/learner.html?demo=${demo}${app ? '&app=1' : ''}#home`); await p.waitForTimeout(1200); return { ctx, p, errs }; };
  const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(550); };
  const sweep = async (p, tag, hashes) => { for (const h of hashes) { await go(p, h); const acc = { ov: 0, out: new Set(), hid: new Set(), small: new Set() };
      for (const y of [0, 0.5, 1]) { await p.evaluate(y => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * y), y); await p.waitForTimeout(650); /* 스크롤 뒤 AI 버튼이 다시 보일 때까지 */ const R = await p.evaluate(CHECK); acc.ov = Math.max(acc.ov, R.ov); R.out.forEach(x => acc.out.add(x)); R.hid.forEach(x => acc.hid.add(x)); R.small.forEach(x => acc.small.add(x)); }
      ok(acc.ov <= 0, `${tag} ${h}: 가로 넘침 ${acc.ov}px`); ok(!acc.out.size, `${tag} ${h}: 부모 밖 ${[...acc.out].slice(0, 3).join(' · ')}`); ok(!acc.hid.size, `${tag} ${h}: 가려진 버튼 ${[...acc.hid].slice(0, 3).join(' · ')}`); ok(!acc.small.size, `${tag} ${h}: 누르는 칸 32px 미만 ${[...acc.small].slice(0, 3).join(' · ')}`); } };
  const APP = ['#home', '#notes', '#notes/review', '#notes/out', '#connect', '#my', '#courses', '#cal', '#inbox', '#msg', '#notice', '#comm', '#badges', '#acct', '#ai'];
  const WEB = ['#home', '#notes', '#connect', '#my', '#courses', '#cal', '#inbox', '#msg', '#notice', '#acct'];

  /* 대학(대표님 캡처 기관 유형) — 앱 390 */
  { const { ctx, p, errs } = await open('1', '20260001', 1); await sweep(p, '대학 앱', APP);
    await go(p, '#ai'); await p.evaluate(() => window.scrollTo(0, 0));
    ok(await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'AI 튜터 대화 화면: 문서가 화면보다 길지 않음(끝까지 밀어도 입력 칸이 가운데로 올라오지 않음)');
    ok(await p.evaluate(() => { const b = document.getElementById('tbFab'); return !b || +getComputedStyle(b).opacity === 0 || getComputedStyle(b).pointerEvents === 'none'; }), 'AI 튜터 대화 화면: 떠 있는 튜터 버튼 숨김');
    ok(await p.evaluate(() => !/카카오톡/.test((document.querySelector('.ap-conn small') || {}).textContent || '')), '대학 AI 홈 연결 카드: 카카오톡 문구 없음');
    await go(p, '#inbox'); ok(await p.evaluate(() => { const a = document.querySelector('.la-inbox li.new .la-n b'), b = document.querySelector('.la-inbox li:not(.new) .la-n b'); return !a || !b || getComputedStyle(a).fontSize === getComputedStyle(b).fontSize; }), '알림함: 안 읽은 줄 · 읽은 줄 제목 크기 같음');
    ok(await p.evaluate(() => ![...document.querySelectorAll('.tb-phk b')].some(b => /^0\s?(개|건|원|%)$|^0\//.test(b.textContent.trim()))), '알림함 수치 칸: 0 숫자 대신 말(없음)');
    await go(p, '#acct'); ok(await p.evaluate(() => ![...document.querySelectorAll('.tb-phk b')].some(b => /^0/.test(b.textContent.trim()))), '나: 수치 칸 0 숫자 없음');
    await go(p, '#connect'); ok(await p.evaluate(() => !/^0개/.test(((document.querySelector('.lcx-n') || {}).textContent || '').trim())), '연결: 「0개 켜짐」 대신 문장');
    await go(p, '#home'); ok(await p.evaluate(() => { const g = document.querySelector('.tb-links'); if (!g) return true; const n = g.children.length; return getComputedStyle(g).gridTemplateColumns.split(' ').length === Math.min(4, n === 3 ? 3 : 4); }), '홈 바로가기: 3개면 3칸(빈 칸 없음)');
    ok(!errs.length, '대학 앱 오류 없음 ' + errs.join(' | ')); await ctx.close(); }
  /* 대학 — 웹 1280 */
  { const { ctx, p, errs } = await open('1', '20260001', 0); await sweep(p, '대학 웹', WEB);
    await go(p, '#acct'); ok(await p.evaluate(() => !document.querySelector('.ac43q a[href="#mypay"]')), '대학 웹 「나」: 결제 관리 바로 가기 없음(결제를 쓰지 않는 기관)');
    await go(p, '#home'); ok(await p.evaluate(() => { const w = document.querySelector('.lhb-in > .lna-hubw:first-child'), h = document.querySelector('.lhb-hero'); return !w || !h || w.getBoundingClientRect().top - h.getBoundingClientRect().bottom >= 16; }), '웹 학습 허브: 노트 카드와 머리 띠 사이 여백');
    ok(!errs.length, '대학 웹 오류 없음 ' + errs.join(' | ')); await ctx.close(); }
  /* 학원 · 공단 — 앱 390 */
  for (const [demo, sid, nm] of [['adult', '20269000', '학원'], ['sports', '20269001', '공단']]) { const { ctx, p, errs } = await open(demo, sid, 1); await sweep(p, nm + ' 앱', APP);
    if (demo === 'sports') { await go(p, '#ai'); ok(await p.evaluate(() => /문자/.test((document.querySelector('.ap-conn small') || {}).textContent || '') && !/카카오톡/.test(document.querySelector('.ap-conn small').textContent)), '공단 AI 홈 연결 카드: 문자 알림(카카오톡 아님)'); }
    if (demo === 'adult') { await go(p, '#acct'); }
    ok(!errs.length, `${nm} 앱 오류 없음 ` + errs.join(' | ')); await ctx.close(); }
  { const { ctx, p, errs } = await open('adult', '20269000', 0); await sweep(p, '학원 웹', WEB); await go(p, '#acct'); ok(await p.evaluate(() => !!document.querySelector('.ac43q a[href="#mypay"]') || !document.querySelector('.ac43q')), '학원 웹 「나」: 결제 관리 바로 가기 유지'); ok(!errs.length, '학원 웹 오류 없음'); await ctx.close(); }

  await br.close(); srv.close(); console.log(`qa437-q4: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
