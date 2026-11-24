'use strict';
/* 보안 2차(SEC-0008 보완 통제, 2026-11-24 대표님 결정 「관리자 2단계 인증은 빼자」): 로그인 단계를 늘리지 않는 새 환경 로그인 알림.
   - 운영자(owner · sub · teacher) 로그인 · 가입 · 소셜 로그인 때 기기 표식 쿠키(무작위 32바이트, 400일)를 주고 서버에는 해시만 둔다(user_devices).
   - 처음 보는 기기, 또는 처음 보는 IP 대역(IPv4 /16 · IPv6 /32)이나 국가(GEO_COUNTRY_HEADER, 신뢰 프록시가 있을 때만)에서 로그인하면
     audit 'login.newdevice'를 남기고 본인 이메일로 알림(mail.js — 메일 미설정이면 audit만). 기록이 하나도 없는 계정의 첫 로그인은 기준만 만든다.
   - 저장: 브라우저 · OS 요약(원문 UA 아님), 대역(마지막 자리 가림), 국가 코드, 처음 · 마지막 시각. 계정당 최근 20개.
   - 본인 조회: GET /api/me/devices. Java 동일: service-egov cmm/DdDevices.java */
const crypto = require('node:crypto');
const { createMailer } = require('./mail');

const MIGRATION = ['core/user_devices_v1', `
  create table if not exists user_devices (
    user_id uuid not null references users(id) on delete cascade,
    dev_hash text not null,
    agent text not null default '',
    band text not null default '',
    country text not null default '',
    first_at timestamptz not null default now(),
    last_at timestamptz not null default now(),
    primary key (user_id, dev_hash)
  );
  create index if not exists user_devices_last on user_devices (user_id, last_at desc);
  do $$ begin if exists (select 1 from pg_roles where rolname = 'didisam_tenant') then revoke all on user_devices from didisam_tenant; end if; end $$;`];
const sqlMigrations = () => [MIGRATION];

/* 브라우저 · OS 요약(Java DdDevices.agent와 같은 규칙) */
function agent(ua) {
  const u = String(ua || '');
  const b = /Edg\//.test(u) ? 'Edge' : /Whale\//.test(u) ? 'Whale' : /SamsungBrowser\//.test(u) ? 'Samsung Internet' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : '기타 브라우저';
  const o = /Windows/.test(u) ? 'Windows' : /iPhone|iPad/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Mac OS X|Macintosh/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : '기타 OS';
  return `${b} · ${o}`;
}
/* IP 대역: IPv4 앞 두 자리(a.b.x.x), IPv6 앞 두 묶음(a:b::) — Java와 같음 */
function band(ip) {
  const s = String(ip || '').replace(/^::ffff:/i, '');
  const v4 = s.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/); if (v4) return `${v4[1]}.${v4[2]}.x.x`;
  if (s.includes(':')) { const g = s.split(':'); return `${(g[0] || '0').toLowerCase()}:${(g[1] || '0').toLowerCase()}::`; }
  return '';
}

