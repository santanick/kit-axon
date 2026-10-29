/* 디디쌤 스튜디오 — 기능 모듈 (디디쌤 가이드 기능 전체 + 유형 전용 모듈) */
'use strict';
const M = id => S.members.find(m => m.id === id);
const mn = id => esc(M(id)?.name || '—');
const gn = id => esc(S.groups.find(g => g.id === id)?.name || '—');
const C = id => S.classes.find(c => c.id === id);
const KIND = { period: '기간', episode: '회차', sub: '구독' };
const ITEM = { video: '동영상 강의', live: '라이브 강의', offline: '오프라인 강의', quiz: '퀴즈', exam: '시험', assign: '과제', survey: '설문', chapter: '챕터' };
const avgP = c => { const v = Object.values(c.prog); return v.length ? v.reduce((a, b) => a + b.p, 0) / v.length : 0; };
const doneN = c => Object.values(c.prog).filter(p => p.p >= c.criteria.threshold).length;
const pend = () => S.classes.flatMap(c => Object.entries(c.prog).filter(([, p]) => p.assign === 'submitted').map(([id]) => ({ c, id })));
const owner = () => S.me.role === 'owner';

/* ═════════ 홈 대시보드 ═════════ */
const ONB = {
  k12: [['site', '홈페이지 준비', '기본 설정 · 상담 연동 · 운영자'], ['members', '원생 · 반 등록', '초대 · 일괄 초대 · 반 · 보호자 연결'], ['class', '교육 준비', '회차(요일반) · 온라인 보강 · 교재'], ['billing', '청구서 보내기', '토스 PG · 청구서 · 납부 관리'], ['attend', '운영 · 관리', '출결패드 · 평가 · 메시지']],
  adult: [['site', '홈페이지 준비', 'AI 빌더 · 상담 연동'], ['class', '교육 준비', '기간 강좌 · 교재/전자책 · 영상 라이브러리'], ['settings', '수강생 모집', '사전 수강신청 · 팝업 · SEO'], ['sales', '매출 관리', 'PG 선택 · 결제 · 환불'], ['assess', '운영 · 관리', '평가 · 커뮤니티 · 후기']],
  corp: [['site', '사내 교육포털 준비', '초대 전용형 · 추가정보(부서·직급)'], ['class', '교육과정 준비', '직무 · 법정의무교육'], ['members', '임직원 · 부서 등록', '일괄 초대 · 부서 단위 수강권한'], ['compliance', '이수 관리', '법정교육 이수율 · 미이수 독려'], ['cert', '수료증 · 증빙', '수료증 자동 발급 · 보고서']],
  univ: [['site', '학습 포털 준비', '공개형/프라이빗형 · 추가정보(학번·학과)'], ['class', '교과목 준비', '온라인 · 오프라인 · 영상 라이브러리'], ['members', '학생 등록', '일괄 등록 · 학과 · SSO 연계'], ['assess', '운영 · 평가', '평가 · 채점 · 위험군 관리'], ['badge', '이수 · 배지', '수료 기준 · 디지털 배지']],
  lifelong: [['site', '홈페이지 준비', '공개형 · 약관 · 통신판매업 표시'], ['lifelong', '강좌 개설 · 신고', '30시간 이상 · 10명 이상 과정'], ['members', '학습자 모집', '사전 수강신청 · 팝업'], ['sales', '학습비 · 매출', 'PG · 학습비 반환 5일 이내'], ['cert', '운영 · 수료', '출결 · 평가 · 수료증']],
  voc: [['site', '훈련기관 홈페이지', '과정 안내 · 모집'], ['class', '훈련과정 준비', '진도 · 평가 계획'], ['members', '훈련생 등록', '훈련생 구분 · 훈련반'], ['attend', '출결 · 평가', '출석률 80% 관리 · 평가'], ['hrd', 'HRD-Net 보고', '등록 · 진도 · 평가 · 수료 보고']]
};
function onbDone(id) {
  return { site: !!S.site?.published, members: S.members.length > 0, class: S.classes.length > 0, billing: S.bills.some(b => b.sent), sales: S.settings.pg !== 'none', settings: S.settings.popups.length > 0 || !!S.settings.seo.title, attend: !!S.attLog, assess: pend().length === 0, compliance: !!S.nudged, cert: S.certs.length > 0, badge: S.badges.some(b => b.issued.length), lifelong: !!S.llChecked, hrd: (S.hrd?.reports || []).length > 0 }[id];
}
VIEWS.dash = () => {
  const ty = TYPES[S.org.type]; const act = S.classes.filter(c => c.status === '운영중');
  const avg = act.length ? act.reduce((a, c) => a + avgP(c), 0) / act.length : 0;
  const rev = S.pays.filter(p => p.status === '결제 완료' && p.at >= addDays(today(), -30)).reduce((a, p) => a + p.amount, 0) + S.bills.filter(b => b.status !== '미납').reduce((a, b) => a + b.items.reduce((x, i) => x + i[1], 0), 0);
  const unans = S.posts.filter(p => p.kind === '질문' && !p.replies).length, grade = pend().length, refund = S.pays.filter(p => p.status === '환불 신청').length, wait = S.members.filter(m => m.grade === '승인 대기').length, unpaid = S.bills.filter(b => b.status === '미납').length;
  const away = d => S.members.filter(m => m.last <= addDays(today(), -d)).length;
  const steps = ONB[S.org.type]; const dn = steps.filter(s => onbDone(s[0])).length;
  const todo = [['미답변 질문', unans, 'community'], ['채점 대기 과제', grade, 'assess'], ['환불 신청', refund, 'sales'], ['가입 승인 대기', wait, 'members'], ...(S.org.type === 'k12' ? [['미납 청구서', unpaid, 'billing']] : []), ...(S.org.type === 'voc' ? [['출석률 80% 미달', lowAtt().length, 'attend']] : []), ...(S.org.type === 'corp' ? [['법정교육 미이수', legalUndone().length, 'compliance']] : [])];
  const trend = [62, 66, 64, 71, 74, Math.round(avg)];
  return head(`${S.org.name} 운영 현황`, `${ty.icon} ${esc(ty.name)} 유형 · ${today()} · <a href="#" data-act="go" data-v="settings">메뉴 구성 변경</a>`, `<button class="btn" data-act="dash-xls">엑셀 내려받기</button><button class="btn pri" data-act="cmd">✦ AI SAM 업무 지시</button>`) +
    `<section class="grid g4">${kpi(t('learner'), S.members.length + '명', `신규 7일 ${S.members.filter(m => m.joined >= addDays(today(), -7)).length}명`)}${kpi('운영 중 ' + t('cls'), act.length + '개', `준비 중 ${S.classes.length - act.length}개`)}${kpi('평균 ' + t('done') + '율', pct(avg), '수료 기준 충족 비율', 'g')}${['corp', 'univ'].includes(S.org.type) ? kpi('자동화 처리', S.runs.length + '건', '이번 달 AI SAM 실행') : kpi('최근 30일 매출', won(rev), 'PG 결제 + 청구서')}</section>
    <section class="grid g2">
      <div class="card"><div class="ch"><b>오늘의 할 일</b><small>클릭하면 해당 메뉴로 이동합니다</small></div><div class="todo">${todo.map(([l, n, id]) => `<button class="td ${n ? 'hot' : ''}" data-act="go" data-v="${id}" ${menuOn(id) ? '' : 'disabled title="꺼진 메뉴"'}><b>${n}</b><span>${esc(l)}</span></button>`).join('')}</div>
        <div class="aiwhy">✦ <b>AI SAM 제안</b> — ${aiSuggest(unans, grade, wait)}</div></div>
      <div class="card"><div class="ch"><b>${esc(ty.name)} 세팅 가이드</b><small>${dn}/${steps.length} 완료</small></div>${bar(dn / steps.length * 100, 'g')}
        <ol class="onb">${steps.map(([id, l, d], i) => `<li class="${onbDone(id) ? 'ok' : ''}"><span>${onbDone(id) ? '✓' : i + 1}</span><div><b>${esc(l)}</b><small>${esc(d)}</small></div><button class="btn sm ghost" data-act="go" data-v="${id}" ${menuOn(id) ? '' : 'disabled'}>열기</button></li>`).join('')}</ol></div>
    </section>
    <section class="grid g3">
      <div class="card"><div class="ch"><b>평균 ${esc(t('done'))}율 추이</b><small>최근 6개월</small></div><div class="spark">${trend.map((v, i) => `<div><i style="height:${v}%"></i><small>${i === 5 ? '이번 달' : (5 - i) + '개월 전'}</small><b>${v}</b></div>`).join('')}</div></div>
      <div class="card"><div class="ch"><b>장기 미접속 ${esc(t('learner'))}</b></div>${[30, 60, 90].map(d => `<div class="row"><span>${d}일 이상</span><b>${away(d)}명</b></div>`).join('')}<button class="btn sm" data-act="auto-run-id" data-v="nudge-away">미접속자 독려 자동화 실행</button></div>
      <div class="card"><div class="ch"><b>${esc(t('cls'))} Top 5</b><small>수강 인원순</small></div>${[...S.classes].sort((a, b) => b.learners.length - a.learners.length).slice(0, 5).map(c => `<div class="row"><a href="#" data-act="cls-open" data-v="${c.id}">${esc(c.name)}</a><span>${c.learners.length}명 · ${pct(avgP(c))}</span></div>`).join('')}</div>
    </section>`;
};
function aiSuggest(u, g, w) {
  const a = []; if (u) a.push(`미답변 질문 ${u}건의 답변 초안을 만들 수 있습니다`); if (g) a.push(`과제 ${g}건 AI 채점 초안 준비`); if (w) a.push(`승인 대기 ${w}명 일괄 승인`);
  if (S.org.type === 'corp') a.push('법정교육 마감 D-7 미이수자 독려'); if (S.org.type === 'k12') a.push('미납 보호자에게 청구서 재알림'); if (S.org.type === 'voc') a.push('출석률 미달 훈련생 경고 발송');
  return esc(a.slice(0, 3).join(' · ') || '오늘은 처리할 반복 업무가 없습니다.') + ` <a href="#" data-act="go" data-v="auto">자동화 보기</a>`;
}
ACT['dash-xls'] = () => downloadCSV(`운영현황_${today()}.csv`, [t('cls'), '유형', '상태', '수강 인원', '평균 진도', t('done') + ' 인원'], S.classes.map(c => [c.name, KIND[c.kind], c.status, c.learners.length, Math.round(avgP(c)), doneN(c)]));

