/* v34.5 hpfontpick — 폰트 엔지니어 F2 (fix6/BRIEF6.md)
   대표님(2026-11-08): "폰트가 너무 별로다. … 홈페이지 폰트 디자인 보강을 해."
   1) window.HPF — 저장소 분할 웹폰트(tools/fonts/build.py → didisam/fonts/<id>/) · CDN 원본 글꼴의 목록과 연결
      · @font-face는 사이트 CSS에 넣지 않는다(한글 분할 @font-face는 글꼴 하나에 수십 KB라 safeCSS 200,000자 한도에 걸림).
        미리보기 문서에는 <link rel=stylesheet>와 첫 화면 제목 조각 preload를 넣고, 게시 CSS에는 표식 :root{--hpf:"…"}만 남긴다.
        게시된 학습자 홈은 lmerge.js가 표식을 읽어 문서 머리에 같은 link · preload를 붙인다.
      · 기존 2,350자 서브셋(Noto Serif KR · Gowun Dodum)은 분할본으로 대체. Gaegu · Black Han Sans는 저장 데이터 호환용(legacy)으로 hpdir가 그대로 낸다.
   2) 편집기 글꼴 고르기 — 바로 고치기 툴바(hpimg)의 글꼴 팝업을 '조합(제목+본문)' 중심으로 바꾸고, 실제 사이트 제목 · 문장으로 미리 보여 준다.
      데이터는 hpimg와 같다: S.site.font = { h, b } · section.data.sty[경로].ff (기존 키 sans · serif · round · hand · mono · display 호환)
   인터페이스: window.HPF = { list, pairs, get(id), id(key), css(id), href(id), faces(id), need(site, html), pre(site, html), load(), panel(host, opt) } */
