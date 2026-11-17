'use strict';
/* v43.8 기업 · 공공 홈페이지 템플릿(hpx-corp.js) 점검
   - PASS 표가 비어 있으면 등록하지 않음 · window.HPX_ALL로 강제 등록
   - 등록(HPT · HPD · TPL) · 갤러리 노출(추천 · 프리미엄 묶음, 기관 유형 맞춤) · 게시 미리보기(HPT.thumb · siteHTML)
   - 390 · 1440: 가로 넘침 0 · 화면 밖 요소 0 · 본문 누르는 칸 44px 이상(390) · 글자 13px 이상 · 한 글자 꺾임 0
   - 시나리오 버튼이 학습자 사이트 실제 경로로 이어지는지(#my · #courses · #badges · #notice · #login · #class/<id>)
   - 보조 A3: 시민 강좌 보드(civicclass, 공공 citizen) · 오늘의 시설(facilitynow, 공공 facility) — 추천 · 첫 순서 · 섹션 · 경로(#courses · #my · #notice · #fac · #shop) · 접수 · 추첨 · 전화 · 390/1440
   사용: node tests/ui/tpl438-corp.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const IDS = ['dutydesk', 'civicclass', 'facilitynow'];
const ROUTES = /^#(my|courses|badges|notice|login|home|shop|comm|cal|fac|textbooks)$/;

(async () => {
  const PV = new Map();
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u.startsWith('/__pv/')) { const h = PV.get(u.slice(6)); r.writeHead(h ? 200 : 404, { 'content-type': MIME['.html'] }); return r.end(h || ''); }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const view = async (key, html) => { PV.set(key + '.html', html.replace('<head>', `<head><base href="${base}/">`));
  for (const w of [1440, 390]) { const c2 = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c2.newPage(); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await q.goto(`${base}/__pv/${key}.html`, { waitUntil: 'load' }); await q.waitForTimeout(500);
    const m = await q.evaluate(w => { const de = document.documentElement; const vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const H = [...document.querySelectorAll('section.hxc, section.hps-cta, section.hp-s')]; const inS = el => H.some(s => s.contains(el));
      return { over: de.scrollWidth - vw, out: [...document.querySelectorAll('section.hxc *')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 1).length,
        small: w < 600 ? [...document.querySelectorAll('section.hxc a')].filter(a => vis(a) && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 12)) : [],
        tiny: [...document.querySelectorAll('body *')].filter(el => vis(el) && inS(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13).map(el => el.textContent.trim().slice(0, 10)),
        narrow: [...document.querySelectorAll('section.hxc :is(h1,h2,b,small,a,p,em,span)')].filter(el => { if (!vis(el) || el.textContent.trim().length < 3) return false; const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); return r.height > fs * 5 && r.width < fs * 2.2; }).length,
        order: w < 600 ? (() => { const a = document.querySelector('.hxc-roles'), b = document.querySelector('.hxc-led'); return a && b ? a.getBoundingClientRect().top < b.getBoundingClientRect().top : true; })() : true }; }, w);
    ok(m.over <= 0 && !m.out, `${key} ${w}: 가로 넘침 0 · 화면 밖 요소 0(${m.over}/${m.out})`);
    ok(!m.small.length, `${key} ${w}: 누르는 칸 44px 이상 ${m.small.join(',')}`);
    ok(!m.tiny.length, `${key} ${w}: 글자 13px 이상 ${m.tiny.join(',')}`);
    ok(!m.narrow, `${key} ${w}: 한 글자 꺾임 0(${m.narrow})`);
    ok(m.order, `${key} ${w}: 휴대폰에서 「무엇을 하러 오셨나요?」가 현황판보다 먼저`);
    await c2.close(); }
  };
  const admin = async (all, type, ed) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); if (all) await p.addInitScript(() => { window.HPX_ALL = 1; });
    await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(([t, e]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const bx = document.querySelector('#suEmpty'); if (bx) bx.checked = false; createOrg(t, t === 'corp' ? '한빛테크' : '부산 인재개발원', e); }, [type, ed]); await p.waitForTimeout(1200);
    return { ctx, p, errs }; };

  /* ── PASS 표 비어 있음 → 등록 없음 ── */
  { const { ctx, p, errs } = await admin(false, 'corp');
    const r = await p.evaluate(ids => ({ th: ids.filter(id => HPT.has(id)), tp: ids.filter(id => TPL.some(t => t.id === 'prem-' + id)), x: !!window.HPXC }), IDS);
    ok(!r.th.length && !r.tp.length, `PASS 비어 있음 → 테마 · 템플릿 미등록(${JSON.stringify(r)})`);
    ok(!errs.length, `pageerror 0 ${errs.join('|')}`); await ctx.close(); }

  /* ── HPX_ALL: 등록 · 갤러리 · 미리보기 · 시나리오 경로 ── */
  const { ctx, p, errs } = await admin(true, 'corp');
  const reg = await p.evaluate(ids => ids.map(id => ({ id, th: HPT.has(id), prem: !!(HPT.meta(id) || {}).prem, list: HPT.list.some(x => x.id === id && x.prem), hd: !!(window.HPD && HPD.list().includes(id)), tp: TPL.some(t => t.id === 'prem-' + id && t.prem) })), IDS);
  reg.forEach(r => ok(r.th && r.prem && r.list && r.hd && r.tp, `등록: ${r.id} 테마 · 목록 · 글자 토큰 · 템플릿(${JSON.stringify(r)})`));
  const gal = await p.evaluate(() => ({ fit: HPT.premFits('dutydesk'), first: HPT.premFor()[0], tags: (TPL.find(t => t.id === 'prem-dutydesk') || {}).types }));
  ok(gal.fit && gal.first === 'dutydesk' && gal.tags.includes('corp') && gal.tags.includes('public'), `갤러리: 기업 추천 · 프리미엄 첫 순서(${JSON.stringify(gal)})`);
  ok(await p.evaluate(() => { UI.tpdK = 'prem'; try { go('site'); } catch (e) { } return TPL.filter(t => t.prem).some(t => t.id === 'prem-dutydesk'); }), '갤러리: 프리미엄 묶음에 노출');
  const th = await p.evaluate(() => HPT.thumb(null, 'dutydesk')); ok(/hxc-hero/.test(th) && /hxc-cal/.test(th) && /hxc-cert/.test(th), '게시 미리보기(HPT.thumb): 첫 화면 · 일정표 · 이수증 섹션');
  const html = await p.evaluate(() => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-dutydesk')); S.site = s; return siteHTML(s); });
  ok(/hxc-led/.test(html) && /hxc-roles/.test(html) && /hxc-trk/.test(html), '게시본: 필수 교육 현황판 · 방문 목적 바로가기 · 직무 트랙');
  ok(/마감 D-\d+/.test(html) && !/>D-\d+</.test(html), 'dutydesk: D-day에 「마감」 라벨(마감 D-n)');
  { const h = await p.evaluate(() => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-dutydesk')); return { live: s.sections.filter(x => !x.hide).map(x => (x.data && x.data.hpt) || x.type), hid: s.sections.filter(x => x.hide).map(x => x.data && x.data.hpt) }; });
    ok(!h.live.includes('facts') && !h.live.includes('sched') && h.hid.includes('facts') && h.hid.includes('sched'), `dutydesk: 운영 현황 숫자 띠 · 모집 일정은 숨긴 자리(현황판 · 마감 막대표와 중복 없음 ${h.live.join(',')})`); }
  const links = await p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.hxc a[href]')].map(a => a.getAttribute('href')); }, html);
  const ids = await p.evaluate(() => S.classes.map(c => c.id));
  const bad = links.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && ids.includes(h.slice(5))) || /^(tel:|mailto:)/.test(h)));
  ok(links.length >= 10 && !bad.length, `시나리오 버튼 ${links.length}개 모두 실제 경로(${bad.join(',')})`);
  ok(['#my', '#courses', '#badges', '#login'].every(h => links.includes(h)), '시나리오: 내 필수 교육 #my · 직무 과정 #courses · 이수증 #badges · 로그인 #login');
  ok(links.some(h => /^#p-c-/.test(h)), '시나리오: 신입 온보딩 → 과정 상세(#p-c- → 게시 때 #class/<id>)');
  ok(/'courses', 'fac'\]\.includes\(r\)/.test(fs.readFileSync(ROOT + '/sitemerge.js', 'utf8')) && /key\.startsWith\('c-'\)\) return '#class\/'/.test(fs.readFileSync(ROOT + '/sitemerge.js', 'utf8')), '게시 변환: #p-c-<id> → #class/<id>(sitemerge)');
  ok(!/학번|주민|휴대폰 번호/.test(html.replace(/<style[\s\S]*?<\/style>/g, '')), '개인정보: 템플릿 문구에 학번 · 주민 · 휴대폰 수집 없음(기업은 초대 계정)');
  ok(!/\d{6}-\d{7}|010-\d{4}-\d{4}/.test((html.match(/<section class="hpt[^"]*hxc[\s\S]*?<\/section>/g) || []).join('')), '개인정보: 섹션에 개인 번호 없음(이수율은 전사 합계)');
  /* 렌더 점검: 390 · 1440 */
  await view('corp', html);
  ok(!errs.length, `기업 pageerror 0 ${errs.join('|')}`); await ctx.close();

  /* ── 공공: 직원형은 추천, 시민 · 시설형은 추천에서 뺌(보조 템플릿 몫) ── */
  for (const [ed, want] of [['staff', true], ['citizen', false], ['facility', false]]) { const a = await admin(true, 'public', ed);
    const r = await a.p.evaluate(() => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-dutydesk')); return { fit: HPT.premFits('dutydesk'), h: /hxc-hero/.test(siteHTML(s)) }; });
    ok(r.fit === want && r.h, `공공 ${ed}: 추천 ${want ? '포함' : '제외'} · 렌더 정상(${JSON.stringify(r)})`); ok(!a.errs.length, `공공 ${ed} pageerror 0 ${a.errs.join('|')}`); await a.ctx.close(); }


  /* ── 보조 A3: 시민 강좌 보드 · 오늘의 시설 ── */
  const linkOK = async (p, html) => { const L = await p.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('section.hxc a[href]')].map(a => a.getAttribute('href')); }, html); const cid = await p.evaluate(() => S.classes.map(c => c.id));
    return { L, bad: L.filter(h => !(ROUTES.test(h) || (/^#p-c-/.test(h) && cid.includes(h.slice(5))) || /^(tel:|mailto:)/.test(h))) }; };
  for (const [id, ed, want, secs, routes] of [['civicclass', 'citizen', ['hxc-cv', 'hxc-mon', 'hxc-kl', 'hxc-how'], ['cx-month', 'cx-civlist', 'cx-how'], ['#courses', '#my', '#notice']], ['facilitynow', 'facility', ['hxc-fn', 'hxc-tt', 'hxc-price', 'hxc-off'], ['cx-hours', 'cx-price', 'cx-civlist'], ['#fac', '#shop', '#my', '#notice']]]) {
    const a = await admin(true, 'public', ed);
    const g = await a.p.evaluate(id => ({ fit: HPT.premFits(id), first: HPT.premFor()[0], other: ['dutydesk', 'civicclass', 'facilitynow'].filter(x => x !== id).map(x => HPT.premFits(x)), th: /hxc-hero/.test(HPT.thumb(null, id)) }), id);
    ok(g.fit && g.first === id && !g.other.some(Boolean) && g.th, `${id}: 공공 ${ed} 추천 · 프리미엄 첫 순서 · 다른 두 종은 추천 제외 · 미리보기(${JSON.stringify(g)})`);
    const r = await a.p.evaluate(id => { const s = siteFromTpl(TPL.find(t => t.id === 'prem-' + id)); S.site = s; return { html: siteHTML(s), hpts: s.sections.filter(x => !x.hide).map(x => x.data && x.data.hpt).filter(Boolean), hidden: s.sections.filter(x => x.hide).map(x => x.data && x.data.hpt) }; }, id);
    const rb = r.html.replace(/<style[\s\S]*?<\/style>/g, ''); ok(want.every(c => r.html.includes(c)) && (id === 'civicclass' ? /hxc-tix/.test(rb) && /hxc-pills/.test(rb) && !/hxc-roles/.test(rb) && !/hxc-led/.test(rb) : /hxc-led/.test(r.html) && /hxc-roles/.test(r.html)), `${id}: 게시본 섹션 ${want.join(' · ')} · 데이터 판 · 방문 목적${id === 'civicclass' ? '(티켓 줄 · 알약 줄 — dutydesk와 다른 뼈대)' : ''}`);
    ok(secs.every(k => r.hpts.includes(k)) && !r.hpts.includes('facts') && !r.hpts.includes('sched') && r.hidden.includes('facts') && r.hidden.includes('sched'), `${id}: 섹션 순서 · 자동 숫자 띠 · 모집 일정표는 숨김 자리(${r.hpts.join(',')})`);
    const { L, bad } = await linkOK(a.p, r.html);
    ok(L.length >= 10 && !bad.length && routes.every(h => L.includes(h)) && L.some(h => /^#p-c-/.test(h)), `${id}: 시나리오 버튼 ${L.length}개 실제 경로 · ${routes.join(' ')} · 강좌 상세(${bad.join(',')})`);
    const body = r.html.replace(/<style[\s\S]*?<\/style>/g, '');
    ok(!/학번|주민|휴대폰 번호|<input|<form/.test((body.match(/<section class="hpt[^"]*hxc[\s\S]*?<\/section>/g) || []).join('')), `${id}: 개인정보 — 입력 칸 · 번호 수집 문구 없음`);
    if (id === 'facilitynow') { const f = await a.p.evaluate(() => { const F = S.fac.facilities.filter(f => f.kind === 'time' && f.on !== false); return { n: F.length, names: F.map(f => f.name) }; });
      ok(f.names.every(n => r.html.includes(n)) && /휴관/.test(r.html) && /지역주민/.test(r.html) && /감면/.test(r.html), `facilitynow: 시설 ${f.n}곳 운영표 · 휴관 띠(실제 hours) · 요금 대상(일반 · 지역주민 · 감면)`);
      ok(!/남은 칸 \d|잔여 \d/.test(body), 'facilitynow: 정적 게시본에 실시간 남은 칸 숫자 없음(#fac로 안내)'); }
    await view(id, r.html);
    if (id === 'civicclass') { const nl = await a.p.evaluate(() => { S.classes.forEach(c => { if (c.recruit) c.recruit.mode = 'first'; }); return siteHTML(siteFromTpl(TPL.find(t => t.id === 'prem-civicclass'))); });
      ok(!/hxc-lane lot/.test(nl) && /hxc-lanes one/.test(nl) && !/선착순과 추첨/.test(nl), 'civicclass: 추첨 강좌가 없으면 선착순 흐름만(추첨 설명 숨김)');
      const ph = ((nl.match(/<section[^>]*hxc-kl[\s\S]*?<\/section>/) || [''])[0].match(/<img[^>]*?src="[^"]*img\/stock\/[a-z]{3}-\d{2}/g) || []).map(x => x.slice(-6)); ok(ph.length >= 3 && new Set(ph).size === ph.length, `civicclass: 강좌 카드 사진 중복 없음(${ph.length}장)`); }
    if (id === 'civicclass') { /* 접수 · 추첨 · 전화가 있는 기관 */
      const r2 = await a.p.evaluate(() => { const t = today(); const add = n => { const d = new Date(t); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }; S.settings.footer.tel = '051-749-4000';
        const c = S.classes; c[0].recruit = { on: true, mode: 'lottery', cap: 20, from: t, to: add(6), early: { on: false } }; c[1].recruit = { on: true, mode: 'first', cap: (c[1].learners || []).length + 2, from: t, to: add(12), early: { on: false } };
        const s = siteFromTpl(TPL.find(t => t.id === 'prem-civicclass')); return siteHTML(s); });
      ok(/접수 마감이 가까운 강좌/.test(r2) && /hxc-stk/.test(r2) && /hxc-md lot/.test(r2) && /D-6/.test(r2) && /남은 자리 2/.test(r2) && /href="tel:0517494000"/.test(r2) && /추첨 강좌 1개를 접수/.test(r2), 'civicclass: 접수 중 판(D-day · 남은 자리 · 추첨 배지) · 첫 화면 전화 신청 · 추첨 안내 띠');
      const { bad: b2 } = await linkOK(a.p, r2); ok(!b2.length, `civicclass(접수): 경로 정상 ${b2.join(',')}`); await view('civic-rec', r2); }
    ok(!a.errs.length, `${id} pageerror 0 ${a.errs.join('|')}`); await a.ctx.close(); }

  /* ── 게시본(learner.html Shadow DOM): 오늘의 시설 — 시설 있음 · 시설 0개 ── */
  for (const emp of [false, true]) { const a = await admin(true, 'public', 'facility');
    const tid = await a.p.evaluate(emp => { try { closeModal(); } catch (e) { } if (emp) S.fac.facilities = []; S.settings.toss = Object.assign(S.settings.toss || {}, { status: '승인', stage: 99, mid: 'qa_demo' });
      const s = siteFromTpl(TPL.find(t => t.id === 'prem-facilitynow')); S.site = s; s.published = true; save(); smPublish(); try { closeModal(); } catch (e) { } return DREG.cur(); }, emp);
    const n = await a.p.evaluate(() => ((S.fac || {}).facilities || []).filter(f => f.on !== false && f.kind === 'time').length);
    for (const w of [1440, 390]) { const q = await a.ctx.newPage(); const pe = []; q.on('pageerror', e => pe.push(e.message)); await q.setViewportSize({ width: w, height: 900 });
      await q.goto(`${base}/learner.html?t=${tid}#home`, { waitUntil: 'load' }); await q.waitForTimeout(1500);
      const r = await q.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).filter(Boolean); const one = sel => R.map(r => r.querySelector(sel)).find(Boolean);
        const led = one('.hxc-fn .hxc-led'); const hp = one('.hxc-fn .hxc-hph');
        return { hero: !!one('section.hxc-fn'), rows: led ? led.querySelectorAll('ol li').length : 0, empty: !!one('.hxc-fe'), fac: !!(led && led.querySelector('a[href="#fac"]')), tt: !!one('.hxc-tt'), photoOnly: !!hp && !led, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      ok(r.hero && r.fac && !r.photoOnly && r.over <= 0 && (emp ? r.empty && !r.tt : !r.empty && r.tt && r.rows === Math.min(4, n + 0) || (!emp && r.rows >= Math.min(4, n))), `게시본 facilitynow ${emp ? '시설 0개' : `시설 ${n}곳`} ${w}: 첫 화면 판 · #fac 연결 · ${emp ? '빈 상태 안내 판(사진만 남지 않음)' : '운영표'}(${JSON.stringify(r)})`);
      ok(!pe.length, `게시본 facilitynow ${w} pageerror 0 ${pe.join('|')}`); await q.close(); }
    await a.ctx.close(); }

  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
