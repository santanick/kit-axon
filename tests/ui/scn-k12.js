'use strict';
/* 학원(초중고) 운영 CRM — 실제 클릭으로 업무 흐름을 끝까지 확인한다. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('✗ ' + m); } };
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); });
  await new Promise(k => srv.listen(0, k)); const B = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch(); const errs = [];
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await p.goto(B + '/index.html'); await p.waitForTimeout(300); await p.addStyleTag({ content: '.bchat{display:none!important}' }); await p.evaluate(() => { createOrg('k12', '테스트학원'); });
  const wait = ms => p.waitForTimeout(ms); const mclick = async label => { await p.locator(`#modal button`, { hasText: new RegExp(`^${label}$`) }).click(); await wait(80); }; const G = (fn, a) => p.evaluate(fn, a);
  /* 메뉴 */
  /* v34 대표님 '필수 시나리오 위주, 더 필요한 건 메뉴를 켜서': 원생 · 출결 · 성적 · 청구만 기본으로 켜고 상담 · 통계는 [메뉴 추가]에 둔다 */
  ok(await G(() => !S.nav.ws.includes('crm') && S.nav.tabs.people.slice(0, 3).map(x => x.id).join() === 'crmstu,crmatt,crmex' && S.nav.tabs.ops[0].id === 'crmbill' && ['crmstu', 'crmatt', 'crmex', 'crmbill'].every(id => menuOn(id)) && ['crmcs', 'crmstat'].every(id => Object.values(S.nav.tabs).flat().some(x => x.id === id) && !menuOn(id))), 'k12 메뉴: 레일을 늘리지 않음 · 필수(원생 · 출결 · 성적 · 청구)만 켬 ' + await G(() => JSON.stringify({ ws: S.nav.ws, p: S.nav.tabs.people.map(x => x.id), o: (S.nav.tabs.ops || []).map(x => x.id) })));
  ok(await G(() => { const s0 = S; createOrg('adult', 'x'); const r = !JSON.stringify(S.nav).includes('crmstu'); S = s0; return r; }), '다른 유형에 메뉴 없음');
  /* 빈 화면과 샘플 */
  await G(() => go('crmstu')); await wait(100); ok(await p.locator('[data-act="crm-sample"]').count() === 1, '빈 화면 안내');
  /* 원생 등록 검증 */
  await p.click('[data-act="crm-new"]'); await wait(60); await mclick('등록'); ok(await p.locator('#modal').count() === 1, '이름 없으면 막음');
  await p.fill('#modal [name=n]', '<b>김원생</b>'); await p.fill('#modal [name=ph]', '12345'); await mclick('등록'); ok(await p.locator('#modal').count() === 1, '연락처 검증');
  await p.fill('#modal [name=ph]', ''); await p.fill('#modal [name=pn]', '김보호'); await p.fill('#modal [name=pp]', '010-1111-2222'); await p.fill('#modal [name=sc]', '해운중'); await p.selectOption('#modal [name=gy]', '중2'); await mclick('등록'); ok(await p.locator('#modal').count() === 1, '동의 없으면 막음');
  await p.check('#modal [name=ok]'); await mclick('등록');
  ok(await G(() => S.members.length === 1 && S.parents.length === 1 && S.crmHist[0].kind === '입학' && S.members[0].crm.consent === true), '원생 등록');
  ok(await G(() => !document.querySelector('.k-card b b')), '이름 이스케이프');
  /* 샘플 */
  await G(() => ACT['crm-sample']()); await wait(100);
  ok(await G(() => S.members.length === 6 && S.classes.length === 2 && S.classes[0].sessions.length > 3), '샘플 생성');
  const ids = await G(() => { const A = S.classes[0]; return { c: A.id, m: A.learners, b: S.classes[1].id }; });
  /* 형제 자동 연결: 샘플 1 · 2번째는 보호자 연락처가 같다 */
  ok(await G(() => { const [a, b] = S.classes[0].learners.map(M); return (a.crm.sib || []).includes(b.id) && (b.crm.sib || []).includes(a.id); }), '형제 자동 연결');
  await G(() => { const [a] = S.classes[0].learners.map(M); UI.crmId = a.id; UI.crmT = 'sum'; UI.crmSub = ''; go('crmstu'); }); await wait(80); ok(await p.locator('.k-dl').count() === 1, '원생 카드는 요약 먼저'); await p.click('[data-act="crm-sub"][data-v="edit"]'); await wait(60);
  await p.selectOption('#crmInfo [name=pd]', '5'); await p.fill('#crmInfo [name=vh]', '40000'); await p.selectOption('#crmInfo [name=dc]', 'sib'); await p.click('[data-act="crm-info-save"]'); await wait(60);
  ok(await G(() => { const m = S.classes[0].learners.map(M)[0]; return m.crm.payDay === 5 && m.crm.vehicle === 40000 && m.crm.disc === 'sib'; }), '기본 정보 저장');
  /* 일일 출결 */
  await G(() => { UI.crmD = today(); go('crmatt'); }); await wait(120); const cards = await p.locator('.k-attc').count(); ok(cards === 2, `오늘 수업 2개 ${cards}`);
  await p.locator('.k-attc').first().locator('[data-act="crm-att"][data-v="결석"]').first().click(); await wait(60);
  ok(await G(() => { const c = S.classes[0]; const u = W2.units(c).find(x => x.date === today()); return W2.get(c, u.id, c.learners[0]) === '결석' && S.msgs.some(m => m.title === '출결 알림'); }), '결석 처리와 알림');
  await p.locator('.k-attc').first().locator('[data-act="crm-att-all"]').click(); await wait(60);
  ok(await G(() => { const c = S.classes[0]; const u = W2.units(c).find(x => x.date === today()); return c.learners.every(id => W2.get(c, u.id, id)) && W2.get(c, u.id, c.learners[0]) === '결석'; }), '미입력 전체 출석은 기존 값을 유지');
  const reasonSel = '.k-attc input[data-f="reason"]'; await p.locator(reasonSel).first().fill('병원 진료'); await p.locator(reasonSel).first().dispatchEvent('change'); await p.locator('.k-attc [data-act="crm-att-more"]').first().click(); await wait(60); await p.fill('#modal [name=i]', '16:05'); await mclick('저장');
  ok(await G(() => { const c = S.classes[0]; const u = W2.units(c).find(x => x.date === today()); return c.crmDay[u.id].rows[c.learners[0]].reason === '병원 진료' && c.attT[u.id][c.learners[0]].in === '16:05'; }), '사유 · 등원 저장');
  await p.locator('.k-attc [data-act="crm-att-more"]').first().click(); await wait(60); await mclick('보강 등록'); await wait(60); await mclick('등록'); ok(await G(() => S.classes[0].makeups.length === 1), '보강 등록');
  /* 휴강은 출석률에서 제외 */
  const rateBefore = await G(() => { const c = S.classes[1]; const id = c.learners[0]; const u = W2.units(c).find(x => x.date === today()); W2.set(c, u.id, id, '결석', 'admin', true); return W2.rate(c, id); });
  await p.locator('.k-attc').nth(1).locator('[data-act="crm-att-close"]').click(); await wait(60);
  ok(await G(() => { const c = S.classes[1]; const u = W2.units(c).find(x => x.date === today()); return !W2.mine(c, c.learners[0]).some(x => x.id === u.id) && !W2.get(c, u.id, c.learners[0]); }), '휴강 제외');
  await G(() => { UI.crmAT = 'stat'; render(); }); await wait(60); ok(await p.locator('table').count() >= 1, '출석 통계'); await G(() => { UI.crmAT = 'tt'; render(); }); await wait(60); ok(await p.locator('.k-tt .card').count() === 7, '시간표'); await G(() => { UI.crmAT = 'day'; });
  /* 성적 */
  await G(() => go('crmex')); await wait(60); await p.click('[data-act="crm-ex-new"]'); await wait(60); await mclick('등록'); ok(await p.locator('#modal').count() === 1, '시험명 필수'); await p.fill('#modal [name=n]', '11월 단원평가'); await mclick('등록');
  const sc = p.locator('input[data-chg="crm-sc"]'); await sc.nth(0).fill('90'); await sc.nth(0).dispatchEvent('change'); await wait(40); await p.locator('input[data-chg="crm-sc"]').nth(1).fill('90'); await p.locator('input[data-chg="crm-sc"]').nth(1).dispatchEvent('change'); await wait(40); await p.locator('input[data-chg="crm-sc"]').nth(2).fill('150'); await p.locator('input[data-chg="crm-sc"]').nth(2).dispatchEvent('change'); await wait(40); const ex0 = await G(() => { const e = S.classes[0].k12Exams[0]; return Object.keys(e.scores).filter(k => e.scores[k].v != null).length; }); ok(ex0 === 2, '만점 초과 차단 ' + ex0); await p.locator('input[data-chg="crm-sc"]').nth(2).fill('70'); await p.locator('input[data-chg="crm-sc"]').nth(2).dispatchEvent('change'); await wait(40);
  const ex = await G(() => { const e = S.classes[0].k12Exams[0]; const c = S.classes[0]; return { n: Object.keys(e.scores).length, txt: document.querySelector('.card table').innerText }; });
  ok(ex.n === 3, `점수 입력 ${JSON.stringify(ex.n)}`); ok(/1등[\s\S]*1등[\s\S]*3등/.test(ex.txt), '공동 석차');
  await p.locator('input[data-chg="crm-ab"]').nth(0).check(); await wait(50); ok(await G(() => { const e = S.classes[0].k12Exams[0]; return e.scores[S.classes[0].learners[0]].absent === true; }), '미응시');
  await p.click('[data-act="crm-ex-send"]'); await wait(50); await mclick('알림 등록'); ok(await G(() => { const m = S.msgs.find(x => x.title === '성적 알림'); return m && !/등/.test(m.body.replace(/평가|등록/g, '')) && S.classes[0].k12Exams[0].sent === today(); }), '성적 알림(석차 제외)');
  /* 상담 · 신규 문의 */
  await G(() => go('crmcs')); await wait(60); await p.click('[data-act="crm-lead-new"]'); await wait(60); await p.fill('#modal [name=n]', '문의원생'); await p.fill('#modal [name=pn]', '문의보호자'); await p.fill('#modal [name=pp]', '010-3333-4444'); await p.fill('#modal [name=m]', '수학 상담'); await mclick('저장'); ok(await p.locator('#modal').count() === 1, '문의 동의 필수'); await p.check('#modal [name=ok]'); await mclick('저장'); ok(await G(() => S.crmLeads.length === 1), '문의 등록');
  await p.click('[data-act="crm-lead-edit"]'); await wait(50); await mclick('원생 등록'); await wait(60); await p.check('#modal [name=ok]'); await mclick('등록'); await wait(80);
  ok(await G(() => S.crmLeads[0].st === '등록' && S.members.some(m => m.name === '문의원생') && S.consults.some(c => c.kind === '신규') && CUR.tab === 'crmstu'), '문의 → 원생 전환');
  await G(() => { UI.crmCT = 'todo'; go('crmcs'); }); await wait(60); ok(await p.locator('[data-act="crm-cs-new"]').count() >= 1, '미상담자'); await p.locator('[data-act="crm-cs-new"]').first().click(); await wait(50); await p.fill('#modal [name=t]', '학습 태도 상담'); await mclick('저장'); ok(await G(() => S.consults.some(c => c.text === '학습 태도 상담' && c.kind === '재원')), '상담 기록');
  await G(() => go('consult')); await wait(100); await G(() => { UI.csT = 'list'; render(); }); await wait(60); ok(!errs.length, '기존 상담 화면 호환 ' + errs.join('|'));
  /* 수납 */
  await G(() => { UI.crmBT = 'gen'; go('crmbill'); }); await wait(60); const cbs = p.locator('input[data-chg="crm-bs"]'); await cbs.nth(0).check(); await wait(40); await p.locator('input[data-chg="crm-bs"]').nth(1).check(); await wait(40); await p.click('[data-act="crm-gen"]'); await wait(60); const nb = await G(() => S.bills.length); ok(nb === 5, `수강료 발생 ${nb}`);
  await p.locator('input[data-chg="crm-bs"]').nth(0).check(); await wait(30); await p.click('[data-act="crm-gen"]'); await wait(50); ok(await G(() => S.bills.length) === nb, '중복 발생 없음');
  const bill = await G(() => { const id = S.classes[0].learners[0]; const b = S.bills.find(x => x.who === id); return { id: b.id, tot: billTotalX(b), items: b.items, due: b.due, exp: (d => d < today() ? addDays(today(), 7) : d)(today().slice(0, 7) + '-05') }; function billTotalX(x) { return x.items.reduce((a, i) => a + i[1], 0); } }); ok(bill.tot === 280000 + 40000 - 28000 && bill.due === bill.exp, `차량비 · 할인 · 납부일(v38: 납부일 5일이 이미 지났으면 발생일 + 7일 — 만들자마자 기한 경과 방지, QA K9) ${JSON.stringify(bill)}`);
  await G(() => { UI.crmBT = 'list'; render(); }); await wait(60); await p.click(`[data-act="crm-pay"][data-v="${bill.id}"]`); await wait(50); await p.fill('#modal [name=a]', '999999'); await mclick('수납'); ok(await p.locator('#modal').count() === 1, '잔액 초과 차단'); await p.fill('#modal [name=a]', '100000'); await p.selectOption('#modal [name=m]', '카드'); await mclick('수납');
  ok(await G(() => { const b = S.bills.find(x => x.paid && x.paid.length); return b.status === '부분 납부' && b.paid[0].amt === 100000; }), '분납');
  await G(() => { UI.crmBT = 'now'; render(); }); await wait(50); ok(await p.locator('.card [data-act="crm-pay"]').count() === 5, '미납 목록(분납 포함)'); await p.click('[data-act="crm-un-send"]'); await wait(50); await mclick('알림 등록'); ok(await G(() => S.msgs.filter(m => m.title === '수강료 안내').length) === 5, '미납 알림');
  await G(() => { UI.crmBT = 'list'; render(); }); await wait(50); await p.click(`[data-act="crm-pay"][data-v="${bill.id}"]`); await wait(50); await mclick('수납'); ok(await G(() => { const b = S.bills.find(x => x.paid && x.paid.length); return b.status === '납부 완료' && b.paid.length === 2; }), '완납');
  await p.click(`[data-act="crm-pay-hist"][data-v="${bill.id}"]`); await wait(50); await p.locator('#modal [data-act="crm-pay-undo"]').first().click(); await wait(60); ok(await G(() => { const b = S.bills.find(x => x.id === document.querySelector('[data-act="crm-pay-hist"]').dataset.v); return b.status === '부분 납부' && !document.getElementById('modal'); }), '수납 취소');
  await G(() => { UI.crmBT = 'stat'; render(); }); await wait(50); ok(/100,000원|192,000원/.test(await p.innerText('.card table')), '수납 통계');
  /* 자동 발생 */
  ok(await G(() => { CFG_ = S.crmCfg; S.crmCfg.autoBill = true; const m = S.classes[0].learners.map(M)[1]; m.crm.payDay = 1; S.bills = S.bills.filter(b => b.who !== m.id); UI.crmAuto = ''; go('crmbill'); return S.bills.some(b => b.who === m.id); }), '정기 납부일 자동 발생');
  /* 전반 · 휴원 · 퇴원 */
  const mv = await G(() => { UI.crmF = { st: '', q: '', cls: '', gy: '', flag: '' }; UI.crmSel = new Set([S.classes[0].learners[2]]); UI.crmId = null; go('crmstu'); return S.classes[0].learners[2]; }); await wait(60); await p.click('[data-act="crm-bulk"][data-v="move"]'); await wait(50); await p.selectOption('#modal [name=a]', ids.c); await p.selectOption('#modal [name=b]', ids.b); await mclick('전반'); ok(await G(() => { const id = S.crmHist[0].who; return S.crmHist[0].kind === '전반' && S.classes[1].learners.includes(id) && !S.classes[0].learners.includes(id); }), '전반');
  await G(() => { UI.crmSel = new Set([S.classes[0].learners[0]]); render(); }); await wait(50); await p.click('[data-act="crm-bulk"][data-v="퇴원"]'); await wait(50); await mclick('퇴원'); ok(await p.locator('#modal').count() === 1, '퇴원 사유 필수'); await p.fill('#modal [name=r]', '이사'); await mclick('퇴원');
  const outId = await G(() => S.crmHist.find(h => h.kind === '퇴원').who); ok(await G(() => { const id = S.crmHist.find(h => h.kind === '퇴원').who; return M(id).crm.st === '퇴원' && !S.classes.some(c => c.learners.includes(id)); }), '퇴원');
  ok(await G(() => { const before = S.bills.length; const id = S.classes[0].learners[0]; M(id).crm.st = '휴원'; const ym = '2031-01'; UI.crmBM = ym; UI.crmBS = new Set([S.classes[0].id]); ACT['crm-gen'](); const made = S.bills.filter(b => b.month === ym); return !made.some(b => b.who === id); }), '휴원 수강료 제외');
  await G(() => { const id = S.classes[0].learners[0]; M(id).crm.st = '재원'; });
  /* 운영 현황 */
  await G(() => { UI.crmST = 'day'; go('crmstat'); }); await wait(60); /* v34: 첫 화면은 목록(slim-b) — 일일 현황 탭을 지정해 연다 */ ok(await p.locator('.grid.g4 > *').count() === 4, '일일 현황 숫자 4개'); ok(/수납/.test(await p.innerText('.k-sum')), '일일 요약'); await G(() => { UI.crmST = 'mon'; render(); }); await wait(50); ok(/이사/.test(await p.innerText('body')), '퇴원 사유 통계'); await G(() => { UI.crmST = 'tch'; render(); }); await wait(50); ok(/김강사/.test(await p.innerText('body')), '강사별');
  /* 원생 카드 탭 */
  await G(() => { UI.crmF = { st: '', q: '', cls: '', gy: '', flag: '' }; UI.crmId = S.classes[0].learners[0]; UI.crmSel = new Set(); go('crmstu'); }); for (const k of ['study', 'cs', 'bill', 'sum']) { await G(`UI.crmT='${k}';render();`); await wait(30); ok(await p.locator('.k-card').count() === 1, `원생 카드 ${k}`); }
  /* 교강사: 담당 수업만, 수납 · 원생 없음 */
  const tv = await G(() => { const s = S.me.role; const a = S.admins.find(x => x.role === 'teacher'); const prev = a && a.classes; if (a) a.classes = [S.classes[1].id]; S.me.role = 'teacher'; const r = { tabs: wsTabs('people').filter(x => x.startsWith('crm')), ops: wsTabs('ops').filter(x => x.startsWith('crm')), att: VIEWS.crmatt().includes(S.classes[0].name), cls: VIEWS.crmex().includes(S.classes[1].name) }; S.me.role = s; if (a) a.classes = prev; return r; });
  ok(JSON.stringify(tv.tabs) === JSON.stringify(['crmatt', 'crmex']) && !tv.ops.length && tv.cls, `교강사 메뉴 ${JSON.stringify(tv)}`);
  /* 공개 스냅숏에 CRM 정보 없음 */
  ok(await G(() => { const j = JSON.stringify(lsSnapshot()); return !/병원 진료|k12Exams|crmDay|makeups|"crm"|김보호/.test(j); }), '학습자 공개 자료에 CRM 정보 없음');
  /* CSV */
  await G(() => { UI.crmId = null; go('crmstu'); ACT['crm-csv-in'](); }); await wait(50); await p.fill('#modal [name=t]', '이름,학교,학년,원생 연락처,보호자 이름,보호자 연락처,수업\n일괄1,해운중,중1,,일보호,010-5555-6666,\n잘못,해운중,중99,,,,\n일괄1,해운중,중1,,일보호,010-5555-6666,'); await mclick('등록'); ok(await p.locator('#modal').count() === 1, 'CSV 동의 필수'); await p.check('#modal [name=ok]'); await mclick('등록'); ok(await G(() => S.members.filter(m => m.name === '일괄1').length === 1 && !S.members.some(m => m.name === '잘못')), 'CSV 검증 · 중복 제외');
  /* AI SAM: 말로 맡기기. 계획 → 승인 → 실제 변경, 외부 호출 없음 */
  const sam = (q, approve = true) => G(`(() => { window.__f = 0; const of = window.fetch; window.fetch = (...a) => { window.__f++; return of(...a); }; chatSend(${JSON.stringify(q)}); window.fetch = of; const m = S.chat[S.chat.length - 1]; const out = { text: m.text || '', title: m.title || '', plan: !!m.plan, html: m.html || '', role: m.role, fetch: window.__f }; if (${approve} && m.plan) ACT['plan-ok']({ dataset: { v: m.plan } }); return out; })()`);
  const nm = await G(() => { UI.crmF = { st: '', q: '', cls: '', gy: '', flag: '' }; go('crmbill'); const A = S.classes[0], B = S.classes[1]; const x = A.learners.map(M).filter(Boolean)[0]; return { n: x.name.replace('[샘플] ', ''), id: x.id, a: A.name.replace('[샘플] ', ''), b: B.name.replace('[샘플] ', ''), aId: A.id, bId: B.id }; });
  await G(() => { S.bills = []; }); let r = await sam('이번 달 수강료 발생해줘'); ok(r.plan && r.fetch === 0 && await G(() => S.bills.length > 0), 'AI 수강료 발생 ' + JSON.stringify(r).slice(0, 160));
  r = await sam('미납 알림 보내줘', false); ok(r.plan && !r.text.includes(nm.n), 'AI 미납 알림 계획(요약에 이름 없음)');
  r = await sam('미납 원생 보여줘'); ok(!r.plan && r.html.includes(nm.n) && !r.text.includes(nm.n), 'AI 미납 명단은 화면 카드로');
  r = await sam(`${nm.n} 5만원 카드 수납`); ok(r.plan && await G(id => S.bills.some(b => b.who === id && (b.paid || []).some(p => p.amt === 50000 && p.method === '카드')), nm.id), 'AI 수납');
  r = await sam(`${nm.n} 11월 20일 보강`); ok(r.plan && await G(id => S.classes[0].makeups.some(x => x.mid === id && /-11-20$/.test(x.date)), nm.id), 'AI 보강');
  r = await sam(`${nm.n}를 ${nm.b}으로 전반`); ok(r.plan && await G(([id, b]) => C(b).learners.includes(id), [nm.id, nm.bId]), 'AI 전반 ' + JSON.stringify(r).slice(0, 120));
  r = await sam(`${nm.n} 휴원 처리`); ok(r.plan && await G(id => M(id).crm.st === '휴원', nm.id), 'AI 휴원'); r = await sam(`${nm.n} 재원 처리`); ok(await G(id => M(id).crm.st === '재원', nm.id), 'AI 복귀');
  r = await sam(`${nm.n} 퇴원`, false); ok(!r.plan && /사유/.test(r.text), 'AI 퇴원은 사유 필요');
  r = await sam('오늘 현황 요약'); ok(!r.plan && /수납/.test(r.text) && !r.text.includes(nm.n), 'AI 현황 요약에 이름 없음');
  r = await sam(`${nm.n} 요약해줘`); ok(r.html.includes('원생 카드 열기') && !r.text.includes(nm.n), 'AI 원생 요약');
  r = await sam('오늘 미입력 전체 출석', false); ok(/출석|없습니다/.test(r.title + r.text), 'AI 일괄 출석');
  ok(await G(() => { UI.crmId = null; go('crmbill'); const L = scxChips('crmbill'); return L.length >= 4 && L.every(x => x.run && x.run()); }), 'AI 수납 칩 4개 이상 동작(v34 유형별 추천 의도를 앞에 더함 — 대화창에는 3개만 보임)');
  ok(await G(id => { UI.crmId = id; go('crmstu'); const L = scxChips('crmstu'); UI.crmId = null; return !L.some(x => /샘플/.test(x.l)) && L.length >= 3; }, nm.id), 'AI 칩 이름에 원생 이름 없음');
  ok(await G(() => { const s = S.me.role; S.me.role = 'teacher'; const a = chatSendTest('미납 원생 보여줘'); S.me.role = s; return a; function chatSendTest(q) { const n = S.chat.length; const r = (window.k12Probe || (() => null))(q); return !r; } }), 'AI 강사 수납 차단');
  ok(await G(() => { go('board'); return document.querySelector('.bcanvas, #main, body').innerText.length > 150; }), '샘플 수업이 있어도 공지 화면 정상');
  ok(!(await sam(`${nm.n} 1만원 현금 수납`, false)).text.includes('현금로'), '조사 표기');
  ok(await G(() => { UI.obc = false; chatSend('미납 원생 보여줘'); return UI.obc === true; }), 'AI 명령을 보내면 시작 가이드를 접음');
  /* v32.2 반 설정 · 1회당 수강료 · 정원 */
  const K = await G(() => { const L = S.classes.filter(c => c.status !== '종료' && W2.units(c).some(u => u.date === today())).sort((x, y) => y.learners.length - x.learners.length); const A = L[0], B = S.classes.find(c => c !== A && c.learners.some(id => !A.learners.includes(id))) || S.classes.find(c => c !== A); return { a: A.id, b: B.id, an: A.learners.length, bx: B.learners.find(id => !A.learners.includes(id)) }; });
  await G(a => ACT['crm-cls-cfg']({ dataset: { v: a } }), K.a); await wait(60);
  await p.fill('#modal [name=sj]', '수학'); await p.fill('#modal [name=cp]', String(K.an - 1)); await p.selectOption('#modal [name=fe]', 'per'); await p.fill('#modal [name=pe]', '30000'); await mclick('저장');
  ok(K.an >= 2 && await p.locator('#modal').count() === 1, `정원은 현재 수강생보다 작게 못 함 ${K.an}`);
  await p.fill('#modal [name=cp]', String(K.an)); await p.check('#modal [name=tg][value="중2"]'); await p.check('#modal [name=nd]'); await p.check('#modal [name=nb]'); await p.check('#modal [name=nc]'); await mclick('저장');
  ok(await G(a => { const x = C(a).k12; return x.fee === 'per' && x.per === 30000 && x.subj === '수학' && x.cap > 0 && x.tg.join() === '중2' && x.nDaily && x.nAbs && x.nCls && x.nAtt; }, K.a), '반 설정 저장');
  ok(await G(a => { const ym = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })(); const c = C(a); const n = W2.units(c).filter(u => u.date.startsWith(ym)).length; UI.crmBM = ym; UI.crmBS = new Set([a]); ACT['crm-gen'](); const b = S.bills.find(x => x.cls === a && x.month === ym); return n > 0 && b && /회당/.test(b.items[0][0]) && b.items[0][1] === 30000 * n; }, K.a), '1회당 수강료는 그달 수업 횟수로 청구');
  await G(([a, w]) => ACT['crm-one']({ dataset: { w, v: 'enroll' } }), [K.a, K.bx]); await wait(60); await p.selectOption('#modal [name=c]', K.a); await mclick('등록');
  ok(await p.locator('#modal').count() === 1 && await G(([a, w]) => !C(a).learners.includes(w), [K.a, K.bx]), '정원이 차면 반 등록을 막음'); await G(() => closeModal());
  ok(await G(a => { const c = C(a); c.k12.nAtt = false; const u = W2.units(c).find(x => x.date === today()); const n0 = S.msgs.length; W2.set(c, u.id, c.learners[0], '지각'); const quiet = S.msgs.length === n0; c.k12.nAtt = true; return quiet; }, K.a), '출결 알림을 끈 반은 조용히 기록');
  /* 수업 알림 · 미등원 알림 */
  ok(await G(a => { const c = C(a); const u = W2.units(c).find(x => x.date === today()); u.from = u.from || '16:00'; if (c.crmDay && c.crmDay[u.id]) c.crmDay[u.id].closed = false; const mid = c.learners[1]; W2.set(c, u.id, mid, '', 'admin', true); delete ((c.crmDay || {})[u.id] || {}).auto; const n1 = k12Auto('00:00'); const cls = S.msgs.filter(m => m.title === '수업 알림').length; const n2 = k12Auto('23:59'); const abs = S.msgs.filter(m => m.title === '미등원 알림'); const n3 = k12Auto('23:59'); return n1 > 0 && cls > 0 && n2 >= 1 && abs.length === n2 && n3 === 0 && W2.get(c, u.id, c.learners[0]) !== undefined; }, K.a), '수업 알림 · 미등원 알림은 한 번만');
  /* 데일리 리포트 */
  await G(a => { const c = C(a); const u = W2.units(c).find(x => x.date === today()); const d = c.crmDay[u.id] = c.crmDay[u.id] || {}; d.prog = '3단원'; d.hw = '익힘책 20쪽'; d.rows = d.rows || {}; d.rows[c.learners[0]] = { ...(d.rows[c.learners[0]] || {}), hw: true, memo: '내부메모비밀' }; UI.crmD = today(); go('crmatt'); }, K.a); await wait(100);
  await p.locator('.k-attc', { hasText: await G(a => C(a).name, K.a) }).first().locator('[data-act="crm-daily"]').click(); await wait(60); await mclick('보내기');
  ok(await G(() => { const L = S.msgs.filter(m => m.title === '데일리 리포트'); return L.length >= 2 && L.some(m => /3단원/.test(m.body) && /제출/.test(m.body)) && !L.some(m => /내부메모비밀/.test(m.body)); }), '데일리 리포트(개별 메모 제외)');
  r = await sam('오늘 데일리 리포트 보내줘', false); ok(r.plan && !r.text.includes(nm.n), 'AI 데일리 리포트 계획');
  ok(await G(() => scxChips('crmatt').some(x => /데일리/.test(x.l))), 'AI 출석부 칩에 데일리 리포트');
  /* 현금영수증 · 영수증 · 선납 · 납입 확인서 */
  await G(id => { UI.crmId = id; UI.crmT = 'sum'; UI.crmSub = 'info'; go('crmstu'); }, nm.id); await wait(80);
  if (!(await p.locator('#crmInfo').count())) { await p.locator('[data-act="crm-sub"]').first().click(); await wait(60); }
  await p.selectOption('#crmInfo [name=cr]', '소득공제'); await p.fill('#crmInfo [name=crn]', '12'); await p.click('[data-act="crm-info-save"]'); await wait(50);
  ok(await G(id => !M(id).crm.cr, nm.id), '현금영수증 번호 검증');
  await p.fill('#crmInfo [name=crn]', '010-1234-5678'); await p.click('[data-act="crm-info-save"]'); await wait(50);
  ok(await G(id => M(id).crm.cr === '소득공제' && M(id).crm.crn === '010-1234-5678', nm.id), '현금영수증 정보 저장');
  const pb = await G(id => { const b = S.bills.find(x => billWhoT(x).includes(id) && x.status !== '취소' && (x.items || []).reduce((a, i) => a + i[1], 0) > (x.paid || []).reduce((a, i) => a + i.amt, 0)); function billWhoT(b) { return b.who ? [b.who] : (b.to || []).map(t => t.who); } return b && b.id; }, nm.id);
  await G(() => { UI.crmBT = 'list'; UI.crmBF = { m: '', st: '', q: '' }; go('crmbill'); }); await wait(60); await p.click(`[data-act="crm-pay"][data-v="${pb}"]`); await wait(50);
  ok(await p.locator('#modal', { hasText: '현금영수증(소득공제)' }).count() === 1, '수납 창에 현금영수증 안내'); await p.selectOption('#modal [name=m]', '현금'); await mclick('수납');
  ok(await G(b => { const x = S.bills.find(y => y.id === b); return x.paid[x.paid.length - 1].cr === '소득공제'; }, pb), '현금 수납에 현금영수증 표시');
  await p.click(`[data-act="crm-pay-hist"][data-v="${pb}"]`); await wait(50); const pop = ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null); await p.locator('#modal [data-act="crm-rcpt"]').last().click(); const pw = await pop;
  ok(await G(() => /영수증 번호/.test(window.__k12Print || '') && /010\*+5678/.test(window.__k12Print) && !/1234-5678/.test(window.__k12Print)), '영수증(번호 가림)'); if (pw) await pw.close(); await G(() => closeModal());
  ok(await G(id => { const ym = (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })(); window.__ym6 = ym; return true; }, nm.id));
  await G(id => { S.classes.filter(c => c.learners.includes(id)).forEach(c => { c.price = c.price || 200000; if (c.k12) c.k12.fee = 'month'; }); ACT['crm-prepay']({ dataset: { v: id } }); }, nm.id); await wait(60); await p.fill('#modal [name=m]', await G(() => window.__ym6)); await p.selectOption('#modal [name=n]', '3'); await p.fill('#modal [name=dc]', '5000'); await p.selectOption('#modal [name=me]', '카드'); await mclick('선납 처리');
  ok(await G(id => { const L = S.bills.filter(b => b.who === id && / \(선납\)$/.test(b.title)); return L.length === 3 && L.every(b => b.status === '납부 완료' && b.items.some(i => i[0] === '선납 할인' && i[1] === -5000) && b.paid[0].method === '카드'); }, nm.id), '여러 달 선납(달마다 청구 · 수납)');
  r = await sam(`${nm.n} 3개월 선납`, false); ok(r.plan || /수업 이름/.test(r.text), 'AI 선납');
  await G(id => ACT['crm-ycert']({ dataset: { v: id } }), nm.id); await wait(50); await p.selectOption('#modal [name=y]', await G(() => today().slice(0, 4))); const pop2 = ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null); await mclick('확인서 열기'); const pw2 = await pop2;
  ok(await G(() => /교육비 납입 확인서/.test(window.__k12Print || '') && /합계/.test(window.__k12Print)), '교육비 납입 확인서'); if (pw2) await pw2.close();
  /* 상담 보호자 공유 */
  await G(id => ACT['crm-cs-new']({ dataset: { v: id } }), nm.id); await wait(50); await p.fill('#modal [name=t]', '공유상담내용입니다'); await p.check('#modal [name=sh]'); await mclick('저장');
  await G(id => ACT['crm-cs-new']({ dataset: { v: id } }), nm.id); await wait(50); await p.fill('#modal [name=t]', '비공유상담내용'); await mclick('저장');
  ok(await G(() => S.consults[0].share !== true && S.consults[1].share === true), '상담 보호자 공유 표시');
  /* 보호자 화면: 학습자 앱 자녀 관리 */
  await G(a => { const c = C(a); (c.k12Exams = c.k12Exams || []).push({ id: 'gx', name: '보호자확인평가', kind: '단원평가', date: today(), max: 100, scores: { [c.learners[0]]: { v: 88 }, [c.learners[1]]: { v: 70 } } }); save(); }, K.a); await wait(400);
  const kid = await G(a => C(a).learners[0], K.a); const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push('learner ' + e.message)); await p2.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p2.goto(B + '/learner.html'); await p2.waitForTimeout(500);
  const gv = await p2.evaluate(id => { const reg = JSON.parse(localStorage.getItem('didisam.rooms') || 'null'); const r = JSON.parse(localStorage.getItem('didisam.room.' + reg.cur) || 'null'); if (!r) return { err: 'no room' }; const h = laKid(r, id); return { h, ok: typeof lk12Kid === 'function' }; }, kid);
  ok(gv.ok && /학원 시험 성적/.test(gv.h) && /보호자확인평가/.test(gv.h) && /88점/.test(gv.h) && /반 평균 79/.test(gv.h) && !/등 \//.test(gv.h), '보호자 화면: 성적(석차 제외)');
  ok(/3단원/.test(gv.h) && /익힘책/.test(gv.h) && !/내부메모비밀/.test(gv.h), '보호자 화면: 진도 · 과제(개별 메모 제외)');
  const gv2 = await p2.evaluate(id => { const reg = JSON.parse(localStorage.getItem('didisam.rooms')); const r = JSON.parse(localStorage.getItem('didisam.room.' + reg.cur)); return laKid(r, id); }, nm.id);
  ok(/공유상담내용입니다/.test(gv2) && !/비공유상담내용/.test(gv2), '보호자 화면: 공유 상담만');
  ok(await p2.evaluate(id => { const reg = JSON.parse(localStorage.getItem('didisam.rooms')); const r = JSON.parse(localStorage.getItem('didisam.room.' + reg.cur)); r.org.type = 'adult'; return !/학원 시험 성적/.test(laKid(r, id)); }, kid), '다른 유형은 보호자 학원 기록 없음'); await p2.close();
  /* 샘플 삭제 */
  await G(() => ACT['crm-sample-del']()); await wait(50); ok(await G(() => !S.classes.some(c => /샘플/.test(c.name)) && !S.members.some(m => /샘플/.test(m.name))), '샘플 삭제');
  /* 저장 후 복원 */
  await wait(600); await p.reload(); await wait(500); ok(await G(() => S && S.org.type === 'k12' && S.crmLeads.length === 1 && S.nav.tabs.people[0].id === 'crmstu'), '새로고침 후 유지');
  /* 기존 저장 사용자 */
  ok(await G(() => { S.nav.ws.push('crm'); S.nav.tabs.crm = [{ id: 'crmstu', on: true }]; S.nav.tabs.people = S.nav.tabs.people.filter(x => !x.id.startsWith('crm')); S.nav.tabs.ops = S.nav.tabs.ops.filter(x => !x.id.startsWith('crm')); upgradeState(); return !S.nav.ws.includes('crm') && !S.nav.tabs.crm && S.nav.tabs.people[0].id === 'crmstu' && S.nav.tabs.ops[0].id === 'crmbill'; }), '이전 메뉴 이전');
  /* 휴대폰 */
  const mob = await br.newContext({ viewport: { width: 390, height: 780 }, storageState: await ctx.storageState() }); const pm = await mob.newPage(); pm.on('pageerror', e => errs.push('M ' + e.message)); await pm.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await pm.goto(B + '/index.html'); await pm.waitForTimeout(400);
  for (const v of ['crmstu', 'crmatt', 'crmex', 'crmcs', 'crmbill', 'crmstat']) { const w = await pm.evaluate(async v => { if (!S) return -1; if (!S.members.some(m => /모바일/.test(m.name)) && typeof ACT['crm-sample'] === 'function') ACT['crm-sample'](); UI.crmId = S.members[0]?.id; UI.crmT = 'sum'; UI.crmD = today(); go(v); await new Promise(k => setTimeout(k, 150)); return document.documentElement.scrollWidth; }, v); ok(w <= 390, `휴대폰 가로 넘침 ${v} ${w}`); }
  ok(!errs.length, '페이지 오류 ' + errs.slice(0, 3).join(' | ')); await br.close(); srv.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e.message.slice(0, 700)); process.exit(1); });
