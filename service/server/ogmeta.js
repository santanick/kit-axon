'use strict';
/* v37 L2 링크 공유 미리보기(og 메타) — learner.html을 내보낼 때 게시본(lsite.pub.hp)의 제목 · 설명 · 공유 이미지를 HTML 머리에 넣는다.
   카카오톡 · 슬랙 · 페이스북 · 네이버 미리보기 크롤러는 스크립트를 실행하지 않으므로, 학습자 스크립트(lmerge.js seo())가 넣는 것만으로는 보이지 않는다.
   Java 에디션 cmm/DdOgMeta.java와 같은 결과 바이트(같은 이스케이프 · 같은 순서 · 같은 길이 제한).
   - 게시본이 없거나 기관 번호가 없으면 원본 그대로
   - 이미지: https 주소만(data: 이미지는 크롤러가 못 읽음 · 길이 1000자 이하)
   - 검색 노출을 끈 사이트(seo.index === false)는 원본의 noindex를 그대로 두고, 켠 사이트만 index,follow로 바꾼다 */
const TID_RE = /^tn_[a-z0-9]{8,16}$/;
const one = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const attr = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const IMG_RE = /^https:\/\/[^\s"'<>\\]{4,990}$/;

/* 게시본에서 미리보기 값 뽑기(lmerge.js seo()의 홈 화면 값과 같은 규칙: 제목 = seo.title || 사이트 이름) */
function ogFields(pub) {
  if (!pub || typeof pub !== 'object') return null; const hp = pub.hp && typeof pub.hp === 'object' ? pub.hp : {}; const seo = hp.seo && typeof hp.seo === 'object' ? hp.seo : {};
  const name = one(hp.name || (pub.org && pub.org.name) || '', 80); const title = one(seo.title, 120) || name; if (!title) return null;
  const img = typeof seo.img === 'string' && IMG_RE.test(seo.img) ? seo.img : '';
  return { name, title, desc: one(seo.desc, 300), img, index: seo.index !== false };
}

function injectOg(html, f) {
  if (!f || typeof html !== 'string' || html.indexOf('</head>') < 0) return html;
  const T = [['property', 'og:type', 'website'], ['property', 'og:site_name', f.name], ['property', 'og:title', f.title], ['property', 'og:description', f.desc], ['property', 'og:image', f.img],
    ['name', 'twitter:card', f.img ? 'summary_large_image' : 'summary'], ['name', 'twitter:title', f.title], ['name', 'twitter:description', f.desc], ['name', 'description', f.desc]]
    .filter(x => x[2]).map(([k, n, v]) => `<meta ${k}="${n}" content="${attr(v)}">`).join('\n');
  let h = html.replace(/<title>[^<]*<\/title>/, () => `<title>${attr(f.title)}</title>`);
  if (f.index) h = h.replace(/<meta name="robots" content="noindex,nofollow">/, '<meta name="robots" content="index,follow">');
  const i = h.indexOf('</head>'); return h.slice(0, i) + '<!-- og: 게시본 -->\n' + T + '\n' + h.slice(i);
}

/* 요청 주소 ?t=<기관> 또는 학습자 모듈 기본 기관(LEARNER_TID) */
function tidOf(url, fallback) { let t = ''; try { t = new URL(url, 'http://x').searchParams.get('t') || ''; } catch (e) { } if (!TID_RE.test(t)) t = fallback || ''; return TID_RE.test(t) ? t : ''; }

module.exports = { ogFields, injectOg, tidOf, TID_RE };
