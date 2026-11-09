'use strict';
/* v35 과정 만들기 개편 — 흐름 끝까지 자동 검증(C7).
   7유형(k12 · univ lite · adult · public · lifelong · voc · corp) × (빈 기관 · 채운 기관) PC 1280 + 휴대폰 390(빈 기관).
   메뉴 진입(레일 → [+ 만들기]) → CF 단계 끝까지 → [개설하기].
   검사: 단계 수 ≤5 · 기본 경로 클릭 ≤10 · 단계마다 가로 넘침 0 · pageerror 0 · 자동 저장 후 새로고침 이어서 하기 ·
         S.classes 스키마(SURVEY 1절) · 학습자 게시본(lsSnapshot)과 학습자 화면에 차시 · 콘텐츠 반영 · 유형별 필수 항목(CF.cfg) 안내 · 검사.
   사용: node tests/ui/crs-flow.js            (전체)
         CRS_ONLY=voc,adult node tests/ui/crs-flow.js   (일부 유형)
         CRS_SHOTS=<폴더> 이면 단계별 화면을 저장한다.
   다른 테스트(crs-persona.js)가 require해서 도우미를 쓴다. */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = process.env.CRS_ROOT || path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.json': 'application/json', '.woff2': 'font/woff2' };
const TYPES = [['k12'], ['univ', 'lite'], ['adult'], ['public'], ['lifelong'], ['voc'], ['corp']];
const CFG_KEY = (type, ed) => (type === 'univ' ? 'univ' : type);
const REG = /심사|HRD|인정|4시간|30시간|훈련|규정/; /* 규정 안내 문구 */
const KINDS = ['period', 'episode', 'sub', 'pack'];
const ITYPES = ['video', 'doc', 'quiz', 'exam', 'assign', 'survey', 'live', 'offline', 'chapter'];
const NEXT_RE = /^\s*(다음|개설하기|개설|만들기 완료)/;

function serve(port = +process.env.PORT || 0) {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  return new Promise(ok => srv.listen(port, '127.0.0.1', () => ok({ srv, base: `http://127.0.0.1:${srv.address().port}/` })));
}

