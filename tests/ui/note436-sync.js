'use strict';
/* v43.6 셀프러닝 노트 — 연결 · 목표 · 스튜디오(lnote-sync.js · connx.js · lcal.js lcalAdd), 시안 A3
   사용: node tests/ui/note436-sync.js  (정적 서버는 이 스크립트 안에서 띄우고 끈다 · 포트 9531) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const SHOT = process.env.SHOT_DIR || ''; /* 스크린샷은 저장소 밖(scratchpad)에만 */
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const KEY = 'ntn_' + 'A1b2C3d4E5f6G7h8J9k0LmNoPq3f9a';
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(9531, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = 'http://127.0.0.1:9531'; const br = await chromium.launch();
  const shot = async (p, n) => { if (SHOT) await p.screenshot({ path: path.join(SHOT, n + '.png') }); };
  const gate = p => p.evaluate(() => { const vis = e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed'; const R = [...document.querySelectorAll('.lns, .lns-dim, .lns-ent, .lns-li')];
    const small = []; const tap = []; R.forEach(r => r.querySelectorAll('*').forEach(e => { if (!vis(e) || e.closest('svg')) return; const t = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (t && parseFloat(getComputedStyle(e).fontSize) < 13) small.push(e.className + ':' + e.textContent.trim().slice(0, 12));
      if (e.matches('button, a.lns-b, a.lns-en, .lns-chip') && !e.disabled) { const b = e.getBoundingClientRect(); if (b.width && (b.height < 43.5 || b.width < 43.5)) tap.push(e.className + ':' + b.height); } }));
    return { over: document.documentElement.scrollWidth > innerWidth + 1, small, tap }; });

  /* ── 스튜디오: 외부 연결 › 학습자가 쓰는 연결 › 셀프러닝 노트 ── */
  const studio = async (type, w) => { const p = await br.newPage({ viewport: { width: w, height: 1000 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(base + '/index.html'); await p.evaluate(async t => { createOrg(t, '점검 기관'); await new Promise(o => setTimeout(o, 60)); if (typeof slMenuSet === 'function') slMenuSet('conn', true); UI.cxSeg = 'lrn'; go('conn'); render(); }, type); await p.waitForTimeout(250); return { p, errs }; };
  { const { p, errs } = await studio('adult', 1440);
    ok(!!(await p.$('.cx-ln .cx-ln-hero')), '스튜디오: 셀프러닝 노트 머리 카드');
    const sw = await p.evaluate(() => [...document.querySelectorAll('.cx-ln-t')].map(b => [b.dataset.v, b.getAttribute('aria-checked')]));
    ok(sw.length === 8, '스위치 7개 + 자막 요약 하위 스위치'); ok(sw.find(x => x[0] === 'ytcap')[1] === 'false' && sw.filter(x => x[1] === 'true').length === 7, '기본: 자막 요약만 꺼짐');
    ok(await p.evaluate(() => /학습자 312명 중 148명이/.test(document.querySelector('.cx-ln-hero').textContent) && /내 활동\(노트 · 질문 · 댓글 · 학습 기록\)/.test(document.querySelector('.cx-ln').textContent) && [...document.querySelectorAll('.cx-lr')].some(r => /내 활동 모아보기/.test(r.textContent) && /운영자가 보지 않습니다/.test(r.textContent))), '시연 예시 숫자 · 「내 활동 모아보기」 한 줄(운영자가 보지 않음)');
    ok(await p.evaluate(() => /운영자도 볼 수 없습니다/.test(document.querySelector('.cx-ln').textContent) && !!document.querySelector('.cx-ln-ch')), '「노트 내용은 볼 수 없음」 문구 · 주간 차트');
    ok(await p.evaluate(() => { const C = (S.classes || []).filter(c => !c.archived).slice(0, 8); const few = C.filter(c => (c.learners || []).length < 5).length; return document.querySelectorAll('.cx-ln-hide').length === few; }), '학습자 5명 미만 과정은 숫자 숨김');
    await p.click('.cx-ln-t[data-v=sync]'); await p.waitForTimeout(120);
    ok(await p.evaluate(() => S.settings.lnote.sync === false && lsSnapshot().lnote.sync === false && lsSnapshot().lnote.off === false && lsSnapshot().lnote.ytcap === false && lsSnapshot().lnote.yt === true), '동기화 허용 끄기 → S.settings.lnote.sync · 게시본 lnote.sync=false');
    await p.click('.cx-ln-t[data-v=notes]'); await p.waitForTimeout(120); ok(await p.evaluate(() => S.settings.lnote.off === true && lsSnapshot().lnote.off === true), '내 노트 끄기 → lnote.off=true'); await p.click('.cx-ln-t[data-v=notes]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => [...document.querySelectorAll('.cx-lr')].some(r => /Notion으로 노트 보내기/.test(r.textContent) && r.classList.contains('off'))), '학습자 연결 목록: 꺼진 기능 표시');
    await shot(p, 'n3-studio-1440'); ok(!errs.length, '스튜디오 오류 없음 ' + errs.join(' | ')); await p.close(); }
  { const { p, errs } = await studio('univ', 1440); ok(await p.evaluate(() => lsSnapshot().lnote.sync === true && /대학도 켤 수 있습니다/.test(document.querySelector('.cx-ln').textContent)), '대학: 동기화 허용 기본 켜짐'); ok(!errs.length, 'univ 오류 없음'); await p.close(); }
  { const { p, errs } = await studio('adult', 390); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '스튜디오 390: 가로 넘침 없음');
    ok(await p.evaluate(() => [...document.querySelectorAll('.cx-ln-tb td')].every(td => getComputedStyle(td).display === 'flex')), '스튜디오 390: 표 → 과정 카드'); await shot(p, 'n3-studio-390'); ok(!errs.length, '390 오류 없음'); await p.close(); }

  /* ── 학습자 앱 390 ── */
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await p.addInitScript(() => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '', id: '20269000' })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } });
  await p.goto(`${base}/learner.html?demo=adult&app=1#home`); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !!window.LNOTE && !!window.LNOTE_SYNC && !!LR.me), 'LNOTE · lnote-sync 로드 · 로그인');
  await p.evaluate(() => { const c = SITE().classes[0]; const a = LNOTE.save({ t: '피벗 테이블 요약', b: '- 행 · 열 · 값\n- **필터**는 위에', cid: c.id, tags: ['엑셀'], src: 'me', st: 'ok' }); LNOTE.save({ t: '튜터 초안', b: '확인 전', src: 'tutor', st: 'draft' }); LNOTE.saveCard({ nid: a.id, f: '피벗 값 영역?', k: '합계 · 개수' }); });
  await p.evaluate(() => { location.hash = '#notes/out'; }); await p.waitForTimeout(300);
  ok(!!(await p.$('.lns-app .lns-fade')) && /내보내기 · 연결/.test(await p.textContent('.ap-bar')), '앱: 위 줄 제목 · 탭바 페이드'); ok(!!(await p.$('.lns-app .lns-hero')) && /아직 켜 둔 연결이 없어요/.test(await p.textContent('.lns-hero')), '#notes/out: 머리 카드(연결 없음 문장)');
  ok(await p.evaluate(() => /초안 없음|1/.test(document.querySelector('.lns-kpis').textContent) && /꺼짐/.test(document.querySelector('.lns-kpis').textContent)), '0 대신 문장(꺼짐)');
  ok(await p.evaluate(() => /보내지 않는 것/.test(document.querySelector('.lns-pv').textContent) && /이름 · (학번|수강번호) · 연락처/.test(document.querySelector('.lns-pv').textContent)), '보내는 것 / 보내지 않는 것 ' + await p.evaluate(() => (document.querySelector('.lns-pv') || {}).textContent));
  { const g = await gate(p); ok(!g.over && !g.small.length && !g.tap.length, `390 관문(out): 넘침 ${g.over} · 13px 미만 ${g.small.join(',')} · 44px 미만 ${g.tap.join(',')}`); } await shot(p, 'n3-app-out');
  /* md · csv 내려받기 */
  { const [d] = await Promise.all([p.waitForEvent('download'), p.click('.lns-c[data-lns=md]')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(/피벗 테이블 요약/.test(t) && !/튜터 초안/.test(t) && !/20269000/.test(t), '.md: 확인한 노트만 · 학번 없음'); }
  { const [d] = await Promise.all([p.waitForEvent('download'), p.click('.lns-c[data-lns=csv]')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(/피벗 값 영역\?/.test(t) && /앞면,뒷면,출처/.test(t), '.csv: 복습 카드'); }
  /* Notion 시트 */
  await p.click('[data-sync=notion] .lns-c'); await p.waitForTimeout(150);
  ok(!!(await p.$('.lns-sheet .lns-steps .cur')) && /무엇을/.test(await p.textContent('.lns-sheet .lns-why')) && /끄면/.test(await p.textContent('.lns-sheet .lns-why')), 'Notion 시트: 3단계 · 무엇을 · 왜 · 끄면');
  { const g = await gate(p); ok(!g.over && !g.small.length && !g.tap.length, `390 관문(Notion 시트): ${g.small.join(',')} ${g.tap.join(',')}`); } await shot(p, 'n3-app-notion');
  await p.fill('#lnsKey', 'abc123'); await p.click('.lns-sheet [type=submit]'); await p.waitForTimeout(100);
  ok(/형식이 아니에요/.test(await p.textContent('.lns-sheet .lns-err')), '잘못된 키 → 형식 안내');
  await p.fill('#lnsKey', KEY); ok(await p.getAttribute('#lnsKey', 'type') === 'password', '키 입력은 가림(password)'); await p.click('.lns-sheet [type=submit]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => LNOTE.sync().notion && LNOTE.sync().notion.on === true && LNOTE.sync().notion.page === '디디쌤 학습 노트'), 'Notion 켜짐 · 페이지 이름 저장');
  ok(await p.evaluate(k => !JSON.stringify(LR.lp).includes(k) && !document.body.innerHTML.includes(k), KEY), '키는 LR.lp · 화면에 없음');
  ok(await p.evaluate(k => Object.keys(localStorage).some(x => x === 'didisam.note.key.notion' && localStorage.getItem(x) === k), KEY), '키는 이 기기 저장소에만(didisam.note.key.notion)');
  ok(/ntn_•+3f9a/.test(await p.textContent('[data-sync=notion]')), '켜짐 줄: 접두 + 끝 4자리만');
  { const [d] = await Promise.all([p.waitForEvent('download'), p.click('.lns-hero [data-lns=send]')]); ok(/\.md$/.test(d.suggestedFilename()) && /Notion에 (방금|\d+분 전) 보냈어요/.test(await p.textContent('.lns-hero')), '지금 다시 보내기 → 성공 기록 + .md 묶음'); }
  p.once('dialog', d => d.accept()); await p.click('[data-sync=notion] .lns-c'); await p.waitForTimeout(100); await p.click('.lns-sheet [data-lns=off]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !Object.keys(localStorage).some(x => x === 'didisam.note.key.notion') && LNOTE.sync().notion.on === false), '끄기 → 키 바로 삭제');
  /* Google Docs(데모) */
  await p.click('[data-sync=gdocs] .lns-c'); await p.waitForTimeout(120); await p.click('.lns-sheet [data-lns=gdocs-on]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => LNOTE.sync().gdocs.on === true), 'Google Docs 연결(데모)');
  /* 시험 목표 */
  await p.evaluate(() => { location.hash = '#notes/goal'; }); await p.waitForTimeout(250);
  ok(!!(await p.$('.lns-empty')), '#notes/goal 빈 상태(사진 + 문장)');
  await p.click('.lns-empty [data-lns=goal]'); await p.waitForTimeout(120); await p.fill('#lnsGq', '정보처리'); await p.waitForTimeout(80);
  ok((await p.$$('.lns-opt')).length === 3, '종목 검색 결과 3개');
  await p.click('.lns-opt[data-v="정보처리기사"]'); await p.waitForTimeout(80); ok(!!(await p.$('.lns-chip.on[data-lns=gdate]')), '공개 일정(예시) 첫 날짜 선택');
  await p.click('.lns-chip[data-lns=gh][data-v="60"]');
  { const g = await gate(p); ok(!g.over && !g.small.length && !g.tap.length, `390 관문(목표 시트): ${g.small.join(',')} ${g.tap.join(',')}`); } await shot(p, 'n3-app-goal-pick');
  await p.click('[data-lns=gsave]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const g = LNOTE.goal(); return g && g.exam === '정보처리기사' && /^\d{4}-\d{2}-\d{2}$/.test(g.date); }), 'LR.lp.notes.goal 저장');
  ok(await p.evaluate(() => LNOTE.all().some(n => n.src === 'exam' && n.st === 'draft' && /역산 계획/.test(n.t)) && LR.lp.tutor.plan.length >= 1 && LR.lp.tutor.plan.every(x => x.h === '#notes/goal')), '시험 계획 노트 초안(src:exam) · 튜터 계획(이번 주)');
  ok(/#notes\/goal$/.test(p.url()) && (await p.$$('.lns-phase')).length >= 2 && !!(await p.$('.lns-draft')), '#notes/goal: 단계 · 초안 띠');
  { const g = await gate(p); ok(!g.over && !g.small.length && !g.tap.length, `390 관문(목표): ${g.small.join(',')} ${g.tap.join(',')}`); } await shot(p, 'n3-app-goal');
  const wk0 = await p.$('.lns-chk'); if (wk0) { await wk0.click(); await p.waitForTimeout(120); ok(!!(await p.$('.lns-chk.on')), '이번 주 할 일 체크'); }
  await p.click('.lns-hero [data-lns=calput]'); await p.waitForTimeout(120); await p.click('.lns-sheet .lns-full[data-lns=calgo]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('didisam.lcal.') && !x.includes('merged')); const L = k ? JSON.parse(localStorage.getItem(k)) : []; return L.some(x => /시험일/.test(x.title)) && L.some(x => /^lg/.test(x.id)); }), '캘린더 「내 일정」에 넣기(lcalAdd)');
  ok(await p.evaluate(() => LNOTE.all().find(n => n.src === 'exam').st === 'ok'), '캘린더에 넣으면 계획 확인(ok)');
  { const n0 = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(x => x.startsWith('didisam.lcal.') && !x.includes('merged')))).length); await p.click('.lns-hero [data-lns=calput]'); await p.waitForTimeout(100); await p.click('.lns-sheet .lns-full[data-lns=calgo]'); await p.waitForTimeout(200);
    ok(await p.evaluate(n => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(x => x.startsWith('didisam.lcal.') && !x.includes('merged')))).length === n, n0), '다시 넣어도 중복 없음'); }
  /* S25 탈퇴 전 내보내기(lacct 탈퇴 폼 #laDel) */
  await p.evaluate(() => { LR.me.acct = 'mail'; location.hash = '#acct'; }); await p.waitForTimeout(350);
  { ok(!!(await p.$('#laDel .ln-leave')), '탈퇴 폼: 기존 확인 문구 위 .ln-leave 카드');
    await p.evaluate(() => { const f = document.querySelector('.la-danger.ls-fold'); if (f) f.classList.add('ls-open'); for (let d = document.querySelector('#laDel').closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; /* v47 D12: 회원정보는 「나」의 접힌 묶음(.ls-acd) 안 — 바깥까지 모두 펼침 */ document.querySelector('#laDel .ln-leave').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(150);
    const tx = await p.textContent('#laDel'); ok(/탈퇴하면 노트도 지워져요/.test(tx) && /노트 3개 · 복습 카드 1장 · 질문 0개는 이 계정에만 있어요\. 먼저 내 기기로 내보내 두세요\./.test(tx) && /탈퇴 대신 알림만 끌 수도 있어요/.test(tx) && /노트 · 기록은 그대로 남아요/.test(tx), 'S25 문구(개수 · 알림만 끄기 줄)');
    ok(/그래도 탈퇴하기/.test(await p.textContent('#laDel button[type=submit]')), '주 버튼 「그래도 탈퇴하기」');
    { const g = await gate(p); ok(!g.over && !g.small.length, `390 관문(탈퇴): ${g.small.join(',')}`); }
    let asked = ''; p.once('dialog', d => { asked = d.message(); d.dismiss(); });
    await p.evaluate(() => { const f = document.getElementById('laDel'); f.querySelectorAll('select').forEach(s => { s.value = s.options[1] ? s.options[1].value : ''; }); f.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = true; }); f.requestSubmit(); }); await p.waitForTimeout(250);
    ok(asked === '노트를 내보내지 않았어요. 탈퇴할까요?' && await p.evaluate(() => !!LR.me), '내보내지 않고 탈퇴 → 한 번 더 묻기(취소하면 그대로)');
    await shot(p, 'n3-app-withdraw');
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#laDel [data-lns=mdall]')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(/튜터 초안/.test(t) && /피벗 테이블 요약/.test(t) && !/20269000/.test(t), '탈퇴 전 내보내기: 초안 포함 전체 노트 · 학번 없음');
    await p.waitForTimeout(100); ok(/노트 \.md 받음/.test(await p.textContent('#laDel .ln-leave')), '내려받으면 「받음」 체크'); }
  await p.evaluate(() => { LR.me.acct = 'code'; });
  /* lconn 줄 → 허브 */
  await p.evaluate(() => { location.hash = '#connect'; }); await p.waitForTimeout(400);
  ok(/노트 앱으로 내보내기/.test(await p.evaluate(() => (document.querySelector('.lcx [data-lcx="out"]') || {}).closest ? document.querySelector('.lcx [data-lcx="out"]').closest('.lcx-r').textContent : '')), '#connect 「노트 앱으로 내보내기」 줄 → 허브 링크 ' + await p.evaluate(() => [...document.querySelectorAll('.lcx-r')].map(r => r.textContent.slice(0, 30)).join('|')));
  await p.click('.lcx [data-lcx="out"]'); await p.waitForTimeout(200); ok(/#notes\/out$/.test(p.url()), '줄 → #notes/out');
  /* 수료증 LinkedIn */
  await p.evaluate(() => { const c = SITE().classes[0]; window.a2lCertData = () => ({ x: {}, c, nick: false, T: {}, d: { name: '○○○', cls: c.name, period: '', hours: '', no: 'DDS-7Q4K-2611', at: '2026-11-12' } }); location.hash = '#cert/' + c.id; }); await p.waitForTimeout(350);
  const href = await p.evaluate(() => (document.querySelector('.lns-lib') || {}).href || '');
  ok(/certUrl=http/.test(href), 'certUrl = 인증 주소'); ok(/^https:\/\/www\.linkedin\.com\/profile\/add\?startTask=CERTIFICATION_NAME&name=/.test(href) && /organizationName=/.test(href) && /issueYear=2026&issueMonth=11/.test(href) && /certId=DDS-7Q4K-2611/.test(href), '수료증: LinkedIn 프로필 추가 주소');
  ok(!/20269000/.test(href) && await p.evaluate(() => /로그인하거나 글을 올리지 않아요/.test(document.querySelector('.lns-li').textContent) && !!document.querySelector('.lns-li .lns-lt')), '주소에 학번 없음 · 글자 타일 「L」 · 안내 문구');
  { const g = await gate(p); ok(!g.over && !g.small.length && !g.tap.length, `390 관문(수료증): ${g.small.join(',')} ${g.tap.join(',')}`); } await shot(p, 'n3-app-cert');
  { const [d] = await Promise.all([p.waitForEvent('download'), p.click('.lns-keep [data-lns=mdc]')]); const t = fs.readFileSync(await d.path(), 'utf8'); ok(/피벗 테이블 요약/.test(t) && !/튜터 초안/.test(t), '수료 화면 .ln-keep: 「이 과정 노트 내보내기」(.md, 그 과정 · 확인한 노트만)'); ok(/이 과정 노트 1개를 가져가세요/.test(await p.textContent('.ln-keep')) && /읽기 전용으로 남아요/.test(await p.textContent('.ln-keep')), '수료: 「이 과정 노트 n개를 가져가세요」'); }
  await p.evaluate(() => { location.hash = '#verify/DDS-7Q4K-2611'; }); await p.waitForTimeout(250); ok(/유효한 수료증/.test(await p.textContent('.lns-verify')) && !/20269000/.test(await p.textContent('.lns-verify')), '#verify: 유효 · 학번 없음');
  await p.evaluate(() => { location.hash = '#verify/NOPE'; }); await p.waitForTimeout(200); ok(/확인하지 못했어요/.test(await p.textContent('.lns-verify')), '#verify: 없는 번호');
  await p.evaluate(() => { location.hash = '#cert/' + SITE().classes[0].id; }); await p.waitForTimeout(250);
  await p.evaluate(() => { LR.site.lnote = { linkedin: false }; lrender(); }); await p.waitForTimeout(150); ok(!(await p.$('.lns-lib')), '기관이 끄면 LinkedIn 버튼 숨김');
  await p.evaluate(() => { LR.site.lnote = { off: true }; location.hash = '#notes/goal'; }); await p.waitForTimeout(250); ok(/쓰지 않아요/.test(await p.textContent('#lm')), 'lnote.off=true → 노트 기능 숨김');
  await p.evaluate(() => { LR.site.lnote = { sync: false }; location.hash = '#notes/out'; }); await p.waitForTimeout(250); ok(!(await p.$('[data-sync=notion]')) && /쓰지 않아요/.test(await p.textContent('.lns-app')), '기관이 동기화 끄면 자동 보내기 숨김');
  ok(!errs.length, '학습자 앱 오류 없음 ' + errs.join(' | ')); await ctx.close();

  /* ── 학습자 웹 1280: #notes/out 페이지 · 오른쪽 패널 ── */
  { const c2 = await br.newContext({ viewport: { width: 1280, height: 800 } }); const q = await c2.newPage(); const er = []; q.on('pageerror', e => er.push(e.message)); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await q.addInitScript(() => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20269000', dept: '', id: '20269000' })); localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await q.goto(`${base}/learner.html?demo=adult#notes/out`); await q.waitForTimeout(1200);
    ok(!!(await q.$('.lns-web .lns-hero')), '웹 #notes/out 페이지'); ok(!(await q.$('.lns-fade')) || await q.evaluate(() => getComputedStyle(document.querySelector('.lns-fade')).display === 'none'), '웹: 페이드 없음'); await q.click('[data-sync=notion] .lns-c'); await q.waitForTimeout(150); ok(!!(await q.$('.lns-panel')), '웹: 연결 시트 = 오른쪽 패널 480');
    ok(await q.evaluate(() => Math.round(document.querySelector('.lns-panel').getBoundingClientRect().width) === 480), '패널 폭 480'); await shot(q, 'n3-web-panel');
    ok(!er.length, '웹 오류 없음 ' + er.join(' | ')); await c2.close(); }

  await br.close(); srv.close(); console.log(`note436-sync: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
