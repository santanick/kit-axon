/* 디디쌤 스튜디오 v10.1 — 학습자 마이페이지 강화
   블록: 프로필 · 다음 할 일 · 수준 로드맵 · 배지 지갑 · 내 과정(피드백 · 수료증) · 튜토리얼 기록 · 진단 기록 · 학습 달력 · 내 과정 공지 · 내 기록 내려받기
   어드민(학습자 사이트 › 마이페이지)에서 블록을 켜고 끈다(S.lsite.my.blocks). 수료증 #cert/<과정> · 배지 증명 #badge/<배지>는 인쇄용 화면. */
'use strict';
const MYB_DEF = [['profile', '프로필 · 유형'], ['next', '다음 할 일'], ['roadmap', '수준 로드맵'], ['badges', '배지 지갑'], ['courses', '내 과정 · 피드백'], ['tuts', '튜토리얼 기록'], ['diag', '진단 기록'], ['streak', '학습 달력'], ['notices', '내 과정 공지'], ['data', '내 기록 내려받기']];
const kstDay = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const myBlocks = () => { const B = (SITE().my && SITE().my.blocks) || MYB_DEF.map(([k]) => [k, true]); return B.filter(([, on]) => on).map(([k]) => k); };
const ST_TXT = { none: '', submitted: '검수 대기', graded: '검수 완료', returned: '재제출 요청', failed: '미통과' };

/* ── 집계 ── */
function myStats() {
  const S2 = SITE(); const lp = LR.lp; const mine = LR.mine;
  const clsIds = [...new Set([...Object.keys(lp.cls || {}), ...Object.keys(mine.cls || {})])].filter(id => S2.classes.some(c => c.id === id));
  const courses = clsIds.map(id => { const c = S2.classes.find(x => x.id === id); const r = (lp.cls || {})[id] || { items: {} }; const m = (mine.cls || {})[id] || {};
    const doneN = Object.values(r.items || {}).filter(x => x && x.done).length; const pLocal = Math.round(doneN / Math.max(1, c.items.length) * 100); const p = Math.max(pLocal, m.p || 0);
    const next = c.items.find(x => !((r.items || {})[x.id] || {}).done); return { c, p, doneN, next, st: m.st || (r.sub ? 'submitted' : 'none'), fb: m.fb || '', score: m.score, done: m.done || p >= (c.thr || 80) }; });
  const tuts = S2.tuts.map(t => ({ t, r: (lp.tut || {})[t.id] })).filter(x => x.r);
  const diag = Object.entries(lp.diag || {}).map(([id, r]) => ({ d: (S2.diags || []).find(x => x.id === id), r })).filter(x => x.d);
  const myType = diag.length ? diag.sort((a, b) => String(b.r.at || '').localeCompare(String(a.r.at || '')))[0].r.out : '';
  const earned = new Set(mine.badges.map(b => b.id)); const lvEarned = S2.badges.filter(b => earned.has(b.id)).map(b => b.level ?? 0);
  const level = lvEarned.length ? Math.min(S2.levels.length - 1, Math.max(...lvEarned) + 1) : 0;
  const days = lp.days || {}; let streak = 0; for (let d = new Date(); ; d = new Date(d.getTime() - 864e5)) { if (days[kstDay(d)]) streak++; else if (streak || kstDay(d) !== kstDay()) break; if (streak > 400) break; }
  const avg = courses.length ? Math.round(courses.reduce((a, x) => a + x.p, 0) / courses.length) : 0;
  return { courses, tuts, diag, myType, earned, level, days, streak, active: Object.keys(days).length, avg };
}

