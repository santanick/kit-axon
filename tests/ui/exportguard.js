'use strict';
/* 가디언 4차 d6 — 화면에서 직접 만드는 CSV · 엑셀 내려받기 통제 점검(브라우저 없이)
   ① 정적: didisam/ 운영자 화면의 downloadCSV 호출 중 개인정보 열(학번 · 이름 · 연락처 …)이 있는 파일이 accrev.js 감쌈(exportGuard)에 걸리는지,
      downloadCSV를 거치지 않는 CSV · 엑셀 Blob 생성 지점은 exportGuard를 부르거나 허용 목록(개인정보 없음 · 양식)에 있는지
   ② 동작: accrev.js를 vm에 올려 사유 입력 · 취소 · 학번 끝 4자리 · 원본(정운영자) · POST /api/export/log 호출 · 거절(403) 처리를 확인
   사용: node tests/ui/exportguard.js */
const fs = require('fs'); const path = require('path'); const vm = require('vm'); const assert = require('assert/strict');
const ROOT = path.join(__dirname, '..', '..'); const D = path.join(ROOT, 'didisam'); let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
const ACC = fs.readFileSync(path.join(D, 'accrev.js'), 'utf8');

/* ── ② 동작 ── */
function load({ live, role, reply = '학사 점검', yes = false, apiFn } = {}) {
  const got = [], asked = [], calls = [], alerts = []; let clickCap = null;
  const ctx = { console, Promise, URL, setTimeout, got, Date, JSON };
  ctx.window = ctx; ctx.HTMLAnchorElement = function () {}; ctx.HTMLAnchorElement.prototype.click = function () {};
  ctx.document = { addEventListener: (t, f, cap) => { if (t === 'click' && cap) clickCap = f; } };
  ctx.prompt = m => { asked.push(m); return reply; }; ctx.alert = m => alerts.push(m); ctx.confirm = () => yes; ctx.fetch = async () => ({ ok: true });
  vm.createContext(ctx);
  vm.runInContext(`var S = { me: { role: ${JSON.stringify(role || 'sub')} } }; var LIVE = ${live ? JSON.stringify({ user: { role } }) : 'null'};
    function downloadCSV(n, c, r) { got.push({ n, c, r }); }`, ctx);
  if (live) ctx.api = async (m, p, b) => { calls.push({ m, p, b }); if (apiFn) return apiFn(b); return { ok: true, raw: !!b.raw }; };
  vm.runInContext(ACC, ctx);
  const click = act => clickCap && clickCap({ target: { closest: () => ({ getAttribute: () => act }) } });
  return { ctx, got, asked, calls, alerts, click };
}
(async () => {
  { const E = load(); const r = E.ctx.downloadCSV('a.csv', ['학번', '학과', '점수'], [['20261001', '컴공', 90], ['1234', '컴공', 80]]); await r;
    ok(E.asked.length === 1 && E.got.length === 1 && E.got[0].r[0][0] === '****1001' && E.got[0].r[1][0] === '****' && E.got[0].r[0][1] === '컴공', `시연: 사유 → 학번 끝 4자리 ${JSON.stringify(E.got)}`); }
  { const E = load({ reply: null }); await E.ctx.downloadCSV('a.csv', ['이름', '연락처'], [['홍', '010']]); ok(E.got.length === 0, '취소하면 파일을 만들지 않음'); }
  { const E = load({ reply: '가' }); await E.ctx.downloadCSV('a.csv', ['이름'], [['홍']]); ok(E.got.length === 0 && E.alerts.length === 1, '사유 1자 → 거절'); }
  { const E = load(); E.ctx.downloadCSV('KPI.csv', ['지표', '값'], [['등록', 3]]); ok(E.asked.length === 0 && E.got.length === 1, '개인정보 열 없음 → 묻지 않음'); }
  { const E = load(); E.ctx.downloadCSV('일괄가입_양식.csv', ['이름', '이메일'], [['홍길동', 'hong@example.com']]); ok(E.asked.length === 0 && E.got.length === 1, '양식 → 묻지 않음'); }
  { const E = load({ live: true, role: 'sub' }); E.click('lmsa-roster-csv'); await E.ctx.downloadCSV('수강생.csv', ['학번', '학과코드'], [['20261001', 'CS']]);
    ok(E.calls.length === 1 && E.calls[0].m === 'POST' && E.calls[0].p === '/api/export/log' && JSON.stringify(E.calls[0].b) === '{"kind":"csv:lmsa-roster-csv","n":1,"reason":"학사 점검","raw":false}', `운영: /api/export/log ${JSON.stringify(E.calls)}`);
    ok(E.got[0].r[0][0] === '****1001', '운영: 부운영자는 가림'); }
  { const E = load({ live: true, role: 'owner', yes: true }); await E.ctx.downloadCSV('a.csv', ['사번', '소속'], [['E20261001', '인사']]);
    ok(E.calls[0].b.raw === true && E.got[0].r[0][0] === 'E20261001', '정운영자 원본 선택 → 원본'); }
  { const E = load({ live: true, role: 'owner', yes: false }); await E.ctx.downloadCSV('a.csv', ['학습자 번호', '포인트'], [['S0001234', 10]]); ok(E.got[0].r[0][0] === '****1234', '정운영자 가림 선택 → 가림'); }
  { const E = load({ live: true, role: 'sub', apiFn: () => { const e = new Error('원본(가리지 않은) 내려받기는 정운영자만 할 수 있습니다.'); e.status = 403; e.code = 'export_raw'; throw e; } });
    const g = await E.ctx.exportGuard('x', [{ sid: '20261001' }], { raw: true }); ok(g === null && E.alerts.length === 1, '서버 거절(403) → null · 안내'); }
  { const E = load(); const g = await E.ctx.exportGuard('mods_grades', [{ sid: '20261001', name: '홍' }]); ok(g && g.raw === false && g.rows[0].sid === '****1001' && g.rows[0].name === '홍', `객체 행 sid 가림 ${JSON.stringify(g)}`); }

  /* ── ① 정적 ── */
  const E0 = load(); const needs = E0.ctx.exportGuard.needs;
  const LEARNER = /^(l(?:ai-home|assess|cal|comm|conn|content|fac|my|note|note-sync|shop|app|compliance|acct)\.js|lscn-[\w-]+\.js|lms\/[\w-]*learner\.js|lms\/bpkg-sw\.js|lms\/rtc-room\.js)$/; /* 학습자 본인 자료(노트 · 카드 · 달력)는 대상 아님 */
  const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'vendor') walk(p); } else if (f.endsWith('.js')) files.push(p); } })(D);
  const strs = t => [...t.matchAll(/'([^'\\]*)'|`([^`$\\]*)`|"([^"\\]*)"/g)].map(m => m[1] ?? m[2] ?? m[3]);
  function arg2(src, i) { /* downloadCSV( 첫 인자 뒤의 두 번째 인자 텍스트 */
    let d = 0, j = i, start = -1; for (; j < src.length; j++) { const ch = src[j];
      if (ch === '`') { j++; while (j < src.length && src[j] !== '`') { if (src[j] === '$' && src[j + 1] === '{') { let e = 1; j += 2; while (e && j < src.length) { if (src[j] === '{') e++; else if (src[j] === '}') e--; j++; } continue; } j++; } continue; }
      if (ch === "'" || ch === '"') { j++; while (j < src.length && src[j] !== ch) { if (src[j] === '\\') j++; j++; } continue; }
      if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) { if (d === 0) return start < 0 ? '' : src.slice(start, j); d--; }
      else if (ch === ',' && d === 0) { if (start < 0) start = j + 1; else return src.slice(start, j); } }
    return '';
  }
  const PII = [], NOPII = [], UNK = []; const blobs = [];
  for (const f of files) { const rel = path.relative(D, f).replace(/\\/g, '/'); const src = fs.readFileSync(f, 'utf8'); if (rel === 'core.js' || rel === 'accrev.js' || LEARNER.test(rel)) continue;
    for (const m of src.matchAll(/downloadCSV\(/g)) { if (/function downloadCSV\($/.test(src.slice(Math.max(0, m.index - 9), m.index + 12))) continue;
      const line = src.slice(0, m.index).split('\n').length; let a = arg2(src, m.index + 12).trim(); if (!a) continue;
      const v = /^[A-Za-z_$][\w$]*$/.test(a) && new RegExp(`(?:const|let|var)\\s+${a}\\s*=\\s*(\\[[^\\n]*?\\]);`).exec(src); if (v) a = v[1];
      const cols = strs(a); const at = `${rel}:${line}`;
      if (!cols.length) UNK.push(at); else if (needs('x.csv', cols, [[1]])) PII.push(at); else NOPII.push(at + ' ' + cols.slice(0, 3).join('/')); }
    for (const m of src.matchAll(/new Blob\([^\n]{0,200}?(text\/csv|spreadsheetml)/g)) blobs.push({ rel, line: src.slice(0, m.index).split('\n').length, guarded: /exportGuard|\bXG\(/.test(src) }); }
  /* 지시서가 지목한 화면은 반드시 PII로 잡혀야 한다 */
  for (const f of ['lms/a.js', 'milrw.js', 'mil.js', 'polish.js', 'mods.js', 'ulms.js']) ok(PII.some(x => x.startsWith(f + ':')), `지목 화면 ${f}의 CSV가 exportGuard 대상으로 잡힘`);
  for (const at of ['mods.js']) ok(PII.filter(x => x.startsWith(at + ':')).length >= 2, `${at} 성적 · 이수 CSV 여러 건`);
  const ALLOW = { 'dash26.js': '운영 현황 집계(개인정보 없음)', 'lms/a.js': '학사 업로드 빈 양식', 'cls-ops.js': '' };
  for (const b of blobs) ok(b.guarded || ALLOW[b.rel], `Blob CSV · 엑셀 ${b.rel}:${b.line} — exportGuard 없음`);
  ok(/xlsClass[\s\S]{0,400}XG\('cls_xlsx'/.test(fs.readFileSync(path.join(D, 'cls-ops.js'), 'utf8')), 'cls-ops 이수 현황 엑셀(과정별)에 exportGuard');
  ok(/XG\('cls_xlsx_all'/.test(fs.readFileSync(path.join(D, 'cls-ops.js'), 'utf8')), 'cls-ops 이수 현황 엑셀(전체 명단)에 exportGuard');
  ok(/downloadCSV = function[\s\S]{0,300}exportGuard\(/.test(ACC) && /'\/api\/export\/log'/.test(ACC), 'accrev.js가 downloadCSV를 감싸고 /api/export/log 호출');
  ok(/<script src="accrev\.js/.test(fs.readFileSync(path.join(D, 'index.html'), 'utf8')) && fs.readFileSync(path.join(D, 'index.html'), 'utf8').indexOf('core.js') < fs.readFileSync(path.join(D, 'index.html'), 'utf8').indexOf('accrev.js'), 'index.html: core.js 뒤에 accrev.js');
  console.log(`화면 CSV(downloadCSV) 개인정보 열 ${PII.length}곳 감쌈 · 개인정보 없음 ${NOPII.length}곳 통과 · 열 해석 불가 ${UNK.length}곳(${UNK.join(', ')}) · Blob CSV/엑셀 ${blobs.length}곳`);
  if (process.env.V) console.log('PII:', PII.join(' '), '\nNOPII:', NOPII.join(' | '));
  console.log(`exportguard: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
