'use strict';
/* v49 QA 1 — 운영자 시나리오(기관 유형 10종 × 정운영자 · 부운영자 · 교수자)
   ① 역할별로 보이는 모든 탭을 실제로 열어 빈 화면 · 오류 문구 · 페이지 오류가 없는지(동선 끊김)
   ② 권한 누수: 교수자는 설정 · 수납 · 매출 · 홈페이지 등(TEACH_NO), 부운영자 · 교수자는 정운영자 전용 메뉴로 직접 이동해도 막힘
   ③ 보이는 화면 안의 이동 버튼(data-act=go)이 그 역할에서 막힌 화면을 가리키지 않음(눌러도 안 가는 버튼 = 동선 끊김)
   ④ 여정: 가입(createOrg) → 시작 → 과정 만들기 → 학습자 등록 → 운영 → 리포트(현황) → 설정
   사용: node tests/ui/qa49-1.js  (PORT 고정 불필요 · 정적 서버 임의 포트) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json' };
const TYPES = [['k12'], ['adult'], ['corp'], ['lifelong'], ['voc'], ['univ', 'lite'], ['univ', 'lms'], ['public', 'citizen'], ['public', 'facility'], ['public', 'staff']];
const ROLES = ['owner', 'sub', 'teacher'];
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.error('✗', m, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };
const BAD = /문제가 생겼습니다|TypeError|ReferenceError|NaN|undefined|\[object Object\]|님님|null님/;

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
  await p.goto(base + '/index.html'); await p.waitForTimeout(300);
  for (const [ty, ed] of TYPES) for (const role of ROLES) {
    const tag = `${ty}${ed ? '/' + ed : ''} ${role}`; const e0 = errs.length;
    const r = await p.evaluate(async ([ty, ed, role, BADs]) => {
      const BAD = new RegExp(BADs); const W = ms => new Promise(k => setTimeout(k, ms)); const o = { empty: [], bad: [], dead: [], leak: [], tabs: [], toastErr: [] };
      localStorage.setItem('didisam.emptyStart', '0'); createOrg(ty, '운영자 점검', ed); render(); await W(80);
      S.me.role = role; save && save(); render();
      const blocked = id => { if (MENU[id] && menuHid(id)) return true; if (MENU[id]?.owner && role !== 'owner') return true; if (role === 'teacher' && TEACH_NO.includes(id)) return true; return false; };
      const all = [...S.nav.ws.flatMap(w => wsTabs(w))]; o.tabs = all;
      for (const id of [...all, 'settings']) {
        try { go(id); render(); } catch (e) { o.bad.push(id + ': throw ' + e.message); continue; } await W(60);
        const m = document.querySelector('#main'); const tx = m ? m.innerText : '';
        if ((CUR.tab || CUR.ws) !== id && !(id === 'settings' && CUR.ws === 'settings')) o.dead.push(`${id} → ${CUR.ws}/${CUR.tab}`);
        /* 교수자 설정 = 내 계정만(session.js) — 메뉴 구성 · 플랜 · 데이터 같은 기관 설정이 보이면 누수 */
        if (id === 'settings' && role === 'teacher' && (/메뉴 구성|플랜 · 결제|기관 유형|데이터 JSON/.test(tx) || document.querySelector('#main [data-act=sl-menu], #main [data-act=type-chg], #main [data-act=data-export]'))) o.leak.push('settings: 기관 설정 노출');
        if (tx.trim().length < 20) o.empty.push(id);
        const mm = tx.match(BAD); if (mm) { const i = tx.indexOf(mm[0]); o.bad.push(`${id}: «${tx.slice(Math.max(0, i - 40), i + 30).replace(/\s+/g, ' ')}»`); }
        /* 화면 안 이동 버튼이 막힌 곳을 가리키는지 */
        m && m.querySelectorAll('[data-act=go][data-v]').forEach(b => { const v = b.dataset.v; const r0 = (typeof resolve === 'function') ? resolve(v) : { tab: v }; const t = r0.tab || v; if (b.checkVisibility() && (blocked(t) || (role === 'teacher' && (t === 'settings' || r0.ws === 'settings' || TEACH_NO.includes(r0.ws)))) && !b.closest('#myaBtn, .mya')) o.dead.push(`${id}: 버튼 «${b.textContent.trim().slice(0, 20)}» → ${v}`); });
      }
      /* 권한 누수: 직접 이동 */
      const probe = [...Object.keys(MENU), 'settings'];
      for (const id of probe) { const shouldBlock = (role === 'teacher' && TEACH_NO.includes(id) && id !== 'settings') || (MENU[id]?.owner && role !== 'owner');
        if (!shouldBlock) continue; try { go(id); render(); } catch (e) { } await W(10); if ((CUR.tab === id) || (id === 'settings' && CUR.ws === 'settings')) o.leak.push(id); }
      /* 레일 · 탭 줄에 막힌 메뉴가 보이는지 */
      go('home'); render(); await W(30);
      document.querySelectorAll('[data-act=go][data-v]').forEach(b => { if (!b.closest('#main') && b.checkVisibility()) { const v = b.dataset.v; if ((role === 'teacher' && TEACH_NO.includes(v) && v !== 'settings') || (MENU[v]?.owner && role !== 'owner')) o.leak.push('rail:' + v); } });
      /* 기관 전체 작업(정운영자 전용): 부운영자 · 교수자가 눌러도 실행되지 않음 */
      if (role !== 'owner') { const t0 = S.org.type; let dl = 0; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) dl++; else oc.call(this); };
        try { ACT['data-export'](); ACT['dr-yaml'] && ACT['dr-yaml'](); ACT['type-chg']({ dataset: { v: t0 === 'corp' ? 'k12' : 'corp' } }); ACT['reset-all'](); } finally { HTMLAnchorElement.prototype.click = oc; }
        const A0 = JSON.stringify(S.admins); const a2 = (S.admins || []).find(a => a.role !== 'owner') || {};
        try { ACT['adm-role']({ dataset: { v: a2.id }, value: 'owner' }); ACT['adm-del'] && ACT['adm-del']({ dataset: { v: a2.id } }); ACT['adm-owner'] && ACT['adm-owner']({ dataset: { v: a2.id } }); ACT['mb-tcls'] && ACT['mb-tcls']({ dataset: { v: a2.id } }); } catch (e) { }
        if (JSON.stringify(S.admins) !== A0) o.leak.push('운영자 권한 변경 · 삭제 실행');
        const m = document.querySelector('#modal .modal'); if (dl || m) o.leak.push(`정운영자 전용 작업 실행(내려받기 ${dl} · 확인 창 ${m ? m.getAttribute('aria-label') : ''})`); closeModal(); }
      S.me.role = 'owner'; go('home'); render(); return o; }, [ty, ed, role, BAD.source]);
    ok(!r.leak.length, `${tag}: 권한 누수 없음`, r.leak);
    ok(!r.empty.length, `${tag}: 빈 화면 없음`, r.empty);
    ok(!r.bad.length, `${tag}: 오류 문구 없음`, r.bad);
    ok(!r.dead.length, `${tag}: 끊긴 이동 없음`, r.dead);
    ok(errs.length === e0, `${tag}: 페이지 오류 없음`, errs.slice(e0, e0 + 3));
    if (process.env.V) console.log(tag, r.tabs.join(','));
  }
  /* ④ 빈 기관 여정(정운영자): 가입 → 시작 → 과정 만들기 창 → 학습자 초대(대학은 학번 등록) → 현황 → 설정 */
  for (const [ty, ed] of TYPES) { const tag = `여정 ${ty}${ed ? '/' + ed : ''}`; const e0 = errs.length;
    const r = await p.evaluate(async ([ty, ed, BADs]) => { const BAD = new RegExp(BADs); const W = ms => new Promise(k => setTimeout(k, ms)); const o = { bad: [] };
      localStorage.setItem('didisam.emptyStart', '1'); createOrg(ty, '빈 기관 점검', ed); render(); await W(80); S.me.role = 'owner';
      const chk = n => { const tx = (document.querySelector('#main') || {}).innerText || ''; const mm = tx.match(BAD); if (mm) o.bad.push(n + ': ' + mm[0]); return tx; };
      o.empty = (S.classes || []).length === 0; go('home'); render(); await W(60); o.home = chk('home').trim().length > 20;
      ACT['cls-new']({ dataset: {} }); await W(150); o.cf = !!document.querySelector('#modal .modal, .cf, [class*=cf-], .wz'); closeModal && closeModal(); if (window.CF && CF.close) try { CF.close(); } catch (e) { } await W(30);
      go('members'); render(); await W(40); chk('members'); ACT['mem-invite']({ dataset: {} }); await W(120); o.inv = !!document.querySelector('#modal .modal') || CUR.tab === 'enroll'; closeModal();
      go('dash'); render(); await W(60); o.dash = chk('dash').trim().length > 20; go('settings'); render(); await W(60); o.set = chk('settings').trim().length > 20;
      localStorage.setItem('didisam.emptyStart', '0'); return o; }, [ty, ed, BAD.source]);
    ok(r.empty && r.home, `${tag}: 빈 기관 시작 화면`, r); ok(r.cf, `${tag}: 과정 만들기 창 열림`, r); ok(r.inv, `${tag}: 학습자 초대 · 등록 진입`, r);
    ok(r.dash && r.set, `${tag}: 현황 · 설정 화면`, r); ok(!r.bad.length, `${tag}: 빈 기관 오류 문구 없음`, r.bad); ok(errs.length === e0, `${tag}: 페이지 오류 없음`, errs.slice(e0, e0 + 3)); }
  /* ⑤ 평생교육원 운영 요건 체크리스트: [설정]이 항목별 고칠 화면으로 바로 감 · 교수자에게는 이동 버튼 없음 */
  { const r = await p.evaluate(async () => { const W = ms => new Promise(k => setTimeout(k, ms)); localStorage.setItem('didisam.emptyStart', '0'); createOrg('lifelong', '요건 점검'); S.me.role = 'owner'; S.settings.terms.tos = ''; S.settings.terms.privacy = ''; S.settings.footer.biz = ''; render();
      const o = {}; const hop = async i => { go('lifelong'); render(); await W(60); const b = document.querySelector(`#main [data-act=ll-fix][data-v="${i}"]`); if (!b) return 'no-btn'; b.click(); await W(120); return CUR.ws + '|' + (document.querySelector('#main') || {}).innerText.slice(0, 3000); };
      const a = await hop(1); o.tos = /^settings\|/.test(a) && /이용약관/.test(a) && /새 버전으로 저장/.test(a); const b = await hop(5); o.priv = /^settings\|/.test(b) && /개인정보 처리방침/.test(b) && UI.trm === 'privacy'; const c = await hop(6); o.foot = /^settings\|/.test(c) && /SEO/.test(c);
      S.me.role = 'teacher'; go('lifelong'); render(); await W(60); o.tBtn = document.querySelectorAll('#main [data-act=ll-fix], #main [data-act=go][data-v=settings]').length; S.me.role = 'owner'; go('home'); return o; });
    ok(r.tos && r.priv && r.foot, '평생교육원 체크리스트 [설정] → 약관 · 처리방침 · 홈페이지 설정으로 바로 이동', r); ok(r.tBtn === 0, '평생교육원 체크리스트: 교수자에게 설정 이동 버튼 없음', r); }
  await br.close(); srv.close();
  console.log(`qa49-1: ${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
