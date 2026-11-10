'use strict';
/* v38 대학 학사 LMS(univ · ed='lms') 실사용 QA(UL #1~#17) 회귀 점검.
   ① #4 빈 스튜디오: 학기만 있고 교과목 · 분반 · 구성원 · 강의실 · 출결 · 달력 · 접속 기록 샘플 없음 / #13 업무 메뉴(학생 · 사이트 · 과제 · 강의실) 켜짐
   ② #2 · #10 학번 등록(접근코드) 한 번 → 학사 구성원(학과명 → 학과) → 수강 등록 바로 성공, 엑셀(구성원) 학과 이름 · 접근코드 함께 발급, 순서 안내
   ③ #3 분반 개설 → 15주 강의실 자동 생성 · 분반 관리 「강의실 열기」 / #9 수강생 0명 분반도 과제 · 성적 목록에 보임
   ④ #6 새 시험: 문제은행이 비어도 창이 닫히지 않고(입력 보존) 직접 입력한 문항으로 출제
   ⑤ #5 교수 화면: 다른 교수 분반 목록 · 직접 조회 차단, 홈 「내 분반」 숫자 = 학기 · 강좌 / #8 AI SAM 교과목 → 학기 · 강좌 교과목(일반 과정 아님)
   ⑥ #7 학사 일정 · 강의 게시판 공지 → 게시 → 학습자 캘린더 · 공지 / #1 학습자(웹 1280 · 앱 390) 과제 · 시험 · 성적 · 출석 · 강의실 진입
   ⑦ #11 · #12 학습자 화면에서 진단 · 배지 · 디지털북 · 결제 · 튜토리얼 · 강좌 둘러보기 숨김, #14 기관명 'e클래스' 그대로, #16 게시 전 콘솔 오류 0, #17 조교 표시
   ⑧ 샘플(빈 스튜디오 끔) 기관: 과제 · 성적 분반 = 학기 · 강좌 분반, 학습자 샘플 학번이 #lms에 들어감, 오류 0
   사용: node tests/ui/lms38.js  (SHOTS=폴더 를 주면 화면을 찍는다) */
const path = require('node:path'); const fs = require('node:fs'); const http = require('node:http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const SH = process.env.SHOTS || '';
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const shot = async (pg, n, full) => { if (!SH) return; fs.mkdirSync(SH, { recursive: true }); await pg.screenshot({ path: path.join(SH, n + '.png'), fullPage: !!full }); };
const txt = (p, sel = '#lm') => p.evaluate(s => ((document.querySelector(s) || document.body).innerText || '').replace(/\s+/g, ' '), sel);
const go = async (p, h, w = 1000) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(w); };

