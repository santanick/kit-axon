'use strict';
/* v34.2 AI 홈페이지 3단계 마법사 점검(키 없이 · 규칙 설계)
   8개 유형에서 사이트 화면 → [AI로 홈페이지 만들기] → 테마 → [시안 3개 만들기] → 시안 3개 → [적용하고 게시] 를 실제 클릭으로 진행하고
   - 누른 횟수(사이트 화면 → 게시) · 시안 3개의 구성이 서로 다른지 · 품질 점수 · 게시 여부 · 스크립트 오류를 확인한다.
   - 게시된 학습자 홈을 390px로 열어 가로 넘침 · 자리 문구 · 지어낸 후기가 없는지 본다.
   - 말로 고치기('색을 초록으로' · '후기 섹션 빼줘' · '테마 바꿔줘')와 [적용](바로 고치기) → [게시하기] 경로도 한 유형씩 확인한다.
   - v34.5 X4: 시안 3개가 레이아웃 계열 · 팔레트 · 첫 화면 사진이 서로 다른지, 이전 사이트의 계열을 그대로 물려받지 않는지, '첫 화면이 같음'은 계열 · 첫 화면 변형(hk) 기준으로 비교,
     말로 고치기 6종(매거진 · 사진 크게 · 공공기관답게 · 어둡고 고급스럽게 · 카드 목록형 · 머리글 투명), 샘플 사진 안내 줄(감점 없음), 숨긴 빈 섹션 되살리기, 예전 게시본 머리글 이전
   사용: node tests/ui/hp-wizard.js  (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const CASES = [['adult'], ['k12'], ['univ'], ['univ', 'lms'], ['corp'], ['public'], ['lifelong'], ['voc']];
const MIN_SCORE = 90; /* v34.5 X4: 품질 90 이상 */

