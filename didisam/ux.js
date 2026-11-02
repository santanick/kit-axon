/* 디디쌤 스튜디오 v23 — 쉬운 화면(UX 단순화)
   대표님(2026-11-03): '기능은 다 들어갔는데 너무 복잡하고 어려워. 사용자 입장에서 어렵지 않게 전체를 개선해줘.'
   원칙: 기능은 하나도 지우지 않는다(모든 화면은 go(id)로 그대로 열림). 숨기고 · 묶고 · 필요할 때 펼친다.
   - 메뉴: 홈 · {강좌} · {학습자} · 소통 · 사이트 · (매출 ·) 운영 · 설정. '현황'은 홈 안의 탭, 홈페이지는 '사이트'로 독립
   - 화면마다: 제목 + 한 줄 설명 · 주 버튼 하나(나머지는 ⋯) · 위쪽 탭은 4개까지(나머지 '더 보기') · 빈 화면엔 첫 행동 버튼
   - 홈: '오늘 할 일'(시작 가이드 다음 단계 + 처리할 일만, 0건 카드는 숨김)
   - 시작 가이드: 꼭 필요한 단계만(기관 정보 → {강좌} 만들기 → 사이트 게시 → {학습자} 초대 → 결제 연결(유료 기관)), 나머지는 '나중에'
   - 쉬운 말: 레시피 · 루브릭 · 빌드 · KPI 같은 말을 쉬운 우리말로
   - 머리: 언어 · 권한 보기는 계정 메뉴 안으로, '메뉴 찾기'(Ctrl+/) 추가. 휴대폰은 화면이 먼저(대화는 '대화' 탭) */
'use strict';
if (!IC.home) IC.home = '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>';
if (!IC.search) IC.search = '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>';
if (!IC.dots) IC.dots = '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>';
if (!IC.coin) IC.coin = '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v11"/>';

