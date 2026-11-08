/* v34.5 hpmob — 휴대폰 전용 배치(디자이너 M1, fix6/BRIEF3.md)
   - 계열 12종(D1: editorial · bento · fullbleed · splitscreen · typo · portal / D2: story · mosaic · sidebar · bulletin · collage · noir)과
     계열 없는 기본형을 휴대폰 390 · 360에서 다듬는다. 다른 디자이너 파일은 고치지 않고, 여기서 만든 휴대폰 CSS를 사이트 CSS 맨 뒤에 덧붙여 덮어쓴다.
   - 기준(벤치마크 RULES_P · B2 · B3): 첫 화면 사진 약 42% 이상 · 제목 32~42px · 터치 44px 이상 · 강좌 카드 가로 넘김(카드 폭 80%) · 섹션 여백 64~88px · 가로 넘침 0
   - 행동 줄(통합 결정 11:40 · 12:00, L1과 합의): 홈페이지 미리보기(셸 없음)에서만 하단에 고정한다.
       <nav class="hpm-act">는 </body> 바로 앞(main.s2pg · footer.gf 바깥)에 넣으므로 게시본(smHp가 main#p-home · footer.gf만 자름)에는 들어가지 않는다.
       게시본은 L1의 #lhsAct(.lhs-act)가 셸 하단 탭 위에 같은 문구 · 높이로 붙는다. 하단 여백도 미리보기 문서(body.hpm-pv)에만 준다.
       바로 고치기(HPE) 화면에서는 넣지 않는다. 휴대폰 폭(≤640px)에서만 보인다.
   - 노출: window.HPMOB = { css(site), bar(site), acts } */
