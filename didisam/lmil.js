/* v42 학습 마일리지 · 보상 — 학습자 앱 · 웹(해요체). 짝: lmil.css · 계약 docs/mileage/04-data-api.md §5.2 · 기획 03-plan §4 · §7.2 · §8.2
   화면: 앱 「나」 카드 · #mile(내 마일리지: 잔액 3칸 · 다음 목표 1개 · 모으는 방법) · #mile/list(적립 내역 · 근거 시트) · #mile/exp(소멸 예정)
         #mile/rewards(보상 · 신청 확인 시트) · #mile/req(내 신청) · #mile/badges(배지 지갑) · #mile/streak(연속 학습 · 복구)
         적립 순간 토스트 · 하루 상한 문구(#done · #mile) · 빈 상태 · 웹 마이페이지 블록(lmy viewMy) · 보호자 요약(#mile, 보호자 계정)
   데이터: 운영 = /api/pub/<tid>/mile-my · mile-list · mile-rewards · mile-redeem · mile-redeem-cancel(계약 §5.2). 금액 · 포인트는 서버가 다시 계산한다.
           시연판 = 스튜디오 문서 mileage(S.mileage, 없으면 mile) → ?mile=1이면 이 기기 체험 샘플. 학습자 신청 · 취소 · 보호자 확인은 이 기기(didisam.mile.<기관>)에 겹쳐
           저장하고 운영자 요청함(lpxPush mile-redeem · mile-redeem-cancel · mile-guardian)으로 보낸다. 시연판 계산은 원장 규칙(선입선출 · 건별 만료 · 마이너스 상계)을 따른다.
   꺼진 기관(on=false · 403 mile_off · 404)은 카드 · 블록 · 경로 · 토스트를 모두 숨긴다(#mile은 기본 404 화면).
   문구 원칙: 손실 압박 금지(「서두르세요 · 곧 사라져요 · 끊겨요」 없음) · 효과음 · 폭죽 없음 · 색만으로 구분하지 않음(부호 · 글자 함께).
   learner.html에서 lapp.js 앞(lledger.js 다음). 「나」 · 홈 꾸미기는 DOMContentLoaded 뒤 가장 바깥에서 한다. */
