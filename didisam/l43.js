/* v43 D2 — 스튜디오 공통 「목록 · 표 · 상세 · 설정」 패턴(window.L43)
 * 문서: scratchpad/v43/plan/patterns-d2.md (3단계 요원은 이 문서만 보고 나머지 관리자 화면에 적용합니다)
 *
 * 1) 렌더 함수(새 화면 · 새 코드에서 직접 호출)
 *    L43.brief({ eye, title, sub, stats:[[값, 라벨, tone]] })  → 화면 첫 줄 「한 문장 브리핑」 + 핵심 숫자
 *      acts:[{ label, kind:'pri'|'sec', go:'<CSS 선택자>' | tab:'<탭 id>' }] → 머리 주 버튼 · 보조 버튼(v43 G2)
 *        go  : 화면에 이미 있는 버튼(예: '[data-act="cls-new"]')을 대신 클릭합니다. 대상이 없으면 버튼을 그리지 않습니다.
 *        tab : go(탭 id)로 이동합니다. 새 버튼에는 data-act를 달지 않습니다(테스트 strict 모드) — data-l43go · data-l43tab만 씁니다.
 *        다른 머리(V4.head 등)에도 L43.acts(배열)로 같은 버튼 HTML을 얻어 넣을 수 있습니다.
 *      stats 값이 0 · 빈 값 · 「—」 · NaN이면 숫자 대신 짧은 문장(L43.zero: 「대기 없음」 · 「해당 없음」 등)을 보여 줍니다.
 *    L43.av(name)            → 이니셜 원형 아바타(이름으로 색이 고정)
 *    L43.prog(v, tone?)      → 진도 막대 + 숫자(30% 미만 코랄, 80% 이상 짙은 그린)
 *    L43.chip(text, tone)    → 상태 칩(ok · warn · bad · mute · ai)
 *    L43.empty({ art, title, body, act, v, label }) → 빈 상태(그린 SVG 일러스트 + 한 문장 + 주 버튼 1개)
 *    L43.bulk(n, unit, buttonsHtml, clearAct) → 선택 시 아래에 떠 있는 일괄 실행 바
 *    L43.fbar({ key, cur, chips:[[id,라벨,개수]], q:{ act, ph, val }, right }) → 필터 바(칩 + 검색 + 오른쪽 도구)
 *    L43.photo(words, seed)  → 저장소 CC0 스톡 사진 주소(hpstock.js) — 썸네일이 없을 때
 * 2) 기존 화면 개조(렌더 코드를 고치지 않고 #main 을 꾸밈)
 *    L43.reg(tab, { brief: () => opts|null, enhance: main => {} }) → 탭 등록. 등록한 탭은 #main 에 .l43 이 붙어 l43.css 가 적용됩니다.
 *    공통 개조(자동): 표 이름 열 아바타 · % 칸 진도 막대 · 머리 칸 정렬 · 선택 행 강조 · 빈 상태 일러스트 · 빈 목록이면 필터 바 숨김
 * 기존 data-act · id · 테스트 선택자는 건드리지 않습니다(새 버튼에 기존 data-act 를 중복으로 달지 않음 — 테스트 strict 모드). */