/* 기관 만들기: 실제 가입 함수 createOrg + 빈 스튜디오 선택 */
async function openOrg(br, base, [type, ed], { empty, vp = { width: 1280, height: 900 }, errs = [] } = {}) {
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: 1 }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`${type}: ${e.message}`)); p.on('dialog', d => d.accept());
  await p.goto(base + 'index.html'); await p.waitForFunction(() => typeof createOrg === 'function');
  await p.evaluate(([type, ed, empty]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', empty ? '1' : '0'); createOrg(type, type === 'univ' ? '점검대학교' : '점검 기관', ed); }, [type, ed, !!empty]);
  await p.waitForFunction(() => window.S && S.org && document.querySelector('.brail, #main')); await p.waitForTimeout(1000);
  await p.evaluate(() => { try { closeModal(); } catch (e) { } });
  return { ctx, p, errs };
}

/* ── 흐름 화면 찾기: C1 권장 표식 [data-cf-root](data-cf-step) → .cf-root/.cf → 모달 → 본문 ── */
const ROOTSEL = '#crsFlow, [data-crs-flow], [data-cf-root], .cf-root';
const rootInfo = p => p.evaluate(sel => { const vis = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const r = [...document.querySelectorAll(sel)].find(vis); let cur = ''; try { cur = window.CF && typeof CF.cur === 'function' ? (CF.cur() || {}).id : ''; } catch (e) { }
  const step = (r && (r.dataset.step || r.dataset.cfStep || (r.querySelector('[data-step]') || {}).dataset?.step)) || cur || '';
  return { on: !!r, step: typeof step === 'object' ? (step.id || '') : String(step || ''), text: r ? r.innerText.slice(0, 4000) : '' }; }, ROOTSEL);
const rootLoc = p => p.locator(ROOTSEL).filter({ visible: true }).first();

/* 단계 화면 측정: 가로 넘침 · 오른쪽으로 잘린 요소 · 작은 버튼 · 작은 본문 글자 · 용어 */
const JARGON = /커리큘럼|편성|시수|루브릭|썸네일|카테고리|모듈|프롬프트|템플릿|LMS|차감반|syllabus|메타데이터|파라미터|인코딩|업로드 큐/;
const measure = (p, sel = ROOTSEL) => p.evaluate(sel => { const W = innerWidth; const R = { over: document.documentElement.scrollWidth - W, cut: [], small: [], tiny: 0, jargon: [] };
  const root = [...document.querySelectorAll(sel)].find(el => el.getClientRects().length) || document.querySelector('#modal') || document.querySelector('#main'); if (!root) return R;
  const scrollX = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return true; return false; };
  root.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    if (r.right > W + 1 && r.left < W && !['fixed', 'absolute'].includes(cs.position) && !scrollX(el) && R.cut.length < 5) R.cut.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} R${Math.round(r.right)}`);
    if (el.matches('button, [role=button], a.btn') && r.height < 40 && /다음|개설|이전|이어서|채워/.test(el.innerText) && R.small.length < 5) R.small.push(`${el.innerText.trim().replace(/\s+/g, ' ').slice(0, 14)} ${Math.round(r.height)}px`);
    if (!el.children.length && el.innerText && el.innerText.trim().length > 8 && parseFloat(cs.fontSize) < 14 && !el.closest('small, .mini, .hint, sup')) R.tiny++; });
  const m = root.innerText.match(new RegExp(/커리큘럼|편성|시수|루브릭|썸네일|카테고리|모듈|프롬프트|템플릿|LMS|차감반|메타데이터|파라미터|인코딩/.source, 'g')); if (m) R.jargon = [...new Set(m)];
  return R; }, sel);

/* 클릭 기록기 */
function clicker(p, log) { let n = 0;
  const clk = async (loc, label, { count = true } = {}) => { await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {}); await loc.click({ timeout: 4000 }); if (count) n++; log.push((count ? '' : '(무료) ') + label); await p.waitForTimeout(250); };
  return { clk, get n() { return n; } }; }
const btnByText = (p, re, scope = 'body') => p.locator(`${scope} button, ${scope} [role=button], ${scope} a.btn`).filter({ visible: true }).filter({ hasText: re });

/* 메뉴 → [+ 만들기] → (시트가 뜨면 직접/단계 선택) → 흐름 */
async function enterFlow(p, C, log) {
  const rail = p.locator('[data-act=go][data-v=learn]').filter({ visible: true }).first();
  if (await rail.count()) await C.clk(rail, '레일: ' + (await rail.getAttribute('title') || '과정'));
  await p.evaluate(() => { if (CUR.tab !== 'class' && typeof menuOn === 'function' && menuOn('class')) { go('class'); } });
  const pri = ['[data-act=cf-open]', '[data-act=crs-new]', '[data-act=sla-clsnew]', '[data-act=cls-new]'];
  let hit = null; for (const s of pri) { const l = p.locator('#main ' + s).filter({ visible: true }).first(); if (await l.count()) { hit = l; break; } }
  if (!hit) hit = btnByText(p, /만들기/, '#main').first();
  if (!(await hit.count())) return false;
  await C.clk(hit, '만들기: ' + (await hit.innerText()).trim().slice(0, 14));
  for (let i = 0; i < 2 && !(await rootInfo(p)).on; i++) { /* 시트 · 선택창 */
    const opt = p.locator('#modal [data-act], .sheet [data-act], [role=dialog] [data-act]').filter({ visible: true }).filter({ hasText: /직접|하나씩|단계|처음부터|만들기/ }).first();
    const resume = p.locator('[data-cfgo=resume]').filter({ visible: true }); if (await resume.count() || await btnByText(p, /이어서 하기/).count()) return 'resume';
    if (await opt.count()) await C.clk(opt, '선택: ' + (await opt.innerText()).trim().slice(0, 14)); else break; }
  return (await rootInfo(p)).on || (await btnByText(p, /이어서/).count()) ? true : false;
}

/* 흐름 끝까지: 기본 경로(이름만 입력 → 다음 … → 개설하기). 막히면 [AI SAM이 채워 주기]를 누르고 기록 */
async function runFlow(p, { type, ed, name, shots, tag, content = true, onStep, fillAll = false } = {}) {
  const log = [], C = clicker(p, log), steps = [], stuck = [], meas = [], regSeen = new Set(); let contentClicks = 0, created = null;
  const before = await p.evaluate(() => S.classes.map(c => c.id));
  await p.evaluate(() => { window.__cfEv = []; try { ['step', 'create', 'error', 'idle', 'back'].forEach(ev => CF.on(ev, x => __cfEv.push([ev, x && (x.id || x.step || x.name || '')]))); } catch (e) { } });
  const ent = await enterFlow(p, C, log); if (!ent) return { fail: '흐름 진입 실패(만들기 버튼 또는 CF 화면 없음)', log, clicks: C.n };
  if (ent === 'resume' || await p.locator('[data-cfgo=resume]').filter({ visible: true }).count()) { const fm = p.locator('[data-cfgo=fresh]').filter({ visible: true }).first(); const fresh = (await fm.count()) ? fm : btnByText(p, /새로|처음부터/).first(); if (await fresh.count()) await C.clk(fresh, '새로 만들기'); }
  for (let i = 0; i < 9; i++) {
    let ri = await rootInfo(p); if (!ri.on) break;
    const sid = ri.step || `#${i + 1}`; if (!steps.includes(sid)) steps.push(sid);
    if (REG.test(ri.text)) regSeen.add(sid);
    const m = await measure(p); meas.push({ step: sid, ...m });
    if (shots) await p.screenshot({ path: path.join(shots, `${tag}_${i + 1}_${sid.replace(/[^\w-]/g, '')}.png`) });
    if (onStep) await onStep(sid, i);
    /* 1단계: 비어 있는 첫 글 입력칸에 과정 이름 */
    if (i === 0) { const inp = rootLoc(p).locator('input[type=text]:visible, input:not([type]):visible, textarea:visible').first(); if (await inp.count() && !(await inp.inputValue())) { await inp.fill(name); log.push('입력: 이름'); } }
    if (content && sid === 'fill') contentClicks += await addDocContent(p, log);
    /* v35.2: 확인 화면의 '빈 차시 N개를 AI로 채울까요?'는 기본 끔. fillAll이면 켠다 */
    if (fillAll && sid === 'open') { const tg = p.locator('#crsFlow [data-cf=fillEmpty]').filter({ visible: true }).first(); if (await tg.count() && !(await tg.isChecked())) { await C.clk(tg, '빈 차시 AI로 채우기'); } }
    const mk = p.locator('#crsFlow [data-cfgo=next], #crsFlow [data-cfgo=create]').filter({ visible: true }).last(); const nx = btnByText(p, NEXT_RE, ROOTSEL.split(',')[0]).last(); let nb = (await mk.count()) ? mk : (await nx.count()) ? nx : btnByText(p, NEXT_RE).last();
    if (!(await nb.count())) { stuck.push(`${sid}: [다음]/[개설하기] 버튼 없음`); break; }
    const label = (await nb.innerText()).trim(); await C.clk(nb, label.slice(0, 10)); await p.waitForTimeout(350);
    const after = await rootInfo(p); const made = await p.evaluate(b => S.classes.filter(c => !b.includes(c.id)).map(c => c.id), before);
    if (made.length) { created = made[0]; break; }
    if (after.on && (after.step || '') === (ri.step || '') && after.step) { /* 넘어가지 않음 → AI SAM 채우기 */
      if (stuck.some(x => x.startsWith(sid + ':'))) { stuck.push(`${sid}: 두 번째도 못 넘어감 → 중단`); break; }
      stuck.push(`${sid}: [${label}] 눌러도 넘어가지 않음 — ${await p.evaluate(() => [...document.querySelectorAll('#crsFlow .cf-err, .toast, .tst')].map(e => e.innerText.trim()).filter(Boolean).slice(-2).join(' / ').slice(0, 90))}`);
      const ai = p.locator('#crsFlow [data-cfgo=ai], #crsFlow [data-cfai]').filter({ visible: true }).first(); if (await ai.count()) { await C.clk(ai, 'AI 채우기'); await p.waitForTimeout(900); const nb2 = btnByText(p, NEXT_RE).last(); if (await nb2.count()) await C.clk(nb2, '다음(재시도)'); }
      const made2 = await p.evaluate(b => S.classes.filter(c => !b.includes(c.id)).map(c => c.id), before); if (made2.length) { created = made2[0]; break; } }
  }
  if (!created) { await p.waitForTimeout(600); const made = await p.evaluate(b => S.classes.filter(c => !b.includes(c.id)).map(c => c.id), before); created = made[0] || null; }
  const ev = await p.evaluate(() => window.__cfEv || []);
  ev.filter(e => e[0] === 'step' && e[1] && !steps.includes(String(e[1]))).forEach(e => steps.push(String(e[1])));
  const post = created ? await p.evaluate(() => { const vis = el => el.getClientRects().length; const t = [...document.querySelectorAll('#modal, #crsFlow, [data-crs-flow], #main')].filter(vis).map(e => e.innerText).join('\n'); return t.slice(0, 3000); }) : '';
  return { created, steps, clicks: C.n, contentClicks, log, stuck, meas, regSeen: [...regSeen], ev, post };
}

