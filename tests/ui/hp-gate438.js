'use strict';
/* v43.8 390 관문 — 홈페이지 게시본(모든 템플릿 공통 부품) 회귀 점검
   교차 심사 4개 묶음 공통 위반: 공지 태그 12.5px · 「새 글」 배지 11px · FAQ 카드 아래 전화 · 메일 링크 20~25px ·
   바닥글 링크 16~33px · 로그인 버튼 폭 37px → 글자 13px 이상, 누르는 칸 44px 이상, 가로 넘침 0.
   후기 목록(.hps-rm · blockquote): 1열로 접힌 후기 묶음이 말줄임 글(nowrap)의 최소 폭만큼 화면 밖으로 넘치던 것 → 카드 · 화면 안(가로 넘김 목록 안은 제외).
   기관 유형 × 템플릿(기본 · 프리미엄 6종 · 계열 몇 종) + 바닥글 8종을 휴대폰 390에서 게시 미리보기(learner.html#home)로 렌더해 Shadow DOM 안을 잰다.
   사용: node tests/ui/hp-gate438.js  (정적 서버를 테스트 안에서 띄웠다 끈다) · SHOT_DIR=폴더 를 주면 390 전체 화면을 남긴다 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const H = require('./hp-visual/lib.js');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const SHOT = process.env.SHOT_DIR || '';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };

/* 유형 → 템플릿('-' = 새 기관 기본 사이트). 프리미엄 6종은 모두, 계열 템플릿은 유형마다 하나 이상 */
const PLAN = {
  adult: ['-', 'prem-coursedesk', 'prem-stage', 't1-ad-office'],
  univ: ['prem-learnpath', 't2-univ-ctl'],
  k12: ['prem-todayfeed', 't1-k12-math', 'k12-exam', 'k12-total', 't1-k12-coding'],
  lifelong: ['prem-briefboard'],
  voc: ['prem-cmdledger', 't3-v-kdt']
};
const FOOTS = ['mega', 'cta', 'biz', 'min', 'cols', 'gov', 'campus', 'split'];

