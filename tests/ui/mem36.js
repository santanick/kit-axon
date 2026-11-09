'use strict';
/* v36 교육생 관리 점검: 유형별 보호자 · 결제 노출, 일괄 등록 5,000명(검사 · 등록 · 100명씩 명단), 대학 학번 5,000명, 가입 추가 질문 편집기(차단 · 순서 · 저장) + 가입 화면 미리보기
   사용: node tests/ui/mem36.js  (ONLY=gate,bulk,q,univ 로 일부만, SHOTS=폴더 로 화면 저장) */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../didisam'); const OUT = process.env.SHOTS || require('os').tmpdir();
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const R = []; const ok = (c, m) => { R.push([!!c, m]); console.log(c ? '✓' : '✗', m); };
(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const br = await chromium.launch(); const errs = [];
  const org = async (type, ed, W = 1280, H = 900) => { const ctx = await br.newContext({ viewport: { width: W, height: H } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(type + ': ' + e.message)); p.on('dialog', d => d.accept());
    await p.goto(base + 'index.html'); await p.waitForFunction(() => typeof createOrg === 'function');
    await p.evaluate(([t, e]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = false; createOrg(t, '점검 기관', e || undefined); }, [type, ed]); await p.waitForTimeout(600); await p.evaluate(() => { try { closeModal(); } catch (e) { } }); return { ctx, p }; };
  const only = (process.env.ONLY || 'gate,bulk,q,univ').split(',');
  if (only.includes('gate')) for (const [ty, guard, pay] of [['univ', 0, 0], ['corp', 0, 0], ['public', 0, 0], ['k12', 1, 1], ['adult', 0, 1], ['lifelong', 0, 1], ['voc', 0, 1]]) {
    const { ctx, p } = await org(ty, ty === 'univ' ? 'lite' : '');
    const r = await p.evaluate(() => { const tabs = Object.values(S.nav.tabs).flat(); const par = tabs.find(x => x.id === 'parents'); const m = S.members[0]; UI.mem = m.id; UI.memT = 'info'; go('members'); render(); const payTab = !!document.querySelector('#main [data-key="memT"][data-v="pay"]'); const guardCard = /보호자 \+/.test(document.querySelector('#main').innerText);
      UI.mem = null; const parTxt = VIEWS.parents(); ACT['mb-acct'](); const parCk = !!document.querySelector('#modal [name=parent]'); closeModal();
      UI.settings = 'service'; const d = document.createElement('div'); d.innerHTML = VIEWS.settings(); const payCard = (d.querySelector('.mb-pay') || {}).innerText || 'NONE'; const snap = lsSnapshot(); return { par: par ? par.on : null, payTab, guardCard, parTxt, parCk, payCard: payCard.slice(0, 60), snapPar: snap.acct.parent, snapPay: snap.pay, term: t('learner') }; });
    ok(guard ? r.par !== null : !r.par, `${ty}: 보호자 메뉴 ${guard ? '있음' : '없음/꺼짐'} (${r.par})`); ok(!!guard === r.guardCard, `${ty}: 상세 보호자 카드 ${r.guardCard}`); ok(!!pay === r.payTab, `${ty}: 결제 탭 ${r.payTab}`); ok(!!pay === r.snapPay, `${ty}: 스냅샷 pay ${r.snapPay}`);
    if (!guard) ok(/쓰지 않습니다/.test(r.parTxt) && !r.parCk && !r.snapPar, `${ty}: 보호자 화면 안내 · 가입 설정 체크 없음`);
    console.log('   용어', r.term, '|', r.payCard, JSON.stringify([r.parTxt.slice(0,80), r.parCk, r.snapPar]));
    await ctx.close(); }
  if (only.includes('bulk')) { const { ctx, p } = await org('corp');
    const rows = ['이메일,이름,부서,연락처,직급']; for (let i = 0; i < 5000; i++) rows.push(`u${i}@ex.kr,사람${i},${['영업1팀', '새부서A', '경영지원팀'][i % 3]},${i % 7 ? '' : '010-1' + String(100 + i % 900).padStart(3, '0') + '-' + String(i).padStart(4, '0')},사원`);
    rows[10] = 'bad-mail,사람x,영업1팀,,'; rows[20] = 'u5@ex.kr,중복,영업1팀,,'; rows[30] = ',이름만,,,';
    const f = path.join(require('os').tmpdir(), 'mem36-bulk5000.csv'); fs.writeFileSync(f, '﻿' + rows.join('\r\n'));
    const n0 = await p.evaluate(() => { go('enroll'); render(); ACT['mem-bulk'](); return S.members.length; });
    await p.setInputFiles('#mbBkF', f); await p.waitForSelector('.mbk-sum', { timeout: 10000 });
    const s = await p.evaluate(() => ({ ok: MB_BK.ok.length, bad: MB_BK.bad.length, ms: MB_BK.ms, newG: MB_BK.newG, rows: document.querySelectorAll('.mbk-err tbody tr').length }));
    ok(s.ok === 4997 && s.bad === 3, `일괄: 등록 가능 ${s.ok} · 오류 ${s.bad} · 파싱 ${s.ms}ms · 새 부서 ${s.newG}`); ok(s.ms < 1500, `일괄: 5,000행 검사 ${s.ms}ms`);
    await p.screenshot({ path: path.join(OUT, 'e36-bulk-1280.png') });
    const t0 = Date.now(); await p.click('[data-act="mb-bulkrun"]'); await p.waitForFunction(() => !document.querySelector('#modal'), null, { timeout: 30000 }); const dt = Date.now() - t0;
    const a = await p.evaluate(() => { UI.slaT = { members: true, enroll: true }; UI.slMemTable = true; go('members'); UI.mem = null; const t0 = performance.now(); render(); const ms = performance.now() - t0; return { n: S.members.length, rows: document.querySelectorAll('#main tbody tr').length, more: !!document.querySelector('[data-act="mb-lim"]'), ms: Math.round(ms), g: S.groups.filter(g => g.name === '새부서A').length, stor: (localStorage.getItem(Object.keys(localStorage).find(k => /room\..*state|didisam\.room\.[^.]+$/.test(k)) || '') || '').length }; });
    ok(a.n - n0 === 4997, `일괄: 등록 후 명단 +${a.n - n0} (${dt}ms)`); ok(a.rows <= 101 && a.more, `명단 100명씩 표시(${a.rows}행, 더 보기 ${a.more}) 렌더 ${a.ms}ms`); ok(a.g === 1, '새 부서 자동 생성');
    await p.screenshot({ path: path.join(OUT, 'e36-members5000-1280.png') });
    await ctx.close(); }
  if (only.includes('q')) for (const [ty, W, H] of [['adult', 1280, 900], ['univ', 1280, 900], ['adult', 390, 844]]) { const { ctx, p } = await org(ty, ty === 'univ' ? 'lite' : '', W, H); const tag = `${ty}-${W}`;
    await p.evaluate(() => { go('enroll'); render(); ACT['mem-q'](); }); await p.waitForSelector('#mbqEd'); await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(OUT, `e36-q-${tag}-a.png`) });
    await p.evaluate(() => { const n = MBQ.list.length; ACT['mbq-add']({ dataset: { v: 'multi' } }); }); const i = await p.evaluate(() => MBQ.list.length - 1);
    await p.fill(`.mbq-c[data-i="${i}"] [data-mbq="q"]`, '관심 분야'); for (const o of ['AI', '데이터', '디자인']) { await p.fill(`.mbq-c[data-i="${i}"] [data-mbq="opt"]`, o); await p.press(`.mbq-c[data-i="${i}"] [data-mbq="opt"]`, 'Enter'); }
    await p.click(`.mbq-c[data-i="${i}"] [data-act="mbq-req"]`);
    await p.evaluate(() => ACT['mbq-add']({ dataset: { v: 'text' } })); const j = i + 1; await p.fill(`.mbq-c[data-i="${j}"] [data-mbq="q"]`, '주민등록번호');
    const bad = await p.evaluate(j => document.querySelector(`.mbq-c[data-i="${j}"]`).classList.contains('bad'), j); ok(bad, `${tag}: 주민등록번호 질문 차단 표시`);
    await p.evaluate(() => ACT['mbq-save']()); ok(await p.$('#mbqEd'), `${tag}: 차단 질문이 있으면 저장 안 됨`);
    await p.fill(`.mbq-c[data-i="${j}"] [data-mbq="q"]`, '건강 상태'); ok(await p.evaluate(j => document.querySelector(`.mbq-c[data-i="${j}"]`).classList.contains('bad'), j), `${tag}: 건강 정보 차단`);
    await p.fill(`.mbq-c[data-i="${j}"] [data-mbq="q"]`, '희망 시작일'); await p.selectOption(`.mbq-c[data-i="${j}"] [data-mbq="type"]`, 'date');
    if (W > 1000) { await p.waitForTimeout(800); const fr = p.frame({ url: /pvjoin=1/ }); const pv = fr ? await fr.evaluate(() => ({ multi: document.querySelectorAll('.la-q [type=checkbox][name^=xq]').length, date: document.querySelectorAll('.la-q [type=date]').length, txt: (document.querySelector('.la-q') || {}).innerText || '' })).catch(e => ({ err: e.message })) : { err: 'no frame' };
      ok(pv.multi >= 3 && pv.date >= 1, `${tag}: 미리보기에 여러 개 고르기 ${pv.multi} · 날짜 ${pv.date} ${pv.err || ''}`); await p.screenshot({ path: path.join(OUT, `e36-q-${tag}-b.png`) });
      await p.click('[data-act="mbq-dev"][data-v="m"]'); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `e36-q-${tag}-c.png`) }); }
    else { await p.screenshot({ path: path.join(OUT, `e36-q-${tag}-b.png`), fullPage: false }); await p.click('[data-act="mbq-tab"][data-v="pv"]'); await p.waitForTimeout(900); await p.screenshot({ path: path.join(OUT, `e36-q-${tag}-c.png`) }); await p.click('[data-act="mbq-tab"][data-v="ed"]'); }
    await p.evaluate(j => ACT['mbq-mv']({ dataset: { v: `${j}:-1` } }), j);
    const order = await p.evaluate(() => MBQ.list.map(x => x.q)); await p.evaluate(() => ACT['mbq-save']()); const saved = await p.evaluate(() => S.settings.acct.extraQ.map(x => `${x.q}:${x.type}${x.req ? '*' : ''}`));
    ok(!(await p.$('#mbqEd')) && saved.join() .includes('희망 시작일:date') && saved.indexOf('희망 시작일:date') < saved.findIndex(x => x.startsWith('관심 분야')), `${tag}: 저장 · 순서 ${saved.join(' | ')}`);
    await ctx.close(); }
  if (only.includes('univ')) { const { ctx, p } = await org('univ', 'lite'); const L = []; for (let i = 0; i < 5000; i++) L.push(`2026${String(i).padStart(4, '0')}, ${['컴퓨터공학과', '경영학과'][i % 2]}`);
    const r = await p.evaluate(L => { UI.slaT = { members: true, enroll: true }; go('enroll'); render(); const ta = document.querySelector('#enL'); if (!ta) return { err: 'no textarea' }; ta.value = L.join('\n'); const t0 = performance.now(); const c0 = S.codes.length, m0 = S.members.length; ACT['en-codes'](); return { codes: S.codes.length - c0, mem: S.members.length - m0, ms: Math.round(performance.now() - t0), file: !!document.querySelector('#enF') }; }, L);
    ok(r.codes === 5000 && r.ms < 3000 && r.file, `대학 학번 5,000명 발급 ${JSON.stringify(r)}`);
    await p.screenshot({ path: path.join(OUT, 'e36-univ-enroll-1280.png') }); await ctx.close(); }
  ok(!errs.length, '스크립트 오류 없음 ' + errs.slice(0, 3).join(' / '));
  await br.close(); srv.close(); const f = R.filter(x => !x[0]).length; console.log(f ? `✗ 실패 ${f}건` : '✓ 전체 통과'); process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
