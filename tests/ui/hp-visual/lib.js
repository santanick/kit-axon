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

/* 외부 글꼴(R2 N6 · v34.5 H4): cdn.jsdelivr.net(Pretendard · 원저작자 배포 글꼴)만 로컬 캐시로 응답하고, 그 밖의 외부 요청은 끊는다.
   캐시: HPV_CDN_CACHE(기본 ~/.cache/hpvisual-cdn) — 없으면 curl로 한 번 받는다(프록시 · CA는 curl 설정을 따름). 못 받으면 abort(시스템 글꼴로 찍힘 → 행의 fonts로 드러남) */
const CDN_DIR = process.env.HPV_CDN_CACHE || path.join(require('node:os').homedir(), '.cache', 'hpvisual-cdn');
const CDN_RX = /^https:\/\/cdn\.jsdelivr\.net\//; const CDN_MEM = new Map(); const cdnStat = { hit: 0, got: 0, fail: 0 };
function cdnGet(u) { if (CDN_MEM.has(u)) return CDN_MEM.get(u);
  const pr = new Promise(ok => { const f = path.join(CDN_DIR, require('node:crypto').createHash('sha1').update(u).digest('hex') + (u.split('?')[0].endsWith('.css') ? '.css' : '.bin'));
    if (fs.existsSync(f) && fs.statSync(f).size > 0) { cdnStat.hit++; return ok(fs.readFileSync(f)); }
    fs.mkdirSync(CDN_DIR, { recursive: true });
    cp.execFile('curl', ['-sSfL', '--max-time', '25', '-o', f + '.part', u], e => { if (e || !fs.existsSync(f + '.part')) { cdnStat.fail++; try { fs.unlinkSync(f + '.part'); } catch (x) { } return ok(null); } fs.renameSync(f + '.part', f); cdnStat.got++; ok(fs.readFileSync(f)); }); });
  CDN_MEM.set(u, pr); return pr; }
async function net(t) { await t.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, async r => { const u = r.request().url();
  if (!CDN_RX.test(u)) return r.abort(); const b = await cdnGet(u); if (!b) return r.abort();
  const ct = /\.css(\?|$)/.test(u) ? 'text/css; charset=utf-8' : /\.woff2(\?|$)/.test(u) ? 'font/woff2' : /\.woff(\?|$)/.test(u) ? 'font/woff' : 'application/octet-stream';
  return r.fulfill({ status: 200, body: b, contentType: ct, headers: { 'access-control-allow-origin': '*', 'cache-control': 'max-age=31536000' } }); }); }

/* 인자: --key value · --flag */
function args(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) o[k] = true; else { o[k] = n; i++; } } else o._.push(a); } return o; }

const ORGN = { adult: '센텀 실무 아카데미', k12: '센텀 수학학원', univ: '부산미래대학교', lifelong: '해운대구 평생학습관', voc: '부산 직업전문학교', corp: '한빛물산 인재개발원', public: '해운대구 인재개발원' };

/* 점검 기관 상태(R1 H4 · v34.5 FB)
   - filled(기본): 공개 강좌 6 · 공지 4 · 후기 3 · 연락처가 있는 '채워진 기관'(숫자는 강좌에서 HPT.facts가 셈)
   - empty: 빈 스튜디오(강좌 · 공지 · 후기 · 연락처 없음) — 실제 신규 고객의 첫 게시본이자 예전 도구의 점검 기관과 같은 상태 */
