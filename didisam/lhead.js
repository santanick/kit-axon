/* v36 R3 lhead — 학습 페이지 머리글(교과목 · 공지 · 커뮤니티 · 자료실 …)을 홈페이지 디자인과 하나로(대표님 2026-11-09 지시 4-2 · 평가 4-2)
   1) 모양 통일: 학습 페이지 머리글(section.sub)에 홈페이지 테마 색(hp.theme)과 제목 글꼴(hp.css의 --hd-ff · --hd-fw)을 입힌다.
      머리 메뉴는 lhpshell이 방문자 화면의 모든 페이지에서 홈페이지 머리글(hp.head)을 쓰게 바꾼다(같은 파일 2' 참고).
   2) 운영자가 사이트 편집기(hpstudio · 학습 페이지 탭)에서 바꾼 머리글: 게시본 hp.lhead = { '<페이지 키>': { t 제목, d 소개 문구, img 배경 사진,
      al 'l'|'c' 정렬, h 's'|'m'|'l' 높이, tone 'plain'|'soft'|'brand' 바탕 } }. 키 = 주소 첫 칸(shop · notice · comm …), 게시판은 comm/<게시판>.
      제목 · 소개는 목록 화면(그 키 그대로)에서만 바꾸고, 글 보기 · 결제 같은 아래 화면은 모양만 따른다.
   데이터를 바꾸지 않고 그린 결과만 다듬는다(앱 화면 body.lapp에서는 하지 않음). */
