/* v22 lcls — 학습자 화면 W2: 회차 클래스 일정 · 나의 출결 · 남은 회차 / 구독 관리(취소) / 라이브 입장 출석 / 동영상 배속 · 건너뛰기 규칙
   데이터: 게시본(lsSnapshot: kind · sub · sessions · credits · speed · skip · subsc) + 내 기록(데모: 같은 브라우저의 기관 데이터에서 본인 것만,
   운영: /api/pub/<tid>/me 응답 mine.w2 = { cls: { [cid]: { att: {[회차]: 상태}, attT: {[회차]: {date,in,out,by}} } }, subs: [...] }) */
'use strict';
const LW = { yp: null, doc: undefined, ro: '', cc: '' };
const LW_D = ['일', '월', '화', '수', '목', '금', '토'];
const lwDow = s => new Date(String(s).slice(0, 10) + 'T00:00:00Z').getUTCDay();
const lwFmt = s => /^\d{4}-\d{2}-\d{2}/.test(s || '') ? `${s.slice(5, 7)}.${s.slice(8, 10)}(${LW_D[lwDow(s)]})` : '';
const lwToday = () => new Date().toISOString().slice(0, 10);
const lwTone = { 출석: 'ok', 지각: 'wn', 조퇴: 'wn', 결석: 'bd' };
/* 기관 원본(데모: localStorage 기관 데이터 · 미리보기: 부모 창 S) — 화면마다 한 번 읽음 */
function lwDoc() { if (LW.doc !== undefined) return LW.doc; let d = null; try { if (LR.mode === 'preview' && window.parent !== window && window.parent.S) d = window.parent.S; else if (LR.mode === 'demo' && typeof demoRoom === 'function') d = demoRoom(); } catch (e) { d = null; } LW.doc = d && d.classes ? d : null; return LW.doc; }
function lwMe() { const d = lwDoc(); if (!d || !LR.me) return null; const me = LR.me; return (d.members || []).find(m => m && ((me.sid && m.sid === me.sid) || (me.id && m.id === me.id) || (me.email && m.acct && m.acct.email === me.email) || (lwTy() === 'univ' && m.name === me.sid))) || null; }
const lwTy = () => (SITE() && SITE().org && SITE().org.type) || '';
const lwSpeed = v => (v && typeof v === 'object') ? { on: !!v.on, min: +v.min || 0.5, max: +v.max || 2 } : { on: v !== false, min: 0.5, max: 2 };
const lwSkip = v => typeof v === 'string' ? v : v ? 'free' : 'watched';
/* 게시본 + 원본(일정 · 출결 최신) 병합 */
function lwCls(id, mid) { const x = (SITE().classes || []).find(c => c.id === id); if (!x) return null; const d = lwDoc(); const live = d ? (d.classes || []).find(c => c.id === id) : null; const me = mid ? { id: mid } : lwMe();
  const o = { ...x, kind: (live && live.kind) || x.kind || 'period', sub: (live && live.sub) || x.sub || '', sessions: (live && Array.isArray(live.sessions) ? live.sessions : x.sessions) || [], credits: (live && live.credits) || x.credits || null, days: (live && live.days) || x.days || [], time: (live && live.time) || x.time || null, speed: lwSpeed(live ? live.speed : x.speed), skip: lwSkip(live ? live.skip : x.skip), subsc: (live && live.subsc) || x.subsc || null };
  const mw = ((LR.mine || {}).w2 || {}).cls || {}; const att = {}, attT = {};
  if (live && me) { Object.entries(live.att || {}).forEach(([k, v]) => { if (v && typeof v === 'object' && v[me.id]) att[k] = v[me.id]; }); Object.entries(live.attT || {}).forEach(([k, v]) => { if (v && v[me.id]) attT[k] = v[me.id]; }); o.enrolled = (live.learners || []).includes(me.id); o.enr = (live.enr || {})[me.id] || null; }
  else if (mw[id]) { Object.assign(att, mw[id].att || {}); Object.assign(attT, mw[id].attT || {}); o.enrolled = true; }
  o.att = att; o.attT = attT; return o; }
