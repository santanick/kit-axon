/* v34.5 hpperf — 성능 · 캐시 (개발자 X2, fix6/BRIEF4.md)
   1) 사진: siteHTML이 만든 <img> 중 샘플 사진(img/stock) · /api/media 이미지에 decoding=async · loading=lazy를 붙이고,
      샘플 사진에는 srcset(800 · 1600) + sizes(이미지 자리별)를 넣는다. 첫 화면 사진(홈의 hero 자리, 없으면 홈 첫 사진) 1장만 loading=eager · fetchpriority=high.
      스튜디오 미리보기 · 갤러리 · 게시본이 모두 siteHTML을 거치므로 같은 결과다(편집기는 사이트 데이터를 고친 뒤 다시 그리므로 srcset과 충돌하지 않음).
   2) 게시본 CSS 줄이기(lsSnapshot 감싸기): 긴 주석 · 공백 제거(짧은 층 표시 주석은 남김), 똑같은 규칙이 여러 번이면 마지막 것만 남김,
      게시본 HTML(home · pages · foot 등 모든 문자열)에 없는 class만 쓰는 규칙은 뺀다(Shadow DOM 안은 스크립트가 없어 class가 바뀌지 않음).
      @font-face · @keyframes · :is/:where/:has 규칙은 그대로 둔다. 화면 결과는 같다(같은 순서 · 쓰이는 규칙만 남김).
   3) HPP.thumb(html): 갤러리 썸네일용 — 샘플 사진을 800px 한 벌로 바꾸고 모두 lazy(작게 축소해 보여 주므로 1600px이 필요 없음).
   인터페이스: window.HPP = { img(html), css(css, html), thumb(html), stat } */
