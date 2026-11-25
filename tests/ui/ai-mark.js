'use strict';
/* 체크리스트 01 · AI 생성물 표시 일관 적용 점검
   ① 소스: AI 출력 경로(학습자 튜터 · 영상 튜터 · 스튜디오 AI SAM · 채점 초안 · 답변 초안 · AI 생성 콘텐츠)가 공통 함수 aiMark를 쓴다
   ② 스튜디오: AI SAM(Claude) 답에는 표시, 규칙 엔진 · 사용자 말풍선에는 표시 없음
   ③ 학습자: Claude 답 · 노트 초안에 표시, 기본 안내에는 없음
   사용: node tests/ui/ai-mark.js  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json' };
const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };

/* ① 소스 대조 — 파일: 기대하는 표시 종류 */
const SITES = { 'ltutor.js': ['tutor'], 'ltube.js': ['tutor'], 'lmy.js': ['graded'], 'claude.js': ['sam'], 'grade2.js': ['grade'], 'mods.js': ['grade', 'draft'], 'comm2.js': ['draft'], 'site2.js': ['draft'], 'build.js': ['content'], 'docs.js': ['content'], 'crs-content.js': ['content'] };
for (const [f, kinds] of Object.entries(SITES)) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); for (const k of kinds) ok(s.includes(`aiMark('${k}')`), `소스 ${f} → aiMark('${k}')`); }
const g = fs.readFileSync(path.join(ROOT, 'aiguard.js'), 'utf8'); ok((g.match(/function aiMark\(/g) || []).length === 1, '공통 함수는 aiguard.js 한 곳');
const dup = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'aiguard.js').filter(f => /function aiMark\(|aiMark\s*=\s*\(/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
ok(!dup.length, `다른 파일에 별도 표시 함수 없음 ${dup.join(',')}`);

(async () => {
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  try {
    /* ② 스튜디오 */
    { const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await page.goto(`${base}/index.html`, { waitUntil: 'load' });
      const r = await page.evaluate(async () => {
        createOrg('univ', '점검 기관', 'lms'); await new Promise(z => setTimeout(z, 50)); render();
        const kinds = (window.AI_MARK_KINDS || []).map(k => aiMark(k));
        S.chat = [{ role: 'user', text: '현황 알려줘' }, { role: 'ai', md: '오늘 현황입니다.', via: 'Claude Haiku', tok: 120 }, { role: 'ai', text: '규칙 답', via: '규칙 엔진' }];
        go('home'); render(); renderThreads(); await new Promise(z => setTimeout(z, 50));
        const th = document.querySelector('.thread'); const msgs = th ? [...th.querySelectorAll('.msg')] : [];
        return { kinds, n: kinds.length, xss: aiMark('content', '<img src=x onerror=1>'), thread: !!th,
          marks: msgs.map(m => m.querySelectorAll('[data-ai-mark="sam"]').length), css: !!document.getElementById('ai-mark-css') };
      });
      ok(r.n === 6 && r.kinds.every(h => /data-ai-mark="[a-z]+"/.test(h) && /✦ /.test(h)), '표시 6종 모두 같은 모양(✦ · data-ai-mark)');
      ok(!/<img/.test(r.xss), '표시 문구 이스케이프');
      ok(r.thread && r.marks.join() === '0,1,0', `AI SAM: Claude 답만 표시 (${r.marks.join()})`);
      ok(r.css, '표시 스타일 1회 주입');
      ok(!errs.length, `스튜디오 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      await page.close(); }
    /* ③ 학습자 */
    { const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await page.goto(`${base}/learner.html`, { waitUntil: 'load' }); await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({
        ai: ltMsgHTML({ t: '설명이에요', src: 'Claude · haiku-5-5' }), note: ltMsgHTML({ t: '초안', src: '노트 초안 · Claude' }),
        rule: ltMsgHTML({ t: '안내', src: '기본 안내' }), me: ltMsgHTML({ me: 1, t: 'Claude 질문', src: 'Claude' }), flag: ltMsgHTML({ t: 'x', src: '튜터', ai: 1 }) }));
      ok(/data-ai-mark="tutor"/.test(r.ai) && /data-ai-mark="tutor"/.test(r.note) && /data-ai-mark="tutor"/.test(r.flag), '학습자 튜터: Claude 답 · 노트 초안 · ai 표시 말풍선에 표시');
      ok(!/data-ai-mark/.test(r.rule) && !/data-ai-mark/.test(r.me), '학습자 튜터: 기본 안내 · 내 말풍선에는 표시 없음');
      ok(!errs.length, `학습자 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      await page.close(); }
  } finally { await browser.close(); srv.close(); }
  console.log(fails.length ? `실패 ${fails.length}건` : '모두 통과'); process.exitCode = fails.length ? 1 : 0;
})();
