'use strict';
/* 통합 센터 /api/group/* 계약 시나리오 — Node · Java 공용(spec 10절 T-ISO · T-PRV · T-FN, 계약 service/server/group/contract.json).
   사용: 서버를 SIGNUP_CODE=C0DE PII_DEV_OTP=1 MFA_OFF=1 PII_KEY=<hex64> SANTA_ADMIN_EMAILS=grp-santa@example.com 로 띄운 뒤
     BASE=http://127.0.0.1:9611 node tests/contract-group.js        (가입 7회 — IP당 시간 10회 제한, 다른 대조 시험 뒤에는 서버를 다시 띄웁니다)
   Node 단위 시험(service/test/group.test.js)은 run()을 같은 프로세스 서버로 부릅니다. 결과는 상태 코드 · 오류 코드 · 키 · 가림 값으로만 비교합니다. */
const SANTA = 'grp-santa@example.com';
const PW = process.env.GRP_PW || 'Contract2026x';
const kst = (d = 0) => new Date(Date.now() + 9 * 3600e3 + d * 864e5).toISOString().slice(0, 10);

async function run(U, tag = 'g', hooks = {}) {
  const R = {}; const jar = {};
  const call = async (who, m, p, b) => { const r = await fetch(U + p, { method: m, headers: { 'x-didisam': '1', ...(b ? { 'content-type': 'application/json' } : {}), ...(jar[who] ? { cookie: jar[who] } : {}) }, body: b ? JSON.stringify(b) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0]; const t = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await r.arrayBuffer()); let j = {}; try { j = JSON.parse(t); } catch { j = { _text: t }; } return { st: r.status, j, ct: r.headers.get('content-type') || '' }; };
  const sfx = `${tag}${Date.now().toString(36)}`; let n = 0; const I = () => `i${sfx}${++n}`;
  const join = async (who, email, orgName, type) => { const s = await call(who, 'POST', '/api/signup', { email, password: PW, orgName, type, code: 'C0DE' }); if (s.st === 200) return s.j.tenant.tid; if (process.env.DBG) console.log('signup', who, s.st, JSON.stringify(s.j));
    const l = await call(who, 'POST', '/api/login', { email, password: PW }); return l.j.tenant && l.j.tenant.tid; };
  const put = async (who, doc) => call(who, 'PUT', '/api/state', { doc, rev: (await call(who, 'GET', '/api/state')).j.rev || 0 });
  const err = r => `${r.st}:${r.j.error || ''}`;
  await join('S', SANTA, '산타 운영', 'corp');
  const F = await join('F', `gf_${sfx}@example.com`, '디디 영어 본사', 'k12'); const A = await join('A', `ga_${sfx}@example.com`, '해운대점', 'k12'); const B = await join('B', `gb_${sfx}@example.com`, '기장점', 'k12');
  const Un = await join('U', `gu_${sfx}@example.com`, '한빛대학교 본부', 'univ'); const X = await join('X', `gx_${sfx}@example.com`, '한빛대 평생교육원', 'univ'); const Y = await join('Y', `gy_${sfx}@example.com`, '한빛대 취업센터', 'univ');
  const Rg = await join('R', `gr_${sfx}@example.com`, '해운구청 평생학습', 'public'); const Rc = await join('Rc', `grc_${sfx}@example.com`, '해운구 평생학습관', 'lifelong');
  R.tids = { F, A, B, U: Un, X, Y, R: Rg, Rc };
  const mem = (k, extra) => Array.from({ length: k }, (_, i) => ({ id: `m${i}`, name: `학습자${i}`, ...(extra ? extra(i) : {}) }));
  const cls = (id, ids, p, extra) => ({ id, name: `과정 ${id}`, status: '운영중', learners: ids, prog: Object.fromEntries(ids.map((x, i) => [x, { p: p(i), at: kst() }])), ...(extra || {}) });
  await put('F', { org: { name: '디디 영어 본사', type: 'k12' }, classes: [cls('fc1', [], () => 0, { items: [{ id: 'it1', type: 'video', title: '1차시', seen: { fz1: 1 } }], learners: ['fz1'], prog: { fz1: { p: 10 } }, enr: { fz1: { at: '2026-11-01' } }, attT: { fz1: 3 }, ask: { fz1: '질문' }, desc: '신규 강사 OT' }), cls('fmk', [], () => 0, { mk: { productId: 'mp_x' } })], lsite: { pub: { pages: [{ id: 'fp1', name: '가맹 안내', access: 'all', sections: [{ type: 'text', data: { t: '안내' } }] }] } } });
  await put('A', { org: { name: '해운대점', type: 'k12' }, members: mem(3), classes: [cls('a1', ['m0', 'm1', 'm2'], i => [100, 50, 20][i])] });
  await put('B', { org: { name: '기장점', type: 'k12' }, members: mem(20), classes: [cls('b1', mem(20).map(m => m.id), i => (i < 5 ? 100 : 40))], notices: [{ id: 'bn1', title: '기장점 공지', body: '알림' }] });
  await put('X', { org: { name: '평생교육원', type: 'univ' }, members: mem(6, i => ({ sid: `2023${String(1234 + i)}`, dept: i < 5 ? '기계공학과' : '경영학과' })), classes: [cls('x1', ['m0', 'm1', 'm2', 'm3', 'm4', 'm5'], i => i * 20, { term: '2026-2' })] });
  await put('Y', { org: { name: '취업센터', type: 'univ' }, members: mem(5, i => ({ sid: `2023${String(1234 + i)}`, dept: '기계공학과' })), classes: [cls('y1', ['m0', 'm1', 'm2', 'm3', 'm4'], () => 60)] });

  // 묶음 개설 · 시범(1-3)
  R.meNone = (await call('F', 'GET', '/api/group/me')).j.group;
  R.offDash = err(await call('F', 'GET', '/api/group/dash'));
  R.notSanta = err(await call('F', 'POST', '/api/group/admin/groups', { idem: I(), ownerTid: F, kind: 'franchise', name: '가맹' }));
  R.badKind = err(await call('S', 'POST', '/api/group/admin/groups', { idem: I(), ownerTid: F, kind: 'city', name: '가맹' }));
  const gF = await call('S', 'POST', '/api/group/admin/groups', { idem: 'gF' + sfx, ownerTid: F, kind: 'franchise', name: '디디 영어 가맹' }); if (!gF.j.group) throw new Error('create ' + JSON.stringify(gF)); R.create = [gF.st, Object.keys(gF.j.group || {}).sort().join(',')]; const GF = gF.j.group.gid;
  R.createAgain = (await call('S', 'POST', '/api/group/admin/groups', { idem: 'gF' + sfx, ownerTid: F, kind: 'franchise', name: '디디 영어 가맹' })).j.again;
  R.exists = err(await call('S', 'POST', '/api/group/admin/groups', { idem: I(), ownerTid: F, kind: 'univ', name: '둘째' }));
  const gU = await call('S', 'POST', '/api/group/admin/groups', { idem: I(), ownerTid: Un, kind: 'univ', name: '한빛대 통합' }); const GU = gU.j.group.gid;
  await call('S', 'PATCH', `/api/group/admin/groups/${GU}`, { idem: I(), detail: true });
  R.adminList = (await call('S', 'GET', '/api/group/admin/groups')).j.total >= 2;
  const me = await call('F', 'GET', '/api/group/me'); R.me = [me.j.group && me.j.group.kind, me.j.me && me.j.me.role, (me.j.me && me.j.me.perms || []).includes('learner'), Object.keys(me.j).sort().join(',')];
  R.noIdem = err(await call('F', 'POST', '/api/group/invites', { label: '해운대점', unit: 'branch' }));

  // 초대 · 수락(1-4 · 1-5)
  R.badUnit = err(await call('F', 'POST', '/api/group/invites', { idem: I(), label: '해운대점', unit: 'lifelong' }));
  R.self = err(await call('F', 'POST', '/api/group/invites', { idem: I(), label: '본사', unit: 'direct', to: { tid: F } }));
  R.detailFr = err(await call('F', 'POST', '/api/group/invites', { idem: I(), label: '해운대점', unit: 'branch', ask: { learnerDetail: { on: true, fields: ['studentNo'] } } })); /* T-PRV-9 */
  const ia = await call('F', 'POST', '/api/group/invites', { idem: I(), label: '해운대점', unit: 'branch', ask: { ai: true, revenue: true } }); R.invite = [ia.st, /^GRP-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(ia.j.code || ''), !!ia.j.expiresAt];
  const ib = await call('F', 'POST', '/api/group/invites', { idem: I(), label: '기장점', unit: 'branch', to: { tid: B } });
  R.dupTo = err(await call('F', 'POST', '/api/group/invites', { idem: I(), label: '기장점', unit: 'branch', to: { tid: B } }));
  R.myInv = ((await call('B', 'GET', '/api/group/my')).j.invites || []).length;
  R.preAccept = ((await call('F', 'GET', '/api/group/dash')).j.children || []).length; /* T-ISO-3 */
  R.badCode = err(await call('A', 'POST', '/api/group/my/accept', { idem: I(), code: 'GRP-AAAA-AAAA', share: { kpi: true }, agreeVer: 'grp-share-v1' }));
  R.noTerms = err(await call('A', 'POST', '/api/group/my/accept', { idem: I(), code: ia.j.code, share: { kpi: true } }));
  R.ownSelf = err(await call('F', 'POST', '/api/group/my/accept', { idem: I(), code: ia.j.code, share: { kpi: true }, agreeVer: 'grp-share-v1' }));
  const acIdem = I(); const ac = await call('A', 'POST', '/api/group/my/accept', { idem: acIdem, code: ia.j.code, share: { kpi: true, ai: true, revenue: false }, agreeVer: 'grp-share-v1' }); R.accept = [ac.st, ac.j.link && ac.j.link.status, ac.j.link && ac.j.link.share.revenue];
  R.acceptAgain = (await call('A', 'POST', '/api/group/my/accept', { idem: acIdem, code: ia.j.code, share: { kpi: true }, agreeVer: 'grp-share-v1' })).j.again; /* T-FN-3 */
  R.acceptB = (await call('B', 'POST', '/api/group/my/accept', { idem: I(), linkId: ib.j.linkId, share: { kpi: true, ai: true, revenue: true }, agreeVer: 'grp-share-v1' })).j.link.status;
  // 판정 ①: 해운대점이 대학 묶음에도 동시에 소속 가능
  const iu = await call('U', 'POST', '/api/group/invites', { idem: I(), label: '해운대 위탁', unit: 'unit', to: { tid: A } });
  R.multi = (await call('A', 'POST', '/api/group/my/accept', { idem: I(), linkId: iu.j.linkId, share: { kpi: true }, agreeVer: 'grp-share-v1' })).j.link.status;
  R.myLinks = ((await call('A', 'GET', '/api/group/my')).j.links || []).length;
  R.pick = err(await call('A', 'PUT', '/api/group/my/share', { idem: I(), share: { kpi: true }, agreeVer: 'grp-share-v1' }));
  // 대학: 평생교육원 · 취업센터(학습자 집계 · 개별 열람 동의 다르게)
  for (const [who, tid, lab, det] of [['X', X, '평생교육원', true], ['Y', Y, '취업센터', false]]) { const v = await call('U', 'POST', '/api/group/invites', { idem: I(), label: lab, unit: 'lifelong', to: { tid } });
    await call(who, 'POST', '/api/group/my/accept', { idem: I(), linkId: v.j.linkId, share: { kpi: true, learnerAgg: true, learnerDetail: { on: det, fields: det ? ['studentNo', 'dept', 'courses'] : [] } }, agreeVer: 'grp-share-v1' }); }

  // 역할(T-ISO-6 · T-ISO-7 · T-FN-12)
  const sub = await call('F', 'POST', '/api/staff', { email: `gfs_${sfx}@example.com`, role: 'sub' }); await call('Fs', 'POST', '/api/login', { email: `gfs_${sfx}@example.com`, password: sub.j.password }); await call('Fs', 'POST', '/api/password', { current: sub.j.password, next: PW });
  await call('Fs', 'POST', '/api/login', { email: `gfs_${sfx}@example.com`, password: PW });
  R.subNoRole = err(await call('Fs', 'GET', '/api/group/dash'));
  R.staffOther = err(await call('F', 'PUT', '/api/group/staff', { idem: I(), email: `ga_${sfx}@example.com`, role: 'grp_viewer' }));
  R.staffSet = (await call('F', 'PUT', '/api/group/staff', { idem: I(), email: `gfs_${sfx}@example.com`, role: 'grp_viewer' })).st;
  R.subView = (await call('Fs', 'GET', '/api/group/dash')).st; R.subInvite = err(await call('Fs', 'POST', '/api/group/invites', { idem: I(), label: '새 지점', unit: 'branch' }));
  R.lastAdmin = err(await call('F', 'PUT', '/api/group/staff', { idem: I(), email: `gf_${sfx}@example.com`, role: null }));
  const tch = await call('A', 'POST', '/api/staff', { email: `gat_${sfx}@example.com`, role: 'teacher' }); await call('At', 'POST', '/api/login', { email: `gat_${sfx}@example.com`, password: tch.j.password }); await call('At', 'POST', '/api/password', { current: tch.j.password, next: PW }); await call('At', 'POST', '/api/login', { email: `gat_${sfx}@example.com`, password: PW });
  R.teacherAccept = (await call('At', 'POST', '/api/group/my/accept', { idem: I(), code: 'x', share: {}, agreeVer: 'grp-share-v1' })).st;

  // 집계 · 대시보드(1-7, T-PRV-1~3 · T-FN-11)
  R.rule = err(await call('F', 'PUT', '/api/group/rules', { idem: I(), rules: [{ kpi: 'nope', op: 'lt', value: 1, period: 'month', label: 'x' }] }));
  await call('F', 'PUT', '/api/group/rules', { idem: I(), rules: [{ kpi: 'cmpRateBp', op: 'lt', value: 30, period: 'month', label: '수료율 30% 미만' }] });
  R.refresh = (await call('F', 'POST', '/api/group/refresh', { idem: I() })).j.n; await call('U', 'POST', '/api/group/refresh', { idem: I() });
  R.refreshLimit = err(await call('F', 'POST', '/api/group/refresh', { idem: I() }));
  const d = await call('F', 'GET', `/api/group/dash?from=${kst(-6)}&to=${kst()}&unit=day`); const ca = (d.j.children || []).find(x => x.tid === A) || { v: {}, masked: [], noConsent: [], flags: [] }; const cb = (d.j.children || []).find(x => x.tid === B) || { v: {}, masked: [], noConsent: [], flags: [] };
  R.dashKeys = Object.keys(d.j).sort().join(','); R.dashN = (d.j.children || []).length;
  R.maskA = [ca.v.lrn, ca.v.cmpRateBp, ca.masked.includes('lrn'), ca.noConsent.includes('rev'), ca.v.aiCalls]; R.valB = [cb.v.lrn, cb.v.cmpRateBp, cb.v.rev, cb.flags.length];
  R.total = [d.j.total && d.j.total.lrn, d.j.total && d.j.total.rev]; R.series = (d.j.series || []).length > 0;
  R.tidTotal = (await call('F', 'GET', `/api/group/dash?tid=${B}`)).j.total; /* T-PRV-3 */
  R.otherTid = ((await call('F', 'GET', `/api/group/dash?tid=${X}`)).j.children || []).length; /* T-ISO-2 */
  R.range = err(await call('F', 'GET', `/api/group/dash?from=2025-01-01&to=${kst()}`));
  const ex = await call('F', 'GET', `/api/group/dash/export?from=${kst(-6)}&to=${kst()}`); R.export = [ex.st, /text\/csv/.test(ex.ct), /가명 집계 · 5명 미만 가림/.test(ex.j._text || ''), /5명 미만/.test(ex.j._text || '')];
  R.links = ((await call('F', 'GET', '/api/group/links?status=active')).j.items || []).map(x => Object.keys(x).sort().join(',')).slice(0, 1)[0];

  // 통합 학습자 · 개별 열람(1-8, T-PRV-4~8)
  R.lsFr = err(await call('F', 'GET', `/api/group/learners/summary?from=${kst(-60)}&to=${kst()}`));
  R.lsShort = err(await call('U', 'GET', `/api/group/learners/summary?from=${kst(-6)}&to=${kst()}`));
  const ls = await call('U', 'GET', `/api/group/learners/summary?from=${kst(-60)}&to=${kst()}`); R.ls = [ls.st, ls.j.basis, ls.j.unified, ls.j.multi && ls.j.multi['2'], ls.j.consent && ls.j.consent.agreed, (ls.j.byDept || []).map(x => `${x.dept}:${x.lrn}`).join('|')];
  R.lkRole = err(await call('U', 'POST', '/api/group/learners/lookup', { idem: I(), key: { studentNo: '20231234' }, purpose: '장학 대상 확인을 위한 이수 이력 확인' }));
  await call('U', 'PUT', '/api/group/staff', { idem: I(), email: `gu_${sfx}@example.com`, roles: ['grp_admin', 'grp_learner'] });
  if (hooks.stale) await hooks.stale(); /* 세션을 10분 전으로(재인증 필요) */
  R.lkMfa = !hooks.stale ? 'skip' : await call('U', 'POST', '/api/group/learners/lookup', { idem: I(), key: { studentNo: '20231234' }, purpose: '장학 대상 확인을 위한 이수 이력 확인' }).then(r => [err(r), r.j.mfa]);
  await call('U', 'POST', '/api/login', { email: `gu_${sfx}@example.com`, password: PW });
  R.lkPurpose = err(await call('U', 'POST', '/api/group/learners/lookup', { idem: I(), key: { studentNo: '20231234' }, purpose: '확인' }));
  const lk = await call('U', 'POST', '/api/group/learners/lookup', { idem: I(), key: { studentNo: '2023-1234' }, purpose: '장학 대상 확인을 위한 이수 이력 확인' });
  R.lookup = [lk.st, (lk.j.items || []).length, lk.j.hidden, Object.keys(((lk.j.items || [])[0] || {}).fields || {}).sort().join(','), JSON.stringify(lk.j).includes('학습자')];
  const myAud = await call('X', 'GET', '/api/group/my/audit'); R.myAudit = (myAud.j.items || []).filter(x => x.action === 'grp.learner.view').map(x => [/\*\*\*@/.test(x.actorMask), x.purpose.length > 0])[0];
  R.santaLookup = err(await call('S', 'POST', '/api/group/learners/lookup', { idem: I(), key: { studentNo: '20231234' }, purpose: '장학 대상 확인을 위한 이수 이력 확인' })); /* T-ISO-9 */

  // 콘텐츠 공유(T-FN-4~7 · 10)
  R.license = err(await call('F', 'POST', '/api/group/shares', { idem: I(), kind: 'course', source: { courseId: 'fmk' }, required: false, targets: 'all' }));
  R.source = err(await call('F', 'POST', '/api/group/shares', { idem: I(), kind: 'course', source: { courseId: 'none' }, required: false, targets: 'all' }));
  const sh = await call('F', 'POST', '/api/group/shares', { idem: I(), kind: 'course', source: { courseId: 'fc1' }, required: true, targets: 'all', note: '필수' }); const SID = sh.j.share && sh.j.share.sid; R.share = [sh.st, sh.j.share && sh.j.share.status];
  R.publish = (await call('F', 'POST', `/api/group/shares/${SID}/publish`, { idem: I() })).j.share.targets.total;
  const inb = await call('A', 'GET', '/api/group/my/inbox'); R.inbox = ((inb.j.items || []).find(x => x.sid === SID) || {}).status;
  R.reqDecline = err(await call('A', 'POST', `/api/group/my/inbox/${SID}/decline`, { idem: I() }));
  const ad = await call('A', 'POST', `/api/group/my/inbox/${SID}/adopt`, { idem: I(), asDraft: true }); R.adopt = [ad.st, ad.j.ver];
  const aDoc = (await call('A', 'GET', '/api/state')).j.doc || {}; const lc = (aDoc.classes || []).find(c => c.id === ad.j.localId) || {}; R.adoptDoc = [lc.status, (lc.learners || []).length, !!lc.grpFrom, !JSON.stringify(lc).includes('fz1'), (lc.items || []).length]; /* QA49-3 #3 학습자별 기록 빠짐 */
  { const d0 = (await call('A', 'GET', '/api/state')).j.doc || {}; d0.lsite = { pub: { classes: [{ id: ad.j.localId, name: lc.name }, { id: 'a1', name: '과정 a1' }], pages: [], notices: [] } }; await put('A', d0); } /* 해운대점이 가져온 과정을 학습자 사이트에 게시 */
  const shp = await call('F', 'POST', '/api/group/shares', { idem: I(), kind: 'page', source: { pageId: 'fp1' }, required: false, targets: 'all' }); await call('F', 'POST', `/api/group/shares/${shp.j.share.sid}/publish`, { idem: I() });
  const adp = await call('B', 'POST', `/api/group/my/inbox/${shp.j.share.sid}/adopt`, { idem: I(), asDraft: true }); const bDoc = (await call('B', 'GET', '/api/state')).j.doc || {};
  const bp = ((bDoc.grpPending || {}).pages || []).find(x => x.id === adp.j.localId) || {}; R.pageDraft = [adp.st, bp.on, !!bp.draft, ((bDoc.lsite || {}).pub || {}).pages ? bDoc.lsite.pub.pages.length : 0, ((bp.sections || [])[0] || {}).on]; /* QA49-3 #5 페이지 가져오기 = 꺼진 초안 */
  R.version = (await call('F', 'POST', `/api/group/shares/${SID}/version`, { idem: I(), note: '2판' })).j.share.ver;
  R.outdated = ((await call('A', 'GET', '/api/group/my/inbox')).j.items || []).find(x => x.sid === SID).outdated;
  R.update = (await call('A', 'POST', `/api/group/my/inbox/${SID}/update`, { idem: I() })).j.ver;
  const up = await call('B', 'POST', '/api/group/my/up', { idem: I(), kind: 'notice', source: { noticeId: 'bn1' }, title: '기장점 공지', note: '공유 요청' }); R.up = up.j.share && up.j.share.status;
  const apv = await call('F', 'POST', `/api/group/requests/${up.j.share.sid}/approve`, { idem: I(), redistribute: true, targets: 'all' }); R.approve = [apv.j.share && apv.j.share.status, apv.j.redistributed && apv.j.redistributed.status];
  R.redist = ((await call('A', 'GET', '/api/group/my/inbox')).j.items || []).some(x => apv.j.redistributed && x.sid === apv.j.redistributed.sid);
  R.recallShort = err(await call('F', 'POST', `/api/group/shares/${SID}/recall`, { idem: I(), reason: 'x', mode: 'hide' }));
  R.recall = (await call('F', 'POST', `/api/group/shares/${SID}/recall`, { idem: I(), reason: '내용 오류로 회수합니다', mode: 'hide' })).j.share.status;
  { const d1 = (await call('A', 'GET', '/api/state')).j.doc; R.recallDoc = !!((d1.classes || []).find(c => c.id === ad.j.localId) || {}).grpRecalled; R.recallPub = ((d1.lsite || {}).pub || {}).classes.map(c => c.id).join(',') === 'a1'; } /* QA49-3 #4 게시본에서도 빠짐 */

  // 공통 설정(T-FN-8 · 9)
  R.polKey = err(await call('F', 'PUT', '/api/group/policies/color', { idem: I(), value: {}, lock: 'default', baseVer: 0 }));
  R.polPut = (await call('F', 'PUT', '/api/group/policies/brand', { idem: I(), value: { color: '#1F6FEB' }, lock: 'locked', baseVer: 0 })).j.policy.ver;
  R.polVer = err(await call('F', 'PUT', '/api/group/policies/brand', { idem: I(), value: { color: '#000000' }, lock: 'locked', baseVer: 0 }));
  R.polApply = (await call('F', 'POST', '/api/group/policies/brand/apply', { idem: I(), targets: 'all' })).j.applied;
  R.locked = err(await call('B', 'POST', '/api/group/my/policies/brand', { idem: I(), action: 'override', value: { color: '#FF0000' } }));
  await call('F', 'PUT', '/api/group/policies/notice', { idem: I(), value: { text: '공지 틀' }, lock: 'default', baseVer: 0 });
  await call('B', 'POST', '/api/group/my/policies/notice', { idem: I(), action: 'override', value: { text: '기장점 공지 틀' } });
  await call('F', 'PUT', '/api/group/policies/notice', { idem: I(), value: { text: '공지 틀 2' }, lock: 'default', baseVer: 1 });
  R.skipped = ((await call('F', 'POST', '/api/group/policies/notice/apply', { idem: I(), targets: 'all' })).j.skipped || []).map(x => x.reason).join(',');
  R.bPol = ((await call('B', 'GET', '/api/group/my/policies')).j.items || []).map(x => `${x.key}:${x.mine.state}`).sort().join(',');
  R.audit = (await call('F', 'GET', '/api/group/audit')).j.total > 5; R.auditViewer = err(await call('Fs', 'GET', '/api/group/audit'));

  // 지자체 · 교육청 여정(QA49-3): 수납액 요청 불가 · 소속 구분 · 통합 학습자는 기관별 집계만(통합 학습 ID 2차)
  await put('Rc', { org: { name: '해운구 평생학습관', type: 'lifelong' }, members: mem(7), classes: [cls('r1', mem(7).map(m => m.id), i => (i < 5 ? 100 : 30))] });
  const gR = await call('S', 'POST', '/api/group/admin/groups', { idem: I(), ownerTid: Rg, kind: 'region', name: '해운구 시민대학' });
  R.rgRev = err(await call('R', 'POST', '/api/group/invites', { idem: I(), label: '평생학습관', unit: 'lifelong', ask: { revenue: true } }));
  R.rgUnit = err(await call('R', 'POST', '/api/group/invites', { idem: I(), label: '평생학습관', unit: 'branch' }));
  const ir = await call('R', 'POST', '/api/group/invites', { idem: I(), label: '평생학습관', unit: 'lifelong', to: { tid: Rc } });
  R.rgAccRev = err(await call('Rc', 'POST', '/api/group/my/accept', { idem: I(), linkId: ir.j.linkId, share: { kpi: true, revenue: true }, agreeVer: 'grp-share-v1' }));
  R.rgAcc = ((await call('Rc', 'POST', '/api/group/my/accept', { idem: I(), linkId: ir.j.linkId, share: { kpi: true, ai: true, learnerAgg: true }, agreeVer: 'grp-share-v1' })).j.link || {}).status;
  await call('R', 'POST', '/api/group/refresh', { idem: I() }); const dr = await call('R', 'GET', `/api/group/dash?from=${kst(-6)}&to=${kst()}&unit=day`); const rc = (dr.j.children || [])[0] || { v: {} };
  R.rgDash = [dr.j.kpis && dr.j.kpis.join(','), rc.v.lrn, rc.v.cmp, rc.v.cmpRateBp, dr.j.total && dr.j.total.lrn, 'rev' in (rc.v || {}) ? rc.v.rev : 'x'];
  const lr = await call('R', 'GET', `/api/group/learners/summary?from=${kst(-60)}&to=${kst()}`); R.rgLs = [lr.st, lr.j.basis, lr.j.unified, (lr.j.byChild || []).map(x => x.lrn).join(',')];
  R.rgLookup = err(await call('R', 'POST', '/api/group/learners/lookup', { idem: I(), key: { studentNo: '1234' }, purpose: '시민대학 수강 이력 확인 목적입니다' }));
  void gR;

  // 해제 · 탈퇴(T-ISO-4 · 판정 ②)
  R.leaveShort = err(await call('B', 'POST', '/api/group/my/leave', { idem: I(), reason: 'x' }));
  R.leave = (await call('B', 'POST', '/api/group/my/leave', { idem: I(), reason: '가맹 계약 종료' })).j.link.status;
  const d2 = await call('F', 'GET', '/api/group/dash'); R.afterLeave = [(d2.j.children || []).some(x => x.tid === B), (d2.j.children || []).length];
  R.remove = (await call('U', 'POST', `/api/group/links/${iu.j.linkId}/remove`, { idem: I(), reason: '위탁 종료' })).j.link.status;
  R.unauth = (await fetch(`${U}/api/group/me`)).status; R.nf = (await call('F', 'GET', '/api/group/nope')).st;
  R._t = { call, I, GF, GU, sfx };
  return R;
}

