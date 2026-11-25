/* 가디언 4차(d3) — 분기 접근권한 검토(#7) · 개인정보 내려받기 사유 입력(#14) · 국외 운영자 로그인 차단 설정(#15). 운영 서버 모드(live.js)에서만 동작한다.
   - window.accessReviewHTML(): 계정 · 기관 보안 설정 화면에 끼울 카드(정운영자). 열면 GET /api/access-review를 불러온다.
   - 화면 CSV(d6): window.exportGuard · downloadCSV 감쌈 → POST /api/export/log
   - 내려받기: /api/fac/export · /api/ledger/export 링크 · LMS 설문/신청자/출석부 내보내기 · 마일리지 지급 내역 메일(fetch 감쌈, d5)(화면의 <a> · 코드의 a.click())에 사유(reason)를 묻고 붙인다 — 기존 화면 파일은 고치지 않는다. */
(function () {
  'use strict';
  const ON = () => typeof api === 'function' && typeof LIVE === 'object' && LIVE && LIVE.user;
  const em = e => (window.errMsg ? window.errMsg(e) : (e && e.message) || '처리하지 못했습니다.');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ROLE = { owner: '정운영자', sub: '부운영자', teacher: '교강사' };
  const day = s => s ? String(s).slice(0, 10) : '기록 없음';

  async function load(box) {
    try {
      const r = await api('GET', '/api/access-review'); const g = await api('GET', '/api/org/sec/geo').catch(() => ({ krOnly: false }));
      box.innerHTML = `<p class="ar-due">${r.due ? '이번 분기 접근권한 검토가 필요합니다.' : '이번 분기 검토를 마쳤습니다.'} 마지막 검토: ${r.lastReview ? esc(day(r.lastReview.at)) + ' · ' + esc(r.lastReview.by) : '없음'}</p>
        <table class="ar-t"><thead><tr><th>계정</th><th>역할</th><th>마지막 로그인</th></tr></thead><tbody>${r.rows.map(x => `<tr><td>${esc(x.email)}</td><td>${esc(ROLE[x.role] || x.role)}</td><td>${esc(day(x.lastLogin))}</td></tr>`).join('')}</tbody></table>
        <label>검토 메모 <input class="ar-note" maxlength="500" placeholder="예: 퇴사자 계정 없음, 역할 적정"></label>
        <button class="btn ar-ok">검토 완료 기록</button>
        <label class="ar-geo"><input type="checkbox" class="ar-kr" ${g.krOnly ? 'checked' : ''}> 해외에서의 운영자 로그인 차단(국내만 허용)</label>
        <p class="ar-msg" role="status"></p>`;
      const msg = box.querySelector('.ar-msg');
      box.querySelector('.ar-ok').onclick = async () => { try { await api('POST', '/api/access-review', { note: box.querySelector('.ar-note').value }); await load(box); box.querySelector('.ar-msg').textContent = '검토 결과를 기록했습니다.'; } catch (e) { msg.textContent = em(e); } };
      box.querySelector('.ar-kr').onchange = async ev => { try { await api('POST', '/api/org/sec/geo', { krOnly: ev.target.checked }); msg.textContent = ev.target.checked ? '해외 운영자 로그인을 차단합니다.' : '해외 운영자 로그인 차단을 해제했습니다.'; } catch (e) { ev.target.checked = !ev.target.checked; msg.textContent = em(e); } };
    } catch (e) { box.innerHTML = `<p class="ar-msg">${esc(em(e))}</p>`; }
  }
  window.accessReviewHTML = () => {
    if (!ON() || LIVE.user.role !== 'owner') return '';
    const id = 'ar' + Math.random().toString(36).slice(2, 8);
    setTimeout(() => { const b = document.getElementById(id); if (b) load(b); }, 0);
    return `<section class="card ar-card"><h3>접근권한 정기 검토(분기 1회)</h3><div id="${id}">불러오는 중입니다.</div></section>`;
  };

  /* #14 내려받기 사유 */
  const base = HTMLAnchorElement.prototype.click;
  const RX = /\/api\/(fac|ledger)\/export(\?|$)/;
  function withReason(href) {
    if (!(RX.test(href) || FX.test(href)) || /[?&]reason=/.test(href)) return href;
    const r = window.prompt('개인정보가 포함된 파일입니다. 내려받는 사유를 입력하십시오(학번은 기본으로 가려집니다).', '');
    if (r == null) return null; if (r.trim().length < 2) { window.alert('사유를 2자 이상 입력하십시오.'); return null; }
    return href + (href.includes('?') ? '&' : '?') + 'reason=' + encodeURIComponent(r.trim().slice(0, 200));
  }
  document.addEventListener('click', ev => {
    const a = ev.target && ev.target.closest && ev.target.closest('a[href]'); if (!a || !RX.test(a.getAttribute('href') || '')) return;
    ev.preventDefault(); const h = withReason(a.getAttribute('href')); if (h == null) return;
    const t = document.createElement('a'); t.href = h; t.download = a.getAttribute('download') || ''; base.call(t); /* 링크 자체는 바꾸지 않는다(매번 사유를 묻는다) */
  }, true);
  /* d5: JSON으로 받는 내려받기(설문 · 신청자 · 설문 일괄 · 출석부)와 마일리지 지급 내역 메일(POST 본문)도 같은 사유를 묻는다 — fetch를 감싼다 */
  const FX = /\/api\/lms\/(k\/export|q\/applicants\/export|q\/survey\/results|g\/export)(\?|$)/, MX = /\/api\/mileage\/shop\/payouts\/send(\?|$)/;
  const cancel = () => { const e = new Error('내려받기를 취소했습니다.'); e.status = 0; e.code = 'export_cancel'; return Promise.reject(e); };
  const f0 = window.fetch;
  if (typeof f0 === 'function') window.fetch = function (u, o) {
    const s = typeof u === 'string' ? u : (u && u.url) || ''; const m = String((o && o.method) || 'GET').toUpperCase();
    if (m === 'GET' && FX.test(s) && !/[?&]reason=/.test(s)) { const h = withReason(s); if (h == null) return cancel(); return f0.call(this, typeof u === 'string' ? h : new Request(h, u), o).then(r => { if (r && r.ok) srvUntil = Date.now() + 15000; return r; }); /* d6: 서버가 이미 통제한 행을 화면 CSV로 다시 묻지 않는다 */ }
    if (m === 'POST' && MX.test(s) && o && typeof o.body === 'string') { let b; try { b = JSON.parse(o.body); } catch (e) { b = null; }
      if (b && !b.reason) { const r = window.prompt('학번(내부ID)이 포함된 지급 내역을 보냅니다. 사유를 입력하십시오(학번은 기본으로 가려집니다).', ''); if (r == null) return cancel(); if (r.trim().length < 2) { window.alert('사유를 2자 이상 입력하십시오.'); return cancel(); }
        b.reason = r.trim().slice(0, 200); o = { ...o, body: JSON.stringify(b) }; } }
    return f0.call(this, u, o);
  };
  /* d6: 화면에서 직접 만드는 CSV · 엑셀(서버 JSON → 브라우저에서 파일 생성)도 같은 사유 입력 → POST /api/export/log(audit 'export' via:'client') → 학번 열 기본 끝 4자리.
     window.exportGuard(kind, rows, { cols?, raw? }) → Promise<{ rows, raw } | null>(취소 · 거절이면 null). 시연 모드는 서버가 없으니 사유만 묻는다.
     core.js downloadCSV는 여기서 감싼다: 개인정보 열(학번 · 이름 · 연락처 · 이메일 · 사번 · 학습자 번호 등)이 있는 파일만 묻고, 양식(빈 서식) · 직전에 서버 통제를 거친 파일(d5 fetch)은 그대로 둔다. */
  const SIDC = /^(학번|sid|id|아이디|학습자 ?번호|사번|내부 ?id|member_no|학습자\(끝 4자리\))$/i;
  const PIIC = /학번|이름|성명|연락처|휴대폰|전화|이메일|아이디|학습자|훈련생|수강생|원생|결제자|사번|보호자|응시자|사용자|^sid$|^id$|member_no|email|phone/i;
  const tail4 = v => { const s = v == null ? '' : String(v); if (!s) return s; return s.length <= 4 ? '*'.repeat(s.length) : '*'.repeat(s.length - 4) + s.slice(-4); };
  const roleNow = () => (ON() ? LIVE.user.role : (typeof S === 'object' && S && S.me && S.me.role) || '');
  let lastAct = '', srvUntil = 0;
  document.addEventListener('click', ev => { const el = ev.target && ev.target.closest && ev.target.closest('[data-act]'); if (el) lastAct = el.getAttribute('data-act') || ''; }, true);
  function askReason() {
    const r = window.prompt('개인정보가 포함된 파일입니다. 내려받는 사유를 입력하십시오(학번은 기본으로 가려집니다).', '');
    if (r == null) return null; if (r.trim().length < 2) { window.alert('사유를 2자 이상 입력하십시오.'); return null; } return r.trim().slice(0, 200);
  }
  window.exportGuard = async function (kind, rows, opts) {
    opts = opts || {}; rows = Array.isArray(rows) ? rows : []; const k = String(kind || 'csv').replace(/[^\w.:-]/g, '_').slice(0, 60) || 'csv';
    const keys = Array.isArray(opts.cols) ? opts.cols.map((c, i) => [i, String(c)]) : [...new Set(rows.flatMap(r => r && typeof r === 'object' && !Array.isArray(r) ? Object.keys(r) : []))].map(c => [c, c]);
    const sid = keys.filter(([, c]) => SIDC.test(c.trim()) || /학번/.test(c)).map(([i]) => i);
    const reason = askReason(); if (reason == null) return null;
    let raw = opts.raw === true;
    if (opts.raw == null && sid.length && roleNow() === 'owner') raw = window.confirm('학번(내부ID)을 가리지 않은 원본으로 내려받으시겠습니까?\n[확인] 원본 · [취소] 끝 4자리만 표시');
    if (ON()) { try { raw = !!(await api('POST', '/api/export/log', { kind: k, n: rows.length, reason, raw })).raw; } catch (e) { window.alert(em(e)); return null; } }
    else if (raw && roleNow() !== 'owner') { window.alert('원본(가리지 않은) 내려받기는 정운영자만 할 수 있습니다.'); return null; }
    if (raw || !sid.length) return { rows, raw };
    return { raw, rows: rows.map(r => { if (Array.isArray(r)) { const c = r.slice(); for (const i of sid) c[i] = tail4(c[i]); return c; } if (r && typeof r === 'object') { const c = { ...r }; for (const i of sid) if (i in c) c[i] = tail4(c[i]); return c; } return r; }) };
  };
  window.exportGuard.PII = PIIC; window.exportGuard.SID = SIDC;
  window.exportGuard.needs = (name, cols, rows) => Array.isArray(cols) && Array.isArray(rows) && rows.length > 0 && !/양식/.test(String(name || '')) && Date.now() > srvUntil && cols.some(c => PIIC.test(String(c)));
  if (typeof downloadCSV === 'function') { const D0 = downloadCSV;
    downloadCSV = function (name, cols, rows) { /* eslint-disable-line no-global-assign */
      if (!window.exportGuard.needs(name, cols, rows)) return D0(name, cols, rows);
      return window.exportGuard('csv:' + (lastAct || 'download'), rows, { cols }).then(g => { if (g) D0(name, cols, g.rows); return g; });
    };
  }
  HTMLAnchorElement.prototype.click = function () {
    if (!this.isConnected && RX.test(this.getAttribute('href') || '')) { const h = withReason(this.getAttribute('href')); if (h == null) return; this.setAttribute('href', h); }
    return base.call(this);
  };
})();
