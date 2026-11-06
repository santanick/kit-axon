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
  const wait = ms => p.waitForTimeout(ms); const mclick = async label => { await p.locator(`#modal button`, { hasText: new RegExp(`^${label}$`) }).click(); await wait(80); }; const G = fn => p.evaluate(fn);
  /* 메뉴 */
  ok(await G(() => S.nav.ws.includes('crm') && ['crmstu', 'crmatt', 'crmex', 'crmcs', 'crmbill', 'crmstat'].every(id => menuOn(id))), 'k12 메뉴');
  ok(await G(() => { const s0 = S; createOrg('adult', 'x'); const r = !S.nav.ws.includes('crm'); S = s0; return r; }), '다른 유형에 메뉴 없음');
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
  await G(() => { const [a] = S.classes[0].learners.map(M); UI.crmId = a.id; UI.crmT = 'info'; go('crmstu'); }); await wait(80);
  await p.selectOption('#crmInfo [name=pd]', '5'); await p.fill('#crmInfo [name=vh]', '40000'); await p.selectOption('#crmInfo [name=dc]', 'sib'); await p.click('[data-act="crm-info-save"]'); await wait(60);
  ok(await G(() => { const m = S.classes[0].learners.map(M)[0]; return m.crm.payDay === 5 && m.crm.vehicle === 40000 && m.crm.disc === 'sib'; }), '기본 정보 저장');
  /* 일일 출결 */
  await G(() => { UI.crmD = today(); go('crmatt'); }); await wait(120); const cards = await p.locator('.k-attc').count(); ok(cards === 2, `오늘 수업 2개 ${cards}`);
  await p.locator('.k-attc').first().locator('[data-act="crm-att"][data-v="결석"]').first().click(); await wait(60);
  ok(await G(() => { const c = S.classes[0]; const u = W2.units(c).find(x => x.date === today()); return W2.get(c, u.id, c.learners[0]) === '결석' && S.msgs.some(m => m.title === '출결 알림'); }), '결석 처리와 알림');
  await p.locator('.k-attc').first().locator('[data-act="crm-att-all"]').click(); await wait(60);
  ok(await G(() => { const c = S.classes[0]; const u = W2.units(c).find(x => x.date === today()); return c.learners.every(id => W2.get(c, u.id, id)) && W2.get(c, u.id, c.learners[0]) === '결석'; }), '미입력 전체 출석은 기존 값을 유지');
  const reasonSel = '.k-attc input[data-f="reason"]'; await p.locator(reasonSel).first().fill('병원 진료'); await p.locator(reasonSel).first().dispatchEvent('change'); await p.locator('.k-attc input[data-f="in"]').first().fill('16:05'); await p.locator('.k-attc input[data-f="in"]').first().dispatchEvent('change');
  ok(await G(() => { const c = S.classes[0]; const u = W2.units(c).find(x => x.date === today()); return c.crmDay[u.id].rows[c.learners[0]].reason === '병원 진료' && c.attT[u.id][c.learners[0]].in === '16:05'; }), '사유 · 등원 저장');
  await p.locator('.k-attc').first().locator('[data-act="crm-mk"]').first().click(); await wait(60); await mclick('등록'); ok(await G(() => S.classes[0].makeups.length === 1), '보강 등록');
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
  await p.click('[data-act="crm-lead-conv"]'); await wait(50); await p.check('#modal [name=ok]'); await mclick('등록'); await wait(80);
  ok(await G(() => S.crmLeads[0].st === '등록' && S.members.some(m => m.name === '문의원생') && S.consults.some(c => c.kind === '신규') && CUR.tab === 'crmstu'), '문의 → 원생 전환');
  await G(() => { UI.crmCT = 'todo'; go('crmcs'); }); await wait(60); ok(await p.locator('[data-act="crm-cs-new"]').count() >= 1, '미상담자'); await p.locator('[data-act="crm-cs-new"]').first().click(); await wait(50); await p.fill('#modal [name=t]', '학습 태도 상담'); await mclick('저장'); ok(await G(() => S.consults.some(c => c.text === '학습 태도 상담' && c.kind === '재원')), '상담 기록');
  await G(() => go('consult')); await wait(100); await G(() => { UI.csT = 'list'; render(); }); await wait(60); ok(!errs.length, '기존 상담 화면 호환 ' + errs.join('|'));
  /* 수납 */
  await G(() => go('crmbill')); await wait(60); const cbs = p.locator('input[data-chg="crm-bs"]'); await cbs.nth(0).check(); await wait(40); await p.locator('input[data-chg="crm-bs"]').nth(1).check(); await wait(40); await p.click('[data-act="crm-gen"]'); await wait(60); const nb = await G(() => S.bills.length); ok(nb === 5, `수강료 발생 ${nb}`);
  await p.locator('input[data-chg="crm-bs"]').nth(0).check(); await wait(30); await p.click('[data-act="crm-gen"]'); await wait(50); ok(await G(() => S.bills.length) === nb, '중복 발생 없음');
  const bill = await G(() => { const id = S.classes[0].learners[0]; const b = S.bills.find(x => x.who === id); return { id: b.id, tot: billTotalX(b), items: b.items, due: b.due }; function billTotalX(x) { return x.items.reduce((a, i) => a + i[1], 0); } }); ok(bill.tot === 280000 + 40000 - 28000 && /-05$/.test(bill.due), `차량비 · 할인 · 납부일 ${JSON.stringify(bill)}`);
  await G(() => { UI.crmBT = 'list'; render(); }); await wait(60); await p.click(`[data-act="crm-pay"][data-v="${bill.id}"]`); await wait(50); await p.fill('#modal [name=a]', '999999'); await mclick('수납'); ok(await p.locator('#modal').count() === 1, '잔액 초과 차단'); await p.fill('#modal [name=a]', '100000'); await p.selectOption('#modal [name=m]', '카드'); await mclick('수납');
  ok(await G(() => { const b = S.bills.find(x => x.paid && x.paid.length); return b.status === '부분 납부' && b.paid[0].amt === 100000; }), '분납');
  await G(() => { UI.crmBT = 'un'; render(); }); await wait(50); ok(await p.locator('input[data-chg="crm-us"]').count() === 5, '미납 목록(분납 포함)'); await p.click('[data-act="crm-un-send"]'); await wait(50); await mclick('알림 등록'); ok(await G(() => S.msgs.filter(m => m.title === '수강료 안내').length) === 5, '미납 알림');
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
  await G(() => go('crmstat')); await wait(60); ok(await p.locator('.kpi, .grid.g4 > *').count() >= 8, '일일 현황'); ok(/수납/.test(await p.innerText('.card:last-of-type')), '일일 요약'); await G(() => { UI.crmST = 'mon'; render(); }); await wait(50); ok(/이사/.test(await p.innerText('body')), '퇴원 사유 통계'); await G(() => { UI.crmST = 'tch'; render(); }); await wait(50); ok(/김강사/.test(await p.innerText('body')), '강사별');
  /* 원생 카드 탭 */
  await G(() => { UI.crmF = { st: '', q: '', cls: '', gy: '', flag: '' }; UI.crmId = S.classes[0].learners[0]; UI.crmSel = new Set(); go('crmstu'); }); for (const k of ['hist', 'bill', 'att', 'cs', 'ex', 'msg', 'info']) { await G(`UI.crmT='${k}';render();`); await wait(30); ok(await p.locator('.k-card').count() === 1, `원생 카드 ${k}`); }
  /* 교강사: 담당 수업만, 수납 · 원생 없음 */
  const tv = await G(() => { const s = S.me.role; const a = S.admins.find(x => x.role === 'teacher'); const prev = a && a.classes; if (a) a.classes = [S.classes[1].id]; S.me.role = 'teacher'; const r = { tabs: wsTabs('crm'), att: VIEWS.crmatt().includes(S.classes[0].name), cls: VIEWS.crmex().includes(S.classes[1].name) }; S.me.role = s; if (a) a.classes = prev; return r; });
  ok(JSON.stringify(tv.tabs) === JSON.stringify(['crmatt', 'crmex']) && tv.cls, `교강사 메뉴 ${JSON.stringify(tv)}`);
  /* 공개 스냅숏에 CRM 정보 없음 */
  ok(await G(() => { const j = JSON.stringify(lsSnapshot()); return !/병원 진료|k12Exams|crmDay|makeups|"crm"|김보호/.test(j); }), '학습자 공개 자료에 CRM 정보 없음');
  /* CSV */
  await G(() => { UI.crmId = null; go('crmstu'); ACT['crm-csv-in'](); }); await wait(50); await p.fill('#modal [name=t]', '이름,학교,학년,원생 연락처,보호자 이름,보호자 연락처,수업\n일괄1,해운중,중1,,일보호,010-5555-6666,\n잘못,해운중,중99,,,,\n일괄1,해운중,중1,,일보호,010-5555-6666,'); await mclick('등록'); ok(await p.locator('#modal').count() === 1, 'CSV 동의 필수'); await p.check('#modal [name=ok]'); await mclick('등록'); ok(await G(() => S.members.filter(m => m.name === '일괄1').length === 1 && !S.members.some(m => m.name === '잘못')), 'CSV 검증 · 중복 제외');
  /* 샘플 삭제 */
  await G(() => ACT['crm-sample-del']()); await wait(50); ok(await G(() => !S.classes.some(c => /샘플/.test(c.name)) && !S.members.some(m => /샘플/.test(m.name))), '샘플 삭제');
  /* 저장 후 복원 */
  await wait(600); await p.reload(); await wait(500); ok(await G(() => S && S.org.type === 'k12' && S.crmLeads.length === 1 && S.nav.ws.includes('crm')), '새로고침 후 유지');
  /* 기존 저장 사용자 */
  ok(await G(() => { S.nav.ws = S.nav.ws.filter(x => x !== 'crm'); delete S.nav.tabs.crm; upgradeState(); return S.nav.ws.includes('crm') && S.nav.tabs.crm.length === 6; }), '기존 기관 메뉴 추가');
  /* 휴대폰 */
  const mob = await br.newContext({ viewport: { width: 390, height: 780 }, storageState: await ctx.storageState() }); const pm = await mob.newPage(); pm.on('pageerror', e => errs.push('M ' + e.message)); await pm.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await pm.goto(B + '/index.html'); await pm.waitForTimeout(400);
  for (const v of ['crmstu', 'crmatt', 'crmex', 'crmcs', 'crmbill', 'crmstat']) { const w = await pm.evaluate(async v => { if (!S) return -1; if (!S.members.some(m => /모바일/.test(m.name)) && typeof ACT['crm-sample'] === 'function') ACT['crm-sample'](); UI.crmId = S.members[0]?.id; UI.crmT = 'info'; UI.crmD = today(); go(v); await new Promise(k => setTimeout(k, 150)); return document.documentElement.scrollWidth; }, v); ok(w <= 390, `휴대폰 가로 넘침 ${v} ${w}`); }
  ok(!errs.length, '페이지 오류 ' + errs.slice(0, 3).join(' | ')); await br.close(); srv.close(); console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e.message.slice(0, 700)); process.exit(1); });
