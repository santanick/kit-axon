/* 디디쌤 학습자 웹 v33 — 앱 ↔ 기존 화면 용어 · 이름 맞춤(QA #69). 겉글자만 바꾸고 구조 · 링크 · 동작은 그대로 둔다.
   ① 기존 화면 아래 탭 '강좌 · 내 학습'을 앱 아래 탭과 같은 기관 유형별 이름(SCN.find · SCN.learn, 예: 성인 학원 '둘러보기 · 내 강의')으로
   ② 기존 화면 홈의 앱 복귀 버튼 'AI 선생님 앱 화면으로 보기'를 앱 위 줄과 같은 선생님 이름으로
   용어 원본은 lapp.js의 SCN이다. lapp.js가 window.lappScn()을 내보내면 그것을, 아니면 시나리오 확장(LSCN_PICK)을, 그것도 없으면 아래 사본을 쓴다(SCN과 같은 값). */
(function () {
  const SCN_COPY = { univ: ['내 교과목', '교과목 찾기'], univ_lms: ['이번 학기 강의', '비교과'], corp: ['내 교육', '교육과정'], public: ['내 교육', '교육과정'], k12: ['내 수업', '수업 찾기'], adult: ['내 강의', '둘러보기'], lifelong: ['내 강좌', '강좌 신청'], voc: ['내 훈련', '훈련과정'] };
  const org = () => { try { return (typeof SITE === 'function' && SITE() && SITE().org) || {}; } catch (e) { return {}; } };
  const labels = () => { const ty = org().type || 'adult', ed = org().ed || '';
    try { if (typeof window.lappScn === 'function') { const x = window.lappScn(); if (x && x.learn) return [x.learn, x.find]; } } catch (e) { }
    for (const f of window.LSCN_PICK || []) { try { const x = f(ty, ed); if (x && x.learn) return [x.learn, x.find]; } catch (e) { } }
    return SCN_COPY[ty === 'univ' && ed === 'lms' ? 'univ_lms' : ty] || SCN_COPY.adult; };
  const tutor = () => { try { const p = typeof window.ltPersona === 'function' ? window.ltPersona() : null; if (p && p.n) return p.n; return typeof TCFG === 'function' && TCFG().name ? TCFG().name : ''; } catch (e) { return ''; } };
  const setTxt = (el, t) => { if (el && t && el.textContent !== t) el.textContent = t; };
  function apply() { if (!document.body || document.body.classList.contains('lapp')) return; if (typeof LR === 'undefined' || !LR || !LR.site) return;
    const [learn, find] = labels(); const tb = document.querySelector('nav.tabbar'); if (tb && !(LR.me && LR.me.kind === 'parent')) { /* v38 보호자 탭은 그대로 */ const A = [...tb.querySelectorAll('a')]; const my = A.find(a => /^#(login\/)?my$/.test(a.getAttribute('href') || '')); if (my) setTxt(my.querySelector('span'), learn); const fi = A[1] && A[1] !== my ? A[1] : null; if (fi) setTxt(fi.querySelector('span'), find); }
    const back = document.querySelector('.ap-back [data-ap="modern"]'); const n = tutor(); if (back && n) { const tn = [...back.childNodes].filter(x => x.nodeType === 3).pop(); const t = ` ${n} 앱 화면으로 보기`; if (tn && tn.nodeValue !== t) tn.nodeValue = t; } }
  /* v35 F2b: 학습자 화면의 일반 명칭 '클래스'를 기관 유형 용어(SITE().terms.cls — 교과목 · 수업 · 강좌 · 교육과정 · 훈련과정)로 바꾼다.
     강좌 이름에 '클래스'가 들어간 경우(예: 원데이 클래스)는 그 글을 건드리지 않는다. 조사는 받침에 맞춘다. */
  const JP = { 가: ['이', '가'], 이: ['이', '가'], 를: ['을', '를'], 을: ['을', '를'], 는: ['은', '는'], 은: ['은', '는'], 와: ['과', '와'], 과: ['과', '와'], 로: ['으로', '로'], 으로: ['으로', '로'] };
  const bat = (w, ro) => { const c = String(w).slice(-1).charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return false; const j = c % 28; return ro ? j !== 0 && j !== 8 : j !== 0; };
  function clsWord() {
    try { const T = SITE() && SITE().terms; const w = T && T.cls; if (!w || w === '클래스') return null; const names = ((SITE().classes || []).map(c => c.name || '')).concat(((typeof SHOP === 'function' && SHOP() && SHOP().classes) || []).map(c => c.name || '')).concat([(SITE().org || {}).name || '', (SITE().org || {}).short || '']).filter(n => n.includes('클래스')); return { w, names }; } catch (e) { return null; } } /* v38 기관명(예: 해운대대학교 e클래스)도 이름이므로 바꾸지 않는다 */
  function fixCls() { const X = clsWord(); if (!X || !document.body) return; const re = /클래스(으로|로|가|이|를|을|는|은|와|과)?(?![가-힣])|클래스(?=[가-힣])/g;
    const fix = v => v.replace(re, (m, p) => { if (!p) return X.w; const P = JP[p]; return X.w + (bat(X.w, p === '로' || p === '으로') ? P[0] : P[1]); });
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => !n.nodeValue.includes('클래스') || (n.parentElement && n.parentElement.closest('script,style,textarea,[contenteditable]')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); let n; const L = [];
    while ((n = w.nextNode())) L.push(n);
    L.forEach(n => { const v = n.nodeValue; if (X.names.some(nm => nm && v.includes(nm))) return; const x = fix(v); if (x !== v) n.nodeValue = x; });
    /* v37 L2: 결제를 기본으로 끈 유형(대학 · 기업 · 공공)은 바닥의 에스크로 확인 표시를 숨긴다(게시본 pay 값 우선, 없으면 유형 기본값) */
    try { const st = SITE() || {}; const ty = (st.org || {}).type; const off = typeof st.pay === 'boolean' ? !st.pay : ['univ', 'corp', 'public'].includes(ty); /* v37.4 게시본 pay(mem2.js lsSnapshot r.pay = mbPayOn())가 있으면 그 값을 따른다 — 대학 · 기업 · 공공이 결제를 직접 켠 경우 에스크로를 보인다 */ if (off) document.querySelectorAll('.smhost[data-smk=foot]').forEach(h => { const sr = h.shadowRoot; if (sr) sr.querySelectorAll('.s2esc').forEach(e => { e.hidden = true; e.style.display = 'none'; }); }); } catch (e) { }
    /* v37 L2: 바닥(게시본 푸터 — Shadow DOM)의 메뉴 링크 이름도 머리글과 같은 유형 용어로(본문 글은 건드리지 않음) */
    document.querySelectorAll('.smhost[data-smk=foot]').forEach(h => { const sr = h.shadowRoot; if (!sr) return; sr.querySelectorAll('a, nav').forEach(a => { if (a.tagName === 'NAV') return; a.childNodes.forEach(n => { if (n.nodeType === 3 && n.nodeValue.includes('클래스') && !X.names.some(nm => nm && n.nodeValue.includes(nm))) { const x = fix(n.nodeValue); if (x !== n.nodeValue) n.nodeValue = x; } }); }); });
    document.querySelectorAll('input[placeholder*="클래스"],[aria-label*="클래스"]').forEach(el => { ['placeholder', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && v.includes('클래스')) el.setAttribute(a, fix(v)); }); }); }
  /* v38 F5 P10: 공공 메뉴 용어 한 곳 규칙 — 게시한 사이트 머리 메뉴 이름(운영자가 바꾸지 않았으면 유형 기본 이름: 교육신청 · 참여마당 · 알림마당)을
     웹 머리 · 웹 390 아래 탭 · 앱 아래 탭 · 전체 메뉴 · 경로 · 공지 페이지 제목 · 게시판 탭에 똑같이 쓴다. 기본 이름(강좌 · 교육과정 · 커뮤니티 · 공지사항)일 때만 바꾼다. */
  const MNT = { public: { '#shop': '교육신청', '#comm': '참여마당', '#notice': '알림마당' } };
  const MDEF = { '#shop': ['클래스', '강좌', '교육과정', '둘러보기', '교육과정 찾기'], '#comm': ['커뮤니티'], '#notice': ['공지사항', '공지'] };
  const menuLbl = (href, fb) => { const D = MNT[org().type]; if (!D || !D[href]) return fb; let l = '';
    try { ((SITE().hp && SITE().hp.menus) || []).forEach(m => { if (m.access === '비공개') return; if (m.href === href && !l) l = m.l; (m.subs || []).forEach(sb => { if (sb.href === href && sb.access !== '비공개' && !l) l = sb.l; }); }); } catch (e) { }
    l = String(l || '').trim(); return !l || MDEF[href].includes(l) || [...l].length > 5 ? D[href] : l; };
  window.lMenuLbl = menuLbl;
  function menuFix() { const D = MNT[org().type]; if (!D || !document.body) return; const bh = (typeof browseHref === 'function' && browseHref()) || '#shop';
    const swap = (el, href) => { const tn = [...el.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim()) || null; const sp = tn ? null : el.querySelector('span:not(.av)'); const cur = (tn ? tn.nodeValue : sp ? sp.textContent : '').replace('▾', '').trim(); if (!MDEF[href].includes(cur)) return; const t = menuLbl(href, cur); if (t === cur) return; if (tn) tn.nodeValue = tn.nodeValue.replace(cur, t); else if (sp) sp.textContent = t; };
    Object.keys(D).forEach(h => { const hs = h === '#shop' ? [h, bh] : [h]; hs.forEach(x => document.querySelectorAll(`header.lh nav.ln a[href="${x}"], nav.tabbar a[href="${x}"], nav.ap-nav a[href="${x}"], .lux-shl a[href="${x}"], .crumb a[href="${x}"], .lctabs a[href="${x}"]`).forEach(a => swap(a, h))); });
    const r = (location.hash.slice(1) || 'home').split('/')[0]; const PG = { notice: ['#notice', /공지사항|^공지$/], comm: ['#comm', /커뮤니티/], shop: ['#shop', /^(교육과정|강좌)( 목록)?$/] }[r];
    if (PG) document.querySelectorAll('#lm section.sub .crumb, #lm section.sub h1, #lm .lcsub h1, .ap-bar .ap-tt').forEach(el => { const tn = [...el.childNodes].reverse().find(x => x.nodeType === 3 && PG[1].test(x.nodeValue.trim())); if (tn) tn.nodeValue = tn.nodeValue.replace(PG[1], menuLbl(PG[0], tn.nodeValue.trim())); }); /* v38 F5 R2 P10: 앱 머리 제목 · 웹 제목도 머리 메뉴 이름 */ }
  /* v38 F5 L4: 학습자 웹 · 앱 전체 '글자 크게'(교안 본문만이 아니라 모든 화면) — 이 기기에 저장, '나' · 계정 탭에서 켜고 끈다 */
  const FSK = 'didisam.learner.fs'; const fsOn = () => { try { return localStorage.getItem(FSK) === '1'; } catch (e) { return false; } };
  const fsApply = () => { document.documentElement.classList.toggle('lfs-lg', fsOn()); };
  window.lFsRow = () => `<button type="button" class="lfs-row" data-lfs="toggle" role="switch" aria-checked="${fsOn()}"><span><b>글자 크게 보기</b><small>${fsOn() ? '켜짐 · 모든 화면 글자를 크게' : '꺼짐 · 누르면 모든 화면 글자가 커져요'}</small></span><i class="lfs-sw${fsOn() ? ' on' : ''}" aria-hidden="true"></i></button>`;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lfs="toggle"]'); if (!b) return; e.preventDefault(); try { localStorage.setItem(FSK, fsOn() ? '0' : '1'); } catch (x) { } fsApply(); document.querySelectorAll('[data-lfs="toggle"]').forEach(x => { x.outerHTML = window.lFsRow(); }); });
  fsApply();
  function fsSlot() { if (!LR || !LR.site) return; const r = (location.hash.slice(1) || 'home').split('/')[0]; if (!['acct', 'my'].includes(r) || document.querySelector('[data-lfs]')) return;
    const at = document.querySelector('.ls-me .ls-list') || document.querySelector('#lm .lux-acct .shp-list') || (r === 'acct' ? document.querySelector('#lm .mypage .in, #lm section.sec .in') : null); if (!at) return; /* #my는 '계정' 탭 목록에만(본문 맨 위에 끼워 넣어 아래 내용을 밀지 않게) */
    if (at.classList.contains('ls-list')) at.insertAdjacentHTML('beforeend', window.lFsRow()); else if (at.classList.contains('shp-list')) at.insertAdjacentHTML('afterbegin', `<li>${window.lFsRow()}</li>`); else at.insertAdjacentHTML('afterbegin', window.lFsRow()); }
  /* v38 F5 L: 평생교육원은 운영자 화면 · 평생교육법 용어 '학습비 반환'을 학습자에게도 같은 말로 — 메뉴 · 제목은 '학습비 반환(환불)', 본문은 '학습비 반환' */
  function refundTerm() { if (org().type !== 'lifelong' || !document.body) return; const W = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => !/환불/.test(n.nodeValue) || /학습비 반환/.test(n.nodeValue) || (n.parentElement && n.parentElement.closest('script,style,textarea,input,[contenteditable]')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); const L = []; let n; while ((n = W.nextNode())) L.push(n);
    L.forEach(n => { const head = n.parentElement && n.parentElement.closest('h1,h2,h3,nav,a,button,.ls-tx b,summary,th'); n.nodeValue = n.nodeValue.replace(/환불/g, head ? '학습비 반환(환불)' : '학습비 반환').replace(/학습비 반환(\(환불\))?로(?![가-힣])/g, '학습비 반환$1으로'); }); }
  /* v38 F5 R2 A8 · V12 · L17 · P8: 기관이 쓰지 않는 기능(배지 0종 · 실습 영상 없음 · 디지털북 페이지 없음)은 학습자 #my · 앱 '내 학습'에서 탭 · 카드 · 로드맵을 감춘다(대학은 별도 시나리오) */
  function featFix() { const st = SITE() || {}; const ty = (st.org || {}).type; if (!document.body || ty === 'univ') return;
    const noBadge = !(st.badges || []).length, noVid = !(st.tuts || []).some(t => t.yt), noBook = !(st.pages || []).some(p => p.id === 'books') || !(st.dbooks || []).some(b => b.url || (b.pages || []).length);
    if (!noBadge && !noVid && !noBook) return; const TX = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(); const hide = el => { if (el && !el.hasAttribute('data-f5off')) { el.setAttribute('data-f5off', '1'); el.style.setProperty('display', 'none', 'important'); } };
    const lm = document.getElementById('lm'); if (!lm) return;
    lm.querySelectorAll('nav.mytab a').forEach(a => { const t = TX(a); if ((noBook && t === '디지털북') || (noBadge && t === '배지')) hide(a); });
    if (noBadge) lm.querySelectorAll('.myhg, .mylv, .ap-badge, .ap-lv, section.prog').forEach(hide); /* 배지 로드맵('0종 모두 받으면 … 인증') */
    lm.querySelectorAll('.mpn > div').forEach(d => { const t = TX(d); if ((noBadge && /획득 배지/.test(t)) || (noVid && /튜토리얼 완료|실습 영상/.test(t))) hide(d); });
    lm.querySelectorAll('.mycard, .ap-card, section.prog').forEach(c => { const h = TX(c.querySelector('.ls-fh .ls-tx b, .mh h3, .mh, .myhead, h2, h3')); if ((noBadge && /^(배지 지갑|내 배지)/.test(h)) || (noBadge && noVid && /^수준 로드맵/.test(h)) || (noVid && /^(튜토리얼 기록|실습 영상 기록)/.test(h)) || (noBook && /^(디지털북|내 디지털북)/.test(h))) hide(c); });
    lm.querySelectorAll('.chips2 > *').forEach(c => { if (noBadge && noVid && /LEVEL|Explorer|Builder|Master|진단 전/.test(TX(c)) && !(st.diags || []).length) hide(c); }); }
  /* v38 F5 U20: 없는 주소(#noti · #me · #settings)는 배지 화면 대신 알림 · 계정으로 */
  const ALIAS = { noti: '#inbox', notifications: '#inbox', alarm: '#inbox', me: '#acct', settings: '#acct', setting: '#acct', profile: '#acct', certs: '#badges', certificates: '#badges' };
  const aliasGo = () => { const h = location.hash.slice(1) || ''; const r = h.split('/')[0]; if (ALIAS[r] && !h.includes('/')) location.replace(ALIAS[r]); }; aliasGo(); addEventListener('hashchange', aliasGo);
  addEventListener('scroll', () => { if (document.body) document.body.classList.toggle('f5-scr', scrollY > 120); }, { passive: true }); /* v38 F5 A9 */
  window.lFixClsTerm = fixCls;
  let q = false; const kick = () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; apply(); try { fixCls(); } catch (e) { } try { menuFix(); } catch (e) { } try { fsSlot(); } catch (e) { } try { refundTerm(); } catch (e) { } try { featFix(); } catch (e) { } setTimeout(() => { try { fixCls(); } catch (e) { } }, 250); /* v37 L2: 바닥 Shadow DOM은 lmerge가 다음 프레임에 붙이므로 한 번 더 */ }); };
  const start = () => { new MutationObserver(kick).observe(document.body, { childList: true, subtree: true }); kick(); };
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
  addEventListener('hashchange', kick);
})();