/* ═════════ 1. 메뉴 구조 ═════════ */
const uxOn = id => { try { return !!S && !!S.nav && menuOn(id); } catch (e) { return false; } };
WS.home.label = '홈'; WS.home.icon = 'home'; WS.home.desc = '오늘 할 일과 시작 가이드';
WS.dash.desc = '목표 대비 성과 · 단계별 참여 · 추이';
WS.learn.label = () => t('cls');
WS.web = { label: '사이트', icon: 'globe', desc: '' };
WS.ops.label = () => (uxOn('sales') || uxOn('billing')) ? '매출 · 운영' : '운영';
WS.ops.icon = 'grid';
MENU.site.ws = 'web';
/* 쉬운 메뉴 이름(뜻은 그대로) */
Object.assign(MENU.library, { label: '영상 · 자료' });
if (MENU.calendar) MENU.calendar.label = '일정 · 코칭';
if (MENU.tutorial) MENU.tutorial.label = '따라 하기 영상';
if (MENU.docs) MENU.docs.label = '문서 만들기';
MENU.admins.label = '운영자 · 기록';
MENU.members.label = '명단 · 진도';
MENU.board.label = '공지';
const UX_RANK = ['class', 'members', 'board', 'sales', 'billing', 'site', 'assess', 'attend', 'enroll', 'message', 'compliance', 'academic', 'lifelong', 'hrd', 'library', 'groups', 'parents', 'community', 'auto', 'cert', 'book', 'consult', 'badge', 'journey', 'diag', 'org', 'calendar', 'dbook', 'tutorial', 'admins', 'docs', 'conn'];
const uxRank = id => { const i = UX_RANK.indexOf(id); return i < 0 ? 99 : i; };
function uxNavFix(N) {
  if (!N || !N.ws || !N.tabs) return N;
  if (!N.ws.includes('web')) { const i = N.ws.indexOf('ops'); N.ws.splice(i < 0 ? N.ws.length : i, 0, 'web'); }
  N.tabs.web = N.tabs.web || [];
  Object.keys(N.tabs).forEach(w => { if (w === 'web') return; const k = N.tabs[w].findIndex(x => x.id === 'site'); if (k >= 0) { const [x] = N.tabs[w].splice(k, 1); if (!N.tabs.web.some(y => y.id === 'site')) N.tabs.web.unshift(x); } });
  if (!N.tabs.web.some(y => y.id === 'site')) N.tabs.web.unshift({ id: 'site', on: true });
  if ((N.uxV || 0) < 2) { N.uxV = 2; Object.keys(N.tabs).forEach(w => { if (w !== 'web') N.tabs[w].sort((a, b) => uxRank(a.id) - uxRank(b.id)); });
    const O = ['home', 'dash', 'learn', 'people', 'talk', 'web', 'ops']; const oi = w => { const i = O.indexOf(w); return i < 0 ? 50 : i; }; N.ws.sort((a, b) => oi(a) - oi(b)); } /* 모든 기관 같은 순서: 홈 · 강좌 · 학습자 · 소통 · 사이트 · 운영 */
  return N;
}
{ const base = presetNav; presetNav = type => { MENU.site.ws = 'ops'; let n; try { n = base(type); } finally { MENU.site.ws = 'web'; } return uxNavFix(n); }; }
/* 레일: '현황'은 홈 안 탭으로(레일에서 빼고 홈에 불을 켬) */
rail = () => {
  const badge = w => { if (w === 'learn') { const n = typeof pend === 'function' ? pend().length : 0; return n ? `<em>${n}</em>` : ''; } if (w === 'home') { const n = briefCount(); return n ? `<em class="mg">${n}</em>` : ''; } return ''; };
  const hasHome = S.nav.ws.includes('home');
  return S.nav.ws.filter(w => WS[w] && !(w === 'dash' && hasHome) && (w === 'home' || w === 'dash' || wsTabs(w).length)).map(w => { const on = CUR.ws === w || (w === 'home' && CUR.ws === 'dash'); return `<button class="ri ${on ? 'on' : ''}" data-act="go" data-v="${w}" ${on ? 'aria-current="page"' : ''} title="${esc(lab(WS[w]))}">${ic(WS[w].icon)}<span>${esc(lab(WS[w]))}</span>${badge(w)}</button>`; }).join('');
};

