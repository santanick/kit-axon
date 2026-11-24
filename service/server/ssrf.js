'use strict';
/* 가디언 4차 #19 SSRF — 서버가 기관 입력 주소로 나가는 요청의 공통 검사(KISA 2026 SF)
   · 전수 목록과 판정: docs/security/kisa-web-check.md 「SF」
   · 홈페이지 벤치마크(bench.js)는 https · 443 · 사설/루프백/링크로컬/메타데이터 전부 차단 + IP 고정 연결을 이미 한다 — isPrivate는 그 판정을 그대로 쓴다
   · 학내 LLM(openai_compat)은 서버 허용 목록(LLM_SELFHOST_HOSTS)에 있는 호스트만 부른다. 학내 서버는 사설 주소가 정상이므로 사설 대역은 허용하되,
     클라우드 메타데이터(169.254.169.254 · fd00:ec2::254 · 100.100.100.200)와 링크 로컬 · 미지정(0.0.0.0 · ::) 주소는 허용 목록과 상관없이 막는다.
     계정 정보(user@host)가 든 주소, http · https 외 방식도 막는다. 리다이렉트는 따르지 않는다(호출 쪽 redirect: 'manual' — Java HttpClient 기본값 NEVER와 같음)
   · Java 대응: service-egov/.../cmm/DdSsrf.java(같은 판정 · 같은 오류 코드 provider_blocked) */
const net = require('node:net');
const dns = require('node:dns').promises;
const { isPrivate } = require('./bench');

const META = new Set(['169.254.169.254', '169.254.170.2', '100.100.100.200', 'fd00:ec2::254']);

function norm(ip) {
  ip = String(ip || '').replace(/^\[|\]$/g, '').toLowerCase(); const z = ip.indexOf('%'); if (z >= 0) ip = ip.slice(0, z);
  const m = ip.match(/^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/); if (m) return m[1];
  const mh = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/); if (mh) { const h = parseInt(mh[1], 16), l = parseInt(mh[2], 16); return `${h >> 8}.${h & 255}.${l >> 8}.${l & 255}`; }
  return ip;
}
/** 허용 목록과 상관없이 막는 주소: 메타데이터 · 링크 로컬(169.254/16 · fe80::/10) · 미지정 · 형식 오류 */
function isMetaOrLinkLocal(ip) {
  ip = norm(ip); const fam = net.isIP(ip); if (!fam) return true;
  if (META.has(ip)) return true;
  if (fam === 4) { const [a, b] = ip.split('.').map(Number); return a === 0 || (a === 169 && b === 254); }
  if (ip === '::') return true;
  const first = parseInt(ip.split(':')[0] || '0', 16);
  return (first & 0xffc0) === 0xfe80;
}
const blocked = () => Object.assign(new Error('학내 LLM 서버 주소가 허용되지 않는 주소(메타데이터 · 링크 로컬 · 계정 정보 포함)로 확인되어 호출하지 않았습니다.'), { status: 503, code: 'provider_blocked' });

/** 학내 LLM 주소 검사 — 통과하면 URL, 아니면 provider_blocked(503). lookup은 시험용 주입 */
async function checkSelfUrl(raw, lookup = dns.lookup) {
  let u; try { u = new URL(String(raw || '')); } catch (e) { throw blocked(); }
  if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) throw blocked();
  const h = u.hostname.replace(/^\[|\]$/g, '');
  const L = net.isIP(h) ? [{ address: h }] : await lookup(h, { all: true }).catch(() => []);
  if (!L || !L.length || L.some(a => isMetaOrLinkLocal(a.address))) throw blocked();
  return u;
}

module.exports = { isMetaOrLinkLocal, checkSelfUrl, isPrivate, META };
