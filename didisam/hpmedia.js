/* v34.5 hpmedia — 이미지 업로드 클라이언트(window.HPM) · 개발자 X1
   운영 서버(live.js · 로그인한 기관)가 있으면 POST /api/media로 올리고 '/api/media/<id>' 주소를 쓴다(게시 홈페이지가 가벼워지고 저장 한도에 걸리지 않음).
   서버가 없거나(데모 · GitHub Pages) 실패하면 같은 함수가 data URL을 돌려준다 — 부르는 쪽은 둘을 구분하지 않아도 된다.
   올리기 전에 브라우저에서도 위치 등 메타데이터(JPEG APP1 · COM, PNG eXIf · tEXt · zTXt · iTXt · tIME, WEBP EXIF · XMP)를 지운다(서버도 다시 지움).
   HPM.put(file|blob|dataURL, {name}) → {id, url, mime, bytes, w, h, local}
   HPM.keep(dataURL|blob, name) → 주소 문자열(서버 주소 또는 원래 data URL)
   HPM.url(id) · HPM.list({limit}) · HPM.del(id|url) · HPM.dataURL(url) · HPM.on() */
(function () {
  'use strict';
  const MAX = 2 * 1024 * 1024;
  const on = () => { try { return typeof LIVE !== 'undefined' && !!(LIVE && LIVE.tenant && LIVE.cfg && LIVE.cfg.live); } catch (e) { return false; } };
  const isMedia = u => /^\/api\/media\/tn_[a-z0-9]{8,16}\.[a-f0-9]{40}$/.test(String(u || ''));
  const idOf = u => String(u || '').replace(/^\/api\/media\//, '');
  const toURL = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(new Error('파일을 읽지 못했습니다')); r.readAsDataURL(b); });
  function fromURL(d) { const m = /^data:([\w/+.-]+)?(;base64)?,(.*)$/s.exec(String(d)); if (!m) throw new Error('data URL 형식이 아닙니다');
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i) & 255; return new Blob([u], { type: m[1] || 'application/octet-stream' }); }

  /* ── 메타데이터 지우기(서버 media.js와 같은 규칙, 실패하면 원본 그대로 — 서버가 다시 검사) ── */
  const cat = L => { const n = L.reduce((s, x) => s + x.length, 0); const o = new Uint8Array(n); let p = 0; L.forEach(x => { o.set(x, p); p += x.length; }); return o; };
  const s4 = (b, p) => String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
  function strip(b) {
    try {
      if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) { const out = [b.subarray(0, 8)]; let p = 8; const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
        while (p + 12 <= b.length) { const len = dv.getUint32(p); const t = s4(b, p + 4); const e = p + 12 + len; if (e > b.length) return b; if (!/^(eXIf|tEXt|zTXt|iTXt|tIME)$/.test(t)) out.push(b.subarray(p, e)); p = e; if (t === 'IEND') break; } return cat(out); }
      if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) { const out = [b.subarray(0, 2)]; let p = 2;
        while (p < b.length) { if (b[p] !== 0xff) return b; while (p < b.length && b[p] === 0xff) p++; const m = b[p++];
          if (m === 0xd9) { out.push(new Uint8Array([0xff, 0xd9])); break; } if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { out.push(new Uint8Array([0xff, m])); continue; }
          const len = (b[p] << 8) | b[p + 1]; if (len < 2 || p + len > b.length) return b;
          if (m === 0xda) { out.push(new Uint8Array([0xff, m]), b.subarray(p)); break; }
          if (!(m === 0xe1 || (m >= 0xe3 && m <= 0xef && m !== 0xee) || m === 0xfe)) out.push(new Uint8Array([0xff, m]), b.subarray(p, p + len)); p += len; }
        return cat(out); }
      if (s4(b, 0) === 'RIFF' && s4(b, 8) === 'WEBP') { const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); const total = Math.min(b.length, dv.getUint32(4, true) + 8); const L = []; let p = 12;
        while (p + 8 <= total) { const cc = s4(b, p); const len = dv.getUint32(p + 4, true); const e = Math.min(total, p + 8 + len + (len & 1)); const c = b.slice(p, e); if (cc === 'VP8X' && c.length > 8) c[8] &= ~0x0c; if (cc !== 'EXIF' && cc !== 'XMP ') L.push(c); p = p + 8 + len + (len & 1); }
        const body = cat(L); const h = new Uint8Array(12); const hv = new DataView(h.buffer); h.set([82, 73, 70, 70]); hv.setUint32(4, body.length + 4, true); h.set([87, 69, 66, 80], 8); return cat([h, body]); }
    } catch (e) { }
    return b;
  }
  async function blobOf(x) { if (typeof x === 'string') return fromURL(x); if (x && typeof x.arrayBuffer === 'function') return x; throw new Error('이미지 파일을 넣어 주세요'); }

  async function put(x, o) { o = o || {};
    const b0 = await blobOf(x); if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(b0.type || '')) throw new Error('PNG · JPG · WEBP · SVG 이미지만 올릴 수 있습니다');
    const bytes = /svg/.test(b0.type) ? new Uint8Array(await b0.arrayBuffer()) : strip(new Uint8Array(await b0.arrayBuffer()));
    const blob = new Blob([bytes], { type: b0.type });
    if (blob.size > MAX) throw new Error('이미지는 2MB 이하만 올릴 수 있습니다');
    if (on()) {
      const name = String(o.name || (x && x.name) || '').slice(0, 80);
      const r = await fetch('/api/media' + (name ? '?name=' + encodeURIComponent(name) : ''), { method: 'POST', credentials: 'same-origin', headers: { 'x-didisam': '1', 'content-type': blob.type }, body: blob });
      const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || `업로드 오류 ${r.status}`); e.status = r.status; e.code = j.error; throw e; }
      return { ...j, local: false };
    }
    const url = await toURL(blob); return { id: null, url, mime: blob.type, bytes: blob.size, w: null, h: null, local: true };
  }
  /* 바로 고치기 · AI SAM 첨부용: 서버 주소를 돌려주고, 안 되면 받은 data URL을 그대로 돌려준다(화면 흐름이 멈추지 않게) */
  async function keep(x, name) { if (!on()) return typeof x === 'string' ? x : toURL(x);
    try { return (await put(x, { name })).url; }
    catch (e) { HPM.last = { err: e.message, code: e.code || '' }; try { console.warn('HPM: 서버 저장 실패 — data URL로 저장합니다', e.message); } catch (x2) { } return typeof x === 'string' ? x : toURL(x); } }
  async function list(o) { if (!on()) return { rows: [], used: 0, max: 0, n: 0, local: true };
    const r = await fetch('/api/media?limit=' + Math.max(1, Math.min(200, +((o || {}).limit) || 50)), { credentials: 'same-origin', headers: { 'x-didisam': '1' } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || `오류 ${r.status}`); return j; }
  async function del(x) { const id = idOf(x); if (!on() || !/^tn_/.test(id)) return { ok: true, local: true };
    const r = await fetch('/api/media/' + encodeURIComponent(id), { method: 'DELETE', credentials: 'same-origin', headers: { 'x-didisam': '1' } }); const j = await r.json().catch(() => ({})); if (!r.ok && r.status !== 404) throw new Error(j.message || `오류 ${r.status}`); return { ok: true }; }
  /* AI로 사진을 보낼 때: 서버 주소 → data URL(SVG는 보내지 않음) */
  async function dataURL(u) { if (/^data:/.test(String(u))) return u; if (!isMedia(u)) throw new Error('읽을 수 없는 주소입니다');
    const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw new Error(`이미지를 읽지 못했습니다(${r.status})`); const b = await r.blob(); if (/svg/.test(b.type)) throw new Error('SVG는 AI로 보내지 않습니다'); return toURL(b); }

  /* 편집 · 미리보기 iframe(siteHTML)의 meta CSP는 img-src가 data: · ytimg뿐이라 같은 출처 '/api/media/…'가 막힌다 → 서버 주소가 들어간 HTML만 img-src에 'self'를 더한다(코어 변경 요청에 적음) */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
      return typeof h === 'string' && h.includes('/api/media/') ? h.replace(/(<meta http-equiv="Content-Security-Policy" content="[^"]*?img-src )(?!'self')/, "$1'self' ") : h; }; window.siteHTML = siteHTML; }
  const HPM = window.HPM = { put, keep, list, del, dataURL, on, isMedia, url: id => /^data:/.test(String(id || '')) ? id : '/api/media/' + idOf(id), strip, MAX, last: null };
})();
