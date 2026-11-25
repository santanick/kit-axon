/* v46 D5 grade2 — Ver2 채점 · 피드백 초안 + 승인 발송(기능 5).
   - 꺼짐(S.aipol.on 아님)이면 기존 ACT.grade · VIEWS.assess 그대로(1순위).
   - 켜짐: 초안은 c.prog[id].ai = { crit, total, fb, rb, model, at, st:'draft'|'edit', ok, res, fin } — 학습자 비공개.
     「확인 후 보내기」 때만 p.score · p.fb · p.assign · p.fbSent = { at, by } 기록(AI 총점 p.aiTotal 함께). 다시 보내면 p.fbHist에 이전 점수 이력 + p.fbNew(학습자 알림).
   - 서버 필터(D1 · D2 계약): mineOf는 fbSent가 없고 assign이 graded · returned · failed도 아니면 fb · score를 빼고 보낸다.
   - 학습자(learner.html): 게시본 aipol.on이면 확정 전 fb · score를 화면에서 숨기고, 새로 도착한 피드백에 「선생님 피드백이 도착했어요」. */
(() => {
  const DONE = ['graded', 'returned', 'failed'];
  const RES = { graded: '통과', returned: '재제출', failed: '미통과' };
  const esc2 = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])));
  const on = () => { try { if (window.AIPOL && typeof AIPOL.on === 'function') return !!AIPOL.on(); } catch (e) { } try { return !!(typeof S !== 'undefined' && S && S.aipol && S.aipol.on); } catch (e) { return false; } };
  const readable = t => String(t || '').replace(/\s/g, '').length >= 5;
  const KW = ['문제', '목표', '방법', '과정', '결과', '개선', '근거', '사례'];

  if (typeof VIEWS !== 'undefined' && typeof ACT !== 'undefined') {
    const icx = (k, n) => (typeof ic === 'function' ? ic(k, n || 16) : '');
    const live = () => { try { return typeof LIVE !== 'undefined' && LIVE && LIVE.cfg && !!LIVE.cfg.ai; } catch (e) { return false; } };
    const linked = c => { const it = typeof asgItem === 'function' ? asgItem(c) : null; return !!(it && it.rubric && (S.rubrics || []).some(r => r.id === it.rubric)); };
    const rbOf = c => (S.rubrics || []).find(r => r.id === (asgItem(c) || {}).rubric) || null;
    const lvlOf = c => { const it = asgItem(c) || {}; try { if (window.AIPOL && AIPOL.levelOf) return AIPOL.levelOf(it, 'assign'); } catch (e) { } return (it.ai && it.ai.lvl) || (S.aipol && S.aipol.preset && S.aipol.preset.assign) || 'L1'; };
    const PTS = [1, .7, .4];
    /* 규칙 모의 초안(기존 AI.evaluate) */
    const mock = (c, id) => { const r = aiEval(c, id); Object.assign(r, { model: 'rule', at: Date.now(), st: 'draft', ok: false, res: r.total >= 70 ? 'graded' : 'returned' }); delete r.fin; return r; };
    /* 운영: 게이트웨이(feature 'grade'), 실패 · 한도 초과면 규칙 모의 */
    async function draft(c, id) { const p = c.prog[id]; const rb = rbOf(c); if (!rb) throw Object.assign(new Error('rubric'), { code: 'rubric' }); if (!readable(p.sub)) throw Object.assign(new Error('unread'), { code: 'unread' });
      if (window.PLAN && !PLAN.can('grade')) throw Object.assign(new Error('plan'), { code: 'plan_feature' }); /* v47 요금제(Pro부터) */
      if (!live() || typeof api !== 'function') return mock(c, id);
      try { const sid = (M(id) && (M(id).sid || (M(id).extra || {})['학번'])) || 'learner';
        const sys = '너는 교수자의 채점 조교다. 루브릭 기준마다 수준(0=우수,1=보통,2=미흡)과 근거 한 줄, 전체 피드백 초안(3문장 이내, 존댓말)을 JSON으로만 답한다: {"crit":[{"li":0,"why":""}],"fb":""}. 점수 확정은 교수자가 한다.';
        const msg = `학습자 ${sid}\n루브릭: ${rb.criteria.map((x, k) => `${k + 1}. ${x.n}(${x.pts}점): ${x.lv.join(' / ')}`).join('\n')}\n제출물:\n${String(p.sub).slice(0, 6000)}`;
        const j = await api('POST', '/api/ai/messages', { feature: 'grade', system: sys, messages: [{ role: 'user', content: msg }], max: 900 });
        const tx = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''); const o = JSON.parse(tx.slice(tx.indexOf('{'), tx.lastIndexOf('}') + 1));
        const crit = rb.criteria.map((x, k) => { const li = Math.min(2, Math.max(0, +((o.crit || [])[k] || {}).li || 0)); return { li, score: Math.round(x.pts * PTS[li]), why: String(((o.crit || [])[k] || {}).why || '').slice(0, 200) }; });
        const total = crit.reduce((a, x) => a + x.score, 0); return p.ai = { crit, total, rb: rb.id, fb: String(o.fb || '').slice(0, 1000), model: j.model || 'gw', at: Date.now(), st: 'draft', ok: false, res: total >= 70 ? 'graded' : 'returned' };
      } catch (e) { if (e && e.code === 'plan_feature') throw e; return mock(c, id); } }
    const errMsg = e => e && e.code === 'plan_feature' ? `AI 채점 초안은 ${window.PLAN ? PLAN.name(PLAN.need('grade')) : 'Pro'} 요금제부터 이용할 수 있습니다. 설정 › 요금제에서 확인하십시오.` : e && e.code === 'rubric' ? '루브릭을 연결해야 AI 초안을 만들 수 있습니다.' : e && e.code === 'unread' ? '제출물 글자를 읽지 못해 초안을 만들 수 없습니다. 직접 채점해 주세요.' : 'AI 초안을 만들지 못했습니다. 직접 채우거나 다시 시도해 주세요.';
    const stOf = p => p.fbSent && !(p.ai && (p.ai.st === 'edit' || p.ai.st === 'draft') && p.ai.at > (p.fbSent.at || 0)) ? 'sent' : p.ai ? (p.ai.ok ? 'ok' : p.ai.st === 'edit' ? 'edit' : 'draft') : 'none';
    const STN = { none: '초안 전', draft: '초안', edit: '수정 중', ok: '확인됨', sent: '발송됨' };
    /* 발송: 확인한 건만. 이미 보낸 건은 이력 · 알림 */
    function send(c, id, by) { const p = c.prog[id]; const a = p.ai; if (!a || !a.ok) return false; const st = a.res || 'graded'; const sc = a.fin != null ? +a.fin : a.total;
      if (p.fbSent) { p.fbHist = (p.fbHist || []).concat([{ score: p.score, fb: String(p.fb || '').slice(0, 1000), assign: p.assign, at: p.fbSent.at }]).slice(-10); p.fbNew = Date.now(); }
      p.score = sc; p.fb = String(a.fb || ''); p.assign = st; p.aiTotal = a.total; p.crit = (a.crit || []).map(x => x.li); p.fbSent = { at: Date.now(), by: (S.me && S.me.name) || '' }; delete p.draft; a.st = 'sent'; a.ok = false;
      let msg = `${(M(id) || {}).name || ''} — ${RES[st]} (${sc}점)`;
      if (st === 'graded') { const b = (S.badges || []).find(b => b.cls === c.id && b.method === 'pass' && !b.special); if (b && !b.issued.some(i => i.who === id && i.st === '유효')) { b.issued.unshift({ who: id, at: today(), no: `${b.key}-${String(b.issued.length + 1).padStart(4, '0')}`, how: '자동', st: '유효', reason: '평가 통과' }); msg += ` · 「${b.name}」 배지 자동 발급`; } }
      try { window.LEV && LEV.emit('submit', { cls: c.id, item: (asgItem(c) || {}).id || '' }, { score: sc }); } catch (e) { }
      try { logAudit('평가 발송 — ' + msg); } catch (e) { } return msg; }
    window.GRADE2 = { on, draft, send, stOf, mock, readable };

    /* 채점 화면(켜짐) */
    const hl = t => { let h = esc2(t || '(제출 파일 · 링크)'); KW.forEach(k => { h = h.split(esc2(k)).join(`<mark class="g2-ev">${esc2(k)}</mark>`); }); return h.replace(/\n/g, '<br>'); };
    function open(el) { const c = C(el.dataset.c), id = el.dataset.v, p = c.prog[id]; const rb = rbOf(c); const a = p.ai; const lv = lvlOf(c); const sent = !!p.fbSent;
      const err = !rb ? `<div class="g2-err" role="alert"><p>루브릭을 연결해야 AI 초안을 만들 수 있습니다.</p><button type="button" class="btn sm pri" data-g2="link">루브릭 연결</button></div>` : !readable(p.sub) ? '<p class="g2-err" role="alert">제출물 글자를 읽지 못해 초안을 만들 수 없습니다. 직접 채점해 주세요.</p>' : '';
      const R = rb || (typeof rubricOf === 'function' ? rubricOf(c) : null) || { name: '기본 기준', criteria: [] };
      const use = ['L2', 'L3'].includes(lv) ? `<div class="g2-use"><b>${icx('spark', 14)} AI 사용 기록 · ${esc2(lv)}</b><p>${esc2(p.aiUse || '제출 때 남긴 AI 사용 기록이 없습니다.')}</p>${lv === 'L3' ? `<p><b>검증 · 수정 설명</b> ${esc2(p.verify || '없음')}</p>` : ''}</div>` : '';
      const w = modal(`채점 — ${(M(id) || {}).name || ''} · ${c.name}`, `<div class="g2">
        <p class="g2-note">${icx('lock', 14)} AI 초안 — 확인 전에는 학습자에게 보이지 않습니다 <span class="g2-st s-${stOf(p)}">${STN[stOf(p)]}</span></p>${err}
        <div class="g2-cols"><div class="g2-sub"><small>제출물 · ${esc2(p.subAt || '')}</small><p>${hl(p.sub)}</p>${use}</div>
        <div class="g2-rb"><div class="g2-rbh"><b>${esc2(R.name)}</b><button type="button" class="btn sm ink" data-g2="redo" ${rb && readable(p.sub) ? '' : 'disabled'}>${icx('spark', 14)} ${a ? '초안 다시 만들기' : 'AI 초안 만들기'}</button></div>
          ${R.criteria.map((cr, k) => `<div class="g2-cr"><div><b>${esc2(cr.n)}</b> <small>/${cr.pts}</small>${a && a.crit[k] ? `<p class="why">${icx('spark', 12)} ${esc2(a.crit[k].why)}</p>` : ''}</div><div class="lvs">${cr.lv.map((d, j) => `<label title="${esc2(d)}"><input type="radio" name="g${k}" value="${j}" ${a && a.crit[k] && a.crit[k].li === j ? 'checked' : ''} data-pts="${Math.round(cr.pts * PTS[j])}"><span>${['우수', '보통', '미흡'][j]}<small>${Math.round(cr.pts * PTS[j])}</small></span></label>`).join('')}</div></div>`).join('')}
          <div class="g2-sum">최종 <b id="g2Tot">${a ? (a.fin != null ? a.fin : a.total) : 0}</b>점 ${a ? `<small class="mini">AI 총점 ${a.total}점</small>` : ''} <small class="mini">점수는 교수자가 확정합니다</small></div></div></div>
        <label class="fl">피드백 초안<textarea name="g2fb" rows="3" maxlength="1000">${esc2(a ? a.fb : p.fb || '')}</textarea></label>
        <div class="g2-res" role="radiogroup" aria-label="결과">${Object.entries(RES).map(([k, n]) => `<label><input type="radio" name="g2res" value="${k}" ${(a ? a.res : p.assign) === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
        <label class="g2-ok"><input type="checkbox" name="g2ok" ${a && a.ok ? 'checked' : ''}> 확인했습니다(일괄 발송 대상)</label>
        ${(p.fbHist || []).length ? `<p class="mini g2-hist">이전 발송 ${p.fbHist.map(h => `${h.score}점(${new Date(h.at).toISOString().slice(0, 10)})`).join(' · ')}</p>` : ''}</div>`,
        [{ id: 'c', label: '닫기', run: w => { keep(w, false); } }, { id: 'ok', label: sent ? '수정해서 다시 보내기' : '확인 후 보내기', kind: 'pri', run: w => fin(w) }], true);
      const tot = () => { const s = [...w.querySelectorAll('.g2-cr input:checked')].reduce((x, i) => x + +i.dataset.pts, 0); const t = w.querySelector('#g2Tot'); if (t) t.textContent = s; return s; };
      w.addEventListener('change', e => { if (e.target.closest('.g2-cr')) tot(); if (p.ai && p.ai.st !== 'edit') { p.ai.st = 'edit'; p.ai.at = Date.now(); } });
      w.addEventListener('input', () => { if (p.ai && p.ai.st !== 'edit') { p.ai.st = 'edit'; p.ai.at = Date.now(); } });
      w.addEventListener('click', async e => { const b = e.target.closest('[data-g2]'); if (!b) return; e.preventDefault(); e.stopPropagation();
        if (b.dataset.g2 === 'link') { const it = asgItem(c); if (it && S.rubrics && S.rubrics[0]) { it.rubric = S.rubrics[0].id; save(); toast(`「${S.rubrics[0].name}」 루브릭을 연결했습니다.`, 'ok'); open(el); } else { closeModal(); UI.asF = 'rubric'; render(); } return; }
        if (b.dataset.g2 === 'redo') { b.disabled = true; try { await draft(c, id); S.ai.usage = (S.ai.usage || 0) + 1; save(); open(el); } catch (x) { toast(errMsg(x), 'warn'); b.disabled = false; } } });
      function keep(w, ok) { const L = [...w.querySelectorAll('.g2-cr input:checked')]; if (!p.ai) { if (!L.length) return; p.ai = { crit: R.criteria.map(() => ({ li: 1, score: 0, why: '' })), total: 0, rb: R.id, fb: '', model: 'manual', at: Date.now(), st: 'edit' }; }
        L.forEach(x => { const k = +x.name.slice(1); if (p.ai.crit[k]) { p.ai.crit[k].li = +x.value; } }); p.ai.fin = tot(); p.ai.fb = (w.querySelector('[name=g2fb]') || {}).value || ''; const r = w.querySelector('[name=g2res]:checked'); if (r) p.ai.res = r.value; p.ai.ok = ok == null ? !!(w.querySelector('[name=g2ok]') || {}).checked : ok || !!(w.querySelector('[name=g2ok]') || {}).checked; save(); setTimeout(render); }
      function fin(w) { if ([...w.querySelectorAll('.g2-cr input:checked')].length < R.criteria.length) { toast('모든 기준의 수준을 고르세요(AI 초안으로 채울 수 있습니다).', 'warn'); return false; } const r = w.querySelector('[name=g2res]:checked'); if (!r) { toast('결과(통과 · 재제출 · 미통과)를 고르세요.', 'warn'); return false; }
        if (r.value === 'returned' && !String((w.querySelector('[name=g2fb]') || {}).value || '').trim()) { toast('재제출 요청에는 피드백이 필요합니다.', 'warn'); return false; }
        keep(w, true); const m = send(c, id); save(); setTimeout(render); toast(m, 'ok'); }
      return w; }
    { const base = ACT.grade; ACT.grade = (el, ...r) => on() ? open(el) : base(el, ...r); }
    { const base = ACT['g-ai']; ACT['g-ai'] = (el, ...r) => on() ? open(el) : base(el, ...r); }
    /* 대기 전체 초안 · 확인한 건 일괄 발송 */
    ACT['g2-all'] = async () => { if (window.PLAN && !PLAN.can('grade')) { toast(errMsg({ code: 'plan_feature' }), 'warn'); return; } const P = pend(); let n = 0, bad = 0; for (const { c, id } of P) { if (c.prog[id].ai && c.prog[id].ai.st !== 'sent') continue; try { await draft(c, id); n++; } catch (e) { bad++; } } S.ai.usage = (S.ai.usage || 0) + n; save(); render(); toast(`${n}건 AI 초안을 만들었습니다.${bad ? ` ${bad}건은 루브릭 연결 · 제출물 확인이 필요합니다.` : ''} 한 건씩 확인 후 보내세요.`, n ? 'ok' : 'warn'); };
    ACT['g2-send'] = () => { const P = S.classes.flatMap(c => Object.keys(c.prog || {}).filter(id => c.prog[id].ai && c.prog[id].ai.ok).map(id => ({ c, id }))).filter(x => S.me.role !== 'teacher' || pend().some(y => y.c === x.c) || x.c.teacher === S.me.name);
      if (!P.length) { toast('확인 표시한 초안이 없습니다. 채점 화면에서 「확인」을 체크하세요.', 'warn'); return; } P.forEach(({ c, id }) => send(c, id)); save(); render(); toast(`확인한 ${P.length}건을 보냈습니다.`, 'ok'); };
    ACT['g2-ok'] = el => { const c = C(el.dataset.c), p = c && c.prog[el.dataset.v]; if (!p || !p.ai) return; p.ai.ok = !p.ai.ok; save(); render(); };
    { const base = VIEWS.assess; VIEWS.assess = (...a) => { const h = base(...a); if (!on()) return h; try {
      const P = pend(); if (S.aipol.autoDraft !== false && !live()) P.forEach(({ c, id }) => { const p = c.prog[id]; if (!p.ai && rbOf(c) && readable(p.sub)) mock(c, id); });
      const D = P.map(({ c, id }) => ({ c, id, p: c.prog[id] })); const okN = S.classes.reduce((s, c) => s + Object.values(c.prog || {}).filter(p => p.ai && p.ai.ok).length, 0);
      const box = `<section class="card g2-box"><div class="g2-bh"><b>${icx('lock', 15)} ${(typeof aiMark === 'function' ? aiMark('grade') : '')} 확인 전에는 학습자에게 보이지 않습니다</b><span class="sp"></span><button class="btn sm ink" data-act="g2-all">${icx('spark', 14)} 대기 ${P.length}건 초안 만들기</button><button class="btn sm pri" data-act="g2-send" ${okN ? '' : 'disabled'}>확인한 ${okN}건 보내기</button></div>
        ${D.length ? `<ul class="g2-list">${D.slice(0, 30).map(({ c, id, p }) => `<li><label><input type="checkbox" data-act="g2-ok" data-c="${esc2(c.id)}" data-v="${esc2(id)}" ${p.ai && p.ai.ok ? 'checked' : ''} ${p.ai ? '' : 'disabled'} aria-label="확인"> ${mn(id)} · ${esc2(c.name)}</label><span class="g2-st s-${stOf(p)}">${STN[stOf(p)]}</span>${p.ai ? `<small>AI ${p.ai.total}점${p.ai.fin != null ? ` → ${p.ai.fin}점` : ''}</small>` : ''}<button class="btn sm ink" data-act="grade" data-c="${esc2(c.id)}" data-v="${esc2(id)}">채점</button></li>`).join('')}</ul>` : `<p class="g2-empty">채점할 제출물이 없습니다. <a href="#" data-act="as-done">지난 발송 내역</a></p>`}</section>`;
      const k = h.indexOf('<section class="kpis">'); return k < 0 ? box + h : h.slice(0, k) + box + h.slice(k); } catch (e) { console.error('grade2', e); return h; } }; }
    ACT['as-done'] = () => { UI.asF = 'done'; render(); };
  }

  /* ───────── 학습자: 확정 전 점수 · 피드백 숨김 + 도착 알림 ───────── */
  if (typeof VIEWS === 'undefined' && typeof LR !== 'undefined' && typeof viewCourse === 'function') {
    const siteOn = () => { try { const s = SITE(); return !!(s && s.aipol && s.aipol.on); } catch (e) { return false; } };
    const keyOf = m => `${m.st}|${m.score}|${String(m.fb || '').length}|${String(m.fb || '').slice(0, 20)}`;
    window.G2L = { hide(mine) { if (!mine || !mine.cls) return mine; Object.values(mine.cls).forEach(m => { if (m && !DONE.includes(m.st)) { if (m.fb) m.fb = ''; if (m.score != null) m.score = null; } }); return mine; } };
    const base = viewCourse; viewCourse = function (id, itemId) { // eslint-disable-line no-global-assign
      if (!siteOn() || !LR.me) return base.apply(this, arguments); try { G2L.hide(LR.mine); } catch (e) { }
      let h = base.apply(this, arguments); try { const m = ((LR.mine || {}).cls || {})[id]; const r = (LR.lp.cls || {})[id] || {};
        if (m && DONE.includes(m.st) && (m.fb || m.score != null) && r.fbSeen !== keyOf(m)) { const k = h.indexOf('class="imain"'); const at = k < 0 ? -1 : h.indexOf('>', k) + 1;
          if (at > 0) h = h.slice(0, at) + `<div class="g2l" role="status"><b>선생님 피드백이 도착했어요</b>${m.score != null ? `<span>${esc2(m.score)}점</span>` : ''}<button class="lbtn sm ghost" data-g2seen="${esc2(id)}">확인했어요</button></div>` + h.slice(at); } } catch (e) { console.error('grade2 learner', e); } return h; };
    document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-g2seen]'); if (!b) return; e.preventDefault(); const id = b.dataset.g2seen; const m = ((LR.mine || {}).cls || {})[id]; if (!m) return; const c = LR.lp.cls[id] = LR.lp.cls[id] || { items: {} }; c.fbSeen = keyOf(m); try { LR.api.save(); } catch (x) { } if (typeof lrender === 'function') lrender(); });
  }
})();