/* 차시 채우기: 첫 차시에 AI 교안 하나(C3 CT: .ct-kind[data-k=doc] → CT 창 .ct-pri) — 3번 클릭 안에 결과 */
async function ctConfirm(p, log, max = 4) { let n = 0; for (let k = 0; k < max; k++) { const ok = p.locator('.ct-sh .ct-pri').filter({ visible: true }).last(); let w = 0; while ((!(await ok.count()) || await ok.isDisabled()) && w < 30 && await p.locator('.ct-sh').filter({ visible: true }).count()) { await p.waitForTimeout(1000); w++; } if (!(await ok.count()) || await ok.isDisabled()) break; const lb = (await ok.innerText().catch(() => '')).trim(); await ok.click({ timeout: 4000 }).catch(() => {}); n++; log.push('CT: ' + lb.slice(0, 12)); await p.waitForTimeout(900); if (!(await p.locator('.ct-sh').filter({ visible: true }).count())) break; } return n; }
async function addDocContent(p, log) {
  const card = p.locator('#crsFlow .ct-kind[data-k=doc]').filter({ visible: true }).first();
  if (!(await card.count())) { log.push('콘텐츠: 교안 카드(.ct-kind[data-k=doc]) 없음'); return 0; }
  const n0 = await p.evaluate(() => ((CF.draft || {}).curriculum || []).length);
  await card.click({ timeout: 4000 }); log.push('콘텐츠: 교안'); await p.waitForTimeout(600); const n = 1 + await ctConfirm(p, log);
  const n1 = await p.evaluate(() => ((CF.draft || {}).curriculum || []).length); if (n1 <= n0) log.push('콘텐츠: 교안이 초안에 안 들어감');
  return n; }