/* ═════════ 클래스 ═════════ */
VIEWS.class = () => {
  if (UI.cls && C(UI.cls)) return classDetail(C(UI.cls));
  const f = UI.clsF || 'all';
  const list = S.classes.filter(c => f === 'all' || c.kind === f);
  return head(`${t('cls')} 관리`, `기간 · 회차 · 구독 3가지 유형 ${guideRef('features/class/type.md')}`, `<button class="btn" data-act="cls-pad">출결패드 실행</button><button class="btn pri" data-act="cls-new">+ ${esc(t('cls'))} 만들기</button>`) +
    tabs('clsF', [['all', '전체 ' + S.classes.length], ['period', '기간'], ['episode', '회차'], ['sub', '구독']], f) +
    table([t('cls'), '유형', '상태', '공개', t('fee'), '인원', '평균 진도', ''], list.map(c => [`<a href="#" data-act="cls-open" data-v="${c.id}"><b>${esc(c.name)}</b></a>${c.legal ? ' ' + tag('법정', 'r') : ''}`, esc(KIND[c.kind] + (c.sub ? ' · ' + c.sub : '')), tag(c.status, c.status === '운영중' ? 'g' : ''), esc(c.open), c.price ? won(c.price) : '무료', c.learners.length + '명', bar(avgP(c)) + ' ' + pct(avgP(c)), `<button class="btn sm ghost" data-act="cls-open" data-v="${c.id}">관리</button><button class="btn sm ghost" data-act="cls-copy" data-v="${c.id}">복사</button>`]));
};
ACT['cls-open'] = el => { UI.cls = el.dataset.v; UI.clsT = 'learners'; go('class'); };
ACT['cls-back'] = () => { UI.cls = null; render(); };
ACT['cls-copy'] = el => { const c = C(el.dataset.v); const n = JSON.parse(JSON.stringify(c)); n.id = uid('c'); n.name = c.name + ' (복사)'; n.learners = []; n.prog = {}; n.status = '준비중'; S.classes.push(n); logAudit(`${t('cls')} 복사 — ${c.name}`); save(); toast('복사본을 만들었습니다. 지정 회원 공개로 바꾼 뒤 결제 링크를 보낼 수 있습니다.', 'ok'); render(); };
function classDetail(c) {
  const tb = UI.clsT || 'learners'; const ep = c.kind === 'episode';
  const T = [['learners', t('learner')], [ep ? 'episodes' : 'curriculum', ep ? '회차' : '커리큘럼'], ...(ep ? [] : [['eval', '평가']]), ['notice', '공지사항'], ['set', '설정']];
  let body = '';
  if (tb === 'learners') body = `<div class="bar2"><button class="btn sm" data-act="cls-grant" data-v="${c.id}">수강 권한 부여</button><button class="btn sm" data-act="cls-extend" data-v="${c.id}" ${c.kind === 'sub' ? 'disabled title="구독 클래스는 연장 대신 회차로 관리합니다"' : ''}>수강 기간 연장</button><button class="btn sm" data-act="cls-dl" data-v="${c.id}">수강현황 내려받기</button><button class="btn sm ghost" data-act="auto-run-id" data-v="nudge-low">진도 30% 미만 독려</button></div>` +
    table(['', '이름', t('group'), '진도', '시험', '과제', ep ? '출석률' : t('done'), ''], c.learners.map(id => { const p = c.prog[id] || { p: 0 }; return [`<input type="checkbox" class="ck" value="${id}" aria-label="선택">`, mn(id), gn(M(id)?.group), bar(p.p, p.p < 30 ? 'r' : '') + ' ' + pct(p.p), p.exam ?? '—', { none: '미제출', submitted: tag('채점 대기', 'y'), graded: tag('채점 완료', 'g') }[p.assign] || '—', ep ? pct(p.att) : (p.p >= c.criteria.threshold ? tag(t('done'), 'g') : '—'), `<button class="btn sm ghost" data-act="cls-revoke" data-c="${c.id}" data-v="${id}">권한 제외</button>`]; }), '수강생이 없습니다. 수강 권한을 부여하세요.');
  if (tb === 'curriculum' || tb === 'episodes') body = `<div class="bar2"><button class="btn sm" data-act="cur-add" data-v="${c.id}">+ 항목 추가</button><button class="btn sm" data-act="cur-lib" data-v="${c.id}">라이브러리에서 가져오기</button>${c.kind === 'period' ? `<button class="btn sm ai" data-act="ai-curr" data-v="${c.id}">✦ AI 커리큘럼 구성</button>` : ''}<span class="mini">${ep ? '회차 클래스 최대 100회차' : '동영상 1개 최대 2시간 · 4GB'}</span></div>
    <ol class="cur">${c.curriculum.map((it, i) => `<li class="${it.type === 'chapter' ? 'chap' : ''}"><span class="ty">${esc(ITEM[it.type])}</span><b>${esc(it.title)}</b>${it.script ? tag('스크립트·요약', 'g') : ''}<span class="sp"></span>${it.type === 'video' ? `<button class="btn sm ghost ai" data-act="ai-script" data-c="${c.id}" data-v="${i}">✦ 스크립트·요약</button>` : ''}${['video', 'live'].includes(it.type) ? `<button class="btn sm ghost ai" data-act="ai-quiz" data-c="${c.id}" data-v="${i}">✦ 퀴즈 생성</button>` : ''}<button class="btn sm ghost" data-act="cur-mv" data-c="${c.id}" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="cur-mv" data-c="${c.id}" data-v="${i}" data-d="1" aria-label="아래로">↓</button><button class="btn sm ghost" data-act="cur-del" data-c="${c.id}" data-v="${i}" aria-label="삭제">✕</button></li>`).join('')}</ol>`;
  if (tb === 'eval') body = `<div class="grid g2"><div class="card"><div class="ch"><b>${esc(t('done'))} 기준</b><small>항목별 비율 합계 100%</small></div>
    ${['video', 'exam', 'assign'].map(k => `<label class="rng">${{ video: '동영상 진도', exam: '시험', assign: '과제' }[k]} <input type="range" min="0" max="100" step="5" value="${c.criteria[k]}" data-chg="crit" data-c="${c.id}" data-k="${k}"><b>${c.criteria[k]}%</b></label>`).join('')}
    <label class="rng">${esc(t('done'))} 점수 <input type="range" min="50" max="100" step="5" value="${c.criteria.threshold}" data-chg="crit" data-c="${c.id}" data-k="threshold"><b>${c.criteria.threshold}점</b></label>
    <p class="mini">시험 시간 최대 600분 · 재응시 2~99회 또는 도달 점수 1~100 · 배점 합계 100점 · 객관식 보기 최대 10개. 응시자가 생기면 일부 항목만 수정할 수 있습니다.</p></div>
    <div class="card"><div class="ch"><b>평가 항목</b></div>${c.curriculum.filter(i => ['quiz', 'exam', 'assign', 'survey'].includes(i.type)).map(i => `<div class="row"><span>${esc(ITEM[i.type])}</span><b>${esc(i.title)}</b></div>`).join('') || '<div class="empty">평가 항목이 없습니다.</div>'}<button class="btn sm" data-act="go" data-v="assess">채점하러 가기</button></div></div>`;
  if (tb === 'notice') body = `<div class="bar2"><button class="btn sm" data-act="cls-notice" data-v="${c.id}">+ 공지 작성</button></div>` + table(['제목', '작성일', '고정'], c.notices.map(n => [esc(n.title), n.at, n.pin ? tag('상단 고정', 'g') : '']));
  if (tb === 'set') body = `<div class="form2">
    <label>상태<select data-chg="cls-set" data-c="${c.id}" data-k="status">${['준비중', '운영중', '종료'].map(v => `<option ${c.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>공개 대상<select data-chg="cls-set" data-c="${c.id}" data-k="open">${['전체', '지정 회원', '비공개'].map(v => `<option ${c.open === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>${esc(t('fee'))}(원, 0이면 무료)<input type="number" min="0" step="1000" value="${c.price}" data-chg="cls-set" data-c="${c.id}" data-k="price" ${c.kind === 'sub' ? 'title="구독 클래스는 유료로만 판매"' : ''}></label>
    <label>커뮤니티 권한<select data-chg="cls-set" data-c="${c.id}" data-k="community"><option value="class" ${c.community === 'class' ? 'selected' : ''}>클래스 수강생만 입장</option><option value="all" ${c.community === 'all' ? 'selected' : ''}>전체 회원</option></select></label>
    <label class="ckl"><input type="checkbox" ${c.skip ? 'checked' : ''} data-chg="cls-set" data-c="${c.id}" data-k="skip"> 동영상 건너뛰기 허용(5초 단위, 진도는 건너뛴 지점 앞까지만 기록)</label>
    <label class="ckl"><input type="checkbox" ${c.speed ? 'checked' : ''} data-chg="cls-set" data-c="${c.id}" data-k="speed"> 배속 재생 허용</label>
    <label class="ckl"><input type="checkbox" ${c.early ? 'checked' : ''} data-chg="cls-set" data-c="${c.id}" data-k="early"> 사전 수강신청(얼리버드)${S.org.type === 'lifelong' ? ' — 수요 조사 용도' : ''}</label>
    <label>수료증 발급<select data-chg="cls-set" data-c="${c.id}" data-k="cert" ${c.kind === 'sub' ? 'disabled' : ''}><option value="auto" ${c.cert === 'auto' ? 'selected' : ''}>자동(수료 기준 충족 시)</option><option value="manual" ${c.cert === 'manual' ? 'selected' : ''}>수동</option></select></label>
    <label>교육 시간(시간)<input type="number" min="0" value="${c.hours}" data-chg="cls-set" data-c="${c.id}" data-k="hours"></label>
    <label>담당 ${esc(t('teacher'))}<input value="${esc(c.teacher)}" data-chg="cls-set" data-c="${c.id}" data-k="teacher" maxlength="30"></label>
    <div class="danger"><button class="btn sm red" data-act="cls-del" data-v="${c.id}">${esc(t('cls'))} 삭제</button><small>수강생이나 구독자가 있으면 삭제할 수 없습니다.</small></div></div>`;
  return `<button class="link back" data-act="cls-back">← ${esc(t('cls'))} 목록</button>` + head(c.name, `${esc(KIND[c.kind] + (c.sub ? ' · ' + c.sub : ''))} · ${c.start} ~ ${c.end} · ${esc(c.teacher)}`, `${tag(c.status, c.status === '운영중' ? 'g' : '')}`) +
    `<section class="grid g4">${kpi('수강 인원', c.learners.length + '명')}${kpi('평균 진도', pct(avgP(c)))}${kpi(t('done') + ' 인원', doneN(c) + '명', '', 'g')}${kpi('채점 대기', Object.values(c.prog).filter(p => p.assign === 'submitted').length + '건')}</section>` + tabs('clsT', T, tb) + body;
}
ACT['crit'] = el => { const c = C(el.dataset.c); c.criteria[el.dataset.k] = +el.value; el.nextElementSibling.textContent = el.value + (el.dataset.k === 'threshold' ? '점' : '%'); const s = c.criteria.video + c.criteria.exam + c.criteria.assign; if (s !== 100 && el.dataset.k !== 'threshold') toast(`비율 합계 ${s}% — 100%로 맞춰 주세요.`, 'warn'); save(); };
ACT['cls-set'] = el => { const c = C(el.dataset.c); const k = el.dataset.k; let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Math.max(0, +el.value || 0) : el.value; if (k === 'price' && c.kind === 'sub' && !v) { toast('구독 클래스는 유료로만 판매할 수 있습니다.', 'warn'); el.value = c.price; return; } c[k] = v; logAudit(`${c.name} 설정 변경 — ${k}`); save(); toast('저장했습니다.', 'ok'); };
ACT['cls-del'] = el => { const c = C(el.dataset.v); if (c.learners.length) { toast('수강생이 있어 삭제할 수 없습니다. 먼저 종료 상태로 바꾸세요.', 'warn'); return; } S.classes = S.classes.filter(x => x !== c); UI.cls = null; save(); render(); };
ACT['cls-dl'] = el => { const c = C(el.dataset.v); downloadCSV(`${c.name}_수강현황.csv`, ['이름', t('group'), '진도', '시험', '과제', t('done')], c.learners.map(id => { const p = c.prog[id] || {}; return [M(id)?.name, S.groups.find(g => g.id === M(id)?.group)?.name, p.p, p.exam ?? '', p.assign, p.p >= c.criteria.threshold ? 'Y' : 'N']; })); };
ACT['cls-revoke'] = el => { const c = C(el.dataset.c); c.learners = c.learners.filter(x => x !== el.dataset.v); delete c.prog[el.dataset.v]; logAudit(`${c.name} 수강 권한 제외 — ${M(el.dataset.v)?.name}`); save(); render(); };
ACT['cls-grant'] = el => {
  const c = C(el.dataset.v); const avail = S.members.filter(m => !c.learners.includes(m.id) && m.grade !== '승인 대기');
  modal('수강 권한 부여', `${c.price ? `<div class="warn">유료 ${esc(t('cls'))}입니다. 권한을 직접 부여하면 결제 없이 수강할 수 있습니다.</div>` : ''}
    <label class="fl">${esc(t('group'))} 단위로 부여<select name="grp"><option value="">— 선택 안 함 —</option>${S.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label>
    <div class="fl"><span>개별 선택 (${avail.length}명)</span><div class="chk">${avail.map(m => `<label><input type="checkbox" name="mm" value="${m.id}"> ${esc(m.name)}</label>`).join('')}</div></div>
    <label class="fl">구독 회차(구독 클래스만, 최대 999)<input name="rounds" type="number" min="1" max="999" value="1" ${c.kind === 'sub' ? '' : 'disabled'}></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '부여', kind: 'pri', run: w => { const ids = new Set($$('[name=mm]:checked', w).map(x => x.value)); const g = fv(w, 'grp'); if (g) S.members.filter(m => m.group === g).forEach(m => ids.add(m.id)); ids.forEach(id => { if (!c.learners.includes(id)) { c.learners.push(id); c.prog[id] = { p: 0, exam: null, assign: 'none', att: 100 }; } }); logAudit(`${c.name} 수강 권한 부여 ${ids.size}명`); save(); toast(`${ids.size}명에게 권한을 부여했습니다.`, 'ok'); render(); } }]);
};
ACT['cls-extend'] = el => {
  const c = C(el.dataset.v); const sel = $$('.ck:checked').map(x => x.value);
  modal('수강 기간 연장', `<p class="mini">${sel.length ? `선택한 ${sel.length}명` : '선택한 수강생이 없어 전체 수강생'}의 개별 종료일을 연장합니다. ${esc(t('cls'))} 기간을 바꿔도 기존 수강생 종료일은 자동으로 바뀌지 않으며, 클래스 기간이 개별 종료일보다 우선합니다. 연장 기간에는 환불 신청을 할 수 없습니다.</p><label class="fl">연장 일수<input name="d" type="number" min="1" max="365" value="14"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '연장', kind: 'pri', run: w => { const d = +fv(w, 'd') || 0; if (!d) return false; logAudit(`${c.name} 수강 기간 ${d}일 연장 (${sel.length || c.learners.length}명)`); save(); toast(`${d}일 연장했습니다.`, 'ok'); } }]);
};
ACT['cls-notice'] = el => { const c = C(el.dataset.v); modal('공지 작성', `<label class="fl">제목<input name="t" maxlength="60"></label><label class="ckl"><input type="checkbox" name="pin" checked> 상단 고정</label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '등록', kind: 'pri', run: w => { if (!fv(w, 't')) return false; c.notices.unshift({ id: uid('n'), title: fv(w, 't'), at: today(), pin: fv(w, 'pin') }); save(); render(); } }]); };
ACT['cur-add'] = el => { const c = C(el.dataset.v); if (c.kind === 'episode' && c.curriculum.length >= 100) { toast('회차 클래스는 최대 100회차입니다.', 'warn'); return; } modal('커리큘럼 항목 추가', `<label class="fl">항목 종류<select name="ty">${Object.entries(ITEM).filter(([k]) => c.kind === 'episode' ? ['offline', 'live', 'assign'].includes(k) : k !== 'offline').map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label class="fl">제목<input name="t" maxlength="60"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { if (!fv(w, 't')) return false; c.curriculum.push({ id: uid('it'), type: fv(w, 'ty'), title: fv(w, 't') }); save(); render(); } }]); };
ACT['cur-mv'] = el => { const c = C(el.dataset.c), i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= c.curriculum.length) return; [c.curriculum[i], c.curriculum[j]] = [c.curriculum[j], c.curriculum[i]]; save(); render(); };
ACT['cur-del'] = el => { const c = C(el.dataset.c); c.curriculum.splice(+el.dataset.v, 1); save(); render(); };
ACT['cur-lib'] = el => { const c = C(el.dataset.v); modal('라이브러리에서 가져오기', `<div class="chk">${S.lib.filter(l => l.kind === '동영상' || l.kind === '문서').map(l => `<label><input type="checkbox" name="l" value="${l.id}"> ${esc(l.name)} <small>${esc(l.size)}</small></label>`).join('')}</div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '가져오기', kind: 'pri', run: w => { $$('[name=l]:checked', w).forEach(x => { const l = S.lib.find(y => y.id === x.value); l.used++; c.curriculum.push({ id: uid('it'), type: l.kind === '동영상' ? 'video' : 'chapter', title: l.name.replace(/\.\w+$/, '') }); }); save(); render(); } }]); };

/* 클래스 만들기 3단계 마법사 */
let WZ = null;
ACT['cls-new'] = () => { WZ = { step: 1, kind: 'period', sub: '', name: '', target: '', goal: '', thumb: '', items: [], price: 0, open: '전체', cert: 'auto', early: false }; wizard(); };
function wizard() {
  const s = WZ.step; let b = `<div class="stepper"><span class="${s >= 1 ? 'on' : ''}">1 수업 정보</span><span class="${s >= 2 ? 'on' : ''}">2 커리큘럼</span><span class="${s >= 3 ? 'on' : ''}">3 설정</span></div>`;
  if (s === 1) b += `<div class="fl"><span>유형</span><div class="seg wrap">${[['period', '', '기간(온라인)'], ['episode', '요일반', '회차 · 요일반'], ['episode', '특강반', '회차 · 특강반'], ['episode', '회차 차감반', '회차 · 차감반'], ['sub', '', '구독']].map(([k, sb, l]) => `<button type="button" class="${WZ.kind === k && WZ.sub === sb ? 'on' : ''}" data-act="wz-kind" data-k="${k}" data-s="${sb}">${l}</button>`).join('')}</div></div>
    ${WZ.kind === 'sub' && S.settings.pg !== 'toss' ? '<div class="warn">구독 클래스는 유료 플랜 + 토스페이먼츠 정기결제 KEY 연동 후 판매할 수 있습니다. 매출 관리에서 PG를 연결하세요.</div>' : ''}
    <label class="fl">${esc(t('cls'))}명<input id="wzName" maxlength="40" value="${esc(WZ.name)}"></label>
    <label class="fl">교육 대상자<input id="wzTarget" maxlength="40" value="${esc(WZ.target)}" placeholder="예: 입사 1년 차 ${esc(t('learner'))}"></label>
    <label class="fl">교육 목표 · 주요 내용 <button type="button" class="btn sm ai" data-act="wz-ai-goal">✦ AI SAM 작성</button><textarea id="wzGoal" rows="4">${esc(WZ.goal)}</textarea></label>
    <label class="fl">썸네일 키워드 <button type="button" class="btn sm ai" data-act="wz-ai-thumb">✦ AI 추천</button><input id="wzThumb" value="${esc(WZ.thumb)}" placeholder="영어 키워드 권장"></label>`;
  if (s === 2) b += `<div class="bar2">${WZ.kind === 'period' ? '<button type="button" class="btn sm ai" data-act="wz-ai-cur">✦ AI 커리큘럼 구성</button>' : ''}<button type="button" class="btn sm" data-act="wz-add">+ 항목</button></div><ol class="cur">${WZ.items.map((it, i) => `<li class="${it.type === 'chapter' ? 'chap' : ''}"><span class="ty">${ITEM[it.type]}</span><b>${esc(it.title)}</b><span class="sp"></span><button type="button" class="btn sm ghost" data-act="wz-del" data-v="${i}">✕</button></li>`).join('') || '<div class="empty">항목을 추가하거나 AI 구성을 눌러 보세요.</div>'}</ol>`;
  if (s === 3) b += `<div class="form2"><label>${esc(t('fee'))}(원)<input id="wzPrice" type="number" min="0" step="1000" value="${WZ.price}"></label><label>공개 대상<select id="wzOpen">${['전체', '지정 회원', '비공개'].map(v => `<option ${WZ.open === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>수료증<select id="wzCert" ${WZ.kind === 'sub' ? 'disabled' : ''}><option value="auto">자동 발급</option><option value="manual" ${WZ.kind === 'sub' ? 'selected' : ''}>수동 발급</option></select></label><label class="ckl"><input type="checkbox" id="wzEarly"> 사전 수강신청(얼리버드)</label></div><p class="mini">수료 기준(동영상 60 · 시험 20 · 과제 20, 80점)은 저장 후 평가 탭에서 바꿀 수 있습니다.</p>`;
  modal(`${t('cls')} 만들기`, b, [{ id: 'c', label: '취소' }, ...(s > 1 ? [{ id: 'p', label: '이전', run: () => { wzRead(); WZ.step--; setTimeout(wizard); } }] : []), s < 3 ? { id: 'n', label: '다음으로', kind: 'pri', run: () => { wzRead(); if (s === 1 && !WZ.name) { toast(`${t('cls')}명을 입력하세요.`, 'warn'); return false; } WZ.step++; setTimeout(wizard); } } : { id: 'ok', label: '저장', kind: 'pri', run: () => { wzRead(); return wzSave(); } }], true);
}
function wzRead() { const v = id => $('#' + id); if (v('wzName')) { WZ.name = v('wzName').value.trim(); WZ.target = v('wzTarget').value.trim(); WZ.goal = v('wzGoal').value; WZ.thumb = v('wzThumb').value; } if (v('wzPrice')) { WZ.price = +v('wzPrice').value || 0; WZ.open = v('wzOpen').value; WZ.cert = v('wzCert').value; WZ.early = v('wzEarly').checked; } }
function wzSave() {
  if (WZ.kind === 'sub' && (!WZ.price || S.settings.pg !== 'toss')) { toast('구독 클래스는 유료 + 토스 PG 연동이 필요합니다.', 'warn'); return false; }
  const c = { id: uid('c'), name: WZ.name, kind: WZ.kind, sub: WZ.sub, legal: false, status: '준비중', price: WZ.price, open: WZ.open, start: today(), end: addDays(today(), 90), teacher: S.me.name, group: '', learners: [], prog: {}, curriculum: WZ.items.length ? WZ.items : curriculumFor(WZ.name, WZ.kind), criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: WZ.kind === 'sub' ? 'manual' : WZ.cert, skip: false, speed: true, early: WZ.early, community: 'class', hours: 16, goal: WZ.goal, notices: [] };
  S.classes.unshift(c); logAudit(`${t('cls')} 생성 — ${c.name}`); save(); UI.cls = c.id; UI.clsT = 'curriculum'; toast('저장했습니다.', 'ok'); setTimeout(() => go('class'));
}
ACT['wz-kind'] = el => { wzRead(); WZ.kind = el.dataset.k; WZ.sub = el.dataset.s; wizard(); };
ACT['wz-add'] = () => { const ty = WZ.kind === 'episode' ? 'offline' : 'video'; WZ.items.push({ id: uid('it'), type: ty, title: `${WZ.items.length + 1}. 새 항목` }); wizard(); };
ACT['wz-del'] = el => { WZ.items.splice(+el.dataset.v, 1); wizard(); };
ACT['wz-ai-goal'] = () => { wzRead(); if (!WZ.name) { toast(`${t('cls')}명을 먼저 입력하세요.`, 'warn'); return; } WZ.goal = AI.goal(WZ.name, WZ.target); wizard(); toast('AI SAM이 교육 목표를 작성했습니다. 확인 후 수정하세요.', 'ok'); };
ACT['wz-ai-thumb'] = () => { wzRead(); WZ.thumb = AI.thumb(WZ.name); wizard(); };
ACT['wz-ai-cur'] = () => { wzRead(); WZ.items = AI.curriculum(WZ.name, WZ.target); wizard(); toast('커리큘럼 초안을 만들었습니다. 수정하거나 다시 추천받을 수 있습니다.', 'ok'); };
ACT['cls-pad'] = () => attendPad();

/* ═════════ 평가 · 채점 ═════════ */
VIEWS.assess = () => {
  const P = pend();
  return head('평가 · 채점', `과제 · 시험 · 퀴즈 · 설문 결과를 한곳에서 · AI 채점 초안 ${guideRef('features/class/makedurationclass/curriculum.md')}`, P.length ? `<button class="btn ai" data-act="ai-grade-all">✦ 대기 ${P.length}건 AI 채점 초안</button>` : '') +
    `<section class="grid g3">${kpi('채점 대기', P.length + '건', '', P.length ? 'y' : '')}${kpi('채점 완료', S.classes.reduce((a, c) => a + Object.values(c.prog).filter(p => p.assign === 'graded').length, 0) + '건')}${kpi('시험 평균', Math.round(avgOf(S.classes.flatMap(c => Object.values(c.prog).map(p => p.exam).filter(v => v != null)))) + '점')}</section>` +
    table([t('cls'), '이름', '과제', 'AI 초안', ''], P.map(({ c, id }) => [esc(c.name), mn(id), esc(c.curriculum.find(i => i.type === 'assign')?.title || '과제'), c.prog[id].draft ? `${c.prog[id].draft.score}점 · ${esc(c.prog[id].draft.note)}` : '—', `<button class="btn sm" data-act="grade" data-c="${c.id}" data-v="${id}">채점</button>`]), '채점할 과제가 없습니다.');
};
const avgOf = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
ACT.grade = el => { const c = C(el.dataset.c), id = el.dataset.v, p = c.prog[id]; const d = p.draft || AI.gradeDraft(c, id);
  modal(`채점 — ${M(id).name}`, `<div class="aibox">✦ <b>AI 채점 초안</b> ${d.score}점 · ${esc(d.note)}<br><small>루브릭: ${esc(d.rubric)}</small></div><label class="fl">점수(0~100)<input name="s" type="number" min="0" max="100" value="${d.score}"></label><label class="fl">피드백<textarea name="f" rows="3">${esc(d.feedback)}</textarea></label><p class="mini">AI 초안은 참고용입니다. 최종 점수는 운영자가 확정합니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '채점 확정', kind: 'pri', run: w => { p.assign = 'graded'; p.score = clamp(+fv(w, 's') || 0, 0, 100); p.fb = fv(w, 'f'); delete p.draft; logAudit(`채점 — ${c.name} ${M(id).name} ${p.score}점`); save(); render(); } }]); };
ACT['ai-grade-all'] = () => { pend().forEach(({ c, id }) => { c.prog[id].draft = AI.gradeDraft(c, id); }); S.ai.usage += pend().length; save(); render(); toast('AI 채점 초안을 만들었습니다. 한 건씩 확인 후 확정하세요.', 'ok'); };

/* ═════════ 출결 ═════════ */
const lowAtt = () => S.classes.filter(c => c.kind === 'episode' || S.org.type === 'voc').flatMap(c => Object.entries(c.prog).filter(([, p]) => p.att < 80).map(([id, p]) => ({ c, id, att: p.att })));
VIEWS.attend = () => {
  const eps = S.classes.filter(c => c.kind === 'episode' || S.org.type === 'voc'); const c = C(UI.attC) || eps[0];
  if (!c) return head('출결') + '<div class="empty">회차 클래스가 없습니다.</div>';
  const n = Math.min(8, c.curriculum.length || 8); c.att = c.att || {};
  const cell = (id, r) => { const v = c.att[id + ':' + r] || (r < 5 ? (((id.charCodeAt(1) + r) % 9) === 0 ? '결석' : ((id.charCodeAt(1) + r) % 7) === 0 ? '지각' : '출석') : ''); return `<button class="att ${({ 출석: 'g', 지각: 'y', 결석: 'r' })[v] || ''}" data-act="att" data-c="${c.id}" data-v="${id}" data-r="${r}" title="클릭해서 변경">${v ? v[0] : '·'}</button>`; };
  return head('출결', `출결패드(휴대폰 끝 4자리) · 수동 변경 · ${S.org.type === 'voc' ? '<b>출석률 80% 미만 훈련생 경고</b>' : '라이브 강의 출석 인정 시간 설정'} ${guideRef('features/class/operate.md')}`, `<button class="btn pri" data-act="cls-pad">출결패드 실행</button>`) +
    `<div class="bar2"><select data-chg="attSel" aria-label="${esc(t('cls'))} 선택">${eps.map(x => `<option value="${x.id}" ${x === c ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><span class="mini">운영자가 수동 처리한 회차는 보호자 앱에 출석 시간이 표시되지 않습니다.</span></div>` +
    table(['이름', ...Array.from({ length: n }, (_, i) => i + 1 + '회'), '출석률'], c.learners.map(id => [mn(id), ...Array.from({ length: n }, (_, r) => cell(id, r)), (c.prog[id]?.att < 80 ? tag(pct(c.prog[id].att), 'r') : pct(c.prog[id]?.att))])) +
    (lowAtt().length ? `<div class="card"><div class="ch"><b>출석률 80% 미만</b><button class="btn sm ai" data-act="auto-run-id" data-v="att-warn">✦ 경고 메시지 자동 발송</button></div>${lowAtt().slice(0, 8).map(x => `<div class="row"><span>${mn(x.id)} · ${esc(x.c.name)}</span><b class="r">${pct(x.att)}</b></div>`).join('')}</div>` : '');
};
ACT.attSel = el => { UI.attC = el.value; render(); };
ACT.att = el => { const c = C(el.dataset.c); const k = el.dataset.v + ':' + el.dataset.r; const order = ['출석', '지각', '결석', '']; const cur = el.textContent === '출' ? '출석' : el.textContent === '지' ? '지각' : el.textContent === '결' ? '결석' : ''; c.att[k] = order[(order.indexOf(cur) + 1) % 4]; S.attLog = true; save(); render(); };
function attendPad() {
  let code = ''; const eps = S.classes.filter(c => c.kind === 'episode'); const c = eps[0];
  const w = modal('출결패드', `<p class="mini">태블릿을 강의실 입구에 두고 ${esc(t('learner'))}이 휴대폰 번호 끝 4자리를 입력하면 출석이 기록됩니다.${c ? ' 현재 회차: ' + esc(c.name) : ''}</p><div class="pad"><output id="padOut">····</output>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⏎'].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div><p id="padMsg" class="mini" aria-live="polite"></p>`, [{ id: 'c', label: '닫기' }]);
  w.querySelector('.pad').addEventListener('click', e => { const k = e.target.dataset.k; if (k == null) return; if (k === 'C') code = ''; else if (k === '⏎') { const m = S.members.find(x => x.phone.endsWith(code)); $('#padMsg').textContent = m && code.length === 4 ? `${m.name}님 출석 완료 (${new Date().toLocaleTimeString('ko-KR')})` : '일치하는 번호가 없습니다.'; if (m && c) { c.att = c.att || {}; c.att[m.id + ':5'] = '출석'; S.attLog = true; save(); } code = ''; } else if (code.length < 4) code += k; $('#padOut').textContent = (code + '····').slice(0, 4); });
}

/* ═════════ 수료 · 수료증 ═════════ */
VIEWS.cert = () => {
  const ci = S.settings.certInfo;
  return head(`${t('done')} · 수료증`, `자동/수동 발급 · 기본 디자인 2종 · 발급번호 ${guideRef('faq/undefined.md')}`, `<button class="btn" data-act="cert-preview">미리보기</button><button class="btn pri" data-act="cert-manual">수동 발급</button>`) +
    `<div class="grid g2"><div class="card"><div class="ch"><b>수료증 설정</b></div><div class="form2">
      <label>대표자 이름(최대 15자)<input maxlength="15" value="${esc(ci.rep)}" data-chg="certInfo" data-k="rep"></label>
      <label>기관 이름(최대 20자)<input maxlength="20" value="${esc(ci.org || S.org.name)}" data-chg="certInfo" data-k="org"></label>
      <label>디자인<select data-chg="certInfo" data-k="design"><option value="a" ${ci.design !== 'b' ? 'selected' : ''}>기본 A (클래식)</option><option value="b" ${ci.design === 'b' ? 'selected' : ''}>기본 B (모던)</option></select></label>
      <label class="ckl"><input type="checkbox" ${ci.nick ? 'checked' : ''} data-chg="certInfo" data-k="nick"> 수강생 닉네임 표시</label>
      <label class="ckl"><input type="checkbox" ${ci.no !== false ? 'checked' : ''} data-chg="certInfo" data-k="no"> 발급번호 · 발급일자 표시</label>
      <p class="mini">날인 · 로고 이미지는 실제 운영 시 업로드합니다(데모에서는 자리만 표시).</p></div></div>
      <div class="card"><div class="ch"><b>${esc(t('cls'))}별 발급 방식</b></div>${S.classes.map(c => `<div class="row"><span>${esc(c.name)}</span><span>${c.cert === 'auto' ? tag(`자동 · ${c.criteria.threshold}점`, 'g') : tag('수동')}</span></div>`).join('')}</div></div>` +
    table(['발급번호', t('cls'), '이름', '발급일', '방식', '다운로드'], S.certs.map(x => [esc(x.no), esc(C(x.cls)?.name || '—'), mn(x.who), x.at, x.manual ? '수동' : '자동', x.dl ? tag('받음', 'g') : '—']));
};
ACT.certInfo = el => { S.settings.certInfo[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; save(); };
ACT['cert-preview'] = () => { const ci = S.settings.certInfo, b = ci.design === 'b'; modal('수료증 미리보기', `<div class="certpv ${b ? 'b' : ''}"><small>CERTIFICATE OF COMPLETION</small><h2>수 료 증</h2><p class="nm">홍길동</p><p>위 사람은 「${esc(S.classes[0]?.name || '')}」 과정을<br>성실히 이수하였기에 이 증서를 수여합니다.</p><p class="mini">교육기간 ${S.classes[0]?.start} ~ ${S.classes[0]?.end} · 교육시간 ${S.classes[0]?.hours}시간</p><p class="sg">${esc(ci.org || S.org.name)}<br>대표 ${esc(ci.rep || '○○○')} <span class="seal">印</span></p>${ci.no !== false ? `<small>발급번호 ${today().slice(0, 4)}-0001 · ${today()}</small>` : ''}</div>`, [{ id: 'c', label: '닫기' }], true); };
ACT['cert-manual'] = () => modal('수료증 수동 발급', `<label class="fl">${esc(t('cls'))}<select name="c">${S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label class="fl">대상<select name="m">${S.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label><div class="form2"><label>교육 시작<input type="date" name="s" value="${addDays(today(), -30)}"></label><label>교육 종료<input type="date" name="e" value="${today()}"></label><label>교육 시간<input type="number" name="h" value="16" min="1"></label><label>발행일<input type="date" name="d" value="${today()}"></label></div>`,
  [{ id: 'c', label: '취소' }, { id: 'ok', label: '발급', kind: 'pri', run: w => { S.certs.unshift({ id: uid('ct'), cls: fv(w, 'c'), who: fv(w, 'm'), at: fv(w, 'd'), no: `${today().slice(0, 4)}-${String(S.certs.length + 1).padStart(4, '0')}`, dl: false, manual: true }); logAudit('수료증 수동 발급'); save(); render(); } }]);

/* ═════════ 디지털 배지 ═════════ */
VIEWS.badge = () => head('디지털 배지', `Open Badge 3.0 표준 · 배지 플랜 필요 ${guideRef('features/digitalbadge.md')}`, `<button class="btn pri" data-act="badge-new">+ 배지 만들기</button>`) +
  `<div class="warn">발급한 배지는 수정 · 취소할 수 없고, 같은 배지를 같은 사람에게 다시 발급할 수 없습니다. 발급 시 알림톡 또는 메일이 발송됩니다.</div>` +
  `<div class="grid g3">${S.badges.map(b => `<div class="card badge"><div class="medal ${esc(b.design)}">✪</div><b>${esc(b.name)}</b><small>${esc(C(b.cls)?.name || '')}</small><span>${b.issued.length}명 발급</span><button class="btn sm" data-act="badge-issue" data-v="${b.id}">수동 발급</button></div>`).join('')}</div>` +
  table(['배지', '받은 사람', '발급일', '만료일'], S.badges.flatMap(b => b.issued.map(i => [esc(b.name), mn(i.who), i.at, i.exp || '없음'])));
ACT['badge-new'] = () => modal('배지 만들기', `<label class="fl">배지 이름<input name="n" maxlength="40"></label><label class="fl">연결 ${esc(t('cls'))}<select name="c">${S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label class="fl">디자인<select name="d"><option value="green">그린</option><option value="blue">블루</option><option value="gold">골드</option></select></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { if (!fv(w, 'n')) return false; S.badges.push({ id: uid('bd'), name: fv(w, 'n'), cls: fv(w, 'c'), design: fv(w, 'd'), issued: [] }); save(); render(); } }]);
ACT['badge-issue'] = el => { const b = S.badges.find(x => x.id === el.dataset.v); const can = (C(b.cls)?.learners || S.members.map(m => m.id)).filter(id => !b.issued.some(i => i.who === id));
  modal(`${b.name} 발급`, `<div class="chk">${can.map(id => `<label><input type="checkbox" name="m" value="${id}"> ${mn(id)}</label>`).join('') || '발급할 대상이 없습니다.'}</div><label class="fl">만료일(선택)<input type="date" name="e"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '발급', kind: 'pri', run: w => { const ids = $$('[name=m]:checked', w).map(x => x.value); ids.forEach(id => b.issued.push({ who: id, at: today(), exp: fv(w, 'e') })); logAudit(`배지 발급 — ${b.name} ${ids.length}명`); save(); render(); toast(`${ids.length}명에게 발급하고 알림을 보냈습니다.`, 'ok'); } }]); };

/* ═════════ 교재 · 교구 ═════════ */
VIEWS.book = () => head('교재 · 교구', `전자책(PDF 1개, 최대 200MB) · 실물 ${guideRef('features/book.md')}`, `<button class="btn ai" data-act="ai-bookthumb">✦ 썸네일 추천</button><button class="btn pri" data-act="book-new">+ 교재 만들기</button>`) +
  `<p class="mini">환불: 결제 후 7일 이내, 전자책은 다운로드 이력이 없어야 · 실물은 받기 전이어야 합니다. 전자책은 결제 후 30일 안에 받을 수 있습니다.</p>` +
  table(['이름', '유형', '금액', '판매', '다운로드/전달', '공개'], S.books.map(b => [esc(b.name), esc(b.kind), won(b.price), b.sold + '건', b.kind === '실물' ? `${b.delivered}/${b.sold} 전달 <button class="btn sm ghost" data-act="book-del" data-v="${b.id}">전달 체크</button>` : `${Math.round(b.sold * .7)}회`, esc(b.open)]), '등록된 교재가 없습니다.');
ACT['book-new'] = () => modal('교재 · 교구 만들기', `<div class="form2"><label>이름<input name="n" maxlength="40"></label><label>유형<select name="k"><option>전자책</option><option>실물</option></select></label><label>금액<input name="p" type="number" min="0" step="1000" value="10000"></label><label>저자<input name="a" maxlength="20"></label><label>공개 대상<select name="o"><option>전체</option><option>지정 회원</option><option>비공개</option></select></label><label class="ckl"><input type="checkbox" name="req"> 결제 시 요청사항 필수 입력(배송지 등)</label></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { if (!fv(w, 'n')) return false; S.books.push({ id: uid('bk'), name: fv(w, 'n'), kind: fv(w, 'k'), price: +fv(w, 'p'), sold: 0, delivered: 0, open: fv(w, 'o') }); save(); render(); } }]);
ACT['book-del'] = el => { const b = S.books.find(x => x.id === el.dataset.v); if (b.delivered < b.sold) b.delivered++; save(); render(); };
ACT['ai-bookthumb'] = () => modal('교재 썸네일 키워드 추천', `<p>${S.books.map(b => `<b>${esc(b.name)}</b> → ${esc(AI.thumb(b.name))}`).join('<br>')}</p>`, [{ id: 'c', label: '닫기' }]);

/* ═════════ 콘텐츠 라이브러리 ═════════ */
VIEWS.library = () => head('콘텐츠 라이브러리', `동영상 · 문서(PDF · 한글 · 엑셀 · PPT) · 사진 ${guideRef('features/library.md')}`, `<label class="btn pri">업로드<input type="file" multiple hidden data-chg="lib-up" accept="video/*,.pdf,.hwp,.hwpx,.xlsx,.xls,.ppt,.pptx,image/*"></label>`) +
  `<p class="mini">영상 1개 최대 2시간 · 4GB. 업로드 후 최적화는 순서대로 처리됩니다. ${esc(t('cls'))}에 쓰인 파일은 삭제할 수 없습니다. 데모에서는 파일 이름과 크기만 기록하고 내용은 업로드하지 않습니다.</p>` +
  table(['이름', '종류', '크기/길이', '사용 중', '등록일', ''], S.lib.map(l => [esc(l.name), esc(l.kind), esc(l.size), l.used ? tag(l.used + '곳', 'g') : '—', l.at, `<button class="btn sm ghost" data-act="lib-del" data-v="${l.id}">삭제</button>`]));
ACT['lib-up'] = el => { [...el.files].forEach(f => { const big = f.type.startsWith('video') && f.size > 4 * 1024 ** 3; if (big) { toast(`${f.name}: 4GB를 넘습니다.`, 'warn'); return; } S.lib.unshift({ id: uid('l'), name: f.name.slice(0, 80), kind: f.type.startsWith('video') ? '동영상' : f.type.startsWith('image') ? '사진' : '문서', size: (f.size / 1024 / 1024).toFixed(1) + 'MB', used: 0, at: today() }); }); save(); render(); };
ACT['lib-del'] = el => { const l = S.lib.find(x => x.id === el.dataset.v); if (l.used) { toast('사용 중인 파일은 삭제할 수 없습니다.', 'warn'); return; } S.lib = S.lib.filter(x => x !== l); save(); render(); };

/* ═════════ 유형 전용: 기업 법정의무교육 ═════════ */
const legalUndone = () => S.classes.filter(c => c.legal).flatMap(c => c.learners.filter(id => (c.prog[id]?.p || 0) < 100).map(id => ({ c, id })));
VIEWS.compliance = () => {
  const L = S.classes.filter(c => c.legal);
  return head('법정의무교육', '성희롱 예방 · 개인정보보호 · 장애인 인식개선 · 산업안전보건 — 연 1회 이상 이수 관리', `<button class="btn" data-act="comp-report">이수 증빙 보고서</button><button class="btn ai" data-act="auto-run-id" data-v="legal-d7">✦ 미이수자 독려 실행</button>`) +
    `<section class="grid g4">${L.map(c => kpi(c.name.replace(/교육.*$/, ''), pct(doneN(c) / Math.max(1, c.learners.length) * 100), `미이수 ${c.learners.length - doneN(c)}명 · 마감 ${c.end}`, doneN(c) / c.learners.length > .9 ? 'g' : 'y')).join('')}</section>` +
    `<div class="card"><div class="ch"><b>${esc(t('group'))}별 이수율</b><small>법정교육 4종 평균</small></div>${table([t('group'), ...L.map(c => c.name.slice(0, 8)), '평균'], S.groups.map(g => { const r = L.map(c => { const ids = c.learners.filter(id => M(id)?.group === g.id); return ids.length ? ids.filter(id => c.prog[id].p >= 100).length / ids.length * 100 : 0; }); return [esc(g.name), ...r.map(v => `<span class="${v < 70 ? 'r' : ''}">${pct(v)}</span>`), `<b>${pct(avgOf(r))}</b>`]; }))}</div>` +
    `<p class="mini">※ 이수 기준·주기는 관계 법령과 사내 규정을 따르며, 실제 운영 전 HR 담당 확인이 필요합니다.</p>`;
};
ACT['comp-report'] = () => downloadCSV(`법정의무교육_이수현황_${today()}.csv`, ['교육', '이름', t('group'), '진도', '이수'], S.classes.filter(c => c.legal).flatMap(c => c.learners.map(id => [c.name, M(id)?.name, S.groups.find(g => g.id === M(id)?.group)?.name, c.prog[id].p, c.prog[id].p >= 100 ? 'Y' : 'N'])));

/* ═════════ 유형 전용: 대학 학사 · 비교과 ═════════ */
VIEWS.academic = () => {
  const risk = S.classes.flatMap(c => Object.entries(c.prog).filter(([, p]) => p.p < 30).map(([id, p]) => ({ c, id, p: p.p })));
  return head('학사 · 비교과', `학과별 학습 현황 · 학습 위험군 · 성적 내보내기 · 학번/학과만 저장(학교 SSO 연계 예정)`, `<button class="btn" data-act="acad-xls">성적 내보내기</button><a class="btn" href="https://santanick.github.io/kit-axon/admin.html" target="_blank" rel="noopener">구축 사례: KIT AX ON</a>`) +
    `<div class="card"><div class="ch"><b>${esc(t('group'))}별 학습 현황</b></div>${table([t('group'), '학생 수', '평균 진도', '이수', '배지'], S.groups.map(g => { const ms = S.members.filter(m => m.group === g.id).map(m => m.id); const ps = S.classes.flatMap(c => ms.filter(id => c.prog[id]).map(id => c.prog[id].p)); return [esc(g.name), ms.length + '명', bar(avgOf(ps)) + ' ' + pct(avgOf(ps)), S.classes.reduce((a, c) => a + ms.filter(id => c.prog[id]?.p >= c.criteria.threshold).length, 0) + '건', S.badges.reduce((a, b) => a + b.issued.filter(i => ms.includes(i.who)).length, 0) + '개']; }))}</div>` +
    `<div class="card"><div class="ch"><b>학습 위험군</b><small>진도 30% 미만 · ${risk.length}건</small><button class="btn sm ai" data-act="auto-run-id" data-v="univ-risk">✦ 지도교수 알림 + 학생 독려</button></div>${risk.slice(0, 10).map(r => `<div class="row"><span>${mn(r.id)} · ${esc(r.c.name)}</span><b class="r">${pct(r.p)}</b></div>`).join('') || '<div class="empty">위험군이 없습니다.</div>'}</div>` +
    `<div class="card"><div class="ch"><b>비교과 포인트</b></div><p class="mini">비교과 프로그램 이수 · 배지 취득 시 포인트를 적립해 장학 · 인증제와 연계합니다. 배지 1개 = 10점, 비교과 이수 1건 = 20점(설정 가능).</p></div>`;
};
ACT['acad-xls'] = () => downloadCSV(`성적_${today()}.csv`, ['학번', '학과', t('cls'), '진도', '시험', '과제점수', '이수'], S.classes.flatMap(c => c.learners.map(id => { const m = M(id), p = c.prog[id]; return [m.extra?.학번 || '', S.groups.find(g => g.id === m.group)?.name, c.name, p.p, p.exam ?? '', p.score ?? '', p.p >= c.criteria.threshold ? 'Y' : 'N']; })));

/* ═════════ 유형 전용: 평생교육원 ═════════ */
VIEWS.lifelong = () => {
  const refunds = S.pays.filter(p => p.status === '환불 신청');
  const chk = [['불특정 다수 대상, 학습비를 받는 과정은 최소 10명 이상 · 30시간 이상', S.classes.every(c => c.hours >= 30 || c.price === 0)], ['운영 규칙에 학습비 반환 기준 명시', !!S.settings.terms.tos], ['반환 사유 발생 시 5일 이내 반환', true], ['신고한 과정만 운영 · 수료증에 허위 명칭 금지', true], ['배상책임보험 가입', !!S.llIns], ['개인정보 처리방침 게시', !!S.settings.terms.privacy], ['사이트 초기 화면에 통신판매업 신고번호 등 6종 표시', !!S.settings.footer.biz]];
  return head('학습비 · 과정 신고', `원격 평생교육시설 운영 요건 체크 · 학습비 반환 5일 기한 관리 ${guideRef('faq-1/register/lifelong-education.md')}`, `<button class="btn" data-act="ll-check">점검 완료로 표시</button>`) +
    `<div class="card"><div class="ch"><b>운영 요건 체크리스트</b><small>평생교육법 기준 요약 · 실제 신고 전 관할 교육청 확인</small></div>${chk.map(([l, ok], i) => `<div class="row"><span>${ok ? '✅' : '⬜'} ${esc(l)}</span>${i === 4 ? `<button class="btn sm ghost" data-act="ll-ins">${S.llIns ? '가입됨' : '가입 표시'}</button>` : !ok ? '<button class="btn sm ghost" data-act="go" data-v="settings">설정</button>' : ''}</div>`).join('')}</div>` +
    `<div class="card"><div class="ch"><b>학습비 반환 요청</b><small>신청일로부터 5일 이내 처리</small></div>${table(['신청일', '이름', '강좌', '금액', '기한', ''], refunds.map(p => { const dd = 5 - Math.floor((Date.now() - new Date(p.at)) / 864e5); return [p.at, mn(p.who), esc(p.item), won(p.amount), dd < 0 ? tag('기한 경과', 'r') : tag(`D-${dd}`, dd <= 1 ? 'y' : ''), `<button class="btn sm" data-act="go" data-v="sales">처리</button>`]; }), '반환 요청이 없습니다.')}</div>` +
    `<div class="card"><div class="ch"><b>강좌별 운영 시간</b></div>${S.classes.map(c => `<div class="row"><span>${esc(c.name)} · ${c.learners.length}명</span><span>${c.hours}시간 ${c.hours < 30 && c.price ? tag('30시간 미만', 'y') : ''}</span></div>`).join('')}</div>`;
};
ACT['ll-check'] = () => { S.llChecked = true; save(); render(); toast('점검 완료로 표시했습니다.', 'ok'); };
ACT['ll-ins'] = () => { S.llIns = !S.llIns; save(); render(); };

/* ═════════ 유형 전용: 직업훈련원 HRD-Net ═════════ */
VIEWS.hrd = () => {
  const R = S.hrd.reports; const sus = S.members.slice(0, 3).map((m, i) => ({ m, why: ['동일 IP 동시 접속 2건', '영상 재생 중 무입력 40분 이상', '출결패드 연속 입력 간격 3초'][i] }));
  return head('HRD-Net 보고', `훈련생 등록 · 진도 · 평가 · 수료 보고 준비 · 부정훈련 의심 모니터링 ${guideRef('faq-1/register/undefined.md')}`, `<button class="btn ai" data-act="auto-run-id" data-v="hrd-weekly">✦ 이번 주 보고 자료 생성</button>`) +
    `<div class="warn">HRD-Net 실제 전송은 고용노동부 · 한국산업인력공단 연계 승인 후 사용합니다. 데모에서는 보고 파일 생성까지 진행합니다.</div>` +
    `<section class="grid g4">${kpi('훈련생', S.members.length + '명')}${kpi('출석률 80% 미만', lowAtt().length + '명', '', lowAtt().length ? 'r' : 'g')}${kpi('수료 요건 충족', S.classes.reduce((a, c) => a + doneN(c), 0) + '명', '평가 성적 + 진도율')}${kpi('보고 대기', R.filter(r => r.st === '전송 대기').length + '건')}</section>` +
    `<div class="card"><div class="ch"><b>보고 내역</b></div>${table(['생성 시각', '종류', '대상', '상태', ''], R.map((r, i) => [esc(r.at), esc(r.kind), r.n + '명', tag(r.st, r.st === '전송 대기' ? 'y' : 'g'), `<button class="btn sm ghost" data-act="hrd-dl" data-v="${i}">파일</button>`]), '아직 생성한 보고가 없습니다.')}</div>` +
    `<div class="card"><div class="ch"><b>부정훈련 의심 모니터링</b><small>규칙 기반 탐지 · 확인 후 조치</small></div>${sus.map(s => `<div class="row"><span>${esc(s.m.name)} — ${esc(s.why)}</span><button class="btn sm ghost" data-act="hrd-ok" data-v="${s.m.id}">확인</button></div>`).join('')}</div>`;
};
ACT['hrd-dl'] = el => { const r = S.hrd.reports[+el.dataset.v]; downloadCSV(`HRD_${r.kind}_${r.at.slice(0, 10)}.csv`, ['훈련과정', '훈련생', '구분', '진도', '출석률', '평가', '수료'], S.classes.flatMap(c => c.learners.map(id => { const p = c.prog[id]; return [c.name, M(id).name, M(id).extra?.훈련생구분 || '', p.p, p.att, p.exam ?? '', p.p >= c.criteria.threshold && p.att >= 80 ? 'Y' : 'N']; }))); r.st = '파일 생성'; save(); render(); };
ACT['hrd-ok'] = () => toast('확인 처리했습니다. 감사 로그에 기록됩니다.', 'ok');

/* ═════════ 회원: 수강생 ═════════ */
VIEWS.members = () => {
  if (UI.mem && M(UI.mem)) return memberDetail(M(UI.mem));
  const f = UI.memF || 'all', q = (UI.memQ || '').toLowerCase();
  const L = S.members.filter(m => (f === 'all' || m.grade === f) && (!q || (m.name + m.email + m.phone).toLowerCase().includes(q)));
  return head(`${t('learner')} 관리`, `정회원 · 준회원 · 승인 대기 · 추가 질문 최대 6개 ${guideRef('features/member/student.md')}`, `<button class="btn" data-act="mem-q">추가 질문 설정</button><button class="btn" data-act="mem-xls">엑셀 내려받기</button><button class="btn" data-act="mem-bulk">일괄 가입</button><button class="btn pri" data-act="mem-invite">+ 초대</button>`) +
    tabs('memF', [['all', '전체 ' + S.members.length], ['정회원', '정회원'], ['준회원', '준회원'], ['승인 대기', '승인 대기 ' + S.members.filter(m => m.grade === '승인 대기').length]], f) +
    `<div class="bar2"><input type="search" placeholder="이름 · 이메일 · 연락처 검색" value="${esc(UI.memQ || '')}" data-chg="memQ" aria-label="검색">${f === '승인 대기' ? '<button class="btn sm pri" data-act="mem-approve">일괄 승인</button>' : ''}</div>` +
    table(['이름', '이메일', '연락처', t('group'), '등급', '가입일', '최근 접속', ''], L.map(m => [`<a href="#" data-act="mem-open" data-v="${m.id}">${esc(m.name)}</a>`, esc(m.email), esc(m.phone), gn(m.group), tag(m.grade, m.grade === '정회원' ? 'g' : m.grade === '준회원' ? '' : 'y'), m.joined, m.last <= addDays(today(), -30) ? tag(m.last, 'r') : m.last, `<button class="btn sm ghost" data-act="mem-open" data-v="${m.id}">상세</button>`]));
};
ACT.memQ = el => { UI.memQ = el.value; render(); };
ACT['mem-open'] = el => { UI.mem = el.dataset.v; UI.memT = 'info'; go('members'); };
ACT['mem-back'] = () => { UI.mem = null; render(); };
ACT['mem-approve'] = () => { const w = S.members.filter(m => m.grade === '승인 대기'); w.forEach(m => m.grade = '정회원'); logAudit(`가입 일괄 승인 ${w.length}명`); save(); render(); toast(`${w.length}명을 승인했습니다.`, 'ok'); };
function memberDetail(m) {
  const tb = UI.memT || 'info'; const cls = S.classes.filter(c => c.learners.includes(m.id));
  const body = tb === 'info' ? `<div class="form2"><label>이름<input value="${esc(m.name)}" data-chg="mem-set" data-v="${m.id}" data-k="name" maxlength="20"></label><label>닉네임<input value="${esc(m.nick)}" data-chg="mem-set" data-v="${m.id}" data-k="nick" maxlength="20"></label><label>이메일<input value="${esc(m.email)}" disabled></label><label>연락처<input value="${esc(m.phone)}" data-chg="mem-set" data-v="${m.id}" data-k="phone" maxlength="13"></label><label>${esc(t('group'))}<select data-chg="mem-set" data-v="${m.id}" data-k="group">${S.groups.map(g => `<option value="${g.id}" ${g.id === m.group ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label><label>등급<select data-chg="mem-set" data-v="${m.id}" data-k="grade">${['정회원', '준회원', '승인 대기'].map(v => `<option ${m.grade === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>${Object.entries(m.extra || {}).map(([k, v]) => `<label>${esc(k)}<input value="${esc(v)}" disabled></label>`).join('')}</div>${S.org.type === 'k12' ? `<div class="bar2"><button class="btn sm" data-act="par-req" data-v="${m.id}">보호자 연결 요청</button><small class="mini">운영자가 보낸 가족 연결 요청은 보호자가 거절할 수 없습니다.</small></div>` : ''}<div class="danger"><button class="btn sm red" data-act="mem-del" data-v="${m.id}">회원 삭제</button></div>`
    : tb === 'cls' ? table([t('cls'), '진도', '상태'], cls.map(c => [esc(c.name), pct(c.prog[m.id]?.p), c.prog[m.id]?.p >= c.criteria.threshold ? tag(t('done'), 'g') : '수강 중']))
    : tb === 'pay' ? table(['일시', '항목', '금액', '상태'], S.pays.filter(p => p.who === m.id).map(p => [p.at, esc(p.item), won(p.amount), esc(p.status)]), '결제 내역이 없습니다.')
    : table(['게시판', '제목', '작성일'], S.posts.filter(p => p.who === m.id).map(p => [esc(p.board), esc(p.title), p.at]), '작성한 글이 없습니다.');
  return `<button class="link back" data-act="mem-back">← ${esc(t('learner'))} 목록</button>` + head(m.name, `${esc(m.email)} · ${tag(m.grade)}`, `<button class="btn ai" data-act="ai-report" data-v="${m.id}">✦ 학습 리포트</button>`) + tabs('memT', [['info', '기본 정보'], ['cls', t('cls')], ['pay', '결제'], ['post', '작성글']], tb) + body;
}
ACT['mem-set'] = el => { const m = M(el.dataset.v); m[el.dataset.k] = el.value; save(); toast('저장했습니다.', 'ok'); };
ACT['mem-del'] = el => { S.members = S.members.filter(m => m.id !== el.dataset.v); S.classes.forEach(c => { c.learners = c.learners.filter(x => x !== el.dataset.v); delete c.prog[el.dataset.v]; }); UI.mem = null; logAudit('회원 삭제'); save(); render(); };
ACT['mem-invite'] = () => modal(`${t('learner')} 초대`, `<div class="seg wrap"><button type="button" class="on">연락처(알림톡)</button><button type="button">링크</button><button type="button">이메일</button></div><label class="fl">연락처 또는 이메일(줄바꿈으로 여러 명)<textarea name="l" rows="4" placeholder="010-0000-0000"></textarea></label><label class="fl">초대 링크<input readonly value="https://${esc(S.org.domain)}/invite/${uid('')}"></label><p class="mini">국내 번호가 없으면 수동 계정을 만드세요(알림톡 수신 불가).</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '초대 보내기', kind: 'pri', run: w => { const n = fv(w, 'l').split(/\n/).filter(Boolean).length; logAudit(`초대 발송 ${n}건`); save(); toast(`${n}건 초대를 보냈습니다(데모).`, 'ok'); } }]);
ACT['mem-bulk'] = () => modal('일괄 가입', `<p class="mini">CSV(엑셀에서 'CSV UTF-8'로 저장) 업로드 · 1회 최대 100명. 열 순서: 이름, 닉네임, 이메일, 비밀번호(8자 이상 조합), 연락처(- 포함), 추가정보…. 이메일 · 연락처가 중복되면 그 행은 등록하지 않습니다. 일괄 가입한 계정은 준회원으로 등록되고 첫 본인인증 시 정회원이 됩니다.</p><input type="file" accept=".csv,text/csv" id="bulkF"><button type="button" class="btn sm ghost" data-act="bulk-tpl">양식 내려받기</button><div id="bulkOut" class="mini"></div>`, [{ id: 'c', label: '닫기' }]);
ACT['bulk-tpl'] = () => downloadCSV('일괄가입_양식.csv', ['이름', '닉네임', '이메일', '비밀번호', '연락처', ...S.settings.extraQ], [['홍길동', '길동', 'hong@example.com', 'Abcd1234!', '010-0000-0000', ...S.settings.extraQ.map(() => '')]]);
document.addEventListener('change', e => { if (e.target.id !== 'bulkF') return; const f = e.target.files[0]; if (!f) return; f.text().then(txt => {
  const rows = txt.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map(r => r.split(',').map(c => c.replace(/^"|"$/g, '').trim())); rows.shift();
  const out = []; let ok = 0; if (rows.length > 100) { $('#bulkOut').textContent = '1회 최대 100명입니다.'; return; }
  rows.forEach((r, i) => { const [name, nick, email, pw, phone] = r; const err = !name ? '이름 누락' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '') ? '이메일 형식' : !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pw || '') ? '비밀번호 8자 이상 조합' : !/^\d{2,3}-\d{3,4}-\d{4}$/.test(phone || '') ? '연락처 형식(- 포함)' : S.members.some(m => m.email === email) ? '이메일 중복' : S.members.some(m => m.phone === phone) ? '연락처 중복' : '';
    if (err) out.push(`${i + 2}행: ${err}`); else { ok++; S.members.push({ id: uid('m'), name: name.slice(0, 20), nick: (nick || name).slice(0, 20), email, phone, group: S.groups[0]?.id, grade: '준회원', joined: today(), last: today(), extra: Object.fromEntries(S.settings.extraQ.map((q, j) => [q, (r[5 + j] || '').slice(0, 40)])) }); } });
  logAudit(`일괄 가입 ${ok}명`); save(); $('#bulkOut').innerHTML = `<b>${ok}명 등록</b>${out.length ? '<br>' + out.map(esc).join('<br>') : ''}`; }); });
ACT['mem-xls'] = () => modal('엑셀 내려받기', `<p class="mini">개인정보 보호를 위해 파일 비밀번호를 설정해야 내려받을 수 있습니다. (데모: 비밀번호 확인 후 CSV로 내려받습니다. 실제 운영에서는 암호화된 xlsx로 제공합니다.)</p><label class="fl">파일 비밀번호(8자 이상)<input type="password" name="pw" minlength="8"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '내려받기', kind: 'pri', run: w => { if (fv(w, 'pw').length < 8) { toast('비밀번호를 8자 이상 입력하세요.', 'warn'); return false; } logAudit('회원 목록 내려받기'); save(); downloadCSV(`${t('learner')}_${today()}.csv`, ['이름', '닉네임', '이메일', '연락처', t('group'), '등급', '가입일', ...S.settings.extraQ], S.members.map(m => [m.name, m.nick, m.email, m.phone, S.groups.find(g => g.id === m.group)?.name, m.grade, m.joined, ...S.settings.extraQ.map(q => m.extra?.[q] || '')])); } }]);
ACT['mem-q'] = () => modal('추가 질문 설정', `<p class="mini">가입 시 받는 추가 정보입니다. 최대 6개. 이미 답변이 제출된 질문은 바꿀 수 없습니다. ${S.org.type === 'univ' ? '대학 유형은 개인정보 최소화를 위해 학번 · 학과만 받는 것을 권장합니다.' : ''}</p>${Array.from({ length: 6 }, (_, i) => `<input class="qi" name="q${i}" maxlength="20" value="${esc(S.settings.extraQ[i] || '')}" placeholder="질문 ${i + 1}">`).join('')}`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { S.settings.extraQ = Array.from({ length: 6 }, (_, i) => fv(w, 'q' + i)).filter(Boolean); save(); toast('저장했습니다.', 'ok'); } }]);

/* ═════════ 회원: 팀(반·부서·학과) ═════════ */
VIEWS.groups = () => head(`${t('group')} 관리`, `${esc(t('group'))} 단위 수강 권한 · 메시지 발송 ${guideRef('features/member/team.md')}`, `<button class="btn pri" data-act="grp-new">+ ${esc(t('group'))} 만들기</button>`) +
  table([t('group'), '인원', '담당', '수강 중 ' + t('cls'), ''], S.groups.map(g => { const ms = S.members.filter(m => m.group === g.id); return [`<b>${esc(g.name)}</b>`, ms.length + '명', esc(g.lead || '—'), S.classes.filter(c => c.learners.some(id => ms.some(m => m.id === id))).length + '개', `<button class="btn sm ghost" data-act="grp-msg" data-v="${g.id}">메시지</button><button class="btn sm ghost" data-act="grp-del" data-v="${g.id}">삭제</button>`]; }));
ACT['grp-new'] = () => modal(`${t('group')} 만들기`, `<label class="fl">이름<input name="n" maxlength="30"></label><label class="fl">담당자<input name="l" maxlength="20"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { if (!fv(w, 'n')) return false; S.groups.push({ id: uid('g'), name: fv(w, 'n'), lead: fv(w, 'l') }); save(); render(); } }]);
ACT['grp-del'] = el => { if (S.members.some(m => m.group === el.dataset.v)) { toast('소속 인원이 있어 삭제할 수 없습니다.', 'warn'); return; } S.groups = S.groups.filter(g => g.id !== el.dataset.v); save(); render(); };
ACT['grp-msg'] = el => { UI.msgTo = 'grp:' + el.dataset.v; go('message'); };

/* ═════════ 회원: 보호자 ═════════ */
VIEWS.parents = () => head('보호자', `보호자 앱 연결 · 출결 · 청구서 수신 ${guideRef('features/member/parents.md')}`) + table(['보호자', '연락처', '자녀', '상태', ''], S.parents.map(p => [esc(p.name), esc(p.phone), mn(p.child), tag(p.status, p.status === '연결 완료' ? 'g' : 'y'), p.status !== '연결 완료' ? `<button class="btn sm" data-act="par-resend" data-v="${p.id}">요청 재발송</button>` : '']), '연결된 보호자가 없습니다.');
ACT['par-req'] = el => { S.parents.push({ id: uid('p'), child: el.dataset.v, name: M(el.dataset.v).name[0] + '○○ 보호자', phone: '010-0000-0000', status: '연결 대기 중' }); save(); toast('보호자에게 연결 요청을 보냈습니다.', 'ok'); };
ACT['par-resend'] = () => toast('연결 요청을 다시 보냈습니다.', 'ok');

/* ═════════ 회원: 운영자 · 권한 ═════════ */
const ROLE = { owner: '정운영자', sub: '부운영자', teacher: () => t('teacher') };
const rl = r => typeof ROLE[r] === 'function' ? ROLE[r]() : ROLE[r];
VIEWS.admins = () => head('운영자 · 권한', `정운영자 · 부운영자(매출 제외) · ${esc(t('teacher'))}(담당 ${esc(t('cls'))}만) ${guideRef('features/member/administrator.md')}`, owner() ? `<button class="btn pri" data-act="adm-new">+ 운영자 추가</button>` : '') +
  table(['이름', '이메일', '권한', '담당 ' + t('cls'), ''], S.admins.map(a => [esc(a.name), esc(a.email), tag(rl(a.role), a.role === 'owner' ? 'g' : ''), a.role === 'teacher' ? a.classes.map(id => esc(C(id)?.name || '')).join(', ') : '전체', owner() && a.role !== 'owner' ? `<select data-chg="adm-role" data-v="${a.id}" aria-label="권한 변경">${['sub', 'teacher'].map(r => `<option value="${r}" ${a.role === r ? 'selected' : ''}>${esc(rl(r))}</option>`).join('')}</select><button class="btn sm ghost" data-act="adm-owner" data-v="${a.id}">정운영자 위임</button><button class="btn sm ghost" data-act="adm-del" data-v="${a.id}">권한 삭제</button>` : '']).concat([])) +
  `<div class="card"><div class="ch"><b>메뉴별 권한</b><small>권한을 삭제하면 정회원으로 전환됩니다</small></div>${table(['메뉴', '정운영자', '부운영자', t('teacher')], ['class', 'members', 'message', 'community', 'sales', 'site', 'settings', 'plan'].map(id => [esc(mlabel(id)), '○', ['sales', 'plan'].includes(id) ? '×' : '○', ['class', 'members', 'community', 'message'].includes(id) ? (id === 'message' ? '○ (내역 보기 ×)' : '담당 범위') : '×']))}</div>` +
  `<div class="card"><div class="ch"><b>감사 로그</b><small>최근 20건</small></div>${table(['시각', '운영자', '작업'], S.audit.slice(0, 20).map(a => [esc(a.at), esc(a.who), esc(a.what)]))}</div>`;
ACT['adm-new'] = () => modal('운영자 추가', `<label class="fl">이름<input name="n" maxlength="20"></label><label class="fl">이메일<input name="e" type="email" maxlength="60"></label><label class="fl">권한<select name="r"><option value="sub">부운영자</option><option value="teacher">${esc(t('teacher'))}</option></select></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { if (!fv(w, 'n') || !/^[^@\s]+@[^@\s]+$/.test(fv(w, 'e'))) { toast('이름과 이메일을 확인하세요.', 'warn'); return false; } S.admins.push({ id: uid('a'), name: fv(w, 'n'), email: fv(w, 'e'), role: fv(w, 'r'), classes: [] }); logAudit(`운영자 추가 — ${fv(w, 'n')}`); save(); render(); } }]);
ACT['adm-role'] = el => { const a = S.admins.find(x => x.id === el.dataset.v); a.role = el.value; logAudit(`권한 변경 — ${a.name} → ${rl(a.role)}`); save(); render(); };
ACT['adm-del'] = el => { const a = S.admins.find(x => x.id === el.dataset.v); S.admins = S.admins.filter(x => x !== a); logAudit(`운영자 권한 삭제 — ${a.name}(정회원 전환)`); save(); render(); };
ACT['adm-owner'] = el => { const a = S.admins.find(x => x.id === el.dataset.v); modal('정운영자 위임', `<p><b>${esc(a.name)}</b>님에게 정운영자를 위임하면 현재 계정은 부운영자가 됩니다. 요금제 변경과 운영자 지정은 정운영자만 할 수 있습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '위임', kind: 'red', run: () => { S.admins.forEach(x => { if (x.role === 'owner') x.role = 'sub'; }); a.role = 'owner'; logAudit(`정운영자 위임 — ${a.name}`); save(); render(); } }]); };

