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
    return { eye: '출결', title: `출결을 받는 ${E(L('cls'))} <em>${C.length}개</em>, ${E(L('learner'))} ${N}명입니다`, sub: '태블릿용 출석 체크 화면을 열어 두면 도착한 순서대로 바로 출석이 기록됩니다. 결석이 2회 이상이면 보호자 · 본인에게 안내하세요.', acts: [{ label: '출석 체크 화면 열기', go: '[data-act="cls-pad"]' }, { label: '태블릿용 주소 복사', kind: 'sec', go: '[data-act="w2-kiolink"]' }] };
  } });
  R('cert', { art: 'check', brief: main => {
    if (empty(main) || UI.certSel) return null; const C = A('certs'); if (!C.length) return null; const m = C.filter(c => String(c.at || '').startsWith(ym())).length; const man = C.filter(c => c.manual).length;
    return { eye: '수료증', title: `수료증 <em>${C.length}건</em>을 발급했습니다`, sub: '이수 기준을 채운 사람에게는 자동으로 발급됩니다. 디자인을 바꾸면 이후 발급분부터 적용됩니다.', stats: [[C.length + '건', '누적 발급'], [m + '건', '이번 달'], [man + '건', '수동 발급']], acts: [{ label: '수동 발급', go: '[data-act="cert-manual"]' }, { label: '이수 현황 엑셀', kind: 'sec', go: '[data-act="ops-xls"]' }] };
  } });
  R('badge', { art: 'check', brief: main => {
    if (empty(main) || UI.bdSel) return null; const B = A('badges'); if (!B.length) return null; const iss = B.reduce((a, b) => a + (b.issued || []).length, 0);
    return { eye: '배지', title: `배지 <em>${B.length}종</em>을 운영하고, ${iss}건을 발급했습니다`, sub: '평가를 통과하면 자동으로 발급되는 배지와 수동 발급 배지를 함께 관리합니다.', acts: [{ label: '배지 발급하기', go: '[data-act="bd26-go"][data-v="manual"]' }, { label: '배지 만들기', kind: 'sec', go: '[data-act="bd26-go"][data-v="set"]' }] };
  } });
  R('book', { art: 'list', brief: main => {
    if (empty(main) || UI.bkEdit) return null; const B = A('books'); if (!B.length) return null; const sold = B.reduce((a, b) => a + (+b.sold || 0), 0); const wait = B.filter(b => b.kind === '실물').reduce((a, b) => a + Math.max(0, (+b.sold || 0) - (+b.delivered || 0)), 0);
    return { eye: '교재', title: wait ? `전달을 기다리는 실물 교재 <em>${wait}건</em>이 있습니다` : `교재 <em>${B.length}권</em>을 판매하고 있습니다`, sub: wait ? '전달을 마치면 [전달 완료]로 바꿔 주세요. 전달 전에는 환불이 가능합니다.' : '전자책은 결제 후 바로 내려받고, 실물은 전달 완료로 표시합니다.', stats: [[B.length + '권', '교재'], [sold + '권', '누적 판매'], [wait + '건', '전달 대기', wait ? 'warn' : '']], acts: [{ label: '+ 교재 만들기', go: '[data-act="book-new"]' }, { label: 'AI 썸네일 추천', kind: 'sec', go: '[data-act="ai-bookthumb"]' }] };
  } });
  R('clib', { art: 'list', enhance: main => {
    /* 썸네일이 비어 있는 카드(영상 · 문서 · 퀴즈)는 제목 낱말로 고른 CC0 스톡 사진을 깔고, 글자 띠는 그대로 둡니다 */
    const SC = ['IT', '경영', '독서', '외국어', '돌봄', '요리']; /* v43 R6: 이름으로 장면을 못 고르면(교실) 카드마다 다른 장면 */
    main.querySelectorAll('.clb-th:not([data-e1])').forEach((th, ix) => { th.dataset.e1 = 1; if (th.querySelector('img') || th.classList.contains('k-b') || /url\(/.test(th.style.backgroundImage || '')) return;
      const box = th.parentElement; const nm = ((box && box.querySelector('b, h3, h4, strong')) || {}).textContent || ''; const w0 = L43.wordsOf(nm); const u = L43.photo(w0.length === 1 && w0[0] === '교실' ? [SC[ix % SC.length]] : w0, nm + ix); if (!u) return;
      th.style.backgroundImage = `linear-gradient(rgba(4,20,10,.28),rgba(4,20,10,.28)),url("${u}")`; th.style.backgroundSize = 'cover'; th.style.backgroundPosition = 'center'; th.classList.add('e1-ph'); });
  }, brief: main => {
    if (empty(main) || UI.clbId) return null; const n = num(main, /전체\s*([\d,]+)/); if (!n) return null; const v = num(main, /영상\s*([\d,]+)/);
    return { eye: '콘텐츠 라이브러리', title: `콘텐츠 <em>${n}개</em>를 한곳에서 관리합니다`, sub: `영상 ${v}개를 포함해 문서 · 퀴즈 · 디지털북을 만들고, [${E(L('cls'))}에 넣기]로 원하는 차시에 붙입니다.` };
  } });
  R('journey', { art: 'list', brief: main => {
    if (empty(main)) return null; const J = A('journey'); if (!J.length) return null; const cls = new Set(J.flatMap(j => j.cls || [])).size;
    return { eye: '러닝 저니', title: `<em>${J.length}단계</em> 러닝 저니에 ${E(L('cls'))} ${cls}개가 이어져 있습니다`, sub: '단계를 마치면 배지가 발급되고 다음 단계가 열립니다. 열림 조건과 순서는 각 단계에서 바꿉니다.', acts: [{ label: '+ 단계 추가', go: '[data-act="jn-add"]' }] };
  } });
  R('diag', { art: 'check', brief: main => {
    if (empty(main) || UI.dgEdit || UI.dgRes) return null; const m = (main.innerText || '').match(/(\d+)명 응시\((\d+)%\)/);
    /* v43 R6: 응시 0명이어도 요약 머리(H) + 「미응시 학생 안내」 · 「새 진단 만들기」 버튼 */ const acts = [{ label: '미응시 학생 안내', go: '[data-act="dg-run"]' }, { label: '새 진단 만들기', kind: 'sec', go: '[data-act="dg-new"]' }];
    if (!m) { const D = A('diags').filter(d => d.status !== '초안'); if (!D.length) return null; const dr = A('diags').length - D.length; /* v43 S3A 027: 탭 숫자(전체)와 맞게 초안 수를 함께 */ return { eye: 'AI 진단', kind: 'hero', title: `진단 <em>${D.length}개</em>를 열었고${dr ? `(초안 ${dr}개 별도)` : ''}, 아직 응시한 학생이 없습니다`, sub: '진단 링크를 보내면 학생이 5분 안에 응시하고, 결과 유형별로 다음 단계 교과목이 추천됩니다.', acts }; }
    return { eye: 'AI 진단', title: `진단 응시율 <em>${m[2]}%</em>, ${m[1]}명이 응시했습니다`, sub: '응시하지 않은 학생에게 안내를 보내고, 결과 보기에서 유형별로 다음 단계 교과목을 배정하세요.', acts };
  } });
  R('calendar', { art: 'doc', brief: main => {
    if (empty(main)) return null; const n = main.querySelectorAll('.cx-ev').length; if (!n) return null; const td = (() => { try { return today(); } catch (e) { return ''; } })();
    const tn = main.querySelectorAll(`[data-cxday="${td}"] .cx-ev`).length;
    return { eye: '일정', title: tn ? `오늘 일정 <em>${tn}건</em>이 있습니다` : `이번 달 일정 <em>${n}건</em>이 잡혀 있습니다`, sub: '날짜 칸을 누르면 일정을 추가하고, 일정을 끌어 옮기면 학습자 달력에도 바로 반영됩니다.', acts: [{ label: 'AI 코칭 일정', go: '[data-act="tab"][data-v="coach"]' }, { label: '연동 설정', kind: 'sec', go: '[data-act="tab"][data-key="calT"][data-v="conn"]' }] }; /* v43 S3A 030: 「+ 일정 추가」는 달력 위 버튼 하나만 */
  } });
  R('tutorial', { art: 'list', brief: main => {
    if (empty(main) || UI.tuId) return null; const T = A('tuts'); if (!T.length) return null; const pub = T.filter(x => x.pub !== false).length;
    return { eye: '따라 하기 영상', title: `따라 하기 영상 <em>${T.length}개</em> 가운데 ${pub}개를 게시했습니다`, sub: '수준 · 유형별로 정리해 두면 학습자가 필요한 실습을 바로 찾습니다.', acts: [{ label: '+ 튜토리얼 만들기', go: '[data-act="tu-edit"]' }] };
  } });
  R('grade', { art: 'doc', brief: main => {
    if (empty(main) || !main.querySelector('.tw table')) return null; const kv = l => { const k = [...main.querySelectorAll('.kpi')].find(x => ((x.querySelector('.lab') || {}).textContent || '').trim() === l); return k ? ((k.querySelector('.val') || {}).textContent || '').trim() : ''; };
    const n = kv('정규 수강생'), a = kv('평균'), r = kv('비율 합계'), st = kv('상태'); const G = [...main.querySelectorAll('.tw table')].pop(); const H = G && G.tHead ? [...G.tHead.rows[0].cells].map(c => c.textContent.trim()) : []; const gi = H.indexOf('등급'); const gs = gi < 0 ? [] : [...G.tBodies[0].rows].map(x => (x.cells[gi] || {}).textContent || ''); const ab = gs.filter(x => /^[AB]/.test(x.trim())).length;
    return { eye: '성적', title: /미확정/.test(st) ? `평균 <em>${E(a || '—')}점</em>, 성적 확정 전 검토가 남았습니다` : '성적을 <em>확정</em>했습니다', sub: (UI.lmshTodo ? `지금 할 일 — ${UI.lmshTodo}. ` : '') + '확정 전에는 학생에게 공개되지 않습니다.', stats: [[(gs.length ? Math.round(ab / gs.length * 100) : 0) + '%', 'A · B 비율'], [(parseInt(n, 10) || 0) + '명', '정규 수강생'], [(a || '—') + '점', '평균 총점'], [st || '—', '확정 상태', /미확정/.test(st) ? 'warn' : '']], acts: /미확정/.test(st) ? [{ label: '점수 입력', go: '[data-act="tab"][data-v="items"]' }, { label: '확정 · 학사 전송', kind: 'sec', go: '[data-act="tab"][data-v="confirm"]' }] : [{ label: '학사 시스템 전송', go: '[data-act="tab"][data-v="confirm"]' }] };
  }, enhance: main => { if (!window.DBX || (S.org && S.org.empty) || !main.querySelector('.tw table')) return; const G = [...main.querySelectorAll('.tw table')].pop(); const H = [...G.tHead.rows[0].cells].map(c => c.textContent.trim()); const gi = H.indexOf('등급'); const K = ['A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'F']; const gs = gi < 0 ? [] : [...G.tBodies[0].rows].map(x => ((x.cells[gi] || {}).textContent || '').trim());
    DBX.side(main, { todo: [['이의 신청 기간 안내', '확정 전 7일 동안 학생 이의 신청을 받습니다', 'warn', '공지'], ['미입력 점수 확인', '평가 항목 · 점수 입력 탭에서 빈 칸을 채웁니다', '', '확인'], ['학사 시스템 전송', '확정 후 학사로 보내면 성적표에 반영됩니다', '', '확정 후']], chart: { t: '등급 분포', v: gs.length + '명', s: '상대평가 기준 A 30% · A+B 70% 이내', d: K.map(k => gs.filter(x => x === k).length), lb: K }, ai: 'A · B 비율이 상대평가 상한에 가까우면 경계 점수 학생부터 다시 확인하세요. 확정 후에는 학사 승인이 있어야 바꿀 수 있습니다.' }); } });

  /* v43 R6: 법정의무교육 — 운영 과정이 없을 때도 요약 카드(N형)와 머리 버튼을 둡니다(l43.js 등록은 과정이 있을 때만 브리핑) */
  { const R0 = L43.REG.compliance; if (R0 && R0.brief) { const b0 = R0.brief; R0.brief = main => { let o = null; try { o = b0(main); } catch (e) { } const nudge = { label: '미이수자 독려 실행', go: '[data-act="legal-nudge"]' }, rep = { label: '이수 증빙 보고서', kind: 'sec', go: '[data-act="comp-report"]' };
    if (o) { o.acts = o.acts || [nudge, rep]; return o; } if (empty(main)) return null;
    const rows = [...main.querySelectorAll('#legalList tbody tr')]; const req = rows.filter(r => /필수/.test(r.textContent)).length; const first = main.querySelector('#legalList [data-act="chat-q"]');
    return { eye: '법정의무교육', kind: 'kpi', title: `필수 법정교육 <em>${req}종</em>, 아직 운영 중인 과정이 없습니다`, sub: '과정을 만들면 법정 시간 · 이수 기준이 채워진 채로 열리고, 부서별 이수율이 이곳에 모입니다. 마감 30일 전부터 미이수자 독려를 권합니다.', stats: [[rows.length + '종', '법정 교육 목록'], [req + '종', '필수 교육', 'warn'], ['이수 시작 전', '부서별 이수']], acts: first ? [{ label: '첫 과정 만들기', go: '#legalList [data-act="chat-q"]' }, rep] : [nudge, rep] }; }; } }

  /* ── 학생 공간 ── */
  R('groups', { art: 'people', brief: main => {
    if (empty(main) || UI.grp) return null; const G = A('groups'); if (!G.length) return null; const M = A('members'); const none = M.filter(m => !m.group || !G.some(g => g.id === m.group)).length; const nolead = G.filter(g => !g.lead).length;
    return { eye: L('group'), acts: [{ label: `+ ${L('group')} 만들기`, go: '[data-act="grp-new"]' }, { label: 'AI SAM에게 배정 맡기기', kind: 'sec', go: '[data-act="chat-q"]' }], title: `${E(L('group'))} <em>${G.length}개</em>에 ${E(L('learner'))} ${M.length - none}명이 속해 있습니다`, sub: none ? `아직 ${E(L('group'))}에 넣지 않은 ${none}명을 먼저 배정하세요.` : (nolead ? `담당자가 없는 ${E(L('group'))} ${nolead}개에 담당자를 지정하세요.` : '모든 인원이 배정되어 있습니다.'), stats: [[G.length + '개', L('group')], [none + '명', '미배정', none ? 'warn' : ''], [nolead + '개', '담당 없음', nolead ? 'warn' : '']] };
  } });
  R('parents', { art: 'people', brief: main => {
    if (empty(main)) return null; const P = A('parents'); if (!P.length) return null; const w = P.filter(p => /대기|요청/.test(p.status || '')).length; /* v43 R6: 상태 값은 「연결 요청」 */ const ok = P.filter(p => /완료/.test(p.status || '')).length;
    return { eye: '보호자', title: w ? `연결을 기다리는 보호자 <em>${w}명</em>이 있습니다` : `보호자 <em>${ok}명</em>이 연결되어 있습니다`, sub: w ? '대기 중인 요청을 확인해 자녀와 연결하세요. 연결된 보호자는 출결 · 수납 알림을 받습니다.' : '출결 · 수납 알림이 연결된 보호자에게 갑니다.', stats: [[P.length + '명', '전체'], [ok + '명', '연결 완료'], [w + '명', '대기', w ? 'warn' : '']], acts: [{ label: w ? `대기 ${w}명 연결 확인` : '미연결 보호자 초대', go: '[data-act="par-req"]' }] };
  } });
  R('admins', { art: 'people', brief: main => {
    if (empty(main)) return null; const Ad = A('admins'); if (!Ad.length) return null; const by = r => Ad.filter(a => a.role === r).length;
    return { eye: '운영자 · 기록', title: `운영자 <em>${Ad.length}명</em>이 스튜디오를 함께 운영합니다`, sub: '권한은 메뉴별로 다릅니다. 담당 범위를 정해 두면 그 범위의 학습자만 보입니다. 모든 변경은 감사 로그에 남습니다.', kind: 'kpi', stats: [[by('owner') + '명', '정운영자'], [by('sub') + '명', '부운영자'], [by('teacher') + '명', L('teacher')], [A('audit').length + '건', '감사 기록']], acts: [{ label: '+ 운영자 추가', go: '[data-act="adm-new"]' }] }; /* v43 F1 017: 「확인」 칩만 있던 처리 묶음 → 숫자 4칸(부운영자 키 staff → sub 바로잡음), 버튼은 주 버튼 1개 */
  } });
  R('enroll', { art: 'people', brief: main => {
    if (empty(main)) return null; const M = A('members'); const w = M.filter(m => m.grade === '승인 대기').length; const inv = A('invites').filter(i => i.active).length;
    return { eye: '등록 · 초대', title: w ? `가입 승인 대기 <em>${w}명</em>을 먼저 처리하세요` : !M.length ? `아직 등록한 ${E(L('learner'))}이 없습니다. 첫 ${E(L('learner'))}을 등록하세요` : inv ? `활성 초대 링크 <em>${inv}개</em>로 ${E(L('learner'))}을 받고 있습니다` : `${E(L('learner'))} <em>${M.length}명</em>이 등록되어 있습니다` /* v43 P3-F12: 빈 상태 거짓 요약 금지 */, sub: '엑셀(CSV)로 한 번에 등록하거나, 초대 링크 · 알림톡으로 직접 가입하게 할 수 있습니다.', stats: [[M.length + '명', '등록'], [w + '명', '승인 대기', w ? 'warn' : ''], [inv + '개', '초대 링크']], acts: w ? [{ label: `승인 대기 ${w}명 모두 승인`, go: '[data-act="mem-approve"]' }, { label: '초대 링크 보내기', kind: 'sec', go: '[data-act="mem-invite"]' }] : [{ label: '초대 링크 보내기', go: '[data-act="mem-invite"]' }, { label: '엑셀 일괄 등록', kind: 'sec', go: '[data-act="mem-bulk"]' }] };
  } });
  R('crmatt', { art: 'check', brief: main => {
    if (empty(main)) return null; const m = (main.innerText || '').match(/수업\s*(\d+)개\s*·\s*미입력\s*(\d+)명/); if (!m) return null;
    return { eye: '출석부', title: !+m[1] ? '오늘 예정된 수업이 없습니다' : +m[2] ? `오늘 출결 미입력 <em>${m[2]}명</em>이 남았습니다` : '오늘 출결을 <em>모두 입력</em>했습니다' /* v43 P3-F12 */, sub: `오늘 수업 ${m[1]}개입니다. 수업이 끝나면 [미입력 전체 출석]으로 한 번에 처리하고, 결석 · 지각만 바꾸세요.` };
  } });

  /* ── 소통 공간 ── */
  R('message', { art: 'doc', brief: main => {
    if (empty(main)) return null; const Ms = A('msgs'); if (!Ms.length) return null; const m = Ms.filter(x => String(x.at || '').startsWith(ym())); const n = m.reduce((a, x) => a + (+x.n || (x.toIds || []).length || 1), 0);
    return { eye: '메시지', title: `이번 달 메시지 <em>${m.length}건</em>, ${n}명에게 보냈습니다`, sub: '받는 사람을 고르고 내용을 쓰면 앱 푸시 · 알림톡 · 이메일 가운데 받을 수 있는 경로로 보냅니다.', acts: [{ label: 'AI로 새 메시지 쓰기', go: '[data-act="ai-msg"]' }, { label: '자동 발송 설정', kind: 'sec', go: '[data-act="tab"][data-v="auto"]' }] };
  } });
  R('community', { art: 'list', brief: main => {
    if (empty(main) || UI.cmPost) return null; const P = A('posts').filter(p => !p.hidden); if (!P.length) return null; const q = P.filter(p => p.kind === '질문' && !+p.replies).length;
    return { eye: '게시판', title: q ? `답변을 기다리는 질문 <em>${q}건</em>이 있습니다` : `게시글 <em>${P.length}건</em>, 모든 질문에 답했습니다`, sub: q ? '오래된 질문부터 답하세요. [답변 초안]을 누르면 AI SAM이 강의 자료를 근거로 초안을 씁니다.' : '새 질문이 올라오면 이 화면 맨 위에 모입니다.', acts: [q ? { label: `답변 초안 ${q}건 검토`, go: '[data-act="ai-reply-all"]' } : null, { label: '게시판 설정', kind: 'sec', go: '#main [data-act="cm-board-edit"]' }].filter(Boolean) }; /* v43 S3A 019: 보조 버튼 — 카드 안 「게시판 설정」은 머리로 옮김 */
  } });
  R('consult', { art: 'list', brief: main => {
    if (empty(main) || UI.csId) return null; const C = A('consults'); if (!C.length) return null; const op = C.filter(c => /진행|대기/.test(c.status || '')).length;
    return { eye: '상담', title: op ? `진행 중인 상담 <em>${op}건</em>이 있습니다` : `상담 <em>${C.length}건</em>을 모두 마쳤습니다`, sub: '대면 상담은 녹음 · 메모를 남기면 AI가 요약하고, 채널톡 상담은 연동하면 이곳에 모입니다.', acts: [{ label: '대면 상담 시작', go: '[data-act="cs-start"]' }, { label: '상담 내역 불러오기', kind: 'sec', go: '[data-act="cs-sync"]' }] };
  } });
  R('board', { art: 'doc', brief: main => {
    if (empty(main) || UI.nEdit) return null; const n = num(main, /공지\s*\/?\s*([\d,]+)건/) || main.querySelectorAll('.tw tbody tr').length; if (!n) return null; const pin = main.querySelectorAll('.cmn-pb.on').length;
    return { eye: '공지', title: `공지 <em>${n}건</em>을 게시하고 있습니다`, sub: `${pin ? `상단 고정 ${pin}건은 학습자 사이트 맨 위에 보입니다. ` : ''}중요한 공지는 [알림 보내기]로 앱 푸시까지 보내세요.`, acts: [{ label: '알림 보내기', go: '[data-act="al-new"]' }, { label: '메시지 보내기', kind: 'sec', tab: 'message' }] }; /* v43 S3A 028: 「+ 공지 쓰기」는 목록 위 버튼 하나만 */
  } });

  /* ── 운영 공간 ── */
  R('academic', { art: 'doc', brief: main => {
    if (empty(main)) return null; const M = A('members'); if (!M.length) return null; const low = M.filter(m => A('classes').some(c => (c.learners || []).includes(m.id)) && memP(m.id) < 30).length;
    return { eye: '학사 · 비교과', title: low ? `학습 위험군 <em>${low}명</em>을 지도교수에게 알리세요` : `학생 <em>${M.length}명</em>의 학과별 학습 현황입니다`, sub: '진도 30% 미만 학생은 위험군으로 모입니다. 비교과 이수 · 배지 취득은 포인트로 쌓여 장학 · 인증제와 이어집니다.', acts: [{ label: '지도교수에게 알리기', go: '[data-act="auto-run-id"][data-v="univ-risk"]' }, { label: '성적 내보내기', kind: 'sec', go: '[data-act="acad-xls"]' }] };
  } });
  R('lifelong', { art: 'check', brief: main => {
    if (empty(main)) return null; const all = main.querySelectorAll('.ll-ck, .r1-ckl li').length; const ok = main.querySelectorAll('.ll-ck.ok, .r1-ckl li.ok').length; if (!all) return null; /* v43 R6: 체크리스트 마크업(r1-ckl)을 읽음 — 0% · 0개 수정 */
    const W = [...main.querySelectorAll('.r1-ckl li.warn .r1-ckt')].slice(0, 3).map(x => [x.textContent.trim().slice(0, 34), '확인 필요 · 설정에서 바로 고칩니다', 'warn']);
    const rf = A('pays').filter(p => p.refund && p.refund.state !== '승인').length; /* 보조 열 「반환 신청」과 같은 기준 */ /* v43 S3A 012: 머리는 링(갖춘 비율) + KPI — 할 일 행은 본문 체크리스트와 겹치므로 머리에서 뺌 */ void W;
    return { eye: '평생교육 운영', kind: 'kpi', ring: [Math.round(ok / all * 100), `갖춘 요건 ${ok}/${all}`, ok < all ? 'warn' : ''], stats: [[(all - ok) + '개', '확인 필요', all - ok ? 'warn' : ''], [rf + '건', '반환 신청', rf ? 'warn' : ''], [S.classes.length + '개', '운영 강좌']], title: ok < all ? `운영 요건 <em>${all - ok}개</em>를 아직 갖추지 않았습니다` : '운영 요건을 <em>모두</em> 갖췄습니다', sub: '평생교육법 기준 요약입니다. 실제 신고 전에는 관할 교육청에 확인하세요. 학습비 반환은 신청일로부터 5일 안에 처리합니다.', acts: [{ label: '점검 완료로 표시', go: '[data-act="ll-check"]' }] };
  } });
  R('sales', { art: 'doc', enhance: main => { /* v43 Q1 보조 열: 결제 연결(PG) 카드 · 수수료 안내를 오른쪽 340px로, 월 매출 · KPI · 표를 주 열로 */
    const bv = main.querySelector(':scope > .bview'); if (!bv || bv.querySelector(':scope > .q1-2col')) return; const pg = bv.querySelector(':scope > .grid:has(.pgc)'); const fee = bv.querySelector(':scope > .sl2-fee'); if (!pg) return;
    const rest = [...bv.children].filter(x => !x.matches('.l43-brief, .ph') && x !== pg && x !== fee); if (!rest.length) return; const col = document.createElement('div'); col.className = 'q1-main'; rest[0].before(col); rest.forEach(x => col.appendChild(x));
    L43.side(main, col, `<section class="q1-ac q1-pg"><h3>결제 연결</h3></section>${L43.acard({ ai: true, t: 'AI SAM 제안', p: '환불 요청은 3일 안에 처리하면 분쟁이 줄어듭니다. 환불 내역 탭에서 승인 · 거절을 한 번에 처리하세요.' })}`);
    const box = main.querySelector('.q1-pg'); if (box) { pg.classList.add('q1-pgg'); box.appendChild(pg); if (fee) box.appendChild(fee); } }, brief: main => {
    if (empty(main)) return null; const P = A('pays'); if (!P.length) return null; const m = P.filter(p => String(p.at || '').startsWith(ym())); const ok = m.filter(p => /완료/.test(p.status || '')).reduce((a, p) => a + (+p.amount || 0), 0); const rf = m.filter(p => /환불/.test(p.status || '')).length;
    return { eye: '매출', title: `이번 달 결제 <em>${won0(ok)}</em>`, sub: rf ? `환불 ${rf}건이 있습니다. 결제 목록에서 사유를 확인하세요.` : '이번 달 환불은 없습니다. 결제 수수료는 PG사 수수료만 부과됩니다.',
      /* v43 Q1: 숫자형(N) — 결제 완료율 링 + 건수 · 객단가 · 환불 */
      stats: (() => { const dn = m.filter(p => /완료/.test(p.status || '')).length; return [[(m.length ? Math.round(dn / m.length * 100) : 0) + '%', '결제 완료율'], [m.length + '건', '이번 달 결제'], [won0(dn ? Math.round(ok / dn) : 0), '평균 결제액'], [rf + '건', '환불', rf ? 'warn' : '']]; })() };
  } });
  R('billing', { art: 'doc', brief: main => {
    if (empty(main)) return null; const B = A('bills'); if (!B.length) return null; const un = B.filter(b => b.status === '미납'); const late = un.filter(b => b.due && b.due < today()).length;
    return { eye: '청구서', title: un.length ? `미납 청구서 <em>${un.length}건</em>, 납기 지난 ${late}건을 먼저 안내하세요` : '이번 청구서는 <em>모두 수납</em>되었습니다', sub: '[미납 안내]를 보내면 보호자에게 결제 링크가 함께 갑니다.', acts: un.length ? [{ label: `미납 ${un.length}건 안내 보내기`, go: '[data-act="crm-un-send"]' }, { label: '수강료 발생', kind: 'sec', go: '[data-act="crm-gen-now"]' }] : [{ label: '수강료 발생', go: '[data-act="crm-gen-now"]' }] };
  } });
  R('org', { art: 'people', brief: main => {
    if (empty(main) || UI.orgId) return null; const O = A('orgs'); if (!O.length) return null; const n = O.reduce((a, o) => a + (+o.n || 0), 0);
    return { eye: '기관 관리', title: `협력 기관 <em>${O.length}곳</em>, 회원 ${n}명을 관리합니다`, sub: '기관 담당자는 운영자 · 권한에서 「기관 담당자」로 지정하면 자기 기관 현황만 봅니다.', acts: [{ label: '+ 기관 지정', go: '[data-act="mb-org"]' }] };
  } });
  R('auto', { art: 'gear', brief: main => {
    if (empty(main)) return null; const Au = A('autos'); if (!Au.length) return null; const on = Au.filter(a => a.on).length; const ap = Au.filter(a => a.on && a.approve).length;
    return { eye: '자동화', title: `자동화 <em>${on}개</em>가 켜져 있습니다`, acts: [{ label: '+ 연결 자동화 만들기', go: '[data-act="cn-build"]' }, { label: 'AI SAM에게 맡기기', kind: 'sec', go: '[data-act="chat-q"]' }], sub: '한 줄로 적으면 언제 · 조건 · 할 일 세 칸을 채워 드립니다. 메시지 대량 발송처럼 민감한 일은 실행 전에 승인을 받습니다.', kind: 'kpi',
      /* v43 F1 024: 「전체 7 · 켜짐 7」 같은 숫자 반복 → 켜짐 · 14일 처리 · 아낀 시간, 승인 후 실행은 처리 행(foot)으로 */
      stats: (() => { const R = A('runs'); const d0 = (() => { try { return addDays(today(), -13); } catch (e) { return ''; } })(); const n14 = R.filter(r => String(r.at || '').slice(0, 10) >= d0).reduce((a, r) => a + (+r.n || 0), 0); const all = R.reduce((a, r) => a + (+r.n || 0), 0); return [[on + '개', '켜진 자동화'], [n14 + '건', '최근 14일 처리'], [(Math.round(all * 3 / 60 * 10) / 10) + '시간', '아낀 시간']]; })(),
      foot: ap ? `<div class="f1-apr" role="group" aria-label="승인 대기"><span class="f1-apn">${ap}</span><span><b>승인 후 실행 자동화 ${ap}개</b><small>실행 전에 처리 계획을 확인하고 승인합니다</small></span><button type="button" class="btn sm" data-act="f1-au-ap">승인 목록 보기</button></div>` : '' };
  } });
  R('docs', { art: 'doc', brief: main => {
    if (empty(main) || UI.docId) return null; const D = A('docs');
    return { eye: '문서 만들기', title: D.length ? `우리 기관 문서 <em>${D.length}건</em>을 만들었습니다` : '서식을 고르면 <em>AI</em>가 기관 정보로 문서를 채웁니다', sub: '계획 → 준비 → 운영 → 평가 → 결과 보고 순서로 서식을 정리했습니다. 빈 칸만 확인하고 내려받으세요.', acts: [{ label: 'AI로 문서 만들기', go: '[data-act="doc-ai-new"]' }] };
  } });
  R('conn', { art: 'gear', brief: main => {
    if (empty(main)) return null; let on = 0, tot = 0, chk = 0, P = 0; try { const St = cnIds().map(cnStatus); tot = St.length; on = St.filter(x => x.st === CN_ST.on).length; chk = St.filter(x => x.st === CN_ST.chk).length; P = (S.autos || []).filter(a => (a.actions || []).some(x => CN_ACT[x])).length; } catch (e) { }
    return { eye: '외부 연결', title: on ? `외부 서비스 <em>${on}/${tot}</em>개가 연결되어 있습니다` : `외부 서비스 <em>${tot}개</em>를 연결할 수 있습니다`, sub: '연결 정보(키 · 토큰)는 안전하게 보관하고 화면에는 가려서 표시합니다. 연결하면 AI SAM과 업무 자동화가 바로 함께 일합니다.', stats: on ? [[(tot ? Math.round(on / tot * 100) : 0) + '%', '연결률'], [on + '/' + tot, '연결됨'], [chk + '개', '점검 필요', chk ? 'warn' : ''], [P + '개', '연결 자동화']] : [[tot + '개', '연결할 수 있는 서비스'], [P + '개', '연결을 기다리는 자동화', P ? 'warn' : ''], ['약 3분', '서비스당 연결 시간']] };
  }, enhance: main => { if (!window.DBX || (S.org && S.org.empty)) return; let off = []; try { off = cnIds().filter(id => cnStatus(id).st !== CN_ST.on).map(id => (CN[id] || {}).name || id); } catch (e) { }
    DBX.side(main, { tt: '연결하면 바로 쓰는 것', todo: off.slice(0, 3).map(n => [E(n) + ' 연결', /Slack/.test(n) ? '자동화 결과를 채널로 받습니다' : /Google/.test(n) ? '캘린더 · 드라이브에 일정과 문서를 남깁니다' : /Claude|MCP/.test(n) ? 'AI SAM 대화 · 문서 만들기에 씁니다' : '연결 안내를 따라 3분이면 됩니다', '', '연결']), ai: '처음이면 Slack부터 연결하세요. 출결 · 미납 알림을 운영 채널로 받으면 놓치는 일이 줄어듭니다.' }); } });
  R('sis', { art: 'gear', brief: main => {
    if (empty(main)) return null; const t = (main.innerText || '').replace(/\n/g, ' / '); const last = /마지막 동기화\s*\/?\s*없음/.test(t); const g = re => { const m = t.match(re); return m ? +m[1] : 0; };
    const room = g(/연동 강의실\s*\/?\s*(\d+)/), enr = g(/수강 등록\s*\/?\s*(\d+)/);
    return { eye: '학사 연동', title: last ? `강의실 <em>${room}개</em> · 수강 등록 ${enr}건을 받을 준비가 됐습니다` : '학사 시스템과 <em>동기화</em>되어 있습니다', acts: [{ label: last ? '첫 동기화 실행' : '지금 동기화', go: '[data-act="sis-sync"]' }], sub: '학기 · 교과목 · 수강 등록을 학사 시스템에서 받아 강의실을 만듭니다. 이름 · 연락처는 받지 않고 학번 · 학과만 받습니다.', stats: [[room + '개', '연동 강의실'], [enr + '건', '수강 등록'], [last ? '첫 동기화 전' : '정상', '마지막 동기화', last ? 'warn' : '']] };
  }, enhance: main => { if (!window.DBX || (S.org && S.org.empty)) return; DBX.side(main, { todo: [['첫 동기화 실행', '[지금 동기화]를 누르면 학기 · 분반 · 수강을 받습니다', 'warn', '실행'], ['매일 02:00 자동 동기화', '수강 정정 기간에는 하루 두 번으로 바꿀 수 있습니다', '', '설정'], ['통합 인증(SSO) 확인', '학번으로 로그인하면 강의실이 바로 열립니다', '', '확인']], ai: '연동 방식(API · DB 뷰 · CSV)은 학교 정보화 부서와 정합니다. CSV로 먼저 시작해도 같은 화면으로 운영됩니다.' }); } });
  R('aigov', { art: 'gear', brief: main => {
    if (empty(main)) return null; const t = (main.innerText || '').replace(/\n/g, ' / '); const m = t.match(/AI기본법 항목\s*\/?\s*(\d+)\/(\d+)/); const g = re => { const x = t.match(re); return x ? +x[1] : 0; };
    const on = g(/켜진 모델\s*\/?\s*(\d+)/), rag = g(/학습 자료\s*\/?\s*(\d+)/);
    return { eye: 'AI 관리', title: m ? `AI기본법 항목 <em>${m[1]}/${m[2]}</em>을 갖췄습니다` : 'AI 사용을 <em>한곳</em>에서 관리합니다', sub: '연결 모델 · 학습 자료 · 개인정보 가림 · 인젝션 감지 기록을 확인하고, 남은 항목은 거버넌스 탭에서 채우세요.', stats: [[m ? Math.round(m[1] / m[2] * 100) + '%' : '0%', 'AI기본법 항목'], [on + '개', '켜진 모델'], [rag + '종', '학습 자료'], ['1,284건', '이번 달 AI 질문']], acts: m && +m[1] < +m[2] ? [{ label: `남은 항목 ${m[2] - m[1]}개 채우기`, go: '[data-act="tab"][data-key="aiT"][data-v="law"]' }, { label: 'LLM 연결 보기', kind: 'sec', go: '[data-act="tab"][data-key="aiT"][data-v="model"]' }] : [{ label: 'LLM 연결 보기', go: '[data-act="tab"][data-key="aiT"][data-v="model"]' }] }; /* v43 S3A 038: 머리 주 · 보조 버튼 */
  }, enhance: main => { if (!window.DBX || (S.org && S.org.empty)) return; DBX.side(main, { todo: [['AI기본법 남은 항목 2개', '이용자 고지 · 영향평가 기록을 채웁니다', 'warn', '보완'], ['학내 LLM 연결 검토', 'GPU 제공 주체를 정보화 부서와 확인합니다', '', '검토'], ['개인정보 가림 규칙 점검', '학번 · 연락처 패턴을 AI 전송 전에 가립니다', 'ok', '켜짐']], chart: { t: '최근 7일 AI 질문', v: '212건', s: '학생 · 교수자 합계', d: [148, 162, 171, 158, 189, 201, 212], lb: DBX.days7() }, ai: '응답 시간이 3초를 넘는 날이 늘면 토큰 할당량을 분반별로 나누세요. 시험 기간에는 AI 튜터를 시험 범위 밖으로 제한할 수 있습니다.' }); } });
  R('rfpmap', { art: 'check', brief: main => {
    const N = (typeof RFP_JNU !== 'undefined' && RFP_JNU.length) || 0; if (!N) return null; const c = k => RFP_JNU.filter(r => r[5] === k).length; const have = c('have') + c('v30') + c('v29');
    return { eye: '구축 요건 대응', title: `요구사항 <em>${N}건</em> 가운데 ${have}건을 제품으로 대응합니다`, sub: (() => { const P = [['구축 시 개발', c('dev')], ['외부 연계', c('ext')], ['수행 방안', c('pm')]].filter(x => x[1]); /* v43 R6: 0건 항목은 문장에서 뺍니다 */ return P.length ? `${P.map(x => `${x[0]} ${x[1]}건`).join(' · ')}은 제안서 대응표에 함께 적습니다.` : '모든 요구사항을 제품 기능으로 대응합니다. 시연 순서만 정하면 됩니다.'; })(), acts: [{ label: '대응표 CSV 내보내기', go: '[data-act="rf-xls"]' }], stats: [[Math.round(have / N * 100) + '%', '제품 대응률'], [have + '건', '제품 보유 · 반영'], c('dev') ? [c('dev') + '건', '구축 시 개발', 'warn'] : ['없음', '구축 시 개발'], (c('ext') + c('pm')) ? [c('ext') + c('pm') + '건', '연계 · 수행 방안'] : ['없음', '연계 · 수행 방안']] };
  }, enhance: main => { if (!window.DBX || typeof RFP_JNU === 'undefined') return; const c = k => RFP_JNU.filter(r => r[5] === k).length;
    main.querySelectorAll('.tw td').forEach(td => { if (td.dataset.db || td.querySelector('button,a,input')) return; const t = td.textContent.trim(); if (t.length > 70) { td.dataset.db = 1; td.innerHTML = `<div class="db-clamp" tabindex="0" title="${E(t)}">${E(t)}</div>`; const dv = td.firstChild; dv.addEventListener('click', () => dv.classList.toggle('open')); } });
    DBX.side(main, { tt: '대응 구분', todo: [['제품 보유 · 반영', `${c('have') + c('v30') + c('v29')}건 — 시연으로 확인합니다`, 'ok', '보유'], ['구축 시 개발', `${c('dev')}건 — 일정 · 인력을 제안서에 적습니다`, 'warn', '개발'], ['외부 연계 · 수행 방안', `${c('ext') + c('pm')}건 — 학교 시스템과 협의합니다`, '', '협의']], chart: { t: '구분별 요구사항', v: RFP_JNU.length + '건', s: '보유 · v30 · v29 · 개발 · 연계 · 수행', d: ['have', 'v30', 'v29', 'dev', 'ext', 'pm'].map(c), lb: ['보유', 'v30', 'v29', '개발', '연계', '수행'] }, ai: '긴 요건은 칸을 누르면 펼쳐집니다. 구축 시 개발 항목은 v44 일정과 맞춰 제안서에 적으세요.' }); } });
  R('cpl', { art: 'check', brief: main => {
    if (empty(main) || (UI.cpl && UI.cpl !== 'home')) return null; const n = main.querySelectorAll('.cpl-dd').length; const now = main.querySelectorAll('.cpl-dd.r').length; const ty = S.org.type; const P = S.org.cpl || {}; const MIN = (window.DDAtt && DDAtt.MIN) || 80;
    const on = !!P.on; const low = (() => { const m = (main.innerText || '').match(/출석률\s*\d+%\s*미만\s*(\d+)명/); return m ? +m[1] : 0; })();
    const sub = ty === 'lifelong' ? '평생교육법(시행령 제48조 · 시행규칙 제17조) 기준 자체 점검입니다. 실제 신고 전 관할 교육청에 확인하세요.' : on ? '훈련 규정 · 훈련시간 · 평가 기준은 고용노동부 원격훈련 기준을 따릅니다. 실제 심사 전 근거 문서를 확인하세요.' : '규정 기준을 켜지 않은 기관입니다. 법정의무교육 이수 현황만 확인하면 됩니다.';
    const title = (ty === 'corp' || (ty === 'public' && (S.org.ed || 'staff') === 'staff')) && !on ? '환급 과정을 운영하지 않으면 <em>법정의무교육</em>만 확인하면 됩니다' : now ? `지금 처리할 규정 항목 <em>${now}건</em>이 있습니다` : `기한 있는 할 일 <em>${n}건</em>을 가까운 순서로 정리했습니다`;
    return { eye: '인가 · 규정 준수', title, sub, acts: [on && low ? { label: `출석률 미달 ${low}명 독려`, go: '[data-act="cpl-go"][data-v="att"]' } : { label: '미이수자 독려', go: '[data-act="legal-nudge"]' }, { label: '근거 규정 보기', kind: 'sec', go: '[data-act="cpl-go"][data-v="rule"]' }], stats: on ? [[(+P.rate || 0) + '%', '수료 진도율 기준'], [(+P.pass || 0) + '점', '평가 통과 기준'], [MIN + '%', '출석률 기준'], [low + '명', `출석률 ${MIN}% 미만`, low ? 'warn' : '']] : (() => { /* v43 R2: 꺼짐 기관 KPI 「0건」 → 법정교육 이수 숫자 */ const LC = A('classes').filter(c => (typeof legalReq === 'function' ? legalReq(c) : c.legal) && c.status !== '종료'); const tn = LC.reduce((a, c) => a + (c.learners || []).length, 0), td = LC.reduce((a, c) => a + (typeof doneN === 'function' ? doneN(c) : 0), 0); return LC.length ? [[Math.round(td / Math.max(1, tn) * 100) + '%', '법정교육 이수율'], [(tn - td) + '명', '미이수 인원', tn - td ? 'warn' : ''], [LC.length + '종', '운영 중 법정교육'], (() => { const d0 = today(); const ds = LC.map(c => c.end).filter(d => d && d >= d0).concat(d0.slice(0, 4) + '-12-31').sort(); return ['D-' + Math.round((new Date(ds[0]) - new Date(d0)) / 864e5), '가까운 이수 마감']; })()] : n ? [[n + '건', '기한 있는 할 일'], [now + '건', '지금 처리', now ? 'warn' : '']] : [['없음', '가까운 기한']]; })() };
  }, enhance: main => { if (!window.DBX || (S.org && S.org.empty) || (UI.cpl && UI.cpl !== 'home')) return; const L = [...main.querySelectorAll('.cpl-todo li, .cpl-tl li')].slice(0, 4).map(li => { const d = li.querySelector('.cpl-dd, .cpl-tld'); const sp = li.querySelector('span'); return [E(sp ? sp.textContent.trim() : (li.querySelector('b') || li).textContent.trim()).slice(0, 60), E((li.querySelector('small') || {}).textContent || ''), d && (d.classList.contains('r') || li.classList.contains('w')) ? 'warn' : '', d ? d.textContent.trim() : '']; });
    /* v43 R6: 본문 체크리스트와 같은 목록을 보조 열에 반복하지 않음 — 보조 열은 규정 기준 요약 */ const P2 = S.org.cpl || {}; const MN = (window.DDAtt && DDAtt.MIN) || 80; void L;
    DBX.side(main, { tt: P2.on ? '수료 기준' : '확인할 기준', todo: P2.on ? [[`진도율 ${+P2.rate || 0}% 이상`, '훈련 규정 탭에서 바꿉니다', '', '규정'], [`평가 ${+P2.pass || 0}점 이상`, '시험이 없는 과정은 수료 판정이 멈춥니다', '', '평가'], [`출석률 ${MN}% 이상`, '출결 수업에만 적용합니다', '', '출결']] : [['법정의무교육 이수', '연 1회 · 마감 전 독려', '', '이수']], ai: '규정 수치(진도율 · 평가 · 출석률)는 훈련 규정 탭 한 곳에서 바꿉니다. 바꾸면 수료 판정 · HRD-Net 보고 · 학습자 화면에 같이 반영됩니다.' }); } });
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