/* 출결 단위: 회차 클래스 = 회차, 그 외 = 라이브 · 오프라인 강의 */
const lwUnits = c => c.kind === 'episode' && c.sessions.length ? c.sessions.map(s => ({ ...s, type: 'offline' })) : (c.items || []).filter(i => i.type === 'live' || i.type === 'offline').map((i, k) => ({ id: i.id, n: k + 1, date: i.date || '', from: i.from || '', to: i.to || '', title: i.title, place: i.place || '', type: i.type }));
function lwStat(c) { const X = new Set(((c.enr || {}).ex) || []); const U = lwUnits(c).filter(u => !X.has(u.id)); const n = { 출석: 0, 지각: 0, 조퇴: 0, 결석: 0 }; U.forEach(u => { const v = c.att[u.id]; if (n[v] != null) n[v]++; }); const D = U.filter(u => (u.date && u.date <= lwToday()) || c.att[u.id]);
  const rate = D.length ? Math.round((n.출석 + n.지각 + n.조퇴) / D.length * 100) : null; const used = n.출석 + n.지각 + n.조퇴;
  const remain = c.kind !== 'episode' ? null : c.sub === '회차 차감반' ? Math.max(0, ((c.credits || {}).total || U.length) - X.size - used) : U.filter(u => u.date && u.date >= lwToday()).length; return { U, n, rate, remain }; }
function lwSubs(cid) { const d = lwDoc(); const me = lwMe(); let L = []; if (d && me) L = (d.subs || []).filter(s => s.who === me.id && (!cid || s.cls === cid)); else L = (((LR.mine || {}).w2 || {}).subs || []).filter(s => !cid || s.cls === cid);
  const pend = (LR.lp && LR.lp.w2c) || {}; return L.map(s => ({ ...s, pend: !!pend[s.id] && ['구독중', '결제 실패'].includes(s.status) })); }
const lwSubCur = cid => { const L = lwSubs(cid); return L.find(s => s.status !== '해지') || L[L.length - 1] || null; };
const lwSubN = s => (s.base || 0) + (s.n || 0);
const lwSubTxt = s => s.pend ? '해지 예약(처리 중)' : s.status === '결제 실패' ? `결제 실패 · 재시도 중(${s.retry || 0}회)` : s.status === '해지' ? `만료${s.endReason ? ' · ' + s.endReason : ''}` : s.status;
const lwKST = (d, hm) => { if (!d || !hm) return ''; try { const t = new Date(`${d}T${hm}:00+09:00`); const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (!tz || tz === 'Asia/Seoul') return ''; return ` · 현지 ${t.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`; } catch (e) { return ''; } };
const lwGuard = () => typeof lGuard === 'function' && lGuard();

/* ── 클래스 화면: 회차 요약 · 나의 출결 · 구독 상태 ── */
function lwPanel(c) { if (!c) return ''; const ep = c.kind === 'episode'; const U = lwUnits(c); if (!ep && c.kind !== 'sub' && !U.length) return '';
  let h = '';
  if (ep) { const s = lwStat(c); const how = c.sub === '요일반' ? (c.days || []).length ? `매주 ${[...c.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => LW_D[d]).join('·')}${c.time && c.time.from ? ' ' + c.time.from + (c.time.to ? '–' + c.time.to : '') : ''}` : '반복 요일 수업' : c.sub === '특강반' ? '회차마다 수업 일자가 다릅니다 — 수강 전에 꼭 확인하세요' : '지정 일자 없이 출석할 때마다 1회 차감';
    h += `<div class="lw-sum"><span class="lw-chip">회차 클래스 · ${esc(c.sub || '회차')}</span><span class="lw-chip">총 ${U.length}회</span><span class="lw-chip">수강 기간 ${esc(c.start || '')} ~ ${esc(c.end || '')}${c.sub === '회차 차감반' && c.credits ? ` · 소진 ${c.credits.days}일` : ''}</span><span class="lw-chip">${esc(how)}</span></div>`;
    if (c.enrolled !== false && LR.me) h += `<div class="lw-kpi">${[['출석률', s.rate == null ? '—' : s.rate + '%'], ['출석', s.n.출석], ['지각', s.n.지각], ['조퇴', s.n.조퇴], ['결석', s.n.결석], ['남은 회차', s.remain + '회']].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>`; }
  if (U.length) h += lwTable(c);
  if (c.kind === 'sub') { const s = lwSubCur(c.id); const cnt = (c.subsc || {}).count || 0;
    h += `<div class="lw-sub"><div><span class="lw-chip">구독 클래스 · 매월 정기 결제${cnt ? ` · 최대 ${cnt}회차` : ' · 무제한'}</span>${s ? `<b>${esc(lwSubTxt(s))}</b><small>${lwSubN(s)}회차${cnt ? ' / ' + cnt : ''} · 시작 ${esc(s.start)}${s.status === '구독중' && !s.pend ? ` · 다음 결제일 ${esc(s.next)}` : ''}${s.end ? ` · ${s.status === '해지' ? '종료' : '이용 가능'} ${esc(s.end)}` : ''}</small>` : `<small>${(c.subsc || {}).start ? `구독 시작일 ${esc(c.subsc.start)} · ` : ''}구독하면 최초 결제일과 같은 날 매월 자동 결제됩니다.${(c.subsc || {}).saleEnd ? ' 판매가 종료된 클래스입니다.' : ''}</small>`}</div>
      ${s && ['구독중', '결제 실패'].includes(s.status) && !s.pend ? `<a class="lbtn sm ghost" href="#my">구독 관리</a>` : ''}</div>`;
    if (s && s.status === '해지') h += `<div class="lw-ro">구독이 만료되어 수강 · 과제 제출 · 출석 등 새 학습 기능이 제한됩니다. 기존 학습 기록은 그대로 볼 수 있으며, ${cnt && lwSubs(c.id).reduce((a, x) => a + (x.n || 0), 0) >= cnt ? '최대 구독 회차를 모두 사용했습니다.' : '다시 구독하면 진도가 이어집니다.'}</div>`; }
  return h ? `<section class="lw-ep"><div class="in">${h}</div></section>` : ''; }

