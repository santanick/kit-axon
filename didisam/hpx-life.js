/* v43.8 hpx-life — 평생 · 직업훈련 묶음 홈페이지 템플릿(L4 수석 · A4 보조)
   대표님(2026-11-17 19:46 · 19:47): "홈페이지 템플릿을 기관별로 고도화 … 85점을 넘긴 템플릿만 배치" · "고객 시나리오별 ui ux 가 반영된 템플릿이어야되."
   - 방문자: 구직자 · 재직자 · 자영업자(국비 대상자) · 훈련생(직업훈련) / 처음 배우는 분 · 자격 준비 · 시니어 · 수강생(평생교육)
     첫 화면에서 「어떤 분이세요?」를 고르면 그 사람이 할 일 2가지(실제 경로)가 바로 열린다 → 2클릭 안에 과정 · 자격 확인 · 내 훈련 현황.
   - 평생교육원(lifelong)에는 훈련 · 고용노동부 · 국비 문구를 쓰지 않는다(lcompliance.js MOE 규칙과 같음). 국비 · 내일배움카드는 voc에서만.
   - 사실 원칙: 과정 이름 · 기간 · 시간 · 요일 · 수강료 · 수료증은 S.classes 실제 값만. 지원 금액 · 취업률 · 출석 기준 숫자는 쓰지 않는다.
     내일배움카드 대상 · 제외 안내는 제도 일반 설명만 두고 「정확한 자격은 고용24에서 확인」으로 넘긴다.
   - 상호작용은 게시본 정화기(safehtml.js)가 허용하는 radio · label과 CSS :has()만 쓴다(스크립트 · form 없음).
   - 색: 기관 색 하나 → HPT.ramp(50~900) · HPT.onColor. 글자는 U.fit으로 4.5:1 이상. 경고 코랄은 D-day 배지 전용.
   - CSS는 게시본(Shadow DOM)에 그대로 들어가야 하므로 별도 .css 파일 대신 siteHTML의 <style>에 넣는다.
   배치: PASS 표(교차 심사 85점 이상)에 있는 id만 HPT.reg · TPL에 등록한다. 심사 · 시안 렌더용으로 window.HPX_ALL = 1이면 표와 관계없이 등록한다.
   섹션 렌더러(banner hk · text hpt 'lf-*')는 PASS와 관계없이 항상 설치한다 — 이미 게시된 사이트의 모양을 지키기 위해서다. */
