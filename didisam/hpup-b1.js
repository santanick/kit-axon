/* v43.8 hpup-b1 — 기본 테마 4종(clean · premium · warm · official) 업그레이드(요원 B1 · plan/tpl438/UP-BRIEF.md)
   대표님(2026-11-17): 「26종 모두 82점을 넘기라는 말」 → 기존 기본 템플릿도 82점 이상.
   - 감점 공통(BASELINE): 첫 화면에서 방문자 갈래 없음 · 마감/일정이 안 보임 · 태그 12.5px · N 11px · 휴대폰 강좌 제목 링크 19~21px 높이.
   - 바꾸는 것: ① 첫 화면 바로 아래 「방문 안내 데스크」(기관 유형별 갈래 4개 + 실제 강좌 일정 · D-day) ② 테마별 마감(그림자 · 금빛 선 · 크림 · 관공서 띠)
     ③ 13px · 44px 관문 보정. 내용(섹션 · 문구 · 데이터)은 지우지 않는다. 이미 게시된 사이트도 이 테마면 다음 게시 때 바뀐다(의도된 업그레이드).
   - 사실 원칙: 숫자 · 날짜는 S.classes에서 그릴 때마다 계산한다. 개인 이름 · 번호는 쓰지 않는다(대학은 학번 · 학과 문구만).
   - 링크: 학습자 사이트 실제 경로(#courses · #cal · #my · #badges · #login · #comm · #fac)와 강좌 #p-c-<id>(게시 때 #class/<id>), 전화는 설정된 번호만.
   - hpth · hpprem · hpsec* 는 고치지 않고 siteHTML을 감싸 CSS · 섹션을 덧붙인다. 클래스 접두어 hu1-. */
