/* v34 slim-ai — 의도 실행형 AI SAM(대표님 2026-11-07: '자동화할 수 있는 부분은 유저가 의도만 입력하면 AI가 처리')
   ① 여러 단계 의도 → 계획 카드 하나: 문장을 단계로 나눠 체크리스트로 보여 주고 [모두 실행] 한 번으로 처리.
      금액 · 발송 · 삭제 단계는 카드에 표시하고, 누르면 한 번 더 확인한 뒤 실행. 빠진 값은 한 번에 묶어 묻는다(시트 하나). 결과는 건수 + 화면 링크.
      각 단계는 실행하는 순간 데이터를 다시 계산한다(앞 단계에서 만든 청구서 · 과정을 뒤 단계가 쓴다).
   ② 메뉴 · 연결 · 자동 운영 명령: '○○ 메뉴 켜줘/꺼줘' · '기본 메뉴로' · 'Slack 연결 도와줘'(연결 시트 — 키는 대화창에 받지 않음) · '자동 운영 ○○ 켜줘/꺼줘'.
   ③ 기관 유형별 추천 의도: 홈 칩 · 화면 AI SAM 추천(화면당 3개 = slimMD 추천 1 + 유형 의도 2).
   Claude 키가 없으면 이 규칙 엔진이 처리하고, 키가 있으면 Claude가 같은 엔진을 도구(run_intent)로 쓴다.
   개인정보: 카드 · 요약에는 이름 대신 건수만. 입력은 mem2 samMask(가장 바깥 chatSend) → 이 파일 순서로 지나간다. */
