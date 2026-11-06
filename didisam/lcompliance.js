/* v30 학습자 화면 규정 준수 — 게시본의 cpl 정책이 켜진 기관에만 동작한다.
   차시별 학습시간 · 1일 제한(운영은 서버 판정) · 동시접속 · 본인확인 · 수강평 후 평가 · 평가 무작위 출제 · QR 출결 · 수료 판정 */
const CPLL = { queue: {}, today: null, kicked: false, overToast: 0, cur: null, tokenKey: '', pending: null };
(function () {
  'use strict';
  const CFG = () => { const s = typeof SITE === 'function' ? SITE() : null; return s && s.cpl && s.cpl.on ? s.cpl : null; };
  const live = () => LR.mode === 'live';
  const day = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const META = () => { LR.lp.cls = LR.lp.cls || {}; const m = LR.lp.cls._cpl = LR.lp.cls._cpl || { items: {} }; m.v = m.v || {}; m.rv = m.rv || {}; return m; };
  const iRec = (cid, iid) => { const c = LR.lp.cls[cid] = LR.lp.cls[cid] || { items: {} }; c.items = c.items || {}; return c.items[iid] = c.items[iid] || {}; };
  const reqSec = (cfg, it) => Math.ceil((+it.cplSec || 600) * (cfg.itemMin || 0) / 100);
  const todaySec = () => { const d = day(); let s = 0; Object.values(LR.lp.cls || {}).forEach(c => Object.values((c && c.items) || {}).forEach(r => { s += +(r && r.d && r.d[d]) || 0; })); return s; };
  CPLL.todaySec = () => (CPLL.today != null ? CPLL.today : todaySec());
  CPLL.over = () => { const c = CFG(); return !!(c && c.dayMax > 0 && CPLL.todaySec() >= c.dayMax * 3600); };

  /* 학습시간 적립: 최대 학습량을 넘기면 적립하지 않고 재생을 멈춘다 */
  CPLL.add = (cid, iid, secs) => { const cfg = CFG(); if (!cfg || !LR.me) return false; if (CPLL.over()) { CPLL.stop(); return false; }
    let add = Math.max(0, Math.floor(secs)); if (cfg.dayMax > 0) add = Math.min(add, cfg.dayMax * 3600 - CPLL.todaySec()); if (!add) return false;
    const r = iRec(cid, iid); const d = day(); r.sec = (+r.sec || 0) + add; r.d = { [d]: (+(r.d && r.d[d]) || 0) + add }; if (CPLL.today != null) CPLL.today += add;
    const c = (SITE().classes || []).find(x => x.id === cid); const it = c && c.items.find(x => x.id === iid); if (it && it.type === 'video' && r.sec >= reqSec(cfg, it)) r.done = true;
    const k = cid + '|' + iid; CPLL.queue[k] = (CPLL.queue[k] || 0) + add; if (CPLL.over()) CPLL.stop(); return true; };
  CPLL.stop = () => { try { if (typeof LW !== 'undefined' && LW.yp && LW.yp.pauseVideo) LW.yp.pauseVideo(); } catch (e) { } try { if (A2L.vp) A2L.vp.play = false; } catch (e) { } if (Date.now() - CPLL.overToast > 30000) { CPLL.overToast = Date.now(); toast(`오늘 학습 가능 시간(${CFG().dayMax}시간)을 모두 사용했습니다. 내일 이어서 학습하세요.`, 'warn'); } };
  /* 큐 전송(운영 = 서버 판정, 데모 = 운영자 화면 이벤트) */
  CPLL.flush = async () => { const cfg = CFG(); if (!cfg || !LR.me) return; const K = Object.keys(CPLL.queue); for (const k of K) { const [cls, item] = k.split('|'); let s = CPLL.queue[k]; delete CPLL.queue[k];
      if (!live()) { if (typeof lpxPush === 'function' && LR.mode !== 'preview') lpxPush('cpl-beat', { cls, item, secs: s }); continue; }
      while (s > 0) { const n = Math.min(60, s); s -= n; try { const r = await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/cpl`, { kind: 'beat', cls, item, secs: n }); CPLL.today = r.today; if (r.over) CPLL.stop(); } catch (e) { if (e.status === 401) { CPLL.kick(); return; } CPLL.queue[k] = (CPLL.queue[k] || 0) + s + n; return; } } }
    try { LR.api.save(); } catch (e) { } };
  CPLL.kick = () => { if (CPLL.kicked) return; CPLL.kicked = true; toast('다른 기기에서 로그인하여 이 화면의 접속을 종료했습니다.', 'warn'); try { LR.api.logout().finally(() => { CPLL.kicked = false; lrender(); }); } catch (e) { CPLL.kicked = false; } };

  /* 재생 감지: YouTube 플레이어 · 내장 재생기 */
  { const base = ytMount; ytMount = el => { if (el.dataset.kind === 'cls') CPLL.cur = { cid: el.dataset.id, iid: el.dataset.item }; return base(el); }; }
  let tickN = 0; setInterval(() => { if (!CFG() || !LR.me) return; let on = null; try { const V = A2L.vp; if (V && V.play) on = { cid: V.cid, iid: V.iid }; } catch (e) { } try { const p = typeof LW !== 'undefined' && LW.yp; if (!on && p && p.getPlayerState && p.getPlayerState() === 1 && CPLL.cur) on = CPLL.cur; } catch (e) { } if (on && !document.hidden) CPLL.add(on.cid, on.iid, 5); if (++tickN % 6 === 0) CPLL.flush(); }, 5000);
  addEventListener('pagehide', () => { CPLL.flush(); });

  /* 차시 인정 · 수료 판정 */
  { const base = a2lItemDone; a2lItemDone = (c, it, rec) => { const cfg = CFG(); if (cfg && it.type === 'video' && cfg.itemMin > 0) return (+rec.sec || 0) >= reqSec(cfg, it); return base(c, it, rec); }; }
  { const base = myStats; myStats = function () { const st = base(); const cfg = CFG(); if (!cfg || !cfg.rate) return st; try { st.courses.forEach(x => { const c = x.c; const R = ((LR.lp.cls || {})[c.id] || {}).items || {}; const L = c.items.filter(i => i.type !== 'chapter'); const ok = i => a2lItemDone(c, i, R[i.id] || {}); const n = L.filter(ok).length; const p = Math.round(n / Math.max(1, L.length) * 100); x.p = p; x.rate = p; x.doneN = n; x.next = L.find(i => !ok(i)); const ex = L.filter(i => i.type === 'exam'); const pass = ex.every(i => (+(R[i.id] || {}).score || 0) >= cfg.pass); const cert = typeof a2lMyCert === 'function' && a2lMyCert(c.id); x.done = !!cert || (p >= cfg.rate && pass); }); } catch (e) { console.error(e); } return st; }; }

  /* 수강평 후 평가 */
  const needReview = (cfg, c, it) => { if (!cfg || !cfg.surveyFirst || !c || it.type !== 'exam') return false; const R = ((LR.lp.cls || {})[c.id] || {}).items || {}; const sv = c.items.filter(i => i.type === 'survey'); if (sv.length) return !sv.every(i => (R[i.id] || {}).done); return !META().rv[c.id]; };
  { const base = a2lCan; a2lCan = (it, rec) => { const cfg = CFG(); if (cfg && it.type === 'exam') { const c = (SITE().classes || []).find(x => x.items.includes(it)); if (needReview(cfg, c, it)) return { ok: false, why: '수강평을 먼저 입력해야 평가에 응시할 수 있습니다.' }; } return base(it, rec); }; }
  /* 무작위 출제: 출제 수만큼 훈련생별로 뽑고, 뽑은 문항으로만 채점한다 */
  const cut = (it, run) => { const n = +it.cplN; if (!n || !run || run.cplCut || n >= run.order.length) return; const O = [...run.order]; for (let i = O.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [O[i], O[j]] = [O[j], O[i]]; } run.order = O.slice(0, n); run.cplCut = true; };
  { const base = a2lScore; a2lScore = (it, ans) => { const run = A2L.run; if (run && run.cplCut && run.item === it.id) { const pick = { ...it, qs: run.order.map(k => it.qs[k]) }; const r = base(pick, run.order.map(k => ans[k])); return r; } return base(it, ans); }; }
  CPLL.cut = cut;

  /* 본인확인 모달 */
  const modalBox = (title, body) => { document.getElementById('cplM')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="cpl-mw" id="cplM" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="cpl-mb"><h3>${esc(title)}</h3>${body}</div></div>`); return document.getElementById('cplM'); };
  CPLL.verify = (method, then) => { const cfg = CFG(); const nm = method === 'phone' ? '휴대폰 본인확인' : '일회용 비밀번호 확인'; const log = () => { META().v[method] = Date.now(); try { LR.api.save(); } catch (e) { } if (typeof lpxPush === 'function' && !live() && LR.mode !== 'preview') lpxPush('cpl-verify', { method }); };
    const m = modalBox(nm, `<p class="mini">${method === 'phone' ? '훈련 시작 전 최초 1회 본인 여부를 확인합니다.' : '평가 응시 전 본인 여부를 확인합니다.'}</p><p class="err" id="cplE"></p><div id="cplB"><button class="lbtn pri" id="cplS">인증번호 받기</button></div><button class="lbtn sm" id="cplX">닫기</button>`);
    const finish = () => { m.remove(); then && then(); }; m.querySelector('#cplX').onclick = () => m.remove();
    m.querySelector('#cplS').onclick = async () => { const E = m.querySelector('#cplE'); let code = ''; if (live()) { try { const r = await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/cpl`, { kind: 'verify-start', method }); code = r.dev_code || ''; } catch (e) { if (e.status === 501) { /* 제공사 미연동: 학습을 막지 않고 안내만 한다(운영 점검표에 연동 대기로 표시) */ META().v[method + '_pending'] = Date.now(); toast('본인확인 서비스 연동 전입니다. 운영자에게 문의하세요.', 'warn'); finish(); return; } E.textContent = e.message || '요청하지 못했습니다.'; return; } } else { code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000); }
      m.querySelector('#cplB').innerHTML = `${!live() || code ? `<p class="mini">체험용 인증번호: <b id="cplC">${esc(code)}</b></p>` : ''}<input id="cplI" inputmode="numeric" maxlength="6" aria-label="인증번호" placeholder="인증번호 6자리"><button class="lbtn pri" id="cplOk">확인</button>`;
      m.querySelector('#cplOk').onclick = async () => { const v = m.querySelector('#cplI').value.trim(); if (live()) { try { await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/cpl`, { kind: 'verify-confirm', method, code: v }); } catch (e) { E.textContent = e.message || '인증번호가 올바르지 않습니다.'; return; } } else if (v !== code) { E.textContent = '인증번호가 올바르지 않습니다.'; return; } log(); toast('본인확인을 완료했습니다.', 'ok'); finish(); }; }; };
  CPLL.review = (c, then) => { const m = modalBox('수강평 입력', `<p class="mini">평가 응시 전에 수강평을 입력합니다. 내용은 평가 점수에 영향을 주지 않습니다.</p><label>만족도<select id="cplRs">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n}점</option>`).join('')}</select></label><textarea id="cplRt" rows="3" maxlength="500" aria-label="수강평"></textarea><p class="err" id="cplE"></p><button class="lbtn pri" id="cplRo">저장</button> <button class="lbtn sm" id="cplX">닫기</button>`); m.querySelector('#cplX').onclick = () => m.remove();
    m.querySelector('#cplRo').onclick = () => { const t = m.querySelector('#cplRt').value.trim(); if (t.length < 5) { m.querySelector('#cplE').textContent = '수강평을 5자 이상 입력하세요.'; return; } const v = +m.querySelector('#cplRs').value; META().rv[c.id] = { s: v, at: new Date().toISOString() }; try { LR.api.save(); } catch (e) { } if (typeof lpxPush === 'function' && LR.mode !== 'preview') lpxPush('cpl-review', { cls: c.id, s: v, t }); m.remove(); then && then(); }; };

  /* 평가 시작 전 관문: 수강평 → 일회용 비밀번호 → 시작 · 출제 */
  document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-a2="start"]'); if (!b) return; const cfg = CFG(); if (!cfg) return; const c = (SITE().classes || []).find(x => x.id === b.dataset.c); const it = c && c.items.find(x => x.id === b.dataset.i); if (!it) return;
    if (needReview(cfg, c, it)) { ev.stopPropagation(); ev.preventDefault(); if (c.items.some(i => i.type === 'survey')) { toast('수강평(설문)을 먼저 완료하세요.', 'warn'); return; } CPLL.review(c, () => b.click()); return; }
    if (cfg.idv.motp && it.type === 'exam' && Date.now() - (+META().v.motp || 0) > 3600e3 && !META().v.motp_pending) { ev.stopPropagation(); ev.preventDefault(); CPLL.verify('motp', () => b.click()); return; }
    setTimeout(() => { try { if (A2L.run && A2L.run.item === it.id && !A2L.run.cplCut && +it.cplN) { cut(it, A2L.run); lrender(); } } catch (e) { console.error(e); } }, 0); }, true);

  /* 화면: 유의사항 · 오늘 학습시간 · 입과 본인확인 · QR 출결 */
  const noteHTML = cfg => `<details class="cpl-note-l"><summary>훈련 유의사항 · 오늘 학습 ${Math.round(CPLL.todaySec() / 360) / 10}시간${cfg.dayMax ? ` / ${cfg.dayMax}시간` : ''}</summary><ul>${cfg.dayMax ? `<li>1일 학습시간은 ${cfg.dayMax}시간을 넘을 수 없습니다.</li>` : ''}${cfg.itemMin ? `<li>차시별 인정 학습시간의 ${cfg.itemMin}% 이상 학습해야 진도로 인정됩니다.</li>` : ''}${cfg.rate ? `<li>수료 기준: 진도율 ${cfg.rate}% 이상${cfg.pass ? `, 평가 ${cfg.pass}점 이상` : ''}</li>` : ''}<li>베낀 답안은 유사도 ${cfg.copyThr}% 이상을 운영자가 확인하며, 판정 시 기관 기준에 따라 처리합니다.</li>${cfg.single ? '<li>같은 계정으로 동시에 접속할 수 없습니다. 새 로그인이 이전 접속을 종료합니다.</li>' : ''}<li>훈련 관리와 부정훈련 확인을 위해 접속 IP · 학습시간을 기록하며, 기관의 개인정보 처리방침에 따라 보관합니다.</li></ul></details>`;
  { const base = lrender; lrender = (...a) => { const r = route(); const cfg = CFG(); if (cfg && r.a === 'att') return attendRoute(r); base(...a); try { if (!cfg || !LR.me) return; if (r.a === 'c') { const host = document.querySelector('#lapp main') || document.querySelector('#lapp'); if (host && !host.querySelector('.cpl-note-l')) host.insertAdjacentHTML('afterbegin', noteHTML(cfg)); if (cfg.idv.phone && !META().v.phone && !META().v.phone_pending && !document.getElementById('cplM')) CPLL.verify('phone'); } CPLL.sess(); } catch (e) { console.error(e); } }; }
  function attendRoute(r) { const parts = decodeURIComponent(location.hash.slice(1)).split('/'); const cid = parts[1], code = parts[2]; const app = document.getElementById('lapp'); const say = m => { app.innerHTML = `<div class="lerr"><b>QR 출결</b><p>${esc(m)}</p><a class="lbtn" href="#courses">과정으로</a></div>`; };
    if (!LR.me) { sessionStorage.setItem('didisam.cpl.att', location.hash); say('로그인한 뒤 QR을 다시 스캔하십시오.'); return; }
    const once = `${cid}|${code}`; if (CPLL.attDone === once) { say('출석을 접수했습니다.'); return; } CPLL.attDone = once;
    if (live()) { api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/cpl`, { kind: 'attend', cls: cid, code }).then(() => say('출석으로 기록했습니다.')).catch(e => say(e.message || '출석을 기록하지 못했습니다.')); return; }
    if (typeof lpxPush === 'function') lpxPush('cpl-att', { cls: cid, code }); say('출석을 접수했습니다.'); }

  /* 동시접속(데모): 같은 브라우저 다른 탭에서 새로 로그인하면 이전 탭 종료. 운영은 서버 세션 삭제 → 401 */
  const myToken = Math.random().toString(36).slice(2); let claimed = '';
  CPLL.sess = () => { const cfg = CFG(); if (!cfg || !cfg.single || !LR.me || live()) return; const k = `didisam.cpl.s.${LR.tid}.${LR.me.sid || LR.me.id}`; if (claimed === k) return; claimed = k; try { localStorage.setItem(k, myToken); } catch (e) { } if (typeof lpxPush === 'function' && LR.mode !== 'preview') lpxPush('cpl-login', {}); };
  addEventListener('storage', e => { if (!claimed || e.key !== claimed || !e.newValue || e.newValue === myToken) return; claimed = ''; CPLL.kick(); });
})();
