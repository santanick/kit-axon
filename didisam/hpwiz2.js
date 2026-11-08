/* v34.5 hpwiz2 — AI 빌더 연결(개발자 X4, fix6/BRIEF4.md · FIXLIST 6 · 8 · 14)
   대표님(2026-11-08): "디자인 유사한 거는 최대한 제외하고, 다양성을 가지고 가줘 … 디자인 수준을 더 올려줘."
   1) 시안 3개의 디자인 축: 레이아웃 계열(HPL 12) × 테마(HPT 8) × 팔레트(HPC.forType) × 첫 화면(S3 banner.data.hk) × 강좌 카드(classes.data.card)
      × 머리글 · 바닥글(site.hps) × 사진(HPSTOCK, 사람 장면 우선). 세 시안은 계열 · 팔레트 · 첫 화면 사진이 서로 다르다.
      - 출발점: 유형 디자이너가 지정한 업종 템플릿(TPL의 layout · theme · palette · photos · hps · 카드)을 계열마다 하나씩 참고하고, 없으면 규칙으로 고른다.
      - Claude가 연결되면 설계 JSON의 "design"(시안마다)을 받아 검증한 뒤 쓰고, 빠지거나 겹치는 축은 규칙으로 채운다.
      - 시안은 지금 사이트의 계열 · 머리글 · 샘플 사진을 물려받지 않는다(hpMake가 이전 사이트를 복제하므로 시안마다 다시 지정). 운영자가 올린 실제 사진은 그대로 둔다.
   2) 말로 고치기 의도(hpwTalk · edit_homepage · 규칙): '매거진 느낌으로' · '사진 크게' · '더 공공기관답게' · '어둡고 고급스럽게' · '카드를 목록형으로' · '머리글 투명하게'
      (+ 계열 · 팔레트 바꾸기, 계열 이름, 바닥글 종류). 잡은 구절만 처리하고 나머지 말은 기존 규칙(hpwiz · hpimg)이 그대로 처리한다.
   3) 품질 점수 안내 줄: '샘플 사진 N장 남음'(감점 없음, HPSTOCK.count + 그릴 때 자동으로 채운 샘플)
   4) 숨긴 빈 섹션 되살리기(FIXLIST 14): hpwFix가 자동으로 숨긴 섹션(hideAuto)은 그릴 때 다시 판정해 데이터가 생기면 보인다. 운영자가 직접 숨긴 섹션은 그대로.
   5) 게시본 머리글 이전(FIXLIST 6): 머리글(hp.head)이 없는 예전 게시본은 스튜디오를 열 때 홈페이지 게시본만 한 번 다시 만든다.
      게시 뒤 고친 내용이 있으면(초안 공개 방지) 자동으로 하지 않고 안내만 한다. 이전 게시본은 [되돌리기]용으로 보관한다.
   hpwiz.js의 연결 지점(최소 줄): W.design · W.qpre · W.qx · W.talkX · W.talkQ · W.emptyOf · hpwFix의 hideAuto 표시 */
