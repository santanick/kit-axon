/* v34.5 hpsec-nav — 머리글 · PC 메뉴 · 휴대폰 메뉴 · 바닥글 기본 렌더러 개선 (디자이너 S1, fix6/BRIEF3.md)
   - 테마(HPT)가 있는 사이트의 siteHTML 머리글(header.gh) · 바닥글(footer.gf)을 감싸 새 부품으로 바꾼다. 테마가 없으면 손대지 않는다.
   - 머리글 5종: overlay(사진 · 어두운 첫 화면 위 투명 겹침, 스크롤하면 흰 바탕) · solid(흰 바탕 고정) · notice(공지 띠 1줄 + 흰 바탕)
                 · contact(전화번호 + 신청 버튼) · float(떠 있는 상자). 공지 띠는 어느 종류에도 붙는다(공지가 있을 때).
   - 휴대폰 메뉴 2종: full(전체 화면 목록) · drawer(오른쪽 86% 서랍). 햄버거 · 닫기 터치 44px, 항목 높이 54px, 전체 폭 신청 버튼.
     스크립트 없이(CSP) 체크박스 + label로 열고 닫는다. 하위 메뉴는 details 아코디언.
   - 바닥글 5종: mega(어두운 바탕 + 초대형 기관명) · cta(신청 띠와 이어진 진한 색면) · biz(사업자 정보 2열 표) · min(최소형 한 줄) · cols(링크 열 + 연락처)
   - 사실 원칙: 전화 · 주소 · 운영 시간 · 사업자 정보는 S.settings.footer 설정값만 쓰고, 비어 있으면 줄째 숨긴다.
   - 레이어 팝업(.s2pop)은 쓰지 않는다. 진행 중인 팝업 1건은 머리글 위 한 줄 공지 띠(닫기 가능)로 바꿔 보여 준다.
   - 데이터: site.hps = { head, foot, mm, notice: { on, text, link }, cta, ctaTitle, tagline } (모두 선택, 없으면 계열 · 테마 · 유형으로 자동)
   - 노출: window.HPS.nav(kind, ctx) · HPS.footer(kind, ctx) · HPS.chrome(site) · HPS.css(site) · HPS.kinds
   - 계열(HPL)이 바닥글 · 머리글 종류를 정하고 싶으면 HPL.reg(id, { hps: { head: 'overlay', foot: 'mega', mm: 'full' } })처럼 적는다.
   - 사진 · 어두운 첫 화면을 그리는 렌더러는 첫 섹션에 data-hps-dark를 붙이면 overlay 머리글이 그 위에 겹친다. */
