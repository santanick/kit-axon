/* v43.8 hpup-b2 — 기본 템플릿 tech · kids · campus · senior 고도화(82점 통과선)
   대표님(2026-11-17): 「82점을 통과기준으로 빠르게 진행해」 「26종 모두 82점을 넘기라는 말얔」
   - 기존 섹션 · 문구 · 데이터는 그대로 두고, 첫 화면 바로 아래에 「어떤 일로 오셨어요?」(방문자별 갈래 + 지금 신청할 수 있는 실제 강좌) 판을 더한다.
   - 테마별 모양: tech(짙은 남색 판 · 청록 포인트 · 고정폭 숫자) · kids(4색 둥근 카드) · campus(학사 일정 표 · 가는 선) · senior(큰 글씨 · 72px 버튼).
   - 공통 보정(이 4테마 게시본만): 공지 태그 · 새 글 표시 13px, 머리글 로그인 · 신청 버튼 44px, 휴대폰 꼬리말 · 강좌 링크 44px.
   - 링크는 학습자 사이트 실제 경로만(#p-m-<메뉴> · #p-c-<강좌> · #login/my · #login/family · #login/mypay · #join · tel:).
   - 대학은 학번 · 학과 로그인 안내만(다른 개인정보 문구 없음).
   - CSS는 게시본(Shadow DOM)에 그대로 들어가도록 siteHTML 결과의 마지막 </style> 앞에 넣는다. 클래스 접두어 hu2-. */
