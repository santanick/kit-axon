/* v34.5 hpsec-trust — 신뢰 요소 기본 렌더러(디자이너 S4 · fix6/BRIEF3.md)
   대상: 숫자 · 후기 · 강사 · 공지(+ '공지 | 묻고 답하기' 2열) · FAQ · 일정(모집 · 접수 D-day) · 인증
   원칙(BRIEF.md 사실 원칙)
     - 숫자: HPT.facts()만(그릴 때마다 실제 강좌에서 다시 셈). 템플릿이 넣은 숫자 칸('80%' 등)은 쓰지 않는다.
     - 후기: HPT.reviews()만(질문 · 문의 글 제외). 0개면 섹션을 숨긴다.
     - 강사: 강좌에 등록된 강사(c.intro)만. 사진이 없으면 이름 첫 글자. 샘플 사진 · 지어낸 이름 없음.
     - FAQ: 답은 설정값(수강 기간 · 수료 기준 · 결제/환불 · 약관 환불 조항 · 운영 시간 · 주소 · 모집 기간)에서만.
            운영자가 직접 쓴 질문은 그대로 쓰고, 템플릿 샘플 문구는 게시본에서 뺀다(바로 고치기 화면에서는 '샘플 문구'로 보이고, 고치면 게시된다).
     - 일정: 실제 강좌의 모집 기간(c.recruit) · 개강일(c.start)만. 없으면 숨긴다.
     - 인증: 등록된 인증 · 지정 정보(S.settings.certs 또는 site.certs = [{ name, by, no, at }])만. 없으면 숨긴다.
   연결: hpth의 proSec(테마 렌더러)을 한 겹 감싼다. 레이아웃 계열(HPL)이 null을 돌려주면 이 렌더러가 쓰인다.
         CSS는 siteHTML의 <style>에 덧붙인다(게시본 Shadow DOM = 미리보기). G1 토큰(--hd-ff · --t-h2 · --sec · --r/--rs/--br · --btn-h · --bd · --ring)을 쓴다.
   배치: 대학 · 평생 · 공공은 공지를 첫 화면 바로 아래로(HPT.enrich 감쌈). 실제 일정이 있는 대학 · 평생 · 공공 · 직업훈련은 일정 섹션을 넣는다.
   인터페이스: window.HPS.trust(kind, site, o) → HTML(section) | ''
     kind = facts | reviews | teachers | notices | board | faq | schedule | cert
     o = { d(섹션 data), alt(회색 띠), tone('photo' = 사진 · 어두운 바탕 위 숫자 줄), bare(섹션 틀 없이 안쪽만), n(개수) }
     HPS.trustData(kind) → 그 부품이 쓰는 실제 데이터(계열 디자이너 재사용) */
