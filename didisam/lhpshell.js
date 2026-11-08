/* v34.5 lhpshell — 학습자 앱 셸과 게시 홈페이지가 만나는 이음새 (fix6/BRIEF3.md · L1)
   대표님(2026-11-08): 게시된 학습자 홈에서 셸이 끼워 넣는 요소(데모 띠 · 셸 머리글 · 첫 화면 아래 AI 튜터 칸 · 하단 탭 · 가입 띠)가
   홈페이지 디자인 흐름을 끊는다 → 방문자가 보는 홈(로그인 전 · 후, 기존 웹 화면)에서 홈페이지가 주인공이 되게 한다.
   벤치마크(fix6/bench2 RULES_B2 · RULES_B3): 머리글은 하나(홈페이지 메뉴는 이미 lmerge가 셸 머리글에 합친다 → 셸 머리글이 곧 사이트 머리글),
   공지 · 안내는 머리글 위 1줄 띠(닫기), 상담 수단은 휴대폰 하단 바 2~3칸 또는 오른쪽 아래 버튼 하나(둘 동시 금지), 첫 화면 바로 아래에 다른 서비스 칸을 끼우지 않는다.
   1) 데모 · 미리보기 띠(.pvbar): 머리글 위 28px 한 줄 · 닫기(이 탭에서 기관별로 기억). 체험 계정은 로그인 화면의 「자동 입력」에 그대로 있다.
   2) 머리글: 홈페이지 테마 색(lhpth의 --hpt-*)으로 로고 칸 · 가입 버튼을 맞추고 높이를 PC 72 · 휴대폰 56으로(RULES_B3 머리글).
   3) AI 튜터 칸(lai-home): 방문자 홈에서는 첫 화면 아래에 끼우지 않는다(홈페이지를 다시 하나로 잇는다). 튜터는 PC = 오른쪽 아래 버튼, 휴대폰 = 행동 줄 안 버튼.
      로그인한 학습자(기존 웹 화면): 홈페이지(자르지 않음) → 「내 학습」 띠(이어서 학습 · 비서 · 도구) 순서로 바꾼다. 홈페이지 섹션 사이는 어떤 경우에도 자르지 않는다.
   4) 휴대폰(≤900): 하단 탭 바로 위에 유형별 행동 줄 하나(12:00 결정) — adult · k12 · voc = 상담 · 수강신청, univ · public · lifelong · corp = 문의 · 신청.
      상담 · 문의는 채널톡(설정 시) → 대표번호(바닥글 tel:) → AI 튜터 순. 떠 있는 튜터 버튼은 홈에서 숨겨 겹침 0.
   5) 가입 띠(.lgj, 휴대폰): 첫 화면 위가 아니라 홈페이지 끝(바닥글 바로 위)으로 옮긴다. 바닥글 아래 개인정보 한 줄은 바닥글 색에 맞춘다.
   기능 · 데이터는 그대로(위치 · 모양만). 앱 화면(body.lapp)에서는 아무것도 하지 않는다. lrender를 한 번 더 감싼다. */
