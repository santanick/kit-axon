'use strict';
/* v44 학원 · 초중고(hp44-adult) 템플릿 10종 점검 — 등록 · 갤러리 · 학습자 게시본 PC 1440 · 390(넘침 · 44px · 13px · 한 글자 꺾임 · pageerror) · 실제 경로 · 데이터 없음 · 개인정보
   사용: node tests/ui/tpl44-adult.js [--shots <폴더>]  (정적 서버를 띄웠다가 끈다. 브라우저 1개. index.html에 태그가 없으면 테스트가 주입한다) */
const H = require('./hp-visual/lib.js');
const A = H.args(process.argv.slice(2));
const IDS = ['adtalk', 'adexam', 'adit', 'adcraft', 'admove', 'adcook', 'adcoach', 'advocal', 'adphoto', 'admoney', 'adcert'];
const CARDS = {}; const RULEK = {};
const OPT = ['.a4-num', '.a4-quote']; /* FIX 2 · 3: 자랑할 만한 숫자 · 좋은 후기가 있을 때만 보인다 */
const SECS = { adtalk: ['.a4-talk', '.a4-stm', '.a4-cls', '.a4-week', '.a4-fin'], adexam: ['.a4-cert', '.a4-steps', '.a4-rows', '.hx-price', '.a4-fin'],
  adit: ['.a4-cine', '.a4-stm', '.a4-cls', '.a4-week', '.a4-fin'], adcraft: ['.a4-collage', '.a4-band', '.a4-gal', '.hx-loc', '.a4-fin'],
  admove: ['.a4-half', '.a4-tt', '.a4-story', '.hx-price', '.hx-loc', '.a4-fin'], adcook: ['.a4-center', '.a4-story', '.a4-cls', '.a4-gal', '.hx-loc', '.a4-fin'],
  adcoach: ['.a4-sig', '.a4-story', '.a4-steps', '.hx-price', '.a4-fin'], advocal: ['.a4-stage', '.a4-band', '.a4-week', '.a4-gal', '.a4-fin'],
  adphoto: ['.a4-film', '.a4-gal', '.a4-cls', '.a4-fin'], admoney: ['.a4-news', '.a4-stm', '.a4-steps', '.hx-price', '.a4-fin'],
  adcert: ['.a4-badge', '.a4-steps', '.a4-cls', '.a4-cred', '.a4-fin'] };
const H1MAX = Object.fromEntries(IDS.map(id => [id, id === 'adcraft' ? [3, 4] : [2, 4]]));
const inject = async ctx => ctx.route(/\/index\.html(\?.*)?$/, async r => { const res = await r.fetch(); let b = await res.text();
  if (!/hp44-adult\.js/.test(b)) b = b.replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1\n<script src="hp44-adult.js"></script>');
  r.fulfill({ response: res, body: b, headers: Object.assign({}, res.headers(), { 'content-type': 'text/html; charset=utf-8' }) }); });