/* ═════════ 2. 시작 가이드: 꼭 필요한 단계만 ═════════ */
const UX_PAID = ['k12', 'adult', 'lifelong'];
const UX_ESS = ['org', 'course', 'site', 'people', 'pg'];
const UX_MIN = { org: 1, course: 5, site: 3, people: 2, pg: 3 };
{
  const set = (id, o) => { const s = BLD_STEPS.find(x => x.id === id); if (!s) return; Object.keys(o).forEach(k => { try { delete s[k]; } catch (e) { } Object.defineProperty(s, k, { value: o[k], writable: true, enumerable: true, configurable: true }); }); };
  set('org', { n: '기관 정보', d: '기관 이름 · 유형(가입할 때 입력)', req: true });
  set('course', { n: () => `${t('cls')} 만들기`, d: '커리큘럼 · 영상 · 퀴즈 · 과제', req: true });
  set('site', { n: '사이트 게시', d: '홈페이지 · 학습 사이트를 꾸미고 게시', def: () => true });
  set('people', { n: () => `${t('learner')} 초대`, d: '초대 링크 · 명단 한 번에 등록', req: true });
  set('pg', { n: '결제 연결', d: '결제 서비스(PG) · 정산 계좌 · 청구서', def: ty => UX_PAID.includes(ty) });
  BLD_STEPS.forEach(s => { if (!UX_ESS.includes(s.id)) { try { delete s.def; } catch (e) { } s.def = () => false; } });
  const order = s => { const i = UX_ESS.indexOf(s.id); return i < 0 ? 10 : i; };
  const sorted = [...BLD_STEPS].sort((a, b) => order(a) - order(b)); BLD_STEPS.length = 0; sorted.forEach(s => BLD_STEPS.push(s));
}
const uxPaid = () => UX_PAID.includes(S.org.type) || (S.classes || []).some(c => +c.price > 0);
function uxGuideFix(fresh) {
  if (!S || !S.org || !S.bld) return; const B = S.bld; const ty = S.org.type;
  BLD_STEPS.filter(bFits).forEach(s => { B.steps[s.id] = B.steps[s.id] || { on: false, done: false };
    const ess = s.req || s.id === 'site' || (s.id === 'pg' && uxPaid());
    if (ess) B.steps[s.id].on = true; else if (!bDone(s.id)) B.steps[s.id].on = false; });
  B.steps.org = B.steps.org || { on: true, done: false }; B.steps.org.done = true; B.seen = B.seen || {}; B.seen.org = 1;
  const n = bList().find(s => !bDone(s.id)); if (!B.cur || B.cur === 'org' || bDone(B.cur)) B.cur = n ? n.id : '';
  if (fresh && n && S.chat && S.chat.length === 1 && S.chat[0].bld === 'org') S.chat = [bGuideMsg(n.id, true)];
  B.uxV = 1; void ty;
}
{ const base = bInit; bInit = (...a) => { const r = base(...a); try { uxGuideFix(true); save(); } catch (e) { console.error(e); } return r; }; }
const uxLeft = () => bList().filter(s => !bDone(s.id));
const uxMins = L => L.reduce((a, s) => a + (UX_MIN[s.id] || 3), 0);
{ const base = obHTML; obHTML = () => { let h = base(); if (!h || !S.bld) return h; const L = bList(); const left = uxLeft();
  if (left.length) { const c = bCur(); const i = L.indexOf(c) + 1;
    h = h.replace(/<small>STEP \d+ · [^<]*<\/small>/, `<small>${i}단계 ${esc(bName(c))} · 남은 ${left.length}단계 약 ${uxMins(left)}분</small>`); }
  h = h.replace(/>건너뛰기</g, '>나중에<').replace(/<em>선택<\/em>/g, '<em>나중에 가능</em>');
  if (left.length && !/data-act="bld-cfg"/.test(h)) h = h.replace(/(<div class="obbtn">[\s\S]*?)(<\/div><\/div><\/div>$)/, `$1<button type="button" class="btn sm ghost" data-act="bld-cfg">단계 고르기</button>$2`);
  return h; }; }
ACT['bld-cfg'] = () => modal('시작 가이드 단계 고르기', `<p class="mini">꼭 필요한 단계만 켜 두었습니다. 나머지는 필요할 때 켜면 됩니다. 꺼도 메뉴와 데이터는 그대로 남습니다.</p>${bCfgList()}`, [{ id: 'c', label: '닫기', kind: 'pri' }]);
ACT['ux-gnext'] = el => { const c = bCur(); if (!c) return; el.dataset.v = c.id; if (c.view === 'home') { ACT['bld-cfg'](); return; } ACT['ob-go'](el); };