const window_has_stock = sq => sq.some(x => x.pts !== 0 || !x.ok) || sq.every(x => !x.n);
(async () => {
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const rows = [];
  for (let ci = 0; ci < CASES.length; ci++) {
    const [type, ed] = CASES[ci]; const label = ed ? `${type}/${ed}` : type; const errs = []; const bad = [];
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    let clicks = 0; const click = async sel => { await page.waitForSelector(sel, { state: 'visible', timeout: 15000 }); await page.click(sel); clicks++; };
    try {
      await page.goto(`${base}/index.html`, { waitUntil: 'load' });
      const empty = ci === 2 || ci === 5; /* 두 유형은 빈 기관(강좌 · 회원 0)으로 — 빈 섹션 숨김 · 숫자 섹션 생략 확인 */
      await page.evaluate(([type, ed, empty]) => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', empty ? '1' : '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = !!empty; createOrg(type, '센텀 배움 아카데미', ed); }, [type, ed, empty]);
      await page.waitForFunction(() => window.S && S.org); await page.waitForTimeout(400);
      await page.evaluate(() => { try { closeModal(); } catch (e) { } if (typeof fabClose === 'function') try { fabClose(); } catch (e) { } go('site'); render(); });
      await page.waitForTimeout(200);
      const hasT = await page.evaluate(() => !!(window.HPT && HPT.list && HPT.list.length));
      const hasL = await page.evaluate(() => !!(window.HPL && HPL.list && HPL.list().length >= 3));
      /* 이전 사이트에 계열이 있어도(유형별 첫 템플릿) 시안이 그대로 물려받지 않아야 한다(FIXLIST 8) */
      const prevL = hasL ? await page.evaluate(() => { const id = HPL.list()[0].id; HPL.apply(S.site, id); save(); return id; }) : '';
      /* 수강후기 게시판에 섞인 질문 글은 후기로 보이면 안 됨(v34.2 H1) */
      if (ci === 0) await page.evaluate(() => { S.posts = S.posts || []; const m = (S.members || [])[0]; S.posts.unshift({ id: 'qa_q1', board: '수강후기', title: '수강 기간 연장 가능한가요?', body: '연장 방법이 궁금합니다', who: m ? m.id : '', at: today() }); save(); });
      /* 1) 사이트 화면 → 마법사 */
      await click('.hpw-cta [data-act="hpai-open"]');
      const nTheme = await page.$$eval('.hpw-th', L => L.length); if (nTheme < 4) bad.push(`테마 ${nTheme}개`);
      /* 2) 테마(추천) 누르면 바로 설명 단계 */
      await click('.hpw-th.on'); await page.waitForSelector('[name=hw_brief]');
      const brief = await page.$eval('[name=hw_brief]', e => e.value); if (brief.length < 20) bad.push('설명이 미리 채워지지 않음');
      /* 3) 시안 3개 만들기 */
      await click('[data-hw="gen"]'); await page.waitForFunction(() => document.querySelectorAll('.hpw-d').length === 3, null, { timeout: 30000 });
      const D = await page.evaluate(() => HPW.st.drafts.map(d => ({ id: d.id, hero: d.hero, layout: d.site.layout || '', hk: ((d.site.sections.find(x => x.type === 'banner') || {}).data || {}).hk || '', pal: d.site.hpPal || '', photo: ((d.site.img || {}).hero || {}).stock || '', sig: d.site.sections.filter(x => !x.hide).map(x => x.type + (x.data && x.data.variant ? ':' + x.data.variant : '')).join(','), q0: d.q0.score, q: d.q.score,
        bad: d.q.items.filter(x => !x.ok && x.auto !== false).map(x => x.k), look: d.site.hpTheme || d.site.look })));
      if (new Set(D.map(d => d.sig)).size < 3) bad.push('시안 구성이 서로 같음');
      if (hasT) { /* 첫 화면 비교: 계열이 있으면 계열 · 첫 화면 변형(hk), 없으면 화면의 첫 화면 class */
        const hc = await page.evaluate(() => HPW.st.drafts.map(d => { const h = siteHTML(d.site); const m = h.match(/<section[^>]*class="([^"]*\bhpl-(?:hero|s)\b[^"]*)"/); const f = d.site.layout && m ? (m[1].match(/\bhpl-(?!s\b|hero\b|on\b|img\b|w\b)([a-z]+)/) || [])[1] : '';
          return d.site.layout ? `${d.site.layout}:${f || '?'}` : 'hk:' + ((h.match(/class="hpt hp-hero ([^"]+)"/) || [])[1] || ''); }));
        if (new Set(hc).size < 3) bad.push(`첫 화면이 화면에서 서로 같음 ${hc.join(' / ')}`);
        if (hasL) { if (new Set(D.map(d => d.layout).filter(Boolean)).size < 3) bad.push(`계열이 서로 다르지 않음 ${D.map(d => d.layout).join('/')}`);
          if (D.every(d => d.layout === prevL)) bad.push(`이전 사이트 계열(${prevL})을 그대로 물려받음`);
          if (new Set(D.map(d => d.pal).filter(Boolean)).size < 3) bad.push(`팔레트가 서로 다르지 않음 ${D.map(d => d.pal).join('/')}`);
          if (new Set(D.map(d => d.photo).filter(Boolean)).size < 3) bad.push(`첫 화면 사진이 서로 다르지 않음 ${D.map(d => d.photo).join('/')}`); }
        const sq = await page.evaluate(() => HPW.st.drafts.map(d => { const q = hpwQuality(d.site); const it = q.items.find(x => x.k === 'stock'); return { n: it ? it.n : 0, pts: it ? it.pts : 0, ok: it ? it.ok : true }; }));
        if (window_has_stock(sq)) bad.push(`샘플 사진 안내 줄 없음 또는 감점 ${JSON.stringify(sq)}`);
        const au = await page.evaluate(() => HPW.st.drafts.flatMap(d => HPT.audit(d.site).filter(r => r[3] < 4.5).map(r => `${d.id}:${r[0]} ${r[3]}`)));
        if (au.length) bad.push(`대비 4.5:1 미만 ${au.slice(0, 3).join(', ')}`); } if (new Set(D.map(d => d.hero)).size < 3) bad.push('첫 화면 배치가 서로 같음');
      D.forEach(d => { if (d.q < MIN_SCORE) bad.push(`시안 ${d.id} 품질 ${d.q}점`); if (d.bad.some(k => k !== 'contact')) bad.push(`시안 ${d.id} 미해결 ${d.bad.join('/')}`); });
      const shown = await page.$eval('.hpw-q .hpw-score', e => parseInt(e.textContent, 10)).catch(() => -1); if (shown !== D[0].q) bad.push(`화면 점수 ${shown} ≠ ${D[0].q}`);
      /* 시안 고르기는 선택(기본은 A). 다른 유형에서는 B · C도 골라 본다 */
      if (ci % 3) { await click(`[data-hw="pick"][data-v="${ci % 3}"]`); await page.waitForTimeout(150); }
      const picked = await page.evaluate(() => HPW.st.pick);
      /* 4) 적용하고 게시(짝수 유형) · 또는 적용 → 바로 고치기 → 게시하기(홀수 유형) */
      const via = ci % 2 ? 'edit' : 'direct';
      if (via === 'direct') await click('[data-hw="pub"]');
      else { await click('[data-hw="apply"]'); await page.waitForSelector('#hpe .hpw-talk', { timeout: 10000 }); await click('#hpe [data-act="hpe-pub"]'); }
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ({ pub: !!(S.site.published && S.lsite && S.lsite.pub && S.lsite.pub.hp), q: hpwQuality(S.site).score, seo: !!(S.settings.seo && S.settings.seo.title), hpe: !!document.getElementById('hpe'), var: S.site.hpVar, tid: DREG.cur(), rv: (S.posts || []).filter(p => p.board === '수강후기' && !p.hidden).length, hid: S.site.sections.filter(x => x.hide).length }));
      if (!after.pub) bad.push('게시되지 않음'); if (!after.seo) bad.push('SEO 제목 없음'); if (after.var !== D[picked].id) bad.push('고른 시안과 적용된 시안이 다름');
      /* 말로 고치기(바로 고치기 화면) — 첫 유형 */
      if (ci === 1) {
        await page.fill('#hpe .hpw-talk input', '색을 초록으로'); await page.press('#hpe .hpw-talk input', 'Enter'); await page.waitForSelector('#modal [data-mact="ok"]'); await page.click('#modal [data-mact="ok"]'); await page.waitForTimeout(200);
        const c = await page.evaluate(() => S.site.color); if (c.toLowerCase() !== '#15803d') bad.push(`색 바꾸기 실패 ${c}`);
        await page.click('#hpe [data-act="hpe-undo"]'); await page.waitForTimeout(200); const c2 = await page.evaluate(() => S.site.color); if (c2.toLowerCase() === '#15803d') bad.push('되돌리기 실패');
      }
      /* 말로 고치기(AI SAM 대화 카드 → 적용 → 되돌리기) */
      if (ci === 0 || ci === 4) {
        const r = await page.evaluate(() => { if (window.hpClose) hpClose(true); go('site'); const L = ['더 고급스럽게', '테마 바꿔줘', '첫 화면 문구 바꿔줘', '후기 섹션 빼줘', '공지 섹션 넣어줘']; const out = {};
          L.forEach(q => { const a = hpwTalkAnswer(q); out[q] = a ? (a.plan ? 'plan' : 'msg') : 'none'; }); const a = hpwTalkAnswer('홈페이지 색을 보라색으로');
          const before = S.site.color; PLANS[a.plan].run(); const mid = S.site.color; ACT['hpw-undo']({ dataset: { v: a.plan } }); return { out, before, mid, after: S.site.color, none: hpwTalkAnswer('수강료 청구해줘') }; });
        if (r.mid !== '#6D28D9' || r.after !== r.before) bad.push(`대화 카드 적용 · 되돌리기 실패 ${JSON.stringify(r)}`);
        /* v34.5 X4: 디자인 구조 말로 고치기(키 없이 규칙) */
        const t2 = await page.evaluate(() => { const o = {}; const run = q => { const P = hpwTalk(q, true); if (!P || !P.steps.length) return P && P.msg ? site() : null; return P.next(JSON.parse(JSON.stringify(site()))); }; /* 이미 그 모양이면 안내만(지금 사이트로 판정) */
          const L = id => !!(window.HPL && HPL.fam[id]); const bn = s => (s.sections.find(x => x.type === 'banner') || {}).data || {};
          let n = run('매거진 느낌으로'); o.mag = !!n && (!L('editorial') || n.layout === 'editorial');
          n = run('사진 크게'); o.big = !!n && (n.layout === 'fullbleed' || bn(n).hk === 'scrim');
          n = run('더 공공기관답게'); o.pub = !!n && n.theme === 'official' && (!L('portal') || /portal|bulletin/.test(n.layout || ''));
          n = run('어둡고 고급스럽게'); o.noir = !!n && (!L('noir') || n.layout === 'noir') && n.theme === 'premium';
          n = run('카드를 목록형으로'); o.card = !!n && n.sections.filter(x => x.type === 'classes').every(x => x.data.card === 'list');
          if (!site().sections.some(x => x.type === 'classes')) o.card = true; /* 강좌 목록이 없으면 안내만 */
          n = run('머리글 투명하게'); o.head = !!n && !!n.hps && n.hps.head === 'overlay';
          n = run('매거진 느낌으로, 색을 초록으로'); o.mix = !!n && n.color.toLowerCase() === '#15803d';
          o.gate = !!hpwTalkAnswer('사진 크게'); return o; });
        Object.entries(t2).forEach(([k, v]) => { if (!v) bad.push(`말로 고치기(${k}) 실패`); });
        ['더 고급스럽게', '테마 바꿔줘', '첫 화면 문구 바꿔줘'].forEach(q => { if (r.out[q] !== 'plan') bad.push(`'${q}' 계획 없음`); }); if (r.out['후기 섹션 빼줘'] === 'none') bad.push('후기 빼기 응답 없음'); if (r.none) bad.push('홈페이지와 무관한 말을 가로챔');
      }
      /* 게시된 학습자 홈(휴대폰 390) */
      const pm = await ctx.newPage(); pm.on('pageerror', e => errs.push('learner: ' + e.message)); await pm.setViewportSize({ width: 390, height: 844 });
      await pm.goto(`${base}/learner.html?t=${after.tid}#home`, { waitUntil: 'load' }); await pm.waitForTimeout(1500);
      const lh = await pm.evaluate(() => { const vw = document.documentElement.clientWidth; const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (!r.width || cs.position === 'fixed' || e.closest('[aria-hidden="true"],.tick,.tt,svg')) return false; let p = e.parentElement; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') return false; p = p.parentElement; } return r.right > vw + 1; }).length;
        const tx = document.body.innerText + [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot ? h.shadowRoot.textContent : '').join(' '); return { q1: /연장 가능한가요/.test(tx), sw: document.documentElement.scrollWidth, vw, over, ph: /(입력하세요|입력해 주세요|Lorem|대표번호|센터 주소)/.test(tx), rvTxt: /수강후기/.test(tx) }; });
      await pm.close();
      /* v34.5 X4: 숨긴 빈 섹션 되살리기(FIXLIST 14) — 자동으로 숨긴 공지 섹션은 공지가 생기면 보이고, 운영자가 직접 숨긴 섹션은 그대로 */
      if (empty) { const rv = await page.evaluate(() => { const x = S.site.sections.find(y => y.hide && y.hideAuto && y.type === 'notices'); if (!x) return { none: true, hid: S.site.sections.filter(y => y.hide).map(y => y.type + (y.hideAuto ? '*' : '')) };
          const man = S.site.sections.find(y => !y.hide && y.type === 'text' && y.data && y.data.variant === 'steps'); if (man) man.hide = true;
          S.notices = S.notices || []; S.notices.push({ id: 'n_x4', title: '개강 안내', body: '다음 주 개강합니다', at: today() }); const h = siteHTML(site());
          const q = hpwQuality(site()); return { shown: !x.hide, inHtml: /개강 안내/.test(h), manual: man ? !!man.hide : true, q: q.score }; });
        if (!rv.none && (!rv.shown || !rv.inHtml || !rv.manual)) bad.push(`숨긴 빈 섹션 되살리기 실패 ${JSON.stringify(rv)}`); if (rv.none) bad.push(`자동으로 숨긴 공지 섹션이 없음 ${JSON.stringify(rv.hid)}`); }
      /* v34.5 X4: 예전 게시본(머리글 없음) → 스튜디오를 열 때 한 번 다시 만듦 · 게시 뒤 고친 내용이 있으면 안내만 · 되돌리기(FIXLIST 6) */
      if (ci === 6 && after.pub) { const reopen = async () => { await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.S && S.org); await page.evaluate(() => { try { closeModal(); } catch (e) { } go('site'); render(); }); await page.waitForTimeout(300); };
        await page.evaluate(() => { const b = S.site.sections.find(x => x.type === 'banner'); S.site.x4t = b.data.title; b.data.title = '게시 뒤 고친 제목'; delete S.lsite.pub.hp.head; delete S.site.hpHeadMig; save(); }); await reopen();
        const m1 = await page.evaluate(() => ({ mig: S.site.hpHeadMig, head: 'head' in S.lsite.pub.hp, note: !!document.querySelector('.hpw2-mig') }));
        if (m1.mig !== 'skip' || m1.head || !m1.note) bad.push(`게시 뒤 고친 사이트를 자동으로 다시 게시함 ${JSON.stringify(m1)}`);
        await page.evaluate(() => { const b = S.site.sections.find(x => x.type === 'banner'); b.data.title = S.site.x4t; delete S.site.x4t; delete S.site.hpHeadMig; save(); }); await reopen();
        const m2 = await page.evaluate(() => { const r = { mig: S.site.hpHeadMig, head: typeof S.lsite.pub.hp.head === 'string' && S.lsite.pub.hp.head.length > 50, note: !!document.querySelector('.hpw2-mig [data-act="hpw2-mig-undo"]'), pub: !!S.site.published };
          ACT['hpw2-mig-undo'](); r.undo = !('head' in S.lsite.pub.hp) && S.site.hpHeadMig === 'undone'; return r; });
        if (!m2.mig || m2.mig === 'skip' || !m2.head || !m2.note || !m2.pub || !m2.undo) bad.push(`게시본 머리글 이전 실패 ${JSON.stringify(m2)}`); }
      if (lh.sw > lh.vw + 1 || lh.over) bad.push(`휴대폰 가로 넘침 ${lh.sw}/${lh.vw} · 요소 ${lh.over}`); if (lh.ph) bad.push('게시 화면에 자리 문구'); if (lh.q1) bad.push('질문 글이 후기로 보임');
      rows.push({ 계열: D.map(d => `${d.id}:${d.layout}/${d.pal}/${d.photo}`).join(' '), 유형: label + (empty ? '(빈 기관)' : ''), HPT: hasT, 누름: clicks, 경로: via === 'direct' ? '테마→시안→적용하고 게시' : '테마→시안→적용→바로 고치기→게시', 고른시안: D[picked].id, 품질: D.map(d => `${d.id}:${d.q0}→${d.q}`).join(' '), 게시후: after.q, 숨긴빈섹션: after.hid, 넘침: lh.over, 구성: D.map(d => d.sig).join(' | ') });
      if (clicks > (via === 'direct' ? 4 : 5) + (ci % 3 ? 1 : 0)) bad.push(`누름 ${clicks}회`);
    } catch (e) { bad.push('crash: ' + e.message.split('\n')[0]); }
    await ctx.close();
    const ok = !errs.length && !bad.length; console.log(`${ok ? '✓' : '✗'} ${label}`, JSON.stringify(rows[rows.length - 1] || {}), bad.length ? bad : '', errs.length ? errs.slice(0, 3) : '');
    if (!ok) fails.push(label);
  }
  await browser.close(); srv.close();
  console.log(fails.length ? `실패: ${fails.join(', ')}` : `통과: ${CASES.length}개 유형 — 사이트 화면에서 게시까지 기본 4번(시안 A 그대로 · 적용하고 게시)`);
  process.exit(fails.length ? 1 : 0);
})();
