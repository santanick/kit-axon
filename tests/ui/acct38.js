'use strict';
/* v38 계정 · 초대 · 회원 연결 점검(QA K1~K6 · K8 · K13 · K15 · K16 · C2 · C3 · C12 · U9 · U10 · U12 · U18 · P1 · P3 · P12~P14 · 날짜 현지화)
   운영자 화면과 학습자 화면(데모 데이터룸)을 같은 브라우저에서 열어, 등록한 사람과 실제 가입 계정이 하나로 이어지는지 본다.
   사용: node tests/ui/acct38.js  (ONLY=corp,k12,univ,pub,date, SHOTS=폴더) */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../didisam'); const OUT = process.env.SHOTS || '';
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const R = []; const ok = (c, m) => { R.push([!!c, m]); console.log(c ? '✓' : '✗', m); };
const only = (process.env.ONLY || 'corp,k12,k12b,univ,pub,life,date,r2').split(',');
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
    ok(await op.evaluate(() => typeof HPS === 'object' && HPS.inviteOnly && HPS.inviteOnly()), 'F5 이관 ①: 기업 초대제면 머리 신청 버튼이 「초대받은 분 로그인」');
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
    /* 운영: 서버가 이메일 블라인드 인덱스(ebx)로 찾은 등록 회원 · 보호자 동의 연결(famSid) 이벤트 처리 */
    const sv = await op.evaluate(() => { const m = { id: uid('m'), sid: 'u-srv', name: '한태준', nick: '한태준', email: 'tj@ex.kr', ebx: 'EBX1', phone: '', group: '', grade: '정회원', joined: today(), last: '', extra: {}, src: 'bulk', acct: { login: 'email', email: 'tj@ex.kr', links: ['email'] } }; S.members.push(m); mbEnsure(); const n0 = S.members.length; LPX['acct-join']({ at: new Date().toISOString(), who: 'lid-1', data: { kind: 'learner', login: 'email', sid: 'lid-1', nick: '태준', consent: { tos: true, privacy: true }, link: { mid: m.id, by: 'email', ebx: 'BAD' } } }); const bad = S.members.length; LPX['acct-join']({ at: new Date().toISOString(), who: 'lid-2', data: { kind: 'learner', login: 'email', sid: 'lid-2', nick: '태준2', consent: { tos: true, privacy: true }, link: { mid: m.id, by: 'email', ebx: 'EBX1' } } }); return { n0, bad, n2: S.members.length, linked: m.acct && m.acct.linked && m.acct.linked.by, sid: m.sid }; });
    ok(sv.bad === sv.n0 + 1 && sv.n2 === sv.n0 + 1 && sv.linked === 'email' && sv.sid === 'lid-2', `운영 이벤트: ebx가 맞을 때만 등록 행에 연결(틀린 값은 새 회원) ${JSON.stringify(sv)}`);
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
    const fs1 = await op.evaluate(() => { const ch = S.members.find(m => m.name === '박민준'); const n0 = S.parents.length; LPX['acct-join']({ at: new Date().toISOString(), who: 'plid', data: { kind: 'parent', login: 'email', sid: 'plid', nick: '민준아빠', famSid: ch.sid, consent: { tos: true, privacy: true } } }); const pa = S.pacct.find(p => p.sid === 'plid'); const row = S.parents.find(p => p.acct === (pa || {}).id && p.child === ch.id); return { added: S.parents.length - n0, st: row && row.status }; });
    ok(fs1.st === '연결 완료', `운영 이벤트: 보호자 동의 연결 토큰(famSid)으로 가입한 보호자 → 자녀와 연결 ${JSON.stringify(fs1)}`);
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
    ok(await op.evaluate(() => !(MBQ_SUG.public || []).some(x => x[0] === '직급')), 'F5 이관 ③: 공공 가입 질문 추천 칩에 직급 없음');
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
    const jp = await lp(ctx, tid, '#join'); ok(await jp.evaluate(() => !laCfg().parent && !document.querySelector('[data-ac=jkind][data-v=parent]')), 'F5 이관 ②: 평생교육원 가입 화면에 보호자 회원 유형 없음'); await jp.close();
    const lc = await lp(ctx, tid, '#login'); const lcr = await lc.evaluate(async ([sid, code]) => { const d = document.querySelector('details.la-code'); if (!d) return 'no code form'; d.open = true; const f = document.querySelector('#li'); f.elements.sid.value = sid; f.elements.code.value = code; f.querySelector('button[type=submit], button').click(); await new Promise(o => setTimeout(o, 900)); return LR.me ? LR.me.sid : 'no login ' + ((document.querySelector('#li .err') || {}).textContent || ''); }, [l13.sid, l13.code]);
    ok(lcr === l13.sid, `L13: 번호 · 접근코드로 학습자 로그인 ${lcr}`); await lc.close();
    const l14 = await lp(ctx, tid, '#login'); await l14.click('[data-ac=lmode][data-v=pw]').catch(() => {}); await l14.waitForTimeout(200); await l14.fill('#laLogin [name=lid]', 'hong@ex.kr'); await l14.fill('#laLogin [name=pw]', 'Temp123!x'); await l14.click('#laLogin button[type=submit]'); await l14.waitForTimeout(1200);
    const h14 = await l14.evaluate(() => [location.hash, !!document.querySelector('#laPw')]); ok(h14[0] === '#acct' && h14[1], `L14: 임시 비밀번호 첫 로그인 → 비밀번호 바꾸기 ${JSON.stringify(h14)}`);
    await ctx.close(); }

  /* 2차 보완(R2): K7 · K10 · K12 · K17 · 반 공용 링크 연결 · 시각 표기 */
  if (only.includes('k12b')) { const { ctx, op } = await mk('k12');
    const k10 = await op.evaluate(() => { ACT['crm-sample'](); S.classes.forEach(c => { c.price = 0; c.fee = 0; c.feeMode = ''; }); save(); go('crmbill'); UI.crmBT = 'now'; render(); const t1 = document.querySelector('#main').innerText; ACT['crm-gen-now'](); return { t1, toast: [...document.querySelectorAll('.toast, #toast')].map(x => x.textContent).join(' ') }; });
    ok(/수강료가 정해지지 않은 수업/.test(k10.t1) || /수강료가 정해지지 않은 수업/.test(k10.toast), `K10: 0원 수업만 있으면 '수강료가 정해지지 않은 수업' 안내 ${k10.t1.slice(0, 120)}`);
    ok(await op.evaluate(() => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(nowStr()) && atL('2026. 11. 11. 5시 30분 0초') === '2026-11-11 05:30'), '시각 표기: nowStr · 옛 표기 모두 YYYY-MM-DD HH:mm');
    /* K17: 이름을 바꾸면 '새 과정' 파생 문구도 바뀜 */
    const k17 = await op.evaluate(() => { const c = S.classes[0]; c._nm = '새 과정'; c.goal = '[교육 목표]\n- 원생이 새에서 배우는 개념을 정확히 이해합니다.'; c.curriculum = [...(c.curriculum || []), { id: 'q9', type: 'quiz', title: '새 과정 정리 · 최종 평가' }]; c.name = '초등 국어 독해반'; render(); return { goal: c.goal, t: c.curriculum.find(x => x.id === 'q9').title }; });
    ok(!/새에서|새 과정/.test(k17.goal + k17.t), `K17: 이름 바꾼 뒤 파생 문구 갱신 ${JSON.stringify(k17)}`);
    /* K7 · K17 학습자: 퀴즈를 고르면 회차 표 접힘, 수강 기간은 실제 기간 */
    const ids = await op.evaluate(() => { const c = S.classes[0]; c.price = 0; c.curriculum.push({ id: 'qz1', type: 'quiz', title: '1회차 확인 퀴즈', qs: [{ t: 'ox', q: '1+1=2', a: 'O' }] }); const m = S.members.find(x => c.learners.includes(x.id) && !/서윤|서준/.test(x.name)); c.prog = c.prog || {}; c.prog[m.id] = c.prog[m.id] || { p: 0, exam: null, assign: 'none', att: 0 }; m.acct = { login: 'code', consent: { tos: true } }; S.codes = [{ sid: m.sid, code: 'KKK111', dept: '' }]; save(); return { cid: c.id, sid: m.sid }; });
    const tid = await pub(op); const lk = await lp(ctx, tid, '#login');
    await lk.evaluate(async ([sid]) => { await LR.api.login(sid, 'KKK111'); location.hash = '#home'; }, [ids.sid]); await lk.waitForTimeout(400);
    const k7 = await lk.evaluate(async cid => { location.hash = `#c/${cid}/qz1`; await new Promise(o => setTimeout(o, 700)); const d = document.querySelector('details.lw-sched'); return d ? d.open : 'none ' + JSON.stringify(LR.me) + document.body.innerText.slice(0, 200).replace(/\n+/g, ' | '); }, ids.cid);
    ok(k7 === false, `K7: 퀴즈를 고르면 회차 · 출결 표가 접혀 있음 (${k7})`);
    const per = await lk.evaluate(async cid => { location.hash = `#class/${cid}`; await new Promise(o => setTimeout(o, 700)); return document.body.innerText.match(/수강 기간[^\n|]*\n?[^\n]*/) ? document.body.innerText.match(/수강 기간\s*([^\n]*)/)[1] : 'none'; }, ids.cid);
    ok(!/수강 신청 후/.test(per) && /\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}/.test(per), `K17: 회차 수업 수강 기간 = 실제 기간 '${per}'`);
    /* K12: 로그인 유지 — 새 탭(세션 저장소 비어 있음)에서도 로그인 */
    const kp = await lp(ctx, tid, '#login'); await kp.waitForTimeout(300); const keepBox = await kp.evaluate(async sid => { const k = document.querySelector('form#li [name=keep]') || document.querySelector('[name=keep]'); if (!k) return false; const d = k.closest('details'); if (d) d.open = true; k.checked = true; await LR.api.login(sid, 'KKK111'); return true; }, ids.sid);
    ok(keepBox, "K12: 로그인 화면에 '이 기기에서 로그인 유지'");
    const kp2 = await lp(ctx, tid, '#home'); const kept = await kp2.evaluate(() => !!LR.me); ok(kept, 'K12: 앱 · 탭을 닫았다 열어도 로그인 유지(localStorage + 만료)'); await kp2.evaluate(async () => { await LR.api.logout(); }); const kp3 = await lp(ctx, tid, '#home'); ok(await kp3.evaluate(() => !LR.me), 'K12: 로그아웃하면 기억도 지움');
    await kp.close(); await kp2.close(); await kp3.close(); await lk.close();
    /* 반 공용 초대 링크 + 이름 · 보호자 연락처 → 등록 행에 연결 */
    const reg = await op.evaluate(() => { const m = S.members.find(x => /강서윤/.test(x.name)); const p = S.parents.find(x => x.child === m.id); return { id: m.id, ph: p.phone, url: mbInvURL(mbInvite('student', S.classes[0].id, '')) }; });
    const tid2 = await pub(op); const lj = await lp(ctx, tid2, reg.url.slice(reg.url.indexOf('#')));
    await lj.waitForSelector('#laJoin', { timeout: 6000 }).catch(() => {}); const hasG = await lj.$('#laJoin [name=gmatch]'); if (hasG) await lj.fill('#laJoin [name=gmatch]', reg.ph);
    await join(lj, 'seoyun@ex.kr', '서윤'); await pull(op);
    const rj = await op.evaluate(id => { const m = M(id); return { n: S.members.filter(x => /서윤/.test(x.name + x.nick)).length, linked: m && m.acct && m.acct.linked && m.acct.linked.by }; }, reg.id);
    ok(!!hasG && rj.n === 1 && rj.linked === 'gphone', `반 공용 링크 + 이름 · 보호자 연락처 → 등록 원생에 연결 ${JSON.stringify(rj)} g=${!!hasG} ${JSON.stringify(await op.evaluate(() => JSON.parse(localStorage.getItem('didisam.room.' + DREG.cur() + '.lpx') || '[]').filter(x => x.type === 'acct-join').map(x => x.data.link || null)))}`);
    await ctx.close(); }

  if (only.includes('r2')) { const { ctx, op } = await mk('corp');
    const r = await op.evaluate(() => { makeCourse({ name: '정보보호 교육', weeks: 2 }); const c = S.classes[S.classes.length - 1]; c.status = '운영중'; render(); ACT['cls-grant']({ dataset: { v: c.id } }); const t7 = (document.querySelector('#modal') || {}).innerText || ''; closeModal();
      S.members.push({ id: 'mo1', sid: 'u-o', name: '오하윤', nick: '오하윤', email: '', phone: '', group: '', grade: '정회원', joined: today(), extra: {} }); const lab = c2MLabel(M('mo1'));
      c.recruit = { on: false, cap: 1 }; c.price = 0; c.learners = []; S.members.push({ id: 'mo2', sid: 'u-o2', name: '정다은', nick: '', email: '', phone: '', group: '', grade: '정회원', joined: today(), extra: {} }); let warn = ''; const old = c2ov; ACT['cls-grant']({ dataset: { v: c.id } }); const ov = [...document.querySelectorAll('.c2ov')].pop(); ov.querySelectorAll('.c2pkl input[type=checkbox]').forEach(x => x.click()); ov.querySelector('[data-c2a=ok]').click(); const cf = [...document.querySelectorAll('.c2ov')].pop(); warn = cf ? cf.innerText : ''; document.querySelectorAll('.c2ov').forEach(x => x.remove());
      return { t7, lab, warn }; });
    ok(!/학번/.test(r.t7) && /엑셀 일괄 등록/.test(r.t7), `C7: 기업 빈 배정 창에 대학 문구 없음 ${r.t7.slice(0, 80)}`);
    ok(r.lab === '오하윤', `C16 · P23: 배정 창 이름 중복 없음 '${r.lab}'`);
    ok(/정원 1명/.test(r.warn), `L10: 직접 배정이 정원을 넘으면 경고 '${r.warn.slice(0, 80)}'`);
    const opt = await op.evaluate(() => { const c = S.classes[S.classes.length - 1]; c.price = 120000; c.recruit = { on: false, cap: 2 }; c.learners = ['a', 'b']; UI.mbInvT = 'student'; UI.mbInvC = ''; S.org.type = 'lifelong'; const h = mbLinkPanel(); S.org.type = 'corp'; return h; });
    ok(/유료 120,000원 · 정원 마감 2\/2/.test(opt), 'L10: 초대 창 강좌 목록에서 고르기 전에 유료 · 정원 표시');
    /* C3: 기업 가입 — 부서 미지정 초대면 부서 필수, 미지정 줄 집계 */
    const q = await op.evaluate(() => { S.settings.acct.extraQ = [{ q: '부서', type: 'text', req: false, opts: [] }]; S.settings.acct.mode = 'open'; save(); return mbInvURL(mbInvite('student', '', '')); });
    const tid = await pub(op); const lq = await lp(ctx, tid, q.slice(q.indexOf('#'))); const e3 = await join(lq, 'nodept@ex.kr', '부서없음');
    ok(/부서/.test(e3), `C3: 부서 지정 없는 초대 링크면 부서 필수 '${e3}'`); await lq.close();
    const u = await op.evaluate(() => { const c = S.classes[S.classes.length - 1]; c.legal = true; c.learners = ['mo1']; go('legal'); render(); return (document.querySelector('#main') || {}).innerText || ''; });
    ok(/미지정/.test(u) || !/별 이수율/.test(u), `C3: ${'부서'}별 이수율에 '미지정' 줄`);
    /* V19: 일괄 등록 미리보기에 추가 질문 열 */
    const csv = path.join(require('os').tmpdir(), 'acct38-v19.csv'); fs.writeFileSync(csv, '\ufeff이메일,이름,부서,연락처,생년월일\r\nv19@ex.kr,김훈련,,,1990-01-01\r\n');
    await op.evaluate(() => { S.settings.acct.extraQ = [{ q: '생년월일', type: 'date', req: false, opts: [] }]; ACT['mem-bulk'](); }); await op.setInputFiles('#mbBkF', csv); await op.waitForSelector('.mbk-ok', { timeout: 6000 }).catch(() => {});
    const pv = await op.evaluate(() => (document.querySelector('.mbk-ok') || {}).innerText || ''); ok(/생년월일/.test(pv) && /1990-01-01/.test(pv), `V19: 일괄 등록 미리보기에 추가 질문 열 ${pv.slice(0, 100)}`);
    await ctx.close(); }

  if (only.includes('date')) { const ctx = await br.newContext({ timezoneId: 'Asia/Seoul' }); const p = await ctx.newPage(); await p.goto(base + 'learner.html?t=sample'); await p.waitForTimeout(400);
    const d = await p.evaluate(() => ({ a: lLocal('2026-11-10T21:04:00.000Z'), b: lLocal('2026-11-11'), c: ymdL(new Date('2026-11-10T20:30:00Z')) }));
    ok(d.a === '2026-11-11 06:04' && d.b === '2026-11-11' && d.c === '2026-11-11', `날짜: 학습자 화면 UTC 시각 → 현지 ${JSON.stringify(d)}`);
    const o = await ctx.newPage(); await o.goto(base + 'index.html'); await o.waitForTimeout(400); const s = await o.evaluate(() => ({ a: atL('2026-11-10T20:57:00Z'), b: addDays('2026-11-30', 1), c: ymdL(new Date('2026-11-10T22:00:00Z')) }));
    ok(s.a === '2026-11-11 05:57' && s.b === '2026-12-01' && s.c === '2026-11-11', `날짜: 운영자 화면 현지 날짜 ${JSON.stringify(s)}`); await ctx.close(); }

  ok(!errs.length, 'pageerror 0 ' + errs.slice(0, 3).join(' / '));
  await br.close(); srv.close(); const F = R.filter(x => !x[0]).length; console.log(`\n${R.length - F}/${R.length} 통과`); process.exit(F ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
