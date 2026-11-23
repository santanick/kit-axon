/* v45 onb45 — 가입 ② 홈페이지 템플릿 선택 · S.onb 판정 · 재방문 이어가기 (개발 2)
   대표님(2026-11-23): 「3초 간편 회원가입 후 → 자신의 기관 선택 → 홈페이지 템플릿 선택 → 어드민 진입으로 심플하게」
   - S.onb = { v: 45, tpl: 'pending' | 'picked' | 'later', at, done } — 새 동선(① 기관 화면)으로 만든 기관에만 붙는다(FLOW D5).
     기존 기관(v44 이전, S.onb 없음)과 createOrg()를 직접 부르는 시험은 ② 없이 그대로 대시보드로 간다.
   - 진입점: ① 화면이 createOrg 뒤에 window.onbStart()를 부르거나, createOrg 앞에 UI.onbNew = 1을 둔다(둘 중 하나면 된다. 두 번 불러도 한 번만 기록).
   - render 감싸기: S.onb.tpl === 'pending'이면 어드민 대신 ② 화면 — 새로고침 · 재방문 · 다른 브라우저(운영: 서버 문서)에서도 ②로 이어진다.
   - ②의 갤러리는 VIEWS.site(tpl-d 갤러리 + hpgal 썸네일)를 그대로 쓰고, 「이 템플릿으로 시작」(tpd-use)과 「나중에 고를게요」가 onbFinish로 끝낸다.
   - 시작 가이드: onbFinish가 S.bld.steps.site.done = true(ux.js 단계 이름 「홈페이지 만들기」). */