/* S.classes 스키마(SURVEY 1절) · 학습자 게시본 */
const schemaCheck = (p, id) => p.evaluate(([id, KINDS, ITYPES]) => { const c = S.classes.find(x => x.id === id); const E = []; if (!c) return ['과정 없음'];
  if (typeof C === 'function' && C(id) !== c) E.push('C(id) 조회 불가');
  if (!c.name || typeof c.name !== 'string') E.push('name'); if (!KINDS.includes(c.kind)) E.push('kind=' + c.kind); if (typeof c.status !== 'string' || !c.status) E.push('status');
  if (typeof c.price !== 'number' || isNaN(c.price)) E.push('price=' + c.price); if (!Array.isArray(c.learners)) E.push('learners'); if (!c.prog || typeof c.prog !== 'object') E.push('prog');
  const k = c.criteria || {}; ['video', 'exam', 'assign', 'threshold'].forEach(x => { if (typeof k[x] !== 'number') E.push('criteria.' + x); });
  if (k.video + k.exam + k.assign && k.video + k.exam + k.assign !== 100) E.push(`criteria 합 ${k.video + k.exam + k.assign}`);
  if (!('start' in c) || !('end' in c)) E.push('start/end'); if (typeof c.teacher !== 'string') E.push('teacher');
  const cu = c.curriculum || []; if (!cu.length) E.push('curriculum 비어 있음'); const ids = new Set();
  const bad = {}; const add = (k, v) => { (bad[k] = bad[k] || []).push(v); };
  cu.forEach((it, i) => { if (!it.id || ids.has(it.id)) add('id 중복/없음', i); ids.add(it.id); if (!ITYPES.includes(it.type)) add('type', it.type); if (!it.title) add('title 없음', i); if (it.type !== 'chapter' && !(+it.week >= 1)) add('week 없음', it.type); });
  Object.entries(bad).forEach(([k, v]) => E.push(`항목 ${k} ${v.length}/${cu.length}개(${[...new Set(v)].slice(0, 3).join(',')})`));
  if (c.weekPlan && !Array.isArray(c.weekPlan)) E.push('weekPlan'); (c.weekPlan || []).forEach((w, i) => { if (!w || !w.title) E.push(`weekPlan${i}.title`); });
  const weeks = new Set(cu.filter(i => i.type !== 'chapter').map(i => +i.week)); const wp = (c.weekPlan || []).length; const fill = (c.crs || {}).fill;
  /* v35.2: 빈 차시는 확인 화면에서 고른 경우(c.crs.fill)만 AI로 채운다. 끄면 직접 넣은 차시만 항목이 있어야 한다 */
  if (fill !== false && wp && weeks.size < Math.min(wp, 60)) E.push(`차시 ${wp}개 중 항목 있는 차시 ${weeks.size}`);
  if (fill === false && c.kind !== 'episode' && weeks.size > 1) E.push(`빈 차시를 묻지 않고 채움(항목 있는 차시 ${weeks.size}개, 직접 넣은 차시는 1개)`);
  return E; }, [id, KINDS, ITYPES]);