const STATES = ['filled', 'empty'];
const CLS = {
  adult: ['실무 엑셀 데이터 정리', '생성형 AI 업무 활용', '비즈니스 영어 회화', '포토샵 기초 디자인', '파이썬 업무 자동화', '프레젠테이션 스피치'],
  k12: ['중2 수학 개념 완성', '고1 영어 내신 대비', '초등 사고력 수학', '중3 과학 실험 탐구', '고2 국어 문학 정리', '초등 코딩 블록 교실'],
  univ: ['AI 리터러시 기초', '데이터 분석 입문', '학술 글쓰기', '진로 설계 세미나', '창업 아이디어 실습', '교수법 워크숍'],
  lifelong: ['스마트폰 활용 교실', '수채화 입문', '생활 영어 회화', '우리 동네 역사 탐방', '건강 요가', '디지털 사진 기초'],
  voc: ['전기기능사 실기', '웹 개발 부트캠프', '용접 기초 실습', '컴퓨터활용능력 2급', '바리스타 자격 과정', '회계 실무(전산회계)'],
  corp: ['신입 온보딩 과정', '리더십 기본 과정', '정보보호 법정교육', '직장 내 괴롭힘 예방', '데이터 기반 의사결정', '고객 응대 실무'],
  public: ['공직자 청렴 교육', '민원 응대 실무', '공공 데이터 활용', '디지털 행정 기초', '시민 안전 교육', '적극 행정 사례 연구'] };
