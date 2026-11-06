/* 시나리오 k12 — 학습자 앱(원생 · 보호자). 작성 규칙은 저장소 루트의 CLAUDE.md를 따른다.
   - 원생 본인(#my) · 보호자 보기(원생 계정의 보호자 모드) · 보호자 계정(자녀 관리)에 학원 기록을 보인다:
     출결 · 등하원 · 진도 · 과제(제출 여부) · 학원 시험(점수 · 반 평균, 석차 제외) · 예정 보강 · 학원이 공유한 상담.
   - 데이터: 운영 서버는 GET /api/pub/<tid>/me 의 mine.k12(app.js k12Of · PubServiceImpl.k12Of), 데모 · 미리보기는 같은 규칙으로 데이터룸 문서에서 계산한다.
   - 학원 질문(숙제 · 출석 · 성적 · 보강)은 원생 정보를 외부 AI로 보내지 않고 브라우저에서 답한다.
   - 원생 개별 메모 · 다른 원생 이름 · 석차는 보여 주지 않는다. */
(function () {
  'use strict';
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const isK12 = () => { try { const s = typeof SITE === 'function' && SITE(); return !!(s && s.org && s.org.type === 'k12'); } catch (e) { return false; } };
  const td = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const isGuard = () => { try { return typeof lGuard === 'function' && lGuard(); } catch (e) { return false; } };
  const isPar = () => !!(typeof LR === 'object' && LR.me && LR.me.kind === 'parent');

  /* ── 서버 k12Of와 같은 규칙 ── */
  function k12Proj(doc, mid) {
    const str = v => (v == null ? '' : String(v)); const cut = (v, n) => str(v).slice(0, n); const ob = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
    const att = [], ex = [], mk = []; mid = str(mid);
    for (const c of (Array.isArray(doc && doc.classes) ? doc.classes : [])) {
      if (!c || !Array.isArray(c.learners) || !c.learners.map(String).includes(mid)) continue; const cid = str(c.id), cn = cut(c.name, 60);
      for (const s of (Array.isArray(c.sessions) ? c.sessions : [])) { if (!s) continue; const k = str(s.id); const a = ob(ob(c.att)[k])[mid]; const st = typeof a === 'string' ? a : (a && typeof a === 'object' ? str(a.st) : ''); const day = ob(ob(c.crmDay)[k]); const row = ob(ob(day.rows)[mid]); const tm = ob(ob(ob(c.attT)[k])[mid]);
        if (!st && !day.closed && !day.prog && !day.hw) continue; att.push({ c: cid, cn, d: cut(s.date, 10), st: cut(st, 10), in: cut(tm.in, 5), out: cut(tm.out, 5), r: cut(row.reason, 60), p: cut(day.prog, 100), hw: cut(day.hw, 100), done: !!row.hw, x: !!day.closed }); }
      for (const e of (Array.isArray(c.k12Exams) ? c.k12Exams : [])) { if (!e) continue; const SC = ob(e.scores); const sc = SC[mid]; if (!sc || typeof sc !== 'object') continue; const V = Object.values(SC).filter(x => x && typeof x === 'object' && !x.absent && x.v != null && x.v !== '' && Number.isFinite(+x.v)).map(x => +x.v); const v = sc.v == null || sc.v === '' || !Number.isFinite(+sc.v) ? null : +sc.v;
        ex.push({ c: cid, cn, n: cut(e.name, 60), d: cut(e.date, 10), max: Number.isFinite(+e.max) && +e.max > 0 ? +e.max : 100, v: sc.absent ? null : v, ab: !!sc.absent, avg: V.length ? Math.round(V.reduce((x, y) => x + y, 0) / V.length * 10) / 10 : null }); }
      for (const x of (Array.isArray(c.makeups) ? c.makeups : [])) if (x && str(x.mid) === mid && x.st !== '완료') mk.push({ cn, d: cut(x.date, 10), t: cut(x.time, 10) });
    }
    const by = (a, b, dir) => (a.d < b.d ? -dir : a.d > b.d ? dir : 0);
    return { att: att.sort((a, b) => by(a, b, -1)).slice(0, 30), ex: ex.sort((a, b) => by(a, b, -1)).slice(0, 20), mk: mk.sort((a, b) => by(a, b, 1)).slice(0, 10) };
  }
  window.lk12Proj = k12Proj;
  /* 원생 본인(또는 보호자 보기) 기록 */
  function myK12() { if (!LR.me || isPar()) return null; if (LR.mine && LR.mine.k12) return LR.mine.k12;
    let doc = null; try { if (LR.mode === 'demo' && typeof demoRoom === 'function') doc = demoRoom(); else if (LR.mode === 'preview' && window.parent && window.parent.S) doc = window.parent.S; } catch (e) { }
    if (!doc) return null; const m = (doc.members || []).find(x => x && (x.sid === LR.me.sid || x.name === LR.me.sid)); return m ? k12Proj(doc, m.id) : null; }
  window.lk12Mine = myK12;

  /* ── 화면 조각 ── */
  const CSS = `.lk12{display:grid;gap:12px;margin:14px 0}.lk12 .k-c{background:var(--card,#fff);border:1px solid var(--line,#e6e8ec);border-radius:14px;padding:14px 16px}.lk12 h3{margin:0 0 8px;font-size:15px}.lk12 .k-sum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;text-align:center}.lk12 .k-sum b{display:block;font-size:20px}.lk12 .k-sum small{color:var(--muted,#667085);font-size:12px}.lk12 ul{list-style:none;margin:0;padding:0}.lk12 li{display:flex;gap:8px;align-items:baseline;justify-content:space-between;padding:7px 0;border-top:1px solid var(--line,#eef0f3);font-size:13.5px}.lk12 li:first-child{border-top:0}.lk12 li span{min-width:0}.lk12 li small{color:var(--muted,#667085);display:block;font-size:12px}.lk12 .k-t{flex:none;font-size:12px;padding:2px 8px;border-radius:999px;background:#f2f4f7}.lk12 .k-t.g{background:#ecfdf3;color:#067647}.lk12 .k-t.y{background:#fffaeb;color:#b54708}.lk12 .k-t.r{background:#fef3f2;color:#b42318}.lk12 .k-bars{display:flex;align-items:flex-end;gap:6px;height:84px;margin:4px 0 10px}.lk12 .k-bar{flex:1;max-width:36px;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px}.lk12 .k-bar i{display:block;width:100%;min-height:2px;border-radius:4px 4px 0 0;background:var(--pri,#5C74F6)}.lk12 .k-bar small{font-size:11px;color:var(--muted,#667085)}.lk12 .k-hw{font-size:14px;margin:0}.lk12 .k-e{color:var(--muted,#667085);font-size:13px;margin:0}@media (max-width:560px){.lk12 .k-sum b{font-size:17px}}`;
  const css = () => { if (!document.getElementById('lk12css')) { const s = document.createElement('style'); s.id = 'lk12css'; s.textContent = CSS; document.head.appendChild(s); } };
  const TONE = { 출석: 'g', 지각: 'y', 조퇴: 'y', 결석: 'r' };
  const monthStat = (K, ym) => { const L = K.att.filter(a => a.d.startsWith(ym) && !a.x && a.st); const n = s => L.filter(a => a.st === s).length; const all = L.length; return { all, ok: n('출석'), late: n('지각') + n('조퇴'), abs: n('결석'), rate: all ? Math.round((n('출석') + n('지각') + n('조퇴')) / all * 100) : null }; };
  const lastHw = K => K.att.find(a => a.hw && !a.x);
  function panelHTML(K, o = {}) { if (!K) return ''; css(); const ym = td().slice(0, 7); const M = monthStat(K, ym); const hw = lastHw(K); const who = o.who || '';
    const sum = `<div class="k-c"><h3>${+ym.slice(5)}월 출석${who ? ` · ${E(who)}` : ''}</h3><div class="k-sum"><div><b>${M.rate == null ? '—' : M.rate + '%'}</b><small>출석률</small></div><div><b>${M.ok}</b><small>출석</small></div><div><b>${M.late}</b><small>지각 · 조퇴</small></div><div><b>${M.abs}</b><small>결석</small></div></div></div>`;
    const hwC = `<div class="k-c"><h3>최근 숙제</h3>${hw ? `<p class="k-hw"><b>${E(hw.hw)}</b> <span class="k-t ${hw.done ? 'g' : 'y'}">${hw.done ? '제출' : '미제출'}</span></p><p class="k-e">${E(hw.d)} · ${E(hw.cn)}${hw.p ? ` · 진도 ${E(hw.p)}` : ''}</p>` : '<p class="k-e">등록된 숙제가 없습니다.</p>'}</div>`;
    const attC = `<div class="k-c"><h3>최근 출결 · 진도</h3>${K.att.length ? `<ul>${K.att.slice(0, o.n || 8).map(a => `<li><span><b>${E(a.d)}</b> ${E(a.cn)}<small>${[a.in ? `등원 ${E(a.in)}${a.out ? ` · 하원 ${E(a.out)}` : ''}` : '', a.r ? `사유 ${E(a.r)}` : '', a.p ? `진도 ${E(a.p)}` : '', a.hw ? `과제 ${E(a.hw)}(${a.done ? '제출' : '미제출'})` : ''].filter(Boolean).join(' · ')}</small></span><span class="k-t ${a.x ? '' : TONE[a.st] || ''}">${a.x ? '휴강' : E(a.st || '미입력')}</span></li>`).join('')}</ul>` : '<p class="k-e">아직 출결 기록이 없습니다.</p>'}</div>`;
    const ch = K.ex.filter(x => x.v != null).slice(0, 8).reverse();
    const exC = `<div class="k-c"><h3>학원 시험 성적</h3>${ch.length > 1 ? `<div class="k-bars" role="img" aria-label="최근 성적 추이">${ch.map(x => { const p = Math.round(x.v / (x.max || 100) * 100); return `<div class="k-bar" title="${E(x.n)} ${E(x.v)}점"><i style="height:${Math.max(2, p)}%"></i><small>${p}</small></div>`; }).join('')}</div>` : ''}${K.ex.length ? `<ul>${K.ex.slice(0, 8).map(x => `<li><span><b>${E(x.n)}</b><small>${E(x.d)} · ${E(x.cn)}${x.avg != null ? ` · 반 평균 ${E(x.avg)}` : ''}</small></span><span class="k-t">${x.ab ? '미응시' : x.v == null ? '입력 전' : `${E(x.v)}점 / ${E(x.max)}`}</span></li>`).join('')}</ul>` : '<p class="k-e">아직 성적이 없습니다.</p>'}</div>`;
    const mkC = K.mk.length ? `<div class="k-c"><h3>예정 보강</h3><ul>${K.mk.map(x => `<li><span><b>${E(x.d)}</b> ${E(x.t || '')}<small>${E(x.cn)}</small></span></li>`).join('')}</ul></div>` : '';
    const csC = o.cs && o.cs.length ? `<div class="k-c"><h3>학원 상담 공유</h3><ul>${o.cs.map(x => `<li><span><b>${E(String(x.at).slice(0, 10))} ${E(x.cat || '상담')}</b><small>${E(String(x.text || x.summary || '').slice(0, 400))}</small></span></li>`).join('')}</ul></div>` : '';
    return `<section class="lk12" aria-label="학원 기록">${sum}${hwC}${exC}${mkC}${attC}${csC}</section>`; }
  window.lk12Panel = panelHTML;

  /* ── 보호자 계정: 자녀 관리 ── */
  function kidHTML(r, cid) { const K = k12Proj(r, cid); const cs = (r.consults || []).filter(x => x && x.who === cid && x.share).sort((a, b) => String(a.at) < String(b.at) ? 1 : -1).slice(0, 10); return panelHTML(K, { cs }); }
  window.lk12Kid = kidHTML;
  if (typeof laKid === 'function') { const base = laKid; laKid = function (r, cid) { const h = base(r, cid); try { return r && r.org && r.org.type === 'k12' && (r.members || []).some(m => m.id === cid) ? h + kidHTML(r, cid) : h; } catch (e) { console.error(e); return h; } }; }

  /* ── 원생 · 보호자 보기: 내 수업(#my) 위에 학원 기록 ── */
  const mount = () => { if (!isK12() || !LR.me || isPar()) return; const a = route().a; const lm = document.getElementById('lm'); if (a !== 'my' || !lm || lm.querySelector('.lk12')) return; const K = myK12(); if (!K) return;
    const h = `<div class="lk12w"><h2 class="ap-h2">학원 기록</h2>${panelHTML(K, { who: isGuard() ? '자녀' : '' })}</div>`; const hd = lm.querySelector('.ap-my .ap-myh'); if (hd) hd.insertAdjacentHTML('afterend', h); else { const at = lm.querySelector('.ap-my') || lm.firstElementChild; if (at) at.insertAdjacentHTML('afterend', `<div class="in">${h}</div>`); else lm.insertAdjacentHTML('afterbegin', h); } };
  /* ── 청구서: 납부한 건은 학원 영수증을 열 수 있다 ── */
  const billOf = id => { try { if (LR.mode === 'live' && LR.mine && LR.mine.shop) return (LR.mine.shop.bills || []).find(x => x.id === id); const d = JSON.parse(localStorage.getItem('didisam.room.' + LR.tid) || 'null'); return d && (d.bills || []).find(x => x.id === id); } catch (e) { return null; } };
  const pays = b => Array.isArray(b.paid) && b.paid.length ? b.paid : ['납부 완료', '현장 납부'].includes(b.status) ? [{ id: 'p', at: b.payAt || b.due || '', amt: (b.items || []).reduce((a, i) => a + (+i[1] || 0), 0), method: b.status === '현장 납부' ? '현장' : '온라인 결제' }] : [];
  const mountBill = () => { if (!isK12()) return; const r = route(); if (r.a !== 'bill' || !r.b) return; const lm = document.getElementById('lm'); if (!lm || lm.querySelector('[data-k12rc]')) return; const b = billOf(r.b); if (!b || !pays(b).length) return;
    const box = lm.querySelector('.shp-card2') || lm.querySelector('section') || lm; box.insertAdjacentHTML('beforeend', `<p><button type="button" class="lbtn sm" data-k12rc="${E(b.id)}">영수증 보기</button></p>`); };
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-k12rc]'); if (!t) return; const b = billOf(t.dataset.k12rc); if (!b) return; const org = (SITE() && SITE().org && SITE().org.name) || ''; const won = n => (+n || 0).toLocaleString('ko-KR') + '원';
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>영수증</title><style>body{font-family:system-ui,'Malgun Gothic',sans-serif;max-width:640px;margin:32px auto;padding:0 16px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:13px}th{background:#f4f4f4}.mini{color:#555;font-size:12px}@media print{button{display:none}}</style></head><body><h1>영수증</h1><table><tr><th>학원</th><td>${E(org)}</td></tr><tr><th>내용</th><td>${E(b.title)}</td></tr></table><table><tr><th>납부일</th><th>수단</th><th>금액</th></tr>${pays(b).map(p => `<tr><td>${E(p.at)}</td><td>${E(p.method || '')}</td><td>${won(p.amt)}</td></tr>`).join('')}</table><p class="mini">학원 발행 영수증입니다. 카드 매출전표 · 현금영수증은 결제 업체 · 국세청 연동 후 별도로 발급됩니다.</p><p><button onclick="print()">인쇄</button></p></body></html>`;
    window.__lk12Print = html; let w = null; try { w = open('', '_blank'); } catch (x) { } if (!w) { if (typeof toast === 'function') toast('새 창이 막혔습니다. 팝업을 허용해 주세요.', 'warn'); return; } w.document.write(html); w.document.close(); });
  if (typeof lrender === 'function') { const base = lrender; lrender = (...a) => { const r = base(...a); setTimeout(() => { try { mount(); mountBill(); } catch (e) { console.error('lk12', e); } }, 0); return r; }; }

  /* ── 오늘 할 일: 숙제 · 보강 ── */
  if (typeof ltTodo === 'function') { const base = ltTodo; ltTodo = () => { const A = base(); try { if (!isK12() || !LR.me || isPar()) return A; const K = myK12(); if (!K) return A; const wk = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10); const H = [];
    K.att.filter(a => a.hw && !a.done && !a.x && a.d >= wk).slice(0, 2).forEach(a => H.push({ h: `숙제 · ${a.cn}`, d: `${a.hw} · ${a.d} 수업`, href: '#my', k: 'warn' }));
    K.mk.filter(x => x.d >= td()).slice(0, 1).forEach(x => H.push({ h: `보강 예정 · ${x.cn}`, d: `${x.d} ${x.t || ''}`.trim(), href: '#my' }));
    return [...H, ...A].slice(0, 5); } catch (e) { console.error(e); return A; } }; }

  /* ── 학습자 AI: 학원 질문은 브라우저에서 답한다 ── */
  const Q_RE = /(숙제|과제|출석|출결|결석|지각|조퇴|성적|점수|시험|보강|등원|하원)/;
  function k12Rule(q) { if (!isK12() || !LR.me || isPar() || /퀴즈|문제\s*내/.test(q)) return null; const K = myK12(); if (!K) return null; const me = isGuard() ? '자녀' : '';
    const L = (A, f) => typeof ltLinks === 'function' ? ltLinks(A) : ''; const go = [{ h: '학원 기록 보기', d: '출결 · 숙제 · 성적 · 보강', href: '#my' }];
    if (/(숙제|과제)/.test(q)) { const P = K.att.filter(a => a.hw && !a.x).slice(0, 3); return { t: P.length ? `${me ? me + '의 ' : ''}최근 숙제입니다. ` + P.map(a => `${a.d} ${a.cn}: ${a.hw}(${a.done ? '제출' : '미제출'})`).join(' / ') : '등록된 숙제가 없습니다.', h: L(go) }; }
    if (/보강/.test(q)) { const P = K.mk.filter(x => x.d >= td()); return { t: P.length ? '예정 보강입니다. ' + P.map(x => `${x.d} ${x.t || ''} ${x.cn}`.replace(/\s+/g, ' ')).join(' / ') : '예정된 보강이 없습니다.', h: L(go) }; }
    if (/(성적|점수|시험)/.test(q)) { const P = K.ex.slice(0, 3); return { t: P.length ? '최근 학원 시험입니다. ' + P.map(x => `${x.d} ${x.n}: ${x.ab ? '미응시' : x.v == null ? '입력 전' : `${x.v}점(만점 ${x.max}${x.avg != null ? `, 반 평균 ${x.avg}` : ''})`}`).join(' / ') : '아직 학원 시험 성적이 없습니다.', h: L(go) }; }
    const ym = td().slice(0, 7); const M = monthStat(K, ym); const last = K.att.find(a => a.st && !a.x);
    return { t: `${+ym.slice(5)}월 출석 ${M.ok}회 · 지각 · 조퇴 ${M.late}회 · 결석 ${M.abs}회${M.rate != null ? `(출석률 ${M.rate}%)` : ''}입니다.${last ? ` 최근 ${last.d} ${last.cn}: ${last.st}${last.in ? `(등원 ${last.in})` : ''}.` : ''}`, h: L(go) }; }
  window.lk12Rule = k12Rule;
  if (typeof ltRule === 'function') { const base = ltRule; ltRule = q => { try { const s = String(q || ''); if (Q_RE.test(s)) { const r = k12Rule(s); if (r) return { ...r, src: '학원 기록' }; } } catch (e) { console.error(e); } return base(q); }; }
  if (typeof ltAsk === 'function') { const base = ltAsk; ltAsk = (q, opts = {}) => { try { if (isK12() && LR.me && !isPar() && Q_RE.test(String(q || '')) && !/퀴즈|문제\s*내/.test(String(q || '')) && myK12()) opts = { ...opts, ro: true, ai: false }; } catch (e) { } return base(q, opts); }; }

  /* ── 홈 추천 칩: 숙제 · 출석 · 성적 ── */
  window.LSCN_PICK.push(type => type === 'k12' ? { learn: '내 수업', find: '수업 찾기', sub: () => { try { const K = myK12(); if (!K) return '숙제 · 출석 · 성적을 함께 챙겨요'; const h = K.att.filter(a => a.hw && !a.done && !a.x).length; const m = K.mk.filter(x => x.d >= td())[0]; return [h ? `미제출 숙제 ${h}개` : '밀린 숙제 없음', m ? `보강 ${m.d}` : ''].filter(Boolean).join(' · '); } catch (e) { return '숙제 · 출석 · 성적을 함께 챙겨요'; } },
    chips: [['오늘 숙제', '오늘 해야 할 숙제 알려줘'], ['출석 확인', '내 출석 현황 알려줘'], ['최근 성적', '최근 학원 시험 성적 알려줘']], d: '수업 · 숙제 · 출결 · 성적 · 보호자' } : null);
})();
