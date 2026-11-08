/* v25 허용 목록 HTML 정화기 — 운영자가 쓴 홈페이지 · 코드 블럭 · 리치 텍스트를 학습자 화면에 넣기 전에 반드시 거친다.
   차단 목록(옛 cleanHTML · c2Clean)은 java&#9;script: · noscript/template · style 오버레이 같은 우회에 약해서 '허용한 것만 남기는' 방식으로 바꾼다.
   - 태그 · 속성은 허용 목록만, 이벤트 속성(on*) · is · srcdoc(코드 블럭 iframe 제외) 제거
   - URL은 제어문자를 지운 뒤 new URL()로 해석해 http · https · mailto · tel · #(+ 이미지 data:image) 만 허용
   - style 속성은 expression · javascript: · @import · behavior · position:fixed(화면 덮기 피싱) · 외부 url() 제거
   - iframe은 영상 · 지도 주소만(+ 코드 블럭 srcdoc은 같은 출처 권한 없이 sandbox 강제), target=_blank는 rel=noopener noreferrer
   CSP(script-src 'self')가 1차 방어, 이 정화기가 2차 방어다. */
(function () {
  'use strict';
  const T = new Set(('a abbr address article aside audio b bdi bdo blockquote br button caption cite code col colgroup data dd del details dfn div dl dt em ' +
    'figcaption figure footer h1 h2 h3 h4 h5 h6 header hgroup hr i iframe img input ins kbd label li main mark nav ol optgroup option p picture pre q rp rt ruby ' +
    's samp section select small source span strong sub summary sup table tbody td textarea tfoot th thead time tr track u ul var video wbr ' +
    'svg g path circle rect line polyline polygon ellipse defs lineargradient radialgradient stop use symbol title desc text tspan clippath mask pattern').split(' '));
  const DROP = new Set('script style template noscript object embed applet base link meta frame frameset foreignobject math form param xmp plaintext noembed noframes portal'.split(' '));
  const ATTR = new Set(('class id title lang dir role tabindex hidden style alt width height colspan rowspan scope headers align valign target rel name type value placeholder for ' +
    'checked disabled readonly maxlength min max step loading decoding fetchpriority controls autoplay muted loop playsinline poster datetime open start reversed span label selected ' +
    'multiple rows cols href src srcset sizes media kind srclang allow allowfullscreen frameborder referrerpolicy sandbox download').split(' '));
  const SVGA = /^(?:viewbox|d|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|stroke-dashoffset|stroke-miterlimit|fill-rule|clip-rule|fill-opacity|stroke-opacity|opacity|cx|cy|r|rx|ry|x|y|x1|x2|y1|y2|points|transform|xmlns|xmlns:xlink|xlink:href|preserveaspectratio|offset|stop-color|stop-opacity|gradientunits|gradienttransform|clip-path|mask|font-size|font-family|font-weight|text-anchor|dominant-baseline|dx|dy|focusable|version|patternunits)$/;
  const URLA = new Set(['href', 'src', 'xlink:href', 'poster', 'cite', 'srcset', 'action', 'formaction', 'background', 'data']);
  const IFR = /^(?:www\.youtube\.com|www\.youtube-nocookie\.com|youtube\.com|player\.vimeo\.com|www\.google\.com|maps\.google\.com|map\.naver\.com|map\.kakao\.com|tv\.naver\.com|serviceapi\.nmv\.naver\.com|forms\.gle|docs\.google\.com)$/;
  const INPUT_OK = new Set(['text', 'search', 'email', 'checkbox', 'radio', 'number', 'date', 'range', 'button']);
  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
  function okURL(v, img) {
    const s = clean(v); if (!s) return true; if (s[0] === '#') return true;
    if (/^data:/i.test(s)) return !!img && /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(s);
    try { const u = new URL(s, location.href); return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol) || (img && u.protocol === 'blob:'); } catch (e) { return false; }
  }
  function okStyle(v) {
    let s = String(v || '');
    if (/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding|@import|<|position\s*:\s*fixed/i.test(s.replace(/\\/g, ''))) return null;
    s = s.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (m, q, u) => okURL(u, true) && !/^https?:\/\//i.test(clean(u)) || /^https:\/\//i.test(clean(u)) ? m : 'none');
    return s.slice(0, 2000);
  }
  function scrub(root, o) {
    const walk = el => {
      for (const n of [...el.children]) {
        const tag = n.localName.toLowerCase();
        if (DROP.has(tag)) { n.remove(); continue; }
        if (!T.has(tag)) { n.replaceWith(...n.childNodes); continue; }
        const isSvg = n.namespaceURI === 'http://www.w3.org/2000/svg';
        for (const a of [...n.attributes]) {
          const k = a.name.toLowerCase(); const v = a.value;
          const data = /^data-[\w-]+$/.test(k) && o.data; const aria = /^aria-[\w-]+$/.test(k);
          if (k.startsWith('on') || k === 'is' || k === 'srcdoc' && !(tag === 'iframe' && o.code)) { n.removeAttribute(a.name); continue; }
          if (!(ATTR.has(k) || data || aria || (isSvg && SVGA.test(k)) || (k === 'srcdoc' && tag === 'iframe' && o.code))) { n.removeAttribute(a.name); continue; }
          if (URLA.has(k)) { const img = tag === 'img' || tag === 'source' || tag === 'video' || k === 'poster';
            const ok = k === 'srcset' ? v.split(',').every(p => okURL(p.trim().split(/\s+/)[0], true)) : okURL(v, img);
            if (!ok || (isSvg && /^(?:xlink:)?href$/.test(k) && !/^#/.test(clean(v)))) n.removeAttribute(a.name); continue; }
          if (k === 'style') { const s = okStyle(v); if (s == null) n.removeAttribute('style'); else if (s !== v) n.setAttribute('style', s); }
        }
        if (tag === 'a' && n.getAttribute('target')) { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
        if (tag === 'button') n.setAttribute('type', 'button');
        if (tag === 'input' && !INPUT_OK.has(String(n.getAttribute('type') || 'text').toLowerCase())) { n.remove(); continue; }
        if (tag === 'iframe') {
          const src = n.getAttribute('src'); let host = ''; try { host = src ? new URL(clean(src), location.href).host : ''; } catch (e) { }
          if (n.hasAttribute('srcdoc') && o.code) n.setAttribute('sandbox', 'allow-scripts allow-popups');
          else if (src && IFR.test(host) && /^https:/i.test(clean(src))) { n.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups'); n.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); n.setAttribute('loading', 'lazy'); }
          else { n.remove(); continue; }
        }
        walk(n);
      }
    };
    walk(root);
  }
  /* html → 정화된 html. o.data: data-* 허용(홈페이지 섀도 DOM) · o.code: 코드 블럭 srcdoc iframe 허용 */
  window.safeHTML = function (html, o = {}) {
    if (html == null || html === '') return '';
    const d = new DOMParser().parseFromString(`<!doctype html><body><div id="__r">${String(html)}</div>`, 'text/html');
    const r = d.getElementById('__r'); if (!r) return ''; scrub(r, o); return r.innerHTML;
  };
  /* 운영자 CSS(섀도 DOM 안) — </style 탈출 · @import · expression · javascript: 제거 */
  window.safeCSS = css => String(css || '').replace(/<\/?\s*style/gi, '').replace(/@import[^;]*;?/gi, '').replace(/expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/gi, '').slice(0, 200000);
  /* 링크 하나 */
  window.safeURL = (u, img) => okURL(u, img) ? clean(u) : '#';
})();
