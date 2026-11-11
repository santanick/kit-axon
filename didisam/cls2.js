/* v22 cls2 — 레거시 디디쌤 가이드 기능 보완(W1 클래스 설정)
   가이드: features/class/makedurationclass.md · features/class/operate.md · features/dashboard.md · faq-1/class
   ① 공용: pickTargets(title, selected, cb) — 회원 · 팀 선택기(검색 · 체크박스), 중첩 창 c2ov
   ② 데이터 보강: c.period · c.enr · c.cat(S.cats) · c.thumb · c.teachers · c.intro · c.discount · c.recruit · c.openTo · c.sale · c.kind 'pack'
   ③ 클래스 목록(카테고리 필터 · 검색 · 일괄 이동 · 결제 링크) · 카테고리 관리
   ④ 만들기 마법사(수강 기간 · 카테고리 · 리치 소개 · 썸네일 · 강사 소개 · 단일/과정 · 할인 · 모집 · 지정 회원)
   ⑤ 클래스 상세: 수강생 탭(신청일 · 종료일 · 경로 · 수료증 · 회원 링크 · 메시지 · 수료증 발행 · 강의 제외 · 결제자 제외 차단) · 설정 탭 전면 보강
   ⑥ 현황: 요금제 · 수익 · 방문 히트맵 · 방문자/PV · 수료율 추이 · 일정 · Top 10 · 학습 빈도 · 분포 · 회원 현황 · 엑셀 2종
   ⑦ 학습자 스냅샷: 클래스 판매 · 기간 · 공개 · 강사 · 카테고리 정보 */
'use strict';