'use strict';
(() => {
  if (typeof siteHTML !== 'function' || !window.HPT || typeof HPT.tokens !== 'function') return;
  const MINE = ['tech', 'kids', 'campus', 'senior'];
  const U = HPT.U || {}; const mix = U.mix, fit = U.fit, al = U.al;
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const ty = () => { try { return (S.org && S.org.type) || 'adult'; } catch (e) { return 'adult'; } };
  const term = k => (typeof t === 'function' ? t(k) : '강좌');
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const pubAll = () => { try { return (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료'); } catch (e) { return []; } };
  const menu = (s, k) => ((s && s.menus) || []).find(m => m && m.kind === k && m.on !== false && m.access !== '비공개');
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  const DN = ['일', '월', '화', '수', '목', '금', '토'];
  const W = v => (+v || 0).toLocaleString('ko-KR');
  const md = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? `${+m[2]}.${+m[3]}` : ''; };
  const dayN = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); if (!m) return null; const a = new Date(+m[1], +m[2] - 1, +m[3]); const n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((a - n) / 864e5); };

  /* ── 링크 ── */
  const L = {
    cls: s => { const m = menu(s, 'class'); return m ? '#p-m-' + m.id : (pubAll()[0] ? '#p-c-' + pubAll()[0].id : '#login/my'); },
    ask: s => { const f = ft(); if (f.tel && !isPh(f.tel)) return telH(f.tel); const m = menu(s, 'community') || menu(s, 'board'); if (m) return '#p-m-' + m.id; if (f.email && /@/.test(f.email)) return 'mailto:' + f.email; return L.cls(s); },
    notice: s => { const m = menu(s, 'notice'); return m ? '#p-m-' + m.id : L.cls(s); },
    data: s => { const m = menu(s, 'board') || menu(s, 'book'); return m ? '#p-m-' + m.id : '#login/my'; },
    my: () => '#login/my', fam: () => '#login/family', pay: () => '#login/mypay', join: () => '#join'
  };

  /* ── 선 아이콘 ── */
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.5a4 4 0 010 7.5M22 21a7 7 0 00-4.5-6.5',
    book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7', bell: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0', card: 'M3 6h18v12H3zM3 10h18M7 15h4', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
    chat: 'M4 5h16v11H9l-5 4z', check: 'M5 12.5l4.5 4.5L19 7.5', badge: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z', door: 'M5 21V4l10-1v18M15 3h4v18M11 12v1', brief: 'M3 8h18v12H3zM8 8V5h8v3M3 13h18', star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 22}" height="${n || 22}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;

  /* ── 방문자 갈래(기관 유형별) ── */
  function roles(s) { const c = term('cls'); const T = ty(); const ed = (() => { try { return S.org.ed || ''; } catch (e) { return ''; } })();
    const R = {
      corp: [['user', '임직원', '내 필수 교육 · 마감 확인', L.my(s)], ['badge', '신입 사원', `온보딩 ${c} 시작하기`, L.cls(s)], ['brief', '교육 담당자', '과정 요청 · 운영 문의', L.ask(s)], ['bell', '교육 공지', '법정 · 필수 교육 안내', L.notice(s)]],
      public: ed === 'staff' ? [['user', '직원', '내 필수 교육 · 이수증', L.my(s)], ['book', '교육 신청', `${c} 둘러보고 신청`, L.cls(s)], ['chat', '담당자 문의', '교육 운영 문의', L.ask(s)], ['bell', '공지', '교육 일정 · 안내', L.notice(s)]]
        : [['book', '처음 오신 시민', `${c} 찾고 신청하기`, L.cls(s)], ['user', '수강 중인 분', '내 강의실 · 출석 확인', L.my(s)], ['door', '회원 가입', '가입하고 신청 알림 받기', L.join(s)], ['chat', '문의', '신청 · 이용 문의', L.ask(s)]],
      univ: [['user', '재학생', '학번 로그인 · 비교과 신청', L.my(s)], ['star', '신입생', '처음 오셨나요? 가입 안내', L.join(s)], ['book', '교수자', '자료 · 강의 운영', L.data(s)], ['brief', '산학 · 지역', '협력 · 프로그램 문의', L.ask(s)]],
      k12: [['users', '학부모', '출결 · 성적 알림 확인', L.fam(s)], ['user', '학생', '내 수업 · 과제 보기', L.my(s)], ['chat', '처음 오신 분', '상담 · 레벨 테스트 예약', L.ask(s)], ['card', '수강료 결제', '청구서 · 결제 내역', L.pay(s)]],
      adult: [['book', '처음 오신 분', `${c} 고르고 신청하기`, L.cls(s)], ['user', '수강생', '내 강의실 · 진도 확인', L.my(s)], ['card', '결제 · 영수증', '수강료 결제 내역', L.pay(s)], ['chat', '상담', '과정 추천 · 문의', L.ask(s)]],
      lifelong: [['book', '배우고 싶은 분', `${c} 찾고 신청하기`, L.cls(s)], ['user', '수강 중인 분', '내 강의실 · 수료증', L.my(s)], ['door', '처음 오셨나요?', '회원 가입 안내', L.join(s)], ['chat', '전화 · 문의', '신청 방법 물어보기', L.ask(s)]],
      voc: [['brief', '구직자 · 국비', `훈련 ${c} 찾기`, L.cls(s)], ['user', '훈련생', '출결 · 수료 확인', L.my(s)], ['book', '재직자', '직무 향상 과정 보기', L.cls(s)], ['chat', '훈련 상담', '자격 · 신청 문의', L.ask(s)]]
    };
    return R[T === 'univ_lms' ? 'univ' : T] || R.adult; }

  /* 지금 신청할 수 있는 실제 강좌(개강 가까운 순) */
  function nowList() { const C = pubAll().slice(); const key = c => (c.period && c.period.start) || (c.recruit && c.recruit.to) || '9999';
    C.sort((a, b) => String(key(a)).localeCompare(String(key(b)))); return C.slice(0, 3); }
  function nowRow(c) { const p = c.period || {}; const d = dayN(p.start); const days = (Array.isArray(c.days) ? c.days : []).map(Number).filter(x => x >= 0 && x <= 6).map(x => DN[x]).join('·');
    const tm = c.time && /^\d{1,2}:\d{2}$/.test(c.time.from || '') ? c.time.from : '';
    const when = p.mode === 'range' && p.start ? `${md(p.start)} ~ ${md(p.end)}` : p.mode === 'days' && p.days ? `신청 후 ${p.days}일` : '';
    const meta = [when, [days, tm].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const tag = d != null && d > 0 && d <= 30 ? `<i class="hu2-dd">개강 D-${d}</i>` : (c.status === '운영중' ? '<i class="hu2-dd on">수강 중</i>' : '');
    return `<li><a class="hu2-nr" href="#p-c-${E(c.id)}"><span class="hu2-nt"><b>${E(c.name)}</b>${meta ? `<span>${E(meta)}</span>` : ''}</span><span class="hu2-np">${tag}<em>${+c.price ? W(c.price) + '원' : '무료'}</em></span></a></li>`; }

  function whoHTML(s) { const R = roles(s); const N = nowList(); const c = term('cls'); const T = ty(); const uni = T === 'univ' || T === 'univ_lms';
    const head = T === 'k12' ? '어떤 일로 오셨어요?' : uni ? '무엇을 하러 오셨나요?' : '어떤 일로 오셨어요?';
    const roleH = R.map(([k, a, b, h], i) => `<li><a class="hu2-role r${i}" href="${E(h)}"><span class="hu2-ri">${ic(k, 24)}</span><span class="hu2-rt"><b>${E(a)}</b><span>${E(b)}</span></span><span class="hu2-ra">${ic('arrow', 20)}</span></a></li>`).join('');
    const side = N.length
      ? `<aside class="hu2-now" aria-label="지금 신청할 수 있는 ${E(c)}"><div class="hu2-nh"><h3>지금 신청할 수 있어요</h3><a class="hu2-all" href="${E(L.cls(s))}">전체 보기${ic('arrow', 16)}</a></div><ol>${N.map(nowRow).join('')}</ol></aside>`
      : `<aside class="hu2-now hu2-in" aria-label="내 교육 확인"><div class="hu2-nh"><h3>${T === 'corp' ? '배정된 교육은 로그인 후 보여요' : `내 ${E(c)}은 로그인 후 보여요`}</h3></div><ol class="hu2-steps"><li><b>1</b><span>로그인</span></li><li><b>2</b><span>내 교육 · 마감 확인</span></li><li><b>3</b><span>이수증 저장</span></li></ol><a class="hu2-btn" href="${E(L.my(s))}">로그인하고 내 교육 보기${ic('arrow', 18)}</a></aside>`;
    const note = uni ? '<p class="hu2-nt2">재학생은 학번 · 학과로 로그인해요.</p>' : '';
    return `<section class="hu2-who" aria-label="방문 목적별 바로가기"><div class="hu2-w"><div class="hu2-hd"><p class="hu2-ey">바로가기</p><h2>${E(head)}</h2>${note}</div><div class="hu2-g"><ul class="hu2-roles">${roleH}</ul>${side}</div></div></section>`; }

  /* ── CSS ── */
  function css(s) { const T = HPT.tokens(s); if (!T) return ''; const th = s.theme; const a = T.a, on = T.on; const ink = T.ink || '#111827';
    const at = fit(a, '#ffffff', 4.5); const a50 = mix(a, '#ffffff', .93), a100 = mix(a, '#ffffff', .84), a700 = fit(mix(a, '#000000', .3), '#ffffff', 7);
    const big = th === 'senior';
    let x = `
/* hu2 공통 보정 */
.hps-tag{font-size:13px!important;line-height:1.35}.hps-new{font-size:13px!important;min-width:20px;min-height:20px;line-height:20px}
.hps-login,.hp-all,.pt-all{min-height:44px!important;display:inline-flex!important;align-items:center;box-sizing:border-box}.hps-hr .hps-cta{min-height:44px!important;display:inline-flex;align-items:center;box-sizing:border-box}
.hps-facts dd small,.hpb-ft dd small,.pt-dt small{font-size:13px!important}.hp-ey{font-size:max(13px,1em)!important}.hpb-qc a{display:inline-flex;align-items:center;min-height:44px}
.s2im figcaption:empty{display:none}.s2im.grid figure{margin:0;background:transparent;border:0;box-shadow:none}.s2im.grid figure img{aspect-ratio:4/3!important;width:100%;height:auto;object-fit:cover;border-radius:${Math.min(T.r || 12, 16)}px;display:block}
@media (max-width:760px){.pt-hero .pt-g{display:flex!important;flex-direction:column;gap:20px}.pt-hero .pt-main,.pt-hero .pt-side{grid-column:auto!important;grid-row:auto!important;min-width:0;max-width:100%;box-sizing:border-box}.pt-srch{max-width:100%;min-width:0;box-sizing:border-box}.pt-srch>span:not(.pt-sb){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pt-sub{max-width:100%;overflow-wrap:anywhere}.pt-qk{margin-top:16px!important}footer a,.hps-ft a,.hps-gpv,.gf a{min-height:44px;display:inline-flex;align-items:center}.hp-cls a,.hps-sec a,.pt-tb a,.hp-tbl a{min-height:44px;display:inline-flex;align-items:center}}
/* hu2 방문자 갈래 */
.hu2-who{--hu2-a:${a};--hu2-on:${on};--hu2-at:${at};--hu2-a50:${a50};--hu2-a100:${a100};--hu2-a7:${a700};padding:${big ? 64 : 56}px 0;background:${T.bg || '#fff'};color:${ink};border-bottom:1px solid ${al(ink, .08)}}
.hu2-w{max-width:1200px;margin:0 auto;padding:0 32px;box-sizing:border-box}
.hu2-hd{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:24px}.hu2-hd h2{margin:0;font-size:${big ? 34 : 28}px;line-height:1.3;letter-spacing:-.02em;color:${ink}}
.hu2-ey{margin:0;font-size:${big ? 17 : 14}px;font-weight:700;letter-spacing:.06em;color:var(--hu2-at)}.hu2-nt2{margin:0;font-size:${big ? 17 : 15}px;color:${T.mu}}
.hu2-g{display:grid;grid-template-columns:1.25fr 1fr;gap:24px;align-items:start}
.hu2-roles{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.hu2-role{display:flex;align-items:center;gap:14px;min-height:${big ? 92 : 84}px;padding:16px 18px;box-sizing:border-box;border-radius:${Math.min(T.r || 12, 16)}px;border:1px solid ${al(ink, .12)};background:#fff;color:${ink};text-decoration:none;transition:border-color .15s,box-shadow .15s,transform .15s}
.hu2-role:hover,.hu2-role:focus-visible{border-color:var(--hu2-a);box-shadow:0 6px 18px ${al(ink, .08)};transform:translateY(-1px)}.hu2-role:focus-visible{outline:3px solid var(--hu2-a);outline-offset:2px}
.hu2-ri{flex:none;display:grid;place-items:center;width:${big ? 52 : 46}px;height:${big ? 52 : 46}px;border-radius:12px;background:var(--hu2-a50);color:var(--hu2-at)}
.hu2-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.hu2-rt b{font-size:${big ? 21 : 17}px;line-height:1.35;word-break:keep-all}.hu2-rt span{font-size:${big ? 17 : 14.5}px;line-height:1.45;color:${T.mu};word-break:keep-all}
.hu2-ra{flex:none;color:var(--hu2-at)}
.hu2-now{color:${ink};border-radius:${Math.min(T.r || 12, 16)}px;background:var(--hu2-a50);padding:20px 22px;box-sizing:border-box}
.hu2-nh{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.hu2-nh h3{margin:0;font-size:${big ? 21 : 17}px;line-height:1.4;color:${ink}}
.hu2-all{display:inline-flex;align-items:center;gap:4px;min-height:44px;font-size:${big ? 17 : 14.5}px;font-weight:700;color:var(--hu2-at);text-decoration:none;white-space:nowrap}
.hu2-now ol{list-style:none;margin:0;padding:0}.hu2-now li+li{border-top:1px solid ${al(ink, .1)}}
.hu2-nr{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:${big ? 72 : 64}px;padding:10px 0;color:${ink};text-decoration:none}
.hu2-nr:hover b,.hu2-nr:focus-visible b{text-decoration:underline;text-underline-offset:3px}
.hu2-nt{min-width:0;display:flex;flex-direction:column;gap:3px}.hu2-nt b{font-size:${big ? 19 : 16}px;line-height:1.4;word-break:keep-all}.hu2-nt span{font-size:${big ? 16 : 13.5}px;color:${T.mu};font-variant-numeric:tabular-nums}
.hu2-np{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px}.hu2-np em{font-style:normal;font-weight:800;font-size:${big ? 18 : 15}px;font-variant-numeric:tabular-nums}
.hu2-dd{font-style:normal;font-size:13px;font-weight:700;padding:2px 8px;border-radius:999px;background:${fit('#C2410C', '#ffffff', 4.5)};color:#fff;white-space:nowrap}.hu2-dd.on{background:var(--hu2-a7)}
.hu2-steps{display:flex;gap:8px;margin:8px 0 16px!important;flex-wrap:wrap}.hu2-steps li{border:0!important;display:flex;align-items:center;gap:8px;font-size:${big ? 17 : 14.5}px}.hu2-steps b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--hu2-a7);color:#fff;font-size:13px}
.hu2-btn{display:inline-flex;align-items:center;gap:8px;min-height:${big ? 60 : 48}px;padding:0 22px;border-radius:${T.br || 10}px;background:var(--hu2-a7);color:#fff;font-weight:700;font-size:${big ? 18 : 15.5}px;text-decoration:none}
@media (max-width:960px){.hu2-g{grid-template-columns:1fr}}
@media (max-width:760px){.hu2-who{padding:40px 0}.hu2-w{padding:0 20px}.hu2-hd{margin-bottom:16px}.hu2-hd h2{font-size:${big ? 27 : 23}px}.hu2-roles{grid-template-columns:1fr;gap:10px}.hu2-role{min-height:${big ? 80 : 68}px;padding:12px 14px}.hu2-now{padding:16px}.hu2-btn{width:100%;justify-content:center}}
`;
    if (th === 'tech') { const hd = T.hd || '#07111F'; const c2 = fit(mix(a, '#ffffff', .25), hd, 4.5);
      x += `.hu2-who{background:${hd};color:#E6EDF5;border-bottom:0;background-image:linear-gradient(${al('#ffffff', .045)} 1px,transparent 1px),linear-gradient(90deg,${al('#ffffff', .045)} 1px,transparent 1px);background-size:48px 48px}
.hu2-hd h2{color:#fff}.hu2-ey{color:${c2};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.hu2-ey::before{content:'> '}.hu2-nt2{color:#B6C2D1}
.hu2-role{background:${al('#ffffff', .04)};border-color:${al('#ffffff', .14)};color:#fff;border-radius:10px}.hu2-role:hover,.hu2-role:focus-visible{border-color:${c2};box-shadow:0 0 0 1px ${c2} inset;background:${al('#ffffff', .07)}}
.hu2-ri{background:${al(c2, .14)};color:${c2};border-radius:8px}.hu2-rt span{color:#B6C2D1}.hu2-ra{color:${c2}}
.hu2-now{background:#fff;border-radius:10px;box-shadow:0 20px 40px ${al('#000000', .35)}}.hu2-nt span,.hu2-np em{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em}
.hp-s h2,.hps-sec h2{letter-spacing:-.025em}`; }
    if (th === 'kids') { const C = [['#F3E8FF', '#6D28D9'], ['#FEF3C7', '#92400E'], ['#D1FAE5', '#065F46'], ['#FCE7F3', '#9D174D']];
      x += `.hu2-who{background:#FFFDF7}.hu2-hd h2{font-weight:850}.hu2-ey{letter-spacing:0}
${C.map(([bg, fg], i) => `.hu2-role.r${i}{background:${bg};border-color:transparent;color:#1E1533}.hu2-role.r${i} .hu2-ri{background:#fff;color:${fg};border-radius:50%}.hu2-role.r${i} .hu2-ra,.hu2-role.r${i} .hu2-rt span{color:${fg}}`).join('\n')}
.hu2-role{border-radius:24px;border-width:2px}.hu2-role:hover,.hu2-role:focus-visible{border-color:#1E1533;transform:translateY(-2px) rotate(-.4deg)}
.hu2-now{background:#fff;border:2px solid #1E1533;border-radius:24px;box-shadow:6px 6px 0 #FFD25E}.hu2-dd{border-radius:999px}.hu2-btn{border-radius:999px}`; }
    if (th === 'campus') {
      x += `.hu2-who{background:${T.bg || '#FBFAF6'};border-top:1px solid ${al(ink, .1)}}.hu2-hd{border-bottom:2px solid ${ink};padding-bottom:14px}.hu2-hd h2{font-weight:780}.hu2-ey{letter-spacing:.2em}
.hu2-roles{gap:0;border-top:0}.hu2-roles li{border-bottom:1px solid ${al(ink, .14)}}.hu2-roles li:nth-child(odd){border-right:1px solid ${al(ink, .14)}}
.hu2-role{border:0;border-radius:0;background:transparent;min-height:88px}.hu2-role:hover,.hu2-role:focus-visible{background:var(--hu2-a50);box-shadow:none;transform:none}
.hu2-ri{border-radius:4px;background:transparent;border:1px solid ${al(a, .35)}}
.hu2-now{background:#fff;border:1px solid ${al(ink, .14)};border-top:4px solid var(--hu2-a);border-radius:4px}
@media (max-width:760px){.hu2-roles li:nth-child(odd){border-right:0}}`; }
    if (th === 'senior') {
      x += `.hu2-who{background:${T.alt || '#F1F5FF'}}.hu2-role{border-width:2px;border-color:${al(ink, .22)}}.hu2-role:hover,.hu2-role:focus-visible{border-color:var(--hu2-a7);border-width:2px}
.hu2-ri{background:var(--hu2-a7);color:#fff}.hu2-ra{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--hu2-a50)}
.hu2-now{background:#fff;border:2px solid ${al(ink, .22)}}.hu2-dd{font-size:15px;padding:3px 10px}`; }
    return x; }

  /* ── 첫 화면 섹션 끝 찾기 ── */
  function heroEnd(h) { const re = /<section\b[^>]*class="[^"]*(?:hp-hero|hpl-hero|pt-hero|hps-hero)[^"]*"/; const m = re.exec(h); if (!m) return -1;
    let i = m.index + m[0].length, d = 1; const tag = /<\/?section\b/g; tag.lastIndex = i;
    for (let t2 = tag.exec(h); t2; t2 = tag.exec(h)) { d += t2[0][1] === '/' ? -1 : 1; if (!d) { const e = h.indexOf('>', t2.index); return e < 0 ? -1 : e + 1; } }
    return -1; }

  const base = siteHTML;
  siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { if (typeof h !== 'string' || !s || !MINE.includes(s.theme) || !HPT.tokens(s)) return h; if (s.hu2Off) return h;
      let out = h; const k = heroEnd(out); if (k > 0 && !/class="hu2-who"/.test(out)) out = out.slice(0, k) + whoHTML(s) + out.slice(k);
      const c = css(s).replace(/<\/?style/gi, ''); const j = out.lastIndexOf('</style>'); if (j >= 0) out = out.slice(0, j) + c + out.slice(j);
      return out; } catch (e) { console.error('hpup-b2', e); return h; } };
  window.siteHTML = siteHTML;
  window.HPUP_B2 = { ids: MINE, roles, css, whoHTML };
})();
