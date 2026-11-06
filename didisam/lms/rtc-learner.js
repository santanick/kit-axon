/* x2 실시간 수업 · 자막 — 학습자 앱(learner.html 「내 학습」 카드)
   지금 들어갈 수 있는 실시간 수업(링크 · QR과 같은 입장 화면 liveclass.html) · 외부 링크 수업(Zoom · Teams, 휴대폰은 바로 열기) · 공개된 수업 대본 · 요약
   운영: GET /api/lms/live/my(학습자 세션) · GET /api/lms/live/cap-transcript. 데모: lms/rtc-core.js 데모 저장소(스튜디오와 같은 브라우저 저장). */
(function () {
  'use strict';
  if (typeof viewMy !== 'function' || typeof LR !== 'object' || !window.LV) return;
  const on = () => { try { const o = SITE() && SITE().org; return !!(o && o.type === 'univ' && o.ed === 'lms' && LR.me); } catch (e) { return false; } };
  const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? ''));
  const ST = { my: null, busy: false, err: '', tr: {} };
  const call = (m, p) => { LV.setMode(LR.mode === 'live' ? 'live' : 'demo'); LV.demoMe = { kind: 'learner', sid: String(LR.me && LR.me.sid || '20261001') }; return LV.api(m, p); };
  const re = () => { if (typeof lrender === 'function') lrender(); };
  function load() { if (ST.my || ST.busy) return; ST.busy = true; call('GET', '/api/lms/live/my').then(j => { ST.my = j; }).catch(e => { ST.err = e.message; ST.my = { rooms: [], captions: [] }; }).finally(() => { ST.busy = false; re(); }); }
  function card() {
    load(); const j = ST.my; const head = '<div class="myhead"><h2>실시간 수업</h2></div>';
    if (!j) return `<div class="mycard wide" id="lvMy">${head}<p class="mini">불러오는 중입니다.</p></div>`;
    const rooms = j.rooms || [], caps = j.captions || [];
    return `<div class="mycard wide" id="lvMy">${head}${ST.err ? `<p class="mini">${E(ST.err)}</p>` : ''}
      ${rooms.map(r => `<div class="gij-rf"><b>${E(r.title)}</b> <small>${E(r.section_title || '')} · ${r.status === 'live' ? '지금 진행 중' : '시작 전'}</small><br>
        ${r.mode === 'link' ? `<a class="lbtn sm" href="${E(r.ext_url)}" target="_blank" rel="noopener">외부 화상 수업 열기</a>` : `<a class="lbtn sm" href="${E(LV.url('join=' + encodeURIComponent(r.code)))}" target="_blank" rel="noopener">${r.status === 'live' ? '지금 입장' : '입장해서 기다리기'}</a>`}</div>`).join('') || '<p class="mini">지금 들어갈 실시간 수업이 없습니다. 교수님이 수업을 열면 여기에 나타납니다.</p>'}
      <p class="mini">접속한 시간으로 출석이 자동 기록됩니다. 같은 학번으로 다른 기기에서 입장하면 먼저 연결은 끊깁니다.</p>
      ${caps.length ? `<h3 style="font-size:15px;margin:12px 0 4px">수업 대본 · 요약</h3>${caps.map(c => `<div class="gij-rf"><b>${E(c.title)}</b> <button class="lbtn sm ghost" data-lact="lv-tr" data-v="${E(c.room_id)}">${ST.tr[c.room_id] ? '접기' : '보기'}</button>${ST.tr[c.room_id] && ST.tr[c.room_id].transcript != null ? `${ST.tr[c.room_id].summary ? `<p><b>요약</b><br>${E(ST.tr[c.room_id].summary).replace(/\n/g, '<br>')}</p>` : ''}<p>${E(ST.tr[c.room_id].transcript).replace(/\n/g, '<br>')}</p>` : ''}</div>`).join('')}` : ''}</div>`;
  }
  { const base = viewMy; viewMy = function (...a) { const h = base.apply(this, a); if (!on()) return h; try { const c = card(); return h.includes('<div class="mygrid">') ? h.replace('<div class="mygrid">', '<div class="mygrid">' + c) : c + h; } catch (e) { console.error('lv my', e); return h; } }; } // eslint-disable-line no-global-assign
  document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-lact="lv-tr"]'); if (!b) return; e.preventDefault(); const id = b.dataset.v;
    if (ST.tr[id]) { delete ST.tr[id]; re(); return; } ST.tr[id] = {}; try { const j = await call('GET', '/api/lms/live/cap-transcript?room_id=' + encodeURIComponent(id)); ST.tr[id] = { transcript: j.transcript || '', summary: j.summary }; } catch (x) { ST.tr[id] = { transcript: x.message }; } re(); }, true);
})();
