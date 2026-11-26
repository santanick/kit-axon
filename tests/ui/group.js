'use strict';
/* v49 통합 센터(기관 묶음) 화면 시험 — spec F/grp/spec.md 10절 중 화면 쪽(T-ISO-6 · 8, T-PRV-1~7 · 9 · 10, T-FN-3 · 5 · 6 · 13, 10-4 화면 QA)
   ① 정적: group.css · group.js에 하드코딩 색 없음(토큰만)
   ② 가림 순수 함수: 1~4명 → 「5명 미만」, 분모 5 미만 비율 가림, 동의 안 한 KPI 합계 null, tid 필터 시 합계 null
   ③ 시범 플래그: 꺼진 기관은 공간 · 탭 · 저장 문서가 그대로(통합 센터 없음)
   ④ 시나리오 4종(프랜차이즈 본사 · 대학 본부 · 지자체 · 교육청): 용어 · KPI · 메뉴(프랜차이즈는 통합 학습자 없음)
   ⑤ 권한: 조회자 · 콘텐츠 담당 · 교수자 · 학습자 열람(재인증 · 목적 · 동의 · 감사)
   ⑥ 초대 코드 · 소속 기관 수락(동의 필수) · 받은 콘텐츠(필수 거절 불가 · 가져오기 · 새 버전)
   ⑦ 라이트 · 다크 × 1440 · 390: 대비 4.5:1 · 다크 밝은 바탕 · 가로 넘침 · 휴대폰 좁은 칸 0, pageerror 0
   사용: node tests/ui/group.js   캡처: SHOT=<폴더> node tests/ui/group.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.env.SHOT || ''; const PORT = +process.env.PORT || 9930;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
/* 대비 · 넘침 · 좁은 칸 검사 함수는 market-dark.js의 SCAN을 그대로 씁니다(같은 기준) */
const md = fs.readFileSync(path.join(__dirname, 'market-dark.js'), 'utf8'); const SCAN_SRC = md.slice(md.indexOf('const SCAN = ') + 'const SCAN = '.length, md.indexOf('(async () =>')).trim().replace(/;\s*$/, '');

