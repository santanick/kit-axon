'use strict';
const path = require('node:path');
const { poolFrom, migrate } = require('./db');
const { createApp } = require('./app');

(async () => {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL이 필요합니다.'); process.exit(1); }
  const pool = poolFrom(process.env);
  await migrate(pool);
  setInterval(() => { pool.query('delete from sessions where expires_at < now()').catch(() => {}); pool.query('delete from learner_sessions where expires_at < now()').catch(() => {}); }, 3600e3).unref();
  const app = createApp({ pool, publicDir: process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public') });
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => console.log(JSON.stringify({ severity: 'INFO', message: `didisam studio listening on ${port}` })));
  const stop = () => app.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
})().catch(e => { console.error(e); process.exit(1); });
