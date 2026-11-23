'use strict';
/* v46 D3 — AI 사용 정책 센터(기능 6) · 과제별 AI 레벨 어드민(기능 1)
   ① 유형 7종 가입 프리셋 ② 기존 기관(aipol 없음) → upgradeState 꺼짐 · 편집기 · 게시본 · 튜터 카드 변화 0
   ③ 정책 센터 8카드 · 정운영자만 저장 · 부운영자 보기 · 교강사 접근 불가 · 감사 기록 ④ 프리셋 적용 시 기존 항목 레벨 불변
   ⑤ 모델 학습 동의 없이 켜기 불가 ⑥ 편집기 레벨 카드 · 최대 초과 비활성 · 저장 · 제출자 확인 ⑦ 게시본 item.ai
   사용: flock /tmp/pw.lock node tests/ui/v2-aipol.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok));
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
  const R = await page.evaluate(async () => {
    localStorage.setItem('didisam.emptyStart', '0'); const out = []; const ok = (n, c, d) => out.push([!!c, n, d === undefined ? '' : JSON.stringify(d)]); const wait = ms => new Promise(r => setTimeout(r, ms));
    /* ① 가입 프리셋 */
    const exp = { univ: ['L0', 'L1', 'L2'], voc: ['L0', 'L1', 'L2'], corp: ['L0', 'L2', 'L3'], k12: ['L0', 'L1', 'L2'], adult: ['L0', 'L1', 'L2'], lifelong: ['L0', 'L1', 'L2'], public: ['L0', 'L1', 'L2'] };
    for (const [ty, e] of Object.entries(exp)) { createOrg(ty, '정책 ' + ty); await wait(30); const A = S.aipol; ok(`가입 프리셋 ${ty}`, A && A.on === true && A.preset.exam === e[0] && A.preset.assign === e[1] && A.max === e[2] && A.retain === 'term' && A.train === false && A.evalNotice === true, A); }
    /* ② 기존 기관: aipol 없는 상태 → upgradeState 꺼짐, 변화 0 */
    createOrg('univ', '기존 대학'); await wait(900); delete S.aipol; upgradeState();
    ok('기존 기관 upgradeState 꺼짐', S.aipol && S.aipol.on === false && S.aipol.v === 1 && Object.keys(S.aipol).length === 2, S.aipol);
    ok('AIPOL.on() 꺼짐', AIPOL.on() === false);
    const c = S.classes.find(x => (x.curriculum || []).some(i => i.type === 'assign')) || S.classes[0];
    const ai = c.curriculum.findIndex(i => i.type === 'assign'), ei = c.curriculum.findIndex(i => i.type === 'exam' || i.type === 'quiz');
    openEditor(c, ai); await wait(30); ok('꺼짐: 편집기에 레벨 카드 없음', !document.querySelector('#apEd')); const offEd = document.querySelector('#edBody').innerHTML.length; closeModal(); ED = null;
    const pubOff = JSON.stringify(lsSnapshot()); ok('꺼짐: 게시본에 aipol · item.ai 없음', !/"aipol"/.test(pubOff) && !(lsSnapshot().classes || []).some(k => (k.items || []).some(x => x.ai && x.ai.lvl)));
    ok('꺼짐: 튜터 카드 문구 그대로', /대화 내용은 저장하지 않고 횟수만 집계<\/small>/.test(VIEWS.progress()));
    /* ③ 정책 센터 */
    S.me.role = 'owner'; slSetOpen('aipol'); go('settings'); render(); await wait(30);
    const main = document.querySelector('#main') || document.body;
    ok('설정 목차에 AI 사용 정책', [...document.querySelectorAll('.sx3-ti b')].some(b => b.textContent === 'AI 사용 정책'));
    ok('정책 센터 8카드', main.querySelectorAll('.ap-card').length === 8, main.querySelectorAll('.ap-card').length);
    ok('저장 전 「프리셋 기본값」', /프리셋 기본값/.test(main.innerText));
    ok('문구 원문', /우리 기관에서 AI를 어떻게 쓸지 한 화면에서 정합니다/.test(main.innerText) && /AI 모델 학습에 쓰지 않음\(기본\)/.test(main.innerText) && /학습 기록에는 학번 · 학과만 남깁니다/.test(main.innerText));
    const sw = document.querySelector('[data-act="ap-on"]'); sw.click(); await wait(30);
    ok('켜기 저장 + 감사 기록', S.aipol.on === true && S.aipol.preset.assign === 'L1' && S.audit[0].what === 'AI 사용 정책 — Ver2 학습 루프 켜기', S.audit[0]);
    ok('변경 이력 표시', /Ver2 학습 루프 켜기/.test((document.querySelector('.ap-log') || {}).innerText || ''));
    ok('켜짐: 튜터 카드 정책 연결', /AI 사용 정책에서 관리/.test(VIEWS.progress()) && /1학기 보관/.test(VIEWS.progress()));
    /* ⑤ 모델 학습: 동의 없이 불가 */
    document.querySelector('[data-act="ap-train"]').click(); await wait(10); document.querySelector('#modal [data-mact="ok"]').click(); await wait(10);
    ok('동의 없이 모델 학습 켜기 불가', S.aipol.train === false && !!document.querySelector('#modal'));
    document.querySelector('#modal [name="agree"]').checked = true; document.querySelector('#modal [data-mact="ok"]').click(); await wait(20);
    ok('동의 체크 후 켜짐 + 이력', S.aipol.train === true && /기관 동의 확인/.test(S.audit[0].what));
    /* ④ 항목 레벨 지정 후 프리셋 적용 → 그 항목 불변 */
    c.curriculum[ai].ai = { lvl: 'L2', why: '', sol: false }; UI.apPre = 'corp'; render(); document.querySelector('[data-act="ap-apply"]').click(); await wait(20);
    ok('프리셋(기업) 적용: 기본 · 최대만 바뀜', S.aipol.preset.assign === 'L2' && S.aipol.max === 'L3' && c.curriculum[ai].ai.lvl === 'L2');
    const before = JSON.stringify(S.classes.map(k => k.curriculum.map(i => i.ai && i.ai.lvl))); UI.apPre = 'univ'; render(); document.querySelector('[data-act="ap-apply"]').click(); await wait(20);
    ok('프리셋 적용 시 기존 항목 레벨 변경 0(최대 이내)', JSON.stringify(S.classes.map(k => k.curriculum.map(i => i.ai && i.ai.lvl))) === before && S.aipol.max === 'L2');
    /* 최대 레벨 낮추기 → 초과 항목 맞춤 */
    c.curriculum[ai].ai.lvl = 'L2'; document.querySelector('[data-act="ap-set"][data-k="max"][data-v="L1"]').click(); await wait(20);
    ok('최대 L1로 낮추면 초과 항목 L1', S.aipol.max === 'L1' && c.curriculum[ai].ai.lvl === 'L1'); closeModal();
    document.querySelector('[data-act="ap-set"][data-k="max"][data-v="L2"]').click(); await wait(10);
    /* 부운영자 · 교강사 */
    S.me.role = 'sub'; render(); ok('부운영자: 보기 전용', document.querySelector('[data-act="ap-on"]').disabled === true && /볼 수만/.test(document.body.innerText));
    const t0 = S.aipol.at; ACT['ap-notice'](); ok('부운영자 저장 불가', S.aipol.at === t0 && S.aipol.evalNotice === true);
    S.me.role = 'teacher'; ok('교강사: 설정 카드 없음 · 화면 차단', window.SXC_X({}).length === 0 && slSetOpen('aipol') === false && !/ap-card/.test(VIEWS.settings()));
    S.me.role = 'owner';
    /* ⑥ 편집기 */
    openEditor(c, ai); await wait(30); const box = document.querySelector('#apEd');
    ok('켜짐: 과제 편집기 레벨 카드 4개', box && box.querySelectorAll('.ap-lv').length === 4 && /이 과제의 AI 사용 수준/.test(box.innerText));
    ok('최대(L2) 초과 L3 비활성 + 안내', box.querySelector('[data-v="L3"]').disabled && /기관 정책상 L2까지 선택할 수 있습니다/.test(box.innerText));
    ok('미리보기 배너', /이 과제의 AI: 코치 · 힌트와 질문으로 도와줘요/.test(box.innerText));
    box.querySelector('[data-v="L0"]').click(); await wait(10); ok('L0 선택 → 미리보기 「AI 없이」', /이 과제는 AI 없이 풀어요/.test(document.querySelector('#apEd').innerText));
    const wi = document.querySelector('[data-aipol="why"]'); wi.value = '스스로 푸는 과제'; wi.dispatchEvent(new Event('input', { bubbles: true }));
    const it0 = c.curriculum[ai]; (c.subs = c.subs || {})[it0.id] = [{ who: (S.members[0] || {}).id || 'm1', st: 'submitted' }];
    let r1 = edSave(); await wait(10); ok('제출자 있으면 확인 문구', r1 === false && /제출한 .* 1명에게 레벨 변경 알림이 갑니다/.test(document.querySelector('#apEd').innerText));
    edSave(); await wait(30); const sv = c.curriculum[ai].ai;
    ok('저장: it.ai = {lvl, why, sol}', sv.lvl === 'L0' && sv.why === '스스로 푸는 과제' && sv.sol === false, sv);
    ok('레벨 변경 감사 기록', S.audit.slice(0, 3).some(a => /AI 레벨 L1 → L0 · 제출 1명 알림/.test(a.what)), S.audit.slice(0, 3));
    if (ei >= 0) { openEditor(c, ei); await wait(30); const x = document.querySelector('#apEd'); const exam = c.curriculum[ei].type === 'exam';
      ok('시험/퀴즈 기본 레벨', x && x.querySelector('.ap-lv.on').dataset.v === (exam ? 'L0' : 'L1') && /기관 기본/.test(x.innerText));
      if (exam) { x.querySelector('[data-v="L1"]').click(); await wait(10); ok('시험 L1 이상 경고', /시험에서 AI를 허용합니다/.test(document.querySelector('#apEd').innerText)); }
      closeModal(); ED = null; }
    const vid = S.classes.flatMap(k => k.curriculum).find(i => i.type === 'video'); ok('영상 항목은 레벨 없음', !vid || AIPOL.levelOf(vid) === 'L1');
    /* ⑦ 게시본 */
    const pub = lsSnapshot(); const pc = pub.classes.find(k => k.id === c.id); const px = pc && pc.items.find(x => x.id === it0.id);
    ok('게시본 aipol 공개 필드만(preset: 학습자 레벨 판정용, 통합 v46)', pub.aipol && JSON.stringify(Object.keys(pub.aipol).sort()) === JSON.stringify(['evalNotice', 'lvl', 'on', 'preset', 'retain']), pub.aipol);
    ok('게시본 item.ai', px && px.ai && px.ai.lvl === 'L0' && px.ai.why === '스스로 푸는 과제', px && px.ai);
    /* 끄면 다시 원래대로 */
    S.aipol.on = false; openEditor(c, ai); await wait(30); ok('다시 끄면 편집기 원래대로', !document.querySelector('#apEd') && Math.abs(document.querySelector('#edBody').innerHTML.length - offEd) < 400); closeModal();
    /* 390 폭 */
    return out;
  });
  await page.setViewportSize({ width: 390, height: 800 });
  const w = await page.evaluate(async () => { S.aipol.on = true; slSetOpen('aipol'); go('settings'); render(); await new Promise(r => setTimeout(r, 50)); return document.documentElement.scrollWidth; });
  R.push([w <= 392, '390 폭 가로 넘침 없음', String(w)]);
  R.push([!errs.length, '스크립트 오류 없음', JSON.stringify(errs.slice(0, 3))]);
  let bad = 0; R.forEach(([p, n, d]) => { console.log(`${p ? '✓' : '✗'} ${n}${p ? '' : ' ' + d}`); if (!p) bad++; });
  await browser.close(); srv.close();
  if (bad) { console.error(`실패 ${bad}건`); process.exit(1); } console.log(`✓ v2-aipol ${R.length}건 통과`);
})().catch(e => { console.error(e); process.exit(1); });
