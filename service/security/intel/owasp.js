'use strict';
/* OWASP GenAI 보안 프로젝트(genai.owasp.org) RSS — 글 변경 감지(일 1회). Top 10 · Agentic(ASI) 개정은 감사 기준 → '통제점검형'.
   본문의 LLMxx · ASIxx 식별자를 기법 id로 붙인다(레드팀 생성기 매핑용). */
const { fetchOr, untrusted } = require('../util'); const { parseFeed, markNew, hash } = require('./feed');
const URL_ = 'https://genai.owasp.org/feed/';
const TECH = /\b(LLM(?:0[1-9]|10)|ASI(?:0[1-9]|10))(?::?20\d\d)?\b/g;

async function collect(opts = {}) {
  const r = await fetchOr(URL_, { ...opts, text: true, fixture: 'owasp.xml' });
  const seen = new Set((opts.seen && opts.seen.OWASP) || []);
  const items = markNew(parseFeed(r.data, 20).filter(e => e.title).map(e => {
    const ids = [...new Set(`${e.title} ${e.summary}`.match(TECH) || [])].map(x => x.replace(/:?20\d\d$/, ''));
    const id = 'OWASP:' + hash(e.guid || e.link || e.title);
    return { source: 'OWASP', kind: 'ai', external_id: id, aliases: [id, ...ids], technique: ids.length ? { id: ids[0], name: e.title.slice(0, 120), change: 'owasp' } : null,
      title: untrusted(e.title, 'owasp'), summary: untrusted(e.summary, 'owasp'), url: e.link, published_at: e.published, origin: r.origin };
  }), seen);
  return { origin: r.origin, items };
}
module.exports = { collect };
