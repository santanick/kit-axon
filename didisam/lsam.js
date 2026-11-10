/* 디디쌤 학습자 화면 v25 — 내 AI 학습 비서: 화면 인식(LSAM)
   대표님(2026-11-03): '기능 화면으로 넘어갈 때 AI SAM이 이를 인식하고, 그 화면에서 지원할 수 있는 일을 챗봇에 표시해서 지원'.
   - 지금 화면(route + 화면 데이터)을 알아보고 '지금 화면: {이름} — 도와드릴 수 있는 일' + 칩 3~5개를 대화창에 보여 준다.
   - 칩은 모두 동작한다: Claude(ltAI · ltAIDemo · ltAIGuest — 화면 맥락을 system에 덧붙임) 또는 기본 안내(이 파일의 규칙).
     값이 정해진 안내(가격 · 환불 규정 · 결제 수단 · 시험 규칙 · 개인정보)는 지어내지 않게 기본 안내로만 답한다(f).
   - 대화창은 사람이 열 때만 열린다. 화면이 바뀌면 칩만 바뀐다.
   - 튜터 원칙: 과제 · 시험 답을 대신 쓰지 않음, 초안은 평가 기준에 비춘 피드백만, 개인정보를 맥락으로 보내지 않음(이메일 · 전화번호는 가림).
   learner.html에서 lhpedit.js 다음, lboot.js 바로 앞. */
