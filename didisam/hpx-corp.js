/* v43.8 hpx-corp — 기업 · 공공 홈페이지 템플릿(수석 L3 · plan/tpl438/corp)
   대표님(2026-11-17): 「현재 템플릿 디자인보다 훨씬 디자인 퀄리티가 높아야 돼. 85점을 넘긴 템플릿만 배치해줘.」 「고객 시나리오별 ui ux가 반영된 템플릿이어야 돼.」
   - 묶음: 기업(corp) · 공공(public: 직원 staff · 시민 citizen · 시설 facility). 템플릿 3종 = 수석 1(dutydesk) + 보조 2(DIRECTION.md 참고).
   - 배치 규칙: PASS 표(교차 심사 85점 이상)에 있는 id만 HPT.reg · TPL에 등록한다. 심사 · 테스트에서는 window.HPX_ALL = 1로 표와 무관하게 등록한다.
   - 섹션 렌더러(cx-*)는 PASS와 무관하게 항상 등록한다 — 한 번 게시된 사이트는 표가 바뀌어도 모양이 깨지지 않는다.
   - 사실 원칙: 숫자 · 마감 · 이수율은 실제 강좌(S.classes)에서 그릴 때마다 계산한다. 이수율은 전사 합계만(개인 이름 · 번호 없음).
   - 링크: 학습자 사이트 실제 경로(#my 내 교육 · #courses 교육과정 · #badges 수료 · 배지 · #notice 공지 · #login)와 빌더 링크(#p-c-<id> → #class/<id>)만 쓴다.
   - CSS는 JS 문자열로 사이트 CSS에 넣는다(게시본 Shadow DOM = 미리보기). 범위는 .hx-* 클래스. 별도 .css 파일을 두지 않는 이유: 게시본 Shadow DOM에 외부 CSS가 닿지 않는다. */
