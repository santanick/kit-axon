/* v43.8 hpx-corp — 기업 · 공공 홈페이지 템플릿(수석 L3 · plan/tpl438/corp)
   대표님(2026-11-17): 「현재 템플릿 디자인보다 훨씬 디자인 퀄리티가 높아야 돼. 85점을 넘긴 템플릿만 배치해줘.」 「고객 시나리오별 ui ux가 반영된 템플릿이어야 돼.」
   - 묶음: 기업(corp) · 공공(public: 직원 staff · 시민 citizen · 시설 facility). 템플릿 3종 = 수석 1(dutydesk) + 보조 2(DIRECTION.md 참고).
   - 배치 규칙: PASS 표(교차 심사 85점 이상)에 있는 id만 HPT.reg · TPL에 등록한다. 심사 · 테스트에서는 window.HPX_ALL = 1로 표와 무관하게 등록한다.
   - 섹션 렌더러(cx-*)는 PASS와 무관하게 항상 등록한다 — 한 번 게시된 사이트는 표가 바뀌어도 모양이 깨지지 않는다.
   - 사실 원칙: 숫자 · 마감 · 이수율은 실제 강좌(S.classes)에서 그릴 때마다 계산한다. 이수율은 전사 합계만(개인 이름 · 번호 없음).
   - 링크: 학습자 사이트 실제 경로(#my 내 교육 · #courses 교육과정 · #badges 수료 · 배지 · #notice 공지 · #login)와 빌더 링크(#p-c-<id> → #class/<id>)만 쓴다.
   - CSS는 JS 문자열로 사이트 CSS에 넣는다(게시본 Shadow DOM = 미리보기). 범위는 .hxc-* 클래스. 별도 .css 파일을 두지 않는 이유: 게시본 Shadow DOM에 외부 CSS가 닿지 않는다. */
