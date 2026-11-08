'use strict';
/* hp-visual 공용: 정적 서버 · 기관 만들기 · 템플릿 게시 · 측정 · dHash · 이미지 도구
   run.js · similar.js · sheet.js가 함께 쓴다. 외부 의존: playwright, sharp(전역 설치본도 찾음) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../../didisam');

/* 전역 npm 모듈도 찾는다(NODE_PATH 없이 실행해도 동작) */
let GROOT = null;
function need(name) { try { return require(name); } catch (e) {
  if (GROOT === null) { try { GROOT = cp.execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch (e2) { GROOT = ''; } }
  if (GROOT) return require(path.join(GROOT, name)); throw e; } }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
function serve(port) { const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  return new Promise((ok, no) => { srv.once('error', no); srv.listen(port, '127.0.0.1', () => ok(srv)); }); }

/* 인자: --key value · --flag */
function args(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) o[k] = true; else { o[k] = n; i++; } } else o._.push(a); } return o; }

const ORGN = { adult: '센텀 실무 아카데미', k12: '센텀 수학학원', univ: '부산미래대학교', lifelong: '해운대구 평생학습관', voc: '부산 직업전문학교', corp: '한빛물산 인재개발원', public: '해운대구 인재개발원' };

/* 기관 하나 만들기(유형별 한 번) — 공개 강좌 · 결제 승인 상태로 게시까지 */
async function mkOrg(br, base, type, errs) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, r => r.abort());
  const op = await ctx.newPage(); op.on('pageerror', e => errs.push(`op[${type}]: ${e.message}`)); op.on('dialog', d => d.accept());
  await op.goto(base + 'index.html'); await op.waitForFunction(() => typeof createOrg === 'function');
  await op.evaluate(([type, name]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); createOrg(type, name); }, [type, ORGN[type] || '점검 기관']);
  await op.waitForFunction(() => window.S && S.org); await op.waitForTimeout(700);
  await op.evaluate(() => { try { closeModal(); } catch (e) { } try { if (typeof fabClose === 'function') fabClose(); } catch (e) { }
    S.settings.toss = Object.assign(S.settings.toss || {}, { status: '승인', stage: 99, mid: 'qa_demo' }); S.settings.pg = 'toss';
    S.classes.forEach(c => { if (c.status === '운영중' && c.open !== '비공개') c.open = c.open || '전체'; });
    save(); try { lxDemo(); } catch (e) { } smPublish(); });
  await dismiss(op);
  const tid = await op.evaluate(() => DREG.cur());
  return { ctx, op, tid };
}
async function dismiss(op) { await op.waitForTimeout(150); const pm = await op.$('#modal [data-mact=ok]'); if (pm) await pm.click().catch(() => {}); await op.evaluate(() => { try { closeModal(); } catch (e) { } document.querySelectorAll('.toast').forEach(t => t.remove()); }); }

/* 템플릿 적용 → 품질 · 구조 서명 → 게시. 반환: 데이터 쪽 지표 */
async function applyTpl(op, id) {
  const r = await op.evaluate(id => { try { closeModal(); } catch (e) { }
    const tp = TPL.find(t => t.id === id); if (!tp) return { id, err: 'no tpl' };
    const s = siteFromTpl(tp); S.site = s; s.published = true;
    const live = (s.sections || []).filter(x => x && !x.hide);
    const secs = live.map(x => { const d = x.data || {}; return x.type + (d.variant ? ':' + d.variant : '') + (x.type === 'banner' ? '@' + (d.hero || '-') : ''); });
    const fam = s.layout || '-';
    let q = null; try { const Q = hpwQuality(s); q = { score: Q.score, miss: Q.items.filter(x => !x.ok).map(x => x.k) }; } catch (e) { q = { score: null, err: String(e.message || e) }; }
    let amin = null; try { const au = HPT.audit(s) || []; const w = au.reduce((m, x) => (!m || x[3] < m[3]) ? x : m, null); if (w) amin = [String(w[0]) + ' ' + String(w[1]), Math.round(w[3] * 100) / 100]; } catch (e) { }
    let facts = []; try { facts = (HPT.facts() || []).map(f => String(f.v)); } catch (e) { }
    const prices = (S.classes || []).map(c => String(+c.price || 0));
    return { id, name: tp.name, types: tp.types || [], type: (tp.types || [])[0] || '', hidden: !!tp.hidden, theme: s.theme || '', color: s.color || '', layout: fam,
      hero: (live.find(x => x.type === 'banner') || { data: {} }).data.hero || '', sig: fam + '|' + secs.join('>'), secs, nSec: live.length, nHidden: (s.sections || []).length - live.length,
      q: q.score, qMiss: q.miss || [], qErr: q.err, auditMin: amin, facts, prices };
  }, id);
  if (r.err) return r;
  await op.evaluate(() => { save(); smPublish(); }); await dismiss(op);
  return r;
}

