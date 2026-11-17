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
    return `<figure class="hxa-img${cls ? ' ' + cls : ''}${slot === 'hero' ? ' hp-photo' : ''}" data-slot="${E(slot)}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 900px) 100vw, 50vw"` : ''} alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>`; };

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
    return `<nav class="hxa-dr" aria-label="방문 목적별 바로가기"><p class="hxa-dq">어떤 일로 오셨어요?</p><ul>${D.map((x, i) => `<li class="hxa-d${i === 0 ? ' is-1' : ''}" data-door="${x.k}"><i class="hxa-di">${ic(x.ic, 22)}</i><div class="hxa-dt"><b>${E(x.who)}</b><small>${E(x.what)}</small></div><div class="hxa-da">${x.a.map(([l, h, p]) => `<a class="hxa-b${p ? ' p' : ''}" ${aT(h)}>${E(l)}${p ? ic('arrow', 18) : ''}</a>`).join('')}</div></li>`).join('')}</ul></nav>`; }
  function weekCard(s) { const C = pub().filter(c => daysOf(c).length && timeOf(c)).slice(0, 3); if (!C.length) return '';
    return `<aside class="hxa-tt" aria-label="이번 주 ${E(term('cls'))}"><div class="hxa-tth"><b>이번 주 ${E(term('cls'))}</b><a ${aT(L.cls(s))}>전체 시간표${ic('arrow', 16)}</a></div><ul>${C.map(c => { const sx = seatTx(c); const hot = leftOf(c) != null && leftOf(c) <= 3;
      return `<li><a ${aT(L.c(c))}><span class="hxa-ttd">${daysOf(c).map(d => DN[d]).join('·')}<small>${E(timeOf(c))}</small></span><span class="hxa-ttn"><b>${E(c.name)}</b>${sx ? `<small class="${hot ? 'hot' : ''}">${E(sx)}</small>` : ''}</span>${ic('arrow', 18)}</a></li>`; }).join('')}</ul></aside>`; }
  function heroAcad(s, d) { d = d || {}; const lines = String(d.title || org()).split('\n'); const n = pub().length;
    const pill = d.eyebrow ? `<p class="hxa-pill"><i aria-hidden="true"></i>${E(d.eyebrow)}${n ? ` · ${n}개 반 모집 중` : ''}</p>` : '';
    return `<section class="hpt hp-hero hps-hero hxa-ah hxa-pa"><div class="hxa-w"><div class="hxa-ahg"><div class="hxa-aht">${pill}<h1>${lines.map(E).join('<br>')}</h1>${d.sub ? `<p class="hxa-sub">${E(d.sub)}</p>` : ''}${fig(s, 'hero', 'hxa-mph', 1, d)}${doors(s, d)}</div><div class="hxa-ahm">${fig(s, 'hero', 'hxa-ahp', 1, d)}${weekCard(s)}</div></div></div></section>`; }

  /* ── 섹션 렌더러(data.hpt = 'ac-*') — 보조 디자이너도 재사용 ── */
  const SH = (d, def) => `<header class="hxa-sh"><div>${d.eyebrow || def ? `<p class="hxa-ey">${E(d.eyebrow || def)}</p>` : ''}<h2>${br(d.title || '')}</h2>${d.sub ? `<p class="hxa-sd">${E(d.sub)}</p>` : ''}</div></header>`;
  const sec = (cls, inner, tone) => `<section class="hpt hp-s hxa-s ${cls}${tone ? ' hxa-' + tone : ''}"><div class="hxa-w">${inner}</div></section>`;
  const hint = (cls, msg) => editing() ? sec(cls, `<p class="hxa-hint">${E(msg)}</p>`) : '';
  const SECR = {
    /* 이번 주 시간표: 월~토 칸에 실제 반(요일 · 시작 시간 · 남은 자리) */
    'ac-week': (d, s) => { const C = pub().filter(c => daysOf(c).length && timeOf(c)); if (!C.length) return hint('hxa-wk', '공개 강좌에 요일과 시작 시간을 넣으면 이번 주 시간표가 자동으로 그려집니다.');
      const used = [1, 2, 3, 4, 5, 6, 0].filter(k => k !== 0 || C.some(c => daysOf(c).includes(0)));
      const col = k => { const R = C.filter(c => daysOf(c).includes(k)).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
        return `<div class="hxa-wd${R.length ? '' : ' empty'}"><p class="hxa-wdh"><b>${DN[k]}</b><small>${R.length ? `${R.length}개 반` : '수업 없음'}</small></p>${R.length ? `<ul>${R.map(c => { const i = C.indexOf(c) % 4; const hot = leftOf(c) != null && leftOf(c) <= 3;
          return `<li class="t${i}"><a ${aT(L.c(c))}><time>${E(timeOf(c))}</time><b>${E(c.name)}</b>${seatTx(c) ? `<small class="${hot ? 'hot' : ''}">${E(seatTx(c))}</small>` : ''}</a></li>`; }).join('')}</ul>` : ''}</div>`; };
      return sec('hxa-wk', `${SH(d, 'TIMETABLE')}<div class="hxa-wg" style="--n:${used.length}">${used.map(col).join('')}</div><p class="hxa-fn">${ic('clock', 18)}<span>칸을 누르면 반 소개 · 진도 계획 · 신청 화면으로 이동해요. 시간표는 학원 운영 시간표와 같이 바뀌어요.</span></p>`); },
    /* 반별 수강료 · 정원 · 신청 */
    'ac-fee': (d, s) => { const C = pub().slice(0, 6); if (!C.length) return hint('hxa-fee', '공개 강좌가 있으면 반별 수강료 · 정원이 자동으로 표시됩니다.');
      const row = c => { const cap = capOf(c), n = (c.learners || []).length, l = leftOf(c); const pct = cap ? Math.min(100, Math.round(n / cap * 100)) : 0; const free = !+c.price;
        return `<li class="${free ? 'is-free' : ''}"><a class="hxa-fn1" ${aT(L.c(c))}><b>${E(c.name)}</b><small>${E([daysOf(c).map(x => DN[x]).join('·'), timeOf(c), c.cat].filter(Boolean).join(' · ') || '일정은 상담으로 안내해요')}</small></a>
          <div class="hxa-fcap">${cap ? `${n ? `<span class="hxa-bar" role="img" aria-label="정원 ${cap}명 중 ${n}명 신청"><i style="width:${pct}%"></i></span>` : '<span class="hxa-new"><i aria-hidden="true"></i>모집 시작</span>'}<small>${l === 0 ? '정원 마감 · 대기 접수' : `정원 ${cap}명 · 남은 자리 ${l}석`}</small>` : '<small>정원은 상담으로 안내해요</small>'}</div>
          <div class="hxa-fpr">${free ? '<b>무료</b><small>체험 수업</small>' : `<b>${W(c.price)}<span>원</span></b><small>${c.hours ? `총 ${E(c.hours)}시간` : '과정 전체'}</small>`}</div>
          <a class="hxa-b${free ? ' p' : ''}" ${aT(L.c(c))}>${free ? '체험 신청' : '반 보기'}${ic('arrow', 18)}</a></li>`; };
      return sec('hxa-fee', `${SH(d, 'TUITION')}<ul class="hxa-fl">${C.map(row).join('')}</ul><div class="hxa-pay"><i>${ic('card', 22)}</i><p><b>${kid() ? '수강료는 학부모 앱 청구서로 결제해요' : '수강료는 내 계정의 결제 화면에서 결제해요'}</b><small>카드 · 간편결제로 내고, 영수증과 환불 내역도 한곳에서 확인할 수 있어요.</small></p><a class="hxa-b" ${aT(L.pay())}>청구서 · 결제 바로 가기${ic('arrow', 18)}</a></div>`, 'alt'); },
    /* 학부모(수강생) 알림 — 제품 설명(예시 화면) */
    'ac-alert': (d, s) => { const c0 = pub()[0]; const cn = c0 ? c0.name : `${term('cls')}`; const tm = c0 && timeOf(c0) ? timeOf(c0) : '18:50';
      const F = kid() ? [['clock', '등원 · 하원', '학원에 들어오고 나갈 때 시간을 바로 알려 드려요.'], ['book', '진도 · 숙제', '오늘 나간 진도와 숙제, 제출 여부를 수업마다 남겨요.'], ['chart', '시험 성적', '내 점수와 반 평균만 보여 드려요. 석차는 공개하지 않아요.']]
        : [['clock', '수업 알림', '수업 시작 전과 보강 일정이 잡히면 바로 알려 드려요.'], ['book', '과제 · 진도', '과제 마감과 남은 차시를 한눈에 보여 드려요.'], ['check', '수료 · 증명서', '수료 기준을 채우면 수료증을 바로 내려받아요.']];
      const N = kid() ? [['in', '등원했어요', `${cn} · ${tm} 출석`], ['hw', '오늘 숙제가 올라왔어요', '교재 42~45쪽 · 다음 수업 전까지'], ['ex', '단원평가 결과', '88점 · 반 평균 79.5점'], ['bill', '이번 달 수강료 청구서', '결제 기한 25일 · 앱에서 결제']]
        : [['in', '30분 뒤 수업이 시작돼요', `${cn} · ${tm}`], ['hw', '과제 마감이 내일이에요', '실습 과제 2 · 제출 전'], ['ex', '진도 70%를 넘었어요', '수료까지 3차시 남았어요'], ['bill', '수강료 결제가 완료됐어요', '영수증은 결제 내역에서']];
      return sec('hxa-al', `<div class="hxa-alg"><div class="hxa-alt">${SH(d, kid() ? 'PARENT APP' : 'MY CLASS')}<ul class="hxa-alf">${F.map(([k, b, t2]) => `<li><i>${ic(k, 22)}</i><p><b>${E(b)}</b><small>${E(t2)}</small></p></li>`).join('')}</ul><div class="hxa-btns"><a class="hxa-b p" ${aT(kid() ? L.family() : L.my())}>${kid() ? '학부모로 로그인' : '내 수업 로그인'}${ic('arrow', 18)}</a><a class="hxa-b" ${aT(L.join())}>처음이면 간편가입</a></div></div>
        <div class="hxa-ph" role="img" aria-label="${kid() ? '학부모' : '수강생'} 알림 예시 화면"><div class="hxa-phf"><p class="hxa-phh"><b>${E(org())}</b><span>예시 화면</span></p><ul>${N.map(([k, b, t2], i) => `<li class="n-${k}"><i>${ic(k === 'in' ? 'check' : k === 'hw' ? 'book' : k === 'ex' ? 'chart' : 'card', 18)}</i><p><b>${E(b)}</b><small>${E(t2)}</small></p><time>${['방금', '12분 전', '어제', '2일 전'][i]}</time></li>`).join('')}</ul></div></div></div>`); },
    /* 원장 소개 · 약속 + 실제 숫자 */
    'ac-dir': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 3); let F = []; try { F = (HPT.facts() || []).slice(0, 3); } catch (e) { }
      const ini = (org().replace(/\s/g, '')[0] || '원');
      return sec('hxa-dir', `<div class="hxa-dg">${fig(s, 'about', 'hxa-dp', 0) || ''}<div class="hxa-dt2">${SH(d, kid() ? 'DIRECTOR' : 'OUR PROMISE')}${d.body && !isPh(d.body) ? `<p class="hxa-db">${br(d.body)}</p>` : ''}<p class="hxa-sig"><i aria-hidden="true">${E(ini)}</i><span><b>${E(org())}</b><small>${kid() ? '원장 드림' : '대표 드림'}</small></span></p>
        ${P.length ? `<ol class="hxa-pr">${P.map((r, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><p><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</p></li>`).join('')}</ol>` : ''}
        ${F.length >= 2 ? `<dl class="hxa-fx">${F.map(f => `<div><dt>${E(f.l)}</dt><dd>${E(f.v)}<small>${E(f.u || '')}</small></dd></div>`).join('')}</dl>` : ''}</div></div>`); }
  };

  /* ══ A2 추가 2종 ══════════════════════════════════════════════════════════
     acresult(성과 보드): 입시 · 관리형 · 내신 — 「레벨 진단 → 반 배정 → 관리」 3단계 판이 첫 화면 주인공, 3갈래는 짙은 가로 띠.
     acstudio(클래스 스튜디오): 예체능 · 원데이 · 성인 취미 — 사진 3장 격자 + 이번 달 체험 반, 3갈래는 큰 버튼(체험 신청이 맨 위). */
  const today = () => new Date().toISOString().slice(0, 10);
  const md = v => { const m = String(v || '').match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${+m[1]}.${+m[2]}` : ''; };
  const nextStart = () => pub().map(c => c.start).filter(v => v && v >= today()).sort()[0] || '';
  const seatsLeft = () => pub().reduce((a, c) => a + (leftOf(c) || 0), 0);
  const whenOf = c => [daysOf(c).map(x => DN[x]).join('·'), timeOf(c)].filter(Boolean).join(' ');
  /* 3갈래 공통 데이터(형태만 템플릿마다 다르게) */
  function doorData(s, d) { const free = pub().some(c => !+c.price);
    const first = [[d.cta || '상담 예약', L.ask(s), 1], free ? [d.cta2 || '체험 수업', L.trial(s)] : [`${term('cls')} 둘러보기`, L.cls(s)]];
    return kid() ? [{ k: 'new', ic: 'cal', who: '처음 오셨나요?', what: '상담 · 레벨 진단 · 체험 수업', a: first },
      { k: 'par', ic: 'users', who: '재원생 학부모', what: '출결 · 테스트 결과 · 수강료 결제', a: [['자녀 현황 보기', L.family()], ['수강료 결제', L.pay()]] },
      { k: 'stu', ic: 'book', who: '학생', what: '오늘 수업 · 숙제 · 오답 복습', a: [['내 수업 열기', L.my()]] }]
      : [{ k: 'new', ic: 'cal', who: '처음 오셨나요?', what: '레벨 상담 · 체험 수업', a: first },
        { k: 'stu', ic: 'book', who: '수강생', what: '내 수업 · 과제 · 수료증', a: [['내 수업 열기', L.my()]] },
        { k: 'pay', ic: 'card', who: '결제 · 영수증', what: '수강료 결제와 영수증 · 환불 내역', a: [['결제 내역 보기', L.pay()]] }]; }
  const btn = ([l, h, p], cls) => `<a class="hxa-b${p ? ' p' : ''}${cls ? ' ' + cls : ''}" ${aT(h)}>${E(l)}${p ? ic('arrow', 18) : ''}</a>`;

  /* acresult 첫 화면 — 「성과 보드」(L1 심사 반영): 짙은 바탕 + 넓은 성과 판이 주인공
     성과 판 = ① 운영자가 입력한 실적(ac-proof 섹션 cols: [실적, 기준]) → ② 없으면 실제 운영 데이터(후기 평점 · 접수 마감이 가장 빠른 반 · 다음 개강) + 주간 테스트 추이 「예시」 */
  const proofOf = s => { const x = ((s && s.sections) || []).find(y => y && !y.hide && y.type === 'text' && y.data && y.data.hpt === 'ac-proof'); return x ? (x.data.cols || []).filter(r => r && r[0] && !isPh(r[0]) && r[0] !== '자동').slice(0, 4).map(r => [String(r[0]), String(r[1] || '')]) : []; };
  const dleft = v => { const a = Date.parse(String(v || '').slice(0, 10)), b = Date.parse(today()); return isNaN(a) ? null : Math.round((a - b) / 864e5); };
  const SC = [62, 66, 65, 71, 74, 79, 80, 84]; /* 예시 화면 점수(주간 테스트) */
  let spN = 0; const spark = (W2, H2, avg) => { const gid = 'hxaG' + (++spN); const x = i => Math.round(i * W2 / (SC.length - 1)), y = v => Math.round(H2 - 6 - (v - 50) / 50 * (H2 - 12)); const pts = SC.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    return `<svg viewBox="0 0 ${W2} ${H2}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>${avg ? `<line x1="0" x2="${W2}" y1="${y(avg)}" y2="${y(avg)}" stroke="currentColor" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/>` : ''}<polygon points="0,${H2} ${pts} ${W2},${H2}" fill="url(#${gid})"/><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="${x(SC.length - 1)}" cy="${y(SC[SC.length - 1])}" r="4.5" fill="currentColor"/></svg>`; };
  function boardCells(s) { const P = proofOf(s); if (P.length) return { real: 1, C: P.map(([v, l]) => ({ v, l, sub: '' })) };
    const C = []; let R = []; try { R = (HPT.reviews() || []).filter(r => +r.st > 0); } catch (e) { }
    if (R.length) C.push({ v: (R.reduce((a, r) => a + Math.min(5, +r.st), 0) / R.length).toFixed(1), u: '/5', l: kid() ? '학부모 · 학생 후기 평점' : '수강생 후기 평점', sub: `실제 후기 ${R.length}건` });
    const Q = pub().map(c => ({ c, n: dleft(c.recruit && c.recruit.to), l: leftOf(c) })).filter(x => x.n != null && x.n >= 0).sort((a, b) => a.n - b.n || (a.l || 99) - (b.l || 99));
    if (Q[0]) C.push({ v: Q[0].n === 0 ? '오늘' : `D-${Q[0].n}`, l: '접수 마감이 가장 빠른 반', sub: `${Q[0].c.name}${Q[0].l != null ? ` · ${Q[0].l}석 남음` : ''}`, h: L.c(Q[0].c) });
    else { const H3 = pub().filter(c => leftOf(c) != null).sort((a, b) => leftOf(a) - leftOf(b))[0]; if (H3) C.push({ v: `${leftOf(H3)}석`, l: '자리가 가장 적게 남은 반', sub: H3.name, h: L.c(H3) }); }
    const nx = pub().filter(c => c.start && c.start >= today()).sort((a, b) => String(a.start).localeCompare(b.start))[0]; if (nx) C.push({ v: md(nx.start), l: '다음 개강', sub: nx.name, h: L.c(nx) });
    return { real: 0, C: C.slice(0, 3) }; }
  function heroResult(s, d) { d = d || {}; const lines = String(d.title || org()).split('\n'); const D = doorData(s, d); const B = boardCells(s);
    const cell = c => `<div class="hxa-sbc">${c.h ? `<a ${aT(c.h)}>` : '<div>'}<dt>${E(c.l)}</dt><dd>${E(c.v)}${c.u ? `<small>${E(c.u)}</small>` : ''}</dd>${c.sub ? `<p>${E(c.sub)}</p>` : ''}${c.h ? '</a>' : '</div>'}</div>`;
    const trend = B.real ? '' : `<div class="hxa-sbc hxa-sbtr"><div><dt>${kid() ? '주간 테스트 점수 추이' : '모의고사 점수 추이'}<em>예시 화면</em></dt><dd>84<small>점</small><b class="up">8주 +22</b></dd><span class="hxa-spk">${spark(240, 64, 72)}</span></div></div>`;
    const note = B.real ? '학원이 직접 집계한 실적이에요. 기준은 상담 때 안내해 드려요.' : (editing() ? '실적(합격 · 성적 향상)을 「실적」 섹션에 입력하면 이 판에 먼저 보여요.' : '실제 운영 데이터로 자동 집계해요.');
    return `<section class="hpt hp-hero hps-hero hxa-ah hxa-sb"><div class="hxa-w"><div class="hxa-sbg">
      <div class="hxa-sbt">${d.eyebrow ? `<p class="hxa-pill"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h1>${lines.map(E).join('<br>')}</h1>${d.sub ? `<p class="hxa-sub">${E(d.sub)}</p>` : ''}${fig(s, 'hero', 'hxa-mph', 1, d)}
        <nav class="hxa-dr hxa-sbd" aria-label="방문 목적별 바로가기"><p class="hxa-dq">어떤 일로 오셨어요?</p><ul>${D.map((x, i) => `<li class="${i === 0 ? 'is-1' : ''}" data-door="${x.k}"><p><b>${E(x.who)}</b><small>${E(x.what)}</small></p><div class="hxa-da">${x.a.map(a => btn(a)).join('')}</div></li>`).join('')}</ul></nav></div>
      ${fig(s, 'hero', 'hxa-sbp', 1, d)}
      <aside class="hxa-board" aria-label="성과 보드"><header><p><b>성과 보드</b><small>${E(note)}</small></p><a class="hxa-b" ${aT(L.ask(s))}>진단 상담 예약${ic('arrow', 18)}</a></header><dl style="--n:${B.C.length + (trend ? 1 : 0)}">${B.C.map(cell).join('')}${trend}</dl></aside>
    </div></div></section>`; }

  /* 주간 리포트(예시 화면) — 성과형만의 섹션 */
  SECR['ac-report'] = (d, s) => { const k = kid(); const c0 = pub()[0];
    const F = k ? [['chart', '주간 테스트 점수', '매주 같은 기준으로 보고, 반 평균과 함께 보여 드려요.'], ['book', '오답이 많은 단원', '틀린 문제를 단원별로 묶어 클리닉에서 다시 풀어요.'], ['cal', '다음 주 계획', '진도 · 숙제 · 클리닉 일정을 미리 알려 드려요.']]
      : [['chart', '모의고사 점수', '시험과 같은 시간으로 보고 점수 변화를 보여 드려요.'], ['book', '약한 영역', '오답이 많은 영역을 묶어 다음 수업에서 다시 다뤄요.'], ['cal', '남은 기간 계획', '시험일까지 남은 차시와 과제를 알려 드려요.']];
    return sec('hxa-rp', `<div class="hxa-rpg"><div>${SH(d, k ? 'WEEKLY REPORT' : 'SCORE REPORT')}<ul class="hxa-alf">${F.map(([i, b, t2]) => `<li><i>${ic(i, 22)}</i><p><b>${E(b)}</b><small>${E(t2)}</small></p></li>`).join('')}</ul><div class="hxa-btns">${btn([k ? '학부모 리포트 보기' : '내 점수 기록 보기', k ? L.family() : L.my(), 1])}${btn(['처음이면 간편가입', L.join()])}</div></div>
      <div class="hxa-rpc" role="img" aria-label="${k ? '주간 리포트' : '점수 리포트'} 예시 화면"><header><p><b>${k ? '주간 리포트' : '점수 리포트'}</b><small>${E(c0 ? c0.name : org())} · 학생 A</small></p><span>예시 화면</span></header>
        <div class="hxa-rpn"><p><b>84<small>점</small></b><em>지난주보다 +4점</em></p><p class="avg"><i aria-hidden="true"></i>반 평균 72점</p></div>
        <div class="hxa-rpk">${spark(560, 150, 72)}</div><ol class="hxa-rpx">${SC.map((v, i) => `<li>${i + 1}주</li>`).join('')}</ol>
        <ul class="hxa-rpt"><li><small>${k ? '오답이 많은 단원' : '약한 영역'}</small><b>${k ? '이차방정식 활용 · 3문항' : '실기 2과목 · 4문항'}</b></li><li><small>${k ? '다음 클리닉' : '다음 모의고사'}</small><b>${k ? '목요일 18:00' : '토요일 10:00'}</b></li></ul></div></div>`); };

  /* acstudio 첫 화면 사진(L1 심사): 예체능 고정 사진 대신 ① 기관이 올린 사진 → ② 공개 강좌 이름에 맞는 사진(HPSTOCK.forCourse) → ③ 맞는 사진이 없으면 요일 · 시간 판 */
  const stPicked = new Set();
  function stPh(s, slot, cls, i, d) { const own = window.HPS && HPS.photo ? HPS.photo(s, slot, slot === 'hero' ? d : undefined) : null;
    if (own && !own.stock) return fig(s, slot, cls, slot === 'hero', d);
    const C = pub(); const H2 = window.HPSTOCK; let x = null, c = null;
    if (H2 && typeof H2.forCourse === 'function') for (let k = 0; k < C.length && !x; k++) { const cc = C[(i + k) % C.length]; const y = H2.forCourse(ty(), cc.name, { seed: cc.id, exclude: [...stPicked] }); if (y && !stPicked.has(y.id)) { x = y; c = cc; } }
    if (x) { stPicked.add(x.id); return `<figure class="hxa-img ${cls}${slot === 'hero' ? ' hp-photo' : ''}" data-slot="${E(slot)}" data-stock="1"><img src="${E(H2.url(x))}"${H2.srcset ? ` srcset="${E(H2.srcset(x))}" sizes="(max-width: 900px) 100vw, 40vw"` : ''} alt="${E(x.alt || '')}" ${slot === 'hero' ? 'loading="eager"' : 'loading="lazy"'} decoding="async" style="object-position:${E(x.focus || '50% 50%')}"></figure>`; }
    const t0 = C.filter(z => daysOf(z).length && timeOf(z))[i]; if (!t0) return `<div class="hxa-img hxa-tile ${cls}" data-slot="${E(slot)}"><span><b>${E(org())}</b></span></div>`;
    return `<div class="hxa-img hxa-tile ${cls}" data-slot="${E(slot)}"><span><b>${E(daysOf(t0).map(z => DN[z]).join('·'))}</b><small>${E(timeOf(t0))}</small></span><em>${E(t0.name)}</em></div>`; }
  /* acstudio 첫 화면 */
  function trialCard(s) { const C = pub(); const c = C.find(x => !+x.price && leftOf(x) !== 0) || C.filter(x => leftOf(x)).sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))[0]; if (!c) return '';
    const free = !+c.price; const sx = seatTx(c);
    return `<aside class="hxa-trial" aria-label="${free ? '무료 체험 수업' : '곧 시작하는 반'}"><a ${aT(L.c(c))}><span class="hxa-trk">${free ? '무료 체험' : c.start ? `${md(c.start)} 개강` : '모집 중'}</span><b>${E(c.name)}</b><small>${E([whenOf(c), sx].filter(Boolean).join(' · ') || '일정은 상담으로 안내해요')}</small><em>${free ? '체험 신청' : '반 보기'}${ic('arrow', 16)}</em></a></aside>`; }
  function heroStudio(s, d) { d = d || {}; const lines = String(d.title || org()).split('\n'); const n = pub().filter(c => leftOf(c) !== 0).length; const D = doorData(s, d); D[0].what = kid() ? '체험 수업 · 반 상담' : '원데이 체험 · 레벨 상담'; stPicked.clear(); const P1 = stPh(s, 'hero', 'hxa-m1', 0, d), P2 = stPh(s, 'about', 'hxa-m2', 1), P3 = stPh(s, 'space', 'hxa-m3', 2);
    const free = pub().find(c => !+c.price); const top = free ? [`${d.cta2 || '체험 수업'} 신청`, L.c(free), 1] : [d.cta || '상담 예약', L.ask(s), 1];
    const sec2 = free ? [d.cta || '상담 예약', L.ask(s)] : [`${term('cls')} 둘러보기`, L.cls(s)];
    return `<section class="hpt hp-hero hps-hero hxa-ah hxa-st"><div class="hxa-w hxa-stg">
      <div class="hxa-stt">${d.eyebrow ? `<p class="hxa-pill"><i aria-hidden="true"></i>${E(d.eyebrow)}${n ? ` · ${n}개 반 신청 가능` : ''}</p>` : ''}<h1>${lines.map(E).join('<br>')}</h1>${d.sub ? `<p class="hxa-sub">${E(d.sub)}</p>` : ''}<div class="hxa-mstrip" aria-hidden="true">${P1.replace(/ data-slot="[^"]*"/, '').replace('hxa-m1', 'hxa-ms')}${P2.replace(/ data-slot="[^"]*"/, '').replace('hxa-m2', 'hxa-ms')}</div>
        <nav class="hxa-dr hxa-drs" aria-label="방문 목적별 바로가기"><p class="hxa-dq">어떤 일로 오셨어요?</p>
          <div class="hxa-s1" data-door="new"><p><small>${E(D[0].who)}</small><b>${E(D[0].what)}</b></p><div class="hxa-da">${btn(top, 'hxa-big')}${btn(sec2)}</div></div>
          <ul>${D.slice(1).map(x => `<li data-door="${x.k}"><i class="hxa-di">${ic(x.ic, 20)}</i><p><b>${E(x.who)}</b><small>${E(x.what)}</small></p><div class="hxa-da">${x.a.map(a => btn(a)).join('')}</div></li>`).join('')}</ul></nav></div>
      <div class="hxa-stm">${P1}${P2}${P3}${trialCard(s)}</div>
    </div></section>`; }
  const HERO = { acresult: heroResult, acstudio: heroStudio };

  /* 섹션 3종 추가 */
  const usedPh = new Set();
  const clsPh = (c) => { if (c.thumb && /^data:image\//.test(c.thumb)) return c.thumb; const H2 = window.HPSTOCK; if (!H2 || typeof H2.forCourse !== 'function') return '';
    const x = H2.forCourse(ty(), c.name, { seed: c.id, exclude: [...usedPh] }); if (!x) return ''; usedPh.add(x.id); return H2.url(x, 'sm'); };
  Object.assign(SECR, {
    /* 실적: 운영자가 입력한 값만(cols = [실적, 기준 · 설명]). 없으면 게시본에서 통째로 숨김 */
    'ac-proof': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0]) && r[0] !== '자동').slice(0, 4);
      if (!P.length) return hint('hxa-pf', '합격 · 성적 향상 실적을 입력하면 이 띠가 보입니다. 학원이 직접 집계한 실제 실적만 넣어 주세요(입력 전에는 게시본에서 숨겨집니다).');
      return sec('hxa-pf', `${SH(d, 'RESULTS')}<ul class="hxa-pfl" style="--n:${P.length}">${P.map(r => `<li><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</li>`).join('')}</ul><p class="hxa-fn">${ic('check', 18)}<span>학원이 직접 집계한 실적이에요. 자세한 기준은 상담 때 안내해 드려요.</span></p>`); },
    /* 관리 루틴(운영 방침 문구 — 설정에서 고침) */
    'ac-cycle': (d, s) => { const P = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 4); if (!P.length) return hint('hxa-cy', '관리 단계(예: 수업 · 클리닉 · 테스트 · 상담)를 넣으면 관리 루틴이 그려집니다.');
      return sec('hxa-cy', `<div class="hxa-cyg">${SH(d, 'WEEKLY CARE')}<div class="hxa-btns">${btn([kid() ? '학부모 리포트 보기' : '내 학습 기록 보기', kid() ? L.family() : L.my(), 1])}${btn(['진단 상담 예약', L.ask(s)])}</div></div>
        <ol class="hxa-cyl" style="--n:${P.length}">${P.map((r, i) => `<li><span class="no">${String(i + 1).padStart(2, '0')}</span><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</li>`).join('')}</ol>`, 'dk'); },
    /* 클래스 카드(사진은 강좌명과 장면이 맞을 때만, 아니면 요일 · 시간 판) */
    'ac-cls': (d, s) => { const C = pub().slice(0, 6); if (!C.length) return hint('hxa-cl', '공개 강좌가 있으면 클래스 카드가 자동으로 그려집니다.'); usedPh.clear(); try { Object.values((s && s.photos) || {}).forEach(v => usedPh.add(Array.isArray(v) ? v[0] : v)); Object.values((s && s.img) || {}).forEach(v => v && v.stock && usedPh.add(v.stock)); stPicked.forEach(v => usedPh.add(v)); } catch (e) { }
      const L2 = [...C.filter(c => !+c.price), ...C.filter(c => +c.price)];
      const card = c => { const ph = clsPh(c); const free = !+c.price; const cap = capOf(c), n = (c.learners || []).length, l = leftOf(c); const pct = cap ? Math.min(100, Math.round(n / cap * 100)) : 0; const hot = l != null && l <= 3;
        return `<li class="${free ? 'is-free' : ''}"><a class="hxa-clc" ${aT(L.c(c))}><span class="hxa-clp">${ph ? `<img src="${E(ph)}" alt="" loading="lazy" decoding="async">` : `<span class="hxa-clx" aria-hidden="true"><b>${E(daysOf(c).map(x => DN[x]).join('·') || term('cls'))}</b><small>${E(timeOf(c))}</small></span>`}${free ? '<em class="hxa-clb">무료 체험</em>' : ''}</span>
          <span class="hxa-clt"><small class="hxa-clm">${E(whenOf(c) || '일정은 상담으로 안내해요')}</small><b class="hxa-cln">${E(c.name)}</b>
          ${cap ? `<span class="hxa-bar" aria-hidden="true"><i style="width:${Math.max(4, pct)}%"></i></span><small class="hxa-cls${hot ? ' hot' : ''}">${E(l === 0 ? '정원 마감 · 대기 접수' : `정원 ${cap}명 · 남은 자리 ${l}석`)}</small>` : ''}
          <span class="hxa-clpr"><b>${free ? '무료' : `${W(c.price)}<small>원</small>`}</b><span>${free ? '체험 신청' : '자세히 보기'}${ic('arrow', 16)}</span></span></span></a></li>`; };
      const pay = `<div class="hxa-pay"><i>${ic('card', 22)}</i><p><b>${kid() ? '수강료는 학부모 앱 청구서로 결제해요' : '수강료는 내 계정의 결제 화면에서 결제해요'}</b><small>카드 · 간편결제로 내고, 영수증과 환불 내역도 한곳에서 확인할 수 있어요.</small></p><a class="hxa-b" ${aT(L.pay())}>청구서 · 결제 바로 가기${ic('arrow', 18)}</a></div>`;
      return sec('hxa-cl', `${SH(d, 'CLASSES')}<ul class="hxa-cll">${L2.map(card).join('')}</ul>${d.pay ? pay : ''}`); }
  });

  /* 실적 섹션: 성과 보드(acresult)는 첫 화면 판에 보여 주므로 게시본에서 다시 그리지 않는다(편집 중에는 입력 안내) */
  { const p0 = SECR['ac-proof']; SECR['ac-proof'] = (d, s) => (s && s.theme === 'acresult') ? hint('hxa-pf', (d.cols || []).some(r => r && r[0] && r[0] !== '자동' && !isPh(r[0])) ? '입력한 실적은 첫 화면 「성과 보드」에 보여요.' : '합격 · 성적 향상 실적을 입력하면 첫 화면 「성과 보드」에 먼저 보여요. 학원이 직접 집계한 실제 실적만 넣어 주세요.') : p0(d, s); }

  /* ── 테마(형식은 hpprem과 같다) ── */
  const DEF = {
    acparent: { name: '학부모 데스크', desc: '첫 화면에서 학부모 · 학생 · 상담 문의자가 갈 길을 고르는 학원형 · 시간표 · 수강료 · 알림까지', tags: ['k12', 'adult'], tone: 'light', dens: '보통',
      acc: '#2E5BDB', bg: '#FFFFFF', alt: '#F4F6FB', ink: '#111827', mu: '#4A5163', r: 20, br: 12, hero: 'split', vis: 'mock', illu: 'kids', card: 'shadow', look: 'brandBold', sw2: '#EEF2FD', base: 'clean', hk: 'acad', hp: 'acad', ck: 'photo',
      sh: '0 1px 2px rgba(17,24,39,.05),0 18px 40px -24px rgba(17,24,39,.28)' },
    acresult: { name: '성과 보드', desc: '입시 · 관리형 학원 — 레벨 진단 → 반 배정 → 주간 관리 3단계와 실제 실적 · 시간표 · 학부모 리포트', tags: ['k12', 'adult'], tone: 'light', dens: '보통',
      acc: '#1E3A8A', bg: '#FFFFFF', alt: '#F3F5F9', ink: '#0F172A', mu: '#475069', r: 12, br: 10, hero: 'split', vis: 'mock', illu: 'kids', card: 'line', look: 'brandBold', sw2: '#E8EDF7', base: 'clean', hk: 'acad', hp: 'acad', ck: 'photo',
      sh: '0 1px 2px rgba(15,23,42,.06),0 16px 36px -26px rgba(15,23,42,.35)' },
    acstudio: { name: '클래스 스튜디오', desc: '예체능 · 원데이 · 성인 취미 — 수업 사진 3장 · 이번 달 체험 반 · 클래스 카드 · 수강생 로그인 · 결제', tags: ['k12', 'adult'], tone: 'light', dens: '여유',
      acc: '#B4471E', bg: '#FFFCF7', alt: '#F6EFE6', ink: '#1C1917', mu: '#57534E', r: 24, br: 999, hero: 'split', vis: 'mock', illu: 'kids', card: 'shadow', look: 'brandBold', sw2: '#FBEFE7', base: 'warm', hk: 'acad', hp: 'acad', ck: 'photo',
      sh: '0 1px 2px rgba(28,25,23,.05),0 18px 40px -26px rgba(28,25,23,.3)' }
  };
  const ey = (fs, ls, fw, tt) => ({ fs, ls, fw, tt });
  const HD = {
    acparent: { hf: 'sans', hw: 800, hls: -0.035, h1: 52, h1m: 32, lh1: 1.16, h2: 38, h2m: 27, h3: 19, body: 16, blh: 1.7, lead: 18, ey: ey(13, 0.06, 750, 'none'), sec: 104, secm: 64, w: 1200, gut: 40,
      r: 20, rs: 12, br: 12, bh: 50, bpx: 22, bfw: 700, bls: -0.01, bd: '0', sh: '0 1px 2px rgba(17,24,39,.05),0 14px 32px -20px rgba(17,24,39,.24)', shh: '0 22px 40px -20px rgba(17,24,39,.3)', hov: 'lift', em: 'accent', link: 'hover' },
    acresult: { hf: 'sans', hw: 800, hls: -0.04, h1: 56, h1m: 32, lh1: 1.12, h2: 36, h2m: 26, h3: 18, body: 16, blh: 1.7, lead: 18, ey: ey(13, 0.08, 800, 'none'), sec: 96, secm: 60, w: 1200, gut: 40,
      r: 12, rs: 8, br: 10, bh: 48, bpx: 20, bfw: 700, bls: -0.01, bd: '0', sh: '0 1px 2px rgba(15,23,42,.06),0 12px 28px -20px rgba(15,23,42,.3)', shh: '0 20px 36px -20px rgba(15,23,42,.35)', hov: 'lift', em: 'accent', link: 'hover' },
    acstudio: { hf: 'sans', hw: 800, hls: -0.035, h1: 54, h1m: 32, lh1: 1.15, h2: 38, h2m: 27, h3: 19, body: 16, blh: 1.72, lead: 18, ey: ey(13, 0.06, 750, 'none'), sec: 108, secm: 64, w: 1200, gut: 40,
      r: 24, rs: 14, br: 999, bh: 50, bpx: 22, bfw: 700, bls: -0.01, bd: '0', sh: '0 1px 2px rgba(28,25,23,.05),0 16px 34px -22px rgba(28,25,23,.28)', shh: '0 24px 44px -22px rgba(28,25,23,.32)', hov: 'lift', em: 'accent', link: 'hover' }
  };
  const MINE = Object.keys(DEF).filter(ON);
  if (!MINE.length) return;

  function cssX(s, th, T) { const x = XCSS[s && s.theme]; return cssA(s, th, T) + (x ? x(s, th, T) : ''); }
  /* 공통 색 계산(A2 2종) */
  const pal = (th, T) => { const R = ramp(T.a); const a = T.a, on = onC(a), ink = T.ink || th.ink, bg = th.bg || '#ffffff';
    return { R, a, on, ink, bg, p50: R[50], p100: R[100], at: fit(a, '#ffffff', 4.6, '#000000'), atB: fit(a, bg, 4.6, '#000000'), atA: fit(a, th.alt, 4.6, '#000000'), mu: fit(th.mu, '#ffffff', 4.6, '#000000'), muA: fit(th.mu, th.alt, 4.6, '#000000'), muB: fit(th.mu, bg, 4.6, '#000000'),
      ln: al(ink, .1), dk: fit(mix(a, '#0B1020', .78), '#ffffff', 10, '#000000'), warnT: fit(WARN, '#ffffff', 4.6, '#000000'), sh: th.sh || 'none' }; };
  const XCSS = {
    acresult: (s, th, T) => { const P = pal(th, T); const { a, on, ink, p50, p100, at, mu, ln, dk } = P; const lt = fit(mix(a, '#ffffff', .55), dk, 4.6, '#ffffff'); const muP = fit(th.mu, p50, 4.6, '#000000');
      return `
/* v43.8 acresult — 성과 보드 */
.hxa-b{border-radius:8px}.hxa-wd,.hxa-wd li a{border-radius:10px}.hxa-fl{border-radius:12px}.hxa-pay{border-radius:12px}.hxa-dp{border-radius:12px}.hxa-pr li{border-radius:10px}.hxa-ph{border-radius:16px}
.hxa-ey{letter-spacing:.08em;font-weight:800}
.hpt.hps-hero.hxa-ah.hxa-rs{background:${p50};padding:clamp(32px,4vw,56px) 0 clamp(40px,4vw,64px)}
.hxa-rsg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"t m" "d d";gap:clamp(28px,4vw,56px)}
.hxa-rst{grid-area:t;display:flex;flex-direction:column;justify-content:center;min-width:0}
.hxa-rs .hxa-pill{border-radius:8px}
.hpt.hxa-rs h1{font-size:clamp(36px,3.9vw,56px)!important;line-height:1.12!important;letter-spacing:-.045em}
.hxa-rs .hxa-sub{color:${muP}}
.hxa-rk{display:flex;margin:32px 0 0;padding:20px 0 0;border-top:2px solid ${ink}}.hxa-rk div{flex:1;min-width:0;padding-right:16px}.hxa-rk div+div{padding-left:20px;border-left:1px solid ${ln}}
.hxa-rk dt{font-size:13px;font-weight:700;color:${muP}}.hxa-rk dd{margin:6px 0 0;font-size:34px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:${ink};white-space:nowrap}.hxa-rk dd small{font-size:15px;font-weight:700;margin-left:2px}
.hxa-rsm{grid-area:m;position:relative;min-height:540px;min-width:0}
.hxa-rsp{position:absolute;top:0;bottom:0;right:0;left:22%;border-radius:16px;background:${p100}}
.hxa-stp{position:absolute;left:0;bottom:28px;width:66%;z-index:2;background:#fff;border-radius:14px;padding:18px 14px 6px;box-shadow:0 0 0 1px ${ln},0 30px 60px -28px rgba(15,23,42,.55);color:${ink}}
.hxa-stph{display:flex;align-items:baseline;justify-content:space-between;margin:0 6px 6px}.hxa-stph b{font-size:16px;font-weight:800}.hxa-stph small{font-size:13px;font-weight:800;color:${at}}
.hxa-stp ol{list-style:none;margin:0;padding:0}.hxa-stp li+li{border-top:1px solid ${ln}}
.hxa-stp a{display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;min-height:44px;padding:12px 6px;color:inherit;text-decoration:none;border-radius:10px}.hxa-stp a:hover{background:${p50}}
.hxa-stp .no{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:15px;font-weight:800;background:${p100};color:${fit(a, p100, 4.6, '#000000')}}.hxa-stp li:first-child .no{background:${a};color:${on}}
.hxa-stp .tx{display:flex;flex-direction:column;gap:2px;min-width:0}.hxa-stp .tx b{font-size:16px;font-weight:750}.hxa-stp .tx small{font-size:13px;line-height:1.45;color:${mu}}
.hxa-stp .tx em{display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-style:normal;font-size:14px;font-weight:700;color:${at}}.hxa-stp a:hover em svg{transform:translateX(3px)}.hxa-stp em svg{transition:transform .15s}
.hxa-drb{grid-area:d;margin:0;display:grid;grid-template-columns:200px minmax(0,1fr);background:${dk};color:#fff;border-radius:16px;padding:8px;box-shadow:0 24px 48px -30px rgba(15,23,42,.7)}
.hxa-drb .hxa-dq{margin:0;padding:18px 16px;display:flex;flex-direction:column;justify-content:center;gap:6px;font-size:20px;font-weight:800;letter-spacing:-.02em;line-height:1.3;color:#fff}.hxa-drb .hxa-dq small{font-size:14px;font-weight:600;color:rgba(255,255,255,.8)}
.hxa-drb ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.hxa-drb li{display:flex;flex-direction:column;justify-content:space-between;gap:14px;padding:18px;border-radius:12px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.hxa-drb li p{margin:0;display:flex;flex-direction:column;gap:3px}.hxa-drb li b{font-size:17px;font-weight:750}.hxa-drb li small{font-size:14px;line-height:1.45;color:rgba(255,255,255,.82)}
.hxa-drb li:first-child{background:#fff;color:${ink};box-shadow:none}.hxa-drb li:first-child small{color:${mu}}
.hxa-drb .hxa-da{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-start}
.hxa-drb li:not(:first-child) .hxa-b{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45)}.hxa-drb li:not(:first-child) .hxa-b:hover{box-shadow:inset 0 0 0 1.5px #fff;color:#fff}
.hxa-stp a:focus-visible,.hxa-drb a:focus-visible{outline:3px solid ${al(a, .5)};outline-offset:2px}
/* 성과 보드 첫 화면(짙은 바탕 + 넓은 판) */
.hpt.hps-hero.hxa-ah.hxa-sb{background:${dk};color:#fff;padding:clamp(36px,4.4vw,64px) 0 clamp(40px,4.4vw,64px)}
.hxa-sbg{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);grid-template-areas:"t p" "b b";gap:clamp(24px,3vw,40px) clamp(28px,4vw,56px)}
.hxa-sbt{grid-area:t;min-width:0;display:flex;flex-direction:column;justify-content:center}
.hxa-sb .hxa-pill{background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);color:#fff;border-radius:8px}
.hpt.hxa-sb h1{font-size:clamp(36px,3.8vw,54px)!important;line-height:1.14!important;letter-spacing:-.045em;color:#fff}
.hxa-sb .hxa-sub{color:rgba(255,255,255,.86)}
.hxa-sbp{grid-area:p;min-height:380px;border-radius:16px;background:${mix(dk, '#ffffff', .1)}}
.hxa-sbd{margin-top:26px}.hxa-sbd .hxa-dq{color:rgba(255,255,255,.86)}
.hxa-sbd ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.18)}
.hxa-sbd li{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.18)}
.hxa-sbd li p{margin:0;display:flex;flex-direction:column;gap:2px;min-width:0}.hxa-sbd li b{font-size:17px;font-weight:750}.hxa-sbd li small{font-size:14px;color:rgba(255,255,255,.8)}
.hxa-sbd .hxa-da{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.hxa-sbd .hxa-b{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45)}.hxa-sbd .hxa-b:hover{color:#fff;box-shadow:inset 0 0 0 1.5px #fff}
.hxa-sbd .hxa-b.p{background:#fff;color:${fit(a, '#ffffff', 4.8, '#000000')};box-shadow:none}
.hxa-board{grid-area:b;background:#fff;color:${ink};border-radius:16px;padding:20px 22px;box-shadow:0 30px 60px -30px rgba(0,0,0,.6)}
.hxa-board header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:2px solid ${ink}}
.hxa-board header p{margin:0;display:flex;flex-direction:column;gap:2px}.hxa-board header b{font-size:18px;font-weight:800}.hxa-board header small{font-size:13px;color:${mu}}
.hxa-board dl{margin:0;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr))}
.hxa-sbc{min-width:0}.hxa-sbc+.hxa-sbc{border-left:1px solid ${ln}}
.hxa-sbc>a,.hxa-sbc>div{display:flex;flex-direction:column;gap:4px;height:100%;min-height:44px;padding:18px 18px 6px;color:inherit;text-decoration:none;border-radius:10px}.hxa-sbc:first-child>a,.hxa-sbc:first-child>div{padding-left:0}.hxa-sbc>a:hover{background:${p50}}
.hxa-sbc dt{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:750;color:${mu}}.hxa-sbc dt em{font-style:normal;font-size:13px;font-weight:700;padding:1px 8px;border-radius:99px;background:${p50};color:${fit(a, p50, 4.6, '#000000')}}
.hxa-sbc dd{margin:0;font-size:clamp(30px,3vw,42px);font-weight:800;letter-spacing:-.035em;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}.hxa-sbc dd small{font-size:16px;font-weight:700;margin-left:2px;color:${mu}}
.hxa-sbc dd .up{display:inline-block;margin-left:10px;font-size:14px;font-weight:800;vertical-align:middle;color:${fit('#0E9F6E', '#ffffff', 4.6, '#000000')}}
.hxa-sbc p{margin:0;font-size:14px;color:${mu};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hxa-spk{display:block;height:46px;margin-top:4px;color:${at}}.hxa-spk svg{display:block;width:100%;height:100%}
/* 주간 리포트(예시) */
.hxa-rpg{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(32px,5vw,72px);align-items:center}
.hxa-rpc{background:#fff;border-radius:16px;padding:22px 24px;box-shadow:0 0 0 1px ${ln},${P.sh}}
.hxa-rpc header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.hxa-rpc header p{margin:0;display:flex;flex-direction:column;gap:2px}.hxa-rpc header b{font-size:17px;font-weight:800}.hxa-rpc header small{font-size:13px;color:${mu}}
.hxa-rpc header span{flex:none;font-size:13px;font-weight:700;padding:3px 10px;border-radius:99px;background:${th.alt};color:${P.muA}}
.hxa-rpn{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:16px 0 6px}.hxa-rpn p{margin:0}.hxa-rpn b{font-size:44px;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.hxa-rpn b small{font-size:18px;margin-left:2px}
.hxa-rpn em{display:block;font-style:normal;font-size:14px;font-weight:800;color:${fit('#0E9F6E', '#ffffff', 4.6, '#000000')}}.hxa-rpn .avg{display:flex;align-items:center;gap:8px;font-size:13px;color:${mu}}.hxa-rpn .avg i{width:18px;border-top:2px dashed ${at}}
.hxa-rpk{height:150px;color:${at}}.hxa-rpk svg{display:block;width:100%;height:100%}
.hxa-rpx{list-style:none;margin:6px 0 0;padding:0;display:flex;justify-content:space-between;font-size:13px;color:${mu};font-variant-numeric:tabular-nums}
.hxa-rpt{list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}.hxa-rpt li{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:10px;background:${th.alt}}.hxa-rpt small{font-size:13px;color:${P.muA}}.hxa-rpt b{font-size:15px;font-weight:750}
@media(max-width:1000px){.hxa-sbg{grid-template-columns:minmax(0,1fr);grid-template-areas:"t" "p" "b"}.hxa-sbp{min-height:300px}.hxa-rpg{grid-template-columns:minmax(0,1fr)}}
@media(max-width:640px){.hxa-sbg{grid-template-areas:"t" "b";gap:20px}.hxa-sbp{display:none}.hxa-sb .hxa-mph{display:block;height:140px;margin:16px 0 0;border-radius:14px}.hpt.hxa-sb h1{font-size:30px!important;line-height:1.24!important}
.hxa-sbd li{grid-template-columns:minmax(0,1fr)}.hxa-sbd .hxa-da{justify-content:stretch}.hxa-sbd .hxa-b{flex:1 1 0;min-width:0;padding:0 10px}
.hxa-board{padding:16px}.hxa-board header{flex-direction:column;align-items:stretch}.hxa-board header .hxa-b{width:100%}.hxa-board dl{grid-template-columns:repeat(2,minmax(0,1fr))}.hxa-sbc+.hxa-sbc{border-left:0}.hxa-sbc{border-top:1px solid ${ln}}.hxa-sbc:nth-child(even)>a,.hxa-sbc:nth-child(even)>div{padding-left:12px}.hxa-sbc>a,.hxa-sbc>div{padding:14px 8px 10px 0}.hxa-sbc dd{font-size:28px}.hxa-sbtr{grid-column:1/-1}
.hxa-rpc{padding:16px}.hxa-rpn b{font-size:36px}.hxa-rpk{height:120px}}
/* 실적 */
.hxa-pfl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));border-top:2px solid ${ink}}
.hxa-pfl li{padding:24px 20px 6px 0;display:flex;flex-direction:column;gap:6px;min-width:0}.hxa-pfl li+li{padding-left:20px;border-left:1px solid ${ln}}
.hxa-pfl b{font-size:clamp(24px,2.4vw,32px);font-weight:800;letter-spacing:-.03em;line-height:1.25;color:${ink}}.hxa-pfl small{font-size:14px;line-height:1.5;color:${mu}}
/* 관리 루틴(짙은 띠) */
.hpt.hxa-s.hxa-dk{background:${dk};color:#fff}.hxa-dk .hxa-ey{color:${lt}}.hxa-dk .hxa-sh h2{color:#fff}.hxa-dk .hxa-sd{color:rgba(255,255,255,.82)}
.hxa-cyg{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin:0 0 clamp(28px,3.4vw,44px)}.hxa-cyg .hxa-sh{margin:0}
.hxa-dk .hxa-b{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45)}.hxa-dk .hxa-b:hover{color:#fff;box-shadow:inset 0 0 0 1.5px #fff}
.hxa-dk .hxa-b.p{background:#fff;color:${fit(a, '#ffffff', 4.8, '#000000')};box-shadow:none}.hxa-dk .hxa-b.p:hover{background:${p50};color:${fit(a, p50, 4.8, '#000000')}}
.hxa-cyl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:16px}
.hxa-cyl li{position:relative;display:flex;flex-direction:column;gap:8px;padding:22px 20px 24px;border-radius:12px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.hxa-cyl li:not(:last-child)::after{content:'';position:absolute;top:34px;right:-15px;width:14px;height:2px;background:rgba(255,255,255,.4)}
.hxa-cyl .no{font-size:14px;font-weight:800;color:${lt};font-variant-numeric:tabular-nums}.hxa-cyl b{font-size:19px;font-weight:750;color:#fff}.hxa-cyl small{font-size:15px;line-height:1.55;color:rgba(255,255,255,.82)}
@media(max-width:1000px){.hxa-rsg{grid-template-columns:minmax(0,1fr);grid-template-areas:"t" "m" "d"}.hxa-rsm{min-height:480px}.hxa-drb{grid-template-columns:minmax(0,1fr)}.hxa-drb .hxa-dq{padding:12px 10px 8px}.hxa-cyl{grid-template-columns:repeat(2,minmax(0,1fr))}.hxa-cyl li::after{display:none}}
@media(max-width:640px){.hxa-rsg{grid-template-areas:"t" "d" "m";gap:24px}.hpt.hxa-rs h1{font-size:31px!important;line-height:1.22!important}
.hxa-rk{margin-top:22px;padding-top:14px}.hxa-rk div{padding-right:8px}.hxa-rk div+div{padding-left:12px}.hxa-rk dd{font-size:24px}.hxa-rk dd small{font-size:13px}
.hxa-rsm{min-height:0;display:flex;flex-direction:column}.hxa-rsp{position:relative;inset:auto;aspect-ratio:16/10}.hxa-stp{position:relative;left:auto;bottom:auto;width:auto;margin:-28px 10px 0}
.hxa-drb{padding:6px;border-radius:14px}.hxa-drb .hxa-dq{font-size:18px;padding:12px 10px 6px}.hxa-drb ul{grid-template-columns:minmax(0,1fr);gap:6px}.hxa-drb li{padding:14px;gap:12px}.hxa-drb .hxa-da .hxa-b{flex:1 1 0;min-width:0;padding:0 10px}
.hxa-pfl{grid-template-columns:minmax(0,1fr);border-top:0}.hxa-pfl li,.hxa-pfl li+li{padding:16px 0;border-left:0;border-top:1px solid ${ln}}.hxa-pfl li:first-child{border-top:2px solid ${ink}}.hxa-pfl b{font-size:24px}
.hxa-cyg{align-items:stretch;flex-direction:column}.hxa-cyg .hxa-btns .hxa-b{flex:1 1 100%}.hxa-cyl{grid-template-columns:minmax(0,1fr);gap:8px}.hxa-cyl li{padding:16px 18px}}`; },
    acstudio: (s, th, T) => { const P = pal(th, T); const { a, on, ink, bg, p50, p100, at, atB, mu, muB, ln, warnT, sh } = P; const onDir = on === '#FFFFFF' ? '#000000' : '#FFFFFF';
      return `
/* v43.8 acstudio — 클래스 스튜디오 */
.hxa-b{border-radius:999px}.hxa-fl{border-radius:28px}.hxa-wd{border-radius:22px}.hxa-wd li a{border-radius:16px}.hxa-pay{border-radius:24px}.hxa-dp{border-radius:32px}.hxa-pr li{border-radius:20px}
.hpt.hps-hero.hxa-ah.hxa-st{background:${bg};padding:clamp(28px,3.4vw,48px) 0 clamp(48px,5vw,80px)}
.hxa-stg{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:clamp(28px,4vw,56px);align-items:stretch}
.hxa-stt{display:flex;flex-direction:column;justify-content:center;min-width:0}
.hxa-st .hxa-pill{background:${p50};box-shadow:none;color:${fit(a, p50, 4.6, '#000000')}}
.hpt.hxa-st h1{font-size:clamp(34px,3.7vw,54px)!important;line-height:1.15!important;letter-spacing:-.04em}
.hxa-st .hxa-sub{color:${muB}}.hxa-drs .hxa-dq{color:${muB}}
.hxa-drs{margin-top:clamp(24px,3vw,32px)}
.hxa-s1{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px 16px;padding:18px 18px 18px 24px;border-radius:24px;background:${a};color:${on};box-shadow:0 18px 36px -22px ${al(a, .9)}}
.hxa-s1 p{margin:0;display:flex;flex-direction:column;gap:2px;min-width:0}.hxa-s1 small{font-size:14px;font-weight:700}.hxa-s1 b{font-size:19px;font-weight:800;letter-spacing:-.02em}
.hxa-s1 .hxa-da{display:flex;gap:8px;flex-wrap:wrap}
.hxa-s1 .hxa-b{background:transparent;color:${on};box-shadow:inset 0 0 0 1.5px ${al(on, .55)}}.hxa-s1 .hxa-b:hover{color:${on};box-shadow:inset 0 0 0 1.5px ${on}}
.hxa-s1 .hxa-b.p{background:${on};color:${fit(a, on, 4.6, onDir)};box-shadow:none}.hxa-s1 .hxa-b.p:hover{background:${on};color:${fit(a, on, 4.6, onDir)}}
.hxa-drs ul{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hxa-drs li{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:22px;background:#fff;box-shadow:0 0 0 1px ${ln}}
.hxa-drs .hxa-di{width:40px;height:40px;border-radius:12px}.hxa-drs li p{margin:0;display:flex;flex-direction:column;gap:2px}.hxa-drs li b{font-size:16px;font-weight:750}.hxa-drs li small{font-size:13px;line-height:1.45;color:${mu}}
.hxa-drs li .hxa-da{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-start;margin-top:auto}.hxa-drs li .hxa-b{flex:1 1 auto;padding:0 14px}
.hxa-stm{position:relative;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:12px;min-height:600px;min-width:0}
.hxa-stm .hxa-img{background:${p100}}.hxa-tile{display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:22px;color:${fit(a, p100, 4.6, '#000000')}}.hxa-tile span{display:flex;flex-direction:column}.hxa-tile b{font-size:clamp(26px,2.6vw,40px);font-weight:800;letter-spacing:-.02em;line-height:1.1}.hxa-tile small{font-size:17px;font-weight:700;font-variant-numeric:tabular-nums}.hxa-tile em{font-style:normal;font-size:15px;font-weight:700;color:${ink}}.hxa-mstrip{display:none}.hxa-m1{grid-row:1/3;border-radius:30px}.hxa-m2,.hxa-m3{border-radius:24px}
.hxa-trial{position:absolute;left:16px;bottom:16px;width:min(330px,56%);z-index:2}
.hxa-trial a{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-height:44px;padding:16px 18px 14px;border-radius:22px;background:#fff;color:${ink};text-decoration:none;box-shadow:0 24px 48px -20px rgba(28,25,23,.6)}
.hxa-trk{font-size:13px;font-weight:800;padding:4px 10px;border-radius:99px;background:${a};color:${on};margin-bottom:4px}
.hxa-trial b{font-size:17px;font-weight:750;line-height:1.35}.hxa-trial small{font-size:14px;color:${mu}}.hxa-trial em{display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-style:normal;font-size:14px;font-weight:700;color:${at}}
.hxa-trial a:hover em svg{transform:translateX(3px)}.hxa-trial em svg{transition:transform .15s}
.hxa-trial a:focus-visible,.hxa-clc:focus-visible,.hxa-drs a:focus-visible{outline:3px solid ${al(a, .5)};outline-offset:3px}
/* 클래스 카드 */
.hxa-cll{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.hxa-clc{display:flex;flex-direction:column;height:100%;border-radius:24px;overflow:hidden;background:#fff;color:${ink};text-decoration:none;box-shadow:0 0 0 1px ${ln},${sh};transition:transform .18s,box-shadow .18s}
.hxa-clc:hover{transform:translateY(-3px);box-shadow:0 0 0 1px ${al(a, .4)},0 26px 44px -26px rgba(28,25,23,.45)}.hxa-cll li.is-free .hxa-clc{box-shadow:0 0 0 2px ${a},${sh}}
.hxa-clp{position:relative;display:block;aspect-ratio:4/3;background:${p100};overflow:hidden}.hxa-clp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;max-height:none;border-radius:0}
.hxa-clx{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:20px;background:${p100};color:${fit(a, p100, 4.6, '#000000')}}.hxa-clx b{font-size:30px;font-weight:800;letter-spacing:-.02em}.hxa-clx small{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}
.hxa-clb{position:absolute;left:14px;top:14px;font-style:normal;font-size:13px;font-weight:800;padding:6px 12px;border-radius:99px;background:#fff;color:${at};box-shadow:0 6px 14px -8px rgba(0,0,0,.4)}
.hxa-clt{display:flex;flex-direction:column;gap:8px;padding:18px 20px 18px;flex:1;min-width:0}
.hxa-clm{font-size:13px;font-weight:750;color:${at};font-variant-numeric:tabular-nums}.hxa-cln{font-size:19px;font-weight:750;letter-spacing:-.02em;line-height:1.35}
.hxa-clt .hxa-bar{margin-top:4px}.hxa-cls{font-size:13px;color:${mu}}.hxa-cls.hot{color:${warnT}}
.hxa-clpr{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;padding-top:14px;border-top:1px solid ${ln}}
.hxa-clpr b{font-size:20px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.hxa-clpr b small{font-size:14px;margin-left:1px}.hxa-clpr span{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:${at}}
@media(max-width:1000px){.hxa-stg{grid-template-columns:minmax(0,1fr)}.hxa-stm{min-height:480px}.hxa-cll{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.hpt.hxa-st h1{font-size:31px!important;line-height:1.22!important}.hxa-mstrip{display:grid;grid-template-columns:1.4fr 1fr;gap:8px;height:132px;margin:16px 0 0}.hxa-ms{border-radius:16px;background:${p100}}.hxa-ms.hxa-tile{padding:12px}.hxa-ms.hxa-tile b{font-size:22px}.hxa-ms.hxa-tile em{display:none}
.hxa-s1{flex-direction:column;align-items:stretch;padding:16px 16px 16px 18px}.hxa-s1 .hxa-da .hxa-b{flex:1 1 0;min-width:0;padding:0 10px}
.hxa-drs ul{grid-template-columns:minmax(0,1fr);gap:8px}.hxa-drs li{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:10px 12px;padding:14px}.hxa-drs li .hxa-da{grid-column:1/-1}.hxa-drs li .hxa-b{flex:1 1 0;min-width:0;padding:0 10px}
.hxa-stm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto;min-height:0;gap:8px}.hxa-m1{grid-row:auto;grid-column:1/-1;aspect-ratio:16/10;border-radius:22px}.hxa-m2,.hxa-m3{aspect-ratio:4/3;border-radius:18px}
.hxa-trial{position:static;grid-column:1/-1;width:auto}.hxa-trial a{box-shadow:0 0 0 1px ${ln}}
.hxa-cll{grid-template-columns:minmax(0,1fr);gap:12px}.hxa-clc{flex-direction:row;border-radius:20px}.hxa-clp{flex:none;width:112px;aspect-ratio:auto}.hxa-clx{padding:12px}.hxa-clx b{font-size:18px}.hxa-clx small{font-size:14px}.hxa-clb{left:8px;top:8px;padding:4px 8px}
.hxa-clt{padding:14px 16px;gap:6px}.hxa-cln{font-size:17px}.hxa-clpr{padding-top:10px}.hxa-clpr b{font-size:18px}}`; }
  };
  function cssA(s, th, T) { const R = ramp(T.a); const a = T.a, on = onC(a); const ink = T.ink || th.ink;
    const at = fit(a, '#ffffff', 4.6, '#000000'), atA = fit(a, th.alt, 4.6, '#000000'); const mu = fit(th.mu, th.alt, 4.6, '#000000');
    const p50 = R[50], p100 = R[100]; const tint = [p50, mix(a, '#ffffff', .9), mix('#E8553D', '#ffffff', .92), mix('#0E9F6E', '#ffffff', .9)];
    const tintT = tint.map(b => fit(a, b, 4.6, '#000000')); const warnT = fit(WARN, '#ffffff', 4.6, '#000000'); const ln = al(ink, .09); const sh = th.sh || 'none';
    const dk = fit(mix(a, '#0B1020', .78), '#ffffff', 10, '#000000'); /* 휴대폰 판 · 짙은 블록 */
    const pillT = fit(a, p50, 4.6, '#000000');
    return `
/* v43.8 hpx-acad(${s.theme}) */
.hpt{--p50:${p50};--p100:${p100};--p700:${R[700]};--warn:${WARN};--hx-ln:${ln}}
.hxa-w{max-width:1200px;margin:0 auto;padding:0 40px;position:relative}
.hpt.hxa-s{padding:clamp(64px,8vw,104px) 0;background:var(--bg);color:${ink}}.hpt.hxa-s.hxa-alt{background:${th.alt}}
.hxa-sh{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin:0 0 clamp(28px,3.4vw,44px)}.hxa-sh>div{max-width:720px}
.hxa-ey{margin:0 0 12px;font-size:13px;font-weight:750;letter-spacing:.06em;color:${at}}.hxa-alt .hxa-ey{color:${atA}}
.hxa-sh h2{margin:0;font-size:clamp(27px,2.7vw,38px);line-height:1.22;letter-spacing:-.03em;font-weight:800;text-wrap:balance}
.hxa-sd{margin:12px 0 0;font-size:17px;line-height:1.65;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hxa-alt .hxa-sd{color:${mu}}
.hxa-hint{margin:0;padding:24px;border:1.5px dashed ${al(a, .4)};border-radius:16px;color:${th.mu};font-size:15px}
.hxa-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 18px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:-.01em;text-decoration:none;white-space:nowrap;background:#fff;color:${ink};box-shadow:inset 0 0 0 1.5px ${al(ink, .16)};transition:transform .15s,box-shadow .15s,background .15s}
.hxa-b:hover{box-shadow:inset 0 0 0 1.5px ${al(a, .6)};color:${at}}.hxa-b svg{transition:transform .15s}.hxa-b:hover svg{transform:translateX(3px)}
.hxa-b.p{background:${a};color:${on};box-shadow:0 8px 18px -10px ${al(a, .8)}}.hxa-b.p:hover{background:${R[600] || mix(a, '#000000', .14)};color:${onC(R[600] || mix(a, '#000000', .14))}}
.hxa-b:focus-visible,.hxa-tt a:focus-visible,.hxa-wd a:focus-visible{outline:3px solid ${al(a, .45)};outline-offset:2px}
/* 첫 화면 */
.hpt.hps-hero.hxa-ah{padding:clamp(28px,3.6vw,48px) 0 clamp(48px,5vw,72px);background:linear-gradient(180deg,${p50} 0%,#ffffff 78%);color:${ink};overflow:hidden}
.hxa-ahg{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:clamp(28px,4vw,56px);align-items:stretch}
.hxa-aht{display:flex;flex-direction:column;justify-content:center;padding:clamp(4px,1vw,16px) 0}
.hxa-pill{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;margin:0 0 18px;padding:7px 14px 7px 12px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px ${al(a, .18)};font-size:14px;font-weight:700;color:${pillT}}
.hxa-pill i{width:8px;height:8px;border-radius:50%;background:${WARN};box-shadow:0 0 0 4px ${al(WARN, .16)}}
.hpt.hxa-ah h1{margin:0;font-size:clamp(34px,3.5vw,50px)!important;line-height:1.17!important;letter-spacing:-.04em;font-weight:800;color:${ink};text-wrap:balance}
.hxa-sub{margin:16px 0 0;max-width:560px;font-size:18px;line-height:1.65;color:${fit(th.mu, p50, 4.6, '#000000')}}
.hxa-dr{margin-top:clamp(24px,3vw,36px)}.hxa-dq{margin:0 0 12px;font-size:14px;font-weight:750;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hxa-dr ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.hxa-d{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:16px;padding:14px 14px 14px 16px;border-radius:18px;background:#fff;box-shadow:0 0 0 1px ${ln},0 10px 24px -20px rgba(17,24,39,.4)}
.hxa-d.is-1{box-shadow:0 0 0 2px ${a},0 16px 32px -20px ${al(a, .7)}}
.hxa-di{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:${p50};color:${fit(a, p50, 4.6, '#000000')}}.hxa-d.is-1 .hxa-di{background:${a};color:${on}}
.hxa-dt{min-width:0;display:flex;flex-direction:column;gap:2px}.hxa-dt b{font-size:17px;font-weight:750;letter-spacing:-.02em}.hxa-dt small{font-size:14px;line-height:1.45;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hxa-da{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.hxa-ahm{position:relative;min-height:520px;border-radius:28px;overflow:hidden;background:${p100};isolation:isolate}
.hxa-img{margin:0;position:relative;overflow:hidden}.hxa-img>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;max-height:none;border-radius:0}
.hxa-ahp{position:absolute;inset:0;z-index:0}.hxa-ahm::after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(9,12,20,0) 40%,rgba(9,12,20,.35) 100%);pointer-events:none}
.hxa-tt{position:absolute;left:20px;right:20px;bottom:20px;z-index:2;background:#fff;border-radius:20px;padding:18px 18px 8px;box-shadow:0 24px 48px -20px rgba(9,12,20,.5);color:${ink}}
.hxa-tth{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 4px 6px}.hxa-tth b{font-size:16px;font-weight:800}.hxa-tth a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:14px;font-weight:700;color:${at};text-decoration:none}
.hxa-tt ul{list-style:none;margin:0;padding:0}.hxa-tt li+li{border-top:1px solid ${ln}}
.hxa-tt li a{display:grid;grid-template-columns:76px minmax(0,1fr) 20px;align-items:center;gap:14px;min-height:60px;padding:8px 4px;color:inherit;text-decoration:none}.hxa-tt li a>svg{color:${at}}
.hxa-ttd{display:flex;flex-direction:column;align-items:center;justify-content:center;height:48px;border-radius:12px;background:${p50};font-size:15px;font-weight:800;color:${fit(a, p50, 4.6, '#000000')}}.hxa-ttd small{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:${fit(th.mu, p50, 4.6, '#000000')}}
.hxa-ttn{min-width:0;display:flex;flex-direction:column;gap:2px}.hxa-ttn b{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hxa-ttn small{font-size:13px;font-weight:650;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hxa-ttn small.hot{color:${warnT}}
/* 시간표 */
.hxa-wg{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:12px;align-items:stretch}
.hxa-wd{background:${th.alt};border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:200px}.hxa-wd.empty{background:repeating-linear-gradient(135deg,${th.alt} 0 10px,#fff 10px 20px)}
.hxa-wdh{margin:0;display:flex;align-items:baseline;justify-content:space-between;padding:4px 6px}.hxa-wdh b{font-size:18px;font-weight:800}.hxa-wdh small{font-size:13px;color:${mu}}
.hxa-wd ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.hxa-wd li a{display:flex;flex-direction:column;gap:4px;min-height:44px;padding:12px 12px 12px 14px;border-radius:14px;background:#fff;color:${ink};text-decoration:none;box-shadow:inset 3px 0 0 ${a},0 1px 2px rgba(17,24,39,.06);transition:transform .15s,box-shadow .15s}
.hxa-wd li a:hover{transform:translateY(-2px);box-shadow:inset 3px 0 0 ${a},0 12px 24px -16px rgba(17,24,39,.35)}
${tint.map((b, i) => `.hxa-wd li.t${i} a{background:${b};box-shadow:inset 3px 0 0 ${[a, mix(a, '#000000', .25), WARN, '#0E9F6E'][i]}}.hxa-wd li.t${i} time{color:${tintT[i]}}`).join('')}
.hxa-wd time{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}.hxa-wd li b{font-size:15px;font-weight:700;line-height:1.35}.hxa-wd li small{font-size:13px;font-weight:650;color:${fit(th.mu, p50, 4.6, '#000000')}}.hxa-wd li small.hot{color:${fit(WARN, tint[2], 4.6, '#000000')}}
.hxa-fn{display:flex;align-items:center;gap:10px;margin:20px 0 0;font-size:14px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hxa-fn svg{flex:none;color:${at}}
/* 수강료 */
.hxa-fl{list-style:none;margin:0;padding:0;background:#fff;border-radius:22px;box-shadow:0 0 0 1px ${ln},${sh}}
.hxa-fl li{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 150px auto;align-items:center;gap:24px;padding:20px 24px}.hxa-fl li+li{border-top:1px solid ${ln}}
.hxa-fn1{min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:44px;color:inherit;text-decoration:none}.hxa-fn1:hover b{color:${at}}.hxa-fn1 b{font-size:17px;font-weight:750}.hxa-fn1 small,.hxa-fcap small,.hxa-fpr small{font-size:13px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hxa-mph{display:none}.hxa-fcap{display:flex;flex-direction:column;gap:8px}.hxa-new{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;background:${p50};font-size:13px;font-weight:750;color:${fit(a, p50, 4.6, '#000000')}}.hxa-new i{width:6px;height:6px;border-radius:50%;background:${a}}.hxa-bar{display:block;height:8px;border-radius:99px;background:${p100};overflow:hidden}.hxa-bar i{display:block;height:100%;border-radius:inherit;background:${a}}
.hxa-fpr{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.hxa-fpr b{font-size:20px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.hxa-fpr b span{font-size:15px;margin-left:1px}
.hxa-pay{display:flex;align-items:center;gap:18px;margin-top:16px;padding:18px 22px;border-radius:18px;background:${dk};color:#fff}.hxa-pay>i{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.12)}
.hxa-pay p{flex:1;margin:0;display:flex;flex-direction:column;gap:2px}.hxa-pay b{font-size:16px}.hxa-pay small{font-size:14px;color:rgba(255,255,255,.86)}.hxa-pay .hxa-b{background:#fff;color:${fit(a, '#ffffff', 4.8, '#000000')};box-shadow:none}
/* 알림 */
.hxa-alg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr);gap:clamp(32px,6vw,88px);align-items:center}
.hxa-alf{list-style:none;margin:0 0 28px;padding:0;display:flex;flex-direction:column;gap:18px}.hxa-alf li{display:flex;gap:16px;align-items:flex-start}
.hxa-alf i{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:${p50};color:${fit(a, p50, 4.6, '#000000')}}.hxa-alf p{margin:0;display:flex;flex-direction:column;gap:3px;padding-top:2px}.hxa-alf b{font-size:17px;font-weight:750}.hxa-alf small{font-size:15px;line-height:1.55;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hxa-btns{display:flex;gap:10px;flex-wrap:wrap}
.hxa-ph{position:relative;padding:28px;border-radius:32px;background:radial-gradient(120% 90% at 80% 0%,${mix(a, dk, .35)} 0%,${dk} 62%)}
.hxa-phf{max-width:360px;margin:0 auto;background:#fff;border-radius:30px;padding:18px 16px 16px;box-shadow:0 0 0 8px rgba(255,255,255,.08),0 30px 60px -24px rgba(0,0,0,.6);color:${ink}}
.hxa-phh{display:flex;align-items:center;justify-content:space-between;margin:2px 4px 12px}.hxa-phh b{font-size:15px;font-weight:800}.hxa-phh span{font-size:13px;font-weight:700;padding:3px 10px;border-radius:99px;background:${th.alt};color:${mu}}
.hxa-phf ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.hxa-phf li{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border-radius:16px;background:${th.alt}}
.hxa-phf li i{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:${a};color:${on}}.hxa-phf li.n-ex i{background:#0E9F6E;color:${onC('#0E9F6E')}}.hxa-phf li.n-bill i{background:${dk};color:#fff}
.hxa-phf li p{margin:0;min-width:0;display:flex;flex-direction:column;gap:1px}.hxa-phf li b{font-size:14px;font-weight:750}.hxa-phf li small{font-size:13px;color:${mu}}.hxa-phf time{font-size:13px;color:${mu};align-self:start}
/* 원장 */
.hxa-dg{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(32px,5vw,72px);align-items:center}
.hxa-dp{aspect-ratio:4/5;border-radius:28px;box-shadow:${sh}}
.hxa-dt2 .hxa-sh{margin-bottom:18px}.hxa-db{margin:0;font-size:17px;line-height:1.75;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hxa-sig{display:flex;align-items:center;gap:12px;margin:22px 0 0}.hxa-sig i{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:18px;background:${a};color:${on}}.hxa-sig span{display:flex;flex-direction:column}.hxa-sig b{font-size:16px}.hxa-sig small{font-size:13px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hxa-pr{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.hxa-pr li{padding:18px;border-radius:18px;background:${th.alt};display:flex;flex-direction:column;gap:10px}
.hxa-pr span{font-size:14px;font-weight:800;color:${atA};font-variant-numeric:tabular-nums}.hxa-pr p{margin:0;display:flex;flex-direction:column;gap:4px}.hxa-pr b{font-size:16px;font-weight:750}.hxa-pr small{font-size:14px;line-height:1.5;color:${mu}}
.hxa-fx{display:flex;margin:24px 0 0;padding:20px 0 0;border-top:1px solid ${ln}}.hxa-fx div{flex:1;padding:0 18px}.hxa-fx div+div{border-left:1px solid ${ln}}.hxa-fx div:first-child{padding-left:0}
.hxa-fx dt{font-size:13px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}.hxa-fx dd{margin:4px 0 0;font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.hxa-fx dd small{font-size:15px;font-weight:700;margin-left:2px}
@media(max-width:1000px){.hxa-ahg,.hxa-alg,.hxa-dg{grid-template-columns:minmax(0,1fr)}.hxa-ahm{min-height:460px}.hxa-wg{grid-template-columns:repeat(3,minmax(0,1fr))}.hxa-fl li{grid-template-columns:minmax(0,1fr) 140px auto}.hxa-fcap{grid-column:1/-1;order:3}}
@media(max-width:640px){.hxa-w{padding:0 20px}.hpt.hps-hero.hxa-ah{padding-top:20px}.hpt.hxa-ah h1{font-size:30px!important;line-height:1.24!important}.hxa-sub{font-size:16px}
.hxa-d{grid-template-columns:44px minmax(0,1fr);gap:12px;padding:14px}.hxa-di{width:44px;height:44px}.hxa-da{grid-column:1/-1;justify-content:stretch}.hxa-da .hxa-b{flex:1 1 0;min-width:0;padding:0 10px}
.hxa-ahm{min-height:0;display:flex;flex-direction:column;border-radius:22px;background:#fff;box-shadow:0 0 0 1px ${ln}}.hxa-ahp{position:relative;inset:auto;aspect-ratio:16/10}.hxa-pa .hxa-ahp{display:none}.hxa-pa .hxa-mph{display:block;height:152px;margin:18px 0 0;border-radius:18px}.hxa-ahm::after{display:none}.hxa-tt{position:static;box-shadow:none;border-radius:0;padding:12px 14px 4px}
.hxa-tt li a{grid-template-columns:64px minmax(0,1fr) 18px;gap:12px}
.hxa-wg{display:flex;flex-direction:column;gap:8px}.hxa-wd{min-height:0;display:grid;grid-template-columns:44px minmax(0,1fr);align-items:start;gap:8px;padding:10px}.hxa-wd ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.hxa-wd li a{padding:10px 10px 10px 12px;gap:2px}.hxa-wd li b{font-size:14px}.hxa-wd li small{display:none}.hxa-wd.empty{display:none}.hxa-wdh{flex-direction:column;align-items:flex-start;gap:0;padding:8px 2px}
.hxa-fl li{grid-template-columns:minmax(0,1fr) auto;gap:12px 16px;padding:18px}.hxa-fcap{grid-column:1/-1;order:2}.hxa-fl li>.hxa-b{display:none}.hxa-fl li.is-free>.hxa-b{display:inline-flex;grid-column:1/-1;order:3;width:100%}.hxa-fl li{padding:14px 18px}.hxa-fpr{align-items:flex-end}
.hxa-pay{flex-direction:column;align-items:stretch;text-align:left}.hxa-pay>i{display:none}.hxa-pay .hxa-b{width:100%}
.hxa-ph{padding:18px;border-radius:24px}.hxa-btns .hxa-b{flex:1 1 100%}
.hxa-pr{grid-template-columns:minmax(0,1fr);gap:8px}.hxa-pr li{flex-direction:row;align-items:flex-start;gap:14px;padding:14px 16px}.hxa-pr li>span{flex:none;line-height:1.5}.hxa-fx div{padding:0 10px}.hxa-fx dd{font-size:24px}.hxa-dp{aspect-ratio:4/3}.hxa-sh h2{font-size:27px}}
@media(prefers-reduced-motion:reduce){.hxa-b,.hxa-b svg,.hxa-wd li a{transition:none}}`; }

  /* ── 등록: 테마 · 디렉터 토큰 ── */
  MINE.forEach(id => { HPT.reg(id, Object.assign({ prem: 1, cssX }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpx-acad HPD', e); } });
  const mine = s => { try { return !!(s && s.theme && MINE.includes(s.theme)); } catch (e) { return false; } };
  /* 추천 순서 · 유형 맞춤(갤러리 「추천」 · 마법사) */
  if (typeof HPT.premFits === 'function') { const f0 = HPT.premFits; HPT.premFits = (id, t2) => { if (DEF[id] && MINE.includes(id)) { const k = t2 || ty(); return DEF[id].tags.includes(k); } return f0(id, t2); }; }
  if (typeof HPT.premFor === 'function') { const p0 = HPT.premFor; HPT.premFor = t2 => { const L0 = p0(t2); const k = t2 || ty(); const fit1 = MINE.filter(id => DEF[id].tags.includes(k)); const rest = MINE.filter(id => !fit1.includes(id)); return [...fit1, ...L0.filter(x => !MINE.includes(x)), ...rest]; }; }
  /* 숫자 띠: 원장 소개(ac-dir)가 실제 숫자를 함께 보여 주므로 따로 넣은 숫자 띠(hpt facts)는 뺀다 — 같은 숫자가 두 번 나오지 않게 */
  if (typeof HPT.enrich === 'function') { const e0 = HPT.enrich; HPT.enrich = s => { const r = e0(s); try { const Lx = s && s.sections; if (mine(s) && Array.isArray(Lx) && Lx.some(x => x && x.data && x.data.hpt === 'ac-dir')) for (let i = Lx.length - 1; i >= 0; i--) if (Lx[i] && Lx[i].type === 'text' && Lx[i].data && (Lx[i].data.hpt === 'facts' || Lx[i].data.variant === 'stats')) Lx.splice(i, 1); } catch (e) { console.error('hpx-acad enrich', e); } return r; }; }
  /* 첫 화면 */
  if (window.HPS && typeof HPS.hero === 'function') { const h0 = HPS.hero; HPS.hero = (kind, s, d, th, T) => { try { if (mine(s) && (!d || !d.hk)) return (HERO[s.theme] || heroAcad)(s, d); } catch (e) { console.error('hpx-acad hero', e); } return h0(kind, s, d, th, T); }; }
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
      photos: { k12: { hero: 'cam-07', about: 'stu-02', space: 'cls-03', cta: 'brd-01' }, adult: { hero: 'hum-14', about: 'grp-02', space: 'cls-03', cta: 'lap-03' } }, /* 첫 화면은 공부하는 학생 장면(L1 심사: 소품이 주인공 X) */
      build: () => { const k = kid(); return [
        S2('banner', { eyebrow: k ? '겨울 학기 원생 모집' : '이번 달 개강 반 모집', title: k ? '한 명 한 명의 진도를\n끝까지 챙겨요' : '실력에 맞는 반에서\n끝까지 완주해요', sub: k ? `${org()}은 체험 수업으로 시작하고, 수업이 끝나면 출결 · 숙제 · 성적을 학부모 앱으로 바로 알려 드려요.` : `${org()}은 레벨 상담으로 반을 정하고, 수업 · 과제 · 수료까지 내 계정에서 한 번에 챙겨요.`, cta: '상담 예약', cta2: '체험 수업' }),
        TX('features', { hpt: 'ac-week', eyebrow: 'TIMETABLE', title: '이번 주 시간표', sub: `요일과 시간을 보고 ${k ? '우리 아이에게' : '나에게'} 맞는 반을 골라 보세요.`, cols: AUTO }),
        TX('features', { hpt: 'ac-fee', eyebrow: 'TUITION', title: '반별 수강료 · 남은 자리', sub: '수강료와 정원을 미리 확인하고 상담 때 바로 등록할 수 있어요.', cols: AUTO }),
        TX('features', { hpt: 'ac-alert', eyebrow: k ? 'PARENT APP' : 'MY CLASS', title: k ? '학원에 다녀가면\n바로 알려 드려요' : '수업 · 과제 · 수료를\n놓치지 않게 알려 드려요', sub: '', cols: AUTO }),
        TX('features', { hpt: 'ac-dir', eyebrow: k ? 'DIRECTOR' : 'OUR PROMISE', title: k ? '성적보다 먼저\n공부하는 습관을 만듭니다' : '배운 것을\n일과 삶에 바로 쓰게 합니다', body: k ? '처음 상담에서 지금 실력과 목표를 함께 확인하고, 반 배정부터 시험 대비까지 담임이 끝까지 챙깁니다. 학부모님께는 수업마다 기록을 남겨 드립니다.' : '레벨 상담으로 출발점을 정하고, 실습 위주 수업과 과제 피드백으로 끝까지 완주하도록 돕습니다.',
          cols: k ? [['수업마다 기록', '출결 · 진도 · 숙제를 수업마다 남기고 보호자에게 알려요'], ['월 1회 상담', '성적 변화와 다음 달 계획을 함께 이야기해요'], ['결석하면 보강', '빠진 수업은 보강 일정을 잡아 드려요']] : [['레벨 상담', '첫 수업 전에 실력을 확인하고 반을 정해요'], ['과제 피드백', '제출한 과제에 강사가 직접 의견을 남겨요'], ['수료까지 관리', '남은 차시와 수료 기준을 계속 알려 드려요']] }),
        S2('reviews', { eyebrow: '', title: k ? '학부모 · 학생 이야기' : '수강생 이야기', note: '' }),
        S2('notices', { eyebrow: '', title: '학원 소식', n: 4 }),
        TX('cta', { eyebrow: '', title: k ? '체험 수업은\n상담 예약으로 시작해요' : '어떤 반이 맞을지\n상담으로 정해요', body: k ? '지금 실력과 목표를 듣고 맞는 반과 시간표를 안내해 드려요.' : '목표와 일정을 듣고 맞는 반과 시작일을 안내해 드려요.', cta: '상담 예약', cols: [] }),
        S2('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' })]; } },
    acresult: { noPal: 1, scene: '학원 · 입시 · 관리형 — 레벨 진단 → 반 배정 → 주간 관리 3단계와 실제 실적 · 시간표 · 학부모 리포트', purpose: ['apply', 'info'],
      photos: { k12: { hero: 'hum-13', about: 'dsk-07', space: 'cls-04', cta: 'brd-01' }, adult: { hero: 'grp-02', about: 'hum-14', space: 'cls-01', cta: 'hum-38' } },
      build: () => { const k = kid(); return [
        S2('banner', { eyebrow: k ? '2027 입시 · 내신 관리반 모집' : '자격증 · 시험 대비반 모집', title: k ? '오른 성적을\n숫자로 보여 드려요' : '합격까지의 과정을\n숫자로 보여 드려요', sub: k ? `${org()}은 레벨 진단으로 출발점을 정하고, 매주 테스트 · 클리닉 결과를 학부모님께 보내 드려요.` : `${org()}은 레벨 진단으로 반을 정하고, 모의고사 · 과제 피드백으로 시험 날까지 함께 가요.`, cta: '진단 상담 예약', cta2: '체험 수업' }),
        TX('features', { hpt: 'ac-proof', eyebrow: 'RESULTS', title: k ? '숫자로 확인하는 관리의 결과' : '수강생이 만든 결과', sub: '', cols: [] }),
        TX('features', { hpt: 'ac-report', eyebrow: k ? 'WEEKLY REPORT' : 'SCORE REPORT', title: k ? '매주 결과를\n리포트로 받아 보세요' : '점수 변화를\n리포트로 확인해요', sub: k ? '테스트가 끝나면 점수 · 오답 단원 · 다음 주 계획이 학부모 앱으로 가요.' : '모의고사가 끝나면 점수와 약한 영역을 내 계정에서 바로 확인해요.', cols: AUTO }),
        TX('features', { hpt: 'ac-cycle', eyebrow: k ? 'WEEKLY CARE' : 'EXAM CARE', title: k ? '한 주를 이렇게 관리해요' : '시험 날까지 이렇게 관리해요', sub: k ? '수업이 끝나면 결과가 학부모 앱으로 바로 가요.' : '단계마다 결과를 내 계정에서 바로 확인해요.',
          cols: k ? [['진도 수업', '교재 진도와 개념을 반 수준에 맞춰 설명해요'], ['클리닉', '오답과 질문을 담당 선생님과 1:1로 풀어요'], ['주간 테스트', '단원별 테스트 결과를 학부모 앱으로 보내요'], ['월말 상담', '성적 변화와 다음 달 계획을 함께 이야기해요']]
            : [['개념 · 이론', '시험 범위를 차시별로 나눠 빠짐없이 다뤄요'], ['문제 풀이', '기출 유형을 풀고 오답을 바로 짚어요'], ['모의고사', '실제 시험 시간에 맞춰 실력을 점검해요'], ['마무리 상담', '약한 부분과 남은 기간 계획을 함께 정해요']] }),
        TX('features', { hpt: 'ac-fee', eyebrow: 'TUITION', title: '반별 수강료 · 남은 자리', sub: '진단 상담 때 반을 정하면 바로 등록할 수 있어요.', cols: AUTO }),
        S2('reviews', { eyebrow: '', title: k ? '성적이 오른 학생 · 학부모 후기' : '합격한 수강생 후기', note: '' }),
        TX('features', { hpt: 'ac-dir', eyebrow: k ? 'DIRECTOR' : 'OUR PROMISE', title: k ? '점수보다 먼저\n공부하는 방법을 바꿉니다' : '시험 날까지\n같은 자리에서 돕습니다', body: k ? '진단 결과로 반을 정하고, 매주 테스트와 클리닉으로 약한 단원을 바로 메웁니다. 학부모님께는 결과와 다음 계획을 함께 알려 드립니다.' : '레벨 진단으로 출발점을 정하고, 모의고사와 과제 피드백으로 남은 기간을 함께 계획합니다.',
          cols: k ? [['진단으로 반 배정', '실력과 목표에 맞는 반에서 시작해요'], ['매주 결과 공유', '테스트 · 클리닉 결과를 학부모 앱으로 보내요'], ['결석하면 보강', '빠진 수업은 보강 일정을 잡아 드려요']] : [['레벨 진단', '첫 수업 전에 실력을 확인하고 반을 정해요'], ['오답 피드백', '틀린 문제에 강사가 직접 풀이를 남겨요'], ['시험 일정 관리', '접수 · 시험 일정을 미리 알려 드려요']] }),
        S2('notices', { eyebrow: '', title: '학원 소식', n: 4 }),
        TX('cta', { eyebrow: '', title: '진단 상담으로\n출발점을 정해요', body: k ? '지금 실력과 목표를 듣고 맞는 반과 관리 계획을 안내해 드려요.' : '목표 시험과 일정을 듣고 맞는 반과 시작일을 안내해 드려요.', cta: '진단 상담 예약', cols: [] }),
        S2('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' })]; } },
    acstudio: { noPal: 1, scene: '학원 · 예체능 · 원데이 · 성인 취미 — 수업 사진 · 이번 달 체험 반 · 클래스 카드에서 바로 체험 신청', purpose: ['apply', 'info'],
      photos: { k12: { about: 'stu-02', cta: 'cls-02' }, adult: { about: 'grp-02', cta: 'cls-02' } }, /* 첫 화면 사진은 stPh가 강좌 이름으로 고른다(예체능 고정 X) */
      build: () => { const k = kid(); return [
        S2('banner', { eyebrow: '이번 달 체험 수업', title: k ? '좋아하는 걸 찾는\n첫 수업을 열어 둘게요' : '퇴근 후 한 시간,\n손으로 배우는 클래스', sub: k ? `${org()}은 체험 수업으로 시작해요. 아이가 즐거워하면 그때 정규반을 정해도 늦지 않아요.` : `${org()}은 원데이 · 체험 수업으로 먼저 해 보고, 맞으면 정규반으로 이어 가요.`, cta: '상담 예약', cta2: '체험 수업' }),
        TX('features', { hpt: 'ac-cls', eyebrow: 'CLASSES', title: '지금 신청할 수 있는 클래스', sub: '무료 체험 반이 맨 앞에 있어요. 수강료 · 남은 자리까지 카드에서 확인하고 바로 신청해요.', cols: AUTO, pay: 1 }),
        TX('features', { hpt: 'ac-week', eyebrow: 'TIMETABLE', title: '이번 주 시간표', sub: '요일과 시간을 보고 일정에 맞는 반을 골라 보세요.', cols: AUTO }),
        TX('features', { hpt: 'ac-alert', eyebrow: k ? 'PARENT APP' : 'MY CLASS', title: k ? '수업이 끝나면\n오늘 한 것을 알려 드려요' : '수업 · 과제 · 수료를\n놓치지 않게 알려 드려요', sub: '', cols: AUTO }),
        S2('reviews', { eyebrow: '', title: k ? '학부모 · 학생 이야기' : '수강생 이야기', note: '' }),
        TX('features', { hpt: 'ac-dir', eyebrow: 'OUR STUDIO', title: k ? '잘하는 것보다\n즐기는 마음을 먼저 키워요' : '처음이어도\n끝까지 완성하게 돕습니다', body: k ? '아이마다 손이 빠른 곳과 느린 곳이 달라요. 소수 정원으로 한 명씩 보며, 작품과 연주를 기록으로 남겨 드립니다.' : '재료와 도구는 수업에서 준비하고, 처음 오신 분도 한 번에 완성할 수 있게 단계를 나눠 안내합니다.',
          cols: k ? [['체험 먼저', '맞는지 해 보고 정규반을 정해요'], ['소수 정원', '한 명씩 보면서 수업해요'], ['결석하면 보강', '빠진 수업은 다른 반에서 채워요']] : [['체험 먼저', '원데이로 해 보고 정규반을 정해요'], ['소수 정원', '강사가 한 명씩 봐 드려요'], ['일정 바꾸기', '사정이 생기면 다른 반으로 옮겨요']] }),
        S2('notices', { eyebrow: '', title: '스튜디오 소식', n: 4 }),
        S2('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' })]; } }
  };
  /* 템플릿 지정 사진(유형별) */
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpxac) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && /^prem-/.test(tp.id) ? tp.id.slice(5) : ''; const P = BUILD[id] && MINE.includes(id) ? BUILD[id].photos[kid() ? 'k12' : 'adult'] : null;
      if (P && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, P); s.img = s.img || {}; Object.keys(P).forEach(sl => { const v = HPSTOCK.slotImg(P[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hpx-acad photos', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hpxac = 1; siteFromTpl = f; window.siteFromTpl = f; }
  MINE.forEach(id => { if (TPL.some(x => x.id === 'prem-' + id)) return; const c = BUILD[id];
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: c.scene, color: DEF[id].acc, tone: DEF[id].r >= 20 ? '친근' : DEF[id].r <= 8 ? '신뢰' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, hpx: 'acad', build: c.build, ...(c.noPal ? { noPalette: true } : {}), get qaCls() { return c.qa ? c.qa[kid() ? 'k12' : 'adult'] : null; } }); });
  window.HPX = Object.assign(window.HPX || {}, { acad: { PASS, ids: MINE.slice(), all: Object.keys(DEF) } });
})();
