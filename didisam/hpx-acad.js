/* v43.8 hpx-acad — 학원 묶음(k12 · adult) 홈페이지 템플릿 고도화
   대표님(2026-11-17): 「현재 템플릿 디자인보다 훨씬 디자인 퀄리티가 높아야되. 85점을 넘긴 템플릿만 배치해줘.」 「고객 시나리오별 ui ux 가 반영된 템플릿이어야되.」
   - 시나리오(plan/tpl438/acad/SCENARIO.md): 학부모(처음 · 재원) · 학생 · 상담 문의자가 첫 화면에서 「어떤 일로 오셨어요?」 3갈래로 바로 간다.
   - 템플릿 1: acparent(학부모 데스크) — 첫 화면 3갈래 + 이번 주 수업 판 · 이번 주 시간표 · 반별 수강료 · 학부모 알림 · 원장 소개 · 후기 · 소식 · 상담.
   - 배치 규칙: PASS 표(교차 심사 85점 이상)에 있는 id만 HPT.reg · TPL 등록. 심사 · 시연 때는 window.HPX_ALL = 1로 강제 등록한다.
   - 사실 원칙: 시간표 · 정원 · 남은 자리 · 수강료는 공개 강좌(S.classes)에서만, 숫자 띠는 HPT.facts()만. 알림 화면은 「예시 화면」 표시를 붙인 제품 설명이다.
   - 링크: 학습자 사이트 실제 경로(#login/family · #login/my · #login/mypay · #join · #p-c-<id> · #p-m-<id> · tel:)만 쓴다.
   - CSS는 cssX(테마 CSS 문자열)로 넣는다 — 게시본 Shadow DOM과 미리보기가 같은 CSS를 쓰므로 별도 .css 파일은 두지 않는다.
   보조 디자이너(A2)는 DEF · HD · BUILD에 id를 더하고, 섹션 렌더러(SECR)를 재사용 · 추가한다. 방향: plan/tpl438/acad/DIRECTION.md */
