/* 디디쌤 스튜디오 — core: 유틸 · 저장소 · 기관 유형 프리셋 · 메뉴 레지스트리 · 셸 · 가입 */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
const pct = n => Math.round(Number(n) || 0) + '%';
const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const nowStr = () => new Date().toLocaleString('ko-KR', { hour12: false });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let RNG = 7; const rnd = () => (RNG = (RNG * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const csvSafe = c => { c = String(c ?? ''); if (/^[=+\-@\t\r]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; };

/* ───────── 저장소(데모: 이 브라우저에만 저장, 서버 전송 없음) ───────── */
const KEY = 'didisam.studio.v1';
const Store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } },
  clear() { try { localStorage.removeItem(KEY); } catch (e) { } }
};
let S = null; // 전체 상태
const save = () => Store.set(S);

/* ───────── 기관 유형 ───────── */
const TYPES = {
  corp: { name: '기업', icon: 'corp', desc: '임직원 직무·법정의무교육, 부서별 이수 관리', ex: '사내 아카데미 · HRD팀' },
  univ: { name: '대학', icon: 'univ', desc: '교과·비교과 운영, 학과별 학습 현황, 디지털 배지', ex: '대학 교수학습센터 · 사업단' },
  k12: { name: '학원 (초중고)', icon: 'k12', desc: '반·출결·보호자·청구서 중심의 오프라인+온라인 보강', ex: '보습 · 입시 · 어학원', group: 'academy' },
  adult: { name: '학원 (성인)', icon: 'adult', desc: '강좌 판매·모집·매출 중심의 온라인 클래스', ex: '자격증 · 실무 · 취미', group: 'academy' },
  lifelong: { name: '평생교육원', icon: 'lifelong', desc: '강좌 개설·학습자 모집, 학습비 반환·수료 기록', ex: '대학 부설 · 지자체 · 원격 평생교육시설' },
  voc: { name: '직업훈련원', icon: 'voc', desc: '훈련과정·출결·HRD-Net 보고, 부정훈련 모니터링', ex: '국민내일배움카드 · 사업주훈련' }
};
const TICON = {corp: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3"/>',univ: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',academy: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',k12: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',adult: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',lifelong: '<path d="M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 8-8 7zM12 15c0-3-2.5-5-7-5 0 4 2.5 6 7 5z"/>',voc: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z"/>'};
const ticon = k => `<svg class="tsvg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TICON[k] || ''}</svg>`;
/* 유형별 용어: 같은 기능을 그 현장의 말로 부른다 */
const TERMS = {
  corp: { learner: '임직원', cls: '교육과정', group: '부서', teacher: '사내강사', done: '이수', site: '사내 교육포털', fee: '교육비' },
  univ: { learner: '학생', cls: '교과목', group: '학과', teacher: '교수', done: '이수', site: '학습 포털', fee: '수강료' },
  k12: { learner: '원생', cls: '수업', group: '반', teacher: '강사', done: '수료', site: '학원 홈페이지', fee: '수강료' },
  adult: { learner: '수강생', cls: '강좌', group: '기수', teacher: '강사', done: '수료', site: '홈페이지', fee: '수강료' },
  lifelong: { learner: '학습자', cls: '강좌', group: '기수', teacher: '강사', done: '수료', site: '평생교육원 홈페이지', fee: '학습비' },
  voc: { learner: '훈련생', cls: '훈련과정', group: '훈련반', teacher: '훈련교사', done: '수료', site: '훈련기관 홈페이지', fee: '훈련비' }
};
const t = k => (TERMS[S?.org?.type] || TERMS.adult)[k] || k;

/* ───────── 메뉴 레지스트리 (디디쌤 가이드 전 기능 + 유형 전용 모듈) ───────── */
const MENU = {
  dash: { label: '홈', icon: '◧', grp: '운영', lock: true },
  aisam: { label: 'AI SAM', icon: '✦', grp: 'AI', badge: 'AI' },
  auto: { label: '업무 자동화', icon: '⟳', grp: 'AI', badge: 'NEW' },
  class: { label: () => t('cls') + ' 관리', icon: '▤', grp: '교육' },
  assess: { label: '평가 · 채점', icon: '✓', grp: '교육' },
  attend: { label: '출결', icon: '◷', grp: '교육' },
  cert: { label: () => t('done') + ' · 수료증', icon: '◎', grp: '교육' },
  badge: { label: '디지털 배지', icon: '✪', grp: '교육' },
  book: { label: '교재 · 교구', icon: '▣', grp: '교육' },
  library: { label: '콘텐츠 라이브러리', icon: '▶', grp: '교육' },
  compliance: { label: '법정의무교육', icon: '⚖', grp: '유형 전용', only: 'corp' },
  academic: { label: '학사 · 비교과', icon: '⌂', grp: '유형 전용', only: 'univ' },
  lifelong: { label: '학습비 · 과정 신고', icon: '❖', grp: '유형 전용', only: 'lifelong' },
  hrd: { label: 'HRD-Net 보고', icon: '⇪', grp: '유형 전용', only: 'voc' },
  members: { label: () => t('learner') + ' 관리', icon: '☺', grp: '회원' },
  groups: { label: () => t('group') + ' 관리', icon: '⚑', grp: '회원' },
  parents: { label: '보호자', icon: '♡', grp: '회원' },
  admins: { label: '운영자 · 권한', icon: '⚿', grp: '회원' },
  message: { label: '메시지', icon: '✉', grp: '소통' },
  community: { label: '커뮤니티', icon: '☰', grp: '소통' },
  consult: { label: '상담', icon: '☏', grp: '소통' },
  sales: { label: '매출 관리', icon: '₩', grp: '매출', owner: true },
  billing: { label: '청구서', icon: '⎙', grp: '매출', owner: true },
  site: { label: 'AI 홈페이지 빌더', icon: '◫', grp: '홈페이지', badge: 'AI' },
  org: { label: '기관 관리', icon: '⌘', grp: '운영' },
  plan: { label: '플랜 · 결제', icon: '◇', grp: '운영', owner: true },
  settings: { label: '설정', icon: '⚙', grp: '운영', lock: true }
};
const mlabel = id => { const l = MENU[id].label; return typeof l === 'function' ? l() : l; };

/* 유형별 최적 메뉴 순서와 기본 켜짐/꺼짐 (디디쌤 유형별 가이드의 세팅 순서 기반) */
const PRESET = {
  corp: { on: ['dash', 'aisam', 'auto', 'class', 'compliance', 'members', 'groups', 'assess', 'cert', 'badge', 'attend', 'library', 'message', 'community', 'admins', 'site', 'org', 'plan', 'settings'],
    off: ['consult', 'book', 'sales', 'billing', 'parents', 'academic', 'lifelong', 'hrd'] },
  univ: { on: ['dash', 'aisam', 'auto', 'class', 'academic', 'assess', 'members', 'groups', 'badge', 'cert', 'attend', 'library', 'message', 'community', 'consult', 'admins', 'site', 'org', 'plan', 'settings'],
    off: ['book', 'sales', 'billing', 'parents', 'compliance', 'lifelong', 'hrd'] },
  k12: { on: ['dash', 'aisam', 'auto', 'members', 'parents', 'groups', 'class', 'attend', 'billing', 'sales', 'consult', 'message', 'assess', 'community', 'book', 'library', 'site', 'admins', 'plan', 'settings'],
    off: ['cert', 'badge', 'org', 'compliance', 'academic', 'lifelong', 'hrd'] },
  adult: { on: ['dash', 'aisam', 'auto', 'class', 'book', 'library', 'site', 'sales', 'consult', 'members', 'assess', 'cert', 'community', 'message', 'badge', 'admins', 'plan', 'settings'],
    off: ['groups', 'attend', 'billing', 'parents', 'org', 'compliance', 'academic', 'lifelong', 'hrd'] },
  lifelong: { on: ['dash', 'aisam', 'auto', 'class', 'lifelong', 'members', 'groups', 'attend', 'assess', 'cert', 'badge', 'sales', 'consult', 'library', 'book', 'message', 'community', 'site', 'admins', 'org', 'plan', 'settings'],
    off: ['billing', 'parents', 'compliance', 'academic', 'hrd'] },
  voc: { on: ['dash', 'aisam', 'auto', 'class', 'hrd', 'members', 'groups', 'attend', 'assess', 'cert', 'consult', 'library', 'message', 'community', 'org', 'sales', 'site', 'admins', 'plan', 'settings'],
    off: ['badge', 'book', 'billing', 'parents', 'compliance', 'academic', 'lifelong'] }
};
const presetMenu = type => [...PRESET[type].on.map(id => ({ id, on: true })), ...PRESET[type].off.map(id => ({ id, on: false }))];
const menuOn = id => !!S.menu.find(m => m.id === id && m.on);

/* ───────── 토스트 · 모달 · 공용 컴포넌트 ───────── */
function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3000);
}
function modal(title, body, actions = [], wide = false) {
  closeModal();
  const w = document.createElement('div'); w.className = 'mwrap'; w.id = 'modal';
  w.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="mh"><b>${esc(title)}</b><button class="x" data-act="modal-close" aria-label="닫기">✕</button></div>
    <div class="mb">${body}</div>
    <div class="mf">${actions.map(a => `<button class="btn ${a.kind || ''}" data-mact="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div></div>`;
  document.body.appendChild(w);
  w.addEventListener('click', e => {
    if (e.target === w) closeModal();
    const b = e.target.closest('[data-mact]'); if (!b) return;
    const a = actions.find(x => x.id === b.dataset.mact); if (a && a.run) { if (a.run(w) !== false) closeModal(); } else closeModal();
  });
  const f = w.querySelector('input,select,textarea,button.btn'); f && f.focus();
  return w;
}
const closeModal = () => { const m = $('#modal'); m && m.remove(); };
const fv = (w, n) => { const el = w.querySelector(`[name="${n}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };

const kpi = (label, val, sub = '', tone = '') => `<div class="kpi ${tone}"><span>${esc(label)}</span><b>${esc(val)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
const tag = (txt, tone = '') => `<span class="tag ${tone}">${esc(txt)}</span>`;
const bar = (v, tone = '') => `<span class="bar ${tone}"><i style="width:${clamp(+v || 0, 0, 100)}%"></i></span>`;
function table(cols, rows, empty = '데이터가 없습니다.') {
  if (!rows.length) return `<div class="empty">${esc(empty)}</div>`;
  return `<div class="tw"><table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function tabs(key, list, cur) {
  return `<div class="tabs" role="tablist">${list.map(([id, l]) => `<button role="tab" aria-selected="${id === cur}" class="${id === cur ? 'on' : ''}" data-act="tab" data-key="${esc(key)}" data-v="${esc(id)}">${esc(l)}</button>`).join('')}</div>`;
}
const UI = {}; // 화면별 탭 상태
const head = (title, sub = '', right = '') => `<div class="ph"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="phr">${right}</div></div>`;
const guideRef = path => `<a class="gref" href="https://didisam.gitbook.io/guide-new-ver/${esc(path)}" target="_blank" rel="noopener">가이드</a>`;
function downloadCSV(name, cols, rows) {
  const txt = '﻿' + [cols, ...rows].map(r => r.map(csvSafe).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function logAudit(what) { S.audit.unshift({ at: nowStr(), who: S.me.name, what }); S.audit = S.audit.slice(0, 300); }

/* ───────── 라우터 · 셸 ───────── */
const VIEWS = {}; // id -> () => html  (mods.js / ai.js / site.js 에서 등록)
let CUR = 'dash';
function go(id) {
  if (!MENU[id] || (!menuOn(id) && !MENU[id].lock)) id = 'dash';
  if (MENU[id].owner && S.me.role !== 'owner') { toast('정운영자만 접근할 수 있는 메뉴입니다.', 'warn'); id = 'dash'; }
  CUR = id; try { history.replaceState(null, '', '#' + id); } catch (e) { }
  render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); document.body.classList.remove('nav-open');
}
function sidebar() {
  let last = '', out = '';
  for (const m of S.menu) {
    if (!m.on) continue; const d = MENU[m.id]; if (!d) continue;
    if (d.owner && S.me.role !== 'owner') continue;
    if (S.me.role === 'teacher' && ['settings', 'site', 'sales', 'billing', 'plan', 'admins', 'org'].includes(m.id)) continue;
    if (d.grp !== last && S.ui.groupHeads) { out += `<div class="ng">${esc(d.grp)}</div>`; last = d.grp; }
    out += `<button class="ni ${CUR === m.id ? 'on' : ''}" data-act="go" data-v="${m.id}" ${CUR === m.id ? 'aria-current="page"' : ''}><i aria-hidden="true">${d.icon}\uFE0E</i><span>${esc(mlabel(m.id))}</span>${d.badge ? `<em>${d.badge}</em>` : ''}</button>`;
  }
  return out;
}
function render() {
  if (!S || !S.org) { renderSignup(); return; }
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '') + ' mode-app';
  const ty = TYPES[S.org.type];
  $('#app').innerHTML = `
  <header class="top">
    <button class="hamb" data-act="nav" aria-label="메뉴 열기">☰</button>
    <div class="brand"><span class="logo">D</span><b>디디쌤</b><span class="studio">스튜디오</span></div>
    <div class="orgsel"><b>${esc(S.org.name)}</b>${tag(ty.name, 'g')}</div>
    <button class="cmdk" data-act="cmd"><span>✦ AI SAM에게 업무 지시</span><kbd>Ctrl K</kbd></button>
    <div class="topr">
      <select id="roleSel" aria-label="보기 권한" title="권한별 화면 미리보기">
        <option value="owner" ${S.me.role === 'owner' ? 'selected' : ''}>정운영자</option>
        <option value="sub" ${S.me.role === 'sub' ? 'selected' : ''}>부운영자</option>
        <option value="teacher" ${S.me.role === 'teacher' ? 'selected' : ''}>${esc(t('teacher'))}</option>
      </select>
      <button class="btn sm ghost" data-act="go" data-v="site">내 ${esc(t('site'))}</button>
    </div>
  </header>
  <div class="shell">
    <nav class="side" aria-label="어드민 메뉴">${sidebar()}<div class="sidefoot"><button class="link" data-act="menuedit">메뉴 편집</button> · <span class="demo">데모 모드</span></div></nav>
    <div class="scrim" data-act="nav"></div>
    <main id="main" tabindex="-1">${safeView()}</main>
  </div>`;
  afterRender();
}
function safeView() { try { return (VIEWS[CUR] || VIEWS.dash)(); } catch (e) { console.error(e); return head(mlabel(CUR)) + '<div class="warn">이 화면을 표시하는 중 문제가 생겼습니다. 새로고침하거나 설정 › 데이터에서 내보낸 뒤 다시 시도하세요.</div>'; } }
const AFTER = []; function afterRender() { AFTER.forEach(f => { try { f(CUR); } catch (e) { console.error(e); } }); }

/* ───────── 가입 · 유형 선택 ───────── */
let SU = { step: 1, type: '', name: '', email: '', acad: '' };
function renderSignup() {
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '') + ' mode-signup';
  const cards = ['corp', 'univ', 'academy', 'lifelong', 'voc'].map(k => {
    const ty = k === 'academy' ? { name: '학원', icon: 'academy', desc: '초중고 보습·입시 / 성인 자격증·실무 학원', ex: '선택 후 세부 유형을 고릅니다' } : TYPES[k];
    const sel = SU.type === k || (k === 'academy' && TYPES[SU.type]?.group === 'academy');
    return `<button class="tcard ${sel ? 'on' : ''}" data-act="su-type" data-v="${k}" aria-pressed="${sel}"><span class="ti">${ticon(ty.icon)}</span><b>${esc(ty.name)}</b><p>${esc(ty.desc)}</p><small>${esc(ty.ex)}</small></button>`;
  }).join('');
  const isAcad = SU.type === 'academy' || TYPES[SU.type]?.group === 'academy';
  const ready = SU.type && SU.type !== 'academy';
  const pv = ready ? PRESET[SU.type].on.filter(i => !['plan', 'settings'].includes(i)) : [];
  $('#app').innerHTML = `
  <div class="su">
    <div class="su-l">
      <div class="brand big"><span class="logo">D</span><b>디디쌤</b><span class="studio">스튜디오</span></div>
      <h1>교육기관 유형을 고르면<br><em>딱 맞는 어드민</em>이 준비됩니다</h1>
      <p class="lead">8개 도구를 하나로. 홈페이지부터 모집 · 학습 · 평가 · 수납까지, 기관 유형에 맞는 메뉴와 순서, 현장 용어로 바로 시작합니다. 메뉴는 설정에서 언제든 켜고 끄고 순서를 바꿀 수 있습니다.</p>
      <ul class="su-pts"><li>✦ AI SAM 업무 자동화 레시피 기본 제공</li><li>◫ 프롬프트 한 줄로 홈페이지 생성</li><li>⚿ 정운영자 · 부운영자 · 강사 권한</li></ul>
      <p class="note">데모입니다. 입력한 정보는 이 브라우저에만 저장되며 서버로 전송되지 않습니다.</p>
    </div>
    <form class="su-r" id="suForm" autocomplete="off">
      <div class="stepper"><span class="on">1 기관 정보</span><span class="${ready ? 'on' : ''}">2 유형 선택</span><span>3 어드민 생성</span></div>
      <label class="fl">기관명<input name="name" maxlength="30" required placeholder="예: 산타 아카데미" value="${esc(SU.name)}"></label>
      <label class="fl">관리자 이메일(데모 로그인 표시용)<input name="email" type="email" maxlength="60" placeholder="admin@example.com" value="${esc(SU.email)}"></label>
      <div class="fl"><span>기관 유형</span><div class="tgrid">${cards}</div></div>
      ${isAcad ? `<div class="fl"><span>학원 세부 유형</span><div class="seg">
        <button type="button" class="${SU.type === 'k12' ? 'on' : ''}" data-act="su-type" data-v="k12">초중고 (반 · 출결 · 보호자 · 청구서)</button>
        <button type="button" class="${SU.type === 'adult' ? 'on' : ''}" data-act="su-type" data-v="adult">성인 (강좌 판매 · 모집 · 매출)</button></div></div>` : ''}
      ${ready ? `<div class="pv"><b>${esc(TYPES[SU.type].name)} 어드민 미리보기</b>
        <p>${esc(TERMS[SU.type].learner)} · ${esc(TERMS[SU.type].cls)} · ${esc(TERMS[SU.type].group)} 용어로 표시됩니다. 꺼진 메뉴 ${PRESET[SU.type].off.length}개는 설정 › 메뉴 설정에서 켤 수 있습니다.</p>
        <ol>${pv.map(i => `<li>${esc(presetLabel(SU.type, i))}</li>`).join('')}</ol></div>` : ''}
      <button class="btn pri lg" type="submit" ${ready ? '' : 'disabled'}>최적화된 어드민 만들기</button>
      <p class="mini">KIT AX ON(경남정보대학교)은 '대학' 유형의 실제 구축 사례입니다. <a href="https://santanick.github.io/kit-axon/admin.html" target="_blank" rel="noopener">사례 어드민 보기</a></p>
    </form>
  </div>`;
  const f = $('#suForm');
  f.addEventListener('input', () => { SU.name = f.name.value; SU.email = f.email.value; });
  f.addEventListener('submit', e => {
    e.preventDefault(); SU.name = f.name.value.trim(); if (!SU.name) { f.name.focus(); return; }
    createOrg(SU.type, SU.name, SU.email.trim());
  });
}
/* pv 리스트 라벨은 S가 없을 때 t()가 기본 용어를 쓰므로 유형 용어로 다시 계산 */
function presetLabel(type, id) { const keep = S; S = { org: { type } }; const l = mlabel(id); S = keep; return l; }

function createOrg(type, name, email) {
  RNG = 7 + Object.keys(TYPES).indexOf(type) * 13;
  S = {
    v: 1, org: { name, type, created: today(), domain: (name.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'myschool') + '.didisam.com', plan: 'premium' },
    me: { name: '정운영자', email: email || 'owner@demo', role: 'owner' },
    menu: presetMenu(type), ui: { groupHeads: false },
    audit: [], runs: [], ai: { history: [], usage: 0 }
  };
  Object.assign(S, seed(type));
  logAudit(`기관 생성 — 유형 ${TYPES[type].name}`);
  save(); CUR = 'dash';
  $('#app').innerHTML = `<div class="gen"><div class="spin"></div><b>${esc(TYPES[type].name)} 맞춤 어드민을 구성하고 있습니다</b><p>메뉴 순서 · 용어 · 자동화 레시피 · 샘플 데이터 준비 중</p></div>`;
  setTimeout(() => { render(); toast(`${TYPES[type].name} 유형 어드민이 준비되었습니다.`, 'ok'); }, 900);
}

/* ───────── 샘플 데이터 (가상의 이름·연락처, 실제 개인정보 아님) ───────── */
const SAMPLE = {
  corp: { cls: [['신입사원 온보딩', 'period'], ['직장 내 성희롱 예방교육', 'period', 'legal'], ['개인정보보호 교육', 'period', 'legal'], ['장애인 인식개선 교육', 'period', 'legal'], ['산업안전보건교육(정기)', 'period', 'legal'], ['생성형 AI 업무 활용', 'period'], ['신임 팀장 리더십', 'episode']], grp: ['경영지원팀', '영업1팀', '생산기술팀', 'R&D센터', '고객지원팀'] },
  univ: { cls: [['AI 리터러시(교양)', 'period'], ['프롬프트 엔지니어링', 'period'], ['데이터 분석 기초', 'period'], ['캡스톤디자인', 'episode'], ['취업역량 특강', 'episode'], ['비교과: AX 챌린지', 'period']], grp: ['컴퓨터공학과', '경영학과', '간호학과', '디자인학과', '기계공학과'] },
  k12: { cls: [['중2 수학 A반', 'episode', '요일반'], ['고1 영어 내신반', 'episode', '요일반'], ['수학 온라인 보강', 'period'], ['겨울방학 과학 특강', 'episode', '특강반'], ['국어 독해 10회권', 'episode', '회차 차감반'], ['주간 단어 테스트 구독', 'sub']], grp: ['중2-A반', '중2-B반', '고1 영어반', '초6 심화반'] },
  adult: { cls: [['엑셀 실무 마스터', 'period'], ['컴활 1급 필기 완성', 'period'], ['생성형 AI 영상 제작', 'period'], ['노션 업무 자동화', 'period'], ['주말 오프라인 원데이 클래스', 'episode', '특강반'], ['실무 템플릿 월간 구독', 'sub']], grp: ['26년 10월 기수', '26년 11월 기수'] },
  lifelong: { cls: [['시니어 스마트폰 활용', 'episode', '요일반'], ['바리스타 2급 자격과정', 'episode', '요일반'], ['인문학 아카데미', 'period'], ['사회복지 실무 이해', 'period'], ['AI 활용 1인 창업', 'period']], grp: ['2026-2학기 1기', '2026-2학기 2기', '원격과정'] },
  voc: { cls: [['[내일배움] 웹개발 풀스택 양성', 'period'], ['스마트공장 운영 실무', 'period'], ['전기기능사 실기', 'episode', '요일반'], ['[사업주훈련] 직무 AI 활용', 'period'], ['데이터 분석가 양성과정', 'period']], grp: ['웹개발 12기', '스마트공장 3기', '전기 주간반', '사업주 위탁'] }
};
const SUR = '김이박최정강조윤장임한오서신권황안송류홍'; const GIV = ['민준', '서연', '지호', '하은', '도윤', '지우', '예준', '수아', '시우', '지민', '주원', '채원', '하준', '윤서', '건우', '다은', '우진', '서윤', '현우', '소율'];
function seed(type) {
  const sm = SAMPLE[type]; const groups = sm.grp.map((n, i) => ({ id: 'g' + i, name: n, lead: i % 2 ? '' : '담당 ' + pick(SUR) + '○○' }));
  const members = Array.from({ length: 36 }, (_, i) => {
    const n = SUR[i % SUR.length] + GIV[(i * 7) % GIV.length];
    const g = groups[i % groups.length].id; const grade = i < 30 ? '정회원' : i < 33 ? '준회원' : '승인 대기';
    return { id: 'm' + i, name: n, nick: n.slice(1), email: `user${i + 1}@example.com`, phone: `010-0000-${String(1000 + i * 37).slice(-4)}`, group: g, grade, joined: addDays(today(), -Math.floor(rnd() * 180)), last: addDays(today(), -Math.floor(rnd() * (i % 9 === 0 ? 95 : 20))), extra: type === 'corp' ? { 부서: groups[i % groups.length].name, 직급: pick(['사원', '대리', '과장', '차장']) } : type === 'univ' ? { 학번: '2026' + String(1000 + i), 학과: groups[i % groups.length].name } : type === 'voc' ? { 훈련생구분: pick(['내일배움카드', '사업주위탁', '실업자']) } : {} };
  });
  const parents = type === 'k12' ? members.slice(0, 24).map((m, i) => ({ id: 'p' + i, child: m.id, name: m.name[0] + '○○ 보호자', phone: `010-1111-${String(2000 + i * 13).slice(-4)}`, status: i % 6 === 5 ? '연결 대기 중' : '연결 완료' })) : [];
  const classes = sm.cls.map(([name, kind, x], i) => {
    const legal = x === 'legal'; const sub = kind === 'episode' ? (x || '요일반') : '';
    const price = ['corp', 'univ'].includes(type) || legal ? 0 : kind === 'sub' ? 29000 : type === 'k12' ? 280000 : type === 'voc' ? 0 : [99000, 149000, 199000, 59000][i % 4];
    const lr = members.filter((m, j) => m.grade !== '승인 대기' && (legal || j % (i + 2) !== 1)).map(m => m.id).slice(0, legal ? 33 : 12 + (i * 5) % 18);
    const prog = {}; lr.forEach((id, j) => { const p = clamp(Math.round(rnd() * 115 - (j % 5 === 0 ? 40 : 0)), 0, 100); prog[id] = { p, exam: p > 60 ? Math.round(55 + rnd() * 45) : null, assign: p > 70 ? (rnd() > .4 ? 'graded' : 'submitted') : 'none', att: Math.round(70 + rnd() * 30) }; });
    return {
      id: 'c' + i, name, kind, sub, legal, status: i === sm.cls.length - 1 && type !== 'corp' ? '준비중' : '운영중', price, open: type === 'corp' ? '지정 회원' : '전체', start: addDays(today(), -30 + i * 3), end: addDays(today(), 60 + i * 10),
      teacher: t2(type, 'teacher') + ' ' + pick(SUR) + '○○', group: kind === 'episode' ? groups[i % groups.length].id : '', learners: lr, prog,
      curriculum: curriculumFor(name, kind, type), criteria: { video: 60, exam: 20, assign: 20, threshold: legal ? 100 : 80 }, cert: kind === 'sub' ? 'manual' : 'auto', skip: false, speed: true, early: false, community: 'class', hours: legal ? 1 : 16,
      notices: [{ id: uid('n'), title: `${name} 안내`, at: addDays(today(), -3), pin: true }]
    };
  });
  const pays = []; if (!['corp', 'univ'].includes(type)) classes.filter(c => c.price).forEach(c => c.learners.slice(0, 10).forEach((id, j) => pays.push({ id: uid('pay'), at: addDays(today(), -Math.floor(rnd() * 60)), who: id, item: c.name, amount: c.price, method: pick(['카드', '계좌이체', '간편결제']), status: j === 3 ? '환불 신청' : j === 7 ? '환불 완료' : '결제 완료' })));
  const bills = type === 'k12' ? members.slice(0, 24).map((m, i) => ({ id: uid('b'), who: m.id, title: '11월 수강료', items: [['수업료', 280000], ...(i % 3 === 0 ? [['차량비', 40000]] : []), ...(i % 4 === 0 ? [['교재비', 18000]] : [])], due: addDays(today(), i % 5 === 0 ? -3 : 7), status: i % 5 === 0 ? '미납' : i % 3 === 0 ? '현장 납부' : '납부 완료' })) : [];
  const consults = Array.from({ length: type === 'corp' ? 3 : 9 }, (_, i) => ({ id: uid('cs'), at: addDays(today(), -i * 2), who: members[i * 3].id, ch: pick(['채널톡 전화', '채널톡 채팅', '대면 상담']), cat: pick(type === 'k12' ? ['입학 문의', '성적 상담', '수강료'] : type === 'voc' ? ['훈련 신청', '출결 문의', '취업 상담'] : ['수강 문의', '결제·환불', '학습 상담']), title: pick(['수강 일정 문의', '진도 상담', '환불 규정 문의', '레벨 테스트 결과 상담', '수료 기준 문의']), summary: '', status: i < 2 ? '진행 중' : '완료' }));
  const posts = Array.from({ length: 10 }, (_, i) => ({ id: uid('po'), kind: pick(['질문', '이야기']), board: pick(['커뮤니티', '커뮤니티', '게시판', '학습노트', '수강후기']), who: members[i * 2].id, title: pick(['과제 제출 형식 질문', '오늘 수업 정리', '퀴즈 3번 해설 부탁드립니다', '수강 후기 남깁니다', '영상이 끊겨요']), at: addDays(today(), -i), replies: i % 3 ? 1 : 0, views: 10 + i * 7, hidden: false }));
  const books = ['k12', 'adult', 'lifelong'].includes(type) ? [{ id: 'bk0', name: type === 'k12' ? '중2 수학 개념서' : '실무 워크북(PDF)', kind: type === 'k12' ? '실물' : '전자책', price: 18000, sold: 23, delivered: 18, open: '전체' }, { id: 'bk1', name: '기출 문제집', kind: '전자책', price: 12000, sold: 41, delivered: 0, open: '전체' }] : [];
  const lib = [['오리엔테이션.mp4', '동영상', '12:30', 1], ['1강 개념.mp4', '동영상', '48:10', 2], ['강의자료_1주차.pdf', '문서', '2.1MB', 1], ['실습 템플릿.xlsx', '문서', '310KB', 0], ['썸네일.png', '사진', '820KB', 1]].map(([n, k, s, u], i) => ({ id: 'l' + i, name: n, kind: k, size: s, used: u, at: addDays(today(), -i * 5) }));
  const admins = [{ id: 'a0', name: '정운영자', email: 'owner@demo', role: 'owner', classes: [] }, { id: 'a1', name: '운영 담당', email: 'staff@demo', role: 'sub', classes: [] }, { id: 'a2', name: t2(type, 'teacher') + ' 김○○', email: 'teacher@demo', role: 'teacher', classes: ['c0', 'c1'] }];
  const badges = [{ id: 'bd0', name: `${classes[0].name} 이수 배지`, cls: 'c0', design: 'green', issued: classes[0].learners.slice(0, 6).map(id => ({ who: id, at: addDays(today(), -5), exp: '' })) }];
  const certs = classes[0].learners.slice(0, 8).map((id, i) => ({ id: uid('ct'), cls: 'c0', who: id, at: addDays(today(), -i), no: `${today().slice(0, 4)}-${String(i + 1).padStart(4, '0')}`, dl: i % 2 === 0, manual: false }));
  const msgs = [{ id: uid('ms'), at: addDays(today(), -2), to: '전체', title: '이번 주 운영 안내', ch: '앱 푸시 + 이메일', n: members.length }];
  const orgs = ['corp', 'univ', 'lifelong', 'voc'].includes(type) ? [{ id: 'o0', name: type === 'voc' ? '협약기업 A사' : type === 'univ' ? '취업지원센터' : type === 'corp' ? '계열사 B' : '구청 평생학습관', mgr: '기관 담당자', n: 14, done: 9, job: type === 'voc' ? 6 : 0 }] : [];
  return {
    groups, members, parents, classes, pays, bills, consults, posts, books, lib, admins, badges, certs, msgs, orgs,
    autos: defaultAutos(type),
    site: null,
    settings: { join: type === 'corp' ? '운영자 초대만' : '자동 수락', siteOpen: type === 'corp' ? 'private' : 'public', marketing: true, extraQ: type === 'corp' ? ['부서', '직급'] : type === 'univ' ? ['학번', '학과'] : [], speedMin: 0.5, speedMax: 2, reviewCond: '수료 시', nudge: true, popups: [], seo: { title: '', desc: '', kw: '' }, pixel: '', terms: { tos: '', privacy: '' }, consultKeys: false, kakao: false, pg: ['k12'].includes(type) ? 'toss' : ['adult', 'lifelong'].includes(type) ? 'nice' : 'none', certInfo: { rep: '', org: '' }, footer: { company: '', ceo: '', biz: '', mail: '', addr: '', tel: '', reg: '' } },
    hrd: { reports: [] }
  };
}
const t2 = (type, k) => TERMS[type][k];
function curriculumFor(name, kind, type) {
  if (kind === 'episode') return Array.from({ length: 8 }, (_, i) => ({ id: uid('it'), type: 'offline', title: `${i + 1}회차 ${name.replace(/\(.*\)/, '')}` }));
  const base = [{ type: 'chapter', title: '1장 시작하기' }, { type: 'video', title: '오리엔테이션' }, { type: 'video', title: '핵심 개념 이해' }, { type: 'quiz', title: '개념 확인 퀴즈' }, { type: 'chapter', title: '2장 실습' }, { type: 'video', title: '실습 따라하기' }, { type: 'assign', title: '실습 과제 제출' }, { type: 'exam', title: '최종 평가' }, { type: 'survey', title: '만족도 설문' }];
  return base.map(x => ({ id: uid('it'), ...x }));
}

/* ───────── 전역 이벤트 ───────── */
const ACT = {}; // data-act 핸들러 (각 모듈에서 등록)
ACT.go = el => go(el.dataset.v);
ACT.nav = () => document.body.classList.toggle('nav-open');
ACT['modal-close'] = () => closeModal();
ACT.tab = el => { UI[el.dataset.key] = el.dataset.v; render(); };
ACT['su-type'] = el => { SU.type = el.dataset.v; renderSignup(); };
ACT.menuedit = () => { UI.settings = 'menu'; go('settings'); };
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (f) { e.preventDefault(); f(el, e); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'roleSel') { S.me.role = e.target.value; save(); toast(`${e.target.selectedOptions[0].text} 권한으로 보는 화면입니다.`); go(CUR); }
  const el = e.target.closest('[data-chg]'); if (el && ACT[el.dataset.chg]) ACT[el.dataset.chg](el, e);
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S?.org) { e.preventDefault(); ACT.cmd && ACT.cmd(); }
  if (e.key === 'Escape') { closeModal(); document.body.classList.remove('nav-open'); }
});
function boot() {
  S = Store.get();
  if (S && (!S.org || !TYPES[S.org.type])) S = null;
  if (S && !S.hrd) S.hrd = { reports: [] };
  if (S) { const h = location.hash.slice(1); CUR = MENU[h] ? h : 'dash'; }
  render();
}
