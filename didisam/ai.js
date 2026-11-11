/* 디디쌤 스튜디오 — AI SAM (생성 도구 + 자연어 업무 지시) · 업무 자동화 엔진
   데모: 브라우저 안 규칙 기반 생성. 실제 운영: 서버 함수(adminAssistant)가 Claude Haiku 5.5/Sonnet 5.5를 호출하고
   API 키는 서버에만 둔다. 모든 실행은 미리보기 → 운영자 승인 → 실행 → 로그 순서. */
'use strict';
const KW = [['엑셀', 'excel spreadsheet'], ['AI', 'artificial intelligence'], ['생성형', 'generative ai'], ['수학', 'mathematics'], ['영어', 'english study'], ['과학', 'science lab'], ['데이터', 'data analytics'], ['리더십', 'leadership team'], ['안전', 'workplace safety'], ['개인정보', 'data privacy'], ['성희롱', 'respectful workplace'], ['장애인', 'inclusion'], ['웹', 'web development'], ['전기', 'electrician'], ['공장', 'smart factory'], ['바리스타', 'barista coffee'], ['스마트폰', 'smartphone senior'], ['인문', 'humanities books'], ['창업', 'startup'], ['노션', 'productivity workspace'], ['영상', 'video editing'], ['컴활', 'computer certificate'], ['프롬프트', 'prompt engineering'], ['국어', 'korean reading'], ['복지', 'social welfare'], ['온보딩', 'onboarding new employee'], ['캡스톤', 'capstone project']];
/* 기관 유형 용어 + 받침에 맞는 조사: tj('cls', '을') → '교과목을' · '강좌를' (호출 시점에 AI가 있으므로 앞에서 선언해도 된다) */
function tj(k, p) { const w = t(k); return w + AI.j(w, p); }
const AI = {
  /* 받침에 맞는 조사(을/를 · 이/가 · 은/는 · 과/와 · 으로/로). polish.js의 fixJosa와 같은 규칙 — 이 파일이 먼저 로드되므로 여기 둔다 */
  j(w, p) { const s = String(w == null ? '' : w).replace(/[\s」』"'\)\]]+$/, ''); const ch = s.slice(-1); const c = ch.charCodeAt(0); const ro = p === '으로';
    const has = c >= 0xAC00 && c <= 0xD7A3 ? (ro ? ((c - 0xAC00) % 28 !== 0 && (c - 0xAC00) % 28 !== 8) : (c - 0xAC00) % 28 !== 0) : /[0-9]/.test(ch) ? (ro ? '0136' : '013678').includes(ch) : (ro ? /[mn]/i : /[lmn]/i).test(ch);
    const P = { 을: ['을', '를'], 이: ['이', '가'], 은: ['은', '는'], 과: ['과', '와'], 으로: ['으로', '로'] }[p] || [p, p]; return has ? P[0] : P[1]; },
  /* 문장 안의 '을(를)' 등 겹 조사를 앞말 받침에 맞게 고친다 */
  jfix(str) { return typeof str !== 'string' || !str.includes('(') ? str : str.replace(/([가-힣A-Za-z0-9])([」』"'\)\]]*)(을\(를\)|이\(가\)|은\(는\)|과\(와\)|으로\(로\))/g, (m, ch, q, x) => ch + q + AI.j(ch, x === '으로(로)' ? '으로' : x.slice(0, 1))); },
  thumb(n) { const hit = KW.filter(([k]) => n.includes(k)).map(x => x[1]); return (hit.length ? hit : ['online class', 'learning']).concat(['flat illustration', 'green']).slice(0, 4).join(', '); },
  goal(n, target) {
    const who = target || `${t('learner')}`; const core = n.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    return `[교육 목표]\n- ${who}${AI.j(who, '이')} ${core}의 핵심 개념을 이해하고 실무에 바로 적용한다.\n- 과정 종료 시 스스로 결과물 1건을 완성하고 동료와 공유할 수 있다.\n\n[주요 내용]\n1) ${core} 기초 개념과 용어\n2) 현장 사례로 보는 활용 흐름\n3) 단계별 실습과 피드백\n4) 최종 과제와 평가`;
  },
  curriculum(n) {
    const core = n.replace(/\(.*?\)|\[.*?\]/g, '').trim(); const I = (type, title) => ({ id: uid('it'), type, title });
    return [I('chapter', `1장 ${core} 시작하기`), I('video', '오리엔테이션: 이 과정에서 얻는 것'), I('video', `${core} 핵심 개념`), I('quiz', '개념 확인 퀴즈 (5문항)'), I('chapter', '2장 사례로 이해하기'), I('video', '현장 사례 분석'), I('video', '자주 하는 실수와 해결'), I('chapter', '3장 직접 해보기'), I('video', '실습 따라하기'), I('assign', '실습 결과물 제출'), I('chapter', '4장 마무리'), I('exam', '최종 평가 (20문항)'), I('survey', '과정 만족도 설문')];
  },
  script(title) { return { script: `안녕하세요. 이번 시간에는 「${title}」을 다룹니다. 먼저 왜 이 내용이 필요한지 살펴보고, 핵심 개념 세 가지를 예시와 함께 설명한 뒤 마지막에 짧게 정리하겠습니다. …`, summary: `• 「${title}」의 목적과 필요성\n• 핵심 개념 3가지와 예시\n• 실무 적용 시 주의할 점\n• 다음 시간 예고` }; },
  quiz(title, n = 5, level = '보통', kind = '객관식') {
    const core = title.replace(/^\d+\.\s*/, ''); return Array.from({ length: n }, (_, i) => ({ q: `${i + 1}. 「${core}」에 대한 설명으로 ${i % 2 ? '옳지 않은' : '가장 알맞은'} 것은? (${level})`, opts: kind === 'OX' ? ['O', 'X'] : ['핵심 원리를 실무 예시에 적용한다', '절차를 생략하고 결과만 확인한다', '용어의 정의를 혼동해 사용한다', '피드백 없이 반복한다'], a: kind === 'OX' ? (i % 2 ? 'X' : 'O') : (i % 2 ? '2' : '1') }));
  },
  gradeDraft(c, id) { const p = c.prog[id]; const s = clamp(Math.round(60 + (p.p || 50) * .35 + ((id.charCodeAt(1) * 7) % 10)), 0, 100); return { score: s, note: s >= 85 ? '요구사항 충족 · 완성도 높음' : s >= 70 ? '핵심 충족 · 근거 보완 필요' : '필수 항목 일부 누락', rubric: '요구사항 충족 40 · 정확성 30 · 완성도 20 · 형식 10', feedback: s >= 85 ? '과제 요구사항을 모두 충족했습니다. 실무 사례를 하나 더 붙이면 더 좋습니다.' : '핵심 내용은 잘 정리했습니다. 근거 자료와 결과 화면을 보완해 주세요.' }; },
  reply(p) { return `${M(p.who)?.nick || ''}님, 질문 남겨 주셔서 감사합니다.\n「${p.title}」 관련해서는 해당 강의의 핵심 개념 부분(강의 자료 2쪽)을 먼저 확인해 주세요. 그래도 해결되지 않으면 화면을 캡처해 댓글로 남겨 주시면 ${t('teacher')}이 이어서 답변드리겠습니다.`; },
  consultSum(c) { return `요약: ${M(c.who)?.name}님 「${c.title}」 상담. ${c.cat} 관련 문의로 현재 수강 상황과 일정을 확인함.\n키워드: ${c.cat}, 일정, 수강 상태\n다음 할 일: ① 안내 메시지 발송(1일 이내) ② 1주 후 진도 재확인 ③ 필요 시 ${t('teacher')} 면담 연결`; },
  msg(purpose = '') { const tt = purpose || '이번 주 학습 안내'; return { title: tt, body: `안녕하세요, ${S.org.name}입니다.\n${tt} 드립니다.\n\n• 이번 주 학습: 진행 중인 ${t('cls')}의 다음 강의를 확인해 주세요.\n• 마감: 과제 · 퀴즈는 기한 내 제출 부탁드립니다.\n• 문의: 커뮤니티 질문 게시판 또는 상담 채널을 이용해 주세요.\n\n감사합니다.` }; },
  report(m) { const cs = S.classes.filter(c => c.prog[m.id]); const ps = cs.map(c => c.prog[m.id].p); const avg = avgOf(ps); return `${m.name} 학습 리포트 (${today()})\n수강 ${cs.length}개 · 평균 진도 ${pct(avg)}\n강점: ${cs.filter(c => c.prog[m.id].p >= 80).map(c => c.name).join(', ') || '—'}\n보완: ${cs.filter(c => c.prog[m.id].p < 40).map(c => c.name).join(', ') || '없음'}\n권장: ${avg < 50 ? '주 3회 · 회당 20분 학습 일정 제안, 다음 주 진도 재확인' : '현재 속도 유지, 심화 과정 추천'}`; },
  seo() { const ty = TYPES[S.org.type].name; return { title: `${S.org.name} | ${ty} 온라인 교육`.slice(0, 30), desc: `${S.org.name}의 ${S.classes.slice(0, 3).map(c => c.name).join(' · ')} 등 ${tj('cls', '을')} 온라인으로 수강하세요. 진도 관리와 수료증까지 한 곳에서.`.slice(0, 160), kw: [S.org.name, ty, ...S.classes.slice(0, 5).map(c => c.name.replace(/[\[\]()]/g, ''))].join(', ') }; },
  terms() { const fee = t('fee'); return `제○조(${fee} 반환)\n① 수강 시작 전 반환 신청 시 이미 낸 ${fee} 전액을 반환합니다.\n② 총 교육 시간의 1/3 경과 전: 2/3 반환, 1/2 경과 전: 1/2 반환, 1/2 경과 후: 반환하지 않습니다.\n③ 반환 사유가 발생한 날부터 5일 이내에 반환합니다.\n④ 전자책은 결제 후 7일 이내 · 다운로드 이력이 없는 경우, 실물 교재는 받기 전에 한해 환불합니다.\n※ 관계 법령(학원법 · 평생교육법 등) 기준에 맞춰 검토 후 게시하세요.`; },
  notice(topic) { return `[공지] ${topic}\n\n안녕하세요, ${S.org.name}입니다.\n${topic} 관련하여 아래와 같이 안내드립니다.\n\n1. 일정: \n2. 대상: 전체 ${t('learner')}\n3. 문의: 상담 채널\n\n감사합니다.`; },
  site(p) { return SITEGEN(p); }
};

/* ═════════ AI SAM 화면 ═════════ */
const TOOLS = [
  ['goal', '교육 목표 · 주요 내용', '클래스명과 대상으로 목표와 주요 내용을 작성', 'guide'],
  ['thumb', '썸네일 키워드 추천', '클래스 · 교재명으로 영어 이미지 키워드', 'guide'],
  ['curr', '커리큘럼 구성', '챕터 · 강의 · 퀴즈 · 과제 · 시험까지 한 번에', 'guide'],
  ['video', '강의 영상 추천', '강의 제목으로 참고 영상 검색어 추천', 'guide'],
  ['script', '강의 스크립트 · 요약', '영상 강의의 대본과 요약 생성', 'guide'],
  ['quiz', '퀴즈 생성', '난이도 · 유형 · 문항 수 지정', 'guide'],
  ['grade', 'AI 채점 초안', '루브릭 기반 점수 · 피드백 초안', 'plus'],
  ['reply', 'Q&A 답변 초안', '미답변 질문 일괄 초안', 'plus'],
  ['consult', '상담 요약 · 다음 할 일', '요약 · 키워드 · 후속 조치', 'plus'],
  ['msg', '안내 메시지 작성', '대상과 목적만 고르면 작성', 'plus'],
  ['report', '학습 리포트', `${'개인'} · ${'그룹'} 리포트`, 'plus'],
  ['risk', '이탈 위험 예측', '진도 · 접속 · 출석으로 위험군 추출', 'plus'],
  ['seo', '홈페이지 SEO', '제목 · 설명 · 키워드 제안', 'plus'],
  ['terms', '약관 · 환불 규정 초안', '유형별 법령 기준 초안', 'plus'],
  ['site', 'AI 홈페이지 생성', '한 줄 설명으로 홈페이지 섹션 구성', 'plus']
];
const EX = {
  corp: ['법정교육 미이수자에게 마감 안내 보내줘', '영업1팀 이번 달 이수 현황 요약해줘', '신규 입사자 온보딩 과정 커리큘럼 만들어줘', '매주 금요일 부서장에게 이수 리포트 보내는 자동화 만들어줘'],
  univ: ['진도 30% 미만 학생에게 독려 메시지 보내줘', '학과별 학습 현황 요약해줘', 'AI에게 질문하는 글쓰기 퀴즈 10문항 만들어줘', '매주 월요일 위험군을 지도교수에게 알리는 자동화 만들어줘'],
  k12: ['미납 보호자에게 청구서 다시 알려줘', '중2-A반 이번 주 출결 요약해줘', '결석한 원생에게 보강 영상 배정하는 자동화 만들어줘', '겨울방학 특강 공지 써줘'],
  adult: ['승인 대기 회원 모두 승인해줘', '엑셀 실무 마스터 커리큘럼 다시 짜줘', '수료한 수강생에게 후기 요청 보내는 자동화 만들어줘', '이번 달 매출 요약해줘'],
  lifelong: ['학습비 반환 신청 기한 확인해줘', '30시간 미만 강좌 찾아줘', '바리스타 과정 모집 공지 써줘', '사전 수강신청 10명 미만 강좌 알리는 자동화 만들어줘'],
  voc: ['출석률 80% 미만 훈련생에게 경고 보내줘', '이번 주 HRD-Net 보고 자료 만들어줘', '웹개발 과정 퀴즈 5문항 만들어줘', '매일 부정훈련 의심 건을 담당자에게 알리는 자동화 만들어줘']
};
/* 자연어 지시 → 실행 계획 */
/* v33 AI 요청 해석 — 수강료 · 차시(QA #48). 99000원 · 99,000원 · 9만9천원 · 10만원 · 1.5만원 · 만원 · 무료 / 6차시 · 6강 · 6회차 · 6주
   애매하면(금액이 여러 개 · 단위 없는 작은 수 · 유료인데 금액 없음 · 너무 큰 금액) amb 문구와 고를 값(opts)을 돌려준다. */
const FEE_KEY = '(?:수강료|수업료|가격|금액|비용|요금|교육비|회비|참가비|판매가|정가|할인가)';
const FEE_NUM = '(?:\\d[\\d,]*(?:\\.\\d+)?\\s*(?:억|만|천|백)?\\s*)+(?:만\\s*)?';
const SESS_RE = /(\d+)\s*(?:차시|회차|주차?|강(?![의좌사습]))/;
function krNum(s) {
  const t = String(s || '').replace(/[,\s]/g, ''); if (!t) return null; let total = 0, sect = 0, any = false;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)?(억|만|천|백)?/g)) { if (!m[0]) continue; any = true; const n = m[1] != null ? parseFloat(m[1]) : 0; const u = m[2];
    if (u === '천' || u === '백') sect += (m[1] != null ? n : 1) * (u === '천' ? 1000 : 100);
    else if (u === '만' || u === '억') { const base = sect + n; total += (base || 1) * (u === '만' ? 1e4 : 1e8); sect = 0; }
    else sect += n; }
  return any ? Math.round(total + sect) : null;
}
function aiFee(q) {
  q = String(q || ''); const found = []; const add = (raw, w) => { const v = krNum(raw); if (v == null || isNaN(v)) return; const f = found.find(x => x.v === v); if (f) f.won = f.won || w; else found.push({ v, won: w }); };
  for (const m of q.matchAll(new RegExp(`(${FEE_NUM}|(?<![\\d가-힣])만\\s*)원`, 'g'))) add(m[1], true);
  for (const m of q.matchAll(new RegExp(`${FEE_KEY}\\s*(?:은|는|이|가|:|=)?\\s*(${FEE_NUM})(?![\\d,.]|\\s*(?:억|만|천|백|원|%|명|차시|회차|주|강|회|개|분|시간|일))`, 'g'))) add(m[1], false);
  const free = /(무료|공짜|무상)/.test(q) && !/무료\s*체험/.test(q); const paid = /유료/.test(q);
  if (!found.length) { if (free) return { price: 0, txt: '무료' }; if (paid) return { amb: '유료로 만들 수강료 금액을 알려 주세요(예: 수강료 99,000원).', opts: [] }; return null; }
  if (free && found.some(f => f.v > 0)) return { amb: '「무료」와 금액이 함께 있어 수강료를 정하지 못했습니다. 어느 쪽으로 만들까요?', opts: [0, ...found.map(f => f.v).filter(v => v > 0)] };
  if (found.length > 1) return { amb: `금액이 ${found.length}개(${found.map(f => won(f.v)).join(' · ')}) 있어 어느 것이 수강료인지 알 수 없습니다. 수강료를 골라 주세요.`, opts: found.map(f => f.v) };
  const { v, won: w } = found[0];
  if (v > 0 && v < 1000) return { amb: `수강료 금액(「${v}${w ? '원' : ''}」)이 너무 작습니다. ${won(v * 10000)}(${v}만원)으로 만들까요?`, opts: [v * 10000, v] };
  if (v > 50000000) return { amb: `수강료 ${won(v)}이 맞는지 확인해 주세요.`, opts: [v] };
  return { price: v, txt: v ? won(v) : '무료' };
}
/* 요청 문장에서 수강료 · 무료 · 대상 표현을 걷어낸다(강좌 이름 · 다시 묻기 문장용) */
const feeStrip = q => String(q || '').replace(new RegExp(`${FEE_KEY}?\\s*(?:은|는|이|가|:|=)?\\s*(?:${FEE_NUM}|(?<![\\d가-힣])만\\s*)원\\S*`, 'g'), ' ').replace(new RegExp(`${FEE_KEY}\\s*(?:은|는|이|가|:|=)?\\s*(?:${FEE_NUM})?\\S*`, 'g'), ' ').replace(/(무료|공짜|무상|유료)\S*/g, ' ').replace(/\s+/g, ' ').trim();
const qnum = (q, d) => { const m = q.match(/(\d+)\s*%/); return m ? +m[1] : d; };
function interpret(q) {
  const has = (...w) => w.some(x => q.includes(x));
  const low = () => S.classes.flatMap(c => Object.entries(c.prog).filter(([, p]) => p.p < qnum(q, 30)).map(([id]) => id));
  if (has('자동화', '매주', '매일', '마다')) { const r = recipeFromText(q); return { title: `자동화 레시피 초안 — ${r.name}`, steps: [`시작 조건: ${trigLabel(r.trigger)}`, `조건: ${r.cond}`, ...r.actions.map(a => '실행: ' + ACTION[a]), r.approve ? '실행 전 운영자 승인' : '자동 실행'], cta: '자동화로 저장', run: () => { S.autos.unshift(r); return `자동화 「${r.name}」를 저장했습니다.`; }, go: 'auto' }; }
  if (has('독려', '미이수', '마감 안내', '경고')) {
    let ids, label;
    if (has('미이수', '법정')) { ids = [...new Set(legalUndone().map(x => x.id))]; label = '법정교육 미이수자'; }
    else if (has('출석', '80')) { ids = [...new Set(lowAtt().map(x => x.id))]; label = '출석률 80% 미만'; }
    else if (has('미접속', '접속')) { ids = S.members.filter(m => m.last <= addDays(today(), -30)).map(m => m.id); label = '30일 이상 미접속'; }
    else { ids = [...new Set(low())]; label = `진도 ${qnum(q, 30)}% 미만`; }
    const lg = has('미이수', '법정'); const m = lg ? legalNudgeMsg(ids) : AI.msg(has('경고') ? '출석률 관리 안내' : '학습 독려 안내');
    /* v38 대상이 0명이면 실행 버튼 없이 이유를 알린다(QA C4) */
    if (!ids.length) return { title: `${label} 0명 — 보낼 대상이 없습니다`, steps: [lg ? (S.classes.some(c => c.legal) ? '법정 의무교육 과정의 대상자가 모두 이수했습니다.' : '법정 의무교육으로 지정된 과정이 없습니다. 과정 › 설정에서 「법정 의무교육」을 켜면 대상이 잡힙니다.') : '조건에 맞는 대상이 없습니다.'] };
    return { title: `${label} ${ids.length}명에게 안내 발송`, steps: [`대상 추출: ${label} → ${ids.length}명`, '메시지 초안 작성(아래 미리보기)', '앱 푸시 + 이메일 발송', '발송 내역 · 감사 로그 기록'], preview: `<div class="pvmsg"><b>${esc(m.title)}</b><p>${esc(m.body).replace(/\n/g, '<br>')}</p><small>대상: ${ids.slice(0, 8).map(mn).join(', ')}${ids.length > 8 ? ` 외 ${ids.length - 8}명` : ''}</small></div>`, run: () => { S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: label, title: m.title, ch: '앱 푸시 + 이메일', n: ids.length }); if (has('미이수', '법정')) S.nudged = true; return `${ids.length}명에게 발송했습니다(데모).`; } };
  }
  if (has('미납', '청구서')) { const L = S.bills.filter(b => b.status === '미납'); return { title: `미납 ${L.length}건 재알림`, steps: [`미납 청구서 ${L.length}건 확인`, '보호자 · 원생에게 알림톡 재발송(청구서 템플릿)', '3일 뒤 미납이면 담당자 할 일 생성'], preview: table(['대상', '청구서', '마감'], L.map(b => [mn(b.who), esc(b.title), b.due])), run: () => { S.runs.unshift({ at: nowStr(), name: '미납 재알림', n: L.length, st: '완료' }); return `${L.length}건 재알림을 보냈습니다(데모).`; }, go: 'billing' }; }
  if (has('승인')) { const w = S.members.filter(m => m.grade === '승인 대기'); return { title: `가입 승인 대기 ${w.length}명 일괄 승인`, steps: ['승인 대기 목록 확인', '정회원으로 전환', '가입 완료 알림톡 자동 발송'], preview: `<p class="mini">${w.map(m => esc(m.name)).join(', ') || '대기 회원 없음'}</p>`, run: () => { w.forEach(m => m.grade = '정회원'); return `${w.length}명을 승인했습니다.`; } }; }
  if (has('채점')) { const P = pend(); return { title: `채점 대기 ${P.length}건 AI 초안`, steps: ['루브릭 적용', '점수 · 피드백 초안 생성', '평가 · 채점 메뉴에서 한 건씩 확정'], run: () => { P.forEach(({ c, id }) => c.prog[id].draft = AI.gradeDraft(c, id)); return `${P.length}건 초안을 만들었습니다.`; }, go: 'assess' }; }
  if (has('미답변', '답변')) { const L = S.posts.filter(p => p.kind === '질문' && !p.replies); return { title: `미답변 질문 ${L.length}건 답변 초안`, steps: ['질문 분류', '강의 자료 기반 답변 초안', '커뮤니티에서 확인 후 등록'], run: () => { L.forEach(p => p.draft = AI.reply(p)); return `${L.length}건 초안을 만들었습니다.`; }, go: 'community' }; }
  if (has('커리큘럼')) { const name = (q.match(/^(.+?)\s*(과정|강좌|교과목)?\s*커리큘럼/) || [])[1] || '새 과정'; const items = AI.curriculum(name); return { title: `「${name}」 커리큘럼 초안`, steps: [`${items.length}개 항목 구성`, `${tj('cls', '을')} '준비중' 상태로 생성`, '클래스 관리에서 수정 후 공개'], preview: `<ol class="cur sm">${items.map(i => `<li class="${i.type === 'chapter' ? 'chap' : ''}"><span class="ty">${ITEM[i.type]}</span>${esc(i.title)}</li>`).join('')}</ol>`, cta: `${tj('cls', '으로')} 만들기`, run: () => { const c = { id: uid('c'), name, kind: 'period', sub: '', status: '준비중', price: 0, open: '비공개', start: today(), end: addDays(today(), 90), teacher: S.me.name, group: '', learners: [], prog: {}, curriculum: items, criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: 'auto', skip: false, speed: true, early: false, community: 'class', hours: 16, notices: [], goal: AI.goal(name) }; S.classes.unshift(c); return `「${name}」 ${tj('cls', '을')} 만들었습니다.`; }, go: 'class' }; }
  if (has('퀴즈', '시험', '문항')) { const n = +(q.match(/(\d+)\s*문항/) || [])[1] || 5; const name = q.replace(/퀴즈.*|시험.*|\d+\s*문항.*/, '').trim() || '핵심 개념'; const Q = AI.quiz(name, Math.min(n, 30)); return { title: `「${name}」 퀴즈 ${Q.length}문항`, steps: ['문항 생성', '정답 · 보기 검토', `${t('cls')} 커리큘럼에 퀴즈로 추가`], preview: `<div class="quiz">${Q.slice(0, 5).map(x => `<p><b>${esc(x.q)}</b><br>${x.opts.map((o, i) => `${i + 1}) ${esc(o)}`).join(' · ')}</p>`).join('')}${Q.length > 5 ? `<small>외 ${Q.length - 5}문항</small>` : ''}</div>`, cta: `첫 ${t('cls')}에 추가`, run: () => { const c = S.classes.find(c => c.kind !== 'episode'); c.curriculum.push({ id: uid('it'), type: 'quiz', title: `${name} 퀴즈 (${Q.length}문항)`, quiz: Q }); return `「${c.name}」에 퀴즈를 추가했습니다.`; } }; }
  if (has('공지', '안내문', '모집')) { const topic = q.replace(/(공지|안내문)?\s*(써|작성|만들)\S*/, '').trim() || '운영 안내'; const b = AI.notice(topic); return { title: '공지 초안', steps: ['초안 작성', '커뮤니티 공지사항에 등록(상단 고정)'], preview: `<div class="pvmsg"><p>${esc(b).replace(/\n/g, '<br>')}</p></div>`, cta: '공지로 등록', run: () => { (S.notices = S.notices || []).unshift({ title: topic, at: today(), pin: true, body: b }); return '공지를 등록했습니다.'; }, go: 'community' }; }
  if (has('홈페이지', '사이트', '랜딩')) { return { title: 'AI 홈페이지 빌더로 이동', steps: ['지시 내용을 프롬프트로 전달', '섹션 자동 구성 → 편집 → 게시'], cta: '빌더에서 생성', run: () => { UI.sitePrompt = q; setTimeout(() => go('site')); return '홈페이지 빌더를 열었습니다.'; } }; }
  if (has('HRD', '보고')) { return { title: '이번 주 HRD-Net 보고 자료 생성', steps: ['훈련생 등록 · 진도 · 출석 · 평가 집계', '수료 요건(평가 + 진도) 판정', '보고 파일 생성 → 담당자 확인 후 전송'], run: () => runAuto(S.autos.find(a => a.key === 'hrd-weekly') || { key: 'hrd-weekly', name: 'HRD-Net 주간 보고', actions: ['hrd'] }, true), go: 'hrd' }; }
  if (has('반환', '환불')) { const L = S.pays.filter(p => p.status === '환불 신청'); return { title: `${t('fee')} 반환 · 환불 신청 ${L.length}건`, steps: L.map(p => `${M(p.who)?.name} · ${p.item} · ${p.at} 신청 → 기한 ${addDays(p.at, 5)}`), go: menuOn('lifelong') ? 'lifelong' : 'sales' }; }
  if (has('30시간')) { const L = S.classes.filter(c => c.hours < 30); return { title: `30시간 미만 ${t('cls')} ${L.length}개`, steps: L.map(c => `${c.name} — ${c.hours}시간`), go: 'class' }; }
  if (has('요약', '현황', '리포트', '매출', '출결')) { const per = /(작년|지난해|전년|재작년|\d{4}\s*년|분기|상반기|하반기)/.exec(q); return { title: per ? `운영 현황 요약 — 「${per[1]}」 기간 자료는 아직 없어 최근 기준으로 보여 드립니다` : '운영 현황 요약', steps: summary(q), go: has('매출') ? 'sales' : has('출결') ? 'attend' : 'dash' }; }
  return { title: '이렇게 이해했습니다 — 조금 더 구체적으로 지시해 주세요', steps: ['예: "진도 30% 미만 독려 메시지 보내줘", "미납 재알림", "○○ 커리큘럼 만들어줘", "매주 월요일 … 자동화 만들어줘"'] };
}
function summary(q) {
  const g = S.groups.find(g => q.includes(g.name)); const ms = g ? S.members.filter(m => m.group === g.id).map(m => m.id) : S.members.map(m => m.id);
  const ps = S.classes.flatMap(c => ms.filter(id => c.prog[id]).map(id => c.prog[id].p));
  const out = [`대상: ${g ? g.name : '전체'} ${ms.length}명`, `평균 진도 ${pct(avgOf(ps))} · ${t('done')} ${S.classes.reduce((a, c) => a + ms.filter(id => (c.learners || []).includes(id) && clsDone(c, id)).length, 0)}건`, `진도 30% 미만 ${ps.filter(p => p < 30).length}건 — 독려 권장`];
  if (S.pays.length) out.push(`최근 30일 결제 ${won(S.pays.filter(p => p.status === '결제 완료' && p.at >= addDays(today(), -30)).reduce((a, p) => a + p.amount, 0))} · 환불 신청 ${S.pays.filter(p => p.status === '환불 신청').length}건`);
  if (S.bills.length) out.push(`청구서 미납 ${S.bills.filter(b => b.status === '미납').length}건`);
  if (/출결|출석/.test(q)) out.push(`출석률 80% 미만 ${lowAttN()}명`);
  return out;
}

/* AI 도구 모달 */
ACT.tool = el => { const id = el.dataset.v; const cs = S.classes; const csel = `<select name="c">${cs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>`;
  const show = (title, html, extra = []) => modal(title, `<div class="aibox">${html}</div>`, [{ id: 'c', label: '닫기' }, ...extra], true);
  const ask = (title, form, fn) => modal(title, form, [{ id: 'c', label: '취소' }, { id: 'ok', label: '✦ 생성', kind: 'pri', run: w => { const r = fn(w); S.ai.usage++; save(); setTimeout(() => r && show(title, r.html, r.extra || [])); } }]);
  if (id === 'goal') ask('교육 목표 · 주요 내용', `<label class="fl">${esc(t('cls'))}명<input name="n" maxlength="40"></label><label class="fl">교육 대상자<input name="t" maxlength="40"></label>`, w => ({ html: esc(AI.goal(fv(w, 'n') || '새 과정', fv(w, 't'))).replace(/\n/g, '<br>') }));
  if (id === 'thumb') ask('썸네일 키워드 추천', `<label class="fl">${esc(t('cls'))} · 교재명<input name="n"></label>`, w => ({ html: `<b>${esc(AI.thumb(fv(w, 'n')))}</b><br><small>이미지 사이트 검색어로 쓰세요. 저작권 확인은 운영자 책임입니다.</small>` }));
  if (id === 'curr') ask('커리큘럼 구성', `<label class="fl">${esc(t('cls'))}명<input name="n"></label>`, w => { setTimeout(() => chatSend((fv(w, 'n') || '새 과정') + ' 커리큘럼 만들어줘')); return null; });
  if (id === 'video') ask('강의 영상 추천', `<label class="fl">강의 제목<input name="n"></label>`, w => { const n = fv(w, 'n') || '강의'; return { html: ['기초 개념 설명', '실무 예제', '10분 요약'].map(s => `▶ <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(n + ' ' + s)}" target="_blank" rel="noopener">${esc(n + ' ' + s)}</a>`).join('<br>') + '<br><small>저작권 · 이용 조건 확인은 운영자 책임입니다.</small>' }; });
  if (id === 'script') ask('강의 스크립트 · 요약', `<label class="fl">강의 제목<input name="n"></label>`, w => { const r = AI.script(fv(w, 'n') || '강의'); return { html: `<b>스크립트</b><br>${esc(r.script)}<br><br><b>요약</b><br>${esc(r.summary).replace(/\n/g, '<br>')}<br><small>YouTube · Vimeo 영상은 자막이 있는 경우에만 생성됩니다.</small>` }; });
  if (id === 'quiz') ask('퀴즈 생성', `<label class="fl">강의 · 주제<input name="n"></label><div class="form2"><label>난이도<select name="l"><option>쉬움</option><option selected>보통</option><option>어려움</option></select></label><label>유형<select name="k"><option>객관식</option><option>OX</option></select></label><label>문항 수<input name="q" type="number" min="1" max="30" value="5"></label></div>`, w => { const Q = AI.quiz(fv(w, 'n') || '핵심 개념', clamp(+fv(w, 'q') || 5, 1, 30), fv(w, 'l'), fv(w, 'k')); return { html: Q.map(x => `<p><b>${esc(x.q)}</b><br>${x.opts.map((o, i) => `${i + 1}) ${esc(o)}`).join(' · ')} <small>정답 ${esc(x.a)}</small></p>`).join('') }; });
  if (id === 'grade') { ACT['ai-grade-all'](); go('assess'); }
  if (id === 'reply') { ACT['ai-reply-all'](); go('community'); }
  if (id === 'consult') go('consult');
  if (id === 'msg') ask('안내 메시지 작성', `<label class="fl">목적<select name="p"><option>이번 주 학습 안내</option><option>과제 마감 안내</option><option>개강 안내</option><option>휴강 · 일정 변경 안내</option><option>수료 축하 · 후기 요청</option></select></label>`, w => { const m = AI.msg(fv(w, 'p')); UI.msgDraftT = m.title; UI.msgDraft = m.body; return { html: esc(m.body).replace(/\n/g, '<br>'), extra: [{ id: 'use', label: '메시지에 넣기', kind: 'pri', run: () => setTimeout(() => go('message')) }] }; });
  if (id === 'report') ask('학습 리포트', `<label class="fl">대상<select name="m">${S.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label>`, w => ({ html: esc(AI.report(M(fv(w, 'm')))).replace(/\n/g, '<br>') }));
  if (id === 'risk') { const R = S.members.map(m => { const ps = S.classes.filter(c => c.prog[m.id]).map(c => c.prog[m.id]); const p = avgOf(ps.map(x => x.p)), a = avgOf(ps.map(x => x.att)); const away = (Date.now() - new Date(m.last)) / 864e5; const s = Math.round(clamp((100 - p) * .5 + (100 - a) * .3 + Math.min(away, 60) * .5, 0, 100)); return { m, s, p, away: Math.round(away) }; }).sort((a, b) => b.s - a.s).slice(0, 10);
    show('이탈 위험 예측 Top 10', table(['이름', '위험 점수', '평균 진도', '미접속'], R.map(r => [esc(r.m.name), r.s >= 60 ? tag(r.s, 'r') : r.s >= 40 ? tag(r.s, 'y') : r.s, pct(r.p), r.away + '일'])) + '<small>점수 = 진도 50% · 출석 30% · 미접속 일수 20% 가중(설명 가능한 규칙). 실제 운영에서는 학습 로그로 보정합니다.</small>', [{ id: 'a', label: '상위 위험군 독려 자동화', kind: 'pri', run: () => { setTimeout(() => chatSend('진도 30% 미만 학생에게 독려 메시지 보내줘')); } }]); }
  if (id === 'seo') ACT['ai-seo']();
  if (id === 'terms') ACT['ai-terms']();
  if (id === 'site') go('site');
};
ACT['ai-curr'] = el => { const c = C(el.dataset.v); modal('AI 커리큘럼 재구성', `<p>현재 ${c.curriculum.length}개 항목을 AI 초안으로 바꿉니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '바꾸기', kind: 'pri', run: () => { c.curriculum = AI.curriculum(c.name); S.ai.usage++; save(); render(); } }]); };
ACT['ai-script'] = el => { const c = C(el.dataset.c), it = c.curriculum[+el.dataset.v]; it.script = AI.script(it.title); S.ai.usage++; save(); modal('강의 스크립트 · 요약', `<div class="aibox"><b>요약</b><br>${esc(it.script.summary).replace(/\n/g, '<br>')}<br><br><b>스크립트</b><br>${esc(it.script.script)}</div>`, [{ id: 'c', label: '확인' }], true); render(); };
ACT['ai-quiz'] = el => { const c = C(el.dataset.c), i = +el.dataset.v, it = c.curriculum[i]; const Q = AI.quiz(it.title, 5); c.curriculum.splice(i + 1, 0, { id: uid('it'), type: 'quiz', title: `${it.title} 확인 퀴즈`, quiz: Q }); S.ai.usage++; save(); render(); toast('강의 다음에 퀴즈 5문항을 추가했습니다.', 'ok'); };
ACT['ai-msg'] = () => { const m = AI.msg($('#msgT')?.value.trim()); $('#msgT').value = m.title; $('#msgB').value = m.body; { const c = document.getElementById('msgBc'); if (c) c.textContent = m.body.length + '/2000'; } S.ai.usage++; save(); };
ACT['ai-report'] = el => modal('AI 학습 리포트', `<div class="aibox">${esc(AI.report(M(el.dataset.v))).replace(/\n/g, '<br>')}</div>`, [{ id: 'c', label: '닫기' }]);
ACT['ai-seo'] = () => { const s = AI.seo(); modal('AI SEO 제안', `<div class="aibox"><b>제목</b> ${esc(s.title)}<br><b>설명</b> ${esc(s.desc)}<br><b>키워드</b> ${esc(s.kw)}</div>`, [{ id: 'c', label: '닫기' }, { id: 'ok', label: '적용', kind: 'pri', run: () => { Object.assign(S.settings.seo, s); save(); UI.settings = 'home'; setTimeout(() => go('settings')); } }]); };
ACT['ai-terms'] = () => { S.settings.terms.tos = AI.terms(); save(); UI.settings = 'terms'; go('settings'); toast('유형별 환불 규정 초안을 넣었습니다. 게시 전 검토하세요.', 'ok'); };

/* ═════════ 업무 자동화 ═════════ */
const TRIG = { 'ev:join': '회원 가입 시', 'ev:pay': '결제 완료 시', 'ev:refund': '환불 · 반환 신청 시', 'ev:submit': '과제 제출 시', 'ev:question': '질문 등록 시', 'ev:absent': '결석 처리 시', 'ev:done': `수료 기준 충족 시`, 'ev:consult': '상담 종료 시', 'ev:newhire': '신규 회원 일괄 등록 시', 'sc:daily': '매일 오전 9시', 'sc:mon': '매주 월요일 오전 9시', 'sc:fri': '매주 금요일 오후 5시', 'sc:month': '매월 1일 오전 9시' };
const trigLabel = k => TRIG[k] || k;
const ACTION = { msg: '대상에게 안내 메시지(앱 푸시 + 이메일)', parent: '보호자에게 알림', manager: '담당자 · 관리자에게 알림', report: '리포트 생성 · 이메일 발송', draft: 'AI 초안 생성(답변 · 채점 · 요약)', assign: `${'수강 권한'} 자동 부여`, badge: '디지털 배지 자동 발급', task: '운영자 할 일 생성', hrd: 'HRD-Net 보고 파일 생성', approve: '회원 자동 승인' };
function A(key, name, trigger, cond, actions, approve = true, on = true) { return { id: uid('au'), key, name, trigger, cond, actions, approve, on, runs: 0, last: '' }; }
function defaultAutos(type) {
  const common = [A('nudge-low', '진도 부진 독려', 'sc:mon', '진도 30% 미만', ['msg']), A('nudge-away', '장기 미접속 복귀 안내', 'sc:daily', '30일 이상 미접속', ['msg'], false), A('qna-draft', 'Q&A 답변 초안', 'ev:question', '미답변 질문', ['draft', 'task']), A('grade-draft', '과제 AI 채점 초안', 'ev:submit', '제출된 과제', ['draft', 'task']), A('weekly', '주간 운영 리포트', 'sc:fri', '전체', ['report'], false)];
  const by = {
    corp: [A('legal-d7', '법정교육 마감 D-7 독려 + 부서장 리포트', 'sc:daily', '법정교육 미이수 · 마감 7일 이내', ['msg', 'manager']), A('newhire', '신규 입사자 온보딩 자동 배정', 'ev:newhire', '신규 등록 임직원', ['assign', 'msg'], false)],
    univ: [A('univ-risk', '학습 위험군 → 지도교수 알림', 'sc:mon', '진도 30% 미만', ['manager', 'msg']), A('badge-auto', '이수 시 디지털 배지 자동 발급', 'ev:done', '수료 기준 충족', ['badge'], false)],
    k12: [A('unpaid', '청구서 미납 보호자 재알림', 'sc:daily', '마감 지난 미납', ['parent', 'task']), A('absent', '결석 시 보호자 알림 + 보강 영상 배정', 'ev:absent', '결석 처리', ['parent', 'assign'], false), A('consult-follow', '상담 후속 안내', 'ev:consult', '입학 · 성적 상담', ['draft', 'task'])],
    adult: [A('early-pay', '사전 수강신청자 개강 D-3 결제 안내', 'sc:daily', '얼리버드 신청 · 미결제', ['msg']), A('review', '수료 시 후기 요청 + 다음 강좌 추천', 'ev:done', '수료 기준 충족', ['msg'], false), A('refund-route', '환불 신청 → 규정 검토 초안', 'ev:refund', '환불 신청', ['draft', 'task'])],
    lifelong: [A('refund5', '학습비 반환 5일 기한 관리', 'ev:refund', '반환 신청', ['manager', 'task']), A('demand', '사전 수강신청 10명 미만 폐강 검토', 'sc:mon', '개강 7일 전 · 신청 10명 미만', ['manager'])],
    voc: [A('att-warn', '출석률 80% 미만 경고', 'sc:daily', '출석률 80% 미만', ['msg', 'manager']), A('hrd-weekly', 'HRD-Net 주간 보고 자료', 'sc:mon', '전체 훈련생', ['hrd', 'manager']), A('fraud', '부정훈련 의심 → 담당자 확인', 'sc:daily', '동시 접속 · 무입력 · 연속 입력', ['manager', 'task'])]
  };
  return [...by[type], ...common];
}
function targets(a) {
  switch (a.key) {
    case 'nudge-low': case 'univ-risk': return [...new Set(S.classes.flatMap(c => Object.entries(c.prog).filter(([, p]) => p.p < 30).map(([id]) => id)))];
    case 'nudge-away': return S.members.filter(m => m.last <= addDays(today(), -30)).map(m => m.id);
    case 'qna-draft': return S.posts.filter(p => p.kind === '질문' && !p.replies).map(p => p.id);
    case 'grade-draft': return pend().map(x => x.id);
    case 'legal-d7': { const lim = addDays(today(), 7); return [...new Set(legalUndone().filter(x => !x.c.end || String(x.c.end).slice(0, 10) <= lim).map(x => x.id))]; } /* v32.8 마감 7일 이내만(QA U3) */
    case 'unpaid': return S.bills.filter(b => b.status === '미납').map(b => b.who);
    case 'att-warn': return [...new Set(lowAtt().map(x => x.id))];
    case 'refund5': case 'refund-route': return S.pays.filter(p => p.status === '환불 신청').map(p => p.who);
    case 'badge-auto': return S.classes[0] ? S.classes[0].learners.filter(id => clsDone(S.classes[0], id) && !S.badges[0]?.issued.some(i => i.who === id)) : [];
    case 'fraud': return typeof cplSuspects === 'function' ? [...new Set(cplSuspects().map(x => x.m.id))] : []; /* v38 실제 모니터링 기록만(QA V5) */
    case 'demand': return S.classes.filter(c => c.early && c.learners.length < 10).map(c => c.id);
    default: return S.members.slice(0, Math.max(1, Math.round(S.members.length / 6))).map(m => m.id);
  }
}
function runAuto(a, force) {
  const T = targets(a); a.runs = (a.runs || 0) + 1; a.last = nowStr();
  if (a.key === 'qna-draft') S.posts.filter(p => p.kind === '질문' && !p.replies).forEach(p => p.draft = AI.reply(p));
  if (a.key === 'grade-draft') pend().forEach(({ c, id }) => c.prog[id].draft = AI.gradeDraft(c, id));
  if (a.key === 'legal-d7') S.nudged = true;
  if (a.key === 'hrd-weekly') S.hrd && S.hrd.reports.unshift({ at: nowStr(), kind: '주간(등록 · 진도 · 출석 · 평가)', n: S.members.length, st: '전송 대기' });
  if (a.key === 'badge-auto' && S.badges[0]) T.forEach(id => S.badges[0].issued.push({ who: id, at: today(), exp: '' }));
  if (a.actions.some(x => ['msg', 'parent'].includes(x)) && T.length) S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: `자동화 · ${a.name}`, title: a.name, ch: a.actions.includes('parent') ? '알림톡(보호자)' : '앱 푸시 + 이메일', n: T.length });
  const r = { at: nowStr(), name: a.name, n: T.length, st: '완료', how: force ? '수동 실행' : trigLabel(a.trigger) };
  S.runs.unshift(r); S.runs = S.runs.slice(0, 200); logAudit(`자동화 실행 — ${a.name} (${T.length}건)`); save();
  return `「${a.name}」 실행 — 대상 ${T.length}건 처리`;
}
ACT['auto-run-id'] = el => { const a = S.autos.find(x => x.key === el.dataset.v); if (!a) { toast('해당 자동화가 없습니다. 업무 자동화에서 추가하세요.', 'warn'); return; } confirmRun(a); };
/* v38 법정교육 안내문: 과정별 마감일 · 남은 날을 넣는다(일반 '과제 · 퀴즈 기한' 문구 대신, QA C4) */
function legalNudgeMsg(ids) { const set = new Set(ids || []); const L = S.classes.filter(c => c.legal && (c.learners || []).some(id => set.has(id) && !clsDone(c, id))); const dd = e => { if (!e) return ''; const n = Math.round((new Date(String(e).slice(0, 10)) - new Date(today())) / 864e5); return n >= 0 ? ` (D-${n})` : ' (마감 지남)'; };
  return { title: '법정의무교육 이수 마감 안내', body: `아직 이수하지 않은 법정 의무교육이 있습니다.\n${L.map(c => `· 「${c.name}」 이수 마감 ${c.end ? String(c.end).slice(0, 10) : '기관 공지'}${dd(c.end)} · 진도 ${(c.criteria || {}).threshold || 100}% 이상`).join('\n')}\n마감 전에 수강을 마쳐 주십시오. 미이수 시 법정 의무교육 이수 기록이 남지 않습니다.` }; }
/* v38 법정의무교육 화면의 [미이수자 독려 실행]: 마감 7일 이내만이 아니라 지금 미이수자 전원에게 마감일을 넣어 보낸다 */
ACT['legal-nudge'] = () => { const ids = [...new Set(legalUndone().map(x => x.id))]; if (!ids.length) { toast(S.classes.some(c => c.legal) ? '법정 의무교육 미이수자가 없습니다.' : '법정 의무교육으로 지정된 과정이 없습니다. 과정 › 설정에서 지정해 주십시오.', 'warn'); return; } const m = legalNudgeMsg(ids);
  modal(`법정교육 미이수자 ${ids.length}명에게 안내`, `<div class="pvmsg"><b>${esc(m.title)}</b><p>${esc(m.body).replace(/\n/g, '<br>')}</p><small>대상: ${ids.slice(0, 10).map(mn).join(', ')}${ids.length > 10 ? ` 외 ${ids.length - 10}명` : ''}</small></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: `${ids.length}명에게 보내기`, kind: 'pri', run: () => { S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: '법정교육 미이수자', title: m.title, body: m.body, ch: '앱 푸시 + 이메일', n: ids.length }); S.nudged = true; logAudit(`법정교육 미이수자 안내 ${ids.length}명`); save(); render(); toast(`${ids.length}명에게 안내를 보냈습니다.`, 'ok'); } }]); };