'use strict';
(() => {
  const PASS = {}; /* 교차 심사 85점 이상만: { id: 점수 } */
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof proSec !== 'function' || typeof siteHTML !== 'function') return;
  const ON = id => !!PASS[id] || !!window.HPX_ALL;
  const U = HPT.U; const { mix, fit, al } = U;
  const ramp = HPT.ramp || (c => ({ 50: mix(c, '#ffffff', .94), 100: mix(c, '#ffffff', .86), 500: c, 700: mix(c, '#000000', .3) }));
  const onC = HPT.onColor || (c => U.CR(c, '#0B0F0D') >= U.CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF');
  const WARN = '#E8553D';
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const br = v => E(v).replace(/\n/g, '<br>');
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const ty = () => { try { return S.org.type; } catch (e) { return ''; } };
  const kid = () => ty() !== 'adult'; /* k12(기본) · adult */
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const term = k => (typeof t === 'function' ? t(k) : k === 'cls' ? '수업' : k);
  const W = v => (+v || 0).toLocaleString('ko-KR');
  const pubAll = () => { try { return (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료'); } catch (e) { return []; } };
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const menu = (s, k) => ((s && s.menus) || []).find(m => m.kind === k && m.on !== false && m.access !== '비공개');
  const DN = ['일', '월', '화', '수', '목', '금', '토'];
  const daysOf = c => (Array.isArray(c.days) ? c.days : []).map(Number).filter(d => d >= 0 && d <= 6);
  const timeOf = c => (c.time && /^\d{1,2}:\d{2}$/.test(c.time.from || '') ? c.time.from : '');
  const capOf = c => +((c.recruit && c.recruit.cap) || c.cap) || 0;
  const leftOf = c => { const cap = capOf(c); return cap ? Math.max(0, cap - ((c.learners || []).length)) : null; };
  const seatTx = c => { const l = leftOf(c); return l == null ? '' : l === 0 ? '대기 접수' : l <= 3 ? `마감 임박 · ${l}석` : `남은 자리 ${l}석`; };
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');

  /* ── 링크(학습자 사이트 실제 경로) ── */
  const L = {
    cls: s => { const m = menu(s, 'class'); return m ? '#p-m-' + m.id : (pub()[0] ? '#p-c-' + pub()[0].id : '#login/my'); },
    c: c => '#p-c-' + c.id,
    ask: s => { const f = ft(); if (f.tel && !isPh(f.tel)) return telH(f.tel); const m = menu(s, 'community') || menu(s, 'board'); if (m) return '#p-m-' + m.id; if (f.email && /@/.test(f.email)) return 'mailto:' + f.email; return L.cls(s); },
    trial: s => { const c = pub().find(x => !+x.price); return c ? L.c(c) : L.cls(s); },
    family: () => '#login/family', my: () => '#login/my', pay: () => '#login/mypay', join: () => '#join'
  };
  const aT = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;

  /* ── 선 아이콘(24 그리드 · 굵기 1.75) ── */
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
    users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.5a4 4 0 010 7.5M22 21a7 7 0 00-4.5-6.5', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7', bell: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0',
    card: 'M3 6h18v12H3zM3 10h18M7 15h4', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', check: 'M5 12.5l4.5 4.5L19 7.5', door: 'M5 21V4l10-1v18M15 3h4v18M11 12v1', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', home: 'M3 11l9-7 9 7v9H3zM9 20v-6h6v6', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;

  /* ── 사진(HPS.photo: 사이트 사진 → 템플릿 지정 → 샘플) ── */
  const fig = (s, slot, cls, eager, d) => { const p = window.HPS && HPS.photo ? HPS.photo(s, slot, d) : null; if (!p) return '';
    return `<figure class="hpx-img${cls ? ' ' + cls : ''}${slot === 'hero' ? ' hp-photo' : ''}" data-slot="${E(slot)}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 900px) 100vw, 50vw"` : ''} alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>`; };

  /* ── 첫 화면: 「어떤 일로 오셨어요?」 3갈래 + 이번 주 수업 판 ── */
  function doors(s, d) {
    const free = pub().some(c => !+c.price); const f = ft(); const tel = f.tel && !isPh(f.tel) ? f.tel : '';
    const D = kid() ? [
      { k: 'new', ic: 'cal', who: '처음 오셨나요?', what: '학부모 · 학생 상담과 체험 수업', a: [[d.cta || '상담 예약', L.ask(s), 1], free ? [d.cta2 || '체험 수업', L.trial(s)] : [`${term('cls')} 둘러보기`, L.cls(s)]], note: tel ? `전화 ${tel}` : '' },
      { k: 'par', ic: 'users', who: '재원생 학부모', what: '출결 · 숙제 · 성적 알림과 수강료 결제', a: [['자녀 현황 보기', L.family()], ['수강료 결제', L.pay()]] },
      { k: 'stu', ic: 'book', who: '학생', what: '오늘 수업 · 숙제 · 복습 퀴즈', a: [['내 수업 열기', L.my()]] }
    ] : [
      { k: 'new', ic: 'cal', who: '처음 오셨나요?', what: '수강 상담 · 레벨 확인 · 체험 수업', a: [[d.cta || '상담 예약', L.ask(s), 1], free ? [d.cta2 || '체험 수업', L.trial(s)] : [`${term('cls')} 둘러보기`, L.cls(s)]], note: tel ? `전화 ${tel}` : '' },
      { k: 'stu', ic: 'book', who: '수강생', what: '내 수업 이어 보기 · 과제 · 수료증', a: [['내 수업 열기', L.my()]] },
      { k: 'pay', ic: 'card', who: '결제 · 영수증', what: '수강료 결제와 영수증 · 환불 내역', a: [['결제 내역 보기', L.pay()]] }
    ];
    return `<nav class="hpx-dr" aria-label="방문 목적별 바로가기"><p class="hpx-dq">어떤 일로 오셨어요?</p><ul>${D.map((x, i) => `<li class="hpx-d${i === 0 ? ' is-1' : ''}" data-door="${x.k}"><i class="hpx-di">${ic(x.ic, 22)}</i><div class="hpx-dt"><b>${E(x.who)}</b><small>${E(x.what)}</small></div><div class="hpx-da">${x.a.map(([l, h, p]) => `<a class="hpx-b${p ? ' p' : ''}" ${aT(h)}>${E(l)}${p ? ic('arrow', 18) : ''}</a>`).join('')}</div></li>`).join('')}</ul></nav>`; }
  function weekCard(s) { const C = pub().filter(c => daysOf(c).length && timeOf(c)).slice(0, 3); if (!C.length) return '';
    return `<aside class="hpx-tt" aria-label="이번 주 ${E(term('cls'))}"><div class="hpx-tth"><b>이번 주 ${E(term('cls'))}</b><a ${aT(L.cls(s))}>전체 시간표${ic('arrow', 16)}</a></div><ul>${C.map(c => { const sx = seatTx(c); const hot = leftOf(c) != null && leftOf(c) <= 3;
      return `<li><a ${aT(L.c(c))}><span class="hpx-ttd">${daysOf(c).map(d => DN[d]).join('·')}<small>${E(timeOf(c))}</small></span><span class="hpx-ttn"><b>${E(c.name)}</b>${sx ? `<small class="${hot ? 'hot' : ''}">${E(sx)}</small>` : ''}</span>${ic('arrow', 18)}</a></li>`; }).join('')}</ul></aside>`; }
  function heroAcad(s, d) { d = d || {}; const lines = String(d.title || org()).split('\n'); const n = pub().length;
    const pill = d.eyebrow ? `<p class="hpx-pill"><i aria-hidden="true"></i>${E(d.eyebrow)}${n ? ` · ${n}개 반 모집 중` : ''}</p>` : '';
    return `<section class="hpt hp-hero hps-hero hpx-ah"><div class="hpx-w"><div class="hpx-ahg"><div class="hpx-aht">${pill}<h1>${lines.map(E).join('<br>')}</h1>${d.sub ? `<p class="hpx-sub">${E(d.sub)}</p>` : ''}${doors(s, d)}</div><div class="hpx-ahm">${fig(s, 'hero', 'hpx-ahp', 1, d)}${weekCard(s)}</div></div></div></section>`; }

  /* ── 섹션 렌더러(data.hpt = 'ac-*') — 보조 디자이너도 재사용 ── */
  const SH = (d, def) => `<header class="hpx-sh"><div>${d.eyebrow || def ? `<p class="hpx-ey">${E(d.eyebrow || def)}</p>` : ''}<h2>${br(d.title || '')}</h2>${d.sub ? `<p class="hpx-sd">${E(d.sub)}</p>` : ''}</div></header>`;
  const sec = (cls, inner, tone) => `<section class="hpt hp-s hpx-s ${cls}${tone ? ' hpx-' + tone : ''}"><div class="hpx-w">${inner}</div></section>`;
  const hint = (cls, msg) => editing() ? sec(cls, `<p class="hpx-hint">${E(msg)}</p>`) : '';
  const SECR = {
    /* 이번 주 시간표: 월~토 칸에 실제 반(요일 · 시작 시간 · 남은 자리) */
    'ac-week': (d, s) => { const C = pub().filter(c => daysOf(c).length && timeOf(c)); if (!C.length) return hint('hpx-wk', '공개 강좌에 요일과 시작 시간을 넣으면 이번 주 시간표가 자동으로 그려집니다.');
      const used = [1, 2, 3, 4, 5, 6, 0].filter(k => k !== 0 || C.some(c => daysOf(c).includes(0)));
      const col = k => { const R = C.filter(c => daysOf(c).includes(k)).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
        return `<div class="hpx-wd${R.length ? '' : ' empty'}"><p class="hpx-wdh"><b>${DN[k]}</b><small>${R.length ? `${R.length}개 반` : '수업 없음'}</small></p>${R.length ? `<ul>${R.map(c => { const i = C.indexOf(c) % 4; const hot = leftOf(c) != null && leftOf(c) <= 3;
          return `<li class="t${i}"><a ${aT(L.c(c))}><time>${E(timeOf(c))}</time><b>${E(c.name)}</b>${seatTx(c) ? `<small class="${hot ? 'hot' : ''}">${E(seatTx(c))}</small>` : ''}</a></li>`; }).join('')}</ul>` : ''}</div>`; };
      return sec('hpx-wk', `${SH(d, 'TIMETABLE')}<div class="hpx-wg" style="--n:${used.length}">${used.map(col).join('')}</div><p class="hpx-fn">${ic('clock', 18)}<span>칸을 누르면 반 소개 · 진도 계획 · 신청 화면으로 이동해요. 시간표는 학원 운영 시간표와 같이 바뀌어요.</span></p>`); },
    /* 반별 수강료 · 정원 · 신청 */
    'ac-fee': (d, s) => { const C = pub().slice(0, 6); if (!C.length) return hint('hpx-fee', '공개 강좌가 있으면 반별 수강료 · 정원이 자동으로 표시됩니다.');
      const row = c => { const cap = capOf(c), n = (c.learners || []).length, l = leftOf(c); const pct = cap ? Math.min(100, Math.round(n / cap * 100)) : 0; const free = !+c.price;
        return `<li class="${free ? 'is-free' : ''}"><a class="hpx-fn1" ${aT(L.c(c))}><b>${E(c.name)}</b><small>${E([daysOf(c).map(x => DN[x]).join('·'), timeOf(c), c.cat].filter(Boolean).join(' · ') || '일정은 상담으로 안내해요')}</small></a>
          <div class="hpx-fcap">${cap ? `<span class="hpx-bar" role="img" aria-label="정원 ${cap}명 중 ${n}명 신청"><i style="width:${Math.max(4, pct)}%"></i></span><small>${l === 0 ? '정원 마감 · 대기 접수' : `정원 ${cap}명 · 남은 자리 ${l}석`}</small>` : '<small>정원은 상담으로 안내해요</small>'}</div>
          <div class="hpx-fpr">${free ? '<b>무료</b><small>체험 수업</small>' : `<b>${W(c.price)}<span>원</span></b><small>${c.hours ? `총 ${E(c.hours)}시간` : '과정 전체'}</small>`}</div>
          <a class="hpx-b${free ? ' p' : ''}" ${aT(L.c(c))}>${free ? '체험 신청' : '반 보기'}${ic('arrow', 18)}</a></li>`; };
      return sec('hpx-fee', `${SH(d, 'TUITION')}<ul class="hpx-fl">${C.map(row).join('')}</ul><div class="hpx-pay"><i>${ic('card', 22)}</i><p><b>${kid() ? '수강료는 학부모 앱 청구서로 결제해요' : '수강료는 내 계정의 결제 화면에서 결제해요'}</b><small>카드 · 간편결제로 내고, 영수증과 환불 내역도 한곳에서 확인할 수 있어요.</small></p><a class="hpx-b" ${aT(L.pay())}>청구서 · 결제 바로 가기${ic('arrow', 18)}</a></div>`, 'alt'); },
    /* 학부모(수강생) 알림 — 제품 설명(예시 화면) */
    'ac-alert': (d, s) => { const c0 = pub()[0]; const cn = c0 ? c0.name : `${term('cls')}`; const tm = c0 && timeOf(c0) ? timeOf(c0) : '18:50';
      const F = kid() ? [['clock', '등원 · 하원', '학원에 들어오고 나갈 때 시간을 바로 알려 드려요.'], ['book', '진도 · 숙제', '오늘 나간 진도와 숙제, 제출 여부를 수업마다 남겨요.'], ['chart', '시험 성적', '내 점수와 반 평균만 보여 드려요. 석차는 공개하지 않아요.']]
        : [['clock', '수업 알림', '수업 시작 전과 보강 일정이 잡히면 바로 알려 드려요.'], ['book', '과제 · 진도', '과제 마감과 남은 차시를 한눈에 보여 드려요.'], ['check', '수료 · 증명서', '수료 기준을 채우면 수료증을 바로 내려받아요.']];
      const N = kid() ? [['in', '등원했어요', `${cn} · ${tm} 출석`], ['hw', '오늘 숙제가 올라왔어요', '교재 42~45쪽 · 다음 수업 전까지'], ['ex', '단원평가 결과', '88점 · 반 평균 79.5점'], ['bill', '이번 달 수강료 청구서', '결제 기한 25일 · 앱에서 결제']]
        : [['in', '30분 뒤 수업이 시작돼요', `${cn} · ${tm}`], ['hw', '과제 마감이 내일이에요', '실습 과제 2 · 제출 전'], ['ex', '진도 70%를 넘었어요', '수료까지 3차시 남았어요'], ['bill', '수강료 결제가 완료됐어요', '영수증은 결제 내역에서']];
      return sec('hpx-al', `<div class="hpx-alg"><div class="hpx-alt">${SH(d, kid() ? 'PARENT APP' : 'MY CLASS')}<ul class="hpx-alf">${F.map(([k, b, t2]) => `<li><i>${ic(k, 22)}</i><p><b>${E(b)}</b><small>${E(t2)}</small></p></li>`).join('')}</ul><div class="hpx-btns"><a class="hpx-b p" ${aT(kid() ? L.family() : L.my())}>${kid() ? '학부모로 로그인' : '내 수업 로그인'}${ic('arrow', 18)}</a><a class="hpx-b" ${aT(L.join())}>처음이면 간편가입</a></div></div>
        <div class="hpx-ph" role="img" aria-label="${kid() ? '학부모' : '수강생'} 알림 예시 화면"><div class="hpx-phf"><p class="hpx-phh"><b>${E(org())}</b><span>예시 화면</span></p><ul>${N.map(([k, b, t2], i) => `<li class="n-${k}"><i>${ic(k === 'in' ? 'check' : k === 'hw' ? 'book' : k === 'ex' ? 'chart' : 'card', 18)}</i><p><b>${E(b)}</b><small>${E(t2)}</small></p><time>${['방금', '12분 전', '어제', '2일 전'][i]}</time></li>`).join('')}</ul></div></div></div>`); },
    /* 원장 소개 · 약속 + 실제 숫자 */
    'ac-dir': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 3); let F = []; try { F = (HPT.facts() || []).slice(0, 3); } catch (e) { }
      const ini = (org().replace(/\s/g, '')[0] || '원');
      return sec('hpx-dir', `<div class="hpx-dg">${fig(s, 'about', 'hpx-dp', 0) || ''}<div class="hpx-dt2">${SH(d, kid() ? 'DIRECTOR' : 'OUR PROMISE')}${d.body && !isPh(d.body) ? `<p class="hpx-db">${br(d.body)}</p>` : ''}<p class="hpx-sig"><i aria-hidden="true">${E(ini)}</i><span><b>${E(org())}</b><small>${kid() ? '원장 드림' : '대표 드림'}</small></span></p>
        ${P.length ? `<ol class="hpx-pr">${P.map((r, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><p><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</p></li>`).join('')}</ol>` : ''}
        ${F.length >= 2 ? `<dl class="hpx-fx">${F.map(f => `<div><dt>${E(f.l)}</dt><dd>${E(f.v)}<small>${E(f.u || '')}</small></dd></div>`).join('')}</dl>` : ''}</div></div>`); }
  };

  /* ── 테마(형식은 hpprem과 같다) ── */
  const DEF = {
    acparent: { name: '학부모 데스크', desc: '첫 화면에서 학부모 · 학생 · 상담 문의자가 갈 길을 고르는 학원형 · 시간표 · 수강료 · 알림까지', tags: ['k12', 'adult'], tone: 'light', dens: '보통',
      acc: '#2E5BDB', bg: '#FFFFFF', alt: '#F4F6FB', ink: '#111827', mu: '#4A5163', r: 20, br: 12, hero: 'split', vis: 'mock', illu: 'kids', card: 'shadow', look: 'brandBold', sw2: '#EEF2FD', base: 'clean', hk: 'acad', hp: 'acad', ck: 'photo',
      sh: '0 1px 2px rgba(17,24,39,.05),0 18px 40px -24px rgba(17,24,39,.28)' }
  };
  const ey = (fs, ls, fw, tt) => ({ fs, ls, fw, tt });
  const HD = {
    acparent: { hf: 'sans', hw: 800, hls: -0.035, h1: 52, h1m: 32, lh1: 1.16, h2: 38, h2m: 27, h3: 19, body: 16, blh: 1.7, lead: 18, ey: ey(13, 0.06, 750, 'none'), sec: 104, secm: 64, w: 1200, gut: 40,
      r: 20, rs: 12, br: 12, bh: 50, bpx: 22, bfw: 700, bls: -0.01, bd: '0', sh: '0 1px 2px rgba(17,24,39,.05),0 14px 32px -20px rgba(17,24,39,.24)', shh: '0 22px 40px -20px rgba(17,24,39,.3)', hov: 'lift', em: 'accent', link: 'hover' }
  };
  const MINE = Object.keys(DEF).filter(ON);
  if (!MINE.length) return;

  function cssX(s, th, T) { const R = ramp(T.a); const a = T.a, on = onC(a); const ink = T.ink || th.ink;
    const at = fit(a, '#ffffff', 4.6, '#000000'), atA = fit(a, th.alt, 4.6, '#000000'); const mu = fit(th.mu, th.alt, 4.6, '#000000');
    const p50 = R[50], p100 = R[100]; const tint = [p50, mix(a, '#ffffff', .9), mix('#E8553D', '#ffffff', .92), mix('#0E9F6E', '#ffffff', .9)];
    const tintT = tint.map(b => fit(a, b, 4.6, '#000000')); const warnT = fit(WARN, '#ffffff', 4.6, '#000000'); const ln = al(ink, .09); const sh = th.sh || 'none';
    const dk = fit(mix(a, '#0B1020', .78), '#ffffff', 10, '#000000'); /* 휴대폰 판 · 짙은 블록 */
    const pillT = fit(a, p50, 4.6, '#000000');
    return `
/* v43.8 hpx-acad(${s.theme}) */
.hpt{--p50:${p50};--p100:${p100};--p700:${R[700]};--warn:${WARN};--hx-ln:${ln}}
.hpx-w{max-width:1200px;margin:0 auto;padding:0 40px;position:relative}
.hpt.hpx-s{padding:clamp(64px,8vw,104px) 0;background:var(--bg);color:${ink}}.hpt.hpx-s.hpx-alt{background:${th.alt}}
.hpx-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin:0 0 clamp(28px,3.4vw,44px)}.hpx-sh>div{max-width:720px}
.hpx-ey{margin:0 0 12px;font-size:13px;font-weight:750;letter-spacing:.06em;color:${at}}.hpx-alt .hpx-ey{color:${atA}}
.hpx-sh h2{margin:0;font-size:clamp(27px,2.7vw,38px);line-height:1.22;letter-spacing:-.03em;font-weight:800;text-wrap:balance}
.hpx-sd{margin:12px 0 0;font-size:17px;line-height:1.65;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hpx-alt .hpx-sd{color:${mu}}
.hpx-hint{margin:0;padding:24px;border:1.5px dashed ${al(a, .4)};border-radius:16px;color:${th.mu};font-size:15px}
.hpx-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 18px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:-.01em;text-decoration:none;white-space:nowrap;background:#fff;color:${ink};box-shadow:inset 0 0 0 1.5px ${al(ink, .16)};transition:transform .15s,box-shadow .15s,background .15s}
.hpx-b:hover{box-shadow:inset 0 0 0 1.5px ${al(a, .6)};color:${at}}.hpx-b svg{transition:transform .15s}.hpx-b:hover svg{transform:translateX(3px)}
.hpx-b.p{background:${a};color:${on};box-shadow:0 8px 18px -10px ${al(a, .8)}}.hpx-b.p:hover{background:${R[600] || mix(a, '#000000', .14)};color:${onC(R[600] || mix(a, '#000000', .14))}}
.hpx-b:focus-visible,.hpx-tt a:focus-visible,.hpx-wd a:focus-visible{outline:3px solid ${al(a, .45)};outline-offset:2px}
/* 첫 화면 */
.hpt.hps-hero.hpx-ah{padding:clamp(28px,3.6vw,48px) 0 clamp(48px,5vw,72px);background:linear-gradient(180deg,${p50} 0%,#ffffff 78%);color:${ink};overflow:hidden}
.hpx-ahg{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:clamp(28px,4vw,56px);align-items:stretch}
.hpx-aht{display:flex;flex-direction:column;justify-content:center;padding:clamp(4px,1vw,16px) 0}
.hpx-pill{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;margin:0 0 18px;padding:7px 14px 7px 12px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px ${al(a, .18)};font-size:14px;font-weight:700;color:${pillT}}
.hpx-pill i{width:8px;height:8px;border-radius:50%;background:${WARN};box-shadow:0 0 0 4px ${al(WARN, .16)}}
.hpt.hpx-ah h1{margin:0;font-size:clamp(34px,3.5vw,50px)!important;line-height:1.17!important;letter-spacing:-.04em;font-weight:800;color:${ink};text-wrap:balance}
.hpx-sub{margin:16px 0 0;max-width:560px;font-size:18px;line-height:1.65;color:${fit(th.mu, p50, 4.6, '#000000')}}
.hpx-dr{margin-top:clamp(24px,3vw,36px)}.hpx-dq{margin:0 0 12px;font-size:14px;font-weight:750;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hpx-dr ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.hpx-d{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:16px;padding:14px 14px 14px 16px;border-radius:18px;background:#fff;box-shadow:0 0 0 1px ${ln},0 10px 24px -20px rgba(17,24,39,.4)}
.hpx-d.is-1{box-shadow:0 0 0 2px ${a},0 16px 32px -20px ${al(a, .7)}}
.hpx-di{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:${p50};color:${fit(a, p50, 4.6, '#000000')}}.hpx-d.is-1 .hpx-di{background:${a};color:${on}}
.hpx-dt{min-width:0;display:flex;flex-direction:column;gap:2px}.hpx-dt b{font-size:17px;font-weight:750;letter-spacing:-.02em}.hpx-dt small{font-size:14px;line-height:1.45;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hpx-da{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.hpx-ahm{position:relative;min-height:520px;border-radius:28px;overflow:hidden;background:${p100};isolation:isolate}
.hpx-img{margin:0;position:relative;overflow:hidden}.hpx-img>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;max-height:none;border-radius:0}
.hpx-ahp{position:absolute;inset:0;z-index:0}.hpx-ahm::after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(9,12,20,0) 40%,rgba(9,12,20,.35) 100%);pointer-events:none}
.hpx-tt{position:absolute;left:20px;right:20px;bottom:20px;z-index:2;background:#fff;border-radius:20px;padding:18px 18px 8px;box-shadow:0 24px 48px -20px rgba(9,12,20,.5);color:${ink}}
.hpx-tth{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 4px 6px}.hpx-tth b{font-size:16px;font-weight:800}.hpx-tth a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:14px;font-weight:700;color:${at};text-decoration:none}
.hpx-tt ul{list-style:none;margin:0;padding:0}.hpx-tt li+li{border-top:1px solid ${ln}}
.hpx-tt li a{display:grid;grid-template-columns:76px minmax(0,1fr) 20px;align-items:center;gap:14px;min-height:60px;padding:8px 4px;color:inherit;text-decoration:none}.hpx-tt li a>svg{color:${at}}
.hpx-ttd{display:flex;flex-direction:column;align-items:center;justify-content:center;height:48px;border-radius:12px;background:${p50};font-size:15px;font-weight:800;color:${fit(a, p50, 4.6, '#000000')}}.hpx-ttd small{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:${fit(th.mu, p50, 4.6, '#000000')}}
.hpx-ttn{min-width:0;display:flex;flex-direction:column;gap:2px}.hpx-ttn b{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hpx-ttn small{font-size:13px;font-weight:650;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hpx-ttn small.hot{color:${warnT}}
/* 시간표 */
.hpx-wg{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:12px;align-items:stretch}
.hpx-wd{background:${th.alt};border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:200px}.hpx-wd.empty{background:repeating-linear-gradient(135deg,${th.alt} 0 10px,#fff 10px 20px)}
.hpx-wdh{margin:0;display:flex;align-items:baseline;justify-content:space-between;padding:4px 6px}.hpx-wdh b{font-size:18px;font-weight:800}.hpx-wdh small{font-size:13px;color:${mu}}
.hpx-wd ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.hpx-wd li a{display:flex;flex-direction:column;gap:4px;min-height:44px;padding:12px 12px 12px 14px;border-radius:14px;background:#fff;color:${ink};text-decoration:none;box-shadow:inset 3px 0 0 ${a},0 1px 2px rgba(17,24,39,.06);transition:transform .15s,box-shadow .15s}
.hpx-wd li a:hover{transform:translateY(-2px);box-shadow:inset 3px 0 0 ${a},0 12px 24px -16px rgba(17,24,39,.35)}
${tint.map((b, i) => `.hpx-wd li.t${i} a{background:${b};box-shadow:inset 3px 0 0 ${[a, mix(a, '#000000', .25), WARN, '#0E9F6E'][i]}}.hpx-wd li.t${i} time{color:${tintT[i]}}`).join('')}
.hpx-wd time{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}.hpx-wd li b{font-size:15px;font-weight:700;line-height:1.35}.hpx-wd li small{font-size:13px;font-weight:650;color:${fit(th.mu, p50, 4.6, '#000000')}}.hpx-wd li small.hot{color:${fit(WARN, tint[2], 4.6, '#000000')}}
.hpx-fn{display:flex;align-items:center;gap:10px;margin:20px 0 0;font-size:14px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hpx-fn svg{flex:none;color:${at}}
/* 수강료 */
.hpx-fl{list-style:none;margin:0;padding:0;background:#fff;border-radius:22px;box-shadow:0 0 0 1px ${ln},${sh}}
.hpx-fl li{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 150px auto;align-items:center;gap:24px;padding:20px 24px}.hpx-fl li+li{border-top:1px solid ${ln}}
.hpx-fn1{min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:44px;color:inherit;text-decoration:none}.hpx-fn1:hover b{color:${at}}.hpx-fn1 b{font-size:17px;font-weight:750}.hpx-fn1 small,.hpx-fcap small,.hpx-fpr small{font-size:13px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hpx-fcap{display:flex;flex-direction:column;gap:8px}.hpx-bar{display:block;height:8px;border-radius:99px;background:${p100};overflow:hidden}.hpx-bar i{display:block;height:100%;border-radius:inherit;background:${a}}
.hpx-fpr{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.hpx-fpr b{font-size:20px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.hpx-fpr b span{font-size:15px;margin-left:1px}
.hpx-pay{display:flex;align-items:center;gap:18px;margin-top:16px;padding:18px 22px;border-radius:18px;background:${dk};color:#fff}.hpx-pay>i{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.12)}
.hpx-pay p{flex:1;margin:0;display:flex;flex-direction:column;gap:2px}.hpx-pay b{font-size:16px}.hpx-pay small{font-size:14px;color:rgba(255,255,255,.86)}.hpx-pay .hpx-b{background:#fff;color:${fit(a, '#ffffff', 4.8, '#000000')};box-shadow:none}
/* 알림 */
.hpx-alg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr);gap:clamp(32px,6vw,88px);align-items:center}
.hpx-alf{list-style:none;margin:0 0 28px;padding:0;display:flex;flex-direction:column;gap:18px}.hpx-alf li{display:flex;gap:16px;align-items:flex-start}
.hpx-alf i{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:${p50};color:${fit(a, p50, 4.6, '#000000')}}.hpx-alf p{margin:0;display:flex;flex-direction:column;gap:3px;padding-top:2px}.hpx-alf b{font-size:17px;font-weight:750}.hpx-alf small{font-size:15px;line-height:1.55;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hpx-btns{display:flex;gap:10px;flex-wrap:wrap}
.hpx-ph{position:relative;padding:28px;border-radius:32px;background:radial-gradient(120% 90% at 80% 0%,${mix(a, dk, .35)} 0%,${dk} 62%)}
.hpx-phf{max-width:360px;margin:0 auto;background:#fff;border-radius:30px;padding:18px 16px 16px;box-shadow:0 0 0 8px rgba(255,255,255,.08),0 30px 60px -24px rgba(0,0,0,.6);color:${ink}}
.hpx-phh{display:flex;align-items:center;justify-content:space-between;margin:2px 4px 12px}.hpx-phh b{font-size:15px;font-weight:800}.hpx-phh span{font-size:13px;font-weight:700;padding:3px 10px;border-radius:99px;background:${th.alt};color:${mu}}
.hpx-phf ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.hpx-phf li{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border-radius:16px;background:${th.alt}}
.hpx-phf li i{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:${a};color:${on}}.hpx-phf li.n-ex i{background:#0E9F6E;color:${onC('#0E9F6E')}}.hpx-phf li.n-bill i{background:${dk};color:#fff}
.hpx-phf li p{margin:0;min-width:0;display:flex;flex-direction:column;gap:1px}.hpx-phf li b{font-size:14px;font-weight:750}.hpx-phf li small{font-size:13px;color:${mu}}.hpx-phf time{font-size:13px;color:${mu};align-self:start}
/* 원장 */
.hpx-dg{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(32px,5vw,72px);align-items:center}
.hpx-dp{aspect-ratio:4/5;border-radius:28px;box-shadow:${sh}}
.hpx-dt2 .hpx-sh{margin-bottom:18px}.hpx-db{margin:0;font-size:17px;line-height:1.75;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hpx-sig{display:flex;align-items:center;gap:12px;margin:22px 0 0}.hpx-sig i{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:18px;background:${a};color:${on}}.hpx-sig span{display:flex;flex-direction:column}.hpx-sig b{font-size:16px}.hpx-sig small{font-size:13px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hpx-pr{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.hpx-pr li{padding:18px;border-radius:18px;background:${th.alt};display:flex;flex-direction:column;gap:10px}
.hpx-pr span{font-size:14px;font-weight:800;color:${atA};font-variant-numeric:tabular-nums}.hpx-pr p{margin:0;display:flex;flex-direction:column;gap:4px}.hpx-pr b{font-size:16px;font-weight:750}.hpx-pr small{font-size:14px;line-height:1.5;color:${mu}}
.hpx-fx{display:flex;margin:24px 0 0;padding:20px 0 0;border-top:1px solid ${ln}}.hpx-fx div{flex:1;padding:0 18px}.hpx-fx div+div{border-left:1px solid ${ln}}.hpx-fx div:first-child{padding-left:0}
.hpx-fx dt{font-size:13px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hpx-fx dd{margin:4px 0 0;font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.hpx-fx dd small{font-size:15px;font-weight:700;margin-left:2px}
@media(max-width:1000px){.hpx-ahg,.hpx-alg,.hpx-dg{grid-template-columns:minmax(0,1fr)}.hpx-ahm{min-height:460px}.hpx-wg{grid-template-columns:repeat(3,minmax(0,1fr))}.hpx-fl li{grid-template-columns:minmax(0,1fr) 140px auto}.hpx-fcap{grid-column:1/-1;order:3}}
@media(max-width:640px){.hpx-w{padding:0 20px}.hpt.hps-hero.hpx-ah{padding-top:20px}.hpt.hpx-ah h1{font-size:30px!important;line-height:1.24!important}.hpx-sub{font-size:16px}
.hpx-d{grid-template-columns:44px minmax(0,1fr);gap:12px;padding:14px}.hpx-di{width:44px;height:44px}.hpx-da{grid-column:1/-1;justify-content:stretch}.hpx-da .hpx-b{flex:1 1 0;min-width:0;padding:0 10px}
.hpx-ahm{min-height:0;display:flex;flex-direction:column;border-radius:22px;background:#fff;box-shadow:0 0 0 1px ${ln}}.hpx-ahp{position:relative;inset:auto;aspect-ratio:16/10}.hpx-ahm::after{display:none}.hpx-tt{position:static;box-shadow:none;border-radius:0;padding:12px 14px 4px}
.hpx-tt li a{grid-template-columns:64px minmax(0,1fr) 18px;gap:12px}
.hpx-wg{display:flex;flex-direction:column;gap:8px}.hpx-wd{min-height:0;display:grid;grid-template-columns:44px minmax(0,1fr);align-items:start;gap:8px;padding:10px}.hpx-wd ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.hpx-wd li a{padding:10px 10px 10px 12px;gap:2px}.hpx-wd li b{font-size:14px}.hpx-wd li small{display:none}.hpx-wd.empty{display:none}.hpx-wdh{flex-direction:column;align-items:flex-start;gap:0;padding:8px 2px}
.hpx-fl li{grid-template-columns:minmax(0,1fr) auto;gap:12px 16px;padding:18px}.hpx-fcap{grid-column:1/-1;order:2}.hpx-fl li>.hpx-b{display:none}.hpx-fl li.is-free>.hpx-b{display:inline-flex;grid-column:1/-1;order:3;width:100%}.hpx-fl li{padding:14px 18px}.hpx-fpr{align-items:flex-end}
.hpx-pay{flex-direction:column;align-items:stretch;text-align:left}.hpx-pay>i{display:none}.hpx-pay .hpx-b{width:100%}
.hpx-ph{padding:18px;border-radius:24px}.hpx-btns .hpx-b{flex:1 1 100%}
.hpx-pr{grid-template-columns:minmax(0,1fr);gap:8px}.hpx-pr li{flex-direction:row;align-items:flex-start;gap:14px;padding:14px 16px}.hpx-pr li>span{flex:none;line-height:1.5}.hpx-fx div{padding:0 10px}.hpx-fx dd{font-size:24px}.hpx-dp{aspect-ratio:4/3}.hpx-sh h2{font-size:27px}}
@media(prefers-reduced-motion:reduce){.hpx-b,.hpx-b svg,.hpx-wd li a{transition:none}}`; }

  /* ── 등록: 테마 · 디렉터 토큰 ── */
  MINE.forEach(id => { HPT.reg(id, Object.assign({ prem: 1, cssX }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpx-acad HPD', e); } });
  const mine = s => { try { return !!(s && s.theme && MINE.includes(s.theme)); } catch (e) { return false; } };
  /* 추천 순서 · 유형 맞춤(갤러리 「추천」 · 마법사) */
  if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, t2) => { if (DEF[id] && MINE.includes(id)) { const k = t2 || ty(); return DEF[id].tags.includes(k); } return f0(id, t2); }; }
  if (typeof HPT.premFor === 'function') { const p0 = HPT.premFor; HPT.premFor = t2 => { const L0 = p0(t2); const k = t2 || ty(); const fit1 = MINE.filter(id => DEF[id].tags.includes(k)); const rest = MINE.filter(id => !fit1.includes(id)); return [...fit1, ...L0.filter(x => !MINE.includes(x)), ...rest]; }; }
  /* 숫자 띠: 원장 소개(ac-dir)가 실제 숫자를 함께 보여 주므로 따로 넣은 숫자 띠(hpt facts)는 뺀다 — 같은 숫자가 두 번 나오지 않게 */
  if (typeof HPT.enrich === 'function') { const e0 = HPT.enrich; HPT.enrich = s => { const r = e0(s); try { const Lx = s && s.sections; if (mine(s) && Array.isArray(Lx) && Lx.some(x => x && x.data && x.data.hpt === 'ac-dir')) for (let i = Lx.length - 1; i >= 0; i--) if (Lx[i] && Lx[i].type === 'text' && Lx[i].data && (Lx[i].data.hpt === 'facts' || Lx[i].data.variant === 'stats')) Lx.splice(i, 1); } catch (e) { console.error('hpx-acad enrich', e); } return r; }; }
  /* 첫 화면 */
  if (window.HPS && typeof HPS.hero === 'function') { const h0 = HPS.hero; HPS.hero = (kind, s, d, th, T) => { try { if (mine(s) && (!d || !d.hk)) return heroAcad(s, d); } catch (e) { console.error('hpx-acad hero', e); } return h0(kind, s, d, th, T); }; }
  /* 섹션 */
  { const base = proSec; proSec = (x, i, s, lk) => { const d = x && x.data; const r = d && x.type === 'text' && SECR[d.hpt];
    if (!r || !s || !HPT.has(s.theme)) return base(x, i, s, lk);
    if (x.hide && !editing()) return '';
    let h = null; try { h = r(d, s); } catch (e) { console.error('hpx-acad', d.hpt, e); h = null; }
    if (h == null) return base(x, i, s, lk); if (!h) return '';
    const m = editing() ? HPE.map.get(x) : null; if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; window.proSec = proSec; }
  /* 미리보기: 실제 게시본 축소(hpprem과 같은 방식) */
  { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!MINE.includes(id) || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(x => x.id === 'prem-' + id); if (tp && typeof tp.build === 'function') b.sections = tp.build();
      return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpx-acad thumb', e); return tb(s, id); } }; }

  /* ── 템플릿(기본 섹션 순서 + 기본 문구) ── */
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const TX = (variant, data) => S2('text', { variant, ...data });
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const AUTO = [['자동', '공개 강좌 정보로 자동으로 채워요']]; /* 빈 섹션 정리(hpwFix)가 지우지 않게 — 렌더러는 cols를 쓰지 않는다 */
  const BUILD = {
    acparent: { scene: '학원 · 초중고 — 학부모 · 학생 · 상담 문의자가 첫 화면에서 갈 길을 고르는 학원 데스크', purpose: ['apply', 'info'], qaCls: null,
      photos: { k12: { hero: 'hum-04', about: 'stu-02', space: 'cls-03', cta: 'brd-01' }, adult: { hero: 'hum-10', about: 'dsk-03', space: 'cls-03', cta: 'lap-03' } },
      build: () => { const k = kid(); return [
        S2('banner', { eyebrow: k ? '겨울 학기 원생 모집' : '이번 달 개강 반 모집', title: k ? `한 명 한 명의 진도를\n끝까지 챙기는 ${org()}` : `실력에 맞는 반에서\n끝까지 완주하는 ${org()}`, sub: k ? '체험 수업으로 시작하고, 수업이 끝나면 출결 · 숙제 · 성적을 학부모 앱으로 바로 알려 드려요.' : '레벨 상담으로 반을 정하고, 수업 · 과제 · 수료까지 내 계정에서 한 번에 챙겨요.', cta: '상담 예약', cta2: '체험 수업' }),
        TX('features', { hpt: 'ac-week', eyebrow: 'TIMETABLE', title: '이번 주 시간표', sub: `요일과 시간을 보고 ${k ? '우리 아이에게' : '나에게'} 맞는 반을 골라 보세요.`, cols: AUTO }),
        TX('features', { hpt: 'ac-fee', eyebrow: 'TUITION', title: '반별 수강료 · 남은 자리', sub: '수강료와 정원을 미리 확인하고 상담 때 바로 등록할 수 있어요.', cols: AUTO }),
        TX('features', { hpt: 'ac-alert', eyebrow: k ? 'PARENT APP' : 'MY CLASS', title: k ? '학원에 다녀가면\n바로 알려 드려요' : '수업 · 과제 · 수료를\n놓치지 않게 알려 드려요', sub: '', cols: AUTO }),
        TX('features', { hpt: 'ac-dir', eyebrow: k ? 'DIRECTOR' : 'OUR PROMISE', title: k ? '성적보다 먼저\n공부하는 습관을 만듭니다' : '배운 것을\n일과 삶에 바로 쓰게 합니다', body: k ? '처음 상담에서 지금 실력과 목표를 함께 확인하고, 반 배정부터 시험 대비까지 담임이 끝까지 챙깁니다. 학부모님께는 수업마다 기록을 남겨 드립니다.' : '레벨 상담으로 출발점을 정하고, 실습 위주 수업과 과제 피드백으로 끝까지 완주하도록 돕습니다.',
          cols: k ? [['수업마다 기록', '출결 · 진도 · 숙제를 수업마다 남기고 보호자에게 알려요'], ['월 1회 상담', '성적 변화와 다음 달 계획을 함께 이야기해요'], ['결석하면 보강', '빠진 수업은 보강 일정을 잡아 드려요']] : [['레벨 상담', '첫 수업 전에 실력을 확인하고 반을 정해요'], ['과제 피드백', '제출한 과제에 강사가 직접 의견을 남겨요'], ['수료까지 관리', '남은 차시와 수료 기준을 계속 알려 드려요']] }),
        S2('reviews', { eyebrow: '', title: k ? '학부모 · 학생 이야기' : '수강생 이야기', note: '' }),
        S2('notices', { eyebrow: '', title: '학원 소식', n: 4 }),
        TX('cta', { eyebrow: '', title: k ? '체험 수업은\n상담 예약으로 시작해요' : '어떤 반이 맞을지\n상담으로 정해요', body: k ? '지금 실력과 목표를 듣고 맞는 반과 시간표를 안내해 드려요.' : '목표와 일정을 듣고 맞는 반과 시작일을 안내해 드려요.', cta: '상담 예약', cols: [] }),
        S2('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' })]; } }
  };
  /* 템플릿 지정 사진(유형별) */
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpxac) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && /^prem-/.test(tp.id) ? tp.id.slice(5) : ''; const P = BUILD[id] && MINE.includes(id) ? BUILD[id].photos[kid() ? 'k12' : 'adult'] : null;
      if (P && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, P); s.img = s.img || {}; Object.keys(P).forEach(sl => { const v = HPSTOCK.slotImg(P[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hpx-acad photos', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hpxac = 1; siteFromTpl = f; window.siteFromTpl = f; }
  MINE.forEach(id => { if (TPL.some(x => x.id === 'prem-' + id)) return; const c = BUILD[id];
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: c.scene, color: DEF[id].acc, tone: DEF[id].r >= 20 ? '친근' : DEF[id].r <= 8 ? '신뢰' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, hpx: 'acad', build: c.build }); });
  window.HPX = Object.assign(window.HPX || {}, { acad: { PASS, ids: MINE.slice(), all: Object.keys(DEF) } });
})();
