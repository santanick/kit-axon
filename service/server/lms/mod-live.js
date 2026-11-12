'use strict';
/* 외부 연계 자체 구현 x2 — 실시간 수업(SFR-024 · 049 · 072) · AI 실시간 자막 · 번역(SFR-077)
   업무 규칙 · JSON은 sql/a2_live.sql 함수(lms_live_*)가 만든다 → Java(egovframework.didisam.lms.live)가 같은 함수를 불러 같은 JSON.
   신호 중계: 브라우저 WebRTC의 offer · answer · ICE를 POST /signal로 넣고 POST /poll(약 1초 간격)로 받는다(우리 서버만 지난다).
   예외 세 가지(SQL만으로 못 하는 것):
   ① GET /api/lms/live/cap-view — 학생 자막 화면(로그인 없음, 코드 = 기관.난수)
   ② POST /api/lms/live/cap-translate — 묶음 O의 LLM 경로(ctx.lmsoLlm: 제공자 · 한도 · 개인정보 가림 · 호출 기록)로 최대 4개 언어 번역, 쓸 수 없으면 규칙 번역(SQL)
   ③ POST /api/lms/live/cap-summary — 같은 경로로 수업 요약, 쓸 수 없으면 규칙 요약(SQL) */
const ROUTES = [
  ['GET /api/lms/live/setting', 'lms_live_setting', 'staff'],
  ['POST /api/lms/live/setting', 'lms_live_setting_save', 'staff', 8192],
  ['GET /api/lms/live/rooms', 'lms_live_rooms', 'staff'],
  ['POST /api/lms/live/room', 'lms_live_room_save', 'staff', 8192],
  ['GET /api/lms/live/room', 'lms_live_room', 'staff'],
  ['POST /api/lms/live/room-state', 'lms_live_room_state', 'staff', 4096],
  ['GET /api/lms/live/attendance', 'lms_live_attendance', 'staff'],
  ['GET /api/lms/live/summary', 'lms_live_summary', 'staff'],
  ['POST /api/lms/live/join', 'lms_live_join', 'any', 4096],
  ['POST /api/lms/live/leave', 'lms_live_leave', 'any', 4096],
  ['POST /api/lms/live/signal', 'lms_live_signal', 'any', 40000],
  ['POST /api/lms/live/poll', 'lms_live_poll', 'any', 4096],
  ['POST /api/lms/live/event', 'lms_live_event', 'any', 8192],
  ['GET /api/lms/live/my', 'lms_live_my', 'learner'],
  ['POST /api/lms/live/rec-start', 'lms_live_rec_start', 'staff', 4096],
  ['POST /api/lms/live/rec-part', 'lms_live_rec_part', 'staff', 3 * 1024 * 1024],
  ['POST /api/lms/live/rec-finish', 'lms_live_rec_finish', 'staff', 4096],
  ['POST /api/lms/live/rec-delete', 'lms_live_rec_delete', 'staff', 4096],
  ['GET /api/lms/live/recs', 'lms_live_recs', 'staff'],
  ['GET /api/lms/live/rec', 'lms_live_rec_get', 'any'],
  ['GET /api/lms/live/rec-views', 'lms_live_rec_views', 'staff'],
  ['GET /api/lms/live/cap-setting', 'lms_live_cap_setting', 'staff'],
  ['POST /api/lms/live/cap-setting', 'lms_live_cap_setting_save', 'staff', 4096],
  ['GET /api/lms/live/cap-rooms', 'lms_live_cap_rooms', 'staff'],
  ['POST /api/lms/live/cap-room', 'lms_live_cap_room', 'staff', 4096],
  ['POST /api/lms/live/cap-seg', 'lms_live_cap_seg', 'staff', 8192],
  ['GET /api/lms/live/cap-lines', 'lms_live_cap_lines', 'staff'],
  ['POST /api/lms/live/cap-edit', 'lms_live_cap_edit', 'staff', 16384],
  ['POST /api/lms/live/cap-finish', 'lms_live_cap_finish', 'staff', 4096],
  ['GET /api/lms/live/cap-transcript', 'lms_live_cap_get', 'any'],
  ['POST /api/lms/live/cap-script', 'lms_live_cap_script', 'staff', 512 * 1024],
  ['GET /api/lms/live/cap-stats', 'lms_live_cap_stats', 'staff'],
  ['POST /api/lms/live/cap-audio', 'lms_live_cap_audio', 'staff', 8192],
  ['GET /api/lms/live/cap-audio', 'lms_live_cap_audio_list', 'staff']
];
const LN = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어', vi: '베트남어', uz: '우즈베크어', mn: '몽골어', ru: '러시아어', es: '스페인어', fr: '프랑스어', de: '독일어', id: '인도네시아어' };
const CODE = /^(tn_[a-z0-9]{8,16})\.([a-z0-9]{10})$/;

