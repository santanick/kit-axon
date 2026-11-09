'use strict';
/* v35 C6 강의 파일 저장(/api/media/f) — 문서(pdf · pptx · docx · hwp · hwpx) · 영상(mp4 · webm) · 음성(mp3 · m4a).
   홈페이지 이미지(media.js)와 같은 media 표(kind = doc|video|audio, status = up|ok)를 쓰고, 바이트는 media_part 표에 조각(기본 8MB)으로 둔다.
   - Cloud Run 요청 본문 한도(32MiB) 때문에 나눠 올린다: 시작 → 조각 PUT(0..n-1) → 완료. 받은 조각마다 길이를 맞춰 보고, 첫 조각에서 형식(시그니처)을 본다.
   - POST   /api/media/f                 운영자 · 교강사. { name, size } → { id, url, chunk, parts, type, mime }
   - PUT    /api/media/f/:id?part=N      조각 바이트 그대로 → { ok, part }
   - POST   /api/media/f/:id/done        조각 수 · 전체 크기 · 형식(앞 · 뒤) 확인 → { id, url, name, mime, type, bytes }
   - GET    /api/media/f/:id             공개(추측할 수 없는 160비트 id). Range(206) · ETag(304) · Content-Disposition(pdf · 영상 · 음성은 바로 보기, 나머지 · ?dl=1은 받기)
   - DELETE /api/media/f/:id             운영자 또는 올린 사람
   - GET    /api/media?kind=file         목록 { rows, used, max, n }
   형식은 확장자로 고르고 시그니처(매직 바이트)로 확인한다: 확장자와 내용이 다르면 415. 매크로가 든 Office(vbaProject.bin)는 받지 않는다.
   Java(service-egov media 패키지 DdMediaFile · MediaServiceImpl)와 같은 규칙 · 같은 응답 — 바꾸면 양쪽을 같이 바꾼다. */
const crypto = require('node:crypto');