(() => {
  if (typeof siteHTML !== 'function') return;
  const ACTS = { adult: ['상담', '수강신청'], k12: ['상담', '수강신청'], voc: ['상담', '수강신청'], univ: ['문의', '프로그램 신청'], public: ['문의', '교육 신청'], lifelong: ['문의', '강좌 신청'], corp: ['문의', '교육 신청'] };
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const rgb = h => [1, 3, 5].map(i => parseInt(String(h).slice(i, i + 2), 16) || 0);
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const typeKey = () => { try { return (S && S.org && S.org.type) || 'adult'; } catch (e) { return 'adult'; } };
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const tokOf = s => { try { return window.HPT && HPT.tokens ? HPT.tokens(s) : null; } catch (e) { return null; } };
  const ICP = { phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', chat: 'M4 5h16v11H9l-5 4z' };
  const ic = k => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICP[k]}"/></svg>`;

  /* ── 행동 줄(미리보기 전용) ── */
  function colors(s) { const T = tokOf(s); let a = (T && T.a) || (ok6(s && s.color) ? s.color : '#4F46E5'); let on = (T && T.on) || (CR(a, '#ffffff') >= 4.5 ? '#ffffff' : '#111827');
    const bg = s && s.layout === 'noir' ? '#0E0E10' : (T && ok6(T.bg)) ? T.bg : '#ffffff'; const dark = Lm(bg) < .2; const ink = dark ? '#F3F4F6' : ((T && T.ink) || '#1F2937');
    if (dark && CR(a, bg) < 3) { a = '#ffffff'; on = '#111111'; } return { a, on, bg, dark, ink }; }
  function bar(s) { const A = ACTS[typeKey()] || ACTS.adult; const u = window.HPL && HPL.u; let tel = '';
    try { tel = String((S.settings.footer || {}).tel || '').trim(); if (!/\d{2,}/.test(tel) || /입력/.test(tel)) tel = ''; } catch (e) { }
    let ask = ''; let go = '';
    try { ask = u ? u.askHref(s) : ''; go = u ? u.clsHref(s) : ''; } catch (e) { }
    const h1 = tel ? 'tel:' + tel.replace(/[^\d+]/g, '') : (ask || '#p-home'); const h2 = go || '#p-home';
    return `<nav class="hpm-act" aria-label="빠른 신청"><a class="hpm-b2" href="${E(h1)}">${ic(tel ? 'phone' : 'chat')}<span>${E(A[0])}</span></a><a class="hpm-b1" href="${E(h2)}">${E(A[1])}</a></nav>`; }
  function barCSS(s) { const C = colors(s);
    return `.hpm-act{display:none}
@media(max-width:640px){body.hpm-pv{padding-bottom:calc(72px + env(safe-area-inset-bottom))}
.hpm-act{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;align-items:center;gap:8px;padding:8px 16px calc(8px + env(safe-area-inset-bottom));min-height:56px;box-sizing:border-box;background:${C.dark ? al(C.bg, .94) : 'rgba(255,255,255,.96)'};-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px);border-top:1px solid ${C.dark ? 'rgba(255,255,255,.12)' : 'rgba(17,24,39,.08)'};font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
.hpm-act a{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:var(--br,10px);font-size:15px;font-weight:700;letter-spacing:-.01em;text-decoration:none;white-space:nowrap;box-sizing:border-box}
.hpm-act .hpm-b2{flex:1 1 0;padding:0 12px;border:1.5px solid ${C.dark ? 'rgba(255,255,255,.28)' : 'rgba(17,24,39,.16)'};background:transparent;color:${C.ink}}
.hpm-act .hpm-b1{flex:1.5 1 0;padding:0 14px;background:${C.a};color:${C.on};border:0}
.hpm-act a:focus-visible{outline:3px solid ${C.dark ? '#ffffff' : C.a};outline-offset:2px}
body.hpm-pv .s2chat{bottom:calc(84px + env(safe-area-inset-bottom))!important}}`; }

  /* ── 휴대폰 배치 CSS(계열 공통 + 계열별) ── */
  function css(s) { return MOB.common(s) + MOB.base(s) + (s && s.layout && MOB.fam[s.layout] ? MOB.fam[s.layout](s) : ''); }
  const MOB = { fam: {} };
  /* 공통: 터치 44px · 가로 넘침 0 · 긴 낱말 줄바꿈 · 바닥글 링크 칸 */
  MOB.common = s => `@media(max-width:640px){
.hpt h1,.hpt h2,.hpt h3{overflow-wrap:break-word;word-break:keep-all}
header.gh .logo{min-height:44px;display:inline-flex;align-items:center}
.hp-all,.ed-link,.sp-link,.ty-link,.bt-link,.fb-link,.pt-link,a[class$="-all"],a[class$="-more"],a.hpl-bu-tm{min-height:44px;display:inline-flex!important;align-items:center}
footer.gf .fl2{display:flex;flex-wrap:wrap;gap:0 18px}footer.gf .fl2 a,footer.gf .fl2>span,footer.gf a.s2esc,footer.gf .hps-lg a,footer.gf li>a{min-height:44px;min-width:44px;display:inline-flex;align-items:center}footer.gf .hps-lg{display:flex;flex-wrap:wrap;gap:0 18px}footer.gf li:has(>a){margin:0!important}footer.gf .hps-fc ul{row-gap:0!important}
.hpt .hp-btn,.hpt .hpl-btn{min-height:48px}
${editing() ? '' : '.hpl-img:not(:has(img,svg,picture,video)),.hpl-k-cta .hpl-art{display:none!important}'}
}`;
  /* 계열 없는 기본형(hpth 렌더러) */
  MOB.base = s => `@media(max-width:640px){
.hp-s{padding:72px 0}.hp-cls .hp-shr{align-items:flex-end}
${rail('.hp-cls .hp-cg:not(.g1)', '.hp-cc')}
}`;

  /* 강좌 카드 가로 넘김(카드 폭 80%, 다음 카드 20% 보이기) — 목록 컨테이너 선택자를 받아 만든다 */
  const rail = (box0, item, o) => { o = o || {}; const box = box0.split(',').map(b => `${b.trim()}:has(>${item}+${item})`).join(','); return `${box}{display:flex!important;grid-template-columns:none!important;flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;gap:${o.gap || 12}px!important;margin-left:-${o.m || 20}px!important;margin-right:-${o.m || 20}px!important;padding:2px ${o.m || 20}px 12px!important;scroll-padding:0 ${o.m || 20}px;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
${box.split(',').map(b => b + '::-webkit-scrollbar').join(',')}{display:none}${box.split(',').map(b => b + '>' + item).join(',')}{flex:0 0 ${o.w || '80%'}!important;max-width:${o.max || 340}px;min-width:0;scroll-snap-align:start;grid-column:auto!important;grid-row:auto!important;margin:0!important}`; };
  MOB.rail = rail;

  /* ── 계열 A(D1) ── */
  MOB.fam.editorial = s => `@media(max-width:640px){
.hpl-editorial.ed-hero{padding-top:16px}.hpl-editorial .ed-top{padding:28px 0 24px;gap:20px}.hpl-editorial .ed-sub{padding-top:16px}.hpl-editorial .ed-act{margin-top:20px}
.hpl-editorial .ed-fig{aspect-ratio:1/1}.hpl-editorial .ed-fl{padding-top:28px}
.hpl-editorial .ed-abf{aspect-ratio:4/3}.hpl-editorial .ed-lead .hpl-img{aspect-ratio:4/3}.hpl-editorial .ed-cf{aspect-ratio:16/10}
.hpl-editorial .ed-list a{min-height:76px}
}`;
  MOB.fam.bento = s => `@media(max-width:640px){
.hpl-bento .bt-pic{order:-1;aspect-ratio:4/3;min-height:0!important}
.hpl-bento.bt-cls .bt-g{align-items:stretch}${rail('.hpl-bento.bt-cls .bt-g', '.bt-cc')}
.hpl-bento.bt-cls .bt-cc.big{min-height:360px}
}`;
  MOB.fam.fullbleed = s => `@media(max-width:640px){
.hpl-fullbleed .fb-rail>.fb-card{max-width:320px}.hpl-fullbleed.fb-cta{padding:80px 0}
}`;
  MOB.fam.typo = s => `@media(max-width:640px){
.hpl-typo .ty-h1{font-size:clamp(34px,10.6vw,42px)!important;line-height:1.1}
.hpl-typo .ty-huge{font-size:clamp(32px,9.6vw,40px)}
.hpl-typo .ty-list a{min-height:76px}
}`;
  MOB.fam.splitscreen = s => `@media(max-width:640px){
.hpl-splitscreen .sp-fig{aspect-ratio:1/1!important}
}`;
  MOB.fam.portal = s => `@media(max-width:640px){
.hpl-portal.pt-hero h1{font-size:clamp(32px,8.8vw,36px)!important;line-height:1.22}
.hpl-portal .pt-pop a{min-height:44px;display:inline-flex;align-items:center}.hpl-portal a.pt-more{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center}
}`;

  /* ── 계열 B(D2) ── */
  MOB.fam.story = s => `@media(max-width:640px){
.hpl-story.hpl-hero{padding-top:20px}.hpl-story .hpl-st-hg{gap:28px}.hpl-story .hpl-st-hg>div:last-child{order:-1}.hpl-story .hpl-st-fig{aspect-ratio:4/3}
}`;
  MOB.fam.sidebar = s => `@media(max-width:640px){
.hpl-sidebar a.hpl-sb-org{min-height:44px;display:inline-flex;align-items:center}.hpl-sidebar nav a,.hpl-sidebar .hpl-sb-nav a{min-height:44px}
.hpl-sidebar h1{font-size:clamp(32px,8.8vw,36px)!important}
.hpl-sidebar .hpl-sd-main{display:flex;flex-direction:column}.hpl-sidebar .hpl-sd-main>figure[data-slot=hero]{order:-1}
}`;
  MOB.fam.bulletin = s => `@media(max-width:640px){
.hpl-bulletin.hpl-s:not(.hpl-hero):not(.hpl-empty),.hpl-bulletin.hp-s:not(.hp-hero){padding-top:64px;padding-bottom:64px}.hpl-bulletin h1{font-size:clamp(32px,8.6vw,34px)!important;line-height:1.25}
.hpl-bulletin .hpl-bu-find{min-width:0;max-width:100%;gap:8px;padding-left:12px}.hpl-bulletin .hpl-bu-find span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14.5px;line-height:1.35}.hpl-bulletin .hpl-bu-find b{min-height:44px;display:inline-flex;align-items:center;padding:0 12px;font-size:14.5px}
}`;
  MOB.fam.mosaic = s => `@media(max-width:640px){
${rail('.hpl-mosaic .hpl-mo-cg:not(.n1)', '.hpl-mo-c')}
}`;
  MOB.fam.collage = s => `@media(max-width:640px){
.hpl-collage.hpl-hero{padding-top:28px}
${rail('.hpl-collage .hpl-co-cg', '.hpl-co-c', { gap: 16 })}.hpl-collage .hpl-co-cg:has(>.hpl-co-c+.hpl-co-c){padding-top:16px!important;padding-bottom:20px!important}
}`;
  MOB.fam.noir = s => `@media(max-width:640px){
.hpl-noir.hpl-s:not(.hpl-hero),.hpl-noir.hp-s:not(.hp-hero){padding-top:80px;padding-bottom:80px}.hpl-noir .hpl-no-bg{aspect-ratio:1/1!important}.hpl-noir .hpl-no-bg::after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.5) 62%,rgba(0,0,0,.82) 100%);pointer-events:none}.hpl-noir .hpl-no-hg{margin-top:-140px}
}`;

  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { if (!h || !h.includes('</style>')) return h; let out = h.replace('</style>', `/* hpmob */${css(s)}${barCSS(s)}</style>`);
      if (!editing() && /<\/body>/.test(out) && /<main class="s2pg"/.test(out)) { out = out.replace(/<body class="([^"]*)"/, '<body class="$1 hpm-pv"'); const i = out.lastIndexOf('</body>'); out = out.slice(0, i) + bar(s) + out.slice(i); }
      return out; } catch (e) { console.error('hpmob', e); return h; } }; window.siteHTML = siteHTML; }
  window.HPMOB = { css, bar, acts: ACTS, MOB };
})();
