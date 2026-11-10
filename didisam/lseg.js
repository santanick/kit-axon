/* 디디쌤 스튜디오 v15 — 학습자 포털 기관 유형별 맞춤
   로그인 아이디 이름(학번 · 사번 · 교육생 번호 …) · 호칭(대학 = 학번, 그 외 = 소속 + 학습자 용어, 이름은 저장하지 않음)
   필수(법정)교육 기한 카드 · 튜터 브리핑 1순위(기업 · 공공) · 진단 전 레벨 표기 · 대학 표현 치환
   학원(초중고) 보호자 보기(읽기 전용) · 히어로 빈 화면을 과정 카드로 */
'use strict';
const L_ID = { univ: '학번', corp: '사번', public: '교육생 번호', lifelong: '수강번호', voc: '훈련생 번호', k12: '원생 번호', adult: '수강번호' };
const lTy = () => (SITE() && SITE().org && SITE().org.type) || '';
const lTerm = k => ((SITE() && SITE().terms) || {})[k] || ({ learner: '학습자', teacher: '강사', cls: '과정' })[k] || k;
function lHas(ch, ro) { const c = (ch || '').charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; return ro ? (j !== 0 && j !== 8) : j !== 0; } return /[0-9]/.test(ch) ? (ro ? '0136'.includes(ch) : '013678'.includes(ch)) : false; }
const lJ = (w, a, b) => lHas(String(w).slice(-1), a === '으로') ? a : b;
function lIdLabel() { return L_ID[lTy()] || '번호'; }
const lGuard = () => { try { return lTy() === 'k12' && sessionStorage.getItem('didisam.lg.' + (LR.tid || 'x')) === '1'; } catch (e) { return false; } };
function lCall() { if (!LR.me) return ''; if (lGuard()) return `${LR.me.sid} ${lTerm('learner')} 보호자`; if (lTy() === 'univ') return String(LR.me.sid); if (LR.me.nick) return `${LR.me.nick}님`; return `${LR.me.dept ? LR.me.dept + ' ' : ''}${lTerm('learner')}`; }
const lPage = id => ((SITE() && SITE().pages) || []).find(p => p.id === id);

/* 필수(법정)교육: 기한 · 남은 진도 */
function lLegal() { if (!LR.me || !['corp', 'public'].includes(lTy())) return []; const st = myStats();
  return st.courses.filter(x => x.c.legal && !x.done).map(x => ({ x, d: x.c.end ? Math.ceil((Date.parse(x.c.end) - Date.now()) / 864e5) : null })).sort((a, b) => (a.d ?? 999) - (b.d ?? 999)); }
{ const base = MYR.next; MYR.next = st => { const L = lLegal(); const card = L.length ? `<div class="mycard wide lg-legal" id="m-legal"><div class="mh"><h3>필수교육 이수 기한 <small>법정의무교육 · 미이수 ${L.length}건</small></h3></div><ul>${L.map(({ x, d }) => `<li><span class="dd ${d != null && d <= 7 ? 'hot' : ''}">${d == null ? '기한 확인' : d < 0 ? '기한 지남' : 'D-' + d}</span><div><b>${esc(x.c.name)}</b><small>${x.c.end ? esc(x.c.end) + '까지 · ' : ''}진도 ${x.p}% · 100% 수강해야 이수</small></div><a class="lbtn sm pri" href="#c/${esc(x.c.id)}">이어서 수강</a></li>`).join('')}</ul></div>` : '';
  return card + base(st); }; }
{ const base = ltTodo; ltTodo = () => { const A = base(); const L = lLegal(); if (!L.length) return A; const H = L.slice(0, 2).map(({ x, d }) => ({ h: `필수교육 · ${x.c.name}`, d: `${d == null ? '' : d < 0 ? '기한 지남 · ' : `D-${d} · `}진도 ${x.p}% — 미이수 시 ${lTy() === 'public' ? '교육 실적에서 빠집니다' : '법정 이수 대상으로 남습니다'}`, href: `#c/${x.c.id}`, k: 'warn' }));
  return [...H, ...A.filter(a => !H.some(h => h.href === a.href))]; }; }

/* 히어로: 영상 썸네일이 없으면 과정 카드로 채움 */
{ const base = SECR.hero; SECR.hero = d => { const h = base(d); if (!h.includes('class="mempty"')) return h; const C2 = SITE().classes.slice(0, 9); if (!C2.length) return h; const lv = i => (SITE().levels[i] || {}).color || '#5C74F6';
  const col = k => C2.filter((_, i) => i % 3 === k).map(c => `<a class="mo mcard" href="#c/${esc(c.id)}" style="--c:${esc(lv(c.level || 0))}"><i>${esc((SITE().levels[c.level || 0] || {}).name || '')}</i><b>${esc(c.name)}</b><small>${c.hours ? c.hours + '시간 · ' : ''}${c.legal ? '필수교육' : esc(lTerm('cls'))}</small></a>`).join('');
  return h.replace(/<div class="mempty">[\s\S]*?<\/div>/, [0, 1, 2].map(k => `<div class="mcol c${k}">${col(k)}</div>`).join('')); }; }

/* 화면 손질(렌더 후) */
const L_RULES = () => { const ty = lTy(); if (!ty || ty === 'univ') return []; const job = ['corp', 'public'].includes(ty) ? '직무' : '실무';
  return [['교수님', lTerm('teacher') + '님'], ['전공', job], ['학번', lIdLabel()]].map(([a, b]) => [new RegExp(a + '(을|를|이|가|은|는|과|와|으로|로)?', 'g'), b]); };
