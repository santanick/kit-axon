'use strict';
/* v49 QA 7(디자인 · 접근성) — 신규 · 변경 화면 + 주요 화면 표본을 라이트/다크 × 1440/1100/390으로 훑습니다.
   검사(화면마다): ① 글자 대비 4.5:1(큰 글자 3:1) · 다크 밝은 바탕 · 가로 넘침 · 휴대폰 좁은 칸 · 잘림 · 번호 중복(market-dark.js SCAN과 같은 기준)
   ② 터치 44px(390, 블록 버튼 · 탭 · 입력) ③ 이름 없는 버튼 · 링크 · 입력(스크린리더 라벨) ④ 12px 미만 글자 ⑤ 키보드 포커스 표시(Tab 이동 · 테두리/그림자 변화)
   ⑥ 문구: 운영자 화면 해요체 · 학습자 화면 합니다체 · 화면에 보이면 안 되는 말(용어집 avoid · undefined · NaN · 님님)
   대상: 통합 센터(본사 · 대학 본부 · 지자체 · 교육청 · 소속 기관) · Teams 카드 4탭 · 운영자 로그인(Microsoft로 계속하기) · 학습자 튜터(화면 맥락) · 콘텐츠 마켓 · 관리자/학습자 웹/앱 표본
   사용: node tests/ui/qa49-7.js   (PORT 9970, SHOT=<폴더> 캡처, ONLY=<이름 일부>, W=390,1440 TH=dark 로 좁히기) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.env.SHOT || ''; const PORT = +process.env.PORT || 9970; const ONLY = process.env.ONLY || '';
const WS = (process.env.W || '1440,1100,390').split(',').map(Number); const THS = (process.env.TH || 'light,dark').split(',');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const ALLOW_W = (process.env.STRICT ? [] : ['하면 좋겠습니다', '설정만 저장합니다', '할 일 3가지를 정리했']);
const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
const md = fs.readFileSync(path.join(__dirname, 'market-dark.js'), 'utf8'); const SCAN_SRC = md.slice(md.indexOf('const SCAN = ') + 'const SCAN = '.length, md.indexOf('(async () =>')).trim().replace(/;\s*$/, '');

/* 접근성 · 문구 검사(페이지 안에서 실행) */
const A11Y = (rootSel, role) => {
  const roots = [...document.querySelectorAll(rootSel)]; const out = { touch: [], name: [], label: [], tiny: [], word: [], bad: [] };
  const vis = el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; if (r.bottom < 0 || r.right < 0 || r.left > innerWidth) return false; for (let x = el; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .15) return false; } return true; };
  const nm = el => { const l = el.getAttribute('aria-label') || el.getAttribute('title') || ''; if (l.trim()) return l; const lb = el.getAttribute('aria-labelledby'); if (lb) return lb.split(/\s+/).map(i => (document.getElementById(i) || {}).textContent || '').join(' '); const im = el.querySelector('img[alt]'); return (el.innerText || el.textContent || '').trim() || (im && im.alt) || ''; };
  const sk = e => String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || e.tagName).slice(0, 34) + (e.dataset && (e.dataset.act || e.dataset.v) ? `[${e.dataset.act || ''}${e.dataset.v ? '=' + e.dataset.v : ''}]` : '');
  for (const root of roots) {
    for (const el of root.querySelectorAll('button, a[href], [role=button], [role=tab], [data-act], input, select, textarea, summary')) {
      if (!vis(el) || el.closest('[aria-hidden=true],svg')) continue; const tag = el.tagName; const ty = (el.type || '').toLowerCase(); if (tag === 'INPUT' && ty === 'hidden') continue;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) { const id = el.id; const has = el.closest('label') || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
        if (!has) out.label.push(`${tag.toLowerCase()}${ty ? ':' + ty : ''}${el.name ? '#' + el.name : ''}${el.placeholder ? '(' + el.placeholder.slice(0, 14) + ')' : ''}`); }
      else if (!nm(el).trim()) out.name.push(sk(el));
      if (innerWidth <= 480) { const cs = getComputedStyle(el); if (cs.display === 'inline' && tag === 'A') continue; if (/^(checkbox|radio)$/.test(ty)) continue; /* 체크박스 · 라디오는 라벨 전체가 누르는 자리 */
        const lab = el.closest('label'); const r = (lab || el).getBoundingClientRect(); if (r.height < 43.5 || r.width < 24) { const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 14); if (el.closest('p, li > small, .mini, small')) continue; out.touch.push(`${sk(el)} ${t} ${Math.round(r.width)}×${Math.round(r.height)}`); } }
    }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const seen = new Set();
    while ((n = w.nextNode())) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue; const el = n.parentElement; if (!vis(el) || el.closest('svg, script, style, code, pre, [data-quote], .lt-m.u, input, textarea, [contenteditable]')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12 && /[가-힣A-Za-z0-9]{2}/.test(t)) out.tiny.push(`${t.slice(0, 14)}(${fs}px ${sk(el)})`);
      if (/\bundefined\b|\bNaN\b|\[object |님님|\bnull\b/.test(t)) out.bad.push(t.slice(0, 40));
      if (/\b(KPI|CTA|PII|RLS|learner|admin|grp_[a-z]+|mk_[a-z]+)\b|모달|워크스페이스|컴플라이언스/.test(t) && !el.closest('a[href^="http"], .gp-code, kbd, .mono')) out.bad.push('용어: ' + t.slice(0, 40));
      const k = t.slice(0, 30); if (seen.has(k)) continue; seen.add(k);
      /* 문구: 인용(「」 · “ ” · ‘ ’) 안은 제외 */
      const s = t.replace(/「[^」]*」|“[^”]*”|‘[^’]*’|"[^"]*"/g, '');
      if (role === 'op' && /[가-힣](해요|어요|아요|예요|이에요|돼요|게요|네요|군요|죠)[.!?]?(\s|$)/.test(s) && !el.closest('.lpv, .gp-pv, .tm-pv, .cx-pv, [data-learner], .mk-pv, .hp-pv, iframe')) out.word.push('해요체: ' + t.slice(0, 44));
      if (role === 'lr' && /[가-힣](습니다|십시오|합니다)[.!?]?(\s|$)/.test(s) && !/(약관|개인정보|규정|법|정책에 따릅니다)/.test(s)) out.word.push('합니다체: ' + t.slice(0, 44));
    }
  }
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 8);
  return out; };
