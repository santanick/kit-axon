'use strict';
/* MS Teams 연동 1차(기획서 F/grp/teams.md 1 · 3 · 4 · 5절) — 채널 알림(Workflows 웹훅) · 조직 연결(OIDC 확인 + 관리자 동의) ·
   교수자 위임 회의 생성 · 출석 제안 · Entra ID SSO(운영자 /api/oauth/microsoft/* · 학습자 /api/pub/<tid>/loauth/microsoft/*).
   - 키: MS_CLIENT_ID · MS_CLIENT_SECRET(또는 MS_CLIENT_CERT_PEM · MS_CLIENT_CERT_THUMB) · MS_AUTHORITY(기본 organizations) · TEAMS_WEBHOOK_HOSTS.
     MS_CLIENT_ID가 없으면 mode:"demo" — 외부 호출 없이 같은 모양의 결과(회의 · 출석 시연). 워크플로 주소는 키 없이도 실제 발송.
   - 비밀값(갱신 토큰 · 워크플로 주소)은 conn_secret.enc(AES-256-GCM, PII_KEY 파생, AAD = tid|conn|teams|kind|id)에만. 응답 · 기관 문서 · 로그에는 가린 값만.
   - 시험: OAUTH_MOCK_URL(운영 무시) → /microsoft/<authority>/{auth,token,adminconsent} · /graph/v1.0/* 모의 서버. TEAMS_WEBHOOK_TEST=1(운영 무시) → 루프백 http 웹훅 허용.
   - SQL: teams/sql/NN_*.sql(db.js가 lms_schema에 'teams/<파일>'로 기록). Java 대응: service-egov conn/web/TeamsController · cmm/DdTeams(같은 경로 · 같은 응답). */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const dnsP = require('node:dns').promises;
const { isPrivate } = require('../bench');
const G = require('../aiguard');
const SQL = path.join(__dirname, 'sql');

function sqlMigrations() {
  if (!fs.existsSync(SQL)) return [];
  return fs.readdirSync(SQL).filter(f => /^\d\d_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => ['teams/' + f, fs.readFileSync(path.join(SQL, f), 'utf8')]);
}

/* 오류 코드(1.8) — 운영자 합니다체 */
const MSG = {
  teams_unset: [503, 'Microsoft 앱 키가 서버에 설정되지 않아 시연 모드로 동작합니다.'],
  teams_role: [403, 'Teams 연결은 정운영자 · 관리자만 바꿀 수 있습니다.'],
  teams_consent: [409, '먼저 조직 관리자 동의(조직 연결)를 완료하세요.'],
  teams_state: [400, '연결 요청이 만료되었습니다. 다시 시도하세요.'],
  teams_denied: [400, 'Microsoft 동의 화면에서 허용하지 않았습니다.'],
  teams_tenant_taken: [409, '이 Microsoft 조직은 다른 기관에 이미 연결되어 있습니다.'],
  teams_tenant_mismatch: [403, '기관에 연결된 Microsoft 조직의 계정이 아닙니다.'],
  teams_account: [409, '회의 계정 연결이 없거나 만료되었습니다. 다시 연결하세요.'],
  teams_scope: [403, '허용된 권한이 부족합니다. 관리자 동의를 다시 받으세요.'],
  teams_webhook_url: [400, 'Teams 워크플로 주소 형식이 아닙니다.'],
  teams_webhook_fail: [502, '채널로 보내지 못했습니다. 워크플로가 켜져 있는지 확인하세요.'],
  teams_limit: [409, '알림 채널은 기관당 10곳까지 등록할 수 있습니다.'],
  teams_time: [400, '수업 시간을 확인하세요(종료가 시작보다 늦고 24시간 이내).'],
  teams_report_none: [404, '출석 보고서가 아직 없습니다. 회의 종료 후 잠시 뒤 다시 시도하세요.'],
  teams_rate: [429, 'Microsoft 요청 한도에 걸렸습니다. 잠시 뒤 다시 시도하세요.'],
  teams_provider: [502, 'Microsoft 서버 응답에 문제가 있습니다.'],
  teams_phase2: [501, '다음 단계에서 제공합니다.'],
  teams_bad_event: [400, '보낼 수 없는 알림 종류입니다.'],
  teams_input: [400, '입력값을 확인하세요.'],
  teams_none: [404, '없는 Teams 항목입니다.'],
  teams_item: [409, '반의 라이브 항목에 연결된 회의가 아닙니다.'],
};
const EVENTS = ['notice', 'due', 'approval', 'report', 'signup', 'pay'];
const EV_KO = { notice: '공지', due: '마감 임박', approval: '승인 요청', report: '주간 리포트', signup: '가입', pay: '결제', test: '연결 시험' };
const ATT = ['출석', '지각', '결석'];
const SSO_TYPES = ['univ', 'corp', 'public']; /* 학습자 Entra 로그인을 켤 수 있는 기관 유형(학원 · 평생 · 직훈 제외) */
const MSA_TID = '9188040d-6c67-4c5b-b112-36a304b66dad'; /* 개인 Microsoft 계정 — 받지 않는다 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPE_ACCT = 'openid offline_access OnlineMeetings.ReadWrite OnlineMeetingArtifact.Read.All';
const DEF_HOSTS = [/\.logic\.azure\.com$/i, /\.environment\.api\.powerplatform\.com$/i, /\.api\.powerplatform\.com$/i];
const OLD_HOOK = [/(^|\.)webhook\.office\.com$/i, /^outlook\.office\.com$/i, /^outlook\.office365\.com$/i];

const AZ = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rid = p => p + Array.from(crypto.randomBytes(10), b => AZ[b % 36]).join('');
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const maskUrl = u => { try { const x = new URL(u); return `${x.protocol}//${x.hostname.slice(0, 8)}…••••${u.slice(-3)}`; } catch (e) { return '••••'; } };
const maskUpn = e => { const [a, d] = String(e || '').split('@'); return d ? `${a.slice(0, 3)}••••@${d}` : (a ? a.slice(0, 2) + '••••' : ''); };
const maskTid = t => t ? `${String(t).slice(0, 4)}…••••${String(t).slice(-3)}` : '';
const kst = d => d ? new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '';

function teamsConfig(env) {
  const prod = env.NODE_ENV === 'production';
  const mock = !prod ? String(env.OAUTH_MOCK_URL || '').replace(/\/+$/, '') : '';
  const id = String(env.MS_CLIENT_ID || '').trim();
  const L = mock ? `${mock}/microsoft` : 'https://login.microsoftonline.com';
  const extra = String(env.TEAMS_WEBHOOK_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return {
    live: !!id, id, secret: String(env.MS_CLIENT_SECRET || '').trim(), authority: String(env.MS_AUTHORITY || 'organizations').trim() || 'organizations',
    certPem: String(env.MS_CLIENT_CERT_PEM || '').replace(/\\n/g, '\n').trim(), certThumb: String(env.MS_CLIENT_CERT_THUMB || '').trim(),
    authUrl: t => mock ? `${L}/${t}/auth` : `${L}/${t}/oauth2/v2.0/authorize`,
    tokenUrl: t => mock ? `${L}/${t}/token` : `${L}/${t}/oauth2/v2.0/token`,
    consentUrl: t => mock ? `${L}/${t}/adminconsent` : `${L}/${t}/v2.0/adminconsent`,
    issuer: t => `https://login.microsoftonline.com/${t}/v2.0`,
    graph: mock ? `${mock}/graph/v1.0` : 'https://graph.microsoft.com/v1.0',
    hostOk: h => DEF_HOSTS.some(r => r.test(h)) || extra.some(x => h === x || h.endsWith('.' + x)),
    testHook: !prod && env.TEAMS_WEBHOOK_TEST === '1',
    gap: Math.max(0, Number(env.TEAMS_GAP_MS == null ? 1000 : env.TEAMS_GAP_MS)), /* 채널당 발송 간격(초당 1건) */
  };
}

