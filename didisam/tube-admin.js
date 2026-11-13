/* v39 디디쌤 튜브 — 스튜디오(운영자 · 강사) 쪽: 영상 항목의 챕터(구간) 입력과 학습자 게시본 반영.
   - 영상 편집 창에 '챕터' 칸: 한 줄에 「분:초 제목」(예: 10:00 값 요약 방식). 학습자 앱 영상 화면의 챕터 칩 · 쇼츠 구간 · AI 튜터 장면 근거에 쓰인다.
   - 게시본(lsSnapshot) 영상 항목에 chaps [{ t: 초, n: 제목 }] (최대 30개, 제목 40자). AI 자동 챕터는 2차(영상 처리 비용 → 요금제 반영 후).
   index.html에서 boot.js 바로 앞. */
'use strict';
(() => {
  const toSec = s => { const m = /^\s*(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})\s*$/.exec(s); if (!m) return null; const h = +(m[1] || 0), mi = +m[2], se = +m[3]; if (se > 59) return null; return h * 3600 + mi * 60 + se; };
  const fmt = t => { t = Math.max(0, Math.floor(+t || 0)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0'); };
  /* 「분:초 제목」 줄 → [{ t, n }] · 잘못된 줄 번호 */
  function parse(tx) { const out = [], bad = []; String(tx || '').split('\n').forEach((ln, i) => { const L = ln.trim(); if (!L) return; const m = /^(\S+)\s+(.+)$/.exec(L); const t = m ? toSec(m[1]) : null; if (t == null) { bad.push(i + 1); return; } out.push({ t, n: m[2].replace(/[<>]/g, '').trim().slice(0, 40) }); });
    const seen = new Set(); return { L: out.sort((a, b) => a.t - b.t).filter(x => !seen.has(x.t) && seen.add(x.t)).slice(0, 30), bad }; }
  const clean = A => (Array.isArray(A) ? A : []).filter(x => x && Number.isFinite(+x.t) && +x.t >= 0 && +x.t <= 86400).map(x => ({ t: Math.floor(+x.t), n: String(x.n || '').replace(/[<>]/g, '').slice(0, 40) })).sort((a, b) => a.t - b.t).slice(0, 30);
  window.tubeChaps = { parse, fmt, clean };

  if (typeof edRender === 'function') { const base = edRender; edRender = function (...a) { const r = base.apply(this, a); try { if (!ED || !ED.it || ED.it.type !== 'video') return r; const b = document.getElementById('edBody'); if (!b || b.querySelector('[data-ed="chapsTx"]')) return r;
      const tx = ED.it.chapsTx != null ? ED.it.chapsTx : clean(ED.it.chaps).map(x => `${fmt(x.t)} ${x.n}`).join('\n');
      const sk = b.querySelector('[data-ed="skip"]'); const at = sk ? sk.closest('label') : null;
      const html = `<label class="fl">챕터(구간) <small class="mini">한 줄에 「분:초 제목」 · 학습자 앱의 챕터 칩 · 쇼츠 · AI 튜터 근거에 쓰여요</small><textarea data-ed="chapsTx" rows="4" placeholder="00:00 데이터 준비&#10;05:00 행 · 열 배치&#10;10:00 값 요약 방식">${esc(tx)}</textarea></label>`;
      if (at) at.insertAdjacentHTML('beforebegin', html); else b.insertAdjacentHTML('beforeend', html); } catch (e) { console.error('tube-admin', e); } return r; }; } /* eslint-disable-line no-global-assign */

  if (typeof edSave === 'function') { const base = edSave; edSave = function (...a) { try { if (ED && ED.it && ED.it.type === 'video' && ED.it.chapsTx != null) { const { L, bad } = parse(ED.it.chapsTx);
        if (bad.length) { toast(`챕터 ${bad.join(', ')}번째 줄을 「분:초 제목」 형식으로 고쳐 주세요(예: 10:00 값 요약 방식).`, 'warn'); return false; }
        ED.it.chaps = L; delete ED.it.chapsTx; } } catch (e) { console.error('tube-admin', e); } return base.apply(this, a); }; } /* eslint-disable-line no-global-assign */

  if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { (r.classes || []).forEach(x => { const c = typeof C === 'function' ? C(x.id) : null; if (!c) return;
      (x.items || []).forEach(y => { if (y.type !== 'video') return; const it = (c.curriculum || []).find(z => z.id === y.id); const L = clean(it && it.chaps); if (L.length) y.chaps = L; else delete y.chaps; }); }); } catch (e) { console.error('tube-admin snapshot', e); } return r; }; } /* eslint-disable-line no-global-assign */
})();