'use strict';
(() => {
  const CDN_PRE = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
  /* Wanted Sans: 정적 굵기별 split(조각 평균 13KB) — 가변 split(평균 24KB)보다 제목 1~2굵기에서 가볍다 */
  const CDN_WS = ['Medium', 'Bold', 'ExtraBold'].map(w => `https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/static/split/WantedSans-${w}.min.css`);
  const G = ",'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", SR = ",'Noto Serif CJK KR','AppleMyungjo','Batang',serif";
  /* self: 저장소 분할본(fonts/<id>/font.css) · cdn: 원저작자 배포본 그대로(RFN 있는 글꼴은 분할하지 않는다) · legacy: 기존 2,350자 파일(hpdir가 냄) */
  const list = [
    { id: 'pretendard', name: '프리텐다드', kind: 'sans', fam: 'Pretendard Variable', w: [400, 500, 600, 700, 800], src: 'cdn', href: CDN_PRE, css: "'Pretendard Variable',Pretendard" + G, lic: 'OFL-1.1(RFN Pretendard · 원본 배포)', key: 'sans' },
    /* v34.5 H4(R2 H7): 원티드 산스는 프리텐다드와 거의 구분되지 않아 조합표 · 고르기에서 뺀다. 이미 고른 사이트만 그대로 그린다(legacy) */
    { id: 'wanted-sans', name: '원티드 산스', kind: 'sans', fam: 'Wanted Sans', w: [500, 700, 800], src: 'cdn', href: CDN_WS, css: "'Wanted Sans','Pretendard Variable',Pretendard" + G, lic: 'OFL-1.1(RFN Wanted Sans · 원본 배포)', legacy: 1 },
    /* v34.5 H4: 라인 시드(기하형 고딕 · 원형 ㅇ) — 고딕 제목의 개성 · 따뜻한 테마 제목(굵기 400 · 700). OFL 1.1, RFN 없음 → 저장소 분할 */
    { id: 'line-seed-kr', name: '라인 시드', kind: 'sans', fam: 'LINE Seed Sans KR', w: [400, 700], src: 'self', css: "'LINE Seed Sans KR','LINE Seed Sans KR Fallback','Pretendard Variable',Pretendard" + G, lic: 'OFL-1.1' },
    { id: 'noto-serif-kr', name: '노토 세리프', kind: 'serif', fam: 'Noto Serif KR', w: [400, 700], src: 'self', css: "'Noto Serif KR','Noto Serif KR Fallback'" + SR, lic: 'OFL-1.1', key: 'serif' },
    { id: 'hahmlet', name: '함렛', kind: 'display', fam: 'Hahmlet', w: [600, 700], src: 'self', css: "'Hahmlet','Hahmlet Fallback','Noto Serif KR'" + SR, lic: 'OFL-1.1' },
    { id: 'gowun-dodum', name: '고운돋움', kind: 'round', fam: 'Gowun Dodum', w: [400], src: 'self', css: "'Gowun Dodum','Gowun Dodum Fallback',ui-rounded" + G, lic: 'OFL-1.1', key: 'round' },
    { id: 'do-hyeon', name: '도현', kind: 'display', fam: 'Do Hyeon', w: [400], src: 'self', css: "'Do Hyeon','Do Hyeon Fallback','Pretendard Variable',Pretendard" + G, lic: 'OFL-1.1' },
    { id: 'black-han-sans', name: '검은고딕', kind: 'display', fam: 'Black Han Sans', w: [400], src: 'legacy', css: "'Black Han Sans','Do Hyeon',Pretendard" + G, lic: 'OFL-1.1', key: 'display', legacy: 1 },
    { id: 'gaegu', name: '개구', kind: 'hand', fam: 'Gaegu', w: [400, 700], src: 'legacy', css: "'Gaegu','Nanum Pen Script',cursive", lic: 'OFL-1.1', key: 'hand', legacy: 1 }];
  const BY = Object.fromEntries(list.map(f => [f.id, f]));
  const KEY = { sans: 'pretendard', serif: 'noto-serif-kr', round: 'gowun-dodum', display: 'black-han-sans', hand: 'gaegu' };
  const id = k => (k && BY[k] ? k : KEY[k] || null);
  const get = k => BY[id(k)] || null;
  /* font.css 내용 해시(tools/fonts/build.py가 마지막에 출력) — 다시 빌드하면 이 값을 바꾼다(서비스 워커 저장본 교체) */
  const V = {"do-hyeon": "12f77a9f", "noto-serif-kr": "ea0bde31", "gowun-dodum": "58c173de", "hahmlet": "724db3e4", "line-seed-kr": "1c8636ab"};
  const href = k => { const f = get(k); return !f ? '' : f.src === 'self' ? `fonts/${f.id}/font.css${V[f.id] ? '?v=' + V[f.id] : ''}` : f.src === 'cdn' ? f.href : ''; };
  const css = k => (get(k) || {}).css || '';
  /* 조합(제목 + 본문) 기본 8종 — F1이 HPFT.pairs로 덮어쓴다 */
  const PAIRS = [
    { id: 'p-clean', name: '기본 고딕', hd: 'pretendard', bd: 'pretendard', note: '어디에나 무난 · 가장 가벼움' },
    { id: 'p-modern', name: '모던 고딕', hd: 'line-seed-kr', bd: 'pretendard', note: '테크 · 부트캠프 · 기업' },
    { id: 'p-serif', name: '단정한 명조 제목', hd: 'noto-serif-kr', bd: 'pretendard', note: '대학 · 교수학습 · 공공' },
    { id: 'p-grand', name: '격조 있는 제목', hd: 'hahmlet', bd: 'pretendard', note: '프리미엄 · 대학원 · 아카데미' },
    { id: 'p-read', name: '읽는 명조', hd: 'noto-serif-kr', bd: 'noto-serif-kr', note: '인문 · 독서논술 · 긴 글' },
    { id: 'p-warm', name: '따뜻한 돋움', hd: 'gowun-dodum', bd: 'pretendard', note: '평생교육 · 시니어 · 유아' },
    { id: 'p-round', name: '부드러운 둥근', hd: 'gowun-dodum', bd: 'gowun-dodum', note: '학원 · 키즈 · 친근함' },
    { id: 'p-poster', name: '굵은 포스터 제목', hd: 'do-hyeon', bd: 'pretendard', note: '학원 홍보 · 이벤트' }];
  const pairs = () => { try { const P = window.HPFT && (typeof HPFT.pairs === 'function' ? HPFT.pairs() : HPFT.pairs); if (Array.isArray(P) && P.length) return P.filter(p => p && get(p.hd) && get(p.bd)); } catch (e) { } return PAIRS; };

  /* ── 데이터 로드(조각 목록 · 글자 → 조각): 미리 받기 계산용. 못 받아도 글꼴은 그대로 동작 ── */
  let MAN = null, SL = null, CH = null; const TXT = {};
  function load() {
    if (load.p) return load.p; if (typeof fetch !== 'function') return Promise.resolve();
    load.p = Promise.all([fetch('fonts/hpf.json').then(r => r.ok ? r.json() : null).then(j => { MAN = j; }).catch(() => { }),
      fetch('fonts/slices.json').then(r => r.ok ? r.json() : null).then(j => { if (j && Array.isArray(j.s)) { SL = j.s; CH = new Map(); SL.forEach((s, i) => { for (const c of s) CH.set(c, i); }); } }).catch(() => { })]);
    return load.p; }
  /* 호환: @font-face 문자열(받아 둔 font.css가 있을 때만 · url은 절대 경로로) */
  function faces(k) { const f = get(k); if (!f || f.src !== 'self') return ''; if (TXT[f.id]) return TXT[f.id];
    if (typeof fetch === 'function') fetch(href(f.id)).then(r => r.text()).then(t => { const b = abs(`fonts/${f.id}/`); TXT[f.id] = t.replace(/url\('(?!https?:)([^']+)'\)/g, (m, u) => `url('${b}${u}')`); }).catch(() => { });
    return ''; }
  const abs = u => { try { return /^https?:/.test(u) ? u : new URL(u, document.baseURI).href; } catch (e) { return u; } };

  /* ── 이 사이트가 쓰는 글꼴: 최종 HTML · CSS에 나온 family 이름 + 사이트 데이터 + F1(HPFT) ── */
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RX = list.map(f => [f.id, new RegExp(`['"]${esc(f.fam)}['"]`)]);
  /* 주 글꼴만 센다: font-family 값 · CSS 변수 값의 '첫 번째 이름'(폴백 위치의 이름은 빼서 전송량을 줄임 — F1 요청).
     단, 원본 글자 수가 모자란 제목 글꼴은 빠진 음절을 그릴 글꼴을 함께 건다(함렛 → 노토 세리프). 도현 → Pretendard는 문서에 이미 있음. */
  const GAP = { hahmlet: 'noto-serif-kr' };
  const byFam = n => { n = String(n || '').trim().replace(/^['"]|['"]$/g, ''); return (list.find(f => f.fam === n) || (/^Pretendard/.test(n) ? BY.pretendard : /^Wanted Sans/.test(n) ? BY['wanted-sans'] : null) || {}).id || null; };
  function need(s, html) { const K = new Set();
    if (typeof html !== 'string') { try { html = String(base0 ? base0(s, true, 'ko') : ''); } catch (e) { html = ''; } }
    const H = html.replace(/&quot;|&#34;|&#39;/g, "'");
    /* v34.5 FZ(FIXLIST 24): CSS 변수 정의(--x: 'Noto Serif KR')는 세지 않고, font-family(· font 줄임) 값에서 var(--x)로 실제로 참조된 변수만 따라가 센다
       — 예전에는 --hpl-serif 정의만으로 고딕 사이트 144곳 중 100곳에 노토 세리프 CSS(89KB)가 붙었다 */
    const DEF = new Map(); for (const m of H.matchAll(/(--[\w-]+)\s*:\s*([^;{}<>]+)/g)) { if (!DEF.has(m[1])) DEF.set(m[1], []); DEF.get(m[1]).push(m[2]); }
    const seen = new Set();
    const val = (v, dep) => { v = String(v || '').trim(); if (!v || dep > 6) return;
      if (/^var\(/.test(v)) { let lv = 0, end = -1; for (let i = 3; i < v.length; i++) { if (v[i] === '(') lv++; else if (v[i] === ')' && --lv === 0) { end = i; break; } }
        const inner = v.slice(4, end < 0 ? v.length : end); const c = inner.indexOf(','); const nm = (c < 0 ? inner : inner.slice(0, c)).trim(); const fb = c < 0 ? '' : inner.slice(c + 1);
        const D = DEF.get(nm); if (D && D.length) { if (!seen.has(nm)) { seen.add(nm); D.forEach(x => val(x, dep + 1)); } } else val(fb, dep + 1); return; }
      const first = v.split(',')[0]; if (!/['"A-Za-z]/.test(first)) return; const k = byFam(first); if (k) K.add(k); };
    for (const m of H.matchAll(/font-family\s*:\s*([^;{}<>]+)/g)) val(m[1], 0);
    for (const m of H.matchAll(/[{;\s"']font\s*:\s*([^;{}<>]+)/g)) { for (const r of m[1].matchAll(/var\(\s*--[\w-]+[^)]*\)?/g)) val(r[0], 0); const q = /(['"])([^'"]+)\1/.exec(m[1]); if (q) val(q[0], 0); }
    const f = s && s.font && typeof s.font === 'object' ? s.font : {}; ['h', 'b'].forEach(x => { const k = id(f[x]); if (k) K.add(k); });
    try { const J = JSON.stringify([s && s.sections, ((s && s.menus) || []).map(m => m.sections)]); (J.match(/"ff":"([\w-]+)"/g) || []).forEach(m => { const k = id(m.slice(6, -1)); if (k) K.add(k); }); } catch (e) { }
    try { if (window.HPFT && typeof HPFT.need === 'function') (HPFT.need(s) || []).forEach(x => { const k = id(x); if (k) K.add(k); }); } catch (e) { }
    [...K].forEach(k => { if (GAP[k]) K.add(GAP[k]); });
    return [...K]; }
  /* 첫 화면 제목 글꼴(id) · 굵기 */
  function heading(s, html) { const f = s && s.font || {}; if (id(f.h)) return id(f.h);
    try { const p = window.HPFT && HPFT.pair && HPFT.pair(s); if (p && id(p.hd)) return id(p.hd); } catch (e) { }
    const m = [...String(html || '').matchAll(/--hd-ff:\s*([^;}]+)/g)].pop(); if (m) { const k = byFam(m[1].split(',')[0]); if (k) return k; }
    return null; }
  /* 미리 받기: 첫 화면 제목 글자를 가장 많이 담은 조각 1~2개(저장소 분할본만) */
  function pre(s, html) { const k = heading(s, html); const f = get(k); if (!f || f.src !== 'self' || !CH) return [];
    const m = String(html || '').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i); if (!m) return [];
    const t = m[1].replace(/<[^>]+>/g, '').replace(/&[#\w]+;/g, ''); const cnt = new Map(); for (const c of t) { const i = CH.get(c); if (i != null) cnt.set(i, (cnt.get(i) || 0) + 1); }
    const w = Math.max(...f.w); const have = MAN && MAN[f.id] && MAN[f.id].w && MAN[f.id].w[String(w)]; const ok = i => !have || have.n.includes(i);
    /* 조각 주소는 font.css와 똑같아야(?h= 포함) 미리 받은 파일을 다시 받지 않는다 → 목록(hpf.json)이 있을 때만 */
    if (!have || !Array.isArray(have.h)) return [];
    return [...cnt.entries()].filter(([i]) => ok(i)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => `fonts/${f.id}/${w}-${i}.woff2?h=${have.h[have.n.indexOf(i)]}`); }

  /* ── siteHTML 연결(가장 바깥 래퍼): 미리보기 문서 머리에 link · preload, 게시 CSS에 표식 ── */
  let base0 = null;
  if (typeof siteHTML === 'function') { const base = base0 = siteHTML; siteHTML = (s, full, lang) => { let h = base(s, full, lang);
    try { if (typeof h !== 'string' || !h.includes('</style>')) return h;
      /* 미리보기 문서의 Pretendard: 전체 가변 글꼴(약 2MB) 대신 같은 배포본의 dynamic-subset(쓰는 글자 조각만) */
      h = h.replace('pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css', 'pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
      const ids = need(s, h); const L = [].concat(...ids.map(href)).filter(Boolean); const P = pre(s, h);
      if (!L.length) return h;
      const mark = `:root{--hpf:"${L.filter(u => !u.includes('orioncactus/pretendard')).join('|')}";--hpf-pre:"${P.join('|')}"}`;
      h = h.replace('</style>', mark + '</style>');
      const tags = L.filter(u => !u.includes('orioncactus/pretendard')).map(u => `<link rel="stylesheet" href="${abs(u)}" data-hpf>`).join('') + P.map(u => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${abs(u)}" data-hpf>`).join('');
      h = h.includes('</head>') ? h.replace('</head>', tags + '</head>') : h;
      /* 같은 출처 글꼴: style-src · font-src에 'self'와 실제 출처를 함께(srcdoc · blob 문서 모두) */
      const O = (typeof location !== 'undefined' && /^https?:/.test(location.origin)) ? ' ' + location.origin : '';
      const add = (h0, d) => h0.replace(new RegExp(`(<meta http-equiv="Content-Security-Policy" content="[^"]*?${d} )([^;"]*)`), (m, a, b) => `${a}${/'self'/.test(b) ? '' : "'self' "}${O && !b.includes(O.trim()) ? O.trim() + ' ' : ''}${b}`);
      if (L.some(u => !/^https?:/.test(u))) h = add(add(h, 'style-src'), 'font-src');
      return h; } catch (e) { console.error('HPF siteHTML', e); return h; } }; window.siteHTML = siteHTML; }

  /* ── hpdir 연결: Noto Serif KR · Gowun Dodum의 2,350자 파일 대신 분할본(같은 family 이름) — legacy만 hpdir가 낸다 ── */
  try { if (window.HPD && HPD.FONTS) { delete HPD.FONTS.serif; delete HPD.FONTS.round; const st = document.getElementById('hpdir-ff'); if (st) st.textContent = HPD.faces(Object.keys(HPD.FONTS)); } } catch (e) { }
  /* ── hpimg 연결: 글꼴 후보에 새 글꼴을 더하고(같은 배열), 기존 키의 family 문자열에 크기 보정 폴백을 붙인다 ── */
  try { if (window.HPI && Array.isArray(HPI.fonts)) { const F = HPI.fonts;
    F.forEach(r => { const f = get(r[0]); if (f && f.src === 'self') r[2] = f.css; });
    list.filter(f => !f.key).forEach(f => { if (!F.some(r => r[0] === f.id)) F.push([f.id, f.name, f.css]); }); } } catch (e) { }

  /* ═════════ 편집기 글꼴 고르기 ═════════ */
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const cur = () => { try { return typeof site === 'function' ? site() : (window.S && S.site) || {}; } catch (e) { return {}; } };
  /* 스튜디오 문서에 글꼴 CSS를 한 번만 붙인다(견본 글자 조각만 내려받음) */
  function studioFonts() { if (typeof document === 'undefined' || studioFonts.done) return; studioFonts.done = 1;
    list.forEach(f => [].concat(href(f.id)).filter(Boolean).forEach(u => { if (document.querySelector(`link[data-hpf="${u}"]`) || (f.id === 'pretendard' && document.querySelector('link[href*="pretendard"]'))) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = u; l.dataset.hpf = u; document.head.appendChild(l); })); }
  const strip = t => String(t || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  function sample(s) { const secs = (s && s.sections) || []; const b = (secs.find(x => x.type === 'banner') || {}).data || {};
    const org = (window.S && S.org && S.org.name) || '우리 기관';
    const t = strip(b.title) || org; let p = strip(b.sub);
    if (!p) { const x = secs.find(y => y.type === 'text' && y.data && (y.data.body || y.data.desc)); p = x ? strip(x.data.body || x.data.desc) : ''; }
    return { t: t.slice(0, 34), p: (p || `${org}의 강좌와 소식을 한곳에서 확인하세요.`).slice(0, 70) }; }
  const keyOf = k => (get(k) || {}).key || id(k); /* 저장은 기존 키 우선(sans · serif · round …) — hpimg · 기존 데이터와 호환 */
  const same = (a, b) => id(a || 'sans') === id(b || 'sans');
  function pairHTML(s) { const sm = sample(s); const f = s.font || {};
    return `<div class="hpf-pairs" role="list">${pairs().map(p => { const on = same(f.h, p.hd) && same(f.b, p.bd);
      return `<button type="button" role="listitem" class="hpf-pair${on ? ' on' : ''}" data-hpf="pair" data-v="${E(p.id)}" aria-pressed="${on}">
        <span class="hpf-t" style="font-family:${E(css(p.hd))};font-weight:${p.hw || Math.max(...(get(p.hd).w.filter(w => w <= 800)))}">${E(sm.t)}</span>
        <span class="hpf-p" style="font-family:${E(css(p.bd))}">${E(sm.p)}</span>
        <span class="hpf-m"><b>${E(p.name)}</b><small>${E(get(p.hd).name)}${p.hd === p.bd ? '' : ` + ${E(get(p.bd).name)}`}${p.note ? ` · ${E(p.note)}` : ''}</small></span></button>`; }).join('')}</div>`; }
  function oneHTML(s, scope, text, now) { const L = list.filter(f => !f.legacy || id(now) === f.id);
    const rows = L.map(f => { const on = id(now || 'sans') === f.id; return `<button type="button" data-hpi="ffv" data-v="${E(f.key || f.id)}" class="hpf-one${on ? ' on' : ''}" aria-pressed="${on}"><span style="font-family:${E(f.css)};font-weight:${scope === 'b' ? 400 : Math.max(...f.w.filter(w => w <= 800))}">${E(text)}</span><small>${E(f.name)}</small></button>`; }).join('');
    return `<div class="hpf-ones">${rows}<button type="button" data-hpi="ffv" data-v="mono" class="hpf-one${now === 'mono' ? ' on' : ''}"><span style="font-family:ui-monospace,Menlo,Consolas,monospace">${E(text)}</span><small>모노</small></button></div>`; }
  function popHTML() { const HI = window.HPI; const s = cur(); const sel = HI && HI.sel; const scope = (HI && HI.ffs) || 'pair'; const sf = s.font || {};
    const seg = [['pair', '조합'], ['el', '이 글자만'], ['h', '사이트 제목'], ['b', '사이트 본문']].map(([k, l]) => `<button type="button" data-hpi="ffs" data-v="${k}" aria-pressed="${scope === k}" class="${scope === k ? 'on' : ''}">${l}</button>`).join('');
    const sm = sample(s); const elText = sel && sel.el ? strip(sel.el.textContent).slice(0, 26) : '';
    const body = scope === 'pair' ? pairHTML(s) : scope === 'el' ? oneHTML(s, 'el', elText || sm.t, curFF()) : oneHTML(s, scope, scope === 'h' ? sm.t : sm.p.slice(0, 30), sf[scope]);
    return `<div class="hpi-seg" role="group" aria-label="바꿀 범위">${seg}</div>${body}<p class="hpi-note">${scope === 'pair' ? '제목과 본문 글꼴을 함께 바꿉니다. 게시본에도 같은 글꼴이 나옵니다.' : scope === 'el' ? '고른 글자 하나에만 적용됩니다.' : '사이트 전체에 적용됩니다.'}</p>`; }
  /* 고른 글자에 지금 그려진 글꼴(계산된 font-family 첫 이름 → id) */
  function curFF() { const HI = window.HPI; const el = HI && HI.sel && HI.sel.el; if (!el) return ''; try { const ff = el.ownerDocument.defaultView.getComputedStyle(el).fontFamily || ''; const first = (ff.match(/^\s*['"]?([^,'"]+)/) || [])[1] || ''; const f = list.find(x => x.fam === first.trim() || (x.id === 'pretendard' && /^Pretendard/.test(first))); return f ? f.id : /mono|Menlo|Consolas/i.test(first) ? 'mono' : ''; } catch (e) { return ''; } }
  function applyPair(pid) { const p = pairs().find(x => x.id === pid); if (!p) return; const s = cur(); if (!s) return;
    try { if (typeof hpPush === 'function') hpPush(); } catch (e) { }
    const n = { ...(s.font && typeof s.font === 'object' ? s.font : {}) }; const h = keyOf(p.hd), b = keyOf(p.bd);
    if (h === 'sans') delete n.h; else n.h = h; if (b === 'sans') delete n.b; else n.b = b;
    if (Object.keys(n).length) s.font = n; else delete s.font;
    try { if (typeof save === 'function') save(); } catch (e) { }
    try { if (window.HPE && HPE.on && typeof window.hpPaint === 'function') window.hpPaint(); else if (typeof render === 'function') render(); } catch (e) { }
    try { toast(`글꼴 조합을 「${p.name}」(으)로 바꿨습니다.`, 'ok'); } catch (e) { }
    paintPop(); }
  /* hpimg 툴바의 글꼴 팝업(.hpi-ffp)을 다시 그릴 때마다 조합 미리보기로 바꾼다 */
  function paintPop() { if (!studioFonts.done && document.querySelector('.hpi-tb')) studioFonts(); /* 툴바가 처음 뜰 때 글꼴 CSS만 미리(조각은 견본을 그릴 때 받음) */
    document.querySelectorAll('.hpi-ffp').forEach(el => { studioFonts(); const h = popHTML(); if (el.dataset.hpfH === h) return; el.innerHTML = h; el.dataset.hpfH = h; el.classList.add('hpf-pop'); }); }
  if (typeof document !== 'undefined' && typeof MutationObserver === 'function') {
    let q = 0; const mo = new MutationObserver(() => { if (q) return; q = 1; Promise.resolve().then(() => { q = 0; mo.disconnect(); try { paintPop(); } finally { obs(); } }); });
    const obs = () => { if (document.body) mo.observe(document.body, { childList: true, subtree: true }); };
    if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-hpf="pair"]'); if (!b) return; e.preventDefault(); e.stopPropagation(); if (b.closest('.hpf-panel')) { applyPair(b.dataset.v); const pn = b.closest('.hpf-panel'); if (pn && pn.__hpfOpt) panel(pn, pn.__hpfOpt); return; } applyPair(b.dataset.v); }, true);
    document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.hpf-pop')) e.preventDefault(); }, true);
    const st = document.createElement('style'); st.id = 'hpf-css'; st.textContent = `
.hpi-tb .hpi-ffp.hpf-pop{width:min(452px,calc(100vw - 16px));max-height:min(430px,56vh);overflow:auto;overscroll-behavior:contain}
.hpf-pairs,.hpf-ones{display:grid;gap:6px}
.hpi-tb .hpf-pair,.hpf-panel .hpf-pair{display:grid;grid-template-columns:minmax(0,1fr);gap:5px;justify-items:start;text-align:left;white-space:normal;min-height:0;padding:12px 14px 11px;border-radius:10px;cursor:pointer}
.hpi-tb .hpf-pair{background:rgba(255,255,255,.06);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.hpi-tb .hpf-pair:hover{background:rgba(255,255,255,.11)}.hpi-tb .hpf-pair.on{background:rgba(125,144,249,.26);box-shadow:inset 0 0 0 1.5px #9AA8FB}
.hpf-pair .hpf-t{display:block;max-width:100%;font-size:21px;line-height:1.22;letter-spacing:-.02em;word-break:keep-all;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hpf-pair .hpf-p{display:-webkit-box;max-width:100%;font-size:13.5px;line-height:1.6;font-weight:400;letter-spacing:-.005em;word-break:keep-all;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.hpi-tb .hpf-pair .hpf-p{color:#C9CBD1}
.hpf-pair .hpf-m{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-top:1px;width:100%;font:12px/1.4 "Pretendard Variable",Pretendard,system-ui,sans-serif}
.hpf-pair .hpf-m b{font-weight:700}.hpi-tb .hpf-pair .hpf-m small{color:#A9ACB5;font-size:12px}
.hpi-tb .hpf-one{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;padding:8px 12px;border-radius:9px;background:rgba(255,255,255,.06);white-space:nowrap}
.hpi-tb .hpf-one:hover{background:rgba(255,255,255,.11)}.hpi-tb .hpf-one.on{background:rgba(125,144,249,.26);box-shadow:inset 0 0 0 1.5px #9AA8FB}
.hpf-one span{min-width:0;font-size:19px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em}.hpi-tb .hpf-one small{flex:none;font:12px "Pretendard Variable",Pretendard,system-ui,sans-serif;color:#A9ACB5}
.hpi-tb .hpf-pair:focus-visible,.hpi-tb .hpf-one:focus-visible,.hpf-panel .hpf-pair:focus-visible{outline:2px solid #9AA8FB;outline-offset:2px}
.hpf-panel .hpf-pairs{grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.hpf-panel .hpf-pair{border:1px solid #E4E6EC;background:#fff;color:#14161F}.hpf-panel .hpf-pair:hover{border-color:#9AA6F8}.hpf-panel .hpf-pair.on{border-color:#5C74F6;box-shadow:inset 0 0 0 1px #5C74F6;background:#F5F7FF}
.hpf-panel .hpf-pair .hpf-p{color:#4A4F5C}.hpf-panel .hpf-pair .hpf-m small{color:#6B7080}
@media(max-width:700px){.hpf-pair .hpf-t{font-size:19px}}`;
    (document.head || document.documentElement).appendChild(st); }
  /* 디자인 설정(G2 hpgal 등)에서 쓰는 조합 고르기 패널: HPF.panel(host) */
  function panel(host, opt) { if (!host) return; studioFonts(); host.__hpfOpt = opt || {}; host.classList.add('hpf-panel'); host.innerHTML = pairHTML(cur()); }

  window.HPF = { list, pairs, get, id, css, href, faces, need, pre, heading, load, panel, popHTML, applyPair, PAIRS };
  load();
})();
