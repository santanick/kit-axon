'use strict';
/* x2 실시간 수업 · 실시간 자막(SFR-024 · 049 · 072 · 077) 대조 테스트 — Node와 Java에 같은 시나리오를 보내 상태 · 본문(변동값 가림)을 비교한다.
   사용: . s2env.sh; DATABASE_URL=postgres://didisam@127.0.0.1:5544/ddx2 node service-egov/test/lms-live.js http://127.0.0.1:8421 http://127.0.0.1:8422
   모의 LLM(8099)이 비어 있으면 lms-o-mock.js로 띄운다. */
const { call, db, setup, setSql, norm, STU, AUD } = require('./lms-efh-lib');
const mockLib = require('./lms-o-mock');
const [A, B] = [process.argv[2] || 'http://127.0.0.1:8421', process.argv[3] || ''];

/* 순번(bigserial) · 접속 코드 · 시각처럼 서버마다 다른 값은 가린다 */
const VAR = new Set(['last_sig', 'last_evt', 'ref', 'code', 'id', 'duration_sec']);
const scrub = x => Array.isArray(x) ? x.map(scrub) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, VAR.has(k) && v != null ? 'V' : scrub(v)])) : x;

async function scenario(base, tag) {
  const R = {}, P = []; const S = await setup(base, tag); const ck = S.ck; const L = S.L; const U = S.U;
  const keep = (k, r) => { R[k] = { st: r.st, j: scrub(r.j) }; return r; };
  const G = (k, p, c = ck) => call(base, 'GET', p, { cookie: c }).then(r => keep(k, r));
  const Po = (k, p, body, c = ck) => call(base, 'POST', p, { cookie: c, body }).then(r => keep(k, r));
  const ses = (await setSql(S.tid, "insert into lms_session (tenant_id, section_id, week_no, seq, kind, starts_at) values ($1, $2, 3, 1, 'live', now()) returning session_id::text", [S.tid, S.sec])).rows[0].session_id;
  /* 설정 */
  await G('set0', '/api/lms/live/setting');
  await Po('setBad', '/api/lms/live/setting', { turn_urls: ['http://x'] });
  await Po('setSfuBad', '/api/lms/live/setting', { sfu_url: 'ftp://x' });
  await Po('set', '/api/lms/live/setting', { turn_urls: ['turn:turn.example.ac.kr:3478'], turn_user: 'u1', turn_cred: 'pw', mesh_max: 3, fanout_max: 1, rec_days: 30 });
  await Po('setProf', '/api/lms/live/setting', { mesh_max: 4 }, U.prof);
  /* 수업 만들기 */
  await Po('roomBadMode', '/api/lms/live/room', { section_id: S.sec, title: 'x', mode: 'zzz' });
  await Po('roomLinkNoUrl', '/api/lms/live/room', { section_id: S.sec, title: 'x', mode: 'link' });
  await Po('roomBadSes', '/api/lms/live/room', { section_id: S.sec2, session_id: ses, title: 'x' });
  const m = await Po('roomMesh', '/api/lms/live/room', { section_id: S.sec, session_id: ses, title: '자료구조 3주차 실시간', mode: 'mesh', rec_allowed: true });
  const rid = m.j.room.room_id;
  const bc = await Po('roomBc', '/api/lms/live/room', { section_id: S.sec, title: '방송 특강', mode: 'broadcast' });
  const lk = await Po('roomLink', '/api/lms/live/room', { section_id: S.sec, title: 'Zoom 보강', mode: 'link', ext_url: 'https://zoom.us/j/123456' });
  await Po('roomUpd', '/api/lms/live/room', { room_id: lk.j.room.room_id, title: 'Teams 보강', mode: 'link', ext_url: 'https://teams.microsoft.com/l/meetup-join/abc' });
  await Po('roomProf2', '/api/lms/live/room', { section_id: S.sec2, title: 'x' }, U.prof);
  await G('rooms', '/api/lms/live/rooms?section_id=' + S.sec);
  await G('roomsProf', '/api/lms/live/rooms', U.prof);
  /* 입장: 녹화 동의 · 수강 확인 · 중복 접속 차단 · 정원 */
  await Po('joinNoConsent', '/api/lms/live/join', { room_id: rid }, L[STU[0]]);
  await Po('joinNotEnr', '/api/lms/live/join', { room_id: rid, consent_rec: true }, L['20267777']);
  const s0a = await Po('joinS0a', '/api/lms/live/join', { room_id: rid, consent_rec: true, device: 'pc' }, L[STU[0]]);
  const s0 = await Po('joinS0', '/api/lms/live/join', { code: m.j.room.code, consent_rec: true, device: 'mobile' }, L[STU[0]]);
  await Po('pollOld', '/api/lms/live/poll', { room_id: rid, peer_id: s0a.j.peer.peer_id }, L[STU[0]]);
  const h = await Po('joinHost', '/api/lms/live/join', { room_id: rid }, U.prof);
  await Po('joinHost2', '/api/lms/live/join', { room_id: rid }, ck);
  const s1 = await Po('joinS1', '/api/lms/live/join', { room_id: rid, consent_rec: true }, L[STU[1]]);
  await Po('joinFull', '/api/lms/live/join', { room_id: rid, consent_rec: true }, L[STU[2]]);
  const hp = h.j.peer.peer_id, p0 = s0.j.peer.peer_id, p1 = s1.j.peer.peer_id;
  /* 신호 */
  await Po('sigBadKind', '/api/lms/live/signal', { room_id: rid, peer_id: p0, to: hp, kind: 'zzz', data: {} }, L[STU[0]]);
  await Po('sigNoTo', '/api/lms/live/signal', { room_id: rid, peer_id: p0, kind: 'offer', data: {} }, L[STU[0]]);
  await Po('sigOther', '/api/lms/live/signal', { room_id: rid, peer_id: p0, to: hp, kind: 'offer', data: { sdp: 'v=0' } }, L[STU[1]]);
  await Po('sigOffer', '/api/lms/live/signal', { room_id: rid, peer_id: hp, to: p0, kind: 'offer', data: { type: 'offer', sdp: 'v=0 host' } }, U.prof);
  await Po('sigAns', '/api/lms/live/signal', { room_id: rid, peer_id: p0, to: hp, kind: 'answer', data: { type: 'answer', sdp: 'v=0 s0' } }, L[STU[0]]);
  await Po('pollS0', '/api/lms/live/poll', { room_id: rid, peer_id: p0, since: 0 }, L[STU[0]]);
  await Po('pollHost', '/api/lms/live/poll', { room_id: rid, peer_id: hp, since: 0 }, U.prof);
  /* 시작 · 채팅 · 손들기 · 질문 · 투표 */
  await Po('stateBad', '/api/lms/live/room-state', { room_id: rid, status: 'zzz' });
  await Po('endBefore', '/api/lms/live/room-state', { room_id: rid, status: 'ended' });
  await Po('start', '/api/lms/live/room-state', { room_id: rid, status: 'live' }, U.prof);
  await Po('start2', '/api/lms/live/room-state', { room_id: rid, status: 'live' });
  await Po('chat', '/api/lms/live/event', { room_id: rid, peer_id: p0, kind: 'chat', text: '안녕하세요' }, L[STU[0]]);
  await Po('chatEmpty', '/api/lms/live/event', { room_id: rid, peer_id: p0, kind: 'chat', text: ' ' }, L[STU[0]]);
  await Po('hand', '/api/lms/live/event', { room_id: rid, peer_id: p1, kind: 'hand' }, L[STU[1]]);
  const qa = await call(base, 'POST', '/api/lms/live/event', { cookie: L[STU[1]], body: { room_id: rid, peer_id: p1, kind: 'qa', text: '스택과 큐의 차이는?' } }); keep('qa', qa);
  await Po('ansStu', '/api/lms/live/event', { room_id: rid, peer_id: p0, kind: 'answer', ref: qa.j.event.id, text: 'x' }, L[STU[0]]);
  await Po('ans', '/api/lms/live/event', { room_id: rid, peer_id: hp, kind: 'answer', ref: qa.j.event.id, text: '스택은 LIFO, 큐는 FIFO입니다.' }, U.prof);
  await Po('lower', '/api/lms/live/event', { room_id: rid, peer_id: hp, kind: 'lower', to: p1 }, U.prof);
  await Po('pollBad', '/api/lms/live/event', { room_id: rid, peer_id: hp, kind: 'poll', text: '이해했나요?', options: ['예'] }, U.prof);
  const pl = await call(base, 'POST', '/api/lms/live/event', { cookie: U.prof, body: { room_id: rid, peer_id: hp, kind: 'poll', text: '이해했나요?', options: ['예', '아니요', '조금'] } }); keep('poll', pl);
  const pid = pl.j.event.id;
  await Po('pollStu', '/api/lms/live/event', { room_id: rid, peer_id: p0, kind: 'poll', text: 'x', options: ['a', 'b'] }, L[STU[0]]);
  await Po('vote', '/api/lms/live/event', { room_id: rid, peer_id: p0, kind: 'vote', ref: pid, choice: 0 }, L[STU[0]]);
  await Po('voteAgain', '/api/lms/live/event', { room_id: rid, peer_id: p0, kind: 'vote', ref: pid, choice: 1 }, L[STU[0]]);
  await Po('voteBadChoice', '/api/lms/live/event', { room_id: rid, peer_id: p1, kind: 'vote', ref: pid, choice: 7 }, L[STU[1]]);
  await Po('vote1', '/api/lms/live/event', { room_id: rid, peer_id: p1, kind: 'vote', ref: pid, choice: 2 }, L[STU[1]]);
  await Po('voteHost', '/api/lms/live/event', { room_id: rid, peer_id: hp, kind: 'vote', ref: pid, choice: 0 }, U.prof);
  await Po('close', '/api/lms/live/event', { room_id: rid, peer_id: hp, kind: 'close', ref: pid }, U.prof);
  await Po('voteClosed', '/api/lms/live/event', { room_id: rid, peer_id: p0, kind: 'vote', ref: pid, choice: 0 }, L[STU[0]]);
  await Po('pollEvS1', '/api/lms/live/poll', { room_id: rid, peer_id: p1, since: 0, esince: 0 }, L[STU[1]]);
  await G('summary', '/api/lms/live/summary?room_id=' + rid);
  await G('roomGet', '/api/lms/live/room?room_id=' + rid);
  /* 녹화 */
  await Po('recNoConsent', '/api/lms/live/rec-start', { room_id: rid }, U.prof);
  const rc = await Po('recStart', '/api/lms/live/rec-start', { room_id: rid, consent: true, mime: 'video/webm;codecs=vp8,opus' }, U.prof);
  const recId = rc.j.rec.rec_id;
  await Po('recStart2', '/api/lms/live/rec-start', { room_id: rid, consent: true }, U.prof);
  const b64 = Buffer.from('WEBM-PART-0').toString('base64');
  await Po('recPart', '/api/lms/live/rec-part', { rec_id: recId, idx: 0, b64 }, U.prof);
  await Po('recPartIdx', '/api/lms/live/rec-part', { rec_id: recId, idx: 5, b64 }, U.prof);
  await Po('recPart1', '/api/lms/live/rec-part', { rec_id: recId, idx: 1, b64: Buffer.from('PART-1').toString('base64') }, U.prof);
  await Po('pollRec', '/api/lms/live/poll', { room_id: rid, peer_id: p0, since: 999999999, esince: 999999999 }, L[STU[0]]);
  await G('recGetPrivate', '/api/lms/live/rec?rec_id=' + recId, L[STU[0]]);
  await Po('recFinish', '/api/lms/live/rec-finish', { rec_id: recId, publish: true }, U.prof);
  await Po('recFinish2', '/api/lms/live/rec-finish', { rec_id: recId, publish: true }, U.prof);
  await G('recGet', '/api/lms/live/rec?rec_id=' + recId + '&idx=0', L[STU[0]]);
  await G('recGet1', '/api/lms/live/rec?rec_id=' + recId + '&idx=1', L[STU[0]]);
  await G('recGetNotEnr', '/api/lms/live/rec?rec_id=' + recId, L['20267777']);
  await G('recViews', '/api/lms/live/rec-views?rec_id=' + recId);
  await G('recs', '/api/lms/live/recs?room_id=' + rid);
  const resRow = (await setSql(S.tid, "select kind, visible, body->>'provider' p from lms_b_resource where res_id = (select res_id from lms_live_rec where rec_id = $1)", [recId])).rows[0];
  /* 출석: 접속 시간을 정해 두고 종료 → 묶음 G 출결 기록 */
  await setSql(S.tid, "update lms_live_room set started_at = now() - interval '600 seconds' where room_id = $1", [rid]);
  await setSql(S.tid, "delete from lms_live_att where room_id = $1", [rid]);
  await setSql(S.tid, `insert into lms_live_att (tenant_id, room_id, member_no, first_at, last_at, sec) select $1, $2, m, r.started_at + (o || ' seconds')::interval, now(), s from lms_live_room r,
    (values ($3, 0, 590), ($4, 720, 480), ($5, 30, 100), ($6, 0, 600)) v(m, o, s) where r.room_id = $2`, [S.tid, rid, STU[0], STU[1], STU[2], STU[4]]);
  await setSql(S.tid, "insert into lms_attendance (tenant_id, session_id, person_id, status, method) values ($1, $2, $3, 'excused', 'manual')", [S.tid, ses, S.P[STU[4]]]);
  await G('attLive', '/api/lms/live/attendance?room_id=' + rid);
  await Po('end', '/api/lms/live/room-state', { room_id: rid, status: 'ended' }, U.prof);
  await G('att', '/api/lms/live/attendance?room_id=' + rid);
  await Po('pollEnded', '/api/lms/live/poll', { room_id: rid, peer_id: p0 }, L[STU[0]]);
  await Po('joinEnded', '/api/lms/live/join', { room_id: rid, consent_rec: true }, L[STU[0]]);
  const attRows = (await setSql(S.tid, "select p.member_no, a.status, a.method from lms_attendance a join lms_person p on p.person_id = a.person_id where a.session_id = $1 order by p.member_no", [ses])).rows;
  const logN = (await setSql(S.tid, "select count(*)::int n from lms_attendance_log where session_id = $1 and reason = '실시간 수업 자동 출석'", [ses])).rows[0].n;
  /* 학습자 · 방송 · 외부 링크 */
  await G('my', '/api/lms/live/my', L[STU[0]]);
  await G('myStaff', '/api/lms/live/my');
  await Po('joinLink', '/api/lms/live/join', { room_id: lk.j.room.room_id }, L[STU[3]]);
  await Po('bcJoin1', '/api/lms/live/join', { room_id: bc.j.room.room_id }, L[STU[3]]);
  await Po('bcJoin2', '/api/lms/live/join', { room_id: bc.j.room.room_id }, L[STU[2]]);
  await Po('setSfu', '/api/lms/live/setting', { sfu_url: 'wss://sfu.example.ac.kr/rtc' });
  await Po('bcJoinSfu', '/api/lms/live/join', { room_id: bc.j.room.room_id }, L[STU[2]]);
  await Po('leave', '/api/lms/live/leave', { peer_id: R.bcJoin1.j && (await call(base, 'POST', '/api/lms/live/join', { cookie: L[STU[3]], body: { room_id: bc.j.room.room_id } })).j.peer.peer_id }, L[STU[3]]);
  await Po('recDel', '/api/lms/live/rec-delete', { rec_id: recId }, U.prof);
  await G('recGetDel', '/api/lms/live/rec?rec_id=' + recId, L[STU[0]]);
  /* 보존 기간 지나면 자동 파기 */
  const rc2 = (await setSql(S.tid, "insert into lms_live_rec (tenant_id, room_id, retain_until, created_by, status) values ($1, $2, now() - interval '1 day', 'x', 'done') returning rec_id::text", [S.tid, rid])).rows[0].rec_id;
  await G('recsPurge', '/api/lms/live/recs');

  /* ── 자막 ── */
  await G('csGet', '/api/lms/live/cap-setting?section_id=' + S.sec);
  await Po('csBad', '/api/lms/live/cap-setting', { section_id: S.sec, src_lang: 'ko', langs: ['ko', 'en', 'ja', 'zh', 'vi'] });
  await Po('csDup', '/api/lms/live/cap-setting', { section_id: S.sec, src_lang: 'ko', langs: ['ko', 'ko'] });
  await Po('cs', '/api/lms/live/cap-setting', { section_id: S.sec, src_lang: 'ko', langs: ['ko', 'en', 'ja', 'vi'], visibility: 'private' });
  const cr = await Po('cr', '/api/lms/live/cap-room', { section_id: S.sec, title: '자료구조 3주차 자막', live_room_id: rid });
  const cid = cr.j.room.room_id; const code = cr.j && cr.j.room && (await call(base, 'GET', '/api/lms/live/cap-rooms', { cookie: ck })).j.rooms.find(x => x.room_id === cid).code;
  await Po('crBadLang', '/api/lms/live/cap-room', { section_id: S.sec, title: 'x', src_lang: 'xx' });
  await Po('seg1', '/api/lms/live/cap-seg', { room_id: cid, text: '안녕하세요 여러분 오늘 수업은 스택입니다.' });
  await Po('seg2', '/api/lms/live/cap-seg', { room_id: cid, text: '스택은 데이터를 쌓는 자료구조입니다.', source: 'manual' });
  await Po('segBad', '/api/lms/live/cap-seg', { room_id: cid, text: 'x', source: 'zzz' });
  await Po('tr', '/api/lms/live/cap-translate', { room_id: cid });
  await Po('seg3', '/api/lms/live/cap-seg', { room_id: cid, text: '다음 주에는 큐와 트리를 다룹니다. 감사합니다.' });
  await Po('trRule', '/api/lms/live/cap-translate', { room_id: cid, engine: 'rule' });
  await Po('trNone', '/api/lms/live/cap-translate', { room_id: cid });
  await Po('edit', '/api/lms/live/cap-edit', { room_id: cid, seq: 2, text: '스택은 데이터를 차곡차곡 쌓는 자료구조입니다.', tr: { en: 'A stack is a data structure that piles data.' } });
  await Po('editBad', '/api/lms/live/cap-edit', { room_id: cid, seq: 99, text: 'x' });
  await G('lines', '/api/lms/live/cap-lines?room_id=' + cid);
  await G('view', `/api/lms/live/cap-view?code=${encodeURIComponent(code)}&lang=en&v=viewerAAAA1111`, '');
  await G('viewJa', `/api/lms/live/cap-view?code=${encodeURIComponent(code)}&lang=ja&since=1&v=viewerBBBB2222`, '');
  await G('viewBad', '/api/lms/live/cap-view?code=zzz', '');
  await G('viewLang', `/api/lms/live/cap-view?code=${encodeURIComponent(code)}&lang=xx`, '');
  await G('tLearnerPrivate', '/api/lms/live/cap-transcript?room_id=' + cid, L[STU[0]]);
  await Po('finish', '/api/lms/live/cap-finish', { room_id: cid });
  await Po('segClosed', '/api/lms/live/cap-seg', { room_id: cid, text: 'x' });
  await Po('sum', '/api/lms/live/cap-summary', { room_id: cid });
  await Po('sumRule', '/api/lms/live/cap-summary', { room_id: cid, engine: 'rule' });
  await Po('script', '/api/lms/live/cap-script', { room_id: cid, transcript: '수정한 대본입니다.\n스택은 LIFO 자료구조입니다.', visibility: 'public' });
  await Po('scriptBad', '/api/lms/live/cap-script', { room_id: cid, visibility: 'zzz' });
  await G('tStaff', '/api/lms/live/cap-transcript?room_id=' + cid);
  await G('tLearner', '/api/lms/live/cap-transcript?room_id=' + cid, L[STU[0]]);
  await G('tNotEnr', '/api/lms/live/cap-transcript?room_id=' + cid, L['20267777']);
  await G('myCap', '/api/lms/live/my', L[STU[0]]);
  await G('stats', '/api/lms/live/cap-stats?days=30');
  const f = await call(base, 'POST', '/api/lms/e/file', { cookie: ck, body: { name: 'lecture.webm', mime: 'audio/webm', b64: Buffer.from('AUDIO').toString('base64') } });
  const fd = await call(base, 'POST', '/api/lms/e/file', { cookie: ck, body: { name: 'a.txt', mime: 'text/plain', b64: Buffer.from('TXT').toString('base64') } });
  await Po('audio', '/api/lms/live/cap-audio', { room_id: cid, file_ids: [f.j.file_id] });
  await Po('audioBad', '/api/lms/live/cap-audio', { room_id: cid, file_ids: [fd.j.file_id] });
  await G('audioList', '/api/lms/live/cap-audio?room_id=' + cid);
  await Po('csOff', '/api/lms/live/cap-setting', { section_id: S.sec, enabled: false, src_lang: 'en', langs: ['en', 'ko'] });
  await Po('crOff', '/api/lms/live/cap-room', { section_id: S.sec, title: 'x' });
  await G('capRoomsProf', '/api/lms/live/cap-rooms', U.prof);
  await G('anon', '/api/lms/live/rooms', '');

  const g = k => (R[k] || {}).j || {}; const st = k => (R[k] || {}).st;
  const att = Object.fromEntries((g('att').rows || []).map(r => [r.member_no, r.status]));
  P.push([st('set0') === 200 && g('set0').mesh_max === 6, '기본 설정(소그룹 6명)'], [st('setBad') === 400 && st('setSfuBad') === 400, '설정 형식 검사'], [st('setProf') === 403, '설정은 운영자만'],
    [g('set').turn_cred_set === true && g('set').turn_user === 'u1', 'TURN 설정 저장'],
    [st('roomBadMode') === 400 && st('roomLinkNoUrl') === 400 && st('roomBadSes') === 400, '수업 입력 검사'], [st('roomMesh') === 200 && st('roomLink') === 200, '수업 만들기(소그룹 · 외부 링크)'],
    [st('roomProf2') === 403, '담당 분반 밖 403'], [(g('rooms').rooms || []).length === 3, '수업 목록 3'],
    [st('joinNoConsent') === 428, '녹화 고지 동의 없으면 428'], [st('joinNotEnr') === 403, '미수강 403'], [g('joinS0').replaced === 1, '중복 접속 → 이전 연결 끊김'],
    [st('pollOld') === 409 && (R.pollOld.j || {}).error === 'replaced', '끊긴 연결 409 replaced'], [g('joinHost').role === 'host' && (g('joinHost').ice || []).length === 2, '교수자 입장 · STUN+TURN'],
    [st('joinFull') === 409, '소그룹 정원(3) 초과 409'], [st('sigOther') === 404, '남의 연결로 신호 보내기 차단'],
    [(g('pollS0').signals || []).some(s => s.kind === 'offer'), '학생이 교수자 offer 받음'], [(g('pollHost').signals || []).some(s => s.kind === 'answer'), '교수자가 answer 받음'],
    [st('endBefore') === 409 && st('start') === 200 && st('start2') === 409, '시작 · 종료 순서'],
    [st('ansStu') === 403 && st('ans') === 200, '답변은 교수자만'], [st('voteAgain') === 409 && st('voteHost') === 403 && st('voteClosed') === 409, '투표 1회 · 학생만 · 마감'],
    [JSON.stringify((g('summary').polls || [])[0] && g('summary').polls[0].tally) === '[1,0,1]', '투표 집계 1·0·1'],
    [(g('pollEvS1').events || []).filter(e => e.kind === 'vote').length === 1, '학생은 자기 투표만 봄'],
    [st('recNoConsent') === 428 && st('recStart2') === 409 && st('recPartIdx') === 409, '녹화 동의 · 중복 · 조각 순서'],
    [g('pollRec').room && g('pollRec').room.recording === true, '학생 화면 녹화 중 표시'], [st('recGetPrivate') === 403, '공개 전 녹화 403'],
    [resRow && resRow.kind === 'video' && resRow.visible === true && resRow.p === 'live', '녹화 → 강의자료(video) 등록'],
    [g('recGet').b64 === b64 && g('recGet').parts === 2, '녹화 재생 조각'], [st('recGetNotEnr') === 403, '미수강 녹화 403'], [(g('recViews').views || []).length === 1, '열람 기록 1건'],
    [att[STU[0]] === 'present' && att[STU[1]] === 'late' && att[STU[2]] === 'absent' && att[STU[3]] === 'absent' && att[AUD] === null, '출석 판정(출석 · 지각 · 결석 · 청강 제외)'],
    [g('end').attendance && g('end').attendance.written === 4 && g('end').attendance.kept === 1, '묶음 G 출결 4건 기록 · 기존 1건 유지'],
    [attRows.length === 5 && attRows.filter(r => r.method === 'live').length === 4 && logN === 4, '출결 표 · 변경 이력 기록'],
    [st('pollEnded') === 409 && st('joinEnded') === 409, '종료 후 연결 · 입장 차단'],
    [(g('my').rooms || []).length === 2, '학습자 내 실시간 수업 2'], [st('myStaff') === 401, '학습자 전용'], [g('joinLink').ext_url === 'https://teams.microsoft.com/l/meetup-join/abc', '외부 링크 수업'],
    [st('bcJoin2') === 409 && st('bcJoinSfu') === 200 && g('bcJoinSfu').sfu && g('bcJoinSfu').sfu.url, '방송 한도 → SFU 어댑터'], [st('leave') === 200, '나가기'],
    [st('recDel') === 200 && st('recGetDel') === 410, '녹화 파기'], [g('recsPurge').purged === 1, '보존 기간 지난 녹화 자동 파기'],
    [st('csBad') === 400 && st('csDup') === 400 && st('cs') === 200, '자막 언어 1~4개'], [st('cr') === 200 && st('crBadLang') === 400, '자막방'],
    [st('segBad') === 400 && g('seg1').line && g('seg1').line.source === 'stt', '받아쓰기 구간 저장'],
    [g('tr').saved === 6, '번역 2문장 × 3개 언어'], [g('trRule').engine === 'rule' && g('trRule').saved === 3, '규칙 번역'], [g('trNone').saved === 0, '번역 대기 없음'],
    [st('editBad') === 404 && g('edit').line && g('edit').line.tr_engine.en === 'manual', '자막 수정'],
    [(g('view').lines || []).length === 3 && g('view').lines[1].tr === 'A stack is a data structure that piles data.', '학생 화면(영어)'],
    [(g('viewJa').lines || []).length === 2, '학생 화면 이어 받기'], [st('viewBad') === 400 && st('viewLang') === 400, '코드 · 언어 검사'],
    [st('tLearnerPrivate') === 403 && st('tLearner') === 200 && st('tNotEnr') === 403, '대본 공개 범위'], [st('segClosed') === 409, '종료 후 입력 차단'],
    [g('sumRule').engine === 'rule' && /^- /.test(g('sumRule').summary || ''), '규칙 요약'], [st('scriptBad') === 400 && /수정한 대본/.test(g('tStaff').transcript || ''), '대본 수정'],
    [(g('myCap').captions || []).length === 1, '학습자 공개 대본 목록'],
    [g('stats').rooms >= 1 && g('stats').stt === 2 && g('stats').manual === 1 && g('stats').viewers.en === 1, '이용 현황'],
    [st('audio') === 200 && g('audio').job.hook === 'lmsVodSubtitleJob' && st('audioBad') === 400, '음성 파일 후처리 대기열'], [(g('audioList').jobs || []).length === 1, '대기열 목록'],
    [st('crOff') === 403, '강의별 자막 끄기'], [st('anon') === 401, '로그인 필요']);
  void rc2;
  return { R, P };
}

(async () => {
  try { await mockLib.start(Number(process.env.MOCK_AI_PORT || 8099)); } catch (e) { }
  let pass = 0, fail = 0; const errs = []; const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
  const ra = await scenario(A, 'n'); for (const [c, m] of ra.P) ok(c, 'Node: ' + m);
  if (B) {
    const rb = await scenario(B, 'j'); for (const [c, m] of rb.P) ok(c, 'Java: ' + m);
    for (const k of Object.keys(ra.R)) {
      const x = ra.R[k], y = rb.R[k]; if (!y) { ok(false, `${k}: Java 응답 없음`); continue; }
      ok(x.st === y.st, `${k}: 상태 ${x.st} ≠ ${y.st}`);
      const nx = norm(x.j), ny = norm(y.j); ok(nx === ny, `${k}: 본문 다름\n    N ${nx.slice(0, 700)}\n    J ${ny.slice(0, 700)}`);
    }
  }
  console.log(`lms-live: ${pass + fail}항목 중 ${pass} 통과 · ${fail} 실패`); for (const e of errs.slice(0, 50)) console.log('  ✗ ' + e);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
