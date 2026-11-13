/* v41.0 통합 수납 원장 — 학습자 · 보호자 「결제」(#ledger)와 링크 청구서 페이지(learner.html?t=<기관>&bill=<토큰>).
   화면: #ledger(내 청구서) · #ledger/hist(결제 내역) · #ledger/rf(환불) · #ledger/r/<수납>(영수증) · #ledger/done/<수납>(완료) · #ledger/paid(토스 복귀)
   링크 청구서: 로그인 없이 한 화면에서 금액 확인 → 토스 결제 → 완료. 만료 · 사용됨 안내. 이름 대신 마스킹 이니셜만.
   데이터: 운영은 /api/pub/<tid>/ledger-my · ledger-order · ledger-confirm · ledger-bill(-order · -confirm)(09 규격 3절).
           시연판(브라우저 문서)은 스튜디오 문서의 ledger(S.ledger) → 없으면 게시본 SITE().ledger → ?ledger=1이면 이 기기 체험 샘플.
           시연판 결제 · 환불 요청은 이 기기(didisam.ledger.<기관>)에 겹쳐 저장하고 운영자 요청함(lpxPush ledger-pay · ledger-refund-req)으로 보낸다.
   금액은 서버가 다시 계산한다(주문 응답 금액으로만 결제창을 연다). 개인정보: 이름 · 연락처 · 카드번호를 받거나 저장하지 않는다.
   learner.html에서 lapp.js 앞(lfac.js 다음). 앱 홈 · 머리 꾸미기는 DOMContentLoaded 뒤 가장 바깥에서 한다. */
