'use strict';
/* 체크리스트 09 · 11 Java 대조 — Node aitools.js = Java cmm/DdAiTools(요청 판정 · 응답 확인 목록 · 토큰 · 도구 목록 해시)
   사용: mvn -q -o -f service-egov/pom.xml -DskipTests package 뒤 node tests/server/aitools-parity.js (WEB-INF/lib를 classpath로 씀) */
const fs = require('fs'); const os = require('os'); const path = require('path'); const { execFileSync } = require('child_process');
const AT = require('../../service/server/aitools');
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const EG = path.join(__dirname, '../../service-egov'); const CLS = path.join(EG, 'target/classes'); const LIB = path.join(EG, 'target/didisam-egov/WEB-INF/lib');
const S = { secret: 'pep', tid: 'tn_x', uid: 'u1' };
const q = [{ type: 'tool_use', id: 'a1', name: 'list_open_questions', input: {} }];
const M = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: q }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a1', content: 'x' }] },
  { role: 'assistant', content: [{ type: 'tool_use', id: 'a2', name: 'run_intent', input: {} }, { type: 'tool_use', id: 'a3', name: 'create_courses', input: {} }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a2', content: 'ok' }, { type: 'tool_result', tool_use_id: 'a3', content: 'ok' }] }];
const REQ = {
  ok: { messages: [{ role: 'user', content: 'hi' }], tools: [{ name: 'get_overview' }, { type: 'web_search_20250305', name: 'web_search' }, { type: 'bash_20250124', name: 'bash' }] },
  unreg: { messages: [], tools: [{ name: 'x_send' }, { name: 'get_overview' }, { type: 'custom', name: 'y' }] },
  mcp1: { messages: [], mcp_servers: [{ url: 'https://e/mcp' }] }, mcp2: { messages: [], tools: [{ type: 'mcp_toolset' }] },
  taint: { messages: M }, deny: { messages: M.slice(0, 4).concat([{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a2', is_error: true }, { type: 'tool_result', tool_use_id: 'a3' }] }]) },
  tok: { messages: M, toolConfirm: { a2: AT.confirmToken('pep', 'tn_x', 'u1', 'a2', 'run_intent') } }, clean: { messages: [M[0], M[3], M[4]] },
  web: { messages: [M[0], { role: 'assistant', content: [{ type: 'web_search_tool_result', content: [] }, { type: 'tool_use', id: 'w', name: 'create_automation' }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'w' }] }] },
  unk: { messages: [M[0], { role: 'assistant', content: [{ type: 'tool_use', id: 'z', name: 'mystery' }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'z' }] }] },
};
const RES = { r1: [M.slice(0, 3), [{ type: 'tool_use', id: 'b', name: 'run_studio_command' }, { type: 'tool_use', id: 'c', name: 'get_overview' }]], r2: [[M[0]], [{ type: 'tool_use', id: 'b', name: 'run_studio_command' }]], r3: [[M[0]], [{ type: 'document' }, { type: 'tool_use', id: 'd', name: 'studio_action' }]] };
const N = { req: {}, res: {}, tok: AT.confirmToken('pep', 'tn_x', 'u1', 'id9', 'run_intent'), hash: AT.toolsHash(require(path.join(EG, 'src/main/resources/egovframework/mcp/tools.json'))),
  hashX: AT.toolsHash([{ name: 'b', scope: 'read', description: '줄\n바꿈 "따옴표" \u0001 탭\t', inputSchema: { z: 1, a: [1.5, null, true, { y: 'x' }] } }, { name: 'a', scope: 'write', description: 'd' }]) };
for (const [k, b] of Object.entries(REQ)) { const v = AT.checkRequest(b, S); N.req[k] = v ? [v.status, v.code, v.msg, v.detail || {}] : null; }
for (const [k, [m, c]] of Object.entries(RES)) N.res[k] = AT.checkResponse(m, c);
if (!fs.existsSync(path.join(CLS, 'egovframework/didisam/cmm/DdAiTools.class')) || !fs.existsSync(LIB)) { console.log('- Java 대조 건너뜀(mvn package 필요)'); process.exit(0); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aitp-')); const pk = path.join(dir, 'egovframework/didisam/cmm'); fs.mkdirSync(pk, { recursive: true });
fs.writeFileSync(path.join(dir, 'fx.json'), JSON.stringify({ REQ, RES, X: [{ name: 'b', scope: 'read', description: '줄\n바꿈 "따옴표" \u0001 탭\t', inputSchema: { z: 1, a: [1.5, null, true, { y: 'x' }] } }, { name: 'a', scope: 'write', description: 'd' }] }));
fs.writeFileSync(path.join(pk, 'AtParity.java'), `package egovframework.didisam.cmm;
import com.fasterxml.jackson.databind.*; import com.fasterxml.jackson.databind.node.*; import java.nio.file.*; import java.util.*;
public class AtParity { public static void main(String[] a) throws Exception { ObjectMapper om = new ObjectMapper(); JsonNode fx = om.readTree(Files.readString(Path.of(a[0]))); ObjectNode out = om.createObjectNode();
  ObjectNode rq = out.putObject("req"); fx.get("REQ").fieldNames().forEachRemaining(k -> { Object[] v = DdAiTools.checkRequest(fx.get("REQ").get(k), "pep", "tn_x", "u1");
    if (v == null) rq.putNull(k); else { ArrayNode r = rq.putArray(k); r.add((Integer) v[0]); r.add((String) v[1]); r.add((String) v[2]); try { r.add(om.readTree((String) v[3])); } catch (Exception e) { throw new RuntimeException(e); } } });
  ObjectNode rs = out.putObject("res"); fx.get("RES").fieldNames().forEachRemaining(k -> rs.set(k, DdAiTools.checkResponse(fx.get("RES").get(k).get(0), fx.get("RES").get(k).get(1))));
  out.put("tok", DdAiTools.confirmToken("pep", "tn_x", "u1", "id9", "run_intent"));
  List<JsonNode> T = new ArrayList<>(); om.readTree(Files.readString(Path.of(a[1]))).forEach(T::add); out.put("hash", DdAiTools.toolsHash(T));
  List<JsonNode> X = new ArrayList<>(); fx.get("X").forEach(X::add); out.put("hashX", DdAiTools.toolsHash(X));
  new java.io.PrintStream(System.out, true, "UTF-8").print(om.writeValueAsString(out)); } }`);
const cp = [CLS, path.join(LIB, '*')].join(path.delimiter);
try {
  execFileSync('javac', ['-nowarn', '-encoding', 'UTF-8', '-cp', cp, '-d', dir, path.join(pk, 'AtParity.java')], { stdio: 'pipe' });
  const J = JSON.parse(execFileSync('java', ['-cp', dir + path.delimiter + cp, 'egovframework.didisam.cmm.AtParity', path.join(dir, 'fx.json'), path.join(EG, 'src/main/resources/egovframework/mcp/tools.json')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  for (const k of Object.keys(REQ)) ok(JSON.stringify(J.req[k]) === JSON.stringify(N.req[k]), `요청 판정 ${k}: ${JSON.stringify(N.req[k] && N.req[k][1])}${JSON.stringify(J.req[k]) === JSON.stringify(N.req[k]) ? '' : ' — Java ' + JSON.stringify(J.req[k]).slice(0, 200)}`);
  for (const k of Object.keys(RES)) ok(JSON.stringify(J.res[k]) === JSON.stringify(N.res[k]), `응답 확인 목록 ${k}${JSON.stringify(J.res[k]) === JSON.stringify(N.res[k]) ? '' : ' — Java ' + JSON.stringify(J.res[k])}`);
  ok(J.tok === N.tok, '확인 토큰 동일'); ok(J.hash === N.hash && N.hash === AT.MCP_ALLOW[0].toolsHash, `MCP 도구 해시 동일 · 고정값 일치 ${J.hash}`); ok(J.hashX === N.hashX, '정규화(키 정렬 · 이스케이프 · 숫자) 동일');
} catch (e) { ok(false, 'Java 대조 실행 — ' + String(e.stderr || e.message).slice(0, 400)); }
console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과'); process.exit(fails ? 1 : 0);
