/* 디디쌤 스튜디오 v2 — AI 우선 구조
   6개 작업 공간(AI SAM · 현황 · 학습 · 학습자 · 소통 · 운영) + 공간 안 탭. 유형별 프리셋으로 탭을 켜고 끄고 순서를 정한다. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
const pct = n => Math.round(Number(n) || 0) + '%';
const num = n => (Number(n) || 0).toLocaleString('ko-KR');
const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const daysAgo = d => Math.max(0, Math.round((Date.now() - new Date(d)) / 864e5));
const nowStr = () => new Date().toLocaleString('ko-KR', { hour12: false });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let RNG = 7; const rnd = () => (RNG = (RNG * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const csvSafe = c => { c = String(c ?? ''); if (/^[=+\-@\t\r]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; };

const KEY = 'didisam.studio.v2';
const Store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } },
  clear() { try { localStorage.removeItem(KEY); } catch (e) { } }
};
let S = null;
const save = () => Store.set(S);

/* ───────── 아이콘(인라인 SVG, 이모지 금지) ───────── */
const IC = {
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.8 2.7 2.5 3 5.2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5L4 12z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  corp: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3"/>',
  univ: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
  academy: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>', k12: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  adult: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
  lifelong: '<path d="M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 8-8 7zM12 15c0-3-2.5-5-7-5 0 4 2.5 6 7 5z"/>',
  voc: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z"/>'
};
const ic = (k, s = 20) => `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || ''}</svg>`;
const ticon = k => ic(k, 24);

/* ───────── 기관 유형 · 용어 ───────── */
const TYPES = {
  corp: { name: '기업', icon: 'corp', desc: '임직원 직무 · 법정의무교육, 부서별 이수 관리', ex: '사내 아카데미 · HRD팀' },
  univ: { name: '대학', icon: 'univ', desc: '교과 · 비교과, AI 진단 · 러닝 저니 · 디지털 배지', ex: '교수학습센터 · ATC · 사업단' },
  k12: { name: '학원 (초중고)', icon: 'k12', desc: '반 · 출결 · 보호자 · 청구서 중심', ex: '보습 · 입시 · 어학원', group: 'academy' },
  adult: { name: '학원 (성인)', icon: 'adult', desc: '강좌 판매 · 모집 · 매출 중심', ex: '자격증 · 실무 · 취미', group: 'academy' },
  lifelong: { name: '평생교육원', icon: 'lifelong', desc: '강좌 개설 · 학습비 반환 · 수료 기록', ex: '대학 부설 · 지자체 · 원격' },
  voc: { name: '직업훈련원', icon: 'voc', desc: '훈련과정 · 출결 · HRD-Net 보고', ex: '내일배움카드 · 사업주훈련' }
};
const TERMS = {
  corp: { learner: '임직원', cls: '교육과정', group: '부서', teacher: '사내강사', done: '이수', site: '사내 교육포털', fee: '교육비' },
  univ: { learner: '학생', cls: '교과목', group: '학과', teacher: '교수', done: '이수', site: '학습 포털', fee: '수강료' },
  k12: { learner: '원생', cls: '수업', group: '반', teacher: '강사', done: '수료', site: '학원 홈페이지', fee: '수강료' },
  adult: { learner: '수강생', cls: '강좌', group: '기수', teacher: '강사', done: '수료', site: '홈페이지', fee: '수강료' },
  lifelong: { learner: '학습자', cls: '강좌', group: '기수', teacher: '강사', done: '수료', site: '평생교육원 홈페이지', fee: '학습비' },
  voc: { learner: '훈련생', cls: '훈련과정', group: '훈련반', teacher: '훈련교사', done: '수료', site: '훈련기관 홈페이지', fee: '훈련비' }
};
const t = k => (TERMS[S?.org?.type] || TERMS.adult)[k] || k;

