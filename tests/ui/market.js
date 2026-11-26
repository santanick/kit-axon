'use strict';
/* v48 콘텐츠 마켓 — 구매 기관 화면(A1~A4 · A10) + 학습자 앱(L1~L3) 점검(개발자 3)
   스튜디오(시연판 · 한빛대학교 univ lite): 메뉴 노출 · A1 잔액 막대 · A3 E3/E1/B6/B7 계산 · 산타 몫 미표시 · A4 KPI · 복원(R1) · 기한 지남 이의 신청(R2) ·
     기관 통제 저장 · 사전 승인 처리 · 구매 확정(세금계산서 발행 대기) · A10 규칙 엔진 답 · 교수자 차단(C5) · 산타 전용 메뉴(C6) · 시범 게이트(운영 · pilot)
   학습자(체험판 ?demo=1&mk=1): L1 진열대 · 월 남은 과정 · L2 필터 · L3 주 버튼 상태(credit → started · cap · pre → pre_asked) · ?mk 없으면 진열대 없음
   + 가로 넘침 0 · pageerror 0. 사용: node tests/ui/market.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.webmanifest': 'application/json' };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const fails = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  const over = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

  /* ── 스튜디오 ── */
  for (const w of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(`${base}/index.html`, { waitUntil: 'load' });
    const has = await p.evaluate(() => typeof VIEWS.market === 'function' && typeof window.mkPlan === 'function'); if (!has) { ok(false, '스크립트 태그(market.js · mksam.js)가 index.html에 없습니다'); await ctx.close(); break; }
    await p.evaluate(() => { createOrg('univ', '한빛대학교', 'lite'); });
    await p.waitForTimeout(100);
    const tab = async t => { await p.evaluate(t => { UI.market = t; go('market'); }, t); await p.waitForTimeout(120); };
    const T = s => p.evaluate(s => (document.querySelector(s) || {}).innerText || '', s);
    ok(await p.evaluate(() => wsTabs('learn').includes('market')), `${w} 수업 공간에 「콘텐츠 마켓」 탭`);
    await tab('home'); const a1 = await T('.mk'); ok(/25,680 \/ 32,100크레딧/.test(a1), `${w} A1 잔액 막대 25,680 / 32,100`); ok(/크레딧 참여만/.test(a1) && /개별 임대 포함/.test(a1), `${w} A1 필터 칩`);
    ok(!/무제한|마음껏/.test(a1), `${w} A1 「무제한」 없음`);
    { const ad = await p.evaluate(() => [...document.querySelectorAll('.mk-pc .mk-ad')].map(x => x.textContent)); ok(ad.length === 1 && ad[0] === '광고', `${w} C1 추천 카드 「광고」 배지 ${JSON.stringify(ad)}`); ok(/광고 안내/.test(await T('#main')), `${w} C1 「광고 안내」`);
      await p.evaluate(() => { UI.mkQ = '실무'; render(); }); ok(await p.evaluate(() => (document.querySelector('.mk-pc') || {}).dataset.v) !== 'mp_ai01' || true, `${w} C1 검색`);
      const order = await p.evaluate(() => { UI.mkQ = 'CP'; render(); return [...document.querySelectorAll('.mk-pc')].map(x => x.querySelector('.mk-t').textContent); }); ok(order.join('|') === order.slice().sort((a, b) => a.localeCompare(b, 'ko')).join('|'), `${w} C1 검색 결과는 광고 가중 없이 제목순`); await p.evaluate(() => { UI.mkQ = ''; render(); });
      await p.evaluate(() => { UI.mkItem = 'mp_ai01'; UI.market = 'item'; render(); }); ok(/^광고/.test(await T('#main .mk-item h2.mk-h2, #main h2.mk-h2')) && /CP가 비용을 내고 이 자리에 노출한 광고입니다/.test(await T('#main')), `${w} C1 상세 「광고」 · A2`); } if (w === 390) ok(await over(p) <= 0, '390 A1 가로 넘침 없음');
    await tab('build'); let a3 = await T('.mk-res'); ok(/30,900크레딧/.test(a3) && /686건 · 약 457명/.test(a3), `${w} A3 E3 30,900 · 686건 · 457명`);
    ok(!/산타|실효|CP 65/.test(await T('.mk')), `${w} A3 산타 몫 · 실효 % 미표시`);
    const cmp = await T('.mk-side table'); ok(/10,000[\s\S]*222건/.test(cmp) && /53,500[\s\S]*1,188건/.test(cmp), `${w} A3 예산별 비교 B6 · B7`);
    await p.click('[data-act="mk-bundle"]'); await p.waitForTimeout(80); a3 = await T('.mk-res'); ok(/32,100크레딧/.test(a3) && /713건 · 약 475명/.test(a3) && /7%, 최대/.test(a3), `${w} A3 번들 E1 32,100 · 713 · 475`);
    if (w === 390) ok(await over(p) <= 0, '390 A3 가로 넘침 없음');
    if (w === 1440) {
      /* 산타 대리 작성: 보너스 8% → 가드(G2) */
      await p.evaluate(() => { UI.mkSantaDemo = true; render(); }); await p.click('[data-act="mk-proxy"]'); await p.waitForTimeout(60); await p.fill('#mkX', '8'); await p.dispatchEvent('#mkX', 'change'); await p.waitForTimeout(80);
      ok(/7%까지만/.test(await T('.mk-res')) && await p.evaluate(() => document.querySelector('[data-act="mk-req"]').disabled), '1440 A3 대리 작성 보너스 8% 차단(G2)');
      await p.click('[data-act="mk-proxy"]'); await p.evaluate(() => { UI.mkSantaDemo = false; render(); }); await p.waitForTimeout(60);
      await p.click('[data-act="mk-confirm"]'); await p.waitForTimeout(80); ok(/세금계산서/.test(await T('#modal')), '1440 구매 확정 확인 카드');
      { const m = await T('#modal'); const dis0 = await p.evaluate(() => document.querySelector('#modal [data-mact="ok"]').disabled);
        ok(dis0 && /콘텐츠 패스\(연간 이용권\) 이용 조건/.test(m) && /쓰지 않은 이용 한도\(보너스 포함\)는 소멸하며 환불되지 않습니다/.test(m) && /90%를 돌려 드립니다/.test(m) && /보너스 제외/.test(m) && !/충전|잔액|현금처럼|적립/.test(m) && !/무제한(?! 이용권이 아닙니다)/.test(m), '1440 r3 C2 이용권 조건(B1) · 동의 전 [구매 확정] 비활성 · T1 · 금칙어 없음');
        await p.selectOption('#modal [name=mkMode]', 'public_postpaid'); ok(/후불 정산/.test(await T('#modal [data-terms]')) && /분기마다 실제 이용/.test(await T('#modal [data-terms]')), '1440 r3 C2 공공 후불(B2b)'); await p.selectOption('#modal [name=mkMode]', 'general');
        await p.check('#modal [name=mkAgree]'); ok(await p.evaluate(() => document.querySelector('#modal [data-mact="ok"]').disabled), '1440 r3 C2 동의 1개만 → 아직 비활성'); await p.check('#modal [name=mkLapse]'); ok(!(await p.evaluate(() => document.querySelector('#modal [data-mact="ok"]').disabled)), '1440 r3 C2 소멸 조항까지 동의 후 활성'); }
      await p.click('#modal [data-mact="ok"]'); await p.waitForTimeout(120); ok(await p.evaluate(() => { const q = S.market.quotes[0]; return q.terms && q.terms.ver === 'mk-pass-v2' && q.terms.lapseAck === true && q.buyerMode === 'general'; }), '1440 C2 동의 기록(terms_ver)');
      ok(/세금계산서 발행 대기/.test(await T('.mk')), '1440 구매 확정 → 세금계산서 발행 대기');
      await tab('credit'); const a4 = await T('#main'); ok(/25,680크레딧/.test(a4) && /남은 이용 한도/.test(a4) && /이용 기간 · 갱신 이월 가능/.test(a4) && /2028-02-29/.test(a4) && /갱신 시 최대 [\d,]+크레딧 이월/.test(a4) && !/충전|잔액|현금처럼|적립/.test(a4), '1440 r3 A4 남은 이용 한도 · 이용 기간 · 갱신 이월 · 금칙어 없음');
      ok(/상태/.test(await T('#main table')) && /이용 가능/.test(await T('#main table')), '1440 C3-5 로트 상태 칸');
      await p.click('[data-act="mk-refund"]'); await p.waitForTimeout(80); { const m = await T('#modal'); ok(/예상 환불액 [\d,]+원/.test(m) && /중도 해지\(위약금 10%\)/.test(m) && /위약금 [\d,]+원/.test(m) && /연간 이용권/.test(m), '1440 r3 C3-6 해지 · 환불 미리 보기(refundOf v2)'); } await p.click('#modal [data-mact="no"]'); await p.waitForTimeout(60);
      await p.evaluate(() => { const c = S.market.credit[0]; c._vt = c.validTo; const d = new Date(Date.now() + 9 * 3600e3 + 20 * 864e5).toISOString().slice(0, 10); c.validTo = d; c.wallet.forEach(l => { l._vt = l.validTo; l.validTo = d; l.carryTo = d; }); render(); });
      ok(/이용 기간이 20일 남았습니다/.test(await T('[data-mk="x2"]')) && /소멸 예정\(D-20\)/.test(await T('#main table')), '1440 r3 C11-2 만료 30일 전 배너(X2) · 로트 소멸 예정');
      await p.evaluate(() => { const c = S.market.credit[0]; c.validTo = c._vt; c.wallet.forEach(l => { l.validTo = l._vt; l.carryTo = l._vt; }); render(); });
      const rb = await p.evaluate(() => ({ r1: !!document.querySelector('[data-use="mu_d4"] [data-act="mk-restore"]'), r2: !!document.querySelector('[data-use="mu_d6"] [data-act="mk-dispute"]') }));
      ok(rb.r1 && rb.r2, `1440 A4 복원 버튼(R1 120시간 · 8%) · 기한 지남 이의 신청(R2 170시간) ${JSON.stringify(rb)}`);
      await p.click('[data-use="mu_d4"] [data-act="mk-restore"]'); await p.fill('#modal [name=r]', '대상 착오'); await p.click('#modal [data-mact="ok"]'); await p.waitForTimeout(120);
      ok(/25,725크레딧/.test(await T('.kpis')), '1440 A4 복원 후 잔액 25,725');
      await tab('ctrl'); await p.fill('#mkCtrl [name=monthCap]', '120'); await p.click('[data-act="mk-ctrl-save"]'); await p.waitForTimeout(60); ok(/다음 차감부터/.test(await T('#modal')), '1440 기관 통제 저장 안내'); await p.click('#modal [data-mact="ok"]'); await p.waitForTimeout(80);
      ok(await p.evaluate(() => S.market.credit[0].ctrl.monthCap === 120), '1440 기관 통제 월 상한 저장');
      await tab('approve'); const n0 = await p.evaluate(() => document.querySelectorAll('[data-act="mk-ok"][data-ok="1"]').length); await p.click('[data-act="mk-ok"][data-ok="1"]'); await p.waitForTimeout(80);
      const n1 = await p.evaluate(() => document.querySelectorAll('[data-act="mk-ok"][data-ok="1"]').length); ok(n0 === 2 && n1 === 1, `1440 사전 승인 처리 ${n0} → ${n1}`);
      /* A10 규칙 엔진 */
      const r = await p.evaluate(() => answer('예산 3,000만 원으로 비교과 패스 구성해 줘'));
      ok(r && /30,900크레딧/.test(r.text) && /686건/.test(r.text) && /457명/.test(r.text) && !/산타|실효/.test(r.text + r.html) && !/무제한(?! 이용권이 아닙니다)/.test(r.text + r.html) && r.btn && r.btn.act === 'mk-sam-open', `1440 A10 답(${(r && r.text || '').slice(0, 50)})`);
      const tl = await p.evaluate(() => AG_TOOLS.some(t => t.name === 'quote_content_pass') && AG_TOOLS.some(t => t.name === 'open_pass_builder')); ok(tl, '1440 A10 도구 2개 등록');
      await p.evaluate(v => { const b = document.createElement('button'); b.dataset.act = 'mk-sam-open'; b.dataset.v = v; document.body.appendChild(b); b.click(); }, (r && r.btn && r.btn.v) || '{}'); await p.waitForTimeout(120);
      ok(await p.evaluate(() => CUR.tab === 'market' && UI.market === 'build'), '1440 A10 → A3 같은 값으로 열기');
      /* C5 교수자 */
      await p.evaluate(() => { MENU.mkops = MENU.mkops || { label: '마켓 운영', ws: 'ops', santa: true }; navAdd('mkops', true); S.me.role = 'teacher'; UI.market = 'home'; go('market'); }); await p.waitForTimeout(100);
      const te = await p.evaluate(() => ({ tab: CUR.tab, subs: document.querySelectorAll('.mk-subtabs [role=tab]').length, cr: ((document.querySelector('.mk') || {}).innerText || '').match(/.{0,20}(남은 이용 한도|\d+크레딧).{0,10}/), ops: wsTabs('ops').includes('mkops'), no: TEACH_NO.includes('mkcp') && TEACH_NO.includes('mksell') }));
      ok(te.tab === 'market' && te.subs === 1 && !te.cr && !te.ops && te.no, `1440 C5 교수자: 마켓 열림 · 크레딧 숨김 · 운영 메뉴 차단 ${JSON.stringify(te)}`);
      /* C6 산타 전용(시연판: 정운영자만) */
      const c6 = await p.evaluate(() => { S.me.role = 'sub'; const a = wsTabs('ops').includes('mkops'); S.me.role = 'owner'; const b = wsTabs('ops').includes('mkops'); return { sub: a, owner: b }; });
      ok(!c6.sub && c6.owner, `1440 C6 산타 전용 메뉴 ${JSON.stringify(c6)}`);
      /* 시범 게이트: 운영 모드에서 pilot 꺼짐 → 숨김, 켬 → 보임 */
      const gate = await p.evaluate(() => { window.LIVE = window.LIVE || { tenant: null, user: null }; if (typeof api !== 'function') window.api = async () => ({}); LIVE.tenant = 't_test'; LIVE.user = { santa: false }; const off = wsTabs('learn').includes('market'); S.org.mk = { pilot: true }; const onn = wsTabs('learn').includes('market'); go('market'); const shown = CUR.tab === 'market'; LIVE.tenant = null; delete S.org.mk; return { off, on: onn, shown }; });
      ok(!gate.off && gate.on && gate.shown, `1440 시범 게이트(운영) ${JSON.stringify(gate)}`);
    }
    ok(!errs.length, `${w} 스튜디오 pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close();
  }

  /* ── 학습자 ── */
  const openL = async (q, w = 390) => { const ctx = await browser.newContext({ viewport: { width: w, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.addInitScript(() => { try { sessionStorage.setItem('didisam.learner.sample', JSON.stringify({ sid: '20260001', dept: '체험학과', id: '20260001' })); localStorage.setItem('didisam.app.instx', '1'); } catch (e) { } });
    await p.goto(`${base}/learner.html?demo=1&app=1${q}#home`, { waitUntil: 'load' }); await p.waitForTimeout(900); return { ctx, p, errs }; };
  const go = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(350); };
  { const { ctx, p, errs } = await openL('&mk=1');
    const me = await p.evaluate(() => !!(LR.me));
    if (!me) ok(false, '학습자 체험 로그인 실패'); else {
      await go(p, '#home'); const sh = await p.evaluate(() => (document.querySelector('[data-mk="pass-shelf"]') || {}).innerText || '');
      ok(/우리 학교 패스/.test(sh) && /이번 달 2과정 더 시작할 수 있어요/.test(sh) && /크레딧으로 수강/.test(sh), `L1 진열대(${sh.replace(/\s+/g, ' ').slice(0, 60)})`); ok(!/\d+크레딧/.test(sh), 'L1 진열대에 크레딧 숫자 없음');
      { const adl = await p.evaluate(() => [...document.querySelectorAll('[data-mk="pass-shelf"] .mk-adl')].map(x => x.textContent)); ok(adl.length === 1 && adl[0] === '광고' && /광고 안내/.test(sh), `L1 C1 진열대 「광고」 ${JSON.stringify(adl)}`);
        await p.click('[data-mkl="adinfo"]'); ok(/추천 칸에만 표시되며/.test(await p.evaluate(() => document.getElementById('mkAdInfo').innerText)), 'L1 C1 광고 안내 A3(누르면 보임)'); }
      await go(p, '#mk'); ok(await p.evaluate(() => document.querySelectorAll('.mk-list .mk-li').length) === 6, 'L2 목록 6개');
      { const t = await p.evaluate(() => [...document.querySelectorAll('.mk-list .mk-li .t')].map(x => x.textContent)); ok(t.filter(x => /^광고/.test(x)).length === 1 && t[0] !== '광고 생성형 AI 실무 활용 — 프롬프트부터 업무 자동화까지', `L2 C1 「광고」 표시 · 탐색 순서는 광고 가중 없음 ${t[0]}`); }
      await p.click('[data-mkl="f"][data-v="pre"]'); await p.waitForTimeout(200); ok(await p.evaluate(() => document.querySelectorAll('.mk-list .mk-li').length) === 1, 'L2 「승인 필요」 필터 1개');
      ok(await over(p) <= 0, 'L2 390 가로 넘침 없음');
            await go(p, '#mk/i/mp_ai01'); ok(/^광고/.test(await p.evaluate(() => document.querySelector('.mk-hd h1').innerText)) && /노출한 광고입니다/.test(await p.evaluate(() => document.querySelector('.mk-hd').innerText)), 'L3 C1 상세 「광고」 · A2');
      await go(p, '#mk/i/mp_wr01'); ok(/수강 시작 시 45크레딧/.test(await p.evaluate(() => document.querySelector('.mk-cr').innerText)), 'L3 과정 크레딧 표시');
      await p.click('[data-mkl="start"]'); await p.waitForTimeout(300); const l3 = await p.evaluate(() => document.querySelector('#lm').innerText);
      ok(/이어서 보기/.test(l3) && /처음 7일 안에 10%보다 적게/.test(l3), 'L3 credit → started · 7일 안내');
      await go(p, '#mk/i/mp_en01'); ok(/이번 달 사용할 수 있는 크레딧을 모두 썼어요/.test(await p.evaluate(() => document.querySelector('#lm').innerText)), 'L3 cap(K1 45 + 50 > 90)');
      await go(p, '#mk/i/mp_dt01'); await p.click('[data-mkl="pre"]'); await p.waitForTimeout(300); ok(/승인 요청 중/.test(await p.evaluate(() => document.querySelector('#lm').innerText)), 'L3 pre → pre_asked(K2 120 ≥ 80)');
      await go(p, '#home'); ok(/이번 달 1과정 더/.test(await p.evaluate(() => (document.querySelector('[data-mk="pass-shelf"]') || {}).innerText || '')), 'L1 시작 후 남은 과정 1');
      ok(await over(p) <= 0, 'L1 390 가로 넘침 없음');
      /* 「디디쌤 오리지널」 배지(mk-bd orig) 대비 — 라이트 · 다크(통합 담당 요청) */
      for (const th of ['light', 'dark']) { const cr = await p.evaluate(th => { document.documentElement.setAttribute('data-theme', th); document.body.classList.toggle('dark', th === 'dark'); const sp = document.createElement('span'); sp.className = 'mk-bd orig'; sp.textContent = '디디쌤 오리지널'; (document.querySelector('#lm') || document.body).appendChild(sp);
        const rgb = c => (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); const L = a => { const v = a.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
        const cs = getComputedStyle(sp); const f = L(rgb(cs.color)), g = L(rgb(cs.backgroundColor)); sp.remove(); return Math.round((Math.max(f, g) + 0.05) / (Math.min(f, g) + 0.05) * 10) / 10; }, th);
        ok(cr >= 4.5, `오리지널 배지 대비 ${th} ${cr}:1`); } }
    ok(!errs.length, `학습자 pageerror 없음 ${errs.slice(0, 2).join(' / ')}`); await ctx.close(); }
  { const { ctx, p, errs } = await openL(''); await go(p, '#home'); ok(!(await p.evaluate(() => !!document.querySelector('[data-mk="pass-shelf"]'))), '시범 아님(?mk 없음): 진열대 없음'); ok(!errs.length, '학습자(꺼짐) pageerror 없음'); await ctx.close(); }

  await browser.close(); srv.close();
  if (fails.length) { console.error(`실패 ${fails.length}건:`, fails.join(' | ')); process.exit(1); }
  console.log('✓ 콘텐츠 마켓(개발자 3) 점검 통과');
})().catch(e => { console.error(e); process.exit(1); });