/* ═════════ ① 공용: 중첩 창 · 대상 선택기 ═════════ */
const C2 = { ov: [] };
function c2ov(title, body, actions = [], wide = false) {
  const w = document.createElement('div'); w.className = 'mwrap c2ov'; w.style.zIndex = String(1000 + C2.ov.length + 5);
  w.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b><button class="x" data-c2x="1" aria-label="닫기">${ic('x', 18)}</button></div><div class="mb">${body}</div><div class="mf">${actions.map(a => `<button class="btn ${a.kind || ''}" data-c2a="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div></div>`;
  document.body.appendChild(w); C2.ov.push(w);
  const close = () => { w.remove(); C2.ov = C2.ov.filter(x => x !== w); };
  w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-c2x]')) { close(); return; } const b = e.target.closest('[data-c2a]'); if (!b) return; e.stopPropagation(); const a = actions.find(x => x.id === b.dataset.c2a); if (a && a.run) { if (a.run(w) !== false) close(); } else close(); });
  const f = w.querySelector('input,select,textarea'); f && f.focus(); w.close = close; return w;
}
window.addEventListener('keydown', e => { if (e.key === 'Escape' && C2.ov.length) { e.stopImmediatePropagation(); e.preventDefault(); const w = C2.ov[C2.ov.length - 1]; w.close(); } }, true);

const c2Teams = () => (Array.isArray(S.teams) && S.teams.length ? S.teams : (S.groups || []));
const c2InTeam = (m, tid) => m.team === tid || m.group === tid;
const c2Priv = () => S?.org?.type === 'univ';
const c2MLabel = m => !m ? '—' : c2Priv() ? `${m.extra?.['학번'] || m.sid || m.name}${m.extra?.['학과'] ? ' · ' + m.extra['학과'] : ''}` : `${m.name}${m.nick && m.nick !== m.name ? ' (' + m.nick + ')' : ''}${m.phone ? ' · ' + String(m.phone).slice(-4) : ''}`;
const c2TName = id => { const g = c2Teams().find(x => x.id === id) || (S.groups || []).find(x => x.id === id); return g ? g.name : ''; };

/* 공용 회원 · 팀 선택기 — 다른 담당 모듈도 사용(교재 · 홈페이지 메뉴 공개 대상 등)
   selected: [memberId|teamId], cb(ids) — ids는 회원 id와 팀 id를 섞어 돌려준다. opts.only: 'member'|'team' */
function pickTargets(title, selected, cb, opts = {}) {
  const sel = new Set(selected || []); const only = opts.only || '';
  const mem = (S.members || []).filter(m => m.grade !== '거절' && (opts.filter ? opts.filter(m) : true)); const teams = c2Teams();
  let tab = only === 'team' ? 'team' : 'member';
  const list = (q) => {
    q = (q || '').toLowerCase();
    if (tab === 'team') return teams.filter(g => !q || g.name.toLowerCase().includes(q)).map(g => `<label class="c2pk"><input type="checkbox" value="${esc(g.id)}" ${sel.has(g.id) ? 'checked' : ''}><b>${esc(g.name)}</b><small>${(S.members || []).filter(m => c2InTeam(m, g.id)).length}명</small></label>`).join('') || `<div class="empty">${esc(tj('group', '이'))} 없습니다. ${esc(t('learner'))} › ${esc(t('group'))}에서 만드세요.</div>`;
    return mem.filter(m => !q || [m.name, m.nick, m.email, m.phone, m.sid, m.extra?.['학번'], m.extra?.['학과'], c2TName(m.team || m.group)].join(' ').toLowerCase().includes(q)).slice(0, 300).map(m => `<label class="c2pk"><input type="checkbox" value="${esc(m.id)}" ${sel.has(m.id) ? 'checked' : ''}><b>${esc(c2MLabel(m))}</b><small>${esc(c2TName(m.team || m.group))}${m.grade && m.grade !== '정회원' ? ' · ' + esc(m.grade) : ''}</small></label>`).join('') || '<div class="empty">검색 결과가 없습니다.</div>';
  };
  const w = c2ov(title, `${only ? '' : `<div class="seg c2pt"><button type="button" class="on" data-t="member">개별 회원 ${mem.length}</button><button type="button" data-t="team">${esc(t('group'))} 단위 ${teams.length}</button></div>`}
    <div class="c2pkbar"><input type="search" class="c2q" placeholder="${c2Priv() ? '학번 · 학과 검색' : '이름 · 닉네임 · 휴대폰 · 이메일 검색'}" aria-label="검색"><button type="button" class="btn sm ghost c2all">보이는 항목 전체 선택</button></div>
    <div class="c2pkl" role="group" aria-label="대상 목록">${list('')}</div><p class="mini c2cnt">선택 ${sel.size}개</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '선택 완료', kind: 'pri', run: () => { cb([...sel]); } }]);
  const L = w.querySelector('.c2pkl'), Q = w.querySelector('.c2q'), cnt = w.querySelector('.c2cnt');
  const redraw = () => { L.innerHTML = list(Q.value); cnt.textContent = `선택 ${sel.size}개`; };
  L.addEventListener('change', e => { const x = e.target; if (x.type !== 'checkbox') return; x.checked ? sel.add(x.value) : sel.delete(x.value); cnt.textContent = `선택 ${sel.size}개`; });
  Q.addEventListener('input', redraw);
  w.querySelector('.c2all').addEventListener('click', () => { L.querySelectorAll('input[type=checkbox]').forEach(x => { x.checked = true; sel.add(x.value); }); cnt.textContent = `선택 ${sel.size}개`; });
  w.querySelectorAll('.c2pt button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.t; w.querySelectorAll('.c2pt button').forEach(x => x.classList.toggle('on', x === b)); redraw(); }));
  return w;
}
window.pickTargets = pickTargets;
/* 대상 id 목록 → 회원 id 목록(팀 펼침) */
function c2Expand(ids) { const out = new Set(); (ids || []).forEach(id => { if ((S.members || []).some(m => m.id === id)) out.add(id); else (S.members || []).filter(m => c2InTeam(m, id)).forEach(m => out.add(m.id)); }); return [...out]; }
const c2TargetLabel = id => { const m = (S.members || []).find(x => x.id === id); if (m) return c2MLabel(m); const n = c2TName(id); return n ? `${n} (팀)` : '(삭제된 대상)'; };

/* ═════════ ② 데이터 보강 ═════════ */
KIND.pack = '과정';
if (!IC.image) IC.image = '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-9 9"/>';
if (!IC.download) IC.download = '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>';
const C2SRC = { admin: '직접 부여', pay: '결제', self: '수강 신청', invite: '초대', bill: '청구서' };
const C2SALE = ['판매중', '판매 중지', '판매 종료'];
function c2Ensure(c) {
  if (!c || c._c2) return c;
  if (!c.period) c.period = { mode: 'range', days: 90, start: c.start || today(), end: c.end || addDays(today(), 90) };
  if (!c.enr || typeof c.enr !== 'object') c.enr = {};
  if (!Array.isArray(c.learners)) c.learners = [];
  if (!c.prog) c.prog = {};
  c.learners.forEach(id => { if (!c.enr[id]) { const pay = (S.pays || []).find(p => p.who === id && (p.ref === c.id || p.item === c.name) && /결제 완료|부분 환불/.test(p.status)); const m = M(id); c.enr[id] = { at: [c.start, m?.joined].filter(Boolean).sort().pop() || today(), end: null, src: pay ? 'pay' : 'admin', status: 'active', paid: pay ? pay.id : null }; } });
  if (c.cat == null) c.cat = '';
  if (c.thumb == null) c.thumb = '';
  if (!Array.isArray(c.teachers)) c.teachers = (S.admins || []).filter(a => (a.classes || []).includes(c.id)).map(a => a.id);
  if (!Array.isArray(c.intro)) c.intro = c.teacher ? [{ name: String(c.teacher).slice(0, 30), bio: '', photo: '' }] : [];
  if (!c.discount) c.discount = { on: false, type: 'rate', v: 0, until: '' };
  if (!c.recruit) c.recruit = { on: !!c.early, cap: 0, from: '', to: '', early: { on: false, until: '', rate: 0 } };
  if (!c.recruit.early) c.recruit.early = { on: false, until: '', rate: 0 };
  if (!Array.isArray(c.openTo)) c.openTo = [];
  if (!c.sale) c.sale = '판매중';
  try { Object.defineProperty(c, '_c2', { value: 1, enumerable: false, configurable: true }); } catch (e) { }
  return c;
}
function c2EnsureAll() { if (!S || !S.classes) return; if (!Array.isArray(S.cats)) S.cats = []; S.classes.forEach(c2Ensure); }
/* c.learners ↔ c.enr 동기화 */
function c2Sync(c) {
  c2Ensure(c); c.learners.forEach(id => { const e = c.enr[id]; if (!e) c.enr[id] = { at: today(), end: null, src: 'admin', status: 'active', paid: null }; else if (e.status !== 'active') e.status = 'active'; });
  Object.entries(c.enr).forEach(([id, e]) => { if (e.status === 'active' && !c.learners.includes(id)) e.status = 'excluded'; });
}
const c2Period = c => { c2Ensure(c); const P = c.period; return P.mode === 'days' ? `수강 시작 후 ${P.days}일` : `${P.start || '—'} ~ ${P.end || '—'}`; };
/* 개인 종료일: 개별 종료일(연장) → 없으면 신청일 + N일 / 특정 기간 종료일. 특정 기간 클래스는 클래스 종료일이 우선 */
function c2EndOf(c, id) {
  c2Ensure(c); const e = c.enr[id]; if (!e) return ''; const P = c.period;
  if (c.kind === 'sub') return e.end || '';
  let end = e.end || (P.mode === 'days' ? addDays(e.at || today(), +P.days || 90) : (P.end || c.end || ''));
  if (P.mode === 'range' && P.end && end > P.end) end = P.end;
  return end;
}
const c2Dday = d => { if (!d) return ''; const n = Math.round((new Date(d) - new Date(today())) / 864e5); return n < 0 ? '종료' : n === 0 ? 'D-day' : 'D-' + n; };
function c2NetPrice(c) { c2Ensure(c); const p = +c.price || 0; const D = c.discount; if (!p || !D.on || (D.until && D.until < today())) return p; return Math.max(0, D.type === 'rate' ? Math.round(p * (100 - clamp(+D.v || 0, 0, 99)) / 100 / 10) * 10 : p - (+D.v || 0)); }
function c2EarlyPrice(c) { const n = c2NetPrice(c); const R = c.recruit; if (!R.on || !R.early.on || (R.early.until && R.early.until < today())) return n; return Math.max(0, Math.round(n * (100 - clamp(+R.early.rate || 0, 0, 99)) / 100 / 10) * 10); }
/* v36 R4 직업훈련은 가격 대신 훈련비 지원 구분(국비 · 사업주 환급)을 보인다 — 지원 정보가 없으면 비운다 */
function c2Support(c) { const e = String((c.hrd || {}).emp || ''); if (e === '4') return '국비 지원 · 사업주 환급'; if (e === '3') return '국비 지원(내일배움카드)'; if (e === '1') return '사업주 환급'; const n = String(c.name || ''); if (/사업주/.test(n)) return '사업주 환급'; if (/내일배움|국비|K-?디지털/.test(n)) return '국비 지원(내일배움카드)'; return ''; }
function c2PriceHtml(c) { if (S && S.org && S.org.type === 'voc') { const L = c2Support(c); return L ? `<span class="c2sup">${esc(L)}</span>` : ''; } if (!c.price) return typeof mbPayOn === 'function' && !mbPayOn() ? '' : '무료'; /* v36 R1 결제를 쓰지 않는 유형(대학 · 기업 · 공공)은 '무료' 가격을 보이지 않는다 */ const n = c2NetPrice(c), e = c2EarlyPrice(c); return `${n < c.price ? `<s class="mini">${won(c.price)}</s> ` : ''}${won(n)}${e < n ? `<br><small class="c2eb">얼리버드 ${won(e)}</small>` : ''}`; }
/* 강사 지정 ↔ 운영자(강사) 담당 클래스 동기화 */
function c2SetTeachers(c, ids) {
  c.teachers = [...new Set(ids)]; (S.admins || []).forEach(a => { if (!Array.isArray(a.classes)) a.classes = []; const has = a.classes.includes(c.id), want = c.teachers.includes(a.id); if (want && !has) a.classes.push(c.id); if (!want && has) a.classes = a.classes.filter(x => x !== c.id); });
  const nm = c.teachers.map(id => (S.admins || []).find(a => a.id === id)?.name).filter(Boolean); c.teacher = nm.join(', ') || (c.intro[0]?.name || c.teacher || '');
}
const c2CatName = id => { const k = (S.cats || []).find(x => x.id === id); if (!k) return ''; const p = k.parent && S.cats.find(x => x.id === k.parent); return p ? `${p.name} › ${k.name}` : k.name; };
const c2CatOpts = (cur, none = '— 미지정 —') => `<option value="">${esc(none)}</option>` + c2CatTree().map(([k, d]) => `<option value="${esc(k.id)}" ${cur === k.id ? 'selected' : ''}>${d ? '　└ ' : ''}${esc(k.name)}</option>`).join('');
function c2CatTree() { const L = [...(S.cats || [])].sort((a, b) => (a.order || 0) - (b.order || 0)); const out = []; L.filter(k => !k.parent).forEach(k => { out.push([k, 0]); L.filter(x => x.parent === k.id).forEach(x => out.push([x, 1])); }); return out; }
const c2CatIds = id => [id, ...(S.cats || []).filter(k => k.parent === id).map(k => k.id)];
function c2AddCat(name, parent) { name = String(name || '').trim().slice(0, 30); if (!name) { toast('카테고리 이름을 입력하세요.', 'warn'); return null; } if ((S.cats || []).some(k => k.name === name && (k.parent || '') === (parent || ''))) { toast('같은 이름의 카테고리가 있습니다.', 'warn'); return null; } const k = { id: uid('cat'), name, parent: parent || null, order: (S.cats || []).length }; S.cats.push(k); logAudit(`클래스 카테고리 추가 — ${name}`); save(); return k; }
function c2PayLink(c) { let u = ''; try { u = new URL('learner.html', location.href).href.split('#')[0].split('?')[0]; } catch (e) { u = 'learner.html'; } const tid = typeof DREG !== 'undefined' && DREG.cur ? DREG.cur() : ''; return `${u}?t=${encodeURIComponent(tid)}#class/${c.id}`; }
async function c2Copy(txt, msg) { try { await navigator.clipboard.writeText(txt); toast(msg || '복사했습니다.', 'ok'); } catch (e) { c2ov('링크 복사', `<p class="mini">아래 주소를 직접 복사하세요.</p><input class="c2link" readonly value="${esc(txt)}" onfocus="this.select()">`, [{ id: 'ok', label: '닫기' }]); } }

/* 기본 썸네일(SVG) · AI 추천 */
const C2THUMB = [['#E63295', '#7D5CB5', '온라인 클래스'], ['#4C77C5', '#2A2B2B', '업무 · 데이터'], ['#3BA875', '#1F6F4F', '자격 · 시험'], ['#E8A317', '#E8622A', '창작 · 디자인'], ['#2A2B2B', '#4C77C5', 'AI · 코딩'], ['#7D5CB5', '#E63295', '어학 · 회화'], ['#E8622A', '#4257D7', '특강 · 이벤트'], ['#2E4F8F', '#3BA875', '법정 · 직무']];
const C2KW = [[/(AI|인공지능|코딩|프로그래밍|개발|파이썬|웹|데이터 분석가)/i, 4], [/(엑셀|노션|업무|데이터|컴활|오피스|실무)/, 1], [/(자격|시험|기능사|필기|실기|수능|내신|수학|과학)/, 2], [/(디자인|영상|창작|드로잉|사진|바리스타|공예)/, 3], [/(영어|일본어|중국어|회화|어학|국어)/, 5], [/(특강|원데이|방학|이벤트|세미나)/, 6], [/(법정|성희롱|안전|개인정보|장애인|직무|리더십|온보딩)/, 7]];
function c2ThumbSvg(i, label) { const [a, b, l] = C2THUMB[i % C2THUMB.length]; const txt = String(label || l).slice(0, 18).replace(/[<>&"']/g, ''); const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="560" cy="60" r="120" fill="#fff" opacity=".12"/><circle cx="80" cy="330" r="90" fill="#fff" opacity=".1"/><text x="40" y="300" font-family="Pretendard, sans-serif" font-size="40" font-weight="800" fill="#fff">${txt}</text></svg>`; return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
function c2ThumbRec(name) { const hit = C2KW.filter(([re]) => re.test(name || '')).map(x => x[1]); return [...new Set([...hit, 0, 1, 4])].slice(0, 4); }
const c2ThumbImg = (src, cls = '') => src ? `<img class="c2th ${cls}" src="${esc(src)}" alt="">` : `<span class="c2th c2th0 ${cls}">${ic('image', 16)}</span>`;
function c2ReadImg(file, maxKB, cb) {
  if (!file) return; if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) { toast('PNG · JPG · GIF · WEBP 이미지만 올릴 수 있습니다.', 'warn'); return; }
  const fr = new FileReader(); fr.onload = () => { const img = new Image(); img.onload = () => { let src = fr.result;
    if (src.length > maxKB * 1024 * 1.37) { const cv = document.createElement('canvas'); const r = Math.min(1, 640 / img.width); cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); src = cv.toDataURL('image/jpeg', .78); if (src.length > maxKB * 1024 * 1.37) src = cv.toDataURL('image/jpeg', .55); }
    if (src.length > maxKB * 1024 * 1.37) { toast(`이미지가 커서 ${maxKB}KB 이하로 줄이지 못했습니다. 더 작은 이미지를 올려 주세요.`, 'warn'); return; }
    /* 운영: 파일 서버 업로드 후 URL 저장. 데모는 축소한 dataURL(200KB 이하)만 저장 */ cb(src, file.name); }; img.onerror = () => toast('이미지를 읽지 못했습니다.', 'warn'); img.src = fr.result; }; fr.readAsDataURL(file);
}

/* 리치 텍스트(교육 목표 · 주요 내용) — 정화 후 저장 */
function c2Clean(html) { return safeHTML(html).slice(0, 60000); } /* v25 허용 목록 정화기(safehtml.js) */
const c2Text = html => { const d = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); };
function c2Rte(id, html) {
  return `<div class="c2rte" data-rte="${id}"><div class="c2rtb" role="toolbar" aria-label="서식">
    <button type="button" data-cmd="bold" title="굵게"><b>B</b></button><button type="button" data-cmd="italic" title="기울임"><i>I</i></button><button type="button" data-cmd="formatBlock" data-v="h3" title="제목">H</button><button type="button" data-cmd="insertUnorderedList" title="목록">• 목록</button><button type="button" data-cmd="table" title="표 삽입">표</button><button type="button" data-cmd="img" title="이미지">이미지</button><button type="button" data-cmd="link" title="링크">링크</button><span class="sp"></span><button type="button" data-cmd="src" title="HTML 소스 편집">&lt;/&gt; 소스</button></div>
    <div class="c2rta" contenteditable="true" role="textbox" aria-multiline="true" aria-label="교육 목표 및 주요 내용">${c2Clean(html)}</div><textarea class="c2rts" hidden aria-label="HTML 소스" rows="8"></textarea><input type="file" accept="image/*" hidden class="c2rtf"></div>`;
}
function c2RteVal(box) { if (!box) return ''; const ta = box.querySelector('.c2rts'); return c2Clean(ta.hidden ? box.querySelector('.c2rta').innerHTML : ta.value); }
document.addEventListener('click', e => {
  const b = e.target.closest('.c2rtb button'); if (!b) return; e.preventDefault(); const box = b.closest('.c2rte'), ed = box.querySelector('.c2rta'), ta = box.querySelector('.c2rts'); const cmd = b.dataset.cmd;
  if (cmd === 'src') { if (ta.hidden) { ta.value = c2Clean(ed.innerHTML); ta.hidden = false; ed.hidden = true; b.classList.add('on'); } else { ed.innerHTML = c2Clean(ta.value); ta.hidden = true; ed.hidden = false; b.classList.remove('on'); } return; }
  if (!ta.hidden) { toast('소스 편집을 끄고 서식을 적용하세요.', 'warn'); return; }
  ed.focus();
  if (cmd === 'table') { document.execCommand('insertHTML', false, '<table class="c2tbl"><tbody><tr><th>항목</th><th>내용</th></tr><tr><td>　</td><td>　</td></tr><tr><td>　</td><td>　</td></tr></tbody></table><p></p>'); return; }
  if (cmd === 'img') { const f = box.querySelector('.c2rtf'); f.onchange = () => c2ReadImg(f.files[0], 200, src => { ed.focus(); document.execCommand('insertHTML', false, `<img src="${src}" alt="">`); f.value = ''; }); f.click(); return; }
  if (cmd === 'link') { const u = prompt('링크 주소(https://)'); if (u && /^https?:\/\//i.test(u)) document.execCommand('createLink', false, u); return; }
  document.execCommand(cmd, false, b.dataset.v || null);
});

/* ═════════ ③ 클래스 목록 · 카테고리 관리 ═════════ */
{ const base = VIEWS.class; VIEWS.class = () => { c2EnsureAll(); if (UI.cls && C(UI.cls)) return base(); if (UI.clsView === 'cats') return c2CatsView(); return c2ListView(); }; }
function c2ListView() {
  const f = UI.clsF || 'all', cat = UI.clsCat || '', q = (UI.clsQ || '').toLowerCase();
  const tch = S.me.role === 'teacher' && typeof tMe === 'function' && tMe() ? tMe().classes : null;
  const list = S.classes.filter(c => (f === 'all' || c.kind === f) && (!cat || (cat === '_none' ? !c.cat : c2CatIds(cat).includes(c.cat))) && (!q || (c.name + ' ' + (c.teacher || '')).toLowerCase().includes(q)) && (!tch || tch.includes(c.id)));
  const subOK = S.classes.some(c => c.kind === 'sub'); /* v36 R4 '구독' 탭은 구독 과정이 실제로 있을 때만(직업훈련 · 평생 · 성인학원 평가 지적) */
  const kinds = [['all', '전체 ' + S.classes.length], ['period', '기간'], ['pack', '과정'], ['episode', '회차'], ...(subOK ? [['sub', '구독']] : [])];
  return head(`${t('cls')} 관리`, `${subOK ? '기간 · 과정 · 회차 · 구독 4가지' : '기간 · 과정 · 회차 3가지'} 유형 ${guideRef('features/class/operate.md')}`, `<button class="btn" data-act="cls-pad">출석 체크 화면 열기</button><button class="btn" data-act="c2-cats">카테고리 관리</button><button class="btn" data-act="cls-new">+ 직접 만들기</button><button class="btn ink" data-act="ai-design">${ic('spark', 16)} AI 과정 설계</button>`) +
    tabs('clsF', kinds, f) +
    `<div class="bar2 c2lbar"><input type="search" placeholder="${esc(t('cls'))}명 · 강사 검색" value="${esc(UI.clsQ || '')}" data-chg="c2-q" aria-label="${esc(t('cls'))} 검색"><select data-chg="c2-catf" aria-label="카테고리 필터"><option value="">카테고리 전체</option><option value="_none" ${cat === '_none' ? 'selected' : ''}>미지정</option>${c2CatTree().map(([k, d]) => `<option value="${k.id}" ${cat === k.id ? 'selected' : ''}>${d ? '　└ ' : ''}${esc(k.name)}</option>`).join('')}</select><button class="btn sm ghost" data-act="c2-cats" title="카테고리 만들기 · 과정 넣기">카테고리 설정</button><span class="sp"></span><span class="mini c2selc">선택 0개</span><button class="btn sm" data-act="c2-catmv">카테고리 이동</button></div>` +
    table(['', t('cls'), '유형', '카테고리', '상태', '판매', '공개', S.org.type === 'voc' ? '훈련비 지원' : t('fee'), '인원', '평균 진도', ''], list.map(c => [`<input type="checkbox" class="c2ck" value="${c.id}" aria-label="${esc(c.name)} 선택">`,
      `<a href="#" class="c2nm" data-act="cls-open" data-v="${c.id}">${c2ThumbImg(c.thumb, 'sm')}<b>${esc(c.name)}</b></a>${c.legal ? ' ' + tag('법정', 'r') : ''}${c.recruit.on ? ' ' + tag('모집', 'y') : ''}`,
      esc(KIND[c.kind] + (c.sub ? ' · ' + c.sub : '')), c.cat ? esc(c2CatName(c.cat)) : '<span class="mini">미지정</span>', tag(c.status, c.status === '운영중' ? 'g' : ''), tag(c2SaleLabel(c), c.sale === '판매중' ? 'g' : c.sale === '판매 종료' ? 'r' : 'y'),
      esc(c.open) + (c.open === '지정 회원' ? ` <small class="mini">${c.openTo.length}</small>` : ''), c2PriceHtml(c), c.learners.length + '명', bar(avgP(c)) + ' ' + pct(avgP(c)),
      `<button class="btn sm ghost" data-act="cls-open" data-v="${c.id}">관리</button><button class="btn sm ghost" data-act="cls-copy" data-v="${c.id}">복사</button>${c.price ? `<button class="btn sm ghost" data-act="c2-paylink" data-v="${c.id}">결제 링크</button>` : ''}`]), S.classes.length ? '조건에 맞는 클래스가 없습니다.' : `아직 ${tj('cls', '이')} 없습니다. [+ 직접 만들기]나 AI 과정 설계로 시작하세요.`);
}
AFTER.push(() => { const b = $('.c2lbar'); if (!b) return; const upd = () => { const n = $$('.c2ck:checked').length; const s = $('.c2selc'); if (s) s.textContent = `선택 ${n}개`; }; $$('.c2ck').forEach(x => x.addEventListener('change', upd)); });
ACT['c2-q'] = el => { UI.clsQ = el.value; render(); setTimeout(() => { const i = $('.c2lbar input[type=search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); };
ACT['c2-catf'] = el => { UI.clsCat = el.value; render(); };
/* v35.3: '판매중'은 유료 판매 과정에만. 무료 · 대학 · 국비(직업훈련) · 공공 · 기업은 '신청 가능'(저장 값 c.sale은 그대로) */
function c2SaleLabel(c) { if (c.sale !== '판매중') return c.sale; const ty = S.org && S.org.type; return +c.price > 0 && !['univ', 'voc', 'public', 'corp'].includes(ty) ? '판매중' : '신청 가능'; }
ACT['c2-paylink'] = el => { const c = C(el.dataset.v); c2Ensure(c); if (c.sale !== '판매중') toast(`판매 상태가 '${c.sale}'라 링크로 결제할 수 없습니다. 설정 탭에서 판매중으로 바꾸세요.`, 'warn'); c2Copy(c2PayLink(c), '결제 링크를 복사했습니다. 지정 회원에게 메시지로 보내세요.'); };
ACT['c2-catmv'] = () => {
  const ids = $$('.c2ck:checked').map(x => x.value); if (!ids.length) { toast(`이동할 ${tj('cls', '을')} 먼저 선택하세요.`, 'warn'); return; }
  c2ov('카테고리 일괄 이동', `<p class="mini">선택한 ${ids.length}개 ${esc(tj('cls', '을'))} 한 번에 옮깁니다.</p><label class="fl">이동할 카테고리<select name="k">${c2CatOpts('', '카테고리 해제(미지정)')}</select></label><div class="c2inl"><input name="nk" maxlength="30" placeholder="새 카테고리 이름"><button type="button" class="btn sm" data-c2newcat="1">추가하기</button></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '이동', kind: 'pri', run: w => { const k = w.querySelector('[name=k]').value; ids.forEach(id => { const c = C(id); if (c) c.cat = k; }); logAudit(`카테고리 일괄 이동 ${ids.length}개 → ${c2CatName(k) || '미지정'}`); save(); render(); toast(`${ids.length}개를 이동했습니다.`, 'ok'); } }]);
};
document.addEventListener('click', e => { const b = e.target.closest('[data-c2newcat]'); if (!b) return; e.preventDefault(); const box = b.closest('.mwrap'); const i = box.querySelector('[name=nk]'); const k = c2AddCat(i.value, ''); if (!k) return; i.value = ''; box.querySelectorAll('select[name=k],#wzCat').forEach(s => { s.insertAdjacentHTML('beforeend', `<option value="${k.id}">${esc(k.name)}</option>`); s.value = k.id; }); toast(`'${k.name}' 카테고리를 만들었습니다.`, 'ok'); });
ACT['c2-cats'] = () => { UI.clsView = 'cats'; UI.cls = null; render(); };
ACT['c2-catsback'] = () => { UI.clsView = ''; render(); };
function c2CatsView() {
  const T = c2CatTree(); const sel = UI.catSel && S.cats.find(k => k.id === UI.catSel) ? UI.catSel : (T[0] && T[0][0].id) || '';
  const k = S.cats.find(x => x.id === sel); const inCat = k ? S.classes.filter(c => c.cat === k.id) : [];
  return `<button class="link back" data-act="c2-catsback">← ${esc(t('cls'))} 목록</button>` + headD('카테고리 관리', `${esc(tj('cls', '을'))} 주제별로 분류합니다. 상위 › 하위 2단계까지 만들 수 있습니다. 수강생 탐색 화면은 홈페이지 디자인 › 상위 메뉴 '클래스'에서 카테고리 사용을 켜면 노출됩니다. ${guideRef('features/class/operate.md')}`, `<button class="btn pri" data-act="c2-catnew">+ 카테고리 만들기</button>`) +
    `<section class="g2c c2cats"><div class="card"><div class="ch"><b>카테고리</b><small>${S.cats.length}개</small></div>${T.length ? `<ol class="cur c2ctl">${T.map(([x, d]) => `<li class="${x.id === sel ? 'on' : ''} ${d ? 'c2sub' : ''}"><a href="#" data-act="c2-catsel" data-v="${x.id}"><b>${esc(x.name)}</b></a><small class="mini">${S.classes.filter(c => c.cat === x.id).length}개</small><span class="sp"></span><button class="btn sm ghost" data-act="c2-catord" data-v="${x.id}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="c2-catord" data-v="${x.id}" data-d="1" aria-label="아래로">↓</button></li>`).join('')}</ol>` : '<div class="empty">카테고리가 없습니다. [+ 카테고리 만들기]로 시작하세요.</div>'}</div>
    <div class="card">${k ? `<div class="ch"><b>${esc(c2CatName(k.id))}</b><small>배정된 ${esc(t('cls'))} ${inCat.length}개</small></div>
      <div class="bar2"><input value="${esc(k.name)}" maxlength="30" class="c2catnm" aria-label="카테고리 이름"><button class="btn sm" data-act="c2-catren" data-v="${k.id}">이름 변경</button>${!k.parent ? `<button class="btn sm" data-act="c2-catnew" data-p="${k.id}">+ 하위 카테고리</button>` : ''}<button class="btn sm" data-act="c2-catassign" data-v="${k.id}">+ ${esc(t('cls'))} 배정</button><button class="btn sm red" data-act="c2-catdel" data-v="${k.id}">삭제</button></div>
      ${table([t('cls'), '유형', '상태', ''], inCat.map(c => [esc(c.name), esc(KIND[c.kind]), tag(c.status, c.status === '운영중' ? 'g' : ''), `<button class="btn sm ghost" data-act="c2-catun" data-v="${c.id}">배정 해제</button>`]), `이 카테고리에 배정된 ${tj('cls', '이')} 없습니다.`)}` : '<div class="empty">왼쪽에서 카테고리를 선택하세요.</div>'}</div></section>`;
}
ACT['c2-catsel'] = el => { UI.catSel = el.dataset.v; render(); };
ACT['c2-catnew'] = el => { const p = el.dataset.p || ''; c2ov(p ? '하위 카테고리 만들기' : '카테고리 만들기', `${p ? `<p class="mini">상위: ${esc(c2CatName(p))}</p>` : `<label class="fl">상위 카테고리<select name="p"><option value="">없음(상위 카테고리로 만들기)</option>${S.cats.filter(k => !k.parent).map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}</select></label>`}<label class="fl">이름<input name="n" maxlength="30"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const k = c2AddCat(w.querySelector('[name=n]').value, p || (w.querySelector('[name=p]') || {}).value || ''); if (!k) return false; UI.catSel = k.id; render(); } }]); };
ACT['c2-catren'] = el => { const k = S.cats.find(x => x.id === el.dataset.v); const v = ($('.c2catnm')?.value || '').trim().slice(0, 30); if (!v) { toast('이름을 입력하세요.', 'warn'); return; } if (S.cats.some(x => x !== k && x.name === v && (x.parent || '') === (k.parent || ''))) { toast('같은 이름의 카테고리가 있습니다.', 'warn'); return; } logAudit(`카테고리 이름 변경 — ${k.name} → ${v}`); k.name = v; save(); render(); toast('이름을 바꿨습니다.', 'ok'); };
ACT['c2-catdel'] = el => { const k = S.cats.find(x => x.id === el.dataset.v); const ids = c2CatIds(k.id); const n = S.classes.filter(c => ids.includes(c.cat)).length; c2ov('카테고리 삭제', `<p><b>${esc(k.name)}</b>${!k.parent && ids.length > 1 ? `와 하위 카테고리 ${ids.length - 1}개` : ''}를 삭제합니다. 배정된 ${esc(t('cls'))} ${n}개는 '미지정'으로 바뀌며 ${esc(t('cls'))} 자체는 삭제되지 않습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { S.classes.forEach(c => { if (ids.includes(c.cat)) c.cat = ''; }); S.cats = S.cats.filter(x => !ids.includes(x.id)); UI.catSel = ''; logAudit(`카테고리 삭제 — ${k.name}`); save(); render(); } }]); };
ACT['c2-catord'] = el => { const k = S.cats.find(x => x.id === el.dataset.v); const sib = S.cats.filter(x => (x.parent || '') === (k.parent || '')).sort((a, b) => (a.order || 0) - (b.order || 0)); const i = sib.indexOf(k), j = i + +el.dataset.d; if (j < 0 || j >= sib.length) return; [sib[i], sib[j]] = [sib[j], sib[i]]; sib.forEach((x, n) => x.order = n); save(); render(); };
ACT['c2-catun'] = el => { const c = C(el.dataset.v); c.cat = ''; save(); render(); };
ACT['c2-catassign'] = el => { const k = S.cats.find(x => x.id === el.dataset.v); const avail = S.classes.filter(c => c.cat !== k.id); c2ov(`'${k.name}'에 ${t('cls')} 배정`, avail.length ? `<div class="chk">${avail.map(c => `<label><input type="checkbox" name="cc" value="${c.id}"> ${esc(c.name)}${c.cat ? ` <small class="mini">(${esc(c2CatName(c.cat))})</small>` : ''}</label>`).join('')}</div>` : '<div class="empty">배정할 클래스가 없습니다.</div>', [{ id: 'c', label: '취소' }, { id: 'ok', label: '배정', kind: 'pri', run: w => { const ids = [...w.querySelectorAll('[name=cc]:checked')].map(x => x.value); ids.forEach(id => C(id).cat = k.id); logAudit(`카테고리 배정 — ${k.name} ${ids.length}개`); save(); render(); } }]); };

/* ═════════ ④ 만들기 마법사 ═════════ */
function c2WzDef() { const D = { comp: 'single', packOf: [], pmode: 'days', pdays: 90, pstart: today(), pend: addDays(today(), 90), cat: UI.clsCat && UI.clsCat !== '_none' ? UI.clsCat : '', goal: '', goalHtml: '', thumbImg: '', intro: [], teachers: [], disc: { on: false, type: 'rate', v: 10, until: '' }, rec: { on: false, cap: 0, from: today(), to: '', early: { on: false, until: '', rate: 10 } }, openTo: [], community: 'class', skipMode: 'watched', items: [], price: 0, open: '전체', cert: 'auto' }; Object.keys(D).forEach(k => { if (WZ[k] == null) WZ[k] = D[k]; }); }
wizard = function () {
  if (!WZ) return; c2WzDef(); c2EnsureAll(); const s = WZ.step; const per = WZ.kind === 'period'; const D = '　';
  let b = `<div class="stepper"><span class="${s >= 1 ? 'on' : ''}">1 수업 정보</span><span class="${s >= 2 ? 'on' : ''}">2 커리큘럼</span><span class="${s >= 3 ? 'on' : ''}">3 설정</span></div>`;
  if (s === 1) b += `<div class="fl"><span>유형</span><div class="seg wrap">${[['period', '', '기간(온라인)'], ['episode', '요일반', '회차 · 요일반'], ['episode', '특강반', '회차 · 특강반'], ['episode', '회차 차감반', '회차 · 차감반'], ['sub', '', '구독']].map(([k, sb, l]) => `<button type="button" class="${WZ.kind === k && WZ.sub === sb ? 'on' : ''}" data-act="wz-kind" data-k="${k}" data-s="${sb}">${l}</button>`).join('')}</div></div>
    ${WZ.kind === 'sub' && S.settings.pg !== 'toss' ? '<div class="warn">구독 클래스는 유료 플랜 + 토스페이먼츠 정기결제 KEY 연동 후 판매할 수 있습니다. 매출 관리에서 PG를 연결하세요.</div>' : ''}
    <label class="fl">${esc(t('cls'))}명 <small class="mini">최대 50자</small><input id="wzName" maxlength="50" value="${esc(WZ.name)}"></label>
    ${per ? `<div class="fl c2per"><span>수강 기간</span><div class="seg"><button type="button" class="${WZ.pmode === 'days' ? 'on' : ''}" data-act="c2-wzpm" data-v="days">수강 시작 후 N일</button><button type="button" class="${WZ.pmode === 'range' ? 'on' : ''}" data-act="c2-wzpm" data-v="range">날짜 지정</button></div>
      ${WZ.pmode === 'days' ? `<div class="c2inl">${[30, 60, 90].map(n => `<label class="ckl"><input type="radio" name="wzPd" value="${n}" ${+WZ.pdays === n ? 'checked' : ''}> ${n}일</label>`).join('')}<label class="ckl"><input type="radio" name="wzPd" value="x" ${[30, 60, 90].includes(+WZ.pdays) ? '' : 'checked'}> 직접 입력</label><input id="wzPdx" type="number" min="1" max="3650" value="${esc(WZ.pdays)}" aria-label="수강 일수"> 일</div><p class="mini">수강생이 수강 신청한 날부터 N일 동안 수강합니다.</p>`
      : `<div class="c2inl"><input id="wzPs" type="date" value="${esc(WZ.pstart)}" aria-label="수강 시작일"> ~ <input id="wzPe" type="date" value="${esc(WZ.pend)}" aria-label="수강 종료일"></div><p class="mini">수강 신청일과 관계없이 지정한 기간에만 수강할 수 있습니다.</p>`}</div>` : ''}
    <div class="fl"><span>카테고리</span><div class="c2inl"><select id="wzCat" aria-label="카테고리">${c2CatOpts(WZ.cat)}</select><input name="nk" maxlength="30" placeholder="새 카테고리 이름" aria-label="새 카테고리 이름"><button type="button" class="btn sm" data-c2newcat="1">추가하기</button></div><p class="mini">만든 카테고리는 ${esc(t('cls'))} 관리 › 카테고리 관리에서 확인합니다.</p></div>
    <label class="fl">교육 대상자<input id="wzTarget" maxlength="40" value="${esc(WZ.target)}" placeholder="예: 입사 1년 차 ${esc(t('learner'))}"></label>
    <div class="fl"><span>교육 목표 · 주요 내용 <button type="button" class="btn sm ai" data-act="wz-ai-goal">✦ AI SAM 작성</button></span>${c2Rte('wz', WZ.goalHtml || (WZ.goal ? esc(WZ.goal).replace(/\n/g, '<br>') : ''))}</div>
    <div class="fl"><span>썸네일</span><div class="c2thw">${c2ThumbImg(WZ.thumbImg, 'lg')}<div><button type="button" class="btn sm" data-act="c2-thup" data-t="wz">이미지 업로드</button> <button type="button" class="btn sm ai" data-act="wz-ai-thumb">✦ AI 추천</button><p class="mini">PNG · JPG · GIF · WEBP, 큰 이미지는 자동으로 줄입니다(200KB 이하 저장). 16:9 권장.</p><div class="c2gal">${C2THUMB.map((x, i) => `<button type="button" class="${WZ.thumbIdx === i ? 'on' : ''} ${(WZ.thumbRec || []).includes(i) ? 'rec' : ''}" data-act="c2-thpick" data-t="wz" data-v="${i}" title="${esc(x[2])}"><img src="${c2ThumbSvg(i, x[2])}" alt="${esc(x[2])} 기본 이미지"></button>`).join('')}</div>${(WZ.thumbRec || []).length ? `<p class="mini">✦ AI SAM 추천 이미지에 표시했습니다${WZ.thumb ? ` · 키워드: ${esc(WZ.thumb)}` : ''}.</p>` : ''}</div></div></div>
    <div class="fl"><span>담당 강사 소개 <button type="button" class="btn sm" data-act="c2-intro" data-t="wz">+ 강사 추가</button></span>${c2IntroList(WZ.intro, 'wz')}</div>
    ${(S.admins || []).length > 1 ? `<div class="fl"><span>담당 ${esc(t('teacher'))} 계정 <small class="mini">${esc(t('teacher'))} 권한은 담당 ${esc(t('cls'))}만 관리합니다</small></span><div class="chk">${S.admins.filter(a => a.role !== 'owner').map(a => `<label><input type="checkbox" name="wzT" value="${a.id}" ${WZ.teachers.includes(a.id) ? 'checked' : ''}> ${esc(a.name)} <small class="mini">${esc(roleName(a.role))}</small></label>`).join('') || '<span class="mini">추가된 운영자가 없습니다.</span>'}</div></div>` : ''}`;
  if (s === 2) {
    const pack = per && WZ.comp === 'pack';
    b += per ? `<div class="fl"><span>커리큘럼 구성</span><div class="seg"><button type="button" class="${!pack ? 'on' : ''}" data-act="c2-wzcomp" data-v="single">단일 클래스</button><button type="button" class="${pack ? 'on' : ''}" data-act="c2-wzcomp" data-v="pack">과정 클래스</button></div><p class="mini">${pack ? '기존에 만든 클래스를 조합합니다. 가져온 세부 커리큘럼은 이 과정에서만 수정되고, 원본 클래스와 기존 수강생에게는 영향이 없습니다.' : '강의 · 시험 · 과제 · 설문을 추가해 자유롭게 구성합니다.'}</p></div>` : '';
    if (pack) {
      const src = S.classes.filter(c => ['period', 'pack'].includes(c.kind));
      b += `<div class="fl"><span>조합할 ${esc(t('cls'))} 선택 (${WZ.packOf.length}개)</span>${src.length ? `<div class="chk c2pack">${src.map(c => `<label><input type="checkbox" name="wzPk" value="${c.id}" ${WZ.packOf.includes(c.id) ? 'checked' : ''}> ${esc(c.name)} <small class="mini">${(c.curriculum || []).filter(i => i.type !== 'chapter').length}개 항목</small></label>`).join('')}</div><button type="button" class="btn sm" data-act="c2-wzpack">선택한 클래스 불러오기</button>` : `<div class="empty">조합할 기간 ${esc(tj('cls', '이'))} 없습니다. 먼저 단일 클래스를 만드세요.</div>`}</div>
        <div class="bar2"><span class="mini">과정 전용 평가 항목</span><button type="button" class="btn sm" data-act="c2-wzpe" data-v="exam">+ 시험</button><button type="button" class="btn sm" data-act="c2-wzpe" data-v="assign">+ 과제</button><button type="button" class="btn sm" data-act="c2-wzpe" data-v="survey">+ 설문</button></div>`;
    } else b += `<div class="bar2">${per ? '<button type="button" class="btn sm ai" data-act="wz-ai-cur">✦ AI 커리큘럼 구성</button>' : ''}<button type="button" class="btn sm" data-act="wz-add">+ 항목</button></div>`;
    b += `<ol class="cur">${WZ.items.map((it, i) => `<li class="${it.type === 'chapter' ? 'chap' : ''}"><span class="ty">${ITEM[it.type] || it.type}</span><b>${esc(it.title)}</b>${it.packEval ? ' ' + tag('과정 평가', 'g') : ''}<span class="sp"></span><button type="button" class="btn sm ghost" data-act="wz-del" data-v="${i}" aria-label="삭제">✕</button></li>`).join('') || '<div class="empty">항목을 추가하거나 AI 구성을 눌러 보세요.</div>'}</ol>`;
  }
  if (s === 3) {
    const r = WZ.rec, d = WZ.disc;
    b += `<div class="form2"><label>${esc(t('fee'))}(원, 0이면 무료)<input id="wzPrice" type="number" min="0" step="1000" value="${WZ.price}"></label><label>공개 대상<select id="wzOpen">${['전체', '지정 회원', '비공개'].map(v => `<option ${WZ.open === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <div class="c2box"><label class="ckl"><input type="checkbox" id="wzDon" ${d.on ? 'checked' : ''}> 수강료 할인 적용</label><div class="c2inl"><select id="wzDt" aria-label="할인 방식"><option value="rate" ${d.type === 'rate' ? 'selected' : ''}>할인율(%)</option><option value="amount" ${d.type === 'amount' ? 'selected' : ''}>할인 금액(원)</option></select><input id="wzDv" type="number" min="0" value="${esc(d.v)}" aria-label="할인 값"><span class="mini">할인 종료일(선택)</span><input id="wzDu" type="date" value="${esc(d.until)}" aria-label="할인 종료일"></div></div>
      <div class="c2box" id="wzOpenBox" ${WZ.open === '지정 회원' ? '' : 'hidden'}><b>지정 회원</b> <button type="button" class="btn sm" data-act="c2-wzopento">+ 추가</button><p class="mini">지정한 회원만 이 ${esc(tj('cls', '을'))} 수강하고 목록에서도 볼 수 있습니다.</p><div class="c2chips">${WZ.openTo.map(id => `<span class="c2chip">${esc(c2TargetLabel(id))}</span>`).join('') || '<span class="mini">아직 지정한 대상이 없습니다.</span>'}</div></div>
      <div class="form2"><label>커뮤니티 입장 권한<select id="wzComm"><option value="class" ${WZ.community === 'class' ? 'selected' : ''}>클래스 수강생만 입장</option><option value="all" ${WZ.community === 'all' ? 'selected' : ''}>전체 회원</option></select></label>
      <label>수료증<select id="wzCert" ${WZ.kind === 'sub' ? 'disabled' : ''}><option value="auto" ${WZ.cert === 'auto' ? 'selected' : ''}>자동 발급(수료 기준 충족 시)</option><option value="manual" ${WZ.kind === 'sub' || WZ.cert === 'manual' ? 'selected' : ''}>수동 발급</option></select></label></div>
      <div class="c2box"><label class="ckl"><input type="checkbox" id="wzEarly" ${r.on ? 'checked' : ''}> 사전 수강신청 등록(오픈 전 모집)</label>
        <div class="c2inl"><span class="mini">모집 인원</span><input id="wzRc" type="number" min="0" value="${esc(r.cap)}" aria-label="모집 인원"><span class="mini">명(0 = 제한 없음) · 모집 기간</span><input id="wzRf" type="date" value="${esc(r.from)}" aria-label="모집 시작일"> ~ <input id="wzRt" type="date" value="${esc(r.to)}" aria-label="모집 종료일"></div>
        <div class="c2inl"><label class="ckl"><input type="checkbox" id="wzEb" ${r.early.on ? 'checked' : ''}> 신청 인원 할인(얼리버드)</label><input id="wzEr" type="number" min="1" max="99" value="${esc(r.early.rate)}" aria-label="얼리버드 할인율">%<span class="mini">까지</span><input id="wzEu" type="date" value="${esc(r.early.until)}" aria-label="얼리버드 종료일"></div></div>
      <p class="mini">수료 기준(동영상 60 · 시험 20 · 과제 20, 80점)은 저장 후 평가 탭에서 바꿀 수 있습니다.${D}</p>`;
  }
  const w = modal(`${t('cls')} 만들기`, b, [{ id: 'c', label: '취소' }, ...(s > 1 ? [{ id: 'p', label: '이전', run: () => { wzRead(); WZ.step--; setTimeout(wizard); } }] : []), s < 3 ? { id: 'n', label: '다음으로', kind: 'pri', run: () => { wzRead(); if (s === 1 && !c2WzCheck1()) return false; if (s === 2 && WZ.kind === 'period' && WZ.comp === 'pack' && !WZ.packOf.length) { toast(`과정에 넣을 ${tj('cls', '을')} 선택하고 불러오세요.`, 'warn'); return false; } WZ.step++; setTimeout(wizard); } } : { id: 'ok', label: '저장', kind: 'pri', run: () => { wzRead(); return wzSave(); } }], true);
  const op = w.querySelector('#wzOpen'); if (op) op.addEventListener('change', () => { const bx = w.querySelector('#wzOpenBox'); if (bx) bx.hidden = op.value !== '지정 회원'; });
  return w;
};
function c2WzCheck1() {
  if (!WZ.name) { toast(`${t('cls')}명을 입력하세요.`, 'warn'); return false; }
  if (WZ.kind === 'period') { if (WZ.pmode === 'days' && !(+WZ.pdays >= 1)) { toast('수강 일수를 1일 이상으로 입력하세요.', 'warn'); return false; } if (WZ.pmode === 'range' && (!WZ.pstart || !WZ.pend || WZ.pend < WZ.pstart)) { toast('수강 시작일과 종료일을 확인하세요(종료일 ≥ 시작일).', 'warn'); return false; } }
  return true;
}
wzRead = function () {
  if (!WZ) return; c2WzDef();
  const v = id => $('#' + id);
  if (v('wzName')) { WZ.name = v('wzName').value.trim().slice(0, 50); WZ.target = v('wzTarget').value.trim(); const box = $('#modal .c2rte'); if (box) { WZ.goalHtml = c2RteVal(box); WZ.goal = c2Text(WZ.goalHtml); } WZ.cat = v('wzCat') ? v('wzCat').value : WZ.cat;
    const pd = $('#modal [name=wzPd]:checked'); if (pd) WZ.pdays = pd.value === 'x' ? Math.max(1, Math.min(3650, +(v('wzPdx').value) || 0)) : +pd.value; if (v('wzPs')) { WZ.pstart = v('wzPs').value; WZ.pend = v('wzPe').value; }
    if ($('#modal [name=wzT]')) WZ.teachers = $$('#modal [name=wzT]:checked').map(x => x.value); }
  if ($('#modal [name=wzPk]')) WZ.packSel = $$('#modal [name=wzPk]:checked').map(x => x.value);
  if (v('wzPrice')) { WZ.price = Math.max(0, +v('wzPrice').value || 0); WZ.open = v('wzOpen').value; WZ.cert = v('wzCert').value; WZ.early = v('wzEarly').checked; WZ.community = v('wzComm').value; if (v('wzSkip')) WZ.skipMode = v('wzSkip').value;
    WZ.disc = { on: v('wzDon').checked, type: v('wzDt').value, v: Math.max(0, +v('wzDv').value || 0), until: v('wzDu').value };
    WZ.rec = { on: v('wzEarly').checked, cap: Math.max(0, Math.round(+v('wzRc').value || 0)), from: v('wzRf').value, to: v('wzRt').value, early: { on: v('wzEb').checked, rate: clamp(Math.round(+v('wzEr').value || 0), 0, 99), until: v('wzEu').value } }; }
};
/* 할인 · 모집 검증(마법사 · 설정 탭 공통) */
function c2CheckSale(price, disc, rec, end) {
  if (disc.on) { if (!price) return '무료 클래스에는 할인을 적용할 수 없습니다.'; if (disc.type === 'rate' && !(disc.v >= 1 && disc.v <= 99)) return '할인율은 1~99% 사이로 입력하세요.'; if (disc.type === 'amount' && !(disc.v >= 1 && disc.v < price)) return '할인 금액은 수강료보다 작아야 합니다.'; }
  if (rec.on) { if (rec.from && rec.to && rec.to < rec.from) return '모집 종료일이 시작일보다 빠릅니다.'; if (end && rec.to && rec.to > end) return `모집 기간은 수강 기간(종료 ${end})을 넘을 수 없습니다.`; if (rec.early.on) { if (!price) return '무료 클래스에는 얼리버드 할인을 적용할 수 없습니다.'; if (!(rec.early.rate >= 1 && rec.early.rate <= 99)) return '얼리버드 할인율은 1~99% 사이로 입력하세요.'; } }
  return '';
}
wzSave = function () {
  c2WzDef();
  if (WZ.kind === 'sub' && (!WZ.price || S.settings.pg !== 'toss')) { toast('구독 클래스는 유료 + 토스 PG 연동이 필요합니다.', 'warn'); return false; }
  const per = WZ.kind === 'period'; const range = per && WZ.pmode === 'range';
  const end = per ? (range ? WZ.pend : addDays(today(), +WZ.pdays || 90)) : addDays(today(), 90);
  const err = c2CheckSale(WZ.price, WZ.disc, WZ.rec, range ? WZ.pend : ''); if (err) { toast(err, 'warn'); return false; }
  if (WZ.open === '지정 회원' && !WZ.openTo.length) toast('지정 회원을 아직 고르지 않았습니다. 설정 탭에서 추가할 수 있습니다.', 'warn');
  const pack = per && WZ.comp === 'pack' && WZ.packOf.length;
  const c = { id: uid('c'), name: WZ.name, kind: pack ? 'pack' : WZ.kind, sub: WZ.sub, legal: false, status: '준비중', price: WZ.price, open: WZ.open, start: range ? WZ.pstart : today(), end, teacher: S.me.name, group: '', learners: [], prog: {}, curriculum: WZ.items.length ? WZ.items : curriculumFor(WZ.name, WZ.kind), criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: WZ.kind === 'sub' ? 'manual' : WZ.cert, skip: WZ.skipMode === 'free' ? 'free' : 'watched', speed: { on: WZ.skipMode === 'free', min: (S.settings && S.settings.speedMin) || 0.5, max: (S.settings && S.settings.speedMax) || 2 }, early: !!WZ.rec.on, community: WZ.community || 'class', hours: 16, goal: WZ.goal, goalHtml: WZ.goalHtml, desc: WZ.goal.slice(0, 400), notices: [],
    period: per ? { mode: WZ.pmode, days: +WZ.pdays || 90, start: range ? WZ.pstart : '', end: range ? WZ.pend : '' } : { mode: 'range', days: 90, start: today(), end }, enr: {}, cat: WZ.cat || '', thumb: WZ.thumbImg || '', intro: WZ.intro, teachers: [], discount: WZ.disc, recruit: WZ.rec, openTo: WZ.openTo, sale: '판매중', ...(pack ? { packOf: WZ.packOf.slice() } : {}) };
  S.classes.unshift(c); c2SetTeachers(c, WZ.teachers); if (!c.teacher) c.teacher = S.me.name;
  logAudit(`${t('cls')} 생성 — ${c.name}${pack ? ' (과정 클래스)' : ''}`); save(); UI.cls = c.id; UI.clsT = 'curriculum'; toast('저장했습니다.', 'ok'); setTimeout(() => go('class'));
};
ACT['c2-wzpm'] = el => { wzRead(); WZ.pmode = el.dataset.v; wizard(); };
ACT['c2-wzcomp'] = el => { wzRead(); if (WZ.comp !== el.dataset.v && WZ.items.length) { WZ.items = []; toast('구성 방식을 바꿔 커리큘럼을 비웠습니다.', 'warn'); } WZ.comp = el.dataset.v; if (WZ.comp === 'single') WZ.packOf = []; wizard(); };
ACT['c2-wzpack'] = () => { wzRead(); const ids = WZ.packSel || []; if (!ids.length) { toast(`불러올 ${tj('cls', '을')} 선택하세요.`, 'warn'); return; } const ev = WZ.items.filter(i => i.packEval); WZ.items = []; WZ.packOf = ids.slice();
  ids.forEach(id => { const src = C(id); if (!src) return; WZ.items.push({ id: uid('it'), type: 'chapter', title: src.name, srcCls: src.id, packHead: true }); JSON.parse(JSON.stringify(src.curriculum || [])).forEach(it => { it.id = uid('it'); it.srcCls = src.id; delete it.week; WZ.items.push(it); }); });
  WZ.items.push(...ev); wizard(); toast(`${ids.length}개 ${t('cls')}의 커리큘럼을 복사해 불러왔습니다. 원본에는 영향이 없습니다.`, 'ok'); };
ACT['c2-wzpe'] = el => { wzRead(); const ty = el.dataset.v; WZ.items.push({ id: uid('it'), type: ty, title: `과정 ${ITEM[ty]}`, packEval: true }); wizard(); };
ACT['c2-wzopento'] = () => { wzRead(); pickTargets('지정 회원 선택', WZ.openTo, ids => { WZ.openTo = ids; wizard(); }); };
{ const base = ACT['wz-ai-thumb']; ACT['wz-ai-thumb'] = (...a) => { base(...a); WZ.thumbRec = c2ThumbRec(WZ.name); if (!WZ.thumbImg) { WZ.thumbIdx = WZ.thumbRec[0]; WZ.thumbImg = c2ThumbSvg(WZ.thumbIdx, WZ.name); } wizard(); toast(`AI SAM이 '${WZ.name || t('cls')}'에 어울리는 이미지를 추천했습니다. 다른 이미지를 골라도 됩니다.`, 'ok'); }; }
{ const base = ACT['wz-ai-goal']; ACT['wz-ai-goal'] = (...a) => { base(...a); if (WZ.name && WZ.goal) { WZ.goalHtml = esc(WZ.goal).replace(/\n/g, '<br>'); wizard(); } }; }
ACT['c2-thpick'] = el => { const i = +el.dataset.v; if (el.dataset.t === 'wz') { wzRead(); WZ.thumbIdx = i; WZ.thumbImg = c2ThumbSvg(i, WZ.name || C2THUMB[i][2]); wizard(); return; } const c = C(el.dataset.t); c.thumb = c2ThumbSvg(i, c.name); logAudit(`${c.name} 썸네일 변경(기본 이미지)`); save(); render(); toast('썸네일을 바꿨습니다.', 'ok'); };
ACT['c2-thup'] = el => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/jpeg,image/gif,image/webp'; f.onchange = () => c2ReadImg(f.files[0], 200, src => { if (el.dataset.t === 'wz') { wzRead(); WZ.thumbImg = src; WZ.thumbIdx = -1; wizard(); } else { const c = C(el.dataset.t); c.thumb = src; logAudit(`${c.name} 썸네일 업로드`); save(); render(); } toast('썸네일을 올렸습니다.', 'ok'); }); f.click(); };
ACT['c2-thclear'] = el => { const c = C(el.dataset.t); c.thumb = ''; save(); render(); };

/* 강사 소개 카드(여러 명 · 이름 · 소개 · 사진) */
function c2IntroList(L, t0) { return `<div class="c2intro">${(L || []).map((x, i) => `<div class="c2ic">${x.photo ? `<img src="${esc(x.photo)}" alt="">` : `<span class="c2av">${esc((x.name || '?').slice(0, 1))}</span>`}<div><b>${esc(x.name)}</b><small>${esc(x.bio || '소개 없음')}</small></div><button type="button" class="btn sm ghost" data-act="c2-intro" data-t="${t0}" data-i="${i}">수정</button><button type="button" class="btn sm ghost" data-act="c2-introdel" data-t="${t0}" data-i="${i}" aria-label="삭제">✕</button></div>`).join('') || '<p class="mini">강사 소개가 없습니다. 이름 · 소개 · 사진을 추가하면 클래스 상세에 표시됩니다.</p>'}</div>`; }
const c2IntroArr = t0 => t0 === 'wz' ? WZ.intro : c2Ensure(C(t0)).intro;
ACT['c2-intro'] = el => { const t0 = el.dataset.t; if (t0 === 'wz') wzRead(); const L = c2IntroArr(t0); const i = el.dataset.i != null ? +el.dataset.i : -1; const x = i >= 0 ? { ...L[i] } : { name: '', bio: '', photo: '' };
  const w = c2ov(i >= 0 ? '강사 소개 수정' : '강사 추가', `<label class="fl">강사 이름<input name="n" maxlength="30" value="${esc(x.name)}"></label><label class="fl">소개<textarea name="b" rows="4" maxlength="500">${esc(x.bio)}</textarea></label><div class="fl"><span>사진</span><div class="c2inl"><span class="c2ph">${x.photo ? `<img src="${esc(x.photo)}" alt="">` : '<span class="mini">없음</span>'}</span><button type="button" class="btn sm c2phb">사진 올리기</button><button type="button" class="btn sm ghost c2phx">사진 삭제</button></div></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { x.name = w.querySelector('[name=n]').value.trim(); x.bio = w.querySelector('[name=b]').value.trim(); if (!x.name) { toast('강사 이름을 입력하세요.', 'warn'); return false; } if (i >= 0) L[i] = x; else L.push(x); if (t0 === 'wz') wizard(); else { const c = C(t0); if (!c.teachers.length) c.teacher = c.intro.map(y => y.name).join(', '); logAudit(`${c.name} 강사 소개 ${i >= 0 ? '수정' : '추가'} — ${x.name}`); save(); render(); } } }]);
  w.querySelector('.c2phb').addEventListener('click', () => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => c2ReadImg(f.files[0], 120, src => { x.photo = src; w.querySelector('.c2ph').innerHTML = `<img src="${src}" alt="">`; }); f.click(); });
  w.querySelector('.c2phx').addEventListener('click', () => { x.photo = ''; w.querySelector('.c2ph').innerHTML = '<span class="mini">없음</span>'; });
};
ACT['c2-introdel'] = el => { const t0 = el.dataset.t; if (t0 === 'wz') wzRead(); const L = c2IntroArr(t0); const x = L[+el.dataset.i]; L.splice(+el.dataset.i, 1); if (t0 === 'wz') wizard(); else { logAudit(`${C(t0).name} 강사 소개 삭제 — ${x?.name || ''}`); save(); render(); } };

/* ═════════ ⑤ 클래스 상세 ═════════ */
{ const base = classDetail; classDetail = c => { c2Ensure(c); c2Sync(c); const tb = UI.clsT || 'learners'; let h = base(c);
  h = h.replace(/(<div class="ph"><div class="phl"><h2>)/, `$1${c.thumb ? `<img class="c2th hd" src="${esc(c.thumb)}" alt="">` : ''}`);
  h = h.replace(/(<p>)([^<]*?)( · )([^<]*?) ~ ([^<]*?)( · )/, (m0, a, k, s1) => `${a}${k}${s1}${esc(c2Period(c))}${c.cat ? ' · ' + esc(c2CatName(c.cat)) : ''} · `);
  h = h.replace(/(<\/div><div class="phr">)(<span class="tag)/, `$1${tag(c2SaleLabel(c), c.sale === '판매중' ? 'g' : c.sale === '판매 종료' ? 'r' : 'y')} ${c.price ? `<button class="btn sm ghost" data-act="c2-paylink" data-v="${c.id}">결제 링크 복사</button>` : ''}$2`);
  const cut = h.lastIndexOf('<div class="seg2" role="tablist">');
  if (cut < 0) return h; const tabsEnd = h.indexOf('</div>', cut) + 6; const pre = h.slice(0, tabsEnd);
  if (tb === 'learners') return pre + c2Learners(c);
  if (tb === 'set') return pre + c2Settings(c);
  return h; }; }

/* 메시지(W7 comm2) · 수료증(W3 assess2) 담당 모듈이 있으면 그쪽 버튼 · 열을 쓰고, 없으면 여기서 제공 */
const c2HasMsg = () => !!ACT['cm-cls-msg'], c2HasCert = () => typeof a2CertIssueModal === 'function';
function c2Learners(c) {
  const ep = c.kind === 'episode', sub = c.kind === 'sub'; const certOf = id => (S.certs || []).find(x => x.cls === c.id && x.who === id);
  const ids = c.learners;
  const rows = ids.map(id => { const p = c.prog[id] || { p: 0 }; const e = c.enr[id] || {}; const end = c2EndOf(c, id); const ct = certOf(id); const paid = e.src === 'pay' || !!e.paid; const exN = (e.ex || []).length;
    return [`<input type="checkbox" class="ck" value="${id}" aria-label="선택">`, `<a href="#" data-act="mem-open" data-v="${id}">${mn(id)}</a>`, esc(c2TName(M(id)?.team || M(id)?.group) || (c2Priv() ? M(id)?.extra?.['학과'] : '') || '—'), esc(e.at || '—'),
      sub ? (e.rounds ? `${e.rounds}회차` : '—') : end ? `${esc(end)} <small class="mini">${c2Dday(end)}</small>${e.end ? ' ' + tag('연장', 'y') : ''}` : '—', esc(C2SRC[e.src] || '직접 부여'),
      bar(p.p, p.p < 30 ? 'r' : '') + ' ' + pct(p.p), p.exam ?? '—', { none: '미제출', submitted: tag('채점 대기', 'y'), graded: tag('채점 완료', 'g') }[p.assign] || '—', ep ? (a => a == null ? '—' : pct(a))(clsAtt(c, id)) : (clsDone(c, id) ? tag(t('done'), 'g') : '—'),
      ...(c2HasCert() ? [] : [ct ? (ct.dl ? `<span title="학습자가 내려받음" aria-label="내려받음">${ic('download', 16)}</span>` : '<span class="mini" title="발급됨 · 미다운로드">발급</span>') : '']),
      `<button class="btn sm ghost" data-act="c2-ex" data-c="${c.id}" data-v="${id}">${exN ? `강의 제외 ${exN}` : '강의 제외'}</button><button class="btn sm ghost" data-act="cls-revoke" data-c="${c.id}" data-v="${id}" ${paid ? 'disabled title="결제한 수강생은 권한 제외 대신 매출 관리에서 환불로 처리합니다"' : ''}>${sub ? '수강 제외' : '권한 제외'}</button>`]; });
  return `<div class="bar2"><button class="btn sm" data-act="cls-grant" data-v="${c.id}">수강 권한 부여</button><button class="btn sm" data-act="cls-extend" data-v="${c.id}" ${sub ? 'disabled title="구독 클래스는 연장 대신 회차로 관리합니다"' : ''}>수강 기간 연장</button>${c2HasMsg() ? '' : `<button class="btn sm" data-act="c2-msg" data-v="${c.id}">메시지 발송</button>`}${c2HasCert() ? '' : `<button class="btn sm" data-act="c2-cert" data-v="${c.id}" ${sub ? 'title="구독 클래스는 수동 발급만"' : ''}>수료증 발행</button>`}<button class="btn sm" data-act="cls-dl" data-v="${c.id}">수강현황 내려받기</button><button class="btn sm ghost" data-act="auto-run-id" data-v="nudge-low">진도 30% 미만 독려</button></div>
    <p class="mini c2note">이름을 누르면 회원 상세로 이동합니다. ${typeof mbPayOn === 'function' && !mbPayOn() ? '' : `결제로 수강한 ${esc(tj('learner', '은'))} 권한 제외 대신 환불로 처리합니다. `}${c.period.mode === 'range' ? `특정 기간 ${esc(tj('cls', '은'))} ${esc(t('cls'))} 종료일(${esc(c.period.end)})이 개별 종료일보다 우선합니다.` : ''}</p>` +
    table(['', c2Priv() ? '학번' : '이름', t('group'), '신청일', sub ? '부여 회차' : '수강 종료일', '경로', '진도', '시험', '과제', ep ? '출석률' : t('done'), ...(c2HasCert() ? [] : ['수료증']), ''], rows, `아직 수강하는 ${tj('learner', '이')} 없습니다. [수강 권한 부여]를 눌러 추가하세요.`);
}
const c2Sel = () => $$('.ck:checked').map(x => x.value);
/* 수강 권한 부여 — 개인 · 팀, 알림 발송 */
ACT['cls-grant'] = el => { const c = c2Ensure(C(el.dataset.v)); const sub = c.kind === 'sub';
  const go2 = ids => { const add = c2Expand(ids).filter(id => !c.learners.includes(id) && M(id)?.grade !== '승인 대기'); if (!add.length) { toast('새로 부여할 대상이 없습니다(이미 수강 중이거나 승인 대기).', 'warn'); return; }
    const empty = c.kind !== 'episode' && c.kind !== 'sub' && !(c.curriculum || []).some(x => x && x.type !== 'offline' && x.type !== 'chapter');
    const after = rounds => { add.forEach(id => { c.learners.push(id); c.prog[id] = c.prog[id] || { p: 0, exam: null, assign: 'none', att: 100 }; c.enr[id] = { at: today(), end: null, src: 'admin', status: 'active', paid: null, ...(sub ? { rounds } : {}) }; if (empty) { c.crs = c.crs || {}; c.crs.pendNotify = [...new Set([...(c.crs.pendNotify || []), id])]; } else c2Notify(id, `${c.name} 수강 권한이 부여되었습니다`, `지금 바로 수강을 시작할 수 있습니다.${sub ? ` 부여 회차: ${rounds}회차` : ''}`); });
      /* v38 U-3: 콘텐츠가 없는 과정은 '지금 바로 수강' 알림을 보내지 않고, 공개할 때 보낸다 */
      logAudit(`${c.name} 수강 권한 부여 ${add.length}명${sub ? ` · ${rounds}회차` : ''} (${empty ? '알림 보류 — 콘텐츠 없음' : '알림 발송'})`); save(); toast(empty ? `${add.length}명에게 권한을 부여했습니다. 아직 넣은 콘텐츠가 없어 알림은 보내지 않았습니다. 내용을 넣고 공개하면 그때 알림이 갑니다.` : `${add.length}명에게 권한을 부여하고 알림을 보냈습니다.`, empty ? 'warn' : 'ok'); render(); };
    const cap = +((c.recruit && c.recruit.cap) || c.cap || 0), over = cap && c.learners.length + add.length > cap ? c.learners.length + add.length - cap : 0; /* v38 정원 초과 경고(직접 · 팀 단위 배정 모두, QA L10) */
    if (!sub && !c.price && !over) { after(0); return; }
    c2ov('수강 권한 부여 확인', `${c.price ? `<div class="warn">유료 ${esc(t('cls'))}입니다. 권한을 직접 부여하면 결제 없이 수강할 수 있습니다.</div>` : ''}${over ? `<div class="warn">정원 ${cap}명 중 ${c.learners.length}명이 수강 중입니다. ${add.length}명을 배정하면 정원을 ${over}명 넘습니다. 그래도 배정하려면 [부여]를 누르세요.</div>` : ''}<p>${add.length}명에게 권한을 부여합니다. 부여 즉시 알림이 발송되고 바로 수강할 수 있습니다.</p>${sub ? '<label class="fl">부여할 구독 회차(1~999)<input name="r" type="number" min="1" max="999" value="1"></label>' : ''}`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '부여', kind: 'pri', run: w => { const r = sub ? Math.round(+w.querySelector('[name=r]').value || 0) : 0; if (sub && !(r >= 1 && r <= 999)) { toast('회차는 1~999 사이로 입력하세요.', 'warn'); return false; } after(r); } }]); };
  pickTargets(`수강 권한 부여 — ${c.name}`, [], go2, { filter: m => !c.learners.includes(m.id) && m.grade !== '승인 대기' && m.grade !== '거절' }); };
/* 권한 제외: 결제자 차단, 구독은 이번 회차 후 만료 */
{ const base = ACT['cls-revoke']; ACT['cls-revoke'] = el => { const c = c2Ensure(C(el.dataset.c)); const id = el.dataset.v; const e = c.enr[id] || {};
  if (e.src === 'pay' || e.paid) { toast('결제한 수강생은 권한을 제외할 수 없습니다. 매출 관리에서 환불로 처리하세요.', 'warn'); return; }
  if (c.kind === 'sub') { const sb = (S.subs || []).find(x => x.cls === c.id && x.who === id && x.status !== '해지'); const until = (sb && sb.next) || addDays(today(), 30);
    c2ov('수강 제외', `<p>${mn(id)}님은 현재 회차가 끝나는 <b>${esc(until)}</b>까지 수강한 뒤 만료됩니다(즉시 삭제되지 않음).</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '제외', kind: 'red', run: () => { e.end = until; e.revoked = today(); if (sb) sb.status = '해지 예약'; logAudit(`${c.name} 수강 제외(이번 회차 후 만료) — ${M(id)?.name}`); save(); render(); } }]); return; }
  c2ov('클래스 수강 제외', `<p>${mn(id)}님의 수강 권한을 삭제합니다. 제외된 ${esc(t('cls'))}에는 더 이상 접근할 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '제외', kind: 'red', run: () => { base(el); if (c.enr[id]) { c.enr[id].status = 'excluded'; c.enr[id].out = today(); } save(); render(); } }]); }; }
/* 수강 기간 연장 — 개인 종료일 저장 · 미리보기 */
ACT['cls-extend'] = el => { const c = c2Ensure(C(el.dataset.v)); const sel = c2Sel(); const ids = sel.length ? sel : c.learners.slice(); if (!ids.length) { toast(`연장할 ${tj('learner', '이')} 없습니다.`, 'warn'); return; }
  const cend = c.period.mode === 'range' ? c.period.end : '';
  const tbl = d => `<div class="tw c2ext"><table><thead><tr><th>이름</th><th>현재 종료일</th><th>연장 종료일</th></tr></thead><tbody>${ids.map(id => { const cur = c2EndOf(c, id); const raw = (c.enr[id] && c.enr[id].end) || (c.period.mode === 'days' ? addDays(c.enr[id]?.at || today(), +c.period.days) : cur); const base0 = raw && raw > today() ? raw : today(); const nx = addDays(base0, d); const over = cend && nx > cend; return `<tr><td>${mn(id)}</td><td>${esc(cur || '—')}</td><td>${esc(nx)}${over ? ` ${tag('클래스 종료일 우선', 'r')}` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  const w = c2ov('수강 기간 연장', `<p class="mini">${sel.length ? `선택한 ${sel.length}명` : '선택한 수강생이 없어 전체 수강생'}의 개별 종료일을 연장합니다. ${esc(t('cls'))} 기간을 바꿔도 기존 수강생 종료일은 자동으로 바뀌지 않으며, 특정 기간 ${esc(tj('cls', '은'))} ${esc(t('cls'))} 종료일이 개별 종료일보다 우선합니다.</p><div class="warn">연장 기간에는 환불 신청을 할 수 없습니다. 반드시 수강생에게 안내해 주세요.</div><label class="fl">연장 일수<input name="d" type="number" min="1" max="3650" value="14"></label><div class="c2pv">${tbl(14)}</div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '연장', kind: 'pri', run: w => { const d = Math.round(+w.querySelector('[name=d]').value || 0); if (!(d >= 1)) { toast('연장 일수를 1일 이상 입력하세요.', 'warn'); return false; }
      ids.forEach(id => { const e = c.enr[id]; if (!e) return; const raw = e.end || (c.period.mode === 'days' ? addDays(e.at || today(), +c.period.days) : (c.period.end || c.end)); e.end = addDays(raw && raw > today() ? raw : today(), d); e.ext = (e.ext || 0) + d; e.noRefund = true; });
      logAudit(`${c.name} 수강 기간 ${d}일 연장 (${ids.length}명)`); save(); toast(`${ids.length}명의 종료일을 ${d}일 연장했습니다.`, 'ok'); render(); } }]);
  w.querySelector('[name=d]').addEventListener('input', e => { w.querySelector('.c2pv').innerHTML = tbl(Math.max(0, Math.round(+e.target.value || 0))); }); };
/* 강의(회차) 단위 수강 제외 */
ACT['c2-ex'] = el => { const c = c2Ensure(C(el.dataset.c)); const id = el.dataset.v; const e = c.enr[id]; const ex = new Set(e.ex || []);
  const L = c.kind === 'episode' && Array.isArray(c.sessions) && c.sessions.length ? c.sessions.map(s => ({ id: s.id, title: `${s.n || ''}회차 ${s.date || ''} ${s.title || ''}`.trim() })) : (c.curriculum || []).filter(it => it.type !== 'chapter').map(it => ({ id: it.id, title: `${ITEM[it.type] || it.type} · ${it.title}` }));
  c2ov(`강의 수강 제외 — ${M(id)?.name || ''}`, `<p class="mini">선택한 ${c.kind === 'episode' ? '회차' : '강의'}만 이 수강생이 볼 수 없게 합니다. ${esc(t('cls'))}의 나머지 수강 권한은 유지됩니다.</p>${L.length ? `<div class="chk c2exl">${L.map(x => `<label><input type="checkbox" name="x" value="${esc(x.id)}" ${ex.has(x.id) ? 'checked' : ''}> ${esc(x.title)}</label>`).join('')}</div>` : '<div class="empty">제외할 강의가 없습니다.</div>'}`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { e.ex = [...w.querySelectorAll('[name=x]:checked')].map(x => x.value); logAudit(`${c.name} 강의 수강 제외 — ${M(id)?.name} ${e.ex.length}개`); save(); render(); toast(e.ex.length ? `${e.ex.length}개 강의를 제외했습니다.` : '강의 제외를 해제했습니다.', 'ok'); } }]); };
/* 알림(학습자 수신함 S.inbox) — 운영: 알림톡 · 앱 푸시 */
function c2Notify(id, title, body) { if (!S.inbox || typeof S.inbox !== 'object') S.inbox = {}; (S.inbox[id] = S.inbox[id] || []).unshift({ id: uid('ib'), at: nowStr(), title, body, read: false }); /* 운영: 알림톡 발송 API */ }
/* 수강생 탭 메시지(본인 · 보호자) */
ACT['c2-msg'] = el => { const c = C(el.dataset.v); const ids = c2Sel(); if (!ids.length) { toast('메시지를 받을 수강생을 선택하세요.', 'warn'); return; }
  if (typeof window.msgCompose === 'function') { window.msgCompose({ toIds: ids, cls: c.id }); return; }
  const par = id => (S.parents || []).filter(p => p.child === id && /연결 완료/.test(p.status || '')).length; const pn = ids.reduce((a, id) => a + par(id), 0);
  c2ov(`메시지 발송 — ${ids.length}명`, `<label class="fl">제목<input name="t" maxlength="60" value="[${esc(c.name)}] 안내"></label><label class="fl">내용<textarea name="b" rows="5" maxlength="1000" placeholder="클래스 안내, 수강 독려 등"></textarea></label>${c2Priv() ? '' : `<label class="ckl"><input type="checkbox" name="p"> 보호자에게도 보내기(연결된 보호자 ${pn}명, 미연결 수강생은 본인에게만)</label>`}`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '보내기', kind: 'pri', run: w => { const tt = w.querySelector('[name=t]').value.trim(), bd = w.querySelector('[name=b]').value.trim(); if (!tt || !bd) { toast('제목과 내용을 입력하세요.', 'warn'); return false; } const P = !!(w.querySelector('[name=p]') || {}).checked;
      ids.forEach(id => c2Notify(id, tt, bd)); (S.msgs = S.msgs || []).unshift({ id: uid('ms'), at: today(), to: `${c.name} 수강생`, toIds: ids, parents: P, title: tt, body: bd, imgs: [], ch: '알림톡', n: ids.length + (P ? pn : 0) });
      logAudit(`${c.name} 수강생 메시지 ${ids.length}명${P ? ` + 보호자 ${pn}명` : ''}`); save(); toast(`${ids.length + (P ? pn : 0)}명에게 보냈습니다(데모).`, 'ok'); } }]); };
/* 수강생 탭 수료증 발행 */
ACT['c2-cert'] = el => { const c = C(el.dataset.v); const ids = c2Sel(); if (!ids.length) { toast('수료증을 발행할 수강생을 선택하세요.', 'warn'); return; } const has = id => (S.certs || []).some(x => x.cls === c.id && x.who === id); const notDone = ids.filter(id => !has(id) && !clsDone(c, id)); const nw = ids.filter(id => !has(id) && clsDone(c, id)); /* v36 R1 이수 기준을 채우지 않은 사람에게는 발행하지 않는다 */
  c2ov('수료증 발행', `<p>${nw.length}명에게 수료증을 발행합니다.${ids.length - nw.length ? ` (이미 발급 ${ids.length - nw.length}명 제외)` : ''}</p>${notDone.length ? `<div class="warn">${esc(t('done'))} 기준을 채우지 않은 ${notDone.length}명은 빼고 발행합니다.</div>` : ''}`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '발행', kind: 'pri', run: () => { if (!nw.length) { toast(`발행할 사람이 없습니다. ${t('done')} 기준을 채운 사람만 발행합니다.`, 'warn'); return; } S.certs = S.certs || []; let n = S.certs.filter(x => (x.no || '').startsWith(today().slice(0, 4))).length; nw.forEach(id => { n++; S.certs.unshift({ id: uid('ct'), cls: c.id, who: id, at: today(), no: `${today().slice(0, 4)}-${String(n).padStart(4, '0')}`, dl: false, manual: true }); c2Notify(id, `${c.name} 수료증이 발급되었습니다`, '마이페이지에서 내려받을 수 있습니다.'); }); logAudit(`${c.name} 수료증 발행 ${nw.length}명`); save(); render(); toast(`${nw.length}명에게 발행했습니다.`, 'ok'); } }]); };
/* 수강현황 CSV — 신청일 · 종료일 · 경로 포함 */
ACT['cls-dl'] = el => { const c = c2Ensure(C(el.dataset.v)); const pv = c2Priv(); downloadCSV(`${c.name}_수강현황.csv`, [pv ? '학번' : '이름', t('group'), '신청일', '수강 종료일', '경로', '진도', '시험', '과제', t('done'), '수료증', '강의 제외 수'], c.learners.map(id => { const p = c.prog[id] || {}; const e = c.enr[id] || {}; const ct = (S.certs || []).find(x => x.cls === c.id && x.who === id); return [M(id)?.name, c2TName(M(id)?.team || M(id)?.group), e.at || '', c2EndOf(c, id), C2SRC[e.src] || '', p.p, p.exam ?? '', p.assign, clsDone(c, id) ? 'Y' : 'N', ct ? (ct.dl ? '다운로드' : '발급') : '', (e.ex || []).length]; })); };

/* 설정 탭 */
function c2Settings(c) {
  const per = c.kind === 'period' || c.kind === 'pack', sub = c.kind === 'sub', P = c.period, D = c.discount, R = c.recruit;
  const adm = (S.admins || []).filter(a => a.role !== 'owner');
  return `<div class="c2set">
  <div class="card"><div class="ch"><b>기본 정보</b></div><div class="form2">
    <label>${esc(t('cls'))}명 <small class="mini">최대 50자</small><input name="name" maxlength="50" value="${esc(c.name)}"></label>
    <label>카테고리<select name="cat">${c2CatOpts(c.cat)}</select></label>
    <label>운영 상태<select name="status">${['준비중', '운영중', '종료'].map(v => `<option ${c.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>판매 상태<select name="sale">${C2SALE.map(v => `<option ${c.sale === v ? 'selected' : ''} ${c.sale === '판매 종료' && v !== '판매 종료' && sub ? 'disabled' : ''}>${v}</option>`).join('')}</select></label>
    <label>교육 시간(시간)<input name="hours" type="number" min="0" value="${esc(c.hours || 0)}"></label>
    <label>수료증 발급<select name="cert" ${sub ? 'disabled' : ''}><option value="auto" ${c.cert === 'auto' ? 'selected' : ''}>자동(수료 기준 충족 시)</option><option value="manual" ${c.cert === 'manual' ? 'selected' : ''}>수동</option></select></label></div>
    <p class="mini">판매중: 신청 · 결제 가능 · 판매 중지: 목록에는 보이나 신청 불가 · 판매 종료: 신규 신청${sub ? '과 기존 정기결제 모두 중단(되돌릴 수 없음, 다시 팔려면 복사)' : ' 중단'}.</p>
    <button class="btn sm pri" data-act="c2-save" data-v="${c.id}" data-sec="basic">저장</button></div>
  ${per ? `<div class="card"><div class="ch"><b>수강 기간</b><small>${esc(c2Period(c))}</small></div>
    <div class="seg"><button type="button" class="${P.mode === 'days' ? 'on' : ''}" data-act="c2-pmode" data-v="days">수강 시작 후 N일</button><button type="button" class="${P.mode === 'range' ? 'on' : ''}" data-act="c2-pmode" data-v="range">날짜 지정</button></div>
    <div class="c2pf" data-mode="${P.mode}">${P.mode === 'days' ? `<div class="c2inl">${[30, 60, 90].map(n => `<button type="button" class="btn sm ${+P.days === n ? 'on' : ''}" data-c2days="${n}">${n}일</button>`).join('')}<input name="days" type="number" min="1" max="3650" value="${esc(P.days)}" aria-label="수강 일수">일 (직접 입력)</div><p class="mini">수강 신청한 날부터 N일 동안 수강합니다.</p>` : `<div class="c2inl"><input name="pstart" type="date" value="${esc(P.start || c.start)}" aria-label="수강 시작일"> ~ <input name="pend" type="date" value="${esc(P.end || c.end)}" aria-label="수강 종료일"></div><p class="mini">수강 신청일과 관계없이 지정한 기간에만 수강합니다. 이 종료일이 개별 종료일보다 우선합니다.</p>`}</div>
    <button class="btn sm pri" data-act="c2-save" data-v="${c.id}" data-sec="period">저장</button></div>` : ''}
  <div class="card"><div class="ch"><b>교육 목표 · 주요 내용</b><small>텍스트 · 이미지 · 표 · HTML 소스</small></div>${c2Rte(c.id, c.goalHtml || (c.goal ? esc(c.goal).replace(/\n/g, '<br>') : ''))}<button class="btn sm pri" data-act="c2-save" data-v="${c.id}" data-sec="goal">저장</button></div>
  <div class="card"><div class="ch"><b>썸네일</b></div>${window.THUMB ? THUMB.slot(c) : `<div class="c2thw">${c2ThumbImg(c.thumb, 'lg')}<div><button class="btn sm" data-act="c2-thup" data-t="${c.id}">이미지 업로드</button> ${c.thumb ? `<button class="btn sm ghost" data-act="c2-thclear" data-t="${c.id}">삭제</button>` : ''}<p class="mini">또는 기본 이미지를 고르세요. ✦ 표시는 AI SAM 추천입니다.</p><div class="c2gal">${C2THUMB.map((x, i) => `<button type="button" class="${c2ThumbRec(c.name).slice(0, 2).includes(i) ? 'rec' : ''}" data-act="c2-thpick" data-t="${c.id}" data-v="${i}" title="${esc(x[2])}"><img src="${c2ThumbSvg(i, x[2])}" alt="${esc(x[2])} 기본 이미지"></button>`).join('')}</div></div></div>`}</div>
  <div class="card"><div class="ch"><b>담당 ${esc(t('teacher'))}</b><small>${esc(t('teacher'))} 계정은 담당 ${esc(t('cls'))}만 관리합니다</small></div>${adm.length ? `<div class="chk">${adm.map(a => `<label><input type="checkbox" name="tch" value="${a.id}" ${c.teachers.includes(a.id) ? 'checked' : ''}> ${esc(a.name)} <small class="mini">${esc(roleName(a.role))}</small></label>`).join('')}</div><button class="btn sm pri" data-act="c2-save" data-v="${c.id}" data-sec="teachers">저장</button>` : `<p class="mini">운영자를 추가하면 담당으로 지정할 수 있습니다. <a href="#" data-act="go" data-v="admins">운영자 · 권한</a></p>`}
    <div class="ch c2mt"><b>강사 소개</b><button class="btn sm" data-act="c2-intro" data-t="${c.id}">+ 강사 추가</button></div>${c2IntroList(c.intro, c.id)}</div>
  <div class="card"><div class="ch"><b>${esc(t('fee'))} · 할인 · 정원 · 신청 기간</b><small>${c2PriceHtml(c)}</small></div>
    <div class="form2"><label>${esc(t('fee'))}(원, 0이면 무료)<input name="price" type="number" min="0" step="1000" value="${esc(c.price)}"></label><span></span></div>
    <div class="c2box"><label class="ckl"><input type="checkbox" name="don" ${D.on ? 'checked' : ''}> 수강료 할인 적용</label><div class="c2inl"><select name="dt" aria-label="할인 방식"><option value="rate" ${D.type === 'rate' ? 'selected' : ''}>할인율(%)</option><option value="amount" ${D.type === 'amount' ? 'selected' : ''}>할인 금액(원)</option></select><input name="dv" type="number" min="0" value="${esc(D.v)}" aria-label="할인 값"><span class="mini">할인 종료일(선택)</span><input name="du" type="date" value="${esc(D.until)}" aria-label="할인 종료일"></div></div>
    <div class="c2box"><label class="ckl"><input type="checkbox" name="ron" ${R.on ? 'checked' : ''}> 신청 기간 정하기(사전 수강신청 · 모집 기간)</label><span class="mini"> 정원(모집 인원)은 이 칸을 켜지 않아도 지킵니다.</span>
      <div class="c2inl"><span class="mini">모집 인원</span><input name="rc" type="number" min="0" value="${esc(R.cap)}" aria-label="모집 인원"><span class="mini">명(0 = 제한 없음) · 현재 ${c.learners.length}명 · 모집 기간</span><input name="rf" type="date" value="${esc(R.from)}" aria-label="모집 시작일"> ~ <input name="rt" type="date" value="${esc(R.to)}" aria-label="모집 종료일"></div>
      <div class="c2inl"><label class="ckl"><input type="checkbox" name="eon" ${R.early.on ? 'checked' : ''}> 신청 인원 할인(얼리버드)</label><input name="er" type="number" min="1" max="99" value="${esc(R.early.rate)}" aria-label="얼리버드 할인율">%<span class="mini">까지</span><input name="eu" type="date" value="${esc(R.early.until)}" aria-label="얼리버드 종료일"></div>
      ${R.on && R.cap && c.learners.length >= R.cap ? '<p class="mini">모집 정원이 찼습니다. 학습자 화면의 신청 버튼이 마감으로 바뀝니다.</p>' : ''}</div>
    <button class="btn sm pri" data-act="c2-save" data-v="${c.id}" data-sec="sale">저장</button>${c.price ? ` <button class="btn sm ghost" data-act="c2-paylink" data-v="${c.id}">결제 링크 복사</button>` : ''}</div>
  <div class="card"><div class="ch"><b>공개 대상 · 커뮤니티</b></div><div class="form2">
    <label>공개 대상<select name="open">${['전체', '지정 회원', '비공개'].map(v => `<option ${c.open === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>커뮤니티 입장 권한<select name="community"><option value="class" ${c.community !== 'all' ? 'selected' : ''}>클래스 수강생만 입장</option><option value="all" ${c.community === 'all' ? 'selected' : ''}>전체 회원</option></select></label></div>
    ${c.open === '지정 회원' ? `<div class="c2box"><b>지정 회원 ${c.openTo.length}</b> <button class="btn sm" data-act="c2-opento" data-v="${c.id}">+ 추가</button><p class="mini">지정한 회원(팀)만 이 ${esc(tj('cls', '을'))} 수강하고 목록에서 볼 수 있습니다.</p><div class="c2chips">${c.openTo.map(id => `<span class="c2chip">${esc(c2TargetLabel(id))}<button type="button" data-act="c2-opendel" data-c="${c.id}" data-v="${esc(id)}" aria-label="삭제">✕</button></span>`).join('') || '<span class="mini">아직 지정한 대상이 없습니다.</span>'}</div></div>` : c.open === '비공개' ? '<p class="mini">비공개: 운영자 외에는 이 클래스를 조회할 수 없습니다.</p>' : ''}
    <p class="mini">동영상 건너뛰기 · 배속 규칙은 아래 '동영상 재생 규칙'에서 정합니다.</p>
    <button class="btn sm pri" data-act="c2-save" data-v="${c.id}" data-sec="open">저장</button></div>
  ${c.kind === 'pack' ? `<div class="card"><div class="ch"><b>과정 구성</b><small>원본 ${esc(tj('cls', '과'))} 분리 저장</small></div>${(c.packOf || []).map(id => `<div class="row"><span>${esc(C(id)?.name || '(삭제된 클래스)')}</span><small class="mini">${(c.curriculum || []).filter(i => i.srcCls === id && i.type !== 'chapter').length}개 항목 복사됨</small></div>`).join('') || '<p class="mini">포함된 클래스가 없습니다.</p>'}<button class="btn sm" data-act="c2-packadd" data-v="${c.id}">+ ${esc(t('cls'))} 더 불러오기</button> <button class="btn sm" data-act="c2-packev" data-v="${c.id}">+ 과정 전용 평가</button></div>` : ''}
  </div><div class="form2 c2tail"><div class="danger"><button class="btn sm red" data-act="cls-del" data-v="${c.id}">${esc(t('cls'))} 삭제</button><small>수강생이나 구독자가 있으면 삭제할 수 없습니다.</small></div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-c2days]'); if (!b) return; e.preventDefault(); const i = b.closest('.card').querySelector('[name=days]'); if (i) i.value = b.dataset.c2days; b.parentNode.querySelectorAll('[data-c2days]').forEach(x => x.classList.toggle('on', x === b)); });
ACT['c2-pmode'] = el => { const c = C(UI.cls); const card = el.closest('.card'); const pf = card.querySelector('.c2pf'); const m = el.dataset.v; card.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === el)); pf.dataset.mode = m;
  pf.innerHTML = m === 'days' ? `<div class="c2inl">${[30, 60, 90].map(n => `<button type="button" class="btn sm ${+c.period.days === n ? 'on' : ''}" data-c2days="${n}">${n}일</button>`).join('')}<input name="days" type="number" min="1" max="3650" value="${esc(c.period.days || 90)}" aria-label="수강 일수">일 (직접 입력)</div>` : `<div class="c2inl"><input name="pstart" type="date" value="${esc(c.period.start || c.start)}" aria-label="수강 시작일"> ~ <input name="pend" type="date" value="${esc(c.period.end || c.end)}" aria-label="수강 종료일"></div>`; };
ACT['c2-save'] = el => { const c = c2Ensure(C(el.dataset.v)); const card = el.closest('.card'); const g = n => { const x = card.querySelector(`[name="${n}"]`); return !x ? undefined : x.type === 'checkbox' ? x.checked : x.value; }; const sec = el.dataset.sec;
  const done = (msg) => { logAudit(`${c.name} 설정 변경 — ${msg}`); save(); render(); toast('저장했습니다.', 'ok'); };
  if (sec === 'basic') { const nm = String(g('name') || '').trim().slice(0, 50); if (!nm) { toast(`${t('cls')}명을 입력하세요.`, 'warn'); return; } const sale = g('sale');
    const apply = () => { c.name = nm; c.cat = g('cat') || ''; c.status = g('status'); c.hours = Math.max(0, +g('hours') || 0); if (g('cert') !== undefined && c.kind !== 'sub') c.cert = g('cert'); c.sale = sale; done('기본 정보'); };
    if (sale === '판매 종료' && c.sale !== '판매 종료') { c2ov('판매 종료', `<p>${esc(c.name)}의 판매를 종료합니다. 신규 수강 신청${c.kind === 'sub' ? '과 기존 수강생의 정기결제가 모두 중단되며 <b>되돌릴 수 없습니다</b>. 다시 판매하려면 클래스를 복사해 새로 만드세요' : '이 중단됩니다'}.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '판매 종료', kind: 'red', run: () => { if (c.kind === 'sub') (S.subs || []).filter(x => x.cls === c.id && x.status === '구독중').forEach(x => x.status = '해지 예약'); apply(); } }]); return; }
    apply(); return; }
  if (sec === 'period') { const m = card.querySelector('.c2pf').dataset.mode; let np;
    if (m === 'days') { const d = Math.round(+g('days') || 0); if (!(d >= 1 && d <= 3650)) { toast('수강 일수는 1~3650일로 입력하세요.', 'warn'); return; } np = { mode: 'days', days: d, start: '', end: '' }; }
    else { const s0 = g('pstart'), e0 = g('pend'); if (!s0 || !e0 || e0 < s0) { toast('수강 시작일과 종료일을 확인하세요(종료일 ≥ 시작일).', 'warn'); return; } if (c.recruit.on && c.recruit.to && c.recruit.to > e0) { toast(`모집 종료일(${c.recruit.to})이 수강 종료일보다 늦습니다. 모집 기간을 먼저 고치세요.`, 'warn'); return; } np = { mode: 'range', days: c.period.days || 90, start: s0, end: e0 }; }
    const apply = () => { c.period = np; if (np.mode === 'range') { c.start = np.start; c.end = np.end; } done(`수강 기간 ${c2Period(c)}`); };
    if (c.learners.length) { c2ov('수강 기간 변경', `<p>${esc(t('cls'))} 수강 기간을 <b>${esc(np.mode === 'days' ? `수강 시작 후 ${np.days}일` : `${np.start} ~ ${np.end}`)}</b>(으)로 바꿉니다.</p><div class="warn">기존 수강생 ${c.learners.length}명의 개별 종료일(연장분)은 자동으로 바뀌지 않습니다. 특정 기간 ${esc(tj('cls', '은'))} ${esc(t('cls'))} 종료일이 개별 종료일보다 우선합니다.</div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '변경', kind: 'pri', run: apply }]); return; }
    apply(); return; }
  if (sec === 'goal') { const h = c2RteVal(card.querySelector('.c2rte')); c.goalHtml = h; c.goal = c2Text(h); c.desc = c.goal.slice(0, 400); done('교육 목표'); return; }
  if (sec === 'teachers') { c2SetTeachers(c, [...card.querySelectorAll('[name=tch]:checked')].map(x => x.value)); done('담당 강사'); return; }
  if (sec === 'sale') { const price = Math.max(0, Math.round(+g('price') || 0)); if (c.kind === 'sub' && !price) { toast('구독 클래스는 유료로만 판매할 수 있습니다.', 'warn'); return; }
    const disc = { on: g('don'), type: g('dt'), v: Math.max(0, +g('dv') || 0), until: g('du') }; const rec = { on: g('ron'), cap: Math.max(0, Math.round(+g('rc') || 0)), from: g('rf'), to: g('rt'), early: { on: g('eon'), rate: clamp(Math.round(+g('er') || 0), 0, 99), until: g('eu') } };
    const err = c2CheckSale(price, disc, rec, c.period.mode === 'range' ? c.period.end : ''); if (err) { toast(err, 'warn'); return; }
    if (rec.on && rec.cap && rec.cap < c.learners.length) toast(`현재 수강 인원(${c.learners.length}명)이 모집 인원보다 많습니다.`, 'warn');
    c.price = price; c.discount = disc; c.recruit = rec; c.early = !!rec.on; done('수강료 · 할인 · 모집'); return; }
  if (sec === 'open') { c.open = g('open'); c.community = g('community');
    if (c.open === '지정 회원' && !c.openTo.length) toast('지정 회원을 [+ 추가]로 골라 주세요. 지정 전에는 아무도 볼 수 없습니다.', 'warn'); done('공개 대상 · 커뮤니티'); return; }
};
ACT['c2-opento'] = el => { const c = C(el.dataset.v); pickTargets('지정 회원 추가', c.openTo, ids => { c.openTo = ids; logAudit(`${c.name} 지정 회원 ${ids.length}개 대상`); save(); render(); toast('지정 회원을 저장했습니다.', 'ok'); }); };
ACT['c2-opendel'] = el => { const c = C(el.dataset.c); c.openTo = c.openTo.filter(x => x !== el.dataset.v); save(); render(); };
ACT['c2-packadd'] = el => { const c = C(el.dataset.v); const src = S.classes.filter(x => x.id !== c.id && ['period', 'pack'].includes(x.kind));
  c2ov('과정에 클래스 불러오기', src.length ? `<p class="mini">선택한 클래스의 커리큘럼을 복사해 이 과정 끝에 붙입니다. 원본에는 영향이 없습니다.</p><div class="chk">${src.map(x => `<label><input type="checkbox" name="k" value="${x.id}"> ${esc(x.name)}</label>`).join('')}</div>` : '<div class="empty">불러올 클래스가 없습니다.</div>',
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '불러오기', kind: 'pri', run: w => { const ids = [...w.querySelectorAll('[name=k]:checked')].map(x => x.value); ids.forEach(id => { const s0 = C(id); c.curriculum.push({ id: uid('it'), type: 'chapter', title: s0.name, srcCls: id, packHead: true }); JSON.parse(JSON.stringify(s0.curriculum || [])).forEach(it => { it.id = uid('it'); it.srcCls = id; delete it.week; c.curriculum.push(it); }); }); c.packOf = [...new Set([...(c.packOf || []), ...ids])]; logAudit(`${c.name} 과정 구성 추가 ${ids.length}개`); save(); render(); } }]); };
ACT['c2-packev'] = el => { const c = C(el.dataset.v); c2ov('과정 전용 평가 추가', `<label class="fl">종류<select name="t"><option value="exam">시험</option><option value="assign">과제</option><option value="survey">설문</option></select></label><label class="fl">제목<input name="n" maxlength="80"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { const n = w.querySelector('[name=n]').value.trim(); if (!n) { toast('제목을 입력하세요.', 'warn'); return false; } c.curriculum.push({ id: uid('it'), type: w.querySelector('[name=t]').value, title: n, packEval: true }); save(); toast('커리큘럼 탭에서 내용을 편집하세요.', 'ok'); } }]); };
/* 복사: 새 필드 정리(수강생 · 개별 종료일 비움, 판매중으로) */
{ const base = ACT['cls-copy']; ACT['cls-copy'] = el => { base(el); const n = S.classes[S.classes.length - 1]; if (n) { n.enr = {}; n.sale = '판매중'; n.openTo = []; if (n.recruit) n.recruit.on = false; c2SetTeachers(n, n.teachers || []); save(); } }; }
/* 설정 탭의 예전 data-chg 'cls-set' 호환(다른 모듈이 쓰는 경우) */
{ const base = ACT['cls-set']; ACT['cls-set'] = el => { base(el); const c = C(el.dataset.c); if (c && el.dataset.k === 'early') { c2Ensure(c); c.recruit.on = !!c.early; save(); } }; }
/* 강사 화면: 담당 클래스 목록만 */

