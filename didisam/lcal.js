/* v37.4 학습자 학습 캘린더(#cal) — 대표님(2026-11-10 22:13) '학습자 뷰에서도 캘린더 부분 같이 강화됐는지 확인해봐. 앱과 웹 버전 모두.'
   운영자 캘린더(calx.js)와 같은 수준을 학습자 앱(body.lapp) · 웹(기존 화면) 모두에:
   - 월 · 주 · 목록 보기, 맨 위에 오늘 · 이번 주 할 일 요약
   - 내 수강 과정 일정 자동 표시(게시본 classes에서 바로 계산): 수강 시작 · 차시 열림(대학은 n주차 수업) · 회차 · 라이브 · 시험 · 과제 마감 · 설문 · 수강 종료
   - 운영자가 넣은 기관 일정(게시본 calx — calx.js에서 '학습자에게 보이기'를 켠 일정, 과정에 묶인 일정은 그 과정 수강생에게만)
   - 날짜 · 일정 누르기 → 상세(과정 · 차시로 바로 가기), '내 일정' 추가 · 수정 · 삭제
   - 내 일정: 운영 모드는 서버 학습 기록 lp.cal(기기 간 같음, 처음 한 번 이 기기 일정을 합침), 시연 · 미리보기는 이 기기 localStorage(didisam.lcal.<기관>.<번호>)
   - [내 캘린더로 보내기]: 이 캘린더 일정 파일(.ics) · Google Calendar 연결(lai-home 창) · 리마인더(#connect)
   - 보호자(학원 초중고): 연결된 자녀의 일정('자녀 일정')
   진입: 앱 홈 카드 · 「나」 목록 · 웹 머리 메뉴 · 마이페이지 카드. 웹에서도 #connect(연결 · 알림)를 같은 카드(laiMore)로 연다.
   learner.html에서 lhead.js 다음, lboot.js 바로 앞(바깥 감싸기 — viewPage · shell · lrender). */