{ const bad = []; for (const f of ['group.css', 'group.js']) { const src = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); const re = /#[0-9a-fA-F]{3,8}\b(?![\w-])|rgba?\([^)]*\)/g; let m;
  while ((m = re.exec(src))) { const before = src.slice(Math.max(0, m.index - 30), m.index); if (f.endsWith('.js') && !/(color|background|fill|stroke|border)\s*:\s*$/.test(before)) continue; bad.push(`${f}: ${m[0]}`); } }
  ok(!bad.length, `하드코딩 색 없음 ${bad.slice(0, 5).join(' | ')}`); }

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(o => srv.listen(PORT, '127.0.0.1', o).once('error', () => srv.listen(0, '127.0.0.1', o))); const base = `http://127.0.0.1:${srv.address().port}`;
  if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
  const browser = await chromium.launch(); let nScan = 0;
  const open = async (w, th) => { const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: SHOT ? 2 : 1, colorScheme: th }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(process.env.DBG ? e.stack : e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.addInitScript(t => { try { localStorage.setItem('didisam.theme', t); localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } }, th);
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); return { ctx, p, errs }; };
  const scan = async (p, name, w, th, sel) => { await p.waitForTimeout(60); const r = await p.evaluate(([s, d]) => (0, eval)('(' + s + ')')(d[0], d[1]), [SCAN_SRC, [sel, th === 'dark']]); nScan++;
    const bad = r.low.length + r.light.length + (r.over > 0 ? 1 : 0) + r.narrow.length + r.cut.length + r.dup.length;
    if (bad) ok(false, `${name} ${w} ${th}: 대비 ${r.low.length} · 밝은 바탕 ${r.light.length} · 넘침 ${r.over} · 좁은 칸 ${r.narrow.length} · 잘림 ${r.cut.length} ${JSON.stringify(r.low.slice(0, 3))} ${JSON.stringify(r.light.slice(0, 2))} ${JSON.stringify(r.narrow.slice(0, 3))}`);
    if (SHOT) await p.screenshot({ path: path.join(SHOT, `${name}-${w}-${th}.png`), fullPage: true }); return !bad; };

  /* ②③④⑤⑥ 기능(라이트 · 1440) */
  { const { ctx, p, errs } = await open(1440, 'light');
    const pure = await p.evaluate(() => { const a = grpMask({ lrn: 3, act: 2, enr: 6, cmp: 2, end: 3, progSum: 1, progN: 2, crs: 2, aiCalls: 40, rev: 9 }, { ai: true, revenue: false });
      const rows = [{ raw: { lrn: 10, act: 6, cmp: 6, end: 10, aiCalls: 5 }, noConsent: [] }, { raw: { lrn: 20, act: 9, cmp: 4, end: 10, aiCalls: 0 }, noConsent: ['aiCalls'] }];
      return { a, t: grpTotal(rows, ['lrn', 'cmpRateBp', 'aiCalls'], false), f: grpTotal(rows, ['lrn', 'cmpRateBp'], true), small: grpTotal([{ raw: { lrn: 3 }, noConsent: [] }], ['lrn'], false) }; });
    ok(pure.a.v.lrn === '5명 미만' && pure.a.v.act === '5명 미만' && pure.a.v.enr === 6 && pure.a.v.cmpRateBp === null && pure.a.masked.includes('cmpRateBp') && pure.a.masked.includes('progBp'), 'T-PRV-1 학습자 3명 → 「5명 미만」 · 수료율 · 진도 가림');
    ok(pure.a.v.rev === null && pure.a.noConsent.includes('rev') && pure.a.v.aiCalls === 40, 'T-PRV-2 수납액 동의 없음 → 비공개');
    ok(pure.t.lrn === 30 && pure.t.cmpRateBp === 5000 && pure.t.aiCalls === null, '합계: 동의한 값만 · 비동의 기관 있으면 합계 null');
    ok(Object.values(pure.f).every(v => v === null), 'T-PRV-3 기관 필터(tid) 시 합계 없음'); ok(pure.small.lrn === '5명 미만', '합계 자체도 5명 미만 가림');

    /* ③ 시범 꺼짐 */
    const off = await p.evaluate(() => { createOrg('adult', '해운대 수학학원'); S.me.role = 'owner'; upgradeState(); render(); const ws = [...S.nav.ws]; const rail = document.querySelector('.brail, .side').innerText; const doc = JSON.stringify(S);
      return { ws, rail: /통합 센터/.test(rail), grp: 'group' in S, hid: menuHid('grpdash'), inbox: menuHid('grpinbox'), doc: /"grp(dash|links)"/.test(doc) }; });
    ok(!off.ws.includes('grp') && !off.rail && !off.grp && off.hid && off.inbox && !off.doc, 'T-ISO-8 시범 꺼진 기관: 통합 센터 공간 · 메뉴 · 저장 문서 변화 없음');

    /* ④ 시나리오 */
    const KS = [['franchise', 'adult', '가맹점 통합 관리', '원생', false], ['univ', 'univ', '대학 통합 관리', '학생', true], ['region', 'lifelong', '시민대학 통합 관리', '수강생', true], ['edu', 'public', '학교 통합 관리', '학생', true]];
    for (const [k, ty, space, lrn, hasL] of KS) {
      const r = await p.evaluate(([k, ty]) => { createOrg(ty, '점검 기관', ty === 'univ' ? 'lite' : undefined); S.me.role = 'owner'; upgradeState(); grpDemo(k); go('grpdash'); render();
        const h = document.querySelector('#main').innerText; const tabsL = wsTabs('grp'); return { rail: S.nav.ws.includes('grp') && /통합 센터/.test(document.body.innerText), tabsL, h2: (document.querySelector('.gp-head h2') || {}).textContent, kpis: document.querySelectorAll('.gp-kpi').length, mask: /5명 미만/.test(h), nc: /비공개/.test(h), rows: document.querySelectorAll('.gp-gr:not(.gp-gh)').length, alert: !!document.querySelector('.gp-alerts'), lrnL: (document.querySelector('.gp-kpi span') || {}).textContent, demo: !!document.querySelector('.gp-demo') }; }, [k, ty]);
      ok(r.rail && r.h2 === space && (r.lrnL.startsWith(lrn) || (k === 'edu' && /^(학생|교육생)/.test(r.lrnL))) && r.kpis === 6, `${k}: 공간 「통합 센터」 · 제목 「${space}」 · 용어 「${lrn}」 · KPI 6`);
      ok(r.mask && r.rows >= 4 && r.alert && r.demo, `${k}: 비교 ${r.rows}곳 · 5명 미만 가림 표시 · 경고 · 시연 자료 띠`);
      ok(r.tabsL.includes('grplrn') === hasL && ['grpdash', 'grplinks', 'grpshare', 'grppol', 'grpaudit'].every(x => r.tabsL.includes(x)), `${k}: 메뉴 ${r.tabsL.join(',')}`);
      if (k === 'franchise') ok(r.nc, 'franchise: 수납액 비동의 가맹점 「비공개」');
      const tid = await p.evaluate(() => { const d = GRP_DEMO('GET', '/api/group/dash?p=m&tid=' + S.group.links[0].childTid); return Object.values(d.total).every(v => v === null) && d.children.length === 1; }); ok(tid, `${k}: 기관 하나 고르면 합계 없음(차이 공격 방지)`);
    }
    /* ⑤ 권한(대학 본부) */
    const perm = await p.evaluate(() => { createOrg('univ', '한빛대학교', 'lite'); S.me.role = 'owner'; upgradeState(); grpDemo('univ'); const out = {};
      grpAs('grp_viewer'); out.viewer = wsTabs('grp'); go('grplinks'); render(); out.vInv = !!document.querySelector('[data-act="grp-invite"]'); go('grpdash'); render(); out.vExp = !!document.querySelector('[data-act="grp-export"]');
      grpAs('grp_content'); out.content = wsTabs('grp'); grpAs('');
      try { GRP_DEMO('POST', '/api/group/learners/lookup', { key: { studentNo: '20231234' }, purpose: '학생 상담 이력 확인 목적' }); out.noRole = 'pass'; } catch (e) { out.noRole = e.code; }
      S.me.role = 'teacher'; upgradeState(); render(); out.teach = S.nav.ws.includes('grp') || /통합 센터/.test(document.querySelector('.brail, .side').innerText); go('grpdash'); out.teachGo = CUR.tab; S.me.role = 'owner'; upgradeState(); return out; });
    ok(perm.viewer.join() === 'grpdash,grplinks,grplrn' && !perm.vInv && perm.vExp, `통합 조회자: 현황 · 목록 · 통합 학습자만, 초대 버튼 없음, 내려받기 있음 (${perm.viewer})`);
    ok(perm.content.includes('grpshare') && !perm.content.includes('grppol') && !perm.content.includes('grpaudit'), `콘텐츠 담당: 콘텐츠 공유 O · 공통 설정 · 감사 X (${perm.content})`);
    ok(perm.noRole === 'grp_role', '통합 관리자라도 학습자 열람 역할을 따로 받지 않으면 열람 불가(grp_role)');
    ok(!perm.teach && perm.teachGo !== 'grpdash', 'T-ISO-6 교수자: 통합 센터 레일 · 이동 없음');
    /* 학습자 개별 열람 흐름(화면) */
    await p.evaluate(() => { go('grpaudit'); UI.grpAt = 'staff'; render(); }); await p.click('[data-act="grp-role"][data-v="owner@demo"][data-r="grp_learner"]'); await p.waitForTimeout(80);
    await p.evaluate(() => { go('grplrn'); render(); }); const lk = await p.locator('#main [data-act="grp-lookup"]').count(); ok(lk === 1, '학습자 열람 역할 지정 후 [학번으로 개별 열람] 표시');
    const L0 = await p.evaluate(() => { try { GRP_DEMO('POST', '/api/group/learners/lookup', { key: { studentNo: '20231234' }, purpose: '학생 상담 이력 확인 목적' }); return 'pass'; } catch (e) { return e.code; } }); ok(L0 === 'grp_mfa', 'T-PRV-5 재인증 없이 열람 → grp_mfa');
    await p.click('#main [data-act="grp-lookup"]'); await p.fill('#modal [name=code]', '123456'); await p.click('#modal [data-mact="ok"]'); await p.waitForTimeout(120);
    await p.fill('#modal [name=sn]', '20231234'); await p.fill('#modal [name=pur]', '짧음'); await p.click('#modal [data-mact="ok"]'); await p.waitForTimeout(80); const stay = await p.locator('#modal [name=pur]').count(); ok(stay === 1, 'T-PRV-6 목적 10자 미만 → 창 유지(grp_purpose)');
    await p.fill('#modal [name=pur]', '학생 상담 — 비교과 이수 이력 확인'); await p.click('#modal [data-mact="ok"]'); await p.waitForTimeout(200);
    const res = await p.evaluate(() => { const m = document.querySelector('#modal'); const tx = m ? m.innerText : ''; return { tx, cards: m ? m.querySelectorAll('.gp-card').length : 0, wm: !!(m && m.querySelector('.gp-wm[data-wm]')), aud: S.group.audit.find(a => a.action === 'learner.lookup'), child: (S.group.childAudit || []).length }; });
    ok(res.cards >= 1 && /동의하지 않은 소속 기관 \d+곳/.test(res.tx) && /기록되며 소속 기관에 공개/.test(res.tx) && res.wm, `T-PRV-7 동의 기관 이력 ${res.cards}곳 · 비동의 기관 수 · 기록 안내 · 워터마크`);
    ok(!/@|010-|이메일/.test(res.tx), '열람 결과에 이름 · 연락처 · 이메일 없음');
    ok(res.aud.action === 'learner.lookup' && !/20231234/.test(JSON.stringify(res.aud)) && res.aud.purpose.length >= 10 && res.child >= 1, 'T-PRV-8 감사 1줄(학번 원문 없음 · 목적) + 소속 기관 열람 기록');
    await p.evaluate(() => closeModal());
    /* 초대 코드 */
    await p.evaluate(() => { go('grplinks'); render(); }); await p.click('#main [data-act="grp-invite"]'); await p.fill('#modal [name=label]', '교수학습센터'); await p.click('#modal [data-mact="ok"]'); await p.waitForTimeout(150);
    const code = await p.evaluate(() => (document.querySelector('#modal .gp-code b') || {}).textContent || ''); ok(/^GRP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), `초대 코드 1회 표시 ${code}`);
    await p.evaluate(() => closeModal());
    const fr = await p.evaluate(() => { createOrg('adult', '본사'); S.me.role = 'owner'; upgradeState(); grpDemo('franchise'); go('grplinks'); render(); ACT['grp-invite'](); const t = document.querySelector('#modal').innerHTML; closeModal(); return { det: /learnerDetail|학습자 개별 열람/.test(t), agg: /ask_learnerAgg/.test(t), lrn: wsTabs('grp').includes('grplrn') }; });
    ok(!fr.det && !fr.agg && !fr.lrn, 'T-PRV-9 프랜차이즈: 학습자 집계 · 개별 열람 항목 자체가 없음');
    /* 콘텐츠 배포 → 새 버전 */
    const sh = await p.evaluate(async () => { const c = S.classes[0]; const r = GRP_DEMO('POST', '/api/group/shares', { kind: 'course', source: { courseId: c.id }, required: true, targets: 'all' }); GRP_DEMO('POST', `/api/group/shares/${r.share.sid}/publish`, {}); c.mk = true; let lic; try { GRP_DEMO('POST', '/api/group/shares', { kind: 'course', source: { courseId: c.id }, required: false, targets: 'all' }); lic = 'pass'; } catch (e) { lic = e.code; } delete c.mk;
      UI.grpShare = r.share.sid; go('grpshare'); render(); const h = document.querySelector('#main').innerText; UI.grpShare = ''; return { lic, h: /채택 상태/.test(h) && /버전 이력/.test(h) }; });
    ok(sh.lic === 'grp_license', 'T-FN-4 마켓 상품 과정 배포 → grp_license'); ok(sh.h, '배포 상세: 기관별 채택 상태 · 버전 이력');
    /* ⑥ 소속 기관 */
    await p.evaluate(() => { createOrg('lifelong', '좌동 평생교육원'); S.me.role = 'owner'; upgradeState(); grpDemo('child'); ACT['grp-open-mine'](); render(); });
    const inv = await p.evaluate(() => ({ inv: !!document.querySelector('[data-st="invite"]'), tbl: /어떤 경우에도 가지 않음/.test(document.querySelector('#main').innerText), inbox: menuHid('grpinbox') }));
    ok(inv.inv && inv.tbl && inv.inbox, 'A-settings-grp @invite: 받은 초대 · 볼 수 있는 것/없는 것 표 · 수락 전 받은 콘텐츠 숨김(T-ISO-3)');
    await p.click('#main [data-act="grp-accept"]'); await p.waitForTimeout(80); const errShown = await p.evaluate(() => { const e = document.querySelector('.gp-err'); return e && !e.hidden; }); ok(errShown, '동의 없이 연결 → 체크박스 아래 빨간 안내(grp_terms)');
    await p.evaluate(() => { const i = document.querySelector('#main .gp-agree input'); i.checked = true; }); await p.click('#main [data-act="grp-accept"]'); await p.waitForTimeout(300);
    const lk2 = await p.evaluate(() => ({ linked: !!document.querySelector('[data-st="linked"]'), inbox: !menuHid('grpinbox') && wsTabs('learn').includes('grpinbox'), share: (S.group.links[0] || {}).share || {}, toast: (document.querySelector('#toasts') || {}).innerText, inv: document.querySelectorAll('[data-st=invite]').length, ag: (document.querySelector('#main .gp-agree input') || {}).checked }));
    if (!lk2.linked) console.log('accept 실패', JSON.stringify(lk2));
    ok(lk2.linked && lk2.inbox && lk2.share.kpi === true && !('learnerDetail' in lk2.share), 'A-settings-grp @linked: 연결 · 받은 콘텐츠 탭 표시 · 지역 묶음은 개별 열람 항목 없음');
    const ib = await p.evaluate(() => { go('grpinbox'); render(); const req = S.group.inbox.find(x => x.required); let dec; try { GRP_DEMO('POST', `/api/group/my/inbox/${req.sid}/decline`, {}); dec = 'pass'; } catch (e) { dec = e.code; }
      const n0 = S.classes.length; ACT['grp-in']({ dataset: { v: req.sid, d: 'adopt' } }); return { dec, add: S.classes.length === n0 + 1 && S.classes[0].open === '비공개', btn: !!document.querySelector('#main [data-d="adopt"]') }; });
    ok(ib.dec === 'grp_required' && ib.add && ib.btn, 'T-FN-5 필수 배포 거절 불가 · 가져오면 비공개 초안 과정');
    const up = await p.evaluate(() => { const x = S.group.inbox.find(y => y.status === 'adopted'); x.ver = 3; render(); const has = /새 버전 있음/.test(document.querySelector('#main').innerText); GRP_DEMO('POST', `/api/group/my/inbox/${x.sid}/update`, {}); return has && x.myVer === 3; }); ok(up, 'T-FN-6 새 버전 있음 → [업데이트 적용] 후 버전 반영');
    S_lock: { const lock = await p.evaluate(() => { const k = S.group.pol.find(x => x.lock === 'locked'); if (!k) return 'none'; try { GRP_DEMO('POST', `/api/group/my/policies/${k.key}`, { action: 'override' }); return 'pass'; } catch (e) { return e.code; } }); ok(lock === 'grp_locked', 'T-FN-8 잠긴 공통 설정 덮어쓰기 → grp_locked'); }
    const sub = await p.evaluate(() => { S.me.role = 'sub'; upgradeState(); ACT['grp-open-mine'](); render(); const r = !document.querySelector('#main [data-act="grp-share-save"]') && !document.querySelector('#main [data-act="grp-leave"]'); S.me.role = 'owner'; return r; }); ok(sub, '소속 부운영자: 공유 범위 · 해제 버튼 없음(정운영자만)');
    ok(!errs.length, `기능 pageerror 없음 ${errs.slice(0, 3).join(' / ')}`); await ctx.close(); }


  /* ⑧ 운영 모드: 개발 1 계약(service/server/group/contract.json 예시) 응답으로 화면을 그립니다 */
  { const CF = [path.resolve(__dirname, '../../service/server/group/contract.json'), process.env.GRP_CONTRACT || ''].find(f => f && fs.existsSync(f));
    if (!CF) console.log('- 운영 모드 시험 건너뜀(계약 파일 없음: GRP_CONTRACT=<contract.json>)'); else { const EX = JSON.parse(fs.readFileSync(CF, 'utf8')).examples; const { ctx: c0, p: p0 } = await open(1440, 'light'); const seen = []; const FRESH = { ok: false };
      const DASH = { range: { from: '2026-11-01', to: '2026-11-26', unit: 'week' }, asOf: '2026-11-27T03:00:00+09:00', kpis: ['lrn', 'act', 'enr', 'cmp', 'cmpRateBp', 'progBp', 'aiCalls', 'rev'], total: { lrn: 4210, act: 1830, enr: 6120, cmp: 2011, cmpRateBp: 3286, progBp: 5410, aiCalls: 18220, rev: null }, children: [{ tid: 'tn_ab12cd34', label: '해운대점', unit: 'branch', v: { lrn: 312, act: 140, enr: 401, cmp: 120, cmpRateBp: 2993, progBp: 5120, aiCalls: 900, rev: 18400000 }, masked: [], noConsent: [], rank: { cmpRateBp: 1 }, flags: [{ rule: 2, kpi: 'cmpRateBp', label: '수료율 30% 미만' }] }, { tid: 'tn_ef56gh78', label: '기장점', unit: 'branch', v: { lrn: '5명 미만', act: '5명 미만', enr: 6, cmp: '5명 미만', cmpRateBp: null, progBp: null, aiCalls: 40, rev: null }, masked: ['lrn', 'act', 'cmp', 'cmpRateBp', 'progBp'], noConsent: ['rev'], rank: {}, flags: [] }], series: [{ at: '2026-W45', lrn: 4100, act: 1700 }, { at: '2026-W46', lrn: 4180, act: 1790 }], stale: [] };
      const doc = await p0.evaluate(() => { createOrg('adult', '디디 영어 본사'); return JSON.parse(JSON.stringify(S)); }); await c0.close(); if (doc.org.room) doc.org.room.tid = 'tn_owner01'; let rev = 1;
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.route(/\/index\.html$/, x => x.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script src="boot\.js(\?v=[^"]*)?"><\/script>/, m => '<script src="live.js"></script>\n' + m) })); /* build-public.js와 같이 live.js 주입 */
      await p.route(/\/api\//, r => { const u = new URL(r.request().url()); const k = r.request().method() + ' ' + u.pathname; seen.push(k + u.search);
        const body = u.pathname === '/api/config' ? { live: true, signup: true, ai: false, models: [] } : u.pathname === '/api/me' ? { user: { email: 'owner@example.com', role: 'owner' }, tenant: { tid: 'tn_owner01', name: doc.org.name, type: 'adult' } } : k === 'GET /api/state' ? { doc, rev } : u.pathname === '/api/state' ? { rev: ++rev, pending: 0 } :
          k === 'POST /api/login' ? { mfa: 'email', ticket: 'T'.repeat(43) } : k === 'POST /api/login/mfa' ? (FRESH.ok = true, { ok: true }) : k === 'POST /api/group/learners/lookup' ? (FRESH.ok ? { items: [{ childTid: 'tn_x', label: '평생교육원', fields: { studentNo: '20231234', dept: '기계공학과', courses: [] } }], hidden: 1 } : null) :
          k === 'GET /api/group/me' ? EX['GET /api/group/me (상위 기관)'] : k === 'GET /api/group/my' ? EX['GET /api/group/my'] : k === 'GET /api/group/dash' ? DASH : k === 'GET /api/group/links' ? EX['GET /api/group/links'] : k === 'GET /api/group/shares' ? EX['GET /api/group/shares'] : k === 'GET /api/group/policies' ? EX['GET /api/group/policies'] : k === 'GET /api/group/my/inbox' ? EX['GET /api/group/my/inbox'] : k === 'GET /api/group/my/audit' ? EX['GET /api/group/my/audit'] : k.startsWith('GET /api/group') ? { items: [] } : {};
        if (body === null) return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'grp_mfa', message: '학습자 개별 열람 전에 2단계 인증을 다시 해 주십시오.', mfa: 'required' }) });
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); });
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.tenant && S && S.org, null, { timeout: 8000 }).catch(() => { });
      await p.waitForFunction(() => S.nav.ws.includes('grp'), null, { timeout: 5000 }).catch(() => { });
      if (process.env.DBG) console.log(seen.join(' | '), await p.evaluate(() => JSON.stringify({ L: typeof LIVE !== 'undefined' && { u: LIVE.user, t: LIVE.tenant, e: LIVE.err }, S: !!S })), errs);
      await p.evaluate(() => { go('grpdash'); render(); }); await p.waitForTimeout(400);
      const r = await p.evaluate(() => ({ ws: S.nav.ws.includes('grp'), h: document.querySelector('#main').innerText, demo: !!document.querySelector('.gp-demo'), doc: 'group' in S }));
      ok(r.ws && /가맹점 통합 관리/.test(r.h) && /5명 미만/.test(r.h) && /기장점/.test(r.h) && /수료율 30% 미만/.test(r.h) && !r.demo && !r.doc, '운영 모드: /api/group/me · dash 응답으로 통합 현황(시연 띠 없음 · 저장 문서에 묶음 자료 없음)');
      ok(seen.some(x => /^GET \/api\/group\/dash\?/.test(x) && /from=\d{4}-\d\d-\d\d/.test(x)), '운영 모드: dash 질의에 from · to');
      await p.evaluate(() => { ACT['grp-open-mine'](); render(); }); await p.waitForTimeout(400);
      const m = await p.evaluate(() => document.querySelector('#main').innerText); ok(/부산 시민대학/.test(m) && /디디 영어 가맹/.test(m), '운영 모드 소속 기관 쪽: 받은 초대 · 연결된 묶음(/api/group/my) 표시');
      await p.evaluate(() => { go('grpinbox'); render(); }); await p.waitForTimeout(400); const ib = await p.evaluate(() => document.querySelector('#main').innerText); ok(/신규 강사 OT/.test(ib) && /새 버전 있음/.test(ib) && seen.some(x => /my\/inbox\?linkId=/.test(x)), '운영 모드 받은 콘텐츠: 새 버전 있음 · linkId 질의');
      /* QA49-3 #6 운영 재인증: grp_mfa → 이 자리에서 비밀번호 → 2단계 인증번호 → 학번 · 목적이 채워진 열람 창으로 돌아와 열람 */
      { await p.evaluate(() => { S.grpAs = ''; ACT['grp-lookup'](); }); await p.fill('#modal [name=sn]', '20231234'); await p.fill('#modal [name=pur]', '장학 대상 확인을 위한 이수 이력 확인'); await p.click('#modal [data-mact="ok"]');
        await p.waitForSelector('#modal [name=pw]', { timeout: 3000 }).catch(() => { }); const t1 = await p.evaluate(() => (document.querySelector('#modal') || {}).innerText || '');
        await p.fill('#modal [name=pw]', 'pw-x').catch(() => { }); await p.click('#modal [data-mact="ok"]').catch(() => { }); await p.waitForSelector('#modal [name=code]', { timeout: 3000 }).catch(() => { });
        await p.fill('#modal [name=code]', '123456').catch(() => { }); await p.click('#modal [data-mact="ok"]').catch(() => { }); await p.waitForSelector('#modal [name=sn]', { timeout: 3000 }).catch(() => { });
        const back = await p.evaluate(() => { const x = document.querySelector('#modal [name=sn]'); const y = document.querySelector('#modal [name=pur]'); return [x && x.value, y && y.value.length]; });
        await p.click('#modal [data-mact="ok"]').catch(() => { }); await p.waitForTimeout(400); const t2 = await p.evaluate(() => (document.querySelector('#modal') || {}).innerText || '');
        ok(/재인증/.test(t1) && seen.includes('POST /api/login') && seen.includes('POST /api/login/mfa') && back[0] === '20231234' && back[1] >= 10 && /평생교육원/.test(t2) && /1곳은 보이지 않습니다/.test(t2), `운영 모드 재인증(step-up): 비밀번호 → 인증번호 → 입력 유지된 열람 창 → 결과 ${JSON.stringify(back)}`); }
      ok(!errs.length, `운영 모드 pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); } }

  /* ⑦ 화면 QA: 4종 × 탭 + 소속 기관 화면 × 라이트 · 다크 × 1440 · 390 */
  for (const th of ['light', 'dark']) for (const w of [1440, 390]) { const { ctx, p, errs } = await open(w, th); let good = 0, all = 0;
    for (const [k, ty] of [['franchise', 'adult'], ['univ', 'univ'], ['region', 'lifelong'], ['edu', 'public']]) {
      await p.evaluate(([k, ty]) => { createOrg(ty, '점검 기관', ty === 'univ' ? 'lite' : undefined); S.me.role = 'owner'; upgradeState(); grpDemo(k); S.group.staff[0].roles.push('grp_learner'); }, [k, ty]);
      const tabs = await p.evaluate(() => wsTabs('grp'));
      for (const tb of tabs) for (const sub of (tb === 'grpaudit' ? ['log', 'staff'] : tb === 'grpshare' ? ['down', 'up'] : [''])) { await p.evaluate(([tb, sub]) => { if (tb === 'grpaudit') UI.grpAt = sub; if (tb === 'grpshare') UI.grpDir = sub; UI.grpShare = ''; UI.grpChild = ''; go(tb); render(); scrollTo(0, 0); }, [tb, sub]); all++; if (await scan(p, `${k}-${tb}${sub ? '-' + sub : ''}`, w, th, '#main')) good++; }
      if (k === 'univ') { await p.evaluate(() => { UI.grpChild = S.group.links[0].childTid; go('grpdash'); render(); }); all++; if (await scan(p, 'univ-child', w, th, '#main')) good++;
        await p.evaluate(() => { UI.grpChild = ''; UI.grpShare = S.group.shares[0].sid; go('grpshare'); render(); }); all++; if (await scan(p, 'univ-share-item', w, th, '#main')) good++;
        await p.evaluate(() => { UI.grpShare = ''; go('grplinks'); render(); ACT['grp-invite'](); }); all++; if (await scan(p, 'univ-invite', w, th, '#modal')) good++; await p.evaluate(() => closeModal());
        await p.evaluate(() => { ACT['grp-sh-new'](); }); all++; if (await scan(p, 'univ-share-new', w, th, '#modal')) good++; await p.evaluate(() => closeModal()); }
    }
    await p.evaluate(() => { createOrg('univ', 'RISE 사업단', 'lite'); S.me.role = 'owner'; upgradeState(); grpDemo('child'); ACT['grp-open-mine'](); render(); scrollTo(0, 0); }); all++; if (await scan(p, 'child-invite', w, th, '#main')) good++;
    await p.evaluate(() => { const iv = S.group.invites[0]; GRP_DEMO('POST', '/api/group/my/accept', { linkId: iv.linkId, share: { ai: true, learnerAgg: true, learnerDetail: { on: true, fields: ['studentNo'] } }, agreeVer: 'grp-share-v1' }); grpNavSync(); render(); }); all++; if (await scan(p, 'child-linked', w, th, '#main')) good++;
    await p.evaluate(() => { go('grpinbox'); render(); scrollTo(0, 0); }); all++; if (await scan(p, 'child-inbox', w, th, '#main')) good++;
    await p.evaluate(() => { createOrg('adult', '점검'); S.me.role = 'owner'; upgradeState(); ACT['grp-open-mine'](); render(); }); all++; if (await scan(p, 'demo-start', w, th, '#main')) good++;
    ok(good === all, `화면 ${w} ${th}: ${good}/${all} 통과`); ok(!errs.length, `화면 ${w} ${th} pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  await browser.close(); srv.close();
  if (fails.length) { console.error(`실패 ${fails.length}건 (검사 화면 ${nScan})`); process.exit(1); }
  console.log(`✓ 통합 센터 화면 시험 통과(검사 화면 ${nScan})`);
})().catch(e => { console.error(e); process.exit(1); });
