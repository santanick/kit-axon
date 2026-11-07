/* v34.3 tpl-d — 템플릿 확장(요원 T4): ① siteFromTpl이 tp.theme · tp.hero · tp.deco를 반영 ② public(공공기관) 템플릿 ③ 갤러리(v34 공통 틀)
   대표님(2026-11-08): "각 유형별로 15개씩 고를 수 있도록 확장해서 만들어 … 디자인 완성도 가장 높게"
   - 다른 요원(tpl-a~c)은 TPL.push({ …, theme, hero, deco })로 값만 넣는다. 적용은 이 파일이 한 곳에서 한다.
     theme: HPT 테마 id(clean · premium · warm · official · tech · kids · campus · senior) — 템플릿의 대표 색(tp.color)은 유지(hpColorLock)
     hero: 첫 화면 배치 center | split | bg → 첫 배너 data.hero
     deco: 템플릿 전용 짧은 CSS(테마가 그대로일 때만 미리보기 · 게시본 <style>에 덧붙임) */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function') return;
  const HOK = /^(center|split|bg)$/;
  const hasHPT = id => !!(window.HPT && typeof HPT.apply === 'function' && (typeof HPT.has === 'function' ? HPT.has(id) : true));
  /* ── siteFromTpl 감싸기: 테마 · 첫 화면 배치 ── */
  { const base = siteFromTpl; siteFromTpl = tp => { const s = base(tp);
    try {
      if (tp && tp.theme && hasHPT(tp.theme)) HPT.apply(s, tp.theme, { color: /^#[0-9a-f]{6}$/i.test(tp.color || '') ? tp.color : undefined });
      if (tp && tp.hero && HOK.test(tp.hero)) { const b = (s.sections || []).find(x => x && x.type === 'banner'); if (b) { b.data = b.data || {}; b.data.hero = tp.hero; } }
    } catch (e) { console.error('tpl-d siteFromTpl', e); }
    return s; }; window.siteFromTpl = siteFromTpl; }
  /* ── 템플릿 전용 장식 CSS: 템플릿 테마가 그대로일 때만 ── */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
    try { const tp = s && s.tpl ? TPL.find(t => t.id === s.tpl) : null; if (tp && tp.deco && (!tp.theme || s.theme === tp.theme)) return h.replace('</style>', String(tp.deco).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('tpl-d deco', e); }
    return h; }; window.siteHTML = siteHTML; }
  window.TPD = { ready: 1 };
})();
