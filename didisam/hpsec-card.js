/* v34.5 hpsec-card — 강좌 카드 · 강좌 목록 기본 렌더러(디자이너 S2, fix6/BRIEF3.md)
   대표님(2026-11-08): "디자인 수준을 더 올려줘" · "잘 만들어진 사이트 벤치마크를 강화해서 디자인을 대폭 올려."
   - 카드 6종: photo(사진형) · list(목록형) · price(가격 강조) · schedule(일정형: 모집 기간 · D-day) · big(큰 썸네일) · table(표형)
   - 썸네일이 없는 강좌는 HPSTOCK card 슬롯 사진(강좌 이름 · 분류로 장면을 고름). 한 페이지 안에서 같은 사진을 겹쳐 쓰지 않는다
     (첫 화면 · 소개 등 site.img에 이미 쓴 샘플 사진도 뺀다).
   - 그림자 없음: 1px 선 또는 바탕 명도 차로 구분(RULES_B3 §0 · §3 실측 '그림자 0/14').
   - 가격 · 일정 · 정원 · 강사는 강좌 데이터에 있는 것만. 없으면 그 칸(표는 열)을 통째로 숨긴다. 지어낸 값 없음.
   - 강좌 0개: 게시본에서는 숨김(바로 고치기 중에만 안내) · 1개: 가로 대표 카드 · 2개: 넓은 2칸 · 나머지: 칸 수를 개수에 맞추고
     남는 칸은 첫 카드가 넓게 차지(빈칸 없음).
   데이터: classes 섹션 data.card = 'photo' | 'list' | 'price' | 'schedule' | 'big' | 'table'(없으면 테마 · 기관 유형으로 고름), data.n = 자동일 때 개수
   사진 자리: <figure class="hps-img" data-slot="cls-<강좌 id>">(D1 HPL.img 규약과 같음 → D4 클릭 교체 대상), 샘플이면 data-stock="<HPSTOCK id>"
   인터페이스(window.HPS — S1 · S3 · S4와 같이 씀)
     HPS.card(kind, c, o)       강좌 하나의 카드 HTML. o = { s(사이트), n(같이 그리는 개수), span(차지하는 칸), i(순서) }
     HPS.list(kind, L, o)       강좌 목록 HTML(머리 제외). L = 강좌 배열, o = { s, d(섹션 data) }
     HPS.cardCSS(s)             이 부품 CSS(테마 토큰). siteHTML이 테마가 있을 때 <style>에 넣는다 → 미리보기 = 게시본
     HPS.cardKinds              [{ id, name }] · HPS.cardKind(d, s, L) 기본 종류 고르기 · HPS.cardImg(c, s) 강좌 사진(없으면 null)
   CSS 범위: 모두 .hps 아래(HPL 계열 섹션 안에서 써도 계열 CSS와 섞이지 않음). 색은 .hpt의 --a · --at · --ink · --mu · --r · --br을 따른다. */