module.exports = ctx => {
  const { pool, inTenant, need, readBody, HttpErr, audit, limit } = ctx;
  const out = require('./efh_lib')(ctx, ROUTES);
  const G = require('../aiguard');
  const jsonOut = require('./mod-o')._t.jsonOut;
  const hops = Math.max(0, Math.min(5, Number(process.env.TRUST_PROXY_HOPS == null ? 1 : process.env.TRUST_PROXY_HOPS)));
  const ip = req => { const L = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean); return (hops && L.length >= hops ? L[L.length - hops] : '') || String(req.socket.remoteAddress || ''); };
  const fn = async (c, name, cx, a) => {
    try { return (await c.query(`select ${name}($1::jsonb, $2::jsonb) as r`, [JSON.stringify(cx), JSON.stringify(a)])).rows[0].r; }
    catch (e) { const m = /^dd:(\d{3}):([a-z_]+)$/.exec(e.detail || ''); if (m) throw new HttpErr(+m[1], e.message, m[2]); throw e; }
  };
  /* 운영자 · 교수자 세션으로 SQL 함수 한 번(감사 _audit 처리 포함) */
  const staffCall = async (a, cx, name, args) => inTenant(pool, a.tid, async c => {
    const r = await fn(c, name, cx, args);
    if (r && r._audit) { const x = r._audit; delete r._audit; await audit(c, a.tid, a.email, x.a, x.d); }
    return r;
  });
  const staff = async req => { const a = await need(req); return [a, { kind: 'staff', uid: a.uid, email: a.email, role: a.role, ip: ip(req) }]; };
  const llm = () => typeof ctx.lmsoLlm === 'function' ? ctx.lmsoLlm : null;

  /* ① 학생 자막 화면(로그인 없음) */
  out['GET /api/lms/live/cap-view'] = async req => {
    const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams); const m = CODE.exec(q.code || '');
    if (!m) throw new HttpErr(400, '자막 코드가 올바르지 않습니다.', 'code');
    limit('lvcap:' + q.code, 900, 60e3);
    return inTenant(pool, m[1], c => fn(c, 'lms_live_cap_view', { kind: 'public' }, q));
  };
  /* ② 번역: 대기 문장(최대 20) × 대상 언어(최대 3 = 자막 4개 언어 중 발화 언어 제외) */
  out['POST /api/lms/live/cap-translate'] = async req => {
    const [a, cx] = await staff(req); const b = await readBody(req, 8192);
    const args = { room_id: b.room_id, seqs: Array.isArray(b.seqs) ? b.seqs.slice(0, 20) : undefined };
    const P = await staffCall(a, cx, 'lms_live_cap_pending', args);
    if (!P.lines.length) return { saved: 0, engine: null, lines: [] };
    limit('lvtr:' + a.uid, 120, 60e3);
    const L = llm(); let aiErr = null; const items = [];
    if (L && b.engine !== 'rule') {
      for (const lang of P.targets) {
        const need = P.lines.filter(l => l.need.includes(lang)); if (!need.length) continue;
        try {
          const r = await L(a, 'translate', `[출력:translate] <document>의 JSON 문자열 배열은 수업 중 실시간 자막 문장(${LN[P.room.src_lang] || P.room.src_lang})입니다. 각 문장을 ${LN[lang] || lang}로 번역해 같은 개수 · 같은 순서의 JSON {"paras":["..."]}만 출력합니다. 학술 용어는 정확히, 숫자 · 기호는 그대로 둡니다.\n` + G.GUARD_RULE('document'), G.fence('document', JSON.stringify(need.map(l => l.text))), { temperature: 0.1, max: 4000 });
          const o = jsonOut(r.text); const dst = o && Array.isArray(o.paras) && o.paras.length === need.length && o.paras.every(x => typeof x === 'string') ? o.paras : null;
          if (!dst) { aiErr = aiErr || 'ai_parse'; continue; }
          need.forEach((l, i) => items.push({ seq: l.seq, lang, text: dst[i].slice(0, 1000) }));
        } catch (e) { aiErr = (e && e.code) || 'ai_error'; break; }
      }
    } else aiErr = L ? 'rule_requested' : 'ai_unavailable';
    let r = items.length ? await staffCall(a, cx, 'lms_live_cap_tr_save', { room_id: b.room_id, items, engine: 'ai' }) : null;
    if (aiErr) { const r2 = await staffCall(a, cx, 'lms_live_cap_tr_save', { room_id: b.room_id, rule: true, seqs: P.lines.map(l => l.seq) }); r = { saved: (r ? r.saved : 0) + r2.saved, engine: items.length ? 'mixed' : 'rule', lines: r2.lines }; }
    return { ...r, ai_error: aiErr, note: aiErr ? '자동 번역(AI)을 쓸 수 없어 규칙 번역(강의 용어 사전)으로 채웠습니다. 「수정」에서 고칠 수 있습니다.' : null };
  };
  /* ③ 요약 */
  out['POST /api/lms/live/cap-summary'] = async req => {
    const [a, cx] = await staff(req); const b = await readBody(req, 4096);
    const T = await staffCall(a, cx, 'lms_live_cap_get', { room_id: b.room_id });
    const text = String(T.transcript || '').slice(0, 30000);
    if (!text.trim()) throw new HttpErr(422, '요약할 자막이 없습니다.', 'empty');
    const L = llm(); let aiErr = null;
    if (L && b.engine !== 'rule') {
      try {
        const r = await L(a, 'summary', `[출력:summary] 대학 수업의 실시간 자막 대본을 학생이 복습하기 좋게 한국어로 요약합니다. 핵심 개념 3~7개를 글머리표(- )로 쓰고 마지막 줄에 한 줄 요약을 씁니다. 대본에 없는 내용은 덧붙이지 않습니다.\n` + G.GUARD_RULE('document'), G.fence('document', text), { temperature: 0.2 });
        if (r.text && r.text.trim()) return { ...(await staffCall(a, cx, 'lms_live_cap_sum_save', { room_id: b.room_id, summary: r.text.trim().slice(0, 20000) })), ai: r.ai, ai_error: null };
        aiErr = 'ai_empty';
      } catch (e) { aiErr = (e && e.code) || 'ai_error'; }
    } else aiErr = L ? 'rule_requested' : 'ai_unavailable';
    return { ...(await staffCall(a, cx, 'lms_live_cap_sum_save', { room_id: b.room_id, rule: true })), ai_error: aiErr };
  };
  return out;
};
module.exports.ROUTES = ROUTES;
