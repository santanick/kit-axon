'use strict';
/* v36 소통 검증(F): 공지 바로 고치기 · 순서 · 고정, 다중 게시판(유형별 기본 세트 · 설정 · 순서), 학습자 사이트 권한, 마이그레이션 반복 안전.
   ① 7개 유형: 기본 게시판 세트 · 소통 화면(공지 · 게시판 · 게시판 관리) 렌더 오류 0 · 390 가로 넘침 0
   ② 대학: 공지 누르기 → 편집 칸(굵게 · 목록 · 링크) → 저장 → 짧은 표기 저장 · 학습자 공지에 서식 · 취소는 그대로
   ③ 순서: ↑ ↓ · 끌어 놓기 → ord 순서 = 학습자 공지 순서, 고정은 위
   ④ 게시판 만들기(자료실 틀) · 순서 바꾸기 · 운영자 글쓰기 → 학습자 게시판 메뉴 · 운영자만 쓰기 · 댓글 끔 · 첨부 끔
   ⑤ 학습자 글 · 댓글 → 운영자 반영(LPX) · 권한 밖 글은 쓸 수 있는 게시판으로, 댓글 끔 게시판 댓글은 거절
   ⑥ 기존 데이터(게시판 2개 · 공지 ord 없음) → upgradeState 두 번 → 결과 같음
   사용: node tests/ui/comm-board.js */
const path = require('node:path'); const fs = require('node:fs'); const http = require('node:http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const serve = port => new Promise(ok => { const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }); s.listen(port, () => ok(s)); });
const TYPES = [['univ', 'lms'], ['univ', 'center'], ['k12'], ['adult'], ['corp'], ['lifelong'], ['voc']];
const SH = process.env.SHOTS || ''; const shot = async (pg, n) => { if (!SH) return; fs.mkdirSync(SH, { recursive: true }); for (const w of [1280, 390]) { await pg.setViewportSize({ width: w, height: w < 600 ? 844 : 900 }); await pg.waitForTimeout(200); await pg.screenshot({ path: path.join(SH, `${n}_${w}.png`), fullPage: true }); } await pg.setViewportSize({ width: 1280, height: 900 }); };
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };

async function mkOrg(br, base, type, ed, errs) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/youtube|ytimg|googleapis|gstatic|jsdelivr|channel\.io/, r => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`[${type}] ${e.message}`)); p.on('dialog', d => d.accept());
  await p.goto(base + 'index.html'); await p.waitForFunction(() => typeof createOrg === 'function');
  await p.evaluate(([type, ed]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = false; createOrg(type, '소통 점검 기관'); if (ed) { S.org.ed = ed; S.bdV = 0; S.boards = S.boards.filter(b => b.sys); cmEnsure(); } UI.sbOld = { board: 1, community: 1 }; save(); }, [type, ed]);
  await p.waitForTimeout(600); await p.evaluate(() => { try { closeModal(); } catch (e) { } document.head.insertAdjacentHTML('beforeend', '<style>#toasts{display:none!important}</style>'); });
  return { ctx, p }; }
const view = (p, tab, js) => p.evaluate(([tab, js]) => { go(tab); if (js) (0, eval)(js); render(); }, [tab, js || '']).then(() => p.waitForTimeout(250));

