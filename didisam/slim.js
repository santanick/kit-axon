/* v34 단순화 층(slim) — 대표님(2026-11-07): '필요 없는 화면 정리 · 빈 가이드 채우기 · 필수 시나리오 위주, 더 필요한 건 메뉴를 켜서 추가 ·
   휴대폰 「앱 및 서비스 연결하기」처럼 전반적인 UI UX를 심플하게(목록에는 이름과 한 줄, 설명은 누른 뒤에)'.
   이 파일은 다른 스크립트를 모두 읽은 뒤(boot.js 바로 앞) 읽는다. 기능은 지우지 않고, 보이는 것만 줄인다(마이그레이션 동등성). */
(function () {
  /* ───────── 0. v36 '간단히 보기' 폐지(대표님 2026-11-09: '간단보기가 오히려 혼란 — 처음부터 전체 화면') ─────────
     slim-a · slim-b가 기존 화면 앞에 끼우던 요약 첫 화면(+ [자세히] · [표로 보기] · '‹ 간단히 보기' 토글)을 기본으로 끈다.
     기능은 그대로(기존 전체 화면이 곧 첫 화면). 요약 첫 화면을 계속 쓰는 화면만 SLIM_FRONT에 남긴다.
     - site: 사이트 첫 화면은 v36 G(한 화면 편집기)가 새로 정한다 — 그 전까지 지금 화면 유지 */
  window.SLIM_FRONT = window.SLIM_FRONT || new Set(); /* v36 G: 사이트도 요약 첫 화면 없이 한 화면 편집기(hpstudio.js) */
  window.slimFront = id => !!(window.SLIM_FRONT && SLIM_FRONT.has(id));
  /* ───────── 0-1. v37 클릭 후 스크롤이 맨 위로 튀는 현상 방지(대표님 2026-11-10 '해당 페이지 부분에 고정되어 있어야 돼') ─────────
     원인: 화면을 바꾸는 클릭은 대부분 render()로 #app 전체를 다시 그린다. 스튜디오 화면은 #main(.bcanvas)이 스스로 스크롤하는 상자라서,
     새 #main이 생기면 scrollTop이 0이 된다(휴대폰은 창 스크롤이지만 문서가 잠깐 짧아지면 위로 당겨진다).
     처리: 다시 그리기 전후로 '같은 화면'(공간 · 탭 · 첫 제목이 같음)이면 #main · 창 · 화면 안 스크롤 상자 위치를 되돌린다.
     다른 화면으로 가는 이동(go · 상세 열기 등 제목이 바뀌는 경우)은 그대로 맨 위에서 시작한다. */
  { const sig = () => { try { const m = document.getElementById('main'); if (!m || typeof CUR === 'undefined' || !CUR) return ''; const h = [...m.querySelectorAll('.sl-h h2, .bhdl b, h1, h2')].find(x => x.offsetParent !== null && !x.closest('#modal,.mwrap,#slSheet'));
        const back = m.querySelector('.sl-back, [data-act$="back"], [data-act$="-list"], .w2back, .crumb'); /* 상세(뒤로 버튼) ↔ 목록이 바뀌면 다른 화면 */
        return `${CUR.ws}/${CUR.tab}|${UI.settings || ''}|${back ? 'd' : 'l'}|${h ? h.textContent.replace(/[\d,.\s·()]+/g, '').slice(0, 24) : ''}`; } catch (e) { return ''; } };
    const boxes = () => { const m = document.getElementById('main'); return m ? [...m.querySelectorAll('[data-keep-scroll], .hps-canvas, .hpst-canvas, .ct-pv, .bk-pv, .s2tree, .sl-list')].filter(e => e.scrollTop > 0).map(e => [e.id || e.className, e.scrollTop]) : []; };
    window.slKeepScroll = true;
    const base = render; render = (...a) => { if (!window.slKeepScroll || !S || !S.org) return base(...a);
      const m0 = document.getElementById('main'); const k0 = sig(); const my = m0 ? m0.scrollTop : 0; const wy = window.scrollY; const B = boxes();
      const r = base(...a);
      try { if (k0 && k0 === sig() && (my > 0 || wy > 0)) { const put = () => { const m = document.getElementById('main'); if (m && my > 0 && Math.abs(m.scrollTop - my) > 1) m.scrollTop = my; if (wy > 0 && Math.abs(window.scrollY - wy) > 1) window.scrollTo(0, wy);
            B.forEach(([k, y]) => { const e = m && [...m.querySelectorAll('[data-keep-scroll], .hps-canvas, .hpst-canvas, .ct-pv, .bk-pv, .s2tree, .sl-list')].find(x => (x.id || x.className) === k); if (e) e.scrollTop = y; }); };
          put(); requestAnimationFrame(put); setTimeout(put, 60); } } catch (e) { }
      return r; }; }
  /* 버튼처럼 쓰는 href="#" 링크가 주소를 바꾸며 맨 위로 가지 않게(ACT가 없는 링크 포함) */
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href="#"]'); if (a && !a.closest('.lhp, iframe')) e.preventDefault(); }, true);

  /* ───────── 1. 기관 유형별 필수 메뉴(사이드바 기본) ───────── */
  /* v36 R1 유형별 기본 메뉴 재점검(대표님: 유형별 메뉴가 들쭉날쭉) — 모든 유형 같은 뼈대:
     {과정} · 콘텐츠 · (출결) · (수료증) / 명단 · 등록 · 초대 / 공지 · 메시지 / 사이트 / (유형 전용 · 규정 · 문서)
     - 수료증(cert): 수료 · 이수가 있는 유형은 기본 켬. 학원(초중고)은 수업에 수료 개념이 약해 끔(메뉴 찾기에서 [켜기])
     - 문서(docs): 공문 · 결과 보고가 있는 기관형(대학 · 기업 · 공공 · 평생 · 직업훈련)만 기본 켬. 학원(초중고 · 성인)은 끔
     - 게시판(community): 대학은 목적별 게시판(학과 공지 · Q&A · 자료실)을 쓰므로 기본 켬
     - 출결(attend): 출석이 이수 요건인 공공 · 평생 · 직업훈련만(학원 초중고는 crmatt). 대학 · 기업 · 성인은 온라인 진도율로 관리 */
  const ESS = {
    adult: ['class', 'clib', 'cert', 'members', 'enroll', 'board', 'message', 'sales', 'site'],
    k12: ['crmstu', 'crmatt', 'crmex', 'class', 'clib', 'crmbill', 'board', 'message', 'site'],
    univ: ['class', 'clib', 'cert', 'members', 'enroll', 'board', 'community', 'message', 'academic', 'docs', 'site'],
    univ_lms: null, /* 학사 LMS는 업무 단위 3단 메뉴(ulms.js)를 그대로 쓰고, 아래 slimLms에서 줄인다 */
    corp: ['class', 'clib', 'cert', 'members', 'enroll', 'board', 'message', 'compliance', 'cpl', 'docs', 'site'],
    public: ['class', 'clib', 'attend', 'cert', 'members', 'enroll', 'board', 'message', 'docs', 'site'],
    lifelong: ['class', 'clib', 'attend', 'cert', 'members', 'enroll', 'board', 'message', 'lifelong', 'cpl', 'docs', 'site'],
    voc: ['class', 'clib', 'attend', 'cert', 'members', 'enroll', 'board', 'message', 'hrd', 'cpl', 'docs', 'site']
  };
  /* v36 R1 이미 저장된 기관: 이번에 기본으로 바뀐 메뉴만 한 번 켠다(사용자가 켠 메뉴는 그대로, 이후에 끄면 다시 켜지 않음) */
  const ESS36 = { adult: ['cert', 'board'], k12: ['board'], univ: ['cert', 'community', 'message', 'docs'], corp: ['cert', 'message', 'docs'], public: ['message', 'docs'], lifelong: ['enroll', 'board', 'message', 'docs'], voc: ['enroll', 'board', 'docs'] };
  function ess36() { if (!S || !S.org || !S.nav || !S.nav.tabs || S.nav.r36) return; const k = essKey(); const L = ESS36[k] || [];
    L.forEach(id => { if (!MENU[id]) return; if (typeof navAdd === 'function') { try { navAdd(id, true); } catch (e) { } } Object.values(S.nav.tabs).forEach(A => (A || []).forEach(x => { if (x.id === id) x.on = true; })); });
    S.nav.r36 = 1; }
  if (MENU.community) MENU.community.label = '게시판'; /* v36 R1 '커뮤니티' → 쉬운 말 '게시판'(목적별 게시판 여러 개) */
  const essKey = () => S && S.org ? (S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type) : '';
  window.slimEss = () => { const k = essKey(); const E = ESS[k]; if (E) return E.filter(id => MENU[id]); /* 학사 LMS: 지금 켜진 탭 중 앞의 7개 */
    return Object.values(S.nav.tabs).flat().filter(x => x.on && MENU[x.id]).map(x => x.id).slice(0, 7); };
  function slimApply() { const E = slimEss(); if (!E.length) return;
    E.forEach(id => { if (MENU[id] && typeof navAdd === 'function' && !Object.values(S.nav.tabs).some(A => (A || []).some(x => x.id === id))) { try { navAdd(id, true); } catch (e) { } } }); /* v36 R1 프리셋에 없던 기본 메뉴(docs 등)도 자리를 만든다 */
    Object.keys(S.nav.tabs).forEach(w => { const A = S.nav.tabs[w] || []; A.forEach(x => { x.on = E.includes(x.id); }); A.sort((a, b) => (E.indexOf(a.id) + 1 || 99) - (E.indexOf(b.id) + 1 || 99)); });
    S.slim34 = 1; S.nav.r36 = 1; auto36(); }
  /* v36 R4 홈에 '자동 운영 n개 켜짐'인데 자동화 메뉴가 꺼져 있던 것 — 켜진 자동화가 있으면 자동화 메뉴도 기본으로 켠다(이미 저장된 기관은 upgradeState에서 한 번) */
  function auto36() { if (!S || !S.nav || !S.nav.tabs || !MENU.auto) return; S.nav.au36 = 1; if (!(S.autos || []).some(a => a.on)) return; if (typeof navAdd === 'function') { try { navAdd('auto', true); } catch (e) { } } Object.values(S.nav.tabs).forEach(A => (A || []).forEach(x => { if (x.id === 'auto') x.on = true; })); }
  window.slimApply = slimApply;
  /* v35 F2b: 모든 유형에서 학습자 사이트 게시로 갈 수 있게 '홈페이지(site)'를 필수 메뉴에 둔다. 이미 저장된 기관(S.slim34 있음)은 한 번만 켠다 */
  function siteOn35() { if (!S || !S.org || !S.nav || !S.nav.tabs || S.site35 || !MENU.site) return; const k = essKey(); if (k !== 'univ_lms') { if (typeof navAdd === 'function') navAdd('site', true); Object.values(S.nav.tabs).forEach(L => (L || []).forEach(x => { if (x.id === 'site') x.on = true; })); } S.site35 = 1; }
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { siteOn35(); } catch (e) { console.error(e); } return r; }; }
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.slim34 && !(S.nav || {}).r36) { ess36(); save(); } } catch (e) { console.error(e); } return r; }; }
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org && S.nav && !S.nav.au36) { auto36(); save(); } } catch (e) { console.error(e); } return r; }; }
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org && !S.slim34) { const old = !!S.org.created && S.org.created < '2026-11-08'; slimApply(); if (old) UI.slimNote = 1; save(); } } catch (e) { console.error(e); } return r; }; }
  if (typeof createOrg === 'function') { const base = createOrg; createOrg = (...a) => { const r = base(...a); try { if (S && S.org) { slimApply(); save(); render(); } } catch (e) { console.error(e); } return r; }; }

  /* v35 F2b: 메뉴 찾기에서 '게시' · '공개' · '학습자 사이트'로도 홈페이지(게시) 화면이 나오게 한다(꺼져 있어도 결과에 보임) */
  { const SYN = { site: '게시 게시하기 공개 공개하기 학습자 사이트 학습 사이트 포털 홈페이지 사이트 열기', clib: '자료 영상 교안 퀴즈 업로드 디지털북', enroll: '수강 권한 배정 초대 접근코드', class: '과정 만들기 개설' };
    const base = ACT['ux-find']; if (base) ACT['ux-find'] = (...a) => { const r = base(...a); try { const L = document.querySelector('#modal .uxfl'); if (L) { Object.entries(SYN).forEach(([id, k]) => { if (!MENU[id]) return; let b = L.querySelector(`[data-v="${id}"]`); if (!b && id === 'site') { L.insertAdjacentHTML('afterbegin', `<button type="button" role="listitem" data-act="go" data-v="site" data-k=""><b>${esc(mlabel('site'))}</b><small>학습자 사이트 · 게시</small></button>`); b = L.querySelector('[data-v="site"]'); } if (b) b.dataset.k = (b.dataset.k + ' ' + k).toLowerCase(); }); const q = document.querySelector('#modal .uxq'); if (q && q.value) q.dispatchEvent(new Event('input')); } } catch (e) { console.error(e); } return r; }; }

  /* v36 R1 메뉴 찾기: 꺼진 메뉴도 결과에 보이고 [켜기] — '게시판' · '문서' · '수료증'을 찾으면 꺼져 있어도 나온다(누르면 켜고 바로 열기) */
  { const SYN2 = { community: '게시판 커뮤니티 게시글 글 질문 q&a 자료실 학과 공지', docs: '문서 공문 보고서 결과보고 안내문 서식 가정통신문', cert: '수료증 이수증 수료 이수 증명서', attend: '출결 출석 결석 지각 출석부', badge: '배지 디지털 배지', message: '메시지 문자 알림톡 푸시', board: '공지 알림', enroll: '등록 초대 일괄 엑셀 명단', auto: '자동화 자동 반복', parents: '보호자 학부모', sales: '매출 결제 환불', consult: '상담 채널톡' };
    const base = ACT['ux-find']; if (base) ACT['ux-find'] = (...a) => { const r = base(...a); try { const L = document.querySelector('#modal .uxfl'); if (!L || !S || !S.org) return r;
      const D = typeof UX_DESC === 'function' ? UX_DESC() : {}; const role = S.me && S.me.role;
      const off = allTabs().filter(x => !x.on && !['library', 'dbook'].includes(x.id) /* 콘텐츠 라이브러리(clib)에 합쳐진 옛 메뉴 */ && !(MENU[x.id].owner && role !== 'owner') && !(role === 'teacher') && !(x.id === 'parents' && typeof mbGuardOn === 'function' && !mbGuardOn()) && !(['sales', 'billing'].includes(x.id) && typeof mbPayOn === 'function' && !mbPayOn()) && !L.querySelector(`[data-v="${x.id}"]`));
      L.querySelectorAll('button[data-v]').forEach(b => { const k = SYN2[b.dataset.v]; if (k) b.dataset.k = (b.dataset.k + ' ' + k).toLowerCase(); });
      L.insertAdjacentHTML('beforeend', off.map(x => `<button type="button" role="listitem" class="uxoff" data-act="ux-on" data-v="${esc(x.id)}" data-k="${esc((mlabel(x.id) + ' ' + lab(WS[x.w] || { label: '' }) + ' ' + (D[x.id] || '') + ' ' + (SYN2[x.id] || '')).toLowerCase())}"><b>${esc(mlabel(x.id))} <em class="uxoff-t">꺼져 있음</em></b><small>${esc(lab(WS[x.w] || { label: '' }))}${D[x.id] || mdOf(x.id)[0] ? ' · ' + esc(D[x.id] || mdOf(x.id)[0]) : ''}</small><span class="uxon">켜기</span></button>`).join(''));
      const p = document.querySelector('#modal .mini'); if (p && /꺼 둔 메뉴/.test(p.textContent)) p.textContent = '꺼져 있는 메뉴도 찾을 수 있습니다. [켜기]를 누르면 왼쪽 메뉴에 생기고 바로 열립니다.';
      const q = document.querySelector('#modal .uxq'); if (q && q.value) q.dispatchEvent(new Event('input')); } catch (e) { console.error(e); } return r; }; }
  ACT['ux-on'] = el => { const id = el.dataset.v; closeModal(); if (typeof slMenuSet === 'function') slMenuSet(id, true); try { logAudit(`메뉴 켜기 — ${mlabel(id)}`); } catch (e) { } go(id); render(); toast(`'${mlabel(id)}' 메뉴를 켰습니다. 왼쪽 메뉴에 생겼습니다.`, 'ok'); };
  /* 메뉴 한 줄 설명(메뉴 추가 목록 · 화면 가이드에 쓴다) — 15자 안팎 */
  const MD = {
    class: ['과정을 만들고 운영합니다', '수업 만들어줘'], journey: ['학습 경로를 묶습니다', '러닝 저니 만들어줘'], diag: ['AI 진단 검사를 엽니다', '진단 결과 요약해줘'],
    library: ['영상 · 자료를 모아 편성합니다', '자료 올리는 법 알려줘'], assess: ['시험 · 과제를 내고 채점합니다', '검수 대기 과제 보여줘'], badge: ['배지를 만들어 줍니다', '배지 만들어줘'],
    cert: ['수료증을 발급합니다', '수료 대상자 보여줘'], attend: ['출결을 기록합니다', '오늘 출결 요약해줘'], book: ['교재 · 교구를 팝니다', '교재 등록해줘'],
    members: ['명단 · 가입 승인을 봅니다', '승인 대기 보여줘'], enroll: ['초대 · 일괄 등록합니다', '초대 링크 만들어줘'], groups: ['반 · 팀으로 묶습니다', '반 나눠줘'],
    parents: ['보호자를 연결합니다', '보호자 연결 안 된 학생'], admins: ['운영자 · 기록을 봅니다', '운영자 추가해줘'], board: ['공지 · 알림을 보냅니다', '공지 써줘'],
    message: ['메시지 · 알림톡을 보냅니다', '미접속자에게 안내해줘'], community: ['게시판을 운영합니다', '미답변 질문 보여줘'], consult: ['상담을 기록합니다', '상담 요약해줘'],
    auto: ['반복 업무를 자동으로', '자동 운영 상태 보여줘'], site: ['홈페이지를 만들고 게시합니다', 'AI로 홈페이지 만들어줘'], sales: ['매출 · 결제를 봅니다', '이번 달 매출 요약해줘'],
    billing: ['청구서를 보냅니다', '미납 청구서 보여줘'], compliance: ['법정의무교육을 관리합니다', '미이수자 보여줘'], academic: ['학사 · 비교과를 관리합니다', '비교과 현황 보여줘'],
    lifelong: ['학습비 · 과정을 신고합니다', '신고 대상 보여줘'], hrd: ['HRD-Net에 보고합니다', 'HRD 보고 준비해줘'], org: ['기관 정보를 관리합니다', '기관 정보 보여줘'],
    conn: ['외부 서비스를 연결합니다', 'Slack 연결 도와줘'], calendar: ['학사 일정을 관리합니다', '이번 달 일정 보여줘'], dbook: ['디지털 교재를 만듭니다', '디지털북 만들어줘'], clib: ['영상 · 교안 · 퀴즈를 모아 만듭니다', '콘텐츠 라이브러리 사용법 알려줘'], lmsa: ['학기 · 교과목 · 분반을 준비합니다', '학기 · 교과목 현황 보여줘'],
    tutorial: ['튜토리얼을 만듭니다', '튜토리얼 만들어줘'], docs: ['문서를 만들고 보관합니다', '수강 안내문 만들어줘'], cpl: ['인가 · 규정을 지킵니다', '규정 점검해줘'],
    crmstu: ['원생을 등록하고 관리합니다', '원생 등록해줘'], crmatt: ['등원 · 출결을 체크합니다', '오늘 미등원 보여줘'], crmex: ['시험 성적을 기록합니다', '성적 알림 보내줘'],
    crmcs: ['상담을 기록합니다', '상담 필요한 원생'], crmbill: ['수강료를 청구합니다', '다음 달 청구해줘'], crmstat: ['원생 · 매출 통계를 봅니다', '이번 달 통계 보여줘'],
    grade: ['성적을 관리합니다', '성적 입력 현황'], sis: ['학적 연동을 관리합니다', '학적 연동 상태'], aigov: ['AI 사용을 관리합니다', 'AI 사용량 보여줘']
  };
  const mdOf = id => (id === 'parents' && S && S.org && S.org.type !== 'k12' ? ['보호자를 연결합니다', '보호자에게 안내 보내줘'] : MD[id]) || [lab(WS[MENU[id]?.ws] || { label: '' }) + ' 기능', mlabel(id) + ' 알려줘'];
  window.slimMD = mdOf;

  /* ───────── 2. 공통 틀(휴대폰 설정형): 제목 · 칩 · 요약 · 목록 · 검색 ───────── */
  const AV = ['#5C74F6', '#00C53B', '#FF9800', '#109BF1', '#E5487A', '#7C5CF2', '#14A3A3', '#6C6C6C'];
  const avCol = s => AV[[...String(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  window.SL = {
    row: o => `<div class="sl-row ${o.cls || ''}" ${o.act ? `role="button" tabindex="0" data-act="${o.act}" data-v="${esc(o.v || '')}"` : ''} ${o.attr || ''}>
      <span class="sl-ic" style="background:${o.col || avCol(o.name)}">${o.icon || esc([...String(o.name || '?')][0] || '?')}</span>
      <span class="sl-tx"><b>${esc(o.name)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>${o.right != null ? `<span class="sl-r">${o.right}</span>` : `<span class="sl-r sl-go" aria-hidden="true">›</span>`}</div>`,
    chips: (key, L, cur) => `<div class="sl-chips" role="tablist">${L.map(([v, l]) => `<button type="button" role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-act="sl-chip" data-k="${key}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`,
    sum: (html, act, v) => `<${act ? 'button type="button"' : 'div'} class="sl-sum" ${act ? `data-act="${act}" data-v="${esc(v || '')}"` : ''}>${html}${act ? '<span class="sl-go">›</span>' : ''}</${act ? 'button' : 'div'}>`,
    note: (icon, a, b) => `<div class="sl-note"><span class="sl-ni">${icon}</span><span><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ''}</span></div>`,
    search: (key, ph) => `<div class="sl-search">${ic('search' in IC ? 'search' : 'spark', 16)}<input type="search" data-chg="sl-q" data-k="${key}" value="${esc(UI[key] || '')}" placeholder="${esc(ph || '검색')}" aria-label="${esc(ph || '검색')}"></div>`,
    list: rows => `<div class="sl-list">${rows.join('') || '<div class="sl-empty">항목이 없습니다.</div>'}</div>`,
    page: (title, right, body) => `<div class="sl-page"><div class="sl-h"><h2>${esc(title)}</h2>${right ? `<div class="sl-hr">${right}</div>` : ''}</div>${body}</div>`,
    /* 누르면 열리는 시트(휴대폰은 아래에서, PC는 오른쪽 패널) — 설명 · 단계 · 입력 칸은 여기서만 보인다 */
    sheet: (title, html, foot) => { slClose(); const w = document.createElement('div'); w.className = 'sl-sheetw'; w.id = 'slSheet';
      w.innerHTML = `<div class="sl-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sl-sh"><b>${esc(title)}</b><button type="button" class="x" data-act="sl-close" aria-label="닫기">${ic('x', 18)}</button></div><div class="sl-sb">${html}</div>${foot ? `<div class="sl-sf">${foot}</div>` : ''}</div>`;
      document.body.appendChild(w); w.addEventListener('click', e => { if (e.target === w) slClose(); }); requestAnimationFrame(() => w.classList.add('on'));
      const f = w.querySelector('input:not([type=hidden]),select,textarea,button.btn'); f && f.focus({ preventScroll: true }); return w; },
    avCol
  };
  const slClose = () => { const w = $('#slSheet'); w && w.remove(); };
  window.slClose = slClose;
  ACT['sl-close'] = slClose;
  addEventListener('keydown', e => { if (e.key === 'Escape' && $('#slSheet')) slClose(); if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.sl-row[role=button]')) { e.preventDefault(); e.target.click(); } });
  ACT['sl-chip'] = el => { UI[el.dataset.k] = el.dataset.v; render(); };
  ACT['sl-q'] = el => { UI[el.dataset.k] = el.value; const p = el.selectionStart; render(); const n = document.querySelector(`[data-chg="sl-q"][data-k="${el.dataset.k}"]`); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (e) { } } };

  /* ───────── 3. 메뉴 추가(카탈로그) ───────── */
  WS.more = { label: '메뉴 추가', icon: 'grid', desc: '' };
  const allTabs = () => Object.entries(S.nav.tabs).flatMap(([w, A]) => (A || []).filter(x => MENU[x.id] && !(/^(lms|sis|rfpmap|grade)/.test(x.id) && S.org.type !== 'univ') && !(MENU[x.id].only && MENU[x.id].only !== S.org.type && !(S.org.type === 'univ' && MENU[x.id].only === 'univ'))).map(x => ({ ...x, w })));
  VIEWS.menus = () => { const f = UI.slMenuF || 'all', q = (UI.slMenuQ || '').trim(); const A = allTabs(); const E = slimEss();
    const wsL = [...new Set(A.map(x => x.w))].filter(w => WS[w]); const L = A.filter(x => (f === 'all' || (f === 'on' ? x.on : x.w === f)) && (!q || (mlabel(x.id) + mdOf(x.id)[0]).includes(q)));
    const on = A.filter(x => x.on);
    return SL.page('메뉴 추가', `<button class="btn ghost" data-act="sl-menuorder">순서 바꾸기</button><button class="btn" data-act="sl-reset-menu">기본 메뉴로</button>`,
      
      SL.chips('slMenuF', [['all', '전체'], ['on', `켜짐 ${on.length}`], ...wsL.map(w => [w, lab(WS[w])])], f) +
      SL.list(L.map(x => SL.row({ name: mlabel(x.id), sub: mdOf(x.id)[0] + (E.includes(x.id) ? ' · 기본' : ''), col: x.on ? 'var(--s400)' : 'var(--g500)', icon: esc([...mlabel(x.id)][0]),
        right: `<button type="button" class="sl-sw ${x.on ? 'on' : ''}" role="switch" aria-checked="${x.on}" aria-label="${esc(mlabel(x.id))} ${x.on ? '끄기' : '켜기'}" data-act="sl-menu" data-v="${x.id}"><i></i></button>` }))) +
      SL.search('slMenuQ', '메뉴 검색'));
  };
  window.slMenuSet = (id, on) => { const t = Object.values(S.nav.tabs).flat().find(x => x.id === id); if (!t) return false; t.on = on; save(); return true; };
  ACT['sl-menu'] = el => { const id = el.dataset.v; const t = Object.values(S.nav.tabs).flat().find(x => x.id === id); if (!t) return; slMenuSet(id, !t.on); toast(`'${mlabel(id)}' 메뉴를 ${t.on ? '켰습니다 — 왼쪽 메뉴에 생겼습니다' : '껐습니다'}.`, 'ok'); render(); };
  ACT['sl-reset-menu'] = () => { slimApply(); save(); render(); toast('기본 메뉴로 되돌렸습니다.', 'ok'); };

  /* 사이드바: 켜진 메뉴가 없는 공간은 숨긴다(v37: 아래 [+ 메뉴 추가]는 설정 › 메뉴로) */
  { const base = rail; rail = () => { const keep = S.nav.ws; const vis = keep.filter(w => w === 'home' || w === 'dash' || wsTabs(w).length);
      const sv = S.nav.ws; S.nav.ws = vis; let h; try { h = base(); } finally { S.nav.ws = sv; }
      return h; /* v37: 레일의 '메뉴 추가'는 설정 › 메뉴 카드로 옮겼다 */ }; }
  /* '메뉴 추가'는 탭이 없는 공간(more) — 화면은 VIEWS.menus */
  { const base = safeView; safeView = () => { if (CUR.ws === 'more') { if (S.me.role === 'teacher') return '<div class="empty">교수자 권한으로는 메뉴를 바꿀 수 없습니다.</div>'; try { return VIEWS.menus(); } catch (e) { console.error(e); } } return base(); }; }

  /* ───────── 4. 연결(Connect) — 휴대폰 '앱 및 서비스 연결하기'처럼 ───────── */
  const CN_CAT = { claude: 'ai', mcp: 'ai', slack: 'msg', google: 'work', toss: 'pay', channeltalk: 'msg' };
  const CN_ONE = { claude: 'AI SAM 대화 · 문서 만들기', mcp: '다른 AI가 우리 데이터로 일하기', slack: '알림을 채널로 받기', google: '캘린더 · 시트 · 메일', toss: '수강료 온라인 결제', channeltalk: '홈페이지 상담 버튼' };
  if (typeof VIEWS.conn === 'function') {
    const oldConn = VIEWS.conn; window.slOldConn = oldConn;
    VIEWS.conn = () => { if (UI.slConnOld) return `<div class="sl-back"><button class="btn ghost" data-act="sl-connold" data-v="0">‹ 연결 목록</button></div>` + oldConn();
      cnEnsure(); const f = UI.slCnF || 'all', q = (UI.slCnQ || '').trim();
      const on = CN_IDS.filter(id => cnStatus(id).st === CN_ST.on);
      const L = CN_IDS.filter(id => (f === 'all' || CN_CAT[id] === f) && (!q || (CN[id].name + CN_ONE[id]).toLowerCase().includes(q.toLowerCase())));
      const P = S.autos.filter(a => (a.actions || []).some(x => CN_ACT[x]));
      return SL.page('연결', `<button class="btn" data-act="sl-connold" data-v="1">자세히</button>`,
        SL.note(ic('lock' in IC ? 'lock' : 'gear', 18), '연결 정보는 안전하게 보관됩니다', '키 · 토큰은 화면에 가려서 표시합니다') +
        SL.chips('slCnF', [['all', '전체'], ['work', '업무툴'], ['pay', '결제'], ['msg', '메시지'], ['ai', 'AI']], f) +
        (on.length ? SL.sum(`<span>연결됨</span><span class="sl-logos">${on.map(id => typeof brandLogo === 'function' ? brandLogo(id, 26, CN[id].name) : `<i style="background:${CN[id].col}">${esc(CN[id].logo)}</i>`).join('')}</span><span class="sl-n">${on.length}</span>`, 'sl-cnf', 'on') : '') +
        SL.list(L.map(id => { const s = cnStatus(id); const ok = s.st === CN_ST.on, chk = s.st === CN_ST.chk;
          return SL.row({ act: 'sl-cn', v: id, name: CN[id].name.replace(/\(.*\)/, '').trim(), sub: CN_ONE[id], col: typeof brandLogo === 'function' ? 'transparent' : CN[id].col, icon: typeof brandLogo === 'function' ? brandLogo(id, 44, CN[id].name) : esc(CN[id].logo),
            right: ok ? '<span class="sl-ok" aria-label="연결됨">✓</span>' : chk ? '<span class="sl-dot" aria-label="점검 필요">!</span>' : '<span class="sl-plus" aria-label="연결">+</span>' }); })) +
        (P.length ? SL.sum(`<span>연결형 자동화 ${P.length}개</span>`, 'go', 'auto') : '') +
        SL.search('slCnQ', '서비스 검색'));
    };
    ACT['sl-connold'] = el => { UI.slConnOld = el.dataset.v === '1'; render(); };
    ACT['sl-cnf'] = () => { UI.slCnF = 'all'; render(); };
    /* 줄을 누르면 시트에서 설명 · 연결 단계 · 입력 칸(기존 카드 그대로 — 동작 동등) */
    ACT['sl-cn'] = el => { const id = el.dataset.v; if (S.me.role !== 'owner') { toast('외부 연결은 정운영자만 관리할 수 있습니다.', 'warn'); return; } UI.cnOpen = id;
      const w = SL.sheet(CN[id].name, `<div class="sl-sheetcard">${cnCard(id)}</div>`, `<button class="btn ai" data-act="chat-q" data-v="${esc(CN[id].name.split(' ')[0])} 연결 도와줘">${ic('spark', 14)} AI SAM에게 맡기기</button>`);
      const d = w.querySelector('details.cn-guide'); if (d) d.open = true; };
    /* 기존 '연결 안내 열기'(cn-open)도 새 화면 + 시트로 */
    ACT['cn-open'] = el => { const id = el.dataset.v; if (!CN[id]) return; if (S.me.role !== 'owner') { toast('외부 연결은 정운영자만 관리할 수 있습니다.', 'warn'); return; }
      if (typeof slMenuSet === 'function') slMenuSet('conn', true); closeModal(); UI.slConnOld = false; go('conn'); setTimeout(() => ACT['sl-cn']({ dataset: { v: id } }), 60); };
    /* 시트 안에서 연결 · 해제가 끝나면 시트를 새로 그린다 */
    { const b = render; window.slRerender = () => { const w = $('#slSheet'); const id = UI.cnOpen; if (w && id && CN[id] && CUR.tab === 'conn' && !UI.slConnOld) { const sb = w.querySelector('.sl-sb'); if (sb) sb.innerHTML = `<div class="sl-sheetcard">${cnCard(id)}</div>`; } }; AFTER.push(() => { try { slRerender(); } catch (e) { } }); }
  }

  /* ───────── 5. 명단 — 표 대신 목록(표로 보기 = 기존 화면 그대로) ───────── */
  if (typeof VIEWS.members === 'function') {
    const oldMem = VIEWS.members;
    VIEWS.members = () => { if (!slimFront('members') || UI.mem || UI.slMemTable || (typeof mbUniv === 'function' && mbUniv())) return (UI.mem || !slimFront('members') ? '' : `<div class="sl-back"><button class="btn ghost" data-act="sl-memtable" data-v="0">‹ 목록</button></div>`) + oldMem();
      try { mbEnsure(); } catch (e) { }
      const f = UI.memF || 'all'; const L = typeof mbFiltered === 'function' ? mbFiltered() : S.members; const cnt = g => S.members.filter(m => m.grade === g).length; const T = typeof mbTeacher === 'function' && mbTeacher();
      const wait = cnt('승인 대기'); const gn2 = id => (S.groups.find(g => g.id === id) || {}).name || '';
      const sub = m => [gn2(m.group), m.grade !== '정회원' ? m.grade : '', m.last && m.last <= addDays(today(), -14) ? `${daysAgo(m.last)}일 미접속` : ''].filter(Boolean).join(' · ') || '정회원';
      return SL.page(t('learner') + ' ' + S.members.filter(m => !m.withdrawn).length + '명', (T ? '' : `<button class="btn ghost" data-act="sl-memtable" data-v="1">표로 보기</button><button class="btn pri" data-act="mem-invite">+ 추가</button>`),
        SL.chips('memF', [['all', '전체'], ['정회원', '정회원'], ['승인 대기', `승인 대기${wait ? ' ' + wait : ''}`], ['준회원', '준회원'], ['거절', '거절']], f) +
        (wait && f !== '승인 대기' && !T ? SL.sum(`<span>가입 승인 대기</span><span class="sl-n sl-w">${wait}명</span>`, 'sl-chip2', '승인 대기') : '') +
        SL.list(L.slice(0, 200).map(m => SL.row({ act: 'mem-open', v: m.id, name: m.name || m.nick || m.sid, sub: sub(m),
          right: m.grade === '승인 대기' && !T ? `<span class="sl-acts"><button type="button" class="btn sm pri" data-act="mb-ok" data-v="${m.id}">승인</button></span>` : undefined }))) +
        (L.length > 200 ? `<p class="sl-more">${L.length - 200}명 더 있음 — 검색하거나 표로 보세요.</p>` : '') +
        SL.search('memQ', '이름 · 반 검색'));
    };
    ACT['sl-memtable'] = el => { UI.slMemTable = el.dataset.v === '1'; render(); };
    ACT['sl-chip2'] = el => { UI.memF = el.dataset.v; render(); };
    
  }

  /* ───────── 6. 화면 설명은 ⓘ로(목록에는 이름과 한 줄, 설명은 누른 뒤에) ───────── */
  const slTips = () => { const main = $('#main'); if (!main) return;
    main.querySelectorAll('.ph .phl > p, .wh > div > p, .bhdl > p.uxdesc').forEach(p => { const tx = p.textContent.trim(); if (!tx || p.dataset.sl) return; p.dataset.sl = 1; p.hidden = true;
      const h = p.parentElement.querySelector('h1,h2') || [...main.querySelectorAll('.sl-h h2'), ...main.querySelectorAll('.bhdl > h1, .wh h1')].find(x => !x.hidden); if (!h || h.querySelector('.sl-i') || h.hidden) return;
      h.insertAdjacentHTML('beforeend', `<button type="button" class="sl-i" data-act="sl-tip" aria-label="이 화면 설명" data-tip="${esc(tx)}">i</button>`); });
    /* 안내 줄(경고 · 노란 띠)은 한 줄 요약 + 눌러서 보기로 */
    main.querySelectorAll('.mb-note, .warnl-note').forEach(n => { n.classList.add('sl-compact'); });
  };
  const slHead = () => { const main = $('#main'); if (!main || !main.querySelector('.sl-page')) return; main.querySelectorAll('.bhdl > h1, .bhdl > b, .bhdl > small, .bhdl > p, .wh > div:first-child > h1, .wh > div:first-child > p, .bhd > [data-act="chat-q"], .bhd .bhdr > [data-act="chat-q"]').forEach(e => { e.hidden = true; }); }; /* 머리의 「AI SAM에게 맡기기」는 떠 있는 AI SAM 버튼과 겹치므로 목록 화면에서는 숨김 */
  AFTER.push(() => { slHead(); slTips(); setTimeout(() => { slHead(); slTips(); }, 0); });
  ACT['sl-tip'] = el => { const o = $('.sl-pop'); if (o) { const same = o.dataset.for === el.dataset.tip; o.remove(); if (same) return; }
    const r = el.getBoundingClientRect(); const d = document.createElement('div'); d.className = 'sl-pop'; d.dataset.for = el.dataset.tip; d.setAttribute('role', 'tooltip'); d.textContent = el.dataset.tip;
    document.body.appendChild(d); const w = Math.min(320, innerWidth - 24); d.style.width = w + 'px'; d.style.left = Math.max(12, Math.min(r.left - 8, innerWidth - w - 12)) + 'px'; d.style.top = (r.bottom + 8 + scrollY) + 'px';
    setTimeout(() => addEventListener('click', function x(e) { if (!e.target.closest('.sl-pop') && e.target !== el) { d.remove(); removeEventListener('click', x, true); } }, true), 0); };

  /* ───────── 7. 설정 — 표시 전용 · 위험 버튼은 접어 두기 ───────── */
  AFTER.push(() => { if (CUR.ws !== 'settings') return; const main = $('#main'); if (!main) return;
    const fund = main.querySelector('#fundCard'); if (fund && !fund.closest('.sl-adv')) { const d = document.createElement('details'); d.className = 'sl-adv'; d.innerHTML = '<summary>고급 설정 <small>재원 표시 등</small></summary>'; fund.replaceWith(d); d.appendChild(fund); }
    main.querySelectorAll('[data-act="reset-all"]').forEach(b => { if (b.closest('.sl-danger')) return; const d = document.createElement('details'); d.className = 'sl-danger'; d.innerHTML = '<summary>위험 구역</summary>'; b.replaceWith(d); d.appendChild(b); b.classList.remove('red'); b.classList.add('ghost'); b.textContent = '기관 초기화'; });
  });
  /* ───────── v37 설정 한 화면(대표님 2026-11-10 '설정 UI UX가 헷갈려. 한 화면에 볼 수 있게', '메뉴 추가는 설정 페이지로') ─────────
     v34~36: 설정 목록 → 줄을 누르면 하위 화면(2~3단 탭)으로 들어갔다. v37: 묶음 카드 한 화면 — 카드마다 지금 값 요약 + 바로 고치는 칸,
     [펼치기]를 누르면 그 자리에서 기존 설정 화면(동작 그대로)이 열린다(한 번에 하나). 위의 검색으로 카드를 거른다.
     레일의 '메뉴 추가'는 없애고 '메뉴' 카드로 옮겼다(go('more')도 이 카드를 연다). */
  const SXN = { type: '기관 유형', onoff: '메뉴 켜고 끄기', menu: '메뉴 순서', service: '가입 · 회원', popup: '팝업 공지', integr: 'API · MCP', plan: '요금제', rules: '학습 규칙 · AI 튜터', home: '홈페이지 검색 노출', consult: '상담', terms: '약관', lang: '언어', data: '내보내기 · 초기화', room: '데이터룸 · 배포', cover: '기능 맵' };
  const sxLive = () => typeof LIVE !== 'undefined' && LIVE && LIVE.user;
  const sxPay = () => (typeof mbPayOn === 'function' ? mbPayOn() : true);
  const sxRow = (a, b) => `<div class="sx-kv"><span>${esc(a)}</span><b>${b}</b></div>`;
  const sxBtn = (l, act, v, cls) => `<button type="button" class="btn sm ${cls || ''}" data-act="${act}" data-v="${esc(v || '')}">${esc(l)}</button>`;
  const sxEdName = () => S.org.type === 'univ' && !/\(/.test(TYPES.univ.name) ? (S.org.ed === 'lms' ? '학사 LMS' : '사업단 · 센터') : ''; /* ulms.js가 유형 이름에 에디션을 이미 붙이면 다시 붙이지 않는다 */
  /* 외부 연결 카드: 연결할 수 있는 서비스(CN) + 다른 화면에서 쓰는 서비스(어디서 쓰는지로 이동) */
  const SX_EXT = () => [['kakao', '카카오', '상담 버튼 · 알림톡', 'sx-sub', 'site|consult'], ['naver', '네이버', '캘린더 보내기', 'go', 'calendar'], ['youtube', 'YouTube', '영상 가져오기 · 재생', 'sx-sub', 'conn|integr'],
    ['zoom', 'Zoom', '라이브 수업 링크', 'sx-soon', 'Zoom'], ['notion', 'Notion', 'MCP로 연결', 'sx-soon', 'Notion'], ['microsoft', 'Microsoft', 'Teams · Outlook(MCP)', 'sx-soon', 'Microsoft'],
    ...(S.org.type === 'voc' ? [['hrdnet', 'HRD-Net', '훈련 보고', 'go', 'hrd']] : [])];
  const SXC = () => { const O = S.me.role === 'owner'; const st = S.settings || {};
    const adm = S.admins || []; const rc = r => adm.filter(a => a.role === r).length;
    const onM = Object.values(S.nav.tabs).flat().filter(x => x.on && MENU[x.id]);
    const cnOnL = typeof CN_IDS !== 'undefined' ? CN_IDS.filter(id => { try { return cnStatus(id).st === CN_ST.on; } catch (e) { return false; } }) : [];
    const nr = st.nudgeRule || { on: !!st.nudge }; const au = (S.autos || []).filter(a => a.on).length; const pops = (st.popups || []).filter(p => p.on !== false).length;
    const pgOn = st.pg === 'toss' && st.toss && st.toss.status === '승인';
    return [
      { k: 'org', n: '기관 정보', i: 'gear', subs: ['type'], kw: '기관 이름 유형 주소 도메인 홈페이지 주소 에디션',
        sum: `${TYPES[S.org.type].name}${sxEdName() ? ' · ' + sxEdName() : ''}`,
        q: () => sxRow('기관 이름', esc(S.org.name)) + sxRow('기관 유형', esc(TYPES[S.org.type].name + (sxEdName() ? ' · ' + sxEdName() : ''))) + sxRow('홈페이지 주소', `<code>${esc(S.org.domain || '')}</code>`) + sxRow('부르는 말', esc(`${t('learner')} · ${t('cls')} · ${t('teacher')}`)) },
      { k: 'menu', n: '메뉴', i: 'grid', subs: ['onoff', 'menu'], kw: '메뉴 추가 켜기 끄기 순서 왼쪽 레일 사이드바 기본 메뉴',
        sum: `켜진 메뉴 ${onM.length}개`,
        q: () => `<div class="sx-chips">${onM.slice(0, 10).map(x => `<span>${esc(mlabel(x.id))}</span>`).join('')}${onM.length > 10 ? `<span>+${onM.length - 10}</span>` : ''}</div><div class="sx-acts">${sxBtn('+ 메뉴 추가 · 켜고 끄기', 'sx-sub', 'menu|onoff', 'pri')}${sxBtn('순서 바꾸기', 'sx-sub', 'menu|menu')}</div>` },
      { k: 'users', n: '사용자 · 권한', i: 'users', subs: ['service'], kw: '운영자 권한 부운영자 교수 강사 교수자 가입 승인 회원 가입 질문 초대',
        sum: `운영자 ${adm.length}명 · 가입 ${esc(st.join || '자동 수락')}`,
        q: () => sxRow('정운영자 · 부운영자', `${rc('owner')}명 · ${rc('sub')}명`) + sxRow(t('teacher'), `${rc('teacher')}명`) + sxRow('가입 방식', esc(st.join || '자동 수락')) +
          `<div class="sx-acts">${MENU.admins ? sxBtn('운영자 · 권한 관리', 'go', 'admins') : ''}${sxBtn('가입 설정', 'sx-sub', 'users|service')}</div>` },
      { k: 'notify', n: '알림', i: 'chat', subs: ['popup'], kw: '알림 독려 미접속 자동 운영 메시지 팝업 공지 슬랙',
        sum: `독려 알림 ${nr.on ? '켜짐' : '꺼짐'} · 자동 운영 ${au}개`,
        q: () => `<div class="sx-kv"><span>미접속 · 진도 독려 알림</span><button type="button" class="sl-sw ${nr.on ? 'on' : ''}" role="switch" aria-checked="${!!nr.on}" aria-label="독려 알림 ${nr.on ? '끄기' : '켜기'}" data-act="sx-nudge"><i></i></button></div>` +
          sxRow('켜진 자동 운영', `${au}개`) + sxRow('홈페이지 팝업', `${pops}개 노출 중`) + `<div class="sx-acts">${sxBtn('자동 운영 열기', 'go', 'auto')}${sxBtn('팝업 공지', 'sx-sub', 'notify|popup')}</div>` },
      { k: 'conn', n: '외부 연결', i: 'send', subs: ['integr'], kw: '연결 slack google 구글 토스 채널톡 카카오 네이버 zoom 줌 youtube 유튜브 notion 노션 microsoft 마이크로소프트 mcp api claude 클로드 hrd',
        sum: `연결됨 ${cnOnL.length}개`,
        q: () => `<div class="sx-logos">${(typeof CN_IDS !== 'undefined' ? CN_IDS : []).map(id => { let on = false; try { on = cnStatus(id).st === CN_ST.on; } catch (e) { }
            return `<button type="button" class="sx-lg ${on ? 'on' : ''}" data-act="${O ? 'sl-cn' : 'sx-owner'}" data-v="${id}" aria-label="${esc(CN[id].name)} ${on ? '연결됨' : '연결하기'}">${typeof brandLogo === 'function' ? brandLogo(id, 36, CN[id].name) : esc(CN[id].logo)}<small>${esc(CN[id].name.replace(/\(.*\)| API 키/g, '').trim())}</small><em>${on ? '연결됨' : '연결'}</em></button>`; }).join('')}
          ${SX_EXT().map(([id, n, d, act, v]) => `<button type="button" class="sx-lg ext" data-act="${act}" data-v="${esc(v)}" aria-label="${esc(n)} — ${esc(d)}">${typeof brandLogo === 'function' ? brandLogo(id, 36, n) : esc(n[0])}<small>${esc(n)}</small><em>${act === 'sx-soon' ? '준비 중' : esc(d)}</em></button>`).join('')}</div>` },
      ...(O || sxPay() ? [{ k: 'pay', n: sxPay() ? '요금제 · 결제' : '요금제', i: 'chart', subs: O ? ['plan'] : [], kw: '요금제 플랜 결제 수강료 pg 토스 환불 매출 청구',
        sum: `${esc(({ standard: '스탠다드', premium: '프리미엄', enterprise: '엔터프라이즈' })[S.org.plan] || '체험')}${sxPay() ? ` · 결제 ${pgOn ? '연결됨' : '미연결'}` : ''}`,
        q: () => sxRow('요금제', esc(({ standard: '스탠다드', premium: '프리미엄', enterprise: '엔터프라이즈' })[S.org.plan] || '체험')) + (sxPay() ? sxRow(`${t('fee')} 온라인 결제`, pgOn ? '토스페이먼츠 연결됨' : '연결 전') : '') +
          `<div class="sx-acts">${O ? sxBtn('요금제 보기', 'sx-sub', 'pay|plan') : ''}${sxPay() && MENU.sales ? sxBtn('매출 · 결제 열기', 'go', 'sales') : ''}${sxPay() && O && !pgOn ? sxBtn('결제 연결', 'sl-cn', 'toss') : ''}</div>` }] : []),
      { k: 'learn', n: '학습 규칙 · AI 튜터', i: 'book', subs: ['rules'], kw: '진도 수료 이수 기준 배속 건너뛰기 ai 튜터 학습 규칙', sum: '진도 · 수료 기준 · AI 튜터',
        q: () => `<div class="sx-acts">${sxBtn('학습 규칙 열기', 'sx-sub', 'learn|rules')}</div>` },
      { k: 'site', n: '홈페이지 · 약관', i: 'globe', subs: ['home', 'consult', 'terms'], kw: '홈페이지 검색 노출 seo 상담 약관 개인정보 처리방침 카카오 채널톡',
        sum: `약관 ${(st.termsHist || []).length ? '버전 ' + (st.termsHist || []).length + '개' : '기본'} · 상담 ${st.consultKeys || st.kakao ? '연결' : '없음'}`,
        q: () => sxRow('검색 제목', esc((st.seo || {}).title || '—')) + `<div class="sx-acts">${sxBtn('검색 노출', 'sx-sub', 'site|home')}${sxBtn('상담', 'sx-sub', 'site|consult')}${sxBtn('약관', 'sx-sub', 'site|terms')}</div>` },
      { k: 'lang', n: '언어', i: 'globe', subs: ['lang'], kw: '언어 영어 일본어 중국어 베트남어 번역', sum: '화면 · 사이트 언어',
        q: () => `<div class="sx-acts">${sxBtn('언어 설정', 'sx-sub', 'lang|lang')}</div>` },
      { k: 'data', n: '데이터', i: 'gear', subs: ['data', ...(O ? ['room'] : []), 'cover'], kw: '데이터 내보내기 백업 초기화 데이터룸 배포 기능 맵', sum: '내보내기 · 데이터룸',
        q: () => `<div class="sx-acts">${sxBtn('내보내기(JSON)', 'data-export', '')}${sxBtn('데이터 · 초기화', 'sx-sub', 'data|data')}${O ? sxBtn('데이터룸 · 배포', 'sx-sub', 'data|room') : ''}</div>` },
      ...(sxLive() ? [{ k: 'acct', n: '계정', i: 'users', subs: [], kw: '계정 로그인 아이디 이메일 비밀번호 변경 로그아웃', sum: esc(LIVE.user.email || ''),
        q: () => sxRow('로그인 아이디', esc(LIVE.user.email || '')) + `<div class="sx-acts">${sxBtn('비밀번호 변경', 'live-pw', '')}${sxBtn('로그아웃', 'live-logout', '', 'ghost')}</div>` }] : [])
    ]; };
  window.SXC = SXC;
  /* 메뉴 켜고 끄기(예전 '메뉴 추가' 화면 본문) */
  const menusBody = () => { const f = UI.slMenuF || 'all', q = (UI.slMenuQ || '').trim(); const A = allTabs(); const E = slimEss();
    const wsL = [...new Set(A.map(x => x.w))].filter(w => WS[w]); const L = A.filter(x => (f === 'all' || (f === 'on' ? x.on : x.w === f)) && (!q || (mlabel(x.id) + mdOf(x.id)[0]).includes(q)));
    const on = A.filter(x => x.on);
    return SL.chips('slMenuF', [['all', '전체'], ['on', `켜짐 ${on.length}`], ...wsL.map(w => [w, lab(WS[w])])], f) +
      SL.list(L.map(x => SL.row({ name: mlabel(x.id), sub: mdOf(x.id)[0] + (E.includes(x.id) ? ' · 기본' : ''), col: x.on ? 'var(--s400)' : 'var(--g500)', icon: esc([...mlabel(x.id)][0]),
        right: `<button type="button" class="sl-sw ${x.on ? 'on' : ''}" role="switch" aria-checked="${x.on}" aria-label="${esc(mlabel(x.id))} ${x.on ? '끄기' : '켜기'}" data-act="sl-menu" data-v="${x.id}"><i></i></button>` }))) +
      `<div class="sx-acts">${sxBtn('기본 메뉴로', 'sl-reset-menu', '')}</div>` + SL.search('slMenuQ', '메뉴 검색'); };
  window.slMenusBody = menusBody;
  /* mem2.js가 DOMContentLoaded에 감싸는 층(결제 · 수납 카드)까지 안쪽에 두려고 같은 시점에 가장 바깥에서 감싼다 */
  document.addEventListener('DOMContentLoaded', () => { const base = VIEWS.settings; window.slSetBase = base;
    VIEWS.settings = () => { UI.slSetIn = false; const C = SXC(); const q = (UI.slSetQ || '').trim().toLowerCase(); const open = UI.sxOpen || '';
      const hit = c => !q || (c.n + ' ' + c.kw + ' ' + c.sum + ' ' + c.subs.map(x => SXN[x] || '').join(' ')).toLowerCase().includes(q);
      const L = C.filter(hit); const keepSet = UI.settings;
      const body = c => { if (open !== c.k || !c.subs.length) return ''; const sub = c.subs.includes(UI.sxSub) ? UI.sxSub : c.subs[0];
        let h = ''; if (sub === 'onoff') h = menusBody(); else { UI.settings = sub; try { h = base(); } catch (e) { console.error(e); h = '<div class="warn">이 설정을 표시하지 못했습니다.</div>'; } }
        return `<div class="sx-x">${c.subs.length > 1 ? `<div class="sl-chips sx-subs" role="tablist">${c.subs.map(x => `<button type="button" role="tab" aria-selected="${x === sub}" class="${x === sub ? 'on' : ''}" data-act="sx-sub" data-v="${c.k}|${x}">${esc(SXN[x] || x)}</button>`).join('')}</div>` : ''}<div class="sl-setx" data-sub="${esc(sub)}">${h}</div></div>`; };
      const cards = L.map(c => { const isOpen = open === c.k;
        return `<section class="sx-card ${isOpen ? 'open' : ''}" id="sx-${c.k}" data-k="${c.k}" aria-labelledby="sxh-${c.k}"><div class="sx-h"><span class="sx-ic">${ic(c.i in IC ? c.i : 'gear', 20)}</span><div class="sx-t"><h3 id="sxh-${c.k}">${esc(c.n)}</h3><small>${c.sum}</small></div>${c.subs.length ? `<button type="button" class="btn sm ghost sx-tog" data-act="sx-open" data-v="${c.k}" aria-expanded="${isOpen}">${isOpen ? '접기' : '펼치기'}</button>` : ''}</div>
          <div class="sx-q">${c.q()}</div>${body(c)}</section>`; }).join('');
      const out = `<div class="sx-page"><div class="sx-top">${SL.search('slSetQ', '설정 검색 — 예: 메뉴, 가입, 결제, 약관')}</div>${L.length ? `<div class="sx-grid">${cards}</div>` : `<div class="sl-empty">「${esc(UI.slSetQ)}」에 맞는 설정이 없습니다.</div>`}</div>`;
      if (open && C.find(c => c.k === open)) { const c = C.find(x => x.k === open); UI.settings = c.subs.includes(UI.sxSub) ? UI.sxSub : (c.subs[0] || keepSet); } else UI.settings = keepSet;
      return out; }; });
  /* 하위 키(plan · integr · …)가 들어 있는 카드 */
  const sxCardOf = sub => { const c = SXC().find(x => x.subs.includes(sub)); return c ? c.k : ''; };
  window.slSetOpen = (sub, scroll) => { const k = sxCardOf(sub); if (!k) return false; UI.sxOpen = k; UI.sxSub = sub; UI.settings = sub === 'onoff' ? UI.settings : sub; if (scroll) UI.sxScroll = k; return true; };
  ACT['sx-open'] = el => { const k = el.dataset.v; if (UI.sxOpen === k) { UI.sxOpen = ''; } else { UI.sxOpen = k; const c = SXC().find(x => x.k === k); UI.sxSub = c && c.subs[0]; } render(); };
  ACT['sx-sub'] = el => { const [k, sub] = String(el.dataset.v).split('|'); if (CUR.ws !== 'settings') { go('settings'); } UI.sxOpen = k; UI.sxSub = sub; UI.sxScroll = k; render(); };
  ACT['sx-soon'] = el => toast(`${el.dataset.v} 연결은 준비 중입니다. 지금은 설정 › 외부 연결 › API · MCP(MCP 키)로 외부 AI 앱과 연결해 쓸 수 있습니다.`);
  ACT['sx-owner'] = () => toast('외부 연결은 정운영자만 관리할 수 있습니다.', 'warn');
  ACT['sx-nudge'] = () => { const st = S.settings; const r = st.nudgeRule = st.nudgeRule || { base: 'period', v: 50, rate: 30, when: '09:00', on: !!st.nudge }; r.on = !r.on; st.nudge = r.on; logAudit(`독려 알림 ${r.on ? '켜기' : '끄기'}`); save(); render(); toast(`미접속 · 진도 독려 알림을 ${r.on ? '켰습니다' : '껐습니다'}.`, 'ok'); };
  /* 예전 진입점 호환: 목록 줄(sl-set) · ‹ 설정 · 하위 화면 바로가기 · '메뉴 추가'(more) */
  ACT['sl-set'] = el => { const k = el.dataset.v; if (k.startsWith('act:')) { const f = ACT[k.slice(4)]; if (f) f(el); return; } if (k.startsWith('go:')) { const t2 = k.slice(3); if (t2 === 'conn') { ACT['sl-goconn'](); return; } if (t2 === 'more') { slSetOpen('onoff', true); go('settings'); return; } go(t2); return; } slSetOpen(k, true); render(); };
  ACT['sl-setback'] = () => { UI.sxOpen = ''; render(); };
  { const base = go; go = (id, keep) => { if (id === 'more') { slSetOpen('onoff', true); id = 'settings'; }
      else if (['plan', 'integr', 'service', 'terms', 'popup', 'consult', 'lang', 'rules', 'data', 'room'].includes(id)) { slSetOpen(id, true); const r = base('settings', keep); return r; }
      return base(id, keep); }; }
  /* 깊은 링크로 연 카드는 화면에 보이게 */
  AFTER.push(() => { if (CUR.ws !== 'settings' || !UI.sxScroll) return; const k = UI.sxScroll; UI.sxScroll = ''; setTimeout(() => { const e = document.getElementById('sx-' + k); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'start' }); }, 90); });
  ACT['sl-menuorder'] = () => { slSetOpen('menu', true); go('settings'); };

  /* 기관 초기화: 기관 이름을 입력해야 실행(되돌릴 수 없음) */
  if (ACT['reset-all']) { const base = ACT['reset-all']; ACT['reset-all'] = (...a) => modal('기관 초기화', `<p>데모 데이터를 모두 지우고 가입 화면으로 돌아갑니다. 되돌릴 수 없습니다.</p><label class="fl">확인을 위해 기관 이름 「${esc(S.org.name)}」을 입력하세요<input name="nm" autocomplete="off"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '초기화', kind: 'red', run: w => { if (fv(w, 'nm') !== S.org.name) { toast('기관 이름이 일치하지 않습니다.', 'warn'); return false; } closeModal(); setTimeout(() => { base(...a); setTimeout(() => { const ok = $('#modal [data-mact=ok]'); ok && ok.click(); }, 30); }, 0); return false; } }]); }

  /* v36: 운영(라이브) 머리의 관리자 아이디 · 비밀번호 변경 · 로그아웃은 머리에서 숨긴다(대표님 2026-11-09) — 기능은 설정 › 계정에 */
  AFTER.push(() => { const a = $('#liveAcct'); if (a && !a.hidden) { a.hidden = true; a.style.display = 'none'; a.setAttribute('aria-hidden', 'true'); } });

  /* ───────── 8. 홈 — 입력창 + 추천 + 오늘 할 일만, 나머지는 한 줄 요약 ───────── */
  AFTER.push(() => { if (CUR.ws !== 'home') return; const R = $('#main .aih'); if (!R || R.dataset.sl) return; R.dataset.sl = 1;
    R.querySelectorAll('.aih-note, .aih-menu').forEach(e => e.hidden = true);
    R.querySelectorAll('.uxtodo *').forEach(e => { if (!e.children.length && /계획을 먼저 보여/.test(e.textContent)) e.hidden = true; });
    const g = R.querySelector('.aih-guide'); if (g && g.textContent.trim()) { const cur = g.querySelector('.obd b, .obd h3, .obd .obd-t'); const m = /(\d)\s*\/\s*(\d)/.exec(g.textContent); const nx = (/\d단계\s*([^·|\n]+)/.exec(g.textContent) || [])[1] || '';
      if (m && m[1] !== m[2]) { const s = document.createElement('div'); s.innerHTML = SL.sum(`<span>시작 가이드</span><span class="sl-sub">다음: ${esc(nx.trim())}</span><span class="sl-n">${m[1]}/${m[2]}</span>`, 'sl-guide', ''); g.before(s.firstElementChild); }
      g.hidden = !UI.slGuideOpen; }
    const two = R.querySelector('.aih-two'); if (two) { const on = (typeof CN_IDS !== 'undefined' ? CN_IDS.filter(id => cnStatus(id).st === CN_ST.on) : []); const au = (S.autos || []).filter(a => a.on).length;
      const box = document.createElement('div'); box.className = 'sl-homesum';
      box.innerHTML = (typeof CN_IDS !== 'undefined' && S.me.role === 'owner' ? SL.sum(`<span>연결</span><span class="sl-logos">${on.map(id => typeof brandLogo === 'function' ? brandLogo(id, 26, CN[id].name) : `<i style="background:${CN[id].col}">${esc(CN[id].logo)}</i>`).join('')}</span><span class="sl-n">${on.length}/${CN_IDS.length}</span>`, 'sl-goconn', '') : '') +
        (S.me.role !== 'teacher' ? SL.sum(`<span>자동 운영</span><span class="sl-n">${au}개 켜짐</span>`, 'sl-goauto', '') : '');
      two.replaceWith(box); }
  });
  /* 코드 · AI SAM · 테스트가 부르는 go()로 꺼진 메뉴를 열 때는 메뉴 구성을 바꾸지 않고 그 화면만 연다 */
  { const base = go; go = (id, keep) => { let t = null; try { if (S && S.org && MENU[id] && !menuOn(id) && !(MENU[id].only && MENU[id].only !== S.org.type)) { t = Object.values(S.nav.tabs).flat().find(x => x.id === id); if (t) t.on = true; } } catch (e) { }
    try { return base(id, keep); } finally { if (t) t.on = false; } }; }
  ACT['sl-guide'] = () => { UI.slGuideOpen = !UI.slGuideOpen; const g = $('#main .aih-guide'); if (g) g.hidden = !UI.slGuideOpen; };
  ACT['sl-goconn'] = () => { if (typeof slMenuSet === 'function') slMenuSet('conn', true); UI.slConnOld = false; go('conn'); };
  ACT['sl-goauto'] = () => { slMenuSet('auto', true); go('auto'); };
  /* 꺼진 메뉴로 가는 링크(홈 · 가이드 · 안내의 [이동] 버튼)를 사람이 누르면 막지 않고 그 메뉴를 켜서 연다 — 필요할 때 켜진다. 코드에서 부르는 go()는 그대로 */
  { const base = ACT.go; ACT.go = (el, ...r) => { const id = el && el.dataset && el.dataset.v; try { if (S && S.org && MENU[id] && !menuOn(id) && !(MENU[id].owner && S.me.role !== 'owner') && !(S.me.role === 'teacher' && TEACH_NO.includes(id)) && (!MENU[id].only || MENU[id].only === S.org.type) && Object.values(S.nav.tabs).flat().some(x => x.id === id)) { slMenuSet(id, true); toast(`'${mlabel(id)}' 메뉴를 켰습니다. 끄려면 [메뉴 추가]에서 끄세요.`, 'ok'); } } catch (e) { } return base(el, ...r); }; }

  /* v37 기관 유형을 바꾼 뒤 이름 · 호칭 · 메뉴가 서로 어긋나던 문제(대표님 첨부 '닉 Univ' — 레일 '교육생', 홈 '센터 담당자님', 사이트 '교육신청')
     설정 › 기관 유형 변경(type-chg)은 유형 · 프리셋 메뉴만 바꿨다. 이제 유형이 바뀌면 같은 자리에서: 대학 에디션 정리(대학이면 기본 lite, 아니면 삭제) ·
     유형별 기본 메뉴(slimApply) 다시 적용 — 레일 라벨(t()) · 첫 화면 호칭(aihKey) · 사이트 메뉴 이름(HPS.menuName)이 모두 같은 S.org.type · S.org.ed를 본다. */
  AFTER.push(() => { if (!S || !S.org) return; const k = S.org.type + '/' + (S.org.ed || ''); if (S.org.tySeen === k) return; const first = !S.org.tySeen; S.org.tySeen = k; if (first) return;
    if (S.org.type === 'univ') { if (S.org.ed !== 'lms') S.org.ed = 'lite'; } else delete S.org.ed;
    S.org.tySeen = S.org.type + '/' + (S.org.ed || ''); try { slimApply(); } catch (e) { console.error(e); } save(); setTimeout(render, 0); });
  /* 기존 사용자 한 번 안내 */
  AFTER.push(() => { if (!UI.slimNote) return; UI.slimNote = 0; toast('메뉴를 꼭 필요한 것만 남겼습니다. 다른 메뉴는 설정 › 메뉴에서 켜세요.', 'ok'); });
})();