function lwTable(c) { const ep = c.kind === 'episode'; const U = lwUnits(c); const X = new Set(((c.enr || {}).ex) || []); const dd = ep && c.sub === '회차 차감반';
  return `<details class="lw-sched" ${ep ? 'open' : ''}><summary>${ep ? '회차별 일정 · 나의 출결' : '라이브 · 오프라인 강의 일정 · 나의 출결'}</summary><div class="lw-tw"><table><thead><tr><th>${ep ? '회차' : '강의'}</th><th>${dd ? '출석일' : '일정'}</th><th>수업명</th><th>출결</th><th>출석 시간</th><th>종료 시간</th></tr></thead><tbody>${U.map(u => { const v = c.att[u.id] || ''; const tm = c.attT[u.id] || {}; const adm = tm.by === 'admin';
      return `<tr class="${u.date === lwToday() ? 'now' : ''}"><td>${ep ? u.n + '회' : esc(u.type === 'live' ? '라이브' : '오프라인')}</td><td>${dd ? (tm.date ? lwFmt(tm.date) : '—') : u.date ? lwFmt(u.date) + (u.from ? ' ' + esc(u.from) + (u.to ? '–' + esc(u.to) : '') : '') : '—'}</td><td>${esc(u.title)}${u.place ? `<small> · ${esc(u.place)}</small>` : ''}</td><td>${X.has(u.id) ? '<span class="lw-st">수강 제외</span>' : v ? `<span class="lw-st ${lwTone[v] || ''}">${esc(v)}</span>` : u.date && u.date < lwToday() ? '<span class="lw-st">미입력</span>' : '—'}</td><td>${adm ? '<small>운영자 처리</small>' : esc(tm.in || '—')}</td><td>${adm ? '' : esc(tm.out || '—')}</td></tr>`; }).join('')}</tbody></table></div><p class="lw-note">출석 · 종료 시간은 출결패드에 직접 입력한 시각입니다. 운영자가 직접 처리한 회차는 시간이 표시되지 않습니다.${lwTy() === 'k12' ? ' 출결이 바뀌면 연결된 보호자에게도 알림이 발송됩니다.' : ''}</p></details>`; }
/* 공용: 특정 회원(보호자 화면의 자녀 등)의 회차별 출결표 — W6 보호자 자녀 패널에서 호출 가능 */
function lwAttTable(cid, mid) { try { const c = lwCls(cid, mid); if (!c || !lwUnits(c).length) return ''; const st = lwStat(c); return `<div class="lw-kpi">${[['출석률', st.rate == null ? '—' : st.rate + '%'], ['출석', st.n.출석], ['결석', st.n.결석], ...(c.kind === 'episode' ? [['남은 회차', st.remain + '회']] : [])].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>` + lwTable(c); } catch (e) { return ''; } }