'use strict';
(() => {
  /* 교차 심사(L3)에서 85점 이상 받은 id만 넣는다. 예: { careernav: 88 } */
  const PASS = { careernav: 88, trainboard: 87, learnhub: 87 }; // L3 재심사 1차(2026-11-17). 통과 기준 82점(대표님 11-17)
  if (!window.HPT || typeof HPT.reg !== 'function' || typeof siteHTML !== 'function' || typeof proSec !== 'function') return;
  const U = HPT.U; const { mix, fit, al, CR } = U;
  const ramp = HPT.ramp || (c => ({ 50: mix(c, '#ffffff', .94), 100: mix(c, '#ffffff', .86), 200: mix(c, '#ffffff', .7), 500: c, 700: mix(c, '#000000', .3), 800: mix(c, '#000000', .46), 900: mix(c, '#000000', .62) }));
  const on = HPT.onColor || (c => CR(c, '#0B0F0D') >= CR(c, '#FFFFFF') ? '#0B0F0D' : '#FFFFFF');
  const WARN = '#E8553D';
  const HS = window.HPS = window.HPS || {};
  const E = v => esc(v == null ? '' : v);
  const isPh = v => /입력하세요|입력해 주세요|예시|^\s*$/.test(String(v || ''));
  const editing = () => typeof HPE !== 'undefined' && !!HPE && !!HPE.map;
  const ty = () => { try { return S.org.type; } catch (e) { return ''; } };
  const isVoc = () => ty() === 'voc';
  const org = () => { try { return S.org.name; } catch (e) { return ''; } };
  const ft = () => { try { return (S.settings && S.settings.footer) || {}; } catch (e) { return {}; } };
  const today = () => { try { return typeof window.today === 'function' ? window.today() : new Date().toISOString().slice(0, 10); } catch (e) { return new Date().toISOString().slice(0, 10); } };

  /* ── 선 아이콘 한 벌(24 그리드 · 굵기 1.75) ── */
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3 2',
    cert: 'M7 3h10v12l-5-3-5 3zM9 7h6', check: 'M5 12.5l4.5 4.5L19 7.5', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', chat: 'M4 5h16v11H9l-5 4z',
    qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z', brief: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0',
    card: 'M3 6h18v12H3zM3 10h18M7 15h4', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
    wallet: 'M4 7h15a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1zM4 7l11-3v3M16 13h2', home: 'M4 11l8-7 8 7v9H4z' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 20}" height="${n || 20}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;

  /* ── 실제 데이터: 공개 과정 · 링크 ── */
  /* 숫자 띠(HPT.facts)와 같은 목록: 운영 중 과정이 있으면 그것만, 없으면 공개 과정 전체 — 같은 화면의 「공개 과정 N개」 · 칩 · 카드 수가 어긋나지 않게 */
  const pubAll = () => { try { const L = (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료' && c.name); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; } catch (e) { return []; } };
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const dot = d => String(d || '').slice(5, 10).replace('-', '.');
  const won = v => (+v || 0).toLocaleString('ko-KR') + '원';
  const weeks = c => { if (!c.start || !c.end) return 0; const n = (new Date(c.end) - new Date(c.start)) / 864e5; return n > 0 ? Math.max(1, Math.round(n / 7)) : 0; };
  const dday = c => { if (!c.start) return null; const n = Math.round((new Date(c.start) - new Date(today())) / 864e5); return n; };
  const RE_GOV = /내일배움|국비|K-?디지털|국민내일|KDT/i, RE_EMP = /사업주|재직자|직무/, RE_CERT = /자격|기능사|기사|[0-9]급|자격증/, RE_IT = /웹|개발|코딩|데이터|AI|인공지능|디지털|스마트|컴퓨터|파이썬|엑셀|IT/i,
    RE_SEN = /시니어|스마트폰|인문|교양|건강|취미|문화|여가|노년/, RE_BEG = /입문|기초|처음|첫/;
  function facts(c) { const gov = isVoc() && (RE_GOV.test(c.name) || ['3', '4'].includes(String(c.emp || ''))); const emp = isVoc() && (RE_EMP.test(c.name) || ['1', '4'].includes(String(c.emp || '')));
    const w = weeks(c); const days = Array.isArray(c.days) && c.days.length ? c.days.map(d => WD[+d] || '').filter(Boolean).join(' · ') : '';
    const tm = c.time && c.time.from ? `${c.time.from}–${c.time.to || ''}` : '';
    return { gov, emp, free: !+c.price, cert: RE_CERT.test(c.name), it: RE_IT.test(c.name), sen: RE_SEN.test(c.name), beg: RE_BEG.test(c.name) || +c.level === 0, short: w > 0 && w <= 13, w, days, tm,
      price: !+c.price ? (gov ? '국비 지원' : '수강료 무료') : won(c.price), lv: ['입문', '중급', '심화'][+c.level] || '', certOn: c.cert === 'auto' || c.cert === 'manual', dd: dday(c) }; }
  const menuOf = (s, k) => ((s && s.menus) || []).find(m => m && m.kind === k && m.on !== false && m.access !== '비공개' && m.id);
  const clsList = s => { const m = menuOf(s, 'class'); if (m) return '#p-m-' + m.id; const L = pubAll(); return L[0] ? '#p-c-' + L[0].id : '#p-home'; };
  const clsOr = (s, L) => L.length === 1 ? '#p-c-' + L[0].id : clsList(s);
  const telH = v => 'tel:' + String(v).replace(/[^\d+]/g, '');
  function askOf(s) { const f = ft(); if (f.tel && !isPh(f.tel)) return { h: telH(f.tel), l: '전화 상담', ic: 'phone' }; const em = f.email || f.mail;
    if (em && /@/.test(em)) return { h: 'mailto:' + em, l: '메일 상담', ic: 'chat' }; const m = menuOf(s, 'community') || menuOf(s, 'board'); if (m) return { h: '#p-m-' + m.id, l: '상담 게시판', ic: 'chat' };
    return { h: clsList(s), l: '과정 문의', ic: 'chat' }; }
  const noticeH = s => { const m = menuOf(s, 'notice'); return m ? '#p-m-' + m.id : '#p-home'; };
  const W24 = 'https://www.work24.go.kr';
  const aAttr = h => `href="${E(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}`;
  const btn = (h, l, k, icn) => `<a class="hxl-b ${k || 'p'}" ${aAttr(h)}>${icn ? ic(icn, 18) : ''}<span>${E(l)}</span>${/^https?:/.test(h) ? ic('ext', 16) : k === 'g' ? '' : ic('arrow', 18)}</a>`;
  const photoOf = (c, i) => { if (c.thumb && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(c.thumb)) return { src: c.thumb, alt: c.name, stock: '' };
    const H = window.HPSTOCK; if (!H || typeof H.photo !== 'function') return null; try { const x = H.photo(c.name, c.id, { id: true, scope: 'hxl' }); return x ? { src: H.url(x, 'sm'), alt: x.alt || '', pos: x.focus || '50% 50%', stock: x.id } : null; } catch (e) { return null; } };

  /* ── 방문자 유형(첫 화면 「어떤 분이세요?」) ── */
  function personas(s, d) { const L = pubAll().map(c => [c, facts(c)]); const pick = f => L.filter(([, x]) => f(x)).map(([c]) => c); const ask = askOf(s);
    const nx = L.filter(([, x]) => x.dd != null && x.dd >= 0).sort((a, b) => a[1].dd - b[1].dd)[0];
    const nC = L.filter(([, x]) => x.certOn).length; const nxt = nx ? `가장 가까운 개강 · ${nx[0].name} ${dot(nx[0].start)}` : nC ? `수료증을 주는 과정 ${nC}개` : '';
    if (isVoc()) { const G = pick(x => x.gov || x.free), M = pick(x => x.emp);
      return [
        { k: '구직 중', t: '국비로 배우고 취업까지 준비해요', m: [G.length ? `국비 · 무료 과정 ${G.length}개 운영 중` : '', nxt].filter(Boolean), b: [[clsOr(s, G), d.cta || '국비 과정 보기', 'p'], [W24, '내일배움카드 신청', 'g']] },
        { k: '재직 중', t: '퇴근 후 · 주말에 실무를 더해요', m: [M.length ? `재직자 · 사업주 훈련 ${M.length}개` : '재직 중이어도 내일배움카드를 신청할 수 있어요', '일정이 맞는 과정은 상담으로 함께 찾아요'], b: [[clsOr(s, M.length ? M : G), '재직자 과정 보기', 'p'], [ask.h, d.cta2 || ask.l, 'g']] },
        { k: '자영업', t: '자영업자도 내일배움카드를 신청할 수 있어요', m: ['매출 등 일부 기준이 있어요', '정확한 자격은 고용24에서 확인돼요'], b: [[W24, '고용24에서 자격 확인', 'p'], [ask.h, ask.l, 'g']] },
        { k: '훈련생', t: '출결 · 진도 · 수료를 한곳에서 확인해요', m: ['출결과 진도는 자동으로 기록돼요', '수료 기준은 내 훈련 화면에서 바로 보여요'], b: [['#login/my', '내 훈련 현황', 'p'], ['#login/cal', '훈련 일정', 'g']] }]; }
    const B = pick(x => x.beg), C = pick(x => x.cert), N = pick(x => x.sen);
    return [
      { k: '처음 배워요', t: '입문 과정부터 가볍게 시작해요', m: [B.length ? `입문 과정 ${B.length}개` : '', nxt].filter(Boolean), b: [[clsOr(s, B), d.cta || '입문 과정 보기', 'p'], [ask.h, d.cta2 || ask.l, 'g']] },
      { k: '자격증 준비', t: '자격 과정으로 다음 일을 준비해요', m: [C.length ? `자격 과정 ${C.length}개 · ${C[0].name}` : '자격 과정은 상담으로 안내해요'], b: [[clsOr(s, C), '자격 과정 보기', 'p'], [ask.h, ask.l, 'g']] },
      { k: '생활 · 교양', t: '생활에 바로 쓰는 배움을 골라요', m: [N.length ? `생활 · 교양 과정 ${N.length}개 · ${N[0].name}` : '', '가까운 요일 · 시간을 먼저 보여 드려요'].filter(Boolean), b: [[clsOr(s, N), '생활 · 교양 과정', 'p'], [ask.h, ask.l, 'g']] },
      { k: '수강생', t: '내 강의실 · 수료증을 확인해요', m: ['이어 듣기와 진도가 자동으로 기록돼요', '수료증은 내 강의실에서 내려받아요'], b: [['#login/my', '내 강의실', 'p'], ['#login/cal', '수업 일정', 'g']] }]; }

  /* ── 첫 화면(hk: 'careernav') ── */
  const lines = d => String((d && d.title) || org() || '').split('\n').filter((x, k, A) => x || A.length === 1);
  function hero(s, d) { const p = typeof HS.photo === 'function' ? HS.photo(s, 'hero', d) : null; const P = personas(s, d);
    const L = pubAll().map(c => [c, facts(c)]).sort((a, b) => { const x = a[1].dd, y = b[1].dd; const ax = x == null ? 1e6 : x < 0 ? 5e5 - x : x, bx = y == null ? 1e6 : y < 0 ? 5e5 - y : y; return ax - bx; }).slice(0, 3);
    const chip = x => x.dd != null && x.dd >= 0 && x.dd <= 30 ? `<em class="hxl-dd">${x.dd === 0 ? '오늘 개강' : 'D-' + x.dd}</em>` : `<em class="hxl-st">${x.dd != null && x.dd < 0 ? '운영 중' : '모집 중'}</em>`;
    const up = L.length ? `<div class="hxl-up"><p class="hxl-uph">${ic('cal', 18)}<span>${isVoc() ? '모집 · 개강 일정' : '수강 신청 · 개강 일정'}</span></p><ul>${L.map(([c, x]) => `<li><a href="#p-c-${E(c.id)}"><span class="hxl-upx"><b>${E(c.name)}</b><small>${E([c.start ? `${dot(c.start)} – ${dot(c.end)}` : '', x.days, x.price].filter(Boolean).join(' · '))}</small></span>${chip(x)}</a></li>`).join('')}</ul></div>` : '';
    const B = []; if (pubAll().some(c => c.cert === 'auto' || c.cert === 'manual')) B.push('수료증 발급'); if (pubAll().length) B.push('PC · 휴대폰 수강');
    const fig = p ? `<figure class="hps-img hp-photo hxl-ph" data-slot="hero"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 1000px) 100vw, 56vw"` : ''} alt="${E(p.alt)}" loading="eager" fetchpriority="high" decoding="async" style="object-fit:${p.fit || 'cover'};object-position:${E(p.pos || '50% 50%')}"></figure>` : `<div class="hxl-ph hxl-ph0" aria-hidden="true"></div>`;
    const tabs = P.map((x, i) => `<input class="hxl-r" type="radio" name="hxlp" id="hxlp${i}"${i ? '' : ' checked'}><label for="hxlp${i}">${E(x.k)}</label>`).join('');
    const ans = P.map((x, i) => `<div class="hxl-ans a${i}"><p class="hxl-at">${E(x.t)}</p>${x.m.length ? `<ul class="hxl-am">${x.m.map(m => `<li>${ic('check', 16)}<span>${E(m)}</span></li>`).join('')}</ul>` : ''}<div class="hxl-ab">${x.b.map(([h, l, k]) => btn(h, l, k)).join('')}</div></div>`).join('');
    return `<section class="hpt hp-hero hps-hero hxl-hero"><div class="hxl-w hxl-hg"><div class="hxl-hl">${d.eyebrow ? `<p class="hxl-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h1>${lines(d).map(E).join('<br>')}</h1>${d.sub ? `<p class="hxl-sub">${E(d.sub)}</p>` : ''}
<div class="hxl-pz" role="group" aria-label="방문 목적 고르기"><p class="hxl-pzh">어떤 분이세요?</p><div class="hxl-tabs">${tabs}</div>${ans}</div></div>
<div class="hxl-hr">${fig}${B.length ? `<ul class="hxl-bd">${B.map(b => `<li>${ic('check', 16)}${E(b)}</li>`).join('')}</ul>` : ''}${up}</div></div></section>`; }

  /* ── 과정 탐색(text hpt 'lf-find'): 분야 · 기간 · 비용 칩(radio) ── */
  function find(s, d) { const L = pubAll().map(c => [c, facts(c)]); if (!L.length) return '';
    const F = isVoc() ? [['gov', '국비 · 무료', x => x.gov || x.free], ['emp', '재직자', x => x.emp], ['short', '3개월 이내', x => x.short], ['cert', '자격증', x => x.cert], ['it', 'IT · 디지털', x => x.it]]
      : [['beg', '입문', x => x.beg], ['cert', '자격증', x => x.cert], ['sen', '생활 · 교양', x => x.sen], ['it', 'IT · 디지털', x => x.it], ['short', '3개월 이내', x => x.short]];
    const FS = F.map(([k, l, f]) => [k, l, L.filter(([, x]) => f(x)).length, f]).filter(([, , n]) => n > 0 && n < L.length).slice(0, 4);
    const N = L.slice(0, 6);
    const chips = `<div class="hxl-ch" role="group" aria-label="과정 거르기"><input class="hxl-r" type="radio" name="hxlf" id="hxlf-all" checked><label for="hxlf-all">전체 <small>${L.length}</small></label>${FS.map(([k, l, n]) => `<input class="hxl-r" type="radio" name="hxlf" id="hxlf-${k}"><label for="hxlf-${k}">${E(l)} <small>${n}</small></label>`).join('')}</div>`;
    const card = ([c, x], i) => { const p = photoOf(c, i); const cls = FS.filter(([, , , f]) => f(x)).map(([k]) => 'f-' + k).join(' ');
      return `<li class="hxl-cc ${cls}"><a href="#p-c-${E(c.id)}">${p ? `<figure class="hps-img hxl-cph" data-slot="cls-${E(c.id)}"${p.stock ? ` data-stock="${E(p.stock)}"` : ''}><img src="${E(p.src)}" alt="${E(p.alt)}"${i >= 3 ? ' loading="lazy"' : ''} decoding="async" style="object-position:${E(p.pos || '50% 50%')}"></figure>` : `<div class="hxl-cph hxl-ph0" aria-hidden="true"></div>`}
<div class="hxl-cb"><p class="hxl-tg">${x.gov ? '<span class="g">국비</span>' : ''}${x.emp ? '<span>사업주 · 재직자</span>' : ''}${x.lv ? `<span>${E(x.lv)}</span>` : ''}${x.dd != null && x.dd >= 0 && x.dd <= 30 ? `<span class="w">개강 D-${x.dd}</span>` : ''}</p><h3>${E(c.name)}</h3>
<dl class="hxl-cm">${c.start ? `<div><dt>${ic('cal', 16)}<span>기간</span></dt><dd>${E(`${dot(c.start)} – ${dot(c.end)}${x.w ? ` · ${x.w}주` : ''}`)}</dd></div>` : ''}${x.days || +c.hours ? `<div><dt>${ic('clock', 16)}<span>시간</span></dt><dd>${E([x.days ? `${x.days}${x.tm ? ' ' + x.tm : ''}` : '', +c.hours ? `총 ${+c.hours}시간` : ''].filter(Boolean).join(' · '))}</dd></div>` : ''}${x.certOn ? `<div><dt>${ic('cert', 16)}<span>수료</span></dt><dd>수료증 발급</dd></div>` : ''}</dl>
<p class="hxl-cf"><b>${E(x.price)}</b><span>자세히 보기${ic('arrow', 16)}</span></p></div></a></li>`; };
    const more = L.length > N.length ? `<p class="hxl-more">${btn(clsList(s), `전체 ${L.length}개 과정 보기`, 'o')}</p>` : '';
    return `<div class="hxl-w"><div class="hxl-sh">${d.eyebrow ? `<p class="hxl-ey2">${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '과정 찾기')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div><div class="hxl-fd">${chips}<ul class="hxl-cg">${N.map(card).join('')}</ul></div>${more}</div>`; }

  /* ── 지원 · 신청 안내(text hpt 'lf-elig'): voc = 내일배움카드, lifelong = 수강 신청 방법 ── */
  function elig(s, d) { const st = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 4); const ask = askOf(s);
    const steps = st.length ? `<ol class="hxl-steps">${st.map((r, k) => `<li><i aria-hidden="true">${k + 1}</i><span><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</span></li>`).join('')}</ol>` : '';
    const side = isVoc() ? `<div class="hxl-ek"><div class="hxl-ec"><p class="hxl-eh ok">${ic('check', 18)}신청할 수 있어요</p><ul><li>구직 중이거나 실업 상태인 분</li><li>회사에 다니는 재직자</li><li>자영업자 · 특수형태근로종사자</li><li>졸업을 앞둔 졸업 예정자</li></ul></div>
<div class="hxl-ec"><p class="hxl-eh no">${ic('spark', 18)}확인이 필요해요</p><ul><li>공무원 · 사립학교 교직원</li><li>졸업 예정자가 아닌 재학생</li><li>소득 · 기업 규모 · 매출 기준에 걸리는 분</li></ul></div>
<p class="hxl-en">제도 일반 안내예요. 정확한 자격과 지원 범위는 고용24에서 확인돼요.</p><div class="hxl-ab">${btn(W24, '고용24에서 자격 확인', 'p')}${btn(ask.h, ask.l, 'g', ask.ic)}</div></div>`
      : `<div class="hxl-ek"><div class="hxl-ec"><p class="hxl-eh ok">${ic('wallet', 18)}수강료 · 결제</p><ul><li>과정마다 수강료와 결제 방법이 달라요</li><li>감면 · 이용권 사용은 상담으로 안내해요</li></ul></div><div class="hxl-ec"><p class="hxl-eh no">${ic('user', 18)}가입 · 개인정보</p><ul><li>이름과 연락 방법만 받아요</li><li>휴대폰 번호는 동의한 경우에만 선택으로 받아요</li></ul></div>
<div class="hxl-ab">${btn(clsList(s), '과정 고르기', 'p')}${btn(ask.h, ask.l, 'g', ask.ic)}</div></div>`;
    return `<div class="hxl-w hxl-eg"><div class="hxl-el">${d.eyebrow ? `<p class="hxl-ey2">${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '')}</h2>${d.sub ? `<p class="hxl-ed">${E(d.sub)}</p>` : ''}${steps}</div>${side}</div>`; }

  /* ── 훈련생 · 수강생 여정 + 바로가기(text hpt 'lf-track') ── */
  function track(s, d) { const st = (d.cols || []).filter(r => r && r[0] && !isPh(r[0])).slice(0, 4); const v = isVoc();
    const Q = [['qr', v ? '오늘 출결 확인' : '이어 듣기', v ? 'QR · 진도 자동 기록' : '멈춘 곳부터 이어서', '#login/my'], ['cert', v ? '수료 현황 · 수료증' : '수료증 내려받기', v ? '수료 기준 충족 여부' : '수료한 과정의 수료증', '#login/my'],
      ['cal', v ? '훈련 일정' : '수업 일정', '개강 · 평가 · 과제 일정', '#login/cal'], [v ? 'brief' : 'bell', v ? '취업 · 채용 소식' : '공지 · 소식', v ? '공지에서 채용 · 행사 안내' : '휴강 · 행사 · 모집 안내', noticeH(s)]];
    return `<div class="hxl-w hxl-tg2"><div class="hxl-tl">${d.eyebrow ? `<p class="hxl-ey2">${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '')}</h2>${st.length ? `<ol class="hxl-tm">${st.map((r, k) => `<li><i aria-hidden="true">${String(k + 1).padStart(2, '0')}</i><b>${E(r[0])}</b>${r[1] ? `<small>${E(r[1])}</small>` : ''}</li>`).join('')}</ol>` : ''}</div>
<div class="hxl-tq"><p class="hxl-tqh">${v ? '이미 훈련생이라면' : '이미 수강 중이라면'}</p><ul>${Q.map(([k, l, sb, h]) => `<li><a ${aAttr(h)}><i aria-hidden="true">${ic(k, 22)}</i><span><b>${E(l)}</b><small>${E(sb)}</small></span>${ic('arrow', 18)}</a></li>`).join('')}</ul></div></div>`; }

  /* ════ A4 보조 2종 ════ */
  const pd = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
  const figOf = (slot, p, cls, eager) => p ? `<figure class="hps-img${slot === 'hero' ? ' hp-photo' : ''} ${cls}" data-slot="${E(slot)}"${p.stock ? ' data-stock="1"' : ''}><img src="${E(p.src)}"${p.srcset ? ` srcset="${E(p.srcset)}" sizes="(max-width: 1000px) 100vw, 40vw"` : ''} alt="${E(p.alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-fit:${p.fit || 'cover'};object-position:${E(p.pos || '50% 50%')}"></figure>` : `<div class="${cls} hxl-ph0" aria-hidden="true"></div>`;
  const stChip = x => x.dd != null && x.dd >= 0 && x.dd <= 30 ? `<em class="hxl-dd">${x.dd === 0 ? '오늘 개강' : 'D-' + x.dd}</em>` : `<em class="hxl-st">${x.dd != null && x.dd < 0 ? '운영 중' : '모집 중'}</em>`;
  const whenOf = x => x.days ? `${x.days}${x.tm ? ' ' + x.tm : ''}` : '';

  /* ── 개강 일정표(실제 start · end로 그린 월 단위 막대) ── */
  function board() { const L = pubAll().filter(c => !isNaN(pd(c.start)) && !isNaN(pd(c.end)) && pd(c.end) >= pd(c.start)).map(c => [c, facts(c)]).sort((a, b) => pd(a[0].start) - pd(b[0].start)).slice(0, 5);
    if (!L.length) return ''; const t0 = pd(today()); const s0 = new Date(Math.min(...L.map(([c]) => pd(c.start)))); let y = s0.getUTCFullYear(), mo = s0.getUTCMonth(); const e1 = Math.max(...L.map(([c]) => pd(c.end)));
    const M = []; while (M.length < 6) { const a = Date.UTC(y, mo, 1); if (a > e1) break; M.push(a); mo++; if (mo > 11) { mo = 0; y++; } } const W0 = M[0], W1 = Date.UTC(y, mo, 1);
    const pc = v => Math.max(0, Math.min(100, (v - W0) / (W1 - W0) * 100)); const r1 = v => Math.round(v * 10) / 10; const tIn = t0 >= W0 && t0 < W1; const tL = r1(pc(t0));
    const mLab = M.map((m, k) => { const d = new Date(m); const n = d.getUTCMonth() + 1; return `<span>${n === 1 && k ? `<small>${d.getUTCFullYear()}</small>` : ''}${n}월</span>`; }).join('');
    const rows = L.map(([c, x]) => { const a = pd(c.start), b = pd(c.end) + 864e5; const l = pc(a), w = Math.max(2, pc(b) - l); const pr = t0 <= a ? 0 : t0 >= b ? 100 : Math.round((t0 - a) / (b - a) * 100);
      const meta = [`${dot(c.start)} – ${dot(c.end)}${x.w ? ` · ${x.w}주` : ''}`, whenOf(x), x.price].filter(Boolean).join(' · ');
      return `<li><a href="#p-c-${E(c.id)}"><span class="hxl-gn"><b>${E(c.name)}</b><small>${E(meta)}</small></span><span class="hxl-gt" aria-hidden="true">${tIn ? `<i class="hxl-gtd" style="left:${tL}%"></i>` : ''}<i class="hxl-gb${pr ? '' : ' up'}" style="left:${r1(l)}%;width:${r1(Math.min(w, 100 - l))}%">${pr ? `<i class="hxl-gp" style="width:${pr}%"></i>` : ''}</i></span>${stChip(x)}</a></li>`; }).join('');
    return `<div class="hxl-gx"><div class="hxl-gxh"><p class="hxl-uph">${ic('cal', 18)}<span>${isVoc() ? '개강 · 훈련 일정표' : '개강 · 수업 일정표'}</span></p><p class="hxl-glg"><span><i class="p"></i>지난 기간</span><span><i class="r"></i>남은 기간</span>${tIn ? `<span><i class="t"></i>오늘 ${E(dot(today()))}</span>` : ''}</p></div>
<div class="hxl-gh" aria-hidden="true"><span></span><span class="hxl-gm" style="--n:${M.length}">${mLab}</span><span></span></div><ul class="hxl-gl" style="--n:${M.length}">${rows}</ul></div>`; }

  /* ── 국비 자격 미리 확인(3문항 · radio + :has) ── */
  function check(s) { const ask = askOf(s); const G = pubAll().filter(c => { const x = facts(c); return x.gov || x.free; });
    if (!isVoc()) return `<div class="hxl-ck"><p class="hxl-ckh">${ic('book', 20)}<span>수강 신청, 세 단계면 끝나요</span></p><ol class="hxl-cs"><li><b>과정 고르기</b><small>요일 · 시간 · 수강료를 비교해요</small></li><li><b>신청 · 결제</b><small>온라인으로 신청해요</small></li><li><b>강의실 입장</b><small>로그인하면 바로 시작해요</small></li></ol><div class="hxl-ab">${btn(clsList(s), '과정 고르기', 'p')}${btn(ask.h, ask.l, 'g', ask.ic)}</div></div>`;
    const Q = ['구직 · 재직 · 자영업 중이에요', '공무원 · 사립학교 교직원이 아니에요', '재학생이 아니에요(졸업 예정자는 괜찮아요)'];
    return `<div class="hxl-ck" role="group" aria-label="국민내일배움카드 자격 미리 확인"><p class="hxl-ckh">${ic('card', 20)}<span>국비 자격, 3가지로 미리 확인해요</span></p>
<ol class="hxl-cq">${Q.map((q, k) => `<li><p><i aria-hidden="true">${k + 1}</i><span>${E(q)}</span></p><div class="hxl-yn"><input class="hxl-r" type="radio" name="hxlq${k}" id="hxlq${k}y"><label for="hxlq${k}y">예</label><input class="hxl-r" type="radio" name="hxlq${k}" id="hxlq${k}n"><label for="hxlq${k}n">아니요</label></div></li>`).join('')}</ol>
<div class="hxl-cr r0"><p>세 문항에 답하면 결과가 바로 보여요</p></div>
<div class="hxl-cr ok"><p class="hxl-crh">${ic('check', 20)}<span>국민내일배움카드를 신청할 수 있는 상황일 가능성이 커요</span></p><div class="hxl-ab">${btn(W24, '고용24에서 카드 신청', 'p')}${btn(clsOr(s, G.length ? G : pubAll()), '국비 과정 보기', 'g')}</div></div>
<div class="hxl-cr no"><p class="hxl-crh">${ic('spark', 20)}<span>다른 지원 제도가 맞을 수 있어요. 상담으로 함께 확인해요</span></p><div class="hxl-ab">${btn(ask.h, ask.l, 'p', ask.ic)}${btn(W24, '고용24에서 확인', 'g')}</div></div>
<p class="hxl-cn">제도 일반 안내예요. 소득 · 기업 규모 · 매출 기준이 있어 정확한 자격은 고용24에서 확인돼요.</p></div>`; }

  /* ── 첫 화면(hk: 'trainboard') — 기관 색 짙은 바탕 + 자격 확인 판 + 개강 일정표 + 사진 1장 ── */
  function heroTB(s, d) { const p = typeof HS.photo === 'function' ? HS.photo(s, 'hero', d) : null; const v = isVoc(); const ask = askOf(s); const all = pubAll().map(c => [c, facts(c)]);
    const G = all.filter(([, x]) => x.gov || x.free).map(([c]) => c), M = all.filter(([, x]) => x.emp).map(([c]) => c);
    const Q = v ? [[clsOr(s, M.length ? M : pubAll()), '재직자 과정', 'brief'], ['#login/my', '내 훈련 현황', 'qr'], ['#login/cal', '훈련 일정', 'cal'], [noticeH(s), '취업 · 채용 소식', 'bell']]
      : [[clsList(s), '전체 과정', 'book'], ['#login/my', '내 강의실', 'qr'], ['#login/cal', '수업 일정', 'cal'], [noticeH(s), '공지 · 소식', 'bell']];
    const bd = board();
    return `<section class="hpt hp-hero hps-hero hxl-tbh"><div class="hxl-w"><div class="hxl-tbg"><div class="hxl-tbl0">${d.eyebrow ? `<p class="hxl-ey3">${ic('cal', 16)}${E(d.eyebrow)}</p>` : ''}<h1>${lines(d).map(E).join('<br>')}</h1>${d.sub ? `<p class="hxl-sub">${E(d.sub)}</p>` : ''}
<div class="hxl-ab">${btn(clsOr(s, G.length ? G : pubAll()), d.cta || (v ? '국비 과정 보기' : '과정 보기'), 'w')}${btn(ask.h, d.cta2 || ask.l, 'ow', ask.ic)}</div></div>
${check(s)}<nav class="hxl-qk" aria-label="바로 가기"><p>${v ? '이미 훈련생이라면' : '이미 수강 중이라면'}</p><ul>${Q.map(([h, l, k]) => `<li><a ${aAttr(h)}>${ic(k, 18)}<span>${E(l)}</span></a></li>`).join('')}</ul></nav></div></div></section>`; }
  /* 개강 일정표 섹션(text hpt 'lf-board'): 첫 화면 판 아래에 반쯤 걸친 흰 카드 + 사진(PC). 휴대폰은 흰 바탕 다음 섹션, 사진 숨김 */
  function boardSec(s, d) { const bd = board(); if (!bd) return ''; const p = typeof HS.photo === 'function' ? HS.photo(s, 'hero', null) : null; return `<div class="hxl-w"><div class="hxl-tbb">${bd}${figOf('hero', p, 'hxl-tph', true)}</div></div>`; }

  /* ── 과정 비교표(text hpt 'lf-table') — PC 표 · 휴대폰 카드 ── */
  function table(s, d) { const L = pubAll().map(c => [c, facts(c)]).slice(0, 8); if (!L.length) return ''; const all = pubAll().length; const v = isVoc();
    const H = ['과정', '기간', '요일 · 시간', v ? '수강료 · 지원' : '수강료', '수료'];
    const row = ([c, x]) => `<a class="hxl-tr" role="row" href="#p-c-${E(c.id)}"><span role="cell" class="c0"><b>${E(c.name)}</b><span class="hxl-tg">${x.gov ? '<span class="g">국비</span>' : ''}${x.emp ? '<span>사업주 · 재직자</span>' : ''}${x.lv ? `<span>${E(x.lv)}</span>` : ''}${stChip(x)}</span></span>
<span role="cell" data-l="기간">${c.start ? E(`${dot(c.start)} – ${dot(c.end)}`) + (x.w ? `<small>${x.w}주</small>` : '') : '<small>상세에서 확인</small>'}</span>
<span role="cell" data-l="요일 · 시간">${x.days ? E(whenOf(x)) : c.kind === 'period' ? '기간 내 자유 수강' : '<small class="q">일정 협의</small>'}${+c.hours ? `<small>총 ${+c.hours}시간</small>` : ''}</span>
<span role="cell" data-l="${E(H[3])}"><b class="pr">${E(x.price)}</b></span><span role="cell" data-l="수료">${x.certOn ? `<span class="hxl-ce">${ic('cert', 16)}수료증</span>` : '<small>없음</small>'}</span><span class="hxl-ta" aria-hidden="true">${ic('arrow', 20)}</span></a>`;
    return `<div class="hxl-w"><div class="hxl-sh">${d.eyebrow ? `<p class="hxl-ey2">${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '과정 비교표')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div>
<div class="hxl-tb" role="table" aria-label="과정 비교표"><div class="hxl-tr hxl-thd" role="row">${H.map(h => `<span role="columnheader">${E(h)}</span>`).join('')}<span></span></div>${L.map(row).join('')}</div>
<div class="hxl-tbf">${v ? `<p>국비 지원 범위와 자부담은 과정 상세와 고용24에서 확인돼요.</p>` : '<p>수강료 감면은 상담으로 안내해 드려요.</p>'}${btn(clsList(s), all > L.length ? `전체 ${all}개 과정 보기` : '과정 목록 보기', 'o')}</div></div>`; }

  /* ── 첫 화면(hk: 'learnhub') — 사진 3장 격자 + 요일로 찾기 ── */
  const DORD = [1, 2, 3, 4, 5, 6, 0];
  function dayFinder(s) { const L = pubAll().map(c => [c, facts(c), (Array.isArray(c.days) ? c.days : []).map(Number).filter(n => n >= 0 && n <= 6)]); const ask = askOf(s);
    const D = L.filter(r => r[2].length); const nD = L.length - D.length; const t = x => (x.tm || '').split('–')[0];
    const item = ([c, x]) => `<li><a href="#p-c-${E(c.id)}"><span class="hxl-dt"><b>${E(t(x) || x.days || (c.kind === 'period' ? '자유' : '협의'))}</b>${t(x) ? `<small>${E(x.days)}</small>` : !x.days ? `<small>${c.kind === 'period' ? '수강' : '상담'}</small>` : ''}</span><span class="hxl-dn"><b>${E(c.name)}</b><small>${E([c.start ? `${dot(c.start)} – ${dot(c.end)}` : '', x.price].filter(Boolean).join(' · '))}</small></span>${ic('arrow', 20)}</a></li>`;
    const rest = nD ? `<p class="hxl-dr">요일이 따로 적히지 않은 수업 ${nD}개는 <a href="${E(clsList(s))}">전체 수업</a>에서 볼 수 있어요.</p>` : '';
    if (!D.length) return `<div class="hxl-day"><div class="hxl-dh"><h2>지금 들을 수 있는 수업</h2></div><ul class="hxl-dl">${L.slice(0, 4).map(item).join('')}</ul></div>`;
    const by = k => D.filter(r => r[2].includes(k)); const sortT = A => A.slice().sort((a, b) => (t(a[1]) || '99').localeCompare(t(b[1]) || '99'));
    const chips = `<input class="hxl-r" type="radio" name="hxld" id="hxld-a" checked><label for="hxld-a">전체 <small>${L.length}</small></label>` + DORD.filter(k => by(k).length).map(k => `<input class="hxl-r" type="radio" name="hxld" id="hxld${k}"><label for="hxld${k}">${WD[k]} <small>${by(k).length}</small></label>`).join('');
    const pane = (id, A, nm) => `<div class="hxl-dp p${id}">${A.length ? `<p class="hxl-dc">${E(nm)} 수업 <b>${A.length}개</b></p><ul class="hxl-dl">${(id === 'a' ? A : sortT(A)).slice(0, 6).map(item).join('')}</ul>` : `<div class="hxl-de"><p>${E(nm)}에는 아직 수업이 없어요. 다른 요일을 골라 보거나 상담으로 물어보세요.</p>${btn(ask.h, ask.l, 'g', ask.ic)}</div>`}</div>`;
    return `<div class="hxl-day" role="group" aria-label="요일로 찾기"><div class="hxl-dh"><h2>${ic('cal', 24)}<span>요일로 찾기</span></h2><p>다니기 편한 요일을 누르면 그날 수업만 보여요.</p></div><div class="hxl-dch">${chips}</div>
${pane('a', [...D, ...L.filter(r => !r[2].length)], '전체')}${DORD.filter(k => by(k).length).map(k => pane(k, by(k), WD[k] + '요일')).join('')}</div>`; }
  function heroLH(s, d) { const ph = k => typeof HS.photo === 'function' ? HS.photo(s, k, k === 'hero' ? d : undefined) : null; const ask = askOf(s); const v = isVoc();
    return `<section class="hpt hp-hero hps-hero hxl-lhh"><div class="hxl-w"><div class="hxl-lg"><div class="hxl-ll">${d.eyebrow ? `<p class="hxl-ey"><i aria-hidden="true"></i>${E(d.eyebrow)}</p>` : ''}<h1>${lines(d).map(E).join('<br>')}</h1>${d.sub ? `<p class="hxl-sub">${E(d.sub)}</p>` : ''}
<div class="hxl-ab">${btn(clsList(s), d.cta || '전체 수업 보기', 'p')}${btn(ask.h, d.cta2 || ask.l, 'g', ask.ic)}</div><p class="hxl-me"><a href="#login/my">${ic('user', 20)}<span>${v ? '이미 훈련생이세요? 내 훈련 현황' : '이미 수강생이세요? 내 강의실'}</span>${ic('arrow', 18)}</a></p></div>
<div class="hxl-mo">${figOf('hero', ph('hero'), 'hxl-m0', true)}${figOf('about', ph('about'), 'hxl-m1')}${figOf('space', ph('space'), 'hxl-m2')}</div></div>${dayFinder(s)}</div></section>`; }

  /* ── 분야로 둘러보기(text hpt 'lf-cat') ── */
  function cats(s, d) { const L = pubAll().map(c => [c, facts(c)]); if (!L.length) return ''; const v = isVoc();
    const F = (v ? [['gov', '국비 · 무료', 'wallet', x => x.gov || x.free], ['emp', '재직자', 'brief', x => x.emp]] : [['beg', '처음 배워요', 'spark', x => x.beg], ['sen', '생활 · 교양', 'home', x => x.sen]])
      .concat([['cert', '자격증', 'cert', x => x.cert], ['it', 'IT · 디지털', 'card', x => x.it], ['short', '3개월 이내', 'clock', x => x.short]]);
    const T = F.map(([k, l, i, f]) => [k, l, i, L.filter(([, x]) => f(x)).map(([c]) => c)]).filter(r => r[3].length).slice(0, 5);
    const tile = ([k, l, i, A]) => `<li><a href="${E(clsOr(s, A))}"><span class="hxl-ci" aria-hidden="true">${ic(i, 26)}</span><span class="hxl-cx"><b>${E(l)}</b><small>${E(A.slice(0, 2).map(c => c.name).join(' · '))}</small></span><em>${A.length}개</em></a></li>`;
    return `<div class="hxl-w"><div class="hxl-sh">${d.eyebrow ? `<p class="hxl-ey2">${E(d.eyebrow)}</p>` : ''}<h2>${E(d.title || '분야로 둘러보기')}</h2>${d.sub ? `<p>${E(d.sub)}</p>` : ''}</div>
<ul class="hxl-cl">${T.map(tile).join('')}<li class="all"><a href="${E(clsList(s))}"><span class="hxl-ci" aria-hidden="true">${ic('book', 26)}</span><span class="hxl-cx"><b>전체 ${v ? '과정' : '수업'}</b><small>모든 ${v ? '과정' : '수업'}을 한 번에 봐요</small></span><em>${L.length}개</em></a></li></ul></div>`; }

  const SEC = { 'lf-board': [boardSec, 'hxl-bds'], 'lf-find': [find, 'hxl-find'], 'lf-elig': [elig, 'hxl-elig'], 'lf-track': [track, 'hxl-track'], 'lf-table': [table, 'hxl-tbl'], 'lf-cat': [cats, 'hxl-cat'] };

  /* ── CSS(기관 색 하나에서 계산) ── */
  function css(s) { const T = HPT.tokens(s) || { a: '#0F6E66' }; const th = HPT.meta(s.theme) || DEF.careernav; const R = ramp(T.a); const ink = '#111A18', mu = '#4B5753';
    const bg = '#FFFFFF', tint = R[50], deep = mix(R[900], '#06110F', .35); const aT = fit(T.a, bg, 4.6); const aTt = fit(T.a, tint, 4.6); const onA = on(T.a);
    const pb = CR(T.a, '#ffffff') >= 4.5 ? T.a : fit(T.a, '#ffffff', 4.6, '#000000'); const onP = on(pb); const dMu = fit('#C9D4D0', deep, 4.8, '#ffffff'); const dA = fit(R[200], deep, 4.8, '#ffffff');
    const warnT = fit(WARN, '#ffffff', 4.6);
    return `
/* v43.8 hpx-life */.hxl-hero,.hxl-find,.hxl-elig,.hxl-track,.hxl-tbh,.hxl-tbl,.hxl-lhh,.hxl-cat{--lf-a:${T.a};--lf-p:${pb};--lf-on:${onP};--lf-at:${aT};--lf-att:${aTt};--lf-50:${R[50]};--lf-100:${R[100]};--lf-200:${R[200]};--lf-700:${R[700]};--lf-ink:${ink};--lf-mu:${mu};--lf-ln:rgba(17,26,24,.1);--lf-r:20px;font-variant-numeric:tabular-nums;color:var(--lf-ink)}
.hxl-w{max-width:1240px;margin:0 auto;padding:0 40px;box-sizing:border-box}.hxl-w *{box-sizing:border-box}
.hxl-r{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.hxl-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 22px;border-radius:12px;font-weight:700;font-size:16px;letter-spacing:-.01em;text-decoration:none;transition:background .18s,box-shadow .18s,transform .18s;white-space:nowrap}
.hxl-b.p{background:var(--lf-p);color:var(--lf-on)}.hxl-b.p:hover{background:${mix(pb, '#000000', .14)}}
.hxl-b.g{background:#fff;color:var(--lf-ink);box-shadow:inset 0 0 0 1.5px rgba(17,26,24,.18)}.hxl-b.g:hover{box-shadow:inset 0 0 0 1.5px var(--lf-at)}
.hxl-b.o{background:var(--lf-50);color:var(--lf-att)}.hxl-b svg{flex:none}
.hxl-b:focus-visible,.hxl-hero a:focus-visible,.hxl-find a:focus-visible,.hxl-track a:focus-visible{outline:3px solid ${al(T.a, .45)};outline-offset:3px}
.hxl-ey,.hxl-ey2{display:inline-flex;align-items:center;gap:8px;margin:0 0 18px;font-size:14px;font-weight:750;letter-spacing:.01em;color:var(--lf-at)}
.hxl-ey{padding:8px 14px 8px 10px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px var(--lf-ln)}.hxl-ey i{width:8px;height:8px;border-radius:50%;background:var(--lf-a);box-shadow:0 0 0 4px ${al(T.a, .18)}}
/* 첫 화면 */
.hpt.hxl-hero{background:linear-gradient(180deg,${tint} 0%,#ffffff 78%);padding:56px 0 72px;position:relative;overflow:hidden}
.hxl-hg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);gap:48px;align-items:start}
.hpt.hxl-hero .hxl-hl h1{margin:0;max-width:none;text-shadow:none;font-size:clamp(34px,4.1vw,54px);line-height:1.16;font-weight:800;letter-spacing:-.035em;color:var(--lf-ink);word-break:keep-all}
.hxl-sub{margin:18px 0 0;font-size:18px;line-height:1.65;color:var(--lf-mu);max-width:34em;word-break:keep-all}
.hxl-pz{margin-top:30px;background:#fff;border-radius:var(--lf-r);padding:22px;box-shadow:0 1px 2px rgba(16,24,22,.05),0 22px 48px -28px rgba(16,40,34,.32),0 0 0 1px var(--lf-ln)}
.hxl-pzh{margin:0 0 12px;font-size:15px;font-weight:750;color:var(--lf-mu)}
.hxl-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:5px;border-radius:14px;background:${mix(R[50], '#E9EEEC', .5)}}
.hxl-tabs label{display:flex;align-items:center;justify-content:center;text-align:center;min-height:46px;padding:6px 8px;border-radius:10px;font-size:15px;font-weight:700;line-height:1.3;color:var(--lf-mu);cursor:pointer;word-break:keep-all;transition:background .15s,color .15s,box-shadow .15s}
.hxl-tabs label:hover{color:var(--lf-ink)}.hxl-r:checked+label{background:#fff;color:var(--lf-att);box-shadow:0 1px 2px rgba(16,24,22,.08),0 4px 12px -6px rgba(16,24,22,.22)}.hxl-r:focus-visible+label{outline:3px solid ${al(T.a, .45)};outline-offset:2px}
.hxl-ans{display:none;padding:20px 4px 2px}.hxl-pz:has(#hxlp0:checked) .a0,.hxl-pz:has(#hxlp1:checked) .a1,.hxl-pz:has(#hxlp2:checked) .a2,.hxl-pz:has(#hxlp3:checked) .a3{display:block}
.hxl-at{margin:0;font-size:21px;font-weight:800;letter-spacing:-.025em;line-height:1.35;word-break:keep-all}
.hxl-am{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}.hxl-am li{display:flex;gap:8px;align-items:flex-start;font-size:15px;line-height:1.5;color:var(--lf-mu)}.hxl-am svg{color:var(--lf-at);margin-top:2px;flex:none}
.hxl-ab{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.hxl-hr{position:relative;min-width:0}
.hxl-ph{display:block;margin:0;width:100%;aspect-ratio:5/4.2;border-radius:28px;overflow:hidden;box-shadow:0 30px 60px -36px rgba(10,30,26,.5)}.hxl-ph img{width:100%;height:100%;display:block}
.hxl-ph0{background:linear-gradient(135deg,${R[200]},${R[700]})}
.hxl-bd{position:absolute;top:18px;left:18px;display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}.hxl-bd li{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.94);font-size:14px;font-weight:700;color:var(--lf-ink);box-shadow:0 6px 18px -10px rgba(0,0,0,.4)}.hxl-bd svg{color:var(--lf-at)}
.hxl-up{position:relative;margin:-96px 24px 0 auto;max-width:440px;background:#fff;border-radius:20px;padding:18px 18px 8px;box-shadow:0 1px 2px rgba(16,24,22,.06),0 26px 50px -26px rgba(10,30,26,.45),0 0 0 1px var(--lf-ln)}
.hxl-uph{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:14px;font-weight:750;color:var(--lf-at)}
.hxl-up ul{list-style:none;margin:0;padding:0}.hxl-up li+li{border-top:1px solid var(--lf-ln)}
.hxl-up a{display:flex;align-items:center;gap:12px;min-height:60px;padding:10px 4px;text-decoration:none;color:inherit}.hxl-up a:hover b{color:var(--lf-at)}
.hxl-upx{flex:1;min-width:0;display:grid;gap:3px}.hxl-upx b{font-size:16px;font-weight:750;letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hxl-upx small{font-size:13.5px;color:var(--lf-mu)}
.hxl-dd,.hxl-st{flex:none;font-style:normal;font-size:13px;font-weight:800;padding:6px 10px;border-radius:999px}.hxl-dd{background:${al(WARN, .12)};color:${warnT}}.hxl-st{background:var(--lf-50);color:var(--lf-att)}
/* 섹션 공통 */
.hpt.hxl-find,.hpt.hxl-track{padding:104px 0;background:#fff}.hpt.hxl-elig{padding:104px 0;background:${deep};color:#fff}
.hxl-sh{max-width:760px;margin-bottom:28px}.hxl-sh h2,.hxl-el h2,.hxl-tl h2{margin:0;font-size:clamp(28px,3.2vw,40px);line-height:1.22;font-weight:800;letter-spacing:-.03em;word-break:keep-all}.hxl-sh p:not(.hxl-ey2){margin:14px 0 0;font-size:17px;line-height:1.65;color:var(--lf-mu)}
/* 과정 탐색 */
.hxl-ch{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.hxl-ch label{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 18px;border-radius:999px;font-size:15px;font-weight:700;color:var(--lf-ink);background:#fff;box-shadow:inset 0 0 0 1.5px rgba(17,26,24,.14);cursor:pointer}
.hxl-ch label small{font-size:13px;color:var(--lf-mu);font-weight:700}.hxl-ch .hxl-r:checked+label{background:var(--lf-ink);color:#fff;box-shadow:none}.hxl-ch .hxl-r:checked+label small{color:#D5DDDA}
.hxl-cg{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
${['gov', 'emp', 'short', 'cert', 'it', 'beg', 'sen'].map(k => `.hxl-fd:has(#hxlf-${k}:checked) .hxl-cc:not(.f-${k})`).join(',')}{display:none}
.hxl-cc a{display:flex;flex-direction:column;height:100%;border-radius:var(--lf-r);overflow:hidden;background:#fff;text-decoration:none;color:inherit;box-shadow:0 1px 2px rgba(16,24,22,.05),0 18px 40px -30px rgba(16,40,34,.4),0 0 0 1px var(--lf-ln);transition:transform .2s,box-shadow .2s}
.hxl-cc a:hover{transform:translateY(-3px);box-shadow:0 1px 2px rgba(16,24,22,.05),0 28px 48px -28px rgba(16,40,34,.45),0 0 0 1px ${al(T.a, .35)}}
.hxl-cph{margin:0;aspect-ratio:16/10;overflow:hidden;background:var(--lf-50)}.hxl-cph img{width:100%;height:100%;object-fit:cover;display:block}
.hxl-cb{display:flex;flex-direction:column;gap:10px;padding:20px 22px 20px;flex:1}
.hxl-tg{display:flex;flex-wrap:wrap;gap:6px;margin:0;min-height:28px}.hxl-tg span{font-size:13px;font-weight:750;padding:5px 9px;border-radius:8px;background:#F1F4F3;color:var(--lf-mu)}.hxl-tg .g{background:var(--lf-50);color:var(--lf-att)}.hxl-tg .w{background:${al(WARN, .1)};color:${warnT}}
.hxl-cb h3{margin:0;font-size:19px;line-height:1.4;font-weight:750;letter-spacing:-.02em;word-break:keep-all}
.hxl-cm{margin:0;display:grid;gap:6px}.hxl-cm div{display:flex;gap:10px;font-size:14.5px;line-height:1.45}.hxl-cm dt{display:flex;align-items:center;gap:5px;flex:none;width:62px;color:var(--lf-mu);font-weight:600}.hxl-cm dt svg{color:var(--lf-at)}.hxl-cm dd{margin:0;color:var(--lf-ink);font-weight:600}
.hxl-cf{margin:auto 0 0;padding-top:14px;border-top:1px solid var(--lf-ln);display:flex;align-items:center;justify-content:space-between;gap:10px}.hxl-cf b{font-size:18px;font-weight:800;letter-spacing:-.02em}.hxl-cf span{display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:700;color:var(--lf-at)}
.hxl-more{margin:28px 0 0;text-align:center}
/* 지원 · 신청 안내(짙은 블록) */
.hxl-eg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:start}
.hxl-elig .hxl-ey2{color:${dA}}.hxl-el h2{color:#fff}.hxl-ed{margin:16px 0 0;font-size:17px;line-height:1.7;color:${dMu}}
.hxl-steps{list-style:none;margin:30px 0 0;padding:0;display:grid;gap:4px;counter-reset:s}.hxl-steps li{display:flex;gap:16px;align-items:flex-start;padding:16px 0;border-top:1px solid rgba(255,255,255,.12)}
.hxl-steps i{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:${dA};color:${deep};font-style:normal;font-weight:800;font-size:15px}
.hxl-steps b{display:block;font-size:17px;font-weight:750;color:#fff}.hxl-steps small{display:block;margin-top:4px;font-size:15px;line-height:1.55;color:${dMu}}
.hxl-ek{background:#fff;color:var(--lf-ink);border-radius:24px;padding:28px;box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
.hxl-ec+.hxl-ec{margin-top:18px;padding-top:18px;border-top:1px solid var(--lf-ln)}
.hxl-eh{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:16px;font-weight:800}.hxl-eh.ok svg{color:var(--lf-at)}.hxl-eh.no svg{color:${warnT}}
.hxl-ec ul{margin:0;padding:0 0 0 2px;list-style:none;display:grid;gap:7px}.hxl-ec li{position:relative;padding-left:16px;font-size:15px;line-height:1.55;color:var(--lf-mu)}.hxl-ec li::before{content:'';position:absolute;left:2px;top:.68em;width:5px;height:5px;border-radius:50%;background:${R[200]}}
.hxl-en{margin:18px 0 0;padding:12px 14px;border-radius:12px;background:#F4F6F5;font-size:14px;line-height:1.55;color:var(--lf-mu)}
/* 여정 · 바로가기 */
.hxl-tg2{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:56px;align-items:start}
.hxl-tm{list-style:none;margin:30px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.hxl-tm li{position:relative;padding:22px;border-radius:18px;background:var(--lf-50);display:grid;gap:6px}.hxl-tm i{font-style:normal;font-size:14px;font-weight:800;color:var(--lf-att);letter-spacing:.04em}.hxl-tm b{font-size:18px;font-weight:800;letter-spacing:-.02em}.hxl-tm small{font-size:15px;line-height:1.55;color:var(--lf-mu)}
.hxl-tq{border-radius:24px;padding:24px;background:#fff;box-shadow:0 1px 2px rgba(16,24,22,.05),0 24px 48px -30px rgba(16,40,34,.38),0 0 0 1px var(--lf-ln)}
.hxl-tqh{margin:0 0 6px;font-size:15px;font-weight:800;color:var(--lf-at)}.hxl-tq ul{list-style:none;margin:0;padding:0}.hxl-tq li+li{border-top:1px solid var(--lf-ln)}
.hxl-tq a{display:flex;align-items:center;gap:14px;min-height:72px;padding:12px 4px;text-decoration:none;color:inherit}.hxl-tq a>i{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:var(--lf-50);color:var(--lf-att)}
.hxl-tq a>span{flex:1;min-width:0;display:grid;gap:2px}.hxl-tq b{font-size:17px;font-weight:750}.hxl-tq small{font-size:14px;color:var(--lf-mu)}.hxl-tq a>svg{color:var(--lf-mu);flex:none}.hxl-tq a:hover>svg{color:var(--lf-at)}
/* 공통 부품 글자 하한(13px) — 이 템플릿을 쓰는 사이트에서만 */
.hps-tag,.hp-fl small,.hps-facts small,.hpt dd small,.hps-wmk small{font-size:13px!important}
.hxl-dch label small{margin-left:4px;font-weight:650}/* 글 속 링크(FAQ 아래 「문의 게시판」)도 누르는 칸 44px */.hpb-qc a,.hxl-dr a{display:inline-block;line-height:20px;padding:12px 4px;margin:-12px 0;vertical-align:baseline}.hps-new{font-size:13px!important;width:22px!important;height:22px!important}
/* 휴대폰 · 태블릿 */
@media (max-width:1000px){.hxl-hg,.hxl-eg,.hxl-tg2{grid-template-columns:minmax(0,1fr);gap:32px}.hxl-cg{grid-template-columns:repeat(2,minmax(0,1fr))}.hxl-up{margin:-72px 16px 0 auto}}
@media (max-width:640px){.hxl-w{padding:0 20px}.hpt.hxl-hero{padding:28px 0 48px}.hxl-sub{font-size:16.5px}.hxl-pz{margin-top:22px;padding:16px}
.hxl-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.hxl-at{font-size:19px}.hxl-ab{display:grid;grid-template-columns:minmax(0,1fr)}.hxl-b{white-space:normal;text-align:center;line-height:1.3;padding:10px 18px}
.hxl-ph{aspect-ratio:4/3;border-radius:22px}.hxl-up{margin:-48px 12px 0;max-width:none;padding:14px 14px 6px}.hxl-bd{top:12px;left:12px}.hxl-bd li{font-size:13px;padding:7px 10px}
.hpt.hxl-find,.hpt.hxl-track,.hpt.hxl-elig{padding:64px 0}.hxl-ch{flex-wrap:nowrap;overflow-x:auto;margin:0 -20px 20px;padding:2px 20px 6px;scrollbar-width:none}.hxl-ch label{flex:none}
.hxl-cg{grid-template-columns:minmax(0,1fr);gap:14px}.hxl-cc a{display:grid;grid-template-columns:104px minmax(0,1fr)}.hxl-cph{aspect-ratio:auto;height:100%;min-height:100%}.hxl-cb{padding:16px 16px 14px;gap:8px}.hxl-cb h3{font-size:17px}.hxl-cm div{font-size:14px}.hxl-cm dt{width:auto}.hxl-cm dt span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.hxl-cf b{font-size:16px}
.hxl-ek{padding:20px;border-radius:20px}.hxl-tm{grid-template-columns:minmax(0,1fr)}.hxl-tm li{padding:18px}.hxl-tq{padding:16px}}` + cssA4(s, T, R, pb, onP); }

  /* ── A4 2종 CSS: 훈련 일정표(trainboard) · 동네 배움터(learnhub) · 비교표 · 분야 ── */
  function cssA4(s, T, R, pb, onP) { const ink = '#111A18', ln = 'rgba(17,26,24,.1)', sh = '0 1px 2px rgba(16,24,22,.05),0 22px 48px -30px rgba(16,40,34,.38),0 0 0 1px ' + ln;
    const hb = CR(R[700], '#ffffff') >= 7.5 ? R[700] : fit(R[700], '#ffffff', 7.5, '#000000'); const hMu = fit(mix('#ffffff', hb, .22), hb, 6.5, '#ffffff'); const hA = fit(R[200], hb, 6, '#ffffff');
    const warnT = fit(WARN, '#ffffff', 4.6); const cream = mix(R[50], '#FBF7F1', .6); const lhA = fit(T.a, cream, 7, '#000000'); const pb7 = fit(T.a, '#ffffff', 7, '#000000'); const deep = mix(R[900], '#06110F', .35);
    const senior = s && s.theme === 'learnhub';
    return `
/* v43.8 hpx-life A4 — 훈련 일정표 */
.hpt.hxl-tbh{padding-bottom:150px!important;background:${hb};background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:56px 56px;color:#fff;padding:56px 0 64px;position:relative;overflow:hidden}
.hxl-tbg{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);grid-template-areas:"a c" "q c";gap:0 48px;align-items:start}.hxl-tbl0{grid-area:a}.hxl-tbg>.hxl-ck{grid-area:c}.hxl-tbg>.hxl-qk{grid-area:q}
.hpt.hxl-tbh h1{margin:0;max-width:none;text-shadow:none;font-size:clamp(34px,4vw,52px);line-height:1.18;font-weight:800;letter-spacing:-.035em;color:#fff;word-break:keep-all}.hxl-tbh .hxl-sub{color:${hMu}}
.hxl-ey3{display:inline-flex;align-items:center;gap:8px;margin:0 0 18px;padding:8px 14px;border-radius:999px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.24);font-size:14px;font-weight:750;color:${hA}}
.hxl-tbh .hxl-tbl0>.hxl-ab{margin-top:26px}
.hxl-b.w{background:#fff;color:${ink}}.hxl-b.w:hover{background:${R[50]}}.hxl-b.ow{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}.hxl-b.ow:hover{background:rgba(255,255,255,.1)}
.hxl-qk{margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,.16)}.hxl-qk p{margin:0 0 10px;font-size:14px;font-weight:750;color:${hMu}}
.hxl-qk ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}.hxl-qk a{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;font-size:15px;font-weight:650;text-decoration:none;white-space:nowrap}.hxl-qk a:hover{background:rgba(255,255,255,.16)}.hxl-qk svg{color:${hA}}
.hxl-tbh a:focus-visible,.hxl-tbh label:focus-visible{outline:3px solid #fff;outline-offset:3px}
.hxl-ck{background:#fff;color:${ink};border-radius:24px;padding:24px;box-shadow:0 30px 60px -30px rgba(0,0,0,.55)}
.hxl-ckh{display:flex;align-items:center;gap:10px;margin:0 0 6px;font-size:18px;font-weight:800;letter-spacing:-.02em}.hxl-ckh svg{color:var(--lf-at)}
.hxl-cq{list-style:none;margin:0;padding:0}.hxl-cq li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid ${ln}}
.hxl-cq p{margin:0;display:flex;gap:10px;align-items:flex-start;font-size:15.5px;line-height:1.5;font-weight:600;word-break:keep-all}.hxl-cq p i{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:${R[50]};color:var(--lf-att);font-style:normal;font-size:13px;font-weight:800}
.hxl-yn{display:flex;gap:4px;padding:4px;border-radius:12px;background:#F1F4F3}.hxl-yn label{display:flex;align-items:center;justify-content:center;min-width:64px;min-height:44px;padding:0 12px;border-radius:9px;font-size:15px;font-weight:750;color:var(--lf-mu);cursor:pointer;white-space:nowrap}
.hxl-yn input[id$=n]:checked+label{color:${warnT}}
.hxl-cr{display:none;margin-top:14px;padding:16px;border-radius:16px;background:${R[50]}}.hxl-cr.r0{display:block;background:#F4F6F5}.hxl-cr.r0 p{margin:0;font-size:15px;color:var(--lf-mu)}.hxl-cr.no{background:${al(WARN, .08)}}
.hxl-crh{display:flex;gap:8px;align-items:flex-start;margin:0;font-size:16.5px;font-weight:800;line-height:1.45;word-break:keep-all}.hxl-crh svg{flex:none;margin-top:2px;color:var(--lf-at)}.hxl-cr.no .hxl-crh svg{color:${warnT}}.hxl-cr .hxl-ab{margin-top:12px}
.hxl-ck:has(.hxl-yn input[id$=n]:checked) .r0,.hxl-ck:has(#hxlq0y:checked):has(#hxlq1y:checked):has(#hxlq2y:checked) .r0{display:none}
.hxl-ck:has(.hxl-yn input[id$=n]:checked) .no,.hxl-ck:has(#hxlq0y:checked):has(#hxlq1y:checked):has(#hxlq2y:checked) .ok{display:block}
.hxl-cn{margin:14px 0 0;font-size:13.5px;line-height:1.55;color:var(--lf-mu)}
.hxl-cs{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px;counter-reset:c}.hxl-cs li{display:grid;gap:2px;padding:12px 0;border-top:1px solid ${ln}}.hxl-cs b{font-size:16px}.hxl-cs small{font-size:14px;color:var(--lf-mu)}
.hpt.hp-s.hxl-bds{background:transparent;padding:0 0 72px;margin-top:-110px;position:relative;z-index:2}.hxl-tbb{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:stretch}
.hxl-tph{position:relative;margin:0;border-radius:24px;overflow:hidden;min-height:220px}.hxl-tph img{position:absolute;inset:0;width:100%;height:100%;display:block}
.hxl-gx{background:#fff;color:${ink};border-radius:24px;padding:20px 24px 10px;box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
.hxl-gxh{display:flex;justify-content:space-between;align-items:center;gap:8px 16px;flex-wrap:wrap;margin-bottom:8px}.hxl-gxh .hxl-uph{margin:0}
.hxl-glg{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0;font-size:13px;font-weight:600;color:var(--lf-mu)}.hxl-glg span{display:inline-flex;align-items:center;gap:6px}.hxl-glg i{display:inline-block;width:14px;height:8px;border-radius:3px}.hxl-glg .p{background:${pb}}.hxl-glg .r{background:${R[200]}}.hxl-glg .t{width:2px;height:14px;border-radius:1px;background:${ink}}
.hxl-gh,.hxl-gl a{display:grid;grid-template-columns:minmax(0,250px) minmax(0,1fr) 84px;gap:18px;align-items:center}
.hxl-gm{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr))}.hxl-gm span{padding:6px 0 6px 7px;border-left:1px solid ${ln};font-size:13px;font-weight:750;color:var(--lf-mu);white-space:nowrap}.hxl-gm small{font-size:13px;font-weight:600;margin-right:4px}
.hxl-gl{list-style:none;margin:0;padding:0}.hxl-gl li{border-top:1px solid ${ln}}
.hxl-gl a{min-height:68px;padding:10px 0;text-decoration:none;color:inherit}.hxl-gl a:hover .hxl-gn b{color:var(--lf-at)}
.hxl-gn{display:grid;gap:3px;min-width:0}.hxl-gn b{font-size:16px;font-weight:750;letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hxl-gn small{font-size:13.5px;color:var(--lf-mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hxl-gt{position:relative;display:block;height:28px;border-radius:8px;background:linear-gradient(90deg,${ln} 1px,transparent 1px) 0 0/calc(100% / var(--n)) 100%,#F3F5F4}
.hxl-gb{position:absolute;top:7px;bottom:7px;border-radius:7px;background:${R[200]};overflow:hidden}.hxl-gb.up{background:#fff;box-shadow:inset 0 0 0 2px ${pb}}.hxl-gp{position:absolute;left:0;top:0;bottom:0;background:${pb}}
.hxl-gtd{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:${ink};border-radius:1px;z-index:1}
.hxl-gl em{justify-self:end}
/* 과정 비교표 */
.hpt.hxl-tbl{padding:104px 0;background:${R[50]}}
.hxl-tb{background:#fff;border-radius:22px;overflow:hidden;box-shadow:${sh}}
.hxl-tr{display:grid;grid-template-columns:minmax(0,2.3fr) minmax(0,1.2fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,.8fr) 24px;gap:18px;align-items:center;min-height:80px;padding:16px 24px;border-top:1px solid ${ln};text-decoration:none;color:inherit}
.hxl-thd{min-height:0;padding:14px 24px;border-top:0;background:#F4F6F5;font-size:13.5px;font-weight:750;color:var(--lf-mu)}
a.hxl-tr:hover{background:${R[50]}}a.hxl-tr:hover .c0>b{color:var(--lf-at)}a.hxl-tr:focus-visible{outline:3px solid ${al(T.a, .45)};outline-offset:-3px}
.hxl-tr [role=cell]{display:grid;gap:3px;font-size:15px;font-weight:600;line-height:1.45;min-width:0}.hxl-tr [role=cell] small{font-size:13.5px;font-weight:500;color:var(--lf-mu)}
.hxl-tr .c0{gap:8px}.hxl-tr .c0>b{font-size:17px;font-weight:750;letter-spacing:-.02em;word-break:keep-all}.hxl-tr .c0 .hxl-tg{min-height:0;align-items:center}.hxl-tr .c0 .hxl-tg em{padding:4px 9px}
.hxl-tr .pr{font-size:16px;font-weight:800}.hxl-ce{display:inline-flex;align-items:center;gap:5px;color:var(--lf-att);font-weight:700}.hxl-ta{display:flex;color:var(--lf-mu)}a.hxl-tr:hover .hxl-ta{color:var(--lf-at)}
.hxl-tbf{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-top:22px}.hxl-tbf p{margin:0;font-size:14.5px;color:var(--lf-mu)}.hxl-tbf .hxl-b.o{background:#fff;box-shadow:0 0 0 1px ${ln}}
/* 동네 배움터 */
.hpt.hxl-lhh{background:${cream};padding:56px 0 72px;--lf-mu:#3A433F;--lf-at:${lhA};--lf-att:${lhA};--lf-p:${pb7};--lf-on:${on(pb7)}}
.hxl-lg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:52px;align-items:center}
.hpt.hxl-lhh h1{margin:0;max-width:none;text-shadow:none;font-size:clamp(34px,4.2vw,56px);line-height:1.18;font-weight:800;letter-spacing:-.035em;color:${ink};word-break:keep-all}.hxl-lhh .hxl-sub{font-size:19px;color:var(--lf-mu)}
.hxl-lhh .hxl-ll>.hxl-ab{margin-top:28px}.hxl-lhh .hxl-b{min-height:56px;font-size:17px;padding:0 26px;border-radius:14px}
.hxl-me{margin:18px 0 0}.hxl-me a{display:inline-flex;align-items:center;gap:8px;min-height:48px;font-size:17px;font-weight:700;color:var(--lf-at);text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:1.5px}
.hxl-mo{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);grid-template-rows:1fr 1fr;gap:14px;height:460px}.hxl-mo figure,.hxl-mo>div{margin:0;border-radius:24px;overflow:hidden;min-height:0}.hxl-mo img{width:100%;height:100%;display:block}.hxl-m0{grid-row:1/3}
.hxl-day{margin-top:44px;background:#fff;border-radius:28px;padding:28px 32px;box-shadow:${sh}}
.hxl-dh{display:flex;align-items:baseline;gap:6px 18px;flex-wrap:wrap;margin-bottom:18px}.hxl-dh h2{display:flex;align-items:center;gap:10px;margin:0;font-size:26px;font-weight:800;letter-spacing:-.025em}.hxl-dh h2 svg{color:var(--lf-at)}.hxl-dh p{margin:0;font-size:17px;color:var(--lf-mu)}
.hxl-dch{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px}.hxl-dch label{display:flex;align-items:center;justify-content:center;min-height:56px;border-radius:14px;background:#F3F1EC;color:${ink};font-size:18px;font-weight:800;cursor:pointer}.hxl-dch label.z{color:#5E6360;font-weight:650}
.hxl-dch .hxl-r:checked+label{background:var(--lf-p);color:var(--lf-on);box-shadow:none}.hxl-dch .hxl-r:focus-visible+label{outline:3px solid ${al(T.a, .5)};outline-offset:2px}
.hxl-dp{display:none;margin-top:18px}.hxl-day:has(#hxld-a:checked) .pa,${DORD.map(k => `.hxl-day:has(#hxld${k}:checked) .p${k}`).join(',')}{display:block}
.hxl-dc{margin:0 0 10px;font-size:16px;color:var(--lf-mu)}.hxl-dc b{color:${ink}}
.hxl-dl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hxl-dl a{display:flex;align-items:center;gap:16px;min-height:80px;padding:14px 18px;border-radius:16px;background:${cream};text-decoration:none;color:inherit}.hxl-dl a:hover{box-shadow:inset 0 0 0 2px var(--lf-at)}.hxl-dl a>svg{flex:none;color:var(--lf-at)}
.hxl-dt{flex:none;display:grid;gap:2px;min-width:76px}.hxl-dt b{font-size:21px;font-weight:800;letter-spacing:-.02em;color:var(--lf-at)}.hxl-dt small{font-size:14px;font-weight:700;color:var(--lf-mu)}
.hxl-dn{flex:1;min-width:0;display:grid;gap:3px}.hxl-dn b{font-size:18px;font-weight:750;letter-spacing:-.02em;word-break:keep-all}.hxl-dn small{font-size:15px;color:var(--lf-mu)}
.hxl-de{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;flex-wrap:wrap;padding:18px 20px;border-radius:16px;background:${cream}}.hxl-de p{margin:0;font-size:17px;line-height:1.55;color:var(--lf-mu);word-break:keep-all}
.hxl-dr{margin:14px 0 0;font-size:16px;color:var(--lf-mu)}.hxl-dr a{display:inline-flex;align-items:center;min-height:44px;padding:0 4px;color:var(--lf-at);font-weight:750}
.hxl-lhh a:focus-visible{outline:3px solid ${al(T.a, .5)};outline-offset:3px}
/* 분야로 둘러보기 */
.hpt.hxl-cat{padding:104px 0;background:#fff}
.hxl-cl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.hxl-cl a{display:flex;align-items:center;gap:16px;height:100%;min-height:108px;padding:20px 22px;border-radius:20px;background:#fff;box-shadow:${sh};text-decoration:none;color:inherit;transition:transform .2s}.hxl-cl a:hover{transform:translateY(-2px)}
.hxl-ci{flex:none;display:grid;place-items:center;width:56px;height:56px;border-radius:16px;background:${R[50]};color:var(--lf-att)}
.hxl-cx{flex:1;min-width:0;display:grid;gap:4px}.hxl-cx b{font-size:19px;font-weight:800;letter-spacing:-.02em}.hxl-cx small{font-size:15px;line-height:1.45;color:var(--lf-mu);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all}
.hxl-cl em{flex:none;font-style:normal;font-size:16px;font-weight:800;color:var(--lf-att);padding:8px 12px;border-radius:999px;background:${R[50]}}
.hxl-cl .all a{background:var(--lf-p);color:var(--lf-on);box-shadow:none}.hxl-cl .all .hxl-ci,.hxl-cl .all em{background:rgba(255,255,255,.16);color:inherit}.hxl-cl .all small{color:inherit}
.hxl-cat a:focus-visible{outline:3px solid ${al(T.a, .5)};outline-offset:3px}
${senior ? `/* 시니어 친화(learnhub): 본문 17px · 버튼 56px · 대비 7:1 */
.hxl-cat,.hxl-elig,.hxl-track{--lf-mu:#3A433F;--lf-at:${fit(T.a, '#ffffff', 7, '#000000')};--lf-att:${fit(T.a, R[50], 7, '#000000')};--lf-p:${pb7};--lf-on:${on(pb7)}}
.hxl-cat,.hxl-elig,.hxl-track{font-size:17px}.hxl-elig .hxl-b,.hxl-track .hxl-b,.hxl-cat .hxl-b{min-height:56px;font-size:17px}.hxl-ec li,.hxl-steps small,.hxl-tm small,.hxl-tq small,.hxl-en{font-size:17px}.hxl-tq b,.hxl-steps b,.hxl-tm b{font-size:19px}
.hxl-ed,.hxl-steps small{color:${fit('#C9D4D0', deep, 7, '#ffffff')}}` : ''}
@media (max-width:1000px){.hxl-tbg,.hxl-lg{grid-template-columns:minmax(0,1fr);gap:32px}.hxl-tbg{grid-template-areas:"a" "c" "q";gap:24px}.hxl-tbg>.hxl-qk{margin-top:0}.hpt.hxl-tbh{padding-bottom:48px!important}.hpt.hp-s.hxl-bds{margin-top:0;padding:40px 0 8px}.hxl-tbb{grid-template-columns:minmax(0,1fr)}.hxl-tph{min-height:0;aspect-ratio:16/7}.hxl-mo{height:380px}.hxl-cl{grid-template-columns:repeat(2,minmax(0,1fr))}
.hxl-tr{grid-template-columns:minmax(0,2fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) 24px}.hxl-tr>:nth-child(5){display:none}}
@media (max-width:640px){.hpt.hxl-tbh{padding:28px 0 44px}.hxl-qk ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.hxl-qk a{width:100%;white-space:normal;line-height:1.3;padding:8px 12px}
.hxl-ck{padding:18px;border-radius:20px}.hxl-cq li{grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:10px 0}.hxl-cq p{font-size:15px}.hxl-cq p i{display:none}.hxl-yn label{min-width:48px;padding:0 8px}.hxl-cn{margin-top:10px}.hxl-tbh .hxl-ey3{display:none}.hxl-tph{display:none}.hpt.hxl-tbh .hxl-sub{display:none}
.hxl-gx{padding:16px 16px 6px;border-radius:20px}.hxl-gh{grid-template-columns:minmax(0,1fr)}.hxl-gh>span:not(.hxl-gm){display:none}.hxl-gm small{display:none}
.hxl-gl a{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"n c" "t t";gap:10px 12px;padding:14px 0}.hxl-gn{grid-area:n}.hxl-gt{grid-area:t}.hxl-gl em{grid-area:c;align-self:start}.hxl-gn small{white-space:normal}
.hpt.hxl-tbl,.hpt.hxl-cat{padding:64px 0}.hxl-thd{display:none!important}.hxl-tb{display:grid;gap:12px;background:none;box-shadow:none;border-radius:0;overflow:visible}
.hxl-tr,.hxl-tr>:nth-child(5){display:grid}.hxl-tr{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:18px;border:0;border-radius:18px;background:#fff;box-shadow:${sh}}.hxl-tr .c0{grid-column:1/-1}.hxl-tr [data-l]::before{content:attr(data-l);font-size:13px;font-weight:700;color:var(--lf-mu)}.hxl-ta{display:none!important}
.hxl-tbf{display:grid;gap:14px}.hpt.hxl-lhh{padding:28px 0 48px}.hxl-lhh .hxl-sub{font-size:17px}.hxl-mo{height:auto;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto auto;gap:10px}.hxl-mo figure,.hxl-mo>div{border-radius:18px}.hxl-m0{grid-row:auto;grid-column:1/-1;aspect-ratio:16/10}.hxl-m1,.hxl-m2{aspect-ratio:4/3}
.hxl-day{margin-top:28px;padding:20px 16px;border-radius:22px}.hxl-dh h2{font-size:22px}.hxl-dh p{font-size:16px}.hxl-dch{grid-template-columns:repeat(4,minmax(0,1fr))}.hxl-dl{grid-template-columns:minmax(0,1fr)}.hxl-dl a{padding:14px;gap:12px}.hxl-dt{min-width:64px}.hxl-dt b{font-size:19px}.hxl-dn b{font-size:17px}
.hxl-cl{grid-template-columns:minmax(0,1fr);gap:12px}.hxl-cl a{min-height:92px;padding:16px}}`; }

  /* ── 렌더러 설치(PASS와 무관) ── */
  const HKID = 'careernav'; const HKS = { careernav: hero, trainboard: heroTB, learnhub: heroLH };
  { const hk0 = HS.heroKind; if (typeof hk0 === 'function') HS.heroKind = (s, d) => { d = d || {}; if (HKS[d.hk]) return d.hk; if (!d.hk && !d.hero) { const m = s && s.theme && HPT.meta(s.theme); if (m && HKS[m.hk]) return m.hk; } return hk0(s, d); }; }
  { const h0 = HS.hero; if (typeof h0 === 'function') HS.hero = (kind, s, d, th, T) => { try { const k = kind || (typeof HS.heroKind === 'function' ? HS.heroKind(s, d || {}) : ''); if (HKS[k] && s) return HKS[k](s, d || {}); } catch (e) { console.error('hpx-life hero', e); } return h0(kind, s, d, th, T); }; }
  { const base = proSec; proSec = (x, i, s, lk) => { const d = x && x.data; const k = d && x.type === 'text' && SEC[d.hpt];
    if (!k || !s) return base(x, i, s, lk); if (x.hide && !editing()) return '';
    let h = ''; try { h = k[0](s, d); } catch (e) { console.error('hpx-life', e); return base(x, i, s, lk); } if (!h) return editing() ? base(x, i, s, lk) : '';
    let out = `<section class="hpt hp-s ${k[1]}">${h}</section>`; const m = editing() ? HPE.map.get(x) : null; if (m) out = out.replace(/<section\b/, `<section data-hpe="${E(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`); return out; }; window.proSec = proSec; }
  const uses = s => !!s && ((s.theme && HKS[(HPT.meta(s.theme) || {}).hk]) || (s.sections || []).some(x => x && ((x.type === 'text' && x.data && SEC[x.data.hpt]) || (x.type === 'banner' && x.data && HKS[x.data.hk]))));
  { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang); if (!uses(s) || !HPT.tokens(s)) return h; try { return h.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); } catch (e) { console.error('hpx-life css', e); return h; } }; window.siteHTML = siteHTML; }

  /* ── 테마 · 글자 토큰 · 템플릿 ── */
  const DEF = {
    careernav: { name: '커리어 내비', desc: '「어떤 분이세요?」로 시작하는 첫 화면 · 국비 자격 · 과정 비교 · 훈련생 바로가기까지', tags: ['voc', 'lifelong'], tone: 'light', dens: '보통',
      acc: '#0F6E66', bg: '#FFFFFF', alt: '#F3F7F6', ink: '#111A18', mu: '#4B5753', r: 20, br: 12, hero: 'split', vis: 'mock', illu: 'book', card: 'shadow', look: 'mintSoft', sw2: '#E6F2EF', base: 'clean', hk: HKID, hp: 'persona', ck: 'photo',
      sh: '0 1px 2px rgba(16,24,22,.05),0 18px 40px -30px rgba(16,40,34,.4)' },
    trainboard: { name: '훈련 일정표', desc: '기관 색 짙은 첫 화면에 개강 일정표 · 국비 자격 3문항 · 기간 · 시간 · 비용 비교표', tags: ['voc'], tone: 'light', dens: '조밀',
      acc: '#2357C6', bg: '#FFFFFF', alt: '#F3F6FC', ink: '#111A18', mu: '#4B5753', r: 22, br: 12, hero: 'split', vis: 'mock', illu: 'book', card: 'shadow', look: 'corpPortal', sw2: '#E7EEFB', base: 'clean', hk: 'trainboard', hp: 'schedule', ck: 'table',
      sh: '0 1px 2px rgba(16,24,22,.05),0 22px 48px -30px rgba(16,40,34,.38)' },
    learnhub: { name: '동네 배움터', desc: '사진 3장 첫 화면 · 요일로 찾기 · 큰 글자와 큰 버튼(시니어 친화)', tags: ['lifelong'], tone: 'light', dens: '여유',
      acc: '#B4532A', bg: '#FFFFFF', alt: '#FBF7F1', ink: '#111A18', mu: '#3A433F', r: 24, br: 14, hero: 'split', vis: 'mock', illu: 'book', card: 'shadow', look: 'mintSoft', sw2: '#F6E9E1', base: 'clean', hk: 'learnhub', hp: 'weekday', ck: 'tile',
      sh: '0 1px 2px rgba(16,24,22,.05),0 22px 48px -30px rgba(16,40,34,.38)' } };
  const HD = { careernav: { hf: 'sans', hw: 800, hls: -0.035, h1: 54, h1m: 34, lh1: 1.16, h2: 40, h2m: 28, h3: 19, body: 16, blh: 1.7, lead: 18, ey: { fs: 14, ls: 0.01, fw: 750, tt: 'none' }, sec: 104, secm: 64, w: 1240, gut: 40,
    r: 20, rs: 12, br: 12, bh: 50, bpx: 22, bfw: 700, bls: -0.01, bd: '0', sh: '0 0 0 1px rgba(17,26,24,.08)', shh: '0 24px 44px -24px rgba(16,40,34,.36)', hov: 'lift', em: 'accent', link: 'hover' } };
  HD.trainboard = Object.assign({}, HD.careernav, { h1: 52, h2: 40, r: 22, sec: 104 });
  HD.learnhub = Object.assign({}, HD.careernav, { h1: 56, h1m: 34, h2: 40, h3: 20, body: 17, blh: 1.75, lead: 19, r: 24, rs: 14, br: 14, bh: 56, bpx: 26 });
  function cssX(s, th, T) { const R = ramp(T.a); return `\n/* v43.8 ${s.theme} */.hpt{${Object.keys(R).map(k => `--p${k}:${R[k]}`).join(';')};--warn:${WARN};--on-a:${on(T.a)}}`; }
  const TX = (variant, data) => S2('text', { variant, ...data });
  const TPLS = {
    careernav: { scene: '직업훈련 · 평생교육 — 구직자 · 재직자 · 훈련생이 첫 화면에서 자기 할 일을 고른다', purpose: ['apply', 'learn'],
      build: () => { const v = isVoc(); return [
        S2('banner', { eyebrow: v ? '훈련생 모집 중' : '수강생 모집 중', title: v ? `배우고, 자격을 따고,\n일자리까지 이어가요` : `배우고 싶은 것을\n가까운 곳에서 시작해요`, sub: v ? `${org()}에서 국비 · 재직자 과정을 비교하고, 내 상황에 맞는 신청 방법을 바로 확인하세요.` : `${org()}의 과정을 분야 · 기간 · 수강료로 비교하고, 나에게 맞는 배움을 골라 보세요.`, cta: v ? '국비 과정 보기' : '입문 과정 보기', cta2: '수강 상담', hk: HKID }),
        TX('features', { hpt: 'lf-find', eyebrow: '과정 찾기', title: v ? '분야 · 기간 · 비용으로 골라 보세요' : '나에게 맞는 과정을 골라 보세요', sub: v ? '국비 지원 여부와 훈련 기간, 수료증 발급을 한 장에서 비교해요.' : '요일 · 시간 · 수강료를 한 장에서 비교해요.', cols: [['분야', '관심 분야로 과정을 골라요'], ['기간 · 시간', '개강일과 요일 · 시간을 비교해요'], ['비용', v ? '국비 지원 · 수강료를 확인해요' : '수강료를 미리 확인해요']] }),
        TX('steps', { hpt: 'lf-elig', eyebrow: v ? '국민내일배움카드' : '수강 안내', title: v ? '내일배움카드, 이렇게 신청해요' : '수강 신청, 이렇게 해요', sub: v ? '카드를 발급받으면 국비 지원 과정을 신청할 수 있어요.' : '온라인으로 신청하고 바로 강의실에 들어가요.',
          cols: v ? [['고용24에서 카드 신청', '회원가입 후 국민내일배움카드 발급을 신청해요'], ['고용센터 상담 · 발급', '안내에 따라 상담을 마치면 카드가 발급돼요'], ['과정 고르고 수강신청', '이 홈페이지에서 과정을 고르고 신청해요']] : [['과정 고르기', '분야 · 요일 · 수강료를 비교해 골라요'], ['신청 · 결제', '온라인으로 신청하고 결제해요'], ['강의실 입장', '로그인하면 내 강의실에서 바로 시작해요']] }),
        TX('timeline', { hpt: 'lf-track', eyebrow: v ? '훈련 과정' : '수강 과정', title: v ? '신청부터 수료 · 취업 연계까지' : '신청부터 수료증까지', cols: v ? [['신청 · 선발', '과정 신청 후 상담과 선발을 거쳐요'], ['훈련', '출결과 진도가 자동으로 기록돼요'], ['수료', '수료 기준을 채우면 수료증을 받아요'], ['취업 연계', '이력서 · 면접 상담과 채용 소식을 안내해요']] : [['신청', '과정을 고르고 온라인으로 신청해요'], ['수강', 'PC · 휴대폰으로 이어서 들어요'], ['수료', '수료 기준을 채우면 수료증을 받아요'], ['다음 배움', '이어서 들을 과정을 추천해 드려요']] }),
        TX('stats', { hpt: 'facts', title: '', cols: [] }),
        S2('notices', { eyebrow: '', title: v ? '훈련 소식 · 공지' : '공지사항', n: 4 }),
        TX('cta', { eyebrow: '', title: v ? '내게 맞는 과정, 상담으로 함께 찾아요' : '어떤 과정이 맞을지 고민되시나요?', body: v ? '구직 · 재직 상황을 알려 주시면 신청 가능한 과정과 일정을 안내해 드려요.' : '배우고 싶은 것을 알려 주시면 맞는 과정을 안내해 드려요. 휴대폰 번호는 동의한 경우에만 받아요.', cta: '상담 신청', cols: [], ck: 'contact' })]; } },
    trainboard: { scene: '직업훈련 — 개강 일정표와 국비 자격 3문항으로 「언제 · 내가 들을 수 있나」를 첫 화면에서 푼다', purpose: ['apply', 'learn'],
      build: () => { const v = isVoc(); return [
        S2('banner', { eyebrow: v ? '훈련생 모집 · 개강 일정' : '수강생 모집 · 개강 일정', title: v ? '개강 일정부터 보고\n내게 맞는 훈련을 골라요' : '개강 일정부터 보고\n내게 맞는 과정을 골라요', sub: v ? `${org()}의 훈련 과정을 기간 · 시간 · 비용으로 비교하고, 국비 자격도 바로 확인하세요.` : `${org()}의 과정을 기간 · 시간 · 수강료로 비교해 보세요.`, cta: v ? '국비 과정 보기' : '과정 보기', cta2: '수강 상담', hk: 'trainboard' }),
        TX('timeline', { hpt: 'lf-board', eyebrow: '', title: v ? '개강 · 훈련 일정표' : '개강 · 수업 일정표', cols: [['개강', '과정별 시작일'], ['진행', '지난 기간 · 남은 기간'], ['오늘', '오늘 날짜 표시']] }),
        TX('features', { hpt: 'lf-table', eyebrow: '과정 비교표', title: '기간 · 시간 · 비용을 한 줄로 비교해요', sub: '수료증 발급 여부까지 표 한 장에서 확인하고, 줄을 누르면 과정 상세로 이동해요.', cols: [['과정', '과정 이름과 수준'], ['기간 · 시간', '개강일 · 요일 · 총 시간'], ['비용 · 수료', v ? '국비 지원 · 수강료와 수료증' : '수강료와 수료증']] }),
        TX('timeline', { hpt: 'lf-track', eyebrow: v ? '훈련 과정' : '수강 과정', title: v ? '신청부터 수료 · 취업 연계까지' : '신청부터 수료증까지', cols: v ? [['신청 · 선발', '과정 신청 후 상담과 선발을 거쳐요'], ['훈련', '출결과 진도가 자동으로 기록돼요'], ['수료', '수료 기준을 채우면 수료증을 받아요'], ['취업 연계', '이력서 · 면접 상담과 채용 소식을 안내해요']] : [['신청', '과정을 고르고 온라인으로 신청해요'], ['수강', 'PC · 휴대폰으로 이어서 들어요'], ['수료', '수료 기준을 채우면 수료증을 받아요'], ['다음 배움', '이어서 들을 과정을 추천해 드려요']] }),
        TX('stats', { hpt: 'facts', title: '', cols: [] }),
        S2('notices', { eyebrow: '', title: v ? '훈련 소식 · 공지' : '공지사항', n: 4 }),
        TX('cta', { eyebrow: '', title: v ? '일정이 맞는 과정, 상담으로 함께 찾아요' : '일정이 맞는 과정, 상담으로 함께 찾아요', body: v ? '구직 · 재직 상황과 가능한 요일을 알려 주시면 신청할 수 있는 과정을 안내해 드려요.' : '가능한 요일을 알려 주시면 맞는 과정을 안내해 드려요.', cta: '상담 신청', cols: [], ck: 'contact' })]; } },
    learnhub: { scene: '평생교육 — 사진 3장과 「요일로 찾기」로 가까운 요일의 수업을 고르고, 큰 글자 · 큰 버튼으로 시니어도 편하게', purpose: ['apply', 'learn'],
      build: () => { const v = isVoc(); return [
        S2('banner', { eyebrow: '수강생 모집 중', title: '요일만 고르면\n들을 수업이 보여요', sub: `${org()}에서 다니기 편한 요일 · 시간의 수업을 고르고, 궁금한 건 편하게 물어보세요.`, cta: '전체 수업 보기', cta2: '수강 상담', hk: 'learnhub' }),
        TX('features', { hpt: 'lf-cat', eyebrow: '분야로 둘러보기', title: '관심 있는 분야부터 골라 보세요', sub: '분야마다 수업 수와 대표 수업을 먼저 보여 드려요.', cols: [['입문', '처음 배우는 분을 위한 수업'], ['자격증', '자격 준비 수업'], ['생활 · 교양', '생활에 바로 쓰는 수업']] }),
        TX('steps', { hpt: 'lf-elig', eyebrow: '수강 안내', title: '수강 신청, 이렇게 해요', sub: '온라인으로 신청하고 바로 강의실에 들어가요. 어려우면 전화로 도와 드려요.', cols: [['수업 고르기', '요일 · 시간 · 수강료를 비교해 골라요'], ['신청 · 결제', '온라인으로 신청하고 결제해요'], ['강의실 입장', '로그인하면 내 강의실에서 바로 시작해요']] }),
        TX('timeline', { hpt: 'lf-track', eyebrow: '수강 과정', title: '신청부터 수료증까지', cols: [['신청', '수업을 고르고 온라인으로 신청해요'], ['수강', 'PC · 휴대폰으로 이어서 들어요'], ['수료', '수료 기준을 채우면 수료증을 받아요'], ['다음 배움', '이어서 들을 수업을 추천해 드려요']] }),
        S2('notices', { eyebrow: '', title: '공지사항', n: 4 }),
        TX('cta', { eyebrow: '', title: '어떤 수업이 맞을지 고민되시나요?', body: '배우고 싶은 것과 편한 요일을 알려 주시면 맞는 수업을 안내해 드려요. 휴대폰 번호는 동의한 경우에만 받아요.', cta: '상담 신청', cols: [], ck: 'contact' })]; } } };

  /* 첫 화면 사진: 사람 · 실습 장면(어두운 실루엣 · 무관한 장면 대신). 템플릿마다 다른 사진(첫 화면 중복 금지) */
  const PH = { careernav: [{ hero: 'cls-03' }, { hero: 'stu-02' }], trainboard: [{ hero: 'hum-41' }, { hero: 'hum-08' }], learnhub: [{ hero: 'wrk-08', about: 'hum-18', space: 'cor-09' }, { hero: 'sen-07', about: 'hum-24', space: 'cls-02' }] };
  if (typeof siteFromTpl === 'function' && !siteFromTpl.hpxl) { const base = siteFromTpl; const f = tp => { const s = base(tp); try { if (tp && tp.hpx === 'life') { s.photos = Object.assign({}, s.photos, (PH[tp.theme] || PH.careernav)[isVoc() ? 0 : 1]); s.blocks = Object.assign({}, s.blocks, { facts: 'row', notices: 'rows' }); } /* 심사: 숫자 판은 가로 띠 하나로(큰 숫자 판 · 끊긴 세로선 대신), 공지는 같은 글 반복 없는 목록형 */ } catch (e) { console.error('hpx-life photo', e); } return s; };
    Object.keys(base).forEach(k => { try { f[k] = base[k]; } catch (e) { } }); f.hpxl = 1; siteFromTpl = f; window.siteFromTpl = f; }
  function regAll() { if (regAll.done) return; regAll.done = 1;
    Object.keys(DEF).forEach(id => { if (!(window.HPX_ALL || (PASS[id] || 0) >= 85)) return; if (!HPT.has(id)) HPT.reg(id, Object.assign({ prem: 1, cssX }, DEF[id])); try { if (window.HPD && typeof HPD.reg === 'function') HPD.reg(id, HD[id]); } catch (e) { console.error('hpx-life HPD', e); }
      if (typeof TPL === 'undefined' || typeof S2 !== 'function' || TPL.some(t => t.id === 'prem-' + id)) return; const c = TPLS[id];
      TPL.push({ id: 'prem-' + id, name: DEF[id].name, types: ['prem', ...DEF[id].tags], scene: c.scene, color: DEF[id].acc, tone: '모던', look: DEF[id].look, theme: id, hero: '', purpose: c.purpose, prem: 1, hpx: 'life', build: c.build }); }); }
  regAll();
  /* 프리미엄 묶음 순서 · 유형 맞춤 · 미리보기: hpprem의 표(DEF)는 이 파일 id를 모르므로 감싸서 더한다 */
  const MY = id => !!DEF[id] && HPT.has(id);
  const tyK = () => { try { return S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type; } catch (e) { return ''; } };
  if (typeof HPT.premFits === 'function' && !HPT.premFits.hpxl) { const f0 = HPT.premFits; HPT.premFits = (id, t) => MY(id) ? DEF[id].tags.includes(t || tyK()) : f0(id, t); HPT.premFits.hpxl = 1; }
  if (typeof HPT.premFor === 'function' && !HPT.premFor.hpxl) { const f0 = HPT.premFor; HPT.premFor = t => { t = t || tyK(); const L = f0(t); const M = Object.keys(DEF).filter(MY); return [...M.filter(id => DEF[id].tags.includes(t)), ...L, ...M.filter(id => !DEF[id].tags.includes(t))]; }; HPT.premFor.hpxl = 1; }
  if (typeof HPT.thumb === 'function' && !HPT.thumb.hpxl) { const tb = HPT.thumb; HPT.thumb = (s, id) => { if (!MY(id) || typeof siteHTML !== 'function') return tb(s, id);
    try { const b = JSON.parse(JSON.stringify(s || (typeof site === 'function' ? site() : S.site))); HPT.apply(b, id, { keepColor: true }); delete b.layout; const tp = typeof TPL !== 'undefined' && TPL.find(t => t.id === 'prem-' + id); if (tp) b.sections = tp.build(); return siteHTML(b, false, 'ko'); } catch (e) { console.error('hpx-life thumb', e); return tb(s, id); } }; HPT.thumb.hpxl = 1; }
  /* 공지 자리: 유형 기본 배치(공지를 첫 화면 바로 아래로)를 따르지 않고 상담 띠 바로 앞으로 — 첫 화면 다음은 과정 찾기 */
  if (typeof HPT.enrich === 'function' && !HPT.enrich.hpxl) { const e0 = HPT.enrich; HPT.enrich = s => { const r = e0(s); try { const L = s && s.sections; if (Array.isArray(L) && L.some(x => x && x.type === 'text' && x.data && SEC[x.data.hpt])) { const k = L.findIndex(x => x && x.type === 'notices'); if (k >= 0) { const [n] = L.splice(k, 1); const c = L.findIndex(x => x && x.type === 'text' && x.data && x.data.variant === 'cta'); L.splice(c >= 0 ? c : L.length, 0, n); } } } catch (e) { console.error('hpx-life enrich', e); } return r; }; Object.keys(e0).forEach(k => { try { HPT.enrich[k] = e0[k]; } catch (e) { } }); HPT.enrich.hpxl = 1; }
  /* 심사 · 시안 렌더용: 스크립트가 이미 읽힌 뒤에도 강제 등록할 수 있게 */
  window.HPX_LIFE = { PASS, ids: Object.keys(DEF), reg: () => { regAll.done = 0; regAll(); }, css, personas };
})();
