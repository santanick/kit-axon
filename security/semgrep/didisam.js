/* Semgrep 규칙 시험 예제(실행 코드 아님) — semgrep --test security/semgrep */
async function rls(pool, inTenant, tid, b) {
  // ruleid: didisam-rls-missing-tenant-node
  await pool.query('select learner_id::text id from pii.identity where tid = $1 and email_bidx = $2', [tid, b]);
  // ruleid: didisam-rls-missing-tenant-node
  await pool.query('select doc from tenant_state where tenant_id = $1', [tid]);
  // ok: didisam-rls-missing-tenant-node
  await pool.query('select id from tenants where id = $1', [tid]);
  // ok: didisam-rls-missing-tenant-node
  await inTenant(pool, tid, c => c.query('select doc from tenant_state where tenant_id = $1', [tid]));
}
function routes(needOwner, need, needStaff, HttpErr, sec) {
  return {


    // ruleid: didisam-owner-check-missing-node
    'GET /api/staff': async req => { const a = await need(req); return { a }; },


    // ok: didisam-owner-check-missing-node
    'POST /api/staff/remove': async req => { const a = await needOwner(req); return { a }; },


    // ok: didisam-owner-check-missing-node
    'GET /api/audit': async req => { const a = await needStaff(req); if (a.role !== 'owner') throw new HttpErr(403, 'x', 'role'); return {}; },


    // ruleid: didisam-owner-check-missing-node
    'POST /api/security/kill': async req => ({ ok: !!(await needStaff(req)) }),


    // ok: didisam-owner-check-missing-node
    'GET /api/security/summary': async req => sec.summary(await needOwner(req)),


    // ok: didisam-owner-check-missing-node
    'GET /api/state': async req => need(req),
  };
}
function secrets(env) {
  // ruleid: didisam-hardcoded-secret-literal
  const k = "sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  // ok: didisam-hardcoded-secret-literal
  const m = "sk-ant-";
  // ruleid: didisam-secret-weak-fallback-node
  const pepper = env.SESSION_PEPPER || env.SIGNUP_CODE || 'didisam-learner';
  // ok: didisam-secret-weak-fallback-node
  const url = env.ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages';
  return [m.length, pepper, url];
}
function html(el, esc, name, n, res) {
  // ruleid: didisam-innerhtml-unescaped
  el.innerHTML = `<b>${name}</b>`;
  // ok: didisam-innerhtml-unescaped
  el.innerHTML = `<b>${esc(name)}</b>`;
  // ok: didisam-innerhtml-unescaped
  el.innerHTML = `<i>${n.length}</i>`;
  // ruleid: didisam-innerhtml-unescaped
  el.insertAdjacentHTML('beforeend', `<li>${name}</li>`);
  // ruleid: didisam-innerhtml-raw-ai-output
  el.innerHTML = res.text;
  // ok: didisam-innerhtml-raw-ai-output
  el.textContent = res.text;
}
function aiCache(b) {
  // ruleid: didisam-ai-tools-passthrough
  const tools = Array.isArray(b.tools) && b.tools.length ? b.tools.slice(0, 16).map(t => t) : undefined;
  return tools;
}
