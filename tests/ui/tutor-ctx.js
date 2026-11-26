'use strict';
/* v48 학습자 AI 튜터 화면 맥락 — 12차 기능표(2026-11-27)에서 「홈」 · 화면 전용 칩 없음으로 나온 34화면(앱 P-* 16 · 웹 W-* 18).
   각 화면에서 튜터의 「지금 화면」 제목 = 화면 이름, 그 화면 전용 추천 질문 3개(칩)가 보이고, 칩의 기본 안내가 오류 없이 답을 만든다.
   직업훈련 · 학사 LMS: 칩 · 답에 짧게 복습(#review) 링크가 없다. 학사 LMS 과제 · 시험 화면은 시험 힌트를 주지 않는다고 안내한다.
   사용: node tests/ui/tutor-ctx.js (PORT_TCTX, 기본 9950) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const PORT = +(process.env.PORT_TCTX || 9950);
const TY = { 대학: ['univ', ''], '학원(초중고)': ['k12', ''], '대학 학사 LMS': ['univ', 'lms'], 직업훈련원: ['voc', ''], '학원(성인)': ['adult', ''], '공공(직원 교육형)': ['public', ''] };
/* [기능표 ID, 경로, 기관 유형, 기대 화면 이름, 화면 전용 칩 3개] — P-* 앱(?app=1), W-* 웹 */
const CAL = ['학습 캘린더', ['이번 주 일정', '마감 임박 과제 · 시험', '내 캘린더에 연결']];
const CON = ['연결 · 알림', ['무엇을 연결할 수 있나요?', '마감 알림 받기', '연결을 끄면 내 정보는?']];
const FAC = ['시설 예약', ['예약하는 방법', '취소하면 환불은?', '내 예약 · 이용권']];
const JOU = ['나의 여정', ['작은 성취는 뭐예요?', '다음에 할 일', '이번 주 학습 현황']];
const LED = ['결제', ['낼 청구서 확인', '쓸 수 있는 결제 수단', '환불 신청 방법']];
const LEH = ['결제 내역', ['영수증 받기', '환불 신청 방법', '아직 안 낸 청구서']];
const NOT = ['내 노트', ['노트 잘 쓰는 법', '노트로 복습 카드', '노트 내보내기']];
const REC = ['기록', ['이번 주 학습 시간', '시간 목표 바꾸기', '내 학습 리포트']];
const WHO = ['계정 바꾸기', ['계정 바꾸는 법', '계정 추가하기', '목록에서 지우기']];
const CASES = [
  ['P-ai', '#ai', '대학', 'AI 튜터 대화', ['무엇을 물어볼 수 있나요?', '이번 주 학습 계획', '복습 퀴즈']],
  ['P-attend@voc', '#attend', '직업훈련원', '출석', ['내 출석 현황', '수료 출결 기준', '오늘 학습 시간 한도']],
  ['P-cal', '#cal', '대학', ...CAL], ['P-cal@k12', '#cal', '학원(초중고)', ...CAL], ['P-cal@univ_lms', '#cal', '대학 학사 LMS', ...CAL],
  ['P-connect', '#connect', '대학', ...CON], ['P-fac', '#fac', '대학', ...FAC], ['P-fac@adult', '#fac', '학원(성인)', ...FAC],
  ['P-journey', '#journey', '대학', ...JOU], ['P-ledger', '#ledger', '대학', ...LED], ['P-ledger@adult', '#ledger', '학원(성인)', ...LED],
  ['P-notes', '#notes', '대학', ...NOT], ['P-rec', '#rec', '대학', ...REC],
  ['P-review', '#review', '대학', '짧게 복습', ['짧게 복습은 뭐예요?', '헷갈린 개념 다시 설명', '복습 퀴즈 더 풀기']],
  ['P-who', '#who', '대학', ...WHO], ['P-who@adult', '#who', '학원(성인)', ...WHO],
  ['W-cal', '#cal', '대학', ...CAL], ['W-cal@adult', '#cal', '학원(성인)', ...CAL], ['W-connect', '#connect', '대학', ...CON], ['W-fac', '#fac', '대학', ...FAC],
  ['W-fac-my', '#fac/my', '대학', '시설 예약 · 내 예약', ['오늘 입장 QR', '예약 취소하기', '장비 반납 기한']],
  ['W-fac-qr', '#fac/qr/F-2026-1126', '공공(직원 교육형)', '시설 예약 · 입장 QR', ['QR이 안 찍혀요', '언제 입장할 수 있나요?', 'QR을 보내도 되나요?']],
  ['W-journey@univ_lms', '#journey', '대학 학사 LMS', ...JOU],
  ['W-knq@univ_lms', '#knq', '대학 학사 LMS', '비교과 · MOOC · 설문', ['비교과 신청 방법', 'MOOC 이수 인정', '강의 설문 마감']],
  ['W-ledger', '#ledger', '대학', ...LED], ['W-ledger-hist', '#ledger/hist', '학원(성인)', ...LEH], ['W-ledger-hist@adult', '#ledger/hist', '학원(성인)', ...LEH], ['W-ledger@adult', '#ledger', '학원(성인)', ...LED],
  ['W-lms@univ_lms', '#lms', '대학 학사 LMS', '과제 · 시험 · 성적', ['마감 임박 과제 · 시험', '성적은 언제 나와요?', '온라인 시험 응시 방법']],
  ['W-notes', '#notes', '대학', ...NOT],
  ['W-notes-review', '#notes/review', '대학', '오늘 복습', ['복습 카드 푸는 법', '맞힌 카드가 또 나와요', '시험 목표 정하기']],
  ['W-notes-search', '#notes/search', '대학', '노트 검색', ['잘 찾는 검색법', '무엇까지 찾아져요?', '찾은 노트로 복습']],
  ['W-rec', '#rec', '대학', ...REC], ['W-who', '#who', '대학', ...WHO]
];
const LP = { cls: { c0: { items: { itpom3lya: { done: true, at: '2026-11-12T10:00:00Z' }, iti4jymw3: { score: 40, at: '2026-11-12T11:00:00Z' } } } }, tube: { goal: 20, sec: {} } };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(PORT, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${PORT}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  if (CASES.length !== 34) ok(false, `화면 수 34 — ${CASES.length}`);
  for (const [id, hash, tyN, name, chips] of CASES) {
    const [type, ed] = TY[tyN]; const app = id.startsWith('P-');
    const ctx = await browser.newContext({ viewport: { width: app ? 390 : 1280, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/learner-demo-adult\.json/, r => { const j = JSON.parse(fs.readFileSync(ROOT + '/learner-demo-adult.json', 'utf8')); j.org.type = type; if (ed) j.org.ed = ed; else delete j.org.ed; if (type === 'voc' && j.cpl) j.cpl.on = true; if (/journey/.test(hash)) j.aipol = { ...(j.aipol || {}), on: true }; r.fulfill({ contentType: 'application/json', body: JSON.stringify(j) }); });
    await p.addInitScript(([lp]) => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '26년 10월 기수', id: '20269000' })); localStorage.setItem('didisam.room.sample.lp', JSON.stringify({ '20269000': lp })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } }, [LP]);
    await p.goto(`${base}/learner.html?demo=adult${app ? '&app=1' : ''}${hash}`, { waitUntil: 'load' }); await p.waitForTimeout(800);
    const r = await p.evaluate(want => { const s = LSAM.screen(); try { ltRender(); } catch (e) { } const ui = (document.querySelector('.lt-sc b') || {}).textContent || '';
      const shown = [...document.querySelectorAll('.lt-scc button, .lt-scc a')].map(x => x.textContent.trim());
      const ans = s.chips.filter(c => want.includes(c.l)).map(c => { try { const o = c.r ? c.r() : null; return { l: c.l, ok: !c.r || (!!o && typeof o.t === 'string' && o.t.length > 5), html: o ? (o.t || '') + (o.h || '') : '' }; } catch (e) { return { l: c.l, ok: false, err: e.message, html: '' }; } });
      return { hash: location.hash, name: s.name, ui, labels: s.chips.map(c => c.l), shown, ans }; }, chips);
    const tag = `${id} ${hash}(${tyN}${app ? ' · 앱' : ' · 웹'})`;
    ok(r.hash.split('?')[0] === hash, `${tag}: 주소 그대로 — ${r.hash}`);
    ok(r.name === name && r.ui === name, `${tag}: 튜터 제목 「${name}」 — LSAM ${r.name} · 화면 ${r.ui}`);
    const have = chips.filter(c => r.labels.includes(c) && r.shown.some(x => x.includes(c)));
    ok(have.length === 3, `${tag}: 화면 전용 칩 3개 — ${have.length}/3 (${r.labels.join(' · ')})`);
    ok(r.ans.length === 3 && r.ans.every(x => x.ok), `${tag}: 칩 기본 안내 — ${r.ans.map(x => `${x.l}${x.ok ? '' : '✗' + (x.err || '')}`).join(' · ')}`);
    ok(r.ans.every(x => !/[가-힣]+(합니다|습니다|십시오)\b/.test(x.html.replace(/기관 운영 정책에 따릅니다\./g, ''))), `${tag}: 답은 해요체`);
    if (type === 'voc' || ed === 'lms') ok(!r.ans.some(x => /#review/.test(x.html)) && !r.labels.some(l => /짧게 복습/.test(l)), `${tag}: 직업훈련 · 학사 LMS — 짧게 복습으로 보내지 않음`);
    if (hash === '#lms') ok(r.ans.some(x => /힌트나 답을 드리지 않아요/.test(x.html)), `${tag}: 학사 LMS 시험 — 힌트 없음 안내`);
    ok(!errs.length, `${tag}: 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