'use strict';
(() => {
  if (typeof lrender !== 'function') return;
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const okImg = u => /^(data:image\/(png|jpe?g|webp|gif);base64,[\w+/=]+|https?:\/\/[^\s"'()\\]+|img\/stock\/[\w-]+\.(webp|jpg|png))$/.test(String(u || ''));
  const okFF = v => /^[\w\s'",.-]{2,240}$/.test(String(v || ''));
  /* 페이지 키: route()는 한글 게시판 이름을 잘라 내므로 주소를 직접 읽는다 */
  function keyOf(h) { const P = decodeURIComponent(String(h == null ? location.hash : h).replace(/^#/, '') || 'home').split('/'); const a = P[0] || 'home';
    return { k: a === 'comm' && P[1] ? 'comm/' + P[1] : a, top: P.length === 1 || (a === 'comm' && P.length === 2) }; }
  window.lhKey = keyOf;
  function css() { if (document.getElementById('llhCss')) return; const st = document.createElement('style'); st.id = 'llhCss';
    st.textContent = `.sub.llh{position:relative;padding:36px 0 28px;background:var(--llh-bg,transparent);color:var(--llh-tx,inherit);isolation:isolate}
.sub.llh h1{font-family:var(--llh-ff,inherit);font-weight:var(--llh-fw,800);letter-spacing:-.02em;line-height:1.2;color:inherit;word-break:keep-all}
.sub.llh p{color:var(--llh-mu,var(--mute))}.sub.llh .crumb a{color:var(--llh-ln,inherit)}
.sub.llh .llh-d{font-size:17px;line-height:1.6;max-width:720px;margin:6px 0 0;white-space:pre-line}
.sub.llh-soft{--llh-bg:var(--llh-as,#F1F3F8)}
.sub.llh-brand{--llh-bg:var(--llh-a,#2A2B2B);--llh-tx:var(--llh-on,#fff);--llh-mu:color-mix(in srgb,var(--llh-on,#fff) 82%,transparent);--llh-ln:var(--llh-on,#fff)}
.sub.llh-img{--llh-tx:#fff;--llh-mu:rgba(255,255,255,.88);--llh-ln:#fff;background:#1B1C22 var(--llh-img) center/cover no-repeat}
.sub.llh-img::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(10,12,20,.72),rgba(10,12,20,.38) 70%,rgba(10,12,20,.25))}
.sub.llh-img.llh-c::before{background:rgba(10,12,20,.52)}
.sub.llh-c .in{text-align:center}.sub.llh-c .llh-d{margin-left:auto;margin-right:auto}
.sub.llh-s{padding:24px 0 18px}.sub.llh-s h1{font-size:clamp(24px,3vw,32px)}
.sub.llh-l{padding:96px 0 80px}.sub.llh-l h1{font-size:clamp(34px,5vw,56px)}
.sub.llh+.sec{padding-top:28px} /* 기본 높이는 예전 머리글(48 + 40)과 거의 같게 — 아래 목록 위치가 밀리지 않게 */
@media (max-width:640px){.sub.llh{padding:36px 0 30px}.sub.llh-l{padding:64px 0 52px}.sub.llh .llh-d{font-size:15px}}`;
    document.head.appendChild(st); }
  function apply() {
    const b = document.body; if (!b || b.classList.contains('lapp')) return; const lm = document.getElementById('lm'); if (!lm) return;
    const sub = lm.querySelector(':scope > section.sub'); if (!sub) return;
    let H = null; try { H = SITE().hp || null; } catch (e) { } if (!H) return; css();
    const T = H.theme || {}; const L = H.lhead || {}; const { k, top } = keyOf(); const c = (L[k] && typeof L[k] === 'object') ? L[k] : {};
    const tone = c.img && okImg(c.img) ? 'img' : ['plain', 'soft', 'brand'].includes(c.tone) ? c.tone : 'soft';
    sub.classList.add('llh'); ['plain', 'soft', 'brand', 'img'].forEach(x => sub.classList.toggle('llh-' + x, x === tone));
    sub.classList.toggle('llh-c', c.al === 'c'); sub.classList.toggle('llh-s', c.h === 's'); sub.classList.toggle('llh-l', c.h === 'l'); sub.dataset.llk = k;
    const set = (n, v) => { if (v) sub.style.setProperty(n, v); else sub.style.removeProperty(n); };
    set('--llh-a', ok6(T.a) ? T.a : ''); set('--llh-on', ok6(T.on) ? T.on : ''); set('--llh-as', ok6(T.as) ? T.as : ''); set('--llh-ln', tone === 'soft' || tone === 'plain' ? (ok6(T.at) ? T.at : '') : '');
    set('--llh-img', tone === 'img' ? `url("${c.img}")` : '');
    /* 제목 글꼴: 홈페이지 토큰(--hd-ff · --hd-fw) — 웹폰트 @font-face는 lmerge가 문서 머리에 올린다 */
    try { const C = String(H.css || ''); const ff = ([...C.matchAll(/--hd-ff:\s*([^;}]+)/g)].pop() || [])[1]; const fw = ([...C.matchAll(/--hd-fw:\s*(\d{3})/g)].pop() || [])[1];
      set('--llh-ff', ff && okFF(ff.trim()) ? ff.trim() : ''); set('--llh-fw', fw || ''); } catch (e) { }
    if (!top) return;
    const h1 = sub.querySelector('h1'); const inn = sub.querySelector('.in') || sub;
    /* 따로 정한 제목이 없으면 방문자가 누른 머리 메뉴 이름 그대로(예: 학원 '학부모 소통' 메뉴 → '커뮤니티'가 아니라 '학부모 소통') */
    let mn = ''; try { const h = '#' + k.split('/').map(encodeURIComponent).join('/'); const hs = [h, decodeURI(h)]; (H.menus || []).forEach(m => { if (!mn && hs.includes(m.href)) mn = m.l; (m.subs || []).forEach(sb => { if (!mn && hs.includes(sb.href)) mn = sb.l; }); }); } catch (e) { }
    const tt = c.t || mn;
    if (h1 && tt) { if (h1.dataset.llo == null) h1.dataset.llo = h1.textContent; h1.textContent = String(tt).slice(0, 60); const cr = sub.querySelector('.crumb'); const last = cr && cr.lastChild; const lo = String(h1.dataset.llo || '').trim();
      if (last && last.nodeType === 3 && lo) { const tx = last.textContent; const i = tx.lastIndexOf(lo); if (i >= 0 && !tx.slice(i + lo.length).trim()) last.textContent = tx.slice(0, i) + String(tt).slice(0, 60); } }
    let d = sub.querySelector('.in > p.llh-d') || [...inn.children].find(x => x.tagName === 'P' && !x.classList.contains('crumb'));
    if (c.d) { if (!d) { d = document.createElement('p'); inn.appendChild(d); } d.classList.add('llh-d'); d.textContent = String(c.d).slice(0, 200); }
    else if (d) d.classList.add('llh-d');
  }
  window.llhApply = apply;

  /* v37 P2(대표님 2026-11-10 지시 2 · 4): ① 사이트 편집기에서 학습 페이지(목록 화면) 위 · 아래에 넣은 홈페이지 섹션 — 게시본 hp.lx[키] = { pre, post }를
     머리글 아래 · 목록 아래에 붙인다(그림자 DOM + 홈페이지 CSS · 다시 정화). ② 홈페이지 · 학습 페이지의 '게시판' 섹션(.hpx-bd)을 이 기기의 최신 글로 다시 채운다
     (lcomm lcPosts — 게시판 권한 · 비공개 글 규칙 그대로, 내가 쓴 글 포함). 글 보기 #post/<id> · 글쓰기 #write/b:<게시판> · 더 보기 #comm/<게시판>은 lcomm이 처리한다. */
  const esc2 = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function lxMount() { const b = document.body; if (!b || b.classList.contains('lapp')) return; const lm = document.getElementById('lm'); if (!lm) return; let H = null; try { H = SITE().hp || null; } catch (e) { } if (!H || !H.lx) return;
    const { k, top } = keyOf(); const X = top ? H.lx[k] : null; const sig = k + '|' + (X ? 1 : 0);
    lm.querySelectorAll(':scope > .lxhost').forEach(h => { if (h.dataset.sig !== sig) h.remove(); }); if (!X || lm.querySelector(':scope > .lxhost')) return;
    const put = (html, where) => { if (!html) return; const el = document.createElement('div'); el.className = 'lxhost'; el.dataset.sig = sig; el.dataset.w = where;
      const sr = el.attachShadow({ mode: 'open' }); const css = typeof safeCSS === 'function' ? safeCSS(H.css) : ''; const body = typeof safeHTML === 'function' ? safeHTML(html, { data: true, code: true }) : '';
      sr.innerHTML = `<style>${css}.smr{background:transparent;min-height:0}</style><div class="smr lk-${esc2(H.look || 'campus')}">${body}</div>`;
      const sub = lm.querySelector(':scope > section.sub'); if (where === 'pre' && sub) sub.insertAdjacentElement('afterend', el); else lm.appendChild(el); };
    put(X.pre, 'pre'); put(X.post, 'post'); }
  function bdFill() { if (typeof lcPosts !== 'function') return; let L = null; const roots = [...document.querySelectorAll('.smhost, .lxhost')].map(h => h.shadowRoot).filter(Boolean);
    roots.forEach(r => r.querySelectorAll('section.hpx-bd').forEach(sec => { const m = sec.querySelector('a.hpx-bdm'); const h = m ? m.getAttribute('href') || '' : ''; const bid = h.startsWith('#comm/') ? decodeURIComponent(h.slice(6)) : '';
      if (!L) { try { L = lcPosts(); } catch (e) { L = []; } } const n = Math.max(1, Math.min(20, +(sec.dataset.n || 5) || 5));
      const P = L.filter(p => (bid ? p.board === bid : !['수강후기', '학습노트'].includes(p.board))).sort((a, b) => (!!b.pin - !!a.pin) || String(b.at || '').localeCompare(String(a.at || ''))).slice(0, n);
      const sig = P.map(p => p.id + (p.cmts || []).length).join(','); if (sec.dataset.fill === sig) return; sec.dataset.fill = sig; const ul = sec.querySelector('ul.hpx-bdl'); if (!ul) return;
      const tt = p => typeof lcTitle === 'function' ? lcTitle(p) : (p.title || '(내용 없음)'); const cnt = p => { const f = l => (l || []).reduce((s, r) => s + 1 + f(r.replies), 0); return f(p.cmts); };
      ul.innerHTML = P.length ? P.map(p => `<li><a href="#post/${encodeURIComponent(p.id)}"><b>${p.pin ? '<em>공지</em>' : ''}${esc2(tt(p))}</b><small>${esc2(p.own ? '나' : (p.nick || '회원'))} · ${esc2(String(p.at || '').slice(0, 10))}${cnt(p) ? ` · 댓글 ${cnt(p)}` : ''}</small></a></li>`).join('')
        : `<li class="hpx-bde">${esc2(bid && !(typeof COMM === 'function' && (COMM().boards || []).some(x => x.id === bid && (typeof lcBoardOK !== 'function' || lcBoardOK(x)))) ? '회원 전용 게시판이에요. 로그인하면 글이 보여요.' : '아직 글이 없어요. 첫 글을 남겨 주세요.')}</li>`;
      const w = sec.querySelector('a.hpx-bdw'); if (w && typeof COMM === 'function' && typeof lcBoardOK === 'function' && LR && LR.me) { const bd = (COMM().boards || []).find(x => x.id === bid); if (bd && !lcBoardOK(bd, true)) w.remove(); } })); }
  window.lhBoardFill = bdFill;
  /* v37 P4(대표님 2026-11-10 16:14 · 학습 페이지 콘텐츠 패널): 게시본 hp.lcfg[키] = { n 한 번에 보일 개수, card 'list'|'big' 카드 모양, filt 0 = 검색 칸 숨김 }을
     교과목 · 교재 목록(.shp-grid)에 입힌다. 개수를 넘는 카드는 [더 보기]로 펼치고, 검색 중에는 모두 보인다. 데이터는 바꾸지 않는다. */
  function lcApply() { const b = document.body; if (!b) return; const app = b.classList.contains('lapp'); /* v37 L2: 앱 화면에도 개수 · 검색 칸 설정은 적용(카드 모양은 앱 한 줄 카드 유지) */ const lm = document.getElementById('lm'); if (!lm) return; let H = null; try { H = SITE().hp || null; } catch (e) { }
    const { k, top } = keyOf(); const c = top && H && H.lcfg && typeof H.lcfg[k] === 'object' ? H.lcfg[k] : null; const g = lm.querySelector('.shp-grid'); if (!g) return;
    if (!document.getElementById('llcCss')) { const st = document.createElement('style'); st.id = 'llcCss'; st.textContent = `.shp-grid.llc-list{grid-template-columns:1fr}.shp-grid.llc-list .shp-card{flex-direction:row;align-items:stretch}.shp-grid.llc-list .shp-th{width:220px;flex:none;aspect-ratio:16/10;height:auto}
.shp-grid.llc-big{grid-template-columns:repeat(auto-fill,minmax(min(100%,400px),1fr));gap:24px}.shp-grid.llc-big .shp-card h3{font-size:1.25em}
.shp-grid.llc-cut .shp-card.llc-x{display:none}.llc-more{display:flex;justify-content:center;margin:20px 0 0}.llc-more button{min-height:48px;padding:0 24px}
@media (max-width:640px){.shp-grid.llc-list .shp-th{width:112px}}`; document.head.appendChild(st); }
    g.classList.toggle('llc-list', !app && !!c && c.card === 'list'); g.classList.toggle('llc-big', !app && !!c && c.card === 'big');
    const f = lm.querySelector('.shp-filt'); if (f) f.style.display = c && c.filt === 0 ? 'none' : '';
    const q = lm.querySelector('#shpQ'); const n = c && +c.n > 0 ? +c.n : 0; const cards = [...g.querySelectorAll(':scope > .shp-card')]; const cut = n && cards.length > n && !g.dataset.llcAll && !(q && q.value.trim() && !(c && c.filt === 0));
    cards.forEach((x, i) => x.classList.toggle('llc-x', !!n && i >= n)); g.classList.toggle('llc-cut', !!cut);
    let m = lm.querySelector('.llc-more'); if (cut) { if (!m) { m = document.createElement('div'); m.className = 'llc-more'; m.innerHTML = '<button type="button" class="lbtn"></button>'; g.insertAdjacentElement('afterend', m);
        m.querySelector('button').addEventListener('click', () => { g.dataset.llcAll = '1'; lcApply(); }); } const tx = `더 보기 (${cards.length - n}개 더)`; const bt = m.querySelector('button'); if (bt.textContent !== tx) bt.textContent = tx; } else if (m) m.remove(); }
  window.llcApply = lcApply;
  document.addEventListener('input', e => { if (e.target && e.target.id === 'shpQ') lcApply(); });
  { let q = 0; const tick = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; try { if (typeof window.lmMount === "function") window.lmMount(); lxMount(); bdFill(); lcApply(); } catch (e) { console.error('lhead lx', e); } }); };
    const host = () => document.getElementById('lapp') || document.body; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => new MutationObserver(tick).observe(host(), { childList: true, subtree: true }), { once: true }); else new MutationObserver(tick).observe(host(), { childList: true, subtree: true });
    addEventListener('hashchange', tick); }
  { const base = lrender; lrender = (...a) => { const r = base(...a); try { apply(); } catch (e) { console.error('lhead', e); } return r; }; }
})();
