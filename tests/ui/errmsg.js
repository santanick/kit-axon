'use strict';
/* GS #20 오류 문구 점검 — errMsg(e, fallback)
   ① 정적: 화면 파일에 e.message 직접 표시가 남았는지(조건 판정 · 개발자 로그 · 다른 요원 파일 제외)
   ② 브라우저: 운영자(index.html) 합니다체 · 학습자(learner.html) 해요체, 예외명 · 스택 · 영문 원문 · SQL 차단, fallback 규칙
   ③ 실제 화면: 서버 오류 문구 토스트에 내부 정보가 나오지 않는지
   사용: node tests/ui/errmsg.js (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
/* ① 정적 */
const OTHER = new Set(['live.js', 'lacct.js', 'mfa.js', 'session.js', 'accrev.js', 'errmsg.js']);
const left = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/^(vendor|fonts)$/.test(f)) walk(p); continue; } if (!f.endsWith('.js') || OTHER.has(f)) continue;
  fs.readFileSync(p, 'utf8').split('\n').forEach((L, i) => { const re = /(?<![.\w$])(e|err|er|ex|x|x2|error)\.message(?![\w$])/g; let m; while ((m = re.exec(L))) { const a = L.slice(m.index + m[0].length, m.index + m[0].length + 6), b = L.slice(Math.max(0, m.index - 200), m.index);
    if (/^\s*(===|!==|=(?!=)|\.|\+\s*\w+\.code|\)\s*BX)/.test(a) || /(\.test\(|!|Error\(|&&\s*|ERRMSG\.safe\()\s*$/.test(b) || /console\.\w+\([^;]*$/.test(b) || /x\.message\)?;?$|^x\.message, 'ok'/.test(L.slice(m.index, m.index + 30))) continue;
    if (/ERRMSG\.safe\(e\.message\) \? e\.message/.test(L.slice(Math.max(0, m.index - 30), m.index + 12))) continue;
    left.push(`${path.relative(ROOT, p)}:${i + 1}`); } }); } })(ROOT);
ok(left.length === 0, 'e.message 직접 표시 남음: ' + left.join(', '));
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(k => srv.once('listening', k)); const B = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const errs = [];
  const open = async (url) => { const ctx = await browser.newContext(); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(url + ' ' + e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + url, { waitUntil: 'load' }); await p.waitForTimeout(400); return { ctx, p }; };
  const CASES = () => { const E = (m, o) => Object.assign(new Error(m), o || {}); return {
    srv: errMsg(E('없는 주소입니다.', { status: 404, code: 'not_found' })),
    srvSoft: errMsg(E('훈련기관에 문의해 주십시오.', { status: 403 })),
    type: errMsg(new TypeError("Cannot read properties of undefined (reading 'x')")),
    net: errMsg(new TypeError('Failed to fetch')),
    eng: errMsg(E('Internal Server Error', { status: 500 })),
    sql: errMsg(E('relation "pii.users" does not exist', { status: 500, code: 'server' })),
    stackKo: errMsg(E('오류 발생\n    at Object.run (app.js:12:3)')),
    status: errMsg(E('오류 429', { status: 429 })),
    code: errMsg(E('x', { code: 'plan_feature' })),
    fbEmpty: errMsg(new Error('boom'), ''), fb: errMsg(new Error('boom'), '불러오지 못했습니다.'), nul: errMsg(null), str: errMsg('ReferenceError: a is not defined'),
    abort: errMsg(Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' })), tone: ERRMSG.TONE }; };
  try {
    /* ② 운영자 화면 */
    { const { ctx, p } = await open('/index.html'); const R = await p.evaluate(CASES);
      ok(R.tone === 'op', '운영자 말투 op ' + R.tone); ok(R.srv === '없는 주소입니다.', '서버 한국어 문구 유지 ' + R.srv); ok(R.srvSoft === '훈련기관에 문의해 주십시오.', '운영자는 합니다체 유지');
      ok(/잠시 후 다시 시도하십시오/.test(R.type) && !/Cannot|undefined/.test(R.type), '예외 원문 차단 ' + R.type); ok(/네트워크/.test(R.net), '네트워크 안내 ' + R.net);
      ok(/서버 오류/.test(R.eng), '영문 500 → 한국어 ' + R.eng); ok(/서버 오류/.test(R.sql) && !/relation/.test(R.sql), 'SQL 원문 차단 ' + R.sql); ok(!/at Object/.test(R.stackKo), '스택 차단');
      ok(/요청이 많습니다/.test(R.status), '상태 429 ' + R.status); ok(/요금제/.test(R.code), '오류 코드 문구 ' + R.code); ok(R.fbEmpty === '' && R.fb === '불러오지 못했습니다.', 'fallback 규칙');
      ok(/십시오/.test(R.nul) && /십시오/.test(R.str), 'null · 문자열 ' + R.str); ok(/취소/.test(R.abort), '취소 안내');
      /* ③ 실제 화면: 서버가 영문 · 내부 오류를 보내도 토스트는 한국어 */
      const T = await p.evaluate(async () => { const out = []; for (const m of ['TypeError: x is not a function', 'duplicate key value violates unique constraint']) { toast(errMsg(Object.assign(new Error(m), { status: 500 })), 'bad'); out.push((document.querySelector('#toasts') || document.body).innerText); } return out; });
      T.forEach((t, i) => ok(/서버 오류/.test(t) && !/TypeError|duplicate/.test(t), '토스트 ' + i + ' ' + t.slice(0, 60)));
      await ctx.close(); }
    /* ② 학습자 화면 */
    { const { ctx, p } = await open('/learner.html'); const R = await p.evaluate(CASES);
      ok(R.tone === 'lr', '학습자 말투 lr ' + R.tone); ok(R.srvSoft === '훈련기관에 문의해 주세요.', '학습자 해요체 변환 ' + R.srvSoft);
      ok(/해 주세요/.test(R.type) && !/Cannot/.test(R.type), '학습자 예외 차단 ' + R.type); ok(/인터넷/.test(R.net), '학습자 네트워크 ' + R.net); ok(/요청이 많아요/.test(R.status), '학습자 429');
      ok(!/십시오/.test(Object.values(R).join(' ')), '학습자 문구에 합니다체 없음');
      await ctx.close(); }
    { const { ctx, p } = await open('/liveclass.html'); ok(await p.evaluate(() => typeof errMsg === 'function'), '실시간 수업 화면 errMsg 로드'); await ctx.close(); }
    ok(errs.length === 0, '페이지 오류 없음 ' + errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); srv.close(); }
  console.log(`errmsg: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
