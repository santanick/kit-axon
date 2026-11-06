#!/usr/bin/env node
'use strict';
/* 무들(Moodle · 유비온 기반 포함) 백업 .mbz → 디디쌤 학사 LMS 이관 도구(SFR-008 · DAR-003 · DAR-004)
   - .mbz(tar.gz 또는 zip)를 풀어 moodle_backup.xml · course/course.xml · users.xml · roles.xml · course/enrolments.xml · course/roles.xml ·
     activities/forum_N/forum.xml · activities/assign_N/assign.xml · activities/resource_N/resource.xml · files.xml을 읽는다.
   - 사용자는 학번(idnumber, 없으면 숫자 username)만 넘긴다. 이름 · 이메일 · 연락처는 읽어도 버린다.
   - 결과 JSON을 POST /api/lms/p/mig/import 로 보내면 서버가 lms_* 표에 넣고 검증 리포트(원본 건수 · 이관 건수 · 제외 사유 · DB 재확인)를 돌려준다.
   사용:
     node moodle-mbz.js parse backup.mbz [out.json]
     node moodle-mbz.js post backup.mbz http://127.0.0.1:8241 'dd_sid=…' [term_id]
     node moodle-mbz.js sample out.mbz        # 시험용 가짜 백업(실존 인물 없음) */
const fs = require('node:fs'); const zlib = require('node:zlib'); const path = require('node:path');

/* ── 아카이브 ── */
function untar(buf) { const out = {}; let o = 0; let longName = null;
  while (o + 512 <= buf.length) { const h = buf.subarray(o, o + 512); if (h.every(b => b === 0)) break;
    let name = h.subarray(0, 100).toString('utf8').replace(/\0.*$/s, ''); const pre = h.subarray(345, 500).toString('utf8').replace(/\0.*$/s, ''); if (pre) name = pre + '/' + name;
    const size = parseInt(h.subarray(124, 136).toString('utf8').replace(/\0.*$/s, '').trim() || '0', 8); const type = String.fromCharCode(h[156] || 48);
    const data = buf.subarray(o + 512, o + 512 + size); o += 512 + Math.ceil(size / 512) * 512;
    if (type === 'L') { longName = data.toString('utf8').replace(/\0.*$/s, ''); continue; }
    if (longName) { name = longName; longName = null; }
    if (type === '0' || type === '\0') out[name.replace(/^\.\//, '')] = data; }
  return out; }
function unzip(buf) { const out = {}; let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--; if (e < 0) throw new Error('zip 끝 레코드 없음');
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16);
  for (let i = 0; i < n; i++) { const m = buf.readUInt16LE(p + 10), cs = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nl).toString('utf8'); p += 46 + nl + xl + cl;
    const ln = buf.readUInt16LE(lo + 26), lx = buf.readUInt16LE(lo + 28); const d = buf.subarray(lo + 30 + ln + lx, lo + 30 + ln + lx + cs);
    if (!name.endsWith('/')) out[name] = m === 8 ? zlib.inflateRawSync(d) : d; }
  return out; }
function openMbz(buf) { if (buf[0] === 0x50 && buf[1] === 0x4b) return unzip(buf); return untar(buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf); }

/* ── 작은 XML 파서(백업 XML용: 요소 · 속성 · 텍스트 · CDATA · 엔터티) ── */
const ent = s => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[e.toLowerCase()] || (e[1] === 'x' || e[1] === 'X' ? String.fromCodePoint(parseInt(e.slice(2), 16)) : String.fromCodePoint(+e.slice(1)))));
function parseXml(s) { const root = { name: '#root', attrs: {}, kids: [], text: '' }; const st = [root]; const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g; let m;
  while ((m = re.exec(s))) { const top = st[st.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2]) { if (st.length > 1) st.pop(); }
    else if (m[3]) { const n = { name: m[3], attrs: {}, kids: [], text: '' }; (m[4] || '').replace(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (_, k, __, a, b) => { n.attrs[k] = ent(a !== undefined ? a : b); }); top.kids.push(n); if (!m[5]) st.push(n); }
    else if (m[6]) top.text += ent(m[6]); }
  return root; }
const kid = (n, name) => n && n.kids.find(k => k.name === name);
const kids = (n, name) => n ? n.kids.filter(k => k.name === name) : [];
const txt = (n, name) => { const k = kid(n, name); return k ? k.text.trim() : ''; };
const all = (n, name, acc = []) => { if (!n) return acc; if (n.name === name) acc.push(n); n.kids.forEach(k => all(k, name, acc)); return acc; };

