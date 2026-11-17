/* v43.8 hpup-p1 — 프리미엄 템플릿 3종 업그레이드(코스 데스크 · 러닝 패스 · 커맨드 레저) · P1
   대표님(2026-11-17 20:49 · 20:57): "82점을 통과기준으로 빠르게" · "26종 모두 82점을 넘기라는 말" → 기존 프리미엄도 82점 이상으로.
   기준선 감점(BASELINE): 기관 유형과 어긋난 문구(대학 · 학원에 「필수 교육 · LEARNING CENTER」 등) · 옆판이 「무료」만 반복 · 학습 경로 판이 고정 문구 ·
     첫 화면에서 「누가 무엇을 하러 왔는지」가 안 풀림 · 사진 위 라벨 대비 · 공지 태그 12.5px · N 배지 11px · 머리글 로그인 45×26.
   - 첫 화면(HPS.hero 감싸기): 이 세 테마의 첫 화면을 hu3- 마크업으로 새로 그린다. 강좌 줄은 S.classes 실제 값(기간 · 요일 · 시간 · 수강료 · 수료증 · 개강 D-day)만,
     학습 경로 단계는 실제 경로(#login · #my · #cal · #badges · 강좌 · 상담)로 이어지고, 첫 화면 아래 「어떤 일로 오셨나요?」 방문자 카드가 기관 유형별로 열린다.
   - 문구: 배너 글이 예전 기본값 그대로일 때만 기관 유형에 맞는 문구로 바꾼다(기관이 고친 문구는 그대로). 새 사이트는 build에서 유형별 문구로 만든다.
   - 개인정보: 대학은 「학번 · 학과로만 확인」 문구만 두고 입력칸은 없다.
   - 색: 기관 색 하나 → HPT.ramp · HPT.onColor, 글자는 U.fit 4.5:1. 경고 코랄은 D-day 칩 전용. 장식 그라데이션 없음(사진 위 글자 가독용 스크림만).
   - hpth · hpprem · hpsec-* 는 고치지 않는다(테마 cssX를 감싸서 CSS를 붙이고, HPS.hero · TPL build를 감싼다). */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.meta !== 'function' || !window.HPS || typeof HPS.hero !== 'function') return;
  const MINE = ['coursedesk', 'learnpath', 'cmdledger'];
  if (!MINE.every(id => HPT.meta(id))) return;
  const U = HPT.U; const { mix, fit, al } = U;
  const ramp = HPT.ramp; const on = HPT.onColor;
  const WARN = '#E8553D';
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const tyRaw = () => { try { return S.org.type || ''; } catch (e) { return ''; } };
  const grp = () => { const t = tyRaw(); return t === 'univ' || t === 'univ_lms' ? 'univ' : t === 'lifelong' ? 'life' : t === 'voc' ? 'voc' : t === 'k12' ? 'k12' : t === 'adult' ? 'adult' : t === 'public' ? 'pub' : t === 'corp' ? 'corp' : 'life'; };
  const org = () => { try { return S.org.name || ''; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const today = () => { try { return typeof window.today === 'function' ? window.today() : new Date().toISOString().slice(0, 10); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const term = () => { const g = grp(); return g === 'k12' ? '반' : g === 'adult' ? '클래스' : g === 'univ' ? '강좌' : g === 'voc' ? '과정' : g === 'corp' ? '교육' : '강좌'; };

  /* ── 실제 데이터 ── */
  const pubL = () => { try { const A = (S.classes || []).filter(c => c && c.name && c.status !== '종료' && c.status !== '삭제'); const P = A.filter(c => c.open === '전체' || c.open == null); const L = P; const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; } catch (e) { return []; } };
  const isPublic = c => c.open === '전체' || c.open == null;
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const dot = d => String(d || '').slice(5, 10).replace('-', '.');
  const won = v => (+v || 0).toLocaleString('ko-KR') + '원';
  const dd = d => d ? Math.round((new Date(d) - new Date(today())) / 864e5) : null;
  const RE_GOV = /내일배움|국비|K-?디지털|KDT/i, RE_EMP = /사업주|재직자|직무/, RE_CERT = /자격|기능사|기사|[0-9]급/, RE_BEG = /입문|기초|처음|시니어|교양/, RE_ON = /온보딩|신입/;
  function info(c) { const days = Array.isArray(c.days) && c.days.length ? c.days.map(d => WD[+d] || '').filter(Boolean).join('·') : '';
    const tm = c.time && c.time.from ? `${c.time.from}–${c.time.to || ''}` : ''; const g = grp();
    const price = !+c.price ? (g === 'voc' && (RE_GOV.test(c.name) || ['3', '4'].includes(String(c.emp || ''))) ? '국비 지원' : g === 'corp' ? '' : '무료') : won(c.price);
    const per = c.start && c.end ? `${dot(c.start)}–${dot(c.end)}` : '';
    const ds = dd(c.start), de = dd(c.end);
    const st = ds != null && ds > 0 ? { t: ds <= 14 ? `개강 D-${ds}` : `${dot(c.start)} 개강`, w: ds <= 7 } : de != null && de >= 0 && de <= 14 ? { t: `마감 D-${de}`, w: true } : { t: g === 'corp' ? '수강 중' : '신청 가능', w: false };
    return { days, tm, price, per, cert: c.cert === 'auto' || c.cert === 'manual', st, legal: !!c.legal }; }
  const menuOf = (s, k) => ((s && s.menus) || []).find(m => m && m.kind === k && m.on !== false && m.access !== '비공개' && m.id);
  const cHref = c => isPublic(c) ? '#p-c-' + c.id : '#login';
  const clsList = s => { const m = menuOf(s, 'class'); if (m) return '#p-m-' + m.id; const L = pubL(); return L[0] ? cHref(L[0]) : '#p-home'; };
  const clsOf = (s, L) => L.length === 1 ? cHref(L[0]) : clsList(s);
  const noticeH = s => { const m = menuOf(s, 'notice'); return m ? '#p-m-' + m.id : '#notice'; };
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  function askOf(s) { const f = ft(); if (f.tel && !isPh(f.tel)) return { h: telH(f.tel), l: '전화 상담' }; const em = f.email || f.mail;
    if (em && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { h: 'mailto:' + em, l: '메일 문의' }; const m = menuOf(s, 'community') || menuOf(s, 'board'); if (m) return { h: '#p-m-' + m.id, l: '문의 게시판' };
    return { h: clsList(s), l: `${term()} 문의` }; }
  const hasFac = () => { try { return !!(S.fac && (S.fac.facilities || []).some(f => f.on !== false)); } catch (e) { return false; } };
  const W24 = 'https://www.work24.go.kr';

  /* ── 아이콘 ── */
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', cert: 'M7 3h10v12l-5-3-5 3zM9 7h6', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', lock: 'M6 11h12v9H6zM9 11V8a3 3 0 016 0v3' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 18}" height="${n || 18}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;
  const ext = h => /^https?:/.test(h);
  const aA = h => `href="${E(h)}"${ext(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const btn = (h, l, k) => `<a class="hu3-b ${k || 'p'}" ${aA(h)}><span>${E(l)}</span>${ext(h) ? ic('ext', 16) : /^tel:/.test(h) ? ic('phone', 16) : k === 'g' ? '' : ic('arrow', 18)}</a>`;

  /* ── 기관 유형별 첫 화면 문구(해요체) ── */
  const N = () => org();
  const COPY = {
    coursedesk: {
      univ: () => ({ eyebrow: '이번 학기 신청', title: `${N()}\n비교과 · 교과목 신청을 한곳에서`, sub: '개강이 가까운 강좌부터 보여 드려요. 신청은 학번 로그인 한 번이면 끝나요.', cta: '신청할 강좌 보기', cta2: '학사 일정' }),
      life: () => ({ eyebrow: '이번 분기 수강 신청', title: `배우고 싶은 강좌를\n요일 · 시간으로 골라요`, sub: `${N()} 강좌의 기간 · 수강료 · 수료증을 한눈에 비교하고 바로 신청해요.`, cta: '강좌 둘러보기', cta2: '수강 상담' }),
      voc: () => ({ eyebrow: '훈련생 모집', title: `훈련 과정을\n기간 · 비용으로 비교해요`, sub: `${N()}의 국비 · 재직자 과정을 한눈에 보고, 상담으로 나에게 맞는 과정을 찾아요.`, cta: '모집 중인 과정', cta2: '훈련 상담' }),
      k12: () => ({ eyebrow: '반 편성 · 상담', title: `우리 아이에게 맞는 반을\n시간표로 골라요`, sub: `${N()}의 반별 요일 · 시간 · 수강료를 비교하고 상담을 예약해요.`, cta: '반 · 시간표 보기', cta2: '상담 예약' }),
      adult: () => ({ eyebrow: '수강생 모집', title: `일정에 맞는 클래스를\n한곳에서 골라요`, sub: `${N()}의 클래스를 요일 · 시간 · 수강료로 비교하고 바로 신청해요.`, cta: '클래스 보기', cta2: '수강 상담' }),
      corp: () => ({ eyebrow: '사내 교육', title: `${N()}\n필수 · 직무 교육을 한곳에서`, sub: '기한이 가까운 교육부터 보여 드려요. 로그인하면 내 이수 현황을 바로 확인해요.', cta: '내 교육 보기', cta2: '교육 문의' }),
      pub: () => ({ eyebrow: '시민 강좌 접수', title: `${N()}\n시민 강좌를 한곳에서 신청해요`, sub: '접수 중인 강좌의 기간 · 요일 · 수강료를 비교하고 바로 신청해요.', cta: '접수 중인 강좌', cta2: '문의하기' }) },
    learnpath: {
      univ: () => ({ eyebrow: '이수 로드맵', title: `신청부터 이수까지\n한 길로 이어져요`, sub: `${N()}의 강좌를 고르면 출석 · 진도는 자동으로 기록되고, 이수하면 기록이 남아요.`, cta: '신청할 강좌 보기', cta2: '학사 일정' }),
      voc: () => ({ eyebrow: '훈련 과정 안내', title: `상담부터 수료까지\n한 길로 안내해요`, sub: `${N()}에서 국비 과정을 고르고, 출결 · 진도 · 수료를 한곳에서 확인해요.`, cta: '모집 중인 과정', cta2: '훈련 상담' }),
      life: () => ({ eyebrow: '학습 경로', title: `처음 배우는 분도\n수료증까지 차근차근`, sub: `${N()}의 강좌를 고르면 수강 순서와 수료 기준이 한눈에 보여요.`, cta: '강좌 둘러보기', cta2: '수강 상담' }),
      k12: () => ({ eyebrow: '학습 관리', title: `상담부터 반 배정 · 알림까지\n한 흐름으로 관리해요`, sub: `${N()}는 출결 · 숙제 · 성적을 학부모님께 바로 알려 드려요.`, cta: '반 · 시간표 보기', cta2: '상담 예약' }),
      adult: () => ({ eyebrow: '수강 안내', title: `처음 상담부터 수료까지\n한 길로 안내해요`, sub: `${N()}의 클래스를 고르면 수강 순서와 일정이 한눈에 보여요.`, cta: '클래스 보기', cta2: '수강 상담' }),
      corp: () => ({ eyebrow: '학습 경로', title: `입사부터 직무 역량까지\n순서대로 이어 배워요`, sub: `${N()}의 필수 · 직무 교육을 순서대로 듣고, 이수증을 바로 받아요.`, cta: '내 교육 보기', cta2: '교육 문의' }),
      pub: () => ({ eyebrow: '수강 안내', title: `신청부터 수료까지\n누구나 쉽게 배워요`, sub: `${N()}의 시민 강좌를 고르고 PC · 휴대폰으로 들어요.`, cta: '접수 중인 강좌', cta2: '문의하기' }) },
    cmdledger: {
      corp: () => ({ eyebrow: '사내 교육 현황', title: `${N()}\n올해 이수할 교육을 한눈에`, sub: '필수 · 법정 교육의 기한과 내 이수 현황을 한 표로 확인해요.', cta: '내 교육 보기', cta2: '이수증 확인' }),
      pub: () => ({ eyebrow: '교육 · 강좌 현황', title: `${N()}\n열린 강좌를 한 표로 확인해요`, sub: '강좌별 기간 · 요일 · 수강료와 접수 상태를 한눈에 비교해요.', cta: '접수 중인 강좌', cta2: '문의하기' }),
      univ: () => ({ eyebrow: '강좌 현황판', title: `${N()}\n이번 학기 강좌를 한 표로`, sub: '기간 · 이수 기준 · 신청 상태를 한 줄로 비교하고 학번으로 바로 신청해요.', cta: '신청할 강좌 보기', cta2: '학사 일정' }),
      life: () => ({ eyebrow: '강좌 일정표', title: `이번 분기 강좌를\n일정표로 한눈에`, sub: `${N()} 강좌의 기간 · 요일 · 수강료 · 수료증을 한 표로 비교해요.`, cta: '강좌 둘러보기', cta2: '수강 상담' }),
      voc: () => ({ eyebrow: '훈련 과정 현황', title: `훈련 과정의 일정과 비용을\n한 표로 비교해요`, sub: `${N()}의 과정별 기간 · 비용 · 수료증을 확인하고 상담을 신청해요.`, cta: '모집 중인 과정', cta2: '훈련 상담' }),
      k12: () => ({ eyebrow: '반 · 시간표', title: `반별 시간표와 수강료를\n한 표로 확인해요`, sub: `${N()}의 반 일정과 수강료를 비교하고 상담을 예약해요.`, cta: '반 · 시간표 보기', cta2: '상담 예약' }),
      adult: () => ({ eyebrow: '클래스 일정표', title: `클래스 일정과 수강료를\n한 표로 확인해요`, sub: `${N()}의 클래스를 요일 · 시간 · 수강료로 비교하고 신청해요.`, cta: '클래스 보기', cta2: '수강 상담' }) }
  };
  const copyOf = id => { const C = COPY[id] || {}; const f = C[grp()] || C.life || C.univ || C.corp; return f ? f() : null; };
  /* 예전 기본 문구(hpprem T) — 배너가 이 값 그대로면 유형별 문구로 바꾼다 */
  const OLD = { coursedesk: ['이번 학기 모집', '모집 중인 과정과 수강 방법을 확인하고, 마음에 드는 과정을 바로 신청하세요.'], learnpath: ['학습 경로', '과정을 고르면 학습 순서와 이수 기준이 한눈에 보입니다. 진도는 자동으로 기록됩니다.'], cmdledger: ['LEARNING CENTER', '필수 교육과 직무 과정을 기한 안에 이수하고, 이수 기록을 바로 확인합니다.'] };
  const dataOf = (id, d) => { const o = OLD[id]; if (!o) return d; const old = (!d.eyebrow || d.eyebrow === o[0]) && (!d.sub || d.sub === o[1]) && (!d.title || d.title.indexOf(org()) >= 0 || /처음부터 이수까지|업무에 필요한 교육|배우고 싶은 과정을/.test(d.title));
    if (!old) return d; const c = copyOf(id); return c ? Object.assign({}, d, c) : d; };

  /* ── 방문자 카드(「어떤 일로 오셨나요?」) — 유형별 4종, 버튼은 실제 경로 ── */
  function personas(s, d) { const L = pubL(); const ask = askOf(s); const cl = clsList(s); const nt = noticeH(s); const g = grp();
    const pick = re => L.filter(c => re.test(c.name)); const cert = L.filter(c => RE_CERT.test(c.name) || false); const cn = L.filter(c => info(c).cert).length;
    const nx = L.map(c => [c, dd(c.start)]).filter(x => x[1] != null && x[1] >= 0).sort((a, b) => a[1] - b[1])[0];
    const nxt = nx ? `가장 가까운 개강 · ${nx[0].name} ${dot(nx[0].start)}` : '';
    if (g === 'univ') return [
      { k: '재학생', t: '비교과 · 강좌를 신청해요', m: `모집 중 ${L.length}개 · 학번으로 로그인`, b: [[cl, '신청할 강좌'], ['#login', '학번 로그인']] },
      { k: '신입생', t: '학사 일정과 공지부터 확인해요', m: '수강 신청 · 개강 일정을 한곳에서', b: [['#cal', '학사 일정'], [nt, '공지사항']] },
      { k: '교수자', t: '강의실과 수강생 현황을 봐요', m: '출석 · 과제 · 성적을 한 화면에서', b: [['#login', '교수자 로그인'], ['#my', '내 강의실']] },
      { k: '지역 · 산학', t: '공개 강좌와 협력을 문의해요', m: nxt || '공개 강좌는 로그인 없이 둘러봐요', b: [[cl, '공개 강좌'], [ask.h, ask.l]] }];
    if (g === 'voc') { const G = L.filter(c => RE_GOV.test(c.name) || !+c.price), M = pick(RE_EMP); return [
      { k: '구직 중', t: '국비로 배우고 취업을 준비해요', m: G.length ? `국비 · 무료 과정 ${G.length}개` : '내일배움카드로 신청해요', b: [[clsOf(s, G), '국비 과정 보기'], [W24, '내일배움카드']] },
      { k: '재직 중', t: '퇴근 후 · 주말에 실무를 더해요', m: M.length ? `재직자 · 사업주 훈련 ${M.length}개` : '일정이 맞는 과정은 상담으로 찾아요', b: [[clsOf(s, M.length ? M : L), '재직자 과정'], [ask.h, ask.l]] },
      { k: '훈련생', t: '출결 · 진도 · 수료를 확인해요', m: '출결과 진도는 자동으로 기록돼요', b: [['#my', '내 훈련 현황'], ['#badges', '수료 확인']] },
      { k: '처음 상담', t: '나에게 맞는 과정을 물어봐요', m: nxt || '정확한 지원 자격은 고용24에서 확인돼요', b: [[ask.h, ask.l], ['#cal', '개강 일정']] }]; }
    if (g === 'k12') return [
      { k: '학부모', t: '반 · 시간표와 수강료를 봐요', m: `운영 중인 반 ${L.length}개`, b: [[cl, '반 · 시간표'], [ask.h, '상담 예약']] },
      { k: '재원생', t: '숙제 · 진도 · 출결을 확인해요', m: '수업 후 알림으로 바로 받아요', b: [['#login', '로그인'], ['#my', '내 수업']] },
      { k: '처음 상담', t: '레벨 테스트 · 체험을 문의해요', m: nxt || '상담 후 반을 배정해 드려요', b: [[ask.h, ask.l], [nt, '학원 소식']] }];
    if (g === 'adult') return [
      { k: '처음 오신 분', t: '일정에 맞는 클래스를 골라요', m: `모집 중 ${L.length}개${nxt ? ' · ' + nxt.replace('가장 가까운 개강 · ', '개강 ') : ''}`, b: [[cl, '클래스 보기'], [ask.h, ask.l]] },
      { k: '수강생', t: '진도 · 출석 · 수료증을 확인해요', m: '수업 영상은 PC · 휴대폰으로 이어 봐요', b: [['#login', '로그인'], ['#my', '내 강의실']] },
      { k: '자격 준비', t: '시험 일정에 맞춰 준비해요', m: cert.length ? `자격 과정 ${cert.length}개` : '개강 일정을 먼저 확인해요', b: [[clsOf(s, cert.length ? cert : L), '자격 과정'], ['#cal', '개강 일정']] }];
    if (g === 'corp') { const LG = L.filter(c => c.legal || /예방|보호|안전|인식개선|법정/.test(c.name)), ON = pick(RE_ON); return [
      { k: '임직원', t: '올해 필수 교육을 이수해요', m: LG.length ? `법정 · 필수 교육 ${LG.length}개` : '기한이 가까운 교육부터 보여요', b: [['#login', '내 필수 교육'], ['#my', '이수 현황']] },
      { k: '신입사원', t: '온보딩 과정부터 시작해요', m: ON.length && isPublic(ON[0]) ? ON[0].name : '입사 첫 달 과정을 순서대로', b: [[ON.length ? cHref(ON[0]) : '#login', '온보딩 과정'], ['#cal', '교육 일정']] },
      { k: '수료 확인', t: '이수증 · 수료증을 내려받아요', m: cn ? `수료증 발급 과정 ${cn}개` : '이수한 교육의 증명서를 내려받아요', b: [['#badges', '이수증 보기'], ['#my', '내 학습']] },
      { k: '교육 담당자', t: '운영 · 일정을 문의해요', m: '공지로 교육 일정을 안내해요', b: [[ask.h, ask.l], [nt, '교육 공지']] }]; }
    if (g === 'pub') return [
      ...(L.length ? [{ k: '시민', t: '시민 강좌를 신청해요', m: L.length ? `접수 중 ${L.length}개${nxt ? ' · ' + nxt.replace('가장 가까운 개강 · ', '개강 ') : ''}` : '접수 일정은 공지로 알려요', b: [[cl, '강좌 보기'], [ask.h, ask.l]] }] : []),
      hasFac() ? { k: '시설 이용', t: '빈 시간을 보고 예약해요', m: '정원 · 운영 시간을 바로 확인해요', b: [['#p-l-fac', '시설 예약'], [nt, '이용 안내']] } : { k: '수강생', t: '수강 · 수료를 확인해요', m: '진도와 수료증을 한곳에서', b: [['#login', '로그인'], ['#badges', '수료증']] },
      { k: '직원', t: '직원 교육을 이수해요', m: '필수 교육은 로그인 후 보여요', b: [['#login', '직원 로그인'], ['#my', '내 교육']] },
      { k: '소식', t: '접수 일정 · 공지를 확인해요', m: '추첨 · 결과도 공지로 알려요', b: [[nt, '공지사항'], ['#cal', '교육 일정']] }];
    const B = pick(RE_BEG); return [
      { k: '처음 배우는 분', t: '입문 강좌부터 시작해요', m: B.length ? `입문 · 교양 강좌 ${B.length}개` : `모집 중 ${L.length}개`, b: [[clsOf(s, B.length ? B : L), '입문 강좌'], [ask.h, ask.l]] },
      { k: '자격 준비', t: '자격 과정을 일정에 맞춰요', m: cert.length ? `자격 과정 ${cert.length}개` : nxt || '개강 일정을 먼저 확인해요', b: [[clsOf(s, cert.length ? cert : L), '자격 과정'], ['#cal', '개강 일정']] },
      { k: '수강생', t: '진도 · 수료증을 확인해요', m: `수료증 발급 강좌 ${cn}개`, b: [['#login', '로그인'], ['#my', '내 강의실']] },
      { k: '문의', t: '수강 방법을 물어봐요', m: '어려우면 전화로 도와 드려요', b: [[ask.h, ask.l], [nt, '공지사항']] }]; }
  const whoHTML = (s, d, cls) => { const P = personas(s, d); return `<div class="hu3-who ${cls || ''}" role="list" aria-label="방문자별 바로가기">${P.map(p => `<div class="hu3-wc" role="listitem"><p class="hu3-wk">${E(p.k)}</p><h3>${E(p.t)}</h3>${p.m ? `<p class="hu3-wm">${E(p.m)}</p>` : ''}<div class="hu3-wl">${p.b.map((x, i) => btn(x[0], x[1], i ? 'g' : 's')).join('')}</div></div>`).join('')}</div>${grp() === 'univ' ? `<p class="hu3-priv">${ic('lock', 16)}<span>로그인은 학번 · 학과로만 확인해요. 다른 개인정보는 받지 않아요.</span></p>` : ''}`; };

  /* ── 강좌 줄 · 사진 ── */
  const metaOf = x => [x.per, [x.days, x.tm].filter(Boolean).join(' '), x.price, x.cert ? '수료증' : ''].filter(Boolean);
  const rowsHTML = (L, n) => `<ul class="hu3-rows">${L.slice(0, n).map(c => { const x = info(c); return `<li><a ${aA(cHref(c))}><span class="hu3-rn"><b>${E(c.name)}</b><small>${metaOf(x).map(E).join(' · ')}</small></span><em class="hu3-st${x.st.w ? ' w' : ''}">${E(x.st.t)}</em>${ic('arrow', 18)}</a></li>`; }).join('')}</ul>`;
  const sortL = L => L.slice().sort((a, b) => { const x = dd(a.start), y = dd(b.start); const k = v => v == null ? 9e9 : v < 0 ? 5e9 + (-v) : v; return k(x) - k(y); });
  const figH = (p, cls) => p ? `<figure class="hps-img hp-photo hu3-ph ${cls || ''}" data-slot="hero"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 900px) 100vw, 60vw"` : ''} alt="${E(p.alt)}" loading="eager" fetchpriority="high" decoding="async" style="object-fit:${p.fit || 'cover'};object-position:${E(p.pos || '50% 50%')}"></figure>` : '';
  const lines = d => String((d && d.title) || org()).split('\n').filter(Boolean);
  const head = (d, k) => `${d.eyebrow ? `<p class="hu3-ey">${E(d.eyebrow)}</p>` : ''}<h1>${lines(d).map(E).join('<br>')}</h1>${d.sub ? `<p class="hu3-sub">${E(d.sub)}</p>` : ''}`;
  /* 기업 · 공공에서 공개 강좌가 0이면(직원형) 빈 상태 안내 — 「접수 중인 강좌」 제목 · 0개 목록 대신 로그인 · 시설 · 공지 · 문의 */
  const emp = () => (grp() === 'corp' || grp() === 'pub') && !pubL().length;
  const empD = (id, d) => { if (!emp() || id === 'cmdledger') return d; const c = copyOf(id); if (!c || d.eyebrow !== c.eyebrow) return d;
    return grp() === 'corp' ? Object.assign({}, d, { eyebrow: '사내 교육', title: `${org()}\n내 교육은 로그인하면 바로 보여요`, sub: '배정된 필수 · 직무 교육과 기한을 확인하고, 이수증을 내려받아요.', cta: '내 교육 보기', cta2: '이수증 확인' })
      : Object.assign({}, d, { eyebrow: '이용 안내', title: `${org()}\n직원 교육 · 시설 이용 안내`, sub: hasFac() ? '직원 교육은 로그인 후 내 교육에서, 시설은 빈 시간을 보고 예약해요.' : '직원 교육은 로그인 후 내 교육에서 확인하고, 강좌 접수는 공지로 알려요.', cta: '직원 로그인', cta2: hasFac() ? '시설 예약' : '공지사항' }); };
  const guideR = s => { const g = grp(); const ask = askOf(s); const nt = noticeH(s); return [['#login', g === 'pub' ? '직원 교육 · 로그인' : '내 교육 · 기한 확인', '배정된 교육은 로그인 후 보여요'], hasFac() && g === 'pub' ? ['#p-l-fac', '시설 예약', '빈 시간과 정원을 바로 확인해요'] : ['#badges', '이수증 · 수료증', '이수한 교육의 증명서를 내려받아요'], [nt, '공지사항', '교육 일정 · 접수 소식을 알려요'], [ask.h, ask.l, '교육 담당자에게 물어봐요']]; };
  function heroBtns(s, d) { const ask = askOf(s); const g = grp(); const c1 = g === 'corp' || d.cta === '직원 로그인' ? '#login' : clsList(s);
    const c2 = /학사 일정|개강 일정/.test(d.cta2 || '') ? '#cal' : /이수증/.test(d.cta2 || '') ? '#badges' : /시설 예약/.test(d.cta2 || '') ? '#p-l-fac' : /^공지/.test(d.cta2 || '') ? noticeH(s) : ask.h;
    return `<div class="hu3-bs">${d.cta ? btn(c1, d.cta, 'p') : ''}${d.cta2 ? btn(c2, d.cta2, 'g') : ''}</div>`; }

  /* ── 첫 화면 3종 ── */
  function heroDesk(s, d, p) { const L = sortL(pubL()); const cl = clsList(s);
    const side = L.length ? `<aside class="hu3-side" aria-label="지금 신청할 수 있는 ${E(term())}"><div class="hu3-sh"><p>지금 신청할 수 있는 ${E(term())}</p><span>${L.length}개</span></div>${rowsHTML(L, 5)}<a class="hu3-all" ${aA(cl)}><span>${E(term())} 전체 보기</span>${ic('arrow', 18)}</a></aside>` : emp() ? `<aside class="hu3-side" aria-label="이용 안내"><div class="hu3-sh"><p>${grp() === 'pub' ? '이용 안내' : '내 교육 안내'}</p></div><ul class="hu3-rows">${guideR(s).map(r => `<li><a ${aA(r[0])}><span class="hu3-rn"><b>${E(r[1])}</b><small>${E(r[2])}</small></span><span></span>${/^tel:/.test(r[0]) ? ic('phone', 18) : ic('arrow', 18)}</a></li>`).join('')}</ul></aside>` : '';
    return `<section class="hpt hp-hero hps-hero hu3 hu3-cd"><div class="hu3-w"><div class="hu3-top${side ? '' : ' one'}"><div class="hu3-card">${figH(p)}<i class="hu3-scrim" aria-hidden="true"></i><div class="hu3-tx">${head(d)}${heroBtns(s, d)}</div></div>${side}</div><div class="hu3-whoh"><h2>어떤 일로 오셨나요?</h2><p>방문 목적을 고르면 바로 갈 곳을 알려 드려요.</p></div>${whoHTML(s, d)}</div></section>`; }
  function steps(s) { const L = pubL(); const g = grp(); const ask = askOf(s); const cl = clsList(s); const cn = L.filter(c => info(c).cert).length;
    const nx = L.map(c => [c, dd(c.start)]).filter(x => x[1] != null && x[1] >= 0).sort((a, b) => a[1] - b[1])[0]; const nxt = nx ? ` · 다음 개강 ${dot(nx[0].start)}` : '';
    if (g === 'univ') return [['강좌 고르기', `모집 중 ${L.length}개${nxt}`, cl], ['학번으로 신청', '학번 · 학과로만 확인해요', '#login'], ['수강 · 출석', '출석 · 진도는 자동으로 기록돼요', '#my'], ['이수 확인', cn ? `이수증 발급 강좌 ${cn}개` : '이수 기록을 바로 확인해요', '#badges']];
    if (g === 'voc') return [['과정 비교', `모집 중 ${L.length}개${nxt}`, cl], ['내일배움카드', '발급 · 자격은 고용24에서 확인해요', W24], ['훈련 · 출결', '출결과 진도는 자동으로 기록돼요', '#my'], ['수료 · 취업 연계', cn ? `수료증 발급 과정 ${cn}개` : '수료 기준을 바로 확인해요', '#badges']];
    if (g === 'k12') return [['상담 · 레벨 테스트', '아이 수준에 맞춰 반을 정해요', ask.h], ['반 · 시간표', `운영 중인 반 ${L.length}개`, cl], ['수업 · 숙제', '숙제와 진도를 앱으로 확인해요', '#my'], ['출결 · 성적 알림', '학부모님께 바로 알려 드려요', '#login']];
    if (emp()) { const nt = noticeH(s); return g === 'corp' ? [['필수 교육 확인', '로그인하면 내 교육과 기한이 보여요', '#login'], ['학습', 'PC · 휴대폰으로 이어서 들어요', '#my'], ['이수증 받기', cn ? `이수증 발급 과정 ${cn}개` : '이수 기록이 바로 남아요', '#badges'], ['교육 공지', '교육 일정 · 접수 소식을 알려요', nt]]
      : [['직원 로그인', '배정된 교육은 로그인 후 보여요', '#login'], hasFac() ? ['시설 예약', '빈 시간과 정원을 바로 확인해요', '#p-l-fac'] : ['공지사항', '강좌 접수 일정을 알려요', nt], ['수강', 'PC · 휴대폰으로 이어서 들어요', '#my'], ['수료증', '이수한 교육의 증명서를 내려받아요', '#badges']]; }
    if (g === 'corp') return [['필수 교육 확인', '로그인하면 내 교육과 기한이 보여요', '#login'], ['학습', 'PC · 휴대폰으로 이어서 들어요', '#my'], ['이수증 받기', cn ? `이수증 발급 과정 ${cn}개` : '이수 기록이 바로 남아요', '#badges'], ['직무 과정', `운영 중 ${L.length}개`, cl]];
    return [[`${term()} 고르기`, `모집 중 ${L.length}개${nxt}`, cl], ['신청 · 결제', '온라인으로 신청하고 바로 수강해요', '#login'], ['수강', 'PC · 휴대폰으로 이어서 들어요', '#my'], ['수료증', cn ? `수료증 발급 ${term()} ${cn}개` : '수료 기준을 바로 확인해요', '#badges']]; }
  function heroPath(s, d, p) { const R = steps(s);
    const panel = `<aside class="hu3-pp" aria-label="학습 경로"><p class="hu3-pph">${E(grp() === 'voc' ? '훈련 경로' : '학습 경로')} · 단계를 누르면 바로 이동해요</p><ol>${R.map((r, k) => `<li><a ${aA(r[2])}><i aria-hidden="true">${k + 1}</i><span><b>${E(r[0])}</b><small>${E(r[1])}</small></span>${ext(r[2]) ? ic('ext', 16) : ic('arrow', 18)}</a></li>`).join('')}</ol></aside>`;
    return `<section class="hpt hp-hero hps-hero hu3 hu3-lp"><div class="hu3-cv">${figH(p)}<i class="hu3-scrim" aria-hidden="true"></i><div class="hu3-w hu3-cvi"><div class="hu3-tx">${head(d)}${heroBtns(s, d)}</div>${panel}</div></div><div class="hu3-band"><div class="hu3-w"><div class="hu3-whoh"><h2>어떤 일로 오셨나요?</h2><p>방문 목적을 고르면 바로 갈 곳을 알려 드려요.</p></div>${whoHTML(s, d)}</div></div></section>`; }
  /* 커맨드 레저: 표는 공개 강좌(pubCls와 같은 범위)만. 공개 강좌가 없으면 과정명 대신 집계 · 로그인 · 공지 · 문의 안내판(0은 크게 보이지 않음) */
  const pubP = () => { try { const L = (S.classes || []).filter(c => c && c.name && c.open === '전체' && c.status !== '종료' && c.status !== '삭제'); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; } catch (e) { return []; } };
  const allA = () => { try { return (S.classes || []).filter(c => c && c.name && c.status !== '종료' && c.status !== '삭제'); } catch (e) { return []; } };
  const RE_LEGAL = /예방|보호|안전|인식개선|법정|윤리|청렴/;
  function ledgerWho(s, d) { const P = personas(s, d); return `<div class="hu3-lw"><p class="hu3-lwh">어떤 일로 오셨나요?</p><ul>${P.map(x => `<li><span class="hu3-wk">${E(x.k)}</span><span class="hu3-lwt"><b>${E(x.t)}</b>${x.m ? `<small>${E(x.m)}</small>` : ''}</span><span class="hu3-lwb">${x.b.map((y, i) => btn(y[0], y[1], i ? 'g' : 's')).join('')}</span></li>`).join('')}</ul></div>${grp() === 'univ' ? `<p class="hu3-priv">${ic('lock', 16)}<span>로그인은 학번 · 학과로만 확인해요. 다른 개인정보는 받지 않아요.</span></p>` : ''}`; }
  function heroLedger(s, d, p) { const L = sortL(pubP()); const cl = clsList(s); const g = grp(); const ask = askOf(s); const nt = noticeH(s);
    let F, right;
    if (L.length) { const cn = L.filter(c => info(c).cert).length; const nx = L.map(c => [c, dd(c.start)]).filter(x => x[1] != null && x[1] >= 0).sort((a, b) => a[1] - b[1])[0];
      F = [[L.length, g === 'corp' ? '공개 교육' : `운영 중인 ${term()}`], [cn, '수료증 발급'], nx ? [`D-${nx[1]}`, `다음 개강 · ${dot(nx[0].start)}`] : [L.filter(c => !+c.price).length, `무료 ${term()}`]];
      right = `<div class="hu3-led" role="table" aria-label="${E(term())} 현황"><div class="hu3-lh" role="row"><span role="columnheader">${E(term())}</span><span role="columnheader">기간</span><span role="columnheader">상태</span></div>${L.slice(0, 4).map(c => { const x = info(c); return `<a class="hu3-lr" role="row" ${aA(cHref(c))}><span role="cell" class="hu3-ln"><b>${E(c.name)}</b><small>${[[x.days, x.tm].filter(Boolean).join(' '), x.price, x.cert ? '수료증' : ''].filter(Boolean).map(E).join(' · ') || '&nbsp;'}</small></span><span role="cell" class="hu3-lp2">${E(x.per)}</span><span role="cell"><em class="hu3-st${x.st.w ? ' w' : ''}">${E(x.st.t)}</em></span></a>`; }).join('')}<a class="hu3-all" ${aA(cl)}><span>${E(term())} ${L.length}개 전체 보기</span>${ic('arrow', 18)}</a></div>`; }
    else { const A = allA(); const lg = A.filter(c => c.legal || RE_LEGAL.test(c.name)).length; const cn = A.filter(c => info(c).cert).length;
      F = [[lg, '법정 · 필수 교육'], [A.length - lg, '직무 · 기타 교육'], [cn, '수료증 발급']];
      if (OLD.cmdledger && d.eyebrow === (copyOf('cmdledger') || {}).eyebrow) { if (g === 'pub') d = Object.assign({}, d, { eyebrow: '이용 안내', title: `${org()}\n직원 교육 · 시설 이용 안내`, sub: hasFac() ? '직원 교육은 로그인 후 내 교육에서, 시설은 빈 시간을 보고 예약해요.' : '직원 교육은 로그인 후 내 교육에서 확인하고, 시민 강좌 접수는 공지로 알려요.', cta: '직원 로그인', cta2: hasFac() ? '시설 예약' : '공지사항' });
        else d = Object.assign({}, d, { sub: '교육 과정과 기한은 로그인 후 내 교육에서 보여요. 이수증도 바로 내려받아요.' }); }
      const R = [['#login', g === 'pub' ? '직원 교육 · 로그인' : '내 교육 · 기한 확인', A.length ? `배정된 교육은 로그인 후 보여요` : '로그인하면 배정된 교육이 보여요'], hasFac() && g === 'pub' ? ['#p-l-fac', '시설 예약', '빈 시간과 정원을 바로 확인해요'] : ['#badges', '이수증 · 수료증', '이수한 교육의 증명서를 내려받아요'], [nt, '공지사항', '교육 일정 · 접수 소식을 알려요'], [ask.h, ask.l, '교육 담당자에게 물어봐요']];
      right = `<div class="hu3-led hu3-gd" aria-label="이용 안내"><p class="hu3-gdh">${E(g === 'pub' ? '이용 안내' : '내 교육 안내')}</p>${R.map(r => `<a class="hu3-lr" ${aA(r[0])}><span class="hu3-ln"><b>${E(r[1])}</b><small>${E(r[2])}</small></span>${ext(r[0]) ? ic('ext', 16) : /^tel:/.test(r[0]) ? ic('phone', 18) : ic('arrow', 18)}</a>`).join('')}</div>`; }
    const FX = F.filter(f => f[0] && f[0] !== 0 && f[0] !== '0'); const fx = FX.length >= 2 ? `<dl class="hu3-fx c${FX.length}">${FX.map(f => `<div><dt>${E(f[1])}</dt><dd>${E(String(f[0]))}</dd></div>`).join('')}</dl>` : '';
    const bt = (() => { const c1 = d.cta === '직원 로그인' ? '#login' : g === 'corp' ? '#login' : cl; const c2 = /시설 예약/.test(d.cta2 || '') ? '#p-l-fac' : /공지/.test(d.cta2 || '') ? nt : /학사 일정|개강 일정/.test(d.cta2 || '') ? '#cal' : /이수증/.test(d.cta2 || '') ? '#badges' : ask.h; return `<div class="hu3-bs">${d.cta ? btn(c1, d.cta, 'p') : ''}${d.cta2 ? btn(c2, d.cta2, 'g') : ''}</div>`; })();
    return `<section class="hpt hp-hero hps-hero hu3 hu3-cl"><div class="hu3-w"><div class="hu3-top"><div class="hu3-tx">${head(d)}${bt}${fx}</div><div class="hu3-rt">${figH(p)}${right}</div>${ledgerWho(s, d)}</div></div></section>`; }
  /* 공개 강좌가 없으면 아래 「운영 중인 과정 — 로그인 후 볼 수 있습니다」 빈 카드는 숨긴다(첫 화면 안내판이 그 역할) */
  if (typeof proSec === 'function') { const base = proSec; proSec = (x, i, s, lk) => { try { if (x && x.type === 'classes' && s && (s.theme === 'cmdledger' ? !pubP().length : MINE.includes(s.theme) && emp()) && !(typeof HPE !== 'undefined' && HPE && HPE.map)) return ''; } catch (e) { } return base(x, i, s, lk); }; window.proSec = proSec; }

  { const h0 = HPS.hero; HPS.hero = (kind, s, d, th, T) => { try { const id = s && s.theme; if (MINE.includes(id) && !(d && +d.dstyle && +d.dstyle !== 2)) { const m = HPT.meta(id); const k = kind || (typeof HPS.heroKind === 'function' ? HPS.heroKind(s, d || {}) : m.hk);
        if (k === m.hk && HPT.tokens(s)) { const dd2 = empD(id, dataOf(id, d || {})); const p = typeof HPS.photo === 'function' ? HPS.photo(s, 'hero', d) : null;
          return id === 'coursedesk' ? heroDesk(s, dd2, p) : id === 'learnpath' ? heroPath(s, dd2, p) : heroLedger(s, dd2, p); } } } catch (e) { console.error('hpup-p1 hero', e); } return h0(kind, s, d, th, T); }; }

  /* ── CSS(테마 cssX에 이어 붙인다) ── */
  function css(s, th, T) { const R = ramp(T.a); const A = fit(T.a, '#ffffff', 4.6, '#000000'); const A7 = fit(R[700], '#ffffff', 7, '#000000'); const tint = mix(R[50], '#ffffff', .3);
    const ink = th.ink || '#111816', mu = fit(th.mu || '#4A5550', '#ffffff', 5.2, '#000000'); const ln = 'rgba(17,24,22,.12)'; const wT = fit(WARN, '#ffffff', 4.6, '#000000'); const kT = fit(R[700], R[50], 4.6, '#000000');
    const id = s.theme; const rr = id === 'cmdledger' ? 8 : id === 'learnpath' ? 18 : 14; const br = id === 'learnpath' ? 999 : id === 'cmdledger' ? 8 : 10;
    return `
/* v43.8 hpup-p1(${id}) */
.hps-login,.hps-tel,.hps-utt,.hps-utr a{min-height:44px;display:inline-flex!important;align-items:center}.hps-cta,.hps-hr .hps-cta{min-height:48px!important}.s2-mi>a{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center}.hps-lw,.hp-all{min-height:44px;min-width:44px;display:inline-flex!important;align-items:center}.hps-fl a,.hps-fc li a,.hps-fb a,.hps-lg a{display:inline-flex;align-items:center;min-height:44px;min-width:44px}a[href^="tel:"],a[href^="mailto:"]{display:inline-flex;align-items:center;min-height:44px}.hps-f li>a{min-height:44px;display:flex;align-items:center}
.hps-tag,.hps-new,.hps-wmk small,.hpt dd small,.hpt .hps-fv small,.hp-fl small,.hps-facts small{font-size:13px!important}.hpb-rsum small,.hpt .hps-p b small,.hpt .hps-amt small,.hpt b>small{font-size:13px!important}.s2esc{min-height:44px!important;display:inline-flex!important;align-items:center}.hps-glk a{display:inline-flex;align-items:center;min-height:44px}.hps-new{min-width:22px;height:22px;display:inline-grid;place-items:center}
.hu3{--u-a:${A};--u-a7:${A7};--u-50:${R[50]};--u-100:${R[100]};--u-on:${on(A)};--u-ink:${ink};--u-mu:${mu};--u-ln:${ln};--u-w:${wT};--u-k:${kT};color:var(--u-ink);padding:clamp(16px,2.6vw,32px) 0 clamp(40px,5vw,72px)!important}
.hu3 *{box-sizing:border-box}.hu3 h1,.hu3 h2,.hu3 h3,.hu3 p{margin:0}.hu3 a{text-decoration:none}
.hu3 .hu3-w{max-width:1240px;margin:0 auto;padding:0 clamp(16px,3vw,40px)}
.hpt.hu3 h1{font-size:clamp(30px,3.4vw,46px)!important;line-height:1.18!important;margin:0!important;letter-spacing:-.035em;font-weight:800;word-break:keep-all;overflow-wrap:anywhere}
.hu3 .hu3-ey{display:inline-flex;align-items:center;min-height:30px;padding:4px 12px;border-radius:999px;font-size:14px;font-weight:750;margin-bottom:16px;background:#ffffff;color:var(--u-a7)}
.hu3 .hu3-sub{font-size:17px;line-height:1.65;margin-top:14px;max-width:38em;word-break:keep-all}
.hu3 .hu3-bs{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.hu3 .hu3-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border-radius:${br}px;font-size:16px;font-weight:700;white-space:nowrap;transition:transform .15s,box-shadow .15s}
.hu3 .hu3-b.p{background:var(--u-a);color:var(--u-on)}.hu3 .hu3-b.p:hover{transform:translateY(-1px);box-shadow:0 10px 20px -12px ${al(T.a, .7)}}
.hu3 .hu3-b.g{background:transparent;color:var(--u-ink);box-shadow:inset 0 0 0 1.5px var(--u-ln)}
.hu3 .hu3-b.s{background:var(--u-50);color:var(--u-k)}
.hu3 .hu3-b:focus-visible,.hu3 a:focus-visible{outline:3px solid var(--u-a);outline-offset:2px}
.hu3 .hu3-ph{position:absolute;inset:0;margin:0}.hu3 .hu3-ph img{width:100%;height:100%;display:block}
.hu3 .hu3-scrim{position:absolute;inset:0;pointer-events:none}
.hu3 .hu3-st{font-style:normal;font-size:13px;font-weight:750;padding:4px 10px;border-radius:999px;background:var(--u-50);color:var(--u-k);white-space:nowrap}.hu3 .hu3-st.w{background:${al(WARN, .12)};color:var(--u-w)}
.hu3 .hu3-rows{list-style:none;margin:0;padding:0}.hu3 .hu3-rows li+li{border-top:1px solid var(--u-ln)}
.hu3 .hu3-rows a{display:grid;grid-template-columns:minmax(0,1fr) auto 18px;align-items:center;gap:12px;min-height:64px;padding:12px 4px;color:var(--u-ink)}
.hu3 .hu3-rows a:hover b{color:var(--u-a)}.hu3 .hu3-rows svg,.hu3 .hu3-all svg{color:var(--u-mu)}
.hu3 .hu3-rn{min-width:0;display:flex;flex-direction:column;gap:4px}.hu3 .hu3-rn b{font-size:16px;font-weight:750;line-height:1.35;word-break:keep-all;overflow-wrap:anywhere}.hu3 .hu3-rn small{font-size:13.5px;color:var(--u-mu);line-height:1.45;word-break:keep-all}
.hu3 .hu3-all{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;margin-top:6px;padding:0 4px;border-top:1px solid var(--u-ln);font-size:15px;font-weight:700;color:var(--u-a7)}
.hu3 .hu3-whoh{display:flex;align-items:baseline;justify-content:space-between;gap:8px 24px;flex-wrap:wrap;margin:clamp(36px,4vw,56px) 0 18px}.hu3 .hu3-whoh h2{font-size:clamp(22px,2.2vw,28px);font-weight:800;letter-spacing:-.025em}.hu3 .hu3-whoh p{font-size:15px;color:var(--u-mu)}
.hu3 .hu3-who{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:14px}
.hu3 .hu3-wc{display:flex;flex-direction:column;gap:8px;padding:20px;border-radius:${rr}px;background:#ffffff;box-shadow:inset 0 0 0 1px var(--u-ln);min-width:0}
.hu3 .hu3-wk{align-self:flex-start;font-size:13px;font-weight:800;color:var(--u-k);background:var(--u-50);padding:4px 10px;border-radius:999px}
.hu3 .hu3-wc h3{font-size:17px;font-weight:800;line-height:1.4;letter-spacing:-.015em;word-break:keep-all}.hu3 .hu3-wm{font-size:14px;color:var(--u-mu);line-height:1.5;word-break:keep-all;overflow-wrap:anywhere}
.hu3 .hu3-wl{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:8px}.hu3 .hu3-wl .hu3-b{min-height:44px;padding:0 14px;font-size:14.5px;flex:1 1 auto}
.hu3 .hu3-priv{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:14px;color:var(--u-mu)}
/* 코스 데스크: 사진 카드 + 신청 가능 강좌 옆판 */
.hu3-cd .hu3-top{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:20px;align-items:stretch}.hu3-cd .hu3-top.one{grid-template-columns:1fr}
.hu3-cd .hu3-card{position:relative;border-radius:${rr + 4}px;overflow:hidden;min-height:540px;display:flex;align-items:flex-end;background:${R[900]}}
.hu3-cd .hu3-scrim{background:linear-gradient(0deg,rgba(7,11,9,.86) 0%,rgba(7,11,9,.62) 42%,rgba(7,11,9,.12) 78%)}
.hu3-cd .hu3-tx{position:relative;padding:clamp(24px,3.4vw,44px);color:#ffffff}.hu3-cd .hu3-sub{color:rgba(255,255,255,.92)}
.hu3-cd .hu3-tx .hu3-b.g,.hu3-lp .hu3-tx .hu3-b.g{color:#ffffff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7)}
.hu3-cd .hu3-side{display:flex;flex-direction:column;padding:22px 22px 12px;border-radius:${rr + 4}px;background:#ffffff;box-shadow:inset 0 0 0 1px var(--u-ln),0 18px 40px -28px rgba(16,24,20,.3)}
.hu3-cd .hu3-sh{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:10px;border-bottom:2px solid var(--u-ink)}.hu3-cd .hu3-sh p{font-size:16px;font-weight:800}.hu3-cd .hu3-sh span{font-size:14px;font-weight:700;color:var(--u-mu)}
.hu3-cd .hu3-all{margin-top:auto}
/* 러닝 패스: 전면 사진 + 흰 경로 판(단계 = 실제 경로) */
.hpt.hu3.hu3-lp{padding:0 0 clamp(40px,5vw,72px)!important}
.hu3-lp .hu3-cv{position:relative;min-height:620px;display:flex;align-items:center;background:${R[900]};overflow:hidden}
.hu3-lp .hu3-scrim{background:linear-gradient(90deg,rgba(6,10,8,.88) 0%,rgba(6,10,8,.7) 46%,rgba(6,10,8,.38) 100%)}
.hu3-lp .hu3-cvi{position:relative;width:100%;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(24px,4vw,64px);align-items:center;padding-top:56px;padding-bottom:56px}
.hu3-lp .hu3-tx{color:#ffffff}.hu3-lp .hu3-sub{color:rgba(255,255,255,.92)}.hpt.hu3-lp h1{font-size:clamp(32px,3.6vw,52px)!important}
.hu3-lp .hu3-pp{background:#ffffff;border-radius:${rr}px;padding:20px 18px 10px;box-shadow:0 24px 48px -24px rgba(0,0,0,.5)}
.hu3-lp .hu3-pph{font-size:14px;font-weight:750;color:var(--u-mu);padding:0 6px 8px}
.hu3-lp ol{list-style:none;margin:0;padding:0;position:relative}.hu3-lp ol::before{content:"";position:absolute;left:25px;top:30px;bottom:30px;width:2px;background:var(--u-100)}
.hu3-lp ol a{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) 18px;gap:14px;align-items:center;min-height:68px;padding:10px 6px;border-radius:12px;color:var(--u-ink)}.hu3-lp ol a:hover{background:var(--u-50)}
.hu3-lp ol i{font-style:normal;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--u-a);color:var(--u-on);font-weight:800;font-size:16px;box-shadow:0 0 0 5px #ffffff}
.hu3-lp ol li:not(:first-child) i{background:#ffffff;color:var(--u-k);box-shadow:inset 0 0 0 2px var(--u-100),0 0 0 5px #ffffff}
.hu3-lp ol span{display:flex;flex-direction:column;gap:3px;min-width:0}.hu3-lp ol b{font-size:16.5px;font-weight:800}.hu3-lp ol small{font-size:14px;color:var(--u-mu);line-height:1.45;word-break:keep-all}.hu3-lp ol svg{color:var(--u-mu)}
.hu3-lp .hu3-band{background:${tint}}.hu3-lp .hu3-band .hu3-whoh{margin-top:0;padding-top:clamp(36px,4vw,56px)}.hu3-lp .hu3-band{padding-bottom:clamp(36px,4vw,56px);margin-bottom:calc(-1 * clamp(40px,5vw,72px))}
.hu3-lp .hu3-wc{border-radius:16px}
/* 커맨드 레저: 글 + 숫자(실제 셈) | 사진 + 강좌 장부 */
.hu3-cl .hu3-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);grid-template-areas:"tx rt" "lw rt";column-gap:clamp(24px,4vw,56px);row-gap:28px;align-items:start;padding-top:clamp(8px,2vw,24px)}
.hu3-cl .hu3-top>.hu3-tx{grid-area:tx}.hu3-cl .hu3-top>.hu3-rt{grid-area:rt}.hu3-cl .hu3-top>.hu3-lw{grid-area:lw}.hu3-cl .hu3-top>.hu3-priv{grid-column:1 / -1}
.hu3-cl .hu3-ey{background:var(--u-50);color:var(--u-k);border-radius:6px;letter-spacing:.02em}
.hpt.hu3-cl h1{font-size:clamp(30px,3.2vw,44px)!important;font-weight:750!important}
.hu3-cl .hu3-sub{color:var(--u-mu)}
.hu3-cl .hu3-fx{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:28px 0 0;border-top:2px solid var(--u-ink)}.hu3-cl .hu3-fx.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.hu3-cl .hu3-fx div{padding:12px 14px 0 0;display:flex;flex-direction:column-reverse;gap:4px}.hu3-cl .hu3-fx div+div{padding-left:14px;border-left:1px solid var(--u-ln)}
.hu3-cl .hu3-fx dd{margin:0;font-size:clamp(24px,2.2vw,30px);font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:var(--u-ink)}.hu3-cl .hu3-fx dt{font-size:13.5px;color:var(--u-mu);font-weight:600;word-break:keep-all}
.hu3-cl .hu3-rt{position:relative;display:flex;flex-direction:column}
.hu3-cl .hu3-ph{position:relative;inset:auto;height:340px;border-radius:${rr}px;overflow:hidden}
.hu3-cl .hu3-led{position:relative;margin:-56px 0 0 clamp(0px,3vw,32px);background:#ffffff;border-radius:${rr}px;box-shadow:inset 0 0 0 1px var(--u-ln),0 20px 40px -26px rgba(14,19,18,.35);padding:6px 18px 4px}
.hu3-cl .hu3-lh,.hu3-cl .hu3-lr{display:grid;grid-template-columns:minmax(0,1fr) 108px 96px;gap:12px;align-items:center}
.hu3-cl .hu3-lh{min-height:44px;font-size:13px;font-weight:750;color:var(--u-mu);border-bottom:2px solid var(--u-ink)}.hu3-cl .hu3-lh span:last-child,.hu3-cl .hu3-lr span:last-child{text-align:right}
.hu3-cl .hu3-lr{min-height:62px;padding:10px 0;border-bottom:1px solid var(--u-ln);color:var(--u-ink)}.hu3-cl .hu3-lr:hover b{color:var(--u-a)}
.hu3-cl .hu3-gd .hu3-lr{grid-template-columns:minmax(0,1fr) 18px}.hu3-cl .hu3-gd .hu3-lr:last-child{border-bottom:0}.hu3-cl .hu3-gd svg{color:var(--u-mu)}.hu3-cl .hu3-gdh{min-height:44px;display:flex;align-items:center;font-size:15px;font-weight:800;border-bottom:2px solid var(--u-ink)}
.hu3-cl .hu3-ln{display:flex;flex-direction:column;gap:3px;min-width:0}.hu3-cl .hu3-ln b{font-size:15.5px;font-weight:750;word-break:keep-all;overflow-wrap:anywhere}.hu3-cl .hu3-ln small{font-size:13px;color:var(--u-mu)}
.hu3-cl .hu3-lp2{font-size:14px;font-variant-numeric:tabular-nums;color:var(--u-ink);white-space:nowrap}
.hu3-cl .hu3-all{border-top:0}
.hu3-cl .hu3-lwh{font-size:17px;font-weight:800;padding-bottom:10px;border-bottom:2px solid var(--u-ink)}
.hu3-cl .hu3-lw ul{list-style:none;margin:0;padding:0}.hu3-cl .hu3-lw li{display:grid;grid-template-columns:84px minmax(0,1fr) auto;gap:6px 12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--u-ln)}
.hu3-cl .hu3-lw .hu3-wk{justify-self:start;font-size:13px;font-weight:800;color:var(--u-k);background:var(--u-50);padding:4px 8px;border-radius:6px;white-space:nowrap}
.hu3-cl .hu3-lwt{display:flex;flex-direction:column;gap:2px;min-width:0}.hu3-cl .hu3-lwt b{font-size:15.5px;font-weight:750;word-break:keep-all}.hu3-cl .hu3-lwt small{font-size:13.5px;color:var(--u-mu);word-break:keep-all}
.hu3-cl .hu3-lwb{display:flex;flex-wrap:nowrap;gap:6px}.hu3-cl .hu3-lwb .hu3-b{min-height:44px;padding:0 12px;font-size:14px}.hu3-cl .hu3-lwb .hu3-b svg{display:none}@media(max-width:1180px) and (min-width:901px){.hu3-cl .hu3-lw li{grid-template-columns:84px minmax(0,1fr)}.hu3-cl .hu3-lwb{grid-column:2}}
@media(max-width:900px){
.hu3-cd .hu3-top,.hu3-cl .hu3-top,.hu3-lp .hu3-cvi{grid-template-columns:1fr}.hu3-cl .hu3-top{grid-template-areas:"tx" "rt" "lw"}
.hu3-cd .hu3-card{min-height:440px}
.hu3-lp .hu3-cv{min-height:0}.hu3-lp .hu3-cvi{padding-top:40px;padding-bottom:28px}
.hu3-cl .hu3-ph{height:200px}.hu3-cl .hu3-led{margin:-32px 0 0 0;padding:4px 14px 2px}
}
@media(max-width:640px){
.hpt.hu3 h1,.hpt.hu3-lp h1,.hpt.hu3-cl h1{font-size:28px!important;line-height:1.26!important}.hu3 .hu3-sub{font-size:16px}.hu3 .hu3-bs .hu3-b{flex:1 1 100%}
.hu3-cd .hu3-card{min-height:420px;border-radius:16px}.hu3-cd .hu3-side{padding:16px 16px 6px}
.hu3 .hu3-rows a{grid-template-columns:minmax(0,1fr) auto;gap:10px}.hu3 .hu3-rows a>svg{display:none}
.hu3 .hu3-who{gap:10px}.hu3 .hu3-wc{padding:16px}.hu3 .hu3-whoh{margin-top:32px}
.hu3-cl .hu3-lh{display:none}.hu3-cl .hu3-lr{grid-template-columns:minmax(0,1fr) auto;row-gap:4px}.hu3-cl .hu3-lp2{grid-column:1;grid-row:2;font-size:13.5px;color:var(--u-mu)}.hu3-cl .hu3-lr span:last-child{grid-column:2;grid-row:1 / span 2}
.hu3-cl .hu3-gd{display:none}.hu3-cl .hu3-led .hu3-lr:nth-of-type(4){display:none}.hu3-cl .hu3-lwt small{display:none}.hu3-cl .hu3-lw li{grid-template-columns:auto minmax(0,1fr);padding:10px 0;gap:8px 10px}.hu3-cl .hu3-lwb{grid-column:1 / -1;flex-wrap:nowrap}.hu3-cl .hu3-lwb .hu3-b{flex:1 1 0;min-width:0}.hu3-cl .hu3-ph{height:150px}.hu3-cl .hu3-lr{min-height:52px;padding:8px 0}.hu3-cl .hu3-fx{margin-top:20px}.hu3-cl .hu3-bs{margin-top:18px}.hu3-cl .hu3-top{row-gap:20px}.hu3-cl .hu3-lwb .hu3-b{flex:1 1 40%}.hu3-cl .hu3-fx div{padding-right:8px}.hu3-cl .hu3-fx div+div{padding-left:10px}.hu3-cl .hu3-fx dd{font-size:24px}
.hu3-lp ol a{grid-template-columns:36px minmax(0,1fr) 16px;gap:12px}.hu3-lp ol i{width:36px;height:36px}.hu3-lp ol::before{left:23px}}
@media(prefers-reduced-motion:reduce){.hu3 .hu3-b{transition:none}}`; }
  MINE.forEach(id => { const th = HPT.meta(id); const c0 = th.cssX; th.cssX = (s, t, T, u) => { let x = ''; try { x = typeof c0 === 'function' ? c0(s, t, T, u) : ''; } catch (e) { console.error('hpup-p1 cssX0', e); } try { x += css(s, t, T); } catch (e) { console.error('hpup-p1 css', e); } return x; }; });

  /* ── 새 사이트: 템플릿 build를 유형별 문구로(섹션 순서는 그대로, 첫 화면 숫자와 겹치는 숫자 띠만 뺀다) ── */
  if (typeof TPL !== 'undefined' && Array.isArray(TPL)) MINE.forEach(id => { const tp = TPL.find(t => t.id === 'prem-' + id); if (!tp || tp.hu3) return; const b0 = tp.build; if (typeof b0 !== 'function') return;
    tp.build = (...a) => { const L = b0(...a); try { const bn = L.find(x => x && x.type === 'banner'); const c = copyOf(id); if (bn && bn.data && c) Object.assign(bn.data, { eyebrow: c.eyebrow, title: c.title, sub: c.sub, cta: c.cta, cta2: c.cta2 });
        const g = grp(); const tx = (v, f) => { const x = L.find(y => y && y.type === 'text' && y.data && y.data.variant === v); if (x) f(x.data); };
        if (id === 'cmdledger' && g !== 'corp') tx('features', d => { d.title = '이용 안내'; d.cols = g === 'univ' ? [['학번 로그인', '학번 · 학과로만 확인하고 바로 신청해요'], ['이수 기록', '출석 · 진도 · 이수증을 한곳에서 확인해요'], ['학사 일정', '신청 · 개강 · 종강 일정을 달력으로 봐요']] : g === 'k12' || g === 'adult' ? [['상담 예약', '수준에 맞는 반을 상담으로 정해요'], ['수업 알림', '출결 · 숙제 · 진도를 알림으로 받아요'], ['수강료', '반별 수강료를 투명하게 안내해요']] : g === 'voc' ? [['국비 지원', '내일배움카드로 수강료를 지원받아요'], ['출결 · 진도', '훈련 기록이 자동으로 남아요'], ['수료 · 취업', '수료 기준과 취업 연계를 안내해요']] : [['온라인 신청', '강좌를 고르고 바로 신청해요'], ['어디서나 수강', 'PC · 휴대폰으로 이어서 들어요'], ['수료증', '수료 기준을 채우면 바로 받아요']]; });
        if (id === 'coursedesk' && g === 'k12') tx('steps', d => { d.title = '등록 방법'; d.cols = [['상담 예약', '전화나 게시판으로 상담을 잡아요'], ['레벨 테스트', '아이 수준을 함께 확인해요'], ['반 배정', '시간표에 맞는 반을 정해요'], ['수업 시작', '출결 · 숙제 알림을 받아요']]; });
        if (id === 'coursedesk' && g === 'corp') tx('steps', d => { d.title = '이수 방법'; d.cols = [['로그인', '사번으로 로그인해요'], ['내 교육 확인', '필수 교육과 기한을 확인해요'], ['수강', 'PC · 휴대폰으로 들어요'], ['이수증', '기준을 채우면 이수증이 남아요']]; });
        if (id === 'learnpath' || id === 'cmdledger' || id === 'coursedesk') { const k = L.findIndex(x => x && x.type === 'text' && x.data && x.data.hpt === 'facts'); if (k >= 0) L.splice(k, 1); }
        if (id === 'learnpath') { const k = L.findIndex(x => x && x.type === 'text' && x.data && x.data.variant === 'timeline'); if (k >= 0) L.splice(k, 1); }
      } catch (e) { console.error('hpup-p1 build', e); } return L; }; tp.hu3 = 1; });

  /* ── 새 사이트: 유형에 맞는 첫 화면 사진(사진을 직접 고르지 않은 새 사이트만) ── */
  const PH = { coursedesk: { life: 'hum-14', voc: 'wrk-07', k12: 'dsk-03', corp: 'hum-04', pub: 'hum-14' }, learnpath: { voc: 'wrk-07', life: 'hum-38', k12: 'dsk-03', corp: 'hum-04' }, cmdledger: { corp: 'hum-04', pub: 'lib-05', life: 'hum-14', voc: 'wrk-07', k12: 'dsk-03', adult: 'hum-01' } };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hu3) { const base = siteFromTpl; const f = tp => { const s = base(tp); try { const id = tp && tp.theme; const pid = PH[id] && PH[id][grp()];
      if (pid && MINE.includes(id) && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function' && !(s.img && s.img.hero && !s.img.hero.stock)) { const v = HPSTOCK.slotImg(pid, 'hero'); if (v) { s.photos = Object.assign({}, s.photos, { hero: pid }); s.img = Object.assign({}, s.img, { hero: v }); } } } catch (e) { console.error('hpup-p1 photo', e); } return s; };
    Object.keys(base).forEach(k => { try { f[k] = base[k]; } catch (e) { } }); f.hu3 = 1; siteFromTpl = f; window.siteFromTpl = f; }
})();
