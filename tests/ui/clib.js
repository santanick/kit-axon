'use strict';
/* v35 콘텐츠 라이브러리(clib) 검증(C7).
   ① 전 유형(7) 라이브러리 메뉴 기본 노출(새 기관 · 기존 저장 사용자 upgradeState) · 사이드바에 보임 · 렌더 오류 0 · 390 넘침 0
   ② 만들기(CT.kinds 중 'lib' 제외) 각각 라이브러리에서 열어 결과 저장(S.clib · CLIB.all)
   ③ [과정에 넣기] → 과정 curriculum에 항목 · usedIn · CLIB.use
   ④ 기존 library(S.lib) · dbook(S.lsite.dbooks) 데이터 보존 · 기존 메뉴 링크(go('library') · go('dbook')) 유지
   사용: node tests/ui/clib.js   (CRS_ONLY=adult,voc 로 일부 유형) */
const path = require('node:path'); const fs = require('node:fs');
const { chromium } = require('playwright');
const F = require('./crs-flow.js');
const MAKE = ['upload', 'doc', 'aivideo', 'quiz', 'assign', 'book', 'youtube'];

async function openLib(p, C) { /* 사이드바(레일 → 라이브러리) 실제 클릭 */
  const direct = p.locator('[data-act=go][data-v=clib]').filter({ visible: true }).first();
  if (await direct.count()) { await C.clk(direct, '라이브러리'); return true; }
  const rail = p.locator('[data-act=go][data-v=learn]').filter({ visible: true }).first(); if (await rail.count()) await C.clk(rail, '레일');
  const tab = p.locator('[data-act=go][data-v=clib], [data-v=clib]').filter({ visible: true }).first(); if (await tab.count()) { await C.clk(tab, '라이브러리 탭'); return true; }
  const byTxt = p.locator('a, button').filter({ visible: true }).filter({ hasText: /^\s*(콘텐츠 )?라이브러리\s*$/ }).first(); if (await byTxt.count()) { await C.clk(byTxt, '라이브러리(문구)'); return true; }
  return false; }

