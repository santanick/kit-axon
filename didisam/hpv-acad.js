/* v43.9 hpv-acad — 학원 묶음(k12 · adult) 홈페이지 템플릿 3종(시안 plan/tpl439/D2 → 실제 템플릿)
   대표님(2026-11-17): 「디자인이 너무 구려서 그래」 「5배 이상은 고 퀄리티로」 → 시안 3종 「전부 마음에 들어」.
   - acpaper(에디토리얼): 종이색 바탕 · 세리프 큰 제목 · 가운데 정렬 첫 화면 + 넓은 사진 한 장 · 2열 이야기 · 큰 숫자 띠 · 반 카드 3장 · 인용 · 마지막 행동
   - accine(시네마틱 다크): 전체 화면 사진 + 108px 흰 제목(투명 머리글) · 큰 문장 · 세로 사진 카드 · 밝은 한 주 흐름 · 큰 숫자 · 사진 위 인용 · 마지막 행동
   - acposter(포스터 컬러 블록): 136px 세 줄 제목 + 아치 · 원 · 사각 사진 콜라주 · 반별 큰 사진 띠 · 「1:N」 색 띠 · 갤러리 · 원형 사진 인용 · 어두운 마지막 행동
   원칙
   - 첫 화면 = 큰 제목 + 부제 + 버튼 2개 + 사진. 재원생 · 학생 · 결제는 첫 화면 아래 「한 줄 바로 가기」 3칸(실제 경로 #login/family · #login/my · #login/mypay).
   - 사실: 반 · 요일 · 시간 · 정원 · 수강료는 공개 강좌(S.classes)만, 큰 숫자는 계산 가능한 값(후기 평점 · 정원 · 반 수)만, 후기는 실제 후기(HPT.reviews)만. 없으면 덩어리를 숨긴다(편집 중에는 안내).
   - CSS는 cssX 문자열(게시본 Shadow DOM과 미리보기가 같은 CSS). hpth · hpprem · hpsec* · hpx-* · hpup-*는 고치지 않는다. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const U = HPT.U; const { mix, fit } = U;
  const onC = HPT.onColor || (c => U.CR(c, '#0B0F0D') >= U.CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF');
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const br = v => E(v).replace(/\n/g, '<br>');
  const emph = v => E(v).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\*/g, '').replace(/\n/g, '<br>'); /* 제목의 *강조* */
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const ty = () => { try { return S.org.type; } catch (e) { return ''; } };
  const kid = () => ty() !== 'adult';
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const W = v => (+v || 0).toLocaleString('ko-KR');
  const pubAll = () => { try { return (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료'); } catch (e) { return []; } };
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const menu = (s, k) => ((s && s.menus) || []).find(m => m.kind === k && m.on !== false && m.access !== '비공개');
  const DN = ['일', '월', '화', '수', '목', '금', '토'];
  const daysOf = c => (Array.isArray(c.days) ? c.days : []).map(Number).filter(d => d >= 0 && d <= 6);
  const timeOf = c => (c.time && /^\d{1,2}:\d{2}$/.test(c.time.from || '') ? c.time.from : '');
  const capOf = c => +((c.recruit && c.recruit.cap) || c.cap) || 0;
  const leftOf = c => { const cap = capOf(c); return cap ? Math.max(0, cap - ((c.learners || []).length)) : null; };
  const whenOf = c => [daysOf(c).map(x => DN[x]).join(' · '), timeOf(c)].filter(Boolean).join(' ');
  const priceOf = c => (+c.price ? `${W(c.price)}원` : '무료 체험');
  const seatOf = c => { const l = leftOf(c); return l == null ? '' : l === 0 ? '대기 접수' : `남은 자리 ${l}`; };
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  const val = v => (v && !isPh(v) ? String(v) : '');
  const L = {
    cls: s => { const m = menu(s, 'class'); return m ? '#p-m-' + m.id : (pub()[0] ? '#p-c-' + pub()[0].id : '#login/my'); },
    c: c => '#p-c-' + c.id,
    ask: s => { const f = ft(); if (val(f.tel)) return telH(f.tel); const m = menu(s, 'community') || menu(s, 'board'); if (m) return '#p-m-' + m.id; if (f.email && /@/.test(f.email)) return 'mailto:' + f.email; return L.cls(s); },
    trial: s => { const c = pub().find(x => !+x.price); return c ? L.c(c) : L.cls(s); },
    family: () => '#login/family', my: () => '#login/my', pay: () => '#login/mypay'
  };
  const aT = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const AR = '<svg class="av-ar" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ── 사진: 사이트 사진 → 템플릿 지정(s.photos) → 샘플 ── */
  const ph = (s, slot, d) => { try { return window.HPS && HPS.photo ? HPS.photo(s, slot, d) : null; } catch (e) { return null; } };
  const img = (p, cls, eager, pos) => p ? `<figure class="av-ph${cls ? ' ' + cls : ''}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 760px) 100vw, 60vw"` : ''} alt="${E(p.alt || '')}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(pos || p.pos || '50% 50%')}"></figure>` : '';
  const fig = (s, slot, cls, eager, d, pos) => { const p = ph(s, slot, d); return p ? img(p, cls, eager, pos).replace('<figure ', `<figure data-slot="${E(slot)}"${slot === 'hero' ? ' data-hero="1"' : ''} `) : ''; };
  let USED = new Set(); const fresh = () => { USED = new Set(); };
  const clsPh = (c, s, i) => { let m = null; try { m = HPS.cardImg ? HPS.cardImg(c, s) : null; } catch (e) { m = null; }
    const key = m ? String(m.stock || m.big || m.src).replace(/-800(?=\.webp)/, '').replace(/^.*\/img\/stock\//, '').replace(/\.webp.*$/, '') : '';
    if (m && !USED.has(key)) { USED.add(key); return { src: m.big || m.src, alt: m.alt || c.name, pos: m.pos, stock: !!m.stock }; }
    try { let x = null; for (let k = 0; k < 8 && (!x || USED.has(x.id)); k++) x = HPSTOCK.photo(c.name, c.id + '|' + i + '|' + k, { id: true, slot: 'card', scope: 'hpv-' + c.id + k }); if (x) USED.add(x.id); if (x) return { src: HPSTOCK.url(x), alt: x.alt, pos: x.focus, stock: true }; } catch (e) { }
    return null; };

  /* ── 공통 조각 ── */
  const sec = (cls, inner, attrs) => `<section class="hpt hp-s av-s ${cls}"${attrs || ''}><div class="av-w">${inner}</div></section>`;
  const hint = (cls, msg) => editing() ? sec(cls, `<p class="av-hint">${E(msg)}</p>`) : '';
  const lab = t2 => t2 ? `<p class="av-lab">${E(t2)}</p>` : '';
  const btn = (l, h, k) => `<a class="av-b ${k || ''}" ${aT(h)}>${E(l)}${k === 'p' ? AR : ''}</a>`;
  function quick(s) { const f = ft(); const tel = val(f.tel);
    const Q = kid() ? [['재원생 학부모', '출결 · 숙제 · 성적 알림', L.family()], ['학생', '오늘 수업 · 복습', L.my()], ['수강료 결제', '청구서 · 영수증', L.pay()]]
      : [['수강생', '내 수업 이어 보기 · 과제', L.my()], ['결제 · 영수증', '수강료 · 영수증 · 환불', L.pay()], tel ? ['전화 상담', tel, telH(tel)] : ['수업 둘러보기', '개강 반 · 시간표', L.cls(s)]];
    return `<nav class="av-q" aria-label="바로 가기">${Q.map(([a, b, h]) => `<a ${aT(h)}><b>${E(a)}</b><span>${E(b)}</span>${AR}</a>`).join('')}</nav>`; }
  const GEN = /^(수업|강좌|과정) 둘러보기$|^$/; /* 공통 기본 문구면 템플릿 문구로 */
  const ctas = (s, d, k2) => { const c1 = GEN.test(d.cta || '') ? (kid() ? '체험 수업 신청' : '수강 신청하기') : d.cta; const c2 = GEN.test(d.cta2 || '') || d.cta2 === c1 ? '상담 예약' : d.cta2;
    return `<div class="av-cta">${btn(c1, L.trial(s), 'p')}${btn(c2, L.ask(s), k2 || 'o')}</div>`; };

  /* ── 큰 숫자: 계산 가능한 값만 ── */
  function bigNum(s, pref) { let R = []; try { R = (HPT.reviews() || []).filter(r => +r.st > 0); } catch (e) { }
    const C = pub(); const caps = C.map(capOf).filter(Boolean);
    const rv = R.length >= 2 ? { v: (R.reduce((a, r) => a + Math.min(5, +r.st), 0) / R.length).toFixed(1), u: '/5', t: kid() ? '학부모 · 학생이 남긴\n실제 후기 평점이에요' : '수강생이 남긴\n실제 후기 평점이에요', n: `수강후기 ${R.length}건 평균` } : null;
    const cap = caps.length ? Math.min(...caps) : 0;
    const cp = cap ? (pref === 'ratio' ? { v: `1:${cap}`, u: '', t: `선생님 한 명이 보는 인원은\n최대 ${cap}명이에요`, n: '공개 반 정원 기준' } : { v: String(cap), u: '명', t: `한 반 정원은\n${cap}명부터 시작해요`, n: `공개 반 ${C.length}개의 정원 기준` }) : null;
    const nc = C.length ? { v: String(C.length), u: '개 반', t: '지금 신청할 수 있는\n반이 열려 있어요', n: '공개 강좌 기준' } : null;
    const order = pref === 'ratio' ? [cp, rv, nc] : pref === 'review' ? [rv, nc, cp] : [rv, cp, nc];
    return order.find(Boolean) || null; }

  /* ══ 첫 화면 ══ */
  const HERO = {
    acpaper: (s, d) => `<section class="hpt hp-hero hps-hero av-h av-pa"><div class="av-w">${d.eyebrow ? `<p class="av-kick">${E(d.eyebrow)}</p>` : ''}<h1>${emph(d.title || org())}</h1>${d.sub ? `<p class="av-sub">${E(d.sub)}</p>` : ''}${ctas(s, d)}
      ${fig(s, 'hero', 'av-hi', 1, d)}${quick(s)}</div></section>`,
    accine: (s, d) => `<section class="hpt hp-hero hps-hero av-h av-ci" data-hps-dark="1">${fig(s, 'hero', 'av-hi', 1, d)}<div class="av-hc"><div class="av-w">${d.eyebrow ? `<p class="av-kick">${E(d.eyebrow)}</p>` : ''}<h1>${emph(d.title || org())}</h1>${d.sub ? `<p class="av-sub">${E(d.sub)}</p>` : ''}${ctas(s, d, 'gh')}</div></div>
      <div class="av-qb"><div class="av-w">${quick(s)}</div></div></section>`,
    acposter: (s, d) => { const a = ph(s, 'hero', d), b = ph(s, 'h2'), c = ph(s, 'h3'); const tag = val(d.tag);
      return `<section class="hpt hp-hero hps-hero av-h av-po"><div class="av-w"><div class="av-pg"><div class="av-pt"><h1>${emph(d.title || org())}</h1>${d.sub ? `<p class="av-sub">${E(d.sub)}</p>` : ''}${ctas(s, d)}</div>
        <div class="av-col">${a ? img(a, 'av-s1', 1).replace('<figure ', '<figure data-slot="hero" data-hero="1" ') : ''}${b ? img(b, 'av-s2', 1) : ''}<i class="av-dot" aria-hidden="true"></i>${c ? img(c, 'av-s3', 1) : ''}${tag ? `<p class="av-tag">${E(tag)}</p>` : ''}</div></div>${quick(s)}</div></section>`; }
  };

  /* ══ 섹션 렌더러(data.hpt = 'av-*') ══ */
  const SECR = {
    /* 2열 이야기: 사진 + 제목 · 본문 · 약속 목록(cols) */
    'av-story': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 3);
      return sec('av-story', `${fig(s, 'about', 'av-sp', 0)}<div class="av-st">${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${val(d.body) ? `<p class="av-lead">${br(d.body)}</p>` : ''}
        ${P.length ? `<ol class="av-pr">${P.map((r, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><div><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</div></li>`).join('')}</ol>` : ''}</div>`); },
    /* 큰 숫자 하나 */
    'av-num': (d, s) => { const n = bigNum(s, d.pref); if (!n) return hint('av-num', '공개 강좌나 실제 후기가 생기면 큰 숫자(후기 평점 · 정원 · 반 수)가 자동으로 표시됩니다.');
      return sec('av-num', `<p class="av-big">${E(n.v)}${n.u ? `<small>${E(n.u)}</small>` : ''}</p><div class="av-nt"><h2>${br(n.t)}</h2>${val(d.body) ? `<p>${br(d.body)}</p>` : ''}<p class="av-fine">${E(n.n)}</p></div>`); },
    /* 반 카드 3장 */
    'av-cls': (d, s) => { fresh(); const C = pub().slice(0, 3); if (!C.length) return hint('av-cls', '공개 강좌가 생기면 반 카드 3장이 자동으로 채워집니다.');
      const card = (c, i) => { const p = clsPh(c, s, i); const desc = val(c.sub) || val(c.desc) || '';
        return `<article class="av-cd"><a ${aT(L.c(c))}>${p ? img(p, 'av-cp', 0) : '<span class="av-cp av-c0" aria-hidden="true"></span>'}<span class="av-co"><span class="av-cg">${E(c.cat || (kid() ? '정규반' : `${c.hours ? c.hours + '시간 과정' : '정규 과정'}`))}</span><b class="av-cn">${E(c.name)}</b></span></a>${desc ? `<p class="av-cdx">${E(desc)}</p>` : ''}
          <p class="av-cm"><b>${E(whenOf(c) || '일정은 상담으로 안내해요')}</b><span>${E([priceOf(c), seatOf(c)].filter(Boolean).join(' · '))}</span></p></article>`; };
      return sec('av-cls', `<header class="av-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div><a class="av-lk" ${aT(L.cls(s))}>전체 수업 보기${AR}</a></header><div class="av-cds n${C.length}">${C.map(card).join('')}</div>`); },
    /* 큰 문장(시네마틱): 실제 반 이름을 엮는다 */
    'av-stm': (d, s) => { const N = pub().slice(0, 3).map(c => c.name); if (!N.length) return hint('av-stm', '공개 강좌가 생기면 반 이름으로 큰 문장이 자동으로 만들어집니다.');
      const j = N.length === 1 ? `<b>${E(N[0])}</b>` : N.length === 2 ? `<b>${E(N[0])}</b>와 <b>${E(N[1])}</b>` : `<b>${E(N[0])}</b>부터 <b>${E(N[1])}</b>, <b>${E(N[2])}</b>까지`;
      const tail = String(d.body || '').replace(/\*([^*]+)\*/g, (m, x) => `\u0001${x}\u0002`); const tl = E(tail).replace(/\u0001/g, '<b>').replace(/\u0002/g, '</b>');
      return sec('av-stm', `<p class="av-sm">${j}.${tl ? ' ' + tl : ''}</p>`); },
    /* 한 주의 흐름(밝은 섹션): 사진 + 시간 · 할 일 목록(cols: [때, 제목, 설명]) */
    'av-week': (d, s) => { const R = (d.cols || []).filter(r => r && r[1] && !isPh(r[1])).slice(0, 5); if (!R.length) return hint('av-week', '한 주의 흐름(때 · 할 일 · 설명)을 입력하면 표시됩니다.');
      return sec('av-week', `${fig(s, 'wk', 'av-wp', 0)}<div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${val(d.body) ? `<p class="av-lead">${br(d.body)}</p>` : ''}<ul class="av-tl">${R.map(r => `<li><span>${E(r[0] || '')}</span><div><b>${E(r[1])}</b>${r[2] ? `<p>${E(r[2])}</p>` : ''}</div></li>`).join('')}</ul></div>`); },
    /* 반별 큰 사진 띠(포스터) */
    'av-band': (d, s) => { fresh(); const C = pub().slice(0, 3); if (!C.length) return hint('av-band', '공개 강좌가 생기면 반별 큰 사진 띠가 자동으로 채워집니다.');
      const band = (c, i) => { const p = clsPh(c, s, i); const desc = val(c.sub) || val(c.desc) || '';
        return `<article class="av-bd${i % 2 ? ' rev' : ''}">${p ? img(p, 'av-bp', 0) : ''}<div><p class="av-bi"><span>${String(i + 1).padStart(2, '0')}</span>${E(c.cat || (kid() ? '정규반' : '정규 과정'))}</p><h3>${E(c.name)}</h3>${desc ? `<p class="av-bx">${E(desc)}</p>` : ''}
          <dl><dt>시간</dt><dd>${E(whenOf(c) || '상담으로 안내해요')}</dd><dt>수강료</dt><dd>${E(priceOf(c))}${c.hours ? ` · 총 ${E(c.hours)}시간` : ''}</dd>${seatOf(c) ? `<dt>정원</dt><dd>${E(seatOf(c))}${capOf(c) ? ` / ${capOf(c)}명` : ''}</dd>` : ''}</dl><a class="av-lk" ${aT(L.c(c))}>반 자세히 보기${AR}</a></div></article>`; };
      return sec('av-band', `${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${C.map(band).join('')}`); },
    /* 갤러리(포스터): 반마다 장면 사진 + 반 이름 */
    'av-gal': (d, s) => { fresh(); const C = pub().slice(0, 4); const P = C.map((c, i) => [c, clsPh(c, s, i + 7)]).filter(x => x[1]); if (P.length < 3) return hint('av-gal', '공개 강좌가 3개 이상이면 반별 장면 갤러리가 표시됩니다.');
      return sec('av-gal', `${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2><div class="av-gl n${P.length}">${P.map(([c, p]) => `<a ${aT(L.c(c))}>${img(p, '', 0)}<em>${E(c.name)}</em></a>`).join('')}</div>`); },
    /* 인용: 실제 후기 1건 */
    'av-quote': (d, s) => { let R = []; try { R = HPT.reviews() || []; } catch (e) { } const r = R.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || String(b.b).length - String(a.b).length)[0];
      if (!r) return hint('av-quote', '실제 수강후기가 등록되면 이곳에 크게 보여 드려요(없으면 게시된 사이트에서 숨겨집니다).');
      const t2 = String(r.b).replace(/\s+/g, ' ').trim(); const q = t2.length > 120 ? t2.slice(0, 118).replace(/\s\S*$/, '') + '…' : t2;
      return sec('av-quote', `${fig(s, 'quote', 'av-qp', 0)}<div class="av-qt"><blockquote>${E(q)}</blockquote><p class="av-cite">${E([r.w, r.c].filter(Boolean).join(' · '))}</p></div>`); },
    /* 마지막 행동 + 찾아오시는 길 */
    'av-fin': (d, s) => { const f = ft(); const I = [['찾아오시는 길', val(f.addr)], ['전화', val(f.tel)], ['상담 시간', val(f.hours)], ['메일', val(f.email || f.mail)]].filter(x => x[1]).slice(0, 3);
      const free = pub().some(c => !+c.price); const tel = val(f.tel);
      return sec('av-fin', `<div class="av-fg"><h2>${emph(d.title || '')}</h2><div>${val(d.body) ? `<p class="av-lead">${br(d.body)}</p>` : ''}<div class="av-cta">${btn(d.cta || (free ? '무료 체험 수업 신청' : '상담 예약'), free ? L.trial(s) : L.ask(s), 'p')}${tel ? btn(`${tel} 전화 상담`, telH(tel), 'o') : btn('수업 둘러보기', L.cls(s), 'o')}</div></div></div>
        ${I.length ? `<dl class="av-info n${I.length}">${I.map(([a, b]) => `<div><dt>${E(a)}</dt><dd>${br(b)}</dd></div>`).join('')}</dl>` : ''}`); }
  };

  /* ══ 테마 ══ */
  const DEF = {
    acpaper: { name: '에디토리얼', desc: '종이색 바탕 · 세리프 큰 제목 · 사진 한 장 — 학부모가 믿고 맡기는 초중고 학원', tags: ['k12', 'adult'], tone: 'light', dens: '여유',
      acc: '#1E4A3A', bg: '#F5F1E8', alt: '#ECE6D9', ink: '#1A1916', mu: '#56524A', r: 6, br: 999, hero: 'center', vis: 'mock', illu: 'book', card: 'line', look: 'brandBold', sw2: '#E3EAE4', base: 'warm', ck: 'photo', sh: 'none' },
    accine: { name: '시네마틱 다크', desc: '전체 화면 사진 · 어두운 바탕 · 큰 흰 제목 — 퇴근 후 직장인 · 저녁 집중반', tags: ['adult', 'k12'], tone: 'dark', dens: '여유',
      acc: '#FF7A30', bg: '#0B0C0E', alt: '#141518', ink: '#F3F1EC', mu: '#A3A29D', r: 20, br: 999, hero: 'dark', hb: '#08090B', vis: 'mock', illu: 'book', card: 'line', look: 'navyGlow', sw2: '#0B0C0E', base: 'premium', ck: 'photo' },
    acposter: { name: '포스터 컬러 블록', desc: '아주 큰 세 줄 제목 · 아치 · 원 사진 콜라주 · 색 띠 — 예체능 · 어린이 학원', tags: ['k12', 'adult'], tone: 'light', dens: '여유',
      acc: '#FF4F2B', bg: '#FBF7F0', alt: '#F3ECE0', ink: '#141414', mu: '#55524C', r: 24, br: 999, hero: 'split', vis: 'mock', illu: 'kids', card: 'shadow', look: 'brandBold', sw2: '#FFE9E3', base: 'warm', ck: 'photo' }
  };
  const ey = (fs, ls, fw, tt) => ({ fs, ls, fw, tt });
  const HD = {
    acpaper: { hf: 'serif', hw: 700, hls: -0.035, h1: 88, h1m: 42, lh1: 1.14, h2: 52, h2m: 32, h3: 28, body: 17, blh: 1.75, lead: 19, ey: ey(14, 0.02, 600, 'none'), sec: 160, secm: 88, w: 1200, gut: 40,
      r: 6, rs: 4, br: 999, bh: 56, bpx: 28, bfw: 600, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'line', em: 'accent', link: 'hover' },
    accine: { hf: 'sans', hw: 800, hls: -0.055, h1: 108, h1m: 44, lh1: 1.06, h2: 56, h2m: 34, h3: 32, body: 17, blh: 1.7, lead: 20, ey: ey(15, 0, 600, 'none'), sec: 160, secm: 88, w: 1200, gut: 40,
      r: 20, rs: 12, br: 999, bh: 58, bpx: 30, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' },
    acposter: { hf: 'sans', hw: 800, hls: -0.065, h1: 136, h1m: 64, lh1: 0.98, h2: 64, h2m: 38, h3: 56, body: 17, blh: 1.75, lead: 20, ey: ey(15, 0, 700, 'none'), sec: 150, secm: 88, w: 1280, gut: 40,
      r: 24, rs: 14, br: 999, bh: 60, bpx: 30, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' }
  };
  const IDS = Object.keys(DEF);
  const SERIF = "'Noto Serif KR','Noto Serif CJK KR','Nanum Myeongjo','AppleMyungjo','Batang',serif";
  const SANS = "Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

  /* 공통 CSS(세 테마 같은 뼈대 · 변수만 다름) */
  const cssBase = (v) => `
.av-w{max-width:${v.w}px;margin:0 auto;padding:0 40px;box-sizing:border-box}
.hpt.av-s,.hpt.hp-s.av-s{padding:${v.sec}px 0;background:${v.bg};color:${v.ink};margin:0;border:0}
.av-s *,.av-h *{box-sizing:border-box}
.av-s h2,.av-h h1{margin:0;font-family:${v.hf};font-weight:${v.hw};color:inherit;word-break:keep-all;overflow-wrap:anywhere}
.av-s p,.av-h p{margin:0}.av-s ol,.av-s ul,.av-s dl,.av-s dd{margin:0;padding:0;list-style:none}
.av-s,.av-h{word-break:keep-all;-webkit-font-smoothing:antialiased;font-family:${SANS}}
.av-ph{margin:0;overflow:hidden;position:relative;background:${v.alt}}.av-ph img{display:block;width:100%;height:100%;object-fit:cover}
.av-lab{font-size:15px;font-weight:600;color:${v.lab};margin:0 0 18px!important}
.av-lead{font-size:19px;line-height:1.78;color:${v.mu}}
.av-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:${v.bh}px;padding:0 ${v.bpx}px;border-radius:999px;font-size:16px;font-weight:${v.bfw};text-decoration:none;white-space:nowrap;transition:transform .15s,background .15s}
.av-b.p{background:${v.a};color:${v.on}}.av-b.p:hover{transform:translateY(-1px)}
.av-b.o{box-shadow:inset 0 0 0 1.5px ${v.ink};color:${v.ink}}
.av-b.gh{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55);color:#fff}
.av-cta{display:flex;flex-wrap:wrap;gap:12px}
.av-ar{flex:none}
.av-lk{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:16px;font-weight:600;color:${v.ink};text-decoration:none;border-bottom:1.5px solid currentColor}
.av-q{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid ${v.ln};border-bottom:1px solid ${v.ln}}
.av-q a{display:flex;align-items:center;gap:10px;min-height:84px;padding:0 28px;color:${v.ink};text-decoration:none;font-size:17px}
.av-q a:first-child{padding-left:0}.av-q a+a{border-left:1px solid ${v.ln}}
.av-q b{font-weight:700;white-space:nowrap}.av-q span{flex:1;min-width:0;font-size:14px;color:${v.mu};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-hint{padding:28px;border:1.5px dashed ${v.ln};border-radius:12px;font-size:15px;color:${v.mu};text-align:center}
/* 2열 이야기 */
.av-story .av-w{display:grid;grid-template-columns:5fr 6fr;gap:96px;align-items:center}
.av-sp{height:720px;border-radius:${v.r}px}
.av-story h2{font-size:${v.h2}px;line-height:1.22;letter-spacing:${v.hls}em;margin-bottom:28px}
.av-pr{margin-top:52px!important}.av-pr li{display:grid;grid-template-columns:72px minmax(0,1fr);padding:26px 0;border-top:1px solid ${v.ln}}.av-pr li:last-child{border-bottom:1px solid ${v.ln}}
.av-pr span{font-family:${v.hf};font-size:28px;font-weight:700;color:${v.pt}}.av-pr b{display:block;font-size:20px;font-weight:700;margin-bottom:6px}.av-pr p{font-size:16px;line-height:1.7;color:${v.mu}}
/* 큰 숫자 */
.av-num .av-w{display:grid;grid-template-columns:auto minmax(0,1fr);gap:88px;align-items:end}
.av-big{font-family:${v.hf};font-weight:800;font-size:${v.big}px;line-height:.82;letter-spacing:-.06em;white-space:nowrap}.av-big small{font-size:.36em;letter-spacing:-.02em;margin-left:.06em}
.av-nt h2{font-size:36px;line-height:1.38;letter-spacing:-.035em}.av-nt p{font-size:17px;line-height:1.75;margin-top:18px!important}.av-fine{font-size:13px!important;opacity:.75}
/* 반 카드 */
.av-hd{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:64px}.av-hd h2{font-size:${v.h2}px;line-height:1.18;letter-spacing:${v.hls}em}
.av-cds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:${v.gap}px}
.av-cd>a{display:block;position:relative;color:inherit;text-decoration:none;border-radius:${v.r}px;overflow:hidden}
.av-cp{display:block;height:${v.ch}px;border-radius:${v.r}px}.av-c0{background:${v.alt}}
.av-cm{display:flex;justify-content:space-between;gap:12px;font-size:15px;padding-top:20px!important;margin-top:20px!important;border-top:1px solid ${v.ln}}.av-cm b{font-weight:700}.av-cm span{color:${v.mu};text-align:right}
.av-cdx{font-size:16px;line-height:1.7;color:${v.mu};margin-top:12px!important}
/* 인용 */
.av-quote blockquote{margin:0;font-family:${v.hf};font-weight:700;letter-spacing:-.04em}
.av-cite{font-size:16px;color:${v.mu};margin-top:36px!important}
/* 마지막 */
.av-fg{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:64px;align-items:end}
.av-fin h2{font-size:${v.fh}px;line-height:1.12;letter-spacing:${v.hls}em}.av-fin h2 em{font-style:normal;color:${v.em}}
.av-fin .av-cta{margin-top:32px}
.av-info{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:110px!important;border-top:1px solid ${v.ln}}
.av-info div{padding:30px 32px 0 0}.av-info div+div{padding-left:32px;border-left:1px solid ${v.ln}}
.av-info dt{font-size:13px;color:${v.mu};margin-bottom:10px}.av-info dd{font-size:17px;font-weight:600;line-height:1.65}
@media(max-width:1000px){.av-story .av-w,.av-fg{grid-template-columns:minmax(0,1fr);gap:48px}.av-sp{height:480px}.av-cds{grid-template-columns:minmax(0,1fr)}.av-num .av-w{grid-template-columns:minmax(0,1fr);gap:36px}}
@media(max-width:760px){.av-w{padding:0 20px}.hpt.av-s,.hpt.hp-s.av-s{padding:${v.secm}px 0}
.av-lead{font-size:17px}.av-b{width:100%}.av-cta{flex-direction:column}
.av-q{grid-template-columns:minmax(0,1fr)}.av-q a,.av-q a:first-child{padding:0;min-height:64px}.av-q a+a{border-left:0;border-top:1px solid ${v.ln}}.av-q span{display:none}.av-q b{flex:1}
.av-sp{height:360px}.av-story h2,.av-hd h2{font-size:${v.h2m}px;margin-bottom:18px}.av-pr{margin-top:32px!important}.av-pr li{grid-template-columns:48px minmax(0,1fr);padding:20px 0}.av-pr span{font-size:22px}.av-pr b{font-size:18px}
.av-big{font-size:${v.bigm}px}.av-nt h2{font-size:26px}
.av-hd{display:block;margin-bottom:36px}.av-hd .av-lk{margin-top:12px}.av-cp{height:${v.chm}px}
.av-fin h2{font-size:${v.fhm}px}.av-info{grid-template-columns:minmax(0,1fr);margin-top:56px!important}.av-info div,.av-info div+div{padding:20px 0;border-left:0}.av-info div+div{border-top:1px solid ${v.ln}}}
@media(prefers-reduced-motion:reduce){.av-b{transition:none}}`;

  const XCSS = {
    acpaper: (v) => `
.hpt.av-h.av-pa{padding:56px 0 0;background:${v.bg};color:${v.ink};text-align:center}
.av-pa .av-kick{font-size:15px;font-weight:600;color:${v.lab}}
.hpt.hp-hero.av-h.av-pa h1{font-size:${v.h1}px!important;line-height:1.14!important;letter-spacing:-.035em!important;margin:22px 0 26px!important}.av-pa h1 em{font-style:normal;color:${v.lab}}
.av-pa .av-sub{font-size:20px;line-height:1.7;color:${v.mu};max-width:760px;margin:0 auto}
.av-pa .av-cta{justify-content:center;margin-top:36px}
.av-pa .av-hi{height:680px;margin:64px -80px 0;border-radius:6px}
.av-pa .av-q{margin-top:56px;text-align:left}
.av-num{background:${v.a}!important;color:${v.on}!important}.av-num .av-nt p{color:${v.on};opacity:.82}
.av-cn{display:block;font-family:${v.hf};font-size:30px;font-weight:700;letter-spacing:-.04em;line-height:1.3;margin-top:10px}
.av-cg{display:block;font-size:13px;font-weight:600;color:${v.lab};margin-top:26px}
.av-quote{background:${v.alt}!important}.av-quote .av-w{display:grid;grid-template-columns:7fr 5fr;gap:96px;align-items:center}.av-quote .av-qp{order:2;height:560px;border-radius:6px}
.av-quote blockquote{font-size:42px;line-height:1.5}.av-quote blockquote::before{content:"\\201C";display:block;font-size:110px;line-height:.6;color:${v.pt};margin-bottom:22px}
.av-fin .av-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.av-fin .av-cta{justify-content:center}.av-fin .av-lead{max-width:640px;margin:0 auto}.av-info{text-align:left}
@media(max-width:1000px){.av-pa .av-hi{margin:56px 0 0}.av-quote .av-w{grid-template-columns:minmax(0,1fr);gap:40px}.av-quote .av-qp{order:-1;height:420px}}
@media(max-width:760px){.hpt.av-h.av-pa{padding:40px 0 0;text-align:left}.hpt.hp-hero.av-h.av-pa h1{font-size:${v.h1m}px!important;line-height:1.24!important;margin:14px 0 18px!important}.av-pa .av-sub{font-size:17px}.av-pa .av-cta{margin-top:28px}
.av-pa .av-hi{height:420px;margin:40px -20px 0;border-radius:0}.av-pa .av-q{margin-top:28px}.av-cn{font-size:25px}.av-quote .av-qp{height:300px}.av-quote blockquote{font-size:27px}.av-quote blockquote::before{font-size:76px;margin-bottom:10px}
.av-fin .av-fg{text-align:left;justify-items:stretch}}`,
    accine: (v) => `
.hpt.av-h.av-ci{position:relative;min-height:min(100vh,1000px);height:900px;padding:0;overflow:hidden;background:${v.bg};color:#fff;display:block}
.av-ci>.av-hi{position:absolute;inset:0;height:100%;background:#000}
.av-ci::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,11,.88) 0%,rgba(8,9,11,.55) 45%,rgba(8,9,11,.15) 78%),linear-gradient(0deg,rgba(8,9,11,.92) 0%,rgba(8,9,11,0) 36%),linear-gradient(180deg,rgba(8,9,11,.55) 0%,rgba(8,9,11,0) 22%);pointer-events:none}
.av-hc{position:absolute;z-index:2;left:0;right:0;bottom:150px}
.av-ci .av-kick{font-size:16px;font-weight:600;color:${v.lab};margin-bottom:26px!important}
.hpt.hp-hero.av-h.av-ci h1{font-size:${v.h1}px!important;line-height:1.06!important;letter-spacing:-.055em!important;color:#fff!important;max-width:1100px}.av-ci h1 em{font-style:normal;color:${v.lab}}
.av-ci .av-sub{font-size:21px;line-height:1.65;color:rgba(255,255,255,.8);margin-top:30px!important;max-width:580px}
.av-ci .av-cta{margin-top:42px}
.av-qb{position:absolute;z-index:2;left:0;right:0;bottom:0;border-top:1px solid rgba(255,255,255,.16)}
.av-ci .av-q{border:0}.av-ci .av-q a{color:#fff;min-height:88px}.av-ci .av-q a+a{border-left-color:rgba(255,255,255,.16)}.av-ci .av-q span{color:rgba(255,255,255,.62)}
.av-stm .av-sm{font-size:60px;line-height:1.3;font-weight:800;letter-spacing:-.05em;color:${v.dim}}.av-stm .av-sm b{color:${v.ink};font-weight:800}
.av-stm{padding-bottom:0!important}
.av-cd>a::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.82) 0%,rgba(0,0,0,0) 58%);pointer-events:none}
.av-co{position:absolute;z-index:2;left:30px;right:30px;bottom:30px;color:#fff}
.av-cg{display:block;font-size:14px;font-weight:600;color:rgba(255,255,255,.78)}
.av-cn{display:block;font-size:32px;line-height:1.22;font-weight:800;letter-spacing:-.05em;margin-top:10px;color:#fff}
.av-cm{border-top:0!important;margin-top:0!important;padding:20px 4px 0!important}
.av-week{background:${v.lt}!important;color:${v.lti}!important}.av-week .av-w{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}
.av-week .av-lab{color:${v.ltl}}.av-week h2{font-size:${v.h2}px;line-height:1.18;letter-spacing:-.05em}.av-week .av-lead{color:${v.ltm};margin-top:22px!important}
.av-wp{height:680px;border-radius:20px}
.av-tl{margin-top:44px!important}.av-tl li{display:grid;grid-template-columns:110px minmax(0,1fr);padding:22px 0;border-top:1px solid ${v.ltln}}.av-tl li:last-child{border-bottom:1px solid ${v.ltln}}
.av-tl span{font-size:15px;font-weight:700}.av-tl b{display:block;font-size:19px;font-weight:700;letter-spacing:-.03em}.av-tl p{font-size:15px;line-height:1.6;color:${v.ltm};margin-top:6px!important}
.av-num .av-big{font-family:${SANS}}.av-num .av-big small{color:${v.lab}}.av-nt p{color:${v.mu}}
.av-quote{position:relative;padding:0!important;min-height:760px;overflow:hidden;display:flex;align-items:center}.av-quote .av-qp{position:absolute;inset:0;height:100%}
.av-quote::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,11,.05) 10%,rgba(8,9,11,.9) 62%);pointer-events:none}
.av-quote .av-w{position:static;width:100%;display:flex;justify-content:flex-end;padding-top:120px;padding-bottom:120px}.av-qt{position:relative;z-index:2;max-width:620px}
.av-quote blockquote{font-family:${SANS};font-size:46px;line-height:1.4;color:#fff}.av-quote .av-cite{color:rgba(255,255,255,.7)}
.av-fin .av-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.av-fin .av-cta{justify-content:center}.av-fin .av-lead{max-width:640px;margin:22px auto 0}.av-fin .av-b.o{box-shadow:inset 0 0 0 1.5px #3A3B40;color:#fff}.av-info{text-align:left}
@media(max-width:1000px){.av-week .av-w{grid-template-columns:minmax(0,1fr);gap:44px}.av-wp{height:420px}}
@media(max-width:760px){.hpt.av-h.av-ci{height:auto;min-height:0}.av-ci::after{background:linear-gradient(0deg,rgba(8,9,11,.97) 0%,rgba(8,9,11,.7) 48%,rgba(8,9,11,.2) 100%)}
.av-hc{position:relative;bottom:auto;padding:300px 0 36px}.av-ci .av-kick{font-size:14px;margin-bottom:14px!important}.hpt.hp-hero.av-h.av-ci h1{font-size:${v.h1m}px!important;line-height:1.16!important}.av-ci .av-sub{font-size:17px;margin-top:18px!important}.av-ci .av-cta{margin-top:28px}
.av-qb{position:relative}.av-ci .av-q a{min-height:62px}.av-ci .av-q a+a{border-top-color:rgba(255,255,255,.16)}
.av-stm .av-sm{font-size:32px;line-height:1.38}.av-cn{font-size:28px}.av-week h2{font-size:${v.h2m}px}.av-wp{height:320px}.av-tl li{grid-template-columns:80px minmax(0,1fr)}
.av-quote{min-height:0;display:block}.av-quote::after{background:linear-gradient(0deg,rgba(8,9,11,.94) 35%,rgba(8,9,11,.3))}.av-quote .av-w{padding-top:260px;padding-bottom:64px}.av-quote blockquote{font-size:28px}
.av-fin .av-fg{text-align:left;justify-items:stretch}}`,
    acposter: (v) => `
.hpt.av-h.av-po{padding:24px 0 0;background:${v.bg};color:${v.ink}}
.av-pg{display:grid;grid-template-columns:1.05fr 1fr;gap:40px;align-items:center;padding-bottom:96px}
.hpt.hp-hero.av-h.av-po h1{font-size:${v.h1}px!important;line-height:.98!important;letter-spacing:-.065em!important}.av-po h1 em{font-style:normal;color:${v.lab}}
.av-po .av-sub{font-size:20px;line-height:1.65;color:${v.mu};margin-top:36px!important;max-width:500px}
.av-po .av-cta{margin-top:40px}
.av-col{position:relative;height:700px}
.av-col .av-ph{position:absolute}
.av-s1{left:0;top:40px;width:330px;height:470px;border-radius:165px 165px 18px 18px}
.av-s2{right:0;top:0;width:290px;height:290px;border-radius:50%}
.av-s3{right:10px;bottom:0;width:340px;height:370px;border-radius:18px}
.av-dot{position:absolute;z-index:2;left:300px;top:6px;width:96px;height:96px;border-radius:50%;background:${v.sun}}
.av-tag{position:absolute;z-index:3;left:40px;bottom:120px;font-size:15px;font-weight:700;background:${v.ink};color:${v.bg};padding:12px 18px;border-radius:999px;transform:rotate(-4deg)}
.av-po .av-q{border-top:2px solid ${v.ink};border-bottom:0}
.av-band h2,.av-gal h2{font-size:${v.h2}px;line-height:1.1;letter-spacing:-.06em}
.av-bd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:72px;align-items:center;margin-top:110px}
.av-bd.rev{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}.av-bd.rev .av-bp{order:2}
.av-bp{height:560px;border-radius:24px}
.av-bi{display:flex;align-items:baseline;gap:14px;font-size:16px;font-weight:700;color:${v.mu}}.av-bi span{color:${v.lab}}
.av-bd h3{margin:14px 0 0;font-size:${v.h3}px;line-height:1.05;font-weight:800;letter-spacing:-.06em}
.av-bx{font-size:18px;line-height:1.75;color:${v.mu};margin-top:24px!important}
.av-bd dl{margin-top:32px!important;display:grid;grid-template-columns:auto minmax(0,1fr);border-top:2px solid ${v.ink}}
.av-bd dt,.av-bd dd{padding:16px 0;border-bottom:1px solid ${v.ln};font-size:16px}.av-bd dt{font-weight:700;padding-right:36px}.av-bd dd{color:${v.mu}}
.av-bd .av-lk{margin-top:24px;color:${v.lab}}
.av-num{background:${v.a}!important;color:${v.on}!important;overflow:hidden}.av-num .av-big{font-family:${SANS};font-size:${v.big}px}.av-nt h2{font-size:44px;line-height:1.25;letter-spacing:-.05em}.av-nt p{opacity:.85}
.av-gl{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:300px 300px;gap:20px;margin-top:64px}
.av-gl a{position:relative;display:block;border-radius:24px;overflow:hidden;color:${v.ink};text-decoration:none}.av-gl .av-ph{height:100%}
.av-gl a:first-child{grid-row:span 2}.av-gl.n4 a:last-child{grid-column:span 2}.av-gl.n3{grid-template-columns:1.3fr 1fr}
.av-gl em{position:absolute;left:18px;bottom:18px;font-style:normal;font-size:14px;font-weight:700;background:${v.bg};padding:9px 15px;border-radius:999px;max-width:calc(100% - 36px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-quote{padding-top:0!important}.av-quote .av-w{display:grid;grid-template-columns:auto minmax(0,1fr);gap:88px;align-items:center}.av-quote .av-qp{width:420px;height:420px;border-radius:50%}
.av-quote blockquote{font-family:${SANS};font-size:46px;line-height:1.38;letter-spacing:-.055em}.av-cite{font-weight:600}
.av-fin{background:${v.ink}!important;color:${v.bg}!important;padding-bottom:40px!important}.av-fin h2{line-height:1.02}.av-fin h2 em{color:${v.sun}}.av-fin .av-lead{color:rgba(255,255,255,.72)}
.av-fin .av-b.o{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4);color:#fff}.av-fin .av-info{border-top-color:#2E2E2E}.av-fin .av-info div+div{border-left-color:#2E2E2E}.av-fin .av-info dt{color:#9A9A9A}
@media(max-width:1000px){.av-pg{grid-template-columns:minmax(0,1fr)}.av-col{order:-1;max-width:640px}.av-bd,.av-bd.rev{grid-template-columns:minmax(0,1fr);gap:28px;margin-top:64px}.av-bd.rev .av-bp{order:0}.av-quote .av-w{grid-template-columns:minmax(0,1fr);gap:40px}}
@media(max-width:760px){.hpt.av-h.av-po{padding:12px 0 0}.av-pg{gap:28px;padding-bottom:48px}.hpt.hp-hero.av-h.av-po h1{font-size:${v.h1m}px!important}.av-po .av-sub{font-size:17px;margin-top:20px!important}.av-po .av-cta{margin-top:26px}
.av-col{height:420px}.av-s1{width:190px;height:290px;top:30px;border-radius:95px 95px 14px 14px}.av-s2{width:170px;height:170px}.av-s3{width:180px;height:200px;right:0}
.av-dot{left:160px;top:0;width:56px;height:56px}.av-tag{left:8px;bottom:64px;font-size:13px;padding:9px 14px}
.av-band h2,.av-gal h2{font-size:${v.h2m}px}.av-bp{height:300px}.av-bd h3{font-size:40px}.av-bx{font-size:16px}
.av-nt h2{font-size:28px}.av-gl{grid-template-columns:1fr 1fr!important;grid-template-rows:260px 170px 170px;gap:12px;margin-top:36px}.av-gl a:first-child{grid-row:auto;grid-column:span 2}.av-gl.n3{grid-template-rows:240px 180px}
.av-quote .av-qp{width:240px;height:240px}.av-quote blockquote{font-size:29px}}`
  };

  function vars(s, th, T) { const id = s.theme; const raw = /^#[0-9a-f]{6}$/i.test(String(s.color || '')) ? s.color : ((T && T.a0) || th.acc); const a = id === 'acpaper' ? ((T && T.a) || th.acc) : raw; const bg = th.bg, ink = th.ink, on = onC(a);
    const D = HD[id]; const base = { w: D.w, sec: D.sec, secm: D.secm, h1: D.h1, h1m: D.h1m, h2: D.h2, h2m: D.h2m, h3: D.h3, bh: D.bh, bpx: D.bpx, bfw: D.bfw, hls: D.hls, hw: D.hw, hf: D.hf === 'serif' ? SERIF : SANS, a, on, bg, ink, alt: th.alt, r: D.r };
    if (id === 'acpaper') return Object.assign(base, { mu: fit(th.mu, th.alt, 4.6), ln: '#D9D2C3', lab: fit(a, bg, 4.6), pt: fit('#B8741E', bg, 3.2), big: 260, bigm: 150, gap: 32, ch: 400, chm: 280, fh: 80, fhm: 40, em: fit(a, bg, 4.6), hw: 700 });
    if (id === 'accine') return Object.assign(base, { mu: fit(th.mu, th.bg, 4.6, '#ffffff'), ln: '#26272B', lab: fit(a, bg, 4.6, '#ffffff'), pt: a, big: 260, bigm: 116, gap: 24, ch: 520, chm: 440, fh: 84, fhm: 42, em: fit(a, bg, 4.6, '#ffffff'),
      dim: '#55555A', lt: '#F1EEE8', lti: '#18181A', ltm: '#5E5C57', ltln: '#DAD5CB', ltl: fit(mix(a, '#000000', .25), '#F1EEE8', 4.6) });
    return Object.assign(base, { mu: fit(th.mu, th.alt, 4.6), ln: '#E6DFD2', lab: fit(mix(a, '#000000', .12), bg, 4.5), pt: a, big: 340, bigm: 170, gap: 28, ch: 420, chm: 320, fh: 96, fhm: 48, em: '#FFC531', sun: '#FFC531' }); }
  function cssX(s, th, T) { try { const v = vars(s, th, T || {}); const x = XCSS[s.theme]; return cssBase(v) + (x ? x(v) : ''); } catch (e) { console.error('hpv-acad css', e); return ''; } }

  /* ── 등록 ── */
  IDS.forEach(id => { HPT.reg(id, Object.assign({ prem: 1, cssX, hk: 'hpv', hp: 'hpv' }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpv-acad HPD', e); } });
  const mine = s => { try { return !!(s && s.theme && IDS.includes(s.theme)); } catch (e) { return false; } };
  if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, t2) => DEF[id] ? DEF[id].tags.includes(t2 || ty()) : f0(id, t2); }
  if (typeof HPT.premFor === 'function') { const p0 = HPT.premFor; HPT.premFor = t2 => { const L0 = p0(t2); const k = t2 || ty(); const fit1 = IDS.filter(id => DEF[id].tags.includes(k)); return [...fit1, ...L0.filter(x => !IDS.includes(x))]; }; }
  if (window.HPS && typeof HPS.hero === 'function') { const h0 = HPS.hero; HPS.hero = (kind, s, d, th, T) => { try { if (mine(s) && (!d || !d.hk)) return HERO[s.theme](s, d || {}); } catch (e) { console.error('hpv-acad hero', e); } return h0(kind, s, d, th, T); }; }
  { const base = proSec; proSec = (x, i, s, lk) => { const d = x && x.data; const r = d && x.type === 'text' && SECR[d.hpt];
    if (!r || !s || !mine(s)) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    let h = null; try { h = r(d, s); } catch (e) { console.error('hpv-acad', d.hpt, e); h = null; }
    if (h == null) return base(x, i, s, lk); if (!h) return '';
    const m = editing() ? HPE.map.get(x) : null; if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; window.proSec = proSec; }
  { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!IDS.includes(id) || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(x => x.id === 'prem-' + id); if (tp && typeof tp.build === 'function') { b.sections = tp.build(); setPhotos(b, id); }
      return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpv-acad thumb', e); return tb(s, id); } }; }

  /* ── 템플릿(기본 섹션 + 문구 · 운영자가 편집) ── */
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const TX = (variant, data) => S2('text', { variant, ...data });
  const AUTO = [['자동', '공개 강좌 정보로 자동으로 채워요']];
  /* HPT.enrich가 숫자 띠 · 강사진 · FAQ를 끼워 넣지 않게 숨긴 자리를 미리 둔다(운영자가 편집기에서 켜면 보인다) */
  const KEEP = () => [['facts', 'stats', { title: '' }], ['people', 'profiles', { eyebrow: '강사진', title: '함께하는 선생님' }], ['faq', 'info', { eyebrow: 'FAQ', title: '자주 묻는 질문' }]].map(([h, v, x]) => { const o = TX(v, Object.assign({ hpt: h, cols: [] }, x)); o.hide = true; return o; });
  const PH = {
    acpaper: { k12: { hero: 'kid-07', about: 'hum-39', quote: 'hum-35' }, adult: { hero: 'hum-36', about: 'hum-01', quote: 'hum-37' } },
    accine: { k12: { hero: 'hum-13', wk: 'cam-07', quote: 'hum-12' }, adult: { hero: 'hum-12', wk: 'grp-02', quote: 'hum-36' } },
    acposter: { k12: { hero: 'hum-25', h2: 'hum-27', h3: 'spo-03', quote: 'kid-09' }, adult: { hero: 'hum-24', h2: 'hum-27', h3: 'hum-30', quote: 'hum-40' } }
  };
  const HEAD = { acpaper: { head: 'solid', foot: 'min' }, accine: { head: 'overlay', foot: 'min' }, acposter: { head: 'solid', foot: 'min' } };
  function setPhotos(s, id) { const P = PH[id] && PH[id][kid() ? 'k12' : 'adult']; if (!P) return s;
    s.photos = Object.assign({}, P); s.img = s.img || {};
    if (window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') Object.keys(P).forEach(sl => { if (!['hero', 'about'].includes(sl)) return; const v = HPSTOCK.slotImg(P[sl], sl); if (v) s.img[sl] = v; });
    s.hps = Object.assign({}, s.hps || {}, HEAD[id]); return s; }
  const BUILD = {
    acpaper: () => { const k = kid(); return [
      S2('banner', { eyebrow: k ? '초등 · 중등 · 고등' : '성인 정규반 · 소수 정원', title: k ? '아이의 다음 학기를,\n*한 장씩* 함께 그려요' : '배운 만큼,\n*차근차근* 쌓여요', sub: k ? '수업이 끝나면 오늘 배운 것과 숙제를 학부모님께 바로 알려 드려요.' : '레벨 상담으로 반을 정하고, 수업 · 과제 · 수료까지 내 계정에서 한 번에 챙겨요.', cta: '', cta2: '' }),
      TX('features', { hpt: 'av-story', eyebrow: k ? '교육 방침' : '수업 방식', title: k ? '빨리 가는 것보다\n제대로 아는 것' : '짧게 배우고\n오래 남게', body: k ? '진도를 앞서 나가기보다, 오늘 배운 한 단원을 스스로 설명할 수 있을 때 다음으로 넘어가요. 그래서 반은 작고, 질문은 많아요.' : '한 번에 많이 배우기보다, 오늘 배운 것을 바로 써 보고 다음으로 넘어가요. 과제마다 강사가 직접 의견을 남겨요.',
        cols: k ? [['레벨 테스트로 반 배정', '입학 전 진단으로 아이에게 맞는 반부터 찾아요.'], ['수업이 끝나면 바로 알림', '출결 · 오늘 배운 단원 · 숙제를 학부모님 휴대폰으로 보내 드려요.'], ['틀린 문제는 다음 수업 첫 10분에', '오답만 모아 다시 풀고 넘어가요.']] : [['레벨 상담으로 시작', '첫 수업 전에 실력을 확인하고 반을 정해요.'], ['과제 피드백', '제출한 과제에 강사가 직접 의견을 남겨요.'], ['수료까지 관리', '남은 차시와 수료 기준을 계속 알려 드려요.']] }),
      TX('features', { hpt: 'av-num', pref: 'review', body: k ? '학기마다 보내 드리는 학습 리포트와 1:1 상담으로 다음 학기를 함께 정해요.' : '수업이 끝날 때마다 남긴 의견을 모아 다음 반을 함께 정해요.', cols: AUTO }),
      TX('features', { hpt: 'av-cls', eyebrow: '수업 안내', title: '지금 모집 중인 반', cols: AUTO }),
      TX('features', { hpt: 'av-quote', cols: AUTO }),
      ...KEEP(), TX('cta', { hpt: 'av-fin', title: '먼저 한 번,\n수업으로 만나요', body: k ? '체험 수업이 끝나면 담당 선생님이 아이에게 맞는 반을 말씀드려요.' : '상담이 끝나면 담당 강사가 맞는 반과 시작일을 안내해 드려요.', cta: '', cols: AUTO })]; },
    accine: () => { const k = kid(); return [
      S2('banner', { eyebrow: k ? '중 · 고등 저녁 집중반' : '직장인 영어 · 자격 · 실무 저녁반', title: k ? '학교가 끝난 저녁이\n*성적*이 돼요' : '퇴근 후 두 시간이\n다음 *커리어*가 돼요', sub: k ? '평일 저녁, 소수 정원 집중반에서. 매주 테스트 결과를 학부모님께 보내 드려요.' : '평일 저녁, 소수 정원 강의실에서. 수업은 짧게, 연습은 출근길 10분으로 이어 가요.', cta: '', cta2: '' }),
      TX('features', { hpt: 'av-stm', body: k ? '평일 저녁, 소수 정원. 수업은 짧게, *복습은 매일 10분*으로 이어 가요.' : '평일 저녁, 소수 정원. 수업은 짧게, *연습은 출근길 10분*으로 이어 가요.', cols: AUTO }),
      TX('features', { hpt: 'av-cls', eyebrow: '지금 모집', title: '지금 신청할 수 있는 과정', cols: AUTO }),
      TX('features', { hpt: 'av-week', eyebrow: '한 주의 흐름', title: '수업은 강의실에서,\n나머지는 생활 속에서', body: '바쁜 주에도 끊기지 않게, 한 주를 이렇게 나눠 두었어요.',
        cols: k ? [['수업일', '강의실 집중 수업', '개념 설명과 문제 풀이를 한 번에'], ['다음 날', '복습 10분', '어제 틀린 문제만 휴대폰으로 다시'], ['주말', '주간 테스트', '단원별 테스트로 이번 주를 점검해요'], ['일요일', '학부모 리포트', '출결 · 과제 · 점수를 한 장으로']]
          : [['수업일', '강의실 수업', '짝을 바꿔 가며 말하고 쓰는 시간'], ['다음 날', '출근길 복습 10분', '틀린 표현만 휴대폰으로 다시'], ['두 번째 수업', '수업 + 피드백', '과제에 강사가 직접 의견을 달아요'], ['일요일', '주간 리포트', '출석 · 과제 · 다음 주 목표 한 장']] }),
      TX('features', { hpt: 'av-num', pref: 'review', body: '', cols: AUTO }),
      TX('features', { hpt: 'av-quote', cols: AUTO }),
      ...KEEP(), TX('cta', { hpt: 'av-fin', title: '이번 주에\n*레벨 테스트*로 시작해요', body: '테스트가 끝나면 담당 강사가 맞는 반과 시작 시점을 알려 드려요.', cta: '', cols: AUTO })]; },
    acposter: () => { const k = kid(); return [
      S2('banner', { eyebrow: '', title: k ? '그리고,\n치고,\n*뛰어요.*' : '만들고,\n연주하고,\n*움직여요.*', sub: k ? '손과 몸으로 배우는 수업. 소수 정원 반에서 좋아하는 걸 찾을 때까지 골고루 해 봐요.' : '퇴근 후와 주말, 손과 몸으로 배우는 클래스. 처음이어도 한 번에 완성해요.', tag: '', cta: '', cta2: '' }),
      TX('features', { hpt: 'av-band', eyebrow: '수업', title: '좋아하는 걸 찾을 때까지,\n골고루 해 봐요', cols: AUTO }),
      TX('features', { hpt: 'av-num', pref: 'ratio', body: '그래서 손 모양 하나, 자세 하나까지 한 명씩 고쳐 줄 수 있어요.', cols: AUTO }),
      TX('features', { hpt: 'av-gal', eyebrow: '갤러리', title: k ? '이번 학기, 아이들의 시간' : '이번 시즌, 수강생의 시간', cols: AUTO }),
      TX('features', { hpt: 'av-quote', cols: AUTO }),
      ...KEEP(), TX('cta', { hpt: 'av-fin', title: '한 번,\n*와 보세요.*', body: k ? '체험 수업이 끝나면 선생님이 아이가 어떤 수업에서 가장 즐거워했는지 말씀드려요.' : '체험 수업으로 먼저 해 보고, 맞으면 정규반으로 이어 가요.', cta: '', cols: AUTO })]; }
  };
  /* 점검 · 시연용 강좌 이름(채운 기관의 qc0~5를 업종에 맞게 — tests/ui/hp-visual/lib.js applyTpl) */
  const QA = {
    acpaper: { k12: ['초등 사고력 수학', '중등 내신 영어 독해', '고등 수능 수학 기본', '중1 국어 문법', '초등 영어 리딩', '무료 레벨 테스트 수업'], adult: ['비즈니스 영어 회화', '토익 실전 800', '일본어 첫걸음', '중국어 HSK 4급', '영어 프레젠테이션', '무료 레벨 상담 수업'] },
    accine: { k12: ['고1 수학 내신 집중', '고2 영어 독해 심화', '중3 과학 선행', '고3 국어 수능 특강', '중2 수학 개념 완성', '무료 진단 테스트'], adult: ['비즈니스 영어 회화', '토익 900 집중반', '실무 엑셀과 데이터 분석', '파이썬 업무 자동화', '영어 이메일 쓰기', '무료 레벨 테스트'] },
    acposter: { k12: ['어린이 수채화 드로잉', '피아노 1:1 레슨', '어린이 농구 교실', '소조 · 만들기 교실', '바이올린 기초', '토요 무료 체험 수업'], adult: ['도예 물레 클래스', '성인 피아노 입문', '드로잉 · 수채화', '기타 코드 첫걸음', '필라테스 소그룹', '원데이 무료 체험'] }
  };
  const SCENE = { acpaper: '학원 · 초중고 — 세리프 큰 제목과 사진 한 장, 교육 방침 · 반 카드 · 실제 후기로 학부모 신뢰를 얻는 에디토리얼', accine: '학원 · 성인 · 저녁반 — 전체 화면 사진과 큰 흰 제목, 과정 카드 · 한 주 흐름 · 큰 숫자 · 사진 위 후기', acposter: '학원 · 예체능 · 어린이 — 큰 세 줄 제목과 사진 콜라주, 반별 큰 사진 띠 · 정원 띠 · 갤러리' };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpvac) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && /^prem-/.test(tp.id) ? tp.id.slice(5) : ''; if (IDS.includes(id)) setPhotos(s, id); } catch (e) { console.error('hpv-acad photos', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hpvac = 1; siteFromTpl = f; window.siteFromTpl = f; }
  IDS.forEach(id => { if (TPL.some(x => x.id === 'prem-' + id)) return;
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: SCENE[id], color: DEF[id].acc, tone: id === 'acpaper' ? '신뢰' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: ['apply', 'info'], prem: 1, hpv: 'acad', build: BUILD[id], noPalette: true, get qaCls() { return (QA[id] || {})[kid() ? 'k12' : 'adult'] || null; } }); });
  window.HPV = Object.assign(window.HPV || {}, { acad: { ids: IDS.slice(), SECR: Object.keys(SECR) } });
})();
