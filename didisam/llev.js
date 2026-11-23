/* v46 Ver2 학습 이벤트 클라이언트(학습자 앱) — window.LEV = { emit(verb, obj, val), flush() }
   계약: verb = attempt · hint · submit · revise · reflect · mastery · ai.ask · vision · goal, obj = '<cls>/<item>' 또는 개념 id, val = 숫자 · 참거짓 · 짧은 코드만(글 금지).
   운영: 큐에 모아 POST /api/pub/<tid>/lev(최대 50건)로 묶음 전송, 실패(망 · 5xx)면 다시 큐에 넣어 재전송. 4xx(형식 거부)는 버린다.
   시연: 이 기기(localStorage 'dd-lev')에만 최대 500건 저장. 호출부는 `window.LEV && LEV.emit(...)`로 방어.
   서버 판정 이벤트(튜터 ai.ask · hint · attempt, lp 차이분 submit · vision · goal)는 서버가 직접 기록하므로 여기서 다시 보내지 않아도 된다. */
(function () {
  if (window.LEV && window.LEV.__test) return; /* 시험이 미리 심은 기록용 LEV는 그대로 둔다 */
  const VERBS = ['attempt', 'hint', 'submit', 'revise', 'reflect', 'mastery', 'ai.ask', 'vision', 'goal'];
  const OBJ = /^[\w-]{1,60}(\/[\w-]{1,60})?$/, KEY = /^[a-zA-Z]\w{0,15}$/, CODE = /^[\w.:-]{1,24}$/;
  const MAX = 50, QMAX = 300, KEYLS = 'dd-lev';
  const Q = []; let timer = 0, busy = false;
  const live = () => typeof LR !== 'undefined' && LR && LR.mode === 'live' && LR.tid && typeof api === 'function';
  /* 글이 섞이지 않게 클라이언트에서도 걸러 낸다(서버가 최종 판정) */
  function val(v) { const o = {}; if (!v || typeof v !== 'object') return o; Object.keys(v).slice(0, 8).forEach(k => { const x = v[k]; if (!KEY.test(k)) return; if (typeof x === 'number' && isFinite(x)) o[k] = x; else if (typeof x === 'boolean') o[k] = x; else if (typeof x === 'string' && CODE.test(x)) o[k] = x; }); return o; }
  function demoSave(ev) { try { const a = JSON.parse(localStorage.getItem(KEYLS) || '[]'); a.push(...ev); localStorage.setItem(KEYLS, JSON.stringify(a.slice(-500))); } catch (e) { /* 저장 불가(사생활 보호 창 등) */ } }
  function emit(verb, obj, v) {
    if (!VERBS.includes(verb)) return false; const o = obj == null ? '' : typeof obj === 'object' ? (obj.key || [obj.cls, obj.item != null ? obj.item : obj.wk != null ? 'w' + obj.wk : obj.k].filter(x => x != null && x !== '').join('/')) : String(obj); /* 호출부가 {cls,item|wk} 객체를 넘겨도 'cls/item' 형식으로 */ if (o && !OBJ.test(o)) return false;
    const ev = { verb, obj: o, val: val(v), at: new Date().toISOString() }; const l = (v && /^L[0-3]$/.test(v.lvl)) ? v.lvl : ''; /* 레벨은 호출부가 val.lvl로(LV2.levelOf(item)) */ if (l) ev.lvl = l; delete ev.val.lvl;
    if (!live()) { demoSave([ev]); return true; }
    if (Q.length >= QMAX) Q.shift(); Q.push(ev);
    clearTimeout(timer); timer = setTimeout(flush, Q.length >= MAX ? 0 : 4000); return true;
  }
  async function flush() {
    if (busy || !Q.length || !live()) return 0; busy = true; let n = 0;
    try { while (Q.length) { const B = Q.splice(0, MAX); try { await api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/lev`, { ev: B }); n += B.length; } catch (e) { if (!e || !e.status || e.status >= 500 || e.status === 429) { Q.unshift(...B); break; } } } }
    finally { busy = false; } return n;
  }
  window.addEventListener('online', () => flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.LEV = { emit, flush, q: Q, demo: () => { try { return JSON.parse(localStorage.getItem(KEYLS) || '[]'); } catch (e) { return []; } } };
})();
