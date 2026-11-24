'use strict';
/* KISA 보호나라 보안공지 RSS(bbsId=B0000133, 3시간). 한글 키워드로 1차 분류 → 판정은 '일부(사람 확인)' 또는 '없음' */
const { fetchOr, untrusted } = require('../util');
const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/<[^>]+>/g, ' ').trim();
const t = (x, n) => { const m = x.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`)); return m ? ent(m[1]) : ''; };
async function collect(opts = {}) {
  const r = await fetchOr('https://www.boho.or.kr/kr/rss.do?bbsId=B0000133', { ...opts, text: true, fixture: 'kisa.xml' });
  const items = ((r.data || '').match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 50).map(x => {
    const title = t(x, 'title'); const link = t(x, 'link');
    return { source: 'KISA', kind: 'advisory', external_id: 'KISA:' + (link.match(/nttId=(\d+)/) || [, title.slice(0, 40)])[1], aliases: [...new Set(title.match(/CVE-\d{4}-\d+/g) || [])], title: untrusted(title, 'kisa'), summary: untrusted(t(x, 'description').slice(0, 600), 'kisa'), url: /^https:\/\//.test(link) ? link : null, published_at: t(x, 'pubDate') || null, origin: r.origin };
  });
  return { origin: r.origin, items };
}
module.exports = { collect };
