'use strict';
/* v43.8 평생 · 직업훈련 홈페이지 템플릿(hpx-life.js) 점검
   등록(PASS 표 · HPX_ALL) · 갤러리(프리미엄 묶음) · 게시 미리보기 · 390/1440 넘침 · 13px · 44px · 한 글자 꺾임 · 시나리오 버튼 경로 · 평생교육 문구 · 첫 화면 방문자 고르기
   사용: node tests/ui/tpl438-life.js [shots폴더] */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
/* 템플릿별 적용 유형 · 시나리오 섹션(L4 careernav · A4 trainboard · learnhub) */
const T = { careernav: { ty: ['voc', 'lifelong'], secs: ['lf-find', 'lf-elig', 'lf-track'], hero: 'hxl-hero' }, trainboard: { ty: ['voc'], secs: ['lf-table', 'lf-track'], hero: 'hxl-tbh' }, learnhub: { ty: ['lifelong'], secs: ['lf-cat', 'lf-elig', 'lf-track'], hero: 'hxl-lhh' } };
const IDS = Object.keys(T);
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const make = (p, ty) => p.evaluate(([ty]) => { localStorage.setItem('didisam.emptyStart', '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg(ty, ty === 'voc' ? '해운대 디지털직업전문학교' : '해운대 평생학습관'); }, [ty]);
  try {
    /* 1) PASS 표에 없으면 등록하지 않는다(플래그 없음) */
    { const c = await browser.newContext(); const p = await c.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' });
      for (const ID of IDS) { const r = await p.evaluate(id => ({ pass: HPX_LIFE.PASS[id] || 0, th: HPT.has(id), tp: TPL.some(t => t.id === 'prem-' + id), sec: typeof HPS.hero }), ID);
        ok(r.pass >= 82 ? r.th && r.tp : !r.th && !r.tp, `[${ID}] PASS 표 규칙(점수 ${r.pass}) — 테마 ${r.th} · 템플릿 ${r.tp}`); } await c.close(); }
    /* 2) HPX_ALL로 강제 등록 → 기관 유형별 렌더 */
    for (const ID of IDS) for (const ty of T[ID].ty) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript(() => { window.HPX_ALL = 1; }); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' }); await make(p, ty);
      const g = await p.evaluate(id => { const L = TPL.filter(t => t.prem).sort((a, b) => HPT.premFor().indexOf(a.theme) - HPT.premFor().indexOf(b.theme)); const tp = TPL.find(t => t.id === 'prem-' + id);
        const s = siteFromTpl(tp); const html = siteHTML(s, true, 'ko'); let th = ''; try { th = HPT.thumb(s, id); } catch (e) { th = 'ERR ' + e.message; }
        const classIds = S.classes.map(c => c.id), menuIds = (s.menus || []).map(m => m.id).filter(Boolean);
        const mine = HPX_LIFE.ids.filter(x => HPT.has(x) && HPT.premFits(x)); const days = {}; S.classes.forEach(c => { days[c.id] = (c.days || []).map(Number); });
        return { reg: HPT.has(id), inGal: L.some(t => t.id === 'prem-' + id), fits: HPT.premFits(id), top: HPT.premFor().slice(0, mine.length), html, th, classIds, menuIds, days, secs: s.sections.map(x => (x.data && x.data.hpt) || x.type) }; }, ID);
      const P = `[${ID} ${ty}]`;
      ok(g.reg && g.inGal && g.fits && g.top.includes(ID), `${P} 등록 · 프리미엄 갤러리 노출 · 유형 추천 앞자리(${g.top.join(' · ')})`);
      ok(g.th.includes(T[ID].hero), `${P} 갤러리 미리보기(HPT.thumb)에 새 첫 화면`);
      ok(T[ID].secs.every(k => g.secs.includes(k)) && g.secs[0] === 'banner' && g.html.includes(T[ID].hero), `${P} 시나리오 섹션 구성 ${g.secs.join(' · ')}`);
      ok(!errs.length, `${P} 스크립트 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
      /* 게시 미리보기: 게시 HTML을 그대로 1440 · 390에 띄운다 */
      for (const [w, h, tag] of [[1440, 900, 'pc'], [390, 844, 'm']]) {
        const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SHOT ? 2 : 1 }); const q = await c2.newPage(); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
        await q.goto(`${base}/index.html#blank`, { waitUntil: 'domcontentloaded' }).catch(() => { }); await q.setContent(g.html, { waitUntil: 'load' }).catch(() => { }); await q.waitForTimeout(300);
        const m = await q.evaluate(() => { const vw = innerWidth; const R = { ow: document.documentElement.scrollWidth - vw, small: [], t44: [], wrap1: [], out: [] };
          const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
          const scrollerOf = e => { for (let x = e.parentElement; x; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll') return x; } return null; };
          document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(''); if (!t) return; const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect();
            if (fs < 13) R.small.push(`${e.className}:${fs}:${t.slice(0, 10)}`); if ((r.right > vw + 1 || r.left < -1) && !scrollerOf(e)) R.out.push(t.slice(0, 10)); const lh = parseFloat(getComputedStyle(e).lineHeight) || fs * 1.4; if (t.length >= 2 && r.width < fs * 1.6 && r.height > lh * 1.8) R.wrap1.push(t.slice(0, 10)); });
          /* 44px: 새 섹션의 누르는 칸(링크 · 라벨) */
          document.querySelectorAll('.hpb-qc a,.hxl-dr a,.hxl-hero a,.hxl-hero label,.hxl-find a,.hxl-find label,.hxl-elig a,.hxl-track a,.hxl-tbh a,.hxl-tbh label,.hxl-tbl a,.hxl-lhh a,.hxl-lhh label,.hxl-cat a').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.height < 44 || r.width < 44) R.t44.push(`${(e.textContent || '').trim().slice(0, 10)}:${Math.round(r.width)}x${Math.round(r.height)}`); });
          return R; });
        ok(m.ow <= 0 && !m.out.length, `${P} ${tag} 가로 넘침 0 · 화면 밖 0 ${m.out.slice(0, 3).join(' | ')}`);
        ok(!m.small.length, `${P} ${tag} 13px 미만 0 ${m.small.slice(0, 3).join(' | ')}`);
        ok(!m.t44.length, `${P} ${tag} 누르는 칸 44px 이상 ${m.t44.slice(0, 3).join(' | ')}`);
        ok(!m.wrap1.length, `${P} ${tag} 한 글자 꺾임 0 ${m.wrap1.slice(0, 3).join(' | ')}`);
        /* 심사 공통 ①: 숫자 띠 「공개 과정 N개」와 화면의 과정 수(칩 · 카드 · 표 · 링크된 과정)가 같아야 한다 */
        const nm = await q.evaluate(() => { const f = [...document.querySelectorAll('.hps-facts dt,.hps-facts span,.hps-facts p')].find(e => /^공개 /.test(e.textContent.trim())); let n = null;
          if (f) { const box = f.closest('div') || f.parentElement; const m0 = (box.textContent || '').match(/(\d+)\s*개/); n = m0 ? +m0[1] : null; }
          const ids = new Set([...document.querySelectorAll('section[class*="hxl-"] a[href^="#p-c-"]')].map(a => a.getAttribute('href')));
          const chip = document.querySelector('label[for="hxlf-all"] small'); const cards = document.querySelectorAll('.hxl-cc').length; const rows = document.querySelectorAll('.hxl-tb a.hxl-tr').length;
          return { n, ids: ids.size, chip: chip ? +chip.textContent : null, cards: cards || null, rows: rows || null }; });
        ok(nm.n != null && nm.ids === nm.n && [nm.chip, nm.cards, nm.rows].every(v => v == null || v === nm.n), `${P} ${tag} 과정 수 일치 — 숫자 띠 ${nm.n} · 링크 ${nm.ids} · 칩 ${nm.chip} · 카드 ${nm.cards} · 표 ${nm.rows}`);
        /* 첫 화면 방문자 고르기: 라벨을 누르면 그 사람의 할 일이 열린다 */
        if (ID === 'careernav') { const sw = await q.evaluate(async () => { const vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }; const a0 = vis('.hxl-ans.a0') && !vis('.hxl-ans.a3'); document.querySelector('label[for="hxlp3"]').click(); await new Promise(r => setTimeout(r, 50)); return { a0, a3: vis('.hxl-ans.a3') && !vis('.hxl-ans.a0'), first: [...document.querySelectorAll('.hxl-ans.a3 a')].map(a => a.getAttribute('href')) }; });
        ok(sw.a0 && sw.a3 && sw.first.includes('#login/my'), `${P} ${tag} 「어떤 분이세요?」 전환 → ${ty === 'voc' ? '훈련생' : '수강생'} 할 일 ${sw.first.join(' ')}`); }
        if (ID === 'trainboard') { const ck = await q.evaluate(async () => { const vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }; const tick = () => new Promise(r => setTimeout(r, 30)); const R = { r0: vis('.hxl-cr.r0') && !vis('.hxl-cr.ok') && !vis('.hxl-cr.no') };
            for (const k of [0, 1, 2]) document.querySelector(`label[for="hxlq${k}y"]`).click(); await tick(); R.ok = vis('.hxl-cr.ok') && !vis('.hxl-cr.r0') && !vis('.hxl-cr.no'); R.okH = [...document.querySelectorAll('.hxl-cr.ok a')].map(a => a.getAttribute('href'));
            document.querySelector('label[for="hxlq1n"]').click(); await tick(); R.no = vis('.hxl-cr.no') && !vis('.hxl-cr.ok'); R.bars = document.querySelectorAll('.hxl-gl li').length; R.today = !!document.querySelector('.hxl-gtd'); return R; });
          ok(ck.r0 && ck.ok && ck.no && ck.okH.some(h => /work24/.test(h)), `${P} ${tag} 국비 자격 3문항 → 미답 안내 · 모두 예 = 카드 신청(고용24) · 아니요 = 상담`);
          ok(ck.bars >= 3 && ck.today, `${P} ${tag} 개강 일정표 막대 ${ck.bars}개 · 오늘 선`); }
        if (ID === 'learnhub') { const dy = await q.evaluate(async () => { const vis = e => !!e && getComputedStyle(e).display !== 'none'; const a0 = vis(document.querySelector('.hxl-dp.pa')) && !vis(document.querySelector('.hxl-dp.p1'));
            document.querySelector('label[for="hxld1"]').click(); await new Promise(r => setTimeout(r, 30)); const p1 = document.querySelector('.hxl-dp.p1');
            return { a0, p1: vis(p1) && !vis(document.querySelector('.hxl-dp.pa')), ids: [...p1.querySelectorAll('a[href^="#p-c-"]')].map(a => a.getAttribute('href').slice(5)), b: [...document.querySelectorAll('.hxl-lhh .hxl-b')].map(b => Math.round(b.getBoundingClientRect().height)).filter(h => h > 0) }; });
          const want = Object.keys(g.days).filter(k => g.days[k].includes(1));
          ok(dy.a0 && dy.p1 && dy.ids.length === Math.min(5, want.length) && dy.ids.every(k => want.includes(k)), `${P} ${tag} 요일로 찾기: 월 → 월요일 수업 ${dy.ids.join(',')}(실제 ${want.join(',')})`);
          ok(dy.b.length && dy.b.every(h => h >= 56), `${P} ${tag} 시니어 버튼 56px 이상 ${dy.b.join(',')}`); }
        if (ID === 'careernav' && tag === 'pc') { const fl = await q.evaluate(() => { const lab = document.querySelector('.hxl-ch label:nth-of-type(2)'); if (!lab) return null; const n0 = [...document.querySelectorAll('.hxl-cc')].filter(e => getComputedStyle(e).display !== 'none').length; lab.click(); const n1 = [...document.querySelectorAll('.hxl-cc')].filter(e => getComputedStyle(e).display !== 'none').length; return [n0, n1, +lab.querySelector('small').textContent]; });
          ok(fl && fl[1] === fl[2] && fl[1] < fl[0], `${P} 과정 거르기 칩 ${fl && fl.join(' → ')}`); }
        if (SHOT) await q.screenshot({ path: path.join(SHOT, ID === 'careernav' ? `t-${ty}-${tag}.png` : `t-${ID}-${ty}-${tag}.png`) });
        await c2.close(); }
      /* 시나리오 버튼 경로: 실제 강좌 · 메뉴 · 학습자 경로 · 전화 · 고용24만 */
      const H = [...g.html.matchAll(/<section class="[^"]*hxl-[\s\S]*?<\/section>/g)].map(x => x[0]).join(''); const hrefs = [...H.matchAll(/href="([^"]*)"/g)].map(x => x[1]);
      const good = h => { const m = h.match(/^#p-c-(.+)$/); if (m) return g.classIds.includes(m[1]); const n = h.match(/^#p-m-(.+)$/); if (n) return g.menuIds.includes(n[1]); return /^(#p-home|#login\/(my|cal)|tel:[\d+]+|mailto:\S+@\S+|https:\/\/www\.work24\.go\.kr)$/.test(h); };
      const bad = hrefs.filter(h => !good(h)); ok(hrefs.length >= 10 && !bad.length, `${P} 시나리오 링크 ${hrefs.length}개 모두 실제 경로 ${bad.slice(0, 3).join(' ')}`);
      if (ty === 'voc') ok(/work24\.go\.kr/.test(H) && /내일배움카드/.test(H), `${P} 국비 · 내일배움카드 자격 확인 → 고용24`);
      else { const txt = H.replace(/<[^>]+>/g, ' '); ok(!/훈련|국비|내일배움|고용노동부/.test(txt) && /휴대폰 번호는 동의한 경우에만/.test(txt), `${P} 훈련 · 국비 문구 없음 · 휴대폰 번호는 동의 시에만`); }
      await c.close(); }
  } catch (e) { fails.push('예외 ' + e.message); console.log(e); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
