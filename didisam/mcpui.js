/* 디디쌤 스튜디오 v16 — 외부 AI 연결(MCP) · API 키 화면(설정 › 연동 맨 위)
   운영 서버: /api/keys 발급 · 목록 · 폐기, MCP 주소 = 이 서버/mcp
   데모: 브라우저에서 키 형식만 체험(서버 저장 없음, 실제 연결은 운영 서버에서). 평문 키는 발급 창에서 한 번만 보여 준다. */
'use strict';
const MCPX = { keys: null, err: '', busy: false };
const mcpLive = () => typeof LIVE !== 'undefined' && !!LIVE.user;
const mcpUrl = () => mcpLive() ? location.origin + '/mcp' : 'https://studio.aisam.com/mcp';
const MCP_TOOLS = [['get_overview', '운영 현황 요약', 'r'], ['list_courses', '과정 목록 · 진도', 'r'], ['get_course', '과정 커리큘럼 · 평가 기준', 'r'], ['list_learners', '학습자(번호 · 소속만)', 'r'], ['get_learner_progress', '학습자별 진도 · 점수', 'r'], ['list_questions', '질문함', 'r'], ['answer_question', '질문 답변 등록', 'w'], ['post_notice', '공지 등록', 'w'], ['create_course_draft', '과정 초안 만들기', 'w']];
async function mcpLoad(force) {
  if (MCPX.busy) return; if (MCPX.keys && !force) return;
  if (!mcpLive()) { MCPX.keys = (S.apikeys || []).slice(); return; }
  MCPX.busy = true; try { MCPX.keys = (await api('GET', '/api/keys')).keys || []; MCPX.err = ''; } catch (e) { MCPX.err = e.message; MCPX.keys = []; } finally { MCPX.busy = false; }
  if (UI.settings === 'integr' && CUR.ws === 'settings') render();
}
const mcpPol = () => { const r = S.org.room || (S.org.room = {}); r.egress = r.egress || {}; return r.egress.mcp !== false; };
function mcpCard() {
  if (!MCPX.keys) setTimeout(() => mcpLoad(), 0);
  const K = MCPX.keys || []; const on = mcpPol(); const owner = S.me.role === 'owner';
  const row = k => `<tr class="${k.revoked_at ? 'off' : ''}"><td><b>${esc(k.name)}</b></td><td><code>${esc(k.prefix)}…</code></td><td>${k.scope === 'write' ? tag('읽기 + 쓰기', 'mg') : tag('읽기 전용', '')}</td><td>${esc(String(k.created_at || '').slice(0, 10))}</td><td>${k.last_used ? esc(String(k.last_used).slice(0, 16).replace('T', ' ')) : '—'}</td><td>${+k.calls || 0}</td><td>${k.revoked_at ? tag('폐기됨', 'r') : tag('사용 중', 'g')}</td><td>${!k.revoked_at && owner ? `<button class="btn sm ghost" data-act="mcp-revoke" data-v="${esc(k.id)}">폐기</button>` : ''}</td></tr>`;
  return `<div class="card mcpc" id="mcpCard"><div class="ch mch2"><span class="orb sm" aria-hidden="true"></span><div><b>AI 연결(MCP) · API 키</b><small>Claude · ChatGPT · 사내 AI 에이전트가 우리 기관 데이터로 바로 일하게 합니다</small></div>${mcpLive() ? tag('운영 서버 · 사용 가능', 'g') : tag('데모 · 발급 체험', 'y')}</div>
    <ol class="mcpflow"><li><b>1. 키 발급</b><span>어디에 쓰는지 이름을 붙이고 권한(읽기 / 쓰기)을 고릅니다</span></li><li><b>2. AI에 연결</b><span>MCP 주소와 키를 AI 앱에 등록합니다(발급 창의 설정 복사)</span></li><li><b>3. AI에게 지시</b><span>"이번 주 법정교육 미이수자 요약해줘"처럼 말하면 우리 데이터로 답합니다</span></li></ol>
    <div class="mcpurl"><span>MCP 주소</span><code>${esc(mcpUrl())}</code><button class="btn sm" data-act="mcp-copy" data-v="${esc(mcpUrl())}">복사</button></div>
    ${owner ? `<div class="mcpnew"><label class="fl">키 이름<input id="mcpName" maxlength="40" placeholder="예: 교학팀 Claude 데스크톱"></label><label class="fl">권한<select id="mcpScope"><option value="read">읽기 전용 — 현황 · 과정 · 진도 · 질문 조회</option><option value="write">읽기 + 쓰기 — 질문 답변 · 공지 · 과정 초안</option></select></label><button class="btn ink" data-act="mcp-new">${ic('spark', 15)} 키 발급</button></div>` : '<p class="mini">API 키 발급 · 폐기는 정운영자만 할 수 있습니다.</p>'}
    ${MCPX.err ? `<p class="mini warnc">${esc(MCPX.err)}</p>` : ''}
    <div class="tbl"><table><thead><tr><th>이름</th><th>키</th><th>권한</th><th>발급일</th><th>최근 사용</th><th>호출</th><th>상태</th><th></th></tr></thead><tbody>${K.length ? K.map(row).join('') : '<tr><td colspan="8" class="empty">발급한 키가 없습니다.</td></tr>'}</tbody></table></div>
    <details class="mcpt"><summary>AI가 쓸 수 있는 도구 ${MCP_TOOLS.length}종</summary><ul>${MCP_TOOLS.map(([n, d, w]) => `<li><code>${n}</code><span>${d}</span>${w === 'w' ? tag('쓰기', 'mg') : tag('읽기', '')}</li>`).join('')}</ul></details>
    <label class="ckl"><input type="checkbox" data-chg="mcp-pol" ${on ? 'checked' : ''} ${owner ? '' : 'disabled'}> 데이터룸 정책: 외부 AI 연결(MCP) 허용 — 끄면 모든 키의 도구 호출이 거부됩니다</label>
    <p class="mini">키는 발급 창에서 한 번만 보입니다(서버는 지문만 저장). 학습자는 번호 · 소속으로만 전달되고 이름 · 연락처 · 접근코드는 내보내지 않습니다. 쓰기 도구 호출은 모두 감사 기록에 남습니다.</p></div>`;
}
{ const base = integrView; integrView = () => mcpCard() + base(); }
function mcpSnippets(key) { const u = mcpUrl();
  return [['Claude Code', `claude mcp add --transport http didisam ${u} \\\n  --header "Authorization: Bearer ${key}"`],
    ['Claude 데스크톱 · Cursor', JSON.stringify({ mcpServers: { didisam: { command: 'npx', args: ['-y', 'mcp-remote', u, '--header', 'Authorization:Bearer ${DIDISAM_KEY}'], env: { DIDISAM_KEY: key } } } }, null, 2)],
    ['원격 MCP(헤더 지원 앱)', JSON.stringify({ didisam: { type: 'http', url: u, headers: { Authorization: 'Bearer ' + key } } }, null, 2)],
    ['연결 시험(curl)', `curl -s ${u} -H "Authorization: Bearer ${key}" \\\n  -H "content-type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_overview","arguments":{}}}'`]]; }
