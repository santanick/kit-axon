'use strict';
/* v43.8 P2 — 프리미엄 briefboard · todayfeed · stage 업그레이드(didisam/hpup-p2.js) 점검
   유형별 템플릿 적용 → 게시본(learner.html 학습자 홈 Shadow DOM)에서: 새 첫 화면 · 과정 비교 섹션 · 3갈래 실제 경로,
   390 · 1440 가로 넘침 0 · 누르는 칸 44px · 글자 13px · pageerror 0. 사용: node tests/ui/tpl438-p2.js (서버 · 브라우저 1개를 띄웠다 끈다)
   index.html에 hpup-p2.js 태그가 아직 없으면(통합 전) 테스트가 응답에 태그를 넣어 렌더한다. */
const H = require('./hp-visual/lib.js');
const IDS = ['briefboard', 'todayfeed', 'stage'];
const TYPES = (process.env.TYPES || 'k12,adult,univ,corp,lifelong,voc').split(',');
const HERO = { briefboard: '.hu4-bb', todayfeed: '.hu4-tf', stage: '.hu4-st' };
const PATHS = { k12: ['#login/family', '#login/mypay', '#login/my'], adult: ['#shop', '#login/my', '#login/mypay'], univ: ['#login/my', '#shop', '#cal'], corp: ['#login/my', '#shop', '#cal'], lifelong: ['#shop', '#login/my', '#cal'], voc: ['#shop', '#login/my', '#cal'] };
(async () => {
  const { chromium } = H.need('playwright'); const PORT = 9741 + Math.floor(Math.random() * 9);
  const srv = await H.serve(PORT); const base = `http://127.0.0.1:${PORT}/`; const br = await chromium.launch();
  const nc = br.newContext.bind(br); br.newContext = async o => { const c = await nc(o); await c.route(/\/index\.html/, async r => { const res = await r.fetch(); let b = await res.text(); if (!/hpup-p2\.js/.test(b)) b = b.replace('<script src="hpstudio.js', '<script src="hpup-p2.js"></script><script src="hpstudio.js'); await r.fulfill({ response: res, body: b }); }); return c; };
  const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  try {
    for (const type of TYPES) {
      const errs = []; const o = await H.mkOrg(br, base, type, errs, 'filled');
      const reg = await o.op.evaluate(ids => ids.map(id => { const tp = TPL.find(t => t.id === 'prem-' + id) || {}; const s = tp.build ? tp.build() : []; return { id, hu4: !!tp.hu4 && !!(HPT.meta(id) || {}).hu4, plan: s.some(x => x.data && x.data.hpt === 'hu4-plan'), t: ((s[0] || {}).data || {}).title || '' }; }), IDS);
      reg.forEach(r => ok(r.hu4 && r.plan && !/오늘 할 일을|오늘 배우고 내일|무대에 올라/.test(r.t), `[${type}] ${r.id} 등록 · 유형별 기본 섹션(${r.t.replace(/\n/g, ' ')})`));
      for (const id of IDS) {
        const r = await H.applyTpl(o.op, 'prem-' + id); ok(!r.err, `[${type}] ${id} 적용 · 게시(${r.err || 'ok'})`);
        const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message.slice(0, 160)));
        for (const [w, h] of [[1440, 900], [390, 844]]) {
          await pg.setViewportSize({ width: w, height: h }); await pg.goto('about:blank'); await pg.goto(base + 'learner.html?t=' + o.tid + '&r=' + Date.now() + '#home');
          await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(600); await H.settle(pg);
          const m = await pg.evaluate(hs => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const q = s => R.flatMap(r => [...r.querySelectorAll(s)]);
            const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
            const small = [], tgt = [];
            R.forEach(r => { r.querySelectorAll('a,button,summary,input,select').forEach(el => { if (!vis(el)) return; const b = el.getBoundingClientRect(); if (b.height < 44 || b.width < 44) tgt.push(`${el.className || el.tagName} ${Math.round(b.width)}x${Math.round(b.height)} ${(el.textContent || '').trim().slice(0, 12)}`); });
              r.querySelectorAll('*').forEach(el => { if (!vis(el)) return; const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(''); if (t && parseFloat(getComputedStyle(el).fontSize) < 13) small.push(`${el.className || el.tagName} ${t.slice(0, 10)}`); }); });
            const hero = q(hs)[0]; const doors = q('.hu4-dr .hu4-d').length; const hl = q(hs + ' a').map(a => a.getAttribute('href'));
            const h1 = hero && hero.querySelector('h1'); const lh = h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) : 0;
            return { hero: !!hero, doors, plan: q('.hu4-plan .hu4-pl>li').length, hl, ov: document.documentElement.scrollWidth - innerWidth, small: [...new Set(small)].slice(0, 6), tgt: [...new Set(tgt)].slice(0, 6), lh, dead: hl.filter(h => !h || h === '#').length }; }, HERO[id]);
          const tag = `[${type}] ${id} ${w}`;
          ok(m.hero && m.doors === 3, `${tag} 첫 화면(${HERO[id]}) · 3갈래 ${m.doors}`);
          ok(m.plan >= 3, `${tag} 과정 비교 ${m.plan}줄`);
          ok(PATHS[type].every(p => m.hl.includes(p)) && !m.dead, `${tag} 버튼 실제 경로(${PATHS[type].join(' ')}) · 빈 링크 ${m.dead}`);
          ok(m.lh >= 1 && m.lh <= 3, `${tag} 제목 ${m.lh}줄(3줄 이하)`);
          ok(m.ov <= 0, `${tag} 가로 넘침 ${m.ov}`);
          ok(!m.small.length, `${tag} 13px 미만 ${JSON.stringify(m.small)}`);
          ok(!m.tgt.length, `${tag} 44px 미만 ${JSON.stringify(m.tgt)}`);
        }
        ok(!perr.length, `[${type}] ${id} pageerror 0(${perr.join(' | ')})`); await pg.close();
      }
      ok(!errs.length, `[${type}] 운영 화면 pageerror 0(${errs.slice(0, 2).join(' | ')})`);
      await o.ctx.close();
    }
  } finally { await br.close(); srv.close(); }
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