/* ═════════ 메시지 ═════════ */
const AUTO_TALK = [['가입 완료', '가입 즉시'], ['결제 · 수강신청 완료', '결제 직후'], ['라이브 강의 안내', '3일 전 · 당일 오전 9시'], ['청구서 발송 · 미납 알림', '발송 시 · 마감 전'], ['수강 독려', '설정한 조건'], ['배지 발급', '발급 시']];
VIEWS.message = () => head('메시지', `앱 푸시 + 이메일 동시 발송 · 개별 / ${esc(t('group'))} / ${esc(t('cls'))} / 전체${S.org.type === 'k12' ? ' / 보호자' : ''} ${guideRef('features/message.md')}`) +
  `<div class="grid g2"><div class="card"><div class="ch"><b>새 메시지</b></div>
    <label class="fl">받는 사람<select id="msgTo">${[['all', '전체 ' + t('learner')], ...S.groups.map(g => ['grp:' + g.id, t('group') + ' · ' + g.name]), ...S.classes.map(c => ['cls:' + c.id, t('cls') + ' · ' + c.name]), ...(S.org.type === 'k12' ? [['par', '보호자 전체']] : [])].map(([v, l]) => `<option value="${esc(v)}" ${UI.msgTo === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="fl">제목<input id="msgT" maxlength="60" value="${esc(UI.msgDraftT || '')}"></label>
    <label class="fl">내용 <button type="button" class="btn sm ai" data-act="ai-msg">✦ AI SAM 작성</button><textarea id="msgB" rows="6" maxlength="2000">${esc(UI.msgDraft || '')}</textarea></label>
    <label class="fl">이미지(선택)<input type="file" accept="image/*" id="msgImg"></label>
    <button class="btn pri" data-act="msg-send">발송</button><p class="mini">발송 건수는 플랜별 한도가 있습니다. ${esc(t('teacher'))}은 발송할 수 있지만 내역은 볼 수 없습니다.</p></div>
    <div class="card"><div class="ch"><b>알림톡 자동 발송</b><small>고정 템플릿 · 수정/수동 발송 불가</small></div>${AUTO_TALK.map(([a, b]) => `<div class="row"><span>${esc(a)}</span><small>${esc(b)}</small></div>`).join('')}<p class="mini">개별 알림톡 · SMS 수동 발송은 지원하지 않습니다. 반복 안내는 업무 자동화에서 조건별로 자동 발송하세요.</p><button class="btn sm" data-act="go" data-v="auto">업무 자동화 열기</button></div></div>` +
  (S.me.role === 'teacher' ? '' : `<div class="card"><div class="ch"><b>발송 내역</b></div>${table(['일시', '받는 사람', '제목', '채널', '인원'], S.msgs.map(m => [esc(m.at), esc(m.to), esc(m.title), esc(m.ch), m.n + '명']))}</div>`);
function recipients(to) { if (to === 'all') return S.members.map(m => m.id); if (to === 'par') return S.parents.map(p => p.child); const [k, id] = to.split(':'); return k === 'grp' ? S.members.filter(m => m.group === id).map(m => m.id) : (C(id)?.learners || []); }
function toLabel(to) { if (to === 'all') return '전체'; if (to === 'par') return '보호자 전체'; const [k, id] = to.split(':'); return k === 'grp' ? S.groups.find(g => g.id === id)?.name : C(id)?.name; }
ACT['msg-send'] = () => { const to = $('#msgTo').value, tt = $('#msgT').value.trim(), b = $('#msgB').value.trim(); if (!tt || !b) { toast('제목과 내용을 입력하세요.', 'warn'); return; } const n = recipients(to).length; modal('발송 확인', `<p><b>${esc(toLabel(to))}</b> ${n}명에게 앱 푸시 + 이메일로 발송합니다.</p><div class="pvmsg"><b>${esc(tt)}</b><p>${esc(b).replace(/\n/g, '<br>')}</p></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '발송', kind: 'pri', run: () => { S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: toLabel(to), title: tt, ch: '앱 푸시 + 이메일', n }); UI.msgDraft = UI.msgDraftT = ''; logAudit(`메시지 발송 — ${tt} (${n}명)`); save(); render(); toast(`${n}명에게 발송했습니다(데모).`, 'ok'); } }]); };