/* ═════════ ⑥ 현황(대시보드) ═════════ */
const C2LIM = { standard: { learners: 100, gb: 10, msg: 500 }, premium: { learners: 1000, gb: 100, msg: 5000 }, enterprise: { learners: 0, gb: 0, msg: 0 } };
const c2Hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); };
/* 방문 기록: 운영은 접속 로그 집계. 데모는 회원의 가입일 ~ 마지막 접속일로 추정(같은 입력이면 같은 결과) */
function c2Visits(days) { const out = []; const end = today(); (S.members || []).forEach(m => { if (!m.last) return; for (let i = 0; i < days; i++) { const d = addDays(end, -i); if (d < (m.joined || d) || d > m.last) continue; const h = c2Hash(m.id + d); if (d === m.last || h % 100 < 30) out.push({ m: m.id, d, hr: [9, 10, 11, 13, 14, 15, 19, 20, 21, 22][h % 10], dow: new Date(d).getDay(), pv: 2 + (h >> 4) % 5 }); } }); return out; }
function c2Bars(rows, unit = '', tone = '') { const mx = Math.max(1, ...rows.map(r => r[1])); return `<div class="c2bars">${rows.map(([l, v]) => `<div class="c2b"><i style="height:${Math.round(v / mx * 100)}%" class="${tone}"></i><b>${num(v)}${unit}</b><small>${esc(l)}</small></div>`).join('')}</div>`; }
function c2Rev() { const M0 = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); M0.push(ymdL(d).slice(0, 7)); }
  const v = M0.map(m => (S.pays || []).filter(p => String(p.at || '').startsWith(m)).reduce((a, p) => a + (/결제 완료|환불 신청/.test(p.status) ? +p.amount || 0 : p.status === '부분 환불' ? (+p.amount || 0) - (+(p.refund || {}).amount || 0) : 0), 0) + (S.bills || []).filter(b => String(b.payAt || b.due || '').startsWith(m) && /납부 완료|현장 납부/.test(b.status || '')).reduce((a, b) => a + (b.items || []).reduce((x, i) => x + (+i[1] || 0), 0), 0));
  return M0.map((m, i) => [m.slice(5) + '월', v[i]]); }
