'use strict';
/* v30 학사 LMS 묶음 M — 사용자 관리 · 사용자 전환 · 접속 로그/통계 · 로그 검색 · 팝업/배너 · 시스템 모니터링. 업무 규칙: sql/75_m.sql lms_m() */
const os = require('node:os'); const fs = require('node:fs');
const { build } = require('./lmp-core');
/* 프로세스 · 서버 지표(앱 계층) — 임계치 판정 · 저장은 SQL */
function metrics() {
  let load = [0, 0, 0]; try { load = fs.readFileSync('/proc/loadavg', 'utf8').trim().split(/\s+/).slice(0, 3).map(Number); } catch { load = os.loadavg(); }
  let disk = { total: 0, free: 0 }; try { const s = fs.statfsSync('/'); disk = { total: s.blocks * s.bsize, free: s.bavail * s.bsize }; } catch { }
  const mu = process.memoryUsage(); const v8 = require('node:v8').getHeapStatistics();
  return { load1: load[0], load5: load[1], load15: load[2], cpus: os.cpus().length, mem_total: os.totalmem(), mem_free: os.freemem(), heap_used: mu.heapUsed, heap_max: v8.heap_size_limit, disk_total: disk.total, disk_free: disk.free, uptime: Math.round(process.uptime()), runtime: 'node' };
}
const ROUTES = [
  ['POST', 'access.hit'],
  ['GET', 'users.list'], ['GET', 'users.get'], ['POST', 'users.save'], ['POST', 'users.control'],
  ['POST', 'imp.start'], ['GET', 'imp.current'], ['POST', 'imp.end'],
  ['GET', 'stats'], ['GET', 'logs'],
  ['GET', 'popup.list'], ['POST', 'popup.save'], ['POST', 'popup.del'], ['GET', 'popup.preview'],
  ['GET', 'mon.th'], ['POST', 'mon.th_save'], ['POST', 'mon.sample', { pre: (req, q) => { q.metrics = metrics(); } }], ['GET', 'mon.history']
];
module.exports = ctx => build(ctx, 'm', 'lms_m', ROUTES);
module.exports.ROUTES = ROUTES;
module.exports.metrics = metrics;