/* ═════════ 커뮤니티 ═════════ */
VIEWS.community = () => { const b = UI.comB || '커뮤니티'; const L = S.posts.filter(p => p.board === b);
  return head('커뮤니티', `커뮤니티(질문/이야기) · 게시판 · 공지사항 · 학습노트 · 수강후기 ${guideRef('features/community.md')}`, `<button class="btn ai" data-act="ai-reply-all">✦ 미답변 질문 답변 초안</button>`) + tabs('comB', ['커뮤니티', '게시판', '공지사항', '학습노트', '수강후기'].map(x => [x, x]), b) +
    (b === '공지사항' ? `<div class="bar2"><button class="btn sm pri" data-act="notice-new">+ 공지 작성</button></div>` + table(['제목', '작성일', '고정'], (S.notices || []).map(n => [esc(n.title), n.at, n.pin ? tag('상단 고정', 'g') : '']), '공지가 없습니다.')
      : table(['유형', '제목', '작성자', '작성일', '조회', '답변', ''], L.map(p => [p.kind === '질문' ? tag('질문', 'y') : tag('이야기'), esc(p.title) + (p.hidden ? ' ' + tag('숨김', 'r') : ''), mn(p.who), p.at, p.views, p.replies ? tag('답변 완료', 'g') : (p.draft ? `✦ 초안: ${esc(p.draft.slice(0, 30))}…` : '—'), `<button class="btn sm" data-act="post-reply" data-v="${p.id}">답변</button><button class="btn sm ghost" data-act="post-hide" data-v="${p.id}">${p.hidden ? '보이기' : '숨김'}</button>`]), '글이 없습니다.')); };
