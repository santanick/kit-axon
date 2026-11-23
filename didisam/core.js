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
function ymdL(d) { d = d instanceof Date ? d : new Date(d == null ? Date.now() : d); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; } /* v38 현지(Asia/Seoul) 날짜 하나로 — toISOString().slice(0, 10)은 UTC라 오전 9시 전에 하루 전이 됨 */
const today = () => ymdL(new Date());
/* v38 학습자 큐에서 온 UTC 시각(…Z)을 현지 'YYYY-MM-DD HH:mm'으로(그 밖의 값은 그대로) */
function atL(v) { const s0 = String(v == null ? '' : v); const k = s0.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(?:(오전|오후)\s*)?(\d{1,2})(?:시\s*|:)(\d{1,2})/); if (k) { let h = +k[5]; if (k[4] === '오후' && h < 12) h += 12; if (k[4] === '오전' && h === 12) h = 0; const p = n => String(n).padStart(2, '0'); return `${k[1]}-${p(k[2])}-${p(k[3])} ${p(h)}:${p(k[6])}`; } const s = s0; if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) return s.replace('T', ' '); const d = new Date(s); if (isNaN(d)) return s; const p = n => String(n).padStart(2, '0'); return `${ymdL(d)} ${p(d.getHours())}:${p(d.getMinutes())}`; } /* v22 현지 날짜(자정~09시 KST에 전날로 찍히던 문제) */
const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return ymdL(t); };
const daysAgo = d => Math.max(0, Math.round((Date.now() - new Date(d)) / 864e5));
const nowStr = () => { const d = new Date(); return `${ymdL(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }; /* v38 시각 표기 하나로 'YYYY-MM-DD HH:mm'(이전 '2026. 11. 11. 5시 30분 0초') */
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
  corp: { name: '기업', icon: 'corp', desc: '임직원 직무 · 법정의무교육, CS · 대리점 · 가맹점 교육, 부서별 이수 관리', ex: '사내 아카데미 · HRD팀 · 콜센터 · 가맹 본부', sub: '사내 아카데미 · 법정 필수 교육 · 신입 온보딩 · 리더십 · CS(콜센터) 교육 · 대리점 · 가맹점 교육 · 협력사 교육' },
  univ: { name: '대학', icon: 'univ', desc: '교과 · 비교과, AI 진단 · 러닝 저니 · 디지털 배지', ex: '교수학습센터 · ATC · 사업단 · 학사 LMS', sub: '사업단 · 센터 비교과 · 학사 LMS(전교생 교과 수업) · 대학원 · 평생교육원 · 취업 · 창업 센터' },
  k12: { name: '학원(초중고)', icon: 'k12', desc: '반 · 출결 · 보호자 · 청구서 중심', ex: '보습 · 입시 · 어학원', group: 'academy', sub: '수학 · 영어 · 국어 · 종합 입시 · 과학 · 유아 · 코딩 · 미술 · 음악 · 체육' },
  adult: { name: '학원(성인)', icon: 'adult', desc: '강좌 판매 · 모집 · 매출 중심', ex: '자격증 · 민간 자격증 · 실무 · 취미 · 1인 강사', group: 'academy', sub: '어학 · 자격증 · 민간 자격증 과정 운영 · 발급 기관 · 직무 IT · 취미 · 운동 · 요리 · 1인 강사 · 크리에이터' }, /* v44.1: 1인 강사는 학원(성인)에 포함 */
  lifelong: { name: '평생교육원', icon: 'lifelong', desc: '강좌 개설 · 학습비 반환 · 수료 기록', ex: '대학 부설 · 지자체 · 원격', sub: '평생학습관 · 대학 평생교육원 · 시니어 디지털 · 학점은행제 · 문화센터 · 도서관' },
  voc: { name: '직업훈련원', icon: 'voc', desc: '훈련과정 · 출결 · HRD-Net 보고', ex: '내일배움카드 · 사업주훈련', sub: '국비 기술훈련 · KDT 부트캠프 · 재직자 훈련 · 자격증 · 조리 · 미용 · 디자인 · 간호조무' }
};
const TERMS = {
  corp: { learner: '임직원', cls: '교육과정', group: '부서', teacher: '사내강사', done: '이수', site: '사내 교육포털', fee: '교육비' },
  univ: { learner: '학생', cls: '교과목', group: '학과', teacher: '교수', done: '이수', site: '학습 포털', fee: '수강료' },
  k12: { learner: '원생', cls: '수업', group: '반', teacher: '강사', done: '수료', site: '학원 홈페이지', fee: '수강료' },
  adult: { learner: '수강생', cls: '강좌', group: '기수', teacher: '강사', done: '수료', site: '홈페이지', fee: '수강료' },
  lifelong: { learner: '수강생', cls: '강좌', group: '기수', teacher: '강사', done: '수료', site: '평생교육원 홈페이지', fee: '학습비' },
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
function presetNav(type, ed) {
  /* v29 대학은 도입 형태(에디션)로 나뉜다 — lite: 사업단 · 센터, lms: 학사 LMS(전교생 메인) */
  if (ed === undefined && type === 'univ' && S && S.org && S.org.type === 'univ') ed = S.org.ed;
  const P = PRESET[type === 'univ' && ed === 'lms' && PRESET.univ_lms ? 'univ_lms' : type]; const tabs = {}; P.ws.forEach(w => tabs[w] = []);
  P.on.forEach(id => tabs[MENU[id].ws].push({ id, on: true })); P.off.filter(id => !MENU[id].only || MENU[id].only === type).forEach(id => tabs[MENU[id].ws].push({ id, on: false })); /* v32.8 다른 유형 전용 탭은 꺼진 목록에도 넣지 않는다 */
  return { ws: [...P.ws], tabs };
}
const menuOn = id => !!S.nav.tabs[MENU[id]?.ws]?.find(x => x.id === id && x.on);
const wsTabs = w => (S.nav.tabs[w] || []).filter(x => x.on && MENU[x.id] && !(MENU[x.id].owner && S.me.role !== 'owner') && !(S.me.role === 'teacher' && TEACH_NO.includes(x.id))).map(x => x.id);

/* ───────── 공용 UI ───────── */
function toast(msg, kind = '') { const box = $('#toasts'); if (box) [...box.children].forEach(x => x.remove()); /* v38 F5 P21 · C15: 안내는 한 번에 하나만 — '[게시하기]를 누르세요'와 '게시했습니다'가 겹치지 않게 */ const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3000); }
function modal(title, body, actions = [], wide = false) {
  closeModal();
  const w = document.createElement('div'); w.className = 'mwrap'; w.id = 'modal';
  w.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b><button class="x" data-act="modal-close" aria-label="닫기">${ic('x', 18)}</button></div><div class="mb">${body}</div><div class="mf">${actions.map(a => `<button class="btn ${a.kind || ''}" data-mact="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div></div>`;
  document.body.appendChild(w);
  w.addEventListener('click', e => { if (e.target === w) closeModal(); const b = e.target.closest('[data-mact]'); if (!b) return; const a = actions.find(x => x.id === b.dataset.mact); if (a && a.run) { if (a.run(w) !== false) closeModal(); } else closeModal(); });
  /* v43 F3(128): 입력칸 하나뿐인 모달 = 넓은 창 + 도움말 + 「바뀌기 전 → 바뀐 후」 미리보기(입력하는 대로 바뀜) */
  try { const ins = [...w.querySelectorAll('.mb input:not([type=hidden]),.mb select,.mb textarea')]; const one = ins.length === 1 && ins[0].tagName === 'INPUT' && /^(text|search|)$/.test(ins[0].getAttribute('type') || '') ? ins[0] : null;
    if (one && !w.querySelector('.mb .help,.mb small')) { const md = w.querySelector('.modal'); md.classList.add('m1'); const v0 = one.value; const mx = +one.getAttribute('maxlength') || 0;
      (one.closest('label') || one).insertAdjacentHTML('afterend', `<p class="m1help">${mx ? `최대 ${mx}자 · ` : ''}저장을 누르면 바로 반영됩니다. 취소하면 바뀌지 않습니다.</p><div class="m1pv" aria-live="polite"><span class="m1ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></span><div><small>미리보기</small><p>${v0 ? `<s>${esc(v0)}</s><span aria-hidden="true">→</span>` : ''}<b class="m1v">${esc(v0 || '입력하면 여기에 보입니다')}</b></p></div></div>`);
      const out = w.querySelector('.m1v'); one.addEventListener('input', () => { out.textContent = one.value.trim() || '비어 있으면 저장할 수 없습니다'; out.classList.toggle('bad', !one.value.trim()); }); } } catch (e) { }
  const f = w.querySelector('input,select,textarea,button.btn'); f && f.focus({ preventScroll: true }); return w;
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
const MENU_ALIAS = {}; /* v43 옛 메뉴 id → 새 위치(#billing → 수납 등). 값은 새 id를 돌려주는 함수 */
function resolve(id) {
  if (MENU_ALIAS[id]) id = MENU_ALIAS[id]();
  if (id === 'settings') return { ws: 'settings', tab: '' };
  if (WS[id]) { const tb = wsTabs(id); return { ws: id, tab: (UI['tab_' + id] && tb.includes(UI['tab_' + id])) ? UI['tab_' + id] : tb[0] || '' }; }
  if (MENU[id]) return { ws: MENU[id].ws, tab: id };
  if (['plan', 'integr', 'service', 'terms', 'popup', 'consult', 'lang', 'rules', 'data', 'room'].includes(id)) { UI.settings = id; return { ws: 'settings', tab: '' }; } /* v32.8 설정 하위 화면 바로가기(현황 › 요금제 [업그레이드] 등) */
  return { ws: 'home', tab: '' };
}
const TEACH_NO = ['site', 'sales', 'billing', 'ledger', 'fac', 'crmbill', 'admins', 'org', 'auto', 'settings', 'dash']; /* v43 P3-F01: 강사에게 수납 · 매출 · 시설 · 청구 금액 숨김(서버 requireRole과 같게) */ /* v32.8 설정 · 기관 현황은 교수자 직접 이동도 막음(QA U4) */
function go(id, keep) {
  let r = resolve(id);
  if (r.tab && MENU[r.tab]?.owner && S.me.role !== 'owner') { toast('정운영자만 볼 수 있는 화면입니다.', 'warn'); r = { ws: 'home', tab: '' }; }
  if (S.me.role === 'teacher' && (TEACH_NO.includes(r.tab) || TEACH_NO.includes(r.ws))) { toast('교수자 권한으로는 열 수 없는 화면입니다.', 'warn'); r = { ws: 'home', tab: '' }; } /* v25 메뉴 숨김뿐 아니라 직접 이동도 막음 */
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
        ${S.me.role === 'teacher' ? '' : `<button class="ri ${w === 'settings' ? 'on' : ''}" data-act="go" data-v="settings">${ic('gear')}<span>설정</span></button>`}
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

/* ───────── v45 진입(로그인/가입 한 카드) · ① 기관 선택 ─────────
   대표님(2026-11-23): 첫 화면 = 관리자 가입 or 로그인, 3초 간편 가입(카카오 · Google · 이메일) → 기관 선택 → 홈페이지 템플릿 → 어드민.
   화면은 renderSignup()이 SUV.step으로 나눈다: 'entry' = renderEntry(#entry, 빈 자리 #entrySoc · #entryMail) · 'org' = renderOrgStep(#suForm).
   다시 그릴 때는 늘 renderSignup()을 부른다(empty.js · dataroom.js · live.js가 renderSignup을 감싼다).
   훅(window.SUV): dflt() 첫 탭 판정 · live() 운영 여부 · mailSubmit(form) 이메일 칸 제출 · go(p) 소셜 버튼 · onbStart()는 ② 담당(onb45.js). */
let SU = { type: '', name: '', email: '' };
const SUV = window.SUV = { view: '', step: 'entry', mailOpen: false, via: '', email: '', rooms: false, err: '', focus: '',
  live: () => document.documentElement.classList.contains('live'), dflt: () => 'signup' };
const SU_K = 'didisam.su45'; /* ① 값(유형 · ed · 기관명)만 보관 — 이메일 · 비밀번호는 보관하지 않음 */
const suKeep = () => { try { sessionStorage.setItem(SU_K, JSON.stringify({ type: SU.type || '', ed: SU.ed || '', name: SU.name || '' })); } catch (e) { } };
(() => { try { const v = JSON.parse(sessionStorage.getItem(SU_K) || 'null'); if (v && typeof v === 'object') { SU.type = String(v.type || ''); SU.ed = String(v.ed || ''); SU.name = String(v.name || '').slice(0, 30); } } catch (e) { } })();
const SU_EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/; /* 서버 emailOk · pwOk(service/server/app.js)와 같은 규칙 */
const suEmailOk = e => typeof e === 'string' && e.length <= 120 && SU_EMAIL.test(e);
const suPwOk = p => typeof p === 'string' && p.length >= 10 && p.length <= 200 && /[a-zA-Z]/.test(p) && /\d/.test(p);
const SOC_IC = window.SOC_IC = {
  kakao: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#000" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>',
  google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>'
};
const SOC_N = { kakao: '카카오', google: 'Google', email: '이메일' };
const suMode = m => { document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ' ' + m; };
const suSv = d => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
Object.assign(SOC_IC, { lock: suSv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'), eye: suSv('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'), check: suSv('<path d="M5 12.5l4.2 4.2L19 7"/>'), right: suSv('<path d="M5 12h14M13 6l6 6-6 6"/>'), down: suSv('<path d="M6 9l6 6 6-6"/>'), spark: suSv('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>') });
const suLogo = () => `<span class="au-logo"><span class="logo" aria-hidden="true">D</span><b>디디쌤 스튜디오</b></span>`;
/* 시안(plan/v45/design/mock/login.html): 왼쪽 밝은 패널 + 오른쪽 카드 · 가입 탭은 이메일 칸이 펼쳐진 상태 · 로그인 탭은 「마지막 기관」 카드(#entryLast, 데모는 dataroom.js가 채움) */
const suMailDemo = (sg, open, code) => `          <button type="button" class="au-btn mail${open ? ' on' : ''}" id="entryMailBtn" data-act="en-mail" aria-expanded="${open}" aria-controls="entryMail">${SOC_IC.mail}<span>이메일로 계속하기</span></button>
          <form id="entryMail" class="au-mail" novalidate ${open ? '' : 'hidden'} aria-label="이메일로 ${sg ? '가입' : '로그인'}">
            <label class="au-field"><span>이메일</span><span class="au-inp">${SOC_IC.mail}<input name="email" type="email" inputmode="email" autocomplete="${sg ? 'email' : 'username'}" maxlength="120" required placeholder="admin@기관.ac.kr" value="${esc(SUV.email)}"></span></label>
            <label class="au-field"><span>비밀번호</span><span class="au-inp">${SOC_IC.lock}<input name="password" type="password" autocomplete="${sg ? 'new-password' : 'current-password'}" maxlength="200" required placeholder="${sg ? '10자 이상 · 영문과 숫자 · 한 번만 입력' : '비밀번호'}" ${sg ? 'aria-describedby="entryPwHint"' : ''}><button type="button" class="au-eye" data-act="en-eye" aria-label="비밀번호 보기" aria-pressed="false">${SOC_IC.eye}</button></span></label>
            ${sg ? '<p class="au-hint" id="entryPwHint">10자 이상, 영문과 숫자를 함께 씁니다.</p>' : ''}
            ${sg && code ? `<details class="au-code" id="entryCode"><summary>${SOC_IC.down}초대 코드가 있나요?</summary><label class="au-field"><span>초대 코드</span><span class="au-inp"><input name="code" autocomplete="off" maxlength="60" placeholder="디디쌤에서 받은 코드"></span></label></details>` : ''}
            <button class="btn pri lg au-go" type="submit">${sg ? `가입하고 시작하기${SOC_IC.right}` : '로그인'}</button>
            ${sg ? `<p class="au-privacy">${SOC_IC.lock}<span>이메일만 저장합니다. 이름 · 전화번호는 묻지 않습니다.</span></p>` : ''}
          </form>`;
function renderEntry() {
  suMode('mode-signup');
  if (!SUV.view) { const h = location.hash; SUV.view = /^#signup\b/.test(h) ? 'signup' : /^#login\b/.test(h) ? 'login' : (SUV.dflt() === 'login' ? 'login' : 'signup'); }
  const sg = SUV.view === 'signup'; const demo = !SUV.live(); const open = sg ? SUV.suMailShut !== true : !!SUV.mailOpen; /* 가입 탭은 시안대로 이메일 칸을 펼친 채 시작(버튼으로 접기) */ const code = typeof SUV.codeOn === 'function' && SUV.codeOn();
  $('#app').innerHTML = `
  <div class="su au45 au-entry" data-view="${sg ? 'signup' : 'login'}">
    <aside class="au-side" aria-hidden="true">
      ${suLogo()}
      <h2 class="au-hero">교육 운영,<br>이제 <em>말로</em> 하세요</h2>
      <p class="au-lead">기관 유형만 고르면 필요한 메뉴와 홈페이지가 준비됩니다. 반복 업무는 AI SAM이 맡습니다.</p>
      <ul class="au-pts"><li><span>${SOC_IC.check}</span>3초 간편 가입 · 카드 등록 없음</li><li><span>${SOC_IC.check}</span>대학 · 공공 · 기업 · 학원 · 평생 · 직훈 맞춤 구성</li><li><span>${SOC_IC.check}</span>이메일만 저장합니다 · 이름 · 전화번호를 묻지 않습니다</li></ul>
      <div class="au-shot"><img src="img/stock/cls-02-800.webp" alt="" loading="lazy">
        <div class="au-t2"><span>수강 진도 평균</span><span class="au-pb"><i></i></span><span class="num">72%</span></div>
        <div class="au-t1"><span class="au-ai">${SOC_IC.spark}</span><span><b>결석 보호자 알림 12건을 보냈습니다</b><small>AI SAM · 오늘 09:00 자동 실행</small></span></div>
      </div>
    </aside>
    <main class="au-main" id="main" tabindex="-1">
      <div class="au-mtop">${suLogo()}</div>
      <div class="au-card" id="entry" data-view="${sg ? 'signup' : 'login'}">
        <div class="au-tabs" role="tablist" aria-label="로그인 또는 회원가입" id="entryTabs">
          <button type="button" role="tab" id="enTabL" aria-controls="entryPanel" aria-selected="${!sg}" tabindex="${sg ? -1 : 0}" class="${sg ? '' : 'on'}" data-act="en-view" data-v="login">로그인</button>
          <button type="button" role="tab" id="enTabS" aria-controls="entryPanel" aria-selected="${sg}" tabindex="${sg ? 0 : -1}" class="${sg ? 'on' : ''}" data-act="en-view" data-v="signup">회원가입</button>
        </div>
        <section id="entryPanel" role="tabpanel" aria-labelledby="${sg ? 'enTabS' : 'enTabL'}">
          <h1 id="entryH" tabindex="-1">${sg ? '3초 만에 시작하세요' : '다시 오셨네요'}</h1>
          <p class="au-sub">${sg ? '가입 후 기관과 홈페이지만 고르면 바로 운영을 시작합니다.' : '지난번에 쓰던 기관 대시보드로 바로 이어집니다.'}</p>
          ${sg ? '' : '<div id="entryLast"></div>'}
          <div id="entrySoc" class="au-soc">
            <button type="button" class="au-btn kakao" data-act="en-go" data-v="kakao">${SOC_IC.kakao}<span>카카오로 계속하기</span></button>
            <button type="button" class="au-btn google" data-act="en-go" data-v="google">${SOC_IC.google}<span>Google로 계속하기</span></button>
          </div>
          ${demo ? suMailDemo(sg, open, code) : '<div id="entryMail" class="au-lvmail"></div>'}
          <p class="au-err" id="entryErr" role="alert">${esc(SUV.err || '')}</p>
          <div id="entryRooms"></div>
          <p class="au-sw">${sg ? '이미 계정이 있나요? <button type="button" class="linkb" data-act="en-view" data-v="login">로그인</button>' : '처음이신가요? <button type="button" class="linkb" data-act="en-view" data-v="signup">3초 만에 시작 →</button>'}</p>
          <p class="au-who">강사 · 직원은 받은 초대 링크로, 수강생은 기관 홈페이지에서 로그인합니다.</p>
          ${demo ? '<p class="au-demo" id="entryDemo">데모입니다. 실제 계정 연결 없이 이 브라우저에만 저장됩니다.</p>' : ''}
        </section>
      </div>
    </main>
  </div>`;
  const f = $('#entryMail');
  if (f && f.tagName === 'FORM') { f.addEventListener('submit', e => { e.preventDefault(); SUV.mailSubmit(f); }); f.email.addEventListener('input', () => { SUV.email = f.email.value; }); } /* 운영은 live.js가 빈 칸(#entrySoc · #entryMail)을 채운다 */
  $('#entryTabs').addEventListener('keydown', e => { if (!/^Arrow(Left|Right)$|^Home$|^End$/.test(e.key)) return; e.preventDefault(); const v = SUV.view === 'signup' ? 'login' : 'signup'; suView(v); setTimeout(() => { const t = $(v === 'signup' ? '#enTabS' : '#enTabL'); t && t.focus(); }, 0); });
  suFocus();
}
function renderSignup() { return SUV.step === 'org' ? renderOrgStep() : renderEntry(); }
const suFocus = () => { const k = SUV.focus; if (!k || !/^#/.test(k)) return; SUV.focus = ''; /* '#…' 선택자만 — 운영 live.js는 같은 SUV.focus에 입력칸 이름('code' 등)을 쓴다 */ const el = $(k); if (el) try { el.focus({ preventScroll: false }); } catch (e) { } };
const suErr = (msg, sel) => { SUV.err = msg || ''; const p = $('#entryErr') || $('#suErr'); if (p) p.textContent = SUV.err; if (sel) { const el = $(sel); el && el.focus(); } };
const suView = v => { if (SUV.view === v) return; SUV.view = v; SUV.err = ''; SUV.rooms = false; try { sessionStorage.setItem('didisam.lvview', v); } catch (e) { } renderSignup(); };
const suToOrg = via => { SUV.via = via; SUV.step = 'org'; SUV.err = ''; SUV.rooms = false; SUV.focus = '#orgH'; renderSignup(); window.scrollTo(0, 0); };
/* 이메일 칸 제출 — 데모 기본 동작(운영은 live.js가 SUV.mailSubmit을 바꿔 끼운다). 데모는 비밀번호를 어디에도 저장하지 않는다. */
SUV.mailSubmit = f => {
  const email = f.email.value.trim(); const pw = f.password.value; f.password.value = '';
  SUV.email = email;
  if (SUV.view === 'login') { SUV.rooms = true; SUV.err = ''; SUV.focus = '#entryRooms button, #entryRooms'; renderSignup(); return; }
  if (!suEmailOk(email)) { suErr('이메일 형식을 확인해 주십시오.', '#entryMail [name=email]'); return; }
  if (!suPwOk(pw)) { suErr('비밀번호는 10자 이상, 영문과 숫자를 함께 씁니다.', '#entryMail [name=password]'); return; }
  suToOrg('email');
};
/* 카카오 · Google — 데모는 서버가 없으므로 가입 탭은 바로 ①, 로그인 탭은 이 브라우저의 기관 목록 */
SUV.go = p => { if (SUV.view === 'login') { SUV.rooms = true; SUV.err = ''; SUV.focus = '#entryRooms button, #entryRooms'; renderSignup(); return; } SUV.email = ''; suToOrg(p); };
const suType = () => SU.type === 'univ' || SU.type === 'public' ? SU.ed : undefined;
/* 시안(plan/v45/design/mock/org.html): 위 진행 표시 · 왼쪽 유형 카드 + 세부 · 기관명 · 빈 스튜디오, 오른쪽 「준비되는 스튜디오」 미리보기, 아래 고정 바(이전 · 다음) */
function renderOrgStep() {
  suMode('mode-onb');
  const TY = k => k === 'academy' ? { name: '학원', icon: 'academy', desc: '초중고 보습 · 입시 · 성인 자격증 · 실무' } : TYPES[k];
  const cards = ['univ', 'public', 'corp', 'academy', 'lifelong', 'voc'].map(k => { const ty = TY(k);
    const sel = SU.type === k || (k === 'academy' && TYPES[SU.type]?.group === 'academy');
    return `<button type="button" class="tcard au-t ${sel ? 'on' : ''}" data-act="su-type" data-v="${k}" aria-pressed="${sel}"><span class="au-tick">${sel ? SOC_IC.check : ''}</span><span class="ti">${ticon(ty.icon)}</span><b>${esc(ty.name)}</b><p>${esc(ty.desc)}</p></button>`;
  }).join('');
  const isAcad = SU.type === 'academy' || TYPES[SU.type]?.group === 'academy';
  const isUni = SU.type === 'univ'; const isPub = SU.type === 'public'; const PE = window.PUB_ED || null;
  if (SU.type && SU.type !== 'academy' && !TYPES[SU.type]) SU.type = '';
  if (isPub && PE && SU.ed && !PE[SU.ed]) SU.ed = '';
  if (isUni && !['lite', 'lms'].includes(SU.ed)) SU.ed = 'lite';
  const ready = SU.type && SU.type !== 'academy' && (!isUni || !!SU.ed) && (!isPub || !PE || !!SU.ed);
  const pk = isUni && SU.ed === 'lms' && PRESET.univ_lms ? 'univ_lms' : isPub && SU.ed && PRESET['public_' + SU.ed] ? 'public_' + SU.ed : SU.type;
  const named = !!(SU.name || '').trim();
  const who = SUV.via === 'email' && SUV.email ? SUV.email : SUV.via && SOC_N[SUV.via] ? `${SOC_N[SUV.via]} 계정${SUV.email ? ' · ' + SUV.email : ''}` : '';
  const acct = SUV.via === 'email' && SUV.email ? `<b>${esc(SUV.email)}</b>(으)로 가입합니다` : SUV.via && SUV.via !== 'email' && SOC_N[SUV.via] ? `<b>${esc(SOC_N[SUV.via])} 계정</b>${SUV.email ? ' ' + esc(SUV.email) : ''}으로 가입합니다` : '';
  const pvName = !ready ? '' : isUni ? '대학 · ' + (SU.ed === 'lms' ? '학사 LMS' : '사업단 · 센터') : isPub && PE && PE[SU.ed] ? '공공기관 · ' + PE[SU.ed].n : TYPES[SU.type].name;
  const hint = !ready ? `${isAcad ? '학원 종류(초중고 · 성인)를 고르면' : isUni ? '도입 형태(사업단 · 센터 / 학사 LMS)를 고르면' : isPub ? '공공기관 세부 유형(시민 교육형 · 시설형 · 직원 교육형)을 고르면' : '기관 유형을 고르면'} 다음으로 갈 수 있습니다.` : !named ? '기관명을 입력하면 다음으로 갈 수 있습니다.' : '언제든 설정 › 기관 정보에서 바꿀 수 있습니다.';
  const sub = (title, badge, items) => `<section class="au-sec"><h3>${title} <span class="au-badge">${badge}</span></h3><div class="au-subs${items.length > 2 ? ' su-pub' : ''}">${items.map(([act, v, on, b, s]) => `<button type="button" class="au-sb ${on ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${on}"><span class="au-rd" aria-hidden="true"></span><span><b>${esc(b)}</b><small>${esc(s)}</small></span></button>`).join('')}</div></section>`;
  const WSN = ['learn', 'people', 'talk', 'ops'].filter(w => WS[w]);
  $('#app').innerHTML = `
  <form class="su au45 au-onb" id="suForm" autocomplete="off" novalidate>
    <header class="au-bartop">${suLogo()}
      <nav class="au-steps" aria-label="가입 진행"><span class="on" aria-current="step"><i>1</i>기관</span><span class="ln" aria-hidden="true"></span><span><i>2</i>홈페이지</span></nav>
      <span class="au-who2">${who ? `<span>${esc(who)}</span>` : ''}</span></header>
    <div class="au-page">
      <div class="au-col">
        <div class="au-msteps" aria-hidden="true"><span>1/2 기관</span><span class="au-pb"><i style="width:50%"></i></span><span>2/2 홈페이지</span></div>
        <p class="au-eyebrow">1 / 2 · 기관</p>
        <h1 id="orgH" tabindex="-1">어떤 기관을 운영하시나요?</h1>
        <p class="au-lead2">고른 유형에 맞춰 메뉴와 홈페이지 템플릿을 준비합니다. 나중에 바꿀 수 있습니다.</p>
        ${acct ? `<p class="au-acct" id="suAcct">${acct}</p>` : ''}
        <div class="tgrid au-types">${cards}</div>
        ${isAcad ? sub('학원 세부 유형', '학원만 묻습니다', [['su-type', 'k12', SU.type === 'k12', '초중고', '보습 · 입시 · 반 · 보호자 · 청구서'], ['su-type', 'adult', SU.type === 'adult', '성인', '자격증 · 실무 · 강좌 판매 · 매출']]) : ''}
        ${isUni ? sub('도입 형태', '대학만 묻습니다', [['su-ed', 'lite', SU.ed === 'lite', '사업단 · 센터 · 비교과', '빠른 도입'], ['su-ed', 'lms', SU.ed === 'lms', '학사 LMS · 전교생 교과', '학사 연동']]) : ''}
        ${isPub && PE ? sub('공공기관 세부 유형', '공공만 묻습니다', ['citizen', 'facility', 'staff'].map(k => ['su-ed', k, SU.ed === k, PE[k].n, PE[k].s])) : ''}
        <section class="au-sec"><h3><label for="suName">기관명</label></h3><span class="au-inp"><input id="suName" name="name" maxlength="30" required placeholder="예: 산타 아카데미" value="${esc(SU.name)}" aria-describedby="suNameHint"></span><p class="au-hint" id="suNameHint">홈페이지 제목과 알림 발신 이름에 쓰입니다.</p>
          <p class="au-err" id="suErr" role="alert"></p><span class="au-emptyslot"></span></section>
      </div>
      <aside class="au-aside"><div class="pv au-pv" aria-live="polite"><h4>준비되는 스튜디오</h4><div class="au-nm">${esc((SU.name || '').trim() || '기관명')}</div><div class="au-ty">${ready ? esc(pvName) : '유형을 고르면 메뉴가 보입니다'}</div>
        ${ready && PRESET[pk] ? `<div class="au-mn">${WSN.map(w => `<div>${ic(WS[w].icon, 18)}<span>${esc(w === 'people' ? TERMS[SU.type].learner : lab(WS[w]))}</span><em>${PRESET[pk].on.filter(i => MENU[i] && MENU[i].ws === w).length}개</em></div>`).join('')}<div>${ic('globe', 18)}<span>홈페이지</span><em>다음 단계</em></div></div><p class="au-note">${SOC_IC.spark}<span>${esc(TERMS[SU.type].learner)} · ${esc(TERMS[SU.type].cls)} · ${esc(TERMS[SU.type].group)} 용어로 표시됩니다.</span></p>` : ''}</div></aside>
    </div>
    <div class="au-foot"><div class="au-fin"><span class="au-msg su-hint" id="suHint">${hint}</span><button type="button" class="btn au-prev" id="suBack" data-act="su-back">이전</button><button class="btn pri au-go" type="submit" ${ready && named ? '' : 'disabled'}>다음: 홈페이지 고르기${SOC_IC.right}</button></div></div>
  </form>`;
  const f = $('#suForm');
  f.addEventListener('input', e => { if (e.target.name !== 'name') return; SU.name = f.name.value; suKeep(); const b = f.querySelector('button[type=submit]'); const ok = ready && !!SU.name.trim(); if (b) b.disabled = !ok; const h = $('#suHint'); if (h && ready) h.textContent = ok ? '언제든 설정 › 기관 정보에서 바꿀 수 있습니다.' : '기관명을 입력하면 다음으로 갈 수 있습니다.'; const nm = $('.au-nm'); if (nm) nm.textContent = SU.name.trim() || '기관명'; });
  f.addEventListener('submit', async e => { e.preventDefault(); SU.name = f.name.value.trim(); if (!SU.name) { f.name.focus(); return; }
    const type = SU.type, name = SU.name, ed = suType(); UI.onbNew = 1;
    try { await createOrg(type, name, ed); } catch (x) { console.error(x); }
    if (S && S.org && S.org.name === name && S.org.type === type) { try { if (typeof window.onbStart === 'function') { window.onbStart(); } } catch (x) { console.error(x); } suDone(); }
  });
  suFocus();
}
const suDone = () => { SU = { type: '', name: '', email: '' }; Object.assign(SUV, { view: 'login', step: 'entry', mailOpen: false, via: '', email: '', rooms: false, err: '' }); try { sessionStorage.removeItem(SU_K); } catch (e) { } };
function createOrg(type, name, ed) {
  RNG = 7 + Object.keys(TYPES).indexOf(type) * 13;
  S = { v: 2, org: { name, type, created: today(), domain: ((a => a.length >= 3 ? a : 'org-' + Math.random().toString(36).slice(2, 8))(name.replace(/[^a-z0-9]/gi, '').toLowerCase())) + '.didisam.com', /* v38 한글 이름(영문 3자 미만)은 'e.didisam.com' 대신 기관별 기본 주소 — 홈페이지 › 도메인에서 바꿈 */ plan: 'premium', ...(type === 'univ' ? { ed: ed === 'lms' ? 'lms' : 'lite' } : type === 'public' ? { ed: ['citizen', 'facility', 'staff'].includes(ed) ? ed : 'staff' } : {}) }, me: { name: '관리자', role: 'owner' }, nav: presetNav(type, type === 'univ' ? (ed === 'lms' ? 'lms' : 'lite') : type === 'public' ? (['citizen', 'facility', 'staff'].includes(ed) ? ed : 'staff') : undefined), /* v43 공공 세부 유형(시민 교육형 · 시설형 · 직원 교육형) — 없으면 직원 교육형(하위 호환) */ audit: [], runs: [], ai: { usage: 0 }, chat: [] };
  Object.assign(S, seed(type));
  if (typeof postSeed === 'function') postSeed(type);
  logAudit(`기관 생성 — 유형 ${TYPES[type].name}`); save(); CUR = { ws: 'home', tab: '' };
  if (/^org-/.test(S.org.domain)) UI.tmpDom = S.org.domain; /* v38 → v43 G2: 임시 주소 안내는 떠 있는 토스트(본문 가림) 대신 머리 줄 안내(ux.js uxTop) */
  $('#app').innerHTML = `<div class="gen"><div class="spin"></div><b>${esc(TYPES[type].name)} 맞춤 어드민을 준비하고 있습니다</b><p>메뉴 구성 · 용어 · 자동화 레시피 · 샘플 데이터</p></div>`;
  setTimeout(() => { render(); }, 800);
}

/* ───────── 샘플 데이터 (가상 이름 · 010-0000 번호 · example.com) ───────── */
const SAMPLE = {
  corp: { cls: [['신입사원 온보딩', 'period'], ['직장 내 성희롱 예방교육', 'period', 'legal'], ['개인정보보호 교육', 'period', 'legal'], ['장애인 인식개선 교육', 'period', 'legal'], ['산업안전보건교육(정기)', 'period', 'legal'], ['생성형 AI 업무 활용', 'period'], ['신임 팀장 리더십', 'episode']], grp: ['경영지원팀', '영업1팀', '생산기술팀', 'R&D센터', '고객지원팀'], lv: ['입문', '실무', '리더'] },
  univ: { cls: [['AI 리터러시(교양)', 'period'], ['AI에게 질문하는 글쓰기', 'period'], ['데이터 분석 기초', 'period'], ['캡스톤디자인', 'episode'], ['취업역량 특강', 'episode'], ['비교과: AX 챌린지', 'period']], grp: ['컴퓨터공학과', '경영학과', '간호학과', '디자인학과', '기계공학과'], lv: ['Explorer', 'Builder', 'Master'] },
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
    const n = SUR[i % SUR.length] + GIV[(i * 7 + Math.floor(i / SUR.length) * 3) % GIV.length]; /* v36 R1 성 · 이름 주기가 같아(20) 20명마다 같은 이름이 반복되던 것 — 바퀴마다 이름을 밀어 48명 모두 다르게 */ const g = groups[i % groups.length].id; const grade = i < 40 ? '정회원' : i < 44 ? '준회원' : '승인 대기';
    return { id: 'm' + i, name: n, nick: n.slice(1), email: `user${i + 1}@example.com`, phone: `010-0000-${String(1000 + i * 37).slice(-4)}`, group: g, grade, joined: addDays(today(), -Math.floor(rnd() * 180)), last: addDays(today(), -Math.floor(rnd() * (i % 7 === 0 ? 95 : 16))),
      extra: type === 'corp' ? { 부서: groups[i % groups.length].name, 직급: pick(['사원', '대리', '과장', '차장']) } : type === 'univ' ? { 학번: '2026' + String(1000 + i), 학과: groups[i % groups.length].name } : type === 'voc' ? { 훈련생구분: pick(['내일배움카드', '사업주위탁', '실업자']) } : {}, diag: type === 'univ' && i < 38 ? pick(['EYE', 'PEN', 'LENS', 'STORY', 'MAP']) : '', ...(type === 'k12' ? { crm: (gy => ({ gy, school: gy[0] === '초' ? '해운초등학교' : gy[0] === '중' ? '해운중학교' : '센텀고등학교' }))((groups[i % groups.length].name.match(/[초중고]\d/) || ['중2'])[0]) } : {}) }; /* v36 R1 학원 샘플 원생에 학년 · 학교 */
  });
  const parents = type === 'k12' ? members.slice(0, 30).map((m, i) => ({ id: 'p' + i, child: m.id, name: m.name[0] + '○○ 보호자', phone: `010-1111-${String(2000 + i * 13).slice(-4)}`, status: i % 6 === 5 ? '연결 대기 중' : '연결 완료' })) : [];
  const classes = sm.cls.map(([name, kind, x], i) => {
    const legal = x === 'legal'; const sub = kind === 'episode' ? (x || '요일반') : '';
    const price = ['corp', 'univ'].includes(type) || legal ? 0 : kind === 'sub' ? 29000 : type === 'k12' ? 280000 : type === 'voc' ? 0 : [99000, 149000, 199000, 59000][i % 4];
    const gyC = type === 'k12' ? (name.match(/[초중고]\d/) || [])[0] : ''; /* v36 R1 학원: 학년이 붙은 반(중2 · 고1)은 그 학년 원생만 */
    const lr = members.filter((m, j) => m.grade !== '승인 대기' && (legal || j % (i + 2) !== 1) && (!gyC || (m.crm || {}).gy === gyC)).map(m => m.id).slice(0, legal ? 44 : 14 + (i * 5) % 22);
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
  /* v43 R1: 커뮤니티 게시판 시연 글 8건 추가(난수를 쓰지 않아 다른 시드 값은 그대로) */
  ['이번 주 실습 결과물 공유합니다', '과제 마감 연장 가능할까요?', '스터디 같이 하실 분', '2주차 자료 링크가 안 열려요', '강의 덕분에 업무가 빨라졌어요', '질문 게시판 사용법 문의', '오프라인 특강 후기', '복습용 요약 노트 올립니다'].forEach((title, k) => posts.push({ id: uid('po'), kind: k % 3 === 1 ? '질문' : '이야기', board: '커뮤니티', who: members[(k * 5 + 3) % members.length].id, title, at: addDays(today(), -(k + 1)), replies: k % 3 === 1 ? 0 : 1 + k % 4, views: 24 + k * 11, hidden: false }));
  const books = ['k12', 'adult', 'lifelong'].includes(type) ? [{ id: 'bk0', name: type === 'k12' ? '중2 수학 개념서' : '실무 워크북(PDF)', kind: type === 'k12' ? '실물' : '전자책', price: 18000, sold: 23, delivered: 18, open: '전체' }, { id: 'bk1', name: '기출 문제집', kind: '전자책', price: 12000, sold: 41, delivered: 0, open: '전체' }] : [];
  const lib = [['오리엔테이션.mp4', '동영상', '12:30', ['c0']], ['1강 핵심 개념.mp4', '동영상', '48:10', ['c0', 'c1']], ['실습 따라하기.mp4', '동영상', '22:05', ['c1']], ['https://youtu.be/dQw4w9WgXcQ', 'YouTube', '03:33', []], ['강의자료_1차시.pdf', '문서', '2.1MB', ['c0']], ['실습 템플릿.xlsx', '문서', '310KB', []]].map(([n, k, s, u], i) => ({ id: 'l' + i, name: n, kind: k, size: s, used: u.length, cls: u, at: addDays(today(), -i * 5), views: Math.round(40 + rnd() * 400), drop: Math.round(10 + rnd() * 35) }));
  const admins = [{ id: 'a0', name: '정운영자', email: 'owner@demo', role: 'owner', classes: [] }, { id: 'a1', name: '운영 담당', email: 'staff@demo', role: 'sub', classes: [] }, { id: 'a2', name: t2(type, 'teacher') + ' 김○○', email: 'teacher@demo', role: 'teacher', classes: ['c0', 'c1'] }];
  const COL = [['#00A832', '#05612A', '#A6F0BE'], ['#14A3A3', '#0B6E6E', '#A7E3E3'], ['#E8A317', '#A86F00', '#F6D58A']]; /* v43 E1: 배지 기본 색 분홍 · 보라 · 파랑 → 그린 · 청록 · 금색 */
  const badges = sm.lv.map((lv, i) => ({ id: 'bd' + i, name: `${lv}`, key: String(i + 1), cls: classes[i]?.id || 'c0', method: i === 2 ? 'manual' : 'pass', special: false, fill: COL[i][0], ring: COL[i][1], rib: COL[i][2], issued: (classes[i]?.learners || []).filter(id => classes[i].prog[id].p >= 80).slice(0, 14 - i * 5).map((id, j) => ({ who: id, at: addDays(today(), -j), no: `${String(i + 1)}-${String(j + 1).padStart(4, '0')}`, how: i === 2 ? '수동' : '자동', st: '유효', reason: '' })) }));
  badges.push({ id: 'bdx', name: '우수 프로젝트', key: '★', cls: '', method: 'manual', special: true, fill: '#2A2B2B', ring: '#1F2020', rib: '#5C74F6', issued: [] });
  const certs = classes[0].learners.filter(id => (classes[0].prog[id] || {}).p >= classes[0].criteria.threshold).slice(0, 8).map((id, i) => /* v36 R1 샘플 수료증도 이수 기준을 채운 사람에게만 */ ({ id: uid('ct'), cls: 'c0', who: id, at: addDays(today(), -i), no: `${today().slice(0, 4)}-${String(i + 1).padStart(4, '0')}`, dl: i % 2 === 0, manual: false }));
  /* v43 Q1 시연 밀도(DIRECTION §6): 발송 내역 10건 · 채널 3종 섞기(빈 기관은 empty.js가 비움) */
  const msgs = [['이번 주 운영 안내', '전체', '앱 푸시 + 이메일', 2], ['과제 3 마감 하루 전 안내', '진도 50% 미만', '알림톡', 3], ['11월 특강 신청 안내', '전체', '이메일', 4], ['14일 이상 미접속 독려', '미접속 14일+', '알림톡', 5], ['수료증 발급 완료 안내', '수료자', '앱 푸시', 6], ['출석 확인 요청', '결석 2회 이상', '문자', 8], ['설문 참여 부탁드립니다', '전체', '앱 푸시 + 이메일', 9], ['결제 링크 재안내', '미납자', '알림톡', 11], ['시험 일정 변경 안내', '전체', '앱 푸시', 13], ['새 강좌 개설 소식', '전체', '이메일', 16]]
    .map(([title, to, ch, d], i) => ({ id: uid('ms'), at: addDays(today(), -d), to, title, ch, n: to === '전체' ? members.length : Math.max(3, Math.round(members.length * (0.08 + i * 0.03))) }));
  const orgs = ['corp', 'univ', 'lifelong', 'voc'].includes(type) ? [{ id: 'o0', name: type === 'voc' ? '협약기업 A사' : type === 'univ' ? '취업지원센터' : type === 'corp' ? '계열사 B' : '구청 평생학습관', mgr: '기관 담당자', n: 14, done: 9, job: type === 'voc' ? 6 : 0 },
    /* v43 G3 시연 밀도: 협력 기관 6곳(가상) */
    ...(type === 'voc' ? [['협약기업 B사', 22, 17, 11], ['해운대 일자리센터', 18, 12, 8], ['센텀 제조 협동조합', 11, 9, 5], ['부산 물류 C사', 16, 10, 7], ['동구 청년센터', 9, 6, 3]] : type === 'univ' ? [['교수학습개발센터', 31, 24, 0], ['산학협력단', 19, 15, 0], ['평생교육원', 26, 18, 0], ['공학교육혁신센터', 12, 9, 0], ['국제교류처', 8, 5, 0]] : type === 'corp' ? [['계열사 C', 38, 29, 0], ['협력사 D', 21, 14, 0], ['해외법인 E', 17, 11, 0], ['물류센터 F', 26, 22, 0], ['연구소 G', 12, 10, 0]] : [['수영구 평생학습관', 24, 17, 0], ['해운대 도서관', 19, 13, 0], ['동래 주민센터', 15, 9, 0], ['금정 청소년센터', 12, 8, 0], ['남구 복지관', 21, 16, 0]]).map(([name, n, done, job], i) => ({ id: 'o' + (i + 1), name, mgr: ['김지현', '박도윤', '이서연', '최민준', '정하은'][i] + ' 담당', n, done, job }))] : [];
  const journey = sm.lv.map((lv, i) => ({ id: 'j' + i, name: lv, cls: classes.filter(c => c.level === i).map(c => c.id), unlock: i === 0 ? '바로 열림' : `${sm.lv[i - 1]} 배지 획득`, badge: 'bd' + i }));
  /* v43 R1: 알림함 발송 내역 시연 8건(대상 · 읽음률이 다르게) */
  const alerts = [[1, '전체', '이번 주 학습 일정 안내', 62], [3, '진도 30% 미만', '마감 전 진도 확인 부탁드립니다', 48], [5, '신규 가입자', '첫 수업 시작 안내', 81], [8, '전체', '11월 특강 신청 안내', 57], [11, '과제 미제출', '과제 3 마감 하루 전 안내', 44], [14, '수료 예정자', '수료증 발급 안내', 88], [18, '전체', '설문 참여 부탁드립니다', 39], [24, '14일 미접속', '다시 학습을 이어 가세요', 27]].map(([d, to, title, read]) => ({ id: uid('al'), at: addDays(today(), -d), to, title, read }));
  const weeks = Array.from({ length: 8 }, (_, i) => ({ w: addDays(today(), -7 * (7 - i)).slice(5), join: Math.round(6 + rnd() * 10 - i * .4), badge: Math.round(1 + rnd() * 4 + i * .3) }));
  return {
    groups, members, parents, classes, pays, bills, consults, posts, books, lib, admins, badges, certs, msgs, orgs, journey, alerts, weeks, notices: [],
    autos: defaultAutos(type), site: null,
    settings: { join: type === 'corp' ? '운영자 초대만' : type === 'voc' ? '운영자 수락' : '자동 수락', /* v43 P1-F01 */ siteOpen: type === 'corp' ? 'private' : 'public', marketing: true, extraQ: type === 'corp' ? ['부서', '직급'] : type === 'univ' ? ['학번', '학과'] : [], speedMin: 0.5, speedMax: 2, reviewCond: '수료 시', nudge: true, popups: [], seo: { title: '', desc: '', kw: '' }, pixel: '', terms: { tos: '', privacy: '' }, consultKeys: false, kakao: false, pg: type === 'k12' ? 'toss' : ['adult', 'lifelong'].includes(type) ? 'nice' : 'none', certInfo: { rep: '', org: '' }, footer: { company: '', ceo: '', biz: '', mail: '', addr: '', tel: '', reg: '' },
      progress: { watchThr: 80, realOnly: true, seq: true, autoDone: true, levelUnlock: true, resubmit: 2 },
      tutor: { enabled: true, name: 'AX 튜터', daily: 20, guestDaily: 10, help: 'feedback', loginOnly: false, guide: '', model: 'haiku' },
      goals: { join: 60, active: 50, progress: 40, badge: 30 } },
    tutorUsage: Array.from({ length: 7 }, (_, i) => ({ d: addDays(today(), i - 6).slice(5), n: Math.round(30 + rnd() * 90) })),
    codes: [], hrd: { reports: type === 'voc' ? [[2, '주간(등록 · 진도 · 출석 · 평가)', 24, '전송 대기'], [9, '주간(등록 · 진도 · 출석 · 평가)', 24, '파일 생성'], [16, '수료 보고(용접기능사 실기)', 18, '파일 생성'], [23, '주간(등록 · 진도 · 출석 · 평가)', 22, '파일 생성']].map(([d, kind, n, st]) => ({ at: addDays(today(), -d) + ' 18:00', kind, n, st })) : [] } /* v43 R1: 직업훈련 시연 보고 4건 */
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
ACT['su-ed'] = el => { SU.ed = el.dataset.v; const n = $('#suForm [name=name]'); if (n) SU.name = n.value; suKeep(); renderSignup(); };
ACT['su-type'] = el => { if (el.dataset.v !== SU.type) SU.ed = el.dataset.v === 'univ' ? 'lite' : ''; SU.type = el.dataset.v; const n = $('#suForm [name=name]'); if (n) SU.name = n.value; suKeep(); renderSignup(); };
/* v45 진입 화면 동작 */
ACT['en-view'] = el => { const v = el.dataset.v === 'login' ? 'login' : 'signup'; SUV.focus = el.getAttribute('role') === 'tab' ? (v === 'signup' ? '#enTabS' : '#enTabL') : '#entryH'; suView(v); SUV.focus = ''; };
ACT['en-go'] = el => SUV.go(el.dataset.v);
ACT['en-mail'] = () => { if (SUV.view === 'signup') SUV.suMailShut = SUV.suMailShut !== true; else SUV.mailOpen = !SUV.mailOpen; const op = SUV.view === 'signup' ? SUV.suMailShut !== true : SUV.mailOpen; SUV.err = ''; SUV.focus = op ? '#entryMail [name=email]' : '#entryMailBtn'; renderSignup(); };
ACT['en-eye'] = el => { const i = el.parentElement.querySelector('input'); if (!i) return; const show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.setAttribute('aria-pressed', String(show)); el.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기'); };
ACT['su-back'] = ACT['en-back'] = () => { SUV.step = 'entry'; SUV.view = 'signup'; SUV.mailOpen = SUV.via === 'email'; SUV.err = ''; SUV.focus = SUV.mailOpen ? '#entryMail [name=password]' : '#entryH'; renderSignup(); };
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = ACT[el.dataset.act]; if (f) { if (el.tagName !== 'SUMMARY') e.preventDefault(); f(el, e); } }); /* v32.8 summary는 기본 접기 · 펼치기를 살린다 */
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
  if (S && typeof upgradeState === 'function') upgradeState();
  if (S) { const [w, tb] = location.hash.slice(1).split('/'); CUR = resolve(tb || w || 'home'); }
  render();
}
