/* 디디쌤 가디언(보안봇) 스튜디오 화면 — 운영 › 보안(정운영자 전용, 레일 칸 추가 없음)
   위쪽 탭: 보안 홈 · 취약점 보드 · 수정 PR 승인함 · 위협 인텔 + 더 보기(대책 카드 · 긴급 차단 · 설정 · 감사 기록)
   실서버: /api/security/* (서버도 owner만 허용). 시연판: 가상값(CVE-2026-XXXXX)으로 전 화면 동작.
   원칙: 승인은 서버 기록만 유효(재인증 필수) · 긴급 차단은 규칙 엔진이 실행하고 화면에서는 해제만 사람이 누른다.
   수집 데이터(피드 · 이슈 · 로그 텍스트)는 표시용 데이터로만 다루며, AI SAM 답변에서도 지시로 쓰지 않는다. */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined') return;
  if (!IC.shield) IC.shield = '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>';
  if (!IC.clock) IC.clock = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';

  /* ── 메뉴 · 프리셋 · 기존 저장 사용자 ── */
  /* v47 통합 결정: 가디언은 산타 내부 운영 도구 — 실서버는 산타 관리자(LIVE.user.santa, 서버 SANTA_ADMIN_EMAILS)만, 시연판은 데모 정운영자(흐름 확인용). 고객 기관용 보안 센터는 Phase 2 */
  { const M = { label: '보안', ws: 'ops', owner: true }; Object.defineProperty(MENU, 'security', { configurable: true, enumerable: true, get: () => (typeof LIVE !== 'undefined' && LIVE && LIVE.user && !LIVE.user.santa) ? undefined : M }); }
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; if (P && Array.isArray(P.on) && !P.on.includes('security') && !(P.off || []).includes('security')) P.on.push('security'); });
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org && S.nav && typeof navAdd === 'function' && !Object.values(S.nav.tabs).some(L => (L || []).some(x => x.id === 'security'))) { navAdd('security', true); save(); } } catch (e) { console.error('security', e); } return r; }; } /* eslint-disable-line no-global-assign */
  /* 기본 메뉴(slimEss)에 포함 — 정운영자에게만 보인다(MENU.owner). 학사 LMS 시나리오가 DOMContentLoaded에 바꾸므로 그 뒤에도 한 번 더 감싼다 */
  const essWrap = () => { if (typeof window.slimEss !== 'function' || window.slimEss.sec47) return; const base = window.slimEss; window.slimEss = (...a) => { const E = base(...a) || []; try { if (S && S.org && !E.includes('security')) return [...E, 'security']; } catch (e) { } return E; }; window.slimEss.sec47 = 1; };
  essWrap(); document.addEventListener('DOMContentLoaded', () => setTimeout(essWrap, 0));
  if (typeof DICT !== 'undefined') Object.assign(DICT, { '보안': 'Security|セキュリティ|安全|Seguridad|Sécurité|Sicherheit|Bảo mật|ความปลอดภัย|Безопасность' });

  const live = () => typeof LIVE !== 'undefined' && !!(LIVE && LIVE.user);
  const own = () => live() ? !!(LIVE.user && LIVE.user.santa) : !!(S && S.me && S.me.role === 'owner');
  const arr = x => Array.isArray(x) ? x : (x && (x.items || x.rows || x.list)) || [];
  const nf = n => Math.round(+n || 0).toLocaleString('ko-KR');
  const hm = h => { h = Math.max(0, Math.round(+h || 0)); const d = Math.floor(h / 24), r = h % 24; return d ? `${d}일${r ? ' ' + r + '시간' : ''}` : `${r}시간`; };
  const SEV = { Critical: 'c', High: 'h', Medium: 'm', Low: 'l' };
  const sv = s => `<span class="sec-sv ${SEV[s] || 'l'}">${esc(s || 'Low')}</span>`;
  const VER = { hit: ['해당', 'h'], part: ['일부', 'm'], none: ['해당 없음', 'l'], ctrl: ['통제 점검', 'c2'] };
  const vd = v => { const x = VER[v] || VER.none; return `<span class="sec-vd ${x[1]}">${x[0]}</span>`; };
  const src = s => `<span class="sec-src">${esc(s)}</span>`;
  const need = sev => (sev === 'Critical' || sev === 'High') ? 2 : 1;
  const COLS = [['new', '신규'], ['ana', '분석 중'], ['pr', 'PR 대기'], ['fix', '해결'], ['na', '해당 없음']];

  /* ── 시연값(가상) — 실제 취약점 · 기관이 아닙니다 ── */
  const now = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(5, 16).replace('T', ' ');
  const DEMO = {
    sum: { score: 87, delta: 3, state: 'ok', last: '오늘 06:00', high: 0, slaOver: 0, p: { P0: 0, P1: 2, P2: 5, P3: 9 }, mttd: 5.2, mttr: 21, killMode: 'dry' },
    fin: [
      { id: 'F-101', sev: 'High', score: 74, title: 'promptfoo 회귀: 파일명 태그 탈출 변형 우회', comp: 'AI 튜터 · aiguard', src: '레드팀', status: 'new', slaH: 144 },
      { id: 'F-102', sev: 'Medium', score: 41, title: 'CSP 헤더 누락 1건', comp: '학습자 사이트 /lesson', src: 'ZAP', status: 'new', slaH: 696 },
      { id: 'F-103', sev: 'Low', score: 12, title: 'testssl: TLS 1.2 약한 암호군 1개', comp: '외부 노출면', src: 'testssl', status: 'new', slaH: 2160 },
      { id: 'F-104', sev: 'High', score: 68, title: '교차 테넌트 404 급증(기관 A→B)', comp: '/api/state · RLS', src: '런타임', status: 'ana', slaH: 120 },
      { id: 'F-105', sev: 'Medium', score: 38, title: 'gitleaks: 과거 커밋의 테스트 키 패턴', comp: 'kit-axon 이력', src: 'gitleaks', status: 'ana', slaH: 576 },
      { id: 'F-106', sev: 'High', score: 82, title: 'express 4.x 보안 업데이트 CVE-2026-XXXXX', comp: '학습자 API · 운영', src: 'OSV', status: 'pr', slaH: 52, pr: 412 },
      { id: 'F-107', sev: 'Medium', score: 44, title: 'Firebase 규칙: auth != null 단독 허용 1곳', comp: '데모 프로젝트', src: '규칙 테스트', status: 'pr', slaH: 432, pr: 414 },
      { id: 'F-108', sev: 'Critical', score: 96, title: 'MAL- 악성 패키지 차단(lockfile 미포함 확인)', comp: '공급망 · npm', src: 'OSV', status: 'fix', slaH: 0 },
      { id: 'F-109', sev: 'Medium', score: 30, title: 'GCP-2026-090 미사용 서비스', comp: '인프라', src: 'GCP', status: 'na', slaH: 0, note: '구성 목록에 없는 서비스입니다.' }
    ],
    prs: [
      { id: 412, sev: 'High', title: 'express 4.x 보안 업데이트', cve: 'CVE-2026-XXXXX', tags: ['의존성', 'OSV', 'GHSA'], state: 'review_done',
        plain: ['웹 서버 부품(express)에 알려진 취약점이 있어 안전한 버전으로 올립니다.', '학습자 API에 영향이 있으며 기능 변화는 없습니다.', '문제가 생기면 이전 버전으로 바로 되돌릴 수 있습니다.'],
        basis: 'OSV · GHSA(purl 정확 매칭)', impact: '학습자 API(운영 도달) · 우선순위 82점', sla: '7일 중 2일 4시간 남음',
        files: [['package.json', 1, 1], ['package-lock.json', 14, 14]], tests: [['회귀 테스트(qa-squad)', '42/42'], ['교차 테넌트(A→B 404)', '통과'], ['promptfoo 스모크', '통과'], ['동일 도구 재스캔', '0건']],
        rollback: '이전 이미지로 Cloud Run 리비전 되돌리기 · rollback_ref r-0412', ok: true,
        appr: [{ role: '개발 총괄', by: '개발 총괄', at: '09:42', done: true }, { role: '대표님', done: false }] },
      { id: 413, sev: 'High', title: 'aiguard 패턴 보강 + 회귀 테스트', tags: ['aiguard', '레드팀'], state: 'review_wait',
        plain: ['AI 튜터가 숨은 지시를 걸러 내는 규칙을 보강합니다.', '학습자 AI 튜터 · AI SAM 답변 경로에 적용됩니다.', '규칙 파일만 바뀌어 되돌리기 쉽습니다.'],
        basis: '레드팀 회귀 F-101', impact: 'AI 튜터 · aiguard · 우선순위 74점', sla: '7일 중 6일 남음',
        files: [['service/server/aiguard.js', 12, 2], ['security/redteam/cases.json', 30, 0]], tests: [['회귀 테스트(qa-squad)', '42/42'], ['promptfoo 인젝션 10건', '10/10 차단'], ['정상 질문 오탐', '0건']],
        rollback: 'PR 되돌리기(revert) · rollback_ref r-0413', ok: true,
        appr: [{ role: '개발 총괄', done: false }, { role: '대표님', done: false }] },
      { id: 414, sev: 'Medium', title: '의존성 통합 PR(주 1회) 7건', tags: ['의존성'], state: 'verifying',
        plain: ['이번 주 나온 부품 업데이트 7건을 한 번에 올립니다.', '화면 · 기능 변화는 없습니다.', '검증이 끝나야 승인할 수 있습니다.'],
        basis: 'Dependabot · OSV', impact: '서버 전체 · 우선순위 44점', sla: '30일 중 18일 남음',
        files: [['package.json', 7, 7], ['package-lock.json', 120, 96], ['service/server/package.json', 3, 3]], tests: [['회귀 테스트(qa-squad)', '18/42 진행 중']],
        rollback: 'PR 되돌리기(revert) · rollback_ref r-0414', ok: false,
        appr: [{ role: '개발 총괄', done: false }] }
    ],
    quota: { pr: [1, 2], gh: [2, 6] },
    thr: [
      { id: 'T-1', date: '11-24', src: 'OSV MAL-', v: 'hit', title: 'npm 악성 패키지 경보(타이포스쿼팅)', note: 'lockfile에는 없으나 최근 72시간 신규 패키지 검토 대상입니다. 즉시 P0로 분류합니다.' },
      { id: 'T-2', date: '11-23', src: 'KISA', v: 'part', title: '보호나라 보안 공지(11-23)', note: '키워드 \'Node.js\' 매칭 · 버전 정보 확인이 필요합니다.' },
      { id: 'T-3', date: '11-22', src: 'GCP', v: 'none', title: 'GCP-2026-090', note: '디디쌤이 사용하지 않는 서비스입니다(근거: 구성 목록에 없음).' },
      { id: 'T-4', date: '11-20', src: '개인정보위', v: 'ctrl', title: '에듀테크 개인정보 점검 결과 발표', note: '접속기록 보관 · 관리자 권한 항목을 규제 카드로 점검합니다.' },
      { id: 'T-5', date: '11-11', src: 'Node.js', v: 'hit', title: 'Node.js 보안 릴리스(11-11)', note: 'Dockerfile의 Node 버전이 영향 범위에 포함됩니다. 버전 상향 PR을 준비합니다.', finding: 'P1' },
      { id: 'T-6', date: '10-28', src: 'ATLAS', v: 'part', title: 'AML.T0143 LLM Prompt Propagation(v2026.10)', note: 'AI SAM 문서 요약 결과가 다른 도구로 전달되는 경로가 있습니다. 사람 확인이 필요합니다.', card: 'CARD-0012' }
    ],
    cards: [
      { id: 'CARD-0012', v: 'part', ver: 2, state: '운영 중', title: 'LLM Prompt Propagation (AML.T0143)', src: 'MITRE ATLAS v2026.10 · 2026-10-28', kind: '간접 프롬프트 인젝션',
        reuse: 3, checked: '11-21', review: 'D-63', judge: 'AI SAM 문서 요약 결과가 다른 도구로 전달되는 경로가 있습니다. 판정: 키워드 매칭 → 사람 확인(개발 총괄 11-20)',
        map: ['AI SAM', 'LLM01', 'ASI01', 'ATLAS AML.T0143'], rule: 'rule: plan.source == "external"\n    and tool.grade >= 2\naction: block + alert(#ai-security)',
        control: 'SKILL 2-1(도구 등급화 · 사람 확인)을 서버 정책으로 강제합니다. 외부 출처 기반 계획은 2등급(외부 발송) 이상을 만들지 않습니다.',
        test: 'promptfoo · 숨은 지시 PDF 요약 후 발송 요청 → 차단 · 통과 12/12 · 정상 질문 5종 오탐 0건', skills: ['didisam-mcp-guide 4', 'edu-platform-security 14'],
        hist: [['10-29', '카드 생성 · 판정 \'일부\''], ['11-20', '탐지 규칙 반영(주간 통합 PR #409)'], ['11-21', '레드팀 회귀 · 숨은 지시 3종 차단'], ['02-18', '90일 재검토 예정']] }
    ],
    kill: { mode: 'dry', dday: 9, ttlMin: 240, cap: { used: 0, max: 3 },
      kinds: [
        { k: 'key_disable', n: '키 비활성', trig: '운영 키 실값 노출, 지역 급변 + 비용 급증', safe: '비활성만(삭제 금지) · 재발급은 사람', today: 0 },
        { k: 'feature_off', n: '기관 기능 끄기', trig: 'AI 사용량 급증, MCP 해시 변경', safe: '기관 단위 · 4시간 후 자동 복구', today: 1 },
        { k: 'egress_block', n: '외부 전송(egress) 차단', trig: '미등록 도메인 전송 반복', safe: '독립 신호 2개 필요', today: 0 }],
      active: [{ id: 'K-7', action: 'feature_off', tenant: '시연 기관 B', reason: 'AI 토큰 1시간 사용량이 7일 평균의 5배', leftMin: 133, dry: true }],
      log: [['11-24 02:14', '기관 기능 끄기 → AI 한도 축소', '시연 기관 B', 'AI 토큰 1시간 7일 평균의 5배', '사람 확인'], ['11-21 23:40', 'egress 차단', '시연 기관 A', '신호 1개(조건 미충족)', '미발동']] },
    audit: [
      { at: '11-24 09:42', who: '개발 총괄', what: 'PR #412 코드 리뷰 승인', hash: '9f1c…a2', prev: '41be…07' },
      { at: '11-24 06:00', who: '가디언', what: '정기 스캔 완료 · Finding 2건 갱신', hash: '41be…07', prev: 'c03d…5e' },
      { at: '11-24 02:14', who: '규칙 엔진', what: '긴급 차단(모의) 기관 기능 끄기 · 시연 기관 B', hash: 'c03d…5e', prev: '7aa0…19' }
    ]
  };
  const DS = JSON.parse(JSON.stringify(DEMO));
  const kName = k => ({ key_disable: '키 비활성', feature_off: '기관 기능 끄기', egress_block: '외부 전송 차단' }[k] || k);

  /* ── 실서버 데이터 ── */
  const URL = { sum: '/api/security/summary', fin: '/api/security/findings', prs: '/api/security/prs', thr: '/api/security/threats', cards: '/api/security/cards', kill: '/api/security/kill', audit: '/api/security/audit' };
  const L = { sum: null, fin: null, prs: null, thr: null, cards: null, kill: null, audit: null, busy: {}, err: {} };
  async function load(k, again) {
    if (!live() || (L.busy[k] && !again)) return; L.busy[k] = true;
    try { const j = await api('GET', URL[k]); L[k] = j; L.err[k] = ''; }
    catch (e) { L.err[k] = e.status === 403 ? '산타 관리자만 볼 수 있습니다.' : e.status === 404 ? '서버에 아직 연결되지 않은 화면입니다(미연결).' : (e.message || '불러오지 못했습니다.'); L[k] = L[k] || {}; }
    if (CUR && CUR.tab === 'security') render();
  }
  const get = k => { if (!live()) return DS[k]; if (L[k] == null) { load(k); return null; } return L[k]; };
  const wait = k => L.err[k] ? `<div class="empty">${esc(L.err[k])}</div>` : '<div class="empty" role="status">보안 정보를 불러오는 중입니다…</div>';
  const normPrs = d => arr(d && d.items ? d.items : d).map(p => ({ ...p, appr: arr(p.appr || p.approvals), files: arr(p.files), tests: arr(p.tests), plain: arr(p.plain) }));

  /* ── 공통 머리 ── */
  const MAIN = [['home', '보안 홈'], ['board', '취약점'], ['prs', '수정 PR'], ['feed', '위협 인텔']];
  const MORE = [['cards', '대책 카드'], ['kill', '긴급 차단 · 설정'], ['audit', '감사 기록']];
  function nav(cur) {
    const inMore = MORE.some(x => x[0] === cur);
    return `<div class="sec-nav">${tabs('sec', MAIN, inMore ? '' : cur)}<details class="sec-more"${inMore ? ' open' : ''}><summary>더 보기${inMore ? ' · ' + esc(MORE.find(x => x[0] === cur)[1]) : ''} ▾</summary><div class="sec-more-l">${MORE.map(([k, l]) => `<button class="chip ${k === cur ? 'on' : ''}" data-act="tab" data-key="sec" data-v="${k}">${esc(l)}</button>`).join('')}</div></details></div>`;
  }
  const demoNote = () => live() ? '' : '<p class="sec-demo">시연 화면입니다. 수치 · 취약점 · 기관명은 가상값이며 실제 CVE 번호는 CVE-2026-XXXXX로 표기합니다.</p>';

  /* ① 보안 홈 */
  function vHome() {
    const s = get('sum'); if (!s) return wait('sum');
    const P = s.p || {}; const st = s.state === 'bad' ? ['위험', 'bad'] : s.state === 'warn' ? ['주의', 'warn'] : ['정상', 'ok'];
    const prs = live() ? normPrs(get('prs') || []) : DS.prs; const pend = prs.filter(p => !p.merged && p.state !== 'approved' && p.state !== 'rejected');
    const todo = arr(s.todo).length ? arr(s.todo) : (live() ? [] : [
      { sev: 'High', t: `express 취약점 수정 PR — 검증 통과 42/42`, d: '학습자 API · CVE-2026-XXXXX · SLA 남은 시간 2일 4시간', act: 'prs', v: 412, b: '검토하기' },
      { sev: 'Medium', t: 'CSP 헤더 누락 1건', d: '학습자 사이트 /lesson · ZAP baseline(스테이징)', act: 'board', b: '보기' },
      { sev: '대책 카드', t: 'CARD-0012 회귀 테스트 통합 PR — 주 1회 묶음', d: 'promptfoo 숨은 지시 PDF 요약 후 발송 요청 → 차단 확인', act: 'cards', b: '보기' }]);
    const thr = arr(s.threats).length ? arr(s.threats) : (live() ? [] : DS.thr.slice(0, 3));
    const gauge = Math.max(0, Math.min(100, +s.score || 0));
    return `<div class="sec-status ${st[1]}" role="status"><span class="dot"></span><b>${st[0]}</b><span>마지막 점검 ${esc(s.last || '—')}</span>${s.killMode === 'live' ? tag('긴급 차단 실가동', 'r') : tag('긴급 차단 dry-run')}</div>
    <div class="sec-kpis">
      <div class="sec-kpi sec-score"><small>보안 점수</small><div class="sec-ring" style="--v:${gauge}"><b>${nf(gauge)}</b><span>/ 100</span></div>${s.delta != null ? `<em>지난주보다 ${+s.delta >= 0 ? '▲' : '▼'}${Math.abs(+s.delta)}</em>` : ''}</div>
      <div class="sec-kpi"><small>고위험 미해결</small><b class="n">${nf(s.high)}</b><span>Critical · High · SLA 초과 ${nf(s.slaOver)}</span></div>
      <div class="sec-kpi"><small>승인 대기 수정 PR</small><b class="n">${nf(s.prPending != null ? s.prPending : pend.length)}</b><span>검증 통과 ${pend.filter(p => p.ok).length}</span></div>
      <div class="sec-kpi"><small>미해결 우선순위</small><div class="sec-p">${['P0', 'P1', 'P2', 'P3'].map(k => `<span class="${k === 'P0' && +P[k] ? 'hot' : ''}"><i>${k}</i><b class="n">${nf(P[k])}</b></span>`).join('')}</div></div>
      <div class="sec-kpi"><small>평균 탐지 MTTD</small><b class="n">${s.mttd != null ? esc(s.mttd) + '시간' : '—'}</b><span>목표 4시간 이내</span></div>
      <div class="sec-kpi"><small>Critical 패치 MTTR</small><b class="n">${s.mttr != null ? esc(s.mttr) + '시간' : '—'}</b><span>목표 24시간 이내</span></div>
    </div>
    <section class="sec-box"><div class="sec-bh"><h3>지금 할 일</h3><button class="btn sm ghost" data-act="tab" data-key="sec" data-v="board">전체 보기 ›</button></div>
      ${todo.length ? `<ul class="sec-todo">${todo.slice(0, 3).map(x => `<li>${SEV[x.sev] ? sv(x.sev) : `<span class="sec-sv l">${esc(x.sev || '')}</span>`}<div><b>${esc(x.t || x.title)}</b><small>${esc(x.d || x.desc || '')}</small></div><button class="btn sm ${x.act === 'prs' ? 'pri' : ''}" data-act="sec-go" data-v="${esc(x.act || 'board')}" data-id="${esc(x.v || '')}">${esc(x.b || '보기')}</button></li>`).join('')}</ul>` : `<div class="empty">확인할 보안 이슈가 없습니다. 마지막 점검: ${esc(s.last || '—')}</div>`}</section>
    <section class="sec-box"><div class="sec-bh"><h3>오늘의 위협 ${thr.length}</h3><small>${['hit', 'part', 'none'].map(v => `${VER[v][0]} ${thr.filter(x => x.v === v).length}`).join(' · ')}</small></div>
      ${thr.length ? `<div class="sec-thr3">${thr.slice(0, 3).map(x => `<div class="sec-tc">${vd(x.v)} ${src(x.src)}<b>${esc(x.title)}</b><small>${esc(x.note || '')}</small></div>`).join('')}</div>` : '<div class="empty">오늘 수집된 위협이 없습니다.</div>'}</section>
    ${demoNote()}`;
  }

  /* ② 취약점 보드 */
  function vBoard() {
    const d = get('fin'); if (!d) return wait('fin');
    const all = arr(d); const f = UI.secF || (UI.secF = { sev: '', comp: '', q: '', view: 'board' });
    const comps = [...new Set(all.map(x => x.comp).filter(Boolean))];
    const L0 = all.filter(x => (!f.sev || x.sev === f.sev) && (!f.comp || x.comp === f.comp) && (!f.q || `${x.title} ${x.comp} ${x.cve || ''}`.toLowerCase().includes(f.q.toLowerCase())));
    const open = all.filter(x => !['fix', 'na'].includes(x.status)).length;
    const card = x => { const hot = x.slaH > 0 && x.slaH <= 72 && !['fix', 'na'].includes(x.status); return `<button class="sec-fc${hot ? ' hot' : ''}" data-act="sec-fin" data-v="${esc(x.id)}"><span class="r1">${sv(x.sev)}<b class="n">${nf(x.score)}점</b></span><b>${esc(x.title)}</b><small>${esc(x.comp || '')}</small><span class="r2">${src(x.src || '')}${x.slaH > 0 && !['fix', 'na'].includes(x.status) ? `<span class="sla">${ic('clock', 14)} ${hm(x.slaH)}</span>` : ''}</span></button>`; };
    const bar = `<div class="sec-fbar"><label><span class="sr">심각도</span><select data-chg="sec-f" data-k="sev"><option value="">심각도: 전체</option>${Object.keys(SEV).map(s => `<option ${f.sev === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label><span class="sr">구성 요소</span><select data-chg="sec-f" data-k="comp"><option value="">구성 요소: 전체</option>${comps.map(c => `<option ${f.comp === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><input type="search" data-chg="sec-f" data-k="q" value="${esc(f.q)}" placeholder="제목 · CVE · 패키지 검색" aria-label="취약점 검색"><span class="sec-cnt">열린 취약점 <b class="n">${open}</b></span><div class="seg2" role="tablist"><button class="${f.view !== 'table' ? 'on' : ''}" data-act="sec-view" data-v="board">보드</button><button class="${f.view === 'table' ? 'on' : ''}" data-act="sec-view" data-v="table">표</button></div></div>`;
    let body;
    if (!all.length) body = '<div class="empty">열린 취약점이 없습니다.</div>';
    else if (f.view === 'table') body = table(['심각도', '점수', '제목', '구성 요소', '상태', 'SLA'], L0.map(x => [sv(x.sev), nf(x.score), `<button class="lnk" data-act="sec-fin" data-v="${esc(x.id)}">${esc(x.title)}</button>`, esc(x.comp || ''), esc((COLS.find(c => c[0] === x.status) || [, x.status])[1]), x.slaH > 0 ? hm(x.slaH) : '—']), '조건에 맞는 취약점이 없습니다.');
    else body = `<div class="sec-kan">${COLS.map(([k, l]) => { const C = L0.filter(x => x.status === k); const inner = C.length ? C.map(card).join('') : '<p class="mini">없음</p>'; return k === 'na' ? `<details class="sec-col na"><summary><b>${l}</b><em>${C.length}</em></summary><p class="mini">판정 근거와 함께 접어 둡니다. 오탐 판정은 대책 카드에 학습합니다.</p>${inner}</details>` : `<div class="sec-col"><div class="ch"><b>${l}</b><em>${C.length}</em></div>${inner}</div>`; }).join('')}</div>`;
    return bar + body + `<p class="sec-formula"><b>우선순위 점수</b> CVSS×3 + EPSS 백분위×25 + KEV 20 + 노출도 15 + 민감도 10 · <b>KEV + 운영 도달 = 무조건 P0</b> · SLA P0 24시간 · P1 7일 · P2 30일 · P3 분기</p>` + demoNote();
  }
  function finModal(id) {
    const all = arr(get('fin')); const x = all.find(y => String(y.id) === String(id)); if (!x) return;
    modal(`${x.id} · ${x.title}`, `<div class="sec-kv"><span>심각도</span>${sv(x.sev)}<span>우선순위</span><b>${nf(x.score)}점</b><span>구성 요소</span><b>${esc(x.comp || '')}</b><span>출처</span>${src(x.src || '')}${x.slaH > 0 ? `<span>SLA 남은 시간</span><b>${hm(x.slaH)}</b>` : ''}</div>${x.note ? `<p class="mini">근거: ${esc(x.note)}</p>` : ''}
      <label class="fl">상태<select id="secFs">${COLS.map(([k, l]) => `<option value="${k}" ${x.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="fl">메모(해당 없음은 근거 필수)<input id="secFn" maxlength="200" value=""></label>`,
      [{ id: 'c', label: '닫기' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const st = w.querySelector('#secFs').value, note = w.querySelector('#secFn').value.trim().slice(0, 200); if (st === 'na' && !note) { toast('해당 없음은 근거를 적어야 합니다.', 'warn'); return false; } finSave(x, st, note); } }]);
  }
  async function finSave(x, status, note) {
    if (live()) { try { await api('PATCH', `/api/security/findings/${encodeURIComponent(x.id)}`, { status, note }); toast('저장했습니다. 서버에 기록되었습니다.', 'ok'); load('fin', true); } catch (e) { toast(e.message, 'warn'); } return; }
    x.status = status; if (note) x.note = note; audit(`Finding ${x.id} 상태 → ${(COLS.find(c => c[0] === status) || [])[1]}`); render(); toast('저장했습니다.', 'ok');
  }

  /* ③ 수정 PR 승인함 */
  function apprLine(p) { const n = need(p.sev); const done = p.appr.filter(a => a.done).length; return `${done}/${n} 승인`; }
  function vPrs() {
    const d = get('prs'); if (!d) return wait('prs');
    const L0 = live() ? normPrs(d) : DS.prs; const q = live() ? (d.quota || null) : DS.quota;
    const sel = L0.find(p => String(p.id) === String(UI.secPr)) || L0[0];
    const stTxt = p => p.state === 'approved' ? '승인 완료 · 병합 대기' : p.state === 'rejected' ? '반려됨' : !p.ok ? '검증 중' : p.appr.some(a => a.role === '개발 총괄' && a.done) ? '검증 통과 · 리뷰 완료' : '검증 통과 · 리뷰 대기';
    const list = L0.length ? `<ul class="sec-prl">${L0.map(p => `<li><button class="${sel && p.id === sel.id ? 'on' : ''}" data-act="sec-pr" data-v="${esc(p.id)}">${sv(p.sev)} <b>#${esc(p.id)}</b><span>${esc(p.title)}</span><small>${esc(stTxt(p))} · ${apprLine(p)}</small></button></li>`).join('')}</ul>` : '<div class="empty">승인을 기다리는 수정 PR이 없습니다.</div>';
    const head2 = `<div class="sec-bh"><h3>수정 PR 승인함</h3>${q ? `<small>자동 PR 오늘 ${q.pr[0]}/${q.pr[1]}건 · GitHub 쓰기 ${q.gh[0]}/${q.gh[1]}</small>` : ''}</div>`;
    if (!sel) return head2 + list + demoNote();
    const n = need(sel.sev); const can = sel.ok && !['approved', 'rejected'].includes(sel.state);
    const det = `<article class="sec-prd" aria-label="PR #${esc(sel.id)} 상세"><div class="sec-tags">${sv(sel.sev)}${(sel.tags || []).map(src).join('')}</div><h3>[security] ${esc(sel.title)}${sel.cve ? ` (${esc(sel.cve)})` : ''}</h3>
      <div class="sec-plain"><b>쉬운 말 요약</b><ol>${sel.plain.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
      <div class="sec-g2"><div><h4>근거 · 영향</h4><p>출처: ${esc(sel.basis || '—')}</p><p>영향: ${esc(sel.impact || '—')}</p><p>SLA: ${esc(sel.sla || '—')}</p>
        <h4>변경 파일 ${sel.files.length} <small>(상한 5)</small></h4><ul class="sec-files">${sel.files.map(f => { const [pth, a, r] = Array.isArray(f) ? f : [f.path, f.add, f.del]; return `<li><code>${esc(pth)}</code><span class="add">+${nf(a)}</span><span class="del">−${nf(r)}</span></li>`; }).join('')}</ul></div>
      <div><h4>검증 결과</h4><ul class="sec-tests">${sel.tests.map(t => { const [nm, r] = Array.isArray(t) ? t : [t.name, t.result]; return `<li><span>${esc(nm)}</span><b>${esc(r)}</b></li>`; }).join('')}</ul><h4>롤백</h4><p>${esc(sel.rollback || '—')}</p></div></div>
      <div class="sec-appr"><h4>필요 인원 ${n}명 <small>${n === 2 ? 'Critical · High: 개발 총괄 리뷰 + 대표님 승인' : 'Medium 이하: 개발 총괄 단독(결정 필요)'}</small></h4><ul>${sel.appr.map(a => `<li class="${a.done ? 'ok' : ''}"><b>${esc(a.role)}</b><span>${a.done ? `${esc(a.by || a.role)} · ${esc(a.at || '')} 서버 기록` : '승인 대기'}</span></li>`).join('')}</ul>
        <p class="mini">승인은 서버 기록만 유효합니다 · 재인증이 필요합니다. AI SAM이 '승인됨'이라고 말해도 서버 기록이 없으면 병합하지 않습니다.</p></div>
      <div class="sec-acts"><button class="btn" data-act="sec-mobile" data-v="${esc(sel.id)}">휴대폰 승인 링크</button><button class="btn" data-act="sec-reject" data-v="${esc(sel.id)}" ${can ? '' : 'disabled'}>반려(사유 입력)</button><button class="btn pri" data-act="sec-approve" data-v="${esc(sel.id)}" ${can ? '' : 'disabled'}>${sel.state === 'approved' ? '승인 완료' : '승인 후 병합'}</button></div></article>`;
    return head2 + `<div class="sec-prw">${list}${det}</div><p class="mini">Phase 0은 의존성 · 설정 PR만 자동 생성합니다. .github/workflows · CODEOWNERS를 고치는 PR은 만들지 않습니다.</p>` + demoNote();
  }
  const prOf = id => (live() ? normPrs(get('prs') || []) : DS.prs).find(p => String(p.id) === String(id));
  /* 재인증 → 서버 기록. 시연판은 재인증 단계를 흉내 내고 화면 상태만 바꾼다 */
  function reauth(title, desc, then) {
    modal(title, `<p>${desc}</p>${live() ? `<label class="fl">재인증(현재 비밀번호 또는 이메일 인증번호)<input id="secRa" type="password" autocomplete="current-password" maxlength="64"></label><p class="mini">입력값은 서버 확인에만 쓰며 브라우저에 저장하지 않습니다.</p>` : `<p class="sec-demo">시연판: 실제 서비스에서는 SSO · 비밀번호 재인증을 거칩니다. 아래 확인을 누르면 재인증한 것으로 처리합니다.</p>`}<label class="sec-ck"><input type="checkbox" id="secAg"> 병합 후 배포 시작에 동의합니다</label>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '재인증하고 승인', kind: 'pri', run: w => { const ag = w.querySelector('#secAg').checked; const ra = live() ? (w.querySelector('#secRa').value || '') : 'demo'; if (!ag) { toast('배포 시작 동의에 체크해 주십시오.', 'warn'); return false; } if (!ra) { toast('재인증이 필요합니다.', 'warn'); return false; } then(ra); } }]);
  }
  async function approve(id, ra, cb) {
    const p = prOf(id); if (!p) return;
    if (live()) {
      try { const r = await api('POST', `/api/security/prs/${encodeURIComponent(id)}/approve`, { reauth: ra }); const st = (r && (r.status || r.state)) || ''; toast(st === 'pending' ? '승인을 서버에 기록했습니다. 필요 인원이 모자라 다른 승인자를 기다립니다.' : '승인을 서버에 기록했습니다.', 'ok'); load('prs', true); load('sum', true); cb && cb(st || 'approved'); }
      catch (e) { toast(e.status === 401 || e.status === 403 ? '재인증에 실패했거나 권한이 없습니다. 승인은 기록되지 않았습니다.' : e.message, 'warn'); cb && cb('fail'); }
      return;
    }
    const slot = p.appr.find(a => !a.done && a.role === '대표님') || p.appr.find(a => !a.done);
    if (slot) Object.assign(slot, { done: true, by: S.me.name || slot.role, at: now().slice(6) });
    const done = p.appr.filter(a => a.done).length; p.state = done >= need(p.sev) && p.appr.every(a => a.done) ? 'approved' : 'pending';
    audit(`PR #${p.id} 승인(재인증) · ${done}/${need(p.sev)}`); render();
    toast(p.state === 'approved' ? '승인을 기록했습니다. 병합 · 배포 · 재스캔이 이어집니다.' : `승인을 기록했습니다(${done}/${need(p.sev)}). 남은 승인자를 기다립니다.`, 'ok'); cb && cb(p.state);
  }
  ACT['sec-approve'] = el => { if (!own()) { toast('산타 관리자만 승인할 수 있습니다.', 'warn'); return; } const p = prOf(el.dataset.v); if (!p || !p.ok) { toast('검증을 통과한 PR만 승인할 수 있습니다.', 'warn'); return; } reauth(`PR #${p.id} 승인`, `<b>${esc(p.title)}</b>을(를) 승인합니다. 필요 인원 ${need(p.sev)}명 · 현재 ${apprLine(p)}.`, ra => approve(p.id, ra)); };
  ACT['sec-reject'] = el => { const p = prOf(el.dataset.v); if (!p) return; modal(`PR #${p.id} 반려`, `<label class="fl">반려 사유(필수)<textarea id="secRj" maxlength="300" rows="3"></textarea></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '반려', kind: 'pri', run: w => { const why = w.querySelector('#secRj').value.trim(); if (!why) { toast('반려 사유를 적어 주십시오.', 'warn'); return false; } reject(p, why); } }]); };
  async function reject(p, why) {
    if (live()) { try { await api('POST', `/api/security/prs/${encodeURIComponent(p.id)}/reject`, { reason: why }); toast('반려를 서버에 기록했습니다.', 'ok'); load('prs', true); } catch (e) { toast(e.status === 404 ? '반려 기록 API가 아직 없습니다. GitHub PR에 사유를 남겨 주십시오.' : e.message, 'warn'); } return; }
    p.state = 'rejected'; audit(`PR #${p.id} 반려: ${why.slice(0, 60)}`); render(); toast('반려했습니다.', 'ok');
  }

  /* ⑦ 휴대폰 1탭 승인 — 1회용 링크 15분 */
  const M = { id: null, exp: 0, step: 'auth', timer: 0, tok: '' };
  async function mobileOpen(id, tok, expAt) {
    M.id = id; M.tok = tok || ''; M.step = 'auth'; M.exp = expAt || Date.now() + 15 * 60e3;
    if (live() && !tok) { try { const r = await api('POST', '/api/security/approve-link', { pr: id }); M.tok = r.token || ''; M.exp = r.exp ? +new Date(r.exp) : M.exp; M.url = r.url || ''; } catch (e) { toast(e.message, 'warn'); return; } }
    mobileDraw(); clearInterval(M.timer); M.timer = setInterval(() => { const t = document.getElementById('secMt'); if (!t) { clearInterval(M.timer); return; } if (Date.now() >= M.exp) { mobileDraw(); clearInterval(M.timer); return; } t.textContent = left(); }, 1000);
  }
  const left = () => { const s = Math.max(0, Math.round((M.exp - Date.now()) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} 남음`; };
  function mobileDraw() {
    let w = document.getElementById('secM'); if (!w) { w = document.createElement('div'); w.id = 'secM'; w.className = 'sec-m'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', '보안 승인'); document.body.appendChild(w); }
    const p = prOf(M.id); const exp = Date.now() >= M.exp;
    let body;
    if (exp) body = `<div class="sec-m-x"><b>승인 링크가 만료되었습니다</b><p>1회용 링크는 15분 동안만 쓸 수 있습니다. 스튜디오 승인함에서 다시 요청해 주십시오.</p></div>`;
    else if (!p) body = '<div class="sec-m-x"><b>승인할 PR을 찾지 못했습니다</b><p>이미 처리되었거나 링크가 잘못되었습니다.</p></div>';
    else if (M.step === 'auth') body = `<div class="sec-m-c">${sv(p.sev)} <b>#${esc(p.id)}</b><h3>${esc(p.title)}</h3><p>승인하려면 먼저 본인 확인(재인증)이 필요합니다.</p></div>${live() ? '<label class="fl">현재 비밀번호 또는 이메일 인증번호<input id="secMra" type="password" autocomplete="current-password" maxlength="64"></label>' : '<p class="sec-demo">시연판: 실제 서비스에서는 SSO 재인증 화면이 열립니다.</p>'}<button class="btn pri sec-m-b" data-act="sec-m-auth">재인증</button>`;
    else if (M.step === 'done') body = `<div class="sec-m-x ok"><b>${p.state === 'approved' ? '승인을 서버에 기록했습니다' : '승인을 기록했습니다 · 다른 승인자를 기다립니다'}</b><p>${apprLine(p)} · 병합 후 배포와 재스캔이 이어집니다.</p></div>`;
    else body = `<div class="sec-m-ok">재인증 완료</div><div class="sec-m-c">${sv(p.sev)} <b>#${esc(p.id)}</b><h3>${esc(p.title)}</h3><ol>${p.plain.map(t => `<li>${esc(t)}</li>`).join('')}</ol><ul class="sec-m-a">${p.appr.map(a => `<li class="${a.done ? 'ok' : ''}">${esc(a.role)} ${a.done ? '승인 완료' : '승인 대기'}</li>`).join('')}</ul></div><label class="sec-ck sec-m-ck"><input type="checkbox" id="secMag"> 병합 후 배포 시작에 동의합니다</label><button class="btn pri sec-m-b" data-act="sec-m-go" ${p.ok ? '' : 'disabled'}>승인하고 병합</button><button class="btn sec-m-b" data-act="sec-m-close">반려 · 자세히는 스튜디오에서</button>`;
    w.innerHTML = `<div class="sec-m-in"><header><button class="sec-m-bk" data-act="sec-m-close" aria-label="닫기">‹</button><b>디디쌤 스튜디오 · 보안 승인</b></header>${body}<footer><span>1회용 링크</span><b id="secMt" class="${exp ? 'bad' : ''}">${exp ? '만료됨' : left()}</b><small>재인증 없는 승인과 서버 기록 없는 승인은 무효입니다.</small></footer></div>`;
  }
  ACT['sec-mobile'] = el => { if (!own()) { toast('산타 관리자만 승인할 수 있습니다.', 'warn'); return; } mobileOpen(el.dataset.v); };
  ACT['sec-m-close'] = () => { clearInterval(M.timer); const w = document.getElementById('secM'); if (w) w.remove(); };
  ACT['sec-m-auth'] = () => { if (Date.now() >= M.exp) return mobileDraw(); if (live()) { const v = (document.getElementById('secMra') || {}).value || ''; if (!v) { toast('재인증이 필요합니다.', 'warn'); return; } M.ra = v; } else M.ra = 'demo'; M.step = 'ok'; mobileDraw(); };
  ACT['sec-m-go'] = () => { if (Date.now() >= M.exp) return mobileDraw(); if (!(document.getElementById('secMag') || {}).checked) { toast('배포 시작 동의에 체크해 주십시오.', 'warn'); return; } const ra = M.tok ? { token: M.tok, secret: M.ra } : M.ra; M.ra = ''; approve(M.id, ra, st => { if (st !== 'fail') { M.step = 'done'; M.exp = Math.min(M.exp, Date.now() + 5e3); } mobileDraw(); }); };
  /* 알림 카드의 링크: index.html#sec-approve=<PR>.<token> */
  function hashOpen() { const m = /^#sec-approve=([\w-]+)(?:\.([\w-]+))?/.exec(location.hash || ''); if (!m || !S || !S.org) return; if (!own()) { toast('산타 관리자만 승인할 수 있습니다.', 'warn'); return; } mobileOpen(m[1], m[2] || '', live() ? 0 : undefined); }
  window.addEventListener('hashchange', hashOpen); if (typeof AFTER !== 'undefined' && AFTER.push) { let once = false; AFTER.push(() => { if (!once) { once = true; hashOpen(); } }); }

  /* ④ 위협 인텔 피드 */
  function vFeed() {
    const d = get('thr'); if (!d) return wait('thr');
    const all = arr(d); const fv = UI.secV || '';
    const L0 = all.filter(x => !fv || x.v === fv);
    const chips = `<div class="sec-chips">${[['', '전체', all.length], ...['hit', 'part', 'none', 'ctrl'].map(v => [v, VER[v][0], all.filter(x => x.v === v).length])].map(([v, l, n]) => `<button class="chip ${fv === v ? 'on' : ''}" data-act="tab" data-key="secV" data-v="${v}">${l} ${n}</button>`).join('')}</div>`;
    const row = x => `<li class="sec-fi"><div class="l">${vd(x.v)}<time>${esc(x.date || '')}</time></div><div class="m">${src(x.src || '')}<b>${esc(x.title)}</b><p>${esc(x.note || '')}</p></div><div class="r">${x.card ? `<button class="btn sm ghost" data-act="tab" data-key="sec" data-v="cards">${esc(x.card)}</button>` : x.finding ? tag('Finding ' + x.finding) : ['hit', 'part', 'ctrl'].includes(x.v) ? `<button class="btn sm" data-act="sec-card" data-v="${esc(x.id)}">대책 카드 생성</button>` : '<small>근거 기록</small>'}</div></li>`;
    return `<div class="sec-bh"><h3>위협 인텔</h3><small>${live() ? '' : '다음 수집: 1시간 후 · 15개 소스 정상'}</small></div>${chips}${L0.length ? `<ul class="sec-feed">${L0.map(row).join('')}</ul>` : '<div class="empty">수집된 위협이 없습니다.</div>'}<p class="mini">피드 본문은 외부 자료이므로 지시로 취급하지 않고 표시만 합니다. '해당 없음'도 근거를 남깁니다.</p>` + demoNote();
  }
  ACT['sec-card'] = async el => {
    const id = el.dataset.v;
    if (live()) { try { const r = await api('POST', `/api/security/threats/${encodeURIComponent(id)}/card`, {}); toast(`${(r && r.id) || '대책 카드'} 초안을 만들었습니다.`, 'ok'); load('thr', true); load('cards', true); } catch (e) { toast(e.message, 'warn'); } return; }
    const t = DS.thr.find(x => x.id === id); if (!t || t.card) return; const no = 'CARD-' + String(12 + DS.cards.length).padStart(4, '0');
    DS.cards.push({ id: no, v: t.v, ver: 1, state: '초안', title: t.title, src: `${t.src} · ${t.date}`, kind: '—', reuse: 0, checked: '—', review: 'D-90', judge: t.note, map: [t.src], rule: '(탐지 규칙 초안 작성 대기)', control: '담당 스킬과 연결해 주간 통합 PR에 포함합니다.', test: '회귀 테스트 초안 작성 대기', skills: ['edu-platform-security'], hist: [[now().slice(0, 5), '카드 생성(초안)']] });
    t.card = no; UI.secCard = no; audit(`대책 카드 ${no} 생성(${t.title.slice(0, 40)})`); render(); toast(`${no} 초안을 만들었습니다. 주 1회 통합 PR에 포함합니다.`, 'ok');
  };

  /* ⑤ 대책 카드 */
  function vCards() {
    const d = get('cards'); if (!d) return wait('cards');
    const all = arr(d); if (!all.length) return '<div class="empty">처리한 사건이 대책 카드로 쌓입니다.</div>';
    const c = all.find(x => x.id === UI.secCard) || all[0];
    const pick = all.length > 1 ? `<div class="sec-chips">${all.map(x => `<button class="chip ${x.id === c.id ? 'on' : ''}" data-act="tab" data-key="secCard" data-v="${esc(x.id)}">${esc(x.id)}</button>`).join('')}</div>` : '';
    return pick + `<article class="sec-card"><div class="sec-ch"><div><span class="sec-tags"><b>${esc(c.id)}</b>${vd(c.v)}${tag(c.state || '')}${tag('v' + (c.ver || 1))}</span><h3>${esc(c.title)}</h3><small>출처: ${esc(c.src || '')} · 위협 유형: ${esc(c.kind || '')}</small></div><div class="sec-cm"><span><b class="n">${nf(c.reuse)}</b>재사용</span><span><b class="n">${esc(c.checked || '—')}</b>마지막 검증</span><span><b class="n">${esc(c.review || '—')}</b>90일 재검토</span></div></div>
      <div class="sec-g2"><section><h4>위협 · 영향 판정</h4><p>${esc(c.judge || '')}</p></section><section><h4>매핑</h4><p class="sec-tags">${arr(c.map).map(src).join('')}</p></section>
      <section><h4>탐지 규칙</h4><pre class="sec-pre">${esc(c.rule || '')}</pre></section><section><h4>방어 통제</h4><p>${esc(c.control || '')}</p></section>
      <section><h4>회귀 테스트</h4><p>${esc(c.test || '')}</p></section><section><h4>담당 스킬 · 반영 이력</h4><p class="sec-tags">${arr(c.skills).map(src).join('')}</p><ol class="sec-hist">${arr(c.hist).map(h => `<li><time>${esc(h[0])}</time>${esc(h[1])}</li>`).join('')}</ol></section></div></article>` + demoNote();
  }

  /* ⑥ 긴급 차단 · 설정 — 실행은 규칙 엔진(LLM 미개입), 화면은 해제만 */
  function vKill() {
    const k = get('kill'); if (!k) return wait('kill');
    const dry = (k.mode || k.killMode || 'dry') !== 'live'; const cap = k.cap || { used: 0, max: 3 }; const left = Math.max(0, (+cap.max || 3) - (+cap.used || 0));
    const kinds = arr(k.kinds).length ? arr(k.kinds) : [{ k: 'key_disable', n: '키 비활성' }, { k: 'feature_off', n: '기관 기능 끄기' }, { k: 'egress_block', n: '외부 전송(egress) 차단' }];
    const act = arr(k.active);
    return `<div class="sec-bh"><h3>긴급 차단 · 설정</h3><span class="sec-mode ${dry ? 'dry' : 'live'}">${dry ? `dry-run 중${k.dday != null ? ` · 실가동까지 D-${esc(k.dday)}` : ''}` : '실가동 중'}</span></div>
      <p class="sec-rule">TTL ${nf(k.ttlMin || 240)}분(${hm((+k.ttlMin || 240) / 60)}) · 오늘 남은 횟수 <b>${left} / ${nf(cap.max || 3)}회</b> · 실행 방식 규칙 엔진(LLM 미개입) · 해제는 사람만 · 삭제 · 결제 · 환불 자동 금지</p>
      <div class="sec-k3">${kinds.map(x => `<div class="sec-kc"><div class="h"><b>${esc(x.n || kName(x.k))}</b><span class="sec-mode ${dry ? 'dry' : 'live'}">${dry ? 'dry-run' : '실가동'}</span></div><p><small>트리거</small>${esc(x.trig || '—')}</p><p><small>안전장치</small>${esc(x.safe || '—')}</p><p><small>오늘 ${dry ? '모의 ' : ''}발동</small><b class="n">${nf(x.today)}건</b></p></div>`).join('')}</div>
      <section class="sec-box"><div class="sec-bh"><h3>진행 중인 차단 ${act.length}</h3></div>${act.length ? `<ul class="sec-act">${act.map(a => `<li><div><b>${esc(kName(a.action))}${a.dry ? ' (모의)' : ''}</b><span>${esc(a.tenant || '')} · ${esc(a.reason || '')}</span><small>${ic('clock', 14)} 자동 복구까지 ${hm((+a.leftMin || 0) / 60)}</small></div><button class="btn sm pri" data-act="sec-release" data-v="${esc(a.id)}">해제</button></li>`).join('')}</ul>` : '<div class="empty">진행 중인 차단이 없습니다.</div>'}<p class="mini">차단은 화면에서 켜지 않습니다. 정해진 신호가 오면 규칙 엔진이 실행하고, 해제는 사람이 이 화면에서 누릅니다.</p></section>
      <section class="sec-box"><div class="sec-bh"><h3>${dry ? 'dry-run 기록' : '차단 기록'}</h3></div>${table(['시각', dry ? '조치(모의)' : '조치', '대상', '근거', '판정'], arr(k.log).map(r => (Array.isArray(r) ? r : [r.at, r.action, r.tenant, r.reason, r.result]).map(x => esc(x))), '기록이 없습니다.')}</section>
      <section class="sec-box"><div class="sec-bh"><h3>알림 채널 · 보고 주기</h3></div><ul class="sec-ch2"><li>Slack #ai-security <small>${live() ? '서버 설정' : '미연결(웹훅 없음 → 서버 로그)'}</small></li><li>대표님 모바일(승인 카드)</li><li>Jira 보안 프로젝트</li><li>주말 · 공휴일 정기 보고 보내지 않음</li><li>Critical 주말 즉시 알림: 결정 전까지 꺼 둠</li></ul><p class="mini">자동 차단 정책 · 임계값 변경은 대표님 승인이 필요합니다.</p></section>` + demoNote();
  }
  ACT['sec-release'] = el => {
    if (!own()) { toast('산타 관리자만 해제할 수 있습니다.', 'warn'); return; }
    const id = el.dataset.v;
    modal('차단 해제', `<p>이 차단을 지금 해제합니다. 해제 기록(사람 · 시각 · 사유)은 서버 감사 기록에 남습니다.</p><label class="fl">해제 사유(필수)<input id="secRl" maxlength="200"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '해제', kind: 'pri', run: w => { const why = w.querySelector('#secRl').value.trim(); if (!why) { toast('해제 사유를 적어 주십시오.', 'warn'); return false; } release(id, why); } }]);
  };
  async function release(id, why) {
    if (live()) { try { await api('POST', `/api/security/kill/${encodeURIComponent(id)}/release`, { reason: why }); toast('해제를 서버에 기록했습니다.', 'ok'); load('kill', true); } catch (e) { toast(e.message, 'warn'); } return; }
    const a = DS.kill.active.find(x => x.id === id); if (!a) return; DS.kill.active = DS.kill.active.filter(x => x.id !== id);
    DS.kill.log.unshift([now(), `${kName(a.action)} 해제${a.dry ? '(모의)' : ''}`, a.tenant, why.slice(0, 60), `사람 해제 · ${S.me.name || '정운영자'}`]); audit(`긴급 차단 해제: ${kName(a.action)} · ${a.tenant}`); render(); toast('해제했습니다.', 'ok');
  }

  /* 감사 기록 — 해시 체인(prev_hash → hash) */
  function vAudit() {
    const d = get('audit'); if (!d) return wait('audit');
    const L0 = arr(d);
    return `<div class="sec-bh"><h3>감사 기록</h3><small>모든 보안 쓰기는 이전 기록의 해시를 이어 붙여 위변조를 확인합니다.</small></div>${table(['시각', '누가', '무엇을', '해시', '이전 해시'], L0.map(r => [esc(r.at), esc(r.who), esc(r.what), `<code>${esc(r.hash || '')}</code>`, `<code>${esc(r.prev || r.prev_hash || '')}</code>`]), '기록이 없습니다.')}` + demoNote();
  }
  function audit(what) { if (live()) return; DS.audit.unshift({ at: now(), who: (S && S.me && S.me.name) || '정운영자', what, hash: Math.random().toString(16).slice(2, 6) + '…' + Math.random().toString(16).slice(2, 4), prev: (DS.audit[0] || {}).hash || '' }); try { if (typeof logAudit === 'function') logAudit('보안: ' + what); } catch (e) { } }

  /* ── 화면 등록 ── */
  VIEWS.security = () => {
    if (!own()) return '<div class="empty">보안 화면은 산타 관리자만 볼 수 있습니다.</div>';
    let cur = UI.sec; if (![...MAIN, ...MORE].some(x => x[0] === cur)) cur = 'home';
    const B = { home: vHome, board: vBoard, prs: vPrs, feed: vFeed, cards: vCards, kill: vKill, audit: vAudit }[cur];
    return `<div class="sec">${head('', '디디쌤 가디언이 취약점 · 위협을 모아 판정하고, 수정은 PR로 만들어 사람 승인 뒤에만 병합합니다.', `<span class="sec-own">${ic('shield', 16)} 정운영자 전용</span>`)}${nav(cur)}${B()}</div>`;
  };
  ACT['sec-go'] = el => { const v = el.dataset.v; if (el.dataset.id) UI.secPr = el.dataset.id; UI.sec = v; render(); };
  ACT['sec-open'] = el => { UI.sec = (el && el.dataset && el.dataset.v) || 'home'; go('security'); };
  ACT['sec-pr'] = el => { UI.secPr = el.dataset.v; render(); };
  ACT['sec-fin'] = el => finModal(el.dataset.v);
  ACT['sec-view'] = el => { (UI.secF = UI.secF || { sev: '', comp: '', q: '', view: 'board' }).view = el.dataset.v; render(); };
  ACT['sec-f'] = el => { (UI.secF = UI.secF || { sev: '', comp: '', q: '', view: 'board' })[el.dataset.k] = String(el.value || '').slice(0, 60); render(); };

  /* ── AI SAM: '보안 상태 알려줘' — 서버 요약(또는 시연값)만으로 답하고, 피드 본문은 인용하지 않는다 ── */
  window.secSummaryText = () => {
    const s = live() ? L.sum : DS.sum; if (!s) return null;
    const prs = live() ? normPrs(L.prs || []) : DS.prs; const pend = prs.filter(p => !['approved', 'rejected'].includes(p.state));
    const thr = live() ? arr(s.threats) : DS.thr.slice(0, 3); const st = s.state === 'bad' ? '위험' : s.state === 'warn' ? '주의' : '정상';
    const P = s.p || {}; const r412 = pend.find(p => p.ok && p.appr.some(a => a.role === '개발 총괄' && a.done) && p.appr.some(a => !a.done));
    return { text: `현재 보안 상태는 ${st}입니다(보안 점수 ${nf(s.score)}점).\n· 고위험 미해결 ${nf(s.high)}건 · 미해결 P0 ${nf(P.P0)} · P1 ${nf(P.P1)} · P2 ${nf(P.P2)} · P3 ${nf(P.P3)}\n· 승인 대기 수정 PR ${nf(s.prPending != null ? s.prPending : pend.length)}건(검증 통과 ${pend.filter(p => p.ok).length})\n· 오늘의 위협 ${thr.length}건 중 해당 ${thr.filter(x => x.v === 'hit').length}건\n· 긴급 차단: ${s.killMode === 'live' ? '실가동' : 'dry-run'}${r412 ? `\n#${r412.id} ${r412.title} PR은 개발 총괄 리뷰가 끝나 대표님 승인만 남았습니다. 승인함을 열어 드릴까요?` : ''}`, btn: { act: 'sec-open', v: 'prs', label: '수정 PR 승인함 열기' } };
  };
  if (typeof answer === 'function') { const base = answer; answer = (q, ...r) => { const s = String(q || ''); /* eslint-disable-line no-global-assign */
    if (/(보안|가디언|취약점)/.test(s) && /(상태|현황|요약|알려|어때|점수|몇)/.test(s) && !/(만들|발송|보내|삭제)/.test(s)) {
      if (!own()) return { text: '보안 상태는 산타 관리자만 볼 수 있습니다.' };
      const t = window.secSummaryText(); if (t) return t;
      load('sum'); load('prs'); return { text: '보안 요약을 서버에서 불러오고 있습니다. 보안 홈을 열겠습니다.', nav: 'security' };
    }
    if (own() && CUR && CUR.tab === 'security' && UI.sec === 'feed' && /(해당돼|해당되|영향\s*있)/.test(s)) { const T = arr(live() ? L.thr : DS.thr).filter(x => x.v === 'hit' || x.v === 'part'); if (T.length) return { text: `디디쌤 영향: ${VER[T[0].v][0]} — ${T[0].title}\n판정 근거는 위협 인텔 화면에 기록되어 있습니다. 대책 카드를 만들어 탐지 규칙에 추가할 수 있습니다.` }; }
    return base(q, ...r); }; }
})();