function c2Sched() { const tch = S.me.role === 'teacher' && typeof tMe === 'function' && tMe() ? (tMe().classes || []) : null; const lim = addDays(today(), 30), L = [];
  S.classes.filter(c => c.status !== '종료' && (!tch || tch.includes(c.id))).forEach(c => { c2Ensure(c); const P = (d, what, kind) => { if (d && d >= today() && d <= lim) L.push({ d, c, what, kind }); };
    if (c.period.mode === 'range') { P(c.period.start, '수강 시작', '수강'); P(c.period.end, '수강 종료', '수강'); }
    if (c.recruit.on) { P(c.recruit.from, '수강신청 시작', '수강신청'); P(c.recruit.to, '수강신청 마감', '수강신청'); }
    (c.curriculum || []).forEach(it => { const r = it.rules || {}; if (['exam', 'quiz'].includes(it.type)) { P(r.from || it.from, `${it.title} 응시 시작`, '시험'); P(r.to || it.to, `${it.title} 응시 마감`, '시험'); } if (it.type === 'assign') P(r.due || it.due, `${it.title} 제출 마감`, '과제'); if (it.type === 'survey') P(r.to || it.to, `${it.title} 마감`, '설문'); if (['live', 'offline'].includes(it.type)) P(String(it.from || it.at || '').slice(0, 10), it.title, it.type === 'live' ? '라이브' : '오프라인'); });
    (c.sessions || []).forEach(s => P(s.date, `${s.n || ''}회차 ${s.title || ''}`.trim(), '회차')); });
  return L.sort((a, b) => a.d.localeCompare(b.d)); }
