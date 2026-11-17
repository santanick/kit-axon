'use strict';
/* v43.9 학원 묶음(hpv-acad) 템플릿 점검 — 등록 · 갤러리 · 학습자 게시본 PC 1440 · 390(넘침 · 44px · 13px · 한 글자 꺾임 · pageerror) · 실제 경로 · 데이터 없음 · 개인정보
   사용: node tests/ui/tpl439-acad.js [--shots <폴더>]  (정적 서버를 띄웠다가 끈다. 브라우저 1개. index.html에 태그가 없으면 테스트가 주입한다) */
const H = require('./hp-visual/lib.js');
const A = H.args(process.argv.slice(2));
const IDS = ['acpaper', 'accine', 'acposter'];
const SECS = { acpaper: ['.av-pa', '.av-story', '.av-num', '.av-cls', '.av-quote', '.av-fin'], accine: ['.av-ci', '.av-stm', '.av-cls', '.av-week', '.av-num', '.av-quote', '.av-fin'], acposter: ['.av-po', '.av-band', '.av-num', '.av-gal', '.av-quote', '.av-fin'] };
const H1MAX = { acpaper: [2, 3], accine: [2, 4], acposter: [3, 4] };
const inject = async ctx => ctx.route(/\/index\.html(\?.*)?$/, async r => { const res = await r.fetch(); let b = await res.text();
  if (!/hpv-acad\.js/.test(b)) b = b.replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1\n<script src="hpv-acad.js"></script>');
  r.fulfill({ response: res, body: b, headers: Object.assign({}, res.headers(), { 'content-type': 'text/html; charset=utf-8' }) }); });
