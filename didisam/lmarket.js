/* v48 디디쌤 콘텐츠 마켓 — 학습자 앱 1차(spec v1.1 L1 튜브 홈 「우리 학교 패스」 진열대 · L2 #mk 탐색 · L3 #mk/i/<id> 상세).
   - 켜짐: 게시본 SITE().mk.on === true(스튜디오가 시범 기관일 때만 싣습니다) 또는 체험판 주소 ?mk=1. 그 밖에는 모든 감싸기가 원래 결과를 그대로 돌려줍니다.
   - 운영(LR.mode === 'live'): GET /api/pub/<tid>/mk-shelf · mk-item?id= · POST mk-start · mk-pre(spec 8-5). 잔액 · 금액은 학습자에게 보이지 않습니다.
   - 시연판: 게시본 규칙(pub.mk.rule) + 이 기기 기록 LR.lp.mk = { st:{<id>:{at,cr}}, pre:{<id>:at} } + 운영자 큐(lpxPush 'mk-start' · 'mk-pre', market.js가 받음).
   - 학습자 화면에는 크레딧 숫자를 L3에서만, 진열대에는 「크레딧으로 수강」만 씁니다. 해요체. 「무제한」 금지.
   - 로드 순서: learner.html에서 ljourney.js 뒤 · ltube.js 앞. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof LR === 'undefined') return;
  const Q0 = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const I = (k, n) => (typeof ico === 'function' ? ico(k, n || 16) : '');
  const nf = n => (Number(n) || 0).toLocaleString('ko-KR');
  /* 진열대 이름(spec 13-3): 대학 · 초중고 「우리 학교 패스」, 기업 「우리 회사 패스」, 그 밖 「우리 기관 패스」 */
  const PW = () => { let t = ''; try { const s = typeof SITE === 'function' ? SITE() : null; t = (s && s.org && s.org.type) || ''; } catch (e) { } return ['univ', 'univ_lms', 'k12'].includes(t) ? '우리 학교 패스' : t === 'corp' ? '우리 회사 패스' : '우리 기관 패스'; };
  const site = () => { try { return typeof SITE === 'function' ? SITE() : null; } catch (e) { return null; } };
  const live = () => LR.mode === 'live';
  const IMG = s => /^(https?:|\/|img\/)/.test(String(s || '')) ? s : `img/stock/${s || 'lap-04'}-800.webp`;
  const ymNow = () => (typeof ymdL === 'function' ? ymdL(new Date()) : new Date().toISOString().slice(0, 10)).slice(0, 7);
  try { if (typeof ICP === 'object' && ICP && !ICP.search) ICP.search = 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4'; } catch (e) { }
  /* 체험판 ?mk=1 진열대(게시본에 mk가 없을 때만) */
  const DEMO = { on: true, passName: '', validTo: '2028-02-29', chargeRule: 'first_play', rule: { monthCap: 90, allowGroups: [], preFrom: 80, avg: 45 }, shelf: [
    { colId: 'univ', title: '대학 비교과', items: [
      { id: 'mp_ai01', ad: true, title: '생성형 AI 실무 활용 — 프롬프트부터 업무 자동화까지', cp: 'CP 러닝웍스', lessons: 12, hours: 16, credits: 50, img: 'lap-05' },
      { id: 'mp_wr01', title: '보고서 글쓰기 기초', cp: 'CP 러닝웍스', lessons: 6, hours: 15, credits: 45, img: 'lap-04' },
      { id: 'mp_cv01', title: '첫 이력서, AI와 같이 고쳐 보기', cp: 'CP 에듀온', lessons: 5, hours: 12, credits: 43, img: 'off-03' },
      { id: 'mp_iv01', title: '면접 답변 구조 STAR 연습', cp: 'CP 에듀온', lessons: 4, hours: 10, credits: 30, img: 'grp-03' },
      { id: 'mp_en01', title: '비즈니스 영어 이메일 30분', cp: 'CP 한빛미디어', lessons: 6, hours: 9, credits: 50, img: 'lan-02' }] },
    { colId: 'job', title: '직무', items: [{ id: 'mp_dt01', title: '데이터 분석 실무 — 엑셀에서 파이썬까지', cp: 'CP 한빛미디어', lessons: 20, hours: 30, credits: 120, img: 'dsk-06' }] }] };
  const pub = () => { const s = site(); if (s && s.mk && s.mk.on) return s.mk; return !live() && Q0.get('mk') === '1' ? DEMO : null; };
  const on = () => !!pub();
  const me = () => { try { return LR.me && LR.me.kind !== 'parent' && !(typeof isPar === 'function' && isPar()) ? LR.me : null; } catch (e) { return null; } };
  const roomDoc = () => { if (!['demo', 'preview'].includes(LR.mode) || !LR.tid || LR.tid === 'sample') return null; try { return JSON.parse(localStorage.getItem('didisam.room.' + LR.tid) || 'null'); } catch (e) { return null; } };
  const rec = () => { const lp = LR.lp = LR.lp || {}; const R = lp.mk = lp.mk && typeof lp.mk === 'object' ? lp.mk : {}; R.st = R.st || {}; R.pre = R.pre || {}; return R; };
  const save = () => { try { LR.api && LR.api.save && LR.api.save(); } catch (e) { } };

  /* ── 운영: 공개 API 캐시 ── */
  const LV = { shelf: null, item: {}, busy: {}, err: '' };
  const papi = (m, p, b) => api(m, `/api/pub/${encodeURIComponent(LR.tid)}/${p}`, b);
  function pull(key, path, set) { if (LV.busy[key]) return; LV.busy[key] = 1; papi('GET', path).then(r => { set(r); LV.err = ''; }).catch(e => { LV.err = (e && e.message) || 'err'; set(null); }).finally(() => { delete LV.busy[key]; try { lrender(); } catch (e) { } }); }
  const shelfL = () => { if (!live()) return pub(); if (LV.shelf === null && !LV.busy.shelf) pull('shelf', 'mk-shelf', r => { LV.shelf = r || { on: false, shelf: [] }; }); return LV.shelf && LV.shelf.on ? { ...pub(), ...LV.shelf } : null; };
  /* 광고(추천 진열) 노출: 기관이 끄면(site mk.ads === false · 시연 ?mkads=0) 광고 슬롯을 빼고 일반 순서로 보인다 — 운영은 서버가 응답에서 뺀다 */
  const adsOn = () => { const s = site(); return !(s && s.mk && s.mk.ads === false) && Q0.get('mkads') !== '0'; };
  const noAds = items => { const L = (items || []).map(it => it.ad ? { ...it, ad: false, _ad: 1 } : it); return [...L.filter(x => !x._ad), ...L.filter(x => x._ad)]; };
  const allItems = P => [].concat(...((P && P.shelf) || []).map(c => (adsOn() ? (c.items || []) : noAds(c.items)).map(it => ({ ...it, colId: c.colId, colTitle: c.title }))));
  const findItem = id => { const P = shelfL(); const it = allItems(P).find(x => x.id === id); if (live()) { const L = LV.item[id]; if (L === undefined && !LV.busy['i' + id]) pull('i' + id, 'mk-item?id=' + encodeURIComponent(id), r => { LV.item[id] = (r && (r.item || r)) || null; }); return L ? { ...(it || {}), ...L } : it; } return it; };

  /* ── 접근 상태(spec 8-5 access): started · credit · pre · pre_asked · cap · empty · out ── */
  const usedMonth = () => { const R = rec(); const ym = ymNow(); return Object.values(R.st).filter(x => String(x.at || '').slice(0, 7) === ym).reduce((s, x) => s + (+x.cr || 0), 0); };
  const allowed = () => { const P = pub(); const g = (P && P.rule && P.rule.allowGroups) || []; const m = me(); return !g.length || !!(m && g.includes(m.dept)); };
  function accessOf(it) { if (!it) return 'out'; if (live() && it.access) return it.access; const R = rec(); const P = pub() || {}; const r = P.rule || {}; const cr = +it.credits || 0;
    if (R.st[it.id]) return 'started'; if (!allowed()) return 'out';
    const D = roomDoc(); const con = D && D.market && (D.market.credit || []).find(c => c.status === 'active'); const m = me();
    const okd = con && (con.pre || []).some(p => p.prod === it.id && m && p.sid === m.sid && p.st === 'ok');
    if (r.preFrom && cr >= r.preFrom && !okd) return R.pre[it.id] ? 'pre_asked' : 'pre';
    if (r.monthCap && usedMonth() + cr > r.monthCap) return 'cap';
    if (con && (con.wallet || []).reduce((s, l) => s + (+l.remain || 0), 0) < cr) return 'empty';
    return 'credit'; }
  const monthLeft = () => { if (live()) { const m = LV.shelf && LV.shelf.me; return m && m.monthLeft != null ? m.monthLeft : null; } const r = (pub() || {}).rule || {}; if (!r.monthCap) return null; return Math.max(0, Math.floor((r.monthCap - usedMonth()) / (r.avg || 45))); };
  /* 「광고」 표시(M/l/code-changes.md C1 확정 문구 A1~A3) — 스튜디오 market.js MK_AD와 같은 문장 */
  const AD = { A2: '이 상품은 CP가 비용을 내고 이 자리에 노출한 광고입니다. 가격 · 크레딧은 다른 상품과 같은 기준으로 정해집니다.', A3: '「광고」 표시가 있는 상품은 콘텐츠 공급사(CP)가 산타에 노출 비용을 내고 추천 칸에 올린 상품입니다. 광고는 추천 칸에만 표시되며, 검색 결과와 정렬 순서에는 영향을 주지 않습니다. 추천 칸의 나머지 상품은 우리 기관의 이용 실적 · 신규 여부 · 컬렉션 구성으로 정합니다.' };
  const adIn = it => it && it.ad ? '<span class="mk-ad in">광고</span> ' : '';
  const CHIP = { started: ['시작함', 'pass'], pre: ['승인 필요', 'soon'], pre_asked: ['승인 요청 중', 'soon'], cap: ['이번 달 상한', 'one'], empty: ['지금은 시작할 수 없어요', 'one'], out: ['패스 밖', 'one'] };
  const chipOf = a => CHIP[a] ? `<span class="mk-bd ${CHIP[a][1]}">${CHIP[a][0]}</span>` : '';

  /* ── L1 진열대 ── */
  function shelfHTML() { const P = shelfL(); if (!P || !allowed()) return ''; const L = allItems(P).slice(0, 8); if (!L.length) return ''; const left = monthLeft(); const col = LR._mkCol || '';
    const items = col ? L.filter(x => x.colId === col) : L; const cols = (P.shelf || []).map(c => [c.colId, c.title]);
    return `<section class="mk-shelf" aria-labelledby="mkPass" data-mk="pass-shelf"><div class="mk-shh"><div><span class="mk-pill"><i></i>${E(P.passName || PW())}${P.validTo ? ` · ${E(String(P.validTo).replace(/-/g, '.'))}까지` : ''}</span><h2 id="mkPass">${PW()}</h2></div><span class="sp"></span>${items.some(x => x.ad) ? '<button type="button" class="mk-adinfo" data-mkl="adinfo" aria-expanded="false" aria-controls="mkAdInfo">광고 안내</button>' : ''}<a href="#mk">전체 보기</a></div>${items.some(x => x.ad) ? `<p class="mk-adtx" id="mkAdInfo" hidden>${E(AD.A3)}</p>` : ''}
      <p class="mk-shs">${left != null ? `이번 달 ${left}과정 더 시작할 수 있어요` : '학교가 준비한 과정을 바로 시작할 수 있어요.'}</p>
      ${cols.length > 1 ? `<div class="mk-chips" role="tablist" aria-label="패스 컬렉션"><button type="button" role="tab" class="tb-chip ${col ? '' : 'on'}" aria-selected="${!col}" data-mkl="col" data-v="">전체</button>${cols.map(([k, t]) => `<button type="button" role="tab" class="tb-chip ${col === k ? 'on' : ''}" aria-selected="${col === k}" data-mkl="col" data-v="${E(k)}">${E(t)}</button>`).join('')}</div>` : ''}
      <div class="tb-grid mk-rail">${items.map(it => { const a = accessOf(it); return `<a class="tb-tile" href="#mk/i/${encodeURIComponent(it.id)}"><span class="tb-tt img"><img src="${E(IMG(it.img || it.thumb))}" alt="" loading="lazy">${it.ad ? '<span class="mk-adl" aria-label="광고 상품">광고</span>' : ''}<span class="mk-tbd"><span class="mk-bd pass">크레딧으로 수강</span>${a !== 'credit' ? chipOf(a) : ''}</span></span><b class="tb-tn">${E(it.title)}</b><span class="tb-tl">${it.lessons ? it.lessons + '차시 · ' : ''}${it.hours ? it.hours + '시간 · ' : ''}${E(it.cp || '')}</span></a>`; }).join('')}</div></section>`; }
  function mountHome() { const lm = document.getElementById('lm'); if (!lm || lm.querySelector('[data-mk="pass-shelf"]')) return; const h = shelfHTML(); if (!h) return; const box = document.createElement('div'); box.className = 'mk-home'; box.innerHTML = h;
    const at = lm.querySelector('.tb-main > .tb-now') || lm.querySelector('.tb-main > .tb-hero') || lm.querySelector('#apScroll .ap-hero') || lm.querySelector('.mj-home');
    if (at) at.insertAdjacentElement('afterend', box); else { const main = lm.querySelector('.tb-main') || lm.querySelector('section .in') || lm; main.insertAdjacentElement('beforeend', box); } }

  /* ── L2 탐색 ── */
  function listHTML() { const P = shelfL(); if (!P) return `<section class="sec mk-sec"><div class="in"><p class="empty">${live() && LV.busy.shelf ? '패스 과정을 불러오고 있어요.' : PW() + '가 아직 없어요.'}</p></div></section>`;
    if (!allowed()) return '<section class="sec mk-sec"><div class="in"><p class="empty">' + PW() + '에 포함되지 않은 과정이에요.</p><a class="lbtn ghost sm" href="#home">홈으로</a></div></section>';
    const q = String(LR._mkQ || '').trim(); const col = LR._mkCol || ''; const f = LR._mkF || ''; const all = allItems(P);
    let L = all.filter(x => (!col || x.colId === col) && (!q || (x.title + (x.cp || '')).includes(q))); const A = x => accessOf(x);
    { const co = (P.shelf || []).map(c => c.colId); L = L.slice().sort((x, y) => (co.indexOf(x.colId) - co.indexOf(y.colId)) || String(x.title).localeCompare(String(y.title), 'ko')); } /* 탐색 · 검색은 광고 가중치 없이 제목순(policy v1.2) */
    if (f === 'now') L = L.filter(x => ['credit', 'started'].includes(A(x))); if (f === 'pre') L = L.filter(x => ['pre', 'pre_asked'].includes(A(x)));
    return `<section class="sec mk-sec"><div class="in"><div class="mk-l2h"><span class="mk-pill"><i></i>${E(P.passName || PW())}${P.validTo ? ` · ${E(String(P.validTo).replace(/-/g, '.'))}까지` : ''}</span><h1>컬렉션 ${(P.shelf || []).length}개 · 콘텐츠 <span class="num">${all.length}</span>개</h1><p>과정을 시작하면 ${PW()}에서 이용해요.</p></div>
      <label class="mk-srch">${I('search', 18)}<input value="${E(q)}" data-mkl="q" aria-label="패스 콘텐츠 검색" placeholder="과정 · 제작사로 찾아요"></label>
      <div class="mk-chips" role="tablist" aria-label="컬렉션"><button type="button" role="tab" class="tb-chip ${col ? '' : 'on'}" aria-selected="${!col}" data-mkl="col" data-v="">전체</button>${(P.shelf || []).map(c => `<button type="button" role="tab" class="tb-chip ${col === c.colId ? 'on' : ''}" aria-selected="${col === c.colId}" data-mkl="col" data-v="${E(c.colId)}">${E(c.title)}</button>`).join('')}</div>
      <div class="mk-fbar" aria-label="필터"><button type="button" class="mk-fbtn ${f === 'now' ? 'on' : ''}" aria-pressed="${f === 'now'}" data-mkl="f" data-v="now">바로 시작 가능</button><button type="button" class="mk-fbtn ${f === 'pre' ? 'on' : ''}" aria-pressed="${f === 'pre'}" data-mkl="f" data-v="pre">승인 필요</button></div>
      <div class="mk-cnt"><span><b class="num">${L.length}개</b>${col ? ' · ' + E((P.shelf.find(c => c.colId === col) || {}).title || '') : ''}</span></div>
      ${L.length ? `<ul class="mk-list">${L.map(it => { const a = A(it); return `<li><a class="mk-li" href="#mk/i/${encodeURIComponent(it.id)}"><span class="ph"><img src="${E(IMG(it.img || it.thumb))}" alt="" loading="lazy">${it.lessons ? `<em>${it.lessons}차시</em>` : ''}</span><span class="tx"><span class="mk-bds"><span class="mk-bd pass">크레딧으로 수강</span>${chipOf(a)}</span><b class="t">${adIn(it)}${E(it.title)}</b><small>${it.hours ? it.hours + '시간 · ' : ''}${E(it.cp || '')}</small></span></a></li>`; }).join('')}</ul>` : '<p class="empty">조건에 맞는 과정이 없어요. 필터를 풀어 볼까요?</p>'}</div></section>`; }

  /* ── L3 상세 ── */
  function itemHTML(id) { const it = findItem(id); if (!it) return `<section class="sec mk-sec"><div class="in"><p class="empty">${live() && (LV.busy.shelf || LV.busy['i' + id]) ? '과정을 불러오고 있어요.' : PW() + '에 포함되지 않은 과정이에요.'}</p><a class="lbtn ghost sm" href="#mk">패스 과정 보기</a></div></section>`;
    const a = accessOf(it); const R = rec(); const st = R.st[it.id];
    const n7 = (t, k) => `<p class="mk-sub7 ${k || ''}">${I(k === 'warn' ? 'clock' : 'lock', 16)}<span>${t}</span></p>`;
    const in7 = st && st.at && (Date.now() - Date.parse(st.at)) < 7 * 864e5;
    const cta = { started: `<a class="lbtn pri mk-cta" href="${E(st && st.ref ? st.ref : '#my')}" data-mkl="cont" data-v="${E(it.id)}">${I('play', 18)} 이어서 보기</a>${in7 ? '<p class="mk-sub7" data-mk="restore7"><span>처음 7일 안에 10%보다 적게 들었다면 담당 선생님이 취소해 줄 수 있어요.</span></p>' : ''}`,
      credit: `<button type="button" class="lbtn pri mk-cta" data-mkl="start" data-v="${E(it.id)}">${I('play', 18)} 수강 시작하기</button>${n7('시작하면 ' + PW() + '에서 이용해요')}`,
      pre: `<button type="button" class="lbtn pri mk-cta" data-mkl="pre" data-v="${E(it.id)}">승인 요청하기</button>${n7('이 과정은 담당 선생님 승인 후 시작할 수 있어요')}`,
      pre_asked: `<button type="button" class="lbtn ghost mk-cta" disabled aria-disabled="true">승인 요청 중</button>${n7('승인을 기다리고 있어요. 승인되면 알림으로 알려 드려요')}`,
      cap: n7('이번 달 사용할 수 있는 크레딧을 모두 썼어요. 다음 달 1일에 다시 열려요', 'warn'),
      empty: n7('지금은 이 과정을 시작할 수 없어요. 담당 선생님께 알려 드렸어요', 'warn'),
      out: n7(PW() + '에 포함되지 않은 과정이에요', 'mute') }[a] || '';
    return `<section class="sec mk-sec mk-l3"><div class="in"><div class="mk-pv"><img src="${E(IMG(it.img || it.thumb))}" alt=""><span class="pl" aria-hidden="true">${I('play', 22)}</span><span class="ch">미리보기 90초 · 크레딧이 쓰이지 않아요</span></div>
      <div class="mk-hd"><span class="mk-bds"><span class="mk-bd pass">${PW()}</span>${it.cp ? `<span class="mk-bd cp">${E(it.cp)}</span>` : ''}${chipOf(a)}</span><h1>${adIn(it)}${E(it.title)}</h1>${it.ad ? `<p class="mk-adtx">${E(AD.A2)}</p>` : ''}<p>${it.lessons ? it.lessons + '차시 · ' : ''}${it.hours ? it.hours + '시간 · ' : ''}${E(it.cp || '')}</p>${it.credits ? `<p class="mk-cr">수강 시작 시 ${nf(it.credits)}크레딧</p>` : ''}</div>
      ${cta}${n7('미리보기 90초는 크레딧 없이 볼 수 있어요.', 'mute')}
      <p class="mk-priv">${I('lock', 16)}<span>학습 기록은 학교와 함께 보고, 콘텐츠 제작사에는 이름 · 학번 없이 합계만 전달돼요.</span></p></div></section>`; }

  /* ── 동작 ── */
  async function start(id) { const it = findItem(id); const m = me(); if (!it) return; if (!m) { location.hash = '#login/mk/i/' + encodeURIComponent(id); return; }
    if (live()) { try { const r = await papi('POST', 'mk-start', { productId: id, idem: 'mk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }); rec().st[id] = { at: new Date().toISOString(), cr: +it.credits || 0, ref: r && r.courseRef }; delete LV.item[id]; save(); if (r && r.courseRef) { location.hash = r.courseRef; return; } }
      catch (e) { const c = e && (e.code || e.error || (e.body && e.body.error)); const MSG = { mk_cap: '이번 달 사용할 수 있는 크레딧을 모두 썼어요. 다음 달 1일에 다시 열려요.', mk_balance: '지금은 이 과정을 시작할 수 없어요. 담당 선생님께 알려 드렸어요.', mk_pre: '이 과정은 담당 선생님 승인 후 시작할 수 있어요.', mk_scope: PW() + '에 포함되지 않은 과정이에요.' }; toast(MSG[c] || '지금은 시작하지 못했어요. 잠시 뒤 다시 해 주세요.', 'warn'); delete LV.item[id]; lrender(); return; } }
    else { const a = accessOf(it); if (a !== 'credit') { lrender(); return; } rec().st[id] = { at: new Date().toISOString(), cr: +it.credits || 0 }; save(); try { if (typeof lpxPush === 'function') lpxPush('mk-start', { productId: id, dept: m.dept || '' }); } catch (e) { } }
    toast('수강을 시작했어요. 1차시부터 들어 볼까요?', 'ok'); lrender(); }
  async function askPre(id) { const m = me(); if (!m) { location.hash = '#login/mk/i/' + encodeURIComponent(id); return; }
    if (live()) { try { await papi('POST', 'mk-pre', { productId: id }); delete LV.item[id]; } catch (e) { toast('승인 요청을 보내지 못했어요. 잠시 뒤 다시 해 주세요.', 'warn'); return; } }
    else { try { if (typeof lpxPush === 'function') lpxPush('mk-pre', { productId: id, dept: m.dept || '' }); } catch (e) { } }
    rec().pre[id] = new Date().toISOString(); save(); toast('담당 선생님께 승인을 요청했어요.', 'ok'); lrender(); }
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-mkl]'); if (!el || !on()) return; const k = el.dataset.mkl;
    if (k === 'col') { e.preventDefault(); LR._mkCol = el.dataset.v || ''; lrender(); }
    else if (k === 'f') { e.preventDefault(); LR._mkF = LR._mkF === el.dataset.v ? '' : el.dataset.v; lrender(); }
    else if (k === 'adinfo') { e.preventDefault(); const t = document.getElementById('mkAdInfo'); if (t) { t.hidden = !t.hidden; el.setAttribute('aria-expanded', String(!t.hidden)); } }
    else if (k === 'start') { e.preventDefault(); start(el.dataset.v); }
    else if (k === 'pre') { e.preventDefault(); askPre(el.dataset.v); } });
  document.addEventListener('change', e => { const el = e.target.closest && e.target.closest('[data-mkl="q"]'); if (!el || !on()) return; LR._mkQ = el.value; lrender(); });

  /* ── 감싸기(꺼짐이면 원래 결과 그대로) ── */
  (window.LR_KNOWN = window.LR_KNOWN || []).push('mk');
  if (typeof viewPage === 'function') { const base = viewPage; viewPage = (id, ...a) => { /* eslint-disable-line no-global-assign */
    if (id !== 'mk' || !on()) return base(id, ...a);
    try { const r = typeof route === 'function' ? route() : { b: '' }; if (r.b === 'i') return itemHTML(decodeURIComponent(String(r.rest || '').split('/')[1] || '')); return listHTML(); } catch (e) { console.error('lmarket', e); return '<section class="sec"><div class="in"><p class="empty">패스 화면을 그리지 못했어요. 새로 고침해 주세요.</p></div></section>'; } }; }
  if (typeof lrender === 'function') { const base = lrender; lrender = function () { /* eslint-disable-line no-global-assign */
    const r = base.apply(this, arguments); try { if (!on() || !me()) return r; const a = typeof route === 'function' ? route().a : ''; if (a === 'home') { mountHome(); setTimeout(mountHome, 0); } } catch (e) { console.error('lmarket render', e); } return r; }; }
  window.LMK = Object.freeze({ on, accessOf: id => accessOf(findItem(id)), monthLeft, shelfHTML });
})();