const snapCheck = (p, id) => p.evaluate(id => { const E = []; const c = S.classes.find(x => x.id === id); let s; try { s = lsSnapshot(); } catch (e) { return ['lsSnapshot 오류 ' + e.message]; }
  const x = (s.classes || []).find(y => y.id === id); if (!x) return ['게시본에 과정 없음(status=' + c.status + ')'];
  const n = Math.min(200, (c.curriculum || []).length); if ((x.items || []).length !== n) E.push(`게시본 항목 ${(x.items || []).length}/${n}`);
  const rich = it => it.doc || it.ai || it.url || it.yt || it.fileId || (it.qs || []).length || it.desc || it.html || (it.files || []).length;
  const src = (c.curriculum || []).filter(rich); const pub = (x.items || []).filter(y => y.yt || y.desc || (y.qs || []).length || y.doc || y.html || y.ai || y.link || y.fileId || y.url || (y.files || []).length);
  if (src.length && !pub.length) E.push(`콘텐츠 ${src.length}개가 게시본에 안 실림(제목만)`);
  const docs = (c.curriculum || []).filter(i => i.doc && (i.doc.secs || []).length); const miss = docs.filter(d => { const y = (x.items || []).find(z => z.id === d.id); return y && !(y.doc || y.html || (y.desc && y.desc.length > 40)); }); if (miss.length) E.push(`AI 교안 ${miss.length}/${docs.length}개 본문이 게시본에 없음(제목만, 예: '${miss[0].title.slice(0, 16)}')`);
  return { E, items: (x.items || []).length, content: pub.length, srcContent: src.length }; }, id);

