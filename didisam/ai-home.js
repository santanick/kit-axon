/* 디디쌤 스튜디오 v24 — 역할별 'AI 비서' 홈(운영자 · 교수자)
   대표님(2026-11-03): '요즘 AI 비서 서비스처럼 UI/UX를 아주 심플하게. Connect로 자기 업무 툴과 연결해 자동화를 만들듯이,
   운영자 · 교수자 · 학습자에게 AI 비서를 만들어 주는 개념으로(각각의 뷰로).'
   - 홈 = AI 비서 화면: 인사 + '무엇을 도와드릴까요?' 입력창 하나 + 추천 일 5개 이하 + 최근 대화(답 · 실행 계획 카드)
     + 시작 가이드(운영자) + 오늘 할 일 + Connect(연결한 업무 툴) + 내 자동화 + 전체 메뉴
   - 기능은 그대로: 왼쪽 레일 · 모든 화면 · go(id) · '현황' 탭 · 메뉴 찾기. 홈에서는 떠 있는 AI SAM 버튼을 숨기고(화면 자체가 비서),
     다른 화면에서는 오른쪽 아래 AI SAM이 그대로(사람이 열 때만 열림)
   - 교수자(scn()==='teacher'): 같은 틀, 내 강의 범위 — 질문 답변 · 채점 · 독려 · 강의 자료 · 내 강의 현황 / Connect(Calendar · Drive · Slack · Zoom) / 내 자동화
   index.html에서 ux.js 다음에 로드. */
'use strict';
if (!IC.plug) IC.plug = '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 01-12 0z"/><path d="M12 17v4"/>';
if (!IC.bolt) IC.bolt = '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>';

const aihTeacher = () => typeof scn === 'function' && scn() === 'teacher';
function aihActive() {
  try { if (!S || !S.org || !S.bld || UI.door || CUR.ws !== 'home') return false; if (typeof smOn === 'function' && smOn()) return false;
    if (aihTeacher() && (UI.tst === 'operate' || UI.tst === 'report')) return false; return true; } catch (e) { return false; }
}
/* v37 첫 화면 호칭 · 예시 문장(대표님 2026-11-10 '각 기관별 유형 담당자 이름을 제대로 부르는지 · 페르소나에 맞는 워딩인지 재검수')
   유형 판단은 한 곳(aihKey: 유형 + 대학 에디션) — 레일 · 용어(TERMS) · 사이트 메뉴 이름(HPS.menuName)과 같은 S.org.type · S.org.ed를 쓴다.
   - 대학 lite(사업단 · 센터): 교수학습센터 · ATC · 사업단 운영자가 쓰는 화면 → '센터 담당자님'(교수는 교수 스튜디오에서 '교수님')
   - 대학 lms(학사 LMS · 전교생): 학사 운영(학기 · 교과목 · 분반 준비) 담당 → '학사 담당자님' */
