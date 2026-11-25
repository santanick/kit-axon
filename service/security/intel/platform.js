'use strict';
/* 플랫폼 · 런타임 공개 피드(무료 · 키 없음 · 가입 없음) — 보고서 Part 8 추가 감시 소스.
   피드형(RSS · Atom): GCP 보안 게시판 · Node.js 보안 릴리스 · Spring 보안 권고 · PHP 릴리스
   변경 감지형(HTML · 마크다운 목록): Firebase 릴리스 노트 · 전자정부 표준프레임워크 공지 · 개인정보위 보도자료 · Tomcat 10 보안 · OpenJDK 권고 · Oracle CPU
   - 항목마다 external_id를 정하고 seen(소스별) 대비 new를 표시한다(live로 받은 소스만 seen 갱신 — weekly.nextState).
   - 피드 텍스트는 데이터다: untrusted로 감싸고, 분류는 제품 키워드(keywords)와 impact.js 대조로만 한다.
   - 키 · 가입이 필요한 소스(WPScan API 등)는 넣지 않는다(운영비 0원 원칙). 네트워크가 없으면 픽스처(origin 'fixture'). */
const { fetchOr, untrusted } = require('../util'); const { parseFeed, markNew, hash, ent } = require('./feed'); const { fromLabel } = require('./cvss');

const CVE_RE = /CVE-\d{4}-\d{4,}/gi;
const cves = s => [...new Set((String(s || '').match(CVE_RE) || []).map(x => x.toUpperCase()))];
const abs = (base, href) => { if (!href) return null; if (/^https:\/\//.test(href)) return href; if (/^\//.test(href)) return base.replace(/^(https:\/\/[^/]+).*$/, '$1') + href; return base.replace(/[^/]*$/, '') + href; };

/* 목록 파서: { key, title, link, published, summary }[] */
const P = {
  feed: (d, s) => parseFeed(d, 30).map(e => ({ key: e.guid || e.link || e.title, title: e.title, link: e.link || abs(s.url, (e.guid || '').replace(/^http:/, 'https:')), published: e.published, summary: e.summary })),
  /* Firebase 릴리스 노트(.md.txt): "## November 19, 2026" 단위, 보안 관련 문장이 있는 날만 */
  mdDays: d => String(d || '').split(/^## /m).slice(1).filter(b => /^[A-Z][a-z]+ \d{1,2}, \d{4}/.test(b)).map(b => { const h = b.split('\n')[0].trim(); const body = b.slice(h.length).replace(/\s+/g, ' ').trim(); return { key: h, title: `Firebase 릴리스 노트 ${h}`, link: 'https://firebase.google.com/support/releases', published: new Date(h + ' UTC').toISOString(), summary: body.slice(0, 600) }; })
    .filter(x => /secur|vulnerab|CVE-|App Check|보안|취약/i.test(x.summary)),
  /* 게시판 목록(쿼리 문자열 링크 — feed.parseLinks는 '?' 링크를 받지 않으므로 별도) */
  links: (d, s) => { const out = new Map(); for (const m of String(d || '').matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]{0,600}?)<\/a>/g)) { const href = m[1].replace(/&amp;/g, '&'); if (!s.pattern.test(href)) continue; const t = ent(m[2]); if (t.length < 6) continue; const link = abs(s.base, href); const key = (href.match(/nttId=(\d+)/) || [, hash(href)])[1]; if (!out.has(key)) out.set(key, { key, title: t.slice(0, 200), link, published: null, summary: t.slice(0, 600) }); if (out.size >= 30) break; } return [...out.values()]; },
  /* Tomcat: <h3 id="Fixed_in_Apache_Tomcat_10.1.63"> 단위 · CVE 목록 */
  tomcat: d => { const s = String(d || ''); const out = []; const re = /<h3 id="Fixed_in_Apache_Tomcat_([\d.]+)"[\s\S]*?(?=<h3 id=|$)/g; let m; while ((m = re.exec(s)) && out.length < 10) { const txt = ent(m[0]); out.push({ key: m[1], title: `Apache Tomcat ${m[1]} 보안 수정${/not yet released/i.test(txt) ? '(미출시)' : ''}`, link: `https://tomcat.apache.org/security-10.html#Fixed_in_Apache_Tomcat_${m[1]}`, published: null, summary: txt.slice(0, 600) }); } return out; },
  /* OpenJDK 권고: href="2026-11-17" */
  openjdk: d => [...new Set([...String(d || '').matchAll(/href="(20\d\d-\d\d-\d\d)"/g)].map(m => m[1]))].slice(0, 12).map(x => ({ key: x, title: `OpenJDK 취약점 권고 ${x}`, link: `https://openjdk.org/groups/vulnerability/advisories/${x}`, published: x + 'T00:00:00Z', summary: 'OpenJDK Vulnerability Group 권고(openjdk · java se)' })),
  /* Oracle CPU: /security-alerts/cpuoct2026.html */
  oracle: d => [...new Set([...String(d || '').matchAll(/href="\/security-alerts\/(cpu[a-z]{3}\d{4})\.html"/g)].map(m => m[1]))].slice(0, 6).map(x => ({ key: x, title: `Oracle Critical Patch Update ${x.slice(3, 6).toUpperCase()} ${x.slice(6)}`, link: `https://www.oracle.com/security-alerts/${x}.html`, published: null, summary: 'Oracle 정기 패치(java se · openjdk 포함 여부는 본문 확인)' })),
};

