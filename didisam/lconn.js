/* v43.5 학습자 「앱 및 서비스 연결」 — 대표님(2026-11-17) 외부 연결 카탈로그 시안 v2 3쪽 · 「기관 연동과 학습자 연동을 구분」
   「나 › 연결 · 알림」(#connect) 맨 위에 학습자가 직접 켜고 끄는 연결을 분야별로 모아 보여 준다(기본 모두 꺼짐).
   - 줄 = 공식 로고(brand.js) · 이름 · 켜짐/꺼짐 · 하는 일 한 줄 · 연결 버튼. 실제 켜기는 원래 화면(구글 캘린더 창 · 알림톡 신청 · 문자 알림 · SNS 연동)으로 보낸다.
   - 기관 유형별: 대학은 학번 · 학과 외 정보를 받지 않으므로 카카오톡 · 문자 · SNS 연동 줄이 없다. 문자 알림은 공단 · 평생교육원만(lsms.js).
   - 개인정보 안내 한 줄: 무엇을 받는지 · 목적 · 끄면 바로 지움. 보호자 계정에는 보이지 않는다(자녀 연결은 따로).
   - v43.5 대표님(11-17 10:53) 「앱에서는 AI 튜터와 학습 활동 기준에서 연결해야 되는 서비스가 없어?」 → 「학습 · AI 튜터」 묶음을 맨 위에:
     노트 앱으로 내보내기(Notion · Google Docs — 튜터 학습 계획 · 진도 · 넘긴 질문, .md) · 복습 카드 내보내기(Anki · Quizlet — 내 과정 퀴즈, .csv)
     · GitHub 저장소(코딩 과정 — 튜터가 과제 저장소에 맞춰 힌트) · 내 캘린더(튜터 계획 → 일정). 내보내기 파일에 이름 · 연락처는 넣지 않는다.
     운영: Notion · Google Drive OAuth로 바로 저장(서버), GitHub는 공개 저장소 주소만 받는다(토큰 받지 않음).
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
    const code = ['adult', 'voc', 'corp', 'lifelong'].includes(t); /* 대학은 학번 · 학과 외 식별자(GitHub 아이디)도 받지 않는다 */ const gh = (lp().conn || {}).gh;
    const G = [['학습 · AI 튜터', [
      { id: 'notion', n: '노트 앱으로 내보내기', d: 'AI 튜터 학습 계획 · 진도 · 넘긴 질문을 Notion · Google Docs로 가져가요', st: null, a: '<button type="button" class="lcx-go" data-lcx="md">내보내기</button>' },
      { id: 'anki', n: '복습 카드 내보내기', d: '내 과정 퀴즈로 만든 복습 카드를 Anki · Quizlet에 넣어요', st: null, a: '<button type="button" class="lcx-go" data-lcx="csv">내보내기</button>' },
      code && { id: 'github', n: 'GitHub 저장소', d: gh && gh.url ? `${gh.url.replace(/^https:\/\/github\.com\//, '')} · AI 튜터가 코드에 맞춰 힌트를 줘요` : '코딩 과제 저장소를 이어 두면 AI 튜터가 코드에 맞춰 힌트를 줘요', st: !!(gh && gh.on), a: `<button type="button" class="lcx-go" data-lcx="gh">${gh && gh.on ? '관리' : '연결'}</button>` }]],
      ['알림 · 일정', [
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
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
  const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  function mdText() { const S2 = SITE() || {}; const T = lp().tutor || {}; let st = null; try { st = typeof myStats === 'function' ? myStats() : null; } catch (e) { }
    const L = [`# ${(S2.org || {}).name || '디디쌤'} 학습 노트`, '', `${new Date().toLocaleDateString('ko-KR')} 디디쌤에서 내보냈어요.`, '', '## 진행 중인 과정'];
    const C = st ? st.courses.filter(x => x.c) : []; L.push(...(C.length ? C.map(x => `- ${x.c.name} — 진도 ${x.p}%${x.next ? ` · 다음: ${x.next.title}` : ''}`) : ['- 아직 수강 중인 과정이 없어요']));
    L.push('', '## AI 튜터와 세운 학습 계획'); const P = Array.isArray(T.plan) ? T.plan : []; L.push(...(P.length ? P.map(x => `- [ ] ${x.d || ''} · ${x.t || ''}${x.m ? ` (${x.m}분)` : ''}`) : ['- AI 튜터에게 「이번 주 학습 계획 세워 줘」라고 맡겨 보세요']));
    L.push('', '## 선생님께 넘긴 질문'); const A = Array.isArray(T.ask) ? T.ask : []; L.push(...(A.length ? A.slice(0, 20).map(x => `- ${String(x.q || '').replace(/\n/g, ' ')}${x.where ? ` _(${x.where})_` : ''}`) : ['- 아직 없어요']));
    L.push('', '---', '이름 · 연락처 같은 개인정보는 넣지 않았어요.'); return L.join('\n'); }
  function csvText() { const S2 = SITE() || {}; let st = null; try { st = typeof myStats === 'function' ? myStats() : null; } catch (e) { } const pool = []; const seen = new Set();
    const take = c => (c.items || []).filter(i => i.type === 'quiz' && Array.isArray(i.qs)).forEach(i => i.qs.forEach(q => { const qq = String(q.q || '').replace(/^\s*\d+[.)]\s*/, '').trim(); if (!qq || seen.has(qq)) return; seen.add(qq);
      const ans = q.t === 'ox' ? (q.a === 0 || q.a === 'O' || q.a === true ? 'O' : 'X') : Array.isArray(q.opts) && q.opts[q.a] != null ? String(q.opts[q.a]) : String(q.a != null ? q.a : ''); if (ans) pool.push([qq, ans, `${c.name} · ${i.title || ''}`]); }));
    (st && st.courses.length ? st.courses.map(x => x.c).filter(Boolean) : (S2.classes || []).slice(0, 3)).forEach(take);
    const e = v => `"${String(v).replace(/"/g, '""')}"`; return { n: pool.length, text: '\ufeff' + ['앞면(질문),뒷면(정답),출처', ...pool.map(r => r.map(e).join(','))].join('\r\n') }; }
  function ghForm(on) { const r = document.querySelector('.lcx [data-lcx="gh"]'); const row = r && r.closest('.lcx-r'); if (!row) return; const old = row.nextElementSibling; if (old && old.classList.contains('lcx-f')) { old.remove(); return; }
    const g = (lp().conn || {}).gh || {}; row.insertAdjacentHTML('afterend', `<form class="lcx-f" data-lcx-f="gh" novalidate><label class="fl">공개 저장소 주소<input name="u" type="url" inputmode="url" maxlength="200" placeholder="https://github.com/내아이디/과제" value="${esc(g.url || '')}"></label><p class="mini">공개 저장소 주소만 받아요(토큰 · 비밀번호는 받지 않아요). AI 튜터가 이 저장소의 과제 코드에 맞춰 힌트를 줘요.</p><p class="err" role="alert"></p><div class="lcx-fb"><button type="submit" class="lbtn pri sm">저장</button>${g.on ? '<button type="button" class="lbtn sm ghost" data-lcx="ghoff">연결 끊기</button>' : ''}</div></form>`); row.nextElementSibling.querySelector('input').focus(); }
  const saveLp = msg => { try { if (LR.api && typeof LR.api.save === 'function') LR.api.save(); } catch (e) { } lrender(); if (msg) toast(msg, 'ok'); };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lcx]'); if (!b) return; const k = b.dataset.lcx;
    if (k === 'md') { dl(`didisam-study-notes-${stamp()}.md`, mdText(), 'text/markdown;charset=utf-8'); toast('학습 노트(.md)를 내려받았어요. Notion은 「가져오기 › Markdown」, Google Docs는 파일을 열면 돼요.', 'ok'); }
    if (k === 'csv') { const c = csvText(); if (!c.n) { toast('아직 내보낼 퀴즈가 없어요. 과정의 퀴즈를 풀면 복습 카드가 생겨요.', 'warn'); return; } dl(`didisam-review-cards-${stamp()}.csv`, c.text, 'text/csv;charset=utf-8'); toast(`복습 카드 ${c.n}장을 내려받았어요. Anki는 「가져오기」, Quizlet은 「만들기 › 가져오기」에서 넣어요.`, 'ok'); }
    if (k === 'gh') ghForm();
    if (k === 'ghoff') { const C = lp(); C.conn = C.conn || {}; delete C.conn.gh; saveLp('GitHub 저장소 연결을 끊었어요.'); } });
  document.addEventListener('submit', e => { const f = e.target; if (!f || f.dataset.lcxF !== 'gh') return; e.preventDefault(); const u = String(f.u.value || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(u)) { f.querySelector('.err').textContent = 'github.com/아이디/저장소 형식의 주소를 넣어 주세요.'; f.u.focus(); return; }
    const C = lp(); C.conn = C.conn && typeof C.conn === 'object' ? C.conn : {}; C.conn.gh = { on: true, url: u, at: new Date().toISOString() }; /* 운영: 튜터 서버가 공개 저장소의 README · 파일 목록만 읽어 힌트 맥락으로 쓴다 */ saveLp('GitHub 저장소를 이었어요. AI 튜터에게 「내 코드 힌트 줘」라고 물어보세요.'); });
  const st = document.createElement('style'); st.id = 'lcxCss';
  st.textContent = 'body:not(.lapp) .lcx-in{box-sizing:border-box!important;grid-column:1/-1;width:auto!important;max-width:1200px!important;margin:32px auto -8px!important;padding:0 24px!important}@media (max-width:760px){body:not(.lapp) .lcx-in{padding:0 16px!important}}.lcx{color:var(--ink,#17150F);text-align:left;background:#fff;border:1px solid var(--line,#E7E2D9);border-radius:20px;padding:16px 16px 6px;margin:0 0 16px}.lcx-h{display:flex;align-items:baseline;gap:8px}.lcx-h h2{margin:0;font-size:18px;font-weight:800;color:inherit}.lcx-n{margin-left:auto;font-size:13px;font-weight:700;color:var(--gr700,#00862D)}.lcx-sub{margin:4px 0 4px}'
    + '.lcx-g h3{margin:12px 0 0;font-size:14px;font-weight:800;color:var(--g700,#5C554B)}.lcx-r{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--g100,#F1EDE6);min-height:64px}.lcx-g h3+.lcx-r{border-top:0}'
    + '.lcx-tx{flex:1;min-width:0}.lcx-tx b{color:inherit;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:15px;font-weight:800}.lcx-tx em{font-style:normal;font-size:12px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--g100,#F1EDE6);color:var(--g700,#5C554B)}.lcx-tx em.on{background:var(--gr50,#EAF8EF);color:var(--gr700,#00862D)}'
    + '.lcx-tx small{display:block;font-size:13px;color:var(--muted,#736B5F);line-height:1.45;margin-top:2px}.lcx-go{flex:none;min-width:56px;min-height:44px;display:inline-grid;place-items:center;padding:0 14px;border-radius:999px;border:1.5px solid var(--g300,#E7E2D9);background:#fff;font:inherit;font-size:14px;font-weight:800;color:var(--ink,#17150F);text-decoration:none;cursor:pointer}.lcx-go:hover{border-color:var(--gr600,#00862D);color:var(--gr700,#00862D)}'
    + '.lcx-f{padding:4px 0 12px 56px}.lcx-f .fl{display:block;font-size:13px;font-weight:700}.lcx-f input{width:100%;box-sizing:border-box;min-height:44px;margin-top:6px}.lcx-f .err{color:var(--bad,#C62828);font-size:13px;margin:4px 0}.lcx-fb{display:flex;gap:8px}@media (max-width:480px){.lcx-f{padding-left:0}}'
    + 'html[data-theme=dark] .lcx,html[data-theme=dark] .lcx-go{background:var(--canvas,#1b1a17)}';
  (document.head || document.documentElement).appendChild(st);
})();
