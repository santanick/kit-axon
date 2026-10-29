/* 디디쌤 스튜디오 v6.1 — QA 반영
   ① 대학 개인정보 최소화(학번 · 학과만) ② 저장 공간 초과 대응 ③ 조사 자동 선택 ④ 샘플 데이터 정합성
   ⑤ 모바일 상단 바 ⑥ 끝 화살표 비활성 ⑦ 홈 인사 번역 */
'use strict';

/* ── ③ 조사 자동 선택: '을(를)' → 받침에 맞게 ── */
const JOSA_RE = /([가-힣A-Za-z0-9])([」』"'\)\]]*)(을\(를\)|이\(가\)|은\(는\)|과\(와\)|으로\(로\))/g;
function hasBatchim(ch, rieul) {
  const c = ch.charCodeAt(0);
  if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; return rieul ? (j !== 0 && j !== 8) : j !== 0; }
  if (/[0-9]/.test(ch)) return rieul ? '0136'.includes(ch) : '013678'.includes(ch);
  return rieul ? /[mn]/i.test(ch) : /[lmn]/i.test(ch);
}
const fixJosa = s => typeof s === 'string' && s.includes('(') ? s.replace(JOSA_RE, (m, ch, q, p) => { const [a, b] = p === '으로(로)' ? ['으로', '로'] : [p.slice(0, 1), p.slice(2, 3)]; return ch + q + (hasBatchim(ch, p === '으로(로)') ? a : b); }) : s;
function fixDeep(o, d = 0) { if (!o || typeof o !== 'object' || d > 12) return; for (const k in o) { const v = o[k]; if (typeof v === 'string') { if (v.includes('(')) o[k] = fixJosa(v); } else if (v && typeof v === 'object') fixDeep(v, d + 1); } }
function fixJosaDOM(root) { if (!root) return; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('(')) { const v = fixJosa(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  root.querySelectorAll?.('input[value*="("],textarea').forEach(e => { const v = fixJosa(e.value); if (v !== e.value) e.value = v; }); }
AFTER.push(() => fixJosaDOM(document.querySelector('#app')));
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && (n.classList?.contains('mwrap') || n.id === 'drawer' || n.closest?.('#drawer'))) setTimeout(() => fixJosaDOM(n), 0); }))).observe(document.body, { childList: true, subtree: true });

/* ── ② 저장 공간 초과 대응: 실패를 알리고, 오래된 기록을 정리해 다시 저장 ── */
const STQ = { size: 0, warnAt: 0, fail: false, LIMIT: 4.8e6 };
function compactState(v) { const n = { vers: 0, chat: 0, runs: 0, audit: 0 };
  (v.docs || []).forEach(d => { n.vers += (d.vers || []).length; d.vers = []; });
  if ((v.chat || []).length > 20) { n.chat = v.chat.length - 20; v.chat = v.chat.slice(-20); }
  if ((v.runs || []).length > 50) { n.runs = v.runs.length - 50; v.runs = v.runs.slice(0, 50); }
  if ((v.audit || []).length > 100) { n.audit = v.audit.length - 100; v.audit = v.audit.slice(0, 100); }
  if (v.site?.log) v.site.log = v.site.log.slice(0, 5); if (v.cal?.log) v.cal.log = v.cal.log.slice(0, 10); return n; }
