/* v34.2 lhpth — 게시된 학습자 홈: 홈페이지 테마(hpth.js)에 맞춰 바깥 틀(헤더 가입 버튼 · 가입 띠 · 활성 메뉴) 색을 맞춘다.
   홈페이지 본문은 스튜디오가 만든 HTML · CSS(게시본 hp.home · hp.css)를 그대로 Shadow DOM에 넣으므로(lmerge.js) 미리보기와 같은 결과다.
   게시본 hp.theme = { id, a(포인트), on(포인트 위 글자), at(밝은 바탕 위 포인트 글자), as(옅은 포인트), bg, alt, ink, r, br } — 대비는 스튜디오에서 4.5:1 이상으로 맞춰 둔다. */
'use strict';
(() => {
  const ok = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const ID = /^[a-z]{2,16}$/;
  function paint() {
    try { const s = typeof SITE === 'function' ? SITE() : null; const T = s && s.hp && s.hp.theme; const b = document.body; if (!b) return;
      const on = !!(T && ID.test(T.id || '') && ok(T.a) && ok(T.on));
      [...b.classList].filter(c => /^hpt-/.test(c)).forEach(c => { if (!on || (c !== 'hpt-on' && c !== 'hpt-' + T.id)) b.classList.remove(c); });
      if (!on) { ['--hpt-a', '--hpt-on', '--hpt-at', '--hpt-as', '--hpt-br'].forEach(k => b.style.removeProperty(k)); return; }
      b.classList.add('hpt-on', 'hpt-' + T.id); b.style.setProperty('--hpt-a', T.a); b.style.setProperty('--hpt-on', T.on);
      b.style.setProperty('--hpt-at', ok(T.at) ? T.at : T.a); b.style.setProperty('--hpt-as', ok(T.as) ? T.as : '#F1F3F8'); b.style.setProperty('--hpt-br', Math.min(999, Math.max(0, +T.br || 10)) + 'px');
    } catch (e) { console.error('lhpth', e); } }
  if (typeof lrender === 'function') { const base = lrender; lrender = (...a) => { const r = base(...a); paint(); return r; }; }
  window.addEventListener('hashchange', () => setTimeout(paint, 0));
  document.addEventListener('DOMContentLoaded', paint);
})();
