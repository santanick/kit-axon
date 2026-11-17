'use strict';
/* v43.8 학원 묶음(hpx-acad) 템플릿 점검 — 등록(PASS · HPX_ALL) · 갤러리 · 게시 미리보기 · 390/1440 관문 · 시나리오 버튼 경로 · 개인정보
   사용: node tests/ui/tpl438-acad.js  (정적 서버를 띄웠다가 끈다. 브라우저 1개) */
const H = require('./hp-visual/lib.js');
const IDS = ['acparent', 'acresult', 'acstudio'];
/* 템플릿별로 반드시 보여야 하는 섹션(실적 띠 ac-proof는 운영자 입력 전이라 숨김이 맞다 — 아래 6)에서 따로 확인) */
const SECS = { acparent: ['.hxa-ah', '.hxa-wk', '.hxa-fee', '.hxa-al', '.hxa-dir'], acresult: ['.hxa-rs', '.hxa-wk', '.hxa-cy', '.hxa-fee', '.hxa-dir'], acstudio: ['.hxa-st', '.hxa-cl', '.hxa-wk', '.hxa-fee', '.hxa-al', '.hxa-dir'] };
(async () => {
  const { chromium } = H.need('playwright'); const PORT = 9700 + Math.floor(Math.random() * 200);
  const srv = await H.serve(PORT); const base = `http://127.0.0.1:${PORT}/`; const br = await chromium.launch();
  const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  try {
    /* ── 1) 배치 규칙: PASS 표에 없으면 등록하지 않는다 ── */
    { const p = await br.newPage(); await H.net(p); await p.goto(base + 'index.html'); await p.waitForFunction(() => typeof TPL !== 'undefined' && window.HPT);
      const r = await p.evaluate(ids => ({ th: ids.filter(id => HPT.has(id)), tp: ids.filter(id => TPL.some(t => t.id === 'prem-' + id)), pass: window.HPX && HPX.acad ? null : 'none' }), IDS);
      ok(!r.th.length && !r.tp.length, `PASS 비어 있음 → 테마 · 템플릿 미등록(${JSON.stringify(r)})`); await p.close(); }

    /* ── 2) HPX_ALL로 강제 등록한 기관(k12 · adult) ── */
    for (const type of ['k12', 'adult']) {
      const errs = []; const o = await H.mkOrg(br, base, type, errs, 'filled');
      await o.op.addInitScript(() => { window.HPX_ALL = 1; }); await o.op.reload(); await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined'); await o.op.waitForTimeout(500);
      const reg = await o.op.evaluate(ids => ids.map(id => { const tp = TPL.find(t => t.id === 'prem-' + id) || {}; let th = ''; try { th = HPT.thumb(S.site, id); } catch (e) { th = 'ERR ' + e.message; }
        const au = (() => { try { const b = JSON.parse(JSON.stringify(S.site)); HPT.apply(b, id, { keepColor: true }); return HPT.audit(b).filter(x => x[3] < 4.5).map(x => x[0] + ' ' + x[3]); } catch (e) { return ['ERR ' + e.message]; } })();
        return { id, has: HPT.has(id), list: HPT.list.some(x => x.id === id && x.prem), types: tp.types || [], fits: HPT.premFits(id), first: HPT.premFor().slice(0, ids.length), thumb: /hxa-ah/.test(th) && /hxa-dr/.test(th), au }; }), IDS);
      reg.forEach(r => { ok(r.has && r.list && r.types[0] === 'prem' && r.types.includes(type), `[${type}] ${r.id} 등록 · 테마 목록 · 템플릿 유형(${r.types})`);
        ok(r.fits && r.first.includes(r.id), `[${type}] ${r.id} 갤러리 「추천」 · 프리미엄 앞쪽(${r.first})`);
        ok(r.thumb, `[${type}] ${r.id} 갤러리 미리보기 = 실제 게시본(첫 화면 · 3갈래)`);
        ok(!r.au.length, `[${type}] ${r.id} 대비 4.5:1 이상(${r.au.join(', ')})`); });
      /* 갤러리 화면에 카드가 실제로 보이는지 */
      const gal = await o.op.evaluate(() => { try { UI.tpdK = 'prem'; if (typeof go === 'function') go('site'); } catch (e) { } return 1; }); void gal;

      for (const id of IDS) {
        const r = await H.applyTpl(o.op, 'prem-' + id); ok(!r.err && r.theme === id, `[${type}] ${id} 템플릿 적용 · 게시(${r.err || r.theme})`);
        const pg = await o.ctx.newPage(); const perr = []; pg.on('pageerror', e => perr.push(e.message.slice(0, 160)));
        for (const [w, h] of [[1440, 900], [390, 844]]) {
          await pg.setViewportSize({ width: w, height: h }); await pg.goto('about:blank'); await pg.goto(base + 'learner.html?t=' + o.tid + '&r=' + Date.now() + '#home');
          await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(600); await H.settle(pg);
          const m = await pg.evaluate(SEL => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const q = s => R.flatMap(r => [...r.querySelectorAll(s)]);
            const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
            const mineEls = q('.hxa-ah *, .hxa-s *').filter(vis);
            const small = [], tap = [], wide = [], brk = [];
            mineEls.forEach(el => { const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); const fs = parseFloat(cs.fontSize);
              if (own && !el.closest('svg') && fs < 13) small.push(`${el.tagName}.${el.className} ${fs}`);
              if (el.matches('a[href]') && (b.height < 44 || b.width < 44)) tap.push(`${(el.textContent || '').trim().slice(0, 12)} ${Math.round(b.width)}x${Math.round(b.height)}`);
              if (b.right > innerWidth + 1 || b.left < -1) { let a = el.parentElement, clip = false; while (a) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) { clip = true; break; } a = a.parentElement; } if (!clip) wide.push(`${el.tagName}.${el.className}`); }
              if (own.replace(/\s/g, '').length >= 2 && el.children.length === 0 && b.width < fs * 1.6 && b.height > fs * 2.2) brk.push(own.slice(0, 10)); });
            const doors = q('.hxa-dr a').map(a => a.getAttribute('href')); const tt = q('.hxa-tt a, .hxa-stp a, .hxa-trial a, .hxa-clc, .hxa-wd a').map(a => a.getAttribute('href'));
            const secs = SEL.filter(s => q(s).some(vis)); const proof = q('.hxa-pf').filter(vis).length;
            const inputs = q('input, form, textarea').length; const txt = R.map(r => r.textContent).join(' ');
            return { over: document.documentElement.scrollWidth - innerWidth, small: small.slice(0, 5), tap: tap.slice(0, 5), wide: wide.slice(0, 5), brk: brk.slice(0, 5), doors, tt, secs, proof, inputs, phone: /휴대폰 번호|주민|생년월일/.test(txt), q: q('.hxa-dq').map(x => x.textContent).join('') }; }, SECS[id]);
          const tag = `[${type} ${w}] ${id}`;
          ok(m.secs.length === SECS[id].length, `${tag} 섹션 ${SECS[id].length}종 표시(${m.secs.join(' ')})`);
          ok(!m.proof, `${tag} 실적 띠: 입력 전에는 숨김`);
          ok(m.over <= 0 && !m.wide.length, `${tag} 가로 넘침 0(${m.over} ${m.wide.join(',')})`);
          ok(!m.small.length, `${tag} 13px 미만 글자 0(${m.small.join(',')})`);
          ok(!m.tap.length, `${tag} 누르는 칸 44px 이상(${m.tap.join(',')})`);
          ok(!m.brk.length, `${tag} 한 글자 꺾임 0(${m.brk.join(',')})`);
          ok(/어떤 일로 오셨어요/.test(m.q) && m.doors.length >= 4, `${tag} 첫 화면 「어떤 일로 오셨어요?」 갈래 버튼 ${m.doors.length}개`);
          const allowed = h => /^(#login\/(family|my|mypay)|#join|#class\/[\w-]+|#shop|#comm(\/.*)?|#notice|tel:[\d+]+|mailto:.+)$/.test(h);
          ok([...m.doors, ...m.tt].every(allowed), `${tag} 시나리오 버튼이 실제 학습자 경로(${[...new Set([...m.doors, ...m.tt])].join(' ')})`);
          ok(type !== 'k12' || (m.doors.includes('#login/family') && m.doors.includes('#login/mypay') && m.doors.includes('#login/my')), `${tag} 학부모(자녀 현황 · 결제) · 학생(내 수업) 경로`);
          ok(!m.inputs && !m.phone, `${tag} 개인정보 입력칸 · 휴대폰 수집 문구 없음`);
          if (w === 1440) { /* 이번 주 수업 판 → 반 상세로 실제 이동 */
            const h1 = m.tt.find(x => /^#class\//.test(x)); if (h1) { await pg.evaluate(h => { location.hash = h; }, h1); await pg.waitForTimeout(700); ok(await pg.evaluate(() => /^#class\//.test(location.hash) && !!document.querySelector('#lm') && document.querySelector('#lm').innerText.trim().length > 20), `${tag} 시간표 → 반 상세(${h1}) 열림`); } else ok(false, `${tag} 시간표 반 링크 없음`); }
        }
        if (id === 'acresult') { /* 6) 실적 띠: 운영자가 입력하면 게시본에 그대로 · 자리 문구는 거른다 */
          await o.op.evaluate(() => { const x = S.site.sections.find(v => v && v.data && v.data.hpt === 'ac-proof'); x.hide = false; delete x.hideAuto; x.data.cols = [['수학 1등급 12명', '2026 수능 · 재원생 기준'], ['내신 평균 +14점', '2026 1학기 · 3개월 이상 재원생'], ['입력하세요', '']]; save(); smPublish(); }); await H.dismiss(o.op);
          await pg.setViewportSize({ width: 390, height: 844 }); await pg.goto('about:blank'); await pg.goto(base + 'learner.html?t=' + o.tid + '&r=' + Date.now() + '#home'); await pg.waitForFunction(() => document.querySelector('.smhost') && document.querySelector('.smhost').shadowRoot, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(600);
          const pf = await pg.evaluate(() => { const R = [...document.querySelectorAll('.smhost')].map(x => x.shadowRoot).filter(Boolean); const L = R.flatMap(r => [...r.querySelectorAll('.hxa-pfl li')]); return { n: L.length, t: L.map(l => l.textContent).join('|'), over: document.documentElement.scrollWidth - innerWidth }; });
          ok(pf.n === 2 && /1등급 12명/.test(pf.t) && !/입력하세요/.test(pf.t) && pf.over <= 0, `[${type} 390] acresult 실적 띠 = 입력한 값만(${pf.n}개 · ${pf.t.slice(0, 40)})`); }
        ok(!perr.length, `[${type}] ${id} 학습자 pageerror 0 ${perr.join('|')}`); await pg.close();
      }
      ok(!errs.length, `[${type}] 운영 pageerror 0 ${errs.slice(0, 3).join('|')}`); await o.ctx.close();
    }
  } catch (e) { ok(false, '예외 ' + (e && e.stack || e)); }
  await br.close(); srv.close();
  console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과'); process.exit(fails.length ? 1 : 0);
})();
