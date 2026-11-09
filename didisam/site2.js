/* v22 site2 — 레거시 디디쌤 가이드 기능 보완(W5 홈페이지)
   상단 메뉴 추가 · 이름 변경 · 드래그 순서 · 노출 · 지정 대상 / 하위 메뉴(세로형 12 · 와이드형 24) / 메뉴별 페이지(섹션 구성) · 이동 경로 ·
   이동 경로(브레드크럼) · 헤더 이미지 / 로고 · GNB 배경색 · 메뉴 정렬 / 브랜드 컬러 투명도 / 섹션별 디자인 스타일 · 배경색 · 정렬 /
   이미지 업로드 · 슬라이드 편집 · 동영상 4개 + 썸네일 · 지도 위치 · 코드 블럭(sandbox iframe) · 카테고리 탐색 섹션 /
   챗봇(카카오 비즈니스 채널 · 채널톡) · 푸터 스타일 · 항목 숨김 · 에스크로 / 도메인 · 이름 · 주소 · 파비콘 / 마케팅 연동 · 메뉴별 SEO · 지역 마케팅 /
   팝업 링크 · 이미지. 데이터: S.site.{gnb, foot, alpha, menus[].{id,kind,sections,subs,...}}, S.settings.{chatbot, domain, mkt, favicon, localMkt} */