{ const base = viewCourse; viewCourse = (id, itemId) => { const h = base(id, itemId); try { if (!SITE() || !LR.me) return h; const c = lwCls(id); if (!c) return h; let out = h;
    if (c.kind === 'sub') { const s = lwSubCur(c.id); if (s && s.status === '해지') LW.ro = c.id; }
    const p = lwPanel(c); if (p) out = out.replace('<section class="crsb">', p + '<section class="crsb">');
    /* 선택된 항목: 일정 · 장소 · 라이브 입장 */
    const r = (LR.lp.cls || {})[c.id] || { items: {} }; const it = (c.items || []).find(x => x.id === itemId) || (c.items || []).find(x => !((r.items || {})[x.id] || {}).done) || (c.items || [])[0];
    if (it && (it.type === 'live' || it.type === 'offline')) { const se = c.kind === 'episode' ? c.sessions.find(s => s.id === it.id) : null; const u = se || it; const when = u.date ? `${lwFmt(u.date)} ${u.from || ''}${u.to ? '–' + u.to : ''}${u.from ? ' (KST)' + lwKST(u.date, u.from) : ''}` : c.sub === '회차 차감반' ? '지정 일자 없음 — 출석한 날이 수업일로 기록됩니다' : '일정 미정';
      const v = c.att[it.id]; const ex = `<div class="lw-when"><span>${esc(when)}</span>${u.place || it.place ? `<span>장소 ${esc(u.place || it.place)}</span>` : ''}${v ? `<span class="lw-st ${lwTone[v] || ''}">${esc(v)}</span>` : ''}</div>` +
        (it.type === 'live' ? `<div class="lw-live">${it.link ? `<button class="lbtn pri" data-lwx="live-in" data-c="${esc(c.id)}" data-i="${esc(it.id)}">강의실 입장</button><button class="lbtn ghost" data-lwx="live-out" data-c="${esc(c.id)}" data-i="${esc(it.id)}">퇴장 기록</button>` : '<small>강의실 주소가 아직 등록되지 않았습니다.</small>'}<small>일정 안에 입장하면 출석으로 기록됩니다${it.attMin ? ` · ${it.attMin}분 이상 참여해야 출석 인정` : ''}. 라이브 일시는 한국 표준시(KST) 기준입니다.</small></div>` : '<p class="lw-note">출석은 강의실 입구의 출결패드에 휴대폰 번호 끝 4자리를 입력해 기록합니다.</p>');
      out = out.replace(/(<div class="imain">[\s\S]*?<\/h2>)/, (m0) => m0 + ex); }
    /* 동영상 재생 규칙 안내 · 배속 선택 */
    if (it && it.type === 'video') { const sp = c.speed, sk = c.skip; const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].filter(x => x >= sp.min && x <= sp.max);
      const rule = `<div class="lw-rule">${sp.on ? `<label>재생 속도 <select data-lwrate aria-label="재생 속도">${rates.map(x => `<option value="${x}" ${x === 1 ? 'selected' : ''}>${x}배</option>`).join('')}</select></label>` : '<span>1배속만 재생</span>'}<span>${sk === 'free' ? '건너뛰기 가능 · ←/→ 또는 화면 양쪽 두 번 눌러 5초 이동' : sk === 'watched' ? '본 구간 안에서만 이동 가능 · ←/→ 5초' : '앞으로 건너뛰기 불가 · 되감기만 가능'}</span><small>진도는 실제로 시청한 구간만 반영되며(건너뛴 구간 · 2배속 초과 제외), 반영까지 최대 2시간 걸릴 수 있습니다. 정배속 시청을 권장합니다. 다시 들어오면 마지막 위치부터 이어서 재생합니다.</small></div>`;
      out = out.replace(/(<small class="mini" id="wtxt">[^<]*<\/small>)/, m0 => m0 + rule); }
    if (LW.ro === c.id) out = out.replace('<div class="imain">', '<div class="imain lw-roi">'); return out; } catch (e) { console.error('lcls course', e); return h; } }; }