'use strict';
(() => {
  const HPS = window.HPS = window.HPS || {};
  if (typeof siteHTML !== 'function' || typeof proSec !== 'function') return;

  /* ── 도구 ── */
  const E = v => esc(v == null ? '' : v);
  const br = v => E(v).replace(/\n/g, '<br>');
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const term = k => (typeof t === 'function' ? t(k) : k === 'cls' ? '강좌' : k);
  const tday = () => (typeof today === 'function' ? today() : (typeof ymdL === 'function' ? ymdL(new Date()) : new Date().toISOString().slice(0, 10)));
  const dot = d => String(d || '').replace(/-/g, '.');
  const okD = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''));
  const days = (a, b) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5);
  const pubAll = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료');
  const pub = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };
  const ft = () => (S.settings && S.settings.footer) || {};
  const menuOf = (s, kind) => ((s && s.menus) || []).find(m => m.kind === kind && m.on !== false);
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const typeKey = () => (S && S.org ? (S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type) : 'adult');
  const IC = {
    plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
    mail: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>',
    seal: '<path d="M12 3l2.2 1.6 2.7-.2.9 2.6 2.3 1.4-.8 2.6.8 2.6-2.3 1.4-.9 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.9-2.6-2.3-1.4.8-2.6-.8-2.6 2.3-1.4.9-2.6 2.7.2z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
    user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'
  };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || ''}</svg>`;
  const ini = n => (String(n || '').trim().replace(/\s*(강사|교수|선생님|님|코치|멘토|튜터)$/, '').replace(/^[^가-힣A-Za-z0-9]+/, '').slice(0, 1) || '·').toUpperCase();
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

  /* ── 템플릿 샘플 문구 판별: 템플릿 정의에 그대로 들어 있는 글은 '샘플'(운영자가 고치면 샘플이 아님) ── */
  let SAMP = null;
  function samples() { if (SAMP) return SAMP; const set = new Set(); const add = v => { const k = clean(v); if (k.length >= 2) set.add(k); };
    const walk = o => { if (o == null) return; if (typeof o === 'string') return add(o); if (Array.isArray(o)) return o.forEach(walk); if (typeof o === 'object') Object.keys(o).forEach(k => { if (k !== 'img' && k !== 'ids') walk(o[k]); }); };
    try { (typeof TPL !== 'undefined' && Array.isArray(TPL) ? TPL : []).forEach(tp => { try { const L = typeof tp.build === 'function' ? tp.build() : []; (L || []).forEach(x => { const d = (x && x.data) || {}; if (x && x.type === 'text' && /^(info|stats|profiles|timeline)$/.test(d.variant || '')) walk(d.cols); }); } catch (e) { }
      try { const src = String(tp.build || ''); (src.match(/'[^'\n]{2,200}'/g) || []).forEach(m => add(m.slice(1, -1))); } catch (e) { } }); } catch (e) { }
    try { if (typeof SITEV2 !== 'undefined') walk(JSON.parse(JSON.stringify(SITEV2, (k, v) => typeof v === 'function' ? String(v) : v))); } catch (e) { }
    /* 기존 렌더러 · 유형 문구에 있는 FAQ 샘플 */
    ['레벨 테스트는 어떻게 하나요?'].forEach(add);
    SAMP = set; return set; }
  const isSample = row => { const S0 = samples(); const V = row.map(clean).filter(v => v.length >= 2); return V.length > 0 && V.every(v => S0.has(v)); };
  HPS._isSample = isSample;

  /* ══ 데이터(사실만) ══ */
  const facts = () => { try { return (window.HPT && HPT.facts && HPT.facts()) || []; } catch (e) { return []; } };
  const reviews = () => { try { return (window.HPT && HPT.reviews && HPT.reviews()) || []; } catch (e) { return []; } };
  function teachers() { const map = new Map();
    pub().forEach(c => (c.intro || []).forEach(x => { const n = clean(x && x.name); if (!n || isPh(n)) return; const m = map.get(n) || { n, bio: '', photo: '', cls: [] };
      const b = clean(x.bio); if (b && !isPh(b) && b.length > m.bio.length) m.bio = b; if (!m.photo && x.photo && /^(data:image\/|https?:|\/|img\/|api\/)/.test(String(x.photo))) m.photo = String(x.photo);
      if (!m.cls.includes(c.name)) m.cls.push(c.name); map.set(n, m); }));
    return [...map.values()].slice(0, 8); }
  function noticeList(n) { const L = [...(S.notices || []).map(x => ({ x, c: null })), ...((S.classes || []).flatMap(c => (c.notices || []).map(x => ({ x, c }))))]
      .filter(o => o.x && clean(o.x.title) && !o.x.hidden && !o.x.draft).sort((a, b) => (!!b.x.pin - !!a.x.pin) || String(b.x.at || '').localeCompare(String(a.x.at || '')));
    return L.slice(0, n || 5).map(o => ({ id: o.x.id, title: clean(o.x.title), at: String(o.x.at || '').slice(0, 10), pin: !!o.x.pin, tag: o.c ? String(o.c.name).slice(0, 10) : o.x.pin ? '중요' : '공지', top: !o.c && !!o.x.pin, isNew: okD(o.x.at) && days(o.x.at, tday()) <= 7 && days(o.x.at, tday()) >= 0 })); }
  const QA_RE = /묻고|질문|Q\s*&\s*A|QnA|문의/i;
  function qaList(n) { const B = (S.boards || []).filter(b => QA_RE.test(`${b.id} ${b.name}`)).map(b => b.id);
    return (S.posts || []).filter(p => p && !p.hidden && !p.priv && (B.includes(p.board) || QA_RE.test(String(p.board || '')) || (p.kind === '질문' && p.board !== '수강후기')) && clean(p.title))
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n || 5)
      .map(p => ({ id: p.id, title: clean(p.title), at: String(p.at || '').slice(0, 10), done: Array.isArray(p.cmts || p.comments || p.replies) && (p.cmts || p.comments || p.replies).length > 0 })); }
  /* FAQ: 설정값에서 만든 답 */
  function faqAuto() { const C = pub(); const Q = []; const cl = term('cls'); const f = ft();
    const perOf = c => c.period && c.period.mode === 'days' && +c.period.days ? `신청일부터 ${+c.period.days}일` : (c.start || c.end) ? [dot(c.start), dot(c.end)].filter(Boolean).join(' ~ ') : '';
    if (C.length) { const P = [...new Set(C.map(perOf).filter(Boolean))];
      if (P.length === 1) Q.push(['수강 기간은 얼마나 되나요?', `${P[0]} 동안 수강할 수 있습니다.`]);
      else if (P.length > 1) Q.push(['수강 기간은 얼마나 되나요?', `${cl}마다 다릅니다. ${C.filter(perOf).slice(0, 2).map(c => `「${c.name}」은 ${perOf(c)}`).join(', ')}입니다.`]); }
    const R = C.filter(c => c.recruit && c.recruit.on && (okD(c.recruit.from) || okD(c.recruit.to)));
    if (R.length) { const c = R.find(c => !okD(c.recruit.to) || c.recruit.to >= tday()) || R[0]; Q.push(['신청은 언제 할 수 있나요?', `「${c.name}」은 ${okD(c.recruit.from) ? dot(c.recruit.from) : '지금'}부터 ${okD(c.recruit.to) ? dot(c.recruit.to) + '까지' : '상시'} 신청할 수 있습니다.${+c.recruit.cap ? ` 정원은 ${+c.recruit.cap}명입니다.` : ''}`]); }
    const cert = C.filter(c => c.cert === 'auto' && c.criteria && +c.criteria.threshold);
    if (cert.length) { const th = [...new Set(cert.map(c => +c.criteria.threshold))].sort((a, b) => a - b); Q.push(['수료증은 어떻게 받나요?', `진도 · 시험 · 과제를 합산해 ${th.length === 1 ? th[0] + '점' : th[0] + '~' + th[th.length - 1] + '점'} 이상이면 수료증이 자동으로 발급됩니다.`]); }
    else if (C.some(c => c.cert === 'manual')) Q.push(['수료증은 어떻게 받나요?', '수료 기준을 채우면 운영자가 확인한 뒤 수료증을 발급합니다.']);
    const pg = S.settings && S.settings.pg === 'toss' && S.settings.toss && S.settings.toss.status === '승인';
    const tos = String((S.settings && S.settings.terms && (S.settings.terms.refund || S.settings.terms.tos)) || ''); const rf = (tos.split(/\n+|(?<=[.다])\s+/).map(clean).find(x => /환불/.test(x) && x.length >= 10 && x.length <= 160 && !isPh(x))) || '';
    if (C.some(c => +c.price)) { if (pg || rf) Q.push(['결제와 환불은 어떻게 하나요?', [pg ? `수강 신청 화면에서 온라인으로 결제합니다.` : '', rf || (pg ? '환불은 로그인 후 내 결제 내역에서 신청하며, 이용약관의 환불 규정을 따릅니다.' : '')].filter(Boolean).join(' ')]); }
    else if (C.length) Q.push(['수강료가 있나요?', `지금 공개된 ${cl}은 모두 무료입니다.`]);
    if (f.hours && !isPh(f.hours)) Q.push(['상담은 언제 받을 수 있나요?', `운영 시간은 ${clean(f.hours)}입니다.${f.tel && !isPh(f.tel) ? ` 전화 ${clean(f.tel)}로 연락하세요.` : ''}`]);
    if (f.addr && !isPh(f.addr) && C.some(c => /offline|blend/.test(c.kind || ''))) Q.push(['수업 장소는 어디인가요?', `${clean(f.addr)}에서 진행합니다.`]);
    return Q.slice(0, 6); }
  /* FAQ 전체: 설정값 답 + 운영자가 직접 쓴 질문(템플릿 샘플은 편집 화면에서만 표시) */
  function faqItems(d) { const auto = faqAuto().map(r => ({ q: r[0], a: r[1], auto: 1 })); const own = []; const smp = [];
    if (d && d.hpt !== 'faq') (d.cols || []).filter(r => r && clean(r[0]) && clean(r[1]) && !isPh(r[1])).forEach(r => { (isSample(r) ? smp : own).push({ q: clean(r[0]), a: String(r[1]), raw: r }); });
    const seen = new Set(); const out = [];
    [...own, ...auto].forEach(x => { const k = x.q.replace(/\s/g, ''); if (seen.has(k)) return; seen.add(k); out.push(x); });
    return { items: out.slice(0, 7), smp: smp.filter(x => !seen.has(x.q.replace(/\s/g, ''))) }; }
  /* 일정: 실제 강좌의 모집 · 개강일 */
  function schedule(n) { const T0 = tday(); const L = [];
    pub().forEach(c => { const r = c.recruit && c.recruit.on ? c.recruit : null; const from = r && okD(r.from) ? r.from : ''; const to = r && okD(r.to) ? r.to : ''; const st = okD(c.start) ? String(c.start).slice(0, 10) : '';
      if (!from && !to && !(st && st >= T0)) return;
      let state, target, what;
      if (r && from && from > T0) { state = 'soon'; target = from; what = '접수 시작'; }
      else if (r && to && to < T0) { state = 'closed'; target = st && st >= T0 ? st : ''; what = target ? '개강' : ''; }
      else if (r) { state = 'open'; target = to; what = to ? '접수 마감' : ''; }
      else { state = 'start'; target = st; what = '개강'; }
      const dd = target ? days(T0, target) : null;
      L.push({ id: c.id, name: c.name, state, from, to, start: st, cap: r && +r.cap ? +r.cap : 0, dd, what, sortKey: (state === 'closed' ? '9' : '0') + (target || '9999') }); });
    return L.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(0, n || 4); }
  /* 인증 · 지정: 등록된 것만 */
  function certs(s) { const A = [].concat((S.settings && Array.isArray(S.settings.certs) ? S.settings.certs : []), (s && Array.isArray(s.certs) ? s.certs : []));
    const seen = new Set(); return A.filter(x => x && clean(x.name) && !isPh(x.name)).filter(x => { const k = clean(x.name); if (seen.has(k)) return false; seen.add(k); return true; })
      .map(x => ({ name: clean(x.name), by: clean(x.by), no: clean(x.no), at: okD(x.at) ? String(x.at).slice(0, 10) : '' })).slice(0, 6); }
  function contact() { const f = ft(); const L = [];
    if (f.tel && !isPh(f.tel)) L.push({ k: 'phone', v: clean(f.tel), h: 'tel:' + String(f.tel).replace(/[^\d+]/g, '') });
    if (f.email && !isPh(f.email) && /@/.test(f.email)) L.push({ k: 'mail', v: clean(f.email), h: 'mailto:' + clean(f.email) });
    if (f.hours && !isPh(f.hours)) L.push({ k: 'clock', v: clean(f.hours), h: '' });
    return L; }
  const askHref = s => { const c = contact().find(x => x.h); if (c) return c.h; const m = menuOf(s, 'community') || menuOf(s, 'board'); return m ? '#p-m-' + m.id : ''; };
  HPS.trustData = k => ({ facts, reviews, teachers, notices: noticeList, qa: qaList, faq: () => faqItems({}).items, schedule, certs: () => certs(typeof site === 'function' ? site() : null) }[k] || (() => null))();

  /* ══ 부품 ══ */
  const SEC = (k, inner, o) => o.bare ? inner : `<section class="hpt hp-s hps-t hps-${k}${o.alt ? ' hp-alt' : ''}"><div class="hp-w">${inner}</div></section>`;
  const HEAD = (d, def, more) => { const ey = d.eyebrow; const ti = d.title || def; return `<div class="hps-hd">${ey ? `<p class="hp-ey">${E(ey)}</p>` : ''}${ti ? `<h2>${br(ti)}</h2>` : ''}${d.sub ? `<p class="hps-sd">${E(d.sub)}</p>` : ''}${more || ''}</div>`; };
  const hint = (k, msg, o) => editing() && !o.bare ? `<section class="hpt hp-s hps-t hps-${k} hps-empty"><div class="hp-w"><p class="hp-hint">${E(msg)}</p></div></section>` : '';
  const numCell = x => { const tx = !/^\d[\d,.]*$/.test(String(x.v)); return `<li${tx ? ' class="tx"' : ''}><b><span class="v">${E(x.v)}</span>${x.u ? `<small>${E(x.u)}</small>` : ''}</b><span class="l">${E(x.l)}</span></li>`; };

  const R = {};
  /* 숫자: HPT.facts만. 템플릿 샘플 숫자는 무시, 운영자가 직접 쓴 숫자 칸만 존중 */
  R.facts = (s, o) => { const d = o.d || {}; const F = facts();
    const own = d.hpt === 'facts' ? [] : (d.cols || []).filter(r => r && clean(r[0]) && !isSample(r)).map(r => { const m = String(r[0]).match(/^([\d.,]+)\s*(.*)$/); return m ? { v: m[1], u: m[2], l: clean(r[1]) } : { v: clean(r[0]), u: '', l: clean(r[1]) }; });
    const L = own.length >= 2 ? own : F; if (L.length < 2) return hint('facts', '공개 강좌가 2개 이상이면 실제 숫자(강좌 수 · 차시 · 수료증)가 자동으로 표시됩니다. 템플릿 예시 숫자는 쓰지 않습니다.', o);
    const ul = `<ul class="hps-fl n${Math.min(L.length, 4)}">${L.slice(0, 4).map(numCell).join('')}</ul>`;
    if (o.tone === 'photo') return `<ul class="hps-fl hps-fl-ph n${Math.min(L.length, 4)}">${L.slice(0, 4).map(numCell).join('')}</ul>`;
    const note = own.length >= 2 ? '' : `<p class="hps-fn">공개 ${E(term('cls'))} 기준 자동 집계 · <time>${E(dot(tday()))}</time></p>`;
    return SEC('facts', `${d.title ? HEAD(d, '') : ''}${ul}${note}`, o); };

  /* 후기: 실제 후기만 · 대표 인용 1개 + 목록 */
  R.reviews = (s, o) => { const d = o.d || {}; const A = reviews(); if (!A.length) return hint('reviews', '실제 수강후기가 등록되면 이곳에 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).', o);
    const L = A.slice().sort((a, b) => (b.st - a.st) || (Math.min(b.b.length, 140) - Math.min(a.b.length, 140))).slice(0, +o.n || 4); const top = L[0]; const rest = L.slice(1);
    const st = A.filter(r => r.st > 0); const avg = st.length >= 2 ? (st.reduce((a, r) => a + Math.min(5, r.st), 0) / st.length) : 0;
    const stars = n => `<span class="hps-st" role="img" aria-label="별점 ${n}점">${'★'.repeat(Math.min(5, n))}<i>${'★'.repeat(5 - Math.min(5, n))}</i></span>`;
    const sum = `<div class="hps-rvs">${avg ? `<p class="hps-avg"><b>${avg.toFixed(1)}</b><small>/ 5</small></p>` : ''}<p class="hps-cnt">실제 수강후기 <b>${A.length}</b>건${avg ? ` · 별점 ${st.length}건 평균` : ''}</p></div>`;
    const who = r => `<span class="hps-av" aria-hidden="true">${E(ini(r.w))}</span><span class="hps-wh"><b>${E(r.w)}</b>${r.c ? `<small>${E(r.c)}</small>` : ''}</span>`;
    const big = `<figure class="hps-q1">${top.st ? stars(top.st) : ''}<blockquote>${E(String(top.b).slice(0, 220))}</blockquote><figcaption>${who(top)}</figcaption></figure>`;
    const list = rest.length ? `<ul class="hps-rl">${rest.map(r => `<li><blockquote>${E(String(r.b).slice(0, 140))}</blockquote><p class="hps-rm">${who(r)}${r.st ? stars(r.st) : ''}</p></li>`).join('')}</ul>` : '';
    const m = menuOf(s, 'community') || menuOf(s, 'board'); const more = m && A.length > L.length ? `<a class="hps-more" href="#p-m-${E(m.id)}">후기 더 보기 ${ic('arrow', 16)}</a>` : '';
    return SEC('reviews', `<div class="hps-rvg${rest.length ? '' : ' one'}"><div class="hps-rvh">${HEAD({ eyebrow: d.eyebrow, title: d.title || '수강생 이야기', sub: d.sub })}${sum}${more}</div><div class="hps-rvb">${big}${list}</div></div>`, o); };

  /* 강사: 등록된 강사만 · 사진 없으면 이니셜 */
  R.teachers = (s, o) => { const d = o.d || {}; const P = teachers();
    const smp = editing() && d.hpt !== 'people' ? (d.cols || []).filter(r => r && clean(r[0]) && isSample(r)) : [];
    if (!P.length && !smp.length) return hint('teachers', `${term('cls')}에 강사를 등록하면 이곳에 소개됩니다(사진이 없으면 이름 첫 글자로 표시).`, o);
    const card = p => `<article class="hps-tcc"><div class="hps-tph${p.photo ? '' : ' none'}">${p.photo ? `<img src="${E(p.photo)}" alt="${E(p.n)} 사진" loading="lazy" decoding="async">` : `<span aria-hidden="true">${E(ini(p.n))}</span>`}</div><div class="hps-tcb"><h3>${E(p.n)}</h3>${p.cls.length ? `<p class="hps-tcl">${E(p.cls.slice(0, 2).join(' · '))}${p.cls.length > 2 ? ` 외 ${p.cls.length - 2}` : ''}</p>` : ''}${p.bio ? `<p class="hps-tbio">${E(p.bio.slice(0, 140))}</p>` : ''}</div></article>`;
    const sc = smp.map(r => `<article class="hps-tcc is-sample"><div class="hps-tph none"><span aria-hidden="true">${E(ini(r[0]))}</span></div><div class="hps-tcb"><span class="hps-smp">샘플 문구 · 고치면 게시돼요</span><h3>${E(r[0])}</h3>${r[1] ? `<p class="hps-tbio">${E(r[1])}</p>` : ''}</div></article>`).join('');
    const n = P.length + (editing() ? smp.length : 0); const ph = P.some(p => p.photo);
    if (!ph) { const row = (p, sm) => `<li${sm ? ' class="is-sample"' : ''}><span class="hps-tav" aria-hidden="true">${E(ini(p.n))}</span><div class="hps-tcb">${sm ? '<span class="hps-smp">샘플 문구 · 고치면 게시돼요</span>' : ''}<h3>${E(p.n)}</h3>${p.cls.length ? `<p class="hps-tcl">${E(p.cls.slice(0, 2).join(' · '))}${p.cls.length > 2 ? ` 외 ${p.cls.length - 2}` : ''}</p>` : ''}${p.bio ? `<p class="hps-tbio">${E(p.bio.slice(0, 140))}</p>` : ''}</div></li>`;
      const L = [...P.map(p => row(p)), ...smp.map(r => row({ n: clean(r[0]), bio: clean(r[1]), cls: [] }, 1))];
      return SEC('teachers', `<div class="hps-trg"><div class="hps-trh">${HEAD({ eyebrow: d.eyebrow, title: d.title || '함께하는 강사진', sub: d.sub })}<p class="hps-trn"><b>${P.length}</b>명 · 등록된 강사</p></div><ul class="hps-tr n${Math.min(n, 3)}">${L.join('')}</ul></div>`, o); }
    return SEC('teachers', `${HEAD({ eyebrow: d.eyebrow, title: d.title || '함께하는 강사진', sub: d.sub })}<div class="hps-tg n${Math.min(n, 4)}">${P.map(card).join('')}${sc}</div>`, o); };

  /* 공지: 제목 한 줄 + 날짜 + 더보기 */
  const ntRows = L => `<ul class="hps-nl">${L.map(x => `<li${x.top ? ' class="is-pin"' : ''}><span class="hps-tag">${E(x.tag)}</span><span class="hps-tt"><b>${E(x.title)}</b>${x.isNew ? '<em class="hps-new" aria-label="새 글">N</em>' : ''}</span><time datetime="${E(x.at)}">${E(dot(x.at))}</time></li>`).join('')}</ul>`;
  R.notices = (s, o) => { const d = o.d || {}; const L = noticeList(+d.n || +o.n || 5); if (!L.length) return hint('notices', '공지사항을 올리면 이곳에 최신 글이 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).', o);
    const m = menuOf(s, 'notice'); const more = m ? `<a class="hps-more" href="#p-m-${E(m.id)}" aria-label="공지사항 더보기">더보기 ${ic('plus', 16)}</a>` : '';
    const top = !!o.top; const ti = d.title || '공지사항';
    return SEC('notices' + (top ? ' hps-ntop' : ''), `<div class="hps-ntw"><div class="hps-nth">${d.eyebrow && !top ? `<p class="hp-ey">${E(d.eyebrow)}</p>` : ''}<h2>${br(ti)}</h2>${more}</div>${ntRows(L)}</div>`, o); };
  /* 공지 | 묻고 답하기 2열 */
  R.board = (s, o) => { const d = o.d || {}; const N = noticeList(5); const Q = qaList(5); if (!Q.length) return R.notices(s, o); if (!N.length && !Q.length) return hint('notices', '공지 · 묻고 답하기 글이 이곳에 표시됩니다.', o);
    const mN = menuOf(s, 'notice'); const mQ = menuOf(s, 'community') || menuOf(s, 'board');
    const col = (ti, rows, m, empty) => `<div class="hps-bc"><div class="hps-nth"><h3>${E(ti)}</h3>${m ? `<a class="hps-more" href="#p-m-${E(m.id)}" aria-label="${E(ti)} 더보기">더보기 ${ic('plus', 16)}</a>` : ''}</div>${rows || `<p class="hps-none">${E(empty)}</p>`}</div>`;
    const qRows = `<ul class="hps-nl">${Q.map(x => `<li><span class="hps-tag${x.done ? ' ok' : ''}">${x.done ? '답변 완료' : '질문'}</span><span class="hps-tt"><b>${E(x.title)}</b></span><time datetime="${E(x.at)}">${E(dot(x.at))}</time></li>`).join('')}</ul>`;
    return SEC('board', `${d.title ? HEAD(d, '') : ''}<div class="hps-b2">${col('공지사항', N.length ? ntRows(N) : '', mN, '새 공지가 없습니다.')}${col('묻고 답하기', qRows, mQ, '')}</div>`, o); };

  /* FAQ: 2단(왼쪽 제목 + 문의 상자 · 오른쪽 아코디언) */
  R.faq = (s, o) => { const d = o.d || {}; const { items, smp } = faqItems(d); const ed = editing();
    if (!items.length && !(ed && smp.length)) return hint('faq', '수강 기간 · 수료 기준 · 환불 · 운영 시간을 설정하면 자주 묻는 질문이 자동으로 만들어집니다.', o);
    const C = contact(); const h = askHref(s);
    const box = C.length || h ? `<div class="hps-ask"><h3>더 궁금한 점이 있나요?</h3>${C.length ? `<ul>${C.map(c => `<li>${ic(c.k, 18)}${c.h ? `<a href="${E(c.h)}">${E(c.v)}</a>` : `<span>${E(c.v)}</span>`}</li>`).join('')}</ul>` : ''}${h ? `<a class="hps-btn" ${aAttr(h)}>문의하기 ${ic('arrow', 18)}</a>` : ''}</div>` : '';
    const it = (x, k) => `<details${k === 0 ? ' open' : ''}><summary><span>${E(x.q)}</span><i aria-hidden="true">${ic('plus', 18)}</i></summary><div class="hps-ans"><p>${br(x.a)}</p></div></details>`;
    const sm = ed ? smp.map(x => `<details class="is-sample"><summary><span>${E(x.q)}</span><i aria-hidden="true">${ic('plus', 18)}</i></summary><div class="hps-ans"><span class="hps-smp">샘플 문구 · 고치면 게시돼요</span><p>${br(x.a)}</p></div></details>`).join('') : '';
    return SEC('faq', `<div class="hps-fqg"><div class="hps-fqh">${HEAD({ eyebrow: d.eyebrow, title: d.title || '자주 묻는 질문', sub: d.sub })}${box}</div><div class="hps-qa">${items.map(it).join('')}${sm}</div></div>`, o); };

  /* 일정: 모집 · 접수 기간 + D-day */
  const STL = { open: '모집 중', soon: '모집 예정', closed: '모집 마감', start: '개강 예정' };
  R.schedule = (s, o) => { const d = o.d || {}; const L = schedule(+o.n || 4); if (!L.length) return hint('schedule', `${term('cls')}에 모집 기간이나 개강일을 넣으면 이곳에 일정과 D-day가 표시됩니다.`, o);
    const dd = x => x.dd == null ? `<span class="hps-dd none"><b>상시</b><small>${x.state === 'open' ? '접수 중' : ''}</small></span>` : `<span class="hps-dd"><b>${x.dd === 0 ? 'D-DAY' : x.dd > 0 ? 'D-' + x.dd : 'D+' + (-x.dd)}</b><small>${E(x.what)}${x.dd > 0 ? '까지' : ''}</small></span>`;
    const row = x => `<li class="st-${x.state}">${dd(x)}<div class="hps-sn"><span class="hps-chip">${STL[x.state]}</span><h3>${E(x.name)}</h3></div><dl class="hps-sm">${x.from || x.to ? `<div><dt>접수</dt><dd><time>${E(x.from ? dot(x.from) : '지금')}</time> ~ <time>${E(x.to ? dot(x.to) : '상시')}</time></dd></div>` : ''}${x.start ? `<div><dt>개강</dt><dd><time>${E(dot(x.start))}</time></dd></div>` : ''}${x.cap ? `<div><dt>정원</dt><dd>${x.cap}명</dd></div>` : ''}</dl>${x.state !== 'closed' ? `<a class="hps-go" href="#p-c-${E(x.id)}">${x.state === 'open' ? '신청하기' : '자세히'} ${ic('arrow', 16)}</a>` : '<span class="hps-go off">마감</span>'}</li>`;
    return SEC('schedule', `${HEAD({ eyebrow: d.eyebrow, title: d.title || '모집 일정', sub: d.sub })}<ol class="hps-sl">${L.map(row).join('')}</ol>`, o); };

  /* 인증 · 지정 */
  R.cert = (s, o) => { const d = o.d || {}; const L = certs(s); if (!L.length) return hint('cert', '설정에 인증 · 지정 정보(이름 · 기관 · 번호)를 등록하면 이곳에 표시됩니다(없으면 숨겨집니다).', o);
    return SEC('cert', `<div class="hps-ctw"><h2 class="hps-ctt">${E(d.title || '인증 · 지정')}</h2><ul class="hps-ctl">${L.map(x => `<li>${ic('seal', 22)}<div><b>${E(x.name)}</b>${x.by || x.no || x.at ? `<small>${E([x.by, x.no, x.at ? dot(x.at) : ''].filter(Boolean).join(' · '))}</small>` : ''}</div></li>`).join('')}</ul></div>`, o); };

  HPS.trust = (kind, s, o) => { o = o || {}; s = s || (typeof site === 'function' ? site() : null); const f = R[{ stats: 'facts', people: 'teachers', profiles: 'teachers', qa: 'board', notice: 'notices', timeline: 'schedule', certs: 'cert' }[kind] || kind];
    if (!f) return ''; try { return f(s, o) || ''; } catch (e) { console.error('HPS.trust', kind, e); return ''; } };

  /* ══ proSec 감싸기: 테마가 있는 사이트의 신뢰 섹션을 이 렌더러로 ══ */
  const thOn = s => !!(s && s.theme && window.HPT && HPT.has && HPT.has(s.theme));
  function kindOf(x) { const d = x.data || {};
    if (x.type === 'reviews') return 'reviews';
    if (x.type === 'notices') return d.variant === 'board' ? 'board' : 'notices';
    if (x.type !== 'text') return '';
    const v = d.variant || (d.cols ? 'features' : 'plain');
    if (d.hpt === 'facts' || v === 'stats') return 'facts';
    if (d.hpt === 'sched') return 'schedule';
    if (d.hpt === 'cert' || v === 'cert') return 'cert';
    if (d.hpt === 'people' || v === 'profiles') return 'teachers';
    if (v === 'info') { const c = (d.cols || []).filter(r => r && clean(r[0])); if (d.hpt === 'faq' || (c.length && c.every(([a]) => /[?？]$/.test(clean(a))))) return 'faq'; return ''; }
    if (v === 'timeline') { const c = (d.cols || []).filter(r => r && clean(r[0])); if (!c.length || c.every(isSample)) return 'schedule'; return ''; }
    return ''; }
  const TOP = { univ: 1, univ_lms: 1, lifelong: 1, public: 1 };
  { const base = proSec; proSec = (x, i, s, lk) => {
    const h0 = base(x, i, s, lk); if (!x || !thOn(s)) return h0;
    const d = x.data || {}; if (+d.dstyle) return h0; const k = kindOf(x); if (!k) return h0;
    if (x.hide && !editing()) return '';
    let h; try { const top = k === 'notices' && TOP[typeKey()] && i > 0 && i <= 2 && (s.sections || [])[0] && s.sections[0].type === 'banner';
      h = R[k](s, { d, alt: /\bhp-alt\b/.test(String(h0 || '').slice(0, 300)) && !top, top }); } catch (e) { console.error('hpsec-trust', k, e); return h0; }
    if (!h) return '';
    const m = editing() ? HPE.map.get(x) : null;
    if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`);
    return h; }; }

  /* ══ 배치 보강(HPT.enrich 감쌈): 대학 · 평생 · 공공은 공지를 첫 화면 바로 아래 · 실제 일정이 있으면 일정 섹션 ══ */
  if (window.HPT && typeof HPT.enrich === 'function') { const base = HPT.enrich; HPT.enrich = s => { const r = base(s);
    try { if (!s || !Array.isArray(s.sections)) return r; const L = s.sections; const ty = typeKey(); const mk = (type, data) => (typeof S2 === 'function' ? S2(type, data) : { id: 'x' + Math.random().toString(36).slice(2, 9), type, data });
      const b0 = L[0] && L[0].type === 'banner' ? 1 : 0;
      if (TOP[ty]) { let k = L.findIndex(x => x.type === 'notices'); if (k < 0) { L.splice(b0, 0, mk('notices', { eyebrow: '', title: '공지사항', n: 5 })); } else if (k !== b0) { const [n] = L.splice(k, 1); L.splice(b0, 0, n); } }
      if ((TOP[ty] || ty === 'voc') && schedule(4).length && !L.some(x => x.type === 'text' && x.data && (x.data.hpt === 'sched' || x.data.variant === 'timeline'))) {
        const ci = L.findIndex(x => x.type === 'classes'); L.splice(ci >= 0 ? ci + 1 : Math.min(L.length, b0 + 2), 0, mk('text', { variant: 'timeline', hpt: 'sched', eyebrow: '', title: '모집 일정', cols: schedule(4).map(x => [x.to ? dot(x.to) : x.start ? dot(x.start) : '상시', x.name]) })); }
    } catch (e) { console.error('hpsec-trust enrich', e); }
    return r; }; }

  /* ══ CSS: siteHTML <style>에 덧붙임(테마 토큰 · G1 변수 사용) ══ */
  function css(s) { const T = window.HPT && HPT.tokens ? HPT.tokens(s) : null; if (!T) return ''; const th = s.theme; const big = th === 'senior';
    const mix = (a, b, w) => { const h = x => { x = String(x); return [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16) || 0); }; const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
    const ln = 'color-mix(in srgb,var(--ink) 12%,transparent)'; const ln2 = 'color-mix(in srgb,var(--ink) 22%,transparent)';
    const serif = th === 'premium' || th === 'campus'; const sq = ['premium', 'official', 'campus'].includes(th);
    const P = '.hpt.hps-t';
    return `
/* hpsec-trust (S4) */
${P}{--hps-ln:${ln};--hps-ln2:${ln2}}
${P} .hps-hd{max-width:40em;margin-bottom:${big ? 40 : 48}px}${P} .hps-hd h2{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);letter-spacing:var(--hd-ls,-.03em);font-size:clamp(26px,3.4vw,var(--t-h2,40px));line-height:1.2;color:var(--ink);text-wrap:balance}
${P} .hps-hd .hp-ey{margin-bottom:12px}${P} .hps-sd{margin-top:16px;color:var(--mu);font-size:var(--t-lead,18px);line-height:1.6;max-width:36em}
${P} .hps-more{display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:650;color:var(--mu);text-decoration:none;white-space:nowrap;min-height:44px}${P} .hps-more:hover{color:var(--at)}${P} .hps-more svg{transition:transform var(--dur,.18s) var(--ease,ease)}${P} .hps-more:hover svg{transform:translateX(2px)}
${P} a:focus-visible,${P} summary:focus-visible{outline:3px solid var(--ring,var(--a));outline-offset:3px;border-radius:4px}
${P} .hps-smp{display:inline-block;font-size:12px;font-weight:700;color:#7A4B00;background:#FFF1CC;border-radius:4px;padding:2px 8px;margin-bottom:8px;letter-spacing:0}
${P} .is-sample{opacity:.78}${P} .is-sample summary span,${P} .is-sample h3{text-decoration:underline dashed #C08A1A;text-underline-offset:5px}
${P}.hps-empty{padding:32px 0}
/* 숫자 */
${P}.hps-facts{padding:calc(var(--sec,120px) * .5) 0;background:var(--bg);border-bottom:1px solid var(--hps-ln)}${P}.hps-facts.hp-alt{background:var(--alt)}
${P} .hps-fl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}${P} .hps-fl.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .hps-fl.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
${P} .hps-fl li{display:flex;flex-direction:column;gap:12px;padding:4px 32px;border-left:1px solid var(--hps-ln);min-width:0}${P} .hps-fl li:first-child{border-left:0;padding-left:0}
${P} .hps-fl b{display:flex;align-items:baseline;font-family:var(--hd-ff,inherit);font-weight:${th === 'warm' || th === 'kids' ? 'var(--hd-fw,700)' : '700'};font-size:clamp(40px,5.2vw,${big ? 68 : 64}px);line-height:1;letter-spacing:-.035em;color:var(--ink);font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}
${P} .hps-fl b small{font-size:.4em;font-weight:700;letter-spacing:-.01em;color:var(--at);margin-left:.14em;font-family:Pretendard,'Apple SD Gothic Neo',sans-serif}
${P} .hps-fl li.tx b{font-size:clamp(28px,3.2vw,40px);letter-spacing:-.03em}
${P} .hps-fl .l{font-size:${big ? 17 : 14}px;color:var(--mu);line-height:1.45}
${P} .hps-fn{margin-top:32px;font-size:13px;color:var(--mu);display:flex;align-items:center;gap:8px}${P} .hps-fn::before{content:'';width:16px;height:1px;background:currentColor}${P} .hps-fn time{font-variant-numeric:tabular-nums}
.hps-fl-ph{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}.hps-fl-ph.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.hps-fl-ph.n3{grid-template-columns:repeat(3,minmax(0,1fr))}.hps-fl-ph li{display:flex;flex-direction:column;gap:6px;padding:0 20px;border-left:1px solid rgba(255,255,255,.28)}.hps-fl-ph li:first-child{border-left:0;padding-left:0}.hps-fl-ph b{font-size:28px;font-weight:700;letter-spacing:-.03em;color:#fff;font-variant-numeric:tabular-nums;line-height:1}.hps-fl-ph b small{font-size:.42em;margin-left:2px;color:rgba(255,255,255,.88)}.hps-fl-ph .l{font-size:13px;color:rgba(255,255,255,.88)}
/* 후기 */
${P}.hps-reviews{padding:var(--sec,120px) 0}
${P} .hps-rvg{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:64px;align-items:start}${P} .hps-rvg.one .hps-rvb{max-width:760px}
${P} .hps-rvh{position:sticky;top:96px}${P} .hps-rvh .hps-hd{margin-bottom:32px}
${P} .hps-rvs{padding-top:24px;border-top:1px solid var(--hps-ln)}${P} .hps-avg{display:flex;align-items:baseline;gap:6px;font-family:var(--hd-ff,inherit);color:var(--ink)}${P} .hps-avg b{font-size:56px;font-weight:700;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}${P} .hps-avg small{font-size:22px;color:var(--mu);font-weight:500}
${P} .hps-cnt{margin-top:10px;font-size:14px;color:var(--mu)}${P} .hps-cnt b{color:var(--ink);font-variant-numeric:tabular-nums}${P} .hps-rvh .hps-more{margin-top:16px}
${P} .hps-q1{margin:0;background:${sq ? 'var(--bg)' : 'var(--as)'};${sq ? 'border:var(--bd);' : ''}border-radius:var(--r);padding:clamp(28px,4.4vw,56px);display:flex;flex-direction:column;gap:28px}${P}.hp-alt .hps-q1{background:var(--bg)}
${P} .hps-q1 blockquote{margin:0;font-family:${serif ? 'var(--hd-ff)' : 'inherit'};font-size:clamp(20px,2.2vw,${big ? 28 : 26}px);font-weight:${serif ? 400 : 550};line-height:1.55;letter-spacing:-.02em;color:var(--ink);text-wrap:pretty}
${P} .hps-q1 blockquote::before{content:'“';display:block;font-family:Georgia,'Noto Serif KR',serif;font-size:64px;line-height:.6;height:28px;color:var(--at);font-weight:400}
${P} .hps-q1 figcaption,${P} .hps-rm{display:flex;align-items:center;gap:12px}
${P} .hps-av{width:44px;height:44px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--ink);color:var(--bg);font-weight:700;font-size:17px}
${P} .hps-wh{display:flex;flex-direction:column;line-height:1.35;min-width:0}${P} .hps-wh b{font-size:15px;font-weight:700;color:var(--ink)}${P} .hps-wh small{font-size:13px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${P} .hps-st{color:#8A5A00;letter-spacing:2px;font-size:15px;line-height:1}${P} .hps-st i{font-style:normal;color:#5F6672}
${P} .hps-rl{list-style:none;margin:16px 0 0;padding:0}${P} .hps-rl li{padding:24px 0;border-bottom:1px solid var(--hps-ln);display:flex;flex-direction:column;gap:14px}${P} .hps-rl li:last-child{border-bottom:0}
${P} .hps-rl blockquote{margin:0;font-size:${big ? 18 : 16.5}px;line-height:1.7;color:var(--ink)}${P} .hps-rl .hps-av{width:36px;height:36px;font-size:14px;background:var(--as);color:var(--at)}${P} .hps-rm .hps-st{margin-left:auto;font-size:13px}
/* 강사 */
${P}.hps-teachers{padding:var(--sec,120px) 0}
${P} .hps-tg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px 24px}${P} .hps-tg.n3{grid-template-columns:repeat(3,minmax(0,1fr))}${P} .hps-tg.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .hps-tg.n1{grid-template-columns:minmax(0,1fr)}
${P} .hps-tcc{display:flex;flex-direction:column;gap:20px;min-width:0}
${P} .hps-tph{aspect-ratio:4/5;border-radius:var(--r);overflow:hidden;background:var(--as);position:relative}${P} .hps-tph img{width:100%;height:100%;object-fit:cover;display:block}
${P} .hps-tph.none{display:flex;align-items:flex-end;padding:24px;background:${sq ? 'var(--alt)' : 'var(--as)'};${sq ? 'border:var(--bd);' : ''}}${P}.hp-alt .hps-tph.none{background:var(--bg)}
${P} .hps-tph.none span{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);font-size:clamp(64px,7vw,104px);line-height:.9;color:var(--at);letter-spacing:-.04em}
${P} .hps-tph.none::after{content:'';position:absolute;left:24px;right:24px;top:24px;height:1px;background:var(--hps-ln2)}
${P} .hps-tcb h3{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,700);font-size:${big ? 22 : 20}px;letter-spacing:-.02em;color:var(--ink);line-height:1.3}
${P} .hps-tcl{margin-top:6px;font-size:13px;font-weight:600;color:var(--at)}${P} .hps-tbio{margin-top:12px;font-size:${big ? 17 : 15}px;line-height:1.65;color:var(--mu);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
${P} .hps-tg.n1 .hps-tcc,${P} .hps-tg.n2 .hps-tcc{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px;align-items:end}${P} .hps-tg.n2 .hps-tcc{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)}${P} .hps-tg.n1 .hps-tcc{max-width:880px}
${P} .hps-trg{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:64px;align-items:start}${P} .hps-trh .hps-hd{margin-bottom:24px}${P} .hps-trn{font-size:14px;color:var(--mu);padding-top:20px;border-top:1px solid var(--hps-ln)}${P} .hps-trn b{font-family:var(--hd-ff,inherit);font-size:40px;font-weight:700;color:var(--ink);letter-spacing:-.03em;margin-right:4px;font-variant-numeric:tabular-nums}
${P} .hps-tr{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}${P} .hps-tr li{display:grid;grid-template-columns:72px minmax(0,1fr);gap:28px;padding:28px 0;border-bottom:1px solid var(--hps-ln);align-items:start}
${P} .hps-tav{width:72px;height:72px;border-radius:${sq ? 'var(--rs,4px)' : '50%'};display:grid;place-items:center;background:var(--as);color:var(--at);font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);font-size:30px;letter-spacing:-.02em}${P}.hp-alt .hps-tav{background:var(--bg)}
${P} .hps-tr .hps-tcb{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);column-gap:32px;align-items:baseline}${P} .hps-tr .hps-tcb h3{grid-column:1}${P} .hps-tr .hps-tcl{grid-column:1}${P} .hps-tr .hps-tbio{grid-column:2;grid-row:1/span 3;margin-top:0}${P} .hps-tr .hps-smp{grid-column:1/-1}
/* 공지 */
${P}.hps-notices{padding:calc(var(--sec,120px) * .66) 0}${P}.hps-ntop{padding:56px 0 64px;border-bottom:1px solid var(--hps-ln)}
${P} .hps-ntw{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:48px;align-items:start}
${P} .hps-nth{display:flex;flex-direction:column;align-items:flex-start;gap:8px}${P} .hps-nth h2{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);letter-spacing:var(--hd-ls,-.03em);font-size:clamp(24px,2.4vw,${big ? 34 : 32}px);line-height:1.2;color:var(--ink)}${P} .hps-nth h3{font-size:${big ? 21 : 19}px;font-weight:700;letter-spacing:-.02em;color:var(--ink)}
${P} .hps-nl{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}${P} .hps-nl li{display:flex;align-items:center;gap:16px;min-height:${big ? 68 : 60}px;padding:10px 4px;border-bottom:1px solid var(--hps-ln);font-size:${big ? 18 : 16}px}
${P} .hps-tt{flex:1;min-width:0;display:flex;align-items:center;gap:8px}${P} .hps-nl b{min-width:0;font-weight:550;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}${P} .hps-nl li.is-pin b{font-weight:700}
${P} .hps-nl time{flex:none;font-size:14px;color:var(--mu);font-variant-numeric:tabular-nums;letter-spacing:0}
${P} .hps-tag{flex:none;min-width:52px;text-align:center;font-size:12.5px;font-weight:700;color:var(--mu);border:1px solid var(--hps-ln2);border-radius:var(--rs,4px);padding:3px 8px;max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}${P} li.is-pin .hps-tag{background:var(--a);border-color:var(--a);color:var(--on)}${P} .hps-tag.ok{color:var(--at);border-color:currentColor}
${P} .hps-new{flex:none;font-style:normal;font-size:11px;font-weight:800;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:${mix(T.at, '#000000', .05)};color:#fff}
${P} .hps-b2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px}${P} .hps-bc .hps-nth{flex-direction:row;align-items:center;justify-content:space-between;margin-bottom:12px}${P} .hps-bc .hps-nl li{min-height:52px;font-size:15.5px}${P} .hps-none{padding:24px 0;color:var(--mu);border-top:2px solid var(--ink)}
/* FAQ */
${P}.hps-faq{padding:var(--sec,120px) 0}
${P} .hps-fqg{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;align-items:start}${P} .hps-fqh{position:sticky;top:96px}${P} .hps-fqh .hps-hd{margin-bottom:32px}
${P} .hps-ask{background:var(--a);color:var(--on);border-radius:var(--r);padding:28px 28px 28px;display:flex;flex-direction:column;gap:16px;max-width:420px}${P} .hps-ask h3{font-size:19px;font-weight:700;letter-spacing:-.02em;color:inherit}
${P} .hps-ask ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:15px}${P} .hps-ask li{display:flex;align-items:center;gap:10px}${P} .hps-ask li svg{opacity:.85;flex:none}${P} .hps-ask a{color:inherit;text-decoration:underline;text-underline-offset:3px;font-variant-numeric:tabular-nums}
${P} .hps-btn{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 22px;border-radius:var(--br,8px);background:var(--on);color:var(--a)!important;font-weight:700;font-size:15px;text-decoration:none!important;transition:transform var(--dur,.18s) var(--ease,ease)}${P} .hps-btn:hover{transform:translateY(-1px)}${P} .hps-btn:hover svg{transform:translateX(3px)}${P} .hps-btn svg{transition:transform var(--dur,.18s)}
${P} .hps-qa{border-top:1px solid var(--hps-ln2)}${P} .hps-qa details{border-bottom:1px solid var(--hps-ln2)}
${P} .hps-qa summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:${big ? 84 : 76}px;padding:14px 0;font-size:${big ? 20 : 17.5}px;font-weight:600;letter-spacing:-.015em;color:var(--ink);line-height:1.45}${P} .hps-qa summary::-webkit-details-marker{display:none}
${P} .hps-qa summary i{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--hps-ln2);color:var(--ink);transition:transform var(--dur,.18s) var(--ease,ease),background var(--dur,.18s)}
${P} .hps-qa details[open] summary i{transform:rotate(45deg);background:var(--a);border-color:var(--a);color:var(--on)}${P} .hps-qa summary:hover span{color:var(--at)}
${P} .hps-ans{padding:0 56px 28px 0}${P} .hps-ans p{font-size:${big ? 18 : 16}px;line-height:1.75;color:var(--mu);max-width:38em}
/* 일정 */
${P}.hps-schedule{padding:var(--sec,120px) 0}
${P} .hps-sl{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}
${P} .hps-sl li{display:grid;grid-template-columns:148px minmax(0,1fr) minmax(0,auto) auto;gap:32px;align-items:center;padding:28px 0;border-bottom:1px solid var(--hps-ln)}
${P} .hps-dd{display:flex;flex-direction:column;gap:6px}${P} .hps-dd b{font-family:var(--hd-ff,inherit);font-size:${big ? 40 : 36}px;font-weight:700;letter-spacing:-.03em;line-height:1;color:var(--at);font-variant-numeric:tabular-nums;white-space:nowrap}${P} .hps-dd small{font-size:13px;color:var(--mu)}${P} .hps-dd.none b{color:var(--ink);font-size:${big ? 30 : 26}px}${P} li.st-closed .hps-dd b{color:var(--mu)}
${P} .hps-sn{display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-width:0}${P} .hps-sn h3{font-size:${big ? 22 : 20}px;font-weight:700;letter-spacing:-.02em;color:var(--ink);line-height:1.35}
${P} .hps-chip{font-size:12.5px;font-weight:700;padding:3px 10px;border-radius:var(--rs,4px);border:1px solid var(--hps-ln2);color:var(--mu)}${P} li.st-open .hps-chip{background:var(--a);border-color:var(--a);color:var(--on)}${P} li.st-soon .hps-chip,${P} li.st-start .hps-chip{color:var(--at);border-color:currentColor}
${P} .hps-sm{margin:0;display:flex;flex-direction:column;gap:6px;font-size:${big ? 17 : 15}px}${P} .hps-sm div{display:flex;gap:12px}${P} .hps-sm dt{color:var(--mu);width:2.6em;flex:none}${P} .hps-sm dd{margin:0;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
${P} .hps-go{display:inline-flex;align-items:center;gap:6px;min-height:var(--btn-h,48px);padding:0 22px;border-radius:var(--br,8px);border:1.5px solid var(--ink);color:var(--ink);font-weight:700;font-size:15px;text-decoration:none;white-space:nowrap;transition:background var(--dur,.18s),color var(--dur,.18s)}${P} li.st-open .hps-go{background:var(--a);border-color:var(--a);color:var(--on)}${P} .hps-go:hover{background:var(--ink);color:var(--bg)}${P} li.st-open .hps-go:hover{background:${mix(T.a, '#000000', .14)}}${P} .hps-go.off{border-color:var(--hps-ln2);color:var(--mu)}${P} .hps-go.off:hover{background:none;color:var(--mu)}
/* 인증 */
${P}.hps-cert{padding:48px 0;border-top:1px solid var(--hps-ln);border-bottom:1px solid var(--hps-ln)}
${P} .hps-ctw{display:flex;align-items:center;gap:40px}${P} .hps-ctt{flex:none;font-size:14px;font-weight:700;color:var(--mu);letter-spacing:0}
${P} .hps-ctl{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:16px 0;flex:1}${P} .hps-ctl li{display:flex;align-items:center;gap:12px;padding:0 32px;border-left:1px solid var(--hps-ln)}${P} .hps-ctl li:first-child{border-left:0;padding-left:0}${P} .hps-ctl svg{color:var(--at);flex:none}
${P} .hps-ctl b{display:block;font-size:15.5px;font-weight:700;color:var(--ink)}${P} .hps-ctl small{font-size:13px;color:var(--mu);font-variant-numeric:tabular-nums}
@media(max-width:900px){${P} .hps-trg{grid-template-columns:1fr;gap:24px}${P} .hps-tr .hps-tcb{display:block}${P} .hps-tr .hps-tcl{margin-top:4px}${P} .hps-tr .hps-tbio{margin-top:10px}${P} .hps-rvg,${P} .hps-fqg,${P} .hps-ntw{grid-template-columns:1fr;gap:32px}${P} .hps-rvh,${P} .hps-fqh{position:static}${P} .hps-tg,${P} .hps-tg.n3{grid-template-columns:repeat(2,minmax(0,1fr))}
${P} .hps-sl li{grid-template-columns:120px minmax(0,1fr);row-gap:16px}${P} .hps-sm{grid-column:2}${P} .hps-go{grid-column:2;justify-self:start}${P} .hps-b2{grid-template-columns:1fr;gap:40px}}
@media(max-width:640px){${P}.hps-reviews,${P}.hps-teachers,${P}.hps-faq,${P}.hps-schedule{padding:var(--sec-m,72px) 0}${P}.hps-notices{padding:calc(var(--sec-m,72px) * .8) 0}${P}.hps-ntop{padding:40px 0 48px}${P}.hps-facts{padding:48px 0}
${P} .hps-hd{margin-bottom:32px}${P} .hps-hd h2{font-size:clamp(25px,7vw,30px)}
${P} .hps-fl,${P} .hps-fl.n3,${P} .hps-fl.n4{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:28px}${P} .hps-fl li{padding:0 0 0 20px}${P} .hps-fl li:nth-child(odd){border-left:0;padding-left:0}${P} .hps-fl.n3 li:nth-child(3){grid-column:1/-1;border-top:1px solid var(--hps-ln);padding-top:24px}${P} .hps-fl b{font-size:${big ? 44 : 42}px}${P} .hps-fl li.tx b{font-size:30px}${P} .hps-fn{margin-top:24px}
.hps-fl-ph li{padding:0 12px}.hps-fl-ph b{font-size:22px}
${P} .hps-q1{padding:28px 22px;gap:22px}${P} .hps-q1 blockquote{font-size:${big ? 21 : 19}px}${P} .hps-avg b{font-size:44px}
${P} .hps-tg,${P} .hps-tg.n2,${P} .hps-tg.n3{grid-template-columns:1fr;gap:0}${P} .hps-tcc,${P} .hps-tg.n1 .hps-tcc,${P} .hps-tg.n2 .hps-tcc{display:grid;grid-template-columns:96px minmax(0,1fr);gap:20px;align-items:start;padding:20px 0;border-bottom:1px solid var(--hps-ln)}${P} .hps-tcc:first-child{border-top:1px solid var(--hps-ln)}
${P} .hps-tph{aspect-ratio:1/1}${P} .hps-tph.none{padding:12px;align-items:center;justify-content:center}${P} .hps-tph.none span{font-size:44px}${P} .hps-tph.none::after{display:none}${P} .hps-tcb h3{font-size:${big ? 20 : 18}px}${P} .hps-tbio{margin-top:8px;-webkit-line-clamp:3}
${P} .hps-tr li{grid-template-columns:56px minmax(0,1fr);gap:16px;padding:22px 0}${P} .hps-tav{width:56px;height:56px;font-size:24px}${P} .hps-trn b{font-size:32px}
${P} .hps-ntw{gap:20px}${P} .hps-nth{flex-direction:row;align-items:center;justify-content:space-between;width:100%}
${P} .hps-nl li{flex-wrap:wrap;gap:6px 10px;min-height:0;padding:16px 2px}${P} .hps-tt{flex-basis:100%;order:3}${P} .hps-nl b{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}${P} .hps-nl time{order:2;margin-left:auto;font-size:13px}${P} .hps-tag{order:1}
${P} .hps-ask{max-width:none;padding:24px 22px}${P} .hps-qa summary{font-size:${big ? 18 : 16}px;min-height:${big ? 68 : 64}px;gap:16px}${P} .hps-ans{padding:0 0 24px}
${P} .hps-sl li{grid-template-columns:1fr;gap:14px;padding:24px 0}${P} .hps-sm,${P} .hps-go{grid-column:auto}${P} .hps-dd{flex-direction:row;align-items:baseline;gap:10px}${P} .hps-dd b{font-size:30px}${P} .hps-go{width:100%;justify-content:center;min-height:48px}
${P} .hps-ctw{flex-direction:column;align-items:flex-start;gap:20px}${P} .hps-ctl{flex-direction:column}${P} .hps-ctl li{padding:0;border-left:0}}
@media(prefers-reduced-motion:reduce){${P} *{transition:none!important}}`; }
  HPS.trustCSS = css;
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { if (!h || !thOn(s) || !String(h).includes('</style>')) return h; const c = css(s); if (!c) return h;
      /* 계열(HPL) · 사용자 스타일(hpimg)보다 앞: 첫 </style> 바로 앞에 넣되, hpdir 토큰 뒤 */
      return h.replace('</style>', c.replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpsec-trust css', e); return h; } }; window.siteHTML = siteHTML; }

  /* ══ v34.5 FB(R1 H3): 번호 단계 섹션 남발 줄이기 — 유형마다 '번호 단계'를 쓰는 템플릿은 40% 이하 ══
     내용이 실제 순서(절차 · 신청 · 과정 · 방법 …)인 단계 섹션과 story 계열(타임라인이 정체성)은 남기고, 나머지는 유형에 맞는 다른 뼈대로 바꾼다.
       board  = 공지 | 묻고 답하기 2단(이미 공지 섹션이 있으면 그것을 2단으로) · sched = 모집 일정표(실제 강좌 일정) · reviews = 큰 인용 후기(실제 후기)
     모두 실제 데이터만 쓰고, 데이터가 없으면 숨는다(지어낸 내용 없음). 템플릿 원본은 고치지 않고 siteFromTpl 결과만 바꾼다(가장 바깥에서 감쌈). */
  const ALT = { k12: ['reviews', 'board', 'sched'], adult: ['reviews', 'sched', 'board'], univ: ['board', 'sched', 'reviews'], univ_lms: ['board', 'sched', 'reviews'], lifelong: ['sched', 'board', 'reviews'], voc: ['sched', 'reviews', 'board'], corp: ['sched', 'board', 'reviews'], public: ['board', 'sched', 'reviews'] };
  const SEQ = /절차|신청|과정|방법|흐름|순서|단계|진행|STEP|HOW/i;
  const isSteps = x => x && x.type === 'text' && x.data && x.data.variant === 'steps';
  const plan = {}; /* 유형 → { 템플릿 id: 'keep' | 바꿀 순번 } */
  function stepPlan(ty) { if (plan[ty]) return plan[ty]; const P = plan[ty] = {}; const tk = ty === 'univ_lms' ? 'univ' : ty;
    const L = (typeof TPL !== 'undefined' ? TPL : []).filter(t => t && !t.hidden && (t.types || [])[0] === tk);
    const C = []; L.forEach(t => { let secs = []; try { secs = typeof t.build === 'function' ? t.build() : []; } catch (e) { secs = []; } const st = (secs || []).find(isSteps); if (st) C.push({ id: t.id, story: t.layout === 'story', seq: SEQ.test(`${st.data.title || ''} ${st.data.eyebrow || ''}`) }); });
    const keepMax = Math.floor(L.length * 0.4); const ord = C.slice().sort((a, b) => (b.story - a.story) || (b.seq - a.seq) || a.id.localeCompare(b.id)); let k = 0;
    ord.forEach((c, i) => { if (i < keepMax) P[c.id] = 'keep'; else P[c.id] = k++; }); return P; }
  function reskel(s, tp) { const ty = typeKey(); const P = stepPlan(ty); const r = P[tp.id]; if (r == null || r === 'keep') return s; const L = s.sections || []; const i = L.findIndex(isSteps); if (i < 0) return s;
    const mk = (type, data) => (typeof S2 === 'function' ? S2(type, data) : { id: 'x' + Math.random().toString(36).slice(2, 9), type, data });
    const opts = ALT[ty] || ALT.adult; const has = k => L.some(x => x && (k === 'reviews' ? x.type === 'reviews' : k === 'sched' ? x.type === 'text' && x.data && (x.data.hpt === 'sched' || x.data.variant === 'timeline') : x.type === 'notices' && x.data && x.data.variant === 'board'));
    for (let n = 0; n < opts.length; n++) { const k = opts[(r + n) % opts.length]; if (has(k)) continue;
      if (k === 'board') { const no = L.find(x => x && x.type === 'notices'); if (no) { no.data = Object.assign({}, no.data, { variant: 'board' }); L.splice(i, 1); } else L.splice(i, 1, mk('notices', { variant: 'board', title: '공지 · 묻고 답하기', n: 5 })); }
      else if (k === 'sched') L.splice(i, 1, mk('text', { variant: 'timeline', hpt: 'sched', eyebrow: '', title: '모집 일정', cols: [] }));
      else L.splice(i, 1, mk('reviews', { title: '수강생 이야기', n: 3 }));
      s.hpSkel = k; return s; }
    L.splice(i, 1); s.hpSkel = 'drop'; return s; }
  HPS.stepPlan = stepPlan;
  const wrapSkel = () => { if (typeof siteFromTpl !== 'function' || siteFromTpl.hpsk) return; const base = siteFromTpl;
    const f = tp => { const s = base(tp); try { if (s && tp && !tp.keepSteps && S && S.org) reskel(s, tp); } catch (e) { console.error('hpsec-trust skel', e); } return s; };
    Object.keys(base).forEach(k => { f[k] = base[k]; }); f.hpsk = 1; siteFromTpl = f; window.siteFromTpl = f; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapSkel); else setTimeout(wrapSkel, 0);

  /* ══ v34.5 FB(R1 M8): 품질 점수 변별력 — 첫 화면 사진 해상도 · 사진과 업종 · 보이는 섹션 수 · 같은 유형 계열 중복 ══
     hpwQuality 안의 연결 지점(HPW.qx)에 항목을 더하고, 배점을 다시 나눠 합계 100을 유지한다(X4의 안내 줄은 0점).
     새 항목은 자동 보정(hpwFix)으로 고칠 수 없으므로 auto:false. */
  const QW = { contrast: 11, empty: 11, ph: 11, alt: 7, mobile: 7, seo: 7, btn: 7, contact: 7, fact: 6, photoRes: 5, photoFit: 3, secN: 5, famDup: 3, heroScene: 3, photoMix: 2, glyph: 2, rep: 3 }; /* H5(R2 M8): 합계 100 — 뒤 4개는 hpwiz HPW.qMore */
  const stockOf = v => { const m = String(v || '').match(/(?:^|\/)([a-z]{3}-\d{2})(?:-800)?(?:\.webp)?(?:[?#].*)?$/); return m && window.HPSTOCK && HPSTOCK.get ? HPSTOCK.get(m[1]) : null; };
  function heroSrc(s) { const im = s.img && s.img.hero; const bn = (s.sections || []).find(x => x && x.type === 'banner' && !x.hide); const d = (bn && bn.data) || {};
    return (im && (im.stock || im.src)) || d.img || (s.photos && s.photos.hero) || ''; }
  HPS.qItems = (s, add) => { const ty = typeKey(); const tk = ty === 'univ_lms' ? 'univ' : ty;
    const src = heroSrc(s); const x = stockOf(src); const L = Math.max((x && x.w) || 0, (x && x.h) || 0);
    if (!src) add('photoRes', '첫 화면 사진', QW.photoRes, true, '사진 없는 첫 화면(글자 · 배치 중심)', false);
    else if (!x) add('photoRes', '첫 화면 사진', QW.photoRes, true, '직접 올린 사진', false);
    else { const ok = (x.slots || []).includes('hero') && L >= 1200; add('photoRes', '첫 화면 사진', QW.photoRes, ok, ok ? `긴 변 ${L}px` : !(x.slots || []).includes('hero') ? '첫 화면용이 아닌 사진입니다 — 넓게 키우면 흐려집니다' : `긴 변 ${L}px — 1200px 이상 사진으로 바꾸세요`, false); }
    const fit = !x || !(x.types || []).length || x.types.includes(tk);
    add('photoFit', '사진과 업종', QW.photoFit, fit, fit ? (x ? '기관 유형에 맞는 사진' : '샘플 사진이 아니거나 사진 없음') : `첫 화면 사진(${x.alt || x.id})이 이 기관 유형에 어울리지 않습니다`, false);
    const eo = window.HPW && typeof HPW.emptyOf === 'function' ? HPW.emptyOf : null; const vis = (s.sections || []).filter(y => y && !y.hide && !(eo && eo(y))).length;
    add('secN', '보이는 섹션', QW.secN, vis >= 6, vis >= 6 ? `${vis}개` : `${vis}개 — 6개 이상이면 첫 방문자가 볼 내용이 충분합니다(공지 · 강좌 · 문의 등)`, false);
    let dup = 0; try { const T = (typeof TPL !== 'undefined' ? TPL : []).filter(t => t && !t.hidden && (t.types || []).includes(tk) && t.id !== (s.tpl || s.tplId)); dup = s.layout ? T.filter(t => t.layout === s.layout).length : 0; } catch (e) { dup = 0; }
    add('famDup', '배치 겹침', QW.famDup, dup <= 1, !s.layout ? '기본 배치' : dup <= 1 ? '같은 유형 템플릿과 배치가 겹치지 않음' : `같은 유형 템플릿 ${dup}종과 같은 배치(${s.layout})`, false); };
  if (window.HPW) { (HPW.qx = HPW.qx || []).push((s, it, add) => { if (!s || !S || !S.org) return; HPS.qItems(s, add); if (typeof HPW.qMore === 'function') HPW.qMore(s, add, QW); it.forEach(x => { if (QW[x.k] != null) x.pts = QW[x.k]; }); }); }

  /* ══ v34.5 FB(R1 M5 · M6): 늦게 뜨는 사진 자리 · 짧은 섹션 여백 ══
     M5 샘플 사진 <img>에 비율(aspect-ratio, 높이가 auto일 때만 적용)과 사진 평균색 바탕을 넣는다 → 늦게 떠도 흰 빈 상자가 보이지 않는다.
     M6 글이 2줄 안팎이고 사진 · 표 · 목록이 없는 섹션은 hps-short(위아래 여백 × 0.6). 같은 흰 바탕 섹션이 이어지면 뒤 섹션 위 여백을 절반으로(hps-flow). */
  const avgOf = id => { try { const p = window.HPC && HPC.photo ? HPC.photo(id) : null; return p && p.avg ? p.avg : '#E7E8EC'; } catch (e) { return '#E7E8EC'; } };
  function imgFill(h) { return h.replace(/<img\b[^>]*>/gi, t => { const src = (t.match(/\ssrc="([^"]*)"/i) || [])[1] || ''; const x = stockOf(src); if (!x) return t;
    let o = t; const ar = x.w && x.h && !/aspect-ratio/i.test(o) ? `aspect-ratio:${x.w}/${x.h};` : ''; /* width · height 속성은 높이를 고정해 배치를 바꾸므로 쓰지 않는다 — aspect-ratio는 높이가 auto일 때만 적용 */
    const bg = `${ar}background-color:${avgOf(x.id)}`; if (/\sstyle="/i.test(o)) { if (!/background/i.test((o.match(/\sstyle="([^"]*)"/i) || [])[1])) o = o.replace(/\sstyle="([^"]*)"/i, (m, v) => ` style="${v.replace(/;?\s*$/, ';')}${bg}"`); } else o = o.replace(/^<img\b/i, `<img style="${bg}"`);
    return o; }); }
  const NOFLOW = /\b(hp-alt|is-alt|hp-cta|hps-cta|hp-hero|hps-hero|hpl-k-banner|hpl-k-cta|hpl-k-stats|hp-facts|hps-facts|hpl-noir|hps-empty|hps-ntop|hpl-empty|hp-empty)\b/;
  const OWNBG = /\b(fb-cta|sp-cta|bt-cta|hpb-inv)\b/; /* 사진 · 어두운 띠 — 문의 띠(hp-cta)는 흰 바탕 안 상자형이 많아 줄임 대상 */
  const HEROC = /\b(hp-hero|hps-hero|hpl-hero|hpl-k-banner)\b/;
  function spacing(h) { const re = /<section\b[^>]*class="([^"]*)"[^>]*>/g; const M = []; let m; while ((m = re.exec(h))) M.push({ i: m.index, t: m[0], c: m[1] });
    if (!M.length) return h; const isTop = []; let depth = 0, p = 0; /* 최상위 섹션만: 앞 섹션이 닫혔는지 */
    M.forEach((x, k) => { const seg = h.slice(p, x.i); depth -= (seg.match(/<\/section>/g) || []).length; if (depth < 0) depth = 0; isTop[k] = depth === 0; depth++; p = x.i; });
    const out = []; const tail = []; let last = 0; let prevFlow = '', prevEnd = -1, prevK = -1;
    M.forEach((x, k) => { if (!isTop[k]) return; const end = h.indexOf('</section>', x.i); const body = end > 0 ? h.slice(x.i, end) : '';
      const txt = body.replace(/<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const rich = /<(img|figure|table|iframe|video|form|details|dl)\b/.test(body) || (body.match(/<li\b/g) || []).length > 2 || (body.match(/<article\b/g) || []).length > 1;
      const add = []; if (!NOFLOW.test(x.c) && !rich && txt.length <= 160) add.push('hps-short');
      /* H1(R2 M6): 보통 섹션이 이어지면 앞 섹션 아래 여백 × 0.6, 뒤 섹션 위 여백 × 0.45 → 섹션 사이 빈 띠 200px 이하
         사진 · 어두운 띠 · 첫 화면 · 문의 띠처럼 자기 바탕이 있는 섹션은 건드리지 않는다 */
      /* 바탕 판별은 클래스로 믿을 수 없어(계열마다 is-alt 색이 다름) 자기 바탕이 분명한 섹션만 빼고 모두 줄인다 — 다른 바탕끼리도 각 띠 안 여백은 65~86px 이상 남는다.
         첫 화면 바로 다음 섹션은 위 여백만 줄인다(첫 화면 자체는 그대로). noir(어두운) 계열은 noir 섹션끼리만 */
      const key = HEROC.test(x.c) ? 'hero' : /\bhpl-noir\b/.test(x.c) ? 'noir' : (OWNBG.test(x.c) || /style="[^"]*background/.test(x.t)) ? '' : 'n';
      const gap = prevEnd >= 0 ? h.slice(prevEnd, x.i).replace(/<\/section>|<\/div>|\s/g, '') : 'x';
      if ((key === 'n' || key === 'noir') && (prevFlow === key || prevFlow === 'hero') && !gap) { add.push('hps-flow'); if (prevK >= 0 && prevFlow === key) tail.push(prevK); }
      else if (key === '' && prevFlow === 'n' && !gap && prevK >= 0 && !HEROC.test(x.c)) tail.push(prevK); /* R3: 보통 섹션 → 자기 바탕 섹션(문의 띠 등)이면 앞 섹션 아래 여백만 줄인다(FAQ → 신청 띠 208px) */
      prevFlow = key; prevK = k; prevEnd = end >= 0 ? end + 10 : -1;
      if (!add.length) return; out.push(h.slice(last, x.i), x.t.replace(/class="/, `class="${add.join(' ')} `)); last = x.i + x.t.length; });
    if (tail.length) { /* 앞 섹션 아래 여백 줄이기(hps-flowb) — 위에서 이미 바꾼 여는 태그는 out 안에 있으므로 결과 문자열에서 다시 찾는다 */
      let r = out.length ? out.join('') + h.slice(last) : h; const T = new Set(tail.map(k => M[k].t)); let n = 0;
      r = r.replace(/<section\b[^>]*class="[^"]*"[^>]*>/g, t => { const raw = t.replace(/class="((?:hps-short|hps-flow) )+/, 'class="'); return T.has(raw) && !/hps-flowb|hps-short/.test(t) && n++ < 64 ? t.replace(/class="/, 'class="hps-flowb ') : t; });
      return r; }
    if (!out.length) return h; out.push(h.slice(last)); return out.join(''); }
  const spCSS = `/* hps rhythm */
.hpl-noir .hps-st,.hpl-noir .hpl-stars{color:#E3B341!important}.hpl-noir .hps-st i{color:#9A9A9A!important}
section.hps-short{padding-top:calc(var(--sec,120px) * .6)!important;padding-bottom:calc(var(--sec,120px) * .6)!important}section.hps-flow{padding-top:calc(var(--sec,120px) * .45)!important}section.hps-flowb{padding-bottom:calc(var(--sec,120px) * .6)!important}section.hps-flow .bt-head{padding-top:8px!important}
@media(max-width:640px){.hpl-noir .hps-st,.hpl-noir .hpl-stars{color:#E3B341!important}.hpl-noir .hps-st i{color:#9A9A9A!important}
section.hps-short{padding-top:calc(var(--sec-m,72px) * .6)!important;padding-bottom:calc(var(--sec-m,72px) * .6)!important}section.hps-flow{padding-top:calc(var(--sec-m,72px) * .5)!important}section.hps-flowb{padding-bottom:calc(var(--sec-m,72px) * .75)!important}}`;
  HPS.rhythm = { imgFill, spacing };
  { const base = siteHTML; siteHTML = (s, full, lang) => { let h = base(s, full, lang);
    try { if (typeof h !== 'string' || !thOn(s)) return h; h = imgFill(h); const h2 = spacing(h); if ((h2 !== h || /hpl-noir/.test(h)) && h2.includes('</style>')) h = h2.replace('</style>', spCSS + '</style>'); return h; } catch (e) { console.error('hpsec-trust rhythm', e); return h; } }; window.siteHTML = siteHTML; }

  /* ══ v34.5 H1(R2 N2 · M6 · N9): 아래 공통 블록 변형 — 숫자 · 일정 · 후기 · FAQ · 오시는 길 · 공지 ══
     R2: 첫 화면은 달라도 두 번째 화면부터(숫자 4칸 → D-day 표 → 후기 5.0 → FAQ 상자 → 그림 지도) 7유형이 같은 사이트로 읽힌다.
     블록마다 변형 4개(첫 번째 = 기존 모양)를 두고, 유형 기본표(TYB) + 계열 회전(famShift)으로 고정 배정한다.
       facts   row(4칸) · line(한 줄 문장형) · one(큰 숫자 하나 + 곁 표) · table(운영 현황 표)
       sched   list(D-day 줄) · cal(달력 날짜 칸) · cards(접수 진행 막대 카드) · table(모집 표)
       reviews split(왼쪽 요약 + 인용) · wall(3단 후기 벽) · big(어두운 띠 큰 인용) · strip(가로 카드 줄)
       faq     side(왼쪽 문의 상자) · one(가운데 한 단) · grid(펼친 질문 2단 + 문의 띠) · list(2단 아코디언)
       map     split(주소 + 지명 글자 판) · card(가운데 주소 카드) · band(어두운 연락 띠) · cols(안내 표)
       notices rows(목록) · cards(날짜 카드 4칸) · feat(대표 공지 + 목록) · line(한 줄 압축 띠)
     우선순위: 섹션 data.bv > site.blocks[블록](템플릿 tp.blocks — H3 배정) > 유형 기본표 × 계열 회전.
     N9: 오시는 길은 그림 지도(핀 + 도형)를 쓰지 않는다. 주소 · 연락처 + '지도 앱에서 보기' 링크, 장식은 지명 글자 판처럼 지도가 아님이 분명한 것만.
     모두 실제 데이터만 쓰고, 데이터가 없으면 기존 렌더러(빈 상태 안내 · 숨김)로 돌아간다. */
  const BV = { facts: ['row', 'line', 'one', 'table'], sched: ['list', 'cal', 'cards', 'table'], reviews: ['split', 'wall', 'big', 'strip'], faq: ['side', 'one', 'grid', 'list'], map: ['split', 'card', 'band', 'cols'], notices: ['rows', 'cards', 'feat', 'line'] };
  const BK = Object.keys(BV);
  const TYB = {
    k12: { facts: 'one', sched: 'cards', reviews: 'wall', faq: 'one', map: 'card', notices: 'line' },
    univ: { facts: 'table', sched: 'table', reviews: 'big', faq: 'list', map: 'split', notices: 'feat' },
    adult: { facts: 'line', sched: 'cal', reviews: 'strip', faq: 'grid', map: 'band', notices: 'cards' },
    public: { facts: 'row', sched: 'list', reviews: 'split', faq: 'side', map: 'cols', notices: 'rows' },
    lifelong: { facts: 'one', sched: 'cal', reviews: 'big', faq: 'grid', map: 'split', notices: 'cards' },
    voc: { facts: 'line', sched: 'table', reviews: 'wall', faq: 'side', map: 'band', notices: 'feat' },
    corp: { facts: 'table', sched: 'cards', reviews: 'strip', faq: 'list', map: 'cols', notices: 'line' } };
  /* 계열 회전: 같은 유형 안에서도 계열(또는 기본 첫 화면 종류)이 다르면 블록 모양이 달라지게 블록마다 0~3칸 민다 */
  const FAMS = ['', 'editorial', 'bento', 'fullbleed', 'splitscreen', 'typo', 'portal', 'story', 'mosaic', 'sidebar', 'bulletin', 'collage', 'noir', 's3:scrim', 's3:box', 's3:split', 's3:grid'];
  /* 계열 자체 렌더러가 그 계열의 정체성인 블록은 계열 것을 그대로 쓴다(변형이 첫 번째 값일 때도 계열 것) */
  const FAMOWN = { bento: ['facts'], typo: ['facts', 'reviews'], editorial: ['reviews'], portal: ['notices'] };
  const famKey = s => { if (!s) return ''; if (s.layout) return s.layout; const bn = (s.sections || []).find(x => x && x.type === 'banner'); const hk = bn && bn.data && bn.data.hk; return hk ? 's3:' + hk : ''; };
  const famShift = (s, k) => { const key = famKey(s); let i = FAMS.indexOf(key); if (i < 0) { i = 0; for (const ch of key) i = (i * 31 + ch.charCodeAt(0)) % 997; i = i % 16 + 1; }
    const v = s && s.layoutVar && s.layout ? ' abc'.indexOf(String(s.layoutVar)) : 0; return i ? (i * (k + 1) + (i >> 2) + Math.max(0, v)) % 4 : 0; };
  const tyB = () => { const ty = typeKey(); return TYB[ty === 'univ_lms' ? 'univ' : ty] || TYB.adult; };
  function blockVar(bk, s, d) { const L = BV[bk]; if (!L) return '';
    if (d && L.includes(d.bv)) return d.bv;
    const sb = s && s.blocks && s.blocks[bk]; if (L.includes(sb)) return sb;
    const b0 = L.indexOf(tyB()[bk]); const k = BK.indexOf(bk); return L[(Math.max(0, b0) + famShift(s, k)) % L.length]; }
  const famOwn = (bk, s) => !!(s && s.layout && (FAMOWN[s.layout] || []).includes(bk));
  HPS.blockVar = blockVar; HPS.BLOCKS = BV;
  const BKOF = { facts: 'facts', schedule: 'sched', reviews: 'reviews', faq: 'faq', map: 'map', notices: 'notices', board: 'notices' };
  /* 아래 섹션 모양 서명(hp-visual 구조 서명 · R2 N2): 보이는 섹션 순서대로 '블록:변형' — 계열 자체 렌더러는 '블록:fam-<계열>' */
  HPS.blockSig = s => { s = s || (typeof site === 'function' ? site() : null); if (!s) return ''; const HK = window.HPL && HPL.kind;
    return (s.sections || []).filter(x => x && !x.hide).map(x => { const k = x.type === 'map' ? 'map' : kindOf(x); const bk = BKOF[k]; if (!bk) return '';
      const fk = HK ? { facts: 'stats', reviews: 'reviews', notices: 'notices' }[bk] : ''; const F = s.layout && window.HPL && HPL.fam && HPL.fam[s.layout];
      const hasFam = !!(fk && F && F.sec && typeof F.sec[fk === 'stats' ? 'stats' : fk] === 'function');
      const v = blockVar(bk, s, x.data); return `${bk}:${hasFam && (famOwn(bk, s) || v === BV[bk][0]) ? 'fam-' + s.layout : v}`; }).filter(Boolean).join('>'); };
  /* 유형별 배정 분포(H3 · 통합 담당 확인용): { 유형: { 블록: { 변형: 템플릿 수 } } } — 템플릿 build를 돌리지 않고 계열 · 첫 화면 종류 · blocks만 본다 */
  HPS.blockPlan = () => { const out = {}; (typeof TPL !== 'undefined' ? TPL : []).filter(t => t && !t.hidden).forEach(t => { const ty = (t.types || [])[0]; if (!ty) return;
      const s = { layout: t.layout || '', layoutVar: t.layoutVar, blocks: t.blocks, sections: t.hk ? [{ type: 'banner', data: { hk: t.hk } }] : [] }; const o = out[ty] = out[ty] || {};
      const old = S && S.org ? S.org.type : null; try { if (S && S.org) S.org.type = ty; BK.forEach(bk => { const v = blockVar(bk, s); (o[bk] = o[bk] || {})[v] = (o[bk][v] || 0) + 1; }); } finally { if (S && S.org && old) S.org.type = old; } });
    return out; };

  /* ── 공통 조각 ── */
  const tday2 = () => tday();
  const md = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? { y: +m[1], m: +m[2], d: +m[3], w: '일월화수목금토'[new Date(+m[1], +m[2] - 1, +m[3]).getDay()] } : null; };
  const ddOf = x => x.dd == null ? '상시' : x.dd === 0 ? 'D-DAY' : x.dd > 0 ? 'D-' + x.dd : 'D+' + (-x.dd);
  const goA = (x, cls) => x.state !== 'closed' ? `<a class="${cls}" href="#p-c-${E(x.id)}">${x.state === 'open' ? '신청하기' : '자세히'} ${ic('arrow', 16)}</a>` : `<span class="${cls} off">마감</span>`;
  const factV = f => `${E(f.v)}${f.u ? `<small>${E(f.u)}</small>` : ''}`;
  const factsList = d => { const F = facts(); const own = d.hpt === 'facts' ? [] : (d.cols || []).filter(r => r && clean(r[0]) && !isSample(r)).map(r => { const m = String(r[0]).match(/^([\d.,]+)\s*(.*)$/); return m ? { v: m[1], u: m[2], l: clean(r[1]) } : { v: clean(r[0]), u: '', l: clean(r[1]) }; });
    return { L: own.length >= 2 ? own : F, own: own.length >= 2 }; };
  const fnote = own => own ? '' : `<p class="hps-fn">공개 ${E(term('cls'))} 기준 자동 집계 · <time>${E(dot(tday()))}</time></p>`;
  const stars2 = n => `<span class="hps-st" role="img" aria-label="별점 ${n}점">${'★'.repeat(Math.min(5, n))}<i>${'★'.repeat(5 - Math.min(5, n))}</i></span>`;
  const revSum = A => { const st = A.filter(r => r.st > 0); const avg = st.length >= 2 ? st.reduce((a, r) => a + Math.min(5, r.st), 0) / st.length : 0; return { avg, n: st.length }; };
  const who2 = r => `<span class="hps-wh"><b>${E(r.w)}</b>${r.c ? `<small>${E(r.c)}</small>` : ''}</span>`;
  const mapLinks = addr => addr ? `<p class="hpb-ml"><a ${aAttr('https://map.naver.com/p/search/' + encodeURIComponent(addr))}>네이버 지도에서 보기 ${ic('arrow', 15)}</a><a ${aAttr('https://map.kakao.com/?q=' + encodeURIComponent(addr))}>카카오맵에서 보기 ${ic('arrow', 15)}</a></p>` : '';
  /* 주소에서 지명(시 · 구 · 군 · 길) 뽑기 — 지명 글자 판(장식)용 */
  const place = addr => { const W = String(addr || '').split(/\s+/); const gu = W.find(w => /[가-힣](구|군)$/.test(w)) || W.find(w => /[가-힣]시$/.test(w)) || W[1] || W[0] || ''; const si = W.find(w => /(광역시|특별시|특별자치시|도)$/.test(w)) || ''; const road = W.find(w => /(로|길|대로)$/.test(w)) || ''; return { si, gu, road }; };
  function mapData(s, d) { const f = ft(); const addr = !isPh(d.addr) && clean(d.addr) ? clean(d.addr) : (!isPh(f.addr) && clean(f.addr) ? clean(f.addr) : '');
    const tel = !isPh(d.tel) && clean(d.tel) ? clean(d.tel) : (!isPh(f.tel) && clean(f.tel) ? clean(f.tel) : ''); const hours = !isPh(d.hours) && clean(d.hours) ? clean(d.hours) : (!isPh(f.hours) && clean(f.hours) ? clean(f.hours) : '');
    const mail = f.email && !isPh(f.email) && /@/.test(f.email) ? clean(f.email) : '';
    const rows = [addr && { k: 'pin', l: '주소', v: addr, h: '' }, tel && { k: 'phone', l: '연락처', v: tel, h: 'tel:' + tel.replace(/[^\d+]/g, '') }, hours && { k: 'clock', l: '운영 시간', v: hours, h: '' }, mail && !tel && { k: 'mail', l: '메일', v: mail, h: 'mailto:' + mail }].filter(Boolean);
    return { addr, tel, hours, rows }; }
  const rowV = r => r.h ? `<a href="${E(r.h)}">${E(r.v)}</a>` : `<span>${E(r.v)}</span>`;

  const V = { facts: {}, sched: {}, reviews: {}, faq: {}, map: {}, notices: {} };
  /* 숫자 */
  V.facts.line = (s, o) => { const d = o.d || {}; const { L, own } = factsList(d); if (L.length < 2) return null;
    return SEC('facts', `${d.title ? HEAD(d, '') : ''}<p class="hpb-fline">${L.slice(0, 4).map(f => `<span class="hpb-fi"><b>${factV(f)}</b> <span>${E(f.l)}</span></span>`).join('<i class="hpb-sep" aria-hidden="true"></i>')}</p>${fnote(own)}`, o); };
  V.facts.one = (s, o) => { const d = o.d || {}; const { L, own } = factsList(d); if (L.length < 2) return null;
    const num = L.filter(f => /^\d/.test(String(f.v))); const main = num.find(f => f.u === '시간') || num.slice().sort((a, b) => parseFloat(String(b.v).replace(/,/g, '')) - parseFloat(String(a.v).replace(/,/g, '')))[0] || L[0]; const rest = L.filter(f => f !== main).slice(0, 3);
    return SEC('facts', `<div class="hpb-f1"><div class="hpb-f1m">${d.title ? `<h2 class="hpb-f1t">${br(d.title)}</h2>` : ''}<b>${factV(main)}</b><span>${E(main.l)}</span></div><dl class="hpb-f1r">${rest.map(f => `<div><dt>${E(f.l)}</dt><dd>${factV(f)}</dd></div>`).join('')}</dl></div>${fnote(own)}`, o); };
  V.facts.table = (s, o) => { const d = o.d || {}; const { L, own } = factsList(d); if (L.length < 2) return null;
    return SEC('facts', `<div class="hpb-ft"><h2 class="hpb-ftt">${br(d.title || '운영 현황')}</h2><dl>${L.slice(0, 4).map(f => `<div><dt>${E(f.l)}</dt><dd>${factV(f)}</dd></div>`).join('')}</dl></div>${fnote(own)}`, o); };
  /* 일정 */
  V.sched.cal = (s, o) => { const d = o.d || {}; const L = schedule(+o.n || 4); if (!L.length) return null;
    const tile = x => { const dt = md(x.state === 'open' ? x.to : x.state === 'soon' ? x.from : x.start || x.to) ; return `<li class="st-${x.state}"><div class="hpb-cd">${dt ? `<span class="hpb-cm">${dt.m}월</span><b>${dt.d}</b><span class="hpb-cw">${dt.w}요일 · ${E(x.what || '일정')}</span>` : `<span class="hpb-cm">상시</span><b>·</b><span class="hpb-cw">${E(STL[x.state])}</span>`}</div><div class="hpb-cb"><p class="hpb-cs"><span class="hps-chip">${STL[x.state]}</span>${x.dd != null && x.dd >= 0 ? `<em>${ddOf(x)}</em>` : ''}</p><h3>${E(x.name)}</h3><dl class="hps-sm">${x.from || x.to ? `<div><dt>접수</dt><dd><time>${E(x.from ? dot(x.from).slice(5) : '지금')}</time> ~ <time>${E(x.to ? dot(x.to).slice(5) : '상시')}</time></dd></div>` : ''}${x.start ? `<div><dt>개강</dt><dd><time>${E(dot(x.start).slice(5))}</time></dd></div>` : ''}${x.cap ? `<div><dt>정원</dt><dd>${x.cap}명</dd></div>` : ''}</dl>${goA(x, 'hpb-cg')}</div></li>`; };
    return SEC('schedule', `${HEAD({ eyebrow: d.eyebrow, title: d.title || '모집 일정', sub: d.sub })}<ol class="hpb-cal n${Math.min(L.length, 4)}">${L.map(tile).join('')}</ol>`, o); };
  V.sched.cards = (s, o) => { const d = o.d || {}; const L = schedule(+o.n || 3).slice(0, 3); if (!L.length) return null; const T0 = tday2();
    const card = x => { let bar = ''; if (x.from && x.to && x.to > x.from) { const p = Math.max(0, Math.min(100, Math.round(days(x.from, T0) / days(x.from, x.to) * 100))); bar = `<div class="hpb-bar" role="img" aria-label="접수 기간 ${p}% 지남"><i style="width:${p}%"></i></div><p class="hpb-bt"><time>${E(dot(x.from).slice(5))}</time><span>접수 기간</span><time>${E(dot(x.to).slice(5))}</time></p>`; }
      return `<li class="st-${x.state}"><p class="hpb-sct"><span class="hps-chip">${STL[x.state]}</span><b>${ddOf(x)}</b></p><h3>${E(x.name)}</h3>${bar}<p class="hpb-scm">${[x.start ? `개강 ${dot(x.start).slice(5)}` : '', x.cap ? `정원 ${x.cap}명` : '', !bar && x.to ? `${dot(x.to).slice(5)} 마감` : ''].filter(Boolean).map(E).join(' <i aria-hidden="true"></i> ')}</p>${goA(x, 'hpb-cg')}</li>`; };
    return SEC('schedule', `<div class="hpb-sch">${HEAD({ eyebrow: d.eyebrow, title: d.title || '모집 일정', sub: d.sub })}</div><ul class="hpb-sc n${L.length}">${L.map(card).join('')}</ul>`, o); };
  V.sched.table = (s, o) => { const d = o.d || {}; const L = schedule(+o.n || 5); if (!L.length) return null;
    const tr = x => `<tr class="st-${x.state}"><th scope="row" data-l="${E(term('cls'))}">${E(x.name)}</th><td data-l="상태"><span class="hps-chip">${STL[x.state]}</span></td><td data-l="접수 기간">${x.from || x.to ? `<time>${E(x.from ? dot(x.from) : '지금')}</time> ~ <time>${E(x.to ? dot(x.to) : '상시')}</time>` : '—'}</td><td data-l="개강">${x.start ? `<time>${E(dot(x.start))}</time>` : '—'}</td><td data-l="정원">${x.cap ? x.cap + '명' : '—'}</td><td class="hpb-tg">${goA(x, 'hpb-tgo')}</td></tr>`;
    return SEC('schedule', `${HEAD({ eyebrow: d.eyebrow, title: d.title || '모집 일정', sub: d.sub })}<div class="hpb-tw"><table class="hpb-st"><thead><tr><th scope="col">${E(term('cls'))}</th><th scope="col">상태</th><th scope="col">접수 기간</th><th scope="col">개강</th><th scope="col">정원</th><th scope="col"><span class="hpb-sr">신청</span></th></tr></thead><tbody>${L.map(tr).join('')}</tbody></table></div>`, o); };
  /* 후기 */
  const revL = (A, n) => A.slice().sort((a, b) => (b.st - a.st) || (Math.min(b.b.length, 140) - Math.min(a.b.length, 140))).slice(0, n);
  const revMore = (s, A, L) => { const m = menuOf(s, 'community') || menuOf(s, 'board'); return m && A.length > L.length ? `<a class="hps-more" href="#p-m-${E(m.id)}">후기 더 보기 ${ic('arrow', 16)}</a>` : ''; };
  const sumLine = A => { const { avg, n } = revSum(A); return `<p class="hpb-rsum">${avg ? `<b>${avg.toFixed(1)}</b><small>/ 5</small>` : ''}<span>실제 수강후기 ${A.length}건${avg ? ` · 별점 ${n}건 평균` : ''}</span></p>`; };
  V.reviews.wall = (s, o) => { const d = o.d || {}; const A = reviews(); if (!A.length) return null; const L = revL(A, +o.n || 6);
    return SEC('reviews', `<div class="hpb-rh">${HEAD({ eyebrow: d.eyebrow, title: d.title || '수강생 이야기', sub: d.sub })}<div class="hpb-rhs">${sumLine(A)}${revMore(s, A, L)}</div></div><div class="hpb-rw n${Math.min(L.length, 3)}">${L.map(r => `<figure>${r.st ? stars2(r.st) : ''}<blockquote>${E(String(r.b).slice(0, 200))}</blockquote><figcaption>${who2(r)}</figcaption></figure>`).join('')}</div>`, o); };
  V.reviews.big = (s, o) => { const d = o.d || {}; const A = reviews(); if (!A.length) return null; const L = revL(A, 3); const [t0, ...rest] = L;
    return SEC('reviews hpb-inv', `<div class="hpb-rb"><p class="hpb-rbt">${E(d.title || '수강생 이야기')}</p><figure class="hpb-rbq">${t0.st ? stars2(t0.st) : ''}<blockquote>${E(String(t0.b).slice(0, 180))}</blockquote><figcaption>${who2(t0)}</figcaption></figure>${rest.length ? `<ul class="hpb-rbl">${rest.map(r => `<li><blockquote>${E(String(r.b).slice(0, 120))}</blockquote>${who2(r)}</li>`).join('')}</ul>` : ''}${sumLine(A)}${revMore(s, A, L)}</div>`, Object.assign({}, o, { alt: false })); };
  V.reviews.strip = (s, o) => { const d = o.d || {}; const A = reviews(); if (!A.length) return null; const L = revL(A, +o.n || 6);
    return SEC('reviews', `<div class="hpb-rh">${HEAD({ eyebrow: d.eyebrow, title: d.title || '수강생 이야기', sub: d.sub })}<div class="hpb-rhs">${sumLine(A)}${revMore(s, A, L)}</div></div><ul class="hpb-rs n${Math.min(L.length, 3)}">${L.map(r => `<li><blockquote>${E(String(r.b).slice(0, 160))}</blockquote><p class="hps-rm">${who2(r)}${r.st ? stars2(r.st) : ''}</p></li>`).join('')}</ul>`, o); };
  /* FAQ */
  const qItem = (x, k) => `<details${k === 0 ? ' open' : ''}><summary><span>${E(x.q)}</span><i aria-hidden="true">${ic('plus', 18)}</i></summary><div class="hps-ans"><p>${br(x.a)}</p></div></details>`;
  const qSmp = smp => editing() ? smp.map(x => `<details class="is-sample"><summary><span>${E(x.q)}</span><i aria-hidden="true">${ic('plus', 18)}</i></summary><div class="hps-ans"><span class="hps-smp">샘플 문구 · 고치면 게시돼요</span><p>${br(x.a)}</p></div></details>`).join('') : '';
  const askLine = s => { const C = contact(); const h = askHref(s); if (!C.length && !h) return ''; const tel = C.find(c => c.k === 'phone'); const mail = C.find(c => c.k === 'mail');
    return `<p class="hpb-qc">더 궁금한 점은${tel ? ` <a href="${E(tel.h)}">${E(tel.v)}</a>` : ''}${tel && mail ? ' 또는' : ''}${mail ? ` <a href="${E(mail.h)}">${E(mail.v)}</a>` : ''}${tel || mail ? '로 연락하세요.' : ''}${h && !tel && !mail ? ` <a ${aAttr(h)}>문의 게시판</a>에 남겨 주세요.` : ''}</p>`; };
  V.faq.one = (s, o) => { const d = o.d || {}; const { items, smp } = faqItems(d); if (!items.length && !(editing() && smp.length)) return null;
    return SEC('faq', `<div class="hpb-q1">${HEAD({ eyebrow: d.eyebrow, title: d.title || '자주 묻는 질문', sub: d.sub })}<div class="hps-qa">${items.map(qItem).join('')}${qSmp(smp)}</div>${askLine(s)}</div>`, o); };
  V.faq.grid = (s, o) => { const d = o.d || {}; const { items, smp } = faqItems(d); if (!items.length && !(editing() && smp.length)) return null; const C = contact(); const h = askHref(s);
    const sm = editing() ? smp.map(x => `<div class="is-sample"><dt><span class="hps-smp">샘플 문구 · 고치면 게시돼요</span><br>${E(x.q)}</dt><dd>${br(x.a)}</dd></div>`).join('') : '';
    const band = C.length || h ? `<div class="hpb-qband"><p><b>더 궁금한 점이 있나요?</b>${C.length ? `<span>${C.map(c => c.h ? `<a href="${E(c.h)}">${E(c.v)}</a>` : E(c.v)).join(' <i aria-hidden="true"></i> ')}</span>` : ''}</p>${h ? `<a class="hpb-qb" ${aAttr(h)}>문의하기 ${ic('arrow', 18)}</a>` : ''}</div>` : '';
    return SEC('faq', `${HEAD({ eyebrow: d.eyebrow, title: d.title || '자주 묻는 질문', sub: d.sub })}<dl class="hpb-qg">${items.map(x => `<div><dt>${E(x.q)}</dt><dd>${br(x.a)}</dd></div>`).join('')}${sm}</dl>${band}`, o); };
  V.faq.list = (s, o) => { const d = o.d || {}; const { items, smp } = faqItems(d); if (!items.length && !(editing() && smp.length)) return null; const h = askHref(s);
    const all = items.map(qItem); const half = Math.ceil(all.length / 2);
    return SEC('faq', `<div class="hpb-qh">${HEAD({ eyebrow: d.eyebrow, title: d.title || '자주 묻는 질문', sub: d.sub })}${h ? `<a class="hps-more" ${aAttr(h)}>문의하기 ${ic('arrow', 16)}</a>` : ''}</div><div class="hpb-q2"><div class="hps-qa">${all.slice(0, half).join('')}</div><div class="hps-qa">${all.slice(half).join('')}${qSmp(smp)}</div></div>${askLine(s)}`, o); };
  /* 오시는 길(N9 — 그림 지도 없음) */
  V.map.split = (s, o) => { const d = o.d || {}; const M = mapData(s, d); if (!M.addr && !M.tel) return null; const P = place(M.addr);
    const plate = M.addr ? `<div class="hpb-mp" aria-hidden="true"><span>${E(P.si)}</span><b>${E(P.gu)}</b><small>${E(P.road)}</small></div>` : '';
    return SEC('map', `<div class="hpb-ms${plate ? '' : ' one'}"><div>${HEAD({ eyebrow: d.eyebrow, title: d.title || '오시는 길', sub: d.sub })}<ul class="hpb-mr">${M.rows.map(r => `<li>${ic(r.k, 20)}<div><small>${E(r.l)}</small>${rowV(r)}</div></li>`).join('')}</ul>${mapLinks(M.addr)}</div>${plate}</div>`, o); };
  V.map.card = (s, o) => { const d = o.d || {}; const M = mapData(s, d); if (!M.addr && !M.tel) return null; const rest = M.rows.filter(r => r.l !== '주소');
    return SEC('map', `<div class="hpb-mc"><p class="hpb-mct">${E(d.title || '오시는 길')}</p>${M.addr ? `<address class="hpb-mca">${E(M.addr)}</address>` : ''}${rest.length ? `<ul class="hpb-mci">${rest.map(r => `<li>${ic(r.k, 18)}${rowV(r)}</li>`).join('')}</ul>` : ''}${mapLinks(M.addr)}</div>`, o); };
  V.map.band = (s, o) => { const d = o.d || {}; const M = mapData(s, d); if (!M.addr && !M.tel) return null;
    return SEC('map hpb-inv', `<div class="hpb-mb"><h2>${br(d.title || '오시는 길')}</h2><dl>${M.rows.map(r => `<div><dt>${E(r.l)}</dt><dd>${rowV(r)}</dd></div>`).join('')}</dl></div>${mapLinks(M.addr)}`, Object.assign({}, o, { alt: false })); };
  V.map.cols = (s, o) => { const d = o.d || {}; const M = mapData(s, d); if (!M.addr && !M.tel) return null; const ml = mapLinks(M.addr);
    return SEC('map', `<div class="hpb-mt"><div>${HEAD({ eyebrow: d.eyebrow, title: d.title || '오시는 길', sub: d.sub })}</div><dl>${M.rows.map(r => `<div><dt>${E(r.l)}</dt><dd>${rowV(r)}</dd></div>`).join('')}${ml ? `<div><dt>지도</dt><dd>${ml}</dd></div>` : ''}</dl></div>`, o); };
  /* 공지 */
  const ntMore = s => { const m = menuOf(s, 'notice'); return m ? `<a class="hps-more" href="#p-m-${E(m.id)}" aria-label="공지사항 더보기">더보기 ${ic('plus', 16)}</a>` : ''; };
  V.notices.cards = (s, o) => { const d = o.d || {}; const L = noticeList(4); if (!L.length) return null;
    return SEC('notices' + (o.top ? ' hps-ntop' : ''), `<div class="hpb-nh"><h2>${br(d.title || '공지사항')}</h2>${ntMore(s)}</div><ul class="hpb-nc n${L.length}">${L.map(x => { const t = md(x.at); return `<li${x.top ? ' class="is-pin"' : ''}><time datetime="${E(x.at)}">${t ? `<b>${String(t.d).padStart(2, '0')}</b><span>${t.y}.${String(t.m).padStart(2, '0')}</span>` : ''}</time><span class="hps-tag">${E(x.tag)}</span><h3>${E(x.title)}${x.isNew ? ' <em class="hps-new" aria-label="새 글">N</em>' : ''}</h3></li>`; }).join('')}</ul>`, o); };
  V.notices.feat = (s, o) => { const d = o.d || {}; const L = noticeList(+d.n || 5); if (L.length < 2) return null; const [f, ...rest] = L;
    return SEC('notices' + (o.top ? ' hps-ntop' : ''), `<div class="hpb-nf"><div class="hpb-nfm"><div class="hpb-nh"><h2>${br(d.title || '공지사항')}</h2>${ntMore(s)}</div><article${f.top ? ' class="is-pin"' : ''}><span class="hps-tag">${E(f.tag)}</span><h3>${E(f.title)}</h3><time datetime="${E(f.at)}">${E(dot(f.at))}</time></article></div>${ntRows(rest)}</div>`, o); };
  V.notices.line = (s, o) => { const d = o.d || {}; const L = noticeList(3); if (!L.length) return null;
    return SEC('notices hpb-nline' + (o.top ? ' hps-ntop' : ''), `<div class="hpb-nl"><h2>${br(d.title || '공지사항')}</h2>${ntRows(L)}${ntMore(s)}</div>`, o); };

  /* 렌더러 바꿔 끼우기: 변형이 데이터 없음(null)이면 기존 렌더러(안내 · 숨김) */
  const markB = (h, bk, v) => typeof h === 'string' && h ? h.replace(/<section\b([^>]*?)class="/, `<section$1data-hpb="${bk}:${v}" class="hpb-${bk}-${v} `) : h;
  [['facts', 'facts'], ['schedule', 'sched'], ['reviews', 'reviews'], ['faq', 'faq'], ['notices', 'notices']].forEach(([k, bk]) => { const base = R[k];
    R[k] = (s, o) => { o = o || {}; if (o.tone === 'photo' || o.bare) return base(s, o); const v = blockVar(bk, s, o.d); const f = V[bk][v]; let h = null;
      try { h = f ? f(s, o) : null; } catch (e) { console.error('hpsec-trust block', bk, v, e); h = null; }
      return markB(h == null ? base(s, o) : h, bk, h == null ? BV[bk][0] : v); }; });
  R.map = (s, o) => { o = o || {}; const d = o.d || {}; let v = blockVar('map', s, d); if (!V.map[v]) v = 'split'; const h = V.map[v](s, o);
    if (h == null) return hint('map', '설정 › 기관 정보에서 주소 · 연락처를 넣으면 오시는 길이 표시됩니다(없으면 게시된 사이트에서 숨겨집니다).', o); return markB(h, 'map', v); };
  /* proSec: 오시는 길도 이 렌더러로(기존 hpth의 그림 지도 대신) */
  { const base = proSec; proSec = (x, i, s, lk) => { if (!x || x.type !== 'map' || !thOn(s)) return base(x, i, s, lk); const d = x.data || {}; if (+d.dstyle) return base(x, i, s, lk);
    if (x.hide && !editing()) return ''; const h0 = base(x, i, s, lk); let h; try { h = R.map(s, { d, alt: /\bhp-alt\b/.test(String(h0 || '').slice(0, 300)) }); } catch (e) { console.error('hpsec-trust map', e); return h0; }
    if (!h) return ''; const m = editing() ? HPE.map.get(x) : null; if (m) h = h.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`); return h; }; }
  /* 계열(HPL) 자체 숫자 · 후기 · 공지 렌더러: 변형이 첫 번째 값이 아니고 계열 정체성 블록(FAMOWN)이 아니면 이 렌더러로 넘긴다 */
  const wrapHPL = () => { const H = window.HPL; if (!H || typeof H.render !== 'function' || H.render.hpb) return; const base = H.render;
    const f = (x, i, s) => { const h = base(x, i, s); try { if (h && x && s && s.layout && thOn(s)) { const k = typeof H.kind === 'function' ? H.kind(x) : ''; const bk = { stats: 'facts', reviews: 'reviews', notices: 'notices' }[k];
      if (bk && !famOwn(bk, s) && blockVar(bk, s, x.data) !== BV[bk][0]) return null; } } catch (e) { console.error('hpsec-trust hpl', e); } return h; };
    f.hpb = 1; H.render = f; };
  /* 템플릿 blocks → site.blocks(H3 배정) */
  const wrapBlocks = () => { if (typeof siteFromTpl !== 'function' || siteFromTpl.hpb) return; const base = siteFromTpl;
    const f = tp => { const s = base(tp); try { if (s && tp && tp.blocks && typeof tp.blocks === 'object') s.blocks = Object.assign({}, tp.blocks); } catch (e) { } return s; };
    Object.keys(base).forEach(k => { f[k] = base[k]; }); f.hpb = 1; siteFromTpl = f; window.siteFromTpl = f; };
  const lateWrap = () => { wrapHPL(); wrapBlocks(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lateWrap); else setTimeout(lateWrap, 0);

  /* 변형 CSS — 쓰인 변형만 넣는다(게시본 Shadow DOM에 그대로 들어감) */
  function blkCSS(s, used) { const T = window.HPT && HPT.tokens ? HPT.tokens(s) : null; if (!T) return ''; const big = s.theme === 'senior'; const px = n => Math.round(n * (big ? 1.12 : 1)) + 'px';
    const P = '.hpt.hps-t'; const on = k => used.has(k); const C = [];
    C.push(`${P}.hpb-inv{background:var(--ink);color:var(--bg)}${P}.hpb-inv h2,${P}.hpb-inv h3,${P}.hpb-inv b,${P}.hpb-inv blockquote{color:var(--bg)}${P}.hpb-inv a{color:var(--bg)}${P}.hpb-inv .hps-st{color:#E8B84A}${P}.hpb-inv .hps-st i{color:color-mix(in srgb,var(--bg) 45%,var(--ink))}
${P} .hpb-ml{display:flex;flex-wrap:wrap;gap:8px 24px;margin:24px 0 0}${P} .hpb-ml a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:${px(15)};font-weight:650;color:var(--ink);text-decoration:underline;text-decoration-color:var(--hps-ln2);text-underline-offset:5px}${P} .hpb-ml a:hover{text-decoration-color:currentColor}`);
    if (on('facts:line')) C.push(`${P}.hpb-facts-line{padding:calc(var(--sec,120px) * .55) 0}
${P} .hpb-fline{margin:0;max-width:34em;font-size:clamp(${px(21)},2.5vw,${px(32)});line-height:1.55;letter-spacing:-.02em;color:var(--mu);font-weight:500;text-wrap:balance}
${P} .hpb-fi{white-space:nowrap}${P} .hpb-fi b{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,700);color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.03em}${P} .hpb-fi b small{font-size:1em;font-weight:inherit;margin-left:.05em}
${P} .hpb-sep{display:inline-block;width:1px;height:.9em;margin:0 .7em;vertical-align:-.1em;background:var(--hps-ln2)}`);
    if (on('facts:one')) C.push(`${P}.hpb-facts-one{padding:calc(var(--sec,120px) * .6) 0}
${P} .hpb-f1{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:64px;align-items:end}
${P} .hpb-f1t{font-size:${px(17)};font-weight:700;color:var(--ink);margin:0 0 20px;letter-spacing:-.01em}
${P} .hpb-f1m b{display:flex;align-items:baseline;font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,700);font-size:clamp(${px(96)},13vw,${px(176)});line-height:.86;letter-spacing:-.055em;color:var(--at);font-variant-numeric:tabular-nums}${P} .hpb-f1m b small{font-size:.24em;letter-spacing:-.01em;margin-left:.12em;color:var(--ink)}
${P} .hpb-f1m>span{display:block;margin-top:18px;font-size:${px(17)};color:var(--mu)}
${P} .hpb-f1r{margin:0;border-top:2px solid var(--ink)}${P} .hpb-f1r div{border-left:0;display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:18px 0;border-bottom:1px solid var(--hps-ln)}${P} .hpb-f1r dt{font-size:${px(15)};color:var(--mu)}${P} .hpb-f1r dd{margin:0;font-family:var(--hd-ff,inherit);font-size:${px(26)};font-weight:700;letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums}${P} .hpb-f1r dd small{font-size:.6em;margin-left:2px;color:var(--mu)}`);
    if (on('facts:table')) C.push(`${P}.hpb-facts-table{padding:calc(var(--sec,120px) * .5) 0}
${P} .hpb-ft{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:48px;align-items:start;padding:36px 40px;background:var(--alt);border-radius:var(--r)}${P}.hp-alt .hpb-ft{background:var(--bg)}
${P} .hpb-ftt{margin:0;font-size:${px(19)};font-weight:700;letter-spacing:-.02em;color:var(--ink);line-height:1.35}
${P} .hpb-ft dl{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:48px}${P} .hpb-ft dl div{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:14px 0;border-bottom:1px solid var(--hps-ln2)}${P} .hpb-ft dt{font-size:${px(15)};color:var(--mu)}${P} .hpb-ft dd{margin:0;font-size:${px(22)};font-weight:700;color:var(--ink);letter-spacing:-.02em;font-variant-numeric:tabular-nums}${P} .hpb-ft dd small{font-size:.66em;margin-left:2px}`);
    if (on('sched:cal')) C.push(`${P} .hpb-cal{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}${P} .hpb-cal.n1{grid-template-columns:minmax(0,420px)}${P} .hpb-cal.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .hpb-cal.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
${P} .hpb-cal li{display:flex;flex-direction:column;border:1px solid var(--hps-ln2);border-radius:var(--r);overflow:hidden;background:var(--bg)}
${P} .hpb-cd{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:14px;align-items:end;padding:20px 22px 18px;border-bottom:1px solid var(--hps-ln2)}${P} .hpb-cd b{grid-row:1/3;font-family:var(--hd-ff,inherit);font-size:${px(64)};font-weight:var(--hd-fw,700);line-height:.82;letter-spacing:-.05em;color:var(--ink);font-variant-numeric:tabular-nums}
${P} .hpb-cm{font-size:${px(14)};font-weight:700;color:var(--at)}${P} .hpb-cw{font-size:${px(13)};color:var(--mu)}${P} li.st-closed .hpb-cd b{color:var(--mu)}
${P} .hpb-cb{display:flex;flex-direction:column;gap:12px;padding:20px 22px 22px;flex:1}${P} .hpb-cs{display:flex;align-items:center;gap:10px;margin:0}${P} .hpb-cs em{font-style:normal;font-size:${px(14)};font-weight:800;color:var(--at);font-variant-numeric:tabular-nums}
${P} .hpb-cb h3{font-size:${px(18)};font-weight:700;letter-spacing:-.02em;line-height:1.4;color:var(--ink)}${P} .hpb-cb .hps-sm{font-size:${px(14)}}
${P} .hpb-cg{margin-top:auto;align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:${px(15)};font-weight:700;color:var(--ink);text-decoration:none;border-bottom:1.5px solid currentColor}${P} .hpb-cg:hover{color:var(--at)}${P} .hpb-cg.off{color:var(--mu);border-bottom-color:transparent}`);
    if (on('sched:cards')) C.push(`${P} .hpb-sch{display:flex;justify-content:space-between;align-items:end}
${P} .hpb-sc{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}${P} .hpb-sc.n1{grid-template-columns:minmax(0,520px)}${P} .hpb-sc.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
${P} .hpb-sc li{display:flex;flex-direction:column;gap:16px;padding:28px;background:var(--alt);border-radius:var(--r)}${P}.hp-alt .hpb-sc li{background:var(--bg)}
${P} .hpb-sct{display:flex;justify-content:space-between;align-items:center;margin:0}${P} .hpb-sct b{font-family:var(--hd-ff,inherit);font-size:${px(34)};font-weight:var(--hd-fw,700);letter-spacing:-.04em;line-height:1;color:var(--ink);font-variant-numeric:tabular-nums}${P} li.st-closed .hpb-sct b{color:var(--mu)}
${P} .hpb-sc h3{font-size:${px(20)};font-weight:700;letter-spacing:-.02em;line-height:1.4;color:var(--ink);min-height:2.8em}
${P} .hpb-bar{height:6px;border-radius:3px;background:var(--hps-ln);overflow:hidden}${P} .hpb-bar i{display:block;height:100%;background:var(--a);border-radius:3px}
${P} .hpb-bt{display:flex;justify-content:space-between;margin:-8px 0 0;font-size:${px(13)};color:var(--mu);font-variant-numeric:tabular-nums}
${P} .hpb-scm{margin:0;font-size:${px(15)};color:var(--ink);font-variant-numeric:tabular-nums}${P} .hpb-scm i{display:inline-block;width:3px;height:3px;border-radius:50%;background:var(--mu);vertical-align:middle;margin:0 6px}`);
    if (on('sched:cal') || on('sched:cards')) C.push(`${P} .hpb-sc .hpb-cg{margin-top:auto}`);
    if (on('sched:table')) C.push(`${P} .hpb-tw{overflow-x:auto}${P} .hpb-st{width:100%;border-collapse:collapse;font-size:${px(15.5)};font-variant-numeric:tabular-nums}
${P} .hpb-st thead th{text-align:left;font-size:${px(13)};font-weight:700;color:var(--mu);padding:0 16px 12px 0;border-bottom:2px solid var(--ink);white-space:nowrap}
${P} .hpb-st td,${P} .hpb-st tbody th{padding:20px 16px 20px 0;border-bottom:1px solid var(--hps-ln);color:var(--ink);text-align:left;vertical-align:middle;white-space:nowrap}${P} .hpb-st tbody th{font-size:${px(17)};font-weight:700;letter-spacing:-.02em;white-space:normal;min-width:12em}
${P} .hpb-st td.hpb-tg{text-align:right;padding-right:0}${P} .hpb-tgo{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 18px;border-radius:var(--br,8px);border:1.5px solid var(--ink);color:var(--ink);font-weight:700;font-size:${px(14.5)};text-decoration:none}${P} tr.st-open .hpb-tgo{background:var(--a);border-color:var(--a);color:var(--on)}${P} .hpb-tgo.off{border-color:var(--hps-ln2);color:var(--mu)}
${P} .hpb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`);
    if (on('reviews:wall') || on('reviews:strip')) C.push(`${P} .hpb-rh{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin-bottom:40px}${P} .hpb-rh .hps-hd{margin-bottom:0}${P} .hpb-rhs{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
${P} .hpb-rsum{display:flex;align-items:baseline;gap:6px;margin:0;color:var(--mu);font-size:${px(14)}}${P} .hpb-rsum b{font-family:var(--hd-ff,inherit);font-size:${px(40)};font-weight:700;letter-spacing:-.04em;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums}${P} .hpb-rsum small{font-size:${px(17)};margin-right:10px}`);
    if (on('reviews:wall')) C.push(`${P} .hpb-rw{columns:3;column-gap:24px}${P} .hpb-rw.n2{columns:2}${P} .hpb-rw.n1{columns:1;max-width:720px}
${P} .hpb-rw figure{break-inside:avoid;margin:0 0 24px;padding:28px;border:1px solid var(--hps-ln2);border-radius:var(--r);display:flex;flex-direction:column;gap:18px;background:var(--bg)}${P} .hpb-rw figure:nth-child(3n+2){background:var(--as);border-color:transparent}
${P} .hpb-rw blockquote{margin:0;font-size:${px(17)};line-height:1.7;color:var(--ink)}${P} .hpb-rw figure:first-child blockquote{font-size:${px(20)};line-height:1.6;font-weight:550;letter-spacing:-.015em}`);
    if (on('reviews:strip')) C.push(`${P} .hpb-rs{list-style:none;margin:0;padding:0 0 4px;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(300px,1fr);gap:20px;overflow-x:auto;scroll-snap-type:x mandatory}
${P} .hpb-rs li{scroll-snap-align:start;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding:28px 28px 24px;border-left:3px solid var(--a);background:var(--alt)}${P}.hp-alt .hpb-rs li{background:var(--bg)}
${P} .hpb-rs blockquote{margin:0;font-size:${px(17)};line-height:1.7;color:var(--ink)}${P} .hpb-rs .hps-rm{display:flex;align-items:center;gap:12px}${P} .hpb-rs .hps-rm .hps-st{margin-left:auto;font-size:13px}`);
    if (on('reviews:big')) C.push(`${P}.hpb-reviews-big{padding:calc(var(--sec,120px) * .9) 0}${P} .hpb-rb{max-width:880px;margin:0 auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:28px}
${P} .hpb-rbt{margin:0;font-size:${px(15)};font-weight:700;letter-spacing:.02em;color:color-mix(in srgb,var(--bg) 78%,var(--ink))}
${P} .hpb-rbq{margin:0;display:flex;flex-direction:column;align-items:center;gap:24px}${P} .hpb-rbq blockquote{margin:0;font-family:var(--hd-ff,inherit);font-weight:500;font-size:clamp(${px(24)},3.1vw,${px(38)});line-height:1.45;letter-spacing:-.025em;text-wrap:balance}
${P}.hpb-inv .hps-wh small{color:color-mix(in srgb,var(--bg) 72%,var(--ink))}${P} .hpb-rbq .hps-wh{align-items:center}
${P} .hpb-rbl{list-style:none;margin:16px 0 0;padding:28px 0 0;border-top:1px solid color-mix(in srgb,var(--bg) 24%,transparent);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;text-align:left;width:100%}${P} .hpb-rbl li{display:flex;flex-direction:column;gap:12px}${P} .hpb-rbl blockquote{margin:0;font-size:${px(16)};line-height:1.7;color:color-mix(in srgb,var(--bg) 88%,var(--ink))}
${P}.hpb-inv .hpb-rsum{color:color-mix(in srgb,var(--bg) 78%,var(--ink));justify-content:center;display:flex;align-items:baseline;gap:6px;margin:0;font-size:${px(14)}}${P}.hpb-inv .hpb-rsum b{font-size:${px(28)};font-weight:700}${P}.hpb-inv .hps-more{color:var(--bg)}`);
    if (on('faq:one')) C.push(`${P} .hpb-q1{max-width:800px;margin:0 auto}${P} .hpb-q1 .hps-hd{text-align:center;margin-left:auto;margin-right:auto}`);
    if (on('faq:one') || on('faq:list')) C.push(`${P} .hpb-qc{margin:28px 0 0;font-size:${px(16)};color:var(--mu);line-height:1.7}${P} .hpb-q1 .hpb-qc{text-align:center}${P} .hpb-qc a{color:var(--ink);font-weight:700;text-decoration:underline;text-underline-offset:4px;font-variant-numeric:tabular-nums}`);
    if (on('faq:grid')) C.push(`${P} .hpb-qg{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:56px}${P} .hpb-qg div{padding:28px 0;border-top:1px solid var(--hps-ln2)}${P} .hpb-qg div:nth-child(-n+2){border-top:2px solid var(--ink)}
${P} .hpb-qg dt{font-size:${px(18.5)};font-weight:700;letter-spacing:-.02em;line-height:1.45;color:var(--ink);margin-bottom:10px}${P} .hpb-qg dd{margin:0;font-size:${px(16)};line-height:1.75;color:var(--mu)}
${P} .hpb-qband{margin-top:40px;display:flex;justify-content:space-between;align-items:center;gap:24px;padding:24px 28px;background:var(--as);border-radius:var(--r)}${P}.hp-alt .hpb-qband{background:var(--bg)}${P} .hpb-qband p{margin:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 20px;font-size:${px(15.5)};color:var(--ink)}${P} .hpb-qband b{font-size:${px(17)}}${P} .hpb-qband a{color:var(--ink);font-variant-numeric:tabular-nums}${P} .hpb-qband i{display:inline-block;width:3px;height:3px;border-radius:50%;background:var(--mu);vertical-align:middle;margin:0 4px}
${P} .hpb-qb{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 22px;border-radius:var(--br,8px);background:var(--a);color:var(--on)!important;font-weight:700;font-size:15px;text-decoration:none}`);
    if (on('faq:list')) C.push(`${P} .hpb-qh{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:40px}${P} .hpb-qh .hps-hd{margin-bottom:0}${P} .hpb-q2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;align-items:start}${P} .hpb-q2 .hps-qa{border-top:2px solid var(--ink)}`);
    if (on('map:split')) C.push(`${P} .hpb-ms{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;align-items:stretch}${P} .hpb-ms.one{grid-template-columns:minmax(0,1fr);max-width:720px}
${P} .hpb-mr{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}${P} .hpb-mr li{display:flex;gap:14px;align-items:flex-start;padding:18px 0;border-bottom:1px solid var(--hps-ln)}${P} .hpb-mr svg{color:var(--at);flex:none;margin-top:2px}${P} .hpb-mr small{display:block;font-size:${px(13)};color:var(--mu);margin-bottom:4px}${P} .hpb-mr a,${P} .hpb-mr span{font-size:${px(17)};font-weight:600;color:var(--ink);text-decoration:none;font-variant-numeric:tabular-nums}
${P} .hpb-mp{position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;min-height:340px;padding:40px;border-radius:var(--r);background-color:var(--as);background-image:repeating-linear-gradient(90deg,transparent 0 47px,color-mix(in srgb,var(--at) 14%,transparent) 47px 48px),repeating-linear-gradient(0deg,transparent 0 47px,color-mix(in srgb,var(--at) 14%,transparent) 47px 48px);overflow:hidden}
${P} .hpb-mp span{font-size:${px(16)};font-weight:700;color:var(--at)}${P} .hpb-mp b{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);font-size:clamp(${px(56)},8vw,${px(112)});line-height:.95;letter-spacing:-.05em;color:var(--ink)}${P} .hpb-mp small{font-size:${px(16)};color:var(--mu)}`);
    if (on('map:card')) C.push(`${P} .hpb-mc{max-width:860px;margin:0 auto;text-align:center;padding:clamp(36px,5vw,64px) clamp(24px,5vw,72px);border:1px solid var(--hps-ln2);border-radius:var(--r);background:var(--bg)}
${P} .hpb-mct{margin:0 0 16px;font-size:${px(15)};font-weight:700;color:var(--at)}${P} .hpb-mca{font-style:normal;font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,700);font-size:clamp(${px(24)},3vw,${px(36)});line-height:1.35;letter-spacing:-.03em;color:var(--ink);text-wrap:balance}
${P} .hpb-mci{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:8px 28px;font-size:${px(16)};color:var(--ink)}${P} .hpb-mci li{display:flex;align-items:center;gap:8px}${P} .hpb-mci svg{color:var(--at)}${P} .hpb-mci a{color:var(--ink);font-weight:650;text-decoration:none;font-variant-numeric:tabular-nums}${P} .hpb-mc .hpb-ml{justify-content:center}`);
    if (on('map:band')) C.push(`${P}.hpb-map-band{padding:calc(var(--sec,120px) * .55) 0}${P} .hpb-mb{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:48px;align-items:start}${P} .hpb-mb h2{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);font-size:clamp(${px(26)},2.6vw,${px(34)});letter-spacing:-.03em;line-height:1.2}
${P} .hpb-mb dl{margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 40px}${P} .hpb-mb dl div{padding-top:16px;border-top:1px solid color-mix(in srgb,var(--bg) 30%,transparent)}${P} .hpb-mb dt{font-size:${px(13)};color:color-mix(in srgb,var(--bg) 78%,var(--ink));margin-bottom:8px}${P} .hpb-mb dd{margin:0;font-size:${px(17)};font-weight:600;line-height:1.5;font-variant-numeric:tabular-nums}${P} .hpb-mb dd a,${P} .hpb-mb dd span{color:var(--bg);text-decoration:none}
${P}.hpb-map-band .hpb-ml{margin-top:32px;padding-left:calc(25% + 12px)}${P}.hpb-map-band .hpb-ml a{color:var(--bg);text-decoration-color:color-mix(in srgb,var(--bg) 45%,transparent)}`);
    if (on('map:cols')) C.push(`${P} .hpb-mt{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:56px;align-items:start}${P} .hpb-mt dl{margin:0;border-top:2px solid var(--ink)}${P} .hpb-mt dl>div{display:grid;grid-template-columns:8em minmax(0,1fr);gap:24px;padding:20px 0;border-bottom:1px solid var(--hps-ln)}
${P} .hpb-mt dt{font-size:${px(15)};font-weight:700;color:var(--mu)}${P} .hpb-mt dd{margin:0;font-size:${px(17)};color:var(--ink);font-variant-numeric:tabular-nums}${P} .hpb-mt dd a,${P} .hpb-mt dd>span{color:var(--ink);text-decoration:none;font-weight:600}${P} .hpb-mt .hpb-ml{margin:0}${P} .hpb-mt .hpb-ml a{min-height:32px;font-weight:600}`);
    if (on('notices:cards') || on('notices:feat')) C.push(`${P} .hpb-nh{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}${P} .hpb-nh h2{font-family:var(--hd-ff,inherit);font-weight:var(--hd-fw,800);letter-spacing:var(--hd-ls,-.03em);font-size:clamp(${px(24)},2.4vw,${px(32)});line-height:1.2;color:var(--ink)}`);
    if (on('notices:cards')) C.push(`${P} .hpb-nc{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}${P} .hpb-nc.n1{grid-template-columns:minmax(0,360px)}${P} .hpb-nc.n2{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .hpb-nc.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
${P} .hpb-nc li{display:flex;flex-direction:column;gap:12px;padding-top:20px;border-top:2px solid var(--ink)}${P} .hpb-nc li.is-pin{border-top-color:var(--a)}
${P} .hpb-nc time{display:flex;align-items:baseline;gap:8px}${P} .hpb-nc time b{font-family:var(--hd-ff,inherit);font-size:${px(40)};font-weight:700;letter-spacing:-.04em;line-height:1;color:var(--ink);font-variant-numeric:tabular-nums}${P} .hpb-nc time span{font-size:${px(13)};color:var(--mu);font-variant-numeric:tabular-nums}
${P} .hpb-nc .hps-tag{align-self:flex-start}${P} .hpb-nc h3{font-size:${px(17)};font-weight:600;line-height:1.5;letter-spacing:-.015em;color:var(--ink);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}${P} .hpb-nc li.is-pin .hps-tag{background:var(--a);border-color:var(--a);color:var(--on)}`);
    if (on('notices:feat')) C.push(`${P} .hpb-nf{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:48px;align-items:start}
${P} .hpb-nfm article{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:32px;background:var(--as);border-radius:var(--r)}${P}.hp-alt .hpb-nfm article{background:var(--bg)}${P} .hpb-nfm article h3{font-family:var(--hd-ff,inherit);font-size:clamp(${px(21)},2vw,${px(26)});font-weight:700;line-height:1.4;letter-spacing:-.025em;color:var(--ink)}${P} .hpb-nfm time{font-size:${px(14)};color:var(--mu);font-variant-numeric:tabular-nums}${P} .hpb-nfm article.is-pin .hps-tag{background:var(--a);border-color:var(--a);color:var(--on)}`);
    if (on('notices:line')) C.push(`${P}.hpb-nline{padding:calc(var(--sec,120px) * .4) 0}${P} .hpb-nl{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,9fr) auto;gap:32px;align-items:start}
${P} .hpb-nl h2{font-size:${px(18)};font-weight:700;letter-spacing:-.02em;color:var(--ink);padding-top:14px}${P} .hpb-nl .hps-nl{border-top:0}${P} .hpb-nl .hps-nl li{min-height:52px;font-size:${px(15.5)}}${P} .hpb-nl .hps-nl li:last-child{border-bottom:0}${P} .hpb-nl .hps-more{padding-top:4px}`);
    /* 휴대폰 */
    const M = [];
    if (on('facts:line')) M.push(`${P} .hpb-fline{font-size:${px(20)}}${P} .hpb-sep{margin:0 .45em}`);
    if (on('facts:one')) M.push(`${P} .hpb-f1{grid-template-columns:1fr;gap:28px}${P} .hpb-f1m b{font-size:${px(88)}}`);
    if (on('facts:table')) M.push(`${P} .hpb-ft{grid-template-columns:1fr;gap:12px;padding:24px 20px}${P} .hpb-ft dl{grid-template-columns:1fr}${P} .hpb-ft dd{font-size:${px(19)}}`);
    if (on('sched:cal')) M.push(`${P} .hpb-cal,${P} .hpb-cal.n2,${P} .hpb-cal.n3,${P} .hpb-cal.n1{grid-template-columns:1fr;gap:14px}${P} .hpb-cal li{display:grid;grid-template-columns:96px minmax(0,1fr)}${P} .hpb-cd{display:flex;flex-direction:column;align-items:flex-start;gap:6px;border-bottom:0;border-right:1px solid var(--hps-ln2);padding:18px 14px}${P} .hpb-cd b{font-size:${px(44)}}${P} .hpb-cb{padding:18px 16px}`);
    if (on('sched:cards')) M.push(`${P} .hpb-sc,${P} .hpb-sc.n2,${P} .hpb-sc.n1{grid-template-columns:1fr;gap:14px}${P} .hpb-sc li{padding:22px 20px}${P} .hpb-sc h3{min-height:0}`);
    if (on('sched:table')) M.push(`${P} .hpb-st thead{display:none}${P} .hpb-st,${P} .hpb-st tbody{display:block}${P} .hpb-st tr{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;padding:20px 0;border-bottom:1px solid var(--hps-ln)}${P} .hpb-st tr:first-child{border-top:2px solid var(--ink)}
${P} .hpb-st td,${P} .hpb-st tbody th{display:block;padding:0;border:0;white-space:normal}${P} .hpb-st tbody th{grid-column:1/-1;min-width:0}${P} .hpb-st td::before{content:attr(data-l);display:inline-block;width:5em;font-size:13px;color:var(--mu)}${P} .hpb-st td[data-l="상태"]{grid-column:1/-1}${P} .hpb-st td{grid-column:1/-1;font-size:${px(15)}}${P} .hpb-st td.hpb-tg{text-align:left;margin-top:8px}${P} .hpb-tgo{width:100%;justify-content:center;min-height:48px}`);
    if (on('reviews:wall') || on('reviews:strip')) M.push(`${P} .hpb-rh{flex-direction:column;align-items:flex-start;gap:16px;margin-bottom:28px}${P} .hpb-rhs{align-items:flex-start}`);
    if (on('reviews:wall')) M.push(`${P} .hpb-rw,${P} .hpb-rw.n2{columns:1}${P} .hpb-rw figure{padding:22px 20px;margin-bottom:14px}${P} .hpb-rw figure:first-child blockquote{font-size:${px(18)}}`);
    if (on('reviews:strip')) M.push(`${P} .hpb-rs{grid-auto-columns:82%;gap:12px}${P} .hpb-rs li{padding:22px 20px}`);
    if (on('reviews:big')) M.push(`${P}.hpb-reviews-big{padding:var(--sec-m,72px) 0}${P} .hpb-rbq blockquote{font-size:${px(22)}}${P} .hpb-rbl{grid-template-columns:1fr;gap:24px}`);
    if (on('faq:grid')) M.push(`${P} .hpb-qg{grid-template-columns:1fr}${P} .hpb-qg div:nth-child(2){border-top:1px solid var(--hps-ln2)}${P} .hpb-qg div{padding:22px 0}${P} .hpb-qband{flex-direction:column;align-items:stretch;padding:22px 20px}${P} .hpb-qb{justify-content:center}`);
    if (on('faq:list')) M.push(`${P} .hpb-qh{flex-direction:column;align-items:flex-start;gap:8px}${P} .hpb-q2{grid-template-columns:1fr}${P} .hpb-q2 .hps-qa+.hps-qa{border-top:0}`);
    if (on('map:split')) M.push(`${P} .hpb-ms{grid-template-columns:1fr;gap:28px}${P} .hpb-mp{min-height:200px;padding:24px;order:-1}${P} .hpb-mp b{font-size:${px(56)}}`);
    if (on('map:card')) M.push(`${P} .hpb-mc{text-align:left;padding:28px 22px}${P} .hpb-mci,${P} .hpb-mc .hpb-ml{justify-content:flex-start}${P} .hpb-mci{flex-direction:column;gap:10px}`);
    if (on('map:band')) M.push(`${P}.hpb-map-band{padding:var(--sec-m,72px) 0}${P} .hpb-mb{grid-template-columns:1fr;gap:20px}${P} .hpb-mb dl{grid-template-columns:1fr;gap:16px}${P}.hpb-map-band .hpb-ml{padding-left:0;margin-top:20px}`);
    if (on('map:cols')) M.push(`${P} .hpb-mt{grid-template-columns:1fr;gap:20px}${P} .hpb-mt dl>div{grid-template-columns:1fr;gap:6px;padding:16px 0}`);
    if (on('notices:cards')) M.push(`${P} .hpb-nc,${P} .hpb-nc.n2,${P} .hpb-nc.n3,${P} .hpb-nc.n1{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 16px}${P} .hpb-nc time b{font-size:${px(32)}}${P} .hpb-nc h3{font-size:${px(15.5)}}`);
    if (on('notices:feat')) M.push(`${P} .hpb-nf{grid-template-columns:1fr;gap:20px}${P} .hpb-nfm article{padding:22px 20px}`);
    if (on('notices:line')) M.push(`${P} .hpb-nl{grid-template-columns:1fr auto;gap:4px 12px}${P} .hpb-nl h2{padding-top:0;align-self:center}${P} .hpb-nl .hps-nl{grid-column:1/-1;grid-row:2}${P} .hpb-nl .hps-more{grid-column:2;grid-row:1;padding-top:0}`);
    if (on('map:split') || on('map:card') || on('map:cols')) M.push(`${P} .hpb-ml{gap:4px 20px}`);
    return `/* hpsec-trust blocks (H1) */\n${C.join('\n')}${M.length ? `\n@media(max-width:640px){${M.join('\n')}}` : ''}\n@media(max-width:900px) and (min-width:641px){${P} .hpb-cal,${P} .hpb-nc{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .hpb-sc{grid-template-columns:repeat(2,minmax(0,1fr))}${P} .hpb-f1,${P} .hpb-nf,${P} .hpb-ms,${P} .hpb-mt,${P} .hpb-mb{grid-template-columns:1fr;gap:32px}${P} .hpb-mb dl{grid-template-columns:repeat(2,minmax(0,1fr))}${P}.hpb-map-band .hpb-ml{padding-left:0}${P} .hpb-rw{columns:2}}`; }
  HPS.blockCSS = blkCSS;
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { if (typeof h !== 'string' || !thOn(s) || !h.includes('data-hpb="')) return h; const used = new Set((h.match(/data-hpb="([a-z]+:[a-z]+)"/g) || []).map(m => m.slice(10, -1)));
      const c = blkCSS(s, used); return c && h.includes('</style>') ? h.replace('</style>', c.replace(/<\/?style/gi, '') + '</style>') : h; } catch (e) { console.error('hpsec-trust block css', e); return h; } }; window.siteHTML = siteHTML; }
})();
