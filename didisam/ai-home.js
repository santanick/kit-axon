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
function aihHomeHTML() { if (!aihTeacher() && window.V4) return aih43HTML(); return aihHomeT(); }
function aihHomeT() {
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
/* ── v43 운영자 홈(최종 시안 2판 admin.html): 한 문장 브리핑 히어로 · 처리 카드 · 시설 타임라인 · 매출 차트 · 수납 도넛 · 대기 목록 + 오른쪽 AI SAM 패널(요약 → 계획 → 승인 · 고치기)
   데이터가 없는 새 기관은 시작 가이드 중심 화면. 입력창(#aihQ) · 추천 칩(.aih-chips) · 최근 대화(.aih-res)는 오른쪽 패널에 둔다. */
const AIH_PREP = { grade: ['task', '채점 초안 준비'], qna: ['chat', '답변 초안 준비'], refund: ['receipt', '환불액 계산 완료'], away: ['send', '독려 메시지 초안 준비'], diag: ['send', '안내문 초안 준비'], legal: ['send', '마감 안내 초안 준비'], att: ['send', '경고 안내 초안 준비'], docs: ['file', '채울 값 준비'], coach: ['cal', '코칭 메시지 준비'] };
const aihHasData = () => !!((S.members || []).length || (S.classes || []).length || (S.pays || []).length);
function aih43Tasks() { let B = []; try { B = BRIEF().filter(b => b.n > 0); } catch (e) { }
  const L = B.map(b => { const p = AIH_PREP[b.k]; return { k: b.k, ic: p ? p[0] : 'check', t: b.label, s: p ? p[1] : '직접 확인 필요', n: b.n, u: b.unit || '건', q: b.q, prep: !!p }; });
  try { if (window.ledgerView && typeof menuOn === 'function' && menuOn('ledger')) { const T = ledgerView.todo(); const n = (T.s1 || 0) + (T.s2 || 0) + (T.s3 || 0); if (n && !L.some(x => x.k === 'unpaid')) L.push({ k: 'unpaid', ic: 'wallet', t: '미납 결제 안내', s: '직접 확인 필요', n, u: '명', act: 'go', v: 'ledger', tag: `미납 ${n}명`, prep: false }); } } catch (e) { }
  return L.slice(0, 4); }
function aih43Card(id, title, side, body, cls = '') { return `<section class="v4-card aih43-c ${cls}" aria-labelledby="${id}"><div class="v4-ch"><h3 id="${id}">${title}</h3>${side || ''}</div>${body}</section>`; }
function aih43Fac() { if (typeof window.facToday !== 'function' || (typeof menuOn === 'function' && !menuOn('fac'))) return ''; let T; try { if (typeof facEnsure === 'function') facEnsure(); T = facToday(); } catch (e) { return ''; } if (!T || !T.rows.length) return '';
  const R = T.rows.slice(0, 3); return aih43Card('aihFac', `오늘 시설 ${T.n}곳 · <span class="num">${T.util}%</span> 가동`, `${T.free.length ? V4.chip('비어 있음 · ' + T.free[0], 'ok') : ''}<button type="button" class="btn sm ghost" data-act="go" data-v="fac">시설 관리 ›</button>`,
    V4.timeline({ lo: T.lo, hi: T.hi, now: T.now, rows: R.map(r => ({ n: r.n, sub: r.open ? `가동 ${r.util}%` : r.closed || '운영 안 함', img: r.img, blocks: r.blocks })) }) + `<div class="aih43-ft"><span>오늘 예약 <b class="num">${T.total}</b>건</span><span>승인 대기 <b class="num">${T.appr}</b>건</span><span class="sp"></span>${T.appr ? `<button type="button" class="btn sm" data-act="go" data-v="fac">승인하러 가기</button>` : ''}</div>`, 'fac'); }
function aih43Rev() { let sm = null; try { if (window.ledgerView) sm = ledgerView.summary(); } catch (e) { }
  const mo = today().slice(0, 7); const dIn = today().slice(8, 10) | 0; const per = Array(dIn).fill(0);
  if (sm && sm.daily && sm.daily.length) sm.daily.forEach(d => { const k = String(d.day || ''); if (k.startsWith(mo)) { const i = (k.slice(8, 10) | 0) - 1; if (i >= 0 && i < dIn) per[i] += +d.net || 0; } });
  else (S.pays || []).filter(p => /완료/.test(p.status || '') && String(p.at || '').startsWith(mo)).forEach(p => { const i = (String(p.at).slice(8, 10) | 0) - 1; if (i >= 0 && i < dIn) per[i] += +p.amount || 0; });
  let c = 0; const cum = per.map(v => (c += v)); const net = sm ? sm.net : c; if (!net && !c) return '';
  const lab = cum.map((_, i) => (i % 3 === 0 || i === dIn - 1) ? `${i + 1}일` : '');
  const wk = (S.weeks || []).slice(-6).map(w => +w.join || 0); const prevW = wk.length > 1 ? wk[wk.length - 2] : 0; const dl = prevW ? Math.round((wk[wk.length - 1] - prevW) / prevW * 100) : null;
  return `<section class="v4-card aih43-c rev" aria-labelledby="aihRev"><div class="v4-ch"><div style="margin-right:auto"><p class="v4-eb" style="margin:0" id="aihRev">${today().slice(5, 7) | 0}월 순매출 · ${dIn}일 기준</p><p class="v4-big">${V4.n(net)}<small>원</small></p></div>${sm ? V4.chip(`수납률 ${sm.collectRate}%`, sm.collectRate < 80 ? 'warn' : 'ok') : ''}</div>
    ${V4.area(cum, { labels: lab, h: 150, fmt: v => V4.n(v) + '원', yfmt: v => v >= 10000 ? Math.round(v / 10000) + '만' : V4.n(v), tipL: i => `${today().slice(5, 7) | 0}월 ${i + 1}일 누적`, aria: '이번 달 누적 순매출 추이' })}
    ${wk.length > 1 ? `<div class="aih43-mini"><span>주간 신규 가입</span><b class="num">${V4.n(wk[wk.length - 1])}명</b>${dl != null ? `<em class="v4-dl ${dl < 0 ? 'dn' : ''}">${dl >= 0 ? '▲' : '▼'} ${Math.abs(dl)}%</em>` : ''}${V4.spark(wk, { w: 96, h: 28 })}</div>` : ''}</section>`; }
function aih43Pay() { if (!window.ledgerView || (typeof menuOn === 'function' && !menuOn('ledger'))) return ''; let sm, T; try { sm = ledgerView.summary(); T = ledgerView.todo(); } catch (e) { return ''; } if (!sm || !(sm.paid || sm.unpaid)) return '';
  const nU = (T.s1 || 0) + (T.s2 || 0) + (T.s3 || 0); const rate = sm.collectRate || 0;
  const parts = [{ l: '수납', v: sm.paid, c: 'var(--c-data)' }, { l: '환불', v: sm.refund, c: 'var(--c-data2)' }, { l: nU ? `미납 ${nU}명` : '미수', v: sm.unpaid, c: 'var(--c-warn)', tone: 'co' }];
  return aih43Card('aihPay', `${today().slice(5, 7) | 0}월 수납`, T.s2 + T.s3 ? V4.chip('납기 지남', 'warn') : '', `<div class="v4-dw">${V4.donut(parts, { size: 112, w: 13, center: `<div><b>${rate}%</b><small>수납</small></div>` })}${V4.legend(parts)}</div>
    ${nU && S.me.role !== 'teacher' ? `<button type="button" class="btn pri aih43-wide" data-act="led-dun" data-v="">${ic('send', 16)} 미납 ${nU}명에게 결제 안내 보내기</button>` : `<button type="button" class="btn aih43-wide" data-act="go" data-v="ledger">수납 원장 보기</button>`}`, 'pay'); }
function aih43Wait() { let L = []; try { if (window.MIL && MIL.isOn && MIL.isOn() && window.milrw && milrw.pending) L = milrw.pending(); } catch (e) { }
  if (L.length) return aih43Card('aihMil', '마일리지 사용 대기', V4.chip(`보상 ${L.length}건`, 'warn'), `<ul class="aih43-ml">${L.slice(0, 3).map((r, i) => `<li class="${i ? '' : 'hv'}"><span class="v4-ph" style="background-image:url(${V4.photo(r.t)})"></span><div><b>${esc(r.t)}</b><small class="num">${esc(r.who)} · ${V4.n(r.p)}P</small></div><button type="button" class="btn sm ${i ? '' : 'pri'}" data-act="mrw-ok" data-v="${esc(r.id)}">승인</button></li>`).join('')}</ul>`, 'mil');
  const Q = (S.posts || []).filter(p => p.kind === '질문' && !p.replies); if (!Q.length) return '';
  const q = Q[0]; const m = (S.members || []).find(x => x.id === q.who) || {};
  return aih43Card('aihQa', `${esc(t('learner'))}의 질문`, V4.chip(`대기 ${Q.length}`, ''), `<div class="aih43-qa"><span class="av">${esc((m.name || '학')[0])}</span><p><b>${esc(m.name || t('learner'))}${q.board ? ' · ' + esc(q.board) : ''}</b>${esc(q.title || '')}</p></div>
    <div class="aih43-draft"><b>${V4.ai()} SAM 답변 초안</b>질문 내용과 강의 자료를 바탕으로 답변 초안을 만들어 둡니다. 확인 후 보내십시오.</div>
    <div class="aih43-two"><button type="button" class="btn pri" data-act="chat-q" data-v="미답변 질문에 답변 초안 만들어줘">초안 보기</button><button type="button" class="btn" data-act="go" data-v="board">질문 열기</button></div>`, 'qa'); }
/* v43 D-A: 오늘 자동 실행(처리 카드) — 켜진 자동화 3건 + 연결 요약. 강사 화면은 그리지 않음 */
function aih43Auto() { if (S.me.role === 'teacher') return ''; const L = (S.autos || []).filter(a => a.on); const on = typeof CN_IDS !== 'undefined' ? CN_IDS.filter(id => { try { return cnStatus(id).st === CN_ST.on; } catch (e) { return false; } }) : [];
  if (!L.length && !on.length) return ''; const tm = ['09:00', '10:30', '11:00'];
  return aih43Card('aihAuto', '오늘 자동 실행', V4.chip(`${L.length}개 켜짐`, 'ok'), `<ul class="aih43-au">${L.slice(0, 3).map((a, i) => `<li><span class="ck">${ic('check', 14)}</span><b>${esc(a.name)}</b><small class="num">${tm[i]}</small></li>`).join('')}</ul>
    <div class="aih43-two">${S.me.role === 'owner' && typeof CN_IDS !== 'undefined' ? `<button type="button" class="btn" data-act="sl-goconn">연결 ${on.length}/${CN_IDS.length}</button>` : ''}<button type="button" class="btn" data-act="sl-goauto">자동화 관리</button></div>`, 'auto'); }
/* 오른쪽 AI SAM 패널 */
function aih43Panel(tasks) { const nm = 'AI SAM'; const chips = aihChips(); const prep = tasks.filter(x => x.prep);
  let sm = null; try { if (window.ledgerView && menuOn('ledger')) sm = ledgerView.summary(); } catch (e) { }
  const sum = aihHasData() ? `${sm && sm.net ? `이번 달 순매출은 <b>${V4.n(sm.net)}원</b>, 수납률은 <b>${sm.collectRate}%</b>입니다. ` : ''}${tasks.length ? `오늘 처리할 일은 <b>${tasks.length}가지</b>이고, 그중 <b>${prep.length}가지</b>는 초안을 만들어 두었습니다.` : '오늘 급하게 처리할 일은 없습니다.'}` : '아직 데이터가 없습니다. 시작 가이드를 따라 하나씩 채우면 매일 아침 여기서 운영 요약을 드립니다.';
  const wk = (S.weeks || []).slice(-5); const mx = Math.max(1, ...wk.map(w => +w.join || 0));
  const plan = tasks.slice(0, 3);
  return `<aside class="aih-sam" aria-label="${nm} 패널"><div class="aih-samh"><span class="v4-orb aih-orb" aria-hidden="true">${ic('spark', 18)}</span><div><b>${nm} ${V4.ai()}</b><small><i class="aih-live" aria-hidden="true"></i>홈 화면을 보고 있습니다</small></div></div>
  <div class="aih-feed">
    <div class="aih-bot"><p class="aih-step"><span>1</span>요약</p><p>${sum}</p>${aihHasData() && wk.length > 2 ? `<div class="aih-mb" aria-hidden="true">${wk.map((w, i) => `<i class="${i === wk.length - 1 ? 'on' : ''}" style="height:${Math.max(8, Math.round((+w.join || 0) / mx * 100))}%"></i>`).join('')}</div><div class="aih-mbl">${wk.map(w => `<span>${esc(String(w.w || w.label || '').slice(-5))}</span>`).join('')}</div><p class="aih-cap">주간 신규 가입</p>` : ''}
      ${plan.length ? `<div class="aih-plan"><p class="aih-step"><span>2</span>계획 · 승인하면 바로 실행합니다</p><ol>${plan.map((x, i) => `<li><i>${i + 1}</i><span>${esc(x.t)} ${x.n}${esc(x.u)}</span><em>${esc(x.prep ? '초안 준비' : '확인 필요')}</em></li>`).join('')}</ol>
      <div class="aih43-two"><button type="button" class="btn pri" data-act="chat-q" data-v="${esc(plan[0].q || '오늘 할 일 브리핑해줘')}">${ic('check', 16)} 계획 승인</button><button type="button" class="btn" data-act="aih-fix">${ic('edit', 16)} 고치기</button></div></div>` : ''}</div>
    ${aihResHTML()}
    <div class="aih-chips" role="list" aria-label="추천 일">${chips.map(([l, q]) => `<button type="button" role="listitem" class="chip" data-act="chat-q" data-v="${esc(q)}">${esc(l)}</button>`).join('')}</div>
  </div>
  <form class="composer aih-comp" data-where="home"><div class="cbox"><label for="aihQ" class="sr">${nm}에게 지시</label><textarea id="aihQ" rows="2" maxlength="300" placeholder="예: ${esc(aihPh())}"></textarea><button class="send" type="submit" aria-label="보내기">${ic('send', 18)}</button></div><p class="aih-note">계획을 먼저 보여 드리고, 승인하신 뒤에 처리합니다.</p></form>
</aside>`; }
ACT['aih-fix'] = () => { const ta = $('#aihQ'); if (!ta) return; ta.value = '계획을 이렇게 바꿔줘: '; ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { } };
function aih43Start() { const L = S.bld && typeof bList === 'function' ? bList() : []; const dn = L.filter(s => bDone(s.id)).length; const cur = L.find(s => !bDone(s.id));
  return `<section class="v4-card aih43-start" aria-labelledby="aihSt"><div class="v4-ch"><h3 id="aihSt">시작 가이드</h3><span class="v4-cap num">${dn}/${L.length} 완료</span><span class="aih43-bar" aria-hidden="true"><i style="width:${L.length ? Math.round(dn / L.length * 100) : 0}%"></i></span></div>
    <ol class="aih43-steps">${L.map((s, i) => { const d = bDone(s.id), on = cur && cur.id === s.id; const q = typeof obQ === 'function' ? obQ(s.id) : ''; return `<li class="${d ? 'ok' : ''} ${on ? 'on' : ''}"><span class="n">${d ? ic('check', 16) : i + 1}</span><div><b>${esc(bName(s))}</b><small>${esc(s.d || '')}</small></div>${d ? V4.chip('완료', 'ok') : on && q ? `<button type="button" class="btn sm pri" data-act="chat-q" data-v="${esc(q)}">${ic('spark', 14)} SAM에게 맡기기</button>` : `<button type="button" class="btn sm" data-act="go" data-v="${esc(s.view)}">열기</button>`}</li>`; }).join('')}</ol></section>`; }
function aih43HTML() { const data = aihHasData(); const who = aihWho(); const tasks = data ? aih43Tasks() : []; const prep = tasks.filter(x => x.prep);
  let main;
  if (data) { const N = tasks.length;
    const h = `<h1 id="aihH"><span class="v4-hi">안녕하세요, ${esc(who)}.</span>${N ? `할 일 <em>${N}건</em> 중 ${prep.length ? `${prep.length}건은 준비해 두었습니다.` : '먼저 볼 일부터 정리했습니다.'}` : '오늘은 급한 일이 <em>없습니다</em>.'}</h1>`;
    const acts = N ? `${prep.length ? `<button type="button" class="btn pri" data-act="chat-q" data-v="${esc(prep[0].q)}">${ic('check', 18)} 준비된 ${prep.length}건 검토 시작</button>` : ''}<button type="button" class="btn dk" data-act="go" data-v="dash">현황 보기</button><span class="cap">계획을 보여 드린 뒤 승인하면 실행합니다</span>` : `<button type="button" class="btn pri" data-act="go" data-v="dash">${ic('chart', 18)} 현황 보기</button>`;
    const side = tasks.length ? V4.stack(tasks.map((x, i) => ({ ic: x.ic, t: x.t, s: x.s, n: x.n, tag: x.tag, act: x.act || 'chat-q', v: x.act ? x.v : x.q, on: i === 0 }))) : '';
    const fac = aih43Fac(), rev = aih43Rev(), pay = aih43Pay(), wait = aih43Wait();
    main = V4.hero({ cls: 'aih-hero', label: 'aihH', eb: `AI SAM 오늘의 브리핑 · ${esc(aihDate())}`, h, acts, side })
      + (fac || rev ? `<div class="aih43-r2 ${fac && rev ? '' : 'one'}">${fac}${rev}</div>` : '')
      + (() => { const au = aih43Auto(); const n = [pay, wait, au].filter(Boolean).length; return n ? `<div class="aih43-r3 n${n} ${n === 1 ? 'one' : ''}">${pay}${wait}${au}</div>` : ''; })(); /* v43 D-A: 아래 연결 · 자동 운영 요약 줄 → 처리 카드 3칸(수납 · 질문 · 오늘 자동 실행) */
  } else {
    const L = S.bld && typeof bList === 'function' ? bList() : []; const cur = L.find(s => !bDone(s.id)); const q = cur && typeof obQ === 'function' ? obQ(cur.id) : '';
    main = V4.hero({ cls: 'aih-hero start', label: 'aihH', eb: `${esc(aihDate())} · ${esc(S.org.name)} · 새 스튜디오`, h: `<h1 id="aihH"><span class="v4-hi">안녕하세요, ${esc(who)}.</span>첫 ${esc(t('cls'))}부터 <em>함께</em> 채워 볼까요?</h1><p class="aih43-lead">말로 지시하면 AI SAM이 계획을 보여 드리고, 승인하시면 만들어 둡니다.</p>`,
      acts: `${cur ? `<button type="button" class="btn pri" data-act="${q ? 'chat-q' : 'go'}" data-v="${esc(q || cur.view)}">${ic('spark', 18)} ${esc(bName(cur))} 시작</button>` : ''}<button type="button" class="btn dk" data-act="go" data-v="class">${esc(t('cls'))} 직접 만들기</button>`,
      side: `<div class="aih43-art">${V4.art('start')}</div>` })
      + aih43Start();
  }
  return `<div class="aih aih43 ${data ? 'has' : 'new'}"><div class="aih43-main">${main}${!data && (aihConnHTML() || aihAutoHTML()) ? `<div class="aih-two">${aihConnHTML()}${aihAutoHTML()}</div>` : ''}${aihMenuHTML()}</div>${aih43Panel(tasks)}</div>`; }
{ const base = bHome; bHome = () => { if (!aihActive()) return (aihTeacher() && typeof tHome === 'function' && (UI.tst === 'operate' || UI.tst === 'report')) ? tHome() : base(); try { return aihHomeHTML(); } catch (e) { console.error(e); return base(); } }; }

/* 시작 가이드: 홈 안 카드도 함께 다시 그림 · 홈에서는 위젯을 자동으로 열지 않음 */
{ const base = obMount; obMount = (...a) => { if (aihActive() && S.bld && !S.bld.obAuto) { S.bld.obAuto = 1; try { save(); } catch (e) { } } const r = base(...a);
  const g = $('.aih-guide'); if (g) { const h = obHTML().replace('아래 대화창에', '위 입력창에'); g.innerHTML = h; g.hidden = !h; } return r; }; }
/* 홈에서 AI SAM을 부르면(버튼 · Ctrl+K · '시작 가이드' 막대) 위젯 대신 홈 입력창으로 */
{ const base = fabOpen; fabOpen = (focus = true) => { if (aihActive() && fabOn()) { const ta = $('#aihQ'); if (ta) { ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (focus) ta.focus({ preventScroll: true }); } return true; } return base(focus); }; }
{ const base = ACT['ob-show']; ACT['ob-show'] = el => { if (aihActive()) { UI.obc = false; if (S.bld) S.bld.obHide = false; obMount(); const g = $('.aih-guide') || $('.aih43-start'); g && g.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; } return base(el); }; }
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