/* ═════════ 3. 화면 설명 ═════════ */
const UX_DESC = () => { const L = t('learner'), C = t('cls'), G = t('group');
  return { dash: '목표 대비 성과와 참여 추이를 한눈에 봅니다.', class: `${C} 만들기 · 수강 기간 · 가격 · 수강 인원을 관리합니다.`, library: '영상 · 문서를 한곳에 올려 두고 여러 강좌에서 다시 씁니다.', assess: '시험 · 과제 · 설문 결과를 확인하고 채점합니다.', attend: '회차별 출석을 체크하고 출결 알림을 보냅니다.', cert: '수료 기준과 수료증 발급을 관리합니다.', badge: '디지털 배지를 만들고 발급합니다.', book: '교재 · 교구를 등록하고 판매 · 배송을 관리합니다.', journey: '단계별 학습 경로(러닝 저니)를 정합니다.', diag: 'AI 진단 문항과 결과별 추천 과정을 관리합니다.', calendar: '수업 일정을 보고 학습 코칭 알림을 정합니다.', tutorial: '영상과 3단계 따라 하기로 짧은 실습 콘텐츠를 만듭니다.', dbook: '읽고 · 풀고 · 쓰는 디지털 교재를 만듭니다.',
    members: `${L} 명단 · 진도 · 가입 승인을 관리합니다.`, enroll: `${L} 초대 링크를 보내거나 명단을 한 번에 등록합니다.`, groups: `${G} 만들기 · ${L} 배정을 합니다.`, parents: '보호자 연결과 보호자 알림을 관리합니다.', admins: `운영자 · ${t('teacher')} 권한과 작업 기록을 봅니다.`,
    board: '공지와 알림을 올립니다.', message: '문자 · 알림톡 · 앱 메시지를 보내고 내역을 봅니다.', community: '게시판 · 질문 · 후기를 관리합니다.', consult: '상담 기록과 채널톡 · 카카오 상담을 한곳에서 봅니다.',
    site: '홈페이지와 학습 사이트를 꾸미고 한 번에 게시합니다.', sales: '결제 · 환불 · 매출을 확인합니다.', billing: '청구서를 보내고 납부를 확인합니다.', auto: '반복 업무를 자동으로 처리하도록 켭니다. 실행 전에는 항상 승인을 받습니다.', docs: '공문 · 안내문 · 결과 보고서를 양식에서 만듭니다.', conn: 'Claude · Slack · Google 같은 외부 서비스를 연결합니다.', compliance: '법정의무교육 이수 현황을 관리합니다.', academic: '학사 · 비교과 운영을 관리합니다.', lifelong: '학습비 반환 · 과정 신고를 관리합니다.', hrd: 'HRD-Net에 보고할 자료를 만듭니다.', org: '협력 기관과 기관 담당자를 관리합니다.', settings: '메뉴 · 학습 규칙 · 연동 · 계정을 설정합니다.' }; };

