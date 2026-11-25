'use strict';
/* 체크리스트 09 · 11 (가디언 2-1 · 2-2) — Java: cmm/DdAiTools(같은 표 · 같은 해시 · 같은 오류 코드)
   ① AI SAM 도구 등급: 0 읽기 · 1 내부 쓰기 · 2 외부 발송 · 3 고위험. 등록되지 않은 도구는 /api/ai/messages에서 400 tool_unregistered.
   ② 외부 출처(웹 검색 결과 · 첨부 문서 · 이미지 · 학습자 글을 돌려주는 도구 결과)를 읽은 뒤의 2등급 이상 호출, 3등급 호출은 사람 확인이 필요하다:
      응답에 toolGuard.confirm[{id,name,tier}]을 붙이고, 다음 요청에서 그 tool_use의 tool_result는 is_error(거부)이거나
      toolConfirm[id] = POST /api/ai/tool-confirm이 발급한 토큰(세션 · 기관 · 도구 id에 묶인 HMAC, 3등급은 비밀번호 재확인)이어야 한다 → 아니면 428 tool_confirm_required.
   ③ MCP 허용목록: 등록된 MCP 서버만(출처 · 버전 · 도구 목록 해시 · scope · 외부 전송처). 외부 MCP(mcp_servers · mcp_toolset)는 등록분이 없어 403 mcp_not_allowed.
      우리 MCP 서버(/mcp)의 도구 목록 해시가 고정값과 다르면 연결을 멈추고(503) '기능 끄기' 신호를 남긴다. 도구를 바꿀 때는 해시를 함께 갱신하고 사람이 재검토한다. */
const crypto = require('node:crypto');

const TIER = Object.freeze({
  get_overview: 0, list_courses: 0, list_learners_at_risk: 0, list_open_questions: 0, open_screen: 0, download_report: 0, start_guide: 0, connect_guide: 0, web_search: 0,
  create_courses: 1, add_learners: 1, enroll_learners: 1, update_course: 1, build_homepage: 1, edit_homepage: 1,
  run_studio_command: 2, studio_action: 2, run_intent: 2, run_screen_action: 2, create_automation: 2, /* 계획 카드로 메시지 · 메일 · Slack 발송까지 이어질 수 있음 */
});
const EXT_TOOLS = ['list_open_questions']; /* 결과에 학습자 글(외부 출처)이 담기는 도구 */
const EXT_BLOCKS = ['web_search_tool_result', 'web_fetch_tool_result', 'document', 'search_result', 'mcp_tool_result', 'image'];

const toolName = t => (t && typeof t === 'object' && t.type && t.type !== 'custom' ? (/^web_search_\d{8}$/.test(String(t.type)) ? 'web_search' : '') : String((t && t.name) || ''));
const tierOf = n => (Object.prototype.hasOwnProperty.call(TIER, n) ? TIER[n] : -1);
const blocks = m => (m && Array.isArray(m.content) ? m.content.filter(x => x && typeof x === 'object') : []);