function toPayload(files, file = '') {
  const X = p => files[p] ? parseXml(files[p].toString('utf8')) : null;
  const cx = X('course/course.xml'); const c = cx && kid(cx, 'course'); if (!c) throw new Error('course/course.xml이 없습니다(무들 백업이 아닙니다).');
  const course = { id: c.attrs.id || '', shortname: txt(c, 'shortname'), fullname: txt(c, 'fullname'), idnumber: txt(c, 'idnumber'), summary: txt(c, 'summary').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000), startdate: txt(c, 'startdate') };
  const roleName = {}; all(X('roles.xml'), 'role').forEach(r => { roleName[r.attrs.id] = txt(r, 'shortname'); });
  const userRole = {}; all(X('course/roles.xml'), 'assignment').forEach(a => { const rn = roleName[txt(a, 'roleid')] || ''; const u = txt(a, 'userid'); if (!userRole[u] || rn === 'editingteacher') userRole[u] = rn; });
  const users = all(X('users.xml'), 'user').map(u => ({ id: u.attrs.id, idnumber: txt(u, 'idnumber'), username: /^\d{6,10}$/.test(txt(u, 'username')) ? txt(u, 'username') : '', role: userRole[u.attrs.id] || 'student' })); /* 이름 · 이메일은 넘기지 않음 */
  const enrolments = all(X('course/enrolments.xml'), 'enrolment').map(e => ({ userid: txt(e, 'userid'), role: userRole[txt(e, 'userid')] || 'student', status: txt(e, 'status') }))
    .concat(Object.entries(userRole).filter(([, r]) => /teacher/.test(r)).map(([u, r]) => ({ userid: u, role: r }))).filter((e, i, a) => a.findIndex(x => x.userid === e.userid && x.role === e.role) === i);
  const forums = []; const assignments = []; const resNames = {};
  Object.keys(files).filter(p => /^activities\/forum_\d+\/forum\.xml$/.test(p)).sort().forEach(p => { const a = X(p); const f = all(a, 'forum')[0]; if (!f) return;
    forums.push({ id: f.attrs.id, name: txt(f, 'name'), posts: all(f, 'post').map(po => ({ id: po.attrs.id, parent: txt(po, 'parent'), userid: txt(po, 'userid'), created: txt(po, 'created'), subject: txt(po, 'subject'), message: txt(po, 'message').slice(0, 20000) })) }); });
  Object.keys(files).filter(p => /^activities\/assign_\d+\/assign\.xml$/.test(p)).sort().forEach(p => { const a = all(X(p), 'assign')[0]; if (a) assignments.push({ id: a.attrs.id, name: txt(a, 'name'), intro: txt(a, 'intro').slice(0, 20000), duedate: txt(a, 'duedate'), grade: txt(a, 'grade') }); });
  Object.keys(files).filter(p => /^activities\/(resource|folder|url)_\d+\/\w+\.xml$/.test(p)).forEach(p => { const doc = X(p); const act = kid(doc, 'activity'); if (act && act.attrs.contextid) resNames[act.attrs.contextid] = txt(act.kids[0], 'name'); });
  const resources = all(X('files.xml'), 'file').filter(f => /^mod_(resource|folder)$/.test(txt(f, 'component')) && txt(f, 'filename') !== '.').map(f => ({ id: f.attrs.id, name: resNames[txt(f, 'contextid')] || txt(f, 'filename'), filename: txt(f, 'filename'), mimetype: txt(f, 'mimetype'), filesize: txt(f, 'filesize'), contenthash: txt(f, 'contenthash') }));
  return { source: 'moodle', file, course, users, enrolments, forums, assignments, resources };
}

/* ── 시험용 가짜 백업 ── */
function tarEntry(name, data) { const b = Buffer.from(data, 'utf8'); const h = Buffer.alloc(512); h.write(name, 0, 100, 'utf8'); h.write('0000644\0', 100); h.write('0000000\0', 108); h.write('0000000\0', 116); h.write(b.length.toString(8).padStart(11, '0') + '\0', 124); h.write('00000000000\0', 136); h.write('        ', 148); h[156] = 48; h.write('ustar\0', 257); h.write('00', 263);
  let s = 0; for (const x of h) s += x; h.write(s.toString(8).padStart(6, '0') + '\0 ', 148); return Buffer.concat([h, b, Buffer.alloc(Math.ceil(b.length / 512) * 512 - b.length)]); }
