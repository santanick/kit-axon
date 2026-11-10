/* v23 sitemerge — 홈페이지 + 학습 사이트 통합
   "학습자 사이트와 홈페이지가 왜 따로 있어야지? 하나로 합쳐줘"
   - 공개 사이트는 learner.html 하나: 홈페이지(S.site)의 메뉴 · 섹션 · 헤더 로고 · 푸터 · 챗봇 · SEO가 학습 페이지(클래스 · 마이페이지 · 커뮤니티 …)와 한 화면에 나온다.
   - 스튜디오 메뉴는 「홈페이지 · 학습 사이트」(site) 하나, 편집 탭 2개(홈페이지 · 메뉴 · 디자인 / 학습 페이지 · 콘텐츠), 게시 버튼 하나.
   - 게시본: lsSnapshot() 감싸기 → r.hp = { css, home, pages, foot, menus, seo, chat, logo, … } (학습자 화면은 lmerge.js가 그린다)
   - 시작 가이드: BLD_STEPS의 'lsite' 단계를 'site'에 합친다(기존 S.bld.steps 이전 포함).
   - 데이터: S.settings.siteMerge = { v, home:'mix'|'site'|'learn'|'both' } (첫 화면 구성) */
'use strict';
(() => {
  const HOME_OPTS = [['mix', '홈페이지 섹션 + 로그인 시 내 진행 현황'], ['site', '홈페이지 섹션만'], ['both', '홈페이지 섹션 + 학습 섹션'], ['learn', '학습 섹션만(기존 학습자 홈)']];
  const cfg = () => { const st = S.settings = S.settings || {}; st.siteMerge = Object.assign({ v: 0, home: 'mix' }, st.siteMerge || {}); return st.siteMerge; };
  const pubAt = () => (S.lsite && S.lsite.pub && S.lsite.pubAt) || (S.site && S.site.published && S.site.at) || '';
  const isPub = () => !!((S.site && S.site.published) || (S.lsite && S.lsite.pub));
  window.smIsPub = isPub;

  /* ── 1) 스튜디오 메뉴: '홈페이지' + '학습자 사이트' → '홈페이지 · 학습 사이트' 하나 ── */
  MENU.site.label = '홈페이지 · 학습 사이트';
  Object.values(PRESET).forEach(P => ['on', 'off'].forEach(k => { const i = P[k].indexOf('lsite'); if (i >= 0) P[k].splice(i, 1); }));
  if (typeof SM_SCR !== 'undefined') Object.values(SM_SCR).forEach(R => Object.values(R).forEach(L => { if (!Array.isArray(L)) return; const i = L.indexOf('lsite'); if (i >= 0) { if (L.includes('site')) L.splice(i, 1); else L[i] = 'site'; } }));
  /* go('lsite') · #ops/lsite 주소 → 통합 화면의 학습 페이지 탭 */
  { const base = resolve; resolve = id => { const r = base(id); if (r && r.tab === 'lsite') { UI.smT = 'learn'; return { ws: MENU.site.ws, tab: 'site' }; } return r; }; }

  /* ── 2) 시작 가이드: 'lsite' 단계를 'site'에 합침 ── */
  if (typeof BLD_STEPS !== 'undefined') {
    const i = BLD_STEPS.findIndex(s => s.id === 'lsite'); if (i >= 0) BLD_STEPS.splice(i, 1);
    const st = BLD_STEPS.find(s => s.id === 'site'); if (st) { st.n = '홈페이지 · 학습 사이트'; st.d = '메뉴 · 섹션 · 학습 페이지 · 한 번에 게시'; }
  }
  if (typeof BWORD !== 'undefined') BWORD.forEach(w => { if (w[0] === 'lsite') w[0] = 'site'; });
  if (typeof bQ === 'function') { const base = bQ; bQ = id => id === 'site' || id === 'lsite' ? [...base('site').filter(x => !/게시/.test(x)), '홈페이지 게시해줘'] : base(id); }
  if (typeof bGuideText === 'function') { const base = bGuideText; bGuideText = id => id === 'site' || id === 'lsite' ? `홈페이지와 학습 사이트는 이제 하나의 사이트입니다. 화면에서 메뉴 · 첫 화면 섹션 · 학습 페이지(진단 · 튜토리얼 · 마이페이지 등)를 함께 고치고, "홈페이지 게시해줘"라고 하시면 ${tj('learner', '이')} 같은 주소에서 바로 보게 됩니다.` : base(id); }

  /* 사용 가이드(guide.js): 'lsite' 방문 = 통합 화면 방문, 문구 갱신 */
  if (typeof gdVisit === 'function') { const base = gdVisit; gdVisit = v => { const x = typeof gdVal === 'function' ? gdVal(v) : v; return x === 'lsite' ? CUR.tab === 'site' : base(v); }; }
  if (typeof GUIDES !== 'undefined') { const g = GUIDES.find(x => x.id === 'site'); if (g) { g.title = '홈페이지 · 학습 사이트 꾸미기 · 게시'; g.desc = '메뉴 · 첫 화면 · 학습 페이지 → 한 번에 게시 → 확인';
    const s0 = g.steps[0]; if (s0 && typeof s0.t === 'string') s0.t = '홈페이지 · 학습 사이트 열기';
    const s2 = g.steps.find(s => s.done && s.done.changed === 'pub'); if (s2) s2.d = '게시하면 홈페이지와 학습 사이트가 같은 주소에 함께 반영됩니다.'; } }

  /* ── 3) 기존 기관 데이터 이전(여러 번 불러도 안전) ── */
  function smMigrate() {
    if (!S || !S.org || !S.nav || !S.nav.tabs) return;
    const C = cfg();
    let lsOn = false;
    Object.values(S.nav.tabs).forEach(L => { if (!Array.isArray(L)) return; for (let i = L.length - 1; i >= 0; i--) if (L[i] && L[i].id === 'lsite') { lsOn = lsOn || !!L[i].on; L.splice(i, 1); } });
    if (lsOn) { const w = MENU.site.ws; const T = S.nav.tabs[w] = S.nav.tabs[w] || []; const x = T.find(t => t.id === 'site'); if (x) x.on = true; else T.push({ id: 'site', on: true }); }
    if (S.bld && S.bld.steps) {
      const st = S.bld.steps;
      if (st.lsite) { st.site = st.site || { on: false, done: false }; st.site.on = !!(st.site.on || st.lsite.on); st.site.done = !!(st.site.done || st.lsite.done); delete st.lsite; }
      if (S.bld.cur === 'lsite') S.bld.cur = 'site';
      if (S.bld.seen && S.bld.seen.lsite) { S.bld.seen.site = 1; delete S.bld.seen.lsite; }
      if (st.site && !st.site.done && S.lsite && S.lsite.pub) st.site.done = true; /* 둘 중 하나라도 게시했으면 완료 */
    }
    if (!C.v) {
      const sitePub = !!(S.site && S.site.published), lsPub = !!(S.lsite && S.lsite.pub);
      C.home = lsPub && !sitePub ? 'learn' : 'mix'; /* 학습자 사이트만 쓰던 기관은 첫 화면을 그대로 */
      C.v = 1; C.at = typeof today === 'function' ? today() : '';
      try {
        if (sitePub && S.lsite && lsPub && !S.lsite.pub.hp) S.lsite.pub.hp = smHp(); /* 게시됐던 홈페이지를 기존 게시본에 그대로 얹음 */
        else if (sitePub && S.lsite && !lsPub) { S.lsite.pub = lsSnapshot(); S.lsite.pubAt = nowStr(); }
      } catch (e) { console.error('sitemerge migrate', e); }
    }
  }
  window.smMigrate = smMigrate;
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { smMigrate(); } catch (e) { console.error(e); } return r; }; }
  { const base = postSeed; postSeed = (...a) => { const r = base(...a); try { cfg().v = 1; smMigrate(); } catch (e) { console.error(e); } return r; }; }
  AFTER.push(() => { try { if (S && S.org) smMigrate(); const g = $('#lsGo'); if (g && !g.dataset.sm) { g.dataset.sm = 1; g.title = '홈페이지 · 학습 사이트 새 창'; g.lastChild && g.lastChild.nodeType === 3 && (g.lastChild.nodeValue = ' 사이트 열기'); } } catch (e) { console.error(e); } });

  /* ── 4) 게시본: 홈페이지를 학습 사이트 게시본에 포함 ── */
  const sidOf = id => { const m = M(id); return m ? String(m.sid || (m.extra && m.extra['학번']) || m.id) : ''; };
  const allowOf = it => { if (!it || it.access !== '지정 회원') return null; let ids = it.targets || [];
    ids = typeof c2Expand === 'function' ? c2Expand(ids) : ids.flatMap(x => M(x) ? [x] : S.members.filter(m => m.group === x || m.team === x).map(m => m.id));
    return [...new Set(ids.map(sidOf).filter(Boolean))].slice(0, 5000); };
  const shadowCSS = css => String(css).replace(/:root\b/g, ':host').replace(/(^|[\s,}>(])(html|body)(?=[\s{,.:>)[])/g, '$1.smr');
  function smHp() {
    const s0 = site(); if (typeof s2norm === 'function') s2norm(s0);
    const s = JSON.parse(JSON.stringify(s0)); const open = it => { it.access = '공개'; };
    s.menus.forEach(m => { open(m); (m.subs || []).forEach(open); });
    const h = siteHTML(s, true, 'ko');
    const headEnd = h.indexOf('</head>'); const css = [...h.slice(0, headEnd > 0 ? headEnd : h.length).matchAll(/<style>([\s\S]*?)<\/style>/g)].map(x => x[1]).join('\n');
    const L = S.lsite || {}; const lsPg = id => (L.pages || []).some(p => p.id === id && p.on);
    const boardId = ((S.boards || []).find(b => b.id !== '커뮤니티') || {}).id;
    const menuHref = m => {
      if (m.link) return linkOf(m.link);
      return { home: '#home', class: '#shop', book: '#textbooks', community: '#comm', notice: lsPg('notice') ? '#notice' : '#hp/m-' + m.id, board: boardId ? '#comm/' + encodeURIComponent(boardId) : '#comm' }[m.kind] || '#hp/m-' + m.id;
    };
    const keyHref = key => {
      if (key === 'home') return '#home';
      if (key.startsWith('c-')) return '#class/' + key.slice(2);
      if (key === 'terms' || key === 'privacy') return '#hp/' + key;
      if (key.startsWith('s-')) return '#hp/' + key;
      if (key.startsWith('m-')) { const id = key.slice(2); const m = s0.menus.find(x => x.id === id) || s0.menus.find(x => id.startsWith(x.id + '-')); return m ? menuHref(m) : '#hp/' + key; }
      return '#hp/' + key;
    };
    function linkOf(v) { v = String(v || ''); if (v.startsWith('learn:comm/')) return '#comm/' + encodeURIComponent(v.slice(11)); /* v37 게시판 하나로 가는 메뉴 */ if (v.startsWith('learn:')) { const r = v.slice(6); return ['home', 'shop', 'comm', 'notice', 'textbooks', 'my', 'courses'].includes(r) ? '#' + r : '#home'; } /* v24 학습 페이지 연결 */ if (v.startsWith('page:')) return keyHref(v.slice(5)); if (v.startsWith('cls:')) return '#class/' + v.slice(4); if (v.startsWith('url:') && /^https?:\/\//.test(v.slice(4))) return v.slice(4); return '#home'; }
    const fix = html => String(html || '').replace(/href="#p-([^"]*)"/g, (_, k) => `href="${esc(keyHref(k))}"`);
    const pages = {}; let home = '';
    const re = /<main class="s2pg" id="p-([^"]+)">/g; let mm; const idx = [];
    while ((mm = re.exec(h))) idx.push([mm[1], mm.index, mm.index + mm[0].length]);
    const P = typeof s2pages === 'function' ? s2pages(s0) : [];
    idx.forEach(([key, , st]) => { const end = h.indexOf('</main>', st); const html = fix(h.slice(st, end < 0 ? h.length : end));
      if (key === 'home') { home = html; return; } if (key.startsWith('c-')) return;
      const p = P.find(x => x.key === key); const it = p ? (p.sb || p.m) : null;
      pages[key] = { name: p ? p.name : key === 'terms' ? '서비스 이용약관' : key === 'privacy' ? '개인정보 처리방침' : key, html, access: it ? it.access || '공개' : '공개', allow: allowOf(it), hide: !!(it && it.hide), seo: Object.assign({ title: '', desc: '', kw: '' }, (it && it.seo) || {}) }; });
    const fs = h.lastIndexOf('<footer class="gf'), fe = h.lastIndexOf('</footer>');
    const foot = fs >= 0 && fe > fs ? fix(h.slice(fs, fe + 9)) : '';
    const menus = s0.menus.filter(m => m.on !== false).map(m => ({ id: m.id, kind: m.kind, l: m.l, access: m.access || '공개', hide: !!m.hide, allow: allowOf(m), href: menuHref(m),
      subs: m.subOn && Array.isArray(m.subs) ? m.subs.filter(sb => sb.on !== false).map(sb => ({ id: sb.id, l: sb.l, access: sb.access || '공개', hide: !!sb.hide, allow: allowOf(sb), href: sb.link ? linkOf(sb.link) : '#hp/s-' + m.id + '-' + sb.id })) : [] }));
    const st = S.settings || {}; const seo = st.seo || {}; const cb = st.chatbot || {}; const g = s0.gnb || {};
    /* v34.5 L1: 홈페이지 머리글(HPS · S1 — 공지 띠 · 휴대폰 메뉴 포함)과 공지 한 줄을 게시본에 싣는다 → 학습자 홈 방문자 화면이 셸 머리글 대신 쓴다(lhpshell.js) */
    const ha = h.indexOf('<input type="checkbox" id="hps-mt"'), hm = ha < 0 ? -1 : h.indexOf('class="hps-mf"', ha), he = hm < 0 ? -1 : h.indexOf('</div></div></div>', hm); const head = he > 0 ? fix(h.slice(ha, he + 18)) : '';
    const ntT = (head.match(/class="hps-ntt"[^>]*>\s*<span>([^<]{1,200})<\/span>/) || [])[1], ntH = (head.match(/<a class="hps-ntt"[^>]*?href="(#[^"]*)"/) || [])[1]; const notice = ntT ? { t: ntT.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').slice(0, 80), href: ntH || '' } : null;
    const dark = c => { try { return /^#[0-9a-f]{6}$/i.test(c) && lum(c) < .35; } catch (e) { return false; } };
    return { v: 1, at: nowStr(), name: S.org.name, look: typeof lookOf === 'function' ? lookOf(s0) : 'campus', color: s0.color || '', css: shadowCSS(css), home, pages, foot, menus, head, notice,
      mode: cfg().home, logo: /^data:image\/|^https:\/\//.test(g.logo || '') ? g.logo : '', gnbBg: /^#[0-9a-f]{3,8}$/i.test(g.bg || '') ? g.bg : '', gnbDark: dark(g.bg || ''),
      seo: { title: String(seo.title || '').slice(0, 120), desc: String(seo.desc || '').slice(0, 300), kw: String(seo.kw || seo.keywords || '').slice(0, 300), index: seo.noindex ? false : true },
      favicon: /^data:image\/|^https:\/\//.test(st.favicon || '') ? st.favicon : '',
      chat: cb.type && cb.type !== 'none' ? { type: cb.type, kakaoUrl: /^https:\/\//.test(cb.kakaoUrl || '') ? cb.kakaoUrl : '', ctKey: String(cb.ctKey || '').slice(0, 80), label: String(cb.label || '상담하기').slice(0, 20), pos: cb.pos === 'left' ? 'left' : 'right' } : null };
  }
  window.smHp = smHp;
  { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { r.hp = smHp(); } catch (e) { console.error('sitemerge hp', e); } return r; }; }

  /* ── 5) 게시 버튼 하나: 홈페이지 · 학습 사이트를 함께 게시 ── */
  function smPublish() {
    const s = site(); if (typeof s2norm === 'function') s2norm(s); lsEnsure(); const at = nowStr();
    s.published = true; s.at = at; const L = S.lsite; L.pub = lsSnapshot(); L.pubAt = at;
    logAudit('홈페이지 · 학습 사이트 게시'); save(); render(); toast(`게시했습니다 — 홈페이지와 학습 사이트가 같은 주소에서 열립니다${S.org.domain ? ` (${S.org.domain}, 데모)` : ''}.`, 'ok');
  }
  window.smPublish = smPublish;
  ACT['site-pub'] = () => smPublish(); ACT['ls-pub'] = () => smPublish(); ACT['sm-pub'] = () => smPublish();
  ACT['sm-home'] = el => { const v = el.value; if (!HOME_OPTS.some(o => o[0] === v)) return; cfg().home = v; save(); render(); toast('첫 화면 구성을 바꿨습니다. [게시하기]를 누르면 반영됩니다.', 'ok'); };

  /* ── 6) 통합 편집 화면 ── */
  const vSite = VIEWS.site, vLs = VIEWS.lsite;
  const strip = h => String(h).replace(/<button[^>]*data-act="(?:site-pub|ls-pub)"[^>]*>[\s\S]*?<\/button>/g, '');
  function smView(tab) {
    let inner = ''; try { inner = strip(tab === 'learn' ? vLs() : vSite()); } catch (e) { console.error(e); inner = '<div class="empty">화면을 그리지 못했습니다.</div>'; }
    const at = pubAt(); const C = cfg(); const url = typeof lsLearnerURL === 'function' ? lsLearnerURL() : 'learner.html';
    const st = isPub() ? tag(`게시됨 · ${at}`, 'g') : tag('미게시', 'y');
    return `<div class="sgm-bar"><div class="sgm-bl"><b>홈페이지 · 학습 사이트</b>${st}<p class="mini">홈페이지와 학습 사이트는 하나의 사이트입니다. 메뉴 · 첫 화면 섹션 · 학습 페이지를 고친 뒤 한 번 게시하면 같은 주소에 반영됩니다.</p></div>
      <div class="sgm-br"><label class="fl sgm-hsel">첫 화면 구성<select data-chg="sm-home" aria-label="첫 화면 구성">${HOME_OPTS.map(([k, l]) => `<option value="${k}" ${C.home === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">사이트 열기</a><button class="btn pri" data-act="ls-pub">${ic('check', 16)} ${isPub() ? '다시 게시' : '게시하기'}</button></div></div>`
      + tabs('smT', [['home', '홈페이지 · 메뉴 · 디자인'], ['learn', '학습 페이지 · 콘텐츠']], tab) + `<div class="sgm-in sgm-${tab}">${inner}</div>`;
  }
  VIEWS.site = () => smView(UI.smT === 'learn' ? 'learn' : 'home');
  VIEWS.lsite = () => { UI.smT = 'learn'; return smView('learn'); };
})();
