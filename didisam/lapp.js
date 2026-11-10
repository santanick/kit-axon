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
  const who = () => { const c = typeof lCall === 'function' ? lCall() : ((LR.me && (LR.me.nick || LR.me.sid)) || ''); return c && !/님$/.test(c) ? c + '님' : c; }; /* v37 L2: 첫 화면 호칭은 늘 '~님'(대학 학번만 있을 때 '20261008,'로 뜨던 것 — ltutor 인사와 같은 규칙) */
  const hasComm = () => (SITE().pages || []).some(p => p.id === 'comm') || typeof lcCommHTML === 'function';
  const browse = () => document.querySelector('header.lh a[href="#shop"]') ? '#shop' : ((SITE().pages || []).some(p => p.id === 'shop') || typeof viewShop === 'function') ? '#shop' : (SITE().pages || []).some(p => p.id === 'courses') ? '#courses' : '#home';
  const SEC = { home: 'home', my: 'learn', c: 'learn', t: 'learn', bk: 'learn', dg: 'learn', cert: 'learn', badge: 'learn', mybooks: 'learn', shop: 'find', class: 'find', courses: 'find', tutorials: 'find', textbooks: 'find', tb: 'find', books: 'find', pay: 'find', payok: 'find', comm: 'comm', post: 'comm', write: 'comm', notice: 'comm', acct: 'me', connect: 'me', inbox: 'me', mypay: 'me', payd: 'me', msg: 'me', family: 'me', login: 'me', join: 'me' };
  /* v27.4 하나의 앱 · 여러 기관 — 가입한 기관 유형(시나리오)에 따라 탭 · 첫 화면 · 추천 질문 · 용어가 달라진다.
     이 기기에는 기관 번호 · 이름 · 유형만 기억한다(개인정보 없음). 운영: 디디쌤 통합 계정의 '내 기관' 목록(GET /api/me/orgs)으로 대체 */
  const TYL = { univ: '대학', corp: '기업', public: '공공기관', k12: '학원(초중고)', adult: '학원(성인)', lifelong: '평생교육원', voc: '직업훈련원' };
  const SCN = {
    univ: { learn: '내 교과목', find: '교과목 찾기', sub: me => `학번 ${me.sid || ''} · 교과 · 비교과 · 배지를 함께 챙겨요`, chips: [['이번 학기 이수 현황', '이번 학기 교과 · 비교과 이수 현황 알려줘', 'status'], ['비교과 추천', '나한테 맞는 비교과 프로그램 추천해줘', 'rec'], ['과제 마감', '이번 주 과제 마감 정리해줘', 'due']], d: '교과 · 비교과 · 학번 로그인' },
    corp: { learn: '내 교육', find: '교육과정', sub: () => { const n = legalN(); return n ? `필수교육 미이수 ${n}건 · 마감 전에 먼저 알려 드려요` : '직무 교육 · 필수교육 이수를 함께 챙겨요'; }, chips: [['필수교육 마감', '필수(법정)교육 마감 알려줘', 'legal'], ['직무 과정 추천', '내 직무에 맞는 교육과정 추천해줘', 'rec'], ['이수 현황', '내 교육 이수 현황 정리해줘', 'status']], d: '직무 · 법정의무교육 · 이수 관리' },
    public: { learn: '내 교육', find: '교육과정', sub: () => { const n = legalN(); return n ? `필수교육 미이수 ${n}건 · 마감 전에 먼저 알려 드려요` : '직무 교육 · 필수교육 이수를 함께 챙겨요'; }, chips: [['필수교육 마감', '필수(법정)교육 마감 알려줘', 'legal'], ['교육과정 추천', '나에게 맞는 교육과정 추천해줘', 'rec'], ['이수 현황', '내 교육 이수 현황 정리해줘', 'status']], d: '공무 · 법정의무교육 · 이수 관리' },
    k12: { learn: '내 수업', find: '수업 찾기', sub: () => '숙제 · 출석 · 복습을 함께 챙겨요', chips: [['오늘 숙제', '오늘 해야 할 숙제 알려줘', 'due'], ['출석 확인', '내 출석 현황 알려줘', 'att'], ['복습 퀴즈', '복습 퀴즈 내줘', 'quiz']], d: '수업 · 숙제 · 출결 · 보호자' },
    adult: { learn: '내 강의', find: '둘러보기', sub: () => '수강 · 복습 · 자격증 준비를 함께 챙겨요', chips: [['이번 주 계획', '이번 주 학습 계획 짜줘', 'plan'], ['자격증 준비', '자격증 준비 순서 알려줘', 'certprep'], ['복습 퀴즈', '복습 퀴즈 내줘', 'quiz']], d: '강좌 수강 · 결제 · 자격증' },
    lifelong: { learn: '내 강좌', find: '강좌 신청', sub: () => '강좌 신청 · 출석 · 수료를 함께 챙겨요', chips: [['신청할 강좌', '지금 신청할 수 있는 강좌 알려줘', 'list'], ['수료 조건', '수료 조건 알려줘', 'rule'], ['이번 주 일정', '이번 주 수업 일정 알려줘', 'week']], d: '강좌 신청 · 출석 · 수료 기록' },
    voc: { learn: '내 훈련', find: '훈련과정', sub: () => '출석 · 학습 시간 · 수료 기준을 함께 챙겨요', chips: [['출석 확인', '오늘 출석 현황 알려줘', 'att'], ['수료 기준', '훈련 수료 기준 알려줘', 'rule'], ['오늘 학습 한도', '오늘 학습할 수 있는 시간 알려줘', 'limit']], d: '훈련과정 · 출결 · 수료' }
  };
  /* v29 대학 학사 LMS(전교생 메인)는 수업 · 출석 · 과제 · 시험 · 성적 중심 시나리오 */
  SCN.univ_lms = { learn: '이번 학기 강의', find: '비교과', sub: me => `학번 ${me.sid || ''} · 출석 · 과제 · 시험 · 성적을 함께 챙겨요`, chips: [['오늘 출석', '오늘 출석해야 할 수업 알려줘', 'att'], ['과제 · 시험 마감', '이번 주 과제 · 시험 마감 정리해줘', 'due'], ['학습 분량 점검', '이번 주 온라인 강의 중 덜 들은 차시 알려줘', 'gap']], d: '교과 수업 · 스마트 출석 · 성적 · 학사 연동' };
  const oTy = () => (SITE() && SITE().org && SITE().org.type) || 'adult';
  const oEd = () => (SITE() && SITE().org && SITE().org.ed) || '';
  const scnExt = () => { for (const f of window.LSCN_PICK || []) { try { const x = f(oTy(), oEd()); if (x) return x; } catch (e) { console.error(e); } } return null; };
  const scn = () => scnExt() || (oTy() === 'univ' && oEd() === 'lms' ? SCN.univ_lms : SCN[oTy()]) || SCN.adult;
  window.lappScn = () => scn(); /* v33: 기존 웹(lterm.js)이 같은 용어를 쓰도록 내보냄 */
  /* v32.7 기관 유형별 가입 방식 — 학습자는 '특정 기관'에 가입한다(레거시 앱: 홈페이지 검색 → 홈페이지 가입(가입 질문 · 자동 수락/승인) · 일괄가입 최초 로그인).
     기본 안내는 유형별로 두고, 운영자가 설정한 실제 방식(laCfg: open · invite · code, 승인 · 만 14세 미만 · 본인인증)을 우선한다. */
  const JOIN = {
    univ: { t: '학번으로 가입', s: ['학교가 일괄 등록한 학번과 학교에서 받은 접근코드로 로그인해요', '학번 · 학과만 받아요(이름 · 연락처 · 이메일 없음)', '학교 통합 계정(SSO) 연결은 학교 연동 뒤 열려요'] },
    univ_lms: { t: '학교 수강 명단으로 시작', s: ['학교가 수강 명단을 일괄 등록하면 학번 · 접근코드로 첫 로그인해요', '접근코드를 모르면 [접근코드를 모르겠어요]에서 재발급을 요청해요', '학번 · 학과만 받아요(이름 · 연락처 · 이메일 없음)'] },
    corp: { t: '회사 초대로 가입', s: ['교육 담당자가 보낸 초대 링크(메일 · 메신저)로 가입해요', '초대받지 않은 계정은 가입할 수 없어요', '가입하면 필수(법정)교육이 내 교육에 바로 배정돼요'] },
    public: { t: '기관 초대 · 일괄 등록으로 시작', s: ['교육 담당 부서가 보낸 초대 링크나 접근코드로 시작해요', '가입하면 필수(법정)교육이 내 교육에 바로 배정돼요', '연락처는 기관 정책에 따라 최소한만 받아요'] },
    k12: { t: '학원 가입 신청', s: ['학원 홈페이지에서 가입 신청 → 원장님이 승인하면 수업을 볼 수 있어요', '만 14세 미만은 보호자 동의가 먼저 필요해요', '보호자는 학원이 보낸 초대 링크로 자녀와 연결해요'] },
    adult: { t: '바로 가입', s: ['이메일 · 카카오 · 네이버로 30초 만에 가입해요', '가입하면 바로 강좌 신청 · 결제 · 수강을 시작해요'] },
    lifelong: { t: '회원가입 후 강좌 신청', s: ['이메일 또는 SNS로 가입해요', '강좌 신청 → 수강료 결제 → 출석 · 수료 기록을 앱에서 확인해요'] },
    voc: { t: '훈련생 등록 후 시작', s: ['훈련기관이 수강 등록(HRD-Net)을 마치면 받은 접근코드로 첫 로그인해요', '법령에 따라 본인인증(휴대폰) · 출결 기록이 필요해요', '첫 로그인 때 약관 동의 · 비밀번호 설정을 해요'] }
  };
  const MODE = { open: '누구나 가입', invite: '초대받은 사람만', code: '기관이 등록한 학습자만' };
  function joinInfo(ty) { const T = ty || oTy(); const base = (T === 'univ' && oEd() === 'lms' && !ty) ? JOIN.univ_lms : JOIN[T] || JOIN.adult; let c = null; try { c = !ty && typeof laCfg === 'function' ? laCfg() : null; } catch (e) { c = null; }
    const def = ({ corp: 'invite', public: 'invite', voc: 'code', univ: 'code' }[T] || 'open'); const mode = c ? c.mode : def;
    const GEN = { open: { t: '바로 가입', s: ['이메일이나 간편 로그인으로 가입해요', '가입하면 바로 강좌를 둘러보고 신청할 수 있어요'] }, invite: { t: '초대로 가입', s: ['기관이 보낸 초대 링크(메일 · 메신저)로 가입해요', '초대받지 않은 계정은 가입할 수 없어요'] }, code: { t: '기관 등록 후 시작', s: ['기관이 미리 등록한 아이디(학번 · 접근코드)로 첫 로그인해요', '코드를 모르면 기관 담당자에게 문의하세요'] } };
    const B0 = mode === def ? base : GEN[mode] || base; const manual = c && c.approve === 'manual';
    const S0 = B0.s.map(x => manual ? x : x.replace('원장님이 승인하면', '가입하면 바로'));
    const tags = [MODE[mode] || '', c && c.approve === 'manual' ? '운영자 승인 후 이용' : '', c && c.under14 ? '만 14세 미만 보호자 동의' : '', c && c.idv && c.idv.on ? '필요한 과정만 본인확인' : ''].filter(Boolean);
    return { ...B0, s: manual && mode === 'open' && !S0.some(x => /승인/.test(x)) ? [...S0, '운영자가 승인하면 수강 · 결제가 열려요'] : S0, mode, tags }; }
  /* 승인 대기: 새로 고침 · 앱 재실행 뒤에도 유지(기관별 계정 id만 기억, 승인 · 거절되면 지움) */
  function pendSid() { const k = 'pend.' + (LR.tid || ''); let id = (typeof LA !== 'undefined' && LA && LA.pend) || ls.get(k); if (!id) return null;
    try { const a = typeof laFind === 'function' ? laFind(id) : null; if (a && a.grade && a.grade !== '승인 대기') { ls.set(k, null); return null; } if (!a && !(LA && LA.pend) && LR.mode !== 'live') { ls.set(k, null); return null; } } catch (e) { }
    ls.set(k, id); return id; }
  /* v33 휴대폰 기존 웹 방문자 홈 첫 화면 가입 진입(500명 QA 제안) — 기관 가입 방식(바로 가입 · 초대 · 접근코드)에 맞는 주 버튼 하나 */
  function joinStrip() { if (LR.me || pendSid()) return ''; const J = joinInfo();
    const cta = J.mode === 'open' ? `<a class="lbtn pri" href="#join">가입하기</a><a class="lgj-lk" href="#login">로그인</a>`
      : J.mode === 'invite' ? `<a class="lbtn pri" href="#login">초대받은 계정으로 시작</a><span class="lgj-s">초대 링크(메일 · 메신저)를 열면 가입돼요</span>`
      : `<a class="lbtn pri" href="#login">${oTy() === 'univ' ? '학번' : '접근코드'}으로 시작</a><a class="lgj-lk" href="#find/code">접근코드를 모르겠어요</a>`;
    return `<section class="lgj" aria-label="가입 · 시작"><div><b>${esc(J.t)}</b><small>${esc(J.s[0] || '')}</small></div><div class="lgj-a">${cta}</div></section>`; }
  function joinCard() { if (LR.me || isPar()) return ''; const J = joinInfo(); const pend = pendSid();
    if (pend) return `<section class="ap-join pend" aria-label="가입 상태"><span class="ap-tag w">가입 승인 대기 중</span><h2>운영자가 승인하면 바로 알려 드려요</h2><p>승인 전에도 강좌 · 공지를 둘러볼 수 있어요. 수강 · 결제는 승인 뒤에 열려요.</p><a class="ap-go ghost sm" href="${esc(browse())}">둘러보기</a></section>`;
    const cta = J.mode === 'open' ? `<a class="ap-go" href="#join">${esc(SITE().org.name)} 가입하기</a><a class="ap-lk" href="#login">이미 가입했어요 · 로그인</a>`
      : J.mode === 'invite' ? `<button type="button" class="ap-go" data-ap="orgs" data-v="add">초대 링크 붙여 넣기</button><a class="ap-lk" href="#login">이미 가입했어요 · 로그인</a>`
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
    document.body.appendChild(w); const f = AP.focusAdd ? w.querySelector('#apOC') : w.querySelector('.ap-orow'); AP.focusAdd = false; f && f.focus(); if (!(L.length + D.length)) { const h = w.querySelector('#apOC'); h && h.focus(); } }

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
  /* v33 보호자 PC 웹(기존 화면) 홈 — 학생 기능(AI 튜터 · 내 학습 · 강좌) 대신 자녀 현황 · 청구서 · 알림 중심(QA #56) */
  function parClassicHTML() { const c = cnt(); const tile = (h, i, t, d, k) => `<a class="lpar-t" href="${h}">${ico(i, 22)}<span><b>${esc(t)}</b><small>${esc(d)}</small></span>${bdg(k)}</a>`;
    return `<section class="sec lpar-home"><div class="in"><p class="lpar-ey">${esc(SITE().org.name)} · 보호자 계정</p><h1>${esc(who())}, 자녀의 학습을 함께 챙겨요</h1><p class="lead">자녀 현황 · 청구서 · 알림을 한곳에서 확인하세요. 수강 · 과제 제출 · AI 튜터는 자녀 계정에서 이용해요.</p>
      <nav class="lpar-g" aria-label="보호자 바로가기">${tile('#family', 'user', '자녀 현황', '출결 · 진도 · 성적', 0)}${tile('#mypay/bill', 'layers', '청구서 · 결제', '결제 대기 · 내역', 0)}${tile('#inbox', 'bell', '알림', c.n ? `새 알림 ${c.n}개` : '기관 · 수업 알림', c.n)}${tile('#msg', 'chat', '메시지', c.m ? `안 읽은 메시지 ${c.m}개` : '기관 · 강사 소식', c.m)}${tile('#notice', 'grid', '공지사항', '전체 · 수업 공지', 0)}</nav>
      ${kidsHTML()}</div></section>`; }
  function navHTML() { const s = (isPar() ? SECP : SEC)[route().a] || '';
    if (isPar()) { const c = cnt(); const it = [['home', '#home', 'home', '홈'], ['kids', '#family', 'user', '자녀'], ['msg', '#msg', 'chat', '메시지'], ['pay', '#mypay/bill', 'layers', '결제'], ['me', '#acct', 'grid', '나']];
      return `<nav class="ap-nav" aria-label="앱 메뉴">${it.map(([k, h, i, l]) => `<a href="${h}" class="${s === k ? 'on' : ''}"${s === k ? ' aria-current="page"' : ''}>${ico(i, 22)}<span>${esc(l)}</span>${k === 'msg' ? bdg(c.m) : ''}</a>`).join('')}</nav>`; }
    const it = [['home', '#home', 'sparkle', tName()], ['learn', LR.me ? '#my' : '#login/my', 'book2', scn().learn], ['find', browse(), 'compass', scn().find], ...(hasComm() ? [['comm', '#comm', 'msg', '커뮤니티']] : [['comm', '#notice', 'bell', '공지']]), ['me', LR.me ? '#acct' : '#login', 'user', LR.me ? '나' : '로그인']];
    return `<nav class="ap-nav" aria-label="앱 메뉴">${it.map(([k, h, i, l]) => `<a href="${h}" class="${s === k ? 'on' : ''}"${s === k ? ' aria-current="page"' : ''}>${ico(i, 22)}<span>${esc(l)}</span></a>`).join('')}</nav>`; }
  const TITLE = { my: '내 강의', c: '강의', t: '튜토리얼', bk: '디지털북', dg: '진단', cert: '수료증', badge: '배지', mybooks: '내 교재/교구', shop: '둘러보기', class: '클래스', courses: '코스', tutorials: '튜토리얼', textbooks: '교재/교구', tb: '교재/교구', books: '디지털북', pay: '결제하기', payok: '결제 완료', comm: '커뮤니티', post: '게시글', write: '글쓰기', notice: '공지사항', acct: '나', connect: '연결 · 알림', inbox: '알림', mypay: '결제 · 환불 내역', payd: '결제 상세', msg: '메시지', family: '가족', login: '로그인', join: '간편가입', find: '계정 찾기', privacy: '개인정보 처리방침' };
  window.LAPP_FIND = () => { try { if (!document.body.classList.contains('lapp')) return ''; const pg = (SITE().pages || []).find(p => p.id === 'shop'); return (pg && pg.name) || scn().find || ''; } catch (e) { return ''; } }; /* v32.9: 둘러보기 본문 제목을 기관 용어와 맞춤 */
  function barHTML() { const a = route().a; const P = persona(); const pg = (SITE().pages || []).find(p => p.id === a);
    const h1t = ['join', 'acct', 'find', 'login'].includes(a) ? ((document.querySelector('#lm h1') || {}).textContent || '').trim().slice(0, 18) : ''; /* v32.9: 계정 화면은 본문 제목과 같게 */
    const lh = (() => { try { const K = typeof window.lhKey === 'function' ? window.lhKey() : { k: a, top: true }; const v = K.top && SITE().hp && SITE().hp.lhead && SITE().hp.lhead[K.k]; return v && typeof v.t === 'string' ? v.t.trim().slice(0, 18) : ''; } catch (e) { return ''; } })(); /* v37 L2: 사이트 편집기에서 바꾼 학습 페이지 머리글 제목(hp.lhead)을 앱 위 줄에도 */
    const t = h1t || (a === 'my' ? scn().learn : null) || lh || (pg && pg.name) || (a === 'shop' ? scn().find : null) || TITLE[a] || ((document.querySelector('#lm h1, #lm h2') || {}).textContent || '').trim().slice(0, 18) || SITE().org.name;
    return `<header class="ap-bar" data-a="${esc(a)}"><button type="button" class="ap-ib" data-ap="back" aria-label="뒤로">${ico('back', 22)}</button><b class="ap-tt">${esc(t)}</b>${!isPar() && ['home', 'my', 'shop', 'courses'].includes(a) ? `<button type="button" class="ap-ib" data-ap="srch" aria-label="학습 찾기">${ico('search', 22)}</button>` : ''}${isPar() ? '<span class="ap-ib" aria-hidden="true"></span>' : `<button type="button" class="ap-call" data-tact="open" aria-label="${esc(tName())}에게 물어보기">${av(P)}<span>물어보기</span></button>`}</header>`; }

  /* ── 선생님 고르기(처음 한 번 · 언제든 바꾸기) ── */
  /* v33 R2(#20): 결제 직후 선생님을 아직 고르지 않았으면 고르기 → 첫 강의로 이어 간다 */
  const AFK = 'didisam.ap.after';
  const afterGet = () => { try { return sessionStorage.getItem(AFK) || ''; } catch (e) { return AP.after || ''; } };
  const afterSet = h => { AP.after = h || ''; try { h ? sessionStorage.setItem(AFK, h) : sessionStorage.removeItem(AFK); } catch (e) { } };
  const afterGo = () => { const h = afterGet(); afterSet(''); if (h && /^#c\//.test(h)) { setTimeout(() => { location.hash = h; }, 0); return true; } return false; };
  function pickHTML() { const cur = persona(); const sel = AP.sel || (cur && cur.k) || 'warm'; const B = PERS.find(x => x.k === sel); const nm = AP.nm || (cur && cur.k === sel ? cur.n : B.n);
    return `<section class="ap-pick" aria-labelledby="apPickT"><div class="ap-pw">
      <div class="ap-ph">${av(B, true)}<p class="ap-ey">${esc(SITE().org.name)} · 나만의 AI 선생님</p><h1 id="apPickT">${cur ? '선생님을 바꿔 볼까요?' : `${esc(who())}, 함께 공부할<br>AI 선생님을 골라 주세요`}</h1><p class="ap-lead">내 진도 · 과제 · 마감을 기억하고 매일 먼저 챙겨 주는 선생님이에요. 나중에 언제든 바꿀 수 있어요.${afterGet() ? ' 고르면 첫 강의로 바로 이어져요.' : ''}</p></div>
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
  /* ── v33 홈 추천 칩의 의도(intent) — 칩마다 의도에 맞는 답 · 이동을 정해 둔다(QA #34). 값이 정해진 안내라 Claude가 지어내지 않게 기본 안내로 답한다 ── */
  const IN = (() => {
    const T = k => (typeof lTerm === 'function' ? lTerm(k) : '과정'); const J = w => (typeof lJ === 'function' ? lJ(w, '이', '가') : '이'); const LK = A => ltLinks(A.filter(Boolean)); const BT = A => ltBtns(A.filter(Boolean));
    const td = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
    const addD = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
    const fm = d => (typeof lwFmt === 'function' ? lwFmt(d) : d) || d;
    const cfg = () => { const c = SITE() && SITE().cpl; return c && c.on ? c : null; };
    const st = () => { try { return myStats(); } catch (e) { return { courses: [], avg: 0 }; } };
    const rep = L => `<div class="lt-rep">${L.join('')}</div>`;
    const row = (a, b, c) => `<div><span>${esc(a)}</span>${b ? `<small>${esc(b)}</small>` : ''}<b>${esc(c)}</b></div>`;
    /* 출결 수업(회차 · 라이브 · 오프라인)이 있는 내 클래스 */
    const attCls = () => { if (typeof lwCls !== 'function') return []; return (SITE().classes || []).map(c => { try { const x = lwCls(c.id); return x && x.enrolled !== false && lwUnits(x).length && (x.enrolled || st().courses.some(y => y.c.id === c.id)) ? x : null; } catch (e) { return null; } }).filter(Boolean); };
    const shopL = () => { try { const sh = typeof shInfo === 'function' ? shInfo() : null; return ((sh && sh.classes) || []).filter(c => (typeof shState === 'function' ? shState(c.id) : 'none') === 'none'); } catch (e) { return []; } };
    const dueOf = (c, it) => String((it.rules && (it.rules.due || it.rules.to)) || it.due || c.end || '').replace('T', ' ').slice(0, 16);
    const H = {
      att() { const L = attCls(); const t0 = td();
        if (!L.length) return { t: `출결을 기록하는 ${T('cls')}${J(T('cls'))} 아직 없어요. 온라인 강의는 진도로 학습 여부를 확인해요.`, h: LK([{ h: '내 학습 보기', d: '진도 · 수료 상태', href: '#my' }]) };
        const R = L.map(c => ({ c, s: lwStat(c) })); const A0 = (R[0].s.A || {}); const today = R.flatMap(x => x.s.U.filter(u => u.date === t0).map(u => ({ c: x.c, u })));
        return { t: `내 출결 현황이에요.${today.length ? ` 오늘 수업 ${today.length}개: ${today.map(x => `「${x.c.name}」${x.u.from ? ' ' + x.u.from : ''}`).join(', ')}.` : ' 오늘 예정된 출결 수업은 없어요.'} 출석률 ${DDAtt.MIN}% 이상이 수료 출결 기준이에요(${A0.rule || ''}).`,
          h: rep(R.map(x => row(x.c.name, `출석 ${x.s.n.출석} · 지각 ${x.s.n.지각} · 조퇴 ${x.s.n.조퇴} · 결석 ${x.s.n.결석}${x.s.n.미입력 ? ` · 미입력 ${x.s.n.미입력}` : ''}`, x.s.rate == null ? '기록 전' : `출석률 ${x.s.rate}%`))) + LK(R.slice(0, 3).map(x => ({ h: `${x.c.name} 출결 표`, d: '회차별 출결', href: '#c/' + x.c.id }))) }; },
      rule() { const C = cfg(); const S0 = st(); const moel = C && /^moel-/.test(String(C.profile || ''));
        const thr = c => (C && C.rate) || c.thr || 80; const L = S0.courses;
        const head = C && C.rate ? `수료 기준은 진도율 ${C.rate}% 이상${C.pass ? ` · 평가 ${C.pass}점 이상` : ''}${moel ? ` · 출결 수업은 출석률 ${DDAtt.MIN}% 이상` : ''}이에요(운영자가 게시한 규정).` : `수료 기준은 ${T('cls')}마다 정한 진도율 이상이에요${L.length ? '' : '. 수강을 시작하면 과정별 기준을 보여 드려요'}.`;
        return { t: head, h: L.length ? rep(L.map(x => row(x.c.name, `기준 진도 ${thr(x.c)}%${C && C.pass && x.c.items.some(i => i.type === 'exam') ? ` · 평가 ${C.pass}점` : ''}`, x.done ? '수료' : `${x.p}%`))) + LK([{ h: '내 학습 보기', d: '수료증은 수료 후 발급', href: '#my' }]) : LK([{ h: `${T('cls')} 둘러보기`, d: '', href: '#shop' }]) }; },
      due() { const S0 = st(); const t0 = td(); const A = [];
        S0.courses.forEach(x => (x.c.items || []).filter(i => ['assign', 'exam', 'quiz'].includes(i.type)).forEach(i => { const r = (((LR.lp || {}).cls || {})[x.c.id] || {}).items || {}; const me = r[i.id] || {}; if (me.done || me.score != null || (i.type === 'assign' && x.st && x.st !== 'none' && x.st !== 'returned')) return; A.push({ x, i, d: dueOf(x.c, i) }); }));
        /* 학원 수업 숙제(운영자가 수업 기록에 남긴 숙제) */
        const HW = []; try { const d = typeof lwDoc === 'function' ? lwDoc() : null; attCls().forEach(c => { const raw = d && (d.classes || []).find(y => y.id === c.id); const day = raw && raw.crmDay; if (!day) return; const u = lwUnits(c).filter(u => u.date && u.date <= t0 && day[u.id] && day[u.id].hw).pop(); if (u) HW.push({ c, u, hw: day[u.id].hw }); }); } catch (e) { }
        A.sort((a, b) => (a.d || '9').localeCompare(b.d || '9'));
        if (!A.length && !HW.length) return { t: '지금 남은 과제 · 시험 마감이 없어요.', h: BT([['이번 주 계획 맡기기', '이번 주 학습 계획 짜줘']]) };
        return { t: `마감이 가까운 순서예요. 과제 · 시험 ${A.length}건${HW.length ? ` · 수업 숙제 ${HW.length}건` : ''}.`, h: rep([...HW.map(y => row(`${y.c.name} 숙제`, `${fm(y.u.date)} 수업`, y.hw)), ...A.slice(0, 6).map(y => row(`${y.x.c.name} · ${y.i.title}`, ({ assign: '과제', exam: '시험', quiz: '퀴즈' })[y.i.type], y.d ? `${y.d}${y.d.slice(0, 10) < t0 ? ' 지남' : ' 마감'}` : '기한 없음'))]) + LK(A.slice(0, 3).map(y => ({ h: y.i.title, d: y.x.c.name, href: `#c/${y.x.c.id}/${y.i.id}` }))) }; },
      legal() { const L = typeof lLegal === 'function' ? lLegal() : [];
        if (!L.length) return { t: '미이수 필수(법정)교육이 없어요. 새로 배정되면 마감 전에 먼저 알려 드릴게요.', h: LK([{ h: '내 교육 보기', d: '이수 현황', href: '#my' }]) };
        return { t: `미이수 필수교육 ${L.length}건이에요. 기한이 가까운 순서이며, 100% 수강해야 이수돼요.`, h: rep(L.map(({ x, d }) => row(x.c.name, x.c.end ? `${x.c.end}까지 · 진도 ${x.p}%` : `진도 ${x.p}%`, d == null ? '기한 확인' : d < 0 ? '기한 지남' : 'D-' + d))) + LK(L.slice(0, 3).map(({ x }) => ({ h: `${x.c.name} 이어서 수강`, d: '', href: '#c/' + x.c.id }))) }; },
      status() { const S0 = st(); const L = S0.courses; if (!L.length) return { t: `아직 수강 중인 ${T('cls')}${J(T('cls'))} 없어요.`, h: LK([{ h: `${T('cls')} 둘러보기`, d: '', href: '#shop' }]) };
        const dn = L.filter(x => x.done).length; return { t: `이수 현황이에요. 전체 ${L.length}개 중 이수 ${dn}개 · 진행 중 ${L.length - dn}개 · 평균 진도 ${S0.avg}%.`, h: rep(L.map(x => row(x.c.name, x.c.end ? `${x.c.end} 종료` : '', x.done ? '이수' : `${x.p}%`))) + LK([{ h: '내 학습 보기', d: '수료증 · 상세 기록', href: '#my' }]) }; },
      rec() { const L = shopL(); if (!L.length) return { t: `지금 새로 신청할 수 있는 ${T('cls')}${J(T('cls'))} 없어요. 열리면 이곳에서 알려 드릴게요.`, h: LK([{ h: '내 학습 보기', d: '', href: '#my' }]) };
        return { t: `아직 신청하지 않은 ${T('cls')} 중에서 골랐어요. 목표를 알려 주시면 더 좁혀 드릴게요.`, h: LK(L.slice(0, 4).map(c => ({ h: c.name, d: c.cat || c.level || '', href: '#class/' + c.id }))) }; },
      list() { const t0 = td(); const L = shopL().filter(c => !(Array.isArray(c.sessions) && c.sessions.length && c.sessions.every(s => s.date && s.date < t0)));
        if (!L.length) return { t: `지금 신청할 수 있는 ${T('cls')}${J(T('cls'))} 없어요.`, h: LK([{ h: `${T('cls')} 목록 보기`, d: '', href: '#shop' }]) };
        return { t: `지금 신청할 수 있는 ${T('cls')} ${L.length}개예요.`, h: LK(L.slice(0, 5).map(c => ({ h: c.name, d: c.start ? `${c.start} 시작` : '', href: '#class/' + c.id }))) }; },
      week() { const t0 = td(), t7 = addD(t0, 6); const U = attCls().flatMap(c => lwUnits(c).filter(u => u.date && u.date >= t0 && u.date <= t7).map(u => ({ c, u })));
        const D = st().courses.flatMap(x => (x.c.items || []).filter(i => ['assign', 'exam'].includes(i.type)).map(i => ({ x, i, d: dueOf(x.c, i).slice(0, 10) })).filter(y => y.d && y.d >= t0 && y.d <= t7));
        if (!U.length && !D.length) return { t: `이번 주(${fm(t0)}~${fm(t7)}) 예정된 수업 · 마감이 없어요.`, h: LK([{ h: '내 학습 보기', d: '', href: '#my' }]) };
        const L = [...U.map(y => ({ d: y.u.date, h: row(`${fm(y.u.date)} ${y.u.from || ''}`, y.c.name, y.u.title || '수업') })), ...D.map(y => ({ d: y.d, h: row(`${fm(y.d)} 마감`, y.x.c.name, y.i.title) }))].sort((a, b) => a.d.localeCompare(b.d));
        return { t: `이번 주 일정이에요. 수업 ${U.length}개 · 마감 ${D.length}건.`, h: rep(L.map(x => x.h)) + LK(U.slice(0, 2).map(y => ({ h: y.c.name, d: '회차 · 출결', href: '#c/' + y.c.id }))) }; },
      gap() { const L = st().courses.filter(x => !x.done).map(x => { const r = (((LR.lp || {}).cls || {})[x.c.id] || {}).items || {}; const V = (x.c.items || []).filter(i => ['video', 'doc'].includes(i.type) && !(r[i.id] || {}).done); return { x, V }; }).filter(y => y.V.length);
        if (!L.length) return { t: '덜 들은 온라인 차시가 없어요. 잘하고 있어요.', h: '' };
        return { t: `덜 들은 온라인 차시가 ${L.reduce((a, y) => a + y.V.length, 0)}개 있어요.`, h: rep(L.map(y => row(y.x.c.name, `다음 「${y.V[0].title}」`, `${y.V.length}개 남음`))) + LK(L.slice(0, 3).map(y => ({ h: y.V[0].title, d: y.x.c.name, href: `#c/${y.x.c.id}/${y.V[0].id}` }))) }; },
      limit() { const C = cfg(); if (!C || !(C.dayMax || C.dayChasi)) return { t: '이 기관은 하루 학습 시간 제한이 없어요.', h: '' };
        const sec = typeof CPLL === 'object' && CPLL.todaySec ? CPLL.todaySec() : 0; const h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
        let n = 0; try { const d = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); Object.values((LR.lp || {}).cls || {}).forEach(c => Object.values((c && c.items) || {}).forEach(r => { if (r && r.d && r.d[d]) n++; })); } catch (e) { }
        return { t: `오늘 학습 ${h}시간 ${m}분 · ${n}차시를 들었어요. 하루 최대 ${C.dayChasi ? C.dayChasi + '차시' : ''}${C.dayChasi && C.dayMax ? ' · ' : ''}${C.dayMax ? C.dayMax + '시간' : ''}까지 학습할 수 있어요.`, h: rep([row('남은 차시', '', C.dayChasi ? `${Math.max(0, C.dayChasi - n)}차시` : '제한 없음'), row('남은 시간', '', C.dayMax ? `${Math.max(0, Math.round((C.dayMax * 3600 - sec) / 60))}분` : '제한 없음')]) + LK([{ h: '이어서 학습', d: '', href: '#my' }]) }; },
      certprep() { const L = st().courses.filter(x => (x.c.items || []).some(i => i.type === 'exam' || i.type === 'quiz'));
        return { t: '자격증 준비는 이 순서를 추천해요.', h: `<ol class="lt-ol"><li><b>시험 범위 확인 · 기출 유형 파악</b></li><li><b>핵심 개념 강의 먼저 끝내기(진도 80% 이상)</b></li><li><b>강좌 안 퀴즈 · 모의시험으로 약점 찾기</b></li><li><b>틀린 문제 복습 퀴즈로 반복</b></li></ol>` + (L.length ? LK(L.slice(0, 3).map(x => ({ h: x.c.name, d: `진도 ${x.p}%`, href: x.next ? `#c/${x.c.id}/${x.next.id}` : '#c/' + x.c.id }))) : LK([{ h: `${T('cls')} 둘러보기`, d: '자격증 과정 찾기', href: '#shop' }])) + BT([['복습 퀴즈', '복습 퀴즈 내줘'], ['이번 주 계획 맡기기', '이번 주 학습 계획 짜줘']]) }; },
      plan: () => null, quiz: () => null
    };
    return { H, chip: q => { if (!LR.me) return null; const C = scn().chips.find(c => c[1] === String(q || '').trim()); return C && C[2] ? { l: C[0], q: C[1], i: C[2], f: 1, r: () => (H[C[2]] || (() => null))() } : null; } };
  })();
  window.LAPP_INTENT = IN;
  if (typeof LSAM === 'object' && LSAM.find) { const base = LSAM.find; LSAM.find = q => IN.chip(q) || base(q); }
  function chipsHTML() { let C = [];
    try { C = (typeof LSAM === 'object' ? LSAM.screen().chips.filter(c => !c.kind).map(c => [c.l, c.q]) : ltChips().map(x => [x, x])); } catch (e) { C = []; }
    if (LR.me) C = [['오늘 뭐 하면 돼?', '오늘 뭐 하면 돼?'], ...scn().chips, ...C, ['내 학습 리포트', '내 학습 리포트 보여줘']];
    const seen = new Set(), seenQ = new Set(); C = C.filter(([l, q]) => !seen.has(l) && !seenQ.has(q) && seen.add(l) && seenQ.add(q)).slice(0, 6); /* v33 같은 질문(오늘 뭐 하면 돼? · 오늘 할 일) 중복 제거 */
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
    return `<section class="ap-pg"><div class="ap-pw2"><p class="ap-lead2">${esc(tName())}이 챙긴 일정과 리마인더를 내 캘린더 · ${oTy() === 'univ' ? '' : '카카오톡 · '}앱 알림으로 받아요.</p>${pushCard()}<div class="ap-conn-a" hidden></div>${more}
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
    let V = F === 'all' ? live : live.filter(x => stOf(x) === F); const seen = srSeen(); const rk = x => { const i = seen.indexOf(x.c.id); return i < 0 ? 999 : i; };
    V = SO === 'name' ? [...V].sort((a, b) => a.c.name.localeCompare(b.c.name, 'ko')) : [...V].sort((a, b) => rk(a) - rk(b));
    const EX = C.filter(exp);
    const ing = C.filter(x => !x.done), dn = C.filter(x => x.done);
    return `<section class="ap-my" style="--pc:${P ? P.c : 'var(--pri)'}"><div class="ap-pw2">
      <div class="ap-myh">${av(P)}<p>${C.length ? `${esc(who())}, 수강 전 ${cntOf('pre')}개 · 수강 중 ${cntOf('ing')}개 · 수료 ${cntOf('done')}개예요.${ing[0] && ing[0].next ? ` 「${esc(ing[0].next.title)}」부터 이어 가요.` : ''}` : `${esc(who())}, 아직 수강 중인 강좌가 없어요. 둘러보고 시작해 볼까요?`}</p></div>
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
      <nav>${LR.me && !isPar() ? `<button type="button" data-ap="pick">${ico('sparkle', 18)}선생님 바꾸기 · 이름 바꾸기</button>` : ''}${LR.me && !isPar() ? `<a href="#connect" data-ap="sheet-x">${ico('cal', 18)}캘린더 · 알림 연결</a>` : ''}${LR.mode !== 'live' && !isPar() ? `<button type="button" data-ap="ai">${ico('sparkle', 18)}Claude 연결 <small class="ap-shs">${esc(aiSt().t)}</small></button>` : ''}<button type="button" data-ap="orgs">${ico('grid', 18)}내 기관 · 기관 바꾸기 <small class="ap-shs">${orgs().length}곳</small></button><button type="button" data-ap="install">${ico('install', 18)}${standalone() ? '앱으로 실행 중' : '홈 화면에 앱으로 설치'}</button><button type="button" data-ap="classic">${ico('grid', 18)}기존 화면으로 보기</button>${LR.me ? `<button type="button" data-lact="logout" data-ap="sheet-x">${ico('out', 18)}로그아웃</button>` : ''}<button type="button" data-ap="sheet-x">닫기</button></nav></div>`;
    document.body.appendChild(w); const f = w.querySelector('nav button'); f && f.focus(); }
  const srRecent = () => { try { const v = JSON.parse(ls.get('srq.' + LR.tid) || '[]'); return Array.isArray(v) ? v.slice(0, 10) : []; } catch (e) { return []; } };
  const srSeen = () => { try { const v = JSON.parse(ls.get('srv.' + LR.tid) || '[]'); return Array.isArray(v) ? v.slice(0, 10) : []; } catch (e) { return []; } };
  /* v32.8 기간 만료 강좌는 기록만 보기 — 진도 · 제출 버튼을 막고 이유를 알린다(QA U10) */
  const expCls = id => { try { if (typeof myStats !== 'function' || !LR.me) return false; const x = myStats().courses.find(y => y.c.id === id); return !!(x && x.c.end && String(x.c.end).slice(0, 10) < new Date().toISOString().slice(0, 10)); } catch (e) { return false; } };
  document.addEventListener('click', e => { const m = /^#c\/([^/]+)/.exec(location.hash); if (!m || !document.body.classList.contains('lapp')) return; const b = e.target.closest && e.target.closest('#lm [data-lact], #lm [data-a2], #lm [data-lc="live-in"]'); if (!b || /^(next|prev|back|note|tab)/.test(b.dataset.lact || '')) return; if (!expCls(decodeURIComponent(m[1]))) return; e.stopPropagation(); e.preventDefault(); toast('학습 기간이 끝난 강좌예요. 기록은 볼 수 있지만 새 진도 · 제출은 저장되지 않아요.', 'warn'); }, true);
  window.addEventListener('hashchange', () => { closeSheet(); const d = document.getElementById('laiDlg'); if (d) { try { d.close(); } catch (e) { d.remove(); } } });
  window.addEventListener('hashchange', () => { const m = /^#c\/([^/]+)/.exec(location.hash); if (!m) return; const L = [m[1], ...srSeen().filter(x => x !== m[1])].slice(0, 10); ls.set('srv.' + LR.tid, JSON.stringify(L)); });
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
    document.body.classList.remove('lpar');
    if (!on && isPar()) { const a0 = route().a; if (['home', 'my', 'shop', 'courses', 'tutorials'].includes(a0)) { lm.innerHTML = parClassicHTML(); document.body.classList.add('lpar'); if (LT.open) { LT.open = false; document.body.classList.remove('lt-on'); } } /* 보호자 홈에서는 학생용 AI 튜터 버튼을 숨긴다(가족 연결 · 자녀 화면의 보호자 비서는 그대로) */
      document.querySelectorAll('header.lh a[href="#my"], header.lh a[href="#shop"], header.lh a[href="#courses"], header.lh a[href="#tutorials"], header.lh a[href="#login/my"]').forEach(x => { x.hidden = true; }); return; }
    if (!on && !LR.me && route().a === 'home' && !lm.querySelector('.lgj')) lm.insertAdjacentHTML('afterbegin', joinStrip());
    if (!on) { if (LR.me && route().a === 'home' && ls.get('classic') === '1' && !lm.querySelector('.ap-back')) lm.insertAdjacentHTML('afterbegin', `<div class="ap-back"><button type="button" data-ap="modern">${ico('sparkle', 16)} AI 선생님 앱 화면으로 보기</button></div>`); return; }
    const a = route().a; document.body.classList.toggle('ap-play', a === 'c' && decodeURIComponent(location.hash.slice(1)).split('/').length > 2); /* PC 강의 화면: 떠 있는 아래 메뉴가 본문을 가리지 않게(lapp.css) */ if (LR.me && (a === 'login' || a === 'join')) { location.replace('#home'); return; } /* v32.8 로그인한 뒤 로그인 · 가입 화면은 홈으로 */
    if (!LR.me && ['connect', 'books'].includes(a) && typeof needLogin === 'function' && !lm.textContent.trim()) lm.innerHTML = needLogin(a);
    const needPick = LR.me && !isPar() && (!persona() || AP.pick) && a === 'home';
    if (needPick) { lm.innerHTML = pickHTML(); document.body.classList.add('ap-pickon'); }
    else if (a === 'connect' && LR.me) { lm.innerHTML = connectHTML(); }
    else if (a === 'home' && isPar()) { lm.innerHTML = parHomeHTML(); }
    else if (a === 'home') { if (LT.open) { LT.open = false; document.body.classList.remove('lt-on'); } lm.innerHTML = homeHTML(); document.body.classList.add('ap-homeon'); const sc = document.getElementById('apScroll'); if (sc && (LT.msgs || []).some(m => !m.sys)) sc.scrollTop = sc.scrollHeight; }
    if (a === 'my' && LR.me && !isPar() && !lm.querySelector('.ap-my')) { const h = lm.querySelector('section.myh'); if (h) h.hidden = true; lm.insertAdjacentHTML('afterbegin', myTopHTML()); }
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
    if (k === 'srch-del') { const L = srRecent().filter(x => x !== el.dataset.v); ls.set('srq.' + LR.tid, JSON.stringify(L)); searchSheet(); return; }
    if (k === 'srch-clr') { ls.set(el.dataset.v + '.' + LR.tid, '[]'); searchSheet(); return; }
    if (k === 'srch-go') { const v = el.dataset.v; const L = [v, ...srRecent().filter(x => x !== v)].slice(0, 10); ls.set('srq.' + LR.tid, JSON.stringify(L)); closeSheet(); location.hash = el.dataset.h; return; }
    if (k === 'orgs') { AP.focusAdd = el.dataset.v === 'add'; return orgSheet(); }
    if (k === 'org-go') { const t = el.dataset.v; if (t === LR.tid) return closeSheet(); location.href = orgURL(t); return; }
    if (k === 'org-x') { const L = orgs().filter(o => o.tid !== el.dataset.v); ls.set('orgs', JSON.stringify(L)); orgSheet(); toast('목록에서 뺐습니다. 기관 계정은 그대로입니다.', 'ok'); return; }
    if (k === 'ai') return aiDlg();
    if (k === 'ai-off') { try { localStorage.removeItem(KEYK()); } catch (e) { } const d = el.closest('dialog'); d && d.close(); lrender(); toast('Claude 연결을 해제했습니다. 기본 안내로 답합니다.', 'ok'); return; }
    if (k === 'sheet-x') return closeSheet();
    if (k === 'pick') { closeSheet(); AP.pick = true; AP.sel = null; AP.nm = ''; if (route().a !== 'home') location.hash = '#home'; else lrender(); return; }
    if (k === 'pick-x') { afterSet(''); AP.pick = false; AP.sel = null; AP.nm = ''; lrender(); return; }
    if (k === 'pick-skip') { tutorRec().persona = { k: 'warm', n: (TCFG().orgName || TCFG().name || '').replace(/^AI 튜터$/, '') || PERS[0].n, at: new Date().toISOString() }; LR.api.save(); if (!afterGo()) lrender(); return; }
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
    if (e.target.id === 'apOS') { const k = e.target.value.trim().toLowerCase(); let vis = 0; document.querySelectorAll('#apSheet .ap-ol').forEach(ol => { let v = 0; ol.querySelectorAll('li').forEach(li => { li.hidden = !!k && !li.textContent.toLowerCase().includes(k); if (!li.hidden) v++; }); vis += v; const h = ol.previousElementSibling; if (h && h.classList.contains('ap-oh')) h.hidden = !v; });
      let m = document.getElementById('apOSn'); if (!vis && k) { if (!m) { m = document.createElement('p'); m.id = 'apOSn'; m.className = 'ap-empty'; m.setAttribute('role', 'status'); e.target.closest('.ap-osr').after(m); } m.textContent = `‘${e.target.value.trim()}’ 이름의 기관이 없어요. 아래 '다른 기관 추가'에 코드나 초대 링크를 넣어 보세요.`; } else if (m) m.remove(); }
    if (e.target.id === 'apSQ') { const r = document.getElementById('apSR'), z = document.getElementById('apS0'); if (r) r.innerHTML = srResults(e.target.value); if (z) z.hidden = !!e.target.value.trim(); }
    if (e.target.id === 'apQ') { e.target.style.height = 'auto'; e.target.style.height = Math.min(132, e.target.scrollHeight) + 'px'; } });
  document.addEventListener('submit', e => { const f = e.target;
    if (f.id === 'apPickF') { e.preventDefault(); const k = (f.querySelector('[name=pk]:checked') || {}).value || 'warm'; const B = PERS.find(x => x.k === k) || PERS[0]; const n = (f.querySelector('[name=nm]').value || '').replace(/[<>]/g, '').trim().slice(0, 12) || B.n;
      tutorRec().persona = { k, n, at: new Date().toISOString() }; LR.api.save(); AP.pick = false; AP.sel = null; AP.nm = ''; LT.msgs = []; if (!afterGo()) lrender(); toast(`${jw(n)} 함께 시작합니다.`, 'ok'); return; }
    if (f.id === 'apAiF') { e.preventDefault(); aiSave(f); return; }
    if (f.id === 'apOrgF') { e.preventDefault(); const v = (f.elements.c.value || '').trim(); let t = v, hh = '#home'; try { const u = new URL(v, location.href); t = u.searchParams.get('t') || (/^https?:/.test(v) ? '' : v); if (/^#(join|invite|inv)\//.test(u.hash)) hh = u.hash; } catch (e2) { } /* v32.8 초대 링크의 가입 토큰(#join/…)을 살린다(QA U3) */ t = String(t || '').replace(/[^\w.-]/g, '').slice(0, 64);
      if (!t) { toast('기관 코드나 초대 링크를 확인해 주세요.', ''); return; }
      if (LR.mode !== 'live') { let ok = orgs().some(o => o.tid === t) || demoRooms().some(r => r.tid === t); try { ok = ok || !!localStorage.getItem('didisam.room.' + t); } catch (e2) { } if (!ok) { const er = f.querySelector('.ap-oerr') || f.appendChild(Object.assign(document.createElement('p'), { className: 'ap-oerr', role: 'alert' })); er.textContent = '이 코드의 기관을 찾지 못했어요. 기관에서 받은 코드나 초대 링크를 다시 확인해 주세요.'; return; } }
      const dest = orgURL(t).replace(/#home$/, hh); if (t === LR.tid && hh === '#home') { closeSheet(); return; } closeSheet(); location.href = dest; if (t === LR.tid) location.reload(); return; }
    if (f.id === 'apF') { e.preventDefault(); const ta = f.querySelector('textarea'); const v = ta.value; ta.value = ''; ta.style.height = ''; ltAsk(v); } });
  document.addEventListener('keydown', e => { if (e.target.id === 'apQ' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && !('ontouchstart' in window)) { e.preventDefault(); e.target.form.requestSubmit(); }
    if (e.key === 'Enter' && !e.isComposing && e.target.id === 'apSQ') { e.preventDefault(); const v = e.target.value.trim(); if (v && document.querySelector('#apSR .ap-srr')) ls.set('srq.' + LR.tid, JSON.stringify([v, ...srRecent().filter(x => x !== v)].slice(0, 10))); const b = document.querySelector('#apSR .ap-srr'); b && b.focus(); }
    if (e.key === 'Escape' && document.getElementById('apSheet')) closeSheet(); });
  document.addEventListener('click', e => { if (e.target.id === 'apSheet') closeSheet(); });
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#c/"]'); if (!a || !appOn() || !LR.me || isPar() || persona() || route().a !== 'payok') return; e.preventDefault(); afterSet(a.getAttribute('href')); AP.pick = true; AP.sel = null; AP.nm = ''; location.hash = '#home'; }, true);

  /* ── 오프라인 · 설치용 서비스 워커(https · localhost에서만) ── */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) && !Q.get('nosw')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
})();