/* 학습자 화면: 게시 → learner.html#c/<id> 에 과정 이름과 첫 차시 */
async function learnerCheck(ctx, p, base, id, errs) {
  const r = await p.evaluate(id => { try { closeModal(); } catch (e) { } const c = S.classes.find(x => x.id === id); c.status = c.status === '준비중' ? c.status : c.status; if (c.open === '비공개') c.open = '전체'; (window.smPublish || ACT['ls-pub'])(); try { closeModal(); } catch (e) { } let code = null; try { code = lxDemo(); (window.smPublish || ACT['ls-pub'])(); } catch (e) { } try { closeModal(); } catch (e) { } return { tid: DREG.cur(), name: c.name, first: ((c.curriculum || []).find(i => i.type !== 'chapter') || {}).title || '' }; }, id);
  const l = await ctx.newPage(); l.on('pageerror', e => errs.push('learner: ' + e.message)); await l.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
  await l.goto(base + `learner.html?t=${encodeURIComponent(r.tid)}#class/${id}`); await l.waitForFunction(() => typeof LR !== 'undefined' && LR.site, null, { timeout: 8000 }).catch(() => {}); await l.waitForTimeout(800);
  const txt = await l.evaluate(() => document.body.innerText); const site = await l.evaluate(id => { const c = ((typeof LR !== 'undefined' && LR.site && LR.site.classes) || []).find(x => x.id === id); return c ? { name: c.name, items: (c.items || []).map(i => i.title) } : null; }, id); await l.close();
  /* 회원 공개(예: 대학 '회원')는 방문자 상세에 안 보이므로 학습자 앱이 읽은 게시본(LR.site)으로 확인 */
  return { name: txt.includes(r.name) || !!(site && site.name === r.name), first: !r.first || txt.includes(r.first.slice(0, 12)) || !!(site && site.items.includes(r.first)), r, vis: txt.includes(r.name) };
}

/* 자동 저장 → 새로고침 → [이어서 하기] */
async function resumeCheck(br, base, tc, opt) { const errs = []; const { ctx, p } = await openOrg(br, base, tc, { ...opt, errs }); const E = [];
  try { const log = [], C = clicker(p, log); if (!(await enterFlow(p, C, log))) { await ctx.close(); return ['흐름 진입 실패']; }
    const inp = rootLoc(p).locator('input[type=text]:visible, input:not([type]):visible, textarea:visible').first(); const nm = '이어하기 점검 과정'; if (await inp.count()) await inp.fill(nm);
    const s1 = (await rootInfo(p)).step; const nm2 = p.locator('#crsFlow [data-cfgo=next]').filter({ visible: true }).last(); const nb = (await nm2.count()) ? nm2 : btnByText(p, /^\s*다음/).last(); if (await nb.count()) await nb.click(); await p.waitForTimeout(1300);
    const s2 = (await rootInfo(p)).step; const d = await p.evaluate(() => (Store.get() || {}).crsDraft || null);
    if (!d) E.push('S.crsDraft가 저장되지 않음'); else if (!JSON.stringify(d).includes(nm)) E.push('초안에 이름 없음');
    await p.reload(); await p.waitForFunction(() => window.S && S.org); await p.waitForTimeout(900);
    const C2 = clicker(p, []); const ent = await enterFlow(p, C2, []); const rm = p.locator('[data-cfgo=resume]').filter({ visible: true }).first(); const rb = (await rm.count()) ? rm : btnByText(p, /이어서/).first();
    if (!(await rb.count())) E.push('새로고침 후 [이어서 하기] 안내 없음(진입=' + ent + ')'); else { await rb.click(); await p.waitForTimeout(500);
      const s3 = (await rootInfo(p)).step; if (s2 && s3 !== s2) E.push(`이어서 한 단계 ${s3} ≠ 저장 단계 ${s2}(처음 ${s1})`);
      const has = await p.evaluate(nm => JSON.stringify(CF.draft || {}).includes(nm) || [...document.querySelectorAll('input, textarea')].some(i => i.value === nm) || document.body.innerText.includes(nm), nm); if (!has) E.push('이어서 한 화면에 이름이 없음'); }
  } catch (e) { E.push('예외 ' + e.message.split('\n')[0]); }
  if (errs.length) E.push('pageerror ' + errs.slice(0, 2).join(' / ')); await ctx.close(); return E; }

