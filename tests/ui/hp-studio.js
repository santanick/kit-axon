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
    ok('[+ 섹션] → 그림 카드 갤러리 12종', (await page.$$('#modal .hps-gc svg')).length === 12); await shot('st-2-gallery');
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

    /* ── 8) 학습 페이지 탭 · 세부 설정의 미리보기(sandbox) 링크 ── */
    await page.click('#hpe [data-act="hpe-pub"]'); await wait(500);
    await page.click('#hpe .hps-tab.lp'); await page.waitForSelector('#hpe .hps-lv'); await wait(800);
    const lv = await ev(() => { const f = document.querySelector('#hpe .hps-lvf'); return f ? f.getAttribute('src') : ''; });
    /* v36 R3(4-2): 학습 페이지 탭은 게시 전에도 보이도록 초안 미리보기(learner.html?preview=1 — lsSnapshot)를 쓰고, 그 안 머리글을 고친다(기대값 변경: ?t= 게시본 → ?preview=1 초안) */
    ok('학습 페이지로 가는 메뉴 → 같은 출처 학습 페이지 미리보기(초안)', /learner\.html\?preview=1.*#/.test(lv), lv);
    await page.waitForFunction(() => { const f = document.getElementById('hpsLvF'); const d = f && f.contentDocument; return d && d.querySelector('#lm > section.sub.llh .llh-tb'); }, null, { timeout: 15000 });
    const LF = page.frameLocator('#hpsLvF');
    await LF.locator('#lm > section.sub h1').dblclick(); await wait(150); await page.keyboard.press('Control+A'); await page.keyboard.type('전체 강좌 보기'); await page.keyboard.press('Enter'); await wait(900);
    await ev(() => { const i = document.querySelector('#hpe .hpw-talk input[name=q]'); i.value = '소개 문구 "원하는 강좌를 골라 신청하세요" 넣고 가운데 정렬, 대표 색으로'; i.form.requestSubmit(); }); await wait(1200);
    const LH = await ev(() => { const f = document.getElementById('hpsLvF'); const sub = f.contentDocument.querySelector('#lm > section.sub'); const k = f.contentWindow.lhKey().k; return { k, cfg: (S.site.lhead || {})[k], h1: sub.querySelector('h1').textContent, d: (sub.querySelector('.llh-d') || {}).textContent, cls: sub.className, ff: getComputedStyle(sub.querySelector('h1')).fontFamily, head: !!f.contentDocument.querySelector('.lhs-head') }; });
    ok('학습 페이지 머리글: 두 번 눌러 제목 · 말로 소개 문구 · 정렬 · 바탕 → 미리보기 반영', LH.cfg && LH.cfg.t === '전체 강좌 보기' && LH.h1 === '전체 강좌 보기' && /원하는 강좌/.test(LH.d || '') && LH.cfg.al === 'c' && LH.cfg.tone === 'brand' && /llh-brand/.test(LH.cls) && /llh-c/.test(LH.cls), LH);
    ok('학습 페이지 머리 메뉴 = 홈페이지 머리글(방문자 화면)', LH.head, LH);
    const pubL = await ev(() => lsSnapshot().hp.lhead); ok('게시본 hp.lhead에 머리글 설정', pubL && pubL[LH.k] && pubL[LH.k].t === '전체 강좌 보기', pubL);
    await ev(() => { window.hpUndo(); }); await wait(1300); const un = await ev(() => { const f = document.getElementById('hpsLvF'); return [((S.site.lhead || {})[f.contentWindow.lhKey().k] || {}).tone || '', f.contentDocument.querySelector('#lm > section.sub').className]; });
    ok('되돌리기 → 머리글 미리보기도 되돌아감', un[0] !== 'brand' && !/llh-brand/.test(un[1]), un);
    await ev(() => { window.hpRedo(); }); await wait(600);
    ok('학습 페이지 액자가 막히지 않음(SAMEORIGIN)', !(await frameURL('#hpe .hps-lvf')).startsWith('chrome-error'), await frameURL('#hpe .hps-lvf')); await shot('st-5-learn');
    await page.click('#hpe .hps-tab[data-v="home"]'); await ready();
    await page.click('#hpe .hps-ri[data-v="more"]'); await page.waitForSelector('#sitePv'); await wait(600);
    ok('세부 설정 = 기존 화면 + 돌아가기 줄', await ev(() => !!document.querySelector('.hps-back') && !document.getElementById('hpe')));
    const pv = await page.$('#sitePv'); const pf = await pv.contentFrame(); await pf.click('a[href="#p-home"] >> nth=0'); await wait(500);
    await pf.evaluate(() => { const a = [...document.querySelectorAll('a[href^="#p-m-"]')][0]; a.click(); }); await wait(500);
    const u2 = await frameURL('#sitePv'); ok('미리보기(sandbox) 메뉴를 눌러도 스튜디오 주소로 이동하지 않음(연결 거부 없음)', /^about:srcdoc#p-m-/.test(u2), u2);
    ok('미리보기에 누른 메뉴 페이지가 보임', await pf.evaluate(() => { const t = document.querySelector(':target'); return !!t && getComputedStyle(t).display !== 'none'; }));
    await page.click('[data-act="hps-back"]'); await ready(); ok('돌아가기 → 편집기', await ev(() => HPE.on && document.body.classList.contains('hps-dock')));

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
    ok('스크립트 오류 0', !errs.length, errs);
  } catch (e) { ok('crash — ' + String(e.message || e).split('\n').slice(0, 3).join(' | '), false); try { await shot('st-crash'); } catch (x) { } }
  await browser.close(); srv.close();
  const bad = R.filter(r => !r[1]); console.log(bad.length ? `실패 ${bad.length}/${R.length}` : `통과 ${R.length}개 항목 — 한 화면 편집기 · 연결 거부 재현 방지 · 두 번 눌러 고치기 · 섹션 갤러리 · 페이지 프롬프트 · 코드 블록 · 기본 정보 · 게시본`);
  process.exit(bad.length ? 1 : 0);
})();
