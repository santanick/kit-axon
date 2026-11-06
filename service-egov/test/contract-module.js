'use strict';
/* Node와 Java의 모듈 분리 결과 대조. 사용: node contract-module.js <Node 포트 시작> <Java 포트 시작>
   포트 순서: all, admin, tutor, learner, blocked */
const { scenario } = require('../../service/test/module-scenario');
const urls = s => Object.fromEntries(['all', 'admin', 'tutor', 'learner', 'blocked'].map((k, i) => [k, `http://127.0.0.1:${+s + i}`]));
(async () => { const [a, b] = [await scenario(urls(process.argv[2])), await scenario(urls(process.argv[3]))]; let fail = 0, pass = 0; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); if (x === y) pass++; else { fail++; console.log('다름', k, '\n node', x, '\n java', y); } } console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0); })().catch(e => { console.error(e); process.exit(2); });
