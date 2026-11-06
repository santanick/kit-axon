'use strict';
const path = require('node:path');
const { poolFrom, migrate, inTenant } = require('./db');
const { createStateCrypto } = require('./statecrypt');
const { piiKeys } = require('./pii');
const { createApp } = require('./app');

(async () => {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL이 필요합니다.'); process.exit(1); }
  const pool = poolFrom(process.env);
  await migrate(pool);
  { const K = piiKeys(process.env); if (K) { const n = await createStateCrypto(K, class extends Error { constructor(s, m, c) { super(m); this.code = c; } }).sealAll(pool, inTenant); if (n) console.log(JSON.stringify({ severity: 'INFO', message: `기관 문서 개인정보 암호화 전환: ${n}개` })); } }
  const tick = () => { pool.query('delete from sessions where expires_at < now()').catch(() => {}); pool.query('delete from learner_sessions where expires_at < now()').catch(() => {}); app.piiPurge().catch(() => {}); };
  const app = createApp({ pool, publicDir: process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public') });
  setInterval(tick, 3600e3).unref();
  if (!process.env.PII_KEY) console.error(JSON.stringify({ severity: 'WARNING', message: 'PII_KEY 미설정 — 학습자 간편가입 · 로그인(이메일 · SNS · 학번)이 503으로 거부됩니다.' }));
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => console.log(JSON.stringify({ severity: 'INFO', message: `didisam studio listening on ${port}` })));
  const stop = () => app.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
})().catch(e => { console.error(e); process.exit(1); });