'use strict';
(() => {
  const PASS = {}; /* 교차 심사 85점 이상만: { id: 점수 }. 비어 있으면 템플릿을 등록하지 않는다(window.HPX_ALL로만 강제 등록) */
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
  const ddTag = n => n == null ? '' : n < 0 ? `<span class="hx-dd end">마감</span>` : `<span class="hx-dd${n <= 14 ? ' warn' : ''}">${n === 0 ? 'D-DAY' : 'D-' + n}</span>`;
  const onboard = () => live().find(c => /온보딩|신입|신규|입문 과정|임용/.test(c.name));
  const LV = () => { const J = ((typeof S !== 'undefined' && S && S.journey) || []).map(j => j && j.name).filter(Boolean); return J.length >= 3 ? J.slice(0, 3) : ['입문', '실무', '리더']; };
  const hrs = c => +c.hours ? `${+c.hours}시간` : '';
  const kindL = c => c.kind === 'episode' ? '정해진 회차' : c.kind === 'sub' ? '구독' : '기간 내 자유 수강';
  const pubOrg = () => ty() === 'public';
  const W = { legal: () => pubOrg() ? '법정 의무교육' : '법정 필수 교육', staff: () => pubOrg() ? '직원' : '임직원' };
  function stock(key, salt, slot) { const H = window.HPSTOCK; if (!H || typeof H.photo !== 'function') return null;
    try { const x = H.photo(key, salt, { id: true, slot: slot || 'card', scope: 'hx-corp' }); if (!x) return null; const u = H.url(x, slot === 'hero' ? '' : 'sm'); let src = u; try { src = new URL(u, H.base || location.href).href; } catch (e) { }
      return { src, alt: x.alt || '', pos: x.focus || '50% 50%' }; } catch (e) { return null; } }
  const fig = (p, cls, eager) => p ? `<figure class="hx-img${cls ? ' ' + cls : ''}"><img src="${E(p.src)}" alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>` : '';
  function heroPhoto(s, d) { try { if (window.HPS && typeof HPS.photo === 'function') { const p = HPS.photo(s, 'hero', d); if (p) return { src: p.src, alt: p.alt, pos: p.pos }; } } catch (e) { } return stock('사무실 회의 업무', 'hx-hero', 'hero'); }

  /* ── 첫 화면: 필수 교육 데스크 ── */
  function legalCard() { const L = legal(); const T = L.length ? L : tracks().slice(0, 4); if (!T.length) return '';
    const head = L.length ? `<b>${new Date(tday()).getFullYear()} ${E(W.legal())}</b><small>마감 순서 · 전사 이수율</small>` : `<b>운영 중인 과정</b><small>지금 들을 수 있어요</small>`;
    const rows = T.slice(0, 4).map(c => { const r = rate(c); const n = dleft(c);
      return `<li><a href="#my"><span class="hx-ln"><b>${E(c.name)}</b><small>${[hrs(c), kindL(c)].filter(Boolean).join(' · ')}</small></span>${r == null ? '' : `<span class="hx-bar" role="img" aria-label="이수율 ${r}%"><i style="width:${Math.max(4, r)}%"></i></span><em class="hx-pc">${r}%</em>`}${ddTag(n)}</a></li>`; }).join('');
    const avg = L.length ? Math.round(L.map(rate).filter(x => x != null).reduce((a, b) => a + b, 0) / Math.max(1, L.filter(c => rate(c) != null).length)) : null;
    return `<aside class="hx-led" aria-label="${E(W.legal())} 현황"><header><span class="hx-lic">${ic('shield', 20)}</span><span class="hx-lht">${head}</span>${avg != null ? `<span class="hx-avg"><b>${avg}<small>%</small></b><small>평균 이수율</small></span>` : ''}</header><ol>${rows}</ol><footer><a href="#login">${ic('lock', 18)}<span>로그인하면 <b>내 이수 현황</b>이 보여요</span>${ic('arrow', 18)}</a></footer></aside>`; }
  function roles() { const L = legal(); const ob = onboard(); const N = tracks().length; const lv = LV();
    const R = [
      { ic: 'shield', l: `내 ${pubOrg() ? '의무교육' : '필수 교육'}`, sub: L.length ? `${L.length}과목 · 마감 순서로 안내해요` : '배정된 교육을 한곳에서', h: '#my' },
      ob ? { ic: 'spark', l: pubOrg() ? '신규 임용자 교육' : '신입 온보딩', sub: `${ob.name.replace(/\s*\(.*\)$/, '')} 바로 시작`, h: '#p-c-' + ob.id } : null,
      { ic: 'compass', l: '직무 과정 찾기', sub: N ? `${lv.join(' · ')} ${N}개 과정` : '업무에 맞는 과정 고르기', h: '#courses' },
      { ic: 'award', l: '이수증 받기', sub: '수료증 · 배지를 PDF로', h: '#badges' }
    ].filter(Boolean);
    return `<nav class="hx-roles" aria-label="방문 목적 바로가기"><p class="hx-rq">무엇을 하러 오셨나요?</p><ul>${R.map(r => `<li><a ${aAttr(r.h)}><i>${ic(r.ic, 22)}</i><span><b>${E(r.l)}</b><small>${E(r.sub)}</small></span>${ic('arrow', 18)}</a></li>`).join('')}</ul></nav>`; }
  function hero(s, d) { d = d || {}; const p = heroPhoto(s, d); const t = String(d.title || org()).split('\n').map(E).join('<br>');
    const h1 = href(d.link) || '#my', h2 = href(d.link2) || '#courses';
    const card = legalCard();
    return `<section class="hpt hp-hero hx hx-hero hx-td"><div class="hx-w"><div class="hx-tdg${card ? '' : ' one'}">
<div class="hx-tdt">${d.eyebrow ? `<p class="hx-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h1>${t}</h1>${d.sub ? `<p class="hx-sub">${E(d.sub)}</p>` : ''}
<div class="hx-btns">${d.cta ? `<a class="hx-btn p" ${aAttr(h1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hx-btn g" ${aAttr(h2)}>${E(d.cta2)}</a>` : ''}</div>
<p class="hx-inv">${ic('user', 18)}<span>${pubOrg() ? '기관' : '회사'} 초대 메일로 가입한 계정으로 <a href="#login">로그인</a>해요</span></p></div>
<div class="hx-tdv">${fig(p, 'hx-hph', 1)}${card}</div></div>${roles()}</div></section>`; }

  /* ── 섹션: 법정 교육 일정표(간트) ── */
  const MO = 864e5;
  function calSec(x, s) { const d = x.data || {}; const L = legal().filter(c => okD(c.start) && okD(c.end)); const A = L.length ? L : tracks().filter(c => okD(c.start) && okD(c.end)).slice(0, 5); if (!A.length) return '';
    const t0 = tday(); const mn = A.map(c => c.start).concat([t0]).sort()[0]; const mx = A.map(c => c.end).sort().slice(-1)[0];
    const y = +mn.slice(0, 4), m = +mn.slice(5, 7) - 1; const ey = +mx.slice(0, 4), em = +mx.slice(5, 7) - 1; let n = (ey - y) * 12 + em - m + 1; n = Math.max(4, Math.min(12, n));
    const st = Date.UTC(y, m, 1), en = Date.UTC(y, m + n, 1); const pos = v => Math.max(0, Math.min(100, (Date.parse(v) - st) / (en - st) * 100));
    const months = Array.from({ length: n }, (_, k) => { const dt = new Date(Date.UTC(y, m + k, 1)); return `<span>${dt.getUTCMonth() === 0 || k === 0 ? `<small>${dt.getUTCFullYear()}</small>` : ''}${dt.getUTCMonth() + 1}월</span>`; }).join('');
    const tp = pos(t0);
    const rows = A.slice(0, 6).map(c => { const a = pos(c.start), b = pos(c.end); const nn = dleft(c); const r = rate(c); const hot = nn != null && nn >= 0 && nn <= 14;
      return `<li><a ${aAttr('#p-c-' + c.id)} class="hx-gr"><span class="hx-gn"><b>${E(c.name)}</b><small>${E(c.start.slice(5).replace('-', '.'))} – ${E(c.end.slice(5).replace('-', '.'))}${r != null ? ` · 이수율 ${r}%` : ''}</small></span><span class="hx-gt"><i class="hx-tdl" style="left:${tp.toFixed(2)}%" aria-hidden="true"></i><i class="hx-gb${hot ? ' hot' : ''}" style="left:${a.toFixed(2)}%;width:${Math.max(2, b - a).toFixed(2)}%"><i style="width:${r == null ? 0 : r}%"></i></i></span>${ddTag(nn)}</a></li>`; }).join('');
    return mark(`<section class="hpt hp-s hx hx-cal"><div class="hx-w"><div class="hx-sh"><div>${d.eyebrow ? `<p class="hx-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '교육 일정')}</h2>${d.sub ? `<p class="hx-sd">${E(d.sub)}</p>` : ''}</div>
<ul class="hx-lg" aria-label="범례"><li><i class="a"></i>운영 기간</li><li><i class="b"></i>이수한 비율</li><li><i class="c"></i>마감 2주 이내</li></ul></div>
<div class="hx-gantt" style="--n:${n}"><div class="hx-gm" aria-hidden="true"><span class="hx-gn"></span><span class="hx-gms">${months}<em class="hx-tdm" style="left:${tp.toFixed(2)}%">오늘</em></span><span class="hx-gpad"></span></div><div class="hx-gbody"><ol>${rows}</ol></div></div>
<p class="hx-gnote">${ic('bell', 18)}<span>마감 2주 전과 3일 전에 아직 이수하지 않은 분께 알림을 보내요. 이수 기준은 과정마다 달라요.</span></p></div></section>`, x); }

  /* ── 섹션: 직무 과정 트랙(입문 · 실무 · 리더) ── */
  function trackSec(x, s) { const d = x.data || {}; const C = tracks(); if (!C.length) return ''; const lv = LV();
    const lvOf = c => /리더|팀장|관리자|임원|간부/.test(c.name) ? 2 : /온보딩|입문|기초|신입|신규/.test(c.name) ? 0 : Math.min(2, Math.max(0, +c.level || 1));
    const cols = lv.map((nm, k) => ({ nm, L: C.filter(c => lvOf(c) === k) })).filter(g => g.L.length);
    const card = c => { const p = stock(c.name, c.id); return `<li><a ${aAttr('#p-c-' + c.id)} class="hx-cc">${p ? fig(p, 'hx-ct') : `<span class="hx-ct hx-cph">${ic('play', 26)}</span>`}<span class="hx-cb"><span class="hx-chips"><em>${E(kindL(c))}</em>${hrs(c) ? `<em>${E(hrs(c))}</em>` : ''}</span><b>${E(c.name)}</b><small>${(c.learners || []).length ? `${(c.learners || []).length}명 수강 중` : '지금 신청할 수 있어요'}</small></span></a></li>`; };
    return mark(`<section class="hpt hp-s hp-alt hx hx-trk"><div class="hx-w"><div class="hx-sh"><div>${d.eyebrow ? `<p class="hx-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '직무 과정')}</h2>${d.sub ? `<p class="hx-sd">${E(d.sub)}</p>` : ''}</div><a class="hx-btn g sm" href="#courses">전체 과정 보기${ic('arrow', 18)}</a></div>
<div class="hx-tg" style="--c:${cols.length}">${cols.map((g, k) => `<div class="hx-tc"><p class="hx-th"><i>${k + 1}</i><b>${E(g.nm)}</b><small>${g.L.length}개 과정</small></p><ul>${g.L.slice(0, 3).map(card).join('')}</ul></div>`).join('')}</div></div></section>`, x); }

  /* ── 섹션: 이수증 받기(3단계 + 이수증 견본) ── */
  function certSec(x, s) { const d = x.data || {}; const L = legal(); const c0 = L[0] || live()[0]; const steps = (Array.isArray(d.cols) && d.cols.length >= 2 ? d.cols : [['로그인', '회사 초대로 만든 계정으로 들어가요'], ['기준 채우기', '영상 · 평가를 이수 기준까지 마쳐요'], ['이수증 받기', 'PDF로 내려받거나 바로 인쇄해요']]).filter(r => r && r[0] && !isPh(r[0])).slice(0, 4);
    const no = `${tday().slice(0, 4)}-0001`;
    return mark(`<section class="hpt hp-s hx hx-cert"><div class="hx-w"><div class="hx-cg"><div class="hx-cl">${d.eyebrow ? `<p class="hx-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '이수증 받기')}</h2>${d.sub ? `<p class="hx-sd">${E(d.sub)}</p>` : ''}
<ol class="hx-st">${steps.map((r, k) => `<li><i>${k + 1}</i><span><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</span></li>`).join('')}</ol>
<div class="hx-btns"><a class="hx-btn p" href="#badges">${ic('award', 18)}이수증 받으러 가기</a><a class="hx-btn g" href="#my">내 이수 현황</a></div></div>
<figure class="hx-paper" aria-label="이수증 견본"><div class="hx-pp"><p class="hx-pk">CERTIFICATE OF COMPLETION</p><p class="hx-pt">이 수 증</p><dl><div><dt>과정</dt><dd>${E(c0 ? c0.name : '과정 이름')}</dd></div><div><dt>이수 시간</dt><dd>${E(c0 && hrs(c0) || '과정별 시간')}</dd></div><div><dt>성명</dt><dd class="hx-blank">로그인한 본인 이름</dd></div><div><dt>번호</dt><dd class="hx-num">${E(no)}</dd></div></dl><p class="hx-po"><b>${E(org())}</b><span class="hx-seal" aria-hidden="true">${ic('check', 22)}</span></p></div><figcaption>견본 · 실제 이수증에는 이수일과 발급 번호가 들어가요</figcaption></figure></div></div></section>`, x); }

  const SEC = { 'cx-cal': calSec, 'cx-track': trackSec, 'cx-cert': certSec };

  /* ── 테마(수석 1종) ── */
  const DEF = {
    dutydesk: { name: '필수 교육 데스크', desc: '첫 화면에서 법정 · 필수 교육 마감과 이수율, 방문 목적별 바로가기 — 기업 HRD · 공공 직원 교육', tags: ['corp', 'public'], tone: 'light', dens: '보통',
      acc: '#2453D6', bg: '#FFFFFF', alt: '#F4F6F9', ink: '#0F1626', mu: '#4A5468', r: 14, br: 10, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#E8EEFB', base: 'official', hk: 'desk', hp: 'ledger', ck: 'list', sh: 'none', hx: 'td' }
  };
  const HD = {
    dutydesk: { hf: 'sans', hw: 800, hls: -0.035, h1: 52, h1m: 34, lh1: 1.16, h2: 34, h2m: 26, h3: 18, body: 16, blh: 1.68, lead: 17.5, ey: { fs: 13, ls: 0.02, fw: 750, tt: 'none' }, sec: 96, secm: 60, w: 1240, gut: 40,
      r: 14, rs: 8, br: 10, bh: 50, bpx: 22, bfw: 700, bls: -0.01, bd: '1px solid rgba(15,22,38,.1)', sh: '0 1px 2px rgba(15,22,38,.05)', shh: '0 18px 36px -22px rgba(15,22,38,.3)', hov: 'lift', em: 'accent', link: 'hover' }
  };
  const MINE = Object.keys(DEF);
  const fits = id => { const t = ty(), e = ed(); if (!DEF[id]) return false; if (id === 'dutydesk') return t === 'corp' || (t === 'public' && (e === 'staff' || !e)); return DEF[id].tags.includes(t); };
  const ON = MINE.filter(id => ALL || (+PASS[id] || 0) >= 85);
  const mineOn = s => !!(s && s.theme && ON.includes(s.theme) && HPT.has(s.theme));

  /* ── CSS ── */
  function css(s) { const T = HPT.tokens(s) || {}; const a = T.a || '#2453D6'; const R = HPT.ramp ? HPT.ramp(a) : {}; const onA = HPT.onColor ? HPT.onColor(a) : '#fff';
    const at = fit(a, '#ffffff', 4.6); const warnT = fit(WARN, '#ffffff', 4.6); const ink = T.ink || '#0F1626'; const mu = fit(T.mu || '#4A5468', '#F4F6F9', 4.6);
    const tint = R[50] || mix(a, '#ffffff', .94); const line = 'rgba(15,22,38,.1)'; const navy = fit(mix(a, '#0B1020', .62), '#ffffff', 10, '#000000');
    return `/* hx-corp */
.hx{--hx-a:${a};--hx-on:${onA};--hx-at:${at};--hx-t:${tint};--hx-t2:${R[100] || mix(a, '#ffffff', .86)};--hx-ink:${ink};--hx-mu:${mu};--hx-ln:${line};--hx-w:${warnT};--hx-wb:${al(WARN, .1)};--hx-nv:${navy};--hx-r:14px;--hx-gut:clamp(16px,4vw,40px);font-variant-numeric:tabular-nums}
.hx .hx-w{max-width:1240px;margin:0 auto;padding:0 var(--hx-gut);position:relative;z-index:1}
.hx .hx-ey{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:750;letter-spacing:.02em;color:var(--hx-at);margin:0 0 14px}.hx .hx-ey i{width:8px;height:8px;border-radius:2px;background:var(--hx-a)}
.hx .hx-btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.hx .hx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 22px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:-.01em;white-space:nowrap;text-decoration:none;transition:background .15s,box-shadow .15s,transform .15s}
.hx .hx-btn.p{background:var(--hx-a);color:var(--hx-on);box-shadow:0 10px 22px -12px ${al(a, .8)}}.hx .hx-btn.p:hover{background:${mix(a, '#000000', .14)}}
.hx .hx-btn.g{background:#fff;color:var(--hx-ink);box-shadow:inset 0 0 0 1.5px ${al(ink, .16)}}.hx .hx-btn.g:hover{box-shadow:inset 0 0 0 1.5px var(--hx-a);color:var(--hx-at)}.hx .hx-btn.sm{min-height:44px;font-size:15px;padding:0 16px}
.hx .hx-btn svg{transition:transform .15s}.hx .hx-btn:hover svg{transform:translateX(3px)}
.hx a:focus-visible{outline:3px solid ${fit(a, '#ffffff', 3)};outline-offset:3px;border-radius:10px}
.hx .hx-img{margin:0;position:relative;overflow:hidden;background:var(--hx-t2)}.hx .hx-img>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;max-height:none;border-radius:0}
.hx .hx-dd{display:inline-flex;align-items:center;justify-content:center;min-width:58px;height:28px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:750;background:var(--hx-t);color:var(--hx-at);white-space:nowrap}.hx .hx-dd.warn{background:var(--hx-wb);color:var(--hx-w)}.hx .hx-dd.end{background:#EEF0F3;color:#4A5468}
/* 첫 화면 */
.hpt.hx-hero{padding:56px 0 64px;background:linear-gradient(180deg,${mix(tint, '#ffffff', .35)} 0%,#ffffff 72%);color:var(--hx-ink);overflow:hidden}
.hx-hero .hx-tdg{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:56px;align-items:center}.hx-hero .hx-tdg.one{grid-template-columns:minmax(0,6fr) minmax(0,6fr)}
.hx-hero h1{font-size:clamp(34px,4.3vw,56px);line-height:1.16;letter-spacing:-.035em;font-weight:800;margin:0;text-wrap:balance;color:var(--hx-ink)}
.hx-hero .hx-sub{font-size:18px;line-height:1.65;color:var(--hx-mu);margin:20px 0 0;max-width:30em}
.hx-hero .hx-inv{display:flex;align-items:center;gap:8px;margin:20px 0 0;font-size:14px;color:var(--hx-mu)}.hx-hero .hx-inv svg{color:var(--hx-at)}.hx-hero .hx-inv a{color:var(--hx-at);font-weight:700;text-decoration:underline;text-underline-offset:3px;display:inline-block;padding:12px 2px;margin:-12px 0}
.hx-hero .hx-tdv{position:relative;min-height:520px}
.hx-hero .hx-hph{position:absolute;inset:0 0 0 72px;border-radius:24px;box-shadow:0 30px 60px -36px rgba(15,22,38,.45)}
.hx-hero .hx-hph::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,22,38,.28),rgba(15,22,38,0) 46%)}
.hx-led{position:absolute;left:0;bottom:28px;width:min(480px,86%);background:#fff;border-radius:18px;border:1px solid var(--hx-ln);box-shadow:0 2px 4px rgba(15,22,38,.04),0 28px 56px -28px rgba(15,22,38,.42);overflow:hidden}
.hx-led header{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--hx-ln)}
.hx-led .hx-lic{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--hx-t);color:var(--hx-at)}
.hx-led .hx-lht{flex:1;min-width:0;display:flex;flex-direction:column}.hx-led .hx-lht b{font-size:16px;font-weight:750;letter-spacing:-.01em}.hx-led .hx-lht small{font-size:13px;color:var(--hx-mu)}
.hx-led .hx-avg{display:flex;flex-direction:column;align-items:flex-end}.hx-led .hx-avg b{font-size:28px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--hx-ink)}.hx-led .hx-avg b small{font-size:15px;margin-left:1px}.hx-led .hx-avg>small{font-size:13px;color:var(--hx-mu);margin-top:4px}
.hx-led ol{list-style:none;margin:0;padding:6px 8px}
.hx-led li a{display:grid;grid-template-columns:minmax(0,1fr) 72px 40px auto;align-items:center;gap:12px;min-height:58px;padding:8px 12px;border-radius:12px;color:inherit;text-decoration:none}.hx-led li a:hover{background:${mix(tint, '#ffffff', .3)}}
.hx-led li+li a{box-shadow:0 -1px 0 var(--hx-ln)}.hx-led li a:hover,.hx-led li:hover+li a{box-shadow:none}
.hx-ln{display:flex;flex-direction:column;min-width:0}.hx-ln b{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hx-ln small{font-size:13px;color:var(--hx-mu)}
.hx-bar{height:8px;border-radius:99px;background:#E9EDF3;overflow:hidden}.hx-bar i{display:block;height:100%;border-radius:99px;background:var(--hx-a)}
.hx-pc{font-style:normal;font-size:14px;font-weight:750;text-align:right}
.hx-led footer a{display:flex;align-items:center;gap:10px;min-height:52px;padding:0 20px;background:var(--hx-nv);color:#fff;font-size:14px;text-decoration:none}.hx-led footer a span{flex:1}.hx-led footer a b{font-weight:750}
.hx-roles{margin-top:48px}.hx-roles .hx-rq{font-size:14px;font-weight:750;color:var(--hx-mu);margin:0 0 12px}
.hx-roles ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.hx-roles a{display:flex;align-items:center;gap:14px;min-height:84px;padding:16px 18px;background:#fff;border:1px solid var(--hx-ln);border-radius:16px;color:inherit;text-decoration:none;box-shadow:0 1px 2px rgba(15,22,38,.04);transition:border-color .15s,box-shadow .15s,transform .15s}
.hx-roles a:hover{border-color:${al(a, .5)};box-shadow:0 16px 30px -20px ${al(a, .55)};transform:translateY(-2px)}
.hx-roles a>i{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--hx-t);color:var(--hx-at)}
.hx-roles a>span{flex:1;min-width:0;display:flex;flex-direction:column}.hx-roles b{font-size:16px;font-weight:750;letter-spacing:-.01em}.hx-roles small{font-size:13px;color:var(--hx-mu);line-height:1.45}.hx-roles a>svg{color:var(--hx-at);flex:none}
/* 공통 섹션 머리 */
.hpt.hx.hp-s{padding:96px 0}.hpt.hx.hp-s.hp-alt{background:#F4F6F9}
.hx .hx-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:36px}.hx .hx-sh h2,.hx-cert h2{font-size:clamp(26px,2.9vw,36px);line-height:1.25;letter-spacing:-.03em;font-weight:800;margin:0;color:var(--hx-ink)}
.hx .hx-sd{font-size:16.5px;color:var(--hx-mu);line-height:1.7;margin:12px 0 0;max-width:40em}
/* 간트 */
.hx-lg{display:flex;flex-wrap:wrap;gap:8px 18px;list-style:none;margin:0;padding:0;font-size:13px;color:var(--hx-mu)}.hx-lg li{display:flex;align-items:center;gap:8px}.hx-lg i{width:18px;height:10px;border-radius:99px}.hx-lg .a{background:var(--hx-t2)}.hx-lg .b{background:var(--hx-a)}.hx-lg .c{background:${al(WARN, .55)}}
.hx-gantt{border:1px solid var(--hx-ln);border-radius:18px;background:#fff;box-shadow:0 1px 2px rgba(15,22,38,.04),0 20px 44px -34px rgba(15,22,38,.4);overflow:hidden}
.hx-gm,.hx-gr{display:grid;grid-template-columns:minmax(200px,280px) minmax(0,1fr) 84px;gap:20px;align-items:center}
.hx-gm{padding:14px 20px;background:#F7F9FB;border-bottom:1px solid var(--hx-ln);font-size:13px;font-weight:700;color:var(--hx-mu)}
.hx-gms{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr))}.hx-gms span{display:flex;flex-direction:column;justify-content:flex-end;padding-left:8px;border-left:1px solid var(--hx-ln);line-height:1.3}.hx-gms small{font-size:13px;font-weight:600;color:var(--hx-mu)}
.hx-gbody{position:relative;padding:6px 0}
.hx-gbody ol{list-style:none;margin:0;padding:0;position:relative}
.hx-gr{min-height:68px;padding:10px 20px;color:inherit;text-decoration:none;position:relative}.hx-gbody li+li .hx-gr{border-top:1px solid ${al(ink, .06)}}.hx-gr:hover{background:${mix(tint, '#ffffff', .4)}}
.hx-gn{display:flex;flex-direction:column;min-width:0}.hx-gn b{font-size:15.5px;font-weight:700}.hx-gn small{font-size:13px;color:var(--hx-mu)}
.hx-gt{position:relative;height:26px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(100%/var(--n) - 1px),${al(ink, .07)} calc(100%/var(--n) - 1px),${al(ink, .07)} calc(100%/var(--n)))}
.hx-gb{position:absolute;top:4px;height:18px;border-radius:99px;background:var(--hx-t2);overflow:hidden;box-shadow:inset 0 0 0 1px ${al(a, .25)}}.hx-gb>i{display:block;height:100%;background:var(--hx-a);border-radius:99px}.hx-gb.hot{box-shadow:inset 0 0 0 2px ${al(WARN, .7)}}
.hx-gms{position:relative}.hx-tdm{position:absolute;bottom:-26px;transform:translateX(-50%);font-style:normal;font-size:13px;font-weight:750;color:#fff;background:${fit(WARN, '#ffffff', 4.6)};padding:1px 8px;border-radius:6px;white-space:nowrap;z-index:3}
.hx-tdl{position:absolute;top:-12px;bottom:-12px;width:2px;margin-left:-1px;background:${al(WARN, .75)};z-index:2}
.hx-gm .hx-gpad{display:block}
.hx-gnote{display:flex;align-items:flex-start;gap:10px;margin:18px 0 0;font-size:14px;color:var(--hx-mu);line-height:1.6}.hx-gnote svg{color:var(--hx-at);margin-top:2px}
/* 직무 트랙 */
.hx-tg{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:20px}
.hx-th{display:flex;align-items:center;gap:10px;margin:0 0 14px}.hx-th i{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-style:normal;font-size:14px;font-weight:800;background:var(--hx-a);color:var(--hx-on)}.hx-th b{font-size:18px;font-weight:800;letter-spacing:-.02em}.hx-th small{margin-left:auto;font-size:13px;color:var(--hx-mu)}
.hx-tc ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.hx-cc{display:grid;grid-template-columns:112px minmax(0,1fr);gap:16px;align-items:center;padding:12px;background:#fff;border:1px solid var(--hx-ln);border-radius:16px;color:inherit;text-decoration:none;transition:box-shadow .15s,transform .15s,border-color .15s}
.hx-cc:hover{transform:translateY(-2px);border-color:${al(a, .4)};box-shadow:0 18px 32px -22px rgba(15,22,38,.4)}
.hx-ct{aspect-ratio:4/3;border-radius:11px;width:100%}.hx-cph{display:grid;place-items:center;background:var(--hx-t);color:var(--hx-at)}
.hx-cb{display:flex;flex-direction:column;gap:4px;min-width:0}.hx-cb b{font-size:16px;font-weight:750;letter-spacing:-.01em;line-height:1.35}.hx-cb small{font-size:13px;color:var(--hx-mu)}
.hx-chips{display:flex;flex-wrap:wrap;gap:6px}.hx-chips em{font-style:normal;font-size:13px;font-weight:650;padding:1px 8px;border-radius:6px;background:#EEF1F5;color:#3A4456}
/* 이수증 */
.hx-cg{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:64px;align-items:center}
.hx-st{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:4px;counter-reset:s}
.hx-st li{display:flex;gap:16px;align-items:flex-start;padding:14px 0;position:relative}.hx-st li+li::before{content:'';position:absolute;left:17px;top:-14px;height:28px;width:2px;background:var(--hx-t2)}
.hx-st i{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:15px;background:var(--hx-t);color:var(--hx-at);box-shadow:inset 0 0 0 1.5px ${al(a, .35)}}
.hx-st span{display:flex;flex-direction:column}.hx-st b{font-size:17px;font-weight:750}.hx-st small{font-size:14.5px;color:var(--hx-mu)}
.hx-paper{margin:0;position:relative;padding:28px;border-radius:24px;background:linear-gradient(135deg,var(--hx-t) 0%,#EEF1F6 100%)}
.hx-pp{position:relative;background:#FFFDF8;border-radius:10px;padding:40px 44px 32px;box-shadow:0 1px 2px rgba(15,22,38,.06),0 30px 60px -30px rgba(15,22,38,.45);outline:1px solid ${al(a, .18)};outline-offset:-12px;transform:rotate(-1.2deg)}
.hx-pk{margin:0;text-align:center;font-size:13px;letter-spacing:.24em;font-weight:700;color:var(--hx-at)}.hx-pt{margin:8px 0 26px;text-align:center;font-size:34px;font-weight:800;letter-spacing:.5em;color:var(--hx-ink);padding-left:.5em}
.hx-pp dl{margin:0;display:grid;gap:12px}.hx-pp dl>div{display:grid;grid-template-columns:88px minmax(0,1fr);gap:12px;padding-bottom:10px;border-bottom:1px dashed ${al(ink, .14)}}.hx-pp dt{font-size:13px;color:var(--hx-mu);font-weight:650}.hx-pp dd{margin:0;font-size:15.5px;font-weight:700}.hx-pp .hx-blank{color:var(--hx-mu);font-weight:500}.hx-pp .hx-num{font-variant-numeric:tabular-nums}
.hx-po{display:flex;align-items:center;justify-content:flex-end;gap:14px;margin:24px 0 0;font-size:17px}.hx-seal{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#fff;background:${fit(WARN, '#ffffff', 4.6)};box-shadow:0 0 0 4px ${al(WARN, .18)}}
.hx-paper figcaption{margin-top:18px;text-align:center;font-size:13px;color:var(--hx-mu)}
/* 공통 부품 보정(이 묶음 사이트): 공지 태그 · 새 글 점 13px 이상 */
.hpt .hps-tag,.hpt .hps-chip{font-size:13px!important}.hpt .hps-new{font-size:13px!important;width:22px!important;height:22px!important}
/* 반응형 */
@media (max-width:1080px){.hx-hero .hx-tdg,.hx-hero .hx-tdg.one{grid-template-columns:1fr;gap:32px}.hx-hero .hx-tdv{min-height:0;display:flex;flex-direction:column}.hx-hero .hx-hph{position:relative;inset:auto;aspect-ratio:16/9;border-radius:20px}.hx-led{position:relative;left:auto;bottom:auto;width:auto;margin:-56px 16px 0}
.hx-roles ul{grid-template-columns:repeat(2,minmax(0,1fr))}.hx-tg{grid-template-columns:1fr}.hx-cg{grid-template-columns:1fr;gap:40px}}
@media (max-width:720px){.hpt.hx-hero{padding:28px 0 40px}.hx-hero>.hx-w{display:flex;flex-direction:column}.hx-hero .hx-tdg{display:contents}.hx-hero .hx-tdt{order:1}.hx-hero .hx-roles{order:2;margin-top:28px}.hx-hero .hx-tdv{order:3;margin-top:28px}.hx-hero .hx-sub{font-size:16.5px}.hx .hx-btns .hx-btn{flex:1 1 100%}.hx-led{margin:-40px 0 0}
.hx-led li a{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'n d' 'b p';row-gap:8px;column-gap:12px}.hx-led .hx-ln{grid-area:n}.hx-led .hx-dd{grid-area:d}.hx-led .hx-bar{grid-area:b}.hx-led .hx-pc{grid-area:p}
.hx-roles ul{grid-template-columns:1fr;gap:8px}.hx-roles a{min-height:72px;padding:12px 14px}
.hpt.hx.hp-s{padding:60px 0}.hx .hx-sh{flex-direction:column;align-items:flex-start;margin-bottom:24px}
.hx-gm{display:none}.hx-gr{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'n d' 't t';row-gap:10px;padding:14px 16px}.hx-gr .hx-gn{grid-area:n}.hx-gr .hx-dd{grid-area:d}.hx-gr .hx-gt{grid-area:t}.hx-tdl{display:none}
.hx-cc{grid-template-columns:96px minmax(0,1fr);gap:12px}.hx-paper{padding:16px}.hx-pp{padding:28px 20px 22px;transform:none}.hx-pt{font-size:28px;letter-spacing:.3em}.hx-pp dl>div{grid-template-columns:72px minmax(0,1fr)}}
`; }

  /* ── 렌더러 연결: 첫 화면(이 묶음 테마) · cx-* 섹션(모든 테마) ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    try { if (x && s) { const d = x.data || {};
      if (x.type === 'text' && SEC[d.hpt]) { if (x.hide && !editing()) return ''; if (i === 0) { try { base(x, i, s, lk); } catch (e) { } } const h = SEC[d.hpt](x, s); if (h) return h; return editing() ? mark(`<section class="hpt hp-s hx"><div class="hx-w"><p class="hx-sd">표시할 실제 강좌가 아직 없어 게시본에서는 이 섹션이 숨겨져요.</p></div></section>`, x) : ''; }
      if (x.type === 'banner' && s.theme && DEF[s.theme] && HPT.has(s.theme) && !+d.dstyle && !s.layout) { if (x.hide && !editing()) return ''; if (i === 0) { try { base(x, i, s, lk); } catch (e) { } } return mark(hero(s, d), x); } }
    } catch (e) { console.error('hpx-corp', e); }
    return base(x, i, s, lk); }; window.proSec = proSec; }
  /* 빈 섹션 판정(hpwiz2의 자동 숨김 되살리기): cx-* 섹션은 실제 강좌로 그릴 것이 있는지로 판정 */
  try { if (window.HPW && typeof HPW.emptyOf === 'function') { const e0 = HPW.emptyOf; HPW.emptyOf = x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && SEC[d.hpt]) { try { return !(d.hpt === 'cx-cert' ? live().length : d.hpt === 'cx-cal' ? live().some(c => okD(c.start) && okD(c.end)) : tracks().length); } catch (e) { return false; } } return e0(x); }; } } catch (e) { }
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
  const B = {
    dutydesk: { scene: '기업 HRD · 공공 직원 교육 — 법정 · 필수 교육 마감과 이수율을 첫 화면에, 방문 목적별 바로가기', purpose: ['learn', 'info'],
      build: () => [S2('banner', { eyebrow: `${org()} ${pubOrg() ? '교육센터' : '인재개발센터'}`, title: pubOrg() ? '올해 의무교육,\n마감 전에 끝내요' : '올해 필수 교육,\n마감 전에 끝내요', sub: `${W.staff()}이 들어야 할 교육과 마감일을 한눈에 보고, 이수증까지 이곳에서 받아요. PC · 휴대폰 어디서든 이어서 들을 수 있어요.`, cta: `내 ${pubOrg() ? '의무교육' : '필수 교육'} 보기`, link: 'learn:my', cta2: '교육과정 찾기', link2: 'learn:courses' }),
        TX('features', { hpt: 'cx-cal', eyebrow: `${W.legal()} 일정`, title: '언제까지 들어야 하는지 먼저 확인해요', sub: '과정마다 운영 기간과 마감일이 달라요. 막대를 누르면 과정 안내로 이동해요.', cols: [['운영 기간', '과정별 시작일 · 마감일'], ['이수율', '전사 합계(개인 정보 없음)'], ['알림', '마감 2주 전 · 3일 전']] }),
        TX('features', { hpt: 'cx-track', eyebrow: '직무 과정', title: '지금 업무에 맞는 과정을 골라요', sub: '입문부터 리더 과정까지 단계별로 정리했어요. 필수 교육과 함께 들어도 돼요.', cols: LV().map((v, k) => [v, `${k + 1}단계 과정`]) }),
        S2('notices', { eyebrow: '', title: '교육 공지', n: 4 }),
        TX('features', { hpt: 'cx-cert', eyebrow: '이수증', title: '이수증은 기준을 채우면 바로 받아요', sub: '인사 · 감사 제출용 이수증을 따로 신청하지 않아도 돼요.', cols: [['로그인', `${pubOrg() ? '기관' : '회사'} 초대로 만든 계정으로 들어가요`], ['기준 채우기', '영상 · 평가를 이수 기준까지 마쳐요'], ['이수증 받기', 'PDF로 내려받거나 바로 인쇄해요']] }),
        TX('cta', { eyebrow: '', title: '교육 담당자에게 물어보세요', body: '배정 · 마감 연장 · 이수 기록 정정은 담당자가 확인해 드려요.', cta: '문의하기', cols: [] })] }
  };
  ON.forEach(id => { if (TPL.some(t => t.id === 'prem-' + id)) return; const c = B[id]; if (!c) return;
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: c.scene, color: DEF[id].acc, tone: '신뢰', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, build: c.build }); });
  /* 첫 화면 사진: 밝은 교육장 · 회의실(어두운 공장 · 카페 사진 대신). 운영자가 바꾼 사진은 site.img가 우선 */
  const PH = { dutydesk: { hero: 'cor-01', about: 'cor-07', space: 'cor-09', cta: 'off-05' } };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpxc) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && String(tp.id || '').replace(/^prem-/, ''); if (PH[id] && ON.includes(id) && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, PH[id]); s.img = s.img || {}; Object.keys(s.photos).forEach(sl => { const v = HPSTOCK.slotImg(s.photos[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hpx-corp photo', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hpxc = 1; siteFromTpl = f; window.siteFromTpl = f; }
  window.HPXC = { PASS, ON, DEF, fits, css };
})();
