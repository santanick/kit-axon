/* 디디쌤 학습자 화면 v23 — 쉬운 학습자 화면(lux)
   대표님 피드백(2026-11-03) "기능은 다 들어갔는데 너무 복잡하고 어려워 — 사용자 입장에서 어렵지 않게"
   원칙: 기능은 그대로 두고(모든 주소 · 화면 유지) 길을 줄인다.
   - 머리 메뉴: 핵심 4개(홈 · 강좌 · 기관 메뉴 · 커뮤니티) + '더 보기'(나머지 전부). 휴대폰은 아래 탭(홈 · 강좌 · 내 학습 · 커뮤니티 · 메뉴) + 메뉴 시트
   - 로그인 후 홈: '이어서 학습하기' 카드가 맨 위(다음 강의로 바로)
   - 강좌 상세 → 수강 신청 → 간편가입 → 결제 화면으로 바로 이어짐(가입 후 다시 찾아갈 필요 없음)
   - 화면마다 주 버튼 하나(나머지는 보조 버튼), 내 학습은 학습 · 결제 · 계정 세 묶음
   - AX 튜터는 사람이 열 때만 열림(자동 열림 · 화면 가림 없음), 내부 용어 → 쉬운 말
   모든 학습자 스크립트 다음, lboot.js 앞에서 로드(마지막 lrender · shell 감싸기). */
