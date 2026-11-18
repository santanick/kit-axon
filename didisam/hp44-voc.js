/* v44 hp44-voc — 직업훈련(voc) 홈페이지 템플릿 10종(세부 유형별) · 담당 V
   대표님(2026-11-18): 「교육기관 유형별로 10가지 … 세부 유형별로 시나리오에 맞게 높은 퀄리티의 템플릿만」 · 「다른 유형도 아주 잘 디자인된 고퀄리티」
   - 기준선: v43.9 hpv-life 「현장」(lvworkshop) · 「전환」(lvshift) → vofield · vokdt로 흡수 · 발전. 나머지 8종은 신규.
   - 10종 첫 화면은 모두 다른 구성: 전면 사진 · 가운데 제목 · 분할 · 포스터 · 콜라주 · 잡지 · 다크 시네마 · 띠+판 · 둥근 사진 · 격식(문장 · 대칭).
   - 원칙: 한 화면 한 메시지, 섹션 5~6개, 실제 데이터만(공개 과정 · 별점 4 이상 후기 · 공지 · footer), 없으면 그 덩어리를 숨김. 낮은 수치는 큰 숫자로 내세우지 않음.
   - 링크: 학습자 실제 경로(#courses · #my · #cal · #notice · #p-c-<id> → 게시 때 #class/<id> · tel:)와 고용24(국비 자격)만.
   - 게시본은 Shadow DOM이라 CSS는 siteHTML의 <style>에 넣는다. 클래스 접두어 v4-. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof siteHTML !== 'function' || typeof proSec !== 'function') return;
  const U = HPT.U; const { mix, fit, al, CR } = U;
  const HS = window.HPS = window.HPS || {};
  const E = v => esc(v == null ? '' : v);
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const today = () => { try { return typeof window.today === 'function' ? window.today() : new Date().toISOString().slice(0, 10); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const AR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const EXT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>';

  /* ── 실제 데이터 ── */
  const pubAll = () => { try { const L = (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료' && c.name); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; } catch (e) { return []; } };
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const md = d => { const m = String(d || '').match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${+m[1]}월 ${+m[2]}일` : ''; };
  const dot = d => { const m = String(d || '').match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}.${m[2]}` : ''; };
  const won = v => (+v || 0).toLocaleString('ko-KR') + '원';
  const weeks = c => { if (!c.start || !c.end) return 0; const n = (new Date(c.end) - new Date(c.start)) / 864e5; return n > 0 ? Math.max(1, Math.round(n / 7)) : 0; };
  const dday = c => c.start ? Math.round((new Date(c.start) - new Date(today())) / 864e5) : null;
  const span = w => !w ? '' : w >= 8 ? `${Math.round(w / 4.3)}개월` : `${w}주`;
  function info(c) { const days = Array.isArray(c.days) && c.days.length ? c.days.map(d => WD[+d] || '').filter(Boolean).join(' · ') : ''; const tm = c.time && c.time.from ? `${c.time.from}–${c.time.to || ''}` : ''; const dd = dday(c);
    return { dd, days, tm, when: c.start ? (dd != null && dd < 0 ? `${md(c.start)} 시작 · 진행 중` : `${md(c.start)} 개강`) : '수시 모집', dur: span(weeks(c)), hrs: +c.hours ? `${+c.hours}시간` : '',
      meta: [span(weeks(c)), days ? `${days}${tm ? ' ' + tm : ''}` : '', +c.hours ? `${+c.hours}시간` : ''].filter(Boolean).join(' · '),
      price: !+c.price ? '수강료 0원' : won(c.price), cert: c.cert === 'auto' || c.cert === 'manual' }; }
  const sorted = () => pubAll().slice().sort((a, b) => { const k = v => v == null ? 1e6 : v < 0 ? 5e5 - v : v; return k(dday(a)) - k(dday(b)); });
  const CL = '#courses', MY = '#my', CAL = '#cal', NT = '#notice', W24 = 'https://www.work24.go.kr';
  const cH = c => '#p-c-' + c.id;
  const telOk = () => { const t = ft().tel; return t && !isPh(t) ? String(t) : ''; };
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  const ask = () => { const t = telOk(); return t ? { h: telH(t), l: `전화 ${t}`, s: '전화 상담' } : { h: NT, l: '공지 · 문의 보기', s: '공지 · 문의' }; };
  const aA = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const btn = (h, l, k) => `<a class="v4-b ${k || 'p'}" ${aA(h)}><span>${E(l)}</span>${/^https?:/.test(h) ? EXT : AR}</a>`;
  const lnk = (h, l) => `<a class="v4-ln" ${aA(h)}><span>${E(l)}</span>${/^https?:/.test(h) ? EXT : AR}</a>`;
  const ph = (s, slot, d) => typeof HS.photo === 'function' ? HS.photo(s, slot, d) : null;
  const fig = (slot, p, cls, eager, sizes) => p ? `<figure class="hps-img${slot === 'hero' ? ' hp-photo' : ''} ${cls}" data-slot="${E(slot)}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="${E(sizes || '100vw')}"` : ''} alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-fit:${p.fit || 'cover'};object-position:${E(p.pos || '50% 50%')}"></figure>` : `<div class="${cls} v4-ph0" aria-hidden="true"></div>`;
  /* 강좌 카드 사진(검수 A1): 기관 사진 → 템플릿 분야 사진 세트 → 강좌 이름 규칙(HPSTOCK.courseRule). 한 페이지 안 중복 0(첫 화면 · 이야기 사진 포함) */
  const POOL = { vofield: ['wrk-04', 'wrk-05', 'hum-19', 'hum-20', 'wrk-03', 'aut-02'], vokdt: ['hum-08', 'cod-03', 'lap-03', 'hum-09', 'dat-01', 'hum-39'], voupskill: ['cor-01', 'off-05', 'doc-01', 'hum-06', 'cor-07', 'off-12'],
    vocert: ['dsk-06', 'dsk-09', 'dsk-08', 'hum-05', 'dsk-01', 'lap-04'], vocook: ['bak-01', 'bak-04', 'bar-02', 'bar-03', 'coo-03', 'bak-05'], vobeauty: ['hum-28', 'art-02', 'dsn-01', 'hum-27', 'art-03', 'hum-26'],
    vodesign: ['vid-01', 'hum-42', 'hum-31', 'cod-02', 'pho-01', 'hum-40'], vologi: ['log-02', 'dro-02', 'wrk-01', 'aut-01', 'aut-03', 'hum-49'], vocare: ['hum-33', 'sci-01', 'sen-03', 'hum-34', 'sen-07', 'fam-02'],
    voclassic: ['wrk-02', 'wrk-07', 'lec-02', 'cls-04', 'sem-01', 'lib-03'] };
  let USED = new Set(), CUR = 'vofield';
  const hsh = v => { let h = 2166136261; v = String(v); for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const cphoto = c => { if (c.thumb && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(c.thumb)) return { src: c.thumb, alt: c.name, stock: '' };
    const H = window.HPSTOCK; if (!H || typeof H.get !== 'function') return null; const ok = id => id && H.get(id) && !USED.has(id);
    let id = (POOL[CUR] || []).find(ok) || ''; /* 템플릿 분야 사진 세트가 먼저 — 같은 유형 안 템플릿끼리 카드 사진이 겹치지 않게(검수 A1) */
    if (!id) { try { const r = H.courseRule && H.courseRule(c.name); const R = r ? r.ids.filter(ok) : []; if (R.length) id = R[hsh(CUR + c.id) % Math.min(R.length, 3)]; } catch (e) { } } if (!id) { try { const x = H.photo(c.name, CUR + c.id, { id: true, scope: 'v4' + CUR }); if (x && !USED.has(x.id)) id = x.id; } catch (e) { } }
    if (!id) return null; USED.add(id); const x = H.get(id); return { src: H.url(x, 'sm'), srcset: H.srcset ? H.srcset(x) : '', alt: x.alt || '', pos: x.focus || '50% 50%', stock: id }; };
  /* 국비 과정 표시(GAP B): 이름 · 훈련 구분 · HRD-Net 과정 ID로 판단 */
  const isGov = c => /내일배움|국비|K-?디지털|KDT|국민내일/i.test(c.name || '') || ['3', '4'].includes(String(c.emp || '')) || !!(c.hrd && (c.hrd.tracse || c.hrd.simsa));
  const hrdOf = c => !!(c.hrd && c.hrd.tracse);
  const lines = d => String((d && d.title) || org()).split('\n').filter((x, k, A) => x || A.length === 1).map(E).join('<br>');
  const linesEm = d => { const L = String((d && d.title) || org()).split('\n').filter(Boolean); if (L.length < 2) return lines(d); return L.map((x, i) => i === 1 ? `<em>${E(x)}</em>` : E(x)).join('<br>'); };
  const rows = d => ((d && d.cols) || []).filter(r => r && r[0] && !isPh(r[0]) && r[0] !== '자동');
  const review = () => { try { const R = (HPT.reviews && HPT.reviews()) || []; const BAD = /끊겨|끊김|안 ?돼|안 ?되|부탁|해 ?주세요|해주세요|오류|에러|환불|불편|문제|느려|왜|언제|어떻게|\?\s*$/; const G = R.filter(x => x.st >= 4 && x.b.length >= 12 && !BAD.test(x.b)); const r = G.find(x => x.b.length <= 90) || G[0]; return r ? { b: r.b.length > 90 ? r.b.slice(0, 88) + '…' : r.b, w: [r.c, r.w].filter(Boolean).join(' · ') } : null; } catch (e) { return null; } };
  const notices = () => { try { return [...(S.notices || []), ...(S.classes || []).filter(c => c.open === '전체' || c.open == null).flatMap(c => c.notices || [])].filter(x => x && x.title && !x.hidden && !x.priv).slice().sort((a, b) => String(b.at || b.date || '').localeCompare(String(a.at || a.date || ''))); } catch (e) { return []; } };
  const head = d => `${d.eyebrow ? `<p class="v4-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2>`;
  const paths = d => { const a = ask(); return [['처음이에요', '국비 지원 자격 확인', W24], ['훈련생', (d && d.my) || '출결 · 진도 · 수료', MY], ['기업', '채용 연계 문의', a.h]]; };
  const pathNav = (d, cls) => `<nav class="v4-paths ${cls || ''}" aria-label="방문 목적별 바로 가기">${paths(d).map(([k, l, h]) => `<a ${aA(h)}><b>${E(k)}</b><span>${E(l)}</span></a>`).join('')}</nav>`;
  const heroBtns = d => `<div class="v4-bs">${btn(CL, d.cta || '모집 중인 과정 보기', 'p')}${btn(d.k2 === 'w24' ? W24 : ask().h, d.cta2 || (d.k2 === 'w24' ? '국비 자격 확인' : '상담 문의'), 'o')}</div>`;
  const hx = (id, extra, inner, dark) => `<section class="hpt hp-hero hps-hero v4 v4t-${id} v4-hero v4h-${extra}"${dark ? ' data-hps-dark="1"' : ''}>${inner}</section>`;
  const ey = d => d.eyebrow ? `<p class="v4-ey">${E(d.eyebrow)}</p>` : '';
  const sub = d => d.sub ? `<p class="v4-sub">${E(d.sub)}</p>` : '';
  const nextC = () => sorted().find(c => { const x = dday(c); return x != null && x >= 0; });

  /* ════ 첫 화면 10종 ════ */
  const H = {
    /* 1 전면 사진(현장) */
    vofield: (s, d) => hx('vofield', 'full', `${fig('hero', ph(s, 'hero', d), 'v4-bgph', true)}<div class="v4-w v4-fullw">${ey(d)}<h1>${lines(d)}</h1>${sub(d)}${heroBtns(d)}</div><div class="v4-fullq"><div class="v4-w">${pathNav(d)}</div></div>`, 1),
    /* 2 가운데 제목 + 넓은 사진(전환 · KDT) */
    vokdt: (s, d) => hx('vokdt', 'center', `<div class="v4-w">${d.eyebrow ? `<p class="v4-pill"><b>모집 중</b><span>${E(d.eyebrow)}</span></p>` : ''}<h1>${linesEm(d)}</h1>${sub(d)}${heroBtns(d)}${fig('hero', ph(s, 'hero', d), 'v4-stage', true, '(max-width: 760px) 100vw, 1160px')}${pathNav(d, 'line')}</div>`),
    /* 3 분할(재직자) — 왼쪽 글, 오른쪽 사진이 화면 끝까지 */
    voupskill: (s, d) => { const n = nextC(); return hx('voupskill', 'split', `<div class="v4-splitg"><div class="v4-splitl">${ey(d)}<h1>${linesEm(d)}</h1>${sub(d)}${heroBtns(d)}${n ? `<a class="v4-next" href="${E(cH(n))}"><small>가장 가까운 개강</small><b>${E(n.name)}</b><span>${E(md(n.start))}${info(n).days ? ' · ' + E(info(n).days) : ''}</span>${AR}</a>` : ''}</div>${fig('hero', ph(s, 'hero', d), 'v4-splitph', true, '(max-width: 760px) 100vw, 50vw')}</div><div class="v4-w">${pathNav(d, 'line')}</div>`); },
    /* 4 포스터(자격증) — 색면 · 초대형 글자 · 원형 사진 */
    vocert: (s, d) => hx('vocert', 'poster', `<div class="v4-w v4-posg"><div>${ey(d)}<h1>${lines(d)}</h1>${sub(d)}${heroBtns(d)}</div>${fig('hero', ph(s, 'hero', d), 'v4-circle', true, '(max-width: 760px) 80vw, 520px')}</div><div class="v4-postk" aria-hidden="true"><span>필기</span><i></i><span>실기</span><i></i><span>합격</span></div><div class="v4-w">${pathNav(d, 'line')}</div>`),
    /* 5 콜라주(조리 · 제과) */
    vocook: (s, d) => hx('vocook', 'collage', `<div class="v4-w v4-colg"><div class="v4-colt">${ey(d)}<h1>${linesEm(d)}</h1>${sub(d)}${heroBtns(d)}</div><div class="v4-col">${fig('hero', ph(s, 'hero', d), 'c1', true, '(max-width: 760px) 60vw, 30vw')}${fig('about', ph(s, 'about'), 'c2', false, '30vw')}${fig('space', ph(s, 'space'), 'c3', false, '30vw')}</div></div><div class="v4-w">${pathNav(d, 'line')}</div>`),
    /* 6 잡지 표지(미용 · 뷰티) — 세리프, 사진 위에 걸친 제목 */
    vobeauty: (s, d) => hx('vobeauty', 'mag', `<div class="v4-w v4-magg"><p class="v4-issue" aria-hidden="true">${E(org())}</p><div class="v4-magt">${ey(d)}<h1>${linesEm(d)}</h1>${sub(d)}${heroBtns(d)}</div>${fig('hero', ph(s, 'hero', d), 'v4-magph', true, '(max-width: 760px) 100vw, 46vw')}${fig('about', ph(s, 'about'), 'v4-magsm', false, '20vw')}</div><div class="v4-w">${pathNav(d, 'line')}</div>`),
    /* 7 다크 시네마(디자인 · 영상) */
    vodesign: (s, d) => hx('vodesign', 'cine', `<div class="v4-w">${ey(d)}<h1>${linesEm(d)}</h1><div class="v4-cinerow">${sub(d)}${heroBtns(d)}</div></div>${fig('hero', ph(s, 'hero', d), 'v4-cineph', true)}<div class="v4-w">${pathNav(d, 'line')}</div>`, 1),
    /* 8 사진 띠 + 노란 판(물류 · 운전 · 중장비) */
    vologi: (s, d) => hx('vologi', 'band', `${fig('hero', ph(s, 'hero', d), 'v4-bandph', true)}<div class="v4-w"><div class="v4-panel">${ey(d)}<h1>${lines(d)}</h1>${sub(d)}${heroBtns(d)}</div>${pathNav(d, 'line')}</div>`),
    /* 9 둥근 사진 · 큰 글자(간호조무 · 요양) */
    vocare: (s, d) => hx('vocare', 'soft', `<div class="v4-w v4-softg"><div>${ey(d)}<h1>${linesEm(d)}</h1>${sub(d)}${heroBtns(d)}</div>${fig('hero', ph(s, 'hero', d), 'v4-blob', true, '(max-width: 760px) 100vw, 46vw')}</div><div class="v4-w">${pathNav(d, 'line')}</div>`),
    /* 10 격식(전통 직업전문학교) — 문장 · 대칭 · 세리프 · 액자 사진 */
    voclassic: (s, d) => { const n = String(org() || '학').trim(); const ini = n.slice(0, 1);
      return hx('voclassic', 'formal', `<div class="v4-w v4-formal"><div class="v4-crest" aria-hidden="true"><svg viewBox="0 0 96 96" width="88" height="88"><circle cx="48" cy="48" r="45" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="48" cy="48" r="38" fill="none" stroke="currentColor" stroke-width=".8"/><path d="M48 14l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="currentColor"/></svg><span>${E(ini)}</span></div>${ey(d)}<h1>${lines(d)}</h1><p class="v4-rule" aria-hidden="true"><i></i></p>${sub(d)}${heroBtns(d)}${fig('hero', ph(s, 'hero', d), 'v4-frame', true, '(max-width: 760px) 100vw, 1080px')}${pathNav(d, 'line formal')}</div>`); } };

  /* ════ 섹션 ════ */
  /* 큰 숫자: 자랑할 만한 값일 때만(검수 11-18) — 0원 과정 5개 이상 · 과정 10개 이상 · 수료증 과정 10개 이상. 시간 합계는 쓰지 않음.
     못 미치면 숫자 대신 사진 이야기(fb)로 그 자리를 채운다 — 템플릿마다 다른 사진 · 문장 */
  function sNum(s, d) { const L = pubAll(); const F = L.filter(c => !+c.price).length; const C = L.filter(c => info(c).cert).length; let n = '', u = '', t = '';
    if (d.k === 'free' && F >= 5) { n = '0'; u = '원'; t = `수강료 0원으로 들을 수 있는 과정이 ${F}개 있어요.`; }
    else if (d.k === 'count' && L.length >= 10) { n = String(L.length); u = '개'; t = '지금 모집 · 운영 중인 과정이에요.'; }
    else if (d.k === 'cert' && C >= 10) { n = String(C); u = '개'; t = '수료하면 수료증을 주는 과정이에요.'; }
    if (n) return `<div class="v4-w v4-numg"><p class="v4-big" aria-label="${E(n + u)}">${E(n)}<span>${u}</span></p><div>${d.title ? `${head(d)}<p class="v4-lead">${E(d.sub || t)}</p>${d.sub ? `<p class="v4-cap">${E(t)}</p>` : ''}` : `${d.eyebrow ? `<p class="v4-k">${E(d.eyebrow)}</p>` : ''}<h2>${E(t)}</h2>`}${lnk(d.k === 'free' ? W24 : CL, d.k === 'free' ? '고용24에서 지원 자격 확인' : '과정 모두 보기')}</div></div>`;
    const fb = d.fb || {}; if (!fb.title) return '';
    return `<div class="v4-w v4-fbg${fb.flip ? ' flip' : ''}">${fig('fb', ph(s, 'fb'), 'v4-fbph', false, '(max-width: 760px) 100vw, 56vw')}<div class="v4-fbt">${fb.eyebrow ? `<p class="v4-k">${E(fb.eyebrow)}</p>` : ''}<h2>${lines(fb)}</h2>${fb.sub ? `<p class="v4-lead">${E(fb.sub)}</p>` : ''}${lnk(fb.w24 ? W24 : CL, fb.link || '과정 둘러보기')}</div></div>`; }
  function sCards(s, d) { const L = sorted(); if (!L.length) return ''; const k = d.k || 'clean'; const N = L.slice(0, k === 'rows' ? 5 : 3);
    const more = L.length > N.length ? lnk(CL, `전체 ${L.length}개 과정 보기`) : lnk(CL, '과정 자세히 보기');
    if (k === 'rows') return `<div class="v4-w"><div class="v4-top"><div>${head(d)}</div>${more}</div><ol class="v4-rows">${N.map((c, i) => { const x = info(c); return `<li><a href="${E(cH(c))}"><i>${String(i + 1).padStart(2, '0')}</i><span class="v4-rn"><b>${isGov(c) ? '<em class="v4-gov">국비</em>' : ''}${E(c.name)}</b><small>${E([x.when, x.meta].filter(Boolean).join(' · '))}</small></span><span class="v4-rp">${E(x.price)}</span>${AR}</a></li>`; }).join('')}</ol></div>`;
    const card = c => { const x = info(c); const p = cphoto(c);
      if (k === 'tall') return `<li><a class="v4-tall" href="${E(cH(c))}">${fig('cls-' + c.id, p, 'v4-tph')}${x.dd != null && x.dd >= 0 && x.dd <= 14 ? `<em class="v4-bd">${x.dd === 0 ? '오늘 개강' : `개강 D-${x.dd}`}</em>` : ''}<span class="v4-tt"><small>${isGov(c) ? '<em class="v4-gov w">국비</em>' : ''}${E(x.when)}</small><b>${E(c.name)}</b><small class="m">${E([x.meta, x.price].filter(Boolean).join(' · '))}</small></span></a></li>`;
      return `<li><a class="v4-card" href="${E(cH(c))}">${fig('cls-' + c.id, p, 'v4-cph')}<small class="v4-tag">${isGov(c) ? '<em class="v4-gov">국비</em>' : ''}${E(x.when)}</small><b>${E(c.name)}</b><small class="v4-meta">${E([x.meta, x.price].filter(Boolean).join(' · '))}</small></a></li>`; };
    return `<div class="v4-w"><div class="v4-top"><div>${head(d)}</div>${d.sub ? `<p class="v4-lead">${E(d.sub)}</p>` : more}</div><ul class="v4-cards k-${k} n${N.length}">${N.map(card).join('')}</ul>${d.sub ? `<p class="v4-more">${more}</p>` : ''}</div>`; }
  function sSteps(s, d) { const R = rows(d).slice(0, 4); if (!R.length) return '';
    if (d.k === 'line') return `<div class="v4-w">${head(d)}<ol class="v4-line n${R.length}">${R.map((r, i) => `<li><i>${String(i + 1).padStart(2, '0')}</i><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</li>`).join('')}</ol></div>`;
    return `<div class="v4-w v4-stg">${fig(DEF[CUR] && DEF[CUR].ph.st ? 'st' : 'about', ph(s, DEF[CUR] && DEF[CUR].ph.st ? 'st' : 'about'), 'v4-stph', false, '(max-width: 760px) 100vw, 46vw')}<div>${head(d)}<ol class="v4-st">${R.map((r, i) => `<li><i>${String(i + 1).padStart(2, '0')}</i><div><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</div></li>`).join('')}</ol></div></div>`; }
  const goodRev = () => { try { return (window.HPX && HPX.data && HPX.data.reviews) ? HPX.data.reviews() : []; } catch (e) { return []; } };
  function sQuote(s, d) { if ((DEF[CUR] || {}).hx && DEF[CUR].hx.includes('rev') && goodRev().length >= 2) return ''; /* 후기는 hx-rev 하나만 */ const r = review(); const q = r ? r.b : (d.title || ''); if (!q) return ''; const cite = r ? r.w : org();
    if (d.k === 'photo') return `${fig('cta', ph(s, 'cta'), 'v4-qbg')}<div class="v4-w v4-qw"><blockquote>${E(q)}</blockquote><p class="v4-cite">${E(cite)}</p></div>`;
    return `<div class="v4-w v4-qp"><blockquote>“${E(q)}”</blockquote><p class="v4-cite">${E(cite)}</p></div>`; }
  function sPillars(s, d) { const R = rows(d).slice(0, 3); if (!R.length) return '';
    return `<div class="v4-w">${head(d)}<ul class="v4-pil n${R.length}">${R.map((r, i) => `<li><i>${E(d.k === 'roman' ? ['Ⅰ', 'Ⅱ', 'Ⅲ'][i] : String(i + 1).padStart(2, '0'))}</i><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</li>`).join('')}</ul></div>`; }
  function sStrip(s, d) { const P = ['g1', 'g2', 'g3'].map(k => [k, ph(s, k)]).filter(x => x[1]); if (P.length < 3) return '';
    return `<div class="v4-w">${head(d)}${d.sub ? `<p class="v4-lead">${E(d.sub)}</p>` : ''}</div><div class="v4-strip">${P.map(([k, p]) => fig(k, p, 'v4-sp', false, '34vw')).join('')}</div>`; }
  function sElig(s, d) { const a = ask();
    return `<div class="v4-w v4-elg"><div>${head(d)}${d.sub ? `<p class="v4-lead">${E(d.sub)}</p>` : ''}</div><div class="v4-elr"><ul>${['구직 중이거나 실업 상태인 분', '회사에 다니는 재직자', '자영업자 · 특수형태근로종사자', '졸업을 앞둔 졸업 예정자'].map(t => `<li>${E(t)}</li>`).join('')}</ul><p class="v4-cap">제도 일반 안내예요. 소득 · 기업 규모 기준이 있어 정확한 자격과 지원 범위는 고용24에서 확인돼요.</p><div class="v4-bs">${btn(W24, '고용24에서 자격 확인', 'p')}${btn(a.h, a.s, 'o')}</div></div></div>`; }
  /* 공지: 템플릿마다 다른 모양(rows 목록 · cards 날짜 카드 · split 왼쪽 제목 + 오른쪽 목록) — 하단이 색만 다른 같은 뼈대가 되지 않게 */
  function sNotice(s, d) { const k = d.k || 'rows'; const N = notices().slice(0, k === 'cards' ? 3 : 4); if (!N.length) return '';
    const dd = n => { const m = String(n.at || n.date || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? [m[3], `${+m[2]}월`] : ['', '']; };
    if (k === 'cards') return `<div class="v4-w"><div class="v4-top"><div>${head(d)}</div>${lnk(NT, '공지 모두 보기')}</div><ul class="v4-nc n${N.length}">${N.map(n => { const [a, b] = dd(n); return `<li><a href="${NT}">${a ? `<span class="v4-ncd"><b>${E(a)}</b><small>${E(b)}</small></span>` : ''}<span class="v4-nct">${E(n.title)}</span><span class="v4-ncm">자세히 보기${AR}</span></a></li>`; }).join('')}</ul></div>`;
    const list = `<ul class="v4-nl">${N.map(n => `<li><a href="${NT}"><time>${E(dot(n.at || n.date || ''))}</time><b>${E(n.title)}</b>${AR}</a></li>`).join('')}</ul>`;
    if (k === 'split') return `<div class="v4-w v4-nsp"><div>${head(d)}${lnk(NT, '공지 모두 보기')}</div>${list}</div>`;
    return `<div class="v4-w"><div class="v4-top"><div>${head(d)}</div>${lnk(NT, '공지 모두 보기')}</div>${list}</div>`; }
  /* 훈련 일정 표(GAP B): 개강일 · 기간 · 요일/시간 · 수강료(자부담) · 국비 · HRD-Net 등록 — 실제 공개 과정만 */
  function sSched(s, d) { const L = sorted().slice(0, 6); if (!L.length) return ''; const anyH = L.some(hrdOf);
    const row = c => { const x = info(c); return `<li><a href="${E(cH(c))}"><span class="v4-sn"><b>${E(c.name)}</b><span class="v4-sb">${isGov(c) ? '<em class="v4-gov">국비</em>' : ''}${hrdOf(c) ? '<em class="v4-hrd">HRD-Net 등록</em>' : ''}</span></span><span class="v4-sc" data-l="개강일">${E(c.start ? md(c.start) : '수시')}</span><span class="v4-sc" data-l="기간">${E([x.dur, x.hrs].filter(Boolean).join(' · ') || '상세 참고')}</span><span class="v4-sc" data-l="요일 · 시간">${E(x.days ? `${x.days}${x.tm ? ' ' + x.tm : ''}` : '상세 참고')}</span><span class="v4-sc pr" data-l="수강료 · 자부담">${E(!+c.price ? '0원' : won(c.price))}</span>${AR}</a></li>`; };
    return `<div class="v4-w"><div class="v4-top"><div>${head(d)}</div>${lnk(CL, '전체 과정 보기')}</div><div class="v4-sch" role="table" aria-label="훈련 일정표"><p class="v4-shd" aria-hidden="true"><span>과정</span><span>개강일</span><span>기간</span><span>요일 · 시간</span><span>수강료 · 자부담</span><span></span></p><ul>${L.map(row).join('')}</ul></div>
<p class="v4-cap">자부담은 카드 종류 · 훈련 직종에 따라 달라요. 정확한 지원 금액은 고용24에서 확인돼요.${anyH ? ' HRD-Net(고용24)에 등록된 과정은 고용24에서도 같은 과정을 찾을 수 있어요.' : ''}</p></div>`; }
  function sCta(s, d) { const t = telOk(); const hrs = ft().hours && !isPh(ft().hours) ? ft().hours : '';
    const b2 = t ? btn(telH(t), `전화 ${t}`, 'o') : btn(NT, '공지 · 문의 보기', 'o');
    return `<div class="v4-w v4-ctag k-${d.k || 'center'}"><div>${d.eyebrow ? `<p class="v4-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2>${d.sub || hrs ? `<p class="v4-lead">${E(hrs ? `상담 시간 · ${hrs}` : d.sub)}</p>` : ''}</div><div class="v4-bs">${btn(CL, d.cta || '모집 중인 과정 보기', 'p')}${b2}</div></div>`; }
  const SEC = { 'v4-num': sNum, 'v4-cards': sCards, 'v4-steps': sSteps, 'v4-quote': sQuote, 'v4-pil': sPillars, 'v4-strip': sStrip, 'v4-elig': sElig, 'v4-notice': sNotice, 'v4-cta': sCta, 'v4-sched': sSched };

  /* ════ 10종 정의: 색 · 서체 · 사진 · 머리글 · 문구 · 섹션 ════ */
  /* a 기관 색 · bg 바탕 · alt 교차 바탕 · dk 짙은 띠 · pt 포인트 · serif 제목 명조 · dark 전체 어두운 테마 */
  const DEF = {
    vofield: { hx: ['num', 'faq', 'loc'], name: '현장', sub: '국비 기술훈련원', hk: 'full', a: '#D9541A', bg: '#FFFFFF', alt: '#F4F2EE', dk: '#16212B', pt: '#D9541A', head: 'overlay', ph: { hero: 'wrk-08', about: 'hum-18', cta: 'aut-03', fb: 'voc-01' }, desc: '작업장 사진을 가득 채운 첫 화면 · 큰 숫자 · 세로형 과정 카드 · 시작 4단계(용접 · 정비 · 기계 등 기술훈련)' },
    vokdt: { hx: ['rev', 'fac', 'faq'], name: '전환', sub: 'KDT · IT 부트캠프', hk: 'center', a: '#1D4ED8', bg: '#FFFFFF', alt: '#F5F6F8', dk: '#0C0E13', pt: '#D7F25C', head: 'solid', ph: { hero: 'grp-03', about: 'hum-50', fb: 'hum-07' }, desc: '가운데 큰 제목과 넓은 사진 · 과정 3개 · 검은 큰 숫자 하나(K-디지털 트레이닝 · IT 부트캠프)' },
    voupskill: { hx: ['rev', 'faq'], name: '퇴근 후', sub: '재직자 향상 훈련', hk: 'split', a: '#0F766E', bg: '#FFFFFF', alt: '#F1F6F5', dk: '#0B2B28', pt: '#E8A33B', head: 'solid', ph: { hero: 'cor-06' }, desc: '왼쪽 글 · 오른쪽 사진 분할 첫 화면 · 요일 · 시간 중심 과정 목록 · 재직자 혜택 3가지' },
    vocert: { hx: ['num', 'faq'], name: '합격 포스터', sub: '자격증 · 기능사', hk: 'poster', a: '#F2B705', bg: '#FFFFFF', alt: '#FBF6E3', dk: '#141414', pt: '#141414', head: 'solid', ph: { hero: 'dsk-07', fb: 'dsk-03' }, desc: '노란 색면 · 초대형 제목 · 원형 사진의 포스터 첫 화면 · 번호 목록 과정 · 필기에서 합격까지' },
    vocook: { hx: ['fac', 'rev', 'loc'], name: '키친', sub: '조리 · 제과제빵', hk: 'collage', a: '#B4372B', bg: '#FBF6EF', alt: '#F3EADF', dk: '#2A1A14', pt: '#E9A23B', head: 'solid', ph: { hero: 'coo-02', about: 'bak-02', space: 'bar-01', g1: 'bak-03', g2: 'coo-01', g3: 'bak-05', cta: 'bak-01', st: 'bar-03' }, desc: '사진 세 장 콜라주 첫 화면 · 실습 사진 띠 · 과정 카드 · 따뜻한 크림 바탕(조리 · 제과제빵 · 바리스타)' },
    vobeauty: { hx: ['fac', 'rev', 'loc'], name: '살롱', sub: '미용 · 뷰티', hk: 'mag', a: '#9E4E5B', bg: '#FAF4F1', alt: '#F1E6E1', dk: '#2B1D20', pt: '#9E4E5B', serif: 1, head: 'center', ph: { hero: 'bea-02', about: 'bea-01', st: 'art-02' }, desc: '잡지 표지 같은 명조 제목과 세로 사진 · 잡지형 과정 목록 · 인용(헤어 · 메이크업 · 네일)' },
    vodesign: { hx: ['fac', 'rev'], name: '스크린', sub: '디자인 · 영상', hk: 'cine', a: '#FF5A36', bg: '#0B0B0D', alt: '#141418', dk: '#000000', pt: '#FF5A36', dark: 1, head: 'overlay', ph: { hero: 'hum-41', about: 'pho-02', fb: 'pho-01' }, desc: '검은 바탕 시네마 첫 화면 · 넓은 사진 · 어두운 과정 카드 · 큰 숫자(디자인 · 영상 · 사진)' },
    vologi: { hx: ['num', 'faq', 'loc'], name: '로드', sub: '물류 · 운전 · 중장비', hk: 'band', a: '#F2C200', bg: '#FFFFFF', alt: '#F1F1EC', dk: '#1A1D21', pt: '#1A1D21', head: 'solid', ph: { hero: 'log-01', about: 'dro-01' }, desc: '넓은 사진 띠 위에 걸친 노란 판 · 면허 · 자격 3갈래 · 과정 카드(물류 · 운전 · 중장비 · 드론)' },
    vocare: { hx: ['rev', 'faq', 'loc'], name: '돌봄', sub: '간호조무 · 요양', hk: 'soft', a: '#2F7D6D', bg: '#F6FAF8', alt: '#EAF3EF', dk: '#173A33', pt: '#E9875B', head: 'solid', big: 1, ph: { hero: 'sen-01', about: 'hum-04' }, desc: '둥근 사진과 큰 글자 · 큰 버튼 · 실습 과정 안내(간호조무 · 요양보호 · 사회복지)' },
    voclassic: { hx: ['num', 'faq', 'loc'], name: '전통 학교', sub: '전통 직업전문학교(격식)', hk: 'formal', a: '#1E3A5F', bg: '#FBFAF7', alt: '#F2EFE8', dk: '#14263D', pt: '#B08D57', serif: 1, head: 'center', ph: { hero: 'lec-03' }, desc: '문장 · 대칭 · 명조 제목 · 액자 사진의 격식 있는 첫 화면 · 교육 이념 · 공지 · 과정 목록' } };
  const AUTO = [['자동', '공개 과정 · 후기 데이터로 채워요']];
  const TX = (variant, data) => S2('text', { variant, ...data });
  const X = (hpt, data, variant) => TX(variant || 'features', Object.assign({ hpt, cols: AUTO }, data));
  const stepsV = [['무료 상담', '지금 상황과 원하는 일을 듣고, 맞는 과정을 함께 골라요.'], ['내일배움카드 발급', '고용24에서 신청하고 고용센터에서 받아요. 준비할 것은 상담 때 알려 드려요.'], ['훈련', '출결과 진도가 자동으로 기록돼요.'], ['수료 · 취업 연계', '수료 기준을 채우면 수료증을 받고, 이력서 · 면접 상담을 이어 가요.']];
  const B = (title, sub, extra) => S2('banner', Object.assign({ title, sub }, extra));
  const BUILD = {
    vofield: () => [B('손에 익힌 기술은\n평생 내 편이에요', `${org()}에서 실습 중심 과정으로 자격증과 취업까지 준비해요. 훈련비 지원 여부는 과정마다 확인할 수 있어요.`, { eyebrow: '국민내일배움카드 훈련기관', cta: '모집 중인 과정 보기', cta2: '상담 문의', hk: 'vofield' }),
      X('v4-num', { k: 'free', fb: { eyebrow: '국비 지원', title: '카드가 없어도\n시작할 수 있어요', sub: '국민내일배움카드는 상담 때 신청 방법부터 함께 확인해요. 훈련비 지원 여부는 고용24에서 바로 확인할 수 있어요.', w24: 1, link: '고용24에서 지원 자격 확인' }, eyebrow: '국비 지원', title: '배우는 동안\n돈 걱정은 덜어 드려요', sub: '국민내일배움카드가 있으면 훈련비를 지원받을 수 있어요. 카드가 없어도 괜찮아요. 신청부터 함께 도와 드려요.' }, 'stats'),
      X('v4-cards', { k: 'tall', eyebrow: '모집 · 개강 일정', title: '지금 모집 중인 과정' }),
      X('v4-sched', { eyebrow: '훈련 일정', title: '개강일 · 기간 · 자부담을\n한 표로 확인해요' }),
      X('v4-steps', { eyebrow: '시작하는 방법', title: '상담부터 첫 출근까지,\n네 걸음이면 돼요', cols: stepsV }, 'timeline'),
      X('v4-quote', { k: 'photo', title: '오래 남는 기술은 손으로 익혀요.' }),
      X('v4-cta', { k: 'dark', title: '어떤 과정이 맞을지\n모르겠다면, 물어보세요', sub: '구직 · 재직 상황을 알려 주시면 들을 수 있는 과정을 안내해 드려요.' }, 'cta')],
    vokdt: () => [B('일을 바꾸는 시간,\n여기서 시작해요', `${org()}에서 현업에 바로 쓰는 디지털 기술을 배워요. 내일배움카드로 훈련비를 지원받을 수 있는지 먼저 확인해 보세요.`, { eyebrow: 'K-디지털 트레이닝 · 국비 지원', cta: '모집 중인 과정 보기', cta2: '국비 자격 확인', k2: 'w24', hk: 'vokdt' }),
      X('v4-cards', { k: 'clean', eyebrow: '모집 중인 과정', title: '나에게 맞는\n다음 걸음', sub: '전공이나 경력이 없어도 괜찮아요. 과정마다 기간 · 시간 · 수강료를 먼저 보여 드려요.' }),
      X('v4-sched', { eyebrow: '훈련 일정', title: '개강 일정' }),
      X('v4-num', { k: 'count', title: '', fb: { eyebrow: '처음이어도 괜찮아요', title: '전공이 없어도\n시작할 수 있어요', sub: '첫 주는 모두 같은 기초 수업으로 시작해요. 따라오는 속도는 멘토와 함께 맞춰요.', flip: 1 } }, 'stats'),
      X('v4-steps', { eyebrow: '수업 방식', title: '강의만 듣고\n끝나지 않아요', cols: [['직접 만들며 배워요', '수업마다 실습 과제가 있어 배운 것을 바로 써 봐요.'], ['기록이 남아요', '출결과 진도가 자동으로 기록되고, 수료하면 수료증을 받아요.'], ['끝난 뒤에도 함께해요', '이력서 · 포트폴리오 상담과 채용 소식을 이어서 안내해요.']] }, 'timeline'),
      X('v4-quote', { title: '새로운 일은, 배우기로 마음먹은 날 시작돼요.' }),
      X('v4-cta', { k: 'center', title: '지원 자격,\n먼저 확인해 보세요', sub: '정확한 지원 범위는 고용24에서 확인돼요.' }, 'cta')],
    voupskill: () => [B('퇴근 후 두 시간,\n일이 달라져요', `${org()}의 재직자 과정은 평일 저녁과 주말에 열려요. 회사에 다니면서도 내일배움카드로 들을 수 있어요.`, { eyebrow: '재직자 · 사업주 훈련', cta: '저녁 · 주말 과정 보기', cta2: '국비 자격 확인', k2: 'w24', hk: 'voupskill', my: '내 수강 현황' }),
      X('v4-sched', { eyebrow: '요일 · 시간으로 고르기', title: '일정이 맞는 과정을\n먼저 보여 드려요' }),
      X('v4-pil', { eyebrow: '재직자라서 좋은 점', title: '일하면서 배우기 좋게\n짜여 있어요', cols: [['저녁 · 주말 수업', '평일 저녁과 주말에 열려 근무 시간과 겹치지 않아요.'], ['회사 업무에 바로', '실무 사례와 과제로 배워 다음 날 업무에 써요.'], ['기록이 남아요', '출결과 진도가 자동으로 기록되고, 수료하면 수료증을 받아요.']] }, 'timeline'),
      X('v4-quote', { title: '배운 다음 날, 일하는 방식이 달라져요.' }),
      X('v4-elig', { eyebrow: '국민내일배움카드', title: '재직자도\n지원받을 수 있어요', sub: '회사에 다니는 분도 카드를 발급받아 훈련비를 지원받을 수 있어요.' }),
      X('v4-cta', { k: 'center', title: '일정이 맞는 과정,\n상담으로 함께 찾아요', sub: '가능한 요일과 시간을 알려 주시면 맞는 과정을 안내해 드려요.' }, 'cta')],
    vocert: () => [B('한 번에\n합격까지', `${org()}에서 필기부터 실기까지 자격 시험을 준비해요. 시험 일정에 맞춘 과정으로 차근차근 따라오면 돼요.`, { eyebrow: '국가기술자격 · 기능사 준비', cta: '자격 과정 보기', cta2: '상담 문의', hk: 'vocert' }),
      X('v4-sched', { eyebrow: '지금 모집 중', title: '자격 과정 일정' }),
      X('v4-steps', { k: 'line', eyebrow: '합격까지', title: '시험 일정에 맞춰\n세 단계로 준비해요', cols: [['필기', '핵심 이론과 기출 문제로 필기를 먼저 준비해요.'], ['실기', '실제 장비로 시험 과제를 반복 연습해요.'], ['합격 · 취업', '수료증과 자격으로 다음 일을 준비해요.']] }, 'timeline'),
      X('v4-num', { k: 'cert', title: '', fb: { eyebrow: '시험 준비', title: '기출과 실기,\n둘 다 챙겨요', sub: '필기는 기출 문제로, 실기는 실제 장비로 시험 과제를 반복해요. 시험 일정에 맞춰 과정이 열려요.' } }, 'stats'),
      X('v4-quote', { title: '연습한 만큼, 시험장에서 손이 기억해요.' }),
      X('v4-cta', { k: 'dark', title: '다음 시험,\n함께 준비해요', sub: '목표 자격과 시험 일정을 알려 주시면 맞는 과정을 안내해 드려요.' }, 'cta')],
    vocook: () => [B('손끝에서\n시작되는 맛', `${org()}에서 조리 · 제과제빵을 실습실에서 직접 만들며 배워요. 자격증 준비부터 창업 준비까지 이어져요.`, { eyebrow: '조리 · 제과제빵 실습 과정', cta: '모집 중인 과정 보기', cta2: '상담 문의', hk: 'vocook' }),
      X('v4-strip', { eyebrow: '실습실의 하루', title: '눈으로 보고,\n손으로 익혀요', sub: '수업 대부분이 실습이에요. 재료를 다루는 법부터 차근차근 배워요.' }),
      X('v4-cards', { k: 'clean', eyebrow: '지금 모집 중', title: '이번 기수 과정' }),
      X('v4-steps', { eyebrow: '배우는 순서', title: '기초부터 자격증까지', cols: [['기초 실습', '칼 쓰는 법 · 계량 · 위생부터 익혀요.'], ['메뉴 실습', '자격 시험 과제와 실전 메뉴를 반복해요.'], ['자격 · 취업', '수료증과 자격으로 주방 · 매장 취업을 준비해요.']] }, 'timeline'),
      X('v4-quote', { k: 'photo', title: '처음 만든 빵의 냄새는 오래 기억에 남아요.' }),
      X('v4-cta', { k: 'center', title: '어떤 과정이 맞을지\n물어보세요', sub: '조리 · 제과제빵 · 바리스타 중 원하는 분야를 알려 주세요.' }, 'cta')],
    vobeauty: () => [B('손끝으로\n자신을 표현해요', `${org()}에서 헤어 · 메이크업 · 네일을 실습으로 배우고, 자격증과 취업을 준비해요.`, { eyebrow: '미용 · 뷰티 아카데미', cta: '과정 둘러보기', cta2: '상담 문의', hk: 'vobeauty' }),
      X('v4-cards', { k: 'rows', eyebrow: '이번 기수', title: '모집 중인 과정' }),
      X('v4-pil', { eyebrow: '배우는 분야', title: '세 가지 길 중\n하나를 골라요', cols: [['헤어', '커트 · 펌 · 컬러를 마네킹과 모델로 연습해요.'], ['메이크업', '피부 표현부터 무대 · 웨딩 메이크업까지 배워요.'], ['네일', '케어 · 젤 · 아트를 자격 시험 기준으로 익혀요.']] }, 'timeline'),
      X('v4-quote', { title: '거울 앞에서 배운 기술이 누군가의 하루를 바꿔요.' }),
      X('v4-steps', { eyebrow: '배우는 방식', title: '보고, 따라 하고,\n내 것으로 만들어요', cols: [['시연', '강사의 시연을 가까이에서 보며 순서를 익혀요.'], ['실습', '모델과 실습 도구로 손에 익을 때까지 연습해요.'], ['자격 · 포트폴리오', '자격 시험과 작품 사진으로 다음 일을 준비해요.']] }, 'timeline'),
      X('v4-cta', { k: 'center', eyebrow: '상담', title: '원하는 분야를\n알려 주세요', sub: '헤어 · 메이크업 · 네일 중 맞는 과정을 안내해 드려요.' }, 'cta')],
    vodesign: () => [B('보는 사람을\n움직이는 화면', `${org()}에서 디자인 · 영상 · 사진을 실제 작업으로 배워요. 포트폴리오를 만들며 다음 일을 준비해요.`, { eyebrow: '디자인 · 영상 제작 과정', cta: '모집 중인 과정 보기', cta2: '국비 자격 확인', k2: 'w24', hk: 'vodesign' }),
      X('v4-cards', { k: 'clean', eyebrow: '모집 중', title: '이번 기수 과정' }),
      X('v4-num', { k: 'count', title: '', fb: { eyebrow: '작업실', title: '도구보다\n보는 눈을 먼저 길러요', sub: '좋은 작업을 많이 보고, 왜 좋은지 말로 설명하는 연습부터 해요. 그다음에 도구를 손에 익혀요.', flip: 1 } }, 'stats'),
      X('v4-steps', { k: 'line', eyebrow: '작업 방식', title: '수업이 곧\n포트폴리오예요', cols: [['기획', '무엇을 왜 만드는지부터 정리해요.'], ['제작', '실제 도구로 디자인 · 촬영 · 편집을 해요.'], ['발표', '완성한 작업을 모아 포트폴리오로 남겨요.']] }, 'timeline'),
      X('v4-quote', { title: '좋은 작업은 끝까지 만들어 본 경험에서 나와요.' }),
      X('v4-cta', { k: 'dark', title: '첫 작업,\n여기서 시작해요', sub: '관심 있는 분야를 알려 주시면 맞는 과정을 안내해 드려요.' }, 'cta')],
    vologi: () => [B('현장으로 바로\n이어지는 면허', `${org()}에서 물류 · 운전 · 중장비 자격을 실습으로 준비하고, 바로 일할 수 있는 현장으로 이어가요.`, { eyebrow: '물류 · 운전 · 중장비 훈련', cta: '모집 중인 과정 보기', cta2: '국비 자격 확인', k2: 'w24', hk: 'vologi' }),
      X('v4-pil', { eyebrow: '이런 분께 맞아요', title: '필요한 면허 · 자격부터\n골라 보세요', cols: [['운전 · 운송', '운송에 필요한 면허와 안전 교육을 준비해요.'], ['중장비', '굴착기 · 지게차 같은 장비를 실습장에서 다뤄요.'], ['물류 · 드론', '창고 관리와 드론 운용처럼 새 현장 기술을 배워요.']] }, 'timeline'),
      X('v4-cards', { k: 'clean', eyebrow: '지금 모집 중', title: '이번 기수 과정' }),
      X('v4-sched', { eyebrow: '훈련 일정', title: '면허 · 자격 과정 일정' }),
      X('v4-steps', { k: 'line', eyebrow: '진행 순서', title: '상담에서 현장까지', cols: stepsV }, 'timeline'),
      X('v4-elig', { eyebrow: '국민내일배움카드', title: '훈련비 지원,\n먼저 확인해요', sub: '구직자 · 재직자 · 자영업자 모두 신청할 수 있어요.' }),
      X('v4-cta', { k: 'dark', title: '어떤 면허가 필요한지\n물어보세요', sub: '하고 싶은 일을 알려 주시면 필요한 과정을 안내해 드려요.' }, 'cta')],
    vocare: () => [B('사람을 돌보는 일,\n차근차근 배워요', `${org()}에서 간호조무 · 요양보호 과정을 이론과 실습으로 배워요. 처음이어도 천천히 따라오면 돼요.`, { eyebrow: '간호조무 · 요양보호 과정', cta: '모집 중인 과정 보기', cta2: '상담 문의', hk: 'vocare' }),
      X('v4-steps', { eyebrow: '배우는 과정', title: '이론에서 실습까지\n함께해요', cols: [['이론 수업', '돌봄에 필요한 기본 지식을 쉬운 말로 배워요.'], ['실기 연습', '실습실에서 돌봄 기술을 직접 해 봐요.'], ['현장 실습', '기관 실습으로 실제 현장을 경험해요.'], ['자격 · 취업', '시험 준비와 취업 상담을 이어 가요.']] }, 'timeline'),
      X('v4-cards', { k: 'clean', eyebrow: '지금 모집 중', title: '이번 기수 과정' }),
      X('v4-sched', { eyebrow: '훈련 일정', title: '개강 일정과 자부담' }),
      X('v4-quote', { title: '누군가의 하루를 돌보는 일은, 배우는 만큼 따뜻해져요.' }),
      X('v4-elig', { eyebrow: '국민내일배움카드', title: '훈련비 지원을\n받을 수 있어요', sub: '구직 중이거나 일하고 있어도 신청할 수 있어요.' }),
      X('v4-cta', { k: 'center', title: '궁금한 점은\n편하게 물어보세요', sub: '전화로 천천히 안내해 드려요.' }, 'cta')],
    voclassic: () => [B('기술로 서는 사람을\n기릅니다', `${org()}는 실습 중심의 직업교육으로 지역 산업에 필요한 기술인을 길러 왔어요.`, { eyebrow: '고용노동부 지정 직업능력개발훈련기관', cta: '훈련 과정 안내', cta2: '상담 문의', hk: 'voclassic' }),
      X('v4-pil', { k: 'roman', eyebrow: '교육 이념', title: '성실 · 기술 · 책임', cols: [['성실', '배움의 기본은 출석과 꾸준함이에요.'], ['기술', '현장에서 통하는 기술을 손으로 익혀요.'], ['책임', '안전과 품질을 지키는 기술인을 길러요.']] }, 'timeline'),
      X('v4-sched', { eyebrow: '훈련 과정', title: '모집 중인 훈련 과정' }),
      X('v4-steps', { k: 'line', eyebrow: '입학 절차', title: '상담에서 입학까지', cols: [['입학 상담', '희망 직종과 일정을 듣고 맞는 과정을 안내해요.'], ['서류 · 카드 확인', '국민내일배움카드 등 필요한 서류를 확인해요.'], ['면접 · 선발', '훈련 의지와 일정을 함께 확인해요.'], ['입학', '오리엔테이션 후 훈련을 시작해요.']] }, 'timeline'),
      X('v4-quote', { title: '오늘 익힌 기술이 내일의 일터를 만들어요.' }),
      X('v4-cta', { k: 'formal', title: '입학 · 수강 상담', sub: '평일 상담 시간에 전화로 안내해 드려요.' }, 'cta')] };

  /* ── CSS ── */
  const SERIF = "'Noto Serif KR','Noto Serif CJK KR','AppleMyungjo','Batang',serif";
  function vars(id, s) { const D = DEF[id]; const a = /^#[0-9a-f]{6}$/i.test(String(s.color || '')) ? s.color : D.a; const dark = !!D.dark;
    const bg = D.bg, ink = dark ? '#F4F4F5' : '#14171A', mu = dark ? '#A1A1AA' : '#545B62';
    const pb = dark ? fit(a, '#000000', 4.6, '#ffffff') : CR(a, '#ffffff') >= 4.5 ? a : (CR(a, '#141414') >= 7 ? a : fit(a, '#ffffff', 4.6, '#000000'));
    const on = CR(pb, '#ffffff') >= 4.5 ? '#ffffff' : '#141414'; const at = fit(a, bg, 4.6, dark ? '#ffffff' : '#000000'); const ata = fit(a, D.alt, 4.6, dark ? '#ffffff' : '#000000');
    const dk = D.dk; const atd = fit(mix(a, '#ffffff', .2), dk, 4.6, '#ffffff');
    return `--v-a:${a};--v-p:${pb};--v-on:${on};--v-at:${at};--v-ata:${ata};--v-atd:${atd};--v-bg:${bg};--v-alt:${D.alt};--v-dk:${dk};--v-pt:${D.pt};--v-ink:${ink};--v-mu:${mu};--v-ln:${dark ? 'rgba(255,255,255,.14)' : 'rgba(20,23,26,.12)'};--v-card:${dark ? '#16161A' : '#ffffff'};--v-hf:${D.serif ? SERIF : 'inherit'}`; }
  function css(s) { const id = s.theme; if (!DEF[id]) return ''; const D = DEF[id];
    const fq = FAQ[id]; const fqBg = fq === 'dk' ? D.dk : fq === 'alt' ? D.alt : D.bg; const fqDark = fq === 'dk' || !!D.dark;
    const faqCss = `section.hpt.hps-faq{background:${fqBg};${fqDark ? `--ink:#ffffff;--mu:rgba(255,255,255,.74);--ln:rgba(255,255,255,.16);color:#fff;` : ''}}section.hpt.hps-faq h2,section.hpt.hps-faq h3{font-family:${D.serif ? SERIF : 'inherit'}${fqDark ? ';color:#fff' : ''}}section.hpt.hps-faq div.hps-ask.hps-ask{background:${fqDark ? 'rgba(255,255,255,.08)' : fq === 'alt' ? '#ffffff' : D.alt};color:${fqDark ? '#fff' : '#14171A'};border-radius:${D.serif ? 4 : 18}px;box-shadow:inset 0 0 0 1px ${fqDark ? 'rgba(255,255,255,.16)' : 'rgba(20,23,26,.1)'}}section.hpt.hps-faq div.hps-ask.hps-ask h3{color:${fqDark ? '#fff' : '#14171A'}}`;
    return `
/* v44 hp44-voc */${faqCss}.v4t-${id}{${vars(id, s)}}
${D.head === 'center' || id === 'vocook' || id === 'vocare' || id === 'vobeauty' || id === 'voclassic' ? `div.hps-top header.gh.hps-h{background:${D.bg}}` : ''}
section.v4.v4{background:var(--v-bg);color:var(--v-ink);font-variant-numeric:tabular-nums;word-break:keep-all}
.v4 *{box-sizing:border-box}:where(.v4) :where(h1,h2,h3,p,ol,ul,dl,dd,blockquote,figure){margin:0;padding:0}:where(.v4) :where(ol,ul){list-style:none}
.v4 a{text-decoration:none;color:inherit}.v4 img{display:block;width:100%;height:100%}.v4 figure{overflow:hidden}.v4-ph0{background:linear-gradient(135deg,${mix(D.a, '#ffffff', .8)},${mix(D.a, '#ffffff', .55)})}
.v4-w{max-width:1240px;margin:0 auto;padding:0 40px;position:relative}
section.v4.v4 h1,section.v4.v4 h2{font-family:var(--v-hf);color:var(--v-ink)}
section.v4.v4 h1 em,section.v4.v4 h2 em{font-style:normal;color:var(--v-at)}
.v4 h2{font-size:58px;line-height:1.15;letter-spacing:-.04em;font-weight:800}
.v4-k{font-size:15px;font-weight:700;letter-spacing:.02em;margin-bottom:20px;color:var(--v-at)}
.v4-lead{font-size:20px;line-height:1.7;color:var(--v-mu);margin-top:24px}.v4-cap{font-size:15px;color:var(--v-mu);margin-top:14px;line-height:1.6}
.v4-sub{font-size:21px;line-height:1.6;color:var(--v-mu);margin-top:30px;max-width:580px}
.v4-ey{font-size:15px;font-weight:700;letter-spacing:.02em;color:var(--v-at);margin-bottom:26px}
.v4-bs{display:flex;gap:12px;flex-wrap:wrap;margin-top:42px}
.v4-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:60px;padding:0 30px;border-radius:999px;font-size:17px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;transition:transform .18s,background .18s}
.v4-b:hover{transform:translateY(-1px)}.v4-b.p{background:var(--v-p);color:var(--v-on)}.v4-b.o{box-shadow:inset 0 0 0 1.5px var(--v-ln);color:var(--v-ink)}
.v4 a:focus-visible{outline:3px solid ${al(D.a, .5)};outline-offset:3px}
.v4-ln{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:17px;font-weight:700;border-bottom:2px solid currentColor;padding-top:6px;margin-top:28px}
.v4-top{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-bottom:60px}.v4-top .v4-ln,.v4-top .v4-lead{margin-top:0;max-width:440px}.v4-more{margin-top:40px}
section.v4:not(.v4-hero){padding:144px 0}
section.v4.v4-alt{background:var(--v-alt)}section.v4.v4-dk{background:var(--v-dk);--v-ink:#fff;--v-mu:rgba(255,255,255,.72);--v-ln:rgba(255,255,255,.28);--v-at:var(--v-atd)}
.v4-paths{display:flex;flex-wrap:wrap;font-size:15.5px;color:var(--v-mu)}.v4-paths a{display:flex;align-items:center;gap:8px;min-height:52px;padding:0 26px;border-right:1px solid var(--v-ln)}.v4-paths a:first-child{padding-left:0}.v4-paths a:last-child{border:0}.v4-paths b{color:var(--v-ink);font-weight:700}
.v4-paths.line{margin-top:40px;border-top:1px solid var(--v-ln)}

/* 1 전면 사진 */
section.v4.v4h-full{position:relative;height:880px;min-height:min(100vh,880px);display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;background:var(--v-dk);--v-ink:#fff;--v-mu:rgba(255,255,255,.86);--v-ln:rgba(255,255,255,.26);--v-at:${fit(mix(D.a, '#ffffff', .4), '#11161C', 6, '#ffffff')}}
.v4-bgph{position:absolute;inset:0}.v4-bgph::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,15,20,.84),rgba(10,15,20,.56) 42%,rgba(10,15,20,.06) 76%),linear-gradient(0deg,rgba(10,15,20,.62),rgba(10,15,20,0) 42%)}
.v4-fullw{width:100%;padding-bottom:124px;z-index:1}.v4h-full h1{font-size:92px;line-height:1.07;letter-spacing:-.045em;font-weight:800;max-width:880px}
.v4h-full .v4-b.o{background:rgba(255,255,255,.12);backdrop-filter:blur(8px);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)}
.v4-fullq{position:absolute;left:0;right:0;bottom:0;z-index:1;border-top:1px solid rgba(255,255,255,.22)}.v4-fullq .v4-paths a{min-height:72px}
/* 2 가운데 */
section.v4.v4h-center{padding-top:120px;text-align:center}.v4h-center h1{font-size:92px;line-height:1.07;letter-spacing:-.055em;font-weight:800;margin-top:34px}
.v4-pill{display:inline-flex;align-items:center;gap:10px;font-size:14.5px;font-weight:600;color:var(--v-mu);padding:6px 16px 6px 6px;border:1px solid var(--v-ln);border-radius:999px}.v4-pill b{background:var(--v-p);color:var(--v-on);font-size:13px;padding:4px 10px;border-radius:999px}
.v4h-center .v4-sub{margin:30px auto 0;max-width:640px}.v4h-center .v4-bs{justify-content:center}.v4-stage{margin-top:72px;height:600px;border-radius:28px}
.v4h-center .v4-paths{justify-content:center;border:0;margin-top:22px}
/* 3 분할 */
.v4-splitg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:760px}
.v4-splitl{padding:120px 64px 80px max(40px,calc((100vw - 1240px)/2 + 40px));display:flex;flex-direction:column;justify-content:center}
.v4h-split h1{font-size:84px;line-height:1.08;letter-spacing:-.05em;font-weight:800}.v4-splitph{min-height:760px}
.v4-next{display:grid;grid-template-columns:1fr auto;gap:2px 16px;margin-top:48px;padding:20px 0;border-top:1px solid var(--v-ln);border-bottom:1px solid var(--v-ln);max-width:520px;align-items:center}
.v4-next small{grid-column:1;font-size:13.5px;color:var(--v-at);font-weight:700}.v4-next b{grid-column:1;font-size:20px;letter-spacing:-.02em}.v4-next span{grid-column:1;font-size:15px;color:var(--v-mu)}.v4-next svg{grid-column:2;grid-row:1/4}
.v4h-split .v4-paths.line{margin-top:0}
/* 4 포스터 · 8 판: 노란 색면은 디자인 포인트(D.a) 그대로 — 기관 색은 버튼 · 강조에 쓴다 */
section.v4.v4h-poster{background:${D.a};padding:96px 0 0;--v-ink:#141414;--v-mu:rgba(20,20,20,.78);--v-ln:rgba(20,20,20,.25);--v-at:#141414;--v-p:#141414;--v-on:${D.a}}
.v4-posg{display:grid;grid-template-columns:1.25fr 1fr;gap:40px;align-items:center}
.v4h-poster h1{font-size:150px;line-height:.96;letter-spacing:-.065em;font-weight:900}.v4h-poster .v4-ey{font-size:16px;text-transform:none}
.v4-circle{width:min(520px,100%);aspect-ratio:1;border-radius:50%;justify-self:end;box-shadow:0 0 0 14px rgba(20,20,20,.08)}
.v4-postk{display:flex;align-items:center;gap:28px;justify-content:center;font-size:54px;font-weight:900;letter-spacing:-.04em;color:rgba(20,20,20,.66);margin-top:64px;white-space:nowrap;overflow:hidden}.v4-postk i{width:72px;height:3px;background:rgba(20,20,20,.5)}
/* 5 콜라주 */
section.v4.v4h-collage{padding:104px 0 0}.v4-colg{display:grid;grid-template-columns:1fr 1.1fr;gap:64px;align-items:center}
.v4h-collage h1{font-size:86px;line-height:1.1;letter-spacing:-.05em;font-weight:800}
.v4-col{display:grid;grid-template-columns:1.15fr 1fr;grid-template-rows:260px 300px;gap:16px}.v4-col figure,.v4-col .v4-ph0{border-radius:18px}
.v4-col .c1{grid-row:1/3}.v4-col .c2{margin-top:-24px}.v4-col .c3{margin-bottom:-24px}
/* 6 잡지 */
section.v4.v4h-mag{padding:88px 0 0}.v4-magg{display:grid;grid-template-columns:1.05fr .9fr .35fr;gap:0;align-items:end;min-height:720px}
.v4-issue{position:absolute;right:40px;top:0;writing-mode:vertical-rl;font-size:13.5px;letter-spacing:.32em;color:var(--v-mu)}
.v4-magt{grid-column:1;grid-row:1;z-index:1;padding-bottom:80px}.v4h-mag h1{font-size:96px;line-height:1.12;letter-spacing:-.05em;font-weight:700;margin-right:-160px}
.v4-magph{grid-column:2;grid-row:1;height:720px;border-radius:0}.v4-magsm{grid-column:3;grid-row:1;height:260px;margin-left:20px;align-self:end}
/* 7 다크 시네마 */
section.v4.v4h-cine{padding:168px 0 0;background:#0B0B0D}section.v4.v4h-cine h1 em{color:var(--v-a)}.v4h-cine h1{font-size:112px;line-height:1.02;letter-spacing:-.06em;font-weight:800;max-width:1100px}
.v4h-cine h1 em{color:var(--v-a)}.v4-cinerow{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-top:8px}.v4-cinerow .v4-bs{margin-top:0;flex:none}
.v4-cineph{margin-top:80px;height:560px;position:relative}.v4-cineph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,11,13,.55),rgba(11,11,13,0) 30%,rgba(11,11,13,0) 70%,rgba(11,11,13,.8))}
.v4h-cine .v4-paths.line{margin-top:0;border-top:0}
/* 8 띠 + 판 */
section.v4.v4h-band{padding:0}.v4-bandph{height:560px}
.v4-panel{position:relative;margin-top:-220px;background:${D.a};color:#141414;padding:64px 64px 56px;max-width:860px;--v-ink:#141414;--v-mu:rgba(20,20,20,.8);--v-at:#141414;--v-p:#141414;--v-on:${D.a};--v-ln:rgba(20,20,20,.3)}
.v4h-band h1{font-size:80px;line-height:1.08;letter-spacing:-.05em;font-weight:900}.v4h-band .v4-panel .v4-sub{max-width:620px}
/* 9 둥근 사진 */
section.v4.v4h-soft{padding:104px 0 0}.v4-softg{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.v4h-soft h1{font-size:80px;line-height:1.14;letter-spacing:-.045em;font-weight:800}.v4h-soft .v4-sub{font-size:22px}.v4h-soft .v4-b{min-height:64px;font-size:18px}
.v4-blob{aspect-ratio:1/1.05;border-radius:46% 54% 48% 52%/52% 44% 56% 48%}
/* 10 격식 */
section.v4.v4h-formal{padding:96px 0 0;text-align:center}.v4-formal{display:flex;flex-direction:column;align-items:center}
.v4-crest{position:relative;width:88px;height:88px;color:var(--v-pt);margin-bottom:28px}.v4-crest svg{position:absolute;inset:0}.v4-crest span{position:absolute;inset:0;display:grid;place-items:center;padding-top:14px;font-family:${SERIF};font-size:30px;font-weight:700;color:var(--v-a)}
.v4h-formal h1{font-size:76px;line-height:1.2;letter-spacing:-.04em;font-weight:700}
.v4-rule{display:flex;justify-content:center;margin-top:30px}.v4-rule i{width:120px;height:1px;background:var(--v-pt);position:relative}.v4-rule i::after{content:"";position:absolute;left:50%;top:-4px;width:9px;height:9px;transform:translateX(-50%) rotate(45deg);background:var(--v-pt)}
.v4h-formal .v4-sub{margin:26px auto 0}.v4h-formal .v4-bs{justify-content:center}
.v4-frame{width:100%;margin-top:64px;height:520px;outline:1px solid var(--v-pt);outline-offset:10px}
.v4-paths.formal{justify-content:center;width:100%;margin-top:48px;border-bottom:1px solid var(--v-ln)}

/* ── 섹션 ── */
.v4-numg{display:grid;grid-template-columns:1.1fr 1fr;gap:80px;align-items:center}
.v4-big{font-size:280px;line-height:.82;font-weight:800;letter-spacing:-.07em;color:var(--v-ink);font-family:var(--v-hf)}.v4-big span{color:var(--v-at);font-size:.5em;letter-spacing:-.03em}
.v4-numg h2{font-size:46px}
.v4-fbg{display:grid;grid-template-columns:1.2fr 1fr;gap:80px;align-items:center}.v4-fbg.flip .v4-fbph{order:2}.v4-fbph{aspect-ratio:4/3.1;border-radius:var(--v-fr,20px)}.v4-fbt h2{font-size:52px}
.v4-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}.v4-cards.n1{grid-template-columns:minmax(0,420px)}.v4-cards.n2{grid-template-columns:repeat(2,minmax(0,520px))}
.v4-card{display:flex;flex-direction:column}.v4-cph{aspect-ratio:4/3;border-radius:18px}.v4-cph img{transition:transform .5s}.v4-card:hover .v4-cph img{transform:scale(1.03)}
.v4-tag{margin-top:24px;font-size:14px;font-weight:700;color:var(--v-at)}.v4-card b{font-size:27px;letter-spacing:-.035em;line-height:1.3;margin-top:8px;font-family:var(--v-hf)}
.v4-meta{font-size:15px;color:var(--v-mu);margin-top:16px;padding-top:16px;border-top:1px solid var(--v-ln);line-height:1.55}
.v4-tall{position:relative;display:block;aspect-ratio:4/5.2;border-radius:20px;overflow:hidden;color:#fff;background:var(--v-dk)}.v4-tph{position:absolute;inset:0}
.v4-tall::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,14,18,.88),rgba(10,14,18,.3) 46%,rgba(10,14,18,0) 70%)}
.v4-tt{position:absolute;left:30px;right:30px;bottom:30px;z-index:1;display:flex;flex-direction:column}.v4-tt small{font-size:14px;font-weight:700;color:${fit(mix(D.a, '#ffffff', .45), '#11161C', 6, '#ffffff')}}.v4-tt b{font-size:29px;line-height:1.25;letter-spacing:-.03em;margin-top:10px}.v4-tt small.m{color:rgba(255,255,255,.82);font-weight:500;margin-top:12px;line-height:1.5}
.v4-bd{position:absolute;top:22px;left:22px;z-index:1;background:#fff;color:#14171A;font-size:14px;font-weight:700;font-style:normal;padding:8px 14px;border-radius:999px}
.v4-rows{border-top:2px solid var(--v-ink)}.v4-rows a{display:grid;grid-template-columns:72px 1fr auto 24px;gap:24px;align-items:center;padding:30px 0;border-bottom:1px solid var(--v-ln);transition:background .2s}
.v4-rows a:hover{background:${al(D.a, .05)}}.v4-rows i{font-style:normal;font-size:18px;font-weight:800;color:var(--v-at);font-family:var(--v-hf)}
.v4-rn{display:flex;flex-direction:column;min-width:0}.v4-rn b{font-size:28px;letter-spacing:-.035em;line-height:1.3;font-family:var(--v-hf)}.v4-rn small{font-size:15.5px;color:var(--v-mu);margin-top:6px}.v4-rp{font-size:16px;font-weight:700}
.v4-stg{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:start}.v4-stph{border-radius:24px;aspect-ratio:4/5;position:sticky;top:40px}
.v4-st{margin-top:52px}.v4-st li{display:grid;grid-template-columns:68px 1fr;gap:8px;padding:34px 0;border-top:1px solid var(--v-ln)}.v4-st li:last-child{border-bottom:1px solid var(--v-ln)}
.v4-st i,.v4-line i,.v4-pil i{font-style:normal;font-size:19px;font-weight:800;color:var(--v-at);font-family:var(--v-hf)}.v4-st b{display:block;font-size:25px;letter-spacing:-.03em;line-height:1.3}.v4-st p{font-size:17px;color:var(--v-mu);margin-top:10px;line-height:1.65}
.v4-line{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin-top:64px;border-top:2px solid var(--v-ink)}.v4-line.n4{grid-template-columns:repeat(4,minmax(0,1fr))}.v4-line.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.v4-line li{padding:32px 32px 0 0}.v4-line b{display:block;font-size:30px;letter-spacing:-.035em;margin-top:18px;font-family:var(--v-hf)}.v4-line p{font-size:17px;color:var(--v-mu);margin-top:12px;line-height:1.65}
.v4-pil{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:56px;margin-top:64px}.v4-pil li{border-top:1px solid var(--v-ln);padding-top:30px}.v4-pil b{display:block;font-size:30px;letter-spacing:-.035em;margin-top:18px;font-family:var(--v-hf)}.v4-pil p{font-size:17px;color:var(--v-mu);margin-top:12px;line-height:1.65}
section.v4.v4-q{position:relative;padding:0;min-height:680px;display:flex;align-items:center;color:#fff;overflow:hidden;background:var(--v-dk)}.v4-qbg{position:absolute;inset:0}.v4-qbg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,18,24,.8),rgba(12,18,24,.44))}
.v4-qw{width:100%;z-index:1;padding-top:120px;padding-bottom:120px}.v4-qw blockquote{font-size:58px;line-height:1.28;letter-spacing:-.04em;font-weight:700;max-width:980px;color:#fff;font-family:var(--v-hf)}
.v4-qw blockquote::before{content:"“";display:block;font-size:110px;line-height:.6;color:${D.a};margin-bottom:22px}.v4-qw .v4-cite{color:rgba(255,255,255,.78)}
.v4-qp{text-align:center}.v4-qp blockquote{font-size:52px;line-height:1.34;letter-spacing:-.045em;font-weight:700;max-width:1000px;margin:0 auto;font-family:var(--v-hf)}.v4-cite{margin-top:36px;font-size:17px;color:var(--v-mu)}
.v4-strip{display:grid;grid-template-columns:1.3fr 1fr 1.1fr;gap:16px;margin-top:64px;padding:0 16px}.v4-sp{height:460px;border-radius:16px}.v4-strip .v4-sp:nth-child(2){margin-top:56px;height:404px}
.v4-elg{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}.v4-elr ul{border-top:1px solid var(--v-ln)}.v4-elr li{font-size:19px;padding:20px 0 20px 34px;border-bottom:1px solid var(--v-ln);position:relative}
.v4-elr li::before{content:"";position:absolute;left:4px;top:28px;width:14px;height:8px;border-left:2.5px solid var(--v-at);border-bottom:2.5px solid var(--v-at);transform:rotate(-45deg)}.v4-elr .v4-bs{margin-top:28px}
.v4-nl{border-top:2px solid var(--v-ink)}.v4-nl a{display:grid;grid-template-columns:120px 1fr 24px;gap:24px;align-items:center;min-height:76px;border-bottom:1px solid var(--v-ln);font-size:19px}.v4-nl time{font-size:16px;color:var(--v-mu);font-family:var(--v-hf)}
.v4-nc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.v4-nc.n1{grid-template-columns:minmax(0,420px)}.v4-nc.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.v4-nc a{display:flex;flex-direction:column;gap:18px;height:100%;padding:30px;border-radius:var(--v-fr,18px);background:var(--v-card,#fff);box-shadow:inset 0 0 0 1px var(--v-ln);transition:transform .2s}.v4-nc a:hover{transform:translateY(-2px)}
.v4-ncd{display:flex;align-items:baseline;gap:8px;color:var(--v-at)}.v4-ncd b{font-size:44px;line-height:1;letter-spacing:-.04em;font-family:var(--v-hf)}.v4-ncd small{font-size:15px;font-weight:700}
.v4-nct{font-size:20px;font-weight:700;line-height:1.45;letter-spacing:-.02em;flex:1}.v4-ncm{display:flex;align-items:center;gap:6px;font-size:15px;color:var(--v-mu);font-weight:600}
.v4-nsp{display:grid;grid-template-columns:.8fr 1.2fr;gap:80px;align-items:start}.v4-nsp .v4-ln{margin-top:28px}
.v4-gov{display:inline-flex;align-items:center;font-style:normal;font-size:13px;font-weight:800;letter-spacing:0;padding:3px 9px;border-radius:999px;background:var(--v-p);color:var(--v-on);margin-right:8px;vertical-align:2px}.v4-gov.w{background:#fff;color:#14171A}
.v4-hrd{display:inline-flex;font-style:normal;font-size:13px;font-weight:700;padding:3px 9px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--v-ln);color:var(--v-mu)}
.v4-sch{border-top:2px solid var(--v-ink)}.v4-shd,.v4-sch a{display:grid;grid-template-columns:minmax(0,2.2fr) 1fr 1.1fr 1.4fr 1fr 24px;gap:20px;align-items:center}
.v4-shd{font-size:14px;font-weight:700;color:var(--v-mu);padding:14px 0;border-bottom:1px solid var(--v-ln)}.v4-sch a{padding:24px 0;border-bottom:1px solid var(--v-ln);min-height:76px;transition:background .2s}.v4-sch a:hover{background:${al(D.a, .05)}}
.v4-sn{display:flex;flex-direction:column;gap:8px;min-width:0}.v4-sn b{font-size:21px;letter-spacing:-.03em;line-height:1.35;font-family:var(--v-hf)}.v4-sb{display:flex;gap:6px;flex-wrap:wrap}.v4-sb:empty{display:none}
.v4-sc{font-size:16px;color:var(--v-ink)}.v4-sc.pr{font-weight:800}
.v4-ctag{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:end}.v4-ctag .v4-bs{flex-direction:column;margin:0}.v4-ctag .v4-b{justify-content:space-between;min-height:70px;font-size:19px}
.v4-ctag h2{font-size:62px}.v4-ctag.k-center,.v4-ctag.k-formal{grid-template-columns:1fr;text-align:center;justify-items:center}.v4-ctag.k-center .v4-bs,.v4-ctag.k-formal .v4-bs{flex-direction:row;justify-content:center}.v4-ctag.k-center .v4-b,.v4-ctag.k-formal .v4-b{justify-content:center;min-height:60px;font-size:17px}
.v4-ctag.k-formal{border-top:1px solid var(--v-pt);border-bottom:1px solid var(--v-pt);padding-top:72px;padding-bottom:72px}.v4-ctag.k-formal h2{font-size:48px}

@media (max-width:760px){
  .v4-w{padding:0 22px}.v4 h2,.v4-ctag h2,.v4-numg h2{font-size:34px;line-height:1.22}.v4-lead{font-size:17px}.v4-sub{font-size:17px;margin-top:20px}.v4-ey{font-size:13.5px;margin-bottom:18px}
  section.v4:not(.v4-hero){padding:84px 0}.v4-bs{flex-direction:column;margin-top:30px}.v4-b{width:100%;min-height:56px;font-size:16px}
  .v4-top{display:block;margin-bottom:34px}.v4-top .v4-ln,.v4-top .v4-lead{margin-top:16px}
  .v4-paths{flex-direction:column;flex-wrap:nowrap}.v4-paths a{padding:0 2px;border-right:0;border-bottom:1px solid var(--v-ln);min-height:52px;font-size:15px;justify-content:space-between}.v4-paths a:last-child{border-bottom:0}.v4-paths.line{margin-top:28px}
  .v4h-full{height:calc(100svh - 64px);min-height:640px;max-height:800px}.v4-bgph::after{background:linear-gradient(0deg,rgba(10,15,20,.93),rgba(10,15,20,.62) 50%,rgba(10,15,20,.18) 82%)}
  .v4-fullw{padding-bottom:112px}.v4h-full h1{font-size:42px;line-height:1.16}.v4-fullq .v4-w{padding:0}.v4-fullq .v4-paths{display:grid;grid-template-columns:repeat(3,1fr)}.v4-fullq .v4-paths a{flex-direction:column;justify-content:center;gap:2px;text-align:center;min-height:82px;padding:10px 4px;border-bottom:0;border-right:1px solid var(--v-ln);font-size:13.5px}.v4-fullq .v4-paths a:last-child{border-right:0}
  section.v4.v4h-center{padding-top:60px}.v4h-center h1{font-size:42px;line-height:1.16;margin-top:24px}.v4-pill{font-size:13px}.v4-stage{margin-top:40px;height:300px;border-radius:20px}.v4h-center .v4-paths{text-align:left}
  .v4-splitg{grid-template-columns:1fr;min-height:0}.v4-splitl{padding:56px 22px 40px}.v4h-split h1{font-size:42px;line-height:1.16}.v4-splitph{min-height:0;height:300px;order:-1}.v4-next{margin-top:32px}
  section.v4.v4h-poster{padding-top:56px}.v4-posg{grid-template-columns:1fr;gap:36px}.v4h-poster h1{font-size:64px;line-height:1}.v4-circle{width:78%;justify-self:center}.v4-postk{font-size:28px;gap:14px;margin-top:36px}.v4-postk i{width:28px}
  section.v4.v4h-collage{padding-top:52px}.v4-colg{grid-template-columns:1fr;gap:40px}.v4h-collage h1{font-size:42px;line-height:1.18}.v4-col{grid-template-rows:180px 200px;gap:10px}
  section.v4.v4h-mag{padding-top:44px}.v4-magg{grid-template-columns:1fr;min-height:0}.v4-issue{display:none}.v4-magt{padding-bottom:36px;grid-row:1}.v4h-mag h1{font-size:44px;line-height:1.2;margin-right:0}.v4-magph{grid-column:1;grid-row:2;height:420px}.v4-magsm{display:none}
  section.v4.v4h-cine{padding-top:120px}.v4h-cine h1{font-size:44px;line-height:1.12}.v4-cinerow{display:block}.v4-cinerow .v4-bs{margin-top:28px}.v4-cineph{margin-top:44px;height:280px}
  .v4-bandph{height:300px}.v4-panel{margin-top:-60px;padding:36px 24px 32px}.v4h-band h1{font-size:40px;line-height:1.14}
  section.v4.v4h-soft{padding-top:52px}.v4-softg{grid-template-columns:1fr;gap:36px}.v4h-soft h1{font-size:42px;line-height:1.2}.v4h-soft .v4-sub{font-size:18px}
  section.v4.v4h-formal{padding-top:56px}.v4-crest{width:72px;height:72px;margin-bottom:20px}.v4h-formal h1{font-size:38px;line-height:1.26}.v4-frame{height:240px;margin-top:44px;outline-offset:6px}.v4-paths.formal{text-align:left}
  .v4-numg,.v4-fbg{grid-template-columns:1fr;gap:32px}.v4-fbg.flip .v4-fbph{order:0}.v4-fbt h2{font-size:32px}.v4-big{font-size:140px}
  .v4-cards,.v4-cards.n1,.v4-cards.n2{grid-template-columns:1fr;gap:44px}.v4-card b{font-size:23px}.v4-tall{aspect-ratio:4/4.4}.v4-tt{left:22px;right:22px;bottom:22px}.v4-tt b{font-size:24px}.v4-cards.k-tall{gap:16px}
  .v4-rows a{grid-template-columns:40px 1fr 20px;gap:12px;padding:22px 0}.v4-rp{grid-column:2;grid-row:2;font-size:15px}.v4-rows a>svg{grid-column:3;grid-row:1/3}.v4-rn b{font-size:20px}.v4-rn small{font-size:14px}
  .v4-stg{grid-template-columns:1fr;gap:40px}.v4-stph{position:static;aspect-ratio:4/3}.v4-st{margin-top:28px}.v4-st li{grid-template-columns:46px 1fr;padding:24px 0}.v4-st b{font-size:21px}.v4-st p{font-size:15.5px}
  .v4-line,.v4-line.n4,.v4-line.n2{grid-template-columns:1fr;margin-top:36px}.v4-line li{padding:24px 0;border-bottom:1px solid var(--v-ln)}.v4-line b{font-size:22px;margin-top:8px}.v4-line p{font-size:15.5px}
  .v4-pil{grid-template-columns:1fr;gap:28px;margin-top:36px}.v4-pil b{font-size:22px;margin-top:10px}.v4-pil p{font-size:15.5px}
  section.v4.v4-q{min-height:520px}.v4-qw{padding-top:80px;padding-bottom:80px}.v4-qw blockquote{font-size:30px}.v4-qw blockquote::before{font-size:72px}.v4-qp blockquote{font-size:28px}
  .v4-strip{grid-template-columns:1fr 1fr;margin-top:36px;padding:0 22px;gap:10px}.v4-sp{height:220px}.v4-strip .v4-sp:nth-child(2){margin-top:28px;height:192px}.v4-strip .v4-sp:nth-child(3){grid-column:1/3;height:200px}
  .v4-elg{grid-template-columns:1fr;gap:32px}.v4-elr li{font-size:16.5px;padding:16px 0 16px 30px}.v4-elr li::before{top:22px}
  .v4-nl a{grid-template-columns:1fr 20px;gap:4px 12px;padding:16px 0;font-size:16.5px}.v4-nl time{grid-column:1;font-size:14px}.v4-nl b{grid-column:1}.v4-nl a>svg{grid-column:2;grid-row:1/3}
  .v4-nc,.v4-nc.n2{grid-template-columns:1fr;gap:12px}.v4-nc a{flex-direction:row;align-items:center;gap:18px;padding:20px}.v4-ncd{flex-direction:column;gap:2px;align-items:center;min-width:52px}.v4-ncd b{font-size:30px}.v4-nct{font-size:16.5px}.v4-ncm{display:none}.v4-nsp{grid-template-columns:1fr;gap:28px}
  .v4-shd{display:none}.v4-sch a{grid-template-columns:1fr 1fr;gap:6px 14px;padding:20px 0}.v4-sn{grid-column:1/3}.v4-sn b{font-size:18px}.v4-sc{font-size:15px}.v4-sc::before{content:attr(data-l);display:block;font-size:13px;color:var(--v-mu);font-weight:600}.v4-sch a>svg{display:none}
  .v4-cards.k-clean,.v4-cards.k-tall{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin:0 -22px;padding:0 22px 6px;scrollbar-width:none}.v4-cards.k-clean>li,.v4-cards.k-tall>li{flex:0 0 78%;scroll-snap-align:start}.v4-cards.k-tall .v4-tall{aspect-ratio:4/5}.v4-cph{aspect-ratio:4/3}
  .v4-ctag{grid-template-columns:1fr;gap:32px}.v4-ctag .v4-b{min-height:60px;font-size:17px}.v4-ctag.k-center .v4-bs,.v4-ctag.k-formal .v4-bs{flex-direction:column;width:100%}.v4-ctag.k-formal h2{font-size:32px}.v4-ctag.k-formal{padding-top:48px;padding-bottom:48px}
}`; }

  /* ── 섹션 바탕(교차 · 짙은 띠): 템플릿마다 순서대로 ── */
  const TONE = { vofield: { 'v4-cards': 'alt', 'v4-quote': 'q', 'v4-cta': 'dk' }, vokdt: { 'v4-num': 'dk', 'v4-quote': 'alt' }, voupskill: { 'v4-pil': 'alt', 'v4-cta': 'dk' }, vocert: { 'v4-steps': 'alt', 'v4-cta': 'dk' },
    vocook: { 'v4-cards': 'alt', 'v4-quote': 'q' }, vobeauty: { 'v4-pil': 'alt', 'v4-cta': 'dk' }, vodesign: { 'v4-num': 'alt', 'v4-cta': 'alt' }, vologi: { 'v4-pil': 'alt', 'v4-cta': 'dk', 'v4-steps': 'alt2' },
    vocare: { 'v4-cards': 'alt', 'v4-elig': 'alt2', 'v4-cta': 'dk' }, voclassic: { 'v4-steps': 'alt', 'v4-cta': '' } };
  const NK = { vofield: ['cards', ''], vokdt: ['split', ''], voupskill: ['rows', 'alt'], vocert: ['cards', ''], vocook: ['split', 'alt'], vobeauty: ['rows', ''], vodesign: ['cards', ''], vologi: ['split', ''], vocare: ['cards', ''], voclassic: ['rows', 'alt'] };
  const FAQ = { vofield: 'dk', vokdt: 'alt', voupskill: '', vocert: 'alt', vocook: '', vobeauty: 'alt', vodesign: 'alt', vologi: 'dk', vocare: 'alt', voclassic: '' };
  const toneOf = (id, hpt, d) => { if (hpt === 'v4-quote' && d.k === 'photo') return 'v4-q'; const t = hpt === 'v4-notice' && d.auto ? (NK[id] || [])[1] : (TONE[id] || {})[hpt]; return t === 'alt' ? 'v4-alt' : t === 'dk' ? 'v4-dk' : ''; };

  /* ── 설치 ── */
  const HKS = H;
  const themeOf = s => s && DEF[s.theme] ? s.theme : '';
  { const hk0 = HS.heroKind; if (typeof hk0 === 'function') HS.heroKind = (s, d) => { d = d || {}; if (HKS[d.hk]) return d.hk; if (!d.hk && !d.hero && themeOf(s)) return s.theme; return hk0(s, d); }; }
  { const h0 = HS.hero; if (typeof h0 === 'function') HS.hero = (kind, s, d, th, T) => { try { const k = kind || (typeof HS.heroKind === 'function' ? HS.heroKind(s, d || {}) : ''); if (HKS[k] && s) return HKS[k](s, d || {}); } catch (e) { console.error('hp44-voc hero', e); } return h0(kind, s, d, th, T); }; }
  { const base = proSec; proSec = (x, i, s, lk) => { const d = x && x.data; const f = d && x.type === 'text' && SEC[d.hpt];
    if (!f || !s) return base(x, i, s, lk); if (x.hide && !editing()) return ''; const id = themeOf(s) || 'vofield';
    let h = ''; try { h = f(s, d); } catch (e) { console.error('hp44-voc', e); return base(x, i, s, lk); } if (!h) return editing() ? base(x, i, s, lk) : '';
    let out = `<section class="hpt hp-s v4 v4t-${id} ${toneOf(id, d.hpt, d)} v4s-${d.hpt.slice(3)}">${h}</section>`; const m = editing() ? HPE.map.get(x) : null; if (m) out = out.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`); return out; }; window.proSec = proSec; }
  { const base = siteHTML; siteHTML = (s, full, lang) => { if (themeOf(s)) { CUR = s.theme; USED = new Set(Object.values(DEF[s.theme].ph)); } const h = base(s, full, lang); if (!themeOf(s) || !HPT.tokens(s)) return h; try { return h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hp44-voc css', e); return h; } }; window.siteHTML = siteHTML; }

  /* ── 테마 · 글자 토큰 · 템플릿 등록 ── */
  const HD0 = { hf: 'sans', hw: 800, hls: -0.04, h1: 88, h1m: 42, lh1: 1.08, h2: 58, h2m: 34, h3: 24, body: 17, blh: 1.7, lead: 20, ey: { fs: 15, ls: 0.02, fw: 700, tt: 'none' }, sec: 144, secm: 84, w: 1240, gut: 40,
    r: 18, rs: 12, br: 999, bh: 60, bpx: 30, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' };
  function cssX() { return ''; }
  /* CM 공통 부품(hx-*) 기본 켜기: 템플릿 성격에 맞는 것만 보이게, 공지(hx-ntc)는 모두. 바탕(tone)은 템플릿마다 달리해 하단이 같은 뼈대가 되지 않게 */
  const PT = { vofield: { ntc: 'alt', faq: 'dark', loc: 'bg', num: 'accent' }, vokdt: { rev: 'alt', fac: 'bg', ntc: 'bg', faq: 'alt' }, voupskill: { rev: 'bg', ntc: 'alt', faq: 'bg' }, vocert: { num: 'accent', ntc: 'bg', faq: 'alt' },
    vocook: { fac: 'bg', rev: 'alt', ntc: 'bg', loc: 'alt' }, vobeauty: { fac: 'alt', rev: 'bg', ntc: 'alt', loc: 'bg' }, vodesign: { fac: 'bg', rev: 'alt', ntc: 'bg' }, vologi: { num: 'accent', ntc: 'alt', faq: 'dark', loc: 'bg' },
    vocare: { rev: 'alt', ntc: 'bg', faq: 'alt', loc: 'bg' }, voclassic: { num: 'alt', ntc: 'bg', faq: 'alt', loc: 'bg' } };
  const PL = { rev: ['수강생 이야기', '먼저 배운 분들의 후기'], fac: ['강사진', '현장에서 온 선생님'], num: ['숫자로 보는 성과', '수료생 · 취업 현황'], faq: ['FAQ', '자주 묻는 질문'], loc: ['오시는 길', '훈련장 위치 · 연락처'], ntc: ['알림', '공지사항'] };
  function withParts(id, L) { if (!window.HPX || typeof HPX.sec !== 'function') return L; const D = DEF[id]; const T = PT[id] || {};
    const add = [...(D.hx || []), 'ntc'].map(k => { const o = HPX.sec(k, Object.assign({ eyebrow: PL[k][0], title: PL[k][1], v4on: 1 }, T[k] ? { tone: T[k] } : {})); return o; /* v4on: 템플릿이 기본으로 켠 부품 — 내용 없는 섹션 자동 숨김에서 빼고, 그릴 때 데이터가 없으면 부품이 스스로 숨는다 */ }).filter(Boolean);
    const at = L.findIndex(x => x && x.data && x.data.hpt === 'v4-cta'); L.splice(at >= 0 ? at : L.length, 0, ...add); return L; }
  const regAll = () => Object.keys(DEF).forEach(id => { const D = DEF[id];
    if (!HPT.has(id)) HPT.reg(id, { prem: 1, cssX, name: D.name, desc: D.desc, tags: ['voc'], tone: D.dark ? 'dark' : 'light', dens: '여유', acc: D.a, bg: D.bg, alt: D.alt, ink: D.dark ? '#F4F4F5' : '#14171A', mu: D.dark ? '#A1A1AA' : '#545B62', r: 18, br: 999,
      hero: D.hk === 'full' || D.hk === 'cine' ? 'bg' : D.hk === 'center' || D.hk === 'formal' ? 'center' : 'split', vis: 'photo', illu: 'book', card: 'flat', look: 'mintSoft', sw2: D.alt, base: D.dark ? 'tech' : D.serif ? 'warm' : 'clean', hk: id, ck: 'panel', sh: 'none' });
    try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, Object.assign({}, HD0, D.serif ? { hf: 'serif', hw: 700 } : {})); } catch (e) { console.error('hp44-voc HPD', e); }
    if (typeof TPL === 'undefined' || typeof S2 !== 'function' || TPL.some(t => t.id === 't44-' + id)) return;
    TPL.push({ id: 't44-' + id, name: D.name, types: ['voc'], g44: 1, sub: D.sub, scene: `직업훈련 · ${D.sub} — ${D.desc}`, color: D.a, tone: '모던', look: 'mintSoft', theme: id, hero: '', purpose: ['apply', 'learn'], prem: 1, h44: 'voc', build: () => withParts(id, BUILD[id]()) }); });
  regAll();
  if (typeof siteFromTpl === 'function' && !siteFromTpl.h44v) { const base = siteFromTpl; const f = tp => { const s = base(tp); try { if (tp && tp.h44 === 'voc' && DEF[tp.theme]) { const D = DEF[tp.theme]; s.photos = Object.assign({}, s.photos, D.ph); s.hps = Object.assign({}, s.hps, { head: D.head, ownH: 1, foot: 'biz' }); delete s.hps.ownF; const V = [...(D.hx || []), 'ntc']; (s.sections || []).forEach(x => { const k = x && x.data && String(x.data.hpt || '').replace(/^hx-/, ''); if (x && x.data && /^hx-/.test(x.data.hpt || '') && V.includes(k) && x.data.v4on) { delete x.hide; delete x.hideAuto; } }); } /* 바닥글은 CM 공통(4열 · 휴대폰 아코디언) */ } catch (e) { console.error('hp44-voc photo', e); } return s; };
    Object.keys(base).forEach(k => { try { f[k] = base[k]; } catch (e) { } }); f.h44v = 1; siteFromTpl = f; window.siteFromTpl = f; }
  const MYD = id => !!DEF[id] && HPT.has(id);
  const tyK = () => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return ''; } };
  if (typeof HPT.premFits === 'function' && !HPT.premFits.h44v) { const f0 = HPT.premFits; HPT.premFits = (id, t) => MYD(id) ? (t || tyK()) === 'voc' : f0(id, t); HPT.premFits.h44v = 1; }
  if (typeof HPT.thumb === 'function' && !HPT.thumb.h44v) { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!MYD(id) || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; b.sections = withParts(id, BUILD[id]()); b.photos = Object.assign({}, b.photos, DEF[id].ph); b.hps = Object.assign({}, b.hps, { head: DEF[id].head, ownH: 1, foot: 'biz' }); delete b.hps.ownF; return siteHTML(b, false, 'ko'); } catch (e) { console.error('hp44-voc thumb', e); return tb(s, id); } }; HPT.thumb.h44v = 1; }
  /* 공지 · FAQ(유형 기본 자동 섹션): 첫 화면 바로 아래 대신 마지막 행동 앞으로 */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.h44v) { const e0 = HPT.enrich; HPT.enrich = s => { const r = e0(s); try { const L = s && s.sections; if (themeOf(s) && Array.isArray(L)) { for (let i = L.length - 1; i >= 0; i--) { const x = L[i]; if (x && x.type === 'text' && x.data && /^(facts|sched)$/.test(x.data.hpt || '')) L.splice(i, 1); } /* 숫자 띠 · 일정표 자동 추가는 대시보드형이 되므로 넣지 않는다 */ if (L.some(x => x && x.data && x.data.hpt === 'hx-ntc')) { for (let i = L.length - 1; i >= 0; i--) if (L[i] && L[i].type === 'notices') L.splice(i, 1); } /* 공지는 템플릿이 넣은 hx-ntc 하나만 */ } } catch (e) { console.error('hp44-voc enrich', e); } return r; }; Object.keys(e0).forEach(k => { try { HPT.enrich[k] = e0[k]; } catch (e) { } }); HPT.enrich.h44v = 1; }
  window.HP44_VOC = { ids: Object.keys(DEF), DEF, css, reg: regAll };
})();
