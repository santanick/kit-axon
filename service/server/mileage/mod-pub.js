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
  const R = {
    'GET mile-my': async (req, res, tid) => { const sid = await who(req, tid); return T(tid, async c => { const p = await S.pol(c, tid); const W = await wallet(c, tid, sid); const w = W[0];
      const rules = (await c.query("select distinct on (id) * from mil_rule where tenant_id = $1 order by id, ver desc", [tid])).rows.filter(r => r.active && r.trigger !== 'penalty');
      const rewards = (await c.query('select * from mil_reward where tenant_id = $1 and active order by threshold, min_use', [tid])).rows;
      const goal = rewards.map(r => ({ r, need: Math.max(r.threshold, r.min_use, (r.cost && r.cost.fixedP) || 0) })).filter(x => x.need > (x.r.cash ? w.convertible : w.balance)).sort((a, b) => a.need - b.need)[0];
      const notices = (await c.query('select kind, ym, points, due_at, sent_at from mil_notice where tenant_id = $1 and sid = $2 and read_at is null order by sent_at desc limit 10', [tid, sid])).rows;
      const funded = +(await c.query("select coalesce(sum(points), 0)::int n from mil_entry where tenant_id = $1 and sid = $2 and funded and status = 'posted'", [tid, sid])).rows[0].n;
      return { ok: true, on: true, unitName: p.unit_name, balance: w.balance, pending: w.pending, convertible: w.convertible, fundedEarned: funded, tier: null,
        nextGoal: goal ? { label: goal.r.title, need: goal.need - (goal.r.cash ? w.convertible : w.balance), pct: Math.floor(Math.max(0, goal.r.cash ? w.convertible : w.balance) * 100 / goal.need) } : null,
        streak: { n: (w.streak && w.streak.n) || 0, last: (w.streak && w.streak.last) || null, freezePerWeek: (p.streak && p.streak.freezePerWeek) || 1 }, expiring: w.nextExpire,
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
      return { ok: true, rewards: out }; }); },
    'POST mile-redeem': async (req, res, tid) => { const sid = await who(req, tid); const b = await readBody(req, 1024); limit(`mrd:${tid}:${sid}`, 10, 60e3); limit(`mrdt:${tid}`, 60, 60e3);
      const idem = str(b.idem, 60); if (!/^[A-Za-z0-9_-]{6,60}$/.test(idem)) throw E('bad_points');
      return T(tid, async c => { const r = ok(await one(c, 'select mil_redeem_req($1,$2,$3,$4,$5) r', [tid, sid, str(b.rewardId, 34), int(b.points), idem]));
        if (b.won != null && int(b.won) !== r.won) throw E('amount_mismatch', { won: r.won });
        await audit(c, tid, 'learner:' + sid, 'mileage.redeem', { id: r.id, points: r.points, status: r.status }); return r; }); },
    'POST mile-redeem-cancel': async (req, res, tid) => { const sid = await who(req, tid); const b = await readBody(req, 512);
      return T(tid, async c => { const d = (await c.query('select sid, status from mil_redeem where tenant_id = $1 and id = $2', [tid, str(b.id, 20)])).rows[0]; if (!d || d.sid !== sid) throw E('not_found'); if (d.status !== 'requested') throw E('state');
        return ok(await one(c, "select mil_redeem_decide($1,$2,'cancel',$3,'학습자 취소') r", [tid, str(b.id, 20), 'learner:' + sid])); }); },
    'POST mile-proof': async (req, res, tid) => { const sid = await who(req, tid); const b = await readBody(req, 2048); limit(`mpf:${tid}:${sid}`, 10, 3600e3);
      return T(tid, async c => { const rule = (await c.query("select id from mil_rule where tenant_id = $1 and id = $2 and trigger = 'evidence' and active", [tid, str(b.ruleId, 34)])).rows[0]; if (!rule) throw E('not_found');
        const id = S.rid('mpf_'); await c.query('insert into mil_proof (tenant_id, id, sid, rule_id, item, activity_on, file_ref) values ($1,$2,$3,$4,$5,$6,$7)', [tid, id, sid, rule.id, str(b.item, 60), /^\d{4}-\d\d-\d\d$/.test(b.activityOn || '') ? b.activityOn : null, str(b.fileRef, 200) || null]);
        return { ok: true, id, status: 'submitted' }; }); },
    'POST mile-notice-read': async (req, res, tid) => { const sid = await who(req, tid); return T(tid, async c => { await c.query('update mil_notice set read_at = now() where tenant_id = $1 and sid = $2 and read_at is null', [tid, sid]); return { ok: true }; }); }
  };
  return R;
};
