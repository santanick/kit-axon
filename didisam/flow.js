/* 디디쌤 스튜디오 v12 — AI 빌드 모드
   대화(AI SAM)가 메인 UI이고, 미리보기 화면에 어드민이 실시간으로 그려진다.
   기관 구성 → 홈페이지 → 과정 → 디지털북 → 진단 → 학습자 사이트 → 학습자 등록 → 배지 → 자동화 → 문서를
   '빌드 단계'로 잇고, 필수가 아닌 단계는 켜고 끌 수 있다. 각 단계는 대화로 만들고 대화로 고친다. */
'use strict';
const BLD_STEPS = [
  { id: 'org', n: '기관 구성', d: '기관 정보 · 학습자 식별 · 만들 단계 고르기', req: true, view: 'home' },
  { id: 'site', n: '홈페이지 빌드', d: '템플릿 · AI 문구 · 게시', view: 'site', def: () => true },
  { id: 'course', n: '과정 빌드', d: '커리큘럼 · 영상 · 퀴즈 · 과제', req: true, view: 'class' },
  { id: 'book', n: '디지털북 빌드', d: '읽고 · 보고 · 풀고 · 쓰는 인터랙티브 교재', view: 'dbook', def: ty => ty === 'univ' },
  { id: 'diag', n: 'AI 진단', d: '진단 문항 · 결과별 러닝 저니', view: 'diag', only: 'univ', def: () => true },
  { id: 'lsite', n: '학습자 사이트', d: '학습자 화면 페이지 · 섹션 · 게시', view: 'lsite', def: () => true },
  { id: 'people', n: () => `${t('learner')} 등록`, d: '명단 일괄 등록 · 초대', req: true, view: 'enroll' },
  { id: 'badge', n: '배지 · 수료', d: '수료 기준 · 디지털 배지', view: 'badge', def: ty => ty === 'univ' },
  { id: 'auto', n: '운영 자동화', d: '미접속 독려 · 주간 보고 같은 반복 업무', view: 'auto', def: () => true },
  { id: 'docs', n: '운영 문서', d: '공문 · 안내문 · 결과 보고서', view: 'docs', def: () => false }
];
const bName = s => typeof s.n === 'function' ? s.n() : s.n;
const bStep = id => BLD_STEPS.find(s => s.id === id);
const bFits = s => !s.only || s.only === S.org.type;
/* v20 화면 틀(왼쪽 레일 + 넓은 화면 + 떠 있는 AI SAM)은 하나. 내용은 클래식 메뉴 · 홈, 시작 세팅은 AI SAM 대화창의 '시작 가이드'(onboard.js) */
const bOn = () => !!(S && S.org);
const bList = () => BLD_STEPS.filter(s => bFits(s) && (s.req || S.bld.steps[s.id]?.on));
function bMenuOn(view) { if (!MENU[view]) return; navAdd(view, true); const x = (S.nav.tabs[MENU[view].ws] || []).find(t => t.id === view); if (x) x.on = true; }
function bCounts() { let bk = 0; try { lsEnsure(); bk = bkL().length; } catch (e) { } return { cls: S.classes.length, bk, dg: (S.diags || []).length, au: S.autos.length, dc: (S.docs || []).length, mb: S.members.length, bd: S.badges.length }; }
function bInit() {
  const ty = S.org.type; const steps = {};
  BLD_STEPS.filter(bFits).forEach(s => { steps[s.id] = { on: s.req || !!(s.def && s.def(ty)), done: false }; });
  S.bld = { on: true, cur: 'org', steps, base: bCounts(), seen: {}, at: today() };
  bList().forEach(s => bMenuOn(s.view)); BLD_STEPS.filter(bFits).forEach(s => { if (bAuto(s.id)) S.bld.seen[s.id] = 1; });
  S.chat = S.chat || []; if (!S.chat.length) S.chat.push(bGuideMsg('org', true));
  save();
}
const bEnsure = () => { if (S && S.org && !S.bld) bInit(); };
const bAuto = id => { const B = S.bld?.base || {}; try { return ({ org: () => false, site: () => !!S.site?.published, course: () => S.classes.length > B.cls, book: () => bkL().length > B.bk, diag: () => (S.diags || []).length > B.dg, lsite: () => !!S.lsite?.pub, people: () => S.members.length > B.mb, badge: () => S.badges.length > B.bd, auto: () => S.autos.length > B.au, docs: () => (S.docs || []).length > B.dc }[id] || (() => false))(); } catch (e) { return false; } };
const bDone = id => !!S.bld.steps[id]?.done || bAuto(id);
const bCur = () => { const L = bList(); const c = L.find(s => s.id === S.bld.cur); if (c && !bDone(c.id)) return c; return L.find(s => !bDone(s.id)) || c || L[0]; };
const bNextOf = id => { const L = bList(); const i = L.findIndex(s => s.id === id); return L.slice(i + 1).find(s => !bDone(s.id)) || L.find(s => s.id !== id && !bDone(s.id)) || null; };
const bAllDone = () => bList().every(s => bDone(s.id));

