'use strict';
/* v43.8 P1 — 프리미엄 coursedesk · learnpath · cmdledger 업그레이드(didisam/hpup-p1.js) 점검
   index.html에 태그가 아직 없으면 페이지 로드 후 hpup-p1.js를 주입한다(태그 · ?v=는 통합 담당).
   점검: 첫 화면 hu3 렌더 · 유형별 문구 · 390/1440 넘침 · 13px · 44px · 한 글자 꺾임 · 첫 화면 버튼 실제 경로 · 대학 개인정보 · pageerror 0
   사용: node tests/ui/tpl438-p1.js [shots폴더] */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const SHOT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
const T = { coursedesk: ['univ', 'lifelong', 'k12', 'corp', 'public'], learnpath: ['univ', 'voc', 'corp', 'public'], cmdledger: ['corp', 'public', 'univ'] };
const BAD = { univ: /필수 교육|LEARNING CENTER|업무에 필요한/, k12: /필수 교육|LEARNING CENTER|이번 학기/, lifelong: /LEARNING CENTER|업무에 필요한/, voc: /LEARNING CENTER/, corp: /이번 학기/, public: /LEARNING CENTER|업무에 필요한/ };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  try {
    for (const ID of Object.keys(T)) for (const ty of T[ID]) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
      await p.goto(`${base}/index.html`, { waitUntil: 'load' });
      if (!(await p.evaluate(() => [...document.scripts].some(s => /hpup-p1\.js/.test(s.src))))) await p.addScriptTag({ url: `${base}/hpup-p1.js` });
      const g = await p.evaluate(([id, ty]) => { localStorage.setItem('didisam.emptyStart', '0'); const b = document.querySelector('#suEmpty'); if (b) b.checked = false; createOrg(ty, '테스트 기관');
        const tp = TPL.find(t => t.id === 'prem-' + id); const s = siteFromTpl(tp); const html = siteHTML(s, true, 'ko');
        return { html, cls: S.classes.map(x => x.id), menus: (s.menus || []).map(m => m.id).filter(Boolean) }; }, [ID, ty]);
      ok(/class="hpt hp-hero hps-hero hu3 /.test(g.html), `[${ID}/${ty}] 첫 화면 hu3 렌더`);
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        const c2 = await browser.newContext({ viewport: { width: w, height: h } }); const q = await c2.newPage(); await q.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
        await q.goto(`${base}/index.html#blank`, { waitUntil: 'domcontentloaded' }).catch(() => { }); await q.setContent(g.html, { waitUntil: 'load' }).catch(() => { }); await q.waitForTimeout(200);
        const m = await q.evaluate(() => { const vw = innerWidth; const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
          const R = { ow: document.documentElement.scrollWidth - vw, small: [], t44: [], wrap: [] };
          document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(''); if (!t) return; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12.95) R.small.push(e.className + ':' + fs + ':' + t.slice(0, 8)); const r = e.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(e).lineHeight) || fs * 1.4; if (t.length >= 2 && r.width < fs * 1.6 && r.height > lh * 1.8) R.wrap.push(t.slice(0, 8)); });
          document.querySelectorAll('a[href],button,summary,label[for]').forEach(e => { if (!vis(e)) return; if (getComputedStyle(e).display === 'inline' && e.closest('p,li,dd')) return; const r = e.getBoundingClientRect(); if (r.height < 44 || r.width < 44) R.t44.push(e.className + ':' + Math.round(r.width) + 'x' + Math.round(r.height)); });
          const hero = document.querySelector('.hu3'); R.href = hero ? [...hero.querySelectorAll('a[href]')].map(a => a.getAttribute('href')) : []; R.txt = hero ? hero.innerText : ''; R.inputs = hero ? hero.querySelectorAll('input,textarea,select').length : -1; return R; });
        ok(m.ow <= 0 && !m.small.length && !m.t44.length && !m.wrap.length, `[${ID}/${ty} ${w}] 넘침 ${m.ow} · 13px미만 ${m.small.slice(0, 3)} · 44px미만 ${m.t44.slice(0, 3)} · 한글자 ${m.wrap.slice(0, 3)}`);
        if (w === 1440) { const H = [...new Set(m.href)]; const bad = H.filter(x => !(/^#p-c-/.test(x) ? g.cls.includes(x.slice(5)) : /^#p-m-/.test(x) ? g.menus.includes(x.slice(5)) : /^(#p-home|#p-l-fac|#login|#cal|#badges|#my|#notice|tel:[\d+-]+|mailto:\S+@\S+|https:\/\/www\.work24\.go\.kr)$/.test(x)));
          ok(H.length >= 6 && !bad.length, `[${ID}/${ty}] 첫 화면 경로 ${H.length}개 · 잘못된 경로 ${bad.join(' ')}`);
          ok(!(BAD[ty] && BAD[ty].test(m.txt)), `[${ID}/${ty}] 유형에 맞지 않는 문구 없음`);
          ok(/어떤 일로 오셨나요/.test(m.txt), `[${ID}/${ty}] 방문자별 바로가기`);
          if (ID === 'cmdledger') { const big0 = await q.evaluate(() => [...document.querySelectorAll('.hu3-fx dd')].filter(e => e.textContent.trim() === '0').length); const html2 = await q.content();
            ok(!big0 && !/로그인 후 볼 수 있습니다/.test(html2), `[cmdledger/${ty}] 숫자 0 노출 없음 · 「로그인 후 볼 수 있습니다」 중복 카드 없음`);
            ok(!/한 표로/.test(m.txt) || /hu3-lh/.test(html2), `[cmdledger/${ty}] 「한 표로」 제목이면 표가 있음`);
            if (ty === 'corp') ok(!(await q.evaluate(() => [...document.querySelectorAll('.hu3 .hu3-lr b')].some(b => /성희롱|온보딩|개인정보보호|리더십/.test(b.textContent)))), `[cmdledger/corp] 지정 회원 과정명을 공개 첫 화면에 내지 않음`); }
          if (ty === 'corp' || ty === 'public') { const html3 = await q.content(); const npub = await p.evaluate(() => S.classes.filter(c => c.open === '전체' && c.status !== '종료').length);
            ok(!/로그인 후 볼 수 있습니다/.test(html3) && (npub || !/접수 중인 강좌|모집 중 0|접수 중 0/.test(m.txt)) && (npub || ty !== 'public' || !/>시민</.test(html3)), `[${ID}/${ty}] 공개 강좌 ${npub}개 — 빈 상태 안내 · 빈 카드 없음 · 직원형 공공 「시민」 갈래 없음`); }
          if (ty === 'univ') ok(/학번 · 학과로만/.test(m.txt) && m.inputs === 0 && !/휴대폰|전화번호|주민|생년월일/.test(m.txt), `[${ID}/univ] 개인정보 — 학번 · 학과만, 입력칸 0`); }
        if (w === 390 && ID === 'cmdledger') { const hh = await q.evaluate(() => { const e = document.querySelector('.hu3'); return e ? Math.round(e.getBoundingClientRect().height) : 0; }); ok(hh < 1600, `[cmdledger/${ty} 390] 첫 화면 높이 ${hh}px`); }
        if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await q.screenshot({ path: path.join(SHOT, `${ty}-${ID}-${w}.png`) }); }
        await c2.close(); }
      ok(!errs.length, `[${ID}/${ty}] pageerror 0 ${errs.slice(0, 2).join(' | ')}`); await c.close(); }
  } catch (e) { fails.push(e.message); console.error(e); }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