(function () {
  'use strict';
  if (typeof ACT === 'undefined' || !window.HPW) return;
  const W = window.HPW;
  const X = W.x2 = { round: 0, lastJ: null, plan: null, planKey: '', migDone: false, memo: new Map() };
  const A = v => Array.isArray(v) ? v : [];
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const tyKey = () => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return 'adult'; } };
  const baseTy = k => k === 'univ_lms' ? 'univ' : (k || 'adult');
  const hasL = () => !!(window.HPL && HPL.fam && typeof HPL.list === 'function' && HPL.list().length >= 3);
  const hasC = () => !!(window.HPC && typeof HPC.forType === 'function' && typeof HPC.apply === 'function');
  const hasP = () => !!(window.HPSTOCK && typeof HPSTOCK.forScene === 'function' && typeof HPSTOCK.slotImg === 'function');
  const thList = () => (window.HPT && Array.isArray(HPT.list)) ? HPT.list.map(x => String(x.id)) : [];
  const thName = id => ((window.HPT && HPT.list) || []).find(x => x.id === id)?.name || id || '';
  const famName = id => (window.HPL && HPL.fam && HPL.fam[id] && HPL.fam[id].name) || id || '';
  const palOf = id => (hasC() && HPC.get) ? HPC.get(id) : null;
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const isStock = v => !!(v && window.HPSTOCK && HPSTOCK.isStock(v));
  const pubNames = () => { try { return (S.classes || []).filter(c => c.open === '전체' && c.status !== '종료').slice(0, 4).map(c => c.name); } catch (e) { return []; } };

  /* ═════════ 1) 디자인 축 고르기 ═════════ */
  /* 유형별 계열 우선순위(RULES_B2 유형별 홈 뼈대 · 계열 fits 기준). 없는 계열은 건너뛰고, 모자라면 fits → 전체 순으로 채운다 */
  const TY_L = { adult: ['editorial', 'bento', 'fullbleed', 'splitscreen', 'mosaic', 'typo', 'story', 'noir'], k12: ['collage', 'bento', 'story', 'fullbleed', 'mosaic', 'typo'],
    univ: ['portal', 'editorial', 'splitscreen', 'bulletin', 'sidebar', 'story'], univ_lms: ['sidebar', 'portal', 'splitscreen', 'bulletin', 'editorial'],
    corp: ['splitscreen', 'bento', 'sidebar', 'typo', 'editorial', 'portal'], public: ['bulletin', 'portal', 'splitscreen', 'sidebar', 'story'],
    lifelong: ['story', 'splitscreen', 'bulletin', 'fullbleed', 'editorial', 'mosaic'], voc: ['bento', 'fullbleed', 'portal', 'typo', 'sidebar', 'story'] };
  const TY_TH = { adult: ['clean', 'premium', 'tech', 'warm'], k12: ['warm', 'kids', 'clean', 'official'], univ: ['campus', 'official', 'clean', 'premium'], univ_lms: ['campus', 'official', 'clean'],
    corp: ['clean', 'tech', 'official', 'premium'], public: ['official', 'senior', 'clean', 'campus'], lifelong: ['senior', 'warm', 'official', 'campus'], voc: ['tech', 'official', 'clean', 'warm'] };
  const L_TH = { editorial: ['premium', 'campus', 'clean'], bento: ['clean', 'tech', 'warm'], fullbleed: ['premium', 'tech', 'clean', 'warm'], splitscreen: ['clean', 'official', 'premium'], typo: ['clean', 'tech', 'premium'],
    portal: ['official', 'campus', 'senior'], story: ['warm', 'clean', 'campus', 'senior'], mosaic: ['clean', 'warm', 'kids'], sidebar: ['clean', 'official', 'tech'], bulletin: ['official', 'senior', 'campus'], collage: ['kids', 'warm'], noir: ['premium', 'tech'] };
  const MOOD = { clean: 'trust', premium: 'premium', warm: 'warm', official: 'trust', tech: 'tech', kids: 'playful', campus: 'classic', senior: 'calm' };
  const HK = ['scrim', 'split', 'box', 'grid'];
  const TY_CARD = { adult: ['photo', 'price', 'big'], k12: ['list', 'schedule', 'photo'], univ: ['table', 'schedule', 'photo'], univ_lms: ['table', 'list', 'schedule'], corp: ['list', 'table', 'photo'],
    public: ['table', 'list', 'schedule'], lifelong: ['big', 'schedule', 'list'], voc: ['schedule', 'price', 'table'] };
  const PEOPLE = ['뒷모습', '손', '그룹', '협업', '스터디', '수업', '학생', '사람', '시니어', '어린이', '강의', '발표', '토론', '실습', '함께'];
  const PEOPLE_CAT = ['seminar', 'lecture', 'classroom', 'kids', 'senior', 'workshop', 'people'];
  const peopleish = x => !!x && (A(x.tags).some(t => PEOPLE.includes(t)) || PEOPLE_CAT.includes(x.cat) || !!x.people);

  function layoutCands(ty) {
    if (!hasL()) return []; const L = HPL.list(); const ids = L.map(x => x.id); const bt = baseTy(ty);
    const out = []; const push = id => { if (ids.includes(id) && !out.includes(id)) out.push(id); };
    A(TY_L[ty] || TY_L[bt]).forEach(push); L.filter(x => A(x.fits).includes(bt)).forEach(x => push(x.id)); ids.forEach(push); return out; }
  /* 유형 디자이너 템플릿: 계열 → [템플릿] (그 유형이 types에 들어 있고 계열이 지정된 것) */
  function tplRefs(ty) {
    const R = {}; if (typeof TPL === 'undefined' || !hasL()) return R; const bt = baseTy(ty);
    A(TPL).forEach(t => { if (!t || t.hidden || !t.layout || !HPL.fam[t.layout]) return; const T2 = A(t.types); if (!(T2.includes(ty) || T2.includes(bt))) return; (R[t.layout] = R[t.layout] || []).push(t); });
    Object.keys(R).forEach(k => R[k].sort((a, b) => (A(a.types)[0] === bt ? 0 : 1) - (A(b.types)[0] === bt ? 0 : 1))); return R; }
  function tplExtras(t) { const o = {}; try { const L = typeof t.build === 'function' ? A(t.build()) : []; L.forEach(x => { const d = (x && x.data) || {}; if (x.type === 'banner' && d.hk) o.hk = d.hk; if (x.type === 'classes' && d.card) o.card = o.card || d.card; }); } catch (e) { } return o; }
  /* v34.5 FZ: 품질 점수(FB HPS.qItems)의 첫 화면 사진 기준과 같게 — 첫 화면 자리(hero) · 긴 변 1200px 이상 · 기관 유형 맞춤. 시안이 스스로 맞출 수 있는 항목이므로 고를 때 거른다 */
  const heroOk = (x, ty) => { if (typeof x === 'string') x = hasP() ? HPSTOCK.get(x) : null; if (!x) return false; const bt = baseTy(ty);
    return A(x.slots).includes('hero') && Math.max(x.w || 0, x.h || 0) >= 1200 && (!A(x.types).length || A(x.types).includes(bt)); };
  function heroPick(ty, scene, used, seed) {
    if (!hasP()) return null; let L = [];
    try { L = A(HPSTOCK.forScene(baseTy(ty), scene, 'hero', { n: 10, seed, exclude: used, people: true })); } catch (e) { L = []; }
    L = L.filter(x => x && !used.includes(x.id)); const G = L.filter(x => heroOk(x, ty));
    if (!G.length) { try { G.push(...A(Array.isArray(HPSTOCK.list) ? HPSTOCK.list : typeof HPSTOCK.list === 'function' ? HPSTOCK.list() : []).filter(x => x && !used.includes(x.id) && heroOk(x, ty) && A(x.types).includes(baseTy(ty)))); } catch (e) { } }
    return (G.find(peopleish) || G[0] || L.find(peopleish) || L[0] || null); }
  function slotPick(ty, scene, slot, used, seed) { if (!hasP()) return null; try { const L = A(HPSTOCK.forScene(baseTy(ty), scene, slot, { n: 6, seed, exclude: used, people: slot !== 'cta' })).filter(x => x && !used.includes(x.id)); return L.find(peopleish) || L[0] || null; } catch (e) { return null; } }
  function palPick(ty, th, heroId, used, prefer) {
    if (!hasC()) return null; const L = A(HPC.forType(baseTy(ty), MOOD[th])); if (!L.length) return null;
    const ph = heroId && HPC.forPhoto ? A(HPC.forPhoto(heroId, baseTy(ty))).map(p => p.id) : [];
    const sc = (p, i) => i + (A(p.themes).includes(th) ? 0 : 20) + (p.big && th !== 'senior' ? 60 : 0) + (th === 'senior' && !p.big ? 6 : 0) + (ph.length ? ph.indexOf(p.id) * .6 : 0) + (prefer && p.mood === prefer ? -10 : 0);
    const R = L.map((p, i) => [p, sc(p, i)]).filter(([p]) => !used.includes(p.id)).sort((a, b) => a[1] - b[1]); return R.length ? R[0][0].id : null; }
  const thPick = (layout, ty, used, want) => { const ok = thList(); const T = (want ? [want] : []).concat(A(L_TH[layout]).filter(t => A(TY_TH[ty]).includes(t)), A(L_TH[layout]), A(TY_TH[ty]), ok).filter(t => ok.includes(t));
    return T.find(t => !used.includes(t)) || T[0] || ''; };
  /* Claude 설계의 design 검증 */
  function fromClaude(o) { if (!o || typeof o !== 'object') return null; const r = {};
    if (hasL() && HPL.fam[o.layout]) r.layout = String(o.layout); if (thList().includes(o.theme)) r.theme = String(o.theme);
    if (palOf(o.palette)) r.palette = palOf(o.palette).id; if (HK.includes(o.hk)) r.hk = o.hk;
    const CK = window.HPS && A(HPS.cardKinds).length ? HPS.cardKinds.map(k => k.id) : ['photo', 'list', 'price', 'schedule', 'big', 'table']; if (CK.includes(o.card)) r.card = o.card;
    const hd = (A(((window.HPS && HPS.kinds) || {}).nav).length ? HPS.kinds.nav : [['overlay'], ['solid'], ['notice'], ['contact'], ['float']]).map(x => x[0]), fo = (A(((window.HPS && HPS.kinds) || {}).footer).length ? HPS.kinds.footer : [['mega'], ['cta'], ['biz'], ['min'], ['cols']]).map(x => x[0]); const hps = {}; if (hd.includes(o.head)) hps.head = o.head; if (fo.includes(o.foot)) hps.foot = o.foot; if (Object.keys(hps).length) r.hps = hps;
    if (hasP() && o.photo && HPSTOCK.get(String(o.photo)) && A(HPSTOCK.get(String(o.photo)).slots).includes('hero')) r.photos = { hero: String(o.photo) };
    return Object.keys(r).length ? r : null; }
  function claudeDesigns(j) { if (!j) return []; const alts = A(j.alts).filter(a => a && A(a.sections).length >= 3 && A(a.sections)[0] && A(a.sections)[0].type === 'banner').slice(0, 2);
    return [fromClaude(j.design), fromClaude(alts[0] && alts[0].design), fromClaude(alts[1] && alts[1].design)]; }

  /* 시안 3개의 조합(계열 · 팔레트 · 첫 화면 사진이 서로 다름) */
  function plan(o) {
    o = o || {}; const ty = o.type || tyKey(); const r = Math.max(0, o.round || 0); const n = o.n || 3; const scene = [o.brief || '', ...pubNames()].join(' ').slice(0, 300);
    const LC = layoutCands(ty); const refs = tplRefs(ty); const CD = A(o.claude);
    const used = { layout: [], theme: [], pal: [], hero: [], photo: [], hk: [], card: [] }; const out = [];
    /* 다시 만들 때는 계열 후보를 세 칸씩 밀어 다른 조합을 보여 준다 */
    const rot = LC.length ? (r * 3) % LC.length : 0; let order = LC.slice(rot).concat(LC.slice(0, rot));
    /* v34.5 FZ: 같은 유형 템플릿 2종 이상과 배치가 겹치는 계열(품질 '배치 겹침')은 뒤로 — 순서는 그대로 두고 겹치지 않는 계열을 먼저 */
    { const bt = baseTy(ty); const cnt = {}; A(typeof TPL !== 'undefined' ? TPL : []).forEach(t => { if (t && !t.hidden && t.layout && A(t.types).includes(bt)) cnt[t.layout] = (cnt[t.layout] || 0) + 1; });
      const dup = id => (cnt[id] || 0) - (A(refs[id]).length ? 1 : 0); order = order.filter(id => dup(id) <= 1).concat(order.filter(id => dup(id) > 1)); }
    for (let i = 0; i < n; i++) {
      const cd = CD[i] || {}; const c = { by: [] };
      c.layout = cd.layout && !used.layout.includes(cd.layout) ? cd.layout : order.find(id => !used.layout.includes(id)) || ''; if (cd.layout && c.layout === cd.layout) c.by.push('claude');
      const RL = A(refs[c.layout]); const ref = RL.length ? RL[(r + i) % RL.length] : null; const rx = ref ? tplExtras(ref) : {};
      if (ref) { c.tpl = ref.id; c.by.push('tpl'); }
      const want = i === 0 && o.theme ? o.theme : cd.theme || (ref && ref.theme);
      c.theme = thPick(c.layout, ty, i === 0 && o.theme ? [] : used.theme, want);
      /* 사진: Claude → 템플릿 → 규칙(사람 장면 우선), 첫 화면 사진은 서로 다르게 */
      const ph = Object.assign({}, ref && ref.photos ? ref.photos : {}, cd.photos || {});
      Object.keys(ph).forEach(k => { if (!hasP() || !HPSTOCK.get(ph[k]) || used.photo.includes(ph[k])) delete ph[k]; }); if (ph.hero && !heroOk(ph.hero, ty)) delete ph.hero;
      if (!ph.hero || used.hero.includes(ph.hero)) { const h = heroPick(ty, scene, used.photo.concat(used.hero), `${S && S.org ? S.org.name : ''}|${r}|${i}`); if (h) ph.hero = h.id; else delete ph.hero; }
      ['about', 'space', 'cta'].forEach(sl => { if (ph[sl]) return; const x = slotPick(ty, scene, sl, used.photo.concat(Object.values(ph)), `${r}|${i}|${sl}`); if (x) ph[sl] = x.id; });
      c.photos = ph; if (ph.hero) used.hero.push(ph.hero); Object.values(ph).forEach(id => used.photo.push(id));
      const pal0 = cd.palette || (ref && ref.palette && palOf(ref.palette) && c.theme === ref.theme ? palOf(ref.palette).id : null);
      c.palette = pal0 && !used.pal.includes(pal0) ? pal0 : palPick(ty, c.theme, ph.hero, used.pal);
      c.hk = cd.hk || rx.hk; if (!c.hk || used.hk.includes(c.hk)) c.hk = HK.find(k => !used.hk.includes(k)) || HK[i % HK.length];
      const CK = A(TY_CARD[ty] || TY_CARD.adult); c.card = cd.card || rx.card; if (!c.card || used.card.includes(c.card)) c.card = CK.find(k => !used.card.includes(k)) || CK[i % CK.length];
      c.hps = Object.assign({}, ref && ref.hps ? ref.hps : {}, cd.hps || {});
      if (!c.by.length) c.by.push('rule');
      used.layout.push(c.layout); used.theme.push(c.theme); if (c.palette) used.pal.push(c.palette); used.hk.push(c.hk); used.card.push(c.card);
      out.push(c); }
    return out; }
  X.planFor = plan;

  /* 조합을 사이트에 입힌다(시안 · 말로 고치기 공용) */
  function wear(d, c, o) {
    o = o || {}; if (!d || !c) return d;
    if (window.HPL && typeof HPL.apply === 'function') { delete d.layout; if (c.layout) HPL.apply(d, c.layout); } else if (c.layout) d.layout = c.layout; else delete d.layout;
    const userCol = o.color && ok6(o.color) ? o.color : '';
    if (c.theme && window.HPT && typeof HPT.apply === 'function' && (c.theme !== d.theme || o.forceTheme)) { try { HPT.apply(d, c.theme, userCol ? { color: userCol } : { keepColor: false, force: true }); } catch (e) { console.error('hpw2 theme', e); } d.hpTheme = c.theme; }
    if (userCol) { d.color = userCol; d.hpColorLock = 1; if (hasC()) HPC.apply(d, null); }
    else if (c.palette && hasC()) HPC.apply(d, c.palette);
    /* 사진: 운영자가 올린 실제 사진은 두고, 이전 사이트에서 물려받은 샘플 사진은 걷어낸 뒤 이 조합의 사진으로 */
    if (hasP()) { const img = Object.assign({}, d.img || {}); Object.keys(img).forEach(k => { if (isStock(img[k])) delete img[k]; });
      Object.keys(c.photos || {}).forEach(sl => { if (img[sl] && img[sl].src) return; const v = HPSTOCK.slotImg(c.photos[sl], sl); if (v) img[sl] = v; });
      d.img = img; d.photos = Object.assign({}, c.photos || {}); }
    A(d.sections).forEach(x => { const dd = x && x.data; if (!dd) return; if (x.type === 'banner') { if (c.hk) dd.hk = c.hk; if (dd.img && isStock(dd.img)) delete dd.img; } if (x.type === 'classes' && c.card) dd.card = c.card; });
    const h = Object.assign({}, d.hps || {}); delete h.head; delete h.foot; delete h.mm; delete h.ownH; delete h.ownF; Object.assign(h, c.hps || {}); if (Object.keys(h).length) d.hps = h; else delete d.hps;
    if (c.tpl) d.tpl = c.tpl;
    d.hpDesign = { layout: c.layout || '', theme: c.theme || '', palette: c.palette || '', hero: (c.photos || {}).hero || '', hk: c.hk || '', card: c.card || '', tpl: c.tpl || '', by: A(c.by).join('+') };
    return d; }
  X.wear = wear;

  /* hpwiz gen() 연결: 시안마다 다른 조합 */
  W.design = (d, v, i, st, local) => {
    if (!hasL() || !window.HPT) { if (d) delete d.layout; return d; } /* 계열이 없는 화면: 이전 사이트 계열을 물려받지 않게만 */
    const key = `${X.round}|${st && st.theme}|${local ? 'L' : 'C'}`;
    if (i === 0 || !X.plan || X.planKey !== key) { X.plan = plan({ type: tyKey(), round: X.round - 1, theme: st && st.theme, brief: st && st.brief, claude: local ? [] : claudeDesigns(X.lastJ) }); X.planKey = key; }
    const c = X.plan[i] || X.plan[X.plan.length - 1]; if (!c) return d;
    wear(d, c, { color: st && st.colorOn ? st.color : '', forceTheme: i > 0 });
    if (window.HPT && typeof HPT.enrich === 'function') { try { HPT.enrich(d); } catch (e) { } }
    /* 시안 카드의 이름 · 설명: 계열 · 테마 · 팔레트 */
    const p = palOf(c.palette); v.name = famName(c.layout).slice(0, 12) || v.name; v.desc = [thName(c.theme), p ? p.name : '', v.desc].filter(Boolean).join(' · ').slice(0, 40);
    if (d.ai) d.ai.summary = `${v.name} — ${v.desc}`;
    return d; };

  /* hpGenerate: 다시 만들 때마다 조합을 바꾸고, Claude 설계(design)를 받아 둔다 */
  if (typeof window.hpGenerate === 'function') { const base = window.hpGenerate; window.hpGenerate = async o => { X.round++; X.lastJ = null; const r = await base(o); try { X.lastJ = r && r.j ? r.j : null; } catch (e) { } return r; }; }

  /* Claude 프롬프트: 디자인 축 목록(마법사 시안 3개를 만들 때만) */
  function designSys() {
    const ty = tyKey(); const bt = baseTy(ty);
    const fams = hasL() ? layoutCands(ty).slice(0, 12).map(id => { const f = HPL.fam[id]; return `${id}(${f.name}${f.desc ? ' — ' + String(f.desc).slice(0, 34) : ''})`; }).join(', ') : '';
    const pals = hasC() ? A(HPC.forType(bt)).filter(p => !p.big || ty === 'lifelong').slice(0, 16).map(p => `${p.id}(${p.name} · ${(HPC.MOODS || {})[p.mood] || p.mood})`).join(', ') : '';
    let photos = ''; if (hasP()) { try { const L = A(HPSTOCK.forScene(bt, pubNames().join(' '), 'hero', { n: 14, seed: 'sys', people: true })); photos = L.sort((a, b) => (peopleish(b) ? 1 : 0) - (peopleish(a) ? 1 : 0)).map(x => `${x.id}(${String(x.alt || '').slice(0, 24)})`).join(', '); } catch (e) { } }
    const K = { nav: kinds('nav'), footer: kinds('foot') };
    return `\n추가 지침(v34.5 디자인 축):
- 시안마다 "design"을 넣습니다(첫 시안은 최상위 "design", alts는 각 항목 안). 형식: {"layout":"계열 id","theme":"테마 id","palette":"팔레트 id","hk":"scrim|split|box|grid","card":"photo|list|price|schedule|big|table","head":"머리글 id","foot":"바닥글 id","photo":"첫 화면 사진 id"}
- 세 시안의 layout · palette · photo는 서로 다르게 고릅니다. 기관 유형과 설명에 어울리는 것을 고릅니다.
${fams ? `- 계열(layout): ${fams}\n` : ''}${pals ? `- 팔레트(palette): ${pals}\n` : ''}${photos ? `- 첫 화면 사진(photo, 분위기 사진 — 사람 장면 우선): ${photos}\n` : ''}${A(K.nav).length ? `- 머리글(head): ${K.nav.map(x => `${x[0]}(${x[1]})`).join(', ')} / 바닥글(foot): ${A(K.footer).map(x => `${x[0]}(${x[1]})`).join(', ')}\n` : ''}- 샘플 사진은 분위기 사진입니다. 사진에 강사 · 수강생 · 합격자 이름이나 실제 시설처럼 보이는 설명을 붙이지 않습니다.`; }
  if (typeof CL !== 'undefined' && typeof CL.call === 'function') { const cb = CL.call; CL.call = function (o) {
    try { if (o && typeof o.system === 'string' && W.want3 && o.system.startsWith('당신은 교육기관 홈페이지 기획자') && !/지금은 (섹션 하나만|메뉴만)/.test(o.system) && !o.system.includes('추가 지침(v34.5 디자인 축)')) o = { ...o, system: o.system + designSys() }; } catch (e) { }
    return cb.call(CL, o); }; }

  /* ═════════ 2) 말로 고치기 의도 ═════════ */
  const CARDW = [[/(목록형|리스트|목록으로)/, 'list', '목록형'], [/(사진형|사진\s*카드)/, 'photo', '사진형'], [/(가격\s*강조|가격형|가격이\s*보이게)/, 'price', '가격 강조'], [/(일정형|일정\s*중심|날짜)/, 'schedule', '일정형'], [/(큰\s*썸네일|크게\s*보이게)/, 'big', '큰 썸네일'], [/(표형|표로|표\s*형태)/, 'table', '표형']];
  const HEADW = [[/(투명|사진\s*위)/, 'overlay'], [/(흰\s*바탕|하얗|흰색|고정)/, 'solid'], [/(공지\s*띠|공지)/, 'notice'], [/(전화|연락처|신청\s*버튼)/, 'contact'], [/(떠\s*있|플로팅|둥둥)/, 'float']];
  const FOOTW = [[/(어둡|큰\s*기관명|크게)/, 'mega'], [/(신청\s*띠|신청)/, 'cta'], [/(사업자|정보\s*표)/, 'biz'], [/(최소|간단|심플|작게)/, 'min'], [/(링크|열|연락처)/, 'cols']];
  X.talkQ = W.talkQ = /(매거진|잡지|(사진|이미지)\S*\s*(을|를)?\s*(더\s*)?(크게|키워|가득|꽉|시원)|큰\s*사진|공공\s*기관|관공서|기관\S*\s*(답게|처럼|스럽게)|어둡|다크|카드\S*\s*(을|를)?\s*\S*(목록형|리스트|사진형|가격|일정형|썸네일|표형|표로)|머리글|헤더|바닥글|푸터|계열|레이아웃|팔레트|색\s*조합|벤토|포털|모자이크|콜라주|사이드\s*메뉴|게시판형|신문형)/;
  /* 머리글 · 바닥글 종류(S1). HPS.kinds는 hpsec-hero가 {hero, cta}로 덮어쓰므로 이름표를 여기에도 둔다 */
  const NAVK = [['overlay', '사진 위 투명'], ['solid', '흰 바탕 고정'], ['notice', '공지 띠 + 흰 바탕'], ['contact', '전화 · 신청 버튼'], ['float', '떠 있는 상자']];
  const FOOTK = [['mega', '어두운 바탕 · 큰 기관명'], ['cta', '신청 띠와 이어짐'], ['biz', '사업자 정보 표'], ['min', '최소형'], ['cols', '링크 열 · 연락처']];
  const kinds = grp => { const K = (window.HPS && HPS.kinds) || {}; const L = A(K[grp === 'nav' ? 'nav' : 'footer']); return L.length ? L : grp === 'nav' ? NAVK : FOOTK; };
  const kindName = (grp, id) => (kinds(grp).find(x => x[0] === id) || [])[1] || id;
  const setLayout = (x, id) => { if (window.HPL && HPL.apply) HPL.apply(x, id); else x.layout = id; if (x.hps) { delete x.hps.head; delete x.hps.foot; delete x.hps.mm; delete x.hps.ownH; delete x.hps.ownF; } return x; };
  function talkX(s, cur, loose) {
    const clauses = String(s).split(/\s*(?:,|，|\.|·|그리고|하고\s|또\s|\s및\s)\s*/).filter(Boolean); const rest = []; const P = { steps: [], fns: [], msg: '' };
    const step = (l, f) => { P.steps.push(l); P.fns.push(f); }; const ty = tyKey(); const L = hasL();
    const fams = L ? HPL.list() : []; const curL = cur && cur.layout; const curTh = cur && (cur.theme || cur.hpTheme);
    const famStep = (id, why) => { if (!L || !HPL.fam[id]) return false; if (curL === id) { P.msg = `이미 「${famName(id)}」 계열입니다.`; return true; } step(`계열을 「${famName(id)}」(으)로${why ? ` — ${why}` : ''}`, x => setLayout(x, id)); return true; };
    const thStep = id => { if (!id || !window.HPT || !thList().includes(id) || curTh === id) return; step(`테마를 「${thName(id)}」(으)로`, x => { HPT.apply(x, id, { keepColor: false, force: true }); x.hpTheme = id; return x; }); };
    const palStep = (mood, th) => { if (!hasC()) return; const now = cur && cur.hpPal; const id = palPick(ty, th || curTh, cur && cur.img && cur.img.hero && cur.img.hero.stock, now ? [now] : [], mood); const p = palOf(id); if (p) step(`팔레트를 「${p.name}」(으)로`, x => HPC.apply(x, id)); };
    clauses.forEach(c => { let hit = true;
      if (/(매거진|잡지)/.test(c)) { if (!famStep('editorial', '명조 큰 제목 · 넓은 사진')) hit = false; }
      else if (/(사진|이미지)\S*\s*(을|를)?\s*(더\s*)?(크게|키워|가득|꽉|시원)|큰\s*사진/.test(c)) {
        if (L && curL !== 'fullbleed') famStep('fullbleed', '화면을 채운 첫 화면 사진');
        else step('첫 화면을 사진 위 글자형(scrim)으로 · 강좌 카드를 큰 썸네일로', x => { A(x.sections).forEach(y => { if (y.type === 'banner' && y.data) y.data.hk = 'scrim'; if (y.type === 'classes' && y.data) y.data.card = 'big'; }); return x; }); }
      else if (/(공공\s*기관|관공서|기관\S*\s*(답게|처럼|스럽게))/.test(c)) { famStep(/^(public|lifelong)$/.test(ty) ? 'bulletin' : 'portal', '공지 · 바로가기 중심'); thStep('official'); palStep('trust', 'official'); }
      else if (/(어둡|다크|검은\s*톤|블랙\s*톤)/.test(c)) { const lux = /(고급|프리미엄|세련|럭셔리|품격)/.test(c); famStep('noir', '깊은 색 바탕'); if (lux) { thStep('premium'); palStep('premium', 'premium'); } }
      else if (/(카드|강좌\s*목록|강좌)/.test(c) && CARDW.some(([re]) => re.test(c))) { const [, k, nm] = CARDW.find(([re]) => re.test(c)); const n = A(cur && cur.sections).filter(y => y.type === 'classes').length;
        if (!n) P.msg = '강좌 목록 섹션이 없어 카드 모양을 바꾸지 않았습니다.'; else step(`강좌 카드를 「${nm}」(으)로`, x => { A(x.sections).forEach(y => { if (y.type === 'classes' && y.data) y.data.card = k; }); return x; }); }
      else if (/(머리글|헤더|상단\s*메뉴)/.test(c) && HEADW.some(([re]) => re.test(c))) { const k = HEADW.find(([re]) => re.test(c))[1]; const ft = (S.settings && S.settings.footer) || {};
        if (k === 'contact' && !ft.tel) P.msg = '전화번호가 비어 있어 전화 버튼 머리글을 쓰지 않았습니다. 설정 › 홈페이지 푸터에서 전화번호를 넣어 주세요.';
        else step(`머리글을 「${kindName('nav', k)}」(으)로`, x => { x.hps = Object.assign({}, x.hps || {}, { head: k, ownH: 1 }); return x; /* v34.5 FZ(FIXLIST 25): 말로 고친 머리글은 운영자 값 — 유형 목록 자동 재배정에서 제외 */ }); }
      else if (/(바닥글|푸터)/.test(c) && FOOTW.some(([re]) => re.test(c))) { const k = FOOTW.find(([re]) => re.test(c))[1]; step(`바닥글을 「${kindName('footer', k)}」(으)로`, x => { x.hps = Object.assign({}, x.hps || {}, { foot: k, ownF: 1 }); return x; }); }
      else if (L && fams.some(f => f.name && c.includes(f.name.replace(/\s*(형|격자)$/, '')) && f.name.length >= 2) || (L && /(게시판형|신문형)/.test(c))) { const f = /(게시판형|신문형)/.test(c) ? { id: 'bulletin' } : fams.find(f2 => c.includes(f2.name.replace(/\s*(형|격자)$/, ''))); famStep(f.id); }
      else if (L && /(계열|레이아웃|배치|구조)\S*\s*(을|를)?\s*(바꿔|변경|다른|바꾸)/.test(c)) { const C = layoutCands(ty); const k = C.indexOf(curL); const id = C[(k + 1) % C.length]; famStep(id); }
      else if (/(팔레트|색\s*조합)\S*\s*(을|를)?\s*(바꿔|변경|다른|바꾸)/.test(c)) palStep(null, curTh);
      else hit = false;
      if (!hit) rest.push(c); });
    if (!P.steps.length && !P.msg) return null;
    return { steps: P.steps, fns: P.fns, msg: P.msg, rest: rest.join(' ') }; }
  W.talkX = talkX; X.talkX = talkX;
  /* Claude 도구 설명에 예시 추가 */
  if (typeof AG_TOOLS !== 'undefined') { const tl = A(AG_TOOLS).find(x => x && x.name === 'edit_homepage'); if (tl && !/매거진/.test(tl.description)) tl.description += ' 디자인 구조도 바꿉니다: "매거진 느낌으로", "사진 크게", "더 공공기관답게", "어둡고 고급스럽게", "카드를 목록형으로", "머리글 투명하게", "레이아웃 바꿔줘", "팔레트 바꿔줘".'; }

  /* ═════════ 3) 품질 점수: 샘플 사진 안내(감점 없음) ═════════ */
  function stockN(s) {
    if (!s || !window.HPSTOCK) return 0; let n = 0; try { n = HPSTOCK.count(s) || 0; } catch (e) { n = 0; }
    if (s.stockOff || typeof siteHTML !== 'function') return n;
    let key = ''; try { key = JSON.stringify([s.layout, s.theme, s.img, s.sections, s.hps]); } catch (e) { return n; }
    if (X.memo.has(key)) return Math.max(n, X.memo.get(key));
    let m = 0; try { const h = siteHTML(s); m = new Set((String(h).match(/img\/stock\/[a-z]{3}-\d{2}/g) || [])).size; } catch (e) { m = 0; }
    if (X.memo.size > 40) X.memo.clear(); X.memo.set(key, m); return Math.max(n, m); }
  X.stockN = stockN;
  W.qx = A(W.qx); W.qx.push((s, it, add) => { const n = stockN(s); if (!n) return;
    add('stock', '샘플 사진', 0, true, `샘플 사진 ${n}장 남음 — 바로 고치기에서 사진을 눌러 우리 기관 사진으로 바꾸세요(감점 없음)`, false); const x = it[it.length - 1]; if (x) { x.info = true; x.n = n; } });

  /* ═════════ 4) 숨긴 빈 섹션 되살리기(그릴 때 판정) ═════════ */
  function revive(s) {
    if (!s || !Array.isArray(s.sections) || typeof W.emptyOf !== 'function') return 0; let n = 0;
    s.sections.forEach(x => { if (!x) return; if (x.hideAuto && !x.hide) { delete x.hideAuto; return; } /* 운영자가 다시 켠 뒤 남은 표시는 지움 → 나중에 직접 숨기면 그대로 숨김 */
      if (x.hide && x.hideAuto) { let em = true; try { em = W.emptyOf(x); } catch (e) { em = true; } if (!em) { delete x.hide; delete x.hideAuto; n++; } } });
    return n; }
  X.revive = revive; W.qpre = revive;
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, ...r) => { try { revive(s); } catch (e) { } return base(s, ...r); }; window.siteHTML = siteHTML; }

  /* ═════════ 5) 예전 게시본에 머리글(hp.head) 반영 — 스튜디오를 열 때 한 번 ═════════ */
  const plainTxt = h => String(h || '').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/[​\s]+/g, '');
  /* 게시 뒤 고친 내용이 있는지: 지금 보이는 섹션 제목 · 메뉴 이름이 게시본 글에 모두 있어야 '같음' */
  function sameAsPub(s, hp) {
    const tx = plainTxt(hp.home); if (!tx) return false;
    const T = A(s.sections).filter(x => x && !x.hide && x.data).map(x => String(x.data.title || '').replace(/[​\s]+/g, '')).filter(t => t.length >= 2);
    if (T.some(t => !tx.includes(plainTxt(E(t))))) return false;
    const M = A(s.menus).filter(m => m && m.on !== false).map(m => String(m.l || '')); const PM = A(hp.menus).map(m => String(m.l || ''));
    /* v34.5 FZ: 게시본 메뉴 이름은 유형별 이름(HPS.menuName — 예: 평생 '커뮤니티' → '학습 동아리')으로 바뀌어 저장되므로 같은 규칙으로 맞춰 비교한다(없으면 고친 것으로 잘못 보고 이전을 건너뛰었다) */
    const mn = l => { try { return window.HPS && typeof HPS.menuName === 'function' ? String(HPS.menuName(l)) : l; } catch (e) { return l; } };
    return M.length === PM.length && M.every((l, i) => l === PM[i] || mn(l) === PM[i]); }
  function migHead() {
    if (X.migDone) return; if (!S || !S.org || !S.site || !S.lsite || !S.lsite.pub || !S.lsite.pub.hp) return;
    const hp = S.lsite.pub.hp; if (Object.prototype.hasOwnProperty.call(hp, 'head') || S.site.hpHeadMig) { X.migDone = true; return; }
    if (!S.site.published || typeof window.smHp !== 'function' || !window.HPS) return; X.migDone = true;
    if (!sameAsPub(S.site, hp)) { S.site.hpHeadMig = 'skip'; S.site.hpHeadMigAt = S.lsite.pubAt || ''; save(); return; }
    let nh = null; try { nh = window.smHp(); } catch (e) { console.error('hpw2 mig', e); }
    if (!nh || typeof nh !== 'object') { X.migDone = false; return; }
    S.lsite.pubHpPrev = hp; nh.mig = typeof nowStr === 'function' ? nowStr() : ''; S.lsite.pub.hp = nh; /* 학습 사이트 게시본(강좌 · 회원 등)은 건드리지 않고 홈페이지 부분만 */
    S.site.hpHeadMig = nh.mig || 'done'; S.site.hpHeadMigAt = S.lsite.pubAt || '';
    try { if (typeof logAudit === 'function') logAudit('게시된 홈페이지 머리글 자동 반영(v34.5 · 글 · 섹션 그대로)'); } catch (e) { }
    save(); try { toast('게시된 홈페이지에 새 머리글을 반영했습니다(글 · 섹션은 그대로).', 'ok'); } catch (e) { } }
  X.migHead = migHead; X.sameAsPub = sameAsPub;
  const migOn = () => S && S.site && S.site.hpHeadMig && !S.site.hpHeadMigSeen && S.lsite && (S.lsite.pubAt || '') === (S.site.hpHeadMigAt || '');
  function migNote() {
    if (!S || !S.site || typeof CUR === 'undefined' || CUR.tab !== 'site') return; const pg = $('#main .sl-page'); if (!pg || pg.querySelector('.hpw2-mig')) return;
    if (S.site.hpHeadMig && S.lsite && (S.lsite.pubAt || '') !== (S.site.hpHeadMigAt || '') && S.lsite.pubHpPrev) { delete S.lsite.pubHpPrev; } /* 다시 게시했으면 보관본은 버림 */
    if (!migOn() || S.site.hpHeadMig === 'undone') return; const skip = S.site.hpHeadMig === 'skip';
    const h = `<p class="hpw2-mig" role="status">${skip ? '게시 뒤 고친 내용이 있어 새 머리글을 자동으로 반영하지 않았습니다. [게시하기]를 누르면 함께 반영됩니다.' : '게시된 홈페이지에 새 머리글(메뉴 · 공지 띠)을 반영했습니다. 글 · 섹션은 게시본 그대로입니다.'}
      ${!skip && S.lsite.pubHpPrev ? '<button type="button" class="btn sm ghost" data-act="hpw2-mig-undo">되돌리기</button>' : ''}<button type="button" class="btn sm ghost" data-act="hpw2-mig-x" aria-label="안내 닫기">닫기</button></p>`;
    const at = pg.querySelector('.hpw-cta') || pg.querySelector('.sb-st') || pg.querySelector('.sl-h'); if (at) at.insertAdjacentHTML('afterend', h); else pg.insertAdjacentHTML('afterbegin', h); }
  ACT['hpw2-mig-undo'] = () => { if (!S.lsite || !S.lsite.pubHpPrev || !S.lsite.pub) { toast('되돌릴 게시본이 없습니다.', 'warn'); return; } S.lsite.pub.hp = S.lsite.pubHpPrev; delete S.lsite.pubHpPrev; S.site.hpHeadMig = 'undone';
    try { logAudit('게시된 홈페이지 머리글 자동 반영 되돌리기'); } catch (e) { } save(); render(); toast('게시본을 이전 상태로 되돌렸습니다.', 'ok'); };
  ACT['hpw2-mig-x'] = () => { S.site.hpHeadMigSeen = 1; if (S.lsite) delete S.lsite.pubHpPrev; save(); const n = $('.hpw2-mig'); if (n) n.remove(); };
  if (typeof AFTER !== 'undefined') AFTER.push(() => { try { if (!S || !S.org) return; migHead(); if (S.site) revive(S.site); migNote(); } catch (e) { console.error('hpw2', e); } });
  if (!document.getElementById('hpw2css')) { const st = document.createElement('style'); st.id = 'hpw2css';
    st.textContent = '.hpw2-mig{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 12px;padding:10px 14px;border:1px solid var(--line,#E4E7EE);border-radius:10px;background:var(--bg2,#F7F8FB);font-size:13.5px;line-height:1.5;color:var(--ink,#1F2433)}.hpw2-mig .btn{margin-left:auto}.hpw2-mig .btn+.btn{margin-left:0}.hpw-ql li em:only-child,.hpw-ql li em{white-space:nowrap}';
    document.head.appendChild(st); }
  if (typeof COVER !== 'undefined') COVER.push(['[v34.5] AI 빌더 — 시안 3개가 계열 · 테마 · 팔레트 · 첫 화면 사진을 서로 다르게 고름 · 말로 고치기(매거진 · 사진 크게 · 공공기관답게 · 어둡고 고급스럽게 · 카드 · 머리글) · 샘플 사진 안내 · 숨긴 빈 섹션 되살리기 · 게시본 머리글 이전', 'site', '']);
})();
