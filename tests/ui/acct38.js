'use strict';
/* v38 계정 · 초대 · 회원 연결 점검(QA K1~K6 · K8 · K13 · K15 · K16 · C2 · C3 · C12 · U9 · U10 · U12 · U18 · P1 · P3 · P12~P14 · 날짜 현지화)
   운영자 화면과 학습자 화면(데모 데이터룸)을 같은 브라우저에서 열어, 등록한 사람과 실제 가입 계정이 하나로 이어지는지 본다.
   사용: node tests/ui/acct38.js  (ONLY=corp,k12,univ,pub,date, SHOTS=폴더) */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../didisam'); const OUT = process.env.SHOTS || '';
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const R = []; const ok = (c, m) => { R.push([!!c, m]); console.log(c ? '✓' : '✗', m); };
const only = (process.env.ONLY || 'corp,k12,univ,pub,life,date').split(',');
(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0);
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const br = await chromium.launch(); const errs = [];
  const mk = async (type, ed) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Seoul' }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    const op = await ctx.newPage(); op.on('pageerror', e => errs.push(type + ' op: ' + e.message)); op.on('dialog', d => d.accept());
    await op.goto(base + 'index.html'); await op.waitForFunction(() => typeof createOrg === 'function');
    await op.evaluate(([t, e]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '1'); const x = document.querySelector('#suEmpty'); if (x) x.checked = true; createOrg(t, '연결 점검 기관', e || undefined); }, [type, ed]);
    await op.waitForFunction(() => window.S && S.org); await op.waitForTimeout(500); await op.evaluate(() => { try { closeModal(); } catch (e) { } }); return { ctx, op }; };
  const pub = async op => { await op.evaluate(() => (typeof smPublish === 'function' ? smPublish : ACT['ls-pub'])()); await op.waitForTimeout(250); const b = await op.$('#modal [data-mact=ok]'); if (b) await b.click(); await op.waitForTimeout(200); return op.evaluate(() => DREG.cur()); };
  const pull = async op => { await op.evaluate(() => { lpxPull(); render(); }); await op.waitForTimeout(150); };
  const lp = async (ctx, tid, hash, W = 1280) => { const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } }); p.on('pageerror', e => errs.push('learner: ' + e.message)); p.on('dialog', d => d.accept()); await p.setViewportSize({ width: W, height: 860 }); await p.goto(base + `learner.html?t=${tid}${hash}`); await p.waitForTimeout(700); return p; };
  const join = async (p, email, nick, parent) => { await p.waitForSelector('#laJoin', { timeout: 6000 }).catch(() => {}); if (!(await p.$('#laJoin'))) console.log('   [no join form]', errs.join(' // ').slice(0, 600), p.url(), (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 400)); if (parent) { const b = await p.$('[data-ac=jkind][data-v=parent]'); if (b) { await b.click(); await p.waitForTimeout(200); } }
    const all = await p.$('#laJoin [data-ac=jall]'); if (all) await all.check().catch(() => all.click());
    await p.fill('#laJoin [name=email]', email); await p.click('#laJoin [data-ac=otp]'); await p.waitForSelector('.la-demo-code b', { timeout: 5000 });
    await p.fill('#laJoin [name=vcode]', await p.textContent('.la-demo-code b')); await p.fill('#laJoin [name=nick]', nick);
    const a14 = await p.$('#laJoin [name=age14][value="1"]'); if (a14) await a14.check().catch(() => {}); else { const c14 = await p.$('#laJoin [name=age14]'); if (c14 && await c14.getAttribute('type') === 'checkbox') await c14.check().catch(() => {}); }
    await p.click('#laJoin button[type=submit]'); await p.waitForTimeout(700); return p.evaluate(() => [...document.querySelectorAll('#laJErr')].map(e => e.textContent).join('')); };
  const shot = async (p, n) => { if (OUT) await p.screenshot({ path: path.join(OUT, `acct38_${n}.png`) }); };

  if (only.includes('corp')) { const { ctx, op } = await mk('corp');
    /* 엑셀 일괄 등록(mb-bulkrun 형식) 2명 + 부서 */
    await op.evaluate(() => { const g = { id: uid('g'), name: '영업1팀', lead: '', at: today() }; S.groups.push(g); [['jh.kim@ex.kr', '김지훈'], ['yr.park@ex.kr', '박예린']].forEach(([e, n]) => S.members.push({ id: uid('m'), sid: mbSid(e), name: n, nick: n, email: e, phone: '', group: g.id, grade: '정회원', joined: today(), last: '', extra: { 직급: '사원' }, src: 'bulk', acct: { login: 'email', email: e, phone: '', pw: '', verified: false, joined: today(), links: ['email'] } })); mbEnsure(); save(); go('members'); render(); });
    const L0 = await op.evaluate(() => ({ n: S.members.length, tok: S.members.map(m => m.itok), html: document.querySelector('#main').innerText, btn: (document.querySelector('#main [data-act=mem-bulk]') || {}).textContent || '' }));
    ok(L0.tok.every(Boolean) && /가입 전 2명/.test(L0.html), `C: 등록 회원마다 개인 초대 토큰 · '가입 전 2명' 안내 (${L0.tok.length})`);
    ok(/엑셀 일괄 등록/.test(L0.btn), `C12: 일괄 등록 버튼 이름 '${L0.btn}'`);
    const urls = await op.evaluate(() => { const iv = mbInvite('student', '', ''); return { pub: mbInvURL(iv), per: alURL(S.members[1].itok) }; });
    /* C3: 초대 링크에 부서 지정 */
    const g3 = await op.evaluate(() => { UI.mbInvT = 'student'; UI.mbInvC = ''; UI.mbInvG = S.groups[0].id; const h = mbLinkPanel(); const iv = mbInvite('student', '', ''); UI.mbInvG = ''; return { sel: /가입과 함께/.test(h), grp: iv.grp === S.groups[0].id, tok: iv.token }; });
    ok(g3.sel && g3.grp, 'C3: 초대 링크 창에서 부서 지정 → 초대에 부서가 실림');
    const tid = await pub(op);
    /* ① 공용 초대 링크 + 같은 이메일 → 등록 회원에 연결(C2) */
    const l1 = await lp(ctx, tid, urls.pub.slice(urls.pub.indexOf('#'))); const e1 = await join(l1, 'jh.kim@ex.kr', '지훈'); await pull(op);
    const a1 = await op.evaluate(() => { const m = S.members.find(x => x.email === 'jh.kim@ex.kr'); return { n: S.members.length, name: m && m.name, grp: m && gn(m.group), linked: m && m.acct && m.acct.linked && m.acct.linked.by, consent: !!(m && m.acct && m.acct.consent), itok: m && m.itok }; });
    ok(!e1 && a1.n === 2 && a1.name === '김지훈' && a1.grp === '영업1팀' && a1.linked === 'email' && a1.consent && !a1.itok, `C2: 같은 이메일 가입 → 새 회원 없이 등록 행에 연결 ${JSON.stringify(a1)} ${e1}`);
    const lab = await l1.evaluate(() => { location.hash = '#my'; return new Promise(r => setTimeout(() => r((document.querySelector('.mpi > span') || {}).textContent || ''), 600)); });
    ok(/등록 회원/.test(lab), `A18/V12: 등록 경로 표시 '${lab}'`);
    await l1.close();
    /* ② 개인 초대 링크(다른 이메일이어도) → 그 행에 연결 */
    const l2 = await lp(ctx, tid, urls.per.slice(urls.per.indexOf('#'))); const head2 = await l2.evaluate(() => (document.querySelector('.la-inv') || {}).textContent || '');
    ok(/박예린/.test(head2), `개인 초대 링크 첫 화면에 이름 안내 '${head2.slice(0, 60)}'`);
    await join(l2, 'yerin.personal@ex.kr', '예린'); await pull(op);
    const a2 = await op.evaluate(() => { const m = S.members.find(x => x.name === '박예린'); return { n: S.members.length, linked: m && m.acct && m.acct.linked && m.acct.linked.by, grade: m && m.grade, email: m && m.email }; });
    ok(a2.n === 2 && a2.linked === 'invite' && a2.grade === '정회원' && a2.email === 'yr.park@ex.kr', `개인 초대 링크 가입 → 그 행에 연결 · 정회원 ${JSON.stringify(a2)}`);
    await l2.close();
    /* ③ 부서 지정 초대 링크로 새 직원 → 부서 자동 */
    const l3 = await lp(ctx, tid, '#join/' + g3.tok); await join(l3, 'new.hire@ex.kr', '신입'); await pull(op);
    const a3 = await op.evaluate(() => { const m = S.members.find(x => x.nick === '신입'); return m ? gn(m.group) : 'NONE'; }); ok(a3 === '영업1팀', `C3: 부서 지정 초대로 가입 → 부서 '${a3}'`); await l3.close();
    /* ④ 이미 생긴 중복 → 같은 사람 합치기 */
    const mg = await op.evaluate(() => { const reg = { id: uid('m'), sid: 'S9', name: '최도윤', nick: '', email: '', phone: '', group: S.groups[0].id, grade: '정회원', joined: today(), last: '', extra: {} }; S.members.push(reg); const acc = S.members.find(x => x.nick === '신입'); acc.nick = '도윤'; const c = { id: uid('c') }; S.bills = S.bills || []; S.bills.push({ id: 'bx', who: acc.id, title: 't', status: '미납' }); S.inbox[acc.id] = [{ id: 'n1', title: 'x' }]; mbEnsure(); const pairs = alDupPairs().map(([r, a]) => r.name + '↔' + a.nick); const e = alMerge(reg.id, acc.id); return { pairs, e, n: S.members.filter(x => x.name === '최도윤' || x.nick === '도윤').length, bill: S.bills.find(b => b.id === 'bx').who === reg.id, inbox: (S.inbox[reg.id] || []).length, sid: reg.sid === acc.sid, acct: !!(reg.acct && reg.acct.consent) }; });
    ok(mg.pairs.includes('최도윤↔도윤') && !mg.e && mg.n === 1 && mg.bill && mg.inbox === 1 && mg.sid && mg.acct, `중복 안내 · 같은 사람 합치기(청구서 · 알림 · 계정 이동) ${JSON.stringify(mg)}`);
    await op.evaluate(() => { const m = S.members.find(x => x.name === '박예린'); UI.mem = m.id; UI.memT = 'info'; go('members'); render(); }); const card = await op.evaluate(() => (document.querySelector('.al-card') || {}).textContent || '');
    ok(/가입 연결/.test(card) && /같은 사람 합치기/.test(card), '회원 상세 · 가입 연결 카드');
    await shot(op, 'corp_detail'); await ctx.close(); }

  if (only.includes('k12')) { const { ctx, op } = await mk('k12');
    await op.evaluate(() => { go('crmstu'); render(); }); await op.click('[data-act=crm-new]'); await op.waitForTimeout(150);
    await op.fill('#modal [name=n]', '박민준'); await op.fill('#modal [name=pn]', '이은영'); await op.fill('#modal [name=pp]', '01011112222'); await op.check('#modal [name=ok]'); await op.click('#modal [data-mact=ok]'); await op.waitForTimeout(200);
    await op.click('[data-act=crm-new]'); await op.waitForTimeout(150); await op.fill('#modal [name=n]', '박서연'); await op.fill('#modal [name=pn]', '이은영'); await op.fill('#modal [name=pp]', '010-1111-2222'); await op.check('#modal [name=ok]'); await op.click('#modal [data-mact=ok]'); await op.waitForTimeout(200);
    const k0 = await op.evaluate(() => { mbEnsure(); save(); return { ph: S.parents.map(p => p.phone), ptok: S.parents.map(p => p.itok), mtok: S.members.map(m => m.itok), A: S.settings.acct.parent }; });
    ok(k0.ph.every(x => x === '010-1111-2222'), `K16: 보호자 연락처 하이픈 ${k0.ph}`);
    ok(k0.ptok.every(Boolean) && k0.mtok.every(Boolean), 'K2: 원생 · 보호자 행마다 개인 초대 토큰');
    await op.evaluate(() => { UI.crmId = S.members[0].id; UI.crmT = 'sum'; UI.crmSub = 'edit'; render(); }); const inf = await op.evaluate(() => (document.querySelector('#main') || {}).innerText);
    ok(/초대 링크 복사/.test(inf) && /가입 전/.test(inf), 'K2: 원생 카드 보호자 표에 [초대 링크 복사] · 가입 전 상태');
    await op.evaluate(() => { UI.crmSub = ''; render(); }); ok(await op.evaluate(() => !!document.querySelector('[data-act=al-inv]') && !!document.querySelector('[data-act=al-merge]')), 'K1: 원생 카드에 원생 초대 링크 · 같은 사람 합치기');
    const urls = await op.evaluate(() => ({ s: alURL(S.members[0].itok), p: alURL(S.parents[0].itok), pub: mbInvURL(mbInvite('student', '', '')) }));
    /* 수업 · 청구서(보호자 청구서 탭 K4) */
    await op.evaluate(() => { const c = makeCourse ? null : null; S.bills = S.bills || []; S.members.forEach((m, i) => S.bills.push({ id: 'bill' + i, who: m.id, title: `11월 수강료 ${i}`, items: [['수강료', 300000]], due: addDays(today(), 7), status: '미납', month: today().slice(0, 7), paid: [], at: today() })); save(); });
    const tid = await pub(op);
    /* 원생 박민준: 개인 링크로 가입 → 중복 없음(K1) */
    const s1 = await lp(ctx, tid, urls.s.slice(urls.s.indexOf('#'))); await join(s1, 'minjun@ex.kr', '민준이'); await pull(op);
    const k1 = await op.evaluate(() => ({ n: S.members.length, m: (S.members.find(x => x.name === '박민준') || {}).acct, bills: S.bills.filter(b => b.title.startsWith('11월')).length }));
    ok(k1.n === 2 && k1.m && k1.m.consent && k1.bills === 2, `K1: 원생 개인 초대 링크 가입 → 원생 2명 그대로(청구서 중복 없음) ${JSON.stringify({ n: k1.n, b: k1.bills })}`); await s1.close();
    /* 보호자 이은영: 개인 링크 가입 → 두 자녀 모두 연결 완료(K2) */
    const pp = await lp(ctx, tid, urls.p.slice(urls.p.indexOf('#'))); const ph = await pp.evaluate(() => (document.querySelector('.la-inv') || {}).textContent || ''); await join(pp, 'mom@ex.kr', '민준맘'); await pull(op);
    const k2 = await op.evaluate(() => ({ st: S.parents.map(p => p.status), acct: S.parents.every(p => p.acct), mem: S.members.length, pa: (S.pacct || []).map(p => p.name) }));
    ok(/이은영/.test(ph) && k2.st.every(s => s === '연결 완료') && k2.acct && k2.mem === 2 && k2.pa[0] === '이은영', `K2: 보호자 개인 링크 가입 → 형제 2명 모두 연결 완료 ${JSON.stringify(k2)}`);
    /* K3: '보호자 포함' 메시지 → 보호자 메시지함 */
    await op.evaluate(() => { const R = { ids: S.members.map(m => m.id), pars: S.parents.filter(p => p.status === '연결 완료') }; S.msgs = S.msgs || []; cmSend({ mode: 'sel', ids: S.members.map(m => m.id), par: true, imgs: [] }, '휴강 안내', '내일 휴강합니다', [], R); });
    /* K6: 출결 알림 → 보호자 알림함 */
    await op.evaluate(() => { W2.notify([S.members[0].id], '출결 알림', '박민준 결석'); save(); });
    await pub(op); await pp.reload(); await pp.waitForTimeout(700);
    const pmsg = await pp.evaluate(() => lcInbox().map(x => x.title)); ok(pmsg.includes('휴강 안내'), `K3: 보호자 메시지함에 '보호자 포함' 메시지 ${JSON.stringify(pmsg)}`);
    const pnoti = await pp.evaluate(() => laItems().L.map(x => x.title)); ok(pnoti.includes('출결 알림'), `K6: 보호자 알림함에 출결 알림 ${JSON.stringify(pnoti.slice(0, 4))}`);
    /* K4: 보호자 청구서 탭 */
    await pp.evaluate(() => { location.hash = '#mypay/bill'; }); await pp.waitForTimeout(600); const bill = await pp.evaluate(() => document.querySelector('#lm, main, body').innerText);
    ok(/11월 수강료 0/.test(bill) && /11월 수강료 1/.test(bill) && !/구독 관리/.test(bill), 'K4 · K13: 보호자 청구서 탭에 두 자녀 청구서 · 구독 관리 탭 없음');
    /* K13: 보호자 웹 390 아래 탭 */
    await pp.setViewportSize({ width: 390, height: 800 }); await pp.evaluate(() => { location.hash = '#home'; }); await pp.waitForTimeout(600);
    const tb = await pp.evaluate(() => [...document.querySelectorAll('nav.tabbar a span')].map(s => s.textContent).join(',')); ok(/자녀/.test(tb) && /결제/.test(tb) && !/내 학습/.test(tb), `K13: 보호자 웹 390 아래 탭 '${tb}'`);
    await shot(pp, 'k12_parent390');
    /* K5: 보호자 질문 → 원생 목록에 생기지 않고 「이은영 보호자」로 */
    await pp.evaluate(() => lpxPush('msg-ask', { id: 'qa1', body: '숙제가 어디 있나요?' })); await pull(op);
    const k5 = await op.evaluate(() => ({ n: S.members.length, who: ((S.tq || []).find(x => x.id === 'qa1') || {}).sid })); ok(k5.n === 2 && /이은영 보호자/.test(k5.who || ''), `K5: 보호자 질문 · 원생 목록 그대로 ${JSON.stringify(k5)}`);
    await pp.close();
    /* K1 중복이 이미 생긴 경우: 공용 링크로 박서연 대신 '서연이' 가입 → 합치기 안내 */
    const s2 = await lp(ctx, tid, urls.pub.slice(urls.pub.indexOf('#'))); await join(s2, 'seoyeon@ex.kr', '서연이'); await pull(op); await s2.close();
    const k1b = await op.evaluate(() => { go('crmstu'); UI.crmId = null; render(); const note = (document.querySelector('.al-dup') || {}).textContent || ''; const reg = S.members.find(m => m.name === '박서연'); const acc = S.members.find(m => m.nick === '서연이'); const e = alMerge(reg.id, acc.id); save(); return { note, e, n: S.members.length, par: S.parents.filter(p => p.child === reg.id).length, acct: !!(reg.acct && reg.acct.consent) }; });
    ok(/같은 원생/.test(k1b.note) && !k1b.e && k1b.n === 2 && k1b.par === 1 && k1b.acct, `K1: 원생 목록 중복 안내 → 합치기 ${JSON.stringify(k1b)}`);
    /* K8 · K15: 14세 미만 동의 화면의 보호자 계정 버튼 · 가족 연결 관계 기본값 */
    const fam = await op.evaluate(() => pvFam(S.members[0].sid)); const gp = await lp(ctx, tid, `#join/fam-${fam}`); const gh = await gp.evaluate(() => (document.querySelector('.la-inv') || {}).textContent || '');
    ok(/보호자 동의를 마쳤습니다/.test(gh), `K8: 동의 후 보호자 가입 링크(#join/fam-) 안내 '${gh.slice(0, 40)}'`);
    await gp.close();
    const sl = await lp(ctx, tid, '#login'); const relsel = await sl.evaluate(async () => { const r = laRoom(); const m = r.members.find(x => x.name === '박서연'); laSetMe({ kind: 'learner', sid: m.sid, login: 'email', nick: '서연이', grade: '정회원' }); location.hash = '#family'; await new Promise(o => setTimeout(o, 500)); const s = document.querySelector('#laFam [name=rel]'); return s ? [s.value, s.required] : document.body.innerText.replace(/\n+/g, ' | ').slice(0, 300); });
    ok(relsel && relsel[0] === '' && relsel[1], `K15: 가족 연결 관계는 기본값 없이 고르게 ${JSON.stringify(relsel)}`);
    await ctx.close(); }

  if (only.includes('univ')) { const { ctx, op } = await mk('univ', 'lite');
    await op.evaluate(() => { go('enroll'); render(); });
    const csv = path.join(require('os').tmpdir(), 'acct38-univ.csv'); fs.writeFileSync(csv, '﻿학번,학과,이름\r\n20261001,컴퓨터공학과,홍길동\r\n2026200X,경영학과,오류\r\n20261002,경영학과,김철수\r\n');
    const inp = await op.$('#enF'); ok(!!inp && /xlsx/.test(await inp.getAttribute('accept')), 'U12: 학번 파일 불러오기에서 .xlsx 선택 가능');
    await op.setInputFiles('#enF', csv); await op.waitForFunction(() => ((document.querySelector('#enFOut') || {}).textContent || '').length > 5, null, { timeout: 5000 }).catch(() => {}); const msg = await op.evaluate(() => (document.querySelector('#enFOut') || {}).textContent || '');
    ok(/1줄은 뺐습니다/.test(msg) && /3행/.test(msg) && /이름/.test(msg), `U12: 잘못된 학번 행 · 버린 열 안내 '${msg}'`);
    const enl = await op.evaluate(() => [($('#enL') || {}).value, location.hash, S.codes.length]); console.log('   enL', JSON.stringify(enl)); await op.evaluate(() => ACT['en-codes']()); await op.waitForTimeout(150);
    const u = await op.evaluate(() => ({ g: S.groups.map(g => g.name), mg: S.members.map(m => gn(m.group)) }));
    ok(u.g.includes('컴퓨터공학과') && u.g.includes('경영학과') && u.mg.includes('컴퓨터공학과'), `U10: 학과가 그룹으로 생김 ${JSON.stringify(u)}`);
    const tab = await op.evaluate(() => { const c = S.classes[0] || (makeCourse({ name: '특강', weeks: 2 }), S.classes[0]); c.learners = S.members.map(m => m.id); UI.cls = c.id; go('class'); render(); const th = [...document.querySelectorAll('#main th')].map(x => x.textContent); const td = [...document.querySelectorAll('#main td')].map(x => x.textContent); try { pickTargets('수강 권한 부여', [], () => {}); } catch (e) { } const seg = [...document.querySelectorAll('.c2pt button')].map(b => b.textContent).join('|'); return { th: th.slice(0, 4), dept: td.includes('컴퓨터공학과'), seg }; });
    ok(tab.th.includes('학번') && tab.dept && /학과 단위/.test(tab.seg) && !/팀 단위/.test(tab.seg), `U9 · U10: 교과목 학생 표 학번 · 학과, 권한 부여 '학과 단위' ${JSON.stringify(tab)}`);
    const tid = await pub(op); const l = await lp(ctx, tid, '#join'); const g = await l.evaluate(() => document.querySelector('#lm, main, body').innerText); ok(/접근코드 받기 요청/.test(g), 'U18: 미등록 학생 #join에 접근코드 받기 요청 길');
    await ctx.close(); }

  if (only.includes('pub')) { const { ctx, op } = await mk('public');
    const p1 = await op.evaluate(() => { mbEnsure(); return { join: S.settings.join, mode: S.settings.acct.mode, q: S.settings.acct.extraQ.map(x => x.q) }; });
    ok(p1.mode === 'open' && !p1.q.includes('직급'), `P1 · P8: 공공 새 기관은 누구나 가입 · 직급 질문 없음 ${JSON.stringify(p1)}`);
    const p2 = await op.evaluate(() => { S.settings.join = '운영자 초대만'; S.settings.acct.mode = 'invite'; delete S.settings.join38; upgradeState(); const a = S.settings.acct.mode; S.settings.acct.mode = 'invite'; S.settings.join = '운영자 초대만'; upgradeState(); return [a, S.settings.acct.mode]; });
    ok(p2[0] === 'open' && p2[1] === 'invite', `P1: 기존 공공 기관 1회 이전 · 이후 운영자 값 존중 ${p2}`);
    const p3 = await op.evaluate(() => { S.members.push({ id: 'mm1', sid: 'u1', name: '서미래', nick: '서미래', email: 'mirae@ex.kr', phone: '010-1234-5678', group: '', grade: '정회원', joined: today(), extra: { 소속: '사하구 주민' }, src: 'bulk' }); UI.mem = null; go('members'); render(); return document.querySelector('#main').innerText; });
    ok(/사하구 주민/.test(p3) && /mi\*+@e\*+\.kr/.test(p3) && /010-\*\*\*\*-5678/.test(p3), 'P12 · P13: 명단 소속 답 표시 · 이메일 · 전화 같은 규칙으로 가림 ' + p3.replace(/\n+/g, ' | ').slice(-300));
    const p4 = await op.evaluate(() => { ACT['ux-find'](); const q = document.querySelector('#modal .uxq'); q.value = '가입'; q.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#modal .uxfl button')].filter(b => !b.hidden).map(b => b.textContent); });
    ok(p4.some(x => /가입 방식/.test(x)), `P14: 메뉴 찾기 '가입' → 가입 방식 설정 ${JSON.stringify(p4.slice(0, 3))}`);
    await ctx.close(); }

  if (only.includes('life')) { const { ctx, op } = await mk('lifelong');
    /* L13: 이메일 없는 어르신 — 번호 · 접근코드 계정 */
    await op.evaluate(() => { UI.mbInvTab = 'manual'; ACT['mem-invite'](); }); await op.fill('#modal [name=n]', '이복례'); await op.click('#modal [data-mact=ok]'); await op.waitForTimeout(250);
    const l13 = await op.evaluate(() => { const m = S.members.find(x => x.name === '이복례'); const c = (S.codes || []).find(x => x.sid === (m || {}).sid); return { m: !!m, email: m && m.email, code: c && c.code, sid: m && m.sid, txt: (document.querySelector('#modal') || {}).innerText || '' }; });
    ok(l13.m && !l13.email && l13.code && /접근코드/.test(l13.txt), `L13: 이메일 없이 번호 · 접근코드 계정 ${l13.sid}`); await op.evaluate(() => closeModal());
    /* L14: 임시 비밀번호 계정 · L10: 유료 · 정원 강좌 초대 경고와 정원 검사 */
    await op.evaluate(() => { UI.mbInvTab = 'manual'; ACT['mem-invite'](); }); await op.click('#modal [name=mk][value=email]'); await op.fill('#modal [name=n]', '홍성철'); await op.fill('#modal [name=e]', 'hong@ex.kr'); await op.fill('#modal [name=pw]', 'Temp123!x'); await op.click('#modal [data-mact=ok]'); await op.waitForTimeout(200);
    const w = await op.evaluate(() => { makeCourse({ name: '바리스타 자격 준비', weeks: 2 }); const c = S.classes[S.classes.length - 1]; c.price = 120000; c.recruit = { on: false, cap: 1 }; c.status = '운영중'; c.learners = []; save(); closeModal(); UI.mbInvTab = 'link'; UI.mbInvT = 'student'; UI.mbInvC = c.id; ACT['mem-invite'](); const t = (document.querySelector('.al-clsw') || {}).textContent || ''; const u = mbInvURL(mbInvite('student', c.id, '')); closeModal(); UI.mbInvC = ''; return { t, u, cid: c.id }; });
    ok(/결제 없이/.test(w.t) && /정원 1명/.test(w.t), `L10: 유료 · 정원 강좌 초대 링크 경고 '${w.t.slice(0, 80)}'`);
    const tid = await pub(op);
    for (const [e, n] of [['a1@ex.kr', '가입일'], ['a2@ex.kr', '가입이']]) { const l = await lp(ctx, tid, w.u.slice(w.u.indexOf('#'))); await join(l, e, n); await pull(op); await l.close(); }
    const cap = await op.evaluate(cid => C(cid).learners.length, w.cid); ok(cap === 1, `L10: 초대 링크 정원 검사(정원 1 → 배정 ${cap}명)`);
    const lc = await lp(ctx, tid, '#login'); const lcr = await lc.evaluate(async ([sid, code]) => { const d = document.querySelector('details.la-code'); if (!d) return 'no code form'; d.open = true; const f = document.querySelector('#li'); f.elements.sid.value = sid; f.elements.code.value = code; f.querySelector('button[type=submit], button').click(); await new Promise(o => setTimeout(o, 900)); return LR.me ? LR.me.sid : 'no login ' + ((document.querySelector('#li .err') || {}).textContent || ''); }, [l13.sid, l13.code]);
    ok(lcr === l13.sid, `L13: 번호 · 접근코드로 학습자 로그인 ${lcr}`); await lc.close();
    const l14 = await lp(ctx, tid, '#login'); await l14.click('[data-ac=lmode][data-v=pw]').catch(() => {}); await l14.waitForTimeout(200); await l14.fill('#laLogin [name=lid]', 'hong@ex.kr'); await l14.fill('#laLogin [name=pw]', 'Temp123!x'); await l14.click('#laLogin button[type=submit]'); await l14.waitForTimeout(1200);
    const h14 = await l14.evaluate(() => [location.hash, !!document.querySelector('#laPw')]); ok(h14[0] === '#acct' && h14[1], `L14: 임시 비밀번호 첫 로그인 → 비밀번호 바꾸기 ${JSON.stringify(h14)}`);
    await ctx.close(); }

  if (only.includes('date')) { const ctx = await br.newContext({ timezoneId: 'Asia/Seoul' }); const p = await ctx.newPage(); await p.goto(base + 'learner.html?t=sample'); await p.waitForTimeout(400);
    const d = await p.evaluate(() => ({ a: lLocal('2026-11-10T21:04:00.000Z'), b: lLocal('2026-11-11'), c: ymdL(new Date('2026-11-10T20:30:00Z')) }));
    ok(d.a === '2026-11-11 06:04' && d.b === '2026-11-11' && d.c === '2026-11-11', `날짜: 학습자 화면 UTC 시각 → 현지 ${JSON.stringify(d)}`);
    const o = await ctx.newPage(); await o.goto(base + 'index.html'); await o.waitForTimeout(400); const s = await o.evaluate(() => ({ a: atL('2026-11-10T20:57:00Z'), b: addDays('2026-11-30', 1), c: ymdL(new Date('2026-11-10T22:00:00Z')) }));
    ok(s.a === '2026-11-11 05:57' && s.b === '2026-12-01' && s.c === '2026-11-11', `날짜: 운영자 화면 현지 날짜 ${JSON.stringify(s)}`); await ctx.close(); }

  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' / '));
  await br.close(); srv.close(); const F = R.filter(x => !x[0]).length; console.log(`\n${R.length - F}/${R.length} 통과`); process.exit(F ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
