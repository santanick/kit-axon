'use strict';
/* v35 강의 파일 /api/media/f 규격 대조 — Node · Java 서버를 같은 DB에 띄우고 같은 요청(시작 · 조각 · 완료 · 위장 · 매크로 · 덜 올림 · 한도 ·
   공개 조회 · Range 206 · 416 · 304 · 받기 · 목록 · 삭제)의 상태 · 응답 · 머리말 · 본문이 같은지, 한쪽이 올린 파일을 다른 쪽이 내주는지 확인한다.
   사용: node test/mediafile.js http://127.0.0.1:<node> http://127.0.0.1:<java>
   (두 서버 MEDIA_CHUNK_KB=64 · MEDIA_FILE_TENANT_MB=1 · MEDIA_VIDEO_MB=0.9 · MEDIA_DOC_MB=0.5 · TRUST_PROXY_HOPS=0 · COOKIE_SECURE=0) */
const X = require('../../service/test/mediafile-fixtures');
const { png } = require('../../service/test/media-fixtures');
const [N, J] = [process.argv[2] || 'http://127.0.0.1:9811', process.argv[3] || 'http://127.0.0.1:9812'];
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
async function call(base, method, path, { raw, json, cookie, csrf = true, hdr = {} } = {}) {
  const h = { ...hdr }; if (csrf && method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (json) h['content-type'] = 'application/json'; else if (raw) h['content-type'] = 'application/octet-stream';
  const r = await fetch(base + path, { method, headers: h, body: json ? JSON.stringify(json) : raw, redirect: 'manual' });
  const buf = Buffer.from(await r.arrayBuffer()); let j = null; try { j = JSON.parse(buf.toString()); } catch { }
  const sc = r.headers.get('set-cookie'); return { st: r.status, j, buf, h: r.headers, ck: sc ? sc.split(';')[0] : null };
}
const HDR = ['content-type', 'cache-control', 'etag', 'content-security-policy', 'cross-origin-resource-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'accept-ranges', 'content-range', 'content-disposition', 'content-length'];
/* JSON 응답의 content-length(Node는 청크 전송) · content-disposition(Spring RFD 보호가 'inline;filename=f.txt'를 붙임)은 비교하지 않는다 */
const hdrs = r => { const js = /json/.test(r.h.get('content-type') || ''); return Object.fromEntries(HDR.filter(k => !(js && (k === 'content-length' || k === 'content-disposition'))).map(k => [k, (r.h.get(k) || '').replace(/;\s*charset=utf-8/i, '')])); };
/* id는 무작위 → 기관 · 해시를 자리표시로 */
const norm = (v, tid) => JSON.parse(JSON.stringify(v == null ? null : v).split(tid).join('<TID>').replace(/[a-f0-9]{40}/g, '<H>').replace(/"at":"[^"]+"/g, '"at":"<AT>"'));
const nh = (o, tid) => { const x = hdrs(o); for (const k of Object.keys(x)) x[k] = x[k].split(tid).join('<TID>').replace(/[a-f0-9]{40}/g, '<H>'); return x; };

async function up(base, ck, name, buf, { skip = -1 } = {}) {
  const s = await call(base, 'POST', '/api/media/f', { json: { name, size: buf.length }, cookie: ck }); if (s.st !== 200) return { s };
  const P = []; for (let i = 0; i < s.j.parts; i++) { if (i === skip) continue; P.push(await call(base, 'PUT', `/api/media/f/${s.j.id}?part=${i}`, { raw: buf.subarray(i * s.j.chunk, (i + 1) * s.j.chunk), cookie: ck })); if (P[P.length - 1].st !== 200) return { s, p: P[P.length - 1] }; }
  return { s, p: P[P.length - 1], d: await call(base, 'POST', `/api/media/f/${s.j.id}/done`, { cookie: ck }) };
}
async function scenario(base, tag) {
  const R = {}; const em = `mf_${tag}_${Date.now()}@example.com`;
  const s = await call(base, 'POST', '/api/signup', { json: { email: em, password: 'Contract2026x', orgName: '파일 대조', type: 'voc' } });
  const ck = s.ck; const tid = s.j && s.j.tenant && s.j.tenant.tid; R.tid = tid;
  const add = (k, u) => { R[k + '.s'] = u.s; if (u.p) R[k + '.p'] = u.p; if (u.d) R[k + '.d'] = u.d; return u; };
  R.noAuth = await call(base, 'POST', '/api/media/f', { json: { name: 'a.pdf', size: 1 } });
  R.csrf = await call(base, 'POST', '/api/media/f', { json: { name: 'a.pdf', size: 1 }, cookie: ck, csrf: false });
  R.exe = await call(base, 'POST', '/api/media/f', { json: { name: 'run.exe', size: 10 }, cookie: ck });
  R.noName = await call(base, 'POST', '/api/media/f', { json: { size: 10 }, cookie: ck });
  R.big = await call(base, 'POST', '/api/media/f', { json: { name: 'big.mp4', size: 950 * 1024 }, cookie: ck });
  R.bigDoc = await call(base, 'POST', '/api/media/f', { json: { name: 'b.hwp', size: 600 * 1024 }, cookie: ck });
  R.size0 = await call(base, 'POST', '/api/media/f', { json: { name: 'a.pdf', size: 0 }, cookie: ck });
  R.sizeStr = await call(base, 'POST', '/api/media/f', { json: { name: 'a.pdf', size: '12.5' }, cookie: ck });
  R.badJson = await call(base, 'POST', '/api/media/f', { raw: Buffer.from('{x'), cookie: ck, hdr: { 'content-type': 'application/json' } });
  const vid = X.mp4(200 * 1024);
  const v = add('vid', await up(base, ck, ' 1차시 <강의>/"영상".MP4 ', vid)); const url = v.d && v.d.j && v.d.j.url;
  R.again = await call(base, 'POST', url.replace('/api/media/f/', '/api/media/f/') + '/done', { cookie: ck });
  R.get = await call(base, 'GET', url);
  R.r1 = await call(base, 'GET', url, { hdr: { range: 'bytes=100-199' } });
  R.r2 = await call(base, 'GET', url, { hdr: { range: 'bytes=65000-' } });
  R.r3 = await call(base, 'GET', url, { hdr: { range: 'bytes=-10' } });
  R.r4 = await call(base, 'GET', url, { hdr: { range: `bytes=${vid.length}-` } });
  R.r5 = await call(base, 'GET', url, { hdr: { range: 'bytes=0-1,5-6' } });
  R.r6 = await call(base, 'GET', url, { hdr: { range: 'lines=1-2' } });
  R.e304 = await call(base, 'GET', url, { hdr: { 'if-none-match': R.get.h.get('etag') || '' } });
  R.dl = await call(base, 'GET', url + '?dl=1', { hdr: { range: 'bytes=0-3' } });
  R.viaImg = await call(base, 'GET', url.replace('/api/media/f/', '/api/media/'));
  R.getNo = await call(base, 'GET', `/api/media/f/${tid}.${'f'.repeat(40)}`);
  R.getBad = await call(base, 'GET', '/api/media/f/nope');
  const pdf = add('pdf', await up(base, ck, '교안.pdf', X.pdf(1000)));
  R.pdfGet = await call(base, 'GET', pdf.d.j.url);
  const dx = add('docx', await up(base, ck, '과제 안내.docx', X.docx(70000)));
  R.docxGet = await call(base, 'GET', dx.d.j.url);
  add('hwp', await up(base, ck, 'a.hwp', X.hwp())); add('hwpx', await up(base, ck, 'a.hwpx', X.hwpx())); add('pptx', await up(base, ck, 'a.pptx', X.pptx()));
  add('mp3', await up(base, ck, 'a.mp3', X.mp3())); add('m4a', await up(base, ck, 'a.m4a', X.m4a())); add('webm', await up(base, ck, 'a.webm', X.webm()));
  const fk = add('fake', await up(base, ck, '사진.pdf', png(8, 8)));
  R.fakeDone = await call(base, 'POST', `/api/media/f/${fk.s.j.id}/done`, { cookie: ck });
  add('qt', await up(base, ck, 'q.mp4', X.mp4(0, 'qt  ')));
  add('macro', await up(base, ck, 'm.docx', X.docx(0, [['word/vbaProject.bin', 'Attribute VB']])));
  add('wrongZip', await up(base, ck, 'z.pptx', X.docx()));
  add('cut', await up(base, ck, 'cut.docx', X.docx().subarray(0, 80)));
  add('skip', await up(base, ck, 'i.mp4', vid, { skip: 2 }));
  const c = await call(base, 'POST', '/api/media/f', { json: { name: 'c.mp4', size: 70000 }, cookie: ck }); R.c = c;
  R.pShort = await call(base, 'PUT', `/api/media/f/${c.j.id}?part=0`, { raw: Buffer.alloc(100), cookie: ck });
  R.pSeq = await call(base, 'PUT', `/api/media/f/${c.j.id}?part=9`, { raw: Buffer.alloc(100), cookie: ck });
  R.pNoSeq = await call(base, 'PUT', `/api/media/f/${c.j.id}`, { raw: Buffer.alloc(100), cookie: ck });
  R.pBig = await call(base, 'PUT', `/api/media/f/${c.j.id}?part=0`, { raw: Buffer.alloc(65536 + 17), cookie: ck });
  R.pOther = await call(base, 'PUT', `/api/media/f/tn_zzzzzzzzzz.${'a'.repeat(40)}?part=0`, { raw: Buffer.alloc(1), cookie: ck });
  R.upGet = await call(base, 'GET', c.j.url);
  R.list = await call(base, 'GET', '/api/media?kind=file&limit=3', { cookie: ck });
  R.listImg = await call(base, 'GET', '/api/media', { cookie: ck });
  R.quota = await call(base, 'POST', '/api/media/f', { json: { name: 'more.mp4', size: 850 * 1024 }, cookie: ck });
  R.delNo = await call(base, 'DELETE', url);
  R.del = await call(base, 'DELETE', url, { cookie: ck });
  R.del2 = await call(base, 'DELETE', url, { cookie: ck });
  R.gone = await call(base, 'GET', url);
  R.audit = await call(base, 'GET', '/api/audit', { cookie: ck });
  R.ck = ck; R.url = url; R.vid = vid; return R;
}

(async () => {
  const a = await scenario(N, 'n'); const b = await scenario(J, 'j');
  for (const k of Object.keys(a)) {
    if (['tid', 'ck', 'url', 'vid'].includes(k)) continue; const x = a[k], y = b[k];
    if (!x || !y) { ok(false, `${k} 한쪽 없음`); continue; }
    eq(x.st, y.st, `${k} 상태`);
    if (k === 'audit') continue;
    if (x.j || y.j) eq(norm(x.j, a.tid), norm(y.j, b.tid), `${k} 응답`); else ok(x.buf.equals(y.buf), `${k} 본문 바이트`);
    eq(nh(x, a.tid), nh(y, b.tid), `${k} 머리말`);
  }
  ok(a.get.buf.equals(a.vid) && b.get.buf.equals(b.vid), '전체 내려받기 = 원본');
  ok(a.r1.buf.equals(a.vid.subarray(100, 200)) && b.r1.buf.equals(b.vid.subarray(100, 200)), 'Range 본문');
  eq(a.audit.j.rows.filter(r => /^media\./.test(r.action)).map(r => [r.action, r.detail && r.detail.mime || null]), b.audit.j.rows.filter(r => /^media\./.test(r.action)).map(r => [r.action, r.detail && r.detail.mime || null]), '감사 기록');
  /* 서버 간 호환: Node가 올리기 시작한 파일을 Java로 이어 올리고, Node가 내준다 */
  const buf = X.webm(150 * 1024); const s = await call(N, 'POST', '/api/media/f', { json: { name: 'mix.webm', size: buf.length }, cookie: a.ck });
  for (let i = 0; i < s.j.parts; i++) await call(i % 2 ? J : N, 'PUT', `/api/media/f/${s.j.id}?part=${i}`, { raw: buf.subarray(i * s.j.chunk, (i + 1) * s.j.chunk), cookie: a.ck });
  const d = await call(J, 'POST', `/api/media/f/${s.j.id}/done`, { cookie: a.ck }); ok(d.st === 200, 'Node 시작 → Java 완료');
  ok((await call(N, 'GET', s.j.url)).buf.equals(buf) && (await call(J, 'GET', s.j.url, { hdr: { range: 'bytes=70000-70009' } })).buf.equals(buf.subarray(70000, 70010)), 'Node · Java 재생 본문 같음');
  ok((await call(J, 'DELETE', s.j.url, { cookie: a.ck })).j.ok === true && (await call(N, 'GET', s.j.url)).st === 404, 'Java 삭제 → Node 404');
  console.log(`mediafile 대조: ${pass} 통과 · ${fail} 실패`); errs.slice(0, 40).forEach(e => console.log(' ✗ ' + e)); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