/* ═════════ 4. 쉬운 말 ═════════ */
const UX_WORDS = [[/자동화 레시피/g, '자동화 규칙'], [/레시피/g, '자동화 규칙'], [/루브릭/g, '채점 기준'], [/워크스페이스/g, '작업 공간'], [/세그먼트/g, '대상 그룹'], [/스냅샷/g, '저장본'], [/테넌트/g, '기관'], [/\bLPX\b/g, '학습자 반영'], [/규칙 엔진/g, '기본 응답'], [/과정 빌드/g, '과정 만들기'], [/홈페이지 빌드/g, '홈페이지 만들기'], [/디지털북 빌드/g, '디지털북 만들기'], [/빌드 단계/g, '시작 가이드 단계'], [/빌드/g, '만들기'], [/\bGNB\b/g, '상단 메뉴'], [/목표 대비 KPI/g, '목표 대비 성과'], [/\bKPI\b/g, '핵심 지표'], [/학습 퍼널/g, '단계별 참여'], [/퍼널/g, '단계별 참여'], [/게시본/g, '게시된 사이트'], [/(?<!엑셀\s?\(?)\bCSV\b(?!\))/g, '엑셀(CSV)'], [/실시간 미리보기/g, '지금 화면']];
function uxWords(root) {
  if (!root || (typeof I18N === 'function' && I18N().ui !== 'ko')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('textarea,input,script,style,code,pre,iframe,[contenteditable],.uxkeep,.dpaper') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const L = []; while (w.nextNode()) L.push(w.currentNode);
  L.forEach(n => { let v = n.nodeValue; if (!v || !/[A-Za-z가-힣]/.test(v)) return; const o = v; UX_WORDS.forEach(([re, to]) => { v = v.replace(re, to); }); if (v !== o) n.nodeValue = v; });
}

/* ═════════ 5. 화면 손질(그려진 뒤) ═════════ */
const uxMoreHTML = (label, n, cls = '') => `<details class="uxmore ${cls}"><summary>${label}${n ? ` <em>${n}</em>` : ''}</summary><div class="uxpop" role="menu"></div></details>`;
function uxTabs() {
  const bar = document.querySelector('#main .wtabs:not(.uxhd)'); if (!bar || bar.dataset.ux) return; bar.dataset.ux = 1;
  const btns = [...bar.querySelectorAll(':scope > button[data-v]')]; if (btns.length <= 4) return;
  const sorted = [...btns].sort((a, b) => uxRank(a.dataset.v) - uxRank(b.dataset.v)); let vis = sorted.slice(0, 4);
  const cur = btns.find(b => b.classList.contains('on')); if (cur && !vis.includes(cur)) vis = [...vis.slice(0, 3), cur];
  const more = sorted.filter(b => !vis.includes(b)); vis.forEach(b => bar.appendChild(b));
  bar.insertAdjacentHTML('beforeend', uxMoreHTML('더 보기', more.length, 'uxtabmore')); const pop = bar.querySelector('.uxtabmore .uxpop');
  more.forEach(b => { b.setAttribute('role', 'menuitem'); b.removeAttribute('aria-selected'); pop.appendChild(b); });
}
const uxIsAI = b => b.classList.contains('ai') || /(^|\s)AI(\s|$)/.test(b.textContent) || /AI\s?(과정|설계|채점|초안|생성|추천|로)/.test(b.textContent);
function uxActions() {
  const v = document.querySelector('#main .bview'); if (!v) return null; const ph = v.querySelector('.ph'); if (!ph || ph.closest('.card,.modal,.mwrap')) return null;
  const phr = ph.querySelector(':scope > .phr'); if (!phr) return null; if (phr.dataset.ux) return phr.querySelector('.uxkeep');
  phr.dataset.ux = 1; const btns = [...phr.children].filter(e => e.matches('button.btn, a.btn') && !e.hidden);
  const ai = btns.find(b => uxIsAI(b)); const non = btns.filter(b => b !== ai);
  const keep = non.find(b => b.classList.contains('pri')) || non.find(b => b.classList.contains('ink')) || non.find(b => /^\s*\+|추가|만들기|새 /.test(b.textContent)) || non[non.length - 1] || ai;
  if (keep) keep.classList.add('uxkeep');
  const rest = btns.filter(b => b !== keep && b !== ai);
  if (ai && keep !== ai) phr.appendChild(ai); /* AI 버튼은 맨 오른쪽 */
  if (ai) { const f = document.querySelector('.bhd [data-act=chat-q]'); if (f) f.remove(); }
  if (rest.length >= 2 || (rest.length && btns.length > 2)) {
    phr.insertAdjacentHTML('afterbegin', uxMoreHTML(`${ic('dots', 18)}<span class="sr">다른 작업</span>`, 0, 'uxdots')); const pop = phr.querySelector('.uxdots .uxpop');
    rest.forEach(b => { b.setAttribute('role', 'menuitem'); pop.appendChild(b); }); phr.querySelector('.uxdots summary').title = '다른 작업 ' + rest.length + '개';
  }
  return keep;
}
function uxHead() {
  const hd = document.querySelector('#main .bhd'); if (!hd || hd.dataset.ux) return; hd.dataset.ux = 1;
  const w = CUR.ws; const key = w === 'home' ? 'home' : w === 'dash' ? 'dash' : w === 'settings' ? 'settings' : CUR.tab;
  const b = hd.querySelector('.bhdl b'); if (b) b.textContent = key === 'home' ? '오늘의 운영' : key === 'dash' ? '현황' : key === 'settings' ? '설정' : mlabel(key);
  const d = UX_DESC()[key]; const hl = hd.querySelector('.bhdl'); if (d && hl && !hl.querySelector('.uxdesc')) hl.insertAdjacentHTML('beforeend', `<p class="uxdesc">${esc(d)}</p>`);
  const f = hd.querySelector('[data-act=chat-q]'); if (f) { f.innerHTML = `${ic('spark', 14)} AI SAM에게 맡기기`; f.title = f.dataset.v; }
  if (w === 'home' || w === 'dash') hd.insertAdjacentHTML('afterend', `<div class="seg2 wtabs uxhd" role="tablist"><button role="tab" aria-selected="${w === 'home'}" class="${w === 'home' ? 'on' : ''}" data-act="go" data-v="home">오늘 할 일</button><button role="tab" aria-selected="${w === 'dash'}" class="${w === 'dash' ? 'on' : ''}" data-act="go" data-v="dash">현황</button></div>`);
}
function uxEmpty(keep) {
  const v = document.querySelector('#main .bview'); if (!v || CUR.ws === 'home') return; const e = [...v.querySelectorAll('.empty')].find(x => x.offsetParent && !x.closest('.modal'));
  if (!e || e.dataset.ux || e.querySelector('button,a.btn')) return; e.dataset.ux = 1; e.classList.add('uxempty');
  const fq = typeof FILLQ === 'function' ? FILLQ()[CUR.tab] : ''; let h = '';
  if (keep) { const c = keep.cloneNode(true); c.classList.remove('uxkeep'); c.classList.add('pri'); h += c.outerHTML; }
  if (fq) h += `<button type="button" class="btn ghost" data-act="chat-q" data-v="${esc(fq)}">${ic('spark', 14)} AI SAM에게 맡기기</button>`;
  if (h) e.insertAdjacentHTML('beforeend', `<div class="uxecta">${h}</div>`);
}
function uxTop() {
  const top = document.querySelector('.top'); if (!top) return;
  const p = top.querySelector('.bprog'); if (p) { const s = p.querySelector('span'); if (s) s.textContent = '시작 가이드'; if (S.bld && bAllDone()) p.hidden = true; }
  const ap = top.querySelector('.acp');
  if (ap && !ap.querySelector('.uxacs')) {
    ap.insertAdjacentHTML('afterbegin', `<div class="uxacs"><small>보기 설정</small></div><hr>`); const box = ap.querySelector('.uxacs');
    ['#langSel', '#roleSel'].forEach(sel => { const el = top.querySelector('.topr > ' + sel); if (el) { const l = document.createElement('label'); l.textContent = sel === '#langSel' ? '화면 언어' : '권한별 화면'; l.appendChild(el); box.appendChild(l); } });
  }
  const r = top.querySelector('.topr'); if (r && !r.querySelector('[data-act=ux-find]')) r.insertAdjacentHTML('afterbegin', `<button type="button" class="uxfind" data-act="ux-find" title="메뉴 찾기 (Ctrl+/)" aria-label="메뉴 찾기">${ic('search', 18)}<span>메뉴 찾기</span></button>`);
  const gp = document.querySelector('.hmeta [data-act=guides]'); if (gp && !gp.dataset.ux) { gp.dataset.ux = 1; gp.innerHTML = `${ic('book', 14)} 도움말`; }
  const seg = document.querySelector('.bmseg'); if (seg) { const pv = seg.querySelector('[data-v=pv]'); if (pv && pv.firstChild && pv.firstChild.nodeType === 3) pv.firstChild.nodeValue = '화면'; }
}
/* 홈: 오늘 할 일 */
function uxHomeHTML(h) {
  const L = bList ? bList() : []; const left = S.bld ? uxLeft() : []; const c = left.length ? bCur() : null;
  const B = BRIEF().filter(b => b.n > 0).slice(0, 4); const rows = [];
  if (c) rows.push(`<li class="uxt g"><span class="uxtn" title="시작 가이드 ${L.length - left.length}/${L.length} 완료">${L.length - left.length}<small>/${L.length}</small></span><div><b>시작 가이드 · ${esc(bName(c))}</b><small>${esc(typeof c.d === 'string' ? c.d : '')} · 약 ${UX_MIN[c.id] || 3}분 · 남은 ${left.length}단계 약 ${uxMins(left)}분</small></div><button type="button" class="btn sm ink" data-act="ux-gnext">${c.id === 'org' ? '확인하기' : '시작하기'}</button></li>`);
  B.forEach(b => rows.push(`<li class="uxt"><span class="uxtn">${b.n}<small>${esc(b.unit)}</small></span><div><b>${esc(b.label)}</b><small>AI SAM이 처리 계획을 보여 드리고, 승인하면 실행합니다.</small></div><button type="button" class="btn sm ${c ? '' : 'ink'}" data-act="chat-q" data-v="${esc(b.q)}">${ic('spark', 14)} 맡기기</button></li>`));
  const todo = `<section class="uxtodo"><h2>오늘 할 일 <small>${rows.length ? rows.length + '가지' : ''}</small></h2>${rows.length ? `<ol>${rows.join('')}</ol>` : `<p class="uxnone">${ic('check', 18)} 오늘 처리할 일이 없습니다. 필요한 일은 오른쪽 아래 AI SAM에게 말로 지시하세요.</p>`}</section>`;
  h = h.replace(/<section class="brief">[\s\S]*?<\/section>/, todo);
  h = h.replace(/<button class="pill[^"]*" data-act="ob-show">[\s\S]*?<\/button>/, '').replace(/<button class="pill" data-act="go" data-v="dash">[\s\S]*?<\/button>/, '');
  if (!B.length && c) h = h.replace('오늘은 급한 일이 없습니다.', `시작 가이드 ${left.length}단계가 남았습니다.`);
  return h;
}
{ const base = bHome; bHome = () => { const h = base(); try { return (typeof smOn === 'function' && smOn()) ? h : uxHomeHTML(h); } catch (e) { console.error(e); return h; } }; }

/* 메뉴 찾기 */
function uxRoutes() { const R = [];
  S.nav.ws.forEach(w => { if (!WS[w]) return; if (w === 'home' || w === 'dash') R.push([w, lab(WS[w]), w === 'home' ? '오늘 할 일' : '홈']); else wsTabs(w).forEach(id => R.push([id, mlabel(id), lab(WS[w])])); });
  R.push(['settings', '설정', '']); return R; }
ACT['ux-find'] = () => {
  const R = uxRoutes(); const D = UX_DESC();
  const w = modal('메뉴 찾기', `<input class="uxq" type="search" placeholder="예: 출결, 청구서, 수료증" aria-label="메뉴 이름으로 찾기"><div class="uxfl" role="list">${R.map(([id, n, g]) => `<button type="button" role="listitem" data-act="go" data-v="${esc(id)}" data-k="${esc((n + ' ' + g + ' ' + (D[id] || '')).toLowerCase())}"><b>${esc(n)}</b><small>${esc(g)}${D[id] ? ' · ' + esc(D[id]) : ''}</small></button>`).join('')}</div><p class="mini">찾는 기능이 없으면 AI SAM에게 "○○ 화면 열어줘"라고 말씀하세요. 꺼 둔 메뉴는 설정 › 메뉴 구성에서 켭니다.</p>`, [{ id: 'c', label: '닫기' }]);
  const q = w.querySelector('.uxq'); q.focus();
  q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); w.querySelectorAll('.uxfl button').forEach(b => { b.hidden = !!v && !b.dataset.k.includes(v); }); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = [...w.querySelectorAll('.uxfl button')].find(x => !x.hidden); if (b) { closeModal(); go(b.dataset.v); } } });
  w.querySelector('.uxfl').addEventListener('click', e => { if (e.target.closest('[data-act=go]')) closeModal(); });
};
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === '/' && S && S.org) { e.preventDefault(); ACT['ux-find'](); } });
document.addEventListener('click', e => { document.querySelectorAll('details.uxmore[open], details.acm[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); if (e.target.closest('.uxpop [data-act]')) { const d = e.target.closest('details.uxmore'); d && d.removeAttribute('open'); } });

/* 휴대폰: 화면이 먼저, 대화는 '대화' 탭 */
{ const base = ACT['bld-pane']; ACT['bld-pane'] = el => { UI.uxPane = el.dataset.v === 'pv' ? 'pv' : 'chat'; base(el); }; }
{ const base = ACT['chat-open']; ACT['chat-open'] = el => { if (innerWidth <= 860 && el && el.nodeType === 1) UI.uxPane = 'chat'; base(el); }; }

/* 그리기 */
{ const base = render; render = () => {
  if (S && S.org && S.nav) { try { uxNavFix(S.nav); if (S.bld && !S.bld.uxV) { uxGuideFix(false); save(); } } catch (e) { console.error(e); } }
  if (S && S.org && innerWidth <= 860 && UI.uxPane !== 'chat') document.body.classList.add('b-pv');
  return base();
}; }
/* '나중에'로 꺼 둔 단계라도 실제로 해내면 완료로 기록(예: 외부 연결 1개 이상) */
AFTER.push(() => { try { const st = S && S.bld && S.bld.steps && S.bld.steps.conn; if (st && !st.done && typeof cnMade === 'function' && cnMade() >= 1) { st.done = true; save(); } } catch (e) { } });
AFTER.push(() => {
  if (!S || !S.org || !document.querySelector('.mode-bld')) return; document.body.classList.add('ux-on');
  try { uxHead(); uxTabs(); const k = uxActions(); uxEmpty(k); uxTop(); uxWords(document.querySelector('#app')); } catch (e) { console.error(e); }
});
{ const base = renderThreads; renderThreads = (...a) => { const r = base(...a); try { uxWords(document.querySelector('.bchat')); } catch (e) { } return r; }; }
COVER.push(['[개선] 쉬운 화면: 메뉴 7개 · 화면마다 주 버튼 하나 · 탭 4개 · 오늘 할 일 · 시작 가이드 필수 단계만', 'home', '']);
/* v23.1 실측: 대화를 시작하면 시작 가이드 카드를 접어 답 · 실행 계획 카드가 보이게 한다(머리를 누르면 다시 펼침). */
{ const base = chatSend; chatSend = (q, ...r) => { if (String(q || '').trim() && S && S.bld && !UI.obc) { UI.obc = true; try { obMount(); } catch (e) { } } return base(q, ...r); }; }
/* v23.1 실측: '수강생 초대' 단계 — 학원 · 성인 교육은 수강생이 직접 가입하므로, 초대 링크를 복사 · 공유하면 단계 완료.
   AI SAM에 '초대 링크 만들어줘'라고 하면 링크를 대화창에 바로 보여 주고(복사 버튼) 단계를 마친다. */
const uxPeopleDone = () => { try { if (S.bld && S.bld.steps.people && !S.bld.steps.people.done) { S.bld.steps.people.done = true; save(); if (typeof obMount === 'function') obMount(); } } catch (e) { } };
['mb-invcopy', 'mb-invshare'].forEach(k => { const b = ACT[k]; if (b) ACT[k] = (...a) => { const r = b(...a); uxPeopleDone(); return r; }; });
const uxInvLink = () => { try { const iv = mbInvite('student', '', 'sub'); return mbInvURL(iv); } catch (e) { return ''; } };
{ const base = agRun; agRun = (name, x, ctx) => {
  if (name === 'run_studio_command' && /초대\s*(링크|주소|url)|가입\s*(링크|주소)/i.test(String((x || {}).command || '')) && typeof mbInvite === 'function') { const u = uxInvLink();
    if (u) { ctx.cards.push({ title: '초대 링크', text: `${t('learner')} 초대 링크입니다. 문자 · 카카오톡 · 공지에 붙여 보내면 받은 사람이 간편가입 후 바로 수강할 수 있습니다.\n${u}`, act: x.command, copy: u }); uxPeopleDone(); return { ok: true, 결과: `초대 링크를 대화창에 보여 주었습니다: ${u}` }; } }
  return base(name, x, ctx); }; }
ACT['ux-copy'] = el => { const v = el.dataset.v || ''; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('복사했습니다.', 'ok'), () => toast('복사하지 못했습니다. 길게 눌러 복사하세요.', 'warn')); uxPeopleDone(); };