/* CF.cfg 유형 설정 · 필수 항목 검사(C2) */
const cfgCheck = (p, key) => p.evaluate(key => { const E = []; if (!window.CF) return ['window.CF 없음']; const g = (CF.cfg || {})[key]; if (!g) return [`CF.cfg.${key} 없음`];
  if (!Array.isArray(g.steps) || !g.steps.length) E.push('steps 없음'); else if (g.steps.length > 5) E.push(`단계 ${g.steps.length}개(>5)`);
  if (!Array.isArray(g.required)) E.push('required 배열 없음');
  if (['voc', 'corp', 'lifelong'].includes(key)) { if (typeof g.check !== 'function') E.push('check(d) 없음'); else { let w = []; try { w = g.check({ name: '점검', sessions: 2, mins: 50, price: 300000, paid: true, refund: true, mode: 'remote', cat: 'job', items: [] }) || []; } catch (e) { E.push('check 예외 ' + e.message); }
    if (!w.length) E.push('규정 미달 초안에 경고 0건'); else if (!w.some(x => /심사|HRD|인정|4시간|30시간|분량|시간/.test(typeof x === 'string' ? x : JSON.stringify(x)))) E.push('경고에 규정 항목 언급 없음: ' + JSON.stringify(w).slice(0, 80)); } }
  return E; }, key);

module.exports = { ctConfirm, serve, openOrg, enterFlow, runFlow, rootInfo, measure, clicker, btnByText, schemaCheck, snapCheck, learnerCheck, resumeCheck, cfgCheck, TYPES, ROOTSEL, JARGON };