'use strict';
(() => {
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { } } };
  const BK = () => 'didisam.lux.back.' + (LR.tid || '');
  const TABK = () => 'didisam.lux.my.' + (LR.tid || '');
  const mob = () => innerWidth <= 900;
  const dayStr = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
  ICP.msg = 'M4 5h16v11H9l-5 4z'; ICP.more = 'M5 12h.01M12 12h.01M19 12h.01'; ICP.card = 'M3 6h18v12H3zM3 10h18';

  /* ── 쉬운 말 ── */
  try { ITN.chapter = '단원'; ITI.chapter = 'layers'; } catch (e) { }
  try { const K = { diag: '레벨 진단', tutorials: '실습 영상', courses: '단계별 코스', badges: '수료 · 배지', books: '디지털북', notice: '공지사항' }; Object.keys(K).forEach(k => { if (PG_DESC[k]) PG_DESC[k][0] = K[k]; }); } catch (e) { }
  const WORDS = () => { const tn = (pageOf('tutorials') || {}).name || '실습 영상'; return [['코스웨어에서 고르기', '단계별 코스 보기'], ['코스웨어', '단계별 코스'], ['COURSEWARE', '단계별 코스'], ['TUTORIALS', tn], ['튜토리얼', tn], ['WELCOME', '반갑습니다'], ['MY RESULT', '내 결과'], ['DIAGNOSIS', '레벨 진단'], ['DIGITAL BADGES', '디지털 배지'], ['DIGITAL BOOK', '디지털북'], ['커리큘럼', '배우는 내용']]; };
  function plain(root) { if (!root) return; const W = WORDS(); const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('script,style,textarea,input,code,svg,.lt') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const L = []; while (tw.nextNode()) L.push(tw.currentNode); L.forEach(n => { let v = n.nodeValue; if (!/[가-힣A-Z]/.test(v)) return; const o = v; W.forEach(([a, b]) => { if (v.includes(a)) v = v.split(a).join(b); }); if (v !== o) n.nodeValue = v; }); }

  /* ── 내 강좌(수강 · 진도) ── */
  function myCourses() { const S2 = SITE(); if (!S2 || !LR.me) return [];
    let R = null; try { R = typeof shMine === 'function' ? shMine() : null; } catch (e) { }
    const enr = (R && R.enr) || {}; const t = dayStr(); const lp = LR.lp.cls || {}; const mc = LR.mine.cls || {};
    const ids = new Set([...Object.keys(enr).filter(id => { const e = enr[id]; return e && e.status === 'active' && !(e.end && e.end < t); }), ...Object.keys(mc), ...Object.keys(lp).filter(id => Object.values((lp[id] || {}).items || {}).some(x => x && (x.done || x.w)))]);
    let MS = []; try { MS = typeof myStats === 'function' ? myStats().courses : []; } catch (e) { MS = []; }
    const out = []; ids.forEach(id => { const c = (S2.classes || []).find(x => x.id === id); if (!c || !(c.items || []).length) return; if (enr[id] && (enr[id].status === 'hold' || enr[id].hold)) return;
      const r = (lp[id] || {}).items || {}; const its = c.items.filter(i => i.type !== 'chapter'); const L = its.length ? its : c.items; const done = L.filter(i => (r[i.id] || {}).done).length;
      const p = Math.min(100, Math.max(Math.round(done / Math.max(1, L.length) * 100), (mc[id] || {}).p || 0)); const nx = L.find(i => !(r[i.id] || {}).done) || L[0];
      const ms = MS.find(y => y.c.id === id); /* v33 진도 · 다음 항목은 myStats 하나로 맞춘다(규정 준수 기관의 차시 인정 포함, QA #32) */
      out.push({ c, p: ms ? ms.p : p, done: ms && ms.doneN != null ? ms.doneN : done, n: L.length, nx: ms ? (ms.next || nx) : nx, fin: ms ? !!ms.done : p >= (c.thr || 80), started: done > 0 || (ms ? ms.p > 0 : false) || Object.values(r).some(x => x && x.w) }); });
    return out.sort((a, b) => ((a.p >= 100) - (b.p >= 100)) || (b.started - a.started) || (b.p - a.p)); }
  const nextHref = x => `#c/${encodeURIComponent(x.c.id)}${x.nx ? '/' + encodeURIComponent(x.nx.id) : ''}`;
  const shopHas = () => { try { const sh = typeof shInfo === 'function' ? shInfo() : null; return !!(sh && sh.classes && sh.classes.length); } catch (e) { return false; } };
  const browseHref = () => shopHas() ? '#shop' : ((SITE().pages || []).some(p => p.id === 'courses') ? '#courses' : '#home');
  function contHTML(compact) { const L = myCourses(); const x = L.find(y => y.p < 100) || L[0];
    if (!x) return `<section class="lux-cont"><div class="in"><div class="lux-cc empty"><div><p class="lux-ey">${esc(LR.me.nick || '')}님, 반갑습니다</p><h2>첫 강좌를 골라 보세요</h2><p class="lux-sub">강좌를 신청하면 이 자리에서 바로 이어서 학습할 수 있습니다.</p></div><a class="lbtn pri" href="${browseHref()}">강좌 둘러보기 ${ico('arrow', 16)}</a></div></div></section>`;
    const rest = L.filter(y => y !== x).slice(0, 3);
    return `<section class="lux-cont${compact ? ' sm' : ''}"><div class="in"><div class="lux-cc"><div class="lux-cm"><p class="lux-ey">${x.started ? '이어서 학습하기' : '바로 시작하기'}</p><h2>${esc(x.c.name)}</h2><p class="lux-sub">${x.nx ? `다음 강의 · ${esc(x.nx.title)}${ITN[x.nx.type] ? ` <span class="lux-ty">${esc(ITN[x.nx.type])}</span>` : ''}` : ''}</p>
      <div class="lux-bar" role="progressbar" aria-valuenow="${x.p}" aria-valuemin="0" aria-valuemax="100" aria-label="진도"><i style="width:${x.p}%"></i></div><small class="lux-pc">진도 ${x.p}%${Math.round(x.done / Math.max(1, x.n) * 100) === x.p ? ` · ${x.done}/${x.n} 완료` : ''}${x.fin ? ' · 수료 기준 달성' : ''}</small></div>
      <a class="lbtn pri lux-go" href="${nextHref(x)}">${x.p >= 100 ? '다시 보기' : x.started ? '이어서 학습하기' : '학습 시작하기'} ${ico('arrow', 16)}</a></div>
      ${rest.length ? `<ul class="lux-ol">${rest.map(y => `<li><a href="${nextHref(y)}"><b>${esc(y.c.name)}</b><span class="lux-mbar"><i style="width:${y.p}%"></i></span><small>${y.p}%</small>${ico('arrow', 14)}</a></li>`).join('')}</ul>` : ''}</div></section>`; }

  /* ── 머리 메뉴: 핵심 4개 + 더 보기 ── */
  function navFix(cur) { const nav = document.querySelector('header.lh nav.ln'); if (!nav || nav.dataset.lux) return; nav.dataset.lux = '1';
    const kids = [...nav.children]; const aOf = el => el.matches('a') ? el : el.querySelector(':scope > a'); const hOf = el => (aOf(el) && aOf(el).getAttribute('href')) || '';
    const hasShop = kids.some(e => hOf(e) === '#shop');
    kids.forEach(e => { const a = aOf(e); if (a && hOf(e) === '#courses' && hasShop) a.textContent = '단계별 코스'; });
    let cust = 0; const rank = h => { if (h === '#home') return 0; if (h === '#shop' || (!hasShop && h === '#courses')) return 1; if (/^#hp\/m-/.test(h) && cust < 2) { cust++; return 2; } if (h === '#comm') return 3; if (h === '#notice') return 4; return 9; };
    const R = kids.map((el, i) => ({ el, i, r: rank(hOf(el)) })); if (kids.length <= 5) return;
    const pri = R.filter(x => x.r < 9).sort((a, b) => a.r - b.r || a.i - b.i).slice(0, 4); const over = R.filter(x => !pri.includes(x));
    pri.forEach(x => nav.appendChild(x.el));
    const on = over.some(x => { const a = aOf(x.el); return (a && a.classList.contains('on')) || x.el.querySelector('a.on'); });
    const wrap = document.createElement('span'); wrap.className = 'lux-more'; wrap.innerHTML = `<button type="button" class="lux-mb${on ? ' on' : ''}" aria-expanded="false" aria-haspopup="true">더 보기<i aria-hidden="true">▾</i></button><span class="lux-dd"></span>`;
    over.forEach(x => wrap.lastElementChild.appendChild(x.el)); nav.appendChild(wrap); }

  /* ── 머리 오른쪽: 알림 · 메시지 · 내 학습 ── */
  function acctFix() { const box = document.querySelector('header.lh .acct'); if (!box || box.dataset.lux) return; box.dataset.lux = '1';
    const me = box.querySelector('.me'); if (me && LR.me) { const s = me.querySelector('.sid'); if (s) s.textContent = '내 학습'; me.setAttribute('aria-label', `내 학습 · ${LR.me.nick || LR.me.sid}`); me.title = `${LR.me.nick || LR.me.sid}님의 학습`;
      const acp = box.querySelector('.la-acp'); if (acp && !acp.querySelector('.lux-who')) acp.insertAdjacentHTML('afterbegin', `<p class="lux-who"><b>${esc(LR.me.nick || LR.me.sid)}</b>님</p>`);
      const sm = box.querySelector('.la-acm summary'); if (sm) sm.innerHTML = ico('down', 16); }
    const mb = box.querySelector('.lcbell'); if (mb) { const em = mb.querySelector('em'); mb.innerHTML = ico('msg', 18) + (em ? em.outerHTML : ''); }
    const lg = box.querySelector('a[href="#login"].lbtn'); const jn = box.querySelector('.la-join'); if (lg && jn) { lg.classList.remove('pri'); lg.classList.add('ghost'); jn.classList.remove('ghost'); jn.classList.add('pri'); jn.textContent = '무료 가입'; } }

  /* ── 휴대폰: 아래 탭 + 메뉴 시트 ── */
  const SEC = { home: 'home', shop: 'shop', class: 'shop', pay: 'shop', payok: 'shop', courses: 'shop', textbooks: 'shop', tb: 'shop', c: 'my', my: 'my', cert: 'my', badge: 'my', mypay: 'my', payd: 'my', mybooks: 'my', acct: 'my', inbox: 'my', family: 'my', login: 'my', join: 'my', comm: 'comm', post: 'comm', write: 'comm', msg: 'my', notice: 'comm' };
  function bottomNav() { const tb = document.querySelector('nav.tabbar'); if (!tb) return; const a = route().a; const s = SEC[a] || (a === 'hp' ? 'home' : '');
    const hasComm = (SITE().pages || []).some(p => p.id === 'comm') || !!document.querySelector('header .ln a[href="#comm"]') || typeof lcCommHTML === 'function';
    const par = !!(LR.me && LR.me.kind === 'parent'); /* v38 보호자 웹 휴대폰: 앱과 같은 보호자 탭(홈 · 자녀 · 메시지 · 결제) — 학생 탭(수업 찾기 · 내 학습) 대신(QA K13) */
    const ps = { home: 'home', hp: 'home', family: 'kids', msg: 'msg', inbox: 'msg', mypay: 'pay', payd: 'pay' }[a] || '';
    const it = par ? [['home', '#home', 'home', '홈'], ['kids', '#family', 'user', '자녀'], ['msg', '#msg', 'msg', '메시지'], ['pay', '#mypay/bill', 'grid', '결제']] : [['home', '#home', 'home', '홈'], ['shop', browseHref(), 'grid', '강좌'], ['my', LR.me ? '#my' : '#login/my', 'user', '내 학습'], hasComm ? ['comm', '#comm', 'msg', '커뮤니티'] : ['comm', '#notice', 'bell', '공지']];
    tb.className = 'tabbar lux-bn'; tb.setAttribute('aria-label', '아래 메뉴');
    const on = par ? ps : s; tb.innerHTML = it.map(([k, h, i, l]) => `<a href="${h}" class="${on === k ? 'on' : ''}"${on === k ? ' aria-current="page"' : ''}>${ico(i, 21)}<span>${l}</span></a>`).join('') + `<button type="button" data-lux="menu" aria-haspopup="dialog" aria-expanded="false">${ico('menu', 21)}<span>메뉴</span></button>`; }
  function sheetOpen() { sheetClose(); const links = []; const seen = new Set();
    document.querySelectorAll('header.lh nav.ln a').forEach(a => { const h = a.getAttribute('href'); if (!h || seen.has(h)) return; seen.add(h); links.push(`<a href="${esc(h)}"${a.target ? ' target="_blank" rel="noopener"' : ''}>${esc(a.textContent.replace('▾', '').trim())}</a>`); });
    const fam = !!document.querySelector('.la-acp a[href="#family"]'); const T = typeof TCFG === 'function' && TCFG().enabled ? TCFG().name : '';
    const mine = LR.me ? [['#my', '내 학습'], ['#mypay/pay', '결제 · 환불 내역'], ['#mybooks', '내 교재/교구'], ['#msg', '메시지'], ['#inbox', '알림'], ['#acct', '회원정보 · 개인정보'], ...(fam ? [['#family', '가족']] : [])] : [];
    const w = document.createElement('div'); w.className = 'lux-sheet'; w.id = 'luxSheet';
    w.innerHTML = `<div class="lux-sh" role="dialog" aria-modal="true" aria-label="전체 메뉴"><div class="lux-shh"><b>${esc(SITE().org.name)}</b><button type="button" data-lux="close" aria-label="메뉴 닫기">${ico('x', 20)}</button></div>
      ${LR.me ? `<p class="lux-who"><b>${esc(LR.me.nick || LR.me.sid)}</b>님</p>` : `<div class="lux-shc"><a class="lbtn pri blk" href="#join">무료 가입</a><a class="lbtn ghost blk" href="#login">로그인</a></div>`}
      <p class="lux-shg">둘러보기</p><nav class="lux-shl">${links.join('')}</nav>
      ${mine.length ? `<p class="lux-shg">내 학습</p><nav class="lux-shl">${mine.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>` : ''}
      ${T || LR.me ? `<p class="lux-shg">도움</p><nav class="lux-shl">${T && !(LR.me && LR.me.kind === 'parent') ? `<button type="button" data-tact="open" data-lux="close">${esc(T)}에게 묻기 · 내 AI 학습 비서</button>` : ''}${LR.me ? '<button type="button" data-lact="logout" data-lux="close">로그아웃</button>' : ''}</nav>` : ''}</div>`;
    document.body.appendChild(w); document.body.classList.add('luxsheet'); const b = document.querySelector('[data-lux="menu"]'); if (b) b.setAttribute('aria-expanded', 'true'); const f = w.querySelector('.lux-sh button, .lux-sh a'); if (f) f.focus(); }
  function sheetClose() { const w = document.getElementById('luxSheet'); if (w) w.remove(); document.body.classList.remove('luxsheet'); const b = document.querySelector('[data-lux="menu"]'); if (b) b.setAttribute('aria-expanded', 'false'); }
  window.luxSheet = sheetOpen;

  /* ── 홈페이지 섹션(Shadow DOM): 빈 링크 · 강좌 카드 연결 ── */
  function hpFix() { const sh = (typeof shInfo === 'function' && shInfo()) || { classes: [] }; const go = browseHref();
    document.querySelectorAll('.smhost').forEach(host => { const r = host.shadowRoot; if (!r || r.querySelector('style[data-lux]')) return; const st = document.createElement('style'); st.dataset.lux = '1'; st.textContent = '.cc{position:relative}.luxcc{position:absolute;inset:0;border-radius:inherit;z-index:2}.luxcc:focus-visible{outline:3px solid #5C74F6;outline-offset:2px}.cc:hover{transform:translateY(-2px);transition:transform .15s}'; r.appendChild(st);
      r.querySelectorAll('a[href="#"], a[href=""]').forEach(a => a.setAttribute('href', go));
      /* v25: 운영자가 아직 채우지 않은 견본 칸('주소를 입력하세요' 등)은 공개 화면에서 숨김(스튜디오 미리보기에서는 그대로 보여 고치게) */
      if (LR.mode !== 'preview') r.querySelectorAll('*').forEach(el => { if (el.childElementCount || el.dataset.luxPh) return; const t = (el.textContent || '').trim(); if (!/^.{1,14}(을|를) 입력하세요\.?$/.test(t)) return; el.dataset.luxPh = '1'; el.style.display = 'none'; const pv = el.previousElementSibling; if (pv && !pv.childElementCount && pv.textContent.trim().length <= 10) pv.style.display = 'none'; });
      r.querySelectorAll('article.cc').forEach(card => { if (card.querySelector('.luxcc')) return; const nm = ((card.querySelector('h3') || {}).textContent || '').trim(); const c = (sh.classes || []).find(x => x.name === nm) || (SITE().classes || []).find(x => x.name === nm); if (!c) return;
        const a = document.createElement('a'); a.className = 'luxcc'; a.href = (sh.classes || []).some(x => x.id === c.id) ? '#class/' + c.id : '#c/' + c.id; a.setAttribute('aria-label', `${nm} 자세히 보기`); card.appendChild(a); }); }); }

  /* ── 화면별 정리 ── */
  function onePrimary(scope, keep) { if (!scope) return; [...scope.querySelectorAll('.lbtn.pri, .lbtn.dark, .lbtn:not(.ghost):not(.wht):not(.sm)')].filter(b => b !== keep && !b.closest('.lux-cont, .shp-mw, #shpModal, .gate, form, .lux-sheet, header, .shp-side, .lt')).forEach(b => { b.classList.remove('pri', 'dark'); b.classList.add('ghost'); }); }
  function pageFix() { const r = route(); const lm = document.getElementById('lm'); if (!lm) return; const parts = decodeURIComponent(location.hash.slice(1)).split('/');
    /* 강좌 상세: 비회원 '수강 신청' → 간편가입(끝나면 결제로 바로) */
    if (r.a === 'class' && !LR.me) { const id = parts[1]; const a = lm.querySelector(`a[href="#login/class/${CSS.escape(id)}"]`);
      if (a) { const c = ((typeof shInfo === 'function' && shInfo()) || { classes: [] }).classes.find(x => x.id === id) || {}; const paid = (typeof shPrice === 'function' ? shPrice(id) : +c.price || 0) > 0; const back = c.kind === 'sub' ? 'pay/sub/' + id : paid ? 'pay/class/' + id : 'class/' + id;
        const canJoin = !!document.querySelector('.la-join') || (SITE().acct && SITE().acct.mode === 'open');
        a.textContent = '수강 신청하기'; a.dataset.luxBack = back; a.setAttribute('href', canJoin ? '#join' : '#login/' + back);
        if (canJoin && !a.parentElement.querySelector('.lux-li')) a.insertAdjacentHTML('afterend', `<p class="lux-li">이미 회원이신가요? <a href="#login/${esc(back)}" data-lux-back="${esc(back)}">로그인</a></p>`); } }
    /* 가입 화면: 신청하던 강좌가 있으면 안내 + 가입 후 바로 이어가기 */
    if (r.a === 'join') { const back = ss.get(BK());
      if (back && LR.me) { ss.set(BK(), null); toast('가입이 완료되었습니다. 이어서 진행합니다.', 'ok'); location.replace('#' + back); return 'redirect'; }
      if (back && !lm.querySelector('.lux-intent') && lm.querySelector('#laJoin')) { const id = back.split('/').pop(); const c = (SITE().classes || []).find(x => x.id === id) || (((typeof shInfo === 'function' && shInfo()) || { classes: [] }).classes || []).find(x => x.id === id);
        const f = lm.querySelector('#laJoin'); f.insertAdjacentHTML('beforebegin', `<p class="lux-intent">${ico('check', 16)} 가입을 마치면 ${c ? `「${esc(c.name)}」 ` : ''}${/^pay/.test(back) ? '결제 화면' : '강좌 화면'}으로 바로 이어집니다.</p>`);
        lm.querySelectorAll('a[href="#login"]').forEach(x => x.setAttribute('href', '#login/' + back)); } }
    if (r.a === 'pay' && LR.me) ss.set(BK(), null);
    /* 수업 화면: 이동 경로 · 보조 버튼 */
    if (r.a === 'c') { lm.querySelectorAll('.crumb a[href="#courses"]').forEach(a => { if (shopHas()) { a.setAttribute('href', '#my'); a.textContent = '내 학습'; } });
      lm.querySelectorAll('#lcN button[type=submit], .lcform button[type=submit]').forEach(b => { b.classList.remove('pri'); b.classList.add('ghost'); });
      const nx = lm.querySelector('.inav a.dark'); const main = lm.querySelector('.imain'); if (main && nx && main.querySelector('.lbtn.pri:not(.ghost)')) nx.classList.replace('dark', 'ghost'); }
    /* 로그인 후 홈: 이어서 학습하기 */
    if (r.a === 'home' && LR.me && !lm.querySelector('.lux-cont')) { lm.insertAdjacentHTML('afterbegin', contHTML()); onePrimary(lm, lm.querySelector('.lux-go')); }
    /* 결제 완료: 주 버튼 하나 */
    if (r.a === 'payok') { const go = lm.querySelector('a.lbtn.pri[href^="#c/"]'); if (go) { go.innerHTML = `지금 학습 시작하기 ${ico('arrow', 16)}`; } }
    /* 내 학습: 학습 · 결제 · 계정 */
    if (r.a === 'my' && LR.me) myFix(lm, parts[1]);
    /* 바닥글 개인정보 안내(간편가입과 맞춤) */
    document.querySelectorAll('.smpriv, .lf small').forEach(s => { if (/^학습자 정보는/.test(s.textContent.trim())) s.textContent = SITE().org.type === 'univ' ? '가입 때는 학번 · 학과만 받습니다. 이름 · 연락처는 받지 않습니다.' : '가입 때는 로그인 수단과 닉네임만 받습니다. 실명 · 휴대폰 번호는 받지 않습니다.'; });
  }
  const GRP = [['pay', /결제|교재|구독|청구/], ['acct', /^(내 기록|회원정보|개인정보|알림|가족|계정)/]];
  function myFix(lm, want) { const mp = lm.querySelector('.mypage'); if (!mp || lm.querySelector('.lux-tabs')) return;
    const tag = (el, g) => { if (!el.dataset.luxG) el.dataset.luxG = g; };
    lm.querySelectorAll('.mycard').forEach(c => { const h = ((c.querySelector('h3, h2') || {}).textContent || '').trim(); const g = (GRP.find(([, re]) => re.test(h)) || ['learn'])[0]; tag(c, g); });
    lm.querySelectorAll('section.sec').forEach(s => { if (s.classList.contains('mypage') && s.querySelector('.mycard')) { const gs = new Set([...s.querySelectorAll('.mycard')].map(c => c.dataset.luxG)); if (gs.size === 1) tag(s, [...gs][0]); return; } if (s.querySelector('.mycard') || s.classList.contains('lux-cont')) return; if (s.closest('.myhero') || s === lm.firstElementChild) return; tag(s, 'learn'); });
    const myl = lm.querySelector('.la-myl'); if (myl) tag(myl, 'acct');
    const fam = !!document.querySelector('.la-acp a[href="#family"]');
    const acct = `<div class="mycard lux-acct" data-lux-g="acct"><div class="mh"><h3>계정</h3></div><ul class="shp-list sm"><li><a href="#acct"><span>회원정보 · 개인정보</span>${ico('arrow', 14)}</a></li><li><a href="#inbox"><span>알림</span>${ico('arrow', 14)}</a></li><li><a href="#msg"><span>메시지</span>${ico('arrow', 14)}</a></li>${fam ? `<li><a href="#family"><span>가족</span>${ico('arrow', 14)}</a></li>` : ''}<li><a href="#" data-lact="logout"><span>로그아웃</span>${ico('out', 14)}</a></li></ul></div>`;
    const grid = mp.querySelector('.mygrid'); if (grid) { grid.insertAdjacentHTML('beforeend', acct); grid.insertAdjacentHTML('afterbegin', `<div class="mycard lux-wide" data-lux-g="learn">${myListHTML()}</div>`); }
    const tab = ['learn', 'pay', 'acct'].includes(want) ? want : (ss.get(TABK()) || 'learn');
    const anchor = mp.querySelector('.in'); anchor.insertAdjacentHTML('afterbegin', `<div class="lux-tabs" role="tablist" aria-label="내 학습 나누어 보기">${[['learn', '학습'], ['pay', '결제'], ['acct', '계정']].map(([k, l]) => `<button type="button" role="tab" data-lux-tab="${k}" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>`);
    lm.dataset.luxtab = tab;
    /* 같은 뜻의 빈 카드('아직 시작한 과정이 없습니다')는 수강 중인 강좌가 있으면 숨김 · 주 버튼은 수강 중인 강좌 하나 */
    if (myCourses().length) lm.querySelectorAll('.mycard').forEach(c => { if (!c.classList.contains('lux-wide') && /^내 과정/.test(((c.querySelector('h3') || {}).textContent || '').trim()) && /아직 시작한 과정이 없습니다/.test(c.textContent)) c.hidden = true; });
    const keep = lm.querySelector('.lux-wide .lbtn.pri'); if (keep) [...lm.querySelectorAll('.mypage .lbtn.pri, .mypage .lbtn:not(.ghost):not(.sm):not(.wht)')].filter(b => b !== keep && !b.closest('.lux-wide, form, .lux-tabs')).forEach(b => { b.classList.remove('pri', 'dark'); b.classList.add('ghost'); }); }
  function myListHTML() { const L = myCourses(); const x = L.find(y => y.p < 100) || L[0];
    if (!L.length) return `<div class="mh"><h3>수강 중인 강좌</h3></div><p class="mini">아직 수강 중인 강좌가 없습니다.</p><a class="lbtn pri sm" href="${browseHref()}">강좌 둘러보기</a>`;
    return `<div class="mh"><h3>수강 중인 강좌 <small>${L.length}개</small></h3></div><ul class="lux-ml">${L.map(y => `<li>${y.c.thumb ? `<img class="lux-mth" src="${esc(y.c.thumb)}" alt="" loading="lazy">` : L.some(z => z.c.thumb) ? `<span class="lux-mth lux-mth0" aria-hidden="true">${esc(String(y.c.name || '').slice(0, 4))}</span>` : ''}<div><b>${esc(y.c.name)}</b><span class="lux-mbar"><i style="width:${y.p}%"></i></span><small>진도 ${y.p}%${Math.round(y.done / Math.max(1, y.n) * 100) === y.p ? ` · ${y.done}/${y.n}` : ''}${y.nx && y.p < 100 ? ` · 다음 ${esc(y.nx.title)}` : ''}</small></div><span class="lux-mla">${y.fin ? `<a class="lbtn ghost sm" href="#cert/${esc(y.c.id)}">수료증</a>` : ''}<a class="lbtn ${y === x ? 'pri' : 'ghost'} sm" href="${nextHref(y)}">${y.p >= 100 ? '다시 보기' : y.started ? '이어서' : '시작'}</a></span></li>`).join('')}</ul>`; }
  function setTab(k) { const lm = document.getElementById('lm'); if (!lm) return; lm.dataset.luxtab = k; ss.set(TABK(), k); lm.querySelectorAll('[data-lux-tab]').forEach(b => { const on = b.dataset.luxTab === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); }

  /* ── 튜터: 사람이 열 때만 ── */
  function tutorQuiet() { try { if (typeof LT === 'object' && LT) { LT.auto = true; if (mob() || route().a === 'c' || ['pay', 'join', 'login'].includes(route().a)) LT.nudge = ''; } } catch (e) { } }

  /* ── 렌더 감싸기(가장 바깥) ── */
  { const base = lrender; lrender = (...a) => { tutorQuiet(); base(...a); if (!SITE()) return;
      try { navFix(route().a); acctFix(); bottomNav(); if (pageFix() === 'redirect') return; hpFix(); plain(document.getElementById('lm')); plain(document.querySelector('header.lh')); document.body.dataset.luxr = route().a; } catch (e) { console.error('lux', e); }
      requestAnimationFrame(() => { try { hpFix(); } catch (e) { } }); }; }

  /* ── 이벤트 ── */
  document.addEventListener('click', e => { const t = e.target;
    const bk = t.closest && t.closest('[data-lux-back]'); if (bk) ss.set(BK(), bk.dataset.luxBack);
    const mb = t.closest && t.closest('.lux-mb'); const more = document.querySelector('.lux-more.open');
    if (mb) { e.preventDefault(); const w = mb.parentElement; const o = !w.classList.contains('open'); w.classList.toggle('open', o); mb.setAttribute('aria-expanded', o); if (o) { const f = w.querySelector('.lux-dd a'); if (f) f.focus(); } return; }
    if (more && !t.closest('.lux-more')) { more.classList.remove('open'); const b = more.querySelector('.lux-mb'); if (b) b.setAttribute('aria-expanded', 'false'); }
    const lx = t.closest && t.closest('[data-lux]'); if (lx) { if (lx.dataset.lux === 'menu') { e.preventDefault(); if (document.getElementById('luxSheet')) sheetClose(); else sheetOpen(); return; } if (lx.dataset.lux === 'close') { if (lx.tagName !== 'BUTTON' || !lx.dataset.tact && !lx.dataset.lact) e.preventDefault(); setTimeout(sheetClose, 0); } }
    if (t.closest && t.closest('#luxSheet a')) setTimeout(sheetClose, 0);
    if (t.classList && t.classList.contains('lux-sheet')) sheetClose();
    const tb = t.closest && t.closest('[data-lux-tab]'); if (tb) { e.preventDefault(); setTab(tb.dataset.luxTab); }
    const j = t.closest && t.closest('[data-lact="myjump"]'); if (j) { const el = document.getElementById(j.dataset.v); const g = el && el.closest('[data-lux-g]'); if (g) setTab(g.dataset.luxG); }
    if (t.closest && t.closest('[data-lact="logout"]')) { ss.set(BK(), null); ss.set(TABK(), null); }
  }, true);
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (document.getElementById('luxSheet')) { sheetClose(); const b = document.querySelector('[data-lux="menu"]'); if (b) b.focus(); } const m = document.querySelector('.lux-more.open'); if (m) { m.classList.remove('open'); const b = m.querySelector('.lux-mb'); b.setAttribute('aria-expanded', 'false'); b.focus(); } });
  window.addEventListener('hashchange', sheetClose);
  /* v33 R2(레이아웃 경고): 휴대폰(≤600) 기존 웹에서 떠 있는 AI 버튼이 본문 버튼 · 링크를 덮지 않게 한다.
     본문 끝은 #lm 아래 여백(140px)으로 비워 두고, 화면 중간에서 겹치면 겹치지 않는 빈 줄까지 버튼을 위로 올린다. */
  (() => { let tk = 0;
    const run = () => { tk = 0; const f = document.querySelector('#ltut .lt-fab'); if (!f) return; f.style.translate = ''; if (innerWidth > 600 || document.body.classList.contains('lapp') || document.body.classList.contains('lt-on')) return;
      const fr = f.getBoundingClientRect(); if (!fr.width) return;
      const E = [...document.querySelectorAll('#lm a, #lm button, #lm input, #lm select, #lm textarea, #lm [role="button"], #lm [tabindex="0"]')].map(e => e.getBoundingClientRect()).filter(r => r.width && r.height && r.bottom > 0 && r.top < innerHeight);
      const hit = dy => E.some(r => r.left < fr.right + 4 && r.right > fr.left - 4 && r.top < fr.bottom - dy + 4 && r.bottom > fr.top - dy - 4);
      for (const dy of [0, 56, 112, 168, 224, 280, 336, 392]) if (!hit(dy) && fr.top - dy > 80) { if (dy) f.style.translate = `0 -${dy}px`; return; } };
    const q = () => { if (!tk) tk = requestAnimationFrame(run); };
    addEventListener('scroll', q, { passive: true }); addEventListener('resize', q); addEventListener('hashchange', () => setTimeout(q, 60));
    try { new MutationObserver(q).observe(document.body, { childList: true, subtree: true }); } catch (e) { } })();
})();
