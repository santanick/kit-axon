/* v29 대학 학사 LMS 에디션 — 전남대 「AI 기반 지능형 플랫폼(e클래스2.0)」 제안요청서(2026.10) 요건을 반영한다.
   대학은 도입 형태로 둘로 나뉜다(S.org.ed).
   - lite: 사업단 · 공유대학 · ATC · 교수학습센터가 비교과 · 특화 과정을 빠르게 도입(SaaS, 학번 · 학과만)
   - lms : 전교생이 쓰는 메인 LMS — 학사 연동(구성원 · 강의 · 수강 · 분반 · 합반), 통합 인증(SSO), 스마트 출석,
           성적 산출 · 학사 전송, AI LLM 관리 · AI기본법 대응, 다국어, 데이터 이관, 구축 표준(전자정부 표준프레임워크 설치형)
   여기서 화면은 데모이며, 실제 학사 · SSO · 출결 연계는 학교 협력부서(정보화본부 · 학사과)와 연동 규격을 확정한 뒤 붙인다. */
(function () {
  'use strict';
  const ULMS = () => !!(S && S.org && S.org.type === 'univ' && S.org.ed === 'lms');
  window.ULMS = ULMS;
  const UED = { lite: { n: '사업단 · 센터', s: '사업단 · 공유대학 · ATC · 교수학습센터의 비교과 · 특화 과정을 빠르게 도입', ex: 'RISE · 혁신지원 · 공유대학 · ATC' }, lms: { n: '학사 LMS', s: '전교생 교과 수업 · 출결 · 시험 · 성적을 학사와 연동해 운영하는 메인 LMS', ex: '대학 e클래스 · 교수학습지원센터' } };
  window.UED = UED;
  /* 유형 이름은 에디션까지 보여 준다(설정 · AI SAM 맥락 · 보고서 머리 등 TYPES[..].name을 쓰는 모든 곳) */
  try { Object.defineProperty(TYPES.univ, 'name', { configurable: true, get() { return S && S.org && S.org.type === 'univ' ? `대학(${UED[S.org.ed === 'lms' ? 'lms' : 'lite'].n})` : '대학'; } }); } catch (e) { }

  /* ── 메뉴 · 프리셋 ── */
  Object.assign(MENU, {
    sis: { label: '학사 연동', ws: 'ops', only: 'univ' },
    grade: { label: '성적', ws: 'learn', only: 'univ' },
    aigov: { label: 'AI 관리', ws: 'ops' },
    rfpmap: { label: '구축 요건 대응', ws: 'ops', only: 'univ' }
  });
  ['sis', 'aigov', 'rfpmap'].forEach(x => { if (!TEACH_NO.includes(x)) TEACH_NO.push(x); });
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; ['aigov', ...(k === 'univ' ? ['sis', 'grade', 'rfpmap'] : [])].forEach(id => { if (!P.on.includes(id) && !P.off.includes(id)) P.off.push(id); }); });
  { const U = PRESET.univ; const want = ['class', 'attend', 'assess', 'grade', 'library', 'members', 'enroll', 'groups', 'admins', 'board', 'message', 'community', 'consult', 'sis', 'academic', 'aigov', 'rfpmap', 'auto', 'site', 'org'];
    const offW = ['journey', 'diag', 'badge', 'cert', 'book', 'parents', 'sales', 'billing'];
    const all = [...new Set([...U.on, ...U.off, ...want, ...offW])].filter(id => MENU[id]);
    const on = [...want, ...U.on.filter(id => !want.includes(id) && !offW.includes(id))].filter(id => MENU[id]);
    PRESET.univ_lms = { ws: [...U.ws], on, off: all.filter(id => !on.includes(id)) }; }
  if (typeof ONB === 'object' && ONB.univ) ONB.univ_lms = [['sis', '학사 연동 연결', '구성원 · 학기 · 강의 · 수강 · 분반을 학사에서 받아 강의실 자동 개설'], ['sis', '통합 인증(SSO)', '학내 SSO 모듈로 로그인 · 동시 로그인 차단 · 개인정보 동의 갱신'], ['attend', '스마트 출석 규칙', '인증번호 · 사진 · 본인인증 출석, 온라인 출석 인정 기준'], ['grade', '성적 기준', '수업계획서 평가 비율 · 등급 산정 · 학사 전송'], ['aigov', 'AI 관리', 'LLM 연결 · RAG 소스 · AI기본법 고지 · 다국어 자막']];

  /* ── 상태 ── */
  const LANGS = [['ko', '한국어'], ['en', '영어'], ['ja', '일본어'], ['zh', '중국어'], ['vi', '베트남어'], ['uz', '우즈베크어'], ['mn', '몽골어'], ['ru', '러시아어'], ['es', '스페인어'], ['fr', '프랑스어'], ['de', '독일어'], ['id', '인도네시아어'], ['th', '태국어'], ['ne', '네팔어']];
  function ens() {
    const L = S.lms = S.lms || {};
    L.sis = L.sis || { sso: 'school', mode: 'db', cycle: 'daily', time: '04:00', enrollAuto: true, last: null, log: [] };
    L.auth = L.auth || { concurrent: 'block', idle: 30, lockN: 5, lastLogin: true, consentYears: 2, multiId: true, external: true };
    L.att = L.att || { code: true, photo: true, bio: false, otp: true, kakao: false, sms: true, email: true, onlinePct: 90, inWeek: true, lateMin: 10, conc: 3000, multiPlay: 'block' };
    L.sec = L.sec || {};
    L.grade = L.grade || {};
    L.ai = L.ai || { models: [
      { id: 'onprem', n: '학내 오픈소스 LLM', k: '온프레미스 · OpenAI 호환 엔드포인트', on: false, note: 'GPU 제공 주체 확인 필요' },
      { id: 'claude', n: 'Anthropic Claude', k: '외부 API', on: true, note: '' },
      { id: 'openai', n: 'OpenAI GPT', k: '외부 API', on: false, note: '' },
      { id: 'gemini', n: 'Google Gemini', k: '외부 API', on: false, note: '' }],
      route: { tutor: 'claude', quiz: 'claude', sum: 'claude', grade: 'claude', risk: 'claude', sub: 'claude' },
      rag: [{ n: '강의계획서 · 강의자료(강의실별)', k: '자동', at: null }, { n: '학사 공지 · 학사 일정', k: '게시판 연동', at: null }, { n: '학칙 · 학사 규정집', k: '파일', at: null }],
      law: { notice: true, mark: true, log: true, human: true, appeal: false, risk: false },
      vod: ['ko', 'en', 'ja', 'zh', 'vi', 'uz', 'mn', 'ru', 'es', 'fr', 'de', 'id'], live: ['ko', 'en', 'zh', 'vi'] };
    L.mig = L.mig || { src: '기존 LMS', items: [['강좌 정보 · 수강 이력', 0], ['동영상 파일 · 강의자료실', 0], ['공지사항 · 질의응답 · 상담게시판', 0], ['과제 · 제출물', 0], ['성적 · 출석 기록', 0], ['학습 로그(아카이브)', 0]] };
    return L;
  }
  window.lmsEns = ens;
  const SIS_EDIT = () => S.me.role === 'owner' || S.me.role === 'admin';
  const code = (c, i) => { const g = S.groups.find(x => x.id === c.group) || S.groups[i % Math.max(1, S.groups.length)]; const p = ({ 컴퓨터공학과: 'CSE', 경영학과: 'BUS', 간호학과: 'NUR', 디자인학과: 'DES', 기계공학과: 'MEC' })[g && g.name] || 'GEN'; return `${p}${String(1001 + i * 7).slice(-4)}`; };
  const sem = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() < 7 ? 1 : 2}학기`; };

  /* ═════════ 학사 연동(SFR-003 · 005 · 006 · 008 · 018 · 019 · 050) ═════════ */
  const SSO = { school: '학내 통합인증(SSO) 모듈 연계', saml: 'SAML 2.0', oidc: 'OIDC', cas: 'CAS' };
  const MODE = { db: 'DB 연계(읽기 전용 뷰)', api: 'REST API', file: '배치 파일(SFTP)' };
  const CYC = { live: '수강신청 기간 실시간(5분)', hourly: '매시간', daily: '매일 1회' };
  VIEWS.sis = () => {
    const L = ens(); const tb = UI.sisT || 'stat'; const sx = L.sec; const secN = Object.values(sx).reduce((a, x) => a + (x.secs || []).length, 0);
    const enr = S.classes.reduce((a, c) => a + c.learners.length, 0);
    const top = head('학사 연동', `학사행정 · 통합 포털과 구성원 · 학기 · 강의 · 수강 · 분반을 동기화하고, 출결 · 성적을 학사로 보냅니다. 학생 정보는 학번 · 학과 · 학적 상태만 저장합니다(이름은 로그인 세션 표시용).`,
      `${SIS_EDIT() ? `<button class="btn pri" data-act="sis-sync">지금 동기화</button>` : ''}`) +
      `<div class="kpis">${kpi('이번 학기', sem())}${kpi('연동 강의실', S.classes.length + '개')}${kpi('분반', secN + '개')}${kpi('수강 등록', enr + '건')}${kpi('마지막 동기화', L.sis.last ? '완료' : '없음', L.sis.last ? esc(L.sis.last) : '지금 동기화로 시작')}</div>` +
      tabs('sisT', [['stat', '연동 구성'], ['sec', '분반 · 합반'], ['auth', '통합 인증'], ['mig', '데이터 이관'], ['log', '동기화 기록']], tb);
    let b = '';
    if (tb === 'stat') b = `<div class="card"><div class="ch"><b>연동 방식</b><small>학교 협력부서(정보화본부 · 학사과)와 규격 확정 후 연결</small></div>
      <div class="form2"><label>학사 연계 방식<select data-chg="sis-set" data-k="mode" ${SIS_EDIT() ? '' : 'disabled'}>${Object.entries(MODE).map(([k, v]) => `<option value="${k}" ${L.sis.mode === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label>자동 동기화 주기<select data-chg="sis-set" data-k="cycle" ${SIS_EDIT() ? '' : 'disabled'}>${Object.entries(CYC).map(([k, v]) => `<option value="${k}" ${L.sis.cycle === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label>실행 시각<input type="time" value="${esc(L.sis.time)}" data-chg="sis-set" data-k="time" ${SIS_EDIT() ? '' : 'disabled'}></label></div>
      <label class="ul-ck"><input type="checkbox" ${L.sis.enrollAuto ? 'checked' : ''} data-chg="sis-set" data-k="enrollAuto" ${SIS_EDIT() ? '' : 'disabled'}> 수강신청 기간에는 실시간으로 자동 동기화</label></div>` +
      `<div class="card"><div class="ch"><b>받는 데이터 · 보내는 데이터</b></div>${table(['방향', '항목', '디디쌤 필드', '비고'], [
        ['받기', '구성원(교수 · 조교 · 직원 · 학생)', '학번/사번 · 소속 · 역할 · 학적 상태', '이름 · 연락처는 저장하지 않음'],
        ['받기', '조직 · 학사 일정', '학과 · 학기 · 주차', '달력 · 알림에 반영'],
        ['받기', '강의 정보 · 수업계획서', '교과목 · 학수번호 · 분반 · 담당교수 · 평가 비율', '평가 비율은 성적 기준으로 자동 등록'],
        ['받기', '수강 정보', '수강생 · 청강생 · 수강 취소', '청강생은 성적 처리에서 제외'],
        ['보내기', '출석', '주차 · 차시별 출석 · 지각 · 결석 · 공결', '휴 · 보강 포함'],
        ['보내기', '성적', '항목별 점수 · 총점 · 등급', '교수 확정 후 전송']].map(r => r.map((x, i) => i === 0 ? tag(x, x === '받기' ? '' : 'y') : esc(x))))}</div>` +
      `<div class="card"><div class="ch"><b>기간계 연계</b></div><p class="mini">메일 · SMS · 카카오 알림톡(독려 · 휴보강 알림), 강의 녹화 시스템(녹화본 자동 탑재), 화상강의(출석 연동), 성장마루(비교과) · KOCW · MOOC는 모듈별로 켜고 끕니다.</p></div>`;
    if (tb === 'sec') b = `<div class="card"><div class="ch"><b>교과목 · 분반</b><small>학사 기준 자동 개설 · 같은 과목 분반에 원클릭 동기화</small></div>${table(['학수번호', t('cls'), '분반', '수강', '합반', ''], S.classes.map((c, i) => { const x = sx[c.id] || {}; return [esc(x.code || code(c, i)), esc(c.name), (x.secs || []).map(s => tag(s)).join(' ') || '—', c.learners.length + '명', x.merged ? tag('대표 ' + esc(x.merged)) : '—', (x.secs || []).length > 1 && SIS_EDIT() ? `<button class="btn sm" data-act="sec-sync" data-c="${c.id}">분반 동기화</button>` : '']; }), '동기화된 교과목이 없습니다. 연동 구성에서 지금 동기화를 누르세요.')}</div>
      <div class="card"><div class="ch"><b>분반 동기화 기록</b></div>${(L.secLog || []).slice(0, 8).map(r => `<div class="row"><span>${esc(r.at)} · ${esc(r.c)}</span><span class="mini">${esc(r.what)}</span></div>`).join('') || '<div class="empty">아직 없습니다. 개별 분반에서 고친 항목은 다시 동기화해도 덮어쓰지 않습니다.</div>'}</div>`;
    if (tb === 'auth') { const A = L.auth; const ck = (k, l) => `<label class="ul-ck"><input type="checkbox" ${A[k] ? 'checked' : ''} data-chg="auth-set" data-k="${k}" ${SIS_EDIT() ? '' : 'disabled'}> ${esc(l)}</label>`;
      b = `<div class="card"><div class="ch"><b>통합 인증</b><small>SFR-005</small></div><div class="form2"><label>인증 방식<select data-chg="sis-set" data-k="sso" ${SIS_EDIT() ? '' : 'disabled'}>${Object.entries(SSO).map(([k, v]) => `<option value="${k}" ${L.sis.sso === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label>자동 로그아웃(분)<input type="number" min="5" max="120" value="${A.idle}" data-chg="auth-set" data-k="idle" ${SIS_EDIT() ? '' : 'disabled'}></label><label>로그인 실패 잠금(회)<input type="number" min="3" max="10" value="${A.lockN}" data-chg="auth-set" data-k="lockN" ${SIS_EDIT() ? '' : 'disabled'}></label><label>개인정보 동의 갱신(년)<select data-chg="auth-set" data-k="consentYears" ${SIS_EDIT() ? '' : 'disabled'}>${[2, 3].map(y => `<option ${A.consentYears === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label></div>
      ${ck('concurrent', '같은 계정 동시 로그인 차단')}${ck('lastLogin', '로그인 때 최종 접속 IP · 시각 표시')}${ck('multiId', '여러 신분(학생 · 조교 · 직원)을 가진 사용자는 로그인 후 신분 선택')}${ck('external', '외부 구성원(학점교류 · 비정규 과정)은 별도 가입 · 로그인')}
      <p class="mini">휴면 계정 관리와 인적 DB의 계정 삭제 연동은 학사 동기화에 포함됩니다. 비밀번호는 학교 SSO가 관리하고 디디쌤은 받지 않습니다.</p></div>`; }
    if (tb === 'mig') b = `<div class="card"><div class="ch"><b>기존 시스템 데이터 이관</b><small>SFR-008 · DAR-003 · DAR-004</small>${SIS_EDIT() ? '<button class="btn sm" data-act="mig-run">이관 리허설</button>' : ''}</div>${L.mig.items.map(([n, p]) => `<div class="row"><span>${esc(n)}</span><span>${bar(p)} ${pct(p)}</span></div>`).join('')}<p class="mini">리허설 → 정합성 검증(건수 · 합계 · 표본 대조) → 본 이관 순서로 진행하고, 이관 후에도 지난 학기 강좌를 조회할 수 있게 합니다.</p></div>`;
    if (tb === 'log') b = `<div class="card"><div class="ch"><b>동기화 기록</b><small>개인별 결과 조회 · 실패 건 재처리</small></div>${table(['시각', '구분', '결과', '내용'], L.sis.log.slice(0, 20).map(r => [esc(r.at), esc(r.k), r.ok ? tag('성공') : tag('확인 필요', 'r'), esc(r.what)]), '아직 기록이 없습니다.')}</div>`;
    return top + b;
  };
  ACT['sis-set'] = el => { if (!SIS_EDIT()) return; const L = ens(); const k = el.dataset.k; L.sis[k] = el.type === 'checkbox' ? el.checked : el.value; logAudit('학사 연동 설정 변경 — ' + k); save(); render(); };
  ACT['auth-set'] = el => { if (!SIS_EDIT()) return; const A = ens().auth; const k = el.dataset.k; A[k] = el.type === 'checkbox' ? el.checked : (isNaN(+el.value) ? el.value : +el.value); logAudit('통합 인증 정책 변경 — ' + k); save(); render(); };
  ACT['sis-sync'] = () => {
    if (!SIS_EDIT()) return toast('관리자만 실행할 수 있습니다.', 'warn'); const L = ens(); const at = nowStr(); let secN = 0;
    S.classes.forEach((c, i) => { const x = L.sec[c.id] = L.sec[c.id] || {}; x.code = x.code || code(c, i); const n = c.learners.length > 12 && i < 4 ? 2 : 1; x.secs = Array.from({ length: n }, (_, k) => String(k + 1).padStart(2, '0')); secN += n;
      x.att = {}; c.learners.forEach((id, j) => { x.att[id] = x.secs[j % n]; }); });
    const mem = S.members.length; L.sis.last = at;
    L.sis.log.unshift({ at, k: '수강', ok: true, what: `${sem()} · 교과목 ${S.classes.length}개 · 분반 ${secN}개 · 수강 ${S.classes.reduce((a, c) => a + c.learners.length, 0)}건 반영` }, { at, k: '구성원', ok: true, what: `구성원 ${mem}명 · 학번 · 학과 · 학적 상태만 저장` });
    if (S.members.length > 3) L.sis.log.unshift({ at, k: '정합성', ok: false, what: `학적 상태 '휴학'인데 수강 등록된 1건 — 학사과 확인 요청` });
    L.sis.log = L.sis.log.slice(0, 60); logAudit('학사 동기화 실행(데모)'); save(); render(); toast('학사 동기화를 마쳤습니다(데모 데이터).', 'ok');
  };
  ACT['sec-sync'] = el => { const L = ens(); const c = C(el.dataset.c); if (!c) return; const x = L.sec[c.id]; L.secLog = L.secLog || []; L.secLog.unshift({ at: nowStr(), c: `${c.name} (${(x.secs || []).join(' · ')})`, what: '공지 · 자료실 · 주차 학습 · 과제 · 토론 · 시험을 대표 분반 기준으로 동기화(개별 수정 항목 제외)' }); logAudit('분반 동기화 — ' + c.name); save(); render(); toast('같은 과목의 모든 분반에 반영했습니다.', 'ok'); };
  ACT['mig-run'] = () => { const L = ens(); L.mig.items = L.mig.items.map(([n, p], i) => [n, Math.min(100, p + [60, 45, 70, 55, 80, 35][i])]); logAudit('데이터 이관 리허설(데모)'); save(); render(); };

  /* ═════════ 성적(SFR-032) ═════════ */
  const CUT = [['A+', 95], ['A0', 90], ['B+', 85], ['B0', 80], ['C+', 75], ['C0', 70], ['D+', 65], ['D0', 60], ['F', 0]];
  const asgScore = (p, id) => p.assign === 'graded' ? 70 + ((id.charCodeAt(id.length - 1) * 7) % 31) : p.assign === 'submitted' ? 60 : 0;
  function gradeRows(c) {
    const G = ens().grade[c.id] = ens().grade[c.id] || { w: { att: 10, asg: 30, exam: 40, quiz: 20 }, scale: 'abc', sent: null };
    const rows = c.learners.map(id => { const p = c.prog[id] || {}; const v = { att: p.att != null ? p.att : Math.min(100, p.p + 10), asg: asgScore(p, id), exam: p.exam || 0, quiz: Math.round((p.p || 0) * .9) };
      const tot = Math.round(Object.keys(G.w).reduce((a, k) => a + v[k] * G.w[k] / 100, 0) * 10) / 10; return { id, v, tot }; });
    const rank = [...rows].sort((a, b) => b.tot - a.tot);
    rows.forEach(r => { r.g = G.scale === 'score' ? String(r.tot) : G.scale === 'pct' ? Math.round(r.tot) + '%' : G.scale === 'rel' ? (() => { const q = rank.indexOf(r) / Math.max(1, rank.length); return q < .3 ? 'A' : q < .7 ? 'B' : q < .95 ? 'C' : 'D'; })() : CUT.find(([, m]) => r.tot >= m)[0]; });
    return { G, rows };
  }
  VIEWS.grade = () => {
    const cs = S.classes.filter(c => c.learners.length); const c = C(UI.grC) && cs.includes(C(UI.grC)) ? C(UI.grC) : cs[0];
    if (!c) return head('성적') + '<div class="empty">수강생이 있는 교과목이 없습니다.</div>';
    const { G, rows } = gradeRows(c); const sum = Object.values(G.w).reduce((a, b) => a + b, 0);
    const dist = {}; rows.forEach(r => { const k = String(r.g).replace(/[+0]$/, ''); dist[k] = (dist[k] || 0) + 1; });
    return head('성적', `수업계획서 평가 비율로 항목 점수를 자동 환산합니다. 온라인 · 오프라인 평가를 함께 모으고, 교수 확정 후 학사로 보냅니다.`, `<button class="btn" data-act="grade-xls" data-c="${c.id}">엑셀(CSV) 내보내기</button><button class="btn pri" data-act="grade-send" data-c="${c.id}" ${sum === 100 ? '' : 'disabled'}>교수 확정 · 학사 전송</button>`) +
      `<div class="bar2"><select data-chg="grSel" aria-label="${esc(t('cls'))} 선택">${cs.map(x => `<option value="${x.id}" ${x === c ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${G.sent ? tag('학사 전송 ' + G.sent) : tag('미전송', 'y')}</div>` +
      `<div class="card"><div class="ch"><b>평가 비율</b><small>합계 ${sum}%${sum !== 100 ? ' — 100%가 되어야 전송할 수 있습니다' : ''}</small></div><div class="form2">${[['att', '출석'], ['asg', '과제'], ['exam', '시험'], ['quiz', '퀴즈 · 활동']].map(([k, l]) => `<label>${l}(%)<input type="number" min="0" max="100" step="5" value="${G.w[k]}" data-chg="gr-w" data-c="${c.id}" data-k="${k}"></label>`).join('')}
      <label>등급 산정<select data-chg="gr-scale" data-c="${c.id}">${[['abc', '절대평가(A+~F)'], ['rel', '상대평가(A 30% · B 40%)'], ['score', '점수'], ['pct', '백분율']].map(([k, l]) => `<option value="${k}" ${G.scale === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></div>` +
      `<div class="card"><div class="ch"><b>성적 분포</b></div>${Object.entries(dist).sort().map(([k, n]) => `<div class="row"><span>${esc(k)}</span><span>${bar(n / Math.max(1, rows.length) * 100)} ${n}명</span></div>`).join('')}</div>` +
      `<div class="card"><div class="ch"><b>종합 평가 보드</b><small>청강생은 자동 제외</small><button class="btn sm ai" data-act="gr-nudge" data-c="${c.id}">✦ 과제 미제출 · 60점 미만에게 안내</button></div>${table(['학번', '학과', '출석', '과제', '시험', '퀴즈', '총점', '등급'], rows.map(r => { const m = M(r.id) || {}; return [esc(m.extra?.학번 || r.id), esc(S.groups.find(g => g.id === m.group)?.name || ''), r.v.att, r.v.asg, r.v.exam, r.v.quiz, `<b>${r.tot}</b>`, tag(r.g, /^F|^D/.test(r.g) ? 'r' : '')]; }))}</div>`;
  };
  ACT.grSel = el => { UI.grC = el.value; render(); };
  ACT['gr-w'] = el => { const { G } = gradeRows(C(el.dataset.c)); G.w[el.dataset.k] = Math.max(0, Math.min(100, +el.value || 0)); save(); render(); };
  ACT['gr-scale'] = el => { const { G } = gradeRows(C(el.dataset.c)); G.scale = el.value; save(); render(); };
  ACT['grade-xls'] = el => { const c = C(el.dataset.c); const { rows } = gradeRows(c); downloadCSV(`성적_${c.name}_${today()}.csv`, ['학번', '학과', '출석', '과제', '시험', '퀴즈', '총점', '등급'], rows.map(r => { const m = M(r.id) || {}; return [m.extra?.학번 || r.id, S.groups.find(g => g.id === m.group)?.name || '', r.v.att, r.v.asg, r.v.exam, r.v.quiz, r.tot, r.g]; })); };
  ACT['grade-send'] = el => { const c = C(el.dataset.c); const { G, rows } = gradeRows(c); modal('교수 확정 · 학사 전송', `<p><b>${esc(c.name)}</b> ${rows.length}명의 성적을 확정하고 학사로 보냅니다. 전송 뒤 수정은 학사 성적 정정 절차를 따릅니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '확정 · 전송', kind: 'pri', run: () => { G.sent = nowStr(); const L = ens(); L.sis.log.unshift({ at: G.sent, k: '성적', ok: true, what: `${c.name} ${rows.length}명 성적 전송` }); logAudit('성적 학사 전송 — ' + c.name); save(); render(); toast('학사로 보냈습니다(데모).', 'ok'); } }]); };
  ACT['gr-nudge'] = el => { const c = C(el.dataset.c); const { rows } = gradeRows(c); const n = rows.filter(r => r.v.asg === 0 || r.tot < 60).length; toast(`대상 ${n}명 — AI SAM 계획 카드로 안내 메시지를 준비합니다.`); if (typeof ACT['chat-open'] === 'function') ACT['chat-open'](); };

  /* ═════════ 스마트 출석(SFR-010 · 015 · 016 · 031 · 068 · 088) — 출결 화면 위에 규칙 카드 ═════════ */
  const baseAttend = VIEWS.attend;
  VIEWS.attend = () => { const h = baseAttend(); if (!ULMS()) return h; const A = ens().att; const ck = (k, l) => `<label class="ul-ck"><input type="checkbox" ${A[k] ? 'checked' : ''} data-chg="att-set" data-k="${k}"> ${esc(l)}</label>`;
    const shortWeeks = S.classes.slice(0, 3).map(c => ({ c, n: (c.curriculum || []).filter((u, i) => i % 5 === 3).length })).filter(x => x.n);
    return `<div class="card"><div class="ch"><b>스마트 출석 규칙</b><small>온 · 오프라인 통합 출석부 · 동시 접속 ${A.conc.toLocaleString()}명 기준</small></div>
      <div class="ul-cols"><div><p class="mini"><b>오프라인 · 화상 수업 출석 방식</b></p>${ck('code', '인증번호')}${ck('photo', '사진 등록 · 인증(촬영 위치 · 일시 저장)')}${ck('bio', '생체 인증(앱 · 얼굴 · 지문)')}${ck('otp', 'OTP')}${ck('sms', 'SMS 본인 인증')}${ck('email', '이메일 본인 인증')}${ck('kakao', '카카오톡 인증')}</div>
      <div><p class="mini"><b>온라인 출석 인정</b></p><div class="form2"><label>진도율(%)<input type="number" min="50" max="100" step="5" value="${A.onlinePct}" data-chg="att-set" data-k="onlinePct"></label><label>지각 기준(분)<input type="number" min="0" max="60" value="${A.lateMin}" data-chg="att-set" data-k="lateMin"></label></div>${ck('inWeek', '해당 주차 학습 기간 안에 들어야 출석 인정')}<label class="ul-ck"><input type="checkbox" ${A.multiPlay === 'block' ? 'checked' : ''} data-chg="att-set" data-k="multiPlay"> 여러 강의 동시 재생 차단</label></div></div>
      <p class="mini">출석 · 지각 · 결석 · 공결(사유 입력), 휴 · 보강 설정과 학생 푸시 알림, 학교 출석부 양식 엑셀 다운로드, 학사 출석 전송을 지원합니다.</p></div>
      <div class="card"><div class="ch"><b>원격수업 학습 분량 점검</b><small>원격수업 운영지침 · 차시별 재생 시간 · 활동 시간 합산</small></div>${shortWeeks.length ? shortWeeks.map(x => `<div class="row"><span>${esc(x.c.name)}</span>${tag(`학습 시간 부족 차시 ${x.n}개`, 'y')}</div>`).join('') : '<div class="empty">부족한 차시가 없습니다.</div>'}</div>` + h; };
  ACT['att-set'] = el => { const A = ens().att; const k = el.dataset.k; A[k] = k === 'multiPlay' ? (el.checked ? 'block' : 'allow') : el.type === 'checkbox' ? el.checked : +el.value; save(); render(); };

  /* ═════════ AI 관리(SFR-073 · 077 · 087 · AI기본법) ═════════ */
  const FN = [['tutor', 'AI 튜터 · Q&A'], ['quiz', '퀴즈 · 문제 출제 · 추천'], ['sum', '요약 · 번역 · 문서뷰어'], ['grade', '과제 · 서술형 채점 보조'], ['risk', '학습위기 예측'], ['sub', '자동 자막 · 실시간 번역']];
  const LAW = [['notice', 'AI 이용 사실을 화면에 미리 알림(튜터 · 채점 · 추천)'], ['mark', 'AI가 만든 결과물에 “AI 생성” 표시'], ['log', 'AI 이용 기록 보관(건수 · 기능 · 모델, 대화 원문 미저장)'], ['human', '성적 · 평가에 쓰이는 AI 결과는 교수가 최종 확정'], ['appeal', '이용자 이의 제기 창구 운영'], ['risk', '고영향 AI 해당 여부 검토 · 위험관리 문서화']];
  VIEWS.aigov = () => {
    const A = ens().ai; const tb = UI.aiT || 'model'; const edit = SIS_EDIT();
    const gd = typeof AIG === 'object' ? AIG.stats : { redacted: 0, inj: 0, leak: 0 };
    const top = head('AI 관리', 'LLM 연결 · 기능별 모델 지정 · 학습 자료(RAG) · 성능 지표 · AI기본법 대응 · 다국어 자막을 한곳에서 관리합니다. API 키는 서버 비밀 저장소에서만 설정합니다.') +
      `<div class="kpis">${kpi('켜진 모델', A.models.filter(m => m.on).length + '개')}${kpi('학습 자료', A.rag.length + '종')}${kpi('개인정보 가림', gd.redacted + '건', '이 브라우저 기준')}${kpi('인젝션 감지', gd.inj + '건')}${kpi('AI기본법 항목', LAW.filter(([k]) => A.law[k]).length + '/' + LAW.length)}</div>` +
      tabs('aiT', [['model', 'LLM 연결'], ['rag', '학습 자료(RAG)'], ['perf', '성능 지표'], ['law', 'AI기본법 · 거버넌스'], ['lang', '다국어 자막']], tb);
    let b = '';
    if (tb === 'model') b = `<div class="card"><div class="ch"><b>LLM 연결</b><small>플러그인 방식 · 추가 · 교체 가능</small></div>${table(['모델', '연결', '상태', '비고', ''], A.models.map((m, i) => [esc(m.n), esc(m.k), m.on ? tag('사용') : tag('끔', 'y'), esc(m.note || ''), edit ? `<button class="btn sm" data-act="ai-tg" data-i="${i}">${m.on ? '끄기' : '켜기'}</button>` : '']))}</div>
      <div class="card"><div class="ch"><b>기능별 모델 지정</b></div>${FN.map(([k, l]) => `<div class="row"><span>${esc(l)}</span><select data-chg="ai-route" data-k="${k}" ${edit ? '' : 'disabled'}>${A.models.filter(m => m.on).map(m => `<option value="${m.id}" ${A.route[k] === m.id ? 'selected' : ''}>${esc(m.n)}</option>`).join('')}</select></div>`).join('')}<p class="mini">데모에서는 Claude만 실제로 호출합니다. 다른 모델은 연결 규격(OpenAI 호환 엔드포인트 · 공급사 API)만 저장합니다.</p></div>`;
    if (tb === 'rag') b = `<div class="card"><div class="ch"><b>학습 자료(RAG) 소스</b>${edit ? '<button class="btn sm" data-act="rag-add">소스 추가</button><button class="btn sm" data-act="rag-idx">다시 색인</button>' : ''}</div>${table(['소스', '방식', '마지막 색인'], A.rag.map(r => [esc(r.n), esc(r.k), esc(r.at || '—')]))}<p class="mini">소스 속 지시문은 데이터로만 다루고(보안 원칙), 학생별 개인정보는 색인하지 않습니다.</p></div>`;
    if (tb === 'perf') b = `<div class="card"><div class="ch"><b>모델 성능 지표</b><small>최근 30일 · 데모 수치</small></div>${table(['모델', '호출', '평균 응답', '만족도', '오류율'], A.models.filter(m => m.on).map((m, i) => [esc(m.n), (1200 - i * 300).toLocaleString() + '건', (1.4 + i * .3).toFixed(1) + '초', (91 - i * 2) + '%', (0.6 + i * .2).toFixed(1) + '%']))}</div>`;
    if (tb === 'law') b = `<div class="card"><div class="ch"><b>AI기본법 · 거버넌스 체크</b><small>「인공지능 발전과 신뢰 기반 조성 등에 관한 법률」 — 적용 범위는 발주기관과 협의해 확정</small></div>${LAW.map(([k, l]) => `<label class="ul-ck"><input type="checkbox" ${A.law[k] ? 'checked' : ''} data-chg="ai-law" data-k="${k}" ${edit ? '' : 'disabled'}> ${esc(l)}</label>`).join('')}
      <div class="row"><span>AI로 가는 개인정보 가림(서버 강제)</span>${tag('적용')}</div><div class="row"><span>프롬프트 인젝션 감지 · 반복 차단</span>${tag('적용')}</div><div class="row"><span>AI 답변 속 지시문 · 키 유출 차단</span>${tag('적용')}</div></div>`;
    if (tb === 'lang') b = `<div class="card"><div class="ch"><b>동영상 자동 자막</b><small>${A.vod.length}개 언어 · 12개 이상 권장</small></div><div class="ul-langs">${LANGS.map(([k, l]) => `<label class="ul-ck in"><input type="checkbox" ${A.vod.includes(k) ? 'checked' : ''} data-chg="ai-lang" data-g="vod" data-k="${k}" ${edit ? '' : 'disabled'}> ${l}</label>`).join('')}</div></div>
      <div class="card"><div class="ch"><b>대면 수업 실시간 자막 · 번역</b><small>동시 ${A.live.length}/4개 언어 · 학생은 QR로 접속</small></div><div class="ul-langs">${LANGS.map(([k, l]) => `<label class="ul-ck in"><input type="checkbox" ${A.live.includes(k) ? 'checked' : ''} data-chg="ai-lang" data-g="live" data-k="${k}" ${edit ? '' : 'disabled'}> ${l}</label>`).join('')}</div><p class="mini">음성 인식 · 번역 엔진은 외부 API 연계가 필요합니다(데이터룸 외부 연결 설정을 따름). 화면 메뉴 다국어는 한국어 · 영어 · 일본어 · 중국어를 기본 제공합니다.</p></div>`;
    return top + b;
  };
  ACT['ai-tg'] = el => { const A = ens().ai; const m = A.models[+el.dataset.i]; if (!m) return; if (m.on && A.models.filter(x => x.on).length === 1) return toast('최소 1개 모델은 켜 두어야 합니다.', 'warn'); m.on = !m.on; Object.keys(A.route).forEach(k => { if (!A.models.find(x => x.id === A.route[k] && x.on)) A.route[k] = A.models.find(x => x.on).id; }); logAudit(`LLM ${m.on ? '켬' : '끔'} — ${m.n}`); save(); render(); };
  ACT['ai-route'] = el => { ens().ai.route[el.dataset.k] = el.value; logAudit('기능별 모델 지정 — ' + el.dataset.k); save(); };
  ACT['ai-law'] = el => { ens().ai.law[el.dataset.k] = el.checked; logAudit('AI 거버넌스 항목 — ' + el.dataset.k); save(); render(); };
  ACT['ai-lang'] = el => { const A = ens().ai; const g = el.dataset.g; const k = el.dataset.k; const L = A[g]; if (el.checked) { if (g === 'live' && L.length >= 4) { el.checked = false; return toast('실시간 번역은 동시 4개 언어까지입니다.', 'warn'); } if (!L.includes(k)) L.push(k); } else A[g] = L.filter(x => x !== k); save(); render(); };
  ACT['rag-add'] = () => modal('RAG 소스 추가', `<label class="fl">이름<input name="n" maxlength="40" placeholder="예: 2026 학사 운영 규정"></label><label class="fl">방식<select name="k"><option>파일</option><option>게시판 연동</option><option>웹 주소</option></select></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { const n = fv(w, 'n'); if (!n) return false; ens().ai.rag.push({ n, k: fv(w, 'k'), at: null }); logAudit('RAG 소스 추가 — ' + n); save(); render(); } }]);
  ACT['rag-idx'] = () => { const at = nowStr(); ens().ai.rag.forEach(r => r.at = at); save(); render(); toast('색인을 갱신했습니다(데모).', 'ok'); };

  /* ── 설정 › 기관 유형: 대학 도입 형태 전환 ── */
  ACT['ed-chg'] = el => { const v = el.dataset.v === 'lms' ? 'lms' : 'lite'; if (S.org.type !== 'univ' || S.org.ed === v) return;
    modal('대학 도입 형태 변경', `<p><b>${esc(UED[v].n)}</b>(으)로 바꾸면 추천 메뉴가 바뀝니다. 데이터는 그대로 유지됩니다.</p><p class="mini">${esc(UED[v].s)}</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '변경', kind: 'pri', run: () => { S.org.ed = v; S.nav = presetNav('univ', v); logAudit('대학 도입 형태 변경 — ' + UED[v].n); save(); render(); } }]); };
  /* v29.1 재원 표시(영업 · 정산 관리용) — 유형과 별개. 기본값: 공공 유형 · 대학 사업단은 공공 재원, 나머지는 자체 예산 */
  const FUND = { own: { n: '자체 예산', s: '기관 운영 예산으로 도입 — 일반 계약 · 연 단위 갱신', ex: '기업 · 학원 · 대학 본부 예산' }, public: { n: '공공 재원 · 국고 사업단', s: '국고 · 지자체 사업비로 도입 — 사업 기간 · 집행 증빙 · 결과 보고 기준으로 관리', ex: 'RISE · 혁신지원 · 공유대학 · 지자체 위탁' } };
  window.FUND = FUND;
  window.fundOf = () => { const f = S && S.org && S.org.fund; if (f === 'own' || f === 'public') return f; const t = S && S.org && S.org.type; return t === 'public' || (t === 'univ' && S.org.ed !== 'lms') ? 'public' : 'own'; };
  ACT['fund-chg'] = el => { const v = el.dataset.v === 'public' ? 'public' : 'own'; if (fundOf() === v && S.org.fund) return; S.org.fund = v; logAudit('재원 표시 변경 — ' + FUND[v].n); save(); render(); toast && toast('재원을 「' + FUND[v].n + '」(으)로 표시했습니다.'); };
  const fundCard = () => `<div class="card" id="fundCard"><div class="ch"><b>재원</b><small>영업 · 정산 관리용 표시입니다. 메뉴는 바뀌지 않습니다</small></div><div class="tgrid">${Object.entries(FUND).map(([k, v]) => `<button class="tcard ${fundOf() === k ? 'on' : ''}" data-act="fund-chg" data-v="${k}"><b>${esc(v.n)}</b><p>${esc(v.s)}</p><small>${esc(v.ex)}</small></button>`).join('')}</div>${fundOf() === 'public' ? `<p class="mini">공공 재원 기관은 사업 기간 종료 전 결과 보고 · 집행 증빙(감사 기록 · 이수 현황 내보내기)을 챙겨 주세요.${S.org.fund ? '' : ' (유형 기준 자동 표시)'}</p>` : ''}</div>`;
  window.edSwitchHTML = () => (S.org.type !== 'univ' ? '' : `<div class="card"><div class="ch"><b>대학 도입 형태</b><small>같은 대학 유형 안에서 도입 범위를 고릅니다</small></div><div class="tgrid">${Object.entries(UED).map(([k, v]) => `<button class="tcard ${(S.org.ed === 'lms' ? 'lms' : 'lite') === k ? 'on' : ''}" data-act="ed-chg" data-v="${k}"><b>${esc(v.n)}</b><p>${esc(v.s)}</p><small>${esc(v.ex)}</small></button>`).join('')}</div></div>`) + fundCard();
})();
