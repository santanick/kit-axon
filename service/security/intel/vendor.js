'use strict';
/* AI 3사 보안 · 안전 공지 변경 감지(일 1회) — Google 보안 블로그(Atom) · OpenAI 뉴스(RSS) · Anthropic 뉴스(HTML 링크 목록).
   키워드(prompt injection · jailbreak · MCP · Claude Code · 보안 × agent · tool)로 거른 글만 '통제점검형'(source AI-BLOG). */
const { fetchOr, untrusted } = require('../util'); const { parseFeed, parseLinks, relevant, markNew, hash } = require('./feed');
const VENDORS = [
  { id: 'google', url: 'https://security.googleblog.com/feeds/posts/default', fixture: 'vendor-google.xml', parse: d => parseFeed(d, 25) },
  { id: 'openai', url: 'https://openai.com/news/rss.xml', fixture: 'vendor-openai.xml', parse: d => parseFeed(d, 40) },
  { id: 'anthropic', url: 'https://www.anthropic.com/news', fixture: 'vendor-anthropic.html', parse: d => parseLinks(d, { base: 'https://www.anthropic.com', pattern: /^\/(?:news|research|engineering)\/[a-z0-9-]{8,}$/ }) },
];

async function collect(opts = {}) {
  const seen = new Set((opts.seen && opts.seen['AI-BLOG']) || []); const items = []; const origins = {};
  for (const v of VENDORS) {
    const r = await fetchOr(v.url, { ...opts, text: true, fixture: v.fixture }); origins[v.id] = r.origin;
    for (const e of v.parse(r.data || '')) {
      const kw = relevant(`${e.title} ${e.summary}`); if (!kw.length) continue;
      const id = `AI-BLOG:${v.id}:${hash(e.guid || e.link || e.title)}`;
      items.push({ source: 'AI-BLOG', kind: 'ai', vendor: v.id, external_id: id, aliases: [id], keywords: kw, technique: null,
        title: untrusted(e.title, v.id), summary: untrusted(e.summary, v.id), url: e.link, published_at: e.published, origin: r.origin });
    }
  }
  const o = [...new Set(Object.values(origins))];
  return { origin: o.length === 1 ? o[0] : Object.entries(origins).map(([k, x]) => `${k}:${x}`).join(','), origins, items: markNew(items, seen) };
}
module.exports = { collect, VENDORS };
