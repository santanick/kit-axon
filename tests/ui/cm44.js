'use strict';
/* v44.1 CM 공통 부품(hpsec-trust HPX · lhpshell g44 · ltutor) 점검
   1) 범위: 예전 템플릿 사이트는 CM 코드가 있을 때와 없을 때(파일에서 v44.1 CM 블록을 떼어 낸 판) 게시본 HTML · CSS · 학습자 DOM · 스타일이 같다
   2) 부품 렌더: g44 사이트에서 후기 · 강사진 · FAQ · 오시는 길 · 가격 · 강좌 목록 · 공지(+ 숫자 띠는 기준 이상일 때) · g44 바닥글
   3) 데이터 없을 때 숨김: 빈 기관 · 기준 미만 숫자 · 불만 후기 제외 · 같은 종류 중복 없음
   4) 390 관문: 가로 넘침 0 · 링크 44px · 글자 13px · 후기 가로 넘김 카드 78% · 제목 28px · 바닥글 아코디언 + 전화 버튼
   5) 머리글: AX 튜터는 머리글 밖 오른쪽 아래 버튼 · 스크롤하면 72 → 56px
   사용: node tests/ui/cm44.js  (정적 서버를 테스트 안에서 띄웠다가 끈다. 브라우저 1개) */
const fs = require('node:fs'); const path = require('node:path'); const http = require('node:http');
const H = require('./hp-visual/lib.js');
const ROOT = H.ROOT;
/* CM 블록을 떼어 낸 「이전」 판 */
const CUT = {
  'hpsec-trust.js': s => { const i = s.indexOf('/* v44.1 CM — 새 템플릿(g44) 공통 부품'); return i > 0 ? s.slice(0, i) : s; },
  'lhpshell.js': s => { const i = s.indexOf('/* v44.1 CM — 새 템플릿(g44) 게시본에서만'); return i > 0 ? s.slice(0, i) : s; },
  'lhpshell.css': s => { const i = s.indexOf('/* v44.1 CM'); return i > 0 ? s.slice(0, i) : s; },
  /* ltutor.js: qa7(2026-11-25) 대표님 지시로 모든 템플릿 · 화면의 AI 튜터 버튼이 우측 하단 고정으로 통일되어 g44 전용 분기(CM 블록)가 없어졌다 — 떼어 낼 블록 없음 */
};
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
function serve(port, old) { const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  const b = path.basename(f); r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  if (old && CUT[b] && path.dirname(f) === ROOT) return r.end(CUT[b](fs.readFileSync(f, 'utf8'))); fs.createReadStream(f).pipe(r); });
  return new Promise((ok, no) => { srv.once('error', no); srv.listen(port, '127.0.0.1', () => ok(srv)); }); }

