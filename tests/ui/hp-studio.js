'use strict';
/* v36 한 화면 홈페이지 편집기(hpstudio.js) 점검 — 대표님 2026-11-09 지시 4
   - 사이트 화면 = 편집기(본문 자리에 붙음) · 위 메뉴 탭 · 큰 캔버스(맞춤 축소 · 비율 고르기) · 스크롤해도 화면이 밀리지 않음
   - '연결을 거부했습니다' 재현 방지: 운영 서버처럼 index.html에 X-Frame-Options: DENY를 주고, 미리보기 iframe의 메뉴 링크를 실제로 눌러도
     스튜디오 주소로 이동하지 않는지(about:srcdoc 유지 · chrome-error 없음) — 편집 캔버스 · 세부 설정의 미리보기(sandbox) 둘 다
   - 한 번 = 고르기, 두 번 = 고치기 · 섹션 도구 막대 · [+ 섹션] 갤러리 · 페이지 프롬프트(규칙) · 코드 블록(HTML 정화 · JSON)
   - 처음 흐름(템플릿 → AI → 기본 정보 → 게시) · 기본 정보 · 검색 노출 패널 · 게시본에 반영 · 휴대폰 390
   사용: node tests/ui/hp-studio.js  (필요: playwright) · SHOT_DIR=폴더 를 주면 스크린샷을 남긴다 */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const SHOT = process.env.SHOT_DIR || '';

