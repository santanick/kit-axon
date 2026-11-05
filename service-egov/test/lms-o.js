'use strict';
/* 묶음 O(AI) 대조 테스트 — Node(8251)와 Java(8252)에 같은 시나리오를 보내 상태코드 · 본문(변동값 가림)이 같은지 확인한다.
   사용: . s2env.sh; DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddw6 node service-egov/test/lms-o.js http://127.0.0.1:8251 http://127.0.0.1:8252
   두 번째 주소를 빼면 Node만 기능 확인. 모의 LLM(8099)이 비어 있으면 이 파일이 lms-o-mock.js로 띄운다(이미 다른 모의 서버가 있으면 그대로 쓰고 내용 검사는 줄인다). */
const zlib = require('node:zlib');
const path = require('node:path');
const { Client } = require(path.join(__dirname, '../../service/server/node_modules/pg'));
const mockLib = require('./lms-o-mock');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8251', process.argv[3] || ''];
const DBURL = process.env.DATABASE_URL || 'postgres://didisam@127.0.0.1:5544/ddw6';
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };

async function call(base, method, p, { body, cookie } = {}) {
  const h = {}; if (method !== 'GET') h['x-didisam'] = '1'; if (cookie) h.cookie = cookie; if (body !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { j = t.slice(0, 200); }
  const sc = r.headers.get('set-cookie'); return { st: r.status, j, ck: sc ? sc.split(';')[0] : null };
}
/* 최소 zip 작성(deflate + crc32) */
function zip(files) {
  const loc = [], cen = []; let off = 0;
  for (const [name, txt] of Object.entries(files)) {
    const raw = Buffer.from(txt, 'utf8'); const comp = zlib.deflateRawSync(raw); const crc = zlib.crc32(raw); const nb = Buffer.from(name, 'utf8');
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    loc.push(lh, nb, comp); cen.push(ch, nb); off += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(cen); const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(cen.length / 2, 8); e.writeUInt16LE(cen.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...loc, cd, e]);
}
const DOCX = zip({ '[Content_Types].xml': '<Types/>', 'word/document.xml': '<?xml version="1.0"?><w:document><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>1장 데이터베이스 정규화</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">정규화는 중복을 줄이고 </w:t></w:r><w:r><w:t>이상 현상을 막습니다 &amp; 무결성을 높입니다.</w:t></w:r></w:p><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>제1정규형: 원자값</w:t></w:r></w:p><w:p/></w:body></w:document>' });
const XLSX = zip({ 'xl/sharedStrings.xml': '<sst><si><t>학번</t></si><si><t>점수</t></si><si><r><t>중간</t></r><r><t>고사</t></r></si></sst>', 'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2"><v>20261234</v></c><c r="B2"><v>88.5</v></c><c r="C2" t="inlineStr"><is><t>우수 &lt;A&gt;</t></is></c></row><row r="3"><c r="A3" t="s"><v>2</v></c><c r="B3"/></row></sheetData></worksheet>' });
const SRT = '1\n00:00:05,000 --> 00:00:09,000\n정규화의 목적은 데이터 중복 제거입니다.\n\n2\n00:01:10,000 --> 00:01:15,000\n함수 종속성을 분석하고 비교합니다.\n\n3\n00:05:00,000 --> 00:05:04,000\n다음 시간에는 트랜잭션을 다룹니다.\n';
const MD = '# 강의 안내\n\n이 강의는 **데이터베이스** 기초를 다룹니다.\n여러 줄은 한 문단입니다.\n\n- 과제 제출은 금요일까지\n- 지각 기준 10분\n\n## 평가\n\n중간 40%, 기말 40%, 과제 20%\n';
const HTML = '<html><head><style>p{}</style><script>alert(1)</script></head><body><h1>공지 &amp; 일정</h1><p>시험은 <b>10월 20일</b>입니다.&nbsp;장소는 공학관.</p><ul><li>계산기 지참</li><li>신분증</li></ul><!-- 주석 --></body></html>';
const CSV = '주차,주제,비고\n1,"정규화, 개요",\n2,"트랜잭션 ""ACID""",시험\n';

async function seed(tid) {
  const c = new Client({ connectionString: DBURL }); await c.connect();
  try {
    await c.query('begin'); await c.query("select set_config('app.tenant', $1, true)", [tid]);
    await c.query("insert into lms_term (tenant_id, term_id, name, starts_on, ends_on, is_operating) values ($1, '2026-2', '2026학년도 2학기', '2026-09-01', '2026-12-20', true)", [tid]);
    await c.query("insert into lms_course (tenant_id, course_code, name, credits, category) values ($1, 'CSE3001', '데이터베이스', 3, 'major')", [tid]);
    const s1 = (await c.query("insert into lms_section (tenant_id, term_id, course_code, section_no, title) values ($1, '2026-2', 'CSE3001', '01', '데이터베이스 01분반') returning section_id", [tid])).rows[0].section_id;
    const s2 = (await c.query("insert into lms_section (tenant_id, term_id, course_code, section_no, title) values ($1, '2026-2', 'CSE3001', '02', '데이터베이스 02분반') returning section_id", [tid])).rows[0].section_id;
    const p = []; for (const [no, kind] of [['20261234', 'student'], ['20261235', 'student'], ['P2026001', 'professor']]) p.push((await c.query("insert into lms_person (tenant_id, member_no, kind, unit_code) values ($1, $2, $3, 'CSE') returning person_id", [tid, no, kind])).rows[0].person_id);
    for (const pid of [p[0], p[1]]) await c.query('insert into lms_enrollment (tenant_id, section_id, person_id) values ($1, $2, $3)', [tid, s1, pid]);
    await c.query("insert into lms_section_staff (tenant_id, section_id, person_id, role) values ($1, $2, $3, 'professor')", [tid, s1, p[2]]);
    const ses = []; for (let w = 1; w <= 4; w++) ses.push((await c.query('insert into lms_session (tenant_id, section_id, week_no) values ($1, $2, $3) returning session_id', [tid, s1, w])).rows[0].session_id);
    const att = [['present', 'present', 'present', 'late'], ['present', 'absent', 'absent', 'present']];
    for (let i = 0; i < 2; i++) for (let w = 0; w < 4; w++) await c.query("insert into lms_attendance (tenant_id, session_id, person_id, status, method) values ($1, $2, $3, $4, 'manual')", [tid, ses[w], p[i], att[i][w]]);
    const it = (await c.query("insert into lms_grade_item (tenant_id, section_id, category, name, weight_pct, max_score) values ($1, $2, 'midterm', '중간고사', 40, 50) returning item_id", [tid, s1])).rows[0].item_id;
    await c.query('insert into lms_grade_score (tenant_id, item_id, person_id, score) values ($1, $2, $3, 45), ($1, $2, $4, 25)', [tid, it, p[0], p[1]]);
    await c.query('commit'); return { s1, s2 };
  } finally { await c.end(); }
}

async function scenario(base, tag, mine) {
  const R = {}; const em = `lo_${tag}_${Date.now()}@example.com`;
  const su = await call(base, 'POST', '/api/signup', { body: { email: em, password: 'LmsO2026pass', orgName: '시범 국립대학교', type: 'univ' } });
  const ck = su.ck; const me = await call(base, 'GET', '/api/me', { cookie: ck }); const tid = me.j.tenant.tid;
  const { s1, s2 } = await seed(tid);
  const G = (k, p) => call(base, 'GET', p, { cookie: ck }).then(r => (R[k] = r));
  const P = (k, m, p, b) => call(base, m, p, { cookie: ck, body: b }).then(r => (R[k] = r));
  await G('noauth', '/api/lms/o/llm/providers').then(() => call(base, 'GET', '/api/lms/o/llm/providers').then(r => (R.noauth = r)));
  await G('prov', '/api/lms/o/llm/providers');
  await G('quota0', '/api/lms/o/llm/quota');
  await P('quotaBad', 'PUT', '/api/lms/o/llm/quota', { limit_tokens: -1 });
  await P('srcFile', 'POST', '/api/lms/o/rag/source', { name: '강의자료실', kind: 'file', section_id: s1 });
  await P('srcUrl', 'POST', '/api/lms/o/rag/source', { name: '학과 홈페이지', kind: 'url', url: 'https://cse.example.ac.kr' });
  await P('srcBad', 'POST', '/api/lms/o/rag/source', { name: 'x', kind: 'ftp' });
  const src = R.srcFile.j.source.source_id;
  const up = (k, name, data, extra = {}) => P(k, 'POST', '/api/lms/o/rag/upload', { name, b64: Buffer.from(data).toString('base64'), source_id: src, section_id: s1, ...extra });
  await up('upTxt', '정규화.txt', '정규화는 데이터 중복을 줄이는 설계 기법입니다.\n제1정규형은 원자값을 요구합니다.\n\n제2정규형은 부분 함수 종속을 제거합니다. 시험 범위는 3장까지입니다.');
  await up('upMd', '안내.md', MD); await up('upCsv', '일정.csv', CSV); await up('upHtml', '공지.html', HTML);
  await up('upDocx', '교안.docx', DOCX); await up('upXlsx', '성적.xlsx', XLSX); await up('upSrt', '1주차.srt', SRT);
  await up('upAll', '전체공지.txt', '휴강 공지: 개천절은 휴강입니다.', { section_id: null, source_id: null });
  await up('upBadExt', '파일.pdf', 'x'); await up('upBroken', '깨짐.docx', 'not a zip'); await up('upEmpty', '빈.txt', '\n\n  \n');
  for (const k of ['upTxt', 'upMd', 'upCsv', 'upHtml', 'upDocx', 'upXlsx', 'upSrt']) await G(k + 'Get', '/api/lms/o/rag/doc?id=' + R[k].j.doc.doc_id);
  await G('docs', '/api/lms/o/rag/docs?source_id=' + src);
  await G('docBad', '/api/lms/o/rag/doc?id=xyz');
  await G('srcList', '/api/lms/o/rag/sources');
  await P('search', 'POST', '/api/lms/o/rag/search', { q: '제2정규형 부분 함수 종속', top_k: 3 });
  await P('searchMember', 'POST', '/api/lms/o/rag/search', { q: '휴강 공지', member_no: '20261234', top_k: 5 });
  await P('searchScope', 'POST', '/api/lms/o/rag/search', { q: '정규화', member_no: '20261234', section_id: s2 });
  await G('scope', '/api/lms/o/my/scope?member_no=20261234');
  await G('scopeNo', '/api/lms/o/my/scope?member_no=99999999');
  await P('thrBad', 'POST', '/api/lms/o/qa/thread', { temperature: 3 });
  await P('thr', 'POST', '/api/lms/o/qa/thread', { title: '정규화 질문', section_id: s1, member_no: '20261234', temperature: 0.25, top_k: 3 });
  const th = R.thr.j.thread.thread_id;
  await P('ask1', 'POST', '/api/lms/o/qa/ask', { thread_id: th, q: '제2정규형은 무엇을 제거하나요?' });
  await P('faqAdd', 'POST', '/api/lms/o/qa/faq', { q: '과제 제출 마감은 언제인가요?', a: '과제는 금요일까지 제출합니다.', section_id: s1, tags: '과제' });
  await P('ask2', 'POST', '/api/lms/o/qa/ask', { thread_id: th, q: '과제 제출 마감은 언제인가요?' });
  await P('askEmpty', 'POST', '/api/lms/o/qa/ask', { thread_id: th, q: '  ' });
  await P('msgEdit', 'PUT', '/api/lms/o/qa/message', { thread_id: th, seq: 2, content: '수정한 답변입니다 [1].' });
  await P('share', 'PUT', '/api/lms/o/qa/thread', { thread_id: th, shared: true, title: '정규화 Q&A', top_k: 4 });
  await G('byShare', '/api/lms/o/qa/thread?share=' + R.share.j.thread.share_token);
  await G('thrGet', '/api/lms/o/qa/thread?id=' + th);
  await P('thr2', 'POST', '/api/lms/o/qa/thread', {});
  await P('thrDel', 'DELETE', '/api/lms/o/qa/thread?id=' + R.thr2.j.thread.thread_id);
  await G('thrList', '/api/lms/o/qa/threads');
  await G('faqList', '/api/lms/o/qa/faq?section_id=' + s1);
  await P('sum', 'POST', '/api/lms/o/gen/summary', { doc_id: R.upTxt.j.doc.doc_id, section_id: s1 });
  await P('tr', 'POST', '/api/lms/o/gen/translate', { doc_id: R.upDocx.j.doc.doc_id, lang: 'en', section_id: s1 });
  await P('quiz', 'POST', '/api/lms/o/gen/quiz', { doc_id: R.upSrt.j.doc.doc_id, seg_start: 0, seg_end: 120, difficulty: 'hard', langs: ['ko', 'en', 'ja'], count: 3, section_id: s1 });
  await P('quizBad', 'POST', '/api/lms/o/gen/quiz', { text: 'x', langs: ['ko', 'xx'] });
  await P('quizSeg', 'POST', '/api/lms/o/gen/quiz', { doc_id: R.upSrt.j.doc.doc_id, seg_start: 600, seg_end: 700 });
  await P('rub', 'POST', '/api/lms/o/gen/rubric', { task: 'ERD를 설계하고 3정규형으로 정규화한 보고서', criteria_n: 3, scale: 4, section_id: s1 });
  await P('cls', 'POST', '/api/lms/o/gen/classify', { items: ['정규화란?', '다음 스키마의 함수 종속을 분석하고 BCNF로 분해하는 과정을 증명하시오. 릴레이션 R(A,B,C,D)에서 1, 2, 3단계를 비교하시오.'] });
  const sg = R.sum.j.gen.gen_id;
  await P('pubEarly', 'POST', '/api/lms/o/gen/review', { gen_id: sg, action: 'publish' });
  await P('genEdit', 'PUT', '/api/lms/o/gen/item', { gen_id: sg, output: { text: '- 교수자가 다듬은 요약' } });
  await P('approve', 'POST', '/api/lms/o/gen/review', { gen_id: sg, action: 'approve', note: '확인' });
  await P('publish', 'POST', '/api/lms/o/gen/review', { gen_id: sg, action: 'publish' });
  await P('reject', 'POST', '/api/lms/o/gen/review', { gen_id: R.tr.j.gen.gen_id, action: 'reject', note: '용어 수정 필요' });
  await G('genPub', '/api/lms/o/gen/list?status=published');
  await G('genList', '/api/lms/o/gen/list?section_id=' + s1);
  await G('genItem', '/api/lms/o/gen/item?id=' + R.quiz.j.gen.gen_id);
  await P('disc', 'POST', '/api/lms/o/an/discussion', { section_id: s1, title: '정규화 토론', posts: [{ member_no: '20261234', text: '정규화는 중복을 줄입니다. 정규화 단계가 중요합니다.' }, { member_no: '20261235', text: '반정규화도 성능에 필요합니다.' }, { member_no: '20261234', text: '트랜잭션과 정규화의 관계는?' }] });
  await G('act', '/api/lms/o/an/activity?section_id=' + s1);
  await G('actNo', '/api/lms/o/an/activity?section_id=00000000-0000-0000-0000-000000000000');
  await P('ed', 'POST', '/api/lms/o/editor', { action: 'proofread', text: '정규화 는 중요 합니다' });
  await P('edTr', 'POST', '/api/lms/o/editor', { action: 'translate', lang: 'ja', text: '정규화는 중요합니다.' });
  await P('edBad', 'POST', '/api/lms/o/editor', { action: 'hack', text: 'x' });
  await P('ev', 'POST', '/api/lms/o/eval', { section_id: s1, member_no: '20261234', answer: '3정규형까지 분해했습니다.', max_score: 50, rubric_gen_id: R.rub.j.gen.gen_id });
  await P('evConf', 'POST', '/api/lms/o/eval/confirm', { eval_id: R.ev.j.eval.eval_id, score: 40 });
  await G('evList', '/api/lms/o/eval/list?section_id=' + s1);
  await P('room', 'POST', '/api/lms/o/caption/room', { title: '데이터베이스 3주차', section_id: s1, langs: ['ko', 'en', 'vi'] });
  const rm = R.room.j.room.room_id;
  await P('line1', 'POST', '/api/lms/o/caption/line', { room_id: rm, text: '오늘은 정규화를 배웁니다' });
  await P('line2', 'POST', '/api/lms/o/caption/line', { room_id: rm, text: '함수 종송성', source: 'stt' });
  await P('lineEd', 'PUT', '/api/lms/o/caption/line', { room_id: rm, seq: 2, text: '함수 종속성', tr: { en: 'Functional dependency' } });
  await G('lines', `/api/lms/o/caption/lines?room_id=${rm}&since=0`);
  R.view = await call(base, 'GET', `/api/lms/o/caption/view?code=${R.room.j.room.code}&lang=en`);
  R.viewBad = await call(base, 'GET', '/api/lms/o/caption/view?code=bad');
  await P('roomClose', 'PUT', '/api/lms/o/caption/room', { room_id: rm, status: 'closed' });
  await P('lineClosed', 'POST', '/api/lms/o/caption/line', { room_id: rm, text: 'x' });
  await G('rooms', '/api/lms/o/caption/rooms');
  await P('provAdd', 'POST', '/api/lms/o/llm/provider', { kind: 'openai_compat', name: '학내 LLM', endpoint_url: 'https://llm.univ.example/v1/chat/completions', model: 'qwen2.5-72b' });
  await P('provBad', 'POST', '/api/lms/o/llm/provider', { kind: 'openai_compat', name: 'x', endpoint_url: 'ftp://x', model: 'm' });
  await P('route', 'POST', '/api/lms/o/llm/route', { feature: 'editor', provider_id: R.provAdd.j.provider.provider_id });
  await P('edSelf', 'POST', '/api/lms/o/editor', { action: 'format', text: '자체 LLM 테스트' });
  await P('routeBack', 'POST', '/api/lms/o/llm/route', { feature: 'editor', provider_id: null });
  await P('embed', 'PUT', '/api/lms/o/llm/embed', { kind: 'endpoint', endpoint: 'https://embed.univ.example/v1' });
  await G('prov2', '/api/lms/o/llm/providers');
  await G('metrics', '/api/lms/o/llm/metrics?days=7');
  await P('quotaSet', 'PUT', '/api/lms/o/llm/quota', { limit_tokens: 300, alert_pct: 50, hard_block: true });
  R.q1 = await G('quota1', '/api/lms/o/llm/quota');
  await P('srcOff', 'PUT', '/api/lms/o/rag/source', { source_id: src, enabled: false });
  await P('searchOff', 'POST', '/api/lms/o/rag/search', { q: '제2정규형 부분 함수 종속', top_k: 3 });
  await P('docDel', 'DELETE', '/api/lms/o/rag/doc?id=' + R.upCsv.j.doc.doc_id);
  await P('faqDel', 'DELETE', '/api/lms/o/qa/faq?id=' + R.faqAdd.j.faq.faq_id);
  await P('quotaLow', 'PUT', '/api/lms/o/llm/quota', { limit_tokens: 1, alert_pct: 50 });
  await P('edOver', 'POST', '/api/lms/o/editor', { action: 'proofread', text: '한도 초과 확인' });
  await G('quota2', '/api/lms/o/llm/quota');
  void mine; return R;
}

const VOL = new Set(['avg_ms', 'p95_ms', 'share_token', 'code', 'owner', 'created_by', 'reviewer', 'confirmed_by', 'day', 'month', 'scope']);
function norm(v, k) {
  if (k && VOL.has(k)) return v == null ? v : '<v>';
  if (typeof v === 'string') { if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(v)) return '<uuid>'; if (/^\d{4}-\d{2}-\d{2}T\d{2}:/.test(v)) return '<ts>'; if (/^tn_/.test(v)) return '<tid>'; return v; }
  if (Array.isArray(v)) return v.map(x => norm(x));
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(x => [x, norm(v[x], x)]));
  return v;
}
(async () => {
  let mock = null; try { mock = await mockLib.start(Number(process.env.MOCK_AI_PORT || 8099)); } catch (e) { }
  const mine = !!mock || await fetch('http://127.0.0.1:8099/v1/messages', { method: 'POST', body: JSON.stringify({ system: '[출력:eval]', messages: [{ role: 'user', content: 'x' }] }) }).then(r => r.json()).then(j => /"score":72.46/.test(j.content[0].text)).catch(() => false);
  const RA = await scenario(A, 'n', mine);
  /* ── 기능 확인(Node) ── */
  const X = RA;
  ok(X.noauth.st === 401, '로그인 없으면 401');
  ok(X.prov.st === 200 && X.prov.j.providers.length === 1 && X.prov.j.providers[0].kind === 'anthropic' && X.prov.j.embed.dim === 256, '기본 제공자(상용) 자동 등록 · 임베딩 256');
  ok(X.quotaBad.st === 400 && X.srcBad.st === 400, '할당량 · 소스 종류 검증');
  ok(X.srcUrl.j.source.state === 'pending', 'URL 소스는 연동 후 동작(pending)');
  ok(X.upTxtGet.j.doc.paras.length === 2, 'txt 문단 2개');
  const md = X.upMdGet.j.doc.paras; ok(md[0].t === 'h' && md[1].t === 'p' && md[1].x.includes('데이터베이스 기초') && !md[1].x.includes('**') && md.filter(p => p.t === 'li').length === 2, 'md 제목 · 문단 · 목록 구조 유지');
  ok(X.upCsvGet.j.doc.paras[1].x === '1 | 정규화, 개요' && X.upCsvGet.j.doc.paras[2].x === '2 | 트랜잭션 "ACID" | 시험', 'csv 따옴표 셀');
  const ht = X.upHtmlGet.j.doc.paras; ok(ht[0].t === 'h' && ht[0].x === '공지 & 일정' && ht.some(p => p.x === '시험은 10월 20일입니다. 장소는 공학관.') && ht.filter(p => p.t === 'li').length === 2 && !JSON.stringify(ht).includes('alert'), 'html 스크립트 제거 · 엔티티 · 구조');
  const dx = X.upDocxGet.j.doc.paras; ok(dx.length === 3 && dx[0].t === 'h' && dx[1].x === '정규화는 중복을 줄이고 이상 현상을 막습니다 & 무결성을 높입니다.' && dx[2].t === 'li', 'docx 추출(제목 · 목록 · 엔티티)');
  const xx = X.upXlsxGet.j.doc.paras; ok(xx[0].x === '시트 1' && xx[1].x === '학번 | 점수' && xx[2].x === '20261234 | 88.5 | 우수 <A>' && xx[3].x === '중간고사', 'xlsx 추출(공유 문자열 · 인라인)');
  ok(X.upBadExt.st === 400 && X.upBroken.st === 422 && X.upEmpty.st === 422, '형식 · 손상 · 빈 파일 거부');
  ok(X.search.st === 200 && X.search.j.hits[0] && X.search.j.hits[0].name === '정규화.txt' && X.search.j.hits[0].score > 0, '벡터 검색: 관련 문서 1순위');
  ok(X.searchMember.j.hits.some(h => h.name === '전체공지.txt'), '학번 범위: 기관 공통 자료 포함');
  ok(X.searchScope.st === 403, '수강하지 않는 분반 질문 차단');
  ok(X.scope.j.scope.sections.length === 1 && X.scopeNo.st === 404, '수강 범위 조회');
  ok(X.thrBad.st === 400 && X.ask1.st === 200 && X.ask1.j.answer.cites.length > 0 && X.ask1.j.ai && X.ask1.j.ai.usage.input_tokens === 11, 'Q&A: RAG 출처 · 사용량');
  ok(X.ask2.j.faq && X.ask2.j.ai === null && X.ask2.j.answer.content === '과제는 금요일까지 제출합니다.', 'FAQ 유사 질문 → FAQ 답(LLM 호출 없음)');
  ok(X.askEmpty.st === 400 && X.msgEdit.j.message.edited === true, '빈 질문 거부 · 메시지 편집');
  ok(X.share.j.thread.shared && X.byShare.st === 200 && X.byShare.j.messages.length === 4 && X.thrGet.j.thread.top_k === 4 && X.thrGet.j.thread.temperature === 0.3, '공유 · 불러오기 · 파라미터 변경');
  ok(X.thrDel.st === 200 && X.thrList.j.threads.length === 1, '스레드 삭제 · 목록');
  ok(X.sum.j.gen.status === 'review' && X.pubEarly.st === 409 && X.approve.j.gen.status === 'approved' && X.publish.j.gen.status === 'published' && X.genPub.j.items.length === 1 && X.reject.j.gen.status === 'rejected', '요약 · 번역: 검토 → 승인 → 배포 흐름');
  if (mine) {
    ok(X.tr.j.gen.output.complete && X.tr.j.gen.output.paras[0].dst === '[EN] 1장 데이터베이스 정규화' && X.tr.j.gen.output.paras[0].t === 'h', '번역 뷰어: 문단 구조 · 번역 짝');
    const it = X.quiz.j.gen.output.items; ok(it.length === 3 && it[0].tr.en && it[0].tr.ja && !it[0].tr.ko && X.quiz.j.gen.params.seg_paras === 2, '퀴즈: 영상 구간(2문단) · 3개 언어');
    ok(X.rub.j.gen.output.criteria.length === 3 && X.rub.j.gen.output.criteria[0].levels.length === 4, '루브릭 생성');
    ok(X.ev.j.eval.ai_score === 50 || X.ev.j.eval.ai_score === 72.5 ? X.ev.j.eval.ai_score === 50 : false, 'AI 평가 점수 만점 내로 제한');
  }
  ok(X.quizBad.st === 400 && X.quizSeg.st === 422, '퀴즈 언어 · 빈 구간 검증');
  ok(X.cls.j.results[0].level === 'easy' && X.cls.j.results[1].level !== 'easy', '난이도 자동 분류');
  ok(X.disc.j.gen.output.stats.by_member[0].member_no === '20261234' && X.disc.j.gen.output.stats.keywords[0].word === '정규화' && X.disc.j.gen.output.stats.keywords[0].n === 3, '토론 요약 통계');
  const st = X.act.j.activity.students; ok(st.length === 2 && st[0].att_rate === 100 && st[0].avg_pct === 90 && st[1].risk === 'risk' && X.actNo.st === 404, '활동 분석(출석률 · 성적 · 위험)');
  ok(X.ed.st === 200 && X.edTr.j.lang === 'ja' && X.edBad.st === 400, '에디터 LLM 동작');
  ok(X.ev.j.eval.recorded === 'lms_only' && X.ev.j.eval.status === 'suggested' && X.evConf.j.eval.final_score === 40 && X.evList.j.evals.length === 1, 'AI 자동평가: LMS 기록만 · 교수 확정');
  ok(X.lineEd.j.line.edited && X.lines.j.lines.length === 2 && X.view.st === 200 && X.view.j.lines[1].tr === 'Functional dependency' && X.view.j.lines[0].tr === null && X.viewBad.st === 400, '실시간 자막: 스크립트 수정 · QR 화면 언어');
  ok(X.lineClosed.st === 409, '종료된 자막방 입력 거부');
  ok(X.provAdd.st === 200 && X.provBad.st === 400 && X.edSelf.st === 503 && X.edSelf.j.error === 'provider_pending', '자체 LLM 플러그인: 연동 지점(503)');
  ok(X.prov2.j.providers.length === 2 && X.prov2.j.embed.kind === 'endpoint' && X.prov2.j.embed.active === 'local-hash', '제공자 목록 · 임베딩 설정');
  ok(X.metrics.j.models.length >= 1 && X.metrics.j.rows.some(r => r.feature === 'qa' && r.calls >= 1 && r.tin >= 11), '모델별 응답시간 · 토큰 모니터링');
  ok(X.quota1.j.state === 'warn' && X.quota1.j.alerts.some(a => a.level === 'warn'), '할당량 경보(경고)');
  ok(!X.searchOff.j.hits.some(h => h.name === '정규화.txt'), 'RAG 소스 끄면 검색에서 빠짐(동적)');
  ok(X.docDel.st === 200 && X.faqDel.st === 200, '문서 · FAQ 삭제');
  ok(X.edOver.st === 429 && X.edOver.j.error === 'token_quota' && X.quota2.j.state === 'over', '할당량 초과 차단');
  let cmp = 0;
  if (B) {
    const RB = await scenario(B, 'j', mine);
    for (const k of Object.keys(RA)) {
      cmp++; const a = RA[k], b = RB[k];
      if (!b) { ok(false, `${k}: Java 결과 없음`); continue; }
      const na = JSON.stringify(norm(a.j)), nb = JSON.stringify(norm(b.j));
      ok(a.st === b.st && na === nb, `${k}: Node ${a.st} ${na.slice(0, 300)}\n   Java ${b.st} ${nb.slice(0, 300)}`);
    }
  }
  if (mock) mock.srv.close();
  console.log(`묶음 O ${B ? '대조' : '기능'} 테스트: 통과 ${pass} / 실패 ${fail}${B ? ` (대조 항목 ${cmp})` : ''}${mine ? '' : ' (모의 LLM 내용 검사 생략)'}`);
  for (const e of errs) console.log(' ✗ ' + e);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