'use strict';
(() => {
  if (typeof lrender !== 'function' || typeof viewPage !== 'function') return;
  const BQ = new URLSearchParams(location.search);
  const MI = { my: null, list: null, rw: null, at: 0, lat: 0, rat: 0, busy: false, lbusy: false, rbusy: false, off: false, err: '', f: 'all', sheet: null, idem: '', sending: false, seed: null, ov: null };
  window.LMIL = MI;
  const live = () => LR.mode === 'live';
  const nowD = () => (window.__lmNow ? new Date(window.__lmNow) : new Date());
  const kst = d => new Date((d ? new Date(d) : nowD()).getTime() + 9 * 3600e3).toISOString();
  const today = () => kst().slice(0, 10);
  const addD = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayOf = s => { s = String(s || ''); return s.length > 10 && /[TZ+]/.test(s.slice(10)) ? kst(s).slice(0, 10) : s.slice(0, 10); }; /* 스튜디오 nowStr 'YYYY-MM-DD HH:mm'은 현지(KST) 그대로 */
  const md = s => { const x = dayOf(s); if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return ''; return `${x.slice(0, 4) !== today().slice(0, 4) ? x.slice(0, 4) + '년 ' : ''}${+x.slice(5, 7)}월 ${+x.slice(8, 10)}일`; };
  const pick = (o, ...k) => { for (const x of k) if (o && o[x] != null && o[x] !== '') return o[x]; return undefined; };
  const int = v => Math.round(+v || 0);
  const nf = n => int(n).toLocaleString('ko-KR');
  let UNIT = 'P';
  const pt = n => `${n < 0 ? '−' : ''}${nf(Math.abs(n))}${UNIT}`;
  const sgn = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${nf(Math.abs(n))}${UNIT}`;
  const jo = (w, a, b) => { const c = String(w || '').trim().slice(-1).charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; return j && !(a === '으로' && j === 8) ? a : b; } return /[0-9LMNlmn]$/.test(String(w || '')) ? a : b; };

  /* ── 아이콘(24 격자, 선) ── */
  const IC = { mile: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 15h3v-3h3V9h2', check: 'M5 12l5 5 9-10', hour: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', gift: 'M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-2-4-6-4-6-1 0 1 1 1 6 1zm0 0c2-4 6-4 6-1 0 1-1 1-6 1', plus: 'M12 5v14M5 12h14', fix: 'M20 11a8 8 0 00-14-5L4 8M4 4v4h4M4 13a8 8 0 0014 5l2-2M20 20v-4h-4', x: 'M6 6l12 12M18 6L6 18', chev: 'M9 6l6 6-6 6', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.5', lock: 'M6 11h12v10H6zM9 11V8a3 3 0 016 0v3', pause: 'M12 21a9 9 0 100-18 9 9 0 000 18zM10 9v6M14 9v6', play: 'M12 21a9 9 0 100-18 9 9 0 000 18zM10 8.5v7l6-3.5z', cal: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4', flag: 'M6 21V4M6 4h11l-2 4 2 4H6', medal: 'M8 3l4 6 4-6M12 21a5 5 0 100-10 5 5 0 000 10z', cert: 'M12 3l2.5 1.8 3-.2.9 2.9 2.4 1.9-1 2.9 1 2.9-2.4 1.9-.9 2.9-3-.2L12 21l-2.5-1.8-3 .2-.9-2.9-2.4-1.9 1-2.9-1-2.9 2.4-1.9.9-2.9 3 .2zM9 12l2 2 4-4', sprout: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zm0 0c0-4 3-6 7-6 0 4-3 6-7 6', hist: 'M4 12a8 8 0 108-8 8 8 0 00-7 4M4 4v4h4M12 8v4l3 2', cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5', link: 'M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1', ticket: 'M3 7h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4zM14 7v12', back: 'M15 5l-7 7 7 7', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 100-6M18 15c2 0 4 2 4 5', up: 'M12 19V5M6 11l6-6 6 6' };
  const sv = (n, s = 20) => `<svg class="lm-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n] || IC.info}"/></svg>`;

  /* ── 정규화(서버 camelCase · DB snake_case 모두 받음) ── */
  const KIND = { earn: '적립', use: '사용', hold: '사용 대기', release: '돌려받음', expire: '소멸', cancel: '정정', adjust: '조정', restore: '복원', penalty: '차감' };
  const TRUST = { A: '서버 확인', B: '운영자 확정', C: '기기 보고' };
  const nE = e => ({ id: String(pick(e, 'id') || ''), sid: String(pick(e, 'sid') || ''), kind: pick(e, 'kind') || 'earn', points: int(pick(e, 'points', 'p')), status: pick(e, 'status') || 'posted', at: pick(e, 'at', 'postedAt', 'posted_at', 'createdAt') || '',
    title: String(pick(e, 'title', 'label', 'say', 'text') || ''), reason: String(pick(e, 'reason', 'note') || ''), trust: pick(e, 'trust') || '', expiresAt: pick(e, 'expiresAt', 'expires_at') || '', nature: pick(e, 'nature') || 'achievement',
    convertible: pick(e, 'convertible') !== false && !pick(e, 'funded'), funded: !!pick(e, 'funded'), clsName: String(pick(e, 'clsName', 'cls_name', 'course') || ''), ref: String(pick(e, 'refEntry', 'ref_entry', 'ref') || ''), redeemId: String(pick(e, 'redeemId', 'redeem_id') || ''),
    ruleId: String(pick(e, 'ruleId', 'rule_id') || ''), ruleLabel: String(pick(e, 'ruleLabel', 'rule_label') || ''), cond: String(pick(e, 'cond', 'basis', 'why') || ''), ruleVer: String(pick(e, 'ruleVerLabel', 'ruleVer', 'rule_ver') || ''), unit: pick(e, 'scopeUnit', 'scope_unit') || '' });
  const nR = r => { const c = pick(r, 'cost') || {}; const fixed = typeof c === 'object' ? pick(c, 'fixedP', 'fixed_p') : c;
    return { id: String(pick(r, 'id') || ''), kind: pick(r, 'kind') || 'goods', title: String(pick(r, 'title', 'name') || '보상'), cost: fixed != null ? int(fixed) : null, perUnitP: int(pick(c, 'perUnitP') || 0), wonPerP: +(pick(c, 'wonPerP') || 0),
      min: int(pick(r, 'minUse', 'min_use') || 0), max: int((o => o && typeof o === 'object' ? o.once : o)(pick(r, 'maxUse', 'max_use', 'max')) || 0), step: int(pick(r, 'step') || 0) || 1, threshold: int(pick(r, 'threshold') || 0),
      stock: pick(r, 'stockLeft') != null ? int(r.stockLeft) : pick(r, 'stock') == null ? null : int(r.stock), locked: String(pick(r, 'locked') || ''), left: pick(r, 'leftMonth', 'perSidLeft', 'left') == null ? null : int(pick(r, 'leftMonth', 'perSidLeft', 'left')), perMonth: int(pick(r.perSid || r.per_sid || {}, 'month') || 0),
      approval: pick(r, 'approval') || 'manual', cash: !!pick(r, 'cash'), lock: pick(r, 'lock', 'lockReason', 'lock_reason') || '', how: String(pick(r, 'how', 'desc', 'note') || ''), period: String(pick(r, 'period', 'leadTime') || ''), owned: !!pick(r, 'owned', 'received'), tiers: Array.isArray(r.tiers) ? r.tiers : null, window: String(pick(r, 'window') || ''), active: r.active !== false }; };
  const nQ = q => ({ id: String(pick(q, 'id') || ''), rewardId: String(pick(q, 'rewardId', 'reward_id') || ''), title: String(pick(q, 'title', 'rewardTitle') || ''), points: int(pick(q, 'points')), won: int(pick(q, 'won') || 0), status: (pick(q, 'status') || 'requested') === 'requested' && (q.guardian === 'wait' || q.guardian === 'pending') ? 'guardian' : pick(q, 'status') || 'requested', cancellable: q.cancellable === true, at: pick(q, 'at', 'createdAt') || '', reason: String(pick(q, 'reason') || ''),
    code: String(pick(q, 'code', 'couponCode') || pick(q.fulfil || {}, 'couponCode', 'code') || ''), no: String(pick(q, 'no', 'number') || ''), sid: String(pick(q, 'sid') || '') });
  const QST = { requested: ['확인 대기', 'wait'], guardian: ['보호자 확인 대기', 'wait'], approved: ['받을 수 있어요', 'wait'], fulfilled: ['받았어요', 'ok'], rejected: ['반려', 'bad'], cancelled: ['취소함', ''], reclaimed: ['회수됨', 'bad'] };

  /* ═════ 시연판 데이터 ═════ */
  const roomDoc = () => { if (!['demo', 'preview'].includes(LR.mode) || !LR.tid || LR.tid === 'sample') return null; try { return JSON.parse(localStorage.getItem('didisam.room.' + LR.tid) || 'null'); } catch (e) { return null; } };
  const ovK = () => `didisam.mile.${LR.tid || 'x'}`;
  function ov() { if (MI.ov && MI.ov.k === ovK()) return MI.ov.v; let v = null; try { v = JSON.parse(localStorage.getItem(ovK()) || 'null'); } catch (e) { v = null; } if (!v || typeof v !== 'object') v = {}; ['entries', 'redeems'].forEach(k => { if (!Array.isArray(v[k])) v[k] = []; }); ['seen', 'guard', 'repair'].forEach(k => { if (!v[k] || typeof v[k] !== 'object') v[k] = {}; }); MI.ov = { k: ovK(), v }; return v; }
  function ovSave() { try { localStorage.setItem(ovK(), JSON.stringify(ov())); return true; } catch (e) { toast('이 기기에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.', 'bad'); return false; } }
  /* 체험 샘플(?mile=1): 한빛대 김서연 시안과 같은 흐름 — 잔액 · 적립 예정 · 정정 줄 · 소멸 예정 45 · 국비 과정 기록만 · 식권 사용 */
  function seed(sid) { const T = today(); const D = n => addD(T, n) + 'T03:00:00Z'; const E = (id, kind, p, d, o = {}) => ({ id, sid, kind, points: p, status: 'posted', at: D(d), trust: 'B', nature: 'achievement', convertible: true, ...o });
    const exp1 = addD(T, 47), exp2 = addD(T, 230);
    return { on: true, policy: { unitName: '점', dailyCapTotal: 50, tierWindow: 'term', tiers: [{ name: '시작', min: 0 }, { name: '성장', min: 80 }, { name: '도약', min: 150 }, { name: '으뜸', min: 250 }], expiry: { mode: 'term_end', label: '학기 말 + 1학기(항목별)' }, notice: { monthsBefore: 6, daysBefore: [30, 3] }, streak: { minMin: 10, freezePerWeek: 1, repair: { withinH: 48, factor: 2, perMonth: 1 } }, ruleVerLabel: '2026-2학기 규칙' },
      rules: [{ id: 'mru_q', trigger: 'lms_q', label: '비교과 프로그램 이수', say: '비교과 프로그램을 이수하면 프로그램 점수만큼', cap: '항목군 학기 60점까지', score: { mode: 'source' }, active: true },
        { id: 'mru_att', trigger: 'attend', label: '특강 출석', say: '특강에 출석하면 30점', cap: '학기 120점까지', cond: '특강마다 1회 · 학기 120점까지', score: { mode: 'fixed', v: 30 }, active: true, act: '특강 1번 출석' },
        { id: 'mru_diag', trigger: 'diag', label: 'AI 역량진단', say: 'AI 역량진단을 마치면 50점', cap: '학기 1회까지', score: { mode: 'fixed', v: 50 }, active: true, act: 'AI 역량진단', href: '#home' },
        { id: 'mru_svy', trigger: 'survey', label: '만족도 설문', say: '만족도 설문에 참여하면 10점', cap: '학기 30점까지', nature: 'participation', score: { mode: 'fixed', v: 10 }, active: true },
        { id: 'mru_goal', trigger: 'tube_goal', label: '오늘 목표 달성', say: '오늘 목표를 채우면 10점', cap: '하루 1회', score: { mode: 'fixed', v: 10 }, active: true }],
      entries: [E('me_s1', 'earn', 130, -170, { title: '1학기 비교과 이수(이월분)', expiresAt: exp1 + 'T14:59:59Z', trust: 'A', ruleId: 'mru_q', src: '2026-1학기 이월분' }), E('me_s2', 'use', -35, -150, { title: '스터디룸 우선 예약권 교환', redeemId: 'mrd_s0' }),
        E('me_s3', 'earn', 30, -23, { title: '특강 「데이터 시각화」 출석', expiresAt: exp2 + 'T14:59:59Z', ruleId: 'mru_att' }), E('me_s4', 'earn', 30, -21, { title: '특강 「데이터 시각화」 출석', expiresAt: exp2 + 'T14:59:59Z', ruleId: 'mru_att' }),
        E('me_s5', 'cancel', -30, -20, { title: '출석 중복 기록', reason: '같은 특강 출석이 두 번 기록되어 한 줄을 정정했어요.', ref: 'me_s4', ruleId: 'mru_att' }),
        E('me_s6', 'earn', 50, -15, { title: 'AI 역량진단 완료', trust: 'A', expiresAt: exp2 + 'T14:59:59Z', ruleId: 'mru_diag' }), E('me_s7', 'earn', 10, -12, { title: '만족도 설문 참여', nature: 'participation', convertible: false, expiresAt: exp2 + 'T14:59:59Z', ruleId: 'mru_svy' }),
        E('me_s8', 'earn', 30, -9, { title: '특강 「AI로 리포트 구조 잡기」 출석', expiresAt: exp2 + 'T14:59:59Z', ruleId: 'mru_att' }), E('me_s9', 'earn', 40, -30, { title: '「AI 실무 기초」 과정 이수', funded: true, convertible: false, trust: 'A', clsName: 'AI 실무 기초', expiresAt: exp2 + 'T14:59:59Z' }),
        E('me_s10', 'use', -50, -2, { title: '학생식당 식권 1매 교환', redeemId: 'mrd_s1' }), E('me_s11', 'earn', 20, -1, { title: '어학 증빙 · TOEIC 750', status: 'pending', ruleId: '' })],
      rewards: [{ id: 'mrw_room', kind: 'goods', title: '스터디룸 우선 예약권', cost: { fixedP: 30 }, approval: 'manual', how: '담당자 확인 후', period: '영업일 2일 안에 알려 드려요' },
        { id: 'mrw_meal', kind: 'coupon', title: '학생식당 식권 1매', cost: { fixedP: 50 }, approval: 'auto', cash: true, stock: 140, perSid: { month: 2 }, how: '자동(현장 수령)', period: '바로 수령 코드를 드려요 · 30일 안에 사용' },
        { id: 'mrw_book', kind: 'coupon', title: '교내 서점 도서 교환권', cost: { fixedP: 300 }, approval: 'manual', cash: true, how: '담당자 확인 후' },
        { id: 'mrw_badge', kind: 'badge', title: '디지털 배지 · AI 역량 인증', how: '조건 · 진단 + 특강 2회', owned: true }],
      redeems: [{ id: 'mrd_s1', sid, rewardId: 'mrw_meal', title: '학생식당 식권 1매', points: 50, status: 'fulfilled', at: D(-2), no: 'RQ-031' }, { id: 'mrd_s2', sid, rewardId: 'mrw_meal', title: '학생식당 식권 1매', points: 50, status: 'rejected', at: D(-40), reason: '신청한 날 식권 재고가 없어 반려했어요. 잡아 둔 50점은 바로 돌려드렸어요.', no: 'RQ-017' }],
      badges: [{ sid, id: 'b_first', name: '첫 특강 출석', tier: 1, at: D(-23) }, { sid, id: 'b_q3', name: '비교과 3개 이수', tier: 2, at: D(-60) }, { sid, id: 'b_ai', name: 'AI 역량 인증', tier: 3, at: D(-14) }, { id: 'b_write', name: '글쓰기 역량 인증', tier: 3, lock: '클리닉 2회 남음' }] }; }
  /* 스튜디오 문서: 정책 · 규칙 · 적립 = S.mileage(mil.js), 보상 · 신청 · hold/use 줄 = S.milrw(milrw.js) — 합쳐서 읽는다 */
  function demoSrc() { const d = roomDoc(); const m = d && (d.mileage || d.mile); if (m && typeof m === 'object') { const w = d.milrw && typeof d.milrw === 'object' ? d.milrw : null; if (!w) return m; if (MI.mg && MI.mg.m === m && MI.mg.w === w) return MI.mg.v; const v = { ...m, rewards: (w.rewards || []).length ? w.rewards : m.rewards || [], redeems: [...(m.redeems || []), ...(w.redeems || [])], entries: [...(m.entries || []), ...(w.entries || [])] }; MI.mg = { m, w, v }; return v; } if (BQ.get('mile') === '1' && LR.me) return MI.seed && MI.seed.sid === LR.me.sid ? MI.seed.v : (MI.seed = { sid: LR.me.sid, v: seed(LR.me.sid) }).v; return null; }
  const polOf = m => (m && (m.policy || m)) || {};
  const demoOn = () => { const m = demoSrc(); if (!m) return false; const p = polOf(m); return (m.on ?? p.on) !== false; };
  const isPar = () => !!(LR.me && LR.me.kind === 'parent');
  function kidsDemo() { try { if (!isPar()) return []; const r = roomDoc() || {}; const pa = typeof laPacct === 'function' ? laPacct() : null; if (!pa) return []; return (r.parents || []).filter(p => p.acct === pa.id && p.status === '연결 완료').map(p => { const m = (r.members || []).find(x => x.id === p.child) || {}; const nm = String(m.nick || m.name || '').trim(); return { sid: String(m.sid || m.id || ''), label: m.nick || (nm ? nm[0] + '○○' : '자녀') }; }).filter(k => k.sid); } catch (e) { return []; } }

  /* ── 시연판 계산: 선입선출 · 건별 만료 · 마이너스 상계 · 사용 대기(서버 mil_* 와 같은 순서) ── */
  function calc(sid, src) { const m = src || demoSrc() || {}; const p = polOf(m); const o = ov();
    const srcE = (m.entries || m.ledger || m.lines || []).map(nE).filter(e => e.sid === sid || (!e.sid && sid === (LR.me || {}).sid)); const sId = new Set(srcE.map(e => e.id));
    const E = [...srcE, ...o.entries.map(nE).filter(e => e.sid === sid && !sId.has(e.id))].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const srcQ = (m.redeems || m.requests || []).map(nQ).filter(q => !q.sid || q.sid === sid); const sQ = new Set(srcQ.map(q => q.id));
    const oQ = new Map(o.redeems.map(nQ).map(q => [q.id, q])); /* 이 기기에서 취소한 스튜디오 신청은 취소로 보인다(스튜디오가 반영하면 그쪽 상태) */
    const Q = [...srcQ.map(q => { const x = oQ.get(q.id); return x && x.status === 'cancelled' && ['requested', 'guardian'].includes(q.status) ? { ...q, status: 'cancelled' } : q; }), ...o.redeems.map(nQ).filter(q => q.sid === sid && !sQ.has(q.id))].map(q => { const g = o.guard[q.id]; return g && q.status === 'guardian' ? { ...q, status: g === 'ok' ? 'requested' : 'rejected', reason: g === 'ok' ? q.reason : '보호자님이 거절했어요. 잡아 둔 마일리지는 돌려드렸어요.' } : q; });
    Q.filter(q => ['cancelled', 'rejected'].includes(q.status)).forEach(q => { const h = E.find(e => e.kind === 'hold' && e.redeemId === q.id && e.status === 'posted'); if (h && !E.some(e => e.kind === 'release' && e.redeemId === q.id)) E.push(nE({ id: 'vr_' + q.id, sid, kind: 'release', points: -h.points, status: 'posted', at: new Date(nowD()).toISOString(), title: `${q.title || '보상'} 신청 취소 · 돌려받음`, redeemId: q.id })); });
    const lots = []; const t = today(); const tEnd = nowD().getTime(); let neg = 0; const used = {};
    const take = (amt, onlyConv, key) => { const L = lots.filter(l => l.left > 0 && (!onlyConv || (onlyConv === 'nofund' ? !l.funded : l.conv))).sort((a, b) => String(a.exp || '9').localeCompare(String(b.exp || '9')) || String(a.at).localeCompare(String(b.at))); for (const l of L) { if (amt <= 0) break; const x = Math.min(l.left, amt); l.left -= x; amt -= x; if (key) (used[key] = used[key] || []).push([l, x]); } if (amt > 0) neg += amt; };
    const rows = [];
    E.forEach(e => { if (e.status === 'void') return; if (e.status === 'pending') { rows.push(e); return; }
      if (e.points > 0 && ['earn', 'adjust', 'restore'].includes(e.kind)) { let add = e.points; const c = Math.min(neg, add); neg -= c; add -= c; lots.push({ e, at: e.at, exp: e.expiresAt, left: add, conv: e.convertible && !e.funded, funded: e.funded }); }
      else if (e.kind === 'release') { const k = e.ref || e.redeemId; (used[k] || []).forEach(([l, x]) => { l.left += x; }); delete used[k]; }
      else if (e.points < 0) { if (e.kind === 'cancel' && e.ref) { const l = lots.find(x => x.e.id === e.ref); if (l) { const x = Math.min(l.left, -e.points); l.left -= x; neg += -e.points - x; } else take(-e.points, false); }
        else take(-e.points, ['use', 'hold'].includes(e.kind) ? 'nofund' : false, e.kind === 'hold' ? (e.redeemId || e.id) : ''); }
      rows.push(e); });
    /* 시연판에는 매일 소멸 작업이 없으니 만료 지난 남은 양은 화면에서 소멸 줄로 보인다(서버 sweep과 같은 결과) */
    lots.filter(l => l.left > 0 && l.exp && Date.parse(l.exp) < tEnd).forEach(l => { rows.push({ ...nE({ id: 'vx_' + l.e.id, kind: 'expire', points: -l.left, at: l.exp, title: `${l.e.title || '적립'} 소멸`, ref: l.e.id }), sid }); l.left = 0; });
    const posted = rows.filter(e => e.status !== 'pending').reduce((s, e) => s + e.points, 0);
    /* 사용 대기: 서버가 hold 줄을 쓴 신청은 줄로(이미 잔액에서 빠짐), 이 기기에서 막 신청한 것은 신청으로 계산 */
    const heldQ = Q.filter(q => ['requested', 'guardian', 'approved'].includes(q.status) && !E.some(e => e.redeemId === q.id && ['use', 'hold'].includes(e.kind))).reduce((s, q) => s + q.points, 0);
    const heldE = E.filter(e => e.kind === 'hold' && e.status === 'posted' && !E.some(x => x.kind === 'release' && (x.ref === e.id || (x.redeemId && x.redeemId === e.redeemId))) && !E.some(x => x.kind === 'use' && x.redeemId && x.redeemId === e.redeemId)).reduce((s, e) => s - e.points, 0);
    const held = heldQ + heldE;
    let rem = lots.reduce((s, l) => s + l.left, 0) - neg; let balance = rem - heldQ;
    let conv = Math.max(0, Math.min(balance, lots.filter(l => l.conv).reduce((s, l) => s + l.left, 0) - neg - heldQ));
    /* 잔액 · 전환 가능은 데모 엔진(milecalc.js replay · expire · sync)으로 — 서버 mil_* 와 같은 선입선출 · 금전성 lot · 마이너스 상계(tests/mileage-vectors.json 대조) */
    const MCx = window.MileCalc; if (MCx && typeof MCx.create === 'function') { try { const eng = MCx.create({ policy: {} }); const rwCash = id => { const q = Q.find(x => x.id === id); const rw = q && (m.rewards || []).find(r => r.id === q.rewardId); return rw ? rw.cash !== false && (rw.cash === true || ['tuition', 'coupon', 'shop', 'goods', 'scholar'].includes(rw.kind)) : true; };
      if (typeof eng.replay === 'function') { eng.replay(E.filter(e => e.status !== 'void').map(e => ({ id: e.id, sid, unit: e.unit || 'lu_root', kind: e.kind, points: e.points, status: e.status, at: e.at, expiresAt: e.expiresAt || null, convertible: e.convertible, funded: e.funded, nature: e.nature, refEntry: e.ref || null, redeemId: e.redeemId || null })), { cashOf: rwCash });
        eng.expire(tEnd, sid); const W = [...new Set(E.map(e => e.unit || 'lu_root'))].map(u => eng.sync(sid, u, tEnd)); const wb = W.reduce((x, w) => x + w.balance, 0), wc = W.reduce((x, w) => x + w.convertible, 0);
        balance = wb - heldQ; rem = wb; conv = Math.max(0, Math.min(balance, wc - heldQ)); } } catch (e) { console.error('mile calc', e); } }
    const funded = lots.filter(l => l.funded).reduce((s, l) => s + l.left, 0);
    const lim = addD(t, 183); const ex = {}; lots.filter(l => l.left > 0 && l.exp && dayOf(l.exp) <= lim).forEach(l => { const d = dayOf(l.exp); (ex[d] = ex[d] || { at: d, points: 0, src: [] }).points += l.left; if (l.e.src || l.e.title) ex[d].src.push(l.e.src || l.e.title); });
    const win = p.tierWindow || p.tier_window || 'm12'; const from = win === 'term' ? (p.termStart || addD(t, -120)) : win === 'year' ? t.slice(0, 4) + '-01-01' : addD(t, -365);
    const ew = E.filter(e => e.kind === 'earn' && e.status === 'posted' && dayOf(e.at) >= from).reduce((s, e) => s + e.points, 0) - E.filter(e => e.kind === 'cancel' && e.status === 'posted' && dayOf(e.at) >= from).reduce((s, e) => s - e.points, 0);
    const tdy = E.filter(e => e.kind === 'earn' && e.status !== 'void' && dayOf(e.at) === t).reduce((s, e) => s + e.points, 0);
    void posted; return { E: rows.sort((a, b) => String(b.at).localeCompare(String(a.at))), Q: Q.sort((a, b) => String(b.at).localeCompare(String(a.at))), balance, pending: E.filter(e => e.status === 'pending' && e.points > 0).reduce((s, e) => s + e.points, 0), held, convertible: conv, funded, par: lots.filter(l => !l.conv && !l.funded).reduce((s, l) => s + l.left, 0), expiring: Object.values(ex).sort((a, b) => a.at.localeCompare(b.at)), ew, today: tdy, p, m }; }

  /* ── 연속 학습: 주 7칸(완료 · 쉼 · 오늘 · 남은 날) — 하루 n분 학습이면 +1, 쉬는 날(주 1번)은 이어짐, 끊김 알림 없음 ── */
  function studyDays() { const lp = LR.lp || {}; const D = { ...(lp.days || {}) }; const tb = lp.tube || {}; const sec = tb.sec || {}; const minMin = (streakCfg().minMin || 10) * 60; Object.keys(sec).forEach(d => { if (+sec[d] >= minMin) D[d] = Math.max(1, +D[d] || 1); }); return D; }
  function streakCfg() { const m = live() ? null : demoSrc(); const p = m ? polOf(m) : ((MI.my || {}).policy || {}); return { freezePerWeek: 1, minMin: 10, repair: { withinH: 48, factor: 2, perMonth: 1 }, ...((p && p.streak) || {}) }; }
  const monOf = d => { const w = new Date(d + 'T00:00:00Z').getUTCDay(); return addD(d, -((w + 6) % 7)); };
  function streakLocal() { const D = studyDays(); const t = today(); const cfg = streakCfg(); const fpw = +cfg.freezePerWeek >= 0 ? +cfg.freezePerWeek : 1; const rest = new Set(); const usedW = {}; let n = 0; let d = D[t] ? t : addD(t, -1); if (D[t]) { n = 1; d = addD(t, -1); }
    const o = live() ? {} : ov(); const me0 = String((LR.me || {}).sid || ''); const docRep = live() ? [] : ((demoSrc() || {}).repairs || []).filter(r => r && String(r.sid) === me0); const rep = new Set([...Object.keys(o.repair || {}).flatMap(k => (o.repair[k] || {}).days || []), ...docRep.flatMap(r => r.days || [])]);
    for (let i = 0; i < 400; i++) { if (D[d]) { n++; d = addD(d, -1); continue; } if (rep.has(d)) { rest.add(d); d = addD(d, -1); continue; } const w = monOf(d); if ((usedW[w] || 0) < fpw && D[addD(d, -1)]) { usedW[w] = (usedW[w] || 0) + 1; rest.add(d); d = addD(d, -1); continue; } break; }
    const mon = monOf(t); const week = [0, 1, 2, 3, 4, 5, 6].map(i => { const x = addD(mon, i); return { d: x, st: D[x] ? 'done' : rest.has(x) ? 'rest' : x === t ? 'today' : x > t ? 'next' : 'miss' }; });
    const left = Math.max(0, fpw - (usedW[mon] || 0));
    /* 복구: 끊긴 뒤 48시간 안 · 한 달 1번 · 평소 목표의 2배 학습 */
    let repair = null; if (n === 0) { let last = ''; for (let i = 1; i < 10; i++) { const x = addD(t, -i); if (D[x]) { last = x; break; } } const ym = t.slice(0, 7); const usedM = Math.max(Object.keys(o.repair || {}).filter(k => k.slice(0, 7) === ym).length, docRep.filter(r => r.ym === ym).length);
      if (last) { const until = Date.parse(addD(last, 1) + 'T00:00:00+09:00') + (cfg.repair.withinH || 48) * 3600e3; let prev = 0; for (let x = last; D[x] && prev < 400; x = addD(x, -1)) prev++; if (until > nowD().getTime() && usedM < (cfg.repair.perMonth ?? 1) && prev >= 2) repair = { until, need: goalMin() * (cfg.repair.factor || 2), from: last, prev }; } }
    return { n, freeze: left, week, repair, best: n }; }
  const goalMin = () => { const g = +((LR.lp || {}).tube || {}).goal; return g >= 5 && g <= 180 ? g : 20; };
  const minToday = () => Math.floor((+((((LR.lp || {}).tube || {}).sec || {})[today()]) || 0) / 60);

  /* ═════ 운영 ═════ */
  const lapi = async (method, url, body) => { const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; e.extra = j; throw e; } return j; };
  const P = act => `/api/pub/${encodeURIComponent(LR.tid)}/mile-${act}`;
  async function loadMy(force) { if (!live() || !LR.me || MI.busy || MI.off) return; if (!force && MI.my && Date.now() - MI.at < 20000) return; MI.busy = true;
    try { const r = await lapi('GET', P('my')); if (r.on === false) MI.off = true; else { MI.my = r; MI.at = Date.now(); MI.err = ''; } }
    catch (e) { if (e.status === 403 || e.status === 404 || e.code === 'mile_off') MI.off = true; else MI.err = e.status === 401 ? '로그인이 끝났어요. 다시 로그인해 주세요.' : '마일리지를 불러오지 못했어요. 잠시 후 다시 열어 주세요.'; }
    MI.busy = false; rer(true); }
  async function loadList(force) { if (!live() || MI.lbusy || MI.off) return; if (!force && MI.list && Date.now() - MI.lat < 20000) return; MI.lbusy = true;
    try { const r = await lapi('GET', P('list') + '?limit=100'); const L = r.items || r.entries || r.rows || (r.months || []).flatMap(m => m.rows || m.items || []); MI.list = L.map(nE); MI.lat = Date.now(); } catch (e) { MI.list = MI.list || []; if (e.status === 403 || e.code === 'mile_off') MI.off = true; }
    MI.lbusy = false; rer(); }
  async function loadRw(force) { if (!live() || MI.rbusy || MI.off) return; if (!force && MI.rw && Date.now() - MI.rat < 20000) return; MI.rbusy = true;
    try { const r = await lapi('GET', P('rewards')); MI.rw = r; MI.rat = Date.now(); } catch (e) { MI.rw = MI.rw || { rewards: [] }; if (e.status === 403 || e.code === 'mile_off') MI.off = true; }
    MI.rbusy = false; rer(); }
  const on = () => { try { if (!LR.me) return false; if (live()) { if (MI.off) return false; if (MI.my) return isPar() ? Array.isArray(MI.my.kids) && MI.my.kids.length > 0 : true; const s = SITE(); return !!(s && s.mileage && s.mileage.on); } if (isPar()) return demoOn() && kidsDemo().length > 0; return demoOn(); } catch (e) { return false; } };
  window.mileOn = on; MI.calc = calc; /* 기준값 대조(tests/ui/mil42-learner.js): 시연판 계산 = milecalc.js */

  /* ── 모델: 운영 · 시연판을 같은 모양으로 ── */
  function model(sid) { if (live()) { const r = MI.my || {}; UNIT = r.unitName || r.unit || UNIT; const RW = MI.rw || {}; const tier = typeof r.tier === 'object' && r.tier ? r.tier : r.tier ? { name: String(r.tier) } : null;
      const st = streakLocal(); const s = r.streak || {}; const ng = r.nextGoal || null;
      return { unit: UNIT, balance: int(r.balance), pending: int(r.pending), held: int(pick(r, 'held', 'hold', 'onHold') || 0), convertible: int(r.convertible), funded: int(pick(r, 'funded', 'fundedP') || 0), par: int(pick(r, 'participation', 'par') || 0), ew: int(pick(r, 'earnedWindow', 'earned_window') || 0), winLabel: r.windowLabel || '',
        tier, goal: ng ? { label: ng.label || '다음 목표', need: int(ng.need), pct: Math.max(0, Math.min(100, int(ng.pct))), now: pick(ng, 'now') != null ? int(ng.now) : null, target: pick(ng, 'target') != null ? int(ng.target) : null, hint: ng.hint || ng.how || '', kind: ng.kind || '' } : null,
        streak: { n: s.n != null ? int(s.n) : st.n, freeze: s.freeze != null ? int(s.freeze) : st.freeze, week: Array.isArray(s.week) && s.week.length === 7 ? s.week.map((w, i) => typeof w === 'boolean' ? { d: st.week[i].d, st: w ? 'done' : st.week[i].st === 'done' ? 'miss' : st.week[i].st } : { d: w.d || st.week[i].d, st: w.st || w.s || st.week[i].st }) : st.week, repair: s.repair ? { until: Date.parse(s.repair.until || s.repair.at || 0) || 0, need: int(s.repair.need || s.repair.min || goalMin() * 2) } : st.repair },
        expiring: (r.expiring || []).map(x => ({ at: dayOf(x.at), points: int(x.points), src: x.src ? [].concat(x.src) : [] })), ways: (r.ways || []).map(w => typeof w === 'string' ? { say: w } : { say: w.say || w.text || w.label || '', cap: w.cap || '', nature: w.nature || '', href: w.href || '', act: w.act || '' }),
        sunset: r.sunset || null, daily: r.daily || (r.dailyCap ? { cap: int(r.dailyCap), today: int(r.todayEarned || 0) } : null), notice: r.notice || null, expiryLabel: r.expiryLabel || '',
        E: (MI.list || []).sort((a, b) => String(b.at).localeCompare(String(a.at))), R: (RW.rewards || RW.items || []).map(nR).filter(x => x.active), Q: (RW.requests || RW.redeems || r.requests || r.redeems || []).map(nQ).sort((a, b) => String(b.at).localeCompare(String(a.at))),
        usable: RW.usable != null ? int(RW.usable) : int(r.balance), badges: (r.badges || RW.badges || []).map(b => ({ id: b.id, name: b.name || b.title || '배지', tier: +b.tier || ({ record: 1, achieve: 2, cert: 3 }[b.tier] || 1), at: b.at || '', lock: b.lock || '' })), kids: r.kids || [], loaded: !!MI.my };
    }
    const C = calc(sid || (LR.me || {}).sid); const p = C.p; UNIT = p.ab || p.unitAb || p.unit_ab || p.unitName || p.unit_name || p.unit || 'P';
    const tiers = (p.tiers || []).map(x => Array.isArray(x) ? { name: x[0], min: +x[1] } : { name: x.name, min: +x.min || 0 }).sort((a, b) => a.min - b.min);
    let tier = null; if (tiers.length) { let i = 0; tiers.forEach((x, k) => { if (C.ew >= x.min) i = k; }); const top = tiers[tiers.length - 1].min || 1; tier = { name: tiers[i].name, pct: Math.min(100, Math.round(C.ew / top * 100)), next: tiers[i + 1] ? tiers[i + 1].name : '', left: tiers[i + 1] ? tiers[i + 1].min - C.ew : 0 }; }
    const rules = (C.m.rules || []).filter(r => r.active !== false && r.on !== false);
    const CAPN = { day: '하루', week: '한 주', month: '한 달', term: '학기', year: '한 해', total: '전체' }; const capT = r => typeof r.cap === 'string' ? r.cap : r.capText || Object.entries(r.caps || {}).filter(([, v]) => +v > 0).slice(0, 1).map(([k, v]) => `${CAPN[k] || k} ${nf(v)}${UNIT}까지`)[0] || '';
    const sv0 = r => { const v = r.score ? +r.score.v : +r.v || +r.points || 0; return v > 0 ? `${nf(v)}${UNIT}` : '점수만큼'; };
    const ways = rules.map(r => ({ say: (r.say || `${r.label || '학습'} {P}`).replace('{P}', sv0(r)).trim(), cap: capT(r), nature: r.nature || 'achievement', href: r.href || '', act: r.act || r.label || '', v: r.score && (r.score.mode || 'fixed') === 'fixed' ? +r.score.v || 0 : +r.v || 0, trigger: r.trigger, once: r.once === 'ever' || /1회/.test(capT(r)) }));
    const R = (C.m.rewards || []).map(nR).filter(x => x.active);
    const hint = need => { const W = ways.filter(w => w.v > 0 && w.nature !== 'participation' && !w.once).map(w => ({ w, n: Math.ceil(need / w.v) })).sort((a, b) => a.n - b.n)[0]; return W ? `${W.w.act} ${W.n}번이면 도달해요` : ''; };
    let goal = null; const g0 = p.goal || null; const gR = g0 && R.find(x => x.id === g0.rewardId);
    if (gR && gR.cost) { const need = Math.max(0, gR.cost - C.convertible); goal = { label: gR.title, need, now: C.convertible, target: gR.cost, pct: Math.min(100, Math.round(C.convertible / gR.cost * 100)), hint: need ? hint(need) : '' }; }
    else if (tier && tier.next) { const nx = tiers.find(x => x.name === tier.next); goal = { label: `${tier.next} 등급`, need: nx.min - C.ew, now: C.ew, target: nx.min, pct: Math.min(100, Math.round(C.ew / nx.min * 100)), hint: hint(nx.min - C.ew), kind: 'tier' }; }
    const st = streakLocal(); const cap = +p.dailyCapTotal || +p.daily_cap_total || 0;
    const B = (C.m.badges || []).filter(b => !b.sid || b.sid === (sid || LR.me.sid)).map(b => ({ id: b.id, name: b.name || '배지', tier: +b.tier || 1, at: b.at || '', lock: b.lock || '' }));
    return { unit: UNIT, balance: C.balance, pending: C.pending, held: C.held, convertible: C.convertible, funded: C.funded, par: C.par, ew: C.ew, winLabel: { term: '이번 학기', year: '올해' }[p.tierWindow || p.tier_window] || '최근 12개월', tier, goal, streak: st, expiring: C.expiring, ways,
      sunset: p.sunset || null, daily: cap ? { cap, today: C.today } : null, notice: p.notice || null, expiryLabel: (p.expiry && p.expiry.label) || '', E: C.E, R, Q: C.Q.map(q => q.title ? q : { ...q, title: (R.find(x => x.id === q.rewardId) || {}).title || '보상' }), usable: C.balance, badges: B, kids: [], loaded: true, ruleVer: p.ruleVerLabel || '', rules };
  }

  /* ═════ 화면 조각 ═════ */
  const page = (cls, inner) => `<section class="lm ${cls || ''}"><div class="lm-in">${inner}</div></section>`;
  const head = (t, sub) => `<div class="lm-hd"><h1>${esc(t)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
  const bar = (p, cls) => `<span class="lm-bar${cls ? ' ' + cls : ''}" role="presentation"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span>`;
  const ring = (p, top, sub) => `<span class="lm-ring" style="--p:${Math.max(0, Math.min(100, p))}" role="img" aria-label="${esc(top)} 등급 ${p}%"><b>${esc(top)}</b><small>${esc(sub)}</small></span>`;
  const note = (k, t, b) => `<div class="lm-note ${k}" role="${k === 'err' ? 'alert' : 'note'}">${sv(k === 'ok' ? 'check' : k === 'err' ? 'x' : k === 'lock' ? 'lock' : 'info', 20)}<div><b>${esc(t)}</b>${b ? `<p>${esc(b)}</p>` : ''}</div></div>`;
  const split = M => `<dl class="lm-split"><div><dt>${sv('check', 16)}쓸 수 있어요</dt><dd>${pt(Math.max(0, M.balance))}</dd></div><div><dt>${sv('hour', 16)}적립 예정</dt><dd>${pt(M.pending)}</dd></div><div><dt>${sv('clock', 16)}사용 대기</dt><dd>${pt(M.held)}</dd></div></dl>`;
  function goalCard(M, delta) { const G = M.goal; if (!G) return '';
    return `<section class="lm-card lm-goal" aria-label="다음 목표"><div class="lm-gh"><span class="lm-gi">${sv(G.kind === 'tier' ? 'flag' : 'cap', 24)}</span><span class="lm-gt"><small>다음 목표</small><b>${esc(G.label)}</b></span>${delta ? `<span class="lm-delta">${sv('up', 14)}${sgn(delta)}</span>` : `<span class="lm-gn"><small>남은 마일리지</small><b>${pt(G.need)}</b></span>`}</div>
      ${bar(G.pct)}${G.now != null && G.target != null ? `<div class="lm-gm"><span>지금 <b>${pt(G.now)}</b></span><span>목표 ${pt(G.target)}</span></div>` : ''}
      ${G.need <= 0 ? `<p class="lm-hint">${sv('check', 18)}<span>목표에 도달했어요.</span></p>` : G.hint ? `<p class="lm-hint">${sv('sprout', 18)}<span>${esc(G.hint)}</span></p>` : ''}</section>`; }
  const wayRow = w => `<li class="lm-li"><span class="lm-ic${w.nature === 'participation' ? ' off' : ''}">${sv(w.nature === 'participation' ? 'users' : 'plus', 18)}</span><span class="lm-lt"><b>${esc(w.say)}</b>${w.cap || w.nature === 'participation' ? `<small>${esc(w.cap || '')}${w.nature === 'participation' ? `${w.cap ? ' · ' : ''}참여 적립 · 현금성 보상 제외` : ''}</small>` : ''}</span></li>`;
  const ways = M => M.ways.length ? `<section class="lm-card" aria-labelledby="lmWays"><h2 id="lmWays" class="lm-h2">${sv('sprout', 20)}이렇게 모을 수 있어요</h2><ul class="lm-ul">${M.ways.map(wayRow).join('')}</ul></section>` : '';
  function rowHTML(e, M) { const cancel = e.kind === 'cancel' || e.kind === 'penalty'; const pend = e.status === 'pending'; const ic = pend ? 'hour' : cancel ? 'fix' : e.kind === 'expire' ? 'clock' : e.points > 0 ? 'plus' : e.kind === 'use' || e.kind === 'hold' ? 'gift' : 'link';
    const meta = [md(e.at), pend ? '적립 예정' : KIND[e.kind] || e.kind, e.trust && e.points > 0 ? `<span class="lm-trust" title="${esc(TRUST[e.trust] || '')}">${esc(e.trust)}</span> ${esc(TRUST[e.trust] || '')}` : '', e.expiresAt && e.points > 0 && !pend ? `${esc(md(e.expiresAt))}까지` : ''].filter(Boolean);
    const t = cancel ? `정정 · ${e.title || '기록 정정'}` : e.title || KIND[e.kind] || '마일리지';
    return `<li><button type="button" class="lm-row k-${esc(e.kind)}${pend ? ' pend' : ''}" data-lm="row" data-v="${esc(e.id)}" aria-label="${esc(t)} ${sgn(e.points)} 근거 보기"><span class="lm-ic ${pend ? 'wait' : cancel ? 'bad' : e.points > 0 ? 'ok' : ''}">${sv(ic, 20)}</span>
      <span class="lm-lt"><b>${esc(t)}${pend ? ' (확인 대기)' : ''}</b><small>${meta.map(x => x.startsWith('<') ? x : esc(x)).join(' · ')}</small>${e.funded ? `<small><span class="lm-locktag">${sv('lock', 14)}국비 과정 · 기록만</span></small>` : ''}${cancel && e.reason ? `<small class="lm-why">${esc(e.reason)}</small>` : ''}</span>
      <span class="lm-pv ${pend ? 'wait' : e.points > 0 && !cancel ? 'plus' : ''}">${sgn(e.points)}${pend ? '<small>확인 대기</small>' : ''}</span></button></li>`; }
  function months(L) { const G = []; L.forEach(e => { const k = dayOf(e.at).slice(0, 7); let g = G.find(x => x.k === k); if (!g) G.push(g = { k, rows: [] }); g.rows.push(e); }); return G.map(g => { const plus = g.rows.filter(e => e.points > 0 && e.status !== 'pending' && e.kind !== 'release').reduce((s, e) => s + e.points, 0); const minus = g.rows.filter(e => e.points < 0 && e.kind !== 'hold').reduce((s, e) => s + e.points, 0); return { ...g, label: `${g.k.slice(0, 4) !== today().slice(0, 4) ? g.k.slice(0, 4) + '년 ' : ''}${+g.k.slice(5)}월`, plus, minus }; }); }
  const listHTML = (L, M) => months(L).map(g => `<div class="lm-mon"><span>${esc(g.label)}</span><span>${[g.plus ? '+' + pt(g.plus) : '', g.minus ? pt(g.minus) : ''].filter(Boolean).join(' · ')}</span></div><ul class="lm-rows">${g.rows.map(e => rowHTML(e, M)).join('')}</ul>`).join('');
  const expStrip = M => { const x = M.expiring[0]; if (!x) return ''; return `<a class="lm-exp" href="#mile/exp">${sv('clock', 20)}<span><b>${esc(md(x.at))}</b>에 ${pt(x.points)}${jo(String(x.points) + UNIT, '이', '가')} 소멸 예정이에요. 보상으로 바꿀 수 있어요.</span>${sv('chev', 18)}</a>`; };
  const capNote = M => M.daily && M.daily.cap && M.daily.today >= M.daily.cap ? note('ok', '오늘 마일리지는 다 모았어요.', `남은 학습은 실력으로 쌓여요. 하루 상한 ${pt(M.daily.cap)}에 도달했고, 내일 다시 쌓여요.`) : '';
  function weekHTML(S) { const W = '월화수목금토일';
    return `<ol class="lm-wk" aria-label="이번 주 연속 학습">${S.week.map((w, i) => { const l = w.st === 'rest' ? '쉼' : w.st === 'today' ? '오늘' : W[i]; const sr = { done: '학습함', rest: '쉬는 날', today: '오늘', next: '남은 날', miss: '학습 안 함' }[w.st] || '';
      return `<li class="s-${esc(w.st)}"><span class="lm-dot">${w.st === 'done' ? sv('check', 20) : w.st === 'rest' ? sv('pause', 20) : w.st === 'today' ? sv('play', 20) : ''}</span><small>${l}</small><span class="sr">${W[i]}요일 ${sr}</span></li>`; }).join('')}</ol>`; }
  const streakHead = S => `<div class="lm-sh"><span class="lm-sn">${sv('cal', 24)}<b>${nf(S.n)}일</b><small>연속 학습 중</small></span>${S.freeze != null ? `<span class="lm-pill ok">${sv('pause', 16)}쉬는 날 ${nf(S.freeze)}번 남음</span>` : ''}</div>`;
  const empty = M => { const w = M.ways.find(x => x.nature !== 'participation') || M.ways[0]; return `<section class="lm-empty"><span class="lm-sprout">${sv('sprout', 40)}</span><h2>아직 쌓인 마일리지가 없어요</h2>${w ? `<p>${esc(w.say)}${/[요다]\.?$/.test(w.say) ? '' : `${jo(w.say, '이', '가')} 쌓여요`}.</p>` : ''}<a class="lm-btn pri" href="${esc((w && w.href) || '#my')}">${esc(w && w.act ? `${w.act} 시작하기` : '학습하러 가기')}</a></section>`; };

  /* ── 앱 「나」 카드(시안 a2-01) ── */
  function meCard() { const M = model(); if (!M.loaded) return '';
    const x = M.expiring[0]; const S = M.streak;
    return `<section class="lm-me" aria-labelledby="lmMeH"><div class="lm-meh"><h2 id="lmMeH">${sv('mile', 22)}내 마일리지</h2><a class="lm-more" href="#mile">전체 보기${sv('chev', 18)}</a></div>
      <div class="lm-mb"><div class="lm-bal"><small>잔액</small><b class="lm-big">${nf(M.balance)}<span>${esc(UNIT)}</span></b><small>${[M.pending ? `적립 예정 ${pt(M.pending)}` : '', M.ew ? `${M.winLabel} ${pt(M.ew)}` : ''].filter(Boolean).join(' · ')}</small></div>${M.tier ? ring(M.tier.pct, M.tier.name, `${M.tier.pct}%`) : ''}</div>
      ${M.goal ? `<div class="lm-mg"><span class="lm-mgt">${sv(M.goal.kind === 'tier' ? 'flag' : 'cap', 20)}<b>다음 목표 · ${esc(M.goal.label)}</b></span><b class="lm-mgn">${M.goal.need > 0 ? `남은 ${pt(M.goal.need)}` : '도달'}</b></div>${bar(M.goal.pct)}${M.goal.hint && M.goal.need > 0 ? `<p class="lm-hint s">${sv('sprout', 18)}<span>${esc(M.goal.hint)}</span></p>` : ''}` : ''}
      <a class="lm-mrow" href="#mile/streak">${sv('cal', 20)}<span><b>${nf(S.n)}일</b> 연속 학습 중</span>${S.freeze != null ? `<span class="lm-pill ok">${sv('pause', 14)}쉬는 날 ${nf(S.freeze)}번 남음</span>` : ''}</a>
      ${x ? `<a class="lm-mrow" href="#mile/exp">${sv('clock', 20)}<span><b>${esc(md(x.at))}</b>에 ${pt(x.points)} 소멸 예정이에요</span></a>` : ''}
      ${isPar() ? '' : `<a class="lm-btn wide" href="#mile/rewards">${sv('gift', 20)}보상 보기</a>`}</section>`; }

  /* ── #mile 내 마일리지(시안 a2-02 · a3-07 국비 · a2-12 빈 상태) ── */
  function mainView(M) { const blank = !M.E.length && !M.balance && !M.pending;
    if (blank) return `${head('내 마일리지')}${empty(M)}${ways(M)}${links()}`;
    const fundedBox = M.funded > 0 ? `<div class="lm-fund"><div class="lm-fu ok">${sv('gift', 18)}<small>보상에 쓸 수 있는 양</small><b>${pt(M.convertible)}</b></div><div class="lm-fu lk">${sv('lock', 18)}<b>국비 과정 적립 ${pt(M.funded)}</b><small>배지 · 기록만</small></div></div><div class="lm-lockn">${sv('lock', 20)}<div><b>국비 지원 과정에는 쓸 수 없어요</b><p>국비 지원 과정에서 쌓은 마일리지는 배지와 학습 기록으로 남아요. 할인 · 장학에는 쓸 수 없어요.</p></div></div>` : '';
    return `${head('내 마일리지')}${M.sunset ? note('info', '마일리지 제도가 바뀌어요', [M.sunset.endAt && `${md(M.sunset.endAt)}에 제도가 끝나요.`, M.sunset.stopEarnAt && `${md(M.sunset.stopEarnAt)}부터 새로 쌓이지 않아요.`, '남은 마일리지는 그 전까지 보상으로 바꿀 수 있어요.'].filter(Boolean).join(' ')) : ''}
      <section class="lm-card lm-top" aria-label="마일리지 잔액"><p class="lm-lab">${sv('mile', 18)}마일리지 잔액</p><b class="lm-big">${nf(M.balance)}<span>${esc(UNIT)}</span></b>${M.balance < 0 ? `<p class="lm-mu">정정된 적립이 있어 잔액이 0보다 작아요. 다음 적립에서 먼저 채워져요.</p>` : ''}${split(M)}${fundedBox}</section>
      ${capNote(M)}${goalCard(M)}${ways(M)}
      ${M.E.length ? `<section class="lm-card" aria-labelledby="lmRec"><div class="lm-ch"><h2 id="lmRec" class="lm-h2">${sv('hist', 20)}최근 내역</h2><a class="lm-more" href="#mile/list">전체 내역${sv('chev', 18)}</a></div><ul class="lm-rows">${M.E.slice(0, 3).map(e => rowHTML(e, M)).join('')}</ul></section>` : ''}
      ${expStrip(M)}${links()}`; }
  const links = () => `<nav class="lm-links" aria-label="마일리지 메뉴">${[['#mile/rewards', 'gift', '보상'], ['#mile/req', 'ticket', '내 신청'], ['#mile/badges', 'medal', '배지 지갑'], ['#mile/streak', 'cal', '연속 학습'], ['#mile/list', 'hist', '적립 내역']].map(([h, i, l]) => `<a href="${h}">${sv(i, 20)}<span>${l}</span>${sv('chev', 16)}</a>`).join('')}</nav>`;

  /* ── #mile/list 적립 내역(시안 a2-04) · 근거 시트(a2-05) ── */
  function listView(M) { if (live() && !MI.list) { loadList(); return `${head('적립 내역')}<p class="lm-load" role="status">내역을 불러오고 있어요…</p>`; }
    const F = [['all', '전체'], ['earn', '적립'], ['use', '사용'], ['exp', '소멸 예정']]; const f = MI.f;
    const L = f === 'earn' ? M.E.filter(e => e.points > 0 && ['earn', 'adjust', 'restore'].includes(e.kind)) : f === 'use' ? M.E.filter(e => e.points < 0) : M.E;
    return `${head('적립 내역')}<div class="lm-chips" role="group" aria-label="내역 거르기">${F.map(([k, l]) => k === 'exp' ? `<a class="lm-chip" href="#mile/exp">${l}</a>` : `<button type="button" class="lm-chip${f === k ? ' on' : ''}" data-lm="f" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>
      ${L.length ? `<section class="lm-card lm-list">${listHTML(L, M)}</section><p class="lm-mu c">정정은 지우지 않고 반대 줄로 남아요. 줄을 누르면 근거를 볼 수 있어요.</p>` : `<div class="lm-none">${sv('hist', 28)}<p>${f === 'all' ? '아직 내역이 없어요.' : '이 조건의 내역이 없어요.'}</p></div>`}`; }
  function sheetHTML(M) { const s = MI.sheet; if (!s) return '';
    if (s.t === 'row') { const e = M.E.find(x => x.id === s.id); if (!e) return ''; const ref = e.ref && M.E.find(x => x.id === e.ref); const cancel = e.kind === 'cancel' || e.kind === 'penalty'; const R = (M.rules || []).find(r => r.id === e.ruleId) || {};
      const rows = [['규칙', e.ruleLabel || [R.label, R.say].filter(Boolean).join(' · ')], ['조건', e.cond || R.cond || R.cap || ''], ['과정', e.clsName], ['확인 방식', e.trust ? `${e.trust} ${TRUST[e.trust] || ''}` : ''], ['유효기간', e.expiresAt && e.points > 0 ? `${md(e.expiresAt)}까지` : ''], ['보상에 쓰기', e.points > 0 && e.kind === 'earn' ? (e.funded ? '국비 지원 과정 적립 · 기록만' : e.convertible ? '모든 보상에 쓸 수 있어요' : '참여 적립 · 현금성 보상 제외') : ''], ['규칙 버전', e.ruleVer || M.ruleVer || '']].filter(r => r[1]);
      return `<div class="lm-sheet" role="dialog" aria-modal="true" aria-labelledby="lmShT"><div class="lm-sb"><span class="lm-grip" aria-hidden="true"></span><div class="lm-sth"><span class="lm-ic ${cancel ? 'bad' : e.points > 0 ? 'ok' : ''}">${sv(cancel ? 'fix' : e.points > 0 ? 'plus' : 'gift', 22)}</span><span><small class="${cancel ? 'bad' : ''}">${esc(e.status === 'pending' ? '적립 예정' : KIND[e.kind] || '')} · ${esc(md(e.at))}</small><b id="lmShT">${esc(e.title || KIND[e.kind] || '')}</b></span><b class="lm-pv ${e.points > 0 && !cancel ? 'plus' : ''}">${sgn(e.points)}</b></div>
        ${cancel && e.reason ? note('err', '정정한 이유', e.reason) : e.reason ? note('info', '메모', e.reason) : ''}${e.funded ? note('lock', '국비 지원 과정 적립이에요', '배지와 학습 기록으로 남고, 할인 · 장학 · 쿠폰에는 쓸 수 없어요.') : ''}
        ${rows.length ? `<dl class="lm-kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        ${ref ? `<h3 class="lm-h3">연결된 원 줄</h3><div class="lm-refr">${sv('link', 20)}<span><b>${esc(ref.title)}</b><small>${esc([md(ref.at), KIND[ref.kind], ref.expiresAt ? md(ref.expiresAt) + '까지' : ''].filter(Boolean).join(' · '))}</small></span><b class="lm-pv plus">${sgn(ref.points)}</b></div>` : ''}
        <button type="button" class="lm-btn wide" data-lm="close">닫기</button></div></div>`; }
    if (s.t === 'redeem') { const r = M.R.find(x => x.id === s.id); if (!r) return ''; const v = s.points; const usable = r.cash ? M.convertible : Math.max(0, M.balance); const left = r.left != null ? r.left : null;
      const rows = [['쓸 양', pt(v)], ['신청 후 쓸 수 있어요', pt(Math.max(0, M.balance - v))], ['처리 방식', r.how || (r.approval === 'auto' ? '자동' : '담당자 확인 후')], ['처리 기간', r.period || (r.approval === 'auto' ? '바로 처리돼요' : '보통 영업일 3일 안에 알려 드려요')], ...(r.perMonth ? [['이번 달 한도', `월 ${r.perMonth}번${left != null ? ` 중 ${left}번 남음` : ''}`]] : []), ...(r.wonPerP && r.kind === 'tuition' ? [['청구서에서 빠지는 금액', `${nf(v * r.wonPerP)}원`]] : [])];
      const variable = r.cost == null; const err = s.err || '';
      return `<div class="lm-sheet" role="dialog" aria-modal="true" aria-labelledby="lmShT"><form class="lm-sb" id="lmRdF"><span class="lm-grip" aria-hidden="true"></span><div class="lm-sth"><span class="lm-ic ok">${sv('gift', 22)}</span><span><small>보상 신청</small><b id="lmShT">${esc(r.title)}${jo(r.title, '으로', '로')} 바꿀까요?</b></span></div>
        ${variable ? `<label class="lm-fl" for="lmRdP">쓸 양(${esc(UNIT)})<input id="lmRdP" name="p" type="number" inputmode="numeric" min="${r.min || r.step}" max="${Math.min(usable, r.max || usable)}" step="${r.step}" value="${v}" required></label><p class="lm-mu">${[r.min ? `최소 ${pt(r.min)}` : '', r.max ? `최대 ${pt(r.max)}` : '', r.step > 1 ? `${pt(r.step)} 단위` : ''].filter(Boolean).join(' · ')}</p>` : ''}
        <dl class="lm-kv">${rows.map(([k, x]) => `<div><dt>${esc(k)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>
        ${note('info', '신청하면 바로 잡아 둬요', `${pt(v)}는 「사용 대기」로 옮겨져 다른 보상에 쓰이지 않아요. ${r.approval === 'auto' ? '받기 전에는' : '처리되기 전에는'} 신청을 취소할 수 있어요.`)}${r.cash && M.funded > 0 ? note('lock', '국비 지원 과정 적립은 빠져요', '국비 지원 과정에서 쌓은 마일리지는 이 보상에 쓸 수 없어요.') : ''}
        ${err ? `<p class="lm-err" role="alert">${esc(err)}</p>` : ''}<div class="lm-acts"><button type="button" class="lm-btn" data-lm="close">취소</button><button type="submit" class="lm-btn pri"${MI.sending ? ' disabled' : ''}>${MI.sending ? '신청하고 있어요…' : `${pt(v)}로 신청하기`}</button></div></form></div>`; }
    return ''; }

  /* ── #mile/exp 소멸 예정(시안 a2-06) ── */
  function expView(M) { const X = M.expiring; const tot = X.reduce((s, x) => s + x.points, 0); const n = M.notice || {}; const mb = n.monthsBefore ?? 6; const dB = Array.isArray(n.daysBefore) ? n.daysBefore : [30, 3]; const x0 = X[0];
    if (!X.length) return `${head('소멸 예정')}<div class="lm-none">${sv('check', 28)}<p>${mb}개월 안에 소멸될 마일리지가 없어요.</p><a class="lm-btn" href="#mile">내 마일리지로</a></div>`;
    return `${head('소멸 예정')}<section class="lm-card" aria-label="소멸 예정 마일리지"><p class="lm-lab">${sv('clock', 18)}${mb}개월 안에 소멸될 마일리지</p><b class="lm-big">${nf(tot)}<span>${esc(UNIT)}</span></b>
      <table class="lm-tbl"><thead><tr><th scope="col">소멸 날짜</th><th scope="col">양</th><th scope="col">어디서 쌓였나요</th></tr></thead><tbody>${X.map(x => `<tr><td>${esc(md(x.at))}</td><td>${pt(x.points)}</td><td>${esc([...new Set(x.src || [])].slice(0, 2).join(', ') || '-')}</td></tr>`).join('')}</tbody></table>
      <p class="lm-say"><b>${esc(md(x0.at))}</b>에 <b>${pt(x0.points)}</b>${jo(String(x0.points) + UNIT, '이', '가')} 소멸돼요. 보상으로 바꿀 수 있어요.</p>
      <p class="lm-hint i">${sv('info', 18)}<span>보상에 쓰면 먼저 소멸될 마일리지부터 빠져요.${M.expiryLabel ? ` 유효기간은 ${esc(M.expiryLabel)}이에요.` : ''}</span></p>${isPar() ? '' : `<a class="lm-btn pri wide" href="#mile/rewards">${sv('gift', 20)}보상으로 바꾸기</a>`}</section>
      <section class="lm-card" aria-labelledby="lmNt"><h2 id="lmNt" class="lm-h2">${sv('info', 20)}소멸 알림 받는 방법</h2><dl class="lm-kv l">${mb ? `<div><dt>매월 1일</dt><dd>소멸 ${mb}개월 전부터 한 번에 묶어 알려 드려요</dd></div>` : ''}${dB.map(d => { const at = addD(x0.at, -d); return at >= today() ? `<div><dt>${esc(md(at))}</dt><dd>${d}일 전 알림</dd></div>` : ''; }).join('')}</dl><p class="lm-mu">알림은 앱 알림함으로 받아요. 이메일은 기관 설정을 따라요.</p><a class="lm-btn wide" href="#connect">알림 설정 보기</a></section>`; }

  /* ── #mile/rewards 보상(시안 a2-07 · a2-08) ── */
  function rewardsView(M) { if (live() && !MI.rw) { loadRw(); return `${head('보상')}<p class="lm-load" role="status">보상 목록을 불러오고 있어요…</p>`; }
    const R = M.R; const sch = R.filter(r => r.kind === 'scholar'); const other = R.filter(r => r.kind !== 'scholar');
    const tx = r => { if (r.kind === 'badge' || r.kind === 'cert') return r.owned ? `<span class="lm-pill ok">${sv('check', 14)}받았어요</span>` : `<span class="lm-pill">${sv('lock', 14)}조건 달성 시</span>`;
      const need = r.cost != null ? r.cost : Math.max(r.min, r.step); const pool = r.cash ? M.convertible : Math.max(0, M.balance);
      const why = r.lock === 'funded' ? '국비 지원 과정에는 쓸 수 없어요' : r.lock ? String(r.lock) : M.balance < 0 ? '정정된 적립을 먼저 채워야 해요' : r.stock === 0 ? '지금은 재고가 없어요' : r.left === 0 ? '이번 달 한도를 다 썼어요' : r.threshold && pool < r.threshold ? `${pt(r.threshold)}부터 신청할 수 있어요` : pool < need ? `${pt(need - pool)} 더 모으면 돼요` : r.locked ? ERR[r.locked] || '지금은 신청할 수 없어요' : '';
      return why ? `<span class="lm-rv"><b>${r.cost != null ? pt(r.cost) : `${pt(need)}부터`}</b><small>${sv('lock', 14)}${esc(why)}</small></span>` : `<button type="button" class="lm-btn pri sm" data-lm="redeem" data-v="${esc(r.id)}" aria-label="${esc(r.title)} 신청">${r.cost != null ? pt(r.cost) : `${pt(need)}부터`} · 신청</button>`; };
    const meta = r => [r.how, r.stock != null && r.stock > 0 ? `재고 ${nf(r.stock)}` : '', r.perMonth ? `월 ${r.perMonth}번${r.left != null ? ` 중 ${r.left}번 남음` : ''}` : ''].filter(Boolean).join(' · ');
    return `${head('보상')}<section class="lm-card" aria-label="쓸 수 있는 마일리지"><div class="lm-ub"><span>${sv('check', 18)}쓸 수 있어요</span><b>${pt(Math.max(0, M.usable))}</b></div>${M.convertible < Math.max(0, M.balance) ? `<p class="lm-mu">식권 · 할인처럼 기관 예산이 드는 보상에는 <b class="g">${pt(M.convertible)}</b>까지 쓸 수 있어요.${M.par ? ` 설문 같은 참여 적립 ${pt(M.par)}는 빠져요.` : ''}${M.funded ? ` 국비 지원 과정 적립 ${pt(M.funded)}도 빠져요.` : ''}</p>` : ''}</section>
      ${sch.map(s => `<section class="lm-card lm-sch"><div class="lm-rw"><span class="lm-gi">${sv('cap', 24)}</span><span class="lm-lt"><b>${esc(s.title)}</b>${s.how ? `<small>${esc(s.how)}</small>` : ''}</span></div>${s.tiers ? `<table class="lm-tbl">${s.tiers.map(t => `<tr><td><b>${esc(t.name || t[0])}</b></td><td>${pt(+(t.min ?? t[1]))}</td><td>${t.won || t[2] ? nf(t.won || t[2]) + '원' : ''}</td><td>${t.seats || t[3] ? (t.seats || t[3]) + '명까지' : ''}</td></tr>`).join('')}</table>` : ''}<p class="lm-hint i">${sv('info', 18)}<span>장학금은 학교가 심사해 지급해요. 디디쌤은 심사용 명단만 학교에 전해요.</span></p>${s.window ? `<span class="lm-btn dis wide" aria-disabled="true">${sv('clock', 18)}${esc(s.window)}</span>` : ''}</section>`).join('')}
      ${other.length ? `<section class="lm-card"><ul class="lm-ul">${other.map(r => `<li class="lm-li lm-rwi${r.lock === 'funded' ? ' locked' : ''}"><span class="lm-ic">${sv(r.kind === 'badge' || r.kind === 'cert' ? 'cert' : r.kind === 'tuition' ? 'ticket' : 'gift', 18)}</span><span class="lm-lt"><b>${esc(r.title)}</b>${meta(r) ? `<small>${esc(meta(r))}</small>` : ''}</span>${tx(r)}</li>`).join('')}</ul></section>` : sch.length ? '' : `<div class="lm-none">${sv('gift', 28)}<p>아직 기관이 준비한 보상이 없어요.</p></div>`}
      <a class="lm-btn wide" href="#mile/req">${sv('ticket', 20)}내 신청 보기</a>`; }

  /* ── #mile/req 내 신청(시안 a2-08b) ── */
  function reqView(M) { if (live() && !MI.rw) { loadRw(); return `${head('내 신청')}<p class="lm-load" role="status">신청 내역을 불러오고 있어요…</p>`; }
    const Q = M.Q; const step = q => { const S = [['신청', true], ['승인', ['approved', 'fulfilled'].includes(q.status)], ['수령', q.status === 'fulfilled']]; return `<ol class="lm-steps" aria-label="처리 단계">${S.map(([l, d], i) => `<li class="${d ? 'on' : ''}${!d && (i === 0 || S[i - 1][1]) ? ' cur' : ''}"><span>${d ? sv('check', 16) : ''}</span><b>${l}</b><i class="sr">${d ? '끝남' : '남음'}</i></li>`).join('')}</ol>`; };
    return `${head('내 신청')}${split(M)}${Q.length ? Q.map(q => { const [lab, k] = QST[q.status] || [q.status, '']; const bad = q.status === 'rejected' || q.status === 'reclaimed';
      return `<article class="lm-card lm-q" aria-label="${esc(q.title)} ${esc(lab)}"><div class="lm-rw"><span class="lm-gi${bad ? ' bad' : ''}">${sv(bad ? 'x' : 'gift', 22)}</span><span class="lm-lt"><b>${esc(q.title || '보상')}</b><small>${esc([md(q.at), q.no, pt(q.points)].filter(Boolean).join(' · '))}</small></span><span class="lm-pill ${k}">${sv(k === 'ok' ? 'check' : k === 'bad' ? 'x' : 'clock', 14)}${esc(lab)}</span></div>
        ${['requested', 'approved', 'fulfilled', 'guardian'].includes(q.status) ? step(q) : ''}${q.code && !['cancelled', 'rejected', 'reclaimed'].includes(q.status) ? `<div class="lm-code"><span>${sv('ticket', 20)}${q.status === 'fulfilled' ? '쿠폰 코드' : '수령 코드'}</span><b>${esc(q.code)}</b></div>` : ''}
        ${q.status === 'guardian' ? `<p class="lm-mu">보호자님이 확인하면 기관에 전달돼요.</p>` : ''}${bad && q.reason ? `<p class="lm-why b">${esc(q.reason)}</p>` : ''}
        ${q.status === 'requested' || q.status === 'guardian' || q.cancellable ? `<div class="lm-qa"><button type="button" class="lm-btn" data-lm="rcancel" data-v="${esc(q.id)}">신청 취소</button><small>처리되기 전까지 취소할 수 있어요. 취소하면 ${pt(q.points)}${jo(String(q.points) + UNIT, '이', '가')} 바로 돌아와요.</small></div>` : ''}</article>`; }).join('') : `<div class="lm-none">${sv('ticket', 28)}<p>아직 신청한 보상이 없어요.</p><a class="lm-btn" href="#mile/rewards">보상 보기</a></div>`}`; }

  /* ── #mile/badges 배지 지갑(시안 a2-09) — 모양으로 단계 구분: 기록 원 · 성취 방패 · 인증 육각 ── */
  const TIERN = { 1: '기록', 2: '성취', 3: '인증' };
  const bdg = b => `<li class="lm-bd t${b.lock ? 'l' : b.tier}"><span class="lm-bs">${sv(b.tier === 3 ? 'cert' : b.tier === 2 ? 'medal' : /연속/.test(b.name) ? 'cal' : 'flag', 30)}${b.tier === 3 && !b.lock ? `<i class="lm-ok">${sv('check', 14)}</i>` : ''}</span><b>${esc(b.name)}</b><small>${b.lock ? `${sv('lock', 14)}${esc(b.lock)}` : esc(TIERN[b.tier] || '기록')}</small></li>`;
  function allBadges(M) { const S = M.streak; const got = M.badges.filter(b => !b.lock); const ms = [7, 30, 100].map(n => ({ id: 'streak' + n, name: `${n}일 연속 학습`, tier: 1, lock: S.n >= n || got.some(b => b.id === 'streak' + n) ? '' : `${n - S.n}일 남음` }));
    const L = [...got, ...ms.filter(m => !got.some(b => b.id === m.id || b.name === m.name)), ...M.badges.filter(b => b.lock)]; return L.sort((a, b) => (!!a.lock - !!b.lock) || (a.tier - b.tier)); }
  function badgesView(M) { const L = allBadges(M); const got = L.filter(b => !b.lock); const c = t => got.filter(b => b.tier === t).length;
    return `${head('배지 지갑')}<section class="lm-card"><div class="lm-ub"><span>${sv('medal', 20)}모은 배지</span><b>${got.length}<small>개</small></b></div><ul class="lm-tl"><li>${sv('flag', 18)}<b>기록 ${c(1)}</b> · 원 모양 · 처음 해 본 일, 연속 학습 마일스톤</li><li>${sv('medal', 18)}<b>성취 ${c(2)}</b> · 방패 모양 · 정해진 기준을 달성</li><li>${sv('cert', 18)}<b>인증 ${c(3)}</b> · 육각 · 리본 · 기관이 검증</li></ul></section>
      <section class="lm-card"><ul class="lm-bds">${L.map(bdg).join('')}</ul></section><p class="lm-mu c">배지는 학습 기록이에요. 다른 사람과 비교하는 순위는 없어요.</p>`; }

  /* ── #mile/streak 연속 학습 · 복구(시안 a2-10) ── */
  function streakView(M) { const S = M.streak; const cfg = streakCfg(); const R = S.repair; const mt = minToday();
    const ms = [7, 30, 100].map(n => ({ id: 's' + n, name: `${n}일 연속`, tier: 1, lock: S.n >= n ? '' : `${n - S.n}일 남음` }));
    return `${head('연속 학습')}<section class="lm-card">${streakHead(S)}${weekHTML(S)}<p class="lm-mu">하루 쉬어도 연속은 이어져요. 쉬는 날은 매주 ${cfg.freezePerWeek ?? 1}번 새로 생겨요.</p></section>
      ${R ? `<section class="lm-card lm-rep" aria-labelledby="lmRep"><h2 id="lmRep" class="lm-h2">${sv('fix', 20)}다시 시작해요</h2><p>${esc(md(R.until ? new Date(R.until).toISOString() : today()))} ${new Date((R.until || 0) + 9 * 3600e3).toISOString().slice(11, 16)}까지 <b>복구 학습 ${nf(R.need)}분</b>을 하면 연속이 이어져요. 한 달에 1번 쓸 수 있어요.</p>${bar(Math.min(100, Math.round(mt / Math.max(1, R.need) * 100)))}<div class="lm-gm"><span>오늘 <b>${nf(mt)}분</b></span><span>복구 ${nf(R.need)}분</span></div>${mt >= R.need ? `<button type="button" class="lm-btn pri wide" data-lm="repair">연속 이어 가기</button>` : `<a class="lm-btn pri wide" href="#home">${sv('play', 20)}복구 학습 하러 가기</a>`}</section>` : ''}
      <section class="lm-card"><h2 class="lm-h2">${sv('pause', 20)}쉬어도 괜찮아요</h2><ul class="lm-tl"><li>${sv('check', 18)}하루 학습 목표를 채우면 연속이 하루 늘어요.</li><li>${sv('fix', 18)}연속이 멈춰도 ${cfg.repair && cfg.repair.withinH || 48}시간 안에 <b>복구 학습</b>(평소 목표의 ${cfg.repair && cfg.repair.factor || 2}배 1번)을 하면 이어져요. 한 달에 ${cfg.repair && cfg.repair.perMonth || 1}번 쓸 수 있어요.</li></ul></section>
      <section class="lm-card"><h2 class="lm-h2">${sv('flag', 20)}연속 학습 배지</h2><ul class="lm-bds three">${ms.map(bdg).join('')}</ul></section>
      ${note('info', '멈춰도 알림을 보내지 않아요', '다음에 들어오면 「다시 시작해요」라고만 알려 드려요. 연속 학습은 배지로만 남고, 마일리지가 줄지 않아요.')}`; }

  /* ── 보호자: 자녀 마일리지 요약 · 보상 신청 확인(시안 a3-04) ── */
  function guardView() { const K = live() ? (MI.my && MI.my.kids || []).map(k => ({ sid: String(k.sid || ''), label: k.label || k.nick || '자녀', M: null, k })) : kidsDemo().map(k => ({ ...k, M: model(k.sid) }));
    if (!K.length) return `${head('자녀 마일리지')}<div class="lm-none"><p>연결된 자녀가 없어요.</p><a class="lm-btn" href="#family">자녀 연결</a></div>`;
    return `${head('자녀 마일리지')}${K.map(k => { const M = k.M; const bal = M ? M.balance : int(k.k.balance); const Q = M ? M.Q.filter(q => q.status === 'guardian') : (k.k.requests || (k.k.guardianPending || []).map(x => ({ ...x, guardian: 'pending', title: x.title || '보상 신청' }))).map(nQ).filter(q => q.status === 'guardian'); UNIT = (M && M.unit) || UNIT;
      return `<section class="lm-card" aria-label="${esc(k.label)} 마일리지"><div class="lm-ub"><span>${sv('users', 20)}${esc(k.label)}</span><b>${pt(bal)}</b></div>${M ? split(M) : ''}
        ${Q.map(q => `<article class="lm-gq"><span class="lm-pill wait">${sv('clock', 14)}보호자 확인 대기</span><b>${esc(q.title)} · ${pt(q.points)}</b><small>${esc(md(q.at))} 신청 · 확인 전까지 잡아 둬요. 거절하면 바로 돌아가요.</small>${`<div class="lm-acts"><button type="button" class="lm-btn" data-lm="guard" data-v="${esc(q.id)}" data-d="no">거절</button><button type="button" class="lm-btn pri" data-lm="guard" data-v="${esc(q.id)}" data-d="ok">${sv('check', 18)}확인하고 신청 보내기</button></div>`}</article>`).join('')}</section>`; }).join('')}
      ${note('info', '보호자 확인이 필요한 신청', '자녀가 미성년이면 할인 · 쿠폰 같은 보상 신청은 보호자님이 확인해야 기관에 전달돼요.')}`; }

  function view() { const seg = decodeURIComponent(location.hash.slice(1)).split(/[?#]/)[0].split('/').slice(1); const b = seg[0] || '';
    if (!LR.me) return page('lm-off', head('내 마일리지') + `<div class="lm-none">${sv('lock', 28)}<p>마일리지는 로그인한 뒤 볼 수 있어요.</p><a class="lm-btn pri" href="#login/mile">로그인</a></div>`);
    if (live() && !MI.my && !MI.off) { if (!MI.err) { loadMy(); return page('lm-load', head('내 마일리지') + '<p class="lm-load" role="status">마일리지를 불러오고 있어요…</p>'); } return page('lm-off', head('내 마일리지') + `<div class="lm-none"><p>${esc(MI.err)}</p><button type="button" class="lm-btn" data-lm="reload">다시 불러오기</button></div>`); }
    if (isPar()) return page('lm-g', guardView());
    const M = model(); let h;
    if (b === 'list') h = listView(M); else if (b === 'exp') h = expView(M); else if (b === 'rewards') h = rewardsView(M); else if (b === 'req') h = reqView(M); else if (b === 'badges') h = badgesView(M); else if (b === 'streak') h = streakView(M); else h = mainView(M);
    if (live() && ['', 'list'].includes(b) && !MI.list) loadList();
    return page('lm-' + (b || 'main'), h) + sheetHTML(M); }

  /* ── 라우팅: 꺼진 기관은 기본(없는 주소) 화면 ── */
  { const base = viewPage; viewPage = (id, ...a) => { if (id !== 'mile') return base(id, ...a); try { if (LR.me && !live() && !on()) return base(id, ...a); if (live() && LR.me && MI.off) return base(id, ...a); return view(); } catch (e) { console.error('lmil', e); return page('lm-off', '<p class="lm-none">마일리지 화면을 그리지 못했어요. 새로 고침해 주세요.</p>'); } }; }

  /* ── 웹 마이페이지 블록(시안 a2-13) — MYB_DEF에 「내 마일리지」 등록, 관리자가 끄면 숨김 ── */
  try { if (typeof MYB_DEF !== 'undefined' && !MYB_DEF.some(x => x[0] === 'mile')) MYB_DEF.splice(1, 0, ['mile', '내 마일리지']); } catch (e) { }
  function webBlock() { const M = model(); if (!M.loaded) return ''; const S = M.streak;
    return `<div class="mycard wide lm-myb" id="m-mile"><div class="mh lm-ch" id="m-mile-h"><h3>내 마일리지</h3><a class="lm-more" href="#mile">내역 · 보상${sv('chev', 16)}</a></div>
      <div class="lm-wg"><div class="lm-wl">${M.tier ? `<div class="lm-wt">${ring(M.tier.pct, M.tier.name, M.tier.pct + '%')}<small>${esc(M.tier.name)} 등급${M.tier.next ? ` · ${esc(M.tier.next)}까지 ${pt(M.tier.left)}` : ''}</small></div>` : ''}<div class="lm-wb"><p class="lm-lab">${sv('mile', 18)}마일리지 잔액</p><b class="lm-big">${nf(M.balance)}<span>${esc(UNIT)}</span></b>${split(M)}</div></div>${M.goal ? goalCard(M) : ''}</div>
      <div class="lm-ws">${streakHead(S)}${weekHTML(S)}</div>
      ${M.E.length ? `<ul class="lm-rows">${M.E.slice(0, 3).map(e => rowHTML(e, M)).join('')}</ul>` : empty(M)}${expStrip(M)}
      <div class="lm-acts"><a class="lm-btn" href="#mile/list">${sv('hist', 18)}전체 내역</a><a class="lm-btn pri" href="#mile/rewards">${sv('gift', 18)}보상 보기</a></div></div>`; }
  /* 앱(로그인한 학습자 기본 · lapp.js appOn과 같은 조건)은 「나」 카드, 웹(클래식 보기)은 마이페이지 블록 */
  const appMode = () => { try { return document.body.classList.contains('lapp') || (LR.mode !== 'preview' && localStorage.getItem('didisam.app.classic') !== '1' && !!LR.me); } catch (e) { return document.body.classList.contains('lapp'); } };
  if (typeof viewMy === 'function') { const base = viewMy; viewMy = (...a) => { const h = base(...a); try { if (!LR.me || isPar() || !on() || appMode()) return h; const B = (SITE().my && SITE().my.blocks) || null; const set = B && B.find(x => x[0] === 'mile'); if (set && !set[1]) return h; if (live() && !MI.my) { loadMy(); return h; } const blk = webBlock(); return blk ? h.replace('<div class="mygrid">', '<div class="mygrid">' + blk) : h; } catch (e) { console.error('lmil my', e); return h; } }; }

  /* ═════ 동작 ═════ */
  let rerT = 0; const rer = soft => { if (soft && !['mile', 'acct', 'home', 'my', 'done', 'family'].includes(route().a)) return; clearTimeout(rerT); rerT = setTimeout(() => { const y = scrollY; lrender(); requestAnimationFrame(() => scrollTo(0, y)); }, 0); };
  const ERR = { insufficient: '쓸 수 있는 마일리지가 모자라요.', below_threshold: '아직 신청할 수 있는 기준점에 닿지 않았어요.', negative_balance: '정정된 적립을 먼저 채워야 신청할 수 있어요.', out_of_stock: '지금은 재고가 없어요.', funded_blocked: '국비 지원 과정에서 쌓은 마일리지는 이 보상에 쓸 수 없어요.', mile_off: '이 기관은 지금 마일리지를 쓰지 않아요.', already: '이미 처리된 신청이에요.', rate: '요청이 많아요. 잠시 후 다시 시도해 주세요.', amount_mismatch: '마일리지가 바뀌었어요. 화면을 새로 불러온 뒤 다시 신청해 주세요.', state: '이미 처리된 신청이에요.', not_found: '신청을 찾지 못했어요.', repair_need: '복구 학습 시간을 먼저 채워 주세요.' };
  const errMsg = e => ERR[e && e.code] || (e && e.status === 401 ? '로그인이 끝났어요. 다시 로그인해 주세요.' : '') || (e && e.message) || '신청하지 못했어요.';
  function openRedeem(id) { const M = model(); const r = M.R.find(x => x.id === id); if (!r) return; const pool = r.cash ? M.convertible : Math.max(0, M.balance); const v = r.cost != null ? r.cost : Math.max(r.min || r.step, Math.min(r.max || pool, pool - pool % r.step));
    MI.idem = 'lm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); MI.sheet = { t: 'redeem', id, points: v, err: '' }; rer(); }
  async function submitRedeem(fm) { const s = MI.sheet; if (!s || MI.sending) return; const M = model(); const r = M.R.find(x => x.id === s.id); if (!r) return; let v = s.points; if (fm.p) { v = int(fm.p.value); s.points = v; }
    const pool = r.cash ? M.convertible : Math.max(0, M.balance);
    if (!live()) { const e = M.balance < 0 ? 'negative_balance' : v > pool ? 'insufficient' : r.threshold && pool < r.threshold ? 'below_threshold' : r.stock === 0 ? 'out_of_stock' : r.min && v < r.min ? 'insufficient' : ''; if (e || v <= 0) { s.err = ERR[e] || '쓸 양을 확인해 주세요.'; rer(); return; } }
    if (LR.mode === 'preview') { toast('미리보기에서는 신청할 수 없어요.', 'warn'); return; }
    if (live()) { MI.sending = true; s.err = ''; rer();
      try { const j = await lapi('POST', P('redeem'), { rewardId: r.id, points: v, idem: MI.idem }); MI.sending = false; MI.sheet = null; MI.rw = null; MI.my = null; MI.list = null; await loadMy(true); loadRw(true); toast(j.status === 'guardian' || j.guardian === 'pending' ? '신청했어요. 보호자님이 확인하면 기관에 전달돼요.' : `신청했어요. ${pt(v)}를 사용 대기로 잡아 뒀어요.`, 'ok'); if (route().a === 'mile') location.hash = '#mile/req'; }
      catch (e) { MI.sending = false; s.err = errMsg(e); if (e.code === 'amount_mismatch' || e.code === 'insufficient') { MI.rw = null; MI.my = null; loadMy(true); } rer(); } return; }
    const o = ov(); const sid = LR.me.sid; const id = 'mrd_l' + Date.now().toString(36); const minor = !!(LR.me.minor || LR.me.age14) && r.cash; const auto = r.approval === 'auto' && !minor;
    const no = 'RQ-' + today().slice(2, 4) + today().slice(5, 7) + '-' + String(o.redeems.length + 101).slice(-3);
    o.redeems.push({ id, sid, rewardId: r.id, title: r.title, points: v, status: minor ? 'guardian' : auto ? 'approved' : 'requested', at: new Date(nowD()).toISOString(), no, code: auto && r.kind !== 'tuition' ? `${String(Math.floor(1000 + Math.random() * 8999))}-${String(Math.floor(1000 + Math.random() * 8999))}` : '', idem: MI.idem });
    if (!ovSave()) return; if (typeof lpxPush === 'function') lpxPush('mile-redeem', { id, redeemId: id, rewardId: r.id, points: v, sid, idem: MI.idem }); MI.sheet = null;
    toast(minor ? '신청했어요. 보호자님이 확인하면 기관에 전달돼요.' : `신청했어요. ${pt(v)}를 사용 대기로 잡아 뒀어요.`, 'ok'); location.hash = '#mile/req'; rer(); }
  async function cancelRedeem(id) { if (!confirm('이 신청을 취소할까요? 잡아 둔 마일리지는 바로 돌아와요.')) return;
    if (live()) { try { await lapi('POST', P('redeem-cancel'), { id }); MI.rw = null; MI.my = null; await loadMy(true); loadRw(true); toast('신청을 취소했어요. 마일리지가 돌아왔어요.', 'ok'); } catch (e) { toast(errMsg(e), 'bad'); } return; }
    const o = ov(); let q = o.redeems.find(x => x.id === id); if (!q) { const src = (demoSrc() || {}).redeems || []; const s = src.find(x => x.id === id); if (s) { q = { ...s, sid: s.sid || LR.me.sid }; o.redeems.push(q); } } if (!q || !['requested', 'guardian'].includes(q.status)) { toast('이미 처리된 신청이에요.', 'warn'); return; }
    q.status = 'cancelled'; if (!ovSave()) return; if (typeof lpxPush === 'function') lpxPush('mile-redeem-cancel', { id, redeemId: id }); toast('신청을 취소했어요. 마일리지가 돌아왔어요.', 'ok'); rer(); }
  async function guard(id, d) { if (live()) { try { await lapi('POST', P('guardian'), { id, ok: d === 'ok' }); MI.my = null; await loadMy(true); toast(d === 'ok' ? '확인했어요. 기관에 신청을 보냈어요.' : '거절했어요. 잡아 둔 마일리지는 돌려드렸어요.', 'ok'); } catch (e) { toast(errMsg(e), 'bad'); } return; }
    const o = ov(); o.guard[id] = d; if (!ovSave()) return; if (typeof lpxPush === 'function') lpxPush('mile-guardian', { id, redeemId: id, ok: d === 'ok' }); toast(d === 'ok' ? '확인했어요. 기관에 신청을 보냈어요.' : '거절했어요. 잡아 둔 마일리지는 돌려드렸어요.', 'ok'); rer(); }
  async function repair() { if (live()) { try { const j = await lapi('POST', P('streak-repair')); MI.my = null; await loadMy(true); toast(j.again ? '이미 이어진 연속 학습이에요.' : '연속 학습을 이어 갔어요.', 'ok'); } catch (e) { toast(e.code === 'repair_need' ? `복구 학습 ${int((e.extra || {}).need) || ''}분을 채운 뒤 다시 눌러 주세요.` : errMsg(e), 'bad'); } return; }
    const S = streakLocal(); if (!S.repair) return; const o = ov(); const days = []; for (let d = addD(S.repair.from, 1); d < today(); d = addD(d, 1)) days.push(d); o.repair[today()] = { days }; if (!ovSave()) return; if (typeof lpxPush === 'function') lpxPush('mile-streak-repair', { days, sid: LR.me.sid }); toast('연속 학습을 이어 갔어요.', 'ok'); rer(); }
  /* 시연판 적립(체험 · 테스트): 하루 상한을 넘지 않게 잘라 적립하고 토스트 */
  MI.demoEarn = (title, points, o = {}) => { if (live() || !LR.me) return null; const M = model(); let p = int(points); if (M.daily && M.daily.cap) p = Math.max(0, Math.min(p, M.daily.cap - M.daily.today)); if (!p) { toast('오늘 마일리지는 다 모았어요. 남은 학습은 실력으로 쌓여요.', 'ok'); return null; }
    const v = ov(); const e = { id: 'me_l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), sid: LR.me.sid, kind: 'earn', points: p, status: 'posted', at: new Date(nowD()).toISOString(), title, trust: o.trust || 'A', nature: o.nature || 'achievement', convertible: o.nature !== 'participation', expiresAt: o.expiresAt || addD(today(), 365) + 'T14:59:59Z', ruleId: o.ruleId || '' };
    v.entries.push(e); ovSave(); earnCheck(); rer(); return e; };

  /* ── 적립 순간 토스트(시안 a2-11): 학습 내용 앞 · +숫자 뒤, 효과음 · 폭죽 없음 ── */
  const seenK = () => `${LR.tid || 'x'}.${(LR.me || {}).sid || ''}`;
  function earnCheck() { if (!LR.me || isPar() || !on()) return; if (live() && !MI.my) return; let M; try { M = model(); } catch (e) { return; }
    const o = live() ? (() => { try { return JSON.parse(localStorage.getItem('didisam.mile.seen') || '{}'); } catch (e) { return {}; } })() : ov().seen; const k = seenK();
    const fresh = live() ? (MI.my && Array.isArray(MI.my.recent) ? MI.my.recent.map(nE) : (MI.list || [])).filter(e => e.kind === 'earn' && e.status === 'posted') : M.E.filter(e => e.kind === 'earn' && e.status === 'posted');
    const ids = fresh.map(e => e.id); const prev = o[k]; o[k] = ids.slice(0, 60).concat(Array.isArray(prev) ? prev.filter(x => !ids.includes(x)).slice(0, 40) : []);
    try { if (live()) localStorage.setItem('didisam.mile.seen', JSON.stringify(o)); else ovSave(); } catch (e) { }
    if (!Array.isArray(prev)) return; /* 처음 본 기기: 지난 적립을 한꺼번에 알리지 않는다 */
    const N = fresh.filter(e => !prev.includes(e.id)); if (!N.length) return; const e = N[0]; const sum = N.reduce((s, x) => s + x.points, 0);
    const capHit = M.daily && M.daily.cap && M.daily.today >= M.daily.cap;
    showToast(`${e.title || '학습'}${N.length > 1 ? ` 외 ${N.length - 1}건` : ''}${jo(e.title || '학습', '으로', '로')} 쌓였어요`, sgn(sum), capHit ? '오늘 마일리지는 다 모았어요.' : ''); }
  function showToast(t, v, sub) { document.querySelectorAll('.lm-toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'lm-toast'; d.setAttribute('role', 'status');
    d.innerHTML = `${sv('mile', 22)}<span><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><em>${esc(v)}</em>`; document.body.appendChild(d); setTimeout(() => d.classList.add('out'), 4200); setTimeout(() => d.remove(), 4700); }

  /* ── 가장 바깥 꾸미기: 「나」 카드 · 홈 오늘 목표 보조문 · #done 하루 상한 · 보호자 #family · 하단 탭 · 제목 ── */
  function post() { if (!SITE() || !SITE().org) return; const a = route().a; const lm = document.getElementById('lm'); if (!lm || !LR.me) return;
    if (live() && !MI.my && !MI.busy && !MI.off && ['acct', 'home', 'my', 'done', 'mile', 'family'].includes(a)) loadMy();
    if (!on()) { document.querySelectorAll('.lm-me, .lm-myb, .lm-gp, .lm-cap').forEach(x => x.remove()); return; }
    if (document.body.classList.contains('lapp')) lm.querySelectorAll('.lm-myb').forEach(x => x.remove());
    if (a === 'acct' && !route().b && !isPar() && !lm.querySelector('.lm-me')) { const c = meCard(); const pr = lm.querySelector('.ls-me .ls-prof'); if (c) { if (pr) pr.insertAdjacentHTML('afterend', c); else { const g = lm.querySelector('.mypage .in, .in'); if (g) g.insertAdjacentHTML('afterbegin', c); } } }
    if (a === 'home' && !isPar()) { const g = lm.querySelector('.tb-goal .tb-gl small'); const M = model(); const w = (M.ways || []).find(x => x.trigger === 'tube_goal' || /오늘 목표/.test(x.say || '')); if (g && w && w.v && !lm.querySelector('.lm-gp') && !(M.daily && M.daily.today >= M.daily.cap)) g.insertAdjacentHTML('beforeend', `<span class="lm-gp"> · 채우면 +${esc(w.v + UNIT)}</span>`); }
    if (a === 'done' && !isPar() && !lm.querySelector('.lm-cap')) { const M = model(); const d = lm.querySelector('.tb-done'); const c = capNote(M); const tdy = M.daily ? M.daily.today : 0;
      if (d) d.insertAdjacentHTML('beforeend', `<div class="lm-cap">${c}${tdy ? `<dl class="lm-kv c"><div><dt>오늘 쌓인 마일리지</dt><dd class="g">${sgn(tdy)}</dd></div></dl>` : ''}</div>`); }
    if (a === 'family' && isPar() && !lm.querySelector('.lm-fam')) { const t = lm.querySelector('.in'); if (t) t.insertAdjacentHTML('afterbegin', `<a class="lm-mrow lm-fam" href="#mile">${sv('mile', 20)}<span><b>자녀 마일리지</b> · 잔액 · 보상 신청 확인</span>${sv('chev', 18)}</a>`); }
    if (a === 'mile') { document.title = `${SITE().org.name} · 마일리지`; if (document.body.classList.contains('lapp')) { const nav = document.querySelector('#lapp .ap-nav'); const t = nav && nav.querySelector(':scope > a.tb-n-me, :scope > a[href="#acct"]'); if (nav && t) nav.querySelectorAll(':scope > a').forEach(x => { const o = x === t; x.classList.toggle('on', o); if (o) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); }
      const sh = document.querySelector('.lm-sheet'); if (sh) { document.body.classList.add('lm-lock'); const f = sh.querySelector('input, button[type=submit], [data-lm="close"]'); if (f && !sh.dataset.f) { sh.dataset.f = 1; f.focus({ preventScroll: true }); } } else document.body.classList.remove('lm-lock'); }
    else document.body.classList.remove('lm-lock');
    earnCheck(); }
  const late = () => { if (MI.late) return; MI.late = 1; const base = lrender; lrender = (...x) => { const r = base(...x); try { post(); } catch (e) { console.error('lmil post', e); } return r; }; try { if (document.getElementById('lm')) post(); } catch (e) { } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late); else setTimeout(late, 0);
  /* 스튜디오가 같은 기기에서 적립하면(시연판) 바로 반영 */
  addEventListener('storage', e => { if (live() || !e.key || !LR.tid || e.key !== 'didisam.room.' + LR.tid) return; if (['mile', 'acct', 'home', 'done'].includes(route().a)) rer(); else try { earnCheck(); } catch (x) { } });

  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-lm]'); if (!el) { if (MI.sheet && e.target.classList && e.target.classList.contains('lm-sheet')) { MI.sheet = null; rer(); } return; } const k = el.dataset.lm; e.preventDefault();
    if (k === 'row') { MI.sheet = { t: 'row', id: el.dataset.v }; return rer(); } if (k === 'close') { MI.sheet = null; return rer(); }
    if (k === 'f') { MI.f = el.dataset.v || 'all'; return rer(); } if (k === 'redeem') return openRedeem(el.dataset.v); if (k === 'rcancel') return cancelRedeem(el.dataset.v);
    if (k === 'guard') return guard(el.dataset.v, el.dataset.d); if (k === 'repair') return repair(); if (k === 'reload') { MI.err = ''; MI.my = null; return loadMy(true); } });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'lmRdP' && MI.sheet) { MI.sheet.points = int(e.target.value); const b = document.querySelector('#lmRdF button[type=submit]'); if (b && !MI.sending) b.textContent = `${pt(MI.sheet.points)}로 신청하기`; } });
  document.addEventListener('submit', e => { if (!e.target || e.target.id !== 'lmRdF') return; e.preventDefault(); submitRedeem(e.target); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && MI.sheet) { MI.sheet = null; rer(); } });
  addEventListener('hashchange', () => { if (MI.sheet) MI.sheet = null; });
})();
