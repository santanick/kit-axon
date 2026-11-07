'use strict';
/* v33 메일 발송 어댑터(학습자 인증번호 등). 값은 환경변수로만 받는다 — 코드 · 로그 · 응답에 계정 값을 남기지 않는다.
   MAIL_PROVIDER=webhook : MAIL_WEBHOOK_URL(운영은 https만) + 선택 MAIL_WEBHOOK_TOKEN(Bearer) → POST {from,to,subject,text}
   MAIL_PROVIDER=smtp    : SMTP_URL = smtps://user:pass@host:465 (암묵 TLS) 또는 smtp://user:pass@host:587 (STARTTLS 필수)
   MAIL_FROM             : 보내는 주소(기본 no-reply@didisam.com)
   설정이 없으면 on=false — 호출하는 쪽이 "메일 발송이 아직 설정되지 않았습니다" 안내로 처리한다. Java: cmm/DdMail.java(같은 규격) */
const net = require('node:net'); const tls = require('node:tls');

function createMailer(env) {
  const prov = String(env.MAIL_PROVIDER || '').trim().toLowerCase(); const prod = env.NODE_ENV === 'production';
  const from = String(env.MAIL_FROM || 'no-reply@didisam.com').trim();
  if (prov === 'webhook') {
    const url = String(env.MAIL_WEBHOOK_URL || '').trim(); const tok = String(env.MAIL_WEBHOOK_TOKEN || '').trim();
    if (!/^https:\/\//.test(url) && !(!prod && /^http:\/\//.test(url))) return { on: false };
    return { on: true, kind: 'webhook', async send({ to, subject, text }) {
      const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 10e3);
      try { const r = await fetch(url, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ from, to, subject, text }) }); if (!r.ok) throw new Error('mail webhook ' + r.status); } finally { clearTimeout(t); } } };
  }
  if (prov === 'smtp') {
    let u; try { u = new URL(String(env.SMTP_URL || '')); } catch (e) { return { on: false }; }
    if (!['smtp:', 'smtps:'].includes(u.protocol) || !u.hostname) return { on: false };
    return { on: true, kind: 'smtp', send: m => smtpSend(u, from, m) };
  }
  return { on: false };
}

/* 최소 SMTP 클라이언트: EHLO → (STARTTLS) → AUTH PLAIN → MAIL/RCPT/DATA. 평문 연결로는 인증 정보를 보내지 않는다. */
function smtpSend(u, from, { to, subject, text }) {
  const implicit = u.protocol === 'smtps:'; const port = +u.port || (implicit ? 465 : 587); const host = u.hostname;
  const user = decodeURIComponent(u.username || ''), pass = decodeURIComponent(u.password || '');
  const hdr = s => /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
  const body = [`From: ${from}`, `To: ${to}`, `Subject: ${hdr(subject)}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', `Date: ${new Date().toUTCString()}`, '',
    Buffer.from(text, 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n')].join('\r\n');
  return new Promise((ok, no) => {
    let sock = implicit ? tls.connect({ host, port, servername: host }) : net.connect({ host, port }); let buf = ''; let wait = null; let secure = implicit;
    const timer = setTimeout(() => fail(new Error('smtp timeout')), 15e3);
    const fail = e => { clearTimeout(timer); try { sock.destroy(); } catch (x) { } no(e); };
    const onData = d => { buf += d.toString('utf8'); const lines = buf.split('\r\n'); const last = lines.length >= 2 ? lines[lines.length - 2] : ''; if (/^\d{3} /.test(last)) { const code = +last.slice(0, 3); const all = buf; buf = ''; if (wait) { const w = wait; wait = null; w(code, all); } } };
    const bind = s => { s.on('data', onData); s.on('error', fail); };
    const cmd = (line, expect) => new Promise((res, rej) => { wait = (code, all) => (expect.includes(code) ? res(all) : rej(new Error('smtp ' + code))); if (line != null) sock.write(line + '\r\n'); });
    bind(sock);
    (async () => {
      await cmd(null, [220]); let ehlo = await cmd('EHLO didisam', [250]);
      if (!secure) { if (!/STARTTLS/i.test(ehlo)) throw new Error('smtp starttls unsupported'); await cmd('STARTTLS', [220]); sock.removeListener('data', onData); sock = tls.connect({ socket: sock, servername: host }); bind(sock); await new Promise(r => sock.once('secureConnect', r)); secure = true; ehlo = await cmd('EHLO didisam', [250]); }
      if (user) await cmd('AUTH PLAIN ' + Buffer.from(`\0${user}\0${pass}`).toString('base64'), [235]);
      await cmd(`MAIL FROM:<${from.replace(/^.*<|>.*$/g, '')}>`, [250]); await cmd(`RCPT TO:<${to}>`, [250, 251]); await cmd('DATA', [354]);
      await cmd(body.replace(/\r\n\./g, '\r\n..') + '\r\n.', [250]); await cmd('QUIT', [221]).catch(() => {});
      clearTimeout(timer); sock.end(); ok();
    })().catch(fail);
  });
}

module.exports = { createMailer };
