/* v44 hp44-k12 — 학원 · 초중고(k12) 홈페이지 템플릿 10종(세부 유형별)
   대표님(2026-11-18): 「기관 유형별로 … 세부 유형별로 시나리오에 맞게 높은 퀄리티의 템플릿만 … 각 10개씩」 「다른 유형의 템플릿도 아주 잘 디자인되어 있는 고퀄리티」
   기준선: v43.9 hpv-acad 3종(에디토리얼 · 시네마틱 다크 · 포스터) — 이 파일이 흡수 · 발전시킨다(같은 id는 다시 쓰지 않는다).
   id: HPT.reg · HPD.reg · lhpth가 /^[a-z]{2,16}$/만 받으므로(숫자 불가) 학원 접두어를 「kf」로 쓴다(BRIEF 예시 k4math → kfmath). 템플릿 id는 't44-' + id.
   10종(세부 유형 · 첫 화면 구성)
     kfmath 수학(분할) · kfeng 영어(사진 액자) · kfessay 국어 · 논술(에디토리얼) · kfprep 종합 입시(전통 · 격식, 문장 · 아치 액자) · kfsci 과학 · 탐구(다크 시네마틱)
     kfkids 유아 · 초등 저학년(둥근 사진 방울) · kfcode 코딩 · STEAM(모눈종이 · 굵은 테두리) · kfart 미술(포스터 콜라주) · kfmusic 음악(반반 분할) · kfsport 체육 · 태권도(노란 색면 띠)
   원칙: 첫 화면 = 큰 제목 + 짧은 부제 + 버튼 2개 + 사진(또는 타이포 색면). 재원생 학부모 · 학생 · 결제는 첫 화면 아래 한 줄 바로 가기(#login/family · #login/my · #login/mypay).
   사실: 반 · 요일 · 시간 · 정원 · 수강료는 공개 강좌(S.classes), 큰 숫자는 계산 가능한 값(후기 평점 4.0 이상 · 소수 정원 · 반 수 3개 이상), 후기는 실제 후기(HPT.reviews), 소식은 S.notices — 없으면 숨김(편집 중에는 안내).
   CSS는 cssX 문자열(게시본 Shadow DOM · 미리보기 공통). 클래스 접두어 k4-. hpth · hpprem · hpsec* · hpv-*는 고치지 않는다. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const U = HPT.U; const { mix, fit } = U;
  const onC = HPT.onColor || (c => U.CR(c, '#0B0F0D') >= U.CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF');
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const br = v => E(v).replace(/\n/g, '<br>');
  const emph = v => E(v).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\*/g, '').replace(/\n/g, '<br>');
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const val = v => (v && !isPh(v) ? String(v) : '');
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
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
  const dayTx = c => daysOf(c).map(x => DN[x]).join(' · ');
  const whenOf = c => [dayTx(c), timeOf(c)].filter(Boolean).join(' ');
  const priceOf = c => (+c.price ? `${W(c.price)}원` : '무료 체험');
  const seatOf = c => { const l = leftOf(c); return l == null ? '' : l === 0 ? '대기 접수' : `남은 자리 ${l}`; };
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  const L = {
    cls: s => { const m = menu(s, 'class'); return m ? '#p-m-' + m.id : (pub()[0] ? '#p-c-' + pub()[0].id : '#login/my'); },
    c: c => '#p-c-' + c.id,
    ask: s => { const f = ft(); if (val(f.tel)) return telH(f.tel); const m = menu(s, 'community') || menu(s, 'board'); if (m) return '#p-m-' + m.id; if (f.email && /@/.test(f.email)) return 'mailto:' + f.email; return L.cls(s); },
    trial: s => { const c = pub().find(x => !+x.price); return c ? L.c(c) : L.cls(s); },
    notice: s => { const m = menu(s, 'notice'); return m ? '#p-m-' + m.id : '#notice'; }
  };
  const aT = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const AR = '<svg class="k4-ar" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ── 사진 ── */
  const ph = (s, slot, d) => { try { return window.HPS && HPS.photo ? HPS.photo(s, slot, d) : null; } catch (e) { return null; } };
  const img = (p, cls, eager, slot) => p ? `<figure class="k4-ph${cls ? ' ' + cls : ''}"${slot ? ` data-slot="${E(slot)}"` : ''}${slot === 'hero' ? ' data-hero="1"' : ''}${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 760px) 100vw, 60vw"` : ''} alt="${E(p.alt || '')}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos || '50% 50%')}"></figure>` : '';
  const fig = (s, slot, cls, eager, d) => img(ph(s, slot, d), cls, eager, slot);
  let USED = new Set(); const fresh = () => { USED = new Set(); };
  const clsPh = (c, s, i) => { let m = null; try { m = HPS.cardImg ? HPS.cardImg(c, s) : null; } catch (e) { m = null; }
    const key = m ? String(m.stock || m.big || m.src).replace(/-800(?=\.webp)/, '').replace(/^.*\/img\/stock\//, '').replace(/\.webp.*$/, '') : '';
    if (m && !USED.has(key)) { USED.add(key); return { src: m.big || m.src, alt: m.alt || c.name, pos: m.pos, stock: !!m.stock }; }
    try { let x = null; for (let k = 0; k < 8 && (!x || USED.has(x.id)); k++) x = HPSTOCK.photo(c.name, c.id + '|' + i + '|' + k, { id: true, slot: 'card', scope: 'k4-' + c.id + k }); if (x) { USED.add(x.id); return { src: HPSTOCK.url(x), alt: x.alt, pos: x.focus, stock: true }; } } catch (e) { }
    return null; };

  /* ── 공통 조각 ── */
  const sec = (cls, inner, pre) => `<section class="hpt hp-s k4-s ${cls}">${pre || ''}<div class="k4-w">${inner}</div></section>`;
  const hint = (cls, msg) => editing() ? sec(cls, `<p class="k4-hint">${E(msg)}</p>`) : '';
  const lab = t2 => t2 ? `<p class="k4-lab">${E(t2)}</p>` : '';
  const btn = (l, h, k) => `<a class="k4-b ${k || ''}" ${aT(h)}>${E(l)}${k === 'p' ? AR : ''}</a>`;
  const GEN = /^(수업|강좌|과정) 둘러보기$|^$/;
  const ctas = (s, d) => { const c1 = GEN.test(d.cta || '') ? '체험 수업 신청' : d.cta; const c2 = GEN.test(d.cta2 || '') || d.cta2 === c1 ? '상담 예약' : d.cta2;
    return `<div class="k4-cta">${btn(c1, L.trial(s), 'p')}${btn(c2, L.ask(s), 'o')}</div>`; };
  const quick = () => `<nav class="k4-q" aria-label="바로 가기">${[['재원생 학부모', '출결 · 숙제 · 성적 알림', '#login/family'], ['학생', '오늘 수업 · 복습', '#login/my'], ['수강료 결제', '청구서 · 영수증', '#login/mypay']].map(([a, b, h]) => `<a ${aT(h)}><b>${E(a)}</b><span>${E(b)}</span>${AR}</a>`).join('')}</nav>`;
  const head = d => `${d.eyebrow ? `<p class="k4-kick">${E(d.eyebrow)}</p>` : ''}<h1>${emph(d.title || org())}</h1>${d.sub ? `<p class="k4-sub">${E(d.sub)}</p>` : ''}`;

  /* ── 큰 숫자: 계산 가능하고 내세울 만한 값만 ── */
  function bigNum(pref) { let R = []; try { R = (HPT.reviews() || []).filter(r => +r.st > 0); } catch (e) { }
    const C = pub(); const caps = C.map(capOf).filter(Boolean); const avg = R.length ? R.reduce((a, r) => a + Math.min(5, +r.st), 0) / R.length : 0;
    const rv = R.length >= 2 && avg >= 4 ? { v: avg.toFixed(1), u: '/5', t: '학부모 · 학생이 남긴\n실제 후기 평점이에요', n: `수강후기 ${R.length}건 평균` } : null;
    const cap = caps.length ? Math.max(...caps) : 0;
    const cp = cap && cap <= 20 ? (pref === 'ratio' ? { v: `1:${cap}`, u: '', t: `선생님 한 명이 보는 인원은\n최대 ${cap}명이에요`, n: '공개 반 정원 기준' } : { v: String(cap), u: '명', t: `한 반은\n최대 ${cap}명까지만 받아요`, n: `공개 반 ${C.length}개의 정원 기준` }) : null;
    const nc = C.length >= 3 ? { v: String(C.length), u: '개 반', t: '지금 신청할 수 있는\n반이 열려 있어요', n: '공개 강좌 기준' } : null;
    const order = pref === 'ratio' ? [cp, rv, nc] : pref === 'count' ? [nc, rv, cp] : [rv, cp, nc];
    return order.find(Boolean) || null; }

  /* ══ 첫 화면 10종 ══ */
  const H0 = (s, cls, inner, dark) => `<section class="hpt hp-hero hps-hero k4-h ${cls}"${dark ? ' data-hps-dark="1"' : ''}>${inner}</section>`;
  const crest = n => { const c = (String(n || '').replace(/\s/g, '')[0] || '學'); return `<svg class="k4-crest" viewBox="0 0 64 76" width="64" height="76" aria-hidden="true" focusable="false"><path d="M32 2 60 12v24c0 18-12 31-28 38C16 67 4 54 4 36V12z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M32 8 54 16v20c0 14-9 25-22 31C19 61 10 50 10 36V16z" fill="none" stroke="currentColor" stroke-width="1"/><text x="32" y="45" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor">${E(c)}</text></svg>`; };
  const HERO = {
    kfmath: (s, d) => H0(s, 'k4-split', `<div class="k4-w"><div class="k4-sg"><div class="k4-st">${head(d)}${ctas(s, d)}</div>${fig(s, 'hero', 'k4-hi', 1, d)}</div>${quick()}</div>`),
    kfeng: (s, d) => H0(s, 'k4-frame', `<div class="k4-w"><div class="k4-fr">${fig(s, 'hero', 'k4-hi', 1, d)}<div class="k4-fc">${head(d)}${ctas(s, d)}</div></div>${quick()}</div>`, 0),
    kfessay: (s, d) => H0(s, 'k4-center', `<div class="k4-w">${head(d)}${ctas(s, d)}${fig(s, 'hero', 'k4-hi', 1, d)}${quick()}</div>`),
    kfprep: (s, d) => H0(s, 'k4-formal', `<div class="k4-w"><div class="k4-cr">${crest(org())}</div>${d.eyebrow ? `<p class="k4-kick">${E(d.eyebrow)}</p>` : ''}<h1>${emph(d.title || org())}</h1><p class="k4-rule" aria-hidden="true"><i></i><b>◆</b><i></i></p>${d.sub ? `<p class="k4-sub">${E(d.sub)}</p>` : ''}${ctas(s, d)}${fig(s, 'hero', 'k4-hi', 1, d)}${quick()}</div>`),
    kfsci: (s, d) => H0(s, 'k4-cine', `${fig(s, 'hero', 'k4-hi', 1, d)}<div class="k4-hc"><div class="k4-w">${head(d)}${ctas(s, d)}</div></div><div class="k4-qb"><div class="k4-w">${quick()}</div></div>`, 1),
    kfkids: (s, d) => H0(s, 'k4-bubble', `<div class="k4-w"><div class="k4-bg2"><div class="k4-bt">${head(d)}${ctas(s, d)}</div><div class="k4-bub">${fig(s, 'hero', 'k4-b1', 1, d)}${fig(s, 'h2', 'k4-b2', 1)}${fig(s, 'h3', 'k4-b3', 1)}<i class="k4-d1"></i><i class="k4-d2"></i><i class="k4-d3"></i></div></div>${quick()}</div>`),
    kfcode: (s, d) => H0(s, 'k4-grid', `<div class="k4-w"><div class="k4-gg"><div class="k4-gt">${d.eyebrow ? `<p class="k4-kick"><span>[</span> ${E(d.eyebrow)} <span>]</span></p>` : ''}<h1>${emph(d.title || org())}</h1>${d.sub ? `<p class="k4-sub">${E(d.sub)}</p>` : ''}${ctas(s, d)}</div><div class="k4-gc">${fig(s, 'hero', 'k4-hi', 1, d)}${fig(s, 'h2', 'k4-g2', 1)}</div></div>${quick()}</div>`),
    kfart: (s, d) => { const a = ph(s, 'hero', d), b = ph(s, 'h2'), c = ph(s, 'h3');
      return H0(s, 'k4-collage', `<div class="k4-w"><div class="k4-pg"><div class="k4-pt"><h1>${emph(d.title || org())}</h1>${d.sub ? `<p class="k4-sub">${E(d.sub)}</p>` : ''}${ctas(s, d)}</div><div class="k4-col">${img(a, 'k4-s1', 1, 'hero')}${img(b, 'k4-s2', 1)}<i class="k4-dot" aria-hidden="true"></i>${img(c, 'k4-s3', 1)}</div></div>${quick()}</div>`); },
    kfmusic: (s, d) => H0(s, 'k4-half', `<div class="k4-hl">${fig(s, 'hero', 'k4-hi', 1, d)}</div><div class="k4-hr"><div class="k4-hri">${head(d)}${ctas(s, d)}${quick()}</div></div>`),
    kfsport: (s, d) => H0(s, 'k4-slab', `${fig(s, 'hero', 'k4-hi', 1, d)}<div class="k4-sl"><div class="k4-w">${d.eyebrow ? `<p class="k4-kick">${E(d.eyebrow)}</p>` : ''}<h1>${emph(d.title || org())}</h1><div class="k4-slr">${d.sub ? `<p class="k4-sub">${E(d.sub)}</p>` : ''}${ctas(s, d)}</div></div></div><div class="k4-w">${quick()}</div>`)
  };

  /* ══ 섹션 렌더러(data.hpt = 'k4-*') ══ */
  const SECR = {
    'k4-story': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 3);
      return sec('k4-story', `${fig(s, 'about', 'k4-sp', 0)}<div class="k4-stx">${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${val(d.body) ? `<p class="k4-lead">${br(d.body)}</p>` : ''}
        ${P.length ? `<ol class="k4-pr">${P.map((r, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><div><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</div></li>`).join('')}</ol>` : ''}</div>`); },
    'k4-steps': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 4); if (!P.length) return hint('k4-steps', '단계(제목 · 설명)를 입력하면 표시됩니다.');
      const num = i => d.nst === 'roman' ? ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][i] : String(i + 1).padStart(2, '0');
      return sec('k4-steps', `<header class="k4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div></header><ol class="k4-sp4 n${P.length}">${P.map((r, i) => `<li><span class="k4-sn">${num(i)}</span><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</li>`).join('')}</ol>`); },
    'k4-num': (d, s) => { const n = bigNum(d.pref); if (!n) return hint('k4-num', '공개 강좌나 실제 후기가 생기면 큰 숫자(후기 평점 · 소수 정원 · 반 수)가 자동으로 표시됩니다.');
      return sec('k4-num', `<p class="k4-big">${E(n.v)}${n.u ? `<small>${E(n.u)}</small>` : ''}</p><div class="k4-nt"><h2>${br(n.t)}</h2>${val(d.body) ? `<p>${br(d.body)}</p>` : ''}<p class="k4-fine">${E(n.n)}</p></div>`); },
    'k4-cls': (d, s) => { fresh(); const C = pub().slice(0, d.lay === 'rows' ? 5 : 3); if (!C.length) return hint('k4-cls', '공개 강좌가 생기면 반 카드가 자동으로 채워집니다.');
      const more = `<a class="k4-lk" ${aT(L.cls(s))}>전체 수업 보기${AR}</a>`;
      if (d.lay === 'rows') return sec('k4-cls k4-rows', `<header class="k4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div>${more}</header><ul class="k4-rl">${C.map((c, i) => `<li><a ${aT(L.c(c))}><span class="k4-ri">${['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][i]}</span><span class="k4-rn"><b>${E(c.name)}</b><small>${E(whenOf(c) || '일정은 상담으로 안내해요')}</small></span><span class="k4-rp">${E(priceOf(c))}<small>${E(seatOf(c))}</small></span>${AR}</a></li>`).join('')}</ul>`);
      const card = (c, i) => { const p = clsPh(c, s, i); const desc = val(c.sub) || val(c.desc) || '';
        return `<article class="k4-cd"><a ${aT(L.c(c))}>${p ? img(p, 'k4-cp', 0) : '<span class="k4-cp k4-c0" aria-hidden="true"></span>'}<span class="k4-co"><span class="k4-cg">${E(c.cat || (c.hours ? `총 ${c.hours}시간` : '정규반'))}</span><b class="k4-cn">${E(c.name)}</b></span></a>${desc ? `<p class="k4-cdx">${E(desc)}</p>` : ''}<p class="k4-cm"><b>${E(whenOf(c) || '일정은 상담으로 안내해요')}</b><span>${E([priceOf(c), seatOf(c)].filter(Boolean).join(' · '))}</span></p></article>`; };
      return sec('k4-cls', `<header class="k4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div>${more}</header><div class="k4-cds n${C.length}">${C.map(card).join('')}</div>`); },
    'k4-tt': (d, s) => { const C = pub().filter(c => daysOf(c).length || timeOf(c)).slice(0, 6); if (!C.length) return hint('k4-tt', '공개 강좌에 요일 · 시간을 넣으면 시간표가 자동으로 그려집니다.');
      const k = c => (daysOf(c)[0] == null ? 9 : (daysOf(c)[0] + 6) % 7) * 10000 + (+String(timeOf(c)).replace(':', '') || 0); C.sort((a, b) => k(a) - k(b));
      return sec('k4-tt', `<header class="k4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div><a class="k4-lk" ${aT(L.cls(s))}>전체 시간표${AR}</a></header><ul class="k4-tl2">${C.map(c => `<li><a ${aT(L.c(c))}><span class="k4-td">${E(dayTx(c) || '상담')}</span><span class="k4-tm">${E(timeOf(c) || '—')}</span><b>${E(c.name)}</b><span class="k4-tx">${E([priceOf(c), seatOf(c)].filter(Boolean).join(' · '))}</span>${AR}</a></li>`).join('')}</ul>`); },
    'k4-stm': (d, s) => { const N = pub().slice(0, 3).map(c => c.name); if (!N.length) return hint('k4-stm', '공개 강좌가 생기면 반 이름으로 큰 문장이 자동으로 만들어집니다.');
      const j = N.length === 1 ? `<b>${E(N[0])}</b>` : N.length === 2 ? `<b>${E(N[0])}</b>와 <b>${E(N[1])}</b>` : `<b>${E(N[0])}</b>부터 <b>${E(N[1])}</b>, <b>${E(N[2])}</b>까지`;
      const tl = E(String(d.body || '').replace(/\*([^*]+)\*/g, '\u0001$1\u0002')).replace(/\u0001/g, '<b>').replace(/\u0002/g, '</b>');
      return sec('k4-stm', `<p class="k4-sm">${j}.${tl ? ' ' + tl : ''}</p>`); },
    'k4-week': (d, s) => { const R = (d.cols || []).filter(r => r && r[1] && !isPh(r[1])).slice(0, 5); if (!R.length) return hint('k4-week', '한 주의 흐름(때 · 할 일 · 설명)을 입력하면 표시됩니다.');
      return sec('k4-week', `${fig(s, 'wk', 'k4-wp', 0)}<div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${val(d.body) ? `<p class="k4-lead">${br(d.body)}</p>` : ''}<ul class="k4-tl">${R.map(r => `<li><span>${E(r[0] || '')}</span><div><b>${E(r[1])}</b>${r[2] ? `<p>${E(r[2])}</p>` : ''}</div></li>`).join('')}</ul></div>`); },
    'k4-band': (d, s) => { fresh(); const C = pub().slice(0, 3); if (!C.length) return hint('k4-band', '공개 강좌가 생기면 반별 큰 사진 띠가 자동으로 채워집니다.');
      const band = (c, i) => { const p = clsPh(c, s, i); const desc = val(c.sub) || val(c.desc) || '';
        return `<article class="k4-bd${i % 2 ? ' rev' : ''}">${p ? img(p, 'k4-bp', 0) : ''}<div><p class="k4-bi"><span>${String(i + 1).padStart(2, '0')}</span>${E(c.cat || (c.hours ? `총 ${c.hours}시간` : '정규반'))}</p><h3>${E(c.name)}</h3>${desc ? `<p class="k4-bx">${E(desc)}</p>` : ''}
          <dl><dt>시간</dt><dd>${E(whenOf(c) || '상담으로 안내해요')}</dd><dt>수강료</dt><dd>${E(priceOf(c))}</dd>${seatOf(c) ? `<dt>정원</dt><dd>${E(seatOf(c))}${capOf(c) ? ` / ${capOf(c)}명` : ''}</dd>` : ''}</dl><a class="k4-lk" ${aT(L.c(c))}>반 자세히 보기${AR}</a></div></article>`; };
      return sec('k4-band', `${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${C.map(band).join('')}`); },
    'k4-gal': (d, s) => { fresh(); const C = pub().slice(0, 4); const P = C.map((c, i) => [c, clsPh(c, s, i + 7)]).filter(x => x[1]); if (P.length < 3) return hint('k4-gal', '공개 강좌가 3개 이상이면 반별 장면 갤러리가 표시됩니다.');
      return sec('k4-gal', `${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2><div class="k4-gl n${P.length}">${P.map(([c, p]) => `<a ${aT(L.c(c))}>${img(p, '', 0)}<em>${E(c.name)}</em></a>`).join('')}</div>`); },
    'k4-quote': (d, s) => { let R = []; try { R = HPT.reviews() || []; } catch (e) { } const r = R.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || String(b.b).length - String(a.b).length)[0];
      if (!r) return hint('k4-quote', '실제 수강후기가 등록되면 이곳에 크게 보여 드려요(없으면 게시된 사이트에서 숨겨집니다).');
      const t2 = String(r.b).replace(/\s+/g, ' ').trim(); const q = t2.length > 120 ? t2.slice(0, 118).replace(/\s\S*$/, '') + '…' : t2;
      return sec('k4-quote', `${fig(s, 'quote', 'k4-qp', 0)}<div class="k4-qt"><blockquote>${E(q)}</blockquote><p class="k4-cite">${E([r.w, r.c].filter(Boolean).join(' · '))}</p></div>`); },
    'k4-notice': (d, s) => { const N = (S.notices || []).filter(n => n && n.title && !n.hidden).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 4);
      if (!N.length) return hint('k4-notice', '공지사항을 올리면 학원 소식이 이곳에 표시됩니다.');
      const dt = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}. ${+m[2]}. ${+m[3]}.` : ''; };
      return sec('k4-notice', `<header class="k4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div><a class="k4-lk" ${aT(L.notice(s))}>소식 전체 보기${AR}</a></header><ul class="k4-nl">${N.map(n => `<li><a ${aT(L.notice(s))}><time>${E(dt(n.at))}</time><b>${E(n.title)}</b>${AR}</a></li>`).join('')}</ul>`); },
    'k4-fin': (d, s) => { const f = ft(); const I = [['찾아오시는 길', val(f.addr)], ['전화', val(f.tel)], ['상담 시간', val(f.hours)], ['메일', val(f.email || f.mail)]].filter(x => x[1]).slice(0, 3); const tel = val(f.tel);
      return sec('k4-fin', `<div class="k4-fg"><h2>${emph(d.title || '')}</h2><div>${val(d.body) ? `<p class="k4-lead">${br(d.body)}</p>` : ''}<div class="k4-cta">${btn(GEN.test(d.cta || '') ? '체험 수업 신청' : d.cta, L.trial(s), 'p')}${tel ? btn(`${tel} 전화 상담`, telH(tel), 'o') : btn('상담 예약', L.ask(s), 'o')}</div></div></div>
        ${I.length ? `<dl class="k4-info n${I.length}">${I.map(([a, b]) => `<div><dt>${E(a)}</dt><dd>${br(b)}</dd></div>`).join('')}</dl>` : ''}`); }
  };

  /* ══ 테마 10종 ══ */
  const F = { sans: "'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", serif: "'Noto Serif KR','Noto Serif CJK KR','AppleMyungjo','Batang',serif", hahm: "'Hahmlet','Noto Serif KR','Noto Serif CJK KR',serif", seed: "'LINE Seed Sans KR','Pretendard Variable',Pretendard,sans-serif", round: "'Gowun Dodum','Pretendard Variable',Pretendard,sans-serif", dohy: "'Do Hyeon','Pretendard Variable',Pretendard,sans-serif", mono: "ui-monospace,'SF Mono',Menlo,Consolas,monospace" };
  /* id: [이름, 세부 유형, 설명, 기관 색, 바탕, 대체 바탕, 글자, 보조 글자, 포인트, 제목 글꼴, 제목 굵기, 어둡게, 모서리] */
  const T10 = {
    kfmath: ['수학 · 분할', '수학', '왼쪽 큰 제목 · 오른쪽 세로 사진 — 개념부터 차근차근 가는 수학 학원', '#2647D9', '#FFFFFF', '#F2F4FA', '#0F1530', '#4B5270', '#FFB020', 'sans', 800, 0, 28],
    kfeng: ['영어 · 사진 액자', '영어', '큰 사진 액자 안에 흰 제목 — 말하고 읽는 영어 학원', '#0E5A6B', '#F7F4EE', '#EDE8DE', '#10222A', '#4D5A5E', '#FF7A59', 'seed', 700, 0, 32],
    kfessay: ['국어 · 논술 · 에디토리얼', '국어 · 논술', '종이색 바탕 · 세리프 큰 제목 · 사진 한 장 — 읽고 쓰는 국어 · 논술 학원', '#1E4A3A', '#F5F1E8', '#ECE6D9', '#1A1916', '#56524A', '#B8741E', 'serif', 700, 0, 6],
    kfprep: ['종합 입시 · 전통 격식', '종합 입시', '문장(紋章) · 세리프 · 대칭 · 아치 액자 — 전통 있는 종합 입시 학원', '#14264A', '#FBF9F4', '#F1ECE1', '#121A2C', '#4C5366', '#A9844E', 'hahm', 700, 0, 2],
    kfsci: ['과학 · 탐구 · 다크', '과학 · 탐구', '전체 화면 실험 사진 · 어두운 바탕 · 큰 흰 제목 — 실험하는 과학 학원', '#2BD9A0', '#0B0E0F', '#141819', '#F1F4F2', '#A2ABA7', '#2BD9A0', 'sans', 800, 1, 20],
    kfkids: ['유아 · 초등 · 둥근 방울', '유아 · 초등 저학년', '둥근 사진 방울과 색 점 · 부드러운 둥근 글꼴 — 유아 · 초등 저학년', '#2F6FDB', '#FFF8EC', '#FFEFD6', '#1E2340', '#535772', '#FFC531', 'round', 400, 0, 999],
    kfcode: ['코딩 · STEAM · 모눈', '코딩 · STEAM', '모눈종이 바탕 · 굵은 테두리 카드 · 대괄호 라벨 — 만들고 실험하는 코딩 · STEAM', '#5B3DF5', '#FAFAF7', '#F0EFEA', '#111111', '#4A4A4A', '#C6F432', 'sans', 800, 0, 14],
    kfart: ['미술 · 포스터 콜라주', '미술', '아주 큰 세 줄 제목 · 아치 · 원 사진 콜라주 · 색 띠 — 어린이 미술', '#FF4F2B', '#FBF7F0', '#F3ECE0', '#141414', '#55524C', '#FFC531', 'sans', 800, 0, 24],
    kfmusic: ['음악 · 반반 분할', '음악', '왼쪽 절반 전체 높이 사진 · 오른쪽 세리프 제목 — 피아노 · 현악 음악 학원', '#6B1F3A', '#FBF6F1', '#F2E9E0', '#1D1418', '#5C4C52', '#C79A5B', 'serif', 700, 0, 4],
    kfsport: ['체육 · 태권도 · 색면 띠', '체육 · 태권도', '전체 폭 사진 위 노란 색면 띠에 아주 큰 제목 — 체육 · 태권도 · 줄넘기', '#141414', '#FFFFFF', '#F4F4F2', '#111111', '#4A4A4A', '#FFD400', 'dohy', 400, 0, 0]
  };
  const IDS = Object.keys(T10);
  const DEF = {}; const HD = {};
  IDS.forEach(id => { const [name, sub, desc, acc, bg, alt, ink, mu, pt, hf, hw, dark, r] = T10[id];
    DEF[id] = { name, sub, desc, tags: ['k12'], tone: dark ? 'dark' : 'light', dens: '여유', acc, bg, alt, ink, mu, r: Math.min(r, 32), br: 999, hero: dark ? 'dark' : 'split', hb: dark ? '#08090A' : undefined, vis: 'mock', illu: 'kids', card: 'line', look: 'brandBold', sw2: alt, base: dark ? 'premium' : 'warm', ck: 'photo', hk: 'k44', hp: 'k44', sh: 'none' };
    HD[id] = { hf: hf === 'serif' || hf === 'hahm' ? 'serif' : hf === 'round' ? 'round' : 'sans', hw, hls: -0.04, h1: 88, h1m: 42, lh1: 1.1, h2: 52, h2m: 32, h3: 28, body: 17, blh: 1.75, lead: 19, ey: { fs: 15, ls: 0, fw: 600, tt: 'none' }, sec: 140, secm: 84, w: 1200, gut: 40,
      r: Math.min(r, 32), rs: 8, br: 999, bh: 56, bpx: 28, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' }; });

  /* ── CSS ── */
  function vars(s, th, T) { const id = s.theme; const t = T10[id]; const dark = !!t[11];
    const raw = /^#[0-9a-f]{6}$/i.test(String(s.color || '')) ? s.color : t[3];
    const bg = t[4], alt = t[5], ink = t[6]; const a = raw; const on = onC(a);
    const mu = fit(t[7], alt, 4.6, dark ? '#ffffff' : '#000000'); const lab2 = fit(dark ? a : mix(a, '#000000', .05), bg, 4.6, dark ? '#ffffff' : '#000000');
    return { id, dark, a, on, bg, alt, ink, mu, pt: t[8], lab: lab2, ln: dark ? 'rgba(255,255,255,.12)' : mix(ink, bg, .84), hf: F[t[9]], hw: t[10], r: t[12] };
  }
  const cssBase = v => `
.k4-s,.k4-h{--a:${v.a};--on:${v.on};--bg:${v.bg};--alt:${v.alt};--ink:${v.ink};--mu:${v.mu};--pt:${v.pt};--lab:${v.lab};--ln:${v.ln};--hf:${v.hf};--r:${Math.min(v.r, 32)}px;font-family:${F.sans};word-break:keep-all;-webkit-font-smoothing:antialiased}
.k4-w{max-width:1200px;margin:0 auto;padding:0 40px;box-sizing:border-box}
.hpt.hp-s.k4-s{padding:140px 0;background:var(--bg);color:var(--ink);margin:0;border:0}
.k4-s *,.k4-h *{box-sizing:border-box}
.k4-s h2,.k4-s h3,.k4-h h1{margin:0;font-family:var(--hf);font-weight:${v.hw};color:inherit;overflow-wrap:anywhere}
.k4-s p,.k4-h p{margin:0}.k4-s ol,.k4-s ul,.k4-s dl,.k4-s dd,.k4-h ul{margin:0;padding:0;list-style:none}
.k4-ph{margin:0;overflow:hidden;position:relative;background:var(--alt)}.k4-ph img{display:block;width:100%;height:100%;object-fit:cover}
.k4-h h1 em,.k4-fin h2 em{font-style:normal;color:var(--lab)}
.k4-kick{font-size:15px;font-weight:600;color:var(--lab)}
.k4-lab{font-size:15px;font-weight:600;color:var(--lab);margin:0 0 18px!important}
.k4-lead{font-size:19px;line-height:1.78;color:var(--mu)}
.k4-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 28px;border-radius:${v.r === 0 ? 0 : 999}px;font-size:16px;font-weight:700;text-decoration:none;white-space:nowrap;font-family:${F.sans};transition:transform .15s}
.k4-b.p{background:var(--a);color:var(--on)}.k4-b.p:hover{transform:translateY(-1px)}
.k4-b.o{box-shadow:inset 0 0 0 1.5px currentColor;color:var(--ink)}
.k4-cta{display:flex;flex-wrap:wrap;gap:12px}.k4-ar{flex:none}
.k4-lk{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:16px;font-weight:600;color:var(--ink);text-decoration:none;border-bottom:1.5px solid currentColor;white-space:nowrap}
.k4-q{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}
.k4-q a{display:flex;align-items:center;gap:10px;min-height:84px;padding:0 28px;color:var(--ink);text-decoration:none;font-size:17px}
.k4-q a:first-child{padding-left:0}.k4-q a+a{border-left:1px solid var(--ln)}
.k4-q b{font-weight:700;white-space:nowrap}.k4-q span{flex:1;min-width:0;font-size:14px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.k4-hint{padding:28px;border:1.5px dashed var(--ln);border-radius:12px;font-size:15px;color:var(--mu);text-align:center}
.k4-hd{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:60px}.k4-hd h2,.k4-band>.k4-w>h2,.k4-gal>.k4-w>h2{font-size:52px;line-height:1.18;letter-spacing:-.04em}
/* 2열 이야기 */
.k4-story .k4-w{display:grid;grid-template-columns:5fr 6fr;gap:96px;align-items:center}
.k4-sp{height:680px;border-radius:var(--r)}
.k4-story h2{font-size:52px;line-height:1.22;letter-spacing:-.04em;margin-bottom:26px}
.k4-pr{margin-top:48px!important}.k4-pr li{display:grid;grid-template-columns:72px minmax(0,1fr);padding:24px 0;border-top:1px solid var(--ln)}.k4-pr li:last-child{border-bottom:1px solid var(--ln)}
.k4-pr span{font-family:var(--hf);font-size:28px;font-weight:700;color:var(--pt)}.k4-pr b{display:block;font-size:20px;font-weight:700;margin-bottom:6px}.k4-pr p{font-size:16px;line-height:1.7;color:var(--mu)}
/* 단계 */
.k4-sp4{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid var(--ln)}.k4-sp4.n4{grid-template-columns:repeat(4,minmax(0,1fr))}.k4-sp4.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.k4-sp4 li{padding:36px 32px 8px 0}.k4-sp4 li+li{padding-left:32px;border-left:1px solid var(--ln)}
.k4-sn{display:block;font-family:var(--hf);font-size:44px;font-weight:700;color:var(--pt);line-height:1;margin-bottom:28px}.k4-sp4 b{display:block;font-size:21px;font-weight:700;margin-bottom:10px}.k4-sp4 p{font-size:16px;line-height:1.7;color:var(--mu)}
/* 큰 숫자 */
.k4-num{background:var(--a)!important;color:var(--on)!important}.k4-num .k4-w{display:grid;grid-template-columns:auto minmax(0,1fr);gap:88px;align-items:end}
.k4-big{font-family:var(--hf);font-weight:800;font-size:240px;line-height:.82;letter-spacing:-.06em;white-space:nowrap}.k4-big small{font-size:.36em;letter-spacing:-.02em;margin-left:.06em}
.k4-nt h2{font-size:36px;line-height:1.38;letter-spacing:-.035em}.k4-nt p{font-size:17px;line-height:1.75;margin-top:18px!important;opacity:.85}.k4-fine{font-size:13px!important;opacity:.75}
/* 반 카드 */
.k4-cds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}
.k4-cd>a{display:block;position:relative;color:inherit;text-decoration:none;border-radius:var(--r);overflow:hidden}
.k4-cp{display:block;height:400px;border-radius:var(--r)}.k4-c0{background:var(--alt)}
.k4-cg{display:block;font-size:13px;font-weight:600;color:var(--lab);margin-top:24px}.k4-cn{display:block;font-family:var(--hf);font-size:28px;font-weight:${v.hw};letter-spacing:-.04em;line-height:1.3;margin-top:8px}
.k4-cm{display:flex;justify-content:space-between;gap:12px;font-size:15px;padding-top:18px!important;margin-top:18px!important;border-top:1px solid var(--ln)}.k4-cm b{font-weight:700}.k4-cm span{color:var(--mu);text-align:right}
.k4-cdx{font-size:16px;line-height:1.7;color:var(--mu);margin-top:12px!important}
/* 격식 목록형 반 */
.k4-rl{border-top:2px solid var(--ink)}.k4-rl li{border-bottom:1px solid var(--ln)}
.k4-rl a{display:grid;grid-template-columns:72px minmax(0,1fr) auto 20px;gap:24px;align-items:center;min-height:104px;color:var(--ink);text-decoration:none}
.k4-ri{font-family:var(--hf);font-size:28px;color:var(--pt)}.k4-rn b{display:block;font-family:var(--hf);font-size:26px;font-weight:700;letter-spacing:-.03em}.k4-rn small,.k4-rp small{display:block;font-size:14px;color:var(--mu);margin-top:4px}.k4-rp{text-align:right;font-weight:700;font-size:17px}
/* 시간표 목록 */
.k4-tl2{border-top:2px solid var(--ink)}.k4-tl2 li{border-bottom:1px solid var(--ln)}
.k4-tl2 a{display:grid;grid-template-columns:150px 90px minmax(0,1fr) auto 20px;gap:24px;align-items:center;min-height:88px;color:var(--ink);text-decoration:none;font-size:17px}
.k4-td{font-weight:700;color:var(--lab)}.k4-tm{font-variant-numeric:tabular-nums;font-weight:600}.k4-tl2 b{font-size:20px;font-weight:700;letter-spacing:-.02em}.k4-tx{font-size:15px;color:var(--mu);text-align:right}
/* 큰 문장 */
.k4-stm .k4-sm{font-family:var(--hf);font-size:58px;line-height:1.3;font-weight:800;letter-spacing:-.05em;color:${mix(v.ink, v.bg, .62)}}.k4-stm .k4-sm b{color:var(--ink);font-weight:800}
/* 한 주 */
.k4-week .k4-w{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.k4-week h2{font-size:52px;line-height:1.18;letter-spacing:-.04em}.k4-week .k4-lead{margin-top:20px!important}
.k4-wp{height:640px;border-radius:var(--r)}
.k4-tl{margin-top:40px!important}.k4-tl li{display:grid;grid-template-columns:110px minmax(0,1fr);padding:22px 0;border-top:1px solid var(--ln)}.k4-tl li:last-child{border-bottom:1px solid var(--ln)}
.k4-tl span{font-size:15px;font-weight:700;color:var(--lab)}.k4-tl b{display:block;font-size:19px;font-weight:700}.k4-tl p{font-size:15px;line-height:1.6;color:var(--mu);margin-top:6px!important}
/* 사진 띠 */
.k4-bd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:72px;align-items:center;margin-top:100px}
.k4-bd.rev{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}.k4-bd.rev .k4-bp{order:2}
.k4-bp{height:540px;border-radius:var(--r)}
.k4-bi{display:flex;align-items:baseline;gap:14px;font-size:16px;font-weight:700;color:var(--mu)}.k4-bi span{color:var(--lab)}
.k4-bd h3{margin:14px 0 0;font-size:52px;line-height:1.08;letter-spacing:-.05em}
.k4-bx{font-size:18px;line-height:1.75;color:var(--mu);margin-top:22px!important}
.k4-bd dl{margin-top:30px!important;display:grid;grid-template-columns:auto minmax(0,1fr);border-top:2px solid var(--ink)}
.k4-bd dt,.k4-bd dd{padding:16px 0;border-bottom:1px solid var(--ln);font-size:16px}.k4-bd dt{font-weight:700;padding-right:36px}.k4-bd dd{color:var(--mu)}.k4-bd .k4-lk{margin-top:22px}
/* 갤러리 */
.k4-gl{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:300px 300px;gap:20px;margin-top:60px}
.k4-gl a{position:relative;display:block;border-radius:var(--r);overflow:hidden;color:var(--ink);text-decoration:none}.k4-gl .k4-ph{height:100%}
.k4-gl a:first-child{grid-row:span 2}.k4-gl.n4 a:last-child{grid-column:span 2}.k4-gl.n3{grid-template-columns:1.3fr 1fr}
.k4-gl em{position:absolute;left:18px;bottom:18px;font-style:normal;font-size:14px;font-weight:700;background:var(--bg);color:var(--ink);padding:9px 15px;border-radius:999px;max-width:calc(100% - 36px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 인용 */
.k4-quote{background:var(--alt)!important}.k4-quote .k4-w{display:grid;grid-template-columns:7fr 5fr;gap:96px;align-items:center}.k4-quote .k4-qp{order:2;height:540px;border-radius:var(--r)}
.k4-quote blockquote{margin:0;font-family:var(--hf);font-weight:700;font-size:42px;line-height:1.48;letter-spacing:-.04em}
.k4-quote blockquote::before{content:"\\201C";display:block;font-size:110px;line-height:.6;color:var(--pt);margin-bottom:22px}
.k4-cite{font-size:16px;color:var(--mu);margin-top:34px!important}
/* 소식 */
.k4-nl{border-top:2px solid var(--ink)}.k4-nl li{border-bottom:1px solid var(--ln)}
.k4-nl a{display:grid;grid-template-columns:160px minmax(0,1fr) 20px;gap:24px;align-items:center;min-height:80px;color:var(--ink);text-decoration:none}.k4-nl time{font-size:15px;color:var(--mu);font-variant-numeric:tabular-nums}.k4-nl b{font-size:19px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 마지막 */
.k4-fg{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:64px;align-items:end}
.k4-fin h2{font-size:80px;line-height:1.1;letter-spacing:-.05em}.k4-fin .k4-cta{margin-top:30px}
.k4-info{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:100px!important;border-top:1px solid var(--ln)}
.k4-info div{padding:30px 32px 0 0}.k4-info div+div{padding-left:32px;border-left:1px solid var(--ln)}
.k4-info dt{font-size:13px;color:var(--mu);margin-bottom:10px}.k4-info dd{font-size:17px;font-weight:600;line-height:1.65}
@media(max-width:1000px){.k4-story .k4-w,.k4-week .k4-w,.k4-fg,.k4-quote .k4-w{grid-template-columns:minmax(0,1fr);gap:44px}.k4-sp,.k4-wp{height:460px}.k4-quote .k4-qp{order:-1;height:400px}.k4-cds{grid-template-columns:minmax(0,1fr)}.k4-num .k4-w{grid-template-columns:minmax(0,1fr);gap:36px}
.k4-bd,.k4-bd.rev{grid-template-columns:minmax(0,1fr);gap:28px;margin-top:64px}.k4-bd.rev .k4-bp{order:0}.k4-sp4,.k4-sp4.n4{grid-template-columns:repeat(2,minmax(0,1fr))}.k4-sp4 li:nth-child(3){padding-left:0;border-left:0}}
@media(max-width:760px){.k4-w{padding:0 20px}.hpt.hp-s.k4-s{padding:84px 0}
.k4-lead{font-size:17px}.k4-b{width:100%}.k4-cta{flex-direction:column}
.k4-q{grid-template-columns:minmax(0,1fr)}.k4-q a,.k4-q a:first-child{padding:0;min-height:62px}.k4-q a+a{border-left:0;border-top:1px solid var(--ln)}.k4-q span{display:none}.k4-q b{flex:1}
.k4-hd{display:block;margin-bottom:34px}.k4-hd .k4-lk{margin-top:12px}.k4-hd h2,.k4-band>.k4-w>h2,.k4-gal>.k4-w>h2,.k4-story h2,.k4-week h2{font-size:32px;margin-bottom:16px}
.k4-sp,.k4-wp{height:340px}.k4-pr{margin-top:30px!important}.k4-pr li{grid-template-columns:48px minmax(0,1fr);padding:20px 0}.k4-pr span{font-size:22px}.k4-pr b{font-size:18px}
.k4-sp4,.k4-sp4.n4,.k4-sp4.n2{grid-template-columns:minmax(0,1fr)}.k4-sp4 li,.k4-sp4 li+li{padding:26px 0;border-left:0}.k4-sp4 li+li{border-top:1px solid var(--ln)}.k4-sn{font-size:34px;margin-bottom:16px}
.k4-big{font-size:132px}.k4-nt h2{font-size:26px}.k4-cp{height:280px}.k4-cn{font-size:24px}
.k4-rl a{grid-template-columns:40px minmax(0,1fr) 18px;gap:14px;padding:18px 0}.k4-rp{grid-column:2;text-align:left;font-size:15px}.k4-rl .k4-ar{grid-row:1;grid-column:3}.k4-ri{font-size:22px}.k4-rn b{font-size:21px}
.k4-tl2 a{grid-template-columns:minmax(0,1fr) 18px;gap:4px 12px;padding:18px 0;min-height:0}.k4-tl2 a>*{grid-column:1}.k4-tl2 .k4-ar{grid-column:2;grid-row:1/span 4}.k4-tx{text-align:left}.k4-td,.k4-tm{display:inline}
.k4-stm .k4-sm{font-size:31px;line-height:1.4}.k4-tl li{grid-template-columns:80px minmax(0,1fr)}
.k4-bp{height:300px}.k4-bd h3{font-size:36px}.k4-bx{font-size:16px}
.k4-gl{grid-template-columns:1fr 1fr!important;grid-template-rows:240px 170px 170px;gap:12px;margin-top:34px}.k4-gl a:first-child{grid-row:auto;grid-column:span 2}.k4-gl.n3{grid-template-rows:240px 180px}
.k4-quote .k4-qp{height:300px}.k4-quote blockquote{font-size:27px}.k4-quote blockquote::before{font-size:76px;margin-bottom:10px}
.k4-nl a{grid-template-columns:minmax(0,1fr) 18px;gap:4px 12px;padding:16px 0}.k4-nl time{grid-column:1}.k4-nl b{grid-column:1;white-space:normal}.k4-nl .k4-ar{grid-column:2;grid-row:1/span 2}
.k4-fin h2{font-size:40px}.k4-info{grid-template-columns:minmax(0,1fr);margin-top:52px!important}.k4-info div,.k4-info div+div{padding:20px 0;border-left:0}.k4-info div+div{border-top:1px solid var(--ln)}}
@media(prefers-reduced-motion:reduce){.k4-b{transition:none}}`;

  const H1 = (cls, pc, m, lh, extra) => `.hpt.hp-hero.k4-h.${cls} h1{font-size:${pc}px!important;line-height:${lh}!important;letter-spacing:-.045em!important;${extra || ''}}@media(max-width:760px){.hpt.hp-hero.k4-h.${cls} h1{font-size:${m}px!important}}`;
  const HB = (cls, pad, padm) => `.hpt.hp-hero.k4-h.${cls}{padding:${pad};background:var(--bg);color:var(--ink);margin:0}@media(max-width:760px){.hpt.hp-hero.k4-h.${cls}{padding:${padm}}}`;
  const XCSS = {
    kfmath: v => `${HB('k4-split', '64px 0 0', '28px 0 0')}${H1('k4-split', 84, 42, 1.12)}
.k4-sg{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:72px;align-items:center;padding-bottom:80px}
.k4-split .k4-sub{font-size:20px;line-height:1.7;color:var(--mu);margin:28px 0 40px!important;max-width:520px}.k4-split .k4-kick{margin-bottom:22px!important}
.k4-split .k4-hi{height:680px;border-radius:28px}
.k4-split .k4-kick::before{content:"";display:inline-block;width:28px;height:3px;background:var(--pt);vertical-align:middle;margin-right:12px}
.k4-tt{background:var(--alt)!important}
@media(max-width:1000px){.k4-sg{grid-template-columns:minmax(0,1fr);gap:36px;padding-bottom:40px}.k4-split .k4-hi{height:420px}}
@media(max-width:760px){.k4-split .k4-hi{height:300px;border-radius:20px}.k4-split .k4-sub{font-size:17px;margin:18px 0 26px!important}}`,
    kfeng: v => `${HB('k4-frame', '24px 0 0', '12px 0 0')}${H1('k4-frame', 92, 40, 1.08, 'color:#fff!important;')}
.k4-fr{position:relative;height:760px;border-radius:32px;overflow:hidden}.k4-fr .k4-hi{position:absolute;inset:0;height:100%}
.k4-fr::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,20,26,.86) 0%,rgba(6,20,26,.35) 48%,rgba(6,20,26,0) 72%);pointer-events:none}
.k4-fc{position:absolute;z-index:2;left:64px;right:64px;bottom:60px;color:#fff}.k4-frame .k4-kick{color:#fff;opacity:.9;margin-bottom:18px!important}.k4-frame h1 em{color:var(--pt)!important}
.k4-frame .k4-sub{font-size:20px;line-height:1.65;color:rgba(255,255,255,.86);margin:22px 0 34px!important;max-width:600px}
.k4-frame .k4-b.p{background:var(--pt);color:${onC(v.pt)}}.k4-frame .k4-b.o{color:#fff}
.k4-frame .k4-q{margin-top:28px;border-top:0}
.k4-stm .k4-sm b{color:var(--a)}
@media(max-width:760px){.k4-fr{height:auto;border-radius:22px;padding-top:300px}.k4-fr::after{background:linear-gradient(0deg,rgba(6,20,26,.94) 30%,rgba(6,20,26,.2) 75%)}.k4-fc{position:relative;left:auto;right:auto;bottom:auto;padding:0 22px 26px}.k4-frame .k4-sub{font-size:16px;margin:14px 0 22px!important}}`,
    kfessay: v => `${HB('k4-center', '56px 0 0', '36px 0 0')}${H1('k4-center', 88, 40, 1.15)}
.k4-center{text-align:center}.k4-center .k4-sub{font-size:20px;line-height:1.7;color:var(--mu);max-width:740px;margin:26px auto 0!important}.k4-center h1{margin-top:20px!important}
.k4-center .k4-cta{justify-content:center;margin-top:36px}.k4-center .k4-hi{height:660px;margin:64px -80px 0;border-radius:6px}.k4-center .k4-q{margin-top:52px;text-align:left}
.k4-cls .k4-cn{font-size:30px}.k4-fin .k4-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.k4-fin .k4-cta{justify-content:center}.k4-fin .k4-lead{max-width:640px;margin:0 auto}.k4-info{text-align:left}
@media(max-width:1000px){.k4-center .k4-hi{margin:52px 0 0}}
@media(max-width:760px){.k4-center{text-align:left}.k4-center .k4-sub{font-size:17px;margin-top:16px!important}.k4-center .k4-cta{margin-top:26px}.k4-center .k4-hi{height:400px;margin:36px -20px 0;border-radius:0}.k4-center .k4-q{margin-top:26px}.k4-fin .k4-fg{text-align:left;justify-items:stretch}}`,
    kfprep: v => `${HB('k4-formal', '36px 0 0', '28px 0 0')}${H1('k4-formal', 76, 38, 1.2, 'letter-spacing:-.02em!important;')}
.k4-formal{text-align:center;border-top:6px solid var(--a)}.k4-cr{color:var(--a);margin-bottom:14px}.k4-cr svg{width:52px;height:62px}.k4-formal .k4-kick{letter-spacing:.24em;font-size:14px;color:var(--pt);margin-bottom:22px!important}
.k4-rule{display:flex;align-items:center;justify-content:center;gap:16px;margin:22px auto!important;max-width:360px;color:var(--pt)}.k4-rule i{flex:1;height:1px;background:var(--pt)}.k4-rule b{font-size:14px}
.k4-formal .k4-sub{font-size:19px;line-height:1.8;color:var(--mu);max-width:640px;margin:0 auto!important}.k4-formal .k4-cta{justify-content:center;margin-top:30px}
.k4-formal .k4-b{border-radius:2px}.k4-s .k4-b{border-radius:2px}
.k4-formal .k4-hi{height:560px;max-width:980px;margin:48px auto 0;border-radius:490px 490px 0 0;outline:1px solid var(--pt);outline-offset:10px}
.k4-formal .k4-q{margin-top:72px;text-align:left;border-top:2px solid var(--a)}
.k4-steps .k4-hd,.k4-notice .k4-hd{border-bottom:0}.k4-steps{text-align:left}.k4-sn{font-size:52px}
.k4-num{background:var(--a)!important}.k4-num .k4-big{color:var(--pt)}
.k4-notice{background:var(--alt)!important}
.k4-fin{border-top:1px solid var(--ln)}.k4-fin .k4-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.k4-fin .k4-cta{justify-content:center}.k4-fin .k4-lead{max-width:640px;margin:0 auto}.k4-info{text-align:left}
@media(max-width:760px){.k4-cr svg{width:48px;height:58px}.k4-formal .k4-sub{font-size:16px}.k4-formal .k4-hi{height:320px;border-radius:200px 200px 0 0;outline-offset:6px;margin-top:40px}.k4-formal .k4-q{margin-top:40px}.k4-rule{margin:20px auto!important}}`,
    kfsci: v => `.hpt.hp-hero.k4-h.k4-cine{position:relative;height:880px;padding:0;overflow:hidden;background:var(--bg);color:#fff;margin:0}${H1('k4-cine', 104, 42, 1.06, 'color:#fff!important;letter-spacing:-.055em!important;max-width:1060px;')}
.k4-cine>.k4-hi{position:absolute;inset:0;height:100%;background:#000}
.k4-cine::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,9,10,.9) 0%,rgba(6,9,10,.55) 46%,rgba(6,9,10,.12) 80%),linear-gradient(0deg,rgba(6,9,10,.92) 0%,rgba(6,9,10,0) 36%),linear-gradient(180deg,rgba(6,9,10,.55) 0%,rgba(6,9,10,0) 22%);pointer-events:none}
.k4-hc{position:absolute;z-index:2;left:0;right:0;bottom:150px}.k4-cine .k4-kick{margin-bottom:24px!important}
.k4-cine .k4-sub{font-size:21px;line-height:1.65;color:rgba(255,255,255,.8);margin:28px 0 40px!important;max-width:580px}.k4-cine .k4-b.o{color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}
.k4-qb{position:absolute;z-index:2;left:0;right:0;bottom:0;border-top:1px solid rgba(255,255,255,.16)}.k4-cine .k4-q{border:0}.k4-cine .k4-q a{color:#fff;min-height:88px}.k4-cine .k4-q span{color:rgba(255,255,255,.62)}
.k4-stm{padding-bottom:0!important}
.k4-cls .k4-cd>a::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.82) 0%,rgba(0,0,0,0) 58%);pointer-events:none}
.k4-cls .k4-cp{height:520px}.k4-cls .k4-co{position:absolute;z-index:2;left:28px;right:28px;bottom:28px;color:#fff}.k4-cls .k4-cg{margin:0;color:rgba(255,255,255,.8)}.k4-cls .k4-cn{color:#fff;font-size:30px}.k4-cls .k4-cm{border-top:0;margin-top:0!important;padding:18px 4px 0!important}
.k4-week{background:#EEF2EF!important;color:#121615!important;--ink:#121615;--mu:#525B57;--ln:#D3DAD6;--lab:${fit(mix(v.a, '#000000', .45), '#EEF2EF', 4.6)}}
.k4-num{background:var(--bg)!important;color:var(--ink)!important}.k4-num .k4-big{font-family:${F.sans}}.k4-num .k4-big small{color:var(--a)}
.k4-quote{position:relative;padding:0!important;min-height:720px;overflow:hidden;display:flex;align-items:center;background:var(--bg)!important}.k4-quote .k4-qp{position:absolute;inset:0;height:100%;order:0}
.k4-quote::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,9,10,.05) 10%,rgba(6,9,10,.9) 62%);pointer-events:none}
.k4-quote .k4-w{position:static;width:100%;display:flex;justify-content:flex-end;padding-top:120px;padding-bottom:120px}.k4-qt{position:relative;z-index:2;max-width:620px}.k4-quote blockquote{font-family:${F.sans};font-size:44px;color:#fff}.k4-quote blockquote::before{display:none}.k4-quote .k4-cite{color:rgba(255,255,255,.7)}
.k4-fin .k4-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.k4-fin .k4-cta{justify-content:center}.k4-fin .k4-lead{max-width:640px;margin:20px auto 0}.k4-fin .k4-b.o{color:#fff}.k4-info{text-align:left}
@media(max-width:760px){.hpt.hp-hero.k4-h.k4-cine{height:auto}.k4-cine::after{background:linear-gradient(0deg,rgba(6,9,10,.97) 0%,rgba(6,9,10,.7) 48%,rgba(6,9,10,.2) 100%)}
.k4-hc{position:relative;bottom:auto;padding:300px 0 34px}.k4-cine .k4-sub{font-size:17px;margin:18px 0 26px!important}.k4-qb{position:relative}.k4-cine .k4-q a{min-height:62px}.k4-cls .k4-cp{height:420px}
.k4-quote{min-height:0;display:block}.k4-quote::after{background:linear-gradient(0deg,rgba(6,9,10,.94) 35%,rgba(6,9,10,.3))}.k4-quote .k4-w{padding-top:250px;padding-bottom:60px}.k4-quote blockquote{font-size:27px}.k4-fin .k4-fg{text-align:left;justify-items:stretch}}`,
    kfkids: v => `${HB('k4-bubble', '40px 0 0', '16px 0 0')}${H1('k4-bubble', 68, 40, 1.22, 'letter-spacing:-.02em!important;')}
.k4-bg2{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:40px;align-items:center;padding-bottom:84px}
.k4-bubble .k4-kick{display:inline-block;background:var(--pt);color:#1E2340;padding:8px 16px;border-radius:999px;margin-bottom:24px!important}
.k4-bubble .k4-sub{font-size:20px;line-height:1.7;color:var(--mu);margin:26px 0 38px!important;max-width:520px}.k4-bubble h1 em{color:var(--a)!important}
.k4-bub{position:relative;height:640px}.k4-bub .k4-ph{position:absolute;border-radius:50%;box-shadow:0 0 0 10px var(--bg)}
.k4-b1{left:0;top:70px;width:400px;height:400px}.k4-b2{right:0;top:0;width:250px;height:250px}.k4-b3{right:30px;bottom:10px;width:290px;height:290px}
.k4-bub i{position:absolute;border-radius:50%}.k4-d1{left:330px;top:20px;width:70px;height:70px;background:var(--pt)}.k4-d2{left:40px;bottom:60px;width:44px;height:44px;background:#FF8FA3}.k4-d3{right:280px;bottom:120px;width:30px;height:30px;background:var(--a)}
.k4-steps{background:var(--alt)!important}.k4-sp4 li{background:var(--bg);border-radius:28px;padding:34px!important;border:0!important}.k4-sp4{gap:20px;border:0}.k4-sn{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--pt);color:#1E2340;font-size:26px}
.k4-cp,.k4-gl a,.k4-sp,.k4-qp{border-radius:28px!important}.k4-quote{background:var(--bg)!important}.k4-quote .k4-qp{border-radius:50%!important;height:440px;width:440px;justify-self:end}
@media(max-width:1000px){.k4-bg2{grid-template-columns:minmax(0,1fr)}.k4-bub{order:-1;max-width:640px}}
@media(max-width:760px){.k4-bg2{gap:20px;padding-bottom:40px}.k4-bub{height:380px}.k4-b1{width:230px;height:230px;top:50px}.k4-b2{width:150px;height:150px}.k4-b3{width:170px;height:170px;right:10px}.k4-d1{left:190px;width:44px;height:44px}.k4-d3{right:170px;bottom:70px}
.k4-bubble .k4-sub{font-size:17px;margin:18px 0 26px!important}.k4-quote .k4-qp{width:260px;height:260px;justify-self:start}}`,
    kfcode: v => `${HB('k4-grid', '56px 0 0', '24px 0 0')}${H1('k4-grid', 90, 42, 1.08, 'letter-spacing:-.05em!important;')}
.hpt.hp-hero.k4-h.k4-grid{background-color:var(--bg);background-image:linear-gradient(${mix(v.ink, v.bg, .9)} 1px,transparent 1px),linear-gradient(90deg,${mix(v.ink, v.bg, .9)} 1px,transparent 1px);background-size:32px 32px}
.k4-gg{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:64px;align-items:center;padding-bottom:84px}
.k4-grid .k4-kick{font-family:${F.mono};font-size:15px;color:var(--ink);margin-bottom:24px!important}.k4-grid .k4-kick span{color:var(--a);font-weight:700}
.k4-grid h1 em{color:var(--ink)!important;background:var(--pt);padding:0 .12em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.k4-grid .k4-sub{font-size:20px;line-height:1.7;color:var(--mu);margin:28px 0 38px!important;max-width:520px}
.k4-b{border-radius:12px!important}.k4-b.p,.k4-b.o{box-shadow:4px 4px 0 var(--ink),inset 0 0 0 2px var(--ink)!important}.k4-b.p{background:var(--a);color:var(--on)}.k4-b.o{background:#fff;color:var(--ink)}
.k4-gc{position:relative;height:620px}.k4-gc .k4-hi{position:absolute;right:0;top:0;width:88%;height:470px;border:2px solid var(--ink);border-radius:18px;box-shadow:12px 12px 0 var(--a)}
.k4-g2{position:absolute;left:0;bottom:0;width:300px;height:220px;border:2px solid var(--ink);border-radius:18px;box-shadow:8px 8px 0 var(--ink);transform:rotate(-3deg)}
.k4-grid .k4-q{background:var(--bg);border:2px solid var(--ink);border-radius:16px;padding:0 24px}.k4-grid .k4-q a:first-child{padding-left:0}
.k4-bp{border:2px solid var(--ink);box-shadow:10px 10px 0 var(--a)}.k4-bd dl{border-top-color:var(--ink)}.k4-bi span{font-family:${F.mono}}
.k4-steps{background:var(--ink)!important;color:#fff!important;--ln:rgba(255,255,255,.18);--mu:#B9B9B9;--lab:var(--pt)}.k4-sn{font-family:${F.mono};color:var(--pt)}
.k4-num{background:var(--pt)!important;color:#111!important}.k4-num .k4-big{font-family:${F.sans}}
.k4-fin{background-color:var(--bg)!important;background-image:linear-gradient(${mix(v.ink, v.bg, .9)} 1px,transparent 1px),linear-gradient(90deg,${mix(v.ink, v.bg, .9)} 1px,transparent 1px)!important;background-size:32px 32px!important}
@media(max-width:1000px){.k4-gg{grid-template-columns:minmax(0,1fr)}.k4-gc{order:-1;height:440px;max-width:620px}.k4-gc .k4-hi{height:340px}}
@media(max-width:760px){.k4-gg{gap:24px;padding-bottom:40px}.k4-gc{height:330px}.k4-gc .k4-hi{height:250px;width:92%;box-shadow:8px 8px 0 var(--a)}.k4-g2{width:170px;height:120px}.k4-grid .k4-sub{font-size:17px;margin:18px 0 26px!important}.k4-grid .k4-q{padding:0 16px}.k4-b.p,.k4-b.o{box-shadow:3px 3px 0 var(--ink),inset 0 0 0 2px var(--ink)!important}}`,
    kfart: v => `${HB('k4-collage', '64px 0 0', '20px 0 0')}${H1('k4-collage', 120, 60, 1.02, 'letter-spacing:-.065em!important;')}
.k4-pg{display:grid;grid-template-columns:1.05fr 1fr;gap:40px;align-items:center;padding-bottom:90px}@media(max-width:1340px){.hpt.hp-hero.k4-h.k4-collage h1{font-size:108px!important}}
.k4-collage .k4-sub{font-size:20px;line-height:1.65;color:var(--mu);margin:34px 0 38px!important;max-width:500px}
.k4-col{position:relative;height:690px}.k4-col .k4-ph{position:absolute}
.k4-s1{left:0;top:40px;width:330px;height:470px;border-radius:165px 165px 18px 18px}.k4-s2{right:0;top:0;width:290px;height:290px;border-radius:50%}.k4-s3{right:10px;bottom:0;width:340px;height:360px;border-radius:18px}
.k4-dot{position:absolute;z-index:2;left:300px;top:6px;width:96px;height:96px;border-radius:50%;background:var(--pt)}
.k4-collage .k4-q{border-top:2px solid var(--ink);border-bottom:0}
.k4-num .k4-big{font-family:${F.sans};font-size:320px}.k4-nt h2{font-size:44px}
.k4-quote{background:var(--bg)!important;padding-top:0!important}.k4-quote .k4-w{grid-template-columns:auto minmax(0,1fr)}.k4-quote .k4-qp{order:0;width:420px;height:420px;border-radius:50%}.k4-quote blockquote{font-family:${F.sans};font-size:44px;letter-spacing:-.055em}.k4-quote blockquote::before{display:none}
.k4-fin{background:var(--ink)!important;color:var(--bg)!important;--mu:#B5B0A8;--ln:#2E2E2E}.k4-fin h2 em{color:var(--pt)!important}.k4-fin .k4-b.o{color:#fff}
@media(max-width:1000px){.k4-pg{grid-template-columns:minmax(0,1fr)}.k4-col{order:-1;max-width:640px}}
@media(max-width:760px){.k4-pg{gap:24px;padding-bottom:44px}.k4-col{height:410px}.k4-s1{width:190px;height:290px;top:30px;border-radius:95px 95px 14px 14px}.k4-s2{width:170px;height:170px}.k4-s3{width:180px;height:200px;right:0}.k4-dot{left:160px;top:0;width:56px;height:56px}
.k4-collage .k4-sub{font-size:17px;margin:20px 0 26px!important}.k4-num .k4-big{font-size:150px}.k4-nt h2{font-size:28px}.k4-quote .k4-w{grid-template-columns:minmax(0,1fr)}.k4-quote .k4-qp{width:240px;height:240px}.k4-quote blockquote{font-size:28px}}`,
    kfmusic: v => `.hpt.hp-hero.k4-h.k4-half{display:grid;grid-template-columns:1fr 1fr;min-height:860px;padding:0;background:var(--bg);color:var(--ink);margin:0}${H1('k4-half', 64, 38, 1.2, 'letter-spacing:-.035em!important;')}
@media(max-width:1340px) and (min-width:1001px){.hpt.hp-hero.k4-h.k4-half{grid-template-columns:.85fr 1.15fr}.k4-hr{padding:72px 48px 56px}}.k4-hl{position:relative;min-height:100%}.k4-hl .k4-hi{position:absolute;inset:0;height:100%}
.k4-hr{display:flex;align-items:center;padding:80px 72px 60px}.k4-hri{max-width:580px}
.k4-half .k4-kick{font-family:${F.serif};font-style:italic;font-size:18px;color:var(--pt);margin-bottom:26px!important}
.k4-half .k4-sub{font-size:19px;line-height:1.8;color:var(--mu);margin:28px 0 40px!important}
.k4-half .k4-q{grid-template-columns:minmax(0,1fr);margin-top:56px;border-bottom:0}.k4-half .k4-q a,.k4-half .k4-q a:first-child{padding:0;min-height:60px;border-left:0}.k4-half .k4-q a+a{border-top:1px solid var(--ln)}
.k4-story{background:var(--alt)!important}.k4-pr span{font-style:italic}
.k4-tt .k4-td{font-family:${F.serif};font-style:italic}
.k4-quote{background:var(--a)!important;color:#fff!important;--mu:rgba(255,255,255,.75);--pt:${v.pt}}.k4-quote .k4-qp{border-radius:4px}
@media(max-width:1000px){.hpt.hp-hero.k4-h.k4-half{grid-template-columns:minmax(0,1fr);min-height:0}.k4-hl{height:460px}.k4-hr{padding:48px 40px 40px}}
@media(max-width:760px){.k4-hl{height:330px}.k4-hr{padding:32px 20px 20px}.k4-half .k4-sub{font-size:17px;margin:18px 0 26px!important}.k4-half .k4-q{margin-top:32px}}`,
    kfsport: v => `.hpt.hp-hero.k4-h.k4-slab{padding:0;background:var(--bg);color:var(--ink);margin:0}${H1('k4-slab', 132, 60, .95, 'letter-spacing:-.02em!important;')}
.k4-slab>.k4-hi{height:470px}
.k4-sl{background:var(--pt);color:#111;padding:60px 0 64px;margin-top:-120px;position:relative;z-index:2;max-width:1280px;margin-left:auto;margin-right:auto}
.k4-slab .k4-kick{color:#111;font-weight:700;font-size:16px;margin-bottom:18px!important}.k4-slab h1 em{color:transparent!important;-webkit-text-stroke:3px #111}@media(max-width:760px){.k4-slab h1 em{-webkit-text-stroke:2px #111}}
.k4-slr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:40px;align-items:end;margin-top:32px}.k4-slab .k4-sub{font-size:20px;line-height:1.65;color:#2A2A2A;max-width:560px}
.k4-b{border-radius:0!important}.k4-slab .k4-b.p{background:#111;color:#fff}.k4-slab .k4-b.o{color:#111;box-shadow:inset 0 0 0 2px #111}
.k4-slab .k4-q{margin-top:0;border-top:0}
.k4-num{background:#111!important;color:#fff!important}.k4-num .k4-big{font-family:${F.dohy};font-weight:400;color:var(--pt);font-size:280px}
.k4-bd h3,.k4-hd h2,.k4-band>.k4-w>h2,.k4-gal>.k4-w>h2,.k4-week h2,.k4-fin h2{font-weight:400!important;letter-spacing:-.01em!important}.k4-bp,.k4-gl a,.k4-wp{border-radius:0!important}
.k4-bi span{background:var(--pt);color:#111;padding:2px 8px}.k4-lab{color:#111!important;background:var(--pt);display:inline-block;padding:4px 10px}
.k4-fin{background:var(--pt)!important;color:#111!important;--mu:#3A3A3A;--ln:rgba(0,0,0,.2)}.k4-fin h2 em{color:#111!important;background:#fff;padding:0 .1em}.k4-fin .k4-b.p{background:#111;color:#fff}
@media(max-width:760px){.k4-slab>.k4-hi{height:300px}.k4-sl{margin-top:-40px;padding:34px 0 36px}.k4-slr{grid-template-columns:minmax(0,1fr);gap:22px;margin-top:20px}.k4-slab .k4-sub{font-size:17px}.k4-num .k4-big{font-size:150px}}`
  };
  function cssX(s, th, T) { try { const v = vars(s, th, T || {}); return cssBase(v) + (XCSS[s.theme] ? XCSS[s.theme](v) : ''); } catch (e) { console.error('hp44-k12 css', e); return ''; } }

  /* ── 등록 ── */
  IDS.forEach(id => { const d = Object.assign({ prem: 1, cssX }, DEF[id]); if (!d.hb) delete d.hb; HPT.reg(id, d); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hp44-k12 HPD', e); } });
  const mine = s => { try { return !!(s && s.theme && IDS.includes(s.theme)); } catch (e) { return false; } };
  if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, t2) => DEF[id] ? DEF[id].tags.includes(t2 || (S && S.org && S.org.type)) : f0(id, t2); }
  if (window.HPS && typeof HPS.hero === 'function') { const h0 = HPS.hero; HPS.hero = (kind, s, d, th, T) => { try { if (mine(s) && (!d || !d.hk)) return HERO[s.theme](s, d || {}); } catch (e) { console.error('hp44-k12 hero', e); } return h0(kind, s, d, th, T); }; }
  { const base = proSec; proSec = (x, i, s, lk) => { const d = x && x.data; const r = d && x.type === 'text' && SECR[d.hpt];
    if (!r || !s || !mine(s)) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    let h = null; try { h = r(d, s); } catch (e) { console.error('hp44-k12', d.hpt, e); h = null; }
    if (h == null) return base(x, i, s, lk); if (!h) return '';
    const m = editing() ? HPE.map.get(x) : null; if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; window.proSec = proSec; }
  { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!IDS.includes(id) || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(x => x.id === 't44-' + id); if (tp && typeof tp.build === 'function') { b.sections = tp.build(); setPhotos(b, id); }
      return siteHTML(b, false, 'ko'); } catch (e) { console.error('hp44-k12 thumb', e); return tb(s, id); } }; }

  /* ── 템플릿(기본 섹션 · 문구 — 운영자가 편집) ── */
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const TX = (variant, data) => S2('text', { variant, ...data });
  const AUTO = [['자동', '공개 강좌 정보로 자동으로 채워요']];
  const KEEP = () => [['facts', 'stats', { title: '' }], ['people', 'profiles', { eyebrow: '선생님', title: '함께하는 선생님' }], ['faq', 'info', { eyebrow: 'FAQ', title: '자주 묻는 질문' }]].map(([h, v, x]) => { const o = TX(v, Object.assign({ hpt: h, cols: [] }, x)); o.hide = true; return o; });
  const PH = {
    kfmath: { hero: 'dsk-07', about: 'hum-39' }, kfeng: { hero: 'lan-02', wk: 'hum-38', quote: 'kid-09' }, kfessay: { hero: 'hum-37', about: 'lib-07', quote: 'hum-35' },
    kfprep: { hero: 'lib-08' }, kfsci: { hero: 'sci-01', wk: 'sci-02', quote: 'hum-13' }, kfkids: { hero: 'kid-06', h2: 'kid-01', h3: 'kid-02', quote: 'fam-01' },
    kfcode: { hero: 'rob-01', h2: 'kid-04' }, kfart: { hero: 'hum-25', h2: 'hum-27', h3: 'hum-40', quote: 'kid-03' }, kfmusic: { hero: 'mus-02', about: 'mus-06', quote: 'mus-07' }, kfsport: { hero: 'spo-01', wk: 'spo-08' }
  };
  const HEAD = { kfsci: { head: 'overlay', foot: 'min' } };
  function setPhotos(s, id) { const P = PH[id]; if (!P) return s;
    s.photos = Object.assign({}, P); s.img = s.img || {};
    if (window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') ['hero', 'about'].forEach(sl => { if (!P[sl]) return; const v = HPSTOCK.slotImg(P[sl], sl); if (v) s.img[sl] = v; });
    s.hps = Object.assign({}, s.hps || {}, HEAD[id] || { head: 'solid', foot: 'min' }); return s; }
  const BAN = (eyebrow, title, sub) => S2('banner', { eyebrow, title, sub, cta: '', cta2: '' });
  const FIN = (title, body) => [...KEEP(), TX('cta', { hpt: 'k4-fin', title, body, cta: '', cols: AUTO })];
  const BUILD = {
    kfmath: () => [BAN('초등 · 중등 · 고등 수학', '개념이 보이면,\n*문제가 풀려요*', '한 단원을 스스로 설명할 수 있을 때 다음으로 넘어가요. 수업이 끝나면 학부모님께 오늘 배운 것을 알려 드려요.'),
      TX('features', { hpt: 'k4-story', eyebrow: '수업 방식', title: '빨리 가는 것보다\n제대로 아는 것', body: '진도를 앞서 나가기보다 오늘 배운 개념을 내 말로 설명하게 해요. 틀린 문제는 다음 수업 첫 10분에 다시 풀어요.', cols: [['레벨 테스트로 반 배정', '입학 전 진단으로 맞는 반부터 찾아요.'], ['오답은 다음 수업 첫 10분에', '모르는 채로 지나가지 않아요.'], ['수업마다 학부모 알림', '출결 · 진도 · 숙제를 바로 보내 드려요.']] }),
      TX('features', { hpt: 'k4-tt', eyebrow: '시간표', title: '이번 학기 시간표', cols: AUTO }),
      TX('features', { hpt: 'k4-cls', eyebrow: '모집 중인 반', title: '학년별로 골라 보세요', cols: AUTO }),
      TX('features', { hpt: 'k4-quote', cols: AUTO }), ...FIN('첫 수업은\n*체험*으로 시작해요', '체험 수업이 끝나면 담당 선생님이 아이에게 맞는 반을 말씀드려요.')],
    kfeng: () => [BAN('초등 · 중등 영어 · 원어민 회화', '영어로 생각하고,\n*영어로 말해요*', '읽고 듣고 말하는 수업을 한 반 소수 정원으로. 매달 말하기 녹음으로 달라진 걸 들려 드려요.'),
      TX('features', { hpt: 'k4-stm', body: '소수 정원, *매일 15분 말하기*로 이어 가요.', cols: AUTO }),
      TX('features', { hpt: 'k4-cls', eyebrow: '모집 중인 반', title: '레벨에 맞는 반', cols: AUTO }),
      TX('features', { hpt: 'k4-week', eyebrow: '한 주의 흐름', title: '수업은 교실에서,\n연습은 매일 조금씩', body: '바쁜 주에도 끊기지 않게, 한 주를 이렇게 나눠 두었어요.', cols: [['수업일', '리딩 · 말하기 수업', '원서 한 장과 짝 말하기'], ['다음 날', '듣기 10분', '어제 표현을 귀로 다시'], ['주말', '말하기 녹음', '1분 녹음에 선생님 코멘트'], ['월말', '레벨 리포트', '단어 · 독해 · 말하기 변화를 한 장으로']] }),
      TX('features', { hpt: 'k4-quote', cols: AUTO }), ...FIN('먼저 레벨 테스트로\n*출발점*을 알아봐요', '테스트가 끝나면 담당 선생님이 맞는 반과 교재를 안내해 드려요.')],
    kfessay: () => [BAN('국어 · 독서 · 논술', '읽은 만큼,\n*쓸 수 있게* 돼요', '한 권을 끝까지 읽고 내 생각을 한 장으로 써요. 첨삭은 매주 학부모님께도 보내 드려요.'),
      TX('features', { hpt: 'k4-story', eyebrow: '수업 방식', title: '빨리 읽기보다\n깊이 읽기', body: '한 학기에 여섯 권. 읽고, 말하고, 쓰는 순서로 한 권을 오래 붙잡아요.', cols: [['함께 읽기', '같은 책을 읽고 질문을 나눠요.'], ['생각 말하기', '토론으로 내 생각의 근거를 찾아요.'], ['한 장 쓰기 · 첨삭', '글마다 선생님이 직접 첨삭해요.']] }),
      TX('features', { hpt: 'k4-num', pref: 'review', body: '학기마다 보내 드리는 글쓰기 리포트로 다음 학기를 함께 정해요.', cols: AUTO }),
      TX('features', { hpt: 'k4-cls', eyebrow: '모집 중인 반', title: '이번 학기 읽는 반', cols: AUTO }),
      TX('features', { hpt: 'k4-quote', cols: AUTO }), ...FIN('먼저 한 번,\n*수업으로* 만나요', '체험 수업이 끝나면 아이의 글을 보고 맞는 반을 말씀드려요.')],
    kfprep: () => [BAN('종합 입시 · 내신 · 수능', '한 해의 공부를\n*끝까지* 책임집니다', '진단에서 반 배정, 주간 테스트와 입시 상담까지. 한 학생의 한 해를 담임이 함께 걷습니다.'),
      TX('features', { hpt: 'k4-steps', nst: 'roman', eyebrow: '교육 원칙', title: '세 가지 원칙을 지킵니다', cols: [['진단으로 시작합니다', '입학 전 과목별 진단으로 출발점을 정합니다.'], ['매주 확인합니다', '주간 테스트와 클리닉으로 약한 단원을 바로 메웁니다.'], ['끝까지 상담합니다', '학기마다 학부모 상담으로 다음 계획을 함께 정합니다.']] }),
      TX('features', { hpt: 'k4-cls', lay: 'rows', eyebrow: '개설 강좌', title: '이번 학기 개설 강좌', cols: AUTO }),
      TX('features', { hpt: 'k4-num', pref: 'review', body: '', cols: AUTO }),
      TX('features', { hpt: 'k4-notice', eyebrow: '학원 소식', title: '알려 드립니다', cols: AUTO }), ...FIN('입학 상담으로\n*시작하십시오*', '진단 결과와 목표를 듣고 맞는 반과 한 해의 계획을 안내해 드립니다.')],
    kfsci: () => [BAN('중 · 고등 과학 · 탐구 실험반', '교과서 속 원리를\n*직접* 확인해요', '매주 실험 한 가지, 보고서 한 장. 왜 그런지 끝까지 묻는 과학 수업이에요.'),
      TX('features', { hpt: 'k4-stm', body: '매주 *실험 한 가지*와 보고서 한 장으로 이어 가요.', cols: AUTO }),
      TX('features', { hpt: 'k4-cls', eyebrow: '모집 중인 반', title: '지금 신청할 수 있는 반', cols: AUTO }),
      TX('features', { hpt: 'k4-week', eyebrow: '한 주의 흐름', title: '가설에서 보고서까지,\n한 주에 한 바퀴', body: '실험이 끝나면 결과와 보고서를 학부모님께도 보내 드려요.', cols: [['수업 1', '개념 · 가설 세우기', '오늘 확인할 질문을 정해요'], ['수업 2', '실험', '조를 나눠 직접 측정해요'], ['주말', '보고서 쓰기', '결과와 이유를 한 장으로'], ['월말', '탐구 발표', '한 달의 실험을 발표해요']] }),
      TX('features', { hpt: 'k4-num', pref: 'ratio', body: '', cols: AUTO }),
      TX('features', { hpt: 'k4-quote', cols: AUTO }), ...FIN('이번 주 실험 수업에\n*함께해요*', '체험 수업이 끝나면 담당 선생님이 맞는 반과 시작 시점을 알려 드려요.')],
    kfkids: () => [BAN('5~9살 · 놀이로 배우는 첫 공부', '처음 배우는 날이\n*즐거운 날*이 돼요', '한글 · 수 · 그림책 수업을 놀이로. 수업이 끝나면 오늘 한 것을 사진으로 보내 드려요.'),
      TX('features', { hpt: 'k4-steps', eyebrow: '첫 등원까지', title: '이렇게 시작해요', cols: [['상담 예약', '아이의 나이와 좋아하는 것을 알려 주세요.'], ['체험 수업', '선생님과 친구들을 먼저 만나 봐요.'], ['반 정하기', '아이에게 맞는 반과 시간을 함께 정해요.']] }),
      TX('features', { hpt: 'k4-gal', eyebrow: '우리 반 이야기', title: '이번 달, 아이들의 시간', cols: AUTO }),
      TX('features', { hpt: 'k4-cls', eyebrow: '모집 중인 반', title: '나이별 반', cols: AUTO }),
      TX('features', { hpt: 'k4-quote', cols: AUTO }), ...FIN('아이와 함께\n*놀러* 오세요', '체험 수업이 끝나면 선생님이 아이가 가장 즐거워한 순간을 말씀드려요.')],
    kfcode: () => [BAN('코딩 · 로봇 · STEAM', '상상한 걸\n*직접 만들어요*', '블록 코딩에서 로봇까지. 한 학기에 작품 하나를 끝까지 완성하고 발표해요.'),
      TX('features', { hpt: 'k4-band', eyebrow: '수업', title: '만들고, 고치고,\n다시 만들어요', cols: AUTO }),
      TX('features', { hpt: 'k4-steps', eyebrow: '한 학기 흐름', title: '아이디어에서 발표까지', cols: [['아이디어', '만들고 싶은 것을 그림으로 그려요.'], ['만들기', '코딩 · 조립으로 첫 버전을 완성해요.'], ['고치기', '친구들과 테스트하고 고쳐요.'], ['발표', '학기 말 작품 발표회를 열어요.']] }),
      TX('features', { hpt: 'k4-num', pref: 'ratio', body: '', cols: AUTO }), ...FIN('첫 작품은\n*체험 수업*에서', '체험 수업이 끝나면 아이의 수준에 맞는 반과 교구를 안내해 드려요.')],
    kfart: () => [BAN('', '그리고,\n만들고,\n*빚어요.*', '수채화 · 드로잉 · 소조까지. 소수 정원 반에서 한 학기 열두 가지 재료를 만져 봐요.'),
      TX('features', { hpt: 'k4-band', eyebrow: '수업', title: '좋아하는 걸 찾을 때까지,\n골고루 해 봐요', cols: AUTO }),
      TX('features', { hpt: 'k4-num', pref: 'ratio', body: '그래서 붓 잡는 손 하나까지 한 명씩 봐 줄 수 있어요.', cols: AUTO }),
      TX('features', { hpt: 'k4-gal', eyebrow: '갤러리', title: '이번 학기, 아이들의 작업', cols: AUTO }),
      TX('features', { hpt: 'k4-quote', cols: AUTO }), ...FIN('한 번,\n*와 보세요.*', '체험 수업이 끝나면 아이가 어떤 재료에서 가장 즐거워했는지 말씀드려요.')],
    kfmusic: () => [BAN('피아노 · 바이올린 · 첼로', '매일 십 분이\n한 곡의 *무대*가 돼요', '1:1 레슨에 소리 듣기 수업을 더했어요. 학기 말에는 작은 무대에서 직접 연주해요.'),
      TX('features', { hpt: 'k4-story', eyebrow: '레슨 방식', title: '손보다 먼저\n귀를 키워요', body: '정확한 손 모양과 함께, 좋은 소리를 알아듣는 귀를 함께 길러요.', cols: [['1:1 레슨', '아이의 속도에 맞춰 곡을 골라요.'], ['소리 듣기 수업', '박자 · 음정 · 화음을 귀로 익혀요.'], ['학기 말 연주회', '작은 무대에서 직접 연주해요.']] }),
      TX('features', { hpt: 'k4-tt', eyebrow: '레슨 시간', title: '이번 학기 레슨 시간', cols: AUTO }),
      TX('features', { hpt: 'k4-quote', cols: AUTO }), ...FIN('첫 레슨은\n*체험*으로 시작해요', '체험 레슨이 끝나면 아이에게 맞는 악기와 교재를 안내해 드려요.')],
    kfsport: () => [BAN('태권도 · 줄넘기 · 체육', '끝까지,\n*한 번 더.*', '기본기부터 단계별 승급까지. 땀 흘린 만큼 자라는 체육 수업이에요.'),
      TX('features', { hpt: 'k4-num', pref: 'ratio', body: '', cols: AUTO }),
      TX('features', { hpt: 'k4-band', eyebrow: '수업', title: '나이와 단계에 맞게', cols: AUTO }),
      TX('features', { hpt: 'k4-week', eyebrow: '한 달의 흐름', title: '기본기에서\n승급 심사까지', body: '한 달에 한 번, 배운 것을 심사로 확인해요.', cols: [['1주', '기본기', '자세 · 발차기 · 줄넘기 기본'], ['2~3주', '단계 연습', '품새 · 기술을 단계별로'], ['4주', '승급 심사', '배운 것을 심사로 확인해요'], ['방학', '캠프 · 대회', '야외 활동과 대회 참가']] }),
      TX('features', { hpt: 'k4-gal', eyebrow: '수업 장면', title: '땀 흘린 시간들', cols: AUTO }), ...FIN('오늘 바로\n*체험* 와요', '체험 수업이 끝나면 아이에게 맞는 반과 시간을 안내해 드려요.')]
  };
  const QA = {
    kfmath: ['초등 사고력 수학', '중1 수학 개념 완성', '중3 수학 내신 대비', '고1 수학 기본', '고2 수학Ⅱ 심화', '무료 수학 진단 수업'],
    kfeng: ['초등 영어 리딩', '중등 영어 문법', '원어민 회화 클럽', '중3 영어 내신 대비', '고1 영어 독해', '무료 레벨 테스트'],
    kfessay: ['초등 독서 논술', '중등 국어 문법', '고1 국어 문학', '중등 글쓰기 첨삭', '고2 비문학 독해', '무료 독서 체험'],
    kfprep: ['고3 수능 국어', '고3 수능 수학', '고2 영어 내신', '고1 통합과학', '중3 고교 대비', '무료 입학 진단'],
    kfsci: ['중2 과학 실험 탐구', '고1 통합과학 실험', '고2 화학 심화', '중3 물리 실험', '고2 생명과학 탐구', '무료 실험 체험'],
    kfkids: ['5살 놀이 한글', '6살 수 놀이', '7살 그림책 영어', '초1 받아쓰기 교실', '초2 독서 놀이', '무료 놀이 체험'],
    kfcode: ['초등 블록 코딩', '로봇 만들기 교실', '중등 파이썬 입문', '3D 프린팅 메이커', '앱 만들기 프로젝트', '무료 코딩 체험'],
    kfart: ['어린이 수채화 드로잉', '소조 · 만들기 교실', '초등 창의 미술', '중등 입시 소묘', '판화 · 공예 교실', '토요 무료 체험 수업'],
    kfmusic: ['피아노 1:1 레슨', '바이올린 기초', '첼로 입문', '피아노 콩쿠르반', '음악 이론 · 청음', '무료 체험 레슨'],
    kfsport: ['어린이 태권도', '줄넘기 교실', '어린이 농구 교실', '초등 체력 교실', '태권도 품새반', '무료 체험 수업']
  };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hp44k) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && /^t44-/.test(tp.id) ? tp.id.slice(4) : ''; if (IDS.includes(id)) setPhotos(s, id); } catch (e) { console.error('hp44-k12 photos', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hp44k = 1; siteFromTpl = f; window.siteFromTpl = f; }
  IDS.forEach(id => { if (TPL.some(x => x.id === 't44-' + id)) return;
    TPL.push({ id: 't44-' + id, name: DEF[id].name, types: ['k12'], g44: 1, sub: DEF[id].sub, scene: `학원 · 초중고 · ${DEF[id].sub} — ${DEF[id].desc}`, color: DEF[id].acc, tone: id === 'kfprep' ? '신뢰' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: ['apply', 'info'], prem: 1, hp44: 'k12', build: BUILD[id], noPalette: true, qaCls: QA[id] }); });
  window.HP44 = Object.assign(window.HP44 || {}, { k12: { ids: IDS.slice(), subs: IDS.map(id => [id, DEF[id].sub]) } });
})();
