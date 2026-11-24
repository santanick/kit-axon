'use strict';
/* GitHub 쓰기 큐 — 계정 정지 방지 토큰 버킷(대표님 결정 · github-safe-ops)
   봇 몫: 쓰기 시간당 6 · 2분 간격 · 읽기 시간당 20 · 자동 PR 하루 2건. 403 · 429를 받으면 24시간 전면 중단(재시도 없음).
   GITHUB_TOKEN이 없으면 dry: 보낼 내용만 기록하고 네트워크를 쓰지 않는다. 병합 · 워크플로 · CODEOWNERS 변경은 큐가 거부한다. */
const path = require('node:path'); const fs = require('node:fs');
const { readJson, writeJson, kstDate } = require('./util');

const LIMITS = { writePerHour: 6, minGapMs: 2 * 60e3, readPerHour: 20, autoPrPerDay: 2, haltMs: 24 * 3600e3 };
const FORBIDDEN_FILE = [/^\.github\/workflows\//, /(^|\/)CODEOWNERS$/, /^\.github\/CODEOWNERS$/];
const ALLOWED_KINDS = new Set(['issue', 'comment', 'label', 'pr']);

class GitHubQueue {
  constructor({ stateFile = path.join(__dirname, '.state', 'queue.json'), env = process.env, fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
    this.stateFile = stateFile; this.env = env; this.fetch = fetchImpl; this.now = now;
    this.s = fs.existsSync(stateFile) ? readJson(stateFile) : { pending: [], done: [], writes: [], reads: [], prs: {}, haltedUntil: null, lastWriteAt: null, seq: 0 };
  }
  get mode() { return this.env.GITHUB_TOKEN && this.env.GITHUB_REPO ? 'live' : 'dry'; }
  save() { writeJson(this.stateFile, this.s); }
  _trim(t) { const h = t - 3600e3; this.s.writes = this.s.writes.filter(x => x > h); this.s.reads = this.s.reads.filter(x => x > h); }
  halted(t = this.now().getTime()) { return this.s.haltedUntil && t < this.s.haltedUntil; }
  halt(reason, t = this.now().getTime()) { this.s.haltedUntil = t + LIMITS.haltMs; this.s.haltReason = String(reason).slice(0, 200); this.save(); }

  takeRead(label = 'read') {
    const t = this.now().getTime(); this._trim(t);
    if (this.halted(t)) return { ok: false, reason: 'halted' };
    if (this.s.reads.length >= LIMITS.readPerHour) return { ok: false, reason: 'read-limit' };
    this.s.reads.push(t); this.save(); return { ok: true, label };
  }

  enqueue(op) {
    if (!ALLOWED_KINDS.has(op.kind)) return { ok: false, reason: `허용되지 않은 작업(${op.kind}) — 병합 · 승인은 사람만 합니다` };
    const bad = (op.files || []).find(f => FORBIDDEN_FILE.some(r => r.test(f)));
    if (bad) return { ok: false, reason: `금지 경로 변경(${bad}) — 워크플로 · CODEOWNERS는 가디언이 수정하지 않습니다` };
    const item = { id: ++this.s.seq, ...op, at: this.now().toISOString(), status: 'pending' };
    this.s.pending.push(item); this.save(); return { ok: true, id: item.id };
  }

  /* 다음 1건이 지금 보내질 수 있는지 */
  canWrite(kind) {
    const t = this.now().getTime(); this._trim(t);
    if (this.halted(t)) return { ok: false, reason: 'halted', until: new Date(this.s.haltedUntil).toISOString() };
    if (this.s.writes.length >= LIMITS.writePerHour) return { ok: false, reason: 'write-limit' };
    if (this.s.lastWriteAt && t - this.s.lastWriteAt < LIMITS.minGapMs) return { ok: false, reason: 'gap', waitMs: LIMITS.minGapMs - (t - this.s.lastWriteAt) };
    if (kind === 'pr' && (this.s.prs[kstDate(t)] || 0) >= LIMITS.autoPrPerDay) return { ok: false, reason: 'pr-daily-limit' };
    return { ok: true };
  }

  _req(op) {
    const repo = this.env.GITHUB_REPO;
    if (op.kind === 'issue') return ['POST', `/repos/${repo}/issues`, { title: op.title, body: op.body, labels: op.labels || ['security'] }];
    if (op.kind === 'comment') return ['POST', `/repos/${repo}/issues/${op.number}/comments`, { body: op.body }];
    if (op.kind === 'label') return ['POST', `/repos/${repo}/issues/${op.number}/labels`, { labels: op.labels }];
    return ['POST', `/repos/${repo}/pulls`, { title: op.title, head: op.head, base: op.base || 'main', body: op.body, draft: true }];
  }

  /* 한 번에 최대 1건 처리(간격 규칙 때문에). 반환: 처리 결과 또는 대기 사유 */
  async drainOne() {
    const op = this.s.pending[0]; if (!op) return { status: 'empty' };
    const gate = this.canWrite(op.kind); if (!gate.ok) return { status: 'wait', ...gate };
    const [method, p, body] = this._req(op); const t = this.now().getTime();
    let res;
    if (this.mode === 'dry') res = { status: 'dry', request: { method, path: p, body } };
    else {
      try {
        const r = await this.fetch('https://api.github.com' + p, { method, headers: { authorization: 'Bearer ' + this.env.GITHUB_TOKEN, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'didisam-guardian/0.1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
        if (r.status === 403 || r.status === 429) { this.halt(`GitHub ${r.status}`, t); return { status: 'halted', code: r.status }; }
        res = { status: r.ok ? 'sent' : 'failed', code: r.status };
      } catch (e) { res = { status: 'failed', error: String(e.message).slice(0, 120) }; }
    }
    this.s.pending.shift(); this.s.writes.push(t); this.s.lastWriteAt = t;
    if (op.kind === 'pr' && res.status !== 'failed') this.s.prs[kstDate(t)] = (this.s.prs[kstDate(t)] || 0) + 1;
    this.s.done.push({ id: op.id, kind: op.kind, title: op.title, ...res, at: new Date(t).toISOString() }); this.s.done = this.s.done.slice(-200);
    this.save(); return res;
  }
}
module.exports = { GitHubQueue, LIMITS, FORBIDDEN_FILE };