/* 워크플로 주소 검사(3.2 · 4절 SSRF) — 통과하면 URL, 아니면 teams_webhook_url */
async function checkHook(cfg, raw, lookup = dnsP.lookup) {
  const s = String(raw || '').trim(); let u;
  if (!s || s.length > 2048) return null;
  try { u = new URL(s); } catch (e) { return null; }
  if (u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (OLD_HOOK.some(r => r.test(h))) return null; /* 2026년 5월 종료된 커넥터 주소 */
  if (!/\/workflows\/|\/powerautomate\/automations\//i.test(u.pathname)) return null;
  if (cfg.testHook && (h === '127.0.0.1' || h === 'localhost') && u.protocol === 'http:') return u;
  if (u.protocol !== 'https:' || (u.port && u.port !== '443') || !cfg.hostOk(h) || net.isIP(h)) return null;
  const A = await lookup(h, { all: true }).catch(() => []);
  if (!A || !A.length || A.some(a => isPrivate(a.address))) return null;
  return u;
}

/* Adaptive Card 1.4 — 개인정보는 넣지 않는다(본문은 가림 처리) */
function card(event, p) {
  const title = G.redact(str(p.title || EV_KO[event] || '알림', 120)).text;
  const text = G.redact(str(p.text, 1200)).text;
  const body = [{ type: 'TextBlock', text: `디디쌤 · ${EV_KO[event] || '알림'}`, size: 'Small', isSubtle: true }, { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', wrap: true }];
  if (text) body.push({ type: 'TextBlock', text, wrap: true });
  const actions = /^https:\/\//.test(String(p.link || '')) ? [{ type: 'Action.OpenUrl', title: '디디쌤에서 보기', url: str(p.link, 500) }] : [];
  return { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4', body, actions } }] };
}

function createTeams(ctx) {
  const { pool, inTenant, need, readBody, HttpErr, audit, limit, ip, cookies, secure, env, pepper, keys, crypt, send, newSession, mfa, geoCheck, pii, log = console } = ctx;
  const cfg = teamsConfig(env);
  const E = (code, extra) => { const [st, m] = MSG[code] || [400, '요청을 처리할 수 없습니다.']; const e = new HttpErr(st, m, code); if (extra) e.extra = extra; return e; };
  const isAdmin = a => a.role === 'owner' || a.role === 'sub';
  const needAdmin = async req => { const a = await need(req); if (!isAdmin(a)) throw E('teams_role'); limit('teams:' + a.tid, 120, 60e3); return a; };
  const needOwner = async req => { const a = await need(req); if (a.role !== 'owner') throw E('teams_role'); limit('teams:' + a.tid, 120, 60e3); return a; };
  const needAny = async req => { const a = await need(req); limit('teams:' + a.tid, 120, 60e3); return a; };
  const T = (tid, fn) => inTenant(pool, tid, fn);
  /* 출석 매칭용 블라인드 인덱스 조회 — pii.identity는 didisam_pii 역할 + app.tenant로만(pii.js tx와 같은 방식) */
  const piiTx = async (tid, fn) => { const c = await pool.connect(); try { await c.query('begin'); await c.query('set local role didisam_pii'); await c.query("select set_config('app.tenant', $1, true)", [tid]); const r = await fn(c); await c.query('commit'); return r.rows; } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); } };

  /* ── 비밀값 암호화(AES-256-GCM) ── */
  const KEY = keys ? Buffer.from(crypto.hkdfSync('sha256', keys.enc, Buffer.alloc(0), 'didisam-conn-teams-v1', 32)) : Buffer.from(crypto.hkdfSync('sha256', Buffer.from(String(pepper)), Buffer.alloc(0), 'didisam-conn-teams-dev', 32));
  const aad = (tid, kind, id) => `${tid}|conn|teams|${kind}|${id}`;
  const enc = (v, a) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', KEY, iv); c.setAAD(Buffer.from(a)); const ct = Buffer.concat([c.update(String(v), 'utf8'), c.final()]); return `enc1:v1.${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${ct.toString('base64url')}`; };
  const dec = (s, a) => { const [, iv, tag, ct] = String(s).slice(5).split('.'); const d = require('../gcm').gcmDecipher(KEY, Buffer.from(iv, 'base64url'), Buffer.from(tag, 'base64url')); /* QA8: 공통 gcm.js(iv 12 · 태그 16 고정) */ d.setAAD(Buffer.from(a)); return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'); };
  const bidx = (tid, kind, v) => keys ? crypto.createHmac('sha256', keys.idx).update(`${tid}|${kind}|${String(v).trim().toLowerCase()}`).digest('base64url') : '';

  /* ── 서명 봉투 · 논스 쿠키(PKCE 검증값은 쿠키에만) ── */
  const sign = s => crypto.createHmac('sha256', pepper).update('msteams|' + s).digest('base64url');
  const seal = o => { const s = Buffer.from(JSON.stringify(o)).toString('base64url'); return `${s}.${sign(s)}`; };
  const unseal = v => { const [s, m] = String(v || '').split('.'); if (!s || !m) return null; const a = Buffer.from(m), b = Buffer.from(sign(s)); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null; try { const o = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')); return o && o.x > Date.now() ? o : null; } catch (e) { return null; } };
  const NC = secure ? '__Host-dd_msc' : 'dd_msc';
  const nck = (v, age) => `${NC}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const addCk = (res, c) => res.setHeader('set-cookie', [].concat(res.getHeader('set-cookie') || [], c));
  const redirect = (res, loc) => { res.writeHead(302, { location: loc, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }); res.end(); };
  const base = req => String(env.PUBLIC_URL || '').replace(/\/+$/, '') || `${secure ? 'https' : 'http'}://${req.headers.host}`;
  const begin = (res, k, o) => { const n = crypto.randomBytes(18).toString('base64url'); const v = crypto.randomBytes(32).toString('base64url'); addCk(res, nck(`${n}.${v}`, 600)); return { state: seal({ k, n, ...o, x: Date.now() + 10 * 60e3 }), n, challenge: crypto.createHash('sha256').update(v).digest('base64url') }; };
  const resume = (req, res, k, url) => { const st = unseal(url.searchParams.get('state')); const [n, v] = String(cookies(req)[NC] || '').split('.'); addCk(res, nck('', 0)); if (!st || st.k !== k || !n || n !== st.n) return null; return { st, verifier: v }; };

  /* ── 토큰 끝점 · id_token ── */
  function clientAuth(form, tenant) {
    if (cfg.certPem && cfg.certThumb) { /* 운영 권장: 인증서 자격 증명(client_assertion) */
      const hdr = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', x5t: Buffer.from(cfg.certThumb.replace(/:/g, ''), 'hex').toString('base64url') })).toString('base64url');
      const now = Math.floor(Date.now() / 1000); const pl = Buffer.from(JSON.stringify({ aud: cfg.tokenUrl(tenant), iss: cfg.id, sub: cfg.id, jti: crypto.randomUUID(), nbf: now, exp: now + 300 })).toString('base64url');
      form.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'; form.client_assertion = `${hdr}.${pl}.${crypto.sign('RSA-SHA256', Buffer.from(`${hdr}.${pl}`), cfg.certPem).toString('base64url')}`;
    } else if (cfg.secret) form.client_secret = cfg.secret;
    return form;
  }
  async function token(tenant, form) {
    const r = await fetch(cfg.tokenUrl(tenant), { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8', accept: 'application/json' }, body: new URLSearchParams(clientAuth({ client_id: cfg.id, ...form }, tenant)), signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error('token'); e.grant = j.error; throw e; } return j;
  }
  /* 토큰 끝점 직접 응답(TLS)으로 받은 id_token만 — aud · iss · exp · nonce · tid/oid 형식 확인 */
  function claims(t, nonce) {
    const p = String(t || '').split('.'); if (p.length !== 3) throw new Error('id_token');
    let c; try { c = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8')); } catch (e) { throw new Error('id_token'); }
    if (c.aud !== cfg.id || !UUID.test(String(c.tid || '')) || !UUID.test(String(c.oid || '')) || c.iss !== cfg.issuer(c.tid) || !(+c.exp * 1000 > Date.now()) || (nonce && c.nonce !== nonce)) throw new Error('id_token');
    if (String(c.tid).toLowerCase() === MSA_TID) { const e = new Error('msa'); e.msa = true; throw e; }
    return { tid: String(c.tid).toLowerCase(), oid: String(c.oid).toLowerCase(), upn: str(c.preferred_username || c.email || '', 200) };
  }
  const authorize = (tenant, req, cbPath, scope, s, extra = {}) => `${cfg.authUrl(tenant)}?${new URLSearchParams({ client_id: cfg.id, response_type: 'code', redirect_uri: base(req) + cbPath, response_mode: 'query', scope, state: s.state, nonce: s.n, code_challenge: s.challenge, code_challenge_method: 'S256', ...extra })}`;
  const exchange = (tenant, req, cbPath, code, verifier, scope) => token(tenant, { grant_type: 'authorization_code', code, redirect_uri: base(req) + cbPath, code_verifier: verifier || '', ...(scope ? { scope } : {}) });

  /* ── 상태 읽기 ── */
  const runs = new Map(); /* 기관별 최근 실행 10건(시연 채널 발송 기록 · 화면 「최근 실행」) */
  const addRun = (tid, r) => { const L = runs.get(tid) || []; L.unshift({ at: kst(new Date()), ...r }); runs.set(tid, L.slice(0, 10)); };
  async function load(c, tid) {
    const org = (await c.query('select ms_tid, domain, consent_at, consent_by, sso from conn_ms_org where tenant_id = $1', [tid])).rows[0] || null;
    const cf = (await c.query('select cfg, demo from conn_teams_cfg where tenant_id = $1', [tid])).rows[0] || { cfg: {}, demo: false };
    const sec = (await c.query('select id, kind, owner_user, label, mask, meta, expires_at, created_at from conn_secret where tenant_id = $1 order by created_at', [tid])).rows;
    return { org, cf, sec };
  }
  function view(tid, type, { org, cf, sec }) {
    const c0 = cf.cfg || {}; const feat = c0.features || {};
    const channels = sec.filter(s => s.kind === 'teams_webhook').map(s => ({ id: s.id, name: s.label, kind: s.meta.demo ? 'demo' : 'workflow', mask: s.mask, events: s.meta.events || [], lastOk: s.meta.lastOk || '', err: s.meta.err || '' }));
    const accounts = sec.filter(s => s.kind === 'teams_refresh').map(s => ({ id: s.id, upn: s.meta.upn || '', role: s.label, scopes: s.meta.scopes || [], exp: s.meta.exp === 'reauth' ? 'reauth' : 'ok', mine: false, owner: s.owner_user }));
    const demoOrg = !org && cf.demo;
    const st = channels.some(x => x.err) || accounts.some(x => x.exp === 'reauth') ? '점검 필요' : (org || cf.demo || channels.some(x => x.lastOk)) ? '연결됨' : channels.length ? '진행 중' : '미연결';
    const sso = org ? { operator: !!org.sso.operator, learner: !!org.sso.learner, tids: [maskTid(org.ms_tid)] } : { operator: false, learner: false, tids: [] };
    const note = [channels.length && `알림 채널 ${channels.length}곳`, accounts.length && `회의 계정 ${accounts.length}명`, (sso.operator || sso.learner) && 'SSO 사용'].filter(Boolean).join(' · ');
    return {
      mode: cfg.live ? 'live' : 'demo', st, note, demo: !!cf.demo,
      org: org ? { msTid: maskTid(org.ms_tid), domain: org.domain || '', consentAt: kst(org.consent_at), consentBy: org.consent_by } : demoOrg ? { msTid: '', domain: 'demo.onmicrosoft.com', consentAt: '', consentBy: '', demo: true } : null,
      features: { notify: feat.notify !== false, meeting: feat.meeting !== false, sso: sso.operator || sso.learner, learner: !!feat.learner },
      meetingDefaults: { lobby: (c0.meetingDefaults || {}).lobby === 'everyone' ? 'everyone' : 'organization', recordAuto: false, attMin: Number.isFinite(+(c0.meetingDefaults || {}).attMin) ? +(c0.meetingDefaults || {}).attMin : 10 },
      channels, accounts, sso, ssoTypeOk: SSO_TYPES.includes(type),
      scopesAvail: cfg.live ? ['notify', 'meeting', 'sso'] : ['notify'], runs: runs.get(tid) || [],
    };
  }
  async function status(a) {
    const v = view(a.tid, a.type, await T(a.tid, c => load(c, a.tid)));
    v.accounts = v.accounts.map(x => { const { owner, ...o } = x; return { ...o, mine: owner === a.uid }; });
    return v;
  }

  /* ── 채널 발송(큐: 채널당 cfg.gap 간격, 429는 지수 대기 3회) ── */
  const queues = new Map(); const pending = new Set();
  const sleep = ms => new Promise(ok => setTimeout(ok, ms));
  async function post(url, body) {
    for (let i = 0; ; i++) {
      let r; try { r = await fetch(url, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) }); } catch (e) { return { ok: false, detail: 'net' }; }
      if (r.status === 429 && i < 3) { const ra = +r.headers.get('retry-after'); await sleep(Math.min(5000, ra > 0 ? ra * 1000 : Math.max(50, cfg.gap) * 2 ** i)); continue; }
      return r.status >= 200 && r.status < 300 ? { ok: true } : { ok: false, detail: r.status };
    }
  }
  async function deliver(tid, ch, event, payload) {
    const body = card(event, payload);
    if (ch.meta.demo) { addRun(tid, { ch: ch.label, event, title: body.attachments[0].content.body[1].text, demo: true }); return { ok: true, demo: true }; }
    const url = dec(ch.enc, aad(tid, 'teams_webhook', ch.id));
    const r = await post(url, body);
    await T(tid, async c => {
      const m = (await c.query('select meta from conn_secret where tenant_id = $1 and id = $2 for update', [tid, ch.id])).rows[0]; if (!m) return;
      const meta = m.meta; if (r.ok) { meta.lastOk = kst(new Date()); meta.fails = 0; meta.err = ''; } else { meta.fails = (+meta.fails || 0) + 1; if (meta.fails >= 3 && !meta.err) { meta.err = `발송 실패(${r.detail})`; await audit(c, tid, 'system', 'teams.channel.err', { id: ch.id, detail: String(r.detail) }); } }
      await c.query('update conn_secret set meta = $3 where tenant_id = $1 and id = $2', [tid, ch.id, JSON.stringify(meta)]);
    });
    addRun(tid, { ch: ch.label, event, ok: r.ok, ...(r.ok ? {} : { detail: String(r.detail) }) });
    return r;
  }
  function enqueue(tid, ch, event, payload) {
    const prev = queues.get(ch.id) || Promise.resolve();
    const p = prev.then(async () => { try { return await deliver(tid, ch, event, payload); } catch (e) { log.error && log.error('teams notify', e && e.message); return { ok: false }; } finally { await sleep(cfg.gap); } });
    queues.set(ch.id, p); pending.add(p); p.finally(() => { pending.delete(p); if (queues.get(ch.id) === p) queues.delete(ch.id); });
    return p;
  }
  /* 내부 발송 — Slack 알림과 같은 이벤트 지점에서 부른다. 반환: 대기열에 넣은 채널 수 */
  async function notify(tid, event, payload = {}) {
    if (!EVENTS.includes(event)) throw E('teams_bad_event');
    const { cf, sec } = await T(tid, c => load(c, tid));
    if ((cf.cfg.features || {}).notify === false) return 0;
    const L = (await T(tid, c => c.query("select id, label, meta, enc from conn_secret where tenant_id = $1 and kind = 'teams_webhook'", [tid]))).rows.filter(ch => (ch.meta.events || []).includes(event));
    void sec; L.forEach(ch => enqueue(tid, ch, event, payload)); return L.length;
  }
  const flush = async () => { while (pending.size) await Promise.allSettled([...pending]); };

  /* ── 위임 토큰(회의 계정) ── */
  const atCache = new Map();
  async function accessToken(tid, acc) {
    const hit = atCache.get(acc.id); if (hit && hit.exp > Date.now() + 300e3) return hit.tok;
    const org = (await T(tid, c => c.query('select ms_tid from conn_ms_org where tenant_id = $1', [tid]))).rows[0]; if (!org) throw E('teams_consent');
    let j; try { j = await token(org.ms_tid, { grant_type: 'refresh_token', refresh_token: dec(acc.enc, aad(tid, 'teams_refresh', acc.id)), scope: SCOPE_ACCT }); }
    catch (e) {
      if (e.grant === 'invalid_grant' || e.grant === 'interaction_required') { await T(tid, async c => { await c.query("update conn_secret set meta = meta || '{\"exp\":\"reauth\"}' where tenant_id = $1 and id = $2", [tid, acc.id]); await audit(c, tid, 'system', 'teams.account.reauth', { id: acc.id }); }); atCache.delete(acc.id); throw E('teams_account'); }
      throw E('teams_provider');
    }
    if (j.refresh_token) await T(tid, c => c.query('update conn_secret set enc = $3 where tenant_id = $1 and id = $2', [tid, acc.id, enc(j.refresh_token, aad(tid, 'teams_refresh', acc.id))])); /* 갱신 토큰 교체 저장 */
    atCache.set(acc.id, { tok: j.access_token, exp: Date.now() + (+j.expires_in || 3600) * 1000 }); return j.access_token;
  }
  async function graph(tid, acc, method, p, body) {
    const tok = await accessToken(tid, acc);
    for (let i = 0; i < 2; i++) {
      let r; try { r = await fetch(cfg.graph + p, { method, redirect: 'manual', headers: { authorization: `Bearer ${tok}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) }); } catch (e) { throw E('teams_provider'); }
      if (r.status === 429 && i === 0) { const ra = +r.headers.get('retry-after'); await sleep(Math.min(3000, ra > 0 ? ra * 1000 : 500)); continue; }
      if (r.status === 429) throw E('teams_rate');
      if (r.status === 401) { atCache.delete(acc.id); throw E('teams_account'); }
      if (r.status === 403) throw E('teams_scope');
      if (r.status === 404) return { status: 404, j: {} };
      if (r.status >= 300) throw E('teams_provider');
      return { status: r.status, j: r.status === 204 ? {} : await r.json().catch(() => ({})) };
    }
  }
  async function pickAccount(a, accountId) {
    const rows = (await T(a.tid, c => c.query("select id, owner_user, meta, enc from conn_secret where tenant_id = $1 and kind = 'teams_refresh'", [a.tid]))).rows;
    const acc = accountId ? rows.find(x => x.id === accountId) : rows.find(x => x.owner_user === a.uid);
    if (!acc || acc.meta.exp === 'reauth') throw E('teams_account');
    if (acc.owner_user !== a.uid && !isAdmin(a)) throw E('teams_role'); /* 교수자는 본인 계정으로만 */
    return acc;
  }

  /* ── 기관 문서(반 항목 · 출석부) 갱신 ── */
  async function docEdit(c, tid, fn) {
    const r = (await c.query('select doc from tenant_state where tenant_id = $1 for update', [tid])).rows[0]; if (!r) return null;
    const doc = crypt.open(r.doc, tid); const out = fn(doc); if (out === undefined) return null;
    const s = JSON.stringify(crypt.seal(doc, tid)); await c.query('update tenant_state set doc = $2, rev = rev + 1, bytes = $3, updated_at = now() where tenant_id = $1', [tid, s, s.length]); return out;
  }
  const itemOf = (doc, cid, iid) => { const cl = (Array.isArray(doc.classes) ? doc.classes : []).find(x => x && x.id === cid); const it = cl && (Array.isArray(cl.curriculum) ? cl.curriculum : []).find(x => x && x.id === iid); return cl && it ? { cl, it } : null; };

  /* ── 리다이렉트 경로(조직 연결 · 회의 계정 · SSO) ── */
  const hashGo = (res, h) => redirect(res, '/#conn=teams:' + h);
  async function consentStart(req, res, url) {
    let a; try { a = await need(req); } catch (e) { return hashGo(res, 'err-auth'); }
    if (a.role !== 'owner') return hashGo(res, 'err-role'); if (!cfg.live) return hashGo(res, 'err-unset');
    limit('teams:' + a.tid, 120, 60e3);
    const f = str(url.searchParams.get('f') || 'meeting,sso', 40).split(',').filter(x => ['meeting', 'sso'].includes(x)).join(',');
    const s = begin(res, 'c1', { t: a.tid, u: a.uid, f });
    return redirect(res, authorize(cfg.authority, req, '/api/conn/teams/consent/whoami', 'openid profile', s, { prompt: 'select_account' }));
  }
  async function consentWhoami(req, res, url) {
    const r = resume(req, res, 'c1', url); if (!r) return hashGo(res, 'err-state');
    if (url.searchParams.get('error') || !url.searchParams.get('code')) return hashGo(res, 'err-denied');
    let c; try { const j = await exchange(cfg.authority, req, '/api/conn/teams/consent/whoami', url.searchParams.get('code'), r.verifier, 'openid profile'); c = claims(j.id_token, r.st.n); } catch (e) { return hashGo(res, e.msa ? 'err-msa' : 'err-provider'); }
    const s = begin(res, 'c2', { t: r.st.t, u: r.st.u, f: r.st.f, m: c.tid, b: maskUpn(c.upn), d: str(c.upn.split('@')[1] || '', 120) }); /* 검증된 tid를 봉인 */
    return redirect(res, `${cfg.consentUrl(c.tid)}?${new URLSearchParams({ client_id: cfg.id, scope: 'https://graph.microsoft.com/.default', redirect_uri: base(req) + '/api/conn/teams/consent/callback', state: s.state })}`);
  }
  async function consentCallback(req, res, url) {
    const r = resume(req, res, 'c2', url); if (!r) return hashGo(res, 'err-state');
    if (url.searchParams.get('error') || String(url.searchParams.get('admin_consent')).toLowerCase() !== 'true') return hashGo(res, 'err-denied');
    if (String(url.searchParams.get('tenant') || '').toLowerCase() !== r.st.m) { await T(r.st.t, c => audit(c, r.st.t, 'system', 'teams.consent.mismatch', {})).catch(() => {}); return hashGo(res, 'err-tenant_mismatch'); } /* 콜백 tenant 값은 믿지 않는다 — 봉인된 tid와 같아야 함 */
    try {
      await T(r.st.t, async c => {
        await c.query("insert into conn_ms_org (tenant_id, ms_tid, domain, consent_by) values ($1, $2, $3, $4) on conflict (tenant_id) do update set ms_tid = excluded.ms_tid, domain = excluded.domain, consent_by = excluded.consent_by, consent_at = now()", [r.st.t, r.st.m, r.st.d || null, r.st.b || '']);
        await c.query("insert into conn_teams_cfg (tenant_id, demo) values ($1, false) on conflict (tenant_id) do update set demo = false, updated_at = now()", [r.st.t]);
        await audit(c, r.st.t, 'user:' + r.st.u, 'teams.connect', { f: r.st.f });
      });
    } catch (e) { if (e.code === '23505') return hashGo(res, 'err-tenant_taken'); throw e; }
    return hashGo(res, 'ok');
  }
  async function accountStart(req, res) {
    let a; try { a = await need(req); } catch (e) { return hashGo(res, 'err-auth'); }
    if (!cfg.live) return hashGo(res, 'err-unset');
    const org = (await T(a.tid, c => c.query('select ms_tid from conn_ms_org where tenant_id = $1', [a.tid]))).rows[0]; if (!org) return hashGo(res, 'err-consent');
    limit('teams:' + a.tid, 120, 60e3);
    const s = begin(res, 'a', { t: a.tid, u: a.uid, r: a.role });
    return redirect(res, authorize(org.ms_tid, req, '/api/conn/teams/account/callback', SCOPE_ACCT, s, { prompt: 'select_account' }));
  }
  async function accountCallback(req, res, url) {
    const r = resume(req, res, 'a', url); if (!r) return hashGo(res, 'err-state');
    if (url.searchParams.get('error') || !url.searchParams.get('code')) return hashGo(res, 'err-denied');
    const tid = r.st.t; const org = (await T(tid, c => c.query('select ms_tid from conn_ms_org where tenant_id = $1', [tid]))).rows[0]; if (!org) return hashGo(res, 'err-consent');
    let j, c; try { j = await exchange(org.ms_tid, req, '/api/conn/teams/account/callback', url.searchParams.get('code'), r.verifier, SCOPE_ACCT); c = claims(j.id_token, r.st.n); } catch (e) { return hashGo(res, e.msa ? 'err-msa' : 'err-provider'); }
    if (c.tid !== String(org.ms_tid).toLowerCase()) return hashGo(res, 'err-tenant_mismatch');
    if (!j.refresh_token) return hashGo(res, 'err-provider');
    const id = rid('ac_'); const scopes = String(j.scope || '').split(/\s+/).filter(x => /^OnlineMeeting/i.test(x));
    await T(tid, async cl => {
      await cl.query("delete from conn_secret where tenant_id = $1 and kind = 'teams_refresh' and owner_user = $2", [tid, r.st.u]);
      await cl.query('insert into conn_secret (id, tenant_id, kind, owner_user, label, mask, meta, enc) values ($1, $2, $3, $4, $5, $6, $7, $8)', [id, tid, 'teams_refresh', r.st.u, r.st.r === 'teacher' ? '교수자' : '운영자', maskUpn(c.upn), JSON.stringify({ upn: maskUpn(c.upn), scopes, exp: 'ok' }), enc(j.refresh_token, aad(tid, 'teams_refresh', id))]);
      await audit(cl, tid, 'user:' + r.st.u, 'teams.account.link', { id });
    });
    if (j.access_token) atCache.set(id, { tok: j.access_token, exp: Date.now() + (+j.expires_in || 3600) * 1000 });
    return hashGo(res, 'acct-ok');
  }

  /* 운영자 SSO — 이메일로 기존 계정에 자동 연결하지 않는다(3.4). 연결은 로그인한 운영자가 [Microsoft 계정 연결]로 직접 */
  const oaGo = (res, h) => redirect(res, '/#oauth=' + h);
  async function opStart(req, res) {
    if (!cfg.live) return oaGo(res, 'err:unset');
    limit('oa:' + ip(req), 30, 600e3);
    const s = begin(res, 'o', {});
    return redirect(res, authorize(cfg.authority, req, '/api/oauth/microsoft/callback', 'openid profile email', s, { prompt: 'select_account' }));
  }
  async function opLinkStart(req, res) {
    const a = await need(req); if (!cfg.live) throw E('teams_unset'); limit('oa:' + ip(req), 30, 600e3);
    const s = begin(res, 'o', { l: a.uid, t: a.tid });
    return { url: authorize(cfg.authority, req, '/api/oauth/microsoft/callback', 'openid profile email', s, { prompt: 'select_account' }) };
  }
  async function opCallback(req, res, url) {
    if (!cfg.live) return oaGo(res, 'err:unset');
    limit('oa:' + ip(req), 30, 600e3);
    const r = resume(req, res, 'o', url); if (!r) return oaGo(res, 'err:state');
    if (url.searchParams.get('error') || !url.searchParams.get('code')) return oaGo(res, 'err:denied');
    let c; try { const j = await exchange(cfg.authority, req, '/api/oauth/microsoft/callback', url.searchParams.get('code'), r.verifier, 'openid profile email'); c = claims(j.id_token, r.st.n); } catch (e) { return oaGo(res, e.msa ? 'err:msa' : 'err:provider'); }
    const sub = `${c.tid}:${c.oid}`;
    const orgTid = async tid => ((await T(tid, cl => cl.query('select ms_tid, sso from conn_ms_org where tenant_id = $1', [tid]))).rows[0]) || null;
    if (r.st.l) { /* 로그인한 운영자의 계정 연결 */
      const o = await orgTid(r.st.t); if (!o || String(o.ms_tid).toLowerCase() !== c.tid) return oaGo(res, 'err:tenant');
      try { await pool.query('insert into user_oauth (provider, sub, user_id) values ($1, $2, $3)', ['microsoft', sub, r.st.l]); } catch (e) { if (e.code === '23505') return oaGo(res, 'err:taken'); throw e; }
      await T(r.st.t, cl => audit(cl, r.st.t, 'user:' + r.st.l, 'oauth.link', { provider: 'microsoft' })).catch(() => {});
      return oaGo(res, 'linked');
    }
    const u = (await pool.query("select u.id, u.tenant_id, u.role, u.email from user_oauth o join users u on u.id = o.user_id where o.provider = 'microsoft' and o.sub = $1", [sub])).rows[0];
    if (!u) return oaGo(res, 'err:ms_unlinked');
    const o = await orgTid(u.tenant_id); if (!o || String(o.ms_tid).toLowerCase() !== c.tid || !o.sso.operator) return oaGo(res, 'err:tenant');
    if (geoCheck) { try { await geoCheck(req, u.tenant_id, u.email); } catch (e) { return oaGo(res, 'err:geo_blocked'); } }
    if (mfa && !mfa.off) { let m; try { m = await mfa.start(res, { id: u.id, tenant_id: u.tenant_id, email: u.email }, 'microsoft'); } catch (e) { return oaGo(res, 'err:' + (e.code === 'mfa_mail' ? 'mfa_mail' : 'provider')); } return oaGo(res, 'mfa-' + m.mfa); }
    await pool.query('update users set last_login = now() where id = $1', [u.id]);
    await newSession(res, u.id, u.tenant_id);
    await T(u.tenant_id, cl => audit(cl, u.tenant_id, u.email, 'login', { via: 'microsoft' })).catch(() => {});
    return oaGo(res, 'ok');
  }

  /* 학습자 SSO — openid만(이름 · 이메일 받지 않음), pii.identity에 HMAC(tid:oid)만 */
  const TID_RE = /^tn_[a-z0-9]{8,16}$/;
  const lGo = (res, tid, h, app) => redirect(res, `/learner.html?${tid ? 't=' + encodeURIComponent(tid) + '&' : ''}${app ? 'app=1&' : ''}oa=${h}#${/^join-/.test(h) ? 'join' : /^(pending|rejected)$/.test(h) ? 'pending' : h === 'ok' ? 'home' : 'login'}`);
  async function learnerOrg(tid) {
    if (!TID_RE.test(tid)) return null;
    const t = (await pool.query('select type from tenants where id = $1', [tid])).rows[0]; if (!t) return null; /* tenants는 기관 역할 권한 밖 */
    const o = (await T(tid, c => c.query('select ms_tid, sso from conn_ms_org where tenant_id = $1', [tid]))).rows[0];
    return o ? { type: t.type, ms_tid: o.ms_tid, sso: o.sso } : null;
  }
  async function learnerReady(tid) { if (!cfg.live) return false; const o = await learnerOrg(tid).catch(() => null); return !!(o && o.sso.learner && SSO_TYPES.includes(o.type)); }
  async function lStart(req, res, tid, url) {
    if (!TID_RE.test(tid)) throw new HttpErr(404, '없는 기관입니다.', 'tenant');
    if (!cfg.live) return lGo(res, tid, 'err-unset');
    limit('loa:' + ip(req), 30, 600e3);
    if (!(await learnerReady(tid))) return lGo(res, tid, 'err-provider_off');
    const s = begin(res, 'l', { t: tid, m: url.searchParams.get('m') === 'login' ? 'login' : 'join', ...(url.searchParams.get('app') === '1' ? { a: 1 } : {}) });
    return redirect(res, authorize(cfg.authority, req, '/api/pub/loauth/microsoft/callback', 'openid', s, { prompt: 'select_account' }));
  }
  async function lCallback(req, res, url) {
    const r = resume(req, res, 'l', url); if (!r) return lGo(res, '', 'err-state');
    const tid = r.st.t; const A = !!r.st.a; limit('loa:' + ip(req), 30, 600e3);
    if (url.searchParams.get('error') || !url.searchParams.get('code')) return lGo(res, tid, 'err-denied', A);
    let c; try { const j = await exchange(cfg.authority, req, '/api/pub/loauth/microsoft/callback', url.searchParams.get('code'), r.verifier, 'openid'); c = claims(j.id_token, r.st.n); } catch (e) { return lGo(res, tid, e.msa ? 'err-msa' : 'err-provider', A); }
    const o = await learnerOrg(tid); if (!o || !o.sso.learner || !SSO_TYPES.includes(o.type)) return lGo(res, tid, 'err-provider_off', A);
    if (String(o.ms_tid).toLowerCase() !== c.tid) return lGo(res, tid, 'err-tenant', A);
    let out; try { out = await pii.oauthLogin(req, res, tid, 'microsoft', `${c.tid}:${c.oid}`); } catch (e) { return lGo(res, tid, 'err-' + (e && e.code ? String(e.code).replace(/[^\w]/g, '').slice(0, 30) : 'server'), A); }
    return lGo(res, tid, out === 'join' ? 'join-microsoft' : out, A);
  }

  async function handle(req, res, url) {
    if (req.method !== 'GET') return false; const p = url.pathname;
    const R = { '/api/conn/teams/consent/start': consentStart, '/api/conn/teams/consent/whoami': consentWhoami, '/api/conn/teams/consent/callback': consentCallback, '/api/conn/teams/account/start': accountStart, '/api/conn/teams/account/callback': accountCallback, '/api/oauth/microsoft/start': opStart, '/api/oauth/microsoft/callback': opCallback, '/api/pub/loauth/microsoft/callback': lCallback }[p];
    if (R) { await R(req, res, url); return true; }
    const m = p.match(/^\/api\/pub\/([^/]+)\/loauth\/microsoft\/start$/); if (m) { await lStart(req, res, m[1], url); return true; }
    return false;
  }

  /* ── JSON 경로 ── */
  const created = (res, body) => { send(res, 201, body); return body; };
  async function addChannel(req, res) {
    const a = await needAdmin(req); const b = await readBody(req, 8192);
    const name = str(b.name, 60).trim(); if (!name || name.length > 40) throw E('teams_input', { field: 'name' });
    const events = Array.isArray(b.events) ? b.events.map(String) : ['notice']; if (events.some(x => !EVENTS.includes(x))) throw E('teams_bad_event');
    const n = (await T(a.tid, c => c.query("select count(*)::int n from conn_secret where tenant_id = $1 and kind = 'teams_webhook'", [a.tid]))).rows[0].n; if (n >= 10) throw E('teams_limit');
    const id = rid('ch_'); let mask, secret, demo = false;
    if (b.url) {
      const u = await checkHook(cfg, b.url); if (!u) throw E('teams_webhook_url');
      const r = await post(u.href, card('test', { title: '디디쌤 알림 채널이 연결되었습니다', text: `「${name}」 채널로 공지 · 마감 · 승인 요청 알림을 보냅니다.` }));
      if (!r.ok) throw E('teams_webhook_fail', { detail: r.detail });
      mask = maskUrl(u.href); secret = u.href;
    } else { if (cfg.live && !b.demo) throw E('teams_webhook_url'); mask = '시연 채널'; secret = 'demo'; demo = true; }
    const meta = { events, lastOk: demo ? '' : kst(new Date()), err: '', fails: 0, ...(demo ? { demo: true } : {}) };
    await T(a.tid, async c => { await c.query('insert into conn_secret (id, tenant_id, kind, label, mask, meta, enc) values ($1, $2, $3, $4, $5, $6, $7)', [id, a.tid, 'teams_webhook', name, mask, JSON.stringify(meta), enc(secret, aad(a.tid, 'teams_webhook', id))]); await audit(c, a.tid, a.email, 'teams.channel.add', { id, demo }); });
    if (demo) addRun(a.tid, { ch: name, event: 'test', demo: true, title: '시연 채널 등록' });
    return created(res, { id, name, mask, events, lastOk: meta.lastOk, ...(demo ? { kind: 'demo' } : { kind: 'workflow' }) });
  }
  async function patchChannel(req, id) {
    const a = await needAdmin(req); const b = await readBody(req, 4096);
    return T(a.tid, async c => {
      const r = (await c.query("select label, meta from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_webhook' for update", [a.tid, id])).rows[0]; if (!r) throw E('teams_none');
      if (b.name !== undefined) { const n = str(b.name, 60).trim(); if (!n || n.length > 40) throw E('teams_input', { field: 'name' }); r.label = n; }
      if (b.events !== undefined) { if (!Array.isArray(b.events) || b.events.some(x => !EVENTS.includes(x))) throw E('teams_bad_event'); r.meta.events = [...new Set(b.events)]; }
      await c.query('update conn_secret set label = $3, meta = $4 where tenant_id = $1 and id = $2', [a.tid, id, r.label, JSON.stringify(r.meta)]);
      await audit(c, a.tid, a.email, 'teams.channel.edit', { id });
      return { ok: true, id, name: r.label, events: r.meta.events };
    });
  }
  async function delChannel(req, id) {
    const a = await needAdmin(req);
    return T(a.tid, async c => { const n = (await c.query("delete from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_webhook'", [a.tid, id])).rowCount; if (!n) throw E('teams_none'); await audit(c, a.tid, a.email, 'teams.channel.del', { id }); return { ok: true }; });
  }
  async function testChannel(req) {
    const a = await needAdmin(req); const b = await readBody(req, 2048);
    const ch = (await T(a.tid, c => c.query("select id, label, meta, enc from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_webhook'", [a.tid, str(b.channelId, 40)]))).rows[0]; if (!ch) throw E('teams_none');
    const r = await deliver(a.tid, ch, 'test', { title: '디디쌤 연결 시험', text: '이 카드가 보이면 Teams 채널 알림이 정상입니다.' });
    if (!r.ok) throw E('teams_webhook_fail', { detail: r.detail });
    return { ok: true, at: kst(new Date()), note: r.demo ? '시연 채널이라 실제로 보내지 않고 최근 실행에 기록했습니다.' : '시험 카드를 보냈습니다 — 채널에서 확인하세요', ...(r.demo ? { demo: true } : {}) };
  }
  async function putSettings(req) {
    const a = await needAdmin(req); const b = await readBody(req, 8192);
    await T(a.tid, async c => {
      const cur = ((await c.query('select cfg from conn_teams_cfg where tenant_id = $1 for update', [a.tid])).rows[0] || { cfg: {} }).cfg;
      if (b.features && typeof b.features === 'object') { cur.features = { ...(cur.features || {}) }; for (const k of ['notify', 'meeting', 'learner']) if (typeof b.features[k] === 'boolean') cur.features[k] = b.features[k]; }
      if (b.meetingDefaults && typeof b.meetingDefaults === 'object') { const m = b.meetingDefaults; const att = Math.round(+m.attMin); if (m.attMin !== undefined && !(att >= 0 && att <= 600)) throw E('teams_input', { field: 'attMin' }); cur.meetingDefaults = { lobby: m.lobby === 'everyone' ? 'everyone' : 'organization', recordAuto: false, attMin: m.attMin === undefined ? ((cur.meetingDefaults || {}).attMin ?? 10) : att }; }
      if (b.events && typeof b.events === 'object') for (const [id, L] of Object.entries(b.events).slice(0, 10)) {
        if (!Array.isArray(L) || L.some(x => !EVENTS.includes(x))) throw E('teams_bad_event');
        const n = (await c.query("update conn_secret set meta = jsonb_set(meta, '{events}', $3::jsonb) where tenant_id = $1 and id = $2 and kind = 'teams_webhook'", [a.tid, id, JSON.stringify([...new Set(L)])])).rowCount; if (!n) throw E('teams_none');
      }
      await c.query('insert into conn_teams_cfg (tenant_id, cfg) values ($1, $2) on conflict (tenant_id) do update set cfg = excluded.cfg, updated_at = now()', [a.tid, JSON.stringify(cur)]);
      await audit(c, a.tid, a.email, 'teams.settings', { keys: Object.keys(b).slice(0, 5) });
    });
    return status(a);
  }
  async function putDemo(req) {
    const a = await needAdmin(req); const b = await readBody(req, 1024); const on = b.on !== false;
    await T(a.tid, async c => { await c.query('insert into conn_teams_cfg (tenant_id, demo) values ($1, $2) on conflict (tenant_id) do update set demo = excluded.demo, updated_at = now()', [a.tid, on]); await audit(c, a.tid, a.email, on ? 'teams.connect' : 'teams.disconnect', { demo: true }); });
    return status(a);
  }
  async function disconnect(req) {
    const a = await needOwner(req);
    const out = await T(a.tid, async c => {
      const L = (await c.query('delete from conn_secret where tenant_id = $1 returning id, kind', [a.tid])).rows;
      await c.query('delete from conn_ms_org where tenant_id = $1', [a.tid]); await c.query('delete from conn_teams_cfg where tenant_id = $1', [a.tid]);
      await audit(c, a.tid, a.email, 'teams.disconnect', { channels: L.filter(x => x.kind === 'teams_webhook').length, accounts: L.filter(x => x.kind === 'teams_refresh').length });
      L.forEach(x => atCache.delete(x.id));
      return { ok: true, removed: { channels: L.filter(x => x.kind === 'teams_webhook').length, accounts: L.filter(x => x.kind === 'teams_refresh').length }, note: 'Microsoft 쪽 앱 동의 철회는 Entra 관리 센터 › 엔터프라이즈 애플리케이션에서 디디쌤 앱을 삭제하십시오.' };
    });
    runs.delete(a.tid); return out;
  }
  async function delAccount(req, id) {
    const a = await needAny(req);
    return T(a.tid, async c => {
      const r = (await c.query("select owner_user from conn_secret where tenant_id = $1 and id = $2 and kind = 'teams_refresh'", [a.tid, id])).rows[0]; if (!r) throw E('teams_none');
      if (r.owner_user !== a.uid && a.role !== 'owner') throw E('teams_role');
      await c.query('delete from conn_secret where tenant_id = $1 and id = $2', [a.tid, id]); atCache.delete(id);
      await audit(c, a.tid, a.email, 'teams.account.unlink', { id }); return { ok: true };
    });
  }
  async function putSso(req) {
    const a = await needOwner(req); const b = await readBody(req, 1024);
    if (!cfg.live) throw E('teams_unset');
    await T(a.tid, async c => {
      const o = (await c.query('select sso from conn_ms_org where tenant_id = $1 for update', [a.tid])).rows[0]; if (!o) throw E('teams_consent');
      const sso = { operator: typeof b.operator === 'boolean' ? b.operator : !!o.sso.operator, learner: typeof b.learner === 'boolean' ? (b.learner && SSO_TYPES.includes(a.type)) : !!o.sso.learner };
      await c.query('update conn_ms_org set sso = $2 where tenant_id = $1', [a.tid, JSON.stringify(sso)]);
      await audit(c, a.tid, a.email, 'teams.sso', sso);
    });
    return status(a);
  }

  /* 회의 — docLink:false(만들기) · ?doc=0(삭제)이면 기관 문서는 건드리지 않는다: 스튜디오가 편집 중인 항목에 직접 넣고 저장해 rev 충돌(409)을 막는다 */
  const parseT = v => { const d = new Date(String(v || '')); return Number.isFinite(d.getTime()) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(v)) ? d : null; };
  async function createMeeting(req, res) {
    const a = await needAny(req); const b = await readBody(req, 8192);
    const subject = str(b.subject, 200).trim(); if (!subject || subject.length > 120) throw E('teams_input', { field: 'subject' });
    const s = parseT(b.start), e = parseT(b.end); if (!s || !e || e <= s || e - s > 24 * 3600e3) throw E('teams_time');
    const classId = str(b.classId, 60), itemId = str(b.itemId, 60);
    const { cf } = await T(a.tid, c => load(c, a.tid)); const md = (cf.cfg || {}).meetingDefaults || {};
    const lobby = (b.lobby || md.lobby) === 'everyone' ? 'everyone' : 'organization';
    let id = rid('tm_'), ms = '', joinUrl, demo = !cfg.live, acc = null;
    if (!demo) {
      acc = await pickAccount(a, str(b.accountId, 40));
      const g = await graph(a.tid, acc, 'POST', '/me/onlineMeetings', { subject, startDateTime: s.toISOString(), endDateTime: e.toISOString(), lobbyBypassSettings: { scope: lobby }, allowRecording: b.allowRecord === true, recordAutomatically: false });
      if (!g.j.id || !/^https:\/\//.test(String(g.j.joinWebUrl || ''))) throw E('teams_provider');
      ms = str(g.j.id, 400); joinUrl = str(g.j.joinWebUrl, 2000);
    } else joinUrl = '/learner.html#live-demo';
    const linked = await T(a.tid, async c => {
      await c.query('insert into conn_teams_meeting (id, tenant_id, class_id, item_id, account_id, ms_id, join_url, subject, start_at, end_at, demo, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [id, a.tid, classId, itemId, acc ? acc.id : '', ms, joinUrl, subject, s, e, demo, a.email]);
      const ok = classId && itemId && b.docLink !== false ? await docEdit(c, a.tid, doc => { const x = itemOf(doc, classId, itemId); if (!x) return undefined; x.it.url = joinUrl; x.it.teams = { mid: id, joinUrl, accountId: acc ? acc.id : '', ...(demo ? { demo: true } : {}) }; return true; }) : null;
      await audit(c, a.tid, a.email, 'teams.meeting.create', { id, demo, cls: classId, item: itemId });
      return !!ok;
    });
    return created(res, { id, joinUrl, start: s.toISOString(), end: e.toISOString(), mode: demo ? 'demo' : 'live', linked });
  }
  const meetingOf = async (a, id) => { const m = (await T(a.tid, c => c.query('select * from conn_teams_meeting where tenant_id = $1 and id = $2', [a.tid, id]))).rows[0]; if (!m) throw E('teams_none'); return m; };
  const accOfMeeting = async (a, m) => { if (m.demo) return null; return pickAccount(a, m.account_id); };
  async function patchMeeting(req, id) {
    const a = await needAny(req); const b = await readBody(req, 4096); const m = await meetingOf(a, id);
    const subject = b.subject !== undefined ? str(b.subject, 200).trim() : m.subject; if (!subject || subject.length > 120) throw E('teams_input', { field: 'subject' });
    const s = b.start !== undefined ? parseT(b.start) : new Date(m.start_at), e = b.end !== undefined ? parseT(b.end) : new Date(m.end_at); if (!s || !e || e <= s || e - s > 24 * 3600e3) throw E('teams_time');
    const acc = await accOfMeeting(a, m);
    if (acc) { const g = await graph(a.tid, acc, 'PATCH', '/me/onlineMeetings/' + encodeURIComponent(m.ms_id), { subject, startDateTime: s.toISOString(), endDateTime: e.toISOString() }); if (g.status === 404) throw E('teams_none'); }
    await T(a.tid, async c => { await c.query('update conn_teams_meeting set subject = $3, start_at = $4, end_at = $5 where tenant_id = $1 and id = $2', [a.tid, id, subject, s, e]); await audit(c, a.tid, a.email, 'teams.meeting.edit', { id }); });
    return { ok: true, id, start: s.toISOString(), end: e.toISOString() };
  }
  async function delMeeting(req, id) {
    const a = await needAny(req); const m = await meetingOf(a, id); const acc = await accOfMeeting(a, m);
    if (acc) await graph(a.tid, acc, 'DELETE', '/me/onlineMeetings/' + encodeURIComponent(m.ms_id)); /* 이미 없으면(404) 그대로 진행 */
    await T(a.tid, async c => {
      await c.query('delete from conn_teams_meeting where tenant_id = $1 and id = $2', [a.tid, id]);
      if (m.class_id && m.item_id && new URL(req.url, 'http://x').searchParams.get('doc') !== '0') await docEdit(c, a.tid, doc => { const x = itemOf(doc, m.class_id, m.item_id); if (!x) return undefined; if (x.it.url === m.join_url) x.it.url = ''; delete x.it.teams; return true; });
      await audit(c, a.tid, a.email, 'teams.meeting.delete', { id });
    });
    return { ok: true };
  }
  const hash01 = s => crypto.createHash('sha256').update(s).digest().readUInt32BE(0) / 2 ** 32;
  const label = (tid, mid) => 'L-' + crypto.createHash('sha256').update(`${tid}|${mid}`).digest('hex').slice(0, 4); /* 가명 표시(이름 없이) */
  const hm = d => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().slice(11, 16);
  async function syncAttendance(req, id) {
    const a = await needAny(req); const m = await meetingOf(a, id);
    const r0 = (await T(a.tid, c => c.query('select doc from tenant_state where tenant_id = $1', [a.tid]))).rows[0]; const doc = r0 ? crypt.open(r0.doc, a.tid) : {};
    const x = m.class_id && m.item_id ? itemOf(doc, m.class_id, m.item_id) : null;
    const { cf } = await T(a.tid, c => load(c, a.tid));
    const attMin = Number.isFinite(+(x && x.it.attMin)) && x && x.it.attMin !== '' && x.it.attMin != null ? +x.it.attMin : +(((cf.cfg || {}).meetingDefaults || {}).attMin ?? 10);
    const start = new Date(m.start_at).getTime();
    const judge = (sec, first) => sec < attMin * 60 ? '결석' : first > start + 10 * 60e3 ? '지각' : '출석';
    const inClass = mid => !x || (Array.isArray(x.cl.learners) && x.cl.learners.includes(mid));
    if (m.demo) { /* 시연: 반 명단으로 결정적 참여 분 */
      const L = x && Array.isArray(x.cl.learners) ? x.cl.learners.slice(0, 300) : [];
      const dur = (new Date(m.end_at) - start) / 1000;
      const matched = L.map(mid => { const h = hash01(m.id + mid); const sec = Math.round(dur * (h < 0.12 ? 0.05 : 0.6 + h * 0.4)); const first = start + Math.round((h < 0.25 ? h * 60 : h * 4) * 60e3); return { lid: mid, label: label(a.tid, mid), suggest: judge(sec, first), minutes: Math.round(sec / 60), firstJoin: hm(first) }; });
      return { reportId: 'demo-' + m.id, meetingStart: new Date(m.start_at).toISOString(), meetingEnd: new Date(m.end_at).toISOString(), matched, unmatched: 0, mode: 'demo', note: '시연 데이터' };
    }
    const acc = await accOfMeeting(a, m);
    const list = await graph(a.tid, acc, 'GET', `/me/onlineMeetings/${encodeURIComponent(m.ms_id)}/attendanceReports`);
    const reps = (list.j.value || []).filter(v => v && v.id).sort((p, q) => String(q.meetingEndDateTime || '').localeCompare(String(p.meetingEndDateTime || '')));
    if (list.status === 404 || !reps.length) throw E('teams_report_none');
    const rep = (await graph(a.tid, acc, 'GET', `/me/onlineMeetings/${encodeURIComponent(m.ms_id)}/attendanceReports/${encodeURIComponent(reps[0].id)}?$expand=attendanceRecords`)).j;
    const org = (await T(a.tid, c => c.query('select ms_tid from conn_ms_org where tenant_id = $1', [a.tid]))).rows[0] || {};
    const recs = (Array.isArray(rep.attendanceRecords) ? rep.attendanceRecords : []).filter(r => r && String(r.role || '').toLowerCase() !== 'organizer').slice(0, 1000);
    const byHash = new Map(); for (const r of recs) { const oid = String((r.identity || {}).id || '').toLowerCase(); if (UUID.test(oid) && keys) byHash.set(bidx(a.tid, 'sub:microsoft', `${String(org.ms_tid).toLowerCase()}:${oid}`), r); }
    const rows = byHash.size ? await piiTx(a.tid, c => c.query("select learner_id::text lid, provider_sub_hash h from pii.identity where tid = $1 and provider = 'microsoft' and provider_sub_hash = any($2)", [a.tid, [...byHash.keys()]])) : [];
    const members = Array.isArray(doc.members) ? doc.members : []; const matched = []; const seen = new Set();
    for (const row of rows) {
      const mem = members.find(z => z && z.sid === row.lid); const r = byHash.get(row.h); if (!mem || !r || !inClass(mem.id) || seen.has(mem.id)) continue; seen.add(mem.id);
      const iv = Array.isArray(r.attendanceIntervals) ? r.attendanceIntervals : []; const first = iv.map(z => new Date(z.joinDateTime).getTime()).filter(Number.isFinite).sort()[0] || start;
      const sec = Math.max(0, +r.totalAttendanceInSeconds || 0);
      matched.push({ lid: mem.id, label: label(a.tid, mem.id), suggest: judge(sec, first), minutes: Math.round(sec / 60), firstJoin: hm(first) });
    }
    return { reportId: str(reps[0].id, 200), meetingStart: rep.meetingStartDateTime || new Date(m.start_at).toISOString(), meetingEnd: rep.meetingEndDateTime || new Date(m.end_at).toISOString(), matched, unmatched: recs.length - matched.length, mode: 'live' };
  }
  async function applyAttendance(req, id) {
    const a = await needAny(req); const b = await readBody(req, 65536); const m = await meetingOf(a, id);
    if (!m.class_id || !m.item_id) throw E('teams_item');
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, 1000) : []; if (rows.some(r => !r || !ATT.includes(r.value) || typeof r.lid !== 'string')) throw E('teams_input', { field: 'rows' });
    const n = await T(a.tid, async c => {
      const k = await docEdit(c, a.tid, doc => { const x = itemOf(doc, m.class_id, m.item_id); if (!x) return undefined; const L = Array.isArray(x.cl.learners) ? x.cl.learners : []; x.cl.att = x.cl.att && typeof x.cl.att === 'object' ? x.cl.att : {}; const A = x.cl.att[m.item_id] = x.cl.att[m.item_id] && typeof x.cl.att[m.item_id] === 'object' ? x.cl.att[m.item_id] : {}; let k2 = 0; for (const r of rows) if (L.includes(r.lid)) { A[r.lid] = r.value; k2++; } return k2; });
      if (k === null) throw E('teams_item');
      await audit(c, a.tid, a.email, 'teams.att.apply', { id, n: k, demo: m.demo }); return k;
    });
    return { ok: true, applied: n, ...(m.demo ? { note: '시연 데이터' } : {}) };
  }
  async function listMeetings(req) {
    const a = await needAny(req);
    const L = (await T(a.tid, c => c.query('select id, class_id, item_id, account_id, join_url, subject, start_at, end_at, demo from conn_teams_meeting where tenant_id = $1 order by start_at desc limit 100', [a.tid]))).rows;
    return { meetings: L.map(m => ({ id: m.id, classId: m.class_id, itemId: m.item_id, accountId: m.account_id, joinUrl: m.join_url, subject: m.subject, start: m.start_at, end: m.end_at, mode: m.demo ? 'demo' : 'live' })) };
  }
  async function notifyRoute(req) {
    const a = await needAny(req); const b = await readBody(req, 8192);
    const event = String(b.event || ''); if (!EVENTS.includes(event)) throw E('teams_bad_event');
    const queued = await notify(a.tid, event, { title: b.title, text: b.text, link: b.link });
    if (queued) await T(a.tid, c => audit(c, a.tid, a.email, 'teams.notify', { event, n: queued })).catch(() => {});
    return { ok: true, queued };
  }

  const routes = {
    'GET /api/conn/teams': async req => status(await needAny(req)),
    'DELETE /api/conn/teams': disconnect,
    'PUT /api/conn/teams/settings': putSettings,
    'PUT /api/conn/teams/demo': putDemo,
    'POST /api/conn/teams/channels': addChannel,
    'POST /api/conn/teams/test': testChannel,
    'POST /api/conn/teams/notify': notifyRoute,
    'PUT /api/conn/teams/sso': putSso,
    'PUT /api/conn/teams/learner': async req => { await needAdmin(req); throw E('teams_phase2'); },
    'GET /api/conn/teams/meetings': listMeetings,
    'POST /api/conn/teams/meetings': createMeeting,
    'POST /api/oauth/microsoft/link-start': opLinkStart,
  };
  function match(method, p) {
    const k = `${method} ${p}`; if (routes[k]) return routes[k];
    let m = p.match(/^\/api\/conn\/teams\/channels\/(ch_[a-z0-9]{10})$/); if (m) return method === 'PATCH' ? req => patchChannel(req, m[1]) : method === 'DELETE' ? req => delChannel(req, m[1]) : null;
    m = p.match(/^\/api\/conn\/teams\/account\/(ac_[a-z0-9]{10})$/); if (m && method === 'DELETE') return req => delAccount(req, m[1]);
    m = p.match(/^\/api\/conn\/teams\/meetings\/(tm_[a-z0-9]{10})(\/attendance\/(sync|apply))?$/);
    if (m && !m[2]) return method === 'PATCH' ? req => patchMeeting(req, m[1]) : method === 'DELETE' ? req => delMeeting(req, m[1]) : null;
    if (m && method === 'POST') return m[3] === 'sync' ? req => syncAttendance(req, m[1]) : req => applyAttendance(req, m[1]);
    if (/^\/api\/conn\/teams(\/|$)/.test(p)) return () => { throw new HttpErr(404, '없는 주소입니다.', 'not_found'); };
    return null;
  }
  return { match, handle, notify, flush, learnerReady, live: cfg.live, config: cfg };
}

module.exports = { createTeams, sqlMigrations, teamsConfig, checkHook, card, EVENTS, MSG };
