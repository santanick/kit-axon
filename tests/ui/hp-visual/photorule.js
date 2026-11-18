'use strict';
/* v44.1 FIX3 B: 「규칙이 있는 강좌 카드는 규칙 사진만」 — 유형의 g44 템플릿 전부, 강좌 사진을 쓰는 모든 레이아웃(카드 · 갤러리 · 사진 띠 · 가로 넘김 · 목록 썸네일).
   방법: 스튜디오에서 siteFromTpl → siteHTML로 그린 HTML을 읽어, 강좌 사진(img)마다 그 강좌(data-slot="cls-<id>" 또는 가까운 조상 안의 유일한 강좌 링크 #p-c-<id> · #class/<id>)를 찾고,
   HPSTOCK.courseRule(강좌 이름)이 있으면 그 규칙 사진인지 확인한다. 첫 화면 · 슬롯 사진(data-slot이 cls-가 아닌 것)은 뺀다.
   두 번 본다: demo = 기관 강좌 이름 그대로(독립 검수 방식), qa = 템플릿의 qaCls 이름.
   사용: await require('./hp-visual/photorule.js')(browser, base, 'adult', ok, '[adult]') */
const H = require('./lib.js');
module.exports = async function photoRule(br, base, type, ok, tag) {
  const errs = []; const o = await H.mkOrg(br, base, type, errs, 'filled');
  try {
    await o.op.waitForFunction(() => window.S && S.org && typeof TPL !== 'undefined' && window.G44PH && window.HPSTOCK, null, { timeout: 15000 }); await o.op.waitForTimeout(400); try { await H.dismiss(o.op); } catch (e) { }
    for (const mode of ['demo', 'qa']) {
      const R = await o.op.evaluate(([ty, mode]) => {
        const T = TPL.filter(t => t.g44 === 1 && (t.types || []).includes(ty)); const C0 = (S.classes || []).map(c => c.name); const out = [];
        const cidOf = h => { const m = String(h || '').match(/^#(?:p-c-|class\/)([\w-]+)/); return m ? m[1] : null; };
        for (const tp of T) {
          (S.classes || []).forEach((c, i) => { c.name = mode === 'qa' && Array.isArray(tp.qaCls) && tp.qaCls.length >= S.classes.length ? tp.qaCls[i] : C0[i]; });
          let h = ''; try { h = siteHTML(siteFromTpl(tp), false, 'ko'); } catch (e) { out.push({ id: tp.id, err: e.message, n: 0, ruled: 0, bad: [] }); continue; }
          const doc = new DOMParser().parseFromString(h, 'text/html'); const C = Object.fromEntries((S.classes || []).map(c => [c.id, c])); const bad = []; let n = 0, ruled = 0;
          doc.querySelectorAll('img').forEach(img => {
            const k = G44PH.key(img.getAttribute('src')); if (!/^[a-z]{3}-\d{2}$/.test(k)) return;
            if (img.closest('.hp-hero, .hps-hero, [data-hero]')) return;
            let cid = null; const fs = img.closest('[data-slot]'); if (fs) { const sl = fs.getAttribute('data-slot') || ''; if (!/^cls-/.test(sl)) return; cid = sl.slice(4); }
            for (let el = img, i = 0; !cid && el && i < 4; i++, el = el.parentElement) { const L = new Set(); if (el.matches && el.matches('a[href]')) { const c = cidOf(el.getAttribute('href')); if (c) L.add(c); }
              el.querySelectorAll('a[href]').forEach(a => { const c = cidOf(a.getAttribute('href')); if (c) L.add(c); }); if (L.size === 1) cid = [...L][0]; else if (L.size > 1) break; }
            if (!cid || !C[cid]) return; n++; const r = G44PH.rule(C[cid].name); if (!r) return; ruled++; if (!r.ids.includes(k)) bad.push(`${C[cid].name}→${k}`); });
          out.push({ id: tp.id, n, ruled, bad });
        }
        (S.classes || []).forEach((c, i) => { c.name = C0[i]; }); return out; }, [type, mode]);
      R.forEach(r => ok(!r.err && !r.bad.length, `${tag} [사진 규칙 · ${mode}] ${r.id} 규칙이 있는 강좌 사진은 규칙 사진만(규칙 ${r.ruled} / 강좌 사진 ${r.n}${r.err ? ' 오류 ' + r.err : ''} ${r.bad.slice(0, 4).join(', ')})`));
      ok(R.length >= 1, `${tag} [사진 규칙 · ${mode}] 템플릿 ${R.length}종 점검`);
    }
  } finally { await o.ctx.close(); }
};
