'use strict';
/* AIBOM(체크리스트 13) — 디디쌤의 AI 구성을 CycloneDX 1.6 ML-BOM으로 만든다. 저장소 파일만 읽고 네트워크 · 비밀값은 쓰지 않는다.
   · 모델: 서버 허용 모델(service/server/app.js MODELS) · 음성 인식 모델(service/Dockerfile whisper, sha256 고정)
   · MCP: 디디쌤 MCP 서버(service/server/mcp.js) 도구 목록 + 목록 해시(바뀌면 검토)
   · 플러그인: 학습자 앱 Capacitor 플러그인(didisam/native/package.json · capacitor.config.json)
   · 프롬프트: 서버 · 브라우저의 지시문 상수(이름에 SYS · Sys · PROMPT · GUARD_RULE)를 찾아 sha256(원문은 BOM에 넣지 않음)
   잠금: security/aibom.lock.json(해시 목록). diff()가 추가 · 삭제 · 변경을 내고, `guard.js aibom --check`는 변경이 있으면 1로 끝난다
   (CI 게이트 — 의도한 변경이면 같은 PR에서 `guard.js aibom --update-lock`으로 잠금을 갱신하고 검토자가 확인). */
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const rd = (root, rel) => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; } };
const LOCK = 'security/aibom.lock.json';

function models(root) {
  const out = []; const app = rd(root, 'service/server/app.js');
  const m = app && app.match(/const MODELS\s*=\s*\[([^\]]*)\]/);
  for (const name of m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []) out.push({ kind: 'model', name, version: name, provider: 'Anthropic', hosting: 'api', location: 'service/server/app.js', purpose: '튜터 · AI SAM · 채점 초안 · 콘텐츠 생성' });
  const df = rd(root, 'service/Dockerfile');
  if (df) {
    const arg = k => (df.match(new RegExp(`ARG ${k}=(\\S+)`)) || [])[1] || null;
    const name = arg('WHISPER_MODEL_NAME');
    if (name) out.push({ kind: 'model', name: `whisper.cpp/${name}`, version: arg('WHISPER_REF'), provider: 'ggerganov/whisper.cpp', hosting: 'self', location: 'service/Dockerfile', purpose: '자막 음성 인식', sha256: arg('WHISPER_MODEL_SHA256') });
  }
  return out;
}

function mcp(root) {
  const s = rd(root, 'service/server/mcp.js'); if (!s) return [];
  const tools = [...s.matchAll(/name: '([a-z_]+)'/g)].map(x => x[1]);
  const proto = (s.match(/const PROTO\s*=\s*\[([^\]]*)\]/) || [, ''])[1].match(/'[^']+'/g) || [];
  return [{ kind: 'mcp', name: 'didisam-mcp', endpoint: '/mcp', location: 'service/server/mcp.js', tools, protocols: proto.map(x => x.slice(1, -1)), tools_sha256: sha(JSON.stringify([...tools].sort())) }];
}

function plugins(root) {
  const pk = rd(root, 'didisam/native/package.json'); const cf = rd(root, 'didisam/native/capacitor.config.json');
  if (!pk) return [];
  let deps = {}; let conf = {}; try { const j = JSON.parse(pk); deps = { ...(j.dependencies || {}) }; } catch { } try { conf = JSON.parse(cf || '{}').plugins || {}; } catch { }
  return Object.entries(deps).map(([name, version]) => ({ kind: 'plugin', name, version: String(version), location: 'didisam/native/package.json', pinned: /^\d+\.\d+\.\d+$/.test(String(version)), configured: Object.keys(conf).some(k => name.replace(/[-@/]/g, '').toLowerCase().includes(k.toLowerCase())) }));
}

