/* v22 cls3 — 레거시 디디쌤 가이드 보완 W2: 회차 · 구독 · 출결
   - 회차 클래스 3유형(요일반 자동 회차 · 특강반 캘린더 날짜 선택 · 회차 차감반 횟수/소진 기간) · 회차 캘린더/편집 · 날짜 중복 금지 · 삭제 경고
   - 출결: c.att = { [회차·강의 id]: { [회원 id]: '출석'|'지각'|'조퇴'|'결석' } }, 입실/종료 시각 c.attT, 출결 변경 · 미출결 · 수업일 변경 알림(수강생 + 연결 보호자)
   - 출결패드(키오스크): 휴대폰 끝 4자리 → 번호 중복 시 이름/닉네임 선택 → 오늘 수업 선택 → 출석/종료 시각 기록, 기간 클래스 오프라인 · 라이브 강의 포함
   - 구독: c.subsc(최대 회차 무제한/2~12 · 시작일 · 정기 모집 · 판매 종료), S.subs 수명주기(정기 결제 · 결제 실패 재시도 · 해지 예약 · 만료)
   - 동영상 배속 c.speed / 건너뛰기 c.skip 설정(학습자 플레이어는 lcls.js) */
'use strict';
const W2 = { DAYS: ['일', '월', '화', '수', '목', '금', '토'], ST: ['출석', '지각', '조퇴', '결석'], TONE: { 출석: 'g', 지각: 'y', 조퇴: 'y', 결석: 'r' }, SUBTONE: { 구독중: 'g', '해지 예약': 'y', '결제 실패': 'r', 해지: '' } };
/* 날짜(UTC 기준, today()와 같은 기준) */
const w2D = s => new Date(String(s).slice(0, 10) + 'T00:00:00Z');
const w2Y = d => d.toISOString().slice(0, 10);
const w2Add = (s, n) => { const d = w2D(s); d.setUTCDate(d.getUTCDate() + n); return w2Y(d); };
const w2AddM = (s, n) => { const d = w2D(s); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last)); return w2Y(d); };
const w2Ok = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(w2D(s));
const w2Dow = s => w2D(s).getUTCDay();
const w2Now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const w2Min = hm => { const m = /^(\d{1,2}):(\d{2})/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : null; };
const w2Fmt = s => w2Ok(s) ? `${s.slice(5, 7)}.${s.slice(8, 10)}(${W2.DAYS[w2Dow(s)]})` : '날짜 없음';
const w2Hash = s => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const w2DaysTxt = c => (c.days || []).length ? `매주 ${[...c.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => W2.DAYS[d]).join('·')}${c.time && c.time.from ? ' ' + c.time.from + (c.time.to ? '–' + c.time.to : '') : ''}` : '';
const w2Retry = () => clamp(+((S.settings || {}).subRetry) || 3, 1, 3);

/* ── 회차 생성 ── */
W2.genWeekly = (start, end, days, from, to) => { const out = []; if (!w2Ok(start) || !w2Ok(end) || !days.length || start > end) return out; for (let d = start; d <= end && out.length < 100; d = w2Add(d, 1)) if (days.includes(w2Dow(d))) out.push({ id: uid('se'), n: out.length + 1, date: d, from: from || '', to: to || '', title: `${out.length + 1}회차`, place: '' }); return out; };
W2.renum = c => { const ss = c.sessions || []; if (c.sub !== '회차 차감반') ss.sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : (a.date || '9999') > (b.date || '9999') ? 1 : 0); ss.forEach((s, i) => { const auto = /^\d+회차$/.test(s.title || ''); s.n = i + 1; if (auto || !s.title) s.title = `${i + 1}회차`; }); };
W2.period = c => { const ds = (c.sessions || []).map(s => s.date).filter(w2Ok).sort(); if (c.sub === '특강반' && ds.length) { c.start = ds[0]; c.end = ds[ds.length - 1]; } if (c.sub === '요일반' && ds.length) { if (!w2Ok(c.start) || ds[0] < c.start) c.start = ds[0]; if (!w2Ok(c.end) || ds[ds.length - 1] > c.end) c.end = ds[ds.length - 1]; }
  if (c.period && typeof c.period === 'object' && c.period.mode === 'range') { c.period.start = c.start; c.period.end = c.end; } };
/* 회차 → 커리큘럼(오프라인 항목) 동기화. 회차가 원본이고, 커리큘럼 항목 id = 회차 id */
W2.sync = c => { if (c.kind !== 'episode') return; const ids = new Set(c.sessions.map(s => s.id)); const old = Object.fromEntries((c.curriculum || []).filter(it => ids.has(it.id)).map(it => [it.id, it]));
  const others = (c.curriculum || []).filter(it => !ids.has(it.id));
  c.curriculum = [...c.sessions.map(s => ({ ...(old[s.id] || {}), id: s.id, type: 'offline', title: s.title, place: s.place || '', at: s.date ? `${s.date}T${s.from || '00:00'}` : '', from: s.date && s.from ? `${s.date}T${s.from}` : (old[s.id] || {}).from || '', to: s.date && s.to ? `${s.date}T${s.to}` : (old[s.id] || {}).to || '' })), ...others]; };

/* ── 데이터 정규화(샘플 데이터 · 이전 형식 → 계약 형식) ── */
W2.norm = c => {
  if (!c || !S) return c; S.settings = S.settings || {}; c.att = c.att || {}; c.attT = c.attT || {}; c.prog = c.prog || {}; c.learners = c.learners || []; c.curriculum = c.curriculum || [];
  if (typeof c.speed !== 'object' || !c.speed) c.speed = { on: c.speed !== false, min: +S.settings.speedMin || 0.5, max: +S.settings.speedMax || 2 };
  if (typeof c.skip !== 'string') c.skip = c.skip ? 'free' : 'watched';
  if (c.kind === 'episode') {
    if (!c.sub) c.sub = '요일반';
    if (!Array.isArray(c.sessions)) {
      const offs = c.curriculum.filter(it => it.type === 'offline'); const h = w2Hash(c.id + c.name); const st = w2Ok(c.start) ? c.start : today();
      let dates = [];
      if (c.sub === '요일반') { c.days = c.days || [[2, 4], [1, 3], [3, 5], [6]][h % 4]; c.time = c.time || { from: ['16:00', '19:00', '10:00'][h % 3], to: ['17:30', '20:30', '12:00'][h % 3] }; const g = W2.genWeekly(st, w2Add(st, 400), c.days, '', ''); dates = g.slice(0, offs.length).map(s => s.date); }
      else if (c.sub === '특강반') { c.time = c.time || { from: '10:00', to: '13:00' }; dates = offs.map((_, i) => w2Add(st, i * 4 + (i % 2))); }
      c.sessions = offs.map((it, i) => ({ id: it.id, n: i + 1, date: c.sub === '회차 차감반' ? '' : (w2Ok((it.at || '').slice(0, 10)) ? it.at.slice(0, 10) : dates[i] || ''), from: c.sub === '회차 차감반' ? '' : ((it.at || '').slice(11, 16) || (c.time || {}).from || ''), to: c.sub === '회차 차감반' ? '' : (c.time || {}).to || '', title: it.title, place: it.place || '' }));
      if (c.sub === '회차 차감반') c.credits = c.credits || { total: c.sessions.length, days: Math.max(30, Math.round((w2D(c.end || w2Add(st, 90)) - w2D(st)) / 864e5)) };
      W2.renum(c); W2.period(c);
      /* 이전 출결 형식('회원:회차번호') 이전 */
      Object.keys(c.att).filter(k => k.includes(':')).forEach(k => { const [mid, r] = k.split(':'); const s = c.sessions[+r]; if (s && c.att[k]) (c.att[s.id] = c.att[s.id] || {})[mid] = c.att[k]; delete c.att[k]; });
      /* 샘플 출결 기록(이미 지난 회차) */
      if (!S.org.empty) c.learners.forEach(mid => { const code = mid.charCodeAt(1) || 7;
        if (c.sub === '회차 차감반') { const k = (w2Hash(mid + c.id) % Math.max(1, Math.min(6, c.sessions.length))); c.sessions.slice(0, k).forEach((s, r) => { const v = ((code + r) % 9) === 0 ? '지각' : '출석'; (c.att[s.id] = c.att[s.id] || {})[mid] = v; (c.attT[s.id] = c.attT[s.id] || {})[mid] = { date: w2Add(today(), -(k - r) * 3), in: r % 2 ? '' : '18:5' + (r % 9), out: '', by: r % 2 ? 'admin' : 'pad' }; }); }
        else c.sessions.filter(s => s.date && s.date < today()).forEach((s, r) => { if ((c.att[s.id] || {})[mid]) return; const v = ((code + r) % 9) === 0 ? '결석' : ((code + r) % 7) === 0 ? '지각' : '출석'; (c.att[s.id] = c.att[s.id] || {})[mid] = v; if (v !== '결석') (c.attT[s.id] = c.attT[s.id] || {})[mid] = r % 3 ? { date: s.date, in: s.from || '', out: s.to || '', by: 'pad' } : { date: s.date, by: 'admin' }; }); });
      W2.sync(c); c.learners.forEach(mid => W2.recalc(c, mid));
    }
    /* 다른 경로(AI · 대화 · + 항목)로 추가된 오프라인 항목 → 회차 */
    const ids = new Set(c.sessions.map(s => s.id)); const add = c.curriculum.filter(it => it.type === 'offline' && !ids.has(it.id));
    if (add.length) { add.forEach(it => c.sessions.push({ id: it.id, n: 0, date: c.sub === '회차 차감반' ? '' : (it.at || '').slice(0, 10), from: (it.at || '').slice(11, 16), to: '', title: it.title, place: it.place || '' })); W2.renum(c); W2.sync(c); }
    if (c.sub === '회차 차감반') { c.credits = c.credits || { total: c.sessions.length, days: 90 }; c.credits.total = c.sessions.length; }
  }
  if (c.kind === 'sub') {
    c.subsc = c.subsc || { cycle: 'month', count: 0, start: '', saleEnd: '' }; if (!c.subsc.rc) c.subsc.rc = { on: false, from: 1, to: 10 };
    S.subs = S.subs || []; if (c.sale === '판매 종료' && !c.subsc.saleEnd) W2.saleEnd(c);
    if (!c.subsc.seeded) { c.subsc.seeded = true; if (!S.org.empty) c.learners.forEach((mid, i) => { if (S.subs.some(x => x.cls === c.id && x.who === mid)) return; const n = 1 + (w2Hash(mid) % 5); const start = w2AddM(w2Add(today(), -(i % 20)), -(n - 1)); const s = { id: uid('sb'), cls: c.id, who: mid, status: i % 9 === 4 ? '해지 예약' : i % 11 === 6 ? '결제 실패' : '구독중', n, start, next: w2AddM(start, n), end: '', base: 0, retry: 0, card: '카드(정기) ' + String(1000 + (w2Hash(mid) % 9000)) };
      if (s.status === '해지 예약') { s.end = s.next; s.endReason = '구독 취소'; } if (s.status === '결제 실패') { s.next = w2Add(today(), -1); s.retry = 1; s.retryAt = w2Add(today(), 1); s.failNext = true; } S.subs.push(s); }); }
  }
  return c;
};
W2.all = () => { if (!S || !S.classes) return; S.classes.forEach(W2.norm); };

/* ── 출결 단위(회차 클래스 = 회차, 그 외 = 라이브 · 오프라인 강의) ── */
W2.units = c => { W2.norm(c); if (c.kind === 'episode') return c.sessions.map(s => ({ ...s, type: 'offline' }));
  return c.curriculum.filter(it => it.type === 'live' || it.type === 'offline').map((it, i) => { const a = String(it.from || it.at || ''); return { id: it.id, n: i + 1, date: a.slice(0, 10), from: a.slice(11, 16), to: String(it.to || '').slice(11, 16), title: it.title, place: it.place || '', type: it.type, attMin: +it.attMin || 0 }; }); };
W2.hasUnits = c => c.kind === 'episode' || (c.curriculum || []).some(it => it.type === 'live' || it.type === 'offline');
W2.get = (c, k, mid) => ((c.att || {})[k] || {})[mid] || '';
/* 강의 단위 수강 제외(W1 c.enr[m].ex) — 출석률 · 남은 회차 · 출결패드에서 뺀다 */
W2.ex = (c, mid) => new Set((((c.enr || {})[mid] || {}).ex) || []);
W2.mine = (c, mid) => { const X = W2.ex(c, mid); return W2.units(c).filter(u => !X.has(u.id)); };
W2.cnt = (c, mid) => { const r = { 출석: 0, 지각: 0, 조퇴: 0, 결석: 0 }; W2.mine(c, mid).forEach(u => { const v = W2.get(c, u.id, mid); if (r[v] != null) r[v]++; }); return r; };
/* 출석률: 지난 회차(오늘 포함) + 출결이 입력된 회차 기준, 출석 · 지각 · 조퇴 인정 */
W2.rate = (c, mid) => { const U = W2.mine(c, mid).filter(u => (u.date && u.date <= today()) || W2.get(c, u.id, mid)); if (!U.length) return null; const ok = U.filter(u => ['출석', '지각', '조퇴'].includes(W2.get(c, u.id, mid))).length; return Math.round(ok / U.length * 100); };
W2.used = (c, mid) => W2.mine(c, mid).filter(u => ['출석', '지각', '조퇴'].includes(W2.get(c, u.id, mid))).length;
W2.remain = (c, mid) => { if (c.kind !== 'episode') return null; if (c.sub === '회차 차감반') return Math.max(0, (c.credits || {}).total - W2.ex(c, mid).size - W2.used(c, mid)); return W2.mine(c, mid).filter(u => u.date && u.date >= today()).length; };
W2.creditEnd = (c, mid) => { const e = (c.enr || {})[mid]; const at = (e && e.at) || c.start || today(); return w2Add(at, +((c.credits || {}).days) || 90); };
W2.recalc = (c, mid) => { const r = W2.rate(c, mid); c.prog[mid] = c.prog[mid] || { p: 0, exam: null, assign: 'none' }; if (r != null) c.prog[mid].att = r; else if (c.prog[mid].att == null) c.prog[mid].att = 100; };

