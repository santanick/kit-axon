'use strict';
/* v34.5 홈페이지 이미지 /api/media 규격 대조 — Node · Java 서버를 같은 DB에 띄우고
   ① 같은 요청(업로드 · 중복 · 목록 · 공개 조회 · 304 · 권한 · 형식 · 크기 · SVG 정화 · 한도 · 삭제)의 상태 · 응답 · 머리말이 같은지
   ② 같은 파일을 양쪽에 올리면 같은 id(정리된 바이트의 해시)가 나오는지, 한쪽이 올린 이미지를 다른 쪽이 그대로 내주는지 확인한다.
   사용: node test/media.js http://127.0.0.1:<node> http://127.0.0.1:<java>   (두 서버 MEDIA_TENANT_MB=1 · TRUST_PROXY_HOPS=0 · COOKIE_SECURE=0) */
const crypto = require('node:crypto');
const { png, jpeg, webp, chunk } = require('../../service/test/media-fixtures');
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
const HDR = ['content-type', 'cache-control', 'etag', 'content-security-policy', 'cross-origin-resource-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy'];
const hdrs = r => Object.fromEntries(HDR.map(k => [k, (r.h.get(k) || '').replace(/;\s*charset=utf-8/i, '')]));
const norm = (v, tid) => JSON.parse(JSON.stringify(v == null ? null : v).split(tid).join('<TID>').replace(/"at":"[^"]+"/g, '"at":"<AT>"'));

const SVG = '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="alert(1)" viewBox="0 0 10 10"><!-- c --><script>alert(2)</script><defs><linearGradient id="g"><stop offset="0" stop-color="#36c"/></linearGradient></defs>'
  + '<a xlink:href="javascript:alert(3)"><rect id="r" width="10" height="10" style="fill:url(#g)" onclick="x()"/></a><image href="https://evil.example/x.png"/><image href="data:image/png;base64,iVBORw0KGgo="/><use href="#r"/><foreignObject><div>x</div></foreignObject>'
  + '<style>@import url(https://e.x/a.css)</style><style>.a{fill:#000}</style><text x="1" y="5" data-t="&#106;s">한글 글자</text><circle r="2" fill="javascript:x" /></svg>';

async function scenario(base, tag) {
  const R = {}; const em = `md_${tag}_${Date.now()}@example.com`;
  const s = await call(base, 'POST', '/api/signup', { json: { email: em, password: 'Contract2026x', orgName: '이미지 대조', type: 'k12' } });
  const ck = s.ck; const tid = s.j && s.j.tenant && s.j.tenant.tid; R.tid = tid;
  R.noAuth = await call(base, 'POST', '/api/media', { raw: png(4, 4) });
  R.csrf = await call(base, 'POST', '/api/media', { raw: png(4, 4), cookie: ck, csrf: false });
  R.png = await call(base, 'POST', '/api/media?name=' + encodeURIComponent(' 첫 화면<b>/"x".png '), { raw: png(8, 8, [1, 2, 3], [chunk('tEXt', Buffer.from('Author\0kim')), chunk('tIME', Buffer.alloc(7))]), cookie: ck });
  R.dup = await call(base, 'POST', '/api/media', { raw: png(8, 8, [1, 2, 3]), cookie: ck });
  R.jpeg = await call(base, 'POST', '/api/media', { raw: jpeg(), cookie: ck });
  R.webp = await call(base, 'POST', '/api/media', { raw: webp(), cookie: ck });
  R.svg = await call(base, 'POST', '/api/media', { raw: Buffer.from(SVG), cookie: ck });
  R.svgBom = await call(base, 'POST', '/api/media', { raw: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('  <svg viewBox="0 0 1 1"><path d="M0 0h1"/></svg>\n')]), cookie: ck });
  R.svgDtd = await call(base, 'POST', '/api/media', { raw: Buffer.from('<!DOCTYPE svg [<!ENTITY a "b">]><svg>&a;</svg>'), cookie: ck });
  R.svgBadUtf = await call(base, 'POST', '/api/media', { raw: Buffer.concat([Buffer.from('<svg>'), Buffer.from([0xc3, 0x28]), Buffer.from('</svg>')]), cookie: ck });
  R.gif = await call(base, 'POST', '/api/media', { raw: Buffer.from('GIF89a0000000000'), cookie: ck });
  R.html = await call(base, 'POST', '/api/media', { raw: Buffer.from('<html><body>x</body></html>'), cookie: ck });
  R.empty = await call(base, 'POST', '/api/media', { raw: Buffer.alloc(0), cookie: ck });
  R.trunc = await call(base, 'POST', '/api/media', { raw: png(4, 4).subarray(0, 40), cookie: ck });
  R.jpegBad = await call(base, 'POST', '/api/media', { raw: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 1, 2]), cookie: ck });
  R.big = await call(base, 'POST', '/api/media', { raw: Buffer.alloc(2 * 1024 * 1024 + 1, 7), cookie: ck });
  const id = R.png.j && R.png.j.id;
  R.get = await call(base, 'GET', '/api/media/' + id);
  R.get304 = await call(base, 'GET', '/api/media/' + id, { hdr: { 'if-none-match': R.get.h.get('etag') || '' } });
  R.getSvg = await call(base, 'GET', '/api/media/' + (R.svg.j && R.svg.j.id));
  R.getNo = await call(base, 'GET', '/api/media/' + tid + '.' + 'f'.repeat(40));
  R.getBad = await call(base, 'GET', '/api/media/nope');
  R.getOther = await call(base, 'GET', '/api/media/tn_zzzzzzzzzz.' + (id || '').split('.')[1]);
  R.head = await call(base, 'HEAD', '/api/media/' + id);
  R.put = await call(base, 'PUT', '/api/media/' + id, { raw: png(2, 2), cookie: ck });
  R.list = await call(base, 'GET', '/api/media?limit=3', { cookie: ck });
  R.listBad = await call(base, 'GET', '/api/media?limit=abc', { cookie: ck });
  R.listNo = await call(base, 'GET', '/api/media');
  const noisy = () => { const b = png(300, 300, [9, 9, 9]); return Buffer.concat([b.subarray(0, 33), chunk('zzZz', crypto.randomBytes(600 * 1024)), b.subarray(33)]); };
  R.q1 = await call(base, 'POST', '/api/media', { raw: noisy(), cookie: ck });
  R.q2 = await call(base, 'POST', '/api/media', { raw: noisy(), cookie: ck });
  R.delNo = await call(base, 'DELETE', '/api/media/' + id);
  R.delOther = await call(base, 'DELETE', '/api/media/tn_zzzzzzzzzz.' + (id || '').split('.')[1], { cookie: ck });
  R.del = await call(base, 'DELETE', '/api/media/' + id, { cookie: ck });
  R.del2 = await call(base, 'DELETE', '/api/media/' + id, { cookie: ck });
  R.getGone = await call(base, 'GET', '/api/media/' + id);
  R.audit = await call(base, 'GET', '/api/audit', { cookie: ck });
  R.ck = ck; return R;
}