/* 게시본(학습자 홈)에서 측정 — 홈페이지는 .smhost의 Shadow DOM 안에 있다 */
const MEASURE = () => {
  const hosts = [...document.querySelectorAll('.smhost')].filter(h => h.shadowRoot);
  const roots = hosts.map(h => h.shadowRoot);
  const vis = el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const L = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const up = el => el.parentElement || (el.getRootNode && el.getRootNode().host) || null;
  const sx = scrollX, sy = scrollY;
  /* 바탕: 단색이면 계산, 사진 · 그라데이션 위면 null(픽셀로 잼) */
  function bgOf(el) { const stack = []; let a = el; while (a && a.nodeType === 1) { const cs = getComputedStyle(a); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 0.99) break; } a = up(a); }
    let base = [255, 255, 255]; for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; const al = c[3]; base = [c[0] * al + base[0] * (1 - al), c[1] * al + base[1] * (1 - al), c[2] * al + base[2] * (1 - al)]; } return base; }
  function overMedia(root, el, r) { const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    const st = root.elementsFromPoint ? root.elementsFromPoint(x, y) : []; const i = st.indexOf(el); for (const e of st.slice(i + 1)) { if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(e.tagName) || (e.tagName === 'svg' && e.getBoundingClientRect().width > 120)) return true; const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return true; const c = parse(cs.backgroundColor); if (c && c[3] >= 0.99) return false; } return false; }
  const texts = [], photos = { img: 0, bg: 0, stock: 0, art: 0, slots: 0 }, empty = [], wide = []; let txtAll = '';
  roots.forEach(root => {
    root.querySelectorAll('*').forEach(el => {
      if (!vis(el)) return; const tag = el.tagName;
      if (tag === 'IMG') { const s = el.currentSrc || el.src || ''; if (el.naturalWidth > 1 || /^data:image\/(png|jpe?g|webp)/.test(s)) { photos.img++; if (/\/img\/stock\//.test(s)) photos.stock++; } }
      else { const bi = getComputedStyle(el).backgroundImage; if (bi && /url\(/.test(bi) && !/data:image\/svg/.test(bi)) { photos.bg++; if (/\/img\/stock\//.test(bi)) photos.stock++; } }
      if (el.matches('[data-slot]')) { photos.slots++; if (el.dataset.empty === '1' || el.classList.contains('hpl-art')) photos.art++; }
      const r = el.getBoundingClientRect();
      if (r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && wide.length < 6) { let a = up(el), sc = false; while (a && a.nodeType === 1) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) { sc = true; break; } a = up(a); } if (!sc) wide.push(tag.toLowerCase() + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ')[0] + ' R' + Math.round(r.right)); }
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
      if (own && texts.length < 600 && !el.closest('svg')) { const cs = getComputedStyle(el); const c = parse(cs.color); if (!c || c[3] < 0.05) return;
        const bg = overMedia(root, el, r) ? null : bgOf(el); const fs = parseFloat(cs.fontSize); const fw = +cs.fontWeight || 400;
        const pd = ['Top', 'Right', 'Bottom', 'Left'].map(k => parseFloat(cs['padding' + k]) || 0); const ob = (cs.backgroundImage && cs.backgroundImage !== 'none') || ((parse(cs.backgroundColor) || [0, 0, 0, 0])[3] > 0.5); texts.push({ pad: pd, ownBg: ob, t: own.slice(0, 40), c: c.slice(0, 3), bg, cr: bg ? Math.round(ratio(c, bg) * 100) / 100 : null, fs, fw, big: fs >= 24 || (fs >= 18.66 && fw >= 700), box: [Math.round(r.left + sx), Math.round(r.top + sy), Math.round(r.width), Math.round(r.height)] }); }
    });
    root.querySelectorAll('section, .smr > div').forEach(sec => { if (!vis(sec)) return; const txt = (sec.innerText || '').replace(/\s+/g, ' ').trim(); const media = sec.querySelector('img, svg, iframe, video, canvas, [data-slot]'); if (txt.length < 2 && !media) empty.push(String(sec.className).split(' ')[0] || sec.tagName.toLowerCase()); });
    txtAll += ' ' + [...root.children].filter(c => !/^(STYLE|SCRIPT|TEMPLATE)$/.test(c.tagName)).map(c => c.innerText || '').join(' ');
  });
  const h0 = hosts[0] ? hosts[0].getBoundingClientRect() : null;
  return { hosts: hosts.length, top: h0 ? Math.round(h0.top + sy) : 0, docH: document.documentElement.scrollHeight, over: document.documentElement.scrollWidth - innerWidth, wide, texts, photos, empty, txt: txtAll.replace(/\s+/g, ' ').trim().slice(0, 20000) };
};

/* 글자 점검: 자리 문구 · 오류 흔적 · 지어낸 숫자 의심 */
const PHRX = /입력하세요|입력해 주세요|대표번호|센터 주소|학원 주소|OOO|○○○|Lorem|ipsum|평일 09:00|undefined|NaN|\[object Object\]|\{\{|\}\}/g;
function textChecks(txt, allowed) {
  const ph = [...new Set(txt.match(PHRX) || [])];
  const ok = new Set(allowed.map(v => String(v).replace(/,/g, '')));
  const nums = [...new Set(txt.match(/\d[\d,.]*\s*(?:%|명|점|위|배|개국|만\s?명|년\s?연속|년\s?전통|년\s?경력|건)/g) || [])];
  const sus = nums.filter(n => { const v = n.match(/\d[\d,.]*/)[0].replace(/,/g, ''); return !ok.has(v); });
  return { ph, nums, numSus: sus };
}

/* dHash 64비트(16진 16자): 9×8 회색조로 줄인 뒤 가로 이웃 비교 */
async function dhash(sharp, buf, region) {
  let im = sharp(buf); if (region) im = im.extract(region);
  const px = await im.grayscale().resize(9, 8, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  let bits = ''; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0';
  let hex = ''; for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16); return hex;
}
function hamming(a, b) { if (!a || !b) return 64; let d = 0; for (let i = 0; i < 16; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1; } } return d; }

/* 사진 위 글자 대비: 글자 상자 바깥 테두리 띠(2~6px)의 픽셀 = 바로 뒤 바탕으로 보고, 글자색과의 대비 하위 25% 값을 쓴다(글자 획 픽셀 제외) */
async function pixelContrast(sharp, buf, meta, items) {
  const Lc = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Lum = (r, g, b) => 0.2126 * Lc(r) + 0.7152 * Lc(g) + 0.0722 * Lc(b);
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ch = info.channels; const sc = W / meta.w;
  for (const it of items) { const [x0, y0, w0, h0] = it.box.map(v => Math.round(v * sc)); if (w0 < 2 || h0 < 2) continue;
    const lt = Lum(...it.c); const cr = []; const ring = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * ch; const l = Lum(data[i], data[i + 1], data[i + 2]); cr.push((Math.max(l, lt) + 0.05) / (Math.min(l, lt) + 0.05)); };
    const step = Math.max(1, Math.floor((w0 + h0) / 120)); const [pt, pr, pb, pl] = (it.pad || [0, 0, 0, 0]).map(v => Math.round(v * sc));
    if (it.ownBg && h0 >= 10 && w0 >= 14) { /* 버튼 · 배지처럼 자기 바탕이 있는 상자: 테두리 안쪽 3px 띠 */ const ix = Math.max(3, Math.min(Math.floor(pl / 2), 12)), iy = Math.max(3, Math.min(Math.floor(pt / 2), 8)); for (let y = y0 + iy; y < y0 + h0 - iy; y += step) { ring(x0 + ix, y); ring(x0 + w0 - 1 - ix, y); } for (let x = x0 + ix; x < x0 + w0 - ix; x += step) { ring(x, y0 + iy); ring(x, y0 + h0 - 1 - iy); } }
    else for (let k = 2; k <= 6; k += 2) { for (let x = x0 - k; x <= x0 + w0 + k; x += step) { ring(x, y0 - k); ring(x, y0 + h0 + k); } for (let y = y0 - k; y <= y0 + h0 + k; y += step) { ring(x0 - k, y); ring(x0 + w0 + k, y); } }
    if (!cr.length) continue; cr.sort((a, b) => a - b); it.cr = Math.round(cr[Math.floor(cr.length * 0.25)] * 100) / 100; it.px = 1; }
}

const CSVQ = v => { const s = Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function csv(rows, cols) { return '﻿' + [cols.join(','), ...rows.map(r => cols.map(c => CSVQ(r[c])).join(','))].join('\n') + '\n'; }
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 섹션 종류 순서(variant · 첫 화면 배치 제외): banner@split>text:features → banner>text */
const kinds = r => (r.secs || String(r.sig || '').split('|')[1] || '').toString().split(/>|,/).filter(Boolean).map(x => x.replace(/[:@].*$/, '')).join('>');
const MIN_N = 15;
/* 요약 읽기: out/rows/*.json */
function loadRows(out) { const d = path.join(out, 'rows'); if (!fs.existsSync(d)) return []; return fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch (e) { return null; } }).filter(Boolean); }
const TYPES = ['adult', 'k12', 'univ', 'lifelong', 'voc', 'corp', 'public'];
/* 유형 묶음: types에 포함된 유형마다 센다(includes · 통합 결정 12:00) — 한 템플릿이 여러 유형에 들어갈 수 있다 */
const typesOf = r => (Array.isArray(r.types) && r.types.length ? r.types : [r.type]).filter(Boolean);
const byType = rows => { const m = {}; rows.forEach(r => typesOf(r).forEach(t => { (m[t] = m[t] || []).push(r); })); Object.values(m).forEach(L => L.sort((a, b) => a.id.localeCompare(b.id))); return m; };

module.exports = { ROOT, need, serve, args, mkOrg, applyTpl, MEASURE, textChecks, dhash, hamming, pixelContrast, csv, esc, loadRows, TYPES, byType, typesOf, kinds, MIN_N, dismiss };
