/* v34 학습자 앱 단순화(body.lapp) — 대표님(2026-11-07): '휴대폰 「앱 및 서비스 연결하기」처럼 심플하게. 워딩이 많으면 혼란만 가중 — 필요하면 클릭 시 설명이 나오거나 가이드로'.
   - 목록 화면(내 강의 · 나 · 알림 · 공지 · 결제 내역 · 연결 · 메시지 …)에는 이름과 한 줄만. 긴 안내 문단은 앱 머리 제목 옆 ⓘ로, 카드 묶음은 눌러서 펼치는 줄로.
   - 「나」(#acct) 첫머리 = 휴대폰 설정형 목록(알림 · 메시지 · 결제 내역 · 연결 · 선생님 · 내 기관) + 회원정보 카드는 줄로 접기.
   - 기능 · 데이터는 그대로(숨기기 · 접기만). 가입 · 로그인 · 결제 · 강의 · 질문하기 화면은 손대지 않는다.
   lapp.js의 lrender 감싸기 뒤에 한 번 더 감싼다(기존 화면(classic)에서는 아무것도 하지 않음). */
(function () {
  'use strict';
  if (typeof lrender !== 'function') return;
  const LIST = ['my', 'acct', 'inbox', 'mypay', 'payd', 'notice', 'connect', 'msg', 'cert', 'badge', 'mybooks', 'family'];
  const OPEN = {}; /* 접은 줄의 펼침 상태(다시 그려도 유지) */
  const isPar = () => !!(LR.me && LR.me.kind === 'parent');
  const ic = (n, s) => (typeof ico === 'function' ? ico(n, s || 20) : '');
  const cnt = () => { let m = 0, n = 0; try { m = typeof lcInbox === 'function' ? lcInbox().filter(x => !x.read).length : 0; } catch (e) { } try { n = typeof laItems === 'function' ? laItems().L.filter(x => !x.read).length : 0; } catch (e) { } return { m, n }; };
  const row = (o) => `<${o.la ? `a href="#" data-lact="${o.la}"` : o.href ? `a href="${o.href}"` : `button type="button" data-ap="${o.ap}"`} class="ls-row"><span class="ls-ic" style="--c:${o.c}">${ic(o.i, 20)}</span><span class="ls-tx"><b>${esc(o.n)}</b><small>${esc(o.s)}</small></span>${o.k ? `<i class="ls-bd">${o.k > 99 ? '99+' : o.k}</i>` : ''}<span class="ls-go" aria-hidden="true">›</span></${o.href || o.la ? 'a' : 'button'}>`;

  /* 1) 「나」 첫머리: 휴대폰 설정형 목록 */
  function meList() { const c = cnt(); const P = isPar(); const org = (SITE().org || {}).name || '';
    const R = [
      { href: '#inbox', i: 'bell', c: '#FF9800', n: '알림', s: c.n ? `새 알림 ${c.n}개` : '공지 · 가입 · 수업 알림', k: c.n },
      { href: '#msg', i: 'chat', c: '#109BF1', n: '메시지', s: c.m ? `안 읽은 메시지 ${c.m}개` : `${org} 소식`, k: c.m },
      ...(P ? [{ href: '#mypay/bill', i: 'layers', c: '#00C53B', n: '청구서 · 결제', s: '결제 대기 · 내역' }] : typeof lPayOff === 'function' && lPayOff() ? [] /* v38 F5 결제 꺼진 기관은 결제 줄을 감춘다 */ : [{ href: '#mypay/pay', i: 'layers', c: '#00C53B', n: '결제 · 환불 내역', s: '결제 · 환불 · 구독 · 청구서' }]),
      ...(P ? [{ href: '#family', i: 'user', c: '#E5487A', n: '자녀', s: '출결 · 수강 현황' }] : [{ href: '#connect', i: 'clock', c: '#7C5CF2', n: '연결 · 알림', s: '앱 알림 · 캘린더 · 리마인더' }, { ap: 'tsheet', i: 'sparkle', c: '#5C74F6', n: 'AI 튜터 · 앱 설정', s: '튜터 이름 바꾸기 · AI 연결 · 화면' }]),
      { ap: 'orgs', i: 'grid', c: '#6C6C6C', n: '내 기관', s: org },
      ...(LR.me ? [{ href: '#who', i: 'user', c: '#6C6C6C', n: '계정 바꾸기', s: '이 기기의 다른 계정으로 열기' }] : []) /* v38 K12 */,
      ...(LR.me ? [{ la: 'logout', i: 'out', c: '#6C6C6C', n: '로그아웃', s: '공용 기기라면 꼭 로그아웃하세요' }] : []) /* v38 F5 U13 로그아웃을 '나'에서 바로 */
    ];
    return `<div class="ls-me" aria-label="나">${(LR.me ? `<div class="ls-prof"><span class="ls-av">${esc([...String(LR.me.nick || LR.me.sid || '나')][0])}</span><span><b>${esc(LR.me.nick || LR.me.sid || '')}</b><small>${esc(LR.me.grade || (P ? '보호자 계정' : '회원'))}</small></span></div>` : '')}<nav class="ls-list">${R.map(row).join('')}</nav><h2 class="ls-gh">회원정보</h2></div>`; }

  /* 2) 카드 묶음 → 눌러서 펼치는 줄(제목 + 한 줄) */
  const SUB = { 계정: '이메일 · 등급 · 회원 번호', 프로필: '닉네임 · 사진', '내 개인정보': '보관 중인 정보 보기 · 삭제', '마케팅 정보 수신': '', '비밀번호 설정(선택)': '선택 사항이에요', 'SNS 연동': '카카오 · 네이버 · 구글 · 애플', '회원 탈퇴': '탈퇴하고 개인정보 삭제' };
  const subOf = (card, t) => { if (t === '마케팅 정보 수신') { const c = card.querySelector('input[type=checkbox]'); return c ? (c.checked ? '동의함' : '동의 안 함') : ''; } if (SUB[t] != null) return SUB[t];
    const m = card.querySelector('p.mini, small.mini, p'); return m ? m.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : ''; };
  function fold(lm, a) { const keep = a === 'my' ? ['nextc'] : []; const CT = { 'lt-coach': 'AI 학습 비서', 'my26-stat': '내 학습 숫자' };
    lm.querySelectorAll('.mygrid > .mycard, section#lcMyAct').forEach(card => { if (card.dataset.lsf || card.closest('.ap-my')) return;
      if (keep.some(k => card.classList.contains(k))) return; const ct = Object.keys(CT).find(k => card.classList.contains(k));
      const h = ct ? { textContent: CT[ct] } : card.querySelector(':scope > h3, :scope > .mh, :scope > .in > h2, :scope > h2'); if (!h) return;
      const key = a + '|' + h.textContent.trim().slice(0, 30); card.dataset.lsf = 1; card.classList.add('ls-fold'); if (OPEN[key]) card.classList.add('ls-open');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ls-fh'; b.dataset.lsk = key; b.setAttribute('aria-expanded', OPEN[key] ? 'true' : 'false');
      b.innerHTML = `<span class="ls-tx"><b>${esc(h.textContent.replace(/\s+/g, ' ').trim().slice(0, 40))}</b>${(st => st ? `<small>${esc(st)}</small>` : '')(a === 'my' ? '' : subOf(card, h.textContent.trim()))}</span><span class="ls-go" aria-hidden="true">›</span>`;
      card.prepend(b); }); }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.ls-fh'); if (!b) return; e.preventDefault(); const c = b.parentElement; const o = !c.classList.contains('ls-open'); c.classList.toggle('ls-open', o); b.setAttribute('aria-expanded', o ? 'true' : 'false'); OPEN[b.dataset.lsk] = o; });

  /* 3) 긴 안내 문단 · 같은 제목 반복 → 앱 머리 ⓘ */
  function tips(lm, app) { const bar = app.querySelector('.ap-bar'); const tt = bar && bar.querySelector('.ap-tt'); const T = [];
    const title = tt ? tt.textContent.trim() : '';
    lm.querySelectorAll('section.sub .crumb').forEach(e => { e.dataset.lsHide = 1; });
    lm.querySelectorAll('section.sub .in > h1, .la-ih > h1, .mypage > .in > h1, .sh h2, .sh').forEach(e => { const x = e.textContent.trim(); if (e.matches('h1') || (title && x === title)) e.dataset.lsHide = 1; });
    lm.querySelectorAll('section.sub .in > p:not(.crumb), .in > p.mini, .in.narrow > p.mini, .in > p.lead, .la-ib + p.mini').forEach(p => { if (p.closest('form, details, li, .mycard, .ls-me') || p.querySelector('a, button, input, select')) return; const x = p.textContent.replace(/\s+/g, ' ').trim(); if (x.length < 15) return; T.push(x); p.dataset.lsHide = 1; });
    /* v34 500명 QA: 설명을 숨겼더니 화면에 버튼만 남으면(수료증 대기 등) 그 안내 한 줄은 다시 보인다 — 화면만 보고 상태를 알 수 있게 */
    { const vis = [...lm.querySelectorAll('h1,h2,h3,p,li,a,button,b,small,span')].filter(e => !e.closest('[data-ls-hide]') && e.offsetParent).map(e => e.textContent).join(' ').replace(/\s+/g, ' ').trim();
      if (vis.length < 40) { const lead = lm.querySelector('p[data-ls-hide]'); if (lead) { delete lead.dataset.lsHide; const k = lead.textContent.replace(/\s+/g, ' ').trim(); const j = T.indexOf(k); if (j >= 0) T.splice(j, 1); } } }
    /* 「나」 화면: 본문 제목이 위 막대(나)와 다르면 숨긴다(제목은 막대 하나) */
    if (route().a === 'acct' && !route().b) lm.querySelectorAll('h1').forEach(h => { if (h.textContent.trim() !== '나') h.dataset.lsHide = 1; });
    /* 목록 위 일괄 작업(읽은 알림 삭제 · 전체 삭제)은 「⋯」 안으로 */
    const ib = lm.querySelector('.la-ib'); if (ib && !ib.querySelector('.ls-more')) { const B = [...ib.querySelectorAll(':scope > button')].filter(b => /삭제/.test(b.textContent)); if (B.length) { const d = document.createElement('details'); d.className = 'ls-more'; d.innerHTML = `<summary aria-label="다른 작업">${ic('dots', 20)}</summary><div class="ls-mp" role="menu"></div>`; const m = d.querySelector('.ls-mp'); B.forEach(b => { b.classList.remove('pri'); b.classList.add('ghost'); b.setAttribute('role', 'menuitem'); m.appendChild(b); }); ib.appendChild(d); } }
    if (!tt) return; let i = bar.querySelector('.ls-i'); if (!T.length) { if (i) i.remove(); bar.classList.remove('ls-hasi'); return; }
    if (!i) { tt.insertAdjacentHTML('afterend', '<button type="button" class="ls-i" aria-label="이 화면 설명" aria-expanded="false">i</button>'); i = bar.querySelector('.ls-i'); }
    bar.classList.add('ls-hasi'); i.dataset.tip = JSON.stringify(T.slice(0, 4)); }
  document.addEventListener('click', e => { const i = e.target.closest && e.target.closest('.ls-i'); const pop = document.getElementById('lsPop');
    if (!i) { if (pop && !e.target.closest('#lsPop')) { pop.remove(); document.querySelectorAll('.ls-i').forEach(x => x.setAttribute('aria-expanded', 'false')); } return; }
    e.preventDefault(); if (pop) { pop.remove(); i.setAttribute('aria-expanded', 'false'); return; }
    let T = []; try { T = JSON.parse(i.dataset.tip || '[]'); } catch (x) { } const d = document.createElement('div'); d.id = 'lsPop'; d.className = 'ls-pop'; d.setAttribute('role', 'note');
    d.innerHTML = T.map(x => `<p>${esc(x)}</p>`).join(''); const r = i.getBoundingClientRect(); d.style.top = (r.bottom + 8) + 'px'; document.body.appendChild(d); i.setAttribute('aria-expanded', 'true'); });
  addEventListener('hashchange', () => { const p = document.getElementById('lsPop'); if (p) p.remove(); });

  function slim() { if (!document.body.classList.contains('lapp')) return; const lm = document.getElementById('lm'); const app = document.getElementById('lapp'); if (!lm || !app) return;
    const a = route().a; if (!LIST.includes(a)) { const b = app.querySelector('.ap-bar .ls-i'); if (b) b.remove(); return; }
    if (a === 'acct' && LR.me && !lm.querySelector('.ls-me') && !(route().b)) { const g = lm.querySelector('.mypage .in, .in'); if (g) g.insertAdjacentHTML('afterbegin', meList()); }
    if (a === 'my' || a === 'acct') fold(lm, a);
    if (a === 'acct' && !route().b) { const tt = app.querySelector('.ap-bar .ap-tt'); if (tt) tt.textContent = '나'; }
    tips(lm, app); }
  window.lslimApply = slim;
  { const base = lrender; lrender = (...x) => { const r = base(...x); try { slim(); } catch (e) { console.error('lslim', e); } return r; }; }
})();