(async () => {
  const a = await scenario(N, 'n'); const b = await scenario(J, 'j');
  for (const k of Object.keys(a)) {
    if (k === 'tid' || k === 'ck') continue; const skipJ = k === 'audit' || k === 'q1'; const x = a[k], y = b[k];
    eq(x.st, y.st, `${k} 상태`);
    if ((x.j || y.j) && !skipJ) eq(norm(x.j, a.tid), norm(y.j, b.tid), `${k} 응답`);
    else if (!x.j && !y.j) ok(x.buf.equals(y.buf), `${k} 본문 바이트`);
    eq(hdrs(x), hdrs(y), `${k} 머리말`);
  }
  /* 같은 파일 → 같은 해시(두 서버의 정리 결과가 바이트 단위로 같음) */
  for (const k of ['png', 'jpeg', 'webp', 'svg', 'svgBom']) eq(String(a[k].j && a[k].j.id).split('.')[1], String(b[k].j && b[k].j.id).split('.')[1], `${k} 내용 해시`);
  ok(a.get.st === 200 && !a.get.buf.includes('tEXt') && a.getSvg.buf.toString().indexOf('script') < 0 && a.getSvg.buf.toString().indexOf('onload') < 0, 'Node 정화 결과');
  ok(b.get.st === 200 && !b.get.buf.includes('tEXt') && b.getSvg.buf.toString().indexOf('evil.example') < 0 && b.getSvg.buf.toString().includes('한글 글자'), 'Java 정화 결과');
  eq(a.audit.j.rows.map(r => [r.action, r.detail && r.detail.mime || null]), b.audit.j.rows.map(r => [r.action, r.detail && r.detail.mime || null]), '감사 기록');
  /* 서버 간 호환: Node가 올린 이미지를 Java가 내주고, Java가 지운다 */
  const up = await call(N, 'POST', '/api/media', { raw: jpeg(), cookie: a.ck });
  const viaJ = await call(J, 'GET', up.j.url); ok(viaJ.st === 200 && viaJ.buf.equals((await call(N, 'GET', up.j.url)).buf), 'Node 업로드 → Java 조회');
  const lj = await call(J, 'GET', '/api/media', { cookie: a.ck }); eq(norm(lj.j, a.tid), norm((await call(N, 'GET', '/api/media', { cookie: a.ck })).j, a.tid), 'Node 세션으로 Java 목록');
  ok((await call(J, 'DELETE', up.j.url, { cookie: a.ck })).j.ok === true && (await call(N, 'GET', up.j.url)).st === 404, 'Java 삭제 → Node 404');
  const upj = await call(J, 'POST', '/api/media', { raw: webp(), cookie: b.ck }); ok(upj.j.dup === true && (await call(N, 'GET', upj.j.url)).st === 200, 'Java 기관 이미지를 Node가 공개 조회');
  console.log(`media 대조: ${pass} 통과 · ${fail} 실패`); errs.slice(0, 40).forEach(e => console.log(' ✗ ' + e)); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
