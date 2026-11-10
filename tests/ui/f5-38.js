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
