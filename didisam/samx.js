/* 디디쌤 스튜디오 v48 — AI SAM 메뉴별 기본 지원(통합 · 개발 6)
   대표님 방향 「AI가 메인인 운영 어드민」: 「AI 지원 없음(화면 전용)」이던 메뉴(학사 LMS 세부 · 마일리지 · 보안 · 시스템 관리 · 마켓 등)와
   칩이 3개가 안 되던 메뉴에 기본 수준 AI SAM 지원을 넣는다.
   - 화면 인식 추천 질문 3개: ① 현황 요약 ② 조회(지금 할 일 · 목록) ③ 쓰기(계획 카드 → 승인 → 실행) 또는 안내.
   - 요약 · 조회는 규칙 엔진이 지금 그려진 화면(브리핑 · 지표 · 지금 할 일 · 표 — 모두 기관 데이터로 그려진 값)과 S를 읽어 답한다. 지어낸 숫자 없음.
   - 쓰기는 기존 도구 범위만: 공지 올리기(S.notices) · 메시지(scxMsgPlan) — 모두 계획 카드, 승인해야 실행.
   - 위험 작업 · 보안 설정 변경(권한 · 2단계 인증 · 동기화 · 지급 마감 · 성적 확정 · 정책 켜기)은 안내만 하고 자동 실행하지 않는다.
   - 대학(사업단 · 센터) 등 모든 유형에서 「기본 안내에서 답하지 못함」 칩은 표준 용어로 다시 묻고, 그래도 못 하면 그 화면 요약으로 답한다.
   - Claude 경로는 기존 run_screen_action(2등급)으로 같은 칩을 실행한다(새 도구 없음). Claude에게 돌려주는 글에는 건수만, 목록은 카드 html로.
   모든 스크립트를 읽은 뒤(DOMContentLoaded) scxDefs를 감싼다 — scn-univ-lms.js도 DOMContentLoaded에서 감싸므로 그보다 바깥이 된다. */
