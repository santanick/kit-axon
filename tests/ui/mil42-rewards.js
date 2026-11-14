'use strict';
/* v42 학습 마일리지 — 스튜디오 「보상 · 신청 승인 · 부정 의심」(milrw.js) 점검(PC 1440 · 휴대폰 390)
   MIL_TABS 등록 → 카탈로그(권장값 · 국비 자물쇠 · 추가 시 국비 대상 거절 · 권장 이탈 경고만) → 신청 승인(확인할 점 · 확인 카드 · 맞춤 · 일괄 · 월 한도 경고만 · 보호자 대기)
   → 청구서 미리보기 = v41 원장 정가 줄 + 마일리지 차감 음수 줄 → 반려(사유 · 복원) → 회수(줄 void · 복원) → 부정 의심(사유 필수 · 보류 → 확정/해제)
   → 기업 리워드 숍(과세 안내 G 확인 2개) · 1인별 지급액 CSV · 보내기 → 교강사 조회만 → 운영 모드 /api/mileage/* → 넘침 · 글자 · 버튼 크기 · pageerror 0
   mil.js(요원 S)가 아직 없으면 테스트가 최소 호스트(MENU.mileage · VIEWS.mileage)를 만들어 MIL_TABS를 그린다. */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const SHOTS = process.env.MIL_SHOTS || '';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1'); await new Promise(k => srv.once('listening', k));
  const B = `http://127.0.0.1:${srv.address().port}`; const browser = await chromium.launch(); const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' });
  const mok = () => p.click('#modal [data-mact="ok"]'); const mc = () => p.click('#modal [data-mact="c"]'); const open = () => p.evaluate(() => !!document.querySelector('#modal'));
  const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };

  /* 호스트: mil.js가 있으면 그 메뉴를, 없으면 최소 호스트 */
  await p.evaluate(() => { localStorage.setItem('didisam.emptyStart', '0'); });
  await p.evaluate(() => {
    window.milOpen = (org, ed) => { const eb = document.querySelector('#suEmpty'); if (eb) eb.checked = false; createOrg(org, '점검 기관', ed); S.me.role = 'owner';
      if (!VIEWS.mileage) { MENU.mileage = { label: '마일리지', ws: 'ops' }; VIEWS.mileage = () => { const T = window.MIL_TABS.slice().sort((a, b) => (a.order || 0) - (b.order || 0)); const cur = T.find(t => t.id === UI.mil) || T[0]; return `<div class="seg2" role="tablist">${T.map(t => { const n = t.badge ? t.badge() : 0; return `<button role="tab" data-act="tab" data-key="mil" data-v="${t.id}" aria-selected="${t === cur}">${t.label}${n ? ' ' + n : ''}</button>`; }).join('')}</div>${cur.render()}`; }; }
      if (!S.nav.ws.includes('ops')) S.nav.ws.push('ops'); S.nav.tabs.ops = S.nav.tabs.ops || []; if (!S.nav.tabs.ops.some(x => x.id === 'mileage')) S.nav.tabs.ops.push({ id: 'mileage', on: true }); else S.nav.tabs.ops.find(x => x.id === 'mileage').on = true;
      go('mileage'); };
    window.milTab = id => { UI.mil = id; UI.mileage = id; if (typeof window.milGo === 'function') window.milGo(id); render(); };
  });

  /* ① 탭 등록 · 학원(k12) 카탈로그 */
  const T0 = await p.evaluate(() => { milOpen('k12'); milTab('rewards'); const ids = window.MIL_TABS.map(t => t.id); const cards = [...document.querySelectorAll('.mrw-rw')]; const tu = cards.find(c => /학원비 차감/.test(c.querySelector('.hd').textContent));
    return { ids, n: cards.length, recSame: tu ? tu.querySelectorAll('.mrw-rec.same').length : 0, rate: tu ? /1P = 1원/.test(tu.textContent) : false, note: !!document.querySelector('.mrw > .mrw-note.n-info'), lock: document.querySelectorAll('.mrw-locktag').length, pri: getComputedStyle(document.querySelector('.mrw .btn.pri')).backgroundColor }; });
  ok(['rewards', 'approvals', 'fraud'].every(i => T0.ids.includes(i)), 'MIL_TABS 3개 등록 ' + T0.ids);
  ok(T0.n === 5 && T0.recSame >= 3 && T0.rate && T0.note && T0.lock === 0, '학원 카탈로그 5종 · 권장값 같음 배지 · 1P=1원 · 국비 안내(해당 과정 없음) ' + JSON.stringify(T0));
  ok(T0.pri === 'rgb(0, 134, 45)', '주 버튼 #00862D(마일리지 화면 한정) ' + T0.pri);
  await shot('r1-rewards');
  const F1 = await p.evaluate(() => { S.classes[0].funded = true; render(); return { lock: !!document.querySelector('.mrw > .mrw-lock'), tags: document.querySelectorAll('.mrw-rw .mrw-locktag').length, cash: document.querySelectorAll('.mrw-rw .mrw-pill.info').length }; });
  ok(F1.lock && F1.tags === F1.cash && F1.tags > 0, '국비 과정 표시 → 제품 고정 자물쇠 · 금전성 카드마다 잠금 태그 ' + JSON.stringify(F1));

  /* ② 보상 추가: 국비 과정 대상 거절 · 권장 이탈은 경고만 */
  await p.click('[data-act="mrw-rw-new"]'); const kinds = await p.$$eval('#modal .mrw-pi', a => a.map(x => x.textContent)); await p.click('#modal [data-act="mrw-rw-kind"][data-v="goods"]');
  await p.fill('#modal [name="title"]', '점검 굿즈'); await p.fill('#modal [name="fixedP"]', '2000'); await p.fill('#modal [name="pm"]', '3'); await p.check('#modal [name="aud"][value="cls"]');
  await p.check(`#modal [name="cls"][value="c0"]`); const n0 = await p.evaluate(() => S.milrw.rewards.length); await mok(); const blk = { open: await open(), n: await p.evaluate(() => S.milrw.rewards.length), toast: await p.textContent('#toasts') };
  ok(kinds.length === 5 && blk.open && blk.n === n0 && /국비/.test(blk.toast), '국비 과정 대상 금전성 보상 → 저장 거절(funded_blocked) ' + JSON.stringify(blk));
  await p.uncheck('#modal [name="cls"][value="c0"]'); await p.check('#modal [name="cls"][value="c1"]'); await mok();
  const A2 = await p.evaluate(() => ({ n: S.milrw.rewards.length, last: S.milrw.rewards[S.milrw.rewards.length - 1], log: S.milrw.log[0], t: document.querySelector('#toasts').textContent, card: [...document.querySelectorAll('.mrw-rw')].some(c => /점검 굿즈/.test(c.textContent) && c.querySelector('.mrw-rec.off')) }));
  ok(A2.n === n0 + 1 && A2.last.audience.cls.join() === 'c1' && A2.last.perSid.month === 3 && /권장값과 다른 값/.test(A2.t) && /권장값 벗어남/.test(A2.log.reason) && A2.card, '비국비 대상 저장 · 권장 이탈 경고만(D2) · 변경 이력 ' + A2.t);
  await p.evaluate(() => { S.classes[0].funded = false; render(); });

  /* ③ 신청 · 승인: 확인할 점 */
  const AP = await p.evaluate(() => { milTab('approvals'); const R = S.milrw.redeems.filter(r => r.status === 'requested'); const C = {}; R.forEach(r => { C[r.id] = window.milrw.checks(r.id).map(c => c.code + ':' + c.tone + (c.fix ? ':' + c.fix : '')).join('|'); });
    const row = id => document.querySelector(`tr[data-rd="${id}"]`); const dis = id => { const b = row(id).querySelector('.nw .btn'); return b.disabled; };
    return { n: R.length, C, bulk: document.querySelector('[data-act="mrw-bulk"]').textContent, dis126: dis('mrd_127'), dis124: dis('mrd_124'), dis_dup: R.filter(r => /per_month/.test(C[r.id])).map(r => dis(r.id)), fit: !!row('mrd_124').querySelector('[data-act="mrw-fit"]') }; });
  const ids = Object.keys(AP.C); const clean = ids.filter(i => !AP.C[i]);
  ok(AP.n === 6 && clean.length === 3, '대기 6건 · 확인할 점 없음 3건 ' + JSON.stringify(AP.C));
  ok(/bill_pct:block:84000/.test(AP.C.mrd_124) && /guardian:block/.test(AP.C.mrd_127) && AP.dis126 && AP.dis124 && AP.fit, '상한 30% 초과 → 84,000P 맞춤 제안 · 보호자 확인 전 승인 불가 ' + AP.C.mrd_124 + ' / ' + AP.C.mrd_127);
  ok(AP.dis_dup.length === 1 && AP.dis_dup[0] === false && /3건/.test(AP.bulk), '1인 월 한도 중복 = 경고만(승인 가능) · 일괄 승인 3건 ' + AP.bulk);
  /* 청구서 미리보기(v41 원장 정가 줄 + 마일리지 차감 줄) */
  const BV = await p.evaluate(() => { document.querySelector('[data-act="mrw-sel"][data-v="mrd_118"]').click(); const c = document.querySelector('.mrw-bill'); const rows = [...c.querySelectorAll('tbody tr')].map(t => t.textContent.replace(/\s+/g, ' ').trim()); return { rows, pv: !!c.querySelector('tr.mil.mrw-pv'), B: window.milrw.billOf('mrd_118') }; });
  ok(BV.B && BV.B.lines.filter(l => l.amount > 0).length === 2 && BV.pv && /−1,000원/.test(BV.rows.join()) && /청구 합계\s*319,000원/.test(BV.rows.join()), '청구서 미리보기: 정가 줄 2 + 차감 미리보기 줄 · 합계 ' + BV.rows.join(' | '));
  await shot('r2-approvals');
  /* 승인: 확인 카드(취소 시 미실행) → 원장 음수 줄 */
  await p.click('tr[data-rd="mrd_118"] [data-act="mrw-ok"]'); const card = await p.textContent('#modal .mb'); await mc(); const c0 = await p.evaluate(() => S.ledger.charges.filter(c => c.srcType === 'mileage').length);
  await p.click('tr[data-rd="mrd_118"] [data-act="mrw-ok"]'); await mok();
  const L1 = await p.evaluate(() => { const ch = S.ledger.charges.filter(c => c.srcType === 'mileage'); const r = S.milrw.redeems.find(x => x.id === 'mrd_118'); const E = S.milrw.entries.filter(e => e.redeemId === 'mrd_118'); return { n: ch.length, ch: ch[0], st: r.status, fu: r.fulfil, E: E.map(e => e.kind + e.points).join(','), au: S.audit[0].what }; });
  ok(/마일리지 차감/.test(card) && c0 === 0 && L1.n === 1 && L1.ch.amount === -1000 && L1.ch.itemType === 'etc' && L1.ch.srcId === 'mrd_118' && L1.ch.bill === 'b_mrw_7100118' && L1.st === 'fulfilled' && L1.fu.chargeId === L1.ch.id, '승인 → v41 원장 「마일리지 차감」 음수 줄(src_type mileage) ' + JSON.stringify(L1.ch));
  ok(L1.E === 'hold-1000,release1000,use-1000' && /승인/.test(L1.au), 'hold → release + use 줄 · 감사 기록 ' + L1.E);
  /* 맞춤 → 승인 → 상한 이내 */
  await p.click('tr[data-rd="mrd_124"] [data-act="mrw-fit"]'); await mok();
  const FT = await p.evaluate(() => ({ r: S.milrw.redeems.find(x => x.id === 'mrd_124'), C: window.milrw.checks('mrd_124').length, sum: S.milrw.entries.filter(e => e.redeemId === 'mrd_124').reduce((s, e) => s + e.points, 0) }));
  ok(FT.r.points === 84000 && FT.r.won === 84000 && FT.C === 0 && FT.sum === -84000, '84,000P로 맞춤 · 남는 6,000P 즉시 복원 ' + JSON.stringify({ p: FT.r.points, sum: FT.sum }));
  await p.click('tr[data-rd="mrd_124"] [data-act="mrw-ok"]'); await mok();
  const CP = await p.evaluate(() => { const B = window.milrw.billOf('mrd_124'); const base = B.lines.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0); const mil = -B.lines.filter(l => l.srcType === 'mileage').reduce((s, l) => s + l.amount, 0); return { base, mil, net: base - mil }; });
  ok(CP.mil === 84000 && CP.mil <= CP.base * 0.3 && CP.net > 0, '차감 ≤ 청구서 30% · 순합 ≥ 0 ' + JSON.stringify(CP));
  /* 일괄 승인: 확인할 점 없는 것만 */
  await p.click('.mrw-acts [data-act="mrw-bulk"]'); const bc = await p.textContent('#modal .mb'); await mok();
  const BK = await p.evaluate(() => S.milrw.redeems.filter(r => ['mrd_121', 'mrd_130'].includes(r.id)).map(r => r.status).join() + '|' + S.milrw.redeems.filter(r => r.status === 'requested').map(r => r.id).join());
  ok(/2건/.test(bc) && /^approved|fulfilled/.test(BK) && !/mrd_121/.test(BK.split('|')[1]), '일괄 승인 2건(경고 · 차단 건 제외) ' + BK);
  const goods = await p.evaluate(() => S.milrw.redeems.find(r => r.id === 'mrd_130')); ok(goods && goods.status === 'approved', '굿즈는 승인 후 수령 대기 ' + (goods && goods.status));
  /* 월 한도 중복 = 경고 확인 후 승인 */
  const dupId = await p.evaluate(() => S.milrw.redeems.find(r => r.status === 'requested' && window.milrw.checks(r.id).some(c => c.code === 'per_month')).id);
  await p.click(`tr[data-rd="${dupId}"] [data-act="mrw-ok"]`); const dc = await p.textContent('#modal .mf'); await mok(); const dupSt = await p.evaluate(id => S.milrw.redeems.find(r => r.id === id).status, dupId);
  ok(/경고를 확인하고 승인/.test(dc) && dupSt === 'approved', '1인 월 한도 중복: 경고 확인 후 승인 ' + dupSt);
  /* 보호자 확인(보호자 앱 이벤트) → 승인 가능 · 반려(사유 필수 · 복원) */
  const GD = await p.evaluate(() => { LPX['mile-guardian']({ data: { id: 'mrd_127', ok: true } }); render(); return document.querySelector('tr[data-rd="mrd_127"] [data-act="mrw-ok"]') ? 1 : 0; });
  await p.click('tr[data-rd="mrd_127"] [data-act="mrw-no"]'); await mok(); const still = await open(); await p.fill('#modal [name="why"]', '청구서 확정 전이라 다음 달에 다시 신청해 주십시오'); await mok();
  const RJ = await p.evaluate(() => { const r = S.milrw.redeems.find(x => x.id === 'mrd_127'); return { st: r.status, why: r.reason, sum: S.milrw.entries.filter(e => e.redeemId === r.id).reduce((s, e) => s + e.points, 0) }; });
  ok(GD === 1 && still && RJ.st === 'rejected' && RJ.sum === 0 && /다음 달/.test(RJ.why), '보호자 확인 → 승인 가능, 반려 사유 필수 · 잡아 둔 P 복원 ' + JSON.stringify(RJ));
  /* 회수: 원장 줄 void · 복원(원 줄은 남김) */
  await p.evaluate(() => { UI.mrwApF = 'done'; render(); }); await p.click('tr[data-rd="mrd_118"] [data-act="mrw-back"]'); await p.fill('#modal [name="why"]', '중복 신청 정정'); await mok();
  const RC = await p.evaluate(() => { const r = S.milrw.redeems.find(x => x.id === 'mrd_118'); const ch = S.ledger.charges.find(c => c.id === r.fulfil.chargeId); return { st: r.status, ch: ch && ch.status, sum: S.milrw.entries.filter(e => e.redeemId === r.id).reduce((s, e) => s + e.points, 0), kept: !!ch }; });
  ok(RC.st === 'reclaimed' && RC.ch === 'void' && RC.kept && RC.sum === 0, '회수 → 차감 줄 void(삭제 아님) · restore ' + JSON.stringify(RC));
  /* 학습자 앱 신청 이벤트 → 대기 · hold */
  const LX = await p.evaluate(() => { const w = S.milrw.rewards.find(r => r.kind === 'goods'); LPX['mile-redeem']({ who: S.members[11].id, at: nowStr(), data: { rewardId: w.id, points: w.cost.fixedP, idem: 'lx1' } }); LPX['mile-redeem']({ who: S.members[11].id, at: nowStr(), data: { rewardId: w.id, points: w.cost.fixedP, idem: 'lx1' } }); const R = S.milrw.redeems.filter(r => r.idem === 'lx1'); return { n: R.length, hold: S.milrw.entries.filter(e => e.redeemId === (R[0] || {}).id && e.kind === 'hold').length }; });
  ok(LX.n === 1 && LX.hold === 1, '학습자 신청 이벤트 → 사용 대기 1건(멱등) ' + JSON.stringify(LX));

  /* ④ 부정 의심 */
  await p.evaluate(() => milTab('fraud')); await shot('r3-fraud');
  const FR0 = await p.evaluate(() => ({ n: document.querySelectorAll('.mrw-fr').length, held: document.querySelector('.mrw-kpi b').textContent, lock: !!document.querySelector('.mrw-fr .mrw-lock'), auto: /자동으로 취소하지 않습니다/.test(document.querySelector('.mrw').textContent) }));
  ok(FR0.n === 2 && FR0.held === '3,300P' && FR0.lock && FR0.auto, '부정 의심 2건 · 보류 3,300P · 본인 지급 금지 잠금 · 자동 취소 없음 ' + JSON.stringify(FR0));
  await p.click('[data-act="mrw-fl"][data-v="mfl_32"][data-d="confirm"]'); await mok(); const s1 = await open(); await p.fill('#modal [name="why"]', '제출 간격 확인 결과 자동 입력'); await mok();
  await p.click('[data-act="mrw-fl"][data-v="mfl_31"][data-d="clear"]'); await p.fill('#modal [name="why"]', '형제 원생으로 확인'); await mok();
  const FR = await p.evaluate(() => { const E = id => S.milrw.entries.filter(e => e.flag === id).map(e => e.status).join(); return { a: E('mfl_32'), b: E('mfl_31'), st: S.milrw.flags.map(f => f.status).join(), held: document.querySelector('.mrw-kpi b').textContent }; });
  ok(s1 && FR.a === 'void' && FR.b === 'posted,posted,posted' && FR.st === 'cleared,confirmed' && FR.held === '0P', '사유 필수 · 취소 확정 = void · 문제없음 = posted ' + JSON.stringify(FR));

  /* ⑤ 교강사: 조회만 */
  const TC = await p.evaluate(() => { S.me.role = 'teacher'; milTab('approvals'); UI.mrwApF = 'wait'; render(); const r = { ok: document.querySelectorAll('[data-act="mrw-ok"],[data-act="mrw-bulk"]').length, ro: /조회만/.test(document.querySelector('.mrw').textContent) }; milTab('rewards'); r.add = !!document.querySelector('[data-act="mrw-rw-new"]'); S.me.role = 'owner'; return r; });
  ok(TC.ok === 0 && TC.ro && !TC.add, '교강사: 승인 · 추가 버튼 없음 ' + JSON.stringify(TC));

  /* ⑥ 휴대폰 390: 넘침 · 글자 12px · 버튼 44px */
  await p.setViewportSize({ width: 390, height: 844 });
  const MOB = await p.evaluate(() => { const out = {}; for (const t of ['rewards', 'approvals', 'fraud']) { milTab(t); const m = document.querySelector('.mrw'); const small = [...m.querySelectorAll('*')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length;
    const btn = [...m.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44 && !b.classList.contains('mrw-link')).length; out[t] = { over: document.documentElement.scrollWidth - 390, wide: [...m.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > 392 && !e.closest('.mrw-tw')).length, small, btn }; } return out; });
  ok(Object.values(MOB).every(x => x.over <= 0 && x.wide === 0 && x.small === 0 && x.btn === 0), '휴대폰 390: 넘침 0 · 글자 12px+ · 버튼 44px+ ' + JSON.stringify(MOB));
  await shot('r4-mobile'); await p.setViewportSize({ width: 1440, height: 900 });

  /* ⑦ 기업: 리워드 숍 과세 안내 · 1인별 지급액 */
  await p.evaluate(() => { milOpen('corp'); milTab('rewards'); UI.mrwSub = 'shop'; render(); });
  const SH0 = await p.evaluate(() => ({ on: S.milrw.shop.on, cards: document.querySelectorAll('.mrw-g3 .mrw-card').length, tax: document.querySelectorAll('.mrw-g3 .mrw-pill.wait').length }));
  await p.click('[data-act="mrw-shop"]'); await mok(); const off = await p.evaluate(() => S.milrw.shop.on);
  await p.click('[data-act="mrw-shop"]'); const sheet = await p.textContent('#modal .mb'); await p.check('#modal [name="a1"]'); await mok(); const stay = await open(); await p.check('#modal [name="a2"]'); await mok();
  const SH = await p.evaluate(() => ({ on: S.milrw.shop.on, ack: S.milrw.shop.ack, log: S.milrw.log[0].what }));
  ok(SH0.on && SH0.cards === 2 && SH0.tax === 2 && off === false, '리워드 숍 2종 · 과세 대상 표시 · 끄기 확인 ' + JSON.stringify(SH0));
  ok(/근로소득/.test(sheet) && /성과 평가/.test(sheet) && /국비/.test(sheet) && stay && SH.on && SH.ack.payroll && SH.ack.notKpi && /안내 G/.test(SH.log), '켜기 = 안내 G 확인 2개 필수 · 변경 이력 ' + SH.log);
  await shot('r5-shop');
  await p.evaluate(() => { UI.mrwSub = 'pay'; render(); }); await shot('r6-pay');
  const PY = await p.evaluate(() => { let csv = null; const base = window.downloadCSV; window.downloadCSV = (n, c, r) => { csv = { n, c, r }; }; document.querySelector('[data-act="mrw-pay-csv"]').click(); window.downloadCSV = base;
    const rows = window.milrw.payRows(today().slice(0, 7)); const tot = document.querySelector('.mrw-tbl tr.tot').textContent; const txt = document.querySelector('.mrw').textContent; return { csv, rows, tot, pii: S.members.some(m => txt.includes(m.name) || txt.includes(m.phone)) }; });
  const sum = PY.rows.reduce((s, r) => s + r.amount, 0);
  ok(PY.rows.length >= 3 && PY.csv && PY.csv.c.join() === '사번,소속,지급 품목,수량,지급일,지급 시가(원)' && PY.csv.r.length === PY.rows.length && PY.tot.includes(sum.toLocaleString('ko-KR') + '원') && !PY.pii, '1인별 지급액: 시가 기준 · CSV 6열 · 이름 · 연락처 없음 ' + JSON.stringify({ n: PY.rows.length, sum }));
  await p.click('[data-act="mrw-pay-send"]'); await mok(); const SD = await p.evaluate(() => ({ sent: S.milrw.sent[0], au: S.audit[0].what }));
  ok(SD.sent.ym === (await p.evaluate(() => today().slice(0, 7))) && /급여 담당/.test(SD.au), '급여 담당자에게 보내기 = 확인 카드 · 보낸 기록 ' + JSON.stringify(SD.sent));
  const VC = await p.evaluate(() => { UI.mrwSub = 'cat'; render(); return { lock: !!document.querySelector('.mrw > .mrw-lock'), kinds: [...document.querySelectorAll('.mrw-rw .hd small')].map(s => s.textContent) }; });
  ok(!VC.kinds.includes('학원비 차감') && VC.kinds.includes('리워드 숍'), '기업 카탈로그: 학원비 차감 없음 ' + VC.kinds);
  const VO = await p.evaluate(() => { milOpen('voc'); milTab('rewards'); return { lock: !!document.querySelector('.mrw > .mrw-lock'), tu: [...document.querySelectorAll('.mrw-rw .hd small')].some(s => s.textContent === '학원비 차감') }; });
  ok(VO.lock && !VO.tu, '직업훈련: 국비 자물쇠 · 학원비 차감 없음 ' + JSON.stringify(VO));

  /* ⑧ 운영 모드 /api/mileage/* */
  const LVR = await p.evaluate(async () => { milOpen('k12'); const calls = []; const wait = () => new Promise(k => setTimeout(k, 120));
    const R = { '/api/mileage/config': { policy: { shop: { on: false } }, rewards: [{ id: 'mrw_live1', kind: 'tuition', title: '운영 학원비 차감', cost: { wonPerP: 1 }, minUse: 1000, step: 100, maxUse: { billPct: 30 }, approval: 'guardian', active: true }] },
      '/api/mileage/approvals': { items: [{ id: 'mrd_live1', sid: '9001', rewardId: 'mrw_live1', points: 2000, won: 2000, guardian: 'ok', at: '2026-11-14 09:00', bill: { id: 'b_live', lines: [{ title: '정규반 교습비', amount: 300000 }] }, checks: [] }, { id: 'mrd_live2', sid: '9002', rewardId: 'mrw_live1', points: 500, won: 500, guardian: 'wait', at: '2026-11-14 09:10', checks: [{ code: 'guardian', block: true, text: '보호자 확인 전' }] }] },
      '/api/mileage/redeems': { redeems: [] }, '/api/mileage/flags': { flags: [{ id: 'mfl_l1', kind: 'velocity', title: '몰아 쌓기(속도)', evidence: ['1시간 9건'], heldPoints: 700, status: 'open', at: '2026-11-13' }] } };
    window.LIVE = { tenant: 't1', cfg: {} }; window.api = async (m, u, b) => { calls.push(m + ' ' + u + (b ? ' ' + JSON.stringify(b) : '')); const k = u.split('?')[0]; if (R[k]) return R[k]; if (m === 'POST') return { ok: true, warnings: [] }; const e = new Error('없음'); e.status = 404; e.code = 'not_found'; throw e; };
    delete S.milrw; milTab('rewards'); await wait(); const rw = [...document.querySelectorAll('.mrw-rw b')].map(b => b.textContent).join();
    milTab('approvals'); UI.mrwApF = 'wait'; render(); await wait(); const rows = document.querySelectorAll('.mrw-ap tbody tr[data-rd]').length; const dis = document.querySelector('tr[data-rd="mrd_live2"] .nw .btn').disabled; const bill = (document.querySelector('.mrw-bill') || {}).textContent || '';
    document.querySelector('tr[data-rd="mrd_live1"] [data-act="mrw-ok"]').click(); document.querySelector('#modal [data-mact="ok"]').click(); await wait();
    milTab('fraud'); await wait(); const held = document.querySelector('.mrw-kpi b').textContent;
    document.querySelector('[data-act="mrw-fl"][data-d="clear"]').click(); document.querySelector('#modal [name="why"]').value = '확인'; document.querySelector('#modal [data-mact="ok"]').click(); await wait();
    window.api = async (m, u) => { calls.push(m + ' ' + u); const e = new Error('꺼짐'); e.status = 403; e.code = 'mile_off'; throw e; }; window.milrw.live.key = ''; milTab('approvals'); await wait(); await wait(); const err = (document.querySelector('.mrw-err') || {}).textContent || '';
    const doc = S.milrw; delete window.LIVE; delete window.api; return { calls, rw, rows, dis, bill, held, err, docEmpty: doc.redeems.length === 0 && doc.rewards.length === 0 }; });
  ok(LVR.calls.some(c => c.startsWith('GET /api/mileage/config')) && LVR.calls.some(c => c.startsWith('GET /api/mileage/approvals?type=redeem')) && LVR.calls.some(c => c.startsWith('GET /api/mileage/flags')), '운영 GET 호출 ' + LVR.calls.slice(0, 4).join(' | '));
  ok(/운영 학원비 차감/.test(LVR.rw) && LVR.rows === 2 && LVR.dis && /−2,000원/.test(LVR.bill) && LVR.held === '700P' && LVR.docEmpty, '운영 응답 표시 · 서버 checks 차단 · 문서에 시연 데이터 없음 ' + JSON.stringify({ rows: LVR.rows, held: LVR.held }));
  ok(LVR.calls.some(c => /^POST \/api\/mileage\/approvals\/decide .*"ids":\["mrd_live1"\].*"decision":"approve".*"idem"/.test(c)) && LVR.calls.some(c => /^POST \/api\/mileage\/flags\/resolve .*"decision":"clear".*"reason":"확인"/.test(c)), '운영 POST(승인 · 부정 해제) ' + LVR.calls.filter(c => c.startsWith('POST')).join(' | '));
  ok(/마일리지 제도가 꺼져/.test(LVR.err), '운영 실패 안내(mile_off) ' + LVR.err);

  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