(function () {
  'use strict';
  const W = window;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = s => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const REG = {};
  const num = v => Math.round(+v || 0);

  /* ───────── 렌더 함수 ───────── */
  const initial = n => { n = String(n || '').trim(); if (!n) return '?'; if (/^[A-Za-z]/.test(n)) { const p = n.split(/\s+/); return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase(); } return n[0]; };
  const av = (name, size) => `<span class="l43-av t${hash(name) % 6}${size ? ' ' + size : ''}" aria-hidden="true">${E(initial(name))}</span>`;
  const prog = (v, tone) => { v = Math.max(0, Math.min(100, num(v))); const t = tone || (v < 30 ? 'lo' : v >= 80 ? 'hi' : ''); return `<span class="l43-pg ${t}"><span class="l43-pgt"><i style="width:${v}%"></i></span><b>${v}%</b></span>`; };
  const chip = (t, tone) => `<span class="l43-chip ${tone || ''}">${E(t)}</span>`;
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const todayLabel = () => { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${DOW[d.getDay()]})`; };
  /* v43 Q1 — 요약 카드 4종(화면 성격에 따라 모양을 바꿈)
   *   hero  짙은 그린 메시 + 큰 문장 + 유리 숫자 칸(돈 · 위험 · 마감처럼 결정이 급한 화면)
   *   kpi   한 문장 + KPI 4칸(스파크라인 · 증감)(목록 · 현황 화면)
   *   photo 실사진 + 한 문장 + 숫자(공간 · 콘텐츠 · 홈페이지 · 상세 화면) — o.photo: 사진 낱말, o.img: 주소 직접
   *   list  한 문장 + 할 일 3줄(처리 대기가 있는 화면) — o.todo: [[제목, 보조, tone]]
   * 고르는 순서: o.kind → L43.reg(tab, {kind}) → KIND 배정표(DIRECTION.md) → 자동(todo 있으면 list, 숫자 3개 이상이면 kpi, 아니면 hero) */
  /* 배정표: DIRECTION.md §9 「카드」 열(H 짙은 히어로 · N 숫자형 · P 사진형 · L 목록형) + 견본 6장 */
  const KIND = (() => { const o = {}; const T = { H: 'hero', N: 'kpi', P: 'photo', L: 'list' };
    'assess:L attend:N cert:P badge:P book:P library:N academic:L lifelong:L hrd:N groups:P parents:N admins:L message:L community:L consult:N billing:N org:P diag:H board:L enroll:L tutorial:P dbook:P conn:N sis:N aigov:N rfpmap:N cpl:H crmstu:L crmatt:N crmex:N crmcs:L crmbill:H crmstat:N lmsa:N lmsb:L lmsc:H lmsd:L lmse:L lmsf:N lmsi:P lmsk:N lmsl-dm:L lmsl-noti:L lmsm:N lmsn:P lmso:L lmsp:L lmsp-app:N lmsq:P lmslive:H lmsv:P clib:P settings:L ledger:N fac:P home:H class:P members:L sales:N lmsj:N dash:N mileage:N compliance:H crmcal:L'
      .split(' ').forEach(x => { const [k, v] = x.split(':'); o[k] = T[v]; }); return o; })();
  const PHOTOKW = { fac: '강의실 스터디룸', clib: '노트북 온라인', lib: '도서 책', book: '도서 책', books: '도서 책', dbook: '도서 책', site: '캠퍼스', cert: '책상 공부', badge: '세미나 모임', live: '세미나 강의', cls: '강의실' };
  /* 스파크라인 — 실제 시계열(o.stats[i][3])이 있으면 그것을, 없으면 값에서 만든 시연용 추세(빈 기관은 그리지 않음) */
  const sparkPts = (v, seed) => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0; if (!n) return null; const r = (k => () => { k = (k * 1103515245 + 12345) >>> 0; return (k >>> 8) / 16777216; })(hash(seed) || 7); const out = []; let x = n * (.62 + r() * .18); for (let i = 0; i < 11; i++) { out.push(x); x += (n - x) / (11 - i) + (r() - .45) * n * .06; } out.push(n); return out; };
  const spark = (d, tone) => { if (!d || d.length < 2) return ''; const mn = Math.min(...d), mx = Math.max(...d), W2 = 96, H2 = 32, rg = mx - mn || 1; const P = d.map((v, i) => [i / (d.length - 1) * W2, H2 - 3 - (v - mn) / rg * (H2 - 8)]); const ln = P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '); const id = 'l43s' + (hash(d.join()) % 1e6);
    return `<svg class="l43-spk ${tone || ''}" viewBox="0 0 ${W2} ${H2}" width="${W2}" height="${H2}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".28" style="stop-color:currentColor"/><stop offset="1" stop-opacity="0" style="stop-color:currentColor"/></linearGradient></defs><path d="${ln} L${W2} ${H2} L0 ${H2}Z" fill="url(#${id})"/><path d="${ln}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${P[P.length - 1][0].toFixed(1)}" cy="${P[P.length - 1][1].toFixed(1)}" r="3" fill="currentColor"/></svg>`; };
  const eyeHTML = o => `<p class="l43-eye"><span class="l43-ai" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor"/></svg>AI</span>${E(o.eye || '오늘 브리핑')} · ${E(todayLabel())}</p>`;
  const demo = () => { try { return !(W.S && S.org && S.org.empty); } catch (e) { return true; } };
  /* v43 G2 — 0 · 빈 값 · 「—」 · NaN → 짧은 문장. 숫자가 있으면 null */
  const ZW = [[/승인|대기|보고/, '대기 없음'], [/미납|연체|환불/, '미납 없음'], [/미만|위험|미이수|결석|노쇼|지각|낮은|이탈|미접속|미배정|미입력|오류|실패/, '해당 없음'], [/오늘/, '오늘은 없음'], [/이번 달|이번 주|신규|발급|제출|예정/, '아직 없음']];
  const zero = (v, l) => { const t = String(v == null ? '' : v).trim(); if (/NaN|undefined/.test(t) || !t || /^[—\-–]+$/.test(t)) return '집계 전'; const n = parseFloat(t.replace(/[^\d.\-]/g, '')); if (/\d/.test(t) && n === 0 && !/[1-9]/.test(t)) { const h = ZW.find(([re]) => re.test(l || '')); return h ? h[1] : '아직 없음'; } return null; };
  const zv = (v, l) => { const z = zero(v, l); return z ? `<span class="l43-z">${E(z)}</span>` : E(v); };
  /* v43 G2 — 머리 버튼(주 · 보조). go 대상이 화면에 없으면 그리지 않음 */
  const acts = A => { A = (A || []).filter(a => a && a.label && (a.tab || a.go)); if (!A.length) return ''; return `<div class="l43-acts">${A.slice(0, 3).map((a, i) => `<button type="button" class="btn ${(a.kind || (i ? 'sec' : 'pri')) === 'pri' ? 'pri' : 'ghost'} l43-act"${a.go ? ` data-l43go="${E(a.go)}"` : ` data-l43tab="${E(a.tab)}"`}>${E(a.label)}</button>`).join('')}</div>`; };
  const actTarget = sel => { try { return [...document.querySelectorAll(sel)].find(x => !x.closest('.l43-acts') && (x.offsetParent || x.getClientRects().length)) || document.querySelector(sel); } catch (e) { return null; } };
  const pruneActs = root => { (root || document).querySelectorAll('.l43-act[data-l43go]').forEach(b => { if (!actTarget(b.dataset.l43go)) b.remove(); }); (root || document).querySelectorAll('.l43-acts').forEach(w => { if (!w.children.length) w.remove(); }); };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.l43-act'); if (!b) return; e.preventDefault();
    if (b.dataset.l43tab) { try { go(b.dataset.l43tab); } catch (x) { console.error(x); } return; }
    const t = actTarget(b.dataset.l43go); if (t) { t.scrollIntoView && t.scrollIntoView({ block: 'center' }); t.click(); } });
  function brief(o) {
    if (!o) return '';
    const st = (o.stats || []).filter(Boolean); const tab = (typeof CUR !== "undefined" && (CUR.ws === 'settings' ? 'settings' : CUR.tab)) || '';
    let k = o.kind || (REG[tab] && REG[tab].kind) || KIND[tab] || (o.todo ? 'list' : st.length >= 3 ? 'kpi' : 'hero');
    if (k === 'list' && !(o.todo && o.todo.length) && !st.length) k = 'hero';
    const head = `<div class="l43-bl">${eyeHTML(o)}<h2 class="l43-hl">${o.title}</h2>${o.sub ? `<p class="l43-sub">${o.sub}</p>` : ''}${o.foot || ''}${acts(o.acts)}</div>`;
    if (k === 'hero') return `<section class="l43-brief l43-k-hero" aria-label="화면 브리핑">${head}${st.length ? `<dl class="l43-gl">${st.slice(0, 4).map(([v, l, t, sp]) => `<div class="l43-g ${t || ''}"><dt>${E(l)}</dt><dd>${zv(v, l)}</dd>${zero(v, l) ? '' : spark(sp || (demo() ? sparkPts(v, l + v) : null), 'on')}</div>`).join('')}</dl>` : ''}</section>`;
    if (k === 'photo') { const kw = o.photo || PHOTOKW[tab] || (W.S && S.org ? S.org.name : '교실'); const U = [].concat(o.imgs || o.img || []).filter(Boolean); while (U.length < 3) { const u = V4photo(kw, 'brief-' + tab + U.length, { slot: U.length ? 'card' : 'hero', size: U.length ? '' : 'lg', tone: 'light' }); if (!u) break; U.push(u); }
      return `<section class="l43-brief l43-k-photo" aria-label="화면 브리핑"><div class="l43-pbody">${head}${st.length ? `<dl class="l43-stats">${st.slice(0, 3).map(([v, l, t]) => `<div class="l43-st ${t || ''}"><dt>${E(l)}</dt><dd>${zv(v, l)}</dd></div>`).join('')}</dl>` : ''}</div>${U.length ? `<div class="l43-pst n${U.length}" role="img" aria-label="${E(o.alt || '분위기 사진')}">${U.slice(0, 3).map((u, i) => `<span class="l43-pimg p${i}" style="background-image:url('${E(u)}')"></span>`).join('')}</div>` : ''}</section>`; }
    if (k === 'list') { const T = (o.todo && o.todo.length ? o.todo : st.map(([v, l, t]) => [zero(v, l) ? `${l} · ${zero(v, l)}` : `${l} ${v}`, t === 'warn' ? '먼저 처리할 항목' : '현재 상태', zero(v, l) ? 'ok' : t])).slice(0, 3);
      return `<section class="l43-brief l43-k-list" aria-label="화면 브리핑">${head}<ol class="l43-todo" aria-label="할 일">${T.map(([a, b, t], i) => `<li class="${t || ''}"><span class="l43-tn">${t === 'warn' ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>' : t === 'ok' ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : i + 1}</span><span class="l43-tt"><b>${E(a)}</b>${b ? `<small>${E(b)}</small>` : ''}</span>${t === 'warn' ? '<span class="l43-chip warn">처리 필요</span>' : t === 'ok' ? '<span class="l43-chip ok">정상</span>' : '<span class="l43-chip">확인</span>'}</li>`).join('')}</ol></section>`; }
    /* kpi(N): 왼쪽 헤드라인 · 오른쪽 링 1개 + KPI 3칸(스파크라인) */
    let ri = o.ring ? -1 : st.findIndex(x => /%$/.test(String(x[0]).trim())); const rg = o.ring || (ri >= 0 && !zero(st[ri][0], st[ri][1]) ? [parseFloat(st[ri][0]), st[ri][1], st[ri][2]] : null); if (ri >= 0 && !rg) ri = -1; const K = st.filter((x, i) => i !== ri).slice(0, rg ? 3 : 4);
    const ring = rg ? (() => { const v = Math.max(0, Math.min(100, +rg[0] || 0)), R = 42, C = 2 * Math.PI * R; return `<div class="l43-ring ${rg[2] || ''}" role="img" aria-label="${E(rg[1])} ${num(v)}%"><svg viewBox="0 0 100 100" width="112" height="112" aria-hidden="true"><circle cx="50" cy="50" r="${R}" class="tr"/><circle cx="50" cy="50" r="${R}" class="fg" stroke-dasharray="${(C * v / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/></svg><b>${num(v)}<small>%</small></b><span>${E(rg[1])}</span></div>`; })() : '';
    return `<section class="l43-brief l43-k-kpi${rg ? ' hasring' : ''}" aria-label="화면 브리핑">${head}${st.length ? `<div class="l43-kr">${ring}<dl class="l43-kp n${K.length}">${K.map(([v, l, t, sp], i) => `<div class="l43-kc ${t || ''}"><dt>${E(l)}</dt><dd>${zv(v, l)}</dd>${zero(v, l) ? '' : spark(sp || (demo() ? sparkPts(v, l + v + i) : null), t === 'warn' ? 'co' : '')}</div>`).join('')}</dl></div>` : ''}</section>`;
  }
  const V4photo = (k, s, o) => { try { return W.V4 && V4.photo ? V4.photo(k, s, o) : (W.HPSTOCK && HPSTOCK.photo ? HPSTOCK.photo(k, s, o) : ''); } catch (e) { return ''; } };
  /* 빈 상태 일러스트(160×120, 그린 톤 · 토큰 색이라 다크 자동) */
  const ART = {
    list: '<rect x="30" y="22" width="100" height="78" rx="12" class="a3"/><rect x="42" y="36" width="22" height="16" rx="4" class="a1"/><rect x="70" y="38" width="46" height="5" rx="2.5" class="a4"/><rect x="70" y="47" width="30" height="4" rx="2" class="a5"/><rect x="42" y="62" width="22" height="16" rx="4" class="a1"/><rect x="70" y="64" width="46" height="5" rx="2.5" class="a4"/><rect x="70" y="73" width="24" height="4" rx="2" class="a5"/><circle cx="124" cy="94" r="16" class="a2"/><path d="M116 94h16M124 86v16" class="a6"/>',
    people: '<circle cx="62" cy="50" r="16" class="a1"/><path d="M34 98c0-16 12-26 28-26s28 10 28 26z" class="a1"/><circle cx="100" cy="46" r="13" class="a3"/><path d="M80 96c2-13 10-20 20-20s19 7 21 20z" class="a3"/><circle cx="124" cy="92" r="16" class="a2"/><path d="M116 92h16M124 84v16" class="a6"/>',
    check: '<rect x="44" y="18" width="72" height="90" rx="12" class="a3"/><rect x="64" y="12" width="32" height="14" rx="6" class="a1"/><path d="M58 50l8 8 14-14" class="a7"/><rect x="58" y="70" width="44" height="5" rx="2.5" class="a4"/><rect x="58" y="82" width="30" height="5" rx="2.5" class="a5"/><circle cx="118" cy="96" r="14" class="a2"/><path d="M112 96l4 4 8-8" class="a6"/>',
    doc: '<rect x="40" y="16" width="80" height="92" rx="12" class="a3"/><rect x="54" y="66" width="10" height="26" rx="3" class="a1"/><rect x="70" y="54" width="10" height="38" rx="3" class="a2"/><rect x="86" y="44" width="10" height="48" rx="3" class="a1"/><rect x="54" y="30" width="40" height="5" rx="2.5" class="a4"/>',
    gear: '<circle cx="80" cy="62" r="34" class="a3"/><circle cx="80" cy="62" r="14" class="a1"/><path d="M80 22v12M80 90v12M40 62h12M108 62h12M52 34l8 8M100 82l8 8M52 90l8-8M100 42l8-8" class="a7"/>'
  };
  const artSvg = k => `<svg class="l43-art" viewBox="0 0 160 120" width="160" height="120" aria-hidden="true"><ellipse cx="80" cy="110" rx="58" ry="6" class="a0"/>${ART[k] || ART.list}</svg>`;
  function empty(o) {
    o = o || {};
    return `<div class="l43-empty" role="status">${artSvg(o.art)}<b>${E(o.title || '아직 항목이 없습니다')}</b>${o.body ? `<p>${E(o.body)}</p>` : ''}${o.act ? `<button type="button" class="btn pri" data-act="${E(o.act)}"${o.v != null ? ` data-v="${E(o.v)}"` : ''}>${E(o.label || '시작하기')}</button>` : ''}</div>`;
  }
  const bulk = (n, unit, btns, clearAct) => n ? `<div class="l43-bulk" role="region" aria-label="선택 항목 일괄 실행"><b class="l43-bn">${n}</b><span>${E(unit || '개')} 선택</span><span class="sp"></span>${btns || ''}${clearAct ? `<button type="button" class="btn sm ghost" data-act="${E(clearAct)}">선택 해제</button>` : ''}</div>` : '';
  function fbar(o) {
    o = o || {};
    const ch = (o.chips || []).map(([id, l, c]) => `<button type="button" role="tab" aria-selected="${id === o.cur}" class="l43-fc ${id === o.cur ? 'on' : ''}" data-act="tab" data-key="${E(o.key)}" data-v="${E(id)}">${E(l)}${c != null ? `<em>${E(c)}</em>` : ''}</button>`).join('');
    const q = o.q ? `<label class="l43-q"><span class="sr">검색</span><input type="search" placeholder="${E(o.q.ph || '검색')}" value="${E(o.q.val || '')}" data-chg="${E(o.q.act)}"></label>` : '';
    return `<div class="l43-fbar">${ch ? `<div class="l43-fcs" role="tablist">${ch}</div>` : ''}${q}<span class="sp"></span>${o.right || ''}</div>`;
  }
  /* v43 Q1: V4.photo(HPSTOCK.photo)로 통일 — 같은 화면 중복 없음 */
  function photo(words, seed) { try { if (W.V4 && V4.photo) return V4.photo([].concat(words || []).join(' '), String(seed || words)); } catch (e) { } return ''; }
  /* 과정 이름 → 사진 고르기용 단어(hpstock 분류 키워드와 맞춤) */
  const KW = [[/스마트폰|디지털|컴퓨터|엑셀|데이터|AI|코딩|IT|파이썬|프로그래밍/i, 'IT'], [/바리스타|커피|제과|요리|조리/, '요리'], [/인문|독서|문학|역사|철학|국어/, '독서'], [/복지|요양|돌봄|간호|보건/, '돌봄'], [/창업|경영|마케팅|회계|재무/, '경영'], [/영어|일본어|중국어|어학|회화/, '외국어'], [/수학|과학/, '수학'], [/미술|디자인|드로잉/, '미술'], [/음악|피아노|노래/, '음악'], [/안전|성희롱|개인정보|장애인|법정/, '사무'], [/운동|요가|체육|수영/, '운동']];
  const wordsOf = name => { const w = KW.filter(([re]) => re.test(name || '')).map(x => x[1]); return w.length ? w : ['교실']; };

  /* ───────── 기존 화면 공통 개조 ───────── */
  const NAMEH = /^(이름|원생|훈련생|성명|학생|수강생|응시자|신청자|교육생|임직원)$/;
  function nameOfCell(td) { const a = td.querySelector('a, b, strong'); let t = (a ? a.textContent : td.textContent).trim(); t = t.split(/\s+/)[0]; return t.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 10); }
  function sortTable(tbl, col, dir) {
    const tb = tbl.tBodies[0]; if (!tb) return; const rows = [...tb.rows]; if (rows.some(r => r.cells.length !== tbl.tHead.rows[0].cells.length)) return;
    const key = r => { const c = r.cells[col]; const t = (c ? c.textContent : '').trim(); const n = parseFloat(t.replace(/[,원명건%개회일P\s]/g, '')); return /^[-\d.,]+\s*[%원명건개회일P]?$/.test(t) && !isNaN(n) ? n : t; };
    rows.sort((a, b) => { const x = key(a), y = key(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko'); return dir === 'desc' ? -r : r; });
    rows.forEach(r => tb.appendChild(r));
  }
  function enhanceTables(main) {
    const tab = (W.CUR && CUR.tab) || CUR.ws; UI.l43s = UI.l43s || {};
    main.querySelectorAll('.tw table').forEach((tbl, ti) => {
      if (tbl.dataset.l43) return; tbl.dataset.l43 = 1; const hr = tbl.tHead && tbl.tHead.rows[0]; if (!hr) return;
      const H = [...hr.cells].map(th => th.textContent.trim());
      const ni = H.findIndex(h => NAMEH.test(h));
      [...(tbl.tBodies[0] || { rows: [] }).rows].forEach(tr => {
        if (ni >= 0 && tr.cells[ni] && !tr.cells[ni].querySelector('.l43-av')) { const n = nameOfCell(tr.cells[ni]); if (n) { tr.cells[ni].classList.add('l43-nc'); tr.cells[ni].insertAdjacentHTML('afterbegin', av(n)); } }
        [...tr.cells].forEach((td, i) => { if (td.querySelector('button,a,input,select,.bar,.l43-pg,svg,img') || td.querySelectorAll('*').length > 2) return; const t = td.textContent.trim(); const m = t.match(/^(\d{1,3})%$/); if (m && !/출석률|대비|증감/.test(H[i] || '')) { td.innerHTML = prog(+m[1]); td.classList.add('l43-pc'); } });
        [...tr.cells].forEach(td => { const t = td.textContent.trim(); if (t && t.length <= 16 && !td.querySelector('button,.btn')) td.classList.add('l43-nw'); });
        const ck = tr.querySelector('td:first-child input[type=checkbox]'); if (ck) { tr.classList.toggle('l43-sel', ck.checked); ck.addEventListener('change', () => tr.classList.toggle('l43-sel', ck.checked)); }
      });
      /* 정렬: 글자가 있는 머리 칸만(체크 · 버튼 칸 제외) */
      const rowsN = tbl.tBodies[0] ? tbl.tBodies[0].rows.length : 0; if (rowsN < 2 || rowsN > 500) return;
      const sk = tab + ':' + ti; const cur = UI.l43s[sk];
      [...hr.cells].forEach((th, i) => {
        if (!H[i] || th.querySelector('input,button,select')) return;
        th.classList.add('l43-sort'); th.tabIndex = 0; th.setAttribute('aria-sort', cur && cur[0] === i ? (cur[1] === 'desc' ? 'descending' : 'ascending') : 'none');
        const go = () => { const p = UI.l43s[sk]; const dir = p && p[0] === i && p[1] === 'asc' ? 'desc' : 'asc'; UI.l43s[sk] = [i, dir]; [...hr.cells].forEach(c => c.classList.contains('l43-sort') && c.setAttribute('aria-sort', 'none')); th.setAttribute('aria-sort', dir === 'desc' ? 'descending' : 'ascending'); sortTable(tbl, i, dir); };
        th.addEventListener('click', go); th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
      if (cur) sortTable(tbl, cur[0], cur[1]);
    });
  }
  const ARTOF = { class: 'list', members: 'people', crmstu: 'people', assess: 'check', compliance: 'check', hrd: 'doc', lmsa: 'list', settings: 'gear' };
  function enhanceEmpty(main, tab) {
    main.querySelectorAll('.slg-empty:not([data-l43])').forEach(c => { c.dataset.l43 = 1; c.classList.add('l43-empty', 'l43-slg'); const i = c.querySelector('.slg-eic'); if (i) i.outerHTML = artSvg(ARTOF[tab]); });
    main.querySelectorAll('.empty:not([data-l43])').forEach(e => { if (e.dataset.slgHide || e.closest('.modal')) return; e.dataset.l43 = 1; const t = e.textContent.trim(); if (t.length > 160) return; const art = artSvg(ARTOF[tab]).replace('width="160" height="120"', 'width="112" height="84"'); e.classList.add('l43-emptyp');
      if (e.querySelector('button,a,input,select')) e.insertAdjacentHTML('afterbegin', art); else e.innerHTML = `${art}<p>${E(t)}</p>`; });
    main.classList.toggle('l43-none', !!main.querySelector('.slg-empty'));
  }
  /* v43 Q1 — 모든 관리자 화면 공통(등록 여부와 무관, 글자 · data-act를 바꾸지 않음)
   * 1) 페이지 머리: 제목 + 한 줄 설명(slgGuide.d) + 오른쪽 주 버튼(.bview 첫 .ph 도구줄을 머리 오른쪽으로 옮김)
   * 2) 표: 숫자 열 오른쪽 정렬 · tabular(l43-r), 짧은 칸 줄바꿈 금지(l43-nw) */
  function pageHead(main, tab) {
    const bhd = main.querySelector(':scope > .bhd'); if (!bhd) return; bhd.classList.add('q1-ph');
    const bl = bhd.querySelector('.bhdl') || bhd;
    if (!bhd.dataset.q1 && !main.querySelector(':scope > p, :scope > .bview > p.mini:first-child, .q1-desc, .uxdesc, .lmsnav-d')) { bhd.dataset.q1 = 1; let d = ''; try { const g = W.slgGuide && slgGuide(tab); d = g && g.d ? String(g.d) : ''; } catch (e) { }
      if (d && !/^(?:\s*)$/.test(d)) bl.insertAdjacentHTML('beforeend', `<p class="q1-desc">${E(d)}</p>`); }
    const bv = main.querySelector(':scope > .bview'); if (!bv) return;
    const ph = [...bv.children].slice(0, 4).find(x => x.classList.contains('ph') && !x.querySelector('h1, h2, h3, input, select') && x.querySelector('.phr .btn, .phr button'));
    if (ph) { ph.classList.add('q1-phmv'); bhd.appendChild(ph); }
  }
  const NUMRE = /^[-+▲▼]?\s?[\d,.]+\s*(원|명|건|개|회|점|P|p|분|시간|일|%|장|권)?$/;
  function tableNums(main) {
    main.querySelectorAll('.tw table:not([data-q1])').forEach(tbl => { tbl.dataset.q1 = 1; const hr = tbl.tHead && tbl.tHead.rows[0]; const B = tbl.tBodies[0]; if (!hr || !B || !B.rows.length) return;
      const n = hr.cells.length; const R = [...B.rows].filter(r => r.cells.length === n).slice(0, 60); if (!R.length) return;
      for (let i = 0; i < n; i++) { let num = 0, tot = 0; R.forEach(r => { const c = r.cells[i]; if (c.querySelector('.l43-pg,button,input,select')) return; const t = c.textContent.trim(); if (!t || t === '—' || t === '-') return; tot++; if (NUMRE.test(t)) num++; });
        if (tot && num / tot >= .7) { hr.cells[i].classList.add('l43-r'); R.forEach(r => r.cells[i].classList.add('l43-r')); } }
      [...B.rows].forEach(r => [...r.cells].forEach(c => { const t = c.textContent.trim(); if (t && t.length <= 24 && !c.querySelector('button.btn, textarea')) c.classList.add('l43-nw'); }));
    });
  }
  function run() {
    { const m0 = document.getElementById('main'); if (m0 && W.S && S.org && typeof CUR !== "undefined") { const tb = CUR.ws === 'settings' ? 'settings' : CUR.tab; try { pageHead(m0, tb); } catch (e) { console.error(e); } try { tableNums(m0); } catch (e) { console.error(e); } } }
    const main = document.getElementById('main'); if (!main || !W.S || !S.org) return;
    const tab = CUR.ws === 'settings' ? 'settings' : CUR.tab; const R = REG[tab];
    main.classList.toggle('l43', !!R); if (!R) return; main.dataset.l43 = tab;
    if (!main.querySelector('.l43-brief') && R.brief) { let o = null; try { o = R.brief(main); } catch (e) { console.error(e); } if (o) { const h = brief(o); const bv = main.querySelector(':scope > .bview'); const wh = main.querySelector('.wh, .bhd'); if (bv) bv.insertAdjacentHTML('afterbegin', h); else if (wh) wh.insertAdjacentHTML('afterend', h); else main.insertAdjacentHTML('afterbegin', h); } }
    try { pruneActs(main); } catch (e) { }
    try { enhanceTables(main); } catch (e) { console.error(e); }
    try { if (R.enhance) R.enhance(main); } catch (e) { console.error(e); }
    try { enhanceEmpty(main, tab); } catch (e) { console.error(e); }
  }
  /* v43 Q1 보조 열(DIRECTION §1-1): side(main, target, cardsHTML) — target(주 콘텐츠)을 .q1-2col로 감싸고 오른쪽 340px 보조 열을 붙인다.
     aside 카드: L43.acard({ t, items:[[글, tone, 이동할 요소 id]], p, ai:true }) — 이동은 data-q1to(스크롤), data-act는 쓰지 않음 */
  const acard = o => `<section class="q1-ac${o.ai ? ' ai' : ''}">${o.t ? `<h3>${o.ai ? '<span class="l43-ai" aria-hidden="true">AI</span>' : ''}${E(o.t)}</h3>` : ''}${o.items ? `<ul>${o.items.map(([x, t, to]) => `<li>${to ? `<a href="#${E(to)}" data-q1to="${E(to)}"><i class="${t || ''}"></i>${E(x)}</a>` : `<span><i class="${t || ''}"></i>${E(x)}</span>`}</li>`).join('')}</ul>` : ''}${o.p ? `<p>${o.p}</p>` : ''}</section>`;
  function side(main, target, cards) { if (!target || target.closest('.q1-2col')) return; const w = document.createElement('div'); w.className = 'q1-2col'; target.parentNode.insertBefore(w, target); w.appendChild(target); w.insertAdjacentHTML('beforeend', `<aside class="q1-aside" aria-label="보조 정보">${cards}</aside>`); }
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-q1to]'); if (!a) return; e.preventDefault(); const t = document.getElementById(a.dataset.q1to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const reg = (tab, o) => { REG[tab] = o || {}; if (o && o.art) ARTOF[tab] = o.art; };
  const kindOf = tab => (REG[tab] && REG[tab].kind) || KIND[tab] || '';
  /* v43 G2 2차 — 탐색 층 압축(모든 관리자 화면)
   * ① 브리핑(.l43-brief · .v4-head)이 있으면 탭 아래 설명 줄(.lmsnav-sub .lnd)을 숨긴다 — 브리핑 문장이 같은 역할을 한다
   * ② 「데모: 브라우저에만 저장」 문구는 작은 칩 「시연 모드」로 바꾼다(원문은 title)
   * ③ 설정 화면(CUR.ws === 'settings')은 머리 카드를 낮춘다(#main.g2-set, l43.css) */
  const DEMO_RE = /데모\s*:\s*(?:이\s*)?브라우저에만\s*저장(?:됩니다)?\.?/;
  const demoChip = full => `<span class="g2-demo" title="${E(full || '서버 연결 전 시연 모드입니다. 저장한 내용은 이 브라우저에만 남습니다.')}">시연 모드</span>`;
  function compact() {
    const main = document.getElementById('main'); if (!main || !W.S || !S.org) return;
    main.classList.toggle('g2-set', typeof CUR !== 'undefined' && CUR.ws === 'settings');
    const hasBrief = !!main.querySelector('.l43-brief, .v4-head'); main.classList.toggle('g2-hasbrief', hasBrief);
    if (hasBrief) main.querySelectorAll('.lmsnav-sub > .lnd').forEach(p => { p.hidden = true; });
    main.querySelectorAll('small, span, p, em').forEach(el => { if (el.dataset.g2d || el.closest('.g2-demo, .modal, textarea')) return; const t = el.textContent; if (t.length > 120 || !DEMO_RE.test(t)) return; if ([...el.children].some(c => DEMO_RE.test(c.textContent))) return; el.dataset.g2d = 1;
      const full = t.trim(); if (full.replace(DEMO_RE, '').replace(/[\s·|,()]/g, '') === '') { el.outerHTML = demoChip(full); return; }
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (DEMO_RE.test(n.nodeValue)) { n.nodeValue = n.nodeValue.replace(DEMO_RE, '').replace(/\s*[·|]\s*$/, ' ').replace(/^\s*[·|]\s*/, ''); break; } }
      el.insertAdjacentHTML('beforeend', ' ' + demoChip(full)); });
  }
  if (typeof AFTER !== 'undefined') AFTER.push(() => { run(); try { compact(); } catch (e) { console.error(e); } setTimeout(() => { run(); try { compact(); } catch (e) { console.error(e); } }, 0); });
  W.L43 = { brief, acts, zero, compact, side, acard, spark, sparkPts, KIND, kindOf, av, prog, chip, empty, bulk, fbar, photo, wordsOf, reg, run, artSvg, REG };

  /* ═════════ 대표 화면 등록(D2) ═════════ */
  const L = k => { try { return t(k); } catch (e) { return k; } };
  const pct = v => num(v) + '%';
  const avgOf = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const cp = c => { try { return avgP(c); } catch (e) { return 0; } };
  const memAvg = id => avgOf(S.classes.filter(c => (c.learners || []).includes(id)).map(c => +((c.prog || {})[id] || {}).p || 0));
  const daysAgo = d => { const x = new Date(d); return isNaN(x) ? 0 : Math.floor((Date.now() - x) / 864e5); };

  /* 1. 과정 목록 · 상세 */
  reg('class', {
    brief: () => {
      if (UI.cls && S.classes.some(x => x.id === UI.cls)) { const c = S.classes.find(x => x.id === UI.cls), n = (c.learners || []).length; let dn = 0; try { dn = doneN(c); } catch (e) { dn = (c.learners || []).filter(id => +((c.prog || {})[id] || {}).p >= 100).length; } const a = cp(c);
        return { kind: 'photo', eye: c.status || L('cls'), img: c.thumb && !/^data:image\/svg/.test(c.thumb) ? c.thumb : photo(wordsOf(c.name), c.id + c.name), title: `${E(L('learner'))} ${n}명 가운데 <em>${dn}명</em>이 수료했습니다`, sub: a < 50 ? `평균 진도 ${pct(a)}입니다. 진도 30% 미만 수강생에게 독려 메시지를 먼저 보내세요.` : `평균 진도 ${pct(a)}로 순조롭게 진행 중입니다. 아래 수강생 표에서 진도가 낮은 순으로 확인하세요.` }; } /* 숫자는 아래 상세 KPI 4칸이 보여 주므로 반복하지 않음(DIRECTION §3 페이지 머리) */
      if (UI.cls || UI.clsView === 'cats' || !S.classes.length) return null;
      const C = S.classes, run = C.filter(c => c.status === '운영중').length, N = C.reduce((a, c) => a + (c.learners || []).length, 0), A = avgOf(C.map(cp)), low = C.filter(c => (c.learners || []).length && cp(c) < 30).length;
      return { imgs: C.slice(0, 3).map(c => c.thumb && !/^data:image\/svg/.test(c.thumb) ? c.thumb : photo(wordsOf(c.name), c.id + c.name)), title: `운영 중인 ${E(L('cls'))} <em>${run}개</em>, ${E(L('learner'))} ${N}명이 평균 ${pct(A)}까지 왔습니다`, sub: low ? `평균 진도 30% 미만 ${E(L('cls'))} ${low}개는 독려 메시지를 먼저 보내는 것이 좋습니다.` : `모든 ${E(L('cls'))}의 평균 진도가 30% 이상입니다.`, acts: [{ label: `AI로 새 ${L('cls')} 설계`, go: '[data-act="ai-design"]' }, { label: '직접 만들기', kind: 'sec', go: '[data-act="cls-new"]' }], stats: [[C.length + '개', '전체 ' + L('cls')], [N + '명', L('learner')], [pct(A), '평균 진도'], [low + '개', '30% 미만', low ? 'warn' : '']] };
    },
    enhance: main => {
      main.querySelectorAll('.d26-cc:not([data-l43])').forEach(card => {
        card.dataset.l43 = 1; const id = (card.querySelector('.c2ck') || {}).value; const c = id && C(id); if (!c) return;
        const th0 = card.querySelector('.d26-th0'); if (th0) { const u = photo(wordsOf(c.name), c.id + c.name); if (u) th0.outerHTML = `<img class="l43-ph" src="${E(u)}" alt="" loading="lazy">`; }
        const pri = card.querySelector('.d26-pri'); const n = (c.learners || []).length;
        if (pri) pri.insertAdjacentHTML('beforebegin', `<div class="l43-cprog"><span>평균 진도</span>${prog(cp(c))}<span class="l43-cn">${n}명</span></div>`);
      });
      /* 목록 보기: 과정명 칸 작은 썸네일이 비었으면 사진으로 */
      main.querySelectorAll('.c2nm .c2th0').forEach(s => { const a = s.closest('.c2nm'); const c = a && C(a.dataset.v); const u = c && photo(wordsOf(c.name), c.id + c.name); if (u) s.outerHTML = `<img class="c2th sm" src="${E(u)}" alt="">`; });
      /* 상세: 머리에 대표 사진 */
      if (UI.cls) { const c = C(UI.cls); const h2 = c && [...main.querySelectorAll('h1,h2')].find(h => h.firstChild && String(h.firstChild.textContent || '').trim() === c.name);
        if (h2 && !main.querySelector('.l43-dthumb') && !main.querySelector('.l43-k-photo')) { const u = c.thumb || photo(wordsOf(c.name), c.id + c.name); h2.classList.add('l43-dh2'); if (u) h2.insertAdjacentHTML('afterbegin', `<img class="l43-dthumb" src="${E(u)}" alt="">`); } }
    }
  });

  /* 2. 명단 · 진도 */
  reg('members', {
    brief: () => {
      if (UI.mem || !S.members.length) return null; const M0 = S.members, wait = M0.filter(m => m.grade === '승인 대기').length;
      const lim = (() => { try { return addDays(today(), -30); } catch (e) { return ''; } })(); const away = M0.filter(m => m.last && lim && m.last <= lim).length;
      const A = avgOf(M0.map(m => memAvg(m.id))); const low = M0.filter(m => S.classes.some(c => (c.learners || []).includes(m.id)) && memAvg(m.id) < 30).length;
      return { title: `${E(L('learner'))} <em>${M0.length}명</em> 가운데 ${low}명이 진도 30%에 못 미칩니다`, sub: `${wait ? `가입 승인 대기 ${wait}명을 먼저 처리하세요. ` : ''}${away ? `30일 넘게 접속하지 않은 ${away}명에게는 독려 메시지를 권합니다.` : '모두 최근 30일 안에 접속했습니다.'}`, acts: [wait ? { label: `승인 대기 ${wait}명 처리`, go: '[data-act="tab"][data-v="승인 대기"]' } : null, { label: `+ ${L('learner')} 추가`, kind: wait ? 'sec' : 'pri', go: '[data-act="mem-invite"]' }, { label: '선택 회원 메시지', kind: 'sec', go: '[data-act="cm-mem-msg"]' }].filter(Boolean).slice(0, 2), stats: [[M0.length + '명', '전체'], [wait + '명', '승인 대기', wait ? 'warn' : ''], [pct(A), '평균 진도'], [low + '명', '30% 미만', low ? 'warn' : '']],
        todo: [[`가입 승인 대기 ${wait}명`, wait ? '승인 전에는 홈페이지를 이용할 수 없습니다' : '대기 중인 가입 신청이 없습니다', wait ? 'warn' : 'ok'], [`진도 30% 미만 ${low}명`, '독려 메시지 초안을 AI SAM이 준비해 두었습니다', low ? 'warn' : 'ok'], [`30일 넘게 미접속 ${away}명`, away ? '알림톡 · 문자로 다시 안내하세요' : '모두 최근 30일 안에 접속했습니다', away ? 'warn' : 'ok']] };
    },
    enhance: main => {
      if (UI.mem) return; const tbl = main.querySelector('.tw table'); if (!tbl || tbl.dataset.l43m) return; tbl.dataset.l43m = 1;
      const hr = tbl.tHead && tbl.tHead.rows[0]; if (!hr) return; const ni = [...hr.cells].findIndex(th => NAMEH.test(th.textContent.trim())); if (ni < 0) return;
      hr.cells[ni].insertAdjacentHTML('afterend', '<th class="l43-sort" aria-sort="none">평균 진도</th>');
      [...tbl.tBodies[0].rows].forEach(tr => { const a = tr.querySelector('[data-act="mem-open"]'); const id = a && a.dataset.v; const has = id && S.classes.some(c => (c.learners || []).includes(id)); if (tr.cells[ni]) tr.cells[ni].insertAdjacentHTML('afterend', `<td class="l43-pc">${has ? prog(memAvg(id)) : '<span class="l43-mute">수강 없음</span>'}</td>`); });
      const b = main.querySelector('.mb-bulk'); if (b) b.classList.add('l43-bulk');
    }
  });

  /* 3. 평가 — 채점 대기 큐 */
  reg('assess', {
    brief: () => {
      if (UI.asDetail || UI.aItem) return null; let P = []; try { P = pend(); } catch (e) { }
      const cls = new Set(P.map(x => x.c.id)).size;
      return P.length ? { title: `채점을 기다리는 답안 <em>${P.length}건</em>이 있습니다`, sub: `${cls}개 ${E(L('cls'))}에서 제출했습니다. 오래 기다린 답안부터 채점하고, 나머지는 AI 평가로 초안을 받아 확정하세요.`, acts: [{ label: `대기 ${P.length}건 AI 평가`, go: '[data-act="ai-eval-all"]' }, { label: '오래된 답안부터 직접 채점', kind: 'sec', go: '[data-act="grade"]' }] } : { title: '채점할 답안이 <em>없습니다</em>', sub: '새 답안이 제출되면 이 화면 맨 위에 모입니다.' };
    },
    enhance: main => { main.querySelectorAll('.tw td .tag').forEach(t => { if (/^\d+일$/.test(t.textContent.trim())) { const d = parseInt(t.textContent, 10); t.classList.add('l43-age'); if (d >= 7) t.classList.add('old'); } }); }
  });

  /* 4. 설정 루트 · 메뉴 구성 */
  reg('settings', {
    brief: () => {
      if (UI.sxOpen) return null; let onM = 0; /* v43 R3: 하위 설정을 열지 않은 루트만 */ try { onM = Object.values(S.nav.tabs).flat().filter(x => x.on && MENU[x.id]).length; } catch (e) { }
      const adm = (S.admins || []).length, au = (S.autos || []).filter(a => a.on).length;
      return { eye: '운영 설정', title: `켜진 메뉴 <em>${onM}개</em>로 스튜디오를 운영하고 있습니다`, sub: '메뉴 · 사용자 · 알림 · 외부 연결을 여기서 바꿉니다. 바꾼 내용은 바로 저장됩니다.', stats: [[onM + '개', '켜진 메뉴'], [adm + '명', '운영자'], [au + '개', '자동 운영']],
        todo: (() => { const st = S.settings || {}; const pg = st.pg && st.pg !== 'none'; const tos = st.terms && st.terms.tos; return [[`결제 연결 ${pg ? '사용 중' : '미연결'}`, pg ? '수강료 결제를 받을 수 있습니다' : '외부 연결에서 PG를 고르면 결제를 받을 수 있습니다', pg ? 'ok' : 'warn'], [`이용약관 · 개인정보 처리방침 ${tos ? '등록됨' : '미등록'}`, tos ? '홈페이지 아래에 노출됩니다' : '기본 문안으로 바로 등록할 수 있습니다', tos ? 'ok' : 'warn'], [`자동 운영 ${au}개 켜짐`, `운영자 ${adm}명 · 켜진 메뉴 ${onM}개`, 'ok']]; })() };
    },
    enhance: main => { if (UI.sxOpen) return; const pg = main.querySelector('.sx-page'); if (!pg || pg.classList.contains('sx3')) return; pg.classList.add('q1-wide');
      const toc = [...pg.querySelectorAll('.sx-card[id]')].map(c => [((c.querySelector('h2,h3,b') || {}).textContent || c.id).trim().slice(0, 18), '', c.id]);
      const st = S.settings || {}; const tips = []; if (!(st.terms && st.terms.tos)) tips.push('이용약관 · 개인정보 처리방침을 기본 문안으로 등록하세요'); if (!st.pg || st.pg === 'none') tips.push('결제 연결(PG)을 고르면 수강료 결제를 받을 수 있습니다'); if (/^org-/.test(S.org.domain || '')) tips.push('홈페이지 주소를 영문 도메인으로 바꾸세요');
      side(main, pg, acard({ t: '설정 목차', items: toc }) + acard({ ai: true, t: 'AI SAM 제안', p: tips.length ? tips.map(E).join('<br>') : '필수 설정을 모두 마쳤습니다. 자동 운영 규칙을 하나 더 켜 보세요.' })); }
  });

  /* 5. 기관 유형 전용 */
  reg('compliance', {
    brief: () => {
      const Lg = S.classes.filter(c => c.legal); if (!Lg.length) return null;
      const tot = Lg.reduce((a, c) => a + (c.learners || []).length, 0), dn = Lg.reduce((a, c) => { try { return a + doneN(c); } catch (e) { return a; } }, 0); const r = tot ? dn / tot * 100 : 0;
      const ends = Lg.map(c => c.end).filter(Boolean).sort(); const first = ends[0];
      return { eye: '법정의무교육', title: `평균 이수율 <em>${pct(r)}</em>, 미이수 ${tot - dn}건에 독려가 필요합니다`, sub: first ? `가장 빠른 마감은 ${E(first)}입니다. 부서별 이수율이 낮은 팀부터 독려하세요.` : '', stats: [[Lg.length + '종', '법정 교육'], [pct(r), '평균 이수율', r < 50 ? 'warn' : ''], [(tot - dn) + '건', '미이수', tot - dn ? 'warn' : '']] };
    }
  });
  reg('hrd', {
    brief: () => {
      const R = (S.hrd && S.hrd.reports) || []; const w = R.filter(r => r.st === '전송 대기').length; let low = 0; try { low = lowAttN(); } catch (e) { }
      return { eye: 'HRD-Net 보고', title: w ? `HRD-Net 보고 대기 <em>${w}건</em>, 출석률 80% 미만 훈련생 ${low}명` : `출석률 80% 미만 훈련생 <em>${low}명</em>을 먼저 확인하세요`, sub: `${w ? '' : '전송을 기다리는 보고는 없습니다. '}수료 요건은 진도율 · 평가 성적 · 출석률을 함께 봅니다.`, stats: [[(window.DDStat ? DDStat.learnerN() : S.members.length) + '명', '훈련생'], [low + '명', '출석 80% 미만', /* v43 P1-F03 DDStat */ low ? 'warn' : ''], [w + '건', '보고 대기', w ? 'warn' : '']] };
    }
  });
  reg('crmstu', {
    brief: () => {
      if (UI.crmId) return null; const st = (S.members || []).filter(m => !m.withdrawn); if (!st.length) return null;
      const unpaid = (S.bills || []).filter(b => b.status === '미납').length; const tch = new Set(st.map(m => m.grade || '').filter(Boolean)).size;
      return { eye: '원생', title: unpaid ? `재원생 <em>${st.length}명</em> · 이번 달 미납 ${unpaid}건을 먼저 확인하세요` : `재원생 <em>${st.length}명</em>의 수업 · 출결 · 수납을 한곳에서 봅니다`, stats: [[st.length + '명', '재원생'], [S.classes.length + '개', '수업'], [unpaid + '건', '미납', unpaid ? 'warn' : '']].concat(tch > 1 ? [] : []) };
    }
  });
  reg('lmsa', {
    brief: main => {
      if (UI.lmsaId || UI.lmsSec) return null; const rows = main.querySelectorAll('.tw tbody tr').length; if (!rows) return null;
      const sel = main.querySelector('select'); const term = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent.replace(/\s*\(.*\)$/, '') : '이번 학기';
      return { eye: '학사 LMS', title: `${E(term)} 분반 <em>${rows}개</em>를 운영합니다`, sub: '같은 과목의 분반은 대표 분반 자료를 한 번에 복제할 수 있습니다.' };
    }
  });
})();