/* ── 알림(수강생 + 연결된 보호자). 운영: 알림톡 · 앱 푸시 API ── */
W2.parentsOf = mid => (S.parents || []).filter(p => p.child === mid && /연결 완료/.test(p.status || ''));
W2.notify = (mids, title, body) => { S.inbox = S.inbox || {}; S.msgs = S.msgs || []; let n = 0;
  [...new Set(mids)].forEach(mid => { const m = M(mid); if (!m) return; const txt = typeof body === 'function' ? body(m) : body; const ps = W2.parentsOf(mid);
    (S.inbox[mid] = S.inbox[mid] || []).unshift({ id: uid('ib'), at: nowStr(), title, body: txt, read: false }); S.inbox[mid] = S.inbox[mid].slice(0, 100);
    /* 운영: 알림톡 발송 API(수강생 + 보호자 ps) */
    S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: (m.name || m.sid || '수강생') + (ps.length ? ` · 보호자 ${ps.length}명` : ''), toIds: [mid], parents: !!ps.length, title, body: txt, imgs: [], ch: '알림톡(자동)', n: 1 + ps.length, auto: 'w2' }); n += 1 + ps.length; });
  S.msgs = S.msgs.slice(0, 500); return n; };
W2.uLabel = (c, k) => { const u = W2.units(c).find(x => x.id === k); return u ? `${c.kind === 'episode' ? u.n + '회차' : u.title}${u.date ? ' ' + w2Fmt(u.date) : ''}` : ''; };
/* 출결 입력: by 'admin'(운영자 처리 — 학습자 · 보호자에게 시각 비노출) | 'pad' | 'live' */
W2.set = (c, k, mid, v, by = 'admin', quiet = false) => { c.att[k] = c.att[k] || {}; c.attT[k] = c.attT[k] || {}; const prev = c.att[k][mid] || '';
  if (!v) { delete c.att[k][mid]; delete c.attT[k][mid]; } else { c.att[k][mid] = v; if (by === 'admin') c.attT[k][mid] = { ...(c.attT[k][mid] || {}), date: (c.attT[k][mid] || {}).date || today(), by: (c.attT[k][mid] || {}).by === 'pad' ? 'pad' : 'admin' }; }
  W2.recalc(c, mid); S.attLog = true;
  if (!quiet && prev !== v) W2.notify([mid], '출결 알림', m => `[${S.org.name}] ${m.name || ''} ${t('learner')}의 「${c.name}」 ${W2.uLabel(c, k)} 출결이 '${v || '미입력'}'(으)로 ${prev ? '변경' : '등록'}되었습니다.`);
  return prev !== v; };

/* ═════════ 운영자 화면 ═════════ */
const w2Seg = (key, list, cur) => `<div class="seg2 w2seg">${list.map(([id, l]) => `<button class="${id === cur ? 'on' : ''}" data-act="tab" data-key="${key}" data-v="${id}">${esc(l)}</button>`).join('')}</div>`;
const w2Cell = (c, k, mid) => { const v = W2.get(c, k, mid); const tm = ((c.attT[k] || {})[mid]) || {}; return `<button class="att ${W2.TONE[v] || ''}" data-act="w2-cell" data-c="${c.id}" data-s="${k}" data-m="${mid}" title="${esc(v || '미입력')}${tm.in ? ' · 입실 ' + tm.in : ''}${tm.out ? ' · 종료 ' + tm.out : ''}${tm.by === 'admin' ? ' · 운영자 처리' : ''} — 클릭해서 변경">${v ? v[0] : '·'}</button>`; };
/* 출결 매트릭스(회차 수 제한 없음, 가로 스크롤) */
W2.matrix = c => { const U = W2.units(c); if (!U.length) return `<div class="empty">출결을 받을 ${c.kind === 'episode' ? '회차' : '라이브 · 오프라인 강의'}가 없습니다.</div>`; if (!c.learners.length) return `<div class="empty">${esc(t('learner'))}이 없습니다.</div>`;
  const dd = c.kind === 'episode' && c.sub === '회차 차감반';
  return `<div class="tw w2mx"><table><thead><tr><th>이름</th>${U.map(u => `<th><button class="link" data-act="w2-satt" data-c="${c.id}" data-s="${u.id}" title="${esc(u.title)} 출결 관리">${c.kind === 'episode' ? u.n + '회' : esc(u.title.slice(0, 8))}<small>${u.date ? w2Fmt(u.date).slice(0, 5) : dd ? '' : '—'}</small></button></th>`).join('')}<th>출석률</th>${c.kind === 'episode' ? '<th>남은 회차</th>' : ''}</tr></thead><tbody>${c.learners.map(mid => { const r = W2.rate(c, mid); return `<tr><td><button class="link" data-act="w2-hist" data-c="${c.id}" data-m="${mid}">${mn(mid)}</button></td>${(X => U.map(u => `<td>${X.has(u.id) ? '<small class="mini" title="강의 단위 수강 제외">제외</small>' : w2Cell(c, u.id, mid)}</td>`).join(''))(W2.ex(c, mid))}<td>${r == null ? '—' : r < 80 ? tag(r + '%', 'r') : r + '%'}</td>${c.kind === 'episode' ? `<td>${W2.remain(c, mid)}회</td>` : ''}</tr>`; }).join('')}</tbody></table></div><p class="mini">칸을 누르면 출석 → 지각 → 조퇴 → 결석 → 미입력 순으로 바뀌고, ${esc(t('learner'))}과 연결된 보호자에게 알림이 자동 발송됩니다. 회차 머리를 누르면 회차별 출결 관리 · 미출결 알림을 엽니다.</p>`; };
ACT['w2-cell'] = el => { const c = C(el.dataset.c); if (!c) return; const order = ['출석', '지각', '조퇴', '결석', '']; const cur = W2.get(c, el.dataset.s, el.dataset.m); const nx = order[(order.indexOf(cur) + 1) % order.length];
  if (c.kind === 'episode' && c.sub === '회차 차감반' && nx && !cur && W2.remain(c, el.dataset.m) <= 0) { toast('잔여 회차가 없습니다. 회차를 추가하거나 수강 권한을 다시 부여하세요.', 'warn'); return; }
  W2.set(c, el.dataset.s, el.dataset.m, nx, 'admin'); logAudit(`${c.name} 출결 변경 — ${M(el.dataset.m)?.name || ''} ${W2.uLabel(c, el.dataset.s)} ${nx || '미입력'}`); save(); render(); toast(`출결을 '${nx || '미입력'}'(으)로 바꾸고 알림을 보냈습니다.`, 'ok'); };
/* 회차(강의)별 출결 관리: 출결 전 / 출석 / 지각 / 조퇴 / 결석 탭 + 일괄 변경 + 미출결 알림 */
ACT['w2-satt'] = el => { const c = C(el.dataset.c); if (!c) return; const k = el.dataset.s; const u = W2.units(c).find(x => x.id === k); if (!u) return; const tb = el.dataset.t || UI.w2sat || 'none';
  const L = c.learners.map(mid => ({ mid, v: W2.get(c, k, mid) })); const grp = { none: L.filter(x => !x.v), 출석: L.filter(x => x.v === '출석'), 지각: L.filter(x => x.v === '지각'), 조퇴: L.filter(x => x.v === '조퇴'), 결석: L.filter(x => x.v === '결석') };
  const cur = grp[tb] || grp.none; const tm = mid => ((c.attT[k] || {})[mid]) || {};
  const w = modal(`${c.kind === 'episode' ? u.n + '회차' : u.title} 출결 관리`, `<p class="mini">${esc(c.name)} · ${esc(u.title)} · ${u.date ? w2Fmt(u.date) : '일자 지정 없음'}${u.from ? ' ' + u.from + (u.to ? '–' + u.to : '') : ''}${u.place ? ' · ' + esc(u.place) : ''}</p>
    <div class="seg2 w2seg">${[['none', '출결 전'], ['출석', '출석'], ['지각', '지각'], ['조퇴', '조퇴'], ['결석', '결석']].map(([id, l]) => `<button type="button" class="${id === tb ? 'on' : ''}" data-act="w2-satt" data-c="${c.id}" data-s="${k}" data-t="${id}">${l} <em>${grp[id].length}</em></button>`).join('')}</div>
    ${cur.length ? `<div class="tw"><table><thead><tr><th><input type="checkbox" id="w2all" aria-label="전체 선택"></th><th>이름</th><th>출결</th><th>입실 · 종료</th><th>변경</th></tr></thead><tbody>${cur.map(x => `<tr><td><input type="checkbox" name="w2m" value="${x.mid}" aria-label="선택"></td><td>${mn(x.mid)}</td><td>${x.v ? tag(x.v, W2.TONE[x.v]) : tag('출결 전')}</td><td>${tm(x.mid).by === 'admin' ? '<small class="mini">운영자 처리</small>' : tm(x.mid).in ? `${tm(x.mid).in}${tm(x.mid).out ? ' – ' + tm(x.mid).out : ''}` : '—'}</td><td class="w2btns">${W2.ST.map(s => `<button type="button" class="btn sm ${x.v === s ? 'pri' : 'ghost'}" data-act="w2-sset" data-c="${c.id}" data-s="${k}" data-m="${x.mid}" data-v="${s}" data-t="${tb}">${s}</button>`).join('')}</td></tr>`).join('')}</tbody></table></div>
    <div class="bar2"><span class="mini">선택한 ${esc(t('learner'))} 일괄 변경</span>${W2.ST.map(s => `<button type="button" class="btn sm" data-act="w2-sbulk" data-c="${c.id}" data-s="${k}" data-v="${s}" data-t="${tb}">${s}</button>`).join('')}</div>` : `<div class="empty">해당하는 ${esc(t('learner'))}이 없습니다.</div>`}
    <p class="mini">출결을 바꾸면 ${esc(t('learner'))}과 연결된 보호자에게 알림이 자동 발송됩니다. 출결 전인 ${esc(t('learner'))}에게는 미출결 메시지로 출석을 독려할 수 있습니다.</p>`,
  [{ id: 'nudge', label: `미출결 알림 보내기 (${grp.none.length})`, run: () => { ACT['w2-nudge']({ dataset: { c: c.id, s: k } }); } }, { id: 'c', label: '닫기', kind: 'pri' }], true);
  const all = w.querySelector('#w2all'); if (all) all.addEventListener('change', () => $$('[name=w2m]', w).forEach(x => { x.checked = all.checked; })); };
ACT['w2-sset'] = el => { const c = C(el.dataset.c); if (!c) return; W2.set(c, el.dataset.s, el.dataset.m, el.dataset.v, 'admin'); logAudit(`${c.name} 출결 변경 — ${M(el.dataset.m)?.name || ''} ${el.dataset.v}`); save(); render(); ACT['w2-satt']({ dataset: { c: c.id, s: el.dataset.s, t: el.dataset.t } }); toast('출결을 바꾸고 알림을 보냈습니다.', 'ok'); };
ACT['w2-sbulk'] = el => { const c = C(el.dataset.c); const ids = $$('#modal [name=w2m]:checked').map(x => x.value); if (!ids.length) { toast('변경할 ' + t('learner') + '을 선택하세요.', 'warn'); return; } ids.forEach(mid => W2.set(c, el.dataset.s, mid, el.dataset.v, 'admin')); logAudit(`${c.name} 출결 일괄 변경 ${ids.length}명 — ${el.dataset.v}`); save(); render(); ACT['w2-satt']({ dataset: { c: c.id, s: el.dataset.s, t: el.dataset.t } }); toast(`${ids.length}명을 '${el.dataset.v}'(으)로 바꾸고 알림을 보냈습니다.`, 'ok'); };
ACT['w2-nudge'] = el => { const c = C(el.dataset.c); const k = el.dataset.s; const ids = c.learners.filter(mid => !W2.get(c, k, mid)); if (!ids.length) { toast('출결 전인 ' + t('learner') + '이 없습니다.', 'warn'); return false; }
  const n = W2.notify(ids, '미출결 안내', m => `[${S.org.name}] ${m.name || ''} ${t('learner')}의 「${c.name}」 ${W2.uLabel(c, k)} 출결이 아직 입력되지 않았습니다. 출결패드에서 출석을 입력해 주세요.`); logAudit(`${c.name} 미출결 알림 ${ids.length}명`); save(); render(); toast(`미출결 ${ids.length}명에게 알림을 보냈습니다(보호자 포함 ${n}건).`, 'ok'); };
/* 수강생별 출결 이력 */
ACT['w2-hist'] = el => { const c = C(el.dataset.c); const mid = el.dataset.m; if (!c) return; const U = W2.units(c); const r = W2.rate(c, mid); const n = W2.cnt(c, mid);
  modal(`${M(mid)?.name || ''} 출결 이력`, `<div class="w2kp">${[['출석률', r == null ? '—' : r + '%'], ['출석', n.출석], ['지각', n.지각], ['조퇴', n.조퇴], ['결석', n.결석], ...(c.kind === 'episode' ? [['남은 회차', W2.remain(c, mid) + '회']] : [])].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>
    ${c.sub === '회차 차감반' ? `<p class="mini">회차 차감반 · 총 ${(c.credits || {}).total}회 · 소진 기한 ${W2.creditEnd(c, mid)} · 출석한 날이 수업 진행일로 기록됩니다.</p>` : ''}
    ${table(['회차', '일정', '수업명', '출결', '입실', '종료'], U.map(u => { const v = W2.get(c, u.id, mid); const tm = ((c.attT[u.id] || {})[mid]) || {}; return [c.kind === 'episode' ? u.n + '회' : esc(ITEMX?.[u.type] || u.type), c.sub === '회차 차감반' ? (tm.date ? w2Fmt(tm.date) : '—') : (u.date ? w2Fmt(u.date) + (u.from ? ' ' + u.from : '') : '—'), esc(u.title), v ? tag(v, W2.TONE[v]) : '—', tm.by === 'admin' ? '<small class="mini">운영자 처리</small>' : esc(tm.in || '—'), tm.by === 'admin' ? '' : esc(tm.out || '—')]; }), '회차가 없습니다.')}`, [{ id: 'c', label: '닫기', kind: 'pri' }], true); };