(async () => {
  /* 운영 서버(service/server/app.js · DdApiFilter)와 같은 액자 헤더: 스튜디오는 DENY, 학습자 화면은 SAMEORIGIN */
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    const h = { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }; if (f.endsWith('.html')) { h['x-frame-options'] = path.basename(f) === 'learner.html' ? 'SAMEORIGIN' : 'DENY'; if (path.basename(f) !== 'learner.html') h['content-security-policy'] = "frame-ancestors 'none'"; }
    r.writeHead(200, h); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  const R = []; const ok = (name, cond, info) => { R.push([name, !!cond, info]); console.log(`${cond ? '✓' : '✗'} ${name}${info != null && !cond ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`); };
  const shot = async n => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await page.screenshot({ path: path.join(SHOT, n + '.png') }); };
  const ev = (f, a) => page.evaluate(f, a); const wait = ms => page.waitForTimeout(ms);
  const F = () => page.frameLocator('#hpeF');
  const ready = async () => { await page.waitForFunction(() => { const f = document.getElementById('hpeF'); const d = f && f.contentDocument; return d && d.__hpi && d.querySelector('.hpe-add') && (!d.querySelector('[data-hpe] > .hpe-tb') || d.querySelector('.hpe-tb[data-hps]')); }, null, { timeout: 15000 }); };
  const frameURL = async sel => { const h = await page.$(sel); const fr = h && await h.contentFrame(); return fr ? fr.url() : ''; };
  try {
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await ev(() => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); createOrg('adult', '센텀 배움 아카데미'); });
    await page.waitForFunction(() => window.S && S.org); await wait(500);
    await ev(() => { try { closeModal(); } catch (e) { } if (typeof fabClose === 'function') try { fabClose(); } catch (e) { } go('site'); render(); });
    await ready(); await wait(300);

    /* ── 1) 한 화면 편집기 · 큰 캔버스 ── */
    const L1 = await ev(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const f = document.getElementById('hpeF'); const fr = f.getBoundingClientRect();
      return { dock: document.body.classList.contains('hps-dock') && document.getElementById('hpe').classList.contains('hps'), top: Math.round(r('#hpe').top), left: Math.round(r('#hpe').left), cw: Math.round(fr.width), vw: innerWidth, inner: f.offsetWidth,
        tabs: [...document.querySelectorAll('#hpe .hps-tab')].map(b => b.textContent), rail: [...document.querySelectorAll('#hpe .hps-ri span')].map(s => s.textContent), flow: document.querySelectorAll('#hpe .hps-flow li').length,
        old: ['AI로 홈페이지 만들기', '학습 페이지 · 콘텐츠', '템플릿 바꾸기'].filter(x => (document.getElementById('main').innerText || '').includes(x)) }; });
    ok('사이트 화면 = 편집기(본문 자리에 붙음: 머리 · 왼쪽 메뉴는 그대로)', L1.dock && L1.top >= 56 && L1.left >= 60, L1);
    ok('나뉘어 있던 화면(AI 만들기 · 학습 페이지 · 템플릿)이 본문에 따로 남지 않음', L1.old.length === 0, L1.old);
    ok('위에 사이트 상위 메뉴 탭(홈 · 소개 · 강좌 …)', L1.tabs.length >= 4 && L1.tabs[0] === '홈' && L1.tabs.some(x => /소개/.test(x)), L1.tabs);
    ok('오른쪽 아이콘 줄: 섹션 · 메뉴 · 디자인 · 기본 정보 · 템플릿 · 학습 페이지 · 검색 노출 · 세부 설정', ['섹션', '메뉴', '디자인', '기본 정보', '템플릿', '학습 페이지', '검색 노출', '세부 설정'].every(x => L1.rail.includes(x)), L1.rail);
    ok('캔버스가 화면 폭 대부분(≥ 70%) · PC는 실제 1280 폭으로 그려 맞춤 축소', L1.cw >= L1.vw * .7 && L1.inner === 1280, L1);
    ok('처음 흐름 4단계(템플릿 → AI → 기본 정보 → 게시)', L1.flow === 4, L1.flow);
    await shot('st-1-editor');

    /* ── 2) 비율 · 스크롤 밀림 ── */
    await page.selectOption('#hpe .hps-zoom select', '50'); await wait(200);
    const z50 = await ev(() => document.getElementById('hpeF').style.transform); ok('비율 50% → 축소', /scale\(0\.5\)/.test(z50), z50);
    await page.selectOption('#hpe .hps-zoom select', 'fit'); await wait(200);
    const y0 = await ev(() => [scrollY, Math.round(document.getElementById('hpe').getBoundingClientRect().top), Math.round(document.querySelector('#hpe .hps-tabs').getBoundingClientRect().top)]);
    await page.mouse.move(600, 600); for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, 700); await wait(60); } await page.keyboard.press('End').catch(() => {}); await wait(300);
    const y1 = await ev(() => [scrollY, Math.round(document.getElementById('hpe').getBoundingClientRect().top), Math.round(document.querySelector('#hpe .hps-tabs').getBoundingClientRect().top), document.getElementById('hpeF').contentWindow.scrollY]);
    ok('캔버스를 스크롤해도 편집기 · 탭 위치가 그대로(밀림 없음)', y0[0] === y1[0] && y0[1] === y1[1] && y0[2] === y1[2] && y1[3] > 300, { y0, y1 });
    await ev(() => document.getElementById('hpeF').contentWindow.scrollTo(0, 0));

    /* ── 3) 메뉴 탭 · 캔버스 안 메뉴 링크(연결 거부 재현 방지) ── */
    await page.click('#hpe .hps-tab[data-v^="m-"]:not(.lp)'); await ready();
    const k1 = await ev(() => HPE.key); ok('「소개」 탭 → 그 페이지가 캔버스에', /^m-/.test(k1) && (await ev(() => !!document.getElementById('hpeF').contentDocument.querySelector('#p-' + HPE.key))), k1);
    ok('하위 메뉴는 둘째 줄 탭', await ev(() => document.querySelectorAll('#hpe .hps-subs .hps-tab').length >= 2));
    await F().locator('header a[href="#p-home"]:visible', { hasText: /^\s*홈\s*$/ }).first().click(); await ready(); await wait(200);
    ok('캔버스 안 메뉴 링크 → 같은 편집기에서 페이지 전환(주소 이동 없음)', (await ev(() => HPE.key)) === 'home' && (await frameURL('#hpeF')).startsWith('about:srcdoc'), await frameURL('#hpeF'));
    ok('탭도 함께 바뀜', await ev(() => (document.querySelector('#hpe .hps-tab.on') || {}).dataset.v === 'home'));

    /* ── 4) 한 번 = 고르기, 두 번 = 고치기 ── */
    const h1 = F().locator('.hp-hero h1[data-hpe-f]').first(); await h1.click(); await wait(150);
    ok('한 번 누르면 고르기 + "두 번 눌러 글 고치기"', await ev(() => { const d = document.getElementById('hpeF').contentDocument; return !!document.getElementById('hpsHint') && /두 번/.test(document.getElementById('hpsHint').textContent) && !d.querySelector('[contenteditable]') && !!d.querySelector('.hps-pick'); }));
    await h1.dblclick(); await page.waitForSelector('#hpiTb', { state: 'visible' }); await page.keyboard.type('저녁에 배우는 실무 교실'); await page.keyboard.press('Enter'); await wait(300); await ready();
    ok('두 번 누르면 글 고치기 → 저장', (await ev(() => site().sections.find(x => x.type === 'banner').data.title)) === '저녁에 배우는 실무 교실');
    await F().locator('.hp-hero [data-hpi-img]').first().click({ force: true, position: { x: 60, y: 60 } }); await wait(150); ok('사진 한 번 = 고르기만', await ev(() => !HPI.ip && /사진/.test((document.getElementById('hpsHint') || {}).textContent || '')));
    await F().locator('.hp-hero [data-hpi-img]').first().dblclick({ force: true, position: { x: 60, y: 60 } }); await page.waitForSelector('#hpiImg', { state: 'visible' }); ok('사진 두 번 = 사진 바꾸기 패널', true); await page.keyboard.press('Escape'); await wait(150);
    await page.keyboard.press('Escape'); await wait(200); ok('Esc로 편집기가 닫히지 않음(사이트 화면 자체)', await ev(() => HPE.on && !!document.getElementById('hpe')));

    /* ── 5) 섹션 도구 막대 · [+ 섹션] 갤러리 ── */
    const tb = await ev(() => { const t = document.getElementById('hpeF').contentDocument.querySelector('[data-hpe] > .hpe-tb'); return { lab: [...t.children].map(c => c.getAttribute('aria-label') || c.textContent.trim()).filter(Boolean), dd: [...t.querySelectorAll('.hps-dd button')].map(b => b.textContent.trim()) }; });
    ok('섹션 도구: 위 · 아래 · 복제 · 삭제 · 디자인 ▾ · AI', ['위로', '아래로', '복제', '삭제'].every(x => tb.lab.includes(x)) && tb.lab.some(x => /디자인/.test(x)) && tb.lab.some(x => /AI/.test(x)), tb);
    ok('디자인 ▾ 안에 숨기기 · 자세히 설정', tb.dd.some(x => /숨기기/.test(x)) && tb.dd.some(x => /자세히/.test(x)), tb.dd);
    const n0 = await ev(() => site().sections.length); await F().locator('.hpe-add button').nth(1).hover({ force: true }).catch(() => {}); await ev(() => document.getElementById('hpeF').contentDocument.querySelectorAll('.hpe-add button')[1].click()); await page.waitForSelector('#modal .hps-gc');
    /* v37 지시 4: 갤러리에 '게시판' 카드가 더해져 13종(기대값 12 → 13) */
    ok('[+ 섹션] → 그림 카드 갤러리 13종(게시판 포함)', (await page.$$('#modal .hps-gc svg')).length === 13 && !!(await page.$('#modal [data-hps-bdadd]'))); await shot('st-2-gallery');
    await page.click('#modal [data-mact="steps"]'); await ready(); ok('갤러리에서 고르면 그 자리에 섹션', (await ev(() => site().sections.length)) === n0 + 1 && (await ev(() => site().sections[1].data.variant)) === 'steps');

    /* ── 6) 페이지 프롬프트 · 코드 블록 ── */
    await page.click('#hpe .hps-tab[data-v^="m-"]:not(.lp)'); await ready();
    await page.fill('#hpe .hpw-talk input[name=q]', '강사 소개와 오시는 길 넣어줘'); await page.press('#hpe .hpw-talk input[name=q]', 'Enter'); await wait(500); await ready();
    const pb = await ev(() => s2pages(site()).find(p => p.key === HPE.key).sections.map(x => x.type + ':' + ((x.data || {}).variant || '')));
    ok('「소개」 페이지에서 말로 → 그 페이지에 강사 소개 · 오시는 길', pb.includes('map:') && pb.includes('text:profiles') && (await ev(() => site().sections.every(x => x.type !== 'map'))), pb);
    await page.click('#hpe .hps-cb'); await page.fill('#hpsCodeT', '```html\n<div class="box"><h2>코드로 넣은 안내</h2><p onclick="alert(1)">안전하게 들어갑니다</p><img src=x onerror="alert(2)"></div>\n```'); await shot('st-3-code');
    await page.click('[data-act="hps-coderun"]'); await ready(); await wait(200);
    const cd = await ev(() => { const x = s2pages(site()).find(p => p.key === HPE.key).sections.find(s => s.type === 'code'); const d = document.getElementById('hpeF').contentDocument.body.innerHTML; return { has: !!x, script: x && x.data.allowScript, shown: d.includes('코드로 넣은 안내'), on: /onclick|onerror/.test(d) }; });
    ok('코드 블록(HTML) → 섹션으로 들어가고 위험 속성은 빠짐', cd.has && !cd.script && cd.shown && !cd.on, cd);
    await page.click('#hpe .hps-cb'); await page.fill('#hpsCodeT', '{"sections":[{"type":"text","variant":"features","title":"코드 JSON 소개","cols":[["하나","첫째"],["둘","둘째"],["셋","셋째"]]},{"type":"map","title":"찾아오는 길"}]}');
    await page.click('[data-act="hps-coderun"]'); await ready();
    const js = await ev(() => s2pages(site()).find(p => p.key === HPE.key).sections.map(x => x.type + ':' + ((x.data || {}).title || '')));
    ok('코드 블록(JSON 섹션 설계) → 페이지를 그대로 다시 구성', js.length === 2 && js[0] === 'text:코드 JSON 소개' && js[1] === 'map:찾아오는 길', js);
    await page.click('#hpe [data-act="hpe-undo"]'); await ready(); ok('되돌리기로 이전 구성', (await ev(() => s2pages(site()).find(p => p.key === HPE.key).sections.some(s => s.type === 'code'))));

    /* ── 7) 기본 정보 · 검색 노출 패널 ── */
    await page.click('#hpe .hps-ri[data-v="basic"]'); await page.waitForSelector('#hpsPan [name=tel]');
    await page.fill('#hpsPan [name=tel]', '051-123-4567'); await page.fill('#hpsPan [name=mail]', 'help@centum.example'); await page.fill('#hpsPan [name=addr]', '부산 해운대구 센텀중앙로 1');
    await page.click('#hpsPan .hps-sw label:has(input[value="#0F766E"])'); await shot('st-4-basic'); await page.click('#hpsPan button[type=submit]'); await ready();
    const bi = await ev(() => ({ ft: S.settings.footer, c: site().color, done: document.querySelector('#hpe .hps-flow li:nth-child(3)') ? document.querySelector('#hpe .hps-flow li:nth-child(3)').classList.contains('done') : true }));
    ok('기본 정보 → 바닥글 연락처 · 주소 · 대표 색 · 흐름 3단계 완료', bi.ft.tel === '051-123-4567' && bi.ft.addr && bi.c.toLowerCase() === '#0f766e' && bi.done, bi);
    await page.click('#hpe .hps-ri[data-v="seo"]'); await page.fill('#hpsPan [name=title]', '센텀 배움 아카데미 — 직장인 실무 교육'); await page.click('#hpsPan button[type=submit]'); await wait(200);
    ok('검색 노출 패널 저장', (await ev(() => S.settings.seo.title)) === '센텀 배움 아카데미 — 직장인 실무 교육');
    await page.click('#hpsPan [data-act="hps-panx"]');

    /* ── 8) 학습 페이지 탭(v37 지시 2): 같은 편집기 틀 · 같은 캔버스(#hpeF) · 같은 도구 — 머리글(두 번 눌러 고치기 · 모양 도구) + 섹션 + 자동 목록 ── */
    await page.click('#hpe [data-act="hpe-pub"]'); await wait(500);
    const frame0 = await ev(() => ({ bar: !!document.querySelector('#hpe .hpe-bar .hps-tabs'), talk: !!document.querySelector('#hpe .hpw-talk'), rail: document.querySelectorAll('#hpe .hps-ri').length }));
    const lpTab = await ev(() => { const b = [...document.querySelectorAll('#hpe .hps-tab.lp')].find(x => /강좌/.test(x.textContent)) || document.querySelector('#hpe .hps-tab.lp'); return b.dataset.v; });
    await page.click(`#hpe .hps-tab[data-v="${lpTab}"]`); await ready(); await wait(300);
    const LP = await ev(() => { const pg = s2pages(site()).find(p => p.key === HPE.key); const d = document.getElementById('hpeF').contentDocument.getElementById('p-' + HPE.key);
      return { key: HPE.key, learn: pg && pg.learn, lv: !!document.querySelector('#hpe .hps-lv'), canvas: getComputedStyle(document.getElementById('hpeF')).visibility, head: !!d.querySelector('.hpx-lsh h1[data-hpe-f]'), list: !!d.querySelector('.hpx-lsl .hpx-lsb'), tools: !!d.querySelector('.hpx-lsh')?.closest('[data-hpe]')?.querySelector('.hpe-tb [data-hps-lh="al"]'),
        bar: !!document.querySelector('#hpe .hpe-bar .hps-tabs'), talk: !!document.querySelector('#hpe .hpw-talk'), rail: document.querySelectorAll('#hpe .hps-ri').length }; });
    ok('학습 페이지 탭 → 같은 캔버스(#hpeF)에 그 페이지 · 학습자 미리보기 창으로 바뀌지 않음', LP.learn && !LP.lv && LP.canvas === 'visible' && LP.head && LP.list, LP);
    ok('학습 페이지에서도 같은 위 도구줄 · AI에게 말하기 줄 · 오른쪽 아이콘(개수 같음)', LP.bar && LP.talk && LP.rail === frame0.rail && LP.tools, { LP, frame0 });
    await F().locator(`#p-${await ev(() => HPE.key)} .hpx-lsh h1`).dblclick(); await page.waitForSelector('#hpiTb', { state: 'visible' }).catch(() => {}); await page.keyboard.press('Control+A'); await page.keyboard.type('전체 강좌 보기'); await page.keyboard.press('Enter'); await wait(400); await ready();
    await ev(() => { const i = document.querySelector('#hpe .hpw-talk input[name=q]'); i.value = '소개 문구 "원하는 강좌를 골라 신청하세요" 넣고 가운데 정렬, 대표 색으로'; i.form.requestSubmit(); }); await wait(800); await ready();
    const LH = await ev(() => { const pg = s2pages(site()).find(p => p.key === HPE.key); const h = pg.sections[0]; const k = pg.learn; const d = document.getElementById('hpeF').contentDocument.getElementById('p-' + HPE.key).querySelector('.hpx-lsh'); return { k, t: h.data.title, sub: h.data.sub, cfg: (S.site.lhead || {})[k], cls: d.className, h1: d.querySelector('h1').textContent }; });
    ok('학습 페이지 머리글: 두 번 눌러 제목 · 말로 소개 문구 · 정렬 · 바탕 → 캔버스에 바로', LH.t === '전체 강좌 보기' && LH.h1 === '전체 강좌 보기' && /원하는 강좌/.test(LH.sub) && LH.cfg && LH.cfg.al === 'c' && LH.cfg.tone === 'brand' && /lt-brand/.test(LH.cls) && /al-c/.test(LH.cls), LH);
    await ev(() => document.getElementById('hpeF').contentDocument.getElementById('p-' + HPE.key).querySelector('.hpx-lsh').closest('[data-hpe]').querySelector('[data-hps-lh="h"][data-v="l"]').click()); await wait(300); await ready();
    ok('머리글 도구(크게) → 캔버스', await ev(() => /h-l/.test(document.getElementById('hpeF').contentDocument.getElementById('p-' + HPE.key).querySelector('.hpx-lsh').className)));
    await page.fill('#hpe .hpw-talk input[name=q]', '수강 방법 단계 안내 넣어줘'); await page.press('#hpe .hpw-talk input[name=q]', 'Enter'); await wait(500); await ready();
    const LS = await ev(() => s2pages(site()).find(p => p.key === HPE.key).sections.map(x => x.type + ':' + ((x.data || {}).variant || '')));
    ok('학습 페이지에 AI 지시 → 섹션이 머리글과 자동 목록 사이에(머리글 맨 위 고정)', LS[0] === 'lshead:' && LS.includes('text:steps') && LS.indexOf('text:steps') < LS.indexOf('lslist:'), LS);
    const tbL = await ev(() => { const d = document.getElementById('hpeF').contentDocument.getElementById('p-' + HPE.key); const st = d.querySelector('.hpx-lsl').closest('[data-hpe]'); return [...st.querySelector('.hpe-tb').querySelectorAll('[data-hpe-act]')].map(b => b.dataset.hpeAct); });
    ok('자동 목록 섹션: 위 · 아래만(지우기 · 복제 없음)', tbL.includes('up') && tbL.includes('down') && !tbL.includes('del') && !tbL.includes('dup'), tbL);
    await page.click('#hpe [data-act="hpe-pub"]'); await wait(500);
    const PB = await ev(k => { const hp = S.lsite.pub.hp; return { lh: hp.lhead && hp.lhead[k], lx: hp.lx && hp.lx[k] }; }, LH.k);
    ok('게시본: hp.lhead(제목 · 소개 · 모양) · hp.lx(목록 위 섹션)', PB.lh && PB.lh.t === '전체 강좌 보기' && /원하는 강좌/.test(PB.lh.d) && PB.lh.al === 'c' && PB.lx && /이렇게 시작합니다|단계/.test(PB.lx.pre || ''), PB);
    const lp0 = await ctx.newPage(); const lerr0 = []; lp0.on('pageerror', e => lerr0.push(e.message)); await lp0.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await lp0.goto(`${base}/learner.html?t=${await ev(() => DREG.cur())}#${LH.k}`); await lp0.waitForFunction(() => window.LR && LR.site, null, { timeout: 15000 }).catch(() => {}); await lp0.waitForTimeout(1200);
    const LL = await lp0.evaluate(() => { const sub = document.querySelector('#lm > section.sub'); const h = document.querySelector('#lm > .lxhost[data-w="pre"]'); return { h1: sub && sub.querySelector('h1').textContent, pre: !!h && !!h.shadowRoot && /이렇게 시작합니다|단계/.test(h.shadowRoot.textContent), after: !!h && h.previousElementSibling === sub }; });
    ok('학습자 사이트 학습 페이지: 고친 제목 + 머리글 아래 넣은 섹션', LL.h1 === '전체 강좌 보기' && LL.pre && LL.after, LL); ok('학습자 페이지 오류 0(학습 페이지)', !lerr0.length, lerr0); await lp0.close();
    await shot('st-5-learn');
    await page.click('#hpe .hps-tab[data-v="home"]'); await ready();
    /* ── 8b) v37 P4(대표님 2026-11-10 16:14 '학습페이지 콘텐츠 / 검색 노출 / 세부설정도 같은 화면에서'):
       세 아이콘 = 섹션 · 메뉴처럼 캔버스를 가리지 않는 오른쪽 패널(큰 덮개 · 창 · 다른 화면 없음) — 고치면 캔버스 · 게시본에 바로 ── */
    const side = k => ev(k => { const p = document.getElementById('hpsPan'); const st = document.querySelector('#hpe .hpe-stage').getBoundingClientRect(); const pr = p && p.getBoundingClientRect();
      return { pan: !!p && p.dataset.pk === k, big: !!document.getElementById('hpsBig'), modal: !!document.getElementById('modal'), dock: document.body.classList.contains('hps-dock') && HPE.on, tabs: !!document.querySelector('#hpe .hps-tabs'),
        stageW: Math.round(st.width), canvas: getComputedStyle(document.getElementById(HPS2.lv ? 'hpsLvF' : 'hpeF')).visibility, apart: pr ? Math.round(pr.left - st.right) : -99, back: /한 화면 편집기로/.test(document.body.innerText) }; }, k);
    const okSide = (n, S1) => ok(n, S1.pan && !S1.big && !S1.modal && S1.dock && S1.tabs && S1.stageW >= 360 && S1.canvas === 'visible' && S1.apart >= -1 && !S1.back, S1);
    await page.click('#hpe .hps-ri[data-v="learn"]'); await page.waitForSelector('#hpsPan .hps-lpk'); await wait(500);
    okSide('학습 페이지 콘텐츠 = 오른쪽 패널(캔버스와 나란히 — 덮개 · 창 · 다른 화면 없음)', await side('learn'));
    const lpK = await ev(() => { const L = [...document.querySelectorAll('#hpsPan [data-act="hps-lpgo"]')]; const b = L.find(x => /강좌|클래스|교과목|교육과정/.test(x.textContent)) || L[0]; return b && b.dataset.v; });
    await page.click(`#hpsPan [data-act="hps-lpgo"][data-v="${lpK}"]`); await ready(); await wait(400);
    ok('패널에서 학습 페이지를 고르면 캔버스도 그 페이지', await ev(k => HPE.key === k && !HPS2.lv && !!document.querySelector('#hpsPan [data-hx="ll-n"]'), lpK));
    await page.selectOption('#hpsPan [data-hx="ll-n"]', '4'); await wait(150); await page.click('#hpsPan .hps-seg label:has(input[value="list"])'); await wait(150); await page.uncheck('#hpsPan [data-hx="ll-filt"]'); await wait(150);
    await page.fill('#hpsPan [data-hx="lh-d"]', '관심 있는 강좌를 골라 바로 신청하세요'); await wait(900); await ready();
    const LC = await ev(() => { const pg = s2pages(site()).find(p => p.key === HPE.key); const ll = pg.sections.find(x => x.type === 'lslist'); const d = document.getElementById('hpeF').contentDocument.getElementById('p-' + HPE.key);
      const lst = d.querySelector('.hpx-lsl .hps-k-list'); return { d: ll.data, sub: (d.querySelector('.hpx-lsh p') || {}).textContent, list: !!lst || !!d.querySelector('.hpx-lsl .hps-e'), n: lst ? lst.children.length : 0, filt: !!d.querySelector('.hpx-lsf'), learn: pg.learn, pub: (S.classes || []).filter(c => (c.open === '전체' || c.open == null) && c.status !== '종료').length }; });
    ok('목록 수 · 카드 모양(목록형) · 검색 칸 끄기 · 소개 문구 → 캔버스에 바로', LC.d.n === 4 && LC.d.card === 'list' && LC.d.filt === false && !LC.filt && LC.list && LC.n <= 4 && /바로 신청하세요/.test(LC.sub || ''), LC);
    const lsId = await ev(() => { const b = document.querySelector('#hpsPan [data-act="hps-lsgo"]'); return b && b.dataset.v; });
    await page.click(`#hpsPan [data-act="hps-lsgo"][data-v="${lsId}"]`); await page.waitForSelector('#hpsLvF'); await wait(1500);
    okSide('학습 사이트 페이지를 고르면 캔버스가 그 학습자 화면 — 패널은 그대로 옆에', await side('learn'));
    ok('패널 고르기 → 캔버스 주소도 그 페이지', await ev(id => HPS2.lv && HPS2.lv.ls === id && new RegExp('#' + id + '$').test(document.getElementById('hpsLvF').src), lsId));
    await page.click('#hpsPan .hps-lsx summary >> nth=0'); await page.fill('#hpsPan .hps-lsx [data-k="title"] >> nth=0', '먼저 5분 진단부터'); await wait(1800);
    ok('섹션 문구를 고치면 학습자 미리보기(캔버스)에 바로', (await page.frameLocator('#hpsLvF').locator('text=먼저 5분 진단부터').count()) > 0);
    await shot('st-8b-learnpanel');
    await page.click('#hpe .hps-ri[data-v="seo"]'); await page.waitForSelector('#hpsPan #hpsSerpS'); await wait(300); okSide('검색 노출 = 오른쪽 패널', await side('seo'));
    await page.fill('#hpsPan [name=desc]', '직장인을 위한 저녁 실무 교육'); await wait(250);
    ok('설명을 적는 대로 구글 결과 모양 · 링크 공유 미리보기가 바뀜', await ev(() => /저녁 실무 교육/.test(document.getElementById('hpsSerpS').textContent) && /저녁 실무 교육/.test(document.getElementById('hpsOg').textContent)));
    const spk = await ev(() => { const o = [...document.querySelectorAll('#hpsPan [data-hx="seo-pg"] option')].find(x => /^m-/.test(x.value)); return o && o.value; });
    await page.selectOption('#hpsPan [data-hx="seo-pg"]', spk); await wait(500); ok('검색 노출: 페이지를 고르면 캔버스도 그 페이지', await ev(k => HPE.key === k, spk));
    await page.fill('#hpsPan [data-hx="seop-t"]', '오시는 길 안내'); await wait(800);
    ok('페이지별 제목 저장 · 그 페이지 검색 결과 미리보기', await ev(k => { const p = s2pages(site()).find(x => x.key === k); const it = p.sb || p.m; return it.seo.title === '오시는 길 안내' && /오시는 길 안내/.test(document.getElementById('hpsSerpP').textContent) && S.settings.seo.desc === '직장인을 위한 저녁 실무 교육'; }, spk));
    await shot('st-8c-seopanel');
    await page.click('#hpe .hps-ri[data-v="more"]'); await page.waitForSelector('#hpsPan .hps-mc'); await wait(300); okSide('세부 설정 = 오른쪽 패널(묶음 카드 + 검색)', await side('more'));
    const MC = await ev(() => [...document.querySelectorAll('#hpsPan .hps-mc')].map(x => x.dataset.mc));
    ok('세부 설정 묶음: 공개 범위 · 주소/도메인 · 파비콘 · 약관/개인정보 · 바닥글 · 페이지 목록 · 섹션 종류', ['open', 'addr', 'fav', 'terms', 'foot', 'pages', 'secs'].every(x => MC.includes(x)), MC);
    await page.fill('#hpsPan [data-hx="mo-q"]', '약관'); await wait(200);
    ok('세부 설정 검색 → 맞는 묶음만', await ev(() => { const v = [...document.querySelectorAll('#hpsPan .hps-mc')].filter(x => !x.hidden).map(x => x.dataset.mc); return v.length === 1 && v[0] === 'terms'; }));
    await page.fill('#hpsPan [data-hx="tm-tos"]', '제1조(목적) 센텀 배움 아카데미 이용약관입니다.'); await page.fill('#hpsPan [data-hx="mo-q"]', ''); await wait(250);
    await page.fill('#hpsPan [data-hx="ft"][data-k="company"]', '센텀배움(주)'); await wait(1000);
    ok('바닥글 회사명 → 캔버스 바닥글에 바로', await ev(() => /센텀배움\(주\)/.test(document.getElementById('hpeF').contentDocument.body.textContent)));
    const hideId = await ev(() => (site().menus.find(x => x.kind !== 'home' && x.on !== false && x.kind === 'custom') || site().menus.find(x => x.kind !== 'home' && x.on !== false)).id);
    await page.uncheck(`#hpsPan [data-hx="pl-on"][data-m="${hideId}"][data-s=""]`); await wait(500);
    ok('페이지 목록에서 숨기면 위 탭에서도 빠짐', await ev(id => site().menus.find(m => m.id === id).on === false && !document.querySelector(`#hpe .hps-tab[data-m="${id}"]`), hideId));
    await page.check(`#hpsPan [data-hx="pl-on"][data-m="${hideId}"][data-s=""]`); await wait(300); await shot('st-8d-morepanel');
    await page.click('#hpsPan [data-act="hps-panx"]'); await ready();
    await page.click('#hpe [data-act="hpe-pub"]'); await wait(500);
    const PB2 = await ev(([r, k, id]) => { const P0 = S.lsite.pub; const hp = P0.hp; return { lc: hp.lcfg && hp.lcfg[r], seo: hp.seo.desc, pseo: hp.pages[k] && hp.pages[k].seo.title, ls: JSON.stringify((P0.pages.find(p => p.id === id) || {}).sections || []).includes('먼저 5분 진단부터'), tos: /센텀 배움 아카데미 이용약관/.test((hp.pages.terms || {}).html || '') }; }, [LC.learn, spk, lsId]);
    ok('게시본: 목록 설정(hp.lcfg) · 사이트/페이지 검색 정보 · 학습 사이트 섹션 문구 · 약관', PB2.lc && PB2.lc.n === 4 && PB2.lc.card === 'list' && PB2.lc.filt === 0 && PB2.seo === '직장인을 위한 저녁 실무 교육' && PB2.pseo === '오시는 길 안내' && PB2.ls && PB2.tos, PB2);
    const lq = await ctx.newPage(); const lqe = []; lq.on('pageerror', e => lqe.push(e.message)); await lq.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await lq.goto(`${base}/learner.html?t=${await ev(() => DREG.cur())}#${LC.learn}`); await lq.waitForFunction(() => window.LR && LR.site, null, { timeout: 15000 }).catch(() => {}); await lq.waitForTimeout(1300);
    const LQ = await lq.evaluate(() => { const g = document.querySelector('#lm .shp-grid'); const f = document.querySelector('#lm .shp-filt'); const cards = g ? [...g.querySelectorAll('.shp-card')] : []; return { grid: !!g, list: !!g && g.classList.contains('llc-list'), filt: f ? getComputedStyle(f).display : 'none', shown: cards.filter(c => getComputedStyle(c).display !== 'none').length, all: cards.length, more: !!document.querySelector('#lm .llc-more'), sub: (document.querySelector('#lm > section.sub') || {}).textContent || '' }; });
    ok('학습자 목록 화면: 목록형 카드 · 검색 칸 숨김 · 4개 넘으면 [더 보기] · 소개 문구', LQ.grid && LQ.list && LQ.filt === 'none' && LQ.shown <= 4 && (LQ.all <= 4 || LQ.more) && /바로 신청하세요/.test(LQ.sub), LQ);
    ok('학습자 페이지 오류 0(목록 설정)', !lqe.length, lqe); await lq.close();
    /* 미리보기(sandbox · srcdoc) 메뉴 링크 가드 — 예전 세부 설정 미리보기와 같은 조건의 액자를 만들어 '연결을 거부했습니다' 재현 방지를 계속 확인 */
    await ev(() => { const f = document.createElement('iframe'); f.id = 'qaPv'; f.setAttribute('sandbox', 'allow-same-origin'); f.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:300px;z-index:99';
      f.srcdoc = siteHTML(site(), false); document.body.appendChild(f); }); await wait(700);
    const qf = await (await page.$('#qaPv')).contentFrame(); await qf.evaluate(() => { const a = [...document.querySelectorAll('a[href^="#p-m-"]')][0]; a.click(); }); await wait(400);
    const u3 = await frameURL('#qaPv'); ok('미리보기(sandbox) 메뉴를 눌러도 스튜디오 주소로 이동하지 않음(연결 거부 없음)', /^about:srcdoc#p-m-/.test(u3), u3); await ev(() => document.getElementById('qaPv').remove());
    await page.click('#hpe .hps-tab[data-v="home"]'); await ready();
    await page.click('#hpe .hps-ri[data-v="menu"]'); await page.waitForSelector('#hpsPan #hpmBox .hpm-i'); ok('메뉴 아이콘 = 편집기 안 오른쪽 패널(창 · 다른 화면 아님)', await ev(() => !document.getElementById('modal') && !!document.querySelector('#hpe #hpsPan.hps-panw #hpmBox') && document.body.classList.contains('hps-dock')));
    await page.click('#hpsPan [data-act="hps-panx"]');

    /* ── 9) 게시본 반영 · 다른 메뉴로 이동 ── */
    await page.click('#hpe [data-act="hpe-pub"]'); await wait(400);
    const pub = await ev(() => { const hp = S.lsite.pub.hp; const all = hp.home + Object.values(hp.pages).map(p => p.html).join('') + hp.foot; return { tel: all.includes('051-123-4567'), code: all.includes('코드로 넣은 안내'), on: /onclick=|onerror=/.test(all), title: all.includes('저녁에 배우는 실무 교실') }; });
    ok('게시본: 고친 문구 · 코드 섹션(정화) · 연락처 반영', pub.tel && pub.code && !pub.on && pub.title, pub);
    const lp = await ctx.newPage(); const lerr = []; lp.on('pageerror', e => lerr.push(e.message)); const tid = await ev(() => DREG.cur());
    await lp.goto(`${base}/learner.html?t=${tid}#home`); await lp.waitForFunction(() => window.LR && LR.site, null, { timeout: 15000 }).catch(() => {}); await wait(800);
    const lh = await lp.evaluate(() => { const tx = [...document.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => e.shadowRoot.textContent).join(' ') + ' ' + (document.body.innerText || ''); return { t: tx.includes('저녁에 배우는 실무 교실'), over: document.documentElement.scrollWidth - innerWidth }; });
    ok('학습자 공개 사이트에 고친 첫 화면', lh.t, lh); ok('학습자 페이지 오류 0', !lerr.length, lerr); await lp.close();
    await ev(() => go('home')); await wait(300); ok('다른 메뉴로 가면 편집기를 내림', await ev(() => !document.getElementById('hpe') && !document.body.classList.contains('hps-dock')));
    await ev(() => go('site')); await ready(); ok('사이트로 돌아오면 다시 편집기', await ev(() => HPE.on && document.body.classList.contains('hps-dock')));

    /* ── 9b) 템플릿 고르기 = 편집기 안 패널(v36 R3) — 고르면 적용 · 되돌리기 · 닫으면 편집기 ── */
    const tpl0 = await ev(() => S.site.tpl); await ev(() => document.querySelector('#hpe .hps-ri[data-v="tpl"]').click()); await page.waitForSelector('#hpsGal .tpd-c'); await wait(500);
    const G = await ev(() => ({ dock: document.body.classList.contains('hps-dock'), hpe: !!document.getElementById('hpe'), n: document.querySelectorAll('#hpsGal .tpd-c').length, first: (document.querySelector('#hpsGal .tpd-c') || {}).dataset.v, mainGal: !!document.querySelector('#main .tpd-g') }));
    ok('템플릿 고르기: 별도 화면이 아니라 편집기 안 패널(큰 미리보기 그리드)', G.dock && G.hpe && G.n >= 4 && !G.mainGal, G);
    const pick = await ev(t0 => [...document.querySelectorAll('#hpsGal .tpd-c')].map(c => c.dataset.v).find(v => v !== t0), tpl0);
    await ev(v => document.querySelector(`#hpsGal .tpd-c[data-v="${v}"]`).click(), pick); await page.waitForSelector('#slSheet [data-act="tpd-use"]'); await page.click('#slSheet [data-act="tpd-use"]'); await wait(1200);
    const G2 = await ev(() => ({ tpl: S.site.tpl, gal: !!document.getElementById('hpsGal'), dock: document.body.classList.contains('hps-dock') && HPE.on }));
    ok('템플릿을 고르면 적용되고 편집기로 돌아옴', G2.tpl === pick && !G2.gal && G2.dock, G2);
    await ev(() => window.hpUndo()); await wait(800); ok('되돌리기 → 이전 템플릿', await ev(t0 => S.site.tpl === t0, tpl0));
    await ev(() => document.querySelector('#hpe .hps-ri[data-v="tpl"]').click()); await wait(500); await page.keyboard.press('Escape'); await wait(300);
    ok('Esc · 닫기로 패널만 닫힘(편집기 그대로)', await ev(() => !document.getElementById('hpsGal') && HPE.on && document.body.classList.contains('hps-dock')));

    /* ── 11) 하위 메뉴(v37 지시 3): 탭에 마우스 → [＋ 하위] · [＋ 페이지]에서 '하위 메뉴로 넣기' · 빈 상태 안내 · 메뉴 패널에서 끌어 들이면 하위로 ── */
    await page.click('#hpe .hps-tab[data-v="home"]'); await ready();
    const topId = await ev(() => { const m = site().menus.find(x => x.kind === 'custom' && x.on !== false && !(x.subs || []).length && !x.link) || site().menus.find(x => x.kind !== 'home' && x.on !== false); return m.id; });
    await page.hover(`#hpe .hps-tab[data-m="${topId}"]:not(.sub)`); await wait(150);
    ok('탭에 마우스를 올리면 [＋ 하위]가 보임', await ev(id => { const b = document.querySelector(`#hpe .hps-tsub[data-v="${id}"]`); return !!b && getComputedStyle(b).display !== 'none'; }, topId));
    await page.click(`#hpe .hps-tsub[data-v="${topId}"]`); await page.waitForSelector('#hpsPop form'); await page.fill('#hpsPop [name=pn]', '찾아오시는 길'); await shot('st-7-subpop'); await page.click('#hpsPop button[type=submit]'); await ready(); await wait(200);
    const SB = await ev(id => { const m = site().menus.find(x => x.id === id); const sb = (m.subs || []).find(x => x.l === '찾아오시는 길'); return { sb: !!sb, key: HPE.key, want: sb ? `s-${id}-${sb.id}` : '', row: [...document.querySelectorAll('#hpe .hps-subs .hps-tab')].map(b => b.textContent.trim()) }; }, topId);
    ok('[＋ 하위] → 그 메뉴 아래 하위 메뉴 생성 · 그 페이지로 · 둘째 줄 탭에 보임', SB.sb && SB.key === SB.want && SB.row.some(x => /찾아오시는 길/.test(x)), SB);
    const noSub = await ev(() => { const m = site().menus.find(x => x.kind !== 'home' && x.on !== false && !(x.subs || []).filter(b => b.on !== false).length); return m ? m.id : ''; });
    if (noSub) { await page.click(`#hpe .hps-tab[data-m="${noSub}"]:not(.sub)`); await ready(); await wait(150);
      ok('하위 메뉴가 없는 메뉴: 둘째 줄에 빈 상태 안내 + 「하위 메뉴 만들기」', await ev(() => !!document.querySelector('#hpe .hps-sube [data-act="hps-subadd"]') && /하위 메뉴가 없습니다/.test(document.querySelector('#hpe .hps-sube').textContent))); }
    await page.click('#hpe .hps-tadd[data-act="hps-padd"]'); await page.waitForSelector('#hpsPop form'); await page.fill('#hpsPop [name=pn]', '학과 소식');
    await page.check('#hpsPop input[name=pw][value=sub]'); await page.selectOption('#hpsPop [name=pp]', topId); await page.check('#hpsPop input[name=pk][value=board]'); await page.selectOption('#hpsPop [name=pb]', '__new'); await shot('st-8-pagepop');
    await page.click('#hpsPop button[type=submit]'); await ready(); await wait(200);
    const PG = await ev(id => { const b = S.boards.find(x => x.name === '학과 소식'); const m = site().menus.find(x => x.id === id); const sb = (m.subs || []).find(x => x.l === '학과 소식'); const pg = s2pages(site()).find(p => p.key === HPE.key); return { board: !!b, link: sb && sb.link, bid: b && b.id, learn: pg && pg.learn, list: !!document.getElementById('hpeF').contentDocument.getElementById('p-' + HPE.key).querySelector('.hpx-lsl .hpx-bd') }; }, topId);
    ok('[＋ 페이지] → 하위 메뉴로 넣기 + 새 게시판 → 게시판 페이지가 같은 캔버스에', PG.board && PG.link === 'learn:comm/' + PG.bid && PG.learn === 'comm/' + PG.bid && PG.list, PG);
    await page.click('#hpe .hps-ri[data-v="menu"]'); await page.waitForSelector('#hpsPan #hpmBox .hpm-i');
    const dragIds = await ev(() => { const T = site().menus.filter(m => m.kind !== 'home'); let k = T.length - 1; while (k > 1 && ((T[k].subs || []).length || (T[k - 1].subs || []).length)) k--; return [T[k].id, T[k - 1].id, T[k].l]; }); /* 화면에 함께 보이는 두 메뉴(패널이 스크롤되지 않게) */
    await page.dragAndDrop(`#hpsPan .hpm-l > .hpm-i[data-id="${dragIds[0]}"]`, `#hpsPan .hpm-l > .hpm-i[data-id="${dragIds[1]}"]`, { sourcePosition: { x: 14, y: 18 }, targetPosition: { x: 240, y: 20 } }); await wait(400);
    const DG = await ev(([a, b, l]) => { const dst = site().menus.find(m => m.id === b); return { top: site().menus.some(m => m.id === a), sub: (dst.subs || []).some(x => x.l === l) }; }, dragIds);
    ok('메뉴 패널: 오른쪽으로 끌어 들여 놓으면 하위 메뉴', !DG.top && DG.sub, DG); await shot('st-9-menupanel');
    await ev(() => window.hpUndo()); await wait(300); await page.click('#hpsPan [data-act="hps-panx"]');

    /* ── 12) 게시판 섹션(v37 지시 4): [+ 섹션] 갤러리 → 기존 게시판 고르기 · 새로 만들기 → 최근 글 · 더 보기 · 글쓰기 · 메뉴로도 → 학습자 사이트에서 보기 · 쓰기 ── */
    await page.click('#hpe .hps-tab[data-v="home"]'); await ready();
    await ev(() => document.getElementById('hpeF').contentDocument.querySelectorAll('.hpe-add button')[1].click()); await page.waitForSelector('#modal [data-hps-bdadd]'); await page.click('#modal [data-hps-bdadd]'); await page.waitForSelector('#modal .hps-bdp');
    await page.check('#modal input[name=bid][value="__new"]'); await page.fill('#modal [name=bn]', '수강생 이야기'); await page.fill('#modal [name=tt]', '수강생 이야기'); await page.selectOption('#modal [name=n]', '3'); await shot('st-10-boardpick');
    await page.click('#modal [data-mact=ok]'); await ready(); await wait(200);
    const BD = await ev(() => { const b = S.boards.find(x => x.name === '수강생 이야기'); const x = site().sections.find(s => s.type === 'board'); const m = site().menus.find(m => m.link === 'learn:comm/' + (b && b.id)); const d = document.getElementById('hpeF').contentDocument.getElementById('p-home').querySelector('.hpx-bd');
      return { b: b && { id: b.id, write: b.write, cmt: b.cmt, file: b.file }, x: x && x.data, menu: !!m, canvas: !!d && /수강생 이야기/.test(d.textContent) && !!d.querySelector('a.hpx-bdw') && !!d.querySelector('a.hpx-bdm'), tab: [...document.querySelectorAll('#hpe .hps-tab')].some(t => /수강생 이야기/.test(t.textContent)) }; });
    ok('게시판 섹션: 새 게시판(comm2 기본값 — 쓰기 · 댓글 · 첨부) + 섹션(최근 3개) + 메뉴 · 탭에도', BD.b && BD.b.write === 'all' && BD.b.cmt && BD.b.file && BD.x && BD.x.bid === BD.b.id && BD.x.n === 3 && BD.menu && BD.canvas && BD.tab, BD);
    await ev(() => { const d = document.getElementById('hpeF').contentDocument.getElementById('p-home'); const sec = d.querySelector('.hpx-bd').closest('[data-hpe]'); sec.querySelector('[data-hpe-act="more"]').click(); }); await page.waitForSelector('#modal .hps-bdp');
    ok('게시판 섹션 [게시판 설정] → 같은 창에서 바꾸기(화면 이동 없음)', await ev(() => /게시판 섹션 설정/.test(document.querySelector('#modal').textContent) && document.body.classList.contains('hps-dock'))); await page.click('#modal [data-mact=c]');
    const bid = BD.b.id; await ev(b => { S.posts.push({ id: 'poHp1', board: b, who: 'admin', by: '운영자', title: '첫 모임 안내', body: '이번 주 금요일에 모입니다.', at: nowStr(), replies: [] }); cmSave(); }, bid);
    const code = await ev(() => { try { return lxDemo(); } catch (e) { return null; } }); await page.click('#hpe [data-act="hpe-pub"]'); await wait(500); const pm = await page.$('#modal [data-mact=ok]'); if (pm) await pm.click();
    const tid2 = await ev(() => DREG.cur()); const lb = await ctx.newPage(); const lberr = []; lb.on('pageerror', e => lberr.push(e.message)); lb.on('dialog', d => d.accept()); await lb.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await lb.goto(`${base}/learner.html?t=${tid2}#home`); await lb.waitForFunction(() => window.LR && LR.site, null, { timeout: 15000 }).catch(() => {}); await lb.waitForTimeout(1200);
    const bdIn = () => lb.evaluate(() => { const r = [...document.querySelectorAll('.smhost')].map(h => h.shadowRoot).find(x => x && x.querySelector('.hpx-bd')); const sec = r && r.querySelector('.hpx-bd'); return sec ? { t: sec.textContent, more: (sec.querySelector('a.hpx-bdm') || {}).getAttribute ? sec.querySelector('a.hpx-bdm').getAttribute('href') : '', write: sec.querySelector('a.hpx-bdw') ? sec.querySelector('a.hpx-bdw').getAttribute('href') : '', post: sec.querySelector('.hpx-bdl a') ? sec.querySelector('.hpx-bdl a').getAttribute('href') : '' } : null; });
    const LB = await bdIn(); ok('학습자 홈에 게시판 섹션: 최근 글 · 더 보기 · 글쓰기 주소', LB && /첫 모임 안내/.test(LB.t) && LB.more === '#comm/' + encodeURIComponent(bid) && LB.write === '#write/b:' + encodeURIComponent(bid) && /^#post\//.test(LB.post), LB);
    await lb.evaluate(h => { location.hash = h; }, LB ? LB.post : '#home'); await lb.waitForTimeout(500); ok('학습자: 섹션의 글 → 글 보기(lcomm)', await lb.evaluate(() => /이번 주 금요일/.test((document.querySelector('#lm') || {}).textContent || '')));
    if (code) { await lb.evaluate(async c => { await LR.api.login(c.sid, c.code); lrender(); }, code); await lb.waitForTimeout(400); if (await lb.evaluate(() => location.hash === '#consent')) { await lb.check('#lcConsent [data-cn=all]'); await lb.click('#lcConsent button[type=submit]'); await lb.waitForTimeout(500); }
      await lb.evaluate(h => { location.hash = h; }, '#write/b:' + encodeURIComponent(bid)); await lb.waitForTimeout(500);
      const wf = await lb.evaluate(() => { const s = document.querySelector('#lcW [name=board]'); return { form: !!document.querySelector('#lcW'), board: s ? s.value : '' }; }); ok('학습자: 섹션의 [글쓰기] → 그 게시판 글쓰기 화면', wf.form && wf.board === bid, wf);
      const tf = await lb.$('#lcW [name=title]'); if (tf) await lb.fill('#lcW [name=title]', '저도 참석합니다'); await lb.fill('#lcW [name=body]', '금요일에 뵙겠습니다'); await lb.click('#lcW button[type=submit]'); await lb.waitForTimeout(500);
      await lb.evaluate(() => { location.hash = '#home'; }); await lb.waitForTimeout(1200); const LB2 = await bdIn(); ok('학습자: 쓴 글이 홈 게시판 섹션 최근 글에 바로 보임', LB2 && /저도 참석합니다|금요일에 뵙겠습니다/.test(LB2.t), LB2);
      await ev(() => { lpxPull(); render(); }); await wait(300); ok('학습자 글 → 운영자 게시판에 반영(LPX)', await ev(b => S.posts.some(p => p.board === b && /금요일에 뵙겠습니다/.test(p.body || '')), bid)); }
    else ok(false, '학습자 접근코드(lxDemo) 없음');
    ok('학습자 페이지 오류 0(게시판)', !lberr.length, lberr); await lb.close();
    await ready();

    /* ── 10) 휴대폰 390 ── */
    await page.setViewportSize({ width: 390, height: 844 }); await ev(() => { HPS2.devSet = 0; HPS2.dock = false; hpClose(true); render(); }); await ready(); await wait(400);
    const mo = await ev(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { talk: !!document.querySelector('#hpe .hpw-talk input'), over: document.documentElement.scrollWidth - innerWidth, dev: HPE.dev, rail: Math.round(r('#hpe .hps-rail').bottom), h: innerHeight, tabs: Math.round(r('#hpe .hps-tabs').top), nav: document.querySelector('nav.brail') ? Math.round(document.querySelector('nav.brail').getBoundingClientRect().bottom) : 0 }; });
    ok('휴대폰: 가로 넘침 0 · 휴대폰 보기 · 말로 고치기 줄 · 아이콘 줄은 아래 · 스튜디오 메뉴 줄을 가리지 않음', mo.talk && mo.over <= 0 && mo.dev === 'mo' && mo.rail <= mo.h && mo.tabs >= mo.nav, mo); await shot('st-6-mobile');
    /* v36 R3(4-4): 캔버스 우선 — 위 도구는 탭 한 줄, 말로 고치기는 아래 [AI에게 말하기]로 여는 시트 */
    const mc = await ev(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const top = r('#hpe').top, st = r('#hpe .hpe-stage'); return { tools: Math.round(st.top - top), stage: Math.round(st.height), avail: Math.round(innerHeight - top), talkVis: getComputedStyle(document.querySelector('#hpe .hpw-talk')).display }; });
    ok('휴대폰: 캔버스가 편집기 높이의 75% 이상 · 위 도구 한 줄(≤ 60px) · 말로 고치기는 접힘', mc.tools <= 60 && mc.stage >= mc.avail * .75 && mc.talkVis === 'none', mc);
    await ev(() => document.querySelector('#hpe .hps-ri[data-v="talk"]').click()); await wait(300);
    const mt = await ev(() => { const f = document.querySelector('#hpe .hpw-talk'); const b = f.getBoundingClientRect(); const rl = document.querySelector('#hpe .hps-rail').getBoundingClientRect(); return { vis: getComputedStyle(f).display !== 'none', bottom: Math.round(b.bottom), rail: Math.round(rl.top), focus: document.activeElement && document.activeElement.name }; });
    ok('휴대폰: [AI에게 말하기] → 아래 시트(아이콘 줄 바로 위) · 입력칸 포커스', mt.vis && Math.abs(mt.bottom - mt.rail) <= 2 && mt.focus === 'q', mt); await shot('st-6b-mobile-talk');
    await ev(() => document.querySelector('#hpe .hps-ri[data-v="talk"]').click()); await wait(200);
    for (const k of ['learn', 'seo', 'more']) { await ev(k => document.querySelector(`#hpe .hps-ri[data-v="${k}"]`).click(), k); await wait(500);
      const ms = await ev(() => { const p = document.getElementById('hpsPan').getBoundingClientRect(); const st = document.querySelector('#hpe .hpe-stage').getBoundingClientRect(); const rl = document.querySelector('#hpe .hps-rail').getBoundingClientRect(); return { left: Math.round(p.left), w: Math.round(p.width), vw: innerWidth, bottom: Math.round(p.bottom), rail: Math.round(rl.top), h: Math.round(p.height), ih: innerHeight, canvasTop: Math.round(st.top), panTop: Math.round(p.top), over: document.documentElement.scrollWidth - innerWidth }; });
      ok(`휴대폰: ${k} 패널 = 아래 시트(아이콘 줄 위 · 캔버스 윗부분은 보임 · 가로 넘침 0)`, ms.left === 0 && ms.w === ms.vw && Math.abs(ms.bottom - ms.rail) <= 2 && ms.h <= ms.ih * .7 && ms.canvasTop < ms.panTop - 40 && ms.over <= 0, ms); if (k === 'learn') await shot('st-10-mo-learn'); }
    await ev(() => document.querySelector('#hpsPan [data-act="hps-panx"]').click()); await wait(200);
    ok('스크립트 오류 0', !errs.length, errs);
  } catch (e) { ok('crash — ' + String(e.message || e).split('\n').slice(0, 3).join(' | '), false); try { await shot('st-crash'); } catch (x) { } }
  await browser.close(); srv.close();
  const bad = R.filter(r => !r[1]); console.log(bad.length ? `실패 ${bad.length}/${R.length}` : `통과 ${R.length}개 항목 — 한 화면 편집기 · 연결 거부 재현 방지 · 두 번 눌러 고치기 · 섹션 갤러리 · 페이지 프롬프트 · 코드 블록 · 기본 정보 · 게시본`);
  process.exit(bad.length ? 1 : 0);
})();
