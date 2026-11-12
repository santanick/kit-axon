/* v30 학사 LMS 묶음 A — 학습자 앱: 「이번 학기 수강 분반」 카드(내 강의 화면)
   - 운영: GET /api/lms/a/my (학습자 세션) — 합반 공유분반은 대표분반으로 보이고 숨김 분반은 보이지 않는다. 청강 · 조교 신청 · 취소(POST)
   - 데모: 이 브라우저의 기관 데이터룸(S.lms.a)에서 같은 규칙으로 읽기만 한다(신청은 운영 서버에서) */
(function () {
  'use strict';
  if (typeof viewMy !== 'function' || typeof LR !== 'object') return;
  const on = () => { try { const o = SITE() && SITE().org; return !!(o && o.type === 'univ' && o.ed === 'lms' && LR.me); } catch (e) { return false; } };
  const ST = { live: null, busy: false, err: '' };
  const MODE = { online: '온라인', blended: '블렌디드', offline: '오프라인', hyflex: '하이플렉스' };
  function demo() {
    let A = null; try { const r = typeof demoRoom === 'function' ? demoRoom() : null; A = r && r.lms && r.lms.a; } catch (e) { }
    if (!A) return { me: null, sections: [], requests: [], open: [] };
    const m = String(LR.me.sid || ''); if (!A.persons.some(p => p.member_no === m)) return { me: null, sections: [], requests: [], open: [] };
    const co = c => (A.courses.find(x => x.course_code === c) || {}).name || ''; const out = new Map();
    const add = (sid, kind) => { const s0 = A.sections.find(s => s.section_id === sid); if (!s0) return; const v = A.sections.find(s => s.section_id === (s0.rep_section_id || s0.section_id)); if (!v || !['open', 'closed'].includes(v.status)) return; if (out.has(v.section_id)) { const o = out.get(v.section_id); if (kind === 'ta') o.ta = true; else if (o.kind === 'ta') { o.kind = kind; o.ta = true; } return; } /* v38 #17 수강하면서 조교인 학생은 둘 다 표시 */
      out.set(v.section_id, { section_id: v.section_id, course_code: v.course_code, course_name: co(v.course_code), section_no: v.section_no, title: v.title, mode: v.mode, schedule: v.schedule || [], kind, ta: kind === 'ta', via: s0.section_id !== v.section_id ? s0.section_no : null }); };
    A.enr.filter(e => e.member_no === m && e.status === 'enrolled').forEach(e => add(e.section_id, e.kind)); A.staff.filter(t => t.member_no === m && t.status === 'active').forEach(t => add(t.section_id, 'ta'));
    const req = [...A.enr.filter(e => e.member_no === m && e.status === 'pending').map(e => ({ section_id: e.section_id, kind: 'audit' })), ...A.staff.filter(t => t.member_no === m && t.status === 'pending').map(t => ({ section_id: t.section_id, kind: 'ta' }))];
    return { me: { member_no: m }, sections: [...out.values()].sort((a, b) => a.course_code < b.course_code ? -1 : a.course_code > b.course_code ? 1 : a.section_no < b.section_no ? -1 : 1), requests: req, open: [] };
  }
  function data() {
    if (LR.mode !== 'live') return demo();
    if (!ST.live && !ST.busy && !ST.err) { ST.busy = true; api('GET', '/api/lms/a/my').then(r => { ST.live = r; }).catch(e => { ST.err = e.message; }).finally(() => { ST.busy = false; if (typeof lrender === 'function') lrender(); }); }
    return ST.live;
  }
  function card() {
    const D = data(); const head = '<div class="myhead"><h2>이번 학기 수강 분반</h2></div>';
    if (!D) return `<div class="mycard" id="lmsaMy">${head}<p class="mini">${ST.err ? esc(ST.err) : '불러오는 중입니다.'}</p></div>`;
    if (!D.me) return `<div class="mycard" id="lmsaMy">${head}<p class="mini">학사 정보에 등록된 학번이 아닙니다. 학교 학사 담당 부서에 문의하세요.</p></div>`;
    const sn = id => { const s = [...D.sections, ...(D.open || [])].find(x => x.section_id === id); return s ? `${s.course_name} ${s.section_no}분반` : '분반'; };
    const L = D.sections.map(s => `<li><b>${esc(s.course_name)}</b> <small>${esc(s.course_code)} · ${esc(s.section_no)}분반 · ${esc(MODE[s.mode] || s.mode)}${s.kind === 'audit' ? ' · 청강(성적 미산정)' : ''}${s.kind === 'ta' || s.ta ? ' · <b class="lmsa-ta">조교</b>' : ''}${s.via ? ` · ${esc(s.via)}분반 합반` : ''}</small>${(s.schedule || []).length ? `<small class="lmsa-sch">${esc(s.schedule.map(x => `${x.day} ${x.period}${x.room ? ' ' + x.room : ''}`).join(', '))}</small>` : ''}</li>`).join('');
    const R = (D.requests || []).map(r => `<li>${esc(sn(r.section_id))} · ${r.kind === 'ta' ? '조교' : '청강'} 신청 승인 대기${LR.mode === 'live' ? ` <button class="lbtn sm ghost" data-lact="lmsa-cancel" data-s="${esc(r.section_id)}" data-k="${esc(r.kind)}">신청 취소</button>` : ''}</li>`).join('');
    const O = LR.mode === 'live' && (D.open || []).length ? `<details class="nt"><summary><b>청강 신청하기</b></summary><ul class="lmsa-ul">${D.open.slice(0, 30).map(s => `<li>${esc(s.course_name)} <small>${esc(s.course_code)} · ${esc(s.section_no)}분반</small> <button class="lbtn sm ghost" data-lact="lmsa-req" data-s="${esc(s.section_id)}">청강 신청</button></li>`).join('')}</ul></details>` : '';
    return `<div class="mycard" id="lmsaMy">${head}<p class="mini">학번 ${esc(D.me.member_no)} · 학사 수강 정보 기준</p><ul class="lmsa-ul">${L || '<li class="mini">이번 학기 수강 분반이 없습니다.</li>'}</ul>${R ? `<p class="mini"><b>신청 현황</b></p><ul class="lmsa-ul">${R}</ul>` : ''}${O}</div>`;
  }
  { const base = viewMy; viewMy = function (...a) { const h = base.apply(this, a); if (!on()) return h; try { const c = card(); return h.includes('<div class="mygrid">') ? h.replace('<div class="mygrid">', '<div class="mygrid">' + c) : c + h; } catch (e) { console.error('lmsa my', e); return h; } }; } // eslint-disable-line no-global-assign
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-lact="lmsa-req"],[data-lact="lmsa-cancel"]'); if (!el) return; e.preventDefault(); el.disabled = true;
    try { await api('POST', '/api/lms/a/my', { act: el.dataset.lact === 'lmsa-req' ? 'request' : 'cancel', kind: el.dataset.k || 'audit', section_id: el.dataset.s }); toast(el.dataset.lact === 'lmsa-req' ? '청강을 신청했습니다. 교수 승인 후 수강 목록에 들어갑니다.' : '신청을 취소했습니다.'); ST.live = null; if (typeof lrender === 'function') lrender(); }
    catch (x) { toast(x.message, 'bad'); el.disabled = false; }
  });
  try { const s = document.createElement('style'); s.textContent = '#lmsaMy .lmsa-ul{list-style:none;padding:0;margin:6px 0;display:grid;gap:8px}#lmsaMy .lmsa-ul small{color:var(--mut,#666)}#lmsaMy .lmsa-sch{display:block}'; document.head.appendChild(s); } catch (e) { }
})();
