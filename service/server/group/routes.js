'use strict';
/* /api/group/* (spec 1-3 · 1-4 · 1-5, 계약 group/contract.json). 권한 함수가 요청 범위(기관 · 묶음 · 산타)를 정하고 tx()가 RLS 세션 변수로 넘긴다.
   상위 기관 경로: 로그인 기관 = grp_group.owner_tid · pilot · active + 통합 센터 역할(정운영자 = grp_admin 자동).
   소속 기관 경로(/my): 로그인 기관 = grp_link.child_tid. 쓰기는 idem 필수. 상위 기관에 나가는 값은 kpi.mask로 가린 집계뿐이다. */
module.exports = (ctx, S) => {
  const { readBody, pool, HttpErr } = ctx; const { E, K, C, rid, str, kstDay, sha, tx, txIn, scopeSet, q1, idem, gaudit, tlog, docOf, docEdit, tenantName, gkey } = S;
  const isSanta = a => !!(ctx.isSanta && ctx.isSanta(a));
  const lim = (key, max, win) => { try { ctx.limit(key, max, win); } catch (e) { if (e && e.status === 429) throw E('grp_limit'); throw e; } };
  const Q = req => new URL(req.url, 'http://x').searchParams;
  const body = req => readBody(req, 320 * 1024);
  const today = () => kstDay();
  const DAY = /^\d{4}-\d{2}-\d{2}$/; const TID = /^tn_[a-z0-9]{8,16}$/;
  const daysBetween = (f, t) => Math.round((Date.parse(t) - Date.parse(f)) / 864e5) + 1;
  const iso = t => (t ? new Date(t).toISOString() : null);
  const pageOf = (q, items) => { const page = Math.max(1, Math.floor(+q.get('page')) || 1); const size = Math.min(100, Math.max(1, Math.floor(+q.get('size')) || 20)); return { items: items.slice((page - 1) * size, page * size), page, total: items.length }; };
  const ROLE_PERMS = C.roles; const ADMIN = ROLE_PERMS.grp_admin;
  const range = (q, minDays) => { const to = q.get('to') || today(); const from = q.get('from') || to.slice(0, 8) + '01';
    if (!DAY.test(from) || !DAY.test(to) || from > to || daysBetween(from, to) > 366) throw E('grp_range'); if (minDays && daysBetween(from, to) < minDays) throw E('grp_range', { minDays }, `통합 학습자 집계는 최소 ${minDays}일 기간으로 조회합니다.`); return { from, to }; };
  const reason = b => { const r = str(b.reason, 201).trim(); if (r.length < 5 || r.length > 200) throw E('grp_reason'); return r; };

  /* ── 권한 ── */
  const need = async req => { const a = await ctx.need(req); scopeSet(a.tid, '', false); return a; };
  async function rolesOf(a, g) { const rs = (await tx(c => c.query('select role from grp_staff where group_id = $1 and user_id = $2', [g.id, a.uid]))).rows.map(r => r.role); if (a.role === 'owner' && !rs.includes('grp_admin')) rs.unshift('grp_admin'); return rs; }
  const permsOf = rs => [...new Set(rs.flatMap(r => ROLE_PERMS[r] || []))].filter(p => p !== 'learner' || rs.includes('grp_learner'));
  async function needGrp(req, perm) {
    const a = await need(req); const g = await tx(c => q1(c, 'select * from grp_group where owner_tid = $1', [a.tid]));
    if (!g || !g.pilot || g.status !== 'active') throw E('grp_off'); scopeSet(a.tid, g.id, false);
    const roles = await rolesOf(a, g); const perms = permsOf(roles); if (perm && !perms.includes(perm)) throw E('grp_role'); return { a, g, roles, perms };
  }
  const needChild = async req => { const a = await need(req); if (a.role === 'teacher') throw new HttpErr(403, '교강사 권한으로 사용할 수 없습니다.', 'teacher'); return a; };
  const needChildOwner = async req => { const a = await needChild(req); if (a.role !== 'owner') throw E('grp_owner'); return a; };
  const needSanta = async req => { const a = await ctx.need(req); if (!isSanta(a)) throw new HttpErr(403, '산타 관리자만 쓸 수 있습니다.', 'santa'); scopeSet(a.tid, '', true); return a; };
  /* 재인증(임시: 세션이 10분 안에 만들어짐 — 로그인 · 2단계 인증 직후). mfa.js freshWithin 공개 시 교체(코어 요청 5) */
  const needFresh = async a => { const r = (await pool.query("select created_at > now() - interval '10 minutes' ok from sessions where id = $1", [a.sid])).rows[0]; if (!r || !r.ok) throw E('grp_mfa', { mfa: 'required' }); };
  const ipOf = req => String((ctx.ip && ctx.ip(req)) || '');

  /* ── 출력 ── */
  const groupOut = (g, counts) => ({ gid: g.id, kind: g.kind, name: g.name, pilot: g.pilot, detail: g.detail, status: g.status, targets: g.targets || {}, terms: { agreeVer: C.agreeVer }, ...(counts ? {} : {}) });
  const shareOf = s => s ? { kpi: true, revenue: !!s.revenue, ai: !!s.ai, learnerAgg: !!s.learnerAgg, learnerDetail: { on: !!(s.learnerDetail && s.learnerDetail.on), fields: (s.learnerDetail && s.learnerDetail.fields) || [] }, agreeVer: s.agreeVer || null, at: s.at || null, by: s.by || null } : null;
  const linkOut = (l, nm) => ({ linkId: l.id, childTid: l.child_tid, childName: nm ? nm.name : '', childType: nm ? nm.type : '', label: l.label, unit: l.unit, status: l.status, share: shareOf(l.share), invitedAt: iso(l.invited_at), acceptedAt: iso(l.accepted_at), endedAt: iso(l.ended_at) });
  const counts = async (c, gid) => { const r = (await c.query("select status, count(*)::int n from grp_link where group_id = $1 and status in ('active','invited') group by status", [gid])).rows; const o = { active: 0, invited: 0 }; r.forEach(x => { o[x.status] = x.n; }); return o; };
  const activeLinks = (c, gid) => c.query("select * from grp_link where group_id = $1 and status = 'active' order by accepted_at, id", [gid]).then(r => r.rows);
  const names = async tids => { const L = [...new Set(tids.filter(Boolean))]; if (!L.length) return new Map(); return new Map((await pool.query('select id, name, type from tenants where id = any($1)', [L])).rows.map(r => [r.id, r])); };

  /* 공유 범위 검사(유형별 허용 항목) */
  function shareIn(kind, s, strict) {
    const x = s || {}; const det = x.learnerDetail || {}; const allow = C.detailFields[kind] || [];
    const fields = Array.isArray(det.fields) ? [...new Set(det.fields.map(String))] : [];
    if (fields.some(f => !allow.includes(f)) || (det.on && !allow.length)) throw E('grp_field');
    if (x.revenue && kind === 'region') throw E('grp_field');
    if (x.learnerAgg && kind === 'franchise') throw E('grp_field');
    if (strict && x.kpi === false) throw E('grp_terms');
    return { kpi: true, revenue: !!x.revenue, ai: !!x.ai, learnerAgg: !!x.learnerAgg, learnerDetail: { on: !!det.on && fields.length > 0, fields: det.on ? fields : [] } };
  }

  /* 연결이 끝나면(해제 · 탈퇴) 필수 배포 콘텐츠를 그 기관에서 회수(판정 ②, 소속 기관 사본 · 수정본은 남음) */
  async function endLink(link) {
    const T = await txIn({ santa: true }, async c => { const r = (await c.query("update grp_share_tgt t set status = 'recalled', at = now() from grp_share s where s.id = t.share_id and s.group_id = $1 and t.child_tid = $2 and s.required and t.status in ('offered','adopted') returning t.local_id, s.kind", [link.group_id, link.child_tid])).rows; return r; });
    const ids = T.filter(x => x.local_id).map(x => x.local_id); if (ids.length) await docEdit(link.child_tid, d => hideLocal(d, ids)).catch(() => {});
    return T.length;
  }
  /* QA49-3 #4: 회수(숨김)는 편집본 표시만이 아니라 학습자 사이트 게시본(lsite.pub)에서도 바로 빼야 학습자 화면에서 사라진다 */
  function hideLocal(d, ids) { const gone = []; for (const k of ['classes', 'notices']) (Array.isArray(d[k]) ? d[k] : []).forEach(x => { if (x && ids.includes(x.id)) { x.grpRecalled = true; x.hidden = true; gone.push(x); } });
    const ls = d.lsite || {}; for (const P of [ls.pages, d.grpPending && d.grpPending.pages]) (Array.isArray(P) ? P : []).forEach(x => { if (x && ids.includes(x.id)) { x.grpRecalled = true; x.hidden = true; x.on = false; } });
    const pub = ls.pub; if (!pub || typeof pub !== 'object') return;
    if (Array.isArray(pub.pages)) pub.pages = pub.pages.filter(x => !(x && ids.includes(x.id)));
    if (Array.isArray(pub.classes)) pub.classes = pub.classes.filter(x => !(x && ids.includes(x.id)));
    const nt = new Set(gone.filter(x => !x.curriculum).map(x => `${x.title || ''}|${x.at || ''}`)); const ct = new Set(gone.filter(x => x.curriculum || x.learners).map(x => x.name));
    if (Array.isArray(pub.notices)) pub.notices = pub.notices.filter(x => !(x && (nt.has(`${x.title || ''}|${x.at || ''}`) || (x.cls && ct.has(x.cls))))); }

  /* ── 콘텐츠 사본(spec 5-3): 학습자 · 성적 · 수납 데이터를 뺀다. 마켓 콘텐츠는 409 grp_license ── */
  const DROP = ['learners', 'prog', 'grades', 'scores', 'subs', 'submissions', 'board', 'posts', 'consults', 'pays', 'coupons', 'teachers', 'teacher', 'owner', 'att', 'attendance', 'crmDay', 'k12Exams', 'makeups', 'done', 'waits', 'apply', 'applicants', 'reviews', 'qna', 'logs'];
  const PER = ['enr', 'attT', 'conn', 'ask', 'drop', 'memo', 'certs'];
  function scrubIds(o, ids, depth) { if (!o || typeof o !== 'object' || depth > 6) return;
    if (Array.isArray(o)) { for (const v of o) scrubIds(v, ids, depth + 1); return; }
    if (depth === 0) for (const k of PER) delete o[k];
    for (const k of Object.keys(o)) { const v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some(x => ids.has(x))) { delete o[k]; continue; }
      if (Array.isArray(v) && v.some(x => typeof x === 'string' && ids.has(x))) { delete o[k]; continue; }
      scrubIds(v, ids, depth + 1); } }
  const isMk = x => !!(x && typeof x === 'object' && (x.mk || x.mkProduct || x.market || x.mkId || x.src === 'market'));
  function sourceOf(doc, kind, src) {
    const s = src || {}; const id = String(s.courseId || s.pageId || s.noticeId || ''); if (!id) throw E('grp_source');
    const list = kind === 'course' ? doc.classes : kind === 'page' ? doc.lsite && doc.lsite.pub && doc.lsite.pub.pages : doc.notices;
    const x = (Array.isArray(list) ? list : []).find(y => y && String(y.id) === id); if (!x) throw E('grp_source');
    if (isMk(x) || (Array.isArray(x.items) && x.items.some(isMk))) throw E('grp_license');
    const snap = JSON.parse(JSON.stringify(x)); for (const k of DROP) delete snap[k]; delete snap.grpFrom; delete snap.grpRecalled;
    /* QA49-3 #3: 학습자별 기록(enr · attT · conn · ask · drop 등 학습자 ID를 키로 쓰는 값)은 목록에 없는 키라도 지운다 */
    const ids = new Set([...(Array.isArray(doc.members) ? doc.members : []).map(m => m && m.id), ...(Array.isArray(doc.classes) ? doc.classes : []).flatMap(c => (c && Array.isArray(c.learners) ? c.learners : []).concat(Object.keys((c && c.prog) || {})))].filter(Boolean).map(String));
    scrubIds(snap, ids, 0);
    if (Array.isArray(snap.items)) snap.items = snap.items.map(i => { const o = { ...i }; for (const k of ['subs', 'submissions', 'answers', 'scores', 'file', 'blob']) delete o[k]; return o; });
    if (Buffer.byteLength(JSON.stringify(snap)) > 2097152) throw E('grp_size');
    return { id, snap, title: str(x.name || x.title || '제목 없음', 80) };
  }
  const shareOut = (s, t) => ({ sid: s.id, dir: s.dir, kind: s.kind, title: s.title, ver: s.ver, required: s.required, status: s.status, fromTid: s.from_tid, note: s.note || '', targetsSpec: s.targets, ...(t ? { targets: t } : {}) });
  async function tgtStats(c, s, live) {
    const rows = (await c.query('select child_tid, status, ver from grp_share_tgt where share_id = $1', [s.id])).rows; const want = s.targets === 'all' ? live : live.filter(t => (s.targets || []).includes(t));
    const set = new Set([...want, ...rows.map(r => r.child_tid)]); const st = { total: set.size, adopted: 0, declined: 0, pending: 0, outdated: 0, recalled: 0 };
    for (const t of set) { const r = rows.find(x => x.child_tid === t); if (!r || r.status === 'offered') st.pending++; else st[r.status]++; if (r && r.status === 'adopted' && r.ver < s.ver) st.outdated++; } return st;
  }
  const docItem = (d, kind) => { if (kind === 'course') return (d.classes = Array.isArray(d.classes) ? d.classes : []); if (kind === 'notice') return (d.notices = Array.isArray(d.notices) ? d.notices : []);
    /* QA49-3 #5: 페이지는 게시본(pub)이 아니라 편집본(lsite.pages, 꺼짐)에 넣는다 — 게시본에 넣으면 「비공개 초안」이 학습자 사이트에 바로 보인다.
       사이트 편집본이 아직 없으면 grpPending.pages에 두고, 화면(group.js)이 사이트 편집본을 만들 때 옮긴다 */
    d.lsite = d.lsite || {}; if (Array.isArray(d.lsite.pages)) return d.lsite.pages; d.grpPending = d.grpPending || {}; return (d.grpPending.pages = Array.isArray(d.grpPending.pages) ? d.grpPending.pages : []); };
  const pageDraft = item => { item.on = false; item.draft = true; item.sections = (Array.isArray(item.sections) ? item.sections : []).map(x => ({ ...(x || {}), on: true })); return item; };

  /* ── 대시보드 계산(1-7) ── */
  const DEF_KPI = { franchise: ['lrn', 'act', 'cmpRateBp', 'rev', 'aiCalls', 'new'], univ: ['lrn', 'cmpRateBp', 'progBp', 'aiCalls', 'crs', 'act'], region: ['lrn', 'crs', 'cmpRateBp', 'new', 'aiCalls', 'act'] };
  async function dash(g, q) {
    const { from, to } = range(q); const unit = ['day', 'week', 'month'].includes(q.get('unit')) ? q.get('unit') : 'week'; const tid = q.get('tid');
    const kpis = (q.get('kpi') ? q.get('kpi').split(',').filter(k => K.KPIS.includes(k)) : null) || DEF_KPI[g.kind];
    const { links, rows, rules } = await tx(async c => ({ links: await activeLinks(c, g.id), rows: (await c.query("select child_tid, to_char(day, 'YYYY-MM-DD') as day, v, at from grp_kpi_day where group_id = $1 and day between $2::date and $3::date", [g.id, from, to])).rows, rules: (await c.query('select * from grp_rule where group_id = $1 order by n', [g.id])).rows }));
    const L = tid ? links.filter(l => l.child_tid === tid) : links; const yest = K.addDays(today(), -1); const stale = []; let asOf = null;
    const children = L.map(l => { const R = rows.filter(r => r.child_tid === l.child_tid); for (const r of R) if (!asOf || r.at > asOf) asOf = r.at; const raw = K.combine(R) || {}; const m = K.mask(raw, l.share);
      const last = R.reduce((x, r) => (r.day > x ? r.day : x), ''); if (!last || last < yest) stale.push({ tid: l.child_tid, lastDay: last || null });
      return { tid: l.child_tid, label: l.label, unit: l.unit, v: m.v, masked: m.masked, noConsent: m.noConsent, rank: {}, flags: K.flags(m.v, rules), _raw: raw }; });
    K.ranks(children, kpis); const total = tid ? null : K.total(children.map(x => ({ raw: x._raw, noConsent: x.noConsent })));
    const B = [...new Set(rows.map(r => K.bucket(r.day, unit)))].sort(); const keep = new Set(L.map(l => l.child_tid));
    const series = B.map(b => { const part = L.map(l => { const raw = K.combine(rows.filter(r => r.child_tid === l.child_tid && keep.has(r.child_tid) && K.bucket(r.day, unit) === b)) || {}; return { raw, noConsent: K.mask(raw, l.share).noConsent }; }); const t = K.total(part); return { at: b, lrn: t.lrn, act: t.act }; });
    children.forEach(x => { delete x._raw; });
    return { range: { from, to, unit }, asOf: asOf ? iso(asOf) : null, kpis, total, children, series, stale };
  }

  const R = {};
  const P = [
    /* ── 산타 관리자(1-3) ── */
    ['GET', /^\/api\/group\/admin\/groups$/, async req => { await needSanta(req); const q = Q(req); const qs = str(q.get('q'), 40);
      const G = await tx(async c => { const L = (await c.query('select * from grp_group order by created_at, id')).rows; const out = []; for (const g of L) out.push({ g, n: await counts(c, g.id) }); return out; });
      const N = await names(G.map(x => x.g.owner_tid)); const items = G.map(({ g, n }) => ({ gid: g.id, ownerTid: g.owner_tid, ownerName: (N.get(g.owner_tid) || {}).name || '', kind: g.kind, name: g.name, pilot: g.pilot, detail: g.detail, status: g.status, links: n })).filter(x => !qs || x.name.includes(qs) || x.ownerName.includes(qs));
      return pageOf(q, items); }],
    ['POST', /^\/api\/group\/admin\/groups$/, async req => { const a = await needSanta(req); const b = await body(req);
      if (!C.kinds[b.kind]) throw E('grp_kind'); const name = str(b.name, 41).trim(); if (!name || name.length > 40) throw new HttpErr(400, '묶음 이름은 1~40자로 적어 주십시오.', 'grp_name');
      if (!TID.test(String(b.ownerTid || '')) || !(await pool.query('select 1 from tenants where id = $1', [b.ownerTid])).rowCount) throw new HttpErr(404, '없는 기관입니다.', 'not_found');
      return tx(c => idem(c, a.tid, 'admin-groups', b.idem, async () => {
        if (await q1(c, 'select 1 from grp_group where owner_tid = $1', [b.ownerTid])) throw E('grp_exists');
        const g = await q1(c, 'insert into grp_group (id, owner_tid, kind, name, pilot, salt, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning *', [rid('gp_'), b.ownerTid, b.kind, name, b.pilot !== false, require('node:crypto').randomBytes(32).toString('hex'), a.email]);
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.admin.create' }); const nm = await tenantName(g.owner_tid);
        return { group: { ...groupOut(g), ownerTid: g.owner_tid, ownerName: nm.name, links: { active: 0, invited: 0 } } }; })); }],
    ['PATCH', /^\/api\/group\/admin\/groups\/(gp_[a-z0-9]{12})$/, async (req, gid) => { const a = await needSanta(req); const b = await body(req);
      return tx(c => idem(c, a.tid, 'admin-patch:' + gid, b.idem, async () => { const g = await q1(c, 'select * from grp_group where id = $1 for update', [gid]); if (!g) throw new HttpErr(404, '없는 기관 묶음입니다.', 'not_found');
        if (b.status != null && !['active', 'closed'].includes(b.status)) throw E('grp_state');
        const x = await q1(c, 'update grp_group set pilot = coalesce($2, pilot), detail = coalesce($3, detail), status = coalesce($4, status), name = coalesce($5, name) where id = $1 returning *', [gid, typeof b.pilot === 'boolean' ? b.pilot : null, typeof b.detail === 'boolean' ? b.detail : null, b.status || null, b.name ? str(b.name, 40).trim() : null]);
        await gaudit(c, { gid, actor: a.email, actorTid: a.tid, action: 'grp.admin.patch', target: JSON.stringify({ pilot: b.pilot, detail: b.detail, status: b.status }) }); return { group: { ...groupOut(x), ownerTid: x.owner_tid, links: await counts(c, gid) } }; })); }],
    ['POST', /^\/api\/group\/admin\/rebuild$/, async req => { const a = await needSanta(req); const b = await body(req); const q = new URLSearchParams({ from: b.from || '', to: b.to || '' }); const { from, to } = range(q);
      if (daysBetween(from, to) > 92) throw E('grp_range', null, '집계 다시 만들기는 최대 92일까지 합니다.'); const gid = String(b.gid || '');
      return tx(c => idem(c, a.tid, 'rebuild:' + gid, b.idem, async () => { if (!(await q1(c, 'select 1 from grp_group where id = $1', [gid]))) throw new HttpErr(404, '없는 기관 묶음입니다.', 'not_found');
        const days = []; for (let d = from; d <= to; d = K.addDays(d, 1)) days.push(d); const n = await S.snap.group(gid, days); return { queued: n }; })); }],

    /* ── 상위 기관(1-4) ── */
    ['GET', /^\/api\/group\/me$/, async req => { const a = await need(req); const g = await tx(c => q1(c, 'select * from grp_group where owner_tid = $1', [a.tid])); if (!g) return { group: null };
      scopeSet(a.tid, g.id, false); const roles = g.pilot && g.status === 'active' ? await rolesOf(a, g) : []; const n = await tx(c => counts(c, g.id));
      return { group: groupOut(g), me: { role: roles[0] || null, roles, perms: permsOf(roles) }, counts: n }; }],
    ['PATCH', /^\/api\/group\/me$/, async req => { const { a, g } = await needGrp(req, 'staff'); const b = await body(req);
      return tx(c => idem(c, a.tid, 'me', b.idem, async () => { const t = b.targets && typeof b.targets === 'object' ? Object.fromEntries(['cmpRateBp', 'actRateBp', 'progBp'].filter(k => Number.isInteger(b.targets[k]) && b.targets[k] >= 0 && b.targets[k] <= 10000).map(k => [k, b.targets[k]])) : null;
        const x = await q1(c, 'update grp_group set name = coalesce($2, name), targets = coalesce($3, targets) where id = $1 returning *', [g.id, b.name ? str(b.name, 40).trim() : null, t ? JSON.stringify(t) : null]);
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.me' }); return { group: groupOut(x) }; })); }],
    ['POST', /^\/api\/group\/refresh$/, async req => { const { a, g } = await needGrp(req, 'view'); const b = await body(req);
      return tx(c => idem(c, a.tid, 'refresh', b.idem, async () => { lim(`grp-refresh:${g.id}`, 1, 600e3); const n = await S.snap.group(g.id, [today()]); return { ok: true, n }; })); }],
    ['GET', /^\/api\/group\/staff$/, async req => { const { a, g } = await needGrp(req, 'staff');
      const rows = (await tx(c => c.query("select user_id, role, to_char(at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') at from grp_staff where group_id = $1", [g.id]))).rows;
      const U = (await pool.query('select id, email, role from users where tenant_id = $1 order by email', [a.tid])).rows; const items = [];
      for (const u of U) { const rs = rows.filter(r => r.user_id === u.id); if (u.role === 'owner') items.push({ email: u.email, role: 'grp_admin', auto: true, at: null }); for (const r of rs) if (!(u.role === 'owner' && r.role === 'grp_admin')) items.push({ email: u.email, role: r.role, at: r.at }); }
      return { items, users: U.map(u => ({ email: u.email, tenantRole: u.role })) }; }],
    ['PUT', /^\/api\/group\/staff$/, async req => { const { a, g } = await needGrp(req, 'staff'); const b = await body(req); const email = String(b.email || '').trim().toLowerCase();
      const roles = b.roles !== undefined ? b.roles : b.role === null ? [] : [b.role]; if (!Array.isArray(roles) || roles.some(r => !ROLE_PERMS[r])) throw new HttpErr(400, '통합 센터 역할이 올바르지 않습니다.', 'grp_staff_role');
      const u = (await pool.query('select id, role from users where tenant_id = $1 and lower(email) = $2', [a.tid, email])).rows[0]; if (!u) throw E('grp_staff_tenant');
      return tx(c => idem(c, a.tid, 'staff:' + email, b.idem, async () => {
        if (u.role === 'owner' && !roles.includes('grp_admin') && b.roles !== undefined) throw E('grp_last_admin');
        if (u.role === 'owner' && b.role === null) throw E('grp_last_admin');
        if (b.roles !== undefined || b.role === null) await c.query('delete from grp_staff where group_id = $1 and user_id = $2', [g.id, u.id]);
        for (const r of roles) await c.query('insert into grp_staff (group_id, user_id, role, by) values ($1,$2,$3,$4) on conflict do nothing', [g.id, u.id, r, a.email]);
        const left = (await c.query("select count(*)::int n from grp_staff where group_id = $1 and role = 'grp_admin'", [g.id])).rows[0].n + (await pool.query("select count(*)::int n from users where tenant_id = $1 and role = 'owner'", [a.tid])).rows[0].n; if (!left) throw E('grp_last_admin');
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.staff', target: email, fields: roles });
        const rs = (await c.query('select role from grp_staff where group_id = $1 and user_id = $2 order by role', [g.id, u.id])).rows.map(r => r.role); return { items: [{ email, roles: rs }] }; })); }],
    ['GET', /^\/api\/group\/links$/, async req => { const { g } = await needGrp(req, 'view'); const q = Q(req); const ST = { active: ['active'], invited: ['invited'], ended: ['declined', 'expired', 'left', 'removed'] }[q.get('status')] || ['active', 'invited', 'declined', 'expired', 'left', 'removed'];
      const { L, last } = await tx(async c => ({ L: (await c.query('select * from grp_link where group_id = $1 and status = any($2) order by invited_at desc, id', [g.id, ST])).rows, last: new Map((await c.query("select child_tid, to_char(max(day), 'YYYY-MM-DD') d from grp_kpi_day where group_id = $1 group by child_tid", [g.id])).rows.map(r => [r.child_tid, r.d])) }));
      const N = await names(L.map(l => l.child_tid)); const qs = str(q.get('q'), 40);
      return { items: L.map(l => ({ ...linkOut(l, N.get(l.child_tid)), lastDay: l.status === 'active' ? last.get(l.child_tid) || null : null, expiresAt: l.status === 'invited' ? iso(l.expires_at) : null })).filter(x => !qs || x.label.includes(qs) || x.childName.includes(qs)) }; }],
    ['POST', /^\/api\/group\/invites$/, async req => { const { a, g } = await needGrp(req, 'invite'); const b = await body(req);
      const label = str(b.label, 41).trim(); if (!label || label.length > 40) throw new HttpErr(400, '소속 기관 이름은 1~40자로 적어 주십시오.', 'grp_label'); if (!(C.kinds[g.kind] || []).includes(b.unit)) throw E('grp_unit');
      const ask = shareIn(g.kind, b.ask || {}); const to = b.to && b.to.tid ? String(b.to.tid) : null; if (to === a.tid) throw E('grp_self'); if (to && !TID.test(to)) throw new HttpErr(404, '없는 기관입니다.', 'not_found');
      return tx(c => idem(c, a.tid, 'invites', b.idem, async () => { lim(`grp-invite:${g.id}`, 30, 3600e3);
        if (to && !(await pool.query('select 1 from tenants where id = $1', [to])).rowCount) throw new HttpErr(404, '없는 기관입니다.', 'not_found');
        if (to && await q1(c, "select 1 from grp_link where group_id = $1 and child_tid = $2 and status in ('invited','active')", [g.id, to])) throw E('grp_child');
        const AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const pick = () => Array.from(require('node:crypto').randomBytes(4), x => AB[x % AB.length]).join(''); const code = `GRP-${pick()}-${pick()}`;
        const l = await q1(c, "insert into grp_link (id, group_id, owner_tid, child_tid, label, unit, status, code_hash, invite_to, expires_at, ask, invited_by) values ($1,$2,$3,$4,$5,$6,'invited',$7,$4,now() + interval '14 days',$8,$9) returning *",
          [rid('gl_'), g.id, a.tid, to, label, b.unit, sha('grp|' + code), JSON.stringify(ask), a.email]);
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.invite', childTid: to, target: l.id }); return { linkId: l.id, code, expiresAt: iso(l.expires_at) }; })); }],
    ['DELETE', /^\/api\/group\/invites\/(gl_[a-z0-9]{12})$/, async (req, id) => { const { a, g } = await needGrp(req, 'invite'); const b = await body(req);
      return tx(c => idem(c, a.tid, 'invite-del:' + id, b.idem, async () => { const x = await q1(c, "update grp_link set status = 'expired', ended_by = $3, ended_at = now(), end_reason = 'cancel' where id = $1 and group_id = $2 and status = 'invited' returning id", [id, g.id, a.email]); if (!x) throw E('grp_state');
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.invite.cancel', target: id }); return { ok: true }; })); }],
    ['POST', /^\/api\/group\/links\/(gl_[a-z0-9]{12})\/remove$/, async (req, id) => { const { a, g } = await needGrp(req, 'invite'); const b = await body(req); const why = reason(b);
      const out = await tx(c => idem(c, a.tid, 'remove:' + id, b.idem, async () => { const x = await q1(c, "update grp_link set status = 'removed', ended_by = $3, ended_at = now(), end_reason = $4 where id = $1 and group_id = $2 and status = 'active' returning *", [id, g.id, a.email, why]); if (!x) throw E('grp_state');
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.remove', childTid: x.child_tid, purpose: why }); const N = await names([x.child_tid]); return { link: linkOut(x, N.get(x.child_tid)), _end: x }; }));
      if (out._end && !out.again) { await endLink(out._end); await tlog(out._end.child_tid, a.email, 'grp.removed', { group: g.id, reason: why }); } delete out._end; return out; }],
    ['GET', /^\/api\/group\/dash$/, async req => { const { a, g } = await needGrp(req, 'view'); lim(`grp-dash:${a.email}`, 60, 60e3); const out = await dash(g, Q(req));
      await tx(c => gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.dash', childTid: Q(req).get('tid') || null, target: `${out.range.from}~${out.range.to}`, ip: ipOf(req) })); return out; }],
    ['GET', /^\/api\/group\/dash\/export$/, async (req, res) => { const { a, g } = await needGrp(req, 'export'); lim(`grp-dash:${a.email}`, 60, 60e3); const q = Q(req); const d = await dash(g, q);
      const at = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' '); const cell = v => { const s = v == null ? '—' : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
      const keys = d.kpis; const lines = [`# 가명 집계 · 5명 미만 가림 · 내려받은 사람 ${a.email} · ${at} KST · 기간 ${d.range.from}~${d.range.to}`, ['소속 기관', '구분', ...keys].map(cell).join(',')];
      for (const x of d.children) lines.push([x.label, x.unit, ...keys.map(k => x.noConsent.includes(k) ? '비공개' : x.v[k])].map(cell).join(','));
      if (d.total) lines.push(['합계', '', ...keys.map(k => d.total[k])].map(cell).join(','));
      await tx(c => gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.export', target: `${d.range.from}~${d.range.to}`, ip: ipOf(req) }));
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="group-${d.range.from}-${d.range.to}.csv"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end('﻿' + lines.join('\r\n') + '\r\n'); }],
    ['GET', /^\/api\/group\/rules$/, async req => { const { g } = await needGrp(req, 'view'); const rules = (await tx(c => c.query('select n, kpi, op, value::float8 value, period, label from grp_rule where group_id = $1 order by n', [g.id]))).rows; return { rules }; }],
    ['PUT', /^\/api\/group\/rules$/, async req => { const { a, g } = await needGrp(req, 'staff'); const b = await body(req); const L = Array.isArray(b.rules) ? b.rules : null;
      if (!L || L.length > 20 || L.some(r => !r || !K.KPIS.includes(r.kpi) || !['lt', 'gt'].includes(r.op) || !Number.isFinite(+r.value) || r.value === '' || r.value === null || !['week', 'month'].includes(r.period) || !str(r.label, 40).trim())) throw E('grp_rule');
      return tx(c => idem(c, a.tid, 'rules', b.idem, async () => { await c.query('delete from grp_rule where group_id = $1', [g.id]);
        let n = 0; for (const r of L) await c.query('insert into grp_rule (group_id, n, kpi, op, value, period, label) values ($1,$2,$3,$4,$5,$6,$7)', [g.id, ++n, r.kpi, r.op, +r.value, r.period, str(r.label, 40).trim()]);
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.rules', target: String(L.length) }); return { rules: (await c.query('select n, kpi, op, value::float8 value, period, label from grp_rule where group_id = $1 order by n', [g.id])).rows }; })); }],
    ['GET', /^\/api\/group\/learners\/summary$/, async req => { const { a, g } = await needGrp(req, 'view'); const q = Q(req); const rg = range(q, 28); if (g.kind === 'franchise') throw E('grp_consent');
      const { links, lx } = await tx(async c => ({ links: await activeLinks(c, g.id), lx: (await c.query('select gkey, child_tid, dept from grp_lx where group_id = $1', [g.id])).rows }));
      const agreed = links.filter(l => l.share && l.share.learnerAgg); await tx(c => gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.learners', target: `${rg.from}~${rg.to}`, ok: agreed.length > 0, ip: ipOf(req) }));
      if (!agreed.length) throw E('grp_consent');
      const ok = new Set(agreed.map(l => l.child_tid)); const X = lx.filter(r => ok.has(r.child_tid)); const M = (n) => (n >= 1 && n <= 4 ? K.UNDER5 : n);
      if (g.kind === 'region') return { range: rg, basis: 'unifiedId', unified: null, multi: null, byChild: agreed.map(l => ({ tid: l.child_tid, label: l.label, lrn: M(X.filter(r => r.child_tid === l.child_tid).length), shared: null })), byDept: [], flows: [], consent: { agreed: agreed.length, total: links.length } };
      const by = new Map(); for (const r of X) { const s = by.get(r.gkey) || new Set(); s.add(r.child_tid); by.set(r.gkey, s); }
      const multi = { 1: 0, 2: 0, '3+': 0 }; for (const s of by.values()) multi[s.size >= 3 ? '3+' : s.size]++;
      const byChild = agreed.map(l => { const mine = X.filter(r => r.child_tid === l.child_tid); return { tid: l.child_tid, label: l.label, lrn: M(mine.length), shared: M(mine.filter(r => by.get(r.gkey).size > 1).length) }; });
      const gd = new Map(); for (const r of X) if (r.dept && !gd.has(r.gkey)) gd.set(r.gkey, r.dept); const dept = new Map(); for (const d0 of gd.values()) dept.set(d0, (dept.get(d0) || 0) + 1);
      const lab = new Map(agreed.map(l => [l.child_tid, l.label])); const fl = new Map();
      for (const s of by.values()) { const A = [...s].sort(); for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const k = A[i] + '|' + A[j]; fl.set(k, (fl.get(k) || 0) + 1); } }
      const flows = K.fold([...fl.entries()].map(([k, n]) => { const [f, t] = k.split('|'); return { from: lab.get(f), to: lab.get(t), n }; }), 'from', 'n', '(5명 미만 묶음)');
      return { range: rg, basis: 'studentNo', unified: M(by.size), multi: Object.fromEntries(Object.entries(multi).map(([k, v]) => [k, M(v)])), byChild,
        byDept: K.fold([...dept.entries()].map(([d, n]) => ({ dept: d, lrn: n })).sort((x, y) => y.lrn - x.lrn), 'dept', 'lrn', '(5명 미만 학과 묶음)'), flows, consent: { agreed: agreed.length, total: links.length } }; }],
    ['POST', /^\/api\/group\/learners\/lookup$/, async req => { const { a, g, perms } = await needGrp(req); const b = await body(req);
      const fail = async (code, extra) => { await tx(c => gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.learner.lookup', ok: false, target: code, ip: ipOf(req) })).catch(() => {}); throw E(code, extra); };
      if (!g.detail) await fail('grp_detail_off'); if (!perms.includes('learner')) await fail('grp_role');
      try { await needFresh(a); } catch (e) { await fail('grp_mfa', { mfa: 'required' }); }
      const purpose = str(b.purpose, 201).trim(); if (purpose.length < 10 || purpose.length > 200) await fail('grp_purpose');
      const no = String((b.key && b.key.studentNo) || '').replace(/\D/g, ''); if (!no || no.length > 20) throw new HttpErr(400, '학번을 입력해 주십시오.', 'grp_key');
      lim(`grp-lookup:${a.email}`, 30, 3600e3); lim(`grp-lookup-day:${g.id}`, 200, 864e5);
      return tx(c => idem(c, a.tid, 'lookup', b.idem, async () => {
        const links = await activeLinks(c, g.id); const ok = links.filter(l => l.share && l.share.learnerDetail && l.share.learnerDetail.on); if (!ok.length) await fail('grp_consent');
        const gk = gkey(g.salt, no).slice(0, 10); await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.learner.lookup', target: gk, purpose, ip: ipOf(req) });
        const items = [];
        for (const l of ok) { const F = l.share.learnerDetail.fields || []; const d = await docOf(l.child_tid); const m = (d.members || []).find(x => x && !x.withdrawn && String(x.sid || '').replace(/\D/g, '') === no); if (!m) continue;
          const codes = (d.codes || []).find(x => x && x.sid === m.sid) || {}; const fields = {};
          if (F.includes('studentNo')) fields.studentNo = String(m.sid); if (F.includes('dept')) fields.dept = str(m.dept || codes.dept || '', 40);
          if (F.includes('courses')) fields.courses = (d.classes || []).filter(c0 => c0 && (c0.learners || []).includes(m.id)).map(c0 => { const p = ((c0.prog || {})[m.id]) || {}; const pv = Math.max(0, Math.min(100, +p.p || 0)); return { title: str(c0.name, 80), term: str(c0.term || (c0.start || '').slice(0, 7), 20), progressBp: Math.round(pv * 100), done: !!p.done || pv >= 100 }; });
          items.push({ childTid: l.child_tid, label: l.label, fields });
          await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.learner.view', childTid: l.child_tid, target: gk, purpose, fields: F, ip: ipOf(req) });
          await tlog(l.child_tid, a.email, 'grp.learner.view', { group: g.id, purpose, fields: F, key: gk }); }
        return { items, hidden: links.length - ok.length }; })); }],
    ['GET', /^\/api\/group\/shares$/, async req => { const { g } = await needGrp(req, 'view'); const q = Q(req); const dir = ['down', 'up'].includes(q.get('dir')) ? q.get('dir') : 'down';
      return tx(async c => { const live = (await activeLinks(c, g.id)).map(l => l.child_tid); const L = (await c.query('select id, group_id, dir, from_tid, kind, title, ver, required, targets, status, note from grp_share where group_id = $1 and dir = $2' + (q.get('status') ? ' and status = $3' : '') + ' order by updated_at desc', q.get('status') ? [g.id, dir, q.get('status')] : [g.id, dir])).rows;
        const items = []; for (const s of L) items.push(shareOut(s, await tgtStats(c, s, live))); return { items }; }); }],
    ['POST', /^\/api\/group\/shares$/, async req => { const { a, g } = await needGrp(req, 'content'); const b = await body(req); if (!['course', 'page', 'notice'].includes(b.kind)) throw E('grp_source');
      const src = sourceOf(await docOf(a.tid), b.kind, b.source);
      return tx(c => idem(c, a.tid, 'shares', b.idem, async () => { const live = (await activeLinks(c, g.id)).map(l => l.child_tid); const targets = b.targets === 'all' || !Array.isArray(b.targets) ? 'all' : b.targets.map(String).filter(t => live.includes(t));
        const s = await q1(c, "insert into grp_share (id, group_id, dir, from_tid, kind, title, snap, lic, required, targets, status, note, by) values ($1,$2,'down',$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11) returning *",
          [rid('gs_'), g.id, a.tid, b.kind, str(b.title, 80).trim() || src.title, JSON.stringify(src.snap), JSON.stringify({ origin: 'own', mk: false, src: { kind: b.kind, id: src.id } }), !!b.required, JSON.stringify(targets), str(b.note, 300) || null, a.email]);
        await c.query('insert into grp_share_ver (share_id, group_id, ver, snap, note) values ($1,$2,1,$3,$4)', [s.id, g.id, s.snap, s.note]);
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.share.create', target: s.id }); return { share: shareOut(s, await tgtStats(c, s, live)) }; })); }],
    ['POST', /^\/api\/group\/shares\/(gs_[a-z0-9]{12})\/(publish|version|recall)$/, async (req, sid, act) => { const { a, g } = await needGrp(req, 'content'); const b = await body(req);
      const why = act === 'recall' ? reason(b) : null; const mode = b.mode === 'notify' ? 'notify' : 'hide';
      const fresh = act === 'version' ? await (async () => { const s0 = await tx(c => q1(c, 'select kind, lic from grp_share where id = $1 and group_id = $2 and dir = $3', [sid, g.id, 'down'])); if (!s0 || !s0.lic || !s0.lic.src) throw E('grp_state'); return sourceOf(await docOf(a.tid), s0.kind, { courseId: s0.lic.src.id }); })() : null;
      const out = await tx(c => idem(c, a.tid, act + ':' + sid, b.idem, async () => { const s = await q1(c, "select * from grp_share where id = $1 and group_id = $2 and dir = 'down' for update", [sid, g.id]); if (!s) throw E('grp_state');
        const live = (await activeLinks(c, g.id)).map(l => l.child_tid); let x, hide = [];
        if (act === 'publish') { if (s.status !== 'draft') throw E('grp_state'); x = await q1(c, "update grp_share set status = 'published', updated_at = now() where id = $1 returning *", [sid]);
          const want = s.targets === 'all' ? live : live.filter(t => s.targets.includes(t)); for (const t of want) await c.query("insert into grp_share_tgt (share_id, group_id, child_tid, status) values ($1,$2,$3,'offered') on conflict do nothing", [sid, g.id, t]); }
        else if (act === 'version') { if (!['draft', 'published'].includes(s.status)) throw E('grp_ver');
          x = await q1(c, 'update grp_share set ver = ver + 1, snap = $2, note = coalesce($3, note), updated_at = now() where id = $1 returning *', [sid, JSON.stringify(fresh.snap), str(b.note, 300) || null]);
          await c.query('insert into grp_share_ver (share_id, group_id, ver, snap, note) values ($1,$2,$3,$4,$5)', [sid, g.id, x.ver, x.snap, str(b.note, 300) || null]); await c.query('delete from grp_share_ver where share_id = $1 and ver <= $2', [sid, x.ver - 10]); }
        else { if (s.status !== 'published') throw E('grp_state'); x = await q1(c, "update grp_share set status = 'recalled', note = $2, updated_at = now() where id = $1 returning *", [sid, why]);
          hide = (await c.query("update grp_share_tgt set status = 'recalled', at = now() where share_id = $1 and status in ('offered','adopted') returning child_tid, local_id", [sid])).rows.filter(r => r.local_id); }
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.share.' + act, target: sid, purpose: why }); return { share: shareOut(x, await tgtStats(c, x, live)), _hide: mode === 'hide' && x.required ? hide : [] }; }));
      for (const h of out._hide || []) await docEdit(h.child_tid, d => hideLocal(d, [h.local_id])).catch(() => {}); delete out._hide; return out; }],
    ['GET', /^\/api\/group\/shares\/(gs_[a-z0-9]{12})\/targets$/, async (req, sid) => { const { g } = await needGrp(req, 'view');
      return tx(async c => { const s = await q1(c, 'select * from grp_share where id = $1 and group_id = $2', [sid, g.id]); if (!s) throw E('grp_state'); const links = await activeLinks(c, g.id); const rows = (await c.query('select * from grp_share_tgt where share_id = $1', [sid])).rows;
        const want = s.status === 'draft' ? [] : (s.targets === 'all' ? links.map(l => l.child_tid) : links.map(l => l.child_tid).filter(t => s.targets.includes(t))); const set = [...new Set([...want, ...rows.map(r => r.child_tid)])]; const lab = new Map(links.map(l => [l.child_tid, l.label]));
        return { items: set.map(t => { const r = rows.find(x => x.child_tid === t); return { childTid: t, label: lab.get(t) || '', status: r ? r.status : 'offered', ver: r ? r.ver : null, adoptedAt: r && r.status === 'adopted' ? iso(r.at) : null, outdated: !!(r && r.status === 'adopted' && r.ver < s.ver) }; }) }; }); }],
    ['POST', /^\/api\/group\/requests\/(gs_[a-z0-9]{12})\/(approve|reject)$/, async (req, sid, act) => { const { a, g } = await needGrp(req, 'content'); const b = await body(req);
      return tx(c => idem(c, a.tid, 'req-' + act + ':' + sid, b.idem, async () => { const s = await q1(c, "select * from grp_share where id = $1 and group_id = $2 and dir = 'up' for update", [sid, g.id]); if (!s || s.status !== 'requested') throw E('grp_state');
        const live = (await activeLinks(c, g.id)).map(l => l.child_tid);
        if (act === 'reject') { const x = await q1(c, "update grp_share set status = 'rejected', note = $2, updated_at = now() where id = $1 returning *", [sid, str(b.reason, 200) || null]); await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.request.reject', childTid: s.from_tid, target: sid }); return { share: shareOut(x) }; }
        if (s.lic && s.lic.mk) throw E('grp_license'); const x = await q1(c, "update grp_share set status = 'approved', updated_at = now() where id = $1 returning *", [sid]); let re = null;
        if (b.redistribute) { const targets = b.targets === 'all' || !Array.isArray(b.targets) ? 'all' : b.targets.map(String).filter(t => live.includes(t));
          re = await q1(c, "insert into grp_share (id, group_id, dir, from_tid, kind, title, snap, lic, required, targets, status, note, by) values ($1,$2,'down',$3,$4,$5,$6,$7,$8,$9,'published',$10,$11) returning *", [rid('gs_'), g.id, a.tid, s.kind, s.title, JSON.stringify(s.snap), JSON.stringify({ origin: 'group', mk: false, from: s.from_tid, req: sid }), !!b.required, JSON.stringify(targets), s.note, a.email]);
          await c.query('insert into grp_share_ver (share_id, group_id, ver, snap) values ($1,$2,1,$3)', [re.id, g.id, re.snap]);
          for (const t of (targets === 'all' ? live : targets)) await c.query("insert into grp_share_tgt (share_id, group_id, child_tid, status) values ($1,$2,$3,'offered') on conflict do nothing", [re.id, g.id, t]); }
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.request.approve', childTid: s.from_tid, target: sid }); return { share: shareOut(x), ...(re ? { redistributed: shareOut(re, await tgtStats(c, re, live)) } : {}) }; })); }],
    ['GET', /^\/api\/group\/policies$/, async req => { const { g } = await needGrp(req, 'view');
      return tx(async c => { const n = (await activeLinks(c, g.id)).length; const L = (await c.query('select * from grp_policy where group_id = $1 order by key', [g.id])).rows; const A = (await c.query("select a.* from grp_policy_apply a where a.group_id = $1 and exists (select 1 from grp_link l where l.group_id = a.group_id and l.child_tid = a.child_tid and l.status = 'active')", [g.id])).rows;
        return { items: L.map(p => { const R0 = A.filter(x => x.key === p.key); const ap = R0.filter(x => x.state === 'applied' && x.ver === p.ver).length, ov = R0.filter(x => x.state === 'overridden').length; return { key: p.key, ver: p.ver, lock: p.lock, value: p.value, applied: { total: n, applied: ap, overridden: ov, pending: Math.max(0, n - ap - ov) } }; }) }; }); }],
    ['PUT', /^\/api\/group\/policies\/([a-z]{2,8})$/, async (req, key) => { const { a, g } = await needGrp(req, 'policy'); if (!C.policyKeys.includes(key)) throw E('grp_policy_key'); const b = await body(req);
      if (!['locked', 'default'].includes(b.lock) || !b.value || typeof b.value !== 'object') throw new HttpErr(400, '공통 설정 값 · 잠금 여부를 확인해 주십시오.', 'grp_policy_value'); if (Buffer.byteLength(JSON.stringify(b.value)) > 262144) throw E('grp_size');
      return tx(c => idem(c, a.tid, 'policy:' + key, b.idem, async () => { const cur = await q1(c, 'select ver from grp_policy where group_id = $1 and key = $2 for update', [g.id, key]); if ((cur ? cur.ver : 0) !== (Number.isInteger(b.baseVer) ? b.baseVer : -1)) throw E('grp_ver', { ver: cur ? cur.ver : 0 });
        const p = await q1(c, 'insert into grp_policy (group_id, key, ver, lock, value, by) values ($1,$2,1,$3,$4,$5) on conflict (group_id, key) do update set ver = grp_policy.ver + 1, lock = excluded.lock, value = excluded.value, by = excluded.by, at = now() returning *', [g.id, key, b.lock, JSON.stringify(b.value), a.email]);
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.policy', target: `${key}@${p.ver}` }); return { policy: { key, ver: p.ver, lock: p.lock, value: p.value } }; })); }],
    ['POST', /^\/api\/group\/policies\/([a-z]{2,8})\/apply$/, async (req, key) => { const { a, g } = await needGrp(req, 'policy'); if (!C.policyKeys.includes(key)) throw E('grp_policy_key'); const b = await body(req);
      const out = await tx(c => idem(c, a.tid, 'apply:' + key, b.idem, async () => { const p = await q1(c, 'select * from grp_policy where group_id = $1 and key = $2', [g.id, key]); if (!p) throw E('grp_state');
        const links = await activeLinks(c, g.id); const want = b.targets === 'all' || !Array.isArray(b.targets) ? links : links.filter(l => b.targets.includes(l.child_tid)); const skipped = [], todo = [];
        for (const l of want) { const ap = await q1(c, 'select state from grp_policy_apply where group_id = $1 and child_tid = $2 and key = $3', [g.id, l.child_tid, key]);
          if (ap && ap.state === 'overridden' && p.lock === 'default') { skipped.push({ childTid: l.child_tid, reason: 'overridden' }); continue; }
          await c.query("insert into grp_policy_apply (group_id, child_tid, key, ver, state) values ($1,$2,$3,$4,'applied') on conflict (group_id, child_tid, key) do update set ver = excluded.ver, state = 'applied', at = now()", [g.id, l.child_tid, key, p.ver]); todo.push(l.child_tid); }
        await gaudit(c, { gid: g.id, actor: a.email, actorTid: a.tid, action: 'grp.policy.apply', target: `${key}@${p.ver}`, fields: todo }); return { applied: todo.length, skipped, _p: { ver: p.ver, lock: p.lock, value: p.value }, _todo: todo }; }));
      if (!out.again) for (const t of out._todo || []) await docEdit(t, d => { d.grpPolicy = d.grpPolicy && typeof d.grpPolicy === 'object' ? d.grpPolicy : {}; d.grpPolicy[g.id] = { ...(d.grpPolicy[g.id] || {}), [key]: { ...out._p, from: 'group' } }; }).catch(() => {});
      delete out._p; delete out._todo; return out; }],
    ['GET', /^\/api\/group\/audit$/, async req => { const { g } = await needGrp(req, 'audit'); const q = Q(req); const f = q.get('from'), t = q.get('to');
      const W = ['group_id = $1']; const A = [g.id]; if (f && DAY.test(f)) { A.push(f); W.push(`(at at time zone 'Asia/Seoul')::date >= $${A.length}::date`); } if (t && DAY.test(t)) { A.push(t); W.push(`(at at time zone 'Asia/Seoul')::date <= $${A.length}::date`); }
      for (const [k, col] of [['action', 'action'], ['actor', 'actor'], ['childTid', 'child_tid']]) if (q.get(k)) { A.push(str(q.get(k), 80)); W.push(`${col} = $${A.length}`); }
      const L = (await tx(c => c.query(`select at, actor, action, child_tid, target, purpose, ok from grp_audit where ${W.join(' and ')} order by id desc limit 2000`, A))).rows;
      return pageOf(q, L.map(r => ({ at: iso(r.at), actor: r.actor, action: r.action, childTid: r.child_tid, target: r.target || '', purpose: r.purpose || '', ok: r.ok }))); }],

    /* ── 소속 기관(1-5) ── */
    ['GET', /^\/api\/group\/my$/, async req => { const a = await needChild(req);
      const { L, G } = await tx(async c => { const L = (await c.query("select * from grp_link where child_tid = $1 and status in ('invited','active') order by invited_at", [a.tid])).rows; const G = (await c.query('select id, kind, name, owner_tid from grp_group where id = any($1)', [L.map(l => l.group_id)])).rows; return { L, G }; });
      const N = await names(G.map(g => g.owner_tid)); const gi = id => { const g = G.find(x => x.id === id) || {}; return { gid: g.id, name: g.name || '', kind: g.kind || '', ownerName: (N.get(g.owner_tid) || {}).name || '' }; };
      const now = Date.now(); const links = L.filter(l => l.status === 'active').map(l => ({ linkId: l.id, status: l.status, group: gi(l.group_id), label: l.label, unit: l.unit, share: shareOf(l.share), acceptedAt: iso(l.accepted_at) }));
      return { link: links[0] || null, links, invites: L.filter(l => l.status === 'invited' && new Date(l.expires_at).getTime() > now).map(l => ({ linkId: l.id, group: gi(l.group_id), label: l.label, unit: l.unit, ask: l.ask, expiresAt: iso(l.expires_at) })) }; }],
    ['POST', /^\/api\/group\/my\/accept$/, async req => { const a = await needChildOwner(req); const b = await body(req);
      if (b.agreeVer !== C.agreeVer) throw E('grp_terms'); if (!b.share || typeof b.share !== 'object') throw E('grp_terms');
      const out = await tx(c => idem(c, a.tid, 'accept', b.idem, async () => {
        let l;
        if (b.code) { const h = sha('grp|' + String(b.code).trim().toUpperCase()); const x = await txIn({ santa: true }, cc => q1(cc, 'select * from grp_link where code_hash = $1', [h]));
          if (!x || (x.child_tid && x.child_tid !== a.tid)) throw E('grp_invite_code'); if (x.owner_tid === a.tid) throw E('grp_self');
          if (x.status === 'expired' || (x.status === 'invited' && new Date(x.expires_at) < new Date())) throw E('grp_invite_expired'); if (x.status !== 'invited') throw E('grp_state');
          if (!x.child_tid) { if (await txIn({ santa: true }, cc => q1(cc, "select 1 from grp_link where group_id = $1 and child_tid = $2 and status in ('invited','active')", [x.group_id, a.tid]))) throw E('grp_child');
            await txIn({ santa: true }, cc => cc.query("update grp_link set child_tid = $2 where id = $1 and child_tid is null and status = 'invited'", [x.id, a.tid])); }
          l = await q1(c, 'select * from grp_link where id = $1 for update', [x.id]); }
        else { l = await q1(c, 'select * from grp_link where id = $1 and child_tid = $2 for update', [String(b.linkId || ''), a.tid]); if (!l) throw E('grp_invite_code'); if (l.status === 'invited' && new Date(l.expires_at) < new Date()) throw E('grp_invite_expired'); }
        if (!l || l.status !== 'invited') throw E(l && l.status === 'active' ? 'grp_child' : 'grp_state');
        const g = await q1(c, 'select kind from grp_group where id = $1', [l.group_id]); const share = { ...shareIn(g.kind, b.share, true), agreeVer: C.agreeVer, at: new Date().toISOString(), by: a.email };
        const x = await q1(c, "update grp_link set status = 'active', share = $2, agree_ver = $3, accepted_by = $4, accepted_at = now(), code_hash = null where id = $1 returning *", [l.id, JSON.stringify(share), C.agreeVer, a.email]);
        await gaudit(c, { gid: l.group_id, actor: a.email, actorTid: a.tid, action: 'grp.accept', childTid: a.tid, target: l.id, fields: Object.keys(share).filter(k => share[k] === true) });
        return { link: { linkId: x.id, status: x.status, label: x.label, unit: x.unit, share: shareOf(x.share), acceptedAt: iso(x.accepted_at) }, _l: x }; }));
      if (out._l && !out.again) { await tlog(a.tid, a.email, 'grp.accept', { group: out._l.group_id, share: out._l.share }); S.snap.one(out._l, today()).catch(() => {}); } delete out._l; return out; }],
    ['POST', /^\/api\/group\/my\/decline$/, async req => { const a = await needChildOwner(req); const b = await body(req);
      return tx(c => idem(c, a.tid, 'decline', b.idem, async () => { const x = await q1(c, "update grp_link set status = 'declined', ended_by = $3, ended_at = now() where id = $1 and child_tid = $2 and status = 'invited' returning *", [String(b.linkId || ''), a.tid, a.email]); if (!x) throw E('grp_state');
        await gaudit(c, { gid: x.group_id, actor: a.email, actorTid: a.tid, action: 'grp.decline', childTid: a.tid, target: x.id }); return { ok: true }; })); }],
    ['PUT', /^\/api\/group\/my\/share$/, async req => { const a = await needChildOwner(req); const b = await body(req); if (b.agreeVer !== C.agreeVer) throw E('grp_terms');
      return tx(c => idem(c, a.tid, 'share', b.idem, async () => { const l = await pick(c, a, b.linkId); const g = await q1(c, 'select kind from grp_group where id = $1', [l.group_id]);
        const share = { ...shareIn(g.kind, b.share, true), agreeVer: C.agreeVer, at: new Date().toISOString(), by: a.email };
        const x = await q1(c, 'update grp_link set share = $2, agree_ver = $3 where id = $1 returning *', [l.id, JSON.stringify(share), C.agreeVer]);
        await gaudit(c, { gid: l.group_id, actor: a.email, actorTid: a.tid, action: 'grp.share.scope', childTid: a.tid, fields: Object.keys(share).filter(k => share[k] === true) }); await tlog(a.tid, a.email, 'grp.share', { group: l.group_id, share });
        return { link: { linkId: x.id, status: x.status, share: shareOf(x.share) } }; })); }],
    ['POST', /^\/api\/group\/my\/leave$/, async req => { const a = await needChildOwner(req); const b = await body(req); const why = reason(b);
      const out = await tx(c => idem(c, a.tid, 'leave', b.idem, async () => { const l = await pick(c, a, b.linkId);
        const req0 = (await c.query("select count(*)::int n from grp_share_tgt t join grp_share s on s.id = t.share_id where t.child_tid = $1 and s.group_id = $2 and s.required and t.status = 'adopted'", [a.tid, l.group_id])).rows[0].n;
        const x = await q1(c, "update grp_link set status = 'left', ended_by = $2, ended_at = now(), end_reason = $3 where id = $1 returning *", [l.id, a.email, why]);
        await gaudit(c, { gid: l.group_id, actor: a.email, actorTid: a.tid, action: 'grp.leave', childTid: a.tid, purpose: why });
        return { link: { linkId: x.id, status: x.status, endedAt: iso(x.ended_at) }, ...(req0 ? { warn: { code: 'grp_required', required: req0, message: `필수 배포 콘텐츠 ${req0}건은 학습자 화면에서 숨김 처리됩니다(우리 기관이 만든 사본 · 수정본은 남습니다).` } } : {}), _l: x }; }));
      if (out._l && !out.again) { await endLink(out._l); await tlog(a.tid, a.email, 'grp.leave', { group: out._l.group_id, reason: why }); } delete out._l; return out; }],
    ['GET', /^\/api\/group\/my\/inbox$/, async req => { const a = await needChild(req); const q = Q(req);
      return tx(async c => { const L = (await c.query("select s.id, s.group_id, s.kind, s.title, s.ver, s.required, s.status sst, s.note, t.status tst, t.ver tver from grp_share s left join grp_share_tgt t on t.share_id = s.id and t.child_tid = $1 where s.dir = 'down' and s.status in ('published','recalled') order by s.updated_at desc", [a.tid])).rows;
        const G = new Map((await c.query('select id, name from grp_group where id = any($1)', [[...new Set(L.map(r => r.group_id))]])).rows.map(g => [g.id, g.name]));
        const items = L.map(r => ({ sid: r.id, gid: r.group_id, groupName: G.get(r.group_id) || '', kind: r.kind, title: r.title, ver: r.ver, required: r.required, status: r.sst === 'recalled' ? 'recalled' : r.tst || 'offered', myVer: r.tver || null, note: r.note || '', outdated: !!(r.tst === 'adopted' && r.tver < r.ver) })).filter(x => !q.get('status') || x.status === q.get('status'));
        return { items }; }); }],
    ['POST', /^\/api\/group\/my\/inbox\/(gs_[a-z0-9]{12})\/(adopt|update|decline)$/, async (req, sid, act) => { const a = await needChild(req); const b = await body(req);
      const out = await tx(c => idem(c, a.tid, act + ':' + sid, b.idem, async () => { const s = await q1(c, "select * from grp_share where id = $1 and dir = 'down'", [sid]); if (!s || s.status !== 'published') throw E('grp_state');
        const t = await q1(c, 'select * from grp_share_tgt where share_id = $1 and child_tid = $2 for update', [sid, a.tid]);
        if (act === 'decline') { if (s.required) throw E('grp_required'); if (t && t.status === 'adopted') throw E('grp_state');
          await c.query("insert into grp_share_tgt (share_id, group_id, child_tid, status) values ($1,$2,$3,'declined') on conflict (share_id, child_tid) do update set status = 'declined', at = now()", [sid, s.group_id, a.tid]);
          await gaudit(c, { gid: s.group_id, actor: a.email, actorTid: a.tid, action: 'grp.inbox.decline', childTid: a.tid, target: sid, purpose: str(b.reason, 200) || null }); return { ok: true }; }
        if (act === 'adopt' && t && t.status === 'adopted') return { localId: t.local_id, ver: t.ver };
        if (act === 'update' && (!t || t.status !== 'adopted')) throw E('grp_state'); if (act === 'update' && t.ver >= s.ver) throw E('grp_ver');
        const localId = (t && t.local_id) || `g${s.kind[0]}_${sid.slice(3)}`;
        await c.query("insert into grp_share_tgt (share_id, group_id, child_tid, status, ver, local_id) values ($1,$2,$3,'adopted',$4,$5) on conflict (share_id, child_tid) do update set status = 'adopted', ver = excluded.ver, local_id = excluded.local_id, at = now()", [sid, s.group_id, a.tid, s.ver, localId]);
        await gaudit(c, { gid: s.group_id, actor: a.email, actorTid: a.tid, action: 'grp.inbox.' + act, childTid: a.tid, target: `${sid}@${s.ver}` }); return { localId, ver: s.ver, _s: { kind: s.kind, snap: s.snap, gid: s.group_id, ver: s.ver } }; }));
      if (out._s && !out.again) { const { kind, snap, gid, ver } = out._s; await docEdit(a.tid, d => { const L = docItem(d, kind); const i = L.findIndex(x => x && x.id === out.localId);
        const keep = i >= 0 ? L[i] : null; const item = { ...JSON.parse(JSON.stringify(snap)), id: out.localId, grpFrom: { gid, sid, ver } };
        if (kind === 'course') { item.learners = keep ? keep.learners || [] : []; item.prog = keep ? keep.prog || {} : {}; if (!keep) item.status = '준비중'; else item.status = keep.status; }
        else if (kind === 'page') { pageDraft(item); if (keep && keep.on) { item.on = true; item.draft = false; } }
        else if (!keep) item.draft = true; else item.draft = keep.draft;
        if (i >= 0) L[i] = item; else L.push(item); }); }
      delete out._s; return out; }],
    ['POST', /^\/api\/group\/my\/up$/, async req => { const a = await needChild(req); const b = await body(req); if (!['course', 'page', 'notice'].includes(b.kind)) throw E('grp_source'); const src = sourceOf(await docOf(a.tid), b.kind, b.source);
      return tx(c => idem(c, a.tid, 'up', b.idem, async () => { const l = await pick(c, a, b.linkId);
        const s = await q1(c, "insert into grp_share (id, group_id, dir, from_tid, kind, title, snap, lic, targets, status, note, by) values ($1,$2,'up',$3,$4,$5,$6,$7,'[]','requested',$8,$9) returning *",
          [rid('gs_'), l.group_id, a.tid, b.kind, str(b.title, 80).trim() || src.title, JSON.stringify(src.snap), JSON.stringify({ origin: 'child', mk: false, src: { kind: b.kind, id: src.id } }), str(b.note, 300) || null, a.email]);
        await c.query('insert into grp_share_ver (share_id, group_id, ver, snap) values ($1,$2,1,$3)', [s.id, l.group_id, s.snap]);
        await gaudit(c, { gid: l.group_id, actor: a.email, actorTid: a.tid, action: 'grp.up', childTid: a.tid, target: s.id }); return { share: shareOut(s) }; })); }],
    ['GET', /^\/api\/group\/my\/policies$/, async req => { const a = await needChild(req); const q = Q(req);
      const { l, L, A } = await tx(async c => { const l = await pick(c, a, q.get('linkId')); return { l, L: (await c.query('select * from grp_policy where group_id = $1 order by key', [l.group_id])).rows, A: (await c.query('select * from grp_policy_apply where group_id = $1 and child_tid = $2', [l.group_id, a.tid])).rows }; });
      const d = await docOf(a.tid); const mine = ((d.grpPolicy || {})[l.group_id]) || {};
      return { linkId: l.id, items: L.map(p => { const ap = A.find(x => x.key === p.key); const st = !ap ? 'pending' : ap.state === 'applied' && ap.ver < p.ver ? 'pending' : ap.state; return { key: p.key, ver: p.ver, lock: p.lock, value: p.value, mine: { state: st, ...(st === 'overridden' && mine[p.key] ? { value: mine[p.key].value } : {}) } }; }) }; }],
    ['POST', /^\/api\/group\/my\/policies\/([a-z]{2,8})$/, async (req, key) => { const a = await needChildOwner(req); if (!C.policyKeys.includes(key)) throw E('grp_policy_key'); const b = await body(req); if (!['apply', 'override', 'reset'].includes(b.action)) throw E('grp_state');
      const out = await tx(c => idem(c, a.tid, 'mypolicy:' + key, b.idem, async () => { const l = await pick(c, a, b.linkId); const p = await q1(c, 'select * from grp_policy where group_id = $1 and key = $2', [l.group_id, key]); if (!p) throw E('grp_state');
        if (b.action === 'override' && p.lock === 'locked') throw E('grp_locked'); if (b.action === 'override' && (!b.value || typeof b.value !== 'object' || Buffer.byteLength(JSON.stringify(b.value)) > 262144)) throw new HttpErr(400, '덮어쓸 값을 확인해 주십시오.', 'grp_policy_value');
        const state = b.action === 'override' ? 'overridden' : 'applied';
        await c.query('insert into grp_policy_apply (group_id, child_tid, key, ver, state) values ($1,$2,$3,$4,$5) on conflict (group_id, child_tid, key) do update set ver = excluded.ver, state = excluded.state, at = now()', [l.group_id, a.tid, key, p.ver, state]);
        await gaudit(c, { gid: l.group_id, actor: a.email, actorTid: a.tid, action: 'grp.mypolicy.' + b.action, childTid: a.tid, target: `${key}@${p.ver}` });
        return { item: { key, ver: p.ver, lock: p.lock, mine: { state } }, _w: { gid: l.group_id, v: state === 'overridden' ? { ver: p.ver, lock: p.lock, value: b.value, own: true } : { ver: p.ver, lock: p.lock, value: p.value, from: 'group' } } }; }));
      if (out._w && !out.again) await docEdit(a.tid, d => { d.grpPolicy = d.grpPolicy && typeof d.grpPolicy === 'object' ? d.grpPolicy : {}; d.grpPolicy[out._w.gid] = { ...(d.grpPolicy[out._w.gid] || {}), [key]: out._w.v }; });
      delete out._w; return out; }],
    ['GET', /^\/api\/group\/my\/audit$/, async req => { const a = await needChildOwner(req); const q = Q(req); const f = DAY.test(q.get('from') || '') ? q.get('from') : '2000-01-01', t = DAY.test(q.get('to') || '') ? q.get('to') : '2999-12-31';
      const L = (await tx(c => c.query("select at, actor, action, purpose, fields, group_id from grp_audit where child_tid = $1 and actor_tid <> $1 and ok and (at at time zone 'Asia/Seoul')::date between $2::date and $3::date order by id desc limit 1000", [a.tid, f, t]))).rows;
      const mask = e => { const [u, d] = String(e).split('@'); return `${u.slice(0, 2)}***@${d || ''}`; };
      return { items: L.map(r => ({ at: iso(r.at), actorMask: mask(r.actor), role: r.action === 'grp.learner.view' ? 'grp_learner' : null, action: r.action, purpose: r.purpose || '', fields: r.fields || [], gid: r.group_id })) }; }]
  ];
  /* 소속 기관 연결 고르기(복수 소속 — 판정 ①) */
  async function pick(c, a, linkId) {
    const L = (await c.query("select * from grp_link where child_tid = $1 and status = 'active' order by accepted_at", [a.tid])).rows;
    if (linkId) { const l = L.find(x => x.id === String(linkId)); if (!l) throw E('grp_state'); return l; } if (L.length === 1) return L[0]; if (!L.length) throw E('grp_state'); throw E('grp_link_pick');
  }
  return {
    match(method, p) { if (!p.startsWith('/api/group/')) return null; const k = `${method} ${p}`; if (R[k]) return (req, res) => R[k](req, res);
      for (const [m, re, fn] of P) { if (m !== method) continue; const x = re.exec(p); if (x) return (req, res) => fn(req, ...x.slice(1), res); } return null; }
  };
};