/* 지시문 상수 원문 추출: 템플릿 · 따옴표 문자열은 닫는 따옴표까지, 그 밖(화살표 함수 등)은 줄 끝 ';'까지 */
function literalAt(s, i) {
  while (/\s/.test(s[i])) i++;
  const q = s[i];
  if (q === '`' || q === "'" || q === '"') { let j = i + 1; let depth = 0; for (; j < s.length; j++) { const c = s[j]; if (c === '\\') { j++; continue; } if (q === '`' && c === '$' && s[j + 1] === '{') { depth++; j++; continue; } if (q === '`' && depth && c === '}') { depth--; continue; } if (c === q && !depth) break; } return s.slice(i, j + 1); }
  const e = s.indexOf(';\n', i); return s.slice(i, e < 0 ? Math.min(s.length, i + 4000) : e);
}
const PROMPT_NAME = /^(?:[A-Z][A-Z_]*_SYS|SYS(?:_[A-Z]+)?|[a-z][A-Za-z]*Sys|[A-Za-z_]*PROMPT[A-Za-z_]*|GUARD_RULE|gsys|system)$/;
function prompts(root) {
  const out = [];
  for (const dir of ['service/server', 'didisam']) {
    let files = []; try { files = fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.js')).sort(); } catch { continue; }
    for (const f of files) {
      const rel = `${dir}/${f}`; const s = rd(root, rel);
      for (const m of s.matchAll(/(?:^|[\s;{(])(?:const|let)\s+([A-Za-z_][\w]*)\s*=(?!=)/g)) {
        const name = m[1]; if (!PROMPT_NAME.test(name)) continue;
        if ((name === 'system' || name === 'gsys') && dir !== 'service/server') continue; // 브라우저의 지역 변수 system은 지시문이 아닐 수 있음
        const lit = literalAt(s, m.index + m[0].length); if (lit.length < 20) continue;
        out.push({ kind: 'prompt', name: `${rel}#${name}`, location: rel, sha256: sha(lit), bytes: Buffer.byteLength(lit) });
      }
    }
  }
  const seen = new Set(); return out.filter(p => !seen.has(p.name) && seen.add(p.name));
}

function collect(root) { return { models: models(root), mcp: mcp(root), plugins: plugins(root), prompts: prompts(root) }; }

/* 잠금용 지문: 항목 이름 → 해시(모델 · 플러그인은 버전, MCP는 도구 목록 해시, 프롬프트는 원문 해시) */
function fingerprint(c) {
  const fp = {};
  for (const m of c.models) fp[`model:${m.name}`] = sha(JSON.stringify([m.version, m.sha256 || null, m.hosting]));
  for (const s of c.mcp) fp[`mcp:${s.name}`] = s.tools_sha256;
  for (const p of c.plugins) fp[`plugin:${p.name}`] = sha(p.version);
  for (const p of c.prompts) fp[`prompt:${p.name}`] = p.sha256;
  return fp;
}
function diff(lock, fp) {
  const a = (lock && lock.items) || {}; const r = { added: [], removed: [], changed: [] };
  for (const k of Object.keys(fp)) if (!(k in a)) r.added.push(k); else if (a[k] !== fp[k]) r.changed.push(k);
  for (const k of Object.keys(a)) if (!(k in fp)) r.removed.push(k);
  r.drift = r.added.length + r.removed.length + r.changed.length; return r;
}

function toCycloneDX(c, { now = new Date(), name = 'didisam-v2-ai', version = '0' } = {}) {
  const prop = (k, v) => ({ name: `didisam:${k}`, value: String(v) });
  const comps = [
    ...c.models.map(m => ({ type: 'machine-learning-model', 'bom-ref': `model:${m.name}`, name: m.name, version: m.version || undefined, supplier: { name: m.provider }, ...(m.sha256 ? { hashes: [{ alg: 'SHA-256', content: m.sha256 }] } : {}), modelCard: { modelParameters: { task: m.purpose } }, properties: [prop('hosting', m.hosting), prop('location', m.location)] })),
    ...c.plugins.map(p => ({ type: 'library', 'bom-ref': `plugin:${p.name}`, name: p.name, version: p.version, purl: `pkg:npm/${p.name.replace(/^@/, '%40')}@${p.version}`, properties: [prop('kind', 'plugin'), prop('pinned', p.pinned), prop('location', p.location)] })),
    ...c.prompts.map(p => ({ type: 'data', 'bom-ref': `prompt:${p.name}`, name: p.name, hashes: [{ alg: 'SHA-256', content: p.sha256 }], data: [{ type: 'other', name: 'system-prompt', classification: 'internal' }], properties: [prop('kind', 'prompt'), prop('location', p.location), prop('bytes', p.bytes)] })),
  ];
  return {
    bomFormat: 'CycloneDX', specVersion: '1.6', serialNumber: 'urn:uuid:' + crypto.randomUUID(), version: 1,
    metadata: { timestamp: now.toISOString(), tools: { components: [{ type: 'application', name: 'didisam-guardian-aibom', version: '0.1' }] }, component: { type: 'application', name, version } },
    components: comps,
    services: [
      ...c.mcp.map(s => ({ 'bom-ref': `mcp:${s.name}`, name: s.name, endpoints: [s.endpoint], authenticated: true, 'x-trust-boundary': true, data: [{ flow: 'bi-directional', classification: 'tenant-scoped' }], properties: [prop('kind', 'mcp-server'), prop('tools', s.tools.join(',')), prop('tools_sha256', s.tools_sha256), prop('protocols', s.protocols.join(','))] })),
      ...(c.models.some(m => m.hosting === 'api') ? [{ 'bom-ref': 'svc:anthropic-api', name: 'Anthropic Messages API', provider: { name: 'Anthropic' }, endpoints: ['https://api.anthropic.com/v1/messages'], authenticated: true, 'x-trust-boundary': true, data: [{ flow: 'outbound', classification: 'pii-redacted' }] }] : []),
    ],
  };
}

function buildAibom(root, opts = {}) {
  const c = collect(root); const fp = fingerprint(c);
  let lock = null; try { lock = JSON.parse(fs.readFileSync(path.join(root, opts.lock || LOCK), 'utf8')); } catch { }
  const d = lock ? diff(lock, fp) : null;
  return { components: c, fingerprint: fp, lock: lock ? 'present' : 'missing', diff: d,
    summary: { models: c.models.length, mcp: c.mcp.length, mcp_tools: c.mcp.reduce((n, s) => n + s.tools.length, 0), plugins: c.plugins.length, unpinned_plugins: c.plugins.filter(p => !p.pinned).length, prompts: c.prompts.length, drift: d ? d.drift : null },
    cyclonedx: toCycloneDX(c, opts) };
}
function writeLock(root, fp, now = new Date(), file = LOCK) { const f = path.join(root, file); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify({ generated_at: now.toISOString().slice(0, 10), note: 'AIBOM 잠금 — 모델 · MCP 도구 목록 · 플러그인 · 프롬프트 해시. 바뀌면 guard.js aibom --check 실패, 검토 후 --update-lock', items: Object.fromEntries(Object.entries(fp).sort()) }, null, 2) + '\n'); return f; }

module.exports = { buildAibom, collect, fingerprint, diff, toCycloneDX, writeLock, literalAt, LOCK };