'use strict';
(() => {
  if (typeof lrender !== 'function') return;
  const K = 'didisam.lhs.';
  const ss = { get: k => { try { return sessionStorage.getItem(K + k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(K + k, v); } catch (e) { } } };
  const HP = () => { try { const s = SITE(); return s && s.hp && s.hp.css != null ? s.hp : null; } catch (e) { return null; } };
  const ty = () => { try { return (SITE().org || {}).type || 'adult'; } catch (e) { return 'adult'; } };
  const tid = () => (typeof LR !== 'undefined' && LR.tid) || 'x';
  const ic = (n, s) => (typeof ico === 'function' ? ico(n, s || 20) : '');
  /* 유형별 행동 줄 문구(RULES_B2 §1 상담 · 신청 — 한국어 동사) */
  /* FIXLIST 5(FA): 머리글 신청 버튼(HPS.ctaWord)과 같은 낱말 — adult · k12 · voc = 수강신청, 나머지 = 신청하기 */
  const ACTS = { adult: ['상담', '수강신청'], k12: ['상담', '수강신청'], voc: ['상담', '수강신청'], univ: ['문의', '신청하기'], public: ['문의', '신청하기'], lifelong: ['문의', '신청하기'], corp: ['문의', '신청하기'] };
  /* R1 M3(FA): 휴대폰 아래 바는 하나만 — 학원 · 성인 · 직업 = 상담 · 신청 행동 줄(탭 숨김), 대학 · 공공 · 평생 · 기업 = 탭 바(행동 줄 숨김, 신청은 머리글 메뉴 아래 버튼) */
  const BAR_ACT = ['adult', 'k12', 'voc'];
  if (typeof ICP === 'object') Object.assign(ICP, { phone: ICP.phone || 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', chat: ICP.chat || 'M4 5h16v11H9l-5 4z', sparkle: ICP.sparkle || 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z', x: ICP.x || 'M6 6l12 12M18 6L6 18' });

  /* 기존 웹 화면의 홈(홈페이지가 그려진 홈)인지 */
  const homeOn = () => { const b = document.body; if (!b || b.classList.contains('lapp') || b.classList.contains('lpar')) return false;
    try { return route().a === 'home' && !!HP() && !!document.querySelector('#lm .smhost[data-smk=home]'); } catch (e) { return false; } };

  /* 1) 데모 · 미리보기 띠 */
  function demo() { const app = document.getElementById('lapp'); const bar = app && app.querySelector(':scope > .pvbar'); if (!bar) return;
    const head = app.querySelector(':scope > header.lh'); if (head && bar.nextElementSibling !== head) app.insertBefore(bar, head);
    const isDemo = !!(typeof LR !== 'undefined' && LR.sample); bar.classList.add('lhs-demo');
    if (isDemo && ss.get('demo.' + tid()) === '0') { bar.hidden = true; return; }
    if (!bar.querySelector('.lhs-dt')) { const t = bar.textContent.trim(); bar.innerHTML = `<span class="lhs-dt" title="${esc(t)}">${esc(t)}</span>`; bar.setAttribute('role', 'note'); }
    if (isDemo && !bar.querySelector('.lhs-dx')) bar.insertAdjacentHTML('beforeend', `<button type="button" class="lhs-dx" data-lhs="demo-x" aria-label="체험 안내 닫기">${ic('x', 14)}</button>`); }

  /* 2') 홈페이지 머리글(HPS · S1, 13:20 결정): 게시본 hp.head를 Shadow로 그리고, 셸 머리글(header.lh)은 그 안의 메뉴 자리(<slot>)로 들어간다.
        → 머리글은 한 겹. 모양 · 로고 · 신청 버튼 · 휴대폰 메뉴(체크박스 · details)는 홈페이지 것, 메뉴 링크는 셸이 합친 것(홈페이지 메뉴 + 학습 페이지 + 더 보기) 그대로.
        방문자 홈에서만. 로그인 · 내 강의실 진입은 홈페이지 머리글 오른쪽 버튼(로그인 → #login). */
  const noticeOff = () => ss.get('nt.' + tid()) === '0';
  function hpsHead(app, lm, off) { const H = HP(); const lh = app.querySelector(':scope > header.lh, :scope > .lhs-head > header.lh'); const old = app.querySelector(':scope > .lhs-head');
    if (off || !H || !H.head || LR.me || !lh) { if (old) { if (lh) { lh.removeAttribute('slot'); old.after(lh); } old.remove(); } document.body.classList.remove('lhs-hps'); return; }
    if (old && old.contains(lh)) return;
    const host = old || document.createElement('div'); host.className = 'lhs-head'; host.dataset.ok = '1'; host.dataset.smk = 'head'; if (!old) lh.before(host);
    const sr = host.shadowRoot || host.attachShadow({ mode: 'open' }); const ov = /hps-ovw/.test(H.head);
    sr.innerHTML = `<style>${safeCSS(H.css)}.smr{background:transparent;min-height:0}.lhs-slot{display:flex;align-items:center;margin:0 auto;min-width:0}.hps-ovw{position:absolute!important;top:0}</style><div class="smr hps-on${ov ? ' hps-ov' : ''} lk-${esc(H.look || 'campus')}">${safeHTML(H.head, { data: true, code: true })}</div>`;
    const gn = sr.querySelector('header nav.gn'); if (gn) { const sl = document.createElement('slot'); sl.name = 'nav'; const w = document.createElement('div'); w.className = 'lhs-slot'; w.appendChild(sl); gn.replaceWith(w); }
    sr.querySelectorAll('a[href="#"], a:not([href])').forEach(a => { a.setAttribute('href', a.matches('.hps-login, .hps-mlog') ? '#login' : a.matches('.hps-cta, .hps-mcta') ? browse() : '#home'); });
    sr.querySelectorAll('.hps-login, .hps-mlog').forEach(a => { a.setAttribute('href', '#login'); });
    if (noticeOff()) sr.querySelectorAll('.hps-nt, .hps-nx').forEach(x => x.remove());
    lh.slot = 'nav'; host.appendChild(lh); document.body.classList.add('lhs-hps');
    host.onclick = e => { const p = e.composedPath(); if (p.some(x => x.classList && x.classList.contains('hps-ntx'))) ss.set('nt.' + tid(), '0');
      if (p.some(x => x.tagName === 'A' && x.closest && x.closest('.hps-mp'))) { const t = sr.querySelector('.hps-mt'); if (t) t.checked = false; } };
    /* 사진 첫 화면 위 투명 머리글: 스튜디오의 body.hps-ov 여백(#p-home 기준)을 게시본 첫 섹션에 같은 값으로 */
    if (ov) requestAnimationFrame(() => { const hd = sr.querySelector('header.gh'); const hh = lm && lm.querySelector('.smhost[data-smk=home]'); const hs = hh && hh.shadowRoot; const f = hs && hs.querySelector('.smr > section:first-child, .smr > *:first-child');
      if (!hd || !f || hs.getElementById('lhsOv')) return; const pt = parseFloat(getComputedStyle(f).paddingTop) || 0; const st = document.createElement('style'); st.id = 'lhsOv'; st.textContent = `.smr>:first-child{padding-top:${Math.round(pt + hd.getBoundingClientRect().height)}px!important}`; hs.appendChild(st); }); }
  /* 공지 한 줄(hp.notice): 홈 밖 화면에서는 셸 머리글 위 띠로(같은 닫기 상태) */
  function noticeBar(app, home) { let el = app.querySelector(':scope > .lhs-nt'); const H = HP(); const n = H && H.notice;
    if (!n || !n.t || home || noticeOff() || document.body.classList.contains('lapp')) { if (el) el.remove(); return; }
    const h = `<div class="lhs-ntw"><b>공지</b>${n.href ? `<a href="${esc(n.href)}">${esc(n.t)}</a>` : `<span>${esc(n.t)}</span>`}<button type="button" data-lhs="nt-x" aria-label="공지 닫기">${ic('x', 16)}</button></div>`;
    if (!el) { el = document.createElement('div'); el.className = 'lhs-nt'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', '공지'); }
    if (el.innerHTML !== h) el.innerHTML = h; const lh = app.querySelector(':scope > header.lh'); if (lh && el.nextElementSibling !== lh) lh.before(el); }

  /* 3) AI 튜터 칸 — 방문자: 홈페이지를 다시 하나로 잇는다 */
  /* lai-home은 방문자 홈의 첫 섹션 뒤를 잘라(.lai-split) 비서 칸을 끼운다 → 잘린 섹션을 원래 Shadow 안으로 되돌려 홈페이지를 하나로(D2 지적: 전체를 감싸는 계열 보호) */
  function unsplit(lm, keepLai) { const host = lm.querySelector('.smhost[data-smk=home]'); const sp = lm.querySelector('.smhost.lai-split');
    const a = host && host.shadowRoot && host.shadowRoot.querySelector('.smr'); const b = sp && sp.shadowRoot && sp.shadowRoot.querySelector('.smr');
    if (a && b) { [...b.children].forEach(k => a.appendChild(k)); sp.remove(); } if (!keepLai) { const lai = lm.querySelector(':scope > section.lai'); if (lai) lai.remove(); } }
  /* 로그인(기존 웹 화면): 홈페이지는 자르지 않고 통째로 먼저(전체를 감싸는 계열 — sidebar 등 — 도 그대로), 「내 학습」 띠는 홈페이지 바로 뒤에 한 덩어리로.
     휴대폰은 행동 줄의 [이어서 학습], PC는 머리글 내 강의 · 떠 있는 튜터로 바로 간다. */
  function mineAfterHome(lm) { const host = lm.querySelector(':scope > .smhost[data-smk=home]'); if (!host || lm.querySelector('.lhs-mine')) return;
    const mine = []; for (let n = lm.firstElementChild; n && n !== host; n = n.nextElementSibling) if (!n.matches('.ap-back, .lhs-mt')) mine.push(n); if (!mine.length) return;
    const wrap = document.createElement('div'); wrap.className = 'lhs-mine'; wrap.id = 'lhsMine'; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', '내 학습'); wrap.tabIndex = -1;
    mine.forEach(n => wrap.appendChild(n)); host.after(wrap);
    /* 첫 화면 위에는 한 줄만: 할 일 수 + [내 학습 보기] (공지 띠와 같은 높이 · 홈페이지 첫 화면을 가리지 않음) */
    let todo = 0; try { todo = typeof ltTodo === 'function' ? ltTodo().length : 0; } catch (e) { }
    const who = esc(String(LR.me.nick || LR.me.sid || ''));
    lm.insertAdjacentHTML('afterbegin', `<div class="lhs-mt" role="region" aria-label="내 학습 바로가기"><div class="lhs-mtw"><span><b>${who}님</b>${todo ? ` · 오늘 할 일 <em>${todo}</em>개` : ' · 이어서 학습해요'}</span><a href="#lhsMine" data-lhs="mine">내 학습 보기 ${ic('down', 14)}</a></div></div>`);
    /* [AX 튜터 앱 화면으로 보기](lapp .ap-back)도 같은 줄 오른쪽으로 — 첫 화면 위 띠는 한 줄만 */
    const ab = lm.querySelector(':scope > .ap-back'); const mt = lm.querySelector(':scope > .lhs-mt .lhs-mtw'); if (ab && mt) { const b = ab.querySelector('button'); if (b) { const sp = document.createElement('span'); sp.className = 'ap-back lhs-ab'; sp.appendChild(b); mt.appendChild(sp); } ab.remove(); } }

  /* 상담 · 문의 수단: 채널톡 → 대표번호 → AI 튜터 */
  function consult() { const H = HP() || {}; if (H.chat) return { attr: 'data-smchat="1"', tag: 'button', ic: 'chat', ai: false };
    const m = String(H.foot || '').match(/href="(tel:[+\d\-\s()]{6,20})"/) || String(H.foot || '').match(/(0\d{1,2}-\d{3,4}-\d{4}|1[5-8]\d{2}-\d{4})/);
    if (m) { const tel = m[1].startsWith('tel:') ? m[1] : 'tel:' + m[1].replace(/[^\d+]/g, ''); return { attr: `href="${esc(tel)}"`, tag: 'a', ic: 'phone', ai: false }; }
    return { attr: 'data-tact="open"', tag: 'button', ic: 'sparkle', ai: true }; }
  const browse = () => { try { const P = SITE().pages || []; return document.querySelector('header.lh a[href="#shop"]') || P.some(p => p.id === 'shop') ? '#shop' : P.some(p => p.id === 'courses') ? '#courses' : '#home'; } catch (e) { return '#shop'; } };
  /* 4) 휴대폰 행동 줄 */
  function actBar(app) { let el = document.getElementById('lhsAct'); const A = ACTS[ty()] || ACTS.adult; const c = consult(); const me = !!(typeof LR !== 'undefined' && LR.me);
    const lbl2 = me ? '이어서 학습' : A[1]; const href2 = me ? '#my' : browse(); const lbl1 = c.ai ? `AI ${A[0]}` : A[0];
    const tutor = c.ai ? '' : `<button type="button" class="lhs-ai" data-tact="open" aria-label="AI 튜터에게 묻기">${ic('sparkle', 20)}</button>`;
    const h = `${tutor}<${c.tag} ${c.tag === 'button' ? 'type="button" ' : ''}class="lhs-b2" ${c.attr}>${ic(c.ic, 18)}<span>${esc(lbl1)}</span></${c.tag}><a class="lhs-b1" href="${esc(href2)}">${esc(lbl2)}</a>`;
    if (!el) { el = document.createElement('nav'); el.id = 'lhsAct'; el.className = 'lhs-act'; el.setAttribute('aria-label', '빠른 신청'); }
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } el.classList.toggle('n3', !!tutor);
    /* 어두운 계열(noir): M1 미리보기 줄(.hpm-act)과 같은 어두운 줄 · 강조색이 바탕 대비 3 미만이면 주 버튼 흰 바탕 */
    let dk = false; try { const hh = document.querySelector('#lm .smhost[data-smk=home]'); dk = !!(hh && hh.shadowRoot && hh.shadowRoot.querySelector('.hpl-noir')); } catch (e) { }
    el.classList.toggle('dk', dk); let wb = false; if (dk) { try { const a = rgb((SITE().hp.theme || {}).a ? (SITE().hp.theme.a.match(/\w\w/g) || []).map(x => parseInt(x, 16)).join(',') : ''); const L = lum(a.length >= 3 ? a : [255, 255, 255]); wb = (L + .05) / (lum([14, 14, 16]) + .05) < 3; } catch (e) { wb = true; } } el.classList.toggle('wb', wb);
    if (el.parentElement !== app) app.appendChild(el); size(); }
  function size() { const tb = document.querySelector('nav.tabbar.lux-bn, nav.tabbar'); const v = tb && tb.getBoundingClientRect().height ? Math.round(tb.getBoundingClientRect().height) : 0; document.body.style.setProperty('--lhs-tb', v + 'px'); }

  /* 5) 가입 띠 · 바닥글 아래 한 줄 */
  function joinLast(lm) { const j = lm.querySelector(':scope > .lgj'); if (!j) return; j.classList.add('lhs-join'); if (lm.lastElementChild !== j) lm.appendChild(j); joinMerge(lm, j); }
  /* R1 M3(FA): 가입 띠를 따로 끼우지 않고 홈페이지 마지막 신청 띠 안의 보조 줄로 합친다(신청 띠가 없으면 지금처럼 바닥글 위 띠) */
  const CTA_RE = /\b(hp-cta|hps-cta-sec|fb-cta|hpl-k-cta|pt-cta|hpl-cta)\b|cta/;
  /* 바닥글 안쪽 첫 칸: 홈 shadowRoot 안의 footer.gf(계열 · hps 바닥글) 또는 게시본 바닥글 호스트 */
  function footIn(sr, lm) { const roots = [sr]; document.querySelectorAll('footer.lf .smhost[data-smk=foot], #lm .smhost').forEach(h => { if (h.shadowRoot && !roots.includes(h.shadowRoot)) roots.push(h.shadowRoot); });
    for (const r of roots) { const f = [...r.querySelectorAll('footer.gf')].pop(); if (f) return f.querySelector(':scope > .hps-fw') || f.querySelector('.hps-fw, :scope > .wrap, :scope > div') || f; } return null; }
  function joinMerge(lm, j) { const host = lm.querySelector('.smhost[data-smk=home]'); let sr = host && host.shadowRoot; if (!sr) return;
    if (document.querySelector('#lm .smhost') && [...document.querySelectorAll('.smhost')].some(h => h.shadowRoot && h.shadowRoot.querySelector('.lhs-jn'))) { j.classList.add('lhs-jm'); return; }
    const secs = [...sr.querySelectorAll('.smr > section, .smr > * > section')]; const last = secs[secs.length - 1];
    const t = (j.querySelector('b') || {}).textContent || ''; const L = [...j.querySelectorAll('.lgj-a a')].filter(a => a.getAttribute('href')); if (!L.length) return;
    let w; if (last && (CTA_RE.test(last.className) || last.hasAttribute('data-hps-cta'))) w = [...last.children].find(x => x.tagName === 'DIV' && !x.matches('[aria-hidden],.hps-scrim')) || last;
    else { w = footIn(sr, lm); if (!w) { j.classList.remove('lhs-jm'); return; } sr = w.getRootNode(); } /* R2 M3(H5): 마지막이 신청 띠가 아니면(지도 · 문의 · 공지 등) 바닥글 첫 줄로 합친다 — 바닥글 위 따로 낀 연한 띠 제거 */
    const box = document.createElement('div'); box.className = 'lhs-jn'; box.setAttribute('role', 'note'); box.setAttribute('aria-label', '가입 · 로그인');
    box.innerHTML = `${t ? `<span>${esc(t)}</span>` : ''}${L.map(a => `<a href="${esc(a.getAttribute('href'))}">${esc(a.textContent.trim())}</a>`).join('')}`; if (w.closest && w.closest('footer')) { box.classList.add('lhs-jf'); w.insertBefore(box, w.firstChild); } else w.appendChild(box);
    if (!sr.getElementById('lhsJn')) { const st = document.createElement('style'); st.id = 'lhsJn'; st.textContent = '.lhs-jn{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-top:28px;padding-top:18px;border-top:1px solid color-mix(in srgb,currentColor 22%,transparent);font-size:15px;line-height:1.5;position:relative;z-index:2}.lhs-jn span{opacity:.86}.lhs-jn a{color:inherit;font-weight:700;text-decoration:underline;text-underline-offset:4px;min-height:44px;display:inline-flex;align-items:center}.lhs-jn a:focus-visible{outline:2px solid currentColor;outline-offset:2px}.lhs-jn.lhs-jf{margin:0 0 28px;padding:0 0 18px;border-top:0;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent);font-size:14.5px;width:100%;grid-column:1/-1}'; sr.appendChild(st); }
    j.classList.add('lhs-jm'); }
  /* R1 M3 · FIXLIST 7(FA): PC 떠 있는 튜터 버튼은 첫 화면에서 숨기고, 한 화면 내린 뒤 작은 원형으로 보인다(오른쪽 아래 카드 가림 방지) */
  function past() { const b = document.body; if (!b || !b.classList.contains('lhs-home')) return; b.classList.toggle('lhs-past', (scrollY || document.documentElement.scrollTop) > innerHeight * .6); }
  addEventListener('scroll', past, { passive: true });
  const rgb = c => (String(c).match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  function footTone() { const p = document.querySelector('footer.lf .smpriv'); const host = document.querySelector('footer.lf .smhost[data-smk=foot]'); if (!p || !host || !host.shadowRoot) return;
    let el = host.shadowRoot.querySelector('.smr'); let bg = null; for (let i = 0; i < 6 && el; i++) { const c = rgb(getComputedStyle(el).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > .5)) bg = c; el = el.lastElementChild; }
    if (!bg) return; const fo = p.closest('footer.lf'); if (fo) fo.style.background = `rgb(${bg[0]},${bg[1]},${bg[2]})`; p.style.background = `rgb(${bg[0]},${bg[1]},${bg[2]})`; p.classList.toggle('lhs-dk', lum(bg) < .2); p.classList.add('lhs-tone'); }

  /* 6) 게시본 D-day · 모집 상태 다시 계산(통합 요청): 게시본 HTML은 게시 시점에 굳으므로 홈을 열 때 오늘 기준으로 고친다.
        S2 강좌 카드 [data-due] (배지 · 목록 · 가격 · 일정 카드 · 표) + S4 모집 일정(ol.hps-sl — 접수 · 개강 날짜 글자에서 다시 계산, hpsec-trust schedule()과 같은 규칙) */
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const dDays = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const okD = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
  const setTx = (el, t) => { const n = [...el.childNodes].find(x => x.nodeType === 3 && x.textContent.trim()); if (n) n.textContent = t + ' '; else el.insertBefore(document.createTextNode(t + ' '), el.firstChild); };
  function ddFix(root) { const T0 = today();
    /* v34.5 FB(FIXLIST 3): S2 '모집 예정'([data-from] · [data-to]) — 모집 시작일이 지났으면 모집중으로 바꾸고 아래 data-due 계산에 넘김 */
    root.querySelectorAll('[data-from]').forEach(el => { const fr = String(el.dataset.from || '').slice(0, 10), to = String(el.dataset.to || '').slice(0, 10); if (!okD(fr) || !okD(to) || fr > T0) return;
      el.removeAttribute('data-from'); el.classList.remove('is-soon'); el.dataset.due = to;
      if (el.matches('.hps-bd')) { el.classList.add('is-on'); el.innerHTML = '모집중 <b></b>'; } else if (el.matches('.hps-st')) { el.classList.add('is-open'); el.innerHTML = '<span>모집중</span><b></b>'; } else { el.classList.add('is-open'); const dd = dDays(T0, to); el.textContent = '모집중 ' + (dd === 0 ? '오늘 마감' : 'D-' + dd); } });
    root.querySelectorAll('[data-due]').forEach(el => { const due = String(el.dataset.due || '').slice(0, 10); if (!okD(due)) return; const dd = dDays(T0, due); const tx = dd === 0 ? '오늘 마감' : 'D-' + dd; const b = el.querySelector(':scope > b');
      if (dd < 0) { el.classList.remove('is-on', 'is-open'); el.classList.add(el.matches('.hps-bd') ? 'is-off' : 'is-closed');
        if (el.matches('.hps-st')) { const sp = el.querySelector(':scope > span'); if (sp) sp.textContent = '모집 마감'; if (b) b.remove(); const go = el.closest('.hps-sch') && el.closest('.hps-sch').querySelector('.hps-cta'); if (go) setTx(go, '자세히'); }
        else if (el.matches('.hps-due')) el.textContent = String(el.textContent).replace(/\s*·\s*(D-\d+|오늘 마감)\s*$/, '');
        else el.textContent = '모집 마감';
        el.removeAttribute('data-due'); return; }
      if (b) b.textContent = tx; else if (el.matches('.hps-dd')) el.textContent = tx; else if (el.matches('.hps-due')) el.textContent = String(el.textContent).replace(/(D-\d+|오늘 마감)\s*$/, tx); });
    const STL = { open: '모집 중', soon: '모집 예정', closed: '모집 마감', start: '개강 예정' };
    root.querySelectorAll('ol.hps-sl > li').forEach(li => { const get = k => { const r = [...li.querySelectorAll('dl > div')].find(d => (d.querySelector('dt') || {}).textContent === k); return r ? [...r.querySelectorAll('time')].map(t => t.textContent.trim().replace(/\./g, '-')) : []; };
      const [f0, t0] = get('접수'); const from = okD(f0 || '') ? f0 : '', to = okD(t0 || '') ? t0 : ''; const st = (get('개강').filter(okD)[0]) || ''; const hasR = get('접수').length > 0; if (!from && !to && !st) return;
      let state, target, what; if (hasR && from && from > T0) { state = 'soon'; target = from; what = '접수 시작'; } else if (hasR && to && to < T0) { state = 'closed'; target = st && st >= T0 ? st : ''; what = target ? '개강' : ''; } else if (hasR) { state = 'open'; target = to; what = to ? '접수 마감' : ''; } else { state = 'start'; target = st; what = '개강'; }
      if (!hasR && st && st < T0) state = 'closed';
      li.className = li.className.replace(/\bst-\w+/, 'st-' + state); const chip = li.querySelector('.hps-chip'); if (chip) chip.textContent = STL[state];
      const ddEl = li.querySelector('.hps-dd'); const dd = target ? dDays(T0, target) : null;
      if (ddEl) { ddEl.classList.toggle('none', dd == null); ddEl.innerHTML = dd == null ? `<b>상시</b><small>${state === 'open' ? '접수 중' : ''}</small>` : `<b>${dd === 0 ? 'D-DAY' : dd > 0 ? 'D-' + dd : 'D+' + (-dd)}</b><small>${esc(what)}${dd > 0 ? '까지' : ''}</small>`; }
      const go = li.querySelector('.hps-go'); if (go && state === 'closed' && go.tagName === 'A') { const sp = document.createElement('span'); sp.className = 'hps-go off'; sp.textContent = '마감'; go.replaceWith(sp); } else if (go && go.tagName === 'A') setTx(go, state === 'open' ? '신청하기' : '자세히'); }); }
  function ddAll() { document.querySelectorAll('#lm .smhost').forEach(h => { if (h.shadowRoot && !h.dataset.lhsDd) { h.dataset.lhsDd = '1'; try { ddFix(h.shadowRoot); } catch (e) { console.error('lhpshell dd', e); } } }); }
  window.lhsDday = ddFix;

  function apply() { const b = document.body; if (!b) return; const app = document.getElementById('lapp'); const lm = document.getElementById('lm');
    if (b.classList.contains('lapp')) { b.classList.remove('lhs-home', 'lhs-in', 'lhs-bar-act', 'lhs-bar-tab', 'lhs-past'); const a = document.getElementById('lhsAct'); if (a) a.remove(); return; }
    demo(); ddAll(); const on = homeOn(); b.classList.toggle('lhs-home', on); b.classList.toggle('lhs-in', on && !!LR.me);
    if (app) { if (on) hpsHead(app, lm); else { const hh = app.querySelector(':scope > .lhs-head'); if (hh) hpsHead(app, null, true); b.classList.remove('lhs-hps'); } noticeBar(app, on && b.classList.contains('lhs-hps')); }
    const old = document.getElementById('lhsAct'); if (!on) { b.classList.remove('lhs-bar-act', 'lhs-bar-tab', 'lhs-past'); if (old) old.remove(); return; }
    unsplit(lm, !!LR.me); if (LR.me) mineAfterHome(lm);
    b.classList.toggle('lhs-bar-act', !LR.me && BAR_ACT.includes(ty())); b.classList.toggle('lhs-bar-tab', !!LR.me || !BAR_ACT.includes(ty())); past();
    joinLast(lm); actBar(app); requestAnimationFrame(footTone); setTimeout(footTone, 400); }
  window.lhsApply = apply;
  { const base = lrender; lrender = (...x) => { const r = base(...x); try { apply(); } catch (e) { console.error('lhpshell', e); } return r; }; }
  document.addEventListener('click', e => { const m = e.target.closest && e.target.closest('[data-lhs="mine"]'); if (!m) return; e.preventDefault(); const w = document.getElementById('lhsMine'); if (w) { w.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); w.focus({ preventScroll: true }); } });
  document.addEventListener('click', e => { const n = e.target.closest && e.target.closest('[data-lhs="nt-x"]'); if (n) { e.preventDefault(); ss.set('nt.' + tid(), '0'); const w = n.closest('.lhs-nt'); if (w) w.remove(); return; } });
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-lhs="demo-x"]'); if (!t) return; e.preventDefault(); ss.set('demo.' + tid(), '0'); const bar = t.closest('.pvbar'); if (bar) bar.hidden = true; });
  addEventListener('resize', () => { if (document.body.classList.contains('lhs-home')) size(); });
})();
