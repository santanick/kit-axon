'use strict';
/* v30 묶음 E(과제) 대조 테스트 — Node · Java에 같은 시나리오를 돌려 상태코드 · 본문(uuid · 시각 정규화)을 비교한다.
   사용: DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddw2 node test/lms-e.js http://127.0.0.1:8211 [http://127.0.0.1:8212] */
const { call, setup, run, STU, AUD } = require('./lms-efh-lib');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8211', process.argv[3] || ''];

async function scenario(base, tag) {
  const R = {}, P = []; const S = await setup(base, tag); const ck = S.ck; const L = S.L;
  const G = (k, p, o = {}) => call(base, 'GET', p, { cookie: ck, ...o }).then(r => (R[k] = r));
  const Po = (k, p, body, o = {}) => call(base, 'POST', p, { cookie: ck, body, ...o }).then(r => (R[k] = r));
  await G('noAuth', '/api/lms/e/list?section=' + S.sec, { cookie: undefined });
  await Po('csrf', '/api/lms/e/save', {}, { csrf: false });
  await G('sections', '/api/lms/e/sections');
  await G('badId', '/api/lms/e/list?section=xyz');
  await G('noSec', '/api/lms/e/list?section=00000000-0000-0000-0000-000000000000');
  await Po('saveBad', '/api/lms/e/save', { section_id: S.sec, title: '' });
  await Po('saveBadDue', '/api/lms/e/save', { section_id: S.sec, title: 'x', open_at: '2026-11-10T00:00:00Z', due_at: '2026-11-01T00:00:00Z' });
  /* 운영자 루브릭 템플릿 + 분반 루브릭 */
  await Po('rubTpl', '/api/lms/e/rubric-save', { is_template: true, name: '보고서 공통', criteria: [{ key: 'logic', name: '논리', levels: [{ label: '우수', score: 10 }, { label: '보통', score: 6 }, { label: '미흡', score: 2 }] }, { key: 'form', name: '형식', levels: [{ label: '우수', score: 5 }, { label: '미흡', score: 1 }] }] });
  await Po('rubBad', '/api/lms/e/rubric-save', { section_id: S.sec, name: 'x', criteria: [] });
  await G('rubrics', '/api/lms/e/rubrics?section=' + S.sec);
  const rub = R.rubTpl.j && R.rubTpl.j.rubric.rubric_id;
  await Po('save1', '/api/lms/e/save', { section_id: S.sec, title: '1주차 보고서', body: '자료구조 정리', due_at: new Date(Date.now() + 864e5).toISOString(), status: 'published', rubric_id: rub, plag_on: true, late_penalty_pct: 10, max_score: 100 });
  const asg = R.save1.j.assignment.asg_id;
  await Po('saveDraftA', '/api/lms/e/save', { section_id: S.sec, title: '비공개 과제', status: 'draft' });
  await G('list', '/api/lms/e/list?section=' + S.sec);
  /* 학습자: 파일 · 초안 자동 저장 · 제출 */
  await call(base, 'GET', '/api/lms/e/my?section=' + S.sec, { cookie: L[STU[0]] }).then(r => (R.my0 = r));
  await call(base, 'GET', '/api/lms/e/my?section=' + S.sec, { cookie: L['20267777'] }).then(r => (R.myNotEnr = r));
  await call(base, 'GET', '/api/lms/e/my?section=' + S.sec, { cookie: L['20268888'] }).then(r => (R.myNoPerson = r));
  await call(base, 'POST', '/api/lms/e/file', { cookie: L[STU[0]], body: { name: 'report.txt', mime: 'text/plain', b64: Buffer.from('보고서 파일 내용').toString('base64') } }).then(r => (R.file = r));
  await call(base, 'POST', '/api/lms/e/file', { cookie: L[STU[0]], body: { name: 'a/b.txt', mime: 'text/plain', b64: 'aGk=' } }).then(r => (R.fileBadName = r));
  await call(base, 'POST', '/api/lms/e/file', { cookie: L[STU[0]], body: { name: 'x.txt', mime: 'text/plain', b64: '' } }).then(r => (R.fileEmpty = r));
  const fid = R.file.j.file_id;
  await call(base, 'POST', '/api/lms/e/file', { cookie: L[STU[1]], body: { name: 'other.txt', mime: 'text/plain', b64: 'aGk=' } }).then(r => (R.file2 = r));
  const texts = ['배열 연결리스트 스택 큐 트리 그래프 해시 정렬 탐색 알고리즘', '배열 연결리스트 스택 큐 트리 그래프 해시 정렬 탐색 복잡도', '전혀 다른 내용의 보고서 입니다 운영체제 프로세스'];
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: asg, body: texts[0], files: [fid] } }).then(r => (R.draft1 = r));
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: asg, body: texts[0] + ' 추가', files: [fid], base_version: 1 } }).then(r => (R.draft2 = r));
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: asg, body: 'stale', base_version: 1 } }).then(r => (R.draftConflict = r));
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: asg, body: 'x', files: [R.file2.j.file_id] } }).then(r => (R.draftOtherFile = r));
  await call(base, 'GET', '/api/lms/e/versions?sub=' + R.draft2.j.submission.sub_id, { cookie: L[STU[0]] }).then(r => (R.versions = r));
  await call(base, 'GET', '/api/lms/e/versions?sub=' + R.draft2.j.submission.sub_id, { cookie: L[STU[1]] }).then(r => (R.versionsOther = r));
  await call(base, 'POST', '/api/lms/e/restore', { cookie: L[STU[0]], body: { sub_id: R.draft2.j.submission.sub_id, ver: 1 } }).then(r => (R.restore = r));
  await call(base, 'POST', '/api/lms/e/submit', { cookie: L[STU[0]], body: { asg_id: asg } }).then(r => (R.submit0 = r));
  await call(base, 'POST', '/api/lms/e/submit', { cookie: L[STU[0]], body: { asg_id: asg } }).then(r => (R.submitAgain = r));
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: asg, body: 'after' } }).then(r => (R.draftAfter = r));
  await call(base, 'POST', '/api/lms/e/submit', { cookie: L[STU[1]], body: { asg_id: asg } }).then(r => (R.submitEmpty = r));
  for (const [i, m] of [[1, STU[1]], [2, STU[2]]]) {
    await call(base, 'POST', '/api/lms/e/draft', { cookie: L[m], body: { asg_id: asg, body: texts[i] } });
    await call(base, 'POST', '/api/lms/e/submit', { cookie: L[m], body: { asg_id: asg } });
  }
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[AUD], body: { asg_id: asg, body: '청강생 제출' } });
  await call(base, 'POST', '/api/lms/e/submit', { cookie: L[AUD], body: { asg_id: asg } }).then(r => (R.submitAud = r));
  await call(base, 'GET', '/api/lms/e/file?id=' + fid, { cookie: L[STU[1]] }).then(r => (R.fileForbidden = r));
  await call(base, 'GET', '/api/lms/e/file?id=' + fid, { cookie: L[STU[0]] }).then(r => (R.fileOwn = r));
  await G('fileStaff', '/api/lms/e/file?id=' + fid);
  await G('status', '/api/lms/e/status?asg=' + asg);
  /* 채점: 루브릭 · 첨삭 · 피드백 파일 · 일괄 */
  const subs = Object.fromEntries((R.status.j.rows || []).map(r => [r.member_no, r.sub_id]));
  await Po('fbFile', '/api/lms/e/file', { name: '첨삭.txt', mime: 'text/plain', b64: Buffer.from('첨삭 의견').toString('base64') });
  await Po('gradeBadLevel', '/api/lms/e/grade', { sub_id: subs[STU[0]], rubric_scores: { logic: 7 } });
  await Po('grade0', '/api/lms/e/grade', { sub_id: subs[STU[0]], rubric_scores: { logic: 10, form: 1 }, feedback: '논리가 좋습니다.', annotations: [{ quote: '배열', comment: '정의 보완' }], feedback_files: [R.fbFile.j.file_id] });
  await Po('gradeNone', '/api/lms/e/grade', { sub_id: subs[STU[3]] || '00000000-0000-0000-0000-000000000000', score: 10 });
  await Po('bulk', '/api/lms/e/bulk-feedback', { asg_id: asg, sub_ids: [subs[STU[1]], subs[STU[2]], subs[AUD]], feedback: '공통 피드백: 참고문헌을 쓰세요.', score: 80 });
  await Po('bulkEmpty', '/api/lms/e/bulk-feedback', { asg_id: asg, sub_ids: [], feedback: 'x' });
  await G('sub0', '/api/lms/e/sub?id=' + subs[STU[0]]);
  await call(base, 'GET', '/api/lms/e/my?section=' + S.sec, { cookie: L[STU[0]] }).then(r => (R.my1 = r));
  await call(base, 'GET', '/api/lms/e/file?id=' + R.fbFile.j.file_id, { cookie: L[STU[0]] }).then(r => (R.fbFileLearner = r));
  /* 표절 검사(모의 어댑터) */
  await Po('plagRun', '/api/lms/e/plag-run', { asg_id: asg });
  await G('plag', '/api/lms/e/plag?asg=' + asg);
  await G('bundle', '/api/lms/e/bundle?asg=' + asg);
  /* 성적 연결(청강 제외) */
  await call(base, 'GET', '/api/lms/h/board?section=' + S.sec, { cookie: ck }).then(r => (R.board = r));
  /* 협업 과제 */
  await Po('saveTeam', '/api/lms/e/save', { section_id: S.sec, title: '팀 프로젝트', kind: 'team', status: 'published', due_at: new Date(Date.now() + 864e5).toISOString() });
  const tasg = R.saveTeam.j.assignment.asg_id;
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: tasg, body: 'x' } }).then(r => (R.teamNoTeam = r));
  await Po('teamsBad', '/api/lms/e/teams', { asg_id: tasg, teams: [{ name: 'A팀', members: [STU[0], '20267777'] }] });
  await Po('teamsDup', '/api/lms/e/teams', { asg_id: tasg, teams: [{ name: 'A팀', members: [STU[0]] }, { name: 'B팀', members: [STU[0]] }] });
  await Po('teams', '/api/lms/e/teams', { asg_id: tasg, teams: [{ name: 'A팀', members: [STU[0], STU[1]] }, { name: 'B팀', members: [STU[2], STU[3], STU[4]] }] });
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: tasg, body: '팀 문서 v1' } }).then(r => (R.teamD1 = r));
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[1]], body: { asg_id: tasg, body: '팀 문서 v2 (팀원 수정)', base_version: 1 } }).then(r => (R.teamD2 = r));
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: tasg, body: '팀 문서 충돌', base_version: 1 } }).then(r => (R.teamConflict = r));
  await call(base, 'GET', '/api/lms/e/versions?sub=' + R.teamD1.j.submission.sub_id, { cookie: L[STU[0]] }).then(r => (R.teamVers = r));
  await call(base, 'POST', '/api/lms/e/submit', { cookie: L[STU[1]], body: { asg_id: tasg } }).then(r => (R.teamSubmit = r));
  await G('teamStatus', '/api/lms/e/status?asg=' + tasg);
  await Po('teamGrade', '/api/lms/e/grade', { sub_id: R.teamD1.j.submission.sub_id, score: 90, feedback: '팀 협업 우수' });
  await Po('teamsAfter', '/api/lms/e/teams', { asg_id: tasg, auto: 2 });
  /* 마감 · 지각 */
  await Po('saveLate', '/api/lms/e/save', { section_id: S.sec, title: '지난 과제', status: 'published', open_at: '2026-01-01T00:00:00Z', due_at: '2026-01-02T00:00:00Z' });
  await call(base, 'POST', '/api/lms/e/draft', { cookie: L[STU[0]], body: { asg_id: R.saveLate.j.assignment.asg_id, body: 'x' } }).then(r => (R.lateClosed = r));
  await Po('delHas', '/api/lms/e/delete', { asg_id: asg });
  await Po('delDraft', '/api/lms/e/delete', { asg_id: R.saveDraftA.j.assignment.asg_id });
  await call(base, 'GET', '/api/lms/e/list?section=' + S.sec, { cookie: L[STU[0]] }).then(r => (R.learnerOnStaff = r));

  const st = R.status.j || {}; const brd = R.board.j || {};
  P.push([R.noAuth.st === 401, '로그인 없이 401'], [R.csrf.st === 403, 'CSRF 403'], [R.save1.st === 200, '과제 저장'],
    [R.draft1.st === 200 && R.draft1.j.submission.version === 1, '초안 버전 1'], [R.draft2.j && R.draft2.j.submission.version === 2, '초안 자동 저장 버전 2'],
    [R.draftConflict.st === 409, '기준 버전 충돌 409'], [R.draftOtherFile.st === 400, '남의 파일 첨부 400'], [R.versionsOther.st === 403, '남의 버전 403'],
    [R.submit0.st === 200 && R.submit0.j.submission.status === 'submitted', '제출'], [R.submitAgain.st === 409, '중복 제출 409'], [R.draftAfter.st === 409, '제출 후 수정 409'],
    [R.fileForbidden.st === 403, '남의 파일 403'], [R.fileOwn.st === 200 && Buffer.from(R.fileOwn.j.b64, 'base64').toString() === '보고서 파일 내용', '파일 내려받기 내용 일치'],
    [st.counts && st.counts.submitted === 4, '제출 현황 4건(청강 포함)'],
    [R.grade0.j && R.grade0.j.submission.score === 73.33, '루브릭 점수 환산 (11/15×100)'],
    [R.bulk.j && R.bulk.j.updated === 3, '일괄 피드백 3건'],
    [R.my1.j && R.my1.j.assignments[0].submission.feedback === '논리가 좋습니다.', '학습자 피드백 확인'], [R.fbFileLearner.st === 200, '첨삭 파일 학습자 열람'],
    [R.plag.j && R.plag.j.results.length === 4 && R.plag.j.results[0].similarity > 50, '표절 결과(유사 제출 상위)'],
    [R.bundle.j && R.bundle.j.files.some(f => /\/report\.txt$/.test(f.path)), '일괄 다운로드 경로'],
    [brd.rows && brd.rows.length === 5 && brd.auditors === 1, '성적 보드 청강 제외'],
    [R.teamConflict.st === 409, '팀 동시 편집 충돌'], [R.teamVers.j && R.teamVers.j.versions.length === 2, '팀 버전 2개'], [R.teamsAfter.st === 409, '작성 시작 후 재편성 409'],
    [R.lateClosed.st === 409, '마감 후 409'], [R.delHas.st === 409, '제출 있는 과제 삭제 409'], [R.learnerOnStaff.st === 401 || R.learnerOnStaff.st === 403, '학습자가 교수 API 401/403']);
  for (const k of ['fileOwn', 'fileStaff', 'bundle']) if (R[k].j && R[k].j.b64) R[k].j.b64 = R[k].j.b64.length;
  return { R, P };
}
run('묶음 E 대조', scenario, A, B, ['teamsAfter']).catch(e => { console.error(e); process.exit(1); });