(function () {
  'use strict';
  const has = (s, re) => re.test(s);
  const K12 = () => S.org.type === 'k12';
  const tyKey = () => S.org.type === 'univ' && S.org.ed === 'lms' ? 'univ_lms' : S.org.type;
  const owner = () => S.me && S.me.role === 'owner';
  const teacher = () => S.me && S.me.role === 'teacher' || (typeof scn === 'function' && scn() === 'teacher');
  const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const ymOf = s => { const m = s.match(/(\d{1,2})\s*월/); if (m && +m[1] >= 1 && +m[1] <= 12) return `${today().slice(0, 4)}-${String(+m[1]).padStart(2, '0')}`; return /다음\s*달/.test(s) ? ymAdd(today().slice(0, 7), 1) : today().slice(0, 7); };
  const ymTxt = ym => `${+ym.slice(5)}월`;
  const nOf = r => { const m = String(r || '').match(/(\d[\d,]*)\s*(명|건|개|곳)/); return m ? +m[1].replace(/,/g, '') : 0; };
  const live = () => (S.members || []).filter(m => !m.withdrawn && m.grade !== '승인 대기' && m.grade !== '거절');
  const running = () => (S.classes || []).filter(c => c.status === '운영중');
  /* 계획 엔진(PLANS)을 거치는 기존 처리기를 늦게(실행 순간) 부른다 */
  const drop = r => { if (r && r.plan && PLANS[r.plan]) delete PLANS[r.plan]; return r || {}; };
  const fire = r => { if (!r || !r.plan || !PLANS[r.plan]) return { n: 0, msg: String((r && (r.text || r.title)) || '처리할 대상이 없습니다.') }; const P = PLANS[r.plan]; delete PLANS[r.plan]; const m = P.run(); return { n: nOf(m), msg: String(m || ''), go: P.go || '' }; };

  /* 보내기: 알림함 + 앱 푸시(보호자 연결이 있으면 보호자에게도). 이름은 계획 · 결과에 쓰지 않는다 */
  function siSend(ids, title, body, to, parents) { ids = [...new Set(ids)].filter(id => M(id)); if (!ids.length) return 0;
    if (parents && typeof W2 === 'object' && W2.notify) { const n = W2.notify(ids, title, body); logAudit(`AI SAM 발송 — ${title} ${ids.length}명`); return n; }
    S.msgs = S.msgs || []; S.inbox = S.inbox || {}; const tx = typeof body === 'function' ? '' : body;
    S.msgs.unshift({ id: uid('ms'), at: nowStr(), to, toIds: ids, title, body: tx, ch: '알림함 + 앱 푸시', n: ids.length, by: S.me.name });
    ids.forEach(id => { (S.inbox[id] = S.inbox[id] || []).unshift({ id: uid('ib'), at: nowStr(), title, body: typeof body === 'function' ? body(M(id)) : body, read: false }); });
    logAudit(`AI SAM 발송 — ${title} ${ids.length}명`); return ids.length; }
  const sendStep = (id, l, ids, title, body, go, parents) => ({ id, l, k: 'send', est: `${ids().length}명`, go: go || 'message', run: () => { const L = ids(); const n = siSend(L, title, body, l, parents); return { n: L.length, msg: `${L.length}명에게 보냈습니다${n > L.length ? `(보호자 포함 ${n}건)` : ''}` }; } });

  /* ═════════ 1. 단계 사전 — 문장 조각(clause) → 단계 ═════════
     단계: { id, l(이름), k(kind: money 금액 · send 발송 · del 삭제 · change 변경 · make 생성), est(지금 기준 건수), go(결과 화면), need[](빠진 값), run(X, V) }
     own(s): 한 조각짜리 문장일 때도 이 엔진이 맡을지(기존 엔진이 이미 잘하는 말은 그대로 둔다) */
  const L_ = () => t('learner'), K_ = () => t('cls');
  const CLS_W = '(강좌|과정|강의|수업|교과목|코스|클래스|교육과정|훈련과정|프로그램)';
  const SUG = { adult: ['엑셀 실무', '파워포인트 디자인', '생성형 AI 활용'], k12: ['중2 수학 심화', '고1 영어 내신', '초등 사고력 수학'], univ: ['AI 리터러시', '데이터 분석 기초', '캡스톤 디자인'], corp: ['신입 온보딩', '리더십 기초', '생성형 AI 업무 활용'], public: ['디지털 역량 기초', '민원 응대', '공공데이터 활용'], lifelong: ['바리스타 2급', '스마트폰 활용', '인문학 산책'], voc: ['웹개발 실무', '전기기능사', '스마트팩토리 운영'] };
  const STEPS = [
    { id: 'cert', m: s => /수료증/.test(s) && /(발급|만들|내줘|줘)/.test(s) || /수료\s*(기준|요건)/.test(s) && /(넘|충족|채운|달성)/.test(s), own: () => true,
      make: () => { const f = () => { const d = (typeof scxDefs === 'function' ? scxDefs('cert') : []).find(x => x[0] === 'ce-issue'); return d ? d[2]() : { text: '수료증 기능을 찾지 못했습니다.' }; }; const r = drop(f());
        return { l: '수료 기준 충족자 수료증 발급', k: 'make', est: r.plan ? `${nOf(r.text)}건` : '0건', go: 'cert', run: () => fire(f()) }; } },
    { id: 'unpaid', m: s => /미납/.test(s) && /(안내|알림|알려|독촉|보내|재알림)/.test(s), own: () => !K12(),
      make: () => { if (K12()) { const f = () => k12Probe('미납 알림 보내줘'); const r = drop(f()); return { l: '미납 보호자에게 납부 안내', k: 'send', est: r.plan ? `${nOf(r.title || r.text)}건` : '청구 후 계산', go: 'crmbill', run: () => fire(f()) }; }
        const L = () => (S.bills || []).filter(b => b.status === '미납'); return { l: '미납자에게 납부 안내', k: 'send', est: `${L().length}건`, go: 'billing', run: () => { const B = L(); B.forEach(b => { b.sent = true; b.sentAt = b.sentAt || today(); }); const n = siSend(B.map(b => b.who), '수강료 납부 안내', `${S.org.name}입니다. 납부 마감 전 수강료 납부를 부탁드립니다. 문의는 상담 채널로 남겨 주세요.`, '미납자', true); return { n: B.length, msg: `미납 ${B.length}건 안내를 보냈습니다${n ? `(${n}건 발송)` : ''}` }; } }; } },
    { id: 'bill', m: s => /(수강료|수업료|교육비|학습비|훈련비|회비|청구서?)/.test(s) && /(청구|발생|발행|만들|내줘|보내|걷)/.test(s) && !/(미납|자동|현황|요약|보여)/.test(s), own: s => !K12() || !/(수강료|수업료)/.test(s),
      make: s => { const ym = ymOf(s); if (K12()) { const q = `${ym === today().slice(0, 7) ? '이번 달' : ymTxt(ym)} 수강료 발생해줘`; const f = () => k12Probe(q); const r = drop(f()); return { l: `${ymTxt(ym)} 수강료 청구`, k: 'money', est: r.plan ? `${nOf(r.text)}건` : '0건', go: 'crmbill', run: () => fire(f()) }; }
        const tg = () => { const out = []; running().filter(c => +c.price > 0).forEach(c => (c.learners || []).forEach(id => { if (M(id) && !(S.bills || []).some(b => b.ym === ym && b.cls === c.id && b.who === id)) out.push([c, id]); })); return out; };
        const T0 = tg(); return { l: `${ymTxt(ym)} ${t('fee')} 청구서 만들기`, k: 'money', est: T0.length ? `${T0.length}건 · ${won(T0.reduce((a, [c]) => a + +c.price, 0))}` : '유료 과정 없음', go: menuOn('billing') || MENU.billing ? 'billing' : 'sales',
          run: () => { const T = tg(); S.bills = S.bills || []; const due = `${ym}-10`; const BT = {}; T.forEach(([c, id]) => S.bills.unshift({ id: uid('b'), batch: BT[c.id] = BT[c.id] || uid('bt'), ym, cls: c.id, who: id, to: [{ who: id, parent: false }], title: `${ymTxt(ym)} ${t('fee')} · ${c.name}`, items: [[`수업료 · ${c.name}`, +c.price, c.id, 'class']], due, notify: '마감 3일 전 + 당일', status: '미납', sent: false }));
            logAudit(`AI SAM 청구서 ${T.length}건 생성(${ym})`); return { n: T.length, msg: `청구서 ${T.length}건(${won(T.reduce((a, [c]) => a + +c.price, 0))})을 만들었습니다` }; } }; } },
    { id: 'absent', m: s => /결석/.test(s) && /(보호자|학부모|알림|안내|알려|보내|연락)/.test(s), own: () => true,
      make: () => { const ids = () => { const out = []; if (typeof W2 !== 'object' || !W2.units) return out; (S.classes || []).filter(c => c.status !== '종료').forEach(c => { let U = []; try { U = W2.units(c).filter(u => u.date === today()); } catch (e) { } U.forEach(u => (c.learners || []).forEach(id => { if (W2.get(c, u.id, id) === '결석') out.push(id); })); }); return [...new Set(out)]; };
        return sendStep('absent', `오늘 결석한 ${L_()}${K12() ? ' 보호자' : ''}에게 알림`, ids, '결석 알림', m => `[${S.org.name}] ${K12() ? `${m.name || ''} ${L_()}이(가) ` : ''}오늘 수업에 결석했습니다. 보강 · 자료는 학습 화면에서 확인하고, 문의는 상담 채널로 남겨 주세요.`, K12() ? 'crmatt' : 'attend', true); } },
    { id: 'away', m: s => /(미접속|접속\s*(안|하지)|안\s*들어|오래\s*안)/.test(s) && !/(자동화|매주|매일)/.test(s), own: s => /독려|안내|알림|보내|메시지/.test(s),
      make: s => { const d = +(s.match(/(\d+)\s*일/) || [])[1] || 14; return sendStep('away', `${d}일 이상 미접속 ${L_()} 독려`, () => live().filter(m => m.last && daysAgo(m.last) >= d).map(m => m.id), '학습 복귀 안내', `${S.org.name}입니다. 한동안 접속하지 않으셨어요. 남은 강의 하나만 먼저 들어도 진도가 올라갑니다.`, 'members'); } },
    { id: 'slow', m: s => /진도/.test(s) && /(미만|부진|낮|늦|미달)/.test(s) && /(독려|안내|보내|알려|메시지)/.test(s), own: () => false,
      make: s => { const thr = +(s.match(/(\d+)\s*%/) || [])[1] || 30; return sendStep('slow', `진도 ${thr}% 미만 ${L_()} 독려`, () => [...new Set(running().flatMap(c => (c.learners || []).filter(id => (+((c.prog || {})[id] || {}).p || 0) < thr)))], '학습 진도 안내', '이번 주 진도가 조금 늦어지고 있어요. 남은 영상 하나만 먼저 들어도 진도가 올라갑니다. 막히는 부분은 AI 튜터에게 물어보세요.', 'members'); } },
    { id: 'legal', m: s => /(법정|미이수)/.test(s) && /(안내|독려|보내|알려|마감)/.test(s), own: () => false,
      make: () => sendStep('legal', `법정교육 미이수 ${L_()}에게 마감 안내`, () => typeof legalUndone === 'function' ? [...new Set(legalUndone().map(x => x.id))] : [], '법정의무교육 이수 마감 안내', '법정의무교육 마감이 다가옵니다. 남은 차시를 기한 안에 마쳐 주세요.', 'compliance') },
    { id: 'attwarn', m: s => /출석률/.test(s) && /(경고|안내|보내|알려)/.test(s), own: () => false,
      make: s => { const thr = +(s.match(/(\d+)\s*%/) || [])[1] || 80; return sendStep('attwarn', `출석률 ${thr}% 미만 ${L_()}에게 경고`, () => [...new Set((S.classes || []).flatMap(c => Object.entries(c.prog || {}).filter(([, p]) => p.att != null && +p.att < thr).map(([id]) => id)))], '출석률 관리 안내', `출석률이 ${thr}%에 못 미치고 있습니다. 남은 훈련 일정에 빠짐없이 참여해 주세요.`, 'attend'); } },
    { id: 'diag', m: s => /진단/.test(s) && /(안\s*한|미완료|안\s*받|미참여)/.test(s) && /(안내|보내|알려)/.test(s), own: () => false,
      make: () => sendStep('diag', `AI 진단 미완료 ${L_()}에게 안내`, () => live().filter(m => !m.diag).map(m => m.id), 'AI 진단 참여 안내', 'AI 진단을 마치면 나에게 맞는 학습 경로를 추천받을 수 있어요. 10분이면 끝납니다.', 'diag') },
    { id: 'qna', m: s => /(미답변|답변\s*안|답\s*안\s*한|질문)/.test(s) && /(답변|초안|답해)/.test(s), own: () => false,
      make: () => { const P = () => (S.posts || []).filter(p => p.kind === '질문' && !p.replies && !p.draft); const Q = () => (typeof tqEnsure === 'function' ? tqEnsure() : []).filter(x => x.st !== 'answered' && !x.draft);
        return { l: '미답변 질문 답변 초안', k: 'make', est: `${P().length + Q().length}건`, go: 'community', run: () => { const A = P(), B = Q(); A.forEach(p => { p.draft = AI.reply(p); }); B.forEach(x => { x.draft = `질문 남겨 주셔서 감사합니다. 「${String(x.cls || '이 강의')}」 해당 차시 자료의 핵심 개념 부분을 먼저 확인해 주세요. 그래도 막히면 화면을 캡처해 다시 남겨 주시면 이어서 답변드리겠습니다.`; }); logAudit(`AI SAM 답변 초안 ${A.length + B.length}건`); return { n: A.length + B.length, msg: `답변 초안 ${A.length + B.length}건을 만들었습니다(등록은 확인 후)` }; } }; } },
    { id: 'refund', m: s => /(환불|반환)/.test(s) && /(검토|확인|처리|승인|해줘|봐|정리)/.test(s) && !/(규정|약관)/.test(s), own: () => true,
      make: s => { const go2 = menuOn('lifelong') ? 'lifelong' : 'sales'; const L = () => (S.pays || []).filter(p => p.status === '환불 신청'); const done = /(처리|승인|환불해|돌려)/.test(s) && !/검토/.test(s);
        const calc = p => { const c = (S.classes || []).find(x => x.name === p.item); const pr = c ? +((c.prog || {})[p.who] || {}).p || 0 : 0; const r = pr <= 0 ? 1 : pr < 100 / 3 ? 2 / 3 : pr < 50 ? 1 / 2 : 0; return { amt: Math.round(+p.amount * r / 10) * 10, rule: pr <= 0 ? '수강 전 — 전액' : pr < 100 / 3 ? '1/3 경과 전 — 2/3' : pr < 50 ? '1/2 경과 전 — 1/2' : '1/2 경과 후 — 반환 없음', pr }; };
        if (done) return { l: `${t('fee')} 환불 ${L().length}건 처리`, k: 'money', est: `${L().length}건 · ${won(L().reduce((a, p) => a + calc(p).amt, 0))}`, go: go2, run: () => { const X = L(); let sum = 0; X.forEach(p => { const c = calc(p); p.refund = c.amt; p.refundRule = c.rule; p.status = '환불 완료'; p.refundAt = today(); sum += c.amt; }); logAudit(`AI SAM 환불 처리 ${X.length}건`); return { n: X.length, msg: `환불 ${X.length}건(${won(sum)})을 처리했습니다` }; } };
        return { l: `환불 · 반환 신청 ${L().length}건 규정 검토`, k: 'make', est: `${L().length}건 · 기한 5일`, go: go2, run: () => { const X = L(); X.forEach(p => { const c = calc(p); p.review = { at: today(), amt: c.amt, rule: c.rule, due: addDays(p.at, 5), by: 'AI SAM 초안' }; }); logAudit(`AI SAM 환불 검토 초안 ${X.length}건`); return { n: X.length, msg: `${X.length}건 검토 초안을 만들었습니다(반환 예정 ${won(X.reduce((a, p) => a + p.review.amt, 0))}, 승인은 화면에서)` }; } }; } },
    { id: 'grade', m: s => /채점/.test(s) && !/루브릭/.test(s), own: () => false,
      make: () => ({ l: '채점 대기 과제 AI 채점 초안', k: 'make', est: `${pend().length}건`, go: 'assess', run: () => { const P = pend(); P.forEach(({ c, id }) => { c.prog[id].draft = AI.gradeDraft(c, id); }); logAudit(`AI SAM 채점 초안 ${P.length}건`); return { n: P.length, msg: `채점 초안 ${P.length}건을 만들었습니다(확정은 화면에서)` }; } }) },
    { id: 'approve', m: s => /승인\s*대기/.test(s) && /승인(해|하|처리)/.test(s), own: () => false,
      make: () => { const W = () => (S.members || []).filter(m => m.grade === '승인 대기'); return { l: `가입 승인 대기 ${L_()} 승인`, k: 'change', est: `${W().length}명`, go: 'members', run: () => { const X = W(); X.forEach(m => { m.grade = '정회원'; }); logAudit(`AI SAM 가입 승인 ${X.length}명`); return { n: X.length, msg: `${X.length}명을 승인했습니다` }; } }; } },
    { id: 'hrd', m: s => /HRD/i.test(s) && /(보고|준비|만들|자료)/.test(s), own: () => false,
      make: () => ({ l: 'HRD-Net 주간 보고 자료 만들기', k: 'make', est: `${(S.members || []).length}명 기준`, go: 'hrd', run: () => { const r = interpret('HRD 보고'); const m = r.run ? r.run() : ''; return { n: nOf(m), msg: String(m || '보고 자료를 만들었습니다') }; } }) },
    { id: 'notice', m: s => /(공지|안내문)/.test(s) && /(써|작성|올려|게시|만들)/.test(s), own: () => false,
      make: s => { const topic = s.replace(/(공지|안내문)\S*|(써|작성|올려|게시|만들)\S*/g, ' ').replace(/\s+/g, ' ').trim() || '운영 안내'; return { l: `「${topic}」 공지 게시`, k: 'send', est: '전체 공개', go: menuOn('board') ? 'board' : 'community', run: () => { (S.notices = S.notices || []).unshift({ id: uid('n'), title: topic, at: today(), pin: true, body: AI.notice(topic) }); logAudit(`AI SAM 공지 — ${topic}`); return { n: 1, msg: `「${topic}」 공지 1건을 올렸습니다` }; } }; } },
    { id: 'csv', m: s => /(엑셀|csv|명단|파일|스프레드시트|시트)/i.test(s) && /(등록|올려|넣|추가|가입)/.test(s), own: () => !K12(),
      make: (s, V) => { const rows = V.rows || null; return { l: `${L_()} 명단으로 등록${/(수강|강좌|과정)/.test(s) || true ? ' · 수강 등록' : ''}`, k: 'change', est: rows ? `${rows.length}명` : '파일 필요', go: 'members', need: rows ? [] : [{ key: 'rows', label: `${L_()} 명단(엑셀에서 복사해 붙여 넣기 또는 CSV)`, type: 'rows' }],
        run: X => { const R = V.rows || []; const U = S.org.type === 'univ'; const made = []; const gid = name => { if (!name) return ''; let g = (S.groups || []).find(y => y.name === name); if (!g) { g = { id: uid('g'), name, lead: '' }; (S.groups = S.groups || []).push(g); } return g.id; };
          R.forEach(r => { let m = (S.members || []).find(x => r.sid && (x.sid === r.sid || (x.extra && (x.extra.학번 === r.sid || x.extra.사번 === r.sid)))); if (!m) { const sid = r.sid || `N${String((S.members || []).length + 1).padStart(4, '0')}`; m = { id: uid('m'), sid, name: !U && r.name ? r.name : `${t('learner')} ${sid}`, nick: !U && r.name ? r.name : sid, email: '', phone: '', group: gid(r.grp), grade: '정회원', joined: today(), last: '', extra: S.org.type === 'corp' ? { 사번: sid, 부서: r.grp || '' } : U ? { 학번: sid, 학과: r.grp || '' } : {} }; S.members.push(m); } made.push(m.id); });
          const CC = (X.made.length ? X.made.map(C) : []).filter(Boolean); CC.forEach(c => { c.prog = c.prog || {}; made.forEach(id => { if (!(c.learners || []).includes(id)) { c.learners = [...(c.learners || []), id]; c.prog[id] = c.prog[id] || { p: 0, exam: null, assign: 'none', att: 0 }; } }); });
          logAudit(`AI SAM 명단 등록 ${made.length}명(번호 · 소속만)`); return { n: made.length, msg: `${made.length}명을 등록했습니다${CC.length ? ` · ${K_()} ${CC.length}개에 수강 등록` : ''}` }; } }; } },
    { id: 'course', m: s => new RegExp(CLS_W).test(s) && /(만들|열|개설|생성|추가|설계)/.test(s) && !/(공지|퀴즈|커리큘럼|자료|교재|홈페이지|사이트|배지|루브릭|진단|저니|초대)/.test(s), own: s => /(\d+)\s*개/.test(s) && !/(설계|커리큘럼)/.test(s),
      make: (s, V) => { const n = Math.min(12, Math.max(1, +(s.match(/(\d+)\s*개/) || [])[1] || 1)); const wk = (s.match(typeof SESS_RE !== 'undefined' ? SESS_RE : /(\d+)\s*(?:차시|회차|주)/) || [])[1]; const fee = typeof aiFee === 'function' ? aiFee(s) : null;
        let name = (typeof feeStrip === 'function' ? feeStrip(s) : s).replace(typeof SESS_RE !== 'undefined' ? new RegExp(SESS_RE.source, 'g') : /x^/, ' ').replace(/(이번|다음)\s*(학기|달|주|분기)|\d+\s*개|새로?\s|신규\s/g, ' ').replace(new RegExp(`${CLS_W}\\S*`, 'g'), ' ').replace(/(만들|열|개설|생성|추가|설계)\S*/g, ' ').replace(/\s+/g, ' ').trim();
        const names = V.names && V.names.length ? V.names.slice(0, n) : name && n === 1 ? [name] : name ? Array.from({ length: n }, (_, i) => `${name} ${i + 1}`) : null;
        const price = V.price != null ? V.price : fee && fee.price != null ? fee.price : null; const need = [];
        if (!names) need.push({ key: 'names', label: `${K_()} 이름${n > 1 ? ` ${n}개(한 줄에 하나)` : ''}`, type: 'lines', def: (SUG[S.org.type] || SUG.adult).slice(0, n).concat(Array.from({ length: Math.max(0, n - 3) }, (_, i) => `새 ${K_()} ${i + 4}`)).join('\n') });
        if (fee && fee.amb && V.price == null) need.push({ key: 'price', label: `${t('fee')}(원)`, type: 'num', def: (fee.opts || [])[0] || 0, hint: fee.amb });
        const wks = +wk || +V.weeks || (S.org.type === 'univ' ? 15 : 6);
        return { l: `${K_()} ${n}개 만들기${names ? ` — ${names.join(' · ')}` : ''}`, k: 'make', est: `${n}개 · ${wks}${S.org.type === 'univ' ? '주' : '차시'}${price ? ` · ${won(price)}` : price === 0 ? ' · 무료' : ''}`, go: 'class', need,
          run: X => { const L = (V.names && V.names.length ? V.names : names || []).slice(0, 12); L.forEach(nm => { const c = makeCourse({ topic: nm, weeks: wks }); if (price) c.price = price; X.made.push(c.id); }); if (X.made[0]) UI.cls = X.made[0]; logAudit(`AI SAM ${K_()} ${L.length}개 생성`); return { n: L.length, msg: `${K_()} ${L.length}개를 만들었습니다(준비중${price ? ` · ${won(price)}` : ''})` }; } }; } },
    { id: 'publish', m: s => /(홈페이지|사이트|포털|학습자\s*화면)\S*\s*(에|에도)?\s*(올리|올려|게시|공개|노출|띄우)|(강좌|과정|수업)?\s*(공개|게시|오픈|판매\s*시작|모집\s*시작)(해|하|처리)?/.test(s) && !/(공지|사이트\s*게시해|홈페이지\s*(만들|게시해))/.test(s), own: () => false,
      make: () => { const tg = X => X && X.made.length ? X.made.map(C).filter(Boolean) : (S.classes || []).filter(c => c.status === '준비중'); return { l: `${K_()} 홈페이지 공개(운영중 · 전체 공개)`, k: 'change', est: `${tg(null).length || '앞 단계'}개`, go: 'site', run: X => { const L = tg(X); L.forEach(c => { c.status = '운영중'; c.open = '전체'; }); logAudit(`AI SAM ${K_()} 공개 ${L.length}개`); return { n: L.length, msg: `${K_()} ${L.length}개를 학습자 홈페이지에 공개했습니다` }; } }; } },
    { id: 'invite', m: s => /초대\s*(링크|코드|주소|url)/i.test(s), own: () => false,
      make: () => ({ l: `${L_()} 초대 링크 만들기`, k: 'make', est: '링크 1개', go: 'enroll', run: X => { if (typeof mbInvite !== 'function') return { n: 0, msg: '초대 기능을 찾지 못했습니다' }; const iv = mbInvite('student', X.made[0] || '', ''); const url = mbInvURL(iv); X.copy = url; save(); return { n: 1, msg: `초대 링크 1개: ${url}` }; } }) }
  ];
  const stepOf = s => STEPS.find(d => { try { return d.m(s); } catch (e) { return false; } });

  /* 문장 → 조각: '하고 · 고 · 그리고 · 및 · 쉼표 · 한 뒤' 기준. '보고 · 경고 · 광고'는 끊지 않는다 */
  const KEEP = /(보고|경고|광고|최고|재고|참고|사고|공고|신고|잔고|원고)$/;
  function siSplit(q) { const out = [];
    String(q || '').replace(/\s+/g, ' ').trim().split(/\s*(?:,|，|그리고|및|그\s*다음에?|한\s*(?:뒤|후|다음)에?|하고\s*나서|그\s*후에?)\s+/).forEach(p => { let buf = '';
      p.split(' ').forEach(w => { buf = buf ? buf + ' ' + w : w; if (w.length >= 2 && /[가-힣]고$/.test(w) && !KEEP.test(w)) { out.push(buf.replace(/고$/, '')); buf = ''; } }); if (buf) out.push(buf); });
    return out.map(x => x.trim()).filter(x => x.length > 1); }

  /* ═════════ 2. 계획 만들기 ═════════ */
  const KIND = { money: ['금액', 'r'], send: ['발송', 'y'], del: ['삭제', 'r'] };
  const SI_PEND = {}; /* 빠진 값 입력 대기(새로고침하면 사라짐) */
  function siPlan(q, V = {}) { const parts = siSplit(q); const steps = [], skip = [];
    parts.forEach(p => { const d = stepOf(p); if (!d) { skip.push(p); return; } if (steps.some(x => x.did === d.id) && !['notice', 'course'].includes(d.id)) return; let st; try { st = d.make(p, V); } catch (e) { console.error(e); skip.push(p); return; } st.did = d.id; st.src = p; st.own = !!(d.own && d.own(p)); steps.push(st); });
    const bi = steps.findIndex(x => x.did === 'bill'); steps.forEach((x, i) => { if (bi >= 0 && i > bi && x.did === 'unpaid') x.est = '청구 후 다시 계산'; if (i > 0 && x.did === 'publish' && steps.slice(0, i).some(y => y.did === 'course')) x.est = '앞에서 만든 ' + K_(); });
    return { q, steps, skip, need: steps.flatMap(s => s.need || []) }; }
  function siCard(P, V) {
    const rows = P.steps.map(s => ({ l: s.l, k: s.k, est: s.est }));
    if (P.need.length) { const key = uid('si'); SI_PEND[key] = { q: P.q, V: V || {}, need: P.need };
      return { title: '빠진 값만 알려 주세요', text: `${P.steps.length}단계로 처리하겠습니다. 아래 ${P.need.length}가지를 한 번에 입력하면 계획을 완성합니다.`, si: rows, siNeed: P.need.map(n => n.label), btn: { act: 'si-fill', v: key, label: '빠진 값 입력' }, via: 'AI SAM 계획' }; }
    const risky = P.steps.filter(s => KIND[s.k]); const pid = uid('p'); const go2 = (P.steps[P.steps.length - 1] || {}).go || '';
    PLANS[pid] = { run: () => siExec(P), go: go2, si: true, risky: risky.map(s => `${KIND[s.k][0]} · ${s.l} · ${s.est}`) };
    const multi = P.steps.length > 1;
    return { title: multi ? `${P.steps.length}단계 실행 계획` : P.steps[0].l, text: `${multi ? `요청을 ${P.steps.length}단계로 나눴습니다. ` : ''}${risky.length ? `금액 · 발송 단계는 [${multi ? '모두 실행' : '실행'}]을 누른 뒤 한 번 더 확인합니다.` : '확인하고 실행을 눌러 주세요.'}${P.skip.length ? `\n이해하지 못한 부분: 「${P.skip.join('」 「')}」 — 화면에서 직접 하거나 다시 말씀해 주세요.` : ''}`,
      si: rows, plan: pid, state: 'pending', cta: multi ? '모두 실행' : '실행', via: 'AI SAM 계획' }; }
  let SI_LAST = null;
  function siExec(P) { const X = { made: [], q: P.q }; const out = []; let stop = false;
    P.steps.forEach(s => { if (stop) { out.push({ l: s.l, msg: '앞 단계가 실패해 건너뜀', bad: true }); return; } try { const r = s.run(X) || {}; out.push({ l: s.l, n: r.n || 0, msg: r.msg || '완료', go: r.go || s.go }); } catch (e) { console.error(e); out.push({ l: s.l, msg: '실패 — ' + String(e.message || e).slice(0, 80), bad: true }); stop = true; } });
    S.ai.usage++; save(); SI_LAST = { out, copy: X.copy || '' };
    return out.length > 1 ? `${out.filter(o => !o.bad).length}/${out.length}단계를 처리했습니다.\n` + out.map((o, i) => `${i + 1}. ${o.l} — ${o.msg}`).join('\n') : (out[0] || {}).msg || '처리했습니다.'; }

  /* 카드 그리기: 단계 체크리스트 + 금액 · 발송 표시 */
  { const base = aiBody; aiBody = m => { if (!m || !m.si) return base(m); const done = m.state === 'done';
      const list = `<ol class="si-steps">${m.si.map(r => `<li class="${done ? 'ok' : ''}"><span class="si-ck" aria-hidden="true">${done ? '✓' : ''}</span><span class="si-l">${esc(r.l)}</span><span class="si-m"><span class="si-e">${esc(r.est || '')}</span>${KIND[r.k] ? `<span class="tag ${KIND[r.k][1]}">${KIND[r.k][0]}</span>` : ''}</span></li>`).join('')}</ol>`;
      const need = m.siNeed ? `<p class="si-need">${ic('spark', 12)} 필요한 값: ${m.siNeed.map(esc).join(' · ')}</p>` : '';
      const h = base({ ...m, steps: null, html: '' }); const i = h.indexOf('<div class="mact">'); const body = list + need + (m.html ? `<div class="mcard">${m.html}</div>` : '');
      return i >= 0 ? h.slice(0, i) + body + h.slice(i) : h + body; }; }
  /* [모두 실행]: 금액 · 발송 · 삭제 단계가 있으면 한 번 더 확인 → 실행 → 결과에 건수와 화면 링크 */
  { const base = ACT['plan-ok']; ACT['plan-ok'] = (el, ...r) => { const pid = el && el.dataset && el.dataset.v; const P = PLANS[pid];
      if (!P || !P.si) return base(el, ...r);
      const runIt = () => { SI_LAST = null; base(el, ...r); const L = SI_LAST; if (!L) return; const m = [...S.chat].reverse().find(x => x.role === 'ai' && /^완료했습니다/.test(x.text || '')); if (!m) return;
        const G = [...new Set(L.out.filter(o => o.go && !o.bad).map(o => o.go))].filter(g => g === 'home' || MENU[g]); m.go = '';
        m.html = (L.copy ? `<p class="si-url"><code>${esc(L.copy)}</code></p>` : '') + (G.length ? `<div class="si-links">${G.map(g => `<button class="btn sm" data-act="go" data-v="${esc(g)}">${esc(mlabel(g))} 열기 ${ic('arrow', 12)}</button>`).join('')}</div>` : '');
        if (L.copy) m.copy = L.copy; save(); renderThreads(); };
      if (!P.risky.length || P.ok) return runIt();
      modal('실행 전 확인', `<p>아래 단계는 금액이 생기거나 ${t('learner')}에게 발송됩니다. 실행할까요?</p><ul class="si-risk">${P.risky.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '확인하고 실행', kind: 'pri', run: () => { P.ok = true; setTimeout(runIt, 0); } }]); }; }

  /* 빠진 값: 시트 하나에서 한 번에 받는다 */
  ACT['si-fill'] = el => { const key = el.dataset.v; const X = SI_PEND[key]; if (!X) { toast('입력 시간이 지났습니다. 다시 말씀해 주세요.', 'warn'); return; }
    const f = X.need.map(n => n.type === 'rows' ? `<label class="fl">${esc(n.label)}<textarea name="${n.key}" rows="6" placeholder="${S.org.type === 'univ' ? '학번,학과' : '번호,이름,소속'}&#10;${S.org.type === 'univ' ? '20261001,경영학과' : 'E0001,홍길동,1반'}"></textarea></label><label class="fl">또는 CSV 파일<input type="file" name="${n.key}F" accept=".csv,.txt,text/csv"></label><p class="mini">${S.org.type === 'univ' ? '학번 · 학과만 저장합니다.' : '번호 · 이름 · 소속만 저장하고 연락처 칸은 저장하지 않습니다.'}</p>`
      : n.type === 'lines' ? `<label class="fl">${esc(n.label)}<textarea name="${n.key}" rows="4">${esc(n.def || '')}</textarea></label>`
      : `<label class="fl">${esc(n.label)}<input name="${n.key}" type="number" min="0" step="1000" value="${+n.def || 0}"></label>${n.hint ? `<p class="mini">${esc(n.hint)}</p>` : ''}`).join('');
    SL.sheet('빠진 값 입력', `<form id="siForm" data-k="${esc(key)}">${f}</form>`, `<button class="btn ghost" data-act="sl-close">취소</button><button class="btn pri" data-act="si-fill-ok" data-v="${esc(key)}">계획 만들기</button>`); };
  const parseRows = tx => { const L = String(tx || '').split(/\r?\n/).map(l => l.split(/\t|,/).map(x => x.trim())).filter(r => r.some(Boolean)); if (!L.length) return [];
    const hd = L[0].join(' '); const head = /(번호|학번|사번|이름|성명|소속|학과|부서|반|id)/i.test(hd) && !/\d{4,}/.test(hd); const H = head ? L[0] : [];
    const col = re => H.findIndex(h => re.test(h)); const iS = head ? col(/(번호|학번|사번|id)/i) : 0, iN = head ? col(/(이름|성명)/) : (S.org.type === 'univ' ? -1 : 1), iG = head ? col(/(소속|학과|부서|반|그룹)/) : (S.org.type === 'univ' ? 1 : 2);
    return (head ? L.slice(1) : L).slice(0, 500).map(r => ({ sid: String(r[iS] || '').replace(/[^\w-]/g, '').slice(0, 20), name: iN >= 0 ? String(r[iN] || '').replace(/[<>]/g, '').slice(0, 30) : '', grp: iG >= 0 ? String(r[iG] || '').replace(/[<>]/g, '').slice(0, 30) : '' })).filter(r => r.sid || r.name); };
  ACT['si-fill-ok'] = async el => { const key = el.dataset.v; const X = SI_PEND[key]; const w = $('#siForm'); if (!X || !w) return; const V = { ...X.V };
    for (const n of X.need) { if (n.type === 'rows') { const fl = w.querySelector(`[name="${n.key}F"]`); let tx = (w.querySelector(`[name="${n.key}"]`) || {}).value || ''; if (fl && fl.files && fl.files[0]) { try { tx = await fl.files[0].text(); } catch (e) { } } const R = parseRows(tx); if (!R.length) { toast('명단을 한 줄 이상 넣어 주세요.', 'warn'); return; } V.rows = R; }
      else if (n.type === 'lines') { const L = String((w.querySelector(`[name="${n.key}"]`) || {}).value || '').split(/\r?\n/).map(x => x.trim().slice(0, 60)).filter(Boolean); if (!L.length) { toast(`${n.label}을(를) 넣어 주세요.`, 'warn'); return; } V[n.key] = L; }
      else V[n.key] = Math.max(0, Math.round(+((w.querySelector(`[name="${n.key}"]`) || {}).value) || 0)); }
    delete SI_PEND[key]; slClose(); const P = siPlan(X.q, V); const card = siCard(P, V); S.chat.push({ role: 'ai', ...card }); S.chat = S.chat.slice(-60); save(); renderThreads(); };

  /* ═════════ 3. 메뉴 · 연결 · 자동 운영 명령(바로 처리, 되돌리기 제공) ═════════ */
  const SI_UNDO = {};
  const undoBtn = fn => { const k = uid('u'); SI_UNDO[k] = fn; return { act: 'si-undo', v: k, label: '되돌리기' }; };
  ACT['si-undo'] = el => { const f = SI_UNDO[el.dataset.v]; if (!f) { toast('되돌릴 수 없습니다(시간이 지났습니다).', 'warn'); return; } delete SI_UNDO[el.dataset.v]; f(); save(); render(); renderThreads(); toast('되돌렸습니다.', 'ok'); };
  const norm = s => String(s || '').replace(/[\s·・,./()]/g, '').toLowerCase();
  const tabsAll = () => Object.values(S.nav.tabs || {}).flat().filter(x => MENU[x.id] && !(MENU[x.id].only && MENU[x.id].only !== S.org.type && !(S.org.type === 'univ' && MENU[x.id].only === 'univ')));
  const CN_MAP = [[/(slack|슬랙)/i, 'slack'], [/(google|구글|캘린더|지메일|gmail)/i, 'google'], [/(toss|토스)/i, 'toss'], [/(채널톡|channel\s*talk)/i, 'channeltalk'], [/(claude|클로드)/i, 'claude'], [/\bmcp\b/i, 'mcp']];
  const AUTO_W = [[/독려|진도/, 'nudge'], [/미접속|복귀/, 'away'], [/답변|질문/, 'qna'], [/채점/, 'grade'], [/주간|리포트|보고서/, 'weekly'], [/HRD/i, 'hrd'], [/결석/, 'absent'], [/미납|청구/, 'unpaid'], [/배지/, 'badge'], [/법정|미이수/, 'legal'], [/출석/, 'att'], [/환불|반환/, 'refund'], [/후기/, 'review'], [/부정/, 'fraud'], [/온보딩|입사/, 'newhire'], [/상담/, 'consult'], [/폐강|수요|10명/, 'demand'], [/결제\s*안내|얼리버드/, 'early']];
  function siSetting(q) { const s = String(q || '').trim();
    /* 메뉴 */
    if (/기본\s*메뉴/.test(s) && /(로|돌려|되돌|초기화|복구|만들)/.test(s)) { if (teacher()) return { text: `${t('teacher')} 권한으로는 메뉴를 바꿀 수 없습니다.` }; const snap = tabsAll().map(x => [x.id, x.on]); slimApply(); save(); setTimeout(render, 0);
      return { title: '기본 메뉴로 되돌렸습니다', text: `${TYPES[S.org.type].name} 필수 메뉴 ${slimEss().length}개만 켰습니다: ${slimEss().map(mlabel).join(' · ')}.`, btn: undoBtn(() => snap.forEach(([id, on]) => slMenuSet(id, on))), via: 'AI SAM 설정' }; }
    const mm = s.match(/^(.{1,20}?)\s*(메뉴|탭)\s*(을|를|도|만)?\s*(다시\s*)?(켜|꺼|끄|보이|숨|추가|빼|없애|열어\s*둬|살려)/);
    if (mm) { if (teacher()) return { text: `${t('teacher')} 권한으로는 메뉴를 바꿀 수 없습니다.` }; const on = /(켜|보이|추가|열어|살려)/.test(mm[5]); const k = norm(mm[1]); const T = tabsAll();
      const hit = T.find(x => norm(mlabel(x.id)) === k) || T.find(x => norm(mlabel(x.id)).includes(k) || k.includes(norm(mlabel(x.id)))) || T.find(x => norm((typeof slimMD === 'function' ? slimMD(x.id)[0] : '')).includes(k));
      if (!hit) return { text: `「${mm[1]}」 메뉴를 찾지 못했습니다. [메뉴 추가]에서 이름을 확인해 주세요.`, go: 'more' };
      if (hit.on === on) return { text: `'${mlabel(hit.id)}' 메뉴는 이미 ${on ? '켜져' : '꺼져'} 있습니다.` };
      slMenuSet(hit.id, on); setTimeout(render, 0); return { title: `'${mlabel(hit.id)}' 메뉴를 ${on ? '켰습니다' : '껐습니다'}`, text: on ? '왼쪽 메뉴에 생겼습니다. 끈 메뉴의 데이터는 지워지지 않습니다.' : '데이터는 그대로 남아 있고, 다시 켜면 바로 보입니다.', btn: undoBtn(() => slMenuSet(hit.id, !on)), via: 'AI SAM 설정' }; }
    /* 연결 — 키 · 토큰은 대화창에서 받지 않는다(연결 시트에서만 입력) */
    if (/(연결|연동)/.test(s) && /(도와|해\s*줘|해줘|하고\s*싶|방법|어떻게|하기|시작|열어)/.test(s) && !/(자동화|끊|해제)/.test(s)) { const c = CN_MAP.find(([re]) => re.test(s)); if (c && typeof CN === 'object' && CN[c[1]]) { const id = c[1];
        if (!owner()) return { text: '외부 연결은 정운영자만 관리할 수 있습니다.' };
        setTimeout(() => { try { ACT['cn-open']({ dataset: { v: id } }); } catch (e) { console.error(e); } }, 120);
        return { title: `${CN[id].name.replace(/\(.*\)/, '').trim()} 연결 창을 열었습니다`, text: '연결 창에서 순서대로 진행하세요. 키 · 토큰은 대화창에 붙여 넣지 말고 연결 창에만 입력해 주세요.', via: 'AI SAM 설정' }; } }
    /* 자동 운영 */
    if (/자동\s*(운영|화)/.test(s) && /(상태|현황|목록|뭐|보여)/.test(s) && !/(켜|꺼|끄|만들)/.test(s)) { const A = S.autos || []; return { title: `자동 운영 ${A.filter(a => a.on).length}/${A.length}개 켜짐`, text: A.length ? A.slice(0, 12).map(a => `${a.on ? '● ' : '○ '}${a.name}`).join('\n') : '아직 자동 운영이 없습니다.', go: 'auto', via: 'AI SAM 설정' }; }
    const am = s.match(/(?:자동\s*(?:운영|화)\s*)?(.{1,30}?)\s*(?:자동\s*(?:운영|화))?\s*(?:을|를)?\s*(다시\s*)?(켜|꺼|끄|멈춰|중지|시작)/);
    if (am && /자동\s*(운영|화)/.test(s) && !/(만들|설계|매주|매일|매월|마다)/.test(s)) { if (teacher()) return { text: `${t('teacher')} 권한으로는 자동 운영을 바꿀 수 없습니다.` }; const on = /(켜|시작)/.test(am[3]); const k = norm(am[1].replace(/자동\s*(운영|화)?/g, '')); const A = S.autos || [];
      const w = AUTO_W.filter(([re]) => re.test(am[1])).map(x => x[1]); const sc = a => (k && norm(a.name).includes(k) ? 10 : 0) + w.filter(x => (a.key || '').includes(x) || (x === 'qna' && /답변/.test(a.name)) || (x === 'weekly' && /주간|리포트/.test(a.name)) || (x === 'att' && /출석/.test(a.name)) || (x === 'legal' && /법정/.test(a.name)) || (x === 'unpaid' && /미납/.test(a.name)) || (x === 'absent' && /결석/.test(a.name))).length * 3 + [...new Set(norm(am[1]))].filter(ch => /[가-힣]/.test(ch) && norm(a.name).includes(ch)).length * .2;
      const a = A.map(a => [a, sc(a)]).sort((x, y) => y[1] - x[1]).find(x => x[1] >= 1.2);
      if (!a) return { text: `「${am[1].trim() || '자동 운영'}」에 맞는 자동 운영을 찾지 못했습니다. 지금 있는 것: ${A.map(x => x.name).slice(0, 8).join(' · ') || '없음'}.`, go: 'auto' };
      const au = a[0]; if (au.on === on) return { text: `「${au.name}」은(는) 이미 ${on ? '켜져' : '꺼져'} 있습니다.`, go: 'auto' };
      if (!on) { au.on = false; logAudit(`AI SAM 자동 운영 끄기 — ${au.name}`); save(); setTimeout(render, 0); return { title: `「${au.name}」을(를) 껐습니다`, text: '다시 켜려면 "자동 운영 ' + au.name + ' 켜줘"라고 하세요.', btn: undoBtn(() => { au.on = true; }), via: 'AI SAM 설정' }; }
      const send = (au.actions || []).some(x => ['msg', 'parent', 'manager', 'report'].includes(x));
      return siCard({ q: s, steps: [{ l: `자동 운영 「${au.name}」 켜기`, k: send ? 'send' : 'change', est: `${trigLabel(au.trigger)}`, go: 'auto', run: () => { au.on = true; logAudit(`AI SAM 자동 운영 켜기 — ${au.name}`); return { n: 1, msg: `「${au.name}」을(를) 켰습니다(${trigLabel(au.trigger)})` }; } }], skip: [], need: [] }); }
    return null; }

  /* 화면 추천 말(slimMD) 중 기존 엔진이 답하지 못하던 조회 */
  function siLook(q) { const s = String(q || '').trim(); const L = L_(), K = K_();
    if (/^수료\s*대상자?\s*(보여|알려|찾아)/.test(s)) { const W = []; (S.classes || []).forEach(c => (c.learners || []).forEach(id => { if ((+((c.prog || {})[id] || {}).p || 0) >= ((c.criteria && c.criteria.threshold) || 80) && !(S.certs || []).some(x => x.cls === c.id && x.who === id)) W.push(c); })); return { text: `수료 기준을 채우고 수료증이 아직 없는 건은 ${W.length}건입니다.`, steps: [...new Set(W.map(c => c.name))].slice(0, 6).map(n => `${n} — ${W.filter(c => c.name === n).length}건`), btn: W.length ? { act: 'chat-q', v: '수료 기준 넘은 사람 수료증 발급', label: '수료증 발급 계획' } : null, go: 'cert' }; }
    if (/^미이수자\s*(보여|알려|찾아)/.test(s)) { const n = typeof legalUndone === 'function' ? new Set(legalUndone().map(x => x.id)).size : 0; return { text: `법정교육 미이수 ${L}${AI.j(L, '은')} ${n}명입니다.`, btn: n ? { act: 'chat-q', v: '법정교육 미이수자에게 마감 안내 보내줘', label: '마감 안내 계획' } : null, go: 'compliance' }; }
    if (/^비교과\s*현황/.test(s)) { const R = (S.classes || []).filter(c => /비교과|특강|캠프|프로그램/.test(c.name + (c.sub || ''))); return { text: R.length ? `비교과 ${R.length}개입니다.` : `비교과로 표시된 ${K}이(가) 아직 없습니다. 전체 ${K} ${(S.classes || []).length}개 중 운영중 ${running().length}개입니다.`, go: 'academic' }; }
    if (/^신고\s*대상\s*(보여|알려)/.test(s)) { const R = (S.classes || []).filter(c => c.status !== '종료'); return { text: `신고 대상(운영중 · 준비중) ${K} ${R.length}개입니다. 30시간 미만 ${R.filter(c => +c.hours < 30).length}개.`, go: 'lifelong' }; }
    if (/^규정\s*점검/.test(s)) { try { const r = answer('규정 준수 점검표 보여줘'); if (r && !/이해하지 못했습니다/.test(r.text || '')) return r; } catch (e) { } return { text: '인가 · 규정 점검은 규정 준수 화면에서 항목별로 확인합니다.', go: 'cpl' }; }
    if (/^오늘\s*미등원/.test(s)) { const n = (S.classes || []).reduce((a, c) => { let U = []; try { U = W2.units(c).filter(u => u.date === today()); } catch (e) { } return a + U.reduce((b, u) => b + (c.learners || []).filter(id => !W2.get(c, u.id, id)).length, 0); }, 0); return { text: `오늘 수업 기준 출결 미입력 ${n}명입니다.`, go: K12() ? 'crmatt' : 'attend' }; }
    if (/^자료\s*올리는\s*법/.test(s)) return { text: '영상 · 문서 자료를 올려 두고 강좌에 편성합니다.', steps: ['[+ 자료 올리기]로 파일 또는 YouTube 주소를 넣습니다', '제목 · 태그를 확인합니다', `${K}의 커리큘럼에서 [자료에서 가져오기]로 편성합니다`], go: 'library' };
    if (/^이번\s*달\s*일정/.test(s)) { const ym = today().slice(0, 7); let n = 0; (S.classes || []).forEach(c => { try { n += W2.units(c).filter(u => String(u.date || '').startsWith(ym)).length; } catch (e) { } }); const E = (S.classes || []).filter(c => String(c.start || '').startsWith(ym) || String(c.end || '').startsWith(ym)); return { text: `이번 달 수업 회차 ${n}개 · 시작 또는 종료하는 ${K} ${E.length}개입니다.`, go: 'calendar' }; }
    if (/^원생\s*등록해/.test(s) && K12()) return { text: '원생 등록 창에서 이름 · 학교 · 학년 · 보호자를 입력합니다. 여러 명은 CSV로 한 번에 올립니다.', html: '<button class="btn sm" data-act="crm-new">원생 등록</button> <button class="btn sm" data-act="crm-csv-in">CSV로 일괄 등록</button>' };
    return null; }

  /* ═════════ 4. 진입점: 규칙 엔진(answer)과 대화 입력(chatSend) ═════════ */
  function siAnswer(q) { const s = String(q || '').trim().slice(0, 300); if (!s || !S || !S.org || teacher()) return null;
    if (typeof cnScrub === 'function') { try { if (cnScrub(s).hit) return null; } catch (e) { } } /* 키 · 토큰이 섞인 말은 기존 가림 경로로 */
    const st = siSetting(s); if (st) return st;
    const P = siPlan(s); if (!P.steps.length) return siLook(s);
    if (P.steps.length >= 2 || (P.steps.length === 1 && (P.steps[0].own || P.need.length)) && !P.skip.some(x => x.length > 6)) return siCard(P);
    return siLook(s); }
  window.siAnswer = siAnswer; window.siPlan = siPlan; window.siSplit = siSplit;
  { const base = answer; answer = (q, ...r) => { let a = null; try { a = siAnswer(q); } catch (e) { console.error(e); } return a || base(q, ...r); }; }
  /* 대화 입력: 기관별 처리기(학원 CRM 등)보다 먼저 여러 단계 · 설정 명령을 잡는다. Claude가 연결돼 있으면 설정 명령만 바로 처리하고, 나머지는 Claude가 run_intent 도구로 같은 엔진을 쓴다 */
  { const base = chatSend; chatSend = (q, ...r) => { const s = String(q || '').trim().slice(0, 300); let a = null;
      try { const cl = typeof CL !== 'undefined' && CL.on('chat'); a = s ? (cl ? siSetting(s) : siAnswer(s)) : null; } catch (e) { console.error(e); a = null; }
      if (!a) return base(q, ...r);
      if (typeof gdSig === 'function') try { gdSig('chat'); } catch (e) { } UI.obc = true;
      if (CUR.ws !== 'home' && !$('#drawer') && ACT['chat-open']) ACT['chat-open']();
      S.chat.push({ role: 'user', text: s }); S.chat.push({ role: 'ai', ...a }); S.ai.usage++; S.chat = S.chat.slice(-60); save(); renderThreads();
      if (a.nav) setTimeout(() => go(a.nav, true), 350); }; }

  /* Claude: 같은 엔진을 도구로 */
  if (typeof AG_TOOLS !== 'undefined' && typeof agRun === 'function') {
    AG_TOOLS.push({ name: 'run_intent', description: '운영자의 의도 문장을 그대로 넣으면 여러 단계를 계획 카드 하나로 만듭니다(승인 후 실행 · 금액 · 발송 단계는 한 번 더 확인). 예: "다음 달 수강료 청구하고 미납자에게 안내해줘", "엑셀 실무 4주 99,000원 강좌 만들고 홈페이지에 올리고 초대 링크 만들어줘", "오늘 결석생 보호자에게 알림", "수료 기준 넘은 사람 수료증 발급", "환불 신청 검토해줘", "출결 메뉴 켜줘", "기본 메뉴로", "Slack 연결 도와줘", "자동 운영 미접속 안내 켜줘". 두 가지 이상이 섞인 지시 · 메뉴 · 연결 · 자동 운영 명령은 run_studio_command보다 이 도구를 먼저 쓰세요. 빠진 값이 있으면 카드가 한 번에 묻습니다.', input_schema: { type: 'object', properties: { command: { type: 'string', description: '사용자 의도 문장(그대로)' } }, required: ['command'] } });
    const base = agRun; agRun = (name, x, ctx) => { if (name !== 'run_intent') return base(name, x, ctx); const cmd = String((x || {}).command || '').trim().slice(0, 300); if (!cmd) return { ok: false, 이유: '문장이 비었습니다' };
      let r = null; try { r = siAnswer(cmd); } catch (e) { return { ok: false, 이유: '처리 중 오류' }; }
      if (!r) return { ok: false, 이유: '이 엔진이 다루지 않는 지시입니다. run_studio_command · create_courses 등 다른 도구를 쓰세요.' };
      ctx.cards.push({ ...r, act: cmd }); return { ok: true, 승인필요: !!r.plan, 빠진값: r.siNeed || [], 단계: (r.si || []).map(s2 => `${s2.l} (${s2.est}${KIND[s2.k] ? ' · ' + KIND[s2.k][0] : ''})`), 결과: [r.title, String(r.text || '').slice(0, 300)].filter(Boolean).join(' — ') }; };
    { const b2 = aiBody; aiBody = m => b2(m).replace(/run_intent/g, '의도 실행'); }
  }

  /* ═════════ 5. 기관 유형별 추천 의도(홈 칩 · 화면 추천) — [짧은 이름, 보낼 말] ═════════ */
  const REC = {
    adult: { home: [['청구 + 미납 안내', '다음 달 수강료 청구하고 미납자에게 안내해줘'], ['강좌 만들고 공개', '엑셀 실무 4주 99,000원 강좌 만들고 홈페이지에 올리고 초대 링크 만들어줘'], ['환불 검토', '환불 신청 검토해줘']], class: [['강좌 만들고 공개', '엑셀 실무 4주 99,000원 강좌 만들고 홈페이지에 올리고 초대 링크 만들어줘'], ['수료증 발급', '수료 기준 넘은 사람 수료증 발급']], members: [['미접속 독려', '14일 미접속자에게 독려 메시지 보내줘'], ['승인 대기 승인', '승인 대기 회원 승인해줘']], sales: [['환불 검토', '환불 신청 검토해줘'], ['청구 + 미납 안내', '다음 달 수강료 청구하고 미납자에게 안내해줘']], message: [['미접속 독려', '14일 미접속자에게 독려 메시지 보내줘'], ['진도 독려', '진도 30% 미만 수강생 독려해줘']] },
    k12: { home: [['청구 + 미납 안내', '다음 달 수강료 청구하고 미납자에게 안내해줘'], ['결석 보호자 알림', '오늘 결석생 보호자에게 알림'], ['미답변 질문', '미답변 질문 답변 초안 만들어줘']], crmatt: [['결석 보호자 알림', '오늘 결석생 보호자에게 알림']], crmbill: [['청구 + 미납 안내', '다음 달 수강료 청구하고 미납자에게 안내해줘']], message: [['결석 보호자 알림', '오늘 결석생 보호자에게 알림'], ['미납 안내', '미납 보호자에게 안내 보내줘']], class: [['수업 열고 공개', '수업 2개 열고 홈페이지에 올려줘']] },
    univ: { home: [['강좌 3개 + 명단 등록', '이번 학기 강좌 3개 열고 수강생 엑셀로 등록해줘'], ['진단 안내', 'AI 진단 안 한 학생에게 안내 보내줘'], ['질문 답변 초안', '미답변 질문 답변 초안 만들어줘']], class: [['강좌 3개 + 명단 등록', '이번 학기 강좌 3개 열고 수강생 엑셀로 등록해줘'], ['채점 초안', '채점 대기 과제 AI 채점 초안 만들어줘']], members: [['미접속 독려', '14일 미접속 학생에게 독려 메시지 보내줘'], ['진도 독려', '진도 30% 미만 학생 독려해줘']], enroll: [['명단으로 등록', '수강생 엑셀로 등록해줘']] },
    univ_lms: { home: [['채점 초안', '채점 대기 과제 AI 채점 초안 만들어줘'], ['질문 답변 초안', '미답변 질문 답변 초안 만들어줘'], ['미접속 독려', '14일 미접속 학생에게 독려 메시지 보내줘']] },
    corp: { home: [['법정교육 마감 안내', '법정교육 미이수자에게 마감 안내 보내줘'], ['수료증 발급', '수료 기준 넘은 사람 수료증 발급'], ['온보딩 과정 + 초대', '신규 입사자 온보딩 과정 만들고 초대 링크 만들어줘']], compliance: [['마감 안내', '법정교육 미이수자에게 마감 안내 보내줘']], class: [['과정 만들고 초대', '신규 입사자 온보딩 과정 만들고 초대 링크 만들어줘'], ['수료증 발급', '수료 기준 넘은 사람 수료증 발급']], members: [['미접속 독려', '14일 미접속 임직원에게 독려 메시지 보내줘']] },
    public: { home: [['수료증 발급', '수료 기준 넘은 사람 수료증 발급'], ['미접속 독려', '14일 미접속자에게 독려 메시지 보내줘'], ['과정 열고 공개', '디지털 역량 기초 과정 만들고 홈페이지에 올려줘']], cert: [['수료증 발급', '수료 기준 넘은 사람 수료증 발급']], attend: [['결석 안내', '오늘 결석생에게 알림 보내줘']], class: [['과정 열고 공개', '디지털 역량 기초 과정 만들고 홈페이지에 올려줘']] },
    lifelong: { home: [['반환 신청 검토', '학습비 반환 신청 검토해줘'], ['수료증 발급', '수료 기준 넘은 사람 수료증 발급'], ['강좌 열고 공개', '바리스타 2급 8주 120,000원 강좌 만들고 홈페이지에 올려줘']], lifelong: [['반환 신청 검토', '학습비 반환 신청 검토해줘']], cert: [['수료증 발급', '수료 기준 넘은 사람 수료증 발급']], class: [['강좌 열고 공개', '바리스타 2급 8주 120,000원 강좌 만들고 홈페이지에 올려줘']], attend: [['결석 안내', '오늘 결석생에게 알림 보내줘']] },
    voc: { home: [['출석률 경고', '출석률 80% 미만 훈련생에게 경고 보내줘'], ['수료증 발급', '수료 기준 넘은 사람 수료증 발급'], ['HRD 보고', 'HRD 보고 준비해줘']], attend: [['출석률 경고', '출석률 80% 미만 훈련생에게 경고 보내줘'], ['결석 안내', '오늘 결석생에게 알림 보내줘']], cert: [['수료증 발급', '수료 기준 넘은 사람 수료증 발급']], hrd: [['보고 + 출석 경고', 'HRD 보고 준비하고 출석률 80% 미만 훈련생에게 경고 보내줘']] }
  };
  const recOf = k => { const R = REC[tyKey()] || REC[S.org.type] || {}; return R[k] || []; };
  window.siRec = recOf;
  /* 화면 추천: slimMD 추천 1 + 유형 의도 2 = 3개(대화창 카드에 보이는 것). 기존 칩은 뒤에 남겨 둔다(다른 코드 · Claude 도구가 id로 찾음) */
  const RUN = new Set(); /* 칩 → answer → (화면 칩 찾기) → 같은 칩으로 되돌아오는 순환 막기 */
  const runner = q => () => { let r = null; try { r = siAnswer(q); } catch (e) { console.error(e); } if (r) return r;
    if (RUN.has(q)) return typeof scxTry === 'function' && typeof SCX_BASE === 'function' ? scxTry(SCX_BASE, q) : { text: '' };
    RUN.add(q); try { return answer(q); } finally { RUN.delete(q); } };
  let TRIM = false;
  if (typeof scxDefs === 'function') {
    const base = scxDefs; scxDefs = k => { const D = base(k) || []; if (!S || !S.org || teacher() || k === 'home') return D; const out = []; const add = (id, l, run, sh) => { if (l && !out.some(x => x[1] === l)) out.push([id, l, run, sh]); };
      const md = MENU[k] && typeof slimMD === 'function' ? slimMD(k)[1] : ''; if (md) { const w0 = md.split(' ')[0]; const ex = D.find(x => x[1] === md) || (w0.length >= 2 ? D.find(x => x[1].startsWith(w0 + ' ')) : null); add(ex ? ex[0] : 'md-' + k, ex ? ex[1] : md, ex ? ex[2] : runner(md), ex ? ex[3] || ex[1] : md); }
      recOf(k).forEach(([sh, q], i) => { const ex = D.find(x => x[1] === q); add(ex ? ex[0] : `si-${k}-${i}`, q, ex ? ex[2] : runner(q), sh); });
      if (TRIM) { D.forEach(x => { if (out.length < 3) add(...x); }); return out.slice(0, 3); }
      D.forEach(x => add(...x)); return out; };
    if (typeof scxHTML === 'function') { const b = scxHTML; scxHTML = (...a) => { TRIM = true; try { return b(...a); } finally { TRIM = false; } }; }
  }
  /* 홈 추천 칩: 시작 가이드 다음 단계 1 + 유형 의도(합쳐 3개) */
  if (typeof aihChips === 'function') { const base = aihChips; aihChips = () => { const B = base(); if (!S || !S.org || teacher()) return B; const out = []; const add = (l, q) => { if (out.length < 3 && q && !out.some(x => x[1] === q)) out.push([l, q]); };
      try { if (S.bld && typeof bAllDone === 'function' && !bAllDone()) { const c = bCur(); const q = c && typeof obQ === 'function' ? obQ(c.id) : ''; if (q) add(bName(c), q); } } catch (e) { }
      recOf('home').forEach(([l, q]) => add(l, q)); B.forEach(([l, q]) => add(l, q)); return out; }; }

  /* 스타일(DDS 토큰만) */
  const css = `.si-steps{list-style:none;margin:8px 0 4px;padding:0;display:flex;flex-direction:column;gap:6px}
.si-steps li{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--g200,#e5e5e5);border-radius:8px;background:var(--paper,#fff);font-size:13px}
.si-steps .si-ck{width:18px;height:18px;flex:none;border-radius:5px;border:1.5px solid var(--g400,#bbb);display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff}
.si-steps li.ok .si-ck{background:var(--s400,#5C74F6);border-color:var(--s400,#5C74F6)}
.si-steps li{flex-wrap:wrap}.si-steps .si-l{flex:1 1 150px;min-width:0;font-weight:600;overflow-wrap:anywhere}.si-steps .si-m{display:flex;align-items:center;gap:6px;margin-left:auto}.si-steps .si-e{color:var(--g600,#777);font-size:12px}
.si-need{font-size:12px;color:var(--g700,#555);margin:6px 0 0}.si-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.si-url code{font-size:12px;word-break:break-all}
.si-risk{margin:8px 0 0 18px;font-size:13px}`;
  const st = document.createElement('style'); st.id = 'si-css'; st.textContent = css; (document.head || document.documentElement).appendChild(st);
  if (typeof COVER !== 'undefined') COVER.push(['[v34] 의도 실행형 AI SAM: 여러 단계 의도 → 계획 카드 하나 · 메뉴 · 연결 · 자동 운영 명령', 'class', '']);
})();
