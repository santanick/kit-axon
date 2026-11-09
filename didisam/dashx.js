/* v32.2 기관 유형별 홈 대시보드(현황) — 대표님(2026-11-07): '전체 홈 대시보드의 경우 기관유형별로 보고 싶은 항목이 다르니 맞춰서 구성해야 되지 않을까?'
   - 위젯 등록부(DASHX.W): 위젯마다 숫자 1개 + 버튼 1개(go(id)로 해당 화면). 숫자는 데모에서는 S(학사 LMS는 S.lms.*), 운영에서는 같은 S(동기화 문서)와 LMS API.
   - 유형별 기본 구성(DASHX.LAY): 학사 LMS · 대학 사업단 · 직업훈련원 · 학원(초중고 · 성인) · 기업 · 공공 · 평생교육원 + 교수자(강사) 구성.
   - 사람마다 보이기/숨기기 · 순서(끌어 놓기 · 키보드) · 기본 구성으로 되돌리기. 저장 위치: S.dashx.u[사용자 키][구성 키] = { order, hide }.
   - 다른 채팅방 파일(scn-k12.js · compliance.js · lms/*.js)은 고치지 않고, 공개된 상태(S.*)와 공개 함수(cplReqList · cplAttCalc · W2)만 읽는다.
   index.html에서 dash26.js 뒤 · boot.js 앞(현재 lms/nav.js 다음)에 로드한다. */
