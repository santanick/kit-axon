'use strict';
/* v42 학습자 공개 경로 /api/pub/<tid>/mile-*(04 5.2). 학습자 세션(lauth) 본인 것만. 제도가 꺼져 있으면 404(카드 · 경로 숨김).
   포인트 · 금액은 서버가 다시 계산(클라이언트 값 불신 — won을 보내면 대조해 다르면 amount_mismatch). 충전 · 환급 · 양도 경로 없음. */
module.exports = (ctx, S) => {
  const { pool, inTenant, readBody, limit, lauth, audit } = ctx; const { E, ok, one, str, int, MC } = S;
  const who = async (req, tid) => { const s = await lauth(req, tid); if (!s) throw E('auth', null, 401); return s.sid; };
  const T = (tid, fn) => inTenant(pool, tid, async c => { if (!(await S.modOn(c, tid)) || !(await S.policyOn(c, tid))) throw E('mile_off', null, 404); return fn(c); });
  const TRIG_KO = { signup: '가입', first_login: '첫 로그인', attend_day: '하루 학습', streak: '연속 학습', lesson_done: '차시 완료', course_done: '과정 이수', exam_score: '시험 통과', assign_submit: '과제 제출', survey_done: '설문 응답',
    noncredit_done: '비교과 이수', review_ok: '후기 작성', referral_ok: '친구 추천', tube_goal: '오늘 목표 달성', evidence: '실적 증빙', manual: '선생님 지급', penalty: '감점' };
  const KIND_KO = { earn: '적립', use: '사용', hold: '사용 대기', release: '대기 해제', expire: '소멸', cancel: '취소', adjust: '조정', restore: '복원', penalty: '감점' };
  const pts = sc => sc.mode === 'band' ? Math.max(...(sc.bands || [[0, 0]]).map(b => +b[1])) : sc.mode === 'source' ? null : +sc.v || 0;
  async function wallet(c, tid, sid) { const units = (await c.query('select scope_unit, streak from mil_wallet where tenant_id = $1 and sid = $2 order by scope_unit', [tid, sid])).rows; if (!units.length) units.push({ scope_unit: 'lu_root', streak: {} });
    const out = []; for (const u of units) out.push({ unit: u.scope_unit, streak: u.streak, ...(await one(c, 'select mil_sync($1,$2,$3) r', [tid, sid, u.scope_unit])) }); return out; }
  const H9 = 9 * 3600e3; const dAdd = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); const kmid = d => Date.parse(d + 'T00:00:00Z') - H9;
  /* 연속 학습 복구 가능 여부: 마지막 학습일 L, 오늘 T(KST). T − L ≥ 2(끊김)이고 끊긴 시각(L+2 0시) + withinH 안, 이번 달 복구 횟수 < perMonth */
  async function repairOf(c, tid, sid, p) { const R0 = (p.streak && p.streak.repair) || { withinH: 48, factor: 2, perMonth: 1 }; const today = MC.kst(Date.now());
    const L = (await c.query("select max(mil_kst(occurred_at))::text d from mil_event where tenant_id = $1 and sid = $2 and trigger = 'attend_day'", [tid, sid])).rows[0].d; if (!L) return null;
    const gap = Math.round((Date.parse(today) - Date.parse(L)) / 864e5); if (gap < 2) return null; const until = kmid(dAdd(L, 2)) + (+R0.withinH || 48) * 3600e3; if (Date.now() > until) return null;
    const used = +(await c.query("select count(*)::int n from mil_event where tenant_id = $1 and sid = $2 and trigger = 'attend_day' and src_type = 'repair' and to_char(received_at at time zone 'Asia/Seoul', 'YYYY-MM') = $3", [tid, sid, today.slice(0, 7)])).rows[0].n;
    if (used >= (+R0.perMonth || 1)) return null; return { until: new Date(until).toISOString(), need: Math.round(((p.streak && +p.streak.minMin) || 10) * (+R0.factor || 2)), last: L, missed: Array.from({ length: gap - 1 }, (_, i) => dAdd(L, i + 1)) }; }
  /* 보호자 계정의 연결된 자녀 sid(기관 문서 parents[] · pacct[], 연결 승인된 것만) */
  async function kidsOf(c, tid, sid) { const d = (await c.query("select doc->'parents' pa, doc->'pacct' pc, doc->'members' mb from tenant_state where tenant_id = $1", [tid])).rows[0] || {};
    const acct = (Array.isArray(d.pc) ? d.pc : []).find(x => x && (x.sid === sid || x.lid === sid)); if (!acct) return [];
    const ids = new Set((Array.isArray(d.pa) ? d.pa : []).filter(x => x && x.acct === acct.id && /연결됨|승인|ok/i.test(String(x.status || ''))).map(x => String(x.child)));
    return (Array.isArray(d.mb) ? d.mb : []).filter(m => m && ids.has(String(m.id)) && m.sid).map(m => String(m.sid)); }
  const hasGuardian = async (c, tid, sid) => { try { return (await pool.query("select 1 from pii.guardian where tid = $1 and learner_id::text = $2 and status = 'ok' limit 1", [tid, sid])).rowCount > 0; } catch { return false; } };
  const R = {
    'GET mile-my': async (req, res, tid) => { const sid = await who(req, tid); return T(tid, async c => { const p = await S.pol(c, tid); const W = await wallet(c, tid, sid); const w = W[0];
      const rules = (await c.query("select distinct on (id) * from mil_rule where tenant_id = $1 order by id, ver desc", [tid])).rows.filter(r => r.active && r.trigger !== 'penalty');
      const rewards = (await c.query('select * from mil_reward where tenant_id = $1 and active order by threshold, min_use', [tid])).rows;
      const goal = rewards.map(r => ({ r, need: Math.max(r.threshold, r.min_use, (r.cost && r.cost.fixedP) || 0) })).filter(x => x.need > (x.r.cash ? w.convertible : w.balance)).sort((a, b) => a.need - b.need)[0];
      const notices = (await c.query('select kind, ym, points, due_at, sent_at from mil_notice where tenant_id = $1 and sid = $2 and read_at is null order by sent_at desc limit 10', [tid, sid])).rows;
      const funded = +(await c.query("select coalesce(sum(points), 0)::int n from mil_entry where tenant_id = $1 and sid = $2 and funded and status = 'posted'", [tid, sid])).rows[0].n;
      const today = MC.kst(Date.now()); const days = new Set((await c.query("select distinct mil_kst(occurred_at)::text d from mil_event where tenant_id = $1 and sid = $2 and trigger = 'attend_day' and occurred_at > now() - interval '8 days'", [tid, sid])).rows.map(r => r.d));
      const agg = (await c.query("select coalesce(sum(points) filter (where kind = 'earn' and nature = 'participation' and status = 'posted'), 0)::int part, coalesce(-sum(points) filter (where kind = 'hold'), 0)::int - coalesce(sum(points) filter (where kind = 'release'), 0)::int held, coalesce(sum(points) filter (where kind = 'earn' and status <> 'void' and mil_kst(at) = mil_kst(now())), 0)::int today from mil_entry where tenant_id = $1 and sid = $2", [tid, sid])).rows[0];
      const tiers = (Array.isArray(p.tiers) ? p.tiers : []).filter(t => t && t.name).sort((x, y) => (+x.min || 0) - (+y.min || 0)); let tier = null;
      if (tiers.length) { const i = tiers.reduce((k, t, j) => w.earnedWindow >= (+t.min || 0) ? j : k, -1); const nx = tiers[i + 1]; tier = { name: i >= 0 ? tiers[i].name : null, pct: nx ? Math.min(100, Math.floor(w.earnedWindow * 100 / Math.max(1, +nx.min))) : 100, next: nx ? nx.name : null }; }
      const badges = (await c.query("select src_id n, min(occurred_at) at from mil_event where tenant_id = $1 and sid = $2 and trigger = 'streak' group by src_id", [tid, sid])).rows.map(r => ({ id: 'streak-' + r.n, name: `연속 학습 ${r.n}일`, at: r.at }))
        .concat((await c.query("select d.id, w.title, d.decided_at at from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.sid = $2 and w.kind in ('badge','cert') and d.status = 'fulfilled'", [tid, sid])).rows.map(r => ({ id: r.id, name: r.title, at: r.at })));
      const recent = (await c.query("select kind, points, reason, trigger, at from mil_entry where tenant_id = $1 and sid = $2 and status = 'posted' and kind in ('earn','adjust','restore','expire','cancel','penalty') order by at desc limit 5", [tid, sid])).rows.map(e => ({ kind: e.kind, points: e.points, text: e.reason || TRIG_KO[e.trigger] || KIND_KO[e.kind], at: e.at }));
      const kidSids = await kidsOf(c, tid, sid); const kids = []; for (const k of kidSids.slice(0, 10)) { const kw = (await wallet(c, tid, k))[0]; const pend = (await c.query("select id, points, at from mil_redeem where tenant_id = $1 and sid = $2 and status = 'requested' and fulfil->>'guardian' = 'pending'", [tid, k])).rows;
        kids.push({ sid: k, balance: kw.balance, convertible: kw.convertible, guardianPending: pend.map(x => ({ id: x.id, points: x.points, at: x.at })) }); }
      const rp = await repairOf(c, tid, sid, p);
      return { ok: true, on: true, unitName: p.unit_name, balance: w.balance, pending: w.pending, convertible: w.convertible, held: agg.held, funded, fundedEarned: funded, participation: agg.part, earnedWindow: w.earnedWindow,
        windowLabel: p.tier_window === 'term' ? '이번 학기' : p.tier_window === 'year' ? '올해' : '최근 12개월', tier, daily: { cap: p.daily_cap_total, today: agg.today }, badges, recent, kids: kidSids.length ? kids : undefined,
        nextGoal: goal ? { label: goal.r.title, now: Math.max(0, goal.r.cash ? w.convertible : w.balance), target: goal.need, need: goal.need - (goal.r.cash ? w.convertible : w.balance), pct: Math.floor(Math.max(0, goal.r.cash ? w.convertible : w.balance) * 100 / goal.need),
          hint: goal.r.cash && w.balance > w.convertible ? '참여형 · 국비 과정 적립은 이 보상에 쓰이지 않아요.' : null } : null,
        streak: { n: (w.streak && w.streak.n) || 0, last: (w.streak && w.streak.last) || null, freezePerWeek: (p.streak && p.streak.freezePerWeek) || 1, week: Array.from({ length: 7 }, (_, i) => days.has(dAdd(today, i - 6))),
          repair: rp ? { until: rp.until, need: rp.need } : null }, expiring: w.nextExpire,
        ways: rules.map(r => ({ trigger: r.trigger, text: r.label || TRIG_KO[r.trigger] || r.trigger, points: pts(r.score), nature: r.nature })),
        wallets: W.length > 1 ? W.map(x => ({ unit: x.unit, balance: x.balance, convertible: x.convertible })) : undefined, sunset: p.sunset || null,
        notices: notices.map(n => ({ kind: n.kind, ym: n.ym, points: n.points, dueAt: n.due_at, at: n.sent_at })) }; }); },
    'GET mile-list': async (req, res, tid) => { const sid = await who(req, tid); const Q = new URL(req.url, 'http://x').searchParams; const lim = Math.min(Math.max(int(Q.get('limit')) || 30, 1), 100);
      return T(tid, async c => { const v = [tid, sid]; let w = ''; const af = String(Q.get('after') || '').split('|'); if (af[0] && !Number.isNaN(Date.parse(af[0]))) { v.push(af[0], str(af[1], 20)); w = ' and (at, id) < ($3::timestamptz, $4)'; }
        const rows = (await c.query(`select * from mil_entry where tenant_id = $1 and sid = $2 and status <> 'void'${w} order by at desc, id desc limit ${lim + 1}`, v)).rows; const more = rows.length > lim; const L = rows.slice(0, lim);
        const cancelled = new Set((await c.query("select ref_entry from mil_entry where tenant_id = $1 and sid = $2 and kind = 'cancel'", [tid, sid])).rows.map(r => r.ref_entry));
        return { ok: true, items: L.map(e => ({ id: e.id, ym: MC.kst(e.at).slice(0, 7), day: MC.kst(e.at), kind: e.kind, kindText: KIND_KO[e.kind], points: e.points, status: e.status, text: e.reason || TRIG_KO[e.trigger] || KIND_KO[e.kind],
          trigger: e.trigger, funded: e.funded, convertible: e.convertible, expiresAt: e.expires_at, cancelled: cancelled.has(e.id) })), after: more ? `${L[L.length - 1].at.toISOString()}|${L[L.length - 1].id}` : null }; }); },
    'GET mile-rewards': async (req, res, tid) => { const sid = await who(req, tid); return T(tid, async c => { const W = await wallet(c, tid, sid); const byU = new Map(W.map(w => [w.unit, w]));
      const rows = (await c.query('select * from mil_reward where tenant_id = $1 and active order by kind, threshold, id', [tid])).rows; const out = [];
      for (const r of rows) { const w = byU.get((r.link && r.link.unitId) || 'lu_root') || { balance: 0, convertible: 0 }; const usable = Math.max(0, r.cash ? w.convertible : w.balance);
        const used = r.stock == null ? 0 : +(await c.query("select count(*)::int n from mil_redeem where tenant_id = $1 and reward_id = $2 and status in ('requested','approved','fulfilled')", [tid, r.id])).rows[0].n;
        const lock = w.balance < 0 ? 'negative_balance' : r.cash && w.convertible < r.threshold ? 'below_threshold' : r.stock != null && used >= r.stock ? 'out_of_stock' : usable < Math.max(r.min_use, 1) ? 'insufficient' : null;
        out.push({ id: r.id, kind: r.kind, title: r.title, cost: r.cost, minUse: r.min_use, maxUse: r.max_use, step: r.step, threshold: r.threshold, cash: r.cash, stockLeft: r.stock == null ? null : Math.max(0, r.stock - used), usable, locked: lock, priceWon: (r.link && r.link.priceWon) || null }); }
      const reqs = (await c.query('select d.*, w.title, w.kind from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.sid = $2 order by d.at desc limit 30', [tid, sid])).rows;
      return { ok: true, rewards: out, requests: reqs.map(d => ({ id: d.id, rewardId: d.reward_id, title: d.title, kind: d.kind, points: d.points, won: d.won, status: d.status, guardian: (d.fulfil && d.fulfil.guardian) || null,
        code: (d.fulfil && d.fulfil.couponCode) || null, until: (d.fulfil && d.fulfil.until) || null, reason: ['rejected', 'cancelled', 'reclaimed'].includes(d.status) ? d.reason : null, at: d.at,
        cancellable: d.status === 'requested' || (d.status === 'approved' && !(d.fulfil && (d.fulfil.chargeId || d.fulfil.handedAt || d.fulfil.couponCode))) })) }; }); },
    'POST mile-redeem': async (req, res, tid) => { const sid = await who(req, tid); const b = await readBody(req, 1024); limit(`mrd:${tid}:${sid}`, 10, 60e3); limit(`mrdt:${tid}`, 60, 60e3);
      const idem = str(b.idem, 60); if (!/^[A-Za-z0-9_-]{6,60}$/.test(idem)) throw E('bad_points');
      return T(tid, async c => { const r = ok(await one(c, 'select mil_redeem_req($1,$2,$3,$4,$5) r', [tid, sid, str(b.rewardId, 34), int(b.points), idem]));
        if (b.won != null && int(b.won) !== r.won) throw E('amount_mismatch', { won: r.won });
        if (!r.again && r.status === 'requested' && await hasGuardian(c, tid, sid)) { await c.query("update mil_redeem set fulfil = fulfil || '{\"guardian\":\"pending\"}' where tenant_id = $1 and id = $2", [tid, r.id]); r.guardian = 'pending'; }
        await audit(c, tid, 'learner:' + sid, 'mileage.redeem', { id: r.id, points: r.points, status: r.status }); return r; }); },
    'POST mile-redeem-cancel': async (req, res, tid) => { const sid = await who(req, tid); const b = await readBody(req, 512);
      /* 취소 규칙(L 결정): requested, 또는 approved이면서 이행 전(굿즈 미수령 · 차감 줄 없음 · 쿠폰 미발급)이면 학습자가 취소 → 포인트 복원. 이행 후는 운영자 회수만 */
      return T(tid, async c => { const id = str(b.id, 20); const d = (await c.query('select sid, status, fulfil from mil_redeem where tenant_id = $1 and id = $2 for update', [tid, id])).rows[0]; if (!d || d.sid !== sid) throw E('not_found');
        if (d.status === 'requested') return ok(await one(c, "select mil_redeem_decide($1,$2,'cancel',$3,'학습자 취소') r", [tid, id, 'learner:' + sid]));
        const f = d.fulfil || {}; if (d.status !== 'approved' || f.chargeId || f.handedAt || f.couponCode) throw E('state');
        const r = ok(await one(c, "select mil_redeem_reclaim($1,$2,'학습자 취소',$3) r", [tid, id, 'learner:' + sid])); await c.query("update mil_redeem set status = 'cancelled' where tenant_id = $1 and id = $2", [tid, id]);
        await audit(c, tid, 'learner:' + sid, 'mileage.redeem.cancel', { id }); return { ...r, status: 'cancelled' }; }); },
    'POST mile-guardian': async (req, res, tid) => { const sid = await who(req, tid); const b = await readBody(req, 512); limit(`mgd:${tid}:${sid}`, 30, 600e3);
      return T(tid, async c => { const id = str(b.id, 20); const d = (await c.query('select sid, status, fulfil from mil_redeem where tenant_id = $1 and id = $2 for update', [tid, id])).rows[0];
        if (!d || !(await kidsOf(c, tid, sid)).includes(d.sid)) throw E('not_found'); if (d.status !== 'requested' || (d.fulfil || {}).guardian !== 'pending') throw E('state');
        await c.query('update mil_redeem set fulfil = fulfil || $3 where tenant_id = $1 and id = $2', [tid, id, JSON.stringify({ guardian: b.ok === true ? 'ok' : 'no', guardianAt: new Date().toISOString() })]);
        if (b.ok !== true) await one(c, "select mil_redeem_decide($1,$2,'reject',$3,'보호자가 동의하지 않았어요') r", [tid, id, 'guardian:' + sid]);
        await audit(c, tid, 'guardian:' + sid, 'mileage.redeem.guardian', { id, ok: b.ok === true }); return { ok: true, id, guardian: b.ok === true ? 'ok' : 'no' }; }); },
    'POST mile-streak-repair': async (req, res, tid) => { const sid = await who(req, tid); limit(`msr:${tid}:${sid}`, 10, 600e3);
      return T(tid, async c => { await c.query('select mil_lock($1,$2,$3)', [tid, sid, 'lu_root']); const p = await S.pol(c, tid); const rp = await repairOf(c, tid, sid, p);
        if (!rp) { const w = (await c.query("select streak from mil_wallet where tenant_id = $1 and sid = $2 and scope_unit = 'lu_root'", [tid, sid])).rows[0]; return { ok: true, again: true, streak: (w && w.streak) || {} }; }
        const lp = (await c.query('select lp from learner_progress where tenant_id = $1 and sid = $2', [tid, sid])).rows[0]; const today = MC.kst(Date.now());
        const sec = +(((lp && lp.lp && lp.lp.tube && lp.lp.tube.sec) || {})[today] || 0); if (sec < rp.need * 60) throw E('repair_need', { need: rp.need, now: Math.floor(sec / 60) }, 409);
        for (const d of rp.missed) await c.query("insert into mil_event (tenant_id, sid, trigger, src_type, src_id, value, trust, occurred_at, status, result) values ($1,$2,'attend_day','repair',$3,$4,'C',($3::date + time '12:00') at time zone 'Asia/Seoul','skipped','{\"reason\":\"repair\"}') on conflict do nothing", [tid, sid, d, rp.need]);
        const n = +(await c.query("select mil_streak_calc($1,$2,mil_kst(now()),coalesce((select (streak->>'freezePerWeek')::int from mil_policy where tenant_id = $1), 1)) n", [tid, sid])).rows[0].n;
        await c.query("update mil_wallet set streak = jsonb_build_object('n', $3::int, 'last', mil_kst(now()), 'repairedAt', now()) where tenant_id = $1 and sid = $2 and scope_unit = 'lu_root'", [tid, sid, n]);
        await audit(c, tid, 'learner:' + sid, 'mileage.streak_repair', { days: rp.missed.length }); return { ok: true, streak: { n } }; }); },
    'POST mile-proof': async (req, res, tid) => { const sid = await who(req, tid); const b = await readBody(req, 2048); limit(`mpf:${tid}:${sid}`, 10, 3600e3);
      return T(tid, async c => { const rule = (await c.query("select id from mil_rule where tenant_id = $1 and id = $2 and trigger = 'evidence' and active", [tid, str(b.ruleId, 34)])).rows[0]; if (!rule) throw E('not_found');
        const id = S.rid('mpf_'); await c.query('insert into mil_proof (tenant_id, id, sid, rule_id, item, activity_on, file_ref) values ($1,$2,$3,$4,$5,$6,$7)', [tid, id, sid, rule.id, str(b.item, 60), /^\d{4}-\d\d-\d\d$/.test(b.activityOn || '') ? b.activityOn : null, str(b.fileRef, 200) || null]);
        return { ok: true, id, status: 'submitted' }; }); },
    'POST mile-notice-read': async (req, res, tid) => { const sid = await who(req, tid); return T(tid, async c => { await c.query('update mil_notice set read_at = now() where tenant_id = $1 and sid = $2 and read_at is null', [tid, sid]); return { ok: true }; }); }
  };
  return R;
};