const stWarn = (msg, kind) => { if (Date.now() - STQ.warnAt < 8000) return; STQ.warnAt = Date.now(); try { toast(msg, kind); } catch (e) { } };
Store.set = v => {
  if (v) fixDeep(v);
  let s = JSON.stringify(v);
  try { localStorage.setItem(KEY, s); STQ.size = s.length; STQ.fail = false; if (s.length > STQ.LIMIT * 0.8) stWarn(`저장 공간을 ${Math.round(s.length / STQ.LIMIT * 100)}% 쓰고 있습니다. 설정 › 계정 · 데이터에서 내보내기 후 정리하세요.`, 'warn'); return; } catch (e) { }
  const n = compactState(v); s = JSON.stringify(v);
  try { localStorage.setItem(KEY, s); STQ.size = s.length; STQ.fail = false; stWarn(`저장 공간이 가득 차 오래된 기록을 정리하고 저장했습니다(문서 이전 버전 ${n.vers} · 대화 ${n.chat} · 로그 ${n.runs + n.audit}).`, 'warn'); }
  catch (e) { STQ.fail = true; STQ.size = s.length; stWarn('저장하지 못했습니다 — 브라우저 저장 공간(약 5MB)이 가득 찼습니다. 큰 문서를 삭제하거나 설정 › 계정 · 데이터에서 내보낸 뒤 정리하세요. 지금 상태는 새로고침하면 사라집니다.', 'bad'); render && setTimeout(() => render(), 0); }
};
function storageCard() { const used = STQ.size || (localStorage.getItem(KEY) || '').length; const pct = Math.min(100, Math.round(used / STQ.LIMIT * 100)); const big = (S.docs || []).map(d => [d.name, (d.body || '').length + JSON.stringify(d.vers || []).length]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="card"><div class="ch"><b>브라우저 저장 공간</b><small>데모 모드 · 약 5MB 한도</small></div><div class="meter"><i style="width:${pct}%" class="${pct > 80 ? 'hi' : ''}"></i></div><p class="mini">${(used / 1e6).toFixed(2)}MB 사용 · ${pct}%${STQ.fail ? ' · <b class="warn">마지막 저장 실패</b>' : ''}</p>${big.length ? table(['큰 문서', '크기'], big.map(([n, z]) => [esc(n), (z / 1000).toFixed(0) + 'KB'])) : ''}<div class="bar2"><button class="btn sm" data-act="st-compact">오래된 기록 정리</button></div></div>`; }
ACT['st-compact'] = () => { const n = compactState(S); save(); render(); toast(`정리했습니다 — 문서 이전 버전 ${n.vers} · 대화 ${n.chat} · 로그 ${n.runs + n.audit}`, 'ok'); };
{ const base = VIEWS.settings; VIEWS.settings = () => { const h = base(); return (UI.settings === 'data') ? h + storageCard() : h; }; }
AFTER.push(() => { if (!STQ.fail || $('#stBar')) return; const m = $('#main'); m && m.insertAdjacentHTML('afterbegin', `<div id="stBar" class="stbar">저장 공간이 가득 차 최근 변경이 저장되지 않았습니다. <button class="btn sm" data-act="st-go">정리하러 가기</button></div>`); });
ACT['st-go'] = () => { UI.settings = 'data'; go('settings'); };

/* ── ① 대학 개인정보 최소화: 학번 · 학과만 저장 · 표시 ── */
const PRIV = () => S?.org?.type === 'univ';
function privacyUniv() { if (!PRIV()) return 0; let n = 0;
  S.members.forEach(m => { const sid = m.extra?.['학번'] || m.sid || m.id; if (m.name !== sid || m.email || m.phone) n++; m.name = sid; m.nick = ''; m.email = ''; m.phone = ''; m.sid = sid; if (!m.extra) m.extra = {}; m.extra['학번'] = sid; if (!m.extra['학과']) m.extra['학과'] = S.groups.find(g => g.id === m.group)?.name || ''; });
  (S.parents || []).length = 0; return n; }
const SID = m => m?.extra?.['학번'] || m?.name || '';
{ const base = VIEWS.members; VIEWS.members = () => { if (!PRIV() || (UI.mem && M(UI.mem))) return base();
  const f = UI.memF || 'all', q = (UI.memQ || '').toLowerCase();
  const L = S.members.filter(m => (f === 'all' || m.grade === f) && (!q || (SID(m) + (m.extra?.['학과'] || '')).toLowerCase().includes(q)));
  return head('', `학번 · 학과만 저장합니다(이름 · 연락처 · 이메일 미수집, 학교 SSO 연동 예정) ${guideRef('features/member/student.md')}`, `<button class="btn" data-act="mem-xls">엑셀 내려받기</button><button class="btn pri" data-act="go" data-v="enroll">+ 학번 등록</button>`) +
    tabs('memF', [['all', '전체 ' + S.members.length], ['정회원', '정회원'], ['준회원', '준회원'], ['승인 대기', '승인 대기 ' + S.members.filter(m => m.grade === '승인 대기').length]], f) +
    `<div class="bar2"><input type="search" placeholder="학번 · 학과 검색" value="${esc(UI.memQ || '')}" data-chg="memQ" aria-label="검색">${f === '승인 대기' ? '<button class="btn sm pri" data-act="mem-approve">일괄 승인</button>' : ''}</div>` +
    table(['학번', t('group'), 'AI 진단', '등급', '가입일', '최근 접속', ''], L.map(m => [`<a href="#" data-act="mem-open" data-v="${m.id}">${esc(SID(m))}</a>`, esc(m.extra?.['학과'] || gn(m.group)), m.diag ? tag(m.diag) : '<span class="mini">미응시</span>', tag(m.grade, m.grade === '정회원' ? 'g' : m.grade === '준회원' ? '' : 'y'), m.joined, m.last <= addDays(today(), -30) ? tag(m.last, 'r') : m.last, `<button class="btn sm ghost" data-act="mem-open" data-v="${m.id}">상세</button>`])); }; }
{ const base = ACT['mem-xls']; ACT['mem-xls'] = el => { if (!PRIV()) return base(el); downloadCSV(`${S.org.name}_학생_${today()}.csv`, ['학번', '학과', '등급', '가입일', '최근 접속', 'AI 진단'], S.members.map(m => [SID(m), m.extra?.['학과'] || '', m.grade, m.joined, m.last, m.diag || ''])); }; }
['mem-invite', 'mem-bulk'].forEach(k => { const base = ACT[k]; ACT[k] = el => { if (!PRIV()) return base(el); toast('대학은 이름 · 연락처를 받지 않습니다. 학번 등록(접근코드 발급)으로 안내합니다.'); go('enroll'); }; });
/* 학생 상세: 이름 · 닉네임 · 이메일 · 연락처 칸을 없애고 학과 중복 제거 */
AFTER.push(() => { if (!PRIV() || !UI.mem || CUR.tab !== 'members') return; let dept = 0;
  $$('#app .form2 > label').forEach(l => { const t = (l.firstChild?.nodeValue || '').trim(); if (['이름', '닉네임', '이메일', '연락처'].includes(t)) l.remove(); else if (t === t2(S.org.type, 'group') || t === '학과') { if (dept++) l.remove(); } else if (t === '학번') { const i = l.querySelector('input'); i && (i.readOnly = true); } });
  const p = $('#app .ph .phl p'); if (p && p.firstChild?.nodeType === 3 && /^\s*·\s*$/.test(p.firstChild.nodeValue)) p.firstChild.nodeValue = '학번 · '; });
/* ── ④ 샘플 데이터 정합성: 최근 접속 ≥ 가입일 ── */
function fixDates() { (S.members || []).forEach(m => { if (m.last < m.joined) m.last = m.joined; }); }

/* ── ⑤ 모바일 상단 바: 언어 · 권한 선택은 메뉴(서랍) 안으로 ── */
const MQM = matchMedia('(max-width: 640px)');
AFTER.push(() => { const rail = $('.side .rfoot'); if (!rail) return; let box = $('#railOpts');
  if (MQM.matches) { if (!box) { rail.insertAdjacentHTML('afterbegin', '<div id="railOpts" class="railopts"></div>'); box = $('#railOpts'); } ['#langSel', '#roleSel'].forEach(sel => { const e = $(sel); if (e && e.parentElement !== box) box.appendChild(e); }); }
  else if (box) { const top = $('.topr'); ['#roleSel', '#langSel'].forEach(sel => { const e = $(sel); if (e && top) top.insertBefore(e, top.firstChild); }); box.remove(); } });
MQM.addEventListener?.('change', () => render());

/* ── ⑥ 맨 앞 · 맨 끝 이동 화살표 비활성 ── */
AFTER.push(() => { const grp = {}; $$('#app [data-act$="-mv"][data-d], #app [data-act^="dgp-"][data-d]').forEach(b => { const key = b.dataset.act + '|' + (b.dataset.c || '') + '|' + (b.dataset.w || '') + '|' + (b.dataset.k || '') + '|' + b.dataset.d; (grp[key] = grp[key] || []).push(b); });
  Object.values(grp).forEach(L => { const idx = L.map(b => +b.dataset.v); const max = Math.max(...idx) + (L[0].dataset.d === '1' ? 0 : 0); const all = new Set(idx); L.forEach(b => { const i = +b.dataset.v, d = +b.dataset.d; const n = Math.max(...idx) + 1; if (i + d < 0 || i + d >= n) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); } }); }); });

/* ── ⑦ 홈 인사 · 남은 탭 이름 번역 ── */
Object.assign(DICT, { '관리자': { en: 'Admin', ja: '管理者', 'zh-CN': '管理员', 'zh-TW': '管理員', vi: 'Quản trị viên', th: 'ผู้ดูแล', id: 'Admin', es: 'Administrador', fr: 'Administrateur' }, '주차별 강의': { en: 'Weekly lessons', ja: '週別講義', 'zh-CN': '每周课程', 'zh-TW': '每週課程', vi: 'Bài học theo tuần', th: 'บทเรียนรายสัปดาห์', id: 'Pelajaran mingguan', es: 'Clases semanales', fr: 'Cours hebdomadaires' },
  '운영 설정': { en: 'Operations', ja: '運営設定', 'zh-CN': '运营设置', 'zh-TW': '營運設定', vi: 'Vận hành', th: 'การดำเนินงาน', id: 'Operasional', es: 'Operación', fr: 'Exploitation' },
  '연동 · 언어': { en: 'Integrations · Language', ja: '連携 · 言語', 'zh-CN': '集成 · 语言', 'zh-TW': '整合 · 語言', vi: 'Tích hợp · Ngôn ngữ', th: 'เชื่อมต่อ · ภาษา', id: 'Integrasi · Bahasa', es: 'Integraciones · Idioma', fr: 'Intégrations · Langue' },
  '홈페이지 · 상담': { en: 'Website · Counseling', ja: 'サイト · 相談', 'zh-CN': '网站 · 咨询', 'zh-TW': '網站 · 諮詢', vi: 'Trang web · Tư vấn', th: 'เว็บไซต์ · ปรึกษา', id: 'Situs · Konsultasi', es: 'Sitio · Asesoría', fr: 'Site · Conseil' },
  '계정 · 데이터': { en: 'Account · Data', ja: 'アカウント · データ', 'zh-CN': '账户 · 数据', 'zh-TW': '帳戶 · 資料', vi: 'Tài khoản · Dữ liệu', th: 'บัญชี · ข้อมูล', id: 'Akun · Data', es: 'Cuenta · Datos', fr: 'Compte · Données' } });
const GREET = { en: (n, k) => [`Hello, ${n}.`, k ? `You have <em>${k} things</em> to check today.` : 'Nothing urgent today.'], ja: (n, k) => [`こんにちは、${n}さん。`, k ? `今日の確認事項は<em>${k}件</em>です。` : '今日は急ぎの用件はありません。'], 'zh-CN': (n, k) => [`您好，${n}。`, k ? `今天有<em>${k}项</em>待确认。` : '今天没有紧急事项。'], 'zh-TW': (n, k) => [`您好，${n}。`, k ? `今天有<em>${k}項</em>待確認。` : '今天沒有緊急事項。'], vi: (n, k) => [`Xin chào, ${n}.`, k ? `Hôm nay có <em>${k} việc</em> cần kiểm tra.` : 'Hôm nay không có việc gấp.'], th: (n, k) => [`สวัสดี ${n}`, k ? `วันนี้มี <em>${k} เรื่อง</em> ที่ต้องตรวจสอบ` : 'วันนี้ไม่มีเรื่องด่วน'], id: (n, k) => [`Halo, ${n}.`, k ? `Ada <em>${k} hal</em> untuk diperiksa hari ini.` : 'Tidak ada yang mendesak hari ini.'], es: (n, k) => [`Hola, ${n}.`, k ? `Hoy tiene <em>${k} tareas</em> por revisar.` : 'Hoy no hay nada urgente.'], fr: (n, k) => [`Bonjour, ${n}.`, k ? `Vous avez <em>${k} points</em> à vérifier aujourd’hui.` : 'Rien d’urgent aujourd’hui.'] };
AFTER.push(() => { const L = I18N().ui; const h = $('.hero2 h1'); if (!h || L === 'ko' || !GREET[L]) return; const k = +(h.querySelector('em')?.textContent.match(/\d+/) || [0])[0]; const nm = DICT[S.me.name]?.[L] || S.me.name; const [a, b] = GREET[L](esc(nm), k); h.innerHTML = `${a}<br>${b}`; });

/* ── 상태 보강 ── */
{ const base = upgradeState; upgradeState = () => { base(); const n = privacyUniv(); fixDates(); fixDeep(S); if (n || !S.v61) { S.v61 = 1; save(); } }; }
{ const base = postSeed; postSeed = type => { base(type); privacyUniv(); fixDates(); fixDeep(S); S.v61 = 1; }; }
