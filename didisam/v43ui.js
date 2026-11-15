/* 디디쌤 스튜디오 v43 — 대표 화면 공용 패턴(D1: 홈 · 현황 · 매출 · 수납 · 마일리지 · 시설)
   최종 시안 2판(final2/admin.html)의 패턴을 문자열 렌더 함수로 만든다. 색은 모두 토큰(--c-data · --c-data2 · --c-warn · --c-track · --c-grid · --c-axis · --c-prev)이라 다크 모드가 자동으로 맞는다.
   V4.hero · V4.head · V4.kpi · V4.spark · V4.area · V4.donut · V4.legend · V4.funnel · V4.timeline · V4.empty · V4.chip · V4.ai
   짝 CSS: v43ui.css. 쓰는 법: plan/patterns-d1.md */
'use strict';
(function () {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const N = v => (+v || 0).toLocaleString('ko-KR');
  const uid = () => 'v4' + Math.random().toString(36).slice(2, 8);
  function smooth(P) { if (!P.length) return ''; let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`; for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], cx = ((x0 + x1) / 2).toFixed(1); d += ` C${cx},${y0.toFixed(1)} ${cx},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; } return d; }
  const ICO = { spark: '<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>' };
  const svgI = (k, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k] || ''}</svg>`;
  const icx = (k, s) => (typeof ic === 'function' ? ic(k, s) : '') || svgI(k, s);

  /* 공용 아이콘 보강(없을 때만): 홈 처리 카드 · KPI에 쓰는 것 */
  try { if (typeof IC === 'object') Object.entries({ task: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 13l2 2 4-4"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16" cy="15" r="1.3"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>', file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>', cal: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', room: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/>' }).forEach(([k, v]) => { if (!IC[k]) IC[k] = v; }); } catch (e) { }
  const V4 = {};
  V4.esc = E; V4.n = N;
  /* AI 표시: 그린 반짝이 + 「AI」 라벨 */
  V4.ai = (txt = 'AI') => `<span class="v4-ai">${svgI('spark', 13)}${E(txt)}</span>`;
  /* 상태 칩: tone = ok · warn · bad · off · info · ai */
  V4.chip = (txt, tone = '') => `<span class="v4-chip ${E(tone)}">${tone && tone !== 'off' ? '<i aria-hidden="true"></i>' : ''}${E(txt)}</span>`;

  /* 화면 머리 한 문장 브리핑(밝은 면): eb(작은 머리) · h(문장, <em> 허용) · sub · acts(HTML) · side(HTML) */
  V4.head = o => `<section class="v4-head ${o.cls || ''}" ${o.id ? `id="${o.id}"` : ''}><div class="v4-hl">${o.eb ? `<p class="v4-eb">${o.eb}</p>` : ''}<h2 class="v4-h">${o.h}</h2>${o.sub ? `<p class="v4-sub">${o.sub}</p>` : ''}${o.acts ? `<div class="v4-acts">${o.acts}</div>` : ''}</div>${o.side ? `<div class="v4-hs">${o.side}</div>` : ''}</section>`;
  /* 짙은 그린 메시 히어로: 홈 브리핑 */
  V4.hero = o => `<section class="v4-hero ${o.cls || ''}" ${o.label ? `aria-labelledby="${o.label}"` : ''}><div class="v4-hm">${o.eb ? `<p class="v4-heb"><span class="v4-orb" aria-hidden="true">${svgI('spark', 14)}</span>${o.eb}</p>` : ''}${o.h}${o.body || ''}${o.acts ? `<div class="v4-hac">${o.acts}</div>` : ''}</div>${o.side ? `<div class="v4-hside">${o.side}</div>` : ''}</section>`;
  /* 처리 카드(히어로 오른쪽): [{ic, t, s, n, tone, act, v, q, on}] */
  V4.stack = L => `<div class="v4-stack" role="list">${L.map(x => `<button type="button" role="listitem" class="v4-gc ${x.on ? 'on' : ''}" data-act="${E(x.act || 'chat-q')}" data-v="${E(x.v || x.q || '')}"><span class="v4-gi">${icx(x.ic || 'check', 18)}</span><span class="v4-gt"><b>${E(x.t)}</b><small>${E(x.s || '')}</small></span>${x.tag ? `<span class="v4-gtag">${E(x.tag)}</span>` : `<span class="v4-gn num">${E(x.n)}</span>`}</button>`).join('')}</div>`;

  /* 스파크라인 */
  V4.spark = (D, o = {}) => { D = (D || []).map(Number); if (D.length < 2) D = [0, ...D, 0].slice(-2); const w = o.w || 120, h = o.h || 36, mx = Math.max(...D), mn = Math.min(...D);
    const P = D.map((v, i) => [w * i / (D.length - 1), 3 + (h - 6) * (1 - (v - mn) / ((mx - mn) || 1))]); const id = uid(); const col = o.color || 'var(--c-data)';
    return `<svg class="v4-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="${w}" height="${h}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col};stop-opacity:.28"/><stop offset="1" style="stop-color:${col};stop-opacity:0"/></linearGradient></defs><path d="${smooth(P)} L${w},${h} L0,${h}Z" fill="url(#${id})"/><path d="${smooth(P)}" fill="none" style="stroke:${col}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`; };

  /* KPI 칸: { l, v, u, sub, delta(+/- 숫자 · 문자열), tone(warn · bad · ok), spark:[..], icon, act, av } */
  V4.kpi = o => { const d = o.delta; const dn = typeof d === 'number' ? d : null; const dt = d == null || d === '' ? '' : dn == null ? E(d) : `${dn >= 0 ? '▲' : '▼'} ${Math.abs(dn)}%`;
    return `<article class="v4-kpi ${o.tone || ''}" ${o.w ? `data-w="${E(o.w)}"` : ''}><div class="v4-kl">${o.icon ? icx(o.icon, 16) : ''}<span>${E(o.l)}</span>${dt ? `<em class="v4-dl ${dn != null && dn < 0 ? 'dn' : ''}">${dt}</em>` : ''}</div><p class="v4-kv num"><b>${o.v}</b>${o.u ? `<small>${E(o.u)}</small>` : ''}</p>${o.spark && o.spark.some(v => +v) ? `<div class="v4-ksp">${V4.spark(o.spark, { color: o.tone === 'warn' || o.tone === 'bad' ? 'var(--c-warn)' : 'var(--c-data)' })}</div>` : ''}${o.sub ? `<p class="v4-ks">${o.sub}</p>` : ''}${o.act ? `<button type="button" class="btn sm v4-kb" data-act="${E(o.act)}" data-v="${E(o.av || '')}">${E(o.al || '보기')}</button>` : ''}</article>`; };

  /* 그라데이션 면적 차트 + 툴팁(마우스 · 키보드). data:[숫자], prev:[숫자](점선 비교), labels:[], fmt(v)→문자열, tipL(i)→머리, tip: 처음 보일 점 */
  V4.area = (D, o = {}) => { D = (D || []).map(Number); const n = D.length; if (!n) return ''; const W = 600, H = 300, iw = W, ih = H;
    const all = D.concat((o.prev || []).map(Number)); const raw = Math.max(1, ...all); const mag = Math.pow(10, Math.floor(Math.log10(raw))); const max = o.max || Math.ceil(raw / mag * 1.1) * mag;
    const X = i => (n === 1 ? iw / 2 : iw * i / (n - 1)), Y = v => ih * (1 - v / max); const P = D.map((v, i) => [X(i), Y(v)]); const id = uid(); const fmt = o.fmt || N; const yf = o.yfmt || fmt;
    let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c-data);stop-opacity:.32"/><stop offset="1" style="stop-color:var(--c-data);stop-opacity:0"/></linearGradient></defs>`; let yl = '', xl = '';
    for (let k = 0; k <= 4; k++) { const y = ih * k / 4; g += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" style="stroke:var(--c-grid)" vector-effect="non-scaling-stroke" ${k < 4 ? 'stroke-dasharray="3 5"' : ''}/>`; yl += `<span style="top:${k * 25}%">${E(yf(Math.round(max * (1 - k / 4))))}</span>`; }
    (o.labels || []).forEach((t, i) => { if (t) xl += `<span style="left:${(X(i) / W * 100).toFixed(2)}%">${E(t)}</span>`; });
    if (o.prev && o.prev.length) g += `<path d="${smooth(o.prev.map((v, i) => [X(i), Y(+v)]))}" fill="none" style="stroke:var(--c-prev)" stroke-width="1.75" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/>`;
    g += `<path d="${smooth(P)} L${X(n - 1)},${ih} L${X(0)},${ih}Z" fill="url(#${id})"/><path d="${smooth(P)}" fill="none" style="stroke:var(--c-data)" stroke-width="2.75" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    const tips = D.map((v, i) => ({ x: +(X(i) / W * 100).toFixed(2), y: +(Y(v) / H * 100).toFixed(2), h: o.tipL ? o.tipL(i) : (o.labels || [])[i] || '', v: fmt(v), p: o.prev && o.prev[i] != null ? fmt(+o.prev[i]) : '' }));
    const t0 = o.tip == null ? n - 1 : o.tip; const tp = tips[t0];
    return `<div class="v4-areaw" style="--ah:${o.h || 200}px"><div class="v4-yl num" aria-hidden="true">${yl}</div><div class="v4-area" data-tips="${E(JSON.stringify(tips))}" data-pl="${E(o.prevL || '')}" tabindex="0" role="img" aria-label="${E(o.aria || '추이 차트')}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${g}</svg><i class="v4-vl" style="left:${tp.x}%"></i><i class="v4-dot" style="left:${tp.x}%;top:${tp.y}%"></i><div class="v4-tip ${tp.x > 72 ? 'r' : tp.x < 22 ? 'l' : ''}" style="left:${tp.x}%;top:${tp.y}%"><span>${E(tp.h)}</span><b>${E(tp.v)}</b>${tp.p ? `<small>${E(o.prevL || '비교')} ${E(tp.p)}</small>` : ''}</div></div><div class="v4-xl num" aria-hidden="true">${xl}</div></div>`; };

  /* 도넛: parts [{v, c(색 토큰), l}], { size, w, center(HTML) } */
  V4.donut = (parts, o = {}) => { const s = o.size || 120, w = o.w || 14, r = (s - w) / 2, c = 2 * Math.PI * r; const tot = parts.reduce((a, p) => a + (+p.v || 0), 0); let off = 0;
    let g = `<circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" style="stroke:var(--c-track)" stroke-width="${w}"/>`;
    if (tot) parts.forEach(p => { const l = c * (+p.v || 0) / tot; if (l <= 0) return; const gap = parts.filter(x => +x.v > 0).length > 1 ? 4 : 0; g += `<circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" style="stroke:${p.c}" stroke-width="${w}" stroke-dasharray="${Math.max(l - gap, .1).toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" stroke-linecap="${o.round === false ? 'butt' : 'round'}" transform="rotate(-90 ${s / 2} ${s / 2})"/>`; off += l; });
    return `<div class="v4-donut" style="width:${s}px;height:${s}px"><svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" role="img" aria-label="${E(o.aria || parts.map(p => `${p.l} ${N(p.v)}`).join(', '))}">${g}</svg>${o.center ? `<div class="v4-dc">${o.center}</div>` : ''}</div>`; };
  V4.legend = (parts, fmt = N) => `<ul class="v4-lgd num">${parts.map(p => `<li><i style="background:${p.c}"></i><span>${E(p.l)}</span><b ${p.tone ? `class="${p.tone}"` : ''}>${E(fmt(p.v))}</b></li>`).join('')}</ul>`;

  /* 퍼널: rows [{l, v, s}] — 막대 너비는 첫 줄 대비, 오른쪽에 전 단계 대비 전환율 */
  V4.funnel = (rows, o = {}) => { const top = Math.max(1, +rows[0].v || 0);
    return `<ol class="v4-fun" aria-label="${E(o.aria || '단계별 전환')}">${rows.map((r, i) => { const p = Math.min(100, Math.round((+r.v || 0) / top * 100)); const prev = i ? +rows[i - 1].v || 0 : 0; const cv = i ? (prev ? Math.round((+r.v || 0) / prev * 100) : 0) : null;
      return `<li><div class="v4-fl"><b>${E(r.l)}</b>${r.s ? `<small>${E(r.s)}</small>` : ''}</div><div class="v4-fb"><span style="width:${Math.max(p, 4)}%;--k:${i}"><em class="num">${N(r.v)}${E(o.u || '')}</em></span></div><span class="v4-fc num">${cv == null ? '기준' : cv + '%'}</span></li>`; }).join('')}</ol>`; };

  /* 하루 타임라인: { lo, hi (분), now(분|null), rows:[{n, sub, img, blocks:[{l, s, e, tone(a · b · c · warn), act, v}]}], foot } */
  V4.timeline = o => { const lo = o.lo, hi = o.hi, sp = Math.max(60, hi - lo); const pc = m => ((Math.min(hi, Math.max(lo, m)) - lo) / sp * 100).toFixed(2); const HM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const tk = []; const step = sp > 600 ? 180 : 120; for (let m = lo; m <= hi; m += step) tk.push(`<span style="left:${pc(m)}%">${String(Math.floor(m / 60)).padStart(2, '0')}시</span>`);
    const now = o.now != null && o.now > lo && o.now < hi ? `<i class="v4-now" style="left:${pc(o.now)}%"><em>지금 ${HM(o.now)}</em></i>` : '';
    return `<div class="v4-tl" role="group" aria-label="${E(o.aria || '오늘 타임라인')}"><div class="v4-tr v4-tax"><span></span><div class="v4-tk num">${tk.join('')}</div></div>${o.rows.map(r => `<div class="v4-tr"><div class="v4-tn">${r.img ? `<span class="v4-ph" style="background-image:url(${E(r.img)})"></span>` : `<span class="v4-ph none" aria-hidden="true">${E(String(r.n || '').slice(0, 1))}</span>`}<span><b>${E(r.n)}</b>${r.sub ? `<small class="num">${E(r.sub)}</small>` : ''}</span></div><div class="v4-trk">${(r.blocks || []).map(b => `<${b.act ? 'button type="button"' : 'span'} class="v4-blk ${E(b.tone || 'a')}" style="left:${pc(b.s)}%;width:calc(${((Math.min(hi, b.e) - Math.max(lo, b.s)) / sp * 100).toFixed(2)}% - 3px)" ${b.act ? `data-act="${E(b.act)}" data-v="${E(b.v || '')}"` : ''} title="${E(b.l)} ${HM(b.s)}–${HM(b.e)}" aria-label="${E(b.l)} ${HM(b.s)}–${HM(b.e)}">${(b.e - b.s) / sp >= .09 ? E(b.l) : ''}</${b.act ? 'button' : 'span'}>`).join('')}${now}</div></div>`).join('')}</div>`; };

  /* 빈 상태: 그린 톤 일러스트 + 한 문장 + 주 버튼 1개. art: start · chart · cal · wallet · gift · room */
  const ART = {
    start: '<rect x="34" y="40" width="132" height="86" rx="14" class="a1"/><rect x="48" y="56" width="58" height="10" rx="5" class="a3"/><rect x="48" y="74" width="92" height="8" rx="4" class="a2"/><rect x="48" y="90" width="72" height="8" rx="4" class="a2"/><circle cx="150" cy="44" r="20" class="a4"/><path d="M150 34l2.6 6.8 6.8 2.6-6.8 2.6L150 52.8l-2.6-6.8-6.8-2.6 6.8-2.6z" class="a5"/>',
    chart: '<rect x="30" y="34" width="140" height="96" rx="16" class="a1"/><path d="M46 112 L72 92 L94 100 L120 70 L152 58" class="ln"/><path d="M46 112 L72 92 L94 100 L120 70 L152 58 L152 118 L46 118Z" class="a2"/><circle cx="152" cy="58" r="6" class="a4"/>',
    cal: '<rect x="38" y="34" width="124" height="98" rx="16" class="a1"/><rect x="38" y="34" width="124" height="24" rx="12" class="a3"/><g class="a2"><rect x="54" y="70" width="18" height="14" rx="4"/><rect x="80" y="70" width="18" height="14" rx="4"/><rect x="106" y="70" width="18" height="14" rx="4"/><rect x="54" y="92" width="18" height="14" rx="4"/><rect x="80" y="92" width="18" height="14" rx="4"/></g><rect x="106" y="92" width="40" height="14" rx="7" class="a4"/>',
    wallet: '<rect x="34" y="46" width="132" height="82" rx="16" class="a1"/><rect x="34" y="46" width="132" height="22" rx="11" class="a3"/><rect x="118" y="82" width="48" height="26" rx="13" class="a2"/><circle cx="132" cy="95" r="5" class="a4"/>',
    gift: '<rect x="46" y="64" width="108" height="66" rx="12" class="a1"/><rect x="40" y="50" width="120" height="22" rx="8" class="a3"/><rect x="94" y="50" width="12" height="80" class="a4"/><path d="M100 50c-10-18-30-14-26-2 3 8 18 4 26 2zm0 0c10-18 30-14 26-2-3 8-18 4-26 2z" class="a2"/>',
    room: '<rect x="30" y="44" width="140" height="86" rx="14" class="a1"/><rect x="44" y="60" width="40" height="56" rx="8" class="a3"/><rect x="94" y="60" width="62" height="24" rx="8" class="a2"/><rect x="94" y="92" width="44" height="24" rx="8" class="a4"/>'
  };
  V4.art = k => `<svg class="v4-art" viewBox="0 0 200 150" aria-hidden="true"><ellipse cx="100" cy="138" rx="78" ry="8" class="a0"/>${ART[k] || ART.start}</svg>`;
  V4.empty = o => `<div class="v4-empty ${o.cls || ''}">${V4.art(o.art)}<p class="v4-et">${E(o.t)}</p>${o.d ? `<p class="v4-ed">${E(o.d)}</p>` : ''}${o.act ? `<button type="button" class="btn pri" data-act="${E(o.act)}" data-v="${E(o.v || '')}" ${o.key ? `data-key="${E(o.key)}"` : ''}>${E(o.l)}</button>` : ''}</div>`;

  /* 면적 차트 툴팁: 마우스 · 터치 · 키보드(←→) */
  function tipAt(el, i) { let T; try { T = JSON.parse(el.dataset.tips); } catch (e) { return; } i = Math.max(0, Math.min(T.length - 1, i)); el.dataset.i = i; const t = T[i];
    const tip = el.querySelector('.v4-tip'), dot = el.querySelector('.v4-dot'), vl = el.querySelector('.v4-vl'); if (!tip) return;
    tip.style.left = dot.style.left = vl.style.left = t.x + '%'; tip.style.top = dot.style.top = t.y + '%';
    tip.innerHTML = `<span>${E(t.h)}</span><b>${E(t.v)}</b>${t.p ? `<small>${E(el.dataset.pl || '비교')} ${E(t.p)}</small>` : ''}`; tip.classList.toggle('r', t.x > 72); tip.classList.toggle('l', t.x < 22); }
  const near = (el, cx) => { let T; try { T = JSON.parse(el.dataset.tips); } catch (e) { return 0; } const r = el.getBoundingClientRect(); const x = (cx - r.left) / r.width * 100; let b = 0; T.forEach((t, i) => { if (Math.abs(t.x - x) < Math.abs(T[b].x - x)) b = i; }); return b; };
  document.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('.v4-area'); if (el) tipAt(el, near(el, e.clientX)); }, { passive: true });
  document.addEventListener('keydown', e => { const el = e.target.closest && e.target.closest('.v4-area'); if (!el || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); let T = []; try { T = JSON.parse(el.dataset.tips); } catch (x) { } tipAt(el, (el.dataset.i != null ? +el.dataset.i : T.length - 1) + (e.key === 'ArrowLeft' ? -1 : 1)); });

  /* 시설 · 보상 대체 사진(CC0 스톡, img/stock): 이름 낱말로 고른다 */
  const PH = [[/촬영|스튜디오|영상/, 'cam-07'], [/강의|교실|세미나|실습/, 'cls-03'], [/스터디|회의|상담|룸/, 'off-02'], [/독서|도서|열람|교재|책/, 'lib-03'], [/체육|헬스|수영|코트|운동|요가/, 'spo-01'], [/빔|프로젝터|장비|노트북|태블릿|대여/, 'dsk-02'], [/특강|강연|우선/, 'lec-01'], [/할인|쿠폰|장학|학원비/, 'sem-01']];
  V4.photo = (name, def = 'off-01') => `img/stock/${(PH.find(([re]) => re.test(String(name || ''))) || [0, def])[1]}.webp`;
  window.V4 = V4;
})();