/* ───────── 작업 공간 · 탭 레지스트리 ───────── */
const WS = {
  home: { label: 'AI SAM', icon: 'spark', desc: '말로 지시하면 계획을 보여 주고, 승인하면 처리합니다' },
  dash: { label: '현황', icon: 'chart', desc: '목표 대비 KPI · 학습 퍼널 · 추이' },
  learn: { label: '학습', icon: 'book', desc: '' },
  people: { label: () => t('learner'), icon: 'users', desc: '' },
  talk: { label: '소통', icon: 'chat', desc: '' },
  ops: { label: '운영', icon: 'grid', desc: '' }
};
const MENU = {
  class: { label: () => t('cls'), ws: 'learn' },
  journey: { label: '러닝 저니', ws: 'learn' },
  diag: { label: 'AI 진단', ws: 'learn', only: 'univ' },
  library: { label: '콘텐츠 · 편성', ws: 'learn' },
  assess: { label: '평가', ws: 'learn' },
  badge: { label: '배지', ws: 'learn' },
  cert: { label: '수료증', ws: 'learn' },
  attend: { label: '출결', ws: 'learn' },
  book: { label: '교재', ws: 'learn' },
  members: { label: '목록 · 진도', ws: 'people' },
  enroll: { label: '등록 · 초대', ws: 'people' },
  groups: { label: () => t('group'), ws: 'people' },
  parents: { label: '보호자', ws: 'people' },
  admins: { label: '운영자 · 로그', ws: 'people' },
  board: { label: '공지 · 알림함', ws: 'talk' },
  message: { label: '메시지', ws: 'talk' },
  community: { label: '커뮤니티', ws: 'talk' },
  consult: { label: '상담', ws: 'talk' },
  auto: { label: '자동화', ws: 'ops' },
  site: { label: '홈페이지', ws: 'ops' },
  sales: { label: '매출', ws: 'ops', owner: true },
  billing: { label: '청구서', ws: 'ops', owner: true },
  compliance: { label: '법정의무교육', ws: 'ops', only: 'corp' },
  academic: { label: '학사 · 비교과', ws: 'ops', only: 'univ' },
  lifelong: { label: '학습비 · 과정 신고', ws: 'ops', only: 'lifelong' },
  hrd: { label: 'HRD-Net 보고', ws: 'ops', only: 'voc' },
  org: { label: '기관 관리', ws: 'ops' }
};
const lab = o => typeof o.label === 'function' ? o.label() : o.label;
const mlabel = id => MENU[id] ? lab(MENU[id]) : WS[id] ? lab(WS[id]) : id === 'settings' ? '설정' : id;
/* 유형별 프리셋: 공간 순서 · 공간별 켜진 탭(순서대로) · 꺼진 탭 */
const PRESET = {
  corp: { ws: ['home', 'dash', 'learn', 'people', 'talk', 'ops'], on: ['class', 'assess', 'cert', 'library', 'members', 'enroll', 'groups', 'admins', 'board', 'message', 'community', 'compliance', 'auto', 'site', 'org'], off: ['journey', 'badge', 'attend', 'book', 'parents', 'consult', 'sales', 'billing'] },
  univ: { ws: ['home', 'dash', 'learn', 'people', 'talk', 'ops'], on: ['class', 'journey', 'diag', 'assess', 'badge', 'library', 'members', 'enroll', 'groups', 'admins', 'board', 'message', 'community', 'consult', 'academic', 'auto', 'site', 'org'], off: ['cert', 'attend', 'book', 'parents', 'sales', 'billing'] },
  k12: { ws: ['home', 'dash', 'people', 'learn', 'ops', 'talk'], on: ['class', 'attend', 'assess', 'library', 'book', 'members', 'parents', 'groups', 'enroll', 'admins', 'board', 'message', 'consult', 'community', 'billing', 'sales', 'auto', 'site'], off: ['journey', 'badge', 'cert', 'org'] },
  adult: { ws: ['home', 'dash', 'learn', 'ops', 'people', 'talk'], on: ['class', 'library', 'book', 'assess', 'cert', 'members', 'enroll', 'admins', 'board', 'community', 'consult', 'message', 'site', 'sales', 'auto'], off: ['journey', 'badge', 'attend', 'groups', 'parents', 'billing', 'org'] },
  lifelong: { ws: ['home', 'dash', 'learn', 'people', 'ops', 'talk'], on: ['class', 'attend', 'assess', 'cert', 'library', 'members', 'enroll', 'groups', 'admins', 'board', 'message', 'consult', 'community', 'lifelong', 'sales', 'auto', 'site', 'org'], off: ['journey', 'badge', 'book', 'parents', 'billing'] },
  voc: { ws: ['home', 'dash', 'learn', 'people', 'ops', 'talk'], on: ['class', 'attend', 'assess', 'cert', 'library', 'members', 'enroll', 'groups', 'admins', 'board', 'message', 'consult', 'community', 'hrd', 'auto', 'sales', 'site', 'org'], off: ['journey', 'badge', 'book', 'parents', 'billing'] }
};
function presetNav(type) {
  const P = PRESET[type]; const tabs = {}; P.ws.forEach(w => tabs[w] = []);
  P.on.forEach(id => tabs[MENU[id].ws].push({ id, on: true })); P.off.forEach(id => tabs[MENU[id].ws].push({ id, on: false }));
  return { ws: [...P.ws], tabs };
}
const menuOn = id => !!S.nav.tabs[MENU[id]?.ws]?.find(x => x.id === id && x.on);
const wsTabs = w => (S.nav.tabs[w] || []).filter(x => x.on && MENU[x.id] && !(MENU[x.id].owner && S.me.role !== 'owner') && !(S.me.role === 'teacher' && ['site', 'sales', 'billing', 'admins', 'org', 'auto'].includes(x.id))).map(x => x.id);