(function () {
  'use strict';
  const A = v => Array.isArray(v) ? v : [];
  const pending = () => !!(typeof S !== 'undefined' && S && S.org && S.onb && S.onb.tpl === 'pending');
  const jo = (w, a, b) => { const c = String(w || '').slice(-1).charCodeAt(0) - 44032; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
  const tpOf = id => (typeof TPL !== 'undefined' ? A(TPL).find(t => t.id === id) : null) || null;
  const rec = () => { try { return A(tplFor(S.org.type))[0] || null; } catch (e) { return null; } };
  const recName = () => { const t = tpOf(S.site && S.site.tpl) || rec(); return t ? t.name : ''; };

  /* ── S.onb 기록 ── */
  const ONB = { sig: '', inR: 0 };
  function onbStart() {
    if (typeof S === 'undefined' || !S || !S.org) { if (typeof UI !== 'undefined') UI.onbNew = 1; return false; } /* 운영: 서버 응답 전이면 createOrg 감싸기에서 다시 */
    if (S.onb) return false;
    S.onb = { v: 45, tpl: 'pending', at: today() };
    if (typeof UI !== 'undefined') { delete UI.onbNew; delete UI.tpdT; delete UI.tpdF; delete UI.tpdQ; delete UI.onbSel; UI.siteGallery = false; }
    try { save(); } catch (e) { console.error('onb45 save', e); }
    /* v45 보완: createOrg 안에서 slim.js가 대시보드를 먼저 그리므로 바로 ②로 다시 그린다(깜빡임 0) */
    if (!ONB.inR && !document.getElementById('onbTpl')) { try { render(); } catch (e) { console.error('onb45 render', e); } }
    return true;
  }
  window.onbStart = onbStart;
  if (typeof createOrg === 'function') { const base = createOrg; createOrg = (...a) => { const r = base(...a);
    const after = () => { try { if (typeof UI !== 'undefined' && UI.onbNew && S && S.org) onbStart(); } catch (e) { console.error('onb45 start', e); } };
    if (r && typeof r.then === 'function') return r.then(v => { after(); return v; }); after(); return r; }; }

  /* ── ② 화면 ── */
  /* 시안: plan/v45/design/mock/tpl.html · png/tpl-*.png — 색은 토큰 이름으로만(dds.css 추천 A 토큰) */
  const CSS = `body.mode-onb{background:var(--surface,#fff)}
.ob45{min-height:100vh;background:var(--surface,#fff);color:var(--n900,#181D1A);display:flex;flex-direction:column}
.ob45-top{position:sticky;top:0;z-index:5;background:var(--surface,#fff);border-bottom:1px solid var(--line,#E4E8E6)}
.ob45-tr{display:flex;align-items:center;gap:16px;max-width:1360px;margin:0 auto;padding:14px 40px;box-sizing:border-box}
.ob45-tr .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;flex:1;min-width:0}
.ob45-tr .logo{width:32px;height:32px;border-radius:9px;background:var(--pr,#3A6A4F);color:var(--on-pr,#fff);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex:none}
.ob45-st{display:flex;align-items:center;gap:10px;list-style:none;margin:0;padding:0;font-size:14px;font-weight:600;color:var(--n500,#636D68)}
.ob45-st li{display:flex;align-items:center;gap:8px}
.ob45-st i{width:24px;height:24px;border-radius:99px;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800;background:var(--s100,#E3ECE6);color:var(--t-mag,#2D5640)}
.ob45-st li[aria-current] {color:var(--n900,#181D1A);font-weight:700}
.ob45-st li[aria-current] i{background:var(--pr,#3A6A4F);color:var(--on-pr,#fff)}
.ob45-st .ln{width:36px;height:2px;background:var(--pr,#3A6A4F);border-radius:2px}
.ob45-ac{flex:1;display:flex;justify-content:flex-end;align-items:center;gap:10px;font-size:14px;color:var(--n500,#636D68);min-width:0}
.ob45-ac span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ob45-ac em{width:32px;height:32px;border-radius:99px;background:var(--n100,#F2F4F3);display:grid;place-items:center;font-style:normal;font-weight:700;color:var(--n700,#343B37);font-size:13px;flex:none}
.ob45-m{flex:1;width:100%;max-width:1360px;margin:0 auto;padding:40px 40px 140px;box-sizing:border-box}
.ob45-ms{display:none}
.ob45-hd{display:flex;align-items:flex-end;gap:24px;margin-bottom:12px;padding:0 16px}
.ob45-hd>div{flex:1;min-width:0}
.ob45-eb{font-size:14px;font-weight:700;color:var(--t-mag,#2D5640);margin:0}
.ob45-hd h1{font-size:36px;font-weight:800;letter-spacing:-.03em;line-height:1.2;margin:8px 0 0;outline:0}
.ob45-hd p.ob45-sub{font-size:16px;color:var(--t-sub,#4D5551);margin:10px 0 0}
.ob45-later{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:600;color:var(--n700,#343B37);padding:10px 14px;border-radius:10px;border:1px solid var(--line,#E4E8E6);background:var(--surface,#fff);cursor:pointer;flex:none}
.ob45-later:hover{border-color:var(--n300,#CFD5D2)}
.ob45-m .sl-page>.sl-h{display:none}
.ob45 .tpd-c.ob45-on{box-shadow:0 0 0 2px var(--pr,#3A6A4F),var(--sh3)}
.ob45 .ob45-pick{position:absolute;right:12px;top:12px;width:28px;height:28px;border-radius:99px;background:var(--pr,#3A6A4F);color:var(--on-pr,#fff);display:grid;place-items:center;z-index:4;font-size:15px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.ob45 .tpd-c.ob45-on .tpd-now{right:48px}
.ob45-f{position:fixed;left:0;right:0;bottom:0;z-index:6;background:var(--surface,#fff);border-top:1px solid var(--line,#E4E8E6);box-shadow:0 -6px 20px rgba(24,29,26,.05)}
.ob45-fi{max-width:1360px;margin:0 auto;padding:14px 56px calc(14px + env(safe-area-inset-bottom));box-sizing:border-box;display:flex;align-items:center;gap:12px}
.ob45-sel{margin-right:auto;font-size:14px;color:var(--t-sub,#4D5551);min-width:0}
.ob45-sel b{color:var(--n900,#181D1A)}
.ob45-fi .btn{white-space:nowrap}
.ob45-empty{border:1px solid var(--line,#E4E8E6);border-radius:16px;padding:32px;text-align:center;color:var(--t-sub,#4D5551)}
@media (max-width:700px){.ob45-tr{padding:12px 16px}.ob45-st,.ob45-ac span{display:none}
.ob45-m{padding:20px 16px 150px}.ob45-hd{padding:0}.ob45-hd h1{font-size:26px}.ob45-hd p.ob45-sub{font-size:15px}.ob45-eb{display:none}.ob45-hd{flex-direction:column;align-items:flex-start;gap:12px}.ob45-later{font-size:14px;padding:8px 12px}
.ob45-ms{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:var(--n500,#636D68);margin:0 0 16px}
.ob45-ms b{flex:1;height:6px;border-radius:6px;background:var(--n100,#F2F4F3);overflow:hidden}.ob45-ms b i{display:block;width:100%;height:100%;background:var(--accent,#4E7D62)}
.ob45-fi{padding:12px 16px calc(8px + env(safe-area-inset-bottom));flex-wrap:wrap;gap:4px}.ob45-sel{display:none}
.ob45-fi .btn{flex:1 1 100%;justify-content:center}.ob45-fi .btn.ghost{order:2;border:0;background:none;color:var(--t-sub,#4D5551);box-shadow:none}}`;
  const css = () => { if (document.getElementById('onb45css')) return; const st = document.createElement('style'); st.id = 'onb45css'; st.textContent = CSS; document.head.appendChild(st); };

  function galHTML() {
    if (typeof UI !== 'undefined') { UI.siteGallery = true; UI.smT = 'home'; }
    let h = '';
    try { h = typeof VIEWS !== 'undefined' && typeof VIEWS.site === 'function' ? VIEWS.site() : ''; } catch (e) { console.error('onb45 gallery', e); h = ''; }
    if (typeof h !== 'string' || h.indexOf('tpd-g') < 0) { try { h = window.TPD && typeof TPD.gallery === 'function' ? TPD.gallery() : ''; } catch (e) { console.error('onb45 tpd', e); h = ''; } }
    return String(h || '')
      .replace(/<button[^>]*data-act="tpl-back"[^>]*>[^<]*<\/button>/g, '') /* 「편집으로 돌아가기」 숨김 — 아직 편집할 사이트가 없다 */
      .split('<span class="tpd-now">사용 중</span>').join('<span class="tpd-now">추천</span>') /* 가입 때 미리 적용된 추천 1번 */
      .split(' (사용 중)"').join(' (추천)"');
  }
  const tyName = () => { const k = S.org.type; return k === 'k12' || k === 'adult' ? '학원' : String((TYPES[k] || {}).name || '기관').replace(/\s*\(.*\)\s*/g, '').trim() || '기관'; };
  const selId = () => { const L = [...document.querySelectorAll('#onbTpl .tpd-c')].map(c => c.dataset.v); const u = UI.onbSel; if (u && tpOf(u)) return u; return (S.site && S.site.tpl) || (rec() || {}).id || L[0] || ''; };
  function paintSel() { const id = selId(); const tp = tpOf(id);
    document.querySelectorAll('#onbTpl .tpd-c').forEach(c => { const on = c.dataset.v === id; c.classList.toggle('ob45-on', on); c.setAttribute('aria-pressed', on);
      const th = c.querySelector('.tpd-th'); const pk = th && th.querySelector('.ob45-pick'); if (on && th && !pk) th.insertAdjacentHTML('beforeend', '<span class="ob45-pick" aria-hidden="true">✓</span>'); else if (!on && pk) pk.remove(); });
    const sl = document.querySelector('#onbTpl .ob45-sel'); if (sl) sl.innerHTML = tp ? `선택: <b>${esc(tp.name)}</b> · 고르지 않으면 추천 1번이 적용됩니다` : '';
    const go1 = document.querySelector('#onbTpl [data-act=onb-use]'); if (go1) go1.dataset.v = id; }
  function renderTplStep() {
    css();
    document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ' mode-onb';
    document.body.classList.remove('mode-bld', 'b-pv', 'nav-open', 'drawer-open');
    const g = galHTML(); const has = /class="tpd-c[\s"]/.test(g); const nm = recName(); const on = String(S.org.name || '');
    const foot = has
      ? `<p class="ob45-sel" aria-live="polite"></p><button type="button" class="btn ghost" data-act="onb-later">나중에 고를게요</button><button type="button" class="btn pri" data-act="onb-use">이 템플릿으로 시작 →</button>`
      : `<button type="button" class="btn pri" data-act="onb-later">시작하기</button>`;
    $('#app').innerHTML = `<div class="ob45" id="onbTpl">
  <header class="ob45-top"><div class="ob45-tr"><div class="brand"><span class="logo">D</span><b>디디쌤 스튜디오</b></div>
    <ol class="ob45-st" aria-label="가입 진행"><li><i aria-hidden="true">✓</i>기관<span class="sr">(완료)</span></li><li class="ln" aria-hidden="true"></li><li aria-current="step"><i aria-hidden="true">2</i>홈페이지</li></ol>
    <div class="ob45-ac"><span>${esc(on)} · ${esc((TYPES[S.org.type] || {}).name || '')}</span><em aria-hidden="true">${esc([...on][0] || 'D')}</em></div></div></header>
  <main class="ob45-m" id="main" tabindex="-1">
    <div class="ob45-ms" aria-hidden="true"><span>1/2 기관</span><b><i></i></b><span>2/2 홈페이지</span></div>
    <div class="ob45-hd"><div><p class="ob45-eb">2 / 2 · 홈페이지</p><h1 tabindex="-1">${esc(tyName())} 홈페이지를 골라 주십시오</h1><p class="ob45-sub">사진 · 문구 · 색은 고른 뒤 AI SAM에게 말로 바꿀 수 있습니다. 홈페이지 메뉴에서 언제든 바꿀 수 있습니다.</p></div>
      ${has ? `<button type="button" class="ob45-later" data-act="onb-later" title="${esc(nm ? `추천 템플릿 『${nm}』${jo(nm, '이', '가')} 적용됩니다` : '추천 템플릿이 적용됩니다')}">나중에 고를게요 →</button>` : ''}</div>
    ${has ? `<div class="ob45-g">${g}</div>` : `<div class="ob45-empty" role="status">이 유형의 템플릿을 준비하고 있습니다. 추천 템플릿으로 시작합니다.</div>`}</main>
  <footer class="ob45-f"><div class="ob45-fi">${foot}</div></footer></div>`;
    paintSel();
    /* 갤러리 썸네일 · 칩 스크롤(tpl-d · hpgal의 AFTER 훅)만 실행 — 어드민용 훅(AI SAM 창 · 편집기 등)은 돌리지 않는다 */
    try { A(typeof AFTER !== 'undefined' ? AFTER : []).filter(f => /tpd-g|tpg-g|chipShow/.test(String(f))).forEach(f => { try { f(CUR); } catch (e) { console.error(e); } }); } catch (e) { console.error('onb45 after', e); }
    if (!renderTplStep.f) { renderTplStep.f = 1; const h = $('#onbTpl h1'); h && h.focus({ preventScroll: true }); }
  }
  window.renderTplStep = renderTplStep;

  /* ── 마침 ── */
  function onbFinish(k) {
    if (!pending()) return;
    if (!S.site) { const t = rec(); if (t) S.site = siteFromTpl(t); }
    S.onb.tpl = k === 'picked' ? 'picked' : 'later'; S.onb.done = today();
    try { bEnsure(); if (S.bld) { S.bld.steps = S.bld.steps || {}; S.bld.steps.site = Object.assign({}, S.bld.steps.site, { on: true, done: true }); S.bld.seen = S.bld.seen || {}; S.bld.seen.site = 1; if (S.bld.cur === 'site') S.bld.cur = ''; } } catch (e) { console.error('onb45 guide', e); }
    logAudit('가입 홈페이지 ' + (k === 'picked' ? '선택' : '추천 적용'));
    save();
    if (typeof UI !== 'undefined') { UI.siteGallery = false; delete UI.tpdT; delete UI.tpdF; delete UI.tpdQ; delete UI.onbSel; }
    renderTplStep.f = 0; CUR = { ws: 'home', tab: '' };
    try { history.replaceState(null, '', '#home'); } catch (e) { }
    render(); scrollTo(0, 0);
    toast(`${S.org.name} 스튜디오가 준비되었습니다.`, 'ok');
  }
  window.onbFinish = onbFinish;
  ACT['onb-later'] = () => onbFinish('later');
  ACT['onb-use'] = el => { const id = (el && el.dataset && el.dataset.v) || selId(); if (id) ACT['tpd-use']({ dataset: { v: id } }); };
  /* 카드를 누르면 미리 보기 시트(기존)가 열리고, 그 카드가 「선택」이 된다(시안: 테두리 + ✓ · 아래 줄 「선택: …」) */
  { const base = ACT['tpd-open']; ACT['tpd-open'] = (el, ...r) => { if (pending() && el && el.dataset && tpOf(el.dataset.v)) { UI.onbSel = el.dataset.v; try { paintSel(); } catch (e) { } } return base ? base(el, ...r) : undefined; }; }
  { const base = ACT['tpd-use']; ACT['tpd-use'] = (el, ...r) => {
    if (!pending()) return base ? base(el, ...r) : undefined;
    const tp = tpOf(el && el.dataset && el.dataset.v); if (!tp) return;
    if (typeof slClose === 'function') slClose();
    /* 기존 적용 경로(ACT['tpl-use'] + 감싸기들: siteFromTpl · hpsTplAt)는 그대로 쓰고, 그 안의 사이트 화면 이동 · 편집 안내 토스트만 잠시 막는다 */
    const g0 = go, t0 = toast; go = () => { }; toast = () => { };
    try { ACT['tpl-use']({ dataset: { v: tp.id } }); } catch (e) { console.error('onb45 tpl-use', e); } finally { go = g0; toast = t0; }
    if (!S.site || S.site.tpl !== tp.id) { try { S.site = siteFromTpl(tp); } catch (e) { console.error(e); } }
    onbFinish('picked');
  }; }

  /* 시작 가이드 「홈페이지 만들기」 설명: hpai.js(ux.js 뒤에 로드)가 d를 「AI로 홈페이지 만들기…」로 덮으므로 v45 문구를 마지막에 다시 둔다(이름은 ux.js) */
  try { const st = A(typeof BLD_STEPS !== 'undefined' ? BLD_STEPS : []).find(x => x.id === 'site'); if (st) { try { delete st.d; } catch (e) { } st.d = '템플릿 적용(가입 때) · 꾸미고 게시는 홈페이지 메뉴'; } } catch (e) { console.error('onb45 step', e); }
  /* ── 재방문 · 새로고침: pending이면 어드민 대신 ② ── */
  /* ① [다음](UI.onbNew)으로 만든 기관은 createOrg 안의 첫 render(slim.js)부터 ②로 그린다 */
  const sigOf = () => JSON.stringify([UI.tpdT || '', UI.tpdF || '', S.site && S.site.tpl, S.org.type, S.org.ed || '', innerWidth < 700]);
  { const base = render; render = (...a) => {
    try { if (typeof UI !== 'undefined' && UI.onbNew && S && S.org && !S.onb) { ONB.inR = 1; try { onbStart(); } finally { ONB.inR = 0; } } } catch (e) { console.error('onb45 start', e); }
    if (pending()) { try { const sg = sigOf(); if (document.getElementById('onbTpl') && sg === ONB.sig) return; /* createOrg의 0.8초 뒤 render 등 같은 상태 다시 그리기는 건너뛴다(썸네일 깜빡임 방지) */ ONB.sig = sg; return renderTplStep(); } catch (e) { console.error('onb45 render', e); } }
    ONB.sig = ''; return base(...a); }; }
  if (typeof COVER !== 'undefined') COVER.push(['[신규] 가입 ② 홈페이지 템플릿 선택 · 나중에 고르기 · 재방문 이어가기', 'home', '']);
})();