(async () => {
  const { chromium } = H.need('playwright'); const P0 = 9956 + Math.floor(Math.random() * 20);
  const srvN = await serve(P0); const srvO = await serve(P0 + 30, true); const baseN = `http://127.0.0.1:${P0}/`, baseO = `http://127.0.0.1:${P0 + 30}/`;
  const br = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  Object.entries(CUT).forEach(([f, fn]) => { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); ok(fn(s) !== s, `「이전」 판 만들기: ${f}에서 CM 블록을 찾음`); });
  const open = async (ctx, base, tid, w) => { const pg = await ctx.newPage(); const pe = []; pg.on('pageerror', e => pe.push(e.message)); await pg.setViewportSize({ width: w, height: w > 600 ? 900 : 844 });
    await pg.goto(base + 'learner.html?t=' + tid + '&r=' + Date.now() + '#home'); await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 9000 }).catch(() => {});
    await pg.waitForTimeout(600); await H.settle(pg); await H.quiet(pg, 3000, 0); return { pg, pe }; }; /* v44.1: 고정 400ms 대신 맨 위 · 전환 끝 조건 대기 */
  /* 학습자 DOM · 스타일 서명(셸 + 홈페이지 Shadow) */
  const sig = pg => pg.evaluate(() => { const K = ['display', 'position', 'color', 'background-color', 'font-size', 'font-weight', 'padding-top', 'padding-bottom', 'height', 'width', 'opacity', 'transform'];
    const out = []; const walk = (el, d) => { if (d > 40) return; [...el.children].forEach(c => { if (/^(SCRIPT|STYLE)$/.test(c.tagName)) return; const cs = getComputedStyle(c); const b = c.getBoundingClientRect();
      out.push(`${d}|${c.tagName}.${[...c.classList].sort().join('.')}|${K.map(k => cs.getPropertyValue(k)).join(',')}|${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.width)},${Math.round(b.height)}`); if (c.shadowRoot) walk(c.shadowRoot, d + 1); walk(c, d + 1); }); };
    walk(document.body, 0); return { n: out.length, s: out.join('\n'), body: document.body.className }; });

  try {
    /* ── 1) 범위: 예전 템플릿 ── */
    for (const type of ['k12', 'corp']) {
      const R = {};
      for (const [k, base] of [['old', baseO], ['new', baseN]]) {
        const errs = []; const o = await H.mkOrg(br, base, type, errs, 'filled');
        const old = await o.op.evaluate(t => { const tp = TPL.find(x => !x.g44 && !x.hidden && (x.types || []).includes(t) && x.theme) || TPL.find(x => !x.g44 && (x.types || []).includes(t)); return tp ? tp.id : ''; }, type);
        await H.applyTpl(o.op, old);
        const pub = await o.op.evaluate(() => { const s = S.site; const hp = typeof smHp === 'function' ? smHp() : null; let snap = null; try { snap = lsSnapshot(); } catch (e) { }
          const nz = v => String(v).split(location.host).join('HOST'); /* 두 서버의 포트만 다르다 */
          return { on: !!(window.HPX && HPX.on(s)), html: nz(siteHTML(s, true, 'ko')), hp: hp ? nz(JSON.stringify({ home: hp.home, css: hp.css, foot: hp.foot, head: hp.head })) : '', g44: !!(snap && snap.hp && snap.hp.g44) }; });
        const L = {}; for (const w of [1440, 390]) { const { pg, pe } = await open(o.ctx, base, o.tid, w); L[w] = await sig(pg); L[w].pe = pe; await pg.close(); }
        R[k] = { old, pub, L, errs }; await o.ctx.close(); }
      ok(R.new.old && R.new.old === R.old.old, `[${type}] 예전 템플릿 ${R.new.old}`);
      ok(!R.new.pub.on && !R.new.pub.g44, `[${type}] 예전 템플릿은 g44 범위 밖(HPX.on false · 게시본 g44 표시 없음)`);
      if (R.new.pub.html !== R.old.pub.html) { const A = R.old.pub.html, B = R.new.pub.html; let i = 0; while (i < A.length && A[i] === B[i]) i++; console.log('  diff@' + i, JSON.stringify(A.slice(i - 80, i + 80)), '\n  vs', JSON.stringify(B.slice(i - 80, i + 80))); }
      ok(R.new.pub.html === R.old.pub.html, `[${type}] 예전 템플릿 스튜디오 HTML · CSS 전후 동일(${R.new.pub.html.length} / ${R.old.pub.html.length}자)`);
      if (R.new.pub.hp !== R.old.pub.hp) { const A = R.old.pub.hp, B = R.new.pub.hp; let i = 0; while (i < A.length && A[i] === B[i]) i++; console.log('  hp diff@' + i, JSON.stringify(A.slice(i - 80, i + 80)), '\n  vs', JSON.stringify(B.slice(i - 80, i + 80))); }
      ok(R.new.pub.hp === R.old.pub.hp, `[${type}] 예전 템플릿 게시본(home · css · foot · head) 전후 동일`);
      for (const w of [1440, 390]) { const a = R.old.L[w], b = R.new.L[w]; const d = a.s.split('\n').filter((x, i) => x !== b.s.split('\n')[i]);
        ok(a.n === b.n && a.s === b.s, `[${type}] 예전 템플릿 학습자 게시본 ${w} DOM · 계산된 스타일 전후 동일(${b.n}개 요소${d.length ? ' · 다른 줄 ' + d.length + ': ' + d[0].slice(0, 140) : ''})`);
        ok(!/lhs-g44/.test(b.body), `[${type}] ${w} body에 g44 표시 없음`); ok(!b.pe.length, `[${type}] ${w} pageerror 0 (${b.pe.join(' | ')})`); }
    }

    /* ── 2 · 3 · 4 · 5) g44 사이트 ── */
    for (const [type, tid0] of [['k12', 't44-kfmath'], ['corp', 't44-cphrd']]) {
      const errs = []; const o = await H.mkOrg(br, baseN, type, errs, 'filled');
      /* 강사 소개 · 불만 후기(별점 5 · 가장 긴 글) · 공지 고정 */
      await o.op.evaluate(() => { const N = [['김서윤', '10년 차 현직 강사 · 교재 집필'], ['박도현', '실무 15년 · 사내 강사'], ['이하은', '교육학 석사 · 1:1 코칭']]; (S.classes || []).forEach((c, i) => { c.intro = [{ name: N[i % 3][0], bio: N[i % 3][1] }]; });
        const who = (S.members || [])[0] ? S.members[0].id : 'm0'; S.posts.push({ id: 'qbad', kind: '이야기', board: '수강후기', who, title: '영상이 자꾸 끊겨요', body: '수업은 좋은데 집에서 복습 영상을 볼 때 영상이 자꾸 끊겨요. 고쳐 주세요 정말 불편합니다 꼭 부탁드려요', stars: 5, at: '2026-11-17', replies: 0, views: 3, hidden: false }); save(); });
      await H.applyTpl(o.op, tid0);
      const st = await o.op.evaluate(() => { const s = S.site; const L = s.sections; const kinds = L.map(x => x && x.data && x.data.hpt).filter(h => /^hx-/.test(h || ''));
        /* 운영자가 켜는 것처럼: 부품을 켜고 가격 · 강좌 목록 · 공지 · 숫자 띠를 더한다 */
        L.forEach(x => { const h = x && x.data && x.data.hpt; if (/^hx-/.test(h || '') || h === 'people' || h === 'faq') x.hide = false; });
        const at = L.length - 1; L.splice(at, 0, HPX.sec('price'), HPX.sec('cls'), HPX.sec('ntc'), HPX.sec('num'));
        save(); smPublish(); const html = siteHTML(s, true, 'ko');
        const cnt = k => (html.match(new RegExp('data-hx="' + k + '"', 'g')) || []).length;
        return { on: HPX.on(s), kinds, hidden: L.filter(x => x && x.hide && /^hx-/.test((x.data || {}).hpt || '')).length, c: Object.fromEntries(['rev', 'fac', 'faq', 'loc', 'price', 'cls', 'ntc', 'num'].map(k => [k, cnt(k)])), foot: /data-hps="g44"/.test(html), bad: /끊겨요/.test(html), nums: HPX.data.numbers({}).length }; });
      await H.dismiss(o.op);
      ok(st.on, `[${type}] ${tid0}는 g44 범위`);
      ok(st.kinds.length >= 2, `[${type}] 템플릿에 신뢰 부품이 숨김 섹션으로 들어 있음(편집기에서 켜고 끔): ${st.kinds.join(', ')}`);
      ['rev', 'fac', 'faq', 'loc', 'price', 'cls', 'ntc'].forEach(k => ok(st.c[k] === 1, `[${type}] 부품 ${k} 1회 렌더(${st.c[k]})`));
      ok(st.c.num === 0 && st.nums < 2, `[${type}] 숫자 띠: 과정 6개 · 수강생 적음 → 숨김(${st.c.num}, 값 ${st.nums}개)`);
      ok(st.foot, `[${type}] g44 바닥글`); ok(!st.bad, `[${type}] 별점 5라도 불만 · 요청 후기는 인용하지 않음`);
      /* 기준 이상이면 숫자 띠 보임 */
      const rich = await o.op.evaluate(() => { const C0 = S.classes[0]; const add = Array.from({ length: 6 }, (_, i) => Object.assign(JSON.parse(JSON.stringify(C0)), { id: 'qx' + i, name: '추가 과정 ' + (i + 1) })); S.classes.push(...add);
        S.classes[0].learners = Array.from({ length: 130 }, (_, i) => 'L' + i); const html = siteHTML(S.site, true, 'ko'); const n = (html.match(/data-hx="num"/g) || []).length; const v = HPX.data.numbers({}).map(x => x.v + x.u);
        S.classes = S.classes.filter(c => !/^qx/.test(c.id)); S.classes[0].learners = []; save(); smPublish(); return { n, v }; });
      ok(rich.n === 1 && rich.v.length >= 2, `[${type}] 과정 12개 · 수강생 130명이면 숫자 띠 보임(${rich.v.join(' · ')})`);
      await H.dismiss(o.op);

      /* 390 관문 */
      { const { pg, pe } = await open(o.ctx, baseN, o.tid, 390);
        const m = await pg.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const q = s => R.flatMap(r => [...r.querySelectorAll(s)]);
          const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
          const small = [], tap = [], wide = [];
          q('.hx *, footer.hx-f *').filter(vis).forEach(el => { const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); const fs = parseFloat(getComputedStyle(el).fontSize); const b = el.getBoundingClientRect();
            if (own && !el.closest('svg') && fs < 12 && !el.closest('.hx-biz,.hps-cp')) small.push(`${el.tagName}.${el.className} ${fs}`); if (own && !el.closest('svg,.hx-biz,.hps-cp,footer') && fs < 13) small.push(`${el.tagName}.${el.className} ${fs}`);
            if (el.matches('a[href], summary') && !el.closest('.hx-biz') && b.height < 44 && b.width > 0) { const sc = el.closest('[class*=hx-rl],[class*=hx-cl]'); tap.push(`${(el.textContent || '').trim().slice(0, 12)} ${Math.round(b.width)}x${Math.round(b.height)}`); }
            if (b.right > innerWidth + 1 || b.left < -1) { let a = el.parentElement, clip = false; while (a) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) { clip = true; break; } a = a.parentElement; } if (!clip) wide.push(`${el.tagName}.${el.className}`); } });
          const rl = q('.hx-rev .hx-rl > li')[0]; const rw = rl ? Math.round(rl.getBoundingClientRect().width / innerWidth * 100) : 0; /* 화면 폭 대비 */
          const h2 = q('.hx h2').filter(vis).map(h => parseFloat(getComputedStyle(h).fontSize)); const body = q('.hx-faq .hx-a, .hx-rev blockquote').filter(vis).map(x => parseFloat(getComputedStyle(x).fontSize));
          const fd = q('footer.hx-f .hx-fdt')[0]; const call = q('footer.hx-f .hx-fcall')[0]; const nv = q('footer.hx-f .hx-fnv')[0];
          return { over: document.documentElement.scrollWidth - innerWidth, small: small.slice(0, 5), tap: tap.slice(0, 6), wide: wide.slice(0, 5), rw, h2, body, fd: !!(fd && vis(fd)), call: call && vis(call) ? Math.round(call.getBoundingClientRect().height) : 0, nv: !!(nv && vis(nv)),
            rev: q('[data-hx]').filter(vis).map(x => x.getAttribute('data-hx')) }; });
        ok(m.over <= 0 && !m.wide.length, `[${type}] 390 가로 넘침 0 (${m.over} ${m.wide.join(', ')})`);
        ok(!m.small.length, `[${type}] 390 부품 글자 13px 이상(사업자 줄 12px 제외) ${m.small.join(', ')}`);
        ok(!m.tap.length, `[${type}] 390 부품 링크 · 접기 44px 이상 ${m.tap.join(', ')}`);
        ok(m.rw >= 70 && m.rw <= 82, `[${type}] 390 후기 가로 넘김 카드 폭 ${m.rw}%(78% 기준 · 다음 카드가 보임)`);
        ok(m.h2.length >= 5 && m.h2.every(x => x >= 26 && x <= 34), `[${type}] 390 부품 제목 ${m.h2.join(',')}px`);
        ok(m.body.every(x => x >= 15), `[${type}] 390 본문 15px 이상(${m.body.join(',')})`);
        ok(m.fd && m.call >= 48 && !m.nv, `[${type}] 390 바닥글: 바로가기 아코디언 · 큰 전화 버튼(${m.call}px)`);
        ok(!pe.length, `[${type}] 390 pageerror 0 ${pe.join(' | ')}`); await pg.close(); }

      /* PC: 머리글 · 튜터 · 움직임 */
      { const { pg, pe } = await open(o.ctx, baseN, o.tid, 1440);
        const a = await pg.evaluate(async () => { const hh = document.querySelector('.lhs-head'); const hw = hh && hh.shadowRoot && hh.shadowRoot.querySelector('header.gh .hps-hw'); const h0 = hw ? Math.round(hw.getBoundingClientRect().height) : 0;
          const inHead = !!document.querySelector('header.lh .lt-fab'); const fab = document.querySelector('#ltut .lt-fab'); const fb = fab ? fab.getBoundingClientRect() : null; const fcs = fab ? getComputedStyle(fab) : null;
          const login = !!(hh && hh.shadowRoot && hh.shadowRoot.querySelector('header.gh a[href="#login"]'));
          /* v44.1 불안정 정리: html{scroll-behavior:smooth}라 scrollTo(0, 1400)는 부드럽게 움직이고, 머리글 높이는 .2s 전환 · 스크롤 등장은 IntersectionObserver(다음 프레임 뒤 콜백)다.
             고정 450ms 대신 즉시 이동 → 「목표 위치 · 진행 중 CSS 전환 없음 · rAF 2회」 → 화면 안 섹션의 hx-in(관찰자 콜백) 조건 대기(최대 3초) */
          scrollTo({ top: 1400, behavior: 'instant' }); await window.__hvQuiet(3000, Math.min(1400, document.documentElement.scrollHeight - innerHeight));
          const hidN = () => { const R0 = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const m0 = R0.map(r => r.querySelector('.smr.hx-js')).find(Boolean); return m0 ? [...m0.querySelectorAll(':scope > section')].slice(1).filter(x => !x.classList.contains('hx-in') && x.getBoundingClientRect().top < innerHeight * .8).length : -1; };
          for (const t0 = Date.now(); hidN() > 0 && Date.now() - t0 < 3000;) await new Promise(r => requestAnimationFrame(() => r()));
          await window.__hvQuiet(3000); const h1 = hw ? Math.round(hw.getBoundingClientRect().height) : 0; const sc = hh && hh.classList.contains('hx-sc');
          const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const smr = R.map(r => r.querySelector('.smr.hx-js')).find(Boolean); const hid = smr ? [...smr.querySelectorAll(':scope > section')].slice(1).filter(x => !x.classList.contains('hx-in') && x.getBoundingClientRect().top < innerHeight * .8).length : -1;
          return { h0, h1, sc, inHead, login, fab: fb ? { r: Math.round(innerWidth - fb.right), b: Math.round(innerHeight - fb.bottom), op: fcs.opacity, vis: fcs.visibility } : null, js: !!smr, hid, body: document.body.className }; });
        ok(/lhs-g44/.test(a.body), `[${type}] PC body.lhs-g44`);
        ok(!a.inHead && a.fab && a.fab.r >= 16 && a.fab.r <= 40 && a.fab.b >= 16 && a.fab.b <= 40 && a.fab.op === '1' && a.fab.vis === 'visible', `[${type}] PC AX 튜터는 머리글 밖 오른쪽 아래 버튼 ${JSON.stringify(a.fab)}`);
        ok(a.login, `[${type}] PC 머리글 로그인(글자)`);
        ok(a.h0 >= 70 && a.h0 <= 74 && a.h1 >= 54 && a.h1 <= 58 && a.sc, `[${type}] PC 머리글 스크롤 축소 ${a.h0} → ${a.h1}px`);
        ok(a.js && a.hid === 0, `[${type}] PC 스크롤 등장: 화면에 들어온 섹션은 보임(${a.hid})`);
        ok(!pe.length, `[${type}] PC pageerror 0 ${pe.join(' | ')}`); await pg.close(); }
      /* 움직임 끔(reduced-motion): 숨김 상태 없음 */
      { const ctx2 = await br.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } }); await ctx2.addInitScript(() => {}); const pg = await ctx2.newPage();
        await pg.goto(baseN + 'index.html'); /* 같은 기관 데이터를 쓰려면 같은 컨텍스트가 필요 — 여기서는 o.ctx의 저장소를 복사 */
        const stor = await o.op.evaluate(() => JSON.stringify(Object.assign({}, localStorage))); await pg.evaluate(s => { const o2 = JSON.parse(s); Object.keys(o2).forEach(k => localStorage.setItem(k, o2[k])); }, stor);
        await pg.goto(baseN + 'learner.html?t=' + o.tid + '#home'); /* v44.1: 고정 1.8초 대신 게시본이 그려지고 g44 셸이 붙을 때까지 */
        await pg.waitForFunction(() => document.body.classList.contains('lhs-g44') && [...document.querySelectorAll('.smhost')].some(h => h.shadowRoot && h.shadowRoot.querySelector('.smr > section')), null, { timeout: 9000 }).catch(() => {}); await H.quiet(pg, 2000);
        const rm = await pg.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); return { js: R.some(r => r.querySelector('.smr.hx-js')), op: R.flatMap(r => [...r.querySelectorAll('.smr > section')]).filter(x => getComputedStyle(x).opacity !== '1').length, g: document.body.classList.contains('lhs-g44') }; });
        ok(rm.g && !rm.js && rm.op === 0, `[${type}] prefers-reduced-motion이면 등장 움직임 없음(${JSON.stringify(rm)})`); await ctx2.close(); }
      ok(!errs.length, `[${type}] 관리자 오류 0 ${errs.slice(0, 2).join(' | ')}`); await o.ctx.close();
    }

    /* ── 빈 기관: 부품 전부 숨김 ── */
    { const errs = []; const o = await H.mkOrg(br, baseN, 'adult', errs, 'empty'); await H.applyTpl(o.op, 't44-adtalk');
      const e = await o.op.evaluate(() => { S.notices = []; S.posts = (S.posts || []).filter(p => p.board !== '수강후기'); S.reviews = []; S.settings.footer = Object.assign({}, S.settings.footer, { tel: '', addr: '', hours: '', email: '' }); (S.classes || []).forEach(c => { c.intro = []; c.price = 0; });
        const L = S.site.sections; L.forEach(x => { const h = x && x.data && x.data.hpt; if (/^hx-/.test(h || '') || h === 'people' || h === 'faq' || h === 'facts') x.hide = false; }); L.splice(L.length - 1, 0, HPX.sec('price'), HPX.sec('ntc'), HPX.sec('num'));
        save(); smPublish(); const html = siteHTML(S.site, true, 'ko'); return { hx: (html.match(/data-hx="(rev|fac|num|loc|price|ntc)"/g) || []), empty: /hx-empty/.test(html) }; });
      ok(!e.hx.length && !e.empty, `[adult · 빈 기관] 데이터 없는 부품은 게시본에서 숨김(${e.hx.join(',')})`); await o.ctx.close(); }
  } catch (e) { console.error(e); fails.push('예외: ' + e.message); }
  await br.close(); srvN.close(); srvO.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
