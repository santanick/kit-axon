'use strict';
/* v44 평생교육 · 시니어 홈페이지 템플릿 10종(hp44-life.js) 점검
   - 10종 등록(HPT · HPD · TPL t44- · g44 · types lifelong · sub) · 첫 화면 종류 10가지 모두 다름 · 첫 화면 사진 중복 없음
   - 게시본 PC 1440 · 390: 가로 넘침 0 · 화면 밖 요소 0 · 누르는 칸 44px(390) · 글자 13px 이상 · 한 글자 꺾임 0 · 제목 크기 · pageerror 0
   - 버튼 · 링크가 학습자 실제 경로(#my · #courses · #cert · #notice · #comm · #login · #join · tel: · #p-c-<id>)인지
   - 빈 기관(빈 스튜디오): 강좌 · 숫자 섹션 숨김 · NaN/undefined 없음 · 첫 화면 유지
   - 실제 게시본(learner.html Shadow DOM) 1종
   index.html에 hp44-life.js 태그가 없으면 이 테스트가 hpprem.js 뒤에 주입한다(태그 · ?v=는 통합 담당).
   사용: node tests/ui/tpl44-life.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const IDS = ['lfhall', 'lfuniv', 'lfsenior', 'lfhuman', 'lfvillage', 'lfcredit', 'lfculture', 'lflibrary', 'lfretire', 'lffamily'];
const ROUTES = /^#(my|courses|cert|notice|comm|login|join|home|shop)$/;

(async () => {
  const PV = new Map();
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    let body = fs.readFileSync(f); if (u === '/index.html' && !/hp44-life\.js/.test(body)) body = String(body).replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1\n<script src="hp44-life.js"></script>');
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(body); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const view = async (key, html, minN) => { PV.set(key + '.html', html.replace('<head>', `<head><base href="${base}/">`));
    for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c2.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await q.goto(`${base}/__pv/${key}.html`, { waitUntil: 'load' }); await q.waitForTimeout(300);
      const m = await q.evaluate(w => { const de = document.documentElement; const vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const C = [...document.querySelectorAll('section.l4')];
        return { n: C.length, over: de.scrollWidth - vw, out: [...document.querySelectorAll('section.l4 *')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('.l4-orb,.l4-cg')).length,
          small: w < 600 ? [...document.querySelectorAll('section.l4 a')].filter(a => vis(a) && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 12)) : [],
          tiny: [...document.querySelectorAll('section.l4 *')].filter(el => vis(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 10)),
          narrow: [...document.querySelectorAll('section.l4 :is(h1,h2,h3,b,small,a,p,em,span)')].filter(el => { if (!vis(el) || el.textContent.trim().length < 3) return false; const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); return r.height > fs * 5 && r.width < fs * 2.2; }).length,
          h1: (() => { const h = document.querySelector('section.l4-hero h1'); return h ? parseFloat(getComputedStyle(h).fontSize) : 0; })() }; }, w);
      ok(m.n >= (minN || 4) && m.over <= 0 && !m.out, `${key} ${w}: 섹션 ${m.n}개 · 가로 넘침 0 · 화면 밖 요소 0(${m.over}/${m.out})`);
      ok(!m.small.length, `${key} ${w}: 누르는 칸 44px 이상 ${m.small.join(',')}`);
      ok(!m.tiny.length, `${key} ${w}: 글자 13px 이상 ${m.tiny.join(',')}`);
      ok(!m.narrow, `${key} ${w}: 한 글자 꺾임 0(${m.narrow})`);
      ok(w > 600 ? m.h1 >= 64 && m.h1 <= 104 : m.h1 >= 36 && m.h1 <= 48, `${key} ${w}: 첫 화면 제목 ${m.h1}px(PC 64~104 · 휴대폰 36~48)`);
      if (w < 600) { const f = await q.evaluate(() => { const B = [...document.querySelectorAll('section.l4-hero :is(.l4-cta a,.l4-bb)')]; return B.length ? Math.max(...B.map(b => b.getBoundingClientRect().bottom + scrollY)) : 0; });
        ok(f > 0 && f <= 844, `${key} 390: 첫 화면(844px) 안에 제목 · 버튼이 모두 보임(버튼 아래 끝 ${Math.round(f)}px)`); }
      ok(!pe.length, `${key} ${w}: pageerror 0 ${pe.join('|')}`);
      await c2.close(); } };
  const admin = async empty => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(emp => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', emp ? '1' : '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = !!emp; createOrg('lifelong', '해운대평생학습관'); }, empty); await p.waitForTimeout(1200);
    return { ctx, p, errs }; };

  const a = await admin(false);
  const reg = await a.p.evaluate(ids => ids.map(id => { const t = TPL.find(x => x.id === 't44-' + id) || {}; return { id, th: HPT.has(id), hd: !!(window.HPD && HPD.list().includes(id)), g44: t.g44 === 1, types: (t.types || []).join(), sub: t.sub || '', k: HP44L.DEF[id].k, hero: HP44L.DEF[id].ph.hero || '', fit: HPT.premFits(id, 'lifelong'), thumb: /l4-hero/.test(HPT.thumb(null, id)) }; }), IDS);
  reg.forEach(r => ok(r.th && r.hd && r.g44 && r.types === 'lifelong' && r.sub && r.fit && r.thumb, `${r.id}: 등록 · g44 · types lifelong · 세부 유형 「${r.sub}」 · 미리보기(${JSON.stringify(r)})`));
  ok(new Set(reg.map(r => r.k)).size === 10, `첫 화면 종류 10가지 모두 다름(${reg.map(r => r.k).join(' · ')})`);
  const heroes = reg.map(r => r.hero).filter(Boolean); ok(new Set(heroes).size === heroes.length, `첫 화면 사진 중복 없음(${heroes.join(',')})`);
  ok(reg.some(r => /전통/.test(r.sub)), '전통 · 격식형 1종 이상');
  const cid = await a.p.evaluate(() => S.classes.map(c => c.id));
  const CARD = {};
  /* 사진 주소 → 샘플 id(같은 사진의 800 · 1600 판은 같은 것으로 본다) */
  const pid = u => (String(u).match(/stock\/([a-z]{3}-\d{2})/) || [])[1] || u;
  for (const id of IDS) {
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); S.site = s; return { html: siteHTML(s), color: s.color, theme: s.theme, first: (s.sections.find(x => !x.hide) || {}).type }; }, id);
    ok(r.theme === id && r.first === 'banner' && new RegExp(`class="hpt l4 ${id} l4-hero`).test(r.html) && /^#[0-9a-f]{6}$/i.test(r.color), `${id}: 테마 적용 · 첫 화면 = 시안 첫 화면 · 기관 색(${r.color}, 흰 글자 대비 보정 허용)`);
    const L = await a.p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.l4 a[href]')].map(a => a.getAttribute('href')); }, r.html);
    const bad = L.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && cid.includes(h.slice(5))) || /^tel:[\d-]+$/.test(h)));
    ok(L.length >= 6 && !bad.length && L.some(h => /^#p-c-/.test(h)), `${id}: 링크 ${L.length}개 실제 경로 · 과정 상세 포함 ${bad.join(',')}`);
    ok(!/hps-flow|hps-short/.test((r.html.match(/<section class="[^"]*\bl4\b[^"]*"/g) || []).join(' ')), `${id}: 섹션 간격 압축 클래스 제거`);
    ok(!/NaN|undefined|object Object|<input|<form|주민등록|휴대폰 번호/.test((r.html.match(/<section class="hpt l4[\s\S]*?<\/section>/g) || []).join('')), `${id}: 이상 값 · 입력 칸 · 개인정보 문구 없음`);
    ok(!/국비|훈련생|고용24|내일배움/.test((r.html.match(/<section class="hpt l4[\s\S]*?<\/section>/g) || []).join('')), `${id}: 평생교육에 훈련 · 국비 문구 없음`);
    ok(!/class="hpt l4 [a-z]+ l4-num/.test(r.html), `${id}: 시연 데이터(공개 강좌 ${cid.length}개 < 10)에서 큰 숫자 블록 숨김`);
    { const P = await a.p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); const vis = [...d.querySelectorAll('section.hpt img')].map(i => i.getAttribute('src')); return { all: vis, card: [...d.querySelectorAll('.l4-cph img')].map(i => i.getAttribute('src')), fields: d.querySelectorAll('section.l4-fields .l4-fg a').length, chips: d.querySelectorAll('.l4-chips i').length }; }, r.html);
      const ids = P.all.map(pid); const dup = ids.filter((x, k) => ids.indexOf(x) !== k); CARD[id] = P.card.map(pid);
      ok(!dup.length, `${id}: 한 페이지 안 사진 중복 0(${ids.length}장 ${dup.join(',')})`);
      ok(!['lfhall', 'lfuniv', 'lfcredit', 'lflibrary'].includes(id) || P.fields >= 2, `${id}: 분야 아이콘 그리드(${P.fields}개 분야)`);
      ok(!/l4-(cards|rows)"/.test(r.html) || P.chips > 0, `${id}: 요일 · 시간대 칩 ${P.chips}개`); }
    await view(id, r.html); }
  { const all = Object.values(CARD).flat(); const dup = all.filter((x, k) => all.indexOf(x) !== k); ok(all.length >= 20 && !dup.length, `강좌 카드 사진: 10종 사이 겹침 0(${all.length}장 ${dup.join(',')})`); }
  /* ── 공통 부품 기본 켜기 · 자체 인용과 후기 중복 없음 ── */
  { const r = await a.p.evaluate(ids => ids.map(id => { const L = TPL.find(t => t.id === 't44-' + id).build(); const on = L.filter(x => x && x.data && /^hx-/.test(x.data.hpt) && !x.hide).map(x => x.data.hpt); const q = L.find(x => x && x.data && x.data.hpt === 'l4-quote'); return { id, on, dupRev: !!(on.includes('hx-rev') && q && !q.data.say) }; }), IDS);
    r.forEach(x => ok(x.on.length >= 2 && !x.dupRev, `${x.id}: 공통 부품 기본 켜기 ${x.on.join(' · ')} · 자체 인용은 후기 없이`)); }
  /* ── 큰 숫자: 공개 강좌 10개 이상일 때만 · 0원 줄은 5개 이상일 때만 ── */
  { const r = await a.p.evaluate(() => { const C0 = S.classes; const mk = (n, free) => Array.from({ length: n }, (_, i) => Object.assign({}, C0[i % C0.length], { id: 'zz' + i, name: '강좌 ' + i, status: '운영중', open: '전체', price: i < free ? 0 : 50000 }));
      const out = {}; for (const [k, n, f] of [['n9', 9, 0], ['n12', 12, 3], ['n12f', 12, 6]]) { S.classes = mk(n, f); const h = siteHTML(siteFromTpl(TPL.find(t => t.id === 't44-lfhall'))); out[k] = { num: /class="hpt l4 [a-z]+ l4-num/.test(h), free: /수강료 없이/.test(h), hrs: /시간<\/span>/.test(h) }; } S.classes = C0; return out; });
    ok(!r.n9.num && r.n12.num && !r.n12.free && r.n12f.free && !r.n12.hrs, `큰 숫자: 9개 숨김 · 12개 보임 · 0원 줄은 5개 이상만 · 시간 합계 없음(${JSON.stringify(r)})`); }
  /* ── 후기: 불만 · 요청 · 질문 제외(공통 hx-rev) · 자체 인용은 기관 한마디(후기 두 번 금지) ── */
  { const r = await a.p.evaluate(() => { const r0 = HPT.reviews; const q = L => { HPT.reviews = () => L; const st = siteFromTpl(TPL.find(t => t.id === 't44-lfuniv')); st.cacheBust = L.length + ':' + Math.random(); const h = siteHTML(st); HPT.reviews = r0; const m = h.match(/<blockquote>([\s\S]*?)<\/blockquote>/); const body = h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, ''); return { quote: m ? m[1] : '', body }; };
      const bad = [{ b: '영상이 자꾸 끊겨요 확인 부탁드립니다', st: 5 }, { b: '퀴즈 3번 해설 부탁드립니다', st: 5 }, { b: '수료증은 언제 나오나요?', st: 4 }, { b: '결제 오류로 환불 요청드려요', st: 5 }];
      const good = [{ b: '저녁반이라 퇴근하고도 꾸준히 들을 수 있었어요.', st: 5, c: '자격 과정', w: '김○○' }, { b: '선생님 설명이 차분해서 처음인데도 따라갈 수 있었어요.', st: 5, c: '교양 과정', w: '박○○' }];
      const A = q(bad), G = q([...bad, ...good]); return { badQ: A.quote, badBody: /끊겨요 확인|3번 해설|언제 나오나요|오류로 환불/.test(A.body), goodQ: G.quote, goodBody: /꾸준히/.test(G.body) && !/끊겨요 확인|3번 해설|언제 나오나요|오류로 환불/.test(G.body) }; });
    ok(!r.badBody && r.goodBody && /새로운 일은/.test(r.badQ) && /새로운 일은/.test(r.goodQ), `후기: 불만 · 요청 · 질문 제외, 좋은 후기는 공통 후기 칸에 한 번만(${JSON.stringify({ a: r.badQ.slice(0, 12), b: r.badBody, g: r.goodBody })})`); }
  /* ── 시니어: 큰 글씨 · 큰 버튼 ── */
  { const html = await a.p.evaluate(() => { S.settings.footer = Object.assign({}, S.settings.footer, { tel: '051-555-0123' }); const s = siteFromTpl(TPL.find(t => t.id === 't44-lfsenior')); const h = siteHTML(s); S.settings.footer.tel = ''; return h; });
    ok(/l4-callbar/.test(html) && /href="tel:051-555-0123"/.test(html), 'lfsenior: 대표번호가 있으면 전화 신청 띠'); PV.set('sen.html', html.replace('<head>', `<head><base href="${base}/">`));
    for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c2.newPage(); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await q.goto(`${base}/__pv/sen.html`, { waitUntil: 'load' });
      const m = await q.evaluate(() => ({ bb: [...document.querySelectorAll('.l4-bb, section.l4 .l4-b')].map(b => b.getBoundingClientRect().height).filter(h => h > 0), body: Math.min(...[...document.querySelectorAll('section:is(.l4,[data-hx]):not(.l4-hero) :is(p,small,dd,li,span,time)')].filter(e => e.getBoundingClientRect().height > 0 && e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize))), lead: parseFloat(getComputedStyle(document.querySelector('.l4-hero .l4-lead')).fontSize) }));
      ok(Math.min(...m.bb) >= 64 && m.lead >= 20 && m.body >= 18, `lfsenior ${w}: 버튼 64px 이상(${Math.min(...m.bb)}) · 첫 화면 부제 ${m.lead}px · 최소 글자 ${m.body}px`); await c2.close(); } }
  ok(!a.errs.length, `관리자 pageerror 0 ${a.errs.join('|')}`); await a.ctx.close();

  /* ── 빈 기관 ── */
  { const e = await admin(true);
    for (const id of ['lfhall', 'lfsenior', 'lfcredit', 'lfhuman']) { const r = await e.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 't44-' + id)); return { n: S.classes.length, html: siteHTML(s) }; }, id);
      const body = (r.html.match(/<section class="hpt l4[\s\S]*?<\/section>/g) || []).join('');
      ok(r.n === 0 && /l4-hero/.test(r.html) && !/l4-(cards|rows|num)"/.test(r.html) && !/NaN|undefined|object Object/.test(body), `${id}: 빈 기관 — 강좌 · 숫자 섹션 숨김 · 첫 화면 유지`);
      await view(id + '-empty', r.html, 2); }
    ok(!e.errs.length, `빈 기관 pageerror 0 ${e.errs.join('|')}`); await e.ctx.close(); }

  /* ── 실제 게시본(learner.html Shadow DOM) ── */
  { const g = await admin(false);
    const tid = await g.p.evaluate(() => { try { closeModal(); } catch (e) { } const s = siteFromTpl(TPL.find(t => t.id === 't44-lfhall')); S.site = s; s.published = true; save(); smPublish(); try { closeModal(); } catch (e) { } return DREG.cur(); });
    for (const w of [1440, 390]) { const q = await g.ctx.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.setViewportSize({ width: w, height: 900 });
      await q.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await q.waitForTimeout(1500);
      const r = await q.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const one = sel => R.map(r => r.querySelector(sel)).find(Boolean);
        const h1 = one('section.l4-hero h1'); return { hero: !!h1, fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0, cls: R.map(r => [...r.querySelectorAll('section.l4 a[href^="#class/"]')]).flat().length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      ok(r.hero && r.cls >= 1 && r.over <= 0 && (w > 600 ? r.fs >= 64 : r.fs <= 46), `게시본 lfhall ${w}: 첫 화면 · 과정 상세(#class/) · 넘침 0(${JSON.stringify(r)})`);
      ok(!pe.length, `게시본 ${w} pageerror 0 ${pe.join('|')}`); await q.close(); }
    await g.ctx.close(); }

  /* v44.1 FIX3 B: 규칙이 있는 강좌 사진은 규칙 사진만 — 모든 강좌 사진 레이아웃(카드 · 갤러리 · 사진 띠 · 목록 썸네일), 기관 강좌 이름 그대로 · qaCls 두 번 */
  try { await require('./hp-visual/photorule.js')(browser, base + '/', 'lifelong', ok, '[life]'); } catch (e) { ok(false, '사진 규칙 점검 예외 ' + (e && e.message || e)); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