if (require.main === module) (async () => {
  const only = (process.env.CRS_ONLY || '').split(',').filter(Boolean); const shots = process.env.CRS_SHOTS || ''; if (shots) fs.mkdirSync(shots, { recursive: true });
  const { srv, base } = await serve(); const br = await chromium.launch(); const rows = []; let F = 0;
  const cases = TYPES.filter(([t, e]) => !only.length || only.includes(t) || only.includes(`${t}/${e}`));
  const plan = [...cases.flatMap(tc => [[tc, true, 'pc'], [tc, false, 'pc']]), ...cases.map(tc => [tc, true, 'm'])];
  for (const [tc, empty, dev] of plan) {
    const [type, ed] = tc; const label = `${ed ? type + '/' + ed : type} ${empty ? '빈' : '채움'} ${dev === 'm' ? '390' : 'PC'}`; const errs = []; const P = []; const W = [];
    const vp = dev === 'm' ? { width: 390, height: 844 } : { width: 1280, height: 900 };
    const { ctx, p } = await openOrg(br, base, tc, { empty, vp, errs });
    try {
      const cf = await cfgCheck(p, CFG_KEY(type, ed)); cf.forEach(x => P.push('cfg: ' + x));
      const r = await runFlow(p, { type, ed, name: `${type} 점검 과정`, shots, fillAll: !empty && dev === 'pc', tag: `${type}${ed ? '-' + ed : ''}_${empty ? 'e' : 'f'}_${dev}` });
      if (r.fail) P.push(r.fail);
      else {
        if (!r.created) P.push('개설되지 않음(S.classes 변화 없음) 경로: ' + r.log.join(' › '));
        if (r.steps.length > 5) P.push(`단계 ${r.steps.length}개(>5): ${r.steps.join(',')}`);
        if (r.clicks > 10) P.push(`기본 경로 클릭 ${r.clicks}회(>10): ${r.log.join(' › ')}`);
        r.stuck.forEach(s => W.push('막힘 ' + s));
        r.meas.forEach(m => { if (m.over > 0) P.push(`${m.step} 가로 넘침 ${m.over}px`); if (m.cut.length) P.push(`${m.step} 잘림 ${m.cut.join(' ')}`); if (m.small.length) W.push(`${m.step} 버튼 48px 미만 ${m.small.join(' ')}`); if (m.jargon.length) W.push(`${m.step} 어려운 말 ${m.jargon.join(',')}`); if (m.tiny > 3) W.push(`${m.step} 14px 미만 글 ${m.tiny}곳`); });
        if (['voc', 'corp', 'lifelong'].includes(type) && !r.regSeen.length) P.push('흐름 안에 규정(심사코드 · HRD · 인정 · 분량) 안내 없음');
        if (r.created) {
          const sc = await schemaCheck(p, r.created); sc.forEach(x => P.push('스키마 ' + x));
          const sn = await snapCheck(p, r.created); if (Array.isArray(sn)) sn.forEach(x => P.push('게시본 ' + x)); else { sn.E.forEach(x => P.push('게시본 ' + x)); if (!sn.content) W.push(`게시본 콘텐츠 0(항목 ${sn.items}개 제목만)`); }
          const done = await p.evaluate(() => [...document.querySelectorAll('[data-cfdone]')].filter(e => e.getClientRects().length).map(e => e.dataset.cfdone)); if (done.length < 2 && !/할 일|해 보세요/.test(r.post)) W.push('개설 후 다음 할 일 안내 못 찾음'); else if (done.filter(k => !['close', 'pv'].includes(k)).length > 3) W.push(`개설 후 안내 버튼 ${done.length}개(2~3 권장)`);
          if (shots) await p.screenshot({ path: path.join(shots, `${type}${ed ? '-' + ed : ''}_${empty ? 'e' : 'f'}_${dev}_9done.png`) });
          if (dev === 'pc') { const lc = await learnerCheck(ctx, p, base, r.created, errs); if (!lc.name) P.push('학습자 화면에 과정 이름 없음'); if (!lc.first) P.push('학습자 화면에 첫 차시 없음'); }
        }
        rows.push({ label, steps: r.steps.length, clicks: r.clicks, content: r.contentClicks, ok: 0 });
      }
    } catch (e) { P.push('예외 ' + e.message.split('\n')[0]); }
    if (errs.length) P.push('pageerror ' + [...new Set(errs)].slice(0, 3).join(' / '));
    await ctx.close();
    if (dev === 'pc' && empty) { const rs = await resumeCheck(br, base, tc, { empty }); rs.forEach(x => P.push('이어하기 ' + x)); }
    const row = rows.find(x => x.label === label) || { label, steps: '-', clicks: '-', content: '-' };
    console.log(`${P.length ? '✗' : '✓'} ${label}  단계 ${row.steps} · 클릭 ${row.clicks} (+콘텐츠 ${row.content})`); P.forEach(x => console.log('   ✗ ' + x)); W.forEach(x => console.log('   △ ' + x));
    if (P.length) F++;
  }
  await br.close(); srv.close();
  console.log(F ? `✗ crs-flow 실패 ${F}/${plan.length}` : `✓ crs-flow 통과 ${plan.length}/${plan.length}`); process.exit(F ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
