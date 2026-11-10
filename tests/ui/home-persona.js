'use strict';
/* v37 첫 화면(AI 비서 홈) 호칭 · 페르소나 워딩 + 유형 정보 일치 점검.
   1) 7개 유형 + 대학 lms/lite: '안녕하세요, ○○님' 호칭 · 예시 문장 · 추천 칩 · 레일 라벨이 그 기관 담당자 · 용어(TERMS)에 맞는지.
   2) 유형 변경(공공 → 대학): 레일 라벨 · 호칭 · 사이트 메뉴 이름(HPS.menuName) · 대학 에디션이 모두 새 유형을 따르는지(첨부 '닉 Univ' 재현).
   사용: node tests/ui/home-persona.js  (DUMP=1 이면 유형별 표를 출력) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const CASES = [
  ['univ', 'lms', '학사 담당자님', ['학생', '교과목'], /강좌|수강생|원생|임직원|채점|질문 답변/],
  ['univ', 'lite', '센터 담당자님', ['학생', '교과목'], /강좌|수강생|원생|임직원|질문 답변/],
  ['corp', '', 'HRD 담당자님', ['임직원', '교육과정'], /원생|학생|청구/],
  ['public', '', '교육 담당자님', ['교육생', '교육과정'], /원생|임직원|청구/],
  ['k12', '', '원장님', ['원생', '수업'], /임직원|훈련생|법정/],
  ['adult', '', '원장님', ['수강생', '강좌'], /청구|원생|임직원|보호자/],
  ['lifelong', '', '운영 담당자님', ['수강생', '강좌'], /원생|임직원|청구/],
  ['voc', '', '훈련 담당자님', ['훈련생', '훈련과정'], /원생|임직원|청구/]
];
const PUB = ['교육신청', '참여마당', '알림마당'];
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const open = async () => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(`${base}/index.html`, { waitUntil: 'load' }); return { ctx, p, errs }; };
  const read = p => p.evaluate(() => ({ h1: (document.querySelector('#aihH') || {}).textContent || '', ph: (document.querySelector('#aihQ') || {}).placeholder || '',
    chips: [...document.querySelectorAll('.aih-chips .chip')].map(x => x.textContent.trim()), rail: [...document.querySelectorAll('nav .ri span')].map(x => x.textContent.trim()),
    cls: t('cls'), lrn: t('learner') }));
  for (const [type, ed, who, terms, bad] of CASES) { const { ctx, p, errs } = await open();
    await p.evaluate(([t1, e1]) => { createOrg(t1, '점검 기관', e1 || undefined); go('home'); render(); }, [type, ed]); await p.waitForTimeout(250);
    const r = await read(p); const label = type + (ed ? '/' + ed : '');
    if (process.env.DUMP) console.log('  ', label, '|', who, '|', r.ph, '|', r.chips.join(' · '), '|', r.rail.join(' · '));
    ok(r.h1.includes(`안녕하세요, ${who}.`), `${label}: 호칭 '${who}' — ${r.h1.replace(/\s+/g, ' ')}`);
    ok(r.cls === terms[1] && r.lrn === terms[0] && (ed === 'lms' ? !r.rail.some(x => /교육생|수강생|원생|임직원|훈련생|교육과정|강좌/.test(x)) /* 학사 LMS는 업무 단위 3단 메뉴(ulms) */ : r.rail.includes(terms[0]) && r.rail.includes(terms[1])), `${label}: 레일 · 용어 ${terms.join(' · ')} — ${r.rail.join(' · ')}`);
    ok(r.ph.length > 4 && !bad.test(r.ph) && !r.chips.some(c => bad.test(c)), `${label}: 예시 · 추천 칩에 다른 유형 말 없음 — ${r.ph} / ${r.chips.join(' · ')}`);
    ok(!errs.length, `${label}: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }
  /* 유형 변경: 공공 기관 '닉 Univ'를 대학으로 */
  { const { ctx, p, errs } = await open();
    await p.evaluate(() => { createOrg('public', '닉 Univ'); go('settings'); render(); });
    const pubMenus = await p.evaluate(() => { const s = S.lsite || S.site || {}; const M = (S.site && S.site.menus) || []; return M.map(m => Array.isArray(m) ? m[0] : m.l).filter(Boolean).map(l => HPS.menuName(l)); });
    ok(pubMenus.some(l => PUB.includes(l)), `공공: 사이트 메뉴가 공공 이름 — ${pubMenus.join(' · ')}`);
    await p.evaluate(() => { ACT['type-chg']({ dataset: { v: 'univ' } }); }); await p.waitForTimeout(100); await p.click('#modal [data-mact="ok"], .mwrap [data-mact="ok"]'); await p.waitForTimeout(300);
    await p.evaluate(() => { go('home'); render(); }); await p.waitForTimeout(250);
    const r = await read(p); const st = await p.evaluate(() => ({ ty: S.org.type, ed: S.org.ed, menus: ((S.site && S.site.menus) || []).map(m => Array.isArray(m) ? m[0] : m.l).filter(Boolean).map(l => HPS.menuName(l)), stored: ((S.site && S.site.menus) || []).map(m => Array.isArray(m) ? m[0] : m.l) }));
    ok(st.ty === 'univ' && st.ed === 'lite', `유형 변경 → 대학: 에디션 ${st.ed}`);
    ok(r.h1.includes('센터 담당자님') && r.rail.includes('학생') && r.rail.includes('교과목') && !r.rail.includes('교육생'), `유형 변경 → 호칭 · 레일 일치 — ${r.h1.replace(/\s+/g, ' ')} / ${r.rail.join(' · ')}`);
    ok(!st.menus.some(l => PUB.includes(l)), `유형 변경 → 사이트 메뉴 이름이 대학 이름 — ${st.menus.join(' · ')} (저장값 ${st.stored.join(' · ')})`);
    const pub2 = await p.evaluate(() => ['교육신청', '참여마당', '알림마당', '자료실'].map(l => HPS.menuName(l)));
    ok(pub2.join() === '교과목,학습 커뮤니티,공지,자료실', `HPS.menuName: 다른 유형 이름도 지금 유형 이름으로 — ${pub2.join(' · ')}`);
    ok(!errs.length, `유형 변경: 오류 없음 ${errs.slice(0, 2).join(' | ')}`); await ctx.close(); }
  await browser.close(); srv.close();
  if (fails.length) { console.error(`실패 ${fails.length}건`); process.exit(1); }
  console.log('✓ 첫 화면 호칭 · 페르소나 · 유형 일치 점검 통과');
})().catch(e => { console.error(e); process.exit(1); });