(function () {
  'use strict';
  if (typeof VIEWS !== 'object' || typeof ACT !== 'object') return;

  /* ── 공용 도우미 ── */
  const N = v => (+v || 0).toLocaleString('ko-KR');
  const arr = v => Array.isArray(v) ? v : [];
  const ty = () => (S && S.org && S.org.type) || 'adult';
  const isUL = () => ty() === 'univ' && S.org.ed === 'lms';
  const isT = () => !!(S && S.me && S.me.role === 'teacher');
  const live = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const td = () => today();
  const dday = d => { if (!d) return null; return Math.round((new Date(d + 'T00:00:00') - new Date(td() + 'T00:00:00')) / 864e5); };
  const plus = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const WD = '일월화수목금토';
  /* 내가 볼 강좌: 교수자는 담당 강좌만 */
  const myCls = () => { const L = arr(S.classes).filter(c => c.status !== '종료'); if (!isT() || typeof tCls !== 'function') return L; const T = new Set(tCls().map(c => c.id)); return L.filter(c => T.has(c.id)); };
  const progOf = c => Object.entries((c && c.prog) || {});
  const reach = () => { const s = new Set(); (S.nav.ws || []).forEach(w => { s.add(w); try { wsTabs(w).forEach(id => s.add(id)); } catch (e) { } }); s.add('settings'); return s; };
  /* 데모(서버 없음) 학사 LMS: 묶음 화면이 처음 그려질 때 만드는 시드를 한 번 미리 만들어 둔다(화면 html은 버린다) */
  const WARM = {};
  /* 묶음 화면은 비동기로 단계별 시드를 만들므로(구역 → 차시 → 기록) 다시 그릴 때마다 최대 6번까지 이어서 부른다 */
  function warm(id, ok) { if (live() || !isUL()) return; try { if (ok()) return; if ((WARM[id] = (WARM[id] || 0) + 1) > 6) return; if (typeof VIEWS[id] === 'function') VIEWS[id](); } catch (e) { console.warn('dashx warm', id, e); } }
  const L = k => (S.lms && S.lms[k]) || null;

  /* ── 운영(서버) 모드: 학사 LMS 숫자는 기존 API를 읽어 덮어쓴다(1분 캐시, 실패하면 S 기준 값 유지) ── */
  const LV = { at: 0, busy: false, ov: null, qp: null };
  function liveLoad() {
    if (!live() || !isUL() || LV.busy || Date.now() - LV.at < 6e4 || typeof api !== 'function') return;
    LV.busy = true; LV.at = Date.now();
    Promise.allSettled([api('GET', '/api/lms/a/overview'), api('GET', '/api/lms/q/programs')]).then(([a, q]) => {
      LV.ov = a.status === 'fulfilled' ? a.value : LV.ov; LV.qp = q.status === 'fulfilled' ? q.value : LV.qp;
    }).finally(() => { LV.busy = false; if (CUR && CUR.ws === 'dash') render(); });
  }

  /* ── 위젯 계산 ── */
  /* 오늘 수업(일반): 회차형 · 실시간 · 오프라인 차시 중 오늘 날짜 */
  function unitsOn(d) { let n = 0; myCls().forEach(c => { let U = []; try { U = typeof W2 === 'object' && W2.hasUnits && W2.hasUnits(c) ? W2.units(c) : arr(c.sessions); } catch (e) { U = arr(c.sessions); } n += U.filter(u => u && u.date === d).length; }); return n; }
  function nextUnits() { for (let i = 1; i <= 14; i++) { const d = plus(td(), i); const n = unitsOn(d); if (n) return { d, n }; } return null; }
  const pendMine = () => { const T = new Set(myCls().map(c => c.id)); return typeof pend === 'function' ? pend().filter(x => T.has(x.c.id)) : []; };
  /* 학사 LMS 원천 */
  const aSecs = () => { const ov = LV.ov; if (ov && Array.isArray(ov.sections)) return ov.sections; warm('lmsa', () => arr((L('a') || {}).sections).length > 0); return arr((L('a') || {}).sections); };
  const aTerm = () => { const ov = LV.ov; const T = ov && Array.isArray(ov.terms) ? ov.terms : arr((L('a') || {}).terms); return T.find(t => t.is_operating) || T[0] || null; };
  const w3 = () => { warm('lmsg', () => !!(L('w3') && arr(L('w3').sessions).length && Object.keys(L('w3').att || {}).length)); return L('w3') || {}; };
  const secsToday = (d = td()) => { const wd = WD[new Date(d + 'T00:00:00').getDay()]; return aSecs().filter(s => s.status !== 'closed' && !s.hidden && arr(s.schedule).some(x => x && x.day === wd)); };

  const W = {
    /* 공통 */
    cls_run: { n: () => `운영 중인 ${t('cls')}`, u: '개', v: () => { const C = myCls(); return { v: C.length, sub: `모집 · 판매 중 ${C.filter(c => /운영|모집|판매/.test((c.status || '') + (c.sale || ''))).length}개` }; }, act: ['class'], b: () => `${t('cls')} 관리` },
    today_cls: { n: '오늘 수업', u: '개', v: () => { const n = unitsOn(td()); const nx = n ? null : nextUnits(); return { v: n, sub: n ? `${td().slice(5).replace('-', '/')} 일정` : nx ? `다음 수업 ${nx.d.slice(5).replace('-', '/')} · ${nx.n}개` : '예정된 수업이 없습니다' }; }, act: ['crmatt', 'attend', 'calendar', 'class'], b: '출석부 열기' },
    grade_wait: { n: '채점 대기', u: '건', v: () => { const P = pendMine(); return { v: P.length, sub: P.length ? `가장 오래된 제출 ${N(Math.max(0, ...P.map(x => daysAgo(((x.c.prog || {})[x.id] || {}).subAt || td()))))}일 전` : '대기 중인 과제가 없습니다', tone: P.length ? 'w' : '' }; }, act: ['assess'], b: '채점하기' },
    qna: { n: '미답변 질문', u: '건', v: () => { const n = arr(S.posts).filter(p => p.kind === '질문' && !p.replies).length; return { v: n, sub: n ? `${tj('learner', '이')} 답을 기다립니다` : '모두 답했습니다', tone: n ? 'w' : '' }; }, act: ['community', 'board'], b: '답변하기' },
    away: { n: '14일 이상 미접속', u: '명', v: () => { const n = arr(S.members).filter(m => !m.withdrawn && m.last && daysAgo(m.last) >= 14).length; return { v: n, sub: `전체 ${t('learner')} ${N(arr(S.members).filter(m => !m.withdrawn).length)}명 중`, tone: n ? 'w' : '' }; }, act: ['members'], b: '명단 보기' },
    risk_low: { n: '진도 부진', u: '명', v: () => { const s = new Set(); myCls().forEach(c => progOf(c).forEach(([id, p]) => { if ((+p.p || 0) < 30) s.add(id); })); return { v: s.size, sub: '진도 30% 미만', tone: s.size ? 'w' : '' }; }, act: ['members'], b: '독려 대상 보기' },
    avg_prog: { n: '평균 진도', u: '%', v: () => { const V = myCls().flatMap(c => progOf(c).map(([, p]) => +p.p || 0)); return { v: V.length ? Math.round(V.reduce((a, b) => a + b, 0) / V.length) : 0, sub: `${t('cls')} ${myCls().length}개 기준` }; }, act: ['class'], b: '강좌별 보기' },

    /* 학사 LMS */
    u_today: { n: '오늘 수업', u: '개 분반', v: () => { const L0 = secsToday(); let nx = null; if (!L0.length) for (let i = 1; i <= 7 && !nx; i++) { const d = plus(td(), i); const n = secsToday(d).length; if (n) nx = { d, n }; } return { v: L0.length, sub: L0.length ? L0.slice(0, 2).map(s => s.title || s.course_name || '').join(' · ') : nx ? `다음 수업 ${WD[new Date(nx.d + 'T00:00:00').getDay()]}요일 · ${nx.n}개 분반` : '시간표가 등록된 분반이 없습니다' }; }, act: ['lmsg', 'lmsa'], b: '출석 관리' },
    u_absent: { n: '결석 의심', u: '명', v: () => { const D = w3(); const S0 = new Map(arr(D.sessions).map(s => [s.session_id, s])); const lim = plus(td(), -14); const all = new Set(), recent = new Set(); let late = 0;
      Object.entries(D.att || {}).forEach(([k, a]) => { const [sid, pid] = k.split('|'); if (!a) return; if (a.status === 'late') late++; if (a.status !== 'absent') return; all.add(pid); const s = S0.get(sid); if (s && String(s.starts_at).slice(0, 10) >= lim) recent.add(pid); });
      const base = recent.size ? recent : all; if (!base.size && !Object.keys(D.att || {}).length) { const s = new Set(); myCls().forEach(c => progOf(c).forEach(([id, p]) => { if (p.att != null && +p.att < 80) s.add(id); })); return { v: s.size, sub: '출석률 80% 미만', tone: s.size ? 'w' : '' }; }
      return { v: base.size, sub: `${recent.size ? '최근 2주 결석' : '이번 학기 결석'} · 지각 ${N(late)}건`, tone: base.size ? 'w' : '' }; }, act: ['lmsg'], b: '출결 확인' },
    u_grade: { n: '채점 대기', u: '건', v: () => { const E = L('efh') || {}; const sub = arr(E.subs).filter(s => /submit/.test(String(s.status || '')) && s.score == null).length; const ex = arr(E.atts).filter(a => /submit|manual|pending/.test(String(a.status || '')) && a.score == null).length; const p = pendMine().length; const n = sub + ex || p; return { v: n, sub: sub + ex ? `과제 ${N(sub)} · 시험 ${N(ex)}` : `과제 ${N(p)} · 시험 0`, tone: n ? 'w' : '' }; }, act: ['lmse', 'lmsf', 'assess'], b: '채점 시작' },
    u_deadline: { n: '성적 입력 마감', u: '', v: () => { const T = aTerm(); const g = L('grade') || {}; const dl = g.deadline || (T && T.ends_on ? plus(T.ends_on, 7) : ''); const d = dday(dl); return { v: d == null ? '—' : d > 0 ? `D-${d}` : d === 0 ? 'D-day' : `D+${-d}`, sub: dl ? `${dl.replace(/-/g, '.')} 마감${g.deadline ? '' : ' (학기 종료 7일 뒤)'}` : '학기를 먼저 등록합니다', tone: d != null && d <= 7 ? 'w' : '' }; }, act: ['grade'], b: '성적 입력' },
    u_risk: { n: '학습 위험 학생', u: '명', v: () => { const D = w3(); warm('lmsj', () => arr(D.snaps).length > 0); const last = new Map(); arr((L('w3') || {}).snaps).forEach(s => { const k = s.section_id + '|' + s.person_id; const o = last.get(k); if (!o || s.day > o.day) last.set(k, s); }); const P = new Set([...last.values()].filter(s => +s.risk >= 50).map(s => s.person_id)); if (!last.size) { const s = new Set(); myCls().forEach(c => progOf(c).forEach(([id, p]) => { if ((+p.p || 0) < 30) s.add(id); })); return { v: s.size, sub: '진도 30% 미만(학습 분석 전)', tone: s.size ? 'w' : '' }; } return { v: P.size, sub: '복합 지표 50점 이상', tone: P.size ? 'w' : '' }; }, act: ['lmsj'], b: '위험 학생 보기' },
    u_extra: { n: '비교과 신청 대기', u: '명', v: () => { if (LV.qp && Array.isArray(LV.qp.items)) { const open = LV.qp.items.filter(p => p.status === 'recruiting').length; const w = LV.qp.items.reduce((a, p) => a + (+((p.counts || {}).applied) || 0) + (+((p.counts || {}).waiting) || 0), 0); return { v: w, sub: `접수 중 프로그램 ${N(open)}개 · 전체 ${N(LV.qp.items.length)}개`, tone: w ? 'w' : '' }; } warm('lmsq', () => arr((L('q') || {}).programs).length > 0); const Q = L('q') || {}; const w = arr(Q.apps).filter(a => /pending|wait|applied|대기/.test(String(a.status || ''))).length; const open = arr(Q.programs).filter(p => /접수|open|recruit/.test(String(p.status || ''))).length; return { v: w, sub: `접수 중 프로그램 ${N(open)}개 · 전체 ${N(arr(Q.programs).length)}개`, tone: w ? 'w' : '' }; }, act: ['lmsq'], b: '신청 처리' },
    u_eval: { n: '강의평가 응답률', u: '%', v: () => { warm('lmsk', () => arr((L('k') || {}).surveys).length > 0); const K = arr((L('k') || {}).surveys).filter(s => s.kind === 'course_eval' && s.status === 'open'); const roster = Math.max(1, arr((L('a') || {}).enr).filter(e => e.status === 'enrolled').length || arr(S.members).length); const r = K.reduce((a, s) => a + arr(s.responses).length, 0); return { v: K.length ? Math.min(100, Math.round(r / roster * 100)) : 0, sub: K.length ? `진행 중 ${K.length}건 · 응답 ${N(r)}명` : '진행 중인 강의평가가 없습니다', tone: K.length && r / roster < .5 ? 'w' : '' }; }, act: ['lmsk'], b: '응답 독려' },
    u_prep: { n: '이번 학기 준비', u: '', v: () => { const A = LV.ov || L('a') || {}; let B = L('bcd') || {}; if (!live() && !B.weeks && window.LMSX && typeof LMSX.db === 'function') { try { B = LMSX.db(); } catch (e) { } } const steps = [['학기', arr(A.terms).length], ['교과목', arr(A.courses).length], ['분반', arr(A.sections).length], ['수강생', arr(A.enr).length || arr(A.sections).reduce((a, s) => a + (+s.enrolled || 0), 0)], ['강의실', arr(B.weeks).length]]; const done = steps.filter(x => x[1] > 0).length; const nx = steps.find(x => !x[1]); return { v: `${done}/${steps.length}`, sub: nx ? `다음 단계: ${nx[0]}` : '준비를 마쳤습니다', tone: nx ? 'w' : '' }; }, act: ['lmsa'], b: '이어서 준비' },
    u_sys: { n: '시스템 알림', u: '건', v: () => { warm('lmsm', () => arr((L('m') || {}).samples).length > 0); const M = L('m') || {}; const s = arr(M.samples)[0]; const bad = arr(M.samples).slice(0, 24).filter(x => x.level && x.level !== 'ok').length; const sis = arr((L('sis') || {}).log).filter(x => x && (x.ok === false || /fail|오류/.test(String(x.st || x.status || '')))).length; const n = bad + sis; return { v: n, sub: n ? `서버 ${bad} · 학사 연동 ${sis}` : s ? `정상 · CPU ${N(s.cpu_load)}% · 메모리 ${N(s.mem_pct)}%` : '정상', tone: n ? 'w' : '' }; }, act: ['lmsm'], b: '모니터링' },

    /* 대학 사업단 · 센터 · 공공 · 평생 */
    p_prog: { n: '운영 중 프로그램', u: '개', v: () => { const C = myCls(); return { v: C.filter(c => c.status === '운영중').length, sub: `준비 중 ${C.filter(c => c.status === '준비중').length}개` }; }, act: ['class'], b: '프로그램 관리' },
    p_apply: { n: '신청', u: '명', v: () => { const M = arr(S.members).filter(m => !m.withdrawn); const n = M.filter(m => m.joined && daysAgo(m.joined) <= 30).length; const w = M.filter(m => m.grade === '승인 대기').length; return { v: n, sub: `최근 30일 · 승인 대기 ${N(w)}명`, tone: w ? 'w' : '' }; }, act: ['enroll', 'members'], b: '신청 처리' },
    p_done: { n: '수료', u: '%', v: () => { let all = 0, dn = 0; myCls().forEach(c => { all += (c.learners || []).length; dn += doneN(c); }); /* v36 R1 이수 판정 한 곳(clsDone) */ return { v: all ? Math.round(dn / all * 100) : 0, sub: `${t('done')} ${N(dn)}명 / 수강 ${N(all)}명` }; }, act: ['cert', 'class'], b: () => `${t('done')} 처리` },
    p_sat: { n: '만족도', u: '점', v: () => { const R = arr(S.reviews).filter(r => !r.hidden && +r.stars > 0); const V = R.map(r => +r.stars); myCls().forEach(c => Object.values(c.svres || {}).forEach(x => { const s = +((x && (x.score || x.stars)) || 0); if (s > 0 && s <= 5) V.push(s); })); return { v: V.length ? (Math.round(V.reduce((a, b) => a + b, 0) / V.length * 10) / 10).toFixed(1) : '—', sub: V.length ? `5점 만점 · 응답 ${N(V.length)}건` : '아직 응답이 없습니다' }; }, act: ['community', 'assess', 'class'], b: '후기 · 설문 보기' },
    p_legal: { n: '법정의무교육 미이수', u: '명', v: () => { const n = typeof legalUndone === 'function' ? new Set(legalUndone().map(x => x.id)).size : 0; return { v: n, sub: '마감 전 안내가 필요합니다', tone: n ? 'w' : '' }; }, act: ['compliance', 'members'], b: '미이수자 보기' },
    l_refund: { n: '학습비 반환 신청', u: '건', v: () => { const n = arr(S.pays).filter(p => p.status === '환불 신청').length; return { v: n, sub: n ? '반환 기한 안에 처리합니다' : '처리할 신청이 없습니다', tone: n ? 'w' : '' }; }, act: ['lifelong', 'sales'], b: '반환 처리' },
    u_diag: { n: 'AI 진단 미완료', u: '명', v: () => { const n = arr(S.members).filter(m => !m.withdrawn && !m.diag).length; return { v: n, sub: `전체 ${t('learner')} ${N(arr(S.members).length)}명 중` }; }, act: ['diag', 'members'], b: '진단 안내' },

    /* 직업훈련원(인가 · 규정 준수) */
    v_att: { n: '훈련생 출결', u: '명', v: () => { const ids = new Set(); const T = { 결석: 0, 지각: 0, 조퇴: 0, 출석: 0 }; myCls().forEach(c => { (c.learners || []).forEach(id => ids.add(id)); Object.entries(c.att || {}).forEach(([k, v]) => { if (v && typeof v === 'object') Object.values(v).forEach(x => { if (x in T) T[x]++; }); else if (v in T) T[v]++; }); }); const rec = T.결석 + T.지각 + T.조퇴 + T.출석; const low = typeof lowAtt === 'function' ? new Set(lowAtt().map(x => x.id)).size : 0; return { v: ids.size, sub: rec ? `훈련 중 · 결석 ${N(T.결석)} · 지각 · 조퇴 ${N(T.지각 + T.조퇴)}` : `훈련 중 · 출석률 80% 미만 ${N(low)}명`, tone: low ? 'w' : '' }; }, act: [['cpl', { cpl: 'att' }], 'attend'], b: '출결 입력' },
    v_rate: { n: '단위기간 출석률', u: '%', v: () => { const V = []; myCls().forEach(c => progOf(c).forEach(([, p]) => { if (p.att != null) V.push(+p.att); })); const low = typeof lowAtt === 'function' ? new Set(lowAtt().map(x => x.id)).size : V.filter(v => v < 80).length; return { v: V.length ? Math.round(V.reduce((a, b) => a + b, 0) / V.length) : 0, sub: `80% 미만 ${N(low)}명`, tone: low ? 'w' : '' }; }, act: ['attend', ['cpl', { cpl: 'att' }]], b: '출석률 보기' },
    v_drop: { n: '중도탈락 위험', u: '명', v: () => { const s = new Set(); myCls().forEach(c => progOf(c).forEach(([id, p]) => { const m = arr(S.members).find(x => x.id === id); const k = (p.att != null && +p.att < 80 ? 1 : 0) + ((+p.p || 0) < 30 ? 1 : 0) + (m && m.last && daysAgo(m.last) >= 14 ? 1 : 0); if (k >= 2) s.add(id); })); return { v: s.size, sub: '출석 80% 미만 · 진도 30% 미만 · 14일 미접속 중 2가지', tone: s.size ? 'w' : '' }; }, act: ['members'], b: '상담 대상 보기' },
    v_fee: { n: '훈련비', u: '원', v: () => { const mo = td().slice(0, 7); const P = arr(S.pays).filter(p => /완료/.test(p.status || '')); const m = P.filter(p => String(p.at || '').startsWith(mo)).reduce((a, p) => a + (+p.amount || 0), 0); const est = myCls().reduce((a, c) => a + (+((c.hrd || {}).fee || c.fee || c.price) || 0) * (c.learners || []).length, 0); const miss = myCls().filter(c => !(+((c.hrd || {}).fee || c.fee || c.price) > 0)).length; return m ? { v: N(m), sub: '이번 달 결제 · 자부담 포함' } : est ? { v: N(est), sub: `운영 과정 예정 훈련비 합계${miss ? ` · 미입력 ${miss}개 과정` : ''}` } : { v: miss, u: '개 과정', sub: '훈련비 미입력 · 입력하면 예정 금액을 계산합니다', tone: miss ? 'w' : '' }; }, act: ['sales', 'hrd'], b: '훈련비 보기' },
    v_cpl: { n: '규정 준수 점검', u: '건', v: () => { const R = typeof cplReqList === 'function' ? cplReqList() : []; const bad = R.filter(r => ['설정 필요', '개발 필요'].includes(r.st)).length; const ok = R.filter(r => ['충족', '증빙 완료'].includes(r.st)).length; return { v: bad, sub: R.length ? `충족 ${N(ok)}/${N(R.length)} · 확인 필요 ${N(bad)}` : '점검표를 열어 확인합니다', tone: bad ? 'w' : '' }; }, act: [['cpl', { cpl: 'check' }]], b: '점검표 열기' },
    v_mon: { n: '원격훈련 모니터링', u: '건', v: () => { const D = S.cpl || {}; const cl = arr(D.claims).filter(x => x.st !== '완료'); const over = cl.filter(x => x.due && x.due < td()).length; const cp = arr(D.copy).filter(x => !x.st).length; const n = cl.length + cp; return { v: n, sub: `소명 ${N(cl.length)}${over ? `(기한 경과 ${over})` : ''} · 유사 답안 ${N(cp)}`, tone: n ? 'w' : '' }; }, act: [['cpl', { cpl: 'mon' }]], b: '모니터링 열기' },

    /* 학원 */
    k_today: { n: '오늘 수업', u: '개', v: () => W.today_cls.v(), act: [['crmatt', { crmAT: 'day' }], 'attend'], b: '출석부 열기' },
    k_att: { n: () => `${t('learner')} 출결`, u: '명', v: () => { let need = 0, mark = 0, abs = 0; myCls().forEach(c => { let U = []; try { U = W2.hasUnits(c) ? W2.units(c).filter(u => u.date === td()) : []; } catch (e) { } U.forEach(u => (c.learners || []).forEach(id => { need++; const v = W2.get(c, u.id, id); if (v) mark++; if (v === '결석') abs++; })); }); return { v: need ? `${N(mark)}/${N(need)}` : 0, sub: need ? `오늘 입력 · 결석 ${N(abs)}명 · 미입력 ${N(need - mark)}명` : '오늘 출결 대상이 없습니다', tone: need - mark > 0 ? 'w' : '' }; }, act: [['crmatt', { crmAT: 'day' }], 'attend'], b: '출결 입력' },
    k_pay: { n: '이번 달 수납', u: '%', v: () => { const mo = td().slice(0, 7); const B = arr(S.bills).filter(b => b.status !== '취소' && (b.month || String(b.due || '').slice(0, 7)) === mo); const ok = B.filter(b => /납부 완료|현장 납부/.test(b.status || '')).length; return { v: B.length ? Math.round(ok / B.length * 100) : 0, sub: `납부 ${N(ok)}건 / 청구 ${N(B.length)}건` }; }, act: [['crmbill', { crmBT: 'now' }], 'billing', 'sales'], b: '수납 보기' },
    k_unpaid: { n: '미납', u: '건', v: () => { const tot = b => arr(b.items).reduce((a, x) => a + (+(Array.isArray(x) ? x[1] : x && x.amt) || 0), 0); const paid = b => arr(b.paid).reduce((a, x) => a + (+x.amt || 0), 0); const O = arr(S.bills).filter(b => /미납|부분/.test(b.status || '')); const bal = O.reduce((a, b) => a + Math.max(0, tot(b) - paid(b)), 0); return { v: O.length, sub: O.length ? `잔액 ${won(bal)}` : '미납이 없습니다', tone: O.length ? 'w' : '' }; }, act: [['crmbill', { crmBT: 'now' }], 'billing'], b: '미납 관리' },
    k_cs: { n: '상담', u: '건', v: () => { const lead = arr(S.crmLeads).filter(l => !['등록', '보류'].includes(l.st)).length; const cs = arr(S.consults).filter(c => !/완료/.test(c.status || '')).length; return { v: lead + cs, sub: `신규 문의 ${N(lead)} · 진행 중 상담 ${N(cs)}`, tone: lead + cs ? 'w' : '' }; }, act: [['crmcs', { crmCT: 'lead' }], 'consult'], b: '상담 기록' },
    k_exam: { n: '성적 알림', u: '건', v: () => { const lim = plus(td(), -14); let n = 0, miss = 0; myCls().forEach(c => arr(c.k12Exams).forEach(e => { if (String(e.date || '') < lim) return; n++; (c.learners || []).forEach(id => { const s = (e.scores || {})[id]; if (!s || (s.v == null && !s.absent)) miss++; }); })); return { v: n, sub: n ? `최근 2주 시험 · 점수 미입력 ${N(miss)}명` : '최근 2주 등록된 시험이 없습니다', tone: miss ? 'w' : '' }; }, act: ['crmex', 'assess'], b: '성적 입력' },
    a_rev: { n: '이번 달 결제', u: '원', v: () => { const mo = td().slice(0, 7); const P = arr(S.pays).filter(p => /완료/.test(p.status || '') && String(p.at || '').startsWith(mo)); return { v: N(P.reduce((a, p) => a + (+p.amount || 0), 0)), sub: `결제 ${N(P.length)}건` }; }, act: ['sales'], b: '매출 보기' },
    a_refund: { n: '환불 신청', u: '건', v: () => { const n = arr(S.pays).filter(p => p.status === '환불 신청').length; return { v: n, sub: n ? '기한 안에 처리합니다' : '처리할 신청이 없습니다', tone: n ? 'w' : '' }; }, act: ['sales'], b: '환불 처리' },
    a_cs: { n: '상담', u: '건', v: () => { const n = arr(S.consults).filter(c => !/완료/.test(c.status || '')).length; return { v: n, sub: `전체 ${N(arr(S.consults).length)}건 중 진행 중`, tone: n ? 'w' : '' }; }, act: ['consult'], b: '상담 기록' },

    /* 기업 */
    c_legal: { n: '법정필수 이수율', u: '%', v: () => { const C = myCls().filter(c => c.legal); let all = 0, dn = 0; C.forEach(c => (c.learners || []).forEach(id => { all++; if (clsDone(c, id)) dn++; })); return { v: all ? Math.round(dn / all * 100) : 0, sub: C.length ? `법정 과정 ${C.length}개 · 미이수 ${N(all - dn)}건` : '법정의무 과정을 만들면 계산합니다', tone: all && dn / all < .8 ? 'w' : '' }; }, act: ['compliance', 'class'], b: '이수 현황' },
    c_dept: { n: '부서별 진행', u: '곳', v: () => { const G = arr(S.groups); const by = {}; myCls().forEach(c => progOf(c).forEach(([id, p]) => { const m = arr(S.members).find(x => x.id === id); const g = m && m.group; if (!g) return; (by[g] = by[g] || []).push(+p.p || 0); })); const R = G.map(g => { const V = by[g.id] || []; return { n: g.name, a: V.length ? Math.round(V.reduce((a, b) => a + b, 0) / V.length) : null }; }).filter(x => x.a != null).sort((a, b) => a.a - b.a); const low = R.filter(x => x.a < 80).length; return { v: low, sub: R.length ? `평균 진도 80% 미만 · 최저 ${R[0].n} ${R[0].a}%` : `${tj('group', '을')} 등록하면 비교합니다`, tone: low ? 'w' : '' }; }, act: ['groups', 'compliance'], b: () => `${t('group')}별 보기` },
    c_due: { n: '마감 임박', u: '명', v: () => { const thr = c => (c.criteria && c.criteria.threshold) || 80; const C = myCls().filter(c => c.end && c.end >= td()).sort((a, b) => a.end < b.end ? -1 : 1); const lim = plus(td(), 14); const soon = C.filter(c => c.end <= lim); const L0 = soon.length ? soon : C.slice(0, 1); let n = 0; L0.forEach(c => (c.learners || []).forEach(id => { if (!clsDone(c, id)) n++; })); const d = L0[0] ? dday(L0[0].end) : null; return { v: n, sub: !L0.length ? '마감이 정해진 과정이 없습니다' : soon.length ? `14일 안에 끝나는 과정 ${soon.length}개의 미이수` : `가장 빠른 마감 ${L0[0].end.slice(5).replace('-', '/')} (D-${d}) 미이수`, tone: soon.length && n ? 'w' : '' }; }, act: ['compliance', 'class'], b: '마감 안내' }
  };
  Object.keys(W).forEach(k => { W[k].id = k; });

  /* 기관 유형별 기본 구성(앞쪽 = 먼저 보임). 마지막 배열은 기본으로 숨겨 두었다가 사용자가 켤 수 있는 항목 */
  const LAY = {
    ulms: [['u_today', 'u_absent', 'u_grade', 'u_deadline', 'u_risk', 'u_extra', 'u_eval', 'u_prep', 'u_sys'], ['qna', 'away']],
    ulite: [['p_prog', 'p_apply', 'p_done', 'u_diag', 'p_sat'], ['away', 'grade_wait', 'qna']],
    voc: [['v_att', 'v_rate', 'v_drop', 'v_fee', 'v_cpl', 'v_mon'], ['grade_wait', 'qna', 'away']],
    k12: [['k_today', 'k_att', 'k_pay', 'k_unpaid', 'k_cs', 'k_exam'], ['grade_wait', 'away']],
    adult: [['today_cls', 'cls_run', 'a_rev', 'a_refund', 'a_cs', 'grade_wait'], ['away', 'qna', 'p_sat']],
    corp: [['c_legal', 'c_dept', 'c_due'], ['away', 'cls_run', 'grade_wait']],
    public: [['p_prog', 'p_apply', 'p_done', 'p_sat', 'p_legal'], ['away', 'c_dept', 'c_due']],
    lifelong: [['p_prog', 'p_apply', 'p_done', 'p_sat', 'l_refund'], ['today_cls', 'away']],
    t_ulms: [['u_today', 'u_grade', 'u_absent', 'u_risk', 'u_deadline'], ['qna', 'u_eval']],
    t_k12: [['k_today', 'k_att', 'k_exam', 'grade_wait', 'risk_low'], ['qna']],
    t_gen: [['today_cls', 'grade_wait', 'qna', 'risk_low', 'avg_prog'], ['away']]
  };
  const LAYN = { ulms: '대학 · 학사 LMS', ulite: '대학 · 사업단 · 센터', voc: '직업훈련원', k12: '학원(초중고)', adult: '학원(성인)', corp: '기업', public: '공공기관', lifelong: '평생교육원', t_ulms: '교수 · 학사 LMS', t_k12: '강사 · 학원', t_gen: () => `${t('teacher')}` };
  const layKey = () => { const k = ty() === 'univ' ? (S.org.ed === 'lms' ? 'ulms' : 'ulite') : ty(); if (isT()) return k === 'ulms' ? 't_ulms' : k === 'k12' ? 't_k12' : 't_gen'; return LAY[k] ? k : 'adult'; };
  const userKey = () => { if (isT()) { const me = typeof tMe === 'function' ? tMe() : null; return 't:' + ((me && me.id) || 'teacher'); } return (S.me.role || 'owner') + ':' + (S.me.id || S.me.email || 'me'); };
  const store = () => { S.dashx = S.dashx && typeof S.dashx === 'object' ? S.dashx : { v: 1, u: {} }; S.dashx.u = S.dashx.u || {}; const u = S.dashx.u[userKey()] = S.dashx.u[userKey()] || {}; return u; };
  const nm = w => typeof w.n === 'function' ? w.n() : w.n;
  const bl = w => typeof w.b === 'function' ? w.b() : w.b;
  /* 버튼이 갈 화면: 후보 중 지금 권한 · 메뉴로 열 수 있는 첫 화면 */
  const target = w => { const R = reach(); for (const a of w.act) { const [id, ui] = Array.isArray(a) ? a : [a, null]; if (R.has(id)) return { id, ui }; } return null; };
  /* 지금 보일 위젯 목록(사용자 순서 · 숨김 반영, 갈 화면이 없는 위젯은 뺀다) */
  function layout() {
    const k = layKey(); const [def, extra] = LAY[k]; const pool = [...def, ...extra].filter(id => W[id] && target(W[id]));
    const u = store()[k] || {}; const order = arr(u.order).filter(id => pool.includes(id)); pool.forEach(id => { if (!order.includes(id)) order.push(id); });
    const hide = new Set(u.hide ? u.hide : extra); return { k, def, extra, pool, order, hide, custom: !!(u.order || u.hide) };
  }
  const setLay = (k, o) => { store()[k] = o; save(); };

  /* ── 화면 ── */
  function card(w) {
    let r; try { r = w.v() || {}; } catch (e) { console.warn('dashx', w.id, e); r = { v: '—', sub: '값을 계산하지 못했습니다' }; }
    const tg = target(w); const u = r.u != null ? r.u : /^[\d,]+$/.test(String(r.v)) || typeof r.v === 'number' ? w.u : (String(r.v).includes('/') ? w.u : '');
    return `<article class="dx-card ${r.tone === 'w' ? 'w' : ''}" data-w="${w.id}"><h3>${esc(nm(w))}</h3><p class="dx-n"><b>${esc(typeof r.v === 'number' ? N(r.v) : String(r.v))}</b>${u ? `<small>${esc(u)}</small>` : ''}</p><p class="dx-s">${esc(r.sub || '')}</p><button type="button" class="btn sm" data-act="dx-go" data-v="${esc(tg.id)}" data-ui="${esc(tg.ui ? JSON.stringify(tg.ui) : '')}" data-w="${w.id}">${esc(bl(w))} ›</button></article>`;
  }
  function editHTML(Lx) {
    return `<div class="dx-ed" role="region" aria-label="현황 항목 편집"><p class="mini">보일 항목을 고르고 순서를 바꿉니다. 끌어서 옮기거나, 항목에서 Alt + ↑ ↓ 키 또는 화살표 버튼을 씁니다.</p>
      <ol class="dx-list">${Lx.order.map((id, i) => { const w = W[id]; const on = !Lx.hide.has(id); return `<li class="dx-li ${on ? '' : 'off'}" draggable="true" tabindex="0" data-w="${id}" aria-label="${esc(nm(w))} ${i + 1}번째${on ? '' : ' · 숨김'}"><span class="dx-grip" aria-hidden="true">⋮⋮</span><label class="dx-ck"><input type="checkbox" data-chg="dx-vis" data-v="${id}" ${on ? 'checked' : ''}> <span>${esc(nm(w))}</span></label><span class="sp"></span><button type="button" class="btn sm ghost" data-act="dx-mv" data-v="${id}" data-d="-1" aria-label="${esc(nm(w))} 위로" ${i ? '' : 'disabled'}>↑</button><button type="button" class="btn sm ghost" data-act="dx-mv" data-v="${id}" data-d="1" aria-label="${esc(nm(w))} 아래로" ${i < Lx.order.length - 1 ? '' : 'disabled'}>↓</button></li>`; }).join('')}</ol>
      <div class="dx-edf"><button type="button" class="btn sm ghost" data-act="dx-reset">기본 구성으로 되돌리기</button><span class="sp"></span><button type="button" class="btn sm pri" data-act="dx-edit">완료</button></div></div>`;
  }
  function gridHTML() {
    liveLoad();
    const Lx = layout(); const vis = Lx.order.filter(id => !Lx.hide.has(id)); const ed = !!UI.dxEdit; const ln = LAYN[Lx.k];
    return `<section class="dx" aria-labelledby="dxH" data-lay="${Lx.k}"><div class="dx-h"><h2 id="dxH">지금 볼 숫자</h2><small>${esc(typeof ln === 'function' ? ln() : ln)} 기본 구성${Lx.custom ? ' · 내 구성' : ''}${live() ? '' : ' · 데모: 브라우저에만 저장'}</small><span class="sp"></span><button type="button" class="btn sm ghost" data-act="dx-edit" aria-expanded="${ed}">${ed ? '편집 닫기' : '항목 편집'}</button></div>
      ${ed ? editHTML(Lx) : vis.length ? `<div class="dx-grid">${vis.map(id => card(W[id])).join('')}</div>` : `<div class="empty">보이는 항목이 없습니다. <button type="button" class="btn sm" data-act="dx-reset">기본 구성으로 되돌리기</button></div>`}</section>`;
  }
  window.DASHX = { W, LAY, layKey, layout, gridHTML, target };

  { const base = VIEWS.dash; VIEWS.dash = (...a) => { const h = base(...a); let g = ''; try { g = gridHTML(); } catch (e) { console.error(e); return h; }
    const i = h.indexOf('<div class="d26">'); if (i >= 0) return h.slice(0, i) + g + h.slice(i);
    const m = h.match(/^<div class="ph">[\s\S]*?<div class="phr">[\s\S]*?<\/div><\/div>/); return m ? m[0] + g + h.slice(m[0].length) : g + h; }; }

  /* ── 동작 ── */
  ACT['dx-go'] = el => { const id = el.dataset.v; let ui = null; try { ui = el.dataset.ui ? JSON.parse(el.dataset.ui) : null; } catch (e) { } if (ui) Object.keys(ui).forEach(k => { if (/^[a-zA-Z]\w{0,20}$/.test(k)) UI[k] = ui[k]; }); go(id); };
  ACT['dx-edit'] = () => { UI.dxEdit = !UI.dxEdit; render(); if (UI.dxEdit) setTimeout(() => { const f = document.querySelector('.dx-li'); f && f.focus(); }, 0); };
  ACT['dx-reset'] = () => { const k = layKey(); delete store()[k]; save(); toast('기본 구성으로 되돌렸습니다.', 'ok'); render(); };
  ACT['dx-vis'] = el => { const Lx = layout(); const H = new Set(Lx.hide); if (el.checked) H.delete(el.dataset.v); else H.add(el.dataset.v); setLay(Lx.k, { order: Lx.order, hide: [...H] }); render(); focusLi(el.dataset.v, 'input'); };
  function move(id, d) { const Lx = layout(); const o = Lx.order.slice(); const i = o.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= o.length) return false; o.splice(i, 1); o.splice(j, 0, id); setLay(Lx.k, { order: o, hide: [...Lx.hide] }); return true; }
  function focusLi(id, sel) { setTimeout(() => { const li = document.querySelector(`.dx-li[data-w="${id}"]`); if (!li) return; const x = sel ? li.querySelector(sel) : li; (x || li).focus(); }, 0); }
  ACT['dx-mv'] = el => { const id = el.dataset.v, d = +el.dataset.d; if (move(id, d)) { render(); const live2 = document.querySelector('.dx-ed'); if (live2) live2.setAttribute('aria-live', 'polite'); focusLi(id, `[data-act=dx-mv][data-d="${d}"]:not([disabled])`); } };
  /* 끌어 놓기 · 키보드(Alt + ↑ ↓) */
  AFTER.push(() => {
    const list = document.querySelector('.dx-list'); if (!list || list.dataset.dx) return; list.dataset.dx = 1; let drag = null;
    list.addEventListener('dragstart', e => { const li = e.target.closest && e.target.closest('.dx-li'); if (!li) return; drag = li.dataset.w; li.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag); } catch (x) { } });
    list.addEventListener('dragover', e => { if (!drag) return; e.preventDefault(); const li = e.target.closest && e.target.closest('.dx-li'); list.querySelectorAll('.dx-li.over').forEach(x => x.classList.remove('over')); if (li && li.dataset.w !== drag) li.classList.add('over'); });
    list.addEventListener('dragend', () => { drag = null; list.querySelectorAll('.drag,.over').forEach(x => x.classList.remove('drag', 'over')); });
    list.addEventListener('drop', e => { e.preventDefault(); const li = e.target.closest && e.target.closest('.dx-li'); const src = drag; drag = null; if (!li || !src || li.dataset.w === src) return; const Lx = layout(); const o = Lx.order.filter(x => x !== src); const j = o.indexOf(li.dataset.w); const r = li.getBoundingClientRect(); o.splice(e.clientY > r.top + r.height / 2 ? j + 1 : j, 0, src); setLay(Lx.k, { order: o, hide: [...Lx.hide] }); render(); focusLi(src); });
    list.addEventListener('keydown', e => { const li = e.target.closest && e.target.closest('.dx-li'); if (!li || !e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); if (move(li.dataset.w, e.key === 'ArrowUp' ? -1 : 1)) { render(); focusLi(li.dataset.w); } });
  });
  /* 화면을 떠나면 편집 모드를 닫는다 */
  AFTER.unshift(cur => { if (cur && cur.ws !== 'dash' && UI.dxEdit) UI.dxEdit = false; });

  if (!document.querySelector('style[data-dashx]')) { const st = document.createElement('style'); st.dataset.dashx = '1'; st.textContent = `
.dx{margin:0 0 20px}
.dx-h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 10px}
.dx-h h2{font-size:16px;margin:0}.dx-h small{color:var(--muted,#64748b);font-size:12px}.dx-h .sp,.dx-edf .sp,.dx-li .sp{flex:1}
.dx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
.dx-card{display:flex;flex-direction:column;gap:4px;min-width:0;background:#fff;border:1px solid var(--line,#e2e8f0);border-radius:10px;padding:14px 14px 12px}
.dx-card.w{border-color:#F5C2D8;background:linear-gradient(180deg,#FFF6FA,#fff 55%)}
.dx-card h3{margin:0;font-size:13px;font-weight:600;color:var(--ink,#1f2937)}
.dx-n{margin:2px 0 0;display:flex;align-items:baseline;gap:3px;min-width:0}.dx-n b{font:700 28px/1.1 var(--num,inherit);color:var(--ink,#111);overflow-wrap:anywhere}.dx-card.w .dx-n b{color:var(--mag,#C2185B)}.dx-n small{font-size:13px;color:var(--muted,#64748b)}
.dx-s{margin:0;font-size:12px;color:var(--muted,#64748b);line-height:1.45;min-height:2.9em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dx-card .btn{margin-top:auto;align-self:flex-start;max-width:100%;white-space:normal;text-align:left}
.dx-ed{background:#fff;border:1px solid var(--line,#e2e8f0);border-radius:10px;padding:12px}
.dx-list{list-style:none;margin:8px 0;padding:0;display:grid;gap:6px}
.dx-li{display:flex;align-items:center;gap:8px;border:1px solid var(--line,#e2e8f0);border-radius:8px;padding:6px 8px;background:#fff;min-width:0}
.dx-li:focus{outline:2px solid var(--mag,#C2185B);outline-offset:1px}.dx-li.off{opacity:.6}.dx-li.drag{opacity:.4}.dx-li.over{border-color:var(--mag,#C2185B);box-shadow:0 -2px 0 var(--mag,#C2185B)}
.dx-grip{cursor:grab;color:var(--muted,#94a3b8);letter-spacing:-2px;user-select:none}
.dx-ck{display:flex;align-items:center;gap:6px;min-width:0;cursor:pointer}.dx-ck span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dx-edf{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
@media (max-width:520px){.dx-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dx-card{padding:12px 10px 10px}.dx-n b{font-size:22px}.dx-card .btn{font-size:12px;padding:5px 8px}}`; document.head.appendChild(st); }

  if (typeof COVER !== 'undefined' && COVER.push) COVER.push(['[개선] 현황: 기관 유형별 숫자 위젯 · 사람마다 항목 편집(보이기 · 순서 · 기본 구성)', 'dash', '']);
})();
