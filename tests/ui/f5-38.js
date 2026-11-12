'use strict';
/* v38 F5 회귀: 유형별 노출 · 용어 · 디자인 크기(학습자 웹 · 앱 + 스튜디오 390 공통 부품)
   ① 결제 꺼진 유형(기업 · 공공): 학습자 #my '결제' 탭 · 메뉴 '결제 · 환불 내역 · 내 교재/교구' · 앱 '나' 결제 줄 · AX 튜터 '가격' 인사 · 스튜디오 연결 '토스페이먼츠' 없음
   ② 공공 메뉴 용어: 웹 390 아래 탭 · 앱 아래 탭이 머리 메뉴와 같은 '교육신청 · 참여마당 · 알림마당', 공지 페이지 제목 '알림마당'
   ③ 크기: 앱 아래 탭 글자 12px 이상(360 폭) · 웹 390 아래 탭 12px · 스튜디오 390 레일 12px · 모달 닫기 44px
   ④ 앱: 가입 직후 선생님 고르기 없이 홈 · '나'에 로그아웃 · 기업 메뉴에 캘린더 · 공공 게시판 기본 켬 · 메뉴 찾기 '참여마당 · 캘린더'
   ⑤ 문구: 이름 없는 인사 '님, 반갑습니다' 없음 · 조사 · 수료증 '대표 ○○○' 없음 · 토스트 한 번에 하나
   사용: node tests/ui/f5-38.js */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(ok => srv.once('listening', ok)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const br = await chromium.launch(); const fails = []; const errs = []; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m); };
  async function org(type) {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    const op = await ctx.newPage(); op.on('pageerror', e => errs.push(`op ${type}: ${e.message}`)); op.on('dialog', d => d.accept());
    await op.goto(base + 'index.html'); await op.waitForFunction(() => typeof createOrg === 'function');
    await op.evaluate(t => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = false; createOrg(t, '점검 기관'); }, type);
    await op.waitForFunction(() => window.S && S.org); await op.waitForTimeout(600);
    await op.evaluate(() => { try { closeModal(); } catch (e) { } S.classes.forEach(c => { if (c.status === '운영중') c.open = '전체'; }); save(); });
    const code = await op.evaluate(() => { const c = lxDemo(); (typeof smPublish === 'function' ? smPublish : ACT['ls-pub'])(); return c; }); await op.waitForTimeout(250);
    const pm = await op.$('#modal [data-mact=ok]'); if (pm) await pm.click(); await op.waitForTimeout(200);
    const tid = await op.evaluate(() => DREG.cur()); return { ctx, op, code, tid };
  }
  const login = async (p, code) => { await p.evaluate(async c => { await LR.api.login(c.sid, c.code); lrender(); }, code); await p.waitForTimeout(400); if (await p.evaluate(() => location.hash === '#consent')) { await p.check('#lcConsent [data-cn=all]'); await p.click('#lcConsent button[type=submit]'); await p.waitForTimeout(500); } };
  const go = async (p, h, w = 450) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(w); };

  /* ── 기업: 결제 흔적 · 스튜디오 연결 · 캘린더 · 390 크기 ── */
  { const { ctx, op, code, tid } = await org('corp');
    const st = await op.evaluate(() => ({ cal: menuOn('calendar'), toss: typeof cnIds === 'function' && cnIds().includes('toss'), pay: mbPayOn() }));
    ok(!st.pay && !st.toss, '기업(결제 꺼짐): 스튜디오 연결 목록에 토스페이먼츠 없음');
    ok(st.cal, '기업: 캘린더 메뉴 기본 켬');
    await op.evaluate(() => { S.settings.payOn = true; }); ok(await op.evaluate(() => cnIds().includes('toss')), '결제를 켜면 토스페이먼츠 카드가 다시 보임'); await op.evaluate(() => { delete S.settings.payOn; save(); });
    await op.evaluate(() => ACT['ux-find']()); await op.fill('#modal .uxq', '캘린더'); await op.waitForTimeout(150);
    ok(await op.evaluate(() => [...document.querySelectorAll('#modal .uxfl button')].some(b => !b.hidden)), '메뉴 찾기 \'캘린더\' 결과 있음'); await op.evaluate(() => closeModal());
    await op.evaluate(() => { toast('첫 안내'); toast('둘째 안내'); }); ok(await op.evaluate(() => document.querySelectorAll('#toasts .toast').length === 1), '스튜디오 안내는 한 번에 하나');
    await op.setViewportSize({ width: 390, height: 844 }); await op.evaluate(() => { go('home'); render(); }); await op.waitForTimeout(400);
    const rail = await op.evaluate(() => [...document.querySelectorAll('.brail .ri')].filter(e => e.getBoundingClientRect().width > 0).map(e => parseFloat(getComputedStyle(e).fontSize)));
    ok(rail.length && Math.min(...rail) >= 12, `스튜디오 390 레일 글자 12px 이상 (${Math.min(...rail)})`);
    await op.evaluate(() => modal('점검', '<p>내용</p>', [{ id: 'c', label: '닫기' }])); await op.waitForTimeout(150);
    const xh = await op.evaluate(() => { const x = document.querySelector('#modal .mh .x'); return x ? x.getBoundingClientRect().height : 99; }); ok(xh >= 44, `스튜디오 390 모달 닫기 44px 이상 (${xh})`); await op.evaluate(() => closeModal());

    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('ln corp: ' + e.message)); await p.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await p.setViewportSize({ width: 390, height: 844 }); await p.goto(base + `learner.html?t=${tid}#home`); await p.waitForTimeout(1500); await p.waitForFunction(() => typeof LR !== 'undefined' && LR.site);
    ok(await p.evaluate(() => lPayOff()), '학습자: 게시본 결제 꺼짐(lPayOff)');
    await login(p, code); await go(p, '#my', 700);
    const my = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.lux-tabs [data-lux-tab]')].map(b => b.textContent.trim()), tab: [...document.querySelectorAll('nav.tabbar a span, nav.tabbar button span')].map(s => parseFloat(getComputedStyle(s.parentElement).fontSize)), hi: document.querySelector('#lm').textContent.includes('님, 반갑습니다') && !LR.me.nick }));
    ok(my.tabs.length && !my.tabs.includes('결제'), '학습자 #my: 결제 탭 없음 — ' + my.tabs.join(' · '));
    ok(my.tab.length && Math.min(...my.tab) >= 12, `웹 390 아래 탭 글자 12px 이상 (${Math.min(...my.tab)})`);
    await p.click('[data-lux="menu"]'); await p.waitForTimeout(200);
    const sh = await p.evaluate(() => (document.getElementById('luxSheet') || {}).textContent || ''); ok(!/결제 · 환불|교재\/교구/.test(sh), '전체 메뉴: 결제 · 교재 링크 없음');
    await p.evaluate(() => { toast('하나'); toast('둘'); }); ok(await p.evaluate(() => document.querySelectorAll('.ltoast').length === 1), '학습자 안내는 한 번에 하나');
    /* 앱 */
    const a = await ctx.newPage(); a.on('pageerror', e => errs.push('app corp: ' + e.message)); await a.setViewportSize({ width: 360, height: 780 });
    await a.goto(base + `learner.html?t=${tid}&app=1#home`); await a.waitForFunction(() => typeof LR !== 'undefined' && LR.site); await a.waitForTimeout(700);
    ok(await a.evaluate(() => document.body.classList.contains('lapp')), '?app=1이 저장된 기존 화면 선택보다 우선');
    ok(!(await a.$('.ap-pick')) && !!(await a.$('.ap-home')), '앱: 선생님 고르기 없이 기본 선생님으로 홈');
    const nav = await a.evaluate(() => [...document.querySelectorAll('.ap-nav a span')].map(s => parseFloat(getComputedStyle(s).fontSize)));
    ok(nav.length && Math.min(...nav) >= 12, `앱 360 아래 탭 글자 12px 이상 (${Math.min(...nav)})`);
    ok(await a.evaluate(() => !/가격/.test((document.querySelector('.ap-home') || {}).textContent || '')), '앱 홈: 가격 안내 없음');
    await login(a, code); await go(a, '#acct', 700); const me = await a.evaluate(() => ({ t: (document.querySelector('.ls-me') || {}).textContent || '', out: !!document.querySelector('.ls-me [data-lact=logout]'), fs: !!document.querySelector('[data-lfs=toggle]') }));
    ok(!/결제 · 환불/.test(me.t), '앱 \'나\': 결제 · 환불 줄 없음'); ok(me.out, '앱 \'나\': 로그아웃 바로 있음'); ok(me.fs, '앱 \'나\': 글자 크게 보기');
    await a.click('[data-lfs=toggle]'); await a.waitForTimeout(150); ok(await a.evaluate(() => document.documentElement.classList.contains('lfs-lg')), '글자 크게 켜짐(모든 화면)'); await a.click('[data-lfs=toggle]');
    const tut = await a.evaluate(() => { const f = LSAM.find('글씨 크게 하려면?'); const g = LSAM.find('환불은 어떻게 해요?'); return [f && f.r().t, g && g.r().t]; });
    ok(tut[0] && /글자/.test(tut[0]) && tut[1] && /환불 절차가 없어요/.test(tut[1]), 'AX 튜터: 글씨 크게 · 환불 질문은 안내로 답함');
    await ctx.close(); }

  /* ── 공공: 메뉴 용어 · 게시판 기본 켬 · 시민 문구 ── */
  { const { ctx, op, code, tid } = await org('public');
    ok(await op.evaluate(() => menuOn('community')), '공공: 게시판(참여마당) 메뉴 기본 켬');
    await op.evaluate(() => ACT['ux-find']()); await op.fill('#modal .uxq', '참여마당'); await op.waitForTimeout(150);
    ok(await op.evaluate(() => [...document.querySelectorAll('#modal .uxfl button')].some(b => !b.hidden)), '메뉴 찾기 \'참여마당\' 결과 있음'); await op.evaluate(() => closeModal());
    ok(await op.evaluate(() => !/공직자/.test(JSON.stringify(LS_LEVELS.public))), '공공 수준 설명에 공무원 전제 문구 없음');
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('ln pub: ' + e.message)); await p.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await p.setViewportSize({ width: 390, height: 844 }); await p.goto(base + `learner.html?t=${tid}#home`); await p.waitForFunction(() => typeof LR !== 'undefined' && LR.site); await p.waitForTimeout(700);
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 0), '공공 웹 390 홈: 가로 넘침 없음');
    const tb = await p.evaluate(() => [...document.querySelectorAll('nav.tabbar a span')].map(s => s.textContent.trim()));
    ok(tb.includes('교육신청'), '웹 390 아래 탭 용어 = 머리 메뉴(교육신청): ' + tb.join(' · '));
    await go(p, '#notice', 600); ok(await p.evaluate(() => /알림마당/.test((document.querySelector('#lm h1') || {}).textContent || '')), '공지 페이지 제목 = 알림마당');
    await login(p, code); await go(p, '#cert', 500); await go(p, '#badges', 600);
    ok(await p.evaluate(() => !/0종 모두 받으면|배지 지갑 0\/0/.test(document.querySelector('#lm').textContent)), '배지 없는 기관의 수료증 화면에 배지 로드맵 없음');
    await go(p, '#my', 600); ok(await p.evaluate(() => !/공직자|행정 · 기획 첫 실습/.test(document.querySelector('#lm').textContent)), '공공 학습자 #my: 공무원 전제 문구 · 영상 없는 예시 추천 없음');
    const a = await ctx.newPage(); await a.setViewportSize({ width: 360, height: 780 }); await a.goto(base + `learner.html?t=${tid}&app=1#home`); await a.waitForFunction(() => typeof LR !== 'undefined' && LR.site); await a.waitForTimeout(800);
    const an = await a.evaluate(() => [...document.querySelectorAll('.ap-nav a span')].map(s => s.textContent.trim())); ok(an.includes('교육신청'), '앱 아래 탭 용어 = 머리 메뉴: ' + an.join(' · '));
    await login(a, code); await go(a, '#comm', 700); ok(await a.evaluate(() => [...document.querySelectorAll('a[href^="#write"]')].some(x => x.getBoundingClientRect().height > 0)), '앱 게시판(참여마당): 글쓰기 링크가 보임');
    ok(await a.evaluate(() => !/학원\(|공공기관 ·/.test((document.querySelector('.ap-org') || {}).textContent || '')), '앱 기관 칩에 내부 유형 표기 없음');
    await ctx.close(); }

  /* ── R2: 꺼진 기능 숨김 · 없는 주소 · 게시판 글쓰기 · 캘린더 바로 반영 · 아이콘 버튼 이름 · 공통 크기 ── */
  { const { ctx, op, code, tid } = await org('public');
    await op.evaluate(() => { const L = (S.cal || CAL()).ev || (S.cal.ev = []); }); 
    const calOk = await op.evaluate(() => { try { ACT['cx-add']({ dataset: { v: today() } }); const w = document.querySelector('#slSheet'); w.querySelector('[name=cxT]').value = 'R2 공개 일정'; const c = w.querySelector('[name="cxP"]'); if (c) c.checked = true; ACT['cx-save']({ dataset: { v: '' } }); return (S.lsite.pub.calx || []).some(e => e.title === 'R2 공개 일정'); } catch (e) { return 'ERR ' + e.message; } });
    ok(calOk === true, 'A7: 게시 뒤 추가한 수강생 공개 일정이 게시본 일정에 바로 반영 ' + (calOk === true ? '' : calOk));
    { await op.setViewportSize({ width: 1280, height: 800 }); await op.evaluate(() => { go('home'); render(); }); await op.waitForTimeout(400);
      const top = await op.evaluate(() => [...document.querySelectorAll('.topr .uxfind, .topr .btn, .topr > button, .bprog, .aih-chips .chip')].filter(b => b.getBoundingClientRect().width > 0).map(b => Math.round(b.getBoundingClientRect().height)));
      ok(top.length && Math.min(...top) >= 40, 'R3 U14: PC 스튜디오 머리 · 홈 주 버튼 40px 이상 ' + top.join(','));
      await op.evaluate(() => { go('site'); render(); }); await op.waitForTimeout(700);
      const st = await op.evaluate(() => [...document.querySelectorAll('.hps-flow li button')].map(b => ({ n: (b.querySelector('i') || {}).textContent, t: b.textContent.trim() })));
      ok(!st.length || st.every((x, i) => x.n === String(i + 1)), 'R3 A20: 사이트 편집기 단계는 모두 번호 + 이름 ' + st.map(x => x.t).join(' · ')); }
    await op.setViewportSize({ width: 390, height: 844 }); await op.evaluate(() => { go('members'); render(); }); await op.waitForTimeout(400);
    const un = await op.evaluate(() => [...document.querySelectorAll('#main button, #main a.btn')].filter(b => b.getBoundingClientRect().width > 0 && !b.getAttribute('aria-label') && !b.title && !(b.textContent || '').replace(/\s+/g, '').length).map(b => b.dataset.act || b.className));
    ok(!un.length, 'C12: 명단 화면 아이콘 버튼 모두 이름 있음 ' + un.join(','));
    const sz = await op.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden'; }; const B = [...document.querySelectorAll('button, a.btn, [role=tab]')].filter(vis).filter(b => !b.closest('table') && !b.matches('.sl-sw,[role=switch]')).filter(b => b.getBoundingClientRect().height < 43.5).map(b => (b.dataset.act || b.className) + ':' + Math.round(b.getBoundingClientRect().height)); const F = [...document.querySelectorAll('.brail .ri, #main small, .mini')].filter(vis).filter(e => parseFloat(getComputedStyle(e).fontSize) < 12.9).map(e => e.className + ':' + getComputedStyle(e).fontSize); return { B, F }; });
    ok(!sz.B.length, 'R2 크기: 스튜디오 390 버튼 44px 이상 ' + sz.B.slice(0, 6).join(' '));
    ok(!sz.F.length, 'R2 크기: 스튜디오 390 글자 13px 이상 ' + sz.F.slice(0, 6).join(' '));
    const tiny = await op.evaluate(async () => { const out = []; const scan = () => document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('.sl-logos')) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden') return; const t = [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()); if (t && parseFloat(cs.fontSize) < 11.95) out.push(e.className + ':' + cs.fontSize); });
      const c = S.classes[0]; UI.cls = c.id; UI.clsT = 'curriculum'; go('class'); render(); await new Promise(r => setTimeout(r, 400)); scan(); go('home'); render(); await new Promise(r => setTimeout(r, 300)); scan(); return [...new Set(out)]; });
    ok(!tiny.length, 'R2 단계 숫자 · 보조 글: 스튜디오 390 12px 미만 없음 ' + tiny.slice(0, 6).join(' '));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('ln r2: ' + e.message)); await p.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await p.setViewportSize({ width: 390, height: 844 }); await p.goto(base + `learner.html?t=${tid}#home`); await p.waitForFunction(() => typeof LR !== 'undefined' && LR.site); await login(p, code);
    await go(p, '#my', 700); const my = await p.evaluate(() => { const vis = e => e.getBoundingClientRect().height > 0; return { tabs: [...document.querySelectorAll('#lm nav.mytab a')].filter(vis).map(a => a.textContent.trim()), txt: document.querySelector('#lm').innerText }; });
    ok(!my.tabs.includes('디지털북') && !my.tabs.includes('배지') && !/배지 지갑|0종 모두 받으면/.test(my.txt), 'R2 노출: 배지 · 디지털북 없는 기관 #my 탭 · 배지 지갑 숨김 ' + my.tabs.join(' · '));
    await go(p, '#noti', 500); ok(await p.evaluate(() => location.hash === '#inbox'), 'U20: #noti → 알림(#inbox)');
    await go(p, '#calendar', 300);
    await p.evaluate(() => { const k = 'didisam.room.' + LR.tid + '.lpx'; const Q = JSON.parse(localStorage.getItem(k) || '[]'); Q.push({ id: 'xr2', type: 'post-new', at: new Date().toISOString(), who: 'other-learner', data: { id: 'po_r2', board: '커뮤니티', kind: '이야기', title: 'R2 다른 학습자 글', body: '안녕하세요' } }); localStorage.setItem(k, JSON.stringify(Q)); window.__c17 = lcPosts().some(x => x.title === 'R2 다른 학습자 글'); }); /* 같은 기관 운영자 창이 열려 있으면 요청함을 곧바로 가져가므로 넣은 직후에 본다 */
    { const r = await p.evaluate(() => ({ ok: window.__c17, mode: LR.mode, me: LR.me && LR.me.sid, n: lcPosts().length })); ok(r.ok, 'C17: 데모에서 같은 기관 다른 학습자 글이 바로 보임 ' + (r.ok ? '' : JSON.stringify(r))); }
    const a = await ctx.newPage(); await a.setViewportSize({ width: 390, height: 844 }); await a.goto(base + `learner.html?t=${tid}&app=1#home`); await a.waitForFunction(() => typeof LR !== 'undefined' && LR.site); await login(a, code); await go(a, '#comm', 800);
    const w = a.locator('a[href^="#write"]', { hasText: '글쓰기' }).first(); ok(await w.isVisible(), 'V · L: 앱 게시판 첫 [글쓰기] 버튼이 보임'); await w.click({ timeout: 3000 }); await a.waitForTimeout(300); ok(await a.evaluate(() => /^#write/.test(location.hash)), '앱 [글쓰기] 누르면 글쓰기 화면');
    await go(a, '#ai', 600); /* v39 튜브: 선생님과의 대화(추천 칩)는 AI 튜터 탭(#ai) */ { const ch = await a.evaluate(() => [...document.querySelectorAll('.ap-chip')].filter(b => b.getBoundingClientRect().height > 0).map(b => Math.round(b.getBoundingClientRect().height))); ok(ch.length && Math.min(...ch) >= 48, 'R3 U14: 앱 주 버튼(칩) 48px ' + ch.join(',')); }
    ok(await a.evaluate(() => !/배지 \d+개/.test((document.querySelector('.ap-st') || {}).textContent || '')), 'R3 UL11: 배지 없는 기관 앱 홈에 배지 수 없음');
    await go(a, '#acct', 600); ok(await a.evaluate(() => !/선생님 바꾸기/.test(document.body.innerText)), 'R3 U16: 앱 「나」에 \'선생님 바꾸기\' 없음');
    await go(a, '#comm', 800);
    ok(await a.evaluate(() => !/커뮤니티/.test((document.querySelector('.ap-bar .ap-tt') || {}).textContent || '')), 'P10: 앱 참여마당 화면 제목 ' + await a.evaluate(() => (document.querySelector('.ap-bar .ap-tt') || {}).textContent));
    await ctx.close(); }

  /* ── 문구 · 조사 ── */
  { const { ctx, op } = await org('public');
    ok(await op.evaluate(() => THUMB.detect('바리스타 2급 자격과정').k === 'cafe' && THUMB.detect('제과제빵 기능사').k === 'cook'), '썸네일 분야: 바리스타 → 커피, 제과제빵 → 요리 · 제과');
    ok(await op.evaluate(() => { const c = { status: '운영중', learners: ['a'], curriculum: [], end: '2099-01-01', open: '전체' }; return tStageOf(c).id === 'operate'; }), '강사 스튜디오: 수강생 있는 운영 중 강좌는 \'강의 운영\' 단계');
    ok(await op.evaluate(() => !!(S.lsite.pub && S.lsite.pub.f538)), '게시본 v38 표시');
    await op.evaluate(() => { delete S.lsite.pub.f538; go('site'); render(); }); await op.waitForTimeout(300); ok(!!(await op.$('.f5-repub')), '옛 게시본: 사이트 화면에 \'다시 게시하면 반영됩니다\' 안내'); await op.evaluate(() => { S.lsite.pub.f538 = 1; });
    const cert = await op.evaluate(() => { S.settings.certInfo = Object.assign(S.settings.certInfo || {}, { rep: '' }); ACT['cert-preview'](); const t = (document.querySelector('#modal') || {}).textContent || ''; closeModal(); return t; });
    ok(!/○○○/.test(cert), '수료증 미리보기: 대표 미입력이면 ○○○ 대신 기관명만');
    ok(await op.evaluate(() => AI.j('교육과정', '을') === '을' && AI.j('강사', '과') === '와'), '조사 함수(을/를 · 과/와)');
    await ctx.close(); }

  /* ── 평생교육원 '학습비 반환' 용어 · 초중고 출석부 날짜 ── */
  { const { ctx, code, tid } = await org('lifelong'); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('ln life: ' + e.message)); await p.addInitScript(() => { try { localStorage.setItem('didisam.app.classic', '1'); } catch (e) { } });
    await p.goto(base + `learner.html?t=${tid}#home`); await p.waitForFunction(() => typeof LR !== 'undefined' && LR.site); await login(p, code); await go(p, '#mypay/pay', 700);
    const t = await p.evaluate(() => document.body.innerText); ok(/학습비 반환/.test(t) && !/(^|[^(])환불/.test(t.replace(/학습비 반환\(환불\)/g, '')), '평생교육원 학습자: 환불 → 학습비 반환(운영자와 같은 말)'); await ctx.close(); }
  { const { ctx, op } = await org('k12'); await op.evaluate(() => { go('crmatt'); render(); }); await op.waitForTimeout(400);
    const d = await op.evaluate(() => ((document.querySelector('.k-dd span') || {}).textContent || '').trim()); ok(/^\d{4}\. \d{1,2}\. \d{1,2}\.$/.test(d), `출석부 날짜 한국식 표시 (${d})`); await ctx.close(); }
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 3).join(' | '));
  await br.close(); srv.close();
  console.log(fails.length ? `✗ 실패 ${fails.length}건` : '✓ v38 F5 유형별 노출 · 용어 · 크기 점검 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
