/* v34.5 hpdir — 아트 디렉션 토큰(디자이너 G1) · 테마 8종(HPT)의 타이포 단계 · 여백 리듬 · 모서리 · 그림자 · 버튼 · 링크 · 호버를 덮어쓴다
   대표님(2026-11-08): "잘 만들어진 사이트 벤치마크를 강화해서 디자인을 대폭 올려."
   근거: fix6/bench2 실측(국내외 교육 사이트) — 제목 40~77px · 본문 15~17px / 1.6~1.75 · 섹션 여백 120~160px · 카드 모서리 6~16px(테두리 위주, 그림자는 드묾) · 버튼 48~60px.
   방식: hpth의 테마 값(TH)은 const라 바꾸지 않고, siteHTML이 만든 <style>에 테마별 토큰 CSS를 덧붙인다(같은 선택자 · 뒤에 오므로 우선).
         레이아웃 계열(HPL)은 이 토큰(CSS 변수)을 상속하고, 자기 CSS가 뒤에 붙으므로 계열이 우선한다.
   웹폰트: didisam/fonts/의 OFL 한글 글꼴(KS X 1001 2,350자 서브셋 woff2). 그 글꼴을 실제로 쓰는 사이트에만 @font-face를 넣는다(font-display: swap).
   토큰 문서: docs/design-tokens.md · 글꼴 출처: docs/fonts-credits.md
   인터페이스: window.HPD = { tok(themeId), css(site), faces(keys), need(site), FONTS, scale } */