const L_P = { 을: ['을', '를'], 를: ['을', '를'], 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'], 으로: ['으로', '로'], 로: ['으로', '로'] };
function lTerms(root) { const R = L_RULES(); if (!R.length || !root) return; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('textarea,input,script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); let n;
  while ((n = w.nextNode())) { const v = n.nodeValue; if (!/교수님|전공|학번/.test(v)) continue; const x = R.reduce((s, [re, b]) => s.replace(re, (m, p) => p ? b + (lHas(b.slice(-1), p === '으로' || p === '로') ? L_P[p][0] : L_P[p][1]) : b), v); if (x !== v) n.nodeValue = x; } }
function lFix() { const app = $('#lapp'); if (!app || !SITE()) return; const ty = lTy(); document.body.classList.toggle('lg-guard', !!(LR.me && lGuard()));
  const P = $('.myp'); if (P && LR.me) { const b = P.querySelector('.mpi b'); if (b) b.textContent = lCall(); const sp = P.querySelector('.mpi > span'); if (sp && ty !== 'univ') sp.textContent = /^[up][a-z0-9]{8,}$/i.test(String(LR.me.sid)) ? (() => { try { const m = typeof a2lMe === 'function' ? a2lMe() : null; return m && ['bulk', 'manual'].includes(m.src) ? '기관 등록 회원' : '간편가입 회원'; } catch (e) { return '간편가입 회원'; } })() : `${lIdLabel()} ${LR.me.sid}`; /* v38 운영자가 등록한 회원은 '기관 등록 회원'(QA V12) */ /* v25: 간편가입 내부 번호(u…)는 보여 주지 않음 */
    const av = P.querySelector('.ava'); if (av && ty !== 'univ' && !/^[A-Z]/.test(av.textContent)) av.textContent = (LR.me.nick || LR.me.dept || lTerm('learner')).slice(0, 1);
    if (!lPage('diag')) P.querySelectorAll('.chips2 a.tg[href^="#dg"]').forEach(a => a.remove());
    P.querySelectorAll('.chips2 .tg').forEach(x => { const m = x.textContent.match(/^LEVEL (\d+) · (.*)$/); if (!m) return; const lv = SITE().levels[+m[1] - 1] || {}; x.textContent = LR.mine.badges.length ? `LEVEL ${m[1]} · ${m[2]} 도전 중` : `${(SITE().levels[0] || lv).name} 단계부터 시작`; }); }
  const rd = $('#m-road small'); if (rd && LR.me && !LR.mine.badges.length) rd.textContent = `${(SITE().levels[0] || {}).name || ''} 단계 진행 중`;
  const st = app.querySelector('.hero .stats'); if (st) st.querySelectorAll('span').forEach(s => { if (s.textContent === '영상 튜토리얼' && lPage('tutorials')) s.textContent = lPage('tutorials').name; if (s.textContent === '디지털 배지' && lPage('badges')) s.textContent = lPage('badges').name; });
  if (ty === 'k12' && location.hash.startsWith('#login') && !LR.me) { const f = $('#li'); if (f && !f.querySelector('[name=guard]')) f.querySelector('.fl:last-of-type').insertAdjacentHTML('afterend', '<label class="ckl lg-ck"><input type="checkbox" name="guard"> 보호자로 보기 — 자녀의 출결 · 숙제 · 테스트 결과를 읽기 전용으로 봅니다</label>'); }
  if (LR.me && lGuard() && !$('.lg-bar')) app.insertAdjacentHTML('afterbegin', `<div class="lg-bar"><b>보호자 보기</b> · ${esc(String(LR.me.sid))} ${esc(lTerm('learner'))}의 수업 · 숙제 · 테스트 결과입니다. 제출 · 응시는 ${esc(lTerm('learner'))} 계정에서 합니다.</div>`);
  const av = $('.acct .me .av'); if (av && LR.me && ty !== 'univ') av.textContent = lGuard() ? '보' : (LR.me.nick || LR.me.dept || lTerm('learner')).slice(0, 1);
  if (!lPage('diag')) { app.querySelectorAll('em, .tg, small, span').forEach(x => { if (x.childElementCount) return; if (x.textContent.trim() === '진단 후 시작') x.textContent = `${lTerm('cls')} 수료 시`; }); const cx = $('.lt-ctx'); if (cx) cx.textContent = cx.textContent.replace(' · 진단 전', ''); }
  lTerms(app); const pn = $('.lt-panel'); if (pn) lTerms(pn); }
{ const base = lrender; lrender = () => { base(); try { lFix(); } catch (e) { console.error(e); } }; }
document.addEventListener('submit', e => { if (e.target && e.target.id === 'li') { try { const g = e.target.guard; sessionStorage.setItem('didisam.lg.' + (LR.tid || 'x'), g && g.checked ? '1' : '0'); } catch (x) { } } }, true);
{ let q = 0; new MutationObserver(() => { clearTimeout(q); q = setTimeout(() => { const pn = $('.lt-panel'); if (pn) lTerms(pn); }, 30); }).observe(document.body, { childList: true, subtree: true }); }
document.addEventListener('submit', e => { if (lGuard() && e.target && !['li', 'ltf', 'laiF'].includes(e.target.id)) { e.preventDefault(); e.stopImmediatePropagation(); toast('보호자 보기에서는 제출 · 응시를 할 수 없습니다.', 'warn'); } }, true);
