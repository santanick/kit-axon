'use strict';
/* 13차 MS Teams 연동 화면 — 외부 연결 카드(시연 · 운영) · 회의 링크(Zoom · Teams 나란히) · 출석 가져오기 · 자동화 단계 · Microsoft 로그인 버튼
   사용: node tests/ui/teams.js            (시연판: 정적 서버만)
         DATABASE_URL=postgresql://didisam:x@127.0.0.1:5640/didisam node tests/ui/teams.js   (운영 모드까지: Node 서버 + 모의 Microsoft — 실제 키 없음) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os'); const cp = require('node:child_process'); const crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.error('✗', m); } };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const studio = async (type, w = 1440) => { const p = await br.newPage({ viewport: { width: w, height: 1000 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(base + '/index.html'); await p.evaluate(async t => { createOrg(t, '점검 기관'); await new Promise(o => setTimeout(o, 60)); if (typeof slMenuSet === 'function') slMenuSet('conn', true); go('conn'); render(); }, type); await p.waitForTimeout(250); return { p, errs }; };

  /* ── 시연판(서버 없음) ── */
  { const { p, errs } = await studio('univ');
    const rows = await p.evaluate(() => [...document.querySelectorAll('.cx-row[data-v=teams]')].map(r => r.closest('.cx-grp').dataset.cat));
    ok(rows.includes('msg') && rows.includes('cal'), '카탈로그: Teams 줄이 메시지 · 일정 묶음에 모두 있음');
    ok(await p.evaluate(() => !!document.querySelector('.cx-row[data-v=teams] .brl svg')), 'Teams 줄: 공식 로고(SVG)');
    ok(await p.evaluate(() => /Microsoft Teams/.test(document.querySelector('.cx-hero h2').textContent)), '대학: 추천 문장에 Teams');
    await p.evaluate(() => ACT['sl-cn']({ dataset: { v: 'teams' } })); await p.waitForTimeout(150);
    ok(await p.evaluate(() => { const c = document.getElementById('cnCard-teams'); return !!c && !!c.querySelector('.cx-steps') && c.querySelectorAll('.tm-tabs [role=tab]').length === (['univ', 'corp'].includes(S.org.type) ? 5 : 4) && /받는 사람이 보는 모습/.test(c.textContent) && !!c.querySelector('details.cn-guide'); }), '카드: 3단계 · 탭 4개(v49.1 대학 · 기업은 「학습자 알림」 더해 5개 — L-noti-teams) · 단계 안내 · 미리보기');
    ok(await p.evaluate(() => cnStatus('teams').st) === '미연결', '처음 상태 = 미연결');
    await p.waitForTimeout(700); await p.fill('#tmChName', '교육운영'); await p.click('#cnCard-teams [data-act=tm-chadd]'); await p.waitForSelector('#cnCard-teams [data-act=tm-chtest]', { timeout: 5000 }).catch(() => { });
    ok(await p.evaluate(() => cnStatus('teams').st) === '연결됨', '시연 채널 추가 → 연결됨 ' + await p.evaluate(() => [(document.querySelector('#toasts') || {}).textContent, document.querySelectorAll('#tmChName').length, (document.getElementById('tmChName') || {}).value].join(' | ')));
    await p.click('#cnCard-teams [data-act=tm-chtest]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => /연결 시험/.test(document.getElementById('cnCard-teams').textContent)), '시험 → 최근 실행 기록(시연)');
    await p.evaluate(() => ACT['tm-tab']({ dataset: { v: 'org' } })); await p.waitForTimeout(80);
    await p.click('#cnCard-teams [data-act=tm-demo]'); await p.waitForTimeout(120);
    ok(await p.evaluate(() => /demo\.onmicrosoft\.com/.test(document.getElementById('cnCard-teams').textContent)), '조직: 시연으로 연결 → demo.onmicrosoft.com');
    for (const t of ['mt', 'sso']) { await p.evaluate(v => ACT['tm-tab']({ dataset: { v } }), t); await p.waitForTimeout(60); }
    ok(await p.evaluate(() => /서버에 Microsoft 앱 키가 설정된 뒤/.test(document.getElementById('cnCard-teams').textContent)), 'SSO 탭: 시연 로그인은 만들지 않음 안내');
    ok(await p.evaluate(() => cnAlias('팀즈 연결 도와줘') === 'teams' && cnAlias('Microsoft Teams') === 'teams'), 'AI SAM: 팀즈 · Microsoft 인식');
    ok(await p.evaluate(() => cnScrub('주소 https://prod-1.koreacentral.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke?api-version=1&sig=SeCrEt123').hit), 'AI SAM: 대화에 붙인 워크플로 주소(sig=)는 비밀값으로 가림');
    /* 자동화: Slack 단계가 돌 때 Teams로도 */
    const run = await p.evaluate(() => { cnSlackDemo(); UI.tmTab = 'ch'; const r = cnMake('join-notify'); const a = r && r.a; if (!a) return null; a.on = true; runAuto(a, true); const st = (S.runs[0] || {}).steps || []; return st.map(s => s.act + ':' + s.ok + ':' + s.msg); });
    ok(run && run.some(s => /^teams:true:.*Slack과 함께/.test(s)), 'Slack 알림 단계와 같은 지점에서 Teams로도(시연) ' + JSON.stringify(run));
    ok(await p.evaluate(() => CN_TPL.some(x => x.k === 'approval-teams') && CN_TPL.some(x => x.k === 'report-teams') && ACTION.teams === 'Microsoft Teams 채널 알림'), '자동화 단계 · 레시피 2종');
    /* 수업: 라이브 항목 편집기 → Teams 회의 만들기 → 출석 가져오기 → 반영 */
    await p.evaluate(() => { if ((S.classes || []).some(x => (x.learners || []).length >= 2)) return; /* 빈 기관: 학습자 3명 · 반 1개를 만든다 */
      while (S.members.length < 3) S.members.push({ id: uid('m'), name: '점검 학습자 ' + (S.members.length + 1), grade: '정회원', joined: today() });
      S.classes.push({ id: uid('c'), name: '점검 반', kind: 'period', sub: '', legal: false, level: 0, status: '운영중', price: 0, open: '전체', openTo: [], start: today(), end: addDays(today(), 60), teacher: '', group: '', learners: S.members.slice(0, 3).map(m => m.id), prog: {}, enr: {}, curriculum: [], criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: 'manual', skip: false, speed: true, early: false, community: 'class', hours: 1, notices: [], desc: '' }); save(); });
    const cid = await p.evaluate(() => { const c = S.classes.find(x => (x.learners || []).length >= 2) || S.classes[0]; if (!c.learners || c.learners.length < 2) c.learners = S.members.slice(0, 3).map(m => m.id); c.curriculum = c.curriculum || []; if (!c.curriculum.some(i => i.type === 'live')) c.curriculum.push({ id: 'itlive1', type: 'live', title: '실시간 Q&A', url: '', at: '2026-12-02T19:00' }); save(); return c.id; });
    const idx = await p.evaluate(c0 => C(c0).curriculum.findIndex(i => i.type === 'live'), cid);
    await p.evaluate(([c0, i]) => openEditor(C(c0), i), [cid, idx]); await p.waitForTimeout(150);
    ok(await p.evaluate(() => { const b = document.querySelector('#edBody .tm-mk'); return !!b && !!b.querySelector('[data-act=tm-zoom]') && !!b.querySelector('[data-act=tm-meet]'); }), '라이브 편집기: Zoom · Teams 회의 버튼 나란히');
    await p.click('#edBody [data-act=tm-meet]'); await p.waitForTimeout(120);
    ok(await p.evaluate(() => document.querySelector('#edBody [data-ed=url]').value === '/learner.html#live-demo' && !!ED.it.teams), 'Teams 시연 회의 → 라이브 주소 자동 입력');
    await p.click('#modal [data-mact=ok]'); await p.waitForTimeout(150);
    ok(await p.evaluate(([c0, i]) => !!(C(c0).curriculum[i].teams), [cid, idx]), '저장하면 반 항목에 Teams 회의 기록');
    await p.evaluate(c0 => { closeModal && closeModal(); UI.cls = c0; UI.clsT = 'curriculum'; go('class'); render(); }, cid); await p.waitForTimeout(250);
    const hasBtn = await p.evaluate(() => !!document.querySelector('[data-act=tm-att]'));
    ok(hasBtn, '반 화면: [Teams 출석 가져오기] 버튼');
    if (hasBtn) { await p.evaluate(() => document.querySelector('[data-act=tm-att]').click()); await p.waitForTimeout(150);
      ok(await p.evaluate(() => /제안/.test(document.body.textContent) && document.querySelectorAll('select[name^=tma-]').length >= 2), '출석 제안 표(시연 데이터)');
      const before = await p.evaluate(([c0, i]) => Object.keys((C(c0).att || {})[C(c0).curriculum[i].id] || {}).length, [cid, idx]);
      await p.click('#modal [data-mact=ok]'); await p.waitForTimeout(150);
      const after = await p.evaluate(([c0, i]) => Object.keys((C(c0).att || {})[C(c0).curriculum[i].id] || {}).length, [cid, idx]);
      ok(after > before || after >= 2, `[반영] → 출석부 저장(${before} → ${after})`); }
    /* 해제 */
    await p.evaluate(() => { go('conn'); render(); ACT['sl-cn']({ dataset: { v: 'teams' } }); }); await p.waitForTimeout(120);
    await p.evaluate(() => cnOff('teams')); await p.waitForTimeout(80); await p.click('#modal [data-mact=ok]'); await p.waitForTimeout(120);
    ok(await p.evaluate(() => cnStatus('teams').st) === '미연결', '연결 해제 → 미연결');
    ok(!errs.length, 'univ 오류 없음 ' + errs.join(' | ')); await p.close(); }
  { const { p, errs } = await studio('k12');
    ok(await p.evaluate(() => { const h = !/Microsoft Teams/.test(document.querySelector('.cx-hero h2').textContent); UI.cxCat = 'msg'; render(); return h && !!document.querySelector('.cx-row[data-v=teams]'); }), '학원(k12): 추천에는 없고 메시지 묶음 목록에는 있음');
    ok(!errs.length, 'k12 오류 없음'); await p.close(); }
  { const { p, errs } = await studio('corp', 390);
    await p.evaluate(() => ACT['sl-cn']({ dataset: { v: 'teams' } })); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '390px: Teams 시트 가로 넘침 없음');
    ok(await p.evaluate(() => [...document.querySelectorAll('#cnCard-teams .tm-tabs button')].every(e => e.getBoundingClientRect().height >= 36)), '390px: 탭 누르는 칸 36px 이상');
    ok(!errs.length, '390 오류 없음'); await p.close(); }

  /* ── 운영 모드(실제 Node 서버 + 모의 Microsoft) ── */
  if (process.env.DATABASE_URL) {
    const SVC = path.resolve(__dirname, '../../service'); const PUB = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpub-'));
    cp.execFileSync(process.execPath, ['build-public.js', ROOT, PUB], { cwd: SVC, stdio: 'ignore' });
    const hooks = [];
    const mock = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => { if (/\/workflows\//.test(q.url)) { hooks.push(JSON.parse(b || '{}')); r.writeHead(202); return r.end(); } r.writeHead(404); r.end(); }); }).listen(0, '127.0.0.1');
    await new Promise(o => mock.once('listening', o)); const MU = `http://127.0.0.1:${mock.address().port}`;
    const { poolFrom, migrate } = require(path.join(SVC, 'server/db')); const { createApp } = require(path.join(SVC, 'server/app'));
    const pool = poolFrom(process.env); await migrate(pool);
    const app = createApp({ pool, publicDir: PUB, env: { COOKIE_SECURE: '0', MFA_OFF: '1', PII_KEY: crypto.randomBytes(32).toString('hex'), OAUTH_MOCK_URL: MU, TEAMS_WEBHOOK_TEST: '1', TEAMS_GAP_MS: '10', TEAMS_PILOT: 'all', MS_CLIENT_ID: 'ms-ui', MS_CLIENT_SECRET: 's', NEW_DEVICE_MAIL: 'off' }, log: {} });
    await new Promise(o => app.listen(0, '127.0.0.1', o)); const U = `http://127.0.0.1:${app.address().port}`;
    const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(U + '/index.html'); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !!document.querySelector('a.lvsb.ms[href="/api/oauth/microsoft/start"]') && /Microsoft로 계속하기/.test(document.body.textContent)), '운영자 로그인: 키가 있으면 「Microsoft로 계속하기」');
    const em = `tmui${Date.now().toString(36)}@a.kr`;
    const su = await p.evaluate(async em => { const r = await fetch('/api/signup', { method: 'POST', headers: { 'content-type': 'application/json', 'x-didisam': '1' }, body: JSON.stringify({ email: em, password: 'Passw0rd-aaa', orgName: '운영 점검 대학', type: 'univ' }) }); return r.status; }, em);
    ok(su === 200, '운영: 가입 ' + su);
    await p.goto(U + '/index.html'); await p.waitForFunction(() => typeof S === 'object' && S && S.me, null, { timeout: 15000 }).catch(() => { });
    if (!(await p.evaluate(() => typeof S === 'object' && !!S))) { await p.evaluate(async () => { await createOrg('univ', '운영 점검 대학'); }); await p.waitForFunction(() => typeof S === 'object' && S && S.me, null, { timeout: 15000 }).catch(() => { }); }
    ok(await p.evaluate(() => typeof S === 'object' && !!S && S.org.type === 'univ'), '운영: ① 기관 만들기 → 스튜디오');
    await p.evaluate(() => { if (typeof slMenuSet === 'function') slMenuSet('conn', true); go('conn'); render(); ACT['sl-cn']({ dataset: { v: 'teams' } }); }); await p.waitForTimeout(800);
    ok(await p.evaluate(() => !!document.querySelector('#cnCard-teams .tm-tabs') && !/시연/.test(document.querySelector('#cnCard-teams .cn-h').textContent)), '운영: 서버 상태(mode live)로 카드');
    await p.waitForTimeout(700); await p.fill('#tmChName', '교무팀'); await p.fill('#tmChUrl', `${MU}/hook/workflows/abc?sig=UISECRET42`); await p.click('#cnCard-teams [data-act=tm-chadd]'); await p.waitForTimeout(800);
    ok(hooks.length === 1 && hooks[0].attachments && hooks[0].attachments[0].contentType === 'application/vnd.microsoft.card.adaptive', '운영: 채널 저장 → 시험 카드 1건 발송');
    ok(await p.evaluate(() => cnStatus('teams').st === '연결됨' && !document.body.innerHTML.includes('UISECRET42') && !JSON.stringify(S).includes('UISECRET42')), '운영: 연결됨 · 화면 · S에 워크플로 주소 원문 없음');
    await p.evaluate(() => ACT['tm-tab']({ dataset: { v: 'org' } })); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !!document.querySelector('#cnCard-teams [data-act=tm-consent]')), '운영: 조직 연결(관리자 동의) 버튼');
    ok(!errs.length, '운영 오류 없음 ' + errs.join(' | '));
    await ctx.close(); app.close();
    /* QA4 #5 T21: 시범 플래그 꺼진 운영 서버(TEAMS_PILOT 없음) — 카탈로그에 Teams 없음 · 로그인 버튼 없음 · 오류 0 */
    { const app2 = createApp({ pool, publicDir: PUB, env: { COOKIE_SECURE: '0', MFA_OFF: '1', PII_KEY: crypto.randomBytes(32).toString('hex'), OAUTH_MOCK_URL: MU, MS_CLIENT_ID: 'ms-ui', MS_CLIENT_SECRET: 's', NEW_DEVICE_MAIL: 'off' }, log: {} });
      await new Promise(o => app2.listen(0, '127.0.0.1', o)); const U2 = `http://127.0.0.1:${app2.address().port}`;
      const c2 = await br.newContext({ viewport: { width: 1440, height: 1000 } }); const p2 = await c2.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
      await p2.goto(U2 + '/index.html'); await p2.waitForTimeout(1500);
      ok(await p2.evaluate(() => !document.querySelector('a.lvsb.ms')), '시범 꺼짐: 운영자 Microsoft 로그인 버튼 없음');
      const em2 = `tmoff${Date.now().toString(36)}@a.kr`;
      await p2.evaluate(async em => { await fetch('/api/signup', { method: 'POST', headers: { 'content-type': 'application/json', 'x-didisam': '1' }, body: JSON.stringify({ email: em, password: 'Passw0rd-aaa', orgName: '시범 꺼짐 대학', type: 'univ' }) }); }, em2);
      await p2.goto(U2 + '/index.html'); await p2.waitForFunction(() => typeof S === 'object' && S && S.me, null, { timeout: 15000 }).catch(() => { });
      if (!(await p2.evaluate(() => typeof S === 'object' && !!S))) { await p2.evaluate(async () => { await createOrg('univ', '시범 꺼짐 대학'); }); await p2.waitForFunction(() => typeof S === 'object' && S && S.me, null, { timeout: 15000 }).catch(() => { }); }
      await p2.evaluate(() => { if (typeof slMenuSet === 'function') slMenuSet('conn', true); go('conn'); render(); }); await p2.waitForTimeout(1500); await p2.evaluate(() => render()); await p2.waitForTimeout(300);
      ok(await p2.evaluate(() => !document.querySelector('.cx-row[data-v=teams]') && !CN_IDS.includes('teams')), '시범 꺼짐: 카탈로그에 Teams 줄 없음');
      ok(!e2.length, '시범 꺼짐 오류 없음 ' + e2.join(' | '));
      await c2.close(); app2.close(); }
    mock.close(); await pool.end(); fs.rmSync(PUB, { recursive: true, force: true });
  } else console.log('- 운영 모드 건너뜀(DATABASE_URL 없음)');
  await br.close(); srv.close();
  console.log(`\n${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