const MEASURE = () => {
  const roots = [...document.querySelectorAll('.smhost')].filter(h => h.shadowRoot).map(h => h.shadowRoot);
  const vis = el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const all = sel => roots.flatMap(R => [...R.querySelectorAll(sel)]).filter(vis);
  const sz = el => { const r = el.getBoundingClientRect(); return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
  const lab = el => (el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.split(' ')[0] : el.tagName.toLowerCase() + '<' + (el.parentElement ? (el.parentElement.className || el.parentElement.tagName).toString().split(' ')[0] : '') + '>') + ' "' + (el.textContent || '').trim().slice(0, 14) + '"';
  const font = all('.hps-tag, .hps-new, .hps-chip').map(e => [lab(e), parseFloat(getComputedStyle(e).fontSize)]);
  const tgt = (sel, k) => all(sel).map(e => { const [w, h] = sz(e); return [k, lab(e), w, h]; });
  const T = [...tgt('a[href^="tel:"], a[href^="mailto:"]', '전화 · 메일'), ...tgt('footer.gf a', '바닥글'), ...tgt('.lhs-jn a', '로그인')];
  /* 후기: 가로 넘김 목록(overflow-x auto/scroll) 밖에서는 화면 안, 카드(li · figure) 안에 있어야 한다 */
  const scr = e => { for (let a = e.parentElement; a; a = a.parentElement) if (/auto|scroll/.test(getComputedStyle(a).overflowX)) return true; return false; };
  const RV = all('.hps-rm, .hps-rl blockquote, .hpb-rs blockquote, .hps-q1 blockquote, .hps-rvb, .hps-rl').map(e => { const b = e.getBoundingClientRect(); const c = e.closest('li, figure'); const cb = c && c !== e ? c.getBoundingClientRect() : null;
    const out = Math.max(0, scr(e) ? 0 : Math.max(b.right - innerWidth, -b.left), cb ? b.right - cb.right : 0); return [lab(e), Math.round(out * 10) / 10]; });
  const foot = roots.map(R => R.querySelector('footer.gf')).filter(Boolean).map(f => f.dataset.hps || '').pop() || '';
  return { font, T, RV, foot, n: { rv: RV.length, tag: all('.hps-tag').length, nw: all('.hps-new').length, tel: all('a[href^="tel:"], a[href^="mailto:"]').length, ft: all('footer.gf a').length, jn: all('.lhs-jn a').length },
    ov: document.documentElement.scrollWidth - innerWidth };
};

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}/`; const br = await chromium.launch();
  const seen = { rv: 0, tag: 0, nw: 0, tel: 0, ft: 0, jn: 0 }; const foots = new Set();
  const check = async (pg, name) => {
    await pg.goto('about:blank'); await pg.goto(base + 'learner.html?t=' + pg.__tid + '#home');
    await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 10000 }).catch(() => {});
    await pg.waitForTimeout(900); await H.settle(pg, 1500);
    const m = await pg.evaluate(MEASURE); Object.keys(seen).forEach(k => { seen[k] += m.n[k]; }); if (m.foot) foots.add(m.foot);
    m.font.forEach(([l, f]) => ok(f >= 13, `${name}: 글자 13px 이상 — ${l} ${f}px`));
    m.T.forEach(([k, l, w, h]) => ok(w >= 44 && h >= 44, `${name}: ${k} 누르는 칸 44px 이상 — ${l} ${w}×${h}`));
    m.RV.forEach(([l, o]) => ok(o <= 0.5, `${name}: 후기 가로 넘침 0 — ${l} ${o}px`));
    ok(m.ov <= 0, `${name}: 가로 넘침 0 (${m.ov}px)`);
    if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await pg.screenshot({ path: path.join(SHOT, `gate438_${name.replace(/[^\w-]+/g, '_')}.jpg`), fullPage: true, type: 'jpeg', quality: 60 }); }
    return m;
  };
  const errs = [];
  try {
    for (const [type, ids] of Object.entries(PLAN)) {
      const o = await H.mkOrg(br, base, type, errs, 'filled');
      /* 후기 넘침 재현: 띄어쓰기 없는 긴 글 · 긴 주소가 든 후기(실제 기관에서 흔함) */
      if (type === 'adult' || type === 'k12') { await o.op.evaluate(() => { const R = (S.posts || []).filter(p => p.board === '수강후기'); if (R[0]) R[0].body = '수업자료가정말꼼꼼하게정리되어있어서복습할때큰도움이되었고실무에바로적용할수있었습니다 ' + R[0].body; if (R[1]) R[1].body = '포트폴리오 https://example.com/portfolio/very-long-link-without-any-breaks-0123456789 ' + R[1].body; save(); smPublish(); }); await H.dismiss(o.op); }
      const pg = await o.ctx.newPage(); pg.__tid = o.tid; const perr = []; pg.on('pageerror', e => perr.push(e.message)); await pg.setViewportSize({ width: 390, height: 844 });
      for (const id of ids) { if (id !== '-') { const r = await H.applyTpl(o.op, id); if (r.err) { ok(false, `${type} ${id}: 템플릿 적용 ${r.err}`); continue; } } await check(pg, `${type} ${id}`); }
      /* 바닥글 8종: 성인 기관 한 곳에서 바닥글 종류만 바꿔 게시 */
      if (type === 'adult') for (const k of FOOTS) {
        await o.op.evaluate(k => { S.site.hps = Object.assign({}, S.site.hps, { foot: k }); save(); smPublish(); }, k); await H.dismiss(o.op);
        await check(pg, `adult foot-${k}`);
      }
      ok(!perr.length, `${type}: 학습자 화면 오류 없음 ${perr.slice(0, 2).join(' | ')}`);
      await o.ctx.close();
    }
    /* 점검이 실제로 부품을 봤는지(빈 통과 방지) */
    ok(seen.tag >= 8 && seen.nw >= 4, `공지 태그 · 새 글 배지를 측정함 (${seen.tag} · ${seen.nw})`);
    ok(seen.tel >= 20, `전화 · 메일 링크를 측정함 (${seen.tel})`);
    ok(seen.ft >= 40, `바닥글 링크를 측정함 (${seen.ft})`);
    ok(seen.rv >= 10, `후기 목록을 측정함 (${seen.rv})`);
    ok(seen.jn >= 3, `로그인 버튼을 측정함 (${seen.jn})`);
    ok(foots.size >= 6, `바닥글 종류 ${foots.size}종 렌더 (${[...foots].join(',')})`);
    ok(!errs.length, '스튜디오 오류 없음 ' + errs.slice(0, 2).join(' | '));
  } finally { await br.close(); srv.close(); }
  console.log(`hp-gate438: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