(async () => {
  const { chromium } = H.need('playwright'); const PORT = 9821 + Math.floor(Math.random() * 9);
  const srv = await H.serve(PORT); const base = `http://127.0.0.1:${PORT}/`; const br = await chromium.launch();
  const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const learner = async (pg, tid, w, h) => { await pg.setViewportSize({ width: w, height: h }); await pg.goto('about:blank'); await pg.goto(base + 'learner.html?t=' + tid + '&r=' + Date.now() + '#home');
    await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(700); await H.settle(pg);
    await pg.evaluate(async () => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); R.forEach(r => r.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }));
      await Promise.all(R.flatMap(r => [...r.querySelectorAll('img')]).map(i => i.complete ? 0 : new Promise(ok2 => { i.onload = i.onerror = ok2; setTimeout(ok2, 3000); }))); try { await document.fonts.ready; } catch (e) { } }); };
  const measure = (pg, sel) => pg.evaluate(SEL => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const q = s => R.flatMap(r => [...r.querySelectorAll(s)]);
    const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const small = [], tap = [], wide = [], brk = [];
    q('.av-h *, .av-s *').filter(vis).forEach(el => { const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); const fs = parseFloat(cs.fontSize);
      if (own && !el.closest('svg') && fs < 13) small.push(`${el.tagName}.${el.className} ${fs}`);
      if (el.matches('a[href]') && (b.height < 44 || b.width < 44)) tap.push(`${(el.textContent || '').trim().slice(0, 12)} ${Math.round(b.width)}x${Math.round(b.height)}`);
      if (b.right > innerWidth + 1 || b.left < -1) { let a = el.parentElement, clip = false; while (a) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) { clip = true; break; } a = a.parentElement; } if (!clip) wide.push(`${el.tagName}.${el.className}`); }
      if (own.replace(/\s/g, '').length >= 2 && el.children.length === 0 && b.width < fs * 1.6 && b.height > fs * 2.2) brk.push(own.slice(0, 10)); });
    const links = q('.av-h a[href], .av-s a[href]').map(a => a.getAttribute('href'));
    const h1 = q('.av-h h1').filter(vis)[0]; const h1n = h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) : 0;
    const h1fs = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;
    const topImg = q('.av-h img').filter(vis).some(im => { const b = im.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0 && b.height >= 100 && im.complete && im.naturalWidth > 0; });
    const secs = SEL.filter(s => q(s).some(vis)); const txt = R.map(r => r.textContent).join(' ');
    return { over: document.documentElement.scrollWidth - innerWidth, small: small.slice(0, 5), tap: tap.slice(0, 5), wide: wide.slice(0, 5), brk: brk.slice(0, 5), links, secs, h1n, h1fs, topImg, inputs: q('.av-h input, .av-s input, .av-s form').length, phone: /휴대폰 번호|주민|생년월일/.test(txt), star: /\*/.test(q('.av-h h1, .av-fin h2').map(x => x.textContent).join('')) }; }, sel);
  const allowed = h => /^(#login\/(family|my|mypay)|#join|#p-c-[\w-]+|#p-m-[\w-]+|#class\/[\w-]+|#courses|#shop|#notice|tel:[\d+]+|mailto:.+)$/.test(h);
  try {
    for (const type of ['k12', 'adult']) {
      const errs = []; const o = await H.mkOrg(br, base, type, errs, 'filled'); await inject(o.ctx); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500); await H.dismiss(o.op);
      const reg = await o.op.evaluate(ids => ids.map(id => { const tp = TPL.find(t => t.id === 'prem-' + id) || {}; let th = ''; try { th = HPT.thumb(S.site, id); } catch (e) { th = 'ERR ' + e.message; }
        const au = (() => { try { const b = JSON.parse(JSON.stringify(S.site)); HPT.apply(b, id, { keepColor: true }); return HPT.audit(b).filter(x => x[3] < 4.5).map(x => x[0] + ' ' + x[3]); } catch (e) { return ['ERR ' + e.message]; } })();
        return { id, has: HPT.has(id), list: HPT.list.some(x => x.id === id && x.prem), types: tp.types || [], fits: HPT.premFits(id), first: HPT.premFor().slice(0, 6), thumb: /av-h/.test(th) && /av-fin/.test(th), au }; }), IDS);
      reg.forEach(r => { ok(r.has && r.list && r.types[0] === 'prem' && r.types.includes(type), `[${type}] ${r.id} 등록 · 테마 목록 · 템플릿 유형(${r.types})`);
        ok(r.fits && r.first.includes(r.id), `[${type}] ${r.id} 갤러리 「추천」 앞쪽(${r.first})`);
        ok(r.thumb, `[${type}] ${r.id} 갤러리 미리보기 = 실제 게시본`);
        ok(!r.au.length, `[${type}] ${r.id} 대비 4.5:1 이상(${r.au.join(', ')})`); });
      for (const id of IDS) {
        const r = await H.applyTpl(o.op, 'prem-' + id); ok(!r.err && r.theme === id, `[${type}] ${id} 템플릿 적용 · 게시(${r.err || r.theme})`);
        const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message.slice(0, 160)));
        for (const [w, h] of [[1440, 900], [390, 844]]) {
          await learner(pg, o.tid, w, h); const m = await measure(pg, SECS[id]); const tag = `[${type} ${w}] ${id}`;
          ok(m.secs.length === SECS[id].length, `${tag} 섹션 ${SECS[id].length}종 표시(${m.secs.join(' ')})`);
          ok(m.over <= 0 && !m.wide.length, `${tag} 가로 넘침 0(${m.over} ${m.wide.join(',')})`);
          ok(m.h1n >= 1 && m.h1n <= H1MAX[id][w === 390 ? 1 : 0] && m.h1fs >= (w === 390 ? 36 : 64), `${tag} 첫 화면 제목 ${m.h1fs}px · ${m.h1n}줄`);
          ok(m.topImg, `${tag} 첫 화면 안에 실사진`);
          ok(!m.small.length, `${tag} 13px 미만 글자 0(${m.small.join(',')})`);
          ok(!m.tap.length, `${tag} 누르는 칸 44px 이상(${m.tap.join(',')})`);
          ok(!m.brk.length, `${tag} 한 글자 꺾임 0(${m.brk.join(',')})`);
          ok(m.links.length >= 8 && m.links.every(allowed), `${tag} 버튼 · 링크가 실제 학습자 경로(${[...new Set(m.links)].join(' ')})`);
          ok(type !== 'k12' || ['#login/family', '#login/my', '#login/mypay'].every(x => m.links.includes(x)), `${tag} 학부모 · 학생 · 결제 바로 가기`);
          ok(!m.inputs && !m.phone && !m.star, `${tag} 개인정보 입력칸 · 수집 문구 · 강조 기호 노출 없음`);
          if (A.shots) { const fs = require('fs'); fs.mkdirSync(A.shots, { recursive: true }); const f = `${A.shots}/${id}_${type}_${w === 390 ? 'm' : 'pc'}`;
            await pg.screenshot({ path: f + '_top.jpg', type: 'jpeg', quality: 80 }); await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r2 => setTimeout(r2, 60)); } scrollTo(0, 0); const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); await Promise.all(R.flatMap(r => [...r.querySelectorAll('img')]).map(i => i.complete ? (i.decode ? i.decode().catch(() => 0) : 0) : new Promise(ok2 => { i.onload = i.onerror = ok2; setTimeout(ok2, 4000); }))); }); await pg.waitForTimeout(800); await pg.screenshot({ path: f + '_full.jpg', type: 'jpeg', quality: 70, fullPage: true }); }
          if (w === 1440) { const c = m.links.find(x => /^#(class\/|p-c-)/.test(x)); if (c) { await pg.evaluate(hh => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const a = R.flatMap(r2 => [...r2.querySelectorAll(`.av-s a[href="${hh}"]`)])[0]; if (a) a.click(); }, c); await pg.waitForTimeout(800);
            ok(await pg.evaluate(() => /^#(class|p-c)/.test(location.hash) && (document.body.innerText || '').length > 50), `${tag} 반 카드 → 반 상세 이동(${c} → ${await pg.evaluate(() => location.hash)})`); } else ok(false, `${tag} 반 링크 없음`); }
        }
        ok(!perr.length, `[${type}] ${id} 학습자 pageerror 0 ${perr.join('|')}`); await pg.close();
      }
      ok(!errs.length, `[${type}] 운영 pageerror 0 ${errs.slice(0, 3).join('|')}`); await o.ctx.close();
    }
    /* 데이터 없음: 공개 강좌 · 후기 0 → 반 · 숫자 · 인용 덩어리 숨김(게시본), 넘침 0 */
    { const errs = []; const o = await H.mkOrg(br, base, 'k12', errs, 'empty'); await inject(o.ctx); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500); await H.dismiss(o.op);
      for (const id of IDS) { await o.op.evaluate(() => { S.classes = []; S.posts = (S.posts || []).filter(p => p.board !== '수강후기'); S.reviews = []; save(); });
        const r = await H.applyTpl(o.op, 'prem-' + id); const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message));
        await learner(pg, o.tid, 390, 844); const m = await measure(pg, ['.av-cls', '.av-band', '.av-gal', '.av-num', '.av-quote', '.av-stm', '.av-hint']);
        ok(!r.err && !m.secs.length && m.over <= 0 && !perr.length && m.secs.length === 0, `[빈 기관 390] ${id} 데이터 없는 덩어리 숨김 · 안내 문구 비노출 · 넘침 0(${m.secs.join(' ')} ${m.over} ${perr.join('|')})`);
        const ed = await o.op.evaluate(id2 => { try { HPE = HPE || null; } catch (e) { } let h = ''; try { const b = JSON.parse(JSON.stringify(S.site)); h = siteHTML(b, false, 'ko'); } catch (e) { h = 'ERR ' + e.message; } return { ok: /av-h/.test(h), err: /^ERR/.test(h) ? h : '' }; }, id);
        ok(ed.ok, `[빈 기관] ${id} 스튜디오 미리보기 렌더(${ed.err})`); await pg.close(); }
      await o.ctx.close(); }
  } catch (e) { ok(false, '예외 ' + (e && e.stack || e)); }
  await br.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
