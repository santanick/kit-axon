'use strict';
/* v35 /api/media/f 시험용 최소 파일(문서 · 영상 · 음성) — Node 테스트(mediafile.test.js)와 Java 대조(service-egov/test/mediafile.js)가 함께 쓴다.
   재생 · 열람은 하지 않고 형식 검사(앞 시그니처 · ZIP 끝 목록)만 통과하는 모양이다. pad로 크기를 키워 여러 조각을 만든다. */
const crc = b => { let c, t = crc.t || (crc.t = Array.from({ length: 256 }, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; })); let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
/* 저장(무압축) ZIP: [[이름, 내용]] */
function zip(entries) {
  const loc = [], cd = []; let off = 0;
  for (const [name, body0] of entries) {
    const n = Buffer.from(name, 'utf8'); const body = Buffer.isBuffer(body0) ? body0 : Buffer.from(String(body0)); const c = crc(body);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(c, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(body.length, 22); h.writeUInt16LE(n.length, 26);
    loc.push(h, n, body);
    const d = Buffer.alloc(46); d.writeUInt32LE(0x02014b50, 0); d.writeUInt16LE(20, 4); d.writeUInt16LE(20, 6); d.writeUInt32LE(c, 16); d.writeUInt32LE(body.length, 20); d.writeUInt32LE(body.length, 24); d.writeUInt16LE(n.length, 28); d.writeUInt32LE(off, 42);
    cd.push(d, n); off += 30 + n.length + body.length;
  }
  const C = Buffer.concat(cd); const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10); e.writeUInt32LE(C.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...loc, C, e]);
}
const fill = n => Buffer.alloc(Math.max(0, n), 0x41);
const pdf = (pad = 0) => Buffer.concat([Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n'), fill(pad), Buffer.from('\n%%EOF\n')]);
const docx = (pad = 0, extra = []) => zip([['[Content_Types].xml', '<Types/>'], ['word/media/a.bin', fill(pad)], ['word/document.xml', '<w:document/>'], ...extra]);
const pptx = (pad = 0) => zip([['[Content_Types].xml', '<Types/>'], ['ppt/media/a.bin', fill(pad)], ['ppt/presentation.xml', '<p:presentation/>']]);
const hwpx = (pad = 0) => zip([['mimetype', 'application/hwp+zip'], ['Contents/content.hpf', '<opf/>'], ['BinData/a.bin', fill(pad)]]);
const hwp = (pad = 0) => Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.from('HWP Document File'), fill(512 + pad)]);
const box = (t, body) => { const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length); h.write(t, 4, 'latin1'); return Buffer.concat([h, body]); };
const mp4 = (pad = 0, brand = 'isom') => Buffer.concat([box('ftyp', Buffer.from(brand + '\0\0\x02\0isomavc1', 'latin1')), box('mdat', fill(pad + 64))]);
const m4a = (pad = 0) => mp4(pad, 'M4A ');
const webm = (pad = 0) => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]), Buffer.from('webm'), Buffer.from([0x42, 0x87, 0x81, 0x04]), fill(pad + 64)]);
const mp3 = (pad = 0) => Buffer.concat([Buffer.from('ID3\x04\0\0\0\0\0\0', 'latin1'), Buffer.from([0xff, 0xfb, 0x90, 0x64]), fill(pad + 64)]);

module.exports = { zip, pdf, docx, pptx, hwpx, hwp, mp4, m4a, webm, mp3 };