'use strict';
(() => {
  if (typeof siteHTML !== 'function' || !window.HPT || !HPT.U) return;
  const MINE = ['clean', 'premium', 'warm', 'official'];
  const U = HPT.U; const { mix, fit, CR } = U;
  const WARN = '#C2410C';
  const E = v => (typeof esc === 'function' ? esc(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const tday = () => (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const okD = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''));
  const days = (a, b) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5);
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const md = d => { const x = new Date(String(d).slice(0, 10) + 'T00:00:00'); return `${x.getMonth() + 1}.${String(x.getDate()).padStart(2, '0')}(${WD[x.getDay()]})`; };
  const ty = () => { try { return S.org.type || ''; } catch (e) { return ''; } };
  const term = k => { try { return typeof t === 'function' ? t(k) : '강좌'; } catch (e) { return '강좌'; } };
  const IC = { arrow: 'M5 12h14M13 6l6 6-6 6', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4', cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', award: 'M12 3a6 6 0 100 12 6 6 0 000-12zM8.5 13.5L7 21l5-3 5 3-1.5-7.5', id: 'M3 6h18v12H3zM7 10h4M7 14h6M15 10h2',
    chat: 'M4 5h16v11H9l-5 4z', home: 'M3 11l9-7 9 7v9H3zM9 20v-6h6v6', shield: 'M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6z M9 12l2 2 4-4', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5' };
  const ic = (k, n) => `<svg viewBox="0 0 24 24" width="${n || 22}" height="${n || 22}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[k] || IC.arrow}"/></svg>`;

  /* ── 실제 데이터 ── */
  const live = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => c && c.name && c.status !== '종료' && c.status !== '보관');
  const learners = () => new Set(live().flatMap(c => c.learners || [])).size;
  const won = n => +n > 0 ? `${(+n).toLocaleString('ko-KR')}원` : '무료';
  const timeOf = c => { const D = (c.days || []).map(d => WD[d]).filter(Boolean); const tm = c.time && c.time.from ? `${c.time.from}${c.time.to ? '~' + c.time.to : ''}` : '';
    if (D.length || tm) return [D.length ? D.join('·') : '', tm].filter(Boolean).join(' '); return c.kind === 'sub' ? '구독 · 언제든 수강' : '기간 내 자유 수강'; };
  /* 일정 순서: 곧 시작하는 강좌 → 진행 중(마감 가까운 순) */
  function agenda() { const T = tday(); const L = live().filter(c => okD(c.start) || okD(c.end)).map(c => { const st = okD(c.start) ? days(T, c.start) : null; const en = okD(c.end) ? days(T, c.end) : null;
      const k = st != null && st > 0 ? { o: 0, v: st, tag: `D-${st} 시작`, cls: 'up', d: c.start } : en != null && en >= 0 ? { o: 1, v: en, tag: en <= 14 ? (en === 0 ? '오늘 마감' : `마감 D-${en}`) : '진행 중', cls: en <= 14 ? 'warn' : 'on', d: c.end } : null;
      return k ? { c, ...k } : null; }).filter(Boolean);
    return L.sort((a, b) => a.o - b.o || a.v - b.v).slice(0, 4); }
  const telOf = () => { try { const f = (S.settings && S.settings.footer) || {}; const v = String(f.tel || '').trim(); return /\d{2,}/.test(v) && !/입력/.test(v) ? v : ''; } catch (e) { return ''; } };
  const hasFac = () => { try { return Array.isArray(S.fac) ? S.fac.length > 0 : !!(S.fac && (S.fac.rooms || S.fac.items || []).length); } catch (e) { return false; } };

  /* ── 기관 유형별 갈래(누가 · 무엇을 하러 왔는지) ── */
  function routes() { const n = live().length; const A = agenda(); const up = A.find(x => x.o === 0); const tel = telOf(); const cl = term('cls');
    const ask = tel ? { h: 'tel:' + tel.replace(/[^\d+]/g, ''), d: tel } : { h: '#comm', d: '게시판에 남기면 답해 드려요' };
    const next = up ? `다음 시작 ${md(up.d)}` : A.length ? `${A.length}개 ${cl} 진행 중` : '학습 일정을 한눈에 봐요';
    const cnt = n ? `지금 열린 ${cl} ${n}개` : `${cl} 목록을 확인해요`; const ln = learners();
    const certN = live().filter(c => c.cert && c.cert !== 'none').length;
    const k = ty();
    if (k === 'univ' || k === 'univ_lms') return { t: '재학생 · 교직원 바로가기', q: '필요한 일을 골라 바로 시작하세요', L: [
      ['search', `비교과 · ${cl} 신청`, cnt, '#courses'], ['cal', '학사 · 프로그램 일정', next, '#cal'], ['id', '학번으로 로그인', '학번 · 학과만 확인해요', '#login'], ['award', '이수 · 디지털 배지', certN ? `이수증 발급 ${cl} ${certN}개` : '이수 기록을 확인해요', '#badges']] };
    if (k === 'corp' || k === 'public') { const st = k === 'public' ? '직원' : '임직원'; return { t: `${st} 교육 바로가기`, q: '오늘 해야 할 교육부터 확인하세요', L: [
      ['user', '내 교육 이어 듣기', ln ? `${st} ${ln}명이 수강 중이에요` : '배정된 교육을 이어 들어요', '#my'], ['shield', '필수 · 직무 교육', cnt, '#courses'], ['cal', '연간 교육 일정', next, '#cal'], ['award', '수료증 · 배지', certN ? `수료증 발급 과정 ${certN}개` : '수료 기록을 확인해요', '#badges']] }; }
    if (k === 'k12') return { t: '학생 · 학부모 바로가기', q: '처음 오셨나요, 다니고 계신가요?', L: [
      ['search', '반 · 수업 찾기', cnt, '#courses'], ['cal', '시간표 · 개강 일정', next, '#cal'], ['user', '학부모 · 출결 확인', '출결 · 과제 · 알림을 확인해요', '#my'], ['phone', '상담 · 레벨 테스트 문의', ask.d, ask.h]] };
    if (k === 'voc') return { t: '훈련생 · 구직자 바로가기', q: '국비 과정부터 출결까지 한곳에서', L: [
      ['search', '훈련 과정 · 국비 안내', cnt, '#courses'], ['cal', '개강 · 모집 일정', next, '#cal'], ['user', '훈련생 출결 · 수료', '출결과 진도를 확인해요', '#my'], ['phone', '수강 상담', ask.d, ask.h]] };
    if (k === 'lifelong') return { t: '수강생 바로가기', q: '배우고 싶은 강좌를 바로 찾으세요', L: [
      ['search', '강좌 찾기 · 접수', cnt, '#courses'], ['cal', '접수 · 개강 일정', next, '#cal'], hasFac() ? ['home', '시설 · 공간 예약', '빈 시간을 확인하고 예약해요', '#fac'] : ['user', '내 강의실', '듣던 강좌를 이어 들어요', '#my'], ['phone', '문의하기', ask.d, ask.h]] };
    return { t: '수강생 바로가기', q: '처음 오셨나요, 듣고 계신가요?', L: [
      ['search', `${cl} 둘러보기`, cnt, '#courses'], ['cal', '개강 일정', next, '#cal'], ['user', '내 강의실 이어 보기', ln ? `수강생 ${ln}명이 듣고 있어요` : '듣던 강좌를 이어 들어요', '#my'], ['phone', '수강 상담', ask.d, ask.h]] };
  }
  const priced = () => !['corp', 'public', 'univ', 'univ_lms'].includes(ty());

  function desk(s) { const R = routes(); const A = agenda(); const th = s.theme; const cl = term('cls');
    const rt = R.L.map(([k, l, d, h], i) => `<a class="hu1-r" href="${E(h)}"><span class="hu1-ri">${ic(k)}</span><span class="hu1-rt"><b>${E(l)}</b><small>${E(d)}</small></span><i class="hu1-ra">${th === 'official' ? `<em>0${i + 1}</em>` : ''}${ic('arrow', 18)}</i></a>`).join('');
    const ag = A.length ? `<div class="hu1-ag"><div class="hu1-agh"><b>다가오는 일정</b><a href="#cal">전체 일정 ${ic('arrow', 16)}</a></div><ol>${A.map(x => `<li><a href="#p-c-${E(x.c.id)}"><time>${x.o ? '~' : ''}${E(md(x.d))}</time><span class="hu1-an"><b>${E(x.c.name)}</b><small>${E(timeOf(x.c))}${priced() ? ' · ' + E(won(x.c.price)) : x.c.hours ? ' · ' + E(x.c.hours) + '시간' : ''}</small></span><em class="hu1-tg ${x.cls}">${E(x.tag)}</em></a></li>`).join('')}</ol></div>` : '';
    return `<section class="hu1-desk hu1-${E(th)}${ag ? '' : ' one'}" aria-label="${E(R.t)}"><div class="hu1-w"><div class="hu1-dh"><p>${E(R.t)}</p><h2>${E(R.q)}</h2></div><div class="hu1-dg"><nav class="hu1-rs" aria-label="${E(R.t)}">${rt}</nav>${ag}</div></div></section>`; }

  /* ── CSS ── */
  function css(s) { const T = HPT.tokens(s); if (!T) return ''; const th = s.theme; const ramp = HPT.ramp ? HPT.ramp(T.a) : { 50: T.as, 100: T.as2 };
    const ink = T.ink, mu = fit(T.mu, '#ffffff', 4.8), at = T.at;
    let v = { bg: '#ffffff', card: '#ffffff', line: mix(ink, '#ffffff', .88), ink, mu, at, ib: ramp[50], ic: at, tg: ramp[50], tgc: at, sh: '0 1px 2px rgba(16,24,40,.05),0 8px 24px -12px rgba(16,24,40,.16)', r: 14 };
    if (th === 'premium') { const bg = T.hd || '#0B1022'; const gold = fit(mix(T.a, '#ffffff', .25), bg, 5, '#ffffff'); const m2 = fit('#C9CDD8', mix(bg, '#ffffff', .06), 4.8, '#ffffff');
      v = { bg, card: mix(bg, '#ffffff', .05), line: mix(bg, '#ffffff', .16), ink: '#ffffff', mu: m2, at: gold, ib: 'transparent', ic: gold, tg: 'transparent', tgc: gold, sh: 'none', r: 4 }; }
    if (th === 'warm') { const bg = s && s.theme ? (HPT.meta('warm').alt || '#FFF1E2') : '#FFF1E2'; v = { ...v, bg, card: '#FFFDF9', line: mix(T.a, bg, .8), mu: fit(T.mu, bg, 4.8), at: fit(T.at, '#FFFDF9', 4.8), ib: ramp[100] || T.as2, ic: fit(T.at, ramp[100] || T.as2, 4.6), sh: '0 2px 0 ' + mix(T.a, bg, .75), r: 24 }; }
    if (th === 'clean') v = { ...v, bg: HPT.meta('clean').alt || '#F4F7F5', mu: fit(T.mu, '#ffffff', 4.8) };
    if (th === 'official') v = { ...v, bg: HPT.meta('official').alt || '#F3F5F9', mu: fit(T.mu, '#ffffff', 4.8), sh: 'none', r: 4 };
    const tgW = fit(WARN, th === 'premium' ? v.card : '#ffffff', 4.6, th === 'premium' ? '#ffffff' : '#000000');
    const P = '.hu1-desk';
    return `
${P}{--b:${v.bg};--cd:${v.card};--ln:${v.line};--ik:${v.ink};--mu:${v.mu};--at:${v.at};--ib:${v.ib};--icc:${v.ic};--rr:${v.r}px;background:var(--b);color:var(--ik);padding:44px 0 52px;position:relative}
${P} *{box-sizing:border-box}
${P} .hu1-w{max-width:1200px;margin:0 auto;padding:0 24px}
${P} .hu1-dh{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin:0 0 20px}
${P} .hu1-dh p{margin:0;font-size:14px;font-weight:800;color:var(--at);letter-spacing:.02em}
${P} .hu1-dh h2{margin:0;font-size:24px;line-height:1.35;font-weight:800;letter-spacing:-.02em;color:var(--ik);word-break:keep-all}
${P} .hu1-dg{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:20px;align-items:stretch}
${P}.one .hu1-dg{grid-template-columns:1fr}${P}.one .hu1-rs{grid-template-columns:repeat(4,minmax(0,1fr))}
${P} .hu1-rs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
${P} .hu1-r{display:flex;align-items:center;gap:14px;min-height:88px;padding:16px 18px;background:var(--cd);border:1px solid var(--ln);border-radius:var(--rr);box-shadow:${v.sh};color:var(--ik);text-decoration:none;transition:border-color .15s,transform .15s}
${P} .hu1-r:hover{border-color:var(--at);transform:translateY(-1px)}
${P} .hu1-r:focus-visible,${P} .hu1-ag a:focus-visible{outline:3px solid var(--at);outline-offset:2px}
${P} .hu1-ri{flex:none;width:44px;height:44px;border-radius:${th === 'warm' ? '999px' : th === 'official' ? '4px' : '12px'};display:grid;place-items:center;background:var(--ib);color:var(--icc)${th === 'premium' ? ';border:1px solid var(--ln)' : ''}}
${P} .hu1-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
${P} .hu1-rt b{font-size:16.5px;font-weight:800;line-height:1.35;word-break:keep-all}
${P} .hu1-rt small{font-size:14px;line-height:1.45;color:var(--mu);word-break:keep-all}
${P} .hu1-ra{flex:none;display:flex;align-items:center;gap:6px;color:var(--at);font-style:normal}
${P} .hu1-ra em{font-style:normal;font-size:13px;font-weight:800;color:var(--mu);letter-spacing:.06em}
${P} .hu1-ag{background:var(--cd);border:1px solid var(--ln);border-radius:var(--rr);box-shadow:${v.sh};padding:18px 20px 8px;min-width:0}
${P} .hu1-agh{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;border-bottom:${th === 'official' ? '2px solid ' + T.a : '1px solid var(--ln)'}}
${P} .hu1-agh b{font-size:16px;font-weight:800}
${P} .hu1-agh a{display:inline-flex;align-items:center;gap:4px;min-height:44px;font-size:14px;font-weight:700;color:var(--at);text-decoration:none}
${P} .hu1-ag ol{list-style:none;margin:0;padding:0}
${P} .hu1-ag li+li{border-top:1px solid var(--ln)}
${P} .hu1-ag li a{display:grid;grid-template-columns:76px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:60px;padding:10px 0;color:var(--ik);text-decoration:none}
${P} .hu1-ag time{white-space:nowrap;font-size:14px;font-weight:800;color:var(--at);font-variant-numeric:tabular-nums}
${P} .hu1-an{min-width:0;display:flex;flex-direction:column;gap:2px}
${P} .hu1-an b{font-size:15px;font-weight:700;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${P} .hu1-an small{font-size:13px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${P} .hu1-tg{font-style:normal;font-size:13px;font-weight:800;padding:4px 10px;border-radius:${th === 'warm' ? '999px' : '4px'};background:${v.tg};color:${v.tgc};white-space:nowrap${th === 'premium' ? ';border:1px solid var(--ln)' : ''}}
${P} .hu1-tg.warn{color:${tgW};background:${th === 'premium' ? 'transparent' : mix(WARN, '#ffffff', .9)}}
${P} .hu1-tg.on{background:transparent;color:var(--mu);border:1px solid var(--ln)}
${th === 'premium' ? `${P}{border-top:1px solid var(--ln)}${P} .hu1-dh h2{font-family:inherit;font-weight:700}${P} .hu1-r{background:transparent}${P} .hu1-r:hover{background:var(--cd)}` : ''}
${th === 'official' ? `${P}{border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}${P} .hu1-rs{gap:0;border:1px solid var(--ln);border-top:3px solid ${T.a};background:var(--cd)}${P} .hu1-r{border:0;border-radius:0;box-shadow:none}${P} .hu1-rs .hu1-r:nth-child(odd){border-right:1px solid var(--ln)}${P} .hu1-rs .hu1-r:nth-child(n+3){border-top:1px solid var(--ln)}${P} .hu1-ag{border-top:3px solid ${T.a}}${P}.one .hu1-rs .hu1-r{border-right:1px solid var(--ln);border-top:0}` : ''}
${th === 'warm' ? `${P} .hu1-r{border-width:2px}${P} .hu1-ag{border-width:2px}` : ''}
@media (max-width:860px){${P} .hu1-dg{grid-template-columns:1fr}${P}.one .hu1-rs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){${P}{padding:28px 0 32px}${P} .hu1-w{padding:0 16px}${P} .hu1-dh{display:block;margin-bottom:14px}${P} .hu1-dh h2{font-size:20px;margin-top:4px}
 ${P} .hu1-rs,${P}.one .hu1-rs{grid-template-columns:1fr;gap:8px}${P} .hu1-r{min-height:68px;padding:12px 14px}${P} .hu1-rt b{font-size:16px}
 ${th === 'official' ? `${P} .hu1-rs{gap:0}${P} .hu1-rs .hu1-r{border-right:0!important;border-top:1px solid var(--ln)!important}${P} .hu1-rs .hu1-r:first-child{border-top:0!important}` : ''}
 ${P} .hu1-ag{padding:14px 14px 4px}${P} .hu1-ag li a{grid-template-columns:84px minmax(0,1fr);row-gap:4px;column-gap:8px}${P} .hu1-ag li:nth-child(n+4){display:none}${P} .hu1-tg{grid-column:2;justify-self:start}}
/* 13px · 44px 관문 보정(기존 부품 · 이 테마에서만) */
.hps-tag,.hps-chip,.hps-smp,.hp-tag,.hp-chip,.hp-ci small,.hp-s .hp-ey,.hp-ckd,.ey,.nt,.tg,.hey,.lsw,.s2nc .nt,.s2nc time,.s2cnote,.cb dl,.rh span,.mapi dt,.pc small,.fc .f small,.ctas small,.pt-dt small,.ph2 small,.ph3 small{font-size:13px!important}
.hps-new{font-size:13px!important;width:20px!important;height:20px!important}
.hps-k-table th[scope=row] a{display:flex;align-items:center;min-height:44px}
.sp-facts small,.hpl-mo-ey,.hpl-mo-cm span,.fb-k,.hpl-st-ey,.hps-wmk small,.hps-p small,.hpb-ft small,.hp-fl small{font-size:13px!important}
.hps-pt a,.hpb-qc a,.pt-pop a{display:inline-flex;align-items:center;min-height:44px}
.sp-link,.hp-all,.fb-all,.pt-all,.pt-more,.hps-btn.sm{min-height:44px!important;display:inline-flex!important;align-items:center}
`; }
  const EXTRA_MIN = (s, h) => h; /* 측정 후 보정 자리 */

  /* ── 붙이기: 홈 첫 화면 바로 뒤에 데스크, 사이트 CSS 끝에 CSS ── */
  function inject(h, s) { const mi = h.search(/<main class="s2pg" id="p-home">/); const from = mi >= 0 ? mi : h.search(/<main\b/); if (from < 0) return h;
    const end = h.indexOf('</section>', from); if (end < 0) return h; let at = end + '</section>'.length;
    /* 첫 화면에 붙은 숫자 띠(facts)는 첫 화면의 일부로 보고 그 뒤에 넣는다 */
    const nx = h.slice(at, at + 400).match(/^\s*(?:<!--[^>]*-->\s*)?<section\b[^>]*class="[^"]*(facts|hp-fl|stats)[^"]*"/); if (nx) { const e2 = h.indexOf('</section>', at); if (e2 > 0) at = e2 + '</section>'.length; } return h.slice(0, at) + desk(s) + h.slice(at); }
  { const base = siteHTML; siteHTML = (s, ...a) => { const h = base(s, ...a);
    try { if (!s || !MINE.includes(s.theme) || typeof h !== 'string' || !h.includes('</style>') || !HPT.tokens(s)) return h;
      let o = inject(h, s); o = o.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); return EXTRA_MIN(s, o); } catch (e) { console.error('hpup-b1', e); return h; } };
    window.siteHTML = siteHTML; }
  window.HPUP_B1 = { desk, routes, agenda, css };
})();
