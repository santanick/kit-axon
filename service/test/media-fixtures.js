'use strict';
/* /api/media 시험용 작은 이미지(PNG · JPEG · WEBP) — Node 테스트(media.test.js)와 Java 대조(service-egov/test/media.js)가 함께 쓴다 */
const zlib = require('node:zlib');
const crc32 = b => { let c, t = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; })); let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const L = Buffer.alloc(4); L.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const C = Buffer.alloc(4); C.writeUInt32BE(crc32(td)); return Buffer.concat([L, td, C]); };
function png(w, h, rgb = [40, 80, 200], extra = []) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), ...extra, chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const seg = (m, data) => { const L = Buffer.alloc(2); L.writeUInt16BE(data.length + 2); return Buffer.concat([Buffer.from([0xff, m]), L, data]); };
/* 형식 검사용 최소 JPEG(디코딩은 하지 않음): SOI · APP0 · APP1(Exif GPS) · COM · SOF0 · SOS · 데이터 · EOI */
const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')), seg(0xe1, Buffer.from('Exif\0\0GPSLatitude=37.5665', 'latin1')), seg(0xfe, Buffer.from('owner: kim', 'latin1')),
  seg(0xc0, Buffer.from([8, 0, 30, 0, 40, 1, 1, 0x11, 0])), seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])), Buffer.from([0x12, 0x34, 0x56]), Buffer.from([0xff, 0xd9])]);
const riff = (...ch) => { const body = Buffer.concat(ch); const h = Buffer.alloc(12); h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(body.length + 4, 4); h.write('WEBP', 8, 'latin1'); return Buffer.concat([h, body]); };
const wch = (cc, data) => { const h = Buffer.alloc(8); h.write(cc, 0, 'latin1'); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
const webp = () => { const x = Buffer.alloc(10); x[0] = 0x08 | 0x04; x.writeUIntLE(63, 4, 3); x.writeUIntLE(31, 7, 3); const l = Buffer.alloc(5); l[0] = 0x2f; l.writeUInt32LE((63) | (31 << 14), 1); return riff(wch('VP8X', x), wch('VP8L', l), wch('EXIF', Buffer.from('GPS 37.5')), wch('XMP ', Buffer.from('<x:xmpmeta/>'))); };

module.exports = { png, jpeg, webp, chunk };
