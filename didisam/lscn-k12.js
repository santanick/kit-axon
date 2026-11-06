/* 시나리오 k12 — 학습자 앱. 보호자 「자녀 관리」에 학원 기록(출결 · 진도 · 과제 · 성적 · 보강 · 공유 상담)을 덧붙인다.
   작성 규칙은 저장소 루트의 CLAUDE.md를 따른다. 원생 개별 메모와 석차는 보여 주지 않는다. */
(function () {
  'use strict';
  if (typeof laKid !== 'function') return;
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const td = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const li = (b, s) => `<li><b>${b}</b>${s ? ` <small>${s}</small>` : ''}</li>`;
  const box = (t, body, empty) => `<div class="mycard lk12"><h3>${E(t)}</h3>${body || `<p class="empty">${E(empty)}</p>`}</div>`;
  function k12Kid(r, cid) {
    const CL = (r.classes || []).filter(c => (c.learners || []).includes(cid)); const today = td();
    /* 최근 출결 · 진도 · 과제 */
    const att = CL.flatMap(c => (c.sessions || []).filter(s => s.date && s.date <= today).map(s => { const v = ((c.att || {})[s.id] || {})[cid]; const st = v && typeof v === 'object' ? v.st : v; const day = (c.crmDay || {})[s.id] || {}; const row = (day.rows || {})[cid] || {}; const tm = ((c.attT || {})[s.id] || {})[cid] || {}; return { c, s, st, day, row, tm }; }).filter(x => x.st || x.day.closed || x.day.prog || x.day.hw))
      .sort((a, b) => a.s.date < b.s.date ? 1 : -1).slice(0, 14);
    const attHTML = att.length ? `<ul class="la-req">${att.map(x => li(`${E(x.s.date)} ${E(x.c.name)}`, [x.day.closed ? '휴강' : (x.st || '미입력'), x.tm.in ? `등원 ${E(x.tm.in)}${x.tm.out ? ` · 하원 ${E(x.tm.out)}` : ''}` : '', x.row.reason ? `사유 ${E(x.row.reason)}` : '', x.day.prog ? `진도 ${E(x.day.prog)}` : '', x.day.hw ? `과제 ${E(x.day.hw)}(${x.row.hw ? '제출' : '미제출'})` : ''].filter(Boolean).join(' · '))).join('')}</ul>` : '';
    /* 학원 시험 성적: 점수 · 만점 · 반 평균(석차 제외) */
    const ex = CL.flatMap(c => (c.k12Exams || []).filter(e => e.scores && e.scores[cid]).map(e => { const me = e.scores[cid]; const V = Object.values(e.scores).filter(x => x && !x.absent && x.v != null).map(x => +x.v); const avg = V.length ? Math.round(V.reduce((a, b) => a + b, 0) / V.length * 10) / 10 : null; return { c, e, me, avg }; }))
      .sort((a, b) => a.e.date < b.e.date ? 1 : -1).slice(0, 12);
    const exHTML = ex.length ? `<ul class="la-req">${ex.map(x => li(`${E(x.e.date)} ${E(x.e.name)}`, `${E(x.c.name)} · ${x.me.absent ? '미응시' : x.me.v == null ? '점수 입력 전' : `${E(x.me.v)}점 / ${E(x.e.max || 100)}`}${x.avg != null ? ` · 반 평균 ${E(x.avg)}` : ''}`)).join('')}</ul>` : '';
    /* 예정 보강 */
    const mk = CL.flatMap(c => (c.makeups || []).filter(x => x.mid === cid && x.st !== '완료').map(x => ({ c, x }))).sort((a, b) => a.x.date < b.x.date ? -1 : 1);
    const mkHTML = mk.length ? `<ul class="la-req">${mk.map(({ c, x }) => li(`${E(x.date)} ${E(x.time || '')}`, E(c.name))).join('')}</ul>` : '';
    /* 학원이 공유한 상담 */
    const cs = (r.consults || []).filter(x => x && x.who === cid && x.share).sort((a, b) => String(a.at) < String(b.at) ? 1 : -1).slice(0, 10);
    const csHTML = cs.length ? `<ul class="la-req">${cs.map(x => li(`${E(String(x.at).slice(0, 10))} ${E(x.cat || '상담')}`, E(String(x.text || x.summary || '').slice(0, 400)))).join('')}</ul>` : '';
    return `<div class="lk12w">${box('학원 출결 · 진도 · 과제', attHTML, '아직 기록이 없습니다.')}${box('학원 시험 성적', exHTML, '아직 성적이 없습니다.')}${mk.length ? box('예정 보강', mkHTML) : ''}${cs.length ? box('학원 상담 공유', csHTML) : ''}</div>`;
  }
  window.lk12Kid = k12Kid;
  const base = laKid;
  laKid = function (r, cid) { const h = base(r, cid); try { return r && r.org && r.org.type === 'k12' && (r.members || []).some(m => m.id === cid) ? h + k12Kid(r, cid) : h; } catch (e) { console.error(e); return h; } };
})();