/* ── 마이페이지: 회차 수업 출결 · 구독 관리 ── */
function lwMyCards() { const d = lwDoc(); const me = lwMe(); const S2 = SITE(); let eps = [], subs = lwSubs();
  if (d && me) eps = (d.classes || []).filter(c => c.kind === 'episode' && (c.learners || []).includes(me.id) && S2.classes.some(x => x.id === c.id)).map(c => lwCls(c.id)).filter(Boolean);
  else eps = Object.keys(((LR.mine || {}).w2 || {}).cls || {}).map(lwCls).filter(c => c && c.kind === 'episode');
  let h = '';
  if (eps.length) h += `<div class="mycard wide lw-my"><div class="mh" id="m-w2att"><h3>회차 수업 · 출결 <small>${eps.length}개</small></h3></div><div class="lw-cards">${eps.map(c => { const s = lwStat(c); const nx = s.U.find(u => u.date && u.date >= lwToday());
    return `<a class="lw-card" href="#c/${esc(c.id)}"><span class="lw-chip">${esc(c.sub || '회차')}</span><b>${esc(c.name)}</b><span class="lw-row"><em>출석률 <strong>${s.rate == null ? '—' : s.rate + '%'}</strong></em><em>출석 ${s.n.출석} · 결석 ${s.n.결석}</em><em>남은 회차 <strong>${s.remain}</strong></em></span><small>${c.sub === '회차 차감반' ? `수업 ${(c.credits || {}).total || s.U.length}회 · 출석 시 차감` : nx ? `다음 수업 ${lwFmt(nx.date)} ${esc(nx.from || '')}` : '남은 수업 없음'} · 수강 기간 ${esc(c.start || '')} ~ ${esc(c.end || '')}</small></a>`; }).join('')}</div></div>`;
  if (subs.length) h += `<div class="mycard wide lw-my"><div class="mh" id="m-w2sub"><h3>구독 관리 <small>${subs.filter(s => s.status !== '해지').length}개 이용 중</small></h3></div><div class="lw-tw"><table><thead><tr><th>클래스</th><th>상태</th><th>회차</th><th>다음 결제일</th><th>결제 수단</th><th></th></tr></thead><tbody>${subs.map(s => { const c = S2.classes.find(x => x.id === s.cls) || { name: '클래스' }; const cnt = ((c.subsc || {}).count) || 0; const can = ['구독중', '결제 실패'].includes(s.status) && !s.pend;
      return `<tr><td><a href="#c/${esc(s.cls)}">${esc(c.name)}</a></td><td><span class="lw-st ${s.status === '구독중' && !s.pend ? 'ok' : s.status === '결제 실패' ? 'bd' : 'wn'}">${esc(lwSubTxt(s))}</span></td><td>${lwSubN(s)}${cnt ? '/' + cnt : ''}</td><td>${s.status === '구독중' && !s.pend ? esc(s.next) : s.end ? `${esc(s.end)}까지 이용` : '—'}</td><td>${esc(s.card || s.method || '등록된 카드')}</td><td>${can ? LW.cc === s.id ? `<span class="lw-cc">구독을 취소할까요? 환불이 아니며 이번 달 남은 기간은 수강할 수 있고 다음 달부터 결제되지 않습니다. <button class="lbtn sm pri" data-lwx="subcancel2" data-v="${esc(s.id)}" data-c="${esc(s.cls)}">구독 취소</button><button class="lbtn sm ghost" data-lwx="subcancel0">닫기</button></span>` : `<button class="lbtn sm ghost" data-lwx="subcancel" data-v="${esc(s.id)}">구독 취소</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div><p class="lw-note">구독 취소는 환불이 아닙니다. 결제 실패 시 바로 회수하지 않고 재시도 기간 동안 수강할 수 있으며, 재시도가 모두 실패하면 만료됩니다. 결제 수단 변경과 환불 신청은 결제 관리에서 합니다.</p></div>`;
  return h; }
{ const base = viewMy; viewMy = (...a) => { const h = base(...a); try { if (!LR.me) return h; const x = lwMyCards(); return x ? h.replace('<div class="mygrid">', '<div class="mygrid">' + x) : h; } catch (e) { console.error('lcls my', e); return h; } }; }

/* ── 동작 ── */
document.addEventListener('click', e => { const el = e.target.closest('[data-lwx]'); if (!el) return; e.preventDefault(); const k = el.dataset.lwx; if (!LR.me) return;
  if (lwGuard() && k !== 'subcancel0') { toast('보호자 보기에서는 이용할 수 없습니다.', 'warn'); return; }
  if (k === 'subcancel') { LW.cc = el.dataset.v; lrender(); return; }
  if (k === 'subcancel0') { LW.cc = ''; lrender(); return; }
  if (k === 'subcancel2') { lpxPush('sub-cancel', { subId: el.dataset.v, sub: el.dataset.v, cls: el.dataset.c }); LR.lp.w2c = { ...(LR.lp.w2c || {}), [el.dataset.v]: nowISO() }; LR.api.save(); LW.cc = ''; toast('구독을 취소했습니다. 이번 달 남은 기간은 계속 수강할 수 있고 다음 달부터 결제되지 않습니다.', 'ok'); lrender(); return; }
  if (k === 'live-in' || k === 'live-out') { const c = lwCls(el.dataset.c); const it = c && (c.items || []).find(x => x.id === el.dataset.i); if (!it) return; if (LW.ro === c.id) { toast('구독이 만료되어 입장할 수 없습니다.', 'warn'); return; }
    const r = LR.lp.cls[c.id] = LR.lp.cls[c.id] || { items: {} }; r.items = r.items || {}; const st = r.items[it.id] = r.items[it.id] || {};
    if (k === 'live-in') { if (it.link) { try { window.open(it.link, '_blank', 'noopener'); } catch (x) { } } st.liveIn = nowISO(); st.done = true; lpxPush('att-live', { cls: c.id, item: it.id, act: 'join' }); toast('강의실에 입장했습니다. 출석이 기록됩니다.', 'ok'); }
    else { if (!st.liveIn) { toast('먼저 강의실에 입장하세요.', 'warn'); return; } st.liveOut = nowISO(); lpxPush('att-live', { cls: c.id, item: it.id, act: 'leave' }); toast('퇴장 시간을 기록했습니다.', 'ok'); }
    LR.api.save(); lrender(); } });
/* 만료된 구독: 새 학습 기능(완료 · 제출 · 응시) 차단 */
document.addEventListener('click', e => { if (!LW.ro) return; const el = e.target.closest('[data-lact]'); if (!el || !['done', 'asg', 'wdone'].includes(el.dataset.lact)) return; if (route().b !== LW.ro) return; e.preventDefault(); e.stopImmediatePropagation(); toast('구독이 만료되어 새 학습 기능을 사용할 수 없습니다.', 'warn'); }, true);
document.addEventListener('submit', e => { if (!LW.ro || !e.target || e.target.id !== 'qz' || e.target.dataset.c !== LW.ro) return; e.preventDefault(); e.stopImmediatePropagation(); toast('구독이 만료되어 응시할 수 없습니다.', 'warn'); }, true);
document.addEventListener('change', e => { const el = e.target.closest('[data-lwrate]'); if (!el || !LW.yp || !LW.yp.setPlaybackRate) return; try { LW.yp.setPlaybackRate(+el.value || 1); } catch (x) { } });
{ const base = lrender; lrender = (...a) => { LW.doc = undefined; LW.ro = ''; return base(...a); }; }

/* ═════════ 플레이어: 배속 · 건너뛰기 · 이어보기 ═════════ */
LW.hook = () => { try { if (window.YT && YT.Player && !YT.Player.__lc) { const P0 = YT.Player; const Wp = function (el, o) { const p = new P0(el, o); LW.yp = p; return p; }; Wp.prototype = P0.prototype; Wp.__lc = 1; YT.Player = Wp; } } catch (e) { } };
const lwMMSS = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
{ const base = ytMount; ytMount = el => { LW.yp = null; LW.hook(); const prev = window.onYouTubeIframeAPIReady; const P = base(el);
  const ok = window.onYouTubeIframeAPIReady; if (typeof ok === 'function' && ok !== prev && !ok.__lc) { const f = function () { LW.hook(); return ok.apply(this, arguments); }; f.__lc = 1; window.onYouTubeIframeAPIReady = f; }
  if (el.dataset.kind !== 'cls') return P; const cid = el.dataset.id, iid = el.dataset.item; const c = lwCls(cid); if (!c) return P;
  const sp = c.speed, sk = c.skip; const rec = LR.lp.cls[cid] = LR.lp.cls[cid] || { items: {} }; rec.items = rec.items || {}; const st = rec.items[iid] = rec.items[iid] || {};
  let maxW = +st.max || 0, last = null, resumed = false, tick = 0, warnAt = 0; const R = LW.rule = { sk, sp, get max() { return maxW; } };
  const warn = m => { if (Date.now() - warnAt > 2500) { warnAt = Date.now(); toast(m, 'warn'); } };
  const iv = setInterval(() => { const p = LW.yp; if (!p || typeof p.getCurrentTime !== 'function') return; try {
    zones(); const d = +(p.getDuration && p.getDuration()) || 0; const t = +p.getCurrentTime() || 0; const ps = p.getPlayerState ? p.getPlayerState() : -1;
    if (!resumed && d > 0) { resumed = true; let pos = +st.pos || 0; if (sk !== 'free') pos = Math.min(pos, maxW); if (pos > 5 && pos < d - 5) { p.seekTo(pos, true); last = pos; toast(`${lwMMSS(pos)}부터 이어서 재생합니다.`); return; } }
    const r = p.getPlaybackRate ? +p.getPlaybackRate() : 1;
    if (!sp.on && r !== 1) { p.setPlaybackRate(1); warn('이 강의는 배속 재생을 할 수 없습니다.'); }
    else if (sp.on && (r < sp.min || r > sp.max)) { p.setPlaybackRate(Math.min(sp.max, Math.max(sp.min, r))); warn(`배속은 ${sp.min}~${sp.max}배로 재생할 수 있습니다.`); }
    if (last != null && sk !== 'free') { const j = t - last; const lim = Math.max(2.5, r * 1.5);
      if (j > lim && (sk === 'none' || t > maxW + lim)) { const back = sk === 'none' ? last : Math.max(last, maxW); p.seekTo(back, true); last = back; warn(sk === 'none' ? '이 강의는 앞으로 건너뛸 수 없습니다.' : '아직 보지 않은 구간으로는 건너뛸 수 없습니다.'); return; } }
    if (ps === 1 && last != null && t >= last && t - last <= Math.max(2.5, r * 1.5)) maxW = Math.max(maxW, t);
    last = t; if (++tick % 6 === 0 && t > 0) { st.pos = Math.floor(t); st.max = Math.floor(maxW); if (LR.me) LR.api.save(); }
  } catch (e) { } }, 500);
  /* 화면 양쪽 두 번 누르기(모바일 더블탭 포함) = 5초 이동, 한 번 = 재생/일시정지 — 플레이어가 준비된 뒤에만 */
  const box = el.closest('.vbox') || el.parentElement; const zones = () => { if (box && box.isConnected && !box.querySelector('.lw-dz')) { box.insertAdjacentHTML('beforeend', '<span class="lw-dz l" data-lwz="-5" aria-hidden="true"></span><span class="lw-dz r" data-lwz="5" aria-hidden="true"></span>');
    box.querySelectorAll('.lw-dz').forEach(z => { let lt = 0, tm = 0; z.addEventListener('click', ev => { ev.preventDefault(); const now = Date.now(); if (now - lt < 320) { clearTimeout(tm); lt = 0; lwSeek(+z.dataset.lwz); } else { lt = now; tm = setTimeout(() => { const p = LW.yp; try { if (p && p.getPlayerState) { if (p.getPlayerState() === 1) p.pauseVideo(); else p.playVideo(); } } catch (x) { } }, 330); } }); }); } };
  return { ...P, stop() { clearInterval(iv); try { const p = LW.yp; if (p && p.getCurrentTime) { st.pos = Math.floor(+p.getCurrentTime() || 0); st.max = Math.floor(maxW); if (LR.me) LR.api.save(); } } catch (e) { } LW.rule = null; return P.stop(); } }; }; }
function lwSeek(dv) { const p = LW.yp, R = LW.rule; if (!p || !p.getCurrentTime || !R) return; const t = +p.getCurrentTime() || 0; let to = Math.max(0, t + dv);
  if (dv > 0 && R.sk === 'none') { toast('이 강의는 앞으로 건너뛸 수 없습니다.', 'warn'); return; } if (dv > 0 && R.sk === 'watched' && to > R.max) { if (t >= R.max - 0.5) { toast('아직 보지 않은 구간으로는 건너뛸 수 없습니다.', 'warn'); return; } to = R.max; }
  try { p.seekTo(to, true); } catch (e) { } }
document.addEventListener('keydown', e => { if (!LW.yp || !LW.rule || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return; if (e.key === 'ArrowLeft') { e.preventDefault(); lwSeek(-5); } if (e.key === 'ArrowRight') { e.preventDefault(); lwSeek(5); } });