'use strict';
(() => {
  const KMAP = { '홈': 'home', '클래스': 'class', '교재/교구': 'book', '커뮤니티': 'community', '공지사항': 'notice', '게시판': 'board' };
  const BASEK = ['home', 'class', 'book', 'community', 'notice', 'board'];
  const LIM = 200 * 1024; // dataURL 200KB 이하
  const STY = {
    banner: ['템플릿 기본', '컬러 배경', '이미지 배경', '좌우 분할'], slideBanner: ['템플릿 기본', '전체 폭', '카드형', '좌우 분할'],
    text: ['템플릿 기본', '기본', '카드형', '좌우 분할', '강조 배경'], image: ['템플릿 기본', '이미지 위 텍스트', '이미지 아래 텍스트', '좌우형'],
    map: ['템플릿 기본', '지도 + 정보', '정보 카드형'], notices: ['템플릿 기본', '목록형', '나열형(슬라이드)'], reviews: ['템플릿 기본', '카드형', '슬라이드형'],
    slideImage: ['템플릿 기본', '슬라이드'], classes: ['템플릿 기본', '카드'], books: ['템플릿 기본', '카드'], video: ['템플릿 기본', '썸네일 카드'], catBrowse: ['기본'], code: ['기본']
  };
  SEC.catBrowse = { n: '카테고리 탐색', max: 99 };
  const subMax = s => (s.gnb?.sub === 'wide' ? 24 : 12);
  const isOwner = () => S.me?.role === 'owner';

  /* ── 상태 정규화 ── */
  function s2norm(s) {
    if (!s || !Array.isArray(s.menus)) return s;
    s.gnb = Object.assign({ logo: '', bg: '', align: 'center', sub: 'vertical' }, s.gnb || {});
    s.foot = Object.assign({ bg: '', align: 'left', showCeo: true, showBiz: true }, s.foot || {});
    if (s.alpha == null) s.alpha = 100;
    s.menus = s.menus.map(m => Array.isArray(m) ? { l: m[0], on: m[1] !== false, access: '공개' } : m);
    if (!s.menus.some(m => (m.kind || KMAP[m.l]) === 'home')) s.menus.unshift({ l: '홈', on: true, access: '공개' });
    s.menus.forEach(m => {
      if (!m.kind) m.kind = KMAP[m.l] || 'custom';
      if (!m.id) m.id = m.kind === 'custom' ? uid('m') : m.kind;
      if (m.kind === 'home') m.on = true;
      if (m.kind === 'custom') { m.sections = m.sections || []; m.subs = m.subs || []; }
      (m.subs || []).forEach(sb => { sb.sections = sb.sections || []; sb.targets = sb.targets || []; sb.seo = sb.seo || { title: '', desc: '', kw: '' }; if (!sb.access) sb.access = '공개'; if (sb.on == null) sb.on = true; });
      m.targets = m.targets || []; m.seo = m.seo || { title: '', desc: '', kw: '' }; if (!m.access) m.access = '공개';
      if ((m.kind === 'community' || m.kind === 'board') && !m.layout) m.layout = m.kind === 'community' ? 'sns' : 'list';
    });
    return s;
  }
  function stNorm() {
    const st = S.settings;
    st.chatbot = Object.assign({ type: st.kakao ? 'kakao' : 'none', kakaoUrl: '', ctKey: '', label: '상담하기', pos: 'right' }, st.chatbot || {});
    st.domain = Object.assign({ host: '', vendor: '가비아', mode: '유동', status: '미신청', log: [] }, st.domain || {});
    st.mkt = Object.assign({ ga: /^G-/.test(st.pixel || '') ? st.pixel : '', gtm: '', meta: '', kakao: '', naver: '', head: '' }, st.mkt || {});
    st.localMkt = st.localMkt || {};
    st.popups = st.popups || [];
    return st;
  }
  window.s2norm = s2norm;

  /* ── 페이지 목록 ── */
  /* v36 R3(2-2): 페이지 이름은 유형별 메뉴 이름으로 보인다(대학 '클래스' → '교육과정' 등 — 캔버스 머리글 · 게시본과 같은 HPS.menuName). 저장된 m.l은 그대로 */
  const mN = l => { try { return window.HPS && typeof HPS.menuName === 'function' ? HPS.menuName(l) : l; } catch (e) { return l; } };
  function s2pages(s) {
    const P = [];
    s.menus.forEach(m => {
      if (m.kind === 'home') { P.unshift({ key: 'home', label: m.l || '홈', name: m.l || '홈', kind: 'home', m, sections: s.sections }); return; }
      P.push({ key: 'm-' + m.id, label: mN(m.l), name: mN(m.l), kind: m.kind, m, sections: m.kind === 'custom' ? m.sections : null });
      if (m.subOn && Array.isArray(m.subs)) m.subs.forEach(sb => P.push({ key: `s-${m.id}-${sb.id}`, label: `${mN(m.l)} › ${sb.l}`, name: sb.l, kind: 'sub', m, sb, sections: sb.sections }));
    });
    if (!P.length || P[0].key !== 'home') P.unshift({ key: 'home', label: '홈', name: '홈', kind: 'home', sections: s.sections });
    return P;
  }
  const curPg = s => { const P = s2pages(s); return P.find(p => p.key === UI.sitePage) || P[0]; };
  window.s2pages = s2pages;

  /* ── 링크(메뉴 이동 경로 · 버튼) ── */
  const linkHref = v => !v ? '#' : v.startsWith('learn:') ? '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice' }[v.slice(6)] || 'home') : v.startsWith('page:') ? '#p-' + v.slice(5) : v.startsWith('cls:') ? '#p-c-' + v.slice(4) : v.startsWith('url:') ? (typeof safeURL === 'function' ? safeURL(v.slice(4)) : '#') : '#'; /* v25 url: 링크도 http(s) · mailto · tel만 */
  const linkAttr = v => `href="${esc(linkHref(v))}"${v && v.startsWith('url:') ? ' target="_blank" rel="noopener"' : ''}`;
  const pubCls = () => S.classes.filter(c => c.open === '전체' || c.open == null);
  function linkSel(nm, val, kind = 'name') {
    const attr = `${kind}="${nm}`;
    val = val || ''; const P = s2pages(site()); const isUrl = val.startsWith('url:');
    return `<div class="s2lk"><select ${attr}_t" data-chg="s2-lkt"><option value="">연결 안 함</option><optgroup label="페이지">${P.map(p => `<option value="page:${esc(p.key)}" ${val === 'page:' + p.key ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</optgroup><optgroup label="학습 페이지">${[['home', '홈'], ['shop', `${t('cls')} 목록`], ['comm', '커뮤니티'], ['notice', '공지사항'], ['textbooks', '교재 · 교구'], ['my', '내 학습']].map(([k, l]) => `<option value="learn:${k}" ${val === 'learn:' + k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</optgroup><optgroup label="${esc(t('cls'))}">${pubCls().map(c => `<option value="cls:${esc(c.id)}" ${val === 'cls:' + c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup><option value="url" ${isUrl ? 'selected' : ''}>URL 직접 입력</option></select><input ${attr}_u" placeholder="https://" maxlength="300" value="${isUrl ? esc(val.slice(4)) : ''}" ${isUrl ? '' : 'hidden style="display:none"'} aria-label="이동할 URL"></div>`;
  }
  function linkRead(root, nm, kind = 'name') {
    const tEl = root.querySelector(`[${kind}="${nm}_t"]`); if (!tEl) return undefined; const tv = tEl.value;
    if (tv !== 'url') return tv;
    const u = (root.querySelector(`[${kind}="${nm}_u"]`)?.value || '').trim(); if (!u) return '';
    if (!/^https?:\/\/[^\s<>"']+$/i.test(u)) throw new Error('이동 URL은 http:// 또는 https://로 시작해야 합니다.');
    return 'url:' + u;
  }
  ACT['s2-lkt'] = el => { const u = el.parentElement.querySelector('input'); if (u) { u.hidden = el.value !== 'url'; u.style.display = u.hidden ? 'none' : ''; } };

  /* ── 이미지 업로드(검증 → 200KB 이하 dataURL, 크면 자동 축소) ── */
  function s2img(file, cb) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) { toast('이미지 파일(PNG · JPG · GIF · WEBP · SVG · ICO)만 올릴 수 있습니다.', 'warn'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('10MB 이하 이미지만 올릴 수 있습니다.', 'warn'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const url = String(rd.result); if (url.length <= LIM) { cb(url, file); return; }
      if (/svg|gif|icon/.test(file.type)) { toast('200KB 이하 파일로 줄여서 올려 주세요.', 'warn'); return; }
      const im = new Image();
      im.onload = () => { let mx = 1600, q = .85, out = ''; for (let k = 0; k < 10; k++) { const r = Math.min(1, mx / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * r)); c.height = Math.max(1, Math.round(im.height * r)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', q); if (out.length <= LIM) break; q = Math.max(.5, q - .1); mx = Math.round(mx * .8); }
        if (out.length > LIM) { toast('이미지를 200KB 이하로 줄이지 못했습니다.', 'warn'); return; } toast(`이미지를 ${Math.round(out.length / 1024)}KB로 줄여 저장했습니다.`); cb(out, file); };
      im.onerror = () => toast('이미지를 읽지 못했습니다.', 'bad'); im.src = url;
    };
    rd.readAsDataURL(file);
    /* 운영: 파일 서버(CDN) 업로드 후 URL 저장 */
  }
  const upField = (attr, v, label = '이미지 선택') => `<div class="s2up"><img src="${esc(v || '')}" alt="" ${v ? '' : 'hidden'}><input type="hidden" ${attr} value="${esc(v || '')}"><label class="btn sm">${esc(label)}<input type="file" accept="image/*" data-chg="s2-up" hidden></label><button type="button" class="btn sm ghost" data-act="s2-up-clr">삭제</button><small class="mini">200KB 이하로 저장(큰 사진은 자동 축소)</small></div>`;
  ACT['s2-up'] = el => {
    const f = el.files && el.files[0]; const box = el.closest('.s2up'); const to = el.dataset.to;
    s2img(f, url => {
      if (to) { const s = site(); if (to === 'logo') s.gnb.logo = url; if (to === 'favicon') S.settings.favicon = url; save(); render(); toast('이미지를 저장했습니다.', 'ok'); if (to === 'favicon' && $('#modal')) setTimeout(() => ACT['s2-domain'](), 0); return; }
      if (!box) return; box.querySelector('input[type=hidden]').value = url; const im = box.querySelector('img'); im.src = url; im.hidden = false;
    });
    el.value = '';
  };
  ACT['s2-up-clr'] = el => { const box = el.closest('.s2up'); const to = el.dataset.to; if (to) { if (to === 'logo') site().gnb.logo = ''; if (to === 'favicon') S.settings.favicon = ''; save(); render(); return; } box.querySelector('input[type=hidden]').value = ''; const im = box.querySelector('img'); im.hidden = true; im.removeAttribute('src'); };

  /* ── 반복 행(이미지 카드 · 슬라이드 · 동영상) ── */
  const ROWT = {};
  const ROWF = {
    imgs: [['src', '이미지', 'img'], ['title', '제목'], ['body', '내용'], ['btn', '버튼 문구'], ['link', '버튼 이동 경로', 'link']],
    slides: [['img', '배경 이미지', 'img'], ['title', '배너 문구'], ['sub', '설명'], ['btn', '버튼 문구'], ['link', '버튼 이동 경로', 'link']],
    vids: [['url', 'YouTube · Vimeo 주소'], ['title', '영상 제목'], ['thumb', '썸네일 이미지(재생 전 표시)', 'img']]
  };
  function rowHTML(g, r) {
    r = r || {};
    return `<div class="s2row"><div class="s2rh"><b>항목</b><span class="sp"></span><button type="button" class="btn sm ghost" data-act="s2-row-mv" data-d="-1" aria-label="위로">↑</button><button type="button" class="btn sm ghost" data-act="s2-row-mv" data-d="1" aria-label="아래로">↓</button><button type="button" class="btn sm ghost" data-act="s2-row-del" aria-label="삭제">✕</button></div>${ROWF[g].map(([k, l, ty]) => ty === 'img' ? `<div class="fl">${esc(l)}${upField(`data-f="${k}"`, r[k])}</div>` : ty === 'link' ? `<div class="fl">${esc(l)}${linkSel(k, r[k], 'data-f')}</div>` : `<label class="fl">${esc(l)}<input data-f="${k}" value="${esc(r[k] || '')}" maxlength="${k === 'url' ? 300 : 120}"></label>`).join('')}</div>`;
  }
  function rowsUI(g, rows, max, label) {
    ROWT[g] = rowHTML(g, {});
    return `<div class="s2grp"><div class="ch"><b>${esc(label)}</b><small>최대 ${max}개</small></div><div class="s2rows" data-g="${g}" data-max="${max}">${(rows || []).map(r => rowHTML(g, r)).join('')}</div><button type="button" class="btn sm" data-act="s2-row-add" data-g="${g}">+ 추가</button></div>`;
  }
  function rowsRead(root, g) {
    const box = root.querySelector(`.s2rows[data-g="${g}"]`); if (!box) return undefined;
    return [...box.querySelectorAll(':scope > .s2row')].map(row => { const o = {}; ROWF[g].forEach(([k, , ty]) => { if (ty === 'link') o[k] = linkRead(row, k, 'data-f') || ''; else o[k] = (row.querySelector(`[data-f="${k}"]`)?.value || '').trim(); }); return o; });
  }
  ACT['s2-row-add'] = el => { const box = el.parentElement.querySelector('.s2rows'); const n = box.children.length, mx = +box.dataset.max; if (n >= mx) { toast(`최대 ${mx}개까지 추가할 수 있습니다.`, 'warn'); return; } box.insertAdjacentHTML('beforeend', ROWT[box.dataset.g] || rowHTML(box.dataset.g, {})); };
  ACT['s2-row-del'] = el => el.closest('.s2row').remove();
  ACT['s2-row-mv'] = el => { const r = el.closest('.s2row'); if (+el.dataset.d < 0 && r.previousElementSibling) r.parentElement.insertBefore(r, r.previousElementSibling); else if (+el.dataset.d > 0 && r.nextElementSibling) r.parentElement.insertBefore(r.nextElementSibling, r); };

  /* ── 지정 대상 선택(모달 안 체크 목록) ── */
  const memLabel = m => m.name || m.no || m.sid || m.email || m.id;
  function pickUI(sel) {
    sel = sel || []; const T = S.teams || [];
    return `<div class="s2pick"><input type="search" placeholder="이름 · ${esc(t('group'))} 검색" data-s2q aria-label="지정 대상 검색"><div class="s2pl">${T.map(x => `<label><input type="checkbox" data-pick value="${esc(x.id)}" ${sel.includes(x.id) ? 'checked' : ''}> ${tag(t('group'), 'b')} ${esc(x.name)}</label>`).join('')}${S.members.map(m => `<label><input type="checkbox" data-pick value="${esc(m.id)}" ${sel.includes(m.id) ? 'checked' : ''}> ${esc(memLabel(m))}${m.grp || m.team ? ` <small class="mini">${esc(m.grp || (T.find(x => x.id === m.team)?.name) || '')}</small>` : ''}</label>`).join('') || '<p class="mini">회원이 없습니다.</p>'}</div></div>`;
  }
  document.addEventListener('input', e => { if (!e.target.matches('[data-s2q]')) return; const q = e.target.value.trim(); e.target.parentElement.querySelectorAll('.s2pl label').forEach(l => { l.hidden = q && !l.textContent.includes(q); }); });

  /* ── 섹션 렌더러(공통 스타일 · 배경색 · 정렬 + 확장 섹션) ── */
  const dark = c => { try { return lum(c) < .35; } catch (e) { return false; } };
  const btnA = (label, link, cls = 'btn pri') => label ? `<a class="${cls}" ${linkAttr(link)}>${esc(label)}</a>` : '';
  const SH = (d, def) => `<div class="sh s2c">${d.eyebrow || def ? `<p class="ey">${esc(d.eyebrow || def)}</p>` : ''}${d.title ? `<h2>${esc(d.title).replace(/\n/g, '<br>')}</h2>` : ''}${d.body && typeof d.body === 'string' ? `<p class="s2body">${esc(d.body)}</p>` : ''}</div>`;
  let animN = 0, s2full = false;
  function slideCSS(id, n, sec, pv = 1) {
    const steps = Math.max(1, n - pv + 1); if (steps < 2) return ''; sec = Math.min(15, Math.max(2, +sec || 5)); const tot = steps * sec; const kf = [];
    for (let k = 0; k < steps; k++) { const a = k * sec / tot * 100, b = (k * sec + sec * .85) / tot * 100; kf.push(`${a.toFixed(2)}%,${b.toFixed(2)}%{transform:translateX(-${(k * 100 / pv).toFixed(3)}%)}`); }
    return `<style>@keyframes ${id}{${kf.join('')}100%{transform:translateX(0)}}#${id} .s2tr{animation:${id} ${tot}s infinite}@media(prefers-reduced-motion:reduce){#${id} .s2tr{animation:none}}</style>`;
  }
  const clsCard = (c, k, s, lk) => `<article class="cc"><a class="s2ca" href="#p-c-${esc(c.id)}">${c.thumb && /^data:image\//.test(c.thumb) ? `<img class="s2th" src="${esc(c.thumb)}" alt="">` : thumbArt(c.name, k, s.color, lk, (c.start || '').replace(/-/g, '.'))}</a><div class="cb"><h3>${esc(c.name)}</h3><dl><dt>수강 기간</dt><dd>${c.period?.mode === 'days' ? `신청일부터 ${esc(c.period.days)}일` : `${esc(c.start || '')} ~ ${esc(c.end || '')}`}</dd>${catName(c.cat) ? `<dt>카테고리</dt><dd>${esc(catName(c.cat))}</dd>` : ''}</dl><p class="pr">${c.price ? won(c.price) : '무료'}</p></div></article>`;
  const catName = id => (S.cats || []).find(x => x.id === id)?.name || '';
  function catGroups(L) {
    const cats = (S.cats || []).filter(x => !x.parent).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (cats.length) { const sub = id => [id, ...(S.cats || []).filter(x => x.parent === id).map(x => x.id)]; const G = cats.map(c => [c.name, L.filter(x => sub(c.id).includes(x.cat))]).filter(g => g[1].length); const rest = L.filter(x => !cats.some(c => sub(c.id).includes(x.cat))); if (rest.length) G.push(['기타', rest]); return G; }
    const G = {}; L.forEach(c => { const k = KIND[c.kind] || (c.kind === 'pack' ? '과정' : '기타'); (G[k] = G[k] || []).push(c); }); return Object.entries(G);
  }
  function ownSec(x, i, s, lk) {
    const d = x.data || {}; const st = +d.dstyle || 0; const id = 's2a' + (++animN);
    switch (x.type) {
      case 'banner': {
        if (!st && !d.img) return null; const v = st || 2; const ali = d.align || (v === 3 ? 'left' : 'center');
        const inner = `<div class="s2bt">${d.eyebrow ? `<p class="ey">${esc(d.eyebrow)}</p>` : ''}<h1>${esc(d.title || '').replace(/\n/g, '<br>')}</h1>${d.sub ? `<p class="hs">${esc(d.sub)}</p>` : ''}<div class="hb">${btnA(d.cta, d.link)}${btnA(d.cta2, d.link2, 'btn gh2')}</div></div>`;
        if (v === 3) return `<section class="s2ban v3"><div class="wrap s2split al-${ali}">${inner}<div class="s2bimg">${d.img ? `<img src="${esc(d.img)}" alt="${esc(d.alt || '')}">` : '<span>이미지</span>'}</div></div></section>`;
        return `<section class="s2ban v${v}"${v === 2 && d.img ? ` style="--bimg:url('${esc(d.img)}')"` : ''}><div class="wrap al-${ali}">${inner}</div></section>`;
      }
      case 'slideBanner': {
        if (!st && !d.sx) return null; const v = st || 1; const L = (d.slides || []).map((tx, k) => ({ title: tx, ...(d.sx?.[k] || {}) })).slice(0, 4);
        return `<section class="s2sb v${v}">${slideCSS(id, L.length, d.sec)}<div class="wrap"><div class="s2sl" id="${id}"><div class="s2tr">${L.map(o => `<div class="s2sli${o.img ? ' img' : ''}"${o.img ? ` style="--bimg:url('${esc(o.img)}')"` : ''}><div class="s2bt"><h2>${esc(o.title || '')}</h2>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}${btnA(o.btn, o.link)}</div>${v === 3 ? `<div class="s2bimg">${o.img ? `<img src="${esc(o.img)}" alt="">` : ''}</div>` : ''}</div>`).join('')}</div></div>${L.length > 1 ? `<div class="s2dots">${L.map(() => '<i></i>').join('')}</div>` : ''}</div></section>`;
      }
      case 'text': {
        if (d.variant || !st) return null; const cols = d.cols || [];
        return `<section class="sec s2tx v${st}"><div class="wrap ${st === 3 ? 's2split' : ''}">${SH({ ...d, body: '' })}<div>${typeof d.body === 'string' && d.body ? `<p class="lead">${esc(d.body)}</p>` : ''}${cols.length ? `<div class="s2cols n${Math.min(cols.length, 4)}">${cols.map(([a, b]) => `<div><b>${esc(a)}</b><p>${esc(b || '')}</p></div>`).join('')}</div>` : ''}</div></div></section>`;
      }
      case 'image': {
        const L = d.imgs || []; if (!L.length && !st) return null; const v = st || 2;
        return `<section class="sec"><div class="wrap">${SH(d)}<div class="s2im v${v} ${d.list === 'row' ? 'row' : 'grid n' + Math.min(Math.max(L.length, 1), 4)}">${L.map(o => `<figure>${o.src ? `<img src="${esc(o.src)}" alt="${esc(o.title || d.alt || '')}">` : '<span class="s2ph0">이미지</span>'}<figcaption>${o.title ? `<b>${esc(o.title)}</b>` : ''}${o.body ? `<p>${esc(o.body)}</p>` : ''}${btnA(o.btn, o.link, 'btn pri sm')}</figcaption></figure>`).join('') || '<p class="emp">이미지를 추가하세요.</p>'}</div></div></section>`;
      }
      case 'slideImage': {
        const L = (d.imgs || []).slice(0, 20); if (!L.length) return null; const pv = Math.min(3, L.length);
        return `<section class="sec">${slideCSS(id, L.length, d.sec, pv)}<div class="wrap">${SH(d)}<div class="s2sl" id="${id}"><div class="s2tr pv${pv}">${L.map(o => `<figure class="s2sim">${o.src ? `<img src="${esc(o.src)}" alt="${esc(o.title || '')}">` : '<span class="s2ph0">이미지</span>'}${o.title || o.btn ? `<figcaption>${o.title ? `<b>${esc(o.title)}</b>` : ''}${btnA(o.btn, o.link, 'btn pri sm')}</figcaption>` : ''}</figure>`).join('')}</div></div></div></section>`;
      }
      case 'classes': case 'books': {
        if (!st && !d.body && d.layout !== 'slide') return null; const slide = d.layout === 'slide'; const mx = slide ? 12 : 4;
        const L = (d.ids || []).map(v => x.type === 'classes' ? C(v) : S.books.find(b => b.id === v)).filter(Boolean).slice(0, mx);
        const cards = L.map((o, k) => x.type === 'classes' ? clsCard(o, k, s, lk) : `<article class="cc">${o.thumb && /^data:image\//.test(o.thumb) ? `<img class="s2th" src="${esc(o.thumb)}" alt="">` : thumbArt(o.name, k + 2, s.color, lk)}<div class="cb"><h3>${esc(o.name)}</h3><p class="mt">${esc(o.kind || '')}</p><p class="pr">${won(o.price)}</p></div></article>`).join('');
        return `<section class="sec alt"><div class="wrap">${SH(d, x.type === 'classes' ? 'CLASSES' : 'BOOKS')}<div class="cls ${slide ? 's2hs' : ''}">${cards || '<p class="emp">전체 회원에게 공개된 항목이 이곳에 표시됩니다.</p>'}</div></div></section>`;
      }
      case 'video': {
        const V = (d.vids && d.vids.length ? d.vids : (d.url ? [{ url: d.url }] : [])).slice(0, 4);
        if (!st && !d.body && V.length < 2 && !V.some(v => v.thumb)) return null;
        const yt = u => (String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/) || [])[1];
        return `<section class="sec"><div class="wrap">${SH(d, 'VIDEO')}<div class="s2vd n${Math.max(1, V.length)}">${V.map(v => { const y = yt(v.url); const th = v.thumb || (y ? `https://i.ytimg.com/vi/${y}/hqdefault.jpg` : ''); return `<a class="s2v" href="${esc(/^https?:\/\//.test(v.url || '') ? v.url : '#')}" target="_blank" rel="noopener">${th ? `<img src="${esc(th)}" alt="${esc(v.title || '')}">` : '<span class="vph"></span>'}<span class="play"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>${v.title ? `<b>${esc(v.title)}</b>` : ''}</a>`; }).join('') || '<p class="emp">영상 주소를 입력하세요.</p>'}</div></div></section>`;
      }
      case 'map': {
        if (!st && !d.detail && !d.pin) return null; const v = st || 1; const pin = d.pin || { x: 50, y: 50 }; const q = encodeURIComponent(`${d.addr || ''} ${d.detail || ''}`.trim());
        const info = `<dl class="mapi"><div><dt>주소</dt><dd>${esc(d.addr || '')}${d.detail ? ' ' + esc(d.detail) : ''}</dd></div><div><dt>연락처</dt><dd class="tel">${esc(d.tel || '')}</dd></div>${d.hours ? `<div><dt>운영 시간</dt><dd>${esc(d.hours)}</dd></div>` : ''}<div class="s2mapl"><a href="https://map.kakao.com/?q=${q}" target="_blank" rel="noopener">카카오맵</a><a href="https://map.naver.com/p/search/${q}" target="_blank" rel="noopener">네이버 지도</a></div></dl>`;
        /* 운영: 카카오 지도 JavaScript API로 실제 지도 렌더(위치 좌표 d.lat/d.lng) */
        const map = `<div class="s2map" role="img" aria-label="${esc(d.place || d.addr || '위치')} 지도"><svg viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true"><rect width="400" height="240" fill="#EEF1F5"/><path d="M0 70 L400 50 M0 170 L400 190 M100 0 L130 240 M270 0 L250 240 M0 120 C120 100 280 140 400 120" stroke="#fff" stroke-width="14" fill="none"/></svg><span class="s2pinm" style="left:${+pin.x}%;top:${+pin.y}%"></span>${d.place ? `<em>${esc(d.place)}</em>` : ''}</div>`;
        return `<section class="sec"><div class="wrap">${SH(d, 'CONTACT')}<div class="s2mp v${v}">${v === 1 ? info + map : map + info}</div></div></section>`;
      }
      case 'notices': {
        if (!st) return null; const L = [...(S.notices || []), ...S.classes.flatMap(c => c.notices || [])].slice(0, Math.min(5, +d.n || 3));
        if (st === 2) return `<section class="sec">${slideCSS(id, L.length, d.sec, Math.min(3, L.length || 1))}<div class="wrap">${SH(d, 'NOTICE')}<div class="s2sl" id="${id}"><div class="s2tr pv${Math.min(3, L.length || 1)}">${L.map(n => `<div class="s2nc"><span class="nt">공지</span><b>${esc(n.title)}</b><time>${esc(n.at || '')}</time></div>`).join('') || '<p class="emp">등록된 공지사항이 없습니다.</p>'}</div></div></div></section>`;
        return null;
      }
      case 'reviews': {
        if (!st && !d.n) return null; const R = S.posts.filter(p => p.board === '수강후기' && !p.hidden).slice(0, Math.min(12, +d.n || 6)); const pv = Math.min(3, R.length || 1);
        const q = p => `<blockquote><p>“${esc(p.title)}”</p><cite>${(() => { const n = M(p.who)?.name || ''; return /^[가-힣]/.test(n) ? esc(n[0]) + '○○' : esc(t('learner')); })()} · ${esc(p.at)}</cite></blockquote>`;
        if (st === 2) return `<section class="sec alt">${slideCSS(id, R.length, 5, pv)}<div class="wrap">${SH(d, 'REVIEWS')}<div class="s2sl" id="${id}"><div class="s2tr pv${pv} rv">${R.map(q).join('') || '<p class="emp">수강후기가 이곳에 표시됩니다.</p>'}</div></div></div></section>`;
        return `<section class="sec alt"><div class="wrap">${SH(d, 'REVIEWS')}<div class="rv">${R.map(q).join('') || '<p class="emp">수강후기 게시판에 등록된 실제 후기가 이곳에 표시됩니다.</p>'}</div></div></section>`;
      }
      case 'code': {
        if (!d.allowScript) return `<section class="sec"><div class="wrap">${d.showTitle && d.title ? `<h2>${esc(d.title)}</h2>` : ''}${cleanHTML(d.html)}</div></section>`;
        const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Pretendard,system-ui,sans-serif}</style></head><body>${s2full ? (d.html || '') : cleanHTML(d.html)}</body></html>`;
        return `<section class="sec"><div class="wrap">${d.showTitle && d.title ? `<h2>${esc(d.title)}</h2>` : ''}${s2full ? '' : '<p class="s2cnote">스크립트는 게시된 홈페이지 · 내보낸 HTML에서 실행됩니다(스튜디오 보안 정책상 미리보기에서는 실행되지 않음).</p>'}<iframe class="s2code" title="${esc(d.title || '코드 블럭')}" sandbox="allow-scripts allow-popups allow-forms" srcdoc="${esc(doc)}" style="height:${Math.min(2000, Math.max(60, +d.h || 320))}px"></iframe></div></section>`;
      }
      case 'catBrowse': {
        let L = pubCls(); if ((d.cats || []).length) L = L.filter(c => d.cats.includes(c.cat) || (S.cats || []).some(x => x.id === c.cat && d.cats.includes(x.parent)));
        const G = catGroups(L);
        return `<section class="sec"><div class="wrap">${SH(d, 'CATEGORY')}<div class="s2chips">${G.map(([n, l], k) => `<a href="#${id}-${k}">${esc(n)} <small>${l.length}</small></a>`).join('')}</div>${G.map(([n, l], k) => `<div class="s2cg" id="${id}-${k}"><h3>${esc(n)}</h3><div class="cls">${l.slice(0, +d.per || 4).map((c, j) => clsCard(c, j, s, lk)).join('')}</div></div>`).join('') || `<p class="emp">전체 공개 ${esc(tj('cls', '이'))} 카테고리별로 표시됩니다.</p>`}</div></section>`;
      }
    }
    return null;
  }
  { const base = proSec; proSec = (x, i, s, lk) => {
    const d = x.data || {}; let h = ownSec(x, i, s, lk); if (h == null) h = base(x, i, s, lk) || '';
    if (x.type === 'banner' && d.link && !(+d.dstyle) && !d.img) h = h.replace(/<a class="btn pri" href="#">/, `<a class="btn pri" ${linkAttr(d.link)}>`);
    if (x.type === 'banner' && d.link2 && !(+d.dstyle) && !d.img) h = h.replace(/<a class="btn gh" href="#">/, `<a class="btn gh" ${linkAttr(d.link2)}>`);
    if (x.type === 'text' && d.btnL) h = h.replace(/<\/section>(?![\s\S]*<\/section>)/, `<div class="wrap s2btnw">${btnA(d.btnL, d.link)}</div></section>`);
    const st = []; if (d.bg) { st.push(`background:${d.bg}`); if (dark(d.bg)) st.push('color:#fff'); } if (d.align) st.push(`text-align:${d.align}`);
    const cls = ` s2s ds${+d.dstyle || 0}${d.align ? ' al-' + d.align : ''}${d.bg && dark(d.bg) ? ' s2dk' : ''}`;
    return h.replace(/<section class="([^"]*)"/g, (m0, c) => `<section class="${c}${cls}"${st.length ? ` style="${esc(st.join(';'))}"` : ''}`).replace(/<section>/g, `<section class="${cls.trim()}"${st.length ? ` style="${esc(st.join(';'))}"` : ''}>`);
  }; }

  /* ── 기본 메뉴 페이지 · 클래스 상세 · 약관 ── */
  function pageHead(p, s, crumbs) {
    const img = (p.sb || p.m)?.himg;
    return `<div class="s2ph${img ? ' img' : ''}"${img ? ` style="background-image:url('${esc(img)}')"` : ''}><div class="wrap">${crumbs.length ? `<nav class="s2bc" aria-label="이동 경로"><a href="#p-home">홈</a>${crumbs.map(([n, h]) => `<span>›</span>${h ? `<a href="${esc(h)}">${esc(n)}</a>` : `<b>${esc(n)}</b>`}`).join('')}</nav>` : ''}<h1>${esc(p.name)}</h1></div></div>`;
  }
  function postList(L, layout) {
    if (!L.length) return '<p class="emp">게시글이 없습니다.</p>';
    if (layout === 'sns') return `<div class="s2sns">${L.map(p => `<article><header><span class="avt">${esc(((M(p.who)?.name) || '회')[0])}</span><b>${esc(M(p.who)?.name ? M(p.who).name[0] + '○○' : t('learner'))}</b><time>${esc(p.at || '')}</time></header><h3>${esc(p.title || '')}</h3><p>${esc(String(p.body || '').slice(0, 120))}</p><footer>♡ ${(p.likes || []).length} · 댓글 ${(p.replies || []).length}</footer></article>`).join('')}</div>`;
    return `<table class="s2tbl"><thead><tr><th>제목</th><th>게시판</th><th>작성일</th></tr></thead><tbody>${L.map(p => `<tr><td>${esc(p.title || '')}</td><td>${esc((S.boards || []).find(b => b.id === p.board)?.name || p.board || '')}</td><td>${esc(p.at || '')}</td></tr>`).join('')}</tbody></table>`;
  }
  function basePage(p, s, lk) {
    const m = p.m; let body = '';
    if (m.kind === 'class') { const G = catGroups(pubCls()); body = `<div class="s2chips">${G.map(([n, l], k) => `<a href="#p-m-class-${k}">${esc(n)} <small>${l.length}</small></a>`).join('')}</div>${G.map(([n, l], k) => `<div class="s2cg" id="p-m-class-${k}"><h3>${esc(n)}</h3><div class="cls">${l.map((c, j) => clsCard(c, j, s, lk)).join('')}</div></div>`).join('') || '<p class="emp">전체 공개된 클래스가 없습니다.</p>'}`; }
    if (m.kind === 'book') body = `<div class="cls">${S.books.filter(b => (b.open || '전체') === '전체').map((b, k) => `<article class="cc">${thumbArt(b.name, k + 2, s.color, lk)}<div class="cb"><h3>${esc(b.name)}</h3><p class="mt">${esc(b.kind || '')}</p><p class="pr">${won(b.price)}</p></div></article>`).join('') || '<p class="emp">공개된 교재 · 교구가 없습니다.</p>'}</div>`;
    if (m.kind === 'notice') body = `<ul class="nl">${[...(S.notices || []), ...S.classes.flatMap(c => c.notices || [])].slice(0, 20).map(n => `<li><span class="nt">공지</span><b>${esc(n.title)}</b><time>${esc(n.at || '')}</time></li>`).join('') || '<li class="emp">등록된 공지사항이 없습니다.</li>'}</ul>`;
    const pub = p => !p.hidden && !p.priv && !p.tonly && !p.rv && !['수강후기', '학습노트'].includes(p.board) && (!S.boards || !(S.boards.find(b => b.id === p.board)?.perm?.type || 'all').match(/cls|team|members/));
    if (m.kind === 'community') { const L = (S.posts || []).filter(pub); const C2 = L.filter(p => p.board === '커뮤니티'); body = postList((C2.length ? C2 : L).slice(0, 12), m.layout); }
    if (m.kind === 'board') { const L = (S.posts || []).filter(p => pub(p) && p.board !== '커뮤니티'); body = `${(S.boards || []).length ? `<div class="s2chips">${S.boards.filter(b => b.id !== '커뮤니티').map(b => `<span>${esc(b.name || b.id)}</span>`).join('')}</div>` : ''}${postList(L.slice(0, 12), m.layout)}`; }
    return `<section class="sec"><div class="wrap">${body}</div></section>`;
  }
  function clsPage(c, s, lk) {
    return `<main class="s2pg" id="p-c-${esc(c.id)}">${pageHead({ name: c.name }, s, [[t('cls'), '#p-m-class'], [c.name]])}<section class="sec"><div class="wrap s2cd"><div>${c.thumb && /^data:image\//.test(c.thumb) ? `<img class="s2th" src="${esc(c.thumb)}" alt="">` : thumbArt(c.name, 0, s.color, lk)}</div><div><p class="mt">${esc(KIND[c.kind] || '과정')}${catName(c.cat) ? ' · ' + esc(catName(c.cat)) : ''}</p><h2>${esc(c.name)}</h2><dl class="inf"><div><dt>수강 기간</dt><dd>${c.period?.mode === 'days' ? `신청일부터 ${esc(c.period.days)}일` : `${esc(c.start || '')} ~ ${esc(c.end || '')}`}</dd></div><div><dt>수강료</dt><dd>${c.price ? won(c.price) : '무료'}</dd></div>${(c.intro || []).map(x => `<div><dt>강사</dt><dd>${esc(x.name)} — ${esc(x.bio || '')}</dd></div>`).join('')}</dl><a class="btn pri" href="#p-c-${esc(c.id)}">수강 신청하기</a></div></div></section></main>`;
  }

  /* ── 사이트 HTML: 메뉴 · 페이지 · GNB · 푸터 · 챗봇 · 팝업 · 마케팅 ── */
  const blend = (c, a) => (a == null || +a >= 100) ? c : mixc('#ffffff', c, Math.max(.1, +a / 100));
  const FOOT_REG = () => S.org.type === 'k12' || S.org.type === 'adult' ? '학원설립 · 운영 등록번호' : S.org.type === 'voc' ? '훈련기관 인정번호' : S.org.type === 'lifelong' ? '평생교육시설 신고번호' : '기타 등록번호';
  function navHTML(s, full, live, lang) {
    const lab = l => (lang && lang !== 'ko' && typeof LX === 'function') ? LX(l, lang) : l;
    const visible = m => m.on !== false && !(full && m.access === '지정 회원' && m.hide && (m.targets || []).length);
    const lock = m => m.access !== '공개' ? ` <i class="s2lock">${m.access === '비공개' ? '비공개' : `지정 ${(m.targets || []).length}`}</i>` : '';
    const href = (m, key) => m.link ? linkAttr(m.link) : `href="#p-${esc(key)}"`;
    const items = s.menus.filter(visible).map(m => {
      const key = m.kind === 'home' ? 'home' : 'm-' + m.id; const subs = m.subOn && Array.isArray(m.subs) ? m.subs.filter(visible) : [];
      return `<div class="s2-mi"><a ${href(m, key)}>${esc(lab(m.l))}${live && !full ? lock(m) : ''}${subs.length ? ' <small class="s2car">▾</small>' : ''}</a>${subs.length ? `<div class="s2-dd">${subs.map(sb => `<a ${href(sb, `s-${m.id}-${sb.id}`)}>${esc(sb.l)}${live && !full ? lock(sb) : ''}</a>`).join('')}</div>` : ''}</div>`;
    }).join('');
    return `<nav class="gn s2-al-${esc(s.gnb.align)} s2-sub-${esc(s.gnb.sub)}">${items}</nav>`;
  }
  function footHTML(s) {
    const ft = S.settings.footer || {}; const f = s.foot; const pg = S.settings.pg === 'toss';
    const parts = [`상호 ${esc(ft.company || S.org.name)}`, f.showCeo && ft.ceo ? `대표 ${esc(ft.ceo)}` : '', f.showBiz && ft.biz ? `사업자등록번호 ${esc(ft.biz)}` : '', ft.mail ? `통신판매업 ${esc(ft.mail)}` : ''].filter(Boolean).join(' · '); /* v25.1: 빈 칸은 '—' · '미입력' 대신 생략 */
    /* 운영: 토스페이먼츠 가맹점 에스크로 가입 확인 페이지(MID 기준) */
    const esc2 = pg ? `<a class="s2esc" href="https://www.tosspayments.com/" target="_blank" rel="noopener" title="구매안전(에스크로) 서비스 가입 확인"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor" opacity=".25"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>토스페이먼츠 구매안전(에스크로) 서비스 가입 확인</a>` : '';
    const sty = [f.bg ? `background:${f.bg}` : '', f.bg ? `color:${dark(f.bg) ? 'rgba(255,255,255,.75)' : '#4A4F5C'}` : '', `text-align:${f.align}`].filter(Boolean).join(';');
    return `<footer class="gf s2ft al-${esc(f.align)}${f.bg && !dark(f.bg) ? ' lt' : ''}" style="${esc(sty)}"><div class="wrap"><div><b>${esc(S.org.name)}</b><p>${parts}</p>${ft.reg ? `<p>${esc(FOOT_REG())} ${esc(ft.reg)}</p>` : ''}${ft.addr || ft.tel ? `<p>${[ft.addr, ft.tel].filter(Boolean).map(esc).join(' · ')}</p>` : ''}<p>©Copyright ${esc(S.org.name)} All rights reserved · Powered by 디디쌤</p>${esc2}</div><div class="fl2"><a href="#p-terms">서비스 이용약관</a><a href="#p-privacy">개인정보 처리방침</a></div></div></footer>`;
  }
  function chatHTML(full) {
    const c = S.settings.chatbot; if (!c || c.type === 'none') return '';
    if (c.type === 'kakao' && c.kakaoUrl) return `<a class="s2chat k ${c.pos === 'left' ? 'l' : ''}" href="${esc(c.kakaoUrl)}" target="_blank" rel="noopener" aria-label="카카오톡 채널 상담"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 6l-1 3.6 4.1-2.7c.6.1 1.1.1 1.7.1 5 0 9-3.1 9-7S17 4 12 4z" fill="currentColor"/></svg><span>${esc(c.label || '상담하기')}</span></a>`;
    if (c.type === 'channeltalk' && c.ctKey) {
      if (full) return `<script>(function(){var w=window;if(w.ChannelIO){return}var ch=function(){ch.c(arguments)};ch.q=[];ch.c=function(a){ch.q.push(a)};w.ChannelIO=ch;function l(){if(w.ChannelIOInitialized){return}w.ChannelIOInitialized=true;var s=document.createElement("script");s.async=true;s.src="https://cdn.channel.io/plugin/ch-plugin-web.js";document.head.appendChild(s)}if(document.readyState==="complete"){l()}else{w.addEventListener("load",l)}})();ChannelIO("boot",${JSON.stringify({ pluginKey: c.ctKey }).replace(/</g, '\\u003c')});</script>`;
      return `<a class="s2chat c ${c.pos === 'left' ? 'l' : ''}" href="#" aria-label="채널톡 상담(미리보기)"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="currentColor"/></svg><span>${esc(c.label || '상담하기')}</span></a>`;
    }
    return '';
  }
  function popHTML() {
    const d = today(); const L = (S.settings.popups || []).filter(p => (!p.s || p.s <= d) && (!p.e || p.e >= d) && p.on !== false).slice(0, 4);
    return L.map((p, k) => `<input type="checkbox" id="s2pc${k}" class="s2pcx" hidden><div class="s2pop" style="--k:${k}">${p.img ? `<img src="${esc(p.img)}" alt="">` : ''}<b>${esc(p.t || '')}</b>${p.body ? `<p>${esc(p.body)}</p>` : ''}${p.link ? `<a class="btn pri sm" ${linkAttr(p.link)}>자세히 보기</a>` : ''}<label for="s2pc${k}">닫기</label></div>`).join('');
  }
  function mktHead() {
    const m = S.settings.mkt || {}; const o = [];
    if (m.ga) o.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(m.ga)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(m.ga)}');</script>`);
    if (m.gtm) o.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${esc(m.gtm)}');</script>`);
    if (m.meta) o.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(m.meta)}');fbq('track','PageView');</script>`);
    if (m.kakao) o.push(`<script src="https://t1.kakaocdn.net/kakao_js_sdk/v1/kakaoPixel.min.js"></script><script>try{kakaoPixel('${esc(m.kakao)}').pageView();}catch(e){}</script>`);
    if (m.naver) o.push(`<script src="https://wcs.naver.net/wcslog.js"></script><script>if(!wcs_add)var wcs_add={};wcs_add["wa"]="${esc(m.naver)}";if(window.wcs){wcs_do();}</script>`);
    if (m.head) o.push(m.head);
    return o.join('\n');
  }
  const hasScriptCode = s => [s.sections, ...s.menus.flatMap(m => [m.sections || [], ...(m.subs || []).map(sb => sb.sections || [])])].some(L => (L || []).some(x => x.type === 'code' && x.data?.allowScript && x.data.html));
  const RELAXED = "default-src 'none'; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:; img-src https: data:; font-src https: data:; connect-src https: wss:; frame-src https:; media-src https:";

  { const base = siteHTML; siteHTML = (s, full, lang) => {
    if (!s || !Array.isArray(s.menus)) return base(s, full, lang);
    s2norm(s); if (S.settings) stNorm();
    const live = s === S.site; const sx = { ...s, color: blend(s.color, s.alpha) };
    s2full = !!full; let h = base(sx, full, lang);
    const a = h.indexOf('</header>'), b = h.lastIndexOf('<footer class="gf">'); if (a < 0 || b < 0) return h;
    const lk = lookOf(s); let home = h.slice(a + 9, b);
    const pages = [`<main class="s2pg" id="p-home">${home}</main>`];
    if (live || full) {
      s2pages(s).forEach(p => {
        if (p.key === 'home') return; const m = p.m, it = p.sb || m;
        const crumbs = p.sb ? [[m.l, m.subOn && !(m.sections || []).length ? '' : '#p-m-' + m.id], [p.sb.l]] : [[p.name]];
        let inner;
        if (full && it.access !== '공개') inner = `<section class="sec"><div class="wrap s2deny"><b>접근 권한이 없습니다</b><p>${it.access === '비공개' ? '비공개 메뉴입니다.' : '지정된 회원만 볼 수 있는 페이지입니다.'} 로그인 후 이용해 주세요.</p><a class="btn pri" href="#p-home">홈으로</a></div></section>`;
        else if (p.sections) { inner = p.sections.map((x, i) => proSec(x, i, sx, lk)).join(''); if (!inner && p.kind === 'custom' && m.subOn) inner = `<section class="sec"><div class="wrap"><div class="s2sublist">${m.subs.filter(x => x.on !== false).map(sb => `<a href="#p-s-${esc(m.id)}-${esc(sb.id)}">${esc(sb.l)} →</a>`).join('')}</div></div></section>`; if (!inner) inner = `<section class="sec"><div class="wrap"><p class="emp">섹션을 추가해 페이지를 구성하세요.</p></div></section>`; }
        else inner = basePage(p, sx, lk);
        const note = !full && it.access !== '공개' ? `<div class="s2note">운영자 미리보기 — 접근 권한: ${esc(it.access)}${it.access === '지정 회원' ? ` ${(it.targets || []).length}명/팀${it.hide ? ' · 지정 회원 외 메뉴 숨김' : ''}` : ''} (권한이 없는 회원에게는 접근 불가 안내가 표시됩니다)</div>` : '';
        pages.push(`<main class="s2pg" id="p-${esc(p.key)}">${note}${pageHead(p, sx, crumbs)}${inner}</main>`);
      });
      pubCls().forEach(c => pages.push(clsPage(c, sx, lk)));
      const tm = S.settings.terms || {};
      pages.push(`<main class="s2pg" id="p-terms">${pageHead({ name: '서비스 이용약관' }, sx, [['서비스 이용약관']])}<section class="sec"><div class="wrap s2terms">${esc(tm.tos || '이용약관이 아직 등록되지 않았습니다.')}</div></section></main>`);
      pages.push(`<main class="s2pg" id="p-privacy">${pageHead({ name: '개인정보 처리방침' }, sx, [['개인정보 처리방침']])}<section class="sec"><div class="wrap s2terms">${esc(tm.privacy || '개인정보 처리방침이 아직 등록되지 않았습니다.')}</div></section></main>`);
    }
    const cur = live && !full ? (curPg(s).key || 'home') : 'home';
    const pgCSS = `.s2pg{display:none}#p-${cur}{display:block}.s2pg:target{display:block}body:has(.s2pg:target) #p-${cur}:not(:target){display:none}`;
    let head = h.slice(0, a + 9), tail = h.slice(b);
    const g = s.gnb; const name = S.org.name;
    head = head.replace(/<a class="logo" href="#">[\s\S]*?<\/a>/, `<a class="logo" href="#p-home">${g.logo ? `<img class="s2logo" src="${esc(g.logo)}" alt="${esc(name)}">` : `<i>${esc(spOrg().slice(0, 1))}</i>${esc(name)}`}</a>`)
      .replace(/<nav class="gn">[\s\S]*?<\/nav>/, navHTML(s, full, live, lang));
    tail = tail.replace(/<footer class="gf">[\s\S]*<\/footer>/, footHTML(s));
    const gcss = g.bg ? `header.gh{background:${g.bg}!important}${dark(g.bg) ? 'header.gh nav.gn>.s2-mi>a,header.gh .logo,header.gh .hr .j{color:#fff!important}' : ''}` : '';
    head = head.replace('</style>', `${S2CSS}${pgCSS}${gcss}</style>`);
    const needRelax = full && (hasScriptCode(s) || (Object.values(S.settings.mkt || {}).some(Boolean) || (S.settings.chatbot?.type === 'channeltalk' && S.settings.chatbot.ctKey)));
    if (needRelax) head = head.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, `<meta http-equiv="Content-Security-Policy" content="${RELAXED}">`);
    if (full) { if (S.settings.favicon) head = head.replace('</title>', `</title><link rel="icon" href="${esc(S.settings.favicon)}">`); const mk = mktHead(); if (mk) head = head.replace('</head>', `${mk}\n</head>`); }
    const extra = (live || full) ? chatHTML(full) + (full || (UI.s2pop && cur === 'home') ? popHTML() : '') : '';
    tail = tail.replace('</body>', `${extra}</body>`);
    return head + '\n' + pages.join('\n') + '\n' + tail;
  }; }
  window.siteHTML = siteHTML;

  const S2CSS = `.s2-al-left{margin:0 auto 0 8px!important}.s2-al-center{margin:0 auto!important}.s2-al-right{margin:0 0 0 auto!important}nav.gn{align-items:center}
.s2-mi{position:relative;display:flex;align-items:center}.s2car{font-size:10px;opacity:.6}.s2-dd{display:none;position:absolute;top:100%;left:-14px;min-width:190px;background:#fff;border-radius:12px;box-shadow:0 14px 34px rgba(15,20,40,.16);padding:8px;z-index:40;flex-direction:column}
.s2-mi:hover .s2-dd,.s2-mi:focus-within .s2-dd{display:flex}.s2-dd a{padding:9px 12px;border-radius:8px;color:#3A3F4B!important;font-weight:500!important;white-space:nowrap;text-decoration:none;font-size:14px}.s2-dd a:hover{background:var(--bg2)}
.s2-sub-wide .s2-mi{position:static}.s2-sub-wide .s2-dd{left:0;right:0;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:16px max(28px,calc((100% - 1180px)/2 + 28px));border-radius:0 0 14px 14px}.s2-sub-wide .s2-mi:hover .s2-dd,.s2-sub-wide .s2-mi:focus-within .s2-dd{display:grid}
.s2lock{font-style:normal;font-size:10px;padding:1px 6px;border-radius:99px;background:#FFF3D6;color:#8A5A00;margin-left:3px}.s2logo{max-height:40px;max-width:190px;display:block}
.s2ph{padding:44px 0 34px;background:var(--lt);position:relative}.s2ph.img{background-size:cover;background-position:center;color:#fff;padding:84px 0 60px}.s2ph.img::before{content:'';position:absolute;inset:0;background:rgba(10,14,30,.45)}.s2ph .wrap{position:relative}.s2ph h1{margin:8px 0 0;font-size:clamp(26px,4vw,40px);letter-spacing:-.03em}
.s2bc{font-size:13px;opacity:.8;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.s2bc a{text-decoration:none}.s2note{background:#FFF3D6;color:#8A5A00;padding:8px 16px;font-size:13px}
.s2deny{text-align:center;padding:40px 0}.s2deny b{font-size:22px;display:block;margin-bottom:6px}.s2terms{white-space:pre-wrap;line-height:1.8;color:var(--mu)}
.s2s.s2dk h2,.s2s.s2dk h3,.s2s.s2dk b{color:#fff}.s2s.s2dk p,.s2s.s2dk .lead,.s2s.s2dk .s2body{color:rgba(255,255,255,.85)}.al-center .s2c,.al-center .sh{text-align:center;margin-left:auto;margin-right:auto}.al-right .s2c,.al-right .sh{text-align:right;margin-left:auto}.s2body{color:var(--mu);max-width:720px}
.s2ban{position:relative;overflow:hidden}.s2ban .wrap{padding-top:86px;padding-bottom:86px}.s2ban h1{font-size:clamp(30px,4.6vw,54px);letter-spacing:-.035em;line-height:1.18;margin:10px 0}.s2ban .hs{opacity:.85;max-width:620px}.s2ban .hb{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.s2ban.v1{background:var(--c);color:var(--on)}.s2ban.v1 .btn.pri{background:var(--on);color:var(--c)}.s2ban.v2{background:linear-gradient(rgba(10,14,30,.5),rgba(10,14,30,.5)),var(--bimg,var(--c)) center/cover;color:#fff}.s2ban.v3{background:var(--lt)}
.al-center{text-align:center}.al-center .hb{justify-content:center}.al-center .hs{margin-left:auto;margin-right:auto}.al-right{text-align:right}.al-right .hb{justify-content:flex-end}.al-right .hs{margin-left:auto}
.btn.gh2{box-shadow:inset 0 0 0 1.5px currentColor;color:inherit}.btn.sm{padding:9px 16px;font-size:13.5px}
.s2split{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}.s2bimg{border-radius:var(--r);overflow:hidden;background:var(--lt2);min-height:240px;display:grid;place-items:center;color:var(--mu)}.s2bimg img{width:100%;height:100%;object-fit:cover;display:block}
.s2sl{overflow:hidden;border-radius:var(--r)}.s2tr{display:flex}.s2tr>*{flex:0 0 100%;min-width:0}.s2tr.pv2>*{flex-basis:50%}.s2tr.pv3>*{flex-basis:33.333%}.s2tr.pv2>*,.s2tr.pv3>*{padding:0 8px;box-sizing:border-box}
.s2sli{background:var(--c);color:var(--on);min-height:280px;display:flex;align-items:center;padding:40px 48px;box-sizing:border-box;gap:30px}.s2sli.img{background:linear-gradient(rgba(10,14,30,.45),rgba(10,14,30,.45)),var(--bimg) center/cover;color:#fff}.s2sli h2{font-size:clamp(24px,3.4vw,38px);margin:0 0 8px}.s2sli .btn{margin-top:14px}
.s2sb.v2 .s2sli{border-radius:var(--r);min-height:220px}.s2sb.v3 .s2sli{background:var(--lt);color:var(--ink);display:grid;grid-template-columns:1fr 1fr}.s2sb .wrap{padding-top:28px;padding-bottom:28px}.s2sb.v1 .wrap{max-width:none;padding:0}.s2sb.v1 .s2sl{border-radius:0}
.s2dots{display:flex;gap:6px;justify-content:center;margin-top:12px}.s2dots i{width:7px;height:7px;border-radius:9px;background:var(--ln)}
.s2tx.v2 .s2cols>div{background:#fff;box-shadow:0 6px 22px rgba(15,20,40,.08);border-radius:var(--r);padding:22px}.s2tx.v4{background:var(--c);color:var(--on)}.s2tx.v4 h2,.s2tx.v4 b{color:var(--on)}.s2tx.v4 p{color:inherit;opacity:.85}
.s2cols{display:grid;gap:16px;margin-top:18px}.s2cols.n2{grid-template-columns:repeat(2,1fr)}.s2cols.n3{grid-template-columns:repeat(3,1fr)}.s2cols.n4{grid-template-columns:repeat(4,1fr)}.s2cols>div{border-radius:var(--r);padding:16px;background:var(--bg2)}.s2cols b{display:block;margin-bottom:4px}.s2cols p{margin:0;color:var(--mu)}.s2btnw{padding-top:0!important;padding-bottom:30px}
.s2im{display:grid;gap:18px}.s2im.grid.n1{grid-template-columns:1fr}.s2im.grid.n2{grid-template-columns:repeat(2,1fr)}.s2im.grid.n3{grid-template-columns:repeat(3,1fr)}.s2im.grid.n4{grid-template-columns:repeat(4,1fr)}.s2im.row{grid-template-columns:1fr}
.s2im figure{margin:0;border-radius:var(--r);overflow:hidden;background:#fff;box-shadow:0 0 0 1px var(--ln);position:relative}.s2im img,.s2sim img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}.s2im figcaption{padding:14px 16px}.s2im figcaption p{margin:4px 0 8px;color:var(--mu);font-size:14px}
.s2im.v1 figcaption{position:absolute;inset:auto 0 0 0;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff}.s2im.v1 figcaption p{color:rgba(255,255,255,.85)}.s2im.v3 figure{display:grid;grid-template-columns:42% 1fr;align-items:center}
.s2ph0{display:grid;place-items:center;aspect-ratio:4/3;background:var(--bg2);color:var(--mu)}.s2sim{margin:0;border-radius:var(--r);overflow:hidden;position:relative}.s2sim figcaption{position:absolute;left:0;right:0;bottom:0;padding:12px;background:linear-gradient(transparent,rgba(0,0,0,.65));color:#fff}
.s2hs{display:flex!important;overflow-x:auto;scroll-snap-type:x mandatory;gap:16px}.s2hs>*{flex:0 0 260px;scroll-snap-align:start}.s2th{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}.s2ca{display:block;text-decoration:none}
.s2vd{display:grid;gap:16px}.s2vd.n2,.s2vd.n4{grid-template-columns:repeat(2,1fr)}.s2vd.n3{grid-template-columns:repeat(3,1fr)}.s2v{position:relative;display:block;border-radius:var(--r);overflow:hidden;background:#111;color:#fff;text-decoration:none}.s2v img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;opacity:.9}.s2v .vph{display:block;aspect-ratio:16/9}.s2v .play{position:absolute;inset:0;display:grid;place-items:center}.s2v b{position:absolute;left:14px;bottom:10px;font-size:14px}
.s2mp{display:grid;grid-template-columns:1fr 1.3fr;gap:24px;align-items:stretch}.s2mp.v2{grid-template-columns:1fr}.s2map{position:relative;border-radius:var(--r);overflow:hidden;min-height:240px}.s2map svg{position:absolute;inset:0;width:100%;height:100%}.s2pinm{position:absolute;width:22px;height:22px;margin:-22px 0 0 -11px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--c);box-shadow:0 4px 10px rgba(0,0,0,.25)}.s2map em{position:absolute;left:12px;top:12px;background:#fff;border-radius:8px;padding:4px 10px;font-style:normal;font-size:13px;font-weight:700}.s2mapl{display:flex;gap:10px;margin-top:8px}.s2mapl a{font-size:13px;font-weight:700}
.s2nc{background:#fff;border-radius:var(--r);box-shadow:0 0 0 1px var(--ln);padding:18px;display:flex;flex-direction:column;gap:6px;min-height:110px;box-sizing:border-box}.s2nc .nt{font-size:12px;color:var(--c);font-weight:800}.s2nc time{font-size:12px;color:var(--mu)}
.s2cnote{font-size:12px;color:var(--mu);margin:0 0 6px}.s2code{width:100%;border:0;border-radius:var(--r);background:#fff}.s2chips{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 18px}.s2chips a,.s2chips span{padding:8px 14px;border-radius:99px;background:var(--bg2);text-decoration:none;font-weight:700;font-size:14px}.s2chips small{color:var(--c)}.s2cg{margin-top:22px}.s2cg h3{margin:0 0 12px}
.s2sns{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}.s2sns article{background:#fff;border-radius:var(--r);box-shadow:0 0 0 1px var(--ln);padding:16px}.s2sns header{display:flex;gap:8px;align-items:center;font-size:13px}.s2sns .avt{width:28px;height:28px;border-radius:50%;background:var(--lt2);display:grid;place-items:center;font-weight:800}.s2sns time{margin-left:auto;color:var(--mu)}.s2sns h3{font-size:16px;margin:10px 0 4px}.s2sns p{color:var(--mu);font-size:14px;margin:0 0 8px}.s2sns footer{font-size:12px;color:var(--mu)}
.s2tbl{width:100%;border-collapse:collapse}.s2tbl th,.s2tbl td{padding:12px 8px;border-bottom:1px solid var(--ln);text-align:left;font-size:14px}.s2sublist{display:grid;gap:10px}.s2sublist a{padding:16px;border-radius:var(--r);background:var(--bg2);font-weight:700;text-decoration:none}
.s2cd{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}.s2cd .btn{margin-top:16px}
.s2ft.lt{color:#4A4F5C}.s2ft.lt b,.s2ft.lt .fl2 a{color:#14161F}.s2ft .fl2 a{text-decoration:none;color:inherit}.s2ft.al-center .wrap{flex-direction:column;align-items:center}.s2ft.al-center .fl2{align-self:center}.s2ft.al-right .wrap{flex-direction:column;align-items:flex-end}.s2ft.al-right .fl2{align-self:flex-end}
.s2esc{display:inline-flex;gap:6px;align-items:center;margin-top:10px;padding:6px 12px;border-radius:8px;box-shadow:inset 0 0 0 1px currentColor;text-decoration:none;font-size:12px;color:inherit}
.s2chat{position:fixed;right:20px;bottom:20px;z-index:60;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:99px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 10px 28px rgba(0,0,0,.2)}.s2chat.l{right:auto;left:20px}.s2chat.k{background:#FEE500;color:#191919}.s2chat.c{background:var(--c);color:var(--on)}
.s2pop{position:fixed;z-index:70;top:calc(90px + var(--k)*24px);left:calc(24px + var(--k)*24px);width:min(340px,calc(100vw - 48px));background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:0 0 12px;overflow:hidden;display:flex;flex-direction:column;gap:6px}.s2pop img{width:100%;display:block}.s2pop b{padding:12px 16px 0;font-size:16px}.s2pop p{padding:0 16px;margin:0;font-size:14px;color:var(--mu)}.s2pop .btn{margin:4px 16px 0;align-self:flex-start}.s2pop label{align-self:flex-end;margin:4px 14px 0;font-size:13px;cursor:pointer;color:var(--mu)}.s2pcx:checked+.s2pop{display:none}
@media(max-width:860px){.s2split,.s2mp,.s2cd,.s2sb.v3 .s2sli{grid-template-columns:1fr}.s2cols.n3,.s2cols.n4,.s2im.grid.n3,.s2im.grid.n4,.s2vd.n3{grid-template-columns:repeat(2,1fr)}.s2-dd{position:static;box-shadow:none;padding:0 0 0 10px}.s2-sub-wide .s2-dd{grid-template-columns:1fr}}
@media(max-width:560px){.s2cols.n2,.s2cols.n3,.s2cols.n4,.s2im.grid.n2,.s2im.grid.n3,.s2im.grid.n4,.s2vd.n2,.s2vd.n3,.s2vd.n4,.s2im.v3 figure{grid-template-columns:1fr}.s2tr.pv2,.s2tr.pv3{animation:none!important;overflow-x:auto;scroll-snap-type:x mandatory}.s2tr.pv2>*,.s2tr.pv3>*{flex-basis:85%;scroll-snap-align:start}.s2sli{padding:28px 22px}}`;

  /* ── 섹션 편집: 페이지(메뉴)별 섹션 + 공통 디자인 옵션 ── */
  let SWAP = 0;
  function onPage(fn, keepRender) {
    const s = site(); s2norm(s); const pg = curPg(s); if (pg.key === 'home' || !pg.sections || SWAP) return fn();
    const home = s.sections; const R = render; s.sections = pg.sections; SWAP = 1; render = () => { };
    let r; try { r = fn(); } finally { if (pg.sb) pg.sb.sections = s.sections; else pg.m.sections = s.sections; s.sections = home; render = R; SWAP = 0; }
    save(); if (!keepRender) render(); return r;
  }
  ['site-mv', 'site-del'].forEach(k => { const b = ACT[k]; ACT[k] = el => onPage(() => b(el)); });
  { const b = ACT['site-ai']; ACT['site-ai'] = el => onPage(() => b(el), true); }
  { const b = ACT['site-add']; ACT['site-add'] = el => {
    const k = el.value; if (!k) return; const s = site(); s2norm(s); const pg = curPg(s);
    if (!pg.sections) { toast('기본 메뉴 페이지는 레이아웃이 고정되어 섹션을 추가할 수 없습니다.', 'warn'); el.value = ''; return; }
    const before = pg.sections.length;
    if (k === 'catBrowse') { pg.sections.push({ id: uid('s'), type: 'catBrowse', data: { title: `분야별 ${t('cls')}`, body: '', cats: [], per: 4 } }); save(); render(); }
    else onPage(() => b(el));
    const L = curPg(site()).sections; if (L.length > before) setTimeout(() => ACT['site-edit']({ dataset: { v: String(L.length - 1) } }), 0);
  }; }
  const sel = (name, opts, v) => `<select name="${name}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  function designFS(x) {
    const d = x.data || {}; const k = x.type; const sty = STY[k] || ['기본'];
    let h = `<fieldset class="s2f"><legend>디자인 · 표시</legend><div class="form2">`;
    if (sty.length > 1) h += `<label>디자인 스타일${sel('s2_dstyle', sty.map((l, i) => [i, l]), +d.dstyle || 0)}</label>`;
    h += `<label>텍스트 정렬${sel('s2_align', [['', '템플릿 기본'], ['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']], d.align || '')}</label>`;
    h += `<label>배경색<span class="s2bgr"><input type="checkbox" name="s2_bgon" ${d.bg ? 'checked' : ''} aria-label="배경색 사용"><input type="color" name="s2_bg" value="${esc(d.bg || '#F6F7FA')}" aria-label="배경색"></span></label>`;
    if (['classes', 'books', 'video', 'image', 'slideImage', 'catBrowse'].includes(k) || (k === 'notices' || k === 'reviews')) h += `<label class="wide">섹션 내용(설명)<input name="s2_body" maxlength="200" value="${esc(typeof d.body === 'string' ? d.body : '')}"></label>`;
    h += `</div>`;
    if (k === 'banner') h += `<div class="fl">배너 이미지${upField('name="s2_img"', d.img)}</div><div class="form2"><label>주 버튼 이동 경로${linkSel('s2_link', d.link)}</label><label>보조 버튼 이동 경로${linkSel('s2_link2', d.link2)}</label></div>`;
    if (k === 'slideBanner') { const L = (d.slides || []).map((tx, i) => ({ title: tx, ...(d.sx?.[i] || {}) })); h += rowsUI('slides', L, 4, '배너(슬라이드)'); }
    if (k === 'text') { if (!d.variant) h += `<label class="fl">텍스트 항목 · 순서(줄마다 「제목 | 내용」, 개수에 따라 배치가 바뀝니다)<textarea name="s2_cols" rows="4">${esc((d.cols || []).map(c => c.join(' | ')).join('\n'))}</textarea></label>`; h += `<div class="form2"><label>버튼 문구<input name="s2_btnL" maxlength="30" value="${esc(d.btnL || '')}"></label><label>버튼 이동 경로${linkSel('s2_link', d.link)}</label></div>`; }
    if (k === 'image') h += `<label class="fl">나열 방식${sel('s2_list', [['grid', '가로 나열(개수별 열)'], ['row', '세로 나열']], d.list || 'grid')}</label>` + rowsUI('imgs', d.imgs || [], 12, '이미지 카드');
    if (k === 'slideImage') h += `<label class="fl">슬라이드 시간(초)<input type="number" name="s2_sec" min="2" max="15" value="${esc(d.sec || 4)}"></label>` + rowsUI('imgs', d.imgs || [], 20, '슬라이드 이미지');
    if (k === 'video') h += rowsUI('vids', (d.vids && d.vids.length) ? d.vids : (d.url ? [{ url: d.url, title: '' }] : []), 4, '동영상');
    if (k === 'map') { const p = d.pin || { x: 50, y: 50 }; h += `<div class="form2"><label>장소 이름<input name="s2_place" maxlength="40" value="${esc(d.place || '')}"></label><label>상세 주소<input name="s2_detail" maxlength="80" value="${esc(d.detail || '')}" placeholder="동 · 호수 · 층"></label></div><div class="fl">위치 선택 — 지도를 눌러 핀을 놓으세요(데모)<div class="s2pin" data-act="s2-pin"><svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"><rect width="400" height="200" fill="#EEF1F5"/><path d="M0 60 L400 40 M0 150 L400 170 M90 0 L120 200 M260 0 L240 200" stroke="#fff" stroke-width="12" fill="none"/></svg><span class="pn" style="left:${+p.x}%;top:${+p.y}%"></span><input type="hidden" name="s2_px" value="${+p.x}"><input type="hidden" name="s2_py" value="${+p.y}"></div><small class="mini">운영 시 카카오 지도 검색으로 위치를 고릅니다.</small></div>`; }
    if (k === 'notices') h += `<div class="form2"><label>표시 개수(최대 5)<input type="number" name="s2_n" min="1" max="5" value="${esc(Math.min(5, +d.n || 3))}"></label><label>나열형 슬라이드 시간(초)<input type="number" name="s2_sec" min="2" max="15" value="${esc(d.sec || 5)}"></label></div>`;
    if (k === 'reviews') h += `<label class="fl">표시 개수(최근 후기)<input type="number" name="s2_n" min="1" max="12" value="${esc(+d.n || 6)}"></label>`;
    if (k === 'catBrowse') { const cats = (S.cats || []).filter(c => !c.parent); h += `<label class="fl">카테고리별 표시 개수<input type="number" name="s2_per" min="1" max="12" value="${esc(d.per || 4)}"></label><div class="fl">표시할 카테고리(선택 없으면 전체)${cats.length ? `<div class="chk">${cats.map(c => `<label><input type="checkbox" name="s2_cats" value="${esc(c.id)}" ${(d.cats || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div>` : `<p class="mini">등록된 카테고리가 없어 ${esc(t('cls'))} 유형별로 묶어 표시합니다.</p>`}</div>`; }
    if (k === 'code') h += `<div class="form2"><label>높이(px, 스크립트 허용 시)<input type="number" name="s2_h" min="60" max="2000" value="${esc(d.h || 320)}"></label><label class="ckl"><input type="checkbox" name="s2_showTitle" ${d.showTitle ? 'checked' : ''}> 제목 표시</label></div><label class="ckl"><input type="checkbox" name="s2_allow" ${d.allowScript ? 'checked' : ''} ${isOwner() ? '' : 'disabled'}> 스크립트 허용(위젯 · 마케팅 도구) — 격리된 sandbox iframe에서 실행${isOwner() ? '' : ' · 정운영자만 켤 수 있습니다'}</label><p class="mini">잘못된 코드를 넣으면 정상 동작하지 않습니다. 스크립트는 홈페이지와 분리된 영역에서만 실행되어 회원 정보 · 로그인에 접근할 수 없습니다.</p>`;
    return h + '</fieldset>';
  }
  function designRead(w, x) {
    const d = x.data = x.data || {}; const k = x.type; const q = n => w.querySelector(`[name="${n}"]`);
    if (q('s2_dstyle')) d.dstyle = +q('s2_dstyle').value || 0;
    d.align = q('s2_align')?.value || ''; d.bg = q('s2_bgon')?.checked ? q('s2_bg').value : '';
    if (q('s2_body')) d.body = q('s2_body').value.trim();
    if (k === 'banner') { d.img = q('s2_img')?.value || ''; d.link = linkRead(w, 's2_link') || ''; d.link2 = linkRead(w, 's2_link2') || ''; }
    if (k === 'slideBanner') { const L = rowsRead(w, 'slides') || []; if (!L.length) throw new Error('배너를 1개 이상 추가하세요.'); d.slides = L.map(o => o.title || '배너'); d.sx = L.map(({ img, sub, btn, link }) => ({ img, sub, btn, link })); }
    if (k === 'text') { if (q('s2_cols')) d.cols = q('s2_cols').value.split('\n').map(l => l.split('|').map(v => v.trim())).filter(r => r[0]).map(r => [r[0], r[1] || '']).slice(0, 8); d.btnL = q('s2_btnL')?.value.trim() || ''; d.link = linkRead(w, 's2_link') || ''; }
    if (k === 'image') { d.list = q('s2_list').value; d.imgs = rowsRead(w, 'imgs'); }
    if (k === 'slideImage') { d.sec = Math.min(15, Math.max(2, +q('s2_sec').value || 4)); d.imgs = rowsRead(w, 'imgs'); d.count = Math.max(1, d.imgs.length); }
    if (k === 'video') { const V = rowsRead(w, 'vids').filter(v => v.url || v.thumb); V.forEach(v => { if (v.url && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|vimeo\.com|player\.vimeo\.com)\//i.test(v.url)) throw new Error('동영상 주소는 YouTube · Vimeo 주소만 넣을 수 있습니다.'); }); d.vids = V; d.url = V[0]?.url || ''; }
    if (k === 'map') { d.place = q('s2_place').value.trim(); d.detail = q('s2_detail').value.trim(); d.pin = { x: +q('s2_px').value || 50, y: +q('s2_py').value || 50 }; }
    if (k === 'notices') { const n = +q('s2_n').value || 3; if (n > 5) toast('공지사항은 최대 5개까지 표시됩니다.', 'warn'); d.n = Math.min(5, Math.max(1, n)); d.sec = Math.min(15, Math.max(2, +q('s2_sec').value || 5)); }
    if (k === 'reviews') d.n = Math.min(12, Math.max(1, +q('s2_n').value || 6));
    if (k === 'catBrowse') { d.per = Math.min(12, Math.max(1, +q('s2_per').value || 4)); d.cats = $$('[name=s2_cats]:checked', w).map(e => e.value); }
    if (k === 'code') { d.h = Math.min(2000, Math.max(60, +q('s2_h').value || 320)); d.showTitle = q('s2_showTitle').checked; if (isOwner()) d.allowScript = q('s2_allow').checked; if (d.allowScript) logAudit('홈페이지 코드 블럭 스크립트 허용'); }
  }
  ACT['s2-pin'] = (el, e) => { const r = el.getBoundingClientRect(); const x = Math.round((e.clientX - r.left) / r.width * 100), y = Math.round((e.clientY - r.top) / r.height * 100); const p = el.querySelector('.pn'); p.style.left = x + '%'; p.style.top = y + '%'; el.querySelector('[name=s2_px]').value = x; el.querySelector('[name=s2_py]').value = y; };
  { const b = ACT['site-edit']; ACT['site-edit'] = el => {
    const s = site(); s2norm(s); const pg = curPg(s); const i = +el.dataset.v; const x = (pg.sections || s.sections)[i]; if (!x) return;
    if (x.type === 'catBrowse') { modal('카테고리 탐색 편집', `<label class="fl">제목<input name="title" maxlength="120" value="${esc(x.data.title || '')}"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { x.data.title = fv(w, 'title'); save(); render(); } }]); }
    else onPage(() => b(el), true);
    const w = $('#modal'); if (!w) return; const mb = w.querySelector('.mb');
    mb.querySelectorAll('p.mini').forEach(p => { if (/실제 운영 시 업로드/.test(p.textContent)) p.remove(); });
    if (x.type === 'code') { const lb = mb.querySelector('textarea[name=html]')?.closest('label'); if (lb && lb.firstChild.nodeType === 3) lb.firstChild.textContent = 'HTML · 위젯 코드(스크립트 허용을 끄면 스크립트 · 이벤트 속성은 제거됩니다)'; const ta = mb.querySelector('textarea[name=html]'); if (ta) { ta.rows = 8; ta.maxLength = 20000; } }
    if (x.type === 'video') mb.querySelector('[name=url]')?.closest('label')?.remove();
    if (x.type === 'slideBanner') mb.querySelector('[name=slides]')?.closest('label')?.remove();
    if (x.type === 'classes' || x.type === 'books') { if (x.type === 'books' && !mb.querySelector('[name=layout]')) mb.insertAdjacentHTML('beforeend', `<label class="fl">배치<select name="layout"><option value="grid">고정형(최대 4개)</option><option value="slide" ${x.data.layout === 'slide' ? 'selected' : ''}>슬라이드형(최대 12개)</option></select></label>`); }
    mb.insertAdjacentHTML('beforeend', designFS(x)); w.querySelector('.modal')?.classList.add('wide');
    const ok = w.querySelector('[data-mact="ok"]');
    ok && ok.addEventListener('click', e => { try { designRead(w, x); } catch (er) { e.stopPropagation(); toast(er.message, 'warn'); } });
  }; }

  /* ── 템플릿 바꾸기: 추가 메뉴 · GNB · 푸터 · 투명도 유지 ── */
  { const b = ACT['tpl-use']; ACT['tpl-use'] = el => { const prev = S.site; b(el); if (prev && S.site && S.site !== prev) { s2norm(prev); s2norm(S.site); S.site.gnb = prev.gnb; S.site.foot = prev.foot; S.site.alpha = prev.alpha;
    S.site.menus.forEach(m => { const o = prev.menus.find(x => x.kind === m.kind && m.kind !== 'custom'); if (o) Object.assign(m, { l: o.l, on: o.on, access: o.access, targets: o.targets, hide: o.hide, himg: o.himg, layout: o.layout, seo: o.seo, link: o.link }); });
    prev.menus.filter(m => m.kind === 'custom').forEach(m => S.site.menus.push(m)); save(); render(); } }; }

  /* ── 빌더 화면: GNB · 메뉴 트리 · 페이지 선택 · 사이트 설정 ── */
  const accTag = m => m.access === '공개' ? '' : tag(m.access === '지정 회원' ? `지정 ${(m.targets || []).length}` : '비공개', 'y');
  function menuCards(s) {
    const g = s.gnb; const P = s2pages(s); const cur = curPg(s); const mx = subMax(s);
    const gnb = `<div class="card s2card"><div class="ch"><b>상단 메뉴바(GNB)</b><small>로고 · 배경색 · 정렬</small></div>
      <div class="s2lg">${g.logo ? `<img src="${esc(g.logo)}" alt="로고 미리보기">` : `<span class="mini">로고 없음 — 기관명이 표시됩니다</span>`}<span class="sp"></span><label class="btn sm">로고 업로드<input type="file" accept="image/*" data-chg="s2-up" data-to="logo" hidden></label>${g.logo ? '<button class="btn sm ghost" data-act="s2-up-clr" data-to="logo">삭제</button>' : ''}</div>
      <div class="row"><span>배경색</span><span class="sp"></span><label class="ckl"><input type="checkbox" data-chg="s2-gbgon" ${g.bg ? 'checked' : ''}> 사용</label><input type="color" value="${esc(g.bg || '#FFFFFF')}" data-chg="s2-gbg" aria-label="GNB 배경색"></div>
      <div class="row"><span>메뉴 정렬</span><span class="sp"></span><div class="seg">${[['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']].map(([k, l]) => `<button class="${g.align === k ? 'on' : ''}" data-act="s2-galign" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="row"><span>하위 메뉴 스타일</span><span class="sp"></span><div class="seg">${[['vertical', '세로형 · 최대 12'], ['wide', '와이드형 · 최대 24']].map(([k, l]) => `<button class="${g.sub === k ? 'on' : ''}" data-act="s2-gsub" data-v="${k}">${l}</button>`).join('')}</div></div></div>`;
    const li = (m, i) => { const key = m.kind === 'home' ? 'home' : 'm-' + m.id; return `<li draggable="${m.kind === 'home' ? 'false' : 'true'}" data-g="top" data-i="${i}" class="${cur.key === key ? 'cur' : ''}"><span class="s2h" aria-hidden="true">⠿</span><button class="btn sm ghost s2eye ${m.on === false ? 'off' : ''}" data-act="s2-eye" data-m="${esc(m.id)}" ${m.kind === 'home' ? 'disabled title="홈은 항상 노출됩니다"' : ''} aria-label="${m.on === false ? '숨김 — 눌러서 노출' : '노출 중 — 눌러서 숨김'}">${m.on === false ? '◌' : '👁'}</button><a href="#" data-act="s2-go" data-v="${esc(key)}"><b>${esc(mN(m.l))}</b></a>${m.kind === 'custom' ? tag('추가', 'b') : ''}${accTag(m)}${m.link ? tag('이동 경로', '') : ''}<span class="sp"></span><button class="btn sm ghost" data-act="s2-medit" data-m="${esc(m.id)}">수정</button><button class="btn sm ghost" data-act="s2-mmv" data-m="${esc(m.id)}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="s2-mmv" data-m="${esc(m.id)}" data-d="1" aria-label="아래로">↓</button>
      ${m.subOn && Array.isArray(m.subs) ? `<ul class="s2sub">${m.subs.map((sb, j) => `<li draggable="true" data-g="${esc(m.id)}" data-i="${j}" class="${cur.key === `s-${m.id}-${sb.id}` ? 'cur' : ''}"><span class="s2h" aria-hidden="true">⠿</span><button class="btn sm ghost s2eye ${sb.on === false ? 'off' : ''}" data-act="s2-eye" data-m="${esc(m.id)}" data-s="${esc(sb.id)}" aria-label="${sb.on === false ? '숨김' : '노출 중'}">${sb.on === false ? '◌' : '👁'}</button><a href="#" data-act="s2-go" data-v="s-${esc(m.id)}-${esc(sb.id)}">${esc(sb.l)}</a>${accTag(sb)}${sb.link ? tag('이동 경로', '') : ''}<span class="sp"></span><button class="btn sm ghost" data-act="s2-medit" data-m="${esc(m.id)}" data-s="${esc(sb.id)}">수정</button><button class="btn sm ghost" data-act="s2-mmv" data-m="${esc(m.id)}" data-s="${esc(sb.id)}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="s2-mmv" data-m="${esc(m.id)}" data-s="${esc(sb.id)}" data-d="1" aria-label="아래로">↓</button></li>`).join('')}<li class="s2addsub"><button class="btn sm" data-act="s2-subadd" data-m="${esc(m.id)}" ${m.subs.length >= mx ? 'disabled' : ''}>+ 하위 메뉴 추가 (${m.subs.length}/${mx})</button></li></ul>` : ''}</li>`; };
    const menus = `<div class="card s2card"><div class="ch"><b>메뉴 · 페이지</b><small>드래그로 순서 변경 · 눈 아이콘으로 노출</small></div>
      <label class="fl">메뉴 선택하기(편집할 페이지)<select data-chg="s2-page" aria-label="편집할 메뉴 선택">${P.map(p => `<option value="${esc(p.key)}" ${p.key === cur.key ? 'selected' : ''}>${esc(p.label)}${p.sections ? '' : ' (기본 레이아웃)'}</option>`).join('')}</select></label>
      <ul class="slist s2tree">${s.menus.map(li).join('')}</ul><button class="btn sm pri" data-act="s2-madd">+ 메뉴 추가하기</button><p class="mini">숨긴 메뉴도 URL · 버튼 · 하위 메뉴 이동 경로로 들어올 수 있습니다. 접근 권한(비공개 · 지정 회원)을 걸면 권한이 없는 회원은 볼 수 없습니다.</p></div>`;
    return gnb + menus;
  }
  function siteCard() {
    const st = stNorm(); const c = st.chatbot, dm = st.domain, mk = st.mkt; const f = site().foot;
    const n = ['ga', 'gtm', 'meta', 'kakao', 'naver', 'head'].filter(k => mk[k]).length;
    return `<div class="card s2card"><div class="ch"><b>사이트 설정</b><small>푸터 · 챗봇 · 도메인 · 마케팅</small></div>
      <div class="row"><span>푸터</span><small class="mini">${f.align === 'left' ? '왼쪽' : f.align === 'center' ? '가운데' : '오른쪽'} 정렬${f.showCeo ? '' : ' · 대표명 숨김'}${f.showBiz ? '' : ' · 사업자번호 숨김'}${st.pg === 'toss' ? ' · 에스크로 표시' : ''}</small><span class="sp"></span><button class="btn sm" data-act="s2-foot">편집</button></div>
      <div class="row"><span>챗봇</span><small class="mini">${c.type === 'kakao' ? '카카오 비즈니스 채널' : c.type === 'channeltalk' ? '채널톡' : '사용 안 함'}</small><span class="sp"></span><button class="btn sm" data-act="s2-chat">설정</button></div>
      <div class="row"><span>도메인 · 주소</span><small class="mini">${esc(dm.status === '연결됨' ? dm.host : S.org.domain)} · ${esc(dm.status)}</small><span class="sp"></span><button class="btn sm" data-act="s2-domain">설정</button></div>
      <div class="row"><span>마케팅 · 분석</span><small class="mini">${n ? `코드 ${n}개 연결` : '미연결'}</small><span class="sp"></span><button class="btn sm" data-act="s2-mkt">설정</button></div>
      <div class="row"><span>팝업</span><small class="mini">${(st.popups || []).length}/4</small><span class="sp"></span><button class="btn sm" data-act="s2-popnew" ${(st.popups || []).length >= 4 ? 'disabled' : ''}>추가</button></div></div>`;
  }
  { const base = VIEWS.site; VIEWS.site = () => {
    if (!S.site?.tpl || UI.siteGallery) return base();
    const s = site(); s2norm(s); stNorm(); const pg = curPg(s);
    let h; if (pg.key !== 'home' && pg.sections) { const home = s.sections; s.sections = pg.sections; try { h = base(); } finally { s.sections = home; } } else h = base();
    h = h.replace('<small class="mini">흰 글자 대비가 낮으면 자동으로 어두운 글자를 씁니다</small>', `<small class="mini">흰 글자 대비가 낮으면 자동으로 어두운 글자를 씁니다</small></div><div class="bar2"><label class="mini" for="s2alpha">투명도</label><input id="s2alpha" type="range" min="20" max="100" step="5" value="${esc(s.alpha)}" data-chg="s2-alpha"><code>${esc(s.alpha)}%</code>${lum(blend(s.color, s.alpha)) > .7 ? '<small class="mini s2warn">너무 밝은 색은 일부 버튼이 잘 보이지 않을 수 있습니다</small>' : ''}`);
    const iM = h.indexOf('<div class="card"><div class="ch"><b>상단 메뉴</b>'), iS = h.indexOf('<div class="card"><div class="ch"><b>섹션</b>');
    if (iM >= 0 && iS > iM) h = h.slice(0, iM) + menuCards(s) + h.slice(iS);
    const iS2 = h.indexOf('<div class="card"><div class="ch"><b>섹션</b>');
    if (iS2 >= 0) {
      if (!pg.sections) { const e = h.indexOf('</ul></div>', iS2); const it = pg.m; h = h.slice(0, iS2) + `<div class="card s2card"><div class="ch"><b>${esc(pg.name)} 페이지</b><small>기본 메뉴 — 레이아웃 고정</small></div><p class="mini">기본 메뉴 페이지는 이름 · 헤더 이미지${it && (it.kind === 'community' || it.kind === 'board') ? ' · 레이아웃(SNS형/리스트형)' : ''} · 접근 권한을 바꿀 수 있습니다. 내용은 ${esc(pg.name)} 데이터로 자동 표시됩니다.</p>${it?.himg ? `<img class="s2himg" src="${esc(it.himg)}" alt="헤더 이미지">` : ''}<div class="bar2"><button class="btn sm pri" data-act="s2-medit" data-m="${esc(it?.id || '')}">상위 메뉴 수정</button>${it && (it.kind === 'community' || it.kind === 'board') ? `<span class="tag">${it.layout === 'sns' ? 'SNS형' : '리스트형'}</span>` : ''}</div></div>` + h.slice(e + 11); }
      else { h = h.replace('<div class="card"><div class="ch"><b>섹션</b>', `<div class="card"><div class="ch"><b>섹션 — ${esc(pg.name)}</b>`); if (!pg.sections.length) h = h.replace('<ul class="slist"></ul>', `<ul class="slist"></ul><p class="mini">'+ 섹션 추가'로 이 페이지를 구성하세요.${pg.kind === 'sub' ? ` 하위 메뉴 '수정'에서 이동 경로를 지정하면 이 페이지 대신 그곳으로 이동합니다.` : ''}</p>`); }
    }
    h = h.replace(/(<\/div>\s*)(<div class="bprev">)/, `${siteCard()}$1$2`);
    h = h.replace('<iframe id="sitePv"', `<div class="bar2 s2pvb"><small class="mini">편집 중: <b>${esc(pg.label)}</b></small><span class="sp"></span><label class="ckl mini"><input type="checkbox" data-chg="s2-pvpop" ${UI.s2pop ? 'checked' : ''}> 팝업 미리보기</label></div><iframe id="sitePv"`);
    return h;
  }; }
  AFTER.push(cur => {
    if (cur.tab !== 'site' && cur.ws !== 'site') return; const f = $('#sitePv'); if (!f || !S.site) return;
    /* 드래그로 메뉴 순서 변경 */
    $$('.s2tree li[draggable="true"]').forEach(li => {
      li.addEventListener('dragstart', e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', li.dataset.g + '|' + li.dataset.i); li.classList.add('drag'); });
      li.addEventListener('dragend', () => li.classList.remove('drag'));
      li.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); li.classList.add('over'); });
      li.addEventListener('dragleave', () => li.classList.remove('over'));
      li.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); li.classList.remove('over'); const [g, i] = (e.dataTransfer.getData('text/plain') || '').split('|'); if (g !== li.dataset.g) { toast('같은 단계의 메뉴끼리만 순서를 바꿀 수 있습니다.', 'warn'); return; } s2reorder(g, +i, +li.dataset.i); });
    });
  });
  function s2reorder(g, from, to) {
    const s = site(); const A = g === 'top' ? s.menus : s.menus.find(m => m.id === g)?.subs; if (!A || from === to || !A[from]) return;
    if (g === 'top' && (A[from].kind === 'home' || to === 0 && A[0].kind === 'home')) { toast('홈 메뉴는 맨 앞에 고정됩니다.', 'warn'); return; }
    const [it] = A.splice(from, 1); A.splice(to, 0, it); save(); render();
  }
  window.s2reorder = s2reorder;
  const findM = (mid, sid) => { const m = site().menus.find(x => x.id === mid); return sid ? m?.subs.find(x => x.id === sid) : m; };
  ACT['s2-page'] = el => { UI.sitePage = el.value; render(); };
  ACT['s2-go'] = el => { UI.sitePage = el.dataset.v; render(); };
  ACT['s2-alpha'] = el => { site().alpha = +el.value; save(); render(); };
  ACT['s2-gbgon'] = el => { site().gnb.bg = el.checked ? (site().gnb.bg || '#FFFFFF') : ''; save(); render(); };
  ACT['s2-gbg'] = el => { site().gnb.bg = el.value; save(); render(); };
  ACT['s2-galign'] = el => { site().gnb.align = el.dataset.v; save(); render(); };
  ACT['s2-gsub'] = el => { const s = site(); if (el.dataset.v === 'vertical' && s.menus.some(m => (m.subs || []).length > 12)) { toast('하위 메뉴가 12개를 넘는 메뉴가 있어 세로형으로 바꿀 수 없습니다. 하위 메뉴를 12개 이하로 줄이세요.', 'warn'); return; } s.gnb.sub = el.dataset.v; save(); render(); };
  ACT['s2-pvpop'] = el => { UI.s2pop = el.checked; render(); };
  ACT['s2-eye'] = el => { const it = findM(el.dataset.m, el.dataset.s); if (!it || it.kind === 'home') return; it.on = it.on === false; save(); render(); toast(it.on ? `「${it.l}」 메뉴를 노출합니다.` : `「${it.l}」 메뉴를 숨겼습니다(URL로는 접근 가능).`, 'ok'); };
  ACT['s2-mmv'] = el => { const s = site(); const g = el.dataset.s ? el.dataset.m : 'top'; const A = g === 'top' ? s.menus : findM(el.dataset.m).subs; const i = A.findIndex(x => x.id === (el.dataset.s || el.dataset.m)); s2reorder(g, i, Math.min(A.length - 1, Math.max(0, i + +el.dataset.d))); };
  ACT['s2-madd'] = () => modal('메뉴 추가하기', `<label class="fl">메뉴 이름<input name="l" maxlength="20" placeholder="예: 기관 소개"></label><label class="fl">접근 권한${sel('acc', [['공개', '공개'], ['비공개', '비공개'], ['지정 회원', '지정 회원']], '공개')}</label><label class="ckl"><input type="checkbox" name="subOn"> 하위 메뉴 사용</label><p class="mini">추가한 메뉴에는 섹션을 자유롭게 넣어 페이지를 꾸밀 수 있습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => {
    const l = fv(w, 'l'); if (!l) { toast('메뉴 이름을 입력하세요.', 'warn'); return false; } const s = site(); if (s.menus.some(m => m.l === l)) { toast('같은 이름의 메뉴가 있습니다.', 'warn'); return false; }
    const m = { id: uid('m'), kind: 'custom', l, on: true, access: fv(w, 'acc'), targets: [], hide: false, link: '', sections: [], subs: [], subOn: !!fv(w, 'subOn'), seo: { title: '', desc: '', kw: '' } };
    s.menus.push(m); UI.sitePage = 'm-' + m.id; logAudit(`홈페이지 메뉴 추가 — ${l}`); save(); render(); toast(`「${l}」 메뉴를 추가했습니다. 섹션을 추가해 페이지를 구성하세요.`, 'ok'); } }]);
  ACT['s2-subadd'] = el => { const s = site(), m = findM(el.dataset.m); const mx = subMax(s); if (m.subs.length >= mx) { toast(`하위 메뉴는 ${s.gnb.sub === 'wide' ? '와이드형' : '세로형'}에서 최대 ${mx}개입니다.`, 'warn'); return; }
    modal('하위 메뉴 추가', `<label class="fl">하위 메뉴 이름<input name="l" maxlength="20"></label><p class="mini">${esc(m.l)} 아래에 추가됩니다(${m.subs.length}/${mx}).</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => { const l = fv(w, 'l'); if (!l) { toast('이름을 입력하세요.', 'warn'); return false; } const sb = { id: uid('sb'), l, on: true, access: '공개', targets: [], hide: false, link: '', sections: [], seo: { title: '', desc: '', kw: '' } }; m.subs.push(sb); UI.sitePage = `s-${m.id}-${sb.id}`; save(); render(); } }]); };
  ACT['s2-medit'] = el => {
    const s = site(); const m = findM(el.dataset.m); if (!m) return; const sb = el.dataset.s ? findM(el.dataset.m, el.dataset.s) : null; const it = sb || m; const isHome = m.kind === 'home' && !sb;
    const kw = (it.seo?.kw || '');
    let b = `<label class="fl">메뉴 이름<input name="l" maxlength="20" value="${esc(it.l)}"></label>`;
    if (!isHome) b += `<div class="fl">헤더 이미지(페이지 상단)${upField('name="himg"', it.himg)}</div>`;
    if (!sb && (m.kind === 'community' || m.kind === 'board')) b += `<label class="fl">${esc(m.l)} 레이아웃${sel('layout', [['sns', 'SNS형(카드)'], ['list', '리스트형(목록)']], m.layout)}</label>`;
    if (!sb && m.kind === 'custom') b += `<label class="ckl"><input type="checkbox" name="subOn" ${m.subOn ? 'checked' : ''}> 하위 메뉴 사용(${s.gnb.sub === 'wide' ? '와이드형 최대 24' : '세로형 최대 12'})</label>`;
    if (sb || m.kind === 'custom') b += `<label class="fl">메뉴 이동 경로(누르면 이 페이지 대신 이동)${linkSel('link', it.link)}</label>`;
    if (!isHome) b += `<fieldset class="s2f"><legend>접근 권한</legend><label class="fl">접근 권한${sel('acc', [['공개', '공개'], ['비공개', '비공개(권한 없음 안내)'], ['지정 회원', '지정 회원만']], it.access)}</label><label class="ckl"><input type="checkbox" name="tgOn" ${(it.targets || []).length ? 'checked' : ''}> 지정 대상 설정</label>${pickUI(it.targets)}<label class="ckl"><input type="checkbox" name="hide" ${it.hide ? 'checked' : ''}> 지정 회원 외 대상에게 메뉴 숨김</label><p class="mini">눈 아이콘(미노출)은 메뉴명만 숨기고, 접근 권한은 URL로 들어와도 권한이 없으면 볼 수 없습니다.</p></fieldset>`;
    b += `<fieldset class="s2f"><legend>이 메뉴의 SEO</legend><div class="form2"><label>타이틀(30자)<input name="st" maxlength="30" value="${esc(it.seo?.title || '')}"></label><label>키워드(20개 이내, 쉼표)<input name="sk" value="${esc(kw)}"></label></div><label class="fl">메타 설명(160자)<input name="sd" maxlength="160" value="${esc(it.seo?.desc || '')}"></label><p class="mini">학원은 「지역명 + 학원명」 조합이 효과적입니다. SEO 설정이 검색 상단 노출을 보장하지는 않습니다.</p></fieldset>`;
    const acts = [{ id: 'c', label: '취소' }];
    if (m.kind === 'custom') acts.unshift({ id: 'del', label: sb ? '하위 메뉴 삭제' : '메뉴 삭제', kind: 'red', run: () => { modal('메뉴 삭제', `<p>「${esc(it.l)}」${sb ? '' : ' 메뉴와 하위 메뉴'} 페이지와 섹션이 삭제됩니다. 되돌릴 수 없습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { if (sb) m.subs = m.subs.filter(x => x !== sb); else s.menus = s.menus.filter(x => x !== m); UI.sitePage = 'home'; logAudit(`홈페이지 메뉴 삭제 — ${it.l}`); save(); render(); } }]); return false; } });
    acts.push({ id: 'ok', label: '저장', kind: 'pri', run: w => {
      const l = fv(w, 'l'); if (!l) { toast('메뉴 이름을 입력하세요.', 'warn'); return false; }
      const kws = fv(w, 'sk').split(',').map(v => v.trim()).filter(Boolean); if (kws.length > 20) { toast('키워드는 20개 이내로 입력하세요.', 'warn'); return false; }
      let link; try { link = linkRead(w, 'link'); } catch (er) { toast(er.message, 'warn'); return false; }
      const key = sb ? `s-${m.id}-${sb.id}` : 'm-' + m.id; if (link === 'page:' + key) { toast('자기 자신으로는 이동 경로를 지정할 수 없습니다.', 'warn'); return false; }
      if (!isHome) { const acc = fv(w, 'acc'); const tg = fv(w, 'tgOn') ? $$('[data-pick]:checked', w).map(e => e.value) : []; if (acc === '지정 회원' && !tg.length) { toast('지정 회원을 1명(또는 1개 팀) 이상 선택하세요.', 'warn'); return false; } it.access = acc; it.targets = tg; it.hide = !!fv(w, 'hide') && tg.length > 0; it.himg = w.querySelector('[name=himg]')?.value || ''; }
      if (link !== undefined) it.link = link;
      if (w.querySelector('[name=layout]')) m.layout = fv(w, 'layout');
      if (!sb && m.kind === 'custom') m.subOn = !!fv(w, 'subOn');
      it.l = l; it.seo = { title: fv(w, 'st'), desc: fv(w, 'sd'), kw: kws.join(', ') };
      if (isHome) { S.settings.seo = S.settings.seo || {}; if (it.seo.title) S.settings.seo.title = it.seo.title; if (it.seo.desc) S.settings.seo.desc = it.seo.desc; if (it.seo.kw) S.settings.seo.kw = it.seo.kw; }
      logAudit(`홈페이지 메뉴 수정 — ${l}`); save(); render(); toast('메뉴를 저장했습니다.', 'ok'); } });
    modal(`${sb ? '하위 메뉴' : '상위 메뉴'} 수정 — ${it.l}`, b, acts, true);
  };

  /* ── 푸터 ── */
  ACT['s2-foot'] = () => { const s = site(), f = s.foot, ft = S.settings.footer || (S.settings.footer = {});
    modal('푸터 편집', `<div class="form2"><label>배경색<span class="s2bgr"><input type="checkbox" name="bgon" ${f.bg ? 'checked' : ''} aria-label="배경색 사용"><input type="color" name="bg" value="${esc(f.bg || '#11131A')}" aria-label="푸터 배경색"></span></label><label>정렬${sel('al', [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']], f.align)}</label></div>
      <div class="form2">${[['company', '회사명(상호)'], ['ceo', '대표명'], ['biz', '사업자 등록번호'], ['mail', '통신판매업 신고번호'], ['reg', FOOT_REG()], ['addr', '주소'], ['tel', '연락처']].map(([k, l]) => `<label>${esc(l)}<input name="f_${k}" maxlength="60" value="${esc(ft[k] || '')}"></label>`).join('')}</div>
      <label class="ckl"><input type="checkbox" name="showCeo" ${f.showCeo ? 'checked' : ''}> 대표명 노출</label><label class="ckl"><input type="checkbox" name="showBiz" ${f.showBiz ? 'checked' : ''}> 사업자 등록번호 노출</label>
      <p class="mini">${S.settings.pg === 'toss' ? '토스 PG가 연결되어 있어 에스크로 서비스 로고와 가입 확인 버튼이 푸터에 표시됩니다.' : '토스 PG를 연결하면 에스크로 서비스 로고와 가입 확인 버튼이 자동으로 표시됩니다.'} 이용약관 · 개인정보 처리방침은 푸터 링크로 연결됩니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => {
      if (fv(w, 'f_biz') && !/^\d{3}-?\d{2}-?\d{5}$/.test(fv(w, 'f_biz'))) { toast('사업자 등록번호는 10자리 숫자(000-00-00000)입니다.', 'warn'); return false; }
      f.bg = fv(w, 'bgon') ? fv(w, 'bg') : ''; f.align = fv(w, 'al'); f.showCeo = !!fv(w, 'showCeo'); f.showBiz = !!fv(w, 'showBiz'); ['company', 'ceo', 'biz', 'mail', 'reg', 'addr', 'tel'].forEach(k => { ft[k] = fv(w, 'f_' + k); }); save(); render(); toast('푸터를 저장했습니다.', 'ok'); } }], true); };

  /* ── 챗봇 ── */
  ACT['s2-chat'] = () => { const c = stNorm().chatbot;
    modal('챗봇 설정', `<div class="s2hint"><b>카카오 비즈니스 채널</b>은 홈페이지 소식을 카카오톡으로 알리는 데 적합하고, <b>채널톡</b>은 상담 워크플로우로 자동 응대를 할 때 효과적입니다.</div>
      <div class="seg2 full">${[['none', '사용 안 함'], ['kakao', '카카오 비즈니스 채널'], ['channeltalk', '채널톡']].map(([k, l]) => `<label class="ckl"><input type="radio" name="ty" value="${k}" ${c.type === k ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <label class="fl">카카오 채널 홈 URL 또는 채팅 URL<input name="ku" maxlength="120" value="${esc(c.kakaoUrl)}" placeholder="https://pf.kakao.com/_xxxxx/chat"></label>
      <label class="fl">채널톡 플러그인 키<input name="ck" maxlength="60" value="${esc(c.ctKey)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label><p class="mini">채널톡 로그인 → [채널 설정] › [일반 설정] › [버튼 설치 및 설정] › [채널톡 버튼 설치]에서 발급합니다. 키는 홈페이지에 공개되는 값이며, 시크릿 키는 입력하지 않습니다.</p>
      <div class="form2"><label>버튼 문구<input name="lb" maxlength="12" value="${esc(c.label)}"></label><label>버튼 위치${sel('pos', [['right', '오른쪽 아래'], ['left', '왼쪽 아래']], c.pos)}</label></div><p class="mini">연동 해제는 디디쌤 고객센터에 요청합니다. 미리보기에는 플로팅 버튼이 표시되고, 게시된 홈페이지에서 실제 채널이 열립니다(데모).</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => {
      const ty = w.querySelector('[name=ty]:checked')?.value || 'none'; const ku = fv(w, 'ku'), ck = fv(w, 'ck');
      if (ty === 'kakao' && !/^https:\/\/pf\.kakao\.com\/_[A-Za-z0-9]+(\/chat|\/friend)?\/?$/.test(ku)) { toast('카카오 채널 URL 형식을 확인하세요(예: https://pf.kakao.com/_abcde/chat).', 'warn'); return false; }
      if (ty === 'channeltalk' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ck)) { toast('채널톡 플러그인 키 형식(8-4-4-4-12)을 확인하세요.', 'warn'); return false; }
      Object.assign(c, { type: ty, kakaoUrl: ku, ctKey: ck, label: fv(w, 'lb') || '상담하기', pos: fv(w, 'pos') }); S.settings.kakao = ty === 'kakao'; if (ty === 'channeltalk') S.settings.consultKeys = true;
      /* 운영: 채널톡 · 카카오 채널 연결 상태 확인 API */ logAudit(`홈페이지 챗봇 — ${ty}`); save(); render(); toast('챗봇을 저장했습니다.', 'ok'); } }], true); };

  /* ── 도메인 · 이름 · 주소 · 파비콘 ── */
  const DGUIDE = {
    '가비아': ['가비아 로그인 → My가비아 → 관리툴로 이동합니다.', 'DNS 정보에서 도메인 포워딩을 변경합니다.', '유동 포워딩으로 설정하면 20분 이내 적용됩니다.'],
    '카페24': ['카페24 로그인 → 나의 서비스 관리 → 도메인 관리로 이동합니다.', '도메인 기본관리 › 서브 도메인 → 도메인 선택 → 설정/변경 › [포워딩 관리]로 이동합니다.', '유동 포워딩(권장)을 고르고 웹사이트 제목과 포워딩 주소를 입력합니다.'],
    'NHN': ['NHN 도메인 마이페이지에 접속합니다.', '포워딩 서비스 메뉴 → [포워딩 신청]을 누릅니다.', '유동 포워딩을 고르고 타이틀과 연결 주소(디디쌤 주소)를 입력해 신청합니다.'],
    '기타': ['도메인 업체 관리 화면에서 DNS · 포워딩 메뉴로 이동합니다.', '유동 포워딩으로 디디쌤 주소를 연결하거나, CNAME 레코드를 등록합니다.', '적용까지 업체에 따라 수 분 ~ 48시간 걸립니다.']
  };
  const DSTEP = ['미신청', '신청 접수', '포워딩 설정 대기', '연결 확인 중', '연결됨'];
  ACT['s2-domain'] = () => { const st = stNorm(); const dm = st.domain; const sub = S.org.domain.replace(/\.didisam\.com$/, ''); const lock = S.org.infoChg || {};
    const g = DGUIDE[dm.vendor] || DGUIDE['기타']; const si = Math.max(0, DSTEP.indexOf(dm.status));
    modal('도메인 · 홈페이지 정보', `<fieldset class="s2f"><legend>홈페이지 이름 · 주소 (각 1회 변경)</legend><div class="form2"><label>홈페이지 이름<input name="nm" maxlength="30" value="${esc(S.org.name)}" ${lock.name ? 'disabled' : ''}></label><label>주소<span class="s2dom"><input name="sd" maxlength="30" value="${esc(sub)}" ${lock.addr ? 'disabled' : ''}><small>.didisam.com</small></span></label></div><p class="mini">${lock.name ? `이름은 ${esc(lock.name)}에 변경했습니다. ` : ''}${lock.addr ? `주소는 ${esc(lock.addr)}에 변경했습니다. ` : ''}한 번만 바꿀 수 있으니 신중하게 입력하세요.</p></fieldset>
      <fieldset class="s2f"><legend>파비콘(브라우저 탭 아이콘)</legend><div class="s2fav">${st.favicon ? `<img src="${esc(st.favicon)}" width="32" height="32" alt="32px"><img src="${esc(st.favicon)}" width="60" height="60" alt="180px 축소"><button type="button" class="btn sm ghost" data-act="s2-up-clr" data-to="favicon">삭제</button>` : '<span class="mini">등록된 파비콘이 없습니다.</span>'}<label class="btn sm">파비콘 업로드<input type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" data-chg="s2-up" data-to="favicon" hidden></label></div><p class="mini">정사각형 PNG(180×180 권장) · 200KB 이하</p></fieldset>
      <fieldset class="s2f"><legend>개인 도메인 연결 (유료 옵션)</legend><div class="form2"><label>연결할 도메인<input name="host" maxlength="80" value="${esc(dm.host)}" placeholder="www.myacademy.co.kr"></label><label>도메인 구입처${sel('vendor', Object.keys(DGUIDE).map(k => [k, k]), dm.vendor)}</label><label>포워딩 방식${sel('mode', [['유동', '유동 포워딩(권장) — 주소창에 내 도메인 표시'], ['고정', '고정 포워딩 — 입력한 서브도메인 표시']], dm.mode)}</label></div>
        <ol class="s2steps">${DSTEP.slice(1).map((x, k) => `<li class="${si > k ? 'done' : si === k + 1 ? 'on' : ''}">${esc(x)}</li>`).join('')}</ol>
        <div class="s2hint"><b>${esc(dm.vendor)} 연결 방법</b><ol>${g.map(x => `<li>${esc(x)}</li>`).join('')}</ol><p>포워딩 주소: <code>https://${esc(S.org.domain)}</code> · CNAME 방식: <code>www</code> → <code>${esc(S.org.domain)}</code></p><p class="mini">유동 포워딩은 메인 도메인이, 고정 포워딩은 입력한 서브도메인이 주소창에 보입니다. 기존 홈페이지를 유지하려면 서브도메인(예: edu.내도메인)으로 연결하세요.</p></div>
        <p class="mini">상태: <b>${esc(dm.status)}</b>${(dm.log || []).length ? ` · 최근 ${esc(dm.log[0].at)} ${esc(dm.log[0].s)}` : ''} · 데모에서는 단계 진행 버튼으로 상태를 바꿉니다.</p></fieldset>`,
      [{ id: 'c', label: '닫기' }, ...(dm.status !== '미신청' && dm.status !== '연결됨' ? [{ id: 'next', label: `다음 단계: ${DSTEP[si + 1]}`, run: w => { dm.status = DSTEP[si + 1]; dm.log.unshift({ at: nowStr(), s: dm.status }); /* 운영: DNS 조회로 연결 확인 */ save(); render(); setTimeout(() => ACT['s2-domain'](), 0); } }] : []),
        { id: 'ok', label: dm.status === '미신청' ? '저장 · 도메인 연결 신청' : '저장', kind: 'pri', run: w => {
          const nm = fv(w, 'nm'), sd = fv(w, 'sd').toLowerCase(), host = fv(w, 'host').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
          if (!lock.name && nm && nm !== S.org.name) { S.org.name = nm; S.org.infoChg = { ...lock, name: today() }; logAudit(`홈페이지 이름 변경 — ${nm}`); }
          if (!lock.addr && sd && sd !== sub) { if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(sd)) { toast('주소는 영문 소문자 · 숫자 · 하이픈 3~30자입니다.', 'warn'); return false; } S.org.domain = sd + '.didisam.com'; S.org.infoChg = { ...(S.org.infoChg || lock), addr: today() }; logAudit(`홈페이지 주소 변경 — ${S.org.domain}`); }
          if (host && !/^(?=.{4,80}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host)) { toast('도메인 형식을 확인하세요(예: www.myacademy.co.kr).', 'warn'); return false; }
          if (host.endsWith('.didisam.com')) { toast('디디쌤 기본 주소는 개인 도메인으로 등록할 수 없습니다.', 'warn'); return false; }
          dm.vendor = fv(w, 'vendor'); dm.mode = fv(w, 'mode');
          if (host !== dm.host) { dm.host = host; dm.status = host ? '신청 접수' : '미신청'; dm.log.unshift({ at: nowStr(), s: host ? `${host} 연결 신청` : '연결 해제' }); if (host) logAudit(`개인 도메인 연결 신청 — ${host}`); }
          save(); render(); toast(host && dm.status === '신청 접수' ? '도메인 연결을 신청했습니다(유료 옵션 · 데모). 안내에 따라 포워딩을 설정하세요.' : '저장했습니다.', 'ok'); } }], true); };

  /* ── 마케팅 · 분석 ── */
  const MKV = { ga: [/^G-[A-Z0-9]{4,20}$/, 'GA4 측정 ID(G-XXXXXXX)'], gtm: [/^GTM-[A-Z0-9]{4,12}$/, 'GTM 컨테이너 ID(GTM-XXXXXX)'], meta: [/^\d{10,20}$/, '메타 픽셀 ID(숫자)'], kakao: [/^\d{10,25}$/, '카카오 픽셀 ID(숫자)'], naver: [/^[a-z0-9]{6,20}$/i, '네이버 애널리틱스 사이트 ID'] };
  ACT['s2-mkt'] = () => { const mk = stNorm().mkt;
    modal('마케팅 · 분석 연동', `<p class="mini">픽셀 · 분석 코드를 심어 ${esc(t('learner'))} 유입 동선을 확인합니다. 코드는 게시된 홈페이지에만 삽입되고 미리보기에서는 실행되지 않습니다.</p><div class="form2">${Object.entries(MKV).map(([k, [, l]]) => `<label>${esc(l)}<input name="${k}" maxlength="30" value="${esc(mk[k])}"></label>`).join('')}</div>
      <label class="fl">추가 head 코드(기타 픽셀 · 사이트 인증 메타 태그)<textarea name="head" rows="4" maxlength="5000" ${isOwner() ? '' : 'disabled'} placeholder="<meta name=&quot;naver-site-verification&quot; content=&quot;...&quot;>">${esc(mk.head)}</textarea></label><p class="mini">${isOwner() ? '잘못된 코드를 넣으면 홈페이지가 정상 동작하지 않을 수 있습니다.' : '추가 head 코드는 정운영자만 수정할 수 있습니다.'} 메뉴별 SEO는 메뉴 '수정'에서 설정합니다. 마케팅 대행은 제공하지 않습니다.</p>
      <div class="bar2"><button type="button" class="btn sm" data-act="s2-local">지역 마케팅 체크리스트(당근 · 네이버 플레이스 · 카카오맵)</button></div>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => {
      for (const [k, [re, l]] of Object.entries(MKV)) { const v = fv(w, k); if (v && !re.test(v)) { toast(`${l} 형식을 확인하세요.`, 'warn'); return false; } }
      Object.keys(MKV).forEach(k => { mk[k] = fv(w, k); }); if (isOwner()) mk.head = w.querySelector('[name=head]').value.trim(); S.settings.pixel = mk.ga || S.settings.pixel || '';
      logAudit('홈페이지 마케팅 코드 저장'); save(); render(); toast('마케팅 연동을 저장했습니다.', 'ok'); } }], true); };
  const LOCAL = {
    daangn: ['당근 비즈니스 프로필', ['당근 앱 설치 · 로그인', '내 근처 › 비즈니스 프로필 만들기', '가게 정보 입력(이름 · 업종 · 주소 · 소개 · 전화 · 영업시간 · 사진 3장 이상 · 태그)', '사업자 인증', '소식 발행 · 채팅 문의 응대 · 단골 관리', '(선택) 피드 · 검색 광고에 홈페이지 노출']],
    naver: ['네이버 스마트플레이스', ['스마트플레이스 접속 · 네이버 ID 로그인', '업체 신규 등록(업종 · 주소 · 전화)', '대표 사진 5장 · 키워드 10개 · 소개 · 부가 정보 입력', '사업자 정보 확인 서류 제출', '검수 대기(약 2~3 영업일)', '리뷰 답변 · 정보 업데이트 · 사진 추가']],
    kakao: ['카카오맵 장소 등록', ['카카오맵 장소 등록 페이지 접속 · 로그인', '새 장소 등록', '장소명 · 주소 · 업종 · 전화 · 사진 · 설명 · 영업시간 · 웹사이트 · 키워드 입력', '사업자 정보 확인', '등록 신청 · 검수', '리뷰 답변 · 정보 최신화']]
  };
  ACT['s2-local'] = () => { const st = stNorm(); const lm = st.localMkt; const ft = st.footer || {}; const region = (ft.addr || '').split(/\s+/).slice(0, 2).join(' ') || '지역명'; const nm = S.org.name;
    const kws = [`${region.split(' ').pop()} ${nm}`, nm, `${region.split(' ').pop()} ${t('cls')}`, `${region.split(' ').pop()} ${S.org.type === 'k12' ? '학원' : S.org.type === 'adult' ? '자격증' : '교육'}`, ...(S.classes.slice(0, 6).map(c => c.name.split(/\s+/)[0]))].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 10);
    const intro = `${region}의 ${nm}입니다. ${S.classes.slice(0, 3).map(c => c.name).join(' · ') || t('cls')}을(를) 운영하며, ${t('learner')} 한 명 한 명의 진도와 결과를 꼼꼼히 관리합니다.`;
    modal('지역 마케팅 체크리스트', `<div class="s2hint"><b>✦ AI 초안</b><p>${esc(intro)}</p><p>키워드 10개: ${kws.map(k => `<code>${esc(k)}</code>`).join(' ')}</p><button type="button" class="btn sm" data-act="s2-copy" data-v="${esc(intro + '\n' + kws.join(', '))}">복사</button></div>${Object.entries(LOCAL).map(([k, [n, steps]]) => `<fieldset class="s2f"><legend>${esc(n)} <small class="mini">${steps.filter((x, i) => lm[k + i]).length}/${steps.length}</small></legend>${steps.map((x, i) => `<label class="ckl"><input type="checkbox" data-chg="s2-lm" data-k="${k}${i}" ${lm[k + i] ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</fieldset>`).join('')}`, [{ id: 'ok', label: '닫기', kind: 'pri' }], true); };
  ACT['s2-lm'] = el => { stNorm().localMkt[el.dataset.k] = el.checked; save(); };
  ACT['s2-copy'] = el => { try { navigator.clipboard.writeText(el.dataset.v); toast('복사했습니다.', 'ok'); } catch (e) { toast('복사하지 못했습니다.', 'warn'); } };

  /* ── 팝업: 이동 URL 또는 클래스 · 이미지 ── */
  function popModal() { const st = stNorm(); if (st.popups.length >= 4) { toast('팝업은 최대 4개까지 추가할 수 있습니다.', 'warn'); return; }
    modal('팝업 추가', `<label class="fl">제목<input name="t" maxlength="40"></label><label class="fl">내용<input name="body" maxlength="120"></label><div class="fl">이미지${upField('name="img"', '')}</div><label class="fl">이동 경로(URL 또는 ${esc(t('cls'))} 페이지)${linkSel('lk', '')}</label><div class="form2"><label>시작<input type="date" name="s" value="${today()}"></label><label>종료<input type="date" name="e" value="${addDays(today(), 14)}"></label></div><p class="mini">약관이 바뀌었을 때도 팝업 · 공지로 안내하세요.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '추가', kind: 'pri', run: w => {
      if (!fv(w, 't')) { toast('제목을 입력하세요.', 'warn'); return false; } if (fv(w, 'e') < fv(w, 's')) { toast('종료일이 시작일보다 빠릅니다.', 'warn'); return false; }
      let lk; try { lk = linkRead(w, 'lk'); } catch (er) { toast(er.message, 'warn'); return false; }
      st.popups.push({ id: uid('pp'), t: fv(w, 't'), body: fv(w, 'body'), img: w.querySelector('[name=img]').value, link: lk || '', s: fv(w, 's'), e: fv(w, 'e'), on: true }); save(); render(); toast('팝업을 추가했습니다.', 'ok'); } }], true); }
  ACT['popup-new'] = popModal; ACT['s2-popnew'] = popModal;

  /* ── 설정 화면 연결(홈페이지 설정 · 서비스 설정) ── */
  { const base = VIEWS.settings; VIEWS.settings = () => { let h = base(); const tb = UI.settings;
    if (tb === 'home') { const st = stNorm(); h += `<div class="card s2card"><div class="ch"><b>홈페이지 연결</b><small>도메인 · 마케팅 · 챗봇 · 메뉴별 SEO</small></div><div class="row"><span>개인 도메인</span><small class="mini">${esc(st.domain.host || '미신청')} · ${esc(st.domain.status)}</small><span class="sp"></span><button class="btn sm" data-act="s2-domain">설정</button></div><div class="row"><span>픽셀 · 분석 코드</span><small class="mini">GA4 · GTM · 메타 · 카카오 · 네이버</small><span class="sp"></span><button class="btn sm" data-act="s2-mkt">설정</button></div><div class="row"><span>홈페이지 챗봇</span><small class="mini">${st.chatbot.type === 'none' ? '사용 안 함' : st.chatbot.type === 'kakao' ? '카카오 비즈니스 채널' : '채널톡'}</small><span class="sp"></span><button class="btn sm" data-act="s2-chat">설정</button></div><div class="row"><span>지역 마케팅</span><small class="mini">당근 · 네이버 플레이스 · 카카오맵</small><span class="sp"></span><button class="btn sm" data-act="s2-local">체크리스트</button></div><p class="mini">상단 메뉴별 SEO는 홈페이지 › 메뉴 '수정'에서 설정합니다. SEO 설정이 검색 상단 노출을 보장하지는 않습니다.</p></div>`; }
    if (tb === 'service') h += `<div class="card s2card"><div class="ch"><b>홈페이지 이름 · 주소 · 파비콘</b></div><div class="row"><span>${esc(S.org.name)}</span><code>${esc(S.org.domain)}</code><span class="sp"></span><button class="btn sm" data-act="s2-domain">변경</button></div></div>`;
    return h; }; }

  /* 기존 저장 데이터 보정 */
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = () => { base(); try { if (S.site) s2norm(S.site); if (S.settings) stNorm(); } catch (e) { console.error(e); } }; }
})();
