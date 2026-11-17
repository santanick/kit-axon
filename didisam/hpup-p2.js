/* v43.8 hpup-p2 — 프리미엄 템플릿 3종(briefboard 브리핑 보드 · todayfeed 오늘 피드 · stage 무대) 82점 끌어올리기
   대표님(2026-11-17): 「26종 모두 82점을 넘기라는 말」 — 기존 프리미엄도 모두 82점 이상. 속도 우선.
   기준선 감점(plan/tpl438 각 묶음 BASELINE.md): 기관 유형과 어긋난 문구(「오늘 할 일을 한 문장으로」 · 「오늘 배우고 내일 자라요」 · 「무대에 올라 보세요」),
   유형과 무관한 첫 화면 사진(소파 · 농구장), 첫 화면에 방문자 갈래 없음, 과정 비교 정보 약함, 13px 미만 글자 · 44px 미만 누르는 칸.
   고친 방향
   - 첫 화면: 테마마다 다른 구성 + 공통 「어떤 일로 오셨어요?」 3갈래(유형별 실제 경로: #shop · #class · #login/my · #login/family · #login/mypay · #cal · #notice · tel:).
     briefboard = 큰 사진 + 「가장 먼저 시작하는 반」 브리핑 카드(실제 강좌), todayfeed = 실제 데이터 피드(마감 D-day · 개강 · 공지 · 후기),
     stage = 어두운 전면 사진 + 이번 주 시간표 판(요일 · 시간 · 남은 자리).
   - 문구 · 사진: 기관 유형 7종(k12 · adult · univ · corp · public · lifelong · voc)별로 템플릿 기본 섹션과 지정 사진을 바꾼다(새로 고를 때만 — 게시된 사이트의 문구 · 섹션은 그대로).
   - 과정 비교 섹션(hu4-plan): 일정 · 기간 · 정원 · 남은 자리 · 수강료(기업 · 공공은 학습 시간)를 실제 공개 강좌로.
   - 관문: 공통 부품의 12px 태그 · 44px 미만 링크를 이 3종 테마의 cssX에서만 보정.
   hpth · hpprem · hpsec* 는 고치지 않는다 — 렌더 함수를 감싸고(HPS.hero · proSec · siteFromTpl), 테마 객체(HPT.meta)의 cssX를 이어 붙인다. 클래스 접두어 hu4-. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.meta !== 'function') return;
  const MINE = ['briefboard', 'todayfeed', 'stage'];
  if (MINE.some(id => !HPT.meta(id))) return;
  const U = HPT.U; const { mix, fit, al } = U;
  const ramp = HPT.ramp || (c => ({ 50: mix(c, '#ffffff', .94), 100: mix(c, '#ffffff', .86), 200: mix(c, '#ffffff', .7), 500: c, 700: mix(c, '#000000', .3), 900: mix(c, '#000000', .62) }));
  const onC = HPT.onColor || (c => U.CR(c, '#0B0F0D') >= U.CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF');
  const WARN = '#E8553D';
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const br = v => E(v).replace(/\n/g, '<br>');
  const isPh = v => /입력하세요|입력해 주세요|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const grp = () => { try { const t = S.org.type; return t === 'univ_lms' ? 'univ' : ['k12', 'adult', 'univ', 'corp', 'public', 'lifelong', 'voc'].includes(t) ? t : 'adult'; } catch (e) { return 'adult'; } };
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const term = k => (typeof t === 'function' ? t(k) : k === 'cls' ? '과정' : k);
  const W = v => (+v || 0).toLocaleString('ko-KR');
  const pubAll = () => { try { return (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료'); } catch (e) { return []; } };
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const DN = ['일', '월', '화', '수', '목', '금', '토'];
  const daysOf = c => (Array.isArray(c.days) ? c.days : []).map(Number).filter(d => d >= 0 && d <= 6);
  const timeOf = c => (c.time && /^\d{1,2}:\d{2}$/.test(c.time.from || '') ? c.time.from : '');
  const capOf = c => +((c.recruit && c.recruit.cap) || c.cap) || 0;
  const leftOf = c => { const cap = capOf(c); return cap ? Math.max(0, cap - ((c.learners || []).length)) : null; };
  const md = v => { const m = String(v || '').match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${+m[1]}.${+m[2]}` : ''; };
  const today = () => new Date().toISOString().slice(0, 10);
  const dday = v => { const a = Date.parse(String(v || '').slice(0, 10)), b = Date.parse(today()); return isNaN(a) ? null : Math.round((a - b) / 864e5); };
  const whenOf = c => [daysOf(c).map(x => DN[x]).join('·'), timeOf(c)].filter(Boolean).join(' ');
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  const mine = s => !!(s && MINE.includes(s.theme));
  const inHouse = () => ['corp', 'public'].includes(grp());
  const sportsFac = () => { try { return S.org.type === 'public' && S.fac && S.fac.tpl === 'sports' && (S.fac.facilities || []).some(f => f.on !== false); } catch (e) { return false; } };

  /* ── 링크: 학습자 사이트 실제 경로(#p-c-<id>는 게시 때 #class/<id>로 바뀐다) ── */
  const L = {
    shop: () => '#shop', c: c => '#p-c-' + c.id, my: () => '#login/my', family: () => '#login/family', pay: () => '#login/mypay', cal: () => '#cal', notice: () => '#notice', rv: () => '#comm/' + encodeURIComponent('수강후기'),
    ask: () => { const f = ft(); if (f.tel && !isPh(f.tel)) return telH(f.tel); if (f.email && /@/.test(f.email)) return 'mailto:' + f.email; return '#comm'; },
    trial: () => { const c = pub().find(x => !+x.price); return c ? L.c(c) : L.shop(); }
  };
  const conv = v => !v ? '' : v.startsWith('learn:') ? ({ home: '#home', shop: '#shop', textbooks: '#textbooks', comm: '#comm', notice: '#notice', fac: '#fac', my: '#login/my', courses: '#courses' }[v.slice(6)] || '#home') : v.startsWith('cls:') ? '#p-c-' + v.slice(4) : v.startsWith('page:') ? '#p-' + v.slice(5) : v.startsWith('url:') && /^https?:\/\//.test(v.slice(4)) ? v.slice(4) : '';
  const aT = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;

  /* ── 선 아이콘(24 그리드 · 굵기 1.75) ── */
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.5a4 4 0 010 7.5M22 21a7 7 0 00-4.5-6.5',
    book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7', bell: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0', card: 'M3 6h18v12H3zM3 10h18M7 15h4', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
    clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', check: 'M5 12.5l4.5 4.5L19 7.5', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', flag: 'M5 21V4h11l-2 4 2 4H5', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5', tool: 'M14 6a4 4 0 015 5l-9 9-4-4 9-9zM5 19l-1 1' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k] || IC.arrow}"/></svg>`;
  const fig = (s, slot, cls, eager, d) => { const p = window.HPS && HPS.photo ? HPS.photo(s, slot, d) : null; if (!p) return '';
    return `<figure class="hu4-img${cls ? ' ' + cls : ''}${slot === 'hero' ? ' hp-photo' : ''}" data-slot="${E(slot)}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 900px) 100vw, 56vw"` : ''} alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${E(p.pos)}"></figure>`; };

  /* ── 「어떤 일로 오셨어요?」 3갈래(유형별) ── */
  function doorList(d) { const g = grp(); const free = pub().some(c => !+c.price);
    const first = [[d.cta || '상담 신청', L.ask(), 1], free ? ['체험 수업', L.trial()] : [`${term('cls')} 보기`, L.shop()]];
    const T = {
      k12: [['users', '처음 오신 학부모', '레벨 상담 · 반 배정 · 체험 수업', first], ['bell', '재원생 학부모', '출결 · 숙제 알림과 수강료 결제', [['자녀 현황', L.family(), 1], ['수강료 결제', L.pay()]]], ['book', '학생', '오늘 수업 · 숙제 · 복습', [['내 수업 열기', L.my(), 1]]]],
      adult: [['search', '처음 오셨나요?', '반 일정 · 수강료 확인과 상담', [[`${term('cls')} 보기`, L.shop(), 1], [d.cta2 || '상담 신청', L.ask()]]], ['book', '수강생', '내 수업 이어 보기 · 과제 · 수료증', [['내 수업 열기', L.my(), 1]]], ['card', '결제 · 영수증', '수강료 결제와 영수증 · 환불 내역', [['결제 내역', L.pay(), 1]]]],
      univ: [['user', '재학생', '학번으로 로그인 · 내 강의실 · 과제', [['학번 로그인', L.my(), 1]]], ['search', '수강 신청', '이번 학기 강의 · 비교과 프로그램', [['강의 둘러보기', L.shop(), 1]]], ['cal', '학사 일정 · 공지', '신청 기간 · 휴강 · 공지 확인', [['일정 보기', L.cal(), 1], ['공지', L.notice()]]]],
      corp: [['user', '임직원', '사번으로 로그인 · 이어 듣기', [['로그인', L.my(), 1]]], ['flag', '필수 · 직무 과정', '이수 기한 · 학습 시간 확인', [['과정 목록', L.shop(), 1]]], ['cal', '교육 일정 · 공지', '집합 교육 일정 · 변경 안내', [['일정 보기', L.cal(), 1], ['공지', L.notice()]]]],
      public: [['user', '교육생', '로그인 · 이어 듣기 · 이수증', [['로그인', L.my(), 1]]], ['flag', '교육 과정', '법정 · 직무 과정과 학습 시간', [['과정 목록', L.shop(), 1]]], ['cal', '교육 일정 · 공지', '집합 교육 일정 · 변경 안내', [['일정 보기', L.cal(), 1], ['공지', L.notice()]]]],
      lifelong: [['search', '처음 오신 분', '이번 학기 강좌 · 수강료 확인', [['강좌 보기', L.shop(), 1], [d.cta2 || '전화 문의', L.ask()]]], ['book', '수강 중인 분', '내 강좌 · 출석 · 수료증', [['내 강좌 열기', L.my(), 1]]], ['cal', '강좌 일정 · 공지', '개강 · 휴강 · 접수 안내', [['일정 보기', L.cal(), 1], ['공지', L.notice()]]]],
      voc: [['search', '국비 · 내일배움카드 과정', '과정 비교 · 카드 사용 · 자부담 상담', [['과정 보기', L.shop(), 1], [d.cta2 || '상담 신청', L.ask()]]], ['tool', '훈련생', '출결 · 진도 · 과제 확인', [['내 훈련 열기', L.my(), 1]]], ['cal', '훈련 일정 · 공지', '개강 · 시험 · 휴강 안내', [['일정 보기', L.cal(), 1], ['공지', L.notice()]]]]
    };
    return T[g] || T.adult; }
  const doors = (d, cls) => { const D = doorList(d);
    return `<nav class="hu4-dr${cls ? ' ' + cls : ''}" aria-label="방문 목적별 바로가기"><p class="hu4-dq">어떤 일로 오셨어요?</p><ul>${D.map(([k, who, what, A], i) => `<li class="hu4-d${i === 0 ? ' is-1' : ''}"><i class="hu4-di">${ic(k, 22)}</i><div class="hu4-dt"><b>${E(who)}</b><small>${E(what)}</small></div><div class="hu4-da">${A.map(([l, h, p]) => `<a class="hu4-b${p ? ' p' : ''}" ${aT(h)}>${E(l)}${p ? ic('arrow', 18) : ''}</a>`).join('')}</div></li>`).join('')}</ul></nav>`; };
  const heroBtns = (d, dark) => { const p1 = conv(d.link) || (inHouse() || grp() === 'univ' ? L.my() : L.shop()); const p2 = conv(d.link2) || (inHouse() || grp() === 'univ' ? L.shop() : L.ask());
    return `<div class="hu4-btns">${d.cta ? `<a class="hu4-b p lg" ${aT(p1)}>${E(d.cta)}${ic('arrow', 18)}</a>` : ''}${d.cta2 ? `<a class="hu4-b g lg${dark ? ' dk' : ''}" ${aT(p2)}>${E(d.cta2)}</a>` : ''}</div>`; };
  const pill = d => { const n = pub().length; return d.eyebrow ? `<p class="hu4-pill"><i aria-hidden="true"></i>${E(d.eyebrow)}${n ? ` · ${n}개 ${E(term('cls'))} 모집 중` : ''}</p>` : ''; };
  const h1 = d => `<h1>${String(d.title || org()).split('\n').map(E).join('<br>')}</h1>`;
  const sub = d => d.sub ? `<p class="hu4-sub">${E(d.sub)}</p>` : '';
  const firstCls = () => { const C = pub(); const up = C.filter(c => c.start && c.start >= today()).sort((a, b) => a.start.localeCompare(b.start)); return up[0] || C[0] || null; };

  /* ── 첫 화면 3종 ── */
  const HERO = {
    /* 브리핑 보드: 왼쪽 한 문장 + 오른쪽 큰 사진 위 「가장 먼저 시작하는 반」 카드, 아래 3갈래 카드 */
    briefboard: (s, d) => { const c = firstCls(); const l = c ? leftOf(c) : null;
      const card = c ? `<a class="hu4-brief" ${aT(L.c(c))}><span class="hu4-bk">가장 먼저 시작하는 ${E(term('cls'))}</span><b>${E(c.name)}</b><span class="hu4-bm">${[c.start ? `${md(c.start)} 시작` : '', whenOf(c)].filter(Boolean).map(x => `<span>${E(x)}</span>`).join('')}${inHouse() ? (c.end ? `<span>이수 기한 ${md(c.end)}</span>` : '') : l != null ? `<span class="${l <= 3 ? 'hot' : ''}">남은 자리 ${l}석</span>` : ''}</span><i>${ic('arrow', 20)}</i></a>` : '';
      return `<section class="hpt hp-hero hps-hero hu4-h hu4-bb"><div class="hu4-w"><div class="hu4-bbg"><div class="hu4-bbt">${pill(d)}${h1(d)}${sub(d)}${heroBtns(d)}</div><div class="hu4-bbm">${fig(s, 'hero', 'hu4-bph', 1, d)}${card}</div></div>${doors(d, 'hu4-dr-bb')}</div></section>`; },
    /* 오늘 피드: 왼쪽 문구 + 3갈래 목록, 오른쪽 실제 데이터 피드(마감 · 개강 · 공지 · 후기) */
    todayfeed: (s, d) => { const C = pub(); const F = [];
      const due = C.filter(c => c.recruit && c.recruit.to && dday(c.recruit.to) != null && dday(c.recruit.to) >= 0).sort((a, b) => a.recruit.to.localeCompare(b.recruit.to))[0];
      if (due) { const n = dday(due.recruit.to); F.push(['flag', n === 0 ? '오늘 모집 마감' : `모집 마감 D-${n}`, due.name, L.c(due), 'warn']); }
      const st = C.filter(c => c.start && c.start >= today() && c !== due).sort((a, b) => a.start.localeCompare(b.start))[0];
      if (st) F.push(['cal', `${md(st.start)} 개강`, [st.name, whenOf(st)].filter(Boolean).join(' · '), L.c(st), '']);
      let N = []; try { N = (S.notices || []).filter(x => x && x.title).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || String(b.at || '').localeCompare(String(a.at || ''))); } catch (e) { }
      if (N[0]) F.push(['bell', `공지 · ${md(N[0].at) || '새 글'}`, N[0].title, L.notice(), '']);
      let R = []; try { R = (HPT.reviews && HPT.reviews()) || []; } catch (e) { }
      if (R.length) { const av = R.filter(r => r.st).reduce((a, r, _, A) => a + r.st / A.length, 0); F.push(['star', `수강 후기 ${R.length}건${av ? ` · 평균 ${av.toFixed(1)}점` : ''}`, String(R[0].b).slice(0, 34) + (String(R[0].b).length > 34 ? '…' : ''), L.rv(), '']); }
      const feed = F.length ? `<ul class="hu4-fl">${F.slice(0, 4).map(([k, a, b, h, w]) => `<li class="${w ? 'w' : ''}"><a ${aT(h)}><i>${ic(k, 20)}</i><span><small>${E(a)}</small><b>${E(b)}</b></span>${ic('arrow', 18)}</a></li>`).join('')}</ul>` : '';
      return `<section class="hpt hp-hero hps-hero hu4-h hu4-tf"><div class="hu4-w"><div class="hu4-tfg"><div class="hu4-tft">${pill(d)}${h1(d)}${sub(d)}${heroBtns(d)}</div><aside class="hu4-feed" aria-label="${E(org())} 오늘 소식">${fig(s, 'hero', 'hu4-fph', 1, d)}<p class="hu4-fh"><b>오늘의 소식</b><span>${E(md(today()))} 기준</span></p>${feed}</aside></div>${doors(d, 'hu4-dr-tf')}</div></section>`; },
    /* 무대: 어두운 전면 사진 + 이번 주 시간표 판 + 3갈래 타일 */
    stage: (s, d) => { const C = pub().filter(c => daysOf(c).length && timeOf(c)).slice(0, 4);
      const tt = C.length ? `<aside class="hu4-tt" aria-label="이번 주 시간표"><p class="hu4-tth"><b>이번 주 시간표</b><a ${aT(L.cal())}>전체 일정${ic('arrow', 16)}</a></p><ul>${C.map(c => { const l = leftOf(c); return `<li><a ${aT(L.c(c))}><span class="hu4-ttd">${E(daysOf(c).map(x => DN[x]).join('·'))}<small>${E(timeOf(c))}</small></span><span class="hu4-ttn"><b>${E(c.name)}</b>${l != null ? `<small class="${l <= 3 ? 'hot' : ''}">${l === 0 ? '대기 접수' : `남은 자리 ${l}석`}</small>` : ''}</span>${ic('arrow', 18)}</a></li>`; }).join('')}</ul></aside>` : '';
      return `<section class="hpt hp-hero hps-hero hu4-h hu4-st">${fig(s, 'hero', 'hu4-sph', 1, d)}<i class="hu4-scrim" aria-hidden="true"></i><div class="hu4-w"><div class="hu4-stg${tt ? '' : ' one'}"><div class="hu4-stt">${pill(d)}${h1(d)}${sub(d)}${heroBtns(d, 1)}</div>${tt}</div>${doors(d, 'hu4-dr-st')}</div></section>`; }
  };

  /* ── 과정 비교(hu4-plan): 실제 공개 강좌만 ── */
  const SECR = {
    'hu4-plan': (d) => { const C = pub().slice(0, 6); if (!C.length) return editing() ? `<section class="hpt hp-s hu4-s"><div class="hu4-w"><p class="hu4-hint">공개 강좌가 있으면 일정 · 정원 · 수강료 비교표가 자동으로 그려집니다.</p></div></section>` : '';
      const ih = inHouse();
      const row = c => { const cap = capOf(c), n = (c.learners || []).length, l = leftOf(c); const pct = cap ? Math.max(4, Math.min(100, Math.round(n / cap * 100))) : 0; const free = !+c.price;
        const per = [md(c.start), md(c.end)].filter(Boolean).join(' – ');
        return `<li><a class="hu4-pn" ${aT(L.c(c))}><b>${E(c.name)}</b><small>${E([c.cat, c.kind === 'live' ? '실시간' : c.kind === 'vod' ? '온라인' : ''].filter(Boolean).join(' · ') || term('cls'))}</small></a>
          <p class="hu4-pc"><span class="hu4-pk">일정</span><b>${E(whenOf(c) || '상시 수강')}</b><small>${E(per || '기간은 상세에서 안내')}</small></p>
          ${ih ? `<p class="hu4-pc"><span class="hu4-pk">이수 기한</span><b>${c.end ? `${md(c.end)}까지` : '과정별 안내'}</b><small>${c.recruit && c.recruit.to ? `신청 마감 ${md(c.recruit.to)}` : ''}</small></p>` : `<p class="hu4-pc"><span class="hu4-pk">정원</span>${cap ? `<b>${l === 0 ? '정원 마감' : `남은 자리 ${l}석`}</b><span class="hu4-bar" role="img" aria-label="정원 ${cap}명 중 ${n}명 신청"><i style="width:${pct}%"></i></span><small>정원 ${cap}명</small>` : '<b>제한 없음</b>'}</p>`}
          <p class="hu4-pc"><span class="hu4-pk">${ih ? '학습 시간' : '수강료'}</span>${ih ? `<b>${c.hours ? `${E(c.hours)}시간` : '과정별 안내'}</b>` : free ? '<b>무료</b>' : `<b>${W(c.price)}원</b>`}<small>${ih ? (c.kind === 'live' ? '실시간 · 집합' : '온라인 · 이어 듣기') : c.hours ? `총 ${E(c.hours)}시간` : ''}</small></p>
          <a class="hu4-b${l === 0 ? '' : ' p'}" ${aT(L.c(c))}>${l === 0 ? '대기 신청' : ih ? '수강 신청' : '신청하기'}${ic('arrow', 18)}</a></li>`; };
      return `<section class="hpt hp-s hu4-s hu4-plan"><div class="hu4-w"><header class="hu4-sh">${d.eyebrow ? `<p class="hu4-ey">${E(d.eyebrow)}</p>` : ''}<h2>${br(d.title || '')}</h2>${d.sub ? `<p class="hu4-sd">${E(d.sub)}</p>` : ''}</header><ul class="hu4-pl">${C.map(row).join('')}</ul></div></section>`; }
  };

  /* ── 유형별 문구 · 섹션(새로 고를 때) ── */
  const TX = (variant, data) => S2('text', { variant, ...data });
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const ban = d => S2('banner', d);
  const cls = (title, sub, n) => S2('classes', { eyebrow: '', title, sub: sub || '', ids: ids(n || 6), layout: 'grid' });
  const facts = () => TX('stats', { hpt: 'facts', title: '', cols: [] });
  const notices = t => S2('notices', { eyebrow: '', title: t || '공지사항', n: 4 });
  const reviews = t => S2('reviews', { eyebrow: '', title: t, note: '' });
  const cta = (title, body, btn) => TX('cta', { eyebrow: '', title, body, cta: btn, cols: [] });
  const map = () => S2('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' });
  const plan = (ey, title, sub) => TX('features', { hpt: 'hu4-plan', eyebrow: ey, title, sub, cols: [['자동', '공개 강좌 정보로 자동으로 채워요']] }); /* 빈 섹션 정리가 숨기지 않게 — 렌더러는 cols를 쓰지 않는다 */
  const CP = {
    k12: { bb: ['이번 달 브리핑', '우리 아이 이번 달 수업,\n한 장으로 확인하세요', '반별 일정 · 남은 자리 · 수강료를 먼저 보고, 레벨 상담으로 맞는 반을 정해요.', '수업 보기', '상담 신청'],
      tf: ['오늘의 학원 소식', '모집 · 개강 · 공지를\n오늘 바로 확인하세요', '마감이 가까운 반과 새 공지를 먼저 보여 드려요. 학부모는 출결 · 숙제 알림을 앱으로 받아요.', '수업 보기', '상담 신청'],
      st: ['이번 학기 시간표', '요일과 시간으로\n우리 아이 반을 고르세요', '시간표에서 반을 고르고 남은 자리를 확인해요. 상담으로 레벨에 맞는 반을 안내해요.', '수업 보기', '상담 신청'],
      plan: ['반별 비교', '반별 일정 · 수강료를\n한눈에 비교하세요', '요일 · 시간 · 남은 자리를 보고 상담 때 바로 등록할 수 있어요.'], cls: '모집 중인 반', rv: '학부모 · 학생 이야기', nt: '학원 소식',
      feat: ['이렇게 관리해요', [['레벨 상담', '지금 실력과 목표를 확인하고 반을 정해요'], ['출결 · 숙제 알림', '등원 · 하원과 숙제를 학부모 앱으로 알려 드려요'], ['수강료 결제', '청구서를 앱에서 바로 결제해요']]], cta: ['상담은 언제든 편하게', '수업과 반 배정을 상담해 드려요.', '상담 신청'] },
    adult: { bb: ['이번 달 개강 브리핑', '퇴근 후 2시간,\n실무 실력을 올려요', '평일 저녁 · 주말 반 일정과 수강료를 한눈에 보고 바로 신청해요.', '수업 보기', '상담 신청'],
      tf: ['오늘의 클래스 소식', '이번 주 마감 · 개강을\n먼저 확인하세요', '마감이 가까운 반과 새 소식을 먼저 보여 드려요. 수강생은 내 수업에서 바로 이어 들어요.', '수업 보기', '상담 신청'],
      st: ['이번 달 개강', '실무 클래스,\n이번 달 시간표', '요일 · 시간 · 남은 자리를 보고 일정에 맞는 반을 바로 신청해요.', '클래스 보기', '상담 신청'],
      plan: ['반 비교', '일정 · 수강료를\n한눈에 비교하세요', '요일 · 시간 · 남은 자리를 비교하고 바로 신청해요.'], cls: '지금 신청할 수 있는 클래스', rv: '수강생 이야기', nt: '소식',
      feat: ['수강 중에도 챙겨 드려요', [['어디서나 복습', 'PC · 휴대폰에서 수업을 이어서 봐요'], ['과제 · 진도 알림', '과제 마감과 남은 차시를 알려 드려요'], ['수료증', '수료 기준을 채우면 바로 내려받아요']]], cta: ['어떤 반이 맞을지 고민되세요?', '목표와 일정에 맞는 반을 안내해 드려요.', '상담 신청'] },
    univ: { bb: ['이번 학기 브리핑', '이번 학기 강의와 공지,\n한 화면에서 확인하세요', '학번으로 로그인하면 내 강의실 · 과제 · 출석으로 바로 이어져요.', '학번 로그인', '강의 둘러보기'],
      tf: ['오늘의 학사 소식', '신청 마감 · 개강 · 공지를\n오늘 먼저 확인하세요', '마감이 가까운 프로그램과 새 공지를 먼저 보여 드려요. 학번 · 학과 정보만으로 신청해요.', '학번 로그인', '프로그램 보기'],
      st: ['이번 학기 비교과', '강의실 밖 배움,\n비교과로 채우세요', '특강 · 세미나 · 워크숍 시간표를 보고 학번으로 바로 신청해요.', '학번 로그인', '프로그램 보기'],
      plan: ['프로그램 비교', '일정 · 정원을\n한눈에 비교하세요', '신청 기간과 남은 자리를 보고 학번으로 신청해요.'], cls: '이번 학기 프로그램', rv: '참여 학생 이야기', nt: '학사 공지',
      feat: ['학번 하나로 이어져요', [['내 강의실', '자료 · 과제 · 출석을 한곳에서'], ['비교과 이력', '참여 기록과 이수증이 자동으로 남아요'], ['개인정보 최소화', '학번 · 학과만 사용해요']]], cta: ['프로그램 운영 문의', '담당 부서가 신청 · 이수 기준을 안내합니다.', '문의하기'] },
    corp: { bb: ['올해 교육 브리핑', '올해 필수 교육,\n기한 안에 끝내세요', '필수 · 직무 과정과 이수 기한을 확인하고 사번으로 로그인해 이어서 들어요.', '로그인', '과정 목록'],
      tf: ['오늘의 교육 소식', '신청 마감 · 개강을\n오늘 먼저 확인하세요', '마감이 가까운 과정과 새 공지를 먼저 보여 드려요. 이수 기록은 자동으로 남아요.', '로그인', '과정 목록'],
      st: ['이번 달 집합 교육', '이번 달 교육 일정,\n자리부터 확인하세요', '요일 · 시간 · 남은 자리를 보고 팀 일정에 맞춰 신청해요.', '로그인', '과정 목록'],
      plan: ['과정 비교', '과정별 일정 · 학습 시간을\n한눈에 비교하세요', '신청 마감과 남은 자리를 보고 바로 신청해요.'], cls: '운영 중인 과정', rv: '수강한 동료의 이야기', nt: '교육 공지',
      feat: ['교육 담당자도 편해요', [['필수 교육 기한', '기한 전 알림으로 미이수를 줄여요'], ['직무 과정', '업무에 바로 쓰는 실무 과정'], ['이수 기록', '이수 내역과 수료증을 바로 확인']]], cta: ['교육 담당자에게 문의', '과정 · 이수 관련 문의를 남겨 주세요.', '문의하기'] },
    public: { bb: ['올해 교육 브리핑', '업무에 필요한 교육,\n기한 안에 이수하세요', '법정 · 직무 과정과 이수 기한을 확인하고 로그인해 이어서 들어요.', '로그인', '과정 목록'],
      tf: ['오늘의 교육 소식', '신청 마감 · 개강을\n오늘 먼저 확인하세요', '마감이 가까운 과정과 새 공지를 먼저 보여 드려요. 이수 기록은 자동으로 남아요.', '로그인', '과정 목록'],
      st: ['이번 달 집합 교육', '이번 달 교육 일정,\n자리부터 확인하세요', '요일 · 시간 · 남은 자리를 보고 업무 일정에 맞춰 신청해요.', '로그인', '과정 목록'],
      plan: ['과정 비교', '과정별 일정 · 학습 시간을\n한눈에 비교하세요', '신청 마감과 남은 자리를 보고 바로 신청해요.'], cls: '운영 중인 과정', rv: '교육생 이야기', nt: '교육 공지',
      feat: ['이렇게 운영해요', [['법정 교육', '기한 안에 이수하고 기록을 남겨요'], ['직무 과정', '민원 · 행정 실무를 단계별로'], ['이수증', '이수 내역과 이수증을 바로 확인']]], cta: ['교육 운영 문의', '과정 · 이수 관련 문의를 남겨 주세요.', '문의하기'] },
    lifelong: { bb: ['이번 학기 브리핑', '배우고 싶은 강좌,\n우리 동네에서 시작하세요', '이번 학기 강좌 일정과 수강료를 보고 바로 신청해요. 전화로도 물어볼 수 있어요.', '강좌 보기', '전화 문의'],
      tf: ['오늘의 학습관 소식', '접수 마감 · 개강을\n오늘 먼저 확인하세요', '마감이 가까운 강좌와 새 공지를 먼저 보여 드려요. 처음이면 전화로 편하게 물어보세요.', '강좌 보기', '전화 문의'],
      st: ['이번 학기 강좌', '배움이 있는 저녁,\n우리 동네 강좌', '요일 · 시간 · 남은 자리를 보고 바로 신청해요. 처음이면 전화로 물어보세요.', '강좌 보기', '전화 문의'],
      plan: ['강좌 비교', '강좌별 일정 · 수강료를\n한눈에 비교하세요', '요일 · 시간 · 남은 자리를 보고 신청해요.'], cls: '이번 학기 강좌', rv: '수강생 이야기', nt: '학습관 소식',
      feat: ['처음이어도 괜찮아요', [['쉬운 신청', '강좌를 고르고 바로 신청해요'], ['출석 · 수료', '출석이 자동으로 기록되고 수료증을 받아요'], ['전화 안내', '신청이 어려우면 전화로 도와드려요']]], cta: ['수강 신청이 어려우신가요?', '전화로 신청 방법을 안내해 드려요.', '전화 문의'] },
    voc: { bb: ['국비 · 내일배움카드 과정', '자격증과 취업,\n훈련 과정으로 준비하세요', '과정별 훈련 일정 · 정원 · 수강료를 비교하고, 내일배움카드 사용과 자부담은 상담에서 확인해요.', '과정 보기', '국비 상담'],
      tf: ['국비 · 내일배움카드 과정 소식', '모집 마감 · 개강을\n오늘 먼저 확인하세요', '마감이 가까운 과정과 새 공지를 먼저 보여 드려요. 훈련생은 출결과 진도를 바로 확인해요.', '과정 보기', '상담 신청'],
      st: ['국비 · 내일배움카드 과정 모집', '실습장에서\n자격증까지', '훈련 시간 · 정원을 보고 상담을 신청해요. 내일배움카드 사용과 자부담은 상담에서 확인해요.', '과정 보기', '국비 상담'],
      plan: ['과정 비교', '훈련 일정 · 수강료를\n한눈에 비교하세요', '훈련 기간 · 남은 자리 · 수강료를 비교하고 상담을 신청해요.'], cls: '모집 중인 훈련 과정', rv: '수료생 이야기', nt: '훈련 공지',
      feat: ['훈련 중에도 챙겨 드려요', [['출결 · 진도', '출결과 진도가 자동으로 기록돼요'], ['실습 · 평가', '실습 과제와 평가 결과를 한곳에서'], ['수료 · 취업', '수료 기준과 취업 지원을 안내해요']]], cta: ['어떤 과정이 맞을지 고민되세요?', '목표와 일정에 맞는 과정을 상담해 드려요.', '상담 신청'] }
  };
  const P = () => CP[grp()] || CP.adult;
  const hasMap = () => ['k12', 'adult', 'lifelong', 'voc'].includes(grp());
  const BUILD = {
    briefboard: () => { const c = P(); const [ey, title, sub, cta1, cta2] = c.bb;
      return [ban({ eyebrow: ey, title, sub, cta: cta1, cta2 }), plan(...c.plan), facts(), cls(c.cls, '', 4),
        TX('features', { eyebrow: '', title: c.feat[0], cols: c.feat[1] }), reviews(c.rv), notices(c.nt), cta(...c.cta), ...(hasMap() ? [map()] : [])]; },
    todayfeed: () => { const c = P(); const [ey, title, sub, cta1, cta2] = c.tf;
      return [ban({ eyebrow: ey, title, sub, cta: cta1, cta2 }), cls(c.cls, '', 4), plan(...c.plan), notices(c.nt), reviews(c.rv), facts(), cta(...c.cta), ...(hasMap() ? [map()] : [])]; },
    stage: () => { const c = P(); const [ey, title, sub, cta1, cta2] = c.st;
      return [ban({ eyebrow: ey, title, sub, cta: cta1, cta2 }), plan(...c.plan), cls(c.cls, '', 4), facts(), reviews(c.rv), notices(c.nt), cta(...c.cta), ...(hasMap() ? [map()] : [])]; }
  };
  /* 유형별 지정 사진 [hero, about, space, cta] — 사람 · 수업 장면 위주, 유형과 맞는 것만 */
  const PH = {
    briefboard: { k12: ['dsk-07', 'hum-39', 'cls-04', 'hum-02'], adult: ['hum-08', 'hum-04', 'cor-02', 'lap-03'], univ: ['hum-13', 'cam-07', 'lib-03', 'hum-12'], corp: ['grp-03', 'cor-06', 'cor-07', 'lap-03'], public: ['hum-36', 'doc-01', 'cor-03', 'hum-12'], lifelong: ['sen-07', 'hum-37', 'lib-01', 'hum-38'], voc: ['hum-50', 'hum-18', 'aut-03', 'wrk-01'] },
    todayfeed: { k12: ['cls-04', 'dsk-07', 'lib-04', 'hum-02'], adult: ['hum-09', 'hum-05', 'cor-02', 'lap-03'], univ: ['cam-08', 'hum-15', 'lib-01', 'hum-12'], corp: ['hum-08', 'grp-06', 'cor-11', 'lap-03'], public: ['hum-34', 'dsk-08', 'cor-15', 'hum-12'], lifelong: ['hum-24', 'kni-01', 'yog-03', 'hum-38'], voc: ['bak-01', 'hum-17', 'cor-09', 'wrk-01'] },
    stage: { k12: ['brd-01', 'hum-39', 'cls-03', 'hum-02'], adult: ['hum-11', 'hum-10', 'sem-01', 'lap-03'], univ: ['hum-11', 'cam-06', 'lec-02', 'hum-12'], corp: ['grp-01', 'hum-10', 'sem-01', 'lap-03'], public: ['hum-11', 'grp-01', 'lec-01', 'hum-12'], lifelong: ['hum-29', 'hum-27', 'lib-02', 'mus-01'], voc: ['hum-19', 'voc-01', 'aut-03', 'wrk-01'] }
  };

  /* ── CSS(테마 cssX 뒤에 이어 붙인다) ── */
  function css(s, th, T) { const id = s.theme; const dark = th.tone === 'dark'; const R = ramp(T.a); const a = T.a, on = onC(a);
    const bg = th.bg, ink = th.ink, surf = dark ? mix(bg, '#ffffff', .06) : '#ffffff', surf2 = dark ? mix(bg, '#ffffff', .1) : R[50];
    const mu = fit(th.mu, surf, 4.6, dark ? '#ffffff' : '#000000'), muB = fit(th.mu, bg, 4.6, dark ? '#ffffff' : '#000000'), muA = fit(th.mu, th.alt, 4.6, dark ? '#ffffff' : '#000000');
    const at = fit(a, surf, 4.6, dark ? '#ffffff' : '#000000'), atB = fit(a, bg, 4.6, dark ? '#ffffff' : '#000000'), at50 = fit(a, R[50], 4.6, '#000000'), atS2 = fit(a, surf2, 4.6, dark ? '#ffffff' : '#000000');
    const ln = dark ? 'rgba(255,255,255,.12)' : al(ink, .1); const warn = fit(WARN, surf, 4.6, dark ? '#ffffff' : '#000000'); const warnBg = dark ? mix(surf, WARN, .16) : mix('#ffffff', WARN, .1); const warnT = fit(WARN, warnBg, 4.6, dark ? '#ffffff' : '#000000');
    const r = th.r || 16, rb = th.br || 12; const shad = dark ? 'none' : (th.sh || '0 1px 2px rgba(16,24,20,.05),0 14px 32px -20px rgba(16,24,20,.24)');
    const bd = fit(mix(a, '#0A0D0C', .82), '#ffffff', 12, '#000000');
    let x = `
/* v43.8 hpup-p2(${id}) */
.hu4-w{max-width:${id === 'briefboard' ? 1180 : 1220}px;margin:0 auto;padding:0 40px;box-sizing:border-box}.hu4-h *,.hu4-s *{box-sizing:border-box}.hu4-h,.hu4-s{word-break:keep-all;overflow-wrap:anywhere}
.hu4-h h1{margin:0;font-weight:800;letter-spacing:-.04em;line-height:1.14;text-wrap:balance}.hu4-sub{margin:16px 0 0;font-size:clamp(16px,1.35vw,19px);line-height:1.65;max-width:34em}
.hu4-pill{display:inline-flex;align-items:center;gap:8px;margin:0 0 18px;padding:7px 14px;border-radius:999px;font-size:14px;font-weight:700;background:${dark ? al('#ffffff', .1) : R[50]};color:${dark ? '#ffffff' : at50}}.hu4-pill i{width:8px;height:8px;border-radius:50%;background:${dark ? mix(a, '#ffffff', .35) : a};flex:none}
.hu4-btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.hu4-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;min-width:44px;padding:0 18px;border-radius:${rb}px;font-size:15px;font-weight:700;text-decoration:none!important;background:${dark ? surf2 : '#ffffff'};color:${dark ? '#ffffff' : ink}!important;box-shadow:inset 0 0 0 1.5px ${ln};white-space:nowrap;transition:transform .15s ease,box-shadow .15s ease}
.hu4-b.p{background:${a};color:${on}!important;box-shadow:none}.hu4-b.lg{min-height:52px;padding:0 26px;font-size:16px}.hu4-b.g.dk{background:transparent;color:#fff!important;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5)}
.hu4-b:hover{transform:translateY(-1px)}.hu4-b:focus-visible,.hu4-h a:focus-visible,.hu4-s a:focus-visible{outline:3px solid ${dark ? '#ffffff' : a};outline-offset:2px}
.hu4-img{margin:0;position:relative;overflow:hidden;background:${surf2}}.hu4-img>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;max-height:none;border-radius:0;box-shadow:none}
/* 3갈래 */
.hu4-dr{margin-top:clamp(28px,4vw,48px)}.hu4-dq{margin:0 0 12px;font-size:14px;font-weight:800;letter-spacing:-.01em;color:${dark ? fit(th.mu, bg, 4.6, '#ffffff') : muB}}
.hu4-dr ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.hu4-d{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto 1fr;gap:4px 14px;padding:20px;border-radius:${Math.max(12, r - 4)}px;background:${surf};box-shadow:${dark ? `0 0 0 1px ${ln}` : `0 0 0 1px ${ln},${shad}`}}
.hu4-di{grid-row:1/3;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:${dark ? al(a, .22) : R[50]};color:${dark ? mix(a, '#ffffff', .45) : at50}}
.hu4-dt b{display:block;font-size:17px;font-weight:800;color:${ink};letter-spacing:-.02em}.hu4-dt small{display:block;margin-top:4px;font-size:14px;line-height:1.5;color:${mu}}
.hu4-da{grid-column:2;display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-self:end}.hu4-da .hu4-b{font-size:14px;padding:0 14px}
/* 과정 비교 */
.hu4-s{padding:clamp(64px,8vw,${id === 'briefboard' ? 128 : 104}px) 0}.hu4-sh{margin-bottom:28px;max-width:720px}.hu4-ey{margin:0 0 10px;font-size:14px;font-weight:800;color:${atB}}
.hpt .hu4-sh h2{margin:0;font-size:clamp(27px,3vw,40px)!important;font-weight:800;letter-spacing:-.035em;line-height:1.22;color:${ink}!important}.hu4-sd{margin:12px 0 0;font-size:16px;line-height:1.65;color:${muB}}
.hu4-pl{list-style:none;margin:0;padding:0;border-radius:${r}px;background:${surf};box-shadow:0 0 0 1px ${ln}${dark ? '' : ',' + shad};overflow:hidden}
.hu4-pl>li{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,.9fr) auto;gap:20px;align-items:center;padding:20px 24px;border-top:1px solid ${ln}}.hu4-pl>li:first-child{border-top:0}
.hu4-pn{text-decoration:none!important;color:${ink}!important;min-height:44px;display:flex;flex-direction:column;justify-content:center}.hu4-pn b{font-size:17px;font-weight:800;letter-spacing:-.02em}.hu4-pn small{margin-top:3px;font-size:13px;color:${mu}}
.hu4-pc{margin:0;display:flex;flex-direction:column;gap:3px;min-width:0}.hu4-pk{font-size:13px;font-weight:700;color:${mu}}.hu4-pc b{font-size:15px;font-weight:800;color:${ink}}.hu4-pc small{font-size:13px;color:${mu}}
.hu4-bar{display:block;height:6px;border-radius:99px;background:${dark ? al('#ffffff', .12) : R[100]};overflow:hidden;margin:2px 0}.hu4-bar i{display:block;height:100%;border-radius:99px;background:${a}}
.hu4-hint{padding:20px;border:1px dashed ${ln};border-radius:12px;font-size:14px;color:${muB}}
/* 관문 보정(공통 부품): 13px · 44px */
.hpt .hps-tag,.hpt .hps-new,.hpt .hp-tag,.hpt .hp-new{font-size:13px!important}
.hpt :is(.hps-fl a,.hps-fc li a,.hps-fb a,.hps-lg a,.hps-login,.hp-ft a,.hp-foot a){min-height:44px;min-width:44px;display:inline-flex;align-items:center}
.hpt a[href^="tel:"],.hpt a[href^="mailto:"]{min-height:44px;display:inline-flex;align-items:center}.hpt .hps-sbig{min-height:44px}
.hpt .hps-chip,.hpt .hps-p b small,.hpt .hpb-rsum small,.hpt .hps-facts dd small,.hpt dd>small{font-size:13px!important}.hpt .hp-all{min-height:44px;display:inline-flex;align-items:center}.hpt :is(.lhs-jn) a{min-width:44px!important;justify-content:center} /* :is — 게시본 CSS 줄이기(hpperf)가 실행 중에 붙는 class 규칙을 지우지 않게 */.hpt .hps-glk a,.hpt .hps-s2 a{min-height:44px!important;min-width:44px;display:inline-flex!important;align-items:center}.hpt .hps-wmk small{font-size:13px!important}.hpt .s2esc{min-height:44px;display:inline-flex;align-items:center}.hpt li>a{min-height:44px}
@media(max-width:1000px){.hu4-dr ul{grid-template-columns:1fr}.hu4-pl>li{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 16px}.hu4-pn{grid-column:1/-1}.hu4-pl>li>.hu4-b{grid-column:1/-1}}
@media(max-width:640px){.hu4-w{padding:0 20px}.hpt.hu4-h h1{font-size:${id === 'todayfeed' ? 31 : 32}px!important}.hu4-sub{font-size:16px;margin-top:12px}.hu4-btns{margin-top:20px}.hu4-btns .hu4-b{flex:1 1 auto}.hu4-d{padding:16px}.hu4-pl>li{padding:18px}.hu4-pl>li .hu4-pc:nth-of-type(3){grid-column:1/-1}}
`;
    if (id === 'briefboard') x += `
.hpt.hu4-bb{background:${bg};color:${ink};padding:clamp(40px,5vw,72px) 0 clamp(56px,6vw,96px)!important}
.hu4-bbg{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:clamp(32px,5vw,72px);align-items:center}
.hpt.hu4-bb h1{font-size:clamp(34px,3.5vw,52px)!important;color:${ink}!important}.hu4-bb .hu4-sub{color:${muB}}
.hu4-bbm{position:relative}.hu4-bph{aspect-ratio:5/4;border-radius:${r + 6}px}
.hu4-brief{position:absolute;left:-28px;bottom:-28px;max-width:min(380px,86%);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;align-items:end;padding:20px 22px;border-radius:${r}px;background:#ffffff;color:${ink}!important;text-decoration:none!important;box-shadow:0 1px 2px rgba(16,24,20,.06),0 24px 48px -20px rgba(16,24,20,.35)}
.hu4-bk{grid-column:1/-1;font-size:13px;font-weight:800;color:${fit(a, '#ffffff', 4.6, '#000000')}}.hu4-brief b{grid-column:1;font-size:19px;font-weight:800;letter-spacing:-.025em;line-height:1.3}
.hu4-bm{grid-column:1;display:flex;flex-wrap:wrap;gap:6px}.hu4-bm span{font-size:13px;font-weight:700;padding:4px 10px;border-radius:99px;background:${R[50]};color:${at50}}.hu4-bm span.hot{background:${mix('#ffffff', WARN, .1)};color:${fit(WARN, mix('#ffffff', WARN, .1), 4.6, '#000000')}}
.hu4-brief>i{grid-column:2;grid-row:2/4;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:${a};color:${on}}
.hu4-dr-bb{margin-top:clamp(56px,6vw,88px)}.hu4-dr-bb .hu4-d{background:${th.alt};box-shadow:none}.hu4-dr-bb .hu4-dt small{color:${muA}}.hu4-dr-bb .hu4-di{background:#ffffff}
.hu4-dr-bb .hu4-b:not(.p){background:#ffffff}
@media(max-width:1000px){.hu4-bbg{grid-template-columns:1fr}.hu4-brief{left:16px;bottom:-24px}}
@media(max-width:640px){.hpt.hu4-bb{padding:28px 0 48px!important}.hu4-bph{aspect-ratio:16/10;border-radius:${r}px}.hu4-brief{position:relative;left:auto;bottom:auto;max-width:none;margin:-36px 12px 0;padding:16px 18px}.hu4-brief b{font-size:17px}.hu4-dr-bb{margin-top:32px}}
`;
    if (id === 'todayfeed') x += `
.hpt.hu4-tf{background:linear-gradient(180deg,${R[50]} 0%,${bg} 100%);color:${ink};padding:clamp(36px,5vw,64px) 0 clamp(48px,6vw,88px)!important}
.hu4-tfg{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(28px,4vw,56px);align-items:center}
.hpt.hu4-tf h1{font-size:clamp(32px,3.4vw,48px)!important;color:${ink}!important}.hu4-tf .hu4-sub{color:${fit(th.mu, R[50], 4.6, '#000000')}}.hu4-tf .hu4-pill{background:#ffffff;color:${fit(a, '#ffffff', 4.6, '#000000')}}
.hu4-feed{background:#ffffff;border-radius:${r + 4}px;padding:12px;box-shadow:0 1px 2px rgba(16,24,20,.05),0 24px 48px -24px rgba(16,24,20,.3)}
.hu4-fph{aspect-ratio:16/8;border-radius:${r - 4}px}
.hu4-fh{display:flex;justify-content:space-between;align-items:baseline;margin:14px 10px 6px}.hu4-fh b{font-size:16px;font-weight:800}.hu4-fh span{font-size:13px;color:${fit(th.mu, '#ffffff', 4.6, '#000000')}}
.hu4-fl{list-style:none;margin:0;padding:0}.hu4-fl li a{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 10px;min-height:56px;border-top:1px solid ${al(ink, .08)};text-decoration:none!important;color:${ink}!important;border-radius:10px}.hu4-fl li:first-child a{border-top:0}
.hu4-fl li a:hover{background:${R[50]}}.hu4-fl i{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:${R[50]};color:${at50}}.hu4-fl li.w i{background:${mix('#ffffff', WARN, .1)};color:${fit(WARN, mix('#ffffff', WARN, .1), 4.6, '#000000')}}
.hu4-fl small{display:block;font-size:13px;font-weight:800;color:${fit(a, '#ffffff', 4.6, '#000000')}}.hu4-fl li.w small{color:${fit(WARN, '#ffffff', 4.6, '#000000')}}.hu4-fl b{display:block;margin-top:2px;font-size:15px;font-weight:700;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hu4-dr-tf .hu4-d{background:${surf};border-radius:${r}px}.hu4-dr-tf .hu4-d.is-1{background:${R[700]};box-shadow:none}.hu4-dr-tf .hu4-d.is-1 .hu4-dt b{color:${onC(R[700])}}.hu4-dr-tf .hu4-d.is-1 .hu4-dt small{color:${onC(R[700]) === '#FFFFFF' ? fit(mix(R[700], '#ffffff', .8), R[700], 4.6, '#ffffff') : fit('#333333', R[700], 4.6, '#000000')}}
.hu4-dr-tf .hu4-d.is-1 .hu4-di{background:${al('#ffffff', .16)};color:${onC(R[700])}}.hu4-dr-tf .hu4-d.is-1 .hu4-b.p{background:#ffffff;color:${fit(R[700], '#ffffff', 4.6, '#000000')}!important}.hu4-dr-tf .hu4-d.is-1 .hu4-b:not(.p){background:transparent;color:${onC(R[700])}!important;box-shadow:inset 0 0 0 1.5px ${al(onC(R[700]), .5)}}
.hpt.hu4-plan{background:${mix(R[50], '#ffffff', .4)}}.hu4-plan .hu4-ey{color:${fit(a, mix(R[50], '#ffffff', .4), 4.6, '#000000')}}.hu4-plan .hu4-sd{color:${fit(th.mu, mix(R[50], '#ffffff', .4), 4.6, '#000000')}}
@media(max-width:1000px){.hu4-tfg{grid-template-columns:1fr}}
@media(max-width:640px){.hpt.hu4-tf{padding:24px 0 44px!important}.hu4-fph{aspect-ratio:16/7}.hu4-feed{padding:10px}.hu4-dr-tf{margin-top:28px}}
`;
    if (id === 'stage') { const dmu = fit('#D6DCD9', bd, 4.6, '#ffffff'); const muD = fit(th.mu, surf, 4.8, '#ffffff'); const atD = fit(mix(a, '#ffffff', .25), surf, 4.8, '#ffffff'); const warnD = fit(WARN, surf, 4.8, '#ffffff'); x += `
.hpt.hu4-st{position:relative;background:${bd};color:#ffffff;padding:clamp(72px,8vw,120px) 0 clamp(48px,5vw,72px)!important;overflow:hidden;isolation:isolate}
.hu4-sph{position:absolute!important;inset:0;z-index:-2}.hu4-scrim{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,${al(bd, .94)} 0%,${al(bd, .84)} 45%,${al(bd, .55)} 100%),linear-gradient(0deg,${bg} 0%,${al(bg, 0)} 34%)}
.hu4-stg{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:clamp(32px,5vw,72px);align-items:end}.hu4-stg.one{grid-template-columns:1fr}
.hpt.hu4-st h1{font-size:clamp(36px,4vw,58px)!important;color:#ffffff!important}.hu4-st .hu4-sub{color:${dmu}}.hu4-st .hu4-pill{background:${al('#ffffff', .12)};color:#ffffff}
.hu4-tt{background:${al(surf, .92)};border-radius:${r}px;padding:18px;box-shadow:0 0 0 1px ${ln}}
.hu4-tth{display:flex;justify-content:space-between;align-items:center;margin:0 4px 8px}.hu4-tth b{font-size:16px;font-weight:800;color:#ffffff}.hu4-tth a{display:inline-flex;align-items:center;gap:4px;min-height:44px;font-size:14px;font-weight:700;color:${at}!important;text-decoration:none!important}
.hu4-tt ul{list-style:none;margin:0;padding:0}.hu4-tt li a{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 6px;min-height:56px;border-top:1px solid ${ln};color:#ffffff!important;text-decoration:none!important}.hu4-tt li:first-child a{border-top:0}
.hu4-ttd{font-size:15px;font-weight:800;color:${at}}.hu4-ttd small{display:block;font-size:13px;font-weight:700;color:${mu}}.hu4-ttn b{display:block;font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hu4-ttn small{display:block;font-size:13px;color:${mu}}.hu4-ttn small.hot{color:${warn}}
.hu4-dr-st .hu4-dq{color:${dmu}}.hu4-dr-st .hu4-d{background:${surf}}.hu4-dr-st .hu4-dt b{color:#ffffff}
.hpt.hu4-plan{background:${bg}}.hu4-plan .hu4-sh h2{color:${ink}}
/* L 심사(11-17): 어두운 판 위 보조 글자 대비 2.2 → 판 색 기준 4.8:1 이상(공통 small 규칙보다 앞서게 !important) */
.hpt.hu4-st :is(small,.hu4-pk,.hu4-dq),.hpt.hu4-st .hu4-tt li small,.hpt.hu4-plan :is(small,.hu4-pk),.hpt.hu4-plan .hu4-sd{color:${muD}!important}.hpt.hu4-st .hu4-ttn small.hot{color:${warnD}!important}.hpt.hu4-st .hu4-ttd,.hpt.hu4-st .hu4-tth a{color:${atD}!important}.hpt.hu4-plan .hu4-ey{color:${fit(a, bg, 4.8, '#ffffff')}!important}
@media(max-width:1000px){.hu4-stg{grid-template-columns:1fr}}
@media(max-width:640px){.hpt.hu4-st{padding:56px 0 40px!important}.hu4-scrim{background:linear-gradient(180deg,${al(bd, .72)} 0%,${al(bd, .9)} 40%,${bg} 100%)}.hu4-tt{padding:12px}.hu4-tt li a{grid-template-columns:56px minmax(0,1fr) auto;gap:10px}}
`; }
    return x; }

  /* ── 연결 ── */
  /* 1) 테마 CSS: 기존 cssX(hpprem) 뒤에 이어 붙인다 */
  MINE.forEach(id => { const th = HPT.meta(id); if (th.hu4) return; const c0 = th.cssX; th.cssX = (s, th2, T, u) => { let x = ''; try { x = typeof c0 === 'function' ? c0(s, th2, T, u) : ''; } catch (e) { console.error('hpup-p2 base cssX', e); }
    try { x += css(s, th2, T); } catch (e) { console.error('hpup-p2 css', e); } return x; }; th.hu4 = 1; });
  function sportsSite(s) { return ((s && s.sections) || []).some(x => x && x.data && x.data.hpt === 'sp-hours'); }
  /* 2) 첫 화면: 이 3종 테마 + 첫 화면 방식을 따로 고르지 않은 경우(체육시설 무대는 기존 화면 유지) */
  if (window.HPS && typeof HPS.hero === 'function' && !HPS.hero.hu4) { const h0 = HPS.hero; const f = (kind, s, d, th, T) => { try { if (mine(s) && (!d || !d.hk) && !sportsSite(s) && HERO[s.theme]) return HERO[s.theme](s, d || {}); } catch (e) { console.error('hpup-p2 hero', e); } return h0(kind, s, d, th, T); }; f.hu4 = 1; HPS.hero = f; }
  /* 3) 섹션: hu4-plan */
  if (typeof proSec === 'function' && !proSec.hu4) { const base = proSec; const f = (x, i, s, lk) => { const d = x && x.data; const r = d && x.type === 'text' && SECR[d.hpt];
      if (!r || !s) return base(x, i, s, lk); if (x.hide && !editing()) return '';
      let h = null; try { h = r(d, s); } catch (e) { console.error('hpup-p2', d.hpt, e); h = null; }
      if (h == null) return base(x, i, s, lk); if (!h) return '';
      const m = editing() ? HPE.map.get(x) : null; if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
      return h; }; f.hu4 = 1; proSec = f; window.proSec = f; }
  /* 4) 템플릿 기본 섹션: 유형별 문구(체육시설 무대는 기존 sportsBuild) */
  if (typeof TPL !== 'undefined' && typeof S2 === 'function') MINE.forEach(id => { const tp = TPL.find(x => x.id === 'prem-' + id); if (!tp || tp.hu4) return; const b0 = tp.build;
    tp.build = () => { try { if (id === 'stage' && sportsFac()) return b0(); return BUILD[id](); } catch (e) { console.error('hpup-p2 build', e); return b0(); } }; tp.hu4 = 1;
    if (id === 'briefboard') tp.scene = '기업 HRD · 대학 · 성인 교육 — 큰 사진과 「가장 먼저 시작하는 과정」 브리핑'; if (id === 'todayfeed') tp.scene = '학원 · 초중고 · 평생교육 — 마감 · 개강 · 공지가 모이는 오늘 피드'; if (id === 'stage') tp.scene = '예체능 · 평생교육 · 집합 교육 — 어두운 무대 사진과 이번 주 시간표'; });
  /* 5) 템플릿 지정 사진(유형별) */
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hu4) { const b0 = siteFromTpl; const f = tp => { const s = b0(tp); try { const id = tp && /^prem-/.test(tp.id) ? tp.id.slice(5) : '';
      if (PH[id] && !(id === 'stage' && sportsFac()) && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { const A = PH[id][grp()] || PH[id].adult; const P2 = { hero: A[0], about: A[1], space: A[2], cta: A[3] };
        s.photos = Object.assign({}, s.photos || {}, P2); s.img = s.img || {}; Object.keys(P2).forEach(sl => { const v = HPSTOCK.slotImg(P2[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hpup-p2 photos', e); } return s; };
    Object.keys(b0).forEach(k => { try { f[k] = b0[k]; } catch (e) { } }); f.hu4 = 1; siteFromTpl = f; window.siteFromTpl = f; }
  window.HPUP = Object.assign(window.HPUP || {}, { p2: { ids: MINE.slice(), grp } });
})();
