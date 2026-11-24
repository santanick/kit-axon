'use strict';
/* 영향 판정 — 해당(purl·버전 정확 매칭) / 일부(키워드 · 버전 미확정, 사람 확인) / 없음(근거 1줄) / 통제점검형(AI · 규제 소스 → 카드)
   피드 텍스트는 키워드 대조에만 쓰고 지시로 해석하지 않는다. */
const { plain } = require('./util'); const { basePurl } = require('./sbom');

const seg = v => String(v).split(/[.\-+_]/).map(x => (/^\d+$/.test(x) ? Number(x) : x));
function cmp(a, b) {
  const A = seg(a), B = seg(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i], y = B[i];
    if (x === undefined) return typeof y === 'number' ? -1 : 1; // 1.0 < 1.0.1, 1.0 > 1.0-rc
    if (y === undefined) return typeof x === 'number' ? 1 : -1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    if (typeof x === 'number') return 1; if (typeof y === 'number') return -1;
    return x < y ? -1 : 1;
  }
  return 0;
}
/* OSV ranges(SEMVER/ECOSYSTEM): introduced/fixed/last_affected 이벤트 순차 */
function inOsvRanges(ver, ranges) {
  for (const r of ranges || []) {
    if (r.type === 'GIT') continue;
    let open = null;
    for (const e of r.events || []) {
      if (e.introduced !== undefined) open = e.introduced === '0' ? '0' : e.introduced;
      else if (open !== null && e.fixed !== undefined) { if ((open === '0' || cmp(ver, open) >= 0) && cmp(ver, e.fixed) < 0) return true; open = null; }
      else if (open !== null && e.last_affected !== undefined) { if ((open === '0' || cmp(ver, open) >= 0) && cmp(ver, e.last_affected) <= 0) return true; open = null; }
    }
    if (open !== null && (open === '0' || cmp(ver, open) >= 0)) return true;
  }
  return false;
}
/* GHSA 범위 문자열: ">= 1.0.0, < 1.2.3" · "<= 4.17.20" · "= 1.0.0" */
function inRangeStr(ver, s) {
  if (!s) return false;
  return s.split(',').map(x => x.trim()).filter(Boolean).every(c => { const m = c.match(/^(>=|<=|>|<|=)?\s*(.+)$/); const k = cmp(ver, m[2]); return { '>=': k >= 0, '<=': k <= 0, '>': k > 0, '<': k < 0, '=': k === 0 }[m[1] || '=']; });
}
const ECO = { npm: 'npm', maven: 'Maven' };
const PLATFORM_KW = ['node.js', 'nodejs', 'postgresql', 'spring framework', 'spring boot', 'spring security', '전자정부', 'egovframe', 'tomcat', 'cloud run', 'firebase', 'model context protocol', 'mcp'];
const CONTROL_SOURCES = new Set(['ATLAS', 'OWASP', 'PIPC', 'AI-BLOG']);

function assess(threat, components, { hits } = {}) {
  if (threat.kind === 'ai' || threat.kind === 'reg' || CONTROL_SOURCES.has(threat.source)) return [{ verdict: '통제점검형', component: null, evidence: `${threat.source} 소스(AI · 규제) — 대책 카드로 통제 점검`, confidence: 'n/a' }];
  const out = [];
  for (const c of components) {
    // 1) OSV querybatch가 이 purl@버전을 직접 반환
    if (hits && (hits[c.purl] || []).some(id => (threat.aliases || []).includes(id))) { out.push({ verdict: '해당', component: c, evidence: `OSV querybatch 정확 매칭 ${c.purl}`, confidence: 'high' }); continue; }
    for (const a of threat.affected || []) {
      const sameEco = (a.ecosystem || '') === ECO[c.ecosystem]; const sameName = a.name === c.name || (a.purl && a.purl === basePurl(c.purl));
      if (!sameEco || !sameName) continue;
      if (!c.version) { out.push({ verdict: '일부', component: c, evidence: `${c.name} 버전 미확정(BOM 관리) — 사람 확인`, confidence: 'low' }); break; }
      const hit = (a.versions || []).includes(c.version) || inOsvRanges(c.version, a.ranges) || inRangeStr(c.version, a.range);
      if (hit) { out.push({ verdict: '해당', component: c, evidence: `${c.purl} 영향 범위 포함`, confidence: 'high' }); break; }
    }
  }
  if (out.length) return out;
  // 2) 키워드(이름 · 플랫폼) — 일부(사람 확인)
  // KEV처럼 설명문이 넓은 소스는 matchFields(제품명 등)만 대조해 오탐을 줄인다
  const f = threat.matchFields || ['title', 'summary', 'keywords', 'cpes'];
  const text = [f.includes('title') ? plain(threat.title) : '', f.includes('summary') ? plain(threat.summary) : '', ...(f.includes('keywords') ? threat.keywords || [] : []), ...(f.includes('cpes') ? threat.cpes || [] : [])].join(' ').toLowerCase();
  const names = [...new Set(components.map(c => c.name.split(':').pop().toLowerCase()).filter(n => n.length >= 4))];
  const word = k => new RegExp(`(^|[^a-z0-9-])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9-]|$)`).test(text);
  const kw = [...PLATFORM_KW.filter(word), ...names.filter(word)];
  if (kw.length) return [{ verdict: '일부', component: null, evidence: `키워드 매칭(${[...new Set(kw)].slice(0, 4).join(', ')}) — 사람 확인`, confidence: 'medium' }];
  return [{ verdict: '없음', component: null, evidence: 'SBOM 구성요소 · 플랫폼 키워드와 무관', confidence: 'high' }];
}
module.exports = { assess, cmp, inOsvRanges, inRangeStr, PLATFORM_KW };