const WANT = {
  meNone: null, offDash: '403:grp_off', notSanta: '403:santa', badKind: '400:grp_kind', create: [200, 'detail,gid,kind,links,name,ownerName,ownerTid,pilot,status,targets,terms'], createAgain: true, exists: '409:grp_exists', adminList: true,
  me: ['franchise', 'grp_admin', false, 'counts,group,me'], noIdem: '400:idem', badUnit: '400:grp_unit', self: '400:grp_self', detailFr: '400:grp_field', invite: [200, true, true], dupTo: '409:grp_child', myInv: 1, preAccept: 0,
  badCode: '404:grp_invite_code', noTerms: '400:grp_terms', ownSelf: '400:grp_self', accept: [200, 'active', false], acceptAgain: true, acceptB: 'active', multi: 'active', myLinks: 2, pick: '400:grp_link_pick',
  subNoRole: '403:grp_role', staffOther: '400:grp_staff_tenant', staffSet: 200, subView: 200, subInvite: '403:grp_role', lastAdmin: '409:grp_last_admin', teacherAccept: 403,
  rule: '400:grp_rule', refresh: 2, refreshLimit: '429:grp_limit', dashKeys: 'asOf,children,kpis,range,series,stale,total', dashN: 2,
  maskA: ['5명 미만', null, true, true, 0], valB: [20, 2500, 0, 1], total: [null, null] /* QA49-3 #2: 가린 기관(해운대점 3명)이 한 곳뿐이면 합계 − 기장점으로 역산되므로 합계 lrn 가림 */, series: true, tidTotal: null, otherTid: 0, range: '400:grp_range', export: [200, true, true, true],
  links: 'acceptedAt,childName,childTid,childType,endedAt,expiresAt,invitedAt,label,lastDay,linkId,share,status,unit',
  lsFr: '403:grp_consent', lsShort: '400:grp_range', ls: [200, 'studentNo', 6, 5, 2, '기계공학과:5|(5명 미만 학과 묶음):5명 미만'],
  lkRole: '403:grp_role', lkMfa: ['403:grp_mfa', 'required'], lkPurpose: '400:grp_purpose', lookup: [200, 1, 2, 'courses,dept,studentNo', false], myAudit: [true, true], santaLookup: '403:grp_off',
  license: '409:grp_license', source: '404:grp_source', share: [200, 'draft'], publish: 2, inbox: 'offered', reqDecline: '409:grp_required', adopt: [200, 1], adoptDoc: ['준비중', 0, true, true, 1],
  version: 2, outdated: true, update: 2, up: 'requested', approve: ['approved', 'published'], redist: true, recallShort: '400:grp_reason', recall: 'recalled', recallDoc: true, recallPub: true, pageDraft: [200, false, true, 0, true],
  polKey: '400:grp_policy_key', polPut: 1, polVer: '409:grp_ver', polApply: 2, locked: '409:grp_locked', skipped: 'overridden', bPol: 'brand:applied,notice:overridden', audit: true, auditViewer: '403:grp_role',
  rgRev: '400:grp_field', rgUnit: '400:grp_unit', rgAccRev: '400:grp_field', rgAcc: 'active', rgDash: ['lrn,crs,cmpRateBp,new,aiCalls,act', 7, 5, 7143, 7, null], rgLs: [200, 'unifiedId', null, '7'], rgLookup: '403:grp_detail_off',
  leaveShort: '400:grp_reason', leave: 'left', afterLeave: [false, 1], remove: 'removed', unauth: 401, nf: 404
};
function check(R) { const bad = []; for (const [k, v] of Object.entries(WANT)) { if (R[k] === 'skip') continue; const a = JSON.stringify(R[k]); if (a !== JSON.stringify(v)) bad.push(`${k}: ${a} ≠ ${JSON.stringify(v)}`); } return bad; }
module.exports = { run, check, WANT, SANTA };
if (require.main === module) (async () => { const R = await run(process.env.BASE || 'http://127.0.0.1:9611', 'j'); const bad = check(R); delete R._t; console.log(JSON.stringify(R, null, 1)); if (bad.length) { console.error(bad.join('\n')); process.exit(1); } console.log('계약 통과', Object.keys(WANT).length, '항목'); })().catch(e => { console.error(e); process.exit(1); });