/* ── 블록 ── */
const MYR = {
  profile(st) { const S2 = SITE(); const ty = S2.types.find(x => x.k === st.myType); const lv = S2.levels[st.level] || {};
    return `<div class="myp"><span class="ava" style="--c:${esc(ty ? ty.color : lv.color || '#4b3cff')}">${esc(ty ? ty.k.slice(0, 2) : String(LR.me.sid).slice(-2))}</span>
      <div class="mpi"><b>${esc(LR.me.sid)}</b><small>${esc(LR.me.dept || '')}</small><div class="chips2">${ty ? `<span class="tg" style="--c:${esc(ty.color)}">${esc(ty.name)} · ${esc(ty.k)}</span>` : `<a class="tg" style="--c:#E6337A" href="#dg/${esc((diagFirst() || {}).id || '')}">진단 전</a>`}<span class="tg" style="--c:${esc(lv.color || '#4b3cff')}">LEVEL ${st.level + 1} · ${esc(lv.name || '')}</span></div></div>
      <div class="mpn">${[[LR.mine.badges.length, '배지'], [st.courses.length, '과정'], [st.tuts.filter(x => (x.r.steps || []).filter(Boolean).length >= 3).length, '튜토리얼 완료'], [st.streak + '일', '연속 학습']].map(([n, l]) => `<div><b>${esc(String(n))}</b><small>${l}</small></div>`).join('')}</div>
      <button class="lbtn sm ghost" data-lact="logout">로그아웃</button></div>`; },
  next(st) { const S2 = SITE(); const A = [];
    st.courses.filter(x => x.st === 'returned').forEach(x => A.push([`재제출 요청 · ${x.c.name}`, x.fb || '운영자 피드백을 확인하고 다시 제출하세요.', `#c/${x.c.id}`, 'warn']));
    if (!st.myType && diagFirst()) A.push(['진단부터 시작하세요', '5분이면 나에게 맞는 과정이 열립니다.', '#dg/' + diagFirst().id, 'pri']);
    st.courses.filter(x => !x.done && x.next).slice(0, 2).forEach(x => A.push([`이어서 학습 · ${x.c.name}`, `${x.next.title} (${x.p}%)`, `#c/${x.c.id}/${x.next.id}`, '']));
    st.tuts.filter(x => (x.r.steps || []).filter(Boolean).length >= 3 && !x.r.mission).slice(0, 1).forEach(x => A.push([`미션 제출 · ${x.t.title}`, x.t.mission, `#t/${x.t.id}`, '']));
    const rec = S2.tuts.find(t => !tutDone(t) && (!st.myType || t.type === st.myType) && t.level <= st.level) || S2.tuts.find(t => !tutDone(t));
    if (rec) A.push([`추천 튜토리얼 · ${rec.title}`, `${tyOf(rec.type).name} · ${lvOf(rec.level).name}`, `#t/${rec.id}`, '']);
    return `<div class="mycard"><h3>다음 할 일</h3>${A.slice(0, 4).map(([h, d, href, k]) => `<a class="nx ${k}" href="${esc(href)}"><b>${esc(h)}</b><small>${esc(d || '')}</small><i>›</i></a>`).join('') || '<p class="empty">모든 과제를 마쳤습니다. 다음 수준에 도전해 보세요!</p>'}</div>`; },
  roadmap(st) { const S2 = SITE(); return `<div class="mycard"><h3>수준 로드맵</h3><div class="rm">${S2.levels.map((l, i) => { const T = S2.tuts.filter(t => t.level === i); const td = T.filter(tutDone).length; const C2 = S2.types.map(x => S2.grid[i + ':' + x.k]).filter(Boolean); const cd = C2.filter(id => (st.courses.find(x => x.c.id === id) || {}).done).length; const b = S2.badges.find(x => x.level === i); const has = b && st.earned.has(b.id); const pct = Math.round(((td / Math.max(1, T.length)) + (cd / Math.max(1, C2.length))) / 2 * 100);
      return `<div class="rmi ${has ? 'on' : i > st.level ? 'lock' : ''}" style="--c:${esc(l.color)}"><span class="med">${i + 1}</span><div><b>${esc(l.name)}</b><small>${esc(l.goal || '')}</small><div class="wbar"><i style="width:${has ? 100 : pct}%"></i></div><small>튜토리얼 ${td}/${T.length} · 과정 ${cd}/${C2.length}${b ? ` · 배지 ${has ? '획득' : '미획득'}` : ''}</small></div></div>`; }).join('')}</div></div>`; },
  badges(st) { const S2 = SITE(); return `<div class="mycard"><h3>배지 지갑 <small>${LR.mine.badges.length}/${S2.badges.length}</small></h3><div class="wallet">${S2.badges.map(b => { const e = LR.mine.badges.find(x => x.id === b.id); return `<a class="wb ${e ? 'on' : ''}" href="${e ? '#badge/' + esc(b.id) : '#badges'}"><span class="med" style="--c:${esc(b.fill)};--r:${esc(b.ring)}">${(b.level ?? 0) + 1}</span><b>${esc(b.name)}</b><small>${e ? `${esc(e.at || '')} · No.${esc(e.no || '')}` : esc(lvOf(b.level).goal || '획득 전')}</small>${e ? '<em>증명서 보기</em>' : ''}</a>`; }).join('') || '<p class="empty">배지가 없습니다.</p>'}</div></div>`; },
  courses(st) { return `<div class="mycard wide"><h3>내 과정</h3>${st.courses.length ? `<div class="mcs">${st.courses.map(x => `<div class="mc"><div class="mch"><a href="#c/${esc(x.c.id)}"><b>${esc(x.c.name)}</b></a>${x.st !== 'none' && ST_TXT[x.st] ? `<span class="st ${esc(x.st)}">${ST_TXT[x.st]}</span>` : ''}</div><div class="wbar"><i style="width:${x.p}%"></i></div><small>진도 ${x.p}% · ${x.doneN}/${x.c.items.length} 항목${x.score != null ? ` · 점수 ${esc(String(x.score))}` : ''} · 수료 기준 ${x.c.thr || 80}%</small>${x.fb ? `<p class="fb"><b>피드백</b> ${esc(x.fb)}</p>` : ''}<div class="mca">${x.next && !x.done ? `<a class="lbtn sm" href="#c/${esc(x.c.id)}/${esc(x.next.id)}">이어서 학습</a>` : ''}${x.done ? `<a class="lbtn sm ghost" href="#cert/${esc(x.c.id)}">수료증</a>` : ''}</div></div>`).join('')}</div>` : `<p class="empty">아직 시작한 과정이 없습니다. ${btn('코스웨어 보기', '#courses', 'ghost')}</p>`}</div>`; },
  tuts(st) { return `<div class="mycard"><h3>튜토리얼 기록</h3>${st.tuts.length ? st.tuts.slice(0, 8).map(x => { const n = (x.r.steps || []).filter(Boolean).length; return `<a class="tr" href="#t/${esc(x.t.id)}"><span>${esc(x.t.title)}</span><small>시청 ${Math.round((x.r.w || 0) * 100)}% · ${n}/3단계${x.r.mission ? ' · 미션 제출' : ''}</small></a>`; }).join('') : '<p class="empty">아직 기록이 없습니다.</p>'}</div>`; },
  diag(st) { const S2 = SITE(); return `<div class="mycard"><h3>진단 기록</h3>${st.diag.length ? st.diag.map(({ d, r }) => { const o = d.outs.find(x => x.k === r.out) || {}; const ty = S2.types.find(x => x.k === r.out); const rec = S2.classes.find(c => c.id === o.rec); return `<div class="dr" style="--c:${esc(ty ? ty.color : '#4b3cff')}"><b>${esc(o.l || r.out)}${ty ? ` · ${esc(ty.k)}` : ''}</b><small>${esc(d.name)}${r.score != null ? ` · ${r.score}점` : ''} · ${esc(String(r.at || '').slice(0, 10))}</small>${rec ? `<a href="#c/${esc(rec.id)}">추천 과정 · ${esc(rec.name)}</a>` : ''}<a href="#dg/${esc(d.id)}">다시 진단</a></div>`; }).join('') : `<p class="empty">진단 기록이 없습니다. ${diagFirst() ? btn('진단 시작', '#dg/' + diagFirst().id, 'ghost') : ''}</p>`}</div>`; },
  streak(st) { const today = new Date(); const cells = []; for (let i = 83; i >= 0; i--) { const d = kstDay(new Date(today.getTime() - i * 864e5)); const n = st.days[d] || 0; cells.push(`<i class="h${n ? Math.min(4, 1 + Math.floor(Math.log2(n))) : 0}" title="${d}${n ? ` · 활동 ${n}` : ''}"></i>`); }
    return `<div class="mycard"><h3>학습 달력 <small>최근 12주</small></h3><div class="heat">${cells.join('')}</div><p class="mini">연속 ${st.streak}일 · 학습한 날 ${st.active}일</p></div>`; },
  notices(st) { const names = new Set(st.courses.map(x => x.c.name)); const N = SITE().notices.filter(n => n.cls ? names.has(n.cls) : n.pin).slice(0, 5); return `<div class="mycard"><h3>내 과정 공지</h3>${N.map(n => `<details class="nt"><summary>${n.pin ? '<em>고정</em>' : ''}<b>${esc(n.title)}</b><time>${esc(n.at)}</time></summary>${n.body ? `<p>${nl(n.body)}</p>` : ''}</details>`).join('') || '<p class="empty">새 공지가 없습니다.</p>'}</div>`; },
  data() { return `<div class="mycard"><h3>내 기록</h3><p class="mini">학습 기록은 ${SITE().org.type === 'univ' ? '학번 · 학과' : '번호 · 소속'}와 함께만 저장됩니다. 언제든 내려받을 수 있습니다.</p><button class="lbtn sm ghost" data-lact="mydl">내 학습 기록 내려받기(JSON)</button></div>`; }
};

