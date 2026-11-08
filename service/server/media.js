'use strict';
/* v34.5 홈페이지 이미지 저장(/api/media) — 기관별 Postgres 표(media, RLS)에 바이트로 둔다. Cloud Run 디스크 · GCS는 쓰지 않는다.
   - POST   /api/media            운영자(교강사 제외). 본문 = 이미지 바이트 그대로(?name=파일 이름). PNG · JPEG · WEBP · SVG만, 2MB 이하
   - GET    /api/media/:id        공개(게시 홈페이지). id = <기관 id>.<내용 sha256 앞 40자> → public, max-age=31536000, immutable
   - DELETE /api/media/:id        운영자
   - GET    /api/media?limit=     운영자 목록 { rows, used, max, n }
   형식은 확장자 · content-type을 믿지 않고 파일 시그니처로 판정한다. 위치 등 메타데이터(EXIF · XMP · IPTC · 텍스트 청크)는 서버에서도 지운다.
   SVG는 script · foreignObject · on* · 외부 참조 · DOCTYPE/ENTITY를 막고, 응답에 CSP sandbox를 붙인다(직접 열어도 스크립트가 돌지 않음).
   Java(service-egov media 패키지)와 같은 규칙 · 같은 응답 — 바꾸면 양쪽을 같이 바꾼다. */
const crypto = require('node:crypto');

const MAX = 2 * 1024 * 1024;
const ID_RE = /^(tn_[a-z0-9]{8,16})\.([a-f0-9]{40})$/;
const MEDIA_PATH = /^\/api\/media\/([^/]+)$/;
const MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MEDIA_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

class MediaErr extends Error { constructor(status, msg, code) { super(msg); this.status = status; this.code = code; } }
const bad = (msg, code = 'media_bad') => new MediaErr(400, msg || '이미지 파일이 손상되었거나 읽을 수 없습니다.', code);

/* ── 형식 판정 ── */
function sniff(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 16 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  const t = utf8(b); if (t == null) return null;
  const s = t.replace(/^﻿/, '');
  if (!/^\s*</.test(s) || s.indexOf('\u0000') >= 0 || !/<svg[\s>/]/i.test(s.slice(0, 8192))) return null;
  return 'image/svg+xml';
}
function utf8(b) { try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return null; } }

/* ── PNG: eXIf · tEXt · zTXt · iTXt · tIME 청크를 뺀다(IEND 뒤 덧붙은 데이터도 버림) ── */
const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
function cleanPng(b) {
  const out = [b.subarray(0, 8)]; let p = 8, first = true, w = 0, h = 0, end = false;
  while (p + 12 <= b.length) {
    const len = b.readUInt32BE(p); const type = b.toString('latin1', p + 4, p + 8); const e = p + 12 + len;
    if (len > b.length || e > b.length) throw bad();
    if (first) { if (type !== 'IHDR' || len < 8) throw bad(); w = b.readUInt32BE(p + 8); h = b.readUInt32BE(p + 12); first = false; }
    if (!PNG_DROP.has(type)) out.push(b.subarray(p, e));
    p = e; if (type === 'IEND') { end = true; break; }
  }
  if (first || !end) throw bad();
  return { buf: Buffer.concat(out), w, h };
}

