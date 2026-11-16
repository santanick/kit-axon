/* v43 T1 hpprem — 홈페이지 빌더 프리미엄 테마 6종 + 프리미엄 템플릿 6종
   대표님(2026-11-14): "학습자 화면은 웹빌더 기능이 있으니 템플릿으로 6가지 시안을 다 주자."
   - 기관이 고르는 부분: 방문자 홈페이지 첫 화면(히어로 방식) · 카드 모양 · 밀도 · 색 분위기. 학습 기능 화면(이어 보기 · 플레이어 · 할 일 · 마일리지 · 시설)은 공통.
   - 색: 디디쌤 그린 고정값 대신 기관 색(site.color, hpcolor) 하나에서 50~900 단계를 계산한다(--p50 … --p900). 글자색은 밝기 판정(on())으로 정하고
     주 버튼 · 라벨 · 옆판 글자는 hpth tok() / fit()으로 4.5:1 이상을 맞춘다. 원천 시안의 고정 그린 · 코랄은 「기관 색 + 중성 + 경고 코랄(--warn, D-day · 마감 배지 전용)」로 바꿨다.
   - 첫 화면: hpsec-hero의 desk(사진 카드 + 모집 중 강좌 옆판) · cover(전면 사진 + 기관 색 오버레이 + 학습 경로 · 안내 · 무대 판). 사진은 HPS.photo(HPSTOCK 선택 로직) 그대로.
   - 기존 8종 테마 · 템플릿의 값과 순서는 그대로다(새 id만 더함). 이미 게시된 사이트는 모양이 바뀌지 않는다.
   원천 시안: v43 team-a s1(A1 코스 데스크) · s2(A2 러닝 패스) · team-b s1(B1 커맨드 레저) · s2(B2 브리핑 보드) · team-c s1(C1 오늘 피드) · s2(C2 무대)
   심사 반영(judge/SCORES.md): A1 위계(사진 카드 한 장이 주인공 · 옆판은 목록 1개), A2 코랄 남용(주 버튼은 기관 색, 코랄은 배지만) · 블러는 판 1곳도 쓰지 않음,
   C1 평면성(옆판에 실제 모집 강좌 목록 · 같은 색 아이콘 칸), C2 다크 토큰은 .hpt 아래 변수 12개 이내 · 파랑/앰버 링 없음. */
