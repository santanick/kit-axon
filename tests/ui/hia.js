'use strict';
/* 보안 2차(체크리스트 02) 고영향 AI 자가판정 — AI 관리 › AI기본법 탭의 기능별 자가판정 · 사람 최종 판단 기록
   ① 표가 기능 8개를 보여 준다 ② 질문을 바꾸면 자가판정이 바뀐다 ③ 사유 없이 저장하면 거절 ④ 저장하면 판단자 · 일시 · 이력 · 감사 기록
   ⑤ 질문이 바뀌면 「재판단 필요」 ⑥ 전 기능 판단 시 LAW hia 자동 체크 ⑦ 교수자는 기록 불가 ⑧ 오류 0
   사용: flock /tmp/pw.lock node tests/ui/hia.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok));
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof createOrg === 'function');
  const R = await page.evaluate(async () => {
    localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const out = []; const ok = (n, c, d) => out.push([!!c, n, d === undefined ? '' : JSON.stringify(d)]); const wait = ms => new Promise(r => setTimeout(r, ms));
    createOrg('univ', '판정 대학', 'lms'); await wait(800); S.me.role = 'owner';
    const open = () => { UI.aiT = 'law'; go('aigov'); render(); }; const card = () => document.querySelector('#hiaCard');
    open(); await wait(30);
    ok('자가판정 표 · 기능 8개', card() && card().querySelectorAll('tbody tr').length === 8, card() && card().querySelectorAll('tbody tr').length);
    ok('LAW 목록에 hia 항목(자동 · 비활성)', !!document.querySelector('[data-chg="ai-law"][data-k="hia"][disabled]'));
    const rowOf = k => card().querySelector(`[data-act="hia-final"][data-k="${k}"]`).closest('tr');
    ok('채점 보조 기본 = 평가 예 · 해당 가능성 낮음', /해당 가능성 낮음/.test(rowOf('grade').innerText) && HIA.state().hia.grade.q.eval === true);
    const auto = card().querySelector('[data-chg="hia-q"][data-k="grade"][data-q="auto"]'); auto.checked = true; ACT['hia-q'](auto); await wait(20);
    ok('자동 확정 예 → 검토 필요', /검토 필요/.test(rowOf('grade').innerText));
    rowOf('grade').querySelector('[data-act="hia-final"]').click(); await wait(30);
    const m = document.querySelector('#modal'); ok('최종 판단 창(기본값 조건부)', m && m.querySelector('[name="final"]').value === 'cond');
    m.querySelector('[name="note"]').value = ''; m.querySelector('[data-mact="ok"]').click(); await wait(20);
    ok('사유 없으면 거절(창 유지)', !!document.querySelector('#modal') && !HIA.state().hia.grade.final);
    document.querySelector('#modal [name="note"]').value = '채점 초안만 만들고 교수가 확정'; document.querySelector('#modal [data-mact="ok"]').click(); await wait(30);
    const g = HIA.state().hia.grade;
    ok('저장 → 판단 · 판단자 · 일시 · 이력', g.final === 'cond' && g.by && g.at && HIA.state().hiaLog.length === 1, g);
    ok('감사 기록', (S.audit || []).some(a => /고영향 AI 최종 판단/.test(a.what)));
    ok('화면: 조건부 비해당 · 이력 1건', /조건부 비해당/.test(rowOf('grade').innerText) && /판단 이력 1건/.test(card().innerText));
    const a2 = card().querySelector('[data-chg="hia-q"][data-k="grade"][data-q="auto"]'); a2.checked = false; ACT['hia-q'](a2); await wait(20);
    ok('질문 변경 → 재판단 필요', /재판단 필요/.test(rowOf('grade').innerText));
    ok('전 기능 미완료 → hia 미체크', !lmsEns().ai.law.hia);
    for (const [k] of HIA.fn) { document.querySelector(`#hiaCard [data-act="hia-final"][data-k="${k}"]`).click(); await wait(10); document.querySelector('#modal [name="note"]').value = '시험 판단'; document.querySelector('#modal [data-mact="ok"]').click(); await wait(10); }
    ok('전 기능 판단 → LAW hia 자동 체크', lmsEns().ai.law.hia === true && !!document.querySelector('[data-chg="ai-law"][data-k="hia"]:checked'));
    ok('이력 누적', HIA.state().hiaLog.length === 1 + HIA.fn.length);
    S.me.role = 'teacher'; open(); await wait(20);
    const th = VIEWS.aigov(); ok('교수자: 판단 기록 버튼 없음 · 질문 비활성(메뉴 자체도 교수자 제외)', !/data-act="hia-final"/.test(th) && /data-chg="hia-q"[^>]*disabled/.test(th));
    const n0 = HIA.state().hiaLog.length; ACT['hia-final']({ dataset: { k: 'tutor' } }); await wait(20);
    ok('교수자: 직접 호출도 거절', !document.querySelector('#modal') && HIA.state().hiaLog.length === n0);
    S.me.role = 'owner'; const L0 = S.org.type; createOrg('corp', '판정 기업'); await wait(600); S.me.role = 'owner'; UI.aiT = 'law'; go('aigov'); render(); await wait(30);
    ok('다른 유형(기업)도 표 표시', !!document.querySelector('#hiaCard'), L0);
    return out;
  });
  let fail = 0; for (const [p, n, d] of R) { if (!p) fail++; console.log(`${p ? 'PASS' : 'FAIL'} ${n}${p ? '' : ' ' + d}`); }
  if (errs.length) { fail++; console.log('FAIL 페이지 오류', errs.slice(0, 3)); }
  console.log(`\n${R.length - (fail - (errs.length ? 1 : 0))}/${R.length} 통과 · 오류 ${errs.length}`);
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