/* ───────── 공용 UI ───────── */
function toast(msg, kind = '') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3000); }
function modal(title, body, actions = [], wide = false) {
  closeModal();
  const w = document.createElement('div'); w.className = 'mwrap'; w.id = 'modal';
  w.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b><button class="x" data-act="modal-close" aria-label="닫기">${ic('x', 18)}</button></div><div class="mb">${body}</div><div class="mf">${actions.map(a => `<button class="btn ${a.kind || ''}" data-mact="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div></div>`;
  document.body.appendChild(w);
  w.addEventListener('click', e => { if (e.target === w) closeModal(); const b = e.target.closest('[data-mact]'); if (!b) return; const a = actions.find(x => x.id === b.dataset.mact); if (a && a.run) { if (a.run(w) !== false) closeModal(); } else closeModal(); });
  const f = w.querySelector('input,select,textarea,button.btn'); f && f.focus(); return w;
}
const closeModal = () => { const m = $('#modal'); m && m.remove(); };
const fv = (w, n) => { const el = w.querySelector(`[name="${n}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
const kpi = (label, val, sub = '', tone = '', unit = '', target = null) => {
  const v = String(val); const m = v.match(/^([\d,.\-]+)\s*(.*)$/); const big = m ? m[1] : v; const u = unit || (m ? m[2] : '');
  return `<div class="kpi ${tone}"><span class="lab">${esc(label)}</span><b class="val">${esc(big)}${u ? `<small>${esc(u)}</small>` : ''}</b>${target ? `<span class="tbar"><i style="width:${clamp(target.v, 0, 100)}%"></i><em style="left:${clamp(target.goal, 0, 100)}%"></em></span>` : ''}${sub ? `<small class="foot">${sub}</small>` : ''}</div>`;
};
const tag = (txt, tone = '') => `<span class="tag ${tone}">${esc(txt)}</span>`;
const bar = (v, tone = '') => `<span class="bar ${tone}"><i style="width:${clamp(+v || 0, 0, 100)}%"></i></span>`;
function table(cols, rows, empty = '데이터가 없습니다.') {
  if (!rows.length) return `<div class="empty">${esc(empty)}</div>`;
  return `<div class="tw"><table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function tabs(key, list, cur) { return `<div class="seg2" role="tablist">${list.map(([id, l]) => `<button role="tab" aria-selected="${id === cur}" class="${id === cur ? 'on' : ''}" data-act="tab" data-key="${esc(key)}" data-v="${esc(id)}">${esc(l)}</button>`).join('')}</div>`; }
const UI = {};
/* 탭 화면 머리: 공간 제목(h1)은 셸이 그리고, 여기서는 설명과 동작 버튼만 */
const head = (title, sub = '', right = '') => `<div class="ph"><div class="phl">${sub ? `<p>${sub}</p>` : ''}</div><div class="phr">${right}</div></div>`;
const headD = (title, sub = '', right = '') => `<div class="ph"><div class="phl"><h2>${esc(title)}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="phr">${right}</div></div>`;
const guideRef = path => `<a class="gref" href="https://didisam.gitbook.io/guide-new-ver/${esc(path)}" target="_blank" rel="noopener">가이드</a>`;
function downloadCSV(name, cols, rows) { const txt = '﻿' + [cols, ...rows].map(r => r.map(csvSafe).join(',')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function logAudit(what) { S.audit.unshift({ at: nowStr(), who: S.me.name, role: S.me.role, what }); S.audit = S.audit.slice(0, 300); }

/* ───────── 라우터 · 셸 ───────── */
const VIEWS = {};
let CUR = { ws: 'home', tab: '' };
function resolve(id) {
  if (id === 'settings') return { ws: 'settings', tab: '' };
  if (WS[id]) { const tb = wsTabs(id); return { ws: id, tab: (UI['tab_' + id] && tb.includes(UI['tab_' + id])) ? UI['tab_' + id] : tb[0] || '' }; }
  if (MENU[id]) return { ws: MENU[id].ws, tab: id };
  return { ws: 'home', tab: '' };
}
function go(id, keep) {
  let r = resolve(id);
  if (r.tab && MENU[r.tab]?.owner && S.me.role !== 'owner') { toast('정운영자만 볼 수 있는 화면입니다.', 'warn'); r = { ws: 'home', tab: '' }; }
  if (r.tab && !menuOn(r.tab)) { toast(`'${mlabel(r.tab)}' 탭은 꺼져 있습니다. 설정에서 켤 수 있습니다.`, 'warn'); r = resolve(r.ws); }
  CUR = r; if (r.tab) UI['tab_' + r.ws] = r.tab;
  try { history.replaceState(null, '', '#' + r.ws + (r.tab ? '/' + r.tab : '')); } catch (e) { }
  render(); if (!keep) window.scrollTo(0, 0); document.body.classList.remove('nav-open');
}
function rail() {
  const badge = w => { if (w === 'learn') { const n = typeof pend === 'function' ? pend().length : 0; return n ? `<em>${n}</em>` : ''; } if (w === 'home') { const n = briefCount(); return n ? `<em class="mg">${n}</em>` : ''; } return ''; };
  return S.nav.ws.map(w => `<button class="ri ${CUR.ws === w ? 'on' : ''}" data-act="go" data-v="${w}" ${CUR.ws === w ? 'aria-current="page"' : ''}>${ic(WS[w].icon)}<span>${esc(lab(WS[w]))}</span>${badge(w)}</button>`).join('');
}
const briefCount = () => (typeof BRIEF === 'function' ? BRIEF().filter(b => b.n > 0).length : 0);
function render() {
  if (!S || !S.org) { renderSignup(); return; }
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '') + ' mode-app';
  const ty = TYPES[S.org.type]; const w = CUR.ws;
  const T = w !== 'home' && w !== 'dash' && w !== 'settings' ? wsTabs(w) : [];
  $('#app').innerHTML = `
  <header class="top">
    <button class="hamb" data-act="nav" aria-label="메뉴 열기">${ic('menu')}</button>
    <div class="brand"><span class="logo">D</span><b>${esc(S.org.name)}</b><span class="sub">스튜디오</span></div>
    <span class="tline">${esc(S.me.name)} · ${esc(roleName(S.me.role))}</span>
    <div class="topr">
      <select id="roleSel" aria-label="권한별 화면 보기"><option value="owner" ${S.me.role === 'owner' ? 'selected' : ''}>정운영자 화면</option><option value="sub" ${S.me.role === 'sub' ? 'selected' : ''}>부운영자 화면</option><option value="teacher" ${S.me.role === 'teacher' ? 'selected' : ''}>${esc(t('teacher'))} 화면</option></select>
    </div>
  </header>
  <div class="shell">
    <nav class="side" aria-label="작업 공간">
      <div class="rgrp">${rail()}</div>
      <div class="rfoot">
        <button class="ri ${w === 'settings' ? 'on' : ''}" data-act="go" data-v="settings">${ic('gear')}<span>설정</span></button>
        <div class="orgcard">${ticon(ty.icon)}<div><b>${esc(ty.name)}</b><small>맞춤 구성 · 데모 모드</small></div></div>
      </div>
    </nav>
    <div class="scrim" data-act="nav"></div>
    <main id="main" tabindex="-1" class="ws-${w}">
      ${w === 'home' ? '' : `<div class="wh"><div><h1>${esc(w === 'settings' ? '설정' : lab(WS[w]))}</h1>${w === 'dash' ? `<p>${esc(WS.dash.desc)}</p>` : ''}</div>${T.length > 1 ? `<div class="seg2 wtabs" role="tablist">${T.map(id => `<button role="tab" aria-selected="${id === CUR.tab}" class="${id === CUR.tab ? 'on' : ''}" data-act="go" data-v="${id}">${esc(mlabel(id))}${tabBadge(id)}</button>`).join('')}</div>` : ''}</div>`}
      ${safeView()}
    </main>
  </div>
  ${w !== 'home' ? `<button class="aifab" data-act="chat-open">${ic('spark', 18)}<span>AI SAM</span></button>` : ''}`;
  afterRender();
}
const tabBadge = id => { if (id === 'assess' && typeof pend === 'function') { const n = pend().length; return n ? `<em>${n}</em>` : ''; } return ''; };
const roleName = r => ({ owner: '정운영자', sub: '부운영자', teacher: t('teacher') }[r] || r);
function safeView() {
  const key = CUR.ws === 'home' ? 'home' : CUR.ws === 'dash' ? 'dash' : CUR.ws === 'settings' ? 'settings' : CUR.tab;
  try { if (!key) return `<div class="empty">이 공간에 켜진 탭이 없습니다. <a href="#" data-act="go" data-v="settings">설정 › 메뉴 구성</a>에서 켜세요.</div>`; return (VIEWS[key] || (() => '<div class="empty">준비 중입니다.</div>'))(); }
  catch (e) { console.error(e); return '<div class="warn">이 화면을 표시하는 중 문제가 생겼습니다. 새로고침하거나 설정 › 데이터에서 내보낸 뒤 다시 시도하세요.</div>'; }
}
const AFTER = []; function afterRender() { AFTER.forEach(f => { try { f(CUR); } catch (e) { console.error(e); } }); }

/* ───────── 가입 · 유형 선택 ───────── */
let SU = { type: '', name: '', email: '' };
function renderSignup() {
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '') + ' mode-signup';
  const cards = ['corp', 'univ', 'academy', 'lifelong', 'voc'].map(k => {
    const ty = k === 'academy' ? { name: '학원', icon: 'academy', desc: '초중고 보습 · 입시 / 성인 자격증 · 실무', ex: '선택 후 세부 유형을 고릅니다' } : TYPES[k];
    const sel = SU.type === k || (k === 'academy' && TYPES[SU.type]?.group === 'academy');
    return `<button type="button" class="tcard ${sel ? 'on' : ''}" data-act="su-type" data-v="${k}" aria-pressed="${sel}"><span class="ti">${ticon(ty.icon)}</span><b>${esc(ty.name)}</b><p>${esc(ty.desc)}</p></button>`;
  }).join('');
  const isAcad = SU.type === 'academy' || TYPES[SU.type]?.group === 'academy';
  const ready = SU.type && SU.type !== 'academy';
  $('#app').innerHTML = `
  <div class="su">
    <div class="su-l">
      <div class="brand big"><span class="logo">D</span><b>디디쌤 스튜디오</b></div>
      <h1>교육 운영,<br>이제 <em>말로 하세요</em></h1>
      <p class="lead">기관 유형을 고르면 필요한 메뉴만 남긴 어드민이 준비됩니다. 반복 업무는 AI SAM에게 맡기고, 승인만 하세요.</p>
      <div class="su-demo"><div class="bub u">진도 30% 미만 학생에게 독려 메시지 보내줘</div><div class="bub a"><b>대상 42명을 찾았습니다.</b> 메시지 초안을 확인하고 승인하면 바로 발송합니다.<span class="mini-btn">승인하고 실행</span></div></div>
      <p class="note">데모입니다. 입력한 정보는 이 브라우저에만 저장되며 서버로 전송되지 않습니다. 대학 유형 실제 구축 사례: <a href="https://santanick.github.io/kit-axon/admin.html" target="_blank" rel="noopener">KIT AX ON</a></p>
    </div>
    <form class="su-r" id="suForm" autocomplete="off">
      <h2>어떤 기관인가요?</h2>
      <div class="tgrid">${cards}</div>
      ${isAcad ? `<div class="seg2 full"><button type="button" class="${SU.type === 'k12' ? 'on' : ''}" data-act="su-type" data-v="k12">초중고 · 반 · 보호자 · 청구서</button><button type="button" class="${SU.type === 'adult' ? 'on' : ''}" data-act="su-type" data-v="adult">성인 · 강좌 판매 · 매출</button></div>` : ''}
      <label class="fl">기관명<input name="name" maxlength="30" required placeholder="예: 산타 아카데미" value="${esc(SU.name)}"></label>
      ${ready ? `<div class="pv"><b>${esc(TYPES[SU.type].name)} 맞춤 구성</b><p>${['learn', 'people', 'talk', 'ops'].map(w => `<span>${esc(w === 'people' ? TERMS[SU.type].learner : lab(WS[w]))} <small>${PRESET[SU.type].on.filter(i => MENU[i].ws === w).length}</small></span>`).join('')}</p><small>${esc(TERMS[SU.type].learner)} · ${esc(TERMS[SU.type].cls)} · ${esc(TERMS[SU.type].group)} 용어로 표시됩니다.</small></div>` : ''}
      <button class="btn pri lg" type="submit" ${ready ? '' : 'disabled'}>시작하기</button>
    </form>
  </div>`;
  const f = $('#suForm');
  f.addEventListener('input', () => { SU.name = f.name.value; });
  f.addEventListener('submit', e => { e.preventDefault(); SU.name = f.name.value.trim(); if (!SU.name) { f.name.focus(); return; } createOrg(SU.type, SU.name); });
}
function createOrg(type, name) {
  RNG = 7 + Object.keys(TYPES).indexOf(type) * 13;
  S = { v: 2, org: { name, type, created: today(), domain: (name.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'myschool') + '.didisam.com', plan: 'premium' }, me: { name: '관리자', role: 'owner' }, nav: presetNav(type), audit: [], runs: [], ai: { usage: 0 }, chat: [] };
  Object.assign(S, seed(type));
  logAudit(`기관 생성 — 유형 ${TYPES[type].name}`); save(); CUR = { ws: 'home', tab: '' };
  $('#app').innerHTML = `<div class="gen"><div class="spin"></div><b>${esc(TYPES[type].name)} 맞춤 어드민을 준비하고 있습니다</b><p>메뉴 구성 · 용어 · 자동화 레시피 · 샘플 데이터</p></div>`;
  setTimeout(() => { render(); }, 800);
}

/* ───────── 샘플 데이터 (가상 이름 · 010-0000 번호 · example.com) ───────── */
const SAMPLE = {
  corp: { cls: [['신입사원 온보딩', 'period'], ['직장 내 성희롱 예방교육', 'period', 'legal'], ['개인정보보호 교육', 'period', 'legal'], ['장애인 인식개선 교육', 'period', 'legal'], ['산업안전보건교육(정기)', 'period', 'legal'], ['생성형 AI 업무 활용', 'period'], ['신임 팀장 리더십', 'episode']], grp: ['경영지원팀', '영업1팀', '생산기술팀', 'R&D센터', '고객지원팀'], lv: ['입문', '실무', '리더'] },
  univ: { cls: [['AI 리터러시(교양)', 'period'], ['프롬프트 엔지니어링', 'period'], ['데이터 분석 기초', 'period'], ['캡스톤디자인', 'episode'], ['취업역량 특강', 'episode'], ['비교과: AX 챌린지', 'period']], grp: ['컴퓨터공학과', '경영학과', '간호학과', '디자인학과', '기계공학과'], lv: ['Explorer', 'Builder', 'Master'] },
  k12: { cls: [['중2 수학 A반', 'episode', '요일반'], ['고1 영어 내신반', 'episode', '요일반'], ['수학 온라인 보강', 'period'], ['겨울방학 과학 특강', 'episode', '특강반'], ['국어 독해 10회권', 'episode', '회차 차감반'], ['주간 단어 테스트 구독', 'sub']], grp: ['중2-A반', '중2-B반', '고1 영어반', '초6 심화반'], lv: ['기초', '심화', '최상위'] },
  adult: { cls: [['엑셀 실무 마스터', 'period'], ['컴활 1급 필기 완성', 'period'], ['생성형 AI 영상 제작', 'period'], ['노션 업무 자동화', 'period'], ['주말 오프라인 원데이 클래스', 'episode', '특강반'], ['실무 템플릿 월간 구독', 'sub']], grp: ['26년 10월 기수', '26년 11월 기수'], lv: ['입문', '실무', '전문가'] },
  lifelong: { cls: [['시니어 스마트폰 활용', 'episode', '요일반'], ['바리스타 2급 자격과정', 'episode', '요일반'], ['인문학 아카데미', 'period'], ['사회복지 실무 이해', 'period'], ['AI 활용 1인 창업', 'period']], grp: ['2026-2학기 1기', '2026-2학기 2기', '원격과정'], lv: ['입문', '심화', '수료'] },
  voc: { cls: [['[내일배움] 웹개발 풀스택 양성', 'period'], ['스마트공장 운영 실무', 'period'], ['전기기능사 실기', 'episode', '요일반'], ['[사업주훈련] 직무 AI 활용', 'period'], ['데이터 분석가 양성과정', 'period']], grp: ['웹개발 12기', '스마트공장 3기', '전기 주간반', '사업주 위탁'], lv: ['기초', '실무', '프로젝트'] }
};
const SUR = '김이박최정강조윤장임한오서신권황안송류홍'; const GIV = ['민준', '서연', '지호', '하은', '도윤', '지우', '예준', '수아', '시우', '지민', '주원', '채원', '하준', '윤서', '건우', '다은', '우진', '서윤', '현우', '소율'];
const t2 = (type, k) => TERMS[type][k];
function seed(type) {
  const sm = SAMPLE[type]; const groups = sm.grp.map((n, i) => ({ id: 'g' + i, name: n, lead: i % 2 ? '' : '담당 ' + pick(SUR) + '○○' }));
  const members = Array.from({ length: 48 }, (_, i) => {
    const n = SUR[i % SUR.length] + GIV[(i * 7) % GIV.length]; const g = groups[i % groups.length].id; const grade = i < 40 ? '정회원' : i < 44 ? '준회원' : '승인 대기';
    return { id: 'm' + i, name: n, nick: n.slice(1), email: `user${i + 1}@example.com`, phone: `010-0000-${String(1000 + i * 37).slice(-4)}`, group: g, grade, joined: addDays(today(), -Math.floor(rnd() * 180)), last: addDays(today(), -Math.floor(rnd() * (i % 7 === 0 ? 95 : 16))),
      extra: type === 'corp' ? { 부서: groups[i % groups.length].name, 직급: pick(['사원', '대리', '과장', '차장']) } : type === 'univ' ? { 학번: '2026' + String(1000 + i), 학과: groups[i % groups.length].name } : type === 'voc' ? { 훈련생구분: pick(['내일배움카드', '사업주위탁', '실업자']) } : {}, diag: type === 'univ' && i < 38 ? pick(['EYE', 'PEN', 'LENS', 'STORY', 'MAP']) : '' };
  });
  const parents = type === 'k12' ? members.slice(0, 30).map((m, i) => ({ id: 'p' + i, child: m.id, name: m.name[0] + '○○ 보호자', phone: `010-1111-${String(2000 + i * 13).slice(-4)}`, status: i % 6 === 5 ? '연결 대기 중' : '연결 완료' })) : [];
  const classes = sm.cls.map(([name, kind, x], i) => {
    const legal = x === 'legal'; const sub = kind === 'episode' ? (x || '요일반') : '';
    const price = ['corp', 'univ'].includes(type) || legal ? 0 : kind === 'sub' ? 29000 : type === 'k12' ? 280000 : type === 'voc' ? 0 : [99000, 149000, 199000, 59000][i % 4];
    const lr = members.filter((m, j) => m.grade !== '승인 대기' && (legal || j % (i + 2) !== 1)).map(m => m.id).slice(0, legal ? 44 : 14 + (i * 5) % 22);
    const prog = {}; lr.forEach((id, j) => { const p = clamp(Math.round(rnd() * 118 - (j % 5 === 0 ? 40 : 0)), 0, 100); prog[id] = { p, exam: p > 60 ? Math.round(55 + rnd() * 45) : null, assign: p > 70 ? (rnd() > .45 ? 'graded' : 'submitted') : 'none', subAt: addDays(today(), -Math.floor(rnd() * 9)), att: Math.round(70 + rnd() * 30) }; });
    return { id: 'c' + i, name, kind, sub, legal, level: i % 3, status: i === sm.cls.length - 1 && type !== 'corp' ? '준비중' : '운영중', price, open: type === 'corp' ? '지정 회원' : '전체', start: addDays(today(), -30 + i * 3), end: addDays(today(), 60 + i * 10),
      teacher: t2(type, 'teacher') + ' ' + pick(SUR) + '○○', group: kind === 'episode' ? groups[i % groups.length].id : '', learners: lr, prog,
      curriculum: curriculumFor(name, kind), criteria: { video: 60, exam: 20, assign: 20, threshold: legal ? 100 : 80 }, cert: kind === 'sub' ? 'manual' : 'auto', skip: false, speed: true, early: false, community: 'class', hours: legal ? 1 : 16,
      notices: [{ id: uid('n'), title: `${name} 안내`, at: addDays(today(), -3), pin: true }] };
  });
  const pays = []; if (!['corp', 'univ'].includes(type)) classes.filter(c => c.price).forEach(c => c.learners.slice(0, 10).forEach((id, j) => pays.push({ id: uid('pay'), at: addDays(today(), -Math.floor(rnd() * 60)), who: id, item: c.name, amount: c.price, method: pick(['카드', '계좌이체', '간편결제']), status: j === 3 ? '환불 신청' : j === 7 ? '환불 완료' : '결제 완료' })));
  const bills = type === 'k12' ? members.slice(0, 30).map((m, i) => ({ id: uid('b'), who: m.id, title: '11월 수강료', items: [['수업료', 280000], ...(i % 3 === 0 ? [['차량비', 40000]] : []), ...(i % 4 === 0 ? [['교재비', 18000]] : [])], due: addDays(today(), i % 5 === 0 ? -3 : 7), status: i % 5 === 0 ? '미납' : i % 3 === 0 ? '현장 납부' : '납부 완료' })) : [];
  const consults = Array.from({ length: type === 'corp' ? 3 : 9 }, (_, i) => ({ id: uid('cs'), at: addDays(today(), -i * 2), who: members[i * 3].id, ch: pick(['채널톡 전화', '채널톡 채팅', '대면 상담']), cat: pick(type === 'k12' ? ['입학 문의', '성적 상담', '수강료'] : type === 'voc' ? ['훈련 신청', '출결 문의', '취업 상담'] : ['수강 문의', '결제 · 환불', '학습 상담']), title: pick(['수강 일정 문의', '진도 상담', '환불 규정 문의', '레벨 테스트 결과 상담', '수료 기준 문의']), summary: '', status: i < 2 ? '진행 중' : '완료' }));
  const posts = Array.from({ length: 12 }, (_, i) => ({ id: uid('po'), kind: i % 3 === 0 ? '질문' : pick(['질문', '이야기']), board: pick(['커뮤니티', '커뮤니티', '게시판', '학습노트', '수강후기']), who: members[i * 2].id, title: pick(['과제 제출 형식 질문', '오늘 수업 정리', '퀴즈 3번 해설 부탁드립니다', '수강 후기 남깁니다', '영상이 끊겨요']), at: addDays(today(), -i), replies: i % 3 ? 1 : 0, views: 10 + i * 7, hidden: false }));
  const books = ['k12', 'adult', 'lifelong'].includes(type) ? [{ id: 'bk0', name: type === 'k12' ? '중2 수학 개념서' : '실무 워크북(PDF)', kind: type === 'k12' ? '실물' : '전자책', price: 18000, sold: 23, delivered: 18, open: '전체' }, { id: 'bk1', name: '기출 문제집', kind: '전자책', price: 12000, sold: 41, delivered: 0, open: '전체' }] : [];
  const lib = [['오리엔테이션.mp4', '동영상', '12:30', ['c0']], ['1강 핵심 개념.mp4', '동영상', '48:10', ['c0', 'c1']], ['실습 따라하기.mp4', '동영상', '22:05', ['c1']], ['https://youtu.be/dQw4w9WgXcQ', 'YouTube', '03:33', []], ['강의자료_1주차.pdf', '문서', '2.1MB', ['c0']], ['실습 템플릿.xlsx', '문서', '310KB', []]].map(([n, k, s, u], i) => ({ id: 'l' + i, name: n, kind: k, size: s, used: u.length, cls: u, at: addDays(today(), -i * 5), views: Math.round(40 + rnd() * 400), drop: Math.round(10 + rnd() * 35) }));
  const admins = [{ id: 'a0', name: '정운영자', email: 'owner@demo', role: 'owner', classes: [] }, { id: 'a1', name: '운영 담당', email: 'staff@demo', role: 'sub', classes: [] }, { id: 'a2', name: t2(type, 'teacher') + ' 김○○', email: 'teacher@demo', role: 'teacher', classes: ['c0', 'c1'] }];
  const COL = [['#E63295', '#B01A59', '#F5B5D2'], ['#4C77C5', '#2E4F8F', '#B9CCEB'], ['#E8A317', '#A86F00', '#F6D58A']];
  const badges = sm.lv.map((lv, i) => ({ id: 'bd' + i, name: `${lv}`, key: String(i + 1), cls: classes[i]?.id || 'c0', method: i === 2 ? 'manual' : 'pass', special: false, fill: COL[i][0], ring: COL[i][1], rib: COL[i][2], issued: (classes[i]?.learners || []).filter(id => classes[i].prog[id].p >= 80).slice(0, 14 - i * 5).map((id, j) => ({ who: id, at: addDays(today(), -j), no: `${String(i + 1)}-${String(j + 1).padStart(4, '0')}`, how: i === 2 ? '수동' : '자동', st: '유효', reason: '' })) }));
  badges.push({ id: 'bdx', name: '우수 프로젝트', key: '★', cls: '', method: 'manual', special: true, fill: '#15173B', ring: '#0C0D24', rib: '#D6246E', issued: [] });
  const certs = classes[0].learners.slice(0, 8).map((id, i) => ({ id: uid('ct'), cls: 'c0', who: id, at: addDays(today(), -i), no: `${today().slice(0, 4)}-${String(i + 1).padStart(4, '0')}`, dl: i % 2 === 0, manual: false }));
  const msgs = [{ id: uid('ms'), at: addDays(today(), -2), to: '전체', title: '이번 주 운영 안내', ch: '앱 푸시 + 이메일', n: members.length }];
  const orgs = ['corp', 'univ', 'lifelong', 'voc'].includes(type) ? [{ id: 'o0', name: type === 'voc' ? '협약기업 A사' : type === 'univ' ? '취업지원센터' : type === 'corp' ? '계열사 B' : '구청 평생학습관', mgr: '기관 담당자', n: 14, done: 9, job: type === 'voc' ? 6 : 0 }] : [];
  const journey = sm.lv.map((lv, i) => ({ id: 'j' + i, name: lv, cls: classes.filter(c => c.level === i).map(c => c.id), unlock: i === 0 ? '바로 열림' : `${sm.lv[i - 1]} 배지 획득`, badge: 'bd' + i }));
  const alerts = [{ id: uid('al'), at: addDays(today(), -1), to: '전체', title: '이번 주 학습 일정 안내', read: 62 }];
  const weeks = Array.from({ length: 8 }, (_, i) => ({ w: addDays(today(), -7 * (7 - i)).slice(5), join: Math.round(6 + rnd() * 10 - i * .4), badge: Math.round(1 + rnd() * 4 + i * .3) }));
  return {
    groups, members, parents, classes, pays, bills, consults, posts, books, lib, admins, badges, certs, msgs, orgs, journey, alerts, weeks, notices: [],
    autos: defaultAutos(type), site: null,
    settings: { join: type === 'corp' ? '운영자 초대만' : '자동 수락', siteOpen: type === 'corp' ? 'private' : 'public', marketing: true, extraQ: type === 'corp' ? ['부서', '직급'] : type === 'univ' ? ['학번', '학과'] : [], speedMin: 0.5, speedMax: 2, reviewCond: '수료 시', nudge: true, popups: [], seo: { title: '', desc: '', kw: '' }, pixel: '', terms: { tos: '', privacy: '' }, consultKeys: false, kakao: false, pg: type === 'k12' ? 'toss' : ['adult', 'lifelong'].includes(type) ? 'nice' : 'none', certInfo: { rep: '', org: '' }, footer: { company: '', ceo: '', biz: '', mail: '', addr: '', tel: '', reg: '' },
      progress: { watchThr: 80, realOnly: true, seq: true, autoDone: true, levelUnlock: true, resubmit: 2 },
      tutor: { enabled: true, name: 'AX 튜터', daily: 20, help: 'feedback', loginOnly: true, guide: '', model: 'haiku' },
      goals: { join: 60, active: 50, progress: 40, badge: 30 } },
    tutorUsage: Array.from({ length: 7 }, (_, i) => ({ d: addDays(today(), i - 6).slice(5), n: Math.round(30 + rnd() * 90) })),
    codes: [], hrd: { reports: [] }
  };
}
function curriculumFor(name, kind) {
  if (kind === 'episode') return Array.from({ length: 8 }, (_, i) => ({ id: uid('it'), type: 'offline', title: `${i + 1}회차 ${name.replace(/\(.*\)/, '')}` }));
  const base = [{ type: 'chapter', title: '1장 시작하기' }, { type: 'video', title: '오리엔테이션' }, { type: 'video', title: '핵심 개념 이해' }, { type: 'quiz', title: '개념 확인 퀴즈' }, { type: 'chapter', title: '2장 실습' }, { type: 'video', title: '실습 따라하기' }, { type: 'assign', title: '실습 과제 제출' }, { type: 'exam', title: '최종 평가' }, { type: 'survey', title: '만족도 설문' }];
  return base.map(x => ({ id: uid('it'), ...x }));
}

/* ───────── 전역 이벤트 ───────── */
const ACT = {};
ACT.go = el => go(el.dataset.v);
ACT.nav = () => document.body.classList.toggle('nav-open');
ACT['modal-close'] = () => closeModal();
ACT.tab = el => { UI[el.dataset.key] = el.dataset.v; render(); };
ACT['su-type'] = el => { SU.type = el.dataset.v; const n = $('#suForm [name=name]'); if (n) SU.name = n.value; renderSignup(); };
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = ACT[el.dataset.act]; if (f) { e.preventDefault(); f(el, e); } });
document.addEventListener('change', e => {
  if (e.target.id === 'roleSel') { S.me.role = e.target.value; save(); toast(`${roleName(S.me.role)} 권한으로 보는 화면입니다.`); go(CUR.tab || CUR.ws); return; }
  const el = e.target.closest('[data-chg]'); if (el && ACT[el.dataset.chg]) ACT[el.dataset.chg](el, e);
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S?.org) { e.preventDefault(); ACT['chat-open'] && ACT['chat-open'](); }
  if (e.key === 'Escape') { closeModal(); document.body.classList.remove('nav-open'); ACT['chat-close'] && $('#drawer') && ACT['chat-close'](); }
});
function boot() {
  S = Store.get();
  if (S && (!S.org || !TYPES[S.org.type] || !S.nav)) S = null;
  if (S) { const [w, tb] = location.hash.slice(1).split('/'); CUR = resolve(tb || w || 'home'); }
  render();
}