/* ── 회차 탭(회차 클래스) ── */
W2.epView = c => { W2.norm(c); const v = UI.w2v || 'list'; const dd = c.sub === '회차 차감반'; const ss = c.sessions;
  const sum = `<div class="w2sum card"><div>${tag(c.sub || '회차', 'g')} <b>총 ${ss.length}회</b> · 수강 기간 ${esc(c.start || '')} ~ ${esc(c.end || '')}${c.sub === '요일반' && w2DaysTxt(c) ? ' · ' + esc(w2DaysTxt(c)) : ''}${dd ? ` · 소진 기간 ${(c.credits || {}).days || 90}일 · 출석 시 1회 차감(출석일 = 수업 진행일)` : ''}</div>
    <div class="bar2">${dd ? `<button class="btn sm" data-act="w2-credits" data-v="${c.id}">수업 횟수 · 소진 기간</button>` : ''}${c.sub === '요일반' ? `<button class="btn sm" data-act="w2-regen" data-v="${c.id}">수강 기간 · 요일 · 시간 변경</button>` : ''}<button class="btn sm" data-act="w2-sadd" data-v="${c.id}">+ 회차 추가</button><button class="btn sm" data-act="cls-pad">출결패드 실행하기</button><button class="btn sm ghost" data-act="w2-csv" data-v="${c.id}">출결 현황 CSV</button></div></div>`;
  const seg = w2Seg('w2v', [['list', '회차 목록'], ...(dd ? [] : [['cal', '캘린더']]), ['att', '출결 현황']], v);
  let body = '';
  if (v === 'list') body = table(['회차', '수업명', ...(dd ? [] : ['날짜', '시작', '종료']), '장소', '출결', ''], ss.map(s => { const ok = c.learners.filter(mid => ['출석', '지각', '조퇴'].includes(W2.get(c, s.id, mid))).length;
    return [`<b>${s.n}</b>`, `<input class="w2in" value="${esc(s.title)}" maxlength="80" data-chg="w2-se" data-c="${c.id}" data-s="${s.id}" data-k="title" aria-label="${s.n}회차 수업명">`, ...(dd ? [] : [`<input class="w2in" type="date" value="${esc(s.date)}" data-chg="w2-se" data-c="${c.id}" data-s="${s.id}" data-k="date" aria-label="${s.n}회차 날짜">${s.date && w2Dow(s.date) != null ? `<small class="mini"> ${W2.DAYS[w2Dow(s.date)]}</small>` : ''}`, `<input class="w2in t" type="time" value="${esc(s.from)}" data-chg="w2-se" data-c="${c.id}" data-s="${s.id}" data-k="from" aria-label="${s.n}회차 시작 시간">`, `<input class="w2in t" type="time" value="${esc(s.to)}" data-chg="w2-se" data-c="${c.id}" data-s="${s.id}" data-k="to" aria-label="${s.n}회차 종료 시간">`]),
      `<input class="w2in" value="${esc(s.place || '')}" maxlength="60" placeholder="장소" data-chg="w2-se" data-c="${c.id}" data-s="${s.id}" data-k="place" aria-label="${s.n}회차 장소">`, `<button class="btn sm ghost" data-act="w2-satt" data-c="${c.id}" data-s="${s.id}">출석관리 ${ok}/${c.learners.length}</button>`, `<button class="btn sm ghost" data-act="w2-sdel" data-c="${c.id}" data-s="${s.id}" aria-label="${s.n}회차 삭제">${ic('x', 14)}</button>`]; }), '회차가 없습니다. [+ 회차 추가]로 만드세요.') + `<p class="mini">회차는 최대 100개 · 이미 회차가 있는 날짜에는 추가할 수 없습니다. 시간은 비워 둘 수 있으며, 시간과 별개로 출석 처리할 수 있습니다.</p>`;
  if (v === 'cal') body = W2.cal(c, UI.w2m || (ss.find(s => s.date >= today()) || ss.find(s => s.date) || {}).date || today(), 'cls');
  if (v === 'att') body = W2.matrix(c);
  const others = c.curriculum.map((it, i) => [it, i]).filter(([it]) => !ss.some(s => s.id === it.id));
  return sum + seg + body + `<div class="card"><div class="ch"><b>회차 외 항목</b><small>과제 · 라이브 등</small><span class="sp"></span><button class="btn sm" data-act="cur-add" data-v="${c.id}">+ 항목</button></div>${others.length ? `<ol class="cur">${others.map(([it, i]) => itemRow(c, it, i)).join('')}</ol>` : '<div class="empty">없습니다.</div>'}</div>`; };
/* 월 캘린더: mode 'cls'(클래스 회차 보기 · 날짜 눌러 추가) | 'wz'(마법사 특강반 날짜 선택) */
W2.cal = (c, ym, mode, sel) => { ym = String(ym).slice(0, 7); const first = w2D(ym + '-01'); const pad = first.getUTCDay(); const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const byDate = {}; (mode === 'cls' ? c.sessions : (sel || [])).forEach(s => { if (s.date) (byDate[s.date] = byDate[s.date] || []).push(s); });
  const prev = w2AddM(ym + '-01', -1).slice(0, 7), next = w2AddM(ym + '-01', 1).slice(0, 7); const act = mode === 'cls' ? 'w2-calm' : 'w2wz-calm';
  let cells = ''; for (let i = 0; i < pad; i++) cells += '<span class="w2cd off"></span>';
  for (let d = 1; d <= last; d++) { const ds = `${ym}-${String(d).padStart(2, '0')}`; const L = byDate[ds] || []; const td = ds === today() ? ' today' : '';
    cells += mode === 'cls' ? `<div class="w2cd${td}${L.length ? ' has' : ''}"><button class="w2dn" data-act="w2-sadd" data-v="${c.id}" data-d="${ds}" title="${ds} 회차 추가" ${L.length ? 'disabled' : ''}>${d}</button>${L.map(s => `<button class="w2chip" data-act="w2-sedit" data-c="${c.id}" data-s="${s.id}" title="${esc(s.title)} 편집 · 날짜 이동">${s.n}회${s.from ? ' ' + s.from : ''}</button>`).join('')}</div>`
      : `<button type="button" class="w2cd pick${td}${L.length ? ' has' : ''}" data-act="w2wz-pick" data-d="${ds}" aria-pressed="${!!L.length}">${d}</button>`; }
  return `<div class="w2cal"><div class="w2ch"><button type="button" class="btn sm ghost" data-act="${act}" data-v="${prev}" data-c="${c ? c.id : ''}" aria-label="이전 달">‹</button><b>${ym.replace('-', '년 ')}월</b><button type="button" class="btn sm ghost" data-act="${act}" data-v="${next}" data-c="${c ? c.id : ''}" aria-label="다음 달">›</button></div><div class="w2cg">${W2.DAYS.map(x => `<span class="w2wd">${x}</span>`).join('')}${cells}</div></div>`; };
ACT['w2-calm'] = el => { UI.w2m = el.dataset.v; render(); };
W2.dup = (c, date, except) => !!date && c.sessions.some(s => s.date === date && s.id !== except);
W2.dateChanged = (c, s, old) => { if (!c.learners.length || !old || old === s.date) return; W2.notify(c.learners, '수업 일정 변경', m => `[${S.org.name}] 「${c.name}」 ${s.n}회차 수업일이 ${w2Fmt(old)} → ${w2Fmt(s.date)}${s.from ? ' ' + s.from : ''}(으)로 변경되었습니다.`); };
ACT['w2-se'] = el => { const c = C(el.dataset.c); const s = c && c.sessions.find(x => x.id === el.dataset.s); if (!s) return; const k = el.dataset.k; const v = el.value.trim();
  if (k === 'date') { if (v && !w2Ok(v)) { toast('날짜 형식을 확인하세요.', 'warn'); el.value = s.date; return; } if (!v && c.sub !== '회차 차감반') { toast('수업 날짜를 입력하세요.', 'warn'); el.value = s.date; return; } if (W2.dup(c, v, s.id)) { toast('이미 회차가 있는 날짜입니다. 다른 날짜를 고르세요.', 'warn'); el.value = s.date; return; } const old = s.date; s.date = v; W2.renum(c); W2.period(c); W2.dateChanged(c, s, old); }
  else if (k === 'title') { if (!v) { el.value = s.title; return; } s.title = v.slice(0, 80); }
  else if (k === 'from' || k === 'to') { s[k] = v; if (s.from && s.to && s.to <= s.from) toast('종료 시간이 시작 시간보다 빠릅니다.', 'warn'); }
  else s[k] = v.slice(0, 60);
  W2.sync(c); logAudit(`${c.name} ${s.n}회차 ${k === 'date' ? '날짜' : k === 'title' ? '수업명' : k === 'place' ? '장소' : '시간'} 변경`); save(); if (k === 'date') render(); toast(k === 'date' && c.learners.length ? `저장했습니다. ${t('learner')} · 보호자에게 일정 변경 알림을 보냈습니다.` : '저장했습니다.', 'ok'); };
ACT['w2-sedit'] = el => { const c = C(el.dataset.c); const s = c && c.sessions.find(x => x.id === el.dataset.s); if (!s) return; const dd = c.sub === '회차 차감반';
  modal(`${s.n}회차 편집`, `<label class="fl">수업명<input name="t" value="${esc(s.title)}" maxlength="80"></label>${dd ? '' : `<div class="form2"><label>날짜<input name="d" type="date" value="${esc(s.date)}"></label><label>시작<input name="f" type="time" value="${esc(s.from)}"></label><label>종료<input name="o" type="time" value="${esc(s.to)}"></label></div>`}<label class="fl">장소<input name="p" value="${esc(s.place || '')}" maxlength="60"></label><p class="mini">공휴일 · 시설 휴일에 맞춰 날짜를 옮길 수 있습니다. 날짜를 바꾸면 ${esc(t('learner'))} · 보호자에게 알림이 발송됩니다.</p>`,
    [{ id: 'del', label: '회차 삭제', run: () => { setTimeout(() => ACT['w2-sdel']({ dataset: { c: c.id, s: s.id } })); } }, { id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const ti = fv(w, 't'); if (!ti) { toast('수업명을 입력하세요.', 'warn'); return false; } if (!dd) { const d = fv(w, 'd'); if (!w2Ok(d)) { toast('날짜를 입력하세요.', 'warn'); return false; } if (W2.dup(c, d, s.id)) { toast('이미 회차가 있는 날짜입니다.', 'warn'); return false; } const old = s.date; s.date = d; s.from = fv(w, 'f'); s.to = fv(w, 'o'); W2.renum(c); W2.period(c); W2.dateChanged(c, s, old); } s.title = ti.slice(0, 80); s.place = fv(w, 'p'); W2.sync(c); logAudit(`${c.name} 회차 편집 — ${s.title}`); save(); render(); toast('저장했습니다.', 'ok'); } }]); };
ACT['w2-sadd'] = el => { const c = C(el.dataset.v); if (!c) return; W2.norm(c); if (c.sessions.length >= 100) { toast('회차는 최대 100개까지 추가할 수 있습니다.', 'warn'); return; } const dd = c.sub === '회차 차감반';
  const d0 = el.dataset.d || (() => { let d = w2Ok(c.end) && c.end > today() ? today() : today(); for (let i = 0; i < 400 && W2.dup(c, d); i++) d = w2Add(d, 1); return d; })();
  if (el.dataset.d && W2.dup(c, d0)) { toast('이미 회차가 있는 날짜입니다.', 'warn'); return; }
  modal('회차 추가', `<label class="fl">수업명<input name="t" value="${c.sessions.length + 1}회차" maxlength="80"></label>${dd ? '<p class="mini">회차 차감반은 수업 일자를 지정하지 않습니다. 출석한 날이 수업 진행일로 기록됩니다.</p>' : `<div class="form2"><label>날짜<input name="d" type="date" value="${esc(d0)}"></label><label>시작<input name="f" type="time" value="${esc((c.time || {}).from || '')}"></label><label>종료<input name="o" type="time" value="${esc((c.time || {}).to || '')}"></label></div>`}<label class="fl">장소<input name="p" maxlength="60"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { const d = dd ? '' : fv(w, 'd'); if (!dd && !w2Ok(d)) { toast('날짜를 입력하세요.', 'warn'); return false; } if (W2.dup(c, d)) { toast('이미 회차가 생성된 날짜에는 추가로 회차를 만들 수 없습니다.', 'warn'); return false; }
      const s = { id: uid('se'), n: 0, date: d, from: dd ? '' : fv(w, 'f'), to: dd ? '' : fv(w, 'o'), title: fv(w, 't') || '', place: fv(w, 'p') }; c.sessions.push(s); W2.renum(c); W2.period(c); W2.sync(c); if (dd) c.credits.total = c.sessions.length; logAudit(`${c.name} 회차 추가 — ${s.title}`); save(); render(); toast(`${s.n}회차를 추가했습니다.`, 'ok'); } }]); };
ACT['w2-sdel'] = el => { const c = C(el.dataset.c); const s = c && c.sessions.find(x => x.id === el.dataset.s); if (!s) return; const n = Object.keys(c.att[s.id] || {}).length;
  modal(`${s.n}회차 삭제`, `${c.learners.length ? `<div class="warn">${esc(t('learner'))}이 있는 상황에서 회차를 삭제하면 ${esc(t('learner'))}의 출석률이 변경됩니다.${n ? ` 이 회차의 출결 기록 ${n}건도 함께 지워집니다.` : ''}</div>` : ''}<p>「${esc(s.title)}」${s.date ? ' (' + w2Fmt(s.date) + ')' : ''} 회차를 삭제할까요?</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'pri', run: () => { c.sessions = c.sessions.filter(x => x !== s); delete c.att[s.id]; delete c.attT[s.id]; c.curriculum = c.curriculum.filter(it => it.id !== s.id); W2.renum(c); W2.period(c); W2.sync(c); if (c.sub === '회차 차감반') c.credits.total = c.sessions.length; c.learners.forEach(mid => W2.recalc(c, mid)); logAudit(`${c.name} 회차 삭제 — ${s.title}`); save(); render(); toast('회차를 삭제했습니다. 출석률을 다시 계산했습니다.', 'ok'); } }]); };
