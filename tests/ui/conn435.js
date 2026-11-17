'use strict';
/* v43.5 외부 연결 카탈로그(connx.js) · 학습자 「앱 및 서비스 연결」(lconn.js) — 대표님 2026-11-17 시안 v2 반영
   사용: node tests/ui/conn435.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const studio = async (type, w = 1440) => { const p = await br.newPage({ viewport: { width: w, height: 1000 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(base + '/index.html'); await p.evaluate(async t => { createOrg(t, '점검 학원'); await new Promise(o => setTimeout(o, 60)); if (typeof slMenuSet === 'function') slMenuSet('conn', true); go('conn'); render(); }, type); await p.waitForTimeout(250); return { p, errs }; };

  { const { p, errs } = await studio('k12');
    ok(await p.$('.cx-hero') && await p.$('.cx-grps'), 'k12: 카탈로그(머리 카드 · 분야 묶음)');
    const ids = await p.evaluate(() => [...document.querySelectorAll('.cx-row[data-v]')].map(x => x.dataset.v));
    ['alimtalk', 'sms', 'toss', 'naverpay', 'nicepay', 'nbook', 'youtube', 'zoom', 'google', 'claude', 'mcp'].forEach(id => ok(ids.includes(id), `k12: ${id} 줄`));
    ok(await p.evaluate(() => /카카오 알림톡/.test(document.querySelector('.cx-hero h2').textContent)), 'k12: 학원 추천 첫 줄 = 알림톡');
    ok(await p.evaluate(() => [...document.querySelectorAll('.cx-row[data-v=alimtalk] .brl svg, .cx-row[data-v=youtube] .brl svg')].length === 2), '공식 로고(알림톡 = 카카오톡 심볼, YouTube) — SVG');
    ok(await p.evaluate(() => /SMS/.test(document.querySelector('.cx-row[data-v=sms] .brl').textContent)), '문자 = 글자 타일(회사 로고 아님)');
    /* 문자: 형식 검사 → 연결됨 */
    await p.evaluate(() => ACT['sl-cn']({ dataset: { v: 'sms' } })); await p.waitForTimeout(150);
    ok(!!(await p.$('#cnCard-sms .cx-steps')) && /받는 사람이 보는 모습/.test(await p.textContent('#cnCard-sms')), '문자 연결 창: 3단계 · 미리보기');
    await p.fill('#cx-sms-tel', '12345'); await p.click('#cnCard-sms [data-act=cnx-save]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => cnStatus('sms').st) === '미연결', '문자: 잘못된 발신번호는 저장 안 됨');
    await p.fill('#cx-sms-tel', '051-123-4567'); await p.fill('#cx-sms-key', 'abcDEF1234567890xyz'); await p.click('#cnCard-sms [data-act=cnx-save]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => cnStatus('sms').st) === '연결됨', '문자: 발신번호 · 키 → 연결됨');
    ok(await p.evaluate(() => !JSON.stringify(S).includes('abcDEF1234567890xyz') && !document.body.innerHTML.includes('abcDEF1234567890xyz')), '문자 API 키는 S · 화면에 없음(가림)');
    /* 알림톡: 검수 중 → 진행 중 → 검수 완료 */
    await p.evaluate(() => ACT['sl-cn']({ dataset: { v: 'alimtalk' } })); await p.waitForTimeout(150);
    await p.fill('#cx-alimtalk-key', 'a'.repeat(40)); await p.fill('#cx-alimtalk-n', '2'); await p.click('#cnCard-alimtalk [data-act=cnx-save]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => cnStatus('alimtalk').st) === '진행 중', '알림톡: 템플릿 검수 중 → 진행 중');
    await p.evaluate(() => ACT['cnx-demo']({ dataset: { v: 'alimtalk' } })); await p.waitForTimeout(100);
    ok(await p.evaluate(() => cnStatus('alimtalk').st) === '연결됨', '알림톡: 검수 완료 → 연결됨');
    /* 레시피: 결석 → 알림톡 → 실패 시 문자 — 연결 후 바로 켜짐 */
    ok(await p.evaluate(() => { const r = cnMake('absent-alim'); return r && !r.miss.length && r.a.on; }), '레시피: 결석 → 알림톡 + 문자(연결 후 켜진 채로)');
    /* 네이버 예약: 주소 남기기 → 협의 중 */
    await p.evaluate(() => ACT['sl-cn']({ dataset: { v: 'nbook' } })); await p.waitForTimeout(120); await p.fill('#cx-nbook-url', 'https://naver.me/abcd'); await p.click('#cnCard-nbook [data-act=cnx-save]'); await p.waitForTimeout(120);
    ok(await p.evaluate(() => cnStatus('nbook').st) === '진행 중', '네이버 예약: 협의 중(진행 중)');
    ok(await p.evaluate(() => cnAlias('알림톡 연결 도와줘') === 'alimtalk' && cnAlias('문자') === 'sms' && cnAlias('네이버페이') === 'naverpay'), 'AI SAM: 새 연결 이름 인식');
    ok(!errs.length, 'k12 오류 없음 ' + errs.join(' | ')); await p.close(); }

  { const { p, errs } = await studio('univ');
    const ids = await p.evaluate(() => [...document.querySelectorAll('.cx-row[data-v]')].map(x => x.dataset.v));
    ok(!ids.includes('naverpay') && !ids.includes('toss'), '대학(결제 끔): 결제 줄 숨김');
    await p.evaluate(() => { UI.cxSeg = 'lrn'; render(); }); await p.waitForTimeout(100);
    ok(await p.evaluate(() => /학번 · 학과 외 정보를 받지 않/.test(document.querySelector('.cx').textContent) && [...document.querySelectorAll('.cx-lr.off')].length >= 2), '대학 학습자 연결: 휴대폰 · SNS 숨김 안내');
    ok(!errs.length, 'univ 오류 없음 ' + errs.join(' | ')); await p.close(); }

  { const { p, errs } = await studio('k12', 390);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '390px: 가로 넘침 없음');
    ok(await p.evaluate(() => [...document.querySelectorAll('.cx-row, .cx-seg button, .cx-cat')].filter(e => e.offsetParent).every(e => e.getBoundingClientRect().height >= 40)), '390px: 누르는 칸 40px 이상');
    ok(!errs.length, '390 오류 없음'); await p.close(); }

  const learner = async (demo, sid, app) => { const ctx = await br.newContext({ viewport: { width: app ? 390 : 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(([sid, app]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid, dept: '', id: sid })); if (app) localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, [sid, app]);
    await p.goto(`${base}/learner.html?demo=${demo}${app ? '&app=1' : ''}#connect`); await p.waitForTimeout(1100); const rows = await p.evaluate(() => [...document.querySelectorAll('.lcx-r b')].map(x => x.textContent)); return { ctx, p, errs, rows }; };
  { const { ctx, p, errs, rows } = await learner('adult', '20269000', 1); ok(rows.some(r => /카카오톡 알림/.test(r)) && rows.some(r => /내 캘린더/.test(r)) && !rows.some(r => /문자 알림/.test(r)), '학원 학습자: 캘린더 · 카카오톡(문자 없음)');
    ok(/노트 앱으로 내보내기/.test(rows[0]) && rows.some(r => /복습 카드/.test(r)) && rows.some(r => /GitHub/.test(r)), '학습 · AI 튜터 묶음이 맨 위(노트 · 복습 카드 · GitHub)');
    /* v43.6: 「노트 앱으로 내보내기」 줄 → 셀프러닝 노트 「내보내기 · 연결」 허브(#notes/out — .md 내려받기는 허브 안, tests/ui/note436-sync.js) */
    await p.click('[data-lcx="out"]'); await p.waitForTimeout(300); ok(/#notes\/out$/.test(p.url()) && !!(await p.$('.lns-hero')), '노트 앱으로 내보내기 → #notes/out 허브');
    { const [d] = await Promise.all([p.waitForEvent('download'), p.click('[data-lns="md"].lns-c')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(/\.md$/.test(d.suggestedFilename()) && /이름 · 연락처 · 학번은 넣지 않았어요/.test(t) && !/20269000/.test(t), '허브 .md: 개인정보 없음'); }
    await p.evaluate(() => { location.hash = '#connect'; }); await p.waitForTimeout(400);
    { const [d] = await Promise.all([p.waitForEvent('download'), p.click('[data-lcx="csv"]')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(/\.csv$/.test(d.suggestedFilename()) && /앞면\(질문\),뒷면\(정답\)/.test(t) && t.split('\n').length >= 2, '복습 카드 내보내기(.csv): 질문 · 정답'); }
    await p.click('[data-lcx="gh"]'); await p.fill('.lcx-f input[name=u]', 'github.com/x'); await p.click('.lcx-f [type=submit]'); ok(/형식의 주소/.test(await p.textContent('.lcx-f .err')), 'GitHub: 잘못된 주소 거절');
    await p.fill('.lcx-f input[name=u]', 'https://github.com/santa/hw1'); await p.click('.lcx-f [type=submit]'); await p.waitForTimeout(300); ok(await p.evaluate(() => !!(LR.lp.conn && LR.lp.conn.gh && LR.lp.conn.gh.on) && /santa\/hw1/.test(document.querySelector('.lcx').textContent)), 'GitHub: 공개 저장소 연결(토큰 없음)');
    ok(!errs.length, '학원 학습자 오류 없음 ' + errs.join(' | ')); await ctx.close(); }
  { const { ctx, errs, rows } = await learner('1', '20260001', 1); ok(rows.length >= 1 && !rows.some(r => /카카오톡|문자|간편 로그인|GitHub/.test(r)), '대학 학습자: 휴대폰 · SNS · GitHub 연결 없음(학번 · 학과만)'); ok(!errs.length, '대학 학습자 오류 없음'); await ctx.close(); }
  { const { ctx, p, errs, rows } = await learner('sports', '20269001', 0); ok(rows.some(r => /문자 알림/.test(r)) && !rows.some(r => /카카오톡 알림/.test(r)), '공단 학습자(웹): 문자 알림 줄'); ok(!!(await p.$('.sm43')), '공단: 기존 문자 알림 카드 유지'); ok(!errs.length, '공단 오류 없음'); await ctx.close(); }

  await br.close(); srv.close(); console.log(`conn435: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
