'use strict';
/* Slack 알림 — SLACK_WEBHOOK(#ai-security) 없으면 로그만. 정기 보고(주간 리포트 · 브리핑)는 주말 · 공휴일에 보내지 않고 다음 영업일 08시로 보류.
   Critical 즉시 알림: 확정 전까지 #ai-security 게시만(대표님 모바일은 다음 영업일 08시 — mobileAt로 표시). 피드 텍스트는 울타리 안에만 넣는다. */
const { isBusinessDay, nextBusinessMorning } = require('./util');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function notify({ kind = 'report', severity = 'Low', title, lines = [] }, { env = process.env, now = new Date(), fetchImpl = globalThis.fetch, log = console.error } = {}) {
  const immediate = kind === 'critical' || severity === 'Critical';
  if (!immediate && !isBusinessDay(now)) return { status: 'deferred', sendAt: nextBusinessMorning(now).toISOString(), reason: '주말 · 공휴일 정기 보고 보류' };
  const text = [`*[가디언][${esc(severity)}]* ${esc(title)}`, ...lines.map(esc)].join('\n');
  const extra = immediate ? { channel: '#ai-security', mobileAt: isBusinessDay(now) ? now.toISOString() : nextBusinessMorning(now).toISOString() } : {};
  if (!env.SLACK_WEBHOOK) { log(`[guardian:notify:미연결] ${text.replace(/\n/g, ' | ')}`); return { status: 'logged', ...extra }; }
  try {
    const r = await fetchImpl(env.SLACK_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, unfurl_links: false, unfurl_media: false }), signal: AbortSignal.timeout(10000) });
    return { status: r.ok ? 'sent' : 'failed', code: r.status, ...extra };
  } catch (e) { return { status: 'failed', error: String(e.message).slice(0, 120), ...extra }; }
}
module.exports = { notify };