/* 요일반 일정 변경 → 회차 재생성(같은 날짜 회차의 수업명 · 출결은 유지) */
ACT['w2-regen'] = el => { const c = C(el.dataset.v); if (!c) return; const ds = c.days || []; const tm = c.time || {};
  modal('수강 기간 · 요일 · 시간 변경', `<div class="warn">저장 후 일정을 변경하면 회차(커리큘럼)가 다시 생성됩니다. 같은 날짜의 회차는 수업명 · 출결이 유지되고, 없어지는 날짜의 회차와 출결 기록은 삭제됩니다.</div>${W2.schedForm(c.start, c.end, ds, tm.from, tm.to, !tm.from)}`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '회차 다시 만들기', kind: 'pri', run: w => { const r = W2.schedRead(w); if (!r) return false; const old = Object.fromEntries(c.sessions.filter(s => s.date).map(s => [s.date, s])); const g = W2.genWeekly(r.start, r.end, r.days, r.from, r.to); if (!g.length) { toast('선택한 기간 · 요일에 해당하는 날짜가 없습니다.', 'warn'); return false; }
      const keep = new Set(); c.sessions = g.map(s => { const o = old[s.date]; if (o) { keep.add(o.id); return { ...o, from: r.from, to: r.to }; } return s; }); Object.keys(c.att).forEach(k => { if (!keep.has(k) && !c.sessions.some(s => s.id === k)) { delete c.att[k]; delete c.attT[k]; } }); c.curriculum = c.curriculum.filter(it => it.type !== 'offline' || c.sessions.some(s => s.id === it.id) || !old[(it.at || '').slice(0, 10)]);
      c.days = r.days; c.time = { from: r.from, to: r.to }; c.start = r.start; c.end = r.end; W2.renum(c); W2.period(c); W2.sync(c); c.learners.forEach(mid => W2.recalc(c, mid)); if (c.learners.length) W2.notify(c.learners, '수업 일정 변경', `[${S.org.name}] 「${c.name}」 수업 일정이 ${w2DaysTxt(c)}(${c.start} ~ ${c.end})으로 변경되었습니다.`); logAudit(`${c.name} 요일반 일정 변경 — ${c.sessions.length}회차`); save(); render(); toast(`회차 ${c.sessions.length}개를 다시 만들었습니다.`, 'ok'); } }], true); };
W2.schedForm = (start, end, days, from, to, notime) => `<div class="form2"><label>수강 시작일<input type="date" name="w2s" id="w2s" value="${esc(start || today())}"></label><label>수강 종료일<input type="date" name="w2e" id="w2e" value="${esc(end || w2Add(today(), 90))}"></label></div>
  <div class="fl"><span>반복 요일</span><div class="w2days">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="w2d" value="${d}" ${days.includes(d) ? 'checked' : ''}><span>${W2.DAYS[d]}</span></label>`).join('')}</div></div>
  <div class="form2"><label>수업 시작 시간<input type="time" name="w2f" id="w2f" value="${esc(from || '')}"></label><label>수업 종료 시간<input type="time" name="w2t" id="w2t" value="${esc(to || '')}"></label></div><label class="ckl"><input type="checkbox" name="w2nt" id="w2nt" ${notime ? 'checked' : ''}> 시간 선택 안 함(회차별로 따로 정하거나 비워 둡니다)</label>`;
W2.schedRead = w => { const g = n => { const el = w.querySelector(`[name=${n}]`); return el ? el.value : ''; }; const start = g('w2s'), end = g('w2e'); const days = $$('[name=w2d]:checked', w).map(x => +x.value); const nt = (w.querySelector('[name=w2nt]') || {}).checked;
  if (!w2Ok(start) || !w2Ok(end) || end < start) { toast('수강 기간을 확인하세요.', 'warn'); return null; } if (!days.length) { toast('반복 요일을 1개 이상 선택하세요.', 'warn'); return null; } const from = nt ? '' : g('w2f'), to = nt ? '' : g('w2t'); if (from && to && to <= from) { toast('종료 시간이 시작 시간보다 빠릅니다.', 'warn'); return null; } return { start, end, days, from, to }; };
ACT['w2-credits'] = el => { const c = C(el.dataset.v); if (!c) return; const used = Math.max(0, ...c.learners.map(mid => W2.used(c, mid)));
  modal('수업 횟수 · 소진 기간', `<div class="form2"><label>수업 횟수(최대 100)<input name="n" type="number" min="${Math.max(1, used)}" max="100" value="${(c.credits || {}).total}"></label><label>소진 기간(일)<input name="d" type="number" min="1" max="730" value="${(c.credits || {}).days || 90}"></label></div><p class="mini">${esc(t('learner'))}이 출석할 때마다 1회씩 차감되며, 신청일부터 소진 기간 안에 사용해야 합니다. 이미 사용한 회차(최대 ${used}회)보다 줄일 수 없습니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const n = clamp(+fv(w, 'n') || 1, Math.max(1, used), 100); const d = clamp(+fv(w, 'd') || 90, 1, 730); while (c.sessions.length < n) c.sessions.push({ id: uid('se'), n: 0, date: '', from: '', to: '', title: '', place: '' }); while (c.sessions.length > n) { const s = c.sessions.pop(); delete c.att[s.id]; delete c.attT[s.id]; c.curriculum = c.curriculum.filter(it => it.id !== s.id); } c.credits = { total: n, days: d }; W2.renum(c); W2.sync(c); logAudit(`${c.name} 수업 횟수 ${n}회 · 소진 ${d}일`); save(); render(); toast('저장했습니다.', 'ok'); } }]); };