/* messages[0..end) 안에 외부 출처가 있었는가 */
function taintedBefore(messages, end) {
  const ext = new Set();
  for (let i = 0; i < Math.min(end, messages.length); i++) for (const x of blocks(messages[i])) {
    if (EXT_BLOCKS.includes(x.type)) return true;
    if (x.type === 'tool_use' && EXT_TOOLS.includes(x.name)) ext.add(x.id);
    if (x.type === 'tool_result' && ext.has(x.tool_use_id)) return true;
  }
  return false;
}
const needsHuman = (tier, tainted) => tier >= 3 || (tier >= 2 && tainted);
const confirmToken = (secret, tid, uid, id, name) => crypto.createHmac('sha256', String(secret)).update(`aitc|${tid}|${uid}|${id}|${name}`).digest('hex').slice(0, 40);
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/* 요청 점검. 위반이면 { status, code, msg, detail } */
function checkRequest(b, { secret, tid, uid }) {
  if (b.mcp_servers !== undefined && !(Array.isArray(b.mcp_servers) && b.mcp_servers.every(s => mcpAllowed(s && s.url)))) return { status: 403, code: 'mcp_not_allowed', msg: '허용목록에 없는 MCP 서버는 연결할 수 없습니다.' };
  const tools = Array.isArray(b.tools) ? b.tools : [];
  if (tools.some(t => t && t.type === 'mcp_toolset')) return { status: 403, code: 'mcp_not_allowed', msg: '허용목록에 없는 MCP 서버는 연결할 수 없습니다.' };
  const bad = tools.filter(t => t && typeof t === 'object' && (!t.type || t.type === 'custom') && tierOf(toolName(t)) < 0).map(toolName);
  if (bad.length) return { status: 400, code: 'tool_unregistered', msg: `등급이 등록되지 않은 도구는 쓸 수 없습니다: ${bad.slice(0, 5).join(', ').slice(0, 200)}`, detail: { tools: bad.slice(0, 5).map(s => s.slice(0, 60)) } };
  const M = Array.isArray(b.messages) ? b.messages : []; const tc = b.toolConfirm && typeof b.toolConfirm === 'object' ? b.toolConfirm : {};
  for (let i = 0; i < M.length; i++) {
    if (!M[i] || M[i].role !== 'assistant') continue;
    const uses = blocks(M[i]).filter(x => x.type === 'tool_use'); if (!uses.length) continue;
    const tainted = taintedBefore(M, i) || blocks(M[i]).some(x => EXT_BLOCKS.includes(x.type)); /* 같은 응답 안의 웹 검색 결과 포함 */ const res = blocks(M[i + 1]).filter(x => x.type === 'tool_result');
    for (const u of uses) {
      const tier = tierOf(String(u.name || '')); if (!needsHuman(tier < 0 ? 3 : tier, tainted)) continue;
      const r = res.find(x => x.tool_use_id === u.id); if (!r || r.is_error === true) continue;
      if (!(typeof tc[u.id] === 'string' && safeEq(tc[u.id], confirmToken(secret, tid, uid, u.id, u.name)))) return { status: 428, code: 'tool_confirm_required', msg: '외부 출처를 읽은 뒤의 발송 · 고위험 작업은 운영자 확인 후에만 이어갈 수 있습니다.', detail: { id: String(u.id).slice(0, 80), name: String(u.name).slice(0, 60), tier: tier < 0 ? 3 : tier } };
    }
  }
  return null;
}
/* 응답 점검: 사람 확인이 필요한 tool_use 목록 */
function checkResponse(messages, content) {
  const C = Array.isArray(content) ? content : [];
  const tainted = taintedBefore(messages || [], (messages || []).length) || C.some(x => x && EXT_BLOCKS.includes(x.type));
  return C.filter(x => x && x.type === 'tool_use').map(x => ({ id: x.id, name: x.name, tier: tierOf(String(x.name || '')) })).map(x => ({ ...x, tier: x.tier < 0 ? 3 : x.tier })).filter(x => needsHuman(x.tier, tainted));
}

/* ── MCP 허용목록 · 도구 목록 해시 ── */
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const toolsHash = tools => 'sha256:' + crypto.createHash('sha256').update(canon((tools || []).map(t => ({ name: t.name, scope: t.scope, description: t.description, inputSchema: t.inputSchema })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))), 'utf8').digest('hex');
const MCP_ALLOW = Object.freeze([
  Object.freeze({ id: 'didisam-studio', origin: 'internal /mcp (service/server/mcp.js = service-egov tools.json)', version: '16.0', scope: ['read', 'write'], egress: [], url: '', toolsHash: 'sha256:19d8d4935b4b93ccb69ac0f03e294a93a65261e3614eacca5141d95c84291ff4' }),
]);
const mcpAllowed = url => !!url && MCP_ALLOW.some(m => m.url && m.url === url);
function mcpPin(id, tools, want) {
  const e = MCP_ALLOW.find(m => m.id === id); const got = toolsHash(tools); const w = want || (e && e.toolsHash) || '';
  return { ok: !!w && got === w, want: w, got };
}

module.exports = { TIER, EXT_TOOLS, EXT_BLOCKS, tierOf, toolName, taintedBefore, needsHuman, confirmToken, checkRequest, checkResponse, canon, toolsHash, MCP_ALLOW, mcpAllowed, mcpPin };
