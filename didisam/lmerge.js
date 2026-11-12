/* v23 — 하나의 공개 사이트(learner.html = 홈페이지 + 학습 사이트)
   게시본 LR.site.hp(sitemerge.js smHp): 홈페이지 메뉴 · 첫 화면 섹션 · 메뉴별 페이지 · 푸터 · 로고 · 챗봇 · SEO
   - 헤더: 홈페이지 메뉴(하위 메뉴 포함) 다음에 학습 페이지(진단 · 튜토리얼 · 커뮤니티 …)
   - #home: 홈페이지 첫 화면(구성 hp.mode) · #hp/<page key>: 홈페이지 메뉴 페이지 · 푸터: 홈페이지 푸터
   - 홈페이지 HTML은 Shadow DOM에 넣어 학습자 화면 스타일과 섞이지 않게 한다(스크립트는 CSP로 실행되지 않음). */
'use strict';
(() => {
  const HP = () => { const s = SITE(); return (s && s.hp && s.hp.css != null) ? s.hp : null; };
  const mySid = () => (LR.me ? String(LR.me.sid || '') : '');
  const can = it => !!it && it.access !== '비공개' && (it.access !== '지정 회원' || (!!LR.me && (it.allow || []).includes(mySid())));
  const inNav = it => it.access !== '비공개' && !(it.access === '지정 회원' && it.hide && !can(it));
  const hashNow = () => '#' + decodeURIComponent(location.hash.slice(1) || 'home');
  const ext = h => /^https?:\/\//.test(h);
  const aTag = (href, label, on, extra = '') => `<a href="${esc(href)}" class="${on ? 'on' : ''}"${ext(href) ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}${extra}</a>`;

  /* 헤더 메뉴 합치기: 홈페이지 메뉴 → 나머지 학습 메뉴(중복 주소는 한 번만) */
  function navMerge(h, cur, H) {
    const a = h.indexOf('<nav class="ln"'); if (a < 0) return h; const o = h.indexOf('>', a) + 1; const b = h.indexOf('</nav>', o); if (b < 0) return h;
    const old = [...h.slice(o, b).matchAll(/<a\b[^>]*?href="([^"]*)"[^>]*>[\s\S]*?<\/a>/g)].map(m => ({ href: m[1].replace(/&amp;/g, '&'), html: m[0], on: /class="[^"]*\bon\b/.test(m[0]) }));
    const now = hashNow();
    const isOn = href => { const x = old.find(l => l.href === href); if (x && x.on) return true; if (href === '#home') return cur === 'home'; return href.startsWith('#hp/') && (now === href || now.startsWith(href + '/')); };
    const used = new Set(); const out = [];
    (H.menus || []).forEach(m => { if (!inNav(m)) return; used.add(m.href); const subs = (m.subs || []).filter(inNav); subs.forEach(sb => used.add(sb.href));
      const lock = m.access === '지정 회원' && !can(m) ? '<i class="smlk">회원</i>' : '';
      const top = aTag(m.href, m.l, isOn(m.href) || subs.some(sb => isOn(sb.href)), lock + (subs.length ? '<i class="smcar" aria-hidden="true">▾</i>' : ''));
      out.push(subs.length ? `<span class="smmi">${top}<span class="smdd">${subs.map(sb => aTag(sb.href, sb.l, isOn(sb.href), sb.access === '지정 회원' && !can(sb) ? '<i class="smlk">회원</i>' : '')).join('')}</span></span>` : top); });
    old.forEach(l => { if (!used.has(l.href)) { used.add(l.href); out.push(l.html); } });
    return h.slice(0, o) + out.join('') + h.slice(b);
  }
  function chatHTML(H) { const c = H.chat; if (!c) return '';
    const pos = c.pos === 'left' ? ' l' : '';
    if (c.type === 'kakao' && c.kakaoUrl) return `<a class="smchat k${pos}" href="${esc(c.kakaoUrl)}" target="_blank" rel="noopener" aria-label="카카오톡 채널 상담"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 6l-1 3.6 4.1-2.7c.6.1 1.1.1 1.7.1 5 0 9-3.1 9-7S17 4 12 4z" fill="currentColor"/></svg><span>${esc(c.label)}</span></a>`;
    if (c.type === 'channeltalk' && c.ctKey) return `<button type="button" class="smchat c${pos}" data-smchat="ct" aria-label="채널톡 상담"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="currentColor"/></svg><span>${esc(c.label)}</span></button>`;
    return ''; }
  { const base = shell; shell = (inner, cur, ...a) => { let h = base(inner, cur, ...a); const H = HP(); if (!H) return h;
    try {
      h = navMerge(h, cur, H);
      if (H.logo) h = h.replace(/<span class="lg">[\s\S]*?<\/span><span class="bn">/, `<img class="smlogo" src="${esc(H.logo)}" alt=""><span class="bn">`);
      h = h.replace(/(<span class="bn"><b>[^<]*<\/b>)<small>[^<]*<\/small>/, '$1');
      if (H.gnbBg) h = h.replace('<header class="lh"', `<header class="lh smgh${H.gnbDark ? ' smdk' : ''}" style="--smbg:${esc(H.gnbBg)}"`);
      const note = (h.match(/<footer class="lf">[\s\S]*?<small>(학습자 정보는[^<]*)<\/small>/) || [])[1] || '';
      if (H.foot) h = h.replace(/<footer class="lf">[\s\S]*?<\/footer>/, `<footer class="lf smf"><div class="smhost" data-smk="foot"></div>${note ? `<p class="smpriv">${esc(note)}</p>` : ''}</footer>`);
      h += chatHTML(H);
    } catch (e) { console.error('lmerge shell', e); }
    return h; }; }

  /* 첫 화면: 홈페이지 섹션(+ 구성에 따라 학습 섹션) */
  { const base = viewPage; viewPage = (id, ...a) => { const H = HP(); const p = pageOf(id); if (!H || !H.home || (id !== 'home' && p) || H.mode === 'learn') return base(id, ...a);
    const hp = pageOf('home'); const secs = hp && !(hp.access === '로그인' && !LR.me) ? hp.sections : [];
    const R = (s) => { try { return (SECR[s.type] || (() => ''))(s.data || {}); } catch (e) { console.error(e); return ''; } };
    let out = '<div class="smhost smhome" data-smk="home"></div>';
    if (H.mode === 'mix' && LR.me) { const pr = secs.find(s => s.type === 'progress'); if (pr) out = R(pr) + out; }
    if (H.mode === 'both') out += secs.filter(s => s.type !== 'hero').map(R).join('');
    return out; }; }

  /* #hp/<key>: 홈페이지 메뉴 페이지 */
  function viewHp(key) { const H = HP(); const pg = H.pages[key];
    if (!pg) return '<section class="sec"><div class="in narrow"><p class="empty">페이지를 찾지 못했습니다.</p><a class="lbtn pri" href="#home">홈으로</a></div></section>';
    if (!can(pg)) { if (pg.access === '지정 회원' && !LR.me) return needLogin('hp/' + key);
      return `<section class="sec"><div class="in narrow"><div class="gate">${ico('lock', 28)}<h2>접근 권한이 없습니다</h2><p class="lead">${pg.access === '비공개' ? '비공개 페이지입니다.' : '지정된 회원만 볼 수 있는 페이지입니다.'}</p><a class="lbtn pri" href="#home">홈으로</a></div></div></section>`; }
    return `<div class="smhost" data-smk="${esc(key)}"></div>`; }
  { const base = lrender; lrender = (...a) => { const H = HP(); const r = route();
    if (H && r.a === 'hp') {
      try { if (typeof PLAYER !== 'undefined' && PLAYER && PLAYER.stop) PLAYER.stop(); } catch (e) { } if (typeof bkStop === 'function') bkStop();
      const key = decodeURIComponent(location.hash.slice(1)).split('/')[1] || '';
      document.body.className = 'look-' + (SITE().look || 'clean') + (LR.mode === 'preview' ? ' pv' : '');
      $('#lapp').innerHTML = shell(viewHp(key), 'hp'); window.scrollTo(0, 0);
    } else base(...a);
    try { seo(); mount(); } catch (e) { console.error('lmerge', e); } }; }

  /* Shadow DOM에 홈페이지 HTML 넣기 */
  function mount(root) { const H = HP(); if (!H) return; (root || document).querySelectorAll('.smhost:not([data-ok])').forEach(el => { el.dataset.ok = '1'; const k = el.dataset.smk;
    const html = k === 'home' ? H.home : k === 'foot' ? H.foot : ((H.pages[k] || {}).html || '');
    const sr = el.shadowRoot || el.attachShadow({ mode: 'open' }); sr.innerHTML = `<style>${safeCSS(H.css)}.smr{background:transparent;min-height:0}.hpl-bu-top>div,.pt-2>*{min-width:0}@media(max-width:900px){.hpl-bu-top,.pt-2{grid-template-columns:minmax(0,1fr)!important}.hpl-bu-find b{white-space:normal;text-align:center;line-height:1.3}.hpl-bulletin h1{overflow-wrap:anywhere;word-break:keep-all}}</style><div class="smr lk-${esc(H.look || 'campus')}">${safeHTML(html, { data: true, code: true })}</div>`; /* v25 게시본도 다시 정화(서버 API로 직접 넣은 HTML 대비) */ }); try { const fm = String(H.foot || '').match(/href="tel:([+\d\-\s()]{6,20})"/) || String(H.foot || '').match(/(0\d{1,2}-\d{3,4}-\d{4}|1[5-8]\d{2}-\d{4})/); if (fm) sr.querySelectorAll('a').forEach(a => { if (/전화로 (신청|문의)|전화 (상담|신청)/.test(a.textContent)) a.setAttribute('href', 'tel:' + fm[1].replace(/[^\d+]/g, '')); }); } catch (e) { } /* v38 F5 L: '전화로 신청하기'는 바닥글 대표번호로 전화를 건다(#shop으로 가지 않음) */
    /* v34.5 G1 웹폰트: Shadow DOM 안의 @font-face는 브라우저가 무시하므로 문서 머리에 한 번 올린다(같은 출처 fonts/만) */
    try { const ff = (safeCSS(H.css).match(/@font-face\{[^}]*url\('fonts\/[\w.-]+\.woff2'\)[^}]*\}/g) || []).join(''); let st = document.getElementById('hp-ff'); if (ff && (!st || st.textContent !== ff)) { if (!st) { st = document.createElement('style'); st.id = 'hp-ff'; document.head.appendChild(st); } st.textContent = ff; } } catch (e) { }
    /* v34.5 F2 분할 웹폰트: 표식 --hpf(글꼴 CSS) · --hpf-pre(첫 화면 제목 조각)를 문서 머리 link로(같은 출처 fonts/ · jsdelivr만) */
    try { const C = safeCSS(H.css); const g = n => ((C.match(new RegExp(`--${n}:"([^"]*)"`)) || [])[1] || '').split('|').filter(u => /^(fonts\/[\w-]+\/[\w.-]+(\?[vh]=\w+)?|https:\/\/cdn\.jsdelivr\.net\/[\w@./-]+)$/.test(u));
      [...g('hpf').map(u => ['stylesheet', u]), ...g('hpf-pre').map(u => ['preload', u])].forEach(([r, u]) => { if (document.querySelector(`link[data-hpf="${u}"]`)) return; const l = document.createElement('link'); l.rel = r; l.href = u; l.dataset.hpf = u; if (r === 'preload') { l.as = 'font'; l.type = 'font/woff2'; l.crossOrigin = 'anonymous'; } document.head.appendChild(l); }); } catch (e) { } }
  window.lmMount = mount;
  { let q = 0; new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; try { mount(); } catch (e) { } }); }).observe(document.getElementById('lapp') || document.body, { childList: true, subtree: true }); }

  /* SEO: 제목 · 설명 · 키워드 · 파비콘 · 색인 */
  const meta = (name, v) => { let m = document.querySelector(`meta[name="${name}"]`); if (!v && !m) return; if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); } m.content = v || ''; };
  function seo() { const H = HP(); if (!H) return; const r = route(); const S0 = H.seo || {};
    let title = '', desc = S0.desc, kw = S0.kw;
    if (/^#?(home)?$/.test(location.hash)) title = S0.title || H.name;
    else if (r.a === 'hp') { const pg = H.pages[decodeURIComponent(location.hash.slice(1)).split('/')[1] || '']; if (pg) { title = `${(pg.seo && pg.seo.title) || pg.name} · ${H.name}`; desc = (pg.seo && pg.seo.desc) || desc; kw = (pg.seo && pg.seo.kw) || kw; } }
    if (title) document.title = title; meta('description', desc); meta('keywords', kw);
    /* v37 P4: 링크 공유 미리보기(og) — 제목 · 설명 · 공유 이미지 */
    const og = (p2, v) => { let m = document.querySelector(`meta[property="${p2}"]`); if (!v && !m) return; if (!m) { m = document.createElement('meta'); m.setAttribute('property', p2); document.head.appendChild(m); } m.content = v || ''; };
    og('og:title', title || document.title); og('og:description', desc); og('og:image', /^data:image\/|^https:\/\//.test(S0.img || '') && !/^data:/.test(S0.img) ? S0.img : '');
    if (LR.mode === 'live' && S0.index !== false) meta('robots', 'index,follow');
    if (H.favicon) { const l = document.querySelector('link[rel="icon"]'); if (l && l.getAttribute('href') !== H.favicon) l.setAttribute('href', H.favicon); } }

  /* 채널톡: 운영 주소에서만 SDK 연결, 데모 · 미리보기는 안내 */
  let ctOn = false;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-smchat]'); if (!b) return; const H = HP(); const c = H && H.chat; if (!c) return;
    if (LR.mode !== 'live') { toast('채널톡 상담 창이 열립니다(데모) — 운영 주소에서는 등록한 채널톡 플러그인 키로 연결됩니다.', 'ok'); return; }
    /* 운영: 채널톡 웹 SDK(https://cdn.channel.io/plugin/ch-plugin-web.js) — CSP에 channel.io 허용 */
    if (window.ChannelIO && ctOn) { try { window.ChannelIO('showMessenger'); } catch (x) { } return; }
    const w = window; const ch = function () { ch.c(arguments); }; ch.q = []; ch.c = a => ch.q.push(a); if (!w.ChannelIO) w.ChannelIO = ch;
    const s = document.createElement('script'); s.async = true; s.src = 'https://cdn.channel.io/plugin/ch-plugin-web.js'; s.onload = () => { try { w.ChannelIO('boot', { pluginKey: c.ctKey }); w.ChannelIO('showMessenger'); ctOn = true; } catch (x) { } }; s.onerror = () => toast('상담 창을 불러오지 못했습니다. 잠시 후 다시 시도하세요.', 'bad'); document.head.appendChild(s); });
})();
