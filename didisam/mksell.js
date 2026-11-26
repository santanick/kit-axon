/* 콘텐츠 마켓 v1.1 — 공급 · 운영 화면 공용 도구(window.MKX) + 판매 기관 화면(mksell: A5 상품 등록 · A6 판매 정산 최소).
   공용 도구는 mkcp.js(A7) · mkops.js(A8 · A9 · 시범 기관 · 매출 대시보드) · mkmargin.js(마진 화면)가 함께 씁니다. 이 파일을 그 셋보다 먼저 불러옵니다.
   계산은 didisam/marketcalc.js(window.marketCalc, 개발자 1)를 씁니다. 아직 없거나 함수 이름이 다르면 아래 STUB(spec 10장 · vec.py와 같은 식)으로 계산합니다.
   노출(안전장치): 운영 서버는 org.mk.pilot === true(산타 관리자가 켬)인 기관만, 시연판은 항상. 산타 운영(mkops)은 산타 관리자만(C6). */
(function () {
  'use strict';
  if (typeof MENU === 'undefined' || typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;

  /* ── 계산 스텁(marketcalc.js가 없을 때만) — 원 · 크레딧 정수, 나눗셈 내림, 과정 크레딧만 올림, 비율 bp ── */
  const CREDIT_WON = 1000, CP_BP = 6500, GUARD_BP = 3000, BONUS_MAX_BP = 700;
  const addMonths = (d, n) => { const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(dd, last)); return t.toISOString().slice(0, 10); };
  const addDays = (d, n) => { const t = new Date(String(d).slice(0, 10) + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const RATE = { standard: 6500, exclusive: 6000, agency: 5500, overseas: 5000 };
  const RATEN = { standard: '표준', exclusive: '독점', agency: '영업 대행', overseas: '해외 IP' };
  const SLOT = { home_top: { cap: 3, fee: 500000, label: '마켓 홈 추천' }, shelf_top: { cap: 3, fee: 300000, label: '학습자 진열대 첫 줄' }, new_launch: { cap: 10, fee: 200000, label: '신규 출시', launchDays: 90 } };
  const ORIG_CAP_BP = 3000, PROMO_MAX_MONTHS = 3;
  const STUB = {
    creditsOf: listPrice => Math.ceil((+listPrice || 0) / CREDIT_WON),
    bonusBpOf: (amount, bundle) => (bundle || amount >= 50000000) ? 700 : amount >= 30000000 ? 300 : 0,
    creditQuote: (amount, bonusBp) => { const credits = Math.floor(amount / CREDIT_WON); const bonus = Math.floor(credits * bonusBp / 10000); const cpMax = (credits + bonus) * (CREDIT_WON * CP_BP / 10000);
      const santaBp = amount > 0 ? Math.floor((amount - cpMax) * 10000 / amount) : 0; const err = bonusBp > BONUS_MAX_BP ? 'mk_bonus_max' : santaBp < GUARD_BP ? 'mk_margin' : ''; return { credits, bonus, total: credits + bonus, cpMax, santa: amount - cpMax, santaBp, ok: !err, error: err }; },
    estimate: (total, avgCredits, perPerson) => { const enrollments = Math.floor(total / avgCredits); return { enrollments, people: Math.floor(enrollments / perPerson) }; },
    volCredits: (listPrice, offBp) => Math.ceil(Math.floor(listPrice * (10000 - offBp) / 10000) / CREDIT_WON),
    volCharge: (listPrice, fromN, offBp, count) => { const base = Math.ceil(listPrice / CREDIT_WON); const disc = Math.ceil(Math.floor(listPrice * (10000 - offBp) / 10000) / CREDIT_WON); const a = Math.min(count, fromN - 1); return a * base + Math.max(0, count - a) * disc; },
    monthCp: (used, restored) => { const net = used - restored; const cp = Math.floor(net * CREDIT_WON * CP_BP / 10000); return { net, cp, santa: net * CREDIT_WON - cp }; },
    singleQuote: (budget, cpSum) => { const santa = budget - cpSum; const santaBp = budget > 0 ? Math.floor(santa * 10000 / budget) : 0; const minBudget = Math.ceil(cpSum * 10000 / (10000 - GUARD_BP)); const maxCp = Math.floor(budget * (10000 - GUARD_BP) / 10000); return { santa, santaBp, ok: santaBp >= GUARD_BP, minBudget, maxCp }; },
    brokerFee: (amount, route) => Math.floor(amount * ({ market: 3000, direct: 1500, agency: 3500 }[route] || 3000) / 10000),
    optinMinUntil: start => addMonths(start, 12),
    creditFrom: (release, months) => addMonths(release, +months || 0),
    nextMonth1: d => addMonths(String(d).slice(0, 8) + '01', 1),
    restoreOk: (hours, progressPct) => hours <= 168 && progressPct < 10,
    /* dev-addendum 1장(마진 개선 M1 · M2 · M3) */
    cpBpOf: (product, rateRow) => (product && product.ownerKind === 'santa') ? 0 : (rateRow && rateRow.cpBp != null ? +rateRow.cpBp : CP_BP),
    rateAt: (rows, ymd) => { const R = (rows || []).filter(r => String(r.effectiveFrom) <= String(ymd)).sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom))); return R[0] || { rateKind: 'standard', cpBp: CP_BP, effectiveFrom: '' }; },
    settleLine: (netCredits, cpBp) => { const cp = netCredits * cpBp / 10; return { cp, santa: netCredits * CREDIT_WON - cp }; },
    promoFee: (slot, months) => (SLOT[slot] ? SLOT[slot].fee : 0) * months,
    promoDeduct: (stmtTotal, fee, carryIn) => { const deduct = Math.min(stmtTotal, fee + (carryIn || 0)); return { deduct, pay: stmtTotal - deduct, carryOut: fee + (carryIn || 0) - deduct }; },
    origCapOk: (colCount, origCount) => (origCount + 1) * 10000 <= ORIG_CAP_BP * (colCount + 1),
    santaMix: lines => { const by = {}; let santa = 0, cp = 0; (lines || []).forEach(l => { const g = l.amount != null ? +l.amount : (+l.credits || 0) * CREDIT_WON; const c = l.cp != null ? +l.cp : Math.floor(g * (+l.cpBp || 0) / 10000); const b = by[l.source] = by[l.source] || { source: l.source, gross: 0, cp: 0, santa: 0 }; b.gross += g; b.cp += c; b.santa += g - c; santa += g - c; cp += c; });
      const tot = santa + cp; return { bySource: Object.values(by).map(b => ({ ...b, santaBp: b.gross ? Math.floor(b.santa * 10000 / b.gross) : 0 })), santa, cp, santaBp: tot ? Math.floor(santa * 10000 / tot) : 0 }; },
    recognized: (credits, amount, totalCredits) => totalCredits > 0 ? Math.floor((2 * credits * amount + totalCredits) / (2 * totalCredits)) : 0,
    priceStep: (oldP, newP, lastRaise, td) => { if (newP <= oldP) return ''; if (newP > Math.floor(oldP * 13000 / 10000)) return 'mk_price_step'; if (lastRaise && Math.floor((+lastRaise.slice(5, 7) - 1) / 3) === Math.floor((+td.slice(5, 7) - 1) / 3) && lastRaise.slice(0, 4) === td.slice(0, 4)) return 'mk_price_step'; return ''; }
  };
  /* marketcalc.js의 같은 뜻 함수 이름 후보 — 개발자 1의 최종 이름이 다르면 여기만 고칩니다 */
  const ALIAS = { creditsOf: ['creditsOf', 'courseCredits', 'credits'], bonusBpOf: ['bonusBpOf', 'bonusBp'], creditQuote: ['creditQuote', 'quoteCredit', 'marginCredit'], volCharge: ['volCharge'], monthCp: ['monthCp', 'monthStmt'], singleQuote: ['singleQuote', 'quoteSingle'], optinMinUntil: ['optinMinUntil', 'minUntil'], creditFrom: ['creditFrom'], nextMonth1: ['nextMonth1', 'effectiveFrom'], cpBpOf: ['cpBpOf'], rateAt: ['rateAt'], settleLine: ['settleLine'], promoFee: ['promoFee'], promoDeduct: ['promoDeduct'], origCapOk: ['origCapOk'], santaMix: ['santaMix'], recognized: ['recognized'] };
  const calc = (name, ...a) => { const R = window.marketCalc; const C = R && (ALIAS[name] || [name]).map(k => R[k]).find(f => typeof f === 'function'); if (C) { try { const v = C(...a); if (v !== undefined && v !== null && !(typeof v === 'number' && isNaN(v))) return name === 'creditQuote' && v && v.santaBp == null ? { ...STUB.creditQuote(...a), ...v } : v; } catch (e) { console.warn('marketCalc', name, e); } } return STUB[name](...a); };

  /* ── 공용 ── */
  const LIVEON = () => typeof LIVE !== 'undefined' && LIVE && LIVE.tenant && typeof api === 'function';
  const santa = () => LIVEON() ? !!(LIVE.user && LIVE.user.santa) : !!(S && S.me && S.me.role === 'owner'); /* 시연판: 데모 정운영자(aiusage.js와 같은 규칙) */
  const pilot = () => !LIVEON() || !!(S && S.org && S.org.mk && S.org.mk.pilot === true);
  const staff = () => S && S.me && S.me.role !== 'teacher';
  const owner = () => S && S.me && S.me.role === 'owner';
  const idem = () => 'mk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const nf = n => (Math.round(+n || 0)).toLocaleString('ko-KR');
  const cr = n => nf(n) + '크레딧';
  const pct = bp => ((+bp || 0) / 100).toFixed(2) + '%';
  const pct1 = bp => ((+bp || 0) / 100).toFixed(1) + '%';
  const man = n => { n = Math.round(+n || 0); if (n >= 1e8) { const e = Math.floor(n / 1e8), m = Math.round((n % 1e8) / 1e4); return `${e}억${m ? ' ' + nf(m) + '만' : ''} 원`; } return n % 1e4 === 0 && n >= 1e4 ? nf(n / 1e4) + '만 원' : nf(n) + '원'; };
  const ERR = {
    mk_plan: '디디쌤 유료 구독 기관만 구매 · 판매할 수 있습니다.', mk_margin: '보너스를 포함한 산타 몫이 30% 미만이라 계약 · 견적을 만들 수 없습니다. 아래 대안 중 하나를 고르십시오.',
    mk_bonus_max: '보너스 크레딧은 구매 크레딧의 7%까지만 줄 수 있습니다.', mk_floor: '최저가가 정가보다 높습니다. 최저가를 정가 이하로 입력하십시오.', mk_price_step: '정가는 분기에 한 번, 30% 이내로만 올릴 수 있습니다.',
    mk_check: '사전 검수를 통과하지 못한 항목이 있습니다. 표시된 항목을 고친 뒤 다시 제출하십시오.', mk_quote_state: '이 견적은 만료되었거나 CP 승인을 기다리고 있습니다.', mk_close_same_user: '마감 실행자와 다른 산타 운영자가 확정해야 합니다.',
    mk_cp_rate: 'CP 요율은 표준 65% · 독점 60% · 영업 대행 55% · 해외 IP 50% 중에서만 고를 수 있고, CP 서면 동의 번호가 필요합니다.',
    mk_promo_target: '크레딧에 참여하고 심사를 통과한 CP 상품만 추천 슬롯을 신청할 수 있습니다(산타 오리지널 · 신규 출시 90일이 지난 상품의 「신규 출시」 슬롯 제외).',
    mk_promo_full: '선택한 달의 추천 슬롯이 모두 찼습니다. 다른 달이나 다른 슬롯을 고르십시오.', mk_promo_months: '한 번에 최대 3개월(신규 출시는 1개월)까지, 다음 달부터 신청할 수 있습니다.',
    mk_promo_state: '이미 처리된 신청이라 취소할 수 없습니다.', mk_orig_cap: '이 컬렉션의 산타 오리지널 비중이 30%를 넘게 됩니다. 다른 컬렉션을 고르십시오.',
    mk_pilot: '시범 기관으로 지정된 기관만 마켓을 쓸 수 있습니다.', santa: '산타 관리자만 쓸 수 있습니다.', forbidden: '권한이 없습니다.'
  };
  const errOf = e => { const c = e && (e.code || e.error); return ERR[c] || (e && e.message) || '운영 서버의 마켓 기능에 연결하지 못했습니다. 잠시 뒤 다시 시도하십시오.'; };
  /* 운영 서버 읽기 캐시(원장 LV 방식) — 화면마다 키 하나 */
  const CACHE = {};
  const pull = (tab, need) => { const C = CACHE[tab] = CACHE[tab] || { key: '', d: {}, busy: false, err: '', at: 0 }; const key = JSON.stringify(need); if (C.busy || (C.key === key && (!C.err || Date.now() - C.at < 5000))) return C; C.busy = true; C.key = key;
    const K = Object.keys(need); Promise.all(K.map(k => api('GET', need[k]).catch(e => ({ __err: e })))).then(R => { const d = {}; let er = ''; K.forEach((k, i) => { if (R[i] && R[i].__err) er = errOf(R[i].__err); else d[k] = R[i]; }); C.d = d; C.err = er; C.at = Date.now(); })
      .finally(() => { C.busy = false; if (typeof CUR !== 'undefined' && ['mkops', 'mkcp', 'mksell'].includes(CUR.tab)) render(); }); return C; };
  const drop = tab => { if (tab) { if (CACHE[tab]) CACHE[tab].key = ''; } else Object.values(CACHE).forEach(c => { c.key = ''; }); };
  const send = (method, url, body, ok) => api(method, url, { ...(body || {}), idem: idem() }).then(r => { drop(); if (ok) ok(r); render(); return r; }).catch(e => { toast(errOf(e), 'warn'); throw e; });
  const rows = (r, ...keys) => { if (!r) return []; for (const k of ['items', ...keys]) if (Array.isArray(r[k])) return r[k]; return Array.isArray(r) ? r : []; };
  /* 확인 카드(돈 · 연락 · 노출이 바뀌는 동작) */
  const confirmCard = (title, body, okLabel, run, wide) => modal(title, `<div class="mk mk-m">${body}</div>`, [{ id: 'c', label: '취소', kind: 'ghost' }, { id: 'ok', label: okLabel || '확인', kind: 'pri', run }], wide);
  const tg = (txt, tone) => `<span class="tag ${tone || ''}">${esc(txt)}</span>`;
  const guard = (title, body, warn) => `<div class="mk-guard${warn === 'ok' ? ' ok' : warn ? ' warn' : ''}" role="${warn ? 'note' : 'alert'}"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg><div><b>${esc(title)}</b>${body ? `<p>${body}</p>` : ''}</div></div>`;
  const split = (cpBp, label) => { const c = Math.max(0, Math.min(10000, cpBp)); const s = 10000 - c; return `<div><div class="mk-split"><span class="cp" style="width:${c / 100}%">CP ${pct1(c)}${label ? ' · ' + esc(label) : ''}</span><span class="${s < GUARD_BP ? 'bad' : 'sa'}" style="width:${s / 100}%">산타 ${pct1(s)}</span></div><div class="mk-line" style="position:relative;height:18px"><span style="position:absolute;left:70%;top:0;height:18px;border-left:2px dashed var(--bad)"></span><small style="position:absolute;left:calc(70% + 6px);top:1px;font-size:12px;font-weight:700;color:var(--t-bad)">최저 30%</small></div></div>`; };
  const kp = (l, v, u, f, tone) => `<div class="kpi ${tone || ''}"><span class="lab">${esc(l)}</span><b class="val">${esc(v)}${u ? `<small>${esc(u)}</small>` : ''}</b>${f ? `<small class="foot">${f}</small>` : ''}</div>`;
  const tw = (cols, R, empty, right) => R.length ? `<div class="tw"><table><thead><tr>${cols.map((c, i) => `<th${(right || []).includes(i) ? ' style="text-align:right"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${R.map(r => `<tr>${r.map((c, i) => `<td${(right || []).includes(i) ? ' class="mk-num" style="text-align:right"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="empty">${esc(empty || '아직 없습니다.')}</div>`;
  const subTabs = (key, list, cur) => `<div class="seg2 mk-subtabs" role="tablist" aria-label="하위 화면">${list.map(([id, l]) => `<button role="tab" aria-selected="${id === cur}" class="${id === cur ? 'on' : ''}" data-act="tab" data-key="${esc(key)}" data-v="${esc(id)}">${esc(l)}</button>`).join('')}</div>`;
  const pageHead = (desc, right) => `<div class="ph"><div class="phl"><p>${desc}</p></div><div class="phr">${right || ''}</div></div>`;
  const offPilot = () => `<div class="mk"><div class="card mk-off"><div class="ch"><b>콘텐츠 마켓은 시범 기관에서만 열립니다</b></div><p class="mk-sub">이 기관은 아직 시범 기관이 아닙니다. 산타 운영 담당자가 시범 기관으로 지정하면 이 화면이 열립니다. 문의는 디디쌤 고객센터로 해 주십시오.</p></div></div>`;
  const liveErrBox = C => C && C.err ? `<div class="lg-err" role="alert">${esc(C.err)}</div>` : '';
  const LIC = { view: '열람', lms: 'LMS 탑재', adapt: '변형' };
  const OPT = { credit: ['크레딧 참여', 'g'], single: ['개별 판매 전용', ''], single_until: ['곧 크레딧 참여', 'b'] };
  const OPTB = { credit: ['credit', '크레딧'], single: ['rent', '개별 임대'], single_until: ['soon', '곧 크레딧 참여'] };
  const optBd = m => { const b = OPTB[m]; return b ? `<span class="mk-bd ${b[0]}">${esc(b[1])}</span>` : ''; };
  const crB = n => `<b class="mk-cr">= ${(Math.round(+n || 0)).toLocaleString('ko-KR')}크레딧</b>`;
  const note = t => `<p class="mk-note">${t}</p>`;

  /* rateAt: marketcalc.js는 cpBp 숫자, 스텁은 행 객체를 돌려줍니다 → 화면은 늘 { cpBp, rateKind, effectiveFrom } 행으로 씁니다 */
  const rateRow = (rows, ymd) => { const v = calc('rateAt', rows, ymd); if (v && typeof v === 'object') return v; const bp = +v; const R = (rows || []).filter(r => String(r.effectiveFrom) <= String(ymd) && +r.cpBp === bp).sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)))[0]; return R || { cpBp: bp, rateKind: Object.keys(RATE).find(k => RATE[k] === bp) || 'standard', effectiveFrom: '' }; };
  window.MKX = { rateRow, cache: t => CACHE[t] || { d: {} }, calc, STUB, LIVEON, santa, pilot, staff, owner, idem, nf, cr, pct, pct1, man, ERR, errOf, pull, drop, send, rows, confirmCard, tg, guard, split, kp, tw, subTabs, pageHead, offPilot, liveErrBox, LIC, OPT, OPTB, optBd, crB, note, RATE, RATEN, SLOT, ORIG_CAP_BP, PROMO_MAX_MONTHS, addDays, addMonths, GUARD_BP, BONUS_MAX_BP, CP_BP };
  /* 메뉴 노출 판정(통합 담당이 core.js wsTabs 필터에 연결할 수 있게 공개 — C6): true면 보임 */
  window.mkGate = id => { try { if (!S || !S.org) return false; if (!['mksell', 'mkcp', 'mkops', 'market'].includes(id)) return true; if (S.me && S.me.role === 'teacher') return id === 'market' && pilot(); if (id === 'mkops') return santa(); if (!pilot()) return false; if (id === 'mkcp') return !LIVEON() || !!(S.org.mk && S.org.mk.cp); if (id === 'mksell') return !LIVEON() || !!(S.org.mk && S.org.mk.seller); return true; } catch (e) { return false; } };

  /* ── 메뉴 · 프리셋 · 기존 저장 사용자(공급 · 운영 메뉴 3개) ── */
  MENU.mksell = { label: '마켓 판매', ws: 'ops', mk: true };
  MENU.mkcp = { label: 'CP 파트너 포털', ws: 'ops', mk: true };
  MENU.mkops = { label: '마켓 운영(산타)', ws: 'ops', mk: true, santa: true };
  if (typeof TEACH_NO !== 'undefined' && Array.isArray(TEACH_NO)) ['mksell', 'mkcp', 'mkops'].forEach(id => { if (!TEACH_NO.includes(id)) TEACH_NO.push(id); }); /* C5 — core.js 수정 전에도 교수자 직접 이동 차단 */
  Object.keys(PRESET).forEach(k => { const P = PRESET[k]; ['mksell', 'mkcp', 'mkops'].forEach(id => { if (!P.on.includes(id) && !P.off.includes(id)) P.off.push(id); }); });
  if (typeof MENU_ALIAS !== 'undefined') { MENU_ALIAS.mkreview = () => { UI.mkops = 'review'; return 'mkops'; }; MENU_ALIAS.mkoptin = () => { UI.mkcp = 'optin'; return 'mkcp'; }; MENU_ALIAS.mkpilot = () => { UI.mkops = 'pilot'; return 'mkops'; }; MENU_ALIAS.mkpromo = () => { UI.mkcp = 'promo'; return 'mkcp'; }; MENU_ALIAS.mkrev = () => { UI.mkops = 'rev'; return 'mkops'; }; MENU_ALIAS.mkorig = () => { UI.mkops = 'orig'; return 'mkops'; }; }
  /* 메뉴 정리: 노출 조건(시범 · CP · 산타)을 만족하면 메뉴에 넣고, 아니면 이 3개 메뉴만 뺍니다(다른 메뉴는 건드리지 않음). 조건이 생기면 다음 불러오기 때 다시 들어갑니다 */
  function mkNav() { if (!S || !S.org || !S.nav || !S.nav.tabs) return; const T = S.nav.tabs; const has = id => Object.values(T).some(L => (L || []).some(x => x.id === id));
    [['mksell', false], ['mkcp', !!(S.org.mk && S.org.mk.cp)], ['mkops', true]].forEach(([id, on]) => { const g = window.mkGate(id);
      if (g && !has(id) && typeof navAdd === 'function') navAdd(id, on);
      if (!g && has(id)) Object.keys(T).forEach(w => { T[w] = (T[w] || []).filter(x => x.id !== id); }); }); }
  window.mkNav = mkNav;
  if (typeof upgradeState === 'function') { const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { mkNav(); } catch (e) { console.error('mk nav', e); } return r; }; } /* eslint-disable-line no-global-assign */
  if (typeof postSeed === 'function') { const base = postSeed; postSeed = (...a) => { const r = base(...a); try { mkNav(); } catch (e) { console.error('mk nav', e); } return r; }; } /* eslint-disable-line no-global-assign */
  if (typeof DICT !== 'undefined') Object.assign(DICT, { '마켓 판매': 'Market sales|マーケット販売|市场销售|Ventas|Ventes|Verkauf|Bán hàng|การขาย|Продажи', 'CP 파트너 포털': 'CP partner portal|CPパートナー|CP 合作门户|Portal CP|Portail CP|CP-Portal|Cổng CP|พอร์ทัล CP|Портал CP', '마켓 운영(산타)': 'Market ops (Santa)|マーケット運営|市场运营|Operación|Opérations|Betrieb|Vận hành|การดำเนินงาน|Операции' });

  /* ── A5 · A6 판매 기관(최소) ── */
  const DS = () => { if (!S) return null; const td = today(), pm = addMonths(td, -1).slice(0, 7); if (!S.mksellD || !Array.isArray(S.mksellD.items)) S.mksellD = { v: 1, items: [
    { id: 'sp_1', title: '지역 창업 실전 — 로컬 브랜드 만들기', snap: 'v1.3', status: 'fix', lic: { view: 8000, lms: 0, adapt: 0 }, floor: 6000, at: addDays(td, -6) },
    { id: 'sp_2', title: '평생학습 강사 기초 — 성인 학습자 이해', snap: 'v2.0', status: 'live', lic: { view: 6000, lms: 90000, adapt: 0 }, floor: 4500, at: addMonths(td, -2) }],
    settle: [{ ym: pm, buyer: '동남보건대학교', product: '평생학습 강사 기초', amount: 1800000, route: 'market' }, { ym: pm, buyer: '해운대구 평생학습관', product: '평생학습 강사 기초', amount: 600000, route: 'direct' }],
    draft: null }; return S.mksellD; };
  const SST = { draft: ['작성 중', ''], fix: ['보완 요청', 'y'], review: ['심사 대기', 'b'], live: ['판매 중', 'g'], rej: ['반려', 'r'] };
  const CHK = [['pii', '개인정보 노출', '7차시 02:14 얼굴 · 이름표 1건'], ['link', '외부 링크', '3차시 설문 링크 1건'], ['right', '저작권 보증서', ''], ['cap', '자막 · 음량', ''], ['price', '가격 확인', '']];
  const sellTabs = () => [['items', '판매 상품'], ['new', '상품 등록'], ['settle', '판매 정산'], ['stat', '가명 분석']];
  VIEWS.mksell = () => {
    if (!pilot()) return offPilot(); if (!staff()) return '<div class="empty">교수자 권한으로는 열 수 없는 화면입니다.</div>';
    const D = DS(); const T = sellTabs(); const cur = T.some(t => t[0] === UI.mksell) ? UI.mksell : 'items'; let body = '';
    const C = LIVEON() ? pull('mksell', cur === 'settle' || cur === 'stat' ? { st: '/api/market/sell/settle', stats: '/api/market/sell/stats' } : { items: '/api/market/sell/products' }) : null;
    const items = LIVEON() ? rows(C.d.items, 'products') : D.items;
    if (cur === 'items') body = `<div class="card"><div class="ch"><b>판매 상품</b><small>기관 판매 상품은 개별 판매 · 중개로 판매됩니다(크레딧 참여는 CP 상품만)</small></div>${tw(['상품', '스냅샷', '라이선스 · 가격(부가세 별도)', '최저가', '상태'], items.map(p => [`<b>${esc(p.title)}</b>`, `<span class="mk-bd rent">개별 임대</span> ${esc(p.snap || '')}`, Object.entries(p.lic || {}).filter(([, v]) => +v > 0).map(([k, v]) => `${LIC[k]} ${nf(v)}원`).join(' · ') || '—', p.floor ? nf(p.floor) + '원' : '—', tg(...(SST[p.status] || [p.status, ''])) ]), '등록한 상품이 없습니다. [상품 등록]으로 첫 상품을 올리십시오.')}</div>`;
    else if (cur === 'new') body = sellNew(D);
    else if (cur === 'settle') { const L = LIVEON() ? rows(C.d.st, 'lines') : D.settle; const fee = x => calc('brokerFee', x.amount, x.route);
      body = `<div class="card"><div class="ch"><b>판매 정산</b><small>중개 수수료: 마켓 유입 30% · 직접 유치 15% · 영업 대행 35% · 학습자는 가명 집계(5명 미만 가림)</small></div>${tw(['월', '구매 기관', '상품', '유입', '판매액', '수수료', '수령액'], L.map(x => [esc(x.ym), esc(x.buyer), esc(x.product), x.route === 'direct' ? '직접 유치' : x.route === 'agency' ? '영업 대행' : '마켓 유입', nf(x.amount) + '원', nf(x.fee != null ? x.fee : fee(x)) + '원', `<b>${nf(x.amount - (x.fee != null ? x.fee : fee(x)))}원</b>`]), '정산할 판매가 없습니다.', [4, 5, 6])}${owner() ? `<div class="mk-acts" style="justify-content:flex-end;margin-top:10px"><button class="btn ghost" data-act="mk-settle-csv">정산 CSV 내려받기</button></div>` : '<p class="mk-sub">지급 계좌는 정운영자만 볼 수 있습니다.</p>'}</div>`; }
    else body = `<div class="card"><div class="ch"><b>가명 분석</b><small>학과 · 기관 단위 집계만 보입니다. 5명 미만 집단은 가립니다.</small></div>${tw(['구매 기관', '수강 인원', '평균 진도', '수료율'], [['동남보건대학교', '124명', '58%', '41%'], ['해운대구 평생학습관', '5명 미만', '가림', '가림']], '', [1, 2, 3])}</div>`;
    return `<div class="mk mk-sell">${pageHead('기관이 만든 과정을 다른 기관에 판매합니다. 심사를 통과한 상품만 마켓에 올라갑니다.', `<button class="btn pri" data-act="tab" data-key="mksell" data-v="new">상품 등록</button>`)}${liveErrBox(C)}${subTabs('mksell', T, cur)}${body}</div>`;
  };
  function sellNew(D) { const d = D.draft || (D.draft = { step: 1, src: '', meta: null, chk: {}, lic: { view: 8000, lms: 0, adapt: 0 }, floor: 6000 });
    const lib = (S.clib || []).slice(0, 6); const fixLeft = CHK.filter(c => c[2] && !d.chk[c[0]]).length;
    const steps = ['과정 고르기', 'AI 메타데이터', '사전 검수', '가격', '심사 제출'].map((s, i) => `<li class="${d.step > i + 1 ? 'done' : d.step === i + 1 ? 'on' : ''}">${i + 1}. ${esc(s)}</li>`).join('');
    const pick = `<div class="card"><div class="ch"><b>① 판매할 과정</b><small>라이브러리 과정을 고르면 그 시점의 스냅샷(v1.3처럼 고정 버전)으로 등록합니다. 원본을 고쳐도 판매본은 바뀌지 않습니다.</small></div><div class="chips">${(lib.length ? lib : [{ id: 'demo1', title: '지역 창업 실전 — 로컬 브랜드 만들기' }]).map(c => `<button class="chip ${d.src === c.id ? 'on' : ''}" data-act="mk-prod-pick" data-v="${esc(c.id)}" data-t="${esc(c.title || c.name || '')}">${esc(c.title || c.name || c.id)}</button>`).join('')}</div></div>`;
    const meta = d.src ? `<div class="card"><div class="ch"><b>② AI 메타데이터</b><small>AI가 채운 칸은 고칠 수 있습니다 · 신뢰도 ${d.meta ? '86%' : '—'}</small></div>${d.meta ? `<div class="mk-g2"><label class="lg-fl"><span>제목</span><input class="mk-inp ai" name="mt" value="${esc(d.meta.title)}" maxlength="80"></label><label class="lg-fl"><span>분류</span><input class="mk-inp ai" name="mc" value="${esc(d.meta.cat)}" maxlength="40"></label></div>` : ''}<div class="mk-acts"><button class="btn ghost sm" data-act="mk-prod-ai">${d.meta ? '다시 만들기' : 'AI로 채우기'}</button></div></div>` : '';
    const chk = d.meta ? `<div class="card"><div class="ch"><b>③ 사전 검수 5항목</b><small>보완 ${fixLeft}건이 남으면 심사에 제출할 수 없습니다</small></div><div class="mk-chk">${CHK.map(([k, l, issue]) => { const okd = !issue || d.chk[k]; return `<div><span class="mk-ci ${okd ? 'ok' : 'wr'}">${okd ? '✓' : '!'}</span><div style="flex:1"><b>${esc(l)}</b>${issue ? `<br><small class="mk-sub">${esc(okd ? '처리 완료' : issue)}</small>` : ''}</div>${issue && !okd ? `<button class="btn sm ghost" data-act="mk-prod-check" data-v="${k}">${k === 'pii' ? '가림 처리' : '제거'}</button>` : ''}</div>`; }).join('')}</div></div>` : '';
    const price = d.meta ? `<div class="card"><div class="ch"><b>④ 가격(부가세 별도)</b></div>${guard('기관 판매 상품은 개별 판매 · 중개로 판매됩니다.', '', true)}<div class="mk-g3">${Object.entries(LIC).map(([k, l]) => `<label class="lg-fl"><span>${esc(l)}(원)</span><input class="mk-inp" type="number" min="0" step="100" name="lic_${k}" value="${+d.lic[k] || 0}"></label>`).join('')}</div><label class="lg-fl"><span>최저가(floor, 원)</span><input class="mk-inp" type="number" min="0" step="100" name="floor" value="${+d.floor || 0}"></label><p class="mk-sub">수령액 안내: 마켓 유입 판매는 수수료 30%, 직접 유치는 15%를 뗀 금액을 받습니다.</p></div>` : '';
    return `<div class="mk"><ol class="mk-steps">${steps}</ol>${pick}${meta}${chk}${price}${d.meta ? `<div class="mk-acts" style="justify-content:flex-end"><button class="btn pri" data-act="mk-prod-submit" ${fixLeft ? 'disabled aria-disabled="true"' : ''}>심사 제출</button></div>` : ''}</div>`; }
  ACT['mk-prod-pick'] = el => { const D = DS(); D.draft = { step: 2, src: el.dataset.v, title: el.dataset.t, meta: null, chk: {}, lic: { view: 8000, lms: 0, adapt: 0 }, floor: 6000 }; render(); };
  ACT['mk-prod-ai'] = () => { const d = DS().draft; if (!d) return; d.meta = { title: d.title || '새 판매 상품', cat: '창업 · 경영 › 로컬 비즈니스 · 초급' }; d.step = 3; render(); };
  ACT['mk-prod-check'] = el => { const d = DS().draft; if (!d) return; d.chk[el.dataset.v] = true; if (CHK.every(c => !c[2] || d.chk[c[0]])) d.step = 4; render(); };
  ACT['mk-prod-submit'] = () => { const D = DS(), d = D.draft; if (!d) return; const m = document.getElementById('main'); const g = n => { const x = m && m.querySelector(`[name="${n}"]`); return x ? x.value : ''; };
    const lic = { view: +g('lic_view') || 0, lms: +g('lic_lms') || 0, adapt: +g('lic_adapt') || 0 }; const floor = +g('floor') || 0; const top = Math.max(...Object.values(lic));
    if (CHK.some(c => c[2] && !d.chk[c[0]])) return toast(ERR.mk_check, 'warn'); if (floor > top) return toast(ERR.mk_floor, 'warn');
    const title = g('mt') || d.meta.title;
    if (LIVEON()) return send('POST', '/api/market/sell/products', { src: d.src, title, lic, floorPrice: floor }, r => send('POST', `/api/market/sell/products/${encodeURIComponent((r.product || r).id)}/submit`, {}, () => { D.draft = null; UI.mksell = 'items'; toast('심사에 제출했습니다. 결과는 3영업일 안에 알려 드립니다.'); }));
    D.items.unshift({ id: 'sp_' + Date.now().toString(36), title, snap: 'v1.0', status: 'review', lic, floor, at: today() }); D.draft = null; UI.mksell = 'items'; toast('심사에 제출했습니다. 결과는 3영업일 안에 알려 드립니다.'); render(); };
  ACT['mk-settle-csv'] = () => { const D = DS(); if (typeof downloadCSV === 'function') downloadCSV('판매정산.csv', ['월', '구매 기관', '상품', '판매액'], D.settle.map(x => [x.ym, x.buyer, x.product, x.amount])); };
})();