ACT['w2-csv'] = el => { const c = C(el.dataset.v); const U = W2.units(c); downloadCSV(`${c.name}_출결현황.csv`, ['이름', ...U.map(u => (c.kind === 'episode' ? u.n + '회차 ' : '') + (u.date || '')), '출석률', '남은 회차'], c.learners.map(mid => [M(mid)?.name || mid, ...U.map(u => W2.get(c, u.id, mid)), (W2.rate(c, mid) ?? '') + '', W2.remain(c, mid) ?? ''])); };
/* 회차 클래스의 커리큘럼 삭제 경로도 회차 삭제(경고 포함)로 */
{ const base = ACT['cur-del']; ACT['cur-del'] = el => { const c = C(el.dataset.c); const it = c && c.curriculum[+el.dataset.v]; if (c && c.kind === 'episode' && it && (c.sessions || []).some(s => s.id === it.id)) return ACT['w2-sdel']({ dataset: { c: c.id, s: it.id } }); return base(el); }; }
/* 기간 · 구독 클래스 '+ 항목'에 오프라인 강의 허용(레거시: 동영상 · 라이브 · 오프라인 · 시험 · 과제 · 설문) */
{ const base = ACT['cur-add']; ACT['cur-add'] = el => { const c = C(el.dataset.v); if (!c || c.kind === 'episode') return base(el);
  modal('커리큘럼 항목 추가', `<label class="fl">항목 종류<select name="ty">${Object.entries(typeof ITEMX !== 'undefined' ? ITEMX : ITEM).filter(([k]) => ['chapter', 'video', 'live', 'offline', 'doc', 'quiz', 'exam', 'assign', 'survey'].includes(k)).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label class="fl">제목<input name="t" maxlength="80"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { if (!fv(w, 't')) return false; c.curriculum.push({ id: uid('it'), type: fv(w, 'ty'), title: fv(w, 't') }); save(); render(); } }]); }; }

/* 커리큘럼 탭: 라이브 · 오프라인 행에 [출석관리] */
{ const base = itemRow; itemRow = (c, it, i) => { const h = base(c, it, i); if (!['live', 'offline'].includes(it.type) || !c.learners || (c.kind === 'episode' && (c.sessions || []).some(s => s.id === it.id))) return h; const ok = c.learners.filter(mid => ['출석', '지각', '조퇴'].includes(W2.get(c, it.id, mid))).length; return h.replace('<span class="sp"></span>', `<span class="sp"></span><button class="btn sm ghost" data-act="w2-satt" data-c="${c.id}" data-s="${it.id}">출석관리 ${ok}/${c.learners.length}</button>`); }; }
AFTER.push(() => { if (CUR.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); if (!c || !c.weekly) return; $$('.weeks [data-act="item-edit"]').forEach(b => { const it = c.curriculum[+b.dataset.v]; if (!it || !['live', 'offline'].includes(it.type) || b.parentElement.querySelector('[data-act="w2-satt"]')) return; b.insertAdjacentHTML('afterend', ` <button class="btn sm ghost" data-act="w2-satt" data-c="${c.id}" data-s="${it.id}">출석관리</button>`); }); });
/* 항목 편집기: 라이브 출석 인정 시간 · 회차 동기화 */
{ const base = edRender; edRender = (...a) => { base(...a); const b = $('#edBody'); if (!b || !ED) return; const it = ED.it;
  if (it.type === 'live' && !b.querySelector('[data-ed="attMin"]')) b.insertAdjacentHTML('beforeend', `<div class="form2 w2ed"><label>출석 인정 최소 참여 시간(분, 0이면 입장만으로 출석)<input type="number" min="0" max="600" data-ed="attMin" value="${esc(it.attMin || 0)}"></label><label>지각 기준(시작 후 분)<input type="number" min="0" max="120" data-ed="lateMin" value="${esc(it.lateMin ?? 10)}"></label></div><p class="mini">일정 안에 강의실에 입장하면 출석으로 기록됩니다. 참여 시간이 인정 시간보다 짧으면 조퇴로 기록되며, 출결은 클래스 상세의 [출석관리]에서 바꿀 수 있습니다.</p>`);
  if (it.type === 'offline' && ED.c.kind !== 'episode' && !b.querySelector('.w2edo')) b.insertAdjacentHTML('beforeend', '<p class="mini w2edo">출석은 출결패드(휴대폰 끝 4자리) 또는 커리큘럼 탭의 [출석관리]에서 직접 입력합니다.</p>'); }; }
{ const base = edSave; edSave = (...a) => { const ctx = ED ? { c: ED.c, id: ED.it.id } : null; const r = base(...a); if (r === false || !ctx || ctx.c.kind !== 'episode') return r; const c = ctx.c; const it = c.curriculum.find(x => x.id === ctx.id); const s = (c.sessions || []).find(x => x.id === ctx.id);
  if (it && s) { s.title = it.title; s.place = it.place || s.place; const d = String(it.at || '').slice(0, 10); if (w2Ok(d) && d !== s.date && c.sub !== '회차 차감반') { if (W2.dup(c, d, s.id)) toast('이미 회차가 있는 날짜라 날짜는 바꾸지 않았습니다.', 'warn'); else { const old = s.date; s.date = d; s.from = String(it.at).slice(11, 16) || s.from; W2.renum(c); W2.period(c); W2.dateChanged(c, s, old); } } W2.sync(c); save(); } return r; }; }

/* ── 클래스 상세 감싸기 ── */
{ const base = classDetail; classDetail = c => { W2.norm(c); let h = base(c); const tb = UI.clsT || 'learners';
  if (c.kind === 'episode' && (tb === 'episodes' || tb === 'curriculum')) { const cv = curriculumView(c); const i = h.lastIndexOf(cv); const mine = W2.epView(c); h = i >= 0 ? h.slice(0, i) + mine + h.slice(i + cv.length) : h + mine; }
  if (tb === 'set') h = W2.setTab(c, h);
  if (tb === 'learners' && c.kind === 'sub') h += W2.subCard(c);
  if (tb === 'learners' && c.kind === 'episode') h += `<p class="mini">이름을 누르면 회차별 출결 이력을 봅니다. ${c.sub === '회차 차감반' ? '잔여 회차는 출석할 때마다 1회씩 차감됩니다.' : ''}</p>`;
  return h; }; }
/* 수강생 표에 열 추가(다른 담당의 열은 그대로 두고 DOM으로 덧붙임) */
AFTER.push(() => { if (CUR.tab !== 'class' || !UI.cls || (UI.clsT || 'learners') !== 'learners') return; const c = C(UI.cls); if (!c || !['episode', 'sub'].includes(c.kind)) return; const tb = $$('#app table').find(x => x.querySelector('tbody input.ck')); if (!tb || tb.dataset.w2) return; tb.dataset.w2 = '1';
  const H = c.kind === 'episode' ? ['출결', c.sub === '회차 차감반' ? '잔여 회차' : '남은 회차'] : ['구독 상태', '구독 회차', '구독 시작일', '다음 결제일', '종료일'];
  const hr = tb.querySelector('thead tr'); const lastH = hr.lastElementChild; H.forEach(x => { const th = document.createElement('th'); th.textContent = x; hr.insertBefore(th, lastH); });
  tb.querySelectorAll('tbody tr').forEach(tr => { const ck = tr.querySelector('input.ck'); if (!ck) return; const mid = ck.value; const lastD = tr.lastElementChild; let cells;
    if (c.kind === 'episode') { const n = W2.cnt(c, mid); cells = [`<button class="link" data-act="w2-hist" data-c="${c.id}" data-m="${mid}">출 ${n.출석} · 지 ${n.지각} · 결 ${n.결석}</button>`, `${W2.remain(c, mid)}회${c.sub === '회차 차감반' ? `<small class="mini"> / ${(c.credits || {}).total}회 · ~${W2.creditEnd(c, mid)}</small>` : ''}`]; }
    else { const s = W2.subOf(c.id, mid); cells = s ? [tag(W2.subLabel(s), W2.SUBTONE[s.status]), `${W2.subN(s)}${c.subsc.count ? ' / ' + c.subsc.count : ' / 무제한'}${s.grant ? ' <small class="mini">(부여)</small>' : ''}`, esc(s.start), s.status === '구독중' || s.status === '결제 실패' ? esc(s.next) : '—', esc(s.end || '—')] : ['—', '—', '—', '—', '—']; }
    cells.forEach(x => { const td = document.createElement('td'); td.innerHTML = x; tr.insertBefore(td, lastD); }); });
  const bar = $('#app .bar2'); if (bar && c.kind === 'sub' && !bar.querySelector('[data-w2n]')) bar.insertAdjacentHTML('beforeend', '<span class="mini" data-w2n>구독 클래스는 기간 연장 대신 회차로 관리합니다. [권한 제외]는 현재 회차까지 수강 후 만료됩니다.</span>'); });

/* ── 설정 탭: 배속 · 건너뛰기 · 회차 일정 · 구독 설정 ── */
W2.setTab = (c, h) => { h = h.replace(/<label class="ckl"><input type="checkbox"[^>]*data-k="skip"[^>]*>[^<]*<\/label>/, '').replace(/<label class="ckl"><input type="checkbox"[^>]*data-k="speed"[^>]*>[^<]*<\/label>/, '');
  const sp = c.speed; const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  let x = `<div class="card w2set"><div class="ch"><b>동영상 재생 규칙</b><small>학습자 플레이어에 바로 적용</small></div><div class="form2">
    <label>동영상 건너뛰기<select data-chg="w2-cset" data-c="${c.id}" data-k="skip"><option value="free" ${c.skip === 'free' ? 'selected' : ''}>가능 — 재생 바 이동 · 앞/뒤 5초</option><option value="watched" ${c.skip === 'watched' ? 'selected' : ''}>불가 — 이미 본 구간(뒤)만 이동</option><option value="none" ${c.skip === 'none' ? 'selected' : ''}>불가 — 앞으로 이동 금지(되감기만)</option></select></label>
    <label class="ckl"><input type="checkbox" data-chg="w2-cset" data-c="${c.id}" data-k="speed.on" ${sp.on ? 'checked' : ''}> 배속 재생 허용(불가 시 1배속만)</label>
    <label>최저 배속<select data-chg="w2-cset" data-c="${c.id}" data-k="speed.min" ${sp.on ? '' : 'disabled'}>${rates.filter(r => r <= 1).map(r => `<option ${+sp.min === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
    <label>최고 배속<select data-chg="w2-cset" data-c="${c.id}" data-k="speed.max" ${sp.on ? '' : 'disabled'}>${rates.filter(r => r >= 1).map(r => `<option ${+sp.max === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label></div>
    <p class="mini">건너뛰기를 허용하면 진도는 건너뛰기 전까지만 기록되고, 다시 들어왔을 때 건너뛰기 전 위치부터 진도를 확인합니다. 진도 기록이 중요한 클래스(법정의무 · 수료증)는 '불가'로 두세요. 기관 전체 기본값은 설정 › 서비스의 배속 범위를 따릅니다.</p></div>`;
  if (c.kind === 'episode') x += `<div class="card w2set"><div class="ch"><b>회차 일정</b><small>${esc(c.sub)}</small></div><p>${c.sub === '요일반' ? `${esc(w2DaysTxt(c) || '요일 미지정')} · ${esc(c.start)} ~ ${esc(c.end)} <button class="btn sm" data-act="w2-regen" data-v="${c.id}">일정 변경</button>` : c.sub === '특강반' ? `회차 ${c.sessions.length}개 · 첫 수업일 ${esc(c.start)} ~ 마지막 수업일 ${esc(c.end)}(수강 기간 자동)` : `수업 ${(c.credits || {}).total}회 · 소진 기간 ${(c.credits || {}).days}일 <button class="btn sm" data-act="w2-credits" data-v="${c.id}">변경</button>`}</p>${c.sub !== '회차 차감반' ? '<p class="mini">수강 신청(모집) 기간은 수강 기간을 넘을 수 없습니다.</p>' : ''}${W2.rcWarn(c)}</div>`;
  if (c.kind === 'sub') { const s = c.subsc; const ended = !!s.saleEnd;
    x += `<div class="card w2set"><div class="ch"><b>구독 설정</b>${ended ? tag('판매 종료 ' + s.saleEnd, 'r') : tag('판매 중', 'g')}</div><div class="form2">
      <label>구독 회차(변경 불가)<input value="${s.count ? `최대 ${s.count}회차 — 도달 시 자동 만료` : '무제한 — 구독 취소 전까지'}" disabled></label>
      <label>결제 주기<input value="매월(최초 결제일과 같은 날)" disabled></label>
      <label>구독 시작일(비우면 결제 즉시 시작)<input type="date" value="${esc(s.start || '')}" data-chg="w2-cset" data-c="${c.id}" data-k="subsc.start" ${ended ? 'disabled' : ''}></label>
      <label>결제 실패 시 재시도(기관 공통)<select data-chg="w2-retry">${[1, 2, 3].map(n => `<option value="${n}" ${w2Retry() === n ? 'selected' : ''}>${n}회</option>`).join('')}</select></label>
      <label class="ckl"><input type="checkbox" data-chg="w2-cset" data-c="${c.id}" data-k="subsc.rc.on" ${s.rc.on ? 'checked' : ''} ${ended ? 'disabled' : ''}> 정기 모집(매월 같은 기간 반복)</label>
      <label>매월 모집 기간<span class="w2rc"><input type="number" min="1" max="31" value="${s.rc.from}" data-chg="w2-cset" data-c="${c.id}" data-k="subsc.rc.from" aria-label="모집 시작일" ${s.rc.on ? '' : 'disabled'}>일 ~ <input type="number" min="1" max="31" value="${s.rc.to}" data-chg="w2-cset" data-c="${c.id}" data-k="subsc.rc.to" aria-label="모집 종료일" ${s.rc.on ? '' : 'disabled'}>일</span></label></div>
      <p class="mini">결제 실패 시 바로 회수하지 않고 재시도 기간 동안 수강 권한을 유지하며, 마지막 재시도까지 실패하면 자동 만료됩니다. 만료되면 수강 · 과제 제출 · 출석 등 새 학습 기능이 제한됩니다. 구독 클래스는 수료 기준을 둘 수 없고 수료증은 수동으로 발급합니다.</p>
      <div class="w2danger danger"><button class="btn sm red" data-act="w2-saleend" data-v="${c.id}" ${ended ? 'disabled' : ''}>판매 종료</button><small>판매를 종료하면 신규 신청과 기존 ${esc(t('learner'))}의 정기 결제가 모두 중단되며, 다시 판매 중으로 바꿀 수 없습니다(복사해서 새 클래스로 판매).</small></div></div>`; }
  const i = h.indexOf('<div class="danger">'); return i >= 0 ? h.slice(0, i) + `</div>${x}<div class="form2">` + h.slice(i) : h + x; };
W2.rcWarn = c => { const r = c.recruit; if (!r || !r.on || c.sub === '회차 차감반') return ''; return (r.to && c.end && r.to > c.end) ? `<div class="warn">모집 종료일(${esc(r.to)})이 수강 종료일(${esc(c.end)})보다 늦습니다. 수강 기간 안으로 맞춰 주세요.</div>` : ''; };
ACT['w2-cset'] = el => { const c = C(el.dataset.c); if (!c) return; const p = el.dataset.k.split('.'); let o = c; for (let i = 0; i < p.length - 1; i++) o = o[p[i]] = o[p[i]] || {}; const k = p[p.length - 1];
  let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? clamp(+el.value || 1, 1, 31) : el.value; if (k === 'min' || k === 'max') v = +v; if (k === 'start' && v && v < today()) { toast('구독 시작일은 오늘 이후로 지정하세요.', 'warn'); el.value = o[k] || ''; return; }
  o[k] = v; if (c.speed.min > 1) c.speed.min = 1; if (c.speed.max < 1) c.speed.max = 1; if (c.kind === 'sub' && c.subsc.rc.from > c.subsc.rc.to) toast('모집 시작일이 종료일보다 늦습니다.', 'warn');
  logAudit(`${c.name} 설정 변경 — ${el.dataset.k}`); save(); if (el.type === 'checkbox') render(); toast('저장했습니다.', 'ok'); };
ACT['w2-retry'] = el => { S.settings.subRetry = clamp(+el.value || 3, 1, 3); logAudit(`구독 결제 재시도 ${S.settings.subRetry}회`); save(); toast('저장했습니다.', 'ok'); };
ACT['w2-saleend'] = el => { const c = C(el.dataset.v); if (!c || c.subsc.saleEnd) return; const act = (S.subs || []).filter(s => s.cls === c.id && ['구독중', '결제 실패'].includes(s.status));
  modal('판매 종료', `<div class="warn">판매를 종료하면 되돌릴 수 없습니다.</div><ul class="mini"><li>신규 수강 신청이 막힙니다.</li><li>기존 ${esc(t('learner'))} ${act.length}명의 정기 결제가 중단되고, 이번 회차가 끝나면 만료됩니다.</li><li>다시 판매하려면 클래스를 복사해 새 클래스로 판매하세요.</li></ul>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '판매 종료', kind: 'pri', run: () => { W2.saleEnd(c); logAudit(`${c.name} 구독 판매 종료`); save(); render(); toast('판매를 종료했습니다.', 'ok'); } }]); };
/* 판매 종료(구독): 신규 신청 중단 + 기존 정기 결제 중단(이번 회차 후 만료). W1 판매 상태(c.sale)와 동기화 */
W2.saleEnd = c => { c.subsc.saleEnd = c.subsc.saleEnd || today(); c.sale = '판매 종료'; const act = (S.subs || []).filter(s => s.cls === c.id && ['구독중', '결제 실패'].includes(s.status));
  act.forEach(s => { s.end = s.status === '결제 실패' ? today() : s.next; s.status = '해지 예약'; s.endReason = '판매 종료'; s.failNext = false; }); if (act.length) W2.notify(act.map(s => s.who), '구독 판매 종료 안내', `[${S.org.name}] 「${c.name}」 구독 판매가 종료되어 다음 결제가 진행되지 않습니다. 이번 회차는 끝까지 수강할 수 있습니다.`); };

/* ═════════ 구독(S.subs) 수명주기 ═════════ */
W2.subOf = (cid, mid) => { const L = (S.subs || []).filter(s => s.cls === cid && s.who === mid); return L.find(s => s.status !== '해지') || L[L.length - 1] || null; };
W2.subN = s => (s.base || 0) + (s.n || 0);
W2.subLabel = s => s.status === '결제 실패' ? `결제 실패 (재시도 ${s.retry || 0}/${w2Retry()})` : s.status === '해지' ? `해지${s.endReason ? ' · ' + s.endReason : ''}` : s.status;
W2.pay = (s, c, at) => { S.pays = S.pays || []; const amt = typeof sl2NetPrice === 'function' ? sl2NetPrice(c) : typeof c2NetPrice === 'function' ? c2NetPrice(c) : c.price || 0; const p = { id: uid('pay'), at: at || today(), who: s.who, item: `${c.name} (${W2.subN(s) + 1}회차 구독)`, itemType: 'sub', ref: c.id, sub: s.id, amount: +amt || 0, method: s.card || s.method || '카드(정기)', status: '결제 완료' }; S.pays.unshift(p); s.pay = p.id; /* 운영: 토스페이먼츠 빌링키 자동 결제 API */ return p; };
W2.subEnd = (s, why, at) => { s.status = '해지'; s.endReason = why; s.end = at || today(); s.failNext = false; const c = C(s.cls); if (c) { c.enr = c.enr || {}; c.enr[s.who] = { ...(c.enr[s.who] || { at: s.start, src: 'pay', paid: null }), status: 'ended', end: s.end }; } };
/* 결제일 처리: 정기 결제 · 최대 회차 만료 · 해지 예약 만료 · 결제 실패 재시도 */
W2.subTick = () => { if (!S || !Array.isArray(S.subs)) return 0; let ch = 0; const T = today();
  S.subs.forEach(s => { const c = C(s.cls); if (!c) return; const max = s.grant ? s.grant + (s.base || 0) : (c.subsc || {}).count || 0; let guard = 0;
    while (s.status === '구독중' && s.next && s.next <= T && guard++ < 24) { ch++;
      if ((c.subsc || {}).saleEnd) { W2.subEnd(s, '판매 종료', s.next); break; }
      if (max && W2.subN(s) >= max) { W2.subEnd(s, s.grant ? '부여 회차 종료' : '최대 회차 도달', s.next); break; }
      if (s.grant) { s.n++; s.next = w2AddM(s.next, 1); continue; }
      if (s.failNext) { s.status = '결제 실패'; s.retry = 0; s.retryAt = w2Add(s.next, 1); W2.notify([s.who], '구독 결제 실패', `[${S.org.name}] 「${c.name}」 정기 결제에 실패했습니다. 결제 수단을 확인해 주세요. 재시도 기간에는 계속 수강할 수 있습니다.`); break; }
      W2.pay(s, c, s.next); s.n++; s.next = w2AddM(s.next, 1); }
    while (s.status === '결제 실패' && s.retryAt && s.retryAt <= T && guard++ < 24) { ch++; s.retry = (s.retry || 0) + 1;
      if (!s.failNext) { W2.pay(s, c, s.retryAt); s.n++; s.status = '구독중'; s.next = w2AddM(s.next, 1); s.retryAt = ''; break; }
      if (s.retry >= w2Retry()) { W2.subEnd(s, '결제 실패', s.retryAt); W2.notify([s.who], '구독 만료', `[${S.org.name}] 「${c.name}」 정기 결제가 ${s.retry}회 재시도 후에도 실패해 구독이 만료되었습니다.`); break; }
      s.retryAt = w2Add(s.retryAt, 1); }
    if (s.status === '해지 예약' && s.end && s.end <= T) { W2.subEnd(s, s.endReason || '구독 취소', s.end); ch++; } });
  return ch; };
/* 공용: 구독 시작 · 재구독(W4 결제 완료 시 호출) */
function w2SubStart(cid, mid, payId) { const c = C(cid); if (!c || c.kind !== 'sub') return { err: '구독 클래스가 아닙니다.' }; W2.norm(c); if (c.subsc.saleEnd) return { err: '판매가 종료된 클래스입니다.' };
  const cur = (S.subs || []).find(s => s.cls === cid && s.who === mid && s.status !== '해지'); if (cur) return { sub: cur, err: cur.status === '해지 예약' ? '' : '' };
  const prev = (S.subs || []).filter(s => s.cls === cid && s.who === mid && s.status === '해지'); const base = prev.reduce((a, s) => a + (s.n || 0), 0);
  if (c.subsc.count && base >= c.subsc.count) return { err: `최대 구독 회차(${c.subsc.count}회)를 모두 사용해 다시 구독할 수 없습니다.` };
  const start = c.subsc.start && c.subsc.start > today() ? c.subsc.start : today(); const s = { id: uid('sb'), cls: cid, who: mid, status: '구독중', n: 1, base, start, next: w2AddM(start, 1), end: '', retry: 0, card: '카드(정기)', pay: payId || null };
  S.subs = S.subs || []; S.subs.push(s); if (!c.learners.includes(mid)) c.learners.push(mid); c.prog[mid] = c.prog[mid] || { p: 0, exam: null, assign: 'none', att: 100 }; c.enr = c.enr || {}; c.enr[mid] = { at: today(), end: null, src: payId ? 'pay' : 'self', status: 'active', paid: payId || null };
  logAudit(`${c.name} 구독 시작 — ${M(mid)?.name || mid}${base ? ` (재구독, 이전 ${base}회차 합산)` : ''}`); return { sub: s }; }
function w2SubCancel(subId, by) { const s = (S.subs || []).find(x => x.id === subId); if (!s || !['구독중', '결제 실패'].includes(s.status)) return false; s.status = '해지 예약'; s.end = s.retryAt ? today() : s.next; s.endReason = by === 'admin' ? '수강 제외' : '구독 취소'; s.failNext = false; return true; }
/* 환불(W4 환불 승인 시 호출): 현재 회차만 환불, 즉시 권한 회수 */
function w2SubRefund(subId) { const s = (S.subs || []).find(x => x.id === subId); if (!s) return false; W2.subEnd(s, '환불'); return true; }
/* 후기 조건: 구독 클래스는 2회차 이상 진행(만료 포함) */
function w2CanReview(cid, mid) { const c = C(cid); if (!c || c.kind !== 'sub') return true; return (S.subs || []).filter(s => s.cls === cid && s.who === mid).reduce((a, s) => a + (s.n || 0), 0) >= 2; }
W2.subCard = c => { const L = (S.subs || []).filter(s => s.cls === c.id); const k = st => L.filter(s => s.status === st).length;
  return `<div class="card w2subc"><div class="ch"><b>구독 현황</b><small>매월 최초 결제일과 같은 날 자동 결제 · 결제 실패 시 ${w2Retry()}회 재시도</small><span class="sp"></span><button class="btn sm" data-act="w2-subrun">결제일 처리 실행</button></div>
    <section class="grid g4">${kpi('구독중', k('구독중') + '명', '', 'g')}${kpi('해지 예약', k('해지 예약') + '명')}${kpi('결제 실패', k('결제 실패') + '명', '', k('결제 실패') ? 'y' : '')}${kpi('해지 · 만료', k('해지') + '명')}</section>
    ${table(['이름', '상태', '회차', '시작일', '다음 결제일', '종료일', '결제 수단', '데모 · 관리'], L.map(s => [mn(s.who), tag(W2.subLabel(s), W2.SUBTONE[s.status]), `${W2.subN(s)}${c.subsc.count ? '/' + c.subsc.count : ''}`, esc(s.start), s.status === '결제 실패' ? `재시도 ${esc(s.retryAt || '')}` : s.status === '구독중' ? esc(s.next) : '—', esc(s.end || '—'), esc(s.card || s.method || '—'),
      s.status === '구독중' ? `<button class="btn sm ghost" data-act="w2-subdemo" data-v="${s.id}" data-k="ok">다음 결제 진행</button><button class="btn sm ghost" data-act="w2-subdemo" data-v="${s.id}" data-k="fail">결제 실패</button>` : s.status === '결제 실패' ? `<button class="btn sm ghost" data-act="w2-subdemo" data-v="${s.id}" data-k="retry">재시도 실행</button><button class="btn sm ghost" data-act="w2-subdemo" data-v="${s.id}" data-k="fix">결제 수단 갱신</button>` : s.status === '해지 예약' && s.endReason !== '판매 종료' ? `<button class="btn sm ghost" data-act="w2-subdemo" data-v="${s.id}" data-k="undo">해지 예약 취소</button>` : '']), '구독자가 없습니다.')}
    <p class="mini">데모 버튼은 결제일을 앞당겨 정기 결제 · 실패 · 재시도를 확인하는 용도입니다. 운영에서는 토스페이먼츠 정기 결제(빌링키)로 자동 처리됩니다.</p></div>`; };
ACT['w2-subrun'] = () => { const n = W2.subTick(); save(); render(); toast(n ? `결제일 처리 ${n}건을 반영했습니다.` : '오늘 처리할 결제가 없습니다.', n ? 'ok' : ''); };
ACT['w2-subdemo'] = el => { const s = (S.subs || []).find(x => x.id === el.dataset.v); if (!s) return; const k = el.dataset.k;
  if (k === 'ok') { s.failNext = false; s.next = today(); } if (k === 'fail') { s.failNext = true; s.next = today(); } if (k === 'retry') s.retryAt = today(); if (k === 'fix') { s.failNext = false; s.retryAt = today(); s.card = '카드(정기) 갱신'; } if (k === 'undo') { s.status = '구독중'; s.end = ''; s.endReason = ''; }
  W2.subTick(); logAudit(`구독 ${k} — ${M(s.who)?.name || ''}`); save(); render(); toast({ ok: '정기 결제를 진행했습니다.', fail: '결제 실패로 처리했습니다. 재시도 기간에는 수강 권한이 유지됩니다.', retry: '재시도를 실행했습니다.', fix: '결제 수단을 갱신하고 재결제했습니다.', undo: '해지 예약을 취소했습니다.' }[k], 'ok'); };
/* 구독 클래스: 권한 부여 = 설정 회차만큼(결제 없이), 권한 제외 = 현재 회차까지 수강 후 만료 */
{ const base = ACT['cls-grant']; ACT['cls-grant'] = el => { const c = C(el.dataset.v); if (!c || c.kind !== 'sub') return base(el); W2.norm(c); if (c.subsc.saleEnd) { toast('판매 종료된 구독 클래스에는 권한을 부여할 수 없습니다.', 'warn'); return; }
  const avail = S.members.filter(m => !['승인 대기', '거절'].includes(m.grade) && !(S.subs || []).some(s => s.cls === c.id && s.who === m.id && s.status !== '해지'));
  modal('수강 권한 부여(구독)', `<div class="warn">결제 없이 설정한 회차만큼 수강 권한을 부여합니다. 부여 받은 ${esc(t('learner'))}에게 알림이 발송되며 즉시 수강할 수 있습니다.</div>
    <label class="fl">${esc(t('group'))} 단위로 부여<select name="grp"><option value="">— 선택 안 함 —</option>${(S.groups || []).map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label>
    <div class="fl"><span>개별 선택 (${avail.length}명)</span><div class="chk">${avail.map(m => `<label><input type="checkbox" name="mm" value="${m.id}"> ${esc(m.name || m.sid || m.id)}</label>`).join('') || '<small class="mini">부여할 수 있는 회원이 없습니다.</small>'}</div></div>
    <label class="fl">부여 회차(1~999)<input name="rounds" type="number" min="1" max="999" value="1"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '부여', kind: 'pri', run: w => { const ids = new Set($$('[name=mm]:checked', w).map(x => x.value)); const g = fv(w, 'grp'); if (g) avail.filter(m => m.group === g || m.team === g).forEach(m => ids.add(m.id)); const n = clamp(+fv(w, 'rounds') || 1, 1, 999); if (!ids.size) { toast('부여할 회원을 선택하세요.', 'warn'); return false; }
      ids.forEach(mid => { const r = w2SubStart(c.id, mid, null); if (r.sub) { r.sub.grant = n; r.sub.card = '권한 부여(결제 없음)'; c.enr[mid].src = 'admin'; c.enr[mid].rounds = n; } }); W2.notify([...ids], '수강 권한 부여', `[${S.org.name}] 「${c.name}」 수강 권한(${n}회차)이 부여되었습니다. 지금 바로 수강할 수 있습니다.`); logAudit(`${c.name} 구독 권한 부여 ${ids.size}명 · ${n}회차`); save(); render(); toast(`${ids.size}명에게 ${n}회차 권한을 부여했습니다.`, 'ok'); } }]); }; }
{ const base = ACT['cls-revoke']; ACT['cls-revoke'] = el => { const c = C(el.dataset.c); if (!c || c.kind !== 'sub') return base(el); const s = W2.subOf(c.id, el.dataset.v); if (!s || s.status === '해지') return base(el);
  modal('수강 제외(구독)', `<p>${mn(el.dataset.v)} ${esc(t('learner'))}을 수강 제외할까요?</p><p class="mini">구독 클래스는 즉시 삭제되지 않고 현재 회차(${esc(s.next || today())}까지)만 수강한 뒤 만료됩니다. 다음 결제는 진행되지 않습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '수강 제외', kind: 'pri', run: () => { w2SubCancel(s.id, 'admin'); logAudit(`${c.name} 구독 수강 제외(현재 회차 후 만료) — ${M(s.who)?.name || ''}`); save(); render(); toast('현재 회차까지 수강 후 만료되도록 처리했습니다.', 'ok'); } }]); }; }