'use strict';
(() => {
  const won = n => (+n || 0) ? (+n).toLocaleString('ko-KR') + '원' : '무료';
  const parts = () => decodeURIComponent(location.hash.slice(1)).split('/');
  const sh = () => { try { return (typeof shInfo === 'function' && shInfo()) || null; } catch (e) { return null; } };
  const univ = () => ((SITE() || {}).org || {}).type === 'univ';
  const term = k => (typeof lTerm === 'function' ? lTerm(k) : ({ cls: '강좌', teacher: '강사', learner: '학습자' })[k]);
  const guard = () => { try { return !!(LR.me && typeof lGuard === 'function' && lGuard()); } catch (e) { return false; } };
  const L = A => ltLinks(A.filter(Boolean));
  const B = A => ltBtns(A.filter(Boolean));
  const P = s => `<p class="lt-mini">${s}</p>`;
  const OL = A => `<ol class="lt-ol">${A.filter(Boolean).map(x => `<li><b>${x}</b></li>`).join('')}</ol>`;
  /* 개인정보 가림: 이메일 · 전화번호 · 주민번호 꼴 */
  const mask = s => String(s || '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[이메일]').replace(/\d{6}[-\s]?[1-4]\d{6}/g, '[주민번호]').replace(/(01[016789]|0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '[전화번호]'); /* v32.8 주민번호를 먼저 가린다(QA U11) */
  window.ltMask = mask;
  const clsOf = id => { const a = ((sh() || {}).classes || []).find(x => x.id === id) || null; const b = ((SITE() || {}).classes || []).find(x => x.id === id) || null; return a || b ? { ...(b || {}), ...(a || {}), items: (b && b.items) || [], nItems: a && typeof a.items === 'number' ? a.items : ((b && b.items) || []).filter(i => i.type !== 'chapter').length } : null; };
  const priceOf = c => { try { return typeof shPrice === 'function' && ((sh() || {}).classes || []).some(x => x.id === c.id) ? shPrice(c.id) : +(c.final != null ? c.final : c.price) || 0; } catch (e) { return +c.price || 0; } };
  const pgNone = () => { const s = sh(); return !!(s && s.pg && (s.pg.use === 'none' || s.pg.pending)); };
  const policy = () => { const s = sh(); return (s && s.policy && s.policy.text) ? String(s.policy.text) : ''; };
  const stOf = id => { try { return typeof shState === 'function' ? shState(id) : 'none'; } catch (e) { return 'none'; } };
  const textOf = sel => { const el = document.querySelector(sel); return el ? (el.value != null && el.tagName !== 'DIV' ? el.value : el.innerText || '') : ''; };
  const draftOf = () => { const t = document.querySelector('#a2as textarea[name=t], #asg, .bkwt2'); return t ? t.value.trim() : ''; };
  const sents = (s, n = 3) => String(s || '').split(/(?<=[.!?。])\s+|\n+/).map(x => x.trim()).filter(x => x.length > 4).slice(0, n);
  const reqs = s => { const m = String(s || '').match(/[①②③④⑤⑥⑦⑧⑨]\s*[^①②③④⑤⑥⑦⑧⑨.\n]+/g); return m ? m.map(x => x.replace(/^[①-⑨]\s*/, '').trim()) : []; };
  const ITN2 = { video: '영상 레슨', doc: '학습 자료', quiz: '퀴즈', exam: '시험', assign: '과제', survey: '설문', live: '실시간 수업', offline: '오프라인 수업', chapter: '단원' };
  const PGN = id => { try { return (pageOf(id) || {}).name || ''; } catch (e) { return ''; } };
  const hpName = k => { try { const H = SITE().hp; return (H && H.pages && H.pages[k] && H.pages[k].name) || ({ terms: '이용약관', privacy: '개인정보 처리방침' })[k] || '홈페이지'; } catch (e) { return '홈페이지'; } };
  const rulesTxt = it => { const r = it.rules || {}; const A = [];
    if (r.from || r.to) A.push(`응시 기간: ${String(r.from || '언제든').replace('T', ' ')} ~ ${String(r.to || '제한 없음').replace('T', ' ')}`);
    if (r.due) A.push(`제출 마감: ${String(r.due).replace('T', ' ')}`);
    if (r.retry) A.push(r.retry.mode === 'count' ? `다시 응시: ${r.retry.v}회까지` : r.retry.mode === 'score' ? `다시 응시: ${r.retry.v}점 미만일 때` : '다시 응시: 불가');
    else if (it.retake != null) A.push(`다시 응시: ${it.retake ? '가능' : '불가'}`);
    if (r.resubmit != null) A.push(`다시 제출: ${r.resubmit ? '가능' : '불가'}`);
    if (r.pass && r.pass.on) A.push(`통과 점수: ${r.pass.v}점`);
    if (r.show) A.push(`정답 공개: ${({ after: '제출 직후', end: '응시 기간이 끝난 뒤', never: '공개하지 않음' })[r.show] || r.show}`);
    if (it.qs && it.qs.length) A.push(`문항 수: ${it.qs.length}문항`);
    return A; };
  const howEnroll = () => { const S2 = sh(); const has = !!(S2 && S2.classes && S2.classes.length);
    if (!has) return { t: `${univ() ? '배정된 교과목은' : '배정된 과정은'} 로그인하면 「내 학습」에 바로 보입니다. ${univ() ? '학번과 접근코드(또는 비밀번호)' : '받은 계정'}로 로그인하세요.`, h: L([!LR.me && { h: '로그인하기', d: '', href: '#login' }]) };
    return { t: '수강 신청은 4단계면 끝납니다.', h: OL([`${term('cls')} 상세에서 [수강 신청하기]`, LR.me ? '결제 화면에서 결제 수단 고르기(무료면 바로 신청)' : '간편가입(SNS 또는 이메일 인증번호 · 닉네임만)', LR.me ? '결제 완료 → [지금 학습 시작하기]' : '가입이 끝나면 결제 화면으로 바로 이어집니다', '「내 학습」에서 이어서 학습']) + L([{ h: `${term('cls')} 둘러보기`, d: '', href: '#shop' }]) }; };
  const listCls = (n = 5) => { const S2 = sh(); const C = ((S2 && S2.classes) || (SITE().classes || [])).slice(0, n);
    if (!C.length) return { t: '아직 공개된 강좌가 없습니다. 곧 열리면 이곳에서 안내해 드리겠습니다.' };
    return { t: `지금 신청할 수 있는 ${term('cls')} ${C.length}개입니다.${pgNone() ? ' (결제 연결 준비 중이라 유료 강좌는 곧 신청할 수 있습니다)' : ''}`, h: L(C.map(c => ({ h: c.name, d: `${won(priceOf(c))}${c.nItems || (typeof c.items === 'number' ? c.items : 0) ? ` · 레슨 ${c.nItems || c.items}개` : ''}`, href: S2 && S2.classes ? '#class/' + c.id : '#c/' + c.id }))) }; };
  const joinHow = () => univ()
    ? { t: '대학 학습 포털은 학번으로 들어갑니다.', h: OL(['[로그인]에서 학번 입력', '접근코드(또는 만든 비밀번호) 입력', '처음이면 학번 · 학과 · 비밀번호로 가입 — 이름 · 연락처는 받지 않습니다']) + P('접근코드는 학과 사무실 · 담당 교수님께 받을 수 있습니다.') + L([{ h: '로그인하기', d: '학번 + 접근코드', href: '#login' }]) }
    : { t: '간편가입은 한 화면이면 끝납니다.', h: OL(['약관 동의(필수 2개 · 마케팅은 선택)', '만 14세 이상 확인', '카카오 · 네이버 · 구글 · 애플 중 하나 또는 이메일 인증번호', '닉네임 입력 — 실명 · 휴대폰 번호는 받지 않습니다']) + L([{ h: '무료 가입', d: '', href: '#join' }, { h: '이미 회원이면 로그인', d: '', href: '#login' }]) };
  const privacyTxt = () => ({ t: univ() ? '가입 때는 학번 · 학과(와 비밀번호)만 받습니다. 이름 · 연락처 · 이메일은 받지 않습니다.' : '가입 때는 로그인 수단(SNS 식별값 또는 이메일)과 닉네임만 받습니다.', h: OL([univ() ? '학습 기록은 학번 기준으로 남습니다' : '실명은 수료증 발급 · 결제 · 환불 때만 목적을 밝히고 따로 받습니다', !univ() && '휴대폰 번호는 카카오톡 알림을 신청할 때만 받습니다', '탈퇴하면 개인정보는 바로 파기되고 학습 기록은 이름 없는 번호로만 남습니다']) + L([{ h: '개인정보 처리방침 요약', d: '', href: '#privacy' }, LR.me && { h: '회원정보 · 내 개인정보', d: '보고 지우기', href: '#acct' }]) });

  /* ── 화면 정의: { k, name, ctx, chips:[{ l, q, r(), f, x(), re, kind:'go'|'escq', href }] } ── */
  const RO = { f: 1 }; /* 정해진 카드(계획 · 퀴즈 · 리포트 · 할 일)는 기본 안내로 */
  function screen() { const S2 = SITE(); if (!S2) return { k: 'none', name: '', chips: [] };
    const r = route(); const a = r.a; const p = parts(); const me = !!LR.me; const C = [];
    const pOff = typeof lPayOff === 'function' && lPayOff(); const add = (l, q, o = {}) => { if (pOff && /가격|무료로|결제|환불/.test(l)) return; C.push({ l, q: q || l, ...o }); }; /* v38 F5 결제 꺼진 기관은 가격 · 결제 · 환불 칩을 감춘다 */
    const esc2 = () => me && !guard() && add('선생님께 질문 넘기기', '', { kind: 'escq' });
    let k = a, name = '', ctx = '';
    if (guard()) { k = 'guard'; name = `보호자 보기 · ${({ c: '수업', my: '내 학습', home: '홈' })[a] || '학습 현황'}`;
      add('자녀 학습 현황 요약', '자녀의 학습 현황을 요약해 주세요', { re: /현황|진도|성적|잘\s*하/, r: () => { const st = myStats(); return { t: `평균 진도 ${st.avg}% · 연속 학습 ${st.streak}일입니다.`, h: `<div class="lt-rep">${st.courses.map(x => `<div><span>${esc(x.c.name)}</span><i style="--p:${x.p}%"></i><b>${x.p}%</b></div>`).join('') || P('수강 중인 수업이 없습니다.')}</div>` }; }, f: 1 });
      add('이번 주 할 일', '자녀가 이번 주에 할 일을 알려 주세요', { re: /숙제|할\s*일|과제|이번\s*주/, r: () => { const A = ltTodo(); return { t: A.length ? `이번 주 할 일 ${A.length}가지입니다. 제출 · 응시는 자녀 계정에서 합니다.` : '급한 할 일은 없습니다.', h: A.length ? L(A) : '' }; }, f: 1 });
      add('숙제 피드백 보기', '선생님 피드백을 쉽게 풀어 주세요', { re: /피드백/ });
      add('선생님께 문의', '', { kind: 'go', href: '#msg/new' });
      return { k, name, ctx: '보호자가 자녀의 학습 현황을 읽기 전용으로 보는 화면', chips: C }; }
    if (a === 'home' || (!a)) { k = 'home'; name = '홈';
      if (!me) { add('어떤 강좌가 있나요?', `어떤 ${term('cls')}${lJ(term('cls'), '이', '가')} 있나요?`, { r: () => listCls(), f: 1, re: /어떤.{0,4}(강좌|과정|수업|교과목|클래스)|강좌\s*목록/ }); add('나에게 맞는 강좌 추천', '저에게 맞는 강좌를 추천해 주세요', { r: () => ({ ...listCls(4), t: `목표(예: 자격증 · 실무 · 취미)를 알려 주시면 더 정확히 골라 드립니다. 먼저 지금 열려 있는 ${term('cls')}입니다.` }) }); add('수강 신청 방법', '수강 신청은 어떻게 하나요?', { r: howEnroll, f: 1, re: /수강\s*신청|신청\s*방법/ }); add('가입 방법', '가입은 어떻게 하나요?', { r: joinHow, f: 1, re: /가입|로그인\s*방법/ }); }
      else { add('오늘 할 일', '오늘 뭐 하면 돼?', RO); add('이번 주 학습 계획', '이번 주 학습 계획 짜줘', RO); add('복습 퀴즈', '복습 퀴즈 내줘', RO); add('내 학습 리포트', '내 학습 리포트 보여줘', RO); } }
    else if (['shop', 'courses', 'tutorials'].includes(a)) { k = 'list'; name = a === 'shop' ? `${term('cls')} 목록` : PGN(a) || '단계별 코스';
      ctx = `공개 ${term('cls')}: ${(((sh() || {}).classes) || S2.classes || []).slice(0, 12).map(c => `${c.name}(${won(priceOf(c))})`).join(', ')}`;
      add('나에게 맞는 강좌 추천', `저에게 맞는 ${term('cls')}${lJ(term('cls'), '을', '를')} 추천해 주세요`, { r: me ? null : () => ({ ...listCls(4), t: `목표(예: 자격증 · 실무 · 취미)를 알려 주시면 더 정확히 골라 드립니다. 먼저 인기 ${term('cls')}입니다.` }) });
      add('강좌 목록 · 가격', `${term('cls')} 목록과 가격 알려줘`, { r: () => listCls(8), f: 1 }); add('무료로 들을 수 있나요?', '무료로 들을 수 있는 강좌가 있나요?', { r: () => { const F = (((sh() || {}).classes) || []).filter(c => !priceOf(c)); return F.length ? { t: `무료 ${term('cls')} ${F.length}개가 있습니다.`, h: L(F.slice(0, 5).map(c => ({ h: c.name, d: '무료', href: '#class/' + c.id }))) } : { t: `지금은 무료 ${term('cls')}가 없습니다. ${term('cls')} 상세에서 할인 · 얼리버드 가격을 확인할 수 있습니다.` }; }, f: 1 });
      add('수강 신청 방법', '수강 신청은 어떻게 하나요?', { r: howEnroll, f: 1 }); }
    else if (a === 'class') { const c = clsOf(r.b); k = 'class'; name = `${term('cls')} 상세${c ? ' · ' + c.name : ''}`;
      if (c) { const its = (c.items || []).filter(i => i.type !== 'chapter'); ctx = `강좌: ${c.name} · 가격 ${won(priceOf(c))} · 레슨 ${c.nItems || its.length}개${c.thr ? ` · 수료 기준 진도 ${c.thr}%` : ''}${c.desc ? `\n소개: ${String(c.desc).slice(0, 400)}` : ''}${its.length ? `\n배우는 내용: ${its.slice(0, 12).map(i => i.title).join(', ')}` : ''}`;
        add('이 강좌 누구에게 맞나요?', `「${c.name}」${lJ(c.name, '은', '는')} 누구에게 맞나요?`, { r: () => ({ t: `「${c.name}」${c.desc ? '을 소개합니다.' : ' 안내입니다.'}`, h: (sents(c.desc || c.goal, 3).length ? OL(sents(c.desc || c.goal, 3).map(esc)) : '') + P(`레슨 ${c.nItems || its.length}개 · ${won(priceOf(c))}${c.thr ? ` · 진도 ${c.thr}% 이상이면 수료` : ''}. 목표를 알려 주시면 맞는지 함께 판단해 드립니다.`) }) });
        add('무엇을 배우나요?', `「${c.name}」에서 무엇을 배우나요?`, { r: () => ({ t: `「${c.name}」 배우는 내용입니다.`, h: its.length ? OL(its.slice(0, 8).map(i => `${esc(i.title)} <small>${esc(ITN2[i.type] || '')}</small>`)) : P('세부 목차는 강좌 상세 아래 「배우는 내용」에서 볼 수 있습니다.') }), f: 1 });
        add('수강 신청 방법', '수강 신청은 어떻게 하나요?', { r: () => { const s = stOf(c.id); if (me && s === 'active') return { t: '이미 수강 중인 강좌입니다. 바로 이어서 학습할 수 있습니다.', h: L([{ h: '학습하러 가기', d: c.name, href: '#c/' + c.id }]) }; if (pgNone() && priceOf(c)) return { t: '이 기관은 결제 연결을 준비하고 있어 지금은 유료 강좌를 신청할 수 없습니다. 준비가 끝나면 이 화면의 [수강 신청하기]로 바로 신청할 수 있습니다.' }; return howEnroll(); }, f: 1 });
        add('가격 · 환불 규정', '가격과 환불 규정 알려줘', { r: () => ({ t: `「${c.name}」 ${won(priceOf(c))}${c.discount && c.discount.on ? ' (할인 적용가)' : ''}입니다.`, h: `<div class="lt-fb"><small>환불 규정</small><p>${nl(policy().slice(0, 500) || '환불은 기관 운영 정책에 따라 승인 여부와 금액이 정해집니다. 결제 화면의 「환불 규정 보기」에서 전체 내용을 볼 수 있습니다.')}</p></div>` }), f: 1, re: /환불|가격|얼마/ }); } }
    else if (a === 'pay' || a === 'bill') { const c = clsOf(p[2]); k = 'pay'; name = a === 'bill' ? '청구서 납부' : `결제${c ? ' · ' + c.name : ''}`; ctx = c ? `결제 대상: ${c.name} · ${won(priceOf(c))}` : '';
      add('결제 수단 알려줘', '결제 수단은 무엇이 있나요?', { r: () => pgNone() ? { t: '이 기관은 결제(토스페이먼츠) 연결을 준비하고 있습니다. 준비가 끝나면 신용카드 · 계좌이체 · 간편결제로 결제할 수 있고, 그 전에는 결제가 진행되지 않습니다.', h: P('급하면 기관에 문의해 주세요. 결제 정보는 이 대화에 적지 마세요.') } : { t: '토스페이먼츠로 안전하게 결제합니다.', h: OL([p[1] === 'sub' ? '신용카드 · 체크카드(정기결제 등록)' : '신용카드 · 체크카드', p[1] !== 'sub' && '실시간 계좌이체', p[1] !== 'sub' && '간편결제(토스페이 · 카카오페이 · 네이버페이)', p[1] !== 'sub' && '가상계좌(기한 안에 입금)', (sh() || { pg: {} }).pg.intl && '해외카드(VISA · Master)']) + P('카드 번호 같은 결제 정보는 이 대화에 적지 마세요. 결제 창에서만 입력합니다.') }, f: 1, re: /결제\s*수단|카드|계좌|간편결제/ });
      add('환불 규정', '환불 규정 알려줘', { r: () => ({ t: '환불 규정입니다.', h: `<div class="lt-fb"><small>환불 규정</small><p>${nl(policy().slice(0, 600) || '환불은 기관 운영 정책에 따라 승인 여부와 금액이 정해집니다.')}</p></div>` + P('결제 후 「내 학습 › 결제」에서 환불을 신청할 수 있습니다.') }), f: 1, re: /환불/ });
      add('결제가 안 돼요', '결제가 안 될 때는 어떻게 하나요?', { r: () => ({ t: '결제가 안 될 때 확인해 볼 것입니다.', h: OL(['결제 동의 체크를 했는지', '카드 한도 · 잔액, 해외결제 차단 여부', '팝업 · 결제 창이 막혀 있지 않은지(다른 브라우저로 다시 시도)', pgNone() ? '기관 결제 연결이 아직 준비 중일 수 있습니다' : '같은 문제가 반복되면 결제 수단을 바꿔 보기']) + P('그래도 안 되면 기관에 문의해 주세요.') }), f: 1 });
      if (c) add('수강 기간은?', '수강 기간은 언제부터 언제까지인가요?', { r: () => { const pd = c.period || {}; return { t: pd.mode === 'range' && pd.start ? `수강 기간은 ${pd.start} ~ ${pd.end || ''}입니다.` : pd.days ? `결제한 날부터 ${pd.days}일 동안 수강할 수 있습니다.` : '수강 기간은 강좌 상세에서 확인할 수 있습니다.' }; }, f: 1 }); }
    else if (['payok', 'payd', 'mypay'].includes(a) || (a === 'my' && (p[1] === 'pay'))) { k = 'paid'; name = a === 'payok' ? '결제 완료' : a === 'payd' ? '결제 상세' : '결제 · 환불 내역';
      add('환불 신청 방법', '환불은 어떻게 신청하나요?', { r: () => ({ t: '환불 신청 방법입니다.', h: OL(['「내 학습 › 결제」 또는 결제 · 환불 내역에서 결제 건 선택', '[환불 신청] → 사유 입력', '운영자가 확인하면 승인 · 금액이 알림으로 옵니다', '신청 중에는 수강이 잠시 멈추고, 취소하면 다시 열립니다']) + `<div class="lt-fb"><small>환불 규정</small><p>${nl(policy().slice(0, 400) || '기관 운영 정책에 따릅니다.')}</p></div>` + L([{ h: '결제 · 환불 내역', d: '', href: '#mypay/pay' }]) }), f: 1, re: /환불/ });
      add('영수증 · 결제 내역', '결제 내역은 어디서 보나요?', { r: () => ({ t: '결제 내역과 영수증은 「결제 · 환불 내역」에서 볼 수 있습니다.', h: L([{ h: '결제 · 환불 내역', d: '', href: '#mypay/pay' }, { h: '청구서', d: '', href: '#mypay/bill' }]) }), f: 1 });
      add('바로 학습 시작', '결제한 강좌는 어디서 학습하나요?', { r: () => ({ t: '결제한 강좌는 「내 학습」에서 바로 이어서 학습할 수 있습니다.', h: L([{ h: '내 학습', d: '', href: '#my' }]) }), f: 1 }); }
    else if (a === 'c' && document.querySelector('#lm .gate h2')) { const g = document.querySelector('#lm .gate h2').textContent.trim(); const c = clsOf(r.b); k = 'locked'; name = `${g}${c ? ' · ' + c.name : ''}`;
      add('왜 볼 수 없나요?', '이 강좌를 지금 볼 수 없는 이유가 뭔가요?', { r: () => ({ t: /환불/.test(g) ? '환불 신청이 처리되는 동안은 수강이 잠시 멈춥니다. 승인 전에는 결제 상세에서 환불 요청을 취소하면 바로 다시 볼 수 있습니다.' : /종료|기간/.test(g) ? '수강 기간이 끝났습니다. 다시 수강하려면 강좌 상세에서 다시 신청해 주세요.' : /로그인/.test(g) ? '로그인하면 볼 수 있습니다.' : '아직 수강 신청하지 않은 강좌입니다. 강좌 상세에서 신청하면 바로 볼 수 있습니다.', h: L([{ h: '결제 · 환불 내역', d: '', href: '#mypay/pay' }, c && { h: `${term('cls')} 상세`, d: c.name, href: '#class/' + c.id }]) }), f: 1 });
      add('환불 신청 방법', '환불은 어떻게 신청하나요?', { r: () => ({ t: '「내 학습 › 결제」에서 결제 건을 고르고 [환불 신청]을 누르면 됩니다. 신청 중에는 [환불 요청 취소]로 되돌릴 수 있습니다.', h: L([{ h: '결제 · 환불 내역', d: '', href: '#mypay/pay' }]) }), f: 1 });
      add('다른 강좌 보기', '', { kind: 'go', href: '#shop' }); }
    else if (a === 'c') { const c = (S2.classes || []).find(x => x.id === r.b); const it = c && (c.items || []).find(x => x.id === p[2]);
      if (c && it && it.type !== 'chapter') { const tn = ITN2[it.type] || '레슨'; k = 'it-' + it.type; name = `${tn} · ${it.title}`;
        ctx = `과정: ${c.name}\n지금 보는 ${tn}: ${it.title}${it.desc ? `\n설명: ${String(it.desc).slice(0, 600)}` : ''}${rulesTxt(it).length ? `\n규칙: ${rulesTxt(it).join(' · ')}` : ''}`;
        if (['quiz', 'exam'].includes(it.type)) {
          add('시험 규칙 알려줘', `이 ${tn} 규칙 알려줘`, { r: () => { const R = rulesTxt(it); return { t: `「${it.title}」 규칙입니다.`, h: R.length ? OL(R.map(esc)) : P('따로 정한 규칙이 없습니다. 기간 안에 언제든 응시할 수 있습니다.') }; }, f: 1, re: /규칙|몇\s*번|재응시|통과/ });
          add('헷갈리는 개념 힌트', `이 ${tn} 범위에서 헷갈리는 개념을 정답 없이 힌트로 정리해 줘`, { r: () => { const prev = (c.items || []).slice(0, (c.items || []).indexOf(it)).filter(i => ['video', 'doc'].includes(i.type)).slice(-3); return { t: '정답은 알려 드리지 않지만, 다시 볼 곳을 짚어 드립니다.', h: OL(['문제에서 묻는 핵심 단어에 밑줄을 그어 보세요', '헷갈리는 두 보기는 차이를 한 줄로 적어 보세요', '아래 레슨에서 그 단어가 나온 부분을 다시 보세요']) + (prev.length ? L(prev.map(i => ({ h: i.title, d: ITN2[i.type], href: `#c/${c.id}/${i.id}` }))) : '') }; } });
          add('공부 순서 추천', '시험 전에 무엇부터 복습하면 좋을까요?', { r: () => { const prev = (c.items || []).slice(0, (c.items || []).indexOf(it)).filter(i => i.type !== 'chapter').slice(-4); return { t: '시험 전에 이 순서로 복습해 보세요.', h: prev.length ? L(prev.map(i => ({ h: i.title, d: ITN2[i.type], href: `#c/${c.id}/${i.id}` }))) : P('앞 레슨이 없습니다. 레슨 설명을 먼저 읽어 보세요.') }; }, f: 1 });
          add('복습 퀴즈 3문제', '이 내용으로 확인 문제 내줘', RO); }
        else if (it.type === 'assign') {
          add('평가 기준 알려줘', '이 과제의 평가 기준 알려줘', { r: () => { const R = rulesTxt(it); const q = reqs(it.desc); const g = (myStats().courses.find(x => x.c.id === c.id) || {}); return { t: `「${it.title}」 평가 기준입니다.`, h: (q.length ? `<div class="lt-fb"><small>꼭 들어가야 할 것</small>${OL(q.map(esc))}</div>` : (it.desc ? P(esc(String(it.desc).slice(0, 300))) : '')) + (R.length ? OL(R.map(esc)) : '') + (g.fb ? `<div class="lt-fb"><small>선생님 피드백</small><p>${nl(g.fb)}</p></div>` : '') }; }, f: 1, re: /평가\s*기준|채점\s*기준|루브릭/ });
          add('초안 피드백 받기', '제 초안을 평가 기준에 비추어 보완할 점을 알려 주세요', { x: () => { const d = draftOf(); return d ? `[내 초안]\n${mask(d).slice(0, 1500)}` : ''; }, r: () => { const d = draftOf(); if (!d) return { t: '아래 제출 칸에 초안을 먼저 적은 뒤 다시 눌러 주세요. 몇 줄이어도 괜찮습니다. 답을 대신 써 드리지는 않고, 평가 기준에 맞춰 무엇을 보완하면 좋을지 짚어 드립니다.' };
            const q = reqs(it.desc); const has = q.map(x => ({ x, ok: x.split(/\s+|과|와|·/).filter(w => w.length >= 2).some(w => d.includes(w)) }));
            return { t: `초안 ${d.length}자를 평가 기준과 맞춰 보았습니다. 고쳐 쓰는 것은 직접 해 주세요.`, h: (has.length ? `<div class="lt-zr">${has.map(h => `<div class="${h.ok ? 'ok' : 'no'}"><span>${h.ok ? '있음' : '보완'}</span><p>${esc(h.x)}</p></div>`).join('')}</div>` : '') + OL([d.length < 200 ? '분량이 짧습니다 — 근거나 예시를 하나 더 붙여 보세요' : '분량은 충분합니다 — 문단마다 핵심 문장을 먼저 두세요', '결과 · 느낀 점처럼 요구한 항목에 소제목을 달면 채점자가 찾기 쉽습니다', '제출 전에 요구사항을 한 번 더 읽고 빠진 것을 확인하세요']) }; } });
          add('어떻게 시작하면 돼?', '이 과제 어떻게 시작하면 좋을까요?', { r: () => ({ t: '이렇게 시작해 보세요. 내용은 직접 쓰는 것이 원칙입니다.', h: OL(['과제가 요구하는 것을 한 문장으로 적기', ...(reqs(it.desc).length ? reqs(it.desc).map(x => `「${esc(x)}」에 해당하는 내 생각 2~3줄`) : ['내 생각을 3줄로 쓰기', '근거나 예시 하나 붙이기']), '쓴 초안으로 [초안 피드백 받기]']) }) });
          add('제출 방법 · 마감', '제출 방법과 마감 알려줘', { r: () => { const R = rulesTxt(it).filter(x => /마감|다시/.test(x)); return { t: '제출은 이 화면 아래 칸에 내용 · 결과물 링크를 넣고 [제출]을 누르면 됩니다.', h: R.length ? OL(R.map(esc)) : P('마감은 따로 정하지 않았습니다.') }; }, f: 1, re: /마감|언제까지|제출\s*방법/ }); }
        else if (it.type === 'survey') { add('설문 안내', '이 설문은 어떻게 하나요?', { r: () => ({ t: '설문은 정답이 없습니다. 느낀 대로 답하고 [제출]을 누르면 됩니다.', h: P('필수 문항(*)만 답하면 제출할 수 있습니다. 답은 강좌를 고치는 데 쓰입니다.') }), f: 1 }); add('다음 레슨', '다음에 볼 레슨 알려줘', { r: () => nextOf(c, it), f: 1 }); }
        else { add('이 레슨 핵심 정리', '이 레슨 핵심만 정리해줘'); add('모르는 용어 설명', '이 레슨에서 처음 보는 용어를 쉽게 설명해 줘', { r: () => { const W = [...new Set((String(it.desc || '') + ' ' + it.title).match(/[A-Za-z][A-Za-z0-9.+#-]{1,}|「[^」]{2,12}」/g) || [])].slice(0, 4); return { t: W.length ? '이 레슨에 나온 용어입니다. 궁금한 용어를 입력창에 적어 주시면 쉬운 말로 풀어 드립니다.' : '궁금한 용어를 입력창에 적어 주세요. 레슨 내용과 연결해 쉬운 말로 풀어 드립니다.', h: W.length ? B(W.map(w => [w.replace(/[「」]/g, ''), `「${w.replace(/[「」]/g, '')}」가 무슨 뜻인지 쉽게 설명해 줘`])) : '' }; } }); add('복습 퀴즈 3문제', '이 내용으로 확인 문제 내줘', RO); add('다음 레슨', '다음에 볼 레슨 알려줘', { r: () => nextOf(c, it), f: 1 }); }
        esc2(); }
      else if (c) { k = 'course'; name = `내 강좌 · ${c.name}`; ctx = `과정: ${c.name} · 레슨 ${(c.items || []).length}개`;
        add('학습 순서', '이 과정 학습 순서 알려줘', { r: () => ({ t: `「${c.name}」 학습 순서입니다.`, h: L((c.items || []).filter(i => i.type !== 'chapter').slice(0, 8).map(i => ({ h: i.title, d: ITN2[i.type], href: `#c/${c.id}/${i.id}` }))) }), f: 1 });
        add('다음에 볼 레슨', '다음에 볼 레슨 알려줘', { r: () => nextOf(c, null), f: 1 }); add('수료 기준', '수료 기준 알려줘', { r: () => certRule(c), f: 1, re: /수료/ }); add('복습 퀴즈', '이 내용으로 확인 문제 내줘', RO); esc2(); }
      else { k = 'course'; name = '내 강좌'; } }
    else if (a === 't') { const t = (S2.tuts || []).find(x => x.id === r.b); k = 'tut'; name = `실습 영상${t ? ' · ' + t.title : ''}`; ctx = t ? `실습: ${t.title}${t.mission ? ` · 미션: ${t.mission}` : ''}` : '';
      const stp = () => (t && t.steps || []).slice(0, 3).map(x => esc(typeof x === 'string' ? x : (x.t || x.title || '')));
      add('따라 하는 방법', '3단계 따라 하는 방법 알려줘', { r: () => ({ t: t ? `「${t.title}」${lJ(t.title, '은', '는')} 영상을 보고 3단계를 따라 한 뒤 미션 결과물을 제출하면 됩니다.` : '영상을 보고 단계를 따라 하면 됩니다.', h: OL(stp().length ? stp() : ['영상 보기', '단계 따라 하기', '미션 제출']) + (LR.me ? '' : P('로그인하면 단계 체크와 미션 제출이 기록되어 배지로 이어집니다.')) }) });
      add('미션 쓰는 법', '미션 어떻게 쓰면 돼?', { r: () => ({ t: '미션은 \'무엇을 했는지 · 결과 · 느낀 점\'을 2~3줄로 쓰면 충분합니다.', h: t && t.mission ? P('이번 미션: ' + esc(t.mission)) : '' }) });
      add('막혔어요 · 힌트', '실습하다 막혔어요. 힌트 주세요', { r: () => ({ t: '막힌 곳을 같이 찾아보겠습니다.', h: OL(['영상에서 막힌 시점을 다시 보며 화면과 내 화면을 비교', '오류 문구가 있으면 그대로 적어 주세요(개인정보는 빼고)', '한 단계 전으로 돌아가 다시 해 보기']) + (LR.me ? B([['선생님께 질문 넘기기', '실습 중 막힌 부분을 질문합니다: ' + (t ? t.title : ''), 'esc']]) : '') }) }); }
    else if (a === 'dg' || a === 'diag') { const d = diagFirst(a === 'dg' ? r.b : undefined); const res = d && LR.me && LR.lp && LR.lp.diag && LR.lp.diag[d.id]; k = 'diag'; name = PGN('diag') || '레벨 진단';
      add('진단은 뭐예요?', '진단은 뭐예요?', { r: () => ({ t: `${d ? `「${d.title || name}」${lJ(d.title || name, '은', '는')} ${d.items.length}문항` : '진단은 몇 문항'}으로 내 수준 · 유형을 알려 주는 짧은 테스트입니다. 결과에 맞춰 ${term('cls')}와 실습을 추천합니다.`, h: P('정답 · 오답보다 지금 수준을 아는 것이 목적이니 편하게 답하세요.') + (d && a !== 'dg' ? L([{ h: '진단 시작', d: `${d.items.length}문항 · 약 3분`, href: '#dg/' + d.id }]) : '') }), f: 1, re: /진단(은|이)/ });
      add('결과는 어디에 쓰이나요?', '진단 결과는 어디에 쓰이나요?', { r: () => ({ t: '진단 결과는 나에게 맞는 수준의 코스 · 실습 영상 추천과 학습 계획에 쓰입니다. 로그인하면 결과가 내 학습에 남습니다.' }), f: 1 });
      if (res) add('내 결과 해석', '내 진단 결과 해석해 주고 추천해줘'); else add('추천 코스 보기', '나에게 맞는 코스 추천해줘', { r: () => LR.me ? null : listCls(4) }); }
    else if (a === 'cert' || a === 'badge' || a === 'badges' || a === 'bkcert') { k = 'cert'; name = a === 'cert' ? '수료증' : a === 'bkcert' ? '디지털북 인증서' : (PGN('badges') || '수료 · 배지'); const c = a === 'cert' ? clsOf(r.b) : null;
      add('수료 기준', '수료 기준 알려줘', { r: () => c ? certRule(c) : { t: `${term('cls')}마다 진도 · 시험 · 과제 기준을 채우면 수료증이 자동으로 발급됩니다. 「내 학습」의 강좌 카드에서 진도와 기준을 볼 수 있습니다.` }, f: 1, re: /수료\s*기준/ });
      add('수료증 받는 법', '수료증은 어떻게 받나요?', { r: () => ({ t: '수료 기준을 채우면 수료증이 자동으로 만들어집니다.', h: OL(['「내 학습 › 학습」에서 강좌의 [수료증] 누르기', '[PDF로 저장] 또는 인쇄', !univ() && '수료증에 넣을 실명은 처음 발급할 때 한 번만 받습니다(목적: 수료증 발급)']) + L([LR.me && { h: '내 학습', d: '', href: '#my' }]) }), f: 1 });
      add('배지는 어디에 쓰나요?', '디지털 배지는 어디에 쓰나요?', { r: () => ({ t: '디지털 배지는 수준별 실습 · 미션을 마치면 받는 인증입니다. 배지 화면의 공유 링크로 이력서 · SNS에 넣어 보여 줄 수 있습니다.' }), f: 1 }); }
    else if (a === 'bk') { const b = (S2.dbooks || []).find(x => x.id === r.b); k = 'book'; name = `디지털북${b ? ' · ' + b.title : ''}`; const pg = () => mask(textOf('#lm .bkpage, #lm .bk-page, #lm .bkp, #lm article') || textOf('#lm')).replace(/\s+/g, ' ').slice(0, 1200);
      ctx = b ? `디지털북: ${b.title}` : '';
      add('이 페이지 요약', '지금 보는 페이지 핵심을 요약해 줘', { x: () => `[페이지 내용]\n${pg()}`, r: () => { const S3 = sents(pg(), 3); return { t: '이 페이지의 앞부분 핵심 문장입니다.', h: S3.length ? OL(S3.map(esc)) : P('페이지 내용을 찾지 못했습니다.') }; } });
      add('모르는 단어 설명', '이 페이지에서 어려운 단어를 쉽게 설명해 줘', { x: () => `[페이지 내용]\n${pg()}` }); add('확인 문제', '이 내용으로 확인 문제 내줘', RO); }
    else if (['join', 'login', 'find', 'pending'].includes(a)) { k = 'auth'; name = ({ join: '간편가입', login: '로그인', find: '계정 찾기', pending: '가입 승인 대기' })[a];
      if (univ()) { add('학번으로 로그인하기', '학번으로 로그인하는 방법 알려줘', { r: joinHow, f: 1 }); add('접근코드를 모르면?', '접근코드를 모르면 어떻게 하나요?', { r: () => ({ t: '접근코드는 학과 사무실이나 담당 교수님이 발급합니다. 비밀번호를 만들었다면 [계정 찾기]에서 다시 설정할 수 있습니다.', h: L([{ h: '계정 찾기', d: '', href: '#find' }]) }), f: 1 }); }
      else { add('가입 방법', '가입은 어떻게 하나요?', { r: joinHow, f: 1 }); add('만 14세 미만이면?', '만 14세 미만은 어떻게 가입하나요?', { r: () => ({ t: '만 14세 미만은 보호자 동의가 필요합니다.', h: OL(['가입 화면에서 「만 14세 이상」 체크를 하지 않기', '보호자 이메일 또는 휴대폰 입력', '보호자가 받은 동의 링크에서 [동의]하면 바로 이용', '7일 안에 동의가 없으면 가입 정보는 자동 삭제']) + P('본인인증(PASS)은 필요하지 않습니다.') }), f: 1, re: /14세/ }); add('아이디 · 비밀번호 찾기', '아이디나 비밀번호를 잊었어요', { r: () => ({ t: '이메일 인증번호나 가입한 SNS로 다시 로그인할 수 있습니다.', h: L([{ h: '계정 찾기', d: '이메일 인증번호 · SNS', href: '#find' }]) }), f: 1 }); }
      add('개인정보는 무엇을 받나요?', '가입할 때 개인정보는 무엇을 받나요?', { r: privacyTxt, f: 1, re: /개인정보/ }); }
    else if (a === 'my') { const tab = p[1] || (document.getElementById('lm') || {}).dataset?.luxtab || 'learn'; k = 'my-' + tab; name = `내 학습 · ${({ learn: '학습', acct: '계정' })[tab] || '학습'}`;
      if (tab === 'acct') { add('개인정보는 무엇을 저장하나요?', '내 개인정보는 무엇을 저장하나요?', { r: privacyTxt, f: 1 }); add('이름 · 휴대폰은 언제 필요해요?', '이름과 휴대폰 번호는 언제 필요해요?', { r: () => ({ t: '필요한 순간에만 목적을 밝히고 따로 받습니다.', h: OL(['이름: 수료증 발급 · 결제 · 환불 처리', '휴대폰: 카카오톡 알림을 신청할 때(별도 동의)', '언제든 「회원정보」에서 보고 지울 수 있습니다']) + L([{ h: '회원정보', d: '', href: '#acct' }]) }), f: 1 }); add('탈퇴하면 어떻게 되나요?', '탈퇴하면 어떻게 되나요?', { r: leaveTxt, f: 1, re: /탈퇴/ }); }
      else { add('오늘 할 일', '오늘 뭐 하면 돼?', RO); add('이번 주 학습 계획', '이번 주 학습 계획 짜줘', RO); add('내 학습 리포트', '내 학습 리포트 보여줘', RO); if (myStats().courses.some(x => x.fb)) add('과제 피드백 해설', '과제 피드백 해설해줘'); else add('복습 퀴즈', '복습 퀴즈 내줘', RO); } }
    else if (a === 'acct') { k = 'acct'; name = '회원정보'; add('개인정보는 무엇을 저장하나요?', '내 개인정보는 무엇을 저장하나요?', { r: privacyTxt, f: 1 }); add('이름 · 휴대폰은 언제 필요해요?', '이름과 휴대폰 번호는 언제 필요해요?', { r: () => ({ t: '필요한 순간에만 목적을 밝히고 따로 받습니다.', h: OL(['이름: 수료증 발급 · 결제 · 환불', '휴대폰: 카카오톡 알림 신청 때(별도 동의)', '이 화면에서 언제든 지울 수 있습니다']) }), f: 1 }); add('비밀번호 · 로그인 수단', '비밀번호나 로그인 수단을 바꾸려면?', { r: () => ({ t: '이 화면의 「로그인 수단」에서 SNS를 연결하거나 비밀번호를 만들고 바꿀 수 있습니다. 비밀번호는 이 대화에 적지 마세요.' }), f: 1 }); add('탈퇴하면 어떻게 되나요?', '탈퇴하면 어떻게 되나요?', { r: leaveTxt, f: 1, re: /탈퇴/ }); }
    else if (a === 'family' || a === 'guardian') { k = a; name = a === 'family' ? '가족 연결' : '보호자 동의';
      if (a === 'guardian') { add('보호자 동의란?', '보호자 동의는 왜 필요한가요?', { r: () => ({ t: '만 14세 미만 자녀가 가입하려면 법에 따라 보호자 동의가 필요합니다. 동의하면 자녀가 바로 이용할 수 있고, 받는 정보는 로그인 수단 · 닉네임뿐입니다.' }), f: 1 }); add('동의하지 않으면?', '동의하지 않으면 어떻게 되나요?', { r: () => ({ t: '[동의하지 않음]을 누르면 자녀의 가입 정보가 바로 삭제됩니다. 7일 동안 응답이 없어도 자동으로 삭제됩니다.' }), f: 1 }); add('자녀 정보는 무엇을 받나요?', '자녀 가입 때 받는 정보는 무엇인가요?', { r: privacyTxt, f: 1 }); }
      else { add('가족 연결 방법', '가족 연결은 어떻게 하나요?', { r: () => ({ t: '휴대폰 번호 대신 가족 연결 코드(F + 6자)로 연결합니다.', h: OL(['자녀(또는 보호자) 계정의 「가족 연결」에서 코드 확인', '다른 쪽 계정에서 코드 입력 → 연결 요청', '상대가 수락하면 연결 완료']) }), f: 1 }); add('자녀 학습 현황 보기', '연결하면 무엇을 볼 수 있나요?', { r: () => ({ t: '연결된 보호자는 자녀의 출결 · 숙제 · 테스트 결과 · 알림을 읽기 전용으로 봅니다. 제출 · 응시는 자녀 계정에서만 할 수 있습니다.' }), f: 1 }); add('연결 끊기', '가족 연결을 끊으려면?', { r: () => ({ t: '이 화면의 연결 목록에서 [연결 해제]를 누르면 바로 끊어집니다.' }), f: 1 }); } }
    else if (a === 'inbox' || a === 'msg') { k = a; name = a === 'inbox' ? '알림' : '메시지';
      add('안 읽은 알림 정리', '안 읽은 알림을 정리해 줘', { r: () => { const A = ltTodo(); return { t: A.length ? `지금 챙길 일 ${A.length}가지로 정리했습니다.` : '급하게 챙길 알림은 없습니다.', h: A.length ? L(A) : '' }; }, f: 1 }); add('오늘 할 일', '오늘 뭐 하면 돼?', RO); esc2(); }
    else if (a === 'comm' || a === 'post' || a === 'write') { k = a; name = a === 'write' ? '글쓰기' : a === 'post' ? '게시글' : (PGN('comm') || '커뮤니티');
      const draft = () => { const f = document.querySelector('#lcW'); if (!f) return ''; const t = (f.querySelector('[name=title]') || {}).value || ''; const b = (f.querySelector('[name=body]') || {}).value || ''; return (t || b) ? `[제목] ${mask(t)}\n[본문] ${mask(b).slice(0, 1500)}` : ''; };
      if (a === 'write') { add('글 다듬기 도움', '제가 쓴 글을 더 읽기 쉽게 다듬을 점을 알려 주세요', { x: draft, r: () => { const d = draft(); if (!d) return { t: '제목과 본문을 먼저 적은 뒤 다시 눌러 주세요. 읽기 쉽게 다듬을 점을 알려 드립니다.' }; const body = (document.querySelector('#lcW [name=body]') || {}).value || ''; return { t: '읽기 쉽게 다듬을 점입니다.', h: OL([body.length > 300 ? '문단을 3~4줄씩 나누고 핵심을 첫 문장에 두세요' : '상황(무엇을 하다가) → 궁금한 점 → 시도한 것 순서로 쓰면 답을 빨리 받습니다', /\?|까요|나요/.test(body) ? '질문이 분명합니다 — 제목에도 질문 요지를 넣어 보세요' : '마지막에 무엇을 알고 싶은지 질문 한 줄을 넣어 보세요', /[\w.+-]+@|01\d[-\s]?\d{3,4}/.test(body) ? '이메일 · 전화번호 같은 개인정보는 지워 주세요' : '이름 · 연락처 같은 개인정보는 적지 마세요']) }; } });
        add('제목 추천', '이 글에 어울리는 제목을 추천해 주세요', { x: draft, r: () => { const b = String((document.querySelector('#lcW [name=body]') || {}).value || '').trim(); if (!b) return { t: '본문을 먼저 적어 주시면 어울리는 제목을 골라 드립니다.' }; const s1 = sents(b, 1)[0] || b.slice(0, 40); return { t: '제목은 질문 요지를 20자 안팎으로 담으면 좋습니다.', h: OL([`[질문] ${esc(s1.slice(0, 28))}`, `${esc(s1.replace(/[?？.!]+$/, '').slice(0, 22))} — 도움 부탁드립니다`, '강좌 · 레슨 이름을 앞에 붙이면 같은 수강생이 찾기 쉽습니다']) }; } }); add('질문 글 양식', '질문 글 양식 알려줘', { r: () => ({ t: '이 양식으로 쓰면 답을 빨리 받습니다.', h: OL(['어떤 강좌 · 레슨에서', '무엇을 하려다가', '어디서 막혔는지(화면 · 오류 문구)', '해 본 것', '알고 싶은 것 한 줄']) }), f: 1 }); }
      else if (a === 'post') { const pv = () => mask(textOf('#lm .lcpost, #lm article, #lm .lc-post') || textOf('#lm')).replace(/\s+/g, ' ').slice(0, 1200); add('이 글 요약', '이 글을 세 줄로 요약해 줘', { x: () => `[게시글]\n${pv()}`, r: () => ({ t: '이 글의 앞부분 핵심입니다.', h: OL(sents(pv(), 3).map(esc)) }) }); add('댓글 쓰기 도움', '예의 있고 도움이 되는 댓글은 어떻게 쓰나요?', { r: () => ({ t: '도움이 되는 댓글 쓰기입니다.', h: OL(['글쓴이의 질문을 한 줄로 다시 확인', '내 경험 · 방법을 구체적으로', '확실하지 않으면 「제 경우에는」처럼 부드럽게']) }), f: 1 }); }
      else { add('질문 글 잘 쓰는 법', '질문 글은 어떻게 쓰면 좋나요?', { r: () => ({ t: '이 순서로 쓰면 답을 빨리 받습니다.', h: OL(['어떤 강좌 · 레슨에서', '무엇을 하려다 어디서 막혔는지', '해 본 것', '알고 싶은 것 한 줄']) + L([LR.me ? { h: '글쓰기', d: '', href: '#write' } : { h: '로그인하고 글쓰기', d: '', href: '#login' }]) }), f: 1 }); add('게시판 이용 안내', '게시판 이용 규칙 알려줘', { r: () => ({ t: '함께 쓰는 게시판 규칙입니다.', h: OL(['개인정보(이름 · 연락처)는 쓰지 않기', '과제 · 시험 답을 그대로 올리지 않기', '서로 존중하는 말투', '「쌤에게만」으로 쓰면 선생님만 봅니다']) }), f: 1 }); add('글쓰기', '', { kind: 'go', href: LR.me ? '#write' : '#login' }); } }
    else if (a === 'notice') { k = 'notice'; name = PGN('notice') || '공지사항'; const N = () => (S2.notices || []).slice().sort((x, y) => String(y.at || '').localeCompare(String(x.at || '')));
      ctx = `최근 공지: ${N().slice(0, 5).map(n => n.title).join(', ')}`;
      add('최근 공지 요약', '최근 공지를 요약해 줘', { r: () => { const A = N().slice(0, 5); return A.length ? { t: `최근 공지 ${A.length}건입니다.`, h: OL(A.map(n => `${esc(n.title)} <small>${esc(String(n.at || '').slice(0, 10))}</small>`)) } : { t: '아직 공지가 없습니다.' }; }, f: 1 });
      add('내 강좌 공지만', '내가 듣는 강좌 공지만 알려줘', { r: () => { if (!LR.me) return { t: '로그인하면 내가 듣는 강좌의 공지만 모아 볼 수 있습니다.', h: L([{ h: '로그인하기', d: '', href: '#login' }]) }; const my = new Set(myStats().courses.map(x => x.c.id)); const A = N().filter(n => n.clsId && my.has(n.clsId)).slice(0, 5); return { t: A.length ? `내 강좌 공지 ${A.length}건입니다.` : '내 강좌 공지는 아직 없습니다.', h: A.length ? OL(A.map(n => esc(n.title))) : '' }; }, f: 1 }); if (me) add('오늘 할 일', '오늘 뭐 하면 돼?', RO); else add('수강 신청 방법', '수강 신청은 어떻게 하나요?', { r: howEnroll, f: 1 }); }
    else if (a === 'books') { k = 'dbooks'; name = PGN('books') || '디지털북'; const B2 = S2.dbooks || [];
      add('디지털북은 어떻게 보나요?', '디지털북은 어떻게 보나요?', { r: () => ({ t: '책을 고르면 페이지를 넘기며 읽고, 중간 확인 문제 · 쓰기 활동을 하면 진도가 기록됩니다. 다 읽으면 인증서를 받을 수 있습니다.', h: B2.length ? L(B2.slice(0, 4).map(b => ({ h: b.title, d: '', href: '#bk/' + b.id }))) : '' }), f: 1 });
      add('어떤 책부터 읽을까요?', '어떤 디지털북부터 읽으면 좋을까요?', { r: () => ({ t: B2.length ? `첫 책으로 「${B2[0].title}」을 권합니다. 목표를 알려 주시면 더 맞게 골라 드립니다.` : '아직 공개된 디지털북이 없습니다.', h: B2.length ? L([{ h: B2[0].title, d: '', href: '#bk/' + B2[0].id }]) : '' }) });
      add('인증서 받는 법', '디지털북 인증서는 어떻게 받나요?', { r: () => ({ t: '책의 모든 페이지와 확인 활동을 마치면 인증서가 만들어집니다. 「내 학습」에서 확인할 수 있습니다.' }), f: 1 }); }
    else if (['textbooks', 'tb', 'mybooks'].includes(a)) { k = 'books'; name = a === 'mybooks' ? '내 교재/교구' : '교재/교구';
      add('교재 구매 · 배송', '교재는 어떻게 사고 언제 받나요?', { r: () => ({ t: '교재는 결제 후 배송 요청사항을 적으면 기관이 보내 드립니다. 전자책은 결제 즉시 「내 교재/교구」에서 내려받습니다.', h: L([{ h: '교재/교구 둘러보기', d: '', href: '#textbooks' }, LR.me && { h: '내 교재/교구', d: '', href: '#mybooks' }]) }), f: 1 });
      add('전자책 받는 법', '전자책은 어떻게 내려받나요?', { r: () => ({ t: '「내 교재/교구」에서 [내려받기]를 누르세요. 내려받기 횟수 · 기간이 정해진 교재는 화면에 남은 횟수가 보입니다.' }), f: 1 }); add('환불 규정', '교재 환불 규정 알려줘', { r: () => ({ t: '교재 환불 규정입니다.', h: `<div class="lt-fb"><p>${nl(policy().slice(0, 400) || '기관 운영 정책에 따릅니다.')}</p></div>` + P('전자책은 내려받은 뒤에는 환불이 제한될 수 있습니다.') }), f: 1 }); }
    else if (a === 'privacy') { k = 'privacy'; name = '개인정보 처리방침'; add('한 줄 요약', '개인정보 처리방침을 쉽게 요약해 줘', { r: privacyTxt, f: 1 }); add('내 정보 지우는 법', '내 개인정보를 지우려면?', { r: () => ({ t: '「회원정보 › 내 개인정보」에서 이름 · 휴대폰을 지우거나, 탈퇴하면 개인정보가 바로 파기됩니다.', h: L([{ h: '회원정보', d: '', href: LR.me ? '#acct' : '#login' }]) }), f: 1 }); add('탈퇴하면?', '탈퇴하면 어떻게 되나요?', { r: leaveTxt, f: 1 }); }
    else if (a === 'hp') { const key = r.rest || 'home'; k = 'hp'; name = hpName(key); const tx = () => { let t = ''; document.querySelectorAll('#lm .smhost').forEach(h => { if (h.shadowRoot) t += ' ' + h.shadowRoot.textContent; }); return mask(t || textOf('#lm')).replace(/\s+/g, ' ').trim().slice(0, 1200); };
      ctx = `홈페이지 페이지: ${name}`;
      add('이 페이지 요약', '이 페이지 내용을 쉽게 요약해 줘', { x: () => `[페이지 내용]\n${tx()}`, r: () => { const S3 = sents(tx(), 3); return { t: `「${name}」 페이지 앞부분입니다.`, h: S3.length ? OL(S3.map(esc)) : P('요약할 글이 없습니다.') }; } });
      add('어떤 강좌가 있나요?', `어떤 ${term('cls')}${lJ(term('cls'), '이', '가')} 있나요?`, { r: () => listCls(), f: 1 }); add('문의 방법', '상담 · 문의는 어떻게 하나요?', { r: () => { const o = S2.org || {}; return { t: '문의는 아래 방법으로 할 수 있습니다.', h: OL([o.tel && `전화: ${esc(o.tel)}`, o.email && `이메일: ${esc(o.email)}`, S2.chat && S2.chat.type && S2.chat.type !== 'none' && '화면의 상담 버튼(카카오톡 · 채널톡)', LR.me ? '「메시지」로 운영자에게 보내기' : '가입 후 「메시지」로 문의']) }; }, f: 1 }); }
    else { const pg = (S2.pages || []).find(x => x.id === a); k = 'page'; name = pg ? pg.name : '홈'; add('이 화면에서 할 수 있는 일', '이 화면에서 무엇을 할 수 있나요?', { r: () => ({ t: `「${name}」 화면입니다. 자주 찾는 곳으로 바로 가실 수 있습니다.`, h: L([{ h: `${term('cls')} 둘러보기`, d: '', href: '#shop' }, LR.me ? { h: '내 학습', d: '', href: '#my' } : { h: '무료 가입', d: '', href: '#join' }, { h: '공지사항', d: '', href: '#notice' }]) }) }); if (me) add('오늘 할 일', '오늘 뭐 하면 돼?', RO); else add('수강 신청 방법', '수강 신청은 어떻게 하나요?', { r: howEnroll, f: 1 }); }
    return { k, name: name || '홈', ctx, chips: C.slice(0, 5) };
  }
  function nextOf(c, it) { const its = (c.items || []).filter(i => i.type !== 'chapter'); const r = ((LR.lp && LR.lp.cls && LR.lp.cls[c.id]) || { items: {} }).items || {}; const i0 = it ? its.indexOf(it) : -1; const nx = its.slice(i0 + 1).find(i => !(r[i.id] || {}).done) || its.find(i => !(r[i.id] || {}).done);
    return nx ? { t: `다음은 「${nx.title}」입니다.`, h: L([{ h: nx.title, d: ITN2[nx.type] || '', href: `#c/${c.id}/${nx.id}` }]) } : { t: '이 과정의 레슨을 모두 마쳤습니다. 수료증을 확인해 보세요.', h: L([{ h: '수료증', d: c.name, href: '#cert/' + c.id }]) }; }
  function certRule(c) { const crit = c.crit || (c.criteria && c.criteria.items) || null; const cp = (SITE() && SITE().cpl && SITE().cpl.on) ? SITE().cpl : null; const thr = (cp && +cp.rate) || c.thr || (c.criteria && c.criteria.threshold) || 80; /* v32.8 규정 준수 기관은 게시된 수료 기준을 우선(QA U9) */
    return { t: `「${c.name}」 수료 기준입니다.`, h: OL([Array.isArray(crit) && crit.length ? `항목별 이수율 ${thr}% 이상(${crit.length}개 항목 가중 평균)` : `전체 진도 ${thr}% 이상`, ...(c.items || []).filter(i => ['exam', 'assign'].includes(i.type) && i.rules && i.rules.pass && i.rules.pass.on).map(i => `${esc(i.title)}: ${i.rules.pass.v}점 이상`), '기준을 채우면 수료증이 자동으로 발급됩니다']) }; }
  function leaveTxt() { return { t: '탈퇴하면 이렇게 처리됩니다.', h: OL(['개인정보(이메일 · 이름 · 휴대폰 · 로그인 수단)는 바로 파기', '학습 기록은 이름 없는 번호로만 남아 통계에 쓰임', '결제 기록은 법에 따라 5년 보관', '같은 SNS로 다시 가입하면 새 계정으로 시작']) + L([LR.me && { h: '회원정보 › 탈퇴', d: '', href: '#acct' }]) }; }

  let CUR = null;
  const LSAM = { screen: () => { try { CUR = screen(); } catch (e) { console.error('lsam', e); CUR = { k: 'page', name: '홈', chips: [] }; } return CUR; }, cur: () => CUR || LSAM.screen(),
    find(q) { const s = String(q || '').trim(); const C = (CUR || LSAM.screen()).chips; return C.find(c => c.q === s) || C.find(c => c.re && c.re.test(s) && c.r && c.f) || null; },
    ctx() { const s = CUR || LSAM.screen(); return `지금 화면: ${s.name}${s.ctx ? '\n' + mask(s.ctx).slice(0, 900) : ''}`; } };
  /* v38 F5 L: '환불' · '글씨 크게'처럼 사이트 이용 질문은 공부 질문으로 되묻지 않고 안내 · 바로 가기로 답한다 */
  { const GEN = [[/글씨|글자/, () => ({ t: '모든 화면의 글자를 크게 볼 수 있어요. 아래 버튼을 누르거나 「나 › 글자 크게 보기」에서 켜고 끌 수 있어요.', h: typeof lFsRow === 'function' ? lFsRow() : '' })],
      [/환불|학습비 반환|반환/, () => (typeof lPayOff === 'function' && lPayOff()) ? { t: `이 기관은 학습자가 직접 결제하지 않아 환불 절차가 없어요. 수강 취소는 ${SITE().org.name}에 문의해 주세요.`, h: L([{ h: '메시지로 문의하기', d: '', href: '#msg' }]) } : { t: '환불은 「내 학습 › 결제」 또는 결제 · 환불 내역에서 결제 건을 고르고 [환불 신청]을 누르면 돼요. 금액은 기관 환불 규정을 따릅니다.', h: L([{ h: '결제 · 환불 내역', d: '', href: '#mypay/pay' }]) }]];
    const base = LSAM.find; LSAM.find = q => { const r = base(q); if (r) return r; const s = String(q || ''); const g = GEN.find(([re]) => re.test(s)); return g ? { l: s, q: s, r: g[1], f: 1 } : null; }; }
  window.LSAM = LSAM;
  /* 칩 문자열(홈 비서 · 예전 호출 호환) */
  ltChips = () => LSAM.screen().chips.filter(c => !c.kind).map(c => c.q).slice(0, 4);
  ltCtxLine = () => LSAM.ctx().split('\n')[0];
  /* 규칙: 화면 칩이 먼저, 없으면 기존 규칙 */
  /* 가장 바깥 렌더: 어떤 화면 모듈이 그렸든 대화창의 '지금 화면'을 다시 맞춘다(일부 화면은 안쪽 렌더 감싸기를 거치지 않음) */
  { const base = lrender; lrender = (...a) => { const r = base(...a); try { if (SITE()) { if (typeof lFix === 'function') lFix(); /* 일부 화면 모듈이 안쪽 감싸기(유형별 표시 · 보호자 막대 · 아바타)를 건너뛰어 다시 맞춤 */ ltRender(); } } catch (e) { console.error('lsam render', e); } return r; }; }
  { const base = ltRule; ltRule = q => { try { const ch = LSAM.find(q); if (ch && ch.r) { const r = ch.r(); if (r) return r; } } catch (e) { console.error('lsam rule', e); } return base(q); }; }
})();