function sample() {
  const U = [[2, '20251001', 'Student01'], [3, '20251002', 'Student02'], [4, '20251003', 'Student03'], [5, '', 'guest_kim'], [6, 'P2025001', 'Prof01'], [7, '20251004', 'Student04']];
  const f = {
    'moodle_backup.xml': `<?xml version="1.0" encoding="UTF-8"?><moodle_backup><information><name>backup-moodle2-course-12.mbz</name><moodle_release>4.1</moodle_release><original_course_fullname>자료구조 (2025-2)</original_course_fullname></information></moodle_backup>`,
    'course/course.xml': `<?xml version="1.0" encoding="UTF-8"?><course id="12" contextid="40"><shortname>DS2025</shortname><fullname>자료구조 &amp; 알고리즘</fullname><idnumber>CSE2002</idnumber><summary>&lt;p&gt;스택 · 큐 · 트리&lt;/p&gt;</summary><startdate>1756652400</startdate></course>`,
    'roles.xml': `<roles_definition><role id="3"><name></name><shortname>editingteacher</shortname></role><role id="5"><shortname>student</shortname></role><role id="4"><shortname>teacher</shortname></role></roles_definition>`,
    'users.xml': `<users>${U.map(([id, no, un]) => `<user id="${id}" contextid="9${id}"><username>${un}</username><idnumber>${no}</idnumber><firstname>이름${id}</firstname><lastname>성</lastname><email>u${id}@example.com</email></user>`).join('')}</users>`,
    'course/roles.xml': `<roles><role_assignments><assignment id="1"><roleid>3</roleid><userid>6</userid></assignment>${[2, 3, 4, 5, 7].map(u => `<assignment id="1${u}"><roleid>5</roleid><userid>${u}</userid></assignment>`).join('')}</role_assignments></roles>`,
    'course/enrolments.xml': `<enrolments><enrols><enrol id="20"><enrolmethod>manual</enrolmethod><user_enrolments>${[2, 3, 4, 5, 7].map(u => `<enrolment id="3${u}"><status>0</status><userid>${u}</userid></enrolment>`).join('')}</user_enrolments></enrol></enrols></enrolments>`,
    'activities/forum_101/forum.xml': `<activity id="101" moduleid="201" modulename="forum" contextid="301"><forum id="101"><name>질의응답</name><discussions><discussion id="1"><name>과제 1 질문</name><posts><post id="1001"><parent>0</parent><userid>2</userid><created>1757000000</created><subject>과제 1 질문</subject><message><![CDATA[<p>스택 구현에서 <b>pop</b>이 안 됩니다.</p>]]></message></post><post id="1002"><parent>1001</parent><userid>6</userid><created>1757003600</created><subject>Re: 과제 1 질문</subject><message>&lt;p&gt;빈 스택 검사를 먼저 하세요.&lt;/p&gt;</message></post><post id="1003"><parent>1001</parent><userid>5</userid><created>1757007200</created><subject>Re: 저도요</subject><message>같은 문제입니다.</message></post></posts></discussion></discussions></forum></activity>`,
    'activities/assign_102/assign.xml': `<activity id="102" moduleid="202" modulename="assign" contextid="302"><assign id="102"><name>과제 1 · 스택</name><intro>&lt;p&gt;배열로 스택을 구현하세요.&lt;/p&gt;</intro><duedate>1757606400</duedate><grade>100</grade></assign></activity>`,
    'activities/resource_103/resource.xml': `<activity id="103" moduleid="203" modulename="resource" contextid="303"><resource id="103"><name>1주차 강의 영상</name></resource></activity>`,
    'activities/resource_104/resource.xml': `<activity id="104" moduleid="204" modulename="resource" contextid="304"><resource id="104"><name>강의계획서</name></resource></activity>`,
    'files.xml': `<files><file id="501"><contenthash>a1b2</contenthash><contextid>303</contextid><component>mod_resource</component><filearea>content</filearea><filename>week1.mp4</filename><filesize>73400320</filesize><mimetype>video/mp4</mimetype></file><file id="502"><contenthash>c3d4</contenthash><contextid>304</contextid><component>mod_resource</component><filearea>content</filearea><filename>syllabus.pdf</filename><filesize>204800</filesize><mimetype>application/pdf</mimetype></file><file id="503"><contenthash>da39</contenthash><contextid>304</contextid><component>mod_resource</component><filearea>content</filearea><filename>.</filename><filesize>0</filesize><mimetype>$@NULL@$</mimetype></file></files>`
  };
  return zlib.gzipSync(Buffer.concat([...Object.entries(f).map(([n, d]) => tarEntry(n, d)), Buffer.alloc(1024)]));
}

module.exports = { openMbz, parseXml, toPayload, sample };
if (require.main === module) (async () => {
  const [cmd, a, b, c, d] = process.argv.slice(2);
  if (cmd === 'sample') { fs.writeFileSync(a, sample()); console.log('시험용 백업:', a); return; }
  if (!a) { console.error('사용: node moodle-mbz.js parse|post|sample …'); process.exit(2); }
  const P = toPayload(openMbz(fs.readFileSync(a)), path.basename(a));
  if (cmd === 'parse') { const j = JSON.stringify(P, null, 1); if (b) fs.writeFileSync(b, j); else console.log(j); console.error(`강좌 1 · 사용자 ${P.users.length} · 수강 ${P.enrolments.length} · 게시물 ${P.forums.reduce((n, f) => n + f.posts.length, 0)} · 과제 ${P.assignments.length} · 자료 ${P.resources.length}`); return; }
  if (cmd === 'post') { if (d) P.term_id = d; const r = await fetch(b.replace(/\/$/, '') + '/api/lms/p/mig/import', { method: 'POST', headers: { 'content-type': 'application/json', 'x-didisam': '1', cookie: c }, body: JSON.stringify(P) }); const j = await r.json(); console.log(r.status, JSON.stringify(j, null, 1)); process.exit(r.ok ? 0 : 1); }
})().catch(e => { console.error(e.message); process.exit(1); });
