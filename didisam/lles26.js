/* 디디쌤 학습자 v26.2 — 강의 화면(피그마 User Page › 강의 화면 벤치마크)
   - 3단 구성: 왼쪽 커리큘럼(클래스명 · 남은 수강 기간 · 진도 막대 · 항목별 유형 태그와 상태) · 가운데 강의 · 오른쪽 학습노트 패널
   - 가운데 머리: [← 클래스로 돌아가기] · 클래스명 · 강의명
   - 영상 재생이 끝나면 '다음 강의로 이동하시겠습니까?' 확인 창(브라우저 기본 alert 없이 화면 안 대화상자)
   기존 기능 · 데이터는 그대로 두고 화면 배치와 정보만 보탠다. */
'use strict';
(() => {
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const daysLeft = end => { const m = String(end || '').match(/(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59); return Math.ceil((d - Date.now()) / 864e5); };
  function enhance() {
    const cw = document.querySelector('section.crsb .cw2'); if (!cw || cw.dataset.l26) return; cw.dataset.l26 = 1; cw.classList.add('l26');
    const hero = document.querySelector('section.crsh'); const cur = cw.querySelector('aside.cur'); const main = cw.querySelector('.imain'); if (!cur || !main) return;
    const name = ((hero && hero.querySelector('h1')) || {}).textContent || ''; const dates = ((hero && hero.querySelector('.mini')) || {}).textContent || '';
    const ring = hero && hero.querySelector('.ring'); const p = ring ? +(getComputedStyle(ring).getPropertyValue('--p') || ring.style.getPropertyValue('--p') || 0) : 0;
    const cnt = ((ring && ring.querySelector('span')) || {}).textContent || ''; const thr = +((dates.match(/수료 기준 진도 (\d+)%/) || [])[1] || 80);
    const end = (dates.split('~')[1] || '').trim(); const dl = daysLeft(end); const cert = hero && hero.querySelector('a[href^="#cert/"]');
    const a0 = cur.querySelector('.items a[href^="#c/"]'); const cid = a0 ? decodeURIComponent(a0.getAttribute('href').split('/')[1]) : '';
    let back = '#my'; try { const sh = typeof SHOP === 'function' ? SHOP() : null; if (sh && (sh.classes || []).some(c => c.id === cid)) back = '#class/' + encodeURIComponent(cid); else if (SITE().classes.some(c => c.id === cid)) back = '#my'; } catch (e) { }
    if (hero) hero.classList.add('l26hide');
    const dn = ring && ring.dataset.done != null ? ring.dataset.done === '1' : p >= thr; /* v38 수료 여부는 myStats 판정(진도만으로 '수료' 아님) */
    const st = dn ? '수료' : p >= thr ? '수강중 · 수료 기준 남음' : p > 0 ? '수강중' : '수강 전';
    cur.insertAdjacentHTML('afterbegin', `<div class="l26ch"><div class="l26chh"><b>커리큘럼</b>${cnt ? `<small>${E(cnt)}</small>` : ''}</div><p class="l26cn">${E(name)}</p><small class="l26dl">${dl == null ? E(dates.split('·')[0] || '') : dl >= 0 ? `수강 기간 ${dl}일 남음` : '수강 기간이 끝났습니다'}</small><div class="l26bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="진도율"><i style="width:${Math.min(100, p)}%"></i></div><small class="l26pc ${dn ? 'ok' : ''}">${p}% ${st}</small>${(() => { try { const c0 = SITE().classes.find(x => x.id === cid); const K = c0 && typeof a2lCritTxt === 'function' ? a2lCritTxt(c0) : null; return K ? `<small class="l26crit" title="${E(K.l)}">수료 기준 · ${E(K.s)}</small>` : ''; } catch (e) { return ''; } })()}${cert ? `<a class="l26cert" href="${E(cert.getAttribute('href'))}">수료증 보기</a>` : ''}</div>`);
    cur.querySelectorAll('.items li li').forEach(li => { const a = li.querySelector('a'); if (!a || a.querySelector('.l26st')) return; const done = li.classList.contains('done'), on = li.classList.contains('on'); const ty = ((a.querySelector('em') || {}).textContent || '').trim();
      if (/^(단원|챕터)$/.test(ty)) { li.classList.add('l26chap'); return; }
      a.insertAdjacentHTML('beforeend', `<small class="l26st ${done ? 'ok' : on ? 'now' : ''}">${done ? '✓ 수강완료' : on ? '학습 중' : '미수강'}</small>`); });
    const ih = main.querySelector('.ih'); const CLS = (typeof lcTerm === 'function' && lcTerm('cls')) || '과정'; const BK = back === '#my' ? '내 학습으로 돌아가기' : `${CLS}${typeof lJ === 'function' ? lJ(CLS, '으로', '로') : '(으)로'} 돌아가기`; main.insertAdjacentHTML('afterbegin', `<div class="l26top"><a class="l26back" href="${E(back)}" aria-label="${E(BK)}"><span aria-hidden="true">←</span> ${E(BK)}</a></div>`);
    const h2 = main.querySelector(':scope > h2'); if (h2 && name) h2.insertAdjacentHTML('beforebegin', `<small class="l26cls">${E(name)}</small>`); void ih;
    const panel = main.querySelector('#lcPanel'); if (panel) { const side = document.createElement('aside'); side.className = 'l26side'; side.setAttribute('aria-label', '학습노트 · 공지 · 커뮤니티 · 수강후기'); cw.appendChild(side); side.appendChild(panel); }
  }
  /* 영상 재생 완료 → 다음 강의 이동 확인 */
  function closeDlg() { const d = document.getElementById('l26dlg'); if (d) d.remove(); }
  window.l26Ended = () => { const L = [...document.querySelectorAll('.crsb .inav a[href^="#c/"]')]; const nx = L.length > 1 || (L[0] && !/이전/.test(L[0].textContent)) ? L[L.length - 1] : null; if (!nx || document.getElementById('l26dlg')) return;
    const w = document.createElement('div'); w.id = 'l26dlg'; w.className = 'l26dlg'; w.innerHTML = `<div class="l26dlgb" role="dialog" aria-modal="true" aria-labelledby="l26dlgt"><p id="l26dlgt">영상의 재생이 완료되었습니다.<br>다음 강의로 이동하시겠습니까?</p><small>${E(nx.textContent.replace(/다음\s*·\s*|[→←]/g, '').trim())}</small><div><button type="button" class="lbtn ghost" data-l26dlg="0">취소</button><button type="button" class="lbtn pri" data-l26dlg="1">확인</button></div></div>`;
    document.body.appendChild(w); w.querySelector('[data-l26dlg="1"]').focus(); w.dataset.href = nx.getAttribute('href'); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-l26dlg]'); if (!b && e.target.id !== 'l26dlg') return; const d = document.getElementById('l26dlg'); const go = b && b.dataset.l26dlg === '1' ? d && d.dataset.href : ''; closeDlg(); if (go) location.hash = go; });
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('l26dlg')) closeDlg(); });
  addEventListener('hashchange', closeDlg);
  const mo = new MutationObserver(() => { try { enhance(); } catch (e) { console.error('lles26', e); } });
  const start = () => { mo.observe(document.getElementById('lapp') || document.body, { childList: true, subtree: true }); enhance(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
/* v26.4 공지사항(피그마 User Page › 공지사항): 총 N건 · 제목 검색 · 표 머리(번호 · 제목 · 작성일) · 번호 */
(() => { const run = () => { if (!/^#notice/.test(location.hash)) return; const L = document.querySelector('#lm .nlist:not([data-n26])'); if (!L) return; L.dataset.n26 = 1; L.classList.add('n26');
    const rows = [...L.querySelectorAll(':scope > details.nt')]; rows.forEach((d, i) => { const s = d.querySelector('summary'); if (s && !s.querySelector('.n26no')) s.insertAdjacentHTML('afterbegin', `<span class="n26no">${rows.length - i}</span>`); });
    L.insertAdjacentHTML('beforebegin', `<div class="n26bar"><b>총 <span id="n26c">${rows.length}</span>건</b><input type="search" id="n26q" placeholder="제목, 클래스/강의명 검색" aria-label="공지 검색"></div><div class="n26head" aria-hidden="true"><span>번호</span><span>제목</span><span>작성일</span></div>`); };
  document.addEventListener('input', e => { if (e.target.id !== 'n26q') return; const q = e.target.value.trim().toLowerCase(); let n = 0; document.querySelectorAll('#lm .nlist.n26 > details.nt').forEach(d => { const ok = !q || d.querySelector('summary').textContent.toLowerCase().includes(q); d.hidden = !ok; if (ok) n++; }); const c = document.getElementById('n26c'); if (c) c.textContent = n; });
  const mo = new MutationObserver(() => { try { run(); } catch (e) { } }); const st = () => { mo.observe(document.getElementById('lapp') || document.body, { childList: true, subtree: true }); run(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', st) : st(); })();
/* v26.5 게시판 목록 검색(피그마 User Page › 게시판 왼쪽 목록) */
document.addEventListener('input', e => { if (!e.target.classList || !e.target.classList.contains('lc26bq')) return; const q = e.target.value.trim().toLowerCase(); e.target.parentElement.querySelectorAll('nav a').forEach(a => { a.hidden = !!q && !a.dataset.n.includes(q); }); });
/* v26.6 마이페이지 결제 내역: 기간 · 검색 */
(() => { const f = () => { const p = +((document.getElementById('py26p') || {}).value || 0), q = ((document.getElementById('py26q') || {}).value || '').trim().toLowerCase(); const lim = p ? (() => { const d = new Date(); d.setMonth(d.getMonth() - p); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : ''; let n = 0;
    document.querySelectorAll('.py26t a.py26r').forEach(r => { const ok = (!lim || r.dataset.at >= lim) && (!q || r.dataset.q.includes(q)); r.hidden = !ok; if (ok) n++; }); const c = document.getElementById('py26c'); if (c) c.textContent = n + '건'; };
  document.addEventListener('input', e => { if (e.target.id === 'py26q') f(); }); document.addEventListener('change', e => { if (e.target.id === 'py26p') f(); }); })();