function confirmRun(a) { const T = targets(a); if (!T.length) { toast(`「${a.name}」 대상이 지금 0건이라 실행하지 않았습니다(조건: ${a.cond}).`, 'warn'); return; } modal(`자동화 실행 — ${a.name}`, `<ol class="steps"><li>시작 조건: ${esc(trigLabel(a.trigger))}</li><li>조건: ${esc(a.cond)} → <b>대상 ${T.length}건</b></li>${a.actions.map(x => `<li>실행: ${esc(ACTION[x])}</li>`).join('')}</ol><p class="mini">대상: ${T.slice(0, 10).map(id => M(id) ? esc(M(id).name) : esc(id)).join(', ')}${T.length > 10 ? ` 외 ${T.length - 10}` : ''}</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '승인하고 실행', kind: 'pri', run: () => { toast(runAuto(a, true), 'ok'); render(); } }]); }
/* v36 H: 자동화 만들기 단순화 — 언제(보기) → 무엇을(보기) → 누구에게 3칸 문장 + 유형별 추천(켜기 한 번) + 한 줄 말로 채우기.
   대상 조건 · 승인 · 여러 단계(Slack · Google 등)는 '자세히'에 접는다. 저장 형식(trigger · cond · actions · approve)은 그대로라 기존 실행 · 연결 기능과 호환. */
const AU_WHAT = { msg: '안내 메시지 보내기', report: '리포트 만들어 보내기', draft: 'AI 초안 만들기(답변 · 채점 · 요약)', assign: '수강 자동 배정', badge: '디지털 배지 발급', hrd: 'HRD-Net 보고 파일 만들기', task: '운영자 할 일 만들기', approve: '가입 자동 승인' };
const auHasParents = () => S.org.type === 'k12' || Object.values((S.nav && S.nav.tabs) || {}).flat().some(x => x && x.id === 'parents' && x.on);
const auWho = () => [['self', `해당 ${t('learner')}`], ...(auHasParents() ? [['parent', '보호자']] : []), ['manager', '담당자 · 관리자'], ['none', '따로 알리지 않음']];
const auWhat = cur => Object.entries(AU_WHAT).filter(([k]) => k === cur || (k !== 'hrd' || S.org.type === 'voc'));
function auSlots(a) { const L = a.actions || []; const what = L.find(x => AU_WHAT[x] && x !== 'msg') || 'msg'; const who = L.includes('parent') ? 'parent' : L.includes('msg') ? 'self' : L.includes('manager') ? 'manager' : what === 'msg' ? 'self' : 'none'; return { what, who }; }
function auActs(what, who) { const n = { self: 'msg', parent: 'parent', manager: 'manager' }[who]; if (what === 'msg') return [n || 'msg']; return n ? [what, n] : [what]; }
const auWhoLabel = k => (auWho().find(x => x[0] === k) || [, k === 'parent' ? '보호자' : ''])[1];
const AU_SHORT = { msg: '안내 메시지', report: '리포트', draft: 'AI 초안', assign: '수강 자동 배정', badge: '디지털 배지 발급', hrd: 'HRD-Net 보고 파일', task: '운영자 할 일', approve: '가입 자동 승인' };
function auSay(trigger, actions) { const L = actions || []; const { what } = auSlots({ actions: L }); const to = [L.includes('msg') ? auWhoLabel('self') : '', L.includes('parent') ? '보호자' : '', L.includes('manager') ? '담당자 · 관리자' : ''].filter(Boolean);
  const extra = L.filter(x => x !== what && !['msg', 'parent', 'manager'].includes(x));
  return `${trigLabel(trigger)} · ${AU_SHORT[what] || ACTION[what] || what}${extra.length ? ` + ${extra.map(x => AU_SHORT[x] || ACTION[x] || x).join(' + ')}` : ''}${to.length ? ` → ${to.join(', ')}` : ''}`; }
const auName = (trigger, actions) => { const { what, who } = auSlots({ actions }); return `${trigLabel(trigger).replace(/\s*(시|오전 9시|오후 5시)$/, '')} ${who === 'none' ? '' : auWhoLabel(who) + ' '}${(AU_WHAT[what] || '').replace(/\(.*\)/, '').trim()}`.replace(/\s+/g, ' ').trim().slice(0, 40); };
/* v36 R1 결제를 쓰지 않는 유형(대학 · 기업 · 공공)은 결제 · 환불 조건을 고를 수 없게(이미 저장된 값은 보임) */
const auTrigOK = (k, cur) => k === cur || !/^ev:(pay|refund)$/.test(k) || typeof mbPayOn !== 'function' || mbPayOn();
function auBuilder(a, open) { const { what, who } = auSlots(a); const ev = Object.entries(TRIG).filter(([k]) => k.startsWith('ev:') && auTrigOK(k, a.trigger)), sc = Object.entries(TRIG).filter(([k]) => !k.startsWith('ev:'));
  const opt = (L, cur) => L.map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const odd = auActs(what, who).join() !== (a.actions || []).join();
  return `<div class="au3"><label class="au-slot"><span>언제</span><select name="t" aria-label="언제"><optgroup label="정해진 시간">${opt(sc, a.trigger)}</optgroup><optgroup label="일이 생길 때">${opt(ev, a.trigger)}</optgroup></select></label><b class="au-arr" aria-hidden="true">→</b><label class="au-slot"><span>무엇을</span><select name="w" aria-label="무엇을">${opt(auWhat(what), what)}</select></label><b class="au-arr" aria-hidden="true">→</b><label class="au-slot"><span>누구에게</span><select name="o" aria-label="누구에게">${opt(auWho(), who)}</select></label></div>
    <p class="au-say" data-say data-slg-long="1">${esc(auSay(a.trigger, a.actions))}</p>
    <details class="au-more" ${open || odd ? 'open' : ''}><summary>자세히 — 이름 · 대상 조건 · 승인 · 여러 단계</summary>
      <label class="fl">이름<input name="n" maxlength="40" value="${esc(a.name || '')}" placeholder="${esc(auName(a.trigger, a.actions))}"></label>
      <label class="fl">대상 조건<input name="c" maxlength="60" value="${esc(a.cond || '')}" placeholder="예: 진도 30% 미만 · 30일 이상 미접속 · 미납"></label>
      <div class="fl"><span>실행 단계(여러 개 고를 수 있습니다)</span><div class="chk">${Object.entries(ACTION).map(([k, v]) => `<label><input type="checkbox" name="a" value="${k}" ${(a.actions || []).includes(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div></div>
      <label class="ckl"><input type="checkbox" name="ap" ${a.approve ? 'checked' : ''}> 실행 전 운영자 승인(메시지 대량 발송 · 결제 관련은 권장)</label></details>`; }
/* 3칸이 바뀌면 실행 단계 · 문장 · 이름 자리표시를 함께 맞춘다(자세히에서 직접 고른 단계는 저장 때 그대로 읽는다) */
document.addEventListener('change', e => { const box = e.target.closest && e.target.closest('[data-aubox]'); if (!box) return; const q = n => box.querySelector(`[name=${n}]`);
  if (['t', 'w', 'o'].includes(e.target.name)) { const acts = auActs(q('w').value, q('o').value); const extra = [...box.querySelectorAll('[name=a]:checked')].map(x => x.value).filter(x => !AU_WHAT[x] && !['parent', 'manager'].includes(x)); box.querySelectorAll('[name=a]').forEach(x => { x.checked = acts.includes(x.value) || extra.includes(x.value); }); if (e.target.name !== 't' && /msg|parent/.test(acts.join())) q('ap').checked = true; }
  const acts = [...box.querySelectorAll('[name=a]:checked')].map(x => x.value); const say = box.querySelector('[data-say]'); if (say) say.textContent = auSay(q('t').value, acts); q('n').placeholder = auName(q('t').value, acts); });
function auRead(box, a) { const q = n => box.querySelector(`[name=${n}]`); const acts = [...box.querySelectorAll('[name=a]:checked')].map(x => x.value); if (!acts.length) { toast('무엇을 할지 하나 이상 고르세요.', 'warn'); return false; }
  a.trigger = q('t').value; a.actions = acts; a.cond = q('c').value.trim() || a.cond || '전체 대상'; a.approve = q('ap').checked; a.name = q('n').value.trim() || auName(a.trigger, acts); return true; }
const auRecs = () => defaultAutos(S.org.type);
const auEx = () => { const L = EX[S.org.type] || []; return L.find(x => /자동화/.test(x)) || '매주 월요일 진도 부진자에게 안내 보내는 자동화'; };
const auLast = a => (S.runs || []).find(r => r.name === a.name);
function auRow(a) { const r = auLast(a); const { what, who } = auSlots(a); const extra = (a.actions || []).filter(x => !auActs(what, who).includes(x));
  return `<div class="auto ${a.on ? '' : 'off'}"><div class="ah"><b>${esc(a.name)}</b><label class="sw"><input type="checkbox" ${a.on ? 'checked' : ''} data-chg="auto-on" data-v="${a.id}" aria-label="${esc(a.name)} ${a.on ? '끄기' : '켜기'}"><span></span></label></div>
    <div class="flow"><span class="tr">${esc(trigLabel(a.trigger))}</span>→<span class="ac">${esc(AU_WHAT[what] || ACTION[what] || what)}</span>${who === 'none' ? '' : `→<span class="cd">${esc(auWhoLabel(who))}</span>`}${extra.map(x => `<span class="ac">+ ${esc(ACTION[x] || x)}</span>`).join('')}</div>
    <div class="af"><small>${r ? `최근 실행 ${esc(r.at)} · ${r.n}건 처리` : a.last ? `최근 실행 ${esc(a.last)}` : '아직 실행 전'} · ${a.approve ? '실행 전 승인' : '자동 실행'}</small><span class="sp"></span><button class="btn sm" data-act="auto-run" data-v="${a.id}">지금 실행</button><button class="btn sm ghost" data-act="auto-edit" data-v="${a.id}">고치기</button><button class="btn sm ghost" data-act="auto-del" data-v="${a.id}">삭제</button></div></div>`; }
VIEWS.auto = () => {
  if (UI.cnGal === undefined) UI.cnGal = false; /* Slack · Google 템플릿은 접어 둔다 */
  const R = auRecs(); const recOff = R.filter(d => !S.autos.some(a => a.key === d.key && a.on)); const recKeys = R.map(d => d.key);
  const L = S.autos.filter(a => a.on || a.custom || a.proc || !recKeys.includes(a.key)); const runs = S.runs.reduce((x, r) => x + r.n, 0);
  const d = UI.auDraft || (UI.auDraft = A('custom', '', 'sc:mon', '', ['msg']));
  return head('자동화', '언제 · 무엇을 · 누구에게, 세 칸만 고르면 반복 업무가 자동으로 처리됩니다. 메시지 대량 발송처럼 민감한 일은 실행 전에 승인을 받습니다.') +
    `<div class="card au-new" data-aubox="new"><div class="ch"><b>새 자동화</b><small>한 줄로 적으면 세 칸을 채워 드립니다</small></div>
      <div class="au-line"><input id="auQ" maxlength="200" placeholder="예: ${esc(auEx())}" aria-label="한 줄로 자동화 설명"><button type="button" class="btn" data-act="au-fill">${ic('spark', 14)} 채우기</button></div>
      ${auBuilder(d, false)}<div class="bar2"><span class="sp"></span><button type="button" class="btn pri" data-act="au-save">켜기</button></div></div>` +
    (recOff.length ? `<h2 class="h2">${esc(TYPES[S.org.type].name)} 추천 자동화 <small class="mini">누르면 바로 켜집니다</small></h2><div class="au-recs">${recOff.map(r => `<div class="au-rec"><b>${esc(r.name)}</b><small data-slg-long="1">${esc(auSay(r.trigger, r.actions))}</small>${r.cond && r.cond !== '전체' ? `<small data-slg-long="1">대상: ${esc(r.cond)}</small>` : ''}<button class="btn sm pri" data-act="auto-rec" data-v="${esc(r.key)}">켜기</button></div>`).join('')}</div>` : '') +
    `<h2 class="h2">내 자동화 <small class="mini">켜짐 ${S.autos.filter(a => a.on).length}개 · 실행 ${S.runs.length}회 · 처리 ${runs}건 · 아낀 시간 약 ${Math.round(runs * 3 / 60 * 10) / 10}시간(건당 3분)</small></h2>` +
    (L.length ? `<div class="autos">${L.map(auRow).join('')}</div>` : `<div class="autos"></div><div class="empty">아직 켠 자동화가 없습니다. 위 추천에서 [켜기]를 누르거나 새 자동화를 만드십시오.</div>`) +
    `<details class="au-log"><summary>실행 기록 ${S.runs.length}건</summary>${table(['시각', '자동화', '방식', '처리', '상태'], S.runs.slice(0, 30).map(r => [esc(r.at), esc(r.name), esc(r.how || ''), r.n + '건', tag(r.st, 'g')]), '아직 실행 기록이 없습니다.')}<p class="mini">데모에서는 '지금 실행'으로 동작을 확인합니다. 실제 운영에서는 서버 스케줄러와 이벤트 트리거가 실행하고, 알림톡 · 이메일은 발송 대행사를 통해 나갑니다.</p></details>`;
};
AFTER.push(cur => { if (cur === 'auto' && UI.autoPrefill) { const p = UI.autoPrefill; UI.autoPrefill = ''; autoForm(A('custom', p, 'sc:daily', '상담 대상 1명', ['task', 'msg']), true); } });
ACT['auto-on'] = el => { const a = S.autos.find(x => x.id === el.dataset.v); a.on = el.checked; save(); render(); toast(`「${a.name}」을 ${a.on ? '켰습니다' : '껐습니다'}.`, 'ok'); };
ACT['auto-run'] = el => confirmRun(S.autos.find(x => x.id === el.dataset.v));
ACT['auto-del'] = el => { const a = S.autos.find(x => x.id === el.dataset.v); S.autos = S.autos.filter(x => x !== a); save(); render(); if (a) toast(`「${a.name}」을 지웠습니다.`); };
ACT['auto-edit'] = el => autoForm(S.autos.find(x => x.id === el.dataset.v));
ACT['auto-new'] = () => autoForm(A('custom', '', 'sc:mon', '', ['msg']), true);
ACT['auto-rec'] = el => { const k = el.dataset.v; let a = S.autos.find(x => x.key === k); if (!a) { a = auRecs().find(x => x.key === k); if (!a) return; S.autos.unshift(a); } a.on = true; logAudit(`자동화 켜기 — ${a.name}`); save(); render(); toast(`「${a.name}」을 켰습니다. ${trigLabel(a.trigger)}에 실행됩니다.`, 'ok'); };
ACT['au-fill'] = () => { const q = ($('#auQ') || {}).value || ''; if (!q.trim()) { $('#auQ').focus(); return; } const r = recipeFromText(q); UI.auDraft = r; render(); setTimeout(() => { const b = document.querySelector('[data-aubox="new"]'); if (b) b.scrollIntoView({ block: 'nearest' }); }, 30); toast('세 칸을 채웠습니다. 확인하고 [켜기]를 누르세요.', 'ok'); };
ACT['au-save'] = () => { const box = document.querySelector('[data-aubox="new"]'); const a = UI.auDraft || A('custom', '', 'sc:mon', '', ['msg']); if (!auRead(box, a)) return; a.custom = true; a.on = true; if (!a.id) a.id = uid('au'); S.autos.unshift(a); UI.auDraft = null; logAudit(`자동화 만들기 — ${a.name}`); save(); render(); toast(`「${a.name}」을 만들어 켰습니다.`, 'ok'); };
function autoForm(a, isNew) { modal(isNew ? '자동화 만들기' : '자동화 고치기', `<div data-aubox="m">${auBuilder(a, false)}</div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: isNew ? '켜기' : '저장', kind: 'pri', run: w => { const box = w.querySelector('[data-aubox]') || w; if (!auRead(box, a)) return false; a.custom = true; if (isNew) { a.on = true; S.autos.unshift(a); } save(); render(); toast(isNew ? `「${a.name}」을 만들어 켰습니다.` : '저장했습니다.', 'ok'); } }]); }
ACT['auto-ai'] = () => modal('말로 자동화 만들기', `<label class="fl">어떤 일을 자동으로 처리할까요?<input name="q" maxlength="200" placeholder="${esc(auEx())}"></label><p class="mini">한 줄로 적으면 언제 · 무엇을 · 누구에게 세 칸을 채워 보여 드립니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '✦ 채우기', kind: 'pri', run: w => { const q = fv(w, 'q') || auEx(); setTimeout(() => autoForm(recipeFromText(q), true)); } }]);
if (typeof document !== 'undefined' && !document.getElementById('au3Css')) { const st = document.createElement('style'); st.id = 'au3Css'; st.textContent = '.au-new{margin-bottom:8px}.au-line{display:flex;gap:8px;margin:4px 0 14px}.au-line input{flex:1;min-width:0;min-height:48px}.au3{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap}.au-slot{flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--muted)}.au-slot select{min-height:48px;width:100%;font-size:15px;font-weight:600;color:var(--ink)}.au-arr{align-self:center;padding-top:20px;color:var(--muted)}.au-say{margin:12px 0 6px;padding:10px 14px;border-radius:10px;background:var(--soft,#f4f5f7);font-weight:600}.au-more{margin:6px 0}.au-more summary{cursor:pointer;color:var(--muted);font-size:14px;padding:8px 0}.au-more .chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px}.au-recs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:8px}.au-rec{background:#fff;border-radius:var(--r,12px);box-shadow:0 0 0 1px var(--line);padding:16px;display:flex;flex-direction:column;gap:6px}.au-rec small{color:var(--muted)}.au-rec .btn{align-self:flex-start;margin-top:auto;min-height:40px}.au-log{margin-top:18px}.au-log summary{cursor:pointer;font-weight:700;padding:8px 0}@media (max-width:640px){.au-arr{display:none}.au-slot{flex-basis:100%}}'; (document.head || document.documentElement).appendChild(st); }
function recipeFromText(q) {
  const tr = /매일/.test(q) ? 'sc:daily' : /월요일/.test(q) ? 'sc:mon' : /금요일/.test(q) ? 'sc:fri' : /매월/.test(q) ? 'sc:month' : /결석/.test(q) ? 'ev:absent' : /수료|이수/.test(q) && !/미이수/.test(q) ? 'ev:done' : /가입/.test(q) ? 'ev:join' : /환불|반환/.test(q) ? 'ev:refund' : /질문/.test(q) ? 'ev:question' : /제출/.test(q) ? 'ev:submit' : 'sc:mon';
  const acts = []; if (/보호자|학부모/.test(q)) acts.push('parent'); if (/교수|학과장|부서장|팀장|원장|센터장|담당자|관리자|운영자/.test(q)) acts.push('manager'); if (/리포트|보고/.test(q)) acts.push(/HRD/i.test(q) ? 'hrd' : 'report'); if (/배지/.test(q)) acts.push('badge'); if (/배정|부여/.test(q)) acts.push('assign'); if (/초안|답변|요약/.test(q)) acts.push('draft'); if (/알려|알리|안내|독려|요청|보내|경고/.test(q) && !acts.includes('parent') && (!acts.includes('manager') || /(학생|훈련생|임직원|수강생|원생|학습자|교육생|직원|회원|미이수자|미접속자|부진자|신청자)\S*\s*(에게|한테)/.test(q))) acts.push('msg'); if (!acts.length) acts.push('task');
  const cond = (q.match(/(진도\s*\d+%\s*미만|출석률\s*\d+%\s*미만|미납|미이수|위험군|결석|\d+일\s*이상\s*미접속|10명\s*미만|부정훈련 의심)/) || [])[1] || '전체 대상';
  return A('custom', q.replace(/(자동화|만들어줘|만들어 줘)/g, '').trim().slice(0, 40) || '새 자동화', tr, cond, [...new Set(acts)], /메시지|안내|보내|알려/.test(q));
}
