'use strict';
/* v43.7 QA Q2(홈 · 수업) 회귀 점검 — 대표님 캡처 5(홈 › 현황 휴대폰)와 Q2 전수 점검에서 찾은 레이아웃 · 누르기 문제
   검사: ① 가로 넘침 ② 부모 밖으로 나간 자식 ③ 가려진 버튼(위 · 가운데 · 끝 스크롤) ⑤ 누르는 칸 높이 + 화면별 회귀
   사용: node tests/ui/qa437-q2.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json', '.webp': 'image/webp' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };

/* 브라우저 안 점검 함수. 공통 셸(Q1) 몫으로 넘긴 항목은 제외 목록(EXC)에 두고 이유를 적는다. */
const PROBE = () => {
  const EXC = [
    /circle|svg/, // 차트 점이 svg 밖으로 반쯤 나오는 것은 의도(도넛 · 스파크라인 끝점)
    /l43-pg|l43-kc/, // 공통 표 진도 막대 · KPI 칸(l43.js) — Q1 몫
    /certpv|a2cert/, // 수료증 실물(760px 고정 레이아웃)을 미리보기에서 축소 — 바깥 상자(.ck-bigpv) 기준은 아래 별도 검사
    /small\.mini「[월화수목금토일]」/ // 요일 표 칸의 작은 요일 글자(표 가로 스크롤 안)
  ];
  const hiddenIn = e => e.closest('details:not([open])') && !e.closest('summary');
  const vis = e => { if (hiddenIn(e)) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0; };
  const nm = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + '「' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14) + '」';
  const scrollX = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const main = document.querySelector('#main'); const all = [...main.querySelectorAll('*')].filter(vis);
  const out = []; all.forEach(e => { const p = e.parentElement; if (!p) return; const s = getComputedStyle(e); if (/absolute|fixed/.test(s.position)) return; const ps = getComputedStyle(p); if (/contents|inline/.test(ps.display)) return;
    const pr = p.getBoundingClientRect(), r = e.getBoundingClientRect(); const R = pr.right - parseFloat(ps.paddingRight) - parseFloat(ps.borderRightWidth), L = pr.left + parseFloat(ps.paddingLeft) + parseFloat(ps.borderLeftWidth);
    if ((r.right > R + 1.5 || r.left < L - 1.5) && !scrollX(e) && parseFloat(s.marginLeft) >= 0 && parseFloat(s.marginRight) >= 0) { const t = nm(e) + ' ⊄ ' + nm(p); if (!EXC.some(x => x.test(t))) out.push(t); } });
  const small = all.filter(e => e.matches('button, [role=tab]') && !e.closest('.d26-calg, .cx-month, .cx-week, table') && !e.matches('.k-sw, .sl-i')) // .k-sw: ::after로 누르는 칸 확장 · .sl-i: 공통 머리 i 버튼(Q1 몫)
    .filter(e => !scrollX(e) && e.getBoundingClientRect().height < 40).map(nm);
  return { hov: document.documentElement.scrollWidth - innerWidth, out: [...new Set(out)], small };
};
const OCCL = () => { const res = []; const main = document.querySelector('#main');
  const clipped = (e, x, y) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.overflow !== 'visible') { const q = p.getBoundingClientRect(); if (x < q.left || x > q.right || y < q.top || y > q.bottom) return true; } } return false; };
  [...main.querySelectorAll('button, [data-act], a[href], select')].forEach(e => { if (e.closest('details:not([open])') && !e.closest('summary')) return; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight || x < 0 || x > innerWidth || clipped(e, x, y)) return;
    if (getComputedStyle(e).visibility === 'hidden') return; const h = document.elementFromPoint(x, y); if (!h || e.contains(h) || h.contains(e)) return;
    let f = h; while (f && f !== document.body && !/fixed|sticky/.test(getComputedStyle(f).position)) f = f.parentElement; if (f && f !== document.body) { const fr = f.getBoundingClientRect(); if (fr.top <= 2 && y < fr.bottom) return; if (f.id === 'fabBtn' || f.closest('#fab, .fab')) return; /* AI 버튼(FAB) 위치는 Q1 몫 */ }
    if (e.matches('.v4-blk')) return; /* 시설 간트 막대: 같은 시간 예약 두 건이 겹치는 시연 데이터(시설 · Q3) */
    res.push((e.textContent || '').trim().slice(0, 14) + ' ← ' + h.tagName + '.' + h.className); }); return res; };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const open = async (type, ed, w) => { const ctx = await br.newContext({ viewport: { width: w, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(() => { try { localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } }); /* 시연 데이터가 찬 상태(대표님 캡처와 같은 조건) */
    await p.goto(base + '/index.html'); await p.evaluate(async ([t, e]) => { createOrg(t, '점검 대학', e); await new Promise(o => setTimeout(o, 900)); }, [type, ed]); return { ctx, p, errs }; };
  const show = async (p, js) => { await p.evaluate(js); await p.waitForTimeout(250); await p.evaluate(() => scrollTo(0, 0)); };
  const generic = async (p, label) => { const r = await p.evaluate(PROBE); ok(r.hov <= 0, `${label}: 가로 넘침 ${r.hov}px`); ok(!r.out.length, `${label}: 부모 밖 자식 ${r.out.slice(0, 3).join(' | ')}`); ok(!r.small.length, `${label}: 누르는 칸 40px 미만 ${r.small.slice(0, 3).join(' | ')}`);
    const H = await p.evaluate(() => document.documentElement.scrollHeight); const oc = [];
    for (const y of [0, (H - 844) / 2, H]) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(60); oc.push(...await p.evaluate(OCCL)); }
    ok(!oc.length, `${label}: 가려진 버튼 ${[...new Set(oc)].slice(0, 3).join(' | ')}`); await p.evaluate(() => scrollTo(0, 0)); };
  const VIEWS = ['home', 'dash', 'class', 'clib', 'cert', 'calendar'];
  const CLS = ['learners', 'curriculum', 'eval', 'notice', 'set'];

  for (const [type, ed] of [['univ', 'lite'], ['univ', 'lms'], ['k12'], ['corp']]) {
    const lb = ed ? `${type}/${ed}` : type; const { ctx, p, errs } = await open(type, ed, 390);
    for (const v of VIEWS) { const has = await p.evaluate(v => !!VIEWS[v], v); if (!has) continue; await show(p, `go('${v}'); render();`); await generic(p, `${lb} 390 ${v}`); }
    for (const t of CLS) { await show(p, `UI.cls = (S.classes[0] || {}).id; UI.clsT = '${t}'; go('class'); render();`); await generic(p, `${lb} 390 수업 상세 ${t}`); }

    /* 대표님 캡처 5: 홈 › 현황 — 진도 % · 달력 카드가 카드 오른쪽 안쪽에 들어오는지 */
    await show(p, `go('dash'); render();`);
    ok(await p.evaluate(() => { const two = document.querySelector('.d26-two'); if (!two) return true; const r = two.getBoundingClientRect(); return [...two.querySelectorAll('.d26-calw, .d26-pr b')].every(e => e.getBoundingClientRect().right <= r.right + 1); }), `${lb}: 현황 진도 % · 달력이 카드 안`);
    ok(await p.evaluate(() => ![...document.querySelectorAll('.d26-pr b, .d26-top td')].some(e => /^0%$/.test(e.textContent.trim()))), `${lb}: 현황 진도 0%는 「시작 전」`);
    /* 일정: 휴대폰 목록 보기에서도 이번 달 일정 수를 원본으로 센다 · 회차 제목 겹침 없음 */
    await show(p, `go('calendar'); render();`);
    ok(await p.evaluate(() => { const n = cxEvents().filter(e => e.date.startsWith(today().slice(0, 7))).length; const kc = [...document.querySelectorAll('#main .da-k, #main .l43-g, #main .l43-kc')].find(d => /이번 달 일정/.test(d.textContent)); return !n || (kc && new RegExp(n + '건').test(kc.textContent)); }), `${lb}: 일정 KPI 「이번 달 일정」 = 원본 건수`);
    ok(await p.evaluate(() => !cxEvents().some(e => /(\d+)회차\s+\1회차/.test(e.title))), `${lb}: 「N회차 N회차」 겹침 없음`);
    /* 콘텐츠 라이브러리 검색창 이중 상자 · 수료증 큰 미리보기 폭 */
    if (await p.evaluate(() => !!VIEWS.clib)) { await show(p, `go('clib'); render();`); ok(await p.evaluate(() => { const i = document.querySelector('#clbQ'); if (!i) return true; const s = getComputedStyle(i); return parseFloat(s.paddingLeft) < 4 && s.borderTopWidth === '0px' && s.backgroundImage === 'none'; }), `${lb}: 콘텐츠 검색창 이중 상자 없음`); }
    if (await p.evaluate(() => !!VIEWS.cert)) { await show(p, `go('cert'); render();`); await p.waitForTimeout(120); ok(await p.evaluate(() => [...document.querySelectorAll('.ck-bigpv')].every(m => { const i = m.querySelector('.ck-big-in'); return !i || i.getBoundingClientRect().width <= m.getBoundingClientRect().width + 1; })), `${lb}: 수료증 큰 미리보기가 상자 폭 안`); }
    if (ed === 'lms') { await show(p, `go('lmsb'); render();`); ok(await p.evaluate(() => { const d = document.querySelector('details.lmsb-week.cur[open]'); return !d || parseFloat(getComputedStyle(d).paddingLeft) >= 12; }), `${lb}: 강의실 이번 주 카드 안쪽 여백`); }
    ok(!errs.length, `${lb} 스크립트 오류 없음 ${errs.join(' | ')}`); await ctx.close(); }

  /* 태블릿 768 홈: 카드 아래 두 버튼이 카드 안 */
  for (const type of ['adult', 'voc']) { const { ctx, p, errs } = await open(type, undefined, 768); await show(p, `go('home'); render();`); await generic(p, `${type} 768 home`);
    ok(await p.evaluate(() => [...document.querySelectorAll('.aih43-two')].every(t => [...t.children].every(b => b.getBoundingClientRect().right <= t.getBoundingClientRect().right + 1))), `${type} 768: 홈 카드 두 버튼이 카드 안`);
    ok(!errs.length, `${type} 768 오류 없음`); await ctx.close(); }

  await br.close(); srv.close(); console.log(`qa437-q2: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
