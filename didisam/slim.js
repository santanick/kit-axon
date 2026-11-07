/* v34 단순화 층(slim) — 대표님(2026-11-07): '필요 없는 화면 정리 · 빈 가이드 채우기 · 필수 시나리오 위주, 더 필요한 건 메뉴를 켜서 추가 ·
   휴대폰 「앱 및 서비스 연결하기」처럼 전반적인 UI UX를 심플하게(목록에는 이름과 한 줄, 설명은 누른 뒤에)'.
   이 파일은 다른 스크립트를 모두 읽은 뒤(boot.js 바로 앞) 읽는다. 기능은 지우지 않고, 보이는 것만 줄인다(마이그레이션 동등성). */
(function () {
  /* ───────── 1. 기관 유형별 필수 메뉴(사이드바 기본) ───────── */
  const ESS = {
    adult: ['class', 'members', 'enroll', 'message', 'sales', 'site'],
    k12: ['crmstu', 'crmatt', 'class', 'crmbill', 'message', 'site'],
    univ: ['class', 'members', 'enroll', 'board', 'academic', 'site'],
    univ_lms: null, /* 학사 LMS는 업무 단위 3단 메뉴(ulms.js)를 그대로 쓰고, 아래 slimLms에서 줄인다 */
    corp: ['class', 'members', 'enroll', 'compliance', 'cert', 'board'],
    public: ['class', 'members', 'enroll', 'attend', 'cert', 'board'],
    lifelong: ['class', 'members', 'attend', 'cert', 'lifelong', 'site'],
    voc: ['class', 'members', 'attend', 'cert', 'hrd', 'message']
  };
  const essKey = () => S && S.org ? (S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type) : '';
  window.slimEss = () => { const k = essKey(); const E = ESS[k]; if (E) return E.filter(id => MENU[id]); /* 학사 LMS: 지금 켜진 탭 중 앞의 7개 */
    return Object.values(S.nav.tabs).flat().filter(x => x.on && MENU[x.id]).map(x => x.id).slice(0, 7); };
  function slimApply() { const E = slimEss(); if (!E.length) return;
    Object.keys(S.nav.tabs).forEach(w => { const A = S.nav.tabs[w] || []; A.forEach(x => { x.on = E.includes(x.id); }); A.sort((a, b) => (E.indexOf(a.id) + 1 || 99) - (E.indexOf(b.id) + 1 || 99)); });
    S.slim34 = 1; }
  window.slimApply = slimApply;
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org && !S.slim34) { const old = !!S.org.created && S.org.created < '2026-11-08'; slimApply(); if (old) UI.slimNote = 1; save(); } } catch (e) { console.error(e); } return r; }; }
  if (typeof createOrg === 'function') { const base = createOrg; createOrg = (...a) => { const r = base(...a); try { if (S && S.org) { slimApply(); save(); render(); } } catch (e) { console.error(e); } return r; }; }

  /* 메뉴 한 줄 설명(메뉴 추가 목록 · 화면 가이드에 쓴다) — 15자 안팎 */
  const MD = {
    class: ['과정을 만들고 운영해요', '수업 만들어줘'], journey: ['학습 경로를 묶어요', '러닝 저니 만들어줘'], diag: ['AI 진단 검사를 열어요', '진단 결과 요약해줘'],
    library: ['영상 · 자료를 모아 편성해요', '자료 올리는 법 알려줘'], assess: ['시험 · 과제를 내고 채점해요', '검수 대기 과제 보여줘'], badge: ['배지를 만들어 줘요', '배지 만들어줘'],
    cert: ['수료증을 발급해요', '수료 대상자 보여줘'], attend: ['출결을 기록해요', '오늘 출결 요약해줘'], book: ['교재 · 교구를 팔아요', '교재 등록해줘'],
    members: ['명단 · 가입 승인을 봐요', '승인 대기 보여줘'], enroll: ['초대 · 일괄 등록해요', '초대 링크 만들어줘'], groups: ['반 · 팀으로 묶어요', '반 나눠줘'],
    parents: ['보호자를 연결해요', '보호자 연결 안 된 학생'], admins: ['운영자 · 기록을 봐요', '운영자 추가해줘'], board: ['공지 · 알림을 보내요', '공지 써줘'],
    message: ['메시지 · 알림톡을 보내요', '미접속자에게 안내해줘'], community: ['게시판을 운영해요', '미답변 질문 보여줘'], consult: ['상담을 기록해요', '상담 요약해줘'],
    auto: ['반복 업무를 자동으로', '자동 운영 상태 보여줘'], site: ['홈페이지를 만들고 게시해요', 'AI로 홈페이지 만들어줘'], sales: ['매출 · 결제를 봐요', '이번 달 매출 요약해줘'],
    billing: ['청구서를 보내요', '미납 청구서 보여줘'], compliance: ['법정의무교육을 관리해요', '미이수자 보여줘'], academic: ['학사 · 비교과를 관리해요', '비교과 현황 보여줘'],
    lifelong: ['학습비 · 과정을 신고해요', '신고 대상 보여줘'], hrd: ['HRD-Net에 보고해요', 'HRD 보고 준비해줘'], org: ['기관 정보를 관리해요', '기관 정보 보여줘'],
    conn: ['외부 서비스를 연결해요', 'Slack 연결 도와줘'], calendar: ['학사 일정을 관리해요', '이번 달 일정 보여줘'], dbook: ['디지털 교재를 만들어요', '디지털북 만들어줘'],
    tutorial: ['튜토리얼을 만들어요', '튜토리얼 만들어줘'], docs: ['문서를 만들고 보관해요', '운영 문서 써줘'], cpl: ['인가 · 규정을 지켜요', '규정 점검해줘'],
    crmstu: ['원생을 등록하고 관리해요', '원생 등록해줘'], crmatt: ['등원 · 출결을 체크해요', '오늘 미등원 보여줘'], crmex: ['시험 성적을 기록해요', '성적 알림 보내줘'],
    crmcs: ['상담을 기록해요', '상담 필요한 원생'], crmbill: ['수강료를 청구해요', '다음 달 청구해줘'], crmstat: ['원생 · 매출 통계를 봐요', '이번 달 통계 보여줘'],
    grade: ['성적을 관리해요', '성적 입력 현황'], sis: ['학적 연동을 관리해요', '학적 연동 상태'], aigov: ['AI 사용을 관리해요', 'AI 사용량 보여줘']
  };
  const mdOf = id => MD[id] || [lab(WS[MENU[id]?.ws] || { label: '' }) + ' 기능', mlabel(id) + ' 알려줘'];
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
  const allTabs = () => Object.entries(S.nav.tabs).flatMap(([w, A]) => (A || []).filter(x => MENU[x.id] && !(MENU[x.id].only && MENU[x.id].only !== S.org.type && !(S.org.type === 'univ' && MENU[x.id].only === 'univ'))).map(x => ({ ...x, w })));
  VIEWS.menus = () => { const f = UI.slMenuF || 'all', q = (UI.slMenuQ || '').trim(); const A = allTabs(); const E = slimEss();
    const wsL = [...new Set(A.map(x => x.w))].filter(w => WS[w]); const L = A.filter(x => (f === 'all' || (f === 'on' ? x.on : x.w === f)) && (!q || (mlabel(x.id) + mdOf(x.id)[0]).includes(q)));
    const on = A.filter(x => x.on);
    return SL.page('메뉴 추가', `<button class="btn ghost" data-act="sl-menuorder">순서 바꾸기</button><button class="btn" data-act="sl-reset-menu">기본 메뉴로</button>`,
      SL.note(ic('grid', 18), '필요한 메뉴만 켜서 쓰세요', 'AI SAM에 "○○ 메뉴 켜줘"라고 해도 됩니다') +
      SL.chips('slMenuF', [['all', '전체'], ['on', `켜짐 ${on.length}`], ...wsL.map(w => [w, lab(WS[w])])], f) +
      SL.list(L.map(x => SL.row({ name: mlabel(x.id), sub: mdOf(x.id)[0] + (E.includes(x.id) ? ' · 기본' : ''), col: x.on ? 'var(--s400)' : 'var(--g500)', icon: esc([...mlabel(x.id)][0]),
        right: `<button type="button" class="sl-sw ${x.on ? 'on' : ''}" role="switch" aria-checked="${x.on}" aria-label="${esc(mlabel(x.id))} ${x.on ? '끄기' : '켜기'}" data-act="sl-menu" data-v="${x.id}"><i></i></button>` }))) +
      SL.search('slMenuQ', '메뉴 검색'));
  };
  window.slMenuSet = (id, on) => { const t = Object.values(S.nav.tabs).flat().find(x => x.id === id); if (!t) return false; t.on = on; save(); return true; };
  ACT['sl-menu'] = el => { const id = el.dataset.v; const t = Object.values(S.nav.tabs).flat().find(x => x.id === id); if (!t) return; slMenuSet(id, !t.on); toast(`'${mlabel(id)}' 메뉴를 ${t.on ? '켰습니다 — 왼쪽 메뉴에 생겼어요' : '껐습니다'}.`, 'ok'); render(); };
  ACT['sl-menuorder'] = () => { go('settings'); UI.settings = 'menu'; UI.slSetIn = true; render(); };
  ACT['sl-reset-menu'] = () => { slimApply(); save(); render(); toast('기본 메뉴로 되돌렸습니다.', 'ok'); };

  /* 사이드바: 켜진 메뉴가 없는 공간은 숨기고, 아래에 [+ 메뉴] 하나 */
  { const base = rail; rail = () => { const keep = S.nav.ws; const vis = keep.filter(w => w === 'home' || w === 'dash' || wsTabs(w).length);
      const sv = S.nav.ws; S.nav.ws = vis; let h; try { h = base(); } finally { S.nav.ws = sv; }
      return h + (S.me.role === 'teacher' ? '' : `<button class="ri sl-add ${CUR.ws === 'more' ? 'on' : ''}" data-act="go" data-v="more" aria-label="메뉴 추가">${ic('grid')}<span>메뉴 추가</span></button>`); }; }
  /* '메뉴 추가'는 탭이 없는 공간(more) — 화면은 VIEWS.menus */
  { const base = safeView; safeView = () => { if (CUR.ws === 'more') { if (S.me.role === 'teacher') return '<div class="empty">교수자 권한으로는 메뉴를 바꿀 수 없습니다.</div>'; try { return VIEWS.menus(); } catch (e) { console.error(e); } } return base(); }; }

  /* ───────── 4. 연결(Connect) — 휴대폰 '앱 및 서비스 연결하기'처럼 ───────── */
  const CN_CAT = { claude: 'ai', mcp: 'ai', slack: 'msg', google: 'work', toss: 'pay', channeltalk: 'msg' };
  const CN_ONE = { claude: 'AI SAM 대화 · 문서 만들기', mcp: '다른 AI가 우리 데이터로 일하기', slack: '알림을 채널로 받기', google: '캘린더 · 시트 · 메일', toss: '수강료 온라인 결제', channeltalk: '홈페이지 상담 버튼' };
  if (typeof VIEWS.conn === 'function') {
    const oldConn = VIEWS.conn; window.slOldConn = oldConn;
    VIEWS.conn = () => { if (UI.slConnOld) return `<div class="sl-back"><button class="btn ghost" data-act="sl-connold" data-v="0">‹ 간단히 보기</button></div>` + oldConn();
      cnEnsure(); const f = UI.slCnF || 'all', q = (UI.slCnQ || '').trim();
      const on = CN_IDS.filter(id => cnStatus(id).st === CN_ST.on);
      const L = CN_IDS.filter(id => (f === 'all' || CN_CAT[id] === f) && (!q || (CN[id].name + CN_ONE[id]).toLowerCase().includes(q.toLowerCase())));
      const P = S.autos.filter(a => (a.actions || []).some(x => CN_ACT[x]));
      return SL.page('연결', `<button class="btn" data-act="sl-connold" data-v="1">자세히</button>`,
        SL.note(ic('lock' in IC ? 'lock' : 'gear', 18), '연결 정보는 안전하게 보관돼요', '키 · 토큰은 화면에 가려서 표시합니다') +
        SL.chips('slCnF', [['all', '전체'], ['work', '업무툴'], ['pay', '결제'], ['msg', '메시지'], ['ai', 'AI']], f) +
        (on.length ? SL.sum(`<span>연결됨</span><span class="sl-logos">${on.map(id => `<i style="background:${CN[id].col}">${esc(CN[id].logo)}</i>`).join('')}</span><span class="sl-n">${on.length}</span>`, 'sl-cnf', 'on') : '') +
        SL.list(L.map(id => { const s = cnStatus(id); const ok = s.st === CN_ST.on, chk = s.st === CN_ST.chk;
          return SL.row({ act: 'sl-cn', v: id, name: CN[id].name.replace(/\(.*\)/, '').trim(), sub: CN_ONE[id], col: CN[id].col, icon: esc(CN[id].logo),
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
    VIEWS.members = () => { if (UI.mem || UI.slMemTable || (typeof mbUniv === 'function' && mbUniv())) return (UI.mem ? '' : `<div class="sl-back"><button class="btn ghost" data-act="sl-memtable" data-v="0">‹ 간단히 보기</button></div>`) + oldMem();
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
  const slHead = () => { const main = $('#main'); if (!main || !main.querySelector('.sl-page')) return; main.querySelectorAll('.bhdl > h1, .bhdl > b, .bhdl > small, .bhdl > p, .wh > div:first-child > h1, .wh > div:first-child > p').forEach(e => { e.hidden = true; }); };
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
  /* 설정 첫 화면 = 목록(휴대폰 설정처럼). 줄을 누르면 기존 설정 화면(동작 그대로) */
  const SETS = () => { const O = S.me.role === 'owner';
    return [['기본', [['go:more', '메뉴', '켜고 끌 메뉴 고르기', 'grid', '#5C74F6'], ['type', '기관 정보', '기관 유형 · 이름', 'gear', '#6C6C6C'], ['rules', '학습 규칙 · AI 튜터', '진도 · 수료 기준', 'book', '#00A224'], ['lang', '언어', '화면 · 사이트 언어', 'globe', '#109BF1']]],
      ['연결', [...(O ? [['go:conn', '연결', 'Slack · Google · 결제', 'send', '#7C5CF2']] : []), ['integr', 'API · MCP', '외부 AI · 시스템 연동', 'spark', '#4C77C5']]],
      ['회원 · 사이트', [['service', '가입 · 회원', '가입 방식 · 승인', 'users', '#E5487A'], ['home', '홈페이지', '주소 · 기본 정보', 'globe', '#14A3A3'], ['popup', '팝업', '공지 팝업', 'chat', '#FF9800'], ['consult', '상담', '상담 버튼 · 시간', 'chat', '#6447F5'], ['terms', '약관', '이용약관 · 개인정보', 'book', '#808181']]],
      ['요금 · 데이터', [...(O ? [['plan', '요금제 · 결제', '플랜 · 부가 옵션', 'chart', '#0064FF'], ['room', '데이터룸 · 배포', '배포 · 백업 공간', 'grid', '#2E40B3']] : []), ['data', '데이터', '내보내기 · 초기화', 'gear', '#4C4D4D'], ['cover', '기능 맵', '전체 기능 한눈에', 'grid', '#AAABAB']]]]; };
  { const base = VIEWS.settings; VIEWS.settings = () => { if (UI.slSetIn) return `<div class="sl-back"><button class="btn ghost" data-act="sl-setback">‹ 설정</button></div>` + base();
      const q = (UI.slSetQ || '').trim();
      return SL.page('설정', '', SETS().map(([g, L]) => { const R = L.filter(x => !q || (x[1] + x[2]).includes(q)); return R.length ? `<h3 class="sl-gh">${esc(g)}</h3>` + SL.list(R.map(([k, n, d, i, c]) => SL.row({ act: 'sl-set', v: k, name: n, sub: d, col: c, icon: ic(i in IC ? i : 'gear', 20) }))) : ''; }).join('') + SL.search('slSetQ', '설정 검색')); }; }
  ACT['sl-set'] = el => { const k = el.dataset.v; if (k.startsWith('go:')) { const t = k.slice(3); if (t === 'conn') { ACT['sl-goconn'](); return; } go(t); return; } UI.settings = k; UI.slSetIn = true; render(); window.scrollTo(0, 0); };
  ACT['sl-setback'] = () => { UI.slSetIn = false; render(); };
  { const base = go; go = (id, keep) => { if (id === 'settings') UI.slSetIn = false; else if (['plan', 'integr', 'service', 'terms', 'popup', 'consult', 'lang', 'rules', 'data', 'room'].includes(id)) UI.slSetIn = true; return base(id, keep); }; }

  /* 기관 초기화: 기관 이름을 입력해야 실행(되돌릴 수 없음) */
  if (ACT['reset-all']) { const base = ACT['reset-all']; ACT['reset-all'] = (...a) => modal('기관 초기화', `<p>데모 데이터를 모두 지우고 가입 화면으로 돌아갑니다. 되돌릴 수 없습니다.</p><label class="fl">확인을 위해 기관 이름 「${esc(S.org.name)}」을 입력하세요<input name="nm" autocomplete="off"></label>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '초기화', kind: 'red', run: w => { if (fv(w, 'nm') !== S.org.name) { toast('기관 이름이 일치하지 않습니다.', 'warn'); return false; } closeModal(); setTimeout(() => { base(...a); setTimeout(() => { const ok = $('#modal [data-mact=ok]'); ok && ok.click(); }, 30); }, 0); return false; } }]); }

  /* 운영(라이브) 머리의 '비밀번호 변경'은 계정 메뉴 안으로 */
  AFTER.push(() => { const a = $('#liveAcct'); if (!a || a.dataset.sl) return; a.dataset.sl = 1; const em = a.querySelector('small'); const pw = a.querySelector('[data-act="live-pw"]'); const out = a.querySelector('[data-act="live-out"], [data-act="logout"]');
    if (!pw) return; const d = document.createElement('details'); d.className = 'sl-acct'; d.innerHTML = `<summary aria-label="계정 메뉴"><span class="av">${esc((em && em.textContent || '?')[0].toUpperCase())}</span></summary><div class="sl-acm" role="menu"><small>${esc(em ? em.textContent : '')}</small></div>`;
    const m = d.querySelector('.sl-acm'); pw.classList.remove('sm'); m.appendChild(pw); if (out) m.appendChild(out); if (em) em.remove(); a.appendChild(d); });

  /* ───────── 8. 홈 — 입력창 + 추천 + 오늘 할 일만, 나머지는 한 줄 요약 ───────── */
  AFTER.push(() => { if (CUR.ws !== 'home') return; const R = $('#main .aih'); if (!R || R.dataset.sl) return; R.dataset.sl = 1;
    R.querySelectorAll('.aih-note, .aih-menu').forEach(e => e.hidden = true);
    R.querySelectorAll('.uxtodo *').forEach(e => { if (!e.children.length && /계획을 먼저 보여/.test(e.textContent)) e.hidden = true; });
    const g = R.querySelector('.aih-guide'); if (g && g.textContent.trim()) { const cur = g.querySelector('.obd b, .obd h3, .obd .obd-t'); const m = /(\d)\s*\/\s*(\d)/.exec(g.textContent); const nx = (/\d단계\s*([^·|\n]+)/.exec(g.textContent) || [])[1] || '';
      if (m && m[1] !== m[2]) { const s = document.createElement('div'); s.innerHTML = SL.sum(`<span>시작 가이드</span><span class="sl-sub">다음: ${esc(nx.trim())}</span><span class="sl-n">${m[1]}/${m[2]}</span>`, 'sl-guide', ''); g.before(s.firstElementChild); }
      g.hidden = !UI.slGuideOpen; }
    const two = R.querySelector('.aih-two'); if (two) { const on = (typeof CN_IDS !== 'undefined' ? CN_IDS.filter(id => cnStatus(id).st === CN_ST.on) : []); const au = (S.autos || []).filter(a => a.on).length;
      const box = document.createElement('div'); box.className = 'sl-homesum';
      box.innerHTML = (typeof CN_IDS !== 'undefined' && S.me.role === 'owner' ? SL.sum(`<span>연결</span><span class="sl-logos">${on.map(id => `<i style="background:${CN[id].col}">${esc(CN[id].logo)}</i>`).join('')}</span><span class="sl-n">${on.length}/${CN_IDS.length}</span>`, 'sl-goconn', '') : '') +
        (S.me.role !== 'teacher' ? SL.sum(`<span>자동 운영</span><span class="sl-n">${au}개 켜짐</span>`, 'sl-goauto', '') : '');
      two.replaceWith(box); }
  });
  ACT['sl-guide'] = () => { UI.slGuideOpen = !UI.slGuideOpen; const g = $('#main .aih-guide'); if (g) g.hidden = !UI.slGuideOpen; };
  ACT['sl-goconn'] = () => { if (typeof slMenuSet === 'function') slMenuSet('conn', true); UI.slConnOld = false; go('conn'); };
  ACT['sl-goauto'] = () => { slMenuSet('auto', true); go('auto'); };
  /* 꺼진 메뉴로 가는 링크(홈 · AI SAM · 가이드)는 막지 않고 그 메뉴를 켜서 연다 — 필요할 때 켜진다 */
  { const base = go; go = (id, keep) => { try { if (S && S.org && MENU[id] && !menuOn(id) && !(MENU[id].owner && S.me.role !== 'owner') && !(S.me.role === 'teacher' && TEACH_NO.includes(id)) && (!MENU[id].only || MENU[id].only === S.org.type) && Object.values(S.nav.tabs).flat().some(x => x.id === id)) { slMenuSet(id, true); toast(`'${mlabel(id)}' 메뉴를 켰어요. 끄려면 [메뉴 추가]에서 끄세요.`, 'ok'); } } catch (e) { } return base(id, keep); }; }

  /* 기존 사용자 한 번 안내 */
  AFTER.push(() => { if (!UI.slimNote) return; UI.slimNote = 0; toast('메뉴를 꼭 필요한 것만 남겼습니다. 다른 메뉴는 왼쪽 [메뉴 추가]에서 켜세요.', 'ok'); });
})();