(async () => { const port = 9700 + Math.floor(Math.random() * 200); const srv = await serve(port); const base = `http://localhost:${port}/`; const br = await chromium.launch(); const errs = [];
  try {
    /* ① 7개 유형 */
    for (const [type, ed] of TYPES) { const K = type + (ed ? ':' + ed : ''); const { ctx, p } = await mkOrg(br, base, type, ed, errs);
      const names = await p.evaluate(() => S.boards.map(b => b.name)); const want = await p.evaluate(() => cmPresetBoards().map(x => x.name));
      ok(want.every(n => names.includes(n)) && names.includes('커뮤니티'), `${K} 기본 게시판 세트: ${names.join(' · ')}`);
      if (type === 'univ') ok(names.includes(ed === 'lms' ? '학과 공지' : '프로그램 공지') && names.includes('Q&A') && names.includes('자료실'), `${K} 대학 세트(공지 · Q&A · 자료실)`);
      for (const [tab, js, sel] of [['board', '', '.cmn-bar'], ['community', "UI.comB='커뮤니티'", '.cmb-chips'], ['community', "UI.comB='boards'", '[data-cmb]']]) { await view(p, tab, js); ok(!!(await p.$('#main ' + sel)), `${K} ${tab}${js ? ' ' + js : ''} 그려짐(${sel})`); }
      await p.setViewportSize({ width: 390, height: 844 }); for (const js of ["UI.comB='커뮤니티'", "UI.comB='boards'"]) { await view(p, 'community', js); ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${K} 390 넘침 없음 ${js}`); }
      await view(p, 'board'); ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${K} 390 공지 넘침 없음`);
      const mv = await p.evaluate(() => ({ n: document.querySelectorAll('[data-cmn] li').length, vis: [...document.querySelectorAll('.cmn-mv')].some(b => b.offsetWidth > 0) })); ok(!mv.n || mv.vis, `${K} 390 공지 ↑ ↓ 버튼 보임(공지 ${mv.n}건)`);
      await ctx.close(); }

    /* ②~⑥ 대학 */
    const { ctx, p } = await mkOrg(br, base, 'univ', 'lms', errs);
    await p.evaluate(() => { if (!S.classes.length) { const ctx = { cards: [], nav: '', after: [], used: [] }; agRun('create_courses', { courses: [{ name: '자료구조', weeks: 4, price: 0, publish: true, week_topics: ['배열', '리스트', '트리', '그래프'] }] }, ctx); if (ctx.cards[0] && PLANS[ctx.cards[0].plan]) PLANS[ctx.cards[0].plan].run(); else { try { CF.close && CF.close(false); } catch (e) { } makeCourse({ name: '자료구조', weeks: 4, price: 0, topics: ['배열', '리스트', '트리', '그래프'] }); } try { closeModal(); } catch (e) { } } const c = S.classes[0]; if (c) { c.status = '운영중'; c.open = '전체'; c.prog = c.prog || {}; c.learners = c.learners || []; S.members.filter(m => !['승인 대기', '거절'].includes(m.grade)).slice(0, 3).forEach(m => { if (!c.learners.includes(m.id)) c.learners.push(m.id); c.prog[m.id] = c.prog[m.id] || { p: 40 }; }); } save(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { S.notices.unshift({ id: 'nA', title: '수강 정정 안내', body: '기존 본문', at: '2026-11-01', pin: false, views: 0 }, { id: 'nB', title: '도서관 휴관', body: '', at: '2026-10-20', pin: false, views: 0 }); delete S.notices[0].ord; delete S.notices[1].ord; cmEnsure(); save(); });
    await view(p, 'board');
    await p.click('.cmn-m[data-v=nA]'); await p.waitForTimeout(150); ok(!!(await p.$('.cmn-e[data-cmne=nA] .cmn-body')), '② 공지 누르면 그 자리에 편집 칸');
    const bd = p.locator('.cmn-e[data-cmne=nA] .cmn-body');
    await bd.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('정정 기간은 '); await p.keyboard.down('Shift'); await p.keyboard.press('Home'); await p.keyboard.up('Shift');
    await p.click('.cmn-e[data-cmne=nA] [data-cmnf=bold]'); await p.keyboard.press('End'); await p.keyboard.press('Control+B'); await p.keyboard.type(' 11월 3일까지입니다.'); await p.keyboard.press('Enter');
    await p.click('.cmn-e[data-cmne=nA] [data-cmnf=list]'); await p.keyboard.type('학과 사무실 방문'); await p.keyboard.press('Enter'); await p.keyboard.type('포털 신청'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
    await p.keyboard.type('안내 페이지'); await p.keyboard.down('Shift'); for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowLeft'); await p.keyboard.up('Shift');
    await p.click('.cmn-e[data-cmne=nA] [data-cmnf=link]'); await p.fill('.cmn-e[data-cmne=nA] [data-cmnurl]', 'https://example.ac.kr/notice'); await p.click('.cmn-e[data-cmne=nA] [data-cmnf=linkok]');
    await p.click('.cmn-e[data-cmne=nA] [data-act=cmn-save]'); await p.waitForTimeout(200);
    const nA = await p.evaluate(() => cmFindNotice('nA').n); console.log('   저장된 본문:', JSON.stringify(nA.body));
    ok(/\*\*정정 기간은\s*\*\*/.test(nA.body) && /^- 학과 사무실 방문$/m.test(nA.body) && /^- 포털 신청$/m.test(nA.body) && /\[안내 페이지\]\(https:\/\/example\.ac\.kr\/notice\)/.test(nA.body), '② 굵게 · 목록 · 링크가 짧은 표기로 저장');
    ok(!(await p.$('.cmn-e')), '② 저장 후 편집 칸 닫힘'); if (SH) { await p.click('.cmn-m[data-v=nA]'); await p.waitForTimeout(150); await shot(p, 'F1_공지_편집'); await p.click('[data-act=cmn-cancel]'); await shot(p, 'F2_공지_목록'); }
    await p.click('.cmn-m[data-v=nA]'); await p.waitForTimeout(100); await p.locator('.cmn-e[data-cmne=nA] .cmn-body').click(); await p.keyboard.type('지울 글'); await p.click('[data-act=cmn-cancel]'); await p.waitForTimeout(100);
    ok((await p.evaluate(() => cmFindNotice('nA').n.body)) === nA.body, '② 취소하면 그대로');
    /* 새 공지(인라인) */
    await p.click('#main [data-act=notice-new]'); await p.waitForTimeout(150); ok(!!(await p.$('.cmn-e[data-cmne=new]')), '② + 공지 쓰기 → 목록 위 편집 칸');
    await p.fill('.cmn-e[data-cmne=new] [name=cmnT]', '새 학기 오리엔테이션'); await p.locator('.cmn-e[data-cmne=new] .cmn-body').click(); await p.keyboard.type('3월 2일 10시'); await p.click('.cmn-e[data-cmne=new] [data-act=cmn-save]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => { const L = cmAllNotices().filter(x => !x.n.pin); return L[0] && L[0].n.title === '새 학기 오리엔테이션'; }), '② 새 공지는 고정 아닌 공지 맨 위');
    /* ③ 순서 */
    const ord0 = await p.evaluate(() => cmAllNotices().map(x => x.n.id));
    await p.evaluate(() => { const b = document.querySelector('[data-act=cmn-mv][data-v=nA][data-d="1"]'); b.click(); }); await p.waitForTimeout(150);
    const ord1 = await p.evaluate(() => cmAllNotices().map(x => x.n.id)); const iA0 = ord0.indexOf('nA'), iA1 = ord1.indexOf('nA');
    ok(iA1 === iA0 + 1, `③ ↓ 버튼으로 한 칸 아래(${iA0} → ${iA1})`);
    const snapOrd = await p.evaluate(() => cmNoticeSnap().map(n => n.id)); ok(JSON.stringify(snapOrd.slice(0, ord1.length)) === JSON.stringify(ord1), '③ 학습자 공지 순서 = 운영자 순서');
    const src = p.locator('[data-cmn] li[data-nid=nB]'); const firstU = await p.evaluate(() => cmAllNotices().find(x => !x.n.pin).n.id); const dst = p.locator(`[data-cmn] li[data-nid="${firstU}"]`);
    await src.dragTo(dst); await p.waitForTimeout(200);
    ok(await p.evaluate(() => cmAllNotices().find(x => !x.n.pin).n.id === 'nB'), '③ 끌어 놓기로 맨 위(고정 아닌 공지 중)');
    await p.click('[data-act=cmn-pin][data-v=nB]'); await p.waitForTimeout(100); ok(await p.evaluate(() => cmAllNotices()[0].n.id === 'nB' && cmAllNotices()[0].n.pin), '③ 상단 고정 → 맨 위');
    const tB = await p.evaluate(() => cmAllNotices().filter(x => x.n.pin).length); const pinAndUn = await p.evaluate(() => { const L = cmAllNotices(); const i = L.findIndex(x => !x.n.pin); return [L[i - 1].n.id, L[i].n.id]; });
    await p.evaluate(id => { const b = document.querySelector(`[data-act=cmn-mv][data-v="${id}"][data-d="-1"]`); if (b) b.click(); }, pinAndUn[1]); await p.waitForTimeout(100);
    ok(await p.evaluate(n => cmAllNotices().filter(x => x.n.pin).length === n, tB), '③ 고정/일반 경계는 넘지 않음');

    /* ④ 게시판 */
    await view(p, 'community', "UI.comB='boards'"); await p.click('#main [data-act=cm-board-new]'); await p.waitForTimeout(150);
    await p.click('#modal [data-btpl=file]'); await p.fill('#modal [name=n]', '1학년 자료실'); await p.click('#modal [data-bp=cls]'); await p.waitForTimeout(100); console.log('   공개 대상 칸:', await p.evaluate(() => document.querySelectorAll('#modal [data-bid]').length + ' / ' + S.classes.length)); await p.locator('#modal input[data-bid]').first().check(); await p.click('#modal [data-mact=ok]'); await p.waitForTimeout(150);
    const nb = await p.evaluate(() => S.boards.find(b => b.name === '1학년 자료실')); if (SH) { await view(p, 'community', "UI.comB='boards'"); await shot(p, 'F3_게시판관리'); await p.click('#main [data-act=cm-board-new]'); await p.waitForTimeout(150); await p.click('#modal [data-btpl=qa]'); await shot(p, 'F4_게시판만들기'); await p.evaluate(() => closeModal()); } ok(nb && nb.write === 'admin' && nb.cmt === false && nb.file === true && nb.perm.type === 'cls' && nb.perm.ids.length === 1 && nb.type === 'file', '④ 자료실 틀: 운영자만 · 댓글 끔 · 첨부 켬 · 특정 교과목 공개');
    await view(p, 'community', "UI.comB='boards'"); const bi0 = await p.evaluate(() => S.boards.findIndex(b => b.name === 'Q&A'));
    await p.evaluate(() => document.querySelector(`[data-act=cmb-mv][data-v="${S.boards.find(b => b.name === 'Q&A').id}"][data-d="-1"]`).click()); await p.waitForTimeout(100);
    ok(await p.evaluate(i => S.boards.findIndex(b => b.name === 'Q&A') === i - 1, bi0), '④ 게시판 ↑ 순서 변경');
    const qa = await p.evaluate(() => S.boards.find(b => b.name === 'Q&A').id); const fr = await p.evaluate(() => S.boards.find(b => b.name === '자유게시판').id);
    await p.locator(`[data-cmb] li[data-bid="${qa}"]`).dragTo(p.locator('[data-cmb] li[data-bid="커뮤니티"]')); await p.waitForTimeout(150);
    ok(await p.evaluate(qa => S.boards[0].id === qa, qa), '④ 게시판 끌어서 맨 앞으로');
    const dn = await p.evaluate(() => S.boards.find(b => b.name === '학과 공지').id);
    await view(p, 'community', `UI.comB='커뮤니티';UI.cm_board='${dn}'`); await p.click('#main [data-act=cm-apost]'); await p.waitForTimeout(100); await p.fill('#modal [name=t]', '컴퓨터공학과 간담회'); await p.fill('#modal [name=b]', '11월 20일 공학관'); await p.check('#modal [name=pin]'); await p.click('#modal [data-mact=ok]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => S.posts.some(x => x.who === 'admin' && x.title === '컴퓨터공학과 간담회' && x.pin)), '④ 운영자 글쓰기(학과 공지 · 고정)'); await shot(p, 'F5_게시판_학과공지');
    const snap = await p.evaluate(() => cmCommSnap()); const sb = snap.boards.find(b => b.id === dn); ok(sb && sb.write === 'admin' && sb.cmt === false && sb.desc, '④ 학습자 공개본: 쓰기 권한 · 댓글 · 설명');
    ok(snap.posts.some(x => x.board === dn && x.admin && x.nick && x.pin), '④ 학습자 공개본: 운영자 글 · 고정');
    const code = await p.evaluate(() => { try { const c = lxDemo(); (typeof smPublish === 'function' ? smPublish : ACT['ls-pub'])(); return c; } catch (e) { return 'ERR ' + e.message; } }); if (typeof code === 'string') { console.log('   ', code); } await p.waitForTimeout(200); const pm = await p.$('#modal [data-mact=ok]'); if (pm) await pm.click();
    await p.evaluate(() => { cmPub(); save(); }); const tid = await p.evaluate(() => DREG.cur());

    /* 학습자 */
    const lp = await ctx.newPage(); lp.on('pageerror', e => errs.push('ln: ' + e.message)); lp.on('dialog', d => d.accept()); await lp.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await lp.goto(base + `learner.html?t=${tid}#notice`); await lp.waitForFunction(() => window.LR && LR.site).catch(() => { }); await lp.waitForTimeout(500);
    const nh = await lp.evaluate(() => { const d = [...document.querySelectorAll('#lm details')].find(x => /수강 정정 안내/.test(x.textContent)); return d ? d.innerHTML : ''; });
    ok(/<b>정정 기간은\s*<\/b>/.test(nh) && /<li>학과 사무실 방문<\/li>/.test(nh) && /href="https:\/\/example\.ac\.kr\/notice"/.test(nh), '② 학습자 공지에 굵게 · 목록 · 링크'); if (SH) { await lp.evaluate(() => { const d = [...document.querySelectorAll('#lm details')].find(x => /수강 정정 안내/.test(x.textContent)); if (d) d.open = true; }); await shot(lp, 'L1_공지'); }
    if (code) { await lp.evaluate(async c => { await LR.api.login(c.sid, c.code); lrender(); }, code); await lp.waitForTimeout(400); if (await lp.evaluate(() => location.hash === '#consent')) { await lp.check('#lcConsent [data-cn=all]'); await lp.click('#lcConsent button[type=submit]'); await lp.waitForTimeout(500); } }
    await lp.evaluate(h => { location.hash = h; }, '#comm/' + encodeURIComponent(dn)); await lp.waitForTimeout(400);
    const L1 = await lp.evaluate(() => ({ tabs: [...document.querySelectorAll('#lm .lctabs a')].map(a => a.textContent.trim()), write: !!document.querySelector('#lm a[href^="#write/b:"]'), ro: !!document.querySelector('#lm .lcro'), desc: /학과 공지/.test((document.querySelector('#lm .sub h1') || {}).textContent || '') && /전공 소식/.test((document.querySelector('#lm .sub') || {}).textContent || ''), post: /컴퓨터공학과 간담회/.test(document.querySelector('#lm').textContent) }));
    ok(L1.tabs[0] === '공지사항' && L1.tabs.includes('학과 공지') && L1.tabs.includes('Q&A'), '④ 학습자 게시판 메뉴: ' + L1.tabs.join(' · '));
    ok(L1.post && L1.desc, '④ 학습자: 운영자 글 · 게시판 이름 · 설명(머리)'); await shot(lp, 'L2_학과공지');
    if (code) { ok(!L1.write && L1.ro, '④ 운영자만 쓰기 게시판: 학습자 글쓰기 버튼 없음');
      const pid = snap.posts.find(x => x.board === dn).id; await lp.evaluate(h => { location.hash = h; }, '#post/' + encodeURIComponent(pid)); await lp.waitForTimeout(300); ok(!(await lp.$('#lcC')), '④ 댓글 끔: 댓글 칸 없음');
      await lp.evaluate(h => { location.hash = h; }, '#write'); await lp.waitForTimeout(300); const opts = await lp.$$eval('#lcW [name=board] option', o => o.map(x => x.textContent)); ok(!opts.includes('학과 공지') && !opts.includes('자료실') && opts.includes('Q&A'), '④ 글쓰기 게시판 고르기: 쓸 수 있는 게시판만 — ' + opts.join(' · '));
      await lp.selectOption('#lcW [name=board]', { label: 'Q&A' }); await lp.waitForTimeout(100); ok(await lp.evaluate(() => document.querySelector('#lcWKind').hidden), '④ Q&A 게시판: 카테고리 고르기 숨김(질문으로 저장)'); await shot(lp, 'L3_글쓰기');
      await lp.fill('#lcW [name=body]', '중간고사 범위가 궁금합니다'); await lp.click('#lcW button[type=submit]'); await lp.waitForTimeout(300);
      /* ⑤ LPX */
      await p.evaluate(() => { lpxPull(); render(); }); const got = await p.evaluate(qa => S.posts.find(x => /중간고사 범위/.test(x.body || '')), qa);
      ok(got && got.board === qa && got.kind === '질문', '⑤ 학습자 글 → 운영자 Q&A에 질문으로 반영');
      const r = await p.evaluate(dn => { const m = S.members.find(x => x.sid); const n0 = S.posts.length; LPX['post-new']({ who: m.sid, at: new Date().toISOString(), data: { id: 'poX1', board: dn, body: '권한 밖 글', files: [{ name: 'a.txt', size: 1 }] } }); const p2 = S.posts.find(x => x.id === 'poX1'); const pid = S.posts.find(x => x.board === dn).id; LPX['post-cmt']({ who: m.sid, data: { post: pid, id: 'cmX1', body: '댓글 시도' } }); const pp = S.posts.find(x => x.id === pid); return { moved: p2 && p2.board !== dn, cmt: Array.isArray(pp.replies) && pp.replies.some(c => c.id === 'cmX1') }; }, dn);
      ok(r.moved, '⑤ 운영자만 쓰기 게시판으로 온 학습자 글 → 쓸 수 있는 게시판으로'); ok(!r.cmt, '⑤ 댓글 끔 게시판 댓글 거절'); }
    else ok(false, '학습자 접근코드(lxDemo) 없음 — 로그인 단계 건너뜀');

    /* ⑥ 마이그레이션 반복 안전 */
    const mg = await p.evaluate(() => { S.boards = [{ id: '커뮤니티', name: '커뮤니티', perm: { type: 'all', ids: [] }, sys: true }, { id: '게시판', name: '게시판', perm: { type: 'all', ids: [] }, sys: true }]; delete S.bdV; S.notices.forEach(n => delete n.ord); S.classes.forEach(c => (c.notices || []).forEach(n => delete n.ord));
      upgradeState(S); const a = JSON.stringify([S.boards, cmAllNotices().map(x => [x.n.id, x.n.ord])]); upgradeState(S); cmEnsure(); const b = JSON.stringify([S.boards, cmAllNotices().map(x => [x.n.id, x.n.ord])]); return { same: a === b, names: S.boards.map(x => x.name), allOrd: cmAllNotices().every(x => typeof x.n.ord === 'number') }; });
    ok(mg.same && mg.allOrd && mg.names.includes('자유게시판') && mg.names.includes('학과 공지'), '⑥ upgradeState 두 번 → 같은 결과: ' + mg.names.join(' · '));
    await ctx.close();
  } catch (e) { console.error(e); fails++; } finally { await br.close(); srv.close(); }
  ok(!errs.length, '페이지 오류 0 ' + errs.slice(0, 5).join(' | '));
  console.log(fails ? `✗ 실패 ${fails}` : '✓ 모두 통과'); process.exit(fails ? 1 : 0); })();