ACT['post-hide'] = el => { const p = S.posts.find(x => x.id === el.dataset.v); p.hidden = !p.hidden; save(); render(); };
ACT['post-reply'] = el => { const p = S.posts.find(x => x.id === el.dataset.v); const d = p.draft || AI.reply(p); modal('답변', `<p><b>${esc(p.title)}</b> · ${mn(p.who)}</p><label class="fl">답변 <small>✦ AI 초안 — 확인 후 등록</small><textarea name="r" rows="5">${esc(d)}</textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '등록', kind: 'pri', run: w => { if (!fv(w, 'r')) return false; p.replies++; delete p.draft; save(); render(); } }]); };
ACT['ai-reply-all'] = () => { const L = S.posts.filter(p => p.kind === '질문' && !p.replies); L.forEach(p => p.draft = AI.reply(p)); S.ai.usage += L.length; save(); render(); toast(`${L.length}건 답변 초안을 만들었습니다.`, 'ok'); };
ACT['notice-new'] = () => modal('공지 작성', `<label class="fl">제목<input name="t" maxlength="60"></label><label class="ckl"><input type="checkbox" name="pin" checked> 상단 고정</label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '등록', kind: 'pri', run: w => { if (!fv(w, 't')) return false; (S.notices = S.notices || []).unshift({ title: fv(w, 't'), at: today(), pin: fv(w, 'pin') }); save(); render(); } }]);