/* ═════════ 출결 메뉴 · 출결패드(키오스크) ═════════ */
VIEWS.attend = () => { W2.all(); const eps = S.classes.filter(c => W2.hasUnits(c) || S.org.type === 'voc'); const c = C(UI.attC) && eps.includes(C(UI.attC)) ? C(UI.attC) : eps[0];
  const hd = head('출결', `회차 클래스 · 기간 클래스의 라이브/오프라인 강의 출결 · 출결패드(휴대폰 끝 4자리) · 출결 변경 시 ${esc(t('learner'))} · 보호자 자동 알림 ${guideRef('features/class/operate.md')}`, `<button class="btn" data-act="w2-kiolink">키오스크 주소 복사</button><button class="btn pri" data-act="cls-pad">출결패드 실행하기</button>`);
  if (!c) return hd + '<div class="empty">출결을 받을 회차 클래스나 라이브 · 오프라인 강의가 없습니다. 클래스 만들기에서 회차 클래스(요일반 · 특강반 · 회차 차감반)를 만들거나 기간 클래스에 오프라인 강의를 추가하세요.</div>';
  const td = W2.units(c).filter(u => u.date === today());
  return hd + `<div class="bar2"><select data-chg="attSel" aria-label="${esc(t('cls'))} 선택">${eps.map(x => `<option value="${x.id}" ${x === c ? 'selected' : ''}>${esc(x.name)} · ${esc(KIND[x.kind] + (x.sub ? ' ' + x.sub : ''))}</option>`).join('')}</select>${td.map(u => `<button class="btn sm" data-act="w2-satt" data-c="${c.id}" data-s="${u.id}">오늘 ${c.kind === 'episode' ? u.n + '회차' : esc(u.title)} 출결</button>`).join('')}<button class="btn sm ghost" data-act="w2-csv" data-v="${c.id}">CSV</button><span class="mini">운영자가 직접 처리한 회차는 ${esc(t('learner'))} · 보호자 화면에 출석 시간이 표시되지 않습니다.</span></div>` + W2.matrix(c) +
    (lowAtt().length ? `<div class="card"><div class="ch"><b>출석률 80% 미만</b><button class="btn sm ai" data-act="auto-run-id" data-v="att-warn">✦ 경고 메시지 자동 발송</button></div>${lowAtt().slice(0, 8).map(x => `<div class="row"><span>${mn(x.id)} · ${esc(x.c.name)}</span><b class="r">${pct(x.att)}</b></div>`).join('')}</div>` : ''); };
ACT['w2-kiolink'] = () => { const u = location.origin + location.pathname + '?kiosk=pad'; try { navigator.clipboard.writeText(u).catch(() => { }); } catch (e) { } modal('출결패드 키오스크', `<p class="mini">태블릿에서 아래 주소를 열면 출결패드 전용 화면이 바로 열립니다. 같은 기기 · 브라우저에 스튜디오가 로그인되어 있어야 합니다(데모).</p><label class="fl">주소<input value="${esc(u)}" readonly></label>`, [{ id: 'c', label: '닫기', kind: 'pri' }]); };
/* 오늘 출석할 수 있는 수업: 날짜가 오늘인 회차 · 강의 + 회차 차감반(잔여 회차 · 소진 기한 안) */
W2.todayFor = mid => { const out = []; S.classes.filter(c => c.status !== '종료' && c.learners.includes(mid) && W2.hasUnits(c)).forEach(c => { W2.norm(c);
  if (c.kind === 'episode' && c.sub === '회차 차감반') { if (W2.remain(c, mid) <= 0 || W2.creditEnd(c, mid) < today()) return; const done = c.sessions.find(s => ((c.attT[s.id] || {})[mid] || {}).date === today() && W2.get(c, s.id, mid)); const X = W2.ex(c, mid); const s = done || c.sessions.find(s => !X.has(s.id) && !W2.get(c, s.id, mid)); if (s) out.push({ c, u: { ...s }, credit: true }); return; }
  W2.mine(c, mid).filter(u => u.date === today()).forEach(u => out.push({ c, u })); }); return out; };
W2.padMark = (c, u, mid) => { const k = u.id; const tm = ((c.attT[k] || {})[mid]) || {}; const now = w2Now();
  if (W2.get(c, k, mid) && tm.by === 'pad' && tm.date === today() && tm.in && !tm.out) { tm.out = now; save(); return `${now} 종료 시간을 기록했습니다.`; }
  if (W2.get(c, k, mid) && tm.date === today()) return `이미 출결이 입력되어 있습니다(${W2.get(c, k, mid)}).`;
  const st = u.from && w2Min(now) > w2Min(u.from) + 10 ? '지각' : '출석';
  c.att[k] = c.att[k] || {}; c.attT[k] = c.attT[k] || {}; c.attT[k][mid] = { date: today(), in: now, out: '', by: 'pad' }; W2.set(c, k, mid, st, 'pad'); logAudit(`출결패드 — ${M(mid)?.name || ''} ${c.name} ${st}`); save();
  return `${now} ${st} 처리되었습니다.${c.sub === '회차 차감반' ? ` 잔여 ${W2.remain(c, mid)}회` : ''}`; };
