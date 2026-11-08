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
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
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
})();
