'use strict';
/* 디디쌤 스튜디오 v16 — MCP 서버(외부 AI 연결) + 기관 API 키
   · 연결: POST /mcp (MCP Streamable HTTP, JSON 응답) · 인증: Authorization: Bearer dds_… (기관별 키)
   · 키: 정운영자가 스튜디오에서 발급(평문은 발급 순간 한 번만 보여 주고, 서버는 HMAC 지문만 저장) · 권한 read / write · 폐기 즉시 무효
   · 범위: 키가 속한 기관 데이터만(inTenant + RLS). 학습자는 번호 · 소속만 내보낸다(이름 · 이메일 · 연락처 · 접근코드 제외)
   · 쓰기 도구는 기관 상태를 낙관적 잠금(rev)으로 갱신하고 감사 기록을 남긴다. 데이터룸 정책 room.egress.mcp === false면 거부 */
const crypto = require('node:crypto');
const { inTenant } = require('./db');

const PROTO = ['2025-06-18', '2025-03-26', '2024-11-05'];
const KEY_RE = /^dds_[A-Za-z0-9_-]{40}$/;
const MAX_KEYS = 20;

function createMcp({ pool, HttpErr, readBody, limit, audit, pepper, version = '16.0' }) {
  const fp = key => crypto.createHmac('sha256', 'mcp|' + pepper).update(key).digest('hex');

  /* ── 키 관리(스튜디오 세션 · 정운영자) ── */
  async function listKeys(a) {
    const { rows } = await pool.query('select id, name, prefix, scope, created_by, created_at, last_used, calls, revoked_at from api_keys where tenant_id = $1 order by created_at desc limit 50', [a.tid]);
    return { keys: rows };
  }
  async function createKey(a, req) {
    if (a.role !== 'owner') throw new HttpErr(403, '정운영자만 API 키를 발급할 수 있습니다.', 'role');
    const b = await readBody(req, 2048); const name = String(b.name || '').trim().slice(0, 40); const scope = b.scope === 'write' ? 'write' : 'read';
    if (!name) throw new HttpErr(400, '키 이름(어디에 쓰는지)을 입력하세요.', 'name');
    const n = (await pool.query('select count(*)::int n from api_keys where tenant_id = $1 and revoked_at is null', [a.tid])).rows[0].n;
    if (n >= MAX_KEYS) throw new HttpErr(400, `사용 중인 키는 ${MAX_KEYS}개까지입니다. 쓰지 않는 키를 폐기하세요.`, 'max');
    const key = 'dds_' + crypto.randomBytes(30).toString('base64url'); const id = 'k_' + crypto.randomBytes(6).toString('hex');
    await pool.query('insert into api_keys (id, tenant_id, name, prefix, hash, scope, created_by) values ($1, $2, $3, $4, $5, $6, $7)', [id, a.tid, name, key.slice(0, 12), fp(key), scope, a.email]);
    await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'apikey.create', { id, name, scope }));
    return { id, name, scope, prefix: key.slice(0, 12), key };
  }
  async function revokeKey(a, req) {
    if (a.role !== 'owner') throw new HttpErr(403, '정운영자만 폐기할 수 있습니다.', 'role');
    const b = await readBody(req, 1024); const id = String(b.id || '');
    const r = await pool.query('update api_keys set revoked_at = now() where tenant_id = $1 and id = $2 and revoked_at is null', [a.tid, id]);
    if (!r.rowCount) throw new HttpErr(404, '없는 키이거나 이미 폐기되었습니다.', 'key');
    await inTenant(pool, a.tid, c => audit(c, a.tid, a.email, 'apikey.revoke', { id }));
    return { ok: true };
  }

  /* ── 키 인증 ── */
  async function keyAuth(req) {
    const h = String(req.headers.authorization || ''); const m = h.match(/^Bearer\s+(\S+)$/i); const key = m ? m[1] : '';
    if (!KEY_RE.test(key)) return null;
    const { rows } = await pool.query("select k.id, k.tenant_id tid, k.name, k.scope, t.name org, t.type from api_keys k join tenants t on t.id = k.tenant_id where k.hash = $1 and k.revoked_at is null", [fp(key)]);
    if (!rows[0]) return null;
    pool.query('update api_keys set last_used = now(), calls = calls + 1 where id = $1', [rows[0].id]).catch(() => {});
    return rows[0];
  }

  /* ── 데이터 도우미(학습자 개인정보 제외) ── */
  const S = v => String(v == null ? '' : v);
  const sidOf = m => S(m.sid || (m.extra && (m.extra.학번 || m.extra.사번)) || m.id);
  const groupOf = (doc, m) => S(((doc.groups || []).find(g => g.id === m.group) || {}).name || (m.extra && (m.extra.학과 || m.extra.부서 || m.extra.소속)) || '');
  const thr = c => (c.criteria && c.criteria.threshold) || 80;
  const avg = a => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0;
  const findM = (doc, sid) => (doc.members || []).find(m => sidOf(m) === sid || m.id === sid);
  function courseOut(doc, c, full) {
    const ids = c.learners || []; const P = ids.map(id => +((c.prog || {})[id] || {}).p || 0);
    const o = { id: c.id, name: S(c.name), status: S(c.status), legal: !!c.legal, kind: S(c.kind), start: S(c.start), end: S(c.end), teacher: S(c.teacher), learners: ids.length, avg_progress: avg(P), completed: P.filter(p => p >= thr(c)).length, pending_grading: ids.filter(id => ((c.prog || {})[id] || {}).assign === 'submitted').length };
    if (full) Object.assign(o, { criteria: c.criteria || {}, curriculum: (c.curriculum || []).slice(0, 200).map(it => ({ id: it.id, type: it.type, title: S(it.title), week: it.week || 0, questions: Array.isArray(it.qs) ? it.qs.length : undefined })), notices: (c.notices || []).slice(0, 20).map(n => ({ title: S(n.title), at: S(n.at) })) });
    return o;
  }
  const TOOLS = [
    { name: 'get_overview', scope: 'read', description: '기관 운영 현황 요약: 학습자 수 · 운영 과정 · 평균 진도 · 채점 대기 · 미답변 질문 · 법정의무교육 미이수.', inputSchema: { type: 'object', properties: {} },
      run: (doc, a) => { const C = doc.classes || []; const run = C.filter(c => c.status === '운영중'); const allP = C.flatMap(c => (c.learners || []).map(id => +((c.prog || {})[id] || {}).p || 0));
        return { org: a.org, type: a.type, learners: (doc.members || []).length, courses: C.length, running: run.length, avg_progress: avg(allP), pending_grading: C.reduce((s, c) => s + (c.learners || []).filter(id => ((c.prog || {})[id] || {}).assign === 'submitted').length, 0), open_questions: (doc.tq || []).filter(x => x && x.st !== 'answered').length, legal_incomplete: new Set(C.filter(c => c.legal).flatMap(c => (c.learners || []).filter(id => (+((c.prog || {})[id] || {}).p || 0) < 100))).size }; } },
    { name: 'list_courses', scope: 'read', description: '과정(교과목 · 교육과정 · 강좌) 목록과 수강 인원 · 평균 진도 · 이수 인원.', inputSchema: { type: 'object', properties: { status: { type: 'string', description: '운영중 · 준비중 · 종료 중 하나(생략하면 전체)' } } },
      run: (doc, a, x) => ({ courses: (doc.classes || []).filter(c => !x.status || c.status === x.status).slice(0, 200).map(c => courseOut(doc, c)) }) },
    { name: 'get_course', scope: 'read', description: '과정 하나의 커리큘럼(항목 유형 · 제목 · 주차) · 평가 기준 · 공지 · 진도 통계.', inputSchema: { type: 'object', properties: { course_id: { type: 'string' } }, required: ['course_id'] },
      run: (doc, a, x) => { const c = (doc.classes || []).find(k => k.id === S(x.course_id)); if (!c) throw new Error('없는 과정입니다: ' + S(x.course_id)); return courseOut(doc, c, true); } },
    { name: 'list_learners', scope: 'read', description: '학습자 목록(번호 · 소속 · 등급 · 최근 접속). 이름 · 이메일 · 연락처는 제공하지 않습니다.', inputSchema: { type: 'object', properties: { group: { type: 'string', description: '소속(학과 · 부서 · 반) 이름으로 거르기' }, limit: { type: 'integer', minimum: 1, maximum: 500 } } },
      run: (doc, a, x) => ({ learners: (doc.members || []).map(m => ({ id: sidOf(m), group: groupOf(doc, m), grade: S(m.grade), last_access: S(m.last) })).filter(m => !x.group || m.group === S(x.group)).slice(0, Math.min(500, +x.limit || 100)) }) },
    { name: 'get_learner_progress', scope: 'read', description: '학습자 한 명(번호)의 과정별 진도 · 시험 점수 · 과제 상태.', inputSchema: { type: 'object', properties: { learner_id: { type: 'string' } }, required: ['learner_id'] },
      run: (doc, a, x) => { const m = findM(doc, S(x.learner_id)); if (!m) throw new Error('없는 학습자입니다.'); return { id: sidOf(m), group: groupOf(doc, m), courses: (doc.classes || []).filter(c => (c.learners || []).includes(m.id)).map(c => { const g = (c.prog || {})[m.id] || {}; return { course_id: c.id, name: S(c.name), progress: +g.p || 0, exam: g.exam ?? null, assignment: S(g.assign || 'none'), completed: (+g.p || 0) >= thr(c) }; }) }; } },
    { name: 'list_questions', scope: 'read', description: '학습자 질문함(AI 튜터 · 게시판에서 넘어온 질문)과 답변 상태.', inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['open', 'answered', 'all'] } } },
      run: (doc, a, x) => ({ questions: (doc.tq || []).filter(q => q && (x.status === 'all' || (x.status === 'answered' ? q.st === 'answered' : q.st !== 'answered'))).slice(0, 100).map(q => ({ id: S(q.id), learner_id: S(q.sid), course: S(q.cls), question: S(q.q), answer: q.a ? S(q.a) : null, status: q.st === 'answered' ? 'answered' : 'open', at: S(q.at) })) }) },
    { name: 'answer_question', scope: 'write', description: '질문함의 질문에 답변을 등록합니다(학습자 포털 · AI 튜터에 바로 표시).', inputSchema: { type: 'object', properties: { question_id: { type: 'string' }, answer: { type: 'string', maxLength: 2000 } }, required: ['question_id', 'answer'] },
      write: (doc, a, x) => { const q = (doc.tq || []).find(k => k && S(k.id) === S(x.question_id)); if (!q) throw new Error('없는 질문입니다.'); const ans = S(x.answer).trim().slice(0, 2000); if (!ans) throw new Error('답변 내용이 비었습니다.'); q.a = ans; q.st = 'answered'; q.aAt = new Date().toISOString().slice(0, 16).replace('T', ' '); q.by = 'AI 연결: ' + a.name; return { ok: true, question_id: q.id }; } },
    { name: 'post_notice', scope: 'write', description: '공지를 등록합니다(과정 공지 또는 기관 전체 공지).', inputSchema: { type: 'object', properties: { title: { type: 'string', maxLength: 80 }, body: { type: 'string', maxLength: 2000 }, course_id: { type: 'string', description: '생략하면 기관 전체 공지' } }, required: ['title'] },
      write: (doc, a, x) => { const n = { id: 'n' + crypto.randomBytes(4).toString('hex'), title: S(x.title).trim().slice(0, 80), body: S(x.body).slice(0, 2000), at: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), pin: false, by: 'AI 연결: ' + a.name }; if (!n.title) throw new Error('제목이 비었습니다.');
        if (x.course_id) { const c = (doc.classes || []).find(k => k.id === S(x.course_id)); if (!c) throw new Error('없는 과정입니다.'); c.notices = [n, ...(c.notices || [])].slice(0, 50); } else doc.notices = [n, ...(doc.notices || [])].slice(0, 100); return { ok: true, notice_id: n.id }; } },
    { name: 'create_course_draft', scope: 'write', description: '새 과정 초안(준비중)을 만듭니다. 주차별 제목을 주면 커리큘럼 챕터로 넣습니다. 공개 · 수강생 배정은 스튜디오에서 승인합니다.', inputSchema: { type: 'object', properties: { name: { type: 'string', maxLength: 60 }, goal: { type: 'string', maxLength: 300 }, weeks: { type: 'array', items: { type: 'string' }, maxItems: 30 } }, required: ['name'] },
      write: (doc, a, x) => { const name = S(x.name).trim().slice(0, 60); if (!name) throw new Error('과정 이름이 비었습니다.'); const id = 'c' + crypto.randomBytes(4).toString('hex'); const W = (Array.isArray(x.weeks) ? x.weeks : []).slice(0, 30).map(S);
        const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
        doc.classes = [...(doc.classes || []), { id, name, kind: 'period', sub: '', legal: false, status: '준비중', price: 0, open: '지정 회원', start: today, end: today, teacher: '', group: '', learners: [], prog: {}, goal: S(x.goal).slice(0, 300), curriculum: W.map((t, i) => ({ id: 'it' + crypto.randomBytes(4).toString('hex'), type: 'chapter', title: `${i + 1}주차 ${t}`.slice(0, 80), week: i + 1 })), criteria: { video: 60, exam: 20, assign: 20, threshold: 80 }, cert: 'auto', skip: false, speed: true, early: false, community: 'class', hours: 0, notices: [], by: 'AI 연결: ' + a.name }];
        return { ok: true, course_id: id, status: '준비중' }; } }
  ];

  const rpcErr = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  async function handle(req, res, send) {
    if (req.method === 'GET' || req.method === 'DELETE') return send(res, 405, { error: 'method', message: '이 서버는 POST(JSON 응답)만 지원합니다.' }, { allow: 'POST' });
    if (req.method !== 'POST') return send(res, 405, 'method');
    const a = await keyAuth(req);
    if (!a) return send(res, 401, rpcErr(null, -32001, 'API 키가 없거나 올바르지 않습니다. 스튜디오 › 설정 › 연동 › AI 연결(MCP)에서 발급한 키를 Authorization: Bearer 로 보내세요.'), { 'www-authenticate': 'Bearer realm="didisam"' });
    limit('mcp:' + a.id, 120, 60e3);
    let msg; try { msg = await readBody(req, 256 * 1024); } catch (e) { return send(res, 400, rpcErr(null, -32700, 'JSON 형식이 올바르지 않습니다.')); }
    if (Array.isArray(msg)) return send(res, 400, rpcErr(null, -32600, '일괄 요청은 지원하지 않습니다.'));
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return send(res, 400, rpcErr(msg && msg.id, -32600, '잘못된 요청입니다.'));
    const id = msg.id; const p = msg.params || {};
    if (id === undefined || id === null) return send(res, 202, null); // 알림(notifications/*)
    const ok = result => send(res, 200, { jsonrpc: '2.0', id, result });
    if (msg.method === 'initialize') return ok({ protocolVersion: PROTO.includes(p.protocolVersion) ? p.protocolVersion : PROTO[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'didisam-studio', title: '디디쌤 스튜디오', version }, instructions: `${a.org}(${a.type}) 교육 운영 데이터에 연결되었습니다. 이 키의 권한: ${a.scope === 'write' ? '읽기 + 쓰기(질문 답변 · 공지 · 과정 초안)' : '읽기 전용'}. 학습자는 번호 · 소속으로만 식별되며 이름 · 연락처는 제공하지 않습니다.` });
    if (msg.method === 'ping') return ok({});
    if (msg.method === 'tools/list') return ok({ tools: TOOLS.filter(t => a.scope === 'write' || t.scope === 'read').map(t => ({ name: t.name, description: t.description + (t.scope === 'write' ? ' (쓰기 권한 키 필요)' : ''), inputSchema: t.inputSchema, annotations: { readOnlyHint: t.scope === 'read' } })) });
    if (msg.method !== 'tools/call') return send(res, 200, rpcErr(id, -32601, '지원하지 않는 메서드입니다: ' + msg.method));
    const T = TOOLS.find(t => t.name === p.name); const x = p.arguments && typeof p.arguments === 'object' ? p.arguments : {};
    if (!T) return send(res, 200, rpcErr(id, -32602, '없는 도구입니다: ' + S(p.name)));
    const fail = m => ok({ content: [{ type: 'text', text: m }], isError: true });
    if (T.scope === 'write' && a.scope !== 'write') return fail('이 키는 읽기 전용입니다. 쓰기 권한 키를 발급받으세요.');
    try {
      const out = await inTenant(pool, a.tid, async c => {
        const r = (await c.query('select doc, rev from tenant_state where tenant_id = $1' + (T.write ? ' for update' : ''), [a.tid])).rows[0];
        if (!r) throw new Error('아직 스튜디오 데이터가 없습니다. 스튜디오에서 기관 구성을 먼저 저장하세요.');
        const room = (r.doc.org && r.doc.org.room) || {}; if (room.egress && room.egress.mcp === false) throw new Error('이 기관의 데이터룸 정책에서 외부 AI 연결(MCP)이 꺼져 있습니다.');
        if (!T.write) return T.run(r.doc, a, x);
        const res2 = T.write(r.doc, a, x); const s = JSON.stringify(r.doc);
        await c.query('update tenant_state set doc = $2, rev = rev + 1, bytes = $3, updated_at = now() where tenant_id = $1', [a.tid, s, s.length]);
        await audit(c, a.tid, 'mcp:' + a.name, 'mcp.' + T.name, { key: a.id, args: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, S(v).slice(0, 80)])) });
        return res2;
      });
      return ok({ content: [{ type: 'text', text: JSON.stringify(out, null, 1) }], structuredContent: out, isError: false });
    } catch (e) { return fail(e instanceof HttpErr ? e.message : S(e && e.message || '처리하지 못했습니다.').slice(0, 300)); }
  }
  return { listKeys, createKey, revokeKey, handle, TOOLS };
}
module.exports = { createMcp };
