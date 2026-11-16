/* v43 공공기관 세부 유형(대표님 결정 2026-11-16, DECISIONS B1) — S.org.ed
   - citizen  시민 교육형: 주민 · 시민 강좌 신청 · 출석 · 수료(구청 평생학습관 · 시민대학 · 디지털 배움터)
   - facility 시설형: 체육 · 문화시설 — 시설 예약 · 강습 신청 · 회원 · 수납(시설관리공단 · 체육센터)
   - staff    직원 교육형: 공무원 · 직원 법정의무 · 직무교육(인재개발원). 법정의무교육은 이 유형에서만 보인다
   값이 없는 기존 공공 기관은 직원 교육형(하위 호환). 서버(Node · Java)는 기관 문서(tenant_state.doc)의 org.ed를 그대로 저장한다 — /api 변경 없음. 화면은 citizen|facility|staff 밖의 값을 직원 교육형으로 읽는다.
   용어(TERMS) · 메뉴 프리셋(PRESET.public_<ed>) · 기본 메뉴(slimEss) · 홈 위젯(dashx pub_c · pub_f) · AI 문구(EX · EXQ · REC) · 시연 데이터(SAMPLE · seed)를 세부 유형별로 나눈다.
   index.html에서 segments.js · ledger.js · fac.js 뒤, boot.js 앞. */
