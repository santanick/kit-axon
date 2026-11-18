'use strict';
/* v44 학원 · 초중고(hp44-k12) 템플릿 10종 점검 — 등록 · 갤러리 · 학습자 게시본 PC 1440 · 390(넘침 · 44px · 13px · 한 글자 꺾임 · pageerror) · 실제 경로 · 데이터 없음 · 개인정보
   사용: node tests/ui/tpl44-k12.js [--shots <폴더>]  (정적 서버를 띄웠다가 끈다. 브라우저 1개. index.html에 태그가 없으면 테스트가 주입한다) */
const H = require('./hp-visual/lib.js');
const A = H.args(process.argv.slice(2));
const IDS = ['kfmath', 'kfeng', 'kfessay', 'kfprep', 'kfsci', 'kfkids', 'kfcode', 'kfart', 'kfmusic', 'kfsport'];
const SECS = { kfmath: ['.k4-split', '.k4-story', '.k4-ttg', '.k4-cls', '.k4-fin'], kfeng: ['.k4-frame', '.k4-stm', '.k4-cls', '.k4-week', '.k4-quote', '.k4-fin'], kfessay: ['.k4-center', '.k4-story', '.k4-cls', '.k4-quote', '.k4-fin'],
  kfprep: ['.k4-formal', '.k4-steps', '.k4-rows', '.k4-ttg', '.k4-fin'], kfsci: ['.k4-cine', '.k4-stm', '.k4-cls', '.k4-week', '.k4-quote', '.k4-fin'], kfkids: ['.k4-bubble', '.k4-steps', '.k4-gal', '.k4-cls', '.k4-fin'],
  kfcode: ['.k4-grid', '.k4-band', '.k4-steps', '.k4-fin'], kfart: ['.k4-collage', '.k4-band', '.k4-gal', '.k4-quote', '.k4-fin'], kfmusic: ['.k4-half', '.k4-story', '.k4-ttg', '.k4-quote', '.k4-fin'], kfsport: ['.k4-slab', '.k4-band', '.k4-week', '.k4-gal', '.k4-fin'] };