(function () {
  'use strict';
  const MISS = /이해하지 못했습니다/;
  const T = x => (x ? (x.innerText || x.textContent || '') : '').replace(/\s+/g, ' ').trim();
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teacher = () => { try { return typeof scn === 'function' && scn() === 'teacher'; } catch (e) { return false; } };
  const owner = () => !!(S && S.me && S.me.role === 'owner');
  const lab = k => (typeof mlabel === 'function' ? mlabel(k) : k);
  const cur = () => (typeof scxKey === 'function' ? scxKey() : '');
  const J = (w, a) => (typeof AI !== 'undefined' && AI.j ? AI.j(w, a) : a);
  const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const firstSent = s => { const m = String(s || '').match(/^.*?[.다요]\s/); return (m ? m[0] : String(s || '')).trim(); };

  /* ── 화면 읽기: 브리핑(.l43-hl · .l43-sub) · 숫자 카드(.l43-kp · .l43-stats · .l43-ring · .kpi) · 지금 할 일(.l43-todo · .db-todo) · 표 ── */
  /* 마지막으로 그린 화면 — CUR만 바뀌고 아직 그리지 않았으면(다른 화면 DOM을 읽지 않게) 먼저 그린다 */
  let DRAWN = '';
  if (typeof AFTER !== 'undefined') AFTER.push(() => { try { DRAWN = cur(); } catch (e) { } });
  function read() {
    try { if (DRAWN !== cur() && typeof render === 'function') render(); } catch (e) { }
    const m = document.querySelector('#main'); if (!m) return null;
    const br = m.querySelector('.l43-brief');
    const hl = T(m.querySelector('.l43-hl')), sub = T(m.querySelector('.l43-sub'));
    const st = []; const add = (a, b) => { a = cut(a, 30); b = cut(b, 40); if (a && b && !st.some(x => x[0] === a)) st.push([a, b]); };
    m.querySelectorAll('.l43-kp > div, .l43-stats > div').forEach(d => add(T(d.querySelector('dt')), T(d.querySelector('dd'))));
    m.querySelectorAll('.l43-ring').forEach(r => { const b = T(r.querySelector('b')), s = T(r.querySelector('span')); add(s, b); });
    m.querySelectorAll('.kpi').forEach(k => add(T(k.querySelector('.lab')), T(k.querySelector('.val'))));
    const todo = []; m.querySelectorAll('.l43-todo li, .db-todo li').forEach(li => { const b = T(li.querySelector('b')); if (!b || todo.some(x => x.b === b)) return; todo.push({ b: cut(b, 40), s: cut(T(li.querySelector('small')), 60), chip: T(li.querySelector('.l43-chip, .db-chip')), warn: li.classList.contains('warn') }); });
    const tables = [...m.querySelectorAll('table')].filter(t => t.tHead && t.tBodies[0] && !t.closest('.scx, #modal, .mwrap')).map(t => {
      const cols = [...t.tHead.rows[0].cells].map(c => cut(T(c), 16)); const keep = cols.map((c, i) => i).filter(i => cols[i]).slice(0, 5);
      const rows = [...t.tBodies[0].rows].filter(r => r.cells.length > 1).map(r => keep.map(i => cut(T(r.cells[i]), 40)));
      const h = T(t.closest('section, .card, .tw') && t.closest('section, .card, .tw').querySelector('h3, h2'));
      return { cols: keep.map(i => cols[i]), rows, h }; }).filter(t => t.rows.length);
    /* 브리핑 · 지표가 없는 화면(마켓 · 보안 등): 화면에 보이는 짧은 숫자 줄을 그대로 모은다(지어내지 않음) */
    const lines = [];
    if (!hl && !st.length) { const seenL = new Set(); String(m.innerText || '').split(/\n+/).map(x => x.replace(/\s+/g, ' ').trim()).forEach(x => { if (lines.length >= 6 || x.length < 3 || x.length > 40 || !/\d/.test(x) || /^\d{4}[-.]\d|\d{1,2}:\d{2}|년 \d+월 \d+일/.test(x) || seenL.has(x)) return; seenL.add(x); lines.push(x); }); }
    return { brief: !!br, hl, sub, st, todo, tables, lines };
  }
  const nums = s => (String(s || '').match(/\d[\d,.]*/g) || []).length;
  const notHere = k => ({ text: `「${lab(k)}」 화면을 연 뒤에 다시 눌러 주세요. 지금 화면을 기준으로 답합니다.`, nav: k });

  /* ① 현황 요약 */
  function sum(k) {
    if (cur() !== k) return notHere(k);
    const r = read(); const L = lab(k);
    if (!r) return scxInfo(`「${L}」 화면을 읽지 못했습니다.`);
    const warn = r.todo.filter(x => x.warn).length;
    const st = r.st.slice(0, 6);
    let text = r.hl ? r.hl + (/[.!?]$/.test(r.hl) ? '' : '.') : `「${L}」 화면 현황입니다.`;
    const extra = st.slice(0, 3).map(([a, b]) => `${a} ${b}`).join(' · ');
    if (extra && nums(text) < 2) text += ` ${extra}.`;
    if (r.todo.length) text += ` 지금 할 일 ${r.todo.length}건${warn ? `(처리 필요 ${warn}건)` : ''}.`;
    else if (r.tables.length && !nums(text)) text += ` 목록 ${r.tables[0].rows.length}건.`;
    if (r.sub) text += ' ' + firstSent(r.sub);
    const rows = st.map(x => [x[0], x[1]]);
    if (!rows.length && r.tables.length) rows.push(['목록', `${r.tables[0].rows.length}건`]);
    let html = rows.length ? scxTbl(['항목', '값'], rows) : '';
    if (r.todo.length) html += scxTbl(['지금 할 일', '내용', '상태'], r.todo.slice(0, 5).map(x => [x.b, x.s, x.chip || (x.warn ? '처리 필요' : '')]));
    if (!r.hl && !rows.length && r.lines.length) return scxInfo(`「${L}」 화면의 주요 숫자입니다: ${r.lines.slice(0, 3).join(' · ')}.`, scxTbl(['화면 항목'], r.lines.map(x => [x])) + html, { via: `화면 도움 · ${L} · 화면 데이터 요약` });
    if (!r.brief && !rows.length && !r.todo.length) { const d = (typeof slimMD === 'function' && MENU[k] ? slimMD(k)[0] : '') || ''; return scxInfo(`「${L}」 화면입니다. ${d}`.trim() + ' 아직 요약할 숫자가 화면에 없습니다.'); }
    return scxInfo(text.replace(/\s+/g, ' ').trim(), html, { via: `화면 도움 · ${L} · 화면 데이터 요약` });
  }
  /* ② 지금 할 일 */
  function todo(k) {
    if (cur() !== k) return notHere(k);
    const r = read(); if (!r) return scxInfo('화면을 읽지 못했습니다.');
    if (!r.todo.length) { const s = sum(k); s.text = `지금 처리할 일은 없습니다. ${s.text || ''}`.trim(); return s; }
    const w = r.todo.filter(x => x.warn).length;
    return scxInfo(`「${lab(k)}」에서 지금 할 일 ${r.todo.length}건입니다${w ? ` — 처리 필요 ${w}건부터 보세요` : ''}.`, scxTbl(['할 일', '내용', '상태'], r.todo.map(x => [x.b, x.s, x.chip || (x.warn ? '처리 필요' : '')])));
  }
  /* ② 목록 조회(표) — Claude에게 돌려주는 글에는 건수만, 행은 카드 html로 */
  function list(k, re) {
    if (cur() !== k) return notHere(k);
    const r = read(); if (!r) return scxInfo('화면을 읽지 못했습니다.');
    const t = (re && r.tables.find(x => re.test(x.h + ' ' + x.cols.join(' ')))) || r.tables[0];
    if (!t) { if (r.todo.length) return todo(k); return sum(k); }
    return scxInfo(`「${lab(k)}」${t.h ? ` ${t.h}` : ''} 목록 ${t.rows.length}건입니다${t.rows.length > 8 ? '(앞 8건 표시)' : ''}.`, scxTbl(t.cols, t.rows.slice(0, 8)));
  }
  /* ③ 쓰기: 공지(계획 카드 → 승인) */
  function notice(k, title, body) {
    if (teacher()) return scxInfo('공지는 강의실 공지 화면에서 올려 주세요.');
    const ttl = typeof title === 'function' ? title() : title; const bd = typeof body === 'function' ? body() : body;
    return scxPlan('공지', `「${ttl}」 공지를 기관 공지에 올릴까요? 승인하시면 올리고, ${t('learner')}${J(t('learner'), '은')} 공지 · 앱 알림함에서 봅니다.`, () => {
      S.notices = S.notices || []; const minOrd = S.notices.reduce((a, n) => Math.min(a, +n.ord || 0), 0);
      S.notices.unshift({ id: uid('n'), title: ttl, body: bd, imgs: [], pin: false, item: '', files: [], at: today(), views: 0, by: S.me.name, ord: minOrd - 10 });
      logAudit(`AI SAM 공지 — ${ttl}`); return `「${ttl}」 공지를 올렸습니다. 소통 › 공지에서 고칠 수 있습니다.`; },
    { html: `<div class="pvmsg"><b>${E(ttl)}</b><p>${E(bd)}</p></div>`, cta: '공지 올리기' });
  }
  /* ③ 쓰기: 메시지(기존 scxMsgPlan — 계획 카드 → 승인) */
  function msg(sel, title, body) {
    if (teacher()) return scxInfo('메시지는 내 강의 화면에서 보내 주세요.');
    const L = t('learner'); const M = (S.members || []).filter(m => m.grade !== '거절');
    let ids = [], to = '';
    if (sel === 'risk') { ids = [...new Set((S.classes || []).filter(c => c.status === '운영중').flatMap(c => (c.learners || []).filter(id => (+((c.prog || {})[id] || {}).p || 0) < 30)))]; to = `진도 30% 미만 ${L}`; }
    else if (sel === 'away') { ids = M.filter(m => scxOff(m) >= 14).map(m => m.id); to = `14일 이상 미접속 ${L}`; }
    else { ids = M.map(m => m.id); to = `전체 ${L}`; }
    return scxMsgPlan(title, body, ids, to);
  }
  /* ③ 안내만(위험 작업 · 설정 변경 — 자동 실행하지 않음) */
  const SAFE = 'AI SAM은 이 작업을 자동으로 실행하지 않습니다. 화면에서 직접 확인하고 진행하세요.';
  const guide = (title, steps, note) => scxInfo(`${title} — ${note || '아래 순서로 화면에서 진행하세요.'}`, '', { steps, guide: true });

  /* ── 메뉴별 추천 질문 3개(그 메뉴에서 실제로 자주 하는 일) ── */
  const s = (id, l, sh) => k => [id, l, () => sum(k), sh];
  const d = (id, l, sh) => k => [id, l, () => todo(k), sh];
  const b = (id, l, re, sh) => k => [id, l, () => list(k, re), sh];
  const n = (id, l, ttl, body, sh) => k => [id, l, () => notice(k, ttl, body), sh];
  const m = (id, l, sel, ttl, body, sh) => () => [id, l, () => msg(sel, ttl, body), sh];
  const g = (id, l, title, steps, note, sh) => () => [id, l, () => guide(title, typeof steps === 'function' ? steps() : steps, note), sh];
  const x = (id, l, fn, sh) => k => [id, l, () => fn(k), sh];
  const ORG = () => (S && S.org && S.org.name) || '';
  const SPEC = {
    lmsa: [s('xa-sum', '이번 학기 분반 현황 요약'), b('xa-list', '분반 목록 보기'), g('xa-copy', '대표 분반 자료 복제하는 법', '대표 분반 자료 복제', ['학기 · 강좌에서 복제할 대표 분반을 엽니다', '[자료 복제]에서 받을 분반을 고릅니다', '미리보기에서 차시 · 자료를 확인하고 [복제]를 누릅니다'])],
    lmsb: [s('xb-sum', '강의실 구성 현황 요약'), d('xb-todo', '강의실 준비 할 일 보기'), n('xb-ntc', '이번 주 강의실 학습 안내 공지 올리기', '이번 주 강의실 학습 안내', () => `${ORG()} 강의실에 이번 주 차시 자료와 영상이 올라왔습니다. 강의실에서 차시를 확인하고, 궁금한 점은 강의 게시판 Q&A에 남겨 주세요.`, '학습 안내 공지')],
    lmsc: [s('xc-sum', '학습활동 참여 현황 요약'), b('xc-list', '열린 학습활동 목록 보기'), n('xc-ntc', '학습활동 참여 안내 공지 올리기', '학습활동 참여 안내', '토론 · 사전 과제 · 팀 프로젝트가 열려 있습니다. 마감 전에 강의실 학습활동에서 참여해 주세요.', '참여 안내 공지')],
    lmsd: [s('xd-sum', '강의 게시판 현황 요약'), b('xd-list', '최근 게시글 보기'), n('xd-ntc', '수업 안내 공지 올리기', '수업 운영 안내', '이번 주 수업 일정과 자료를 강의실에서 확인해 주세요. 질문은 강의 게시판 Q&A에 남기면 담당 교수자가 답합니다.', '수업 안내 공지')],
    lmse: [s('xe-sum', '채점 대기 과제 현황 요약'), b('xe-list', '과제별 제출 · 채점 현황 보기', /채점|제출|과제/), n('xe-ntc', '과제 마감 안내 공지 올리기', '과제 마감 안내', '진행 중인 과제의 마감이 다가옵니다. 강의실 과제 화면에서 제출 상태를 확인하고 마감 전에 제출해 주세요.', '마감 안내 공지')],
    lmsf: [s('xf-sum', '시험 · 채점 현황 요약'), d('xf-todo', '시험 준비 할 일 보기')],
    lmsg: [s('xg-sum', '출결 현황 요약'), b('xg-list', '결석이 많은 학생 보기', /결석|출석/), n('xg-ntc', '출결 기준 안내 공지 올리기', '출결 기준 안내', '결석이 수업 시간의 1/4을 넘으면 학칙에 따라 성적 처리에 불이익이 있을 수 있습니다. 강의실 출결 화면에서 내 출결을 확인해 주세요.', '출결 안내 공지')],
    grade: [s('xgr-sum', '성적 입력 현황 요약'), d('xgr-todo', '성적 확정 전 할 일 보기'), g('xgr-fix', '성적 확정 · 학사 전송하는 법', '성적 확정 · 학사 전송', ['점수 미입력 항목을 모두 채웁니다', '등급 분포 · 이의 신청을 확인합니다', '[확정 · 학사 전송]은 담당자가 직접 누릅니다(확정 뒤에는 학생에게 공개)'], SAFE)],
    lmsi: [s('xi-sum', '영상 진도 현황 요약'), b('xi-list', '진도 기준 미달 학생 보기', /진도|시청/), m('xi-msg', '진도 30% 미만 학생 독려 보내기', 'risk', '영상 학습 진도 안내', '강의 영상 진도가 기준보다 늦어지고 있습니다. 남은 차시 영상 1개만 먼저 들어도 진도가 올라갑니다.', '진도 독려')],
    lmsj: [s('xj-sum', '위험 학생 현황 요약'), d('xj-todo', '먼저 연락할 학생 할 일 보기'), m('xj-msg', '진도 부진 학생 독려 메시지 보내기', 'risk', '학습 진도 안내', '이번 주 학습이 조금 늦어지고 있습니다. 강의실에서 남은 항목을 확인하고, 막히는 부분은 AI 튜터나 Q&A에 물어보세요.', '부진 독려')],
    lmsk: [s('xk-sum', '설문 응답 현황 요약'), b('xk-list', '진행 중인 설문 목록 보기', /설문|응답/), n('xk-ntc', '설문 참여 안내 공지 올리기', '설문 · 강의평가 참여 안내', '진행 중인 설문 · 강의평가에 참여해 주세요. 응답은 수업 개선에만 쓰며 개인을 알아볼 수 없게 집계합니다.', '설문 안내 공지')],
    'lmsl-cal': [s('xl-sum', '이번 달 일정 현황 요약'), d('xl-todo', '다가오는 마감 보기'), n('xl-ntc', '학사 일정 안내 공지 올리기', '이번 달 학사 일정 안내', '이번 달 과제 · 퀴즈 마감과 시험 기간을 학생 달력에서 확인해 주세요. 마감 하루 전에 알림이 갑니다.', '일정 안내 공지')],
    'lmsl-dm': [s('xm-sum', '안 읽은 메시지 현황 요약'), d('xm-todo', '답할 대화 보기'), g('xm-pin', '분반 단체방 공지 고정하는 법', '단체방 공지 고정', ['DM 채팅에서 분반 단체방을 엽니다', '고정할 메시지의 ⋯ 메뉴에서 [고정]을 누릅니다', '자주 묻는 질문은 고정 메시지로 두면 같은 질문이 줄어듭니다'], '대화 내용은 AI SAM이 읽거나 대신 답하지 않습니다.')],
    'lmsl-noti': [s('xn-sum', '알림 규칙 현황 요약'), b('xn-list', '알림 규칙 목록 보기'), g('xn-add', '새 알림 규칙 추가하는 법', '알림 규칙 추가', ['[규칙 추가]를 누릅니다', '보낼 때(마감 D-1 · 공지 등록 등)와 받는 사람 · 채널을 고릅니다', '방해금지 시간을 확인하고 저장합니다'])],
    lmsm: [s('xs-sum', '구성원 · 계정 현황 요약'), d('xs-todo', '계정 점검 할 일 보기'), g('xs-role', '구성원 권한 바꾸는 법', '구성원 권한 변경', ['시스템 관리 › 사용자 · 권한에서 구성원을 찾습니다', '구성원을 열어 역할(학생 · 교수자 · 조교 · 운영자)을 고릅니다', '바꾼 내용은 로그 검색에 남습니다 — 정운영자가 직접 저장합니다'], '권한 · 계정 변경은 보안 작업이라 AI SAM이 자동으로 바꾸지 않습니다.')],
    lmsn: [s('xo-sum', 'MOOC · 비학위 과정 현황 요약'), b('xo-list', '과정 · 기수 목록 보기'), m('xo-msg', '14일 미접속 수강생 안내 보내기', 'away', '학습 이어가기 안내', '최근 2주 동안 접속 기록이 없습니다. 지난번에 멈춘 차시부터 이어서 들을 수 있습니다.', '미접속 안내')],
    lmso: [s('xr-sum', 'AI 학습 지원 현황 요약'), d('xr-todo', 'AI 답변 검토할 일 보기'), g('xr-doc', 'AI 튜터 참고 자료 올리는 법', 'AI 튜터 참고 자료', ['AI 학습 지원 › 강의자료에서 분반을 고릅니다', '강의 노트 · 슬라이드(PDF)를 올립니다', '자료가 없는 분반은 AI 튜터가 답하지 않습니다 — 목록에서 빈 분반을 확인합니다'])],
    lmsp: [s('xp-sum', '공통 설정 점검 요약'), d('xp-todo', '설정 점검 항목 보기'), g('xp-sec', '보안 · 파일 규칙 바꾸는 법', '보안 · 파일 규칙 변경', ['공통 설정 › 보안 · 개인정보 또는 파일 · 에디터 탭을 엽니다', '값을 바꾸면 모든 강의실에 바로 반영됩니다', '관리자 2단계 인증은 끄지 않는 것을 권장합니다'], '보안 설정 변경은 AI SAM이 자동으로 실행하지 않습니다. 정운영자가 화면에서 직접 바꿉니다.')],
    'lmsp-portal': [s('xq-sum', '포털 첫 화면 현황 요약'), d('xq-todo', '포털 정리 할 일 보기'), g('xq-order', '포털 위젯 순서 바꾸는 법', '포털 위젯 순서', ['[보이는 칸 고르기]를 누릅니다', '자주 쓰는 위젯을 끌어 앞으로 옮깁니다', '저장하면 교수자 · 학생 포털 첫 화면에 바로 반영됩니다'])],
    'lmsp-app': [s('xt-sum', '앱 출석 현황 요약'), d('xt-todo', '앱 출석 할 일 보기'), n('xt-ntc', '앱 출석 방법 안내 공지 올리기', '앱 출석 방법 안내', '수업 시작 때 교수자가 보여 주는 QR을 학생 앱으로 찍으면 출석이 기록됩니다. QR은 15초마다 바뀌니 화면을 직접 찍어 주세요.', '출석 안내 공지'), g('xt-qr', '출석 QR 여는 법', '앱 출석 QR', ['분반을 고릅니다', '[출석 코드 · QR 열기]를 누르면 3분 동안 QR이 열립니다(15초마다 바뀜)', '학생은 앱에서 QR을 찍어 출석합니다 — 기록은 출결 관리와 같습니다'])],
    lmsq: [s('xu-sum', '비교과 프로그램 현황 요약'), b('xu-list', '프로그램 신청 현황 보기'), n('xu-ntc', '비교과 프로그램 모집 공지 올리기', '비교과 프로그램 모집 안내', '이번 학기 비교과 프로그램 신청을 받고 있습니다. 비교과 메뉴에서 프로그램을 확인하고 정원이 차기 전에 신청해 주세요.', '모집 공지')],
    lmslive: [s('xv-sum', '실시간 수업 현황 요약'), b('xv-list', '실시간 수업 목록 보기'), n('xv-ntc', '실시간 수업 입장 안내 공지 올리기', '실시간 수업 입장 안내', '실시간 수업은 강의실 차시에서 [입장]을 눌러 들어옵니다. 입장 기록이 출결에 반영되니 시작 시각에 맞춰 입장해 주세요.', '입장 안내 공지')],
    lmsv: [s('xw-sum', '강의 영상 현황 요약'), d('xw-todo', '자막 · 차시 배치 할 일 보기'), g('xw-put', '영상을 차시에 놓는 법', '영상 차시 배치', ['올린 영상 목록에서 영상을 고릅니다', '[차시에 놓기]로 분반 · 차시를 고릅니다', '자막을 게시해야 학생 강의실에 영상이 보입니다'])],
    mileage: [x('xy-sum', '이번 달 마일리지 현황 요약', k => { try { if (S.mileage) { const r = BASE_ANS ? BASE_ANS('마일리지 현황') : null; if (r && r.text && !MISS.test(r.text)) return { ...r, go: undefined }; } } catch (e) { } return sum(k); }), s('xy-scr', '마일리지 화면 요약'), g('xy-rule', '마일리지 적립 규칙 바꾸는 법', '마일리지 규칙 변경', ['마일리지 › 규칙에서 적립 항목을 고릅니다', '점수 · 하루 한도를 고치고 미리보기로 확인합니다', '[저장]하면 다음 적립부터 적용됩니다(지난 적립은 그대로)'], '정책 · 보상 변경은 AI SAM이 자동으로 바꾸지 않습니다.')],
    security: [x('xz-sum', '보안 상태 요약', k => { if (!owner()) return scxInfo('보안 상태는 정운영자만 볼 수 있습니다.'); const r = typeof secSummaryText === 'function' ? secSummaryText() : null; return r ? { ...r, via: '화면 도움 · 보안' } : sum(k); }), d('xz-todo', '보안 지금 할 일 보기'), g('xz-pr', '수정 PR 승인 절차 안내', '보안 수정 PR 승인', ['보안 › 취약점 수정 PR에서 검증 통과 건을 엽니다', '변경 내용 · 검증 결과를 확인합니다', '승인은 지정된 승인자가 직접 누릅니다(두 사람 승인)'], '보안 설정 · 수정 PR 승인 · 차단 해제는 AI SAM이 자동으로 실행하지 않습니다.')],
    mkops: [s('xk1-sum', '마켓 심사 대기열 현황 요약'), b('xk1-list', '심사 대기 목록 보기'), g('xk1-pay', '분기 지급 마감하는 법', '분기 지급 마감', ['분기 지급 마감 탭에서 대상 분기를 고릅니다', 'CP별 순소진 · 지급액을 확인합니다', '[마감]은 산타 운영 담당이 직접 누릅니다(되돌리기 어려움)'], '지급 · 정산 마감은 돈이 오가는 작업이라 AI SAM이 자동으로 실행하지 않습니다.')],
    mksell: [s('xk2-sum', '판매 상품 현황 요약'), b('xk2-list', '판매 상품 목록 보기'), g('xk2-new', '마켓에 상품 등록하는 법', '마켓 상품 등록', ['[상품 등록]을 누릅니다', '저장본 · 라이선스 · 가격(부가세 별도)을 고릅니다', '심사 요청을 보내면 산타 심사 뒤 판매가 시작됩니다'])],
    mkcp: [s('xk3-sum', 'CP 파트너 현황 요약'), b('xk3-list', '카탈로그 · 단가표 보기'), g('xk3-price', '단가표 바꾸는 법', '단가표 변경', ['[단가표 수정]을 누릅니다', '상품별 크레딧 단가를 고칩니다', '바꾼 단가는 다음 달 1일부터 적용됩니다'], '단가 · 정산 변경은 AI SAM이 자동으로 바꾸지 않습니다.')],
    rfpmap: [s('xf1-sum', '요구사항 대응 현황 요약'), b('xf1-list', '요구사항 대응표 보기'), g('xf1-csv', '대응표 CSV 내보내는 법', '대응표 내보내기', ['[대응표 CSV 내보내기]를 누릅니다', '제안서 대응표 양식에 붙여 넣습니다', '외부 연계 · 수행 방안 항목은 제안서에 따로 적습니다'])],
    aigov: [s('xg1-sum', 'AI기본법 대응 현황 요약'), x('xg1-use', '이번 달 AI 사용량 보여줘', k => { const u = window.AIUSE && AIUSE.data ? AIUSE.data() : null; if (u && u.included) { const D = (u.days || []).slice(0, 7); return scxInfo(`${u.month || today().slice(0, 7)} AI 사용량은 포함량의 ${u.pct}%입니다(남은 양 ${(+u.remaining || 0).toLocaleString()}).`, scxTbl(['날짜', 'AI 호출', '입력', '출력'], D.map(r => [r.day, r.calls, (+r.tin || 0).toLocaleString(), (+r.tout || 0).toLocaleString()]))); } return scxInfo(`이번 달 AI SAM 사용 ${(S.ai && S.ai.usage) || 0}회입니다. 자세한 사용량은 설정 › AI 사용량에서 봅니다.`); }, 'AI 사용량'), g('xg1-law', '남은 AI 거버넌스 항목 채우는 법', 'AI 거버넌스 항목', ['AI 관리 › AI기본법 · 거버넌스 탭을 엽니다', '빈 항목(고지 문구 · 책임자 · 위험 평가)을 채웁니다', '저장하면 대응 비율이 바로 갱신됩니다'], 'AI 정책 · 모델 연결 변경은 AI SAM이 자동으로 바꾸지 않습니다.')],
    sis: [s('xh-sum', '학사 연동 현황 요약'), d('xh-todo', '동기화 전 할 일 보기'), g('xh-sync', '학사 동기화 실행하는 법', '학사 동기화', ['연동 구성에서 학사 시스템 주소 · 인증을 확인합니다', '[첫 동기화 실행]은 담당자가 직접 누릅니다', '동기화 기록에서 받은 강의실 · 수강 등록 건수를 확인합니다'], '외부 학사 시스템 동기화는 AI SAM이 자동으로 실행하지 않습니다.')],
    org: [x('xi1-info', '기관 정보 보여줘', () => { const o = S.org || {}; const ty = (typeof TYPES !== 'undefined' && TYPES[o.type] && TYPES[o.type].name) || o.type; const rows = [['기관명', o.name || ''], ['유형', ty + (o.ed ? ` · ${o.ed}` : '')], [t('learner'), `${(S.members || []).length}명`], [`${t('cls')}`, `${(S.classes || []).length}개`], ['협력 기관', `${(S.orgs || []).length}곳`]]; return scxInfo(`「${o.name}」 기관 정보입니다. ${t('learner')} ${(S.members || []).length}명 · ${t('cls')} ${(S.classes || []).length}개 · 협력 기관 ${(S.orgs || []).length}곳.`, scxTbl(['항목', '값'], rows)); }, '기관 정보')],
    groups: [x('xj1-sum', '배정 현황 요약', () => { const G = t('group'), Gs = S.groups || []; const M = S.members || []; const un = M.filter(mm => !mm.group && !(mm.groups || []).length).length; return scxInfo(Gs.length ? `${G} ${Gs.length}개에 ${t('learner')} ${M.length - un}명이 배정되어 있습니다. 아직 배정하지 않은 ${t('learner')} ${un}명.` : `아직 ${G}${J(G, '이')} 없습니다. [새 ${G} 만들기]로 시작하세요.`, scxTbl([G, '인원'], Gs.slice(0, 10).map(gg => [gg.name, M.filter(mm => mm.group === gg.id || (mm.groups || []).includes(gg.id)).length]))); }, '배정 현황')]
  };
  /* 「AI 지원 없음」이던 메뉴: 위 3개가 맨 앞(기존 「○○ 알려줘」 칩은 뒤로 밀리거나, 답하지 못하면 뺀다) */
  const FULL = new Set(['lmsp-portal', 'lmsp-app', 'lmsb', 'lmsc', 'lmsg', 'lmsi', 'lmsn', 'lmsq', 'lmslive', 'lmsv', 'mileage', 'lmsl-cal', 'lmsl-dm', 'lmsl-noti', 'lmsd', 'mkops', 'security', 'lmsm', 'lmsp', 'mksell', 'mkcp', 'rfpmap', 'lmsk']);
  window.SAMX_FULL = FULL;

  /* 답하지 못한 칩: 기관 용어를 표준 용어로 바꿔 다시 묻고, 그래도 못 하면 지금 화면 요약 */
  const STD = () => { const R = []; try { const L = t('learner'), K = t('cls'), G = t('group'); if (L && L !== '수강생') R.push([new RegExp(L, 'g'), '수강생']); if (K && K !== '강좌') R.push([new RegExp(K, 'g'), '강좌']); if (G && G !== '그룹') R.push([new RegExp(G, 'g'), '그룹']); } catch (e) { } return R; };
  function rescue(k, label, r) {
    if (!r || r.plan || !MISS.test(r.text || '')) return r;
    let q = String(label || ''); STD().forEach(([re, to]) => { q = q.replace(re, to); });
    if (q !== label) { try { const r2 = answer(q); if (r2 && (r2.plan || !MISS.test(r2.text || ''))) return r2; } catch (e) { } }
    return cur() === k ? sum(k) : notHere(k);
  }

  let TRIM = false; let BASE_ANS = null; let INMD = 0; /* INMD: 기존 칩을 대신 돌리는 중 — 자유 입력 가로채기를 쉰다(학사 LMS 실데이터 답 ULC가 나오게) */
  /* 기존 「○○ 알려줘」 칩이 약한 메뉴: 내 칩으로 바꾼다(학사 LMS · AI 관리 · 기관 관리 · 학과) */
  const DROPMD = new Set(['lmsa', 'lmse', 'grade', 'lmsj', 'lmso', 'aigov', 'sis', 'org', 'groups']);
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof scxDefs !== 'function') return;
    const base = scxDefs;
    scxDefs = function (k) { /* eslint-disable-line no-global-assign */
      const D = base.apply(this, arguments) || []; if (!S || !S.org || k === 'home' || k === 'dash' || k === 'settings') return D;
      const tch = teacher();
      const wrapRun = c => (Array.isArray(c) && typeof c[2] === 'function') ? [c[0], c[1], (...a) => { let r; try { r = c[2](...a); } catch (e) { console.error(e); r = null; } return rescue(k, c[1], r) || r; }, c[3]] : c;
      /* 지금 화면이 아니면 칩 목록만 돌려준다(다른 코드가 id로 찾을 때) */
      const mine = (SPEC[k] || []).map(f => f(k)).filter(c => !tch || !/공지|보내기|메시지/.test(c[1]));
      const out = []; const add = c => { if (c && c[1] && !out.some(y => y[1] === c[1] || y[0] === c[0])) out.push(c); };
      const isMd = c => Array.isArray(c) && String(c[0]) === 'md-' + k;
      /* 기존 「○○ 알려줘」(md-) 칩이 실제 데이터로 답하는 유형(학사 LMS 등)은 그 답을 쓰고, 못 하면 화면 요약 — 하나의 「현황 요약」 칩으로 합친다 */
      const md = D.find(isMd); const merge = !!(md && mine.length && (FULL.has(k) || DROPMD.has(k)));
      if (merge) { const r0 = mine[0][2], rm = md[2]; mine[0] = [mine[0][0], mine[0][1], () => { let r = null; INMD++; try { r = rm(); } catch (e) { r = null; } finally { INMD--; }
        if (r && (r.ulmsReq || (r.btn && /불러오지 못했/.test(r.text || '')))) return r; /* 학사 LMS 운영 모드: 서버 값을 비동기로 채우는 답(불러오는 중 → 갱신) · 실패 안내는 그대로 */
        if (r && !r.plan && r.text && !MISS.test(r.text) && !/^「[^」]+」 화면입니다|처리할 수 없는|불러오는 중/.test(r.text) && /\d/.test(r.text)) { const me = cur() === k ? r0() : null; return { ...r, html: r.html || (me && me.html) || '' }; } return r0(); }, mine[0][3]]; }
      if (FULL.has(k)) { mine.forEach(add); D.filter(c => !isMd(c)).forEach(c => add(wrapRun(c))); if (!merge) D.filter(isMd).forEach(c => add(wrapRun(c))); }
      else {
        /* 기존 칩 중 답하지 못하는 「○○ 알려줘」(md-)는 내 칩이 대신한다 */
        if (merge) add(mine[0]);
        D.forEach(c => { if (!(isMd(c) && merge)) add(wrapRun(c)); });
        mine.forEach(c => { if (out.length < 3 || !TRIM) add(c); });
        /* 그래도 3개가 안 되면: 이 화면 현황 요약 · 지금 할 일 */
        if (out.length < 3) add([`x-${k}-sum`, `${lab(k)} 현황 요약`, () => sum(k), '현황 요약']);
        if (out.length < 3) add([`x-${k}-todo`, `${lab(k)} 할 일 보기`, () => todo(k), '할 일 보기']);
        if (out.length < 3) add([`x-${k}-list`, `${lab(k)} 목록 보기`, () => list(k), '목록 보기']);
      }
      return TRIM ? out.slice(0, 3) : out; };
    /* 대화창 카드는 3개만(추천 질문 3개) — slim-ai.js와 같은 규칙 */
    if (typeof scxHTML === 'function') { const h = scxHTML; scxHTML = (...a) => { TRIM = true; try { return h(...a); } finally { TRIM = false; } }; } /* eslint-disable-line no-global-assign */
  });

  /* ── 자유 입력: 지금 화면 이름 + 현황/요약/알려 → 화면 요약, 위험 작업 · 보안 설정 변경 요청 → 안내만 ── */
  const RISKY = /(2단계\s*인증|정책|모델|권한|비밀번호|보안\s*설정|차단|해제|초기화|삭제|지급\s*마감|정산\s*마감|성적\s*확정|학사\s*전송|동기화|탈퇴|폐기|키\s*발급|PR\s*승인|승인해)/;
  const RISKY_G = /(2단계\s*인증|보안\s*설정|지급\s*마감|정산\s*마감|성적\s*확정|학사\s*(동기화|전송)|PR\s*승인|차단\s*해제)/;
  const IMP = /(해줘|해 줘|바꿔|꺼|켜|실행|처리|눌러|진행|마감해|확정해|승인)/, HOW = /(법|방법|어떻게|절차)/;
  const RISKY_K = new Set(['security', 'lmsm', 'lmsp', 'sis', 'aigov', 'mkops', 'mkcp', 'grade', 'mileage']);
  if (typeof answer === 'function') {
    const base = answer; BASE_ANS = base;
    answer = (q, ...a) => { /* eslint-disable-line no-global-assign */
      const s0 = String(q || '').trim();
      try {
        const k = cur();
        if (S && S.org && RISKY_G.test(s0) && IMP.test(s0) && !HOW.test(s0)) return guide(`「${cut(s0, 30)}」 요청은 보안 설정 · 위험 작업이라 바로 실행하지 않습니다`, ['해당 화면에서 대상과 영향을 먼저 확인합니다', '정운영자(지정 승인자)가 화면의 버튼으로 직접 진행합니다', '진행한 내용은 운영자 · 기록에 남습니다'], SAFE);
        if (!INMD && S && S.org && k && k !== 'home' && (SPEC[k] || FULL.has(k))) {
          if (RISKY_K.has(k) && RISKY.test(s0) && IMP.test(s0) && !HOW.test(s0))
            return guide(`「${cut(s0, 30)}」 요청은 위험 작업 · 보안 설정 변경이라 바로 실행하지 않습니다`, ['이 화면에서 대상과 영향을 먼저 확인합니다', '정운영자(지정 승인자)가 화면의 버튼으로 직접 진행합니다', '진행한 내용은 운영자 · 기록에 남습니다'], SAFE);
          const L = lab(k).replace(/\s*[·(].*$/, '');
          if ((s0 === `${lab(k)} 알려줘`) || (L.length >= 2 && s0.includes(L) && /(현황|요약|알려|보여|어때|상태)/.test(s0) && !/(만들|보내|올려|바꿔|삭제)/.test(s0))) { const r0 = base(q, ...a); if (r0 && (r0.plan || !MISS.test(r0.text || ''))) return r0; const f = (SPEC[k] || [])[0]; return f ? f(k)[2]() : sum(k); }
        }
      } catch (e) { console.warn('samx answer', e); }
      return base(q, ...a); };
  }
  window.SAMX = { read, sum, todo, list, SPEC, FULL };
  if (typeof COVER !== 'undefined') COVER.push(['[v48] AI SAM 메뉴별 기본 지원: 화면 전용 23개 메뉴에 추천 질문 3개 · 현황 요약 · 계획 카드(위험 작업은 안내만)', 'lmsg', '']);
})();