'use strict';
(() => {
  if (!window.HPT || typeof HPT.reg !== 'function') return;
  const U = HPT.U; const { mix, fit, Lm, al } = U;
  const WARN = '#E8553D'; /* 경고 코랄: D-day · 마감 배지 전용 */

  /* ── 기관 색 한 개 → 50~900 단계 · 밝기 판정 글자색 ── */
  const STEP = [[50, '#ffffff', .94], [100, '#ffffff', .86], [200, '#ffffff', .7], [300, '#ffffff', .5], [400, '#ffffff', .25], [500, null, 0], [600, '#000000', .14], [700, '#000000', .3], [800, '#000000', .46], [900, '#000000', .62]];
  const ramp = c => { const R = {}; STEP.forEach(([k, to, w]) => { R[k] = to ? mix(c, to, w) : c; }); return R; };
  const on = c => U.CR(c, '#0B0F0D') >= U.CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF'; /* 밝기 판정: 대비가 더 큰 쪽 */
  HPT.ramp = ramp; HPT.onColor = on;

  /* ── 테마 6종 ── 형식은 hpth TH와 같다 + prem · tags · tone · base · hk(첫 화면) · hp(옆판) · ck(강좌 카드) · sh(옆판 그림자) */
  const G = '#00C53B';
  const DEF = {
    coursedesk: { name: '코스 데스크', desc: '사진 카드 한 장 + 모집 중 강좌 옆판 · 과정이 많은 기관을 단정하게', tags: ['univ', 'lifelong', 'univ_lms'], tone: 'light', dens: '조밀',
      acc: G, bg: '#FFFFFF', alt: '#F4F6F5', ink: '#111816', mu: '#4A5550', r: 14, br: 10, hero: 'split', vis: 'mock', illu: 'book', card: 'shadow', look: 'mintSoft', sw2: '#EEF3F0', base: 'clean', hk: 'desk', hp: 'desk', ck: 'photo', sh: '0 1px 2px rgba(16,24,20,.05),0 12px 32px -18px rgba(16,24,20,.22)' },
    learnpath: { name: '러닝 패스', desc: '전면 사진 위 학습 경로 판 · 진도와 이수 흐름을 첫 화면에서', tags: ['univ', 'voc'], tone: 'light', dens: '보통',
      acc: G, bg: '#FFFFFF', alt: '#F3F6F4', ink: '#0F1714', mu: '#47524D', r: 18, br: 999, hero: 'split', vis: 'mock', illu: 'book', card: 'flat', look: 'mintSoft', sw2: '#0E2A1B', base: 'clean', hk: 'cover', hp: 'path', ck: 'big' },
    cmdledger: { name: '커맨드 레저', desc: '촘촘한 선 카드 · 숫자와 목록 중심의 정돈된 업무형 배치', tags: ['corp', 'public'], tone: 'light', dens: '조밀',
      acc: G, bg: '#FFFFFF', alt: '#F5F6F7', ink: '#0E1312', mu: '#4A5251', r: 8, br: 8, hero: 'split', vis: 'mock', illu: 'doc', card: 'line', look: 'corpPortal', sw2: '#E9ECEE', base: 'official', hk: 'desk', hp: 'ledger', ck: 'list', sh: 'none' },
    briefboard: { name: '브리핑 보드', desc: '한 문장으로 먼저 말하는 큰 사진 첫 화면 · 여백이 넉넉한 브리핑형', tags: ['corp', 'adult'], tone: 'light', dens: '여유',
      acc: G, bg: '#FFFFFF', alt: '#F6F5F2', ink: '#121614', mu: '#4C534F', r: 22, br: 999, hero: 'split', vis: 'mock', illu: 'book', card: 'shadow', look: 'mintSoft', sw2: '#F6F5F2', base: 'clean', hk: 'cover', hp: 'brief', ck: 'photo' },
    todayfeed: { name: '오늘 피드', desc: '둥근 사진 카드와 모집 강좌 피드 · 학원 · 초중고에 친근하게', tags: ['k12', 'adult'], tone: 'light', dens: '보통',
      acc: G, bg: '#FBFCFB', alt: '#F1F5F2', ink: '#14191A', mu: '#4B5452', r: 22, br: 14, hero: 'split', vis: 'mock', illu: 'kids', card: 'shadow', look: 'brandBold', sw2: '#E6F4EA', base: 'warm', hk: 'desk', hp: 'feed', ck: 'photo', sh: '0 1px 2px rgba(16,24,20,.05),0 16px 36px -20px rgba(16,24,20,.26)' },
    stage: { name: '무대', desc: '어두운 무대 바탕 · 사진이 주인공인 공연장 분위기(예체능 · 스포츠 · 체육시설)', tags: ['adult', 'lifelong', 'public'], tone: 'dark', dens: '여유',
      acc: G, bg: '#0D1110', alt: '#141A18', ink: '#F1F5F3', mu: '#AAB4AF', r: 16, br: 999, hero: 'dark', hb: '#0A0D0C', vis: 'mock', illu: 'book', card: 'line', look: 'navyGlow', sw2: '#0D1110', base: 'premium', hk: 'cover', hp: 'stage', ck: 'big' }
  };
  /* 글자 · 여백 · 모서리 · 그림자(hpdir 토큰 형식) — 밀도: 조밀(섹션 80~96) · 보통(112) · 여유(136) */
  const ey = (fs, ls, fw, tt) => ({ fs, ls, fw, tt });
  const HD = {
    coursedesk: { hf: 'sans', hw: 800, hls: -0.035, h1: 52, h1m: 32, lh1: 1.16, h2: 36, h2m: 26, h3: 19, body: 16, blh: 1.7, lead: 18, ey: ey(13, 0.04, 750, 'none'), sec: 96, secm: 60, w: 1240, gut: 40,
      r: 14, rs: 8, br: 10, bh: 48, bpx: 22, bfw: 700, bls: -0.01, bd: '1px solid rgba(17,24,22,.08)', sh: '0 1px 2px rgba(16,24,20,.05)', shh: '0 16px 32px -18px rgba(16,24,20,.28)', hov: 'lift', em: 'accent', link: 'hover' },
    learnpath: { hf: 'sans', hw: 800, hls: -0.04, h1: 60, h1m: 34, lh1: 1.14, h2: 40, h2m: 28, h3: 20, body: 16.5, blh: 1.72, lead: 18.5, ey: ey(13, 0.06, 750, 'none'), sec: 112, secm: 68, w: 1200, gut: 40,
      r: 18, rs: 12, br: 999, bh: 52, bpx: 26, bfw: 700, bls: -0.01, bd: '0', sh: '0 0 0 1px rgba(16,24,20,.07)', shh: '0 20px 40px -22px rgba(16,24,20,.3)', hov: 'lift', em: 'accent', link: 'hover' },
    cmdledger: { hf: 'sans', hw: 700, hls: -0.03, h1: 46, h1m: 30, lh1: 1.2, h2: 32, h2m: 24, h3: 18, body: 15.5, blh: 1.68, lead: 17.5, ey: ey(13, 0.08, 700, 'uppercase'), sec: 80, secm: 56, w: 1240, gut: 40,
      r: 8, rs: 6, br: 8, bh: 46, bpx: 20, bfw: 700, bls: 0, bd: '1px solid rgba(14,19,18,.12)', sh: 'none', shh: 'none', hov: 'border', em: 'plain', link: 'underline' },
    briefboard: { hf: 'sans', hw: 800, hls: -0.045, h1: 64, h1m: 36, lh1: 1.12, h2: 44, h2m: 28, h3: 20, body: 17, blh: 1.75, lead: 19, ey: ey(14, 0.02, 700, 'none'), sec: 136, secm: 80, w: 1180, gut: 40,
      r: 22, rs: 14, br: 999, bh: 54, bpx: 28, bfw: 700, bls: -0.01, bd: '0', sh: '0 1px 2px rgba(16,24,20,.04),0 18px 40px -24px rgba(16,24,20,.24)', shh: '0 24px 44px -22px rgba(16,24,20,.3)', hov: 'lift', em: 'accent', link: 'hover' },
    todayfeed: { hf: 'sans', hw: 800, hls: -0.035, h1: 54, h1m: 32, lh1: 1.18, h2: 38, h2m: 27, h3: 19, body: 16.5, blh: 1.72, lead: 18, ey: ey(14, 0, 750, 'none'), sec: 104, secm: 64, w: 1220, gut: 40,
      r: 22, rs: 14, br: 14, bh: 52, bpx: 24, bfw: 750, bls: -0.01, bd: '0', sh: '0 1px 2px rgba(16,24,20,.05),0 14px 32px -20px rgba(16,24,20,.24)', shh: '0 22px 40px -20px rgba(16,24,20,.3)', hov: 'lift', em: 'accent', link: 'hover' },
    stage: { hf: 'sans', hw: 800, hls: -0.045, h1: 64, h1m: 36, lh1: 1.1, h2: 44, h2m: 28, h3: 20, body: 16.5, blh: 1.72, lead: 18.5, ey: ey(13, 0.12, 700, 'uppercase'), sec: 120, secm: 72, w: 1220, gut: 40,
      r: 16, rs: 10, br: 999, bh: 52, bpx: 26, bfw: 700, bls: 0, bd: '1px solid rgba(255,255,255,.12)', sh: 'none', shh: '0 20px 40px -20px rgba(0,0,0,.6)', hov: 'lift', em: 'accent', link: 'hover' }
  };

  /* ── 테마 CSS(hpth css 뒤에 붙음): 단계 색 변수 · 경고 코랄 · 어두운 무대 ── */
  function cssX(s, th, T) { const R = ramp(T.a); const v = Object.keys(R).map(k => `--p${k}:${R[k]}`).join(';');
    const warnT = fit(WARN, th.bg, 4.6); const tagBg = th.tone === 'dark' ? mix(th.bg, T.a, .2) : R[50]; const tagFg = fit(T.a, tagBg, 4.6, th.tone === 'dark' ? '#ffffff' : '#000000');
    let x = `\n/* v43 프리미엄(${s.theme}) */.hpt{${v};--warn:${WARN};--warn-t:${warnT};--on-a:${on(T.a)};--tag:${tagBg};--tag-t:${tagFg}}.hpt .hp-tag,.hpt .hps-tag{background:var(--tag);color:var(--tag-t)}.hpt .hp-dday,.hpt .hps-dday{background:${al(WARN, .12)};color:var(--warn-t)}`;
    if (s.theme === 'cmdledger') x += `.hpt .hp-sh h2{letter-spacing:-.025em}.hpt .hp-s.hp-alt{background:var(--alt);border-block:1px solid rgba(14,19,18,.08)}`;
    if (s.theme === 'learnpath') x += `.hpt .hp-s.hp-alt{background:linear-gradient(180deg,${R[50]} 0%,${th.bg} 100%)}`;
    if (s.theme === 'todayfeed') x += `.hpt .hp-s.hp-alt{background:${mix(R[50], '#ffffff', .4)}}`;
    if (th.tone === 'dark') { const surf = mix(th.bg, '#ffffff', .06), ln = 'rgba(255,255,255,.12)', mu = fit(th.mu, surf, 4.6, '#ffffff'), at = fit(T.a, surf, 4.6, '#ffffff');
      /* 어두운 무대: 변수 12개 이내로 바탕 · 면 · 선 · 글자만 바꾼다. 카드 · 표 · 입력칸의 흰 바탕을 면 색으로 */
      x += `.hpt{--surf:${surf};--ln:${ln};--mu:${mu};--at:${at};--at2:${at};color-scheme:dark}
.hpt,.hpt.hp-s,.hpt .hp-s{color:var(--ink)}.hpt .hp-s.hp-alt,.hpt.hp-s.hp-alt{background:var(--alt)}
.hpt :is(.hp-card,.hp-cc,.hp-c1,.hps-c,.hps-card,.hps-pr,.hps-tb,.hp-faq details,.hp-nt li,.hp-rv,.hp-ci.lt li,.hp-mapv,.hps-it,.hps-rw){background:var(--surf)!important;color:var(--ink);border-color:var(--ln)!important;box-shadow:0 0 0 1px var(--ln)!important}
.hpt :is(.hp-card,.hp-cc,.hp-c1,.hps-c,.hps-card,.hps-pr,.hps-tb,.hps-it,.hps-rw) :is(h3,h4,b,strong){color:${th.ink}!important}.hpt :is(.hp-card,.hp-cc,.hp-c1,.hps-c,.hps-card,.hps-pr,.hps-tb,.hps-it,.hps-rw) :is(p,small){color:${mu}!important}
.hpt :is(table,th,td){border-color:var(--ln)!important}.hpt :is(th){background:${mix(th.bg, '#ffffff', .1)}!important;color:var(--ink)!important}
.hpt :is(small,.hp-sd,.hp-lead,.hps-mu,.hps-meta,dd,dt,figcaption){color:var(--mu)}
.hpt .hp-btn.gh,.hpt .hps-btn.g{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)}
.hpt .hps-bd{color:#14191A!important}.hpt .hps-bd.is-on{color:var(--on-a)!important}.hpt .hp-ey,.hpt .hps-ey{color:var(--at)}.hpt a:not(.hp-btn):not(.hps-btn){color:inherit}`; }
    return x; }

  Object.keys(DEF).forEach(id => { const d = Object.assign({ prem: 1, cssX }, DEF[id]); HPT.reg(id, d); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpprem HPD', e); } });
  const PREM = Object.keys(DEF);
  const tyKey = () => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return ''; } };
  /* 기관 유형에 맞는 테마를 먼저(추천 태그가 맞는 것 → 나머지) */
  HPT.premFor = ty => { ty = ty || tyKey(); const t2 = ty === 'univ_lms' ? 'univ' : ty; const sc = id => { const g = DEF[id].tags; return g.indexOf(ty) >= 0 ? 0 : g.indexOf(t2) >= 0 ? 1 : 2; }; return PREM.slice().sort((a, b) => sc(a) - sc(b) || PREM.indexOf(a) - PREM.indexOf(b)); };
  HPT.premFits = (id, ty) => { ty = ty || tyKey(); const g = (DEF[id] || {}).tags || []; return g.includes(ty) || g.includes(ty === 'univ_lms' ? 'univ' : ty); };
  const TY_N = { adult: '성인 · 학원', k12: '초중고 · 학원', univ: '대학', univ_lms: '대학 LMS', corp: '기업 HRD', public: '공공', lifelong: '평생교육', voc: '직업훈련' };
  HPT.tagName = k => TY_N[k] || k;

  /* ── 미리보기: 프리미엄은 실제 게시본(siteHTML)을 그대로 축소 — 첫 화면 사진 · 옆판까지 실제와 같다 ── */
  { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!DEF[id] || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; try { const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 'prem-' + id); if (tp && typeof tp.build === 'function') b.sections = tp.build(); } catch (e) { } /* v43 D-E: 미리보기는 그 테마의 기본 섹션(첫 화면 문구 · 순서)으로 — 6종이 서로 달라 보이게 */
      const bn = (b.sections || []).find(x => x && x.type === 'banner'); if (bn && bn.data) { delete bn.data.hero; delete bn.data.hk; }
      return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpprem thumb', e); return tb(s, id); } }; }

  /* ── 대비 점검: 단계 색 위 글자 · 경고 코랄 · 무대 면 ── */
  if (typeof HPT.audit === 'function') { const a0 = HPT.audit; const f = s => { const r = a0(s); try { const th = HPT.meta(s && s.theme); if (!th || !th.prem) return r; const T = HPT.tokens(s); const R = ramp(T.a);
      const add = (n, fg, bg) => r.push([n, fg, bg, Math.round(U.CR(fg, bg) * 100) / 100]);
      /* 어두운 무대: 밝은 첫 화면 · 옅은 태그 줄은 쓰지 않는 조합(첫 화면 = 사진 · 어두운 바탕, 태그 = --tag 변수)이라 실제 조합으로 바꿔 센다 */
      if (th.tone === 'dark') { for (let i = r.length - 1; i >= 0; i--) if (/^밝은 첫 화면|^태그$/.test(r[i][0])) r.splice(i, 1); const tg = mix(th.bg, T.a, .2); add('태그', fit(T.a, tg, 4.6, '#ffffff'), tg); add('분할 첫 화면 제목', th.ink, th.bg); }
      [50, 100, 500, 700, 900].forEach(k => add(`단계 ${k} 위 글자`, on(R[k]), R[k]));
      add('경고 코랄 글자', fit(WARN, th.bg, 4.6), th.bg);
      if (th.tone === 'dark') { const surf = mix(th.bg, '#ffffff', .06); add('무대 본문', th.ink, th.bg); add('무대 보조 글자', fit(th.mu, surf, 4.6, '#ffffff'), surf); add('무대 라벨', fit(T.a, surf, 4.6, '#ffffff'), surf); }
      if (window.HPS && HPS.bd43) { const bd = HPS.bd43(T); add('프리미엄 첫 화면 제목(오버레이)', '#ffffff', mix('#ffffff', bd, .88)); add('프리미엄 판 글자', '#ffffff', mix(mix('#ffffff', bd, .9), '#000000', .1)); }
    } catch (e) { console.error('hpprem audit', e); } return r; }; Object.keys(a0).forEach(k => { f[k] = a0[k]; }); HPT.audit = f; }

  /* ── 프리미엄 템플릿 6종(갤러리 · 마법사의 「프리미엄」 묶음) ──
     types[0]은 'prem'(유형별 첫 템플릿 · 새 기관 기본 사이트가 바뀌지 않게). 숫자는 실제 숫자 띠만, 후기 · 강사 · 연락처는 실제 데이터만. */
  if (typeof TPL === 'undefined' || typeof S2 !== 'function') return;
  const TX = (variant, data) => S2('text', { variant, ...data });
  const ids = n => { try { return pubCls(n); } catch (e) { return []; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const ban = d => S2('banner', d);
  const cls = (title, sub, n) => S2('classes', { eyebrow: '', title, sub: sub || '', ids: ids(n || 6), layout: 'grid' });
  const facts = () => TX('stats', { hpt: 'facts', title: '', cols: [] });
  const notices = t => S2('notices', { eyebrow: '', title: t || '공지사항', n: 4 });
  const reviews = t => S2('reviews', { eyebrow: '', title: t, note: '' });
  const cta = (title, body, btn) => TX('cta', { eyebrow: '', title, body, cta: btn, cols: [] });
  const map = () => S2('map', { title: '오시는 길', addr: ft().addr || '', tel: ft().tel || '' });
  const org = () => { try { return S.org.name; } catch (e) { return ''; } };
  /* v43 D-E(P2 C3): 체육시설 · 공단(공공 + 시설 템플릿 sports)은 무대 기본 섹션을 「시설 예약 · 운영 시간 · 시설 카드 · 요금표 · 오시는 길 · 공지」 순서로 */
  const sportsFac = () => { try { return S.org.type === 'public' && S.fac && S.fac.tpl === 'sports' && (S.fac.facilities || []).some(f => f.on !== false); } catch (e) { return false; } };
  const W = v => (+v || 0).toLocaleString('ko-KR') + '원';
  function sportsBuild() { const FS = S.fac.facilities.filter(f => f.on !== false); const TF = FS.filter(f => f.kind === 'time');
    const hr = (f, d) => { const h = f && f.hours && f.hours[d]; return h ? `${h[0]}–${h[1]}` : '휴관'; }; const f0 = TF[0] || FS[0];
    const cl = (FS.find(f => (f.closed || []).length) || { closed: [] }).closed[0];
    const unit = f => (+f.slotMin || 60) >= 60 ? `${Math.round((+f.slotMin || 60) / 60)}시간` : `${f.slotMin}분`;
    const price = f => { const p = f.prices || {}; const g = k => +((p[k] || {}).slot) || 0; return g('public') || g('staff') || g('student') ? [`일반 ${W(g('public'))}`, p.staff ? `지역주민 ${W(g('staff'))}` : '', p.student ? `감면 ${W(g('student'))}` : ''].filter(Boolean).join(' · ') + ` (${unit(f)})` : '무료'; };
    const pr = TF.filter(f => !f.approval).slice(0, 4).map(f => [f.name, price(f)]); const ps = (S.fac.products || []).filter(x => x.type === 'pass-period').slice(0, 1).map(x => [x.name, `일반 ${W((x.prices || {}).public)}`]);
    return [ban({ eyebrow: '시설 예약 · 강습', title: `오늘 바로\n예약할 수 있어요`, sub: `${TF.slice(0, 3).map(f => f.name.replace(/\s*(타석|코트|룸)$/, '')).join(' · ')} 빈 시간을 보고 1분 안에 예약해요.`, cta: '시설 예약', cta2: '강습 신청' }),
      TX('info', { hpt: 'sp-hours', eyebrow: 'OPEN HOURS', title: '운영 시간', cols: [['평일', `${hr(f0, 1)}`], ['토요일', hr(f0, 6)], ['일요일 · 공휴일', hr(f0, 0)], ['휴관', cl ? `${cl.from.slice(5).replace('-', '.')} ${cl.reason || '휴관'} · 공지로 안내` : '휴관일은 공지로 안내해요']] }),
      TX('features', { eyebrow: 'FACILITIES', title: '예약할 수 있는 시설', cols: FS.slice(0, 4).map(f => [f.name, `${f.place ? f.place + ' · ' : ''}${f.kind === 'time' ? (f.approval ? '승인 후 확정' : '바로 예약') : f.kind === 'pass' ? '이용권' : '대여'}`]) }),
      TX('info', { eyebrow: 'PRICE', title: '요금표', cols: [...pr, ...ps].slice(0, 4) }),
      cls('강습 프로그램', '', 4),
      TX('info', { eyebrow: 'DIRECTIONS', title: '오시는 길 · 주차', cols: [['주소', ft().addr || '기본 정보에서 주소를 입력하면 여기에 보여요'], ['주차', '방문 차량은 프런트에서 등록하면 2시간 무료예요'], ['감면', '감면 대상은 첫 방문 때 프런트에서 확인해요'], ['문의', ft().tel || '프런트로 문의해 주세요']] }),
      S2('map', { title: '오시는 길', place: org(), pin: { x: 52, y: 46 }, addr: ft().addr || '주소는 기본 정보에서 입력해 주세요', tel: ft().tel || '', hours: f0 ? `평일 ${hr(f0, 1)} · 토 ${hr(f0, 6)}` : '' }), notices('공지사항')]; }
  const T = {
    coursedesk: { scene: '과정이 많은 대학 · 평생교육원 — 모집 강좌를 첫 화면 옆판에서 바로', purpose: ['learn', 'apply'],
      build: () => [ban({ eyebrow: '이번 학기 모집', title: `${org()}\n배우고 싶은 과정을 한곳에서`, sub: '모집 중인 과정과 수강 방법을 확인하고, 마음에 드는 과정을 바로 신청하세요.', cta: '과정 둘러보기', cta2: '수강 상담' }),
        facts(), cls('모집 중인 과정', '분야별로 정리한 과정을 비교해 보고 신청하세요.', 6),
        TX('steps', { eyebrow: '', title: '수강 방법', cols: [['과정 고르기', '분야와 일정을 보고 과정을 고릅니다'], ['신청 · 결제', '온라인으로 신청하고 결제합니다'], ['수강', 'PC · 휴대폰으로 학습합니다'], ['수료', '수료 기준을 채우면 수료증을 받습니다']] }),
        notices('공지사항'), reviews('수강생 이야기'), cta('어떤 과정이 맞을지 고민되시나요?', '담당자가 수강 목적에 맞는 과정을 안내합니다.', '수강 상담'), map()] },
    learnpath: { scene: '진도 · 이수 경로가 중요한 대학 · 직업훈련 — 첫 화면에 학습 경로 판', purpose: ['learn'],
      build: () => [ban({ eyebrow: '학습 경로', title: `처음부터 이수까지\n${org()}와 함께`, sub: '과정을 고르면 학습 순서와 이수 기준이 한눈에 보입니다. 진도는 자동으로 기록됩니다.', cta: '과정 보기', cta2: '이수 안내' }),
        TX('timeline', { eyebrow: '', title: '이렇게 배워요', cols: [['과정 신청', '목표에 맞는 과정을 고르고 신청합니다'], ['단계별 학습', '차시를 순서대로 듣고 실습합니다'], ['평가 · 과제', '평가와 과제로 이해를 확인합니다'], ['이수', '이수 기준을 채우면 기록이 남습니다']] }),
        facts(), cls('다음에 배울 과정', '지금 신청할 수 있는 과정입니다.', 4), notices('공지사항'), cta('이수 기준이 궁금하신가요?', '과정별 이수 기준과 일정을 안내합니다.', '문의하기')] },
    cmdledger: { scene: '기업 HRD · 공공 — 필수 · 직무 과정을 목록과 숫자로 정돈', purpose: ['learn', 'info'],
      build: () => [ban({ eyebrow: 'LEARNING CENTER', title: `${org()}\n업무에 필요한 교육을 한 곳에서`, sub: '필수 교육과 직무 과정을 기한 안에 이수하고, 이수 기록을 바로 확인합니다.', cta: '과정 목록', cta2: '이수 현황' }),
        facts(), cls('운영 중인 과정', '필수 · 직무 과정을 확인하세요.', 6),
        TX('features', { eyebrow: '', title: '이용 안내', cols: [['필수 교육', '기한 안에 이수하고 기록을 남깁니다'], ['직무 과정', '업무에 바로 쓰는 실무 과정'], ['이수 기록', '이수 내역과 수료증을 바로 확인']] }),
        notices('공지사항'), cta('교육 담당자에게 문의', '과정 · 이수 관련 문의를 남겨 주세요.', '문의하기')] },
    briefboard: { scene: '기업 HRD · 성인 교육 — 한 문장 브리핑과 큰 사진 첫 화면', purpose: ['brand', 'learn'],
      build: () => [ban({ eyebrow: '오늘의 배움', title: '오늘 할 일을\n한 문장으로 시작하세요', sub: `${org()}의 과정을 PC와 휴대폰에서 이어서 학습합니다.`, cta: '과정 보기', cta2: '상담하기' }),
        facts(), cls('지금 배우기 좋은 과정', '', 4), reviews('함께한 분들의 이야기'),
        TX('features', { eyebrow: '', title: '이렇게 도와드려요', cols: [['어디서나 학습', 'PC · 휴대폰에서 이어서 학습'], ['맞춤 안내', '진도에 맞춰 다음 할 일을 안내'], ['기록과 수료', '학습 기록과 수료증을 한곳에']] }),
        cta('도입 · 수강 문의', '담당자가 안내해 드립니다.', '상담 신청')] },
    todayfeed: { scene: '학원 · 초중고 — 둥근 사진 카드와 모집 강좌 피드', purpose: ['apply', 'info'],
      build: () => [ban({ eyebrow: '이번 달 모집', title: `${org()}\n오늘 배우고 내일 자라요`, sub: '모집 중인 수업을 확인하고 상담을 신청하세요. 수업 소식은 공지에서 바로 볼 수 있어요.', cta: '수업 보기', cta2: '상담 신청' }),
        cls('모집 중인 수업', '반별 일정과 대상을 확인하세요.', 4), facts(), notices('학원 소식'), reviews('학부모 · 학생 이야기'),
        cta('상담은 언제든 편하게', '수업과 반 배정을 상담해 드려요.', '상담 신청'), map()] },
    stage: { scene: '예체능 · 스포츠센터 · 평생교육 — 어두운 무대와 사진이 주인공', purpose: ['brand', 'apply'],
      build: () => sportsFac() ? sportsBuild() : [ban({ eyebrow: 'CLASS ON STAGE', title: `${org()}\n오늘의 무대에 올라 보세요`, sub: '실력에 맞는 반을 고르고, 사진과 영상으로 수업 분위기를 먼저 확인하세요.', cta: '클래스 보기', cta2: '체험 신청' }),
        cls('지금 열린 클래스', '', 4), facts(), reviews('수강생 이야기'), notices('소식'), cta('체험 수업 신청', '처음이라면 체험 수업부터 시작해 보세요.', '체험 신청'), map()] }
  };
  /* 체육시설 무대: 공공 기본 배치(공지를 첫 화면 바로 아래로)를 따르지 않고 공지는 맨 끝(P2 C3 ⑥) */
  if (typeof HPT.enrich === 'function') { const e0 = HPT.enrich; HPT.enrich = s => { const r = e0(s); try { const L = s && s.sections; if (Array.isArray(L) && L.some(x => x && x.data && x.data.hpt === 'sp-hours')) { const k = L.findIndex(x => x && x.type === 'notices'); if (k >= 0 && k !== L.length - 1) { const [n] = L.splice(k, 1); L.push(n); } } } catch (e) { console.error('hpprem enrich', e); } return r; }; }
  /* 체육시설 무대: 실내 · 운동장 체육 사진으로(카페 · 교실 사진 대신) */
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpsp) { const base = siteFromTpl; const f = tp => { const s = base(tp); try { if (tp && tp.id === 'prem-stage' && sportsFac() && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = { hero: 'spo-03', about: 'spo-05', space: 'spo-07', cta: 'spo-01' }; s.img = s.img || {}; Object.keys(s.photos).forEach(sl => { const v = HPSTOCK.slotImg(s.photos[sl], sl); if (v) s.img[sl] = v; }); } } catch (e) { console.error('hpprem sports', e); } return s; };
    Object.keys(base).forEach(k => { try { f[k] = base[k]; } catch (e) { } }); f.hpsp = 1; siteFromTpl = f; window.siteFromTpl = f; }
  PREM.forEach(id => { if (TPL.some(t => t.id === 'prem-' + id)) return; const c = T[id];
    TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags.filter(k => k !== 'univ_lms')], scene: c.scene, color: G, tone: DEF[id].r >= 20 ? '친근' : DEF[id].r <= 8 ? '신뢰' : '모던', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, build: c.build }); });
})();