(function () {
  'use strict';
  if (typeof TYPES === 'undefined' || !TYPES.public) return;
  const EDS = ['citizen', 'facility', 'staff'];
  const PUB_ED = {
    citizen: { n: '시민 교육형', s: '주민 강좌 신청 · 출석 · 수료', ex: '평생학습관 · 시민대학 · 디지털 배움터' },
    facility: { n: '시설형', s: '시설 예약 · 강습 신청 · 회원 · 수납', ex: '시설관리공단 · 체육센터 · 문화센터' },
    staff: { n: '직원 교육형', s: '직원 법정의무 · 직무교육 · 실적 보고', ex: '인재개발원 · 지자체 · 공공기관' }
  };
  window.PUB_ED = PUB_ED;
  const pubEd = () => { try { if (S && S.org && S.org.type === 'public') return EDS.includes(S.org.ed) ? S.org.ed : 'staff'; if (typeof SU !== 'undefined' && SU.type === 'public' && EDS.includes(SU.ed)) return SU.ed; } catch (e) { } return 'staff'; };
  window.pubEd = pubEd;
  const isPub = () => !!(S && S.org && S.org.type === 'public');

  /* ── 이름 · 용어 ── */
  try { Object.defineProperty(TYPES.public, 'name', { configurable: true, enumerable: true, get() { return isPub() ? `공공기관(${PUB_ED[pubEd()].n})` : '공공기관'; } }); } catch (e) { }
  TYPES.public.desc = '시민 강좌 · 체육 · 문화시설 · 직원 교육 — 고르면 세부 유형을 정합니다';
  const T_STAFF = TERMS.public;
  const PT = {
    staff: T_STAFF,
    citizen: { learner: '수강생', cls: '강좌', group: '기수', teacher: '강사', done: '수료', site: '평생학습 포털', fee: '수강료' },
    facility: { learner: '회원', cls: '강습', group: '반', teacher: '강사', done: '수료', site: '홈페이지', fee: '이용료' }
  };
  try { Object.defineProperty(TERMS, 'public', { configurable: true, enumerable: true, get() { return PT[pubEd()]; }, set(v) { PT.staff = v; } }); } catch (e) { }

  /* ── 메뉴 프리셋 · 기본 메뉴 ── */
  const base0 = JSON.parse(JSON.stringify(PRESET.public));
  const mk = (on) => { const all = [...new Set([...base0.on, ...base0.off, ...on])].filter(id => MENU[id]); return { ws: [...base0.ws], on: on.filter(id => MENU[id]), off: all.filter(id => !on.includes(id)) }; };
  PRESET.public_staff = mk([...base0.on.filter(id => id !== 'compliance'), 'compliance']);
  PRESET.public_citizen = mk(['class', 'attend', 'assess', 'cert', 'library', 'members', 'enroll', 'groups', 'admins', 'board', 'message', 'community', 'ledger', 'sales', 'auto', 'site', 'org']);
  PRESET.public_facility = mk(['class', 'attend', 'library', 'members', 'enroll', 'groups', 'admins', 'board', 'message', 'fac', 'ledger', 'sales', 'auto', 'site', 'org']);
  { const base = presetNav; presetNav = (type, ed) => { if (type !== 'public') return base(type, ed); const e = EDS.includes(ed) ? ed : pubEd(); const keep = PRESET.public; PRESET.public = PRESET['public_' + e] || keep; try { return base(type, ed); } finally { PRESET.public = keep; } }; } /* eslint-disable-line no-global-assign */
  const ESS = {
    staff: ['class', 'clib', 'attend', 'cert', 'members', 'enroll', 'board', 'community', 'message', 'compliance', 'docs', 'site'],
    citizen: ['class', 'clib', 'attend', 'cert', 'members', 'enroll', 'board', 'message', 'ledger', 'sales', 'docs', 'site'],
    facility: ['class', 'attend', 'members', 'enroll', 'fac', 'ledger', 'sales', 'board', 'message', 'docs', 'site']
  };
  window.PUB_ESS = ESS;
  if (typeof window.slimEss === 'function') { const base = window.slimEss; window.slimEss = (...a) => { try { if (isPub()) return ESS[pubEd()].filter(id => MENU[id]); } catch (e) { } return base(...a); }; }
  /* 법정의무교육 메뉴: 기업 + 공공 직원 교육형(P1-F02). only 값은 지금 기관이 쓸 수 있으면 그 유형을 돌려준다 */
  if (MENU.compliance) try { Object.defineProperty(MENU.compliance, 'only', { configurable: true, enumerable: true, get() { return isPub() && pubEd() === 'staff' ? 'public' : 'corp'; } }); } catch (e) { }

  /* ── 시연 데이터 ── */
  const SM_STAFF = SAMPLE.public;
  SM_STAFF.cls = [['신규 임용자 기본교육', 'period'], ['4대 폭력예방 통합교육(성희롱 예방 포함)', 'period', 'legal'], ['개인정보보호 교육', 'period', 'legal'], ['장애인 인식개선 교육', 'period', 'legal'], ['산업안전보건교육(정기)', 'period', 'legal'], ['청렴 · 반부패 교육', 'period'], ['생성형 AI 행정 활용', 'period'], ['적극행정 · 민원응대 실무', 'episode', '기수반']];
  const SM = {
    staff: SM_STAFF,
    citizen: { cls: [['시니어 스마트폰 활용(월 · 수)', 'episode', '요일반'], ['생활 속 AI 활용 교실(화 · 목)', 'episode', '요일반'], ['시민 인문학 강좌', 'period'], ['우리 동네 역사 탐방', 'episode', '특강반'], ['디지털 배움터 기초(토)', 'episode', '요일반']], grp: ['2026 하반기 1기', '2026 하반기 2기', '온라인 강좌'], lv: ['입문', '심화', '수료'] },
    facility: { cls: [['아침 수영 초급(월 · 수 · 금)', 'episode', '요일반'], ['저녁 요가(화 · 목)', 'episode', '요일반'], ['헬스 기초 PT(4회)', 'episode', '회차 차감반'], ['어린이 수영(토)', 'episode', '요일반'], ['필라테스 입문(월 · 수)', 'episode', '요일반']], grp: ['수영', '헬스 · 요가', '어린이 강습'], lv: ['초급', '중급', '상급'] }
  };
  try { Object.defineProperty(SAMPLE, 'public', { configurable: true, enumerable: true, get() { return SM[pubEd()]; } }); } catch (e) { }
  const PRICE = { citizen: [0, 0, 0, 10000, 0], facility: [90000, 70000, 160000, 60000, 80000] };
  { const base = seed; seed = type => { const D = base(type); if (type !== 'public' || pubEd() === 'staff') return D; const e = pubEd();  /* eslint-disable-line no-global-assign */
    D.members.forEach(m => { m.extra = {}; });
    D.classes.forEach((c, i) => { c.price = PRICE[e][i % 5]; c.open = '전체'; c.legal = false; c.hours = c.kind === 'episode' ? 24 : 12; });
    D.pays = []; D.classes.filter(c => c.price).forEach(c => c.learners.slice(0, 10).forEach((id, j) => D.pays.push({ id: uid('pay'), at: addDays(today(), -((j * 5 + c.price / 1000) % 40 | 0)), who: id, item: c.name, amount: c.price, method: ['카드', '계좌이체', '현장 카드'][j % 3], status: j === 3 ? '환불 신청' : j === 7 ? '환불 완료' : '결제 완료' })));
    D.orgs = []; Object.assign(D.settings, { join: '자동 수락', siteOpen: 'public', extraQ: [] });
    if (!['k12', 'adult', 'lifelong'].includes(type)) D.settings.pg = D.settings.pg || '';
    return D; }; }

  /* ── AI 문구 · 홈 ── */
  const defGet = (obj, key, map) => { if (!obj) return; const staff = obj[key]; try { Object.defineProperty(obj, key, { configurable: true, enumerable: true, get() { const e = pubEd(); return e === 'staff' ? staff : map[e]; } }); } catch (e) { } };
  if (typeof EX !== 'undefined') defGet(EX, 'public', { citizen: ['이번 달 강좌 신청 현황 요약해줘', '결석이 잦은 수강생에게 안내 보내줘', '시니어 스마트폰 활용 강좌 만들어줘', '수료 기준 넘은 사람 수료증 발급'], facility: ['오늘 시설 예약 현황 알려줘', '이용료 미납 회원에게 안내해줘', '아침 수영 초급 강습 만들어줘', '이번 달 매출 요약해줘'] });
  if (typeof EXQ !== 'undefined') defGet(EXQ, 'public', { citizen: ['생활 속 AI 활용 8회 요일반 강좌 만들어줘', '이번 달 강좌 신청 현황 요약해줘', '오늘 결석생에게 알림 보내줘', '수료 기준 넘은 사람 수료증 발급'], facility: ['아침 수영 초급 월수금 06:00 강습 만들어줘', '오늘 시설 예약 현황 알려줘', '이용료 미납 회원에게 안내해줘', '이번 달 매출 요약해줘'] });
  if (typeof ONB !== 'undefined') defGet(ONB, 'public', { citizen: [['site', '평생학습 포털 준비', '공개형 · 간편가입 · 개인정보 처리방침'], ['class', '강좌 열기', '요일 · 시간 · 정원 · 접수 기간'], ['attend', '출석 규칙', '출석으로 수료를 판단하는 강좌는 출석률 기준'], ['cert', '수료증', '수료 기준을 넘으면 자동 발급']], facility: [['fac', '시설 등록', '운영 시간 · 휴관일 · 요금표'], ['class', '강습 열기', '요일 · 시간 · 정원 · 이용료'], ['ledger', '수납 준비', '현장 단말 · 온라인 결제 · 감면 확인'], ['site', '홈페이지 게시', '시설 예약 · 강습 신청 버튼']] });
  if (typeof HERO !== 'undefined') defGet(HERO, 'public', { citizen: ['배움이 가까운 우리 동네 평생학습', '생활 · 디지털 · 인문 강좌를 신청하고 수료증까지 받으세요.', '강좌 신청하기'], facility: ['오늘 운동, 예약부터 강습까지 한 번에', '시설 예약 · 강습 신청 · 이용권을 한 곳에서 확인합니다.', '시설 예약하기'] });
  if (typeof AIH_WHO !== 'undefined') defGet(AIH_WHO, 'public', { citizen: '평생학습 담당자', facility: '시설 운영 담당자' });
  if (typeof SEG_TITLE !== 'undefined') defGet(SEG_TITLE, 'public', { citizen: '평생학습 담당자', facility: '시설 운영 담당자' });
  if (typeof lsHeroText === 'function') { const base = lsHeroText; lsHeroText = ty => { if (ty === 'public' && pubEd() === 'citizen') return ['평생학습 포털', '배움이 가까운\n우리 동네\n평생학습', `${S.org.name}의 생활 · 디지털 · 인문 강좌를 신청하고 출석 · 수료까지 한 곳에서 확인합니다.`]; if (ty === 'public' && pubEd() === 'facility') return ['시설 · 강습', '오늘 운동,\n예약부터\n강습까지', `${S.org.name} 시설 예약 · 강습 신청 · 이용권을 한 곳에서 확인합니다.`]; return base(ty); }; } /* eslint-disable-line no-global-assign */
  /* 홈 브리핑: 법정의무교육 미이수는 직원 교육형만(시민 · 시설형에서 빼고, 처리 대기 환불 · 미납을 둔다) */
  if (typeof BRIEF === 'function') { const base = BRIEF; BRIEF = () => { const L = base(); if (!isPub() || pubEd() === 'staff') return L; const R = L.filter(b => b.k !== 'legal'); try { const n = DDStat.refundN(); if (n) R.unshift({ k: 'refund', label: '환불 신청', n, q: '환불 신청 기한 확인해줘', unit: '건' }); } catch (e) { } return R.slice(0, 4); }; } /* eslint-disable-line no-global-assign */

  /* ── 게시본 · 저장된 기관 ── */
  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { if (isPub() && r && r.org) r.org.ed = pubEd(); } catch (e) { } return r; }; } /* eslint-disable-line no-global-assign */
  { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (isPub() && !EDS.includes(S.org.ed)) { S.org.ed = 'staff'; save(); } } catch (e) { console.error(e); } return r; }; } /* eslint-disable-line no-global-assign */

  /* ── 설정 › 기관 유형: 세부 유형 바꾸기 ── */
  ACT['pub-ed'] = el => { const v = el.dataset.v; if (!isPub() || !EDS.includes(v) || pubEd() === v) return;
    modal('공공기관 세부 유형 변경', `<p><b>${esc(PUB_ED[v].n)}</b>(으)로 바꾸면 추천 메뉴 · 홈 · 용어가 바뀝니다. 데이터는 그대로 유지됩니다.</p><p class="mini">${esc(PUB_ED[v].s)} · 예: ${esc(PUB_ED[v].ex)}</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '변경', kind: 'pri', run: () => { S.org.ed = v; S.nav = presetNav('public', v); S.org.tySeen = 'public/' + v; try { if (typeof slimApply === 'function') slimApply(); } catch (e) { } logAudit('공공기관 세부 유형 변경 — ' + PUB_ED[v].n); save(); render(); } }]); };
  const pubCard = () => `<div class="card" id="pubEdCard"><div class="ch"><b>공공기관 세부 유형</b><small>같은 공공 유형 안에서 운영 방식을 고릅니다</small></div><div class="tgrid">${EDS.map(k => `<button class="tcard ${pubEd() === k ? 'on' : ''}" data-act="pub-ed" data-v="${k}" aria-pressed="${pubEd() === k}"><b>${esc(PUB_ED[k].n)}</b><p>${esc(PUB_ED[k].s)}</p><small>${esc(PUB_ED[k].ex)}</small></button>`).join('')}</div></div>`;
  if (typeof window.edSwitchHTML === 'function') { const base = window.edSwitchHTML; window.edSwitchHTML = (...a) => (isPub() ? pubCard() : '') + base(...a); }
})();
