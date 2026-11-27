'use strict';
/* v49.1 2차 기능 화면 시험 — A-grp-sam(통합 센터 AI SAM) · L-noti-teams(학습자 Teams 알림, 시연판)
   ① 시범 게이트: 통합 센터가 꺼진 기관은 Claude 요청 도구 목록 · system이 지금과 같음(grp_* 없음), 켜진 상위 기관만 3종 + 규칙
   ② 규칙 엔진: 통합 현황 · 목표 미달(5명 미만 판정 제외) · 배포 계획 카드 → 승인 → 배포(소속 기관 받은 콘텐츠) · 개별 열람 거절 · 마켓 콘텐츠 차단 · 조회자 배포 불가
   ③ Claude 경로(api.anthropic.com 가짜 응답): grp_below_target → grp_share_plan → 계획 카드, 도구 결과에 학번 · 이름 없음
   ④ 화면 칩 3개(통합 센터 탭) · 다른 탭 칩은 그대로
   ⑤ Teams 학습자 알림: 대학 · 기업만 「학습자 알림」 탭, 학원은 탭 4개 그대로 · 시연 켜기 → 학습자 사이트 스냅샷 teamsLrn → 학습자 「연결 · 알림」 행 · 동의 없이 못 켬 · 켜기/끄기(해요체) · 390 넘침 0
   사용: PORT=9625 node tests/ui/grp-sam.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const PORT = +process.env.PORT || 9625;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/json', '.woff2': 'font/woff2' };
const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(o => srv.listen(PORT, '127.0.0.1', o).once('error', () => srv.listen(0, '127.0.0.1', o))); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const open = async (w = 1440) => { const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const bodies = []; let script = [];
    await p.route('https://api.anthropic.com/**', async x => { const b = x.request().postData() || ''; bodies.push(b); const nx = script.shift() || { content: [{ type: 'text', text: '확인했습니다.' }], stop_reason: 'end_turn' };
      await x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'msg', model: 'claude-haiku-test', role: 'assistant', usage: { input_tokens: 10, output_tokens: 5 }, ...nx }) }); });
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)(?!api\.anthropic\.com)/, x => x.abort());
    await p.addInitScript(() => { try { localStorage.setItem('didisam.emptyStart', '0'); } catch (e) { } });
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); return { ctx, p, errs, bodies, set: s => { script = s; } }; };

  /* ① ② ④ 프랜차이즈 본사(시연판) */
  { const { ctx, p, errs, bodies, set } = await open();
    const off = await p.evaluate(async () => { createOrg('adult', '해운대 수학학원'); S.me.role = 'owner'; upgradeState(); render(); CL.set({ key: 'sk-ant-test-dummy', chat: true });
      const r = answer('통합 현황 알려줘'); return { on: grpSam.on(), via: (r && r.via) || '', text: (r && r.text) || '' }; });
    ok(off.on === false && !/통합 센터 AI SAM/.test(off.via), `통합 센터 꺼진 기관: 규칙 엔진이 가로채지 않음(${off.text.slice(0, 40)})`);
    set([{ content: [{ type: 'text', text: '안녕하세요' }], stop_reason: 'end_turn' }]);
    await p.evaluate(async () => { await chatSend('오늘 할 일 알려줘'); await new Promise(o => setTimeout(o, 300)); });
    const b0 = bodies.pop() || ''; ok(b0 && !/grp_overview|grp_share_plan|\[통합 센터\]/.test(b0), '꺼진 기관 Claude 요청: grp 도구 · 규칙 없음(지금과 같음)');

    const on = await p.evaluate(() => { createOrg('adult', '한빛수학 본사'); S.me.role = 'owner'; upgradeState(); grpDemo('franchise'); go('grpdash'); render(); CL.set({ key: 'sk-ant-test-dummy', chat: true });
      const ov = answer('통합 현황 알려줘'); const lo = answer('지난달 수료율이 낮은 가맹점 알려줘'); const ind = answer('수료율 낮은 가맹점 원생 명단이랑 이름 보여줘');
      const chips = scxDefs('grpdash').slice(0, 3).map(c => c[1]); const other = scxDefs('classes').map(c => c[0]);
      return { on: grpSam.on(), ov: ov.text, ovh: ov.html, lo: lo.text, loh: lo.html, ind: ind.text, chips, other, low: grpSam.below('pm', 'cmpRateBp').out }; });
    ok(on.on, '시연 본사: 통합 센터 AI SAM 켜짐');
    ok(/가맹점 5곳/.test(on.ov) && /수료율/.test(on.ov) && /해운대점/.test(on.ovh) && /5명 미만/.test(on.ovh), `통합 현황: 가맹점 단위 집계 · 5명 미만 가림(${on.ov.slice(0, 70)})`);
    ok(/못 미치는 가맹점/.test(on.lo) && /판정에서 뺐습니다/.test(on.lo) && !/기장점\(/.test(on.lo), `미달 가맹점: 목표 비교 · 5명 미만 기관(기장점) 판정 제외(${on.lo.slice(0, 90)})`);
    ok(/조회하지 않습니다/.test(on.ind), '개인 명단 · 이름 요청: 거절');
    ok(on.chips.length === 3 && /현황 요약/.test(on.chips[0]) && /미달/.test(on.chips[1]) && /배포 계획/.test(on.chips[2]), `통합 센터 탭 칩 3개 ${on.chips.join(' | ')}`);
    ok(!on.other.some(id => /^gs-/.test(id)), '다른 탭 칩은 그대로(gs- 없음)');
    ok(on.low && on.low.미달.every(x => x.기관 && x.값) && !JSON.stringify(on.low).match(/sid|학번|email/), '도구 결과: 기관 이름 · 값만');

    /* 배포 계획 → 승인 → 배포 */
    const pl = await p.evaluate(async () => { S.classes = S.classes || []; S.classes.push({ id: 'c_gs1', name: '중등 수학 기초', status: '운영중', curriculum: [], learners: [], prog: {} }, { id: 'c_mk1', name: '마켓 콘텐츠 과정', status: '운영중', mk: { id: 'x' }, curriculum: [], learners: [], prog: {} });
      const n0 = (S.group.shares || []).length; const noc = answer('미달 가맹점에 콘텐츠 배포 계획 세워줘'); const mk = answer('「마켓 콘텐츠 과정」 과정을 미달 가맹점에 배포 계획');
      const r = answer('「중등 수학 기초」 과정을 수료율 미달 가맹점에 배포 계획 세워줘'); const pid = r.plan; const plan = PLANS[pid];
      const n1 = (S.group.shares || []).length; if (plan) await plan.run(); await new Promise(o => setTimeout(o, 50));
      const sh = (S.group.shares || [])[0] || {}; return { noc: noc.text, mk: mk.text, text: r.text, html: r.html || '', pid: !!pid, n0, n1, n2: (S.group.shares || []).length, st: sh.status || sh.state || '', tg: JSON.stringify(sh.targets || sh.to || '') }; });
    ok(/알려 주십시오|찾지 못했/.test(pl.noc), `과정 없으면 물음(${pl.noc.slice(0, 40)})`);
    ok(/재공유|다시 공유할 수 없/.test(pl.mk), '마켓 콘텐츠는 배포 계획 불가');
    ok(pl.pid && /승인하시면/.test(pl.text) && /빠짐/.test(pl.html) && pl.n1 === pl.n0, `계획 카드(승인 전 배포 없음): ${pl.text.slice(0, 80)}`);
    ok(pl.n2 === pl.n0 + 1, `승인 → 배포 1건 생성(${pl.n0}→${pl.n2}, ${pl.st})`);

    /* 조회자: 배포 계획 불가 · 조회는 가능 */
    const vw = await p.evaluate(() => { grpAs('grp_viewer'); const a = answer('「중등 수학 기초」 과정을 미달 가맹점에 배포 계획'); const b = answer('통합 현황 알려줘'); grpAs(''); return { a: a.text, b: b.text, plan: !!a.plan }; });
    ok(!vw.plan && /역할/.test(vw.a) && /현황/.test(vw.b), `조회자: 배포 계획 불가 · 현황 조회 가능(${vw.a.slice(0, 40)})`);

    /* ③ Claude 경로 */
    set([{ content: [{ type: 'tool_use', id: 'tu1', name: 'grp_below_target', input: { period: 'm', kpi: 'cmpRateBp' } }], stop_reason: 'tool_use' },
      { content: [{ type: 'tool_use', id: 'tu2', name: 'grp_share_plan', input: { course: '중등 수학 기초', targets: 'below', kpi: 'cmpRateBp' } }], stop_reason: 'tool_use' },
      { content: [{ type: 'text', text: '미달 가맹점과 배포 계획을 준비했습니다.' }], stop_reason: 'end_turn' }]);
    bodies.length = 0;
    const ag = await p.evaluate(async () => { S.chat = []; await chatSend('수료율 미달 가맹점에 중등 수학 기초 배포해 줘'); await new Promise(o => setTimeout(o, 500)); return S.chat.map(m => ({ role: m.role, text: m.text || m.md || '', plan: m.plan || '', tools: m.tools || [] })); });
    const b1 = bodies[0] || ''; let J = {}; try { J = JSON.parse(b1); } catch (e) { }
    const names = (J.tools || []).map(t => t.name); ok(['grp_overview', 'grp_below_target', 'grp_share_plan'].every(n => names.includes(n)) && /\[통합 센터\]/.test(JSON.stringify(J.system || '')), `켜진 본사 Claude 요청: grp 도구 3종 + 규칙(${names.filter(n => /^grp/.test(n)).join(',')})`);
    ok(names[names.length - 1] !== 'grp_share_plan' || names.length === 3, '마지막 도구(캐시 지점) 위치 유지');
    const tr = bodies.slice(1).join('\n'); ok(/tool_result/.test(tr) && !/20\d{6}|학번\\":|email/.test(tr), '도구 결과에 학번 · 이메일 없음');
    ok(ag.some(m => m.plan) && ag.some(m => (m.tools || []).includes('grp_share_plan')), `계획 카드 생성 · 사용 도구 기록(${ag.map(m => m.role + (m.plan ? ':plan' : '')).join(' ')})`);
    ok(!errs.length, `pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }

  /* ⑤ Teams 학습자 알림(시연판) */
  for (const w of [1440, 390]) { const { ctx, p, errs } = await open(w);
    const st = await p.evaluate(() => { createOrg('adult', '학원'); S.me.role = 'owner'; upgradeState(); const a = (typeof cnCard === 'function' ? cnCard('teams') : ''); createOrg('univ', '한빛대학교', 'lite'); S.me.role = 'owner'; upgradeState(); ACT['tm-demo'](); UI.tmTab = 'ln'; const b = cnCard('teams');
      return { adult: /학습자 알림/.test(a), univ: /학습자 알림/.test(b), btn: /학습자 알림 켜기/.test(b) }; });
    ok(!st.adult && st.univ && st.btn, `${w}: 학원 Teams 카드는 탭 4개 그대로 · 대학은 「학습자 알림」 탭`);
    const tg = await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="tmT">' + cnCard('teams') + '</div>'); ACT['tm-ln']({ dataset: { v: 'on' } }); const snap = lsSnapshot(); document.getElementById('tmT').remove(); return { lrn: cnEnsure().teams.lrn, snap: snap.teamsLrn, card: cnCard('teams') }; });
    ok(tg.lrn && tg.lrn.on && tg.snap && tg.snap.on && /켜짐/.test(tg.card), `${w}: 기관 켜기(시연) → 학습자 사이트 스냅샷 teamsLrn`);
    await p.evaluate(() => { S.lsite = S.lsite || {}; save(); });
    const snap = await p.evaluate(() => lsSnapshot());
    await ctx.close();
    /* 학습자 화면: 미리보기와 같은 방식으로 스냅샷을 넣어 #connect를 엽니다 */
    const lc = await browser.newContext({ viewport: { width: w, height: 900 } }); const lp = await lc.newPage(); const lerr = []; lp.on('pageerror', e => lerr.push(e.message)); await lp.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await lp.goto(`${base}/learner.html?demo=1#connect`, { waitUntil: 'load' }); await lp.waitForTimeout(400);
    const L = await lp.evaluate(async s => { LR.site = s; LR.mode = 'demo'; LR.me = LR.me || { sid: '20260001', id: '20260001', kind: 'learner', dept: '수학' }; LR.lp = LR.lp || {}; location.hash = '#connect'; lrender(); await new Promise(o => setTimeout(o, 100));
      const row = [...document.querySelectorAll('.lcx-r')].find(r => /Microsoft Teams 알림/.test(r.innerText)); if (!row) return { row: false, txt: (document.querySelector('.lcx') || {}).innerText || '' };
      row.querySelector('[data-lcx="teams"]').click(); await new Promise(o => setTimeout(o, 50)); const f = document.querySelector('[data-lcx-f="teams"]'); const form = f ? f.innerText : '';
      f.requestSubmit(); await new Promise(o => setTimeout(o, 50)); const err = (f.querySelector('.err') || {}).textContent || ''; const before = !!(LR.lp.conn && LR.lp.conn.teams);
      f.agree.checked = true; f.requestSubmit(); await new Promise(o => setTimeout(o, 150)); const after = LR.lp.conn && LR.lp.conn.teams; const row2 = [...document.querySelectorAll('.lcx-r')].find(r => /Microsoft Teams 알림/.test(r.innerText));
      const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      row2.querySelector('[data-lcx="teams"]').click(); await new Promise(o => setTimeout(o, 50)); document.querySelector('[data-lcx="teamsoff"]').click(); await new Promise(o => setTimeout(o, 150));
      return { row: true, form, err, before, after: after ? after.on : false, ev: after ? after.events : [], on2: /켜짐/.test(row2.innerText), off: !(LR.lp.conn && LR.lp.conn.teams), over }; }, snap);
    ok(L.row, `${w}: 학습자 「연결 · 알림」에 Microsoft Teams 알림 행 ${L.row ? '' : L.txt.slice(0, 80)}`);
    if (L.row) { ok(/이름 · 학번 · 성적은 보내지 않아요/.test(L.form) && /끄면 바로 지워요/.test(L.form) && /시연/.test(L.form), `${w}: 받는 것 · 목적 · 보관 안내(해요체)`);
      ok(!L.before && /동의해 주세요/.test(L.err), `${w}: 동의 없이 켤 수 없음`);
      ok(L.after === true && L.ev.length === 2 && L.on2, `${w}: 동의 후 켜짐(공지 · 마감 임박)`); ok(L.off, `${w}: 끄기 → 동의 기록 지움`); ok(L.over <= 0, `${w}: 가로 넘침 0(${L.over})`); }
    ok(!errs.length && !lerr.length, `${w}: pageerror 0 ${[...errs, ...lerr].slice(0, 2).join(' | ')}`); await lc.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