const CARDS = {}; const FIT = new Set(); /* 강좌 이름에 맞춰 고른 사진은 템플릿끼리 같아도 된다(관련성 우선) */ /* 템플릿별 강좌 · 사진 띠 · 갤러리 사진(유형 안 템플릿끼리 겹치지 않아야 함) */
const H1MAX = Object.fromEntries(IDS.map(id => [id, id === 'kfart' ? [3, 4] : [2, 4]]));
const inject = async ctx => ctx.route(/\/index\.html(\?.*)?$/, async r => { const res = await r.fetch(); let b = await res.text();
  if (!/hp44-k12\.js/.test(b)) b = b.replace(/(<script src="hpprem\.js[^"]*"><\/script>)/, '$1\n<script src="hp44-k12.js"></script>');
  r.fulfill({ response: res, body: b, headers: Object.assign({}, res.headers(), { 'content-type': 'text/html; charset=utf-8' }) }); });
(async () => {
  const { chromium } = H.need('playwright'); const PORT = 9821 + Math.floor(Math.random() * 9);
  const srv = await H.serve(PORT); const base = `http://127.0.0.1:${PORT}/`; const br = await chromium.launch();
  const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const learner = async (pg, tid, w, h) => { await pg.setViewportSize({ width: w, height: h }); await pg.goto('about:blank'); await pg.goto(base + 'learner.html?t=' + tid + '&r=' + Date.now() + '#home');
    await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(700); await H.settle(pg);
    await pg.evaluate(async () => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); R.forEach(r => r.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }));
      await Promise.all(R.flatMap(r => [...r.querySelectorAll('img')]).map(i => i.complete ? 0 : new Promise(ok2 => { i.onload = i.onerror = ok2; setTimeout(ok2, 3000); }))); try { await document.fonts.ready; } catch (e) { } }); await pg.evaluate(async () => { for (let k = 0; k < 5; k++) { scrollTo(0, 0); await new Promise(r => setTimeout(r, 400)); if (scrollY === 0) break; } }); };
  const measure = (pg, sel) => pg.evaluate(SEL => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const q = s => R.flatMap(r => [...r.querySelectorAll(s)]);
    const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const small = [], tap = [], wide = [], brk = [];
    q('.k4-h *, .k4-s *').filter(vis).forEach(el => { const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); const fs = parseFloat(cs.fontSize);
      if (own && !el.closest('svg') && fs < 13) small.push(`${el.tagName}.${el.className} ${fs}`);
      if (el.matches('a[href]') && (b.height < 44 || b.width < 44)) tap.push(`${(el.textContent || '').trim().slice(0, 12)} ${Math.round(b.width)}x${Math.round(b.height)}`);
      if (b.right > innerWidth + 1 || b.left < -1) { let a = el.parentElement, clip = false; while (a) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) { clip = true; break; } a = a.parentElement; } if (!clip) wide.push(`${el.tagName}.${el.className}`); }
      if (own.replace(/\s/g, '').length >= 2 && el.children.length === 0 && b.width < fs * 1.6 && b.height > fs * 2.2) brk.push(own.slice(0, 10)); });
    const links = q('.k4-h a[href], .k4-s a[href]').map(a => a.getAttribute('href'));
    const h1 = q('.k4-h h1').filter(vis)[0]; const h1n = h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) : 0;
    const h1fs = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;
    /* 첫 화면 제목 위쪽이 머리글에 가려지지 않음: 제목 첫 줄 위쪽 몇 점에서 맨 위 요소가 제목인지 */
    const cover = (() => { if (!h1) return 'no h1'; const b = h1.getBoundingClientRect(); if (b.top < 0) return 'top ' + Math.round(b.top); const sr = h1.getRootNode(); const host = sr.host;
      const xs = [b.left + 12, b.left + Math.min(b.width, 300) / 2]; const bad = [];
      xs.forEach(x => { const y = b.top + Math.min(24, b.height / 4); const top = document.elementFromPoint(x, y); if (top !== host && !(host && host.contains(top))) bad.push(`${Math.round(x)},${Math.round(y)} ${top && top.tagName}.${top && top.className}`); else { const inn = sr.elementFromPoint ? sr.elementFromPoint(x, y) : null; if (inn && !inn.closest('h1') && !inn.closest('.k4-h')) bad.push(`inner ${inn.tagName}.${inn.className}`); } });
      return bad.join(' | '); })();
    const sy0 = scrollY;
    const sidOf = u => { const m = String(u || '').match(/([a-z]{3}-\d{2})(?:-800)?\.webp/); return m ? m[1] : String(u || ''); };
    const pics = q('.k4-h img, .k4-s img, section[data-hx] img').filter(vis).map(i => sidOf(i.currentSrc || i.src)); const dupAll = q('.k4-h img, .k4-s img').map(i => sidOf(i.getAttribute('src'))); const dup = pics.filter((x, i) => pics.indexOf(x) !== i);
    const cards = q('.k4-cls img, .k4-band img, .k4-gal img').map(i => sidOf(i.getAttribute('src')));
    /* 관련성 판정용: 강좌 · 사진 띠 · 갤러리의 [강좌 이름, 사진 id] (판정은 HPSTOCK이 있는 운영 화면에서) */
    const pairs = q('.k4-cls .k4-cd, .k4-band .k4-bd, .k4-gal a').map(el => { const im = el.querySelector('img'); const nm = ((el.querySelector('.k4-cn, h3, em') || {}).textContent || '').trim(); return im && nm ? [nm, sidOf(im.getAttribute('src'))] : null; }).filter(Boolean);
    const both = q('.k4-quote').some(vis) && q('section[data-hx="rev"]').some(vis);
    const cd = q('.k4-cds .k4-cd').filter(vis).slice(0, 2).map(x => Math.round(x.getBoundingClientRect().top)); const horiz = cd.length < 2 || cd[0] === cd[1];
    const cta = q('.k4-h .k4-b.p').filter(vis)[0]; const ctaB = cta ? Math.round(cta.getBoundingClientRect().bottom) : 9999;
    const h1B = h1 ? Math.round(h1.getBoundingClientRect().bottom) : 9999;
    const rv = (() => { try { return (HPT.reviews ? HPT.reviews() : []).length; } catch (e) { return -1; } })();
    const quoteTx = q('.k4-quote blockquote').map(x => x.textContent).join('|'); const bigTx = q('.k4-num .k4-big').map(x => x.textContent).join('|');
    const topImg = q('.k4-h img').filter(vis).some(im => { const b = im.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0 && b.height >= 100 && im.complete && im.naturalWidth > 0; });
    const secs = SEL.filter(s => q(s).some(vis)); const txt = R.map(r => r.textContent).join(' ');
    return { pairs, dupAll, dup, cards, both, horiz, ctaB, h1B, quoteTx, bigTx, cover, sy0, over: document.documentElement.scrollWidth - innerWidth, small: small.slice(0, 5), tap: tap.slice(0, 5), wide: wide.slice(0, 5), brk: brk.slice(0, 5), links, secs, h1n, h1fs, topImg, inputs: q('.k4-h input, .k4-s input, .k4-s form').length, phone: /휴대폰 번호|주민|생년월일/.test(txt), star: /\*/.test(q('.k4-h h1, .k4-fin h2').map(x => x.textContent).join('')) }; }, sel);
  const allowed = h => /^(#login\/(family|my|mypay)|#join|#p-c-[\w-]+|#p-m-[\w-]+|#class\/[\w-]+|#courses|#shop|#notice|tel:[\d+]+|mailto:.+)$/.test(h);
  try {
    for (const type of ['k12']) {
      const errs = []; const o = await H.mkOrg(br, base, type, errs, 'filled'); await inject(o.ctx); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500); await H.dismiss(o.op);
      /* 후기 필터 점검: 별점 5인 불만 · 요청 후기(가장 긴 글)를 섞어 둔다 — 인용으로 뽑히면 안 된다 */
      await o.op.evaluate(() => { const who = (S.members || [])[0] ? S.members[0].id : 'm0'; S.posts = [...(S.posts || []), { id: 'qbad', kind: '이야기', board: '수강후기', who, title: '영상이 자꾸 끊겨요', body: '수업은 좋은데 집에서 복습 영상을 볼 때 영상이 자꾸 끊겨요. 확인 부탁드려요', stars: 5, at: new Date().toISOString().slice(0, 10), replies: 0, views: 3, hidden: false }]; save(); smPublish(); }); await H.dismiss(o.op);
      const reg = await o.op.evaluate(ids => ids.map(id => { const tp = TPL.find(t => t.id === 't44-' + id) || {}; let th = ''; try { th = HPT.thumb(S.site, id); } catch (e) { th = 'ERR ' + e.message; }
        const au = (() => { try { const b = JSON.parse(JSON.stringify(S.site)); HPT.apply(b, id, { keepColor: true }); return HPT.audit(b).filter(x => x[3] < 4.5).map(x => x[0] + ' ' + x[3]); } catch (e) { return ['ERR ' + e.message]; } })();
        return { id, has: HPT.has(id), list: HPT.list.some(x => x.id === id && x.prem), types: tp.types || [], fits: HPT.premFits(id), first: HPT.premFor().slice(0, 6), thumb: /k4-h/.test(th) && /k4-fin/.test(th), g44: tp.g44 === 1 && !!tp.sub, au }; }), IDS);
      
      reg.forEach(r => { ok(r.has && r.list && r.types.length === 1 && r.types[0] === 'k12' && r.g44, `[${type}] ${r.id} 등록 · g44 · 세부 유형 · 유형 k12(${r.types})`);
        ok(r.fits, `[${type}] ${r.id} 유형 맞춤`);
        ok(r.thumb, `[${type}] ${r.id} 갤러리 미리보기 = 실제 게시본`);
        ok(!r.au.length, `[${type}] ${r.id} 대비 4.5:1 이상(${r.au.join(', ')})`); });
      for (const id of IDS) {
        const r = await H.applyTpl(o.op, 't44-' + id); ok(!r.err && r.theme === id, `[${type}] ${id} 템플릿 적용 · 게시(${r.err || r.theme})`);
        const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message.slice(0, 160)));
        for (const [w, h] of [[1440, 900], [1280, 800], [390, 844]]) {
          await learner(pg, o.tid, w, h); const m = await measure(pg, SECS[id]); const tag = `[${type} ${w}] ${id}`;
          ok(m.secs.length === SECS[id].length, `${tag} 섹션 ${SECS[id].length}종 표시(${m.secs.join(' ')})`);
          ok(m.over <= 0 && !m.wide.length, `${tag} 가로 넘침 0(${m.over} ${m.wide.join(',')})`);
          ok(m.h1n >= 1 && m.h1n <= H1MAX[id][w === 390 ? 1 : 0] && (w === 390 ? m.h1fs >= 36 && m.h1fs <= (id === 'kfart' ? 64 : 48) : m.h1fs >= 64), `${tag} 첫 화면 제목 ${m.h1fs}px · ${m.h1n}줄`);
          ok(m.h1B <= h - (w === 390 ? 80 : 0) && m.ctaB <= h - (w === 390 ? 76 : 0), `${tag} 첫 화면 안에 제목 · 주 버튼이 모두 보임(제목 ${m.h1B} · 버튼 ${m.ctaB} / ${h})`);
          ok(!/끊겨|부탁|해 ?주세요|환불|오류|[?？]$/.test(m.quoteTx), `${tag} 후기 인용에 불만 · 요청 · 질문 없음(${m.quoteTx.slice(0, 30)})`);
          ok(!m.bigTx || !/^\d개 반$|^\d\.\d\/5$/.test(m.bigTx), `${tag} 큰 숫자는 자랑할 만한 값만(${m.bigTx || '숨김'})`);
          ok(m.topImg, `${tag} 첫 화면 안에 실사진`);
          ok(!m.dup.length, `${tag} 한 페이지 안 사진 중복 0(${m.dup.join(',')})`);
          { const J = await o.op.evaluate(([P, pics]) => { const H2 = window.HPSTOCK; const rel = [], fit = []; P.forEach(([nm, id]) => { const r = H2 && H2.courseRule ? H2.courseRule(nm) : null; if (!r) return; fit.push(...r.ids); if (!r.ids.includes(id) && !r.ids.every(x => pics.includes(x))) rel.push(nm + '→' + id); }); return { rel, fit, n: P.length, hs: !!H2 }; }, [m.pairs, m.dupAll || []]);
            ok(J.hs && (J.n >= 3 || (J.n === 0 && ['kfprep', 'kfmusic'].includes(id))) && !J.rel.length, `${tag} 강좌 사진이 강좌 이름 · 분야와 맞음(${J.n}장 ${J.rel.join(', ')})`); if (w === 1440) J.fit.forEach(x => FIT.add(x)); }
          ok(!m.both, `${tag} 자체 후기 인용과 공통 후기(hx-rev) 중 하나만`);
          ok(m.horiz, `${tag} 반 카드: ${w === 390 ? '휴대폰 가로 넘김' : 'PC 가로 배열'}`);
          if (w === 1440) CARDS[id] = m.cards;
          ok(!m.cover && m.sy0 === 0, `${tag} 첫 화면 제목 위쪽이 머리글에 가려지지 않음(${m.cover || 'ok'} · scrollY ${m.sy0})`);
          ok(!m.small.length, `${tag} 13px 미만 글자 0(${m.small.join(',')})`);
          ok(!m.tap.length, `${tag} 누르는 칸 44px 이상(${m.tap.join(',')})`);
          ok(!m.brk.length, `${tag} 한 글자 꺾임 0(${m.brk.join(',')})`);
          ok(m.links.length >= 8 && m.links.every(allowed), `${tag} 버튼 · 링크가 실제 학습자 경로(${[...new Set(m.links)].join(' ')})`);
          ok(type !== 'k12' || ['#login/family', '#login/my', '#login/mypay'].every(x => m.links.includes(x)), `${tag} 학부모 · 학생 · 결제 바로 가기`);
          ok(!m.inputs && !m.phone && !m.star, `${tag} 개인정보 입력칸 · 수집 문구 · 강조 기호 노출 없음`);
          if (A.shots) { const fs = require('fs'); fs.mkdirSync(A.shots, { recursive: true }); const f = `${A.shots}/${id}_${type}_${w === 390 ? 'm' : w === 1280 ? 'pc1280' : 'pc'}`;
            await pg.screenshot({ path: f + '_top.jpg', type: 'jpeg', quality: 80 }); await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r2 => setTimeout(r2, 60)); } scrollTo(0, 0); const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); await Promise.all(R.flatMap(r => [...r.querySelectorAll('img')]).map(i => i.complete ? (i.decode ? i.decode().catch(() => 0) : 0) : new Promise(ok2 => { i.onload = i.onerror = ok2; setTimeout(ok2, 4000); }))); }); await pg.waitForTimeout(800); await pg.screenshot({ path: f + '_full.jpg', type: 'jpeg', quality: 70, fullPage: true }); }
          if (w === 1440) { const c = m.links.find(x => /^#(class\/|p-c-)/.test(x)); if (c) { await pg.evaluate(hh => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const a = R.flatMap(r2 => [...r2.querySelectorAll(`.k4-s a[href="${hh}"]`)])[0]; if (a) a.click(); }, c); await pg.waitForTimeout(800);
            ok(await pg.evaluate(() => /^#(class|p-c)/.test(location.hash) && (document.body.innerText || '').length > 50), `${tag} 반 카드 → 반 상세 이동(${c} → ${await pg.evaluate(() => location.hash)})`); } else ok(false, `${tag} 반 링크 없음`); }
        }
        ok(!perr.length, `[${type}] ${id} 학습자 pageerror 0 ${perr.join('|')}`); await pg.close();
      }
      { const ov = []; IDS.forEach((a2, i) => IDS.slice(i + 1).forEach(b2 => { const x = (CARDS[a2] || []).filter(v => (CARDS[b2] || []).includes(v) && !FIT.has(v)); if (x.length) ov.push(`${a2}·${b2}:${x.join('/')}`); }));
        ok(!ov.length && Object.keys(CARDS).length === IDS.length, `[${type}] 템플릿끼리 강좌 · 갤러리 사진이 겹치지 않음(${ov.join(' ')})`); }
      ok(!errs.length, `[${type}] 운영 pageerror 0 ${errs.slice(0, 3).join('|')}`); await o.ctx.close();
    }
    /* 큰 숫자: 시연 데이터(후기 3건 · 반 6개 · 정원 12~32명)에서는 숨김(위 점검), 자랑할 만한 값이면 템플릿마다 정한 지표로 보임 */
    { const errs = []; const o = await H.mkOrg(br, base, 'k12', errs, 'filled'); await inject(o.ctx); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500); await H.dismiss(o.op);
      await o.op.evaluate(() => { const who = (S.members || [])[0] ? S.members[0].id : 'm0'; const d0 = new Date().toISOString().slice(0, 10);
        S.posts = [...(S.posts || []).filter(p => p.board !== '수강후기'), ...Array.from({ length: 12 }, (_, i) => ({ id: 'qg' + i, kind: '이야기', board: '수강후기', who, title: '선생님 설명이 좋아요 ' + i, body: '선생님이 차근차근 설명해 주셔서 아이가 수업을 기다려요. 숙제 알림도 편해요 ' + i, stars: 5, at: d0, replies: 0, views: 1, hidden: false }))];
        S.classes.forEach(c => { c.recruit = Object.assign({}, c.recruit, { cap: 8 }); }); S.classes[0].learners = Array.from({ length: 120 }, (_, i) => 'L' + i); save(); smPublish(); }); await H.dismiss(o.op);
      const EXP = { kfessay: /\d\.\d\/5/, kfart: /\d\.\d\/5/, kfcode: /^1:8$/, kfsci: /^120명$/, kfsport: /^120명$/ };
      for (const id of Object.keys(EXP)) { const r = await H.applyTpl(o.op, 't44-' + id); const pg = await o.ctx.newPage(); await learner(pg, o.tid, 390, 844); const m = await measure(pg, ['.k4-num']);
        ok(!r.err && EXP[id].test(m.bigTx), `[자랑할 값 390] ${id} 큰 숫자 표시(${m.bigTx || '없음'}) · 템플릿마다 다른 지표`); await pg.close(); }
      await o.ctx.close(); }
    /* 데이터 없음: 공개 강좌 · 후기 0 → 반 · 숫자 · 인용 덩어리 숨김(게시본), 넘침 0 */
    { const errs = []; const o = await H.mkOrg(br, base, 'k12', errs, 'empty'); await inject(o.ctx); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500); await H.dismiss(o.op);
      for (const id of IDS) { await o.op.evaluate(() => { S.classes = []; S.posts = (S.posts || []).filter(p => p.board !== '수강후기'); S.reviews = []; S.notices = []; save(); });
        const r = await H.applyTpl(o.op, 't44-' + id); const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message));
        await learner(pg, o.tid, 390, 844); const m = await measure(pg, ['.k4-cls', '.k4-band', '.k4-gal', '.k4-quote', '.k4-stm', '.k4-tt', '.k4-notice', '.k4-hint']);
        ok(!r.err && !m.secs.length && m.over <= 0 && !perr.length && m.secs.length === 0, `[빈 기관 390] ${id} 데이터 없는 덩어리 숨김 · 안내 문구 비노출 · 넘침 0(${m.secs.join(' ')} ${m.over} ${perr.join('|')})`);
        const ed = await o.op.evaluate(id2 => { try { HPE = HPE || null; } catch (e) { } let h = ''; try { const b = JSON.parse(JSON.stringify(S.site)); h = siteHTML(b, false, 'ko'); } catch (e) { h = 'ERR ' + e.message; } return { ok: /k4-h/.test(h), err: /^ERR/.test(h) ? h : '' }; }, id);
        ok(ed.ok, `[빈 기관] ${id} 스튜디오 미리보기 렌더(${ed.err})`); await pg.close(); }
      await o.ctx.close(); }
  } catch (e) { ok(false, '예외 ' + (e && e.stack || e)); }
  await br.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