(async () => {
  const { chromium } = H.need('playwright'); const PORT = 9891 + Math.floor(Math.random() * 8);
  const srv = await H.serve(PORT); const base = `http://127.0.0.1:${PORT}/`; const br = await chromium.launch();
  const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const learner = async (pg, tid, w, h) => { await pg.setViewportSize({ width: w, height: h }); await pg.goto('about:blank'); await pg.goto(base + 'learner.html?t=' + tid + '&r=' + Date.now() + '#home');
    await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(700); await H.settle(pg);
    await pg.evaluate(async () => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); R.forEach(r => r.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }));
      await Promise.all(R.flatMap(r => [...r.querySelectorAll('img')]).map(i => i.complete ? 0 : new Promise(ok2 => { i.onload = i.onerror = ok2; setTimeout(ok2, 3000); }))); try { await document.fonts.ready; } catch (e) { } }); };
  const measure = (pg, sel) => pg.evaluate(SEL => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const q = s => R.flatMap(r => [...r.querySelectorAll(s)]);
    const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const small = [], tap = [], wide = [], brk = [];
    q('.a4-h *, .a4-s *').filter(vis).forEach(el => { const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); const fs = parseFloat(cs.fontSize);
      if (own && !el.closest('svg') && fs < 13) small.push(`${el.tagName}.${el.className} ${fs}`);
      if (el.matches('a[href]') && (b.height < 44 || b.width < 44)) tap.push(`${(el.textContent || '').trim().slice(0, 12)} ${Math.round(b.width)}x${Math.round(b.height)}`);
      if (b.right > innerWidth + 1 || b.left < -1) { let a = el.parentElement, clip = false; while (a) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) { clip = true; break; } a = a.parentElement; } if (!clip) wide.push(`${el.tagName}.${el.className}`); }
      if (own.replace(/\s/g, '').length >= 2 && el.children.length === 0 && b.width < fs * 1.6 && b.height > fs * 2.2) brk.push(own.slice(0, 10)); });
    const links = q('.a4-h a[href], .a4-s a[href], section[data-hx] a[href]').map(a => a.getAttribute('href'));
    const h1 = q('.a4-h h1').filter(vis)[0]; const h1n = h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) : 0;
    const h1fs = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;
    const topImg = q('.a4-h img').filter(vis).some(im => { const b = im.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0 && b.height >= 100 && im.complete && im.naturalWidth > 0; });
    const secs = SEL.filter(s => q(s).some(vis)); const txt = R.map(r => r.textContent).join(' ');
    const numEl = q('.a4-num').filter(vis)[0]; const num = numEl ? { big: (numEl.querySelector('.a4-big') || {}).textContent || '', fine: (numEl.querySelector('.a4-fine') || {}).textContent || '' } : null;
    const IMK = R.flatMap(r => [...r.querySelectorAll('img')]).map(im => String(im.getAttribute('src') || '').replace(/^.*\//, '').replace(/-800(?=\.webp)/, '').replace(/\.webp.*$/, '')).filter(Boolean);
    const dup = IMK.filter((k, i) => IMK.indexOf(k) !== i); const cardK = q('.a4-cp img, .a4-bp img, .a4-gl img').map(im => String(im.getAttribute('src') || '').replace(/^.*\//, '').replace(/-800(?=\.webp)/, '').replace(/\.webp.*$/, ''));
    const kOf = im => im ? String(im.getAttribute('src') || '').replace(/^.*\//, '').replace(/-800(?=\.webp)/, '').replace(/\.webp.*$/, '') : '';
    const pairs = [...q('.a4-cd').map(el => [(el.querySelector('.a4-cn') || {}).textContent || '', kOf(el.querySelector('img'))]), ...q('.a4-bd').map(el => [(el.querySelector('h3') || {}).textContent || '', kOf(el.querySelector('img'))]), ...q('.a4-gl a').map(el => [(el.querySelector('em') || {}).textContent || '', kOf(el.querySelector('img'))])].filter(p => p[1]);
    const qtEl = q('.a4-quote blockquote').filter(vis)[0]; const quote = qtEl ? qtEl.textContent : null;
    return { over: document.documentElement.scrollWidth - innerWidth, small: small.slice(0, 5), tap: tap.slice(0, 5), wide: wide.slice(0, 5), brk: brk.slice(0, 5), links, secs, h1n, h1fs, topImg, dup, cardK, pairs, IMK, txt, inputs: q('.a4-h input, .a4-s input, .a4-s form').length, num, quote, ctaB: Math.max(0, ...q('.a4-h .a4-cta .a4-b').filter(vis).map(b => b.getBoundingClientRect().bottom)), vh: innerHeight, phone: /휴대폰 번호|주민|생년월일/.test(txt), star: /\*/.test(q('.a4-h h1, .a4-fin h2').map(x => x.textContent).join('')) }; }, sel);
  const allowed = h => /^(#login\/(family|my|mypay)|#join|#p-c-[\w-]+|#p-m-[\w-]+|#class\/[\w-]+|#courses|#shop|#notice|tel:[\d+]+|mailto:.+|https:\/\/map\.naver\.com\/.+)$/.test(h);
  try {
    for (const type of ['adult']) {
      const errs = []; const o = await H.mkOrg(br, base, type, errs, 'filled'); await inject(o.ctx); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500); await H.dismiss(o.op);
      const reg = await o.op.evaluate(ids => ids.map(id => { const tp = TPL.find(t => t.id === 't44-' + id) || {}; let th = ''; try { th = HPT.thumb(S.site, id); } catch (e) { th = 'ERR ' + e.message; }
        const au = (() => { try { const b = JSON.parse(JSON.stringify(S.site)); HPT.apply(b, id, { keepColor: true }); return HPT.audit(b).filter(x => x[3] < 4.5).map(x => x[0] + ' ' + x[3]); } catch (e) { return ['ERR ' + e.message]; } })();
        return { id, has: HPT.has(id), list: HPT.list.some(x => x.id === id && x.prem), types: tp.types || [], fits: HPT.premFits(id), first: HPT.premFor().slice(0, 6), thumb: /a4-h/.test(th) && /a4-fin/.test(th), g44: tp.g44 === 1 && !!tp.sub, au }; }), IDS);
      if (process.env.DBG) console.log(JSON.stringify(reg[0]));
      reg.forEach(r => { ok(r.has && r.list && r.types.length === 1 && r.types[0] === 'adult' && r.g44, `[${type}] ${r.id} 등록 · g44 · 세부 유형 · 유형 adult(${r.types})`);
        ok(r.fits, `[${type}] ${r.id} 유형 맞춤`);
        ok(r.thumb, `[${type}] ${r.id} 갤러리 미리보기 = 실제 게시본`);
        ok(!r.au.length, `[${type}] ${r.id} 대비 4.5:1 이상(${r.au.join(', ')})`); });
      /* v44.1: 갤러리 썸네일(HPT.thumb → HPP.thumb → iframe srcdoc, 갤러리와 같은 방식)에서 첫 화면 사진이 실제로 뜨는지 */
      for (const id of IDS) { const th = await o.op.evaluate(async id2 => { let h = HPT.thumb(S.site, id2); if (window.HPP && HPP.thumb) h = HPP.thumb(h);
          const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-same-origin'); f.style.cssText = 'position:fixed;left:0;top:0;width:1440px;height:900px;z-index:99999;transform:scale(.25);transform-origin:0 0;background:#fff'; f.srcdoc = h; document.body.appendChild(f);
          await new Promise(r => { f.onload = r; setTimeout(r, 6000); }); const d = f.contentDocument; const t0 = Date.now(); let res = null;
          while (Date.now() - t0 < 6000) { const I = [...d.querySelectorAll('img')].filter(im => { const b = im.getBoundingClientRect(); return b.top < 900 && b.bottom > 0 && b.width > 80; });
            res = { n: I.length, ok: I.filter(im => im.complete && im.naturalWidth > 0).length, bad: I.filter(im => im.complete && !im.naturalWidth).map(im => im.getAttribute('src')).slice(0, 2) }; if (res.n && res.ok === res.n) break; await new Promise(r => setTimeout(r, 200)); }
          f.remove(); return res; }, id);
        ok(th && th.n >= 1 && th.ok === th.n, `[${type}] ${id} 갤러리 썸네일 첫 화면 사진 표시(${th ? th.ok + '/' + th.n + ' ' + th.bad.join(',') : '-'})`); }
      const flt = await o.op.evaluate(() => { const f = window.HP44AQ; if (!f) return 'no filter'; const T = [['영상이 끊겨요', 5, 0], ['퀴즈 3번 해설 부탁드립니다', 5, 0], ['수업이 정말 좋아요. 업무에 바로 썼어요', 5, 1], ['좋은데 진도가 빠른가요?', 5, 0], ['강의 덕분에 업무가 빨라졌어요', 3, 0], ['수강 후기 남깁니다', 5, 0]];
        const bad = T.filter(([b, st, want]) => !!f({ b, st }) !== !!want).map(x => x[0]); return bad.join(','); });
      ok(!flt, `[${type}] 후기 필터(불만 · 요청 · 질문 · 별점 4 미만 제외) ${flt}`);
      const meta = await o.op.evaluate(ids => ids.map(id => { const tp = TPL.find(t => t.id === 't44-' + id) || {}; return [tp.theme, tp.solo, tp.sub]; }), IDS);
      ok(new Set(meta.map(x => x[0])).size === IDS.length, `[${type}] 템플릿마다 theme id가 서로 다름(${meta.map(x => x[0]).join(',')})`);
      ok(meta.filter(x => x[1] === 1).length >= 3, `[${type}] 1인 강사용(solo: 1) 3종 이상(${meta.filter(x => x[1] === 1).length})`);
      for (const id of IDS) {
        const r = await H.applyTpl(o.op, 't44-' + id); if (process.env.DBG) console.log(JSON.stringify(r).slice(0, 400)); ok(!r.err && r.theme === id, `[${type}] ${id} 템플릿 적용 · 게시(${r.err || r.theme})`);
        const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message.slice(0, 160)));
        for (const [w, h] of [[1440, 900], [390, 844]]) {
          await learner(pg, o.tid, w, h); const m = await measure(pg, SECS[id]); const tag = `[${type} ${w}] ${id}`;
          const need = SECS[id].filter(x => !OPT.includes(x)); ok(need.every(x => m.secs.includes(x)), `${tag} 섹션 ${need.length}종 표시(${m.secs.join(' ')})`);
          ok(!m.num || /수강후기 (\d{2,})건/.test(m.num.fine) || (/^1:[1-8]$/.test(m.num.big.trim())) || /^\d{2,}/.test(m.num.big.trim()), `${tag} 큰 숫자는 자랑할 만한 값만(${m.num ? m.num.big + ' ' + m.num.fine : '숨김'})`);
          ok(!m.quote || !/끊겨|끊기|안 ?돼|안 ?되|부탁|해 ?주세요|오류|에러|환불|불편|아쉬|[?？]\s*$|후기 ?남깁니다/.test(m.quote.trim()), `${tag} 후기 인용은 긍정 후기만(${m.quote ? m.quote.slice(0, 30) : '숨김'})`);
          ok(m.over <= 0 && !m.wide.length, `${tag} 가로 넘침 0(${m.over} ${m.wide.join(',')})`);
          ok(m.h1n >= 1 && m.h1n <= H1MAX[id][w === 390 ? 1 : 0] && m.h1fs >= (w === 390 ? 36 : 64) && (w !== 390 || m.h1fs <= 48), `${tag} 첫 화면 제목 ${m.h1fs}px · ${m.h1n}줄`);
          ok(m.topImg, `${tag} 첫 화면 안에 실사진`);
          ok(!m.dup.length, `${tag} 한 페이지 안 사진 중복 0(${m.dup.join(',')})`); if (w === 1440) { const rel = await o.op.evaluate(([P, K]) => { const H = window.HPSTOCK; const bad = [], rule = [];
              P.forEach(([n, k]) => { const r = H && H.courseRule ? H.courseRule(n) : null; if (!r) return; if (r.ids.includes(k)) { rule.push(k); return; } if (r.ids.some(x => !K.includes(x) && H.get(x))) bad.push(n + '→' + k); }); return { bad, rule }; }, [m.pairs, m.IMK]);
            ok(!rel.bad.length, `${tag} 강좌 사진이 강좌 이름과 맞음(맞는 사진이 있으면 그것 우선, 규칙 일치 ${rel.rule.length}/${m.pairs.length} ${rel.bad.join(', ')})`);
            CARDS[id] = m.cardK.filter(k => !rel.rule.includes(k)); RULEK[id] = rel.rule; }
          ok(m.ctaB > 0 && m.ctaB <= m.vh - 72, `${tag} 첫 화면 안에 제목 · 버튼이 모두 보임(하단 바 위, 버튼 아래끝 ${Math.round(m.ctaB)} / ${m.vh})`);
          ok(!m.small.length, `${tag} 13px 미만 글자 0(${m.small.join(',')})`);
          ok(!m.tap.length, `${tag} 누르는 칸 44px 이상(${m.tap.join(',')})`);
          ok(!m.brk.length, `${tag} 한 글자 꺾임 0(${m.brk.join(',')})`);
          ok(m.links.length >= 8 && m.links.every(allowed), `${tag} 버튼 · 링크가 실제 학습자 경로(${[...new Set(m.links)].join(' ')})`);
          ok(['#login/my', '#login/mypay'].every(x => m.links.includes(x)), `${tag} 수강생 · 결제 바로 가기`);
          ok(!/국가공인|국가 공인|국가자격증 취득/.test(m.txt || ''), `${tag} 국가공인 오인 표현 없음`);
          ok(!m.inputs && !m.phone && !m.star, `${tag} 개인정보 입력칸 · 수집 문구 · 강조 기호 노출 없음`);
          if (A.shots) { const fs = require('fs'); fs.mkdirSync(A.shots, { recursive: true }); const f = `${A.shots}/${id}_${type}_${w === 390 ? 'm' : 'pc'}`;
            await pg.screenshot({ path: f + '_top.jpg', type: 'jpeg', quality: 80 }); await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r2 => setTimeout(r2, 60)); } scrollTo(0, 0); const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); await Promise.all(R.flatMap(r => [...r.querySelectorAll('img')]).map(i => i.complete ? (i.decode ? i.decode().catch(() => 0) : 0) : new Promise(ok2 => { i.onload = i.onerror = ok2; setTimeout(ok2, 4000); }))); }); await pg.waitForTimeout(800); await pg.screenshot({ path: f + '_full.jpg', type: 'jpeg', quality: 70, fullPage: true }); }
          if (w === 1440) { const c = m.links.find(x => /^#(class\/|p-c-)/.test(x)); if (c) { await pg.evaluate(hh => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const a = R.flatMap(r2 => [...r2.querySelectorAll(`.a4-s a[href="${hh}"]`)])[0]; if (a) a.click(); }, c); await pg.waitForTimeout(800);
            ok(await pg.evaluate(() => /^#(class|p-c)/.test(location.hash) && (document.body.innerText || '').length > 50), `${tag} 반 카드 → 반 상세 이동(${c} → ${await pg.evaluate(() => location.hash)})`); } else ok(false, `${tag} 반 링크 없음`); }
        }
        ok(!perr.length, `[${type}] ${id} 학습자 pageerror 0 ${perr.join('|')}`); await pg.close();
      }
      { const all = Object.entries(CARDS).flatMap(([id, L]) => L.map(k => [k, id])); const by = {}; all.forEach(([k, id]) => { (by[k] = by[k] || new Set()).add(id); }); const rep = Object.entries(by).filter(([k, v]) => v.size > 1).map(([k, v]) => k + ':' + [...v].join('/'));
        ok(!rep.length, `[${type}] 템플릿 세트 사진(이름과 맞는 사진이 없을 때)이 템플릿끼리 겹치지 않음(${all.length}장 ${rep.join(' ')})`);
        const rk = Object.values(RULEK).flat(); console.log(`  참고: 이름과 맞는 사진 ${rk.length}장 · 서로 다른 사진 ${new Set(rk).size}장`); }
      ok(!errs.length, `[${type}] 운영 pageerror 0 ${errs.slice(0, 3).join('|')}`); await o.ctx.close();
    }
    /* 데이터 없음: 공개 강좌 · 후기 0 → 반 · 숫자 · 인용 덩어리 숨김(게시본), 넘침 0 */
    { const errs = []; const o = await H.mkOrg(br, base, 'adult', errs, 'empty'); await inject(o.ctx); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500); await H.dismiss(o.op);
      for (const id of IDS) { await o.op.evaluate(() => { S.classes = []; S.posts = (S.posts || []).filter(p => p.board !== '수강후기'); S.reviews = []; S.notices = []; save(); });
        const r = await H.applyTpl(o.op, 't44-' + id); const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message));
        await learner(pg, o.tid, 390, 844); const m = await measure(pg, ['.a4-cls', '.a4-band', '.a4-gal', '.a4-num', '.a4-quote', '.a4-stm', '.a4-tt', '.a4-notice', '.a4-pkg', '.a4-vid', '.a4-hint', '.hx-price', '.hx-rev', '.hx-fac', '.hx-ntc']);
        ok(!r.err && !m.secs.length && m.over <= 0 && !perr.length && m.secs.length === 0, `[빈 기관 390] ${id} 데이터 없는 덩어리 숨김 · 안내 문구 비노출 · 넘침 0(${m.secs.join(' ')} ${m.over} ${perr.join('|')})`);
        const ed = await o.op.evaluate(id2 => { try { HPE = HPE || null; } catch (e) { } let h = ''; try { const b = JSON.parse(JSON.stringify(S.site)); h = siteHTML(b, false, 'ko'); } catch (e) { h = 'ERR ' + e.message; } return { ok: /a4-h/.test(h), err: /^ERR/.test(h) ? h : '' }; }, id);
        ok(ed.ok, `[빈 기관] ${id} 스튜디오 미리보기 렌더(${ed.err})`); await pg.close(); }
      await o.ctx.close(); }
  } catch (e) { ok(false, '예외 ' + (e && e.stack || e)); }
  await br.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