(async () => {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MT[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const br = await chromium.launch(); const errs = [];
  const watch = (p, tag) => { p.on('pageerror', e => errs.push(`[${tag}] ${e.message}`)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::ERR|Content Security Policy/.test(m.text())) errs.push(`[${tag} console] ${m.text().slice(0, 200)}`); }); p.on('dialog', d => d.accept()); };
  async function mkOrg(empty) { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const op = await ctx.newPage(); watch(op, empty ? '빈 운영자' : '샘플 운영자'); await op.goto(base + 'index.html'); await op.waitForFunction(() => typeof createOrg === 'function');
    await op.evaluate(e => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', e ? '1' : '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = e; createOrg('univ', '해운대대학교 e클래스', 'lms'); }, empty);
    await op.waitForTimeout(1300); await op.evaluate(() => { try { closeModal(); } catch (e) { } }); return { ctx, op }; }
  const publish = async op => { await op.evaluate(() => { (typeof smPublish === 'function' ? smPublish : ACT['ls-pub'])(); }); await op.waitForTimeout(300); const pm = await op.$('#modal [data-mact=ok]'); if (pm) await pm.click(); await op.waitForTimeout(300); };
  async function learner(ctx, op, sid, code, { app = false, w = 1280, hash = '#login' } = {}) { const p = await ctx.newPage(); await p.setViewportSize({ width: w, height: app ? 844 : 900 }); watch(p, `학습자 ${sid || '게스트'}${app ? ' 앱' : ''}`);
    await p.addInitScript(a => { try { if (a) localStorage.removeItem('didisam.app.classic'); else localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } }, app);
    const tid = await op.evaluate(() => DREG.cur()); await p.goto(base + `learner.html?t=${encodeURIComponent(tid)}${app ? '&app=1' : ''}${hash}`); await p.waitForFunction(() => typeof LR === 'object' && LR.site).catch(() => {}); await p.waitForTimeout(600);
    if (sid) { const det = await p.$('details.la-code'); if (det && (await det.getAttribute('open')) === null) await p.click('details.la-code summary').catch(() => {});
      await p.fill('#li [name=sid]', sid); await p.fill('#li [name=code]', code); await p.click('#li button[type=submit]'); await p.waitForTimeout(1000);
      if (/consent/.test(await p.evaluate(() => location.hash))) { for (const b of await p.$$('input[type=checkbox]')) { if (await b.isVisible() && !(await b.isChecked())) await b.check().catch(() => {}); } const btn = await p.$('text=동의하고 시작하기'); if (btn) { await btn.click(); await p.waitForTimeout(800); } }
      const pk = await p.$('text=기본 선생님으로 시작'); if (pk) { await pk.click(); await p.waitForTimeout(500); } }
    return p; }

  /* ═════════ A. 빈 스튜디오 ═════════ */
  const { ctx, op } = await mkOrg(true);
  const E0 = await op.evaluate(() => { const A = lmsaEns(); const n = k => { try { return k(); } catch (e) { return 'ERR ' + e.message; } };
    return { terms: A.terms.length, courses: A.courses.length, sections: A.sections.length, persons: A.persons.length, units: A.units.length, req: A.staff.length + A.enr.length, rooms: LMSX.db().sections.length, w3: W3.D().sections.length,
      cal: n(() => LMP.demo.l['cal.list']({}).items.length), tree: LMSNAV.tree().map(g => g.k), on: ['lmse', 'lmsb', 'members', 'enroll', 'site', 'lmsf', 'lmsg'].filter(id => menuOn(id)) }; });
  ok(E0.terms === 1 && E0.courses === 0 && E0.sections === 0 && E0.persons === 0 && E0.units === 0 && E0.req === 0, `#4 빈 학사: 학기 1 · 교과목 0 · 분반 0 · 구성원 0 · 조직 0 · 신청 0 (${JSON.stringify(E0).slice(0, 120)})`);
  ok(E0.rooms === 0 && E0.w3 === 0 && E0.cal === 0, `#4 빈 강의실 0 · 출결 분반 0 · 달력 일정 0 (${E0.rooms}/${E0.w3}/${E0.cal})`);
  ok(['g-people', 'g-site'].every(k => E0.tree.includes(k)) && E0.on.length === 7, `#13 업무 메뉴: 학생 · 사이트 공간, 과제 · 강의실 · 학생 명단 켜짐 (${E0.tree.join(',')} / ${E0.on.join(',')})`);
  await op.evaluate(() => go('lmse')); await op.waitForTimeout(700);
  ok(/개설된 분반이 없습니다/.test(await txt(op, '#main')) && !/회계원리|경영학원론|1차시 보고서/.test(await txt(op, '#main')), '#4 빈 과제 화면: 샘플 분반 · 과제 없이 「개설된 분반이 없습니다」 안내');
  for (const v of ['grade', 'lmsj', 'lmsg', 'lmsb', 'lmsl-cal', 'lmsm']) { await op.evaluate(v => go(v), v); await op.waitForTimeout(600); const t = await txt(op, '#main'); ok(!/데이터와 인공지능 기초|프로그래밍 기초|자료구조|경영정보시스템|2026900[1-9]|간호학 개론/.test(t), `#4 빈 ${v}: 학사 샘플이 섞이지 않음`); }

  /* 교과목 · 분반(학기 · 강좌 화면의 개설 창) */
  const term = await op.evaluate(() => lmsaEns().terms[0].term_id);
  await op.evaluate(() => { lmsaDemo('course', { course_code: 'GEN2101', name: 'AI와 데이터 리터러시', credits: 3, category: 'general' }); go('lmsa'); }); await op.waitForTimeout(500);
  await op.evaluate(() => ACT['lmsa-sec-new']()); await op.waitForTimeout(300);
  await op.fill('#modal [name=section_no]', '1'); await op.selectOption('#modal [name=mode]', 'blended'); await op.fill('#modal [name=capacity]', '40'); await op.click('#modal [data-mact=ok]'); await op.waitForTimeout(600);
  const S1 = await op.evaluate(() => { const s = lmsaEns().sections[0]; const r = LMSX.db().sections.find(x => x.lmsa === s.section_id); return { sid: s && s.section_id, room: r && r.title, weeks: r ? LMSX.db().weeks.filter(w => w.sec === r.id).length : 0, ses: W3.D().sessions.filter(x => x.section_id === (s && s.section_id)).length }; });
  ok(!!S1.sid && S1.room === 'AI와 데이터 리터러시(01)' && S1.weeks === 15 && S1.ses === 15, `#3 분반 개설 → 15주 강의실 · 출결 차시 15개 자동 생성 (${JSON.stringify(S1)})`);
  await op.evaluate(sid => ACT['lmsa-sec-open']({ dataset: { v: sid } }), S1.sid); await op.waitForTimeout(300);
  ok(!!(await op.$('#modal [data-act=lmsa-room]')), '#3 분반 관리 창에 「강의실 열기」');
  await op.click('#modal [data-act=lmsa-room]'); await op.waitForTimeout(900);
  ok(/AI와 데이터 리터러시\(01\)/.test(await txt(op, '#main')), '#3 「강의실 열기」 → 그 분반의 강의실(주차 구성)');
  await op.evaluate(() => go('lmse')); await op.waitForTimeout(700);
  ok(/AI와 데이터 리터러시 01분반/.test(await txt(op, '#main')), '#9 수강생 0명 분반도 과제 화면 분반 목록에 보임');

  /* 학번 등록 한 번 → 수강 등록 */
  await op.evaluate(() => go('enroll')); await op.waitForTimeout(500);
  await op.fill('#enL', '20261101, 컴퓨터공학과\n20261102, 컴퓨터공학과\n20261103, 간호학과\n20261105, 컴퓨터공학과'); await op.click('[data-act=en-codes]'); await op.waitForTimeout(500);
  const P = await op.evaluate(() => { const A = lmsaEns(); return { p: A.persons.map(p => p.member_no + ':' + ((A.units.find(u => u.unit_code === p.unit_code) || {}).name || '')).sort(), bcd: LMSX.db().persons.length }; });
  ok(P.p.length === 4 && P.p.includes('20261103:간호학과') && P.p.includes('20261101:컴퓨터공학과'), `#2 · #10 학번 등록 = 학사 구성원, 학과명은 학과로 이어짐 (${P.p.join(' ')})`);
  await op.evaluate(() => go('lmsa')); await op.waitForTimeout(400); await op.evaluate(() => { UI.lmsaT = 'enr'; render(); }); await op.waitForTimeout(500);
  if (!(await op.$('#lmsaBulk'))) { await op.evaluate(() => { const b = [...document.querySelectorAll('[data-act=tab][data-key=lmsaT]')].find(x => /수강/.test(x.textContent)); if (b) b.click(); }); await op.waitForTimeout(500); }
  await op.fill('#lmsaBulk', '20261101 20261102 20261103'); await op.click('[data-act=lmsa-bulk]'); await op.waitForTimeout(500);
  const toastE = await op.evaluate(() => [...document.querySelectorAll('.toast, #toast, .tst')].map(t => t.textContent).join(' / '));
  ok(/등록 3명/.test(toastE) && !/등록되지 않은 학번/.test(toastE), `#2 학번 등록한 학생 3명이 바로 수강 등록됨 (${toastE.slice(0, 80)})`);
  const bulk2 = await op.evaluate(sid => lmsaDemo('enroll', { section_id: sid, member_nos: ['20269999'] }), S1.sid);
  ok(bulk2.errors.length === 1, '#2 등록 안 된 학번은 오류로 남음(안내 문구는 화면에서 덧붙임)');
  const imp = await op.evaluate(t => { const r = lmsaDemo('import', { kind: 'person', csv: '학번,구분,학과코드\n20262001,학생,디자인학과\n20262002,학생,컴퓨터공학과\n', apply: true }); const A = lmsaEns(); return { codes: r.codes, ok: r.ok, units: A.units.map(u => u.name).join(','), sc: S.codes.some(c => c.sid === '20262001') }; }, term);
  ok(imp.ok === 2 && imp.codes === 2 && imp.sc && /디자인학과/.test(imp.units), `#2 · #10 구성원 엑셀: 학과 이름 허용(새 학과 생성) · 학생 접근코드 함께 발급 (${JSON.stringify(imp)})`);
  await op.evaluate(() => { go('lmsa'); UI.lmsaT = 'imp'; UI.lmsaImp = 'enrollment'; render(); }); await op.waitForTimeout(400);
  ok(/① 구성원.*② 교과목 · 분반.*③ 수강/.test(await txt(op, '#main')) || await op.evaluate(() => !!document.querySelector('.lmsa-steps')), '#2 엑셀 올리기: 올리는 순서(구성원 → 교과목 · 분반 → 수강) 안내');
  await op.evaluate(sid => { lmsaDemo('staff', { section_id: sid, member_no: 'P0001', role: 'professor' }); lmsaDemo('staff', { section_id: sid, member_no: '20261105', role: 'ta' }); }, S1.sid);
  const R2 = await op.evaluate(() => { const r = LMSX.db().sections[0]; return { en: r.enroll.filter(e => e.status === 'enrolled').length, st: Object.values(r.staff).sort().join(','), w3: W3.D().persons.filter(p => p.secs.length).length }; });
  ok(R2.en === 3 && R2.st === 'professor,ta' && R2.w3 === 3, `#1 강의실 · 출결 구성원 = 학사 수강생 · 담당 (${JSON.stringify(R2)})`);

  /* 새 시험: 문제은행이 비어도 */
  await op.evaluate(() => { go('lmsf'); }); await op.waitForTimeout(800);
  await op.evaluate(() => ACT['lmsf-exam']({ dataset: { v: '' } })); await op.waitForTimeout(300);
  await op.fill('#modal [name=t]', '중간고사'); await op.selectOption('#modal [name=st]', 'published'); await op.click('#modal [data-mact=ok]'); await op.waitForTimeout(400);
  const keep = await op.evaluate(() => ({ open: !!document.querySelector('#modal'), t: (document.querySelector('#modal [name=t]') || {}).value }));
  ok(keep.open && keep.t === '중간고사', `#6 문항 없이 공개 저장 → 창이 열린 채 안내, 입력 보존 (${JSON.stringify(keep)})`);
  await op.fill('#modal [name=qx]', '데이터의 최소 단위는? | 비트; 바이트; 워드 | 1\n대한민국의 수도는? | | 서울\n데이터 리터러시가 중요한 이유를 쓰세요.'); await op.click('#modal [data-mact=ok]'); await op.waitForTimeout(900);
  const EX = await op.evaluate(sid => { const X = S.lms.efh; const x = X.exams.find(e => e.section_id === sid); return { closed: !document.querySelector('#modal'), fixed: x ? x.fixed.length : 0, st: x && x.status, kinds: x ? x.fixed.map(id => (X.qs.find(q => q.q_id === id) || {}).kind).join(',') : '' }; }, S1.sid);
  ok(EX.closed && EX.fixed === 3 && EX.st === 'published' && EX.kinds === 'single,short,essay', `#6 직접 입력 문항으로 시험 저장(문제은행 자동 생성) (${JSON.stringify(EX)})`);

  /* 과제 · 학사 일정 · 강의 공지 */
  await op.evaluate(async sid => { await EFH.call('POST', '/api/lms/e/save', { section: sid, section_id: sid, title: '1주차 과제', status: 'published', due_at: new Date(Date.now() + 5 * 864e5).toISOString() }); }, S1.sid);
  const ymd = await op.evaluate(() => { const d = new Date(Date.now() + 3 * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await op.evaluate(d => { LMP.demo.l['cal.add']({ scope: 'academic', title: '중간고사 기간', kind: 'exam', starts_at: d + 'T09:00', all_day: true }); const r = LMSX.db().sections[0]; LMSX.notice(r.id, '1주차 수업 안내', '강의실에서 1주차 자료를 확인하세요.', '', { pid: null, label: '교수자' }); save(); }, ymd);
  /* AI SAM 교과목(학사) */
  const AI = await op.evaluate(() => { const n0 = S.classes.length; const k = makeCourse({ topic: '데이터베이스', weeks: 15 }); const A = lmsaEns(); const c = A.courses.find(x => x.name === '데이터베이스'); return { cls: S.classes.length - n0, course: !!c, sec: !!(c && A.sections.some(s => s.course_code === c.course_code)), id: k.id }; });
  ok(AI.cls === 0 && AI.course && AI.sec, `#8 AI SAM 교과목 만들기(학사 LMS) → 학기 · 강좌 교과목 + 01분반, 일반 과정 0 (${JSON.stringify(AI)})`);

  /* 교수 화면 */
  await op.evaluate(() => { S.me.role = 'teacher'; save(); go('lmse'); }); await op.waitForTimeout(800);
  const TC = await op.evaluate(async () => { const opts = [...document.querySelectorAll('#main select[data-chg=lmse-sec] option')].map(o => o.textContent); let blocked = ''; const other = lmsaEns().sections.find(s => !lmsaEns().staff.some(t => t.section_id === s.section_id && t.member_no === 'P0001'));
    try { await EFH.call('GET', '/api/lms/e/list', { section: other.section_id }); blocked = 'no'; } catch (e) { blocked = e.message; } return { opts, blocked }; });
  ok(TC.opts.length === 1 && /AI와 데이터 리터러시/.test(TC.opts[0]) && /담당 분반이 아닙니다/.test(TC.blocked), `#5 교수 화면: 내 담당 분반만 · 다른 분반 직접 조회 차단 (${TC.opts.join('|')} / ${TC.blocked})`);
  await op.evaluate(() => go('home')); await op.waitForTimeout(900);
  ok(/내 분반 1개/.test(await txt(op, '#main')), '#5 교수 홈 「내 분반」 숫자 = 학기 · 강좌 담당 분반');
  await op.evaluate(() => { S.me.role = 'owner'; save(); go('members'); }); await op.waitForTimeout(700);
  ok(!(await op.evaluate(() => [...document.querySelectorAll('#main th')].some(th => /진단/.test(th.textContent) && th.offsetParent))), '#11 학생 명단에 AI 진단 열 없음');
  await shot(op, 'lms38_admin_lmsa');
  await publish(op);
  const codes = await op.evaluate(() => Object.fromEntries(S.codes.map(c => [c.sid, c.code])));
  const snap = await op.evaluate(() => { const s = S.lsite && S.lsite.pub; return { cal: ((s && s.calx) || []).filter(e => e.kind === '학사 일정').length, nt: ((s && s.notices) || []).filter(n => /1주차 수업 안내/.test(n.title)).length }; });
  ok(snap.cal === 1 && snap.nt === 1, `#7 게시본에 학사 일정 · 강의 공지 포함 (${JSON.stringify(snap)})`);

  /* ═════════ B. 학습자 ═════════ */
  for (const [app, w] of [[false, 1280], [true, 390]]) { const tag = app ? '앱 390' : '웹 1280';
    const g = await learner(ctx, op, '20261101', codes['20261101'], { app, w });
    await go(g, '#lms', 1500); const L1 = await txt(g);
    ok(/AI와 데이터 리터러시 01분반/.test(L1) && /1주차 과제/.test(L1) && !/수강 분반이 없습니다/.test(L1), `#1 [${tag}] #lms 과제 · 시험 · 성적에 수강 분반 · 과제가 보임`);
    const tb = await g.$('#lm [data-lact=efl-tab][data-v=exam]'); if (tb) { await tb.click(); await g.waitForTimeout(700); } ok(/중간고사/.test(await txt(g)), `#1 [${tag}] 시험 탭에 중간고사`);
    const gt = await g.$('#lm [data-lact=efl-tab][data-v=grade]'); if (gt) { await gt.click(); await g.waitForTimeout(700); } ok(!/학사 정보에 등록된 학번이 아닙니다|수강 중인 분반이 아닙니다/.test(await txt(g)), `#1 [${tag}] 성적 탭 진입`);
    await go(g, '#my', 1500); const M1 = await txt(g, 'body');
    ok(!/학사 정보에 등록된 학번이 아닙니다/.test(M1) && /이번 학기 강의실이 없습니다/.test(M1) === false && /AI와 데이터 리터러시\(01\)/.test(M1), `#1 [${tag}] 내 학습: 출석 · 강의실 카드 정상`);
    const bad = (M1.match(/진단하기|다음 배지까지|배지 지갑|내 디지털북|수준 로드맵|추천 튜토리얼|강좌 둘러보기|아직 수강 중인 강좌가 없/g) || []); ok(!bad.length, `#11 · #12 [${tag}] 내 학습에 진단 · 배지 · 디지털북 · 튜토리얼 · 빈 강좌 안내 없음 (${bad.join(',')})`);
    ok(!(await g.evaluate(() => [...document.querySelectorAll('#lm .lux-tabs a, #lm .lux-tabs button, #lm nav.mytab a')].some(a => a.offsetParent && /^(결제|디지털북|배지)$/.test(a.textContent.trim())))), `#11 [${tag}] 결제 · 디지털북 · 배지 탭 숨김`);
    ok(!/e교과목/.test(M1), `#14 [${tag}] 기관명 「e클래스」가 바뀌지 않음 (${(M1.match(/.{20}e교과목.{10}/) || [''])[0]})`);
    await go(g, '#home', 1300); const H1 = await txt(g, 'body'); ok(!/님, 반갑습니다|첫 강좌를 골라 보세요/.test(H1), `#12 [${tag}] 홈에 빈 이름 · 「첫 강좌를 골라 보세요」 없음`);
    await go(g, '#cal', 1300); ok(/중간고사 기간/.test(await txt(g, 'body')), `#7 [${tag}] 학습자 캘린더에 학사 일정`);
    await go(g, '#notice', 1200); ok(/1주차 수업 안내/.test(await txt(g, 'body')), `#7 [${tag}] 공지에 강의 게시판 공지`);
    const over = await g.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(over <= 1, `[${tag}] 가로 넘침 0 (${over})`);
    await go(g, '#my', 1200); await shot(g, `lms38_learner_${app ? 'app390' : 'web1280'}`, true);
    await g.close(); }
  const ta = await learner(ctx, op, '20261105', codes['20261105']); await go(ta, '#my', 1400);
  ok(/조교/.test(await txt(ta, '#lmsaMy')), '#17 조교로 지정된 학번: 수강 분반 카드에 「조교」 표시'); await ta.close();
  const nb = await learner(ctx, op, '20261103', codes['20261103'], { app: true, w: 390 }); await go(nb, '#lms', 1400); ok(/AI와 데이터 리터러시 01분반/.test(await txt(nb)), '#10 간호학과 학번(학과명 등록)도 학사 구성원으로 #lms 진입'); await nb.close();
  await ctx.close();

  /* #16 게시 전 학습자 페이지 */
  { const { ctx: c2, op: o2 } = await mkOrg(true); const n0 = errs.length; const p = await c2.newPage(); watch(p, '게시 전 학습자'); const tid = await o2.evaluate(() => DREG.cur()); await p.goto(base + `learner.html?t=${encodeURIComponent(tid)}#home`); await p.waitForTimeout(1500);
    ok(!errs.slice(n0).some(e => /lcal decorate|reading 'org'/.test(e)), '#16 게시 전 학습자 페이지: lcal 오류 없음'); await c2.close(); }

  /* ═════════ C. 샘플 기관(빈 스튜디오 끔) ═════════ */
  { const { ctx: c3, op: o3 } = await mkOrg(false);
    const SM = await o3.evaluate(() => { go('lmse'); const A = lmsaEns(); return { secs: A.sections.length, rooms: LMSX.db().sections.filter(r => r.lmsa).length, w3: W3.D().sections.length }; }); await o3.waitForTimeout(800);
    ok(SM.secs === 10 && SM.rooms === 9 && SM.w3 >= 10, `샘플: 학기 · 강좌 분반 → 강의실 · 출결 반영 (${JSON.stringify(SM)})`);
    ok(/AI 리터러시\(교양\) 01분반/.test(await txt(o3, '#main')), '샘플: 과제 화면 분반 = 학기 · 강좌 분반');
    await publish(o3); await o3.evaluate(() => { const c = S.codes.find(x => x.sid === '20261003') || (() => { document.body.insertAdjacentHTML('beforeend', '<textarea id="enL"></textarea>'); document.querySelector('#enL').value = '20261003, 컴퓨터공학과'; ACT['en-codes'](); return S.codes.find(x => x.sid === '20261003'); })(); return c; });
    await publish(o3); const code = await o3.evaluate(() => (S.codes.find(x => x.sid === '20261003') || {}).code);
    const g = await learner(c3, o3, '20261003', code); await go(g, '#lms', 1500); const t = await txt(g);
    ok(/분반/.test(t) && !/수강 분반이 없습니다|학사 정보에 등록된 학번이 아닙니다/.test(t), `샘플 학번 20261003: #lms 수강 분반 진입 (${t.slice(0, 80)})`);
    await c3.close(); }

  ok(!errs.length, `페이지 오류 0 (${errs.slice(0, 5).join(' / ')})`);
  await br.close(); srv.close();
  console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