const MB = 1024 * 1024;
const TYPES = {
  pdf: ['application/pdf', 'doc'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'doc'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc'],
  hwp: ['application/x-hwp', 'doc'],
  hwpx: ['application/hwp+zip', 'doc'],
  mp4: ['video/mp4', 'video'],
  webm: ['video/webm', 'video'],
  mp3: ['audio/mpeg', 'audio'],
  m4a: ['audio/mp4', 'audio']
};
const KIND_KO = { doc: '문서', video: '영상', audio: '음성' };
const FILE_PATH = /^\/api\/media\/f\/([^/]+)$/;
const DONE_PATH = /^\/api\/media\/f\/([^/]+)\/done$/;
const ID_RE = /^(tn_[a-z0-9]{8,16})\.([a-f0-9]{40})$/;
/* 영상 · 음성: 문서처럼 열려도 스크립트가 돌지 않게 sandbox. pdf: 브라우저 PDF 보기가 sandbox에서 막혀 frame-ancestors만(같은 출처 미리보기 허용) */
const FILE_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";
const PDF_CSP = "frame-ancestors 'self'";
const INLINE = new Set(['pdf', 'mp4', 'webm', 'mp3', 'm4a']);

class FileErr extends Error { constructor(status, msg, code) { super(msg); this.status = status; this.code = code; } }
const LIST = 'PDF · PPTX · DOCX · HWP · HWPX 문서, MP4 · WEBM 영상, MP3 · M4A 음성';

function limits(env = {}) {
  const n = (k, d) => { const v = Number(env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
  return {
    doc: Math.floor(n('MEDIA_DOC_MB', 100) * MB), video: Math.floor(n('MEDIA_VIDEO_MB', 1024) * MB), audio: Math.floor(n('MEDIA_AUDIO_MB', 200) * MB),
    quota: Math.floor(n('MEDIA_FILE_TENANT_MB', 5120) * MB), files: Math.floor(n('MEDIA_FILE_MAX_FILES', 2000)),
    chunk: Math.max(64 * 1024, Math.min(16 * MB, Math.floor(n('MEDIA_CHUNK_KB', 8192) * 1024)))
  };
}
const mbText = b => b >= 1024 * MB ? `${Math.round(b / (1024 * MB) * 10) / 10}GB` : `${Math.round(b / MB)}MB`;

/** 파일 이름 → { ext, mime, type } (모르는 확장자는 null) */
function fileType(name) {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(String(name || '').trim()); if (!m) return null;
  const ext = m[1].toLowerCase(); const t = TYPES[ext]; return t ? { ext, mime: t[0], type: t[1] } : null;
}
/** 저장 · 내려받기용 이름: 제어 문자 · 경로 · 따옴표 제거, 80자(확장자 유지) */
function cleanFileName(name, ext) {
  let s = String(name || '').replace(/[\u0000-\u001f\u007f<>"'&\\/:*?|]/g, '').replace(/[ \u00a0\u3000]+/g, ' ').trim(); /* Java DdMediaFile.cleanFileName과 같은 규칙 */
  const base = s.replace(/\.[A-Za-z0-9]{2,5}$/, '').trim() || '파일';
  return `${base.slice(0, 80 - ext.length - 1)}.${ext}`;
}

/* ── 시그니처: 앞부분(첫 조각) ── */
const lat = (b, s, e) => b.toString('latin1', s, Math.min(e, b.length));
const isZip = b => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const isFtyp = b => b.length >= 12 && lat(b, 4, 8) === 'ftyp';
function headOk(ext, b) {
  switch (ext) {
    case 'pdf': return lat(b, 0, 1024).includes('%PDF-');
    case 'pptx': case 'docx': return isZip(b);
    case 'hwpx': return isZip(b) && lat(b, 30, 38) === 'mimetype' && lat(b, 0, 200).includes('application/hwp+zip');
    case 'hwp': return b.length >= 8 && b.readUInt32BE(0) === 0xd0cf11e0 && b.readUInt32BE(4) === 0xa1b11ae1;
    case 'mp4': case 'm4a': return isFtyp(b) && !/^qt {2}$/.test(lat(b, 8, 12));
    case 'webm': return b.length >= 4 && b.readUInt32BE(0) === 0x1a45dfa3 && lat(b, 0, 64).includes('webm');
    case 'mp3': return lat(b, 0, 3) === 'ID3' || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    default: return false;
  }
}
/* ── 뒷부분(마지막 1MB): Office · 한글(hwpx)은 ZIP 끝 목록(central directory)에 있어야 할 항목을 본다 ── */
const ZIP_NEED = { pptx: 'ppt/presentation.xml', docx: 'word/document.xml', hwpx: 'Contents/' };
function tailErr(ext, t) {
  const need = ZIP_NEED[ext]; if (!need) return null;
  const s = t.toString('latin1'); const eocd = s.lastIndexOf('PK\u0005\u0006');
  if (eocd < 0) return ['파일이 손상되었거나 끝까지 올라가지 않았습니다.', 'media_bad'];
  const cd = s.slice(0, eocd);
  if (/vbaProject\.bin/i.test(cd)) return ['매크로가 들어 있는 문서는 올릴 수 없습니다. 매크로 없이 다시 저장해 주세요.', 'media_macro'];
  if (!cd.includes(need)) return [`${ext.toUpperCase()} 문서가 아닙니다. 파일 형식을 확인해 주세요.`, 'media_type'];
  return null;
}
const TAIL = MB;

/** 한글 이름도 안전한 Content-Disposition */
function disposition(name, ext, dl) {
  const kind = dl || !INLINE.has(ext) ? 'attachment' : 'inline';
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/[%;\\]/g, '_');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
/** Range 머리말 → [start, end] | null(전체) | 'bad'(416). 여러 구간은 전체로 응답 */
function parseRange(h, size) {
  if (!h) return null; const m = /^bytes=(\d*)-(\d*)$/.exec(String(h).trim()); if (!m) return String(h).includes(',') ? null : 'bad';
  let a, b;
  if (m[1] === '') { if (m[2] === '') return 'bad'; const n = Number(m[2]); if (!n) return 'bad'; a = Math.max(0, size - n); b = size - 1; }
  else { a = Number(m[1]); b = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (!(a >= 0) || a >= size || b < a) return 'bad';
  return [a, b];
}

function createMediaFiles({ pool, inTenant, HttpErr, limit, ip, audit, need, needStaff, send, sendHead, env = {} }) {
  const L = limits(env);
  const E = e => e instanceof FileErr ? new HttpErr(e.status, e.message, e.code) : e;
  const url = (tid, h) => `/api/media/f/${tid}.${h}`;
  const out = (tid, r) => ({ id: `${tid}.${r.id}`, url: url(tid, r.id), name: r.name, mime: r.mime, type: r.kind, bytes: +r.bytes });
  const fail = r => { if (r && r.err) throw new HttpErr(r.err[0], r.err[1], r.err[2]); return r; };
  const missing = () => new HttpErr(404, '없는 파일입니다.', 'media_missing');
  const usage = async (c, tid) => (await c.query("select coalesce(sum(bytes), 0)::bigint used, count(*)::int n from media where tenant_id = $1 and kind <> 'image'", [tid])).rows[0];
  const own = (a, id) => { const m = ID_RE.exec(id); if (!m || m[1] !== a.tid) throw missing(); return m[2]; };
  function readRaw(req, max) {
    return new Promise((ok, no) => {
      const big = () => new HttpErr(413, '조각이 너무 큽니다.', 'too_large');
      const cl = Number(req.headers['content-length'] || 0); if (cl > max) { no(big()); req.resume(); return; }
      let n = 0; const chunks = [];
      req.on('data', c => { n += c.length; if (n > max) { no(big()); req.destroy(); return; } chunks.push(c); });
      req.on('end', () => ok(Buffer.concat(chunks))); req.on('error', no);
    });
  }
  /* 조각에 걸친 구간 읽기(offset · length) — substring은 저장 방식 external이라 필요한 부분만 읽는다 */
  async function readRange(c, tid, h, start, len) {
    const CH = (await c.query('select chunk from media where tenant_id = $1 and id = $2', [tid, h])).rows[0].chunk;
    const bufs = []; let p = start; const end = start + len;
    while (p < end) {
      const seq = Math.floor(p / CH); const off = p - seq * CH; const n = Math.min(end - p, CH - off);
      const r = (await c.query('select substring(data from $3 for $4) d from media_part where tenant_id = $1 and id = $2 and seq = $5', [tid, h, off + 1, n, seq])).rows[0];
      if (!r) throw new HttpErr(500, '파일 조각이 없습니다.', 'media_part'); bufs.push(r.d); p += r.d.length; if (!r.d.length) break;
    }
    return Buffer.concat(bufs);
  }

  async function start(req) {
    const a = await need(req);
    limit(`mfs:${a.tid}`, 300, 3600e3); limit(`mfsu:${a.uid}`, 60, 60e3);
    let body; try { body = JSON.parse((await readRaw(req, 4096)).toString('utf8') || '{}'); } catch (e) { throw new HttpErr(400, '형식이 올바르지 않습니다.', 'bad_json'); }
    const ft = fileType(body.name); if (!ft) throw new HttpErr(415, `${LIST}만 올릴 수 있습니다.`, 'media_type');
    const size = Number(body.size); if (!Number.isSafeInteger(size) || size < 1) throw new HttpErr(400, '파일 크기가 올바르지 않습니다.', 'media_bad');
    const max = L[ft.type]; if (size > max) throw new HttpErr(413, `${KIND_KO[ft.type]} 파일은 ${mbText(max)} 이하만 올릴 수 있습니다.`, 'too_large');
    const name = cleanFileName(body.name, ft.ext); const parts = Math.ceil(size / L.chunk);
    const h = crypto.randomBytes(20).toString('hex');
    return inTenant(pool, a.tid, async c => {
      await c.query("delete from media where tenant_id = $1 and status = 'up' and created_at < now() - interval '1 day'", [a.tid]);
      const u = await usage(c, a.tid);
      if (+u.used + size > L.quota) throw new HttpErr(413, `기관 강의 파일 저장 한도(${mbText(L.quota)})를 넘었습니다. 쓰지 않는 파일을 지워 주세요.`, 'media_quota');
      if (+u.n >= L.files) throw new HttpErr(413, `기관 강의 파일은 ${L.files}개까지 저장할 수 있습니다. 쓰지 않는 파일을 지워 주세요.`, 'media_quota');
      await c.query("insert into media (tenant_id, id, mime, bytes, name, kind, status, parts, chunk, created_by) values ($1, $2, $3, $4, $5, $6, 'up', $7, $8, $9)", [a.tid, h, ft.mime, size, name, ft.type, parts, L.chunk, a.email]);
      return { id: `${a.tid}.${h}`, url: url(a.tid, h), name, mime: ft.mime, type: ft.type, bytes: size, chunk: L.chunk, parts };
    });
  }
  async function part(req, id) {
    const a = await need(req); const h = own(a, id);
    limit(`mfp:${a.uid}`, 1200, 60e3);
    const ps = new URL(req.url, 'http://x').searchParams.get('part'); const seq = ps == null || ps === '' ? NaN : Number(ps);
    const raw = await readRaw(req, L.chunk + 16);
    return fail(await inTenant(pool, a.tid, async c => {
      const m = (await c.query("select mime, bytes, name, parts, chunk, status from media where tenant_id = $1 and id = $2 and kind <> 'image'", [a.tid, h])).rows[0];
      if (!m || m.status !== 'up') throw missing();
      if (!Number.isInteger(seq) || seq < 0 || seq >= m.parts) throw new HttpErr(400, '조각 번호가 올바르지 않습니다.', 'media_part');
      const want = seq < m.parts - 1 ? m.chunk : +m.bytes - m.chunk * (m.parts - 1);
      if (raw.length !== want) throw new HttpErr(400, `조각 크기가 맞지 않습니다(${raw.length} ≠ ${want}).`, 'media_part');
      if (seq === 0) { const ft = fileType(m.name); if (!headOk(ft.ext, raw)) { await c.query('delete from media where tenant_id = $1 and id = $2', [a.tid, h]); return { err: [415, `파일 내용이 ${ft.ext.toUpperCase()} 형식이 아닙니다. 확장자를 바꾼 파일은 올릴 수 없습니다.`, 'media_type'] }; } } /* 지운 뒤 확정하고 오류를 낸다 */
      await c.query('insert into media_part (tenant_id, id, seq, data) values ($1, $2, $3, $4) on conflict (tenant_id, id, seq) do update set data = excluded.data', [a.tid, h, seq, raw]);
      return { ok: true, part: seq };
    }));
  }
  async function done(req, id) {
    const a = await need(req); const h = own(a, id);
    return fail(await inTenant(pool, a.tid, async c => {
      const m = (await c.query("select mime, bytes, name, kind, parts, chunk, status from media where tenant_id = $1 and id = $2 and kind <> 'image'", [a.tid, h])).rows[0];
      if (!m) throw missing();
      if (m.status === 'ok') return { ...out(a.tid, { id: h, ...m }), dup: true };
      const g = (await c.query('select count(*)::int n, coalesce(sum(length(data)), 0)::bigint b from media_part where tenant_id = $1 and id = $2', [a.tid, h])).rows[0];
      if (g.n !== m.parts || +g.b !== +m.bytes) throw new HttpErr(409, `아직 다 올라가지 않았습니다(${g.n}/${m.parts}).`, 'media_incomplete');
      const ext = fileType(m.name).ext;
      const head = await readRange(c, a.tid, h, 0, Math.min(+m.bytes, 4096));
      let bad = headOk(ext, head) ? null : [`파일 내용이 ${ext.toUpperCase()} 형식이 아닙니다.`, 'media_type'];
      if (!bad) { const tl = Math.min(+m.bytes, TAIL); bad = tailErr(ext, await readRange(c, a.tid, h, +m.bytes - tl, tl)); }
      if (bad) { await c.query('delete from media where tenant_id = $1 and id = $2', [a.tid, h]); return { err: [bad[1] === 'media_bad' ? 400 : 415, bad[0], bad[1]] }; }
      await c.query("update media set status = 'ok' where tenant_id = $1 and id = $2", [a.tid, h]);
      await audit(c, a.tid, a.email, 'media.file', { id: h, mime: m.mime, bytes: +m.bytes });
      return { ...out(a.tid, { id: h, ...m }), dup: false };
    }));
  }
  async function getOne(req, res, id) {
    const m = ID_RE.exec(id); if (!m) throw missing();
    limit('mfg:' + ip(req), 3000, 60e3);
    const [tid, h] = [m[1], m[2]]; const etag = `"${h}"`;
    const q = new URL(req.url, 'http://x').searchParams;
    return inTenant(pool, tid, async c => {
      const r = (await c.query("select mime, bytes, name from media where tenant_id = $1 and id = $2 and kind <> 'image' and status = 'ok'", [tid, h])).rows[0];
      if (!r) throw missing();
      const ext = fileType(r.name).ext; const size = +r.bytes;
      const hdr = { 'cache-control': 'private, max-age=31536000, immutable', etag, 'accept-ranges': 'bytes',
        'content-disposition': disposition(r.name, ext, q.get('dl') === '1'), 'content-security-policy': ext === 'pdf' ? PDF_CSP : FILE_CSP,
        ...(ext === 'pdf' ? { 'x-frame-options': 'SAMEORIGIN' } : {}) };
      const rg = parseRange(req.headers.range, size);
      if (!rg && String(req.headers['if-none-match'] || '') === etag) return send(res, 304, null, hdr);
      hdr['content-type'] = r.mime; /* 304에는 싣지 않음(Java · Tomcat과 같음) */
      if (rg === 'bad') return send(res, 416, null, { ...hdr, 'content-range': `bytes */${size}`, 'content-length': 0 });
      if (rg) {
        const CH = (await c.query('select chunk from media where tenant_id = $1 and id = $2', [tid, h])).rows[0].chunk;
        const [s] = rg; const e = Math.min(rg[1], (Math.floor(s / CH) + 1) * CH - 1); /* 한 번에 한 조각까지 — 브라우저가 이어서 요청한다 */
        const buf = await readRange(c, tid, h, s, e - s + 1);
        return send(res, 206, buf, { ...hdr, 'content-range': `bytes ${s}-${s + buf.length - 1}/${size}`, 'content-length': buf.length });
      }
      sendHead(res, 200, { ...hdr, 'content-length': size });
      const n = (await c.query('select parts from media where tenant_id = $1 and id = $2', [tid, h])).rows[0].parts;
      let gone = false; res.on('close', () => { gone = true; });
      for (let i = 0; i < n && !gone; i++) {
        const d = (await c.query('select data from media_part where tenant_id = $1 and id = $2 and seq = $3', [tid, h, i])).rows[0];
        if (!d) break; if (!res.write(d.data)) await new Promise(ok => { res.once('drain', ok); res.once('close', ok); });
      }
      res.end();
    });
  }
  async function del(req, id) {
    const a = await need(req); const h = own(a, id);
    return inTenant(pool, a.tid, async c => {
      const r = (await c.query("select created_by from media where tenant_id = $1 and id = $2 and kind <> 'image'", [a.tid, h])).rows[0];
      if (!r) throw missing();
      if (a.role === 'teacher' && r.created_by !== a.email) throw new HttpErr(403, '내가 올린 파일만 지울 수 있습니다.', 'teacher');
      await c.query('delete from media where tenant_id = $1 and id = $2', [a.tid, h]);
      await audit(c, a.tid, a.email, 'media.delete', { id: h }); return { ok: true };
    });
  }
  async function list(req) {
    const a = await need(req);
    const n = Math.max(1, Math.min(200, Math.floor(+new URL(req.url, 'http://x').searchParams.get('limit') || 50)));
    return inTenant(pool, a.tid, async c => {
      const rows = (await c.query(`select id, mime, bytes, name, kind, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') at from media where tenant_id = $1 and kind <> 'image' and status = 'ok' order by created_at desc, id limit $2`, [a.tid, n])).rows;
      const u = await usage(c, a.tid);
      return { rows: rows.map(r => ({ ...out(a.tid, r), at: r.at })), used: +u.used, max: L.quota, n: +u.n };
    });
  }
  const wrap = fn => async (...x) => { try { return await fn(...x); } catch (e) { throw E(e); } };
  return {
    routes: { 'POST /api/media/f': wrap(start) },
    list: wrap(list),
    match(method, pathname) {
      let p = DONE_PATH.exec(pathname); if (p) { const id = decodeURIComponent(p[1]); return method === 'POST' ? req => done(req, id) : null; }
      p = FILE_PATH.exec(pathname); if (!p) return null; const id = decodeURIComponent(p[1]);
      if (method === 'GET') return (req, res) => getOne(req, res, id);
      if (method === 'PUT') return req => part(req, id);
      if (method === 'DELETE') return req => del(req, id);
      return null;
    }
  };
}

module.exports = { createMediaFiles, fileType, cleanFileName, headOk, tailErr, parseRange, disposition, limits, TYPES, FILE_PATH, DONE_PATH };
