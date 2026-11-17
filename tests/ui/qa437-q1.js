'use strict';
/* v43.7 QA Q1 — 공통 셸 회귀(대표님 캡처 11-17: iPhone 393 · 학원 유형 「닉 Univ」)
   검사 1 가로 넘침 · 2 부모 밖 자식(머리) · 3 가려진 누름 요소(머리 · 탭 줄 · AI 버튼) · 5 크기(셸 누름 칸 44px · 글자 13px)
   + 머리 · 탭 줄 겹침 없음, AI 버튼 같은 자리(가장자리 손잡이 없음), 페이지 머리 버튼 한 줄 왼쪽 정렬, [i] 보이는 원 30px, 카드 안 카드 없음, .top 이름 충돌
   사용: node tests/ui/qa437-q1.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };

/* 브라우저 안 검사(셸 범위) */
const SHELL = () => {
  const vw = innerWidth, vh = innerHeight, o = { ovf: document.documentElement.scrollWidth - vw, out: [], cover: [], small: [] };
  const vis = e => { if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const nm = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className || '').split(/\s+/)[0] + '「' + (e.textContent || '').trim().slice(0, 12) + '」';
  /* 2: 페이지 머리 안 요소가 머리 밖으로 */
  const bhd = document.querySelector('#main>.bhd'); if (bhd && vis(bhd)) { const br = bhd.getBoundingClientRect(); bhd.querySelectorAll('button,a,.ph,.bhdl').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.right > br.right + 1.5 || r.left < br.left - 1.5) o.out.push(nm(e)); }); }
  /* 3: 셸 누름 요소(머리 · 탭 줄 · 페이지 머리 · AI 버튼)가 다른 것에 가려짐 — 보이는 영역 안만 */
  let top = 0; document.querySelectorAll('header.top, nav.brail').forEach(h => { const r = h.getBoundingClientRect(); if (r.top <= 0 && r.bottom > 0) top = Math.max(top, r.bottom); });
  document.querySelectorAll('header.top button, header.top a[href], nav.brail button, #main>.bhd button, #main>.bhd a[href], #fabBtn').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || x > vw || y < 0 || y > vh) return;
    if (!e.closest('header.top, nav.brail') && e.id !== 'fabBtn' && y < top + 2) return; const t = document.elementFromPoint(x, y); if (!t || t === e || e.contains(t)) return; o.cover.push(nm(e) + ' ← ' + nm(t)); });
  /* 5: 셸 누름 칸 44px · 글자 13px */
  document.querySelectorAll('header.top button, header.top a.btn, nav.brail .ri, #main>.bhd button, #main>.bhd a.btn, #main>.bhd summary, #fabBtn, #main .seg2.wtabs>button').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) o.small.push(nm(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`); if ((e.textContent || '').trim() && parseFloat(getComputedStyle(e).fontSize) < 12.9) o.small.push(nm(e) + ' 글자 ' + getComputedStyle(e).fontSize); });
  return o;
};

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const studio = async (type, w, dark) => { const ctx = await br.newContext({ viewport: { width: w, height: 844 }, colorScheme: dark ? 'dark' : 'light', hasTouch: w < 900, isMobile: w < 900 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(base + '/index.html'); await p.evaluate(t => { const [ty, ed] = t.split(':'); localStorage.setItem('didisam.emptyStart', '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = false; createOrg(ty, '닉 Univ', ed || undefined); }, type); await p.waitForTimeout(1000); return { ctx, p, errs }; };
  const go = async (p, id) => { await p.evaluate(i => go(i), id); await p.waitForTimeout(350); };
  const at = async (p, k) => { await p.evaluate(k => { const H = document.documentElement.scrollHeight - innerHeight; scrollTo(0, k === 'top' ? 0 : k === 'mid' ? H / 2 : H); }, k); await p.waitForTimeout(650); };

  /* ── 390 휴대폰: 대표님 캡처 유형(학원 k12) · 대학(univ) — 화면 전수 × 스크롤 3지점 ── */
  for (const type of ['k12', 'univ']) { const { ctx, p, errs } = await studio(type, 390);
    const ids = await p.evaluate(() => { const o = ['home']; Object.values(S.nav.tabs).forEach(a => a.filter(x => menuOn(x.id)).forEach(x => o.push(x.id))); return [...new Set(o.filter(i => i !== 'site'))]; });
    const bad = { ovf: [], out: [], cover: [], small: [], rail: [], fab: [] }; const fabPos = new Set();
    for (const id of ids) { await go(p, id);
      for (const k of ['top', 'mid', 'end']) { await at(p, k); const r = await p.evaluate(SHELL);
        if (r.ovf > 0) bad.ovf.push(`${id}/${k} +${r.ovf}`); if (r.out.length) bad.out.push(`${id}/${k} ${r.out[0]}`); if (r.cover.length) bad.cover.push(`${id}/${k} ${r.cover[0]}`); if (k === 'top' && r.small.length) bad.small.push(`${id} ${r.small[0]}`);
        await p.waitForTimeout(300); const g = await p.evaluate(() => { const rl = document.querySelector('nav.brail').getBoundingClientRect(), hd = document.querySelector('header.top').getBoundingClientRect(), f = document.querySelector('#fabBtn'); const fr = f && f.getBoundingClientRect();
          return { railTop: Math.round(rl.top), overlap: hd.bottom > rl.top + 0.5 && hd.bottom > 0, edge: !!(f && f.classList.contains('fab-edge')), fab: fr && fr.width ? `${Math.round(innerWidth - fr.right)},${Math.round(innerHeight - fr.bottom)},${Math.round(fr.width)}` : '' }; });
        if (g.railTop < 0 || g.overlap) bad.rail.push(`${id}/${k} top=${g.railTop}`); if (g.edge) bad.fab.push(`${id}/${k} 가장자리 손잡이`); if (g.fab && !(await p.evaluate(() => document.body.classList.contains('fab-scr')))) fabPos.add(g.fab); } }
    ok(!bad.ovf.length, `${type} 390 [검사1] 가로 넘침 없음 ` + bad.ovf.slice(0, 4).join(' · '));
    ok(!bad.out.length, `${type} 390 [검사2] 머리 안 요소가 머리 밖으로 안 나감 ` + bad.out.slice(0, 4).join(' · '));
    ok(!bad.cover.length, `${type} 390 [검사3] 머리 · 탭 줄 · 페이지 머리 · AI 버튼이 가려지지 않음 ` + bad.cover.slice(0, 4).join(' · '));
    ok(!bad.small.length, `${type} 390 [검사5] 셸 누름 칸 44px · 글자 13px ` + bad.small.slice(0, 4).join(' · '));
    ok(!bad.rail.length, `${type} 390 스크롤해도 탭 줄이 머리 밑으로 들어가 잘리지 않음(맨 위에 통째로) ` + bad.rail.slice(0, 4).join(' · '));
    ok(!bad.fab.length && fabPos.size === 1 && [...fabPos][0] === '12,12,48', `${type} 390 AI 버튼은 모든 화면 같은 자리 · 48px 원(가장자리 손잡이 없음) ` + [...fabPos].join(' / ') + bad.fab.slice(0, 2).join(' · '));
    ok(await p.evaluate(() => getComputedStyle(document.documentElement).overflowX === 'clip'), `${type} 390 가로 넘침 안전망(html overflow-x: clip)`);
    ok(!errs.length, `${type} 390 페이지 오류 없음 ` + errs.slice(0, 2).join(' | '));
    await ctx.close(); }

  /* ── 390 대표님 캡처 화면별 ── */
  { const { ctx, p, errs } = await studio('k12', 390);
    /* 캡처 1 수납: [i] · 머리 버튼 */
    await go(p, 'crmbill'); const h1 = await p.evaluate(() => { const b = document.querySelector('#main>.bhd'), i = b.querySelector('.slg-i'), ir = i.getBoundingClientRect(), bf = getComputedStyle(i, '::before'); const btn = [...b.querySelectorAll('.phr .btn, :scope>.btn')].filter(x => x.offsetParent); const tl = b.querySelector('.bhdl').getBoundingClientRect();
      return { box: Math.round(ir.height), vis: parseFloat(bf.width), bd: getComputedStyle(i).borderTopWidth, n: btn.length, left: btn.length ? Math.round(btn[0].getBoundingClientRect().left - b.getBoundingClientRect().left) : -1, below: btn.every(x => x.getBoundingClientRect().top >= tl.bottom - 1) }; });
    ok(h1.box >= 44 && h1.vis === 30 && h1.bd === '0px', `캡처1 수납 [i]: 누르는 칸 44px · 보이는 원 30px ${JSON.stringify(h1)}`);
    ok(h1.n >= 1 && h1.left <= 1 && h1.below, `캡처1 수납 「자동 운영 · 설정」: 제목 아래 왼쪽부터(혼자 오른쪽에 떠 있지 않음) ${JSON.stringify(h1)}`);
    /* 캡처 3 공지: AI SAM에게 맡기기 + 알림 보내기 같은 줄 · 같은 높이 */
    await go(p, 'board'); const h3 = await p.evaluate(() => { const b = document.querySelector('#main>.bhd'); const L = [...b.querySelectorAll(':scope>.btn, .phr .btn')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect()); return { n: L.length, tops: [...new Set(L.map(r => Math.round(r.top)))], hs: L.map(r => Math.round(r.height)), left: L.length ? Math.round(L[0].left - b.getBoundingClientRect().left) : -1 }; });
    ok(h3.n === 2 && h3.tops.length === 1 && h3.hs.every(h => h >= 44 && h <= 48) && h3.left <= 1, `캡처3 공지 머리: 「AI SAM에게 맡기기」 · 「알림 보내기」 한 줄 · 같은 높이(세로로 늘어난 상자 없음) ${JSON.stringify(h3)}`);
    /* 캡처 4 원생: 머리 버튼 줄 왼쪽 정렬 · 브리핑 속 할 일 목록은 카드 안 카드가 아님 */
    await go(p, 'crmstu'); const h4 = await p.evaluate(() => { const b = document.querySelector('#main>.bhd'); const L = [...b.querySelectorAll('.phr>*')].filter(x => x.offsetParent); const td = document.querySelector('#main .l43-brief .l43-todo'); const li = td && td.querySelector('li');
      return { left: L.length ? Math.round(L[0].getBoundingClientRect().left - b.getBoundingClientRect().left) : -1, olBg: td && getComputedStyle(td).backgroundColor, olSh: td && getComputedStyle(td).boxShadow, liSh: li && getComputedStyle(li).boxShadow, liBg: li && getComputedStyle(li).backgroundColor }; });
    ok(h4.left <= 1, `캡처4 원생 머리 버튼 줄 왼쪽부터 ${JSON.stringify(h4)}`);
    ok(h4.olSh === 'none' && h4.liSh === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(h4.olBg + h4.liBg.replace(/.*/, m => m)), `캡처4 원생 「미납 안내」: 브리핑 카드 속 목록은 구분선 목록(카드 안 카드 아님) ${JSON.stringify(h4)}`);
    /* 캡처 2 메시지: 「새 메시지」 줄 안쪽 상자 없음 */
    await go(p, 'message'); const h2 = await p.evaluate(() => { const q = document.querySelector('#main .f1-cbar .f1-cbq'); if (!q) return null; const s = getComputedStyle(q); return { bd: s.borderTopWidth, bg: s.backgroundColor }; });
    ok(!h2 || (h2.bd === '0px' && h2.bg === 'rgba(0, 0, 0, 0)'), `캡처2 메시지 「새 메시지」: 아이콘 옆 안쪽 카드 없음 ${JSON.stringify(h2)}`);
    /* .top 이름 충돌: 성적 1~3등 칩이 머리 규칙(높이 62 · sticky)을 받지 않음 */
    await go(p, 'crmex'); const rk = await p.evaluate(() => { const e = document.querySelector('.k-rk.top'); return e ? { pos: getComputedStyle(e).position, h: Math.round(e.getBoundingClientRect().height) } : null; });
    ok(!rk || (rk.pos === 'static' && rk.h < 40), `.top 이름 충돌: 성적 등수 칩은 머리 규칙을 받지 않음 ${JSON.stringify(rk)}`);
    ok(!errs.length, '캡처 화면 오류 없음 ' + errs.join(' | ')); await ctx.close(); }

  /* ── 390 다크 · 768 태블릿 · 1440 PC ── */
  { const { ctx, p, errs } = await studio('univ', 390, true); await go(p, 'board'); await at(p, 'mid');
    const d = await p.evaluate(() => { const r = document.querySelector('nav.brail'); return { top: Math.round(r.getBoundingClientRect().top), bg: getComputedStyle(r).backgroundColor }; });
    ok(d.top === 0 && d.bg !== 'rgba(0, 0, 0, 0)' && !/255, 255, 255/.test(d.bg), `다크 390: 탭 줄 맨 위 · 어두운 바탕 ${JSON.stringify(d)}`);
    const r = await p.evaluate(SHELL); ok(!r.ovf && !r.cover.length, '다크 390 가로 넘침 · 가림 없음 ' + r.cover.slice(0, 3).join(' · ')); ok(!errs.length, '다크 오류 없음'); await ctx.close(); }
  { const { ctx, p, errs } = await studio('k12', 768); const bad = [];
    for (const id of ['home', 'crmstu', 'board', 'message', 'crmbill']) { await go(p, id); for (const k of ['top', 'mid']) { await at(p, k); const r = await p.evaluate(SHELL); await p.waitForTimeout(300); const g = await p.evaluate(() => { const rl = document.querySelector('nav.brail').getBoundingClientRect(), f = document.querySelector('#fabBtn').getBoundingClientRect(); return { rt: Math.round(rl.top), fw: Math.round(f.width) }; });
      if (r.ovf || r.cover.length || (k === 'top' && r.small.length) || g.rt < 0 || (g.fw && g.fw !== 48)) bad.push(`${id}/${k} ${JSON.stringify({ ovf: r.ovf, c: r.cover[0], s: k === 'top' ? r.small[0] : '', ...g })}`); } }
    ok(!bad.length, '768 태블릿: 탭 줄 맨 위 · AI 버튼 48px 원 · 가로 넘침 · 가림 · 크기 ' + bad.slice(0, 3).join(' · ')); ok(!errs.length, '768 오류 없음'); await ctx.close(); }
  { const { ctx, p, errs } = await studio('univ', 1440); const bad = [];
    for (const id of ['home', 'class', 'members', 'board', 'auto']) { await go(p, id); await at(p, 'mid'); const r = await p.evaluate(SHELL); const g = await p.evaluate(() => ({ hp: getComputedStyle(document.querySelector('header.top')).position, ht: Math.round(document.querySelector('header.top').getBoundingClientRect().top) }));
      if (r.ovf || r.cover.length || g.hp !== 'sticky' || g.ht !== 0) bad.push(`${id} ${JSON.stringify({ ovf: r.ovf, c: r.cover[0], ...g })}`); }
    /* Q3 몫 8: 시간이 겹친 시설 예약 막대는 위 · 아래 칸으로 — 서로 가리지 않음 */
    await go(p, 'fac'); const tl = await p.evaluate(() => { const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:100px;width:900px;z-index:999'; box.innerHTML = V4.timeline({ lo: 540, hi: 1260, rows: [{ n: '강의실 A', blocks: [{ l: '10명', s: 720, e: 780, act: 'x' }, { l: '20명', s: 720, e: 780, act: 'x' }, { l: '5명', s: 900, e: 960 }] }] }); document.body.appendChild(box);
      const B = [...box.querySelectorAll('.v4-blk')]; const hid = B.filter(b => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + 8, r.top + r.height / 2); return t !== b && !b.contains(t); }).length; box.remove(); return { n: B.length, hid }; });
    ok(!tl.hid, `시설 타임라인: 겹친 예약 막대가 서로 가리지 않음 ${JSON.stringify(tl)}`);
    /* Q3 몫 7: 옆 패널 0 표시는 문장 */
    const z = await p.evaluate(() => [...document.querySelectorAll('#main .da-todo b, #main .da-ring dd')].map(e => e.textContent).filter(t => /(^|\s)0\s?(명|건|개)/.test(t)));
    ok(!z.length, '옆 패널(할 일 · 링 범례) 0명 · 0건 대신 「없음」 ' + z.join(' · '));
    await go(p, 'class'); await at(p, 'top'); const s = await p.evaluate(SHELL);
    ok(!bad.length, '1440 PC: 머리는 그대로 고정 · 가로 넘침 · 가림 없음 ' + bad.slice(0, 3).join(' · '));
    /* PC(마우스)는 누름 칸 44px 대상이 아님 — 글자 13px만 본다([i]는 PC 32px 원 그대로, lms38 2차 #15) */
    const sf = s.small.filter(x => /글자/.test(x)); ok(!sf.length, '1440 PC [검사5] 셸 글자 13px(왼쪽 메뉴 · 머리) ' + sf.slice(0, 4).join(' · ')); ok(!errs.length, '1440 오류 없음'); await ctx.close(); }

  await br.close(); srv.close(); console.log(`qa437-q1: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