function createDevices({ pool, env, inTenant, audit, cookies, secure, ip, hops, log = console }) {
  const mailer = createMailer(env);
  const NAME = secure ? '__Host-dd_dev' : 'dd_dev';
  const geoHdr = String(env.GEO_COUNTRY_HEADER || '').trim().toLowerCase();
  const country = req => { if (!geoHdr || !hops) return ''; const v = String(req.headers[geoHdr] || '').trim().toUpperCase(); return /^[A-Z]{2}$/.test(v) ? v : ''; };
  const hash = t => crypto.createHash('sha256').update('dd-dev|' + t).digest('hex');
  const addCookie = (res, c) => { const h = res.getHeader('set-cookie'); res.setHeader('set-cookie', [...(Array.isArray(h) ? h : h ? [String(h)] : []), c]); };
  const fmt = d => new Date(d + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' '); /* KST 'YYYY-MM-DD HH:mm'(Java와 같은 표기) */

  /* 세션을 만든 직후 부른다(로그인 단계 · 응답 시간에 영향 없음: 메일은 기다리지 않는다) */
  async function seen(req, res, uid, tid) {
    if (!req || !res) return null;
    try {
      let tok = String(cookies(req)[NAME] || ''); if (!/^[A-Za-z0-9_-]{43}$/.test(tok)) tok = '';
      const fresh = !tok; if (fresh) tok = crypto.randomBytes(32).toString('base64url');
      const h = hash(tok); const ag = agent(req.headers['user-agent']); const bd = band(ip(req)); const cc = country(req);
      const prev = (await pool.query('select dev_hash, band, country from user_devices where user_id = $1', [uid])).rows;
      const known = prev.some(r => r.dev_hash === h);
      const newBand = !!bd && !prev.some(r => r.band === bd); const newCountry = !!cc && !prev.some(r => r.country === cc);
      await pool.query(`insert into user_devices (user_id, dev_hash, agent, band, country) values ($1, $2, $3, $4, $5)
        on conflict (user_id, dev_hash) do update set agent = excluded.agent, band = excluded.band, country = case when excluded.country = '' then user_devices.country else excluded.country end, last_at = now()`, [uid, h, ag, bd, cc]);
      await pool.query('delete from user_devices where user_id = $1 and dev_hash not in (select dev_hash from user_devices where user_id = $1 order by last_at desc limit 20)', [uid]);
      addCookie(res, `${NAME}=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${400 * 86400}${secure ? '; Secure' : ''}`);
      if (!prev.length || (known && !newBand && !newCountry)) return null;
      const why = [!known && 'device', newBand && 'band', newCountry && 'country'].filter(Boolean);
      const u = (await pool.query('select email from users where id = $1', [uid])).rows[0]; const email = u ? u.email : '';
      const mailed = mailer.on && !!email;
      await inTenant(pool, tid, c => audit(c, tid, email, 'login.newdevice', { why, agent: ag, band: bd, country: cc, mailed }));
      if (mailed) {
        const org = ((await pool.query('select name from tenants where id = $1', [tid])).rows[0] || {}).name || '디디쌤';
        const what = why.map(w => ({ device: '처음 사용하는 기기 · 브라우저', band: '처음 보는 접속 위치(IP 대역)', country: '처음 보는 국가' })[w]).join(', ');
        mailer.send({ to: email, subject: `[${String(org).slice(0, 40)}] 디디쌤 스튜디오 새 환경 로그인 알림`, text: `${email} 계정이 새 환경에서 로그인했습니다.\n\n- 시각: ${fmt(Date.now())} (한국 시간)\n- 사유: ${what}\n- 기기: ${ag}\n- 접속 대역: ${bd || '알 수 없음'}${cc ? `\n- 국가: ${cc}` : ''}\n\n본인이 로그인했다면 이 메일은 무시하셔도 됩니다.\n본인이 아니라면 즉시 비밀번호를 변경하십시오(비밀번호를 바꾸면 다른 기기의 로그인이 모두 끊깁니다).` })
          .catch(e => log.warn && log.warn('newdevice mail failed', e && e.message));
      }
      return why;
    } catch (e) { log.warn && log.warn('device check failed', e && e.message); return null; } /* 알림 실패가 로그인을 막지 않는다 */
  }
  async function list(a, req) {
    const cur = String(cookies(req)[NAME] || ''); const ch = cur ? hash(cur) : '';
    const { rows } = await pool.query(`select dev_hash, agent, band, country, to_char(first_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') first_at, to_char(last_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') last_at from user_devices where user_id = $1 order by last_at desc limit 20`, [a.uid]);
    return { rows: rows.map(r => ({ agent: r.agent, band: r.band, country: r.country, firstAt: r.first_at, lastAt: r.last_at, current: r.dev_hash === ch })) };
  }
  return { seen, list, NAME };
}

module.exports = { createDevices, sqlMigrations, agent, band };
