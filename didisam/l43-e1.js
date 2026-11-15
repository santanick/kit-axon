/* v43 E1 — 관리자 화면 1~42 중 나머지 33장에 「한 문장 브리핑」 · L43 표 · 빈 상태 일러스트를 등록합니다(patterns-d2.md).
 * 렌더 코드 · data-act · id는 건드리지 않고 L43.reg 로만 붙입니다. 상세 · 편집 화면과 데이터 0건(빈 카드가 나오는 경우)은 브리핑을 숨깁니다(null).
 * 화면별 CSS 보정은 l43-e1.css(#main[data-l43="<탭>"] 범위). */
(function () {
  'use strict';
  if (!window.L43) return;
  const R = L43.reg;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = k => { try { return t(k); } catch (e) { return k; } };
  const A = k => (S && Array.isArray(S[k])) ? S[k] : [];
  const ym = () => { try { return today().slice(0, 7); } catch (e) { return new Date().toISOString().slice(0, 7); } };
  const won0 = n => { try { return won(n); } catch (e) { return (Math.round(n) || 0).toLocaleString('ko-KR') + '원'; } };
  const num = (main, re) => { const m = (main.innerText || '').match(re); return m ? +String(m[1]).replace(/,/g, '') : 0; };
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const prog = c => { try { return avgP(c); } catch (e) { return 0; } };
  const memP = id => avg(A('classes').filter(c => (c.learners || []).includes(id)).map(c => +(((c.prog || {})[id]) || {}).p || 0));
  const empty = main => !!main.querySelector('.slg-empty, .v4-empty, .l43-empty:not(.l43-emptyp)');

  /* ── 학습 공간 ── */
  R('attend', { art: 'check', brief: main => {
    if (empty(main) || UI.attSel || UI.attS) return null; const C = A('classes').filter(c => c.kind === 'episode' || (c.sessions || []).length); if (!C.length) return null;
    const N = C.reduce((a, c) => a + (c.learners || []).length, 0);
    return { eye: '출결', title: `출결을 받는 ${E(L('cls'))} <em>${C.length}개</em>, ${E(L('learner'))} ${N}명입니다`, sub: '태블릿용 출석 체크 화면을 열어 두면 도착한 순서대로 바로 출석이 기록됩니다. 결석이 2회 이상이면 보호자 · 본인에게 안내하세요.' };
  } });
  R('cert', { art: 'check', brief: main => {
    if (empty(main) || UI.certSel) return null; const C = A('certs'); if (!C.length) return null; const m = C.filter(c => String(c.at || '').startsWith(ym())).length; const man = C.filter(c => c.manual).length;
    return { eye: '수료증', title: `수료증 <em>${C.length}건</em>을 발급했습니다`, sub: '이수 기준을 채운 사람에게는 자동으로 발급됩니다. 디자인을 바꾸면 이후 발급분부터 적용됩니다.', stats: [[C.length + '건', '누적 발급'], [m + '건', '이번 달'], [man + '건', '수동 발급']] };
  } });
  R('badge', { art: 'check', brief: main => {
    if (empty(main) || UI.bdSel) return null; const B = A('badges'); if (!B.length) return null; const iss = B.reduce((a, b) => a + (b.issued || []).length, 0);
    return { eye: '배지', title: `배지 <em>${B.length}종</em>을 운영하고, ${iss}건을 발급했습니다`, sub: '평가를 통과하면 자동으로 발급되는 배지와 수동 발급 배지를 함께 관리합니다.' };
  } });
  R('book', { art: 'list', brief: main => {
    if (empty(main) || UI.bkEdit) return null; const B = A('books'); if (!B.length) return null; const sold = B.reduce((a, b) => a + (+b.sold || 0), 0); const wait = B.filter(b => b.kind === '실물').reduce((a, b) => a + Math.max(0, (+b.sold || 0) - (+b.delivered || 0)), 0);
    return { eye: '교재', title: wait ? `전달을 기다리는 실물 교재 <em>${wait}건</em>이 있습니다` : `교재 <em>${B.length}권</em>을 판매하고 있습니다`, sub: wait ? '전달을 마치면 [전달 완료]로 바꿔 주세요. 전달 전에는 환불이 가능합니다.' : '전자책은 결제 후 바로 내려받고, 실물은 전달 완료로 표시합니다.', stats: [[B.length + '권', '교재'], [sold + '권', '누적 판매'], [wait + '건', '전달 대기', wait ? 'warn' : '']] };
  } });
  R('clib', { art: 'list', enhance: main => {
    /* 썸네일이 비어 있는 카드(영상 · 문서 · 퀴즈)는 제목 낱말로 고른 CC0 스톡 사진을 깔고, 글자 띠는 그대로 둡니다 */
    main.querySelectorAll('.clb-th:not([data-e1])').forEach(th => { th.dataset.e1 = 1; if (th.querySelector('img') || th.classList.contains('k-b') || /url\(/.test(th.style.backgroundImage || '')) return;
      const box = th.parentElement; const nm = ((box && box.querySelector('b, h3, h4, strong')) || {}).textContent || ''; const u = L43.photo(L43.wordsOf(nm), nm); if (!u) return;
      th.style.backgroundImage = `linear-gradient(rgba(4,20,10,.28),rgba(4,20,10,.28)),url("${u}")`; th.style.backgroundSize = 'cover'; th.style.backgroundPosition = 'center'; th.classList.add('e1-ph'); });
  }, brief: main => {
    if (empty(main) || UI.clbId) return null; const n = num(main, /전체\s*([\d,]+)/); if (!n) return null; const v = num(main, /영상\s*([\d,]+)/);
    return { eye: '콘텐츠 라이브러리', title: `콘텐츠 <em>${n}개</em>를 한곳에서 관리합니다`, sub: `영상 ${v}개를 포함해 문서 · 퀴즈 · 디지털북을 만들고, [${E(L('cls'))}에 넣기]로 원하는 차시에 붙입니다.` };
  } });
  R('journey', { art: 'list', brief: main => {
    if (empty(main)) return null; const J = A('journey'); if (!J.length) return null; const cls = new Set(J.flatMap(j => j.cls || [])).size;
    return { eye: '러닝 저니', title: `<em>${J.length}단계</em> 러닝 저니에 ${E(L('cls'))} ${cls}개가 이어져 있습니다`, sub: '단계를 마치면 배지가 발급되고 다음 단계가 열립니다. 열림 조건과 순서는 각 단계에서 바꿉니다.' };
  } });
  R('diag', { art: 'check', brief: main => {
    if (empty(main) || UI.dgEdit || UI.dgRes) return null; const m = (main.innerText || '').match(/(\d+)명 응시\((\d+)%\)/); if (!m) return null;
    return { eye: 'AI 진단', title: `진단 응시율 <em>${m[2]}%</em>, ${m[1]}명이 응시했습니다`, sub: '응시하지 않은 학생에게 안내를 보내고, 결과 보기에서 유형별로 다음 단계 교과목을 배정하세요.' };
  } });
  R('calendar', { art: 'doc', brief: main => {
    if (empty(main)) return null; const n = main.querySelectorAll('.cx-ev').length; if (!n) return null; const td = (() => { try { return today(); } catch (e) { return ''; } })();
    const tn = main.querySelectorAll(`[data-cxday="${td}"] .cx-ev`).length;
    return { eye: '일정', title: tn ? `오늘 일정 <em>${tn}건</em>이 있습니다` : `이번 달 일정 <em>${n}건</em>이 잡혀 있습니다`, sub: '날짜 칸을 누르면 일정을 추가하고, 일정을 끌어 옮기면 학습자 달력에도 바로 반영됩니다.' };
  } });
  R('tutorial', { art: 'list', brief: main => {
    if (empty(main) || UI.tuId) return null; const T = A('tuts'); if (!T.length) return null; const pub = T.filter(x => x.pub !== false).length;
    return { eye: '따라 하기 영상', title: `따라 하기 영상 <em>${T.length}개</em> 가운데 ${pub}개를 게시했습니다`, sub: '수준 · 유형별로 정리해 두면 학습자가 필요한 실습을 바로 찾습니다.' };
  } });
  R('grade', { art: 'doc', brief: main => {
    if (empty(main) || !main.querySelector('.tw table')) return null;
    return { eye: '성적', title: '성적을 계산하고 <em>확정</em>합니다', sub: '평가 비율을 확인한 뒤 산출 결과를 검토하고 확정하세요. 확정 전에는 학생에게 공개되지 않습니다.' };
  } });

  /* ── 학생 공간 ── */
  R('groups', { art: 'people', brief: main => {
    if (empty(main) || UI.grp) return null; const G = A('groups'); if (!G.length) return null; const M = A('members'); const none = M.filter(m => !m.group || !G.some(g => g.id === m.group)).length; const nolead = G.filter(g => !g.lead).length;
    return { eye: L('group'), title: `${E(L('group'))} <em>${G.length}개</em>에 ${E(L('learner'))} ${M.length - none}명이 속해 있습니다`, sub: none ? `아직 ${E(L('group'))}에 넣지 않은 ${none}명을 먼저 배정하세요.` : (nolead ? `담당자가 없는 ${E(L('group'))} ${nolead}개에 담당자를 지정하세요.` : '모든 인원이 배정되어 있습니다.'), stats: [[G.length + '개', L('group')], [none + '명', '미배정', none ? 'warn' : ''], [nolead + '개', '담당 없음', nolead ? 'warn' : '']] };
  } });
  R('parents', { art: 'people', brief: main => {
    if (empty(main)) return null; const P = A('parents'); if (!P.length) return null; const w = P.filter(p => /대기/.test(p.status || '')).length; const ok = P.filter(p => /완료/.test(p.status || '')).length;
    return { eye: '보호자', title: w ? `연결을 기다리는 보호자 <em>${w}명</em>이 있습니다` : `보호자 <em>${ok}명</em>이 연결되어 있습니다`, sub: w ? '대기 중인 요청을 확인해 자녀와 연결하세요. 연결된 보호자는 출결 · 수납 알림을 받습니다.' : '출결 · 수납 알림이 연결된 보호자에게 갑니다.', stats: [[P.length + '명', '전체'], [ok + '명', '연결 완료'], [w + '명', '대기', w ? 'warn' : '']] };
  } });
  R('admins', { art: 'people', brief: main => {
    if (empty(main)) return null; const Ad = A('admins'); if (!Ad.length) return null; const by = r => Ad.filter(a => a.role === r).length;
    return { eye: '운영자 · 기록', title: `운영자 <em>${Ad.length}명</em>이 스튜디오를 함께 운영합니다`, sub: '권한은 메뉴별로 다릅니다. 담당 범위를 정해 두면 그 범위의 학습자만 보입니다. 모든 변경은 감사 로그에 남습니다.', stats: [[by('owner') + '명', '정운영자'], [by('staff') + '명', '부운영자'], [by('teacher') + '명', L('teacher')]] };
  } });
  R('enroll', { art: 'people', brief: main => {
    if (empty(main)) return null; const M = A('members'); const w = M.filter(m => m.grade === '승인 대기').length; const inv = A('invites').filter(i => i.active).length;
    return { eye: '등록 · 초대', title: w ? `가입 승인 대기 <em>${w}명</em>을 먼저 처리하세요` : `활성 초대 링크 <em>${inv}개</em>로 ${E(L('learner'))}을 받고 있습니다`, sub: '엑셀(CSV)로 한 번에 등록하거나, 초대 링크 · 알림톡으로 직접 가입하게 할 수 있습니다.', stats: [[M.length + '명', '등록'], [w + '명', '승인 대기', w ? 'warn' : ''], [inv + '개', '초대 링크']] };
  } });
  R('crmatt', { art: 'check', brief: main => {
    if (empty(main)) return null; const m = (main.innerText || '').match(/수업\s*(\d+)개\s*·\s*미입력\s*(\d+)명/); if (!m) return null;
    return { eye: '출석부', title: +m[2] ? `오늘 출결 미입력 <em>${m[2]}명</em>이 남았습니다` : '오늘 출결을 <em>모두 입력</em>했습니다', sub: `오늘 수업 ${m[1]}개입니다. 수업이 끝나면 [미입력 전체 출석]으로 한 번에 처리하고, 결석 · 지각만 바꾸세요.` };
  } });

  /* ── 소통 공간 ── */
  R('message', { art: 'doc', brief: main => {
    if (empty(main)) return null; const Ms = A('msgs'); if (!Ms.length) return null; const m = Ms.filter(x => String(x.at || '').startsWith(ym())); const n = m.reduce((a, x) => a + (+x.n || (x.toIds || []).length || 1), 0);
    return { eye: '메시지', title: `이번 달 메시지 <em>${m.length}건</em>, ${n}명에게 보냈습니다`, sub: '받는 사람을 고르고 내용을 쓰면 앱 푸시 · 알림톡 · 이메일 가운데 받을 수 있는 경로로 보냅니다.' };
  } });
  R('community', { art: 'list', brief: main => {
    if (empty(main) || UI.cmPost) return null; const P = A('posts').filter(p => !p.hidden); if (!P.length) return null; const q = P.filter(p => p.kind === '질문' && !+p.replies).length;
    return { eye: '게시판', title: q ? `답변을 기다리는 질문 <em>${q}건</em>이 있습니다` : `게시글 <em>${P.length}건</em>, 모든 질문에 답했습니다`, sub: q ? '오래된 질문부터 답하세요. [답변 초안]을 누르면 AI SAM이 강의 자료를 근거로 초안을 씁니다.' : '새 질문이 올라오면 이 화면 맨 위에 모입니다.' };
  } });
  R('consult', { art: 'list', brief: main => {
    if (empty(main) || UI.csId) return null; const C = A('consults'); if (!C.length) return null; const op = C.filter(c => /진행|대기/.test(c.status || '')).length;
    return { eye: '상담', title: op ? `진행 중인 상담 <em>${op}건</em>이 있습니다` : `상담 <em>${C.length}건</em>을 모두 마쳤습니다`, sub: '대면 상담은 녹음 · 메모를 남기면 AI가 요약하고, 채널톡 상담은 연동하면 이곳에 모입니다.' };
  } });
  R('board', { art: 'doc', brief: main => {
    if (empty(main) || UI.nEdit) return null; const n = num(main, /공지\s*\/?\s*([\d,]+)건/) || main.querySelectorAll('.tw tbody tr').length; if (!n) return null; const pin = main.querySelectorAll('.cmn-pb.on').length;
    return { eye: '공지', title: `공지 <em>${n}건</em>을 게시하고 있습니다`, sub: `${pin ? `상단 고정 ${pin}건은 학습자 사이트 맨 위에 보입니다. ` : ''}중요한 공지는 [알림 보내기]로 앱 푸시까지 보내세요.` };
  } });

  /* ── 운영 공간 ── */
  R('academic', { art: 'doc', brief: main => {
    if (empty(main)) return null; const M = A('members'); if (!M.length) return null; const low = M.filter(m => A('classes').some(c => (c.learners || []).includes(m.id)) && memP(m.id) < 30).length;
    return { eye: '학사 · 비교과', title: low ? `학습 위험군 <em>${low}명</em>을 지도교수에게 알리세요` : `학생 <em>${M.length}명</em>의 학과별 학습 현황입니다`, sub: '진도 30% 미만 학생은 위험군으로 모입니다. 비교과 이수 · 배지 취득은 포인트로 쌓여 장학 · 인증제와 이어집니다.' };
  } });
  R('lifelong', { art: 'check', brief: main => {
    if (empty(main)) return null; const all = main.querySelectorAll('.ll-ck').length; const ok = main.querySelectorAll('.ll-ck.ok').length; if (!all) return null;
    return { eye: '평생교육 운영', title: ok < all ? `운영 요건 <em>${all - ok}개</em>를 아직 갖추지 않았습니다` : '운영 요건을 <em>모두</em> 갖췄습니다', sub: '평생교육법 기준 요약입니다. 실제 신고 전에는 관할 교육청에 확인하세요. 학습비 반환은 신청일로부터 5일 안에 처리합니다.', stats: [[ok + '/' + all, '갖춘 요건', ok < all ? 'warn' : '']] };
  } });
  R('sales', { art: 'doc', brief: main => {
    if (empty(main)) return null; const P = A('pays'); if (!P.length) return null; const m = P.filter(p => String(p.at || '').startsWith(ym())); const ok = m.filter(p => /완료/.test(p.status || '')).reduce((a, p) => a + (+p.amount || 0), 0); const rf = m.filter(p => /환불/.test(p.status || '')).length;
    return { eye: '매출', title: `이번 달 결제 <em>${won0(ok)}</em>`, sub: rf ? `환불 ${rf}건이 있습니다. 결제 목록에서 사유를 확인하세요.` : '이번 달 환불은 없습니다. 결제 수수료는 PG사 수수료만 부과됩니다.' };
  } });
  R('billing', { art: 'doc', brief: main => {
    if (empty(main)) return null; const B = A('bills'); if (!B.length) return null; const un = B.filter(b => b.status === '미납'); const late = un.filter(b => b.due && b.due < today()).length;
    return { eye: '청구서', title: un.length ? `미납 청구서 <em>${un.length}건</em>, 납기 지난 ${late}건을 먼저 안내하세요` : '이번 청구서는 <em>모두 수납</em>되었습니다', sub: '[미납 안내]를 보내면 보호자에게 결제 링크가 함께 갑니다.' };
  } });
  R('org', { art: 'people', brief: main => {
    if (empty(main) || UI.orgId) return null; const O = A('orgs'); if (!O.length) return null; const n = O.reduce((a, o) => a + (+o.n || 0), 0);
    return { eye: '기관 관리', title: `협력 기관 <em>${O.length}곳</em>, 회원 ${n}명을 관리합니다`, sub: '기관 담당자는 운영자 · 권한에서 「기관 담당자」로 지정하면 자기 기관 현황만 봅니다.' };
  } });
  R('auto', { art: 'gear', brief: main => {
    if (empty(main)) return null; const Au = A('autos'); if (!Au.length) return null; const on = Au.filter(a => a.on).length; const ap = Au.filter(a => a.on && a.approve).length;
    return { eye: '자동화', title: `자동화 <em>${on}개</em>가 켜져 있습니다`, sub: ap ? `그중 ${ap}개는 실행 전에 승인을 받습니다. 한 줄로 적으면 언제 · 조건 · 할 일 세 칸을 채워 드립니다.` : '한 줄로 적으면 언제 · 조건 · 할 일 세 칸을 채워 드립니다.', stats: [[Au.length + '개', '전체'], [on + '개', '켜짐'], [ap + '개', '승인 후 실행']] };
  } });
  R('docs', { art: 'doc', brief: main => {
    if (empty(main) || UI.docId) return null; const D = A('docs');
    return { eye: '문서 만들기', title: D.length ? `우리 기관 문서 <em>${D.length}건</em>을 만들었습니다` : '서식을 고르면 <em>AI</em>가 기관 정보로 문서를 채웁니다', sub: '계획 → 준비 → 운영 → 평가 → 결과 보고 순서로 서식을 정리했습니다. 빈 칸만 확인하고 내려받으세요.' };
  } });
  R('conn', { art: 'gear', brief: main => {
    if (empty(main)) return null; const ok = main.querySelectorAll('.brl.on, [data-conn="on"]').length || num(main, /연결됨\s*[\/·]?\s*(\d+)/);
    return { eye: '외부 연결', title: ok ? `외부 서비스 <em>${ok}개</em>가 연결되어 있습니다` : 'Slack · Google · 결제 서비스를 <em>연결</em>하세요', sub: '연결 정보(키 · 토큰)는 안전하게 보관하고 화면에는 가려서 표시합니다.' };
  } });
  R('sis', { art: 'gear', brief: main => {
    if (empty(main)) return null; const last = /마지막 동기화\s*\/?\s*없음/.test((main.innerText || '').replace(/\n/g, ' / '));
    return { eye: '학사 연동', title: last ? '학사 시스템과 <em>첫 동기화</em>를 시작하세요' : '학사 시스템과 <em>동기화</em>되어 있습니다', sub: '학기 · 교과목 · 수강 등록을 학사 시스템에서 받아 강의실을 만듭니다. 연동 방식은 학교 정보화 부서와 정합니다.' };
  } });
  R('aigov', { art: 'gear', brief: main => {
    if (empty(main)) return null; const m = (main.innerText || '').match(/AI기본법 항목\s*\/?\s*(\d+)\/(\d+)/);
    return { eye: 'AI 관리', title: m ? `AI기본법 항목 <em>${m[1]}/${m[2]}</em>을 갖췄습니다` : 'AI 사용을 <em>한곳</em>에서 관리합니다', sub: '연결 모델 · 학습 자료 · 개인정보 가림 · 인젝션 감지 기록을 확인하고, 남은 항목은 거버넌스 탭에서 채우세요.' };
  } });
  R('rfpmap', { art: 'check', brief: main => {
    const N = (typeof RFP_JNU !== 'undefined' && RFP_JNU.length) || 0; if (!N) return null; const c = k => RFP_JNU.filter(r => r[5] === k).length;
    return { eye: '구축 요건 대응', title: `요구사항 <em>${N}건</em> 가운데 ${c('have') + c('v30') + c('v29')}건을 제품으로 대응합니다`, sub: `구축 시 개발 ${c('dev')}건 · 외부 연계 ${c('ext')}건 · 수행 방안 ${c('pm')}건은 제안서 대응표에 함께 적습니다.` };
  } });
  R('cpl', { art: 'check', brief: main => {
    if (empty(main) || (UI.cpl && UI.cpl !== 'home')) return null; const n = main.querySelectorAll('.cpl-dd').length; const now = main.querySelectorAll('.cpl-dd.r').length;
    return { eye: '인가 · 규정 준수', title: now ? `지금 처리할 규정 항목 <em>${now}건</em>이 있습니다` : `기한 있는 할 일 <em>${n}건</em>을 가까운 순서로 정리했습니다`, sub: '훈련 규정 · 훈련시간 · 평가 기준은 고용노동부 원격훈련 기준을 따릅니다. 실제 심사 전 근거 문서를 확인하세요.' };
  } });
  /* ── 다크 모드 보정: 화면 CSS에 흰 바탕(#fff) · 잉크 바탕(--ink + 흰 글자)이 하드코딩된 요소를 표시해 l43-e1.css가 토큰으로 바꿉니다.
     종이 미리보기(수료증)는 라이트 그대로 둡니다(.e1-paper). 등록한 탭에서만, 렌더 · 테마 변경 때 한 번씩. */
  const PAPER = '.certpv, .ck-card, .ck, .a2cert';
  function darkFix() {
    const main = document.getElementById('main'); if (!main || !main.classList.contains('l43')) return;
    const ink = (getComputedStyle(document.documentElement).getPropertyValue('--ink') || '').trim();
    let inkRgb = ''; if (ink) { const d = document.createElement('i'); d.style.color = ink; document.body.appendChild(d); inkRgb = getComputedStyle(d).color; d.remove(); }
    main.querySelectorAll(PAPER).forEach(p => p.classList.add('e1-paper'));
    main.querySelectorAll('*').forEach(e => {
      if (e.closest('.e1-paper') || e.closest('svg')) return; const cs = getComputedStyle(e); const bg = cs.backgroundColor;
      if (bg === 'rgb(255, 255, 255)' && !cs.backgroundImage.includes('url(')) e.classList.add('e1-wb');
      else if (inkRgb && bg === inkRgb && /^rgb\(255, 255, 255\)$/.test(cs.color)) e.classList.add('e1-ink');
    });
  }
  if (typeof AFTER !== 'undefined') AFTER.push(() => setTimeout(darkFix, 0));
  try { new MutationObserver(() => setTimeout(darkFix, 0)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
  window.L43E1 = { darkFix };
})();
