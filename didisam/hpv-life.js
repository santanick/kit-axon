/* v43.9 hpv-life — 평생 · 직업훈련 홈페이지 템플릿 3종(D4 시안 구현)
   대표님(2026-11-17): 「디자인이 너무 구려」 · 「5배 이상 고퀄리티」 → 시안 3개 「전부 마음에 들어」.
   - lvworkshop 「현장」: 작업장 사진 전면 첫 화면 + 큰 숫자 + 세로형 과정 카드 3장 + 고정 사진 4단계 + 전면 사진 인용 + 짙은 마지막 행동(직업훈련)
   - lvalmanac 「계절 매거진」: 크림 바탕 · 세리프 · 사진 콜라주 + 공지 한 줄 + 강좌 3장 + 큰 숫자 + 2열 이야기 + 인용(평생교육)
   - lvshift 「전환」: 흰 바탕 가운데 큰 제목 + 넓은 둥근 사진 + 방문자 3갈래 한 줄 + 과정 3개 + 검은 큰 숫자 + 수업 방식 + 인용(직업훈련 · 평생교육)
   원칙: 시안이 기준. 숫자 · 과정 · 후기 · 공지는 실제 데이터(S.classes 공개 과정 · HPT.reviews · S.notices · footer)만, 없으면 그 덩어리를 숨긴다.
   평생교육원(lifelong)에는 훈련 · 국비 · 고용노동부 문구를 쓰지 않는다. 게시본은 Shadow DOM이라 CSS는 siteHTML의 <style>에 넣는다. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof siteHTML !== 'function' || typeof proSec !== 'function') return;
  const U = HPT.U; const { mix, fit, al, CR } = U;
  const HS = window.HPS = window.HPS || {};
  const E = v => esc(v == null ? '' : v);
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const isVoc = () => { try { return S.org.type === 'voc'; } catch (e) { return false; } };
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const today = () => { try { return typeof window.today === 'function' ? window.today() : new Date().toISOString().slice(0, 10); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const AR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const EXT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>';

  /* ── 실제 데이터 ── */
  const pubAll = () => { try { const L = (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료' && c.name); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; } catch (e) { return []; } };
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const md = d => { const m = String(d || '').match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${+m[1]}월 ${+m[2]}일` : ''; };
  const won = v => (+v || 0).toLocaleString('ko-KR') + '원';
  const weeks = c => { if (!c.start || !c.end) return 0; const n = (new Date(c.end) - new Date(c.start)) / 864e5; return n > 0 ? Math.max(1, Math.round(n / 7)) : 0; };
  const dday = c => c.start ? Math.round((new Date(c.start) - new Date(today())) / 864e5) : null;
  const span = w => !w ? '' : w >= 8 ? `${Math.round(w / 4.3)}개월` : `${w}주`;
  function info(c) { const days = Array.isArray(c.days) && c.days.length ? c.days.map(d => WD[+d] || '').filter(Boolean).join(' · ') : ''; const tm = c.time && c.time.from ? `${c.time.from}–${c.time.to || ''}` : ''; const dd = dday(c);
    return { dd, when: c.start ? (dd != null && dd < 0 ? `${md(c.start)} 시작 · 진행 중` : `${md(c.start)} 개강`) : '수시 모집', meta: [span(weeks(c)), days ? `${days}${tm ? ' ' + tm : ''}` : '', +c.hours ? `${+c.hours}시간` : ''].filter(Boolean).join(' · '),
      price: !+c.price ? '수강료 0원' : won(c.price), cert: c.cert === 'auto' || c.cert === 'manual' }; }
  const sorted = () => pubAll().slice().sort((a, b) => { const x = dday(a), y = dday(b); const k = v => v == null ? 1e6 : v < 0 ? 5e5 - v : v; return k(x) - k(y); });
  const menuOf = (s, k) => ((s && s.menus) || []).find(m => m && m.kind === k && m.on !== false && m.access !== '비공개' && m.id);
  const clsList = s => { const m = menuOf(s, 'class'); if (m) return '#p-m-' + m.id; const L = pubAll(); return L[0] ? '#p-c-' + L[0].id : '#p-home'; };
  const noticeH = s => { const m = menuOf(s, 'notice'); return m ? '#p-m-' + m.id : '#p-home'; };
  const telOk = () => { const t = ft().tel; return t && !isPh(t) ? String(t) : ''; };
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  function askOf(s) { const t = telOk(); if (t) return { h: telH(t), l: `전화 ${t}` , s: '전화 상담' }; const em = ft().email || ft().mail; if (em && /@/.test(em)) return { h: 'mailto:' + em, l: '메일로 문의', s: '메일 문의' };
    const m = menuOf(s, 'community') || menuOf(s, 'board'); if (m) return { h: '#p-m-' + m.id, l: '상담 게시판', s: '상담 게시판' }; return { h: clsList(s), l: '과정 둘러보기', s: '과정 둘러보기' }; }
  const W24 = 'https://www.work24.go.kr';
  const aA = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const btn = (h, l, k) => `<a class="lv-b ${k || 'p'}" ${aA(h)}><span>${E(l)}</span>${/^https?:/.test(h) ? EXT : AR}</a>`;
  const lnk = (h, l) => `<a class="lv-ln" ${aA(h)}><span>${E(l)}</span>${/^https?:/.test(h) ? EXT : AR}</a>`;
  const ph = (s, slot, d) => typeof HS.photo === 'function' ? HS.photo(s, slot, d) : null;
  const fig = (slot, p, cls, eager, sizes) => p ? `<figure class="hps-img${slot === 'hero' ? ' hp-photo' : ''} ${cls}" data-slot="${E(slot)}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="${E(sizes || '100vw')}"` : ''} alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-fit:${p.fit || 'cover'};object-position:${E(p.pos || '50% 50%')}"></figure>` : `<div class="${cls} lv-ph0" aria-hidden="true"></div>`;
  const cphoto = c => { if (c.thumb && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(c.thumb)) return { src: c.thumb, alt: c.name, stock: '' };
    const H = window.HPSTOCK; if (!H || typeof H.photo !== 'function') return null; try { const x = H.photo(c.name, c.id, { id: true, scope: 'lv' }); return x ? { src: H.url(x), alt: x.alt || '', pos: x.focus || '50% 50%', stock: x.id } : null; } catch (e) { return null; } };
  const lines = d => String((d && d.title) || org()).split('\n').filter((x, k, A) => x || A.length === 1).map(E).join('<br>');
  /* 제목 강조: B는 둘째 줄 전체, C는 둘째 줄 첫 낱말을 기관 색으로(시안과 같게). 한 줄이면 강조 없음 */
  const linesEm = (d, k) => { const L = String((d && d.title) || org()).split('\n').filter(Boolean); if (L.length < 2) return lines(d);
    return L.map((x, i) => i !== 1 ? E(x) : k === 'word' ? x.replace(/^(\S+)(.*)$/, (m, a, b) => `<em>${E(a)}</em>${E(b)}`) : `<em>${E(x)}</em>`).join('<br>'); };
  const rows = d => ((d && d.cols) || []).filter(r => r && r[0] && !isPh(r[0]));
  const review = () => { try { const R = (HPT.reviews && HPT.reviews()) || []; const G = R.filter(x => (!x.st || x.st >= 4) && x.b.length >= 12); const r = G.find(x => x.b.length <= 90) || G[0]; return r ? { b: r.b.length > 90 ? r.b.slice(0, 88) + '…' : r.b, w: [r.c, r.w].filter(Boolean).join(' · ') } : null; } catch (e) { return null; } };
  const latestNotice = () => { try { const N = (S.notices || []).filter(x => x && x.title && !x.hidden); return N.slice().sort((a, b) => String(b.at || b.date || '').localeCompare(String(a.at || a.date || '')))[0] || null; } catch (e) { return null; } };
  /* 방문자 갈래: 첫 화면 아래 한 줄 바로 가기(실제 경로만) */
  const paths = s => { const ask = askOf(s); return isVoc()
    ? [['처음이에요', '국비 지원 자격 확인', W24], ['훈련생', '출결 · 진도 · 수료', '#login/my'], ['문의', ask.s, ask.h]]
    : [['처음이에요', '과정 둘러보기', clsList(s)], ['수강생', '내 강의실 · 수료증', '#login/my'], ['문의', ask.s, ask.h]]; };

  /* ════ A 「현장」 ════ */
  function heroA(s, d) { const p = ph(s, 'hero', d);
    return `<section class="hpt hp-hero hps-hero lv lvA lvA-hero">${fig('hero', p, 'lvA-bg', true)}<div class="lv-w lvA-hw">${d.eyebrow ? `<p class="lvA-ey">${E(d.eyebrow)}</p>` : ''}<h1>${lines(d)}</h1>${d.sub ? `<p class="lvA-sub">${E(d.sub)}</p>` : ''}
<div class="lv-bs">${btn(clsList(s), d.cta || '모집 중인 과정 보기', 'p')}${btn(askOf(s).h, d.cta2 || '상담 문의', 'gl')}</div></div>
<nav class="lvA-qk" aria-label="바로 가기"><div class="lv-w">${paths(s).map(([k, l, h]) => `<a ${aA(h)}><b>${E(k)}</b><span>${E(l)}</span></a>`).join('')}</div></nav></section>`; }
  function zeroA(s, d) { const L = pubAll(); if (!L.length) return ''; const F = L.filter(c => !+c.price);
    const big = F.length ? `0<span>원</span>` : `${L.length}<span>개</span>`; const cap = F.length ? `수강료 0원 과정 ${F.length}개 운영 중` : `지금 모집 · 운영 중인 과정`;
    return `<div class="lv-w lvA-zg"><div><p class="lvA-big" aria-label="${E(F.length ? '0원' : L.length + '개')}">${big}</p><p class="lvA-cap">${E(cap)}</p></div>
<div>${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2>${d.sub ? `<p class="lv-lead">${E(d.sub)}</p>` : ''}${isVoc() ? lnk(W24, '고용24에서 지원 자격 확인') : lnk(clsList(s), '과정 고르기')}</div></div>`; }
  function cardsA(s, d) { const L = sorted(); if (!L.length) return ''; const N = L.slice(0, 3);
    const card = c => { const x = info(c); const p = cphoto(c); return `<li><a class="lvA-card" href="#p-c-${E(c.id)}">${fig('cls-' + c.id, p, 'lvA-cph')}${x.dd != null && x.dd >= 0 && x.dd <= 14 ? `<em class="lvA-bd">${x.dd === 0 ? '오늘 개강' : `개강 D-${x.dd}`}</em>` : ''}<span class="lvA-ct"><small class="lvA-when">${E(x.when)}</small><b>${E(c.name)}</b><small class="lvA-meta">${E([x.meta, x.price].filter(Boolean).join(' · '))}</small></span></a></li>`; };
    return `<div class="lv-w"><div class="lv-top"><div>${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2></div>${L.length > 3 ? lnk(clsList(s), `전체 ${L.length}개 과정 보기`) : lnk(clsList(s), '과정 자세히 보기')}</div><ul class="lvA-cards n${N.length}">${N.map(card).join('')}</ul></div>`; }
  function stepsA(s, d) { const R = rows(d).slice(0, 4); if (!R.length) return ''; const p = ph(s, 'about');
    return `<div class="lv-w lvA-sg">${fig('about', p, 'lvA-sph', false, '(max-width: 760px) 100vw, 46vw')}<div>${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2><ol class="lvA-st">${R.map((r, k) => `<li><i aria-hidden="true">${String(k + 1).padStart(2, '0')}</i><div><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</div></li>`).join('')}</ol></div></div>`; }
  function quoteA(s, d) { const r = review(); const q = r ? r.b : (d.title || ''); if (!q) return ''; const p = ph(s, 'cta'); const n = pubAll().filter(c => info(c).cert).length;
    return `${fig('cta', p, 'lvA-qbg')}<div class="lv-w lvA-qw"><blockquote>${E(q)}</blockquote><p class="lvA-cite">${E(r ? r.w : (d.sub || org()))}</p></div>${n ? `<p class="lvA-stat"><b>${n}개</b><span>수료증을 주는 과정</span></p>` : ''}`; }
  function ctaA(s, d) { const t = telOk(); const hrs = ft().hours && !isPh(ft().hours) ? ft().hours : '';
    return `<div class="lv-w lvA-cg"><div><h2>${lines(d)}</h2>${d.sub || hrs ? `<p>${E(hrs ? `상담 시간 · ${hrs}` : d.sub)}</p>` : ''}</div><div class="lvA-act">${btn(clsList(s), d.cta || '모집 중인 과정 보기', 'p')}${t ? btn(telH(t), `전화 ${t}`, 'ol') : btn(askOf(s).h, askOf(s).l, 'ol')}</div></div>`; }

  /* ════ B 「계절 매거진」 ════ */
  function heroB(s, d) { const L = sorted(); const P = [['hero', ph(s, 'hero', d), 'c1'], ['about', ph(s, 'about'), 'c2'], ['space', ph(s, 'space'), 'c3']];
    const n = latestNotice(); const nx = L.find(c => { const x = dday(c); return x != null && x >= 0; });
    const line = n ? `<span><b>${E(n.title)}</b></span>${lnk(noticeH(s), '공지 보기')}` : nx ? `<span><b>${E(md(nx.start))}</b> ${E(nx.name)} 개강을 앞두고 있어요.</span>${lnk('#p-c-' + nx.id, '자세히 보기')}` : '';
    return `<section class="hpt hp-hero hps-hero lv lvB lvB-hero"><div class="lv-w lvB-hg"><div>${d.eyebrow ? `<p class="lvB-is">${E(d.eyebrow)}</p>` : ''}<h1>${linesEm(d, 'line')}</h1>${d.sub ? `<p class="lvB-sub">${E(d.sub)}</p>` : ''}
<div class="lv-bs">${btn(clsList(s), d.cta || '강좌 둘러보기', 'p')}${btn(askOf(s).h, d.cta2 || '수강 문의', 'ol')}</div></div>
<div class="lvB-col">${P.map(([k, p, c]) => fig(k, p, 'lvB-' + c, k === 'hero', '(max-width: 760px) 60vw, 30vw')).join('')}</div></div>${line ? `<div class="lvB-nt"><div class="lv-w"><i aria-hidden="true"></i>${line}</div></div>` : ''}</section>`; }
  function seasonB(s, d) { const L = sorted(); if (!L.length) return ''; const N = L.slice(0, 3);
    const card = c => { const x = info(c); return `<li><a class="lvB-card" href="#p-c-${E(c.id)}">${fig('cls-' + c.id, cphoto(c), 'lvB-cph')}<small class="lvB-cat">${E(x.when)}</small><b>${E(c.name)}</b><small class="lvB-meta">${E([x.meta, x.price].filter(Boolean).join(' · '))}</small></a></li>`; };
    return `<div class="lv-w"><div class="lvB-top"><div>${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2></div>${d.sub ? `<p class="lv-lead">${E(d.sub)}</p>` : ''}</div><ul class="lvB-cards n${N.length}">${N.map(card).join('')}</ul>
<p class="lvB-all">${lnk(clsList(s), L.length > 3 ? `강좌 ${L.length}개 모두 보기` : '강좌 자세히 보기')}</p></div>`; }
  function numB(s, d) { const L = pubAll(); if (L.length < 2) return ''; const F = L.filter(c => !+c.price).length;
    return `<div class="lv-w lvB-ng"><p class="lvB-big">${L.length}</p><p class="lvB-nt2">${E(`지금 ${org()}에서 신청할 수 있는 강좌가 ${L.length}개 있어요.`)}</p>${F ? `<small>${E(`그중 ${F}개는 수강료 없이 들을 수 있어요`)}</small>` : ''}</div>`; }
  function storyB(s, d) { const R = rows(d).slice(0, 4); if (!R.length) return ''; const p = ph(s, 'cta');
    return `<div class="lv-w lvB-sg">${fig('cta', p, 'lvB-sph', false, '(max-width: 760px) 100vw, 46vw')}<div>${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2>${d.sub ? `<p class="lv-lead">${E(d.sub)}</p>` : ''}<dl>${R.map(r => `<div><dt>${E(r[0])}</dt><dd>${E(r[1] || '')}</dd></div>`).join('')}</dl></div></div>`; }
  function quoteB(s, d) { const r = review(); const q = r ? r.b : (d.title || ''); if (!q) return '';
    return `<div class="lv-w lvB-qg"><blockquote>“${E(q)}”</blockquote><p class="lvB-cite">${E(r ? r.w : (d.sub || org()))}</p></div>`; }
  function ctaB(s, d) { const t = telOk();
    return `<div class="lv-w lvB-cg">${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2>${t || d.sub ? `<p class="lv-lead">${E(t ? `궁금한 점은 ${t}으로 편하게 물어보세요.` : d.sub)}</p>` : ''}<div class="lv-bs">${btn(clsList(s), d.cta || '강좌 찾아보기', 'p')}${btn(askOf(s).h, t ? '전화로 문의하기' : askOf(s).l, 'ol')}</div></div>`; }

  /* ════ C 「전환」 ════ */
  function heroC(s, d) { const p = ph(s, 'hero', d);
    return `<section class="hpt hp-hero hps-hero lv lvC lvC-hero"><div class="lv-w">${d.eyebrow ? `<p class="lvC-pill"><b>${E(isVoc() ? '모집 중' : '신청 중')}</b><span>${E(d.eyebrow)}</span></p>` : ''}<h1>${linesEm(d, 'word')}</h1>${d.sub ? `<p class="lvC-sub">${E(d.sub)}</p>` : ''}
<div class="lv-bs">${btn(isVoc() ? W24 : clsList(s), d.cta || (isVoc() ? '지원 자격 확인하기' : '과정 둘러보기'), 'p')}${btn(isVoc() ? clsList(s) : askOf(s).h, d.cta2 || (isVoc() ? '과정 둘러보기' : '수강 문의'), 'sf')}</div>
${fig('hero', p, 'lvC-stage', true, '(max-width: 760px) 100vw, 1120px')}<nav class="lvC-paths" aria-label="방문 목적별 바로 가기">${paths(s).map(([k, l, h]) => `<a ${aA(h)}><b>${E(k)}</b><span>${E(l)}</span></a>`).join('')}</nav></div></section>`; }
  function tracksC(s, d) { const L = sorted(); if (!L.length) return ''; const N = L.slice(0, 3);
    const card = c => { const x = info(c); return `<li><a class="lvC-tr" href="#p-c-${E(c.id)}">${fig('cls-' + c.id, cphoto(c), 'lvC-cph')}<small class="lvC-tag">${E(x.when)}</small><b>${E(c.name)}</b>${c.desc && !isPh(c.desc) ? `<p>${E(String(c.desc).slice(0, 70))}</p>` : ''}<small class="lvC-meta">${E([x.meta, x.price].filter(Boolean).join(' · '))}</small></a></li>`; };
    return `<div class="lv-w"><div class="lv-top"><div>${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2></div>${d.sub ? `<p class="lv-lead">${E(d.sub)}</p>` : ''}</div><ul class="lvC-grid n${N.length}">${N.map(card).join('')}</ul>${L.length > 3 ? `<p class="lvC-all">${lnk(clsList(s), `전체 ${L.length}개 과정 보기`)}</p>` : ''}</div>`; }
  function bigC(s, d) { const L = pubAll(); const H = L.reduce((a, c) => a + (+c.hours || 0), 0); if (!L.length) return '';
    const n = H >= 40 ? H.toLocaleString('ko-KR') : String(L.length); const u = H >= 40 ? '시간' : '개';
    const t = H >= 40 ? `지금 열린 ${L.length}개 과정의 수업 시간을 모두 더했어요.` : `지금 신청할 수 있는 과정이에요.`;
    return `<div class="lv-w lvC-bg"><p class="lvC-n">${E(n)}<span>${u}</span></p><p class="lvC-bt">${E(d.title || t)}<small>${E(d.title ? t : `${org()} 공개 과정 기준`)}</small></p></div>`; }
  function howC(s, d) { const R = rows(d).slice(0, 4); if (!R.length) return ''; const p = ph(s, 'about');
    return `<div class="lv-w lvC-hg">${fig('about', p, 'lvC-hph', false, '(max-width: 760px) 100vw, 46vw')}<div>${d.eyebrow ? `<p class="lv-k">${E(d.eyebrow)}</p>` : ''}<h2>${lines(d)}</h2><ol class="lvC-it">${R.map((r, k) => `<li><i>${String(k + 1).padStart(2, '0')}</i><b>${E(r[0])}</b>${r[1] ? `<p>${E(r[1])}</p>` : ''}</li>`).join('')}</ol></div></div>`; }
  function voiceC(s, d) { const r = review(); const q = r ? r.b : (d.title || ''); if (!q) return '';
    return `<div class="lv-w lvC-vg"><blockquote>“${E(q)}”</blockquote><p class="lvC-cite">${E(r ? r.w : (d.sub || org()))}</p></div>`; }
  function ctaC(s, d) { const t = telOk();
    return `<div class="lv-w lvC-cg"><h2>${lines(d)}</h2>${d.sub ? `<p class="lv-lead">${E(d.sub)}</p>` : ''}<div class="lv-bs">${btn(isVoc() ? W24 : clsList(s), d.cta || (isVoc() ? '지원 자격 확인하기' : '과정 둘러보기'), 'p')}${btn(t ? telH(t) : askOf(s).h, t ? `상담 ${t}` : askOf(s).l, 'sf')}</div></div>`; }

  const HKS = { lvworkshop: heroA, lvalmanac: heroB, lvshift: heroC };
  const SEC = { 'lv-a-zero': [zeroA, 'lvA lvA-zero'], 'lv-a-cards': [cardsA, 'lvA lvA-cs'], 'lv-a-steps': [stepsA, 'lvA lvA-steps'], 'lv-a-quote': [quoteA, 'lvA lvA-q'], 'lv-a-cta': [ctaA, 'lvA lvA-cta'],
    'lv-b-season': [seasonB, 'lvB lvB-season'], 'lv-b-num': [numB, 'lvB lvB-num'], 'lv-b-story': [storyB, 'lvB lvB-story'], 'lv-b-quote': [quoteB, 'lvB lvB-q'], 'lv-b-cta': [ctaB, 'lvB lvB-cta'],
    'lv-c-tracks': [tracksC, 'lvC lvC-tracks'], 'lv-c-big': [bigC, 'lvC lvC-big'], 'lv-c-how': [howC, 'lvC lvC-how'], 'lv-c-voice': [voiceC, 'lvC lvC-voice'], 'lv-c-cta': [ctaC, 'lvC lvC-cta'] };

  /* ── CSS: 기관 색 하나(T.a) + 안마다 중성 · 포인트 하나 ── */
  const SERIF = "'Noto Serif KR','Noto Serif CJK KR','AppleMyungjo','Batang',serif";
  function css(s) { const T = HPT.tokens(s) || { a: '#D9541A' }; const a = T.a;
    const pb = CR(a, '#ffffff') >= 4.5 ? a : fit(a, '#ffffff', 4.6, '#000000'); const on = '#ffffff';
    const aW = fit(a, '#ffffff', 4.6, '#000000');
    /* A: 짙은 바탕(기관 색을 아주 어둡게) · 사진 위 글자 흰색 */
    const navy = mix(mix(a, '#16212B', .82), '#000000', .1); const aOnD = fit(mix(a, '#ffffff', .25), navy, 4.6, '#ffffff');
    /* B: 크림 바탕 · 기관 색 = 초록 계열, 포인트 테라코타 */
    const cream = '#F5EFE4', cream2 = '#EDE4D3'; const bA = fit(a, cream, 4.8, '#000000'); const terra = fit('#C2552E', cream, 4.6, '#000000'); const bDeep = fit(a, '#ffffff', 7, '#000000');
    /* C: 흰 바탕 · 기관 색 + 라임 포인트(검은 바탕 위에서만) */
    const cA = fit(a, '#ffffff', 4.6, '#000000');
    return `
/* v43.9 hpv-life */
.lv{--lv-a:${a};--lv-p:${pb};--lv-on:${on};font-variant-numeric:tabular-nums;word-break:keep-all}
.lv *{box-sizing:border-box}:where(.lv) :where(h1,h2,h3,p,ol,ul,dl,dd,blockquote,figure){margin:0;padding:0}:where(.lv) :where(ol,ul){list-style:none}
.lv-w{max-width:1240px;margin:0 auto;padding:0 40px;position:relative}
.lv img{display:block;width:100%;height:100%}.lv figure{overflow:hidden}.lv-ph0{background:linear-gradient(135deg,${mix(a, '#ffffff', .82)},${mix(a, '#ffffff', .62)})}
.lv a{text-decoration:none;color:inherit}
.lv-bs{display:flex;gap:12px;flex-wrap:wrap;margin-top:44px}
.lv-b{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:60px;padding:0 30px;border-radius:999px;font-size:17px;font-weight:700;letter-spacing:-.01em;transition:transform .18s,background .18s,box-shadow .18s;white-space:nowrap}
.lv-b:hover{transform:translateY(-1px)}.lv-b.p{background:var(--lv-p);color:var(--lv-on)}.lv-b.p:hover{background:${mix(pb, '#000000', .14)}}
.lv-b.gl{background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);backdrop-filter:blur(8px)}
.lv-b:focus-visible,.lv a:focus-visible{outline:3px solid ${al(a, .5)};outline-offset:3px}
.lv-ln{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:17px;font-weight:700;border-bottom:2px solid currentColor;padding-top:6px}
.lv-k{font-size:15px;font-weight:700;letter-spacing:.02em;margin-bottom:20px}
.lv h2{font-size:60px;line-height:1.14;letter-spacing:-.04em;font-weight:800}
.lv-lead{font-size:20px;line-height:1.7}
.lv-top{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-bottom:64px}
section.lvA:not(.lvA-hero),section.lvB:not(.lvB-hero),section.lvC:not(.lvC-hero){padding:150px 0}

/* ── A 현장 ── */
.lvA{--d:${navy};color:#14171A}.lvA .lv-k{color:${aW}}.lvA .lv-lead{color:#3C4248}
.lvA-hero{position:relative;min-height:min(100vh,900px);height:860px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;overflow:hidden;background:var(--d)}
.lvA-bg{position:absolute;inset:0}.lvA-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,15,20,.84) 0%,rgba(10,15,20,.58) 42%,rgba(10,15,20,.06) 76%),linear-gradient(0deg,rgba(10,15,20,.6),rgba(10,15,20,0) 42%)}
.lvA-hw{width:100%;padding-bottom:128px;z-index:1}
.lvA-ey{display:flex;align-items:center;gap:12px;font-size:15px;font-weight:600;letter-spacing:.02em;color:${fit(mix(a, '#ffffff', .45), '#11161C', 6, '#ffffff')};margin-bottom:28px}.lvA-ey::before{content:"";width:28px;height:2px;background:${a}}
.lv.lvA-hero h1{color:#fff;font-size:92px;line-height:1.07;letter-spacing:-.045em;font-weight:800;max-width:860px}
.lvA-sub{font-size:21px;line-height:1.6;max-width:560px;margin-top:32px;color:rgba(255,255,255,.88)}
.lvA-qk{position:absolute;left:0;right:0;bottom:0;border-top:1px solid rgba(255,255,255,.22);z-index:1}
.lvA-qk .lv-w{display:flex}.lvA-qk a{display:flex;align-items:center;gap:10px;min-height:72px;padding-right:40px;margin-right:40px;font-size:15px;color:rgba(255,255,255,.86);border-right:1px solid rgba(255,255,255,.22)}.lvA-qk a:last-child{border:0}.lvA-qk b{color:#fff;font-weight:700}
.lvA-zg{display:grid;grid-template-columns:1.15fr 1fr;gap:80px;align-items:center}
.lvA-big{font-size:300px;line-height:.82;font-weight:800;letter-spacing:-.07em;color:var(--d)}.lvA-big span{color:${aW}}
.lvA-cap{font-size:18px;color:#5D646B;margin-top:48px;font-weight:500}
.lvA-zero h2{font-size:48px}.lvA-zero .lv-lead{margin:28px 0 32px}
.lvA-cs{background:#F4F2EE}
.lvA-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.lvA-cards.n1{grid-template-columns:minmax(0,420px)}.lvA-cards.n2{grid-template-columns:repeat(2,minmax(0,420px))}
.lvA-card{position:relative;display:block;aspect-ratio:4/5.2;border-radius:20px;overflow:hidden;color:#fff;background:var(--d)}
.lvA-cph{position:absolute;inset:0;transition:transform .5s}.lvA-card:hover .lvA-cph{transform:scale(1.03)}
.lvA-card::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,14,18,.88) 0%,rgba(10,14,18,.3) 46%,rgba(10,14,18,0) 70%)}
.lvA-ct{position:absolute;left:32px;right:32px;bottom:32px;z-index:1;display:flex;flex-direction:column}
.lvA-when{font-size:14px;font-weight:700;color:${fit(mix(a, '#ffffff', .45), '#11161C', 6, '#ffffff')};margin-bottom:12px}.lvA-ct b{font-size:30px;line-height:1.25;letter-spacing:-.03em;font-weight:800}.lvA-meta{font-size:15px;color:rgba(255,255,255,.8);margin-top:14px;line-height:1.5}
.lvA-bd{position:absolute;top:24px;left:24px;z-index:1;background:#fff;color:#14171A;font-size:14px;font-weight:700;font-style:normal;padding:8px 14px;border-radius:999px}
.lvA-sg{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:start}
.lvA-sph{border-radius:24px;aspect-ratio:4/5;position:sticky;top:40px}
.lvA-st{margin-top:56px}.lvA-st li{display:grid;grid-template-columns:72px 1fr;gap:8px;padding:36px 0;border-top:1px solid #E3E1DC}.lvA-st li:last-child{border-bottom:1px solid #E3E1DC}
.lvA-st i{font-style:normal;font-size:20px;font-weight:800;color:${aW};padding-top:4px}.lvA-st b{display:block;font-size:26px;letter-spacing:-.03em;line-height:1.3}.lvA-st p{font-size:17px;color:#5D646B;margin-top:10px;line-height:1.65}
section.lvA-q{position:relative;padding:0;min-height:720px;display:flex;align-items:center;color:#fff;overflow:hidden;background:var(--d)}
.lvA-qbg{position:absolute;inset:0}.lvA-qbg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,18,24,.78),rgba(12,18,24,.42))}
.lvA-qw{width:100%;z-index:1;padding-top:120px;padding-bottom:120px}
.lv.lvA-q blockquote{color:#fff;font-size:60px;line-height:1.26;letter-spacing:-.04em;font-weight:700;max-width:980px}
.lvA-q blockquote::before{content:"“";display:block;font-size:120px;line-height:.6;color:${a};margin-bottom:24px;font-weight:800}
.lvA-cite{margin-top:40px;font-size:17px;color:rgba(255,255,255,.78)}
.lvA-stat{position:absolute;right:40px;bottom:56px;z-index:1;text-align:right}.lvA-stat b{display:block;font-size:56px;font-weight:800;letter-spacing:-.04em;line-height:1}.lvA-stat span{font-size:15px;color:rgba(255,255,255,.75)}
section.lvA-cta{background:var(--d);color:#fff}.lv.lvA-cta h2{color:#fff}
.lvA-cg{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:end}.lvA-cta h2{font-size:64px}.lvA-cg p{font-size:20px;color:rgba(255,255,255,.74);margin-top:24px}
.lvA-act{display:flex;flex-direction:column;gap:12px}.lvA-act .lv-b{justify-content:space-between;min-height:72px;font-size:19px;padding:0 32px}
.lvA .lv-b.ol{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.34)}

/* ── B 계절 매거진 ── */
.lvB{background:${cream};color:#1E2621}.lvB .lv-k{color:${terra};letter-spacing:.14em;font-weight:600}.lvB .lv-lead{color:#46504A}
.lvB h1,.lvB h2,.lvB .lvB-card b,.lvB blockquote,.lvB-big{font-family:${SERIF}}
.lvB h2{font-size:56px;line-height:1.22;letter-spacing:-.045em;font-weight:700}
.lvB .lv-b.p{background:${bDeep}}.lvB .lv-b.ol{box-shadow:inset 0 0 0 1.5px #1E2621;color:#1E2621}
section.lv.lvB-hero{padding:96px 0 0;background:${cream}}.lvB-hero h1 em{font-style:normal;color:${bA}}
.lvB-hg{display:grid;grid-template-columns:1fr 1.05fr;gap:64px;align-items:center}
.lvB-is{font-size:14px;font-weight:600;letter-spacing:.14em;color:${terra};margin-bottom:36px}
.lvB-hero h1{font-size:84px;line-height:1.16;letter-spacing:-.05em;font-weight:700}
.lvB-sub{font-size:20px;color:#46504A;margin-top:32px;max-width:480px;line-height:1.65}
.lvB-col{position:relative;height:660px}.lvB-col figure,.lvB-col .lv-ph0{position:absolute;border-radius:4px}
.lvB-c1{left:0;top:40px;width:56%;height:520px}.lvB-c2{right:0;top:0;width:40%;height:290px}.lvB-c3{right:0;bottom:0;width:40%;height:350px}
.lvB-nt{margin-top:96px;border-top:1px solid #D9CFBD;border-bottom:1px solid #D9CFBD}
.lvB-nt .lv-w{display:flex;align-items:center;gap:20px;min-height:76px;font-size:16.5px}.lvB-nt i{width:9px;height:9px;border-radius:50%;background:${terra};flex:none}.lvB-nt .lv-ln{margin-left:auto;font-size:16px;flex:none}
.lvB-top{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:end;margin-bottom:72px}.lvB-top .lv-lead{justify-self:end;max-width:460px;font-size:19px}
.lvB-cards{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:28px;align-items:end}.lvB-cards.n1{grid-template-columns:minmax(0,560px)}.lvB-cards.n2{grid-template-columns:1.25fr 1fr}
.lvB-card{display:flex;flex-direction:column}.lvB-cph{aspect-ratio:4/5;border-radius:4px}.lvB-cards li:first-child .lvB-cph{aspect-ratio:4/5.6}
.lvB-cat{font-size:14px;font-weight:600;color:${bA};margin-top:24px;letter-spacing:.02em}.lvB-card b{font-size:27px;letter-spacing:-.04em;line-height:1.3;margin-top:8px}
.lvB-meta{font-size:15.5px;color:#6A6F67;margin-top:10px;line-height:1.55}
.lvB-all{display:flex;justify-content:center;margin-top:72px}
section.lvB-num{background:${bDeep};color:${cream};text-align:center}.lv.lvB-num p{color:${cream}}
.lvB-big{font-size:240px;line-height:1;letter-spacing:-.06em;font-weight:700}.lvB-nt2{font-size:26px;letter-spacing:-.03em;margin:28px auto 0;max-width:640px;font-weight:500;line-height:1.5}.lvB-ng small{display:block;font-size:15px;opacity:.75;margin-top:20px}
.lvB-sg{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center}.lvB-sph{aspect-ratio:4/4.6;border-radius:4px}
.lvB-story .lv-lead{margin-top:24px}.lvB-sg dl{margin-top:48px;border-top:1px solid #D9CFBD}.lvB-sg dl div{display:grid;grid-template-columns:150px 1fr;gap:20px;padding:26px 0;border-bottom:1px solid #D9CFBD}
.lvB-sg dt{font-weight:700;font-size:17px}.lvB-sg dd{font-size:17px;color:#46504A;line-height:1.6}
section.lvB-q{background:${cream2}}.lvB-qg{max-width:1040px}.lvB-q blockquote{font-size:50px;line-height:1.42;letter-spacing:-.045em;font-weight:700}
.lvB-cite{margin-top:40px;font-size:17px;color:#6A6F67}
.lvB-cg{text-align:center}.lvB-cta h2{font-size:68px}.lvB-cg .lv-lead{margin-top:24px}.lvB-cg .lv-bs{justify-content:center}

/* ── C 전환 ── */
.lvC{background:#fff;color:#0C0E13}.lvC .lv-k{color:${cA}}.lvC .lv-lead{color:#41454F}
.lvC h2{font-size:64px;line-height:1.1;letter-spacing:-.05em}
.lvC .lv-b.sf{background:#F2F3F5;color:#0C0E13}
section.lv.lvC-hero{padding:120px 0 0;text-align:center;background:#fff}.lvC-hero h1 em{font-style:normal;color:${cA}}
.lvC-pill{display:inline-flex;align-items:center;gap:10px;font-size:14.5px;font-weight:600;color:#41454F;padding:6px 16px 6px 6px;border:1px solid #E6E7EB;border-radius:999px}.lvC-pill b{background:var(--lv-p);color:#fff;font-size:13px;padding:4px 10px;border-radius:999px}
.lvC-hero h1{font-size:92px;line-height:1.07;letter-spacing:-.055em;font-weight:800;margin-top:36px}
.lvC-sub{font-size:21px;color:#41454F;margin:32px auto 0;max-width:640px;line-height:1.6}
.lvC-hero .lv-bs{justify-content:center}
.lvC-stage{margin-top:72px;height:600px;border-radius:28px}
.lvC-paths{display:flex;justify-content:center;margin-top:28px;font-size:16px;color:#41454F}
.lvC-paths a{display:flex;align-items:center;gap:8px;min-height:48px;padding:0 28px;border-right:1px solid #E6E7EB}.lvC-paths a:last-child{border:0}.lvC-paths b{color:#0C0E13}
.lvC-tracks .lv-lead{max-width:420px;font-size:18px}
.lvC-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}.lvC-grid.n1{grid-template-columns:minmax(0,420px)}.lvC-grid.n2{grid-template-columns:repeat(2,minmax(0,520px))}
.lvC-tr{display:flex;flex-direction:column}.lvC-cph{aspect-ratio:4/3.3;border-radius:20px}.lvC-tr:hover .lvC-cph img{transform:scale(1.03)}.lvC-cph img{transition:transform .5s}
.lvC-tag{margin-top:26px;font-size:14px;font-weight:700;color:${cA}}.lvC-tr b{font-size:28px;letter-spacing:-.04em;line-height:1.28;margin-top:8px}
.lvC-tr p{font-size:16.5px;color:#41454F;margin-top:12px;line-height:1.6}.lvC-meta{font-size:15px;color:#6B707B;margin-top:18px;padding-top:18px;border-top:1px solid #E6E7EB;line-height:1.5}
.lvC-all{margin-top:56px}
section.lvC-big{background:#0C0E13;color:#fff}.lv.lvC-big p{color:#fff}
.lvC-bg{display:grid;grid-template-columns:auto 1fr;gap:72px;align-items:end}
.lvC-n{font-size:240px;line-height:.82;letter-spacing:-.07em;font-weight:800}.lvC-n span{color:#D7F25C;font-size:.42em;letter-spacing:-.03em;margin-left:8px}
.lvC-bt{font-size:30px;letter-spacing:-.035em;line-height:1.45;font-weight:600;padding-bottom:10px}.lvC-bt small{display:block;font-size:15px;color:rgba(255,255,255,.62);font-weight:400;margin-top:18px;letter-spacing:0}
.lvC-hg{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:start}.lvC-hph{border-radius:24px;aspect-ratio:1/1.1;position:sticky;top:40px}
.lvC-it{margin-top:56px}.lvC-it li{padding:34px 0;border-top:1px solid #E6E7EB}.lvC-it i{display:block;font-style:normal;font-size:15px;font-weight:700;color:${cA};margin-bottom:10px}
.lvC-it b{display:block;font-size:26px;letter-spacing:-.035em;line-height:1.3}.lvC-it p{font-size:17px;color:#41454F;margin-top:10px;line-height:1.65}
section.lvC-voice{background:#F5F6F8;text-align:center}.lvC-voice blockquote{font-size:54px;line-height:1.32;letter-spacing:-.05em;font-weight:700;max-width:1000px;margin:0 auto}
.lvC-cite{font-size:17px;color:#6B707B;margin-top:40px}
.lvC-cg{text-align:center}.lvC-cta h2{font-size:76px}.lvC-cg .lv-lead{margin-top:24px}.lvC-cg .lv-bs{justify-content:center}

@media (max-width:760px){
  .lv-w{padding:0 22px}.lv h2,.lvB h2,.lvC h2{font-size:34px;line-height:1.2}.lv-lead{font-size:17px}
  section.lvA:not(.lvA-hero),section.lvB:not(.lvB-hero),section.lvC:not(.lvC-hero){padding:84px 0}
  .lv-bs{flex-direction:column;margin-top:32px}.lv-b{width:100%;min-height:56px;font-size:16px}
  .lv-top{display:block;margin-bottom:36px}.lv-top .lv-ln,.lv-top .lv-lead{margin-top:18px}
  .lvA-hero{height:780px;min-height:0}.lvA-bg::after{background:linear-gradient(0deg,rgba(10,15,20,.93) 0%,rgba(10,15,20,.62) 50%,rgba(10,15,20,.18) 82%)}
  .lvA-hw{padding-bottom:116px}.lvA-ey{font-size:13.5px;margin-bottom:20px}.lv.lvA-hero h1{color:#fff;font-size:42px;line-height:1.16}.lvA-sub{font-size:17px;margin-top:20px}
  .lvA-qk .lv-w{padding:0;display:grid;grid-template-columns:repeat(3,1fr)}.lvA-qk a{margin:0;padding:12px 4px;min-height:84px;flex-direction:column;justify-content:center;gap:2px;text-align:center;font-size:13.5px}
  .lvA-zg{grid-template-columns:1fr;gap:36px}.lvA-big{font-size:150px}.lvA-zero h2{font-size:30px}
  .lvA-cards,.lvA-cards.n1,.lvA-cards.n2{grid-template-columns:1fr;gap:16px}.lvA-card{aspect-ratio:4/4.4}.lvA-ct{left:24px;right:24px;bottom:24px}.lvA-ct b{font-size:25px}
  .lvA-sg{grid-template-columns:1fr;gap:40px}.lvA-sph{position:static;aspect-ratio:4/3}.lvA-st{margin-top:28px}.lvA-st li{grid-template-columns:48px 1fr;padding:24px 0}.lvA-st b{font-size:21px}.lvA-st p{font-size:15.5px}
  section.lvA-q{min-height:600px}.lvA-qw{padding-top:88px;padding-bottom:140px}.lv.lvA-q blockquote{color:#fff;font-size:30px}.lvA-q blockquote::before{font-size:80px}.lvA-stat{left:22px;right:auto;text-align:left;bottom:40px}.lvA-stat b{font-size:38px}
  .lvA-cg{grid-template-columns:1fr;gap:36px}.lvA-cta h2{font-size:34px}.lvA-cg p{font-size:17px}.lvA-act .lv-b{min-height:62px;font-size:17px}
  section.lv.lvB-hero{padding-top:48px}.lvB-hg{grid-template-columns:1fr;gap:44px}.lvB-is{font-size:13px;margin-bottom:22px}.lvB-hero h1{font-size:42px;line-height:1.24}.lvB-sub{font-size:17px;margin-top:20px}
  .lvB-col{height:420px}.lvB-c1{top:24px;height:330px;width:58%}.lvB-c2{height:190px;width:38%}.lvB-c3{height:212px;width:38%}
  .lvB-nt{margin-top:56px}.lvB-nt .lv-w{flex-wrap:wrap;gap:6px 12px;padding:18px 22px;font-size:15px}.lvB-nt .lv-ln{margin-left:21px}
  .lvB-top{grid-template-columns:1fr;gap:18px;margin-bottom:40px}.lvB-top .lv-lead{justify-self:start;font-size:16.5px}
  .lvB-cards,.lvB-cards.n1,.lvB-cards.n2{grid-template-columns:1fr;gap:44px}.lvB-cph,.lvB-cards li:first-child .lvB-cph{aspect-ratio:4/3}.lvB-card b{font-size:23px}.lvB-all{margin-top:44px}
  .lvB-big{font-size:120px}.lvB-nt2{font-size:19px}
  .lvB-sg{grid-template-columns:1fr;gap:40px}.lvB-sg dl div{grid-template-columns:1fr;gap:4px;padding:20px 0}.lvB-sg dt,.lvB-sg dd{font-size:16px}
  .lvB-q blockquote{font-size:28px}.lvB-cta h2{font-size:36px}
  section.lv.lvC-hero{padding-top:64px}.lvC-pill{font-size:13px}.lvC-hero h1{font-size:42px;line-height:1.16;margin-top:26px}.lvC-sub{font-size:17px;margin-top:20px}
  .lvC-stage{margin-top:44px;height:300px;border-radius:20px}
  .lvC-paths{flex-direction:column;margin-top:16px;text-align:left}.lvC-paths a{border:0;border-bottom:1px solid #E6E7EB;padding:0 2px;min-height:54px;font-size:15px;justify-content:space-between}
  .lvC-grid,.lvC-grid.n1,.lvC-grid.n2{grid-template-columns:1fr;gap:48px}.lvC-tr b{font-size:24px}
  .lvC-bg{grid-template-columns:1fr;gap:24px}.lvC-n{font-size:110px}.lvC-bt{font-size:21px}
  .lvC-hg{grid-template-columns:1fr;gap:40px}.lvC-hph{position:static;aspect-ratio:4/3}.lvC-it{margin-top:28px}.lvC-it li{padding:24px 0}.lvC-it b{font-size:21px}.lvC-it p{font-size:15.5px}
  .lvC-voice blockquote{font-size:28px}.lvC-cta h2{font-size:38px}
}`; }

  /* ── 설치: 첫 화면 hk · 섹션 렌더러 · CSS ── */
  { const hk0 = HS.heroKind; if (typeof hk0 === 'function') HS.heroKind = (s, d) => { d = d || {}; if (HKS[d.hk]) return d.hk; if (!d.hk && !d.hero) { const m = s && s.theme && HPT.meta(s.theme); if (m && HKS[m.hk]) return m.hk; } return hk0(s, d); }; }
  { const h0 = HS.hero; if (typeof h0 === 'function') HS.hero = (kind, s, d, th, T) => { try { const k = kind || (typeof HS.heroKind === 'function' ? HS.heroKind(s, d || {}) : ''); if (HKS[k] && s) return HKS[k](s, d || {}); } catch (e) { console.error('hpv-life hero', e); } return h0(kind, s, d, th, T); }; }
  { const base = proSec; proSec = (x, i, s, lk) => { const d = x && x.data; const k = d && x.type === 'text' && SEC[d.hpt];
    if (!k || !s) return base(x, i, s, lk); if (x.hide && !editing()) return '';
    let h = ''; try { h = k[0](s, d); } catch (e) { console.error('hpv-life', e); return base(x, i, s, lk); } if (!h) return editing() ? base(x, i, s, lk) : '';
    let out = `<section class="hpt hp-s lv ${k[1]}">${h}</section>`; const m = editing() ? HPE.map.get(x) : null; if (m) out = out.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`); return out; }; window.proSec = proSec; }
  const uses = s => !!s && ((s.theme && HKS[(HPT.meta(s.theme) || {}).hk]) || (s.sections || []).some(x => x && ((x.type === 'text' && x.data && SEC[x.data.hpt]) || (x.type === 'banner' && x.data && HKS[x.data.hk]))));
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); if (!uses(s) || !HPT.tokens(s)) return h; try { return h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpv-life css', e); return h; } }; window.siteHTML = siteHTML; }

  /* ── 테마 · 글자 토큰 · 템플릿 ── */
  const DEF = {
    lvworkshop: { name: '현장', desc: '작업장 사진을 가득 채운 첫 화면 · 큰 숫자 하나 · 세로형 과정 카드 · 시작 4단계(직업훈련)', tags: ['voc'], tone: 'light', dens: '여유',
      acc: '#D9541A', bg: '#FFFFFF', alt: '#F4F2EE', ink: '#14171A', mu: '#5D646B', r: 20, br: 999, hero: 'bg', vis: 'photo', illu: 'book', card: 'flat', look: 'mintSoft', sw2: '#F4F2EE', base: 'clean', hk: 'lvworkshop', ck: 'panel', sh: 'none' },
    lvalmanac: { name: '계절 매거진', desc: '크림 바탕 · 명조 제목 · 사진 콜라주로 이번 학기 강좌를 잡지처럼 펼쳐요(평생교육)', tags: ['lifelong'], tone: 'light', dens: '여유',
      acc: '#2E5641', bg: '#F5EFE4', alt: '#EDE4D3', ink: '#1E2621', mu: '#5B625C', r: 4, br: 999, hero: 'split', vis: 'photo', illu: 'book', card: 'flat', look: 'mintSoft', sw2: '#EDE4D3', base: 'warm', hk: 'lvalmanac', ck: 'panel', sh: 'none' },
    lvshift: { name: '전환', desc: '가운데 큰 제목과 넓은 사진 · 과정 3개 · 검은 큰 숫자 하나로 설득하는 첫 화면(직업훈련 · 평생교육)', tags: ['voc', 'lifelong'], tone: 'light', dens: '여유',
      acc: '#1D4ED8', bg: '#FFFFFF', alt: '#F5F6F8', ink: '#0C0E13', mu: '#6B707B', r: 20, br: 999, hero: 'center', vis: 'photo', illu: 'book', card: 'flat', look: 'corpPortal', sw2: '#EEF2FD', base: 'clean', hk: 'lvshift', ck: 'panel', sh: 'none' } };
  const HD0 = { hf: 'sans', hw: 800, hls: -0.04, h1: 88, h1m: 42, lh1: 1.08, h2: 60, h2m: 34, h3: 24, body: 17, blh: 1.7, lead: 20, ey: { fs: 15, ls: 0.02, fw: 700, tt: 'none' }, sec: 150, secm: 84, w: 1240, gut: 40,
    r: 20, rs: 12, br: 999, bh: 60, bpx: 30, bfw: 700, bls: -0.01, bd: '0', sh: 'none', shh: 'none', hov: 'lift', em: 'accent', link: 'hover' };
  const HD = { lvworkshop: HD0, lvalmanac: Object.assign({}, HD0, { hf: 'serif', hw: 700, hls: -0.045, h2: 56, r: 4, rs: 4 }), lvshift: Object.assign({}, HD0, { hls: -0.05, h2: 64 }) };
  function cssX(s, th, T) { return `\n/* v43.9 ${s.theme} */.hpt{--on-a:#ffffff}`; }
  const TX = (variant, data) => S2('text', { variant, ...data });
  /* 편집기 자동 숨김(내용 없는 섹션)에 걸리지 않게 칸 하나를 둔다 — 그릴 때는 실제 데이터로만 채우고, 데이터가 없으면 그 섹션을 그리지 않는다 */
  const AUTO = [['자동', '공개 과정 · 후기 데이터로 채워요']];
  const TPLS = {
    lvworkshop: { scene: '직업훈련 — 작업장 실습 사진과 큰 제목 하나로 「손으로 배우는 곳」을 첫 화면에서 보여 준다', purpose: ['apply', 'learn'],
      build: () => { const v = isVoc(); return [
        S2('banner', { eyebrow: v ? '국민내일배움카드 훈련기관' : '수강생 모집 중', title: '손에 익힌 기술은\n평생 내 편이에요', sub: v ? `${org()}에서 실습 중심 과정으로 자격증과 취업까지 준비해요. 훈련비 지원 여부는 과정마다 확인할 수 있어요.` : `${org()}에서 실습 중심 과정으로 다음 일을 준비해요.`, cta: '모집 중인 과정 보기', cta2: '상담 문의', hk: 'lvworkshop' }),
        TX('stats', { hpt: 'lv-a-zero', eyebrow: v ? '국비 지원' : '수강료', title: '배우는 동안\n돈 걱정은 덜어 드려요', sub: v ? '국민내일배움카드가 있으면 훈련비를 지원받을 수 있어요. 카드가 없어도 괜찮아요. 신청부터 함께 도와 드려요.' : '수강료와 감면 여부는 과정마다 안내해 드려요. 궁금한 점은 상담으로 물어보세요.', cols: AUTO }),
        TX('features', { hpt: 'lv-a-cards', eyebrow: '모집 · 개강 일정', title: '지금 모집 중인 과정', cols: AUTO }),
        TX('steps', { hpt: 'lv-a-steps', eyebrow: '시작하는 방법', title: '상담부터 첫 출근까지,\n네 걸음이면 돼요', cols: v ? [['무료 상담', '지금 상황과 원하는 일을 듣고, 맞는 과정을 함께 골라요.'], ['내일배움카드 발급', '고용24에서 신청하고 고용센터에서 받아요. 준비할 것은 상담 때 알려 드려요.'], ['현장 실습', '실제 장비로 손에 익을 때까지 연습해요. 출결과 진도는 자동으로 기록돼요.'], ['자격증과 취업 연계', '시험 준비와 이력서 · 면접 상담을 함께해요.']] : [['상담', '배우고 싶은 것을 듣고 맞는 과정을 골라요.'], ['신청', '온라인으로 신청하고 결제해요.'], ['실습', '손에 익을 때까지 연습해요.'], ['수료', '수료 기준을 채우면 수료증을 받아요.']] }),
        TX('features', { hpt: 'lv-a-quote', title: '오래 남는 기술은 손으로 익혀요.', sub: '', cols: AUTO }),
        TX('cta', { hpt: 'lv-a-cta', title: '어떤 과정이 맞을지\n모르겠다면, 물어보세요', sub: '구직 · 재직 상황을 알려 주시면 들을 수 있는 과정을 안내해 드려요.', cta: '모집 중인 과정 보기', cols: [] })]; } },
    lvalmanac: { scene: '평생교육 — 이번 학기 강좌를 잡지처럼 펼치고, 크림 바탕 · 명조 · 사진 콜라주로 동네 배움터의 온기를 전한다', purpose: ['apply', 'learn'],
      build: () => [
        S2('banner', { eyebrow: '이번 학기 · 수강생 모집', title: '배움에는\n늦은 계절이\n없어요', sub: `${org()}에서 이웃과 함께 배우는 강좌가 기다려요. 처음 배우는 분도 편하게 시작할 수 있어요.`, cta: '강좌 둘러보기', cta2: '수강 문의', hk: 'lvalmanac' }),
        TX('features', { hpt: 'lv-b-season', eyebrow: '이번 학기 추천', title: '지금 시작하기\n좋은 강좌', sub: '처음 배우는 분도 부담 없도록 입문 강좌를 먼저 보여 드려요.', cols: AUTO }),
        TX('stats', { hpt: 'lv-b-num', title: '', cols: AUTO }),
        TX('steps', { hpt: 'lv-b-story', eyebrow: '가까운 배움', title: '집 가까이에서,\n부담 없이 배워요', sub: '궁금한 점이 있으면 언제든 편하게 물어보세요.', cols: [['수강료', '강좌마다 수강료와 재료비를 따로 안내해요.'], ['수업 장소', '강좌 상세에서 수업 장소와 시간을 확인해요.'], ['감면', '감면 대상과 방법은 상담으로 안내해요.']] }),
        TX('features', { hpt: 'lv-b-quote', title: '배우고 싶은 마음이 생긴 날이, 시작하기 가장 좋은 날이에요.', sub: '', cols: AUTO }),
        TX('cta', { hpt: 'lv-b-cta', eyebrow: '수강 신청', title: '이번 학기엔\n무엇을 배워 볼까요?', sub: '배우고 싶은 것을 알려 주시면 맞는 강좌를 안내해 드려요.', cta: '강좌 찾아보기', cols: [] })] },
    lvshift: { scene: '직업훈련 · 평생교육 — 일을 바꾸려는 성인에게 가운데 큰 제목 · 넓은 사진 · 과정 3개 · 큰 숫자 하나로 다음 걸음을 보여 준다', purpose: ['apply', 'learn'],
      build: () => { const v = isVoc(); return [
        S2('banner', { eyebrow: v ? '국비 지원 과정 · 수강생 모집' : '수강생 모집 중', title: '일을 바꾸는 시간,\n여기서 시작해요', sub: v ? `${org()}에서 현업에 바로 쓰는 기술을 배워요. 내일배움카드로 훈련비를 지원받을 수 있는지 먼저 확인해 보세요.` : `${org()}에서 다음 일을 위한 실력을 쌓아요. 일하면서도 들을 수 있는 과정을 골라 보세요.`, cta: v ? '지원 자격 확인하기' : '과정 둘러보기', cta2: v ? '과정 둘러보기' : '수강 문의', hk: 'lvshift' }),
        TX('features', { hpt: 'lv-c-tracks', eyebrow: '모집 중인 과정', title: '나에게 맞는\n다음 걸음', sub: '전공이나 경력이 없어도 괜찮아요. 과정마다 기간 · 시간 · 수강료를 먼저 보여 드려요.', cols: AUTO }),
        TX('stats', { hpt: 'lv-c-big', title: '', cols: AUTO }),
        TX('steps', { hpt: 'lv-c-how', eyebrow: '수업 방식', title: '강의만 듣고\n끝나지 않아요', cols: [['직접 해 보며 배워요', '수업마다 실습과 과제가 있어 배운 것을 바로 써 봐요.'], ['기록이 남아요', '출결과 진도가 자동으로 기록되고, 수료하면 수료증을 받아요.'], ['끝난 뒤에도 물어보세요', v ? '이력서 · 면접 상담과 채용 소식을 이어서 안내해요.' : '다음에 들을 과정을 상담으로 함께 골라요.']] }),
        TX('features', { hpt: 'lv-c-voice', title: '새로운 일은, 배우기로 마음먹은 날 시작돼요.', sub: '', cols: AUTO }),
        TX('cta', { hpt: 'lv-c-cta', title: v ? '지원 자격,\n먼저 확인해 보세요' : '어떤 과정이 맞을지\n함께 찾아요', sub: v ? '정확한 지원 범위는 고용24에서 확인돼요.' : '배우고 싶은 것을 알려 주시면 맞는 과정을 안내해 드려요.', cols: [] })]; } } };
  /* 시안과 같은 사진(첫 화면 · 이야기 · 인용). 기관이 올린 사진(site.img)이 있으면 그것이 먼저다 */
  const PH = { lvworkshop: { hero: 'wrk-08', about: 'hum-18', cta: 'coo-03' }, lvalmanac: { hero: 'hum-23', about: 'kni-03', space: 'hum-26', cta: 'sen-01' }, lvshift: { hero: 'cam-07', about: 'hum-13' } };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpvl) { const base = siteFromTpl; const f = tp => { const s = base(tp); try { if (tp && tp.hpv === 'life') s.photos = Object.assign({}, s.photos, PH[tp.theme]); } catch (e) { console.error('hpv-life photo', e); } return s; };
    Object.keys(base).forEach(k => { try { f[k] = base[k]; } catch (e) { } }); f.hpvl = 1; siteFromTpl = f; window.siteFromTpl = f; }
  function regAll() { Object.keys(DEF).forEach(id => { if (!HPT.has(id)) HPT.reg(id, Object.assign({ prem: 1, cssX }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpv-life HPD', e); }
    if (typeof TPL === 'undefined' || typeof S2 !== 'function' || TPL.some(t => t.id === 'prem-' + id)) return; const c = TPLS[id];
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: c.scene, color: DEF[id].acc, tone: '모던', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, hpv: 'life', build: c.build }); }); }
  regAll();
  const MY = id => !!DEF[id] && HPT.has(id);
  const tyK = () => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return ''; } };
  if (typeof HPT.premFits === 'function' && !HPT.premFits.hpvl) { const f0 = HPT.premFits; HPT.premFits = (id, t) => MY(id) ? DEF[id].tags.includes(t || tyK()) : f0(id, t); HPT.premFits.hpvl = 1; }
  if (typeof HPT.premFor === 'function' && !HPT.premFor.hpvl) { const f0 = HPT.premFor; HPT.premFor = t => { t = t || tyK(); const L = f0(t).filter(id => !DEF[id]); const M = Object.keys(DEF).filter(MY); return [...M.filter(id => DEF[id].tags.includes(t)), ...L, ...M.filter(id => !DEF[id].tags.includes(t))]; }; HPT.premFor.hpvl = 1; }
  if (typeof HPT.thumb === 'function' && !HPT.thumb.hpvl) { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!MY(id) || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 'prem-' + id); if (tp) { b.sections = tp.build(); b.photos = Object.assign({}, b.photos, PH[id]); } return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpv-life thumb', e); return tb(s, id); } }; HPT.thumb.hpvl = 1; }
  /* 공지: 유형 기본 배치(첫 화면 바로 아래) 대신 마지막 행동 앞으로 — 첫 화면 다음은 과정 */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hpvl) { const e0 = HPT.enrich; HPT.enrich = s => { const r = e0(s); try { const L = s && s.sections; if (Array.isArray(L) && L.some(x => x && x.type === 'text' && x.data && SEC[x.data.hpt])) { const k = L.findIndex(x => x && x.type === 'notices'); if (k >= 0) { const [n] = L.splice(k, 1); const c = L.findIndex(x => x && x.type === 'text' && x.data && (x.data.hpt === 'faq' || /^lv-.-cta$/.test(x.data.hpt || ''))); L.splice(c >= 0 ? c : L.length, 0, n); } } } catch (e) { console.error('hpv-life enrich', e); } return r; }; Object.keys(e0).forEach(k => { try { HPT.enrich[k] = e0[k]; } catch (e) { } }); HPT.enrich.hpvl = 1; }
  window.HPV_LIFE = { ids: Object.keys(DEF), css, reg: regAll };
})();