/* 키보드 포커스 표시: Tab을 N번 눌러 포커스된 요소마다 테두리 · 그림자가 포커스 전과 다른지 */
const FOCUS_PROBE = () => { const el = document.activeElement; if (!el || el === document.body) return null; const st = e => { const c = getComputedStyle(e); e.style.transition = 'none'; return [c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 ? c.outlineStyle + c.outlineWidth + c.outlineColor : '', c.boxShadow, c.borderColor, c.backgroundColor, c.textDecorationLine].join('|'); };
  const st2 = e => [e, e.parentElement, e.parentElement && e.parentElement.parentElement].filter(Boolean).map(st).join('#');
  const a = st2(el); const r = el.getBoundingClientRect(); const idt = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || el.tagName).slice(0, 30) + ' ' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 12);
  el.blur(); const b = st2(el); el.focus({ preventScroll: true }); return { same: a === b, id: idt, vis: r.width > 0 && r.height > 0 }; };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(o => srv.listen(PORT, '127.0.0.1', o).once('error', () => srv.listen(0, '127.0.0.1', o))); const base = `http://127.0.0.1:${srv.address().port}`;
  if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
  const browser = await chromium.launch(); const stat = { n: 0, bad: 0 }; const agg = {};
  const check = async (p, name, w, th, sel, role, focus) => {
    if (ONLY && !new RegExp(ONLY).test(name)) return true;
    await p.waitForTimeout(80); const r = await p.evaluate(([s, d]) => (0, eval)('(' + s + ')')(d[0], d[1]), [SCAN_SRC, [sel, th === 'dark']]);
    const a = await p.evaluate(([s, d]) => (0, eval)('(' + s + ')')(d[0], d[1]), [A11Y.toString(), [sel, role]]);
    let foc = [];
    if (focus && w === 1440) { await p.evaluate(s => { const x = document.querySelector(s); if (x) { x.setAttribute('tabindex', '-1'); x.focus(); x.removeAttribute('tabindex'); } }, sel);
      for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); const f = await p.evaluate(FOCUS_PROBE); if (f && f.vis && f.same) foc.push(f.id); } foc = [...new Set(foc)]; }
    stat.n++;
    /* 의도된 예외(findings-7 「결정」): 브랜드 로고 판 · 반전 칩 · 이니셜 아바타 · 장식 원은 다크에서도 밝은 판을 둔다(디자인 기준 4-1), 사진 · 어두운 겹침 위 글자는 바탕을 잴 수 없어 제외,
       다른 QA 범위로 넘긴 기존 문구(ALLOW_W)는 이관 표에서 추적 */
    r.light = r.light.filter(x => !/^(brl|nd t|l43-av|lt-orb)/.test(x.cls)); r.low = r.low.filter(x => !/^rgb\((0|1),(0|1),(0|1)\)$/.test(x.bg));
    a.word = a.word.filter(x => !ALLOW_W.some(k => x.includes(k)));
    const parts = { 대비: r.low, 밝은바탕: r.light, 넘침: r.over > 0 ? [r.over + 'px'] : [], 좁은칸: r.narrow, 잘림: r.cut, 번호중복: r.dup, 터치44: a.touch, 이름없음: a.name, 라벨없음: a.label, 작은글자: a.tiny, 문구: a.word, 금지어: a.bad, 포커스없음: foc };
    const bad = Object.entries(parts).filter(([, v]) => v.length);
    for (const [k, v] of bad) for (const x of v) { const key = `${k} ${typeof x === 'string' ? x : JSON.stringify(x)}`; (agg[key] = agg[key] || new Set()).add(`${name}@${w}${th[0]}`); }
    if (bad.length) { stat.bad++; console.log(`✗ ${name} ${w} ${th}: ` + bad.map(([k, v]) => `${k} ${v.length} ${JSON.stringify(v.slice(0, 3))}`).join(' · ')); }
    if (SHOT) await p.screenshot({ path: path.join(SHOT, `${name}-${w}-${th}.png`), fullPage: true }); return !bad.length; };

  const studio = async (w, th) => { const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: SHOT ? 2 : 1, colorScheme: th }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.addInitScript(t => { try { localStorage.setItem('didisam.theme', t); localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } }, th);
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); return { ctx, p, errs }; };

  for (const th of THS) for (const w of WS) {
    /* ── 통합 센터 ── */
    { const { ctx, p, errs } = await studio(w, th);
      const SETS = [['univ', 'univ', '한빛대학교', 'lite'], ['franchise', 'adult', '한빛수학 본사'], ['region', 'lifelong', '해운구청'], ['edu', 'public', '교육지원청']];
      for (const [k, ty, nmx, ed] of SETS) { const tabs = await p.evaluate(([k, ty, nmx, ed]) => { createOrg(ty, nmx, ed); S.me.role = 'owner'; upgradeState(); grpDemo(k); return wsTabs('grp'); }, [k, ty, nmx, ed]);
        for (const t of tabs) { await p.evaluate(t => { go(t); render(); scrollTo(0, 0); }, t); await check(p, `grp-${k}-${t}`, w, th, '#main', 'op', k === 'univ'); }
        if (k === 'univ') { await p.evaluate(() => { go('grplinks'); render(); ACT['grp-invite'](); }); await check(p, 'grp-univ-invite-modal', w, th, '#modal', 'op', true); await p.evaluate(() => closeModal()); } }
      await p.evaluate(() => { createOrg('lifelong', '좌동 평생교육원'); S.me.role = 'owner'; upgradeState(); grpDemo('child'); ACT['grp-open-mine'](); render(); scrollTo(0, 0); }); await check(p, 'grp-child-invite', w, th, '#main', 'op', true);
      await p.evaluate(() => { const i = document.querySelector('#main .gp-agree input'); if (i) i.checked = true; const b = document.querySelector('#main [data-act="grp-accept"]'); if (b) b.click(); }); await p.waitForTimeout(250); await p.evaluate(() => { render(); scrollTo(0, 0); }); await check(p, 'grp-child-linked', w, th, '#main', 'op');
      await p.evaluate(() => { go('grpinbox'); render(); scrollTo(0, 0); }); await check(p, 'grp-child-inbox', w, th, '#main', 'op');
      /* ── Teams 카드 ── */
      await p.evaluate(() => { createOrg('univ', '점검 대학', 'lite'); S.me.role = 'owner'; upgradeState(); if (typeof slMenuSet === 'function') slMenuSet('conn', true); go('conn'); render(); scrollTo(0, 0); }); await p.waitForTimeout(150);
      await check(p, 'conn-catalog', w, th, '#main', 'op');
      await p.evaluate(() => ACT['sl-cn']({ dataset: { v: 'teams' } })); await p.waitForTimeout(200);
      for (const t of ['ch', 'org', 'mt', 'sso']) { await p.evaluate(v => { ACT['tm-tab']({ dataset: { v } }); const c = document.getElementById('cnCard-teams'); if (c) c.scrollIntoView(); }, t); await p.waitForTimeout(100); await check(p, `teams-${t}`, w, th, '#cnCard-teams', 'op', t === 'ch'); }
      /* ── 콘텐츠 마켓(v48.x) ── */
      await p.evaluate(() => { createOrg('univ', '한빛대학교', 'lite'); S.me.role = 'owner'; upgradeState(); });
      const MK = { market: ['home', 'build', 'credit', 'cart'], mksell: ['items', 'settle'], mkcp: ['home', 'catalog', 'settle'], mkops: ['review', 'credit', 'pilot'] };
      for (const [m, tabs] of Object.entries(MK)) for (const t of tabs) { await p.evaluate(([m, t]) => { UI[m] = t; go(m); render(); scrollTo(0, 0); }, [m, t]); await check(p, `mk-${m}-${t}`, w, th, '#main', 'op', t === 'home'); }
      /* ── 관리자 표본: 공간마다 첫 탭 ── */
      for (const ty of ['k12', 'corp']) { const list = await p.evaluate(ty => { createOrg(ty, '표본 기관'); S.me.role = 'owner'; upgradeState(); return S.nav.ws.map(x => wsTabs(x)[0]).filter(Boolean); }, ty);
        for (const t of list) { await p.evaluate(t => { go(t); render(); scrollTo(0, 0); }, t); await check(p, `adm-${ty}-${t}`, w, th, '#main', 'op', t === list[0]); } }
      ok(!errs.length, `스튜디오 ${w} ${th}: pageerror 없음 ${errs.slice(0, 3).join(' / ')}`); await ctx.close(); }

    /* ── 운영자 로그인(운영 모드 · Microsoft로 계속하기) ── */
    { const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: th }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript(t => { try { localStorage.setItem('didisam.theme', t); } catch (e) { } }, th);
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.route(/\/index\.html$/, x => x.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script src="boot\.js(\?v=[^"]*)?"><\/script>/, m => '<script src="live.js"></script>\n' + m) }));
      await p.route(/\/api\//, r => { const u = new URL(r.request().url()).pathname; if (u === '/api/config') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ live: true, signup: true, ai: false, models: [], oauth: ['google', 'kakao', 'microsoft'] }) }); r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' }); });
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForSelector('.lvsb.ms', { timeout: 6000 }).catch(() => { });
      const has = await p.evaluate(() => { const b = document.querySelector('.lvsb.ms'); if (!b) return null; const c = getComputedStyle(b); return { h: b.getBoundingClientRect().height, bg: c.backgroundColor, fg: c.color, bd: c.borderColor }; });
      ok(!!has, `로그인 ${w} ${th}: 「Microsoft로 계속하기」 버튼 ${JSON.stringify(has)}`);
      await check(p, 'login-live', w, th, '#entry, #app', 'op', true);
      await p.evaluate(() => { const b = document.querySelector('[data-act="lv-signup"]'); if (b) b.click(); }); await p.waitForTimeout(200); await check(p, 'signup-live', w, th, '#entry, #app', 'op');
      ok(!errs.length, `로그인 ${w} ${th}: pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }

    /* ── 학습자 웹 · 앱 + 튜터(화면 맥락) ── */
    for (const app of [false, true]) { if (app && w !== 390) continue;
      const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, colorScheme: th }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.addInitScript(t => { try { localStorage.setItem('didisam.theme', t); sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '26년 10월 기수', id: '20269000' })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, th);
      await p.goto(`${base}/learner.html?demo=adult${app ? '&app=1' : ''}&mk=1#home`, { waitUntil: 'load' }); await p.waitForTimeout(900);
      const pre = app ? 'app' : 'web';
      for (const h of ['#home', '#shop', '#my', '#cal', '#notes', '#ledger', '#connect', '#mk']) { await p.evaluate(x => { location.hash = x; scrollTo(0, 0); }, h); await p.waitForTimeout(420); await p.evaluate(() => document.querySelectorAll('#lm details.lhb-more').forEach(d => { d.open = true; })); await check(p, `${pre}-${h.slice(1)}`, w, th, '#lm, main, #app', 'lr', h === '#home'); }
      /* 튜터 창: 화면 맥락 줄 · 칩 */
      for (const h of ['#cal', '#ledger']) { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(400); await p.evaluate(() => { if (typeof ltOpen === 'function' && !LT.open) ltOpen(); try { ltRender(); } catch (e) { } }); await p.waitForTimeout(250);
        await check(p, `${pre}-tutor-${h.slice(1)}`, w, th, '#ltPanel', 'lr', h === '#cal'); await p.evaluate(() => { try { if (LT.open && typeof ltClose === 'function') ltClose(); } catch (e) { } }); }
      ok(!errs.length, `학습자 ${pre} ${w} ${th}: pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  }
  await browser.close(); srv.close();
  const rows = Object.entries(agg).sort((a, b) => b[1].size - a[1].size);
  if (process.env.AGG) fs.writeFileSync(process.env.AGG, rows.map(([k, s]) => `${s.size}\t${k}\t${[...s].slice(0, 6).join(' ')}`).join('\n'));
  console.log(`\n검사 화면 ${stat.n} · 문제 화면 ${stat.bad} · 문제 묶음 ${rows.length}`);
  if (stat.bad) fails.push(`문제 화면 ${stat.bad}`);
  console.log(fails.length ? `실패 ${fails.length}건` : '모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
