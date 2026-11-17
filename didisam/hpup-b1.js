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

  /* ── 실제 데이터: 공개 강좌만(hpth pubAll · global pubCls와 같은 조건 — 지정 회원 강좌는 게시본에 쓰지 않는다) ── */
  const pubAll = () => ((typeof S !== 'undefined' && S && S.classes) || []).filter(c => c && c.name && (c.open === '전체' || c.open == null) && c.status !== '종료' && c.status !== '보관');
  const live = () => { const L = pubAll(); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; }; /* 숫자 띠(HPT.facts)와 같은 집계 */
  const learners = () => new Set(live().flatMap(c => c.learners || [])).size;
  const won = n => +n > 0 ? `${(+n).toLocaleString('ko-KR')}원` : '무료';
  const kd = d => { const x = new Date(String(d).slice(0, 10) + 'T00:00:00'); return `${x.getMonth() + 1}월 ${x.getDate()}일`; };
  const fixed = c => (c.days || []).length > 0 || !!(c.time && c.time.from);
  const timeOf = c => { const D = (c.days || []).map(d => WD[d]).filter(Boolean); const tm = c.time && c.time.from ? `${c.time.from}${c.time.to ? '~' + c.time.to : ''}` : '';
    if (D.length || tm) return [D.length ? `매주 ${D.join('·')}` : '', tm].filter(Boolean).join(' '); return c.kind === 'sub' ? '구독 · 언제든 수강' : c.hours ? `온라인 · 총 ${c.hours}시간` : '온라인 자유 수강'; };
  /* 일정: 아직 시작하지 않은 강좌(개강 · 모집)만 「다가오는 일정」. 없으면 직업훈련 외에는 진행 중인 강좌(정해진 요일 · 시간 먼저, 끝나는 날짜 순) */
  const ongoing = () => { const T = tday(); return live().filter(c => okD(c.end) && days(T, c.end) >= 0 && !(okD(c.start) && days(T, c.start) > 0)); };
  function agenda() { const T = tday();
    const up = pubAll().filter(c => okD(c.start) && days(T, c.start) > 0).map(c => ({ c, o: 0, v: days(T, c.start), d: c.start, when: `${kd(c.start)} 개강`, tag: `D-${days(T, c.start)}`, cls: days(T, c.start) <= 7 ? 'warn' : 'up' })).sort((a, b) => a.v - b.v);
    if (up.length || ty() === 'voc') return { t: '다가오는 일정', L: up.slice(0, 4) };
    const on = ongoing().map(c => ({ c, o: 1, v: days(T, c.end), d: c.end, when: `${kd(c.end)}까지`, tag: days(T, c.end) <= 14 ? `종료 D-${days(T, c.end)}` : '수강 중', cls: days(T, c.end) <= 14 ? 'warn' : 'on' }))
      .sort((a, b) => (fixed(b.c) - fixed(a.c)) || a.v - b.v);
    return { t: `진행 중인 ${term('cls')}`, L: on.slice(0, 3) }; }
  const telOf = () => { try { const f = (S.settings && S.settings.footer) || {}; const v = String(f.tel || '').trim(); return /\d{2,}/.test(v) && !/입력/.test(v) ? v : ''; } catch (e) { return ''; } };
  const hasFac = () => { try { return Array.isArray(S.fac) ? S.fac.length > 0 : !!(S.fac && (S.fac.rooms || S.fac.items || []).length); } catch (e) { return false; } };

  /* ── 기관 유형별 갈래(누가 · 무엇을 하러 왔는지) ── */
  function routes() { const n = live().length; const A = agenda(); const up = A.L.find(x => x.o === 0); const og = ongoing().length; const tel = telOf(); const cl = term('cls');
    const ask = tel ? { h: 'tel:' + tel.replace(/[^\d+]/g, ''), d: tel } : { h: '#comm', d: '게시판에 남기면 답해 드려요' };
    const next = up ? `다음 개강 ${kd(up.d)}` : og ? `${og}개 ${cl} 진행 중` : '학습 일정을 한눈에 봐요';
    const cnt = n ? `공개 ${cl} ${n}개` : `로그인하면 배정된 ${cl} 목록이 보여요`; const ln = learners();
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
    const row = x => `<li><a href="#p-c-${E(x.c.id)}"><time><b>${E(kd(x.d))}</b><small>${x.o ? '까지' : '개강'} · ${E(WD[new Date(String(x.d).slice(0, 10) + 'T00:00:00').getDay()])}</small></time><span class="hu1-an"><b>${E(x.c.name)}</b><small>${E(timeOf(x.c))}${priced() ? ' · ' + E(won(x.c.price)) : ''}</small></span><em class="hu1-tg ${x.cls}">${E(x.tag)}</em></a></li>`;
    const ag = A.L.length ? `<div class="hu1-ag"><div class="hu1-agh"><b>${E(A.t)}</b><a href="#cal">전체 일정 ${ic('arrow', 16)}</a></div><ol>${A.L.map(row).join('')}</ol></div>`
      : !pubAll().length ? `<div class="hu1-ag hu1-lg"><div class="hu1-agh"><b>내 교육 일정</b></div><p>${E(cl)}${((cl.charCodeAt(cl.length - 1) - 0xAC00) % 28) ? '은' : '는'} 지정된 분께만 열려 있어요. 로그인하면 배정된 일정과 마감이 보여요.</p><a class="hu1-lgb" href="#login">로그인하고 내 교육 보기 ${ic('arrow', 18)}</a></div>` : '';
    return `<section class="hu1-desk hu1-${E(th)}${ag ? '' : ' one'}" aria-label="${E(R.t)}"><div class="hu1-w"><div class="hu1-dh"><p>${E(R.t)}</p><h2>${E(R.q)}</h2></div><div class="hu1-dg"><nav class="hu1-rs" aria-label="${E(R.t)}">${rt}</nav>${ag}</div></div></section>`; }

  /* ── CSS ── */
  function css(s) { const T = HPT.tokens(s); if (!T) return ''; const th = s.theme; const ramp = HPT.ramp ? HPT.ramp(T.a) : { 50: T.as, 100: T.as2 };
    const ink = T.ink, mu = fit(T.mu, '#ffffff', 4.8), at = T.at;
    let v = { bg: '#ffffff', card: '#ffffff', line: mix(ink, '#ffffff', .88), ink, mu, at, ib: ramp[50], ic: at, tg: ramp[50], tgc: at, sh: '0 1px 2px rgba(16,24,40,.05),0 8px 24px -12px rgba(16,24,40,.16)', r: 14 };
    if (th === 'premium') { const bg = mix(T.hd || '#0B1022', '#ffffff', .94); const gold = fit(mix(T.a, '#ffffff', .35), T.hd || '#0B1022', 4.6, '#ffffff');
      v = { ...v, bg, line: mix(T.hd || '#0B1022', '#ffffff', .84), mu: fit(T.mu, bg, 4.8), at: fit(T.at, bg, 4.8), ib: T.hd || '#0B1022', ic: gold, sh: '0 1px 0 ' + mix(T.hd || '#0B1022', '#ffffff', .8), r: 6 }; }
    if (th === 'warm') { const bg = ramp[50]; v = { ...v, bg, line: ramp[200], mu: fit(T.mu, '#ffffff', 4.8), at: fit(T.at, '#ffffff', 4.8), ib: ramp[100], ic: fit(T.at, ramp[100], 4.6), sh: '0 2px 0 ' + ramp[200], r: 22 }; }
    if (th === 'clean') v = { ...v, bg: HPT.meta('clean').alt || '#F4F7F5', mu: fit(T.mu, '#ffffff', 4.8) };
    if (th === 'official') v = { ...v, bg: HPT.meta('official').alt || '#F3F5F9', mu: fit(T.mu, '#ffffff', 4.8), sh: 'none', r: 4 };
    const tgW = fit(WARN, mix(WARN, '#ffffff', .9), 4.6, '#000000');
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
${P} .hu1-ri{flex:none;width:44px;height:44px;border-radius:${th === 'warm' ? '999px' : th === 'official' ? '4px' : '12px'};display:grid;place-items:center;background:var(--ib);color:var(--icc)}
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
${P} .hu1-ag li a{display:grid;grid-template-columns:84px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:60px;padding:10px 0;color:var(--ik);text-decoration:none}
${P} .hu1-ag time{display:flex;flex-direction:column;gap:1px;white-space:nowrap;font-variant-numeric:tabular-nums}${P} .hu1-ag time b{font-size:15px;font-weight:800;color:var(--at)}${P} .hu1-ag time small{font-size:13px;color:var(--mu)}
${P} .hu1-lg p{margin:14px 0 12px;font-size:15px;line-height:1.6;color:var(--mu);word-break:keep-all}${P} .hu1-lgb{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;margin-bottom:12px;border-radius:${th === 'warm' ? '999px' : '8px'};background:${T.a};color:${T.on};font-weight:800;font-size:15px;text-decoration:none}
${P} .hu1-an{min-width:0;display:flex;flex-direction:column;gap:2px}
${P} .hu1-an b{font-size:15px;font-weight:700;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${P} .hu1-an small{font-size:13px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${P} .hu1-tg{font-style:normal;font-size:13px;font-weight:800;padding:4px 10px;border-radius:${th === 'warm' ? '999px' : '4px'};background:${v.tg};color:${v.tgc};white-space:nowrap}
${P} .hu1-tg.warn{color:${tgW};background:${mix(WARN, '#ffffff', .9)}}
${P} .hu1-tg.on{background:transparent;color:var(--mu);border:1px solid var(--ln)}
${th === 'premium' ? `${P}{border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}${P} .hu1-r{border-top:2px solid ${T.hd || '#0B1022'}}${P} .hu1-ag{border-top:2px solid ${T.hd || '#0B1022'}}` : ''}
${th === 'official' ? `${P}{border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}${P} .hu1-rs{gap:0;border:1px solid var(--ln);border-top:3px solid ${T.a};background:var(--cd)}${P} .hu1-r{border:0;border-radius:0;box-shadow:none}${P} .hu1-rs .hu1-r:nth-child(odd){border-right:1px solid var(--ln)}${P} .hu1-rs .hu1-r:nth-child(n+3){border-top:1px solid var(--ln)}${P} .hu1-ag{border-top:3px solid ${T.a}}${P}.one .hu1-rs .hu1-r{border-right:1px solid var(--ln);border-top:0}` : ''}
${th === 'warm' ? `${P} .hu1-r{border-width:2px}${P} .hu1-ag{border-width:2px}` : ''}
@media (max-width:860px){${P} .hu1-dg{grid-template-columns:1fr}${P}.one .hu1-rs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){${P}{padding:28px 0 32px}${P} .hu1-w{padding:0 16px}${P} .hu1-dh{display:block;margin-bottom:14px}${P} .hu1-dh h2{font-size:20px;margin-top:4px}
 ${P} .hu1-rs,${P}.one .hu1-rs{grid-template-columns:1fr;gap:8px}${P} .hu1-r{min-height:68px;padding:12px 14px}${P} .hu1-rt b{font-size:16px}
 ${th === 'official' ? `${P} .hu1-rs{gap:0}${P} .hu1-rs .hu1-r{border-right:0!important;border-top:1px solid var(--ln)!important}${P} .hu1-rs .hu1-r:first-child{border-top:0!important}` : ''}
 ${P} .hu1-ag{padding:14px 14px 4px}${P} .hu1-ag li a{grid-template-columns:84px minmax(0,1fr);row-gap:4px;column-gap:8px}${P} .hu1-ag li:nth-child(n+4){display:none}${P} .hu1-tg{grid-column:2;justify-self:start}}
/* 휴대폰: 첫 화면의 장식 사진 · 데스크와 겹치는 숫자 카드 · 바로가기 칸은 접어 데스크가 첫 스크롤 바로 아래에 오게 한다 */
@media (max-width:560px){.hpl-mo-x,.hpl-mo-s,.pt-hero .pt-qk{display:none!important}}
/* 첫 화면 제목: 한 단어만 다음 줄로 떨어지지 않게 줄 길이를 고르게 */
h1,h1 em{text-wrap:balance}
/* 13px · 44px 관문 보정(기존 부품 · 이 테마에서만) */
.hps-tag,.hps-chip,.hps-smp,.hp-tag,.hp-chip,.hp-ci small,.hp-s .hp-ey,.hp-ckd,.ey,.nt,.tg,.hey,.lsw,.s2nc .nt,.s2nc time,.s2cnote,.cb dl,.rh span,.mapi dt,.pc small,.fc .f small,.ctas small,.pt-dt small,.ph2 small,.ph3 small{font-size:13px!important}
.hps-new{font-size:13px!important;width:20px!important;height:20px!important}
.hps-k-table th[scope=row] a{display:flex;align-items:center;min-height:44px}
.sp-facts small,.hpl-mo-ey,.hpl-mo-cm span,.fb-k,.hpl-st-ey,.hps-wmk small,.hps-p small,.hpb-ft small,.hp-fl small{font-size:13px!important}
.hps-pt a,.hpb-qc a,.pt-pop a{display:inline-flex;align-items:center;min-height:44px}
.sp-link,.hp-all,.fb-all,.pt-all,.pt-more,.hps-btn.sm{min-height:44px!important;display:inline-flex!important;align-items:center}
`; }
  const EXTRA_MIN = (s, h) => h; /* 측정 후 보정 자리 */

  /* ── 첫 화면 사진: 템플릿 샘플 사진이 기관 유형과 맞지 않으면 유형에 맞는 샘플 사진으로(기관이 직접 고른 사진은 그대로) ── */
  const FIT = { univ: ['campus', 'lecture', 'library', 'seminar'], univ_lms: ['campus', 'lecture', 'library', 'seminar'], k12: ['classroom', 'kids', 'library', 'science'],
    voc: ['vocational', 'classroom', 'laptop', 'coding', 'cooking', 'beauty'], corp: ['office', 'seminar', 'lecture'], public: ['civic', 'office', 'seminar', 'lecture'],
    lifelong: ['senior', 'classroom', 'seminar', 'library', 'art', 'wellness', 'civic', 'music', 'cooking'],
    adult: ['classroom', 'laptop', 'seminar', 'lecture', 'art', 'music', 'cooking', 'beauty', 'wellness', 'coding', 'library', 'workshop'] };
  const PREF = { univ: ['campus', 'lecture', 'library'], univ_lms: ['campus', 'lecture', 'library'], k12: ['classroom', 'library', 'kids'], voc: ['classroom', 'laptop', 'vocational'], corp: ['seminar', 'office'], public: ['civic', 'seminar', 'office'], lifelong: ['seminar', 'senior', 'classroom'], adult: ['classroom', 'seminar'] };
  const PICK = { voc: ['hum-07', 'cls-03'] }; /* 직업훈련: 컴퓨터 실습 장면 우선 */
  const stockRe = /img\/stock\//;
  function heroFix(s) { try { const H = window.HPSTOCK; const k = ty(); if (!H || !H.list || !FIT[k] || s.stockOff) return s;
      const im = s.img && s.img.hero; const bn = ((s.sections || []).find(x => x && x.type === 'banner') || {}).data || {};
      if (im && im.src && !(im.stock || stockRe.test(String(im.src)))) return s; /* 기관이 올린 사진 */
      if (!im && bn.img && !stockRe.test(String(bn.img))) return s;
      const cur = im && im.src ? H.list.find(y => String(im.src).indexOf(y.src.replace(/\.webp$/, '')) >= 0) : null;
      if (cur && FIT[k].includes(cur.cat)) return s;
      const okS = y => !y.slots || !y.slots.length || y.slots.includes('hero'); const okT = y => !y.types || !y.types.length || y.types.includes(k);
      let pick = (PICK[k] || []).map(id => H.list.find(y => y.id === id)).find(Boolean) || null; if (!pick) for (const c of PREF[k]) { pick = H.list.find(y => y.cat === c && okS(y) && okT(y) && y.tone !== 'dark') || H.list.find(y => y.cat === c && okS(y)); if (pick) break; }
      if (!pick) return s;
      const img = Object.assign({}, s.img || {}, { hero: { src: pick.src, alt: pick.alt || '', fit: 'cover', pos: pick.focus || '50% 50%', stock: pick.id } });
      return Object.assign({}, s, { img, photos: Object.assign({}, s.photos || {}, { hero: pick.id }) }); } catch (e) { return s; } }

  /* 제목 줄의 마지막 두 낱말을 붙여 한 낱말만 다음 줄로 떨어지지 않게 한다(태그 없는 글자 조각만) */
  const orphan = h => h.replace(/(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/g, (m, a, body, z) => a + body.split(/(<br\s*\/?>)/).map(seg => /<|&nbsp;/.test(seg) || seg.trim().split(/\s+/).length < 3 ? seg : seg.replace(/\s+(\S+)\s*$/, '&nbsp;$1')).join('') + z);
  /* ── 붙이기: 홈 첫 화면 바로 뒤에 데스크, 사이트 CSS 끝에 CSS ── */
  function inject(h, s) { const mi = h.search(/<main class="s2pg" id="p-home">/); const from = mi >= 0 ? mi : h.search(/<main\b/); if (from < 0) return h;
    const end = h.indexOf('</section>', from); if (end < 0) return h; const at = end + '</section>'.length;
    /* 숫자 띠(facts)보다 앞 — 휴대폰 첫 스크롤 안에 갈래가 보이게 한다 */
    return h.slice(0, at) + desk(s) + h.slice(at); }
  { const base = siteHTML; siteHTML = (s, ...a) => { const mine = s && MINE.includes(s.theme); const h = base(mine ? heroFix(s) : s, ...a);
    try { if (!s || !MINE.includes(s.theme) || typeof h !== 'string' || !h.includes('</style>') || !HPT.tokens(s)) return h;
      let o = inject(h, s); o = orphan(o); o = o.replace('</style>', css(s).replace(/<\/?style/gi, '') + '</style>'); return EXTRA_MIN(s, o); } catch (e) { console.error('hpup-b1', e); return h; } };
    window.siteHTML = siteHTML; }
  window.HPUP_B1 = { desk, routes, agenda, css };
})();