/* ── JPEG: APP1(EXIF · XMP) · APP3~APP13 · APP15 · COM을 뺀다. APP0(JFIF) · APP2(ICC) · APP14(Adobe)는 둔다 ── */
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const jpegDrop = m => m === 0xe1 || (m >= 0xe3 && m <= 0xef && m !== 0xee) || m === 0xfe;
function cleanJpeg(b) {
  const out = [Buffer.from([0xff, 0xd8])]; let p = 2, w = 0, h = 0, sos = false;
  while (p < b.length) {
    if (b[p] !== 0xff) throw bad();
    while (p < b.length && b[p] === 0xff) p++;
    if (p >= b.length) throw bad();
    const m = b[p]; p++;
    if (m === 0xd9) { out.push(Buffer.from([0xff, 0xd9])); break; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { out.push(Buffer.from([0xff, m])); continue; }
    if (p + 2 > b.length) throw bad();
    const len = b.readUInt16BE(p); if (len < 2 || p + len > b.length) throw bad();
    if (SOF.has(m)) { if (len < 7) throw bad(); h = b.readUInt16BE(p + 3); w = b.readUInt16BE(p + 5); }
    if (m === 0xda) { out.push(Buffer.from([0xff, m])); out.push(b.subarray(p)); sos = true; break; }
    if (!jpegDrop(m)) { out.push(Buffer.from([0xff, m])); out.push(b.subarray(p, p + len)); }
    p += len;
  }
  if (!sos || !w || !h) throw bad();
  return { buf: Buffer.concat(out), w, h };
}

/* ── WEBP: EXIF · XMP 청크를 빼고 VP8X 표시 비트 · RIFF 크기를 고친다 ── */
function cleanWebp(b) {
  const size = b.readUInt32LE(4); const total = Math.min(b.length, size + 8); if (size < 4 || total < 20) throw bad();
  const chunks = []; let p = 12, w = 0, h = 0, x = null;
  while (p + 8 <= total) {
    const cc = b.toString('latin1', p, p + 4); const len = b.readUInt32LE(p + 4); const e = p + 8 + len + (len & 1);
    if (p + 8 + len > total) throw bad();
    const c = Buffer.from(b.subarray(p, Math.min(e, total)));
    if (cc === 'VP8X') { if (len < 10) throw bad(); x = c; w = 1 + c.readUIntLE(12, 3); h = 1 + c.readUIntLE(15, 3); }
    else if (cc === 'VP8 ' && !x) { if (len < 10) throw bad(); w = c.readUInt16LE(14) & 0x3fff; h = c.readUInt16LE(16) & 0x3fff; }
    else if (cc === 'VP8L' && !x) { if (len < 5 || c[8] !== 0x2f) throw bad(); const v = c.readUInt32LE(9); w = (v & 0x3fff) + 1; h = ((v >>> 14) & 0x3fff) + 1; }
    if (cc !== 'EXIF' && cc !== 'XMP ') chunks.push(c);
    p = e;
  }
  if (!chunks.length || !w || !h) throw bad();
  if (x) x[8] = x[8] & ~0x0c;
  const body = Buffer.concat(chunks); const head = Buffer.alloc(12); head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(body.length + 4, 4); head.write('WEBP', 8, 'latin1');
  return { buf: Buffer.concat([head, body]), w, h };
}

/* ── SVG 정화(문자열 규칙 — Java DdSvg와 같은 순서 · 같은 정규식) ── */
const SVG_DROP = 'script|foreignObject|iframe|object|embed|audio|video|handler|listener|set|animate';
const RE_PAIR = new RegExp(`<(${SVG_DROP})\\b[^>]*>[\\s\\S]*?</\\1\\s*>`, 'gi');
const RE_LONE = new RegExp(`</?(?:${SVG_DROP})\\b[^>]*>`, 'gi');
const RE_STYLE = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const RE_TAG = /<([A-Za-z][\w:.-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const RE_ATTR = /\s+([^\s=/>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
const CSS_BAD = /(javascript:|expression\s*\(|@import|url\s*\(\s*['"]?\s*(?!#))/i;
const REF_OK = /^(#[\w.:-]*|data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\s]*)$/;
function cleanSvg(b) {
  let s = utf8(b); if (s == null) throw bad();
  s = s.replace(/^﻿/, '');
  if (/<!DOCTYPE|<!ENTITY/i.test(s)) throw bad('SVG에 DOCTYPE · ENTITY 선언은 쓸 수 없습니다.', 'media_svg');
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<\?(?!xml\s)[\s\S]*?\?>/g, '');
  for (let i = 0; i < 8; i++) { const n = s.replace(RE_PAIR, ''); if (n === s) break; s = n; }
  s = s.replace(RE_LONE, '');
  s = s.replace(RE_STYLE, (all, css) => CSS_BAD.test(css) ? '' : all);
  s = s.replace(RE_TAG, (all, name, attrs, slash) => {
    let keep = '';
    attrs.replace(RE_ATTR, (a, k, v) => {
      const key = k.toLowerCase(); const val = v == null ? '' : v.replace(/^["']|["']$/g, '');
      if (/^on/.test(key)) return '';
      if (key === 'href' || key === 'xlink:href' || key === 'src') { if (!REF_OK.test(val.trim())) return ''; }
      else if (key === 'style') { if (CSS_BAD.test(val)) return ''; }
      else if (/(java|vb)script\s*:/i.test(val) || /&#/.test(val)) return '';
      keep += a; return '';
    });
    return `<${name}${keep}${slash ? ' /' : ''}>`;
  });
  s = s.trim();
  if (!/<svg[\s>/]/i.test(s) || /<\s*script|javascript:|<[^>]*\son[a-z]+\s*=/i.test(s)) throw bad('SVG를 안전하게 정리하지 못했습니다.', 'media_svg');
  return { buf: Buffer.from(s, 'utf8'), w: null, h: null };
}

/** 바이트 → { mime, buf, w, h, hash } (형식 검사 · 메타데이터 제거 · 정화) */
function prepare(raw) {
  if (!raw || !raw.length) throw bad('이미지 파일을 보내 주세요.', 'media_empty');
  if (raw.length > MAX) throw new MediaErr(413, '이미지는 2MB 이하만 올릴 수 있습니다.', 'too_large');
  const mime = sniff(raw); if (!mime) throw new MediaErr(415, 'PNG · JPG · WEBP · SVG 이미지만 올릴 수 있습니다.', 'media_type');
  const o = mime === 'image/png' ? cleanPng(raw) : mime === 'image/jpeg' ? cleanJpeg(raw) : mime === 'image/webp' ? cleanWebp(raw) : cleanSvg(raw);
  return { mime, ...o, hash: crypto.createHash('sha256').update(o.buf).digest('hex').slice(0, 40) };
}

function readRaw(req, max) {
  return new Promise((ok, no) => {
    const cl = Number(req.headers['content-length'] || 0); if (cl > max) { no(new MediaErr(413, '이미지는 2MB 이하만 올릴 수 있습니다.', 'too_large')); req.resume(); return; }
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > max) { no(new MediaErr(413, '이미지는 2MB 이하만 올릴 수 있습니다.', 'too_large')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks))); req.on('error', no);
  });
}
const cleanName = v => String(v || '').replace(/[\u0000-\u001f<>"'&\\/]/g, '').trim().slice(0, 80);

function createMedia({ pool, inTenant, HttpErr, limit, ip, audit, needStaff, send, env = {} }) {
  const quota = Math.max(1, Number(env.MEDIA_TENANT_MB || 100)) * 1024 * 1024;
  const maxFiles = Math.max(1, Number(env.MEDIA_MAX_FILES || 2000));
  const E = e => e instanceof MediaErr ? new HttpErr(e.status, e.message, e.code) : e;
  const out = (tid, r) => ({ id: `${tid}.${r.id}`, url: `/api/media/${tid}.${r.id}`, mime: r.mime, bytes: +r.bytes, w: r.w == null ? null : +r.w, h: r.h == null ? null : +r.h });

  async function upload(req) {
    const a = await needStaff(req);
    limit(`mup:${a.tid}`, 300, 3600e3); limit(`mupu:${a.uid}`, 60, 60e3);
    let m; try { m = prepare(await readRaw(req, MAX)); } catch (e) { throw E(e); }
    const name = cleanName(new URL(req.url, 'http://x').searchParams.get('name'));
    return inTenant(pool, a.tid, async c => {
      const cur = (await c.query('select mime, bytes, w, h from media where tenant_id = $1 and id = $2', [a.tid, m.hash])).rows[0];
      if (cur) return { ...out(a.tid, { id: m.hash, ...cur }), dup: true };
      const u = (await c.query('select coalesce(sum(bytes), 0)::bigint used, count(*)::int n from media where tenant_id = $1', [a.tid])).rows[0];
      if (+u.used + m.buf.length > quota) throw new HttpErr(413, `기관 이미지 저장 한도(${Math.round(quota / 1048576)}MB)를 넘었습니다. 쓰지 않는 이미지를 지워 주세요.`, 'media_quota');
      if (+u.n >= maxFiles) throw new HttpErr(413, `기관 이미지는 ${maxFiles}개까지 저장할 수 있습니다. 쓰지 않는 이미지를 지워 주세요.`, 'media_quota');
      await c.query('insert into media (tenant_id, id, mime, bytes, w, h, name, data, created_by) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (tenant_id, id) do nothing', [a.tid, m.hash, m.mime, m.buf.length, m.w, m.h, name, m.buf, a.email]);
      await audit(c, a.tid, a.email, 'media.upload', { id: m.hash, mime: m.mime, bytes: m.buf.length });
      return { ...out(a.tid, { id: m.hash, mime: m.mime, bytes: m.buf.length, w: m.w, h: m.h }), dup: false };
    });
  }
  async function list(req) {
    const a = await needStaff(req);
    const n = Math.max(1, Math.min(200, Math.floor(+new URL(req.url, 'http://x').searchParams.get('limit') || 50)));
    return inTenant(pool, a.tid, async c => {
      const rows = (await c.query(`select id, mime, bytes, w, h, name, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') at from media where tenant_id = $1 order by created_at desc, id limit $2`, [a.tid, n])).rows;
      const u = (await c.query('select coalesce(sum(bytes), 0)::bigint used, count(*)::int n from media where tenant_id = $1', [a.tid])).rows[0];
      return { rows: rows.map(r => ({ ...out(a.tid, r), name: r.name, at: r.at })), used: +u.used, max: quota, n: +u.n };
    });
  }
  async function getOne(req, res, id) {
    const m = ID_RE.exec(id); if (!m) throw new HttpErr(404, '없는 이미지입니다.', 'media_missing');
    limit('mg:' + ip(req), 3000, 60e3);
    const etag = `"${m[2]}"`;
    const hdr = { 'cache-control': 'public, max-age=31536000, immutable', etag, 'cross-origin-resource-policy': 'cross-origin', 'content-security-policy': MEDIA_CSP };
    const r = await inTenant(pool, m[1], async c => (await c.query('select mime, data from media where tenant_id = $1 and id = $2', [m[1], m[2]])).rows[0]);
    if (!r) throw new HttpErr(404, '없는 이미지입니다.', 'media_missing');
    if (String(req.headers['if-none-match'] || '') === etag) return send(res, 304, null, hdr);
    return send(res, 200, req.method === 'HEAD' ? '' : r.data, { ...hdr, 'content-type': r.mime, 'content-length': r.data.length });
  }
  async function del(req, id) {
    const a = await needStaff(req); const m = ID_RE.exec(id);
    if (!m || m[1] !== a.tid) throw new HttpErr(404, '없는 이미지입니다.', 'media_missing');
    return inTenant(pool, a.tid, async c => {
      const r = await c.query('delete from media where tenant_id = $1 and id = $2', [a.tid, m[2]]);
      if (!r.rowCount) throw new HttpErr(404, '없는 이미지입니다.', 'media_missing');
      await audit(c, a.tid, a.email, 'media.delete', { id: m[2] }); return { ok: true };
    });
  }
  return {
    routes: { 'POST /api/media': upload, 'GET /api/media': list },
    /** /api/media/:id — GET(공개) · DELETE(운영자). 해당 없으면 null */
    match(method, pathname) {
      const p = MEDIA_PATH.exec(pathname); if (!p) return null; const id = decodeURIComponent(p[1]);
      if (method === 'GET') return (req, res) => getOne(req, res, id);
      if (method === 'DELETE') return req => del(req, id);
      return null;
    }
  };
}

module.exports = { createMedia, prepare, sniff, cleanSvg, MEDIA_PATH, ID_RE, MAX, MIMES };
