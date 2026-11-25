'use strict';
/* MITRE ATLAS(atlas-data) — CHANGELOG 최신 릴리스의 신규 · 갱신 기법 + dist/ATLAS.yaml 기법 목록(주 1회).
   → '통제점검형' 항목(기법 id · 이름 · 요약 · 출처). seen에 없는 기법만 new(레드팀 후보). 실패 시 픽스처. */
const { fetchOr, untrusted } = require('../util'); const { markNew } = require('./feed');
const RAW = 'https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/';
const ID = /AML\.T\d{4}(?:\.\d{3})?/;

/* CHANGELOG 최신 섹션: 버전 · 날짜 · 기법(added | updated) */
function parseChangelog(md) {
  const secs = String(md || '').split(/\n(?=## \[)/).map(s => s.replace(/^\n+/, '')).filter(s => s.startsWith('## ['));
  if (!secs.length) return { version: null, date: null, techniques: [] };
  const head = secs[0].match(/^## \[([^\]]+)\][^(]*(?:\(\))?\s*\((\d{4}-\d{2}-\d{2})\)/) || [];
  const tech = secs[0].split(/\n#{5,6} /).find(b => /^Techniques/.test(b)) || '';
  const techniques = []; let mode = null;
  for (const line of tech.split('\n')) {
    if (/^- Added new/i.test(line)) mode = 'added'; else if (/^- Updated/i.test(line)) mode = 'updated'; else if (/^- /.test(line)) mode = null;
    const m = line.match(/^ {2}- \[([^\]]+)\]\(\/techniques\/(AML\.T\d{4}(?:\.\d{3})?)\)/);
    if (m && mode && !techniques.some(t => t.id === m[2])) techniques.push({ id: m[2], name: m[1], change: mode });
  }
  return { version: head[1] || null, date: head[2] || null, techniques };
}

/* ATLAS.yaml(경량 파서): "- id: AML.Txxxx" 다음 name · description 첫 문단 */
function parseYaml(y) {
  const out = new Map(); const lines = String(y || '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)- id: (AML\.T\d{4}(?:\.\d{3})?)\s*$/); if (!m) continue;
    const ind = m[1].length + 2; let name = ''; let desc = '';
    for (let j = i + 1; j < lines.length && j < i + 40; j++) {
      const l = lines[j]; const lead = l.match(/^\s*/)[0].length;
      if (l.trim() && lead < ind) break;
      if (lead === ind && /^\s*name: /.test(l)) name = l.trim().slice(6).replace(/^['"]|['"]$/g, '');
      if (lead === ind && /^\s*description: /.test(l)) { desc = l.trim().slice(13); for (let k = j + 1; k < lines.length && lines[k].trim() && lines[k].match(/^\s*/)[0].length > ind; k++) desc += ' ' + lines[k].trim(); }
    }
    if (!out.has(m[2])) out.set(m[2], { id: m[2], name, description: desc.replace(/^'|'$/g, '').replace(/''/g, "'").slice(0, 600) });
  }
  return out;
}

async function collect(opts = {}) {
  const cl = await fetchOr(RAW + 'CHANGELOG.md', { ...opts, text: true, fixture: 'atlas-changelog.md' });
  const ya = await fetchOr(RAW + 'dist/ATLAS.yaml', { ...opts, text: true, fixture: 'atlas.yaml', timeoutMs: 30000 });
  const log = parseChangelog(cl.data); const cat = parseYaml(ya.data);
  const seen = new Set((opts.seen && opts.seen.ATLAS) || []);
  const pick = new Map(log.techniques.map(t => [t.id, t]));
  if (seen.size) for (const id of cat.keys()) if (!seen.has(id) && !pick.has(id)) pick.set(id, { id, name: cat.get(id).name, change: 'catalog' }); // 목록에 새로 나타난 기법
  const origin = cl.origin === ya.origin ? cl.origin : `${cl.origin}/${ya.origin}`;
  const items = markNew([...pick.values()].map(t => {
    const c = cat.get(t.id) || {}; const name = t.name || c.name || t.id;
    return { source: 'ATLAS', kind: 'ai', external_id: t.id, aliases: [t.id], technique: { id: t.id, name, change: t.change, release: log.version },
      title: untrusted(`${t.id} ${name}`, 'atlas'), summary: untrusted(c.description || `ATLAS ${log.version || ''} ${t.change}`, 'atlas'),
      url: `https://atlas.mitre.org/techniques/${t.id}`, published_at: log.date, origin };
  }), seen);
  return { origin, release: log.version, catalog: [...cat.keys()], items };
}
module.exports = { collect, parseChangelog, parseYaml, ID };
