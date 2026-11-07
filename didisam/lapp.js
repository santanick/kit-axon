/* 디디쌤 학습자 앱 v27 — '나만의 AI 선생님' 앱 화면(iOS · Android 공통 PWA, 앱스토어 포장은 native/ Capacitor)
   대표님(2026-11-04): '학습자 앱은 완전히 AI 학습 비서처럼 UI UX를 구성해서 … 나만의 AI 선생님의 느낌이 강하게' · '기존 학습자 사이트를 통째로 교체' · '학습자가 직접 고르는 선생님' · 'iOS와 안드로이드 모두 대응'
   - 로그인한 학습자: 머리 · 바닥 · 아래 탭을 앱 화면으로 바꾼다. 첫 화면 = 선생님과의 대화(인사 · 오늘의 미션 카드 · 대화 · 추천 칩 · 입력창 · 음성 입력)
   - 처음 들어오면 선생님 고르기(다정한 코치 · 꼼꼼한 멘토 · 차분한 조력자 + 이름 바꾸기) → LR.lp.tutor.persona(학습 기록에만, 개인정보 아님)
   - 다른 화면(강의 · 결제 · 커뮤니티 · 회원정보 …)은 기존 화면 그대로, 앱 머리(뒤로 · 제목 · 선생님 부르기)와 아래 탭 안에서 연다 — 기능 · 데이터 · 테스트 동등성 유지
   - 방문자: 브라우저에서는 기관 홈페이지(스튜디오에서 만든 고객 홈페이지)를 그대로, 설치한 앱(standalone) · ?app=1에서는 앱 첫 화면(로그인 · 가입 · 로그인 없이 묻기)
   - 대답 엔진은 ltutor.js 그대로(규칙 엔진 → Claude, 과제 대신 쓰지 않음, 대화 내용 저장 안 함). 선생님 이름 · 말투는 TCFG()에 합쳐 Claude 지시에 들어간다
   - [기존 화면으로 보기]로 언제든 예전 화면(접근성 · 선호), 앱 화면으로 돌아오기도 한 번에
   learner.html에서 lles26.js 다음, lboot.js 바로 앞. */
