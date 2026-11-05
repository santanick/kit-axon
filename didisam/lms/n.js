/* v30 학사 LMS 묶음 N — MOOC · 비학위(SFR-059 · 060 · 061 · 064 · 004)
   과정 검색(태그 · 옵션 · 자동완성) · 찜 · 북마크 · 마이페이지, 기수 · 수료 규칙(진도율 · 학습활동 · 점수 · 과락) · 수료증 양식 · 자동/수동 승인,
   정규 교과 → MOOC 전환, 교수자/운영자 권한 분리, 진단평가 기반 수준별 학습경로 추천 · 기초학력 진단. PG 결제 · 환불은 연동 지점(결제 대기 · 환불 요청).
   운영 모드: /api/lms/n/*, 데모 모드: S.lms.n + 같은 규칙의 브라우저 엔진(LW4는 lms/k.js). */
(function () {
  'use strict';
  const LW4 = window.LW4; if (!LW4) return;
  const LV = { basic: '기초', inter: '중급', adv: '심화' };
  const CST = { draft: ['작성 중', ''], pending: ['승인 요청', 'wait'], approved: ['공개', 'on'], rejected: ['반려', 'bad'], closed: ['종료', ''] };
  const EST = { pending: ['승인 대기', 'wait'], approved: ['수강 중', 'on'], rejected: ['반려', 'bad'], completed: ['수료', 'on'], failed: ['미수료', 'bad'], cancelled: ['취소', ''] };
  const PAY = { free: '무료', pending: '결제 대기(PG 연동 후)', paid: '결제 완료', refund_req: '환불 요청(PG 연동 후)' };

  /* ═════════ 데모 엔진(서버 lms_n_* 와 같은 규칙) ═════════ */
  const ens = () => { S.lms = S.lms || {}; const N = S.lms.n = S.lms.n || { courses: [], cohorts: [], enrolls: [], wish: [], diags: [], results: [] }; if (!N.seeded) { N.seeded = true; seed(N); } return N; };
  const getC = id => { const c = ens().courses.find(x => x.course_id === id); if (!c) LW4.err(404, '과정을 찾을 수 없습니다.'); return c; };
  const getH = id => { const h = ens().cohorts.find(x => x.cohort_id === id); if (!h) LW4.err(404, '기수를 찾을 수 없습니다.'); return h; };
  const own = (actor, c) => { if (actor.role === 'teacher' && c.owner_email !== actor.email) LW4.err(403, '담당 교수자만 다룰 수 있는 과정입니다.'); };
  const cout = c => { const N = ens(); const hs = N.cohorts.filter(h => h.course_id === c.course_id).map(h => h.cohort_id);
    return { ...c, n_cohort: hs.length, n_enroll: N.enrolls.filter(e => hs.includes(e.cohort_id) && ['approved', 'completed', 'failed'].includes(e.status)).length, n_wish: N.wish.filter(w => w.course_id === c.course_id && w.kind === 'wish').length }; };
  const cget = id => { const c = getC(id); return { ...cout(c), cohorts: ens().cohorts.filter(h => h.course_id === id).sort((a, b) => a.no - b.no).map(h => ({ ...h, n: ens().enrolls.filter(e => e.cohort_id === h.cohort_id && e.status !== 'rejected' && e.status !== 'cancelled').length })) }; };
  const eout = e => ({ ...e, unit_code: LW4.person(e.member_no).unit_code });
  const arr = v => [...new Set((Array.isArray(v) ? v : []).map(x => String(x).trim().slice(0, 30)).filter(Boolean))];
  const DEF_RULE = { min_progress: 80, min_activity: 0, pass_score: 60, fail_line: 40 };
  const DEF_CERT = { title: '수료증', body: '위 사람은 {과정} 과정({기수}기)을 성실히 이수하였으므로 이 증서를 수여합니다.', issuer: '' };
  const D = LW4.demo.n = {
    'GET search': (a, actor) => { const q = String(a.q || '').trim(); const all = ['1', 'true', 1, true].includes(a.all);
      let L = ens().courses.filter(c => (all ? (actor.role !== 'teacher' || c.owner_email === actor.email) : c.status === 'approved') && (!q || c.title.includes(q) || c.summary.includes(q) || c.tags.some(t => t.includes(q))) && (!a.tag || c.tags.includes(a.tag)) && (!a.level || c.level === a.level) && (!a.category || c.category === a.category) && (!['1', 'true', 1, true].includes(a.free) || c.price === 0) && (!['1', 'true', 1, true].includes(a.cert) || c.options.cert) && (!a.status || c.status === a.status)).map(cout);
      if (a.sort === 'popular') L.sort((x, y) => y.n_enroll - x.n_enroll); else if (a.sort === 'title') L.sort((x, y) => x.title.localeCompare(y.title)); else L.sort((x, y) => y.created_at.localeCompare(x.created_at));
      return { items: L, tags: [...new Set(ens().courses.filter(c => c.status === 'approved').flatMap(c => c.tags))].sort() }; },
    'GET suggest': a => { const q = String(a.q || '').trim(); if (!q) return { items: [] }; const A = ens().courses.filter(c => c.status === 'approved');
      return { items: [...new Set([...A.filter(c => c.title.includes(q)).map(c => c.title), ...A.flatMap(c => c.tags).filter(t => t.includes(q)).map(t => '#' + t)])].slice(0, 8) }; },
    'GET course': a => cget(a.course_id),
    'POST course/save': (a, actor) => { const t = String(a.title || '').trim().slice(0, 120); if (!t) LW4.err(400, '과정명을 입력하세요.'); const r = a.rule;
      if (r && [r.min_progress, r.pass_score, r.fail_line].some(v => !(+v >= 0 && +v <= 100)) || (r && !(+r.min_activity >= 0))) LW4.err(400, '수료 기준(진도율 · 점수 · 과락 0~100, 학습활동 0 이상)을 확인하세요.');
      const rule = r ? { min_progress: +r.min_progress, min_activity: +r.min_activity, pass_score: +r.pass_score, fail_line: +r.fail_line } : null; let c;
      const base = { title: t, summary: String(a.summary || ''), tags: arr(a.tags), category: a.category || '', level: a.level || 'basic', lang: a.lang || 'ko', options: a.options || {}, price: +a.price || 0, areas: arr(a.areas) };
      if (!a.course_id) { c = { course_id: LW4.uuid(), ...base, status: 'draft', reject_reason: '', owner_email: actor.role === 'teacher' ? actor.email : (a.owner_email || null), source: 'mooc', from_course_code: null, approval_mode: a.approval_mode === 'manual' ? 'manual' : 'auto', rule: rule || DEF_RULE, cert_tpl: a.cert_tpl || DEF_CERT, created_at: LW4.now() }; ens().courses.unshift(c); }
      else { c = getC(a.course_id); own(actor, c); if (actor.role === 'teacher' && !['draft', 'rejected'].includes(c.status)) LW4.err(409, '승인 요청 · 승인된 과정은 운영자만 고칠 수 있습니다.'); if (actor.role === 'teacher' && (a.cert_tpl || a.approval_mode)) LW4.err(403, '수료증 양식 · 수강 승인 방식은 운영자가 정합니다.');
        Object.assign(c, base, { rule: rule || c.rule, cert_tpl: a.cert_tpl || c.cert_tpl, approval_mode: a.approval_mode ? (a.approval_mode === 'manual' ? 'manual' : 'auto') : c.approval_mode }); }
      return cget(c.course_id); },
    'POST course/submit': (a, actor) => { const c = getC(a.course_id); own(actor, c); if (!['draft', 'rejected'].includes(c.status)) LW4.err(409, '작성 중 · 반려된 과정만 승인 요청할 수 있습니다.'); c.status = 'pending'; c.reject_reason = ''; return cout(c); },
    'POST course/decide': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const c = getC(a.course_id); if (c.status !== 'pending') LW4.err(409, '승인 요청된 과정만 승인 · 반려할 수 있습니다.'); if (!a.approve && !String(a.reason || '').trim()) LW4.err(400, '반려 사유를 입력하세요.'); c.status = a.approve ? 'approved' : 'rejected'; c.reject_reason = a.approve ? '' : a.reason; return cout(c); },
    'POST course/close': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const c = getC(a.course_id); c.status = 'closed'; return cout(c); },
    'POST convert': (a, actor) => { const src = (S.classes || []).find(c => String(c.id) === String(a.course_code)); if (!src) LW4.err(404, '정규 교과목을 찾을 수 없습니다.'); if (ens().courses.find(c => c.from_course_code === String(a.course_code) && c.status !== 'closed')) LW4.err(409, '이미 MOOC로 전환된 교과목입니다.');
      const c = { course_id: LW4.uuid(), title: src.name, summary: `정규 교과 ${src.name}에서 전환한 공개 강좌입니다.`, tags: ['정규 전환'], category: '', level: 'basic', lang: 'ko', options: {}, price: 0, areas: [], status: 'draft', reject_reason: '', owner_email: actor.role === 'teacher' ? actor.email : null, source: 'converted', from_course_code: String(a.course_code), approval_mode: 'auto', rule: DEF_RULE, cert_tpl: DEF_CERT, created_at: LW4.now() };
      ens().courses.unshift(c); return cget(c.course_id); },
    'POST cohort/save': (a, actor) => { const c = getC(a.course_id); own(actor, c); if (a.starts_on && a.ends_on && a.ends_on < a.starts_on) LW4.err(400, '기수 종료일이 시작일보다 빠릅니다.');
      if (a.cohort_id) Object.assign(getH(a.cohort_id), { starts_on: a.starts_on || null, ends_on: a.ends_on || null, capacity: +a.capacity || null, status: a.status === 'closed' ? 'closed' : 'open' });
      else ens().cohorts.push({ cohort_id: LW4.uuid(), course_id: c.course_id, no: Math.max(0, ...ens().cohorts.filter(h => h.course_id === c.course_id).map(h => h.no)) + 1, starts_on: a.starts_on || null, ends_on: a.ends_on || null, capacity: +a.capacity || null, status: 'open' });
      return cget(c.course_id); },
    'POST enroll': a => { const no = LW4.no(a.member_no); const h = getH(a.cohort_id); const c = getC(h.course_id); if (c.status !== 'approved') LW4.err(409, '승인된 과정만 신청할 수 있습니다.'); if (h.status !== 'open') LW4.err(409, '모집이 끝난 기수입니다.');
      const E = ens().enrolls; if (E.find(e => e.cohort_id === h.cohort_id && e.member_no === no && e.status !== 'cancelled')) LW4.err(409, '이미 신청한 기수입니다.');
      if (h.capacity && E.filter(e => e.cohort_id === h.cohort_id && ['pending', 'approved', 'completed', 'failed'].includes(e.status)).length >= h.capacity) LW4.err(409, '정원이 찼습니다.');
      const auto = c.price === 0 && c.approval_mode === 'auto'; const old = E.findIndex(e => e.cohort_id === h.cohort_id && e.member_no === no); if (old >= 0) E.splice(old, 1);
      const e = { cohort_id: h.cohort_id, member_no: no, status: auto ? 'approved' : 'pending', pay_status: c.price > 0 ? 'pending' : 'free', progress: 0, activity: 0, score: null, items: {}, reason: '', cert_no: null, applied_at: LW4.now(), completed_at: null }; E.push(e);
      return { ...eout(e), note: c.price > 0 ? 'PG 결제 연동 후 결제가 완료되면 수강이 확정됩니다(데모: 운영자 결제 확인).' : e.status === 'pending' ? '운영자 승인 후 수강할 수 있습니다.' : '수강이 확정되었습니다.' }; },
    'POST enroll/cancel': a => { const e = ens().enrolls.find(x => x.cohort_id === a.cohort_id && x.member_no === a.member_no && ['pending', 'approved'].includes(x.status)); if (!e) LW4.err(409, '취소할 수 있는 신청이 없습니다.'); e.status = 'cancelled'; if (e.pay_status === 'paid') e.pay_status = 'refund_req'; return { ...eout(e), note: e.pay_status === 'refund_req' ? '환불 요청이 PG 연동 대기열에 들어갔습니다.' : '' }; },
    'POST pay/confirm': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const e = ens().enrolls.find(x => x.cohort_id === a.cohort_id && x.member_no === a.member_no); if (!e || e.pay_status !== 'pending') LW4.err(409, '결제 대기 중인 신청이 아닙니다.'); const c = getC(getH(e.cohort_id).course_id); e.pay_status = 'paid'; if (c.approval_mode === 'auto' && e.status === 'pending') e.status = 'approved'; return eout(e); },
    'POST enroll/decide': (a, actor) => { LW4.need(actor, ['owner', 'sub']); let n = 0; (a.members || []).forEach(m => { const e = ens().enrolls.find(x => x.cohort_id === a.cohort_id && x.member_no === m && x.status === 'pending'); if (e && (!a.approve || ['free', 'paid'].includes(e.pay_status))) { e.status = a.approve ? 'approved' : 'rejected'; e.reason = a.approve ? '' : (a.reason || ''); n++; } }); return { ok: true, changed: n }; },
    'GET enrolls': (a, actor) => { const h = getH(a.cohort_id); own(actor, getC(h.course_id)); return { items: ens().enrolls.filter(e => e.cohort_id === h.cohort_id && (!a.status || e.status === a.status)).sort((x, y) => x.member_no.localeCompare(y.member_no)).map(eout) }; },
    'POST progress': (a, actor) => { const h = getH(a.cohort_id); own(actor, getC(h.course_id)); if (!(+a.progress >= 0 && +a.progress <= 100)) LW4.err(400, '진도율은 0~100입니다.'); const e = ens().enrolls.find(x => x.cohort_id === h.cohort_id && x.member_no === a.member_no && ['approved', 'failed'].includes(x.status)); if (!e) LW4.err(409, '수강 중인 학습자가 아닙니다.');
      Object.assign(e, { progress: +a.progress, activity: a.activity !== undefined ? +a.activity : e.activity, score: a.score !== undefined && a.score !== '' ? +a.score : e.score, items: a.items || e.items }); return eout(e); },
    'POST complete': (a, actor) => { LW4.need(actor, ['owner', 'sub']); const h = getH(a.cohort_id); const c = getC(h.course_id); let nc = 0, nf = 0;
      ens().enrolls.filter(e => e.cohort_id === h.cohort_id && ['approved', 'failed'].includes(e.status)).sort((x, y) => x.member_no.localeCompare(y.member_no)).forEach(e => { const R = c.rule; let why = '';
        if (e.progress < R.min_progress) why = '진도율 미달'; else if (e.activity < R.min_activity) why = '학습활동 미달'; else if ((e.score || 0) < R.pass_score) why = '점수 미달'; else if (Object.values(e.items || {}).some(v => +v < R.fail_line)) why = '과락'; else if (LW4.gate(e.member_no, 'completion', 'mooc', c.course_id).blocked) why = '설문 미참여';
        if (!why) { e.status = 'completed'; e.completed_at = LW4.now(); e.reason = ''; e.cert_no = `N-${new Date().getFullYear()}-${String(ens().enrolls.filter(x => x.cert_no).length + 1).padStart(5, '0')}`; nc++; } else { e.status = 'failed'; e.reason = why; nf++; } });
      return { ok: true, completed: nc, failed: nf, items: D['GET enrolls']({ cohort_id: h.cohort_id }, actor).items }; },
    'GET certificate': a => { const e = ens().enrolls.find(x => x.cohort_id === a.cohort_id && x.member_no === a.member_no); if (!e || e.status !== 'completed') LW4.err(409, '수료한 학습자만 수료증을 받을 수 있습니다.'); const h = getH(e.cohort_id); const c = getC(h.course_id);
      if (LW4.gate(e.member_no, 'certificate', 'mooc', c.course_id).blocked) LW4.err(409, '설문에 먼저 참여해야 수료증을 받을 수 있습니다.');
      const body = c.cert_tpl.body.replace('{과정}', c.title).replace('{기수}', h.no).replace('{학번}', e.member_no);
      return { filename: `수료증_${e.cert_no}.html`, mime: 'text/html; charset=utf-8', cert_no: e.cert_no, content: `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${esc(c.cert_tpl.title)}</title><body style="font-family:sans-serif;max-width:720px;margin:40px auto;text-align:center;border:6px double #333;padding:48px"><p style="text-align:left">제 ${e.cert_no} 호</p><h1 style="letter-spacing:12px">${esc(c.cert_tpl.title)}</h1><p>학번: ${esc(e.member_no)}</p><p>과정: ${esc(c.title)} (${h.no}기)</p><p style="margin:32px 0;line-height:1.8">${esc(body)}</p><p>${e.completed_at.slice(0, 10)}</p><p><b>${esc(c.cert_tpl.issuer || '총장')}</b></p></body></html>` }; },
    'POST wish': a => { const no = LW4.no(a.member_no); const c = getC(a.course_id); const k = a.kind || 'wish'; if (!['wish', 'bookmark'].includes(k)) LW4.err(400, '찜(wish) · 북마크(bookmark)만 됩니다.'); const W = ens().wish; const i = W.findIndex(w => w.member_no === no && w.course_id === c.course_id && w.kind === k);
      if (i >= 0) W.splice(i, 1); else W.push({ member_no: no, course_id: c.course_id, kind: k, at: LW4.now() }); return { ok: true, course_id: c.course_id, kind: k, on: i < 0 }; },
    'GET mypage': a => { const no = LW4.no(a.member_no); const N = ens(); const W = k => N.wish.filter(w => w.member_no === no && w.kind === k).map(w => cout(getC(w.course_id)));
      return { member_no: no, wish: W('wish'), bookmark: W('bookmark'), enrolls: N.enrolls.filter(e => e.member_no === no).map(e => { const h = getH(e.cohort_id); const c = getC(h.course_id); return { ...eout(e), title: c.title, course_id: c.course_id, no: h.no }; }),
        diag: N.results.filter(r => r.member_no === no).map(r => ({ ...r, title: (N.diags.find(d => d.test_id === r.test_id) || {}).title })) }; },
    'POST diag/save': (a, actor) => { LW4.need(actor, ['owner', 'sub']); if (!String(a.title || '').trim()) LW4.err(400, '진단평가 이름을 입력하세요.'); const items = a.items || []; if (!items.length || items.length > 100) LW4.err(400, '문항을 1~100개 입력하세요.');
      items.forEach((it, i) => { if (!it.q || !Array.isArray(it.options) || it.options.length < 2 || !(it.answer >= 0 && it.answer < it.options.length) || !it.area) LW4.err(400, `${i + 1}번 문항(문제 · 보기 2개 이상 · 정답 · 영역)을 확인하세요.`); });
      const d = { test_id: a.test_id || LW4.uuid(), title: a.title, kind: a.kind === 'basic' ? 'basic' : 'level', items }; const N = ens(); N.diags = N.diags.filter(x => x.test_id !== d.test_id).concat([d]); return { test_id: d.test_id, title: d.title, n: items.length }; },
    'GET diags': () => ({ items: ens().diags.map(d => ({ test_id: d.test_id, title: d.title, kind: d.kind, n: d.items.length, questions: d.items.map(({ q, options, area }) => ({ q, options, area })), taken: ens().results.filter(r => r.test_id === d.test_id).length })) }),
    'POST diag/take': (a, actor) => { const no = LW4.no(a.member_no); const d = ens().diags.find(x => x.test_id === a.test_id); if (!d) LW4.err(404, '진단평가를 찾을 수 없습니다.'); const ans = a.answers || []; if (ans.length !== d.items.length || ans.some(x => x === null || x === undefined)) LW4.err(400, '모든 문항에 답하세요.');
      const ok = d.items.map((it, i) => +ans[i] === it.answer); const score = Math.round(100 * ok.filter(Boolean).length / ok.length); const by_area = {};
      [...new Set(d.items.map(i => i.area))].forEach(ar => { const idx = d.items.map((it, i) => it.area === ar ? i : -1).filter(i => i >= 0); by_area[ar] = Math.round(100 * idx.filter(i => ok[i]).length / idx.length); });
      const level = score >= 80 ? 'adv' : score >= 50 ? 'inter' : 'basic'; const N = ens(); N.results = N.results.filter(r => !(r.test_id === d.test_id && r.member_no === no)).concat([{ test_id: d.test_id, member_no: no, score, by_area, level, at: LW4.now() }]);
      return { test_id: d.test_id, member_no: no, score, by_area, level, basic_support: d.kind === 'basic' && score < 50, path: D['GET recommend']({ member_no: no }).path }; },
    'GET recommend': a => { const no = LW4.no(a.member_no); const r = ens().results.filter(x => x.member_no === no).sort((x, y) => y.at.localeCompare(x.at))[0];
      if (!r) return { member_no: no, level: null, weak: [], path: [], message: '진단평가를 먼저 응시하세요.' };
      const weak = Object.entries(r.by_area).filter(([, v]) => v < 60).sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0])).map(([k]) => k);
      const okLv = { basic: ['basic', 'inter'], inter: ['inter', 'adv'], adv: ['adv'] }[r.level]; const LN = { basic: 1, inter: 2, adv: 3 }; const done = new Set(ens().enrolls.filter(e => e.member_no === no && e.status === 'completed').map(e => getH(e.cohort_id).course_id));
      const L = ens().courses.filter(c => c.status === 'approved' && !done.has(c.course_id) && (c.areas.some(x => weak.includes(x)) || okLv.includes(c.level))).map(c => { const hit = c.areas.filter(x => weak.includes(x)); return { course_id: c.course_id, title: c.title, level: c.level, w: hit.length ? 0 : 1, lvn: LN[c.level], why: hit.length ? '약한 영역 보완: ' + hit.join(', ') : '수준 맞춤 다음 단계' }; })
        .sort((x, y) => x.w - y.w || x.lvn - y.lvn || x.title.localeCompare(y.title)).slice(0, 6).map((x, i) => ({ step: i + 1, course_id: x.course_id, title: x.title, level: x.level, why: x.why }));
      return { member_no: no, level: r.level, score: r.score, weak, message: '', path: L }; }
  };
  function seed(N) {
    const mk = (title, tags, level, areas, extra = {}) => ({ course_id: LW4.uuid(), title, summary: `${title} — 누구나 들을 수 있는 공개 강좌입니다.`, tags, category: extra.category || '교양', level, lang: 'ko', options: { cert: true, self_paced: true }, price: extra.price || 0, areas, status: extra.status || 'approved', reject_reason: '', owner_email: extra.owner || 'prof@demo', source: 'mooc', from_course_code: null, approval_mode: extra.manual ? 'manual' : 'auto', rule: { ...DEF_RULE }, cert_tpl: { ...DEF_CERT }, created_at: LW4.now() });
    const C = [mk('파이썬으로 시작하는 프로그래밍', ['파이썬', '코딩', 'AI'], 'basic', ['프로그래밍'], { category: 'IT' }), mk('데이터 분석 실무', ['데이터', '통계'], 'inter', ['통계'], { category: 'IT', price: 30000 }), mk('생성형 AI 활용 심화', ['AI', '생성형'], 'adv', ['프로그래밍', '통계'], { category: 'IT', manual: true }),
      mk('대학 수학 기초', ['수학', '기초학력'], 'basic', ['수리'], { category: '기초학력' }), mk('글쓰기와 의사소통', ['글쓰기', '기초학력'], 'basic', ['국어'], { category: '기초학력' }), mk('창업 입문', ['창업'], 'inter', [], { status: 'pending' })];
    N.courses.push(...C);
    C.slice(0, 5).forEach(c => N.cohorts.push({ cohort_id: LW4.uuid(), course_id: c.course_id, no: 1, starts_on: '2026-11-02', ends_on: '2026-12-18', capacity: 30, status: 'open' }));
    const h = N.cohorts[0].cohort_id; [['20261001', 92, 4, 85], ['20261002', 60, 2, 70], ['20261003', 88, 3, 55]].forEach(([no, p, ac, sc]) => N.enrolls.push({ cohort_id: h, member_no: no, status: 'approved', pay_status: 'free', progress: p, activity: ac, score: sc, items: { 중간: sc, 기말: sc }, reason: '', cert_no: null, applied_at: LW4.now(), completed_at: null }));
    N.diags.push({ test_id: LW4.uuid(), title: '신입생 기초학력 진단', kind: 'basic', items: [{ q: '2x + 3 = 7 일 때 x는?', options: ['1', '2', '3'], answer: 1, area: '수리' }, { q: '다음 중 맞춤법이 옳은 것은?', options: ['되요', '돼요'], answer: 1, area: '국어' }, { q: 'print("a")의 결과는?', options: ['a 출력', '오류'], answer: 0, area: '프로그래밍' }, { q: '평균을 구하는 방법은?', options: ['합 ÷ 개수', '최댓값 - 최솟값'], answer: 0, area: '통계' }] });
  }

  /* ═════════ 화면 ═════════ */
  LW4.addMenu('lmsn', { label: 'MOOC · 비학위', ws: 'learn', only: 'univ' });
  const NS = () => (UI.lmsn = UI.lmsn || { me: '20261005', res: null, all: null, cur: null, coh: null, enr: null, my: null, diags: null, rec: null, take: null, q: '', sug: [] });
  const isOp = () => S.me.role !== 'teacher';
  const load = async () => { const U = NS(); const [r, all, dg] = await Promise.all([LW4.run('n', 'GET', 'search', { q: U.q, tag: U.tag || '', level: U.lv || '', free: U.free ? 1 : '', sort: U.sort || '' }), LW4.run('n', 'GET', 'search', { all: 1, sort: 'title' }), LW4.run('n', 'GET', 'diags', {})]);
    U.res = r || { items: [], tags: [] }; U.all = all ? all.items : []; U.diags = dg ? dg.items : []; render(); };
  const card = (c, U) => `<div class="lw-card"><div class="lw-cov">${esc(c.category || 'MOOC')}</div><div>${LW4.st(LV[c.level])} ${c.price ? `<span class="lw-pill">${c.price.toLocaleString()}원</span>` : '<span class="lw-pill">무료</span>'}${c.options.cert ? '<span class="lw-pill">수료증</span>' : ''}</div>
    <h4>${esc(c.title)}</h4><small>${esc(c.summary).slice(0, 90)}</small><div>${c.tags.map(t => `<button class="lw-pill" data-act="lmsn-tag" data-v="${esc(t)}">#${esc(t)}</button>`).join('')}</div><small>수강 ${c.n_enroll}명 · 찜 ${c.n_wish}</small>
    <div class="lw-acts"><button class="btn sm pri" data-act="lmsn-open" data-id="${esc(c.course_id)}">기수 보기 · 신청</button><button class="btn sm" data-act="lmsn-wish" data-id="${esc(c.course_id)}" data-k="wish">찜</button><button class="btn sm" data-act="lmsn-wish" data-id="${esc(c.course_id)}" data-k="bookmark">북마크</button></div></div>`;

  VIEWS.lmsn = () => {
    const U = NS(); if (U.res === null) { U.res = { items: [], tags: [] }; U.all = []; U.diags = []; setTimeout(load); }
    const tb = UI.lmsnT || 'find';
    const top = head('MOOC · 비학위', '공개 강좌를 검색 · 찜하고 기수별로 운영합니다. 수료는 진도율 · 학습활동 · 점수 · 과락 기준으로 판정하고 수료증을 발급합니다. 교수자는 자기 과정의 내용 · 진도를, 운영자는 승인 · 수료 · 수료증을 맡습니다.',
      `<button class="btn pri" data-act="lmsn-edit">새 과정</button>`) +
      tabs('lmsnT', [['find', '과정 찾기'], ['admin', '과정 관리'], ['cohort', '기수 · 수강 · 수료'], ['diag', '진단 · 학습경로'], ['my', '마이페이지']], tb);
    let b = '';
    const who = `<label class="lw-muted" style="font-size:13px">학생 화면 학번 <select data-chg="lmsn-me" aria-label="학번">${LW4.roster.filter(p => p.kind === 'student').map(p => `<option ${U.me === p.member_no ? 'selected' : ''}>${p.member_no}</option>`).join('')}</select></label>`;
    if (tb === 'find') {
      b = `<div class="lw-bar"><input type="search" id="lmsnQ" list="lmsnSug" placeholder="과정명 · 태그 검색(자동완성)" value="${esc(U.q)}" data-inp="lmsn-sug" aria-label="과정 검색"><datalist id="lmsnSug">${U.sug.map(s => `<option value="${esc(s.replace(/^#/, ''))}">${esc(s)}</option>`).join('')}</datalist>
        <button class="btn" data-act="lmsn-find">검색</button><select data-chg="lmsn-f" data-k="lv" aria-label="수준"><option value="">모든 수준</option>${Object.entries(LV).map(([k, v]) => `<option value="${k}" ${U.lv === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select data-chg="lmsn-f" data-k="sort" aria-label="정렬"><option value="">최신순</option><option value="popular" ${U.sort === 'popular' ? 'selected' : ''}>인기순</option><option value="title" ${U.sort === 'title' ? 'selected' : ''}>이름순</option></select>
        <label class="lw-ck"><input type="checkbox" data-chg="lmsn-f" data-k="free" ${U.free ? 'checked' : ''}> 무료만</label>${U.tag ? `<button class="btn sm" data-act="lmsn-tag" data-v="">#${esc(U.tag)} ✕</button>` : ''}${who}</div>
        <div>${(U.res.tags || []).map(t => `<button class="lw-pill" data-act="lmsn-tag" data-v="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
        <div class="lw-grid" style="margin-top:10px">${U.res.items.map(c => card(c, U)).join('') || '<div class="empty">조건에 맞는 과정이 없습니다.</div>'}</div>` + (U.cur ? detail(U) : '');
    } else if (tb === 'admin') {
      b = `<div class="lw-bar"><button class="btn" data-act="lmsn-convert">정규 교과 → MOOC 전환</button><small class="lw-muted">${isOp() ? '운영자: 승인 · 반려 · 종료, 수료증 양식 · 수강 승인 방식' : '교수자: 내 과정 작성 · 승인 요청 · 기수 · 진도'}</small></div>` +
        table(['과정', '수준', '상태', '담당', '수강', ''], U.all.map(c => [esc(c.title) + (c.source === 'converted' ? ' <span class="lw-pill">정규 전환</span>' : '') + (c.reject_reason ? `<br><small class="lw-muted">반려: ${esc(c.reject_reason)}</small>` : ''), LV[c.level], LW4.st(CST[c.status][0], CST[c.status][1]), esc(c.owner_email || '-'), c.n_enroll + '명',
          `<button class="btn sm" data-act="lmsn-edit" data-id="${esc(c.course_id)}">편집</button>${['draft', 'rejected'].includes(c.status) ? ` <button class="btn sm" data-act="lmsn-cst" data-op="submit" data-id="${esc(c.course_id)}">승인 요청</button>` : ''}${isOp() && c.status === 'pending' ? ` <button class="btn sm pri" data-act="lmsn-dec" data-id="${esc(c.course_id)}" data-y="1">승인</button> <button class="btn sm red" data-act="lmsn-dec" data-id="${esc(c.course_id)}">반려</button>` : ''}${isOp() && c.status === 'approved' ? ` <button class="btn sm" data-act="lmsn-cst" data-op="close" data-id="${esc(c.course_id)}">종료</button>` : ''} <button class="btn sm" data-act="lmsn-coh" data-id="${esc(c.course_id)}">기수</button>`]), '과정이 없습니다.');
    } else if (tb === 'cohort') b = cohortView(U);
    else if (tb === 'diag') b = diagView(U, who);
    else if (tb === 'my') b = myView(U, who);
    return top + b;
  };
  function detail(U) { const c = U.cur; return `<div class="card" id="lmsnDetail"><div class="ch"><b>${esc(c.title)}</b><small>${esc(LV[c.level])} · ${c.price ? c.price.toLocaleString() + '원(PG 연동 후 결제)' : '무료'} · ${c.approval_mode === 'manual' ? '운영자 승인' : '자동 승인'}</small></div><p>${esc(c.summary)}</p>
    <p class="lw-note">수료 기준: 진도율 ${c.rule.min_progress}% 이상 · 학습활동 ${c.rule.min_activity}회 이상 · 점수 ${c.rule.pass_score}점 이상 · 평가 항목 ${c.rule.fail_line}점 미만 과락</p>
    ${table(['기수', '기간', '정원', '신청', ''], c.cohorts.map(h => [h.no + '기', `${h.starts_on || '-'} ~ ${h.ends_on || '-'}`, h.capacity ? h.capacity + '명' : '제한 없음', h.n + '명', h.status === 'open' ? `<button class="btn sm pri" data-act="lmsn-enroll" data-id="${esc(h.cohort_id)}">${esc(U.me)} 신청</button>` : '모집 마감']), '열린 기수가 없습니다.')}</div>`; }
  function cohortView(U) {
    const c = U.coh; const pick = `<div class="lw-bar"><select data-chg="lmsn-cohc" aria-label="과정 선택"><option value="">과정을 고르세요</option>${U.all.map(x => `<option value="${esc(x.course_id)}" ${c && c.course_id === x.course_id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>${c ? `<button class="btn sm" data-act="lmsn-hnew">기수 추가</button>` : ''}</div>`;
    if (!c) return pick + '<div class="empty">과정을 고르면 기수 · 수강생 · 수료 처리를 합니다.</div>';
    const hsel = U.hid || (c.cohorts[0] && c.cohorts[0].cohort_id);
    return pick + `<div class="lw-bar">${c.cohorts.map(h => `<button class="btn sm ${h.cohort_id === hsel ? 'pri' : ''}" data-act="lmsn-h" data-id="${esc(h.cohort_id)}">${h.no}기 (${h.n}명)</button>`).join('') || '<small class="lw-muted">기수가 없습니다.</small>'}</div>` +
      (hsel ? `<div class="lw-bar">${isOp() ? `<button class="btn pri" data-act="lmsn-complete" data-id="${esc(hsel)}">수료 판정</button><button class="btn" data-act="lmsn-dec-e" data-id="${esc(hsel)}" data-y="1">대기자 일괄 승인</button>` : ''}<small class="lw-muted">수료 판정은 운영자 권한 · 진도 입력은 교수자 권한</small></div>` +
        table(['학번', '학과', '상태', '결제', '진도', '활동', '점수', '과락 항목', ''], (U.enr || []).map(e => [esc(e.member_no), esc(LW4.UNITS[e.unit_code] || e.unit_code), LW4.st(EST[e.status][0], EST[e.status][1]) + (e.reason ? ` <small>${esc(e.reason)}</small>` : ''), esc(PAY[e.pay_status]),
          `<input type="number" min="0" max="100" value="${e.progress}" style="width:64px" data-pe="${esc(e.member_no)}" data-k="progress" aria-label="진도율">`, `<input type="number" min="0" value="${e.activity}" style="width:56px" data-pe="${esc(e.member_no)}" data-k="activity" aria-label="학습활동">`, `<input type="number" min="0" max="100" value="${e.score ?? ''}" style="width:60px" data-pe="${esc(e.member_no)}" data-k="score" aria-label="점수">`,
          esc(Object.entries(e.items || {}).map(([k, v]) => `${k} ${v}`).join(', ')),
          `${['approved', 'failed'].includes(e.status) ? `<button class="btn sm" data-act="lmsn-prog" data-h="${esc(hsel)}" data-no="${esc(e.member_no)}">진도 저장</button>` : ''}${isOp() && e.pay_status === 'pending' ? ` <button class="btn sm" data-act="lmsn-pay" data-h="${esc(hsel)}" data-no="${esc(e.member_no)}">결제 확인</button>` : ''}${e.status === 'completed' ? ` <button class="btn sm" data-act="lmsn-cert" data-h="${esc(hsel)}" data-no="${esc(e.member_no)}">수료증</button>` : ''}`]), '수강생이 없습니다.') : '');
  }
  function diagView(U, who) {
    const d = U.take; const r = U.rec;
    return `<div class="lw-bar">${who}${isOp() ? '<button class="btn" data-act="lmsn-dnew">진단평가 만들기</button>' : ''}<button class="btn" data-act="lmsn-rec">학습경로 추천 보기</button></div>
      <div class="lw-grid">${(U.diags || []).map(x => `<div class="lw-card"><h4>${esc(x.title)}</h4><small>${x.kind === 'basic' ? '기초학력 진단' : '수준 진단'} · ${x.n}문항 · 응시 ${x.taken}명</small><div class="lw-acts"><button class="btn sm pri" data-act="lmsn-take" data-id="${esc(x.test_id)}">${esc(U.me)}로 응시</button></div></div>`).join('') || '<div class="empty">진단평가가 없습니다.</div>'}</div>
      ${d ? `<div class="card lw-form" id="lmsnTake"><div class="ch"><b>${esc(d.title)}</b></div>${d.questions.map((q, i) => `<div class="lw-q"><b>${i + 1}. ${esc(q.q)}</b> <span class="lw-pill">${esc(q.area)}</span><br>${q.options.map((o, j) => `<label class="lw-ck"><input type="radio" name="d${i}" value="${j}"> ${esc(o)}</label>`).join('')}</div>`).join('')}<button class="btn pri" data-act="lmsn-submit" data-id="${esc(d.test_id)}">제출</button></div>` : ''}
      ${r ? `<div class="card"><div class="ch"><b>${esc(r.member_no)} 맞춤 학습경로</b><small>${r.level ? `진단 수준 ${LV[r.level]} · ${r.score}점${r.weak.length ? ' · 약한 영역 ' + r.weak.join(', ') : ''}` : esc(r.message)}</small></div>${r.basic_support ? '<p class="lw-note">기초학력 보완 대상입니다. 교수학습지원센터 튜터링 연계를 안내합니다.</p>' : ''}
        ${r.path.map(p => `<div class="lw-hbar"><span>${p.step}단계 · ${LV[p.level]}</span><span style="background:none">${esc(p.title)} <small class="lw-muted">${esc(p.why)}</small></span><button class="btn sm" data-act="lmsn-open" data-id="${esc(p.course_id)}">보기</button></div>`).join('') || (r.level ? '<small class="lw-muted">추천할 과정이 없습니다.</small>' : '')}</div>` : ''}`;
  }
  function myView(U, who) {
    const m = U.my; if (!m) { setTimeout(() => ACT['lmsn-my']()); return `<div class="lw-bar">${who}</div>`; }
    const mini = L => L.map(c => `<span class="lw-pill">${esc(c.title)}</span>`).join('') || '<small class="lw-muted">없습니다.</small>';
    return `<div class="lw-bar">${who}</div><div class="lw-two"><div class="card"><div class="ch"><b>찜한 과정</b></div>${mini(m.wish)}</div><div class="card"><div class="ch"><b>북마크</b></div>${mini(m.bookmark)}</div></div>` +
      table(['과정', '기수', '상태', '결제', '진도', ''], m.enrolls.map(e => [esc(e.title), e.no + '기', LW4.st(EST[e.status][0], EST[e.status][1]), esc(PAY[e.pay_status]), e.progress + '%', `${e.status === 'completed' ? `<button class="btn sm" data-act="lmsn-cert" data-h="${esc(e.cohort_id)}" data-no="${esc(e.member_no)}">수료증</button>` : ''}${['pending', 'approved'].includes(e.status) ? ` <button class="btn sm" data-act="lmsn-cancel" data-h="${esc(e.cohort_id)}">취소</button>` : ''}`]), '수강 신청 내역이 없습니다.') +
      `<div class="card"><div class="ch"><b>진단 결과</b></div>${m.diag.map(d => `<p>${esc(d.title)} · ${d.score}점 · ${LV[d.level]} — ${Object.entries(d.by_area).map(([k, v]) => `${esc(k)} ${v}%`).join(', ')}</p>`).join('') || '<small class="lw-muted">없습니다.</small>'}</div>`;
  }
  function editor(c) {
    const op = isOp(); c = c || { title: '', summary: '', tags: [], category: '', level: 'basic', price: 0, areas: [], options: { cert: true }, approval_mode: 'auto', rule: { min_progress: 80, min_activity: 0, pass_score: 60, fail_line: 40 }, cert_tpl: { title: '수료증', body: '위 사람은 {과정} 과정({기수}기)을 성실히 이수하였으므로 이 증서를 수여합니다.', issuer: '' } };
    modal(c.course_id ? '과정 편집' : '새 과정', `<div class="lw-form"><label>과정명<input name="title" maxlength="120" value="${esc(c.title)}"></label><label>소개<textarea name="summary" rows="2">${esc(c.summary)}</textarea></label>
      <div class="lw-two"><label>태그(쉼표)<input name="tags" value="${esc(c.tags.join(','))}"></label><label>분류<input name="category" value="${esc(c.category)}"></label></div>
      <div class="lw-two"><label>수준<select name="level">${Object.entries(LV).map(([k, v]) => `<option value="${k}" ${c.level === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>진단 영역(쉼표 · 학습경로 추천)<input name="areas" value="${esc(c.areas.join(','))}"></label></div>
      <div class="lw-two"><label>수강료(원, 0 = 무료 · 유료는 PG 연동 후 결제)<input type="number" min="0" name="price" value="${c.price}"></label><label class="lw-ck"><input type="checkbox" name="cert" ${c.options.cert ? 'checked' : ''}> 수료증 발급 과정</label></div>
      <b>수료 기준</b><div class="lw-two"><label>진도율(%)<input type="number" name="mp" value="${c.rule.min_progress}"></label><label>학습활동(회)<input type="number" name="ma" value="${c.rule.min_activity}"></label><label>합격 점수<input type="number" name="ps" value="${c.rule.pass_score}"></label><label>과락선(항목별)<input type="number" name="fl" value="${c.rule.fail_line}"></label></div>
      ${op ? `<b>운영자 설정</b><div class="lw-two"><label>수강 승인<select name="am"><option value="auto">자동 승인</option><option value="manual" ${c.approval_mode === 'manual' ? 'selected' : ''}>운영자 승인</option></select></label><label>담당 교수자(이메일)<input name="owner" value="${esc(c.owner_email || '')}"></label></div>
        <label>수료증 제목<input name="ct" value="${esc(c.cert_tpl.title)}"></label><label>수료증 문구({과정} {기수} {학번})<textarea name="cb" rows="2">${esc(c.cert_tpl.body)}</textarea></label><label>발급자<input name="ci" value="${esc(c.cert_tpl.issuer)}" placeholder="예: ○○대학교 총장"></label>` : '<p class="lw-note">수료증 양식 · 수강 승인 방식은 운영자가 정합니다.</p>'}</div>`,
      [{ id: 'c', label: '취소' }, { id: 's', label: '저장', kind: 'pri', run: w => { const csv = v => v.split(',').map(x => x.trim()).filter(Boolean);
        const a = { course_id: c.course_id, title: fv(w, 'title'), summary: fv(w, 'summary'), tags: csv(fv(w, 'tags')), category: fv(w, 'category'), level: fv(w, 'level'), areas: csv(fv(w, 'areas')), price: +fv(w, 'price') || 0, options: { ...c.options, cert: fv(w, 'cert') },
          rule: { min_progress: +fv(w, 'mp'), min_activity: +fv(w, 'ma'), pass_score: +fv(w, 'ps'), fail_line: +fv(w, 'fl') } };
        if (op) Object.assign(a, { approval_mode: fv(w, 'am'), owner_email: fv(w, 'owner'), cert_tpl: { title: fv(w, 'ct') || '수료증', body: fv(w, 'cb'), issuer: fv(w, 'ci') } });
        LW4.run('n', 'POST', 'course/save', a, '과정을 저장했습니다.').then(r => { if (r) { closeModal(); load(); } }); return false; } }], true);
  }
  const loadEnr = async () => { const U = NS(); const hid = U.hid || (U.coh && U.coh.cohorts[0] && U.coh.cohorts[0].cohort_id); U.enr = hid ? ((await LW4.run('n', 'GET', 'enrolls', { cohort_id: hid })) || { items: [] }).items : []; render(); };
  const loadCoh = async id => { const U = NS(); U.coh = id ? await LW4.run('n', 'GET', 'course', { course_id: id }) : null; if (U.coh && !(U.coh.cohorts || []).some(h => h.cohort_id === U.hid)) U.hid = null; await loadEnr(); };

  ACT['lmsn-sug'] = async el => { const U = NS(); U.q = el.value; const r = await LW4.call('n', 'GET', 'suggest', { q: el.value }).catch(() => null); const dl = $('#lmsnSug'); if (r && dl) { U.sug = r.items; dl.innerHTML = r.items.map(s => `<option value="${esc(s.replace(/^#/, ''))}">${esc(s)}</option>`).join(''); } };
  document.addEventListener('input', e => { const el = e.target.closest && e.target.closest('[data-inp="lmsn-sug"]'); if (el) ACT['lmsn-sug'](el); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'lmsnQ') { e.preventDefault(); ACT['lmsn-find'](); } });
  ACT['lmsn-find'] = () => { const U = NS(); U.q = ($('#lmsnQ') || {}).value || ''; load(); };
  ACT['lmsn-f'] = el => { NS()[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; load(); };
  ACT['lmsn-tag'] = el => { NS().tag = el.dataset.v; UI.lmsnT = 'find'; load(); };
  ACT['lmsn-me'] = el => { const U = NS(); U.me = el.value; U.my = null; U.rec = null; render(); };
  ACT['lmsn-open'] = async el => { const U = NS(); const r = await LW4.run('n', 'GET', 'course', { course_id: el.dataset.id }); if (r) { U.cur = r; UI.lmsnT = 'find'; render(); setTimeout(() => { const d = $('#lmsnDetail'); d && d.scrollIntoView({ block: 'nearest' }); }); } };
  ACT['lmsn-wish'] = async el => { const r = await LW4.run('n', 'POST', 'wish', { member_no: NS().me, course_id: el.dataset.id, kind: el.dataset.k }); if (r) { toast(`${r.kind === 'wish' ? '찜' : '북마크'}${r.on ? '했습니다' : '을 해제했습니다'}.`, 'ok'); NS().my = null; load(); } };
  ACT['lmsn-enroll'] = async el => { const U = NS(); const r = await LW4.run('n', 'POST', 'enroll', { cohort_id: el.dataset.id, member_no: U.me }); if (r) { toast(r.note, 'ok'); U.cur = await LW4.call('n', 'GET', 'course', { course_id: U.cur.course_id }); U.my = null; render(); } };
  ACT['lmsn-edit'] = async el => { const id = el.dataset && el.dataset.id; editor(id ? await LW4.run('n', 'GET', 'course', { course_id: id }) : null); };
  ACT['lmsn-cst'] = async el => { if (await LW4.run('n', 'POST', 'course/' + el.dataset.op, { course_id: el.dataset.id }, el.dataset.op === 'submit' ? '승인을 요청했습니다.' : '과정을 종료했습니다.')) load(); };
  ACT['lmsn-dec'] = el => { if (el.dataset.y) return LW4.run('n', 'POST', 'course/decide', { course_id: el.dataset.id, approve: true }, '과정을 승인했습니다. 검색에 공개됩니다.').then(r => r && load());
    modal('과정 반려', '<div class="lw-form"><label>반려 사유<textarea name="r" rows="2"></textarea></label></div>', [{ id: 'c', label: '취소' }, { id: 'o', label: '반려', kind: 'red', run: w => { LW4.run('n', 'POST', 'course/decide', { course_id: el.dataset.id, approve: false, reason: fv(w, 'r') }, '반려했습니다.').then(r => r && load()); } }]); };
  ACT['lmsn-convert'] = () => { const live = LW4.live(); modal('정규 교과 → MOOC 전환', `<div class="lw-form"><label>정규 교과목${live ? '<input name="cc" placeholder="학수번호(예: CSE2001)">' : `<select name="cc">${(S.classes || []).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>`}</label><p class="lw-note">강의 정보로 MOOC 과정(작성 중)을 만들고, 승인 요청 → 운영자 승인 뒤 공개됩니다.</p></div>`,
    [{ id: 'c', label: '취소' }, { id: 'o', label: '전환', kind: 'pri', run: w => { LW4.run('n', 'POST', 'convert', { course_code: fv(w, 'cc') }, 'MOOC 과정(작성 중)으로 전환했습니다.').then(r => r && load()); } }]); };
  ACT['lmsn-coh'] = el => { UI.lmsnT = 'cohort'; NS().hid = null; loadCoh(el.dataset.id); };
  ACT['lmsn-cohc'] = el => { NS().hid = null; loadCoh(el.value); };
  ACT['lmsn-h'] = el => { NS().hid = el.dataset.id; loadEnr(); };
  ACT['lmsn-hnew'] = () => modal('기수 추가', '<div class="lw-form lw-two"><label>시작일<input type="date" name="s"></label><label>종료일<input type="date" name="e"></label><label>정원(0 = 제한 없음)<input type="number" name="c" value="30" min="0"></label></div>',
    [{ id: 'c', label: '취소' }, { id: 'o', label: '추가', kind: 'pri', run: w => { const U = NS(); LW4.run('n', 'POST', 'cohort/save', { course_id: U.coh.course_id, starts_on: fv(w, 's'), ends_on: fv(w, 'e'), capacity: +fv(w, 'c') || 0 }, '기수를 추가했습니다.').then(r => { if (r) { U.coh = r; render(); } }); } }]);
  ACT['lmsn-prog'] = async el => { const g = k => { const x = document.querySelector(`[data-pe="${el.dataset.no}"][data-k="${k}"]`); return x ? x.value : undefined; };
    if (await LW4.run('n', 'POST', 'progress', { cohort_id: el.dataset.h, member_no: el.dataset.no, progress: +g('progress'), activity: +g('activity'), score: g('score') === '' ? undefined : +g('score') }, '진도를 저장했습니다.')) loadEnr(); };
  ACT['lmsn-pay'] = async el => { if (await LW4.run('n', 'POST', 'pay/confirm', { cohort_id: el.dataset.h, member_no: el.dataset.no }, '결제 완료로 표시했습니다(PG 연동 후 자동).')) loadEnr(); };
  ACT['lmsn-dec-e'] = async el => { const ids = (NS().enr || []).filter(e => e.status === 'pending').map(e => e.member_no); const r = await LW4.run('n', 'POST', 'enroll/decide', { cohort_id: el.dataset.id, members: ids, approve: true }); if (r) { toast(`${r.changed}명을 승인했습니다(결제 대기자는 제외).`, 'ok'); loadEnr(); } };
  ACT['lmsn-complete'] = async el => { const r = await LW4.run('n', 'POST', 'complete', { cohort_id: el.dataset.id }); if (r) { toast(`수료 ${r.completed}명 · 미수료 ${r.failed}명`, 'ok'); NS().enr = r.items; render(); } };
  ACT['lmsn-cert'] = async el => { const r = await LW4.run('n', 'GET', 'certificate', { cohort_id: el.dataset.h, member_no: el.dataset.no }); if (r) LW4.printHtml(r.filename, r.content); };
  ACT['lmsn-cancel'] = async el => { const r = await LW4.run('n', 'POST', 'enroll/cancel', { cohort_id: el.dataset.h, member_no: NS().me }, '신청을 취소했습니다.'); if (r) { NS().my = null; render(); } };
  ACT['lmsn-my'] = async () => { const U = NS(); const r = await LW4.run('n', 'GET', 'mypage', { member_no: U.me }); U.my = r || { wish: [], bookmark: [], enrolls: [], diag: [] }; render(); };
  ACT['lmsn-take'] = el => { NS().take = (NS().diags || []).find(d => d.test_id === el.dataset.id); render(); };
  ACT['lmsn-submit'] = async el => { const U = NS(); const ans = U.take.questions.map((q, i) => { const x = document.querySelector(`#lmsnTake [name="d${i}"]:checked`); return x ? +x.value : null; });
    const r = await LW4.run('n', 'POST', 'diag/take', { test_id: el.dataset.id, member_no: U.me, answers: ans }); if (r) { toast(`진단 결과 ${r.score}점 · ${LV[r.level]}`, 'ok'); U.take = null; U.rec = { member_no: r.member_no, level: r.level, score: r.score, weak: Object.entries(r.by_area).filter(([, v]) => v < 60).map(([k]) => k), path: r.path, basic_support: r.basic_support }; U.my = null; load(); } };
  ACT['lmsn-rec'] = async () => { const U = NS(); const r = await LW4.run('n', 'GET', 'recommend', { member_no: U.me }); if (r) { U.rec = r; render(); } };
  ACT['lmsn-dnew'] = () => modal('진단평가 만들기', `<div class="lw-form"><label>이름<input name="t" value="수준 진단"></label><label>종류<select name="k"><option value="level">수준 진단</option><option value="basic">기초학력 진단</option></select></label>
    <label>문항(한 줄에 하나: 문제 | 보기1;보기2;… | 정답 번호(1부터) | 영역)<textarea name="i" rows="5">변수에 값을 넣는 연산자는? | =;== | 1 | 프로그래밍\n중앙값은? | 가운데 값;가장 큰 값 | 1 | 통계</textarea></label></div>`,
    [{ id: 'c', label: '취소' }, { id: 'o', label: '저장', kind: 'pri', run: w => { const items = fv(w, 'i').split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x.length >= 4).map(([q, o, a, ar]) => ({ q, options: o.split(';').map(x => x.trim()).filter(Boolean), answer: (+a || 1) - 1, area: ar }));
      LW4.run('n', 'POST', 'diag/save', { title: fv(w, 't'), kind: fv(w, 'k'), items }, '진단평가를 저장했습니다.').then(r => { if (r) load(); }); return true; } }], true);
})();