const KIO = { step: 'code', code: '', cands: [], mid: '', opts: [], msg: '', full: false };
function attendPad(full) { W2.all(); Object.assign(KIO, { step: 'code', code: '', cands: [], mid: '', opts: [], msg: '', full: !!full }); let w = $('#w2k'); if (!w) { w = document.createElement('div'); w.id = 'w2k'; w.className = 'w2k'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', '출결패드'); document.body.appendChild(w);
  w.addEventListener('click', e => { const b = e.target.closest('[data-k],[data-kio]'); if (!b) return; e.stopPropagation(); W2.kio(b); }); }
  W2.kioDraw(); clearInterval(KIO.clk); KIO.clk = setInterval(() => { const t2 = $('#w2kclk'); if (t2) t2.textContent = w2Now(); else clearInterval(KIO.clk); }, 15000); }
W2.mask = n => { n = String(n || ''); return n.length <= 1 ? n : n.length === 2 ? n[0] + '*' : n[0] + '*'.repeat(n.length - 2) + n[n.length - 1]; };
W2.kioDraw = () => { const w = $('#w2k'); if (!w) return; const any = S.classes.some(c => c.learners.length && W2.hasUnits(c)); let main = '';
  if (KIO.step === 'code') main = `<p class="w2kq">휴대폰 번호 끝 4자리를 입력하세요</p><output class="w2kout" aria-live="polite">${(KIO.code + '····').slice(0, 4).split('').map(x => `<i>${x === '·' ? '' : '●'}</i>`).join('')}</output><div class="w2kpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⏎'].map(k => `<button type="button" data-k="${k}" aria-label="${k === 'C' ? '지우기' : k === '⏎' ? '확인' : k}">${k === '⏎' ? '확인' : k === 'C' ? '지우기' : k}</button>`).join('')}</div>${any ? '' : '<p class="w2kmsg">출결을 받을 수업(회차 · 오프라인 강의)과 수강생이 아직 없습니다.</p>'}`;
  if (KIO.step === 'pick') main = `<p class="w2kq">같은 번호가 ${KIO.cands.length}명 있습니다. 본인을 선택하세요</p><div class="w2kl">${KIO.cands.map(m => `<button type="button" data-kio="who" data-v="${m.id}"><b>${esc(W2.mask(m.name || m.sid || ''))}</b><small>${esc(m.nick ? '닉네임 ' + m.nick : (S.groups || []).find(g => g.id === m.group)?.name || '')}</small></button>`).join('')}</div><button type="button" class="w2kback" data-kio="reset">처음으로</button>`;
  if (KIO.step === 'cls') main = `<p class="w2kq">${esc(W2.mask(M(KIO.mid)?.name || ''))}님, 출석할 수업을 선택하세요</p><div class="w2kl">${KIO.opts.map((o, i) => `<button type="button" data-kio="cls" data-v="${i}"><b>${esc(o.c.name)}</b><small>${o.credit ? `회차 차감반 · 잔여 ${W2.remain(o.c, KIO.mid)}회` : `${o.c.kind === 'episode' ? o.u.n + '회차 ' : ''}${esc(o.u.title)}${o.u.from ? ' · ' + o.u.from + (o.u.to ? '–' + o.u.to : '') : ''}${o.u.place ? ' · ' + esc(o.u.place) : ''}`}${W2.get(o.c, o.u.id, KIO.mid) ? ' · 출석함(종료 기록)' : ''}</small></button>`).join('')}</div><button type="button" class="w2kback" data-kio="reset">처음으로</button>`;
  if (KIO.step === 'done') main = `<div class="w2kdone ${KIO.bad ? 'bad' : ''}">${ic(KIO.bad ? 'x' : 'check', 40)}<b>${esc(KIO.msg)}</b></div><button type="button" class="w2kback" data-kio="reset">처음으로</button>`;
  w.innerHTML = `<div class="w2kin"><div class="w2kh"><span class="logo">D</span><div><b>${esc(S.org.name)} 출결패드</b><small>${esc(today())} · <span id="w2kclk">${w2Now()}</span></small></div><button type="button" class="w2kx" data-kio="close" aria-label="출결패드 닫기">${ic('x', 18)} 닫기</button></div><div class="w2km">${main}</div><p class="w2kf">입장 시 출석, 수업이 끝나고 한 번 더 입력하면 종료 시간이 기록됩니다. 출결이 기록되면 ${esc(t('learner'))}과 보호자에게 알림이 발송됩니다.</p></div>`; };
W2.kio = b => { const k = b.dataset.k; const a = b.dataset.kio; clearTimeout(KIO.tm);
  if (a === 'close') { const w = $('#w2k'); if (w) w.remove(); clearInterval(KIO.clk); if (KIO.full) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { } } render(); return; }
  if (a === 'reset') { Object.assign(KIO, { step: 'code', code: '', bad: false }); return W2.kioDraw(); }
  if (k != null) { if (k === 'C') KIO.code = ''; else if (k === '⏎') { if (KIO.code.length !== 4) { KIO.step = 'done'; KIO.bad = true; KIO.msg = '4자리를 모두 입력하세요.'; } else { const dig = s => String(s || '').replace(/\D/g, '');
      const cands = S.members.filter(m => dig(m.phone || (m.acct || {}).phone).endsWith(KIO.code) && S.classes.some(c => c.learners.includes(m.id) && W2.hasUnits(c)));
      KIO.code = ''; if (!cands.length) { KIO.step = 'done'; KIO.bad = true; KIO.msg = '일치하는 번호가 없습니다. 다시 입력하세요.'; } else if (cands.length > 1) { KIO.cands = cands; KIO.step = 'pick'; } else return W2.kioWho(cands[0].id); } KIO.code = ''; } else if (KIO.code.length < 4) KIO.code += k; if (KIO.step === 'done') KIO.tm = setTimeout(() => { if (KIO.step === 'done') { KIO.step = 'code'; KIO.bad = false; W2.kioDraw(); } }, 3500); return W2.kioDraw(); }
  if (a === 'who') return W2.kioWho(b.dataset.v);
  if (a === 'cls') { const o = KIO.opts[+b.dataset.v]; if (!o) return; KIO.msg = `${W2.mask(M(KIO.mid)?.name || '')}님 ${W2.padMark(o.c, o.u, KIO.mid)}`; KIO.bad = /이미/.test(KIO.msg); KIO.step = 'done'; W2.kioDraw(); KIO.tm = setTimeout(() => { if (KIO.step === 'done') { KIO.step = 'code'; KIO.bad = false; W2.kioDraw(); } }, 3500); } };
W2.kioWho = mid => { KIO.mid = mid; KIO.opts = W2.todayFor(mid); if (!KIO.opts.length) { KIO.step = 'done'; KIO.bad = true; KIO.msg = '오늘 출석할 수업이 없습니다.'; KIO.tm = setTimeout(() => { if (KIO.step === 'done') { KIO.step = 'code'; KIO.bad = false; W2.kioDraw(); } }, 3500); } else KIO.step = 'cls'; W2.kioDraw(); };
document.addEventListener('keydown', e => { const w = $('#w2k'); if (!w || KIO.step !== 'code' || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return; const k = /^\d$/.test(e.key) ? e.key : e.key === 'Enter' ? '⏎' : e.key === 'Backspace' || e.key === 'Escape' ? 'C' : null; if (k == null) return; e.preventDefault(); W2.kio({ dataset: { k } }); });
AFTER.push(() => { if (W2.kioOnce || !S || !S.org) return; W2.kioOnce = true; try { if (new URLSearchParams(location.search).get('kiosk') === 'pad') attendPad(true); } catch (e) { } });

/* ═════════ 클래스 만들기 마법사(회차 3유형 · 구독 설정 · 재생 규칙) ═════════ */
W2.wz = () => { WZ.w2 = WZ.w2 || { start: today(), end: w2Add(today(), 90), days: [], from: '', to: '', notime: false, count: 10, cdays: 90, sessions: [], sig: '', ym: today().slice(0, 7), dfrom: '', dto: '', subN: 0, subStart: '', rc: { on: false, from: 1, to: 10 }, skip: 'watched', speed: true }; return WZ.w2; };
W2.wzSessions = () => { const z = W2.wz(); if (WZ.sub === '요일반') { const sig = [z.start, z.end, z.days.join(), z.notime ? '' : z.from, z.notime ? '' : z.to].join('|'); if (sig !== z.sig) { z.sig = sig; z.sessions = W2.genWeekly(z.start, z.end, z.days, z.notime ? '' : z.from, z.notime ? '' : z.to); } }
  if (WZ.sub === '회차 차감반') { const n = clamp(+z.count || 1, 1, 100); while (z.sessions.length < n) z.sessions.push({ id: uid('se'), n: 0, date: '', from: '', to: '', title: `${z.sessions.length + 1}회차`, place: '' }); z.sessions.length = n; }
  if (WZ.sub !== '회차 차감반') z.sessions.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : (a.date || '') > (b.date || '') ? 1 : 0); z.sessions.forEach((s, i) => { s.n = i + 1; if (/^\d+회차$/.test(s.title || '') || !s.title) s.title = `${i + 1}회차`; }); return z.sessions; };
{ const base = wizard; wizard = (...a) => { base(...a); const w = $('#modal'); if (!w || !WZ) return; const z = W2.wz(); const mb = w.querySelector('.mb'); const nm = w.querySelector('#wzName'); if (nm) nm.maxLength = 50;
  if (WZ.step === 1 && WZ.kind === 'episode') { const seg = w.querySelector('.seg.wrap'); const anchor = seg ? seg.closest('.fl') : null; const help = { 요일반: '반복되는 수업 요일이 있는 형태 — 수강 기간과 요일로 회차를 한꺼번에 자동 생성합니다.', 특강반: '특정일에 수업하는 형태 — 다음 단계 캘린더에서 수업일을 직접 선택합니다. 첫 수업일 ~ 마지막 수업일이 수강 기간이 됩니다.', '회차 차감반': '수업 일자 없이 진행하는 형태 — 수업 횟수와 소진 기간을 정하면 출석할 때마다 1회씩 차감됩니다.' }[WZ.sub] || '';
    const f = WZ.sub === '요일반' ? W2.schedForm(z.start, z.end, z.days, z.from, z.to, z.notime) : WZ.sub === '회차 차감반' ? `<div class="form2"><label>수강 시작일<input type="date" name="w2s" value="${esc(z.start)}"></label><label>소진 기간(일)<input type="number" min="1" max="730" name="w2cd" value="${esc(z.cdays)}"></label><label>수업 횟수(최대 100)<input type="number" min="1" max="100" name="w2cnt" value="${esc(z.count)}"></label></div>` : '';
    if (anchor) anchor.insertAdjacentHTML('afterend', `<div class="w2wz" id="w2wz1"><p class="mini"><b>${esc(WZ.sub)}</b> · ${esc(help)}</p>${f}</div>`); }
  if (WZ.step === 2 && WZ.kind === 'episode') { $$('.bar2, ol.cur, .empty', mb).forEach(x => { if (!x.closest('.stepper')) x.style.display = 'none'; }); const ss = W2.wzSessions(); let p = '';
    if (WZ.sub === '요일반') p = `<p class="mini">${esc(z.start)} ~ ${esc(z.end)} · 매주 ${z.days.map(d => W2.DAYS[d]).join('·') || '요일 미선택'} → 회차 ${ss.length}개가 만들어졌습니다. 공휴일 · 시설 휴일은 날짜와 시간을 회차별로 바꾸세요.</p>${!z.days.length ? '<div class="warn">이전 단계에서 반복 요일을 선택하세요.</div>' : ''}${ss.length >= 100 ? '<div class="warn">회차는 최대 100개까지 만들어집니다.</div>' : ''}`;
    if (WZ.sub === '특강반') p = `<p class="mini">캘린더에서 수업일을 눌러 선택하세요(다시 누르면 해제, 최대 100개). 선택한 첫 수업일부터 마지막 수업일까지가 수강 기간이 됩니다.</p><div class="form2"><label>기본 시작 시간<input type="time" name="w2df" value="${esc(z.dfrom)}" data-chg="w2wz-def" data-k="dfrom"></label><label>기본 종료 시간<input type="time" name="w2dt" value="${esc(z.dto)}" data-chg="w2wz-def" data-k="dto"></label></div>${W2.cal(null, z.ym, 'wz', ss)}`;
    if (WZ.sub === '회차 차감반') p = `<p class="mini">수업 ${ss.length}회 · 소진 기간 ${esc(z.cdays)}일. 회차 이름을 바꾸거나 회차를 추가할 수 있습니다. 출석할 때마다 1회씩 차감되고, 출석한 날이 수업 진행일로 기록됩니다.</p>`;
    p += ss.length ? `<div class="tw"><table><thead><tr><th>회차</th><th>수업명</th>${WZ.sub === '회차 차감반' ? '' : '<th>날짜</th><th>시작</th><th>종료</th>'}<th></th></tr></thead><tbody>${ss.map((s, i) => `<tr><td>${s.n}</td><td><input class="w2in" value="${esc(s.title)}" maxlength="80" data-chg="w2wz-se" data-i="${i}" data-k="title" aria-label="${s.n}회차 수업명"></td>${WZ.sub === '회차 차감반' ? '' : `<td><input class="w2in" type="date" value="${esc(s.date)}" data-chg="w2wz-se" data-i="${i}" data-k="date" aria-label="${s.n}회차 날짜"></td><td><input class="w2in t" type="time" value="${esc(s.from)}" data-chg="w2wz-se" data-i="${i}" data-k="from" aria-label="시작"></td><td><input class="w2in t" type="time" value="${esc(s.to)}" data-chg="w2wz-se" data-i="${i}" data-k="to" aria-label="종료"></td>`}<td><button type="button" class="btn sm ghost" data-act="w2wz-del" data-i="${i}" aria-label="${s.n}회차 삭제">${ic('x', 14)}</button></td></tr>`).join('')}</tbody></table></div>` : '';
    p += WZ.sub !== '특강반' ? `<button type="button" class="btn sm" data-act="w2wz-add">+ 회차 추가</button>` : '';
    mb.insertAdjacentHTML('beforeend', `<div class="w2wz" id="w2wz2">${p}</div>`); }
  if (WZ.step === 2 && WZ.kind === 'sub') { const bar = mb.querySelector('.bar2'); if (bar && !bar.querySelector('[data-act="wz-ai-cur"]')) bar.insertAdjacentHTML('afterbegin', '<button type="button" class="btn sm ai" data-act="wz-ai-cur">✦ AI 커리큘럼 구성</button>'); }
  if (WZ.step === 3) { let p = '';
    if (WZ.kind === 'sub') p += `<div class="fl"><span>구독 회차 설정(저장 후 변경 불가)</span><label class="ckl"><input type="radio" name="w2subm" value="0" ${!z.subN ? 'checked' : ''}> 무제한 — 수강생이 구독 취소하기 전까지 계속 구독</label><label class="ckl"><input type="radio" name="w2subm" value="1" ${z.subN ? 'checked' : ''}> 최대 <input type="number" name="w2subn" min="2" max="12" value="${z.subN || 6}" class="w2n"> 회차까지 구독 후 자동 만료(2~12)</label></div>
      <div class="form2"><label>구독 시작일(선택, 비우면 결제 즉시 시작)<input type="date" name="w2subs" value="${esc(z.subStart)}" min="${today()}"></label><label class="ckl"><input type="checkbox" name="w2rc" ${z.rc.on ? 'checked' : ''}> 정기 모집(매월 반복)</label><label>매월 모집 기간<span class="w2rc"><input type="number" name="w2rcf" min="1" max="31" value="${z.rc.from}" aria-label="모집 시작일">일 ~ <input type="number" name="w2rct" min="1" max="31" value="${z.rc.to}" aria-label="모집 종료일">일</span></label></div>`;
    if (WZ.kind !== 'episode') p += `<div class="form2"><label>동영상 건너뛰기<select name="w2skip"><option value="free" ${z.skip === 'free' ? 'selected' : ''}>가능(배속 · 재생 바 이동)</option><option value="watched" ${z.skip === 'watched' ? 'selected' : ''}>불가(본 구간만 이동)</option></select></label><label class="ckl"><input type="checkbox" name="w2speed" ${z.speed ? 'checked' : ''}> 배속 재생 허용</label></div><p class="mini">건너뛰기를 쓰면 수료율은 건너뛰기 전까지만 기록됩니다. 수료율 기록이 중요한 클래스라면 '불가'로 두세요.</p>`;
    if (WZ.kind === 'episode' && WZ.sub !== '회차 차감반') p += '<p class="mini">사전 수강신청(모집) 기간은 수업 정보에서 정한 수강 기간을 넘을 수 없습니다.</p>';
    if (p) mb.insertAdjacentHTML('beforeend', `<div class="w2wz" id="w2wz3">${p}</div>`); } }; }
{ const base = wzRead; wzRead = (...a) => { base(...a); const w = $('#modal'); if (!w || !WZ) return; const z = W2.wz(); const g = n => { const el = w.querySelector(`[name=${n}]`); return el ? (el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value) : null; };
  if (w.querySelector('#w2wz1')) { if (g('w2s') != null) z.start = g('w2s') || z.start; if (g('w2e') != null) z.end = g('w2e') || z.end; if (w.querySelector('[name=w2d]')) z.days = $$('[name=w2d]:checked', w).map(x => +x.value); if (g('w2f') != null) z.from = g('w2f'); if (g('w2t') != null) z.to = g('w2t'); if (g('w2nt') != null) z.notime = g('w2nt'); if (g('w2cnt') != null) z.count = clamp(+g('w2cnt') || 1, 1, 100); if (g('w2cd') != null) z.cdays = clamp(+g('w2cd') || 90, 1, 730); }
  if (w.querySelector('#w2wz3')) { const r = w.querySelector('[name=w2subm]:checked'); if (r) z.subN = r.value === '1' ? clamp(+g('w2subn') || 6, 2, 12) : 0; if (g('w2subs') != null) z.subStart = g('w2subs'); if (g('w2rc') != null) z.rc = { on: g('w2rc'), from: clamp(+g('w2rcf') || 1, 1, 31), to: clamp(+g('w2rct') || 10, 1, 31) }; if (g('w2skip') != null) z.skip = g('w2skip'); if (g('w2speed') != null) z.speed = g('w2speed'); } }; }
