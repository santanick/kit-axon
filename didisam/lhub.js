/* v43 학습 허브(로그인 후 #my 첫 화면) — 최종 시안 final2/web.html 기준. 기관 테마와 관계없이 공통, 강조색은 var(--pri).
   구성: 실사진 풀블리드 히어로(한 문장 헤드라인 · 핵심 숫자 · 이어 보기) + 학습 경로 노드 + AI 튜터에게 묻기
        → 「이어 볼 강의」 16:9 선반 → 할 일(마감 순 · D-day) · 마일리지 등급 링 · 추천 강좌 → 오늘 예약할 수 있는 시설 띠.
   데이터가 없으면 같은 틀의 빈 상태(그린 SVG 일러스트 · 한 문장 · 주 버튼 1개)를 그린다.
   재사용: window.LHB.photo(이름, i, big) — 강좌 이름으로 고른 CC0 학습 사진(img/stock), LHB.ring(pct) — 등급 링 SVG,
          LHB.dday(날짜) — {t:'D-3', hot:true}, LHB.empty(제목, 문장, 버튼HTML) — 빈 상태 블록.
   앱 프레임(body.lapp)에서는 그리지 않는다(앱 홈은 lapp.js 담당). */
(function () {
  if (typeof viewMy !== 'function') return;
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const P = { play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>', chev: '<path d="m9 6 6 6-6 6"/>', flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>', cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4m8-4v4M3.5 10h17"/>',
    spark: '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6"/>', mile: '<circle cx="12" cy="12" r="8.5"/><path d="m9 15 1.6-4.4L15 9l-1.6 4.4z"/>', pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>', book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>' };
  const I = (n, s = 18) => `<svg class="lhb-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const STOCK = { data: ['dat-01', 'lap-03', 'grp-03', 'lap-01', 'dsk-06', 'cod-03'], video: ['grp-02', 'vid-01', 'lap-03', 'dsk-06'], code: ['cod-03', 'cod-01', 'cod-04', 'lap-03'], ai: ['lap-03', 'grp-03', 'cod-03', 'lap-06'],
    room: ['lec-01', 'cls-03', 'cls-04', 'sem-01', 'lec-02'], sport: ['spo-04', 'spo-03', 'spo-08', 'spo-05'], space: ['off-02', 'off-05', 'sem-01', 'cls-04'], gen: ['stu-01', 'cam-07', 'grp-03', 'dsk-02', 'lap-06', 'lib-04', 'grp-06', 'dsk-06'] };
  const kindOf = n => /테니스|코트|농구|체육|골프|수영|요가|헬스|피트니스|풋살|탁구/.test(n) ? 'sport' : /엑셀|데이터|컴활|분석|파이썬|회계|통계/.test(n) ? 'data' : /영상|촬영|유튜브|사진/.test(n) ? 'video' : /코딩|개발|자동화|노션|프로그래밍/.test(n) ? 'code' : /AI|인공지능|생성형|챗GPT/i.test(n) ? 'ai' : /스터디|세미나|회의|룸|라운지/.test(n) ? 'space' : /오프라인|원데이|특강|워크숍|강의실/.test(n) ? 'room' : 'gen';
  function photo(name, i = 0, big) { if (typeof window.lPhoto === 'function') return window.lPhoto(String(name || ''), 'h' + i, big); /* v43 Q2: 화면 안 중복 금지 공통 규칙 */ const L = STOCK[kindOf(String(name || ''))]; return `img/stock/${L[(hash(name) + i) % L.length]}${big ? '' : '-800'}.webp`; }
  const shopCls = id => { try { return ((SITE().shop || {}).classes || []).find(x => x.id === id) || null; } catch (e) { return null; } };
  const thumbOf = (c, it, i) => { const s = shopCls(c.id); if (s && s.thumb) return s.thumb; if (it && it.yt && /^[\w-]{11}$/.test(it.yt)) return `https://i.ytimg.com/vi/${it.yt}/hqdefault.jpg`; return photo(c.name, i || 0); };
  const day0 = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  function dday(d) { if (!d) return null; const n = Math.round((Date.parse(String(d).slice(0, 10)) - Date.parse(day0())) / 864e5); if (isNaN(n)) return null; return { n, t: n < 0 ? '지남' : n === 0 ? '오늘' : `D-${n}`, hot: n <= 3, md: String(d).slice(5, 10).replace('-', '/') }; }
  function ring(pct, size = 112, w = 11) { const r = (size - w) / 2, C = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pct || 0)); return `<svg class="lhb-rg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--c-track)" stroke-width="${w}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--pri)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(C * v / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`; }
  const ILL = { path: '<svg viewBox="0 0 160 110" width="160" height="110" aria-hidden="true"><rect x="8" y="16" width="144" height="82" rx="16" fill="var(--lhb-il1)"/><path d="M30 70c18-26 34 8 52-14s30-22 48-6" fill="none" stroke="var(--lhb-il3)" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 9"/><circle cx="30" cy="70" r="9" fill="var(--pri)"/><circle cx="82" cy="56" r="7" fill="var(--lhb-il2)"/><circle cx="130" cy="50" r="11" fill="var(--surface)" stroke="var(--pri)" stroke-width="3"/><path d="M126 50h8m-4-4v8" stroke="var(--pri)" stroke-width="3" stroke-linecap="round"/></svg>',
    todo: '<svg viewBox="0 0 120 90" width="120" height="90" aria-hidden="true"><rect x="22" y="10" width="76" height="72" rx="14" fill="var(--lhb-il1)"/><rect x="34" y="26" width="40" height="7" rx="3.5" fill="var(--lhb-il2)"/><rect x="34" y="42" width="52" height="7" rx="3.5" fill="var(--lhb-il2)"/><rect x="34" y="58" width="30" height="7" rx="3.5" fill="var(--lhb-il2)"/><circle cx="92" cy="66" r="15" fill="var(--pri)"/><path d="m85 66 5 5 9-10" fill="none" stroke="var(--pri-ink)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shelf: '<svg viewBox="0 0 140 90" width="140" height="90" aria-hidden="true"><rect x="10" y="14" width="120" height="68" rx="14" fill="var(--lhb-il1)"/><rect x="22" y="26" width="58" height="34" rx="8" fill="var(--lhb-il2)"/><path d="m45 36 12 7-12 7z" fill="var(--pri)"/><rect x="88" y="28" width="30" height="6" rx="3" fill="var(--lhb-il2)"/><rect x="88" y="40" width="22" height="6" rx="3" fill="var(--lhb-il2)"/><rect x="22" y="68" width="96" height="5" rx="2.5" fill="var(--lhb-il2)"/><rect x="22" y="68" width="40" height="5" rx="2.5" fill="var(--pri)"/></svg>' };
  const empty = (ill, t, btn) => `<div class="lhb-em">${ILL[ill] || ILL.todo}<p>${t}</p>${btn || ''}</div>`;
  window.LHB = { photo, ring, dday, empty, ILL };

  /* ── 데이터 모으기 ── */
  function gather() {
    const S2 = SITE(); const st = myStats(); const lp = LR.lp || {};
    const rows = st.courses.map(x => { const r = ((lp.cls || {})[x.c.id]) || { items: {} }; const L = (x.c.items || []).filter(i => i.type !== 'chapter'); const at = it => (r.items || {})[it.id] || {};
      const pct = it => { const a = at(it); if (a.done) return 100; const w = +a.w || 0; return Math.max(0, Math.min(99, Math.round(w <= 1 ? w * 100 : w))); };
      const scores = L.map(it => at(it).score).filter(v => v != null && !isNaN(+v)).map(Number);
      return { ...x, L, at, pct, scores, ni: x.next ? L.indexOf(x.next) : L.length }; });
    const live = rows.filter(x => !x.done || x.next).sort((a, b) => (b.started - a.started) || (b.p - a.p));
    const main = live[0] || rows[0] || null;
    const scores = rows.flatMap(x => x.scores); const qavg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const todo = []; rows.forEach(x => x.L.forEach(it => { if (!/^(assign|quiz|exam|survey)$/.test(it.type) || x.at(it).done) return; todo.push({ x, it, due: it.to || it.due && typeof it.due === 'string' && it.due || x.c.end || '' }); }));
    todo.sort((a, b) => String(a.due || '9').localeCompare(String(b.due || '9')));
    const shelf = []; if (main) { main.L.slice(Math.max(0, main.ni), main.ni + 3).forEach((it, k) => shelf.push({ x: main, it, k: k === 0 ? 'cont' : 'new' })); if (main.ni > 0) shelf.push({ x: main, it: main.L[main.ni - 1], k: 'done' }); }
    live.slice(1).forEach(x => { if (x.next && shelf.length < 8) shelf.splice(Math.min(2, shelf.length), 0, /* v43 F3: 지금 강좌의 다음 차시 2개를 앞에 */ { x, it: x.next, k: x.pct(x.next) > 0 ? 'cont' : 'new' }); });
    const mineIds = new Set(rows.map(x => x.c.id)); const rec = (S2.classes || []).filter(c => !mineIds.has(c.id) && (c.items || []).length);
    let mile = null; try { if (window.mileOn && window.mileOn() && window.LMIL && LMIL.model) { const M = LMIL.model(LR.me.sid); mile = M && M.tier ? M : null; } } catch (e) { mile = null; }
    let fac = []; try { fac = (window.facOn && window.facOn() && S2.fac && S2.fac.facilities) || []; } catch (e) { fac = []; }
    return { S2, st, rows, main, qavg, todo, shelf: shelf.slice(0, 4), rec, mile, fac };
  }

  /* ── 조각 ── */
  const nm = () => String((LR.me && (LR.me.nick || LR.me.name)) || '수강생');
  const short = n => String(n || '').replace(/\s*[(（].*$/, '').slice(0, 14);
  function path(m) { const L = m.L; const N = Math.min(8, L.length); if (!N) return '';
    const idx = k => Math.min(L.length - 1, Math.floor(k * L.length / N)); const cur = Math.min(N - 1, Math.floor(m.ni * N / Math.max(1, L.length)));
    const nodes = []; for (let k = 0; k < N; k++) { const last = k === N - 1; const s = m.done && !m.next ? 'd' : k < cur ? 'd' : k === cur ? 'c' : 'f'; if (k) nodes.push(`<span class="lhb-ln ${s === 'f' ? 'f' : ''}"></span>`); nodes.push(`<span class="nd ${s}" title="${E(L[idx(k)].title)}">${last && s !== 'd' ? I('flag', 16) : s === 'd' ? I('check', 15) : k + 1}</span>`); }
    const nx = m.next; const th = nx ? thumbOf(m.c, nx, m.ni) : '';
    return `<div class="lhb-pc"><div class="t">${E(short(m.c.name))} 학습 경로<span class="num">${m.L.length}차시 중 ${m.doneN}차시 · ${m.p}%</span></div>
      <div class="nodes" role="img" aria-label="${m.L.length}차시 중 ${m.doneN}차시 완료">${nodes.join('')}</div>
      <div class="lhb-lb"><span>${E(short(L[0].title))}</span><span>${E(short((nx || L[L.length - 1]).title))}</span><span>수료</span></div>
      ${nx ? `<a class="lhb-nx" href="#c/${E(m.c.id)}/${E(nx.id)}"><span class="ph" style="background-image:url('${E(th)}')"><i style="width:${m.pct(nx)}%"></i></span><span class="tx"><small class="num">이어 볼 차시 · ${m.ni + 1}차시${m.pct(nx) ? ` · ${m.pct(nx)}% 들었어요` : ''}</small><b>${E(nx.title)}</b></span><span class="go">${I('play', 18)}</span></a>` : `<a class="lhb-nx" href="#cert/${E(m.c.id)}"><span class="tx"><small>모든 차시를 마쳤어요</small><b>수료증 보기</b></span><span class="go">${I('chev', 18)}</span></a>`}</div>`; }
  function hero(G) { const m = G.main; const st = G.st; const name = nm();
    const eb = st.streak > 0 ? `${E(name)}님의 이번 주 · ${st.streak}일 연속 학습 중` : `${E(name)}님, 다시 만나 반가워요`;
    const tut = `<div class="tut"><span class="cap">${m ? '방금 본 차시를 알고 있어요' : '무엇부터 배울지 함께 골라요'}</span><a class="lhb-btn sc dk" href="#ai"><span class="ai-lb">AI</span>AI 튜터에게 묻기</a></div>`;
    if (!m) return `<section class="lhb-hero" style="--ph:url('${photo('시작', 0, 1)}')"><div class="lhb-hg"><div>
      <span class="lhb-eb"><i></i>${eb}</span><h1>첫 강좌를 고르면<br><em>학습 경로</em>가 여기에 그려져요.</h1>
      <p class="lead">강좌를 신청하면 이어 볼 차시 · 할 일 · 마감이 이 화면에 모여요.</p>
      <div class="ac"><a class="lhb-btn pr" href="#courses">${I('book', 20)}강좌 둘러보기</a></div></div>
      <div><div class="lhb-pc em">${ILL.path}<b>아직 시작한 강좌가 없어요</b><small>첫 차시를 들으면 경로가 채워져요.</small></div>${tut}</div></div></section>`;
    const nx = m.next; const left = m.L.length - m.doneN;
    const h1 = nx ? `${E(short(m.c.name))}, ${m.doneN ? `${m.doneN}차시까지 왔어요.` : '오늘 시작해요.'}<br>오늘은 <em>${E(nx.title)}</em> 차례예요.` : `${E(short(m.c.name))}, 모든 차시를 마쳤어요.<br><em>수료증</em>을 받아 보세요.`;
    const lead = nx ? `남은 차시 ${left}개${m.c.end ? ` · ${E(String(m.c.end).slice(5).replace('-', '월 ').replace(/^0/, ''))}일까지 들을 수 있어요` : ''}. 수료 기준은 진도 ${m.c.thr || 80}%예요.` : '수료 기준을 채웠어요. 다음 강좌도 이어서 배울 수 있어요.';
    const stats = [`평균 진도 <b>${st.avg}%</b>`, G.qavg != null ? `퀴즈 평균 <b>${G.qavg}점</b>` : '', `수강 중 <b>${G.rows.length}개</b>`].filter(Boolean).map(x => `<span>${x}</span>`).join('');
    return `<section class="lhb-hero" style="--ph:url('${E(photo(m.c.name, 0, 1))}')"><div class="lhb-hg"><div>
      <span class="lhb-eb"><i></i>${eb}</span><h1>${h1}</h1><p class="lead num">${lead}</p>
      <div class="ac">${nx ? `<a class="lhb-btn pr" href="#c/${E(m.c.id)}/${E(nx.id)}">${I('play', 20)}${m.pct(nx) ? '이어 보기' : '바로 시작하기'}</a>` : `<a class="lhb-btn pr" href="#cert/${E(m.c.id)}">수료증 보기</a>`}<div class="sts num">${stats}</div></div></div>
      <div>${path(m)}${tut}</div></div></section>`; }
  function shelf(G) { const head = (t, tags) => `<div class="lhb-sh"><h2>${t}</h2>${tags || ''}<a class="lhb-btn tx" href="#courses">전체 보기${I('chev', 16)}</a></div>`;
    if (!G.shelf.length) { const R = G.rec.slice(0, 4); if (!R.length) return `<section class="lhb-shelf">${head('이어 볼 강의')}${empty('shelf', '이어 볼 강의가 아직 없어요. 강좌를 고르면 여기에 모여요.', '<a class="lhb-btn pr sm" href="#courses">강좌 둘러보기</a>')}</section>`;
      return `<section class="lhb-shelf">${head('이런 강좌로 시작해요', '<span class="lhb-tg">추천</span>')}<div class="lhb-rw">${R.map((c, i) => { const s = shopCls(c.id); return `<a class="lhb-v" href="#${s ? 'class' : 'c'}/${E(c.id)}"><span class="lhb-th" style="background-image:url('${E(thumbOf(c, null, i))}')"><span class="k">${E(c.ctype || '온라인')}</span>${c.hours ? `<span class="du num">${c.hours}시간</span>` : ''}</span><b>${E(c.name)}</b><small class="num">${(c.items || []).filter(x => x.type !== 'chapter').length}차시${s && s.price ? ` · ${Number(s.price).toLocaleString('ko-KR')}원` : ''}</small></a>`; }).join('')}</div></section>`; }
    const newN = G.shelf.filter(s => s.k === 'new').length;
    return `<section class="lhb-shelf">${head('이어 볼 강의', `<span class="lhb-tg num">${E(short(G.main.c.name))} · ${G.main.ni + 1}차시</span>${newN ? `<span class="lhb-tg g num">다음 차시 ${newN}</span>` : ''}`)}<div class="lhb-rw">${G.shelf.map((s, i) => { const p = s.x.pct(s.it); const K = s.k === 'cont' ? `<span class="k">${I('play', 13)}${p ? '이어 보기' : '시작하기'}</span>` : s.k === 'done' ? '<span class="k">다 봤어요</span>' : '<span class="k new">다음 차시</span>'; const sc = s.x.at(s.it).score;
      return `<a class="lhb-v ${i === 0 ? 'on' : ''}" href="#c/${E(s.x.c.id)}/${E(s.it.id)}"><span class="lhb-th" style="background-image:url('${E(thumbOf(s.x.c, s.it, s.x.L.indexOf(s.it)))}')">${K}${i === 0 ? `<span class="pl2">${I('play', 22)}</span>` : ''}${s.it.dur ? `<span class="du num">${Math.round(s.it.dur / 60)}분</span>` : ''}<span class="pg"><i style="width:${p}%"></i></span></span><b>${s.x.L.indexOf(s.it) + 1}. ${E(s.it.title)}</b><small class="num">${E(short(s.x.c.name))} · ${s.k === 'done' ? `다시 보기${sc != null ? ` · ${E(sc)}점` : ''}` : p ? `<em>${p}%</em> 들었어요` : TY[s.it.type] || '차시'}</small></a>`; }).join('')}</div></section>`; }
  const TY = { video: '영상', quiz: '퀴즈', assign: '과제', exam: '평가', survey: '설문', live: '실시간 수업', doc: '자료' };
  function todo(G) { const T = G.todo.slice(0, 3);
    return `<section class="lhb-cd"><div class="hd"><h3>할 일 · 마감 순</h3>${G.todo.length ? `<span class="lhb-tg co num">남은 ${G.todo.length}</span>` : ''}<a class="lhb-btn tx" href="#cal">캘린더${I('chev', 16)}</a></div>
      ${T.length ? `<div class="lhb-its">${T.map((t, i) => { const d = dday(t.due); return `<a class="it ${i === 0 ? 'hv' : ''}" href="#c/${E(t.x.c.id)}/${E(t.it.id)}"><span class="dd ${d && d.hot ? 'co' : 'n'} num">${d ? d.t : '상시'}${d ? `<small>${d.md}</small>` : ''}</span><span class="tx"><b>${E(t.it.title)}</b><small>${E(short(t.x.c.name))} · ${TY[t.it.type] || '할 일'}</small></span><span class="cv">${I('chev', 18)}</span></a>`; }).join('')}</div>`
      : empty('todo', G.rows.length ? '남은 과제 · 퀴즈가 없어요. 이번 주도 잘하고 있어요.' : '강좌를 신청하면 과제 · 퀴즈 마감이 여기에 보여요.', `<a class="lhb-btn sc sm" href="#${G.rows.length ? 'cal' : 'courses'}">${G.rows.length ? '캘린더 보기' : '강좌 둘러보기'}</a>`)}</section>`; }
  function mileCard(G) { const M = G.mile; const st = G.st;
    if (!M) return `<section class="lhb-cd"><div class="hd"><h3>내 학습 기록</h3><span class="lhb-tg g">${st.streak}일 연속</span></div><div class="ml"><div class="rng">${ring(st.avg)}<div class="c"><b class="num">${st.avg}%</b><span>평균 진도</span></div></div>
      <div>${(n => `<span class="lhb-tg num">${n ? `배지 ${n}개` : '첫 배지에 도전 중'}</span>`)((LR.mine && LR.mine.badges || []).length)}<p>학습한 날 <b>${st.active}일</b>${G.qavg != null ? ` · 퀴즈 평균 <b>${G.qavg}점</b>` : ''}. 오늘 한 차시만 들어도 연속 기록이 이어져요.</p></div></div><a class="lhb-btn tx foot" href="#badges">배지 · 수료증 보기${I('chev', 16)}</a></section>`;
    const T = M.tier; const U = E(M.unit || 'P'); const all = T.all && T.all.length ? T.all : [T.name]; const pct = T.nmin ? Math.round((T.now - T.min) / Math.max(1, T.nmin - T.min) * 100) : 100;
    return `<section class="lhb-cd"><div class="hd"><h3>내 마일리지</h3><span class="lhb-tg g">${E(T.name)} 등급</span></div>
      <div class="ml"><div class="rng">${ring(T.nmin ? T.now / T.nmin * 100 : 100)}<div class="c"><b class="num">${Number(M.balance || 0).toLocaleString('ko-KR')}${U}</b>${T.nmin ? `<span class="num">/ ${T.nmin.toLocaleString('ko-KR')}</span>` : ''}</div></div>
      <div>${T.next ? `<span class="lhb-tg co num">다음 등급까지 ${Number(T.left).toLocaleString('ko-KR')}${U}</span><p>${M.goal && M.goal.hint ? E(M.goal.hint) : '과제와 퀴즈를 마치면'} <b>${E(T.next)}</b>에 가까워져요.</p>` : '<span class="lhb-tg g">최고 등급</span><p>모은 마일리지로 보상을 받아 보세요.</p>'}</div></div>
      <div class="lv" aria-hidden="true">${all.map((n, i) => `<span class="${i < T.idx ? 'd' : i === T.idx ? 'h' : ''}" style="${i === T.idx ? `--p:${Math.max(8, Math.min(100, pct))}%` : ''}"></span>`).join('')}</div>
      <div class="lvl">${all.map((n, i) => `<span class="${i === T.idx ? 'on' : ''}">${E(n)}</span>`).join('')}</div><a class="lhb-cover" href="#mile" aria-label="내 마일리지 자세히 보기"></a></section>`; }
  function recCard(G) { const c = G.rec[0]; if (!c) return ''; const s = shopCls(c.id); const n = (c.items || []).filter(x => x.type !== 'chapter').length;
    return `<a class="lhb-rc" href="#${s ? 'class' : 'c'}/${E(c.id)}" style="--ph:url('${E(thumbOf(c, null, 3))}')"><span class="tgs"><span class="w">${G.main ? '다음으로 추천' : '처음이라면'}</span><span class="d">${E(c.ctype || '온라인')} · ${n}차시</span></span><b>${E(c.name)}</b><small class="num">${c.start ? `${E(String(c.start).slice(5).replace('-', '월 ').replace(/^0/, ''))}일 개강` : '바로 들을 수 있어요'}${s && s.price ? ` · ${Number(s.price).toLocaleString('ko-KR')}원` : ''}</small></a>`; }
  function facBand(G) { if (!G.fac.length) return ''; const F = G.fac.slice(0, 3); const d = new Date(Date.now() + 9 * 3600e3); const W = '일월화수목금토'[d.getUTCDay()];
    return `<section class="lhb-band"><div class="lb2"><b>오늘 예약할 수 있는 시설</b><span class="num">${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${W}) · ${G.fac.length}곳</span></div>${F.map((f, i) => { const h = f.hours && (f.hours[d.getUTCDay()] || f.hours[String(d.getUTCDay())]); return `<div class="fc"><span class="ph" style="background-image:url('${E(f.photo || photo(f.name, i))}')"></span><span class="tx"><b>${E(f.name)}</b><small class="num">${h && h[0] ? `운영 ${E(h[0])}–${E(h[1])}` : E(f.place || '')}</small></span><a class="lhb-btn sc sm" href="#fac/${E(f.id)}">예약</a></div>`; }).join('')}<a class="lhb-btn tx all" href="#fac">전체 시설${I('chev', 16)}</a></section>`; }

  function hub() { const G = gather(); return `<div class="lhb" data-lhb="${G.main ? 'on' : 'empty'}">${hero(G)}<div class="lhb-in">${shelf(G)}<div class="lhb-r1">${todo(G)}${mileCard(G)}${recCard(G)}</div>${facBand(G)}</div></div>`; }
  window.LHB.hub = hub;

  /* v43 F3(085): 로그인한 학습자의 PC 웹 홈 = 학습 허브(무대 히어로 · 학습 경로 · 이어 볼 강의 4열 · 할 일 · 마일리지 · 추천) + 다음 강좌 · 기관 소식.
     방문자 홈(기관 홈페이지 섹션) · 앱 화면(lapp) · 보호자 · 빌더 미리보기는 그대로 둔다. 홈페이지 첫 화면의 흰 콜라주 · 회색 과정 표가 로그인 후 첫 화면을 차지하던 문제(K3 085) */
  const lhbHome = () => { try { return !!(SITE() && LR.me && LR.me.kind !== 'parent' && LR.mode !== 'preview' && !(typeof window.lappOn === 'function' && window.lappOn())); } catch (e) { return false; } };
  window.lhbHome = lhbHome;
  function homeMore(G) { const R = G.rec.slice(G.rec.length > 3 ? 1 : 0, 4); const N = ((G.S2.notices || []).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || String(b.at || '').localeCompare(String(a.at || '')))).slice(0, 4);
    if (!R.length && !N.length) return '';
    const recH = R.length ? `<section class="lhb-hmr"><div class="lhb-sh"><h2>${G.main ? '다음으로 들어 볼 강좌' : '이런 강좌로 시작해요'}</h2><span class="lhb-tg">추천 ${R.length}</span><a class="lhb-btn tx" href="#courses">강좌 전체${I('chev', 16)}</a></div><div class="lhb-rw">${R.map((c, i) => { const s = shopCls(c.id); const n = (c.items || []).filter(x => x.type !== 'chapter').length;
      return `<a class="lhb-v" href="#${s ? 'class' : 'c'}/${E(c.id)}"><span class="lhb-th" style="background-image:url('${E(thumbOf(c, null, i + 5))}')"><span class="k">${E(c.ctype || '온라인')}</span>${c.hours ? `<span class="du num">${c.hours}시간</span>` : ''}</span><b>${E(c.name)}</b><small class="num">${n}차시${s && s.price ? ` · ${Number(s.price).toLocaleString('ko-KR')}원` : ''}${c.start ? ` · ${E(String(c.start).slice(5).replace('-', '/'))} 개강` : ''}</small></a>`; }).join('')}</div></section>` : '';
    const ntH = N.length ? `<section class="lhb-cd lhb-hmn"><div class="hd"><h3>기관 소식</h3><span class="lhb-tg num">${(G.S2.notices || []).length}건</span><a class="lhb-btn tx" href="#notice">전체${I('chev', 16)}</a></div><div class="lhb-its">${N.map(n => { const d = String(n.at || '').slice(5, 10).replace('-', '/');
      return `<a class="it" href="#notice"><span class="dd n num">${E(d || '공지')}${n.pin ? '<small>고정</small>' : ''}</span><span class="tx"><b>${E(n.title)}</b><small>${E(n.cls || '전체 공지')}${n.views ? ` · 조회 ${n.views}` : ''}</small></span>${I('chev', 16)}</a>`; }).join('')}</div></section>` : '';
    return `<div class="lhb-hm ${recH && ntH ? '' : 'one'}">${recH}${ntH}</div>`; }
  function homeHub() { const G = gather(); return `<div class="lhb lhb-home" data-lhb="${G.main ? 'on' : 'empty'}">${hero(G)}<div class="lhb-in">${shelf(G)}<div class="lhb-r1">${todo(G)}${mileCard(G)}${recCard(G)}</div>${homeMore(G)}${facBand(G)}</div></div>`; }
  if (typeof viewPage === 'function') { const bp = viewPage; viewPage = (id, ...a) => { if ((id === 'home' || !id) && lhbHome()) { try { return homeHub(); } catch (e) { console.error('lhub home', e); } } return bp(id, ...a); }; } /* eslint-disable-line no-global-assign */
  /* 강의 수강(#c): 영상이 없을 때 회색 상자 대신 강좌 사진 포스터(LHB.photo) */
  if (typeof viewCourse === 'function') { const bc = viewCourse; viewCourse = (...a) => { const h = bc(...a); try { const c = (SITE().classes || []).find(x => x.id === a[0]); if (!c || typeof h !== 'string') return h; return h.replace(/<div class="novid">/g, `<div class="novid" style="--ph:url('${E(photo(c.name, 0, 1))}')">`); } catch (e) { return h; } }; }
  const base = viewMy; viewMy = (...a) => { const h = base(...a); try { if (!LR.me || LR.me.kind === 'parent' || document.body.classList.contains('lapp')) return h; return hub() + h; } catch (e) { console.error('lhub', e); return h; } };
})();