'use strict';
(() => {
  const STOCK = /(^|["'\s,(])((?:[^"'\s,()]*\/)?img\/stock\/)([a-z]{3}-\d{2})(-800)?\.webp/;
  const MEDIA = /\/api\/media\/[\w.-]+/;
  /* 이미지 자리별 표시 폭(sizes): 첫 화면 · 신청 띠는 화면 전체, 카드는 1/3 칸 */
  const SZ = { hero: '100vw', cta: '100vw', card: '(max-width: 760px) 100vw, 400px', teacher: '(max-width: 760px) 60vw, 320px', logo: '160px' };
  const SZ0 = '(max-width: 760px) 100vw, 50vw';
  const stat = { img: 0, srcset: 0, high: 0, cssIn: 0, cssOut: 0 };
  const has = (t, a) => new RegExp(`\\s${a}=`, 'i').test(t);
  const get = (t, a) => { const m = new RegExp(`\\s${a}="([^"]*)"`, 'i').exec(t); return m ? m[1] : ''; };
  const del = (t, a) => t.replace(new RegExp(`\\s${a}="[^"]*"`, 'gi'), '');
  const add = (t, s) => t.replace(/\s*\/?>$/, m => ` ${s}${m.trim() === '/>' ? ' />' : '>'}`);
  const stockOf = src => { const m = STOCK.exec(' ' + src); if (!m) return null; const x = typeof HPSTOCK !== 'undefined' && HPSTOCK.get ? HPSTOCK.get(m[3]) : null; return x ? { x, pre: m[2].slice(0, -'img/stock/'.length), small: !!m[4] } : null; };
  const srcsetOf = (x, pre) => { const L = Math.max(x.w, x.h); if (!(L > 860)) return ''; const w8 = Math.round(800 * x.w / L); return `${pre}${x.src800} ${w8}w, ${pre}${x.src} ${x.w}w`; };
  /* 이 <img> 바로 앞의 이미지 자리 이름(data-slot) — 닫힌 figure를 넘어가지 않음 */
  const slotAt = (h, i) => { const back = h.slice(Math.max(0, i - 900), i); const k = back.lastIndexOf('data-slot="'); if (k < 0) return /class="[^"]*hp-photo/.test(back.slice(-400)) ? 'hero' : '';
    const tail = back.slice(k); if (/<\/figure>|<\/section>/.test(tail)) return ''; return (/^data-slot="([^"]*)"/.exec(tail) || [])[1] || ''; };

  function tuneSeg(h, home, thumb) {
    const C = []; const re = /<img\b[^>]*>/gi; let m;
    while ((m = re.exec(h))) { const src = get(m[0], 'src'); const st = src && stockOf(src); if (!st && !(src && MEDIA.test(src))) continue; C.push({ i: m.index, t: m[0], src, st, slot: slotAt(h, m.index) }); }
    if (!C.length) return h;
    /* 첫 화면 사진: 홈에서 hero 자리 첫 사진(없으면 첫 <section> 안의 첫 사진) */
    let lead = null; if (home && !thumb) { lead = C.find(c => c.slot === 'hero') || null;
      if (!lead) { const s1 = h.indexOf('</section>'); if (s1 < 0 || C[0].i < s1) lead = C[0]; } }
    let out = '', p = 0;
    C.forEach(c => { let t = c.t; stat.img++;
      if (thumb && c.st) { t = t.replace(c.src, c.st.pre + c.st.x.src800); t = del(del(t, 'srcset'), 'sizes'); }
      else if (c.st && !has(t, 'srcset')) { const ss = srcsetOf(c.st.x, c.st.pre); if (ss) { t = add(t, `srcset="${ss}" sizes="${SZ[c.slot] || SZ0}"`); stat.srcset++; } }
      if (!has(t, 'decoding')) t = add(t, 'decoding="async"');
      t = del(del(t, 'fetchpriority'), 'loading');
      if (c === lead) { t = add(t, 'loading="eager" fetchpriority="high"'); stat.high++; } else t = add(t, 'loading="lazy"');
      out += h.slice(p, c.i) + t; p = c.i + c.t.length; });
    return out + h.slice(p);
  }
  /* 페이지(<main class="s2pg" id="p-…">)마다 나눠 처리: 첫 화면 우선 사진은 홈에만 */
  function img(h, thumb) { if (typeof h !== 'string' || h.indexOf('<img') < 0) return h;
    try { const re = /<main class="s2pg" id="p-([^"]+)">/g; const cut = []; let m; while ((m = re.exec(h))) cut.push([m.index, m[1]]);
      if (!cut.length) return tuneSeg(h, true, thumb);
      let out = tuneSeg(h.slice(0, cut[0][0]), false, thumb);
      cut.forEach(([i, key], n) => { const e = n + 1 < cut.length ? cut[n + 1][0] : h.length; out += tuneSeg(h.slice(i, e), key === 'home', thumb); });
      return out; } catch (e) { console.error('hpperf img', e); return h; } }
  const thumb = h => img(h, true);

  /* ── CSS 줄이기 ── */
  const KEEP_CLS = /^(smr|lk-[\w-]+|look-[\w-]+|hpt-[\w-]+|pv|on|open|active|cur|sel|is-[\w-]+|hpe-[\w-]+)$/;
  function parse(css) { /* 최상위 · @media 한 겹까지: [{at, sel, body}] — 그 밖(@supports 안의 @media 등)은 통째로 둠 */
    const out = []; let i = 0, n = css.length;
    const block = s => { let d = 0; for (let j = s; j < n; j++) { const ch = css[j]; if (ch === '{') d++; else if (ch === '}') { d--; if (!d) return j; } } return n - 1; };
    while (i < n) { while (css[i] === ' ') i++; if (css.startsWith('/*', i)) { const z = css.indexOf('*/', i); const e2 = z < 0 ? n : z + 2; out.push({ raw: css.slice(i, e2) }); i = e2; continue; } const o = css.indexOf('{', i); if (o < 0) { const rest = css.slice(i).trim(); if (rest) out.push({ raw: rest }); break; }
      const head = css.slice(i, o).trim(); const e = block(o);
      if (/^@media\b/i.test(head) && !/\{[^{}]*\{/.test(css.slice(o + 1, e).replace(/\{[^{}]*\}/g, ''))) { const inner = css.slice(o + 1, e); const R = []; inner.replace(/([^{}]+)\{([^{}]*)\}/g, (_, s, b) => { R.push({ sel: s.trim(), body: b.trim() }); return ''; }); out.push({ at: head, rules: R }); }
      else if (/^@/.test(head) || /\{/.test(css.slice(o + 1, e))) out.push({ raw: css.slice(i, e + 1).trim() });
      else out.push({ sel: head, body: css.slice(o + 1, e).trim() });
      i = e + 1; }
    return out; }
  const live = (sel, C) => sel.split(',').some(x => { x = x.trim(); if (!x || /:(is|where|has|host)\(/.test(x)) return true; const cs = x.replace(/:not\([^)]*\)/g, '').match(/\.([\w-]+)/g) || []; return cs.every(c => { c = c.slice(1); return C.has(c) || KEEP_CLS.test(c); }); });
  function css(src, html) {
    try { if (!src) return src; stat.cssIn += src.length;
      let c = String(src).replace(/\/\*([\s\S]*?)\*\//g, (m, t) => t.length <= 40 && !/[{}\n]/.test(t) ? m : '') /* 짧은 층 표시(예: /* hpimg font *\/)는 남김 */.replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}');
      const C = new Set(); if (html != null) String(html).replace(/class=\\?"([^"\\]*)\\?"/g, (_, v) => { v.split(/\s+/).forEach(k => k && C.add(k)); return ''; });
      const L = parse(c); const useC = html != null && C.size > 0;
      const keep = r => r.body !== '' && (!useC || live(r.sel, C));
      /* 같은 규칙(@media 포함 · 선택자 · 내용)이 여러 번이면 마지막 것만 */
      const key = (at, r) => (at || '') + '|' + r.sel + '{' + r.body + '}'; const last = new Map();
      L.forEach((b, i) => { if (b.rules) b.rules.forEach((r, j) => last.set(key(b.at, r), i + ':' + j)); else if (b.sel) last.set(key('', b), i + ':'); });
      const out = L.map((b, i) => { if (b.raw) return b.raw; if (b.rules) { const R = b.rules.filter((r, j) => keep(r) && last.get(key(b.at, r)) === i + ':' + j); return R.length ? `${b.at}{${R.map(r => `${r.sel}{${r.body}}`).join('')}}` : ''; }
        return keep(b) && last.get(key('', b)) === i + ':' ? `${b.sel}{${b.body}}` : ''; }).join('');
      stat.cssOut += out.length; return out; } catch (e) { console.error('hpperf css', e); return src; } }

  /* ── 연결 ── */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); return img(h); }; window.siteHTML = siteHTML; }
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a);
    try { const hp = r && r.hp; if (HPP.opt.css && hp && typeof hp.css === 'string') { const H = JSON.stringify(Object.assign({}, hp, { css: '' })); hp.css = css(hp.css, H); } } catch (e) { console.error('hpperf snap', e); } return r; }; }
  const HPP = window.HPP = { img, css, thumb, stat, opt: { css: true } };
})();