(() => {
  if (typeof siteHTML !== 'function') return;
  const HPS = window.HPS = window.HPS || {};
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$|^-$|^—$/.test(String(v == null ? '' : v));
  const ok6 = c => /^#[0-9a-f]{6}$/i.test(String(c || ''));
  const rgb = h => { h = String(h); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
  const Lm = h => { const c = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const CR = (a, b) => { const x = Lm(a), y = Lm(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - w) + B[i] * w).toString(16).padStart(2, '0')).join(''); };
  const fit = (c, bg, min, to) => { min = min || 4.5; to = to || (Lm(bg) > .35 ? '#000000' : '#ffffff'); let x = c; for (let k = 1; k <= 20 && CR(x, bg) < min; k++) x = mix(c, to, k * .05); return x; };
  const al = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const IC = { menu: 'M4 7h16M4 12h16M4 17h16', x: 'M6 6l12 12M18 6L6 18', down: 'M6 9l6 6 6-6', right: 'M9 6l6 6-6 6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', arrow: 'M5 12h14M13 6l6 6-6 6', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2', mail: 'M3 5h18v14H3zM3 6l9 7 9-7', pin: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4' };
  const svg = (k, n = 22, w = 1.8) => `<svg viewBox="0 0 24 24" width="${n}" height="${n}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k]}"/></svg>`;
  const typeKey = () => { try { return (S && S.org && S.org.type) || 'adult'; } catch (e) { return 'adult'; } };
  const themed = s => !!(s && s.theme && window.HPT && typeof HPT.has === 'function' && HPT.has(s.theme) && typeof HPT.tokens === 'function');
  const tokOf = s => { try { return HPT.tokens(s); } catch (e) { return null; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const val = v => (v != null && !isPh(v) ? String(v).trim() : '');
  const telHref = t => 'tel:' + String(t).replace(/[^\d+]/g, '');
  const LXk = (l, lang) => (lang && lang !== 'ko' && typeof LX === 'function' ? (LX(l, lang) || l) : l);

  HPS.kinds = {
    nav: [['overlay', '사진 위 투명'], ['solid', '흰 바탕 고정'], ['notice', '공지 띠 + 흰 바탕'], ['contact', '전화 · 신청 버튼'], ['float', '떠 있는 상자'], ['util', '유틸 띠 2단'], ['center', '가운데 기관명 · 아래 메뉴'], ['left', '왼쪽 정렬 메뉴']],
    mm: [['full', '전체 화면 목록'], ['drawer', '오른쪽 서랍']],
    footer: [['mega', '어두운 바탕 · 큰 기관명'], ['cta', '신청 띠와 이어짐'], ['biz', '사업자 정보 표'], ['min', '최소형'], ['cols', '링크 열 · 연락처'], ['gov', '공공 누리집형'], ['campus', '대학형 · 가운데 기관명'], ['split', '상담 패널형']]
  };
  const KN = { head: HPS.kinds.nav.map(x => x[0]), foot: HPS.kinds.footer.map(x => x[0]), mm: HPS.kinds.mm.map(x => x[0]) };
  /* v34.5 FA(R1 H2 · H3): 유형마다 쓰는 머리글 · 바닥글 종류를 나눈다 — 유형이 달라도 같은 머리글 · 바닥글이 나오던 문제.
     템플릿 지정(tp.hps)이 목록 밖이면 그 유형 목록 안에서 템플릿 id로 고정 배정한다. 운영자가 직접 고른 값(hpgal ownH · ownF)은 그대로 둔다. */
  const TYK = { k12: { head: ['contact', 'left', 'float'], foot: ['split', 'cta', 'cols'] }, adult: { head: ['overlay', 'center', 'left', 'float'], foot: ['min', 'mega', 'split'] },
    univ: { head: ['center', 'util', 'overlay'], foot: ['campus', 'biz', 'min'] }, public: { head: ['util', 'center'], foot: ['gov', 'biz'] },
    lifelong: { head: ['contact', 'center', 'util'], foot: ['split', 'gov', 'cols'] }, voc: { head: ['contact', 'util', 'left'], foot: ['cta', 'biz', 'split'] },
    corp: { head: ['left', 'float', 'solid'], foot: ['min', 'cols', 'mega'] } };
  HPS.typeKinds = TYK;
  const hsh = v => [...String(v || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  /* 유형별 메뉴 이름(R1 H2 · L3): 기본 이름 그대로일 때만 바꾼다(운영자가 바꾼 이름은 그대로) */
  const MN = { k12: { '클래스': '수업 안내', '교재/교구': '교재', '커뮤니티': '학부모 소통', '게시판': '자료실' },
    univ: { '클래스': '교과목', '교재/교구': '교재', '커뮤니티': '학습 커뮤니티', '공지사항': '공지', '게시판': '자료실' },
    public: { '클래스': '교육신청', '교재/교구': '교재', '커뮤니티': '참여마당', '공지사항': '알림마당', '게시판': '자료실' },
    lifelong: { '클래스': '강좌 안내', '교재/교구': '교재', '커뮤니티': '학습 동아리', '게시판': '자료실' },
    voc: { '클래스': '훈련과정', '교재/교구': '교재', '커뮤니티': '훈련생 소통', '게시판': '자료실' },
    corp: { '클래스': '교육과정', '커뮤니티': '사내 소통', '공지사항': '공지', '게시판': '자료실' }, adult: { '클래스': '클래스 안내', '교재/교구': '교재', '커뮤니티': '수강생 라운지', '게시판': '자료실' } }; /* H5(N8): adult도 기본 이름 그대로 두지 않는다 */
  /* v37(P1 범위 밖 최소 수정): 저장된 메뉴 이름이 다른 유형의 이름(예: 공공 '교육신청' · '알림마당')이면 기본 이름으로 되돌린 뒤 지금 유형 이름으로 —
     기관 유형을 바꾼 뒤에도 사이트 메뉴가 이전 유형 이름으로 남던 문제(대표님 첨부 '닉 Univ'의 교육신청 · 참여마당 · 알림마당) */
  const MNR = {}; Object.values(MN).forEach(m => Object.entries(m).forEach(([k, v]) => { if (!(v in MNR)) MNR[v] = k; }));
  HPS.menuName = (l, ty) => { const m = MN[ty || (typeof S !== 'undefined' && S && S.org && S.org.type) || 'adult'] || {}; const k = String(l == null ? '' : l).trim(); const b = m[k] ? k : (MNR[k] || k); return m[b] || (b !== k && !Object.values(m).includes(k) ? b : '') || l; };

  /* ── 종류 고르기: 직접 고른 값 → 계열(HPL) 선언 → 계열 기본표 → 테마 · 유형 ── */
  const FAM = { editorial: ['solid', 'min', 'full'], bento: ['float', 'mega', 'drawer'], fullbleed: ['overlay', 'cta', 'full'], splitscreen: ['solid', 'cols', 'drawer'], typo: ['solid', 'mega', 'full'], portal: ['contact', 'biz', 'full'],
    story: ['solid', 'cta', 'full'], mosaic: ['float', 'mega', 'drawer'], sidebar: ['solid', 'biz', 'full'], bulletin: ['contact', 'biz', 'full'], collage: ['float', 'cta', 'drawer'], noir: ['overlay', 'mega', 'full'] };
  const TH = { clean: ['solid', 'cols', 'drawer'], premium: ['overlay', 'mega', 'full'], warm: ['contact', 'cta', 'drawer'], official: ['contact', 'biz', 'full'], tech: ['overlay', 'mega', 'full'], kids: ['float', 'cta', 'drawer'], campus: ['solid', 'biz', 'full'], senior: ['contact', 'biz', 'full'] };
  function chrome(s) { s = s || {}; const c = (s.hps && typeof s.hps === 'object') ? s.hps : {};
    const F = s.layout && window.HPL && HPL.fam && HPL.fam[s.layout]; const fd = (F && F.hps) || {};
    const fm = FAM[s.layout] || []; const tm = TH[s.theme] || TH.clean;
    const pick = (k, i) => [c[k], fd[k], fm[i], tm[i]].find(v => KN[k].includes(v));
    const r = { head: pick('head', 0), foot: pick('foot', 1), mm: pick('mm', 2) };
    const Y = TYK[typeKey()]; const seed = hsh(s.tpl || s.layout || s.theme || '');
    if (Y) { if (!(c.ownH && c.head === r.head) && !Y.head.includes(r.head)) r.head = Y.head[seed % Y.head.length];
      if (!(c.ownF && c.foot === r.foot) && !Y.foot.includes(r.foot)) r.foot = Y.foot[(seed >>> 3) % Y.foot.length]; }
    if (!c.ownH && r.head === 'contact' && !val(ft().tel)) r.head = Y ? (Y.head.find(k => k !== 'contact' && k !== 'overlay') || 'left') : 'solid';
    return r; }
  /* 투명 겹침을 못 쓸 때(첫 화면이 밝을 때) 그 유형의 다음 종류 */
  const noOv = () => { const Y = TYK[typeKey()]; return (Y && Y.head.find(k => k !== 'overlay' && (k !== 'contact' || val(ft().tel)))) || 'solid'; };
  HPS.chrome = chrome;

  /* ── 공지 띠: site.hps.notice 또는 진행 중인 팝업 1건(레이어 팝업 대신) ── */
  function noticeOf(s) { const n = s && s.hps && s.hps.notice;
    if (n && n.on === false) return null;
    if (n && val(n.text)) return { t: val(n.text).slice(0, 80), link: n.link || '' };
    try { const d = typeof today === 'function' ? today() : (typeof ymdL === 'function' ? ymdL(new Date()) : new Date().toISOString().slice(0, 10));
      const p = ((S.settings && S.settings.popups) || []).find(p => p && p.on !== false && (!p.s || p.s <= d) && (!p.e || p.e >= d) && val(p.t));
      return p ? { t: val(p.t).slice(0, 80), link: p.link || '' } : null; } catch (e) { return null; } }
  const linkHref = v => { v = String(v || ''); if (!v) return ''; if (v.startsWith('learn:')) return '#p-' + ({ home: 'home', shop: 'm-class', textbooks: 'm-book', comm: 'm-community', notice: 'm-notice' }[v.slice(6)] || 'home');
    if (v.startsWith('page:')) return '#p-' + v.slice(5); if (v.startsWith('cls:')) return '#p-c-' + v.slice(4); if (v.startsWith('url:')) return typeof safeURL === 'function' ? safeURL(v.slice(4)) || '' : (/^https:\/\//.test(v.slice(4)) ? v.slice(4) : ''); return ''; };
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;

  HPS.ctaWord = ty => (['k12', 'adult', 'voc'].includes(ty || typeKey()) ? '수강신청' : '신청하기');
  /* ── 실제 행동 바로가기(R1 M4 · FIXLIST 2 · 18): 머리글 메뉴를 되풀이하지 않고 신청 · 일정 · 상담 · 공지로. 실제 데이터 · 설정값이 있는 것만 ── */
  HPS.actions = (s, n) => { s = s || {}; const ty = typeKey(); const R = []; const f = ft(); const menu = k => (s.menus || []).find(m => m.kind === k && m.on !== false && m.access !== '비공개');
    const mh = m => (m.link ? linkHref(m.link) : '') || '#p-m-' + m.id; const dot = d => String(d || '').slice(5, 10).replace('-', '.');
    let C = []; try { C = (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료'); } catch (e) { }
    const cl = (typeof t === 'function' ? t('cls') : '강좌'); const cta = ctaOf(s);
    R.push({ k: 'apply', ic: 'check', l: HPS.ctaWord(ty), sub: C.length ? `${cl} ${C.length}개 모집 중` : '', h: cta.href });
    const T0 = typeof today === 'function' ? today() : (typeof ymdL === 'function' ? ymdL(new Date()) : new Date().toISOString().slice(0, 10)); const nx = C.filter(c => c.start && c.start >= T0).sort((a, b) => String(a.start).localeCompare(b.start))[0];
    const cm = menu('class'); if (nx) R.push({ k: 'cal', ic: 'cal', l: ty === 'univ' ? '프로그램 일정' : ['k12', 'adult', 'voc'].includes(ty) ? '개강 일정' : '교육 일정', sub: `${dot(nx.start)} ${nx.name}`.slice(0, 26), h: cm ? mh(cm) : '#p-c-' + nx.id });
    const tel = val(f.tel), em = /@/.test(val(f.email)) ? val(f.email) : ''; const ask = ['k12', 'adult', 'voc'].includes(ty) ? '상담' : '문의';
    if (tel) R.push({ k: 'ask', ic: 'phone', l: `전화 ${ask}`, sub: tel, h: telHref(tel) }); else if (em) R.push({ k: 'ask', ic: 'mail', l: `메일 ${ask}`, sub: em, h: 'mailto:' + em });
    else { const bm = menu('community') || menu('board'); if (bm) R.push({ k: 'ask', ic: 'chat', l: `${ask} 게시판`, sub: '', h: mh(bm) }); }
    const nm = menu('notice'); if (nm) { let lt = ''; try { const N = [...(S.notices || []), ...(S.classes || []).flatMap(c => c.notices || [])].filter(x => x && x.title); lt = N[0] ? String(N[0].title).slice(0, 22) : ''; } catch (e) { } R.push({ k: 'notice', ic: 'bell', l: HPS.menuName(nm.l === '공지사항' ? '공지사항' : nm.l, ty), sub: lt, h: mh(nm) }); }
    return R.slice(0, n || 4); };

  /* ── 신청 버튼: 강좌 메뉴 → 첫 공개 강좌 → 홈 ── */
  function ctaOf(s, lang) { const c = (s.hps && s.hps.cta) || {}; const ty = typeKey();
    const def = HPS.ctaWord(ty); /* FIXLIST 5: 머리글 · 행동 줄 · 휴대폰 메뉴 같은 낱말 */
    let href = linkHref(c.link);
    if (!href) { const m = (s.menus || []).find(m => m.kind === 'class' && m.on !== false); if (m && m.id) href = '#p-m-' + m.id; }
    if (!href) { try { const C = (S.classes || []).find(c => (c.open === '전체' || c.open == null) && c.status !== '종료'); if (C) href = '#p-c-' + C.id; } catch (e) { } }
    return { l: LXk(val(c.l) || def, lang), href: href || '#p-home' }; }

  /* ── 기존 머리글에서 메뉴 읽기(site2 navHTML 결과를 그대로 재사용) ── */
  const strip = h => String(h || '').replace(/<small class="s2car">[\s\S]*?<\/small>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const hrefAttr = a => (String(a).match(/\bhref="[^"]*"(\s+target="_blank"\s+rel="noopener")?/) || ['href="#"'])[0];
  function parseNav(nav) { const items = []; const re = /<div class="s2-mi">(<a\b[^>]*>)([\s\S]*?)<\/a>(?:<div class="s2-dd">([\s\S]*?)<\/div>)?<\/div>/g; let m;
    while ((m = re.exec(nav))) { const lock = (m[2].match(/<i class="s2lock">([\s\S]*?)<\/i>/) || [])[1] || '';
      items.push({ a: hrefAttr(m[1]), l: strip(m[2].replace(/<i class="s2lock">[\s\S]*?<\/i>/, '')), lock: strip(lock), subs: m[3] ? [...m[3].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(x => ({ a: hrefAttr(x[1]), l: strip(x[2].replace(/<i class="s2lock">[\s\S]*?<\/i>/, '')) })) : [] }); }
    if (!items.length) [...String(nav).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].forEach(x => items.push({ a: hrefAttr(x[1]), l: strip(x[2]), lock: '', subs: [] }));
    return items.filter(x => x.l); }

  /* ═════════ 머리글 ═════════ */
  function noticeHTML(n, id) { if (!n) return ''; const h = linkHref(n.link);
    return `<input type="checkbox" id="${id}-nx" class="hps-nx" hidden><div class="hpt hps-nt" role="region" aria-label="공지"><div class="hps-ntw"><span class="hps-ntb">${svg('bell', 15, 2)}<span>공지</span></span>${h ? `<a class="hps-ntt" ${aAttr(h)}><span>${E(n.t)}</span>${svg('right', 14, 2.2)}</a>` : `<p class="hps-ntt"><span>${E(n.t)}</span></p>`}<label for="${id}-nx" class="hps-ntx" title="공지 닫기" aria-label="공지 닫기">${svg('x', 16, 2)}</label></div></div>`; }
  function mobilePanel(kind, c) { const id = c.id; const tel = c.tel; const hours = c.hours;
    const list = c.items.map(it => it.subs.length
      ? `<li><details><summary><span>${E(it.l)}</span>${svg('down', 20, 2)}</summary><div class="hps-msub">${it.a !== 'href="#"' ? `<a ${it.a}>${E(it.l)} 전체</a>` : ''}${it.subs.map(sb => `<a ${sb.a}>${E(sb.l)}</a>`).join('')}</div></details></li>`
      : `<li><a ${it.a}><span>${E(it.l)}${it.lock ? ` <small>${E(it.lock)}</small>` : ''}</span>${svg('right', 18, 2)}</a></li>`).join('');
    const info = tel ? `<a class="hps-mtel" href="${E(telHref(tel))}"><i class="hps-dot" aria-hidden="true"></i><span><strong>${E(tel)}</strong>${hours ? `<small>${E(hours)}</small>` : ''}</span></a>` : '';
    return `<div class="hpt hps-mp hps-mp-${kind}" role="dialog" aria-modal="true" aria-label="전체 메뉴"><label class="hps-bd" for="${id}-mt" aria-hidden="true"></label><div class="hps-mb">
<div class="hps-mh"><span class="hps-mn">${E(c.org)}</span><label for="${id}-mt" class="hps-x" title="메뉴 닫기" aria-label="메뉴 닫기">${svg('x', 24, 2)}</label></div>
${info}<nav aria-label="전체 메뉴"><ul class="hps-ml">${list}</ul></nav>
<div class="hps-mf"><a class="hps-mcta" ${aAttr(c.cta.href)}>${E(c.cta.l)}${svg('arrow', 18, 2.2)}</a>${c.login ? `<a class="hps-mlog" href="#">${E(c.login)}</a>` : ''}</div></div></div>`; }
  /* ctx: { s, id, org, logo(HTML), nav(HTML), items, lsw, login, cta:{l,href}, tel, hours, notice, mm, dark } */
  /* 워드마크(R1 H2): 로고 그림이 없으면 정사각 모노그램 대신 기관명을 제목 글꼴로. 유형마다 짜임이 다르다
     public · lifelong = 두 줄(지역 · 기관), univ = 제목 글꼴(명조 테마면 명조) 한 줄, voc = 왼쪽 굵은 막대, corp = 작은 사각 표식, k12 · adult = 굵은 한 줄 + 강조색 점 */
  const wmark = (org, ty, tag) => { org = String(org || '').trim(); const sp = org.lastIndexOf(' '); const two = (ty === 'public' || ty === 'lifelong') && sp > 0 && sp < org.length - 1;
    const inner = two ? `<small>${E(org.slice(0, sp))}</small><b>${E(org.slice(sp + 1))}</b>` : `<b>${E(org)}</b>`;
    return `<${tag || 'span'} class="hps-wmk hps-wmk-${E(ty)}${two ? ' two' : ''}">${ty === 'corp' || ty === 'voc' ? '<i aria-hidden="true"></i>' : ''}${inner}</${tag || 'span'}>`; };
  HPS.wordmark = wmark;
  HPS.nav = (kind, c) => { kind = KN.head.includes(kind) ? kind : 'solid'; c = Object.assign({ id: 'hps', items: [], lsw: '', login: '', mm: 'full' }, c || {});
    const id = c.id; const tel = c.tel; const n = kind === 'notice' && !c.notice ? null : c.notice; const ty = typeKey();
    const telA = tel && (kind === 'contact' || kind === 'center') ? `<a class="hps-tel" href="${E(telHref(tel))}" aria-label="전화 ${E(tel)}"><i class="hps-dot" aria-hidden="true"></i><span>${E(tel)}</span></a>` : '';
    const mTel = tel && (kind === 'contact' || ['k12', 'adult', 'voc'].includes(ty)) ? `<a class="hps-mtb" href="${E(telHref(tel))}" title="전화 걸기" aria-label="전화 ${E(tel)}">${svg('phone', 21, 1.9)}</a>` : '';
    const login = c.login && !['contact', 'util'].includes(kind) ? `<a class="hps-login" href="#">${E(c.login)}</a>` : '';
    const ctaA = `<a class="hps-cta" ${aAttr(c.cta.href)}>${E(c.cta.l)}</a>`; const mo = `<div class="hps-mo">${mTel}<label for="${id}-mt" class="hps-bg" title="전체 메뉴" aria-label="전체 메뉴 열기">${svg('menu', 24, 2)}</label></div>`;
    /* 유틸 띠(util): 위 36px 한 줄 = 대표번호 · 운영 시간(설정값) 또는 공지 + 오른쪽 로그인 · 공지 링크 */
    let ut = ''; const utOn = kind === 'util' && !!(tel || n); /* v34.5 FZ(FIXLIST 26): 대표번호 · 공지 같은 설정값이 하나도 없으면 빈 띠를 그리지 않고, 언어 · 로그인은 아래 줄로 옮긴다 */
    if (utOn) { const nt = (c.items || []).find(it => /공지|알림/.test(it.l)); const left = tel ? `<a class="hps-utt" href="${E(telHref(tel))}"><em>대표전화</em><span>${E(tel)}</span></a>${c.hours ? `<span class="hps-uth">${E(c.hours)}</span>` : ''}` : n ? `<span class="hps-utn">${E(n.t)}</span>` : '';
      ut = `<div class="hps-ut"><div class="hps-utw"><div class="hps-utl">${left}</div><div class="hps-utr">${nt ? `<a ${nt.a}>${E(nt.l)}</a>` : ''}${c.lsw}${c.login ? `<a class="hps-login" href="#">${E(c.login)}</a>` : ''}</div></div></div>`; }
    let body;
    if (kind === 'center') body = `<div class="hps-hw hps-c1"><div class="hps-cl">${telA}</div>${c.logo}<div class="hps-hr">${c.lsw}${login}${ctaA}</div>${mo}</div><div class="hps-c2">${c.nav}</div>`;
    else body = `<div class="hps-hw">${c.logo}${kind === 'left' ? '<span class="hps-vr" aria-hidden="true"></span>' : ''}${c.nav}<div class="hps-hr">${utOn ? '' : c.lsw}${telA}${utOn ? '' : kind === 'util' && c.login ? `<a class="hps-login" href="#">${E(c.login)}</a>` : login}${ctaA}</div>
${mo}</div>`;
    const head = `<header class="gh hpt hps-h hps-h-${kind} hps-ty-${E(ty)}${c.cbg ? ' hps-cbg' : ''}" data-hps="${kind}">${ut}${body}</header>`;
    return `<input type="checkbox" id="${id}-mt" class="hps-mt" aria-label="전체 메뉴"><div class="hps-top${kind === 'overlay' ? ' hps-ovw' : ''}">${noticeHTML(kind === 'util' && !tel ? null : n, id)}${head}</div>${mobilePanel(c.mm, Object.assign({}, c, { tel }))}`; };

  /* ═════════ 바닥글 ═════════ */
  function bizRows(s) { const f = ft(); const fo = s.foot || {}; const ty = typeKey();
    const reg = ty === 'k12' || ty === 'adult' ? '학원 등록번호' : ty === 'voc' ? '훈련기관 인정번호' : ty === 'lifelong' ? '평생교육시설 신고번호' : '등록번호';
    return [['상호', val(f.company) || (S.org && S.org.name) || ''], fo.showCeo === false ? null : ['대표', val(f.ceo)], fo.showBiz === false ? null : ['사업자등록번호', val(f.biz)], ['통신판매업', val(f.mail)], [reg, val(f.reg)],
      ['주소', val(f.addr)], ['전화', val(f.tel), val(f.tel) ? telHref(f.tel) : ''], ['이메일', /@/.test(val(f.email)) ? val(f.email) : '', /@/.test(val(f.email)) ? 'mailto:' + val(f.email) : ''], ['운영 시간', val(f.hours)]].filter(r => r && r[1]); }
  const cell = r => r[2] ? `<a href="${E(r[2])}">${E(r[1])}</a>` : E(r[1]);
  const legal = () => `<a href="#p-terms">서비스 이용약관</a><a href="#p-privacy"><strong>개인정보 처리방침</strong></a>`;
  const copy = org => `<p class="hps-cp"><span>© ${new Date().getFullYear()} ${E(org)}</span><span>Powered by 디디쌤</span></p>`;
  const linkCol = (items, title) => items.length ? `<div class="hps-fc"><p class="hps-fl">${E(title)}</p><ul>${items.slice(0, 8).map(it => `<li><a ${it.a}>${E(it.l)}</a></li>`).join('')}</ul></div>` : '';
  const contactCol = R => { const C = R.filter(r => ['전화', '이메일', '주소', '운영 시간'].includes(r[0])); return C.length ? `<div class="hps-fc hps-fct"><p class="hps-fl">연락처</p><dl>${C.map(r => `<div><dt>${E(r[0])}</dt><dd>${cell(r)}</dd></div>`).join('')}</dl></div>` : ''; };
  const bizLine = R => { const B = R.filter(r => !['전화', '이메일', '운영 시간'].includes(r[0])); return B.length ? `<p class="hps-bl">${B.map(r => `<span><em>${E(r[0])}</em> ${cell(r)}</span>`).join('')}</p>` : ''; };
  const bizTable = R => R.length ? `<dl class="hps-bt">${R.map(r => `<div><dt>${E(r[0])}</dt><dd>${cell(r)}</dd></div>`).join('')}</dl>` : '';
  const wordN = t => [...String(t)].reduce((a, ch) => a + (/\s/.test(ch) ? .32 : /[\x00-\x7F]/.test(ch) ? .6 : 1), 0);
  /* ctx: { s, org, items, tagline, esc2, cta:{l,href}, ctaTitle, hasCta, tel, lang } */
  HPS.footer = (kind, c) => { kind = KN.foot.includes(kind) ? kind : 'cols'; c = Object.assign({ items: [] }, c || {}); const s = c.s || {}; const org = c.org || ''; const R = bizRows(s);
    const tag = c.tagline ? `<p class="hps-tg">${E(c.tagline)}</p>` : ''; const items = c.items.filter(it => !/^(홈|home)$/i.test(it.l));
    const ty = typeKey(); const hint = c.edit && !R.some(r => ['주소', '전화'].includes(r[0])) ? `<p class="hps-edh">편집 화면에만 보이는 안내 — 설정 › 바닥글에 주소 · 대표번호를 입력하면 여기에 표시됩니다.</p>` : '';
    const brand = `<div class="hps-fb"><p class="hps-fn">${E(org)}</p>${tag}${hint}</div>`; const esc2 = c.esc2 || '';
    const open = `<footer class="gf hpt hps-f hps-f-${kind}" data-hps="${kind}"><div class="hps-fw">`; const close = `</div></footer>`;
    if (kind === 'min') return `${open}<div class="hps-mr">${brand}<nav class="hps-lg" aria-label="약관">${legal()}</nav></div>${bizLine(R)}${esc2}${copy(org)}${close}`;
    if (kind === 'biz') return `${open}<div class="hps-g3">${brand}${linkCol(items, '바로가기')}<div class="hps-fc hps-fbz"><p class="hps-fl">기관 정보</p>${bizTable(R)}</div></div>${esc2}<div class="hps-bar"><nav class="hps-lg" aria-label="약관">${legal()}</nav>${copy(org)}</div>${close}`;
    if (kind === 'cols') return `${open}<div class="hps-g3">${brand}${linkCol(items, '바로가기')}${contactCol(R)}</div>${bizLine(R.filter(r => r[0] !== '주소'))}${esc2}<div class="hps-bar"><nav class="hps-lg" aria-label="약관">${legal()}</nav>${copy(org)}</div>${close}`;
    const pick = k => R.find(r => r[0] === k);
    /* gov(공공 누리집형): 위 정책 링크 띠(개인정보 처리방침 강조) → 두 줄 워드마크 + 주소 · 대표전화 · 운영 시간 한 묶음 → 저작권 */
    if (kind === 'gov') { const ad = ['주소', '전화', '운영 시간', '이메일'].map(pick).filter(Boolean);
      return `${open.replace('<div class="hps-fw">', '')}<div class="hps-gtop"><div class="hps-fw"><nav class="hps-glk" aria-label="정책 · 바로가기"><a href="#p-privacy" class="hps-gpv">개인정보 처리방침</a><a href="#p-terms">서비스 이용약관</a>${items.slice(0, 4).map(it => `<a ${it.a}>${E(it.l)}</a>`).join('')}</nav></div></div>
<div class="hps-fw"><div class="hps-gm">${wmark(org, ty, 'p')}<div class="hps-gad">${ad.length ? `<dl>${ad.map(r => `<div><dt>${E(r[0] === '전화' ? '대표전화' : r[0])}</dt><dd>${cell(r)}</dd></div>`).join('')}</dl>` : ''}${bizLine(R.filter(r => !['주소', '전화', '운영 시간', '이메일'].includes(r[0])))}${hint}${tag}</div></div>${esc2}${copy(org)}${close}`; }
    /* campus(대학형): 가운데 기관명(제목 글꼴) · 주소 한 줄 · 관련 링크 펼침 상자 */
    if (kind === 'campus') { const ad = ['주소', '전화', '이메일'].map(pick).filter(Boolean);
      return `${open}<div class="hps-cm">${wmark(org, ty, 'p')}${tag}${ad.length ? `<p class="hps-cad">${ad.map(r => `<span><em>${E(r[0])}</em> ${cell(r)}</span>`).join('')}</p>` : ''}${hint}
${items.length ? `<details class="hps-rel"><summary>바로가기 <span aria-hidden="true">${svg('down', 16, 2)}</span></summary><ul>${items.slice(0, 8).map(it => `<li><a ${it.a}>${E(it.l)}</a></li>`).join('')}</ul></details>` : ''}</div>${bizLine(R.filter(r => !['주소', '전화', '이메일'].includes(r[0])))}${esc2}<div class="hps-bar hps-barc"><nav class="hps-lg" aria-label="약관">${legal()}</nav>${copy(org)}</div>${close}`; }
    /* split(상담 패널형): 왼쪽 상담 패널(대표번호 크게 · 운영 시간 · 신청) + 오른쪽 기관명 · 링크 2열 */
    if (kind === 'split') { const tel = pick('전화'), hrs = pick('운영 시간'), em = pick('이메일'); const ask = ['k12', 'adult', 'voc'].includes(ty) ? '수강 상담' : '교육 문의';
      const big = tel ? `<a class="hps-sbig" href="${E(tel[2])}">${E(tel[1])}</a>` : em ? `<a class="hps-sbig sm" href="${E(em[2])}">${E(em[1])}</a>` : '';
      return `${open}<div class="hps-sp"><div class="hps-spp"><p class="hps-fl">${ask}</p>${big}${hrs ? `<p class="hps-shr">${E(hrs[1])}</p>` : ''}<a class="hps-apc" ${aAttr(c.cta.href)}>${E(c.cta.l)}${svg('arrow', 18, 2.2)}</a></div><div class="hps-spr">${wmark(org, ty, 'p')}${tag}${items.length ? `<ul class="hps-s2">${items.slice(0, 8).map(it => `<li><a ${it.a}>${E(it.l)}</a></li>`).join('')}</ul>` : ''}${hint}</div></div>${bizLine(R.filter(r => !['전화', '운영 시간', '이메일'].includes(r[0])))}${esc2}<div class="hps-bar"><nav class="hps-lg" aria-label="약관">${legal()}</nav>${copy(org)}</div>${close}`; }
    if (kind === 'cta') { const tel = R.find(r => r[0] === '전화'); const hrs = R.find(r => r[0] === '운영 시간');
      const row = c.hasCta ? '' : `<div class="hps-ap"><div><h2>${E(c.ctaTitle)}</h2>${hrs ? `<p>${E(hrs[0])} ${E(hrs[1])}</p>` : ''}</div><div class="hps-apb"><a class="hps-apc" ${aAttr(c.cta.href)}>${E(c.cta.l)}${svg('arrow', 18, 2.2)}</a>${tel ? `<a class="hps-apt" href="${E(tel[2])}">${svg('phone', 18, 2)}<span>${E(tel[1])}</span></a>` : ''}</div></div>`;
      return `${open}${row}<div class="hps-g3">${brand}${linkCol(items, '바로가기')}${contactCol(R)}</div>${bizLine(R.filter(r => !['주소'].includes(r[0])))}${esc2}<div class="hps-bar"><nav class="hps-lg" aria-label="약관">${legal()}</nav>${copy(org)}</div>${close}`; }
    /* mega */
    const n = Math.max(3, wordN(org));
    return `${open}<div class="hps-g3">${brand}${linkCol(items, '바로가기')}${contactCol(R)}</div>${bizLine(R.filter(r => !['주소'].includes(r[0])))}${esc2}<div class="hps-bar"><nav class="hps-lg" aria-label="약관">${legal()}</nav>${copy(org)}</div><p class="hps-wm" style="--n:${n.toFixed(2)}" aria-hidden="true">${E(org)}</p>${close}`; };

  /* ═════════ CSS ═════════ */
  function pal(bg) { const dk = Lm(bg) < .3; const fg = dk ? '#ffffff' : '#111827';
    return { bg, dk, fg, mu: fit(mix(bg, fg, .74), bg, 4.8), lab: fit(mix(bg, fg, .6), bg, 4.6), ln: al(fg, dk ? .16 : .12) }; }
  HPS.css = s => { const T = tokOf(s); if (!T) return ''; const ch = chrome(s); const big = s.theme === 'senior' ? 1.14 : 1; const px = n => Math.round(n * big) + 'px';
    const fo = s.foot || {}; const a = T.a; const at = fit(a, T.bg, 4.6); const ink = T.ink; const bg = T.bg;
    let fbg = ch.foot === 'mega' ? (T.dark ? T.hd : mix(ink, '#000000', .25)) : ch.foot === 'cta' ? mix(a, '#0B1020', .62) : ch.foot === 'biz' || ch.foot === 'min' ? (ch.foot === 'min' ? bg : T.alt) : ch.foot === 'gov' || ch.foot === 'split' ? (T.dark ? mix(bg, '#ffffff', .06) : T.alt) : ch.foot === 'campus' ? mix(a, '#0B1020', .7) : mix(ink, '#000000', .1);
    if (ch.foot === 'cta' || ch.foot === 'campus') { for (let k = 0; k < 12 && CR('#ffffff', fbg) < 8; k++) fbg = mix(fbg, '#000000', .18); }
    if (ok6(fo.bg)) fbg = fo.bg;
    const P = pal(fbg); const fa = fit(P.dk ? mix(a, '#ffffff', .35) : a, fbg, 4.6);
    const apBg = P.dk ? '#ffffff' : a; const apFg = P.dk ? fit(a, '#ffffff', 4.6) : T.on;
    const hb = ok6((s.gnb || {}).bg) ? s.gnb.bg : bg; const HP = pal(hb); const hcta = HP.dk ? '#ffffff' : a; const hctaF = HP.dk ? fit(a, '#ffffff', 4.6) : T.on;
    const nbg = mix(ink, '#000000', .2); const nfg = '#ffffff';
    const br = `var(--br,8px)`;
    return `/* hpsec-nav */
@property --hps-c{syntax:'<color>';inherits:true;initial-value:#ffffff}@property --hps-b{syntax:'<color>';inherits:true;initial-value:transparent}@property --hps-l{syntax:'<color>';inherits:true;initial-value:transparent}
.hps-mt{position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;margin:0;pointer-events:none}.hps-nx{display:none}
.hps-top{display:contents}
/* 공지 띠 */
div.hps-nt{background:${nbg};color:${nfg};font-size:${px(14)};line-height:1.4}.hps-nx:checked+div.hps-nt{display:none}
.hps-ntw{max-width:1280px;margin:0 auto;padding:0 clamp(16px,3vw,40px);min-height:40px;display:flex;align-items:center;gap:14px}
.hps-ntb{display:inline-flex;align-items:center;gap:6px;font-size:${px(12.5)};font-weight:700;color:${fit(mix(a, '#ffffff', .55), nbg, 4.8, '#ffffff')};flex:none}
div.hps-nt .hps-ntt{flex:1;min-width:0;display:flex;align-items:center;gap:6px;margin:0;color:#fff}.hps-ntt span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}.hps-ntt svg{opacity:.8}a.hps-ntt:hover span{text-decoration:underline;text-underline-offset:3px}
.hps-ntx{flex:none;width:40px;height:40px;margin-right:-10px;display:grid;place-items:center;cursor:pointer;color:#fff;opacity:.85;border-radius:6px}.hps-ntx:hover{opacity:1;background:rgba(255,255,255,.08)}
/* 머리글 공통 */
header.gh.hps-h{position:sticky;top:0;z-index:40;background:${al(hb, .97)};color:${HP.fg};border-bottom:1px solid ${HP.ln};backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);font-size:${px(15)}}
.hps-hw{max-width:1280px;margin:0 auto;padding:0 clamp(16px,3vw,40px);height:${px(76)};display:flex;align-items:center;gap:clamp(20px,3vw,40px)}
header.hps-h .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:${px(18)};letter-spacing:-.025em;color:inherit;white-space:nowrap;flex:none;max-width:42vw;overflow:hidden;text-overflow:ellipsis}header.hps-h .logo i{width:32px;height:32px;border-radius:min(${br},9px);display:grid;place-items:center;font-style:normal;font-size:15px;font-weight:800;flex:none}header.hps-h .s2logo{max-height:36px;max-width:180px}
header.hps-h nav.gn{display:flex;align-items:center;gap:clamp(18px,2.4vw,34px);margin:0 auto;flex-wrap:nowrap;min-width:0}header.hps-h nav.gn a{font-size:${px(15.5)};font-weight:550;color:inherit;letter-spacing:-.01em;padding:8px 0;position:relative;white-space:nowrap}
header.hps-h nav.gn>.s2-mi>a::after{content:'';position:absolute;left:0;right:0;bottom:2px;height:2px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .2s}header.hps-h nav.gn>.s2-mi>a:hover::after,header.hps-h nav.gn>.s2-mi:focus-within>a::after{transform:scaleX(1)}
header.hps-h .s2-dd{border-radius:10px;box-shadow:0 0 0 1px rgba(17,24,39,.08),0 12px 28px -12px rgba(17,24,39,.25);padding:6px}header.hps-h .s2-dd a{padding:10px 12px;font-size:${px(14.5)};color:#1F2430!important}header.hps-h .s2-dd a::after{display:none}
.hps-hr{display:flex;align-items:center;gap:20px;flex:none}.hps-hr .lsw a{color:inherit;opacity:.85}
.hps-login{font-size:${px(14.5)};font-weight:600;color:inherit;opacity:.82}.hps-login:hover{opacity:1;text-decoration:underline;text-underline-offset:4px}
header.hps-h a.hps-cta{display:inline-flex;align-items:center;min-height:${px(44)};padding:0 ${px(20)};border-radius:${br};background:${hcta};color:${hctaF};font-weight:700;font-size:${px(15)};letter-spacing:-.01em;white-space:nowrap;transition:background .15s}header.hps-h a.hps-cta:hover{background:${HP.dk ? '#F1F3F7' : mix(a, '#000000', .14)}}
.hps-tel{display:inline-flex;align-items:center;gap:9px;font-weight:750;font-size:${px(16)};font-variant-numeric:tabular-nums;letter-spacing:.01em;color:inherit;white-space:nowrap}.hps-dot{width:8px;height:8px;border-radius:50%;background:${HP.dk ? mix(a, '#ffffff', .4) : a};box-shadow:0 0 0 4px ${al(a, .18)};flex:none}
.hps-mo{display:none;align-items:center;gap:4px;margin-left:auto}.hps-bg,.hps-mtb{width:44px;height:44px;display:grid;place-items:center;border-radius:10px;color:inherit;cursor:pointer;margin-right:-8px}.hps-mtb{margin-right:0}.hps-bg:hover,.hps-mtb:hover{background:${al(HP.fg, .06)}}
.hps-mt:focus-visible~.hps-top .hps-bg{outline:3px solid ${at};outline-offset:2px}header.hps-h a:focus-visible{outline:3px solid ${at};outline-offset:3px;border-radius:4px}
/* 떠 있는 상자 */
header.gh.hps-h-float{background:transparent;border:0;backdrop-filter:none;-webkit-backdrop-filter:none;padding:12px clamp(12px,2vw,24px) 0}header.hps-h-float .hps-hw{background:${al(hb, .96)};border:1px solid ${HP.ln};border-radius:min(${br},14px);height:${px(68)};max-width:1200px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
/* 전화 · 신청형 */
header.hps-h-contact nav.gn{margin:0 auto 0 8px}header.hps-h-contact .hps-hr{gap:24px}
/* 투명 겹침: 첫 화면이 사진 · 어두운 바탕일 때만, 스크롤하면 불투명 */
.hps-ovw{display:block;position:absolute;top:0;left:0;right:0;z-index:40}
.hps-ovw header.gh.hps-h{position:relative;background:var(--hps-b);color:var(--hps-c);border-bottom-color:var(--hps-l);backdrop-filter:none;-webkit-backdrop-filter:none;--hps-c:#ffffff;--hps-b:transparent;--hps-l:rgba(255,255,255,.18)}
.hps-ovw header.hps-h a.hps-cta{background:#ffffff;color:${fit(a, '#ffffff', 4.6)}}.hps-ovw header.hps-h a.hps-cta:hover{background:#EEF1F6}.hps-ovw .hps-login{opacity:1}
.hps-ovw .hps-dot{background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.2)}
@supports (animation-timeline:scroll()){.hps-ovw{position:fixed}.hps-ovw header.gh.hps-h{animation:hps-solid linear both;animation-timeline:scroll(root);animation-range:0 140px}.hps-ovw header.hps-h a.hps-cta{animation:hps-ctab linear both;animation-timeline:scroll(root);animation-range:0 140px}}
@keyframes hps-solid{to{--hps-c:${ink};--hps-b:${bg};--hps-l:${al(ink, .1)}}}@keyframes hps-ctab{to{background:${a};color:${T.on}}}
body.hps-ov #p-home>.hp-hero:first-child{padding-top:calc(${px(76)} + ${px(72)})}
body.hps-ov.hps-has-nt #p-home>.hp-hero:first-child{padding-top:calc(${px(116)} + ${px(72)})}
body.hps-ov:has(.s2pg:target:not(#p-home)) .hps-ovw{position:sticky}body.hps-ov:has(.s2pg:target:not(#p-home)) .hps-ovw header.gh.hps-h{--hps-c:${ink};--hps-b:${bg};--hps-l:${al(ink, .1)};animation:none}
/* 휴대폰 메뉴 */
div.hps-mp{display:none;position:fixed;inset:0;z-index:60;font-size:${px(16)};background:transparent}.hps-mt:checked~div.hps-mp{display:block}body:has(.hps-mt:checked){overflow:hidden}
.hps-bd{position:absolute;inset:0;background:rgba(10,12,20,.45);cursor:pointer}
.hps-mb{position:absolute;inset:0;background:${bg};color:${ink};display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain}
.hps-mp-drawer .hps-mb{left:auto;width:min(86vw,400px);box-shadow:-20px 0 40px -20px rgba(0,0,0,.4);animation:hps-in .22s ease-out}
@keyframes hps-in{from{transform:translateX(24px);opacity:.6}}
.hps-mh{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:${px(60)};padding:0 8px 0 20px;border-bottom:1px solid ${al(ink, .1)};flex:none}
.hps-mp-drawer .hps-mh{background:${mix(a, '#0B1020', .55)};color:#fff;border:0;min-height:${px(64)}}
.hps-mn{font-weight:800;font-size:${px(17)};letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hps-x{width:44px;height:44px;display:grid;place-items:center;border-radius:10px;cursor:pointer;color:inherit}.hps-x:hover{background:${al(ink, .06)}}
div.hps-mp a.hps-mtel{display:flex;align-items:center;gap:12px;margin:16px 20px 4px;padding:14px 16px;border-radius:min(${br},12px);background:${T.alt};color:${ink}}.hps-mtel span{display:flex;flex-direction:column;line-height:1.35}.hps-mtel strong{font-size:${px(18)};font-variant-numeric:tabular-nums;font-weight:750}.hps-mtel small{font-size:${px(13)};color:${fit(T.mu, T.alt, 4.6)}}
.hps-ml{list-style:none;margin:8px 0 0;padding:0 20px}.hps-ml>li{border-bottom:1px solid ${al(ink, .1)}}
div.hps-mp .hps-ml>li>a,div.hps-mp .hps-ml summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:${px(56)};font-size:${px(18)};font-weight:650;letter-spacing:-.02em;color:${ink};cursor:pointer;list-style:none}.hps-ml summary::-webkit-details-marker{display:none}
.hps-ml>li>a svg{color:${fit(T.mu, bg, 3)}}.hps-ml summary svg{transition:transform .2s;color:${fit(T.mu, bg, 3)}}.hps-ml details[open] summary svg{transform:rotate(180deg)}.hps-ml small{font-size:12px;font-weight:600;color:${fit(T.mu, bg, 4.6)}}
.hps-msub{display:flex;flex-direction:column;padding:0 0 10px 12px;border-left:2px solid ${al(a, .35)};margin:0 0 12px 2px}div.hps-mp .hps-msub a{display:flex;align-items:center;min-height:48px;font-size:${px(16)};font-weight:500;color:${fit(T.mu, bg, 4.6)}}
.hps-mf{margin-top:auto;padding:20px;display:flex;flex-direction:column;gap:6px;position:sticky;bottom:0;background:${bg};border-top:1px solid ${al(ink, .08)}}
div.hps-mp a.hps-mcta{display:flex;align-items:center;justify-content:center;gap:8px;min-height:${px(54)};border-radius:${br};background:${a};color:${T.on};font-weight:750;font-size:${px(17)}}
div.hps-mp a.hps-mlog{display:flex;align-items:center;justify-content:center;min-height:44px;font-weight:600;font-size:${px(15)};color:${fit(T.mu, bg, 4.6)}}
.hps-mp a:focus-visible,.hps-mp summary:focus-visible{outline:3px solid ${at};outline-offset:2px;border-radius:6px}
@media(max-width:960px){header.hps-h nav.gn,.hps-hr{display:none!important}.hps-mo{display:flex}.hps-hw{height:${px(62)};gap:12px}header.gh.hps-h-float .hps-hw{height:${px(58)}}header.hps-h .logo{font-size:${px(17)};max-width:62vw}
body.hps-ov #p-home>.hp-hero:first-child{padding-top:calc(${px(62)} + ${px(40)})}body.hps-ov.hps-has-nt #p-home>.hp-hero:first-child{padding-top:calc(${px(102)} + ${px(40)})}}
@media(min-width:961px){div.hps-mp{display:none!important}}
/* 바닥글 공통 */
footer.gf.hps-f{background:${fbg};color:${P.mu};padding:${px(72)} 0 ${px(32)};font-size:${px(14)};line-height:1.6;text-align:left;overflow:hidden;position:relative}
footer.gf.hps-f p{margin:0}footer.gf.hps-f a{color:inherit;text-decoration:none}footer.gf.hps-f a:hover{color:${P.fg};text-decoration:underline;text-underline-offset:3px}
.hps-fw{max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,40px);position:relative}
.hps-fn{font-size:${px(20)};font-weight:800;letter-spacing:-.025em;color:${P.fg};line-height:1.3}.hps-tg{margin-top:10px!important;max-width:340px;color:${P.mu}}
.hps-g3{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,3fr) minmax(0,4fr);gap:40px clamp(24px,4vw,64px);padding-bottom:${px(40)}}
.hps-fl{font-size:${px(12.5)};font-weight:700;color:${P.lab};margin:0 0 14px!important;letter-spacing:.02em}
.hps-fc ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}.hps-fc li a{font-size:${px(15)};font-weight:500;color:${P.fg}}
.hps-fct dl{margin:0;display:grid;gap:10px}.hps-fct dl div{display:grid;grid-template-columns:${px(72)} 1fr;gap:12px}.hps-fct dt{font-size:${px(13)};color:${P.lab}}.hps-fct dd{margin:0;color:${P.fg};font-size:${px(14.5)};font-variant-numeric:tabular-nums}
.hps-bl{display:flex;flex-wrap:wrap;gap:4px 18px;padding:20px 0;border-top:1px solid ${P.ln};font-size:${px(13)}}.hps-bl em{font-style:normal;color:${P.lab};margin-right:2px}.hps-bl span{font-variant-numeric:tabular-nums}
.hps-bar{display:flex;align-items:center;justify-content:space-between;gap:12px 24px;flex-wrap:wrap;padding-top:20px;border-top:1px solid ${P.ln}}
.hps-lg{display:flex;gap:20px;flex-wrap:wrap;font-size:${px(13.5)};color:${P.fg}}.hps-lg strong{font-weight:750}
.hps-cp{display:flex;gap:14px;flex-wrap:wrap;font-size:${px(13)};color:${P.mu}}
footer.gf.hps-f .s2esc{display:inline-flex;align-items:center;gap:6px;margin:0 0 16px;font-size:${px(13)};color:${P.fg}}
/* mega: 초대형 기관명 */
.hps-wm{font-size:min(calc((min(100vw,1200px) - 2 * clamp(20px,4vw,40px)) * .97 / var(--n)),${px(280)});font-weight:850;letter-spacing:-.045em;line-height:.86;color:${P.dk ? '#ffffff' : ink};white-space:nowrap;margin:clamp(40px,6vw,72px) 0 -.08em!important;user-select:none}
footer.hps-f-mega{padding-bottom:0}
body.hps-fjoin #p-home>section:last-of-type{background:${fbg}!important;padding-bottom:${px(24)}!important}body.hps-fjoin footer.hps-f-cta{padding-top:${px(48)}}
/* cta: 신청 띠와 이어짐 */
.hps-ap{display:flex;align-items:flex-end;justify-content:space-between;gap:28px 40px;flex-wrap:wrap;padding:${px(8)} 0 ${px(56)};margin-bottom:${px(56)};border-bottom:1px solid ${P.ln}}
.hps-ap h2{margin:0;font-size:clamp(${px(30)},4.2vw,${px(52)});line-height:1.15;font-weight:800;letter-spacing:-.035em;color:${P.fg};max-width:14em}.hps-ap p{margin-top:14px!important;font-size:${px(16)};color:${P.mu}}
.hps-apb{display:flex;gap:12px;flex-wrap:wrap}.hps-apc,.hps-apt{display:inline-flex;align-items:center;gap:10px;min-height:${px(54)};padding:0 ${px(26)};border-radius:${br};font-weight:750;font-size:${px(16)};white-space:nowrap}
footer.gf.hps-f .hps-apc{background:${apBg};color:${apFg}}footer.gf.hps-f .hps-apc:hover{color:${apFg};text-decoration:none;filter:brightness(.96)}
footer.gf.hps-f .hps-apt{color:${P.fg};box-shadow:inset 0 0 0 1.5px ${al(P.fg, .4)};font-variant-numeric:tabular-nums}footer.gf.hps-f .hps-apt:hover{text-decoration:none;box-shadow:inset 0 0 0 1.5px ${P.fg}}
/* biz: 사업자 정보 2열 표 */
footer.hps-f-biz{border-top:1px solid ${al(ink, .1)}}.hps-f-biz .hps-g3{grid-template-columns:minmax(0,4fr) minmax(0,3fr) minmax(0,5fr)}
.hps-bt{margin:0;display:grid}.hps-bt div{display:grid;grid-template-columns:${px(124)} 1fr;gap:12px;padding:9px 0;border-top:1px solid ${P.ln}}.hps-bt div:last-child{border-bottom:1px solid ${P.ln}}
.hps-bt dt{font-size:${px(12.5)};color:${P.lab};font-weight:600}.hps-bt dd{margin:0;font-size:${px(13.5)};color:${P.fg};font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
/* min: 최소형 */
footer.hps-f-min{padding:${px(40)} 0 ${px(28)};border-top:1px solid ${al(ink, .12)}}.hps-mr{display:flex;align-items:baseline;justify-content:space-between;gap:16px 32px;flex-wrap:wrap;padding-bottom:20px}.hps-f-min .hps-fb{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}.hps-f-min .hps-tg{margin:0!important;max-width:560px}
.hps-f-min .hps-bl{border-top:0;padding:0 0 12px}.hps-f-min .hps-cp{padding-top:4px}
footer.gf.hps-f a:focus-visible{outline:3px solid ${fa};outline-offset:3px;border-radius:4px}
@media(max-width:860px){footer.gf.hps-f{padding-top:${px(56)}}.hps-g3,.hps-f-biz .hps-g3{grid-template-columns:1fr 1fr;gap:32px 20px}.hps-g3>.hps-fb,.hps-g3>.hps-fbz{grid-column:1/-1}.hps-g3>.hps-fct:last-child:nth-child(2){grid-column:1/-1}
.hps-fct dl div{grid-template-columns:1fr;gap:2px}.hps-bt div{grid-template-columns:${px(108)} 1fr}.hps-ap{padding-bottom:40px;margin-bottom:40px}.hps-apb{width:100%}.hps-apc,.hps-apt{flex:1 1 100%;justify-content:center}.hps-bar{flex-direction:column;align-items:flex-start}}
${typeCSS(s, T, { a, at, ink, bg, hb, HP, P, fbg, fa, px, br, ch })}`; };
  /* ═════════ v34.5 FA: 워드마크 · 유형별 메뉴 글자 · 유틸 띠 · 가운데 2단 · 왼쪽 정렬 · 바닥글 gov · campus · split ═════════ */
  const TYN = { public: [17, 700, -.02], univ: [15.5, 500, -.005], k12: [16, 700, -.02], adult: [15, 500, -.01], lifelong: [17, 650, -.02], voc: [15.5, 650, -.015], corp: [14.5, 600, 0] };
  function typeCSS(s, T, o) { const { a, at, ink, bg, hb, HP, P, fbg, fa, px, br } = o; const ty = typeKey(); const N = TYN[ty] || TYN.adult; const lt = !HP.dk;
    const ac = lt ? fit(a, hb, 3.2) : mix(a, '#ffffff', .45); const mu = fit(mix(hb, HP.fg, .62), hb, 4.6);
    const ubg = ty === 'univ' ? mix(a, '#0B1020', .58) : mix(ink, '#000000', .28); const ubf = fit(mix(ubg, '#ffffff', .78), ubg, 7, '#ffffff');
    const spBg = a; const spF = CR('#ffffff', a) >= 4.5 ? '#ffffff' : '#111827'; const spBtnF = fit(a, '#ffffff', 4.6);
    return `/* hpsec-nav FA */
header.gh.hps-h{--hps-nfs:${px(N[0])};--hps-nfw:${N[1]};--hps-nls:${N[2]}em}
header.hps-h nav.gn a{font-size:var(--hps-nfs);font-weight:var(--hps-nfw);letter-spacing:var(--hps-nls)}
header.hps-h .lhs-slot{font-size:var(--hps-nfs);font-weight:var(--hps-nfw);letter-spacing:var(--hps-nls)}
/* 워드마크 */
header.hps-h a.logo.hps-lw{max-width:46vw;overflow:visible}
.hps-wmk{display:inline-flex;align-items:center;gap:10px;font-family:var(--hd-ff,inherit);line-height:1.12;color:inherit;letter-spacing:-.025em;white-space:nowrap;min-width:0}
.hps-wmk b{font-weight:800;font-size:${px(19)};overflow:hidden;text-overflow:ellipsis}
.hps-wmk-k12 b::after,.hps-wmk-adult b::after{content:'';display:inline-block;width:.3em;height:.3em;border-radius:50%;background:${ac};margin-left:.14em;vertical-align:.02em}
.hps-wmk-k12 b{font-size:${px(20)}}.hps-wmk-adult b{font-weight:var(--hd-fw,750);font-size:${px(20)};letter-spacing:-.035em}
.hps-wmk-univ b{font-weight:var(--hd-fw,650);font-size:${px(21)};letter-spacing:-.01em}
.hps-wmk.two{flex-direction:column;align-items:flex-start;gap:1px}.hps-wmk.two small{font-family:Pretendard,system-ui,sans-serif;font-size:${px(12)};font-weight:650;letter-spacing:0;opacity:.72}
.hps-wmk-lifelong b{font-weight:750}
header.hps-h .logo .hps-wmk i,footer.hps-f .hps-wmk i{all:unset;display:block;flex:none;background:${ac}}
.hps-wmk-voc i{width:4px;height:1.35em;border-radius:1px}.hps-wmk-voc b{font-size:${px(18)}}
.hps-wmk-corp i{width:9px;height:9px}.hps-wmk-corp b{font-size:${px(17)};font-weight:700;letter-spacing:-.005em}
footer.gf.hps-f .hps-wmk,footer.gf.hps-f .hps-wmk b,footer.gf.hps-f .hps-wmk small{color:${P.fg}}header.gh.hps-h .hps-wmk b,header.gh.hps-h .hps-wmk small{color:inherit}footer.hps-f .hps-wmk i{background:${P.dk ? mix(a, '#ffffff', .45) : fit(a, fbg, 3)}}
.hps-fn,.hps-wm{font-family:var(--hd-ff,inherit)}.hps-wm{font-weight:var(--hd-fw,800)!important}
/* 왼쪽 정렬 메뉴 */
header.hps-h-left .hps-hw{height:${px(68)};gap:0}header.hps-h-left .hps-hw>nav.gn,header.hps-h-left .hps-hw>.lhs-slot{margin:0 auto 0 0;gap:clamp(18px,2vw,28px)}
.hps-vr{width:1px;height:22px;background:${HP.ln};margin:0 clamp(18px,2.4vw,32px);flex:none}
header.hps-h-left a.hps-cta{border-radius:0;min-height:${px(40)}}header.hps-h-left .hps-hr{gap:16px}
/* 유틸 띠 2단 */
.hps-ut{background:${ubg};color:${ubf};font-size:${px(13)};line-height:1.3}
.hps-utw{max-width:1280px;margin:0 auto;padding:0 clamp(16px,3vw,40px);min-height:${px(36)};display:flex;align-items:center;justify-content:space-between;gap:16px}
.hps-utl{display:flex;align-items:center;gap:14px;min-width:0}.hps-utl em{font-style:normal;opacity:.8;margin-right:6px}.hps-utt{color:inherit;font-variant-numeric:tabular-nums;font-weight:650;white-space:nowrap}.hps-uth{opacity:.85;white-space:nowrap}.hps-utn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hps-utr{display:flex;align-items:center;gap:0;flex:none}.hps-utr a{color:inherit;padding:0 12px;border-left:1px solid ${al(ubf, .3)};font-weight:550}.hps-utr a:first-child{border-left:0}.hps-utr .lsw a{border:0;padding:0 6px}.hps-ut .hps-login{opacity:1;font-size:inherit}
.hps-ut a:hover{text-decoration:underline;text-underline-offset:3px}.hps-ut a:focus-visible{outline:2px solid #fff;outline-offset:2px}
header.gh.hps-h-util{border-bottom:${ty === 'public' ? `2px solid ${ink}` : `1px solid ${HP.ln}`}}header.hps-h-util .hps-hw{height:${px(ty === 'public' ? 84 : 76)}}
header.hps-h-util .hps-hw>nav.gn,header.hps-h-util .hps-hw>.lhs-slot{margin:0 0 0 auto;gap:clamp(22px,3vw,44px)}
header.hps-h-util a.hps-cta{border-radius:${ty === 'public' ? '6px' : br}}
header.hps-h-util nav.gn>.s2-mi>a::after{bottom:-${px(ty === 'public' ? 28 : 24)};height:3px}
/* 가운데 2단 */
header.gh.hps-h-center{border-bottom:1px solid ${HP.ln}}header.hps-h-center .hps-c1{height:${px(84)};display:grid;grid-template-columns:1fr auto 1fr;gap:24px}
header.hps-h-center .hps-c1>.logo{justify-self:center}header.hps-h-center .hps-c1 .hps-wmk b{font-size:${px(ty === 'univ' ? 26 : 23)}}
.hps-cl{display:flex;align-items:center;min-width:0}header.hps-h-center .hps-hr{justify-self:end}header.hps-h-center .hps-tel{font-size:${px(14.5)};font-weight:650}
.hps-c2{border-top:1px solid ${HP.ln};display:flex;justify-content:center;min-height:${px(50)};align-items:center;padding:0 clamp(16px,3vw,40px)}
.hps-c2>nav.gn,.hps-c2>.lhs-slot{margin:0 auto!important;gap:clamp(24px,3.4vw,52px)}
header.hps-h-center a.hps-cta{border-radius:0;background:transparent;color:${HP.fg};box-shadow:inset 0 0 0 1.5px ${HP.fg};min-height:${px(40)}}header.hps-h-center a.hps-cta:hover{background:${HP.fg};color:${hb}}
/* 공공: 메뉴 굵게 · 넓게 */
header.hps-ty-public .hps-cta{font-weight:750}
@media(max-width:960px){.hps-ut{display:none}header.hps-h-util .hps-hw,header.hps-h-left .hps-hw{height:${px(62)}}.hps-vr{display:none}
header.hps-h-center .hps-c1{display:flex;height:${px(62)}}.hps-c2,.hps-cl{display:none}header.hps-h-center .hps-c1 .hps-wmk b{font-size:${px(19)}}}
/* 바닥글: 편집 화면 안내 */
footer.hps-f .hps-edh{margin-top:14px!important;font-size:${px(13)};padding:8px 12px;border:1px dashed ${al(P.fg, .45)};border-radius:8px;color:${P.fg};max-width:420px}
/* gov */
footer.gf.hps-f-gov{padding:0 0 ${px(32)};border-top:1px solid ${al(ink, .14)}}
.hps-gtop{background:${T.dark ? fbg : bg};border-bottom:1px solid ${P.ln}}
.hps-glk{display:flex;flex-wrap:wrap;align-items:center;min-height:${px(54)};gap:4px 0}.hps-glk a{font-size:${px(14)};font-weight:600;color:${P.fg};padding:0 16px;border-left:1px solid ${P.ln};line-height:1.2}.hps-glk a:first-child{padding-left:0;border-left:0}
footer.gf.hps-f a.hps-gpv{color:${fit(a, T.dark ? fbg : bg, 4.6)};font-weight:800}
.hps-gm{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:24px 56px;padding:${px(40)} 0 ${px(24)};align-items:start}
.hps-gm .hps-wmk b{font-size:${px(20)}}.hps-gad dl{margin:0;display:flex;flex-wrap:wrap;gap:8px 28px}.hps-gad dl div{display:flex;gap:8px;align-items:baseline}.hps-gad dt{font-size:${px(13)};color:${P.lab};font-weight:650}.hps-gad dd{margin:0;color:${P.fg};font-size:${px(14.5)};font-variant-numeric:tabular-nums}
.hps-gad .hps-bl{border:0;padding:12px 0 0}.hps-f-gov .hps-cp{padding-top:16px;border-top:1px solid ${P.ln}}
/* campus */
footer.gf.hps-f-campus{padding-top:${px(80)}}.hps-cm{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding-bottom:${px(40)}}
.hps-cm .hps-wmk b{font-size:clamp(${px(26)},3.4vw,${px(38)});font-weight:var(--hd-fw,600);letter-spacing:-.015em}.hps-cm .hps-tg{margin:0!important;max-width:520px}
.hps-cad{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 22px;font-size:${px(14)}}.hps-cad em{font-style:normal;color:${P.lab};margin-right:4px}
.hps-rel{position:relative;margin-top:10px;min-width:240px;text-align:left}.hps-rel summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:44px;padding:0 16px;border:1px solid ${al(P.fg, .35)};color:${P.fg};font-weight:600;cursor:pointer}.hps-rel summary::-webkit-details-marker{display:none}
.hps-rel[open] summary span{transform:rotate(180deg)}.hps-rel summary span{display:grid;transition:transform .2s}.hps-rel ul{list-style:none;margin:0;padding:6px 0;border:1px solid ${al(P.fg, .35)};border-top:0}.hps-rel li a{display:block;padding:9px 16px;color:${P.fg}}
.hps-barc{justify-content:center;text-align:center}footer.gf.hps-f-campus .s2esc{display:flex;width:max-content;max-width:100%;margin:0 auto 16px}.hps-f-campus .hps-bl{justify-content:center}
/* split */
.hps-sp{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px clamp(32px,5vw,72px);padding-bottom:${px(40)};align-items:stretch}
.hps-spp{background:${spBg};color:${spF};border-radius:var(--r,16px);padding:${px(32)} ${px(32)} ${px(28)};display:flex;flex-direction:column;align-items:flex-start;gap:8px}
footer.gf.hps-f .hps-spp .hps-fl{color:${spF};opacity:.85;margin:0 0 4px!important}
footer.gf.hps-f .hps-spp a.hps-sbig{font-family:var(--hd-ff,inherit);font-size:clamp(${px(30)},3.6vw,${px(42)});font-weight:800;letter-spacing:-.02em;line-height:1.1;color:${spF};font-variant-numeric:tabular-nums}.hps-sbig.sm{font-size:${px(22)}!important}
.hps-shr{font-size:${px(14)};opacity:.9}footer.gf.hps-f .hps-spp .hps-apc{margin-top:16px;background:#ffffff;color:${spBtnF}}
.hps-spr{display:flex;flex-direction:column;gap:12px;padding-top:8px}.hps-spr .hps-wmk b{font-size:${px(22)}}
.hps-s2{list-style:none;margin:12px 0 0;padding:16px 0 0;border-top:1px solid ${P.ln};display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}.hps-s2 a{font-size:${px(15)};font-weight:550;color:${P.fg}}
@media(max-width:860px){.hps-gm,.hps-sp{grid-template-columns:1fr}.hps-glk a{padding:0 12px}.hps-gad dl{flex-direction:column;gap:6px}}`; }

  /* ═════════ siteHTML 감싸기 ═════════ */
  /* v34.5 G2: 한 줄 소개는 이 사이트에 직접 쓴 값만 — 검색 설명(S.settings.seo.desc)은 첫 사이트 · 이전 템플릿 문구가 남아 있어(hpai 258행이 빈 칸일 때 한 번만 복사) 다른 템플릿 · 기관 문구가 보였다 */
  const tagFor = s => { const v = s.hps && s.hps.tagline; return val(v) ? val(v).slice(0, 80) : ''; };
  const CTA_T = { k12: '수업 상담을 신청하세요', adult: '첫 수업을 시작해 보세요', voc: '모집 과정을 확인하고 신청하세요' };
  const darkHero = home => { const m = String(home).match(/^\s*<section\b[^>]*>/); if (!m) return false; return /data-hps-dark|\bhp-b-dark\b|\bhp-b-band\b|\bfb-hero\b|\bhps-dark\b/.test(m[0]); };
  const POP = /<input type="checkbox" id="s2pc\d+" class="s2pcx" hidden><div class="s2pop"[\s\S]*?<label for="s2pc\d+">닫기<\/label><\/div>/g;
  function rebuild(h, s, lang) {
    const a = h.indexOf('<header class="gh">'); const b = a < 0 ? -1 : h.indexOf('</header>', a); if (a < 0 || b < 0) return h;
    const fs = h.lastIndexOf('<footer class="gf'); const fe = fs < 0 ? -1 : h.indexOf('</footer>', fs);
    const oldH = h.slice(a, b + 9); const ch = chrome(s); const f = ft(); const org = (S.org && S.org.name) || '';
    const logo = (oldH.match(/<a class="logo"[\s\S]*?<\/a>/) || [''])[0]; const nav0 = (oldH.match(/<nav class="gn[\s\S]*?<\/nav>(?=<div class="hr">)/) || oldH.match(/<nav class="gn[\s\S]*<\/nav>/) || [''])[0];
    const lsw = (oldH.match(/<span class="lsw">[\s\S]*?<\/span>/) || [''])[0]; const login = strip((oldH.match(/<a class="l"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '로그인');
    /* R1 H8: 홈페이지 머리글에서는 권한 배지(회원 · 지정 N)를 빼고, 메뉴 이름은 유형별로(H2 · L3, 한국어 화면만) */
    const ty = typeKey(); const ko = !lang || lang === 'ko';
    const nav = nav0.replace(/\s*<i class="s2lock">[\s\S]*?<\/i>/g, '').replace(/(<a\b[^>]*>)([^<]+)/g, (m, x, l) => ko ? x + E(HPS.menuName(l.replace(/&amp;/g, '&').trim(), ty)) + (/\s$/.test(l) ? ' ' : '') : m);
    const items = parseNav(nav).map(it => Object.assign(it, { lock: '' })); const cta = ctaOf(s, lang); const tel = val(f.tel); const hours = val(f.hours);
    const wlogo = /<img\b/.test(logo) ? logo : `<a class="logo hps-lw" href="#p-home" aria-label="${E(org)} 홈">${wmark(org, ty)}</a>`;
    /* 공지: 레이어 팝업은 그리지 않고 띠 1줄로 */
    h = h.replace(POP, ''); const notice = noticeOf(s);
    const cur = (h.match(/#p-([^{\s]+)\{display:block\}/) || [])[1] || 'home';
    const MH = '<main class="s2pg" id="p-home">'; const main = h.indexOf(MH); const mEnd = main >= 0 ? h.indexOf('</main>', main) : -1;
    const home = main >= 0 ? h.slice(main + MH.length, mEnd > main ? mEnd : h.length) : h.slice(b + 9, fs > b ? fs : h.length);
    let head = ch.head; if (head === 'notice' && !notice) head = 'solid'; const ov = head === 'overlay' && cur === 'home' && darkHero(home); if (head === 'overlay' && !ov) head = noOv();
    const H = HPS.nav(head, { s, id: 'hps', org, logo: wlogo, nav, items, lsw, login, cta, tel, hours, notice, mm: ch.mm, cbg: ok6((s.gnb || {}).bg) });
    let fjoin = false; let out = h.slice(0, a) + H + h.slice(b + 9, fs >= 0 && fe > fs ? fs : h.length);
    if (fs >= 0 && fe > fs) { const oldF = h.slice(fs, fe + 9); const esc2 = (oldF.match(/<a class="s2esc"[\s\S]*?<\/a>/) || [''])[0];
      const secs = home.match(/<section\b[^>]*>/g) || []; const last = secs[secs.length - 1] || '';
      const hasCta = /\bhp-cta\b|data-hps-cta|\bfb-cta\b|\bhpl-k-cta\b|\bhps-cta-sec\b/.test(last);
      fjoin = hasCta && ch.foot === 'cta'; out += HPS.footer(ch.foot, { s, org, items, tagline: tagFor(s), esc2, cta, ctaTitle: val(s.hps && s.hps.ctaTitle) || CTA_T[typeKey()] || '교육 신청과 문의', hasCta, lang, edit: typeof HPE !== 'undefined' && !!HPE && !!HPE.map }) + h.slice(fe + 9); }
    out = out.replace(/<body class="([^"]*)"/, `<body class="$1 hps-on${ov ? ' hps-ov' : ''}${notice ? ' hps-has-nt' : ''}${fjoin ? ' hps-fjoin' : ''}"`);
    return out; }
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); if (!themed(s)) return h;
    try { const c = HPS.css(s); if (!c) return h; let o = rebuild(h, s, lang || 'ko'); if (o === h) return h; return o.replace('</style>', c.replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpsec-nav', e); return h; } };
    window.siteHTML = siteHTML; }
  /* 게시본(학습자 홈) 머리글 메뉴도 같은 유형별 이름으로 — lmerge가 hp.menus의 l로 셸 메뉴를 그린다 */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a);
    try { if (r && r.hp && Array.isArray(r.hp.menus)) { const ty = typeKey(); r.hp.menus = r.hp.menus.map(m => Object.assign({}, m, { l: HPS.menuName(m.l, ty), subs: m.subs })); } } catch (e) { console.error('hpsec-nav menus', e); }
    return r; }; window.lsSnapshot = lsSnapshot; }
})();
