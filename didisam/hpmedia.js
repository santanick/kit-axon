/* v34.5 hpmedia — 이미지 업로드 클라이언트(window.HPM) · 개발자 X1
   운영 서버(live.js · 로그인한 기관)가 있으면 POST /api/media로 올리고 '/api/media/<id>' 주소를 쓴다(게시 홈페이지가 가벼워지고 저장 한도에 걸리지 않음).
   서버가 없거나(데모 · GitHub Pages) 실패하면 같은 함수가 data URL을 돌려준다 — 부르는 쪽은 둘을 구분하지 않아도 된다.
   올리기 전에 브라우저에서도 위치 등 메타데이터(JPEG APP1 · COM, PNG eXIf · tEXt · zTXt · iTXt · tIME, WEBP EXIF · XMP)를 지운다(서버도 다시 지움).
   HPM.put(file|blob|dataURL, {name}) → {id, url, mime, bytes, w, h, local}
   HPM.keep(dataURL|blob, name) → 주소 문자열(서버 주소 또는 원래 data URL)
   HPM.url(id) · HPM.list({limit}) · HPM.del(id|url) · HPM.dataURL(url) · HPM.on()
   v35 C6: 강의 파일 HPM.upload · check · accept · typeOf · src · hydrate · download · remove · files (아래 설명, scratchpad NOTES 규격) */
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

  /* ── v35 C6 강의 파일(문서 · 영상 · 음성) — 서버 /api/media/f(나눠 올리기 · Range 재생), 서버가 없으면 IndexedDB에 실제 파일 보관 ──
     HPM.upload(file, {kind:'course', name, onProgress(0~1), signal}) → {fileId, url, name, size, mime, type, kind, local}
     HPM.check(file) · HPM.accept('course') · HPM.typeOf(이름|파일) · HPM.src(url|fileId|'media:<id>') · HPM.hydrate(el) · HPM.download(url, name) · HPM.remove(x) · HPM.files() */
  const FMB = 1024 * 1024;
  const FT = { pdf: ['application/pdf', 'doc'], pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'doc'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc'],
    hwp: ['application/x-hwp', 'doc'], hwpx: ['application/hwp+zip', 'doc'], mp4: ['video/mp4', 'video'], webm: ['video/webm', 'video'], mp3: ['audio/mpeg', 'audio'], m4a: ['audio/mp4', 'audio'],
    png: ['image/png', 'image'], jpg: ['image/jpeg', 'image'], jpeg: ['image/jpeg', 'image'], webp: ['image/webp', 'image'] };
  /* 서버(mediafile.js limits) 기본값과 같음: 영상 1GB · 음성 200MB · 문서 100MB · 이미지 2MB, 기관 총 5GB */
  const FMAX = { video: 1024 * FMB, audio: 200 * FMB, doc: 100 * FMB, image: MAX };
  const KO = { video: '영상', audio: '음성', doc: '문서', image: '이미지' };
  const sizeText = b => b >= 1024 * FMB ? `${Math.round(b / (1024 * FMB) * 10) / 10}GB` : b >= FMB ? `${Math.round(b / FMB * 10) / 10}MB` : `${Math.max(1, Math.round(b / 1024))}KB`;
  const extOf = n => { const m = /\.([A-Za-z0-9]{2,5})$/.exec(String(n || '').trim()); return m ? m[1].toLowerCase() : ''; };
  const typeOf = x => { const t = FT[extOf(x && typeof x === 'object' ? x.name : x)]; return t ? t[1] : null; };
  const accept = () => '.pdf,.pptx,.docx,.hwp,.hwpx,.mp4,.webm,.mp3,.m4a,.png,.jpg,.jpeg,.webp';
  const ferr = (msg, code, status) => { const e = new Error(msg); e.code = code; if (status) e.status = status; return e; };
  function check(f) {
    const name = String((f && f.name) || ''); const ext = extOf(name); const t = FT[ext];
    if (!t) return { ok: false, code: 'media_type', msg: '올릴 수 있는 파일: PDF · PPT(PPTX) · 워드(DOCX) · 한글(HWP · HWPX) 문서, MP4 · WEBM 영상, MP3 · M4A 음성, 사진(PNG · JPG · WEBP)' };
    const max = FMAX[t[1]]; const size = +(f && f.size) || 0;
    if (!size) return { ok: false, type: t[1], mime: t[0], max, code: 'media_empty', msg: '빈 파일입니다. 다른 파일을 골라 주세요.' };
    if (size > max) return { ok: false, type: t[1], mime: t[0], max, code: 'too_large', msg: `${KO[t[1]]} 파일은 ${sizeText(max)}까지 올릴 수 있어요. 지금 파일은 ${sizeText(size)}입니다.${t[1] === 'video' ? ' 화질을 낮춰(720p) 다시 저장하거나 나눠 올려 주세요.' : ''}` };
    return { ok: true, type: t[1], mime: t[0], ext, max, size };
  }
  /* 앞부분 시그니처(서버 headOk와 같음) — 확장자만 바꾼 파일을 올리기 전에 알려 준다 */
  async function headOk(ext, blob) {
    const b = new Uint8Array(await blob.slice(0, 4096).arrayBuffer()); const L = (s, e) => String.fromCharCode(...b.subarray(s, Math.min(e, b.length)));
    const zip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4; const ftyp = b.length >= 12 && L(4, 8) === 'ftyp';
    switch (ext) {
      case 'pdf': return L(0, 1024).includes('%PDF-');
      case 'pptx': case 'docx': return zip;
      case 'hwpx': return zip && L(30, 38) === 'mimetype' && L(0, 200).includes('application/hwp+zip');
      case 'hwp': return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 && b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1;
      case 'mp4': case 'm4a': return ftyp && L(8, 12) !== 'qt  ';
      case 'webm': return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 && L(0, 64).includes('webm');
      case 'mp3': return L(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
      default: return /^image\//.test(blob.type || '') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
    }
  }
  /* IndexedDB(데모 · 서버 없음): didisam-files / f { id, name, mime, type, size, at, blob } */
  let dbp = null;
  const idb = () => dbp || (dbp = new Promise((ok, no) => { try { const r = indexedDB.open('didisam-files', 1); r.onupgradeneeded = () => { r.result.createObjectStore('f', { keyPath: 'id' }); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error || new Error('IndexedDB')); } catch (e) { no(e); } }).catch(e => { dbp = null; throw e; }));
  const tx = async (mode, fn) => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('f', mode); const r = fn(t.objectStore('f'));
    t.oncomplete = () => ok(r ? r.result : undefined); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('저장 공간이 부족합니다')); }); };
  const urls = new Map(); /* fileId → blob: 주소(한 번 만든 것은 다시 씀) */
  const localId = x => { const s = String(x || ''); const m = /^(?:idb:|media:)?(loc_[A-Za-z0-9_-]{6,40})$/.exec(s); return m ? m[1] : null; };
  const serverId = x => { const s = String(x || ''); const m = /^(?:media:|\/api\/media\/f\/)?(tn_[a-z0-9]{8,16}\.[a-f0-9]{40})$/.exec(s); return m ? m[1] : null; };
  async function saveLocal(blob, c, name, o) {
    const id = 'loc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); } catch (e) { }
    try { if (navigator.storage && navigator.storage.estimate) { const q = await navigator.storage.estimate(); if (q && q.quota && q.usage + blob.size > q.quota * 0.9) throw ferr(`이 브라우저 저장 공간이 부족합니다(남은 공간 약 ${sizeText(Math.max(0, q.quota - q.usage))}). 쓰지 않는 파일을 지워 주세요.`, 'media_quota', 413); } } catch (e) { if (e.code) throw e; }
    const rec = { id, name, mime: c.mime, type: c.type, size: blob.size, at: new Date().toISOString(), blob };
    try { await tx('readwrite', st => st.put(rec)); }
    catch (e) { /* 사생활 보호 창 등 IndexedDB를 못 쓰면: 이번 창에서만 미리보기(새로고침하면 사라짐) */
      const u = URL.createObjectURL(blob); urls.set(id, u); if (o.onProgress) o.onProgress(1);
      return { fileId: id, url: 'idb:' + id, name, size: blob.size, mime: c.mime, type: c.type, kind: c.type, local: true, temp: true, warn: '이 브라우저는 파일을 저장하지 못해 새로고침하면 사라져요.' }; }
    if (o.onProgress) o.onProgress(1);
    return { fileId: id, url: 'idb:' + id, name, size: blob.size, mime: c.mime, type: c.type, kind: c.type, local: true };
  }
  const api = async (method, path, body, hdr) => {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: { 'x-didisam': '1', ...(hdr || {}) }, body });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw ferr(j.message || `업로드 오류(${r.status})`, j.error || 'http', r.status); return j;
  };
  async function upload(file, o) {
    o = o || {}; const blob0 = await blobOf(file); const name = String(o.name || (file && file.name) || '').trim();
    const c = check({ name, size: blob0.size }); if (!c.ok) throw ferr(c.msg, c.code, c.code === 'too_large' ? 413 : 415);
    if (!(await headOk(c.ext, blob0))) throw ferr(`파일 내용이 ${c.ext.toUpperCase()} 형식이 아닙니다. 원래 프로그램에서 '다른 이름으로 저장'으로 ${c.ext.toUpperCase()} 파일을 만들어 올려 주세요.`, 'media_type', 415);
    const blob = blob0.type === c.mime ? blob0 : new Blob([blob0], { type: c.mime });
    if (c.type === 'image') { /* 사진은 기존 홈페이지 이미지 경로(메타데이터 제거 · 2MB) */
      const r = await put(blob, { name }); if (o.onProgress) o.onProgress(1);
      if (r.local) { const l = await saveLocal(new Blob([await (await blobOf(r.url)).arrayBuffer()], { type: c.mime }), c, name, {}); return l; }
      return { fileId: r.id, url: r.url, name, size: r.bytes, mime: r.mime, type: 'image', kind: 'image', local: false };
    }
    if (!on()) return saveLocal(blob, c, name, o);
    const s = await api('POST', '/api/media/f', JSON.stringify({ name, size: blob.size }), { 'content-type': 'application/json' });
    const P = '/api/media/f/' + encodeURIComponent(s.id); let done = 0;
    const abort = () => { api('DELETE', P).catch(() => { }); };
    try {
      for (let i = 0; i < s.parts; i++) {
        if (o.signal && o.signal.aborted) throw ferr('올리기를 멈췄습니다.', 'abort');
        const part = blob.slice(i * s.chunk, (i + 1) * s.chunk);
        for (let t = 0; ; t++) { /* 조각마다 3번까지 다시 시도(잠깐 끊긴 와이파이) */
          try { await api('PUT', `${P}?part=${i}`, part, { 'content-type': 'application/octet-stream' }); break; }
          catch (e) { if (t >= 2 || (e.status && e.status < 500 && e.status !== 408 && e.status !== 429)) throw e; await new Promise(ok => setTimeout(ok, 800 * (t + 1))); }
        }
        done += part.size; if (o.onProgress) o.onProgress(Math.min(0.99, done / blob.size));
      }
      const r = await api('POST', P + '/done');
      if (o.onProgress) o.onProgress(1);
      return { fileId: r.id, url: r.url, name: r.name, size: r.bytes, mime: r.mime, type: r.type, kind: r.type, local: false };
    } catch (e) { if (e.code !== 'media_type' && e.code !== 'media_macro' && e.code !== 'media_bad') abort(); throw e; }
  }
  /* 쓸 주소: 서버 파일은 그대로, 이 브라우저에 보관한 파일은 blob: 주소 */
  async function src(x) {
    const s = String((x && typeof x === 'object' ? (x.url || x.fileId) : x) || '');
    const sid = serverId(s); if (sid) return '/api/media/f/' + sid;
    const lid = localId(s);
    if (!lid) { if (/^media:/.test(s)) throw ferr('파일을 찾을 수 없습니다.', 'media_missing', 404); return s; }
    if (urls.has(lid)) return urls.get(lid);
    let rec = null; try { rec = await tx('readonly', st => st.get(lid)); } catch (e) { }
    if (!rec || !rec.blob) throw ferr('이 브라우저에 저장된 파일을 찾을 수 없습니다. 다른 컴퓨터에서 올렸거나 브라우저 기록을 지운 경우 다시 올려 주세요.', 'media_missing', 404);
    const u = URL.createObjectURL(rec.blob); urls.set(lid, u); return u;
  }
  /* 그린 화면 안 [data-hpm-src] 요소에 주소 채우기: <video controls data-hpm-src="…"> · <a data-hpm-src data-hpm-name> · <iframe> · <img> · <audio> */
  function hydrate(root) {
    const L = (root || document).querySelectorAll ? (root || document).querySelectorAll('[data-hpm-src]') : [];
    return Promise.all(Array.from(L).map(async el => {
      const v = el.getAttribute('data-hpm-src'); if (!v || el.getAttribute('data-hpm-done') === v) return;
      try { const u = await src(v); if (el.tagName === 'A') { el.href = u; const n = el.getAttribute('data-hpm-name'); if (n) el.setAttribute('download', n); } else el.src = u; el.setAttribute('data-hpm-done', v); el.removeAttribute('data-hpm-err'); }
      catch (e) { el.setAttribute('data-hpm-err', e.message); if (el.title !== undefined) el.title = e.message; }
    }));
  }
  /* 파일 내용(Blob) — 화면 CSP(connect-src)가 blob: 주소 fetch를 막으므로 이 브라우저 보관 파일은 IndexedDB에서 바로 읽는다 */
  async function blob(x) {
    const s = String((x && typeof x === 'object' ? (x.url || x.fileId) : x) || ''); const lid = localId(s);
    if (lid) { let rec = null; try { rec = await tx('readonly', st => st.get(lid)); } catch (e) { } if (!rec || !rec.blob) throw ferr('이 브라우저에 저장된 파일을 찾을 수 없습니다.', 'media_missing', 404); return rec.blob; }
    const r = await fetch(await src(s), { credentials: 'same-origin' }); if (!r.ok) throw ferr(`파일을 읽지 못했습니다(${r.status})`, 'media_missing', r.status); return r.blob();
  }
  async function download(x, name) {
    let u = await src(x); if (serverId(u)) u += '?dl=1';
    const a = document.createElement('a'); a.href = u; a.download = name || (x && x.name) || ''; a.rel = 'noopener'; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
  }
  async function remove(x) {
    const s = String((x && typeof x === 'object' ? (x.fileId || x.url) : x) || '');
    const sid = serverId(s); if (sid) { if (!on()) return { ok: true, local: true }; await api('DELETE', '/api/media/f/' + encodeURIComponent(sid)).catch(e => { if (e.status !== 404) throw e; }); return { ok: true }; }
    const lid = localId(s); if (!lid) return { ok: true };
    if (urls.has(lid)) { URL.revokeObjectURL(urls.get(lid)); urls.delete(lid); }
    try { await tx('readwrite', st => st.delete(lid)); } catch (e) { } return { ok: true, local: true };
  }
  async function files(o) {
    if (on()) { const n = Math.max(1, Math.min(200, +((o || {}).limit) || 100)); const j = await api('GET', '/api/media?kind=file&limit=' + n);
      return { rows: j.rows.map(r => ({ fileId: r.id, url: r.url, name: r.name, size: r.bytes, mime: r.mime, type: r.type, at: r.at })), used: j.used, max: j.max, local: false }; }
    let rows = []; try { rows = await tx('readonly', st => st.getAll()) || []; } catch (e) { }
    rows = rows.map(r => ({ fileId: r.id, url: 'idb:' + r.id, name: r.name, size: r.size, mime: r.mime, type: r.type, at: r.at })).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return { rows, used: rows.reduce((s, r) => s + (r.size || 0), 0), max: 5120 * FMB, local: true };
  }

  const HPM = window.HPM = { put, keep, list, del, dataURL, on, isMedia, url: id => /^data:/.test(String(id || '')) ? id : '/api/media/' + idOf(id), strip, MAX, last: null,
    upload, check, accept, typeOf, src, blob, hydrate, download, remove, files, sizeText, FMAX };
})();