/* type: 피드형(feed) · 변경 감지형(change). product: impact.js PLATFORM_KW와 맞춘 제품 키워드(있으면 '일부' 사람 확인) */
const SOURCES = [
  { id: 'GCP', type: 'feed', parse: 'feed', url: 'https://cloud.google.com/feeds/google-cloud-security-bulletins.xml', fixture: 'plat-gcp.xml', product: null },
  { id: 'FIREBASE', type: 'change', parse: 'mdDays', url: 'https://firebase.google.com/support/releases.md.txt', fixture: 'plat-firebase.md', product: 'firebase' },
  { id: 'NODE', type: 'feed', parse: 'feed', url: 'https://nodejs.org/en/feed/vulnerability.xml', fixture: 'plat-node.xml', product: 'node.js' },
  { id: 'SPRING', type: 'feed', parse: 'feed', url: 'https://spring.io/security.atom', fixture: 'plat-spring.xml', product: null },
  { id: 'EGOV', type: 'change', parse: 'links', url: 'https://www.egovframe.go.kr/home/ntt/nttList.do?menuNo=74&bbsId=6', base: 'https://www.egovframe.go.kr', pattern: /^\/home\/ntt\/nttRead\.do\?/, fixture: 'plat-egov.html', product: '전자정부' },
  { id: 'PIPC', type: 'change', parse: 'links', kind: 'reg', url: 'https://www.pipc.go.kr/np/cop/bbs/selectBoardList.do?bbsId=BS074&mCode=C020010000', base: 'https://www.pipc.go.kr', pattern: /^\/np\/cop\/bbs\/selectBoardArticle\.do\?/, fixture: 'plat-pipc.html', product: null },
  { id: 'PHP', type: 'feed', parse: 'feed', url: 'https://www.php.net/releases/feed.php', fixture: 'plat-php.xml', product: 'php' },
  { id: 'TOMCAT', type: 'change', parse: 'tomcat', url: 'https://tomcat.apache.org/security-10.html', fixture: 'plat-tomcat.html', product: 'tomcat' },
  { id: 'OPENJDK', type: 'change', parse: 'openjdk', url: 'https://openjdk.org/groups/vulnerability/advisories/', fixture: 'plat-openjdk.html', product: 'openjdk' },
  { id: 'ORACLE-CPU', type: 'change', parse: 'oracle', url: 'https://www.oracle.com/security-alerts/', fixture: 'plat-oracle.html', product: 'java se' },
];
const IDS = SOURCES.map(s => s.id);

async function collectOne(s, opts = {}) {
  const r = await fetchOr(s.url, { ...opts, text: true, fixture: s.fixture });
  const seen = new Set((opts.seen && opts.seen[s.id]) || []);
  const items = P[s.parse](r.data || '', s).filter(e => e.title).map(e => {
    const id = `${s.id}:${String(e.key).length > 60 ? hash(e.key) : e.key}`; const text = `${e.title} ${e.summary || ''}`;
    const label = (e.title.match(/\s-\s(CRITICAL|HIGH|MEDIUM|LOW)\s-\s/i) || [])[1]; // Spring 제목 "cve-… - HIGH - …"
    return { source: s.id, kind: s.kind || 'advisory', feed: s.type, external_id: id, aliases: [id, ...cves(text)], keywords: s.product ? [s.product] : [], cvss: label ? fromLabel(label) : null,
      title: untrusted(e.title, s.id.toLowerCase()), summary: untrusted(String(e.summary || '').slice(0, 600), s.id.toLowerCase()), url: e.link, published_at: e.published || null, origin: r.origin };
  });
  return { origin: r.origin, items: markNew(items, seen) };
}
/* intel/index.js 등록용: [[소스 id, { collect }]] */
const MODS = SOURCES.map(s => [s.id, { collect: opts => collectOne(s, opts) }]);
module.exports = { SOURCES, IDS, MODS, collectOne, parsers: P };
