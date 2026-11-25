'use strict';
/* RSS · Atom · HTML 링크 목록 공용 파서(의존성 없음) + 변경 감지(seen 집합 대비 new 표시).
   피드 텍스트는 데이터다 — 키워드 대조로 분류만 하고, 어떤 동작도 그 텍스트로 분기하지 않는다. */
const crypto = require('node:crypto');

const ent = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'").replace(/&#8217;|&rsquo;/g, '’').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, n) => { const m = x.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`)); return m ? ent(m[1]) : ''; };
const https = u => (/^https:\/\//.test(u || '') ? u : null);
const hash = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 10);

/* RSS <item> · Atom <entry> → { title, link, guid, published, summary } */
function parseFeed(xml, limit = 30) {
  const s = String(xml || '');
  const rss = s.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/g);
  if (rss) return rss.slice(0, limit).map(x => ({ title: tag(x, 'title'), link: https(tag(x, 'link')), guid: tag(x, 'guid') || tag(x, 'link'), published: tag(x, 'pubDate') || tag(x, 'dc:date') || null, summary: (tag(x, 'description') || tag(x, 'content:encoded')).slice(0, 600) }));
  return (s.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/g) || []).slice(0, limit).map(x => {
    const alt = x.match(/<link[^>]*rel=['"]alternate['"][^>]*href=['"]([^'"]+)['"]/) || x.match(/<link[^>]*href=['"]([^'"]+)['"]/);
    return { title: tag(x, 'title'), link: https(alt && alt[1]), guid: tag(x, 'id') || (alt && alt[1]) || '', published: tag(x, 'published') || tag(x, 'updated') || null, summary: (tag(x, 'summary') || tag(x, 'content')).slice(0, 600) };
  });
}

/* HTML 목록 페이지 → 같은 사이트 글 링크(경로 패턴) · 링크 글자. 카테고리(짧은 1단어 경로)는 제외 */
function parseLinks(html, { base, pattern, limit = 40 } = {}) {
  const out = new Map();
  for (const m of String(html || '').matchAll(/<a\b[^>]*href="([^"#?]+)"[^>]*>([\s\S]{0,1200}?)<\/a>/g)) {
    const href = m[1]; if (!pattern.test(href)) continue;
    const url = href.startsWith('http') ? href : base.replace(/\/$/, '') + href;
    const text = ent(m[2]); if (!text || text.length < 12) continue;
    if (!out.has(url)) out.set(url, { title: text.slice(0, 200), link: https(url), guid: url, published: null, summary: text.slice(0, 600) });
    if (out.size >= limit) break;
  }
  return [...out.values()];
}

/* 보안 · 안전 관련 판별: 강한 키워드 1개 또는 (보안 단어 × 에이전트 · 도구 단어) */
const STRONG = /prompt[- ]injection|jailbreak|model context protocol|\bmcp\b|exfiltrat|red[- ]?team|claude code|data poisoning|system prompt|프롬프트 인젝션|탈옥/i;
const SEC = /secur|safety|vulnerab|abuse|attack|threat|misuse|malicious|exploit|defen[cs]e|보안|취약|악용/i;
const AGENT = /\bagent|agentic|\btools?\b|tool use|plugin|browser|connector|computer use|에이전트|도구/i;
function relevant(text) { const t = String(text || ''); const hits = []; const m = t.match(STRONG); if (m) hits.push(m[0].toLowerCase()); if (!m && SEC.test(t) && AGENT.test(t)) hits.push(t.match(SEC)[0].toLowerCase(), t.match(AGENT)[0].toLowerCase().trim()); return hits; }

/* seen(Set · 배열 · 없음) 대비 새 항목 표시. seen이 비어 있으면 첫 실행 — 모두 new */
function markNew(items, seen) { const S = seen instanceof Set ? seen : new Set(seen || []); return items.map(i => ({ ...i, new: !S.has(i.external_id) })); }

module.exports = { parseFeed, parseLinks, relevant, markNew, hash, ent, https };