/* ── 단계별 안내 · 추천 지시 ── */
function bQ(id) {
  const F = typeof FILLQ === 'function' ? FILLQ() : {}; const L = t('learner');
  return ({
    org: ['디지털북 단계도 넣어줘', '홈페이지 단계는 빼줘', '다음 단계로'],
    site: [F.site || '홈페이지 신뢰감 있는 분위기로 만들어줘', '홈페이지 게시해줘'],
    course: [F.class || 'AI 리터러시 6차시 과정 설계해줘'],
    book: ['방금 만든 과정으로 디지털북 만들어줘', '「생성형 AI 기초」 디지털북 초안 만들어줘'],
    diag: [F.diag || 'AI 활용 수준 진단 만들어줘'],
    lsite: ['학습자 사이트 게시해줘'],
    people: [`${L} 명단 일괄 등록할게`],
    badge: ['수료 배지 만들어줘'],
    auto: [F.auto || '매주 금요일 주간 보고서 보내는 자동화 만들어줘', `14일 미접속 ${L}에게 독려 메시지 보내줘`],
    docs: ['수강 안내문 만들어줘']
  })[id] || [];
}
function bGuideText(id) {
  const U = S.org.type === 'univ';
  return ({
    org: '메뉴를 찾아다니지 않아도 되도록, 운영 시작까지 하나씩 같이 만들겠습니다.\n화면에서 기관 정보와 만들 단계를 확인하세요. 필요 없는 선택 단계(예: 디지털북)는 끄거나 "디지털북 단계 빼줘"라고 말씀하시면 됩니다.',
    site: '화면에 홈페이지 빌더가 열렸습니다. 원하는 분위기와 강조할 내용을 말씀하시면 템플릿 · 문구를 만들어 바로 보여 드립니다. 고칠 곳도 말로 지시하시고, 마음에 들면 "홈페이지 게시해줘"라고 하세요.',
    course: '첫 과정을 만듭니다. 주제 · 차시 수 · 대상을 말씀하시면 커리큘럼 · 영상 · 퀴즈 · 과제까지 채운 초안을 보여 드립니다. 만든 뒤에도 "3차시 영상 바꿔줘"처럼 말로 고치면 됩니다.',
    book: '디지털북은 선택 단계입니다. 방금 만든 과정을 책으로 바꾸거나, 주제로 새 책 초안을 만들 수 있습니다. 필요 없으면 "디지털북 단계 빼줘"라고 하세요.',
    diag: 'AI 진단 문항과 결과별 러닝 저니를 만듭니다. 진단 결과에 따라 학생마다 다른 과정이 추천됩니다.',
    lsite: `${tj('learner', '이')} 보게 될 학습자 사이트입니다. 화면에서 페이지 · 섹션을 확인하고 "학습자 사이트 게시해줘"로 공개하세요.`,
    people: `${t('learner')} 명단(CSV)을 올리거나 초대 링크로 등록합니다.${U ? ' 대학은 학번 · 학과만 저장하고 이름 · 연락처는 받지 않습니다.' : ''}`,
    badge: '수료 기준과 디지털 배지를 정합니다. 기준을 채우면 배지가 자동으로 발급됩니다.',
    auto: '반복 업무를 자동화 레시피로 만듭니다. 실행은 항상 운영자 승인 뒤에 처리됩니다.',
    docs: '공문 · 안내문 · 결과 보고서를 표준 문서에서 만듭니다.'
  })[id] || '';
}
function bChipsHTML(id, extra = '') { return `<div class="bqs">${bQ(id).map(x => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(x)}">${esc(x)}</button>`).join('')}${extra}</div>`; }
function bGuideMsg(id, first) {
  const L = bList(); const i = L.findIndex(s => s.id === id); const s = bStep(id);
  const extra = (!s.req ? `<button type="button" class="chip off" data-act="bld-drop" data-v="${id}">이 단계 빼기</button>` : '') + (id !== 'org' ? `<button type="button" class="chip done" data-act="bld-next">완료 · 다음 단계</button>` : '');
  return { role: 'ai', bld: id, text: `${first ? '안녕하세요, AI SAM입니다.\n' : ''}STEP ${i + 1} · ${bName(s)}\n${bGuideText(id)}`, html: bChipsHTML(id, extra) };
}
function bOpenStep(id, announce = true) {
  const s = bStep(id); if (!s) return; S.bld.cur = id; if (s.view !== 'home') bMenuOn(s.view);
  if (announce) { S.chat.push(bGuideMsg(id)); S.chat = S.chat.slice(-60); }
  save(); if (s.view === 'home') { CUR = { ws: 'home', tab: '' }; render(); } else go(s.view, true);
  renderThreads();
}
function bAdvance() {
  const c = bCur(); if (c) S.bld.steps[c.id].done = true; if (c) S.bld.seen[c.id] = 1;
  const n = c ? bNextOf(c.id) : null; save();
  if (!n) { S.chat.push({ role: 'ai', text: '모든 빌드 단계를 마쳤습니다. 이제 운영을 시작하실 수 있습니다.\n첫 화면에서 오늘 확인할 일을 보실 수 있습니다. 이후에도 무엇이든 말로 지시하시면 됩니다.' }); S.bld.cur = ''; save(); CUR = { ws: 'home', tab: '' }; render(); renderThreads(); return null; }
  bOpenStep(n.id); return n;
}

/* ── 대화: 단계 넣기 · 빼기 · 다음 · 디지털북 · 홈페이지 게시 · 배지 · 학습자 등록 ── */
const BWORD = [['site', /홈페이지/], ['book', /디지털\s*북|전자\s*책/], ['diag', /진단/], ['lsite', /학습자\s*(사이트|화면)/], ['badge', /배지|수료/], ['auto', /자동화/], ['docs', /문서|공문/]];
const bFp = () => { let bk = 0; try { bk = bkL().length; } catch (e) { } return [S.classes.length, S.site ? JSON.stringify(S.site).length : 0, bk, (S.diags || []).length, S.autos.length, (S.docs || []).length, S.members.length, S.badges.length, S.msgs.length, S.lsite?.pubAt || ''].join('|'); };
{ const base = answer; const core = q => { const s = String(q || '').trim();
  if (bOn()) {
    if (/^(다음(\s*단계)?(로|으로)?)(\s*(가자|가줘|넘어가(자|줘)?|진행(해\s*줘)?|해\s*줘))?[.!]?$/.test(s) || /(확정|완료|끝났|됐).{0,12}다음\s*단계|다음\s*단계\s*(로|으로)?\s*(가|넘어|진행)/.test(s)) {
      const c = bCur(); if (c) { S.bld.steps[c.id].done = true; S.bld.seen[c.id] = 1; } const n = c ? bNextOf(c.id) : null;
      if (!n) { S.bld.cur = ''; save(); return { text: '모든 빌드 단계를 마쳤습니다. 이제 운영을 시작하실 수 있습니다. 첫 화면에서 오늘 확인할 일을 보실 수 있습니다.', nav: 'home' }; }
      S.bld.cur = n.id; bMenuOn(n.view); save(); const g = bGuideMsg(n.id); delete g.role; return { ...g, nav: n.view };
    }
    if (/(단계|스텝)/.test(s)) {
      const hit = BWORD.find(([, re]) => re.test(s)); const st = hit && bStep(hit[0]);
      if (st && bFits(st)) {
        if (/(빼|제외|끄|꺼|필요\s*없|안\s*할|생략|나중)/.test(s)) { if (st.req) return { text: `「${bName(st)}」은 필수 단계라 뺄 수 없습니다.` }; S.bld.steps[st.id].on = false; if (S.bld.cur === st.id) S.bld.cur = ''; save(); render(); return { text: `「${bName(st)}」 단계를 뺐습니다. 필요해지면 "${bName(st)} 단계 넣어줘"라고 말씀하세요.`, html: bChipsHTML((bCur() || {}).id || 'org') }; }
        if (/(넣|추가|켜|포함|할래|하자|살려)/.test(s)) { S.bld.steps[st.id].on = true; bMenuOn(st.view); save(); render(); return { text: `「${bName(st)}」 단계를 추가했습니다. 위 단계 줄에 표시됩니다. 순서가 되면 안내해 드리겠습니다.` }; }
      }
    }
  }
  if (/디지털\s*북/.test(s) && /(만들|생성|제작|초안|바꿔|변환)/.test(s) && !/(단계|스텝)/.test(s)) {
    const fromCls = /(과정|교과목|강좌|방금)/.test(s) && S.classes.length; const c = fromCls ? S.classes[0] : null;
    const tp = (s.match(/「([^」]{2,40})」/) || [])[1] || s.replace(/디지털\s*북[\s\S]*$/, '').replace(/[「」"']/g, '').trim() || 'AI 리터러시';
    const n = clamp(+(s.match(/(\d+)\s*단원/) || [])[1] || 3, 1, 8); const pid = uid('p');
    PLANS[pid] = { run: () => { lsEnsure(); const b = c ? bkFromCourse(c) : bkAIDraft(tp, n, {}); bkL().push(b); S.ai.usage++; logAudit(`디지털북 생성(AI SAM) — ${b.title}`); UI.bkId = b.id; UI.bkCh = 0; UI.bkT = 'edit'; return `「${b.title}」 ${b.chs.length}단원을 만들었습니다. 화면에서 블록을 확인하고, 고칠 곳은 블록을 눌러 바꾸세요.`; }, go: 'dbook' };
    return { title: '디지털북', text: c ? `「${c.name}」 과정을 디지털북으로 바꾸겠습니다. 장(없으면 차시)으로 단원을 나누고 영상 · 퀴즈 · 과제를 연결합니다.` : `「${tp}」 디지털북 ${n}단원 초안을 만들겠습니다. 단원마다 설명 · 핵심 박스 · 펼쳐보기 · 확인 문제를 넣습니다.`, steps: c ? ['과정 항목을 단원으로 묶기', '읽을거리 · 핵심 정리 채우기', '영상 · 퀴즈 · 과제 연결', '디지털북 편집기에서 확인'] : ['단원 구성', '설명 · 핵심 박스 · 펼쳐보기 · 확인 문제', '디지털북 편집기에서 확인'], plan: pid, state: 'pending', cta: '디지털북 만들기' };
  }
  if (/자동화/.test(s) && /(매주|매일|매월|마다)/.test(s) && !/(단계|스텝)/.test(s)) { const P = interpret(s); if (P.run) { const pid = uid('p'); PLANS[pid] = { run: P.run, go: P.go || 'auto' }; return { title: P.title, text: P.title + '. 아래 계획으로 진행할까요?', steps: P.steps, html: P.preview || '', plan: pid, state: 'pending', cta: P.cta || '자동화 만들기' }; } }
  if (/홈페이지/.test(s) && /(게시|공개|오픈)/.test(s) && !/학습자/.test(s)) { if (!S.site) return { text: '아직 홈페이지가 없습니다. 먼저 원하는 분위기를 말씀해 주시면 만들어 드리겠습니다.', nav: 'site' }; ACT['site-pub'](); return { text: `홈페이지를 게시했습니다 — ${S.org.domain} (데모). 화면에서 확인하세요.`, nav: 'site' }; }
  if (/배지/.test(s) && /(만들|추가|생성)/.test(s)) {
    const c = S.classes[0]; const nm = ((s.match(/「([^」]{1,20})」/) || [])[1] || (/수료/.test(s) ? '수료' : '새 배지')).slice(0, 20); const pid = uid('p');
    PLANS[pid] = { run: () => { S.badges.unshift({ id: uid('bd'), name: nm, key: String(S.badges.length + 1), cls: c?.id || '', method: 'pass', special: false, fill: '#2A2B2B', ring: '#1F2020', rib: '#5C74F6', issued: [] }); bMenuOn('badge'); logAudit(`배지 생성(AI SAM) — ${nm}`); return `「${nm}」 배지를 만들었습니다. 「${c ? c.name : '과정'}」 수료 기준을 채우면 자동 발급됩니다.`; }, go: 'badge' };
    return { title: '배지', text: `「${nm}」 배지를 만들까요? ${c ? `「${c.name}」 과정의 수료 기준(진도 ${c.criteria.threshold}%)을 채우면 자동 발급됩니다.` : ''}`, plan: pid, state: 'pending', cta: '배지 만들기' };
  }
  if (/(학습자|학생|임직원|원생|수강생|훈련생|명단|회원)/.test(s) && /(등록|명단|초대|올릴|업로드)/.test(s) && !/(보내|발송|독려|승인|사이트)/.test(s)) { bMenuOn('enroll'); return { text: `${t('learner')} 등록 화면을 화면에 열었습니다. 명단 파일(CSV)을 올리거나 초대 링크를 보내 등록합니다.${S.org.type === 'univ' ? ' 대학은 학번 · 학과만 저장하고 이름 · 연락처는 받지 않습니다.' : ''}`, nav: 'enroll' }; }
  return base(q);
};
  answer = q => { if (!bOn()) return core(q); const fp = bFp(); const r = core(q); if (r) { if (r.go && !r.nav && !r.plan) r.nav = r.go; if (!r.nav && bFp() !== fp) r.nav = bKey(); if (r.nav) { UI.bpend = r.nav; UI.bsoft = bFp() === fp; } } return r; }; }

/* ── 화면: 상단 바 · 레일 · 대화 열 · 캔버스(단계 줄 + 머리 + 실제 화면) ── */
function bStrip() {
  const L = bList(); const c = bCur();
  return `<div class="bsteps" role="list">${L.map((s, i) => { const d = bDone(s.id), on = c && c.id === s.id && !d; return `<button type="button" role="listitem" class="bst ${d ? 'ok' : on ? 'on' : ''}" data-act="bld-step" data-v="${s.id}" ${on ? 'aria-current="step"' : ''}><small>STEP ${i + 1}${s.req ? '' : ' · 선택'}</small><b>${esc(bName(s))}</b><i>${d ? '완료' : on ? '진행 중' : '대기'}</i></button>`; }).join('')}<button type="button" class="bst cfg" data-act="bld-cfg">${ic('gear', 16)}<b>단계 구성</b><i>켜기 · 끄기</i></button></div>`;
}
function bCfgList() {
  return `<div class="bcfg">${BLD_STEPS.filter(bFits).map(s => { const on = s.req || S.bld.steps[s.id]?.on; return `<div class="bcr ${on ? '' : 'dim'}"><label class="sw"><input type="checkbox" data-chg="bld-tog" data-v="${s.id}" ${on ? 'checked' : ''} ${s.req ? 'disabled' : ''} aria-label="${esc(bName(s))} 단계 사용"><span></span></label><div><b>${esc(bName(s))}</b> ${s.req ? tag('필수') : tag('선택', 'mg')}<small>${esc(s.d)}</small></div>${on ? (bDone(s.id) ? tag('완료', 'g') : `<button type="button" class="btn sm" data-act="bld-step" data-v="${s.id}">열기</button>`) : ''}</div>`; }).join('')}</div>`;
}
function bHome() {
  const ty = TYPES[S.org.type]; const L = bList(); const dn = L.filter(s => bDone(s.id)).length;
  if (bAllDone()) {
    const B = BRIEF();
    return `<div class="card bdone"><div><b>운영 준비 완료</b><p>빌드 ${L.length}단계를 모두 마쳤습니다. 오늘 확인할 일을 맡기거나, 무엇이든 말로 지시하세요.</p></div><button class="btn sm" data-act="bld-cfg">${ic('gear', 14)} 단계 다시 보기</button></div>
      <section class="brief">${B.map(b => `<div class="bc ${b.n ? 'hot' : ''}"><span>${esc(b.label)}</span><b>${b.n}<small>${b.unit}</small></b><button class="btn sm ${b.n ? 'ink' : ''}" data-act="chat-q" data-v="${esc(b.q)}" ${b.n ? '' : 'disabled'}>${ic('spark', 14)} 맡기기</button></div>`).join('')}</section>`;
  }
  const U = S.org.type === 'univ';
  return `<div class="grid g2 bhome">
    <div class="card"><div class="bct"><b>기관 기본 정보</b>${tag(ty.name, 'mg')}</div>
      <label class="fl">기관명<input data-chg="bld-name" value="${esc(S.org.name)}" maxlength="30"></label>
      <dl class="bdl"><dt>기관 유형</dt><dd>${esc(ty.name)} <small>${esc(ty.ex)}</small></dd><dt>학습자 표시</dt><dd>${esc(t('learner'))} · ${esc(t('cls'))} · ${esc(t('group'))}</dd><dt>학습자 식별</dt><dd>${U ? '학번 · 학과만 저장 (이름 · 연락처 수집 안 함)' : '이메일 또는 운영자 초대'}</dd><dt>메뉴</dt><dd>작업 공간 ${S.nav.ws.length}개 · 켜진 화면 ${Object.values(S.nav.tabs).flat().filter(x => x.on).length}개</dd></dl>
    </div>
    <div class="card"><div class="bct"><b>빌드 단계 구성</b><small>${dn}/${L.length} 완료</small></div><p class="mini">필수 단계는 그대로 두고, 선택 단계는 기관에 필요한 것만 켜세요. 대화로 "디지털북 단계 빼줘"라고 해도 됩니다.</p>${bCfgList()}</div>
  </div>`;
}
const bKey = () => CUR.ws === 'home' ? 'home' : CUR.ws === 'dash' ? 'dash' : CUR.ws === 'settings' ? 'settings' : CUR.tab;
const bCrumb = () => CUR.ws === 'home' ? (bAllDone() ? '오늘의 운영' : '빌드 개요') : CUR.ws === 'settings' ? '설정' : lab(WS[CUR.ws]) + (CUR.tab ? ' › ' + mlabel(CUR.tab) : '');
function bComposer() {
  const c = bCur(); const chips = bAllDone() ? EXQ[S.org.type].slice(0, 3) : [...(c ? bQ(c.id) : []), ...(c && c.id !== 'org' ? ['다음 단계로'] : [])];
  return `<form class="composer bcomp" data-where="bld"><div class="chips">${[...new Set(chips)].map(x => `<button type="button" class="chip" data-act="chat-q" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="cbox"><textarea rows="1" maxlength="300" placeholder="AI SAM에게 무엇이든 지시하세요" aria-label="AI SAM에게 지시"></textarea><button class="send" type="submit" aria-label="보내기">${ic('send', 18)}</button></div>
    <small class="cnote"><span><kbd>Enter</kbd> 보내기</span><span>${typeof CL !== 'undefined' && CL.on('chat') ? esc(CL.label()) + ' 연결됨' : '규칙 엔진(데모)'}</span><span>실행은 승인 후</span></small></form>`;
}
{ const base = render; render = () => {
  if (!S || !S.org) { document.body.classList.remove('mode-bld', 'b-pv'); return base(); }
  bEnsure(); if (!bOn()) { document.body.classList.remove('mode-bld', 'b-pv'); return base(); }
  $('#drawer') && $('#drawer').remove(); document.body.classList.remove('drawer-open');
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ' mode-app mode-bld';
  const w = CUR.ws; const key = bKey(); const T = w !== 'home' && w !== 'dash' && w !== 'settings' ? wsTabs(w) : [];
  const hl = UI.bhl && UI.bhl.key === key && Date.now() - UI.bhl.t < 12000;
  const L = bList(); const dn = L.filter(s => bDone(s.id)).length; const fq = typeof FILLQ === 'function' ? FILLQ()[CUR.tab] || FILLQ()[w] : '';
  const c = bCur(); const onStep = c && !bDone(c.id) && (c.view === key);
  $('#app').innerHTML = `
  <header class="top">
    <div class="brand"><span class="logo">D</span><b>${esc(S.org.name)}</b><span class="sub">스튜디오</span></div>
    <div class="bprog" title="운영 준비 ${dn}/${L.length}"><span>운영 준비</span><span class="bpbar"><i style="width:${Math.round(dn / Math.max(1, L.length) * 100)}%"></i></span><b>${dn}/${L.length}</b></div>
    <div class="topr"><select id="roleSel" aria-label="권한별 화면 보기"><option value="owner" ${S.me.role === 'owner' ? 'selected' : ''}>정운영자 화면</option><option value="sub" ${S.me.role === 'sub' ? 'selected' : ''}>부운영자 화면</option><option value="teacher" ${S.me.role === 'teacher' ? 'selected' : ''}>${esc(t('teacher'))} 화면</option></select></div>
  </header>
  <div class="bmseg" role="tablist" aria-label="화면 전환"><button role="tab" type="button" data-act="bld-pane" data-v="chat" aria-selected="${!document.body.classList.contains('b-pv')}">대화</button><button role="tab" type="button" data-act="bld-pane" data-v="pv" aria-selected="${document.body.classList.contains('b-pv')}">미리보기${UI.bnew ? `<em>${UI.bnew}</em>` : ''}</button></div>
  <div class="bx">
    <nav class="brail" aria-label="작업 공간">${rail()}<button class="ri ${w === 'settings' ? 'on' : ''}" data-act="go" data-v="settings">${ic('gear')}<span>설정</span></button></nav>
    <section class="bchat" aria-label="AI SAM 대화">
      <div class="bch"><span class="orb">${ic('spark', 18)}</span><div><b>AI SAM</b><small>${esc(S.org.name)} 운영 비서</small></div><span class="sp"></span>${typeof clBadge === 'function' ? clBadge() : ''}<button class="btn sm ghost" data-act="bld-clear" title="대화 지우기">새 대화</button></div>
      <div class="thread" aria-live="polite">${threadHTML()}</div>${bComposer()}
    </section>
    <main id="main" tabindex="-1" class="bcanvas ws-${w}">
      ${bStrip()}
      <div class="bhd"><div class="bhdl"><small>실시간 미리보기</small><b>${esc(bCrumb())}</b></div>${hl ? `<span class="bchg">${ic('spark', 13)} AI가 방금 이 화면을 바꿨습니다</span>` : ''}<span class="sp"></span>${fq ? `<button class="btn sm ai" data-act="chat-q" data-v="${esc(fq)}">${ic('spark', 14)} 이 화면 AI로 채우기</button>` : ''}${onStep ? `<button class="btn sm ink" data-act="bld-next">완료 · 다음 단계 ${ic('arrow', 14)}</button>` : ''}</div>
      ${T.length > 1 ? `<div class="seg2 wtabs btabs" role="tablist">${T.map(id => `<button role="tab" aria-selected="${id === CUR.tab}" class="${id === CUR.tab ? 'on' : ''}" data-act="go" data-v="${id}">${esc(mlabel(id))}${tabBadge(id)}</button>`).join('')}</div>` : ''}
      <div class="bview ${hl ? 'bhl' : ''}">${w === 'home' ? bHome() : safeView()}</div>
    </main>
  </div>`;
  afterRender();
}; }
/* 대화창: 다른 화면으로 가도 서랍을 열지 않고 왼쪽 대화 열을 쓴다 */
{ const base = ACT['chat-open']; ACT['chat-open'] = el => { if (bOn()) { if (innerWidth <= 860) document.body.classList.remove('b-pv'); $('.bchat textarea')?.focus(); return; } base(el); }; }
{ const base = ACT['chat-close']; ACT['chat-close'] = el => { if (bOn()) return; base(el); }; }
/* 실행 · 이동이 일어나면 캔버스에 결과를 띄우고 바뀐 곳을 표시 */
function bFlash(key, soft) { if (!soft) UI.bhl = { key, t: Date.now() }; if (innerWidth <= 860 && !document.body.classList.contains('b-pv')) UI.bnew = (UI.bnew || 0) + 1; setTimeout(() => { if (UI.bhl && Date.now() - UI.bhl.t >= 12000) { $('.bview')?.classList.remove('bhl'); $('.bchg')?.remove(); } }, 12100); }
{ const base = ACT['plan-ok']; ACT['plan-ok'] = el => { const P = PLANS[el.dataset.v]; const to = P && P.go; base(el); if (!bOn()) return; if (to) { bFlash(to); go(to, true); } else { bFlash(bKey()); render(); } }; }
{ const base = go; go = (id, keep) => { if (bOn() && UI.bpend && UI.bpend === id) { UI.bpend = ''; bFlash(resolve(id).tab || resolve(id).ws, UI.bsoft); UI.bsoft = false; } return base(id, keep); }; }
/* 화면이 그려진 뒤: 대화 맨 아래로 · 단계가 새로 끝났으면 축하 + 다음 안내 */
AFTER.push(() => {
  if (!bOn()) return; const th = $('.bchat .thread'); if (th) th.scrollTop = th.scrollHeight;
  const fresh = bList().filter(s => bDone(s.id) && !S.bld.seen[s.id]); if (!fresh.length) return;
  fresh.forEach(s => { S.bld.seen[s.id] = 1; }); const s = fresh[fresh.length - 1]; const n = bList().find(x => !bDone(x.id)) || null; /* v21 다음 = 순서상 아직 안 끝난 첫 단계 */
  S.chat.push({ role: 'ai', text: `「${bName(s)}」 단계를 마쳤습니다. 화면에 반영되었습니다.${n ? `\n다음은 「${bName(n)}」입니다. ${bStep(n.id).d}.` : '\n모든 빌드 단계를 마쳤습니다. 이제 운영을 시작하실 수 있습니다.'}`, html: n ? `<div class="bqs"><button type="button" class="chip done" data-act="bld-step" data-v="${n.id}">「${esc(bName(n))}」 시작하기</button></div>` : '' });
  if (n) S.bld.cur = n.id; S.chat = S.chat.slice(-60); save(); setTimeout(() => { renderThreads(); const st = $('.bsteps'); if (st) st.outerHTML = bStrip(); const p = $('.bprog'); if (p) { const L = bList(), dn = L.filter(x => bDone(x.id)).length; p.querySelector('i').style.width = Math.round(dn / L.length * 100) + '%'; p.querySelector('b').textContent = `${dn}/${L.length}`; } }, 0);
});

/* ── 동작 ── */
ACT['bld-step'] = el => { const s = bStep(el.dataset.v); if (!s) return; if (!s.req && !S.bld.steps[s.id]?.on) { S.bld.steps[s.id].on = true; } closeModal(); if (innerWidth <= 860) document.body.classList.add('b-pv'); bOpenStep(s.id, S.bld.cur !== s.id || !S.chat.some(m => m.bld === s.id)); };
ACT['bld-next'] = () => { closeModal(); bAdvance(); };
ACT['bld-drop'] = el => { const s = bStep(el.dataset.v); if (!s || s.req) return; S.bld.steps[s.id].on = false; S.chat.push({ role: 'ai', text: `「${bName(s)}」 단계를 뺐습니다. 필요해지면 "${bName(s)} 단계 넣어줘"라고 말씀하세요.` }); if (S.bld.cur === s.id) { const n = bNextOf(s.id); if (n) { bOpenStep(n.id); return; } } save(); render(); renderThreads(); };
ACT['bld-tog'] = el => { const s = bStep(el.dataset.v); if (!s || s.req) return; S.bld.steps[s.id].on = el.checked; if (el.checked) bMenuOn(s.view); save(); const m = $('#modal'); if (m) { m.querySelector('.bcfg').outerHTML = bCfgList(); } render(); toast(`「${bName(s)}」 단계를 ${el.checked ? '켰' : '껐'}습니다.`, 'ok'); };
ACT['bld-cfg'] = () => modal('빌드 단계 구성', `<p class="mini">필수 단계(기관 구성 · 과정 빌드 · ${esc(t('learner'))} 등록)는 항상 포함됩니다. 선택 단계는 기관에 필요한 것만 켜세요. 끈 단계의 메뉴와 데이터는 그대로 남습니다.</p>${bCfgList()}`, [{ id: 'c', label: '닫기', kind: 'pri' }]);
ACT['bld-name'] = el => { const v = el.value.trim().slice(0, 30); if (!v) return; S.org.name = v; logAudit('기관명 변경 — ' + v); save(); render(); toast('기관명을 바꿨습니다.', 'ok'); };
ACT['bld-pane'] = el => { const pv = el.dataset.v === 'pv'; document.body.classList.toggle('b-pv', pv); if (pv) UI.bnew = 0; render(); };
ACT['bld-on'] = () => { bEnsure(); S.bld.on = true; save(); render(); }; ACT['bld-off'] = ACT['bld-on']; /* 옛 버튼이 남아 있어도 같은 화면 */
ACT['bld-clear'] = () => { S.chat = []; const c = bCur(); if (c && !bAllDone()) S.chat.push(bGuideMsg(c.id)); save(); render(); };
/* 다른 기관으로 바꾸거나 새로 만들 때도 빌드 모드로 시작 */
{ const base = createOrg; createOrg = (...a) => { base(...a); try { if (S && S.org) { delete S.bld; bInit(); } } catch (e) { console.error(e); } }; }
COVER.push(['[신규] AI 빌드 모드: 대화가 메인 · 캔버스 실시간 반영 · 빌드 단계(필수 · 선택)', 'home', '']);