'use strict';
(() => {
  /* ── 웹폰트(저장소 안 · 같은 출처) ── */
  const FONTS = {
    /* v34.5 F2: serif(Noto Serif KR) · round(Gowun Dodum)는 한글 전체 분할본(fonts/<id>/font.css, hpfontpick.js의 HPF)으로 옮김 — 여기는 legacy만 */
    hand: { fam: 'Gaegu', files: [['Gaegu-400.woff2', '100 500'], ['Gaegu-700.woff2', '600 900']] },
    display: { fam: 'Black Han Sans', files: [['BlackHanSans-400.woff2', '100 900']] }
  };
  const FB = { sans: "Pretendard,'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", serif: "'Noto Serif KR','Noto Serif CJK KR','Nanum Myeongjo','AppleMyungjo','Batang',serif", round: "'Gowun Dodum','NanumSquareRound',ui-rounded,'Apple SD Gothic Neo','Malgun Gothic',sans-serif", hand: "'Gaegu','Nanum Pen Script',cursive", display: "'Black Han Sans','Do Hyeon',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif" };
  const faces = keys => [...new Set(keys)].filter(k => FONTS[k]).map(k => FONTS[k].files.map(([f, w]) => `@font-face{font-family:'${FONTS[k].fam}';src:url('fonts/${f}') format('woff2');font-weight:${w};font-style:normal;font-display:swap}`).join('')).join('');

  /* ── 테마 8종 토큰 ──
     hf 제목 글꼴 · hw 제목 굵기 · hls 제목 자간(em) · h1/h2/h3 PC 크기(px) · h1m/h2m 휴대폰 · lh1 첫 화면 줄간 · body 본문 · blh 본문 줄간 · lead 소개글
     ey 영문 라벨 {fs, ls(em), fw, tt} · sec 섹션 위아래(PC) · secm(휴대폰) · w 최대 폭 · gut 좌우 여백
     r 카드 모서리 · rs 작은 칸 모서리 · br 버튼 모서리 · bh 버튼 높이 · bpx 버튼 좌우 · bfw 버튼 굵기 · bls 버튼 자간
     bd 카드 테두리 · sh 카드 그림자(평소) · shh 호버 그림자 · hov 호버 방식(lift | line | press | border) · em 첫 화면 마지막 줄 강조(accent | plain | mark) · link 본문 링크(underline | hover) */
  const D = {
    clean: { hf: 'sans', hw: 800, hls: -0.04, h1: 64, h1m: 36, lh1: 1.12, h2: 44, h2m: 28, h3: 20, body: 16.5, blh: 1.7, lead: 19, ey: { fs: 13, ls: 0.08, fw: 700, tt: 'uppercase' }, sec: 128, secm: 72, w: 1200, gut: 40,
      r: 16, rs: 10, br: 12, bh: 52, bpx: 24, bfw: 700, bls: -0.01, bd: '1px solid rgba(17,24,39,.08)', sh: '0 1px 2px rgba(16,24,40,.04)', shh: '0 18px 36px -18px rgba(16,24,40,.28)', hov: 'lift', em: 'accent', link: 'hover' },
    premium: { hf: 'serif', hw: 600, hls: -0.02, h1: 60, h1m: 34, lh1: 1.22, h2: 42, h2m: 28, h3: 20, body: 16.5, blh: 1.75, lead: 18.5, ey: { fs: 12, ls: 0.22, fw: 600, tt: 'uppercase' }, sec: 144, secm: 80, w: 1160, gut: 40,
      r: 2, rs: 2, br: 0, bh: 54, bpx: 30, bfw: 600, bls: 0.04, bd: '1px solid rgba(20,22,31,.12)', sh: 'none', shh: 'none', hov: 'line', em: 'plain', link: 'underline' },
    warm: { hf: 'round', hw: 400, hls: -0.01, h1: 58, h1m: 34, lh1: 1.24, h2: 40, h2m: 28, h3: 20, body: 16.5, blh: 1.75, lead: 18.5, ey: { fs: 14, ls: 0.02, fw: 700, tt: 'none' }, sec: 120, secm: 72, w: 1180, gut: 40,
      r: 22, rs: 14, br: 999, bh: 54, bpx: 28, bfw: 700, bls: 0, bd: '1px solid rgba(43,29,20,.08)', sh: '0 1px 0 rgba(43,29,20,.05)', shh: '0 20px 36px -22px rgba(140,70,20,.38)', hov: 'lift', em: 'accent', link: 'hover' },
    official: { hf: 'sans', hw: 700, hls: -0.025, h1: 48, h1m: 30, lh1: 1.28, h2: 34, h2m: 25, h3: 19, body: 16, blh: 1.7, lead: 18, ey: { fs: 14, ls: 0, fw: 700, tt: 'none' }, sec: 96, secm: 64, w: 1200, gut: 40,
      r: 4, rs: 4, br: 4, bh: 48, bpx: 22, bfw: 700, bls: 0, bd: '1px solid #D5DAE2', sh: 'none', shh: 'none', hov: 'border', em: 'plain', link: 'underline' },
    tech: { hf: 'sans', hw: 800, hls: -0.045, h1: 66, h1m: 36, lh1: 1.08, h2: 44, h2m: 28, h3: 19, body: 16, blh: 1.7, lead: 18.5, ey: { fs: 13, ls: 0.12, fw: 700, tt: 'uppercase' }, sec: 136, secm: 76, w: 1200, gut: 40,
      r: 12, rs: 8, br: 10, bh: 50, bpx: 22, bfw: 700, bls: -0.01, bd: '1px solid rgba(11,18,32,.10)', sh: 'none', shh: '0 0 0 1px var(--a),0 16px 32px -20px rgba(8,145,178,.45)', hov: 'border', em: 'accent', link: 'hover' },
    kids: { hf: 'display', hw: 400, hls: -0.01, h1: 60, h1m: 36, lh1: 1.2, h2: 42, h2m: 30, h3: 20, body: 17, blh: 1.7, lead: 19, ey: { fs: 15, ls: 0, fw: 800, tt: 'none' }, sec: 112, secm: 68, w: 1160, gut: 40,
      r: 28, rs: 18, br: 999, bh: 58, bpx: 30, bfw: 800, bls: 0, bd: '2px solid rgba(30,21,51,.08)', sh: '0 6px 0 rgba(30,21,51,.08)', shh: '0 10px 0 rgba(30,21,51,.12)', hov: 'press', em: 'mark', link: 'hover' },
    campus: { hf: 'serif', hw: 600, hls: -0.02, h1: 56, h1m: 32, lh1: 1.24, h2: 40, h2m: 27, h3: 19, body: 16.5, blh: 1.75, lead: 18.5, ey: { fs: 13, ls: 0.16, fw: 600, tt: 'uppercase' }, sec: 128, secm: 72, w: 1200, gut: 40,
      r: 6, rs: 4, br: 4, bh: 50, bpx: 24, bfw: 700, bls: 0, bd: '1px solid rgba(24,32,27,.14)', sh: 'none', shh: 'none', hov: 'line', em: 'plain', link: 'underline' },
    senior: { hf: 'sans', hw: 700, hls: -0.02, h1: 52, h1m: 32, lh1: 1.3, h2: 38, h2m: 28, h3: 22, body: 19, blh: 1.8, lead: 21, ey: { fs: 16, ls: 0, fw: 700, tt: 'none' }, sec: 104, secm: 72, w: 1160, gut: 40,
      r: 14, rs: 10, br: 14, bh: 62, bpx: 30, bfw: 700, bls: 0, bd: '2px solid #D5DBE7', sh: 'none', shh: 'none', hov: 'border', em: 'plain', link: 'underline' }
  };
  /* 공통 단계(모든 테마): 8pt 리듬 · 작은 글 · 라벨 */
  const scale = { sp: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128], sm: 14, xs: 13, ease: 'cubic-bezier(.2,.7,.2,1)', dur: '.18s' };
  const tokOf = id => D[id] || null;

  /* ── 색 도구(hpth와 같은 계산) ── */
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const rgb = h => [1, 3, 5].map(i => parseInt(String(h).slice(i, i + 2), 16) || 0);
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

  /* ── 토큰 CSS ── */
  function css(s) {
    if (!s || !s.theme || !D[s.theme] || typeof HPT === 'undefined' || !HPT.tokens) return '';
    const k = D[s.theme]; const T = HPT.tokens(s); if (!T || !ok6(T.a)) return '';
    const hf = FB[k.hf] || FB.sans; const ls = v => `${v}em`;
    const hov = mix(T.a, '#000000', .14); const ink = ok6(T.ink) ? T.ink : '#111827';
    const ring = CR(T.a, T.bg || '#ffffff') >= 3 ? T.a : mix(T.a, '#000000', .3);
    const head = `font-family:${hf};font-weight:${k.hw};letter-spacing:${ls(k.hls)}`;
    const ey = `font-size:${k.ey.fs}px;letter-spacing:${ls(k.ey.ls)};font-weight:${k.ey.fw};text-transform:${k.ey.tt}`;
    const hoverCard = k.hov === 'lift' ? `transform:translateY(-3px);box-shadow:${k.shh};border-color:rgba(17,24,39,.14)`
      : k.hov === 'press' ? `transform:translateY(-3px);box-shadow:${k.shh}`
      : k.hov === 'line' ? `border-color:${al(ink, .5)};transform:none;box-shadow:none`
      : `border-color:${T.a};transform:none;box-shadow:${k.shh === 'none' ? `0 0 0 1px ${T.a}` : k.shh}`;
    const em = k.em === 'plain' ? '.hp-hero h1 em{color:var(--hi);background:none}'
      : k.em === 'mark' ? `.hp-b-light h1 em{color:var(--hi);background:linear-gradient(transparent 64%,${al(T.a, .22)} 64%)}`
      : '.hp-b-light h1 em{background:none}';
    const sq = k.r <= 6; /* 각진 테마: 원형 장식 대신 선 */
    return `/* hpdir G1 · ${s.theme} */
.hpt{--hd-ff:${hf};--hd-fw:${k.hw};--hd-ls:${ls(k.hls)};--t-h1:${k.h1}px;--t-h2:${k.h2}px;--t-h3:${k.h3}px;--t-lead:${k.lead}px;--t-body:${k.body}px;--t-sm:${scale.sm}px;--t-xs:${scale.xs}px;--lh-body:${k.blh};--sec:${k.sec}px;--sec-m:${k.secm}px;--wmax:${k.w}px;--gut:${k.gut}px;--r:${k.r}px;--rs:${k.rs}px;--br:${k.br}px;--btn-h:${k.bh}px;--btn-px:${k.bpx}px;--bd:${k.bd};--sh:${k.sh};--sh-h:${k.shh};--ring:${ring};--ease:${scale.ease};--dur:${scale.dur};font-size:${k.body}px;line-height:${k.blh}}
.hpt .hp-w{max-width:${k.w}px;padding:0 ${k.gut}px}
.hpt.hp-s{padding:${k.sec}px 0}.hpt.hp-facts{padding:${Math.round(k.sec * .42)}px 0}.hpt.hp-cta{padding:${Math.round(k.sec * .25)}px 0 ${k.sec}px}.hpt.hp-empty{padding:28px 0}
.hpt .hp-sh{margin-bottom:${k.sec >= 120 ? 56 : 40}px;max-width:760px}
.hpt .hp-sh h2,.hpt .hp-prose h2,.hpt .hp-ctat h2{${head};font-size:clamp(${k.h2m}px,3.4vw,${k.h2}px);line-height:${k.hf === 'serif' ? 1.3 : 1.22}}
.hpt .hp-ey{${ey};margin-bottom:14px}
.hpt .hp-sd,.hpt .hp-lead{font-size:${k.lead}px;line-height:${k.blh};margin-top:16px;max-width:42em}
.hpt .hp-card h3,.hpt .hp-ccb h3,.hpt .hp-st h3,.hpt .hp-pc h3{font-size:${k.h3}px;letter-spacing:${ls(Math.max(k.hls, -0.025))};line-height:1.4;${k.hf === 'serif' ? `font-family:${hf};font-weight:600` : `font-weight:${Math.min(k.hw + (k.hw < 600 ? 0 : -50), 750)}`}}
.hpt .hp-card p,.hpt .hp-st p,.hpt .hp-qa details p,.hpt .hp-prose p{font-size:${Math.max(15, k.body - 1)}px;line-height:${k.blh}}
.hp-hero{padding:${Math.round(k.sec * .8)}px 0 ${Math.round(k.sec * .75)}px}.hp-l-c{padding:${Math.round(k.sec * .8)}px 0 ${Math.round(k.sec * .4)}px}
.hp-hero h1{${head};font-size:clamp(${k.h1m}px,5vw,${k.h1}px);line-height:${k.lh1}}${em}
.hp-hero .hp-hs{font-size:${k.lead}px;line-height:${k.blh};margin-top:24px;max-width:34em}.hp-hero .hp-hb{margin-top:40px;gap:12px}
.hp-hey{${ey};${k.ey.tt === 'uppercase' ? '' : 'letter-spacing:0;'}${sq ? 'background:none;padding:0;border-radius:0;box-shadow:none!important' : ''}}${sq ? `.hp-hey::before{content:'';width:28px;height:1px;background:currentColor;display:inline-block}` : ''}
.hp-blob,.hp-dots,.hp-glow,.hp-band-d{display:none}.hp-ctab::after{display:none}${s.theme === 'tech' ? '' : '.hp-grid{display:none}'}
.hpt .hp-btn{min-height:${k.bh}px;padding:0 ${k.bpx}px;border-radius:${k.br}px;font-weight:${k.bfw};letter-spacing:${ls(k.bls)};font-size:${k.body >= 18 ? 18 : 16}px;transition:background var(--dur) var(--ease),color var(--dur) var(--ease),box-shadow var(--dur) var(--ease),transform var(--dur) var(--ease)}
.hpt .hp-btn:hover{transform:none}.hpt .hp-btn.pri{box-shadow:none}.hpt .hp-btn.pri:hover{background:${hov}}
.hpt .hp-btn.gh:hover{box-shadow:inset 0 0 0 1.5px currentColor}.hpt .hp-btn svg{transition:transform var(--dur) var(--ease)}.hpt .hp-btn:hover svg{transform:translateX(3px)}
.hpt .hp-btn.inv:hover{background:${mix('#ffffff', T.a, .1)}}
.hpt a:focus-visible,.hpt summary:focus-visible,.hpt button:focus-visible{outline:3px solid var(--ring);outline-offset:3px;border-radius:${Math.min(k.br, 8)}px}
.hpt .hp-card,.hpt .hp-cc,.hpt .hp-qa details,.hpt .hp-dl div,.hpt .hp-tll li:not(.on){border-radius:${k.r}px;border:${k.bd};box-shadow:${k.sh};background:#fff}
.hpt .hp-card,.hpt .hp-cc{transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),border-color var(--dur) var(--ease)}
.hpt a.hp-card:hover,.hpt .hp-cc:hover{${hoverCard}}.hpt .hp-tll li.on{border-radius:${k.r}px;border:0}.hpt .hp-stars{color:#B45309}.hpt .hp-stars i{color:#6B7280}
.hpt .hp-card{padding:${k.r >= 20 ? 32 : 28}px ${k.r >= 20 ? 30 : 26}px;gap:10px}.hpt .hp-ic{border-radius:${k.rs}px}
.hpt .hp-g{gap:${k.r <= 6 ? 0 : 20}px}${k.r <= 6 ? `.hpt .hp-feat .hp-g>.hp-card,.hpt .hp-ppl .hp-g>.hp-card,.hpt .hp-rv .hp-g>.hp-card{border-radius:0;margin:0 -1px -1px 0}.hpt .hp-feat .hp-ic{background:none;width:auto;height:auto;justify-content:start;margin-bottom:12px}.hpt .hp-cg{gap:24px}` : ''}
.hpt .hp-cc .hp-cov{border-radius:0}.hpt .hp-cc .hp-ccb{padding:20px 22px 22px}.hpt .hp-cm span{border-radius:${Math.min(k.rs, 6)}px}
.hpt .hp-ctab{border-radius:${k.r >= 20 ? k.r + 8 : k.r}px}
.hpt .hp-fl b,.hpt .hp-nl time,.hpt .hp-tll time,.hpt .hp-cp b{font-variant-numeric:tabular-nums}.hpt .hp-fl b{${k.hf === 'serif' || k.hf === 'display' ? `font-family:${hf};font-weight:${k.hw};` : ''}letter-spacing:${ls(k.hls)}}
.hpt .hp-all,.hpt .hp-more{text-underline-offset:4px;text-decoration-thickness:1px}.hpt .hp-all:hover,.hpt .hp-cc:hover .hp-more{text-decoration:underline}
${k.link === 'underline' ? '.hpt .hp-prose a,.hpt .hp-sd a,.hpt .hp-card p a,.hpt .hp-ci.lt a{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}' : '.hpt .hp-prose a:hover,.hpt .hp-sd a:hover,.hpt .hp-ci.lt a:hover{text-decoration:underline;text-underline-offset:3px}'}
.hpt .hp-nl{border-top:${k.r <= 6 ? 2 : 1}px solid var(--ink)}.hpt .hp-nl li{transition:background var(--dur)}.hpt .hp-nl li:hover b{text-decoration:underline;text-underline-offset:3px}
.hpt .hp-qa summary{font-size:${Math.max(16, k.body)}px}.hpt .hp-qa summary i{border-radius:${k.rs}px}
${k.hf === 'serif' ? `.hpt .hp-st .hp-no{font-family:${hf};font-weight:600}.hpt .hp-rc blockquote{font-family:${hf};font-weight:400;font-size:${k.body + 1}px;line-height:1.8}` : ''}
${k.hf === 'round' ? '.hp-hero h1,.hpt .hp-sh h2,.hpt .hp-prose h2,.hpt .hp-ctat h2{-webkit-text-stroke:.6px currentColor;paint-order:stroke fill}' : ''}
${s.theme === 'premium' ? `.hpt .hp-ey{color:var(--at)}.hpt .hp-sh h2{font-weight:500}.hpt .hp-btn.gh{box-shadow:inset 0 0 0 1px currentColor}.hpt .hp-card,.hpt .hp-cc{background:transparent}.hpt.hp-alt .hp-card{background:#fff}` : ''}
${s.theme === 'kids' ? `.hpt .hp-btn.pri{box-shadow:0 4px 0 ${mix(T.a, '#000000', .35)}}.hpt .hp-btn.pri:hover{transform:translateY(-1px);box-shadow:0 5px 0 ${mix(T.a, '#000000', .35)}}.hpt .hp-btn.pri:active{transform:translateY(3px);box-shadow:0 1px 0 ${mix(T.a, '#000000', .35)}}.hpt .hp-card h3,.hpt .hp-ccb h3{font-family:${FB.sans};font-weight:800}` : ''}
${s.theme === 'senior' ? `.hpt .hp-card p,.hpt .hp-qa details p,.hpt .hp-prose p{font-size:18px}.hpt .hp-cm span,.hpt .hp-nl time,.hpt .hp-tr li{font-size:16px}.hpt a:focus-visible,.hpt summary:focus-visible{outline-width:4px}` : ''}
${s.theme === 'official' ? `.hpt .hp-sh{border-left:4px solid var(--a);padding-left:18px}.hpt .hp-split .hp-sh{border-left:0;padding-left:0}` : ''}
@media(max-width:1000px){.hpt.hp-s{padding:${Math.round((k.sec + k.secm) / 2)}px 0}}
@media(max-width:640px){.hpt .hp-w{padding:0 20px}.hpt.hp-s{padding:${k.secm}px 0}.hpt.hp-cta{padding:8px 0 ${k.secm}px}.hpt.hp-facts{padding:${Math.round(k.secm * .5)}px 0}.hpt .hp-sh{margin-bottom:32px}
.hp-hero,.hp-l-c{padding:${Math.round(k.secm * .75)}px 0 ${Math.round(k.secm * .7)}px}.hp-hero h1{font-size:${k.h1m}px;line-height:${Math.max(k.lh1, 1.2)}}.hp-hero .hp-hs{font-size:${Math.max(16, k.lead - 2)}px;margin-top:16px}.hp-hero .hp-hb{margin-top:28px}
.hpt .hp-sh h2,.hpt .hp-prose h2,.hpt .hp-ctat h2{font-size:${k.h2m}px}.hpt .hp-sd,.hpt .hp-lead{font-size:${Math.max(16, k.lead - 2)}px}.hpt .hp-card{padding:20px}.hpt .hp-g{gap:${k.r <= 6 ? 0 : 12}px}
.hpt .hp-btn{min-height:${Math.max(48, k.bh - 4)}px;padding:0 ${Math.min(k.bpx, 22)}px}}
@media(prefers-reduced-motion:reduce){.hpt *{transition:none!important}}`;
  }

  /* ── 이 사이트가 쓰는 웹폰트 ── */
  function need(s) { if (!s) return []; const K = [];
    const k = s.theme && D[s.theme]; if (k && FONTS[k.hf]) K.push(k.hf);
    const f = s.font && typeof s.font === 'object' ? s.font : {}; ['h', 'b'].forEach(x => { if (FONTS[f[x]]) K.push(f[x]); });
    try { const J = JSON.stringify([s.sections, (s.menus || []).map(m => m.sections)]); (J.match(/"ff":"(serif|round|hand|display)"/g) || []).forEach(m => K.push(m.slice(6, -1))); } catch (e) { }
    try { if (s.layout && typeof HPL !== 'undefined' && HPL.css && /var\(--hpl-serif\)/.test(HPL.css(s))) K.push('serif'); } catch (e) { }
    return [...new Set(K)]; }

  /* ── siteHTML 연결: 토큰 CSS(테마 렌더러 바로 뒤) + 필요한 @font-face ── */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { if (!h || !h.includes('</style>')) return h; const c = css(s); const ff = faces(need(s)); if (!c && !ff) return h;
      let out = h.replace('</style>', ff + c + '</style>');
      /* 미리보기 문서의 CSP가 글꼴을 막지 않도록: font-src에 같은 출처를 더한다(글꼴을 쓸 때만) */
      if (ff) out = out.replace(/(<meta http-equiv="Content-Security-Policy" content="[^"]*?font-src )([^;"]*)/, (m, a, b) => /'self'/.test(b) ? m : `${a}'self' ${b}`);
      return out; } catch (e) { console.error('hpdir', e); return h; } }; window.siteHTML = siteHTML; }
  /* 테마 고르기 미리보기(축소 그림)도 같은 토큰 */
  if (typeof HPT !== 'undefined' && HPT && typeof HPT.thumb === 'function') { const tb = HPT.thumb; HPT.thumb = (s, id) => { const h = tb(s, id);
    try { const x = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : {}))); HPT.apply(x, id, { keepColor: false }); const c = css(x); return c ? h.replace('</style>', c + '</style>') : h; } catch (e) { return h; } }; }
  /* 스튜디오 문서: 글꼴 고르기 견본(가나다 Aa)이 실제 글꼴로 보이도록 @font-face만 선언(쓰일 때만 내려받음) */
  try { if (typeof document !== 'undefined' && document.head && !document.getElementById('hpdir-ff')) { const st = document.createElement('style'); st.id = 'hpdir-ff'; st.textContent = faces(Object.keys(FONTS)); document.head.appendChild(st); } } catch (e) { }

  window.HPD = { tok: tokOf, css, faces, need, FONTS, FB, scale, list: () => Object.keys(D) };
})();