'use strict';
(() => {
  if (typeof lrender !== 'function' || typeof viewPage !== 'function') return;
  Object.assign(ICP, { cal: ICP.cal || 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4', plus: 'M12 5v14M5 12h14', clock: ICP.clock || 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2' });
  const LC = { v: '', d: '', kid: '' };
  try { LC.v = sessionStorage.getItem('didisam.lcal.v') || ''; } catch (e) { }
  const pad = n => String(n).padStart(2, '0');
  const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addD = (s, n) => { const d = dd(s); d.setDate(d.getDate() + n); return ds(d); };
  const okD = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  const okT = s => /^\d{2}:\d{2}$/.test(String(s || ''));
  const td = () => ds(new Date());
  const WD = '일월화수목금토';
  const fmt = s => `${+s.slice(5, 7)}월 ${+s.slice(8)}일(${WD[dd(s).getDay()]})`;
  const dday = s => { const n = Math.round((dd(s) - dd(td())) / 864e5); return n === 0 ? '오늘' : n > 0 ? `D-${n}` : `${-n}일 지남`; };
  const T = k => (typeof lTerm === 'function' ? lTerm(k) : ({ cls: '과정', learner: '학습자' })[k] || k);
  const ty = () => ((SITE() && SITE().org) || {}).type || 'adult';
  const U = () => ty() === 'univ';
  const isPar = () => !!(LR.me && LR.me.kind === 'parent');
  const appOn = () => document.body.classList.contains('lapp');
  const COL = { 시작: '#00A224', 종료: '#A84A00', 차시: '#3BA875', 주차: '#3BA875', 회차: '#4C77C5', 라이브: '#7D5CB5', 시험: '#C4001D', 과제: '#5C74F6', 설문: '#E8622A', 기관: '#14A3A3', 내일정: '#E5487A' };
  const LBL = { 시작: '수강 시작', 종료: '수강 종료', 차시: '차시 열림', 주차: '주차 수업', 회차: '회차', 라이브: '라이브', 시험: '시험', 과제: '과제 마감', 설문: '설문', 기관: '기관 일정', 내일정: '내 일정' };
  const col = e => COL[e.k] || '#6C6C6C';

  /* ── 내 일정(이 기기) ── */
  const key = () => `didisam.lcal.${LR.tid || 'x'}.${(LR.me && (LR.me.sid || LR.me.id)) || 'guest'}`;
  let MEM = null;
  /* v37.4 결정 1(대표님 23:10): 운영 모드(로그인)는 서버 학습 기록 lp.cal이 원본(기기 간 같음, 서버가 필드 · 개수 · 크기를 정리 — lpcal.js / PubServiceImpl.cleanCal).
     처음 한 번만 이 기기에 있던 내 일정을 lp.cal에 합친다(id로 중복 제거, 수정 시각 at이 늦은 쪽). 시연 · 미리보기는 지금처럼 이 기기 localStorage. */
  const live = () => LR.mode === 'live' && !!LR.me && !!LR.lp;
  const okU = x => x && okD(x.date) && x.title && /^[\w-]{1,40}$/.test(String(x.id || ''));
  function local() { try { const j = JSON.parse(localStorage.getItem(key()) || '[]'); return Array.isArray(j) ? j.filter(okU).slice(0, 300) : []; } catch (e) { return []; } }
  function mergeOnce() { const fk = 'didisam.lcal.merged.' + (LR.tid || 'x') + '.' + (LR.me.sid || LR.me.id || ''); let done = false; try { done = localStorage.getItem(fk) === '1'; } catch (e) { done = true; } if (done) return false;
    const by = new Map(); (Array.isArray(LR.lp.cal) ? LR.lp.cal : []).filter(okU).forEach(x => by.set(x.id, x)); let n = 0;
    local().forEach(x => { const p = by.get(x.id); if (!p || String(x.at || '') > String(p.at || '')) { by.set(x.id, x); n++; } });
    LR.lp.cal = [...by.values()].slice(0, 300); try { localStorage.setItem(fk, '1'); } catch (e) { } if (n) { LR.api.save(); setTimeout(() => toast(`이 기기에 있던 내 일정 ${n}개를 계정에 옮겼어요. 이제 다른 기기에서도 보여요.`, 'ok'), 400); } return true; }
  window.lcalMerge = mergeOnce;
  function mine() { if (live()) { if (!Array.isArray(LR.lp.cal)) LR.lp.cal = []; mergeOnce(); LR.lp.cal = LR.lp.cal.filter(okU); return LR.lp.cal; }
    if (MEM && MEM.k === key()) return MEM.L; const L = local(); MEM = { k: key(), L }; return L; }
  function mineSave() { if (LR.mode === 'preview') return true; if (live()) { LR.lp.cal = mine().slice(0, 300); LR.api.save(); return true; }
    try { localStorage.setItem(key(), JSON.stringify(mine().slice(0, 300))); return true; } catch (e) { toast('이 기기에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.', 'bad'); return false; } }

  /* ── 내(또는 자녀) 수강 과정 ── */
  function kids() { if (!isPar()) return []; try { const r = (typeof laRoom === 'function' && laRoom()) || {}; const pa = typeof laPacct === 'function' ? laPacct() : null; if (!pa) return [];
    return (r.parents || []).filter(p => p.acct === pa.id && p.status === '연결 완료').map(p => { const m = (r.members || []).find(x => x.id === p.child); return { id: p.child, sid: m ? String(m.sid || (m.extra || {})['학번'] || '') : '', name: m ? (m.nick || m.name || '자녀') : '자녀' }; }); } catch (e) { return []; } }
  function myCls() { const C = (SITE().classes || []); if (!LR.me) return [];
    if (isPar()) { const K = kids().filter(k => !LC.kid || k.id === LC.kid); return C.flatMap(c => K.filter(k => (c.enrolledIds || []).includes(k.id) || (k.sid && (c.enrolled || []).includes(k.sid))).map(k => ({ c, who: k }))); }
    const sid = String(LR.me.sid || ''); const lp = (LR.lp && LR.lp.cls) || {}; const mc = (LR.mine && LR.mine.cls) || {};
    return C.filter(c => (c.enrolled || []).includes(sid) || (c.enrolledIds || []).includes(LR.me.id) || lp[c.id] || mc[c.id]).map(c => ({ c, who: null })); }
  const itemDone = (cid, iid) => { if (isPar()) return false; const r = ((LR.lp && LR.lp.cls) || {})[cid]; return !!(r && r.items && r.items[iid] && r.items[iid].done); };
  const dPart = v => { const m = String(v || '').match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/); return m ? { d: m[1], t: m[2] || '' } : null; };

  /* ── 모든 일정: 과정 자동 + 기관 + 내 일정 ── */
  function events() { const E = []; const seen = new Set(); const add = e => { const k = e.date + '|' + e.title + '|' + (e.who || ''); if (!okD(e.date) || seen.has(k)) return; seen.add(k); E.push(e); };
    const mc = myCls(); const myIds = new Set(mc.map(x => x.c.id));
    mc.forEach(({ c, who }) => { const nm = c.name; const wn = who ? who.name : ''; const base = { cls: c.id, cn: nm, who: wn, src: 'auto' }; const pre = wn ? `[${wn}] ` : '';
      const end = (!who && c.ends && okD(c.ends[LR.me.sid])) ? c.ends[LR.me.sid] : c.end;
      if (okD(c.start)) add({ ...base, id: `a:s:${c.id}:${wn}`, date: c.start, k: '시작', title: `${pre}수강 시작 · ${nm}` });
      if (okD(end)) add({ ...base, id: `a:e:${c.id}:${wn}`, date: end, k: '종료', title: `${pre}수강 종료 · ${nm}` });
      const items = (c.items || []).filter(y => y && y.type !== 'chapter');
      /* 주차(차시 열림): 주차가 있는 과정만 */
      if (okD(c.start)) { const W = {}; items.forEach(y => { const w = +y.week || 0; if (w > 0) (W[w] = W[w] || []).push(y); });
        Object.keys(W).map(Number).sort((a, b) => a - b).forEach(w => { const L = W[w]; add({ ...base, id: `a:w:${c.id}:${w}:${wn}`, date: addD(c.start, (w - 1) * 7), k: U() ? '주차' : '차시', title: `${pre}${w}주차 ${U() ? '수업' : '차시 열림'} · ${nm}`, iid: L[0].id, list: L.map(y => y.title).slice(0, 8), done: !who && L.every(y => itemDone(c.id, y.id)) }); }); }
      /* 회차 */
      (Array.isArray(c.sessions) ? c.sessions : []).forEach(s => { if (!s || !okD(s.date)) return; const t1 = String(s.title || '').replace(/^\s*\d+\s*회차\s*/, '').trim(); const tt = t1 && t1 !== nm ? ' ' + t1 : '';
        add({ ...base, id: `a:se:${c.id}:${s.id}:${wn}`, date: s.date, time: okT(s.from) ? s.from : '', end: okT(s.to) ? s.to : '', k: '회차', title: `${pre}${s.n ? s.n + '회차' : '회차'}${tt} · ${nm}`, place: s.place || '' }); });
      const sesD = new Set((Array.isArray(c.sessions) ? c.sessions : []).flatMap(s => s ? [s.id, s.date] : []));
      const wk = y => (+y.week > 0 && okD(c.start)) ? addD(c.start, (+y.week - 1) * 7) : '';
      items.forEach(y => { const R = y.rules || {}; const done = !who && itemDone(c.id, y.id); const o = { ...base, iid: y.id, done };
        if (y.type === 'live' || y.type === 'offline') { if (y.type === 'offline' && (sesD.has(y.id) || sesD.has(y.date))) return; const p = okD(y.date) ? { d: y.date, t: y.from || '' } : dPart(y.from); if (!p) return; add({ ...o, id: `a:l:${c.id}:${y.id}:${wn}`, date: p.d, time: okT(p.t) ? p.t : '', end: okT(y.to) ? y.to : (dPart(y.to) || {}).t || '', k: y.type === 'live' ? '라이브' : '회차', title: `${pre}${y.type === 'live' ? '라이브' : '오프라인 수업'} — ${y.title} · ${nm}`, place: y.place || '' }); return; }
        if (y.type === 'exam' || y.type === 'quiz') { const p = dPart(R.from) || dPart(y.from) || (y.type === 'exam' && wk(y) ? { d: wk(y), t: '' } : null); if (!p) return; const to = dPart(R.to);
          add({ ...o, id: `a:x:${c.id}:${y.id}:${wn}`, date: p.d, time: p.t, k: '시험', title: `${pre}시험 — ${y.title} · ${nm}`, note: to ? `응시 마감 ${fmt(to.d)}${to.t ? ' ' + to.t : ''}` : '' }); return; }
        if (y.type === 'assign') { const p = dPart(R.due) || (wk(y) ? { d: addD(wk(y), +y.due || 7), t: '' } : (+y.due > 0 && okD(c.start) ? { d: addD(c.start, +y.due), t: '' } : null)); if (!p) return;
          add({ ...o, id: `a:a:${c.id}:${y.id}:${wn}`, date: p.d, time: p.t || '23:59', k: '과제', title: `${pre}과제 마감 — ${y.title} · ${nm}` }); return; }
        if (y.type === 'survey') { const p = dPart(R.to) || dPart(R.from) || (wk(y) ? { d: wk(y), t: '' } : null); if (!p) return;
          add({ ...o, id: `a:v:${c.id}:${y.id}:${wn}`, date: p.d, time: p.t, k: '설문', title: `${pre}${dPart(R.to) ? '설문 마감' : '설문'} — ${y.title} · ${nm}` }); } }); });
    /* 기관 일정(운영자가 학습자에게 보이게 한 것) */
    (Array.isArray(SITE().calx) ? SITE().calx : []).forEach(x => { if (!x || !okD(x.date) || !x.title) return; if (x.cls && !myIds.has(x.cls)) return; const c = x.cls ? (SITE().classes || []).find(y => y.id === x.cls) : null;
      add({ id: 'o:' + x.id, date: x.date, time: okT(x.time) ? x.time : '', end: okT(x.end) ? x.end : '', k: '기관', kind2: x.kind || '', title: String(x.title).slice(0, 60), cls: c ? c.id : '', cn: c ? c.name : '', src: 'org', place: x.place || '' }); });
    if (LR.me) mine().forEach(u => add({ id: 'u:' + u.id, uid: u.id, date: u.date, time: okT(u.time) ? u.time : '', end: okT(u.end) ? u.end : '', k: '내일정', title: u.title, note: u.memo || '', cls: u.cls || '', cn: ((SITE().classes || []).find(c => c.id === u.cls) || {}).name || '', src: 'me' }));
    return E.sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99'))); }
  window.lcalEvents = events;
  const byDate = E => { const m = {}; E.forEach(e => (m[e.date] = m[e.date] || []).push(e)); return m; };
  const kindTag = e => e.k === '기관' && e.kind2 ? e.kind2 : LBL[e.k] || e.k;

  /* ── 화면 조각 ── */
  const chip = e => `<button type="button" class="lq-ev${e.done ? ' dn' : ''}" style="--k:${col(e)}" data-lcal="ev" data-v="${esc(e.id)}" title="${esc(e.title)}">${e.time && e.time !== '23:59' ? `<i>${esc(e.time)}</i>` : ''}${esc(e.title)}</button>`;
  const row = (e, d) => `<button type="button" class="lq-r${e.done ? ' dn' : ''}" data-lcal="ev" data-v="${esc(e.id)}"><i style="background:${col(e)}"></i><span class="lq-k">${esc(kindTag(e))}</span><b>${esc(e.title)}</b><small>${esc([d ? fmt(e.date) : '', e.time && e.time !== '23:59' ? e.time + (e.end ? '~' + e.end : '') : e.k === '과제' ? '자정까지' : '', e.place || '', e.done ? '완료' : ''].filter(Boolean).join(' · '))}</small>${d ? `<em class="lq-dd${e.date === td() ? ' t' : ''}">${dday(e.date)}</em>` : ''}</button>`;
  function sumHTML(E) { const t0 = td(), t7 = addD(t0, 6); const open = E.filter(e => !e.done && e.k !== '시작');
    const T0 = open.filter(e => e.date === t0); const W = open.filter(e => e.date > t0 && e.date <= t7); const next = W.slice(0, Math.max(0, 5 - T0.length));
    return `<div class="lq-sum"><div class="lq-sn"><a href="#" data-lcal="day" data-v="${t0}"><b>${T0.length}</b><span>오늘</span></a><a href="#" data-lcal="view" data-v="list"><b>${W.length + T0.length}</b><span>이번 주</span></a><a href="#" data-lcal="view" data-v="list"><b>${open.filter(e => ['과제', '시험'].includes(e.k) && e.date >= t0 && e.date <= addD(t0, 13)).length}</b><span>2주 안 마감</span></a></div>
      <div class="lq-sl"><h2>${isPar() ? '자녀의 오늘 · 이번 주' : '오늘 · 이번 주 할 일'}</h2>${T0.length + next.length ? [...T0, ...next].map(e => row(e, 1)).join('') : `<p class="lq-none">${isPar() ? '이번 주 자녀 일정이 없어요.' : '이번 주는 마감이 없어요. 내 일정에 공부 시간을 넣어 볼까요?'}</p>`}</div></div>`; }
  function monthHTML(E) { const cur = LC.d || td(); const ym = cur.slice(0, 7); const first = dd(ym + '-01'); const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); const B = byDate(E);
    let h = WD.split('').map((w, i) => `<div class="lq-wd${i === 0 ? ' su' : i === 6 ? ' sa' : ''}">${w}</div>`).join('') + Array(first.getDay()).fill('<div class="lq-day x"></div>').join('');
    for (let i = 1; i <= days; i++) { const d = `${ym}-${pad(i)}`; const L = B[d] || [];
      h += `<div class="lq-day${d === td() ? ' td' : ''}" data-lcday="${d}"><button type="button" class="lq-dn" data-lcal="day" data-v="${d}" aria-label="${fmt(d)} 일정 ${L.length}개">${i}</button>${L.slice(0, 3).map(chip).join('')}${L.length > 3 ? `<button type="button" class="lq-more" data-lcal="day" data-v="${d}">+${L.length - 3}</button>` : ''}</div>`; }
    h += Array((7 - (first.getDay() + days) % 7) % 7).fill('<div class="lq-day x"></div>').join('');
    return `<div class="lq-month" role="grid" aria-label="${+ym.slice(0, 4)}년 ${+ym.slice(5)}월">${h}</div>`; }
  function weekHTML(E) { const cur = LC.d || td(); const s0 = addD(cur, -dd(cur).getDay()); const B = byDate(E);
    return `<div class="lq-week">${Array.from({ length: 7 }, (_, i) => { const d = addD(s0, i); const L = B[d] || [];
      return `<div class="lq-wc${d === td() ? ' td' : ''}" data-lcday="${d}"><button type="button" class="lq-wh" data-lcal="day" data-v="${d}"><b>${WD[i]}</b><span>${+d.slice(5, 7)}/${+d.slice(8)}${d === td() ? ' · 오늘' : ''}</span></button>${L.map(e => row(e, 0)).join('') || '<small class="lq-none">일정 없음</small>'}</div>`; }).join('')}</div>`; }
  function listHTML(E) { const from = LC.d && LC.d < td() ? LC.d : td(); const L = E.filter(e => e.date >= from && e.date <= addD(from, 60)); const B = byDate(L);
    return Object.keys(B).length ? `<div class="lq-list">${Object.keys(B).sort().map(d => `<div class="lq-lg"><button type="button" class="lq-lh${d === td() ? ' t' : ''}" data-lcal="day" data-v="${d}">${fmt(d)} <small>${dday(d)}</small></button>${B[d].map(e => row(e, 0)).join('')}</div>`).join('')}</div>`
      : `<p class="lq-none big">앞으로 60일 동안 일정이 없어요.</p>`; }
  function calHTML() { const v = LC.v || (innerWidth <= 640 ? 'list' : 'month'); const cur = LC.d || td(); const E = events(); const P = isPar(); const K = kids();
    const title = v === 'week' ? (() => { const s0 = addD(cur, -dd(cur).getDay()); return `${+s0.slice(5, 7)}/${+s0.slice(8)} ~ ${+addD(s0, 6).slice(5, 7)}/${+addD(s0, 6).slice(8)}`; })() : v === 'list' ? '앞으로 60일' : `${cur.slice(0, 4)}년 ${+cur.slice(5, 7)}월`;
    const ks = ['시작', U() ? '주차' : '차시', '회차', '라이브', '시험', '과제', '설문', '종료', '기관', ...(P ? [] : ['내일정'])].filter(k => k === '내일정' || k === '기관' || E.some(e => e.k === k));
    const nm = P ? '자녀 일정' : '학습 캘린더'; const none = !myCls().length;
    return `<section class="sub lq-sub"><div class="in"><p class="crumb"><a href="#home">홈</a> › ${nm}</p><h1>${nm}</h1><p>${P ? '연결된 자녀의 수업 · 시험 · 과제 마감을 한눈에 봐요.' : `내 ${esc(T('cls'))}의 차시 · 시험 · 과제 마감과 기관 일정, 내가 넣은 일정을 한눈에 봐요.`}</p></div></section>
    <section class="sec lc"><div class="in">
      <div class="lq-top"><button type="button" class="lbtn ghost lq-send" data-lcal="send">${ico('cal', 18)}내 캘린더로 보내기</button>${P ? '' : `<button type="button" class="lbtn pri lq-addb" data-lcal="add" data-v="${td()}">${ico('plus', 18)}내 일정 추가</button>`}</div>
      ${P && K.length > 1 ? `<div class="lq-kids" role="tablist" aria-label="자녀">${[['', '모두'], ...K.map(k => [k.id, k.name])].map(([id, n]) => `<button type="button" role="tab" aria-selected="${LC.kid === id}" class="${LC.kid === id ? 'on' : ''}" data-lcal="kid" data-v="${esc(id)}">${esc(n)}</button>`).join('')}</div>` : ''}
      ${P && !K.length ? `<div class="lq-empty">${ico('user', 24)}<p>아직 연결된 자녀가 없어요. 자녀와 연결하면 자녀의 수업 · 시험 일정이 여기에 보여요.</p><a class="lbtn pri" href="#family">자녀와 연결하기</a></div>` : ''}
      ${!P && none ? `<div class="lq-empty">${ico('book2', 24)}<p>아직 수강 중인 ${esc(T('cls'))}이 없어요. 신청하면 차시 · 시험 · 과제 마감이 자동으로 들어와요.</p></div>` : ''}
      ${sumHTML(E)}
      <div class="lq-bar"><div class="lq-seg" role="tablist" aria-label="보기">${[['month', '월'], ['week', '주'], ['list', '목록']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${v === k}" class="${v === k ? 'on' : ''}" data-lcal="view" data-v="${k}">${l}</button>`).join('')}</div>
        <span class="lq-nav">${v === 'list' ? '' : `<button type="button" class="lq-ib" data-lcal="mv" data-v="-1" aria-label="이전">‹</button>`}<b class="lq-ttl">${title}</b>${v === 'list' ? '' : `<button type="button" class="lq-ib" data-lcal="mv" data-v="1" aria-label="다음">›</button>`}</span><button type="button" class="lq-tb" data-lcal="mv" data-v="0">오늘</button></div>
      ${v === 'month' ? monthHTML(E) : v === 'week' ? weekHTML(E) : listHTML(E)}
      <div class="lq-leg" aria-label="일정 종류">${ks.map(k => `<span><i style="background:${COL[k]}"></i>${esc(LBL[k])}</span>`).join('')}</div>
      <p class="lq-help">날짜를 누르면 그날 일정을 보고${P ? '' : ' 내 일정을 넣을 수 있어요'}. 일정을 누르면 ${esc(T('cls'))} · 차시로 바로 갈 수 있어요. ${P ? '' : live() ? '내 일정은 내 계정에 저장돼 다른 기기에서도 보여요.' : '내 일정은 이 기기에만 저장돼요.'}</p>
    </div></section>`; }
  window.lcalHTML = calHTML;

  /* ── 창(상세 · 날짜 · 추가 · 보내기) ── */
  function dlg(title, body, btns) { let d = document.getElementById('lcalDlg'); if (d) { try { d.close(); } catch (e) { } d.remove(); }
    d = document.createElement('dialog'); d.id = 'lcalDlg'; d.className = 'lq-dlg'; d.setAttribute('aria-labelledby', 'lcalDlgT');
    d.innerHTML = `<div class="lq-dh"><h2 id="lcalDlgT">${esc(title)}</h2><button type="button" class="lq-x" data-lcal="x" aria-label="닫기">${ico('x', 20)}</button></div><div class="lq-db">${body}</div>${btns ? `<div class="lq-df">${btns}</div>` : ''}`;
    document.body.appendChild(d); try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target === d) d.close(); }); return d; }
  const close = () => { const d = document.getElementById('lcalDlg'); if (d) { try { d.close(); } catch (e) { d.remove(); } } };
  function dayOpen(d) { const L = events().filter(e => e.date === d);
    dlg(fmt(d) + (d === td() ? ' · 오늘' : ''), L.length ? `<div class="lq-dl">${L.map(e => row(e, 0)).join('')}</div>` : `<p class="lq-none">이 날은 일정이 없어요.</p>`, isPar() ? '' : `<button type="button" class="lbtn pri" data-lcal="add" data-v="${d}">${ico('plus', 18)}이 날 내 일정 추가</button>`); }
  const itemName = { video: '영상', doc: '자료', assign: '과제', exam: '시험', quiz: '퀴즈', survey: '설문', live: '라이브', offline: '수업', rate: '평가' };
  function evOpen(id) { const e = events().find(x => x.id === id); if (!e) { toast('일정을 찾지 못했어요.', 'warn'); return; }
    if (e.src === 'me') return formOpen(e);
    const c = e.cls ? (SITE().classes || []).find(x => x.id === e.cls) : null; const it = c && e.iid ? (c.items || []).find(y => y.id === e.iid) : null;
    const kv = [['종류', kindTag(e) + (e.src === 'org' ? ' · 기관 일정' : '')], ['날짜', fmt(e.date) + (e.time && e.time !== '23:59' ? ` ${e.time}${e.end ? '~' + e.end : ''}` : e.k === '과제' ? ' 자정까지' : '') + ` · ${dday(e.date)}`], ...(e.who ? [['자녀', e.who]] : []), ...(c ? [[T('cls'), c.name]] : []), ...(e.place ? [['장소', e.place]] : []), ...(e.note ? [['안내', e.note]] : []), ...(e.iid && !e.who ? [['상태', e.done ? '완료했어요' : '아직 안 했어요']] : [])];
    const go = [];
    if (c && !e.who) { if (it) go.push(`<a class="lbtn pri" href="#c/${esc(c.id)}/${esc(it.id)}" data-lcal="go">${esc(e.k === '주차' || e.k === '차시' ? '이번 주차 차시' : itemName[it.type] || '차시')} 바로 가기</a>`); go.push(`<a class="lbtn ${it ? 'ghost' : 'pri'}" href="#c/${esc(c.id)}" data-lcal="go">${esc(T('cls'))} 열기</a>`); }
    if (e.who) go.push('<a class="lbtn ghost" href="#family" data-lcal="go">자녀 현황 보기</a>');
    dlg(e.title, `<div class="lq-kv">${kv.map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div>${e.list && e.list.length ? `<ul class="lq-il">${e.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${e.src === 'org' ? '<p class="lq-note">기관에서 넣은 일정이에요. 바뀌면 자동으로 반영돼요.</p>' : `<p class="lq-note">${esc(T('cls'))}에서 자동으로 들어온 일정이에요.</p>`}`, go.join('')); }
  function formOpen(e, date) { const C = myCls().filter(x => !x.who).map(x => x.c); const u = e && e.uid ? mine().find(x => x.id === e.uid) : null;
    dlg(u ? '내 일정 수정' : '내 일정 추가', `<form id="lcalF" class="lq-f" data-v="${esc(u ? u.id : '')}" novalidate>
      <label>제목<input name="t" maxlength="60" required value="${esc(u ? u.title : '')}" placeholder="예: 과제 초안 쓰기 · 스터디"></label>
      <div class="lq-f3"><label>날짜<input type="date" name="d" required value="${esc(u ? u.date : date || td())}"></label><label>시작<input type="time" name="s" value="${esc(u ? u.time || '' : '')}"></label><label>끝<input type="time" name="e" value="${esc(u ? u.end || '' : '')}"></label></div>
      ${C.length ? `<label>연결 ${esc(T('cls'))}(선택)<select name="c"><option value="">없음</option>${C.map(c => `<option value="${esc(c.id)}" ${u && u.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
      <label>메모(선택)<input name="m" maxlength="120" value="${esc(u ? u.memo || '' : '')}"></label>
      <p class="lq-err" id="lcalErr" role="alert"></p><p class="lq-note">${live() ? '내 일정은 내 계정에 저장돼 다른 기기에서도 보이고, 기관에는 보이지 않아요.' : '내 일정은 이 기기에만 저장되고 기관에는 보이지 않아요.'}</p></form>`,
      `${u ? `<button type="button" class="lbtn ghost lq-del" data-lcal="del" data-v="${esc(u.id)}">삭제</button>` : ''}<button type="submit" form="lcalF" class="lbtn pri">${u ? '저장' : '추가'}</button>`);
    setTimeout(() => { const i = document.querySelector('#lcalF [name=t]'); i && i.focus(); }, 30); }
  function sendOpen() { const g = !!(LR.lp && LR.lp.conn && LR.lp.conn.gcal && LR.lp.conn.gcal.on); const ar = Array.isArray(LR.lp && LR.lp.auto) ? LR.lp.auto.filter(a => a.on).length : 0; const n = icsEvents().length;
    dlg('내 캘린더로 보내기', `<div class="lq-sd">
      <button type="button" class="lq-so" data-lcal="ics">${ico('down', 22)}<span><b>일정 파일 받기(.ics)</b><small>이 캘린더 일정 ${n}개 · iPhone · 안드로이드 · Google · Outlook 캘린더에서 열기</small></span></button>
      ${isPar() ? '' : `<button type="button" class="lq-so" data-lcal="gcal">${ico('cal', 22)}<span><b>Google Calendar ${g ? '연결됨' : '연결'}</b><small>${g ? '켜 둔 리마인더가 내 캘린더 일정으로 들어가요' : '리마인더를 캘린더 알림으로 받아요'}</small></span></button>
      <a class="lq-so" href="#connect" data-lcal="go">${ico('bell', 22)}<span><b>리마인더 · 앱 알림</b><small>${ar ? `리마인더 ${ar}개 켜짐` : '복습 · 마감 3일 전 · 주간 정리 알림 켜기'}</small></span></a>`}</div>
      <p class="lq-note">${IOSX ? 'iPhone: 받은 파일을 열고 「모두 추가」를 누르세요.' : '받은 파일을 캘린더 앱(Google 캘린더 등)으로 열면 한 번에 들어가요.'} 과제 · 시험은 하루 전에 알림이 와요.</p>`, ''); }
  const IOSX = /iphone|ipad|ipod/i.test(navigator.userAgent);

  /* ── .ics(지난 7일 ~ 앞으로 180일) ── */
  const icsEvents = () => { const a = addD(td(), -7), b = addD(td(), 180); return events().filter(e => e.date >= a && e.date <= b); };
  function ics() { const tx = v => String(v || '').replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\r?\n/g, '\\n').slice(0, 150); const org = SITE().org.name; const now = new Date(); const st = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
    const V = icsEvents().map(e => { const d = e.date.replace(/-/g, ''); const timed = e.time && e.time !== '23:59'; const L = ['BEGIN:VEVENT', `UID:${tx(e.id.replace(/[^\w:.-]/g, ''))}@didisam-lcal`, `DTSTAMP:${st}`];
      if (timed) { L.push(`DTSTART:${d}T${e.time.replace(':', '')}00`); if (e.end && e.end > e.time) L.push(`DTEND:${d}T${e.end.replace(':', '')}00`); else L.push('DURATION:PT1H'); } else { L.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addD(e.date, 1).replace(/-/g, '')}`); }
      L.push(`SUMMARY:${tx(e.title)}`, `DESCRIPTION:${tx([kindTag(e), e.cn, e.place, e.note, org].filter(Boolean).join(' · '))}`); if (e.place) L.push(`LOCATION:${tx(e.place)}`);
      if (['과제', '시험', '종료'].includes(e.k)) L.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${tx(kindTag(e) + ' 하루 전')}`, 'END:VALARM'); else if (timed) L.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:30분 전', 'END:VALARM');
      L.push('END:VEVENT'); return L.join('\r\n'); });
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DIDISAM//learner-calendar//KO', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${tx(org + (isPar() ? ' 자녀 일정' : ' 학습 캘린더'))}`, 'X-WR-TIMEZONE:Asia/Seoul', ...V, 'END:VCALENDAR'].join('\r\n'); }
  window.lcalICS = ics;

  /* ── 이벤트 ── */
  const rerender = () => { const y = scrollY; lrender(); requestAnimationFrame(() => scrollTo(0, y)); };
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-lcal]'); if (!el) return; const k = el.dataset.lcal; if (k === 'go') { close(); return; } e.preventDefault();
    if (k === 'x') return close();
    if (k === 'view') { LC.v = el.dataset.v; try { sessionStorage.setItem('didisam.lcal.v', LC.v); } catch (x) { } return rerender(); }
    if (k === 'mv') { const v = +el.dataset.v; const mode = LC.v || (innerWidth <= 640 ? 'list' : 'month'); const cur = LC.d || td(); if (!v) LC.d = td(); else if (mode === 'week') LC.d = addD(cur, 7 * v); else { const d = dd(cur.slice(0, 7) + '-01'); d.setMonth(d.getMonth() + v); LC.d = ds(d); } return rerender(); }
    if (k === 'kid') { LC.kid = el.dataset.v; return rerender(); }
    if (k === 'day') return dayOpen(el.dataset.v);
    if (k === 'ev') return evOpen(el.dataset.v);
    if (k === 'add') { if (!LR.me) { location.hash = '#login/cal'; return; } return formOpen(null, okD(el.dataset.v) ? el.dataset.v : td()); }
    if (k === 'send') return sendOpen();
    if (k === 'gcal') { close(); const b = document.createElement('button'); b.type = 'button'; b.dataset.lai = 'gcal'; b.hidden = true; document.body.appendChild(b); b.click(); b.remove(); return; }
    if (k === 'ics') { try { const b = new Blob([ics()], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (isPar() ? 'didisam-family' : 'didisam-calendar') + '.ics'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); close(); toast('일정 파일을 받았어요. 캘린더 앱에서 열어 주세요.', 'ok'); } catch (er) { toast('파일을 만들지 못했어요.', 'bad'); } return; }
    if (k === 'del') { const L = mine(); const i = L.findIndex(x => x.id === el.dataset.v); if (i < 0) return close(); const u = L[i];
      if (el.dataset.sure !== '1') { el.dataset.sure = '1'; el.textContent = '한 번 더 누르면 삭제'; el.classList.add('warn'); return; }
      L.splice(i, 1); if (mineSave()) { close(); rerender(); toast(`「${u.title}」 일정을 지웠어요.`, 'ok'); } return; }
  });
  document.addEventListener('submit', e => { const f = e.target; if (!f || f.id !== 'lcalF') return; e.preventDefault(); e.stopPropagation();
    const v = n => (f.elements[n] ? String(f.elements[n].value || '').trim() : ''); const err = m => { const x = document.getElementById('lcalErr'); if (x) x.textContent = m; };
    const t = v('t').replace(/[<>]/g, ''), d = v('d'), s = v('s'), en = v('e');
    if (!t) return err('제목을 입력해 주세요.'); if (!okD(d)) return err('날짜를 골라 주세요.'); if (s && en && en <= s) return err('끝나는 시간이 시작보다 빨라요.');
    const o = { title: t.slice(0, 60), date: d, time: okT(s) ? s : '', end: okT(en) ? en : '', cls: v('c'), memo: v('m').replace(/[<>]/g, '').slice(0, 120) };
    const L = mine(); const id = f.dataset.v; if (id) { const u = L.find(x => x.id === id); if (!u) return close(); Object.assign(u, o, { at: new Date().toISOString() }); } else { if (L.length >= 300) return err('내 일정은 300개까지 넣을 수 있어요.'); L.push({ id: 'lc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ...o, at: new Date().toISOString() }); }
    if (!mineSave()) return; close(); LC.d = d; rerender(); toast(id ? '일정을 저장했어요.' : `${fmt(d)}에 내 일정을 넣었어요.`, 'ok'); }, true);
  /* 칸의 빈 곳을 눌러도 그날 일정 */
  document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('.lq-day[data-lcday]'); if (!c || e.target.closest('[data-lcal]')) return; dayOpen(c.dataset.lcday); });

  /* ── 라우팅: #cal(학습 캘린더) · 웹 #connect(연결 · 알림 — 앱과 같은 카드) ── */
  { const base = viewPage; viewPage = (id, ...a) => {
    if (id === 'cal') { if (!LR.me) return needLogin('cal'); try { return calHTML(); } catch (e) { console.error('lcal', e); return '<section class="sec"><div class="in"><p class="empty">캘린더를 그리지 못했어요. 새로 고침해 주세요.</p></div></section>'; } }
    if (id === 'connect' && !(pageOf && pageOf('connect'))) { if (!LR.me) return needLogin('connect'); const more = typeof window.laiMore === 'function' ? window.laiMore() : '';
      return `<section class="sub"><div class="in"><p class="crumb"><a href="#home">홈</a> › 연결 · 알림</p><h1>연결 · 알림</h1><p>캘린더 · 카카오톡 연결과 학습 리마인더를 설정해요.</p></div></section><section class="sec lq-conn"><div class="in"><p><a class="lbtn ghost sm" href="#cal">${ico('cal', 16)}학습 캘린더 보기</a></p><div class="ap-conn-a" hidden></div>${more}</div></section>`; }
    return base(id, ...a); }; }

  /* ── 진입: 웹 머리 메뉴(로그인한 학습자 · 보호자) ── */
  { const base = shell; shell = (inner, cur, ...a) => { let h = base(inner, cur, ...a); try { if (LR.me && !/href="#cal"/.test(h.split('</header>')[0])) { const on = route().a === 'cal'; const lk = `<a href="#cal" class="${on ? 'on' : ''}"${on ? ' aria-current="page"' : ''}>${isPar() ? '자녀 일정' : '캘린더'}</a>`;
    const i = h.indexOf('<nav class="ln"'); if (i >= 0) { const j = h.indexOf('</nav>', i); if (j > 0) h = h.slice(0, j) + lk + h.slice(j); } } } catch (e) { console.error('lcal shell', e); } return h; }; }

  /* ── 진입: 앱 홈 카드 · 「나」 목록 · 웹 마이페이지 · 보호자 홈 ── */
  function brief() { const E = events().filter(e => !e.done && e.k !== '시작'); const t0 = td(), t7 = addD(t0, 6); const T0 = E.filter(e => e.date === t0).length; const W = E.filter(e => e.date >= t0 && e.date <= t7); const nx = E.find(e => e.date >= t0 && ['과제', '시험', '라이브', '회차', '설문'].includes(e.k));
    return { T0, W: W.length, nx, s: `${T0 ? `오늘 ${T0}개` : '오늘 일정 없음'} · 이번 주 ${W.length}개${nx ? ` · ${dday(nx.date)} ${String(nx.title).replace(/ · [^·]+$/, '')}` : ''}` }; }
  const card = (cls) => { const b = brief(); const P = isPar(); return `<a class="lq-hc ${cls || ''}" href="#cal">${ico('cal', 22)}<span><b>${P ? '자녀 일정' : '학습 캘린더'}</b><small>${esc(b.s)}</small></span>${b.T0 ? `<em>${b.T0}</em>` : ''}${ico('arrow', 16)}</a>`; };
  function decorate() { if (!SITE() || !LR.me) return; const lm = document.getElementById('lm'); if (!lm) return; const a = route().a;
    if (appOn()) {
      /* v37.4 결정 2: 앱 아래 탭에 '캘린더'(보호자 '자녀 일정') — 홈 다음. lapp.js navHTML은 그대로 두고 그린 뒤 끼운다(L2 앱 셸 작업과 충돌 없게). */
      const nav = document.querySelector('#lapp .ap-nav'); if (nav && !nav.querySelector('a[href="#cal"]')) { const on = a === 'cal'; const L = [...nav.querySelectorAll(':scope > a')];
        if (on) L.forEach(x => { x.classList.remove('on'); x.removeAttribute('aria-current'); });
        const t = document.createElement('a'); t.href = '#cal'; t.className = 'lq-tab' + (on ? ' on' : ''); if (on) t.setAttribute('aria-current', 'page'); t.innerHTML = `${ico('cal', 22)}<span>${isPar() ? '자녀 일정' : '캘린더'}</span>`;
        if (L[0]) L[0].after(t); else nav.prepend(t); nav.classList.add('lq-n' + nav.querySelectorAll(':scope > a').length); }
      if (a === 'home' && !lm.querySelector('.lq-hc')) { const P = isPar(); const anc = P ? lm.querySelector('.ap-pg4') : (lm.querySelector('.ap-conn') || lm.querySelector('.ap-hero')); if (anc) anc.insertAdjacentHTML(P || anc.classList.contains('ap-conn') ? 'beforebegin' : 'afterend', card(P ? 'par' : 'app')); }
      if (a === 'acct' && !route().b && !lm.querySelector('.ls-list a[href="#cal"]')) { const ref = lm.querySelector('.ls-list a[href="#connect"], .ls-list a[href="#family"]'); if (ref) { const b = brief(); ref.insertAdjacentHTML('beforebegin', `<a href="#cal" class="ls-row"><span class="ls-ic" style="--c:#14A3A3">${ico('cal', 20)}</span><span class="ls-tx"><b>${isPar() ? '자녀 일정' : '학습 캘린더'}</b><small>${esc(b.s)}</small></span>${b.T0 ? `<i class="ls-bd">${b.T0}</i>` : ''}<span class="ls-go" aria-hidden="true">›</span></a>`); } }
      if (a === 'my' && !isPar() && !lm.querySelector('.lq-hc')) { const anc = lm.querySelector('.ap-my'); if (anc) anc.insertAdjacentHTML('afterend', `<div class="lq-myw">${card('app')}</div>`); }
      return; }
    if (['my', 'family'].includes(a) && !lm.querySelector('.lq-hc')) { const anc = lm.querySelector('.la-myl') || lm.querySelector('.la-seg.kids') || lm.querySelector('.mypage .in > h1'); const host = lm.querySelector('.mypage .in');
      if (anc) anc.insertAdjacentHTML('afterend', card('web')); else if (host) host.insertAdjacentHTML('afterbegin', card('web')); }
    if (a === 'home' && isPar() && !lm.querySelector('.lq-hc')) { const g = lm.querySelector('.lpar-g'); if (g) g.insertAdjacentHTML('afterend', card('web')); } }
  { const base = lrender; lrender = (...x) => { base(...x); try { decorate(); if (route().a === 'cal') document.title = `${SITE().org.name} · ${isPar() ? '자녀 일정' : '캘린더'}`; } catch (e) { console.error('lcal decorate', e); } }; }
  addEventListener('hashchange', close);
})();