const aihKey = () => S.org.type === 'univ' ? (S.org.ed === 'lms' ? 'univ_lms' : 'univ_lite') : S.org.type;
const AIH_WHO = { univ_lms: '학사 담당자', univ_lite: '센터 담당자', corp: 'HRD 담당자', public: '교육 담당자', k12: '원장', adult: '원장', lifelong: '운영 담당자', voc: '훈련 담당자' };
const AIH_PH = { univ_lms: '이번 학기 개설 교과목 점검하고 미접속 학생에게 안내 보내줘', univ_lite: 'AI 리터러시 비교과 프로그램 만들고 진단 · 모집 공지까지 채워줘' };
const aihWho = () => aihTeacher() ? `${t('teacher')}님` : (S.me.name && !/^(관리자|운영자)$/.test(S.me.name) ? S.me.name + '님' : (AIH_WHO[aihKey()] || (typeof SEG_TITLE !== 'undefined' && SEG_TITLE[S.org.type]) || '담당자') + '님');
const aihPh = () => AIH_PH[aihKey()] || ((typeof EXQ !== 'undefined' && EXQ[S.org.type]) || ['이번 주 운영 현황 요약해줘'])[0];
const aihDate = () => { const d = new Date(); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`; };

/* ── 추천 일(최대 5) ── */
function aihChips() {
  const out = []; const add = (l, q) => { if (out.length < 5 && q && !out.some(x => x[1] === q)) out.push([l, q]); };
  if (aihTeacher()) { const c = typeof tCur === 'function' ? tCur() : null; const n = c ? `「${c.name}」 ` : '';
    add(`${t('learner')} 질문 답변`, '학생 질문 답변 초안 만들어줘'); add('과제 채점', '채점 대기 과제 AI로 1차 채점해줘'); add('진도 독려', '진도 미달 학생에게 독려 메시지 보내줘');
    add('강의 자료 만들기', `${n}3차시 강의자료 만들어줘`); add('내 강의 현황', '오늘 할 일 브리핑해줘'); return out; }
  try { if (S.bld && !bAllDone()) { const c = bCur(); const q = c && typeof obQ === 'function' ? obQ(c.id) : ''; if (q) add(`${bName(c)}`, q); } } catch (e) { }
  try { BRIEF().filter(b => b.n > 0).forEach(b => add(`${b.label} ${b.n}${b.unit}`, b.q)); } catch (e) { }
  ((typeof EXQ !== 'undefined' && EXQ[S.org.type]) || []).forEach(q => add(q, q));
  add('Slack 연결 도와줘', 'Slack 연결 도와줘'); return out;
}

/* ── 최근 대화(마지막 지시부터) ── */
function aihThreadHTML() {
  const L = S.chat || []; let i = -1; for (let k = L.length - 1; k >= 0; k--) if (L[k].role === 'user') { i = k; break; }
  if (i < 0 || (UI.aihHide != null && i < UI.aihHide)) return '';
  return L.slice(i).map(m => m.role === 'user' ? `<div class="msg u"><div class="bub">${esc(m.text)}</div></div>` : `<div class="msg a"><span class="av">${ic('spark', 16)}</span><div class="bub">${m.typing ? '<span class="dots"><i></i><i></i><i></i></span>' : aiBody(m)}</div></div>`).join('');
}
function aihResHTML() { const h = aihThreadHTML();
  return `<section class="aih-res" ${h ? '' : 'hidden'} aria-label="최근 대화"><div class="aih-rh"><b>${ic('spark', 14)} 방금 맡긴 일</b><span class="sp"></span><button type="button" class="aih-lk" data-act="aih-clear">지우기</button></div><div class="aih-th" aria-live="polite">${h}</div></section>`; }
function aihSync() { const box = $('.aih-res'); if (!box) return; const h = aihThreadHTML(); box.hidden = !h; const th = box.querySelector('.aih-th'); if (th) th.innerHTML = h; try { uxWords(th); } catch (e) { } }
{ const base = renderThreads; renderThreads = (...a) => { const r = base(...a); try { aihSync(); } catch (e) { } return r; }; }
ACT['aih-clear'] = () => { UI.aihHide = (S.chat || []).length; aihSync(); };

/* ── Connect ── */
const AIH_USE = { claude: 'AI SAM 답변 품질', mcp: '외부 AI 앱 연결', slack: '운영 알림 받기', google: '일정 · 시트 · 메일', toss: '수강료 결제', channeltalk: '상담 버튼' };
function aihConnHTML() {
  if (aihTeacher()) return aihTConnHTML();
  if (typeof CN === 'undefined') return '';
  const ids = CN_IDS.filter(id => CN[id]); const on = ids.filter(id => cnStatus(id).st === CN_ST.on).length;
  return `<section class="aih-sec" aria-labelledby="aihCn"><div class="aih-sh"><h2 id="aihCn">Connect <small>업무 툴 연결 ${on}/${ids.length}</small></h2><span class="sp"></span>${S.me.role === 'owner' ? `<button type="button" class="aih-lk" data-act="go" data-v="conn">전체 보기</button>` : ''}</div>
    <div class="aih-cn">${ids.map(id => { const s = cnStatus(id); const d = CN[id]; const tone = s.st === CN_ST.on ? 'on' : s.st === CN_ST.chk ? 'chk' : '';
      return `<button type="button" class="aih-cc ${tone}" data-act="cn-open" data-v="${id}" aria-label="${esc(d.name)} — ${esc(s.st)}. 연결 안내 열기">${typeof brandLogo === 'function' ? brandLogo(id, 40, d.name) : `<span class="aih-lg" style="--c:${esc(d.col)}">${esc(d.logo)}</span>`}<span class="aih-cm"><b>${esc(d.name.replace(' API 키', '').replace('(외부 AI 연결)', ''))}</b><small>${esc(s.st === CN_ST.on ? s.st : s.st === CN_ST.chk ? s.st : AIH_USE[id] || d.use.split(' · ')[0])}</small></span><i class="aih-dot" aria-hidden="true"></i></button>`; }).join('')}</div></section>`;
}
/* 교수자 Connect: 내 계정 단위(데모) — Calendar · Drive · Slack · Zoom */
const AIH_TC = {
  gcal: { n: 'Google Calendar', lg: 'G', col: '#1A73E8', use: '수업 · 상담 일정', svc: 'google', sub: 'calendar', steps: ['[연결하기]를 누르고 학교 · 기관 Google 계정을 고릅니다.', '동의 화면에서 「캘린더 일정 만들기」 권한만 허용합니다.', '이제 "다음 주 보강 일정 잡아줘"처럼 말하면 AI 조교가 일정 초안을 만들고, 승인하면 캘린더에 넣습니다.'] },
  gdrive: { n: 'Google Drive', lg: 'D', col: '#0F9D58', use: '강의 자료 가져오기 · 저장', svc: 'google', sub: 'drive', steps: ['[연결하기]를 누르고 Google 계정을 고릅니다.', '디디쌤이 만든 파일과 직접 고른 파일만 쓸 수 있게 허용합니다(전체 드라이브 권한은 요청하지 않습니다).', '"Drive의 3차시 PPT로 퀴즈 만들어줘"처럼 지시합니다.'] },
  slack: { n: 'Slack', lg: 'S', col: '#4A154B', use: '과제 제출 · 질문 알림', svc: 'slack', steps: ['기관 운영자가 Slack을 연결해 두었다면 바로 씁니다.', '아니면 [연결하기]로 내 워크스페이스의 알림 채널(예: #내강의)을 고릅니다.', '내 자동화에서 「과제 제출 → 알림」을 켜면 이 채널로 알려 드립니다.'] },
  zoom: { n: 'Zoom', lg: 'Z', col: '#2D8CFF', use: '실시간 수업 링크', soon: true, steps: ['Zoom 연결은 준비 중입니다.', '지금은 강의 항목(라이브)에 Zoom 회의 링크를 붙여 넣어 쓰세요. 학습자 화면에 [입장] 버튼으로 보입니다.'] }
};
function aihTC() { const me = typeof tMe === 'function' ? tMe() : null; const k = (me && me.id) || 'teacher'; S.tconn = S.tconn && typeof S.tconn === 'object' ? S.tconn : {}; S.tconn[k] = S.tconn[k] || {}; return S.tconn[k]; }
function aihTCState(id) { const d = AIH_TC[id]; if (d.soon) return { st: '준비 중', on: false };
  const mine = aihTC()[id]; if (mine && mine.on) return { st: '연결됨', on: true, note: mine.mode === 'demo' ? '데모 연결' : '' };
  try { if (d.svc && typeof cnOn === 'function' && cnOn(d.svc) && (!d.sub || cnEnsure().google.svcs[d.sub])) return { st: '연결됨', on: true, note: '기관 연결 사용' }; } catch (e) { }
  return { st: '미연결', on: false }; }
function aihTConnHTML() { const ids = Object.keys(AIH_TC); const on = ids.filter(id => aihTCState(id).on).length;
  return `<section class="aih-sec" aria-labelledby="aihCn"><div class="aih-sh"><h2 id="aihCn">Connect <small>내 업무 툴 ${on}/${ids.length}</small></h2></div>
    <div class="aih-cn">${ids.map(id => { const d = AIH_TC[id]; const s = aihTCState(id); return `<button type="button" class="aih-cc ${s.on ? 'on' : ''} ${d.soon ? 'soon' : ''}" data-act="aih-tc" data-v="${id}" aria-label="${esc(d.n)} — ${esc(s.st)}. 연결 안내 열기">${typeof brandLogo === 'function' ? brandLogo(id, 40, d.n) : `<span class="aih-lg" style="--c:${d.col}">${d.lg}</span>`}<span class="aih-cm"><b>${esc(d.n)}</b><small>${esc(s.on ? (s.note || s.st) : d.soon ? '준비 중' : d.use)}</small></span><i class="aih-dot" aria-hidden="true"></i></button>`; }).join('')}</div></section>`; }
ACT['aih-tc'] = el => { const id = el.dataset.v; const d = AIH_TC[id]; if (!d) return; const s = aihTCState(id); const mine = aihTC()[id] || {};
  const acts = d.soon ? [{ id: 'c', label: '확인', kind: 'pri' }] : s.on ? [{ id: 'c', label: '닫기' }, ...(mine.on ? [{ id: 'off', label: '연결 해제', run: () => { delete aihTC()[id]; logAudit(`교수자 연결 해제 — ${d.n}`); save(); render(); toast(`${d.n} 연결을 해제했습니다.`, 'ok'); } }] : [])]
    : [{ id: 'c', label: '나중에' }, { id: 'ok', label: '연결하기(데모)', kind: 'pri', run: () => { aihTC()[id] = { on: true, mode: 'demo', at: today() }; /* 운영: Google OAuth(initCodeClient, 고른 범위만) · Slack OAuth를 서버가 처리하고 토큰은 서버에 보관 */ logAudit(`교수자 연결 — ${d.n}(데모)`); save(); render(); toast(`${d.n}을 연결했습니다(데모 — 실제 계정 연결은 운영 서버에서).`, 'ok'); } }];
  modal(`${d.n} 연결`, `<p class="mini">${esc(d.use)} · 지금 상태: <b>${esc(s.st)}</b>${s.note ? ` (${esc(s.note)})` : ''}</p><ol class="aih-steps">${d.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol><p class="mini">키 · 토큰은 대화창에 붙여 넣지 않습니다. 연결 정보는 서버에만 보관합니다.</p>`, acts); };

/* ── 내 자동화 ── */
const AIH_TT = [
  { k: 'submit', n: '과제 제출 → 나에게 알림 + 채점 초안', tr: 'ev:submit', acts: ['manager', 'draft'], d: '학생이 과제를 내면 바로 알려 드리고 AI 채점 초안을 만들어 둡니다.' },
  { k: 'weekly', n: '주간 리포트 → 내 메일', tr: 'sc:fri', acts: ['report'], d: '매주 금요일 내 강의 진도 · 질문 · 제출 현황을 정리해 보내 드립니다.' },
  { k: 'question', n: '질문 도착 → AI 답변 초안', tr: 'ev:question', acts: ['draft', 'manager'], d: '학생 질문이 오면 답변 초안을 만들고 알려 드립니다. 보내기는 승인 후.' }
];
const aihMine = () => { const me = typeof tMe === 'function' ? tMe() : null; return (S.autos || []).filter(a => a.by === 'teacher' && (!me || !a.owner || a.owner === me.id)); };
function aihAutoRow(a) { return `<li class="aih-ar ${a.on ? '' : 'off'}"><span class="aih-ai">${ic('bolt', 15)}</span><div><b>${esc(a.name)}</b><small>${esc(trigLabel(a.trigger))} · ${esc((a.actions || []).map(x => String(ACTION[x] || x).replace(/\(.*\)/, '').trim()).slice(0, 2).join(' → '))}</small></div><label class="sw" title="${a.on ? '켜짐' : '꺼짐'}"><input type="checkbox" ${a.on ? 'checked' : ''} data-chg="auto-on" data-v="${a.id}" aria-label="${esc(a.name)} ${a.on ? '끄기' : '켜기'}"><span></span></label></li>`; }
function aihAutoHTML() {
  const T = aihTeacher(); const L = T ? aihMine() : (S.autos || []); const on = L.filter(a => a.on).length;
  const tpls = T ? AIH_TT.filter(x => !L.some(a => a.key === 'tc-' + x.k)).slice(0, 2).map(x => `<li class="aih-tp"><div><b>${esc(x.n)}</b><small>${esc(x.d)}</small></div><button type="button" class="btn sm" data-act="aih-tt" data-v="${x.k}">만들기</button></li>`)
    : (typeof CN_TPL !== 'undefined' ? CN_TPL.filter(x => !L.some(a => a.key === 'cn-' + x.k)).slice(0, 2).map(x => { const miss = cnNeeds(x.acts); return `<li class="aih-tp"><div><b>${esc(x.n)}</b><small>${miss.length ? `연결 필요: ${esc(miss.join(' · '))}` : esc(x.d)}</small></div><button type="button" class="btn sm" data-act="cn-tpl" data-v="${x.k}">만들기</button></li>`; }) : []);
  return `<section class="aih-sec" aria-labelledby="aihAu"><div class="aih-sh"><h2 id="aihAu">내 자동화 <small>${L.length ? `${on}개 켜짐` : '아직 없음'}</small></h2><span class="sp"></span>${!T ? `<button type="button" class="aih-lk" data-act="go" data-v="auto">전체 보기</button>` : ''}</div>
    ${L.length ? `<ul class="aih-al">${L.slice(0, 3).map(aihAutoRow).join('')}</ul>${L.length > 3 ? `<p class="aih-more">외 ${L.length - 3}개${T ? '' : ' — 전체 보기에서 관리'}</p>` : ''}` : ''}
    ${tpls.length ? `<p class="aih-sub">${L.length ? '이런 자동화도 만들 수 있어요' : '한 번 만들어 두면 알아서 처리합니다. 실행 전에는 항상 승인을 받습니다.'}</p><ul class="aih-al tp">${tpls.join('')}</ul>` : ''}</section>`;
}
ACT['aih-tt'] = el => { const x = AIH_TT.find(y => y.k === el.dataset.v); if (!x) return; const me = typeof tMe === 'function' ? tMe() : null;
  const acts = x.acts.slice(); if (aihTCState('slack').on && !acts.includes('slack')) acts.push('slack');
  const a = A('tc-' + x.k, x.n, x.tr, `내 강의(${(typeof tCls === 'function' ? tCls() : []).map(c => c.name).slice(0, 3).join(', ') || t('cls')})`, acts, true, true);
  a.by = 'teacher'; a.owner = me ? me.id : ''; a.cls = (typeof tCls === 'function' ? tCls() : []).map(c => c.id); a.proc = true; a.custom = true; S.autos.unshift(a);
  logAudit(`교수자 자동화 생성 — ${a.name}`); save(); render(); toast(`「${a.name}」을 켰습니다. 실행 전에는 항상 승인을 받습니다.`, 'ok'); };

/* ── 오늘 할 일 ── */
function aihTodoHTML() {
  let rows = [];
  if (aihTeacher()) rows = (typeof TQB === 'function' ? TQB() : []).filter(b => b.n > 0).slice(0, 4).map(b => [b.n, b.u, b.h, b.q]);
  else { try { rows = BRIEF().filter(b => b.n > 0).slice(0, 4).map(b => [b.n, b.unit, b.label, b.q]); } catch (e) { } }
  if (!rows.length) return '';
  return `<section class="aih-sec uxtodo" aria-labelledby="aihTd"><div class="aih-sh"><h2 id="aihTd">오늘 할 일 <small>${rows.length}가지</small></h2></div><ol>${rows.map(([n, u, l, q]) => `<li class="uxt"><span class="uxtn">${n}<small>${esc(u)}</small></span><div><b>${esc(l)}</b><small>계획을 먼저 보여 드리고, 승인하면 실행합니다.</small></div><button type="button" class="btn sm" data-act="chat-q" data-v="${esc(q)}">${ic('spark', 14)} 맡기기</button></li>`).join('')}</ol></section>`;
}
/* 교수자: 내 강의 */
function aihCoursesHTML() { const L = typeof tCls === 'function' ? tCls() : [];
  return `<section class="aih-sec" aria-labelledby="aihMc"><div class="aih-sh"><h2 id="aihMc">내 강의 <small>${L.length}개</small></h2><span class="sp"></span><button type="button" class="aih-lk" data-act="tst-new">+ 새 강의</button></div>
    ${L.length ? `<ul class="aih-al">${L.slice(0, 4).map(k => { const s = tStageOf(k); const av = Math.round(avgP(k)); return `<li class="aih-cr"><div><b>${esc(k.name)}</b><small>${esc(k.status)} · ${esc(s.n)} 단계 · 수강 ${k.learners.length}명 · 평균 진도 ${av}%</small><span class="aih-pb" aria-hidden="true"><i style="width:${av}%"></i></span></div><button type="button" class="btn sm" data-act="tst-open" data-c="${k.id}" data-v="${s.id}">${esc(s.n)} 이어서</button></li>`; }).join('')}</ul>` : `<p class="aih-sub">아직 담당 강의가 없습니다. 위 입력창에 "AI 리터러시 8주 과정 설계해줘"처럼 말해 보세요.</p>`}</section>`; }

/* ── 전체 메뉴(클래식 화면 바로 가기) ── */
function aihMenuHTML() {
  const ws = S.nav.ws.filter(w => WS[w] && w !== 'home' && w !== 'dash' && wsTabs(w).length);
  return `<nav class="aih-menu" aria-label="전체 메뉴"><span>전체 메뉴</span>${ws.map(w => `<button type="button" data-act="go" data-v="${w}">${ic(WS[w].icon, 15)}${esc(lab(WS[w]))}</button>`).join('')}<button type="button" data-act="go" data-v="dash">${ic('chart', 15)}현황</button><button type="button" data-act="ux-find">${ic('search', 15)}메뉴 찾기</button></nav>`;
}

/* ── 홈 = AI 비서 ── */
function aihHomeHTML() {
  const T = aihTeacher(); const nm = T ? 'AI 조교' : 'AI SAM'; const chips = aihChips();
  const guide = !T && S.bld && !(bAllDone() && S.bld.obHide) ? `<div class="aih-guide">${obHTML().replace('아래 대화창에', '위 입력창에')}</div>` : '';
  return `<div class="aih ${T ? 'aih-t' : ''}">
  <section class="aih-hero" aria-labelledby="aihH"><span class="aih-orb" aria-hidden="true">${ic('spark', 22)}</span>
    <p class="aih-ey">${esc(aihDate())} · ${esc(S.org.name)} · ${T ? `${t('teacher')} 비서` : '운영 비서'} ${esc(nm)}</p>
    <h1 id="aihH">안녕하세요, ${esc(aihWho())}.<br><em>무엇을 도와드릴까요?</em></h1>
    <form class="composer aih-comp" data-where="home"><div class="cbox"><label for="aihQ" class="sr">${esc(nm)}에게 지시</label><textarea id="aihQ" rows="1" maxlength="300" placeholder="${T ? '예: 3차시 퀴즈 5문항 만들어줘' : `예: ${esc(aihPh())}`}"></textarea><button class="send" type="submit" aria-label="보내기">${ic('send', 18)}</button></div></form>
    <div class="aih-chips" role="list" aria-label="추천 일">${chips.map(([l, q]) => `<button type="button" role="listitem" class="chip" data-act="chat-q" data-v="${esc(q)}">${esc(l)}</button>`).join('')}</div>
    <p class="aih-note">${typeof CL !== 'undefined' && CL.on && CL.on('chat') ? `${esc(CL.label())} 연결됨 · ` : ''}실행하는 일은 계획을 먼저 보여 드리고, 승인하신 뒤에 처리합니다.</p>
  </section>
  ${aihResHTML()}
  ${guide}
  ${T ? aihTodoHTML() + aihCoursesHTML() : aihTodoHTML()}
  <div class="aih-two">${aihConnHTML()}${aihAutoHTML()}</div>
  ${aihMenuHTML()}
</div>`;
}
{ const base = bHome; bHome = () => { if (!aihActive()) return (aihTeacher() && typeof tHome === 'function' && (UI.tst === 'operate' || UI.tst === 'report')) ? tHome() : base(); try { return aihHomeHTML(); } catch (e) { console.error(e); return base(); } }; }

/* 시작 가이드: 홈 안 카드도 함께 다시 그림 · 홈에서는 위젯을 자동으로 열지 않음 */
{ const base = obMount; obMount = (...a) => { if (aihActive() && S.bld && !S.bld.obAuto) { S.bld.obAuto = 1; try { save(); } catch (e) { } } const r = base(...a);
  const g = $('.aih-guide'); if (g) { const h = obHTML().replace('아래 대화창에', '위 입력창에'); g.innerHTML = h; g.hidden = !h; } return r; }; }
/* 홈에서 AI SAM을 부르면(버튼 · Ctrl+K · '시작 가이드' 막대) 위젯 대신 홈 입력창으로 */
{ const base = fabOpen; fabOpen = (focus = true) => { if (aihActive() && fabOn()) { const ta = $('#aihQ'); if (ta) { ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (focus) ta.focus({ preventScroll: true }); } return true; } return base(focus); }; }
{ const base = ACT['ob-show']; ACT['ob-show'] = el => { if (aihActive()) { UI.obc = false; if (S.bld) S.bld.obHide = false; obMount(); const g = $('.aih-guide'); g && g.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; } return base(el); }; }
/* 교수자: 운영 · 성과 화면을 보다가 레일 '홈'을 누르면 비서 홈으로(운영 · 성과는 내 강의 카드 · 대화에서 다시 열림) */
{ const base = ACT.go; ACT.go = el => { if (el && el.dataset && el.dataset.v === 'home' && aihTeacher() && (UI.tst === 'operate' || UI.tst === 'report')) UI.tst = ''; return base(el); }; }
/* 그린 뒤: 홈 표시 · 위젯 닫기 · 머리 탭 이름 */
AFTER.push(() => {
  const on = aihActive(); document.body.classList.toggle('aih-on', on);
  if (!on) return;
  try { if (FAB.get().open) FAB.set({ open: false }); } catch (e) { }
  const tb = $('.uxhd [data-v=home]'); if (tb) tb.textContent = aihTeacher() ? 'AI 조교' : 'AI 비서';
  const b = $('.bhdl b'); if (b) b.textContent = aihTeacher() ? '교수 스튜디오' : '오늘의 운영';
  if (innerWidth <= 860) { UI.uxPane = 'pv'; document.body.classList.add('b-pv'); } /* 휴대폰: 홈은 비서 화면 하나(대화/화면 전환 숨김) */
});
COVER.push(['[개선] 역할별 AI 비서 홈: 입력창 하나 · 추천 일 · Connect · 내 자동화 · 전체 메뉴(운영자 · 교수자)', 'home', '']);
