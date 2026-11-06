/* v30 인가 · 규정 준수 — 고용노동부 원격훈련(사업주 지원규정 별표 1 · 내일배움카드) · 원격평생교육시설 신고 대응
   유형별 프로필(S.org.cpl): 직업훈련원 = 위탁훈련 · 내일배움, 기업 = 사업주 자체훈련(기관이 켤 때 적용), 평생교육원 = 신고 기준.
   대학 · 공공 · 학원은 기본 꺼짐이며 메뉴 구성에서 탭을 켜고 프로필을 고르면 같은 기능을 쓴다.
   실제 연동(자동모니터링시스템 · HRD-Net · 공단 MOTP · 휴대폰 인증)은 규격 · 계약 확정 뒤 어댑터로 붙인다. 이 화면은 준비 상태를 숨기지 않는다. */
(function () {
  'use strict';
  const PROFILES = {
    'moel-entrust': { n: '위탁훈련 · 내일배움카드', s: '직업훈련원 — 별표 1 위탁훈련 기준 전체' },
    'moel-self': { n: '사업주 자체훈련', s: '기업 — 별표 1 자체훈련 기준' },
    lifelong: { n: '원격평생교육시설 신고', s: '평생교육원 — 교육청 신고 · 학습비 반환' }
  };
  const DEF = { 'moel-entrust': { single: true, dayMax: 8, itemMin: 50, rate: 80, pass: 60, surveyFirst: true, monthEval: true, bank: 3, fbDays: 7, copyThr: 80, retainY: 5, idv: { phone: true, motp: true } }, lifelong: { single: false, dayMax: 0, itemMin: 0, rate: 0, pass: 0, surveyFirst: false, monthEval: false, bank: 0, fbDays: 7, copyThr: 80, retainY: 5, idv: { phone: false, motp: false } } };
  DEF['moel-self'] = DEF['moel-entrust'];
  const MOEL = () => ['moel-entrust', 'moel-self'].includes(cplP().profile);
  const LIVEON = () => typeof LIVE !== 'undefined' && LIVE && LIVE.tenant && typeof api === 'function';
  const defaultCpl = type => { const profile = type === 'lifelong' ? 'lifelong' : type === 'corp' ? 'moel-self' : 'moel-entrust'; return { on: type === 'voc' || type === 'lifelong', profile, ...JSON.parse(JSON.stringify(DEF[profile])) }; };
  function cplEnsure() { if (!S || !S.org) return; if (!S.org.cpl) S.org.cpl = defaultCpl(S.org.type); S.cpl = S.cpl || {}; const D = S.cpl; D.sum = D.sum || {}; D.ev = D.ev || {}; D.attReq = D.attReq || []; D.consent = D.consent || {}; D.att = D.att || {}; D.copy = D.copy || []; }
  const cplP = () => { cplEnsure(); return S.org.cpl; };
  window.cplPublic = () => { const P = cplP(); return { on: !!P.on, profile: P.profile, single: !!P.single, dayMax: +P.dayMax || 0, itemMin: +P.itemMin || 0, rate: +P.rate || 0, pass: +P.pass || 0, surveyFirst: !!P.surveyFirst, idv: { phone: !!(P.idv && P.idv.phone), motp: !!(P.idv && P.idv.motp) }, copyThr: +P.copyThr || 80 }; };

  /* ── 메뉴 · 프리셋 ── */
  MENU.cpl = { label: '인가 · 규정 준수', ws: 'ops' };
  if (!TEACH_NO.includes('cpl')) TEACH_NO.push('cpl');
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; const on = ['voc', 'lifelong', 'corp'].includes(k); const L = on ? P.on : P.off; if (!P.on.includes('cpl') && !P.off.includes('cpl')) L.push('cpl'); });
  if (typeof COVER !== 'undefined' && COVER.push) COVER.push(['고용노동부 원격훈련 · 원격평생교육 요건 점검', 'cpl', '']);
  if (typeof DICT !== 'undefined') Object.assign(DICT, { '인가 · 규정 준수': 'Compliance|コンプライアンス|合规|Cumplimiento|Conformité|Compliance|Tuân thủ|การปฏิบัติตาม|Соответствие' });
  { const base = postSeed; postSeed = (...a) => { const r = base(...a); try { cplEnsure(); } catch (e) { console.error(e); } return r; }; }
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org) { cplEnsure(); navAdd('cpl', ['voc', 'lifelong', 'corp'].includes(S.org.type)); } } catch (e) { console.error(e); } return r; }; }

  /* 학습자 게시본: 정책 · 차시 기준을 함께 싣는다 */
  { const base = lsSnapshot; lsSnapshot = (...a) => { const pub = base(...a); try { pub.cpl = cplPublic(); (pub.classes || []).forEach(c => { const src = C(c.id); (c.items || []).forEach(it => { const x = src && (src.curriculum || []).find(y => y.id === it.id); if (x) { if (x.cplN) it.cplN = +x.cplN; it.cplSec = recSecs(x); } }); }); } catch (e) { console.error(e); } return pub; }; }
  /* 설치 구성에 규정 준수 정책을 함께 내보낸다(비밀값 없음) */
  { const base = tenantYAML; tenantYAML = (...a) => { const P = cplP(); return base(...a).replace(/\n*$/, '\n') + `compliance:\n  on: ${!!P.on}\n  profile: ${P.profile}\n  singleSession: ${!!P.single}\n  dayMaxHours: ${+P.dayMax || 0}\n  retainYears: ${+P.retainY || 5}\n`; }; }

  /* ── 학습 기준 도우미 ── */
  function recSecs(it) { if (+it.cplMin > 0) return it.cplMin * 60; const d = it.yt && it.yt.dur; if (typeof d === 'number' && d > 0) return d; if (typeof d === 'string' && /^\d+:\d{2}(:\d{2})?$/.test(d)) { const p = d.split(':').map(Number); return p.reduce((a, x) => a * 60 + x, 0); } if (+it.dur > 0) return +it.dur; return 600; }
  const evalItems = c => (c.curriculum || []).filter(i => ['exam', 'quiz'].includes(i.type));
  const videoItems = c => (c.curriculum || []).filter(i => i.type === 'video');
  const bankOK = (it, x) => { const n = +it.cplN || (it.qs || []).length; return n > 0 && (it.qs || []).length >= n * x; };
  const sidOf = id => { const m = S.members.find(x => x.id === id); return m ? String(m.sid || m.name) : id; };
  const hoursOf = s => (Math.round((+s || 0) / 360) / 10).toLocaleString('ko-KR') + '시간';
  const statTag = s => ({ ok: tag('충족', 'g'), set: tag('설정 필요', 'r'), link: tag('연동 대기', 'y'), org: tag('기관 준비', 'y'), done: tag('증빙 완료', 'g') })[s] || '';

  /* ── 요건 점검표 — 근거: 사업주 직업능력개발훈련 지원규정 별표 1(고시 제2026-48호) · 국민내일배움카드 운영규정(제2026-39호) · 평생교육법 시행규칙 제17조 ── */
  function reqList() {
    const P = cplP(); const on = !!P.on; const cls = S.classes.filter(c => c.status !== '종료'); const allEval = cls.flatMap(evalItems);
    const A = (group, id, label, basis, st, note = '') => ({ group, id, label, basis, st, note });
    const iso = (S.org.room && S.org.room.mode) || 'saas';
    if (P.profile === 'lifelong') return [
      A('신고 요건', 'lf-target', '신고 대상 확인(학습비 · 10명 이상 · 30시간 이상)', '평생교육법 시행령 제48조', 'org'),
      A('신고 요건', 'lf-form', '평생교육시설 신고서', '시행규칙 별지 제14호', 'org', '신고 서류 탭에서 준비합니다.'),
      A('신고 요건', 'lf-rule', '운영규칙', '시행규칙 제17조', S.docs && S.docs.some(d => d.tpl === 'cpl-rule') ? 'ok' : 'set', '초안 문서를 만들어 기관 기준으로 수정합니다.'),
      A('신고 요건', 'lf-fac', '시설 · 설비 현황표(서버 등 설비 포함)', '시행규칙 제17조', S.docs && S.docs.some(d => d.tpl === 'cpl-fac') ? 'ok' : 'set'),
      A('신고 요건', 'lf-map', '위치도 · 시설배치도', '시행규칙 제17조', 'org'),
      A('신고 요건', 'lf-edu', '평생교육사 1명 이상 · 자격증 사본', '평생교육법 제26조 · 시행령 제22조', 'org'),
      A('신고 요건', 'lf-prop', '재산목록 · 임대차 계약서', '시행규칙 제17조', 'org'),
      A('운영 의무', 'lf-ins', '보험 또는 공제 가입', '평생교육법 제28조', 'org', '지역 조례 기준을 교육청에 확인합니다.'),
      A('운영 의무', 'lf-bld', '건축물 용도 · 위반 건축물 여부', '건축법 시행령 별표 1', 'org'),
      A('운영 의무', 'lf-refund', '학습비 반환(사유 발생 후 5일 이내)', '평생교육법 제28조 · 시행령 제23조', 'ok', '학습비 반환 탭에서 계산합니다.'),
      A('운영 의무', 'lf-change', '변경신고(명칭 · 위치 · 과정 · 학습비 · 설비 · 평생교육사)', '시행령 제49조의2 · 시행규칙 제17조의2', 'org'),
      A('운영 의무', 'lf-server', '주된 서버 위치에 따른 관할 교육청 확인', '교육청 안내', 'org', '클라우드 사용 시 교육청에 먼저 확인합니다.')
    ];
    const self = P.profile === 'moel-self'; const R = [
      A('훈련생 모듈', 'u-info', '첫 화면 유의사항 · 훈련 절차 · 1일 진도 제한 · 베낀 답안 기준 안내', '별표 1 ②', on ? 'ok' : 'set'),
      A('훈련생 모듈', 'u-enroll', '웹 수강신청 · 변경, 수강 현황', '별표 1 ②', 'ok'),
      A('훈련생 모듈', 'u-result', '시험 · 과제 · 첨삭 결과 웹 확인', '별표 1 ②', 'ok'),
      A('훈련생 모듈', 'u-hist', '개인 · 학습 이력(차시별 학습시간 포함)', '별표 1 ②', on ? 'ok' : 'set'),
      A('훈련생 모듈', 'u-single', '동일 ID 동시접속 방지', '별표 1 ②', on && P.single ? 'ok' : 'set'),
      A('훈련생 모듈', 'u-phone', '휴대폰 본인확인(입과 시 최초 1회, 필요 시)', '별표 1 ②', P.idv && P.idv.phone ? 'link' : 'set', '본인확인 제공사 계약 후 연결합니다.'),
      A('훈련생 모듈', 'u-motp', '일회용 비밀번호 신분확인', '별표 1 ②', P.idv && P.idv.motp ? 'link' : 'set', '공단 규격 확보 후 연결합니다.'),
      A('훈련생 모듈', 'u-priv', '개인정보 수집 안내', '별표 1 ②', on ? 'ok' : 'set'),
      A('훈련생 모듈', 'u-qna', '훈련 내용 · 운영 질의응답', '별표 1 ②', 'ok'),
      A('관리자 모듈', 'a-prog', '훈련생별 수강신청일 · 진도율 · 평가 제출일', '별표 1 ②', 'ok'),
      A('관리자 모듈', 'a-rand', '평가 훈련생별 무작위 출제', '별표 1 ②', allEval.length && allEval.every(i => i.cplN && bankOK(i, 3)) ? 'ok' : 'set', '차시 · 평가 탭에서 출제 수를 정합니다.'),
      A('관리자 모듈', 'a-time', '평가 시간 제한', '별표 1 ②', allEval.length && allEval.every(i => +i.time > 0) ? 'ok' : 'set'),
      A('관리자 모듈', 'a-nudge', '참여 저조 훈련생 학습 독려', '별표 1 ②', 'ok'),
      A('관리자 모듈', 'a-survey', '개인별 만족도 조사 · 수강평 후 평가 응시', '별표 1 ② · 내일배움 제19조', on && P.surveyFirst ? 'ok' : 'set'),
      A('관리자 모듈', 'a-mon', '훈련 현황 · 평가 · 첨삭 · IP · 차시별 학습시간 조회', '별표 1 ②', on ? 'ok' : 'set'),
      A('관리자 모듈', 'a-copy', '베낀 답안 기준 · 확인 기능', '별표 1 ②', on ? 'ok' : 'set'),
      A('관리자 모듈', 'a-emon', '공단 원격훈련 자동모니터링시스템 연계', '지원규정 제6조 · 별표 1 ②', 'link', '전송 항목 규격을 공단에서 확보해야 합니다.'),
      A('교사 모듈', 't-fb', '시험 · 과제 첨삭, 첨삭 일정 조회', '별표 1 ②', 'ok'),
      A('평가 · 진도', 'e-bank', '문제은행 3배수 이상', '별표 1 ④', allEval.length && allEval.every(i => bankOK(i, 3)) ? 'ok' : 'set'),
      A('평가 · 진도', 'e-item', '차시별 인정 학습시간 50% 이상 진도 인정', '별표 1 ④', +P.itemMin >= 50 ? 'ok' : 'set'),
      A('평가 · 진도', 'e-rate', '수료 진도율 80% 이상', '지원규정 제11조 · 내일배움 제38조', +P.rate >= 80 ? 'ok' : 'set'),
      A('평가 · 진도', 'e-day', '1일 학습시간 8시간 이하', '지원규정 제11조 · 내일배움 제19조', +P.dayMax > 0 && +P.dayMax <= 8 ? 'ok' : 'set'),
      A('전산시스템', 's-iso', '타 기관과 데이터 · 권한 · 스토리지 분리', '별표 1 ③', iso === 'saas' ? 'org' : 'ok', iso === 'saas' ? '공유 SaaS는 심사기관 확인이 필요합니다. 전용 배포를 권장합니다.' : '전용 배포로 구성됩니다.'),
      A('전산시스템', 's-server', self ? 'Web · DB · 동영상 · 백업 서버, 임차 계약서' : '독립 Web · DB · 동영상 · 백업, 병렬 구성', '별표 1 ③', 'org'),
      A('전산시스템', 's-backup', '1일 백업 · 5일 보관 · 3시간 복원', '별표 1 ③', 'org'),
      A('전산시스템', 's-sec', '방화벽 + Web 방화벽 또는 IPS + DB 암호화, 보안서버 100M', '별표 1 ③', 'org'),
      A('전산시스템', 's-keep', '훈련 정보 보존 · 활동 로그 원본 보관', '별표 1 ③ · 지원규정 제28조', on ? 'ok' : 'set', `정책 ${+P.retainY || 5}년 보관`),
      A('전산시스템', 's-net', '전용선 100M · 동시 50명 · DNS · 프로토콜', '별표 1 ③', 'org'),
      A('전산시스템', 's-site', '원격훈련 전용 홈페이지 · 3개 모듈', '별표 1 ③', S.lsite && S.lsite.pub ? 'ok' : 'set', '학습자 사이트를 게시합니다.'),
      A('전산시스템', 's-help', 'HelpDesk · 사이트 모니터링', '별표 1 ③', 'org')
    ];
    if (!self) R.push(
      A('전산시스템', 's-ups', 'UPS 30KVA · 30분(클라우드 · IDC 동일)', '별표 1 ③', 'org', '클라우드 사업자 증빙 인정 여부를 심사기관에 확인합니다.'),
      A('전산시스템', 's-dbms', 'DBMS 동시접속 권한 20개 이상', '별표 1 ③', 'org'),
      A('시설 · 인력', 'f-room', '전용면적 66㎡ 이상 사무실', '별표 1 ⑤', 'org'),
      A('시설 · 인력', 'f-admin', '시스템 관리자 1명 이상', '별표 1 ⑤', 'org'),
      A('시설 · 인력', 'f-staff', '상시 근로자 4명 이상(고용보험 가입)', '별표 1 ⑤', 'org'),
      A('시설 · 인력', 'f-teacher', '교사 1인당 월평균 훈련생 500명 이내', '별표 1 ①', 'org'),
      A('내일배움카드', 'n-att', '출결관리시스템 · 비대면 QR 출결', '내일배움 제34조', 'ok', '실제 출결 단말 연계는 별도입니다.'),
      A('내일배움카드', 'n-late', '지각 · 조퇴 · 외출 3회 = 결석 1일', '내일배움 제34조', 'ok'),
      A('내일배움카드', 'n-req', '출석입력 요청대장', '내일배움 제34조', 'ok'),
      A('내일배움카드', 'n-bio', '지문 사용 서면 동의 기록', '내일배움 제34조', 'ok'),
      A('내일배움카드', 'n-hrd', 'HRD-Net 실시신고 · 명단 · 수료 보고', '내일배움 제32조 · 제38조', 'link', '현재는 보고 파일을 내려받아 입력합니다.'));
    return R;
  }
  const reqStat = r => { const e = cplP() && S.cpl.ev[r.id]; return e && e.done && ['org', 'link'].includes(r.st) ? 'done' : r.st; };

  /* ── 화면 ── */
  function viewCheck() {
    const L = reqList(); const cnt = k => L.filter(r => reqStat(r) === k).length; const G = [...new Set(L.map(r => r.group))]; const P = cplP();
    const okN = cnt('ok') + cnt('done');
    return `<div class="kpis">${kpi('요건', L.length, '이 프로필 기준')}${kpi('충족 · 증빙', okN, Math.round(okN / Math.max(1, L.length) * 100) + '%', 'g')}${kpi('설정 필요', cnt('set'), '이 화면에서 처리', cnt('set') ? 'r' : '')}${kpi('연동 · 기관 준비', cnt('link') + cnt('org'), '외부 절차 필요')}</div>
      <div class="warn">이 점검표는 공개 규정 기준의 자체 점검입니다. 인가 · 심사 통과를 보장하지 않으며, 심사 기준 원문과 연동 규격은 심사기관 · 공단에서 확인해야 합니다.</div>
      <div class="bar2"><button class="btn" data-act="cpl-csv">${ic('book', 16)} 점검표 내려받기</button><button class="btn" data-act="cpl-html">심사 준비 보고서</button><span class="mini">${esc(PROFILES[P.profile].n)} · ${P.on ? '적용 중' : '꺼짐'}</span></div>` +
      G.map(g => `<div class="card"><div class="ch"><b>${esc(g)}</b></div>${table(['요건', '근거', '상태', '증빙 · 메모'], L.filter(r => r.group === g).map(r => { const st = reqStat(r); const e = S.cpl.ev[r.id] || {}; return [esc(r.label) + (r.note ? `<br><small class="mini">${esc(r.note)}</small>` : ''), `<small>${esc(r.basis)}</small>`, statTag(st), ['org', 'link'].includes(r.st) ? `<label class="ckl"><input type="checkbox" data-chg="cpl-ev" data-v="${r.id}" ${e.done ? 'checked' : ''} aria-label="${esc(r.label)} 증빙 완료"> 완료</label><input class="cpl-note" data-chg="cpl-evn" data-v="${r.id}" value="${esc(e.note || '')}" maxlength="200" placeholder="증빙 위치" aria-label="${esc(r.label)} 증빙 위치">` : '<span class="mini">시스템 확인</span>']; }))}</div>`).join('');
  }
  function viewRule() {
    const P = cplP(); const sw = (k, l, s) => `<label class="ckl"><input type="checkbox" data-chg="cpl-set" data-k="${k}" ${k.split('.').reduce((o, x) => o && o[x], P) ? 'checked' : ''}> <b>${l}</b> <small class="mini">${s}</small></label>`;
    const num = (k, l, min, max, u) => `<label>${l}<input type="number" min="${min}" max="${max}" data-chg="cpl-set" data-k="${k}" value="${esc(P[k] ?? '')}"> <small class="mini">${u}</small></label>`;
    const off = P.profile === 'moel-entrust' || P.profile === 'moel-self';
    return `<div class="card"><div class="ch"><b>적용 프로필</b><small>유형 추천값으로 시작하고 기관 사업에 맞게 고릅니다</small></div>
      <div class="drmods">${Object.entries(PROFILES).map(([k, v]) => `<button class="btn ${P.profile === k ? 'pri' : ''}" data-act="cpl-profile" data-v="${k}">${esc(v.n)}</button>`).join(' ')}</div><p class="mini">${esc(PROFILES[P.profile].s)}</p>
      ${sw('on', '규정 적용', '켜면 학습자 화면과 서버에 규칙이 적용됩니다. 게시해야 학습자에게 반영됩니다.')}</div>` +
      (off ? `<div class="card"><div class="ch"><b>학습 규칙</b><small>규정 하한은 화면에서 낮출 수 없습니다</small></div><div class="form2">${num('dayMax', '1일 최대 학습시간', 1, 8, '시간 이하')}${num('itemMin', '차시 진도 인정', 50, 100, '% 이상')}${num('rate', '수료 진도율', 80, 100, '% 이상')}${num('pass', '평가 통과 점수', 0, 100, '점(내일배움 기본 60)')}${num('bank', '문제은행 배수', 3, 10, '배 이상')}${num('fbDays', '첨삭 기한', 1, 30, '일(기관 기준)')}${num('copyThr', '베낀 답안 유사도', 50, 100, '% 이상(기관 기준)')}${num('retainY', '자료 보관', 3, 10, '년')}</div></div>
      <div class="card"><div class="ch"><b>본인확인 · 평가</b></div>${sw('single', '동일 ID 동시접속 방지', '새 로그인이 이전 세션을 끊습니다.')}${sw('idv.phone', '휴대폰 본인확인', '입과 시 최초 1회. 제공사 연동 전에는 안내만 합니다.')}${sw('idv.motp', '평가 전 일회용 비밀번호', '공단 규격 연동 전에는 안내만 합니다.')}${sw('surveyFirst', '수강평 후 평가 응시', '수강평을 입력해야 시험을 볼 수 있습니다.')}${sw('monthEval', '월 1회 이상 평가 점검', '평가가 없는 달을 보고 탭에 표시합니다.')}</div>` : `<div class="card"><div class="ch"><b>원격평생교육시설</b></div><p class="mini">신고 기준에는 진도 · 본인확인 규칙이 없어 학습 규칙을 강제하지 않습니다. 학점은행제 평가인정은 별도 제도이므로 현행 기준 확인 후 적용합니다.</p></div>`);
  }
  function viewItems() {
    const P = cplP(); const cl = S.classes.filter(c => c.status !== '종료');
    return cl.map(c => { const V = videoItems(c), E = evalItems(c); return `<div class="card"><div class="ch"><b>${esc(c.name)}</b><small>차시 ${V.length} · 평가 ${E.length}</small></div>
      ${V.length ? table(['차시', '인정 학습시간(분)', '진도 인정 기준'], V.slice(0, 40).map(i => [esc(i.title), `<input type="number" min="1" max="600" class="cpl-n" data-chg="cpl-item" data-c="${c.id}" data-i="${i.id}" data-k="cplMin" value="${Math.round(recSecs(i) / 60)}" aria-label="${esc(i.title)} 인정 학습시간">`, `${Math.ceil(recSecs(i) / 60 * (+P.itemMin || 0) / 100)}분 이상`])) : ''}
      ${E.length ? table(['평가', '보유 문항', '출제 수', '문제은행', '시간 제한'], E.map(i => { const q = (i.qs || []).length, n = +i.cplN || 0; return [esc(i.title), q, `<input type="number" min="1" max="${Math.max(1, q)}" class="cpl-n" data-chg="cpl-item" data-c="${c.id}" data-i="${i.id}" data-k="cplN" value="${n || ''}" placeholder="전체" aria-label="${esc(i.title)} 출제 수">`, n && q >= n * (+P.bank || 3) ? tag(`${Math.floor(q / n)}배수`, 'g') : tag(`${+P.bank || 3}배수 필요`, 'r'), +i.time > 0 ? tag(i.time + '분', 'g') : tag('미설정', 'r')]; })) : '<p class="mini">평가 항목이 없습니다.</p>'}</div>`; }).join('') || '<div class="empty">운영 중인 과정이 없습니다.</div>';
  }
  function monRows() { const SUM = S.cpl.sum; const live = UIcpl.live; const get = sid => (live ? live.find(x => x.sid === sid) : SUM[sid]) || {}; return S.classes.filter(c => c.status !== '종료').flatMap(c => (c.learners || []).map(id => { const sid = sidOf(id), r = get(sid), g = (c.prog || {})[id] || {}; return { c, id, sid, p: Math.round(+g.p || 0), secs: +r.secs || 0, today: +r.today || 0, ips: +r.ips || 0, last: r.last || '', verified: +r.verified || 0 }; })); }
  const UIcpl = { live: null, loading: false };
  function viewMon() {
    if (LIVEON() && !UIcpl.live && !UIcpl.loading) { UIcpl.loading = true; api('GET', '/api/cpl/summary').then(x => { UIcpl.live = x.rows || []; UIcpl.loading = false; render(); }).catch(e => { UIcpl.loading = false; toast(e.message || '활동 기록을 불러오지 못했습니다.', 'bad'); }); }
    const P = cplP(); const Rw = monRows(); const low = Rw.filter(r => r.p < (+P.rate || 80)); const multi = Rw.filter(r => r.ips > 1);
    return `<div class="kpis">${kpi('훈련생', new Set(Rw.map(r => r.sid)).size)}${kpi('수료 기준 미달', low.length, `진도 ${+P.rate || 80}% 미만`, low.length ? 'r' : '')}${kpi('여러 IP 접속', multi.length, '확인 대상', multi.length ? 'y' : '')}</div>
      <div class="warn">공단 자동모니터링시스템 전송은 규격 확보 후 연결합니다. 아래 데이터는 기관 DB 원본이며 전송 규격에 맞게 변환할 수 있습니다.</div>
      <div class="bar2"><button class="btn sm" data-act="cpl-mon-csv">모니터링 데이터 내려받기</button><button class="btn sm ai" data-act="cpl-nudge">미달 훈련생 독려 초안 만들기</button></div>
      <div class="card">${table(['훈련생', '과정', '진도', '누적 학습', '오늘', 'IP 수', '최근 활동', '본인확인'], Rw.slice(0, 200).map(r => [esc(r.sid), esc(r.c.name), r.p < (+P.rate || 80) ? tag(r.p + '%', 'r') : pct(r.p), hoursOf(r.secs), hoursOf(r.today), r.ips > 1 ? tag(r.ips + '개', 'y') : String(r.ips || '—'), esc(String(r.last || '—').slice(0, 19).replace('T', ' ')), r.verified ? tag('완료', 'g') : '—']), '훈련생이 없습니다.')}</div>`;
  }
  const subText = g => { const s = g && g.sub; return s == null ? '' : typeof s === 'string' ? s : String(s.text || ''); };
  const grams = t => { const x = String(t).replace(/\s+/g, ''); const G = new Set(); for (let i = 0; i + 3 <= x.length; i++) G.add(x.slice(i, i + 3)); return G; };
  const simil = (a, b) => { const A = grams(a), B = grams(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(g => { if (B.has(g)) n++; }); return Math.round(n / (A.size + B.size - n) * 100); };
  window.cplCopyScan = c => { const thr = +cplP().copyThr || 80; const L = (c.learners || []).map(id => ({ id, t: subText((c.prog || {})[id]) })).filter(x => x.t.trim().length >= 30); const R = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const s = simil(L[i].t, L[j].t); if (s >= thr) R.push({ a: L[i].id, b: L[j].id, s }); } return R.sort((x, y) => y.s - x.s).slice(0, 50); };
  const addDays2 = (d, n) => { const t = Date.parse(d); return Number.isFinite(t) ? new Date(t + n * 864e5).toISOString().slice(0, 10) : ''; };
  function viewFb() {
    const P = cplP(); const cl = S.classes.filter(c => c.status !== '종료'); const Q = cl.flatMap(c => (c.learners || []).filter(id => { const g = (c.prog || {})[id]; return g && (subText(g) || g.assign === 'submitted'); }).map(id => ({ c, id, g: c.prog[id] })));
    const open = Q.filter(x => !x.g.fb);
    return `<div class="card"><div class="ch"><b>첨삭 일정</b><small>제출 후 ${+P.fbDays || 7}일 기준 · 미첨삭 ${open.length}건</small></div>${table(['훈련생', '과정', '제출일', '첨삭 기한', '제출 내용', '첨삭'], Q.slice(0, 60).map(x => { const due = x.g.subAt ? addDays2(String(x.g.subAt).slice(0, 10), +P.fbDays || 7) : '—'; return [esc(sidOf(x.id)), esc(x.c.name), esc(String(x.g.subAt || '—').slice(0, 10)), !x.g.fb && due !== '—' && due < today() ? tag(due, 'r') : esc(due), `<small>${esc(subText(x.g).slice(0, 80))}</small>`, `<textarea class="cpl-fb" rows="2" maxlength="1000" data-chg="cpl-fb" data-c="${x.c.id}" data-v="${x.id}" aria-label="${esc(sidOf(x.id))} 첨삭">${esc(x.g.fb || '')}</textarea>`]; }), '제출된 과제가 없습니다.')}</div>
      <div class="card"><div class="ch"><b>베낀 답안 확인</b><small>유사도 ${+P.copyThr || 80}% 이상 · 최종 판단은 운영자가 합니다</small><button class="btn sm" data-act="cpl-copy">지금 검사</button></div>${table(['과정', '훈련생 A', '훈련생 B', '유사도', '처리'], (S.cpl.copy || []).map((r, i) => [esc((C(r.c) || {}).name || ''), esc(sidOf(r.a)), esc(sidOf(r.b)), tag(r.s + '%', 'r'), r.st ? tag(r.st, r.st === '베낀 답안' ? 'r' : 'g') : `<button class="btn sm" data-act="cpl-copy-st" data-v="${i}" data-s="베낀 답안">베낀 답안</button> <button class="btn sm" data-act="cpl-copy-st" data-v="${i}" data-s="문제 없음">문제 없음</button>`]), '검사 결과가 없습니다.')}</div>`;
  }
  const attCalc = (c, id) => { const A = c.att || {}; let att = 0, late = 0, abs = 0; Object.entries(A).forEach(([k, v]) => { if (!k.startsWith(id + ':')) return; if (v === '출석') att++; else if (v === '지각' || v === '조퇴' || v === '외출') late++; else if (v === '결석') abs++; }); const tot = att + late + abs; const conv = abs + Math.floor(late / 3); return { att, late, abs, conv, rate: tot ? Math.round((tot - conv) / tot * 100) : null }; };
  window.cplAttCalc = attCalc;
  function viewAtt() {
    if (LIVEON() && !UIcpl.attAt) { UIcpl.attAt = Date.now(); api('GET', '/api/cpl/logs?limit=2000').then(x => { S.cpl.attSeen = S.cpl.attSeen || {}; let n = 0; (x.rows || []).filter(r => r.kind === 'attend' && !S.cpl.attSeen[r.id]).reverse().forEach(r => { const c0 = C(r.cls); const m = S.members.find(y => String(y.sid || y.name) === r.sid); S.cpl.attSeen[r.id] = 1; if (!c0 || !m) return; c0.att = c0.att || {}; const k = Object.keys(c0.att).filter(z => z.startsWith(m.id + ':')).length; c0.att[`${m.id}:${k}`] = '출석'; n++; }); if (n) { save(); render(); } }).catch(() => { UIcpl.attAt = 0; }); }
    const cl = S.classes.filter(c => c.status !== '종료'); const c = C(UI.cplC) || cl[0]; if (!c) return '<div class="empty">운영 중인 과정이 없습니다.</div>'; const code = S.cpl.att[c.id];
    return `<div class="bar2"><select data-chg="cpl-attc" aria-label="과정 선택">${cl.map(x => `<option value="${x.id}" ${x === c ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="btn sm" data-act="cpl-qr" data-v="${c.id}">${code ? 'QR 새로 만들기' : '비대면 QR 출결 시작'}</button>${code ? `<button class="btn sm" data-act="cpl-qr-end" data-v="${c.id}">QR 종료</button>` : ''}</div>
      ${code ? `<div class="card cpl-qr"><div id="cplQr" data-url="${esc(qrURL(c.id, code.code))}"></div><div><b>출석 코드 ${esc(code.code)}</b><p class="mini">${esc(code.at)} 발급 · 만료 ${esc(code.expS)}</p><p class="mini">훈련생이 로그인한 뒤 QR을 스캔하면 출석으로 기록합니다. 코드는 ${QR_MIN}분 뒤 만료됩니다.</p></div></div>` : ''}
      <div class="card"><div class="ch"><b>출결 환산</b><small>지각 · 조퇴 · 외출 3회 = 결석 1일</small><button class="btn sm" data-act="go" data-v="attend">출결 입력</button></div>${table(['훈련생', '출석', '지각 · 조퇴', '결석', '환산 결석', '출석률'], (c.learners || []).map(id => { const a = attCalc(c, id); return [esc(sidOf(id)), a.att, a.late, a.abs, a.conv, a.rate == null ? '—' : a.rate < 80 ? tag(a.rate + '%', 'r') : a.rate + '%']; }), '훈련생이 없습니다.')}</div>
      <div class="card"><div class="ch"><b>출석입력 요청대장</b><button class="btn sm" data-act="cpl-req-add">요청 추가</button></div>${table(['접수일', '훈련생', '훈련일', '사유', '증빙', '처리'], S.cpl.attReq.map((r, i) => [esc(r.at), esc(r.sid), esc(r.day), esc(r.why), esc(r.proof), r.st ? tag(r.st, 'g') : `<button class="btn sm" data-act="cpl-req-st" data-v="${i}">처리 완료</button>`]), '접수된 요청이 없습니다.')}</div>
      <div class="card"><div class="ch"><b>지문 사용 서면 동의</b><small>지문 인식을 쓰는 기관만 기록합니다</small></div>${table(['훈련생', '동의일', ''], (c.learners || []).slice(0, 100).map(id => { const sid = sidOf(id), d = S.cpl.consent[sid]; return [esc(sid), esc(d || '—'), `<button class="btn sm" data-act="cpl-consent" data-v="${esc(sid)}">${d ? '동의 철회' : '동의서 수령'}</button>`]; }), '훈련생이 없습니다.')}</div>`;
  }
  const QR_MIN = 15;
  const learnerBase = () => { try { return new URL(lsLearnerURL(), location.href).href.replace(/#.*$/, ''); } catch (e) { return 'learner.html'; } };
  const qrURL = (cid, code) => `${learnerBase()}#att/${encodeURIComponent(cid)}/${encodeURIComponent(code)}`;
  AFTER.push(() => { const b = document.getElementById('cplQr'); if (!b || b.firstChild) return; const paint = () => { if (typeof window.qrcode !== 'function') return; const q = window.qrcode(0, 'M'); q.addData(b.dataset.url); q.make(); b.innerHTML = q.createSvgTag({ scalable: true, margin: 2 }); const s = b.querySelector('svg'); if (s) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', '출석 QR 코드'); } }; if (typeof window.qrcode === 'function') return paint(); const t = document.createElement('script'); t.src = 'vendor/qrcode.js'; t.onload = paint; t.onerror = () => { b.textContent = '출석 코드를 사용하십시오.'; }; document.head.appendChild(t); });
  function reportRows() { const P = cplP(); const card = P.profile === 'moel-entrust'; return S.classes.filter(c => c.status !== '종료').map(c => { const st = c.start || ''; const en = c.end || ''; return { c, notify: st ? addDays2(st, -1) : '', finish: en ? addDays2(en, card ? 10 : 30) : '', evals: evalItems(c).length, done: (c.learners || []).filter(id => cplDone(c, id)).length, n: (c.learners || []).length }; }); }
  function cplDone(c, id) { const P = cplP(); const g = (c.prog || {})[id] || {}; return (+g.p || 0) >= (+P.rate || 80) && (!evalItems(c).length || g.exam == null || +g.exam >= (+P.pass || 0)); }
  window.cplDone = cplDone;
  function viewRep() {
    const P = cplP(); const R = reportRows(); const d0 = today(); const soon = d => d && d >= d0 && d <= addDays2(d0, 7);
    return `<div class="warn">HRD-Net 실제 전송은 고용노동부 · 공단 연계 승인 후 사용합니다. 지금은 보고 파일을 내려받아 입력합니다.</div><div class="bar2"><button class="btn sm" data-act="cpl-rep-csv">수료 보고 파일 내려받기</button><button class="btn sm" data-act="go" data-v="hrd">HRD-Net 보고 화면</button></div>
      <div class="card"><div class="ch"><b>보고 기한</b><small>${P.profile === 'moel-entrust' ? '실시신고 = 개시 전일, 수료 보고 = 종료 후 10일' : '수료 보고 = 종료 후 30일'}</small></div>${table(['과정', ...(P.profile === 'moel-entrust' ? ['실시신고 · 명단'] : []), '수료 보고', '수료 예상', '평가'], R.map(r => [esc(r.c.name), ...(P.profile === 'moel-entrust' ? [soon(r.notify) ? tag(r.notify, 'y') : esc(r.notify || '일정 없음')] : []), soon(r.finish) ? tag(r.finish, 'y') : esc(r.finish || '일정 없음'), `${r.done}/${r.n}명`, r.evals ? r.evals + '개' : tag(P.monthEval ? '평가 없음' : '—', P.monthEval ? 'r' : '')]), '운영 중인 과정이 없습니다.')}</div>`;
  }
  /* 평생교육원 */
  function viewFile() {
    const has = t => (S.docs || []).find(d => d.tpl === t); const F = [['cpl-rule', '운영규칙 초안'], ['cpl-fac', '시설 · 설비 현황표 초안']];
    return `<div class="card"><div class="ch"><b>초안 문서</b><small>기관 사실에 맞게 수정한 뒤 제출합니다</small></div>${F.map(([id, n]) => `<div class="row"><span>${esc(n)} ${has(id) ? tag('작성됨', 'g') : ''}</span><button class="btn sm" data-act="cpl-doc" data-v="${id}">${has(id) ? '다시 만들기' : '초안 만들기'}</button></div>`).join('')}<div class="row"><span class="mini">만든 문서는 표준 문서함에서 편집 · 내려받습니다.</span><button class="btn sm" data-act="go" data-v="docs">표준 문서함</button></div></div>
      <div class="card"><div class="ch"><b>신고 절차</b></div><ol class="cpl-ol"><li>주된 서버가 있는 사무실 기준으로 관할 교육청을 확인합니다.</li><li>신고서(별지 제14호)와 첨부 서류를 제출합니다. 처리기간은 10일입니다.</li><li>명칭 · 위치 · 교육과정 · 학습비 · 시설설비 · 평생교육사가 바뀌면 변경신고합니다.</li></ol><p class="mini">첨부 서류 상태는 점검표 탭에서 관리합니다. 지역별 요구 서류는 관할 교육청에 확인합니다.</p></div>`;
  }
  window.cplRefund = (fee, total, done) => { const f = Math.max(0, Math.floor(+fee || 0)), t = Math.max(0, Math.floor(+total || 0)), d = Math.max(0, Math.floor(+done || 0)); if (!t) return 0; return Math.floor(f * Math.max(0, t - Math.min(d, t)) / t); };
  function viewRefund() { const U = UI.cplR || { fee: '', total: '', done: '' }; const v = cplRefund(U.fee, U.total, U.done); return `<div class="card"><div class="ch"><b>학습비 반환 계산</b><small>실시간이 아닌 원격 학습 기준</small></div><div class="form2"><label>납부 학습비(원)<input type="number" min="0" data-chg="cpl-rf" data-k="fee" value="${esc(U.fee)}"></label><label>총 회차<input type="number" min="0" data-chg="cpl-rf" data-k="total" value="${esc(U.total)}"></label><label>실제 학습 회차<input type="number" min="0" data-chg="cpl-rf" data-k="done" value="${esc(U.done)}"></label></div><p class="cpl-big">반환 예상 금액 <b id="cplRf">${v.toLocaleString('ko-KR')}원</b></p><p class="mini">실제 학습한 회차를 제외한 금액으로 계산하며, 사유 발생일부터 5일 이내에 반환합니다. 약관 · 수수료 · 시행령 별표 3의 세부 기준을 함께 확인하십시오.</p></div>`; }

  VIEWS.cpl = () => { cplEnsure(); const P = cplP(); const T = P.profile === 'lifelong' ? [['check', '점검표'], ['rule', '적용 규칙'], ['file', '신고 서류'], ['refund', '학습비 반환']] : [['check', '점검표'], ['rule', '적용 규칙'], ['item', '차시 · 평가'], ['mon', '모니터링'], ['fb', '첨삭 · 베낀 답안'], ['att', '출결'], ['rep', '보고']]; let cur = UI.cpl; if (!T.some(x => x[0] === cur)) cur = 'check';
    const B = { check: viewCheck, rule: viewRule, item: viewItems, mon: viewMon, fb: viewFb, att: viewAtt, rep: viewRep, file: viewFile, refund: viewRefund }[cur]; return head('', '고용노동부 원격훈련 · 원격평생교육시설 요건을 점검하고 운영합니다.') + tabs('cpl', T, cur) + B(); };

  /* ── 동작 ── */
  const clamp = (k, v) => { const P = cplP(); const n = +v; if (!MOEL()) return n; const R = { dayMax: [1, 8], itemMin: [50, 100], rate: [80, 100], bank: [3, 10], retainY: [3, 10], pass: [0, 100], fbDays: [1, 30], copyThr: [50, 100] }[k]; return R ? Math.min(R[1], Math.max(R[0], n || R[0])) : n; };
  ACT['cpl-set'] = el => { const P = cplP(); const k = el.dataset.k; const v = el.type === 'checkbox' ? el.checked : clamp(k, el.value); if (k.includes('.')) { const [a, b] = k.split('.'); P[a] = P[a] || {}; P[a][b] = v; } else P[k] = v; logAudit(`규정 준수 설정 변경: ${k}`); save(); render(); toast('저장했습니다. 학습자 반영은 게시 후 적용됩니다.', 'ok'); };
  ACT['cpl-profile'] = el => { const P = cplP(); const k = el.dataset.v; if (!PROFILES[k] || P.profile === k) return; Object.assign(P, JSON.parse(JSON.stringify(DEF[k])), { profile: k }); UI.cpl = 'rule'; logAudit(`규정 준수 프로필 변경: ${PROFILES[k].n}`); save(); render(); toast('프로필 기본값을 적용했습니다.', 'ok'); };
  ACT['cpl-ev'] = el => { const id = el.dataset.v; const e = S.cpl.ev[id] = S.cpl.ev[id] || {}; e.done = el.checked; e.at = today(); e.by = S.me.name; logAudit(`규정 준수 증빙 ${el.checked ? '완료' : '해제'}: ${id}`); save(); render(); };
  ACT['cpl-evn'] = el => { const id = el.dataset.v; const e = S.cpl.ev[id] = S.cpl.ev[id] || {}; e.note = String(el.value).slice(0, 200); save(); };
  ACT['cpl-item'] = el => { const c = C(el.dataset.c); const it = c && (c.curriculum || []).find(x => x.id === el.dataset.i); if (!it) return; const v = Math.max(0, Math.floor(+el.value || 0)); if (v) it[el.dataset.k] = v; else delete it[el.dataset.k]; save(); render(); };
  ACT['cpl-attc'] = el => { UI.cplC = el.value; render(); };
  ACT['cpl-fb'] = el => { const c = C(el.dataset.c); const g = c && c.prog && c.prog[el.dataset.v]; if (!g) return; g.fb = String(el.value).slice(0, 1000); g.fbAt = today(); logAudit(`첨삭 저장: ${sidOf(el.dataset.v)}`); save(); toast('첨삭을 저장했습니다.', 'ok'); };
  ACT['cpl-copy'] = () => { const R = S.classes.flatMap(c => cplCopyScan(c).map(r => ({ ...r, c: c.id }))); const old = S.cpl.copy || []; S.cpl.copy = R.map(r => { const p = old.find(o => o.c === r.c && o.a === r.a && o.b === r.b); return p ? { ...r, st: p.st } : r; }); logAudit(`베낀 답안 검사: ${R.length}건`); save(); render(); toast(R.length ? `유사 답안 ${R.length}건을 찾았습니다.` : '기준 이상의 유사 답안이 없습니다.', R.length ? 'warn' : 'ok'); };
  ACT['cpl-copy-st'] = el => { const r = S.cpl.copy[+el.dataset.v]; if (!r) return; r.st = el.dataset.s; logAudit(`베낀 답안 판정: ${sidOf(r.a)} · ${sidOf(r.b)} → ${r.st}`); save(); render(); };
  const rcode = () => { const b = new Uint8Array(6); crypto.getRandomValues(b); return Array.from(b, x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join(''); };
  ACT['cpl-qr'] = el => { const code = rcode(); const exp = Date.now() + QR_MIN * 6e4; S.cpl.att[el.dataset.v] = { code, exp, at: nowStr(), expS: new Date(exp).toLocaleTimeString('ko-KR', { hour12: false }) }; const P = cplP(); P.attend = { cls: el.dataset.v, code, exp }; logAudit('비대면 QR 출결 시작'); save(); render(); };
  ACT['cpl-qr-end'] = el => { delete S.cpl.att[el.dataset.v]; const P = cplP(); if (P.attend && P.attend.cls === el.dataset.v) delete P.attend; save(); render(); };
  ACT['cpl-req-add'] = () => modal('출석입력 요청 추가', `<div class="form2"><label>훈련생<input id="cplR1" maxlength="30"></label><label>훈련일<input id="cplR2" type="date" value="${today()}"></label><label>사유<input id="cplR3" maxlength="100"></label><label>증빙<input id="cplR4" maxlength="100"></label></div>`, [{ id: 'cancel', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: () => { const v = id => (document.getElementById(id) || {}).value || ''; if (!v('cplR1').trim() || !v('cplR3').trim()) { toast('훈련생과 사유를 입력하세요.', 'warn'); return false; } S.cpl.attReq.unshift({ at: today(), sid: v('cplR1').trim(), day: v('cplR2'), why: v('cplR3').trim(), proof: v('cplR4').trim() }); logAudit('출석입력 요청 접수'); save(); render(); } }]);
  ACT['cpl-req-st'] = el => { const r = S.cpl.attReq[+el.dataset.v]; if (r) { r.st = '처리 완료'; save(); render(); } };
  ACT['cpl-consent'] = el => { const k = el.dataset.v; if (S.cpl.consent[k]) delete S.cpl.consent[k]; else S.cpl.consent[k] = today(); logAudit('지문 사용 동의 기록 변경'); save(); render(); };
  ACT['cpl-nudge'] = () => { const P = cplP(); const low = monRows().filter(r => r.p < (+P.rate || 80)); if (!low.length) { toast('기준 미달 훈련생이 없습니다.', 'ok'); return; } S.msgs = S.msgs || []; S.msgs.unshift({ id: uid('msg'), at: nowStr(), to: `진도 미달 훈련생 ${low.length}명`, ch: '초안 — 발송 전', n: 0, title: '학습 진도 안내', body: `수료 진도율 ${+P.rate || 80}% 달성을 위해 남은 차시를 학습해 주시기 바랍니다.` }); logAudit('학습 독려 초안 작성'); save(); toast(`${low.length}명 대상 독려 초안을 메시지함에 만들었습니다. 발송 전 확인하세요.`, 'ok'); };
  ACT['cpl-doc'] = el => { const id = el.dataset.v; const org = S.org.name; const tp = { 'cpl-rule': ['운영규칙 초안', `# ${org} 운영규칙(초안)\n\n## 제1조 목적\n이 규칙은 ${org} 원격평생교육시설의 운영에 필요한 사항을 정합니다.\n\n## 제2조 교육과정\n- 교육과정 · 기간 · 시간 · 인원:\n- 학습 방법: 정보통신매체를 이용한 원격교육\n\n## 제3조 학습비\n- 학습비:\n- 반환: 사유 발생일부터 5일 이내, 관계 법령 기준에 따릅니다.\n\n## 제4조 인력\n- 평생교육사:\n- 운영 책임자:\n\n## 제5조 개인정보\n- 수집 항목 · 보유 기간:\n\n## 제6조 시행\n- 시행일:`], 'cpl-fac': ['시설 · 설비 현황표 초안', `# ${org} 시설 · 설비 현황표(초안)\n\n## 시설\n| 구분 | 위치 | 면적(㎡) | 용도 |\n| 사무실 |  |  |  |\n\n## 설비\n| 구분 | 내용 | 수량 | 비고 |\n| 서버 | 웹 · DB · 동영상 |  | 자체 · 임차 구분 |\n| 네트워크 |  |  |  |\n| 학습관리시스템 | 디디쌤 |  | 계약서 첨부 |\n| 백업 |  |  |  |`] }[id]; if (!tp) return; S.docs = (S.docs || []).filter(d => d.tpl !== id); S.docs.unshift({ id: uid('dc'), tpl: id, name: tp[0], cat: '공문 · 행정', body: tp[1], src: 'tpl', cls: '', vis: '내부', at: today(), vers: [], sent: [] }); logAudit(`신고 문서 초안 생성: ${tp[0]}`); save(); render(); toast(`${tp[0]}을(를) 표준 문서함에 만들었습니다.`, 'ok'); };
  ACT['cpl-rf'] = el => { UI.cplR = UI.cplR || { fee: '', total: '', done: '' }; UI.cplR[el.dataset.k] = el.value; const o = document.getElementById('cplRf'); if (o) o.textContent = cplRefund(UI.cplR.fee, UI.cplR.total, UI.cplR.done).toLocaleString('ko-KR') + '원'; };
  ACT['cpl-csv'] = () => { const L = reqList(); downloadCSV(`규정준수_점검표_${today()}.csv`, ['구분', '요건', '근거', '상태', '증빙 위치', '메모'], L.map(r => [r.group, r.label, r.basis, ({ ok: '충족', set: '설정 필요', link: '연동 대기', org: '기관 준비', done: '증빙 완료' })[reqStat(r)], (S.cpl.ev[r.id] || {}).note || '', r.note])); };
  ACT['cpl-mon-csv'] = () => downloadCSV(`훈련생_모니터링_${today()}.csv`, ['훈련생', '과정', '진도율', '누적 학습(초)', '오늘 학습(초)', 'IP 수', '최근 활동', '본인확인 수'], monRows().map(r => [r.sid, r.c.name, r.p, r.secs, r.today, r.ips, r.last, r.verified]));
  ACT['cpl-rep-csv'] = () => downloadCSV(`수료보고_${today()}.csv`, ['훈련과정', '훈련생', '진도율', '평가 점수', '수료 여부'], S.classes.filter(c => c.status !== '종료').flatMap(c => (c.learners || []).map(id => { const g = (c.prog || {})[id] || {}; return [c.name, sidOf(id), Math.round(+g.p || 0), g.exam ?? '', cplDone(c, id) ? '수료' : '미수료']; })));
  ACT['cpl-html'] = () => { const L = reqList(); const P = cplP(); const rows = L.map(r => `<tr><td>${esc(r.group)}</td><td>${esc(r.label)}</td><td>${esc(r.basis)}</td><td>${esc(({ ok: '충족', set: '설정 필요', link: '연동 대기', org: '기관 준비', done: '증빙 완료' })[reqStat(r)])}</td><td>${esc((S.cpl.ev[r.id] || {}).note || r.note || '')}</td></tr>`).join(''); const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>심사 준비 보고서</title><style>body{font:14px/1.5 sans-serif;margin:32px;color:#222}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f4f6}</style><h1>${esc(S.org.name)} 심사 준비 보고서</h1><p>${esc(PROFILES[P.profile].n)} · 작성일 ${today()} · 자체 점검 자료이며 인가 · 심사 통과를 보장하지 않습니다.</p><table><thead><tr><th>구분</th><th>요건</th><th>근거</th><th>상태</th><th>증빙 · 메모</th></tr></thead><tbody>${rows}</tbody></table></html>`; const u = URL.createObjectURL(new Blob([html], { type: 'text/html' })); const a = document.createElement('a'); a.href = u; a.download = `심사준비보고서_${today()}.html`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); };

  /* ── 학습자 이벤트(데모). 운영은 서버 cpl_log가 원본 ── */
  const lsum = sid => { cplEnsure(); const r = S.cpl.sum[sid] = S.cpl.sum[sid] || { sid, secs: 0, today: 0, day: '', ips: 1, last: '', verified: 0 }; if (r.day !== today()) { r.day = today(); r.today = 0; } return r; };
  LPX['cpl-beat'] = x => { const d = x.data || {}; const s = Math.min(600, Math.max(0, +d.secs || 0)); const r = lsum(x.who); r.secs += s; r.today += s; r.last = x.at; };
  LPX['cpl-login'] = x => { lsum(x.who).last = x.at; };
  LPX['cpl-verify'] = x => { const r = lsum(x.who); r.verified++; r.last = x.at; };
  LPX['cpl-review'] = () => { };
  LPX['cpl-att'] = x => { const d = x.data || {}; const c = C(d.cls); const q = S.cpl.att[d.cls]; if (!c || !q || q.code !== d.code || q.exp < Date.parse(x.at)) return; const m = S.members.find(y => String(y.sid || y.name) === x.who); if (!m) return; q.seen = q.seen || {}; if (q.seen[m.id]) return; q.seen[m.id] = 1; c.att = c.att || {}; const n = Object.keys(c.att).filter(k => k.startsWith(m.id + ':')).length; c.att[`${m.id}:${n}`] = '출석'; logAudit(`QR 출석: ${x.who}`); };
  /* 대화: 조회 */
  { const base = answer; answer = (q, ...r) => { if (/(인가|규정 준수|점검표|심사 준비)/.test(q) && !/(만들|발송|보내)/.test(q) && S.org.cpl) { const L = reqList(); const n = L.filter(x => reqStat(x) === 'set').length; return { text: `${PROFILES[cplP().profile].n} 기준 요건 ${L.length}개 중 설정이 필요한 항목은 ${n}개입니다. 점검표에서 확인할 수 있습니다.`, go: 'cpl' }; } return base(q, ...r); }; }
})();
