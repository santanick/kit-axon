'use strict';
/* v30 묶음 A 학사 LMS(강좌 · 분반) API 테스트 — 앱을 띄우고 service-egov/test/lms-a.js 시나리오(Node 단독 기대값 150여 항목)를 그대로 돌린다.
   DATABASE_URL=postgres://… node --test service/test/lms-a.test.js */
const test = require('node:test'); const assert = require('node:assert/strict'); const path = require('node:path'); const { execFile } = require('node:child_process');
const { poolFrom, migrate } = require('../server/db'); const { createApp } = require('../server/app');
const { parseCsv, itemHash, syncClasses } = require('../server/lms/mod-a.js');

test('학사 LMS 묶음 A', async t => {
  await t.test('CSV 파서: 따옴표 · 줄바꿈 · BOM · 빈 행', () => {
    assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\n\n,\n"멀티\n줄",2'), [['a', 'b'], ['x, y', 'he said "hi"'], ['멀티\n줄', '2']]);
  });
  await t.test('동기화: 복제 → 분반 수정분 제외 → 원본 수정 반영', () => {
    const src = { curriculum: [{ id: 'a', type: 'video', title: '1' }, { id: 'b', type: 'quiz', title: '2' }], notices: [] }; const dst = { id: 'k' }; const h = new Map();
    assert.equal(syncClasses(src, [{ dst: 'd', no: '02', cls: dst }], h).n.copied, 2);
    dst.curriculum[0].title = '분반 수정'; src.curriculum[1].title = '원본 수정';
    const r = syncClasses(src, [{ dst: 'd', no: '02', cls: dst }], h).n; assert.equal(r.excluded, 1); assert.equal(r.updated, 1);
    assert.equal(dst.curriculum[0].title, '분반 수정'); assert.equal(dst.curriculum[1].title, '원본 수정'); assert.equal(itemHash({ id: 1, x: 1, syncSrc: 'q' }), itemHash({ x: 1 }));
  });
  const pool = poolFrom(process.env); await migrate(pool);
  const app = createApp({ pool, env: { COOKIE_SECURE: '0', SIGNUP: 'on' }, log: {} });
  await new Promise(ok => app.listen(0, ok)); const U = `http://127.0.0.1:${app.address().port}`;
  await t.test('API 시나리오(권한 · 범위 · CSV · 동기화 · 합반 · 신청 · 학습자)', async () => {
    const out = await new Promise(ok => execFile(process.execPath, [path.join(__dirname, '../../service-egov/test/lms-a.js'), U], { env: process.env, timeout: 120000 }, (e, so, se) => ok({ code: e ? e.code : 0, text: so + se })));
    assert.equal(out.code, 0, out.text.slice(-3000)); assert.match(out.text, /실패 0/);
  });
  await new Promise(ok => app.close(ok)); await pool.end();
});