'use strict';
(() => {
  const K = 'didisam.app.';
  const ls = { get: k => { try { return localStorage.getItem(K + k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(K + k) : localStorage.setItem(K + k, v); } catch (e) { } } };
  const standalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  /* 설치한 앱은 시작 주소에 기관 번호가 없으므로 마지막 기관을 기억해 둔다 */
  if (!LR.tid && (Q.get('app') === '1' || standalone())) { const t = ls.get('tid'); if (t) LR.tid = t; }
  const appOn = () => { try { return !!SITE() && LR.mode !== 'preview' && ls.get('classic') !== '1' && (!!LR.me || standalone() || Q.get('app') === '1'); } catch (e) { return false; } };
  window.lappOn = appOn;

  Object.assign(ICP, { search: ICP.search || 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4', sortk: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4', mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3', back: 'M15 5l-7 7 7 7', dots: 'M5 12h.01M12 12h.01M19 12h.01', install: 'M12 3v12M7 10l5 5 5-5M5 21h14', sparkle: ICP.sparkle || 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z', book2: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5', compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z' });

  /* ── 선생님(학습자가 고름) ── */
  const PERS = [
    { k: 'warm', n: '하루쌤', t: '다정한 코치', d: '작은 진전도 칭찬하며 꾸준히 이끌어 줘요', e: '🌤️', c: '#FF9800', tone: '다정하고 따뜻하게, 작은 진전도 구체적으로 칭찬하고 격려하며 다음 한 걸음을 제안합니다.', hi: '오늘도 같이 해 봐요! 제가 옆에서 챙길게요.' },
    { k: 'strict', n: '정쌤', t: '꼼꼼한 멘토', d: '목표 · 마감을 챙기고 정확하게 짚어 줘요', e: '📐', c: '#109BF1', tone: '핵심을 정확하고 간결하게 짚고, 목표 · 마감 · 다음 행동을 분명하게 제시합니다. 군더더기 없이 말합니다.', hi: '오늘 목표부터 정하고 시작하겠습니다.' },
    { k: 'calm', n: '온쌤', t: '차분한 조력자', d: '이해될 때까지 쉬운 말로 천천히 풀어 줘요', e: '🌿', c: '#00C53B', tone: '차분하고 쉬운 말로, 예시를 들어 한 단계씩 천천히 설명하고 이해했는지 확인합니다.', hi: '천천히 해도 괜찮아요. 하나씩 같이 풀어 봐요.' }
  ];
  const tutorRec = () => (typeof ltTutor === 'function' ? ltTutor() : ((LR.lp.tutor = LR.lp.tutor || {}), LR.lp.tutor));
  const persona = () => { if (!LR.me || !LR.lp) return null; const T = LR.lp.tutor; const p = T && T.persona; if (!p || !p.k) return null; const B = PERS.find(x => x.k === p.k) || PERS[0]; return { ...B, n: String(p.n || B.n).slice(0, 12) }; };
  window.ltPersona = persona;
  const AP = { pick: false, sel: null, nm: '', inst: null, rec: null };

  /* ── 공통 조각 ── */
  const jw = n => (typeof lJ === 'function' ? n + lJ(n, '과', '와') : n + '과');
  const av = (P, big) => `<span class="ap-av ${big ? 'big' : ''}" style="--pc:${P ? P.c : 'var(--pri)'}" aria-hidden="true"><i>${P ? P.e : ico('sparkle', big ? 30 : 18)}</i></span>`;
  const tName = () => (persona() || {}).n || TCFG().name;
  const hiTime = () => { const h = new Date().getHours(); return h < 5 ? '늦은 밤까지 수고 많아요.' : h < 11 ? '좋은 아침이에요.' : h < 14 ? '점심은 드셨어요?' : h < 18 ? '좋은 오후예요.' : '오늘 하루 수고 많았어요.'; };
  const who = () => (typeof lCall === 'function' ? lCall() : ((LR.me && (LR.me.nick || LR.me.sid)) || '') + '님');
  const hasComm = () => (SITE().pages || []).some(p => p.id === 'comm') || typeof lcCommHTML === 'function';
  const browse = () => document.querySelector('header.lh a[href="#shop"]') ? '#shop' : ((SITE().pages || []).some(p => p.id === 'shop') || typeof viewShop === 'function') ? '#shop' : (SITE().pages || []).some(p => p.id === 'courses') ? '#courses' : '#home';
  const SEC = { home: 'home', my: 'learn', c: 'learn', t: 'learn', bk: 'learn', dg: 'learn', cert: 'learn', badge: 'learn', mybooks: 'learn', shop: 'find', class: 'find', courses: 'find', tutorials: 'find', textbooks: 'find', tb: 'find', books: 'find', pay: 'find', payok: 'find', comm: 'comm', post: 'comm', write: 'comm', notice: 'comm', acct: 'me', connect: 'me', inbox: 'me', mypay: 'me', payd: 'me', msg: 'me', family: 'me', login: 'me', join: 'me' };
  /* v27.4 하나의 앱 · 여러 기관 — 가입한 기관 유형(시나리오)에 따라 탭 · 첫 화면 · 추천 질문 · 용어가 달라진다.
     이 기기에는 기관 번호 · 이름 · 유형만 기억한다(개인정보 없음). 운영: 디디쌤 통합 계정의 '내 기관' 목록(GET /api/me/orgs)으로 대체 */
  const TYL = { univ: '대학', corp: '기업', public: '공공기관', k12: '학원(초중고)', adult: '학원(성인)', lifelong: '평생교육원', voc: '직업훈련원' };
  const SCN = {
    univ: { learn: '내 교과목', find: '비교과', sub: me => `학번 ${me.sid || ''} · 교과 · 비교과 · 배지를 함께 챙겨요`, chips: [['이번 학기 이수 현황', '이번 학기 교과 · 비교과 이수 현황 알려줘'], ['비교과 추천', '나한테 맞는 비교과 프로그램 추천해줘'], ['과제 마감', '이번 주 과제 마감 정리해줘']], d: '교과 · 비교과 · 학번 로그인' },
    corp: { learn: '내 교육', find: '교육과정', sub: () => { const n = legalN(); return n ? `필수교육 미이수 ${n}건 · 마감 전에 먼저 알려 드려요` : '직무 교육 · 필수교육 이수를 함께 챙겨요'; }, chips: [['필수교육 마감', '필수(법정)교육 마감 알려줘'], ['직무 과정 추천', '내 직무에 맞는 교육과정 추천해줘'], ['이수 현황', '내 교육 이수 현황 정리해줘']], d: '직무 · 법정의무교육 · 이수 관리' },
    public: { learn: '내 교육', find: '교육과정', sub: () => { const n = legalN(); return n ? `필수교육 미이수 ${n}건 · 마감 전에 먼저 알려 드려요` : '직무 교육 · 필수교육 이수를 함께 챙겨요'; }, chips: [['필수교육 마감', '필수(법정)교육 마감 알려줘'], ['교육과정 추천', '나에게 맞는 교육과정 추천해줘'], ['이수 현황', '내 교육 이수 현황 정리해줘']], d: '공무 · 법정의무교육 · 이수 관리' },
    k12: { learn: '내 수업', find: '수업 찾기', sub: () => '숙제 · 출석 · 복습을 함께 챙겨요', chips: [['오늘 숙제', '오늘 해야 할 숙제 알려줘'], ['출석 확인', '내 출석 현황 알려줘'], ['복습 퀴즈', '복습 퀴즈 내줘']], d: '수업 · 숙제 · 출결 · 보호자' },
    adult: { learn: '내 강의', find: '둘러보기', sub: () => '수강 · 복습 · 자격증 준비를 함께 챙겨요', chips: [['이번 주 계획', '이번 주 학습 계획 짜줘'], ['자격증 준비', '자격증 준비 순서 알려줘'], ['복습 퀴즈', '복습 퀴즈 내줘']], d: '강좌 수강 · 결제 · 자격증' },
    lifelong: { learn: '내 강좌', find: '강좌 신청', sub: () => '강좌 신청 · 출석 · 수료를 함께 챙겨요', chips: [['신청할 강좌', '지금 신청할 수 있는 강좌 알려줘'], ['수료 조건', '수료 조건 알려줘'], ['이번 주 일정', '이번 주 수업 일정 알려줘']], d: '강좌 신청 · 출석 · 수료 기록' },
    voc: { learn: '내 훈련', find: '훈련과정', sub: () => '출석 · 훈련 일지 · 수료 기준을 함께 챙겨요', chips: [['출석 확인', '오늘 출석 현황 알려줘'], ['수료 기준', '훈련 수료 기준 알려줘'], ['훈련 일지', '훈련 일지 쓰는 법 알려줘']], d: '훈련과정 · 출결 · 수료' }
  };
  /* v29 대학 학사 LMS(전교생 메인)는 수업 · 출석 · 과제 · 시험 · 성적 중심 시나리오 */
  SCN.univ_lms = { learn: '이번 학기 강의', find: '비교과', sub: me => `학번 ${me.sid || ''} · 출석 · 과제 · 시험 · 성적을 함께 챙겨요`, chips: [['오늘 출석', '오늘 출석해야 할 수업 알려줘'], ['과제 · 시험 마감', '이번 주 과제 · 시험 마감 정리해줘'], ['학습 분량 점검', '이번 주 온라인 강의 중 덜 들은 차시 알려줘']], d: '교과 수업 · 스마트 출석 · 성적 · 학사 연동' };
  const oTy = () => (SITE() && SITE().org && SITE().org.type) || 'adult';
  const oEd = () => (SITE() && SITE().org && SITE().org.ed) || '';
  const scnExt = () => { for (const f of window.LSCN_PICK || []) { try { const x = f(oTy(), oEd()); if (x) return x; } catch (e) { console.error(e); } } return null; };
  const scn = () => scnExt() || (oTy() === 'univ' && oEd() === 'lms' ? SCN.univ_lms : SCN[oTy()]) || SCN.adult;
  /* v32.7 기관 유형별 가입 방식 — 학습자는 '특정 기관'에 가입한다(레거시 앱: 홈페이지 검색 → 홈페이지 가입(가입 질문 · 자동 수락/승인) · 일괄가입 최초 로그인).
     기본 안내는 유형별로 두고, 운영자가 설정한 실제 방식(laCfg: open · invite · code, 승인 · 만 14세 미만 · 본인인증)을 우선한다. */
  const JOIN = {
    univ: { t: '학번으로 가입', s: ['학교가 안내한 학번으로 가입하거나, 학교가 일괄 등록한 학번 · 접근코드로 첫 로그인해요', '학번 · 학과만 받아요(이름 · 연락처 · 이메일 없음)', '학교 통합 계정(SSO) 연결은 학교 연동 뒤 열려요'] },
    univ_lms: { t: '학교 수강 명단으로 시작', s: ['학교가 수강 명단을 일괄 등록하면 학번 · 접근코드로 첫 로그인해요', '첫 로그인 때 약관 동의 · 비밀번호를 정해요', '학번 · 학과만 받아요(이름 · 연락처 · 이메일 없음)'] },
    corp: { t: '회사 초대로 가입', s: ['교육 담당자가 보낸 초대 링크(메일 · 메신저)로 가입해요', '초대받지 않은 계정은 가입할 수 없어요', '부서 · 직급 질문에 답하면 필수교육이 바로 배정돼요'] },
    public: { t: '기관 초대 · 일괄 등록으로 시작', s: ['교육 담당 부서가 보낸 초대 링크나 접근코드로 시작해요', '필수(법정)교육은 가입하면 바로 배정돼요', '연락처는 기관 정책에 따라 최소한만 받아요'] },
    k12: { t: '학원 가입 신청', s: ['학원 홈페이지에서 가입 신청 → 원장님이 승인하면 수업을 볼 수 있어요', '만 14세 미만은 보호자 동의가 먼저 필요해요', '보호자는 학원이 보낸 초대 링크로 자녀와 연결해요'] },
    adult: { t: '바로 가입', s: ['이메일 · 카카오 · 네이버로 30초 만에 가입해요', '가입하면 바로 강좌 신청 · 결제 · 수강을 시작해요'] },
    lifelong: { t: '회원가입 후 강좌 신청', s: ['이메일 또는 SNS로 가입해요', '강좌 신청 → 수강료 결제 → 출석 · 수료 기록을 앱에서 확인해요'] },
    voc: { t: '훈련생 등록 후 시작', s: ['훈련기관이 수강 등록(HRD-Net)을 마치면 받은 접근코드로 첫 로그인해요', '법령에 따라 본인인증(휴대폰) · 출결 기록이 필요해요', '첫 로그인 때 약관 동의 · 비밀번호 설정을 해요'] }
  };
  const MODE = { open: '누구나 가입', invite: '초대받은 사람만', code: '기관이 등록한 학습자만' };
  function joinInfo(ty) { const T = ty || oTy(); const base = (T === 'univ' && oEd() === 'lms' && !ty) ? JOIN.univ_lms : JOIN[T] || JOIN.adult; let c = null; try { c = !ty && typeof laCfg === 'function' ? laCfg() : null; } catch (e) { c = null; }
    const mode = c ? c.mode : ({ corp: 'invite', public: 'invite', voc: 'code', univ: 'code' }[T] || 'open');
    const tags = [MODE[mode] || '', c && c.approve === 'manual' ? '운영자 승인 후 이용' : '', c && c.under14 ? '만 14세 미만 보호자 동의' : '', c && c.idv && c.idv.on ? '필요한 과정만 본인확인' : ''].filter(Boolean);
    return { ...base, mode, tags }; }
  function joinCard() { if (LR.me || isPar()) return ''; const J = joinInfo(); const pend = typeof LA !== 'undefined' && LA && LA.pend;
    if (pend) return `<section class="ap-join pend" aria-label="가입 상태"><span class="ap-tag w">가입 승인 대기 중</span><h2>운영자가 승인하면 바로 알려 드려요</h2><p>승인 전에도 강좌 · 공지를 둘러볼 수 있어요. 수강 · 결제는 승인 뒤에 열려요.</p><a class="ap-go ghost sm" href="${esc(browse())}">둘러보기</a></section>`;
    const cta = J.mode === 'open' ? `<a class="ap-go" href="#join">${esc(SITE().org.name)} 가입하기</a><a class="ap-lk" href="#login">이미 가입했어요 · 로그인</a>`
      : J.mode === 'invite' ? `<button type="button" class="ap-go" data-ap="orgs">초대 링크 붙여 넣기</button><a class="ap-lk" href="#login">이미 가입했어요 · 로그인</a>`
      : `<a class="ap-go" href="#login">${oTy() === 'univ' ? '학번' : '접근코드'}으로 시작하기</a><a class="ap-lk" href="#find/code">접근코드를 모르겠어요</a>`;
    return `<section class="ap-join" aria-labelledby="apJT"><p class="ap-jey">${esc(TYL[oTy()] || '기관')} · ${esc(SITE().org.name)}</p><h2 id="apJT">${esc(J.t)}</h2>${J.tags.length ? `<p class="ap-tags">${J.tags.map(t => `<span class="ap-tag">${esc(t)}</span>`).join('')}</p>` : ''}
      <ol>${J.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol>${cta}</section>`; }
  const legalN = () => { try { return typeof lLegal === 'function' ? lLegal().length : 0; } catch (e) { return 0; } };
  const orgs = () => { try { return JSON.parse(ls.get('orgs') || '[]').filter(o => o && o.tid); } catch (e) { return []; } };
  function orgSave() { if (!SITE() || !LR.tid || LR.mode === 'preview') return; const L = orgs(); const o = { tid: LR.tid, name: String(SITE().org.name || '').slice(0, 40), type: oTy(), me: !!LR.me, at: Date.now() };
    const i = L.findIndex(x => x.tid === o.tid); if (i < 0) L.unshift(o); else L[i] = { ...L[i], ...o, me: o.me || L[i].me }; try { ls.set('orgs', JSON.stringify(L.slice(0, 20))); } catch (e) { } }
  function demoRooms() { try { const r = JSON.parse(localStorage.getItem('didisam.rooms') || 'null'); return ((r && r.list) || []).filter(x => x.tid); } catch (e) { return []; } }
  const orgURL = tid => `learner.html?t=${encodeURIComponent(tid)}&app=1#home`;
  function orgChip() { const n = orgs().length; return `<button type="button" class="ap-org" data-ap="orgs" aria-label="기관 바꾸기 — 지금 ${esc(SITE().org.name)}">${ico('grid', 14)}<span>${esc(TYL[oTy()] || '기관')} · ${esc(SITE().org.name)}</span>${n > 1 ? `<i>${n}</i>` : ''}${ico('down', 14)}</button>`; }
  function orgSheet() { closeSheet(); const L = orgs(); const mine = new Set(L.map(o => o.tid)); const D = demoRooms().filter(r => !mine.has(r.tid));
    const row = (o, cur, demo) => `<li><button type="button" class="ap-orow${cur ? ' on' : ''}" data-ap="org-go" data-v="${esc(o.tid)}"${cur ? ' aria-current="true"' : ''}><span class="ap-oty">${esc(TYL[o.type] || '기관')}</span><b>${esc(o.name || o.tid)}</b><small>${esc((SCN[o.type] || SCN.adult).d)}${demo ? ' · 이 기기의 체험 기관' : o.me ? ' · 가입함' : ` · 가입 방법: ${esc(joinInfo(o.type).t)}`}</small>${cur ? `<em>지금 보는 중</em>` : ico('arrow', 16)}</button>${!cur && !demo ? `<button type="button" class="ap-ox" data-ap="org-x" data-v="${esc(o.tid)}" aria-label="${esc(o.name)} 목록에서 빼기">${ico('x', 14)}</button>` : ''}</li>`;
    const w = document.createElement('div'); w.className = 'ap-sheet'; w.id = 'apSheet';
    w.innerHTML = `<div class="ap-sh ap-osh" role="dialog" aria-modal="true" aria-labelledby="apOT"><h2 id="apOT">내 기관</h2><p>가입한 기관마다 탭 · 첫 화면 · 선생님이 챙기는 일이 달라져요.</p>${(L.length + D.length) > 3 ? `<label class="ap-osr"><span class="sr">기관 이름으로 찾기</span>${ico('search', 16)}<input type="search" id="apOS" placeholder="기관 이름으로 찾기" autocomplete="off"></label>` : ''}
      <ul class="ap-ol">${L.map(o => row(o, o.tid === LR.tid, false)).join('')}</ul>
      ${D.length ? `<h3 class="ap-oh">이 기기에서 만든 기관(체험)</h3><ul class="ap-ol">${D.map(r => row({ tid: r.tid, name: r.name, type: r.type }, false, true)).join('')}</ul>` : ''}
      <form id="apOrgF" class="ap-oadd"><label for="apOC">다른 기관 추가</label><div><input id="apOC" name="c" autocomplete="off" autocapitalize="off" placeholder="기관 코드 또는 초대 링크"><button type="submit" class="ap-go sm">열기</button></div><small>기관에서 받은 초대 링크나 코드를 붙여 넣으세요.</small></form>
      <nav><button type="button" data-ap="sheet-x">닫기</button></nav></div>`;
    document.body.appendChild(w); const f = w.querySelector('.ap-orow'); f && f.focus(); }

  /* v27.3 보호자 계정 — 학습자용 선생님 고르기 · 미션 대신 자녀 관리 중심(레거시 앱: 홈에서 연결된 자녀 클래스 · 메시지 · 청구서) */
  const isPar = () => !!(LR.me && LR.me.kind === 'parent');
  const SECP = { home: 'home', family: 'kids', msg: 'msg', mypay: 'pay', payd: 'pay', bill: 'pay', pay: 'pay', acct: 'me', inbox: 'me', notice: 'home', comm: 'home', post: 'home' };
  const cnt = () => { let m = 0, n = 0; try { m = typeof lcInbox === 'function' ? lcInbox().filter(x => !x.read).length : 0; } catch (e) { } try { n = typeof laItems === 'function' ? laItems().L.filter(x => !x.read).length : 0; } catch (e) { } return { m, n }; };
  const bdg = k => k ? `<i class="ap-bd">${k > 99 ? '99+' : k}</i>` : '';
  const topIcons = () => { const c = cnt(); return `<a class="ap-ib" href="#msg" aria-label="메시지${c.m ? ` · 안 읽은 메시지 ${c.m}개` : ''}">${ico('chat', 21)}${bdg(c.m)}</a><a class="ap-ib" href="#inbox" aria-label="알림${c.n ? ` · 새 알림 ${c.n}개` : ''}">${ico('bell', 21)}${bdg(c.n)}</a>`; };
  function kidsHTML() { let r = {}, pa = null; try { r = laRoom() || {}; pa = laPacct(); } catch (e) { }
    const PR = (r.parents || []).filter(p => pa && p.acct === pa.id); const K = PR.filter(p => p.status === '연결 완료'); const W = PR.filter(p => p.status === '연결 요청').length;
    const nm = id => { const m = (r.members || []).find(x => x.id === id); return m ? (m.nick || m.name || '자녀') : '자녀'; };
    return `<section class="ap-kids"><h2>연결된 자녀 <small>${K.length}명</small></h2>${K.length ? K.map(k => `<a class="ap-kid" href="#family">${av(null)}<span><b>${esc(nm(k.child))}</b><small>${esc(k.rel || '자녀')} · 출결 · 수강 현황 보기</small></span>${ico('arrow', 16)}</a>`).join('') : `<a class="ap-kid none" href="#family">${ico('link', 20)}<span><b>자녀와 연결하기</b><small>${W ? `확인할 연결 요청 ${W}건` : '자녀의 가족 연결 코드로 요청하세요'}</small></span>${ico('arrow', 16)}</a>`}</section>`; }
  function parHomeHTML() { const c = cnt(); const org = SITE().org.name; const tile = (h, i, t, d, k) => `<a class="ap-pt" href="${h}">${ico(i, 22)}<b>${esc(t)}</b><small>${esc(d)}</small>${bdg(k)}</a>`;
    return `<div class="ap-home ap-par"><header class="ap-top"><button type="button" class="ap-me" data-ap="tsheet" aria-label="앱 설정">${av(null)}<span><b>${esc(org)}</b><small>보호자 계정 · ${esc(LR.me.nick || '')}</small></span></button>${topIcons()}<button type="button" class="ap-ib" data-lux="menu" aria-label="전체 메뉴">${ico('menu', 21)}</button></header>
      <div class="ap-scroll ap-pscroll"><section class="ap-hero">${orgChip()}${av(null, true)}<h1>${esc(who())},<br>자녀의 학습을 함께 챙겨요</h1><p class="ap-sub">출결 · 수업 소식 · 청구서를 한곳에서 확인하세요.</p></section>
      <nav class="ap-pg4" aria-label="보호자 바로가기">${tile('#family', 'user', '자녀 관리', '출결 · 수강 현황', 0)}${tile('#msg', 'chat', '메시지', c.m ? `안 읽은 메시지 ${c.m}개` : '기관 · 강사 소식', c.m)}${tile('#mypay/bill', 'layers', '청구서 · 결제', '결제 대기 · 내역', 0)}${tile('#notice', 'bell', '공지사항', '전체 · 클래스 공지', 0)}</nav>
      ${kidsHTML()}</div></div>`; }
  function navHTML() { const s = (isPar() ? SECP : SEC)[route().a] || '';
    if (isPar()) { const c = cnt(); const it = [['home', '#home', 'home', '홈'], ['kids', '#family', 'user', '자녀'], ['msg', '#msg', 'chat', '메시지'], ['pay', '#mypay/bill', 'layers', '결제'], ['me', '#acct', 'grid', '나']];
      return `<nav class="ap-nav" aria-label="앱 메뉴">${it.map(([k, h, i, l]) => `<a href="${h}" class="${s === k ? 'on' : ''}"${s === k ? ' aria-current="page"' : ''}>${ico(i, 22)}<span>${esc(l)}</span>${k === 'msg' ? bdg(c.m) : ''}</a>`).join('')}</nav>`; }
    const it = [['home', '#home', 'sparkle', tName()], ['learn', LR.me ? '#my' : '#login/my', 'book2', scn().learn], ['find', browse(), 'compass', scn().find], ...(hasComm() ? [['comm', '#comm', 'msg', '커뮤니티']] : [['comm', '#notice', 'bell', '공지']]), ['me', LR.me ? '#acct' : '#login', 'user', LR.me ? '나' : '로그인']];
    return `<nav class="ap-nav" aria-label="앱 메뉴">${it.map(([k, h, i, l]) => `<a href="${h}" class="${s === k ? 'on' : ''}"${s === k ? ' aria-current="page"' : ''}>${ico(i, 22)}<span>${esc(l)}</span></a>`).join('')}</nav>`; }
  const TITLE = { my: '내 강의', c: '강의', t: '튜토리얼', bk: '디지털북', dg: '진단', cert: '수료증', badge: '배지', mybooks: '내 교재/교구', shop: '둘러보기', class: '클래스', courses: '코스', tutorials: '튜토리얼', textbooks: '교재/교구', tb: '교재/교구', books: '디지털북', pay: '결제하기', payok: '결제 완료', comm: '커뮤니티', post: '게시글', write: '글쓰기', notice: '공지사항', acct: '나', connect: '연결 · 알림', inbox: '알림', mypay: '결제 · 환불 내역', payd: '결제 상세', msg: '메시지', family: '가족', login: '로그인', join: '간편가입', find: '계정 찾기', privacy: '개인정보 처리방침' };
  function barHTML() { const a = route().a; const P = persona(); const pg = (SITE().pages || []).find(p => p.id === a);
    const t = (a === 'my' ? scn().learn : a === 'shop' ? scn().find : null) || TITLE[a] || (pg && pg.name) || ((document.querySelector('#lm h1, #lm h2') || {}).textContent || '').trim().slice(0, 18) || SITE().org.name;
    return `<header class="ap-bar" data-a="${esc(a)}"><button type="button" class="ap-ib" data-ap="back" aria-label="뒤로">${ico('back', 22)}</button><b class="ap-tt">${esc(t)}</b>${!isPar() && ['home', 'my', 'shop', 'courses'].includes(a) ? `<button type="button" class="ap-ib" data-ap="srch" aria-label="학습 찾기">${ico('search', 22)}</button>` : ''}${isPar() ? '<span class="ap-ib" aria-hidden="true"></span>' : `<button type="button" class="ap-call" data-tact="open" aria-label="${esc(tName())}에게 물어보기">${av(P)}<span>물어보기</span></button>`}</header>`; }

  /* ── 선생님 고르기(처음 한 번 · 언제든 바꾸기) ── */
  function pickHTML() { const cur = persona(); const sel = AP.sel || (cur && cur.k) || 'warm'; const B = PERS.find(x => x.k === sel); const nm = AP.nm || (cur && cur.k === sel ? cur.n : B.n);
    return `<section class="ap-pick" aria-labelledby="apPickT"><div class="ap-pw">
      <div class="ap-ph">${av(B, true)}<p class="ap-ey">${esc(SITE().org.name)} · 나만의 AI 선생님</p><h1 id="apPickT">${cur ? '선생님을 바꿔 볼까요?' : `${esc(who())}, 함께 공부할<br>AI 선생님을 골라 주세요`}</h1><p class="ap-lead">내 진도 · 과제 · 마감을 기억하고 매일 먼저 챙겨 주는 선생님이에요. 나중에 언제든 바꿀 수 있어요.</p></div>
      <form id="apPickF"><fieldset class="ap-pl"><legend class="sr">선생님 스타일</legend>${PERS.map(p => `<label class="ap-pc ${p.k === sel ? 'on' : ''}" style="--pc:${p.c}"><input type="radio" name="pk" value="${p.k}" ${p.k === sel ? 'checked' : ''}>${av(p)}<span><b>${esc(p.t)}</b><small>${esc(p.d)}</small><em>“${esc(p.hi)}”</em></span></label>`).join('')}</fieldset>
      <label class="ap-nm">선생님 이름<input name="nm" maxlength="12" value="${esc(nm)}" autocomplete="off" required></label>
      <button type="submit" class="ap-go" style="--pc:${B.c}">${esc(jw(nm || B.n))} 시작하기</button>
      ${cur ? '<button type="button" class="ap-lk" data-ap="pick-x">그대로 둘게요</button>' : '<button type="button" class="ap-lk" data-ap="pick-skip">기본 선생님으로 시작</button>'}</form></div></section>`; }

  /* ── 첫 화면: 선생님과의 대화 ── */
  function cardsHTML() { if (!LR.me) return ''; const A = typeof ltTodo === 'function' ? ltTodo() : []; if (!A.length) return '';
    return `<div class="ap-cards" role="list" aria-label="오늘의 미션">${A.map((a, i) => `<a role="listitem" class="ap-cd ${a.k === 'warn' ? 'warn' : ''} ${i === 0 ? 'first' : ''}" href="${esc(a.href)}"><small>${i === 0 ? '지금 할 일' : a.k === 'warn' ? '먼저 챙기기' : '오늘의 미션'}</small><b>${esc(a.h)}</b><span>${esc(a.d || '')}</span><i>${ico('arrow', 16)}</i></a>`).join('')}</div>`; }
  function statHTML() { if (!LR.me || typeof myStats !== 'function') return ''; const st = myStats();
    return `<p class="ap-st"><span><b>${st.streak}</b>일 연속</span><span>평균 진도 <b>${st.avg}%</b></span><span>배지 <b>${((LR.mine && LR.mine.badges) || []).length}</b>개</span></p>`; }
  function threadHTML() { const M = (LT.msgs || []).filter(m => !m.sys);
    return M.map(ltMsgHTML).join('').replace(/<span class="lt-orb sm" aria-hidden="true"><\/span>/g, av(persona())) + (LT.busy ? `<div class="lt-m">${av(persona())}<div class="lt-b"><span class="lt-dots"><i></i><i></i><i></i></span></div></div>` : ''); }
  function chipsHTML() { let C = [];
    try { C = (typeof LSAM === 'object' ? LSAM.screen().chips.filter(c => !c.kind).map(c => [c.l, c.q]) : ltChips().map(x => [x, x])); } catch (e) { C = []; }
    if (LR.me) C = [['오늘 뭐 하면 돼?', '오늘 뭐 하면 돼?'], ...scn().chips, ...C, ['내 학습 리포트', '내 학습 리포트 보여줘']];
    const seen = new Set(); C = C.filter(([l]) => !seen.has(l) && seen.add(l)).slice(0, 6);
    return `<div class="ap-chips" role="list" aria-label="추천 질문">${C.map(([l, q]) => `<button type="button" role="listitem" class="ap-chip" data-tact="q" data-v="${esc(q)}">${esc(l)}</button>`).join('')}</div>`; }
  function homeHTML() { const P = persona(); const me = LR.me; const C = TCFG();
    const brief = me && typeof ltBrief === 'function' ? ltBrief() : null; const first = me ? `${esc(who())}, ${hiTime()}\n${esc(P ? P.hi : '')}` : '';
    const instBox = !standalone() && ls.get('instx') !== '1' ? `<div class="ap-inst" role="note">${ico('install', 18)}<span><b>홈 화면에 앱으로 설치</b><small>${IOS ? '공유 버튼 → 「홈 화면에 추가」' : '한 번 누르면 앱처럼 바로 열려요'}</small></span><button type="button" class="ap-ib2" data-ap="install">설치</button><button type="button" class="ap-ix" data-ap="inst-x" aria-label="설치 안내 닫기">${ico('x', 16)}</button></div>` : '';
    return `<div class="ap-home ${me ? '' : 'guest'}" style="--pc:${P ? P.c : 'var(--pri)'}">
      <header class="ap-top"><button type="button" class="ap-me" data-ap="tsheet" aria-label="${esc(tName())} — 선생님 설정">${av(P)}<span><b>${esc(tName())}</b><small>${aiPill()}${me ? `${esc(P ? P.t : '내 AI 학습 비서')}` : '로그인 없이 물어볼 수 있어요'}</small></span></button>
        <button type="button" class="ap-ib" data-ap="srch" aria-label="학습 찾기">${ico('search', 21)}</button>${me ? topIcons() : ''}<button type="button" class="ap-ib" data-lux="menu" aria-label="전체 메뉴">${ico('menu', 21)}</button></header>
      <div class="ap-scroll" id="apScroll">
        <section class="ap-hero">${orgChip()}${av(P, true)}<h1>${me ? `${esc(who())},<br>오늘은 무엇을 함께 할까요?` : `나만의 AI 선생님과<br>공부를 시작해 보세요`}</h1>${me ? `<p class="ap-sub">${esc(scn().sub(me))}</p>` : ''}${statHTML()}</section>
        ${me ? '' : joinCard()}${instBox}${cardsHTML()}${me ? connRow() : ''}
        <div class="ap-th lai-th" aria-live="polite" aria-label="${esc(tName())}와의 대화">
          ${me ? `<div class="lt-m ap-hi">${av(P)}<div class="lt-b"><p>${nl(first)}</p>${brief ? `<p>${nl(brief.t)}</p>${brief.h || ''}` : ''}</div></div>` : `<div class="lt-m ap-hi">${av(null)}<div class="lt-b"><p>안녕하세요, ${esc(SITE().org.name)}의 ${esc(C.name)}입니다.\n강좌 · 수강 방법 · 가격을 바로 물어보세요. 로그인하면 내 진도와 과제에 맞춰 나만의 선생님이 매일 챙겨 드려요.</p><div class="ap-gb"><a class="ap-go sm" href="#login">로그인</a>${SITE().org.type === 'univ' ? '' : '<a class="ap-go sm ghost" href="#join">30초 간편가입</a>'}</div></div></div>`}
          ${threadHTML()}</div></div>
      <form class="ap-comp" id="apF">${chipsHTML()}<div class="ap-box"><label for="apQ" class="sr">${esc(tName())}에게 말하기</label><textarea id="apQ" rows="1" maxlength="800" placeholder="${me ? '무엇이든 말해 보세요' : '무엇이든 물어보세요'}"></textarea>
        ${(window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button type="button" class="ap-mic" data-ap="mic" aria-label="말로 묻기">${ico('mic', 20)}</button>` : ''}<button type="submit" class="ap-send" aria-label="보내기">${ico('up', 20)}</button></div>
        <small class="ap-note">${me ? '과제를 대신 써 주지 않고 함께 풀어요 · 대화 내용은 저장하지 않아요' : '개인정보는 적지 마세요'}</small></form></div>`; }

  /* ── v27.1 연결 · 알림(#connect): 캘린더 · 카카오톡 · 리마인더(lai-home 카드 재사용) + 앱 알림 ── */
  const conn = () => { const L = LR.lp; L.conn = L.conn && typeof L.conn === 'object' ? L.conn : {}; return L.conn; };
  const pushOK = () => 'Notification' in window && 'serviceWorker' in navigator;
  const pushOn = () => !!(conn().push && conn().push.on && pushOK() && Notification.permission === 'granted');
  function connCount() { const c = conn(); let n = 0; if (c.gcal && c.gcal.on) n++; if (pushOn()) n++; try { if (typeof laV === 'function' && (laV().ids[LR.me.sid] || {}).phone) n++; } catch (e) { } return n; }
  function connRow() { const n = connCount(); const ar = Array.isArray(LR.lp.auto) ? LR.lp.auto.filter(a => a.on).length : 0;
    return `<a class="ap-conn" href="#connect">${ico('cal', 20)}<span><b>캘린더 · 알림 연결</b><small>${n ? `${n}개 연결됨` : '캘린더 · 카카오톡 · 앱 알림'}${ar ? ` · 리마인더 ${ar}개 켜짐` : ''}</small></span>${ico('arrow', 16)}</a>`; }
  function pushCard() { const on = pushOn(); const den = pushOK() && Notification.permission === 'denied';
    const note = !pushOK() ? '이 브라우저는 앱 알림을 지원하지 않습니다.' + (IOS ? ' iPhone은 홈 화면에 앱을 설치(iOS 16.4 이상)한 뒤 켤 수 있어요.' : '') : IOS && !standalone() ? 'iPhone은 홈 화면에 앱을 설치한 뒤 그 앱에서 켤 수 있어요.' : den ? '알림이 차단되어 있어요. 휴대폰 설정 › 알림에서 이 앱을 허용해 주세요.' : on ? '오늘의 미션 · 선생님 답변 · 마감 임박을 알려 드려요.' : '오늘의 미션 · 선생님 답변 · 마감 임박을 앱 알림으로 받아요.';
    return `<div class="lai-sec ap-push"><div class="lai-sh"><h2>앱 알림 <small>${on ? '켜짐' : '꺼짐'}</small></h2></div><div class="ap-pr">${ico('bell', 20)}<span><b>${esc(tName())}의 알림</b><small>${esc(note)}</small></span>${on ? `<button type="button" class="lbtn sm ghost" data-ap="push-test">테스트</button><button type="button" class="lbtn sm ghost" data-ap="push-off">끄기</button>` : `<button type="button" class="lbtn sm pri" data-ap="push-on" ${pushOK() && !den && !(IOS && !standalone()) ? '' : 'disabled'}>켜기</button>`}</div><p class="lai-sub">지금은 앱을 열 때 하루 한 번 알려 드려요. 앱을 닫아 두어도 오는 알림(서버 푸시)은 운영 서버 연결 후 켜집니다.</p></div>`; }
  function connectHTML() { const more = typeof window.laiMore === 'function' ? window.laiMore() : '';
    return `<section class="ap-pg"><div class="ap-pw2"><p class="ap-lead2">${esc(tName())}이 챙긴 일정과 리마인더를 내 캘린더 · 카카오톡 · 앱 알림으로 받아요.</p>${pushCard()}<div class="ap-conn-a" hidden></div>${more}
      <div class="lai-sec ap-howto"><div class="lai-sh"><h2>캘린더에 넣는 법</h2></div><ol class="lai-steps"><li>위 Google Calendar 카드 → [일정 파일 받기(.ics)]</li><li>${IOS ? 'iPhone: 받은 파일을 열고 「모두 추가」' : '안드로이드: 받은 파일을 Google 캘린더로 열기'} · PC Outlook도 같은 파일</li><li>리마인더 · 수강 마감(3일 전 알림) · AI 선생님과 짠 이번 주 계획이 함께 들어가요.</li></ol></div></div></section>`; }
  async function pushEnable() { if (!pushOK()) return; let r = Notification.permission; if (r !== 'granted') { try { r = await Notification.requestPermission(); } catch (e) { r = 'denied'; } }
    if (r !== 'granted') { toast('알림이 허용되지 않았습니다. 휴대폰 설정에서 이 앱의 알림을 허용해 주세요.'); lrender(); return; }
    conn().push = { on: true, at: new Date().toISOString() }; LR.api.save(); toast('앱 알림을 켰습니다.', 'ok'); await notify(`${tName()}`, '앱 알림이 켜졌어요. 오늘의 미션과 선생님 답변을 알려 드릴게요.'); lrender(); }
  async function notify(title, body, tag) { try { const reg = await navigator.serviceWorker.ready; await reg.showNotification(title, { body, tag: tag || 'didisam', icon: 'app-icon-192.png', badge: 'app-icon-192.png', data: { url: location.href.split('#')[0] + '#home' } }); return true; } catch (e) { try { new Notification(title, { body }); return true; } catch (x) { return false; } } }
  function dailyNudge() { if (!LR.me || !pushOn()) return; const k = 'nudge.' + (LR.tid || '') + '.' + (LR.me.sid || '') ; const today = new Date().toDateString(); if (ls.get(k) === today) return; ls.set(k, today);
    const A = typeof ltTodo === 'function' ? ltTodo() : []; const qa = (LR.mine && Array.isArray(LR.mine.qa) ? LR.mine.qa.length : 0);
    if (A.length) notify(tName(), `오늘의 미션 ${A.length}개 · 먼저 「${A[0].h}」부터 해 볼까요?`, 'today'); else if (qa) notify(tName(), '선생님 답변이 도착했어요.', 'qa'); }

  /* ── v27.1 내 강의(#my) 앱 화면: 이어서 학습 카드 + 아래에 기존 학습 기록(배지 · 수료증 · 결제 · 활동) 그대로 ── */
  function myTopHTML() { if (typeof myStats !== 'function') return ''; const st = myStats(); const C = st.courses; const P = persona();
    const ring = p => `<span class="ap-rg" style="--p:${Math.max(0, Math.min(100, p))}"><b>${p}%</b></span>`;
    const card = (x, ex) => { const href = x.next ? `#c/${x.c.id}/${x.next.id}` : `#c/${x.c.id}`; const warn = x.st === 'returned';
      return `<a class="ap-cc ${x.done ? 'done' : ''} ${warn ? 'warn' : ''}${ex ? ' exp' : ''}" href="${esc(href)}">${ring(x.p)}<span class="ap-cm"><b>${esc(x.c.name)}</b><small>${ex ? '학습 기간이 끝났어요 · 기록만 볼 수 있어요' : x.done ? '수료 · 다시 보기' : warn ? '재제출 요청 · 피드백 확인' : x.next ? '다음 · ' + esc(x.next.title) : '시작하기'}</small>${ex ? '<em class="ap-exp">만료됨</em>' : x.c.end && !x.done ? `<em>${esc(x.c.end)} 마감</em>` : ''}</span><i>${x.done ? ico('check', 16) : ico('play', 16)}</i></a>`; };
    const today = new Date().toISOString().slice(0, 10); const exp = x => !x.done && x.c.end && String(x.c.end).slice(0, 10) < today;
    const stOf = x => exp(x) ? 'exp' : x.done ? 'done' : x.p > 0 ? 'ing' : 'pre'; const F = AP.myf || 'all'; const SO = AP.mys || 'recent';
    const live = C.filter(x => !exp(x)); const cntOf = k => k === 'all' ? live.length : live.filter(x => stOf(x) === k).length;
    let V = F === 'all' ? live : live.filter(x => stOf(x) === F); V = SO === 'name' ? [...V].sort((a, b) => a.c.name.localeCompare(b.c.name, 'ko')) : V;
    const EX = C.filter(exp);
    const ing = C.filter(x => !x.done), dn = C.filter(x => x.done);
    return `<section class="ap-my" style="--pc:${P ? P.c : 'var(--pri)'}"><div class="ap-pw2">
      <div class="ap-myh">${av(P)}<p>${C.length ? `${esc(who())}, 수강 중 ${ing.length}개 · 수료 ${dn.length}개예요.${ing[0] && ing[0].next ? ` 「${esc(ing[0].next.title)}」부터 이어 가요.` : ''}` : `${esc(who())}, 아직 수강 중인 강좌가 없어요. 둘러보고 시작해 볼까요?`}</p></div>
      ${C.length ? `<div class="ap-mf"><div class="ap-fc" role="tablist" aria-label="수강 상태">${[['all', '전체'], ['pre', '수강 전'], ['ing', '수강 중'], ['done', '수강 완료']].map(([k, l]) => `<button type="button" role="tab" class="ap-fch${F === k ? ' on' : ''}" aria-selected="${F === k}" data-ap="myf" data-v="${k}">${l} <i>${cntOf(k)}</i></button>`).join('')}</div>
        <button type="button" class="ap-srt" data-ap="mys" aria-label="정렬 바꾸기 — 지금 ${SO === 'name' ? '제목순' : '최근 수강순'}">${ico('sortk', 14)}${SO === 'name' ? '제목순' : '최근 수강순'}</button></div>
        <div class="ap-cl">${V.length ? V.map(x => card(x)).join('') : `<p class="ap-empty">${F === 'pre' ? '아직 시작하지 않은 강좌가 없어요.' : F === 'done' ? '아직 완료한 강좌가 없어요. 조금만 더 힘내요!' : '해당하는 강좌가 없어요.'}</p>`}</div>
        ${EX.length ? `<h2 class="ap-h2">기간 만료 <small>${EX.length}</small></h2><div class="ap-cl">${EX.map(x => card(x, 1)).join('')}</div>` : ''}`
        : `<a class="ap-go sm" href="${esc(browse())}">강좌 둘러보기</a>`}
      <div class="ap-qk"><button type="button" class="ap-chip" data-ap="ask" data-v="이번 주 학습 계획 짜줘">${ico('sparkle', 14)} 이번 주 계획 맡기기</button><button type="button" class="ap-chip" data-ap="ask" data-v="복습 퀴즈 내줘">복습 퀴즈</button><a class="ap-chip" href="#connect">${ico('cal', 14)} 캘린더에 넣기</a></div>
      <h2 class="ap-h2">전체 학습 기록</h2></div></section>`; }

  /* ── 선생님 설정 시트 ── */
  /* v27.2 Claude 연결 상태 — 이름 아래에 늘 보이게(데모: 이 브라우저 키 · 운영: 서버 키) */
  const KEYK = () => 'didisam.app.claude.' + (LR.tid || ''); /* v25 운영자 키와 분리 — 학습자 체험 키는 덮어쓰지 않는다 */
  const aiSt = () => { try { return typeof ltStatus === 'function' ? ltStatus() : { on: 0, t: '기본 안내' }; } catch (e) { return { on: 0, t: '기본 안내' }; } };
  function aiPill() { const s = aiSt(); return `<em class="ap-ai${s.on ? ' on' : ''}" data-ap-ai="${s.on ? 1 : 0}"><i></i>${esc(s.t)}</em>`; }
  const AIM = [['claude-haiku-5-5', 'Haiku 5.5', '빠르고 경제적'], ['claude-sonnet-5-5', 'Sonnet 5.5', '균형'], ['claude-opus-5-5', 'Opus 5.5', '최고 품질']];
  function aiDlg() { closeSheet(); if (LR.mode === 'live') return toast('운영 모드에서는 기관 서버가 Claude를 연결합니다.', 'ok');
    let c = null; try { c = JSON.parse(localStorage.getItem(KEYK()) || 'null'); } catch (e) { } const on = !!(c && c.key); const m = (c && c.model) || AIM[0][0];
    const d = document.createElement('dialog'); d.className = 'ap-dlg ap-aid'; d.setAttribute('aria-labelledby', 'apAiT');
    d.innerHTML = `<form id="apAiF" method="dialog"><h2 id="apAiT">Claude 연결 <small>체험용</small></h2>
      <p class="mini">${on ? `지금 <b>${esc(aiSt().t)}</b>로 답하고 있어요. 키는 이 기기 브라우저에만 저장되고 화면에 다시 보이지 않습니다.` : '키를 넣으면 선생님이 Claude로 답합니다. 키는 이 기기 브라우저에만 저장되고, 운영 시에는 기관 서버가 키를 보관합니다.'}</p>
      <label class="ap-fl">API 키<input type="password" name="k" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${on ? '바꿀 때만 입력' : 'sk-ant-…'}"></label>
      <fieldset class="ap-ms"><legend>모델</legend>${AIM.map(x => `<label><input type="radio" name="m" value="${x[0]}" ${x[0] === m ? 'checked' : ''}><b>${x[1]}</b><small>${x[2]}</small></label>`).join('')}</fieldset>
      <p class="ap-aimsg" role="status" aria-live="polite"></p>
      <div class="ap-dr">${on ? '<button type="button" class="ap-lk" data-ap="ai-off">연결 해제</button>' : ''}<button type="button" class="ap-lk" data-ap="dlg-x">닫기</button><button type="submit" class="ap-go sm">${on ? '저장' : '연결하기'}</button></div></form>`;
    document.body.appendChild(d); try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } d.addEventListener('close', () => d.remove()); const i = d.querySelector('[name=k]'); i && i.focus(); }
  async function aiSave(f) { const msg = f.querySelector('.ap-aimsg'); const b = f.querySelector('[type=submit]'); let c = null; try { c = JSON.parse(localStorage.getItem(KEYK()) || 'null'); } catch (e) { }
    const k = (f.querySelector('[name=k]').value || '').trim(); const m = (f.querySelector('[name=m]:checked') || {}).value || AIM[0][0]; const key = k || (c && c.key);
    if (!key) { msg.textContent = 'API 키를 입력해 주세요.'; msg.className = 'ap-aimsg bad'; return; }
    if (!/^sk-ant-/.test(key)) { msg.textContent = 'Anthropic API 키는 sk-ant- 로 시작합니다.'; msg.className = 'ap-aimsg bad'; return; }
    b.disabled = true; msg.className = 'ap-aimsg'; msg.textContent = '연결을 확인하는 중…';
    try { const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: m, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(r.status === 401 ? 'API 키가 올바르지 않습니다.' : r.status === 404 ? '이 키로는 고른 모델을 쓸 수 없습니다.' : r.status === 429 ? '요청이 많습니다. 잠시 후 다시 눌러 주세요.' : ((j.error && j.error.message) || '오류 ' + r.status)); }
    } catch (e) { b.disabled = false; msg.className = 'ap-aimsg bad'; msg.textContent = e instanceof TypeError ? '네트워크에 연결하지 못했습니다.' : e.message; return; }
    try { localStorage.setItem(KEYK(), JSON.stringify({ ...(c || {}), key, model: m, chat: true, docs: true, site: true })); } catch (e) { }
    f.closest('dialog').close(); lrender(); toast(`Claude 연결 완료 · ${aiSt().t}. 이제 질문해 보세요.`, 'ok'); }

  function tsheet() { const P = persona(); closeSheet(); const w = document.createElement('div'); w.className = 'ap-sheet'; w.id = 'apSheet';
    w.innerHTML = `<div class="ap-sh" role="dialog" aria-modal="true" aria-labelledby="apShT">${av(P, true)}<h2 id="apShT">${esc(isPar() ? SITE().org.name : tName())}</h2><p>${esc(isPar() ? '보호자 계정' : P ? `${P.t} · ${P.d}` : '내 AI 학습 비서')}</p>
      <nav>${LR.me && !isPar() ? `<button type="button" data-ap="pick">${ico('sparkle', 18)}선생님 바꾸기 · 이름 바꾸기</button>` : ''}${LR.me && !isPar() ? `<a href="#connect" data-ap="sheet-x">${ico('cal', 18)}캘린더 · 알림 연결</a>` : ''}${LR.mode !== 'live' && !isPar() ? `<button type="button" data-ap="ai">${ico('sparkle', 18)}Claude 연결 <small class="ap-shs">${esc(aiSt().t)}</small></button>` : ''}<button type="button" data-ap="orgs">${ico('grid', 18)}내 기관 · 기관 바꾸기 <small class="ap-shs">${orgs().length}곳</small></button><button type="button" data-ap="install">${ico('install', 18)}${standalone() ? '앱으로 실행 중' : '홈 화면에 앱으로 설치'}</button><button type="button" data-ap="classic">${ico('grid', 18)}기존 화면으로 보기</button><button type="button" data-ap="sheet-x">닫기</button></nav></div>`;
    document.body.appendChild(w); const f = w.querySelector('nav button'); f && f.focus(); }
  const srRecent = () => { try { const v = JSON.parse(ls.get('srq') || '[]'); return Array.isArray(v) ? v.slice(0, 10) : []; } catch (e) { return []; } };
  const srSeen = () => { try { const v = JSON.parse(ls.get('srv') || '[]'); return Array.isArray(v) ? v.slice(0, 10) : []; } catch (e) { return []; } };
  window.addEventListener('hashchange', () => { const m = /^#c\/([^/]+)/.exec(location.hash); if (!m) return; const L = [m[1], ...srSeen().filter(x => x !== m[1])].slice(0, 10); ls.set('srv', JSON.stringify(L)); });
  const srPool = () => { const S2 = SITE() || {}; const out = []; (S2.classes || []).forEach(c => out.push({ k: '클래스', n: c.name || '', d: [c.cat, c.teacher, (c.items || []).length ? `${c.items.length}개 항목` : ''].filter(Boolean).join(' · '), h: '#c/' + c.id, id: c.id, t: (c.items || []).map(i => i.title).join(' ') }));
    (S2.books || S2.textbooks || []).forEach(b => out.push({ k: '교재', n: b.name || b.title || '', d: b.desc || '', h: b.id ? '#book/' + b.id : '#shop', id: 'b:' + b.id, t: '' })); return out; };
  function srResults(q) { const P = srPool(); const k = q.trim().toLowerCase(); if (!k) return '';
    const hit = P.filter(x => (x.n + ' ' + x.d + ' ' + x.t).toLowerCase().includes(k)); const by = g => hit.filter(x => x.k === g);
    if (!hit.length) return `<p class="ap-empty">‘${esc(q)}’에 맞는 학습이 없어요. 다른 낱말로 찾아보세요.</p>`;
    const li = x => `<li><button type="button" class="ap-srr" data-ap="srch-go" data-v="${esc(q.trim())}" data-h="${esc(x.h)}"><span class="ap-oty">${esc(x.k)}</span><b>${esc(x.n)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</button></li>`;
    return ['클래스', '교재'].filter(g => by(g).length).map(g => `<h3 class="ap-oh">${g} <small>${by(g).length}</small></h3><ul class="ap-ol">${by(g).map(li).join('')}</ul>`).join(''); }
  function searchSheet() { closeSheet(); const R = srRecent(); const P = srPool(); const V = srSeen().map(id => P.find(x => x.id === id)).filter(Boolean);
    const w = document.createElement('div'); w.className = 'ap-sheet'; w.id = 'apSheet';
    w.innerHTML = `<div class="ap-sh ap-ssh" role="dialog" aria-modal="true" aria-labelledby="apST"><h2 id="apST">학습 찾기</h2>
      <label class="ap-osr big"><span class="sr">클래스 · 교재 이름으로 찾기</span>${ico('search', 18)}<input type="search" id="apSQ" placeholder="클래스 · 교재 이름으로 찾기" autocomplete="off" enterkeyhint="search"></label>
      <div id="apSR" aria-live="polite"></div>
      <div id="apS0">${R.length ? `<div class="ap-srh"><h3 class="ap-oh">최근 검색어</h3><button type="button" class="ap-lk" data-ap="srch-clr" data-v="srq">전체 삭제</button></div><div class="ap-fc wrap">${R.map(x => `<span class="ap-fch q"><button type="button" data-ap="srch-q" data-v="${esc(x)}">${esc(x)}</button><button type="button" class="x" data-ap="srch-del" data-v="${esc(x)}" aria-label="${esc(x)} 지우기">×</button></span>`).join('')}</div>` : ''}
      ${V.length ? `<div class="ap-srh"><h3 class="ap-oh">최근 본 학습</h3><button type="button" class="ap-lk" data-ap="srch-clr" data-v="srv">전체 삭제</button></div><ul class="ap-ol">${V.map(x => `<li><a class="ap-srr" href="${esc(x.h)}" data-ap="sheet-x"><span class="ap-oty">${esc(x.k)}</span><b>${esc(x.n)}</b></a></li>`).join('')}</ul>` : ''}
      ${!R.length && !V.length ? `<p class="ap-empty">찾고 싶은 클래스나 교재 이름을 입력하세요.</p>` : ''}</div>
      <nav><button type="button" data-ap="sheet-x">닫기</button></nav></div>`;
    document.body.appendChild(w); const i = w.querySelector('#apSQ'); i && i.focus(); }
  function closeSheet() { const w = document.getElementById('apSheet'); if (w) w.remove(); }

  /* ── 설치(Android: 설치 창 · iOS: 공유 → 홈 화면에 추가) ── */
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); AP.inst = e; });
  addEventListener('appinstalled', () => { ls.set('instx', '1'); toast('앱을 설치했습니다. 홈 화면에서 바로 여세요.', 'ok'); });
  async function install() { closeSheet();
    if (standalone()) return toast('이미 앱으로 실행 중입니다.', 'ok');
    if (AP.inst) { AP.inst.prompt(); try { const r = await AP.inst.userChoice; if (r.outcome === 'accepted') ls.set('instx', '1'); } catch (e) { } AP.inst = null; return; }
    const d = document.createElement('dialog'); d.className = 'ap-dlg'; d.setAttribute('aria-labelledby', 'apDlgT');
    d.innerHTML = IOS ? `<h2 id="apDlgT">iPhone · iPad에 설치</h2><ol><li>Safari 아래(또는 위)의 <b>공유</b> 버튼을 누릅니다.</li><li><b>「홈 화면에 추가」</b>를 고릅니다.</li><li>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 ${esc(SITE().org.name)} 앱이 생깁니다.</li></ol><p class="mini">Safari에서만 설치할 수 있어요. 카카오톡 · 다른 앱 안에서 열었다면 「Safari로 열기」를 먼저 눌러 주세요.</p><button type="button" class="ap-go" data-ap="dlg-x">확인</button>`
      : `<h2 id="apDlgT">안드로이드에 설치</h2><ol><li>Chrome 오른쪽 위 <b>⋮</b> 메뉴를 누릅니다.</li><li><b>「앱 설치」</b> 또는 <b>「홈 화면에 추가」</b>를 고릅니다.</li></ol><p class="mini">삼성 인터넷은 아래 메뉴 → 「현재 페이지 추가」 → 「홈 화면」입니다.</p><button type="button" class="ap-go" data-ap="dlg-x">확인</button>`;
    document.body.appendChild(d); try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } d.addEventListener('close', () => d.remove()); }

  /* ── 음성으로 묻기(지원하는 브라우저만: Android Chrome · iOS Safari 14.5+) ── */
  function mic(btn) { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    if (AP.rec) { try { AP.rec.stop(); } catch (e) { } return; }
    const r = new SR(); r.lang = 'ko-KR'; r.interimResults = true; r.maxAlternatives = 1; AP.rec = r; btn.classList.add('on'); btn.setAttribute('aria-label', '듣는 중 — 누르면 멈춤');
    const q = document.getElementById('apQ'); let fin = '';
    r.onresult = e => { let t = ''; for (const x of e.results) { t += x[0].transcript; if (x.isFinal) fin = t; } if (q) q.value = t; };
    r.onerror = () => toast('음성을 알아듣지 못했습니다. 마이크 권한을 확인해 주세요.');
    r.onend = () => { AP.rec = null; btn.classList.remove('on'); btn.setAttribute('aria-label', '말로 묻기'); if (fin.trim()) { q.value = ''; ltAsk(fin.trim()); } };
    try { r.start(); } catch (e) { AP.rec = null; btn.classList.remove('on'); } }

  /* ── 그리기 ── */
  function sync() { const th = document.querySelector('.ap-home .ap-th'); if (!th) return; th.querySelectorAll(':scope > .lt-m:not(.ap-hi)').forEach(x => x.remove()); th.insertAdjacentHTML('beforeend', threadHTML()); const sc = document.getElementById('apScroll'); if (sc && (LT.busy || (LT.msgs || []).some(m => m.me))) sc.scrollTop = sc.scrollHeight; }
  function apply() {
    const on = appOn(); document.body.classList.toggle('lapp', on); document.body.classList.remove('ap-homeon', 'ap-pickon');
    try { if (LR.tid && (on || LR.me)) { ls.set('tid', LR.tid); if (on) orgSave(); } } catch (e) { }
    const lm = document.getElementById('lm'); const app = document.getElementById('lapp'); if (!lm || !app) return;
    if (!on) { if (LR.me && route().a === 'home' && ls.get('classic') === '1' && !lm.querySelector('.ap-back')) lm.insertAdjacentHTML('afterbegin', `<div class="ap-back"><button type="button" data-ap="modern">${ico('sparkle', 16)} AI 선생님 앱 화면으로 보기</button></div>`); return; }
    const a = route().a; const needPick = LR.me && !isPar() && (!persona() || AP.pick) && a === 'home';
    if (needPick) { lm.innerHTML = pickHTML(); document.body.classList.add('ap-pickon'); }
    else if (a === 'connect' && LR.me) { lm.innerHTML = connectHTML(); }
    else if (a === 'home' && isPar()) { lm.innerHTML = parHomeHTML(); }
    else if (a === 'home') { if (LT.open) { LT.open = false; document.body.classList.remove('lt-on'); } lm.innerHTML = homeHTML(); document.body.classList.add('ap-homeon'); const sc = document.getElementById('apScroll'); if (sc && (LT.msgs || []).some(m => !m.sys)) sc.scrollTop = sc.scrollHeight; }
    if (a === 'my' && LR.me && !lm.querySelector('.ap-my')) { const h = lm.querySelector('section.myh'); if (h) h.hidden = true; lm.insertAdjacentHTML('afterbegin', myTopHTML()); }
    if (a !== 'home' && !needPick) { const ob = app.querySelector('.ap-bar'); if (!ob) app.insertAdjacentHTML('afterbegin', barHTML()); else if (ob.dataset.a !== a) ob.outerHTML = barHTML(); }
    if (LR.me && !needPick && !isPar()) dailyNudge();
    if (!app.querySelector('.ap-nav') && !needPick) app.insertAdjacentHTML('beforeend', navHTML());
  }
  { const base = lrender; lrender = (...x) => { base(...x); try { apply(); if (document.body.classList.contains('ap-homeon')) ltRender(); } catch (e) { console.error('lapp', e); } }; }
  { const base = ltRender; ltRender = (...x) => { const r = base(...x); try { sync(); } catch (e) { } return r; }; }

  /* ── 이벤트 ── */
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-ap]'); if (!el) return; const k = el.dataset.ap; if (el.tagName === 'A' && k === 'sheet-x') { closeSheet(); return; } e.preventDefault();
    if (k === 'back') { if (history.length > 1) history.back(); else location.hash = '#home'; return; }
    if (k === 'tsheet') return tsheet();
    if (k === 'myf') { AP.myf = el.dataset.v; lrender(); return; }
    if (k === 'mys') { AP.mys = AP.mys === 'name' ? 'recent' : 'name'; lrender(); return; }
    if (k === 'srch') return searchSheet();
    if (k === 'srch-q') { const i = document.getElementById('apSQ'); if (i) { i.value = el.dataset.v; i.dispatchEvent(new Event('input', { bubbles: true })); } return; }
    if (k === 'srch-del') { const L = srRecent().filter(x => x !== el.dataset.v); ls.set('srq', JSON.stringify(L)); searchSheet(); return; }
    if (k === 'srch-clr') { ls.set(el.dataset.v, '[]'); searchSheet(); return; }
    if (k === 'srch-go') { const v = el.dataset.v; const L = [v, ...srRecent().filter(x => x !== v)].slice(0, 10); ls.set('srq', JSON.stringify(L)); closeSheet(); location.hash = el.dataset.h; return; }
    if (k === 'orgs') return orgSheet();
    if (k === 'org-go') { const t = el.dataset.v; if (t === LR.tid) return closeSheet(); location.href = orgURL(t); return; }
    if (k === 'org-x') { const L = orgs().filter(o => o.tid !== el.dataset.v); ls.set('orgs', JSON.stringify(L)); orgSheet(); toast('목록에서 뺐습니다. 기관 계정은 그대로입니다.', 'ok'); return; }
    if (k === 'ai') return aiDlg();
    if (k === 'ai-off') { try { localStorage.removeItem(KEYK()); } catch (e) { } const d = el.closest('dialog'); d && d.close(); lrender(); toast('Claude 연결을 해제했습니다. 기본 안내로 답합니다.', 'ok'); return; }
    if (k === 'sheet-x') return closeSheet();
    if (k === 'pick') { closeSheet(); AP.pick = true; AP.sel = null; AP.nm = ''; if (route().a !== 'home') location.hash = '#home'; else lrender(); return; }
    if (k === 'pick-x') { AP.pick = false; AP.sel = null; AP.nm = ''; lrender(); return; }
    if (k === 'pick-skip') { tutorRec().persona = { k: 'warm', n: (TCFG().orgName || TCFG().name || '').replace(/^AI 튜터$/, '') || PERS[0].n, at: new Date().toISOString() }; LR.api.save(); lrender(); return; }
    if (k === 'install') return install();
    if (k === 'inst-x') { ls.set('instx', '1'); const b = el.closest('.ap-inst'); b && b.remove(); return; }
    if (k === 'dlg-x') { const d = el.closest('dialog'); d && d.close(); return; }
    if (k === 'classic') { closeSheet(); ls.set('classic', '1'); toast('기존 화면으로 바꿨습니다. 홈 위쪽에서 언제든 앱 화면으로 돌아올 수 있어요.', 'ok'); lrender(); return; }
    if (k === 'modern') { ls.set('classic', null); lrender(); return; }
    if (k === 'mic') return mic(el);
    if (k === 'push-on') return pushEnable();
    if (k === 'push-off') { if (conn().push) conn().push.on = false; LR.api.save(); toast('앱 알림을 껐습니다.', 'ok'); lrender(); return; }
    if (k === 'push-test') { notify(tName(), '테스트 알림이에요. 이렇게 알려 드릴게요.', 'test').then(ok => toast(ok ? '테스트 알림을 보냈습니다.' : '알림을 보내지 못했습니다.', ok ? 'ok' : '')); return; }
    if (k === 'ask') { location.hash = '#home'; setTimeout(() => ltAsk(el.dataset.v), 250); return; }
  });
  document.addEventListener('change', e => { const f = e.target.form; if (!f || f.id !== 'apPickF' || e.target.name !== 'pk') return; const nm = f.querySelector('[name=nm]'); const prev = PERS.find(x => x.k === AP.sel) || null;
    AP.sel = e.target.value; const B = PERS.find(x => x.k === AP.sel); if (!nm.value.trim() || (prev && nm.value === prev.n) || PERS.some(x => x.n === nm.value)) AP.nm = B.n; else AP.nm = nm.value; lrender(); setTimeout(() => { const r = document.querySelector(`#apPickF input[value="${AP.sel}"]`); r && r.focus(); }, 0); });
  document.addEventListener('input', e => { if (e.target.name === 'nm' && e.target.form && e.target.form.id === 'apPickF') { AP.nm = e.target.value; const b = e.target.form.querySelector('.ap-go'); if (b) b.textContent = `${jw(e.target.value.trim() || '선생님')} 시작하기`; }
    if (e.target.id === 'apOS') { const k = e.target.value.trim().toLowerCase(); document.querySelectorAll('#apSheet .ap-ol li').forEach(li => { li.hidden = !!k && !li.textContent.toLowerCase().includes(k); }); }
    if (e.target.id === 'apSQ') { const r = document.getElementById('apSR'), z = document.getElementById('apS0'); if (r) r.innerHTML = srResults(e.target.value); if (z) z.hidden = !!e.target.value.trim(); }
    if (e.target.id === 'apQ') { e.target.style.height = 'auto'; e.target.style.height = Math.min(132, e.target.scrollHeight) + 'px'; } });
  document.addEventListener('submit', e => { const f = e.target;
    if (f.id === 'apPickF') { e.preventDefault(); const k = (f.querySelector('[name=pk]:checked') || {}).value || 'warm'; const B = PERS.find(x => x.k === k) || PERS[0]; const n = (f.querySelector('[name=nm]').value || '').replace(/[<>]/g, '').trim().slice(0, 12) || B.n;
      tutorRec().persona = { k, n, at: new Date().toISOString() }; LR.api.save(); AP.pick = false; AP.sel = null; AP.nm = ''; LT.msgs = []; lrender(); toast(`${jw(n)} 함께 시작합니다.`, 'ok'); return; }
    if (f.id === 'apAiF') { e.preventDefault(); aiSave(f); return; }
    if (f.id === 'apOrgF') { e.preventDefault(); const v = (f.elements.c.value || '').trim(); let t = v; try { const u = new URL(v, location.href); t = u.searchParams.get('t') || (/^https?:/.test(v) ? '' : v); } catch (e2) { } t = String(t || '').replace(/[^\w.-]/g, '').slice(0, 64);
      if (!t) { toast('기관 코드나 초대 링크를 확인해 주세요.', ''); return; } location.href = orgURL(t); return; }
    if (f.id === 'apF') { e.preventDefault(); const ta = f.querySelector('textarea'); const v = ta.value; ta.value = ''; ta.style.height = ''; ltAsk(v); } });
  document.addEventListener('keydown', e => { if (e.target.id === 'apQ' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && !('ontouchstart' in window)) { e.preventDefault(); e.target.form.requestSubmit(); }
    if (e.key === 'Enter' && !e.isComposing && e.target.id === 'apSQ') { e.preventDefault(); const v = e.target.value.trim(); if (v) ls.set('srq', JSON.stringify([v, ...srRecent().filter(x => x !== v)].slice(0, 10))); const b = document.querySelector('#apSR .ap-srr'); b && b.focus(); }
    if (e.key === 'Escape' && document.getElementById('apSheet')) closeSheet(); });
  document.addEventListener('click', e => { if (e.target.id === 'apSheet') closeSheet(); });

  /* ── 오프라인 · 설치용 서비스 워커(https · localhost에서만) ── */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) && !Q.get('nosw')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
})();