'use strict';
(() => {
  const PASS = { dutydesk: 87, civicclass: 86, facilitynow: 86 }; // L2 재심사 1차(2026-11-17) /* 교차 심사 85점 이상만: { id: 점수 }. 비어 있으면 템플릿을 등록하지 않는다(window.HPX_ALL로만 강제 등록) */
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const ALL = !!window.HPX_ALL;
  const U = HPT.U; const { mix, fit, al } = U; const CR = U.CR;
  const WARN = '#E8553D';
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const okD = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''));
  const days = (a, b) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5);
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ty = () => { try { return S.org.type || ''; } catch (e) { return ''; } };
  const ed = () => { try { return S.org.ed || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', shield: 'M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6z M9 12l2 2 4-4', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
    compass: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5z', award: 'M12 3a6 6 0 100 12 6 6 0 000-12zM8.5 13.5L7 21l5-3 5 3-1.5-7.5', bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20a2 2 0 004 0',
    cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3', check: 'M5 12.5l4.5 4.5L19 7.5', play: 'M8 5v14l11-7z', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' };
  IC.phone = 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2';
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;
  const ROUTES = ['home', 'shop', 'comm', 'notice', 'textbooks', 'my', 'courses', 'fac', 'badges', 'cal', 'login'];
  const safeU = v => (typeof safeURL === 'function' ? safeURL(v) : /^https?:\/\//.test(v) ? v : '');
  /* 빌더 링크 → 게시본 경로. learn:* 은 학습자 경로로 바로, cls:/page: 는 #p-(게시 때 sitemerge가 #class · #hp로 바꿈) */
  const href = v => { v = String(v || ''); if (!v) return ''; if (v.startsWith('learn:')) { const r = v.slice(6); return '#' + (ROUTES.includes(r) ? r : 'home'); }
    if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v.startsWith('page:')) return '#p-' + v.slice(5); if (v.startsWith('url:')) return safeU(v.slice(4)); if (/^#[a-z]/.test(v)) return v; return ''; };
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const mark = (h, x) => { const m = editing() ? HPE.map.get(x) : null; return m ? h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`) : h; };

  /* ── 실제 데이터 ── */
  const live = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => c && c.status !== '종료' && c.name);
  const legal = () => live().filter(c => c.legal).sort((a, b) => String(a.end || '9').localeCompare(String(b.end || '9')));
  const tracks = () => live().filter(c => !c.legal);
  const done = (c, id) => { if (typeof clsDone === 'function') { try { return !!clsDone(c, id); } catch (e) { } } const p = +(((c.prog || {})[id] || {}).p) || 0; return p >= (((c.criteria || {}).threshold) || 100); };
  const rate = c => { const L = c.learners || []; if (!L.length) return null; return Math.round(L.filter(id => done(c, id)).length * 100 / L.length); };
  const dleft = c => okD(c.end) ? days(tday(), c.end) : null;
  const ddTag = n => n == null ? '' : n < 0 ? `<span class="hxc-dd end">마감</span>` : `<span class="hxc-dd${n <= 14 ? ' warn' : ''}">${n === 0 ? '오늘 마감' : '마감 D-' + n}</span>`;
  const onboard = () => live().find(c => /온보딩|신입|신규|입문 과정|임용/.test(c.name));
  const LV = () => { const J = ((typeof S !== 'undefined' && S && S.journey) || []).map(j => j && j.name).filter(Boolean); return J.length >= 3 ? J.slice(0, 3) : ['입문', '실무', '리더']; };
  const hrs = c => +c.hours ? `${+c.hours}시간` : '';
  const kindL = c => c.kind === 'episode' ? '정해진 회차' : c.kind === 'sub' ? '구독' : '기간 내 자유 수강';
  const pubOrg = () => ty() === 'public';
  const W = { legal: () => pubOrg() ? '법정 의무교육' : '법정 필수 교육', staff: () => pubOrg() ? '직원' : '임직원' };
  function stock(key, salt, slot) { const H = window.HPSTOCK; if (!H || typeof H.photo !== 'function') return null;
    try { const x = H.photo(key, salt, { id: true, slot: slot || 'card', scope: 'hxc-corp' }); if (!x) return null; const u = H.url(x, slot === 'hero' ? '' : 'sm'); let src = u; try { src = new URL(u, H.base || location.href).href; } catch (e) { }
      return { src, alt: x.alt || '', pos: x.focus || '50% 50%' }; } catch (e) { return null; } }
  const fig = (p, cls, eager) => p ? `<figure class="hxc-img${cls ? ' ' + cls : ''}"><img src="${E(p.src)}" alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>` : '';
  function heroPhoto(s, d) { try { if (window.HPS && typeof HPS.photo === 'function') { const p = HPS.photo(s, 'hero', d); if (p) return { src: p.src, alt: p.alt, pos: p.pos }; } } catch (e) { } return stock('사무실 회의 업무', 'hxc-hero', 'hero'); }

  /* ── 첫 화면: 필수 교육 데스크 ── */
  function legalCard() { const L = legal(); const T = L.length ? L : tracks().slice(0, 4); if (!T.length) return '';
    const head = L.length ? `<b>${new Date(tday()).getFullYear()} ${E(W.legal())}</b><small>마감 순서 · 전사 이수율</small>` : `<b>운영 중인 과정</b><small>지금 들을 수 있어요</small>`;
    const rows = T.slice(0, 4).map(c => { const r = rate(c); const n = dleft(c);
      return `<li><a href="#my"><span class="hxc-ln"><b>${E(c.name)}</b><small>${[hrs(c), kindL(c)].filter(Boolean).join(' · ')}</small></span>${r == null ? '' : `<span class="hxc-bar" role="img" aria-label="이수율 ${r}%"><i style="width:${Math.max(4, r)}%"></i></span><em class="hxc-pc">${r}%</em>`}${ddTag(n)}</a></li>`; }).join('');
    const avg = L.length ? Math.round(L.map(rate).filter(x => x != null).reduce((a, b) => a + b, 0) / Math.max(1, L.filter(c => rate(c) != null).length)) : null;
    return `<aside class="hxc-led" aria-label="${E(W.legal())} 현황"><header><span class="hxc-lic">${ic('shield', 20)}</span><span class="hxc-lht">${head}</span>${avg != null ? `<span class="hxc-avg"><b>${avg}<small>%</small></b><small>평균 이수율</small></span>` : ''}</header><ol>${rows}</ol><footer><a href="#login">${ic('lock', 18)}<span>로그인하면 <b>내 이수 현황</b>이 보여요</span>${ic('arrow', 18)}</a></footer></aside>`; }
  function roles() { const L = legal(); const ob = onboard(); const N = tracks().length; const lv = LV();
    const R = [
      { ic: 'shield', l: `내 ${pubOrg() ? '의무교육' : '필수 교육'}`, sub: L.length ? `${L.length}과목 · 마감 순서로 안내해요` : '배정된 교육을 한곳에서', h: '#my' },
      ob ? { ic: 'spark', l: pubOrg() ? '신규 임용자 교육' : '신입 온보딩', sub: `${ob.name.replace(/\s*\(.*\)$/, '')} 바로 시작`, h: '#p-c-' + ob.id } : null,
      { ic: 'compass', l: '직무 과정 찾기', sub: N ? `${lv.join(' · ')} ${N}개 과정` : '업무에 맞는 과정 고르기', h: '#courses' },
      { ic: 'award', l: '이수증 받기', sub: '수료증 · 배지를 PDF로', h: '#badges' }
    ].filter(Boolean);
    return `<nav class="hxc-roles" aria-label="방문 목적 바로가기"><p class="hxc-rq">무엇을 하러 오셨나요?</p><ul>${R.map(r => `<li><a ${aAttr(r.h)}><i>${ic(r.ic, 22)}</i><span><b>${E(r.l)}</b><small>${E(r.sub)}</small></span>${ic('arrow', 18)}</a></li>`).join('')}</ul></nav>`; }
  function hero(s, d) { d = d || {}; const p = heroPhoto(s, d); const t = String(d.title || org()).split('\n').map(E).join('<br>');
    const h1 = href(d.link) || '#my', h2 = href(d.link2) || '#courses';
    const card = legalCard();
    return `<section class="hpt hp-hero hxc hxc-hero hxc-td"><div class="hxc-w"><div class="hxc-tdg${card ? '' : ' one'}">
<div class="hxc-tdt">${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h1>${t}</h1>${d.sub ? `<p class="hxc-sub">${E(d.sub)}</p>` : ''}
<div class="hxc-btns">${d.cta ? `<a class="hxc-btn p" ${aAttr(h1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hxc-btn g" ${aAttr(h2)}>${E(d.cta2)}</a>` : ''}</div>
<p class="hxc-inv">${ic('user', 18)}<span>${pubOrg() ? '기관' : '회사'} 초대 메일로 가입한 계정으로 <a href="#login">로그인</a>해요</span></p></div>
<div class="hxc-tdv">${fig(p, 'hxc-hph', 1)}${card}</div></div>${roles()}</div></section>`; }

  /* ── 섹션: 법정 교육 일정표(간트) ── */
  const MO = 864e5;
  function calSec(x, s) { const d = x.data || {}; const L = legal().filter(c => okD(c.start) && okD(c.end)); const A = L.length ? L : tracks().filter(c => okD(c.start) && okD(c.end)).slice(0, 5); if (!A.length) return '';
    const t0 = tday(); const mn = A.map(c => c.start).concat([t0]).sort()[0]; const mx = A.map(c => c.end).sort().slice(-1)[0];
    const y = +mn.slice(0, 4), m = +mn.slice(5, 7) - 1; const ey = +mx.slice(0, 4), em = +mx.slice(5, 7) - 1; let n = (ey - y) * 12 + em - m + 1; n = Math.max(4, Math.min(12, n));
    const st = Date.UTC(y, m, 1), en = Date.UTC(y, m + n, 1); const pos = v => Math.max(0, Math.min(100, (Date.parse(v) - st) / (en - st) * 100));
    const months = Array.from({ length: n }, (_, k) => { const dt = new Date(Date.UTC(y, m + k, 1)); return `<span>${dt.getUTCMonth() === 0 || k === 0 ? `<small>${dt.getUTCFullYear()}</small>` : ''}${dt.getUTCMonth() + 1}월</span>`; }).join('');
    const tp = pos(t0);
    const rows = A.slice(0, 6).map(c => { const a = pos(c.start), b = pos(c.end); const nn = dleft(c); const r = rate(c); const hot = nn != null && nn >= 0 && nn <= 14;
      return `<li><a ${aAttr('#p-c-' + c.id)} class="hxc-gr"><span class="hxc-gn"><b>${E(c.name)}</b><small>${E(c.start.slice(5).replace('-', '.'))} – ${E(c.end.slice(5).replace('-', '.'))}${r != null ? ` · 이수율 ${r}%` : ''}</small></span><span class="hxc-gt"><i class="hxc-tdl" style="left:${tp.toFixed(2)}%" aria-hidden="true"></i><i class="hxc-gb${hot ? ' hot' : ''}" style="left:${a.toFixed(2)}%;width:${Math.max(2, b - a).toFixed(2)}%"><i style="width:${r == null ? 0 : r}%"></i></i></span>${ddTag(nn)}</a></li>`; }).join('');
    return mark(`<section class="hpt hp-s hxc hxc-cal"><div class="hxc-w"><div class="hxc-sh"><div>${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '교육 일정')}</h2>${d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : ''}</div>
<ul class="hxc-lg" aria-label="범례"><li><i class="a"></i>운영 기간</li><li><i class="b"></i>이수한 비율</li><li><i class="c"></i>마감 2주 이내</li></ul></div>
<div class="hxc-gantt" style="--n:${n}"><div class="hxc-gm" aria-hidden="true"><span class="hxc-gn"></span><span class="hxc-gms">${months}<em class="hxc-tdm" style="left:${tp.toFixed(2)}%">오늘</em></span><span class="hxc-gpad"></span></div><div class="hxc-gbody"><ol>${rows}</ol></div></div>
<p class="hxc-gnote">${ic('bell', 18)}<span>마감 2주 전과 3일 전에 아직 이수하지 않은 분께 알림을 보내요. 이수 기준은 과정마다 달라요.</span></p></div></section>`, x); }

  /* ── 섹션: 직무 과정 트랙(입문 · 실무 · 리더) ── */
  function trackSec(x, s) { const d = x.data || {}; const C = tracks(); if (!C.length) return ''; const lv = LV();
    const lvOf = c => /리더|팀장|관리자|임원|간부/.test(c.name) ? 2 : /온보딩|입문|기초|신입|신규/.test(c.name) ? 0 : Math.min(2, Math.max(0, +c.level || 1));
    const cols = lv.map((nm, k) => ({ nm, L: C.filter(c => lvOf(c) === k) })).filter(g => g.L.length);
    const card = c => { const p = stock(c.name, c.id); return `<li><a ${aAttr('#p-c-' + c.id)} class="hxc-cc">${p ? fig(p, 'hxc-ct') : `<span class="hxc-ct hxc-cph">${ic('play', 26)}</span>`}<span class="hxc-cb"><span class="hxc-chips"><em>${E(kindL(c))}</em>${hrs(c) ? `<em>${E(hrs(c))}</em>` : ''}</span><b>${E(c.name)}</b><small>${(c.learners || []).length ? `${(c.learners || []).length}명 수강 중` : '지금 신청할 수 있어요'}</small></span></a></li>`; };
    return mark(`<section class="hpt hp-s hp-alt hxc hxc-trk"><div class="hxc-w"><div class="hxc-sh"><div>${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '직무 과정')}</h2>${d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : ''}</div><a class="hxc-btn g sm" href="#courses">전체 과정 보기${ic('arrow', 18)}</a></div>
<div class="hxc-tg" style="--c:${cols.length}">${cols.map((g, k) => `<div class="hxc-tc"><p class="hxc-th"><i>${k + 1}</i><b>${E(g.nm)}</b><small>${g.L.length}개 과정</small></p><ul>${g.L.slice(0, 3).map(card).join('')}</ul></div>`).join('')}</div></div></section>`, x); }

  /* ── 섹션: 이수증 받기(3단계 + 이수증 견본) ── */
  function certSec(x, s) { const d = x.data || {}; const L = legal(); const c0 = L[0] || live()[0]; const steps = (Array.isArray(d.cols) && d.cols.length >= 2 ? d.cols : [['로그인', '회사 초대로 만든 계정으로 들어가요'], ['기준 채우기', '영상 · 평가를 이수 기준까지 마쳐요'], ['이수증 받기', 'PDF로 내려받거나 바로 인쇄해요']]).filter(r => r && r[0] && !isPh(r[0])).slice(0, 4);
    const no = `${tday().slice(0, 4)}-0001`;
    return mark(`<section class="hpt hp-s hxc hxc-cert"><div class="hxc-w"><div class="hxc-cg"><div class="hxc-cl">${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '이수증 받기')}</h2>${d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : ''}
<ol class="hxc-st">${steps.map((r, k) => `<li><i>${k + 1}</i><span><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</span></li>`).join('')}</ol>
<div class="hxc-btns"><a class="hxc-btn p" href="#badges">${ic('award', 18)}이수증 받으러 가기</a><a class="hxc-btn g" href="#my">내 이수 현황</a></div></div>
<figure class="hxc-paper" aria-label="이수증 견본"><div class="hxc-pp"><p class="hxc-pk">CERTIFICATE OF COMPLETION</p><p class="hxc-pt">이 수 증</p><dl><div><dt>과정</dt><dd>${E(c0 ? c0.name : '과정 이름')}</dd></div><div><dt>이수 시간</dt><dd>${E(c0 && hrs(c0) || '과정별 시간')}</dd></div><div><dt>성명</dt><dd class="hxc-blank">로그인한 본인 이름</dd></div><div><dt>번호</dt><dd class="hxc-num">${E(no)}</dd></div></dl><p class="hxc-po"><b>${E(org())}</b><span class="hxc-seal" aria-hidden="true">${ic('check', 22)}</span></p></div><figcaption>견본 · 실제 이수증에는 이수일과 발급 번호가 들어가요</figcaption></figure></div></div></section>`, x); }

  /* ════ 보조 A3: 시민 강좌 보드(civicclass) · 오늘의 시설(facilitynow) — 공공 시민 · 시설형 ════
     - 같은 뼈대(첫 화면 3층: 제목 · 버튼 → 사진 위 실제 데이터 판 → 방문 목적 4칸), 데이터는 그릴 때 계산(S.classes · S.fac).
     - 정적 게시본이라 「지금 남은 칸」처럼 실시간 값은 쓰지 않는다(예약 현황은 서버 /api/fac에만 있음). 대신 운영 시간 · 칸 · 정원 · 요금 · 휴관처럼 설정값으로 정확한 것만 보이고, 빈 시간은 #fac로 보낸다. */
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const won = n => `${Math.round(+n || 0).toLocaleString('ko-KR')}원`;
  const capOf = c => +((c.recruit && c.recruit.cap) || c.cap || 0);
  const recOn = c => !!(c.recruit && c.recruit.on && (!okD(c.recruit.to) || c.recruit.to >= tday()));
  const modeK = c => { const m = (c.recruit || {}).mode; return m === 'lottery' ? 'lot' : m === 'approve' ? 'apr' : 'fst'; };
  const modeL = c => ({ lot: '추첨', apr: '승인 후 확정', fst: '선착순' })[modeK(c)];
  const seats = c => { const k = capOf(c); return k ? Math.max(0, k - (c.learners || []).length) : null; };
  const when = c => { const named = /\((?:[월화수목금토일]\s*·?\s*)+\)/.test(c.name || ''); const d = !named && Array.isArray(c.days) && c.days.length ? c.days.map(x => DOW[x]).filter(Boolean).join(' · ') + '요일' : ''; const t = c.time && c.time.from ? `${c.time.from}${c.time.to ? '–' + c.time.to : ''}` : ''; return [d, t].filter(Boolean).join(' '); };
  const feeL = c => +c.price ? won(c.price) : '무료';
  const civic = () => live().filter(c => !c.legal);
  const recruiting = () => civic().filter(recOn).sort((a, b) => String(a.recruit.to || '9').localeCompare(String(b.recruit.to || '9')));
  const sesDates = c => (c.sessions || []).map(x => x && x.date).filter(okD);
  const nextSes = c => sesDates(c).sort().find(d => d >= tday());
  const telOf = () => { const t = String(ft().tel || ''); return isPh(t) || t.replace(/[^\d]/g, '').length < 7 ? '' : t; };
  const telH = t => 'tel:' + String(t).replace(/[^\d+]/g, '');
  const short = n => String(n || '').replace(/\s*\(.*\)$/, '').split(/\s+/).slice(0, 2).join(' ');
  const md = d => `${+d.slice(5, 7)}.${+d.slice(8, 10)}`;
  /* 시설(S.fac) */
  const FAC = () => { try { return (S.fac && S.fac.on !== false ? S.fac.facilities || [] : []).filter(f => f && f.on !== false && f.name); } catch (e) { return []; } };
  const tfac = () => FAC().filter(f => f.kind === 'time');
  const hrsOf = (f, dw) => { const H = f.hours || {}; const h = H[dw] !== undefined ? H[dw] : H.all; return Array.isArray(h) && h.length >= 2 && h[0] < h[1] ? h : null; };
  const toM = v => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '')); return m ? +m[1] * 60 + +m[2] : null; };
  const unitL = f => (+f.slotMin || 60) >= 60 ? `${Math.round((+f.slotMin || 60) / 60)}시간` : `${+f.slotMin}분`;
  const resN = f => (f.resources || []).filter(r => r && r.on !== false).length || +((f.capacity || {}).res) || 1;
  const perSlot = f => +((f.capacity || {}).perSlot) || 1;
  const capL = f => perSlot(f) > 1 ? `한 칸 ${perSlot(f)}명` : `${resN(f)}곳 동시`;
  const AUDL = () => { const t = (S.fac || {}).tpl; return t === 'sports' ? { public: '일반', staff: '지역주민', student: '감면' } : t === 'room' ? { public: '일반', staff: '강사', student: '수강생' } : { public: '일반', staff: '직원', student: '학생' }; };
  const hrL = h => h ? `${h[0]}–${h[1]}` : '휴관';
  const weekL = f => { if (!f) return ''; const a = hrL(hrsOf(f, 1)), b = hrL(hrsOf(f, 6)), c = hrL(hrsOf(f, 0)); return b === c ? `평일 ${a} · 주말 ${b}` : `평일 ${a} · 토 ${b} · 일 ${c}`; };
  function closures() { const L = []; FAC().forEach(f => {
      const off = [0, 1, 2, 3, 4, 5, 6].filter(d => !hrsOf(f, d)); if (off.length && off.length < 7) L.push({ t: `${f.name} 매주 ${off.map(d => DOW[d]).join(' · ')}요일 휴관`, k: 'w' });
      (f.closed || []).forEach(c => { if (!c || !okD(c.from)) return; const to = okD(c.to) ? c.to : c.from; if (c.repeat !== 'weekly' && to < tday()) return; L.push({ t: `${f.name} ${md(c.from)}${to !== c.from ? '–' + md(to) : ''} ${c.reason || '휴관'}`, k: 'd', d: c.from }); }); });
    return L.sort((a, b) => (a.k === b.k ? String(a.d || '').localeCompare(String(b.d || '')) : a.k === 'd' ? -1 : 1)).slice(0, 3); }

  /* 카드 사진: 장면에 맞는 밝은 스톡을 고정 순서로(키워드 추천이 코드 화면 · 어두운 사진을 고르던 문제). 운영자가 강좌 썸네일을 넣으면 그것이 우선 */
  const POOL = { civic: ['art-02', 'mus-02', 'yog-02', 'coo-02', 'lan-02', 'gar-01', 'hum-34', 'sen-02'], fac: ['spo-08', 'spo-04', 'spo-05', 'spo-03', 'spo-02', 'spo-06'] };
  function poolPhoto(L, i) { const H = window.HPSTOCK; if (!H || typeof H.slotImg !== 'function') return null; try { const id = L[i % L.length]; const x = H.slotImg(id, 'card'); if (!x) return null; return { src: H.url(id, 'sm'), alt: x.alt || '', pos: x.pos || '50% 50%' }; } catch (e) { return null; } }
  const thumbOf = c => { const t = String(c.thumb || ''); return /^(https?:|data:image\/)/.test(t) ? { src: t, alt: '', pos: '50% 50%' } : null; };
  /* 공용 첫 화면 뼈대(dutydesk와 같은 3층 · 같은 클래스 — 휴대폰 순서 ①→③→② 그대로) */
  function heroX(s, d, o) { const p = heroPhoto(s, d); const t = String(d.title || org()).split('\n').map(E).join('<br>');
    const h1 = href(d.link) || o.h1, h2 = href(d.link2) || o.h2;
    return `<section class="hpt hp-hero hxc hxc-hero ${o.k}">${o.band || ''}<div class="hxc-w"><div class="hxc-tdg${o.card ? '' : ' one'}">
<div class="hxc-tdt">${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h1>${t}</h1>${d.sub ? `<p class="hxc-sub">${E(d.sub)}</p>` : ''}
<div class="hxc-btns">${d.cta ? `<a class="hxc-btn p" ${aAttr(h1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hxc-btn g" ${aAttr(h2)}>${E(d.cta2)}</a>` : ''}</div>${o.inv || ''}</div>
<div class="hxc-tdv">${fig(p, 'hxc-hph', 1)}${o.card || ''}</div></div>${o.roles}</div></section>`; }
  const rolesX = (R, q) => `<nav class="hxc-roles" aria-label="방문 목적 바로가기"><p class="hxc-rq">${E(q || '무엇을 하러 오셨나요?')}</p><ul>${R.filter(Boolean).slice(0, 4).map(r => `<li><a ${aAttr(r.h)}><i>${ic(r.ic, 22)}</i><span><b>${E(r.l)}</b><small>${E(r.sub)}</small></span>${ic('arrow', 18)}</a></li>`).join('')}</ul></nav>`;
  const telLine = () => { const t = telOf(); if (t) return `<p class="hxc-tel"><a href="${E(telH(t))}">${ic('phone', 22)}<span><small>전화로도 신청할 수 있어요</small><b>${E(t)}</b></span></a></p>`; return editing() ? `<p class="hxc-inv">${ic('phone', 18)}<span>기본 정보에 대표 전화를 넣으면 이 자리에 전화 신청 버튼이 표시됩니다.</span></p>` : ''; };

  /* ── 시민 강좌: 첫 화면 ── */
  function civicCard() { const R = recruiting(); const T = R.length ? R : civic(); if (!T.length) return '';
    const head = R.length ? `<b>이번 달 접수 중인 강좌</b><small>마감 순서 · 남은 자리</small>` : `<b>지금 운영 중인 강좌</b><small>요일 · 시간 · 수강료</small>`;
    const rows = T.slice(0, 4).map(c => { const s = seats(c); const n = R.length && okD(c.recruit.to) ? days(tday(), c.recruit.to) : null;
      const right = `${R.length ? `<em class="hxc-md ${modeK(c)}">${modeL(c)}</em>` : ''}${s != null ? `<em class="hxc-seat${s <= 3 ? ' warn' : ''}">${s ? `남은 자리 ${s}` : '정원 마감'}</em>` : `<em class="hxc-seat">${(c.learners || []).length}명 수강</em>`}`;
      return `<li><a ${aAttr('#p-c-' + c.id)}><span class="hxc-ln"><b>${E(c.name)}</b><small>${E([when(c), feeL(c)].filter(Boolean).join(' · '))}</small></span><span class="hxc-cvr">${right}</span>${ddTag(n)}</a></li>`; }).join('');
    const t = telOf(); const foot = t ? `<a href="${E(telH(t))}">${ic('phone', 18)}<span>전화 신청 <b>${E(t)}</b></span>${ic('arrow', 18)}</a>` : `<a href="#courses">${ic('cal', 18)}<span><b>강좌 전체</b>를 요일 · 시간으로 보기</span>${ic('arrow', 18)}</a>`;
    return `<aside class="hxc-led" aria-label="${R.length ? '접수 중인 강좌' : '운영 중인 강좌'}"><header><span class="hxc-lic">${ic('cal', 20)}</span><span class="hxc-lht">${head}</span><span class="hxc-avg"><b>${T.length}<small>개</small></b><small>${R.length ? '접수 중' : '운영 중'}</small></span></header><ol>${rows}</ol><footer>${foot}</footer></aside>`; }
  const lotAny = () => civic().some(c => modeK(c) === 'lot');
  /* 시민 강좌 첫 화면 — dutydesk(사진 위 현황판 + 목적 칸 4개)와 다른 뼈대: ① 큰 글 + 전화 신청 | 사진 + 접수 중 스티커 ② 접수 마감이 가까운 강좌 티켓 줄 ③ 방문 목적 알약 줄 */
  function civicHero(s, d) { d = d || {}; const p = heroPhoto(s, d); const N = civic().length; const t = telOf(); const lot = civic().some(c => modeK(c) === 'lot' && c.recruit && c.recruit.on);
    const R = recruiting(); const T = (R.length ? R : civic()).slice(0, 4); const ttl = String(d.title || org()).split('\n').map(E).join('<br>');
    const h1 = href(d.link) || '#courses', h2 = href(d.link2) || '#my';
    const tix = T.map(c => { const n = R.length && okD(c.recruit.to) ? days(tday(), c.recruit.to) : null; const s1 = seats(c), k = capOf(c), m = (c.learners || []).length;
      const ns = nextSes(c); const dl = n == null ? (ns ? md(ns) : '') : n < 0 ? '접수 마감' : n === 0 ? '오늘 마감' : `D-${n}`; const lb = n == null ? (ns ? '다음 수업' : '') : n > 0 ? '접수 마감까지' : '';
      return `<li><a ${aAttr('#p-c-' + c.id)} class="hxc-tk2">${dl ? `<span class="hxc-tkt"><em class="hxc-tkd${n != null && n <= 3 ? ' warn' : ''}">${dl}</em>${lb ? `<small>${lb}</small>` : ''}</span>` : ''}<b>${E(c.name)}</b><small>${E([when(c), feeL(c)].filter(Boolean).join(' · '))}</small><span class="hxc-chips">${R.length ? `<em class="hxc-md ${modeK(c)}">${modeL(c)}</em>` : ''}${s1 != null ? `<em class="hxc-seat${s1 <= 3 ? ' warn' : ''}">${s1 ? `남은 자리 ${s1}` : '정원 마감'}</em>` : `<em class="hxc-seat">${m}명 수강</em>`}</span>${k ? `<span class="hxc-bar" role="img" aria-label="정원 ${k}명 중 ${m}명"><i style="width:${Math.min(100, Math.round(m * 100 / k))}%"></i></span>` : ''}</a></li>`; }).join('');
    const P = [{ ic: 'compass', l: '강좌 찾기', sub: N ? `${N}개` : '', h: '#courses' }, { ic: 'check', l: lot ? '추첨 결과 보기' : '내 신청 확인', sub: '', h: '#my' },
      t ? { ic: 'phone', l: '전화로 신청', sub: t, h: telH(t) } : { ic: 'user', l: '처음 오셨나요?', sub: '간편가입', h: '#login' }, { ic: 'bell', l: '공지 · 휴강', sub: '', h: '#notice' }];
    const pills = `<nav class="hxc-pills" aria-label="방문 목적 바로가기"><ul>${P.map(r => `<li><a ${aAttr(r.h)}><i>${ic(r.ic, 20)}</i><b>${E(r.l)}</b>${r.sub ? `<small>${E(r.sub)}</small>` : ''}</a></li>`).join('')}</ul></nav>`;
    return `<section class="hpt hp-hero hxc hxc-hero hxc-cv"><div class="hxc-w"><div class="hxc-cvg"><div class="hxc-tdt">${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h1>${ttl}</h1>${d.sub ? `<p class="hxc-sub">${E(d.sub)}</p>` : ''}
<div class="hxc-btns">${d.cta ? `<a class="hxc-btn p" ${aAttr(h1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hxc-btn g" ${aAttr(h2)}>${E(d.cta2)}</a>` : ''}</div>${telLine()}</div>
<div class="hxc-cvp">${fig(p, 'hxc-hph', 1)}${R.length ? `<p class="hxc-stk"><b>${R.length}</b><span>개 강좌<br>지금 접수 중</span></p>` : ''}</div></div>
${T.length ? `<div class="hxc-tix"><div class="hxc-tixh"><p class="hxc-rq">${R.length ? '접수 마감이 가까운 강좌' : '지금 운영 중인 강좌'}</p><a class="hxc-more2" href="#courses">강좌 전체 보기${ic('arrow', 16)}</a></div><ol>${tix}</ol></div>` : ''}${pills}</div></section>`; }

  /* ── 시민 강좌: 이달의 강좌 달력(접수 기간 · 개강일 · 수업일) ── */
  function monthSec(x, s) { const d = x.data || {}; const C = civic().slice(0, 6); if (!C.length) return '';
    const t0 = tday(); const y = +t0.slice(0, 4), m = +t0.slice(5, 7); const pad = n => String(n).padStart(2, '0'); const key = k => `${y}-${pad(m)}-${pad(k)}`;
    const nD = new Date(Date.UTC(y, m, 0)).getUTCDate(); const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const ev = {}; const put = (k, o) => { (ev[k] = ev[k] || []).push(o); };
    C.forEach((c, i) => { const sd = sesDates(c); sd.forEach(v => { if (v.slice(0, 7) === key(1).slice(0, 7)) put(v, { i, c, k: 'ses' }); });
      if (okD(c.start) && c.start.slice(0, 7) === key(1).slice(0, 7)) put(c.start, { i, c, k: 'open' });
      const r = c.recruit; if (r && r.on && okD(r.to) && r.to.slice(0, 7) === key(1).slice(0, 7)) put(r.to, { i, c, k: 'due' }); });
    const hasAny = Object.keys(ev).length; if (!hasAny) return '';
    const cell = k => { const L = (ev[key(k)] || []).sort((a, b) => ({ due: 0, open: 1, ses: 2 })[a.k] - ({ due: 0, open: 1, ses: 2 })[b.k]); const dw = (lead + k - 1) % 7; const td = key(k) === t0;
      const chip = e => `<a ${aAttr('#p-c-' + e.c.id)} class="hxc-mc k${e.i % 6} ${e.k}" title="${E(e.c.name)}">${e.k === 'due' ? '접수 마감 · ' : e.k === 'open' ? '개강 · ' : ''}${E(short(e.c.name))}</a>`;
      return `<li class="${dw === 0 ? 'su' : dw === 6 ? 'sa' : ''}${td ? ' td' : ''}${L.length ? ' on' : ''}"><span class="hxc-mn">${k}${td ? '<small>오늘</small>' : ''}</span>${L.length ? `<span class="hxc-mcs">${L.slice(0, 2).map(chip).join('')}${L.length > 2 ? `<em class="hxc-more">+${L.length - 2}</em>` : ''}</span><span class="hxc-dots" aria-hidden="true">${L.slice(0, 4).map(e => `<i class="k${e.i % 6} ${e.k}"></i>`).join('')}</span>` : ''}</li>`; };
    const cells = Array.from({ length: lead }, () => '<li class="x" aria-hidden="true"></li>').join('') + Array.from({ length: nD }, (_, k) => cell(k + 1)).join('');
    const leg = C.map((c, i) => { const ns = nextSes(c); return `<li><a ${aAttr('#p-c-' + c.id)}><i class="k${i % 6}" aria-hidden="true"></i><span><b>${E(c.name)}</b><small>${E([when(c) || (ns ? `다음 수업 ${md(ns)}` : ''), feeL(c)].filter(Boolean).join(' · '))}</small></span>${ic('arrow', 18)}</a></li>`; }).join('');
    return mark(`<section class="hpt hp-s hxc hxc-mon"><div class="hxc-w"><div class="hxc-sh"><div>${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || `${m}월 강좌 달력`)}</h2>${d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : ''}</div>
<ul class="hxc-lg" aria-label="범례"><li><i class="b"></i>수업일</li><li><i class="o"></i>개강</li><li><i class="c"></i>접수 마감</li></ul></div>
<div class="hxc-mg"><div class="hxc-cal2"><p class="hxc-mt"><b>${y}년 ${m}월</b></p><ol class="hxc-wd" aria-hidden="true">${DOW.map((w, i) => `<li class="${i === 0 ? 'su' : i === 6 ? 'sa' : ''}">${w}</li>`).join('')}</ol><ol class="hxc-days">${cells}</ol></div>
<div class="hxc-mlg"><p class="hxc-rq">이달의 강좌</p><ul>${leg}</ul><a class="hxc-btn p" href="#courses">강좌 찾기${ic('arrow', 18)}</a></div></div></div></section>`, x); }

  /* ── 시민 강좌: 강좌 카드(사진 · 요일 · 수강료 · 남은 자리) — 시설형 「강습 프로그램」도 같은 카드 ── */
  function civListSec(x, s) { const d = x.data || {}; const C = civic(); if (!C.length) return ''; const R = new Set(recruiting().map(c => c.id));
    const pool = s && s.theme === 'facilitynow' || ed() === 'facility' ? POOL.fac : POOL.civic; const used = new Set(Object.values(((s && s.photos) || {})).map(String));
    const pick = c => { const H = window.HPSTOCK; try { const x = H && typeof H.forCourse === 'function' ? H.forCourse(ty(), c.name, { exclude: [...used], seed: c.id }) : null; if (x && x.id && !used.has(x.id)) { used.add(x.id); return { src: H.url(x, 'sm'), alt: x.alt || '', pos: x.focus || '50% 50%' }; } } catch (e) { }
      const id = pool.find(i => !used.has(i)); if (!id) return null; used.add(id); return poolPhoto([id], 0); };
    const card = c => { const p = thumbOf(c) || pick(c) || stock(c.name, c.id); const s1 = seats(c), k = capOf(c), n = (c.learners || []).length; const ns = nextSes(c);
      const bar = k ? `<span class="hxc-cap"><span class="hxc-bar" role="img" aria-label="정원 ${k}명 중 ${n}명"><i style="width:${Math.min(100, Math.round(n * 100 / k))}%"></i></span><small>${s1 ? `남은 자리 <b>${s1}</b> / ${k}` : '정원이 찼어요 · 대기 신청'}</small></span>` : `<small class="hxc-cn">${n ? `${n}명이 함께 배우고 있어요` : '지금 신청할 수 있어요'}</small>`;
      return `<li><a ${aAttr('#p-c-' + c.id)} class="hxc-kc">${p ? fig(p, 'hxc-kt') : `<span class="hxc-kt hxc-cph">${ic('play', 26)}</span>`}<span class="hxc-kb"><span class="hxc-chips">${R.has(c.id) ? `<em class="hxc-md ${modeK(c)}">${modeL(c)}</em>` : ''}<em>${E(feeL(c))}</em>${c.sub ? `<em>${E(c.sub)}</em>` : ''}</span><b>${E(c.name)}</b><small>${E([when(c), ns ? `다음 수업 ${md(ns)}` : '', c.teacher || ''].filter(Boolean).join(' · '))}</small>${bar}</span></a></li>`; };
    return mark(`<section class="hpt hp-s hp-alt hxc hxc-kl"><div class="hxc-w"><div class="hxc-sh"><div>${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '강좌 안내')}</h2>${d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : ''}</div><a class="hxc-btn g sm" href="${E(d.more || '#courses')}">${E(d.moreL || '전체 강좌 보기')}${ic('arrow', 18)}</a></div>
<ul class="hxc-kg">${C.slice(0, 6).map(card).join('')}</ul></div></section>`, x); }

  /* ── 시민 강좌: 신청 방법(선착순 · 추첨) + 추첨 결과 안내 띠 ── */
  function howSec(x, s) { const d = x.data || {}; const C = civic(); if (!C.length) return ''; const lot = C.filter(c => modeK(c) === 'lot' && c.recruit && c.recruit.on).length; const t = telOf(); const any = lotAny();
    const lane = (k, h, L) => `<div class="hxc-lane ${k}"><p class="hxc-lh"><em class="hxc-md ${k}">${h}</em></p><ol>${L.map((r, i) => `<li><i>${i + 1}</i><span><b>${E(r[0])}</b><small>${E(r[1])}</small></span></li>`).join('')}</ol></div>`;
    return mark(`<section class="hpt hp-s hxc hxc-how"><div class="hxc-w"><div class="hxc-sh"><div>${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(any || !/추첨/.test(d.title || '') ? d.title || '신청 방법' : '신청은 이렇게 해요')}</h2>${any && d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : !any ? '<p class="hxc-sd">강좌를 고르고 남은 자리가 있으면 신청이 바로 확정돼요.</p>' : ''}</div></div>
<div class="hxc-lanes${any ? '' : ' one'}">${lane('fst', '선착순 강좌', [['강좌 고르기', '요일 · 시간 · 수강료를 보고 골라요'], ['바로 신청', '남은 자리가 있으면 신청이 바로 확정돼요'], ['수업 듣기', '첫 수업 전날 알림을 켜 둔 분께 알려 드려요']])}${!any ? '' : lane('lot', '추첨 강좌', [['접수 기간에 신청', '마감 전까지 언제 신청해도 똑같아요'], ['공개 추첨', '접수 마감 후 정원만큼 뽑아요'], ['결과 확인', '내 신청에서 당첨 · 대기 순번을 확인해요']])}</div>
<div class="hxc-band"><span class="hxc-bi">${ic('bell', 22)}</span><p><b>${lot ? `지금 추첨 강좌 ${lot}개를 접수하고 있어요` : any ? '추첨 결과는 내 신청에서 확인해요' : '신청 결과는 내 신청에서 확인해요'}</b><small>${any ? '당첨되지 않으면 대기 순번이 생기고, 자리가 나면 순서대로 연락드려요.' : '정원이 차면 대기 신청을 할 수 있고, 자리가 나면 순서대로 연락드려요.'}${t ? ` 전화 ${t}로도 확인할 수 있어요.` : ''}</small></p><a class="hxc-btn w" href="#my">내 신청 · 결과 보기${ic('arrow', 18)}</a></div></div></section>`, x); }

  /* ── 오늘의 시설: 첫 화면 ── */
  function facCard() { const F = tfac().concat(FAC().filter(f => f.kind !== 'time')).slice(0, 4); if (!F.length) return ''; const N = tfac().length;
    const rows = F.map(f => { const h = hrsOf(f, 1) || hrsOf(f, 6) || hrsOf(f, 0); const kind = f.kind === 'time' ? (f.approval ? '승인 후 확정' : '바로 예약') : f.kind === 'pass' ? '이용권' : '대여';
      return `<li><a href="${f.kind === 'time' ? '#fac' : '#shop'}"><span class="hxc-ln"><b>${E(f.name)}</b><small>${E([f.place, f.kind === 'time' ? `${unitL(f)} 단위 · ${capL(f)}` : ''].filter(Boolean).join(' · '))}</small></span><span class="hxc-cvr"><em class="hxc-hr">${E(h ? hrL(h) : '휴관')}</em><em class="hxc-md ${f.kind === 'time' && !f.approval ? 'fst' : 'apr'}">${kind}</em></span></a></li>`; }).join('');
    return `<aside class="hxc-led" aria-label="예약할 수 있는 시설"><header><span class="hxc-lic">${ic('clock', 20)}</span><span class="hxc-lht"><b>예약할 수 있는 시설</b><small>운영 시간 · 칸 · 정원</small></span><span class="hxc-avg"><b>${N}<small>곳</small></b><small>시간 예약</small></span></header><ol>${rows}</ol><footer><a href="#fac">${ic('cal', 18)}<span><b>오늘 빈 시간</b>은 예약 화면에서 바로 보여요</span>${ic('arrow', 18)}</a></footer></aside>`; }
  /* 시설 0개(아직 등록 전)인 게시본: 사진만 남지 않게 예약 · 이용 안내 판(편집 중에는 등록 안내) */
  function facEmpty() { const t = telOf();
    return `<aside class="hxc-led hxc-fe" aria-label="시설 예약 안내"><header><span class="hxc-lic">${ic('cal', 20)}</span><span class="hxc-lht"><b>시설 예약 안내</b><small>${editing() ? '시설을 등록하면 운영 시간표 · 요금표가 그려져요' : '빈 시간은 예약 화면에서 바로 보여요'}</small></span></header>
<ol><li><a href="#fac"><span class="hxc-ln"><b>시설 예약</b><small>시설 · 날짜 · 시간을 고르고 예약해요</small></span>${ic('arrow', 18)}</a></li><li><a href="#shop"><span class="hxc-ln"><b>강습 · 이용권</b><small>강습 신청과 이용권 구매</small></span>${ic('arrow', 18)}</a></li><li><a href="#my"><span class="hxc-ln"><b>내 예약</b><small>예약 확인 · 취소 · 입장 QR</small></span>${ic('arrow', 18)}</a></li></ol>
<footer>${t ? `<a href="${E(telH(t))}">${ic('phone', 18)}<span>운영 시간 · 요금 문의 <b>${E(t)}</b></span>${ic('arrow', 18)}</a>` : `<a href="#notice">${ic('bell', 18)}<span><b>휴관 · 운영 시간</b>은 공지에서 안내해요</span>${ic('arrow', 18)}</a>`}</footer></aside>`; }
  function facBand() { const L = closures(); if (!L.length) return ''; return `<div class="hxc-off"><div class="hxc-w"><p><b>${ic('bell', 18)}휴관 안내</b><span>${L.map(c => E(c.t)).join('<i aria-hidden="true">·</i>')}</span><a href="#notice">공지 보기${ic('arrow', 16)}</a></p></div></div>`; }
  function facHero(s, d) { const f0 = tfac()[0] || FAC()[0]; const P = (S.fac && S.fac.products) || [];
    const R = [{ ic: 'cal', l: '시설 예약', sub: tfac().length ? tfac().slice(0, 3).map(f => f.name).join(' · ') : '빈 시간 보고 예약', h: '#fac' },
      { ic: 'award', l: ((S.fac || {}).tpl === 'sports' ? '강습 · 이용권' : '이용권 · 대여'), sub: P.length ? `${P.length}가지 · 온라인 결제` : '강습 신청하기', h: '#shop' },
      { ic: 'user', l: '내 예약', sub: '예약 확인 · 취소 · 입장 QR', h: '#my' },
      { ic: 'bell', l: '휴관 · 공지', sub: closures().length ? `휴관 안내 ${closures().length}건` : '휴관 · 행사 소식', h: '#notice' }];
    const inv = f0 ? `<p class="hxc-hrs">${ic('clock', 20)}<span><small>운영 시간 · ${E(f0.name)}</small><b>${E(weekL(f0))}</b></span></p>` : '';
    return heroX(s, d, { k: 'hxc-fn', h1: '#fac', h2: '#shop', card: facCard() || facEmpty(), inv: inv + telLine().replace('전화로도 신청할 수 있어요', '전화 문의'), roles: rolesX(R), band: facBand() }); }

  /* ── 오늘의 시설: 시설 × 시간 운영표(평일 · 토 · 일 3줄, 칸 단위 눈금) ── */
  function hoursSec(x, s) { const d = x.data || {}; const F = tfac().slice(0, 6); if (!F.length) return '';
    let a = 24 * 60, b = 0; F.forEach(f => [0, 1, 6].forEach(w => { const h = hrsOf(f, w); if (h) { a = Math.min(a, toM(h[0])); b = Math.max(b, toM(h[1])); } })); if (!(b > a)) return '';
    a = Math.floor(a / 60) * 60; b = Math.ceil(b / 60) * 60; const span = b - a; const pos = v => ((v - a) / span * 100).toFixed(2); const H = Array.from({ length: span / 60 + 1 }, (_, k) => a / 60 + k);
    const ticks = H.map((h, k) => `<span class="${h % 3 ? 'm' : ''}" style="left:${pos(h * 60)}%">${pad2(h)}</span>`).join('');
    const lane = (f, w, nm) => { const h = hrsOf(f, w); const st = h ? `left:${pos(toM(h[0]))}%;width:${(((toM(h[1]) - toM(h[0])) / span) * 100).toFixed(2)}%;--sl:${(((+f.slotMin || 60) / (toM(h[1]) - toM(h[0]))) * 100).toFixed(3)}%` : '';
      return `<li><em>${nm}</em><span class="hxc-tr">${h ? `<i class="hxc-op" style="${st}"><b>${E(hrL(h))}</b></i>` : `<i class="hxc-shut">휴관</i>`}</span></li>`; };
    const rows = F.map(f => `<li><a href="#fac" class="hxc-fr"><span class="hxc-fnm"><b>${E(f.name)}</b><small>${E([f.place, `${unitL(f)} 단위`, capL(f)].filter(Boolean).join(' · '))}</small></span><ol class="hxc-lns">${lane(f, 1, '평일')}${lane(f, 6, '토')}${lane(f, 0, '일')}</ol></a></li>`).join('');
    return mark(`<section class="hpt hp-s hxc hxc-hrs2"><div class="hxc-w"><div class="hxc-sh"><div>${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '운영 시간표')}</h2>${d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : ''}</div><a class="hxc-btn p sm" href="#fac">빈 시간 보고 예약${ic('arrow', 18)}</a></div>
<div class="hxc-tt"><div class="hxc-tk" aria-hidden="true"><span class="hxc-fnm"></span><span class="hxc-tks">${ticks}</span></div><ol class="hxc-tb">${rows}</ol></div>
<p class="hxc-gnote">${ic('clock', 18)}<span>칸 하나가 예약 단위예요. 이미 예약된 칸과 남은 칸은 예약 화면에서 실시간으로 보여요.</span></p></div></section>`, x); }
  const pad2 = n => String(n).padStart(2, '0');

  /* ── 오늘의 시설: 요금표 · 이용권 ── */
  function priceSec(x, s) { const d = x.data || {}; const F = tfac().filter(f => f.prices && Object.keys(f.prices).length).slice(0, 6); const P = ((S.fac && S.fac.products) || []).filter(p => p && p.name && p.prices).slice(0, 4); if (!F.length && !P.length) return '';
    const AL = AUDL(); const ks = ['public', 'staff', 'student'].filter(k => F.some(f => f.prices[k]) || P.some(p => p.prices[k] != null));
    const v = (f, k) => { const p = f.prices[k]; if (!p) return '—'; const n = +p.slot || 0; return n ? won(n) : '무료'; };
    const tb = F.length ? `<div class="hxc-pt2" style="--k:${ks.length}"><div class="hxc-ph"><span>시설 · 단위</span>${ks.map(k => `<span>${E(AL[k] || k)}</span>`).join('')}</div>${F.map(f => `<div class="hxc-pr"><span class="hxc-pn"><b>${E(f.name)}</b><small>${unitL(f)} 한 칸</small></span>${ks.map(k => `<span class="hxc-pv" data-k="${E(AL[k] || k)}">${E(v(f, k))}</span>`).join('')}</div>`).join('')}</div>` : '';
    const pc = P.length ? `<ul class="hxc-pp2">${P.map(p => { const n = +(p.prices.public != null ? p.prices.public : Object.values(p.prices)[0]) || 0; const sub = p.type === 'pass-count' ? `${+p.count || 1}회 · ${+p.expireDays || 30}일 안에 사용` : p.type === 'pass-period' ? `${+p.days || 30}일 동안 이용` : p.per === 'month' ? '한 달 단위' : '대여';
      return `<li><a href="#shop"><span><small>${E(sub)}</small><b>${E(p.name)}</b></span><span class="hxc-pw">${n ? `<b>${E(won(n))}</b>` : '<b>무료</b>'}${+p.discountRate ? `<em>${+p.discountRate}% 할인</em>` : ''}</span></a></li>`; }).join('')}</ul>` : '';
    return mark(`<section class="hpt hp-s hp-alt hxc hxc-price"><div class="hxc-w"><div class="hxc-sh"><div>${d.eyebrow ? `<p class="hxc-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '요금표')}</h2>${d.sub ? `<p class="hxc-sd">${E(d.sub)}</p>` : ''}</div><a class="hxc-btn g sm" href="#shop">이용권 사러 가기${ic('arrow', 18)}</a></div>
<div class="hxc-pg${tb && pc ? '' : ' one'}">${tb}${pc ? `<div><p class="hxc-rq">이용권 · 대여</p>${pc}</div>` : ''}</div>
<p class="hxc-gnote">${ic('shield', 18)}<span>${ks.includes('student') && AL.student === '감면' ? '감면 대상은 첫 방문 때 프런트에서 확인한 뒤 감면 요금으로 예약할 수 있어요. ' : ''}요금은 현장 또는 예약 화면에서 결제해요.</span></p></div></section>`, x); }

  const SEC = { 'cx-cal': calSec, 'cx-track': trackSec, 'cx-cert': certSec, 'cx-month': monthSec, 'cx-civlist': civListSec, 'cx-how': howSec, 'cx-hours': hoursSec, 'cx-price': priceSec };
  const HERO = { civicclass: civicHero, facilitynow: facHero };

  /* ── 테마(수석 1종) ── */
  const DEF = {
    dutydesk: { name: '필수 교육 데스크', desc: '첫 화면에서 법정 · 필수 교육 마감과 이수율, 방문 목적별 바로가기 — 기업 HRD · 공공 직원 교육', tags: ['corp', 'public'], tone: 'light', dens: '보통',
      acc: '#2453D6', bg: '#FFFFFF', alt: '#F4F6F9', ink: '#0F1626', mu: '#4A5468', r: 14, br: 10, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#E8EEFB', base: 'official', hk: 'desk', hp: 'ledger', ck: 'list', sh: 'none', hx: 'td' },
    civicclass: { name: '시민 강좌 보드', desc: '첫 화면에서 이번 달 접수 중인 강좌(마감 D-day · 남은 자리 · 선착순/추첨)와 강좌 달력, 큰 글씨 · 전화 신청 — 공공 시민 강좌 · 평생학습관', tags: ['public'], tone: 'light', dens: '여유',
      acc: '#0F766E', bg: '#FBFAF7', alt: '#F3F1EA', ink: '#1A1D1B', mu: '#4D524E', r: 20, br: 14, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#E3F1EE', base: 'official', hk: 'desk', hp: 'ledger', ck: 'photo', sh: 'none', hx: 'cv' },
    facilitynow: { name: '오늘의 시설', desc: '첫 화면에서 예약할 수 있는 시설 · 운영 시간 · 칸 · 정원과 휴관 띠, 시설 × 시간 운영표 · 요금표 — 공공 체육 · 문화 시설', tags: ['public'], tone: 'light', dens: '보통',
      acc: '#1D4ED8', bg: '#FFFFFF', alt: '#F3F5F8', ink: '#0E1525', mu: '#475166', r: 16, br: 12, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#E6ECFB', base: 'official', hk: 'desk', hp: 'ledger', ck: 'list', sh: 'none', hx: 'fn' }
  };
  const HD = {
    dutydesk: { hf: 'sans', hw: 800, hls: -0.035, h1: 52, h1m: 34, lh1: 1.16, h2: 34, h2m: 26, h3: 18, body: 16, blh: 1.68, lead: 17.5, ey: { fs: 13, ls: 0.02, fw: 750, tt: 'none' }, sec: 96, secm: 60, w: 1240, gut: 40,
      r: 14, rs: 8, br: 10, bh: 50, bpx: 22, bfw: 700, bls: -0.01, bd: '1px solid rgba(15,22,38,.1)', sh: '0 1px 2px rgba(15,22,38,.05)', shh: '0 18px 36px -22px rgba(15,22,38,.3)', hov: 'lift', em: 'accent', link: 'hover' },
    civicclass: { hf: 'sans', hw: 800, hls: -0.03, h1: 54, h1m: 34, lh1: 1.2, h2: 34, h2m: 27, h3: 19, body: 17, blh: 1.72, lead: 18.5, ey: { fs: 14, ls: 0.01, fw: 750, tt: 'none' }, sec: 96, secm: 60, w: 1240, gut: 40,
      r: 20, rs: 10, br: 14, bh: 52, bpx: 24, bfw: 750, bls: -0.01, bd: '1px solid rgba(26,29,27,.1)', sh: '0 1px 2px rgba(26,29,27,.05)', shh: '0 18px 36px -22px rgba(26,29,27,.3)', hov: 'lift', em: 'accent', link: 'hover' },
    facilitynow: { hf: 'sans', hw: 800, hls: -0.035, h1: 54, h1m: 34, lh1: 1.15, h2: 34, h2m: 26, h3: 18, body: 16, blh: 1.66, lead: 17.5, ey: { fs: 13, ls: 0.02, fw: 750, tt: 'none' }, sec: 96, secm: 60, w: 1240, gut: 40,
      r: 16, rs: 8, br: 12, bh: 52, bpx: 22, bfw: 750, bls: -0.01, bd: '1px solid rgba(14,21,37,.1)', sh: '0 1px 2px rgba(14,21,37,.05)', shh: '0 18px 36px -22px rgba(14,21,37,.3)', hov: 'lift', em: 'accent', link: 'hover' }
  };
  const MINE = Object.keys(DEF);
  const fits = id => { const t = ty(), e = ed(); if (!DEF[id]) return false; if (id === 'dutydesk') return t === 'corp' || (t === 'public' && (e === 'staff' || !e)); if (id === 'civicclass') return t === 'public' && e === 'citizen'; if (id === 'facilitynow') return t === 'public' && e === 'facility'; return DEF[id].tags.includes(t); };
  const ON = MINE.filter(id => ALL || (+PASS[id] || 0) >= 82);
  const mineOn = s => !!(s && s.theme && ON.includes(s.theme) && HPT.has(s.theme));

  /* ── CSS ── */
  function css(s) { const T = HPT.tokens(s) || {}; const a = T.a || '#2453D6'; const R = HPT.ramp ? HPT.ramp(a) : {}; const onA = HPT.onColor ? HPT.onColor(a) : '#fff';
    const at = fit(a, '#ffffff', 4.6); const warnT = fit(WARN, '#ffffff', 4.6); const ink = T.ink || '#0F1626'; const mu = fit(T.mu || '#4A5468', '#F4F6F9', 4.6);
    const tint = R[50] || mix(a, '#ffffff', .94); const line = 'rgba(15,22,38,.1)'; const navy = fit(mix(a, '#0B1020', .62), '#ffffff', 10, '#000000');
    return `/* hxc-corp */
.hxc{--hxc-a:${a};--hxc-on:${onA};--hxc-at:${at};--hxc-t:${tint};--hxc-t2:${R[100] || mix(a, '#ffffff', .86)};--hxc-ink:${ink};--hxc-mu:${mu};--hxc-ln:${line};--hxc-w:${warnT};--hxc-wb:${al(WARN, .1)};--hxc-nv:${navy};--hxc-r:14px;--hxc-gut:clamp(16px,4vw,40px);font-variant-numeric:tabular-nums}
.hxc .hxc-w{max-width:1240px;margin:0 auto;padding:0 var(--hxc-gut);position:relative;z-index:1}
.hxc .hxc-ey{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:750;letter-spacing:.02em;color:var(--hxc-at);margin:0 0 14px}.hxc .hxc-ey i{width:8px;height:8px;border-radius:2px;background:var(--hxc-a)}
.hxc .hxc-btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.hxc .hxc-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 22px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:-.01em;white-space:nowrap;text-decoration:none;transition:background .15s,box-shadow .15s,transform .15s}
.hxc .hxc-btn.p{background:var(--hxc-a);color:var(--hxc-on);box-shadow:0 10px 22px -12px ${al(a, .8)}}.hxc .hxc-btn.p:hover{background:${mix(a, '#000000', .14)}}
.hxc .hxc-btn.g{background:#fff;color:var(--hxc-ink);box-shadow:inset 0 0 0 1.5px ${al(ink, .16)}}.hxc .hxc-btn.g:hover{box-shadow:inset 0 0 0 1.5px var(--hxc-a);color:var(--hxc-at)}.hxc .hxc-btn.sm{min-height:44px;font-size:15px;padding:0 16px}
.hxc .hxc-btn svg{transition:transform .15s}.hxc .hxc-btn:hover svg{transform:translateX(3px)}
.hxc a:focus-visible{outline:3px solid ${fit(a, '#ffffff', 3)};outline-offset:3px;border-radius:10px}
.hxc .hxc-img{margin:0;position:relative;overflow:hidden;background:var(--hxc-t2)}.hxc .hxc-img>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;max-height:none;border-radius:0}
.hxc .hxc-dd{display:inline-flex;align-items:center;justify-content:center;min-width:58px;height:28px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:750;background:var(--hxc-t);color:var(--hxc-at);white-space:nowrap}.hxc .hxc-dd.warn{background:var(--hxc-wb);color:var(--hxc-w)}.hxc .hxc-dd.end{background:#EEF0F3;color:#4A5468}
/* 첫 화면 */
.hpt.hxc-hero{padding:56px 0 64px;background:linear-gradient(180deg,${mix(tint, '#ffffff', .35)} 0%,#ffffff 72%);color:var(--hxc-ink);overflow:hidden}
.hxc-hero .hxc-tdg{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:56px;align-items:center}.hxc-hero .hxc-tdg.one{grid-template-columns:minmax(0,6fr) minmax(0,6fr)}
.hxc-hero h1{font-size:clamp(34px,4.3vw,56px);line-height:1.16;letter-spacing:-.035em;font-weight:800;margin:0;text-wrap:balance;color:var(--hxc-ink)}
.hxc-hero .hxc-sub{font-size:18px;line-height:1.65;color:var(--hxc-mu);margin:20px 0 0;max-width:30em}
.hxc-hero .hxc-inv{display:flex;align-items:center;gap:8px;margin:20px 0 0;font-size:14px;color:var(--hxc-mu)}.hxc-hero .hxc-inv svg{color:var(--hxc-at)}.hxc-hero .hxc-inv a{color:var(--hxc-at);font-weight:700;text-decoration:underline;text-underline-offset:3px;display:inline-block;padding:12px 2px;margin:-12px 0}
.hxc-hero .hxc-tdv{position:relative;min-height:520px}
.hxc-hero .hxc-hph{position:absolute;inset:0 0 0 72px;border-radius:24px;box-shadow:0 30px 60px -36px rgba(15,22,38,.45)}
.hxc-hero .hxc-hph::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,22,38,.28),rgba(15,22,38,0) 46%)}
.hxc-led{position:absolute;left:0;bottom:28px;width:min(480px,86%);background:#fff;border-radius:18px;border:1px solid var(--hxc-ln);box-shadow:0 2px 4px rgba(15,22,38,.04),0 28px 56px -28px rgba(15,22,38,.42);overflow:hidden}
.hxc-led header{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--hxc-ln)}
.hxc-led .hxc-lic{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--hxc-t);color:var(--hxc-at)}
.hxc-led .hxc-lht{flex:1;min-width:0;display:flex;flex-direction:column}.hxc-led .hxc-lht b{font-size:16px;font-weight:750;letter-spacing:-.01em}.hxc-led .hxc-lht small{font-size:13px;color:var(--hxc-mu)}
.hxc-led .hxc-avg{display:flex;flex-direction:column;align-items:flex-end}.hxc-led .hxc-avg b{font-size:28px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--hxc-ink)}.hxc-led .hxc-avg b small{font-size:15px;margin-left:1px}.hxc-led .hxc-avg>small{font-size:13px;color:var(--hxc-mu);margin-top:4px}
.hxc-led ol{list-style:none;margin:0;padding:6px 8px}
.hxc-led li a{display:grid;grid-template-columns:minmax(0,1fr) 72px 40px auto;align-items:center;gap:12px;min-height:58px;padding:8px 12px;border-radius:12px;color:inherit;text-decoration:none}.hxc-led li a:hover{background:${mix(tint, '#ffffff', .3)}}
.hxc-led li+li a{box-shadow:0 -1px 0 var(--hxc-ln)}.hxc-led li a:hover,.hxc-led li:hover+li a{box-shadow:none}
.hxc-ln{display:flex;flex-direction:column;min-width:0}.hxc-ln b{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hxc-ln small{font-size:13px;color:var(--hxc-mu)}
.hxc-bar{height:8px;border-radius:99px;background:#E9EDF3;overflow:hidden}.hxc-bar i{display:block;height:100%;border-radius:99px;background:var(--hxc-a)}
.hxc-pc{font-style:normal;font-size:14px;font-weight:750;text-align:right}
.hxc-led footer a{display:flex;align-items:center;gap:10px;min-height:52px;padding:0 20px;background:var(--hxc-nv);color:#fff;font-size:14px;text-decoration:none}.hxc-led footer a span{flex:1}.hxc-led footer a b{font-weight:750}
.hxc-roles{margin-top:48px}.hxc-roles .hxc-rq{font-size:14px;font-weight:750;color:var(--hxc-mu);margin:0 0 12px}
.hxc-roles ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.hxc-roles a{display:flex;align-items:center;gap:14px;min-height:84px;padding:16px 18px;background:#fff;border:1px solid var(--hxc-ln);border-radius:16px;color:inherit;text-decoration:none;box-shadow:0 1px 2px rgba(15,22,38,.04);transition:border-color .15s,box-shadow .15s,transform .15s}
.hxc-roles a:hover{border-color:${al(a, .5)};box-shadow:0 16px 30px -20px ${al(a, .55)};transform:translateY(-2px)}
.hxc-roles a>i{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--hxc-t);color:var(--hxc-at)}
.hxc-roles a>span{flex:1;min-width:0;display:flex;flex-direction:column}.hxc-roles b{font-size:16px;font-weight:750;letter-spacing:-.01em}.hxc-roles small{font-size:13px;color:var(--hxc-mu);line-height:1.45}.hxc-roles a>svg{color:var(--hxc-at);flex:none}
/* 공통 섹션 머리 */
.hpt.hxc.hp-s{padding:96px 0}.hpt.hxc.hp-s.hp-alt{background:#F4F6F9}
.hxc .hxc-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:36px}.hxc .hxc-sh h2,.hxc-cert h2{font-size:clamp(26px,2.9vw,36px);line-height:1.25;letter-spacing:-.03em;font-weight:800;margin:0;color:var(--hxc-ink)}
.hxc .hxc-sd{font-size:16.5px;color:var(--hxc-mu);line-height:1.7;margin:12px 0 0;max-width:40em}
/* 간트 */
.hxc-lg{display:flex;flex-wrap:wrap;gap:8px 18px;list-style:none;margin:0;padding:0;font-size:13px;color:var(--hxc-mu)}.hxc-lg li{display:flex;align-items:center;gap:8px}.hxc-lg i{width:18px;height:10px;border-radius:99px}.hxc-lg .a{background:var(--hxc-t2)}.hxc-lg .b{background:var(--hxc-a)}.hxc-lg .c{background:${al(WARN, .55)}}
.hxc-gantt{border:1px solid var(--hxc-ln);border-radius:18px;background:#fff;box-shadow:0 1px 2px rgba(15,22,38,.04),0 20px 44px -34px rgba(15,22,38,.4);overflow:hidden}
.hxc-gm,.hxc-gr{display:grid;grid-template-columns:minmax(200px,280px) minmax(0,1fr) 104px;gap:20px;align-items:center}
.hxc-gm{padding:14px 20px;background:#F7F9FB;border-bottom:1px solid var(--hxc-ln);font-size:13px;font-weight:700;color:var(--hxc-mu)}
.hxc-gms{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr))}.hxc-gms span{display:flex;flex-direction:column;justify-content:flex-end;padding-left:8px;border-left:1px solid var(--hxc-ln);line-height:1.3}.hxc-gms small{font-size:13px;font-weight:600;color:var(--hxc-mu)}
.hxc-gbody{position:relative;padding:6px 0}
.hxc-gbody ol{list-style:none;margin:0;padding:0;position:relative}
.hxc-gr{min-height:68px;padding:10px 20px;color:inherit;text-decoration:none;position:relative}.hxc-gbody li+li .hxc-gr{border-top:1px solid ${al(ink, .06)}}.hxc-gr:hover{background:${mix(tint, '#ffffff', .4)}}
.hxc-gn{display:flex;flex-direction:column;min-width:0}.hxc-gn b{font-size:15.5px;font-weight:700}.hxc-gn small{font-size:13px;color:var(--hxc-mu)}
.hxc-gt{position:relative;height:26px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(100%/var(--n) - 1px),${al(ink, .07)} calc(100%/var(--n) - 1px),${al(ink, .07)} calc(100%/var(--n)))}
.hxc-gb{position:absolute;top:4px;height:18px;border-radius:99px;background:var(--hxc-t2);overflow:hidden;box-shadow:inset 0 0 0 1px ${al(a, .25)}}.hxc-gb>i{display:block;height:100%;background:var(--hxc-a);border-radius:99px}.hxc-gb.hot{box-shadow:inset 0 0 0 2px ${al(WARN, .7)}}
.hxc-gms{position:relative}.hxc-tdm{position:absolute;bottom:-26px;transform:translateX(-50%);font-style:normal;font-size:13px;font-weight:750;color:#fff;background:${fit(WARN, '#ffffff', 4.6)};padding:1px 8px;border-radius:6px;white-space:nowrap;z-index:3}
.hxc-tdl{position:absolute;top:-12px;bottom:-12px;width:2px;margin-left:-1px;background:${al(WARN, .75)};z-index:2}
.hxc-gm .hxc-gpad{display:block}
.hxc-gnote{display:flex;align-items:flex-start;gap:10px;margin:18px 0 0;font-size:14px;color:var(--hxc-mu);line-height:1.6}.hxc-gnote svg{color:var(--hxc-at);margin-top:2px}
/* 직무 트랙 */
.hxc-tg{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:20px}
.hxc-th{display:flex;align-items:center;gap:10px;margin:0 0 14px}.hxc-th i{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-style:normal;font-size:14px;font-weight:800;background:var(--hxc-a);color:var(--hxc-on)}.hxc-th b{font-size:18px;font-weight:800;letter-spacing:-.02em}.hxc-th small{margin-left:auto;font-size:13px;color:var(--hxc-mu)}
.hxc-tc ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.hxc-cc{display:grid;grid-template-columns:112px minmax(0,1fr);gap:16px;align-items:center;padding:12px;background:#fff;border:1px solid var(--hxc-ln);border-radius:16px;color:inherit;text-decoration:none;transition:box-shadow .15s,transform .15s,border-color .15s}
.hxc-cc:hover{transform:translateY(-2px);border-color:${al(a, .4)};box-shadow:0 18px 32px -22px rgba(15,22,38,.4)}
.hxc-ct{aspect-ratio:4/3;border-radius:11px;width:100%}.hxc-cph{display:grid;place-items:center;background:var(--hxc-t);color:var(--hxc-at)}
.hxc-cb{display:flex;flex-direction:column;gap:4px;min-width:0}.hxc-cb b{font-size:16px;font-weight:750;letter-spacing:-.01em;line-height:1.35}.hxc-cb small{font-size:13px;color:var(--hxc-mu)}
.hxc-chips{display:flex;flex-wrap:wrap;gap:6px}.hxc-chips em{font-style:normal;font-size:13px;font-weight:650;padding:1px 8px;border-radius:6px;background:#EEF1F5;color:#3A4456}
/* 이수증 */
.hxc-cg{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:64px;align-items:center}
.hxc-st{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:4px;counter-reset:s}
.hxc-st li{display:flex;gap:16px;align-items:flex-start;padding:14px 0;position:relative}.hxc-st li+li::before{content:'';position:absolute;left:17px;top:-14px;height:28px;width:2px;background:var(--hxc-t2)}
.hxc-st i{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:15px;background:var(--hxc-t);color:var(--hxc-at);box-shadow:inset 0 0 0 1.5px ${al(a, .35)}}
.hxc-st span{display:flex;flex-direction:column}.hxc-st b{font-size:17px;font-weight:750}.hxc-st small{font-size:14.5px;color:var(--hxc-mu)}
.hxc-paper{margin:0;position:relative;padding:28px;border-radius:24px;background:linear-gradient(135deg,var(--hxc-t) 0%,#EEF1F6 100%)}
.hxc-pp{position:relative;background:#FFFDF8;border-radius:10px;padding:40px 44px 32px;box-shadow:0 1px 2px rgba(15,22,38,.06),0 30px 60px -30px rgba(15,22,38,.45);outline:1px solid ${al(a, .18)};outline-offset:-12px;transform:rotate(-1.2deg)}
.hxc-pk{margin:0;text-align:center;font-size:13px;letter-spacing:.24em;font-weight:700;color:var(--hxc-at)}.hxc-pt{margin:8px 0 26px;text-align:center;font-size:34px;font-weight:800;letter-spacing:.5em;color:var(--hxc-ink);padding-left:.5em}
.hxc-pp dl{margin:0;display:grid;gap:12px}.hxc-pp dl>div{display:grid;grid-template-columns:88px minmax(0,1fr);gap:12px;padding-bottom:10px;border-bottom:1px dashed ${al(ink, .14)}}.hxc-pp dt{font-size:13px;color:var(--hxc-mu);font-weight:650}.hxc-pp dd{margin:0;font-size:15.5px;font-weight:700}.hxc-pp .hxc-blank{color:var(--hxc-mu);font-weight:500}.hxc-pp .hxc-num{font-variant-numeric:tabular-nums}
.hxc-po{display:flex;align-items:center;justify-content:flex-end;gap:14px;margin:24px 0 0;font-size:17px}.hxc-seal{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#fff;background:${fit(WARN, '#ffffff', 4.6)};box-shadow:0 0 0 4px ${al(WARN, .18)}}
.hxc-paper figcaption{margin-top:18px;text-align:center;font-size:13px;color:var(--hxc-mu)}
/* 공통 부품 보정(이 묶음 사이트): 공지 태그 · 새 글 점 13px 이상 */
.hpt .hps-tag,.hpt .hps-chip{font-size:13px!important}.hpt .hps-new{font-size:13px!important;width:22px!important;height:22px!important}
/* ── A3 공용: 판 행 오른쪽 배지 · 신청 방식 ── */
.hxc-md{display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;font-style:normal;font-size:13px;font-weight:750;white-space:nowrap}.hxc-md.fst{background:var(--hxc-t);color:var(--hxc-at)}.hxc-md.lot{background:#FFF1D6;color:#8A5300}.hxc-md.apr{background:#EEF0F3;color:#3A4456}
.hxc-seat,.hxc-hr{font-style:normal;font-size:13.5px;font-weight:700;color:var(--hxc-ink);white-space:nowrap}.hxc-seat.warn{color:var(--hxc-w)}
.hxc-cvr{display:flex;align-items:center;gap:8px;justify-content:flex-end}
.hxc-cv .hxc-led li a,.hxc-fn .hxc-led li a{grid-template-columns:minmax(0,1fr) auto auto}
.hxc-tel{margin:22px 0 0}.hxc-tel a{display:inline-flex;align-items:center;gap:12px;min-height:60px;padding:8px 22px 8px 10px;border-radius:999px;background:#fff;border:1.5px solid ${al(a, .35)};color:var(--hxc-ink);text-decoration:none}.hxc-tel a>svg{width:40px;height:40px;padding:9px;border-radius:50%;background:var(--hxc-a);color:var(--hxc-on);flex:none}
.hxc-tel span{display:flex;flex-direction:column;line-height:1.25}.hxc-tel small{font-size:13.5px;color:var(--hxc-mu)}.hxc-tel b{font-size:21px;font-weight:800;letter-spacing:-.01em}.hxc-tel a:hover{border-color:var(--hxc-a)}
.hxc-hrs{display:flex;align-items:center;gap:12px;margin:24px 0 0;padding:14px 16px;border-radius:14px;background:var(--hxc-t);max-width:30em}.hxc-hrs>svg{color:var(--hxc-at);flex:none}.hxc-hrs span{display:flex;flex-direction:column}.hxc-hrs small{font-size:13px;color:var(--hxc-mu)}.hxc-hrs b{font-size:16px;font-weight:750}
.hxc .hxc-btn.w{background:#fff;color:var(--hxc-nv)}.hxc .hxc-btn.w:hover{background:var(--hxc-t)}
/* ── 시민 강좌(civicclass): 미색 바탕 · 큰 글씨 · 반경 20 ── */
.hpt.hxc-hero.hxc-cv{background:linear-gradient(180deg,#F6F2E8 0%,#FBFAF7 78%)}
.hxc-cv h1{font-size:clamp(34px,4.4vw,58px);line-height:1.2}.hxc-cv .hxc-sub{font-size:19px}.hxc-cv .hxc-btn{min-height:56px;font-size:17px;padding:0 26px;border-radius:14px}
.hxc-cv .hxc-hph{border-radius:28px}.hxc-cv .hxc-led{border-radius:22px;width:min(520px,90%)}.hxc-cv .hxc-ln b{font-size:16px}.hxc-cv .hxc-ln small{font-size:14px}
.hxc-cvg{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:56px;align-items:center}
.hxc-cvp{position:relative}.hxc-cv .hxc-cvp .hxc-hph{position:relative;inset:auto;aspect-ratio:4/3;border-radius:28px;box-shadow:0 30px 60px -36px rgba(15,22,38,.45)}.hxc-cv .hxc-cvp .hxc-hph::after{display:none}
.hxc-stk{position:absolute;left:-28px;bottom:32px;margin:0;display:flex;align-items:center;gap:12px;padding:14px 22px 14px 18px;border-radius:20px;background:var(--hxc-nv);color:#fff;box-shadow:0 22px 40px -22px rgba(15,22,38,.6)}.hxc-stk b{font-size:40px;font-weight:800;line-height:1;letter-spacing:-.03em}.hxc-stk span{font-size:14.5px;line-height:1.35;font-weight:650}
.hxc-tix{margin-top:48px}.hxc-tixh{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.hxc-tixh .hxc-rq{margin:0}
.hxc-more2{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:15px;font-weight:700;color:var(--hxc-at);text-decoration:none}
.hxc-tix ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.hxc-tk2{display:flex;flex-direction:column;gap:6px;height:100%;padding:18px 20px;background:#fff;border-radius:20px;border:1px solid var(--hxc-ln);color:inherit;text-decoration:none;box-shadow:0 1px 2px rgba(15,22,38,.04);transition:transform .15s,box-shadow .15s,border-color .15s}
.hxc-tk2:hover{transform:translateY(-2px);border-color:${al(a, .45)};box-shadow:0 18px 32px -22px rgba(15,22,38,.4)}
.hxc-tkt{display:flex;align-items:baseline;gap:8px;padding-bottom:12px;margin-bottom:6px;border-bottom:1.5px dashed ${al(ink, .14)}}.hxc-tkd{font-style:normal;font-size:28px;font-weight:800;letter-spacing:-.02em;line-height:1.1;color:var(--hxc-at)}.hxc-tkd.warn{color:var(--hxc-w)}.hxc-tkt small{font-size:13px;color:var(--hxc-mu)}
.hxc-tk2>b{font-size:17px;font-weight:750;line-height:1.35}.hxc-tk2>small{font-size:14px;color:var(--hxc-mu)}.hxc-tk2 .hxc-chips{margin-top:auto;padding-top:6px}.hxc-tk2 .hxc-bar{margin-top:4px}
.hxc-pills ul{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
.hxc-pills a{display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:0 20px 0 14px;border-radius:999px;background:#fff;border:1.5px solid var(--hxc-ln);color:var(--hxc-ink);text-decoration:none;transition:border-color .15s}.hxc-pills a:hover{border-color:var(--hxc-a)}
.hxc-pills i{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--hxc-t);color:var(--hxc-at)}.hxc-pills b{font-size:16px;font-weight:750}.hxc-pills small{font-size:14px;color:var(--hxc-mu)}
.hxc-lanes.one{grid-template-columns:minmax(0,640px)}
.hxc-fe ol li a{grid-template-columns:minmax(0,1fr) auto!important}
.hxc-cv .hxc-roles a{border-radius:20px;min-height:92px;background:#fff}.hxc-cv .hxc-roles b{font-size:17.5px}.hxc-cv .hxc-roles small{font-size:14px}.hxc-cv .hxc-rq,.hxc-mon .hxc-rq{font-size:15px}
.hpt.hxc.hxc-mon,.hpt.hxc.hxc-how{background:#FBFAF7}.hpt.hxc.hxc-kl.hp-alt{background:#F3F1EA}
/* 달력 */
.hxc-lg .o{background:var(--hxc-nv)}
.hxc-mg{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:28px;align-items:start}
.hxc-cal2{background:#fff;border:1px solid var(--hxc-ln);border-radius:22px;padding:22px 22px 18px;box-shadow:0 1px 2px rgba(26,29,27,.04),0 24px 48px -36px rgba(26,29,27,.4)}
.hxc-mt{margin:0 0 12px;font-size:20px;font-weight:800;letter-spacing:-.02em}
.hxc-wd,.hxc-days{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.hxc-wd li{font-size:13.5px;font-weight:750;color:var(--hxc-mu);padding:6px 8px}.hxc-wd .su,.hxc-days .su .hxc-mn{color:${fit('#C2410C', '#ffffff', 4.6)}}.hxc-wd .sa,.hxc-days .sa .hxc-mn{color:${fit('#1D4ED8', '#ffffff', 4.6)}}
.hxc-days{border-top:1px solid var(--hxc-ln);border-left:1px solid var(--hxc-ln)}
.hxc-days li{min-height:104px;padding:8px;border-right:1px solid var(--hxc-ln);border-bottom:1px solid var(--hxc-ln);display:flex;flex-direction:column;gap:5px;min-width:0}.hxc-days li.x{background:#FAF9F5}
.hxc-mn{font-size:15px;font-weight:750;display:flex;align-items:center;gap:6px}.hxc-mn small{font-size:13px;font-weight:750;color:#fff;background:var(--hxc-w);padding:0 7px;border-radius:6px}
.hxc-days li.td{background:${al(WARN, .05)}}
.hxc-mcs{display:flex;flex-direction:column;gap:4px;min-width:0}
.hxc-mc{display:block;font-size:13px;font-weight:650;line-height:1.35;padding:3px 7px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;color:var(--hxc-ink);background:var(--hxc-t)}.hxc-mc::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--k);margin-right:5px;vertical-align:1px}
.hxc-mc.open{background:var(--hxc-nv);color:#fff}.hxc-mc.open::before{background:#fff}.hxc-mc.due{background:var(--hxc-wb);color:var(--hxc-w)}.hxc-mc.due::before{background:${WARN}}
.hxc-more{font-style:normal;font-size:13px;color:var(--hxc-mu);font-weight:700}
.hxc-dots{display:none;gap:3px;flex-wrap:wrap}.hxc-dots i{width:7px;height:7px;border-radius:50%;background:var(--k)}.hxc-dots i.open{background:var(--hxc-nv)}.hxc-dots i.due{background:${WARN}}
${[0, 1, 2, 3, 4, 5].map(i => `.hxc .k${i}{--k:${[R[700], R[400], R[900], R[500], R[300], R[600]][i] || a}}`).join('')}
.hxc-mlg{display:flex;flex-direction:column;gap:12px}.hxc-mlg .hxc-rq{margin:0;font-weight:750;color:var(--hxc-mu)}
.hxc-mlg ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.hxc-mlg li a{display:flex;align-items:center;gap:12px;min-height:64px;padding:10px 14px;background:#fff;border:1px solid var(--hxc-ln);border-radius:16px;color:inherit;text-decoration:none}.hxc-mlg li a:hover{border-color:${al(a, .5)}}
.hxc-mlg li a>i{flex:none;width:12px;height:36px;border-radius:6px;background:var(--k)}.hxc-mlg li a>span{flex:1;min-width:0;display:flex;flex-direction:column}.hxc-mlg b{font-size:15.5px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hxc-mlg small{font-size:13.5px;color:var(--hxc-mu)}.hxc-mlg li a>svg{color:var(--hxc-at);flex:none}
.hxc-mlg .hxc-btn{margin-top:4px}
/* 강좌 카드 */
.hxc-kg{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.hxc-kc{display:flex;flex-direction:column;height:100%;background:#fff;border:1px solid var(--hxc-ln);border-radius:20px;overflow:hidden;color:inherit;text-decoration:none;transition:transform .15s,box-shadow .15s,border-color .15s}.hxc-kc:hover{transform:translateY(-3px);border-color:${al(a, .4)};box-shadow:0 22px 40px -26px rgba(26,29,27,.45)}
.hxc-kt{aspect-ratio:16/10;width:100%}.hxc-kb{display:flex;flex-direction:column;gap:8px;padding:18px 20px 20px;flex:1}.hxc-kb>b{font-size:18px;font-weight:800;letter-spacing:-.015em;line-height:1.35}.hxc-kb>small{font-size:14px;color:var(--hxc-mu)}
.hxc-kb .hxc-chips{gap:6px}.hxc-kb .hxc-chips em{font-size:13px}
.hxc-cap{display:flex;flex-direction:column;gap:6px;margin-top:auto;padding-top:6px}.hxc-cap small{font-size:13.5px;color:var(--hxc-mu)}.hxc-cap small b{color:var(--hxc-ink);font-size:15px}.hxc-cn{margin-top:auto;padding-top:6px;font-size:13.5px;color:var(--hxc-at);font-weight:700}
/* 신청 방법 */
.hxc-lanes{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.hxc-lane{background:#fff;border:1px solid var(--hxc-ln);border-radius:22px;padding:24px 26px}.hxc-lh{margin:0 0 10px}.hxc-lane .hxc-md{height:32px;font-size:15px;padding:0 14px}
.hxc-lane ol{list-style:none;margin:0;padding:0;display:grid;gap:2px}.hxc-lane li{display:flex;gap:14px;align-items:flex-start;padding:12px 0}.hxc-lane li+li{border-top:1px dashed ${al(ink, .12)}}
.hxc-lane li>i{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:15px;background:var(--hxc-t);color:var(--hxc-at)}.hxc-lane.lot li>i{background:#FFF1D6;color:#8A5300}
.hxc-lane li span{display:flex;flex-direction:column}.hxc-lane b{font-size:17px;font-weight:750}.hxc-lane small{font-size:14.5px;color:var(--hxc-mu);line-height:1.55}
.hxc-band{margin-top:24px;display:flex;align-items:center;gap:18px;padding:22px 26px;border-radius:22px;background:var(--hxc-nv);color:#fff}
.hxc-band .hxc-bi{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.12)}
.hxc-band p{flex:1;margin:0;display:flex;flex-direction:column;gap:4px}.hxc-band b{font-size:18px;font-weight:800}.hpt .hxc-band small{font-size:14.5px;color:rgba(255,255,255,.86)!important;line-height:1.55}
/* ── 오늘의 시설(facilitynow): 흰 바탕 + 진한 기관 색 판 ── */
.hpt.hxc-hero.hxc-fn{background:#fff;padding-top:0}.hxc-fn>.hxc-w{padding-top:52px}
.hxc-off{background:${al(WARN, .09)};border-bottom:1px solid ${al(WARN, .25)}}.hxc-off p{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;margin:0;min-height:52px;padding:6px 0;font-size:14.5px;color:var(--hxc-ink)}
.hxc-off p>b{display:inline-flex;align-items:center;gap:6px;color:var(--hxc-w);font-weight:800}.hxc-off p>span{flex:1;min-width:0}.hxc-off span i{font-style:normal;margin:0 8px;color:var(--hxc-mu)}.hxc-off a{display:inline-flex;align-items:center;gap:4px;min-height:44px;font-weight:750;color:var(--hxc-w);text-decoration:none}
.hxc-fn .hxc-hph::after{background:linear-gradient(90deg,rgba(14,21,37,.35),rgba(14,21,37,0) 50%)}
.hxc-fn .hxc-led{border:0;background:var(--hxc-nv);color:#fff;box-shadow:0 30px 60px -28px rgba(14,21,37,.6)}
.hxc-fn .hxc-led header{border-bottom-color:rgba(255,255,255,.14)}.hxc-fn .hxc-led .hxc-lic{background:rgba(255,255,255,.12);color:#fff}
.hpt.hxc-fn .hxc-led small{color:rgba(255,255,255,.8)!important}.hxc-fn .hxc-led .hxc-avg b{color:#fff}
.hxc-fn .hxc-led li+li a{box-shadow:0 -1px 0 rgba(255,255,255,.12)}.hxc-fn .hxc-led li a:hover{background:rgba(255,255,255,.08)}
.hxc-fn .hxc-led .hxc-hr{color:#fff}.hxc-fn .hxc-led .hxc-md.fst{background:rgba(255,255,255,.95);color:var(--hxc-nv)}.hxc-fn .hxc-led .hxc-md.apr{background:rgba(255,255,255,.16);color:#fff}
.hxc-fn .hxc-led footer a{background:var(--hxc-a);color:var(--hxc-on)}
/* 운영표 */
.hxc-tt{border:1px solid var(--hxc-ln);border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 1px 2px rgba(14,21,37,.04),0 20px 44px -34px rgba(14,21,37,.4)}
.hxc-tk,.hxc-fr{display:grid;grid-template-columns:minmax(200px,260px) minmax(0,1fr);gap:20px;align-items:center}
.hxc-tk{padding:12px 20px 10px;background:#F7F8FA;border-bottom:1px solid var(--hxc-ln)}.hxc-tks{position:relative;height:20px;margin-left:44px}.hxc-tks span:last-child{transform:translateX(-100%)}.hxc-tks span{position:absolute;transform:translateX(-50%);white-space:nowrap;font-size:13px;font-weight:700;color:var(--hxc-mu)}
.hxc-tb{list-style:none;margin:0;padding:0}.hxc-tb>li+li .hxc-fr{border-top:1px solid ${al(ink, .07)}}
.hxc-fr{padding:14px 20px;color:inherit;text-decoration:none}.hxc-fr:hover{background:${mix(tint, '#ffffff', .4)}}
.hxc-fnm{display:flex;flex-direction:column;min-width:0}.hxc-fnm b{font-size:16px;font-weight:750}.hxc-fnm small{font-size:13px;color:var(--hxc-mu)}
.hxc-lns{list-style:none;margin:0;padding:0;display:grid;gap:5px}.hxc-lns li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:8px;align-items:center}.hxc-lns em{font-style:normal;font-size:13px;font-weight:700;color:var(--hxc-mu)}
.hxc-tr{position:relative;height:24px;border-radius:6px;background:#F1F3F6}
.hxc-op,.hxc-shut{font-style:normal}.hxc-op{position:absolute;top:0;bottom:0;border-radius:6px;background:var(--hxc-a) repeating-linear-gradient(90deg,transparent 0,transparent calc(var(--sl) - 1.5px),rgba(255,255,255,.4) calc(var(--sl) - 1.5px),rgba(255,255,255,.4) var(--sl));display:flex;align-items:center;padding:0 8px;min-width:0}
.hxc-op b{font-size:13px;font-weight:750;color:var(--hxc-on);white-space:nowrap;overflow:hidden}
.hxc-shut{position:absolute;inset:0;display:flex;align-items:center;padding:0 10px;font-style:normal;font-size:13px;font-weight:750;color:var(--hxc-w);background:repeating-linear-gradient(135deg,${al(WARN, .08)} 0 6px,transparent 6px 12px);border-radius:6px}
/* 요금표 */
.hxc-pg{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:24px;align-items:start}.hxc-pg.one{grid-template-columns:1fr}.hxc-pg .hxc-rq{margin:0 0 10px;font-size:14px;font-weight:750;color:var(--hxc-mu)}
.hxc-pt2{background:#fff;border:1px solid var(--hxc-ln);border-radius:18px;overflow:hidden}
.hxc-ph,.hxc-pr{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(var(--k),minmax(0,1fr));gap:12px;align-items:center;padding:12px 20px}
.hxc-ph{background:#F7F8FA;font-size:13px;font-weight:750;color:var(--hxc-mu)}.hxc-ph span:not(:first-child),.hxc-pv{text-align:right}
.hxc-pr{min-height:60px;border-top:1px solid ${al(ink, .07)}}.hxc-pn{display:flex;flex-direction:column}.hxc-pn b{font-size:15.5px;font-weight:750}.hxc-pn small{font-size:13px;color:var(--hxc-mu)}.hxc-pv{font-size:15.5px;font-weight:750}
.hxc-pp2{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.hxc-pp2 a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;padding:12px 18px;background:#fff;border:1px solid var(--hxc-ln);border-radius:16px;color:inherit;text-decoration:none}.hxc-pp2 a:hover{border-color:${al(a, .5)}}
.hxc-pp2 a>span:first-child{display:flex;flex-direction:column;min-width:0}.hxc-pp2 small{font-size:13px;color:var(--hxc-mu)}.hxc-pp2 b{font-size:16px;font-weight:750}
.hxc-pw{display:flex;flex-direction:column;align-items:flex-end}.hxc-pw b{font-size:17px;font-weight:800}.hxc-pw em{font-style:normal;font-size:13px;font-weight:750;color:var(--hxc-w)}
/* 반응형 */
@media (max-width:1080px){.hxc-hero .hxc-tdg,.hxc-hero .hxc-tdg.one{grid-template-columns:1fr;gap:32px}.hxc-hero .hxc-tdv{min-height:0;display:flex;flex-direction:column}.hxc-hero .hxc-hph{position:relative;inset:auto;aspect-ratio:16/9;border-radius:20px}.hxc-led{position:relative;left:auto;bottom:auto;width:auto;margin:-56px 16px 0}
.hxc-roles ul{grid-template-columns:repeat(2,minmax(0,1fr))}.hxc-tg{grid-template-columns:1fr}.hxc-cg{grid-template-columns:1fr;gap:40px}}
@media (max-width:720px){.hpt.hxc-hero{padding:28px 0 40px}.hxc-hero>.hxc-w{display:flex;flex-direction:column}.hxc-hero .hxc-tdg{display:contents}.hxc-hero .hxc-tdt{order:1}.hxc-hero .hxc-roles{order:2;margin-top:28px}.hxc-hero .hxc-tdv{order:3;margin-top:28px}.hxc-hero .hxc-sub{font-size:16.5px}.hxc .hxc-btns .hxc-btn{flex:1 1 100%}.hxc-led{margin:-40px 0 0}
.hxc-led li a{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'n d' 'b p';row-gap:8px;column-gap:12px}.hxc-led .hxc-ln{grid-area:n}.hxc-led .hxc-dd{grid-area:d}.hxc-led .hxc-bar{grid-area:b}.hxc-led .hxc-pc{grid-area:p}
.hxc-roles ul{grid-template-columns:1fr;gap:8px}.hxc-roles a{min-height:72px;padding:12px 14px}
.hpt.hxc.hp-s{padding:60px 0}.hxc .hxc-sh{flex-direction:column;align-items:flex-start;margin-bottom:24px}
.hxc-gm{display:none}.hxc-gr{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'n d' 't t';row-gap:10px;padding:14px 16px}.hxc-gr .hxc-gn{grid-area:n}.hxc-gr .hxc-dd{grid-area:d}.hxc-gr .hxc-gt{display:none}.hxc-gr{grid-template-areas:'n d';row-gap:0}.hxc-tdl{display:none}
.hxc-cc{grid-template-columns:96px minmax(0,1fr);gap:12px}.hxc-paper{padding:16px}.hxc-pp{padding:28px 20px 22px;transform:none}.hxc-pt{font-size:28px;letter-spacing:.3em}.hxc-pp dl>div{grid-template-columns:72px minmax(0,1fr)}}
@media (max-width:1080px){.hxc-cvg{grid-template-columns:1fr;gap:28px}.hxc-stk{left:16px}.hxc-tix ol{grid-template-columns:repeat(2,minmax(0,1fr))}.hxc-mg,.hxc-pg{grid-template-columns:1fr}.hxc-kg{grid-template-columns:repeat(2,minmax(0,1fr))}.hxc-cv .hxc-led{width:auto}}
@media (max-width:720px){.hxc-cv .hxc-led li a,.hxc-fn .hxc-led li a{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'n d' 'r r'}.hxc-led .hxc-cvr{grid-area:r;justify-content:flex-start}.hxc-fn .hxc-led li a{grid-template-areas:'n n' 'r r'}
.hxc-cv .hxc-sub{font-size:17px}.hxc-tel a{width:100%;box-sizing:border-box}.hxc-cv .hxc-roles a{min-height:76px}
.hxc-cal2{padding:14px 10px 10px;border-radius:18px}.hxc-days li{min-height:52px;padding:5px 4px;gap:4px;align-items:center}.hxc-mcs{display:none}.hxc-dots{display:flex;justify-content:center}.hxc-mn{font-size:14px;flex-direction:column;gap:0}.hxc-mn small{font-size:13px;padding:0 4px;border-radius:5px}.hxc-wd li{text-align:center;padding:6px 0}
.hxc-kg{grid-template-columns:1fr;gap:12px}.hxc-kc{flex-direction:row;align-items:stretch;border-radius:16px}.hxc-kc .hxc-kt{flex:none;width:104px;aspect-ratio:auto;min-height:100%}.hxc-kb{padding:12px 14px;gap:5px}.hxc-kb>b{font-size:16.5px}
.hxc-cvp{display:none}.hxc-tix{margin-top:28px}.hxc-tix ol{grid-template-columns:1fr;gap:10px}.hxc-tix li:nth-child(n+3){display:none}.hxc-tk2{padding:14px 16px}.hxc-tkt{padding-bottom:8px;margin-bottom:2px}.hxc-tkd{font-size:22px}
.hxc-pills ul{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.hxc-pills a{border-radius:14px;padding:0 12px;min-height:56px}.hxc-pills small{display:none}.hxc-pills b{font-size:15px}
.hxc-mlg ul,.hxc-mlg .hxc-rq{display:none}.hxc-kg>li:nth-child(n+5){display:none}.hxc-lane li{padding:10px 0}.hxc-lanes{grid-template-columns:1fr}.hxc-lane{padding:18px}.hxc-band{flex-direction:column;align-items:flex-start;padding:20px}.hxc-band .hxc-btn{width:100%}
.hxc-fn>.hxc-w{padding-top:28px}.hxc-off p{font-size:14px}.hxc-off span i{margin:0 4px}
.hxc-tk{display:none}.hxc-fr{grid-template-columns:1fr;gap:10px;padding:14px 16px}
.hxc-ph{display:none}.hxc-pr{grid-template-columns:repeat(var(--k),minmax(0,1fr));padding:12px 16px}.hxc-pn{grid-column:1/-1}.hxc-pv{text-align:left;display:flex;flex-direction:column;font-size:15px}.hxc-pv::before{content:attr(data-k);font-size:13px;font-weight:650;color:var(--hxc-mu)}}
`; }

  /* ── 렌더러 연결: 첫 화면(이 묶음 테마) · cx-* 섹션(모든 테마) ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    try { if (x && s) { const d = x.data || {};
      if (x.type === 'text' && SEC[d.hpt]) { if (x.hide && !editing()) return ''; if (i === 0) { try { base(x, i, s, lk); } catch (e) { } } const h = SEC[d.hpt](x, s); if (h) return h; return editing() ? mark(`<section class="hpt hp-s hxc"><div class="hxc-w"><p class="hxc-sd">표시할 실제 강좌가 아직 없어 게시본에서는 이 섹션이 숨겨져요.</p></div></section>`, x) : ''; }
      if (x.type === 'banner' && s.theme && DEF[s.theme] && HPT.has(s.theme) && !+d.dstyle && !s.layout) { if (x.hide && !editing()) return ''; if (i === 0) { try { base(x, i, s, lk); } catch (e) { } } return mark((HERO[s.theme] || hero)(s, d), x); } }
    } catch (e) { console.error('hpx-corp', e); }
    return base(x, i, s, lk); }; window.proSec = proSec; }
  /* 빈 섹션 판정(hpwiz2의 자동 숨김 되살리기): cx-* 섹션은 실제 강좌로 그릴 것이 있는지로 판정 */
  try { if (window.HPW && typeof HPW.emptyOf === 'function') { const e0 = HPW.emptyOf; HPW.emptyOf = x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && SEC[d.hpt]) { try { return !(d.hpt === 'cx-cert' ? live().length : d.hpt === 'cx-cal' ? live().some(c => okD(c.start) && okD(c.end)) : d.hpt === 'cx-track' ? tracks().length : d.hpt === 'cx-hours' ? tfac().length : d.hpt === 'cx-price' ? (tfac().length || ((S.fac || {}).products || []).length) : civic().length); } catch (e) { return false; } } return e0(x); }; } } catch (e) { }
  const needCSS = s => !!(s && ((s.theme && DEF[s.theme]) || (s.sections || []).some(x => x && x.data && SEC[x.data.hpt])));
  { const base = siteHTML; siteHTML = (s, ...a) => { const h = base(s, ...a); try { if (needCSS(s) && HPT.tokens(s)) return h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpx-corp css', e); } return h; }; window.siteHTML = siteHTML; }

  /* ── 템플릿 등록(PASS 표 · HPX_ALL) ── */
  if (!ON.length) return;
  ON.forEach(id => { HPT.reg(id, Object.assign({ prem: 1, cssX: (s, th, T) => '' }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpx-corp HPD', e); } });
  { const pf = HPT.premFor; if (typeof pf === 'function') HPT.premFor = t => { const L = pf(t).filter(id => !ON.includes(id)); const fit1 = ON.filter(id => fits(id)); const rest = ON.filter(id => !fits(id)); return [...fit1, ...L, ...rest]; }; }
  { const pf = HPT.premFits; if (typeof pf === 'function') HPT.premFits = (id, t) => ON.includes(id) ? fits(id) : pf(id, t); }
  { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!ON.includes(id)) return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 'prem-' + id); if (tp) b.sections = tp.build(); return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpx-corp thumb', e); return tb(s, id); } }; }
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const TX = (variant, data) => S2('text', { variant, ...data });
  /* A3: 자동 보강(HPT.enrich)이 넣는 숫자 띠 · 모집 일정표는 첫 화면 판 · 강좌 달력과 겹친다 → 숨긴 자리표시로 미리 두어 끼어들지 않게(운영자가 켤 수 있음) */
  const quiet = () => [TX('stats', { hpt: 'facts', title: '', cols: [] }), TX('timeline', { hpt: 'sched', eyebrow: '', title: '모집 일정', cols: [] })].map(x => Object.assign(x, { hide: true }));
  const B = {
    dutydesk: { scene: '기업 HRD · 공공 직원 교육 — 법정 · 필수 교육 마감과 이수율을 첫 화면에, 방문 목적별 바로가기', purpose: ['learn', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()} ${pubOrg() ? '교육센터' : '인재개발센터'}`, title: pubOrg() ? '올해 의무교육,\n마감 전에 끝내요' : '올해 필수 교육,\n마감 전에 끝내요', sub: `${W.staff()}이 들어야 할 교육과 마감일을 한눈에 보고, 이수증까지 이곳에서 받아요. PC · 휴대폰 어디서든 이어서 들을 수 있어요.`, cta: `내 ${pubOrg() ? '의무교육' : '필수 교육'} 보기`, link: 'learn:my', cta2: '교육과정 찾기', link2: 'learn:courses' }),
        TX('features', { hpt: 'cx-cal', eyebrow: `${W.legal()} 일정`, title: '언제까지 들어야 하는지 먼저 확인해요', sub: '과정마다 운영 기간과 마감일이 달라요. 막대를 누르면 과정 안내로 이동해요.', cols: [['운영 기간', '과정별 시작일 · 마감일'], ['이수율', '전사 합계(개인 정보 없음)'], ['알림', '마감 2주 전 · 3일 전']] }),
        TX('features', { hpt: 'cx-track', eyebrow: '직무 과정', title: '지금 업무에 맞는 과정을 골라요', sub: '입문부터 리더 과정까지 단계별로 정리했어요. 필수 교육과 함께 들어도 돼요.', cols: LV().map((v, k) => [v, `${k + 1}단계 과정`]) }),
        S2('notices', { eyebrow: '', title: '교육 공지', n: 4 }),
        TX('features', { hpt: 'cx-cert', eyebrow: '이수증', title: '이수증은 기준을 채우면 바로 받아요', sub: '인사 · 감사 제출용 이수증을 따로 신청하지 않아도 돼요.', cols: [['로그인', `${pubOrg() ? '기관' : '회사'} 초대로 만든 계정으로 들어가요`], ['기준 채우기', '영상 · 평가를 이수 기준까지 마쳐요'], ['이수증 받기', 'PDF로 내려받거나 바로 인쇄해요']] }),
        TX('cta', { eyebrow: '', title: '교육 담당자에게 물어보세요', body: '배정 · 마감 연장 · 이수 기록 정정은 담당자가 확인해 드려요.', cta: '문의하기', cols: [] }), ...quiet()] }, /* 자동 보강의 숫자 띠(운영 현황) · 모집 일정은 현황판 · 마감 막대표와 겹쳐 숨긴 자리로 둔다(운영자가 켤 수 있음) */
    civicclass: { scene: '공공 시민 강좌 · 평생학습관 — 이번 달 접수 중인 강좌(D-day · 남은 자리 · 선착순/추첨)와 강좌 달력, 큰 글씨 · 전화 신청', purpose: ['apply', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()} 시민 강좌`, title: '배우고 싶은 강좌,\n이번 달에 신청해요', sub: '요일과 시간, 수강료를 보고 마음에 드는 강좌를 골라요. 추첨 강좌는 접수 기간 안에만 신청하면 돼요.', cta: '강좌 찾기', link: 'learn:courses', cta2: '내 신청 · 추첨 결과', link2: 'learn:my' }),
        S2('notices', { eyebrow: '', title: '공지 · 휴강 안내', n: 3 }),
        TX('features', { hpt: 'cx-month', eyebrow: '강좌 달력', title: '이번 달 수업과 접수 마감을 한눈에', sub: '날짜에 적힌 강좌를 누르면 강좌 안내로 이동해요.', cols: [['수업일', '회차별 수업 날짜'], ['개강', '강좌 시작일'], ['접수 마감', '신청 마감일']] }),
        TX('features', { hpt: 'cx-civlist', eyebrow: '강좌 안내', title: '지금 신청할 수 있는 강좌', sub: '수강료 · 요일 · 남은 자리를 확인하고 신청해요.', cols: [['강좌', '요일 · 시간 · 수강료'], ['자리', '정원과 남은 자리']] }),
        TX('features', { hpt: 'cx-how', eyebrow: '신청 방법', title: '선착순과 추첨, 이렇게 달라요', sub: '강좌마다 신청 방식이 표시돼 있어요.', cols: [['선착순', '남은 자리가 있으면 바로 확정'], ['추첨', '접수 마감 후 공개 추첨']] }),
        TX('cta', { eyebrow: '', title: '신청이 어려우시면 전화 주세요', body: '강좌 선택부터 신청까지 담당자가 천천히 도와드려요.', cta: '문의하기', cols: [] }),
        S2('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' }), ...quiet()] },
    facilitynow: { scene: '공공 체육 · 문화 시설 — 예약할 수 있는 시설 · 운영 시간 · 칸 · 정원과 휴관 띠, 시설 × 시간 운영표 · 요금표', purpose: ['apply', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()} 시설 예약`, title: '빈 시간 보고,\n바로 예약해요', sub: `${tfac().slice(0, 3).map(f => f.name).join(' · ') || '시설'}의 빈 시간을 보고 1분 안에 예약해요. 강습과 이용권도 이곳에서 신청해요.`, cta: '시설 예약', link: 'learn:fac', cta2: '강습 · 이용권', link2: 'learn:shop' }),
        TX('features', { hpt: 'cx-hours', eyebrow: '운영 시간', title: '언제 문을 여는지 먼저 확인해요', sub: '시설마다 운영 시간과 예약 단위가 달라요. 줄을 누르면 예약 화면으로 이동해요.', cols: [['평일', '월–금 운영 시간'], ['토 · 일', '주말 운영 시간']] }),
        TX('features', { hpt: 'cx-price', eyebrow: '요금', title: '요금표 · 이용권', sub: '한 칸(예약 단위) 기준 요금이에요.', cols: [['시설', '칸 단위 요금'], ['이용권', '횟수 · 기간권']] }),
        TX('features', { hpt: 'cx-civlist', eyebrow: '강습 프로그램', title: '강사와 함께 배우는 강습', sub: '요일 · 시간 · 수강료를 보고 신청해요.', more: '#shop', moreL: '강습 신청하기', cols: [['강습', '요일 · 시간 · 수강료']] }),
        S2('notices', { eyebrow: '', title: '휴관 · 공지', n: 4 }),
        S2('map', { title: '오시는 길', place: org(), pin: { x: 52, y: 46 }, addr: ft().addr || '', tel: ft().tel || '', hours: tfac()[0] ? weekL(tfac()[0]) : '' }),
        TX('cta', { eyebrow: '', title: '단체 대관 · 감면은 문의해 주세요', body: '단체 · 장기 대관과 감면 대상 확인은 담당자가 안내해 드려요.', cta: '문의하기', cols: [] }), ...quiet()] }
  };
  ON.forEach(id => { if (TPL.some(t => t.id === 'prem-' + id)) return; const c = B[id]; if (!c) return;
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: c.scene, color: DEF[id].acc, tone: '신뢰', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, build: c.build }); });
  /* 첫 화면 사진: 밝은 교육장 · 회의실(어두운 공장 · 카페 사진 대신). 운영자가 바꾼 사진은 site.img가 우선 */
  const PH = { dutydesk: { hero: 'cor-01', about: 'cor-07', space: 'cor-09', cta: 'off-05' }, civicclass: { hero: 'lib-01', about: 'sem-01', space: 'cls-02', cta: 'lib-05' }, facilitynow: { hero: 'spo-07', about: 'spo-04', space: 'spo-05', cta: 'spo-06' } };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpxc) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && String(tp.id || '').replace(/^prem-/, ''); if (PH[id] && ON.includes(id) && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, PH[id]); s.img = s.img || {}; Object.keys(s.photos).forEach(sl => { const v = HPSTOCK.slotImg(s.photos[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hpx-corp photo', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hpxc = 1; siteFromTpl = f; window.siteFromTpl = f; }
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hpxc) { const e0 = HPT.enrich; const f = s => { const r = e0(s); try { if (s && HERO[s.theme] && Array.isArray(s.sections)) { const L = s.sections; const qi = L.findIndex(x => x && x.data && x.data.hpt === 'faq'); const ci = L.findIndex(x => x && x.type === 'text' && x.data && x.data.variant === 'cta'); if (qi >= 0 && ci > qi + 1) { const [q] = L.splice(qi, 1); L.splice(ci - 1, 0, q); } } } catch (e) { console.error('hpx-corp enrich', e); } return r; }; f.hpxc = 1; HPT.enrich = f; } /* A3: FAQ는 문의 띠 바로 앞(달력 · 강좌보다 뒤) */
  window.HPXC = { PASS, ON, DEF, fits, css };
})();