/* ═════════ 상담 ═════════ */
VIEWS.consult = () => { const cats = {}; S.consults.forEach(c => cats[c.cat] = (cats[c.cat] || 0) + 1);
  return head('상담', `채널톡 전화 · 채팅 연동 · 대면 상담 녹음 → 텍스트 변환 · AI 요약 ${guideRef('features/consulting.md')}`, `<button class="btn pri" data-act="cs-start">대면 상담 시작</button>`) +
    `<section class="grid g3">${kpi('총 상담', S.consults.length + '건', '최근 6개월')}${kpi('진행 중', S.consults.filter(c => c.status === '진행 중').length + '건')}${kpi('AI 요약 완료', S.consults.filter(c => c.summary).length + '건', '', 'g')}</section>` +
    `<div class="card"><div class="ch"><b>카테고리별 유입</b></div>${Object.entries(cats).map(([k, v]) => `<div class="row"><span>${esc(k)}</span>${bar(v / S.consults.length * 100)}<b>${v}</b></div>`).join('')}</div>` +
    table(['일시', '채널', '카테고리', '상담 대상', '제목', 'AI 요약', ''], S.consults.map(c => [c.at, esc(c.ch), esc(c.cat), mn(c.who), esc(c.title), c.summary ? esc(c.summary.slice(0, 40)) + '…' : '—', `<button class="btn sm ai" data-act="cs-sum" data-v="${c.id}">✦ 요약</button>`])) + `<p class="mini">저장된 상담 내역은 삭제 · 공유할 수 없습니다. 녹음 파일 2GB 이하. 대면 상담 STT는 별도 요금입니다.</p>`; };
