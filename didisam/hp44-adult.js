/* v44 hp44-adult — 성인 · 1인 강사(adult) 홈페이지 템플릿 10종(세부 유형별)
   대표님(2026-11-18): 「기관 유형별로 … 세부 유형별로 시나리오에 맞게 높은 퀄리티의 템플릿만 … 각 10개씩」 「다른 유형의 템플릿도 아주 잘 디자인되어 있는 고퀄리티」
   기준선: v43.9 hpv-acad의 「시네마틱 다크(accine)」 · 「포스터 컬러 블록(acposter)」 · 「에디토리얼(acpaper)」 성인 버전을 흡수 · 발전(같은 id는 다시 쓰지 않는다).
   id: HPT.reg · HPD.reg가 /^[a-z]{2,16}$/만 받으므로 성인 접두어는 「ad」. 템플릿 id는 't44-' + id. 클래스 접두어 a4-.
   10종(세부 유형 · 첫 화면 구성)
     adtalk 어학 회화(말풍선 분할) · adexam 자격증 · 시험(전통 · 격식 증서 액자 + 아치) · adit 직무 · IT(시네마틱 다크) · adcraft 취미 · 공예(포스터 콜라주)
     admove 운동 · 요가 · 필라테스(반반 분할) · adcook 요리 · 베이킹(가운데 에디토리얼) · adcoach 1인 강사 코칭(시그니처 인사) · advocal 음악 · 보컬(무대 검은 띠)
     adphoto 사진 · 영상 크리에이터(필름 띠) · admoney 재테크 · 커리어(신문 1면)
     1인 강사용(solo: 1): adcoach · advocal · adphoto · admoney — 갤러리 「1인 강사」 칩에 나온다.
   원칙: 첫 화면 = 큰 제목 + 짧은 부제 + 버튼 2개 + 크고 밝은 사진. 수강생 · 결제 · 상담은 첫 화면 아래 한 줄 바로 가기(#login/my · #login/mypay · tel:/전체 수업).
   사실: 과정 · 요일 · 시간 · 정원 · 수강료는 공개 강좌(S.classes), 큰 숫자는 계산 가능한 값(후기 평점 4.0 이상 · 소수 정원 · 과정 수 3개 이상), 후기는 실제 후기(HPT.reviews), 소식은 S.notices — 없으면 숨김(편집 중에는 안내).
   CSS는 cssX 문자열(게시본 Shadow DOM · 미리보기 공통). hpth · hpprem · hpsec* · hpv-*는 고치지 않는다. */
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
  const AR = '<svg class="a4-ar" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ── 사진 ── */
  const ph = (s, slot, d) => { try { return window.HPS && HPS.photo ? HPS.photo(s, slot, d) : null; } catch (e) { return null; } };
  const img = (p, cls, eager, slot) => p ? `<figure class="a4-ph${cls ? ' ' + cls : ''}"${slot ? ` data-slot="${E(slot)}"` : ''}${slot === 'hero' ? ' data-hero="1"' : ''}${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 760px) 100vw, 60vw"` : ''} alt="${E(p.alt || '')}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos || '50% 50%')}"></figure>` : '';
  const fig = (s, slot, cls, eager, d) => img(ph(s, slot, d), cls, eager, slot);
  let USED = new Set(); const fresh = () => { USED = new Set(); };
  const clsPh = (c, s, i) => { let m = null; try { m = HPS.cardImg ? HPS.cardImg(c, s) : null; } catch (e) { m = null; }
    const key = m ? String(m.stock || m.big || m.src).replace(/-800(?=\.webp)/, '').replace(/^.*\/img\/stock\//, '').replace(/\.webp.*$/, '') : '';
    if (m && !USED.has(key)) { USED.add(key); return { src: m.big || m.src, alt: m.alt || c.name, pos: m.pos, stock: !!m.stock }; }
    try { let x = null; for (let k = 0; k < 8 && (!x || USED.has(x.id)); k++) x = HPSTOCK.photo(c.name, c.id + '|' + i + '|' + k, { id: true, slot: 'card', scope: 'a4-' + c.id + k }); if (x) { USED.add(x.id); return { src: HPSTOCK.url(x), alt: x.alt, pos: x.focus, stock: true }; } } catch (e) { }
    return null; };

  /* ── 공통 조각 ── */
  const sec = (cls, inner, pre) => `<section class="hpt hp-s a4-s ${cls}">${pre || ''}<div class="a4-w">${inner}</div></section>`;
  const hint = (cls, msg) => editing() ? sec(cls, `<p class="a4-hint">${E(msg)}</p>`) : '';
  const lab = t2 => t2 ? `<p class="a4-lab">${E(t2)}</p>` : '';
  const btn = (l, h, k) => `<a class="a4-b ${k || ''}" ${aT(h)}>${E(l)}${k === 'p' ? AR : ''}</a>`;
  const GEN = /^(수업|강좌|과정) 둘러보기$|^$/;
  const ctas = (s, d) => { const free = pub().some(c => !+c.price); const c1 = GEN.test(d.cta || '') ? (free ? '무료 체험 신청' : '수강 신청하기') : d.cta; const c2 = GEN.test(d.cta2 || '') || d.cta2 === c1 ? '상담 예약' : d.cta2;
    return `<div class="a4-cta">${btn(c1, L.trial(s), 'p')}${btn(c2, L.ask(s), 'o')}</div>`; };
  const quick = s => { const tel = val(ft().tel);
    const Q = [['수강생', '내 수업 이어 보기 · 과제', '#login/my'], ['결제 · 영수증', '수강료 · 영수증 · 환불', '#login/mypay'], tel ? ['전화 상담', tel, telH(tel)] : ['수업 둘러보기', '개강 과정 · 시간표', L.cls(s)]];
    return `<nav class="a4-q" aria-label="바로 가기">${Q.map(([a, b, h]) => `<a ${aT(h)}><b>${E(a)}</b><span>${E(b)}</span>${AR}</a>`).join('')}</nav>`; };
  const head = d => `${d.eyebrow ? `<p class="a4-kick">${E(d.eyebrow)}</p>` : ''}<h1>${emph(d.title || org())}</h1>${d.sub ? `<p class="a4-sub">${E(d.sub)}</p>` : ''}`;

  /* ── 후기 인용: 별점 4 이상 · 불만 · 요청 · 질문으로 보이는 글은 제외(FIX 3) ── */
  const BAD = /끊겨|끊기|끊김|안 ?돼|안 ?되|안 ?나와|부탁|해 ?주세요|해 ?주셨으면|주시면|오류|에러|버그|환불|불편|불만|아쉬|느려|느리|별로|문의|[?？]\s*$/;
  const okRv = r => r && +r.st >= 4 && String(r.b || '').trim().length >= 8 && !BAD.test(String(r.b || '').trim()) && !/^(수강 ?)?후기 ?남깁니다/.test(String(r.b || '').trim());
  window.HP44AQ = okRv;
  /* ── 큰 숫자: 자랑할 만한 값만(후기 10건+ · 평점 4.5+, 과정 10개+, 소수 정원 1:8 이하는 ratio 연출에서만) — 못 미치면 블록 전체 숨김(FIX 2) ── */
  function bigNum(pref) { let R = []; try { R = (HPT.reviews() || []).filter(r => +r.st > 0); } catch (e) { }
    const C = pub(); const caps = C.map(capOf).filter(Boolean); const avg = R.length ? R.reduce((a, r) => a + Math.min(5, +r.st), 0) / R.length : 0;
    const rv = R.length >= 10 && avg >= 4.5 ? { v: avg.toFixed(1), u: '/5', t: '수강생이 남긴\n실제 후기 평점이에요', n: `수강후기 ${R.length}건 평균` } : null;
    const cap = caps.length ? Math.max(...caps) : 0;
    const cp = pref === 'ratio' && cap && cap <= 8 ? (pref === 'ratio' ? { v: `1:${cap}`, u: '', t: `강사 한 명이 보는 인원은\n최대 ${cap}명이에요`, n: '공개 반 정원 기준' } : { v: String(cap), u: '명', t: `한 반은\n최대 ${cap}명까지만 받아요`, n: `공개 반 ${C.length}개의 정원 기준` }) : null;
    const nc = C.length >= 10 ? { v: String(C.length), u: '개 과정', t: '지금 신청할 수 있는\n과정이 열려 있어요', n: '공개 강좌 기준' } : null;
    const order = pref === 'ratio' ? [cp, rv, nc] : pref === 'count' ? [nc, rv, cp] : [rv, cp, nc];
    return order.find(Boolean) || null; }

  /* ══ 첫 화면 10종 ══ */
  const H0 = (s, cls, inner, dark) => `<section class="hpt hp-hero hps-hero a4-h ${cls}"${dark ? ' data-hps-dark="1"' : ''}>${inner}</section>`;
  const crest = n => { const c = (String(n || '').replace(/\s/g, '')[0] || '學'); return `<svg class="a4-crest" viewBox="0 0 64 76" width="64" height="76" aria-hidden="true" focusable="false"><path d="M32 2 60 12v24c0 18-12 31-28 38C16 67 4 54 4 36V12z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M32 8 54 16v20c0 14-9 25-22 31C19 61 10 50 10 36V16z" fill="none" stroke="currentColor" stroke-width="1"/><text x="32" y="45" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor">${E(c)}</text></svg>`; };
  const kick = d => d.eyebrow ? `<p class="a4-kick">${E(d.eyebrow)}</p>` : '';
  const ttl = d => `<h1>${emph(d.title || org())}</h1>`;
  const subt = d => d.sub ? `<p class="a4-sub">${E(d.sub)}</p>` : '';
  const HERO = {
    /* 어학 회화: 왼쪽 큰 제목 · 오른쪽 세로 사진 + 말풍선 두 개 */
    adtalk: (s, d) => H0(s, 'a4-talk', `<div class="a4-w"><div class="a4-tg"><div class="a4-ht">${head(d)}${ctas(s, d)}</div><div class="a4-tp">${fig(s, 'hero', 'a4-hi', 1, d)}${val(d.b1) ? `<p class="a4-bb a4-bb1" aria-hidden="true">${E(d.b1)}</p>` : ''}${val(d.b2) ? `<p class="a4-bb a4-bb2" aria-hidden="true">${E(d.b2)}</p>` : ''}</div></div>${quick(s)}</div>`),
    /* 자격증 · 시험(전통 · 격식): 이중 선 증서 액자 + 문장 + 아치 사진 */
    adexam: (s, d) => H0(s, 'a4-cert', `<div class="a4-w"><div class="a4-cfg"><div class="a4-frm"><div class="a4-cr">${crest(org())}</div>${kick(d)}${ttl(d)}<p class="a4-rule" aria-hidden="true"><i></i><b>◆</b><i></i></p>${subt(d)}${ctas(s, d)}</div>${fig(s, 'hero', 'a4-hi', 1, d)}</div>${quick(s)}</div>`),
    /* 직무 · IT: 전체 화면 사진 · 어두운 바탕 · 큰 흰 제목(accine 발전) */
    adit: (s, d) => H0(s, 'a4-cine', `${fig(s, 'hero', 'a4-hi', 1, d)}<div class="a4-hc"><div class="a4-w">${head(d)}${ctas(s, d)}</div></div><div class="a4-qb"><div class="a4-w">${quick(s)}</div></div>`, 1),
    /* 취미 · 공예: 아주 큰 세 줄 제목 + 아치 · 원 · 사각 사진 콜라주(acposter 발전) */
    adcraft: (s, d) => { const a = ph(s, 'hero', d), b = ph(s, 'h2'), c = ph(s, 'h3'); const tag = val(d.tag);
      return H0(s, 'a4-collage', `<div class="a4-w"><div class="a4-pg"><div class="a4-pt">${ttl(d)}${subt(d)}${ctas(s, d)}</div><div class="a4-col">${img(a, 'a4-s1', 1, 'hero')}${img(b, 'a4-s2', 1)}<i class="a4-dot" aria-hidden="true"></i>${img(c, 'a4-s3', 1)}${tag ? `<p class="a4-tag">${E(tag)}</p>` : ''}</div></div>${quick(s)}</div>`); },
    /* 운동 · 요가 · 필라테스: 왼쪽 절반 전체 높이 사진 · 오른쪽 가벼운 큰 제목 */
    admove: (s, d) => H0(s, 'a4-half', `<div class="a4-hl">${fig(s, 'hero', 'a4-hi', 1, d)}</div><div class="a4-hr"><div class="a4-hri">${head(d)}${ctas(s, d)}${quick(s)}</div></div>`),
    /* 요리 · 베이킹: 가운데 세리프 큰 제목 + 넓은 사진 한 장(acpaper 발전) */
    adcook: (s, d) => H0(s, 'a4-center', `<div class="a4-w">${head(d)}${ctas(s, d)}${fig(s, 'hero', 'a4-hi', 1, d)}${quick(s)}</div>`),
    /* 1인 강사 코칭: 작은 원형 사진 + 인사 · 아주 큰 제목 + 넓은 사진 */
    adcoach: (s, d) => H0(s, 'a4-sig', `<div class="a4-w"><div class="a4-sgt"><span class="a4-av" aria-hidden="true">${E((String(org()).replace(/\s/g, '')[0]) || '我')}</span>${kick(d)}</div>${ttl(d)}<div class="a4-sgb"><div class="a4-sgx">${subt(d)}${ctas(s, d)}</div>${fig(s, 'hero', 'a4-hi', 1, d)}</div>${quick(s)}</div>`),
    /* 음악 · 보컬: 넓은 무대 사진 + 겹친 검은 띠에 큰 흰 제목 */
    advocal: (s, d) => H0(s, 'a4-stage', `${fig(s, 'hero', 'a4-hi', 1, d)}<div class="a4-sb"><div class="a4-w">${kick(d)}${ttl(d)}<div class="a4-sbr">${subt(d)}${ctas(s, d)}</div></div></div><div class="a4-w">${quick(s)}</div>`),
    /* 사진 · 영상: 큰 제목 + 필름 띠처럼 이어지는 사진 세 장 */
    adphoto: (s, d) => H0(s, 'a4-film', `<div class="a4-w"><div class="a4-fh"><div>${d.eyebrow ? `<p class="a4-kick"><i class="a4-rec" aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}${ttl(d)}</div><div class="a4-fx">${subt(d)}${ctas(s, d)}</div></div></div>
      <div class="a4-strip"><div class="a4-sw">${fig(s, 'hero', 'a4-f1', 1, d)}${fig(s, 'h2', 'a4-f2', 1)}${fig(s, 'h3', 'a4-f3', 1)}</div></div><div class="a4-w">${quick(s)}</div>`),
    /* 재테크 · 커리어: 신문 1면 — 제호 줄 · 큰 헤드라인 · 세 단(부제 · 사진 · 버튼) */
    admoney: (s, d) => H0(s, 'a4-news', `<div class="a4-w"><div class="a4-mast"><span>${E(val(d.eyebrow) || '재테크 · 커리어 클래스')}</span><span>${E(org())}</span></div>${ttl(d)}<div class="a4-ncol">${subt(d)}<div class="a4-nph">${fig(s, 'hero', 'a4-hi', 1, d)}</div><div class="a4-nct">${ctas(s, d)}${val(d.note) ? `<p class="a4-nnote">${E(d.note)}</p>` : ''}</div></div>${quick(s)}</div>`)
  };
  /* ══ 섹션 렌더러(data.hpt = 'a4-*') ══ */
  const SECR = {
    'a4-story': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 3);
      return sec('a4-story', `${fig(s, 'about', 'a4-sp', 0)}<div class="a4-stx">${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${val(d.body) ? `<p class="a4-lead">${br(d.body)}</p>` : ''}
        ${P.length ? `<ol class="a4-pr">${P.map((r, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><div><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</div></li>`).join('')}</ol>` : ''}</div>`); },
    'a4-steps': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 4); if (!P.length) return hint('a4-steps', '단계(제목 · 설명)를 입력하면 표시됩니다.');
      const num = i => d.nst === 'roman' ? ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][i] : String(i + 1).padStart(2, '0');
      return sec('a4-steps', `<header class="a4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div></header><ol class="a4-sp4 n${P.length}">${P.map((r, i) => `<li><span class="a4-sn">${num(i)}</span><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</li>`).join('')}</ol>`); },
    'a4-num': (d, s) => { const n = bigNum(d.pref); if (!n) return hint('a4-num', '공개 강좌나 실제 후기가 생기면 큰 숫자(후기 평점 · 소수 정원 · 반 수)가 자동으로 표시됩니다.');
      return sec('a4-num', `<p class="a4-big">${E(n.v)}${n.u ? `<small>${E(n.u)}</small>` : ''}</p><div class="a4-nt"><h2>${br(n.t)}</h2>${val(d.body) ? `<p>${br(d.body)}</p>` : ''}<p class="a4-fine">${E(n.n)}</p></div>`); },
    'a4-cls': (d, s) => { fresh(); const C = pub().slice(0, d.lay === 'rows' ? 5 : 3); if (!C.length) return hint('a4-cls', '공개 강좌가 생기면 반 카드가 자동으로 채워집니다.');
      const more = `<a class="a4-lk" ${aT(L.cls(s))}>전체 수업 보기${AR}</a>`;
      if (d.lay === 'rows') return sec('a4-cls a4-rows', `<header class="a4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div>${more}</header><ul class="a4-rl">${C.map((c, i) => `<li><a ${aT(L.c(c))}><span class="a4-ri">${['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][i]}</span><span class="a4-rn"><b>${E(c.name)}</b><small>${E(whenOf(c) || '일정은 상담으로 안내해요')}</small></span><span class="a4-rp">${E(priceOf(c))}<small>${E(seatOf(c))}</small></span>${AR}</a></li>`).join('')}</ul>`);
      const card = (c, i) => { const p = clsPh(c, s, i); const desc = val(c.sub) || val(c.desc) || '';
        return `<article class="a4-cd"><a ${aT(L.c(c))}>${p ? img(p, 'a4-cp', 0) : '<span class="a4-cp a4-c0" aria-hidden="true"></span>'}<span class="a4-co"><span class="a4-cg">${E(c.cat || (c.hours ? `총 ${c.hours}시간` : '정규 과정'))}</span><b class="a4-cn">${E(c.name)}</b></span></a>${desc ? `<p class="a4-cdx">${E(desc)}</p>` : ''}<p class="a4-cm"><b>${E(whenOf(c) || '일정은 상담으로 안내해요')}</b><span>${E([priceOf(c), seatOf(c)].filter(Boolean).join(' · '))}</span></p></article>`; };
      return sec('a4-cls', `<header class="a4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div>${more}</header><div class="a4-cds n${C.length}">${C.map(card).join('')}</div>`); },
    'a4-tt': (d, s) => { const C = pub().filter(c => daysOf(c).length || timeOf(c)).slice(0, 6); if (!C.length) return hint('a4-tt', '공개 강좌에 요일 · 시간을 넣으면 시간표가 자동으로 그려집니다.');
      const k = c => (daysOf(c)[0] == null ? 9 : (daysOf(c)[0] + 6) % 7) * 10000 + (+String(timeOf(c)).replace(':', '') || 0); C.sort((a, b) => k(a) - k(b));
      return sec('a4-tt', `<header class="a4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div><a class="a4-lk" ${aT(L.cls(s))}>전체 시간표${AR}</a></header><ul class="a4-tl2">${C.map(c => `<li><a ${aT(L.c(c))}><span class="a4-td">${E(dayTx(c) || '상담')}</span><span class="a4-tm">${E(timeOf(c) || '—')}</span><b>${E(c.name)}</b><span class="a4-tx">${E([priceOf(c), seatOf(c)].filter(Boolean).join(' · '))}</span>${AR}</a></li>`).join('')}</ul>`); },
    'a4-stm': (d, s) => { const N = pub().slice(0, 3).map(c => c.name); if (!N.length) return hint('a4-stm', '공개 강좌가 생기면 반 이름으로 큰 문장이 자동으로 만들어집니다.');
      const j = N.length === 1 ? `<b>${E(N[0])}</b>` : N.length === 2 ? `<b>${E(N[0])}</b>와 <b>${E(N[1])}</b>` : `<b>${E(N[0])}</b>부터 <b>${E(N[1])}</b>, <b>${E(N[2])}</b>까지`;
      const tl = E(String(d.body || '').replace(/\*([^*]+)\*/g, '\u0001$1\u0002')).replace(/\u0001/g, '<b>').replace(/\u0002/g, '</b>');
      return sec('a4-stm', `<p class="a4-sm">${j}.${tl ? ' ' + tl : ''}</p>`); },
    'a4-week': (d, s) => { const R = (d.cols || []).filter(r => r && r[1] && !isPh(r[1])).slice(0, 5); if (!R.length) return hint('a4-week', '한 주의 흐름(때 · 할 일 · 설명)을 입력하면 표시됩니다.');
      return sec('a4-week', `${fig(s, 'wk', 'a4-wp', 0)}<div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${val(d.body) ? `<p class="a4-lead">${br(d.body)}</p>` : ''}<ul class="a4-tl">${R.map(r => `<li><span>${E(r[0] || '')}</span><div><b>${E(r[1])}</b>${r[2] ? `<p>${E(r[2])}</p>` : ''}</div></li>`).join('')}</ul></div>`); },
    'a4-band': (d, s) => { fresh(); const C = pub().slice(0, 3); if (!C.length) return hint('a4-band', '공개 강좌가 생기면 반별 큰 사진 띠가 자동으로 채워집니다.');
      const band = (c, i) => { const p = clsPh(c, s, i); const desc = val(c.sub) || val(c.desc) || '';
        return `<article class="a4-bd${i % 2 ? ' rev' : ''}">${p ? img(p, 'a4-bp', 0) : ''}<div><p class="a4-bi"><span>${String(i + 1).padStart(2, '0')}</span>${E(c.cat || (c.hours ? `총 ${c.hours}시간` : '정규 과정'))}</p><h3>${E(c.name)}</h3>${desc ? `<p class="a4-bx">${E(desc)}</p>` : ''}
          <dl><dt>시간</dt><dd>${E(whenOf(c) || '상담으로 안내해요')}</dd><dt>수강료</dt><dd>${E(priceOf(c))}</dd>${seatOf(c) ? `<dt>정원</dt><dd>${E(seatOf(c))}${capOf(c) ? ` / ${capOf(c)}명` : ''}</dd>` : ''}</dl><a class="a4-lk" ${aT(L.c(c))}>과정 자세히 보기${AR}</a></div></article>`; };
      return sec('a4-band', `${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2>${C.map(band).join('')}`); },
    'a4-gal': (d, s) => { fresh(); const C = pub().slice(0, 4); const P = C.map((c, i) => [c, clsPh(c, s, i + 7)]).filter(x => x[1]); if (P.length < 3) return hint('a4-gal', '공개 강좌가 3개 이상이면 반별 장면 갤러리가 표시됩니다.');
      return sec('a4-gal', `${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2><div class="a4-gl n${P.length}">${P.map(([c, p]) => `<a ${aT(L.c(c))}>${img(p, '', 0)}<em>${E(c.name)}</em></a>`).join('')}</div>`); },
    'a4-quote': (d, s) => { let R = []; try { R = (HPT.reviews() || []).filter(okRv); } catch (e) { } const r = R.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || String(b.b).length - String(a.b).length)[0];
      if (!r) return hint('a4-quote', '실제 수강후기가 등록되면 이곳에 크게 보여 드려요(없으면 게시된 사이트에서 숨겨집니다).');
      const t2 = String(r.b).replace(/\s+/g, ' ').trim(); const q = t2.length > 120 ? t2.slice(0, 118).replace(/\s\S*$/, '') + '…' : t2;
      return sec('a4-quote', `${fig(s, 'quote', 'a4-qp', 0)}<div class="a4-qt"><blockquote>${E(q)}</blockquote><p class="a4-cite">${E([r.w, r.c].filter(Boolean).join(' · '))}</p></div>`); },
    'a4-notice': (d, s) => { const N = (S.notices || []).filter(n => n && n.title && !n.hidden).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 4);
      if (!N.length) return hint('a4-notice', '공지사항을 올리면 학원 소식이 이곳에 표시됩니다.');
      const dt = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}. ${+m[2]}. ${+m[3]}.` : ''; };
      return sec('a4-notice', `<header class="a4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div><a class="a4-lk" ${aT(L.notice(s))}>소식 전체 보기${AR}</a></header><ul class="a4-nl">${N.map(n => `<li><a ${aT(L.notice(s))}><time>${E(dt(n.at))}</time><b>${E(n.title)}</b>${AR}</a></li>`).join('')}</ul>`); },
    'a4-fin': (d, s) => { const f = ft(); const I = [['찾아오시는 길', val(f.addr)], ['전화', val(f.tel)], ['상담 시간', val(f.hours)], ['메일', val(f.email || f.mail)]].filter(x => x[1]).slice(0, 3); const tel = val(f.tel);
      return sec('a4-fin', `<div class="a4-fg"><h2>${emph(d.title || '')}</h2><div>${val(d.body) ? `<p class="a4-lead">${br(d.body)}</p>` : ''}<div class="a4-cta">${btn(GEN.test(d.cta || '') ? (pub().some(c => !+c.price) ? '무료 체험 신청' : '수강 신청하기') : d.cta, L.trial(s), 'p')}${tel ? btn(`${tel} 전화 상담`, telH(tel), 'o') : btn('상담 예약', L.ask(s), 'o')}</div></div></div>
        ${I.length ? `<dl class="a4-info n${I.length}">${I.map(([a, b]) => `<div><dt>${E(a)}</dt><dd>${br(b)}</dd></div>`).join('')}</dl>` : ''}`); },
    /* 과정 · 패키지 카드(1인 강사): 공개 강좌의 이름 · 수강료 · 일정 · 남은 자리 */
    'a4-pkg': (d, s) => { const C = pub().slice(0, 3); if (!C.length) return hint('a4-pkg', '공개 강좌가 생기면 과정 · 수강료 카드가 자동으로 채워집니다.');
      return sec('a4-pkg', `<header class="a4-hd"><div>${lab(d.eyebrow)}<h2>${br(d.title || '')}</h2></div><a class="a4-lk" ${aT(L.cls(s))}>전체 과정 보기${AR}</a></header><div class="a4-pk n${C.length}">${C.map(c => `<a class="a4-pc" ${aT(L.c(c))}><span class="a4-pn">${E(c.cat || (c.hours ? `총 ${c.hours}시간` : '정규 과정'))}</span><b>${E(c.name)}</b><span class="a4-pp">${E(priceOf(c))}</span><span class="a4-pw">${E(whenOf(c) || '일정은 상담으로 정해요')}</span>${seatOf(c) ? `<span class="a4-pw">${E(seatOf(c))}</span>` : ''}<span class="a4-pl">자세히 보기${AR}</span></a>`).join('')}</div>`); }
  };

  /* ══ 테마 10종 ══ */
  const F = { sans: "'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", serif: "'Noto Serif KR','Noto Serif CJK KR','AppleMyungjo','Batang',serif", hahm: "'Hahmlet','Noto Serif KR','Noto Serif CJK KR',serif", seed: "'LINE Seed Sans KR','Pretendard Variable',Pretendard,sans-serif", mono: "ui-monospace,'SF Mono',Menlo,Consolas,monospace" };
  /* id: [이름, 세부 유형, 설명, 기관 색, 바탕, 대체 바탕, 글자, 보조 글자, 포인트, 제목 글꼴, 제목 굵기, 어둡게, 모서리, 1인 강사] */
  const T10 = {
    adtalk: ['어학 회화 · 말풍선 분할', '어학 회화', '왼쪽 큰 제목 · 오른쪽 세로 사진과 말풍선 — 말하면서 배우는 성인 어학 회화', '#1D4ED8', '#F6F7FB', '#ECEFF7', '#0E1630', '#4A5272', '#FF6B4A', 'seed', 700, 0, 28, 0],
    adexam: ['자격증 · 시험 · 전통 격식', '자격증 · 시험', '이중 선 증서 액자 · 문장 · 세리프 · 아치 사진 — 합격까지 이끄는 자격증 · 시험 학원', '#13284B', '#FBF9F4', '#F1ECE1', '#121A2C', '#4C5366', '#A9844E', 'hahm', 700, 0, 2, 0],
    adit: ['직무 · IT · 시네마틱 다크', '직무 · IT', '전체 화면 사진 · 어두운 바탕 · 큰 흰 제목 — 퇴근 후 직무 · IT 실무 과정', '#FF7A30', '#0B0C0E', '#141518', '#F3F1EC', '#A3A29D', '#FF7A30', 'sans', 800, 1, 20, 0],
    adcraft: ['취미 · 공예 · 포스터 콜라주', '취미 · 공예', '아주 큰 세 줄 제목 · 아치 · 원 사진 콜라주 · 색 띠 — 도예 · 뜨개 · 목공 공방', '#C2410C', '#FBF7F0', '#F3ECE0', '#141414', '#55524C', '#FFC531', 'sans', 800, 0, 24, 0],
    admove: ['운동 · 요가 · 반반 분할', '운동 · 요가 · 필라테스', '왼쪽 절반 전체 높이 사진 · 오른쪽 가벼운 큰 제목 · 시간표 — 요가 · 필라테스 스튜디오', '#3F6B57', '#F4F1EA', '#E9E4D8', '#1C2420', '#55605A', '#C9A66B', 'sans', 300, 0, 4, 0],
    adcook: ['요리 · 베이킹 · 에디토리얼', '요리 · 베이킹', '종이색 바탕 · 가운데 세리프 큰 제목 · 넓은 사진 한 장 — 요리 · 베이킹 클래스', '#9A3412', '#FBF5EC', '#F2E8DA', '#231A14', '#5E5045', '#E2A93B', 'serif', 700, 0, 6, 0],
    adcoach: ['1인 코칭 · 시그니처', '1인 강사 · 코칭', '작은 원형 사진과 인사 · 아주 큰 제목 · 넓은 사진 — 1인 강사 · 코치의 개인 홈페이지', '#5B2A86', '#FFF9F4', '#F6ECE3', '#1E1328', '#5A4E63', '#FF8A65', 'sans', 800, 0, 24, 1],
    advocal: ['음악 · 보컬 · 무대', '음악 · 보컬 레슨', '넓은 무대 사진 위 검은 띠에 큰 흰 제목 — 1인 보컬 · 악기 레슨실', '#C2185B', '#FFFFFF', '#F4F2F3', '#121014', '#4E4A4D', '#FF4D8D', 'sans', 800, 0, 0, 1],
    adphoto: ['사진 · 영상 · 필름 띠', '사진 · 영상 크리에이터', '큰 제목 아래 필름 띠처럼 이어지는 사진 세 장 — 사진 · 영상 크리에이터 클래스', '#1A1A1A', '#F2F0EB', '#E7E4DC', '#111111', '#4B4944', '#E8352A', 'sans', 800, 0, 2, 1],
    admoney: ['재테크 · 커리어 · 신문 1면', '재테크 · 커리어', '신문 1면처럼 제호 줄 · 큰 헤드라인 · 세 단 구성 — 재테크 · 커리어 1인 코칭 클래스', '#0F6B46', '#FAFAF6', '#EFEFE8', '#111512', '#4A504C', '#0F6B46', 'sans', 900, 0, 0, 1]
  };
  const IDS = Object.keys(T10);
  const DEF = {}; const HD = {};
  IDS.forEach(id => { const [name, sub, desc, acc, bg, alt, ink, mu, pt, hf, hw, dark, r, solo] = T10[id];
    DEF[id] = { name, sub, desc, solo, tags: ['adult'], tone: dark ? 'dark' : 'light', dens: '여유', acc, bg, alt, ink, mu, r: Math.min(r, 32), br: 999, hero: dark ? 'dark' : 'split', hb: dark ? '#08090A' : undefined, vis: 'mock', illu: 'book', card: 'line', look: 'brandBold', sw2: alt, base: dark ? 'premium' : 'warm', ck: 'photo', hk: 'a44', hp: 'a44', sh: 'none' };
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
.a4-s,.a4-h{--a:${v.a};--on:${v.on};--bg:${v.bg};--alt:${v.alt};--ink:${v.ink};--mu:${v.mu};--pt:${v.pt};--lab:${v.lab};--ln:${v.ln};--hf:${v.hf};--r:${Math.min(v.r, 32)}px;font-family:${F.sans};word-break:keep-all;-webkit-font-smoothing:antialiased}
.a4-w{max-width:1200px;margin:0 auto;padding:0 40px;box-sizing:border-box}
.hpt.hp-s.a4-s{padding:140px 0;background:var(--bg);color:var(--ink);margin:0;border:0}
.a4-s *,.a4-h *{box-sizing:border-box}
.a4-s h2,.a4-s h3,.a4-h h1{margin:0;font-family:var(--hf);font-weight:${v.hw};color:inherit;overflow-wrap:anywhere}
.a4-s p,.a4-h p{margin:0}.a4-s ol,.a4-s ul,.a4-s dl,.a4-s dd,.a4-h ul{margin:0;padding:0;list-style:none}
.a4-ph{margin:0;overflow:hidden;position:relative;background:var(--alt)}.a4-ph img{display:block;width:100%;height:100%;object-fit:cover}
.a4-h h1 em,.a4-fin h2 em{font-style:normal;color:var(--lab)}
.a4-kick{font-size:15px;font-weight:600;color:var(--lab)}
.a4-lab{font-size:15px;font-weight:600;color:var(--lab);margin:0 0 18px!important}
.a4-lead{font-size:19px;line-height:1.78;color:var(--mu)}
.a4-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 28px;border-radius:${v.r === 0 ? 0 : 999}px;font-size:16px;font-weight:700;text-decoration:none;white-space:nowrap;font-family:${F.sans};transition:transform .15s}
.a4-b.p{background:var(--a);color:var(--on)}.a4-b.p:hover{transform:translateY(-1px)}
.a4-b.o{box-shadow:inset 0 0 0 1.5px currentColor;color:var(--ink)}
.a4-cta{display:flex;flex-wrap:wrap;gap:12px}.a4-ar{flex:none}
.a4-lk{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:16px;font-weight:600;color:var(--ink);text-decoration:none;border-bottom:1.5px solid currentColor;white-space:nowrap}
.a4-q{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}
.a4-q a{display:flex;align-items:center;gap:10px;min-height:84px;padding:0 28px;color:var(--ink);text-decoration:none;font-size:17px}
.a4-q a:first-child{padding-left:0}.a4-q a+a{border-left:1px solid var(--ln)}
.a4-q b{font-weight:700;white-space:nowrap}.a4-q span{flex:1;min-width:0;font-size:14px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a4-hint{padding:28px;border:1.5px dashed var(--ln);border-radius:12px;font-size:15px;color:var(--mu);text-align:center}
.a4-hd{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:60px}.a4-hd h2,.a4-band>.a4-w>h2,.a4-gal>.a4-w>h2{font-size:52px;line-height:1.18;letter-spacing:-.04em}
/* 2열 이야기 */
.a4-story .a4-w{display:grid;grid-template-columns:5fr 6fr;gap:96px;align-items:center}
.a4-sp{height:680px;border-radius:var(--r)}
.a4-story h2{font-size:52px;line-height:1.22;letter-spacing:-.04em;margin-bottom:26px}
.a4-pr{margin-top:48px!important}.a4-pr li{display:grid;grid-template-columns:72px minmax(0,1fr);padding:24px 0;border-top:1px solid var(--ln)}.a4-pr li:last-child{border-bottom:1px solid var(--ln)}
.a4-pr span{font-family:var(--hf);font-size:28px;font-weight:700;color:var(--pt)}.a4-pr b{display:block;font-size:20px;font-weight:700;margin-bottom:6px}.a4-pr p{font-size:16px;line-height:1.7;color:var(--mu)}
/* 단계 */
.a4-sp4{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid var(--ln)}.a4-sp4.n4{grid-template-columns:repeat(4,minmax(0,1fr))}.a4-sp4.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.a4-sp4 li{padding:36px 32px 8px 0}.a4-sp4 li+li{padding-left:32px;border-left:1px solid var(--ln)}
.a4-sn{display:block;font-family:var(--hf);font-size:44px;font-weight:700;color:var(--pt);line-height:1;margin-bottom:28px}.a4-sp4 b{display:block;font-size:21px;font-weight:700;margin-bottom:10px}.a4-sp4 p{font-size:16px;line-height:1.7;color:var(--mu)}
/* 큰 숫자 */
.a4-num{background:var(--a)!important;color:var(--on)!important}.a4-num .a4-w{display:grid;grid-template-columns:auto minmax(0,1fr);gap:88px;align-items:end}
.a4-big{font-family:var(--hf);font-weight:800;font-size:240px;line-height:.82;letter-spacing:-.06em;white-space:nowrap}.a4-big small{font-size:.36em;letter-spacing:-.02em;margin-left:.06em}
.a4-nt h2{font-size:36px;line-height:1.38;letter-spacing:-.035em}.a4-nt p{font-size:17px;line-height:1.75;margin-top:18px!important;opacity:.85}.a4-fine{font-size:13px!important;opacity:.75}
/* 반 카드 */
.a4-cds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}
.a4-cd>a{display:block;position:relative;color:inherit;text-decoration:none;border-radius:var(--r);overflow:hidden}
.a4-cp{display:block;height:400px;border-radius:var(--r)}.a4-c0{background:var(--alt)}
.a4-cg{display:block;font-size:13px;font-weight:600;color:var(--lab);margin-top:24px}.a4-cn{display:block;font-family:var(--hf);font-size:28px;font-weight:${v.hw};letter-spacing:-.04em;line-height:1.3;margin-top:8px}
.a4-cm{display:flex;justify-content:space-between;gap:12px;font-size:15px;padding-top:18px!important;margin-top:18px!important;border-top:1px solid var(--ln)}.a4-cm b{font-weight:700}.a4-cm span{color:var(--mu);text-align:right}
.a4-cdx{font-size:16px;line-height:1.7;color:var(--mu);margin-top:12px!important}
/* 격식 목록형 반 */
.a4-rl{border-top:2px solid var(--ink)}.a4-rl li{border-bottom:1px solid var(--ln)}
.a4-rl a{display:grid;grid-template-columns:72px minmax(0,1fr) auto 20px;gap:24px;align-items:center;min-height:104px;color:var(--ink);text-decoration:none}
.a4-ri{font-family:var(--hf);font-size:28px;color:var(--pt)}.a4-rn b{display:block;font-family:var(--hf);font-size:26px;font-weight:700;letter-spacing:-.03em}.a4-rn small,.a4-rp small{display:block;font-size:14px;color:var(--mu);margin-top:4px}.a4-rp{text-align:right;font-weight:700;font-size:17px}
/* 시간표 목록 */
.a4-tl2{border-top:2px solid var(--ink)}.a4-tl2 li{border-bottom:1px solid var(--ln)}
.a4-tl2 a{display:grid;grid-template-columns:150px 90px minmax(0,1fr) auto 20px;gap:24px;align-items:center;min-height:88px;color:var(--ink);text-decoration:none;font-size:17px}
.a4-td{font-weight:700;color:var(--lab)}.a4-tm{font-variant-numeric:tabular-nums;font-weight:600}.a4-tl2 b{font-size:20px;font-weight:700;letter-spacing:-.02em}.a4-tx{font-size:15px;color:var(--mu);text-align:right}
/* 큰 문장 */
.a4-stm .a4-sm{font-family:var(--hf);font-size:58px;line-height:1.3;font-weight:800;letter-spacing:-.05em;color:${mix(v.ink, v.bg, .62)}}.a4-stm .a4-sm b{color:var(--ink);font-weight:800}
/* 한 주 */
.a4-week .a4-w{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.a4-week h2{font-size:52px;line-height:1.18;letter-spacing:-.04em}.a4-week .a4-lead{margin-top:20px!important}
.a4-wp{height:640px;border-radius:var(--r)}
.a4-tl{margin-top:40px!important}.a4-tl li{display:grid;grid-template-columns:110px minmax(0,1fr);padding:22px 0;border-top:1px solid var(--ln)}.a4-tl li:last-child{border-bottom:1px solid var(--ln)}
.a4-tl span{font-size:15px;font-weight:700;color:var(--lab)}.a4-tl b{display:block;font-size:19px;font-weight:700}.a4-tl p{font-size:15px;line-height:1.6;color:var(--mu);margin-top:6px!important}
/* 사진 띠 */
.a4-bd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:72px;align-items:center;margin-top:100px}
.a4-bd.rev{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}.a4-bd.rev .a4-bp{order:2}
.a4-bp{height:540px;border-radius:var(--r)}
.a4-bi{display:flex;align-items:baseline;gap:14px;font-size:16px;font-weight:700;color:var(--mu)}.a4-bi span{color:var(--lab)}
.a4-bd h3{margin:14px 0 0;font-size:52px;line-height:1.08;letter-spacing:-.05em}
.a4-bx{font-size:18px;line-height:1.75;color:var(--mu);margin-top:22px!important}
.a4-bd dl{margin-top:30px!important;display:grid;grid-template-columns:auto minmax(0,1fr);border-top:2px solid var(--ink)}
.a4-bd dt,.a4-bd dd{padding:16px 0;border-bottom:1px solid var(--ln);font-size:16px}.a4-bd dt{font-weight:700;padding-right:36px}.a4-bd dd{color:var(--mu)}.a4-bd .a4-lk{margin-top:22px}
/* 갤러리 */
.a4-gl{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:300px 300px;gap:20px;margin-top:60px}
.a4-gl a{position:relative;display:block;border-radius:var(--r);overflow:hidden;color:var(--ink);text-decoration:none}.a4-gl .a4-ph{height:100%}
.a4-gl a:first-child{grid-row:span 2}.a4-gl.n4 a:last-child{grid-column:span 2}.a4-gl.n3{grid-template-columns:1.3fr 1fr}
.a4-gl em{position:absolute;left:18px;bottom:18px;font-style:normal;font-size:14px;font-weight:700;background:var(--bg);color:var(--ink);padding:9px 15px;border-radius:999px;max-width:calc(100% - 36px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 인용 */
.a4-quote{background:var(--alt)!important}.a4-quote .a4-w{display:grid;grid-template-columns:7fr 5fr;gap:96px;align-items:center}.a4-quote .a4-qp{order:2;height:540px;border-radius:var(--r)}
.a4-quote blockquote{margin:0;font-family:var(--hf);font-weight:700;font-size:42px;line-height:1.48;letter-spacing:-.04em}
.a4-quote blockquote::before{content:"\\201C";display:block;font-size:110px;line-height:.6;color:var(--pt);margin-bottom:22px}
.a4-cite{font-size:16px;color:var(--mu);margin-top:34px!important}
/* 소식 */
.a4-nl{border-top:2px solid var(--ink)}.a4-nl li{border-bottom:1px solid var(--ln)}
.a4-nl a{display:grid;grid-template-columns:160px minmax(0,1fr) 20px;gap:24px;align-items:center;min-height:80px;color:var(--ink);text-decoration:none}.a4-nl time{font-size:15px;color:var(--mu);font-variant-numeric:tabular-nums}.a4-nl b{font-size:19px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 마지막 */
.a4-fg{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:64px;align-items:end}
.a4-fin h2{font-size:80px;line-height:1.1;letter-spacing:-.05em}.a4-fin .a4-cta{margin-top:30px}
.a4-info{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:100px!important;border-top:1px solid var(--ln)}
.a4-info div{padding:30px 32px 0 0}.a4-info div+div{padding-left:32px;border-left:1px solid var(--ln)}
.a4-info dt{font-size:13px;color:var(--mu);margin-bottom:10px}.a4-info dd{font-size:17px;font-weight:600;line-height:1.65}
@media(max-width:1000px){.a4-story .a4-w,.a4-week .a4-w,.a4-fg,.a4-quote .a4-w{grid-template-columns:minmax(0,1fr);gap:44px}.a4-sp,.a4-wp{height:460px}.a4-quote .a4-qp{order:-1;height:400px}.a4-cds{grid-template-columns:minmax(0,1fr)}.a4-num .a4-w{grid-template-columns:minmax(0,1fr);gap:36px}
.a4-bd,.a4-bd.rev{grid-template-columns:minmax(0,1fr);gap:28px;margin-top:64px}.a4-bd.rev .a4-bp{order:0}.a4-sp4,.a4-sp4.n4{grid-template-columns:repeat(2,minmax(0,1fr))}.a4-sp4 li:nth-child(3){padding-left:0;border-left:0}}
@media(max-width:760px){.a4-w{padding:0 20px}.hpt.hp-s.a4-s{padding:84px 0}
.a4-lead{font-size:17px}.a4-b{width:100%}.a4-cta{flex-direction:column}
.a4-q{grid-template-columns:minmax(0,1fr)}.a4-q a,.a4-q a:first-child{padding:0;min-height:62px}.a4-q a+a{border-left:0;border-top:1px solid var(--ln)}.a4-q span{display:none}.a4-q b{flex:1}
.a4-hd{display:block;margin-bottom:34px}.a4-hd .a4-lk{margin-top:12px}.a4-hd h2,.a4-band>.a4-w>h2,.a4-gal>.a4-w>h2,.a4-story h2,.a4-week h2{font-size:32px;margin-bottom:16px}
.a4-sp,.a4-wp{height:340px}.a4-pr{margin-top:30px!important}.a4-pr li{grid-template-columns:48px minmax(0,1fr);padding:20px 0}.a4-pr span{font-size:22px}.a4-pr b{font-size:18px}
.a4-sp4,.a4-sp4.n4,.a4-sp4.n2{grid-template-columns:minmax(0,1fr)}.a4-sp4 li,.a4-sp4 li+li{padding:26px 0;border-left:0}.a4-sp4 li+li{border-top:1px solid var(--ln)}.a4-sn{font-size:34px;margin-bottom:16px}
.a4-big{font-size:132px}.a4-nt h2{font-size:26px}.a4-cp{height:280px}.a4-cn{font-size:24px}
.a4-rl a{grid-template-columns:40px minmax(0,1fr) 18px;gap:14px;padding:18px 0}.a4-rp{grid-column:2;text-align:left;font-size:15px}.a4-rl .a4-ar{grid-row:1;grid-column:3}.a4-ri{font-size:22px}.a4-rn b{font-size:21px}
.a4-tl2 a{grid-template-columns:minmax(0,1fr) 18px;gap:4px 12px;padding:18px 0;min-height:0}.a4-tl2 a>*{grid-column:1}.a4-tl2 .a4-ar{grid-column:2;grid-row:1/span 4}.a4-tx{text-align:left}.a4-td,.a4-tm{display:inline}
.a4-stm .a4-sm{font-size:31px;line-height:1.4}.a4-tl li{grid-template-columns:80px minmax(0,1fr)}
.a4-bp{height:300px}.a4-bd h3{font-size:36px}.a4-bx{font-size:16px}
.a4-gl{grid-template-columns:1fr 1fr!important;grid-template-rows:240px 170px 170px;gap:12px;margin-top:34px}.a4-gl a:first-child{grid-row:auto;grid-column:span 2}.a4-gl.n3{grid-template-rows:240px 180px}
.a4-quote .a4-qp{height:300px}.a4-quote blockquote{font-size:27px}.a4-quote blockquote::before{font-size:76px;margin-bottom:10px}
.a4-nl a{grid-template-columns:minmax(0,1fr) 18px;gap:4px 12px;padding:16px 0}.a4-nl time{grid-column:1}.a4-nl b{grid-column:1;white-space:normal}.a4-nl .a4-ar{grid-column:2;grid-row:1/span 2}
.a4-fin h2{font-size:40px}.a4-info{grid-template-columns:minmax(0,1fr);margin-top:52px!important}.a4-info div,.a4-info div+div{padding:20px 0;border-left:0}.a4-info div+div{border-top:1px solid var(--ln)}}
/* 과정 · 패키지 카드 */
.a4-pkg{background:var(--alt)!important}
.a4-pk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.a4-pk.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.a4-pk.n1{grid-template-columns:minmax(0,560px)}
.a4-pc{display:flex;flex-direction:column;gap:10px;min-height:380px;padding:40px 36px 32px;border-radius:var(--r);background:var(--bg);border:1px solid var(--ln);color:var(--ink);text-decoration:none;transition:transform .15s}
.a4-pc:hover{transform:translateY(-3px)}
.a4-pn{font-size:14px;font-weight:600;color:var(--lab)}.a4-pc b{font-family:var(--hf);font-size:28px;line-height:1.3;letter-spacing:-.035em}
.a4-pp{margin-top:auto;padding-top:28px;font-size:42px;font-weight:800;letter-spacing:-.04em;line-height:1.1}
.a4-pw{font-size:15px;color:var(--mu)}
.a4-pl{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:16px;padding-top:18px;border-top:1px solid var(--ln);font-size:15px;font-weight:700}
@media(max-width:1000px){.a4-pk,.a4-pk.n2{grid-template-columns:minmax(0,1fr)}.a4-pc{min-height:0}}
@media(max-width:760px){.a4-pc{padding:28px 24px 24px}.a4-pc b{font-size:23px}.a4-pp{font-size:32px;padding-top:18px}}
@media(prefers-reduced-motion:reduce){.a4-b{transition:none}}`;

  const H1 = (cls, pc, m, lh, extra) => `.hpt.hp-hero.a4-h.${cls} h1{font-size:${pc}px!important;line-height:${lh}!important;letter-spacing:-.045em!important;${extra || ''}}@media(max-width:760px){.hpt.hp-hero.a4-h.${cls} h1{font-size:${m}px!important}}`;
  const HB = (cls, pad, padm) => `.hpt.hp-hero.a4-h.${cls}{padding:${pad};background:var(--bg);color:var(--ink);margin:0}@media(max-width:760px){.hpt.hp-hero.a4-h.${cls}{padding:${padm}}}`;
  const XCSS = {
    adtalk: v => `${HB('a4-talk', '64px 0 0', '28px 0 0')}${H1('a4-talk', 84, 42, 1.12)}
.a4-tg{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:80px;align-items:center;padding-bottom:84px}
.a4-talk .a4-kick{display:flex;align-items:center;gap:12px;margin-bottom:24px!important}.a4-talk .a4-kick::before{content:"";flex:none;width:10px;height:10px;border-radius:50%;background:var(--pt)}
.a4-talk .a4-sub{font-size:20px;line-height:1.7;color:var(--mu);margin:28px 0 40px!important;max-width:520px}
.a4-tp{position:relative}.a4-talk .a4-hi{height:680px;border-radius:28px}
.a4-bb{position:absolute;z-index:2;font-size:18px;font-weight:700;line-height:1.3;padding:16px 22px;border-radius:24px;box-shadow:0 18px 40px rgba(14,22,48,.18);white-space:nowrap;font-family:${F.seed}}
.a4-bb1{left:-56px;top:88px;background:#fff;color:var(--ink);border-bottom-left-radius:6px}
.a4-bb2{right:-28px;bottom:112px;background:var(--a);color:var(--on);border-bottom-right-radius:6px}
.a4-stm .a4-sm b{color:var(--a)}
.a4-cls .a4-cp{border-radius:22px}
.a4-week{background:var(--alt)!important}
.a4-quote{background:var(--a)!important;color:#fff!important;--mu:rgba(255,255,255,.78);--pt:#FFB4A3}.a4-quote blockquote{font-family:${F.seed}}
@media(max-width:1000px){.a4-tg{grid-template-columns:minmax(0,1fr);gap:36px;padding-bottom:40px}.a4-talk .a4-hi{height:460px}.a4-bb1{left:16px}.a4-bb2{right:16px}}
@media(max-width:760px){.a4-talk .a4-hi{height:340px;border-radius:20px}.a4-talk .a4-sub{font-size:17px;margin:18px 0 26px!important}.a4-bb{font-size:15px;padding:11px 15px}.a4-bb1{top:18px;left:12px}.a4-bb2{bottom:18px;right:12px}}`,
    adexam: v => `${HB('a4-cert', '56px 0 0', '24px 0 0')}${H1('a4-cert', 72, 36, 1.24, 'letter-spacing:-.02em!important;')}
.a4-cert{border-top:6px solid var(--a)}
.a4-cfg{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:56px;align-items:stretch;padding-bottom:72px}
.a4-frm{position:relative;text-align:center;padding:60px 56px 56px;border:1px solid var(--pt);outline:1px solid var(--pt);outline-offset:-12px;background:#fff}
.a4-cr{color:var(--a);margin-bottom:18px}
.a4-cert .a4-kick{letter-spacing:.22em;font-size:14px;color:${fit(v.pt, '#ffffff', 4.6)};margin-bottom:20px!important}
.a4-cert h1 em{color:var(--a)!important}
.a4-rule{display:flex;align-items:center;justify-content:center;gap:16px;margin:28px auto!important;max-width:320px;color:var(--pt)}.a4-rule i{flex:1;height:1px;background:var(--pt)}.a4-rule b{font-size:13px}
.a4-cert .a4-sub{font-size:18px;line-height:1.8;color:var(--mu);max-width:540px;margin:0 auto!important}.a4-cert .a4-cta{justify-content:center;margin-top:34px}
.a4-h .a4-b,.a4-s .a4-b{border-radius:2px}
.a4-cert .a4-hi{height:100%;min-height:600px;border-radius:300px 300px 0 0;outline:1px solid var(--pt);outline-offset:10px}
.a4-cert .a4-q{border-top:2px solid var(--a)}
.a4-steps .a4-sn{font-size:52px}.a4-steps .a4-hd{margin-bottom:48px}
.a4-num .a4-big{color:var(--pt)}
.a4-notice{background:var(--alt)!important}
.a4-fin{border-top:1px solid var(--ln)}.a4-fin .a4-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.a4-fin .a4-cta{justify-content:center}.a4-fin .a4-lead{max-width:640px;margin:0 auto}.a4-info{text-align:left}
@media(max-width:1000px){.a4-cfg{grid-template-columns:minmax(0,1fr)}.a4-cert .a4-hi{order:-1;min-height:0;height:360px;width:100%;max-width:560px;margin:10px auto 0;border-radius:280px 280px 0 0}}
@media(max-width:760px){.a4-cfg{gap:32px;padding-bottom:40px}.a4-frm{padding:36px 20px 32px;outline-offset:-8px}.a4-cr svg{width:46px;height:56px}.a4-cert .a4-kick{letter-spacing:.12em}.a4-cert .a4-sub{font-size:16px}.a4-cert .a4-hi{order:0;height:220px;border-radius:160px 160px 0 0;outline-offset:6px}.a4-rule{margin:20px auto!important}.a4-fin .a4-fg{text-align:left;justify-items:stretch}}`,
    adcoach: v => `${HB('a4-sig', '52px 0 0', '24px 0 0')}${H1('a4-sig', 96, 40, 1.08, 'letter-spacing:-.055em!important;max-width:1120px;')}
.a4-sgt{display:flex;align-items:center;gap:16px;margin-bottom:30px}.a4-av{flex:none;display:grid;place-items:center;width:60px;height:60px;border-radius:50%;background:var(--a);color:var(--on);font-size:24px;font-weight:800;box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--pt)}
.a4-sig .a4-kick{font-size:17px;color:var(--ink);font-weight:600}
.a4-sig h1 em{color:var(--a)!important;background:linear-gradient(transparent 72%,${mix(v.pt, v.bg, .55)} 72%);padding:0 .04em}
.a4-sgb{display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);gap:72px;align-items:start;margin-top:44px;padding-bottom:84px;border-top:1px solid var(--ln);padding-top:40px}
.a4-sig .a4-sub{font-size:20px;line-height:1.72;color:var(--mu);margin-bottom:36px!important}
.a4-sig .a4-hi{height:440px;border-radius:24px}
.a4-story .a4-sp{border-radius:200px 200px 24px 24px}
.a4-steps{background:var(--alt)!important}.a4-steps .a4-sn{color:var(--a)}
.a4-pkg .a4-pc{background:#fff}
.a4-quote{background:var(--a)!important;color:#fff!important;--mu:rgba(255,255,255,.78)}
.a4-fin .a4-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.a4-fin .a4-cta{justify-content:center}.a4-fin .a4-lead{max-width:640px;margin:0 auto}.a4-info{text-align:left}
@media(max-width:1000px){.a4-sgb{grid-template-columns:minmax(0,1fr);gap:36px;padding-bottom:44px}.a4-sig .a4-hi{height:420px}}
@media(max-width:760px){.a4-sgt{margin-bottom:20px}.a4-av{width:48px;height:48px;font-size:20px}.a4-sig .a4-kick{font-size:15px}.a4-sgb{margin-top:24px;gap:28px}.a4-sig .a4-sub{font-size:17px;margin-bottom:26px!important}.a4-sig .a4-hi{height:300px;border-radius:18px}.a4-fin .a4-fg{text-align:left;justify-items:stretch}}`,
    advocal: v => `.hpt.hp-hero.a4-h.a4-stage{padding:0;background:var(--bg);color:var(--ink);margin:0}${H1('a4-stage', 104, 44, 1.0, 'color:#fff!important;letter-spacing:-.06em!important;')}
.a4-stage>.a4-hi{height:470px}
.a4-sb{position:relative;z-index:2;max-width:1280px;margin:-130px auto 0;background:#121014;color:#fff;padding:52px 0 52px}
.a4-stage .a4-kick{display:flex;align-items:center;gap:12px;color:#fff;margin-bottom:22px!important}.a4-stage .a4-kick::before{content:"";flex:none;width:28px;height:3px;background:var(--pt)}
.a4-stage h1 em{color:var(--pt)!important}
.a4-sbr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:40px;align-items:end;margin-top:30px}
.a4-stage .a4-sub{font-size:20px;line-height:1.65;color:rgba(255,255,255,.78);max-width:560px}
.a4-stage .a4-b.p{background:var(--pt);color:${onC(v.pt)}}.a4-stage .a4-b.o{color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5)}
.a4-h .a4-b,.a4-s .a4-b{border-radius:0}
.a4-stage .a4-q{border-top:0}
.a4-num{background:#121014!important;color:#fff!important}.a4-num .a4-big{font-family:${F.sans};color:var(--pt);font-size:300px}
.a4-bp,.a4-gl a,.a4-wp{border-radius:0!important}.a4-bi span{color:var(--a)}
.a4-week{background:var(--alt)!important}
.a4-gl em{border-radius:0}
.a4-fin{background:#121014!important;color:#fff!important;--mu:#B4AEB2;--ln:#2E2A2D}.a4-fin h2 em{color:var(--pt)!important}.a4-fin .a4-b.p{background:var(--pt);color:${onC(v.pt)}}.a4-fin .a4-b.o{color:#fff}
@media(max-width:760px){.a4-stage>.a4-hi{height:300px}.a4-sb{margin-top:-48px;padding:34px 0 36px}.a4-sbr{grid-template-columns:minmax(0,1fr);gap:22px;margin-top:18px}.a4-stage .a4-sub{font-size:17px}.a4-num .a4-big{font-size:150px}}`,
    adphoto: v => `${HB('a4-film', '60px 0 0', '28px 0 0')}${H1('a4-film', 104, 44, 1.02, 'letter-spacing:-.06em!important;')}
.a4-fh{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.6fr);gap:56px;align-items:end;padding-bottom:52px}
.a4-film .a4-kick{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--ink);letter-spacing:.06em;margin-bottom:22px!important}
.a4-rec{flex:none;width:12px;height:12px;border-radius:50%;background:var(--pt);box-shadow:0 0 0 5px ${mix(v.pt, v.bg, .8)}}
.a4-film h1 em{color:${fit(v.pt, v.bg, 3.1)}!important}
.a4-film .a4-sub{font-size:18px;line-height:1.72;color:var(--mu);margin-bottom:28px!important}
.a4-film .a4-cta{flex-direction:column;align-items:stretch}.a4-h .a4-b,.a4-s .a4-b{border-radius:2px}
.a4-strip{position:relative;background:#111;padding:40px 0}
.a4-strip::before,.a4-strip::after{content:"";position:absolute;left:0;right:0;height:12px;background:repeating-linear-gradient(90deg,transparent 0 18px,${v.bg} 18px 34px)}.a4-strip::before{top:14px}.a4-strip::after{bottom:14px}
.a4-sw{max-width:1440px;margin:0 auto;padding:0 40px;display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:14px;counter-reset:fr;box-sizing:border-box}
.a4-sw .a4-ph{height:380px;border-radius:2px;counter-increment:fr;background:#222}
.a4-sw .a4-ph::after{content:counter(fr,decimal-leading-zero) "A";position:absolute;left:12px;bottom:10px;font:700 13px/1 ${F.mono};color:#FFD54A;letter-spacing:.08em}
.a4-film .a4-q{border-top:0}
.a4-gal{background:#111!important;color:#fff!important;--ln:#2A2A2A;--mu:#A9A7A2;--lab:${fit(v.pt, '#111111', 4.6, '#ffffff')}}.a4-gl a{border-radius:2px!important}.a4-gl em{background:#111;color:#fff;border-radius:2px}
.a4-cls .a4-cp{border-radius:2px}
.a4-num{background:var(--pt)!important;color:#fff!important}.a4-num .a4-big{font-family:${F.sans};font-size:280px}
.a4-quote{background:var(--bg)!important}.a4-quote .a4-qp{border-radius:2px}.a4-quote blockquote{font-family:${F.sans}}
.a4-fin{background:#111!important;color:#fff!important;--mu:#A9A7A2;--ln:#2A2A2A}.a4-fin h2 em{color:${fit(v.pt, '#111111', 4.6, '#ffffff')}!important}.a4-fin .a4-b.o{color:#fff}
@media(max-width:1000px){.a4-fh{grid-template-columns:minmax(0,1fr);gap:28px}.a4-film .a4-cta{flex-direction:row}}
@media(max-width:760px){.a4-fh{padding-bottom:32px;gap:18px}.a4-film .a4-sub{font-size:16px;margin-bottom:22px!important}.a4-film .a4-cta{flex-direction:column}
.a4-strip{padding:30px 0}.a4-strip::before{top:9px}.a4-strip::after{bottom:9px}.a4-sw{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 20px;gap:10px;scrollbar-width:none}.a4-sw .a4-ph{flex:0 0 80%;height:250px;scroll-snap-align:start}.a4-num .a4-big{font-size:140px}}`,
    admoney: v => `${HB('a4-news', '40px 0 0', '20px 0 0')}${H1('a4-news', 100, 42, 1.04, 'letter-spacing:-.06em!important;')}
.a4-mast{display:flex;justify-content:space-between;gap:20px;border-top:3px solid var(--ink);border-bottom:1px solid var(--ink);padding:14px 0;font-size:14px;font-weight:700;letter-spacing:.08em;margin-bottom:44px}
.a4-mast span+span{color:var(--mu);font-weight:600;letter-spacing:.02em}
.a4-news h1 em{color:var(--lab)!important}
.a4-ncol{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.45fr) minmax(0,.9fr);margin-top:44px;border-top:1px solid var(--ink);padding:34px 0 72px}
.a4-ncol>*{padding:0 32px}.a4-ncol>*:first-child{padding-left:0}.a4-ncol>*:last-child{padding-right:0}.a4-ncol>*+*{border-left:1px solid var(--ln)}
.a4-news .a4-sub{font-size:19px;line-height:1.78;color:var(--ink)}.a4-news .a4-sub::first-letter{float:left;font-size:3.2em;line-height:.92;font-weight:900;margin:6px 10px 0 0;color:var(--lab)}
.a4-news .a4-hi{height:380px}
.a4-nct{display:flex;flex-direction:column;justify-content:space-between;gap:28px}.a4-nct .a4-cta{flex-direction:column;align-items:stretch}
.a4-nnote{font-size:15px;line-height:1.7;color:var(--mu);border-top:1px solid var(--ln);padding-top:18px}
.a4-h .a4-b,.a4-s .a4-b{border-radius:0}
.a4-news .a4-q{border-top:3px solid var(--ink)}
.a4-stm{border-top:1px solid var(--ln)}.a4-stm .a4-sm b{color:var(--lab)}
.a4-steps{background:var(--alt)!important}.a4-sn{color:var(--a)}
.a4-pkg .a4-pc{border-radius:0;border:0;border-top:3px solid var(--ink);background:var(--bg);padding-left:0;padding-right:0}
.a4-quote{background:var(--ink)!important;color:#fff!important;--mu:rgba(255,255,255,.7);--pt:#7FD6A8}.a4-quote .a4-qp{border-radius:0}
.a4-fin{background:var(--a)!important;color:#fff!important;--mu:rgba(255,255,255,.82);--ln:rgba(255,255,255,.25)}.a4-fin h2 em{color:#C9F2D9!important}.a4-fin .a4-b.p{background:#fff;color:var(--a)}.a4-fin .a4-b.o{color:#fff}
@media(max-width:1000px){.a4-ncol{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.a4-nph{grid-column:1/-1;order:-1;padding:0!important;border:0!important;margin-bottom:28px}.a4-ncol>.a4-sub{padding-left:0;border-left:0}}
@media(max-width:760px){.a4-mast{margin-bottom:26px}.a4-mast span+span{display:none}.a4-ncol{grid-template-columns:minmax(0,1fr);margin-top:28px;padding:24px 0 40px}.a4-ncol>*{padding:0!important;border-left:0!important}.a4-ncol>*+*{margin-top:24px}.a4-nph{margin-bottom:0;order:3}.a4-nct{order:2}.a4-news .a4-hi{height:260px}.a4-news .a4-sub{font-size:17px}}`,
    adit: v => `.hpt.hp-hero.a4-h.a4-cine{position:relative;height:880px;padding:0;overflow:hidden;background:var(--bg);color:#fff;margin:0}${H1('a4-cine', 104, 42, 1.06, 'color:#fff!important;letter-spacing:-.055em!important;max-width:1060px;')}
.a4-cine>.a4-hi{position:absolute;inset:0;height:100%;background:#000}
.a4-cine::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,9,10,.9) 0%,rgba(6,9,10,.55) 46%,rgba(6,9,10,.12) 80%),linear-gradient(0deg,rgba(6,9,10,.92) 0%,rgba(6,9,10,0) 36%),linear-gradient(180deg,rgba(6,9,10,.55) 0%,rgba(6,9,10,0) 22%);pointer-events:none}
.a4-hc{position:absolute;z-index:2;left:0;right:0;bottom:150px}.a4-cine .a4-kick{margin-bottom:24px!important}
.a4-cine .a4-sub{font-size:21px;line-height:1.65;color:rgba(255,255,255,.8);margin:28px 0 40px!important;max-width:580px}.a4-cine .a4-b.o{color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}
.a4-qb{position:absolute;z-index:2;left:0;right:0;bottom:0;border-top:1px solid rgba(255,255,255,.16)}.a4-cine .a4-q{border:0}.a4-cine .a4-q a{color:#fff;min-height:88px}.a4-cine .a4-q span{color:rgba(255,255,255,.62)}
.a4-stm{padding-bottom:0!important}
.a4-cls .a4-cd>a::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.82) 0%,rgba(0,0,0,0) 58%);pointer-events:none}
.a4-cls .a4-cp{height:520px}.a4-cls .a4-co{position:absolute;z-index:2;left:28px;right:28px;bottom:28px;color:#fff}.a4-cls .a4-cg{margin:0;color:rgba(255,255,255,.8)}.a4-cls .a4-cn{color:#fff;font-size:30px}.a4-cls .a4-cm{border-top:0;margin-top:0!important;padding:18px 4px 0!important}
.a4-week{background:#EEF2EF!important;color:#121615!important;--ink:#121615;--mu:#525B57;--ln:#D3DAD6;--lab:${fit(mix(v.a, '#000000', .45), '#EEF2EF', 4.6)}}
.a4-num{background:var(--bg)!important;color:var(--ink)!important}.a4-num .a4-big{font-family:${F.sans}}.a4-num .a4-big small{color:var(--a)}
.a4-quote{position:relative;padding:0!important;min-height:720px;overflow:hidden;display:flex;align-items:center;background:var(--bg)!important}.a4-quote .a4-qp{position:absolute;inset:0;height:100%;order:0}
.a4-quote::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,9,10,.05) 10%,rgba(6,9,10,.9) 62%);pointer-events:none}
.a4-quote .a4-w{position:static;width:100%;display:flex;justify-content:flex-end;padding-top:120px;padding-bottom:120px}.a4-qt{position:relative;z-index:2;max-width:620px}.a4-quote blockquote{font-family:${F.sans};font-size:44px;color:#fff}.a4-quote blockquote::before{display:none}.a4-quote .a4-cite{color:rgba(255,255,255,.7)}
.a4-fin .a4-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.a4-fin .a4-cta{justify-content:center}.a4-fin .a4-lead{max-width:640px;margin:20px auto 0}.a4-fin .a4-b.o{color:#fff}.a4-info{text-align:left}
@media(max-width:760px){.hpt.hp-hero.a4-h.a4-cine{height:auto}.a4-cine::after{background:linear-gradient(0deg,rgba(6,9,10,.97) 0%,rgba(6,9,10,.7) 48%,rgba(6,9,10,.2) 100%)}
.a4-hc{position:relative;bottom:auto;padding:300px 0 34px}.a4-cine .a4-sub{font-size:17px;margin:18px 0 26px!important}.a4-qb{position:relative}.a4-cine .a4-q a{min-height:62px}.a4-cls .a4-cp{height:420px}
.a4-quote{min-height:0;display:block}.a4-quote::after{background:linear-gradient(0deg,rgba(6,9,10,.94) 35%,rgba(6,9,10,.3))}.a4-quote .a4-w{padding-top:250px;padding-bottom:60px}.a4-quote blockquote{font-size:27px}.a4-fin .a4-fg{text-align:left;justify-items:stretch}}`,
    adcraft: v => `${HB('a4-collage', '24px 0 0', '10px 0 0')}${H1('a4-collage', 132, 48, .98, 'letter-spacing:-.065em!important;')}
.a4-pg{display:grid;grid-template-columns:1.05fr 1fr;gap:40px;align-items:center;padding-bottom:90px}
.a4-collage .a4-sub{font-size:20px;line-height:1.65;color:var(--mu);margin:34px 0 38px!important;max-width:500px}
.a4-col{position:relative;height:690px}.a4-col .a4-ph{position:absolute}
.a4-s1{left:0;top:40px;width:330px;height:470px;border-radius:165px 165px 18px 18px}.a4-s2{right:0;top:0;width:290px;height:290px;border-radius:50%}.a4-s3{right:10px;bottom:0;width:340px;height:360px;border-radius:18px}
.a4-dot{position:absolute;z-index:2;left:300px;top:6px;width:96px;height:96px;border-radius:50%;background:var(--pt)}
.a4-collage .a4-q{border-top:2px solid var(--ink);border-bottom:0}
.a4-num .a4-big{font-family:${F.sans};font-size:320px}.a4-nt h2{font-size:44px}
.a4-quote{background:var(--bg)!important;padding-top:0!important}.a4-quote .a4-w{grid-template-columns:auto minmax(0,1fr)}.a4-quote .a4-qp{order:0;width:420px;height:420px;border-radius:50%}.a4-quote blockquote{font-family:${F.sans};font-size:44px;letter-spacing:-.055em}.a4-quote blockquote::before{display:none}
.a4-fin{background:var(--ink)!important;color:var(--bg)!important;--mu:#B5B0A8;--ln:#2E2E2E}.a4-fin h2 em{color:var(--pt)!important}.a4-fin .a4-b.o{color:#fff}
@media(max-width:1000px){.a4-pg{grid-template-columns:minmax(0,1fr)}.a4-col{order:-1;max-width:640px}}
@media(max-width:760px){.a4-pg{gap:24px;padding-bottom:44px}.a4-col{height:290px}.a4-s1{width:140px;height:210px;top:24px;border-radius:70px 70px 12px 12px}.a4-s2{width:130px;height:130px}.a4-s3{width:150px;height:150px;right:0}.a4-dot{left:118px;top:0;width:44px;height:44px}
.a4-collage .a4-sub{font-size:17px;margin:20px 0 26px!important}.a4-num .a4-big{font-size:150px}.a4-nt h2{font-size:28px}.a4-quote .a4-w{grid-template-columns:minmax(0,1fr)}.a4-quote .a4-qp{width:240px;height:240px}.a4-quote blockquote{font-size:28px}}`,
    admove: v => `.hpt.hp-hero.a4-h.a4-half{display:grid;grid-template-columns:1fr 1fr;min-height:860px;padding:0;background:var(--bg);color:var(--ink);margin:0}${H1('a4-half', 76, 40, 1.18, 'letter-spacing:-.035em!important;')}
.a4-hl{position:relative;min-height:100%}.a4-hl .a4-hi{position:absolute;inset:0;height:100%}
.a4-hr{display:flex;align-items:center;padding:80px 80px 60px}.a4-hri{max-width:540px}
.a4-half .a4-kick{font-size:15px;font-weight:600;letter-spacing:.14em;color:var(--lab);margin-bottom:28px!important}
.hpt.hp-hero.a4-h.a4-half h1{font-weight:300!important;letter-spacing:-.04em!important}.a4-half h1 em{font-weight:700;color:var(--a)!important}
.a4-s h2,.a4-s h3{font-weight:400}.a4-pr span{font-weight:300}
.a4-half .a4-sub{font-size:19px;line-height:1.8;color:var(--mu);margin:28px 0 40px!important}
.a4-half .a4-q{grid-template-columns:minmax(0,1fr);margin-top:56px;border-bottom:0}.a4-half .a4-q a,.a4-half .a4-q a:first-child{padding:0;min-height:60px;border-left:0}.a4-half .a4-q a+a{border-top:1px solid var(--ln)}
.a4-story{background:var(--alt)!important}
.a4-tt{background:var(--alt)!important}
.a4-quote{background:var(--a)!important;color:#fff!important;--mu:rgba(255,255,255,.75);--pt:${v.pt}}.a4-quote .a4-qp{border-radius:4px}
@media(max-width:1000px){.hpt.hp-hero.a4-h.a4-half{grid-template-columns:minmax(0,1fr);min-height:0}.a4-hl{height:460px}.a4-hr{padding:48px 40px 40px}}
@media(max-width:760px){.a4-hl{height:230px}.a4-hr{padding:32px 20px 20px}.a4-half .a4-sub{font-size:17px;margin:18px 0 26px!important}.a4-half .a4-q{margin-top:32px}}`,
    adcook: v => `${HB('a4-center', '56px 0 0', '36px 0 0')}${H1('a4-center', 88, 40, 1.15)}
.a4-center{text-align:center}.a4-center .a4-sub{font-size:20px;line-height:1.7;color:var(--mu);max-width:740px;margin:26px auto 0!important}.a4-center h1{margin-top:20px!important}
.a4-center .a4-cta{justify-content:center;margin-top:36px}.a4-center .a4-hi{height:660px;margin:64px -80px 0;border-radius:6px}.a4-center .a4-q{margin-top:52px;text-align:left}
.a4-cls .a4-cn{font-size:30px}.a4-fin .a4-fg{grid-template-columns:minmax(0,1fr);text-align:center;justify-items:center}.a4-fin .a4-cta{justify-content:center}.a4-fin .a4-lead{max-width:640px;margin:0 auto}.a4-info{text-align:left}
@media(max-width:1000px){.a4-center .a4-hi{margin:52px 0 0}}
@media(max-width:760px){.a4-center{text-align:left}.a4-center .a4-sub{font-size:17px;margin-top:16px!important}.a4-center .a4-cta{margin-top:26px}.a4-center .a4-hi{height:400px;margin:36px -20px 0;border-radius:0}.a4-center .a4-q{margin-top:26px}.a4-fin .a4-fg{text-align:left;justify-items:stretch}}`
  };
  function cssX(s, th, T) { try { const v = vars(s, th, T || {}); return cssBase(v) + (XCSS[s.theme] ? XCSS[s.theme](v) : ''); } catch (e) { console.error('hp44-adult css', e); return ''; } }

  /* ── 등록 ── */
  IDS.forEach(id => { const d = Object.assign({ prem: 1, cssX }, DEF[id]); if (!d.hb) delete d.hb; HPT.reg(id, d); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hp44-adult HPD', e); } });
  const mine = s => { try { return !!(s && s.theme && IDS.includes(s.theme)); } catch (e) { return false; } };
  if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, t2) => DEF[id] ? DEF[id].tags.includes(t2 || (S && S.org && S.org.type)) : f0(id, t2); }
  if (window.HPS && typeof HPS.hero === 'function') { const h0 = HPS.hero; HPS.hero = (kind, s, d, th, T) => { try { if (mine(s) && (!d || !d.hk)) return HERO[s.theme](s, d || {}); } catch (e) { console.error('hp44-adult hero', e); } return h0(kind, s, d, th, T); }; }
  { const base = proSec; proSec = (x, i, s, lk) => { const d = x && x.data; const r = d && x.type === 'text' && SECR[d.hpt];
    if (!r || !s || !mine(s)) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    let h = null; try { h = r(d, s); } catch (e) { console.error('hp44-adult', d.hpt, e); h = null; }
    if (h == null) return base(x, i, s, lk); if (!h) return '';
    const m = editing() ? HPE.map.get(x) : null; if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; window.proSec = proSec; }
  { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!IDS.includes(id) || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(x => x.id === 't44-' + id); if (tp && typeof tp.build === 'function') { b.sections = tp.build(); setPhotos(b, id); }
      return siteHTML(b, false, 'ko'); } catch (e) { console.error('hp44-adult thumb', e); return tb(s, id); } }; }

  /* ── 템플릿(기본 섹션 · 문구 — 운영자가 편집) ── */
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const TX = (variant, data) => S2('text', { variant, ...data });
  const AUTO = [['자동', '공개 강좌 정보로 자동으로 채워요']];
  /* HPT.enrich가 숫자 띠 · 강사진 · FAQ를 끼워 넣지 않게 숨긴 자리를 미리 둔다(운영자가 편집기에서 켜면 보인다) */
  const KEEP = () => [['facts', 'stats', { title: '' }], ['people', 'profiles', { eyebrow: '강사', title: '함께하는 강사' }], ['faq', 'info', { eyebrow: 'FAQ', title: '자주 묻는 질문' }]].map(([h, v, x]) => { const o = TX(v, Object.assign({ hpt: h, cols: [] }, x)); o.hide = true; return o; });
  /* 사진(같은 유형 안에서 첫 화면 사진 중복 없음) */
  const PH = {
    adtalk: { hero: 'hum-10', wk: 'lan-01', quote: 'hum-37' }, adexam: { hero: 'hum-05', about: 'hum-14' }, adit: { hero: 'hum-41', wk: 'grp-06', quote: 'hum-42' },
    adcraft: { hero: 'hum-23', h2: 'kni-02', h3: 'wrk-06', quote: 'hum-21' }, admove: { hero: 'yog-03', about: 'yog-01', quote: 'yog-02' }, adcook: { hero: 'bak-02', about: 'coo-02', quote: 'bar-01' },
    adcoach: { hero: 'hum-04', about: 'hum-36', quote: 'hum-06' }, advocal: { hero: 'hum-31', wk: 'hum-30' }, adphoto: { hero: 'pho-01', h2: 'vid-01', h3: 'pho-02', quote: 'sen-02' },
    admoney: { hero: 'dat-01', quote: 'cor-06' }
  };
  const HEAD = { adit: { head: 'overlay', foot: 'min' } };
  function setPhotos(s, id) { const P = PH[id]; if (!P) return s;
    s.photos = Object.assign({}, P); s.img = s.img || {};
    if (window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') ['hero', 'about'].forEach(sl => { if (!P[sl]) return; const v = HPSTOCK.slotImg(P[sl], sl); if (v) s.img[sl] = v; });
    s.hps = Object.assign({}, s.hps || {}, HEAD[id] || { head: 'solid', foot: 'min' }); return s; }
  const BAN = (eyebrow, title, sub, x) => S2('banner', Object.assign({ eyebrow, title, sub, cta: '', cta2: '' }, x || {}));
  const FIN = (title, body) => [...KEEP(), TX('cta', { hpt: 'a4-fin', title, body, cta: '', cols: AUTO })];
  const BUILD = {
    adtalk: () => [BAN('영어 · 일본어 · 중국어 회화 · 소수 정원', '한 문장이라도,\n*입 밖으로* 꺼내요', '레벨 상담으로 반을 정하고, 수업 시간의 절반은 직접 말해요. 수업이 끝나면 오늘 쓴 표현을 휴대폰으로 다시 보내 드려요.', { b1: 'How was your weekend?', b2: '週末は何をしましたか?' }),
      TX('features', { hpt: 'a4-stm', body: '수업 시간의 절반은 *직접 말하는 시간*이에요.', cols: AUTO }),
      TX('features', { hpt: 'a4-cls', eyebrow: '지금 모집 중', title: '레벨과 언어로 골라 보세요', cols: AUTO }),
      TX('features', { hpt: 'a4-week', eyebrow: '한 주의 흐름', title: '수업은 강의실에서,\n연습은 생활 속에서', body: '바쁜 주에도 끊기지 않게, 한 주를 이렇게 나눠 두었어요.', cols: [['수업일', '짝을 바꿔 가며 말하기', '오늘의 상황 표현을 직접 써 봐요'], ['다음 날', '출근길 복습 10분', '수업에서 쓴 표현만 휴대폰으로 다시'], ['주중', '한 문장 녹음 과제', '강사가 발음과 표현에 의견을 달아요'], ['주말', '주간 리포트', '출석 · 과제 · 다음 주 목표를 한 장으로']] }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('먼저 레벨 상담으로\n*출발점*을 찾아요', '상담이 끝나면 담당 강사가 맞는 반과 시작일을 안내해 드려요.')],
    adexam: () => [BAN('국가기술자격 · 회계 · 컴퓨터 자격 대비', '합격까지,\n*한 걸음씩* 갑니다', '시험 일정에 맞춘 커리큘럼과 매주 모의고사로 빈틈을 확인합니다. 수강 기간 동안 질문은 언제든 남길 수 있어요.'),
      TX('features', { hpt: 'a4-steps', nst: 'roman', eyebrow: '합격 과정', title: '네 단계로 준비합니다', cols: [['진단', '첫 수업 전 진단 평가로 출발점을 확인해요.'], ['이론', '출제 기준 순서대로 핵심 이론을 정리해요.'], ['모의고사', '매주 실전 시간에 맞춰 풀고 해설을 들어요.'], ['마무리', '시험 직전 오답만 모아 다시 점검해요.']] }),
      TX('features', { hpt: 'a4-cls', lay: 'rows', eyebrow: '개설 과정', title: '지금 신청할 수 있는 과정', cols: AUTO }),
      TX('features', { hpt: 'a4-notice', eyebrow: '알림', title: '시험 · 개강 소식', cols: AUTO }), ...FIN('다음 시험,\n*지금* 준비를 시작하세요', '상담에서 시험 일정과 지금 실력에 맞는 과정을 안내해 드립니다.')],
    adit: () => [BAN('직장인 직무 · IT 실무 저녁반', '퇴근 후 두 시간이\n다음 *커리어*가 돼요', '평일 저녁, 소수 정원 실습실에서. 내 업무 파일로 바로 따라 하고, 수업이 끝나면 녹화본으로 다시 봐요.'),
      TX('features', { hpt: 'a4-stm', body: '평일 저녁, 소수 정원. 수업은 짧게, *실습은 내 업무 파일*로 해요.', cols: AUTO }),
      TX('features', { hpt: 'a4-cls', eyebrow: '지금 모집', title: '지금 신청할 수 있는 과정', cols: AUTO }),
      TX('features', { hpt: 'a4-week', eyebrow: '한 주의 흐름', title: '수업은 실습실에서,\n복습은 출근길에', body: '바쁜 주에도 끊기지 않게, 한 주를 이렇게 나눠 두었어요.', cols: [['수업일', '실습 수업', '강사 화면을 보며 내 파일로 따라 해요'], ['다음 날', '녹화본 10분 복습', '막힌 부분만 다시 돌려 봐요'], ['주중', '실무 과제', '강사가 과제에 직접 의견을 달아요'], ['주말', '주간 리포트', '출석 · 과제 · 다음 주 목표를 한 장으로']] }),
      TX('features', { hpt: 'a4-num', pref: 'review', body: '', cols: AUTO }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('이번 주,\n*첫 실습*으로 시작해요', '상담이 끝나면 담당 강사가 지금 업무에 맞는 과정과 시작일을 알려 드려요.')],
    adcraft: () => [BAN('', '빚고,\n엮고,\n*만들어요.*', '퇴근 후와 주말, 손으로 만드는 클래스. 처음이어도 한 번에 작품 하나를 완성해 가져가요.'),
      TX('features', { hpt: 'a4-band', eyebrow: '클래스', title: '좋아하는 재료를 찾을 때까지,\n골고루 해 봐요', cols: AUTO }),
      TX('features', { hpt: 'a4-gal', eyebrow: '작업 장면', title: '이번 시즌, 공방의 시간', cols: AUTO }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('한 번,\n*와 보세요.*', '원데이 클래스로 먼저 해 보고, 맞으면 정규반으로 이어 가요.')],
    admove: () => [BAN('요가 · 필라테스 · 소그룹 스튜디오', '숨을 고르고,\n*몸을 깨워요*', '정원이 작은 소그룹 수업이에요. 처음 오시면 자세 상담으로 내 몸에 맞는 수업부터 찾아 드려요.'),
      TX('features', { hpt: 'a4-tt', eyebrow: '시간표', title: '이번 달 수업 시간표', cols: AUTO }),
      TX('features', { hpt: 'a4-story', eyebrow: '수업 방식', title: '오래 버티기보다\n바르게 움직이기', body: '동작을 많이 하기보다, 한 동작을 바르게 하는 데 시간을 써요. 소그룹이라 자세를 한 명씩 봐 드려요.', cols: [['첫 수업 전 자세 상담', '불편한 곳과 목표를 먼저 들어요.'], ['소그룹 정원', '강사가 한 명씩 자세를 잡아 드려요.'], ['예약 · 출석은 휴대폰으로', '수업 예약과 남은 횟수를 내 계정에서 확인해요.']] }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('첫 수업은\n*체험*으로 시작해요', '체험 수업이 끝나면 내 몸에 맞는 수업과 시간을 안내해 드려요.')],
    adcook: () => [BAN('홈베이킹 · 집밥 · 홈카페 클래스', '오늘 배운 한 접시를\n*집에서도* 만들어요', '한 테이블 소수 정원. 재료 손질부터 마무리까지 내 손으로 하고, 레시피 카드는 수업이 끝나면 내 계정에 남아요.'),
      TX('features', { hpt: 'a4-story', eyebrow: '수업 방식', title: '보기만 하는 시연 대신\n내 손으로 끝까지', body: '강사가 먼저 보여 주고, 모두 같은 순서로 직접 만들어요. 다 만든 요리는 포장해 가져가요.', cols: [['1인 1조리대', '재료 계량부터 혼자 해 봐요.'], ['레시피 카드', '수업이 끝나면 내 계정에 남아요.'], ['다 만든 요리는 포장', '집에 가져가 가족과 나눠요.']] }),
      TX('features', { hpt: 'a4-cls', eyebrow: '이번 달 클래스', title: '지금 신청할 수 있는 클래스', cols: AUTO }),
      TX('features', { hpt: 'a4-gal', eyebrow: '클래스 장면', title: '이번 달, 주방의 시간', cols: AUTO }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('한 접시부터,\n*같이 만들어요*', '원데이 클래스로 먼저 만들어 보고, 맞으면 정규 과정으로 이어 가요.')],
    adcoach: () => [BAN('1:1 커리어 · 리더십 코칭', '당신의 다음 한 걸음을\n*함께* 정해요', '한 번에 한 사람만 만나요. 지금 고민을 듣고, 다음 만남까지 해 볼 작은 행동 하나를 같이 정해요.', { cta: '첫 상담 신청', cta2: '코칭 과정 보기' }),
      TX('features', { hpt: 'a4-story', eyebrow: '코칭 방식', title: '정답을 주기보다\n스스로 찾게 도와요', body: '코칭은 이야기를 듣는 데서 시작해요. 만날 때마다 다음 행동 하나를 정하고, 다음 만남에서 어떻게 됐는지 함께 돌아봐요.', cols: [['첫 상담으로 시작', '지금 고민과 바라는 모습을 먼저 들어요.'], ['만날 때마다 행동 하나', '다음 만남까지 해 볼 일을 같이 정해요.'], ['기록은 내 계정에', '코칭 메모와 과제를 언제든 다시 봐요.']] }),
      TX('features', { hpt: 'a4-steps', eyebrow: '진행 순서', title: '이렇게 함께해요', cols: [['첫 상담', '고민과 목표를 듣고 맞는 과정을 정해요.'], ['코칭 세션', '정해진 횟수만큼 1:1로 만나요.'], ['실행 과제', '세션 사이에 작은 행동을 해 봐요.'], ['돌아보기', '마지막 세션에서 달라진 점을 정리해요.']] }),
      TX('features', { hpt: 'a4-pkg', eyebrow: '코칭 과정', title: '맞는 과정을 골라 보세요', cols: AUTO }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('먼저,\n*이야기*부터 들려주세요', '첫 상담에서 지금 상황을 듣고, 맞는 코칭 과정을 함께 정해요.')],
    advocal: () => [BAN('1:1 보컬 · 기타 레슨', '내 목소리로\n*한 곡*을 끝까지', '호흡과 발성부터 한 곡 완성까지. 레슨이 끝나면 녹음 파일로 달라진 소리를 들려 드려요.', { cta2: '보컬 진단 예약' }),
      TX('features', { hpt: 'a4-num', pref: 'ratio', body: '그래서 숨 쉬는 자리 하나까지 한 명씩 봐 드릴 수 있어요.', cols: AUTO }),
      TX('features', { hpt: 'a4-band', eyebrow: '레슨', title: '목표에 맞게 골라요', cols: AUTO }),
      TX('features', { hpt: 'a4-week', eyebrow: '한 달의 흐름', title: '발성에서\n녹음까지', body: '한 달에 한 곡, 녹음으로 마무리해요.', cols: [['1주', '호흡 · 발성', '내 목소리의 편한 음역을 찾아요'], ['2주', '곡 고르기 · 가사', '음역에 맞는 곡을 함께 골라요'], ['3주', '부분 연습', '어려운 구간만 집중해서 다듬어요'], ['4주', '녹음', '완성한 한 곡을 녹음해 드려요']] }),
      TX('features', { hpt: 'a4-gal', eyebrow: '레슨 장면', title: '레슨실의 시간', cols: AUTO }), ...FIN('첫 레슨은\n*진단*으로 시작해요', '진단 레슨에서 지금 목소리를 듣고, 맞는 레슨 방향을 안내해 드려요.')],
    adphoto: () => [BAN('사진 · 영상 크리에이터 클래스', '찍는 법보다\n*보는 법*부터', '카메라가 없어도 괜찮아요. 휴대폰 한 대로 시작해 한 편의 사진 · 영상을 완성하고, 작업은 강사가 직접 피드백해요.', { cta2: '1:1 포트폴리오 상담' }),
      TX('features', { hpt: 'a4-gal', eyebrow: '수업 장면', title: '이번 시즌의 작업들', cols: AUTO }),
      TX('features', { hpt: 'a4-cls', eyebrow: '클래스', title: '지금 신청할 수 있는 클래스', cols: AUTO }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('첫 컷은\n*같이* 찍어요', '상담에서 지금 장비와 만들고 싶은 작업을 듣고, 맞는 클래스를 안내해 드려요.')],
    admoney: () => [BAN('재테크 · 커리어 클래스', '월급의 *다음 계획*,\n오늘 세워요', '내 지출과 목표부터 정리하고 시작해요. 강의는 소수 정원으로, 질문은 수업이 끝난 뒤에도 내 계정에서 이어 가요.', { note: '첫 상담에서 지금 상황과 목표를 먼저 정리해요.', cta2: '1:1 상담 예약' }),
      TX('features', { hpt: 'a4-stm', body: '어려운 용어보다, *내 숫자*로 시작해요.', cols: AUTO }),
      TX('features', { hpt: 'a4-steps', eyebrow: '수업 순서', title: '네 번이면 계획이 생겨요', cols: [['내 숫자 정리', '수입 · 지출 · 목표를 한 장으로 적어요.'], ['기본 개념', '예금 · 투자 · 세금의 기본을 익혀요.'], ['내 계획 세우기', '목표에 맞는 비율과 순서를 정해요.'], ['점검', '한 달 뒤 계획대로 됐는지 함께 봐요.']] }),
      TX('features', { hpt: 'a4-pkg', eyebrow: '클래스 · 코칭', title: '목표에 맞게 골라 보세요', cols: AUTO }),
      TX('features', { hpt: 'a4-quote', cols: AUTO }), ...FIN('이번 달부터,\n*계획대로*', '상담에서 지금 상황과 목표를 듣고, 맞는 클래스나 코칭을 안내해 드려요.')]
  };
  /* 점검 · 시연용 강좌 이름(채운 기관의 qc0~5를 업종에 맞게 — tests/ui/hp-visual/lib.js applyTpl) */
  const QA = {
    adtalk: ['비즈니스 영어 회화', '일본어 첫걸음 회화', '중국어 HSK 4급 회화', '영어 프레젠테이션', '스페인어 여행 회화', '무료 레벨 상담 수업'],
    adexam: ['정보처리기사 필기', '전산회계 1급', '컴퓨터활용능력 1급', '공인중개사 1차', '한국사능력검정 심화', '무료 합격 전략 설명회'],
    adit: ['실무 엑셀과 데이터 분석', '파이썬 업무 자동화', '피그마 UI 디자인 입문', 'SQL 데이터 추출 실무', '생성형 AI 업무 활용', '무료 직무 진단 상담'],
    adcraft: ['도예 물레 클래스', '손뜨개 니트 입문', '목공 원목 트레이', '천연 염색 원데이', '가죽 카드지갑 만들기', '원데이 무료 체험'],
    admove: ['아침 빈야사 요가', '소그룹 기구 필라테스', '저녁 힐링 요가', '바른 자세 코어 운동', '주말 매트 필라테스', '무료 체험 수업'],
    adcook: ['주말 홈베이킹 기초', '사워도우 빵 클래스', '집밥 한식 코스', '브런치 요리 원데이', '홈카페 라테아트', '무료 시식 체험 수업'],
    adcoach: ['1:1 커리어 코칭 4회', '이직 준비 집중 코칭', '리더십 1:1 코칭', '퍼스널 브랜딩 워크숍', '면접 실전 코칭', '무료 30분 첫 상담'],
    advocal: ['보컬 1:1 기초 레슨', '취미 보컬 소그룹', '오디션 준비 보컬', '어쿠스틱 기타 입문', '홈레코딩 입문', '무료 보컬 진단 레슨'],
    adphoto: ['스마트폰 사진 기초', '미러리스 카메라 입문', '유튜브 영상 편집', '여행 사진 출사', '브이로그 촬영 실전', '무료 포트폴리오 상담'],
    admoney: ['사회초년생 재테크 첫걸음', '연말정산 · 절세 실전', '커리어 전환 코칭', 'ETF 장기 투자 기초', '연봉 협상 클래스', '무료 재무 상담']
  };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hp44a) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && /^t44-/.test(tp.id) ? tp.id.slice(4) : ''; if (IDS.includes(id)) setPhotos(s, id); } catch (e) { console.error('hp44-adult photos', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hp44a = 1; siteFromTpl = f; window.siteFromTpl = f; }
  IDS.forEach(id => { if (TPL.some(x => x.id === 't44-' + id)) return;
    TPL.push({ id: 't44-' + id, name: DEF[id].name, types: ['adult'], g44: 1, sub: DEF[id].sub, solo: DEF[id].solo ? 1 : 0, scene: `성인 · 1인 강사 · ${DEF[id].sub} — ${DEF[id].desc}`, color: DEF[id].acc, tone: id === 'adexam' ? '신뢰' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: ['apply', 'info'], prem: 1, hp44: 'adult', build: BUILD[id], noPalette: true, qaCls: QA[id] }); });
  window.HP44 = Object.assign(window.HP44 || {}, { adult: { ids: IDS.slice(), subs: IDS.map(id => [id, DEF[id].sub]), solo: IDS.filter(id => DEF[id].solo) } });
})();
