/* v43.5 학습자 「앱 및 서비스 연결」 — 대표님(2026-11-17) 외부 연결 카탈로그 시안 v2 3쪽 · 「기관 연동과 학습자 연동을 구분」
   「나 › 연결 · 알림」(#connect) 맨 위에 학습자가 직접 켜고 끄는 연결을 분야별로 모아 보여 준다(기본 모두 꺼짐).
   - 줄 = 공식 로고(brand.js) · 이름 · 켜짐/꺼짐 · 하는 일 한 줄 · 연결 버튼. 실제 켜기는 원래 화면(구글 캘린더 창 · 알림톡 신청 · 문자 알림 · SNS 연동)으로 보낸다.
   - 기관 유형별: 대학은 학번 · 학과 외 정보를 받지 않으므로 카카오톡 · 문자 · SNS 연동 줄이 없다. 문자 알림은 공단 · 평생교육원만(lsms.js).
   - 개인정보 안내 한 줄: 무엇을 받는지 · 목적 · 끄면 바로 지움. 보호자 계정에는 보이지 않는다(자녀 연결은 따로).
   learner.html에서 lsms.js 다음. lsms.js와 같은 방식으로 그린 뒤 붙인다. */
'use strict';
(() => {
  if (typeof viewPage !== 'function' || typeof LR !== 'object' || typeof lrender !== 'function') return;
  const ty = () => { try { return ((SITE() || {}).org || {}).type || 'adult'; } catch (e) { return 'adult'; } };
  const on = () => { try { return !!(LR.me && LR.me.kind !== 'parent' && route().a === 'connect'); } catch (e) { return false; } };
  const lp = () => LR.lp || {};
  const gcal = () => !!(lp().conn && lp().conn.gcal && lp().conn.gcal.on);
  const phone = () => { try { return !!(typeof laV === 'function' && (laV().ids[LR.me.sid] || {}).phone); } catch (e) { return false; } };
  const sms = () => { try { return !!document.querySelector('.sm43 .sm43-now'); } catch (e) { return false; } };
  const cfg = () => { try { return typeof laCfg === 'function' ? laCfg() : { social: [] }; } catch (e) { return { social: [] }; } };
  const links = () => { try { const a = typeof laFind === 'function' ? laFind(LR.me.sid || LR.me.id) : null; return (a && (a.links || [a.login])) || []; } catch (e) { return []; } };
  const lg = (id, n) => typeof window.brandLogo === 'function' ? window.brandLogo(id, 44, n) : '';
  function rows() { const t = ty(), U = /^univ/.test(t), PH = ['public', 'lifelong'].includes(t); const C = cfg(); const L = links().filter(k => k && k !== 'email' && k !== 'code');
    const G = [['알림 · 일정', [
      { id: 'gcal', n: '내 캘린더(Google)', d: '수업 · 마감 일정이 내 Google 캘린더에 들어가요', st: gcal(), a: `<button type="button" class="lcx-go" data-lai="gcal">${gcal() ? '관리' : '연결'}</button>` },
      { id: 'apple', n: '캘린더 파일(Apple · Outlook)', d: '.ics 파일로 내 휴대폰 캘린더에 넣어요', st: null, a: '<a class="lcx-go" href="#cal">열기</a>' },
      !U && !PH && { id: 'kakao', n: '카카오톡 알림', d: '수업 · 결제 안내를 카카오톡으로 받아요', st: phone(), a: `<a class="lcx-go" href="#acct/phone">${phone() ? '관리' : '신청'}</a>` },
      PH && { id: 'sms', n: '문자 알림', d: '시설 예약 · 강습 알림을 문자로 받아요', st: sms(), a: '<button type="button" class="lcx-go" data-lcx="sms">설정</button>' }]],
    ['로그인', [!U && C.social && C.social.length && { id: C.social.includes('kakao') ? 'kakao' : C.social[0], n: '간편 로그인', d: `${C.social.map(k => ({ kakao: '카카오', naver: '네이버', google: 'Google', apple: 'Apple' })[k] || k).join(' · ')}로 한 번에 들어와요`, st: L.some(k => C.social.includes(k)), a: '<a class="lcx-go" href="#acct">연동</a>' }]]];
    return G.map(([t, R]) => [t, R.filter(Boolean)]).filter(([, R]) => R.length); }
  function html() { const G = rows(); if (!G.length) return ''; const U = /^univ/.test(ty());
    return `<section class="lcx" aria-labelledby="lcxH"><div class="lcx-h"><h2 id="lcxH">앱 및 서비스 연결</h2><span class="lcx-n">${G.reduce((n, [, R]) => n + R.filter(r => r.st).length, 0)}개 켜짐</span></div>
      <p class="mini lcx-sub">${U ? '필요한 것만 직접 켜고 끌 수 있어요. 학번 · 학과 외의 정보는 받지 않아요.' : '필요한 것만 직접 켜고 끌 수 있어요. 기본은 모두 꺼져 있고, 켤 때 무엇을 왜 받는지 먼저 알려 드려요.'}</p>
      ${G.map(([t, R]) => `<div class="lcx-g"><h3>${t}</h3>${R.map(r => `<div class="lcx-r">${lg(r.id, r.n)}<span class="lcx-tx"><b>${esc(r.n)}${r.st === null ? '' : `<em class="${r.st ? 'on' : ''}">${r.st ? '켜짐' : '꺼짐'}</em>`}</b><small>${esc(r.d)}</small></span>${r.a}</div>`).join('')}</div>`).join('')}</section>`; }
  function deco() { try { if (!on()) return; const lm = document.getElementById('lm'); if (!lm) return; const h = html(); lm.querySelectorAll('.lcx-in, .lcx').forEach(x => x.remove()); if (!h) return;
    if (document.body.classList.contains('lapp')) (lm.querySelector('.in, .lc, .ap-conn') || lm).insertAdjacentHTML('afterbegin', h);
    else { /* 웹: 머리(사진 배경) 바로 아래, 본문 폭(.in) 안에 */ const kids = [...lm.children]; const sec = kids.find(x => x.classList.contains('sec')); const w = `<div class="lcx-in">${h}</div>`;
      const body = lm.querySelector('.r4conn .in, .r4conn, .lai-more'); if (body) body.insertAdjacentHTML('afterbegin', w); else if (sec) sec.insertAdjacentHTML('afterend', w); else if (kids[0]) kids[0].insertAdjacentHTML('afterend', w); else lm.insertAdjacentHTML('afterbegin', w); }
    /* 같은 연결을 두 번 보여 주지 않는다: 예전 「연결」 카드 묶음(구글 캘린더 · 카카오톡)은 이 목록으로 대신한다 */
    lm.querySelectorAll('.lai-cc').forEach(c => { const sec = c.closest('.lai-sec, .lai-card, section, .r4-card, .card'); if (sec && !sec.querySelector('.lcx') && !sec.closest('.lcx')) { sec.style.display = 'none'; const par = sec.parentElement; if (par && par !== lm && !par.querySelector('.lcx') && [...par.children].every(x => x.style.display === 'none')) par.style.display = 'none'; } }); } catch (e) { console.error('lconn', e); } }
  { const base = lrender; lrender = function (...a) { const r = base.apply(this, a); deco(); return r; }; }
  addEventListener('hashchange', () => setTimeout(deco, 0));
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lcx="sms"]'); if (!b) return; const c = document.querySelector('.sm43'); if (c) { c.scrollIntoView({ block: 'start', behavior: 'smooth' }); const t = c.querySelector('[data-sms="tog"]'); if (t) setTimeout(() => t.focus({ preventScroll: true }), 300); } });
  const st = document.createElement('style'); st.id = 'lcxCss';
  st.textContent = 'body:not(.lapp) .lcx-in{box-sizing:border-box!important;grid-column:1/-1;width:auto!important;max-width:1200px!important;margin:32px auto -8px!important;padding:0 24px!important}@media (max-width:760px){body:not(.lapp) .lcx-in{padding:0 16px!important}}.lcx{color:var(--ink,#17150F);text-align:left;background:#fff;border:1px solid var(--line,#E7E2D9);border-radius:20px;padding:16px 16px 6px;margin:0 0 16px}.lcx-h{display:flex;align-items:baseline;gap:8px}.lcx-h h2{margin:0;font-size:18px;font-weight:800;color:inherit}.lcx-n{margin-left:auto;font-size:13px;font-weight:700;color:var(--gr700,#00862D)}.lcx-sub{margin:4px 0 4px}'
    + '.lcx-g h3{margin:12px 0 0;font-size:14px;font-weight:800;color:var(--g700,#5C554B)}.lcx-r{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--g100,#F1EDE6);min-height:64px}.lcx-g h3+.lcx-r{border-top:0}'
    + '.lcx-tx{flex:1;min-width:0}.lcx-tx b{color:inherit;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:15px;font-weight:800}.lcx-tx em{font-style:normal;font-size:12px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--g100,#F1EDE6);color:var(--g700,#5C554B)}.lcx-tx em.on{background:var(--gr50,#EAF8EF);color:var(--gr700,#00862D)}'
    + '.lcx-tx small{display:block;font-size:13px;color:var(--muted,#736B5F);line-height:1.45;margin-top:2px}.lcx-go{flex:none;min-width:56px;min-height:44px;display:inline-grid;place-items:center;padding:0 14px;border-radius:999px;border:1.5px solid var(--g300,#E7E2D9);background:#fff;font:inherit;font-size:14px;font-weight:800;color:var(--ink,#17150F);text-decoration:none;cursor:pointer}.lcx-go:hover{border-color:var(--gr600,#00862D);color:var(--gr700,#00862D)}'
    + 'html[data-theme=dark] .lcx,html[data-theme=dark] .lcx-go{background:var(--canvas,#1b1a17)}';
  (document.head || document.documentElement).appendChild(st);
})();
