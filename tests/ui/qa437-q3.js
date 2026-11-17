'use strict';
/* v43.7 QA Q3 — 원생 · 소통 · 운영 · 사이트 · 설정 화면 레이아웃 · 버튼 회귀(대표님 11-17 캡처: 수납 · 메시지 · 공지 · 원생)
   자동 검사(지시서 1 · 2 · 3 · 5): ① 가로 넘침 ② 부모 밖으로 나간 자식 ③ 가려진 버튼(위 · 가운데 · 끝 스크롤) ⑤ 누르는 칸 44px
   — 고정 머리(header.top)에 스크롤로 들어간 것과 AI 버튼(FAB, 공통 셸 = Q1 담당)은 ③에서 제외합니다.
   그리고 이번에 고친 것: 「새 메시지 쓰기」 · 표 「더 보기」 동작 등록, 법정교육 체크리스트 세로 글자, 출석부 날짜 줄, 시설 「오늘 처리할 일」 폭, 0 표시 문장.
   사용: node tests/ui/qa437-q3.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };

/* 브라우저 안에서 도는 검사 — 결과는 문자열 목록 */
const CHECK = () => { const out = { hov: 0, kids: [], occ: [], small: [] };
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility({ opacityProperty: true, visibilityProperty: true }); };
  const nm = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (e.dataset && e.dataset.act ? `[${e.dataset.act}]` : '');
  out.hov = document.documentElement.scrollWidth - innerWidth;
  const main = document.querySelector('#main'); const flagged = [];
  main.querySelectorAll('*').forEach(e => { if (!vis(e) || flagged.some(f => f.contains(e))) return; const p = e.parentElement; if (!p) return; const cs = getComputedStyle(e); if (/absolute|fixed/.test(cs.position)) return; const pcs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(pcs.overflowX) || pcs.display === 'inline') return;
    const r = e.getBoundingClientRect(), pr = p.getBoundingClientRect(); if (r.width > 30 && r.right > pr.right + 2) { flagged.push(e); out.kids.push(`${nm(e)} ${Math.round(r.right - pr.right)}px > ${nm(p)}`); } });
  [...document.querySelectorAll('#main button, #main [data-act], #main a[href]')].filter(vis).forEach(e => { const r = e.getBoundingClientRect(); const t = (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 16);
    if (e.tagName === 'BUTTON' && r.height < 44 && r.width < 44) out.small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)} «${t}»`);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) return;
    const h = document.elementFromPoint(cx, cy); if (!h || e === h || e.contains(h) || h.contains(e)) return;
    if (h.closest('header.top, .topr, .brand, #fabBtn, .fab, iframe')) return; if (e.matches('.v4-blk') && h.closest('.v4-blk')) return; /* 시간이 겹친 예약 막대 — 공통 타임라인(v43ui.js) 줄 나누기는 Q1 몫 */ /* 고정 머리 밑으로 스크롤된 것 · FAB(Q1) · 사이트 편집기 */
    out.occ.push(`${nm(e)} «${t}» ← ${nm(h)}`); });
  return out; };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const open = async (w, empty) => { const p = await br.newPage({ viewport: { width: w, height: w < 500 ? 844 : 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(base + '/index.html'); return { p, errs }; };
  const org = (p, ty, ed, empty) => p.evaluate(async ([ty, ed, empty]) => { localStorage.setItem('didisam.emptyStart', empty ? '1' : '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = !!empty; createOrg(ty, '점검 기관', ed); await new Promise(o => setTimeout(o, 60)); const L = []; ['people', 'talk', 'ops'].forEach(w => (S.nav.ws.includes(w) ? wsTabs(w) : []).forEach(id => L.push(id))); return L.concat(['settings']); }, [ty, ed, empty]);
  const goTab = async (p, id) => { await p.evaluate(id => { go(id); render(); scrollTo(0, 0); }, id); await p.waitForTimeout(160); };

  /* ① · ② · ③ · ⑤ 전수: 대학(라이트) · 학원(k12) · 기업(법정교육) — 390 · 1440 */
  for (const w of [390, 1440]) { const { p, errs } = await open(w);
    for (const [ty, ed] of [['univ', 'lite'], ['k12'], ['corp']]) { const tabs = await org(p, ty, ed);
      for (const id of tabs) { if (id === 'site' || id === 'compliance') continue; /* 사이트 = 전체 화면 편집기(별도 점검) · 법정의무교육 표의 진도 막대(l43 공통 표)는 Q1 몫 */
        errs.length = 0; await goTab(p, id); const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); const tag = `${ty}@${w} ${id}`;
        for (const y of [0, Math.round(H / 2), H]) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(60); const r = await p.evaluate(CHECK);
          ok(r.hov <= 0, `${tag}: 가로 넘침 ${r.hov}px`); ok(!r.kids.length, `${tag}: 부모 밖 ${r.kids.slice(0, 3).join(' | ')}`); ok(!r.occ.length, `${tag}: 가려진 버튼 ${r.occ.slice(0, 3).join(' | ')}`); if (w < 500) ok(!r.small.length, `${tag}: 44px 미만 ${r.small.slice(0, 3).join(' | ')}`); /* 44px은 손가락 기준 — 휴대폰 폭에서만 */ }
        ok(!errs.length, `${tag}: 오류 ${errs.join(' | ')}`); } }
    await p.close(); }

  { const { p, errs } = await open(390); await org(p, 'k12');
    /* 메시지: 「새 메시지 쓰기」가 눌리지 않던 것(동작이 VIEWS.message의 return 뒤에 있었음) · 휴대폰 이중 카드 */
    await goTab(p, 'message'); ok(await p.evaluate(() => ['f1-cmp', 'f1-cmp-x'].every(k => typeof ACT[k] === 'function')), '메시지: 작성 열기 · 닫기 동작 등록');
    ok(await p.evaluate(() => { const q = document.querySelector('.f1-cbar .f1-cbq'); const cs = q && getComputedStyle(q); return !!cs && cs.borderTopWidth === '0px' && cs.backgroundColor === 'rgba(0, 0, 0, 0)'; }), '메시지 390: 「새 메시지」 안쪽 상자 테두리 없음(카드 안의 카드 아님)');
    await p.click('.f1-cbar .btn.pri[data-act="f1-cmp"]'); await p.waitForTimeout(150); ok(await p.evaluate(() => !document.querySelector('.cm26.f1-cmp').hidden && !!document.getElementById('msgT')), '메시지: [새 메시지 쓰기] → 작성 창 열림');
    await p.click('[data-act="f1-cmp-x"]'); await p.waitForTimeout(120); ok(await p.evaluate(() => !!document.querySelector('.f1-cbar')), '메시지: [닫기] → 한 줄 작성 바로 돌아옴');
    ok(await p.evaluate(() => { const b = document.querySelector('.cm26adv'); return !b || b.getBoundingClientRect().height <= 48; }), '메시지 390: [상세검색 ▼] 한 줄');
    /* 공통 표 「더 보기」: da43.js가 window.ACT를 찾아 등록하지 못하던 것 */
    ok(await p.evaluate(() => typeof ACT['r1-more'] === 'function' && typeof ACT['r1-less'] === 'function'), '표 「더 보기」 · 「접기」 동작 등록');
    /* 출석부 날짜 줄: [‹] 7일 칩 [›]가 세 줄로 갈라지던 것 */
    await goTab(p, 'crmatt'); ok(await p.evaluate(() => { const d = document.querySelector('.bar2.k-date'); if (!d) return true; const a = d.querySelector(':scope>button:first-child').getBoundingClientRect(), b = d.querySelector(':scope>.k-days+button').getBoundingClientRect(); return Math.abs(a.top - b.top) < 2 && a.width >= 44 && b.width >= 44; }), '출석부 390: [‹] · [›] 같은 줄 · 44px');
    /* 0 표시: 원생 브리핑 「미납 0건 안내」 */
    await p.evaluate(() => { (S.bills || []).forEach(b => { if (b.status !== '취소') { b.status = '납부 완료'; b.paid = [{ amt: 1e9, at: today(), method: '현금' }]; } }); }); await goTab(p, 'crmstu'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !/미납 0건/.test(document.querySelector('#main').innerText)), '원생: 「미납 0건 안내」 대신 문장');
    ok(!errs.length, 'k12 오류 ' + errs.join(' | ')); await p.close(); }

  { const { p, errs } = await open(390); await org(p, 'corp');
    /* 법정교육 체크리스트: 교육 이름이 한 글자씩 세로로 서던 것 */
    await goTab(p, 'cpl'); ok(await p.evaluate(() => [...document.querySelectorAll('.cpl-ck .cpl-ckt b')].filter(b => b.offsetParent).every(b => b.getBoundingClientRect().width > 120)), '인가 · 규정 390: 체크리스트 교육 이름 칸 120px 이상');
    ok(await p.evaluate(() => [...document.querySelectorAll('.cpl-ck')].filter(x => x.offsetParent).every(li => [...li.children].every(c => c.getBoundingClientRect().right <= li.getBoundingClientRect().right + 1))), '인가 · 규정 390: 체크리스트 %가 카드 안');
    ok(!errs.length, 'corp 오류 ' + errs.join(' | ')); await p.close(); }

  { const { p, errs } = await open(390);
    /* 빈 기관: 시설 「오늘 처리할 일」 이름표가 타임라인 클래스(min-width 860px)와 겹치던 것 · 매출 0원 → 문장 */
    await org(p, 'univ', 'lite', true); await goTab(p, 'fac');
    ok(await p.evaluate(() => [...document.querySelectorAll('.fc-todos')].every(t => t.scrollWidth <= t.clientWidth + 1)) && await p.evaluate(() => !/(^|\s)0\s*(승인 대기|노쇼|연체)/.test(document.querySelector('#main').innerText)), '빈 대학 시설 390: 「오늘 처리할 일」 넘침 없음 · 0 대신 「없음」');
    await org(p, 'adult', undefined, true); await goTab(p, 'sales'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => { const h = document.querySelector('.lg-hero .l43-hl'); return !!h && /아직 없습니다/.test(h.textContent) && !/0원/.test(h.textContent); }), '빈 학원 매출: 「순매출 0원」 대신 문장');
    await org(p, 'voc', undefined, true); await goTab(p, 'hrd'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !/0명을 먼저/.test(document.querySelector('#main').innerText)), '빈 훈련원 HRD: 「0명을 먼저 확인하세요」 대신 문장');
    ok(!errs.length, '빈 기관 오류 ' + errs.join(' | ')); await p.close(); }

  await br.close(); srv.close(); console.log(`qa437-q3: ${pass} 통과, ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