viewMy = function () {
  if (!LR.me) return needLogin('my'); const st = myStats();
  return `<section class="sec mypage"><div class="in"><div class="mygrid">${myBlocks().map(k => { try { return MYR[k] ? MYR[k](st) : ''; } catch (e) { console.error(e); return ''; } }).join('')}</div></div></section>`;
};

/* ── 수료증 · 배지 증명(인쇄용) ── */
function viewCert(cid) {
  if (!LR.me) return needLogin('cert/' + cid); const st = myStats(); const x = st.courses.find(y => y.c.id === cid);
  if (!x || !x.done) return `<section class="sec"><div class="in narrow"><h1>수료증</h1><p class="lead">수료 기준(${x ? x.c.thr || 80 : 80}%)을 채우면 수료증이 발급됩니다.</p>${btn('내 과정으로', '#my', 'ghost')}</div></section>`;
  return `<section class="sec"><div class="in narrow"><div class="certp"><small>CERTIFICATE OF COMPLETION</small><h1>수료증</h1><p class="cn">${esc(LR.me.sid)}${LR.me.dept ? ` · ${esc(LR.me.dept)}` : ''}</p><p>위 학습자는 「${esc(x.c.name)}」 과정을 진도 ${x.p}%로 이수하였기에 이 증서를 드립니다.</p><p class="cd">${esc(kstDay())}</p><b class="co">${esc(SITE().org.name)}</b></div><div class="cta noprint"><button class="lbtn" data-lact="print">인쇄 · PDF 저장</button>${btn('내 과정으로', '#my', 'ghost')}</div></div></section>`;
}
function viewBadgeCert(bid) {
  if (!LR.me) return needLogin('badge/' + bid); const b = SITE().badges.find(x => x.id === bid); const e = LR.mine.badges.find(x => x.id === bid);
  if (!b || !e) return `<section class="sec"><div class="in narrow"><h1>배지</h1><p class="lead">아직 획득하지 않은 배지입니다.</p>${btn('배지 안내', '#badges', 'ghost')}</div></section>`;
  return `<section class="sec"><div class="in narrow"><div class="certp badgep"><span class="med big" style="--c:${esc(b.fill)};--r:${esc(b.ring)}">${(b.level ?? 0) + 1}</span><small>DIGITAL BADGE</small><h1>${esc(b.name)}</h1><p>${esc(b.desc || lvOf(b.level).goal || '')}</p><p class="cn">${esc(LR.me.sid)}${LR.me.dept ? ` · ${esc(LR.me.dept)}` : ''}</p><p class="cd">발급 ${esc(e.at || '')} · No.${esc(e.no || '')}</p><b class="co">${esc(SITE().org.name)}</b></div><div class="cta noprint"><button class="lbtn" data-lact="print">인쇄 · PDF 저장</button>${btn('배지 지갑', '#my', 'ghost')}</div></div></section>`;
}
document.addEventListener('click', e => { const el = e.target.closest('[data-lact]'); if (!el) return;
  if (el.dataset.lact === 'print') window.print();
  if (el.dataset.lact === 'mydl' && LR.me) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ format: 'didisam-learner/1', org: SITE().org.name, sid: LR.me.sid, dept: LR.me.dept || '', exportedAt: new Date().toISOString(), badges: LR.mine.badges, progress: LR.lp }, null, 1)], { type: 'application/json' })); a.download = `my_learning_${LR.me.sid}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
});
