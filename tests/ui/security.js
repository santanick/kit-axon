'use strict';
/* 디디쌤 가디언 · 운영 › 보안 화면 점검 — owner 보임 · 교수자/부운영자 숨김 · 화면 7종 렌더 · 승인 흐름(재인증 · 2인) · 휴대폰 승인(1회용 15분) · 390px 넘침 0 · 다크 · AI SAM
   사용: node tests/ui/security.js (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.json': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗', m); } };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(k => srv.once('listening', k)); const B = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(); const errs = [];
  const open = async (opt) => { const ctx = await browser.newContext(opt); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(B + '/index.html', { waitUntil: 'load' }); return { ctx, p }; };
  try {
    /* ① 권한: 정운영자만 운영 › 보안 */
    { const { ctx, p } = await open();
      const R = await p.evaluate(() => { const out = {}; for (const ty of ['univ', 'corp', 'k12', 'voc']) { createOrg(ty, '점검'); render(); const r = {}; for (const role of ['owner', 'sub', 'teacher']) { S.me.role = role; render(); r[role] = wsTabs('ops').includes('security'); } S.me.role = 'sub'; go('security'); r.subGo = CUR.tab; r.subView = VIEWS.security(); S.me.role = 'owner'; out[ty] = r; }
        out.rail = S.nav.ws; out.rail0 = presetNav(S.org.type).ws.length; delete S.nav.tabs.ops; S.nav.tabs.ops = []; upgradeState(); out.upg = wsTabs('ops').includes('security'); return out; });
      for (const ty of ['univ', 'corp', 'k12', 'voc']) { ok(R[ty].owner, ty + ' owner 보임'); ok(!R[ty].sub && !R[ty].teacher, ty + ' sub/teacher 숨김'); ok(R[ty].subGo !== 'security' && /산타 관리자만|정운영자만/.test(R[ty].subView), ty + ' sub 직접 이동 차단'); }
      ok(!R.rail.includes('security') && !R.rail.includes('sec'), '레일 칸 그대로 ' + R.rail); ok(R.upg, 'upgradeState로 기존 사용자 메뉴 추가');
      await ctx.close(); }
    /* ② 화면 렌더 · 승인 흐름 · 차단 해제 · 대책 카드 · AI SAM */
    { const { ctx, p } = await open();
      const R = await p.evaluate(async () => { const r = {}; createOrg('univ', '점검'); go('security'); const T = () => document.querySelector('#main').innerText;
        const views = { home: /보안 점수/, board: /우선순위 점수/, prs: /필요 인원/, feed: /위협 인텔/, cards: /CARD-0012/, kill: /dry-run/, audit: /감사 기록/, inc: /신고 · 통지 판단 기한/ };
        r.views = {}; for (const [k, re] of Object.entries(views)) { UI.sec = k; render(); r.views[k] = re.test(T()) && !/화면을 표시하는 중 문제/.test(T()); }
        r.more = !!document.querySelector('details.sec-more[open]'); UI.sec = 'home'; render(); r.tabs = [...document.querySelectorAll('#main [data-key="sec"][role="tab"]')].length;
        r.cve = /CVE-2026-XXXXX/.test(document.body.innerText) || (UI.sec = 'board', render(), /CVE-2026-XXXXX/.test(T()));
        UI.sec = 'prs'; UI.secPr = '412'; render(); const t = T(); r.prFields = ['근거 · 영향', '변경 파일', '검증 결과', '롤백', '필요 인원 2명', '쉬운 말 요약'].every(x => t.includes(x));
        document.querySelector('[data-act="sec-approve"][data-v="412"]').click(); r.modal = /재인증/.test(document.querySelector('#modal').innerText);
        document.querySelector('#modal [data-mact="ok"]').click(); r.needAgree = !!document.querySelector('#modal');
        document.querySelector('#secAg').checked = true; document.querySelector('#modal [data-mact="ok"]').click(); render(); r.after412 = /승인 완료/.test(T());
        UI.secPr = '413'; render(); document.querySelector('[data-act="sec-approve"][data-v="413"]').click(); document.querySelector('#secAg').checked = true; document.querySelector('#modal [data-mact="ok"]').click(); render(); r.after413 = /1\/2 승인/.test(T()) && !!document.querySelector('[data-act="sec-approve"][data-v="413"]:not([disabled])');
        UI.secPr = '414'; render(); r.unverified = !!document.querySelector('[data-act="sec-approve"][data-v="414"][disabled]');
        UI.sec = 'kill'; render(); r.ttl = /TTL 240분/.test(T()) && /3 \/ 3회/.test(T()); r.noTrigger = !document.querySelector('[data-act^="sec-kill"]');
        document.querySelector('[data-act="sec-release"]').click(); document.querySelector('#secRl').value = '오탐 확인'; document.querySelector('#modal [data-mact="ok"]').click(); render(); r.released = /진행 중인 차단이 없습니다/.test(T()) && /사람 해제/.test(T());
        UI.sec = 'feed'; render(); document.querySelector('[data-act="sec-card"]').click(); r.card = /CARD-0013/.test(T());
        /* 사고 대응(F8): 단계 6개 · 72시간 남은 시간 · 결정(사람) · 단계 기록 · 초안 복사(제34조 항목) */
        UI.sec = 'inc'; render(); r.incSteps = document.querySelectorAll('.sec-steps li').length === 6 && document.querySelectorAll('.sec-steps li.ok').length === 2 && /2일 \d+시간 \d+분 남음/.test(T()) && document.querySelectorAll('[data-act="sec-inc-dec"]').length === 4;
        document.querySelector('[data-act="sec-inc-dec"][data-k="notify"]').click(); document.querySelector('#secIdn').value = '대표님 결정'; document.querySelector('#modal [data-mact="ok"]').click(); render(); r.incDec = /통지 결정 기록됨/.test(T()) && /정보주체 통지 · 하기로 함/.test(T());
        document.querySelector('[data-act="sec-inc-step"]').click(); document.querySelector('#secIp').value = 'recover'; document.querySelector('#secIn').value = '키 재발급'; document.querySelector('#modal [data-mact="ok"]').click(); render(); r.incStep = document.querySelectorAll('.sec-steps li.ok').length === 3 && /키 재발급/.test(T());
        document.querySelector('[data-act="sec-inc-draft"][data-k="notify"]').click(); await new Promise(x => setTimeout(x, 30)); const dr = (document.querySelector('#secDr') || {}).value || ''; r.incDraft = ['유출된 개인정보 항목', '시점과 그 경위', '피해를 최소화', '대응 조치', '피해 구제', '연락처', '대표님 · 부대표'].every(k => dr.includes(k)) && !/개발 총괄/.test(dr); ACT['modal-close'] ? ACT['modal-close']() : (document.querySelector('#modal [data-mact="c"]') || { click() { } }).click();
        UI.sec = 'audit'; render(); r.audit = /PR #412 승인/.test(T());
        const a = answer('보안 상태 알려줘'); r.sam = /보안 상태는 정상/.test(a.text) && /승인 대기 수정 PR/.test(a.text) && a.btn && a.btn.act === 'sec-open';
        S.me.role = 'teacher'; r.samT = /산타 관리자만|정운영자만/.test(answer('보안 상태 알려줘').text); S.me.role = 'owner';
        return r; });
      Object.entries(R.views).forEach(([k, v]) => ok(v, '화면 렌더 ' + k)); ok(R.tabs === 4 && R.more, '위쪽 탭 4 + 더 보기'); ok(R.cve, '가상 CVE 표기');
      ok(R.prFields, '승인함 근거 · 영향 · 파일 · 테스트 · 롤백 · 필요 인원'); ok(R.modal && R.needAgree, '재인증 · 동의 없으면 승인 안 됨');
      ok(R.after412, '#412 2인 완료 → 승인 완료'); ok(R.after413, '#413 1/2 → 대기'); ok(R.unverified, '검증 중 PR 승인 불가');
      ok(R.ttl && R.noTrigger, '긴급 차단 TTL · 남은 횟수 · 발동 버튼 없음'); ok(R.released, '해제는 사람 · 기록'); ok(R.card, '대책 카드 생성'); ok(R.audit, '감사 기록');
      ok(R.incSteps, '사고 대응: 단계 6 · 72시간 남은 시간 · 결정 버튼 4'); ok(R.incDec, '사고 대응: 결정 기록'); ok(R.incStep, '사고 대응: 단계 기록'); ok(R.incDraft, '사고 대응: 통지 초안(제34조 항목)');
      ok(R.sam, 'AI SAM 보안 상태 요약'); ok(R.samT, 'AI SAM 교수자 차단');
      await ctx.close(); }
    /* ③ 390px: 넘침 0 · 휴대폰 승인 화면(44px · 만료) · 다크 */
    { const { ctx, p } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const R = await p.evaluate(async () => { const r = { over: {} }; createOrg('corp', '점검'); go('security'); const W = () => document.documentElement.scrollWidth;
        for (const k of ['home', 'board', 'prs', 'feed', 'inc', 'cards', 'kill', 'audit']) { UI.sec = k; render(); await new Promise(x => setTimeout(x, 30)); const bad = [...document.querySelectorAll('#main .sec *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.right > 391 && !e.closest('.tw'); }).length; r.over[k] = Math.max(0, W() - 390) + bad; }
        UI.sec = 'prs'; UI.secPr = '412'; render(); document.querySelector('[data-act="sec-mobile"][data-v="412"]').click(); await new Promise(x => setTimeout(x, 50));
        const m = document.getElementById('secM'); r.mOpen = !!m && /15:00|14:5\d/.test(m.innerText);
        document.querySelector('[data-act="sec-m-auth"]').click(); const btns = [...document.querySelectorAll('#secM button')]; r.touch = btns.every(b => b.getBoundingClientRect().height >= 44); r.mW = Math.max(0, W() - 390);
        document.getElementById('secMag').checked = true; document.querySelector('[data-act="sec-m-go"]').click(); await new Promise(x => setTimeout(x, 50)); r.mDone = /서버에 기록/.test(document.getElementById('secM').innerText);
        ACT['sec-m-close'](); location.hash = '#sec-approve=413.tok'; await new Promise(x => setTimeout(x, 80)); r.hash = !!document.getElementById('secM');
        ACT['sec-m-close'](); document.querySelector('[data-act="sec-mobile"]').click(); await new Promise(x => setTimeout(x, 30));
        /* 만료: 시계를 16분 뒤로 */ const n0 = Date.now; Date.now = () => n0() + 16 * 60e3; await new Promise(x => setTimeout(x, 1100)); r.expired = /만료/.test(document.getElementById('secM').innerText); const b = document.querySelector('[data-act="sec-m-go"],[data-act="sec-m-auth"]'); r.noBtn = !b; Date.now = n0; ACT['sec-m-close']();
        document.documentElement.dataset.theme = 'dark'; UI.sec = 'home'; render(); const cs = getComputedStyle(document.querySelector('.sec-kpi')); r.darkBg = cs.backgroundColor; r.darkFg = getComputedStyle(document.querySelector('.sec-kpi b')).color;
        UI.sec = 'kill'; render(); r.darkOver = Math.max(0, W() - 390); return r; });
      Object.entries(R.over).forEach(([k, v]) => ok(v === 0, `390px 넘침 0: ${k} (${v})`));
      ok(R.mOpen, '휴대폰 승인 화면 · 1회용 링크 15분 표시'); ok(R.touch, '터치 영역 44px 이상'); ok(R.mW === 0, '휴대폰 승인 넘침 0'); ok(R.mDone, '휴대폰 1탭 승인 기록');
      ok(R.hash, '알림 링크(#sec-approve=)로 열기'); ok(R.expired && R.noBtn, '링크 만료 시 승인 불가');
      ok(R.darkBg !== 'rgb(255, 255, 255)' && R.darkFg !== R.darkBg, '다크 모드 토큰 ' + R.darkBg + ' / ' + R.darkFg); ok(R.darkOver === 0, '다크 390 넘침 0');
      await ctx.close(); }
  } catch (e) { fail++; console.error('✗ 실행 오류', e); }
  ok(!errs.length, '스크립트 오류 없음 ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(`security UI: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
