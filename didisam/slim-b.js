/* v34 단순화 R2(slim-b) — 소통 · 운영 · 사이트 공간 화면 · 현황 · 설정 하위 화면을 공통 틀(SL)로.
   대표님(2026-11-07): '필요 없는 화면 UI UX 모두 정리 · 유저 입장에서 더 심플하게 · 휴대폰 「앱 및 서비스 연결하기」처럼 · 워딩이 많으면 혼란만 가중'.
   원칙: 기존 VIEWS.x를 감싸 새 첫 화면(제목 · 주 버튼 하나 · 상태 한 장 · 요약 · 목록 · 검색)을 앞에 두고, [자세히] · 줄 누르기로 기존 화면을 그대로 연다(기능 동등).
   - 탭이 있는 화면은 그 탭 키(UI.slTab · UI.cpl 등)가 정해져 있으면 기존 화면을 연다 → 코드 · AI SAM · 테스트가 탭을 지정해 여는 흐름은 그대로.
   - 규정 수치 · 판정(compliance.js)은 읽기만 한다(cplReqList). */
(function () {
  if (typeof VIEWS !== 'object' || typeof SL !== 'object') return;
  const I = (k, s = 20) => ic(k in IC ? k : 'grid', s);
  const lb = id => (typeof mlabel === 'function' ? mlabel(id) : id);
  const n0 = v => (+v || 0).toLocaleString('ko-KR');
  const won0 = v => (typeof won === 'function' ? won(v) : n0(v) + '원');
  const A = v => Array.isArray(v) ? v : [];
  const T = () => S && S.me && S.me.role === 'teacher';
  const q = k => String(UI[k] || '').trim().toLowerCase();
  const hit = (k, ...s) => { const x = q(k); return !x || s.join(' ').toLowerCase().includes(x); };

  /* ── 공통: 첫 화면 ↔ 기존 화면 ── */
  const FR = {};
  const isOld = id => { const o = FR[id]; if (!o) return true; if (UI.sbOld && UI.sbOld[id]) return true; if (o.key && UI[o.key] != null && UI[o.key] !== '') return true; try { return !!(o.oldIf && o.oldIf()); } catch (e) { return false; } };
  window.sbIsFront = id => !!FR[id] && !isOld(id);
  const backBar = id => `<div class="sl-back sb-back"><button type="button" class="btn ghost" data-act="sb-front" data-v="${id}">‹ ${esc(FR[id].title ? FR[id].title() : lb(id))}</button></div>`;
  function front(id, o) {
    if (typeof VIEWS[id] !== 'function') return; const old = VIEWS[id]; FR[id] = o; o.old = old;
    VIEWS[id] = (...a) => { if (isOld(id)) return (o.noBack && o.noBack() ? '' : backBar(id)) + old(...a);
      try { return o.build(old, ...a); } catch (e) { console.error(e); return old(...a); } };
  }
  const clearFront = id => { const o = FR[id]; if (!o) return; UI.sbOld = UI.sbOld || {}; UI.sbOld[id] = 0; if (o.key) delete UI[o.key]; A(o.reset).forEach(k => { delete UI[k]; }); };
  ACT['sb-front'] = el => { clearFront(el.dataset.v); render(); scrollTo(0, 0); };
  ACT['sb-old'] = el => { UI.sbOld = UI.sbOld || {}; UI.sbOld[el.dataset.v] = 1; render(); scrollTo(0, 0); };
  /* 사이드바 · 공간 탭에서 메뉴를 누르면 첫 화면부터(코드에서 부르는 go()는 지정한 탭을 그대로 연다) */
  { const base = ACT.go; ACT.go = (el, ...r) => { try { if (el && el.closest && el.closest('nav.side, .wtabs')) Object.keys(FR).forEach(clearFront); } catch (e) { } return base(el, ...r); }; }

  /* ── 공통 조각 ── */
  const more = id => `<button type="button" class="btn ghost" data-act="sb-old" data-v="${id}">자세히</button>`;
  const tabRow = (key, v, name, sub, icon, col, right) => SL.row({ act: 'tab', v, name, sub, icon: icon ? I(icon, 20) : undefined, col, right, attr: `data-key="${esc(key)}"` });
  const goRow = (id, name, sub, icon, col, right) => SL.row({ act: 'go', v: id, name, sub, icon: icon ? I(icon, 20) : undefined, col, right });
  const cmds = L => `<div class="sb-ai">${L.filter(Boolean).slice(0, 3).map(c => `<button type="button" class="sb-cmd" data-act="chat-q" data-v="${esc(c)}">${I('spark', 14)} ${esc(c)}</button>`).join('')}</div>`;
  /* 빈 화면: 하는 일 한 줄 + 첫 할 일 버튼 하나 + AI SAM 추천 명령 */
  const empty = (icon, line, btn, L) => `<div class="sb-empty"><span class="sb-ei">${I(icon, 26)}</span><b>${esc(line)}</b>${btn || ''}${cmds(L || [])}</div>`;
  const cnt = (n, w) => `<span class="sb-n ${w ? 'w' : ''}">${esc(String(n))}</span>`;
  const sw = (on, act, v, name) => `<button type="button" class="sl-sw ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" aria-label="${esc(name)} ${on ? '끄기' : '켜기'}" data-act="${act}" data-v="${esc(v)}"><i></i></button>`;
  const status = (icon, a, b, tone) => `<div class="sl-note sb-st ${tone || ''}"><span class="sl-ni">${I(icon, 20)}</span><span><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ''}</span></div>`;
  const md = id => (typeof slimMD === 'function' ? slimMD(id) : ['', '']);
  const pg = (id, right, body) => SL.page(lb(id), right, body);

  /* ═════════ 소통(talk) ═════════ */
  /* 메시지: 보내기 · 발송 내역(목록) — [새 메시지] = 기존 작성 화면 */
  front('message', {
    title: () => '메시지',
    oldIf: () => { if (typeof cmMC !== 'function') return false; const mc = cmMC(); return !!(UI.msgDraft || UI.msgDraftT || (mc.ids || []).length || (mc.imgs || []).length || (mc.mode && mc.mode !== 'all')); },
    build: old => { old(); const lim = typeof cmLimit === 'function' ? cmLimit() : 0, used = typeof cmMonthUsed === 'function' ? cmMonthUsed() : 0;
      const H = T() ? [] : A(S.msgs).filter(m => hit('sbMsgQ', m.title, m.body, m.to));
      const auto = A(S.autos).filter(a => a.on && A(a.actions).some(x => /msg|talk|mail|push/.test(x))).length;
      const nr = S.settings && S.settings.nudgeRule; const nudge = nr ? nr.on : !!(S.settings && S.settings.nudge);
      return pg('message', `${T() ? '' : more('message')}<button type="button" class="btn pri" data-act="sb-old" data-v="message">+ 새 메시지</button>`,
        SL.sum(`<span>이번 달 발송</span><span class="sl-n">${n0(used)}${lim ? ' / ' + n0(lim) : ''}건</span>`) +
        SL.list([
          SL.row({ act: 'go', v: 'auto', name: '자동 발송', sub: auto ? `알림톡 · 앱 푸시 자동 규칙 ${auto}개 켜짐` : '반복 안내를 자동으로 보냅니다', icon: I('send', 20), col: '#7C5CF2' }),
          SL.row({ act: 'sb-old', v: 'message', name: '수강 독려 메시지', sub: nudge ? '켜짐 · 진도가 늦은 ' + t('learner') + '에게' : '꺼짐', icon: I('bolt', 20), col: '#FF9800' })]) +
        (T() ? '' : H.length || q('sbMsgQ') ? `<h3 class="sl-gh">발송 내역 ${H.length}</h3>` + SL.list(H.slice(0, 50).map(m => SL.row({ act: 'cm-msg-view', v: m.id, name: m.title || '(제목 없음)', sub: [m.to, m.at, m.n ? m.n + '건' : ''].filter(Boolean).join(' · '), icon: I('chat', 20), col: '#5C74F6' }))) + SL.search('sbMsgQ', '보낸 메시지 검색')
          : empty('chat', md('message')[0] || '메시지 · 알림을 보냅니다', `<button type="button" class="btn pri" data-act="sb-old" data-v="message">첫 메시지 보내기</button>`, ['미접속자에게 안내해줘', '이번 주 공지 메시지 써줘', '진도 늦은 ' + t('learner') + '에게 독려해줘']))); }
  });
  /* 보낸 뒤에는 첫 화면(발송 내역)으로 */
  if (ACT['msg-send']) { const base = ACT['msg-send']; ACT['msg-send'] = (...a) => { const n = A(S.msgs).length; const r = base(...a); try { if (A(S.msgs).length > n && UI.sbOld) UI.sbOld.message = 0; } catch (e) { } return r; }; }

  /* 공지 · 알림 */
  front('board', {
    title: () => lb('board'),
    build: () => { const N = [...A(S.notices).map(n => ({ ...n, g: '' })), ...A(S.classes).flatMap(c => A(c.notices).map(n => ({ ...n, g: c.name })))].filter(n => hit('sbBdQ', n.title, n.g));
      const AL = A(S.alerts).filter(a => hit('sbBdQ', a.title, a.to)); const f = UI.sbBdF || 'notice';
      const L = f === 'alert' ? AL.map(a => SL.row({ name: a.title, sub: `${a.to} · ${a.at}`, icon: I('send', 20), col: '#109BF1', right: `<span class="sb-n">읽음 ${+a.read || 0}%</span>` }))
        : N.slice(0, 60).map(n => SL.row({ name: n.title, sub: [n.pin ? '고정' : '', n.g || '기관 공지', n.at].filter(Boolean).join(' · '), icon: I('chat', 20), col: n.pin ? '#E5487A' : '#5C74F6', right: '' }));
      return pg('board', `${more('board')}<button type="button" class="btn ghost" data-act="al-new">알림 보내기</button><button type="button" class="btn pri" data-act="notice-new">+ 공지</button>`,
        SL.chips('sbBdF', [['notice', `공지 ${N.length}`], ['alert', `알림함 ${AL.length}`]], f) +
        (L.length ? SL.list(L) + SL.search('sbBdQ', '제목 검색') : empty('chat', f === 'alert' ? '알림함으로 공지를 보냅니다' : '공지는 사이트에 바로 보입니다', f === 'alert' ? `<button type="button" class="btn pri" data-act="al-new">알림 보내기</button>` : `<button type="button" class="btn pri" data-act="notice-new">첫 공지 쓰기</button>`, ['공지 써줘', '이번 달 일정 공지 만들어줘', '휴강 안내 공지 써줘']))); }
  });

  /* 커뮤니티: 게시판별 한 줄 — 누르면 기존 게시판 화면 */
  front('community', {
    key: 'comB', title: () => lb('community'),
    build: old => { old(); const P = A(S.posts); const un = typeof cmUnans === 'function' ? P.filter(p => p.board === '커뮤니티' && cmUnans(p)).length : 0;
      const B = typeof CM_TABS !== 'undefined' ? CM_TABS : [['커뮤니티', '커뮤니티'], ['게시판', '게시판'], ['공지사항', '공지사항'], ['학습노트', '학습노트'], ['수강후기', '수강후기']];
      const ONE = { 커뮤니티: '질문 · 이야기', 게시판: '자유 게시판', 공지사항: '사이트 공지', 학습노트: t('learner') + ' 노트', 수강후기: '후기 · 별점', boards: '게시판 만들기 · 권한' };
      const ICN = { 커뮤니티: 'chat', 게시판: 'grid', 공지사항: 'send', 학습노트: 'book', 수강후기: 'check', boards: 'gear' };
      return pg('community', `${un ? `<button type="button" class="btn ai" data-act="ai-reply-all">${I('spark', 14)} 답변 초안</button>` : ''}`,
        (un ? SL.sum(`<span>답변을 기다리는 질문</span><span class="sl-n sl-w">${un}개</span>`, 'tab', '커뮤니티').replace('data-act="tab"', 'data-act="tab" data-key="comB"') : '') +
        SL.list(B.map(([k, l]) => { const n = k === 'boards' ? null : P.filter(p => p.board === k).length; return tabRow('comB', k, l, ONE[k] || '', ICN[k] || 'chat', k === 'boards' ? '#808181' : '#5C74F6', n == null ? undefined : cnt(n + '개')); })) +
        (P.length ? '' : cmds(['미답변 질문 보여줘', '커뮤니티 첫 글 써줘']))); }
  });

  /* 상담: 최근 상담 목록 + 통계 · 설정은 줄로 */
  front('consult', {
    key: 'csT', reset: ['csId'], oldIf: () => !!UI.csId, title: () => lb('consult'),
    build: old => { old(); const cs = (S.settings && S.settings.cs) || {}; const L = A(S.consults).filter(c => hit('sbCsQ', c.title, c.text, A(c.targets).map(id => (M(id) || {}).name).join(' ')));
      return pg('consult', `<button type="button" class="btn pri" data-act="cs-start">대면 상담 시작</button>`,
        (cs.status === '연동' ? '' : SL.sum(`<span>채널톡 연결</span><span class="sl-n">안 됨</span>`, 'tab', 'set').replace('data-act="tab"', 'data-act="tab" data-key="csT"')) +
        SL.list([tabRow('csT', 'list', '상담 목록', '전화 · 채팅 · 대면', 'chat', '#6447F5', cnt(A(S.consults).length + '건')), tabRow('csT', 'dash', '상담 통계', '카테고리별 건수', 'chart', '#109BF1'), tabRow('csT', 'set', '상담 설정', cs.status === '연동' ? '채널톡 연결됨' : '카테고리 · 채널톡', 'gear', '#808181')]) +
        (L.length ? `<h3 class="sl-gh">최근 상담</h3>` + SL.list(L.slice(0, 20).map(c => SL.row({ act: 'cs-open-d', v: c.id, name: c.title || '상담', sub: [A(c.targets).map(id => (M(id) || {}).name || '').filter(Boolean).join(', '), typeof cmDate === 'function' ? cmDate(c.at) : c.at, c.summary ? '요약 완료' : ''].filter(Boolean).join(' · '), icon: I('chat', 20), col: '#6447F5' }))) + SL.search('sbCsQ', '상담 검색')
          : empty('chat', md('consult')[0] || '상담을 기록합니다', `<button type="button" class="btn pri" data-act="cs-start">첫 상담 기록</button>`, ['상담 요약해줘', '상담 필요한 ' + t('learner') + ' 보여줘']))); }
  });

  /* ═════════ 운영(ops) · 매출 ═════════ */
  front('sales', {
    key: 'slTab', title: () => lb('sales'),
    build: old => { old(); const pays = A(S.pays); const ym = today().slice(0, 7); const mon = pays.filter(p => String(p.at || '').startsWith(ym) && !/환불 완료/.test(p.status || ''));
      const req = pays.filter(p => p.refund && p.refund.state === '신청'); const st = S.settings || {}; const tossOn = st.pg === 'toss' && st.toss && st.toss.status === '승인'; const pgOn = st.pg && st.pg !== 'none';
      const L = pays.filter(p => p.itemType !== 'bill' && hit('sbSlQ', p.item, (M(p.who) || {}).name, p.status));
      return pg('sales', `${more('sales')}<button type="button" class="btn pri" data-act="sales-xls">내려받기</button>`,
        (pgOn ? '' : status('chart', '결제를 받으려면 PG 연결이 필요합니다', '연결 › 토스페이먼츠에서 시작', 'w')) +
        SL.sum(`<span>${+ym.slice(5)}월 매출</span><span class="sl-n">${won0(mon.reduce((a, p) => a + (+p.amount || 0), 0))} · ${mon.length}건</span>`) +
        SL.list([
          ...(req.length ? [tabRow('slTab', 'refund', '환불 요청', '승인 또는 거절이 필요합니다', 'x', '#E5487A', cnt(req.length + '건', 1))] : []),
          tabRow('slTab', 'pay', '결제 내역', '강좌 · 교재 · 구독', 'chart', '#0064FF', cnt(pays.filter(p => p.itemType !== 'bill').length + '건')),
          tabRow('slTab', 'refund', '환불 내역', '승인 · 거절 기록', 'refresh', '#808181'),
          tabRow('slTab', 'bill', '청구서 납부', '현장 · 온라인 납부', 'book', '#14A3A3'),
          tabRow('slTab', 'stat', '월별 · 연도별 통계', '추이 비교', 'chart', '#7C5CF2'),
          ...(tossOn ? [] : [SL.row({ act: 'sl-goconn', v: '', name: '결제 연결', sub: pgOn ? 'PG 변경 · 토스페이먼츠' : '토스페이먼츠 · 디디쌤 PG', icon: I('send', 20), col: '#0064FF', right: '<span class="sl-plus" aria-hidden="true">+</span>' })])]) +
        (L.length ? `<h3 class="sl-gh">최근 결제</h3>` + SL.list(L.slice(0, 15).map(p => SL.row({ act: 'sl2-payd', v: p.id, name: p.item || '결제', sub: [(M(p.who) || {}).name, p.at, p.refund ? (p.refund.state === '신청' ? '환불 신청' : '환불 ' + p.refund.state) : p.status].filter(Boolean).join(' · '), icon: I('chart', 20), col: '#0064FF', right: `<span class="sb-n">${won0(p.amount)}</span>` }))) + SL.search('sbSlQ', '결제자 · 항목 검색')
          : cmds([md('sales')[1], '환불 요청 보여줘', '유료 강좌 만들어줘']))); }
  });

  front('billing', {
    title: () => lb('billing'),
    build: old => { old(); const B = A(S.bills); const g = {}; B.forEach(b => { const k = b.batch || b.id; (g[k] = g[k] || []).push(b); });
      const st = S.settings || {}; const ok = st.pg === 'toss' && st.toss && st.toss.status === '승인'; const un = B.filter(b => b.status === '미납');
      const G = Object.entries(g).filter(([, L]) => hit('sbBlQ', L[0].title));
      return pg('billing', `${more('billing')}<button type="button" class="btn pri" data-act="bill-new" ${ok ? '' : 'disabled title="토스페이먼츠 승인 필요"'}>+ 청구서</button>`,
        (ok ? '' : status('chart', '청구서는 토스페이먼츠 연결 후 보낼 수 있습니다', '연결에서 토스페이먼츠를 연결하세요', 'w')) +
        (un.length ? SL.sum(`<span>미납</span><span class="sl-n sl-w">${un.length}건 · ${won0(un.reduce((a, b) => a + (typeof billTotal === 'function' ? billTotal(b) : 0), 0))}</span>`) : '') +
        (G.length ? SL.list(G.map(([k, L]) => { const u = L.filter(b => b.status === '미납').length; return SL.row({ act: 'sl2-bill', v: k, name: L[0].title || '청구서', sub: `${L.length}명 · 마감 ${L[0].due || '—'}${u ? ` · 미납 ${u}` : ' · 모두 납부'}`, icon: I('book', 20), col: u ? '#FF9800' : '#00A224' }); })) + SL.search('sbBlQ', '청구서 검색')
          : empty('book', md('billing')[0] || '청구서를 보냅니다', ok ? `<button type="button" class="btn pri" data-act="bill-new">첫 청구서 만들기</button>` : `<button type="button" class="btn pri" data-act="sl-goconn">결제 연결하기</button>`, ['미납 청구서 보여줘', '다음 달 청구서 만들어줘']))); }
  });

  /* 학원 수납: 이번 달 미납 목록이 첫 화면, 탭(전체 내역 · 수강료 발생 · 통계)은 줄로 */
  front('crmbill', {
    key: 'crmBT', reset: ['crmId'], title: () => lb('crmbill'),
    build: old => { const h = old(); const auto = /k-warn/.test(h) ? (h.match(/수강료 (\d+)건을 자동 발생/) || [])[1] : 0;
      const B = A(S.bills); const open = typeof billOpen === 'function' ? billOpen : (b => b.status === '미납' || b.status === '부분 납부');
      const bal = b => (typeof billBal === 'function' ? billBal(b) : 0); const who = b => (typeof billWho === 'function' ? billWho(b) : [b.who]).map(id => (M(id) || {}).name || '—').join(', ');
      const un = B.filter(open).filter(b => hit('sbCbQ', b.title, who(b))).sort((a, b) => String(a.due) < String(b.due) ? -1 : 1);
      const ym = today().slice(0, 7); const paid = B.filter(b => (b.month || String(b.due || '').slice(0, 7)) === ym && b.status !== '취소' && !open(b)).length;
      return pg('crmbill', `${more('crmbill')}<button type="button" class="btn pri" data-act="crm-gen-now">수강료 발생</button>`,
        (auto ? status('check', `정기 납부일 수강료 ${auto}건을 자동 발생했습니다`, '') : '') +
        SL.sum(`<span>${+ym.slice(5)}월 미납</span><span class="sl-n ${un.length ? 'sl-w' : ''}">${un.length}건 · ${won0(un.reduce((a, b) => a + bal(b), 0))}</span>`) +
        (un.length ? SL.list(un.slice(0, 60).map(b => SL.row({ name: who(b), sub: `${b.title} · 마감 ${b.due || '—'}`, icon: undefined, right: `<span class="sb-n">${won0(bal(b))}</span><button type="button" class="btn sm pri" data-act="crm-pay" data-v="${esc(b.id)}">수납</button>` })))
          : empty('check', paid ? `이번 달 완납 ${paid}건 — 미납이 없습니다` : '이번 달 수강료를 발생시키면 여기서 수납합니다', '', ['다음 달 청구해줘', '미납 원생에게 안내해줘'])) +
        `<h3 class="sl-gh">더 보기</h3>` + SL.list([tabRow('crmBT', 'list', '전체 내역', '월별 · 상태별 수납 기록', 'book', '#14A3A3'), tabRow('crmBT', 'gen', '수강료 발생', '수업을 골라 한 번에', 'plus', '#5C74F6'), tabRow('crmBT', 'stat', '수납 통계', '월별 · 결제 수단별', 'chart', '#7C5CF2'), SL.row({ act: 'crm-bill-cfg', v: '', name: '수납 설정', sub: '마감일 · 할인 · 자동 발생', icon: I('gear', 20), col: '#808181' })]) +
        (un.length > 3 ? SL.search('sbCbQ', '원생 · 청구 검색') : '')); }
  });

  front('crmstat', {
    key: 'crmST', title: () => lb('crmstat'),
    build: () => pg('crmstat', '', SL.list([tabRow('crmST', 'day', '일일 현황', '오늘 출결 · 수납 요약', 'chart', '#5C74F6'), tabRow('crmST', 'mon', '월별 현황', '원생 수 · 매출 · 퇴원 사유', 'chart', '#109BF1'), tabRow('crmST', 'tch', '강사별', '담당 수업 · 원생', 'users', '#00A224')]) + cmds(['이번 달 통계 보여줘', '오늘 출결 요약해줘']))
  });

  /* 자동 운영: 이름 + 한 줄 + 스위치(휴대폰 설정처럼) */
  front('auto', {
    title: () => lb('auto'), oldIf: () => !!UI.autoPrefill,
    build: old => { old(); const f = UI.sbAuF || 'all'; const L = A(S.autos).filter(a => (f === 'all' || (f === 'on' ? a.on : !a.on)) && hit('sbAuQ', a.name, a.cond));
      const on = A(S.autos).filter(a => a.on).length; const runs = A(S.runs).reduce((a, r) => a + (+r.n || 0), 0);
      const one = a => { try { return `${trigLabel(a.trigger)} · ${A(a.actions).map(x => ACTION[x] || x).join(' + ')}`; } catch (e) { return a.cond || ''; } };
      return pg('auto', `${more('auto')}<button type="button" class="btn pri" data-act="auto-ai">${I('spark', 14)} 말로 만들기</button>`,
        SL.chips('sbAuF', [['all', `전체 ${A(S.autos).length}`], ['on', `켜짐 ${on}`], ['off', '꺼짐']], f) +
        (runs ? SL.sum(`<span>이번 달 처리</span><span class="sl-n">${n0(runs)}건 · 약 ${Math.round(runs * 3 / 60 * 10) / 10}시간 절감</span>`) : '') +
        (L.length ? SL.list(L.map(a => SL.row({ act: 'auto-edit', v: a.id, name: a.name, sub: one(a), icon: I(a.on ? 'bolt' : 'bolt', 20), col: a.on ? '#5C74F6' : 'var(--g500)', right: sw(a.on, 'sb-auto-on', a.id, a.name) }))) + SL.search('sbAuQ', '자동화 검색')
          : empty('bolt', md('auto')[0] || '반복 업무를 자동으로', `<button type="button" class="btn pri" data-act="auto-new">+ 자동화 만들기</button>`, ['미접속자에게 매주 안내해줘', '수료하면 수료증 보내줘', '자동 운영 상태 보여줘']))); }
  });
  ACT['sb-auto-on'] = el => { const a = A(S.autos).find(x => x.id === el.dataset.v); if (!a) return; a.on = !a.on; save(); render(); toast(`'${a.name}' 자동화를 ${a.on ? '켰습니다' : '껐습니다'}.`, 'ok'); };

  /* 법정의무교육(기업 · 공공) */
  front('compliance', {
    title: () => lb('compliance'),
    build: () => { const L = A(S.classes).filter(c => c.legal); const dn = c => (typeof doneN === 'function' ? doneN(c) : 0);
      const miss = L.reduce((a, c) => a + A(c.learners).length - dn(c), 0);
      return pg('compliance', `${more('compliance')}<button type="button" class="btn pri" data-act="auto-run-id" data-v="legal-d7">${I('spark', 14)} 미이수자 독려</button>`,
        (L.length ? SL.sum(`<span>미이수</span><span class="sl-n ${miss ? 'sl-w' : ''}">${miss}명</span>`) + SL.list(L.map(c => { const n = A(c.learners).length, d = dn(c), r = Math.round(d / Math.max(1, n) * 100);
          return SL.row({ act: 'sb-old', v: 'compliance', name: c.name, sub: `이수 ${d}/${n}명${c.end ? ' · 마감 ' + c.end : ''}`, icon: I('check', 20), col: r >= 90 ? '#00A224' : '#FF9800', right: `<span class="sb-n ${r < 70 ? 'w' : ''}">${r}%</span>` }); })) +
          SL.list([SL.row({ act: 'comp-report', v: '', name: '이수 증빙 보고서', sub: '이수 현황 CSV 내려받기', icon: I('download', 20), col: '#808181' })])
          : empty('check', '법정의무교육 이수를 관리합니다', `<button type="button" class="btn pri" data-act="chat-q" data-v="법정의무교육 과정 만들어줘">법정교육 과정 만들기</button>`, ['미이수자 보여줘', '성희롱 예방교육 과정 만들어줘']))); }
  });

  /* 학사 · 비교과(대학) */
  front('academic', {
    title: () => lb('academic'),
    build: () => { const risk = A(S.classes).flatMap(c => Object.entries(c.prog || {}).filter(([, p]) => p.p < 30).map(([id, p]) => ({ c, id, p: p.p })));
      return pg('academic', `${more('academic')}<button type="button" class="btn pri" data-act="acad-xls">성적 내보내기</button>`,
        SL.sum(`<span>학습 위험군</span><span class="sl-n ${risk.length ? 'sl-w' : ''}">${risk.length}건</span>`) +
        (risk.length ? SL.list(risk.slice(0, 8).map(r => SL.row({ name: (M(r.id) || {}).name || r.id, sub: `${r.c.name} · 진도 ${Math.round(r.p)}%`, col: '#FF9800' }))) + `<div class="sb-row1"><button type="button" class="btn ai" data-act="auto-run-id" data-v="univ-risk">${I('spark', 14)} 지도교수 알림 + 학생 독려</button></div>` : '') +
        SL.list([SL.row({ act: 'sb-old', v: 'academic', name: t('group') + '별 학습 현황', sub: '학생 수 · 평균 진도 · 이수 · 배지', icon: I('chart', 20), col: '#109BF1' }), SL.row({ act: 'sb-old', v: 'academic', name: '비교과 포인트', sub: '배지 · 비교과 이수 적립', icon: I('check', 20), col: '#00A224' })]) +
        (risk.length ? '' : cmds(['비교과 현황 보여줘', '학습 위험군 알려줘']))); }
  });

  /* 학습비 · 과정 신고(평생교육원) */
  front('lifelong', {
    title: () => lb('lifelong'),
    build: () => { const st = S.settings || {}; const chk = [A(S.classes).every(c => c.hours >= 30 || c.price === 0), !!(st.terms || {}).tos, true, true, !!S.llIns, !!(st.terms || {}).privacy, !!(st.footer || {}).biz];
      const ok = chk.filter(Boolean).length; const rf = A(S.pays).filter(p => p.status === '환불 신청'); const short = A(S.classes).filter(c => c.hours < 30 && c.price).length;
      return pg('lifelong', `${more('lifelong')}<button type="button" class="btn pri" data-act="ll-check">점검 완료로 표시</button>`,
        status(ok === chk.length ? 'check' : 'book', `운영 요건 ${ok}/${chk.length} 충족`, ok === chk.length ? '모두 충족했습니다' : '자세히에서 빠진 항목을 확인하세요', ok === chk.length ? '' : 'w') +
        SL.list([SL.row({ act: 'sb-old', v: 'lifelong', name: '운영 요건 체크리스트', sub: '평생교육법 요건 7가지', icon: I('check', 20), col: '#00A224', right: cnt(`${ok}/${chk.length}`, ok < chk.length) }),
          SL.row({ act: 'sb-old', v: 'lifelong', name: '학습비 반환 요청', sub: '신청일로부터 5일 이내 처리', icon: I('refresh', 20), col: '#E5487A', right: cnt(rf.length + '건', rf.length) }),
          SL.row({ act: 'sb-old', v: 'lifelong', name: '강좌별 운영 시간', sub: short ? `30시간 미만 유료 강좌 ${short}개` : '모든 강좌 기준 충족', icon: I('book', 20), col: '#109BF1', right: short ? cnt(short + '개', 1) : undefined }),
          SL.row({ act: 'll-ins', v: '', name: '배상책임보험', sub: S.llIns ? '가입됨' : '가입하면 표시하세요', icon: I('gear', 20), col: '#808181', right: sw(!!S.llIns, 'll-ins', '', '배상책임보험 가입') })]) +
        cmds(['신고 대상 보여줘', '학습비 반환 기준 약관 써줘'])); }
  });

  /* HRD-Net 보고(직업훈련원) */
  front('hrd', {
    title: () => lb('hrd'),
    build: () => { const R = A((S.hrd || {}).reports); const low = typeof lowAtt === 'function' ? lowAtt().length : 0; const wait = R.filter(r => r.st === '전송 대기').length;
      return pg('hrd', `${more('hrd')}<button type="button" class="btn pri" data-act="auto-run-id" data-v="hrd-weekly">${I('spark', 14)} 이번 주 보고 만들기</button>`,
        SL.sum(`<span>${t('learner')}</span><span class="sl-n">${A(S.members).length}명</span>`) +
        SL.list([SL.row({ act: 'sb-old', v: 'hrd', name: '보고 내역', sub: R.length ? `최근 ${R[0].at} · ${R[0].kind}` : '아직 만든 보고가 없습니다', icon: I('book', 20), col: '#5C74F6', right: cnt(wait ? `대기 ${wait}` : R.length + '건', wait) }),
          SL.row({ act: 'sb-old', v: 'hrd', name: '출석률 80% 미만', sub: '수료 요건 미달 위험', icon: I('users', 20), col: '#FF9800', right: cnt(low + '명', low) }),
          SL.row({ act: 'sb-old', v: 'hrd', name: '부정훈련 의심', sub: '규칙 기반 탐지 · 확인 후 조치', icon: I('x', 20), col: '#E5487A' }),
          ...(MENU.cpl ? [SL.row({ act: 'go', v: 'cpl', name: lb('cpl'), sub: '원격훈련 요건 점검표', icon: I('check', 20), col: '#00A224' })] : [])]) +
        cmds(['HRD 보고 준비해줘', '출석률 낮은 훈련생 보여줘'])); }
  });

  /* 기관 관리(기관 지정 · 기관 담당자) */
  front('org', {
    title: () => lb('org'), oldIf: () => !!(UI.mbOrg || UI.mbOrgAs || (S.me && S.me.role === 'orgmgr')),
    build: old => { old(); const L = typeof mbOrgVis === 'function' ? mbOrgVis() : A(S.orgs); const sum = o => { try { return mbOrgSum(o); } catch (e) { return { n: 0, cls: 0, rate: 0 }; } };
      const R = L.filter(o => hit('sbOgQ', o.name));
      return pg('org', `${more('org')}<button type="button" class="btn pri" data-act="mb-org" data-v="">+ 기관 지정</button>`,
        R.length ? SL.list(R.map(o => { const s = sum(o); return SL.row({ act: 'mb-orgopen', v: o.id, name: o.name, sub: `회원 ${s.n}명 · ${t('cls')} ${s.cls}개${s.n ? ' · 수료율 ' + s.rate + '%' : ''}`, icon: o.logo ? `<img src="${esc(o.logo)}" alt="">` : undefined }); })) + (L.length > 5 ? SL.search('sbOgQ', '기관 검색') : '')
          : empty('corp', md('org')[0] || '참여 기관을 관리합니다', `<button type="button" class="btn pri" data-act="mb-org" data-v="">+ 첫 기관 지정</button>`, ['기관 정보 보여줘', '기관 담당자 추가해줘'])); }
  });

  /* 문서: 우리 기관 문서 목록이 첫 화면 */
  front('docs', {
    key: 'docT', title: () => lb('docs'),
    build: () => { const mine = typeof DOCS === 'function' ? DOCS() : []; const L = mine.filter(d => hit('sbDcQ', d.name, d.cat)); const tpl = typeof dtFor === 'function' ? dtFor(S.org.type).length : 0;
      return pg('docs', `<button type="button" class="btn pri" data-act="doc-ai-new">${I('spark', 14)} AI로 문서 만들기</button>`,
        SL.list([tabRow('docT', 'tpl', '표준 문서', `${TYPES[S.org.type].name} 추천 템플릿`, 'book', '#5C74F6', cnt(tpl + '종')), tabRow('docT', 'mine', '우리 기관 문서', '올리기 · 빈 문서 · 편집', 'grid', '#14A3A3', cnt(mine.length + '개')), tabRow('docT', 'sent', '제공 내역', t('teacher') + ' · ' + t('learner') + '에게 준 문서', 'send', '#808181')]) +
        (L.length ? `<h3 class="sl-gh">최근 문서</h3>` + SL.list(L.slice(0, 20).map(d => SL.row({ act: 'doc-open', v: d.id, name: d.name, sub: [d.cat, d.vis, d.at].filter(Boolean).join(' · '), icon: I('book', 20), col: '#14A3A3' }))) + (mine.length > 5 ? SL.search('sbDcQ', '문서 검색') : '')
          : cmds([md('docs')[1], '수강 안내문 만들어줘', '운영 계획서 써줘']))); }
  });

  /* 규정 준수(cpl): 첫 화면만 — 탭은 줄로, 수치 · 판정은 기존(cplReqList) 그대로 읽기 */
  front('cpl', {
    key: 'cpl', title: () => lb('cpl'), oldIf: () => T(),
    build: () => { let L = []; try { L = typeof cplReqList === 'function' ? cplReqList() : []; } catch (e) { }
      const P = (S.org && S.org.cpl) || {}; const life = P.profile === 'lifelong';
      const ok = L.filter(r => /충족|증빙|완료/.test(String(r.st))).length; const need = L.filter(r => /설정|개발/.test(String(r.st))).length;
      const TB = life ? [['check', '점검표', '요건별 상태 · 증빙', 'check'], ['rule', '적용 규칙', '프로필 · 학습 규칙', 'gear'], ['file', '신고 서류', '신고 · 변경 서류', 'book'], ['refund', '학습비 반환', '반환 기준 · 기한', 'refresh']]
        : [['check', '점검표', '요건별 상태 · 증빙', 'check'], ['rule', '적용 규칙', '프로필 · 학습 규칙', 'gear'], ['item', '차시 · 평가', '차시 시간 · 문제은행', 'book'], ['mon', '모니터링', '부정 의심 · 소명', 'users'], ['fb', '첨삭 · 베낀 답안', '첨삭 기한 · 유사도', 'chat'], ['att', '출결', 'QR 출결 · 지각 환산', 'check'], ['rep', '보고', '수료 · 실시 보고', 'send'], ['feed', '데이터 연계', '연계 파일 점검', 'grid'], ['acct', '계정 · 모듈', '운영 계정 · 본인확인', 'users'], ['ev', '증빙 · 조치', '기관 준비 문서', 'book']];
      return pg('cpl', '',
        (L.length ? status(need ? 'book' : 'check', `요건 ${L.length}개 중 ${ok}개 충족 · 증빙`, `${P.on ? '규정 적용 중' : '규정 꺼짐'}${need ? ` · 설정 필요 ${need}개` : ''}`, need ? 'w' : '') : '') +
        SL.list(TB.map(([k, n, s, icn]) => tabRow('cpl', k, n, s, icn, k === 'check' ? '#00A224' : '#5C74F6', k === 'check' && need ? cnt(need, 1) : undefined))) +
        cmds(['규정 점검해줘', '심사 준비 보고서 만들어줘'])); }
  });

  /* ═════════ 사이트(web) — 첫 화면만, 빌더는 그대로 ═════════ */
  front('site', {
    key: 'smT', reset: ['siteGallery'], oldIf: () => !!UI.siteGallery || !(S.site && S.site.tpl), title: () => lb('site'),
    build: () => { const s = S.site || {}; const pub = !!(s.published || (S.lsite && S.lsite.pubAt)); const at = (S.lsite && S.lsite.pubAt) || s.at || '';
      const url = typeof lsLearnerURL === 'function' ? lsLearnerURL() : 'learner.html'; const tp = typeof TPL !== 'undefined' ? TPL.find(x => x.id === s.tpl) : null;
      const pgs = A(s.pages).length; const secs = A(s.sections).length;
      return pg('site', `<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">사이트 열기</a><button type="button" class="btn pri" data-act="ls-pub">${pub ? '다시 게시' : '게시하기'}</button>`,
        status(pub ? 'check' : 'globe', pub ? '게시됨' : '아직 게시하지 않았습니다', pub ? `${at} · ${S.org.domain || ''}` : '고친 뒤 [게시하기]를 누르면 사이트에 반영됩니다', pub ? '' : 'w') +
        SL.list([tabRow('smT', 'home', '홈페이지 · 메뉴 · 디자인', `섹션 ${secs}개${pgs ? ` · 페이지 ${pgs}개` : ''}`, 'globe', '#14A3A3'),
          tabRow('smT', 'learn', '학습 페이지 · 콘텐츠', `${t('cls')} 목록 · 학습 화면`, 'book', '#5C74F6'),
          SL.row({ act: 'tpl-gallery', v: '', name: '템플릿 바꾸기', sub: tp ? tp.name : '유형별 템플릿', icon: I('grid', 20), col: '#7C5CF2' })]) +
        cmds(['AI로 홈페이지 만들어줘', '첫 화면 문구 바꿔줘', '수강 신청 버튼 넣어줘'])); }
  });

  /* ═════════ 현황(dash) — 숫자 한 줄씩, [자세히] = 기존 대시보드 ═════════ */
  front('dash', {
    title: () => '현황', oldIf: () => !!UI.dxEdit,
    build: old => { const D = window.DASHX; if (!D || !D.layout) return old(); const Lx = D.layout(); const vis = Lx.order.filter(id => !Lx.hide.has(id));
      const rows = vis.map(id => { const w = D.W[id]; let r; try { r = w.v() || {}; } catch (e) { r = { v: '—' }; } const tg = D.target(w); const nm = typeof w.n === 'function' ? w.n() : w.n;
        const v = typeof r.v === 'number' ? n0(r.v) : String(r.v == null ? '—' : r.v); const u = r.u != null ? r.u : /^[\d,]+$/.test(v) ? (w.u || '') : '';
        return SL.row({ act: tg ? 'dx-go' : '', v: tg ? tg.id : '', name: nm, sub: r.sub || '', col: r.tone === 'w' ? '#FF9800' : '#5C74F6', icon: I('chart', 20), right: `<span class="sb-n ${r.tone === 'w' ? 'w' : ''}"><b>${esc(v)}</b>${u ? esc(u) : ''}</span>`, attr: tg && tg.ui ? `data-ui="${esc(JSON.stringify(tg.ui))}"` : '' }); });
      return SL.page('현황', `${more('dash')}<button type="button" class="btn ghost" data-act="dx-edit">항목 편집</button>`,
        SL.list(rows) + cmds(['이번 주 운영 요약해줘', '장기 미접속자 보여줘', '이번 달 매출 요약해줘'])); }
  });

  /* ═════════ 설정 하위 화면 — 탭 한 줄 · 설명은 ⓘ · 위험 동작은 위험 구역 ═════════ */
  AFTER.push(() => { if (!S || CUR.ws !== 'settings' || !UI.slSetIn) return; const main = $('#main'); if (!main || main.dataset.sbSet === String(UI.settings)) return; main.dataset.sbSet = String(UI.settings);
    /* 2~3단 탭: 설정 목록에서 이미 골랐으므로 그룹 탭 · 하위 탭은 숨기고 화면 안 탭 한 줄만 남긴다(다른 항목은 ‹ 설정 목록에서) */
    const back = main.querySelector('.sl-back'); const box = back ? back.parentElement : main; const kids = [...box.children];
    const top = kids.find(e => e.matches && e.matches('.seg2[role=tablist]')); const sub = kids.find(e => e.classList && e.classList.contains('subtabs'));
    if (back) [top, sub].forEach(e => { if (e) { e.hidden = true; e.style.display = 'none'; } });
    if (back) { back.classList.add('sb-setback'); const b = back.querySelector('button'); const nm = SBSET[UI.settings]; if (b && nm) b.innerHTML = `‹ 설정 <b class="sb-cur">${esc(nm)}</b>`; }
    /* 긴 설명 문단(맨 위 mini · 카드 안 mini)은 ⓘ로 */
    const tip = (p, h) => { const tx = p.textContent.trim(); if (!tx || tx.length < 40 || p.dataset.sl || p.querySelector('input,select,button,a,textarea')) return; p.dataset.sl = 1; p.hidden = true;
      if (!h || h.querySelector('.sl-i')) return; h.insertAdjacentHTML('beforeend', `<button type="button" class="sl-i" data-act="sl-tip" aria-label="설명" data-tip="${esc(tx)}">i</button>`); };
    box.querySelectorAll('.card p.mini, .card > p, section.card p.mini').forEach(p => { const c = p.closest('.card, section'); const h = c && c.querySelector('.ch b, .ch h3, h3, b'); tip(p, h); });
    kids.filter(e => e.matches('p.mini')).forEach(p => { const h = back && back.querySelector('.sb-cur') || back && back.querySelector('button'); tip(p, h); });
    /* 위험 동작(삭제 · 초기화 · 해지)은 접힌 '위험 구역'으로 — 기관 초기화(reset-all)는 slim.js가 이미 처리 */
    box.querySelectorAll('.danger').forEach(d => { if (d.closest('.sl-danger') || !d.querySelector('button')) return; const w = document.createElement('details'); w.className = 'sl-danger'; w.innerHTML = '<summary>위험 구역</summary>'; d.replaceWith(w); w.appendChild(d); });
  });
  AFTER.push(() => { const m = $('#main'); if (m && (CUR.ws !== 'settings' || !UI.slSetIn)) delete m.dataset.sbSet; });
  const SBSET = { menu: '메뉴 구성', rules: '학습 규칙 · AI 튜터', integr: 'API · MCP', lang: '언어', type: '기관 정보', plan: '요금제 · 결제', service: '가입 · 회원', home: '홈페이지', popup: '팝업', consult: '상담', terms: '약관', cover: '기능 맵', room: '데이터룸 · 배포', data: '데이터' };
  /* 아래 탭(같은 그룹) 이동 시에도 정리를 다시 */
  { const base = ACT.tab; ACT.tab = (el, ...r) => { if (el && el.dataset && el.dataset.key === 'settings') { const m = $('#main'); if (m) delete m.dataset.sbSet; } return base(el, ...r); }; }
})();
/* 운영(라이브) 계정 메뉴: slim.js가 비밀번호 변경을 계정 메뉴로 옮길 때 로그아웃(live-logout)도 같은 메뉴로 — 머리에 버튼을 남기지 않는다 */
(function () { if (typeof AFTER === 'undefined') return;
  AFTER.push(() => { const a = document.getElementById('liveAcct'); if (!a) return; const m = a.querySelector('.sl-acm'); const out = a.querySelector('[data-act="live-logout"]'); if (m && out && !m.contains(out)) { out.classList.remove('sm'); m.appendChild(out); } });
})();