ACT['cs-start'] = () => modal('대면 상담', `<div class="form2"><label>제목<input name="t" maxlength="40"></label><label>상담 대상<select name="w">${S.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label><label>카테고리<input name="c" maxlength="20" value="학습 상담"></label></div><label class="fl">상담 내용(실제 운영: 녹음 → 자동 텍스트 변환)<textarea name="x" rows="5" placeholder="상담 내용을 입력하거나 녹음 파일을 올리면 텍스트로 변환됩니다."></textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '종료 · 저장', kind: 'pri', run: w => { const c = { id: uid('cs'), at: today(), who: fv(w, 'w'), ch: '대면 상담', cat: fv(w, 'c') || '미지정', title: fv(w, 't') || '대면 상담', text: fv(w, 'x'), summary: '', status: '완료' }; c.summary = AI.consultSum(c); S.consults.unshift(c); save(); render(); toast('저장하고 AI 요약을 만들었습니다.', 'ok'); } }]);
ACT['cs-sum'] = el => { const c = S.consults.find(x => x.id === el.dataset.v); c.summary = c.summary || AI.consultSum(c); S.ai.usage++; save(); modal('AI 상담 요약', `<div class="aibox">${esc(c.summary).replace(/\n/g, '<br>')}</div>`, [{ id: 'c', label: '닫기' }, { id: 'task', label: '다음 할 일을 자동화로', kind: 'pri', run: () => { UI.autoPrefill = `${M(c.who)?.name} 상담 후속: ` + c.title; go('auto'); } }]); render(); };

/* ═════════ 매출 · 청구서 ═════════ */
VIEWS.sales = () => { const pg = S.settings.pg; const ok = S.pays.filter(p => p.status === '결제 완료');
  return head('매출 관리', `PG 선택 · 결제 내역 · 환불 승인/거절 ${guideRef('features/sales.md')}`, `<button class="btn" data-act="sales-xls">내려받기</button>`) +
    `<div class="grid g2">${[['toss', '토스페이먼츠', '직접 계약 · 정산 2~3일 · 청구서 · 구독 · 부분 환불 가능', '심사 최대 4주 · 상점 ID 입력 · 푸터 사업자 정보 6종 필수'], ['nice', '디디쌤 연결 PG(나이스페이먼츠)', '바로 시작 · 디디쌤이 대신 정산(최대 1개월)', '청구서 · 구독 불가 · 전액 환불만']].map(([k, n, a, b]) => `<button class="card pgc ${pg === k ? 'on' : ''}" data-act="pg" data-v="${k}" aria-pressed="${pg === k}"><b>${n}</b><span>${a}</span><small>${b}</small>${pg === k ? tag('사용 중', 'g') : ''}</button>`).join('')}</div>` +
    `<section class="grid g3">${kpi('결제 완료', won(ok.reduce((a, p) => a + p.amount, 0)), ok.length + '건', 'g')}${kpi('환불 신청', S.pays.filter(p => p.status === '환불 신청').length + '건', '', 'y')}${kpi('환불 완료', S.pays.filter(p => p.status === '환불 완료').length + '건')}</section>` +
    table(['일시', '결제자', '항목', '금액', '수단', '상태', ''], S.pays.slice(0, 40).map(p => [p.at, mn(p.who), esc(p.item), won(p.amount), esc(p.method), tag(p.status, p.status === '결제 완료' ? 'g' : p.status === '환불 신청' ? 'y' : ''), p.status === '환불 신청' ? `<button class="btn sm" data-act="rf" data-v="${p.id}" data-ok="1">승인</button><button class="btn sm ghost" data-act="rf" data-v="${p.id}">거절</button>` : '']), '결제 내역이 없습니다.'); };
ACT.pg = el => { S.settings.pg = el.dataset.v; logAudit('PG 변경 — ' + el.dataset.v); save(); render(); };
ACT.rf = el => { const p = S.pays.find(x => x.id === el.dataset.v); if (el.dataset.ok) { const part = S.settings.pg === 'toss'; modal('환불 승인', `<label class="fl">환불 금액${part ? '(부분 환불 가능)' : '(전액만 가능)'}<input name="a" type="number" min="1" max="${p.amount}" value="${p.amount}" ${part ? '' : 'readonly'}></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '승인', kind: 'pri', run: w => { p.status = '환불 완료'; p.refund = +fv(w, 'a'); logAudit(`환불 승인 — ${p.item} ${won(p.refund)}`); save(); render(); } }]); } else modal('환불 거절', `<label class="fl">거절 사유(필수)<textarea name="r" rows="3"></textarea></label><p class="mini">거절 후에는 다시 환불하기 어렵습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '거절', kind: 'red', run: w => { if (!fv(w, 'r')) { toast('사유를 입력하세요.', 'warn'); return false; } p.status = '환불 거절'; p.reason = fv(w, 'r'); logAudit('환불 거절'); save(); render(); } }]); };
ACT['sales-xls'] = () => downloadCSV(`매출_${today()}.csv`, ['일시', '결제자', '항목', '금액', '수단', '상태'], S.pays.map(p => [p.at, M(p.who)?.name, p.item, p.amount, p.method, p.status]));
const BILL_ITEMS = ['수업료', '재료비', '차량비', '급식비', '기숙사비', '모의고사비', '피복비(교복)', '기타'];
VIEWS.billing = () => head('청구서', `토스페이먼츠 전용 · 항목 8종 · 마감일 · 미납 자동 알림 · 현장 납부처리 ${guideRef('features/sales.md')}`, `<button class="btn pri" data-act="bill-new" ${S.settings.pg !== 'toss' ? 'disabled title="토스 PG 연결 필요"' : ''}>+ 청구서 만들기</button>`) +
  (S.settings.pg !== 'toss' ? `<div class="warn">청구서는 토스페이먼츠 PG에서만 쓸 수 있습니다. <a href="#" data-act="go" data-v="sales">매출 관리에서 PG 변경</a></div>` : '') +
  `<section class="grid g3">${kpi('납부 완료', S.bills.filter(b => b.status === '납부 완료').length + '건', '', 'g')}${kpi('현장 납부', S.bills.filter(b => b.status === '현장 납부').length + '건')}${kpi('미납', S.bills.filter(b => b.status === '미납').length + '건', '', 'r')}</section>` +
  table(['대상', '제목', '항목', '금액', '마감', '상태', ''], S.bills.map(b => [mn(b.who), esc(b.title), esc(b.items.map(i => i[0]).join(', ')), won(b.items.reduce((a, i) => a + i[1], 0)), b.due, tag(b.status, b.status === '미납' ? 'r' : 'g'), b.status === '미납' ? `<button class="btn sm" data-act="bill-paid" data-v="${b.id}">현장 납부처리</button>` : '']), '청구서가 없습니다.');
ACT['bill-new'] = () => modal('청구서 만들기', `<label class="fl">제목<input name="t" maxlength="30" value="${new Date().getMonth() + 2}월 수강료"></label><label class="fl">대상 ${esc(t('group'))}<select name="g">${S.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label><div class="form2">${BILL_ITEMS.map((it, i) => `<label>${it}<input type="number" min="0" step="1000" name="i${i}" value="${i === 0 ? 280000 : 0}"></label>`).join('')}</div><div class="form2"><label>납부 마감일<input type="date" name="d" value="${addDays(today(), 10)}"></label><label>미납 알림<select name="n"><option>마감 3일 전 + 당일</option><option>마감 당일</option><option>보내지 않음</option></select></label></div><p class="mini">수업료 · 교재 항목은 납부 후 수강 권한이 자동 부여됩니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '발송', kind: 'pri', run: w => { const items = BILL_ITEMS.map((n, i) => [n, +fv(w, 'i' + i) || 0]).filter(x => x[1]); const ms = S.members.filter(m => m.group === fv(w, 'g')); ms.forEach(m => S.bills.unshift({ id: uid('b'), who: m.id, title: fv(w, 't'), items, due: fv(w, 'd'), status: '미납', sent: true })); logAudit(`청구서 발송 ${ms.length}건`); save(); render(); toast(`${ms.length}명에게 청구서를 보냈습니다(알림톡).`, 'ok'); } }]);
ACT['bill-paid'] = el => { const b = S.bills.find(x => x.id === el.dataset.v); b.status = '현장 납부'; logAudit('현장 납부처리'); save(); render(); };

/* ═════════ 기관 관리 ═════════ */
VIEWS.org = () => head('기관 관리', `기관 지정 · 기관 담당자(담당 기관 상세만 열람) · 수료 · 취업 인원 ${guideRef('features/lms.md')}`, `<button class="btn pri" data-act="org-new">+ 기관 지정</button>`) +
  table(['기관', '담당자', '소속 인원', t('done'), '취업'], S.orgs.map(o => [esc(o.name), esc(o.mgr), o.n + '명', o.done + '명', o.job + '명']), '지정된 기관이 없습니다.');
