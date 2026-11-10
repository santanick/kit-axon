'use strict';
/* v37.4 학습 캘린더 '내 일정'(lp.cal) 서버 정리 규칙 점검 — Node(service/server/lpcal.js)와 Java(PubServiceImpl.cleanCal)가 같은 결과인지.
   사용: node tests/server/lpcal.js   (Java 대조: service-egov를 mvn compile 해 둔 뒤 LPCAL_CP=<jackson · spring 등 jar 경로> 를 주면 함께 돌린다) */
const path = require('node:path'); const fs = require('node:fs'); const os = require('node:os'); const { execFileSync } = require('node:child_process');
const { cleanCal, CAL_MAX, CAL_BYTES } = require('../../service/server/lpcal');
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const long = (n, ch = '가') => ch.repeat(n);
const many = Array.from({ length: 450 }, (_, i) => ({ id: 'm' + i, title: '일정 ' + i, date: '2026-11-' + String(1 + i % 28).padStart(2, '0'), at: '2026-11-10T00:00:00Z' }));
const big = Array.from({ length: 300 }, (_, i) => ({ id: 'b' + i, title: long(80), date: '2026-12-01', memo: long(300), at: '2026-11-10T00:00:00Z' }));
const F = {
  basic: [{ id: 'lc1', title: '스터디 모임', date: '2026-11-11', time: '19:00', end: '21:00', memo: '도서관', cls: 'c0', at: '2026-11-10T10:00:00Z' }],
  pii: [{ id: 'lc2', title: '상담', date: '2026-11-12', name: '홍길동', phone: '010-1234-5678', email: 'a@b.c', sid: '20261008', memo: 'x' }],
  bad: [{ id: 'bad id!', title: 'x', date: '2026-11-12' }, { id: 'ok1', title: '', date: '2026-11-12' }, { id: 'ok2', title: 't', date: '11/12' }, { id: 'ok3', title: 't', date: '2026-11-12', time: '25:00', end: '9:00', cls: '../x' }, null, 'str', [1], { id: 'ok4', title: '  <b>굵게</b>\u0001제목  ', date: '2026-11-13', time: '08:30' }],
  dup: [{ id: 'd1', title: '옛 제목', date: '2026-11-01', at: '2026-11-01T00:00:00Z' }, { id: 'd1', title: '새 제목', date: '2026-11-02', at: '2026-11-05T00:00:00Z' }, { id: 'd1', title: '더 옛', date: '2026-11-03', at: '2026-10-01T00:00:00Z' }],
  long: [{ id: 'l1', title: long(200), date: '2026-11-14', memo: long(900, 'a'), at: long(60, '9') }],
  many, big, notArray: { id: 'x' }, empty: []
};
const N = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, cleanCal(v)]));
ok(N.basic.length === 1 && JSON.stringify(N.basic[0]) === JSON.stringify({ id: 'lc1', title: '스터디 모임', date: '2026-11-11', time: '19:00', end: '21:00', memo: '도서관', cls: 'c0', at: '2026-11-10T10:00:00Z' }), '정상 항목 그대로(필드 8개)');
ok(N.pii.length === 1 && Object.keys(N.pii[0]).join() === 'id,title,date,time,end,memo,cls,at' && !/홍길동|010|@|20261008/.test(JSON.stringify(N.pii)), '그 밖의 키(이름 · 연락처 · 이메일 · 학번) 버림');
ok(N.bad.length === 2 && N.bad[0].id === 'ok3' && N.bad[0].time === '' && N.bad[0].end === '' && N.bad[0].cls === '' && N.bad[1].title === 'b굵게/b 제목'.replace('b굵게/b', 'b굵게/b'), '잘못된 id · 빈 제목 · 날짜 형식 · 시간 · 과정 id 거름, <> · 제어 문자 제거 — ' + JSON.stringify(N.bad.map(x => x.title)));
ok(N.dup.length === 1 && N.dup[0].title === '새 제목', '같은 id는 수정 시각이 늦은 것 하나');
ok(N.long[0].title.length === 80 && N.long[0].memo.length === 300 && N.long[0].at.length === 30, '제목 80 · 메모 300 · 수정 시각 30자');
ok(N.many.length === CAL_MAX, `최대 ${CAL_MAX}개`);
ok(Buffer.byteLength(JSON.stringify(N.big)) <= CAL_BYTES && N.big.length < 300, `크기 상한 ${CAL_BYTES / 1024}KB(긴 일정 ${N.big.length}개까지)`);
ok(N.notArray === null && Array.isArray(N.empty) && !N.empty.length, '배열이 아니면 버림');
const app = fs.readFileSync(path.join(__dirname, '../../service/server/app.js'), 'utf8'); ok(/cleanCal\(lp\.cal\)/.test(app) && /require\('\.\/lpcal'\)/.test(app), 'Node cleanLP가 cal을 정리해 저장');

/* Java 대조 */
const EG = path.join(__dirname, '../../service-egov'); const CLS = path.join(EG, 'target/classes');
if (process.env.LPCAL_CP && fs.existsSync(path.join(CLS, 'egovframework/didisam/pub/service/impl/PubServiceImpl.class'))) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lpcal-')); const pk = path.join(dir, 'egovframework/didisam/pub/service/impl'); fs.mkdirSync(pk, { recursive: true });
  fs.writeFileSync(path.join(dir, 'fx.json'), JSON.stringify(F));
  fs.writeFileSync(path.join(pk, 'CalParity.java'), `package egovframework.didisam.pub.service.impl;
import com.fasterxml.jackson.databind.*; import com.fasterxml.jackson.databind.node.*; import java.nio.file.*;
public class CalParity { public static void main(String[] a) throws Exception { JsonNode fx = new ObjectMapper().readTree(Files.readString(Path.of(a[0]))); ObjectNode out = new ObjectMapper().createObjectNode();
  fx.fieldNames().forEachRemaining(k -> { ArrayNode r = PubServiceImpl.cleanCal(fx.get(k)); out.set(k, r == null ? NullNode.getInstance() : r); });
  ObjectNode lp = new ObjectMapper().createObjectNode(); lp.set("cal", fx.get("basic")); out.set("_lp", PubServiceImpl.cleanLP(lp).get("cal"));
  new java.io.PrintStream(System.out, true, "UTF-8").print(egovframework.didisam.cmm.Js.stringify(out)); } }`);
  const cp = CLS + path.delimiter + process.env.LPCAL_CP;
  try { execFileSync('javac', ['-nowarn', '-cp', cp, '-d', dir, path.join(pk, 'CalParity.java')], { stdio: 'pipe' });
    const J = JSON.parse(execFileSync('java', ['-cp', dir + path.delimiter + cp, 'egovframework.didisam.pub.service.impl.CalParity', path.join(dir, 'fx.json')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    for (const k of Object.keys(F)) ok(JSON.stringify(J[k]) === JSON.stringify(N[k]), `Java = Node: ${k}${JSON.stringify(J[k]) === JSON.stringify(N[k]) ? '' : ' — ' + JSON.stringify(J[k]).slice(0, 200)}`);
    ok(JSON.stringify(J._lp) === JSON.stringify(N.basic), 'Java cleanLP가 cal을 정리해 저장');
  } catch (e) { ok(false, 'Java 대조 실행 — ' + String(e.stderr || e.message).slice(0, 400)); }
} else console.log('- Java 대조 건너뜀(service-egov mvn compile + LPCAL_CP 필요)');
console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과'); process.exit(fails ? 1 : 0);