ACT['w2wz-se'] = el => { const z = W2.wz(); const s = z.sessions[+el.dataset.i]; if (!s) return; const k = el.dataset.k; const v = el.value.trim(); if (k === 'date') { if (!w2Ok(v)) { el.value = s.date; return; } if (z.sessions.some(x => x !== s && x.date === v)) { toast('이미 회차가 있는 날짜입니다.', 'warn'); el.value = s.date; return; } s.date = v; z.sig = z.sig ? z.sig : ''; wzRead(); wizard(); return; } s[k] = k === 'title' ? (v || s.title).slice(0, 80) : v; };
ACT['w2wz-del'] = el => { const z = W2.wz(); z.sessions.splice(+el.dataset.i, 1); if (WZ.sub === '회차 차감반') z.count = z.sessions.length || 1; wzRead(); wizard(); };
ACT['w2wz-add'] = () => { const z = W2.wz(); W2.wzSessions(); if (z.sessions.length >= 100) { toast('회차는 최대 100개까지 추가할 수 있습니다.', 'warn'); return; } if (WZ.sub === '회차 차감반') { z.count = z.sessions.length + 1; } else { let d = z.sessions.length ? w2Add(z.sessions[z.sessions.length - 1].date || today(), 1) : z.start; for (let i = 0; i < 400 && z.sessions.some(s => s.date === d); i++) d = w2Add(d, 1); z.sessions.push({ id: uid('se'), n: 0, date: d, from: z.notime ? '' : z.from, to: z.notime ? '' : z.to, title: '', place: '' }); } wzRead(); wizard(); };
ACT['w2wz-pick'] = el => { const z = W2.wz(); const d = el.dataset.d; const i = z.sessions.findIndex(s => s.date === d); if (i >= 0) z.sessions.splice(i, 1); else { if (z.sessions.length >= 100) { toast('회차는 최대 100개까지 추가할 수 있습니다.', 'warn'); return; } z.sessions.push({ id: uid('se'), n: 0, date: d, from: z.dfrom, to: z.dto, title: '', place: '' }); } wzRead(); wizard(); };
ACT['w2wz-calm'] = el => { W2.wz().ym = el.dataset.v; wzRead(); wizard(); };
ACT['w2wz-def'] = el => { W2.wz()[el.dataset.k] = el.value; };
{ const base = wzSave; wzSave = (...a) => { const z = W2.wz(); let ss = [];
  if (WZ.kind === 'episode') { ss = W2.wzSessions().map(s => ({ ...s })); if (!ss.length) { toast(WZ.sub === '특강반' ? '캘린더에서 수업일을 1개 이상 선택하세요.' : WZ.sub === '요일반' ? '수강 기간 · 반복 요일로 만들어진 회차가 없습니다. 1단계를 확인하세요.' : '수업 횟수를 입력하세요.', 'warn'); return false; } WZ.items = [...ss.map(s => ({ id: s.id, type: 'offline', title: s.title })), ...(WZ.items || []).filter(it => it.type !== 'offline')]; }
  const n0 = S.classes.length; const first = S.classes[0]; const r = base(...a); if (r === false || S.classes.length === n0 || S.classes[0] === first) return r; const c = S.classes[0];
  c.skip = WZ.kind === 'episode' ? 'watched' : z.skip; c.speed = { on: WZ.kind === 'episode' ? true : !!z.speed, min: +S.settings.speedMin || 0.5, max: +S.settings.speedMax || 2 };
  if (WZ.kind === 'episode') { c.sub = WZ.sub || '요일반'; c.sessions = ss; c.att = {}; c.attT = {}; if (c.sub === '요일반') { c.days = z.days.slice(); c.time = { from: z.notime ? '' : z.from, to: z.notime ? '' : z.to }; c.start = z.start; c.end = z.end; } if (c.sub === '회차 차감반') { c.credits = { total: ss.length, days: z.cdays }; c.start = z.start; c.end = w2Add(z.start, z.cdays); } if (c.sub === '특강반') c.time = { from: z.dfrom, to: z.dto }; W2.renum(c); W2.period(c); W2.sync(c); UI.clsT = 'episodes'; }
  if (WZ.kind === 'sub') c.subsc = { cycle: 'month', count: z.subN || 0, start: z.subStart || '', saleEnd: '', rc: { ...z.rc }, seeded: true };
  save(); return r; }; }
{ const base = ACT['wz-kind']; ACT['wz-kind'] = el => { if (WZ && WZ.w2 && (WZ.kind !== el.dataset.k || WZ.sub !== el.dataset.s)) { WZ.w2.sessions = []; WZ.w2.sig = ''; } return base(el); }; }
/* AI SAM 커리큘럼: 구독 클래스도 지원 */
{ const base = ACT['wz-ai-cur']; ACT['wz-ai-cur'] = el => { if (WZ && WZ.kind === 'sub') { wzRead(); if (!WZ.name) { toast(`${t('cls')}명을 먼저 입력하세요.`, 'warn'); return; } } return base(el); }; }

/* ═════════ 학습자 → 운영자(lpx) ═════════ */
W2.who = x => { const id = x.who || (x.data || {}).who; return (S.members || []).find(m => m.sid === id || m.id === id || (m.acct && m.acct.email && m.acct.email === id)) || null; };
LPX['sub-cancel'] = x => { const m = W2.who(x); if (!m) return; const d = x.data || {}; const s = (S.subs || []).find(y => y.id === d.sub) || W2.subOf(d.cls, m.id); if (!s || s.who !== m.id) return; if (w2SubCancel(s.id, 'learner')) { const c = C(s.cls); logAudit(`구독 취소(학습자) — ${m.name || m.sid} ${c ? c.name : ''}`); W2.notify([m.id], '구독 취소 완료', `[${S.org.name}] 「${c ? c.name : ''}」 구독이 취소되었습니다. ${s.end}까지 수강할 수 있으며 다음 결제는 진행되지 않습니다.`); } };
LPX['sub-start'] = x => { const m = W2.who(x); if (!m) return; const d = x.data || {}; const r = w2SubStart(d.cls, m.id, d.pay || null); if (r.err) W2.notify([m.id], '구독 신청 안내', `[${S.org.name}] ${r.err}`); };
/* 라이브 강의 입장 · 퇴장 → 출석(지각 기준 · 출석 인정 시간) */
LPX['att-live'] = x => { const m = W2.who(x); const d = x.data || {}; const c = C(d.cls); if (!m || !c || !c.learners.includes(m.id)) return; const it = c.curriculum.find(i => i.id === d.item); if (!it) return; W2.norm(c); const k = it.id; const at = new Date(x.at || Date.now()); const hm = String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0');
  c.att[k] = c.att[k] || {}; c.attT[k] = c.attT[k] || {}; const tm = c.attT[k][m.id] || {}; const from = String(it.from || it.at || '').slice(11, 16);
  if (d.act === 'join') { if (tm.in && tm.date === today()) return; c.attT[k][m.id] = { date: today(), in: hm, out: '', by: 'live' }; const late = from && w2Min(hm) > w2Min(from) + (+(it.lateMin ?? 10)); W2.set(c, k, m.id, late ? '지각' : '출석', 'live'); }
  if (d.act === 'leave' && tm.in) { tm.out = hm; const dur = w2Min(hm) - w2Min(tm.in); if (+it.attMin && dur >= 0 && dur < +it.attMin) W2.set(c, k, m.id, '조퇴', 'live'); }
  logAudit(`라이브 ${d.act === 'join' ? '입장' : '퇴장'} — ${m.name || m.sid} ${it.title}`); };

/* ═════════ 학습자 스냅샷 ═════════ */
{ const base = lsSnapshot; lsSnapshot = (...a) => { const s = base(...a); try { W2.all(); (s.classes || []).forEach(x => { const c = C(x.id); if (!c) return;
    Object.assign(x, { kind: c.kind, sub: c.sub || '', legal: !!c.legal, speed: { on: !!c.speed.on, min: +c.speed.min || 0.5, max: +c.speed.max || 2 }, skip: c.skip, days: c.days || [], time: c.time || null });
    if (c.kind === 'episode') { x.sessions = c.sessions.map(se => ({ id: se.id, n: se.n, date: se.date, from: se.from, to: se.to, title: se.title, place: se.place || '' })); x.credits = c.credits || null; }
    if (c.kind === 'sub') x.subsc = { cycle: 'month', count: c.subsc.count || 0, start: c.subsc.start || '', saleEnd: c.subsc.saleEnd || '', rc: c.subsc.rc };
    (x.items || []).forEach(i => { const it = c.curriculum.find(y => y.id === i.id); if (!it || !['live', 'offline'].includes(it.type)) return; const se = (c.sessions || []).find(y => y.id === it.id); i.date = se ? se.date : String(it.from || it.at || '').slice(0, 10); i.from = se ? se.from : String(it.from || it.at || '').slice(11, 16); i.to = se ? se.to : String(it.to || '').slice(11, 16); i.place = it.place || ''; if (it.type === 'live') { i.link = /^https?:\/\//.test(it.url || '') ? it.url : ''; i.attMin = +it.attMin || 0; } }); });
    s.w2 = { retry: w2Retry() }; } catch (e) { console.error('w2 snapshot', e); } return s; }; }

/* ── 시작 시 정규화 · 결제일 처리(하루 1회) ── */
AFTER.push(() => { if (!S || !S.org || !S.classes) return; const k = S.org.id || S.org.name; if (W2.normed !== k) { W2.normed = k; try { W2.all(); } catch (e) { console.error('w2 norm', e); } } if (S.w2tick !== today()) { S.w2tick = today(); try { if (W2.subTick()) save(); } catch (e) { console.error('w2 tick', e); } } });