'use strict';
(() => {
  if (typeof lrender !== 'function' || typeof viewPage !== 'function') return;
  const BQ = new URLSearchParams(location.search); const BILL = BQ.get('bill') || '';
  const LG = { my: null, at: 0, busy: false, off: false, err: '', who: 'all', po: null, bill: null, bErr: '', bBusy: false, bDone: null, paying: false, rf: '', sdk: null, conf: '' };
  window.LLEDGER = LG;
  const live = () => LR.mode === 'live';
  const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
  const nowD = () => (window.__lgNow ? new Date(window.__lgNow) : new Date());
  const kst = d => new Date((d ? new Date(d) : nowD()).getTime() + 9 * 3600e3).toISOString();
  const today = () => kst().slice(0, 10);
  const WD = '일월화수목금토';
  const fmtD = d => { const s = String(d || ''); if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s; const x = s.length > 10 ? kst(s) : s; return `${+x.slice(5, 7)}.${+x.slice(8, 10)}(${WD[new Date(x.slice(0, 10) + 'T00:00:00Z').getUTCDay()]})`; };
  const fmtDT = d => { const s = String(d || ''); if (s.length <= 10) return fmtD(s); const x = kst(s); return `${fmtD(x.slice(0, 10))} ${x.slice(11, 16)}`; };
  const ym = s => /^\d{4}-\d{2}/.test(s || '') ? `${+s.slice(5, 7)}월` : '';
  const mask = s => { s = String(s || '').trim(); return s ? s[0] + '○'.repeat(Math.max(1, Math.min(2, s.length - 1))) : '○○'; };
  const IC = { card: 'M3 6h18v12H3zM3 10h18M7 15h4', check: 'M5 12l5 5 9-10', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.5', warn: 'M12 3l10 18H2zM12 10v5M12 17.5v.5', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5', back: 'M15 5l-7 7 7 7', chev: 'M9 6l6 6-6 6', lock: 'M6 11h12v10H6zM9 11V8a3 3 0 016 0v3', ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z', refund: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4', x: 'M6 6l12 12M18 6L6 18' };
  const sv = (n, s = 20) => `<svg class="lg-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n] || IC.info}"/></svg>`;
  const ITEM = { tuition: '수강료', book: '교재비', facility: '시설 이용료', pass: '이용권', rental: '대여료', program: '프로그램', event: '행사', etc: '기타' };
  const METHOD = { online_card: '카드(온라인)', online_transfer: '계좌이체(온라인)', desk_card: '카드(현장)', cash: '현금', transfer: '계좌이체', vbank_ext: '가상계좌', voucher: '바우처' };
  const RST = { paid: '결제 완료', ready: '결제 확인 중', failed: '결제 안 됨', cancelled: '취소됨' };
  const FST = { pending: '환불 처리 중', done: '환불 완료', cancelled: '환불 취소됨', requested: '요청함' };
  const pick = (o, ...k) => { for (const x of k) if (o && o[x] != null && o[x] !== '') return o[x]; return undefined; };

  /* ── 정규화(서버 camelCase · DB snake_case 모두 받음) ── */
  const nC = c => ({ id: String(pick(c, 'id') || ''), sid: String(pick(c, 'sid') || ''), unitId: pick(c, 'unitId', 'unit_id', 'unit') || '', unit: pick(c, 'unitName', 'unit_name') || '', itemType: pick(c, 'itemType', 'item_type') || 'etc', title: String(pick(c, 'title') || ''), amount: Math.round(+pick(c, 'amount') || 0), periodYm: pick(c, 'periodYm', 'period_ym') || '', dueDate: String(pick(c, 'dueDate', 'due_date') || '').slice(0, 10), status: pick(c, 'status') || 'open', group: String(pick(c, 'bill', 'billId', 'bill_id', 'srcId', 'src_id', 'groupId') || ''), bal: pick(c, 'balance') != null ? Math.round(+c.balance) : null, at: pick(c, 'createdAt', 'created_at') || '' });
  const nR = r => ({ id: String(pick(r, 'id') || ''), sid: String(pick(r, 'sid') || ''), method: pick(r, 'method') || '', channel: pick(r, 'channel') || '', amount: Math.round(+pick(r, 'amount') || 0), paidAt: pick(r, 'paidAt', 'paid_at') || '', status: pick(r, 'status') || 'paid', url: pick(r, 'receiptUrl', 'receipt_url') || '', approvalNo: pick(r, 'approvalNo', 'approval_no') || '', issuer: pick(r, 'cardIssuer', 'card_issuer') || '', unit: pick(r, 'unitName', 'unit_name') || '', chargeIds: Array.isArray(r.chargeIds) ? r.chargeIds.map(String) : [] });
  const nA = a => ({ receiptId: String(pick(a, 'receiptId', 'receipt_id') || ''), chargeId: String(pick(a, 'chargeId', 'charge_id') || ''), amount: Math.round(+pick(a, 'amount') || 0) });
  const nF = f => ({ id: String(pick(f, 'id') || ''), receiptId: String(pick(f, 'receiptId', 'receipt_id', 'receipt') || ''), amount: Math.round(+pick(f, 'amount', 'auto_amount', 'autoAmount') || 0), status: pick(f, 'status') || 'pending', at: pick(f, 'at', 'createdAt') || '', reason: pick(f, 'reason') || '' });
  const okUrl = u => /^https:\/\/[^\s"'<>]+$/.test(String(u || '')) ? String(u) : ''; /* 영수증 링크는 https만 */

  /* ── 시연판 데이터 ── */
  const roomDoc = () => { if (!['demo', 'preview'].includes(LR.mode) || !LR.tid || LR.tid === 'sample') return null; try { return JSON.parse(localStorage.getItem('didisam.room.' + LR.tid) || 'null'); } catch (e) { return null; } };
  const ovK = () => `didisam.ledger.${LR.tid || 'x'}`;
  function ov() { if (LG.ov && LG.ov.k === ovK()) return LG.ov.v; let v = null; try { v = JSON.parse(localStorage.getItem(ovK()) || 'null'); } catch (e) { v = null; } if (!v || typeof v !== 'object') v = {}; ['receipts', 'allocs', 'refunds'].forEach(k => { if (!Array.isArray(v[k])) v[k] = []; }); if (!v.used || typeof v.used !== 'object') v.used = {}; LG.ov = { k: ovK(), v }; return v; }
  function ovSave() { try { localStorage.setItem(ovK(), JSON.stringify(ov())); return true; } catch (e) { toast('이 기기에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.', 'bad'); return false; } }
  /* 체험 샘플(?ledger=1): 이번 달 미납 1 · 일부 납부 1 · 지난달 완료 1 · 환불 1 */
  function seed(sid) { const t = today(); const m0 = t.slice(0, 7); const d = new Date(t + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - 1); const m1 = d.toISOString().slice(0, 7); d.setUTCMonth(d.getUTCMonth() - 1); const m2 = d.toISOString().slice(0, 7);
    const C = (id, g, it, title, amount, p, due, unit) => ({ id, sid, billId: g, itemType: it, title, amount, periodYm: p, dueDate: due, unitId: 'lu_main', unitName: unit || '디디쌤 아카데미 본원', status: 'open' });
    return { units: [{ id: 'lu_main', name: '디디쌤 아카데미 본원' }],
      charges: [C('lc_s1', 'b1', 'tuition', `${+m0.slice(5)}월 수강료`, 280000, m0, m0 + '-25'), C('lc_s2', 'b1', 'book', '교재비(파이썬 기초)', 25000, m0, m0 + '-25'), C('lc_s3', 'b1', 'etc', '형제 할인', -28000, m0, m0 + '-25'),
        C('lc_s4', 'b2', 'program', '겨울 코딩 캠프', 120000, m0, m1 + '-28', '디디쌤 아카데미 해운대점'), C('lc_s5', 'b3', 'tuition', `${+m1.slice(5)}월 수강료`, 280000, m1, m1 + '-25'), C('lc_s6', 'b4', 'event', '주말 특강', 60000, m2, m2 + '-20')],
      receipts: [{ id: 'lp_s1', sid, method: 'cash', channel: 'desk', amount: 50000, paidAt: m1 + '-27T06:10:00Z', status: 'paid', unitName: '디디쌤 아카데미 해운대점' }, { id: 'lp_s2', sid, method: 'online_card', channel: 'toss', amount: 280000, paidAt: m1 + '-05T01:20:00Z', status: 'paid', approvalNo: '30012345', cardIssuer: '신한' }, { id: 'lp_s3', sid, method: 'desk_card', channel: 'desk', amount: 60000, paidAt: m2 + '-12T05:00:00Z', status: 'paid', approvalNo: '71234567' }],
      allocs: [{ receiptId: 'lp_s1', chargeId: 'lc_s4', amount: 50000 }, { receiptId: 'lp_s2', chargeId: 'lc_s5', amount: 280000 }, { receiptId: 'lp_s3', chargeId: 'lc_s6', amount: 60000 }],
      refunds: [{ id: 'lr_s1', receiptId: 'lp_s3', amount: 30000, status: 'done', at: m2 + '-15T02:00:00Z' }] }; }
  function demoSrc() { const d = roomDoc(); if (d && d.ledger && typeof d.ledger === 'object') return d.ledger; const s = SITE && SITE(); if (s && s.ledger && Array.isArray(s.ledger.charges)) return s.ledger; if (BQ.get('ledger') === '1' && LR.me) return LG.seed && LG.seed.sid === LR.me.sid ? LG.seed.v : (LG.seed = { sid: LR.me.sid, v: seed(LR.me.sid) }).v; return null; }
  /* 보호자: 연결 완료된 자녀(lacct 가족 연결) */
  function kidsDemo() { try { if (!LR.me || LR.me.kind !== 'parent') return []; const r = roomDoc() || {}; const pa = typeof laPacct === 'function' ? laPacct() : null; if (!pa) return []; return (r.parents || []).filter(p => p.acct === pa.id && p.status === '연결 완료').map(p => { const m = (r.members || []).find(x => x.id === p.child) || {}; return { sid: String(m.sid || m.id || ''), label: m.nick || mask(m.name) }; }).filter(k => k.sid); } catch (e) { return []; } }

  /* ── 운영 ── */
  const lapi = async (method, url, body) => { const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) { const e = new Error(j.message || `오류 ${r.status}`); e.status = r.status; e.code = j.error; e.extra = j; throw e; } return j; };
  const P = act => `/api/pub/${encodeURIComponent(LR.tid)}/ledger-${act}`;
  async function loadMy(force) { if (!live() || !LR.me || LG.busy || LG.off) return; if (!force && LG.my && Date.now() - LG.at < 20000) return; LG.busy = true;
    try { const r = await lapi('GET', P('my')); LG.my = r; LG.at = Date.now(); LG.err = ''; if (r.payOnline === false) LG.po = false; }
    catch (e) { if (e.status === 403 || e.status === 404 || e.code === 'ledger_off') LG.off = true; else LG.err = e.status === 401 ? '로그인이 끝났어요. 다시 로그인해 주세요.' : '결제 정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.'; }
    LG.busy = false; if (route().a === 'ledger' || route().a === 'home' || route().a === 'mypay') rer(); }
  /* 켜짐: 운영은 게시본 ledger.on(또는 #ledger로 직접 열 때 서버 응답), 시연판은 데이터가 있을 때 */
  const on = () => { try { if (!LR.me) return false; if (live()) { if (LG.off) return false; if (LG.my) return true; const s = SITE(); return !!(s && s.ledger && s.ledger.on); } return !!demoSrc(); } catch (e) { return false; } };
  window.ledgerOn = on;

  /* ── 모델: 청구 줄을 청구서로 묶고 잔액 계산 ── */
  function data() { if (live()) { const r = LG.my || {}; return { charges: (r.charges || []).map(nC), receipts: (r.receipts || []).map(nR), allocs: (r.allocs || []).map(nA), refunds: (r.refunds || []).map(nF), people: (r.people || r.kids || []).map(k => ({ sid: String(k.sid || ''), label: k.label || k.nick || mask(k.initial || '') })), units: r.units || [] }; }
    const s = demoSrc() || {}; const o = ov(); const me = LR.me ? String(LR.me.sid || '') : ''; const K = kidsDemo(); const ids = new Set([me, ...K.map(k => k.sid)]);
    const charges = (s.charges || []).map(nC).filter(c => ids.has(c.sid)); const cid = new Set(charges.map(c => c.id));
    const sR = new Set((s.receipts || []).map(r => String(r.id))); /* 스튜디오가 학습자 결제를 반영하면(같은 수납 번호) 이 기기 기록은 숨긴다 */
    const receipts = [...(s.receipts || []), ...o.receipts.filter(r => !sR.has(String(r.id)))].map(nR); const allocs = [...(s.allocs || []), ...o.allocs.filter(a => !sR.has(String(a.receiptId)))].map(nA);
    const mineR = new Set(receipts.filter(r => ids.has(r.sid) || allocs.some(a => a.receiptId === r.id && cid.has(a.chargeId))).map(r => r.id));
    return { charges, receipts: receipts.filter(r => mineR.has(r.id)), allocs: allocs.filter(a => mineR.has(a.receiptId)), refunds: [...(s.refunds || []), ...o.refunds].map(nF).filter(f => mineR.has(f.receiptId)), people: K, units: s.units || [] }; }
  function model() { const D = data(); const who = LG.who; const unitN = id => ((D.units || []).find(u => u.id === id) || {}).name || '';
    const paidR = new Set(D.receipts.filter(r => r.status === 'paid').map(r => r.id)); const al = {}; D.allocs.forEach(a => { if (paidR.has(a.receiptId)) al[a.chargeId] = (al[a.chargeId] || 0) + a.amount; });
    const G = new Map(); D.charges.filter(c => c.status !== 'void' && (who === 'all' || c.sid === who)).forEach(c => { const k = c.group || [c.sid, c.unitId, c.periodYm, c.dueDate].join('~'); if (!G.has(k)) G.set(k, []); G.get(k).push(c); });
    const bills = [...G.values()].map(L => { L.sort((a, b) => (b.amount > 0) - (a.amount > 0)); const total = L.reduce((s, c) => s + c.amount, 0); const bal = Math.max(0, L.reduce((s, c) => s + (c.bal != null ? c.bal : c.amount - (al[c.id] || 0)), 0)); const f = L.find(c => c.amount > 0) || L[0];
      const due = L.map(c => c.dueDate).filter(Boolean).sort()[0] || ''; const st = bal <= 0 ? 'paid' : bal < total ? 'partial' : 'open';
      return { key: f.id, sid: f.sid, lines: L, total, bal, paid: Math.max(0, total - bal), due, ym: f.periodYm, unit: f.unit || unitN(f.unitId), title: f.title + (L.filter(c => c.amount > 0).length > 1 ? ` 외 ${L.filter(c => c.amount > 0).length - 1}건` : ''), st, late: st !== 'paid' && due && due < today(), ids: L.map(c => c.id) }; })
      .sort((a, b) => (a.st === 'paid') - (b.st === 'paid') || String(a.due).localeCompare(String(b.due)));
    const R = D.receipts.filter(r => who === 'all' || r.sid === who || D.allocs.some(a => a.receiptId === r.id && D.charges.some(c => c.id === a.chargeId && c.sid === who))).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));
    return { D, bills, open: bills.filter(b => b.st !== 'paid'), done: bills.filter(b => b.st === 'paid'), receipts: R, refunds: D.refunds.filter(f => R.some(r => r.id === f.receiptId)), people: D.people, unitN }; }
  const payOnline = () => LG.po !== false && !(live() && LG.my && LG.my.payOnline === false);

  /* ── 화면 조각 ── */
  const page = (cls, inner) => `<section class="lg ${cls || ''}"><div class="lg-in">${inner}</div></section>`;
  const head = (t, sub) => `<div class="lg-hd"><h1>${esc(t)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
  const stTag = b => b.st === 'paid' ? `<span class="lg-tag ok">${sv('check', 14)}납부 완료</span>` : b.late ? `<span class="lg-tag bad">${sv('warn', 14)}마감 지남</span>` : b.st === 'partial' ? `<span class="lg-tag mid">${sv('clock', 14)}일부 납부</span>` : `<span class="lg-tag">${sv('clock', 14)}결제 대기</span>`;
  const whoL = (M, sid) => { const k = (M.people || []).find(p => p.sid === sid); return k ? k.label : ''; };
  const noOnline = () => `<p class="lg-note" role="note">${sv('info', 18)}<span>이 기관은 지금 온라인 결제를 받지 않아요. 기관 데스크에서 결제해 주세요.</span></p>`;
  function billCard(b, M) { const kid = whoL(M, b.sid); const disc = b.lines.filter(c => c.amount < 0).reduce((s, c) => s + c.amount, 0);
    return `<article class="lg-bill${b.st === 'paid' ? ' is-paid' : ''}" data-bill="${esc(b.key)}"><div class="lg-bh"><span class="lg-bm">${esc([kid ? kid + ' 학습자' : '', ym(b.ym) && b.ym, b.unit].filter(Boolean).join(' · ') || '청구서')}</span>${stTag(b)}</div>
      <h3>${esc(b.title)}</h3>
      <dl class="lg-amt"><div><dt>청구 금액</dt><dd>${won(b.total)}${disc ? `<small>할인 ${won(-disc)} 포함</small>` : ''}</dd></div>${b.paid && b.st !== 'paid' ? `<div><dt>낸 금액</dt><dd>${won(b.paid)}</dd></div>` : ''}${b.st !== 'paid' ? `<div class="big"><dt>남은 금액</dt><dd>${won(b.bal)}</dd></div>` : ''}${b.due ? `<div><dt>${b.st === 'paid' ? '마감일' : '납부 마감'}</dt><dd>${esc(fmtD(b.due))}</dd></div>` : ''}</dl>
      <details class="lg-lines"><summary>청구 항목 ${b.lines.length}개 보기</summary><ul>${b.lines.map(c => `<li><span>${esc(c.title || ITEM[c.itemType] || '항목')}<small>${esc(c.amount < 0 ? '할인' : ITEM[c.itemType] || '')}</small></span><b>${c.amount < 0 ? '−' : ''}${won(Math.abs(c.amount))}</b></li>`).join('')}</ul></details>
      ${b.st === 'paid' ? '' : payOnline() ? `<button type="button" class="lg-btn pri big wide" data-lg="pay" data-v="${esc(b.key)}"${LG.paying ? ' disabled' : ''}>${sv('card', 20)}${won(b.bal)} 결제하기</button>` : noOnline()}</article>`; }
  function tabs(cur, M) { const n = M.open.length; const T = [['', '청구서', n ? `${n}` : ''], ['hist', '결제 내역', ''], ['rf', '환불', '']];
    return `<nav class="lg-tabs" aria-label="결제 메뉴">${T.map(([k, l, c]) => `<a href="#ledger${k ? '/' + k : ''}" class="${cur === k ? 'on' : ''}"${cur === k ? ' aria-current="page"' : ''}>${l}${c ? ` <span class="lg-cnt" aria-label="${c}건">${c}</span>` : ''}</a>`).join('')}</nav>`; }
  const peopleBar = M => (M.people || []).length ? `<div class="lg-chips" role="group" aria-label="자녀 고르기"><button type="button" class="lg-chip${LG.who === 'all' ? ' on' : ''}" data-lg="who" data-v="all" aria-pressed="${LG.who === 'all'}">전체</button>${M.people.map(p => `<button type="button" class="lg-chip${LG.who === p.sid ? ' on' : ''}" data-lg="who" data-v="${esc(p.sid)}" aria-pressed="${LG.who === p.sid}">${esc(p.label)}</button>`).join('')}</div>` : '';
  function billsView(M) { const due = M.open.reduce((s, b) => s + b.bal, 0);
    return `${M.open.length ? `<div class="lg-sum" role="status"><span>결제할 금액</span><b>${won(due)}</b><small>청구서 ${M.open.length}건${M.open.some(b => b.late) ? ' · 마감 지난 청구서가 있어요' : ''}</small></div>` : `<div class="lg-empty">${sv('check', 28)}<p>지금 결제할 청구서가 없어요.</p></div>`}
      ${M.open.map(b => billCard(b, M)).join('')}
      ${M.done.length ? `<details class="lg-old"><summary>납부 완료 청구서 ${M.done.length}건</summary>${M.done.map(b => billCard(b, M)).join('')}</details>` : ''}`; }
  const refOf = (M, rid) => M.refunds.filter(f => f.receiptId === rid && f.status !== 'cancelled' && f.status !== 'requested').reduce((s, f) => s + f.amount, 0);
  function histView(M) { if (!M.receipts.length) return `<div class="lg-empty">${sv('doc', 28)}<p>아직 결제 내역이 없어요.</p></div>`;
    return `<ul class="lg-list">${M.receipts.map(r => { const rf = refOf(M, r.id); const what = M.D.allocs.filter(a => a.receiptId === r.id).map(a => (M.D.charges.find(c => c.id === a.chargeId) || {}).title).filter(Boolean);
      return `<li class="lg-row"><span class="lg-rt"><b>${won(r.amount)}</b><small>${esc([fmtDT(r.paidAt), METHOD[r.method] || r.method].filter(Boolean).join(' · '))}</small>${what.length ? `<small>${esc(what.slice(0, 2).join(', ') + (what.length > 2 ? ` 외 ${what.length - 2}건` : ''))}</small>` : ''}${rf ? `<small class="lg-rf">${sv('refund', 14)}환불 ${won(rf)}</small>` : ''}</span>
        <span class="lg-rr"><span class="lg-tag${r.status === 'paid' ? ' ok' : r.status === 'failed' ? ' bad' : ''}">${esc(RST[r.status] || r.status)}</span>${r.status === 'paid' ? `<a class="lg-btn sm" href="#ledger/r/${esc(r.id)}">${sv('doc', 16)}영수증</a>` : ''}</span></li>`; }).join('')}</ul>`; }
  function rfView(M) { const o = live() ? { refunds: [] } : ov(); const reqs = (o.refunds || []).filter(f => f.status === 'requested'); const paid = M.receipts.filter(r => r.status === 'paid' && r.amount - refOf(M, r.id) > 0);
    const list = [...M.refunds.filter(f => f.status !== 'requested'), ...reqs.filter(f => M.receipts.some(r => r.id === f.receiptId))].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return `${list.length ? `<ul class="lg-list">${list.map(f => { const r = M.receipts.find(x => x.id === f.receiptId) || {}; return `<li class="lg-row"><span class="lg-rt"><b>${f.status === 'requested' ? '금액은 기관이 계산해요' : won(f.amount)}</b><small>${esc([fmtDT(f.at), `원 결제 ${won(r.amount)} · ${METHOD[r.method] || ''}`].filter(Boolean).join(' · '))}</small>${f.reason ? `<small>사유: ${esc(f.reason)}</small>` : ''}</span><span class="lg-rr"><span class="lg-tag${f.status === 'done' ? ' ok' : f.status === 'cancelled' ? ' bad' : ' mid'}">${esc(FST[f.status] || f.status)}</span></span></li>`; }).join('')}</ul>` : `<div class="lg-empty">${sv('refund', 28)}<p>환불 내역이 없어요.</p></div>`}
      <section class="lg-card" aria-labelledby="lgRfH"><h2 id="lgRfH">환불 요청</h2><p class="lg-mu">환불 금액은 수강 · 이용 규정에 따라 기관이 계산하고, 확인한 뒤 돌려 드려요. 카드 결제는 카드 취소로, 현장 결제는 기관 안내에 따라 돌려받아요.</p>
        ${paid.length ? `<form id="lgRf" class="lg-form"><label for="lgRfR">환불할 결제</label><select id="lgRfR" name="r" required>${paid.map(r => `<option value="${esc(r.id)}"${LG.rf === r.id ? ' selected' : ''}>${esc(`${fmtD(String(r.paidAt).slice(0, 10) ? kst(r.paidAt).slice(0, 10) : '')} · ${won(r.amount)} · ${METHOD[r.method] || ''}`)}</option>`).join('')}</select>
          <label for="lgRfW">사유 <small>(선택)</small></label><textarea id="lgRfW" name="w" rows="3" maxlength="300" placeholder="예: 이사로 더 다닐 수 없어요"></textarea><p class="lg-mu">이름 · 연락처 · 계좌번호는 적지 말아 주세요. 필요하면 기관이 따로 안내해요.</p>
          <button type="submit" class="lg-btn wide">${sv('refund', 18)}환불 요청 보내기</button></form>` : '<p class="lg-mu">환불을 요청할 수 있는 결제가 없어요.</p>'}</section>`; }
  function rcptView(M, id) { const r = M.receipts.find(x => x.id === id); if (!r) return `${head('영수증')}<div class="lg-empty"><p>영수증을 찾지 못했어요.</p><a class="lg-btn" href="#ledger/hist">결제 내역으로</a></div>`;
    const L = M.D.allocs.filter(a => a.receiptId === r.id).map(a => ({ a, c: M.D.charges.find(c => c.id === a.chargeId) })).filter(x => x.c); const rf = refOf(M, r.id); const url = okUrl(r.url); const org = ((SITE() || {}).org || {}).name || '';
    return `${head('영수증', '결제 확인용이에요. 세금 증빙은 기관에 문의해 주세요.')}<article class="lg-rcpt" aria-label="영수증"><div class="lg-rh"><b>${esc(org)}</b>${r.unit || (L[0] && M.unitN(L[0].c.unitId)) ? `<small>${esc(r.unit || M.unitN(L[0].c.unitId))}</small>` : ''}</div>
      <dl class="lg-amt"><div class="big"><dt>결제 금액</dt><dd>${won(r.amount)}</dd></div><div><dt>결제 일시</dt><dd>${esc(fmtDT(r.paidAt))}</dd></div><div><dt>결제 수단</dt><dd>${esc(METHOD[r.method] || r.method)}${r.issuer ? ` · ${esc(r.issuer)}` : ''}</dd></div>${r.approvalNo ? `<div><dt>승인 번호</dt><dd>${esc(r.approvalNo)}</dd></div>` : ''}<div><dt>상태</dt><dd>${esc(RST[r.status] || r.status)}</dd></div>${rf ? `<div><dt>환불</dt><dd>${won(rf)}</dd></div>` : ''}<div><dt>영수 번호</dt><dd>${esc(r.id)}</dd></div></dl>
      ${L.length ? `<h3>결제한 항목</h3><ul class="lg-lines-s">${L.map(x => `<li><span>${esc(x.c.title)}</span><b>${won(x.a.amount)}</b></li>`).join('')}</ul>` : ''}</article>
      <div class="lg-acts">${url ? `<a class="lg-btn pri" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${sv('ext', 18)}카드사 영수증 보기</a>` : ''}<button type="button" class="lg-btn" data-lg="print">${sv('print', 18)}인쇄 · 저장</button><a class="lg-btn" href="#ledger/hist">결제 내역으로</a></div>`; }
  function doneView(M, id) { const r = M.receipts.find(x => x.id === id); const org = ((SITE() || {}).org || {}).name || '기관';
    return `<div class="lg-ok" role="status"><span class="lg-okc">${sv('check', 32)}</span><h2>결제가 끝났어요</h2><p>${esc(org)}에 바로 알려 드렸어요</p></div>
      ${r ? `<dl class="lg-amt lg-tbl"><div><dt>결제 금액</dt><dd class="lg-b">${won(r.amount)}</dd></div><div><dt>결제 시각</dt><dd>${esc(fmtDT(r.paidAt))}</dd></div><div><dt>결제 수단</dt><dd>${esc(METHOD[r.method] || '')}</dd></div></dl>` : '<p class="lg-mu">결제 내역에서 확인할 수 있어요.</p>'}
      <div class="lg-acts">${r ? `<a class="lg-btn" href="#ledger/r/${esc(r.id)}">${sv('doc', 18)}영수증</a>` : ''}<a class="lg-btn pri" href="#ledger">청구서로 돌아가기</a></div>`; }
  function mainView() { const seg = decodeURIComponent(location.hash.slice(1)).split(/[?#]/)[0].split('/').slice(1); const [b, c] = seg;
    if (!LR.me) return page('lg-off', head('결제') + `<div class="lg-empty">${sv('lock', 28)}<p>청구서 · 결제 내역은 로그인한 뒤 볼 수 있어요.</p><a class="lg-btn pri" href="#login/ledger">로그인</a></div>`);
    if (live()) { if (!LG.my && !LG.off && !LG.err) { loadMy(); return page('lg-load', head('결제') + '<p class="lg-empty" role="status">결제 정보를 불러오고 있어요…</p>'); } if (LG.off) return page('lg-off', head('결제') + '<div class="lg-empty"><p>이 기관은 아직 온라인 청구서를 쓰지 않아요. 결제 · 환불 내역은 기존 메뉴에서 볼 수 있어요.</p><a class="lg-btn" href="#mypay">결제 · 환불 내역</a></div>'); if (LG.err && !LG.my) return page('lg-off', head('결제') + `<div class="lg-empty"><p>${esc(LG.err)}</p><button type="button" class="lg-btn" data-lg="reload">다시 불러오기</button></div>`); }
    else if (!demoSrc()) return page('lg-off', head('결제') + '<div class="lg-empty"><p>이 기관은 아직 온라인 청구서를 쓰지 않아요.</p><a class="lg-btn" href="#mypay">결제 · 환불 내역</a></div>');
    if (b === 'paid') { setTimeout(paidBack, 0); return page('lg-load', head('결제 확인') + `<p class="lg-empty" role="status">${esc(LG.conf || '결제를 확인하고 있어요…')}</p>`); }
    const M = model(); const isPar = LR.me.kind === 'parent';
    if (b === 'r') return page('lg-r', rcptView(M, c)); if (b === 'done') return page('lg-d', head('결제 완료') + doneView(M, c));
    const cur = b === 'hist' || b === 'rf' ? b : '';
    return page('lg-main', `${head('결제', isPar ? '연결된 자녀의 청구서도 함께 보여요' : '청구서 · 결제 내역 · 환불을 한곳에서 봐요')}${peopleBar(M)}${tabs(cur, M)}${cur === 'hist' ? histView(M) : cur === 'rf' ? rfView(M) : billsView(M)}`); }

  /* ── 결제(앱 · 웹) ── */
  const rer = () => { const y = scrollY; lrender(); requestAnimationFrame(() => scrollTo(0, y)); };
  const tossSDK = () => window.TossPayments ? Promise.resolve(window.TossPayments) : (LG.sdk || (LG.sdk = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v1/payment'; s.onload = () => window.TossPayments ? ok(window.TossPayments) : no(new Error('sdk')); s.onerror = () => { LG.sdk = null; no(new Error('sdk')); }; document.head.appendChild(s); })));
  const ERR = { amount_mismatch: '금액이 바뀌었어요. 청구서를 새로 불러온 뒤 다시 결제해 주세요.', over_balance: '이미 결제된 청구서예요. 결제 내역을 확인해 주세요.', link_expired: '링크 사용 기간이 지났어요.', link_used: '이미 결제한 링크예요.', not_found: '청구서를 찾지 못했어요.', paid: '이미 결제가 끝난 청구서예요.', expired: '결제 시간이 지났어요. 다시 결제해 주세요.', used: '이미 결제한 청구서예요.', link: '청구서를 찾지 못했어요.', pg: '결제 승인에 실패했어요. 잠시 후 다시 시도해 주세요.', auth: '로그인이 끝났어요. 다시 로그인해 주세요.' };
  const errMsg = e => ERR[e && e.code] || (e && e.message) || '결제를 확인하지 못했어요.';
  /* 토스 결제창: 서버 주문(금액 · 주문번호 · 클라이언트 키) → requestPayment(카드) → successUrl/failUrl로 돌아온다 */
  async function openToss(o, back) { const TP = await tossSDK(); TP(o.clientKey).requestPayment('카드', { amount: o.amount, orderId: o.orderId, orderName: String(o.orderName || '청구서').slice(0, 90), successUrl: back, failUrl: back }).catch(e => { LG.paying = false; if (e && e.code === 'USER_CANCEL') toast('결제를 취소했어요.', 'warn'); else toast('결제가 끝나지 않았어요. 다시 시도해 주세요.', 'warn'); rer(); }); }
  async function pay(key) { if (LG.paying) return; const M = model(); const b = M.bills.find(x => x.key === key); if (!b || b.bal <= 0) return; if (LR.mode === 'preview') { toast('미리보기에서는 결제할 수 없어요.', 'warn'); return; }
    if (live()) { LG.paying = true; rer();
      try { const o = await lapi('POST', P('order'), { chargeIds: b.ids }); if (o.payOnline === false || !o.orderId) { LG.po = false; LG.paying = false; rer(); toast('지금은 온라인 결제를 받지 않아요. 기관 데스크에서 결제해 주세요.', 'warn'); return; }
        if (!o.clientKey) throw Object.assign(new Error('결제창을 열 수 없어요. 기관 데스크에 문의해 주세요.'), { code: '' });
        const back = location.origin + location.pathname + location.search + '#ledger/paid'; await openToss(o, back); }
      catch (e) { LG.paying = false; if (e.code === 'amount_mismatch') LG.my = null; rer(); toast(e.message === 'sdk' ? '결제창을 열 수 없어요. 잠시 후 다시 시도해 주세요.' : errMsg(e), 'bad'); } return; }
    /* 시연판: 학습자 결제창(데모) 흐름 그대로 → 이 기기에 수납 · 배분 기록 + 운영자 요청함 */
    const ok = () => { const rid = demoPay(b.ids, b.bal, b.sid); if (!rid) return; lpxPush('ledger-pay', { receiptId: rid, chargeIds: b.ids, amount: b.bal, method: 'online_card' }); location.hash = '#ledger/done/' + encodeURIComponent(rid); toast('결제했어요.', 'ok'); };
    const fail = () => { toast('결제가 끝나지 않았어요. 「결제하기」를 다시 눌러 주세요.', 'warn'); };
    if (typeof window.lshopPG === 'function') window.lshopPG(b.title, b.bal, ok, fail); else ok(); }
  /* 시연판 수납: 오래된 청구부터 배분(서버 calc.allocate와 같은 순서, 할인 줄은 먼저 상계) */
  function demoPay(ids, amount, sid) { const o = ov(); const src = demoSrc() || ((roomDoc() || {}).ledger) || {}; const sR = new Set((src.receipts || []).map(r => String(r.id))); /* 링크 결제는 로그인 없이 — 전체 문서에서 찾는다 */
    const D = { charges: (src.charges || []).map(nC), receipts: [...(src.receipts || []), ...o.receipts.filter(r => !sR.has(String(r.id)))].map(nR), allocs: [...(src.allocs || []), ...o.allocs.filter(a => !sR.has(String(a.receiptId)))].map(nA) }; const L = D.charges.filter(c => ids.includes(c.id)).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || String(a.at).localeCompare(String(b.at)));
    const paidR = new Set(D.receipts.filter(r => r.status === 'paid').map(r => r.id)); const al = {}; D.allocs.forEach(a => { if (paidR.has(a.receiptId)) al[a.chargeId] = (al[a.chargeId] || 0) + a.amount; });
    const rid = 'lp_d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); let left = amount;
    const disc = L.filter(c => c.amount < 0).reduce((s, c) => s + c.amount, 0); let credit = -disc; /* 할인은 같은 청구서의 양수 줄에서 먼저 뺀다 */
    L.filter(c => c.amount > 0).forEach(c => { let need = c.amount - (al[c.id] || 0); const cut = Math.min(credit, need); need -= cut; credit -= cut; const x = Math.min(need, left); if (x > 0) { o.allocs.push({ receiptId: rid, chargeId: c.id, amount: x }); left -= x; } });
    L.filter(c => c.amount < 0).forEach(c => o.allocs.push({ receiptId: rid, chargeId: c.id, amount: 0 }));
    o.receipts.push({ id: rid, sid, method: 'online_card', channel: 'toss', amount, paidAt: new Date(nowD()).toISOString(), status: 'paid', approvalNo: String(Math.floor(1e7 + Math.random() * 9e7)) });
    return ovSave() ? rid : null; }
  /* 토스에서 돌아온 뒤(#ledger/paid?paymentKey=…&orderId=…&amount=…): 서버가 금액을 다시 확인하고 확정 */
  async function paidBack() { if (LG.pb) return; LG.pb = 1; const q = new URLSearchParams(location.search.slice(1) + '&' + (location.hash.split('?')[1] || '')); const key = q.get('paymentKey'), oid = q.get('orderId'), amt = +q.get('amount');
    const clean = h => { try { const u = new URL(location.href); ['paymentKey', 'orderId', 'amount', 'code', 'message', 'paymentType'].forEach(k => u.searchParams.delete(k)); history.replaceState(null, '', u.pathname + u.search + h); } catch (e) { location.replace(h); } LG.paying = false; lrender(); }; /* LG.pb는 다른 화면으로 옮길 때(hashchange) 푼다 — 늦게 도착한 두 번째 호출이 완료 화면을 덮지 않게 */
    if (!key || !oid) { toast(q.get('message') || '결제를 취소했어요.', 'warn'); return clean('#ledger'); }
    try { const r = await lapi('POST', P('confirm'), { paymentKey: key, orderId: oid, amount: amt }); LG.my = null; await loadMy(true); const rid = (r.receipt || {}).id || r.receiptId || ''; toast('결제했어요.', 'ok'); clean(rid ? '#ledger/done/' + encodeURIComponent(rid) : '#ledger/hist'); }
    catch (e) { toast(errMsg(e), 'bad'); clean('#ledger'); } }
  function refundReq(fm) { const rid = fm.r.value; const why = String(fm.w.value || '').trim().slice(0, 300); if (!rid) return; const M = model(); if (!M.receipts.some(r => r.id === rid)) return;
    if (!live()) { const o = ov(); if (o.refunds.some(f => f.receiptId === rid && f.status === 'requested')) { toast('이미 환불을 요청했어요. 기관이 확인하면 알려 드려요.', 'warn'); return; } o.refunds.push({ id: 'lr_q' + Date.now().toString(36), receiptId: rid, amount: 0, status: 'requested', at: new Date(nowD()).toISOString(), reason: why }); if (!ovSave()) return; }
    lpxPush('ledger-refund-req', { receiptId: rid, reason: why }); LG.rf = ''; rer(); toast('환불 요청을 보냈어요. 기관이 금액을 계산해 확인한 뒤 알려 드려요.', 'ok'); }

  /* ── 라우팅 · 머리 메뉴 ── */
  { const base = viewPage; viewPage = (id, ...a) => { if (id !== 'ledger') return base(id, ...a); try { return mainView(); } catch (e) { console.error('lledger', e); return page('lg-off', '<p class="lg-empty">결제 화면을 그리지 못했어요. 새로 고침해 주세요.</p>'); } }; }
  { const base = shell; shell = (inner, cur, ...a) => { let h = base(inner, cur, ...a); try { if (on() && !/href="#ledger"/.test(h.split('</header>')[0])) { const o = route().a === 'ledger'; const lk = `<a href="#ledger" class="${o ? 'on' : ''}"${o ? ' aria-current="page"' : ''}>결제</a>`; const i = h.indexOf('<nav class="ln"'); if (i >= 0) { const j = h.indexOf('</nav>', i); if (j > 0) h = h.slice(0, j) + lk + h.slice(j); } } } catch (e) { console.error('lledger shell', e); } return h; }; }

  /* ── 가장 바깥 꾸미기: 앱 홈 결제 카드 · 보호자 결제 탭 · 결제 관리 바로가기 ── */
  function dueCard() { const M = model(); if (!M.open.length) return ''; const s = M.open.reduce((x, b) => x + b.bal, 0); const d = M.open.map(b => b.due).filter(Boolean).sort()[0];
    return `<a class="lg-due" href="#ledger" aria-label="결제할 청구서 ${M.open.length}건 보기">${sv('card', 22)}<span><small>결제할 청구서 ${M.open.length}건${d ? ` · 마감 ${esc(fmtD(d))}` : ''}</small><b>${won(s)}</b></span><span class="lg-go">결제하기${sv('chev', 18)}</span></a>`; }
  function post() { if (BILL) return; if (!SITE() || !SITE().org) return; const a = route().a; const lm = document.getElementById('lm'); if (!lm || !on()) return;
    if (live() && !LG.my && !LG.busy && ['home', 'mypay'].includes(a)) loadMy();
    if (a === 'home') { const mn = lm.querySelector('.tb-main') || (document.body.classList.contains('lapp') ? null : null); const c = dueCard(); if (mn && c && !mn.querySelector('.lg-due') && (!window.TUBE || window.TUBE.f === 'all')) mn.insertAdjacentHTML('afterbegin', c); }
    if (a === 'mypay' && !lm.querySelector('.lg-due, .lg-link')) { const c = dueCard() || `<a class="lg-due lg-link" href="#ledger">${sv('doc', 22)}<span><small>청구서 · 결제 · 환불</small><b>통합 결제 화면</b></span><span class="lg-go">열기${sv('chev', 18)}</span></a>`; const t = lm.querySelector('.in'); if (t) t.insertAdjacentHTML('afterbegin', `<div class="lg-wrap">${c}</div>`); }
    document.querySelectorAll('#lapp a[href="#mypay/bill"]').forEach(x => x.setAttribute('href', '#ledger')); /* 보호자 탭 · 바로가기 「결제」 → 통합 결제 */
    if (a === 'ledger') { document.title = `${SITE().org.name} · 결제`; if (document.body.classList.contains('lapp')) { const nav = document.querySelector('#lapp .ap-nav'); const t = nav && (nav.querySelector(':scope > a[href="#ledger"]') || nav.querySelector(':scope > a.tb-n-me, :scope > a[href="#acct"]')); if (nav && t) nav.querySelectorAll(':scope > a').forEach(x => { const o = x === t; x.classList.toggle('on', o); if (o) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); } } }

  /* ═════════ 링크 청구서(learner.html?t=<기관>&bill=<토큰>) — 로그인 없이 한 화면 ═════════ */
  const fnv = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ('0000000' + (h >>> 0).toString(16)).slice(-8); }; /* 스튜디오 시연판 링크 해시(ledger.js hash)와 같은 규칙 */
  const sha = async s => { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b), v => v.toString(16).padStart(2, '0')).join(''); } catch (e) { return ''; } };
  function demoBillSample(kind) { const t = today(); const S = seed('demo'); const L = S.charges.filter(c => c.billId === 'b1'); const exp = new Date(nowD().getTime() + (kind === 'expired' ? -3600e3 : 48 * 3600e3)).toISOString();
    return { org: { name: (SITE() && SITE().org && SITE().org.name) || '디디쌤 아카데미' }, unit: { name: '디디쌤 아카데미 본원' }, initial: '김○○', items: L.map(c => ({ title: c.title, itemType: c.itemType, amount: c.amount })), amount: L.reduce((s, c) => s + c.amount, 0), dueDate: t.slice(0, 7) + '-25', periodYm: t.slice(0, 7), expiresAt: exp, status: kind === 'expired' ? 'expired' : kind === 'used' ? 'used' : 'open', chargeIds: L.map(c => c.id), sid: 'demo' }; }
  async function demoBill(tok) { if (/^demo(-expired|-used)?$/.test(tok)) { const k = tok.split('-')[1] || ''; const b = demoBillSample(k); if (ov().used[tok]) b.status = 'used'; return b; }
    const doc = roomDoc(); const L = doc && doc.ledger; if (!L) return null; const h = await sha(tok); const f = fnv(tok); const ln = (L.links || []).find(x => [x.tokenHash, x.token_hash].some(v => v && (v === h || v === f)) || x.token === tok); if (!ln) return null; const lh = ln.tokenHash || ln.token_hash || h;
    const ids = (ln.chargeIds || ln.charge_ids || []).map(String); const C = (L.charges || []).map(nC).filter(c => ids.includes(c.id)); const mem = (doc.members || []).find(m => String(m.sid || m.id) === String(ln.sid)) || {};
    const sR = new Set((L.receipts || []).map(r => String(r.id))); const paidR = new Set([...(L.receipts || []), ...ov().receipts.filter(r => !sR.has(String(r.id)))].map(nR).filter(r => r.status === 'paid').map(r => r.id)); const al = {}; [...(L.allocs || []), ...ov().allocs.filter(a => !sR.has(String(a.receiptId)))].map(nA).forEach(a => { if (paidR.has(a.receiptId)) al[a.chargeId] = (al[a.chargeId] || 0) + a.amount; });
    const bal = Math.max(0, C.reduce((s, c) => s + c.amount - (al[c.id] || 0), 0)); const exp = ln.expiresAt || ln.expires_at; const used = ln.usedAt || ln.used_at || ov().used[lh]; const expT = exp ? (/^\d{4}-\d{2}-\d{2}$/.test(String(exp)) ? Date.parse(exp + 'T23:59:59') : Date.parse(exp)) : 0; /* 날짜만 있으면 그날 끝(스튜디오 today()와 같은 기기 현지 날짜)까지 */
    const unit = ((L.units || []).find(u => C[0] && u.id === C[0].unitId) || {}).name || '';
    return { org: { name: ((doc.lsite && doc.lsite.pub && doc.lsite.pub.org) || doc.org || {}).name || '' }, unit: { name: unit }, initial: mask(mem.name || mem.nick), items: C.map(c => ({ title: c.title, itemType: c.itemType, amount: c.amount })), amount: bal, dueDate: (C.map(c => c.dueDate).filter(Boolean).sort()[0]) || '', periodYm: (C[0] || {}).periodYm || '', expiresAt: exp, status: used || bal <= 0 ? 'used' : expT && expT < nowD().getTime() ? 'expired' : 'open', chargeIds: ids, sid: String(ln.sid || ''), key: lh }; }
  const nBill = j => { const b = j.bill || j; const items = (b.items || b.charges || []).map(c => ({ title: c.title || ITEM[c.itemType || c.item_type] || '항목', itemType: c.itemType || c.item_type || 'etc', amount: Math.round(+c.amount || 0) }));
    const nm = v => typeof v === 'string' ? { name: v } : (v && typeof v === 'object' ? { name: String(v.name || '') } : { name: '' });
    return { org: nm(b.org || b.orgName), unit: nm(b.unit || b.unitName), initial: String(b.initial || b.who || b.nameMask || '').replace(/\s*학습자님\s*$/, ''), items, amount: Math.round(+pick(b, 'amount', 'balance', 'total') || items.reduce((s, c) => s + c.amount, 0)), dueDate: String(pick(b, 'dueDate', 'due_date') || '').slice(0, 10), periodYm: pick(b, 'periodYm', 'period_ym') || '', expiresAt: pick(b, 'expiresAt', 'expires_at') || '', status: b.status || (b.usedAt || b.used_at ? 'used' : 'open'), payOnline: b.payOnline !== false && j.payOnline !== false }; };
  async function loadBill() { if (LG.bBusy) return; LG.bBusy = true; LG.bErr = '';
    try { if (live()) { if (!LR.tid) throw Object.assign(new Error(''), { code: 'not_found' }); const j = await lapi('GET', `/api/pub/${encodeURIComponent(LR.tid)}/ledger-bill?t=${encodeURIComponent(BILL)}`); LG.bill = nBill(j); }
      else { const b = await demoBill(BILL); if (!b) throw Object.assign(new Error(''), { code: 'not_found' }); LG.bill = b; } }
    catch (e) { const c = String(e.code || ''); LG.bErr = /expire/.test(c) || e.status === 410 ? 'expired' : /used|paid/.test(c) || e.status === 409 ? 'used' : 'invalid'; }
    LG.bBusy = false; billRender(); }
  /* 시안 4a~4c: 위 줄(제목 · 기관) → 안내 띠 → 청구서 카드(금액 · 항목 · 할인 그린) → 결제 방법 → 아래 고정 결제 버튼 / 완료: 체크 · 내역 표 · 링크 닫힘 안내 · 아래 버튼 2개 */
  const bTop = (t, sub) => `<header class="lg-top"><h1>${esc(t)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</header>`;
  const bShell = (inner, bar) => `<main class="lg lg-link-pg${bar ? ' has-bar' : ''}" id="lgBill">${inner}${bar ? `<div class="lg-bar">${bar}</div>` : ''}</main>`;
  const orgSub = B => [B && B.org && B.org.name, B && B.unit && B.unit.name].filter(Boolean).join(' · ');
  function billBody() { const B = LG.bill; const st = LG.bErr || (B && B.status !== 'open' ? B.status : '');
    if (LG.bDone) { const d = LG.bDone; const url = okUrl(d.url); const what = B && B.items ? B.items.filter(c => c.amount > 0).map(c => c.title).slice(0, 2).join(' · ') : '';
      const app = live() && LR.tid ? `learner.html?t=${encodeURIComponent(LR.tid)}#ledger` : 'learner.html#ledger';
      return [`${bTop('결제 완료', orgSub(B))}<div class="lg-in narrow"><div class="lg-ok" role="status"><span class="lg-okc">${sv('check', 32)}</span><h2>결제가 끝났어요</h2><p>${esc((B && B.org && B.org.name) || '기관')}에 바로 알려 드렸어요</p></div>
        <dl class="lg-amt lg-tbl"><div><dt>결제 금액</dt><dd class="lg-b">${won(d.amount)}</dd></div><div><dt>결제 시각</dt><dd>${esc(fmtDT(d.paidAt))}</dd></div><div><dt>결제 수단</dt><dd>카드 · 간편결제</dd></div>${what ? `<div><dt>내용</dt><dd>${esc(what)}</dd></div>` : ''}</dl>
        <p class="lg-strip">${sv('lock', 16)}<span>이 청구서 링크는 결제가 끝나 다시 열리지 않아요. 영수증은 아래에서 저장할 수 있어요.</span></p></div>`,
        `${url ? `<a class="lg-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${sv('doc', 18)}영수증 보기</a>` : `<button type="button" class="lg-btn" data-lg="print">${sv('doc', 18)}영수증 저장</button>`}<a class="lg-btn pri big" href="${esc(app)}">앱에서 보기</a>`]; }
    if (!B && !st) return [`${bTop('청구서')}<p class="lg-empty" role="status">${esc(LG.conf || '청구서를 불러오고 있어요…')}</p>`, ''];
    if (st) { const T = { expired: ['clock', '링크 사용 기간이 지났어요', '청구서를 보낸 기관에 새 링크를 요청해 주세요.'], used: ['check', '이미 결제한 청구서예요', '같은 링크로 두 번 결제되지 않아요. 결제 내역은 기관 앱의 「결제」에서 볼 수 있어요.'], invalid: ['warn', '청구서를 찾지 못했어요', '링크 주소가 잘렸거나 잘못됐어요. 받은 메시지의 링크를 다시 눌러 주세요.'] }[st] || ['warn', '청구서를 열 수 없어요', '기관에 문의해 주세요.'];
      return [`${bTop('청구서', orgSub(B))}<div class="lg-in narrow"><div class="lg-state st-${esc(st)}" role="alert">${sv(T[0], 36)}<h2>${T[1]}</h2><p>${T[2]}</p></div></div>`, '']; }
    const exp = B.expiresAt ? fmtDT(B.expiresAt) : ''; const off = B.payOnline === false || LG.po === false; const due = B.dueDate ? `${+B.dueDate.slice(5, 7)}.${+B.dueDate.slice(8, 10)}` : '';
    return [`${bTop('청구서', orgSub(B))}<div class="lg-in narrow"><p class="lg-strip">${sv('ext', 16)}<span>문자로 받은 청구서 · 로그인 없이 결제${exp ? ` · ${esc(exp)}까지` : ''} 한 번만 쓸 수 있어요</span></p>
      <article class="lg-bill lg-one"><div class="lg-bh"><span><small class="lg-bm">${esc(orgSub(B) || '청구서')}</small><h2>${esc(B.initial || '○○')} 학습자님 ${esc(ym(B.periodYm) ? ym(B.periodYm) + ' ' : '')}청구서</h2></span>${due ? `<span class="lg-tag ${B.dueDate < today() ? 'bad' : 'mid'}">${sv('clock', 14)}${B.dueDate < today() ? '기한 지남' : '결제 기한'} ${esc(due)}</span>` : ''}</div>
        <p class="lg-total" aria-label="결제할 금액 ${won(B.amount)}">${(Number(B.amount) || 0).toLocaleString('ko-KR')}<small>원</small></p>
        <ul class="lg-lines-s">${B.items.map(c => `<li class="${c.amount < 0 ? 'disc' : ''}"><span>${esc(c.title)}${c.amount < 0 ? ' <small>할인</small>' : ''}</span><b>${c.amount < 0 ? '−' : ''}${won(Math.abs(c.amount))}</b></li>`).join('')}</ul></article>
      ${off ? noOnline() : `<h3 class="lg-sh">결제 방법</h3><div class="lg-pm on" role="radio" aria-checked="true" tabindex="0"><span class="lg-rd" aria-hidden="true"></span><span><b>카드 · 간편결제</b><small>토스페이먼츠 결제창이 열려요</small></span>${sv('card', 22)}</div>`}
      <p class="lg-strip">${sv('lock', 16)}<span>결제 대금은 ${esc((B.unit && B.unit.name) || (B.org && B.org.name) || '기관')}으로 바로 입금돼요. 이름과 카드번호는 청구서에 표시하거나 저장하지 않아요.</span></p></div>`,
      off ? '' : `<button type="button" class="lg-btn pri big wide" data-lg="bpay"${LG.paying ? ' disabled' : ''}>${sv('lock', 20)}${won(B.amount)} 결제하기</button>`]; }
  function billRender() { const app = document.getElementById('lapp'); if (!app) return; document.body.className = 'lg-billon'; const [inner, bar] = billBody(); app.innerHTML = bShell(inner, bar); document.title = `${(LG.bill && LG.bill.org && LG.bill.org.name) || '디디쌤'} · 청구서`; }
  const bKeep = () => `didisam.lgbill.${LR.tid || 'x'}`;
  async function billPay() { const B = LG.bill; if (!B || LG.paying || B.status !== 'open') return;
    if (live()) { LG.paying = true; billRender();
      try { const o = await lapi('POST', `/api/pub/${encodeURIComponent(LR.tid)}/ledger-bill-order`, { t: BILL }); if (o.payOnline === false || !o.orderId) { LG.po = false; LG.paying = false; billRender(); return; } if (!o.clientKey) throw new Error('결제창을 열 수 없어요. 기관에 문의해 주세요.');
        const u = new URL(location.href); u.hash = ''; ['paymentKey', 'orderId', 'amount', 'code', 'message', 'paymentType', 'paid'].forEach(k => u.searchParams.delete(k)); u.searchParams.set('paid', '1'); try { sessionStorage.setItem(bKeep(), JSON.stringify({ org: B.org, unit: B.unit, items: B.items.map(c => ({ title: c.title, amount: c.amount })), amount: B.amount, status: 'used' })); } catch (x) { } await openToss(o, u.toString()); }
      catch (e) { LG.paying = false; if (e.code === 'amount_mismatch') { LG.bill = null; loadBill(); } else billRender(); toast(e.message === 'sdk' ? '결제창을 열 수 없어요. 잠시 후 다시 시도해 주세요.' : errMsg(e), 'bad'); if (/expire|used/.test(String(e.code || ''))) { LG.bErr = /expire/.test(e.code) ? 'expired' : 'used'; billRender(); } } return; }
    const ok = () => { const rid = demoPay(B.chargeIds, B.amount, B.sid); if (!rid && !/^demo/.test(BILL)) return; const o = ov(); o.used[B.key || BILL] = new Date(nowD()).toISOString(); ovSave(); lpxPush('ledger-bill-pay', { receiptId: rid || '', chargeIds: B.chargeIds, amount: B.amount, tokenHash: B.key || '' }); LG.bDone = { amount: B.amount, paidAt: new Date(nowD()).toISOString(), url: '' }; billRender(); };
    if (typeof window.lshopPG === 'function') window.lshopPG(`${ym(B.periodYm)} 청구서`.trim(), B.amount, ok, () => toast('결제가 끝나지 않았어요. 다시 눌러 주세요.', 'warn')); else ok(); }
  async function billBack() { const q = new URLSearchParams(location.search); const key = q.get('paymentKey'), oid = q.get('orderId'), amt = +q.get('amount');
    const clean = () => { try { const u = new URL(location.href); ['paymentKey', 'orderId', 'amount', 'code', 'message', 'paymentType', 'paid'].forEach(k => u.searchParams.delete(k)); history.replaceState(null, '', u.pathname + u.search); } catch (e) { } };
    if (!key || !oid) { clean(); if (q.get('code') || q.get('message')) toast(q.get('message') || '결제를 취소했어요.', 'warn'); return loadBill(); }
    LG.conf = '결제를 확인하고 있어요…'; billRender();
    try { const r = await lapi('POST', `/api/pub/${encodeURIComponent(LR.tid)}/ledger-bill-confirm`, { t: BILL, paymentKey: key, orderId: oid, amount: amt }); const rc = r.receipt || {}; clean(); let kept = null; try { kept = JSON.parse(sessionStorage.getItem(bKeep()) || 'null'); sessionStorage.removeItem(bKeep()); } catch (x) { } LG.bill = LG.bill || kept || { org: { name: '' }, items: [], status: 'used' }; LG.bDone = { amount: rc.amount || amt, paidAt: rc.paidAt || rc.paid_at || new Date().toISOString(), url: rc.receiptUrl || rc.receipt_url || '' }; LG.conf = ''; billRender(); }
    catch (e) { clean(); LG.conf = ''; toast(errMsg(e), 'bad'); loadBill(); } }
  if (BILL) { /* 링크 청구서: 학습자 사이트 화면 대신 이 한 화면만(사이트 미게시 · 로그인 없음이어도) */
    const wrap = () => { if (lrender.__lgBill) return; const w = () => { if (!LG.started) { LG.started = 1; if (live() && BQ.get('paid') === '1') billBack(); else loadBill(); } billRender(); }; w.__lgBill = 1; lrender = w; };
    wrap(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(wrap, 0)); addEventListener('load', wrap); }

  const late = () => { if (LG.late || BILL) return; LG.late = 1; const base = lrender; lrender = (...x) => { const r = base(...x); try { post(); } catch (e) { console.error('lledger post', e); } return r; }; try { if (document.getElementById('lm')) post(); } catch (e) { } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late); else setTimeout(late, 0);

  /* ── 이벤트 ── */
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-lg]'); if (!el) return; const k = el.dataset.lg; e.preventDefault();
    if (k === 'bpay') return billPay(); if (k === 'print') { try { window.print(); } catch (x) { } return; }
    if (k === 'reload') { LG.err = ''; LG.my = null; return loadMy(true); }
    if (k === 'who') { LG.who = el.dataset.v || 'all'; return rer(); }
    if (k === 'pay') return pay(el.dataset.v); });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'lgRfR') LG.rf = e.target.value; });
  document.addEventListener('submit', e => { if (!e.target || e.target.id !== 'lgRf') return; e.preventDefault(); refundReq(e.target); });
  addEventListener('hashchange', () => { if (!/^#ledger\/paid/.test(location.hash)) LG.pb = 0; });
})();