'use strict';
(() => {
  if (typeof siteHTML !== 'function' || typeof proSec !== 'function') return;
  const HPS = window.HPS = window.HPS || {};

  /* ── 공통 ── */
  const E = v => esc(v == null ? '' : v);
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const term = k => (typeof t === 'function' ? t(k) : k === 'cls' ? '강좌' : k);
  const pubAll = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료');
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const day0 = () => { try { if (typeof today === 'function') return today(); } catch (e) { } const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const okD = v => /^\d{4}-\d{2}-\d{2}/.test(String(v || ''));
  const md = v => okD(v) ? `${+String(v).slice(5, 7)}.${+String(v).slice(8, 10)}` : '';
  const ymd = v => okD(v) ? String(v).slice(0, 10).replace(/-/g, '.') : '';
  const WD = '일월화수목금토';
  const wd = v => okD(v) ? WD[new Date(String(v).slice(0, 10) + 'T00:00:00').getDay()] : '';
  const wonF = n => (Number(n) || 0).toLocaleString('ko-KR');
  const rgb = h => { h = String(h || '#000000'); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
  const fit = (c, bg, min, to) => { min = min || 4.5; to = to || (Lm(bg) > .35 ? '#000000' : '#ffffff'); let x = c; for (let k = 1; k <= 20 && CR(x, bg) < min; k++) x = mix(c, to, k * .05); return x; };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', check: 'M5 12.5l4.5 4.5L19 7.5', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7' };
  const ic = (k, n, w) => `<svg viewBox="0 0 24 24" width="${n || 18}" height="${n || 18}" fill="none" stroke="currentColor" stroke-width="${w || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;
  const tokOf = s => { try { return window.HPT && HPT.tokens ? HPT.tokens(s) : null; } catch (e) { return null; } };

  /* ── 강좌 데이터 → 표시 값(있는 것만) ── */
  const catName = c => { try { if (c.cat && typeof c2CatName === 'function') return c2CatName(c.cat) || ''; } catch (e) { } return ''; };
  const kindName = c => ({ live: '라이브', offline: '오프라인', blend: '블렌디드', sub: '구독', pack: '패키지' })[c.kind] || '온라인';
  const descOf = c => String(c.sub || c.desc || '').replace(/\s+/g, ' ').trim();
  const lesOf = c => (c.curriculum || []).length;
  const hrsOf = c => +c.hours > 0 ? Math.round(+c.hours * 10) / 10 : 0;
  const startOf = c => (c.period && c.period.mode === 'days') ? '' : (okD(c.start) ? c.start : c.period && okD(c.period.start) ? c.period.start : '');
  const endOf = c => (c.period && c.period.mode === 'days') ? '' : (okD(c.end) ? c.end : c.period && okD(c.period.end) ? c.period.end : '');
  const perOf = c => { if (c.period && c.period.mode === 'days' && +c.period.days) return `신청일부터 ${+c.period.days}일`; const a = startOf(c), b = endOf(c); if (!a && !b) return ''; if (a && b && a.slice(0, 4) === b.slice(0, 4)) return `${ymd(a)} ~ ${md(b)}`; return [ymd(a), ymd(b)].filter(Boolean).join(' ~ '); };
  const schedOf = c => { const D = Array.isArray(c.days) ? [...c.days].filter(x => x >= 0 && x <= 6).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) : []; const tm = c.time && c.time.from ? c.time.from + (c.time.to ? '–' + c.time.to : '') : '';
    return [D.length ? D.map(x => WD[x]).join('·') : '', tm].filter(Boolean).join(' '); };
  const capOf = c => { const n = +c.cap || +(c.recruit && c.recruit.cap) || 0; return n > 0 ? n : 0; };
  const tchOf = c => { const a = String(c.teacher || '').trim(); if (a) return a.split(/\s*,\s*/).slice(0, 2).join(', '); const n = ((c.intro || []).map(x => String(x && x.name || '').trim()).filter(Boolean)); return n.slice(0, 2).join(', '); };
  const certOf = c => c.cert === 'auto' || c.cert === 'manual';
  function priceOf(c) { const p = +c.price || 0; if (!p) return { free: true, now: 0, was: 0, off: 0 };
    let now = p; try { if (typeof c2NetPrice === 'function') now = c2NetPrice(c); else { const D = c.discount; if (D && D.on && (!D.until || D.until >= day0())) now = Math.max(0, D.type === 'rate' ? Math.round(p * (100 - Math.min(99, +D.v || 0)) / 100 / 10) * 10 : p - (+D.v || 0)); } } catch (e) { now = p; }
    const off = now < p ? Math.round((1 - now / p) * 100) : 0; return { free: false, now, was: now < p ? p : 0, off, sub: c.kind === 'sub' }; }
  /* 모집 상태 — D-day는 그리는 날 기준. 게시본은 게시 시점에 굳으므로 data-due에 마감일을 남긴다(학습자 화면 갱신은 코어 변경 요청) */
  function recOf(c) { const R = c.recruit || {}; if (!R.on || !okD(R.to)) return null; const t0 = day0();
    if (okD(R.from) && R.from > t0) return { k: 'soon', l: '모집 예정', from: R.from, to: R.to };
    if (R.to >= t0) { const dd = Math.round((Date.parse(R.to.slice(0, 10)) - Date.parse(t0)) / 864e5); return { k: 'open', l: '모집중', dd, from: R.from, to: R.to }; }
    return { k: 'closed', l: '모집 마감', from: R.from, to: R.to }; }
  const ddTxt = r => r && r.k === 'open' ? (r.dd === 0 ? '오늘 마감' : `D-${r.dd}`) : '';
  const recRange = r => r ? [md(r.from), md(r.to)].filter(Boolean).join(' ~ ') : '';
  const href = c => '#p-c-' + c.id;

  /* ── 사진: 강좌 사진 → 샘플 사진(겹침 없음) ── */
  const P = { used: new Set(), map: new Map() };
  const okSrc = v => /^(data:image\/|https?:\/\/|blob:|img\/|\.\/img\/|\/)/.test(String(v || '')) && !/^\/\//.test(String(v || ''));
  const stockIdOf = v => { const m = String((v && v.src) || v || '').match(/img\/stock\/([a-z]{3}-\d{2})(?:-800)?\.webp/); return (v && v.stock) || (m && m[1]) || ''; };
  function resetPhotos(s) { P.used = new Set(); P.map = new Map();
    try { Object.keys((s && s.img) || {}).forEach(k => { const id = stockIdOf(s.img[k]); if (id) P.used.add(id); });
      ((s && s.sections) || []).forEach(x => { const d = (x && x.data) || {}; [d.img, d.src].forEach(v => { const id = stockIdOf(v); if (id) P.used.add(id); }); }); } catch (e) { } }
  function stockFor(c) { const H = window.HPSTOCK; if (!H || typeof H.forScene !== 'function') return null;
    if (P.map.has(c.id)) return P.map.get(c.id);
    const ty = (S.org && S.org.type) || 'adult';
    /* v34.5 H2(R2 N1): 강좌명과 장면이 맞는 사진만(HPSTOCK.forCourse). 맞는 사진이 없으면 null → 사진 없는 글자 타일 */
    let x = null; try { x = typeof H.forCourse === 'function' ? H.forCourse(ty, c.name, { seed: String(c.id), exclude: [...P.used] }) : null; } catch (e) { x = null; }
    if (x) { P.used.add(x.id); P.map.set(c.id, x); } return x; }
  function cardImg(c, s) { const m = s && s.img && s.img['cls-' + c.id];
    if (m && okSrc(m.src)) return { src: m.src, alt: m.alt || c.name || '', pos: /^[\d.]+% [\d.]+%$/.test(m.pos || '') ? m.pos : '50% 50%', fit: m.fit === 'contain' ? 'contain' : 'cover', stock: stockIdOf(m) };
    if (okSrc(c.thumb)) return { src: c.thumb, alt: c.name || '', pos: '50% 50%', fit: 'cover', stock: '' };
    const x = stockFor(c); if (!x) return null; const H = window.HPSTOCK;
    return { src: H.url(x, 'sm'), big: H.url(x), alt: x.alt || '', pos: x.focus || '50% 50%', fit: 'cover', stock: x.id }; }
  const fig = (c, s, o) => { o = o || {}; const m = cardImg(c, s); const extra = o.over || '';
    if (!m) return `<figure class="hps-img is-ph is-ty" data-slot="cls-${E(c.id)}" data-empty="1"><span class="hps-ty-n" aria-hidden="true">${E((/[가-힣A-Za-z]/.exec(String(c.name || '').replace(/^(초등|중등|고등|중\d|고\d|초\d|직장인|성인|어린이|원데이|실무|기초|입문|심화)\s*/, '')) || ['·'])[0].toUpperCase())}</span><span class="hps-ty-w" aria-hidden="true">${E(catName(c) || kindName(c))}</span>${extra}</figure>`;
    const ss = m.big && o.wide ? ` srcset="${E(m.src)} 800w, ${E(m.big)} 1600w" sizes="(max-width:640px) 100vw, 60vw"` : '';
    return `<figure class="hps-img" data-slot="cls-${E(c.id)}"${m.stock ? ` data-stock="${E(m.stock)}"` : ''}><img src="${E(m.src)}"${ss} alt="${E(m.alt)}"${o.i >= 4 ? ' loading="lazy"' : ''} decoding="async" style="object-fit:${m.fit};object-position:${E(m.pos)}">${extra}</figure>`; };

  /* ── 작은 부품 ── */
  const kline = c => { const a = catName(c); const b = kindName(c); return `<p class="hps-k"><span>${E(a || b)}</span>${a && b ? `<span class="hps-k2">${E(b)}</span>` : ''}</p>`; };
  const badge = (c, p) => { const r = recOf(c); if (r && r.k === 'open') return `<span class="hps-bd is-on" data-due="${E(r.to)}">${E(r.l)}${ddTxt(r) ? ` <b>${E(ddTxt(r))}</b>` : ''}</span>`; if (r && r.k === 'soon') return `<span class="hps-bd" data-from="${E(r.from)}" data-to="${E(r.to)}">${E(md(r.from))} 모집 시작</span>`; if (r && r.k === 'closed') return `<span class="hps-bd is-off">모집 마감</span>`; if (p.off) return `<span class="hps-bd is-on">${p.off}% 할인</span>`; if (p.free) return `<span class="hps-bd">무료</span>`; return ''; };
  const priceH = (p, cls) => p.free ? `<span class="${cls || 'hps-p'}"><b>무료</b></span>` : `<span class="${cls || 'hps-p'}">${p.was ? `<s><span class="hps-sr">정가 </span>${wonF(p.was)}원</s>` : ''}<b>${wonF(p.now)}<small>원${p.sub ? ' / 회차' : ''}</small></b></span>`;
  const metaL = c => [lesOf(c) ? `${lesOf(c)}차시` : '', hrsOf(c) ? `총 ${hrsOf(c)}시간` : '', perOf(c), schedOf(c)].filter(Boolean);
  const metaH = (c, max) => { const M = metaL(c).slice(0, max || 3); return M.length ? `<ul class="hps-m">${M.map(m => `<li>${E(m)}</li>`).join('')}</ul>` : ''; };
  const goH = `<span class="hps-go" aria-hidden="true">${ic('arrow', 16, 2)}</span>`;
  const descH = (c, cls) => { const d = descOf(c); return d ? `<p class="${cls || 'hps-d'}">${E(d.slice(0, 160))}</p>` : ''; };

  /* ── 카드 6종 ── */
  const CARD = {
    /* 사진형: 4:3 사진 + 분류 줄 + 제목 + 설명 2줄 + 선 + 메타 + 강사 · 가격 · 화살표(lecurve 위계) */
    photo(c, o) { const p = priceOf(c); const t = tchOf(c); const wide = o.n === 1 || (o.span >= 2 && o.span / (o.cols || 3) >= .6); const r = recOf(c);
      const sp = o.span >= 2 ? ` style="grid-column:span ${o.span}"` : '';
      if (wide) { const rows = [r ? ['모집', recRange(r) + (ddTxt(r) ? ` (${ddTxt(r)})` : '')] : null, perOf(c) ? ['기간', perOf(c)] : null, schedOf(c) ? ['수업', schedOf(c)] : null, (lesOf(c) || hrsOf(c)) ? ['분량', [lesOf(c) ? `${lesOf(c)}차시` : '', hrsOf(c) ? `총 ${hrsOf(c)}시간` : ''].filter(Boolean).join(' / ')] : null, capOf(c) ? ['정원', `${capOf(c)}명`] : null, t ? ['강사', t] : null].filter(Boolean).slice(0, 5);
        return `<a class="hps-c hps-photo is-wide" href="${href(c)}"${sp}>${fig(c, o.s, { i: o.i, wide: true, over: badge(c, p) })}<div class="hps-b">${kline(c)}<h3>${E(c.name)}</h3>${descH(c)}${rows.length ? `<dl class="hps-dl">${rows.map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>` : ''}<div class="hps-f">${priceH(p)}<span class="hps-cta">${r && r.k === 'closed' ? '자세히 보기' : '수강신청'}${ic('arrow', 16, 2)}</span></div></div></a>`; }
      return `<a class="hps-c hps-photo${o.span >= 2 ? ' is-span' : ''}" href="${href(c)}"${sp}>${fig(c, o.s, { i: o.i, wide: o.span >= 2, over: badge(c, p) })}<div class="hps-b">${kline(c)}<h3>${E(c.name)}</h3>${descH(c)}${metaH(c, 3)}<div class="hps-f">${t ? `<span class="hps-t">${E(t)}</span>` : '<span></span>'}${priceH(p)}${goH}</div></div></a>`; },
    /* 목록형: 가로 줄(사진 · 본문 · 가격) + 줄 사이 1px 선 */
    list(c, o) { const p = priceOf(c); const t = tchOf(c); const r = recOf(c);
      return `<a class="hps-row" href="${href(c)}">${fig(c, o.s, { i: o.i })}<div class="hps-b">${kline(c)}<h3>${E(c.name)}</h3>${descH(c)}${metaH(c, 4)}</div><div class="hps-r">${r && r.k === 'open' ? `<span class="hps-dd" data-due="${E(r.to)}">${E(ddTxt(r) || r.l)}</span>` : ''}${priceH(p)}${t ? `<span class="hps-t">${E(t)}</span>` : ''}${goH}</div></a>`; },
    /* 가격 강조: 사진 없이 큰 가격 + 포함 항목 체크 목록 + 신청 버튼 */
    price(c, o) { const p = priceOf(c); const r = recOf(c);
      const inc = [lesOf(c) ? `${lesOf(c)}차시${hrsOf(c) ? ` · 총 ${hrsOf(c)}시간` : ''}` : hrsOf(c) ? `총 ${hrsOf(c)}시간` : '', perOf(c) ? `수강 기간 ${perOf(c)}` : '', schedOf(c) ? `수업 ${schedOf(c)}` : '', capOf(c) ? `정원 ${capOf(c)}명` : '', tchOf(c) ? `강사 ${tchOf(c)}` : '', certOf(c) ? '수료증 발급' : ''].filter(Boolean);
      return `<article class="hps-c hps-pr${o.n === 1 ? ' is-wide' : ''}"><div class="hps-pt">${kline(c)}<h3><a href="${href(c)}">${E(c.name)}</a></h3>${descH(c)}${o.n === 1 ? fig(c, o.s, { i: o.i, wide: true }) : ''}</div><div class="hps-pa"><p class="hps-amt">${p.free ? '<b>무료</b>' : `${p.was ? `<s><span class="hps-sr">정가 </span>${wonF(p.was)}원</s>` : ''}<b>${wonF(p.now)}<small>원${p.sub ? ' / 회차' : ''}</small></b>`}${p.off ? `<em>${p.off}% 할인</em>` : ''}</p>${r && r.k === 'open' ? `<p class="hps-due" data-due="${E(r.to)}">${E(md(r.to))} 모집 마감${ddTxt(r) ? ` · ${E(ddTxt(r))}` : ''}</p>` : ''}${inc.length ? `<ul class="hps-ck">${inc.map(x => `<li>${ic('check', 16, 2.2)}<span>${E(x)}</span></li>`).join('')}</ul>` : ''}<a class="hps-btn" href="${href(c)}">${r && r.k === 'closed' ? '자세히 보기' : '수강신청'}</a></div></article>`; },
    /* 일정형: 큰 날짜(개강일) + 모집 상태 · D-day + 모집 기간 · 수업 · 정원 · 수강료 표 + 작은 사진 */
    schedule(c, o) { const p = priceOf(c); const r = recOf(c); const st = startOf(c);
      const dt = st ? `<div class="hps-dt"><small>${E(st.slice(0, 4))}.${E(st.slice(5, 7))}</small><b>${+st.slice(8, 10)}</b><span>${E(wd(st))}요일 개강</span></div>`
        : (c.period && c.period.mode === 'days') ? `<div class="hps-dt is-any"><b>상시</b><span>신청 즉시 수강</span></div>` : `<div class="hps-dt is-any"><b>${E(kindName(c))}</b><span>${E(term('cls'))}</span></div>`;
      const rows = [r ? ['모집', recRange(r)] : null, perOf(c) ? ['기간', perOf(c)] : null, schedOf(c) ? ['수업', schedOf(c)] : null, capOf(c) ? ['정원', `${capOf(c)}명`] : null, ['수강료', p.free ? '무료' : `${wonF(p.now)}원`]].filter(x => x && x[1]);
      return `<a class="hps-sch" href="${href(c)}">${dt}<div class="hps-b">${r ? `<p class="hps-st is-${r.k}"${r.k === 'open' ? ` data-due="${E(r.to)}"` : r.k === 'soon' ? ` data-from="${E(r.from)}" data-to="${E(r.to)}"` : ''}><span>${E(r.l)}</span>${ddTxt(r) ? `<b>${E(ddTxt(r))}</b>` : ''}</p>` : kline(c)}<h3>${E(c.name)}</h3><dl class="hps-dl">${rows.map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl></div>${fig(c, o.s, { i: o.i })}<span class="hps-cta">${r && r.k === 'closed' ? '자세히' : '신청하기'}${ic('arrow', 16, 2)}</span></a>`; },
    /* 큰 썸네일: 세로 사진 전체 + 하단 스크림 위 제목(provost) */
    big(c, o) { const p = priceOf(c); const M = [lesOf(c) ? `${lesOf(c)}차시` : '', perOf(c), p.free ? '무료' : `${wonF(p.now)}원`].filter(Boolean);
      return `<a class="hps-big" href="${href(c)}"${o.span >= 2 ? ` style="grid-column:span ${o.span}"` : ''}>${fig(c, o.s, { i: o.i, wide: o.n <= 2 || o.span >= 2, over: badge(c, p) })}<div class="hps-ov"><p class="hps-k"><span>${E(catName(c) || kindName(c))}</span></p><h3>${E(c.name)}</h3><ul class="hps-m">${M.map(m => `<li>${E(m)}</li>`).join('')}</ul></div></a>`; }
  };

  /* 표형: 열은 한 강좌라도 값이 있을 때만 */
  function table(L, o) { const C = [
      ['모집', c => { const r = recOf(c); return r ? `${r.l}${ddTxt(r) ? ' ' + ddTxt(r) : ''}` : ''; }, 'rec'],
      ['기간', perOf], ['수업', schedOf], ['차시', c => lesOf(c) ? `${lesOf(c)}차시` : ''], ['정원', c => capOf(c) ? `${capOf(c)}명` : ''], ['강사', tchOf]
    ].filter(([, f]) => L.some(c => f(c))).slice(0, 4);
    const head = `<thead><tr><th scope="col">${E(term('cls'))}명</th>${C.map(([k]) => `<th scope="col">${E(k)}</th>`).join('')}<th scope="col" class="hps-tp">수강료</th><th scope="col"><span class="hps-sr">신청</span></th></tr></thead>`;
    const body = L.map(c => { const p = priceOf(c); const r = recOf(c);
      return `<tr><th scope="row"><a href="${href(c)}">${E(c.name)}</a><small>${E(catName(c) || kindName(c))}</small></th>${C.map(([k, f, x]) => { const v = f(c); return `<td data-l="${E(k)}"${!v ? ' class="is-none"' : ''}>${x === 'rec' && v ? `<span class="hps-tag is-${r.k}"${r.k === 'open' ? ` data-due="${E(r.to)}"` : r.k === 'soon' ? ` data-from="${E(r.from)}" data-to="${E(r.to)}"` : ''}>${E(v)}</span>` : v ? E(v) : '<span aria-label="없음">—</span>'}</td>`; }).join('')}<td class="hps-tp" data-l="수강료">${p.free ? '무료' : `${p.was ? `<s>${wonF(p.was)}</s>` : ''}${wonF(p.now)}원`}</td><td class="hps-ta"><a class="hps-btn sm" href="${href(c)}">${r && r.k === 'closed' ? '보기' : '신청'}</a></td></tr>`; }).join('');
    return `<div class="hps-tw"><table class="hps-tb">${head}<tbody>${body}</tbody></table></div>`; }

  /* ── 목록: 개수에 맞춘 칸 + 남는 칸은 첫 카드가 넓게 ── */
    /* 사진형: 4 → 넓은 대표 1 + 3, 5 → 2칸 대표 + 1 + 3, 6 → 3칸 대표 + 1 + 4, 7 → 대표 1 + 3 + 3 …(빈칸 없이 리듬을 바꿈), 12 → 4 × 3 */
  const colsFor = (kind, n) => kind === 'price' ? (n <= 3 ? n : n === 4 ? 2 : 3) : kind === 'big' ? (n <= 4 ? n : n % 4 === 0 || n >= 7 ? 4 : 3) : (n <= 3 ? n : n % 3 ? 3 : n % 4 ? 4 : 4);
  function list(kind, L, o) { o = o || {}; const s = o.s || (typeof site === 'function' ? site() : {}); const n = L.length; if (!n) return '';
    if (!CARD[kind] && kind !== 'table') kind = 'photo';
    if (kind === 'table') return `<div class="hps hps-k-table hps-n${Math.min(n, 3)}">${table(L, { s })}</div>`;
    if (kind === 'list' || kind === 'schedule') { const R = kind === 'schedule' ? [...L].sort((a, b) => (startOf(a) || '9999') < (startOf(b) || '9999') ? -1 : (startOf(a) || '9999') > (startOf(b) || '9999') ? 1 : 0) : L;
      return `<div class="hps hps-k-${kind} hps-n${Math.min(n, 3)}">${R.map((c, i) => CARD[kind](c, { s, n, i, span: 1 })).join('')}</div>`; }
    const cols = colsFor(kind, n); const extra = n > 1 && cols > 1 ? (cols - n % cols) % cols : 0;
    const items = L.map((c, i) => CARD[kind](c, { s, n, i, cols, span: i === 0 && extra ? 1 + extra : 1 })).join('');
    return `<div class="hps hps-k-${kind} hps-n${Math.min(n, 3)}${n >= 3 ? ' hps-rail' : ''}" style="--hps-cols:${cols}">${items}</div>`; }

  /* ── 기본 종류 고르기(데이터 data.card가 먼저) ── */
  const KINDS = [['photo', '사진형'], ['list', '목록형'], ['price', '가격 강조'], ['schedule', '일정형'], ['big', '큰 썸네일'], ['table', '표형']];
  const BY_TH = { clean: 'photo', premium: 'big', warm: 'photo', official: 'table', tech: 'list', kids: 'photo', campus: 'schedule', senior: 'list' };
  function cardKind(d, s, L) { d = d || {}; if (KINDS.some(([k]) => k === d.card)) return d.card;
    const ty = S.org && S.org.type; const dated = (L || []).filter(c => recOf(c) || startOf(c)).length;
    if (dated && dated * 2 >= (L || []).length && /^(voc|lifelong|public)$/.test(ty || '')) return ty === 'public' ? 'table' : 'schedule';
    return BY_TH[s && s.theme] || 'photo'; }
  const idsOf = d => { const lim = Math.max(1, Math.min(24, +d.n || (d.card === 'table' ? 10 : 6))); return d.auto ? pub().map(c => c.id).slice(0, lim) : (d.ids || []); };

  /* ── CSS(테마 토큰) ── */
  function cardCSS(s) { const T = tokOf(s); if (!T) return ''; const th = (window.HPT && HPT.list || []).find(x => x.id === s.theme) || {}; const big = s.theme === 'senior' ? 1.14 : 1; const px = n => Math.round(n * big) + 'px';
    const ink = T.ink, ln = al(ink, .12), ln2 = al(ink, .07), mu = T.mu; const at = fit(T.at || T.a, '#ffffff', 4.6); const atA = fit(T.at || T.a, T.alt, 4.6);
    const onImg = '#ffffff'; th;
    return `/* hps card */
.hps{--hps-r:min(var(--r,12px),14px);--hps-ln:${ln};--hps-ln2:${ln2};--hps-card:transparent;--hps-at:${at};--hps-mu:${fit(mu, T.bg || '#ffffff', 4.6)};font-variant-numeric:tabular-nums}
.hps .hps-bd{right:auto;bottom:auto;cursor:inherit} /* v34.5 FB: 머리글 서랍 배경(.hps-bd, inset:0)과 이름이 겹쳐 배지가 카드 전체로 늘어나던 문제 */
.hps .hps-pr .hps-pa{background:none;color:inherit;border-radius:0;padding-left:0;padding-right:0;padding-bottom:0} /* v34.5 FB: S3 신청 띠의 .hps-pa(진한 상자)와 이름이 겹쳐 가격 카드가 진한 바탕이 되던 문제 */
.hp-alt .hps,.is-alt .hps{--hps-card:#ffffff;--hps-at:${atA};--hps-mu:${fit(mu, T.alt || '#ffffff', 4.6)}}
.hps,.hps-c,.hps-row,.hps-sch,.hps-big,.hps-pr{position:relative}.hps .hps-sr{position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hps a{color:inherit;text-decoration:none}.hps h3{margin:0;font-size:${px(19)};line-height:1.38;letter-spacing:-.022em;font-weight:750;color:${ink}}
.hps .hps-img{margin:0;position:relative;overflow:hidden;background:${T.as};aspect-ratio:4/3;border-radius:calc(var(--hps-r) - 2px)}.hps .hps-img img{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.hps .hps-img.is-ph{display:grid;place-items:center;color:${at}}.hps .hps-img.is-ph span{opacity:.55}
.hps .hps-img.is-ty{display:block;color:${fit(T.at || T.a, T.as, 4.6)};background:${T.as};box-shadow:inset 0 0 0 1px var(--hps-ln2)}.hps .hps-img.is-ty span{opacity:1}.hps .hps-ty-n{position:absolute;left:8%;top:8%;font-size:clamp(34px,4.2vw,60px);line-height:1;font-weight:800;letter-spacing:-.04em;font-family:var(--hfont,inherit)}.hps .hps-ty-w{position:absolute;left:8%;bottom:8%;right:8%;font-size:${px(13)};font-weight:700;letter-spacing:.02em;padding-top:10px;border-top:1px solid currentColor}
.hps .hps-img.is-ty .hps-ty-n{left:auto;right:8%;font-size:clamp(40px,5vw,72px)}.hps .hps-big:has(.is-ty){background:${T.hd || T.ink}}.hps .hps-big .hps-img.is-ty{background:${T.hd || T.ink}}.hps .hps-big .hps-img.is-ty .hps-ty-n{color:${al('#ffffff', .9)}}.hps .hps-big .hps-img.is-ty .hps-ty-w{display:none}
.hps .hps-k{display:flex;align-items:center;gap:10px;margin:0 0 8px;font-size:${px(12.5)};font-weight:650;color:var(--hps-at);letter-spacing:.01em}.hps .hps-k2{color:var(--hps-mu);font-weight:550;padding-left:10px;border-left:1px solid var(--hps-ln)}
.hps .hps-d{margin:8px 0 0;color:var(--hps-mu);font-size:${px(14.5)};line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.hps .hps-m{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 0;font-size:${px(13)};color:var(--hps-mu)}.hps .hps-m li{display:inline-flex;align-items:center}.hps .hps-m{column-gap:14px}
.hps .hps-bd{position:absolute;left:12px;top:12px;z-index:1;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#ffffff;color:${ink};font-size:${px(12.5)};font-weight:700;line-height:1.2}.hps .hps-bd b{color:${fit(T.a, '#ffffff', 4.6)};font-weight:800}.hps .hps-bd.is-on{background:${T.a};color:${T.on}}.hps .hps-bd.is-on b{color:${T.on}}.hps .hps-bd.is-off{background:${ink};color:#ffffff}
.hps .hps-p{display:inline-flex;align-items:baseline;gap:8px;white-space:nowrap}.hps .hps-p b{font-size:${px(18)};font-weight:800;letter-spacing:-.02em;color:${ink}}.hps .hps-p b small{font-size:.72em;font-weight:650;margin-left:1px}.hps .hps-p s{font-size:${px(13)};color:var(--hps-mu)}
.hps .hps-t{font-size:${px(13.5)};color:var(--hps-mu);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hps .hps-go{flex:none;width:32px;height:32px;border-radius:999px;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--hps-ln);color:${ink};transition:background .2s,color .2s,box-shadow .2s}
.hps a:hover .hps-img img{transform:scale(1.035)}.hps a:hover h3{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px}.hps a:hover .hps-go{background:${T.a};color:${T.on};box-shadow:none}
.hps a:focus-visible{outline:3px solid ${fit(T.a, '#ffffff', 3)};outline-offset:3px;border-radius:var(--hps-r)}
.hps .hps-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:${px(48)};padding:0 ${px(22)};border-radius:var(--br,10px);background:${T.a};color:${T.on};font-weight:700;font-size:${px(15.5)};white-space:nowrap;transition:background .15s}.hps .hps-btn:hover{background:${mix(T.a, '#000000', .14)}}.hps .hps-btn.sm{min-height:${px(38)};padding:0 ${px(16)};font-size:${px(14)};background:transparent;color:${ink};box-shadow:inset 0 0 0 1px ${al(ink, .28)}}.hps .hps-btn.sm:hover{background:${T.a};color:${T.on};box-shadow:none}
/* 사진형 */
.hps-k-photo,.hps-k-big,.hps-k-price{display:grid;grid-template-columns:repeat(var(--hps-cols,3),minmax(0,1fr));gap:${px(40)} 24px}
.hps-k-photo .hps-photo:not(.is-wide){container-type:inline-size}@container (max-width:300px){.hps-k-photo .hps-f{flex-wrap:wrap;row-gap:6px}.hps-k-photo .hps-f .hps-t{flex:1 1 100%!important;order:-1}.hps-k-photo .hps-f .hps-p{flex:1}}
.hps-k-photo .hps-photo{display:flex;flex-direction:column;background:var(--hps-card);border-radius:var(--hps-r);min-width:0}
.hp-alt .hps-k-photo .hps-photo,.is-alt .hps-k-photo .hps-photo{padding:10px 10px 0}.hp-alt .hps-k-photo .hps-photo .hps-b,.is-alt .hps-k-photo .hps-photo .hps-b{padding:18px 10px 18px}
.hps-k-photo .hps-b{display:flex;flex-direction:column;flex:1;padding-top:18px}
.hps-k-photo .hps-f{display:flex;align-items:center;gap:12px;margin-top:auto;padding-top:16px}.hps-k-photo .hps-m{margin-bottom:0}.hps-k-photo .hps-b>.hps-m{padding-bottom:16px;border-bottom:1px solid var(--hps-ln)}.hps-k-photo .hps-photo:not(.is-wide) .hps-f>:first-child{flex:1}
.hps-k-photo .hps-photo.is-wide{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:0 ${px(44)};align-items:stretch}.hps-k-photo .is-wide .hps-img{aspect-ratio:auto;min-height:${px(360)}}.hps-k-photo .is-wide .hps-b{padding:${px(16)} ${px(8)} ${px(8)} 0}.hps-k-photo .is-wide h3{font-size:clamp(${px(24)},2.4vw,${px(32)});line-height:1.28;letter-spacing:-.03em}.hps-k-photo .is-wide .hps-d{-webkit-line-clamp:3;font-size:${px(16)};margin-top:12px}
.hps-k-photo .is-wide .hps-dl{margin:${px(24)} 0 0;display:grid;gap:0;font-size:${px(14.5)};border-top:1px solid var(--hps-ln)}.hps-k-photo .is-wide .hps-dl div{display:grid;grid-template-columns:${px(64)} minmax(0,1fr);gap:12px;padding:11px 0;border-bottom:1px solid var(--hps-ln2)}.hps-k-photo .is-wide .hps-dl dt{color:var(--hps-mu)}.hps-k-photo .is-wide .hps-dl dd{margin:0;color:${ink};font-weight:600}
.hps-k-photo .is-wide .hps-f{padding-top:${px(24)};gap:16px}.hps-k-photo .is-wide .hps-p b{font-size:${px(24)}}.hps-k-photo .is-wide .hps-p{flex:1}
.hps .hps-photo .hps-cta{display:inline-flex;align-items:center;gap:8px;min-height:${px(48)};padding:0 ${px(22)};border-radius:var(--br,10px);background:${T.a};color:${T.on};font-weight:700;font-size:${px(15.5)};white-space:nowrap;transition:background .15s}.hps .hps-photo:hover .hps-cta{background:${mix(T.a, '#000000', .14)}}
.hps-n1.hps-k-photo .is-wide .hps-img{min-height:${px(420)}}.hps-k-photo .is-span .hps-img{aspect-ratio:auto;height:0;padding-bottom:calc((100% - 24px) / 2 * .75)}
/* 목록형 */
.hps-k-list{border-top:1px solid ${al(ink, .85)}}
.hps-k-list .hps-row{display:grid;grid-template-columns:${px(220)} minmax(0,1fr) auto;gap:${px(32)};align-items:center;padding:${px(24)} 0;border-bottom:1px solid var(--hps-ln)}
.hps-n1.hps-k-list .hps-row,.hps-n2.hps-k-list .hps-row{grid-template-columns:${px(340)} minmax(0,1fr) auto;padding:${px(32)} 0}
.hps-k-list .hps-img{aspect-ratio:3/2}.hps-k-list .hps-r{display:flex;flex-direction:column;align-items:flex-end;gap:10px;text-align:right;min-width:${px(150)}}.hps-k-list .hps-m{margin-top:12px}
.hps-k-list .hps-dd{font-size:${px(12.5)};font-weight:750;color:var(--hps-at);padding:3px 9px;border-radius:999px;box-shadow:inset 0 0 0 1px currentColor}
.hp-alt .hps-k-list .hps-row,.is-alt .hps-k-list .hps-row{padding-left:0;padding-right:0}
/* 가격 강조 */
.hps-k-price{gap:24px}
.hps-k-price .hps-pr{display:flex;flex-direction:column;border:1px solid var(--hps-ln);background:var(--hps-card);border-radius:var(--hps-r);padding:${px(30)} ${px(28)} ${px(28)};min-width:0}
.hps-k-price .hps-pt{padding-bottom:22px;border-bottom:1px solid var(--hps-ln)}.hps-k-price .hps-pa{display:flex;flex-direction:column;flex:1;padding-top:22px}
.hps-k-price .hps-amt{margin:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}.hps-k-price .hps-amt b{font-size:clamp(${px(32)},3.2vw,${px(44)});font-weight:800;letter-spacing:-.035em;line-height:1.05;color:${ink}}.hps-k-price .hps-amt b small{font-size:.42em;font-weight:700;margin-left:3px;letter-spacing:0}.hps-k-price .hps-amt s{order:-1;flex-basis:100%;font-size:${px(14)};color:var(--hps-mu)}.hps-k-price .hps-amt em{font-style:normal;font-size:${px(13)};font-weight:750;color:var(--hps-at)}
.hps-k-price .hps-due{margin:10px 0 0;font-size:${px(13.5)};font-weight:650;color:var(--hps-at)}
.hps-k-price .hps-ck{list-style:none;margin:20px 0 0;padding:0;display:grid;gap:10px;font-size:${px(14.5)};color:${ink}}.hps-k-price .hps-ck li{display:flex;gap:10px;align-items:flex-start;line-height:1.5}.hps-k-price .hps-ck svg{color:var(--hps-at);margin-top:2px}
.hps-k-price .hps-btn{margin-top:auto;align-self:stretch;background:transparent;color:${ink};box-shadow:inset 0 0 0 1.5px ${al(ink, .8)}}.hps-k-price .hps-btn:hover{background:${T.a};color:${T.on};box-shadow:none}.hps-n1.hps-k-price .hps-btn{background:${T.a};color:${T.on};box-shadow:none}.hps-k-price .hps-pa>:nth-last-child(2){margin-bottom:28px}
.hps-k-price .hps-pr h3 a:hover{text-decoration:underline;text-underline-offset:4px}
.hps-k-price .hps-pr.is-wide{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:0 ${px(48)};padding:${px(40)}}.hps-k-price .is-wide .hps-pt{border-bottom:0;padding:0;border-right:1px solid var(--hps-ln);padding-right:${px(48)}}.hps-k-price .is-wide .hps-pt h3{font-size:clamp(${px(24)},2.4vw,${px(32)})}.hps-k-price .is-wide .hps-d{-webkit-line-clamp:5;font-size:${px(16)}}.hps-k-price .is-wide .hps-pa{padding:0}.hps-k-price .is-wide .hps-pt{display:flex;flex-direction:column}.hps-k-price .is-wide .hps-img{margin-top:${px(28)};aspect-ratio:16/9}
/* 일정형 */
.hps-k-schedule{border-top:1px solid ${al(ink, .85)}}
.hps-k-schedule .hps-sch{display:grid;grid-template-columns:${px(120)} minmax(0,1fr) ${px(176)} auto;gap:${px(32)};align-items:center;padding:${px(26)} 0;border-bottom:1px solid var(--hps-ln)}
.hps-k-schedule .hps-dt{display:flex;flex-direction:column;align-items:flex-start;line-height:1}.hps-k-schedule .hps-dt small{font-size:${px(13)};font-weight:650;color:var(--hps-mu)}.hps-k-schedule .hps-dt b{font-size:${px(56)};font-weight:800;letter-spacing:-.05em;color:${ink};margin:6px 0 8px}.hps-k-schedule .hps-dt span{font-size:${px(13)};color:var(--hps-mu)}.hps-k-schedule .hps-dt.is-any b{font-size:${px(30)};letter-spacing:-.03em;margin:0 0 8px}
.hps-k-schedule .hps-st{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:${px(12.5)};font-weight:750}.hps-k-schedule .hps-st span{padding:3px 9px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--hps-ln);color:var(--hps-mu)}.hps-k-schedule .hps-st.is-open span{background:${T.a};color:${T.on};box-shadow:none}.hps-k-schedule .hps-st b{color:var(--hps-at);font-size:${px(14)}}
.hps-k-schedule .hps-dl{margin:12px 0 0;display:flex;flex-wrap:wrap;gap:6px ${px(28)};font-size:${px(14)}}.hps-k-schedule .hps-dl div{display:flex;gap:8px}.hps-k-schedule .hps-dl dt{color:var(--hps-mu)}.hps-k-schedule .hps-dl dd{margin:0;color:${ink};font-weight:600}
.hps-k-schedule .hps-img{aspect-ratio:4/3}.hps-k-schedule .hps-cta{display:inline-flex;align-items:center;gap:8px;min-height:${px(44)};padding:0 ${px(18)};border-radius:var(--br,10px);box-shadow:inset 0 0 0 1px ${al(ink, .28)};font-weight:700;font-size:${px(14.5)};white-space:nowrap;transition:background .15s,color .15s}.hps-k-schedule a:hover .hps-cta{background:${T.a};color:${T.on};box-shadow:none}
/* 큰 썸네일 */
.hps-k-big{gap:16px}.hps-k-big .hps-big{position:relative;display:block;border-radius:var(--hps-r);overflow:hidden;min-width:0;color:${onImg}}
.hps-k-big .hps-img{aspect-ratio:3/4;border-radius:0}.hps-n1.hps-k-big .hps-img{aspect-ratio:21/9}.hps-n2.hps-k-big .hps-img{aspect-ratio:5/4}.hps-k-big .hps-big[style*="span"] .hps-img{aspect-ratio:auto;height:100%;min-height:${px(360)}}
.hps-k-big .hps-img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.56) 38%,rgba(0,0,0,.86) 100%)}.hps-k-big .hps-ov{text-shadow:0 1px 10px rgba(0,0,0,.5)}
.hps-k-big .hps-ov{position:absolute;left:0;right:0;bottom:0;padding:${px(24)} ${px(24)} ${px(22)};z-index:1}.hps-k-big .hps-ov h3{color:#ffffff;font-size:${px(22)};line-height:1.32}.hps-n1.hps-k-big .hps-ov{padding:${px(40)}}.hps-n1.hps-k-big .hps-ov h3{font-size:clamp(${px(26)},3vw,${px(40)});max-width:720px}
.hps-k-big .hps-k{color:#ffffff;opacity:1}.hps-k-big .hps-m{color:#ffffff;margin-top:10px}
.hps-k-big .hps-bd{left:16px;top:16px}.hps-k-big a:hover h3{text-decoration:underline}
/* 표형 */
.hps-k-table .hps-tw{overflow-x:auto}
.hps-k-table .hps-tb{width:100%;border-collapse:collapse;font-size:${px(15)};border-top:1px solid ${al(ink, .85)}}
.hps-k-table thead th{font-size:${px(13)};font-weight:650;color:var(--hps-mu);text-align:left;padding:14px 16px;border-bottom:1px solid var(--hps-ln);white-space:nowrap}
.hps-k-table tbody th,.hps-k-table tbody td{padding:${px(20)} 16px;border-bottom:1px solid var(--hps-ln);text-align:left;vertical-align:middle}
.hps-k-table tbody th{font-weight:700;font-size:${px(16.5)};letter-spacing:-.015em;color:${ink}}.hps-k-table tbody th small{display:block;font-weight:500;font-size:${px(12.5)};color:var(--hps-mu);margin-top:4px;letter-spacing:0}.hps-k-table tbody th a:hover{text-decoration:underline;text-underline-offset:4px}
.hps-k-table tbody td{color:${ink};white-space:nowrap}.hps-k-table td.is-none{color:var(--hps-mu)}.hps-k-table .hps-tp{text-align:right;font-weight:750}.hps-k-table td.hps-tp s{font-weight:500;color:var(--hps-mu);margin-right:8px;font-size:.87em}.hps-k-table .hps-ta{text-align:right;width:1%}
.hps-k-table tbody tr{transition:background .15s}.hps-k-table tbody tr:hover{background:${al(T.a, .04)}}
.hps-k-table .hps-tag{font-size:${px(13)};font-weight:700;color:var(--hps-mu)}.hps-k-table .hps-tag.is-open{color:var(--hps-at)}
.hp-alt .hps-k-table .hps-tw,.is-alt .hps-k-table .hps-tw{background:#ffffff;border-radius:var(--hps-r);padding:0 8px}.hp-alt .hps-k-table .hps-tb,.is-alt .hps-k-table .hps-tb{border-top:0}
@media(max-width:1000px){.hps-k-photo,.hps-k-big{--hps-cols:2!important}.hps-k-photo>a,.hps-k-big>a{grid-column:auto!important}.hps-n1.hps-k-photo,.hps-n1.hps-k-big{--hps-cols:1!important}.hps-k-price{grid-template-columns:repeat(2,minmax(0,1fr))}.hps-n1.hps-k-price{grid-template-columns:1fr}
.hps-k-schedule .hps-sch{grid-template-columns:${px(96)} minmax(0,1fr) auto}.hps-k-schedule .hps-img{display:none}.hps-k-list .hps-row,.hps-n1.hps-k-list .hps-row,.hps-n2.hps-k-list .hps-row{grid-template-columns:${px(200)} minmax(0,1fr)}.hps-k-list .hps-r{grid-column:2;flex-direction:row;align-items:center;justify-content:flex-start;text-align:left;min-width:0}.hps-k-list .hps-r .hps-go{margin-left:auto}
.hps-k-photo .hps-photo.is-wide{grid-template-columns:1fr}.hps-k-photo .is-wide .hps-img,.hps-n1.hps-k-photo .is-wide .hps-img,.hps-k-photo .is-span .hps-img{aspect-ratio:16/9;min-height:0;height:auto;padding:0}.hps-k-photo .is-wide .hps-b{padding:20px 4px 4px}}
@media(max-width:640px){.hps h3{font-size:${px(17.5)}}
.hps-k-photo,.hps-k-big{display:flex;flex-direction:column;gap:32px}
.hps-rail.hps-k-photo,.hps-rail.hps-k-big{flex-direction:row;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 20px;gap:12px;margin:0 -20px;padding:0 20px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.hps-rail::-webkit-scrollbar{display:none}
.hps-rail.hps-k-photo>a{flex:0 0 82%;scroll-snap-align:start}.hps-rail.hps-k-photo{align-items:flex-start}.hps-rail.hps-k-photo .is-wide .hps-dl{display:none}.hps-rail.hps-k-photo .is-wide .hps-d{-webkit-line-clamp:2;font-size:${px(14.5)};margin-top:8px}.hps-rail.hps-k-photo .is-wide .hps-f{padding-top:16px;margin-top:16px;border-top:1px solid var(--hps-ln)}.hps-rail.hps-k-photo .is-wide .hps-cta{flex:0 0 auto;min-height:40px;padding:0 16px;font-size:14px}.hps-rail.hps-k-photo .is-wide h3{font-size:${px(18)}}.hps-rail.hps-k-big>a{flex:0 0 74%;scroll-snap-align:start}
.hps-k-photo .is-wide .hps-img,.hps-n1.hps-k-photo .is-wide .hps-img,.hps-k-photo .is-span .hps-img,.hps-k-photo .hps-img{aspect-ratio:4/3;min-height:0;height:auto;padding:0;width:100%}.hps-k-photo .is-wide h3{font-size:${px(22)}}.hps-k-photo .is-wide .hps-b{padding:18px 0 0}.hps-k-photo .hps-photo.is-wide{display:flex}.hps-k-photo .is-wide .hps-cta{flex:1;justify-content:center}
.hp-alt .hps-rail.hps-k-photo .hps-photo .hps-b,.is-alt .hps-rail.hps-k-photo .hps-photo .hps-b{padding:16px 8px 16px}
.hps-k-big .hps-img,.hps-n1.hps-k-big .hps-img,.hps-n2.hps-k-big .hps-img,.hps-k-big .hps-big[style*="span"] .hps-img{aspect-ratio:4/5;min-height:0;height:auto}.hps-n1.hps-k-big .hps-ov{padding:22px}.hps-k-big .hps-ov h3{font-size:${px(20)}}
.hps-k-price{grid-template-columns:1fr}.hps-k-price .hps-pr,.hps-k-price .hps-pr.is-wide{display:flex;padding:${px(24)} ${px(20)}}.hps-k-price .is-wide .hps-pt{border-right:0;padding:0 0 20px;border-bottom:1px solid var(--hps-ln)}.hps-k-price .is-wide .hps-pa{padding-top:20px}
.hps-k-list .hps-row,.hps-n1.hps-k-list .hps-row,.hps-n2.hps-k-list .hps-row{grid-template-columns:${px(104)} minmax(0,1fr);gap:14px 16px;align-items:start;padding:20px 0}.hps-k-list .hps-d{display:none}.hps-k-list .hps-img{aspect-ratio:1/1}.hps-k-list .hps-m{margin-top:8px}.hps-k-list .hps-r{grid-column:1/-1;gap:12px;flex-wrap:wrap}.hps-k-list .hps-k{margin-bottom:4px}
.hps-k-schedule .hps-sch{grid-template-columns:${px(76)} minmax(0,1fr);gap:12px 16px;align-items:start;padding:22px 0}.hps-k-schedule .hps-dt b{font-size:${px(40)}}.hps-k-schedule .hps-dt.is-any b{font-size:${px(22)}}.hps-k-schedule .hps-cta{grid-column:2;justify-self:start;min-height:44px}.hps-k-schedule .hps-dl{flex-direction:column;gap:4px}
.hps-k-table .hps-tw{overflow:visible}.hps-k-table .hps-tb,.hps-k-table tbody,.hps-k-table tr{display:block}.hps-k-table thead{display:none}.hps-k-table tbody tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;padding:18px 0;border-bottom:1px solid var(--hps-ln)}
.hps-k-table tbody th,.hps-k-table tbody td{display:block;padding:0;border:0;white-space:normal}.hps-k-table tbody th{grid-column:1/-1}.hps-k-table tbody td[data-l]:not(.hps-tp){grid-column:1/-1;display:flex;gap:10px;font-size:${px(14)}}.hps-k-table tbody td[data-l]:not(.hps-tp)::before{content:attr(data-l);color:var(--hps-mu);min-width:44px}.hps-k-table td.is-none{display:none!important}
.hps-k-table .hps-tp{text-align:left;align-self:center;font-size:${px(16)}}.hps-k-table .hps-ta{width:auto}.hps-k-table .hps-btn.sm{min-height:44px}.hp-alt .hps-k-table .hps-tw,.is-alt .hps-k-table .hps-tw{padding:0 16px}}
@media(prefers-reduced-motion:reduce){.hps *{transition:none!important}.hps a:hover .hps-img img{transform:none}}`; }

  /* ── classes 섹션 렌더러 감싸기 ──
     hpth가 먼저 그리게 해(회색 띠 차례 · 바로 고치기 표시 · 숨김 규칙을 그대로 받기 위해) 결과의 틀만 가져오고 내용을 이 부품으로 바꾼다. */
  { const base = proSec; proSec = (x, i, s, lk) => { const h0 = base(x, i, s, lk);
    try { if (!x || x.type !== 'classes' || !h0 || !s || !s.theme || !tokOf(s)) return h0; const d = x.data || {}; if (+d.dstyle) return h0;
      const m = String(h0).match(/^<section\b([^>]*)class="hpt hp-s hp-cls( hp-alt)?"[^>]*>/); if (!m) return h0; /* 강좌 0개 안내 · 다른 렌더러 결과는 그대로 */
      const L = idsOf(d).map(id => (S.classes || []).find(c => c.id === id)).filter(Boolean); if (!L.length) return h0;
      const kind = cardKind(d, s, L); const n = L.length;
      const hm = String(h0).match(/<div class="hp-shr">[\s\S]*?<\/div>(?:<a class="hp-all"[\s\S]*?<\/a>)?<\/div>/); const all = (() => { const mm = (s.menus || []).find(q => q.kind === 'class' && q.on !== false); return mm ? '#p-m-' + mm.id : ''; })();
      let head = hm ? hm[0] : '';
      if (head && n < 2) head = head.replace(/<a class="hp-all"[\s\S]*?<\/a>/, '');
      if (head && n >= 2 && all && !/hp-all/.test(head)) head = head.replace(/<\/div>$/, `<a class="hp-all" href="${E(all)}">전체 보기 ${ic('arrow', 16, 2.2)}</a></div>`);
      const body = list(kind, L, { s, d });
      return `<section${m[1]}class="hpt hp-s hp-cls hps-sec hps-sec-${kind}${m[2] || ''}"><div class="hp-w">${head}${body}</div></section>`;
    } catch (e) { console.error('hpsec-card', e); return h0; } }; }

  /* ── 강좌 0개: '개설 준비 중' 상태(v34.5 FB · R1 H4) ──
     숨기지 않는다. 지어낸 강좌 없이 '개설 예정' 카드 1장 + 문의(전화 · 메일 · 게시판 중 있는 것)를 보여 준다.
     모든 계열(HPL)과 기본 렌더러에서 같게 나오도록 proSec 가장 바깥에서 처리한다(스크립트가 다 불린 뒤 감쌈). */
  const menuOf = (s, k) => ((s && s.menus) || []).find(m => m.kind === k && m.on !== false);
  function askOf(s) { const f = ((S.settings && S.settings.footer) || {}); const L = []; const ph = v => !v || /입력하세요|입력해 주세요|예시/.test(String(v));
    if (!ph(f.tel)) L.push({ h: 'tel:' + String(f.tel).replace(/[^\d+]/g, ''), l: String(f.tel), ic: 'phone' });
    const em = f.email || f.mail; if (!ph(em) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) L.push({ h: 'mailto:' + em, l: '메일로 문의', ic: 'mail' });
    const m = menuOf(s, 'community') || menuOf(s, 'board'); if (m && m.access !== '비공개') L.push({ h: '#p-m-' + m.id, l: '게시판에 문의 남기기', ic: 'chat' });
    return L; }
  const EIC = { phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', mail: 'M3 6h18v12H3zM3 7l9 6 9-6', chat: 'M4 5h16v11H9l-5 4z' };
  const eic = k => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${EIC[k] || IC.arrow}"/></svg>`;
  const jo = (w, a, b) => { const c = String(w || '').slice(-1).charCodeAt(0); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
  function emptyCls(s, d, alt) { const n = term('cls'); const org = (S.org && S.org.name) || '';
    const priv = (S.classes || []).some(c => c.status === '운영중' && c.open && c.open !== '전체'); const A = askOf(s); const head = `<div class="hp-shr"><div class="hp-sh">${d.title ? `<h2>${E(d.title).replace(/\n/g, '<br>')}</h2>` : `<h2>${E(n)} 안내</h2>`}</div></div>`;
    const ask = A.length ? `<div class="hps-eb">${A.map((a, k) => `<a class="hps-btn${k ? ' g' : ''}" href="${E(a.h)}">${eic(a.ic)}<span>${E(a.l)}</span></a>`).join('')}</div>` : '';
    return `<section class="hpt hp-s hp-cls hps-sec hps-empty${alt ? ' hp-alt' : ''}"><div class="${s && s.layout ? 'hpl-w' : 'hp-w'}">${head}<div class="hps hps-e"><div class="hps-ec">${priv ? `<p class="hps-et"><span>회원 전용</span></p><h3>배정된 ${E(jo(n, '은', '는'))} 로그인 후 볼 수 있습니다</h3><p class="hps-ed">${E(n)} 목록은 내 강의실에서 확인합니다. 공개 ${E(jo(n, '이', '가'))} 열리면 이곳에도 올립니다.</p>` : `<p class="hps-et"><span>개설 예정</span></p><h3>새 ${E(jo(n, '을', '를'))} 준비하고 있습니다</h3><p class="hps-ed">일정 · 수강료 · 신청 방법이 정해지면 이곳에 바로 올립니다.</p>`}</div><div class="hps-ea"><p class="hps-eq">${org ? `${E(org)}에 ` : ''}먼저 물어보세요</p><p class="hps-ed">개설 소식과 상담은 아래로 바로 연결됩니다.</p>${ask}</div></div></div></section>`; }
  const emptyCSS = s => { const T = tokOf(s); if (!T) return ''; const ink = T.ink; const mu = fit(T.mu, '#ffffff', 4.6); const at = fit(T.at || T.a, '#ffffff', 4.6);
    return `/* hps empty */
.hps-e{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);border:1px solid ${al(ink, .14)};border-radius:var(--hps-r,12px);overflow:hidden;background:#ffffff}
.hps-e .hps-ec{padding:clamp(28px,4vw,48px);background:repeating-linear-gradient(135deg,transparent 0 14px,${al(ink, .035)} 14px 15px),#ffffff;border-right:1px solid ${al(ink, .1)}}
.hps-e .hps-et{margin:0 0 18px}.hps-e .hps-et span{display:inline-block;padding:5px 12px;border:1px solid ${al(at, .5)};border-radius:999px;font-size:13px;font-weight:700;color:${at};background:#ffffff}
.hps-e h3{font-size:clamp(22px,2.4vw,30px);line-height:1.3;letter-spacing:-.03em;font-weight:780;color:${fit(ink, '#ffffff', 7)} !important;margin:0;max-width:20ch}.hps-e .hps-eq{color:${fit(ink, T.as, 7)} !important} /* H5(N3): 카드 바탕은 늘 흰색 · 연한 색이라 noir 등 어두운 계열의 h3 흰 글자 규칙을 이겨야 한다(대비 1.15) */
.hps-e .hps-ed{margin:12px 0 0;color:${mu};font-size:15px;line-height:1.65;max-width:42ch}
.hps-e .hps-ea{padding:clamp(28px,4vw,48px);display:flex;flex-direction:column;justify-content:center;background:${T.as}}
.hps-e .hps-eq{margin:0;font-size:17px;font-weight:750;color:${ink};letter-spacing:-.02em}.hps-e .hps-ea .hps-ed{color:${fit(T.mu, T.as, 4.6)}}
.hps-e .hps-eb{display:flex;flex-direction:column;gap:8px;margin-top:20px}.hps-e .hps-btn{display:inline-flex;align-items:center;gap:10px;min-height:46px;padding:0 18px;border-radius:var(--br,10px);background:${T.a};color:${T.on};font-weight:700;font-size:15px;text-decoration:none;justify-content:flex-start}
.hps-e .hps-btn.g{background:#ffffff;color:${ink};border:1px solid ${al(ink, .16)}}.hps-e .hps-btn:hover{filter:brightness(.94)}.hps-e .hps-btn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:760px){.hps-e{grid-template-columns:1fr}.hps-e .hps-ec{border-right:0;border-bottom:1px solid ${al(ink, .1)}}}`; };
  HPS.clsEmpty = (s, d) => emptyCls(s || site(), d || {}, false);
  const clsLive = d => { d = d || {}; const ids = d.auto ? pub().map(c => c.id) : (d.ids || []); return ids.map(id => (S.classes || []).find(c => c.id === id)).filter(Boolean).length; };
  const lateWrap = () => { if (lateWrap.done) return; lateWrap.done = 1; const base = proSec; proSec = (x, i, s, lk) => {
    try { if (x && x.type === 'classes' && s && s.theme && tokOf(s) && !(x.hide && !editing()) && !+(x.data || {}).dstyle && !clsLive(x.data)) {
      let h = emptyCls(s, x.data || {}, false); const m = editing() ? HPE.map.get(x) : null; if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
      if (s.layout) h = h.replace(/<section\b([^>]*?)\bclass="/, `<section$1class="hpl-${E(s.layout)} hpl-k-classes `); return h; } } catch (e) { console.error('hpsec-card empty', e); }
    return base(x, i, s, lk); }; window.proSec = proSec; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lateWrap, { once: true }); else setTimeout(lateWrap, 0);
  HPS.lateWrap = lateWrap;

  /* ── siteHTML: 페이지마다 사진 겹침 기록 초기화 + CSS 넣기 ── */
  { const base = siteHTML; siteHTML = (s, full, lang) => { resetPhotos(s); const h = base(s, full, lang);
    try { if (!s || !s.theme || !tokOf(s) || !/class="hps /.test(h)) return h; return h.replace('</style>', (cardCSS(s) + (/hps-empty/.test(h) ? emptyCSS(s) : '')).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpsec-card css', e); return h; } }; window.siteHTML = siteHTML; }

  Object.assign(HPS, {
    card: (kind, c, o) => { o = o || {}; const s = o.s || (typeof site === 'function' ? site() : {}); if (!c) return ''; if (kind === 'table') return table([c], { s }); return (CARD[kind] || CARD.photo)(c, { s, n: o.n || 1, i: o.i || 0, span: o.span || 1 }); },
    list, cardCSS, cardKind, cardImg: (c, s) => cardImg(c, s || (typeof site === 'function' ? site() : {})),
    cardKinds: KINDS.map(([id, name]) => ({ id, name })), resetPhotos
  });
})();