function c2Trend(n) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i + 1); d.setDate(0); const me = ymdL(d); const now = Date.now();
  let tot = 0, dn = 0; S.classes.forEach(c => { c2Ensure(c); Object.entries(c.prog || {}).forEach(([id, p]) => { const at = (c.enr[id] || {}).at || c.start; if (!at || at > me) return; const span = Math.max(1, (now - new Date(at)) / 864e5), el = Math.max(0, (new Date(me) - new Date(at)) / 864e5); const est = i === 0 ? p.p : p.p * Math.min(1, el / span); tot++; if (est >= c.criteria.threshold) dn++; }); });
  out.push([me.slice(5, 7) + '월', tot ? Math.round(dn / tot * 100) : 0]); } return out; }
function c2Rank(kind) { return [...S.classes].map(c => { c2Ensure(c); const n = c.learners.length; return { c, n, rate: n ? doneN(c) / n * 100 : 0, rev: (S.pays || []).filter(p => (p.ref === c.id || p.item === c.name) && /결제 완료|부분 환불|환불 신청/.test(p.status)).reduce((a, p) => a + (+p.amount || 0), 0) }; }).sort((a, b) => kind === 'rate' ? b.rate - a.rate : kind === 'rev' ? b.rev - a.rev : b.n - a.n).slice(0, 10); }
function c2Learn() { return (S.members || []).map(m => { const P = S.classes.filter(c => c.prog && c.prog[m.id]); const r = P.map(c => Math.min(100, c.prog[m.id].p / Math.max(1, c.criteria.threshold) * 100)); return { m, n: P.length, avg: r.length ? avgOf(r) : null }; }); }
{ const base = VIEWS.dash; VIEWS.dash = () => { c2EnsureAll(); let h = base(); try { h += c2Dash(); } catch (e) { console.error(e); } return h; }; }
function c2Dash() {
  const own = S.me.role === 'owner'; const lim = C2LIM[S.org.plan] || C2LIM.premium; const nL = (S.members || []).length; const msgN = (S.msgs || []).filter(x => String(x.at || '').slice(0, 7) === today().slice(0, 7)).reduce((a, x) => a + (+x.n || 0), 0);
  const gb = Math.round(((S.lib || []).length * 0.35 + (S.books || []).length * 0.05) * 10) / 10; const useRow = (l, v, mx, u) => `<div class="c2use"><span>${l}</span><b>${num(v)}${u}${mx ? ` / ${num(mx)}${u}` : ' · 무제한'}</b>${mx ? bar(v / mx * 100, v / mx > .9 ? 'r' : '') : ''}</div>`;
  const vis = c2Visits(UI.dVis === 'm' ? 180 : 56); const steps = typeof ONB !== 'undefined' ? (ONB[S.org.type] || ONB.corp || []) : [];
  const per = UI.dVis === 'm' ? 6 : 8; const vl = []; for (let i = per - 1; i >= 0; i--) { if (UI.dVis === 'm') { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const mk = ymdL(d).slice(0, 7); const V = vis.filter(x => x.d.startsWith(mk)); vl.push([mk.slice(5) + '월', new Set(V.map(x => x.m + x.d)).size, V.reduce((a, x) => a + x.pv, 0)]); } else { const s0 = addDays(today(), -7 * i - 6), e0 = addDays(today(), -7 * i); const V = vis.filter(x => x.d >= s0 && x.d <= e0); vl.push([s0.slice(5), new Set(V.map(x => x.m + x.d)).size, V.reduce((a, x) => a + x.pv, 0)]); } }
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0)); c2Visits(28).forEach(x => heat[x.dow][x.hr]++); const hm = Math.max(1, ...heat.flat());
  const tr = c2Trend(UI.dTr === '6' ? 6 : 3); const sch = c2Sched(); const rk = c2Rank(UI.dTop || 'n'); const LR = c2Learn();
  const freq = { '미집계': 0, '주 1회 미만': 0, '주 1~2회': 0, '주 3~4회': 0, '주 5회 이상': 0 }; const V28 = c2Visits(28); (S.members || []).forEach(m => { const dd = new Set(V28.filter(x => x.m === m.id).map(x => x.d)).size; const has = S.classes.some(c => c.prog && c.prog[m.id]); if (!has || daysAgo(m.joined || today()) < 14) freq['미집계']++; else { const w = dd / 4; freq[w < 1 ? '주 1회 미만' : w < 3 ? '주 1~2회' : w < 5 ? '주 3~4회' : '주 5회 이상']++; } });
  const hist = Array(10).fill(0); LR.filter(x => x.avg != null).forEach(x => hist[Math.min(9, Math.floor(x.avg / 10))]++);
  const topL = LR.filter(x => x.n).sort((a, b) => UI.dTopL === 'n' ? b.n - a.n || (b.avg - a.avg) : (b.avg - a.avg) || b.n - a.n).slice(0, 10);
  const jd = +(UI.dJoin || 7), ad = +(UI.dAway || 30); const J = (S.members || []).filter(m => m.joined && daysAgo(m.joined) <= jd).sort((a, b) => String(b.joined).localeCompare(a.joined)); const A = (S.members || []).filter(m => m.last && daysAgo(m.last) >= ad).sort((a, b) => String(a.last).localeCompare(b.last));
  const segb = (key, list, cur) => `<div class="seg c2seg">${list.map(([v, l]) => `<button type="button" class="${String(cur) === String(v) ? 'on' : ''}" data-act="c2-dseg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const mlist = (L, f) => L.length ? L.slice(0, 8).map(m => `<div class="row"><a href="#" data-act="mem-open" data-v="${m.id}">${esc(c2MLabel(m))}</a><small class="mini">${f(m)}</small></div>`).join('') + (L.length > 8 ? `<p class="mini">외 ${L.length - 8}명</p>` : '') : '<div class="empty">해당 회원이 없습니다.</div>';
  const demo = `<small class="mini">${typeof LIVE === 'undefined' ? '데모: 접속 기록 기반 추정' : '접속 로그 집계'}</small>`;
  return `<h3 class="c2h">운영 지표 <small class="mini">요금제 · 수익 · 방문 · 일정 · 순위</small></h3>
  <section class="grid g3 c2dash">
    <div class="card"><div class="ch"><b>요금제</b><small>${esc({ standard: '스탠다드', premium: '프리미엄', enterprise: '엔터프라이즈' }[S.org.plan] || S.org.plan || '')}</small></div>${useRow('회원 수', nL, lim.learners, '명')}${useRow('저장 공간', gb, lim.gb, 'GB')}${useRow('이번 달 메시지', typeof cmMonthUsed === 'function' ? cmMonthUsed() : msgN, typeof cmLimit === 'function' ? cmLimit() : lim.msg, '건')}${own ? `<button class="btn sm" data-act="go" data-v="plan">요금제 보기 · 업그레이드</button>` : ''}</div>
    <div class="card"><div class="ch"><b>수익 현황</b><small>월별 매출(결제 + 청구서)</small></div>${own ? (menuOn('sales') || S.pays.length ? c2Bars(c2Rev().map(([l, v]) => [l, Math.round(v / 10000)]), '만') : '<div class="empty">판매 · 청구 기록이 없습니다.</div>') : '<div class="empty">매출 정보는 정운영자만 볼 수 있습니다.</div>'}</div>
    <div class="card"><div class="ch"><b>많이 방문한 요일과 시간</b>${demo}</div><div class="c2heat" role="img" aria-label="요일별 시간대 방문 히트맵">${['일', '월', '화', '수', '목', '금', '토'].map((d, i) => `<span class="c2hl">${d}</span>${heat[i].map((v, hr) => `<i style="opacity:${v ? (.15 + v / hm * .85).toFixed(2) : .05}" title="${d} ${hr}시 ${v}회"></i>`).join('')}`).join('')}</div><small class="mini">0시 → 23시</small></div>
  </section>
  <section class="g2c c2dash">
    <div class="card"><div class="ch"><b>방문자 · 페이지뷰</b>${segb('dVis', [['w', '주간'], ['m', '월간']], UI.dVis || 'w')}</div>${typeof lineChart === 'function' ? lineChart(vl.map(x => x[0]), [{ n: '방문자', c: '#4C77C5', v: vl.map(x => x[1]) }, { n: '페이지뷰', c: '#5C74F6', v: vl.map(x => x[2]) }]) : ''}${demo}</div>
    <div class="card"><div class="ch"><b>평균 ${esc(t('done'))}율 추이</b>${segb('dTr', [['3', '3개월'], ['6', '6개월']], UI.dTr || '3')}</div>${c2Bars(tr, '%', 'g')}</div>
  </section>
  <section class="grid g3 c2dash">
    <div class="card"><div class="ch"><b>${esc(t('cls'))} 일정</b><small>${S.me.role === 'teacher' ? '담당 ' + esc(t('cls')) + '만 · ' : ''}30일 이내</small></div>${sch.length ? sch.slice(0, 10).map(x => `<div class="row"><span>${tag(x.kind)} <a href="#" data-act="cls-open" data-v="${x.c.id}">${esc(x.c.name)}</a> · ${esc(x.what)}</span><small class="mini">${esc(x.d.slice(5))} ${c2Dday(x.d)}</small></div>`).join('') : '<div class="empty">다가오는 시험 · 과제 · 수강신청 일정이 없습니다.</div>'}</div>
    <div class="card"><div class="ch"><b>Top 10 ${esc(t('cls'))}</b><select data-chg="c2-dtop" aria-label="Top 10 기준"><option value="n" ${(UI.dTop || 'n') === 'n' ? 'selected' : ''}>수강생 수</option><option value="rate" ${UI.dTop === 'rate' ? 'selected' : ''}>수료율</option>${own ? `<option value="rev" ${UI.dTop === 'rev' ? 'selected' : ''}>매출액</option>` : ''}</select></div>${rk.length ? rk.map((x, i) => `<div class="row"><span><b class="rk">${i + 1}</b><a href="#" data-act="cls-open" data-v="${x.c.id}">${esc(x.c.name)}</a></span><small class="mini">${UI.dTop === 'rate' ? pct(x.rate) : UI.dTop === 'rev' ? won(x.rev) : x.n + '명'}</small></div>`).join('') : '<div class="empty">클래스가 없습니다.</div>'}</div>
    <div class="card"><div class="ch"><b>Top 10 ${esc(t('learner'))}</b><select data-chg="c2-dtopl" aria-label="Top 10 수강생 기준"><option value="avg" ${UI.dTopL !== 'n' ? 'selected' : ''}>평균 수료율</option><option value="n" ${UI.dTopL === 'n' ? 'selected' : ''}>수강 클래스 수</option></select></div>${topL.length ? topL.map((x, i) => `<div class="row"><span><b class="rk">${i + 1}</b><a href="#" data-act="mem-open" data-v="${x.m.id}">${esc(c2MLabel(x.m))}</a></span><small class="mini">${UI.dTopL === 'n' ? x.n + '개' : pct(x.avg)}</small></div>`).join('') : '<div class="empty">수강 기록이 없습니다.</div>'}</div>
  </section>
  <section class="g2c c2dash">
    <div class="card"><div class="ch"><b>학습 빈도</b><small>최근 4주 · 기록이 부족하면 미집계</small></div>${c2Bars(Object.entries(freq), '명')}</div>
    <div class="card"><div class="ch"><b>${esc(t('learner'))}별 평균 ${esc(t('done'))}율 분포</b><small>수강 중인 ${esc(t('learner'))} ${LR.filter(x => x.avg != null).length}명</small></div>${c2Bars(hist.map((v, i) => [`${i * 10}~${i * 10 + 10}`, v]), '')}</div>
  </section>
  <section class="g2c c2dash">
    <div class="card"><div class="ch"><b>최근 가입 회원</b>${segb('dJoin', [[7, '7일'], [14, '14일'], [30, '30일']], jd)}</div><p class="mini">${J.length}명</p>${mlist(J, m => esc(m.joined))}</div>
    <div class="card"><div class="ch"><b>장기 미접속 회원</b>${segb('dAway', [[30, '30일'], [60, '60일'], [90, '90일']], ad)}</div><p class="mini">${A.length}명 ${A.length ? `<button class="btn sm" data-act="c2-awaymsg" data-v="${ad}">독려 메시지 보내기</button>` : ''}</p>${mlist(A, m => '마지막 접속 ' + esc(m.last))}</div>
  </section>
  ${steps.length ? `<section class="card c2dash"><div class="ch"><b>온보딩 현황</b><small>${steps.filter(s => typeof onbDone === 'function' && onbDone(s[0])).length}/${steps.length} 완료</small></div><ol class="onb">${steps.map(([id, l, d], i) => { const ok = typeof onbDone === 'function' && onbDone(id); return `<li class="${ok ? 'ok' : ''}"><span>${ok ? '✓' : i + 1}</span><div><b>${esc(l)}</b><small>${esc(d)}</small></div><button class="btn sm ghost" data-act="go" data-v="${id}" ${menuOn(id) ? '' : 'disabled'}>열기</button></li>`; }).join('')}</ol></section>` : ''}
  <div class="bar2"><button class="btn" data-act="c2-dxls">운영 현황 엑셀 내려받기(클래스 · 수강생)</button></div>`;
}
ACT['c2-dseg'] = el => { UI[el.dataset.k] = el.dataset.v; render(); };
ACT['c2-dtop'] = el => { UI.dTop = el.value; render(); };
ACT['c2-dtopl'] = el => { UI.dTopL = el.value; render(); };
ACT['c2-awaymsg'] = el => { const d = +el.dataset.v; const L = S.members.filter(m => m.last && daysAgo(m.last) >= d); if (typeof menuOn === 'function' && menuOn('message') && ACT['msg-to'] && typeof cmCommSnap === 'function') { UI.msgTo = 'mem:' + L.map(m => m.id).join(','); go('message'); toast(`장기 미접속 ${L.length}명을 받는 사람으로 넣었습니다.`, 'ok'); return; } c2ov(`장기 미접속 ${L.length}명 독려`, `<label class="fl">제목<input name="t" maxlength="60" value="오랜만이에요! 학습을 이어가 보세요"></label><label class="fl">내용<textarea name="b" rows="4" maxlength="1000">${esc(S.org.name)}에서 기다리고 있습니다. 수강 중인 ${esc(tj('cls', '을'))} 이어서 학습해 보세요.</textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '보내기', kind: 'pri', run: w => { const tt = w.querySelector('[name=t]').value.trim(), bd = w.querySelector('[name=b]').value.trim(); if (!tt || !bd) return false; L.forEach(m => c2Notify(m.id, tt, bd)); (S.msgs = S.msgs || []).unshift({ id: uid('ms'), at: today(), to: `${d}일 이상 미접속`, toIds: L.map(m => m.id), parents: false, title: tt, body: bd, imgs: [], ch: '알림톡', n: L.length }); logAudit(`장기 미접속(${d}일) 독려 ${L.length}명`); save(); toast(`${L.length}명에게 보냈습니다(데모).`, 'ok'); } }]); };
ACT['c2-dxls'] = () => { c2EnsureAll(); const pv = c2Priv();
  downloadCSV(`클래스운영현황_${today()}.csv`, [t('cls'), '유형', '카테고리', '운영 상태', '판매 상태', '수강 기간', '수강료', '판매가', '수강 인원', '평균 진도(%)', t('done') + ' 인원', t('done') + '율(%)', '매출(원)'], S.classes.map(c => { const r = c2Rank('n').find(x => x.c === c) || { rev: (S.pays || []).filter(p => p.item === c.name && /결제 완료/.test(p.status)).reduce((a, p) => a + p.amount, 0) }; return [c.name, KIND[c.kind], c2CatName(c.cat), c.status, c.sale, c2Period(c), c.price, c2NetPrice(c), c.learners.length, Math.round(avgP(c)), doneN(c), c.learners.length ? Math.round(doneN(c) / c.learners.length * 100) : 0, r.rev || 0]; }));
  setTimeout(() => downloadCSV(`수강생활동현황_${today()}.csv`, [pv ? '학번' : '이름', t('group'), '가입일', '마지막 접속', '수강 클래스 수', '평균 ' + t('done') + '율(%)', t('done') + ' 클래스 수'], c2Learn().map(x => [x.m.name, c2TName(x.m.team || x.m.group), x.m.joined || '', x.m.last || '', x.n, x.avg == null ? '미집계' : Math.round(x.avg), S.classes.filter(c => (c.learners || []).includes(x.m.id) && clsDone(c, x.m.id)).length])), 400);
  logAudit('운영 현황 내려받기(클래스 · 수강생)'); toast('클래스 운영 현황 · 수강생 활동 현황 2개 파일을 내려받습니다.', 'ok'); };
/* 홈 '오늘의 할 일': 매출 메뉴가 켜진 모든 유형에서 환불 신청 표시 */
{ const base = BRIEF; BRIEF = () => { const L = base(); try { if (!L.some(x => x.k === 'refund') && typeof menuOn === 'function' && menuOn('sales')) L.push({ k: 'refund', label: '환불 신청', n: (S.pays || []).filter(p => p.status === '환불 신청').length, q: '환불 신청 기한 확인해줘', unit: '건' }); } catch (e) { } return L; }; }

/* ═════════ ⑦ 학습자 스냅샷 ═════════ */
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { c2EnsureAll(); const sidOf = id => { const m = M(id); return m ? String(m.sid || m.extra?.['학번'] || m.id) : ''; };
  const hidden = new Set(S.classes.filter(c => c.open === '비공개').map(c => c.id));
  r.classes = (r.classes || []).filter(x => !hidden.has(x.id));
  r.classes.forEach(x => { const c = C(x.id); if (!c) return; const allow = c.open === '지정 회원' ? c2Expand(c.openTo) : null; const ends = {}, ex = {}; c.learners.forEach(id => { const s = sidOf(id); ends[s] = c2EndOf(c, id); const e = c.enr[id]; if (e && e.ex && e.ex.length) ex[s] = e.ex.slice(); });
    Object.assign(x, { kind: c.kind, sub: c.sub || '', price: +c.price || 0, salePrice: c2NetPrice(c), earlyPrice: c2EarlyPrice(c), discount: { ...c.discount }, recruit: { ...c.recruit, early: { ...c.recruit.early }, n: c.learners.length }, period: { ...c.period }, cat: c.cat || '', catName: c2CatName(c.cat), thumb: String(c.thumb || '').length <= 280000 ? c.thumb || '' : '', intro: (c.intro || []).map(i => ({ name: i.name, bio: i.bio, photo: String(i.photo || '').length <= 170000 ? i.photo || '' : '' })), teachers: (c.teachers || []).map(id => (S.admins || []).find(a => a.id === id)?.name).filter(Boolean), teacher: c.teacher || '', goalHtml: c.goalHtml || '', speed: typeof c.speed === 'object' ? { ...c.speed } : { on: !!c.speed }, skip: typeof c.skip === 'string' ? c.skip : (c.skip ? 'free' : 'watched'), legal: !!c.legal, community: c.community || 'class', sale: c.sale, open: c.open, status: c.status,
      allow: allow ? allow.map(sidOf) : null, allowIds: allow, enrolled: c.learners.map(sidOf), enrolledIds: c.learners.slice(), ends, ex, packOf: (c.packOf || []).map(id => ({ id, name: C(id)?.name || '' })), ...(Array.isArray(c.sessions) && !x.sessions ? { sessions: c.sessions.map(s => ({ ...s })) } : {}) }); });
  r.cats = c2CatTree().map(([k]) => ({ id: k.id, name: k.name, parent: k.parent || null, order: k.order || 0 })); } catch (e) { console.error(e); } return r; }; }
/* v32.8 전수 QA(U1): 준비중 강좌는 학습자에게 보이지 않는다는 사실과 다음 할 일을 상세 맨 위에 한 줄로 */
AFTER.push(() => { try { if (!CUR || CUR.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); const v = document.querySelector('#main .bview'); if (!c || !v || c.status !== '준비중' || v.querySelector('.c2ready')) return;
  v.insertAdjacentHTML('afterbegin', `<div class="note c2ready" role="status"><b>준비중 — 아직 ${esc(t('learner'))}에게 보이지 않습니다.</b> 내용을 확인했으면 운영을 시작하세요. ${c.open === '비공개' ? '지금은 비공개라 운영을 시작해도 목록에 나오지 않습니다. ' : ''}<button class="btn sm pri" data-act="c2-golive" data-v="${esc(c.id)}">운영 시작하기${c.open === '비공개' ? ' · 전체 공개' : ''}</button></div>`); } catch (e) { console.error(e); } });
ACT['c2-golive'] = el => { const c = C(el.dataset.v); if (!c) return; c.status = '운영중'; if (c.open === '비공개') c.open = '전체'; if (+c.price > 0 && !c.sale) c.sale = '판매중'; logAudit(`${t('cls')} 운영 시작 — ${c.name}`); save(); const pubd = typeof LSV === 'function' && LSV().pub; if (pubd) { try { (typeof smPublish === 'function' ? smPublish : ACT['ls-pub'])(); } catch (e) { } } render(); toast(pubd ? `운영을 시작했습니다. ${t('learner')} 사이트 목록에 보입니다.` : '운영을 시작했습니다. 사이트를 게시하면 학습자에게 보입니다(사이트 › 게시하기).', 'ok'); };