ACT['org-new'] = () => modal('기관 지정', `<label class="fl">기관명<input name="n" maxlength="30"></label><label class="fl">기관 담당자 이메일<input name="m" type="email"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '지정', kind: 'pri', run: w => { if (!fv(w, 'n')) return false; S.orgs.push({ id: uid('o'), name: fv(w, 'n'), mgr: fv(w, 'm') || '미지정', n: 0, done: 0, job: 0 }); save(); render(); } }]);

/* ═════════ 플랜 ═════════ */
VIEWS.plan = () => head('플랜 · 결제', `요금제 변경은 정운영자만 · 체험 2주 전체 기능 ${guideRef('features/plan.md')}`) +
  `<div class="grid g3">${[['standard', '스탠다드', '무료', '회차 클래스 · 기본 기능'], ['premium', '프리미엄', '월 30만원', '전체 기능 · AI SAM · 자동화'], ['enterprise', '엔터프라이즈', '협의', '기업 · 공공 · 대학 권장 · 기관 관리 · 전용 지원']].map(([k, n, p, d]) => `<div class="card plan ${S.org.plan === k ? 'on' : ''}"><b>${n}</b><strong>${p}</strong><small>${d}</small><button class="btn sm ${S.org.plan === k ? '' : 'pri'}" data-act="plan" data-v="${k}" ${S.org.plan === k ? 'disabled' : ''}>${S.org.plan === k ? '사용 중' : '변경'}</button></div>`).join('')}</div>` +
  `<div class="card"><div class="ch"><b>부가 옵션</b></div>${[['커스텀 도메인', '연결 2~3일'], ['저장 공간 추가', '요금제별 기본 용량 초과 시'], ['학습자 인원 추가', '100명 단위'], ['CDN 가속', '대용량 영상'], ['디지털 배지 플랜', 'Open Badge 3.0'], ['온보딩 패키지', '150만원(VAT 별도)'], ['마이그레이션 지원', '100만원(VAT 별도)']].map(([a, b]) => `<div class="row"><span>${a}</span><small>${b}</small></div>`).join('')}</div>`;
ACT.plan = el => { S.org.plan = el.dataset.v; logAudit('요금제 변경 — ' + el.dataset.v); save(); render(); toast('요금제를 변경했습니다(데모).', 'ok'); };

/* ═════════ 설정 ═════════ */
VIEWS.settings = () => { const tb = UI.settings || 'menu'; const st = S.settings;
  const T = [['menu', '메뉴 설정'], ['type', '기관 유형'], ['service', '서비스 설정'], ['home', '홈페이지 설정'], ['popup', '팝업'], ['consult', '상담 설정'], ['terms', '약관'], ['cover', '기능 맵'], ['data', '데이터']];
  let b = '';
  if (tb === 'menu') b = `<p class="mini">필요 없는 메뉴는 끄고, 끌어서(또는 ↑↓) 순서를 바꾸세요. 바꾼 순서는 바로 왼쪽 메뉴에 반영됩니다. 홈 · 설정은 끌 수 없습니다.</p>
    <div class="bar2"><label class="ckl"><input type="checkbox" data-chg="grpHeads" ${S.ui.groupHeads ? 'checked' : ''}> 메뉴 그룹 제목 표시</label><button class="btn sm" data-act="menu-reset">${esc(TYPES[S.org.type].name)} 추천 구성으로 되돌리기</button></div>
    <ul class="medit" id="medit">${S.menu.map((m, i) => { const d = MENU[m.id]; const foreign = d.only && d.only !== S.org.type; return `<li draggable="true" data-i="${i}" class="${m.on ? '' : 'off'}"><span class="hdl" aria-hidden="true">⋮⋮</span><i>${d.icon}</i><b>${esc(mlabel(m.id))}</b>${d.only ? tag(TYPES[d.only].name + ' 전용', foreign ? '' : 'g') : ''}${d.owner ? tag('정운영자') : ''}<small>${esc(d.grp)}</small><span class="sp"></span><button class="btn sm ghost" data-act="menu-mv" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="menu-mv" data-v="${i}" data-d="1" aria-label="아래로">↓</button><label class="sw" title="${d.lock ? '끌 수 없는 메뉴' : '켜기/끄기'}"><input type="checkbox" ${m.on ? 'checked' : ''} ${d.lock ? 'disabled' : ''} data-chg="menu-on" data-v="${i}" aria-label="${esc(mlabel(m.id))} 켜기"><span></span></label></li>`; }).join('')}</ul>`;
  if (tb === 'type') b = `<p class="mini">유형을 바꾸면 추천 메뉴 구성 · 순서 · 용어가 그 유형에 맞게 바뀝니다. 데이터는 그대로 유지됩니다.</p><div class="tgrid">${Object.entries(TYPES).map(([k, v]) => `<button class="tcard ${S.org.type === k ? 'on' : ''}" data-act="type-chg" data-v="${k}"><span class="ti">${v.icon}</span><b>${esc(v.name)}</b><p>${esc(v.desc)}</p><small>${esc(TERMS[k].learner)} · ${esc(TERMS[k].cls)} · ${esc(TERMS[k].group)}</small></button>`).join('')}</div><div class="danger"><button class="btn sm red" data-act="reset-all">기관 초기화(데모 데이터 삭제 후 가입 화면으로)</button></div>`;
  if (tb === 'service') b = `<div class="form2"><label>홈페이지 공개 유형<select data-chg="st" data-k="siteOpen"><option value="public" ${st.siteOpen === 'public' ? 'selected' : ''}>누구나 둘러보고 가입</option><option value="private" ${st.siteOpen === 'private' ? 'selected' : ''}>운영자가 초대한 회원만</option></select></label><label>가입 설정<select data-chg="st" data-k="join">${['자동 수락', '운영자 수락', '운영자 초대만'].map(v => `<option ${st.join === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>재생 속도 최소<select data-chg="st" data-k="speedMin">${[0.5, 0.75, 1].map(v => `<option ${st.speedMin == v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>재생 속도 최대<select data-chg="st" data-k="speedMax">${[1.25, 1.5, 2].map(v => `<option ${st.speedMax == v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>수강후기 작성 조건<select data-chg="st" data-k="reviewCond">${['누구나', '수강 중', '진도 50% 이상', '수료 시', '작성 불가'].map(v => `<option ${st.reviewCond === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="ckl"><input type="checkbox" data-chg="st" data-k="marketing" ${st.marketing ? 'checked' : ''}> 마케팅 수신 동의 받기</label><label class="ckl"><input type="checkbox" data-chg="st" data-k="nudge" ${st.nudge ? 'checked' : ''}> 수강 독려 메시지 사용</label></div><p class="mini">홈페이지 이름 · 주소는 개설 후 한 번만 바꿀 수 있습니다. 현재 주소: ${esc(S.org.domain)}</p>`;
  if (tb === 'home') b = `<div class="form2"><label>SEO 제목(30자)<input maxlength="30" value="${esc(st.seo.title)}" data-chg="seo" data-k="title"></label><label>SEO 설명(160자)<input maxlength="160" value="${esc(st.seo.desc)}" data-chg="seo" data-k="desc"></label><label>키워드(20개 이내, 쉼표)<input value="${esc(st.seo.kw)}" data-chg="seo" data-k="kw"></label><label>픽셀 코드(측정 ID만)<input value="${esc(st.pixel)}" data-chg="st" data-k="pixel" maxlength="40" placeholder="예: G-XXXXXXX"></label></div><button class="btn sm ai" data-act="ai-seo">✦ AI SEO 제안</button><div class="card"><div class="ch"><b>도메인</b></div><div class="row"><span>디디쌤 도메인</span><code>${esc(S.org.domain)}</code></div><p class="mini">가비아 · 카페24 · NHN 도메인 포워딩 가이드에 따라 연결합니다. 적용까지 2~3일 걸립니다(유료 옵션).</p></div><div class="card"><div class="ch"><b>푸터 · 사업자 정보</b><small>PG 심사 · 통신판매업 표시 필수 6종</small></div><div class="form2">${[['company', '상호'], ['ceo', '대표자'], ['biz', '사업자등록번호'], ['mail', '통신판매업 신고번호'], ['addr', '주소'], ['tel', '연락처'], ['reg', S.org.type === 'k12' || S.org.type === 'adult' ? '학원설립 · 운영 등록번호' : S.org.type === 'voc' ? '훈련기관 인정번호' : S.org.type === 'lifelong' ? '평생교육시설 신고번호' : '기타 등록번호']].map(([k, l]) => `<label>${esc(l)}<input maxlength="60" value="${esc(st.footer[k])}" data-chg="footer" data-k="${k}"></label>`).join('')}</div></div>`;
  if (tb === 'popup') b = `<div class="bar2"><button class="btn sm pri" data-act="popup-new" ${st.popups.length >= 4 ? 'disabled' : ''}>+ 팝업 추가 (${st.popups.length}/4)</button></div>` + table(['제목', '기간', '노출'], st.popups.map(p => [esc(p.t), `${p.s} ~ ${p.e}`, tag('노출', 'g')]), '팝업이 없습니다.');
  if (tb === 'consult') b = `<div class="form2"><label class="ckl"><input type="checkbox" data-chg="st" data-k="consultKeys" ${st.consultKeys ? 'checked' : ''}> 채널톡 연동(클라이언트 키 · 시크릿 키는 서버에만 저장)</label><label class="ckl"><input type="checkbox" data-chg="st" data-k="kakao" ${st.kakao ? 'checked' : ''}> 카카오 비즈니스 채널 연동</label></div><p class="mini">연동 해제는 디디쌤 고객센터에 요청합니다. 카테고리는 상위 &gt; 하위 2단 구조입니다.</p>`;
  if (tb === 'terms') b = `<label class="fl">이용약관(학습비 · 수강료 반환 기준 포함) <button class="btn sm ai" data-act="ai-terms">✦ 유형별 초안</button><textarea rows="6" data-chg="terms" data-k="tos">${esc(st.terms.tos)}</textarea></label><label class="fl">개인정보 처리방침<textarea rows="5" data-chg="terms" data-k="privacy">${esc(st.terms.privacy)}</textarea></label><p class="mini">AI 초안은 참고용이며 게시 전 법률 검토가 필요합니다.</p>`;
  if (tb === 'cover') b = coverage();
  if (tb === 'data') b = `<p class="mini">데모 데이터는 이 브라우저의 저장소에만 있습니다. 실제 운영 모드에서는 Firebase(서울 리전) 서버에 저장되며, 대학 유형은 학번 · 학과만 저장하고 학교 SSO로 연계합니다.</p><button class="btn" data-act="data-export">전체 데이터 JSON 내보내기</button>`;
  return head('설정', '메뉴 구성 · 기관 유형 · 서비스 · 홈페이지 · 팝업 · 상담 · 약관') + tabs('settings', T, tb) + b; };
ACT.st = el => { S.settings[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; save(); toast('저장했습니다.', 'ok'); };
ACT.seo = el => { S.settings.seo[el.dataset.k] = el.value; save(); };
ACT.footer = el => { S.settings.footer[el.dataset.k] = el.value; save(); };
ACT.terms = el => { S.settings.terms[el.dataset.k] = el.value; save(); };
ACT.grpHeads = el => { S.ui.groupHeads = el.checked; save(); render(); };
ACT['menu-on'] = el => { S.menu[+el.dataset.v].on = el.checked; save(); render(); };
ACT['menu-mv'] = el => { const i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= S.menu.length) return; [S.menu[i], S.menu[j]] = [S.menu[j], S.menu[i]]; save(); render(); };
ACT['menu-reset'] = () => { S.menu = presetMenu(S.org.type); save(); render(); toast('추천 구성으로 되돌렸습니다.', 'ok'); };
ACT['type-chg'] = el => { const k = el.dataset.v; if (k === S.org.type) return; modal('기관 유형 변경', `<p><b>${esc(TYPES[k].name)}</b> 유형으로 바꾸면 메뉴 구성 · 순서 · 용어가 바뀝니다. 데이터는 유지됩니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '변경', kind: 'pri', run: () => { S.org.type = k; S.menu = presetMenu(k); S.autos = [...S.autos.filter(a => a.custom), ...defaultAutos(k)]; logAudit('기관 유형 변경 — ' + TYPES[k].name); save(); render(); } }]); };
ACT['reset-all'] = () => modal('기관 초기화', '<p>이 브라우저에 저장된 데모 데이터를 모두 지우고 가입 화면으로 돌아갑니다.</p>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '초기화', kind: 'red', run: () => { Store.clear(); S = null; SU = { step: 1, type: '', name: '', email: '' }; history.replaceState(null, '', location.pathname); render(); } }]);
ACT['popup-new'] = () => modal('팝업 추가', `<label class="fl">제목<input name="t" maxlength="40"></label><div class="form2"><label>시작<input type="date" name="s" value="${today()}"></label><label>종료<input type="date" name="e" value="${addDays(today(), 14)}"></label></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { if (!fv(w, 't')) return false; S.settings.popups.push({ t: fv(w, 't'), s: fv(w, 's'), e: fv(w, 'e') }); save(); render(); } }]);
ACT['data-export'] = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.download = `didisam_demo_${today()}.json`; a.click(); };
/* 메뉴 드래그 정렬 */
AFTER.push(() => { const ul = $('#medit'); if (!ul) return; let from = -1;
  ul.addEventListener('dragstart', e => { const li = e.target.closest('li'); from = +li.dataset.i; li.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  ul.addEventListener('dragover', e => { e.preventDefault(); const li = e.target.closest('li'); $$('li', ul).forEach(x => x.classList.toggle('over', x === li)); });
  ul.addEventListener('drop', e => { e.preventDefault(); const li = e.target.closest('li'); if (!li || from < 0) return; const to = +li.dataset.i; const [it] = S.menu.splice(from, 1); S.menu.splice(to, 0, it); save(); render(); });
  ul.addEventListener('dragend', () => $$('li', ul).forEach(x => x.classList.remove('drag', 'over'))); });

/* 디디쌤 가이드 대비 기능 맵 — 누락 점검용 */
const COVER = [
  ['홈 대시보드: 오늘의 할 일 · 온보딩 · 수료율 추이 · 장기 미접속 · Top10 · 엑셀', 'dash', 'features/dashboard.md'],
  ['클래스 유형: 기간(단일/과정) · 회차(요일반/특강반/회차 차감반) · 구독', 'class', 'features/class/type.md'],
  ['클래스 만들기 3단계: 수업 정보 → 커리큘럼 → 설정', 'class', 'features/class/makedurationclass.md'],
  ['커리큘럼: 동영상 · 라이브 · 오프라인 · 퀴즈 · 시험 · 과제 · 설문 · 챕터', 'class', 'features/class/makedurationclass/curriculum.md'],
  ['수료 기준(항목별 비율) · 수료증 자동/수동', 'class', 'features/class/makedurationclass.md'],
  ['설정: 수강료 · 공개 대상 · 커뮤니티 권한 · 건너뛰기 · 배속 · 사전 수강신청', 'class', 'features/class/makedurationclass.md'],
  ['운영 탭: 수강생 · 커리큘럼/회차 · 평가 · 공지사항', 'class', 'features/class/operate.md'],
  ['수강 기간 연장 · 권한 부여(개인/팀) · 권한 제외 · 수강현황 내려받기', 'class', 'features/class/operate.md'],
  ['클래스 복사(만료 후 재판매 대안)', 'class', 'faq/undefined.md'],
  ['출결패드(휴대폰 끝 4자리) · 수동 출결 변경', 'attend', 'features/class/operate.md'],
  ['시험 규칙(600분 · 재응시 · 배점 100) · 채점', 'assess', 'features/class/makedurationclass/curriculum.md'],
  ['수료증 설정(대표자 15자 · 기관 20자 · 날인 · 로고 · 닉네임) · 디자인 2종 · 수동 발급', 'cert', 'faq/undefined.md'],
  ['디지털 배지(Open Badge 3.0) · 디자인 · 생성 · 수동 발급 · 발급 내역', 'badge', 'features/digitalbadge.md'],
  ['교재/교구: 전자책 · 실물 · 다운로드 현황 · 전달 체크 · 환불 규칙', 'book', 'features/book.md'],
  ['콘텐츠 라이브러리: 동영상 · 문서 · 사진 · 사용 중 삭제 불가', 'library', 'features/library.md'],
  ['수강생 관리: 정회원 · 준회원 · 승인 대기 · 일괄 승인 · 상세(기본/클래스/결제/작성글)', 'members', 'features/member/student.md'],
  ['초대: 연락처(알림톡) · 링크 · 이메일 · 일괄 가입(100명)', 'members', 'features/member/invite.md'],
  ['추가 질문(최대 6개) · 엑셀 내려받기(비밀번호)', 'members', 'features/member/student.md'],
  ['팀 관리(반 · 부서 · 학과) · 팀 단위 권한 · 메시지', 'groups', 'features/member/team.md'],
  ['보호자 연결 · 연결 상태 · 운영자 연결 요청', 'parents', 'features/member/parents.md'],
  ['운영자: 정운영자 · 부운영자 · 강사 · 권한 회수 · 위임 · 메뉴별 권한', 'admins', 'features/member/administrator.md'],
  ['AI SAM: 교육 목표 · 썸네일 · 커리큘럼 · 영상 추천 · 스크립트/요약 · 퀴즈 · 교재 썸네일', 'aisam', 'features/ai-sam.md'],
  ['메시지: 앱 푸시 + 이메일 · 대상 5종 · 이미지 · 발송 내역 · 알림톡 자동 발송', 'message', 'features/message.md'],
  ['매출: 토스 / 디디쌤 연결 PG · 결제 내역 · 환불 승인/거절(사유 필수) · 부분 환불', 'sales', 'features/sales.md'],
  ['청구서: 항목 8종 · 마감일 · 미납 알림 · 현장 납부처리', 'billing', 'features/sales.md'],
  ['상담: 채널톡 전화/채팅 · 대면 상담 녹음 → 텍스트 · 통계 · AI 요약', 'consult', 'features/consulting.md'],
  ['홈페이지 디자인: 브랜드 컬러 · 상단 메뉴 · 섹션 12종 · 푸터 · 접근 권한', 'site', 'features/homepage-design.md'],
  ['커뮤니티 · 게시판 · 공지사항 · 학습노트 · 수강후기', 'community', 'features/community.md'],
  ['서비스 설정: 공개 유형 · 가입 방식 · 마케팅 동의 · 재생 속도 · 후기 조건 · 수강 독려', 'settings', 'features/set-up.md'],
  ['홈페이지 설정: SEO · 도메인 · 픽셀 / 팝업(4개) / 상담 설정 / 약관', 'settings', 'features/set-up.md'],
  ['기관 관리: 기관 지정 · 목록 · 상세(수료 · 취업)', 'org', 'features/lms.md'],
  ['플랜: 스탠다드 · 프리미엄 · 엔터프라이즈 · 부가 옵션', 'plan', 'features/plan.md'],
  ['[신규] 기관 유형별 메뉴 프리셋 · 용어 치환 · 메뉴 켜기/끄기 · 순서 변경', 'settings', ''],
  ['[신규] 업무 자동화: 트리거 → 조건 → 실행 · 승인 · 실행 로그', 'auto', ''],
  ['[신규] AI 홈페이지 빌더: 프롬프트 → 섹션 생성 · 편집 · 미리보기 · 게시', 'site', ''],
  ['[신규] 기업 법정의무교육 · 대학 학사/비교과 · 평생교육원 학습비/신고 · 직업훈련원 HRD-Net', 'compliance', '']
];
function coverage() { return `<p class="mini">디디쌤 가이드(196쪽) 기능이 이 어드민의 어느 메뉴에 있는지 보여 줍니다. 꺼진 메뉴도 기능은 남아 있습니다.</p>` + table(['기능', '메뉴', '상태', '가이드'], COVER.map(([f, id, g]) => [esc(f), esc(mlabel(id)), menuOn(id) ? tag('켜짐', 'g') : tag('꺼짐'), g ? guideRef(g) : tag('신규', 'g')])); }