function mcpShow(r) {
  const S2 = mcpSnippets(r.key);
  modal('API 키를 발급했습니다', `<div class="mcpkey"><p class="mini"><b>이 키는 지금 한 번만 보입니다.</b> 복사해 안전한 곳(비밀번호 관리자 · AI 앱 설정)에 넣으세요. 잃어버리면 폐기하고 새로 발급합니다.</p>
    <div class="mcpurl"><span>${esc(r.name)} · ${r.scope === 'write' ? '읽기 + 쓰기' : '읽기 전용'}</span><code id="mcpKey">${esc(r.key)}</code><button class="btn sm ink" data-act="mcp-copy" data-v="${esc(r.key)}">키 복사</button></div>
    <div class="seg2 mcptabs">${S2.map(([n], i) => `<button type="button" class="${i ? '' : 'on'}" data-act="mcp-tab" data-v="${i}">${esc(n)}</button>`).join('')}</div>
    ${S2.map(([n, c], i) => `<div class="mcpsn" data-i="${i}" ${i ? 'hidden' : ''}><pre>${esc(c)}</pre><button class="btn sm" data-act="mcp-copy" data-v="${esc(c)}">설정 복사</button></div>`).join('')}
    ${mcpLive() ? '' : '<p class="mini warnc">데모 화면에서 만든 키는 형식 체험용이라 실제로 연결되지 않습니다. 운영 서버(studio.aisam.com)에서 발급하면 그대로 연결됩니다.</p>'}
    <p class="mini">연결 후 AI에게 이렇게 지시해 보세요: "디디쌤에서 이번 주 운영 현황 요약해줘" · "답변 안 된 질문 정리해줘"${r.scope === 'write' ? ' · "질문 q1에 답변 등록해줘"' : ''}</p></div>`, [{ id: 'ok', label: '복사했습니다', kind: 'pri' }]);
  if (typeof gdSig === 'function') gdSig('key');
}
ACT['mcp-tab'] = el => { const w = el.closest('.mwrap') || document; w.querySelectorAll('.mcptabs button').forEach(b => b.classList.toggle('on', b === el)); w.querySelectorAll('.mcpsn').forEach(s => { s.hidden = s.dataset.i !== el.dataset.v; }); };
ACT['mcp-copy'] = el => { const no = () => toast('복사하지 못했습니다. 직접 선택해 복사하세요.', 'warn'); try { Promise.resolve(navigator.clipboard && navigator.clipboard.writeText(el.dataset.v)).then(() => toast('복사했습니다.', 'ok'), no); } catch (e) { no(); } if (typeof gdSig === 'function' && /mcp|http/.test(el.dataset.v)) gdSig('copy'); };
ACT['mcp-new'] = async () => {
  const name = ($('#mcpName') || {}).value || ''; const scope = ($('#mcpScope') || {}).value || 'read';
  if (!name.trim()) { toast('키 이름(어디에 쓰는지)을 입력하세요.', 'warn'); $('#mcpName') && $('#mcpName').focus(); return; }
  try {
    let r;
    if (mcpLive()) r = await api('POST', '/api/keys', { name: name.trim(), scope });
    else { const b = new Uint8Array(30); crypto.getRandomValues(b); const key = 'dds_' + btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      r = { id: 'k_' + Math.random().toString(16).slice(2, 14).padEnd(12, '0'), name: name.trim().slice(0, 40), scope, prefix: key.slice(0, 12), key };
      S.apikeys = [{ id: r.id, name: r.name, prefix: r.prefix, scope, created_by: S.me.name, created_at: today(), last_used: null, calls: 0, revoked_at: null }, ...(S.apikeys || [])].slice(0, 50); }
    logAudit(`API 키 발급 — ${r.name}(${scope === 'write' ? '읽기 + 쓰기' : '읽기'})`); save(); MCPX.keys = null; await mcpLoad(true); render(); mcpShow(r);
  } catch (e) { toast(e.message || '발급하지 못했습니다.', 'warn'); }
};
ACT['mcp-revoke'] = el => { const k = (MCPX.keys || []).find(x => x.id === el.dataset.v); if (!k) return;
  modal('API 키 폐기', `<p>「${esc(k.name)}」(${esc(k.prefix)}…) 키를 폐기합니다. 이 키로 연결된 AI는 즉시 접근할 수 없게 됩니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '폐기', kind: 'red', run: async () => {
    try { if (mcpLive()) await api('POST', '/api/keys/revoke', { id: k.id }); else { const x = (S.apikeys || []).find(y => y.id === k.id); if (x) x.revoked_at = today(); }
      logAudit(`API 키 폐기 — ${k.name}`); save(); MCPX.keys = null; await mcpLoad(true); render(); toast('키를 폐기했습니다.', 'ok'); } catch (e) { toast(e.message, 'warn'); } } }]); };
ACT['mcp-pol'] = el => { const r = S.org.room || (S.org.room = {}); r.egress = { ...(r.egress || {}), mcp: !!el.checked }; logAudit(`데이터룸 정책 — 외부 AI 연결(MCP) ${el.checked ? '허용' : '차단'}`); save(); toast(el.checked ? '외부 AI 연결을 허용했습니다.' : '외부 AI 연결을 막았습니다. 모든 키의 도구 호출이 거부됩니다.', el.checked ? 'ok' : 'warn'); };
/* AI SAM: 'API 키 · MCP' 지시는 연동 화면으로 */
{ const base = answer; answer = (q, ...r) => { if (/(mcp|MCP|API\s*키|api\s*key|외부\s*AI|AI\s*연결|키\s*발급)/.test(q) && !/튜터/.test(q)) { UI.settings = 'integr'; setTimeout(() => { go('settings'); setTimeout(() => { const n = $('#mcpName'); if (n) { n.scrollIntoView({ block: 'center' }); n.focus(); } }, 120); }, 50);
  return { text: `외부 AI 연결(MCP) 화면을 열었습니다.\n1. 키 이름(예: 교학팀 Claude)과 권한을 고르고 '키 발급'을 누르세요.\n2. 발급 창에서 MCP 주소와 키(또는 앱별 설정)를 복사해 AI 앱에 등록합니다.\n3. 연결되면 AI에게 "디디쌤에서 이번 주 운영 현황 요약해줘"라고 지시해 보세요.\n키는 한 번만 보이며, 학습자 이름 · 연락처는 AI에 전달되지 않습니다. 순서대로 따라 하려면 "MCP 가이드 시작해줘"라고 말씀하세요.` }; } return base(q, ...r); }; }