/* 라이브러리 안에서 kind 하나 만들기: 카드 [data-ct=kind] → 결과 확인 버튼 몇 번 */
async function makeOne(p, kind, log) { const n0 = await p.evaluate(() => (S.clib || []).length); let clicks = 0;
  let card = p.locator(`#main .ct-kind[data-k=${kind}], #main [data-ct=${kind}], #main [data-kind=${kind}]`).filter({ visible: true }).first();
  if (!(await card.count())) { const mk = F.btnByText(p, /^\s*\+?\s*(만들기|새로 만들기|콘텐츠 만들기)/, '#main').first(); if (await mk.count()) { await mk.click(); clicks++; await p.waitForTimeout(300); } card = p.locator(`.ct-kind[data-k=${kind}], [data-ct=${kind}], [data-kind=${kind}]`).filter({ visible: true }).first(); }
  if (!(await card.count())) { log.push(`${kind}: 카드 없음 → CT.open 직접`); const ok = await p.evaluate(k => { if (!window.CT) return false; CT.open(k, { from: 'lib', onDone() { } }); return true; }, kind); if (!ok) return { err: 'CT 없음' }; }
  else { await card.click(); clicks++; }
  await p.waitForTimeout(500);
  if (kind === 'upload') { const fi = p.locator('input[type=file]').first(); if (await fi.count()) await fi.setInputFiles({ name: '1차시 강의자료.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') }); else log.push('upload: 파일 칸 없음'); await p.waitForTimeout(1200); }
  if (kind === 'youtube') { const u = p.locator('input[type=url]:visible, input[name*=url]:visible, input[placeholder*=youtu]:visible').first(); const any = (await u.count()) ? u : p.locator('.ct-sh input:visible').first(); if (await any.count()) await any.fill('https://youtu.be/dQw4w9WgXcQ'); else log.push('youtube: 주소 칸 없음'); }
  const topic = p.locator('.ct-sh input[type=text]:visible, .ct-sh textarea:visible').first(); if (!['youtube', 'upload'].includes(kind) && await topic.count() && !(await topic.inputValue())) await topic.fill('엑셀 함수 기초');
  for (let k = 0; k < 5; k++) { if ((await p.evaluate(() => (S.clib || []).length)) > n0) break;
    const ok = p.locator('.ct-sh .ct-pri').filter({ visible: true }).last(); if (!(await ok.count()) || await ok.isDisabled()) { log.push(`${kind}: 확인 버튼 없음/꺼짐`); break; } await ok.click({ timeout: 4000 }).catch(() => {}); clicks++; await p.waitForTimeout(1100); }
  const r = await p.evaluate(([n0, kind]) => { const L = S.clib || []; const x = L.length > n0 ? L[0].at >= (L[L.length - 1].at || '') ? L[0] : L[L.length - 1] : null; const all = window.CLIB ? CLIB.all() : []; return { n: L.length - n0, rec: x && { id: x.id, kind: x.kind, title: x.title, has: !!(x.url || x.fileId || x.doc || x.ai || (x.qs || []).length || x.book || x.src) }, inAll: x ? all.some(y => y.id === x.id) : false }; }, [n0, kind]);
  await p.evaluate(() => { try { closeModal(); } catch (e) { } document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  return { ...r, clicks }; }

(async () => {
  const only = (process.env.CRS_ONLY || '').split(',').filter(Boolean); const shots = process.env.CRS_SHOTS || ''; if (shots) fs.mkdirSync(shots, { recursive: true });
  const { srv, base } = await F.serve(); const br = await chromium.launch(); let FAIL = 0; const kindRes = {};
  const cases = F.TYPES.filter(([t, e]) => !only.length || only.includes(t));
  for (const tc of cases) { const [type, ed] = tc; const label = ed ? `${type}/${ed}` : type;
    for (const empty of [false, true]) { const errs = [], P = [], W = [], log = [];
      const { ctx, p } = await F.openOrg(br, base, tc, { empty, errs }); const C = F.clicker(p, log);
      try {
        const pre = await p.evaluate(() => ({ lib: JSON.stringify(S.lib || []), books: JSON.stringify(((S.lsite || {}).dbooks || []).map(b => ({ id: b.id, title: b.title }))) }));
        const m = await p.evaluate(() => ({ menu: !!MENU.clib, on: typeof menuOn === 'function' && menuOn('clib'), CT: !!window.CT, CLIB: !!window.CLIB, kinds: window.CT && CT.kinds ? CT.kinds.map(k => k.id || k.kind || k.k) : [] }));
        if (!m.menu) P.push('MENU.clib 없음'); else if (!m.on) P.push('라이브러리 메뉴 기본 꺼짐');
        if (!m.CLIB) P.push('window.CLIB 없음'); if (!m.CT) P.push('window.CT 없음');
        /* 기존 저장 사용자: clib 탭이 없는 상태로 저장 → 새로고침 → upgradeState가 켬 */
        if (m.menu) { await p.evaluate(() => { Object.keys(S.nav.tabs).forEach(w => { S.nav.tabs[w] = (S.nav.tabs[w] || []).filter(x => x.id !== 'clib'); }); delete S.clib; save(); }); await p.reload(); await p.waitForFunction(() => window.S && S.org); await p.waitForTimeout(700);
          if (!(await p.evaluate(() => menuOn('clib')))) P.push('기존 저장 사용자(upgradeState)에서 라이브러리 꺼짐'); }
        const opened = await openLib(p, C); if (!opened) P.push('사이드바에서 라이브러리 찾기 실패'); await p.waitForTimeout(400);
        const v = await p.evaluate(() => ({ cur: CUR.tab, warn: /화면을 표시하는 중 문제가 생겼습니다/.test(document.querySelector('#main')?.innerText || ''), text: (document.querySelector('#main')?.innerText || '').slice(0, 2000) }));
        if (opened && v.cur !== 'clib') P.push('라이브러리 화면 아님 CUR.tab=' + v.cur); if (v.warn) P.push('라이브러리 렌더 오류');
        if (shots) await p.screenshot({ path: path.join(shots, `clib_${type}_${empty ? 'e' : 'f'}_pc.png`) });
        const ms = await F.measure(p, '#main'); if (ms.over > 0) P.push(`PC 가로 넘침 ${ms.over}`); if (ms.jargon.length) W.push('어려운 말 ' + ms.jargon.join(','));
        /* 기존 데이터 보존 */
        const post = await p.evaluate(() => ({ lib: JSON.stringify(S.lib || []), books: JSON.stringify(((S.lsite || {}).dbooks || []).map(b => ({ id: b.id, title: b.title }))), all: window.CLIB ? CLIB.all().map(x => x.id) : [], libIds: (S.lib || []).map(l => l.id), bkIds: ((S.lsite || {}).dbooks || []).map(b => b.id) }));
        if (post.lib !== pre.lib) P.push('S.lib(영상 · 자료)가 바뀜'); if (post.books !== pre.books) P.push('디지털북 목록이 바뀜');
        if (m.CLIB) { const miss = [...post.libIds, ...post.bkIds].filter(id => !post.all.includes(id) && !post.all.some(a => String(a).endsWith(id))); if (miss.length) P.push(`CLIB.all()에 기존 자료 ${miss.length}개 안 보임(${miss.slice(0, 3).join(',')})`); }
        for (const old of ['library', 'dbook']) { const ok = await p.evaluate(id => { try { go(id); render(); return !/화면을 표시하는 중 문제가 생겼습니다/.test(document.querySelector('#main').innerText) && document.querySelector('#main').innerText.length > 30; } catch (e) { return false; } }, old); if (!ok) P.push(`기존 메뉴 링크 go('${old}') 깨짐`); }
        /* 만들기(채운 기관 · 전 유형, 빈 기관은 adult만 전 종류) */
        if (m.CT && (!empty || type === 'adult')) { await p.evaluate(() => { go('clib'); render(); });
          const kinds = (m.kinds.length ? m.kinds : MAKE).filter(k => k !== 'lib');
          if (kinds.length < 6) P.push(`만들기 종류 ${kinds.length}개(<6): ${kinds.join(',')}`);
          for (const k of kinds) { await p.evaluate(() => { go('clib'); render(); }); const r = await makeOne(p, k, log); kindRes[k] = kindRes[k] || []; kindRes[k].push(r.n > 0 ? r.clicks : 'X');
            if (r.err) P.push(`${k}: ${r.err}`); else if (r.n <= 0) P.push(`${k}: 결과가 S.clib에 저장 안 됨`); else { if (!r.inAll) P.push(`${k}: CLIB.all()에 없음`); if (!r.rec.has) W.push(`${k}: 저장본에 내용(url · doc · ai · qs · book) 없음`); if (r.clicks > 4) W.push(`${k}: 클릭 ${r.clicks}회(>3)`); } }
          /* [과정에 넣기] */
          const put = await p.evaluate(async () => { const rec = (S.clib || [])[0]; if (!rec) return { err: '라이브러리 항목 없음' }; if (!S.classes.length) return { skip: 1 }; go('clib'); render(); return { id: rec.id, cls: S.classes[0].id, n0: (S.classes[0].curriculum || []).length }; });
          if (put.id) { const b = p.locator(`#main [data-v="${put.id}"]`).filter({ hasText: /과정에 넣기|넣기/ }).first(); const any = (await b.count()) ? b : F.btnByText(p, /과정에 넣기/, '#main').first();
            if (!(await any.count())) P.push('[과정에 넣기] 버튼 없음'); else { await any.click(); await p.waitForTimeout(400);
              const pickC = p.locator('#modal, [role=dialog]').locator(`[value="${put.cls}"], [data-v="${put.cls}"]`).first(); if (await pickC.count()) { await pickC.click().catch(() => {}); } else { const opt = p.locator('#modal select').first(); if (await opt.count()) await opt.selectOption(put.cls).catch(() => {}); }
              for (let k = 0; k < 3; k++) { const ok = F.btnByText(p, /^\s*(넣기|과정에 넣기|이 차시에 넣기|확인|저장|완료)/, '#modal').last(); if (!(await ok.count())) break; await ok.click().catch(() => {}); await p.waitForTimeout(500); }
              const res = await p.evaluate(put => { const c = S.classes.find(x => x.id === put.cls); const any = S.classes.find(x => (S.clib.find(r => r.id === put.id).usedIn || []).includes(x.id)); const rec = S.clib.find(r => r.id === put.id); const use = window.CLIB && CLIB.use ? CLIB.use(rec) : null;
                return { grew: (c.curriculum || []).length > put.n0 || !!any, usedIn: (rec.usedIn || []).length, use: use ? JSON.stringify(use).slice(0, 80) : '' }; }, put);
              if (!res.grew) P.push('[과정에 넣기] 뒤 과정에 항목이 안 늘어남'); if (!res.usedIn) P.push('usedIn 갱신 안 됨'); if (!res.use || res.use === '[]') W.push('CLIB.use() 사용처 비어 있음'); } }
          else if (put.err) P.push(put.err);
          /* 저장 → 새로고침 → 유지 */
          const n1 = await p.evaluate(() => (S.clib || []).length); await p.reload(); await p.waitForFunction(() => window.S && S.org); await p.waitForTimeout(500); const n2 = await p.evaluate(() => (S.clib || []).length); if (n2 !== n1) P.push(`새로고침 뒤 S.clib ${n1}→${n2}`);
        }
        /* 휴대폰 */
        await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { go('clib'); render(); }); await p.waitForTimeout(400); const mm = await F.measure(p, '#main'); if (mm.over > 0) P.push(`390 가로 넘침 ${mm.over}`); if (mm.cut.length) P.push('390 잘림 ' + mm.cut.join(' '));
        if (shots) await p.screenshot({ path: path.join(shots, `clib_${type}_${empty ? 'e' : 'f'}_m.png`) });
      } catch (e) { P.push('예외 ' + e.message.split('\n')[0]); }
      if (errs.length) P.push('pageerror ' + [...new Set(errs)].slice(0, 3).join(' / ')); await ctx.close();
      console.log(`${P.length ? '✗' : '✓'} ${label} ${empty ? '빈' : '채움'}`); P.forEach(x => console.log('   ✗ ' + x)); W.forEach(x => console.log('   △ ' + x)); if (P.length) FAIL++; }
  }
  console.log('만들기 종류별 클릭 수(X=저장 실패):', JSON.stringify(kindRes));
  await br.close(); srv.close(); console.log(FAIL ? `✗ clib 실패 ${FAIL}` : '✓ clib 통과'); process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