const NOTI = ['겨울 학기 수강 신청 안내', '시설 점검에 따른 휴강 안내', '수료증 발급 방법 안내', '상담 운영 시간 변경 안내'];
const REVS = ['설명이 차근차근해서 처음 배우는 사람도 따라가기 좋았습니다.', '실습 위주라 바로 업무에 써먹을 수 있었어요. 다음 과정도 신청했습니다.', '수업 자료가 잘 정리되어 있어서 복습할 때 큰 도움이 됩니다.'];
/* 기관 하나 만들기(유형별 한 번) — 상태(state)에 맞춰 데이터를 채우고 결제 승인 · 게시까지 */
async function mkOrg(br, base, type, errs, state) {
  state = STATES.includes(state) ? state : 'filled';
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } });
  await net(ctx); /* R2 N6: jsdelivr 글꼴만 캐시 응답 · 나머지 외부 차단 */
  const op = await ctx.newPage(); op.on('pageerror', e => errs.push(`op[${type}]: ${e.message}`)); op.on('dialog', d => d.accept());
  await op.goto(base + 'index.html'); await op.waitForFunction(() => typeof createOrg === 'function');
  await op.evaluate(([type, name, empty]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', empty ? '1' : '0'); createOrg(type, name); }, [type, ORGN[type] || '점검 기관', state === 'empty']);
  await op.waitForFunction(() => window.S && S.org); await op.waitForTimeout(700);
  await op.evaluate(([state, names, noti, revs]) => { try { closeModal(); } catch (e) { } try { if (typeof fabClose === 'function') fabClose(); } catch (e) { }
    S.settings.toss = Object.assign(S.settings.toss || {}, { status: '승인', stage: 99, mid: 'qa_demo' }); S.settings.pg = 'toss';
    if (state === 'filled') { const day = n => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };
      const C = S.classes || [];
      S.classes = names.map((nm, i) => { const c = C[i] || { kind: i % 3 === 2 ? 'live' : 'vod', sub: '', level: i % 3, teacher: '', group: '', learners: [], prog: {}, legal: false,
        curriculum: typeof curriculumFor === 'function' ? curriculumFor(nm, 'vod') : [], criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, skip: false, speed: true, early: false, community: 'class' };
        return Object.assign(c, { id: c.id || 'qc' + i, name: nm, status: '운영중', open: '전체',
        price: i === 5 ? 0 : [99000, 149000, 199000, 59000, 129000][i % 5], start: day(7 + i * 7), end: day(67 + i * 7), hours: 12 + i * 2, cert: 'auto',
        days: [[1, 3], [2, 4], [6], [1, 3, 5], [2], [4]][i], time: { from: ['19:00', '10:00', '14:00', '18:30', '09:30', '20:00'][i], to: '' },
        recruit: { on: true, from: i === 4 ? day(5) : day(-10 + i), to: day(5 + i * 4), cap: 12 + i * 4 }, notices: [] }); });
      S.notices = noti.map((t2, i) => ({ id: 'qn' + i, title: t2, at: day(-1 - i * 3), pin: i === 0 }));
      const who = (S.members || [])[0] ? S.members.map(m => m.id) : ['m0'];
      S.posts = [...(S.posts || []).filter(p => p.board !== '수강후기'), ...revs.map((b, i) => ({ id: 'qr' + i, kind: '이야기', board: '수강후기', who: who[i * 2 % who.length], title: b.slice(0, 18), body: b, stars: 5, at: day(-2 - i), replies: 0, views: 20, hidden: false }))];
      S.reviews = [];
      S.settings.footer = Object.assign({}, S.settings.footer, { tel: '051-555-0123', mail: 'info@example.com', email: 'info@example.com', addr: '부산광역시 해운대구 센텀중앙로 00' }); }
    else (S.classes || []).forEach(c => { if (c.status === '운영중' && c.open !== '비공개') c.open = c.open || '전체'; });
    save(); try { lxDemo(); } catch (e) { } smPublish(); }, [state, CLS[type] || CLS.adult, NOTI, REVS]);
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
    /* 실제 데이터 숫자(채워진 기관): 정원 · 시간 · 차시 · 후기 · 공지 · 공개 강좌 수 — 지어낸 숫자 의심에서 뺀다 */
    (S.classes || []).forEach(c => { [c.cap, c.recruit && c.recruit.cap, c.hours, (c.curriculum || []).length].forEach(v => { if (+v > 0) prices.push(String(+v)); }); });
    try { prices.push(String(HPT.reviews().length), String((S.notices || []).length + (S.classes || []).reduce((a, c) => a + (c.notices || []).length, 0)), String((S.classes || []).filter(c => c.open === '전체').length)); } catch (e) { }
    /* 첫 화면 사진(R1 H6): 샘플 사진이면 hero 슬롯 · 긴 변 1200 이상인지 */
    let heroPh = null; try { const bnd = (live.find(x => x.type === 'banner') || { data: {} }).data; const im = (s.img && s.img.hero) || null; const src = (im && (im.stock || im.src)) || bnd.img || (s.photos && s.photos.hero) || '';
      const m = String(src).match(/(?:^|\/)([a-z]{3}-\d{2})(?:-800)?(?:\.webp)?$/); const x = m && window.HPSTOCK && HPSTOCK.get ? HPSTOCK.get(m[1]) : null;
      if (x) heroPh = { id: x.id, long: Math.max(x.w, x.h), slot: (x.slots || []).includes('hero'), types: x.types || [], ok: (x.slots || []).includes('hero') && Math.max(x.w, x.h) >= 1200 }; else if (src) heroPh = { id: 'own', ok: true }; } catch (e) { }
    return { id, name: tp.name, types: tp.types || [], type: (tp.types || [])[0] || '', hidden: !!tp.hidden, theme: s.theme || '', color: s.color || '', layout: fam,
      hero: (live.find(x => x.type === 'banner') || { data: {} }).data.hero || '', sig: fam + '|' + secs.join('>'), secs, nSec: live.length, nHidden: (s.sections || []).length - live.length,
      q: q.score, qMiss: q.miss || [], qErr: q.err, auditMin: amin, facts, prices, heroPh };
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
  const MR = new Map(); const mediaRects = root => { if (!MR.has(root)) MR.set(root, [...root.querySelectorAll('img, video, picture, canvas')].map(m => m.getBoundingClientRect()).filter(b => b.width > 40 && b.height > 30)); return MR.get(root); };
  function overMedia(root, el, r) { const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return mediaRects(root).some(b => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom); /* 화면 밖: 사진 영역 안이면 픽셀로 잰다(v34.5 FB) */
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
  /* 보이는 섹션(최상위 section) · 번호 단계 섹션(01 · 02 · 03 표시) · 강좌 섹션(카드 보임 / 개설 준비 중) — v34.5 FB */
  let nVis = 0, numSec = 0, clsVis = 0, emptyCls = 0;
  roots.forEach(root => { root.querySelectorAll('section').forEach(sec => { if (!vis(sec) || (sec.parentElement && sec.parentElement.closest('section'))) return; nVis++;
    const ns = new Set(); sec.querySelectorAll('*').forEach(e => { if (!vis(e)) return; const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); const m = own.match(/^(?:STEP\s*)?0?([1-6])\.?$/i); if (m) ns.add(+m[1]); });
    if (ns.has(1) && ns.has(2) && ns.has(3)) numSec++;
    if (sec.classList.contains('hps-empty')) emptyCls++; else if (/\b(hp-cls|hpl-k-classes|hps-sec)\b/.test(sec.className) && sec.querySelector('a, article, tr')) clsVis++; }); });
  const h0 = hosts[0] ? hosts[0].getBoundingClientRect() : null;
  /* 글꼴(R2 N6): 실제로 내려받아진 family · 첫 화면 h1 글꼴(첫 이름 · 굵기 · 로드 여부) */
  const ld = [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/^['"]|['"]$/g, '')))];
  let hfont = null; for (const root of roots) { const h = root.querySelector('h1'); if (h && vis(h)) { const cs = getComputedStyle(h); const fam = cs.fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, ''); hfont = [fam, +cs.fontWeight || 400, ld.includes(fam) ? 1 : 0]; break; } }
  return { fonts: ld, hfont, hosts: hosts.length, top: h0 ? Math.round(h0.top + sy) : 0, docH: document.documentElement.scrollHeight, nVis, numSec, clsVis, emptyCls, over: document.documentElement.scrollWidth - innerWidth, wide, texts, photos, empty, txt: txtAll.replace(/\s+/g, ' ').trim().slice(0, 20000) };
};

/* 촬영 전 대기(FIXLIST 16): 페이지를 끝까지 내려 지연 불러오기를 깨우고, 모든 사진을 eager로 바꿔 다 뜨고(decode) 나면 맨 위로. 반환: 아직 안 뜬 사진 수 */
async function settle(pg, ms) {
  return pg.evaluate(async lim => { const t0 = Date.now(); const imgs = () => [...document.querySelectorAll('.smhost')].flatMap(h => h.shadowRoot ? [...h.shadowRoot.querySelectorAll('img')] : []);
    imgs().forEach(i => { if (i.loading === 'lazy') i.loading = 'eager'; i.decoding = 'sync'; }); /* 전체 화면 촬영(captureBeyondViewport)은 decoding=async 사진을 빈 칸으로 찍을 때가 있다 */
    const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += Math.round(innerHeight * .8)) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    scrollTo(0, 0); await new Promise(r => setTimeout(r, 450)); /* 머리글 숨김 · 보임 전환(스크롤 방향)이 끝날 때까지 */
    const L = imgs(); const all = Promise.all(L.map(i => (i.complete ? Promise.resolve() : new Promise(ok => { i.addEventListener('load', ok, { once: true }); i.addEventListener('error', ok, { once: true }); })).then(() => (i.decode ? i.decode().catch(() => {}) : 0))));
    await Promise.race([all, new Promise(r => setTimeout(r, Math.max(300, lim - (Date.now() - t0))))]);
    try { await document.fonts.ready; } catch (e) { }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return imgs().filter(i => !i.complete || !i.naturalWidth).length; }, ms || 4000).catch(() => -1);
}

/* 글자 점검: 자리 문구 · 오류 흔적 · 지어낸 숫자 의심 */
const PHRX = /입력하세요|입력해 주세요|대표번호|센터 주소|학원 주소|OOO|○○○|Lorem|ipsum|평일 09:00|undefined|NaN|\[object Object\]|\{\{|\}\}/g;
function textChecks(txt, allowed) {
  const ph = [...new Set(txt.match(PHRX) || [])];
  const ok = new Set(allowed.map(v => String(v).replace(/,/g, '')));
  const nums = [...new Set(txt.match(/\d[\d,.]*\s*(?:%|명(?![가-힣])|점(?![가-힣])|위(?![가-힣])|배(?![가-힣])|개국|만\s?명|년\s?연속|년\s?전통|년\s?경력|건(?![가-힣]))/g) || [])];
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

module.exports = { net, cdnStat, STATES, settle, ROOT, need, serve, args, mkOrg, applyTpl, MEASURE, textChecks, dhash, hamming, pixelContrast, csv, esc, loadRows, TYPES, byType, typesOf, kinds, MIN_N, dismiss };
