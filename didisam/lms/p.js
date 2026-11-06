/* v30 학사 LMS 묶음 P — 공통 · 비기능
   다국어(한 · 영 · 일 · 중 메뉴 · 화면, 언어 선택 · 강의실 언어 · 영문 매뉴얼) · 접근성(고대비 · 큰 글자 · 움직임 줄이기 · 본문 바로가기) ·
   업로드(드래그 · zip 목록 · 진행 표시 · 최근 파일) · 에디터(LaTeX 수식 · 임시저장) · 포털 대시보드 위젯 · 앱 출석(PWA · 코드 · 오프라인 출석부 · 알림함) ·
   KOCW 메타데이터 XML · 관리자 2차 로그인(5회 실패 10분 잠금 · 동시 접속 차단 · 최종 접속) · 개인정보 열람 사유 · 통계 · 데이터 분류 · 암호화(ARIA 연결 지점) ·
   부하 시험 결과 · 무들 백업(.mbz) 이관 · 검증 리포트.
   운영 모드: /api/lms/p/... (서버 SQL lms_p). 데모 모드: S.lms.p + 시드. 기존 파일은 고치지 않고 MENU 라벨을 렌더 시점에 번역하는 층만 얹는다. */
(function () {
  'use strict';
  const LMP = window.LMP; if (!LMP) return;
  LMP.GETS = LMP.GETS || {}; LMP.GETS.p = ['pref.get', 'cls.langs', 'upload.recent', 'upload.get', 'draft.get', 'portal', 'att.board', 'kocw', 'admin.status', 'pii.stats', 'crypto.status', 'perf.list', 'mig.runs', 'mig.videos'];
  const need = (v, m) => { if (!v) throw new Error(m); };
  const LG = [['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh', '中文']];
  const LGMAP = { ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-CN' };

  /* ═════════ 다국어 사전(LMS 메뉴 · 화면) — global.js DICT에 더한다 ═════════ */
  const D = {
    '통합 달력': 'Unified calendar|統合カレンダー|统一日历', 'DM 채팅': 'Direct messages|DMチャット|私信聊天', '알림 규칙': 'Notification rules|通知ルール|通知规则',
    '시스템 관리': 'System admin|システム管理|系统管理', '공통 설정': 'Common settings|共通設定|通用设置', '포털 대시보드': 'Portal dashboard|ポータルダッシュボード|门户仪表板', '앱 출석': 'App attendance|アプリ出席|应用签到',
    '학사 연동': 'SIS integration|学務連携|教务对接', '성적': 'Grades|成績|成绩', 'AI 관리': 'AI governance|AI管理|AI管理', '구축 요건 대응': 'RFP coverage|構築要件対応|建设需求对应',
    '출결': 'Attendance|出欠|考勤', '평가': 'Assessment|評価|评价', '공지 · 알림함': 'Notices · Inbox|お知らせ · 通知箱|公告 · 通知箱', '메시지': 'Messages|メッセージ|消息', '커뮤니티': 'Community|コミュニティ|社区', '상담': 'Counseling|相談|咨询',
    '목록 · 진도': 'Roster · Progress|名簿 · 進捗|名单 · 进度', '등록 · 초대': 'Enroll · Invite|登録 · 招待|注册 · 邀请', '운영자 · 로그': 'Admins · Logs|運営者 · ログ|管理员 · 日志', '콘텐츠 · 편성': 'Content · Curriculum|コンテンツ · 編成|内容 · 编排',
    '학사 · 비교과': 'Academics · Extracurricular|学務 · 課外|教务 · 课外', '자동화': 'Automation|自動化|自动化', '홈페이지': 'Website|ホームページ|网站', '기관 관리': 'Organization|機関管理|机构管理', '설정': 'Settings|設定|设置',
    '사용자': 'Users|ユーザー|用户', '사용자 전환': 'Switch user|ユーザー切替|切换用户', '접속 통계': 'Access stats|アクセス統計|访问统计', '로그 검색': 'Log search|ログ検索|日志搜索', '팝업 · 배너': 'Pop-ups · Banners|ポップアップ · バナー|弹窗 · 横幅', '시스템 모니터링': 'System monitoring|システム監視|系统监控',
    '언어': 'Language|言語|语言', '접근성': 'Accessibility|アクセシビリティ|无障碍', '업로드': 'Upload|アップロード|上传', '에디터': 'Editor|エディタ|编辑器', '관리자 보안': 'Admin security|管理者セキュリティ|管理员安全', '개인정보 열람': 'PII access|個人情報閲覧|个人信息查阅',
    '데이터 분류 · 암호화': 'Data classes · Encryption|データ分類 · 暗号化|数据分类 · 加密', '성능 · 부하 시험': 'Performance · Load test|性能 · 負荷試験|性能 · 压力测试', '무들 이관': 'Moodle migration|Moodle移行|Moodle迁移', '영문 매뉴얼': 'English manual|英文マニュアル|英文手册',
    '일정 추가': 'Add event|予定を追加|添加日程', '새 대화': 'New chat|新しい会話|新对话', '규칙 추가': 'Add rule|ルール追加|添加规则', '보내기': 'Send|送信|发送', '저장': 'Save|保存|保存', '검색': 'Search|検索|搜索', '삭제': 'Delete|削除|删除', '취소': 'Cancel|キャンセル|取消',
    'To-do · 마감': 'To-do · Due|To-do · 締切|待办 · 截止', '이번 달 일정': 'This month|今月の予定|本月日程', '내 알림 규칙': 'My rules|マイルール|我的规则', '방해금지 시간': 'Quiet hours|おやすみ時間|免打扰时间', '발송 대기열': 'Outbound queue|送信キュー|发送队列', '내 알림함': 'My inbox|通知箱|我的通知',
    '구성원': 'Members|構成員|成员', '전환 이력': 'Switch history|切替履歴|切换记录', '월별': 'By month|月別|按月', '요일별': 'By weekday|曜日別|按星期', '시간대별': 'By hour|時間帯別|按时段', '학기 대시보드': 'Term dashboard|学期ダッシュボード|学期仪表板', '임계치': 'Thresholds|しきい値|阈值',
    '오늘 수업': "Today's classes|今日の授業|今日课程", '내 강좌': 'My courses|マイ講座|我的课程', '다가오는 마감': 'Upcoming due|近づく締切|即将截止', '안 읽은 메시지': 'Unread messages|未読メッセージ|未读消息', '출석 현황': 'Attendance|出席状況|出勤情况', '지도학생': 'Advisees|指導学生|指导学生', '바로가기': 'Shortcuts|ショートカット|快捷方式',
    '출석하기': 'Check in|出席する|签到', '출석 코드 열기': 'Open code|出席コード発行|开启签到码', '오프라인 출석부': 'Offline queue|オフライン出席簿|离线签到簿'
  };
  if (typeof DICT === 'object' && typeof LORD !== 'undefined') Object.entries(D).forEach(([ko, v]) => { const [en, ja, zh] = v.split('|'); DICT[ko] = Object.assign(DICT[ko] || {}, { en, ja, 'zh-CN': zh, 'zh-TW': (DICT[ko] && DICT[ko]['zh-TW']) || zh }); });
  const curLang = () => (typeof I18N === 'function' ? I18N().ui : 'ko') || 'ko';
  const tr = ko => (typeof LX === 'function' ? LX(ko, curLang()) : ko);
  LMP.tr = tr;
  /* 렌더 시점 번역 층: MENU · WS 라벨을 감싼다(원본 파일 수정 없음). 다른 묶음이 나중에 붙인 메뉴도 렌더마다 감싼다 */
  const WRAP = Symbol('lmsp-i18n');
  const wrapAll = () => [MENU, WS].forEach(T => Object.values(T).forEach(o => { if (!o || o[WRAP]) return; const orig = o.label; o.label = () => tr(typeof orig === 'function' ? orig() : orig); o[WRAP] = orig; }));
  wrapAll(); AFTER.unshift(wrapAll);
  { const base = render; render = function () { wrapAll(); return base.apply(this, arguments); }; }

  /* ═════════ 접근성 모드 ═════════ */
  const A11Y_KEY = 'didisam.lms.a11y';
  const a11y = () => { try { return JSON.parse(localStorage.getItem(A11Y_KEY) || '{}'); } catch (e) { return {}; } };
  const applyA11y = (o = a11y()) => { const h = document.documentElement; h.classList.toggle('a11y-hc', !!o.hc); h.classList.toggle('a11y-lg', !!o.lg); h.classList.toggle('a11y-rm', !!o.rm); };
  applyA11y();
  AFTER.push(() => { const sk = document.querySelector('a.skip'); const m = $('#main'); if (sk && m) { sk.textContent = tr('본문 바로가기') === '본문 바로가기' ? '본문 바로가기' : tr('본문 바로가기'); if (!sk.dataset.lmsp) { sk.dataset.lmsp = '1'; sk.addEventListener('click', e => { e.preventDefault(); const mm = $('#main'); mm && mm.focus(); }); } }
    const m2 = $('#main'); if (m2 && !m2.getAttribute('aria-label')) m2.setAttribute('aria-label', '본문'); });

  /* ═════════ 데모 상태 ═════════ */
  function ens() {
    const L = (S.lms = S.lms || {}); if (L.p) return L.p;
    L.p = { pref: { lang: 'ko', a11y: a11y() }, clsLang: {}, uploads: [], drafts: {}, layout: ['today', 'courses', 'due', 'dm', 'attendance', 'advisees', 'links'], att: {}, guard: { fails: 0, locked: 0, last: null, prev: null, sess: null }, pii: [], classes: null, perf: [], mig: [], seq: 1 };
    /* 데모 샘플(빈 화면 없애기): 최근 파일 2 · 개인정보 열람 기록 3 · 무들 이관 기록 1 */
    const ago = h => LMP.iso(Date.now() - h * 36e5); const P = L.p;
    P.uploads = [{ id: LMP.uuid(), name: '2026-2 강의계획서 양식.hwp', size: 182400, mime: 'application/x-hwp', sha256: null, entries: 0, chunks: [], at: ago(20) }, { id: LMP.uuid(), name: '1주차 실습자료.zip', size: 2411000, mime: 'application/zip', sha256: null, entries: 6, chunks: [], at: ago(50) }];
    P.pii = [{ at: ago(3), actor: '학사지원팀', target: '20261004', fields: ['name', 'phone'], reason: 'counsel', text: '' }, { at: ago(26), actor: '학사지원팀', target: '20261011', fields: ['name', 'grade'], reason: 'grade', text: '' }, { at: ago(75), actor: '장학팀', target: '20261020', fields: ['name'], reason: 'scholarship', text: '' }];
    P.mig = [{ run_id: P.seq++, at: ago(120), source: 'moodle', file: 'backup-CSE2001-2026-1.mbz', report: { course: { course_code: 'CSE2001', title: '데이터 분석 기초(2026-1 무들)', term_id: '2026-1' }, counts: { users: { source: 42, imported: 41, skipped: 1 }, enrolments: { source: 41, imported: 40, skipped: 1 }, posts: { source: 18, imported: 18, no_author: 0 }, forums: 2, assignments: { source: 4, imported: 4 }, resources: { source: 9, imported: 9, videos: 2 } }, issues: [{ kind: 'user', issue: '학번(idnumber) 없음 1명 — 이관 제외' }], verify: { enrolled_in_db: 40, objects_in_db: 31 }, ok: false }, videos: [{ run_id: 1, src_id: 'v1', title: '1주차 강의 영상', filename: 'week1.mp4', mimetype: 'video/mp4', filesize: 312000000 }, { run_id: 1, src_id: 'v2', title: '2주차 강의 영상', filename: 'week2.mp4', mimetype: 'video/mp4', filesize: 298000000 }] }];
    return L.p;
  }
  const CLASSES = [['운영자 비밀번호', 'users.pw', 'auth', 'scrypt_one_way', '서버 scrypt(N=16384)'], ['세션 토큰', 'sessions.id', 'auth', 'sha256_one_way', 'SHA-256'], ['학습자 이메일 · 휴대전화', 'pii.identity', 'pii', 'aria_two_way', '검증필 암호모듈(ARIA-256) 연결 지점 — 현재 AES-256-GCM'], ['보호자 연락처', 'pii.guardian', 'pii', 'aria_two_way', '검증필 암호모듈(ARIA-256) 연결 지점'], ['이메일 검색 색인', 'pii.identity.email_idx', 'pii', 'hmac_index', 'HMAC-SHA256'], ['성적', 'lms_grade_score · lms_grade_final', 'sensitive', 'aria_two_way', '검증필 암호모듈(ARIA-256) 연결 지점'], ['출석 증빙 사진', 'lms_attendance.evidence', 'sensitive', 'aria_two_way', '저장소 키만'], ['학번 · 사번', 'lms_person.member_no', 'internal', 'none', ''], ['접속 IP', 'lms_access_log.ip_masked', 'internal', 'mask', '끝자리 가림'], ['공지 · 강의자료', 'tenant_state.doc', 'public', 'none', '']];
  const DEMO_CLS = () => { const A = LMP.demoA && LMP.demoA(); if (A && A.sections.length) { const t = (A.terms.find(x => x.is_operating) || {}).term_id; return A.sections.filter(s => s.term_id === t && !s.hidden).map(s => ({ id: s.class_id || s.section_id, name: s.title, learners: A.enr.filter(e => e.section_id === s.section_id && e.status === 'enrolled'), curriculum: ((S.classes || []).find(c => c.id === s.class_id) || {}).curriculum || [] })); } return S.classes && S.classes.length ? S.classes : [{ id: 'demo-c1', name: '프로그래밍 기초 01', learners: Array(32) }, { id: 'demo-c2', name: '경영 데이터 분석 01', learners: Array(28) }]; };
  const sessToday = () => DEMO_CLS().slice(0, 3).map((c, i) => ({ session_id: 'demo-ses-' + i, title: `${c.name} ${3 + i}주 1차시`, at: LMP.iso(new Date().setHours(9 + i * 2, 0, 0, 0)) }));
  LMP.demo.p = {
    'pref.get': () => ens().pref,
    'pref.save': q => { need(['ko', 'en', 'ja', 'zh'].includes(q.lang || 'ko'), '언어는 한국어 · 영어 · 일본어 · 중국어 중에서 고릅니다.'); const a = { hc: !!(q.a11y || {}).hc, lg: !!(q.a11y || {}).lg, rm: !!(q.a11y || {}).rm }; ens().pref = { lang: q.lang || 'ko', a11y: a }; return { ok: true, lang: q.lang || 'ko', a11y: a }; },
    'cls.langs': () => ({ items: DEMO_CLS().map(c => ({ section_id: c.id, title: c.name, lang: ens().clsLang[c.id] || 'ko' })) }),
    'cls.lang': q => { need(['ko', 'en', 'ja', 'zh'].includes(q.lang), '언어는 한국어 · 영어 · 일본어 · 중국어 중에서 고릅니다.'); ens().clsLang[q.section_id] = q.lang; return { ok: true, section_id: q.section_id, lang: q.lang }; },
    'upload.add': q => { need(q.name, 'name 값을 입력하세요.'); need(!LMP.fileOk(q.name, q.mime), LMP.fileOk(q.name, q.mime)); need((q.file_ids || []).length, '파일 조각(file_ids)을 먼저 올리세요.'); need(q.file_ids.length <= 50, '파일은 100MB(조각 50개)까지 올릴 수 있습니다.'); const u = { id: LMP.uuid(), name: q.name, size: +q.size, mime: q.mime || '', sha256: q.sha256 || null, entries: (q.entries || []).length, chunks: q.file_ids, at: LMP.nowIso() }; ens().uploads.unshift(u); ens().uploads = ens().uploads.slice(0, 20); return { ok: true, id: u.id, size: u.size, chunks: q.file_ids.length, entries: u.entries, storage: 'lms_file' }; },
    'upload.get': q => { const u = ens().uploads.find(x => x.id === q.id); need(u, '없는 파일입니다.'); return { id: u.id, name: u.name, size: u.size, mime: u.mime, sha256: u.sha256, chunks: u.chunks || [] }; },
    'upload.recent': () => ({ items: ens().uploads.map(u => ({ ...u, chunks: (u.chunks || []).length })) }),
    'draft.save': q => { need(q.doc_key, 'doc_key 값을 입력하세요.'); ens().drafts[q.doc_key] = { doc_key: q.doc_key, body: q.body || '', at: LMP.nowIso() }; return { ok: true, doc_key: q.doc_key, chars: (q.body || '').length }; },
    'draft.get': q => ({ draft: ens().drafts[q.doc_key] || null }),
    'widget.save': q => { need((q.layout || []).every(w => WID[w]), '없는 위젯입니다.'); ens().layout = q.layout; return { ok: true, layout: q.layout }; },
    'portal': () => { const Ll = (S.lms || {}).l; const P = ens(); return { layout: P.layout, courses: DEMO_CLS().slice(0, 8).map(c => ({ section_id: c.id, title: c.name, term_id: '2026-2', students: c.learners.length })), today: sessToday(),
      due: (x => x.length ? x : DEMO_CLS().slice(0, 3).map((c, i) => ({ title: `${c.name} ${['과제 2 제출', '퀴즈 3', '중간 보고서'][i]}`, at: LMP.iso(Date.now() + (i + 1) * 2 * 864e5), kind: i === 1 ? 'exam' : 'deadline' })))(((Ll && Ll.ev) || []).filter(e => ['deadline', 'exam', 'todo'].includes(e.kind) && !e.done && new Date(e.starts_at) >= new Date()).slice(0, 6).map(e => ({ title: e.title, at: e.starts_at, kind: e.kind }))),
      dm_unread: ((Ll && Ll.rooms) || []).reduce((a, r) => a + r.msgs.filter(m => m.id > r.read && !String(m.sender).startsWith('u:')).length, 0), inbox: (x => x.length ? x : [{ title: '수강 정정 기간 안내(11월 10일까지)' }, { title: '중간 강의평가 참여 요청' }])(((Ll && Ll.inbox) || []).slice(0, 5)),
      attendance: { total: 120, ok: 111, absent: 9 }, advisees: (() => { const A = LMP.demoA && LMP.demoA(); const M = A ? A.persons.filter(p => p.kind === 'student').slice(0, 4).map(p => [p.member_no, p.unit_code]) : [['20261001', 'CSE'], ['20261004', 'CSE'], ['20261007', 'CSE']]; return M.map(([m, u], i) => ({ member_no: m, unit_code: u, absent: Math.max(0, 3 - i) })); })() }; },
    'kocw': () => ({ xml: demoKocw(), courses: (S.classes || []).length }),
    'admin.login': q => { need(LMP.isAdm(), '관리자 계정만 관리자 모드로 들어갈 수 있습니다.'); const G = ens().guard; if (G.locked > Date.now()) throw new Error(`비밀번호를 5회 틀려 ${new Date(G.locked).toTimeString().slice(0, 5)}까지 잠겼습니다.`);
      if (String(q.password || '').length < 10) { G.fails++; if (G.fails >= 5) { G.locked = Date.now() + 6e5; G.fails = 0; throw new Error('비밀번호를 5회 틀려 10분 동안 잠겼습니다.'); } throw new Error(`비밀번호가 올바르지 않습니다(${G.fails}/5). 데모: 10자 이상이면 통과`); }
      if (G.sess && !q.force) { const e = new Error('다른 곳에서 관리자 모드를 쓰고 있습니다. 이어서 들어가면 그쪽 접속이 끊깁니다.'); e.code = 'concurrent'; throw e; }
      G.prev = G.last; G.last = { at: LMP.nowIso(), ip: '127.0.0.*' }; G.fails = 0; G.sess = { exp: LMP.iso(Date.now() + 72e5) }; logAudit('관리자 모드 진입'); return { ok: true, replaced: q.force ? 1 : 0, expires_at: G.sess.exp, last_login: G.prev, token: 'demo-' + LMP.uuid() }; },
    'admin.status': () => { const G = ens().guard; return { active: !!G.sess, expires_at: G.sess && G.sess.exp, fails: G.fails, locked: G.locked > Date.now(), last_login: G.last, prev_login: G.prev }; },
    'admin.logout': () => { ens().guard.sess = null; return { ok: true }; },
    'pii.view': q => { need(PIR[q.reason_code], '열람 사유를 고르세요.'); need(q.reason_code !== 'other' || String(q.reason_text || '').length >= 5, '기타 사유는 5자 이상 적어 주세요.'); need((q.fields || []).length, '열람 항목(fields)을 고르세요.'); ens().pii.unshift({ at: LMP.nowIso(), actor: S.me.name, target: q.target, fields: q.fields, reason: q.reason_code, text: q.reason_text || '' }); logAudit(`개인정보 열람 — ${q.target} · ${PIR[q.reason_code]}`); return { ok: true, fields: q.fields, source: '학사 · SSO 조회(연동 후 표시) — 디디쌤은 이름 · 연락처를 저장하지 않습니다' }; },
    'pii.stats': () => { const L = ens().pii; const c = f => L.reduce((o, x) => { [].concat(f(x)).forEach(k => o[k] = (o[k] || 0) + 1); return o; }, {}); return { total: L.length, by_reason: c(x => x.reason), by_field: c(x => x.fields), by_day: c(x => x.at.slice(0, 10)), by_actor: Object.entries(c(x => x.actor)).map(([actor, n]) => ({ actor, n })), recent: L.slice(0, 50) }; },
    'crypto.status': () => ({ adapter: { id: 'interim-aes-gcm', alg: 'AES-256-GCM', certified: false, target: 'ARIA-256-GCM(KCMVP 검증필 모듈)', ready: !!(crypto && crypto.subtle), selftest: !!(crypto && crypto.subtle) }, classes: CLASSES.map(([item, location, grade, method, module]) => ({ item, location, grade, method, module, note: '' })) }),
    'crypto.class_save': () => ({ ok: true }),
    'perf.list': () => ({ items: PERF_RESULTS }),
    'perf.save': () => ({ ok: true }),
    'mig.import': q => migDemo(q), 'mig.runs': () => ({ items: ens().mig }), 'mig.videos': () => ({ items: ens().mig.flatMap(r => r.videos || []), note: '동영상 원본 이관은 기존 업체 저장소 접근 권한 확보 후 진행(연동 지점)' })
  };
  /* 2026-11-06 이 장비(2코어 · 공유)에서 직접 측정한 결과(loadtest-checkin.js) — 운영 모드에서는 서버 기록(perf.list)을 보여 준다 */
  const PERF_RESULTS = [
    { at: '2026-11-06T08:21:00+09:00', name: '출석 피크 3000명 · 동시 500 (Node)', params: { scale: '3,000건 · 동시 500', host: '2코어 · 공유 장비' }, result: { ok: 3000, requests: 3000, recorded_in_db: 3000, p50_ms: 578, p95_ms: 655, p99_ms: 681, max_ms: 715, rps: 812, under_3s_pct: 100 } },
    { at: '2026-11-06T08:22:00+09:00', name: '출석 피크 3000명 · 동시 300 (Java 전자정부)', params: { scale: '3,000건 · 동시 300', host: '2코어 · 공유 장비 · -Xmx400m' }, result: { ok: 3000, requests: 3000, recorded_in_db: 3000, p50_ms: 625, p95_ms: 1664, p99_ms: 2207, max_ms: 3006, rps: 399, under_3s_pct: 100 } }];
  function demoKocw() { const x = s => esc(s); return `<?xml version="1.0" encoding="UTF-8"?>\n<kocw version="1.0" generator="DiDiSam LMS"><provider><institution>${x(S.org.name)}</institution></provider>${(S.classes || []).map((c, i) => `<course id="DEMO${1001 + i}-01"><title>${x(c.name)}</title><courseCode>DEMO${1001 + i}</courseCode><section>01</section><term>2026-2</term><language>${x(ens().clsLang[c.id] || 'ko')}</language><license>CC BY-NC-ND 2.0 KR</license><professor>연동 후 입력(교수명은 학사 조회)</professor><lectures>${(c.curriculum || []).filter(u => u.type !== 'chapter').slice(0, 15).map((u, j) => `<lecture week="${j + 1}" seq="1" type="online">${x(u.title)}</lecture>`).join('')}</lectures></course>`).join('')}</kocw>`; }
  function migDemo(q) { const users = q.users || []; const ok = users.filter(u => /^[A-Za-z0-9_-]{4,20}$/.test(u.idnumber || u.username || '')); const umap = new Set(ok.map(u => u.id)); const posts = (q.forums || []).flatMap(f => f.posts || []); const vids = (q.resources || []).filter(r => /^video\//.test(r.mimetype || ''));
    const P = ens(); const run_id = P.seq++; const issues = users.length - ok.length ? [{ kind: 'user', issue: `학번(idnumber) 없음 ${users.length - ok.length}명 — 이관 제외` }] : []; const na = posts.filter(p => !umap.has(p.userid)).length; if (na) issues.push({ kind: 'post', issue: `작성자 학번 없음 ${na}건 — 작성자 비움으로 이관` });
    const report = { course: { course_code: String(q.course.idnumber || q.course.shortname).replace(/[^A-Za-z0-9]/g, '').toUpperCase(), title: q.course.fullname, term_id: q.term_id || 'MIG' }, counts: { users: { source: users.length, imported: ok.length, skipped: users.length - ok.length }, enrolments: { source: (q.enrolments || []).length, imported: (q.enrolments || []).filter(e => umap.has(e.userid)).length, skipped: (q.enrolments || []).filter(e => !umap.has(e.userid)).length }, posts: { source: posts.length, imported: posts.length, no_author: na }, forums: (q.forums || []).length, assignments: { source: (q.assignments || []).length, imported: (q.assignments || []).length }, resources: { source: (q.resources || []).length, imported: (q.resources || []).length, videos: vids.length } }, issues, verify: { enrolled_in_db: (q.enrolments || []).filter(e => umap.has(e.userid) && !/teacher/.test(e.role)).length, objects_in_db: posts.length + (q.assignments || []).length + (q.resources || []).length }, ok: !issues.length };
    P.mig.unshift({ run_id, at: LMP.nowIso(), source: 'moodle', file: q.file || '', report, videos: vids.map(v => ({ run_id, src_id: v.id, title: v.name, filename: v.filename, mimetype: v.mimetype, filesize: v.filesize })) }); logAudit('무들 이관(데모) — ' + report.course.course_code); return { run_id, report }; }

  /* ═════════ 메뉴 ═════════ */
  LMP.menu({ lmsp: { label: '공통 설정', ws: 'ops' }, 'lmsp-portal': { label: '포털 대시보드', ws: 'learn' }, 'lmsp-app': { label: '앱 출석', ws: 'learn' } });

  /* ── LaTeX 최소 렌더러(외부 CDN 없음): $…$ · $$…$$ — 분수 · 제곱근 · 위/아래 첨자 · 그리스 문자 · 연산자 ── */
  const SYM = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', phi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', sum: '∑', prod: '∏', int: '∫', infty: '∞', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', approx: '≈', times: '×', cdot: '·', pm: '±', div: '÷', rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', in: '∈', partial: '∂', nabla: '∇', forall: '∀', exists: '∃', cdots: '⋯', ldots: '…' };
  function texRender(src) {
    let i = 0; const s = String(src);
    const group = () => { while (s[i] === ' ') i++; if (s[i] === '{') { i++; let d = 1, st = i; while (i < s.length && d) { if (s[i] === '{') d++; else if (s[i] === '}') d--; i++; } return parse(s.slice(st, i - 1)); } const c = s[i++] || ''; if (c === '\\') { const m = /^[A-Za-z]+/.exec(s.slice(i)) || ['']; i += m[0].length; return SYM[m[0]] ? esc(SYM[m[0]]) : esc('\\' + m[0]); } return esc(c); };
    function parse(t) { const save = [s, i]; let out = ''; let j = 0; const sub = t; const S2 = { s: sub };
      const g = () => { while (sub[j] === ' ') j++; if (sub[j] === '{') { j++; let d = 1, st = j; while (j < sub.length && d) { if (sub[j] === '{') d++; else if (sub[j] === '}') d--; j++; } return parse(sub.slice(st, j - 1)); } const c = sub[j++] || ''; if (c === '\\') { const m = /^[A-Za-z]+/.exec(sub.slice(j)) || ['']; j += m[0].length; return SYM[m[0]] ? esc(SYM[m[0]]) : esc(m[0]); } return esc(c); };
      while (j < sub.length) { const c = sub[j];
        if (c === '\\') { const m = /^\\([A-Za-z]+|.)/.exec(sub.slice(j)); j += m[0].length; const n = m[1];
          if (n === 'frac') { const a = g(), b = g(); out += `<span class="frac"><span>${a}</span><span>${b}</span></span>`; }
          else if (n === 'sqrt') { out += `√<span class="sqrt">${g()}</span>`; }
          else if (n === 'text' || n === 'mathrm') out += `<span style="font-style:normal">${g()}</span>`;
          else if (n === '\\') out += '<br>';
          else out += esc(SYM[n] || n); }
        else if (c === '^') { j++; out += `<sup>${g()}</sup>`; }
        else if (c === '_') { j++; out += `<sub>${g()}</sub>`; }
        else if (c === '{' || c === '}') j++;
        else { out += /[A-Za-z]/.test(c) ? `<i>${esc(c)}</i>` : esc(c); j++; } }
      void save; void S2; return out; }
    void group; return parse(s);
  }
  LMP.tex = texRender;
  const texDoc = txt => esc(txt).replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (m, a, b) => { const raw = (a || b).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"); const h = texRender(raw); return a ? `<div class="lmp-tex" role="math" aria-label="${esc(raw)}" style="text-align:center;margin:8px 0">${h}</div>` : `<span class="lmp-tex" role="math" aria-label="${esc(raw)}">${h}</span>`; }).replace(/\n/g, '<br>');
  LMP.texDoc = texDoc;

  /* ── zip 목록(중앙 디렉터리) · tar.gz(DecompressionStream) ── */
  async function zipList(file) { const n = Math.min(file.size, 1 << 22); const buf = new Uint8Array(await file.slice(file.size - n).arrayBuffer()); const dv = new DataView(buf.buffer); let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('zip 형식이 아닙니다.');
    const cnt = dv.getUint16(e + 10, true); const cdSize = dv.getUint32(e + 12, true); const cdOff = dv.getUint32(e + 16, true); const base = file.size - n; let p = cdOff - base; if (p < 0) throw new Error('목록이 너무 큽니다.'); const td = new TextDecoder(); const out = [];
    for (let k = 0; k < cnt && p < buf.length; k++) { const sz = dv.getUint32(p + 24, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), m = dv.getUint16(p + 10, true), lo = dv.getUint32(p + 42, true); out.push({ name: td.decode(buf.subarray(p + 46, p + 46 + nl)), size: sz, csize: csz, method: m, lo }); p += 46 + nl + xl + cl; }
    void cdSize; return out.filter(x => !x.name.endsWith('/')); }
  async function zipPreview(file, ent) { if (typeof DecompressionStream === 'undefined' || ent.method !== 8 || ent.csize > 1 << 20) return null; const h = new DataView(await file.slice(ent.lo, ent.lo + 30).arrayBuffer()); const st = ent.lo + 30 + h.getUint16(26, true) + h.getUint16(28, true);
    const ds = file.slice(st, st + ent.csize).stream().pipeThrough(new DecompressionStream('deflate-raw')); return (await new Response(ds).text()).slice(0, 400); }
  async function gunzip(file) { if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 DecompressionStream을 지원하지 않습니다. 서버 도구(moodle-mbz.js)를 쓰세요.'); return new Uint8Array(await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }
  function untar(b) { const out = {}; let o = 0; const td = new TextDecoder(); while (o + 512 <= b.length) { const h = b.subarray(o, o + 512); if (h.every(x => x === 0)) break; let name = td.decode(h.subarray(0, 100)).replace(/\0.*$/s, ''); const pre = td.decode(h.subarray(345, 500)).replace(/\0.*$/s, ''); if (pre) name = pre + '/' + name; const size = parseInt(td.decode(h.subarray(124, 136)).replace(/\0.*$/s, '').trim() || '0', 8); const ty = String.fromCharCode(h[156] || 48); if (ty === '0' || ty === '\0') out[name.replace(/^\.\//, '')] = b.subarray(o + 512, o + 512 + size); o += 512 + Math.ceil(size / 512) * 512; } return out; }
  /* 무들 백업 XML → 이관 페이로드(서버 도구 moodle-mbz.js toPayload와 같은 규칙: 학번만, 이름 · 이메일 버림) */
  function mbzPayload(files, fname) { const td = new TextDecoder(); const X = p => files[p] ? new DOMParser().parseFromString(td.decode(files[p]), 'application/xml') : null; const T = (n, s) => { const e = n && n.querySelector(s); return e ? e.textContent.trim() : ''; }; const kidT = (n, tag) => { const e = n && [...n.children].find(c => c.tagName === tag); return e ? e.textContent.trim() : ''; };
    const c = X('course/course.xml'); const cn = c && c.querySelector('course'); if (!cn) throw new Error('course/course.xml이 없습니다(무들 백업이 아닙니다).');
    const roleName = {}; const rx = X('roles.xml'); rx && rx.querySelectorAll('role').forEach(r => roleName[r.getAttribute('id')] = kidT(r, 'shortname'));
    const ur = {}; const cr = X('course/roles.xml'); cr && cr.querySelectorAll('assignment').forEach(a => { const n = roleName[kidT(a, 'roleid')] || ''; const u = kidT(a, 'userid'); if (!ur[u] || n === 'editingteacher') ur[u] = n; });
    const ux = X('users.xml'); const users = ux ? [...ux.querySelectorAll('user')].map(u => ({ id: u.getAttribute('id'), idnumber: kidT(u, 'idnumber'), username: /^\d{6,10}$/.test(kidT(u, 'username')) ? kidT(u, 'username') : '', role: ur[u.getAttribute('id')] || 'student' })) : [];
    const ex = X('course/enrolments.xml'); const enrolments = (ex ? [...ex.querySelectorAll('enrolment')].map(e => ({ userid: kidT(e, 'userid'), role: ur[kidT(e, 'userid')] || 'student', status: kidT(e, 'status') })) : []).concat(Object.entries(ur).filter(([, r]) => /teacher/.test(r)).map(([u, r]) => ({ userid: u, role: r }))).filter((e, i, a) => a.findIndex(x => x.userid === e.userid && x.role === e.role) === i);
    const keys = Object.keys(files).sort(); const forums = keys.filter(p => /^activities\/forum_\d+\/forum\.xml$/.test(p)).map(p => { const f = X(p).querySelector('forum'); return { id: f.getAttribute('id'), name: kidT(f, 'name'), posts: [...f.querySelectorAll('post')].map(po => ({ id: po.getAttribute('id'), parent: kidT(po, 'parent'), userid: kidT(po, 'userid'), created: kidT(po, 'created'), subject: kidT(po, 'subject'), message: kidT(po, 'message').slice(0, 20000) })) }; });
    const assignments = keys.filter(p => /^activities\/assign_\d+\/assign\.xml$/.test(p)).map(p => { const a = X(p).querySelector('assign'); return { id: a.getAttribute('id'), name: kidT(a, 'name'), intro: kidT(a, 'intro').slice(0, 20000), duedate: kidT(a, 'duedate'), grade: kidT(a, 'grade') }; });
    const rn = {}; keys.filter(p => /^activities\/(resource|folder|url)_\d+\/\w+\.xml$/.test(p)).forEach(p => { const a = X(p).querySelector('activity'); if (a) rn[a.getAttribute('contextid')] = T(a, 'name'); });
    const fx = X('files.xml'); const resources = fx ? [...fx.querySelectorAll('file')].filter(f => /^mod_(resource|folder)$/.test(kidT(f, 'component')) && kidT(f, 'filename') !== '.').map(f => ({ id: f.getAttribute('id'), name: rn[kidT(f, 'contextid')] || kidT(f, 'filename'), filename: kidT(f, 'filename'), mimetype: kidT(f, 'mimetype'), filesize: kidT(f, 'filesize'), contenthash: kidT(f, 'contenthash') })) : [];
    return { source: 'moodle', file: fname, course: { id: cn.getAttribute('id') || '', shortname: kidT(cn, 'shortname'), fullname: kidT(cn, 'fullname'), idnumber: kidT(cn, 'idnumber'), summary: kidT(cn, 'summary').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000), startdate: kidT(cn, 'startdate') }, users, enrolments, forums, assignments, resources }; }
  LMP.mbzPayload = mbzPayload;

  /* ═════════ 공통 설정 화면 ═════════ */
  const TABS = [['lang', '언어'], ['a11y', '접근성'], ['upload', '업로드'], ['editor', '에디터'], ['kocw', 'KOCW'], ['sec', '관리자 보안'], ['pii', '개인정보 열람'], ['crypto', '데이터 분류 · 암호화'], ['perf', '성능 · 부하 시험'], ['mig', '무들 이관'], ['manual', '영문 매뉴얼']];
  const PIR = { grade: '성적 처리', counsel: '학업 상담', attendance: '출결 확인', scholarship: '장학 심사', legal: '법령상 요청', support: '학생 지원', other: '기타(직접 입력)' };
  const PIF = { name: '이름', phone: '휴대전화', email: '이메일', address: '주소', birth: '생년월일', grade: '성적', counsel: '상담 기록' };
  const GRN = { auth: '인증 정보', pii_unique: '고유식별정보', pii: '개인정보', sensitive: '민감 · 중요', internal: '내부', public: '공개' };
  const MTH = { aria_two_way: 'ARIA 양방향(복호화 가능)', sha256_one_way: 'SHA-256 단방향', scrypt_one_way: 'scrypt 단방향', hmac_index: 'HMAC 색인', mask: '가림(마스킹)', none: '암호화 안 함' };
  const fmtB = n => n >= 1073741824 ? (n / 1073741824).toFixed(2) + 'GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : n >= 1024 ? Math.round(n / 1024) + 'KB' : (n || 0) + 'B';
  /* 탭 묶음(화면 4개 + 더보기) — 묶음 안 화면은 한 페이지에 차례로 보여 준다. UI.lmspT 값(lang · a11y · …)은 예전 그대로 */
  const GRP = [['lang', '화면 · 언어', ['lang', 'a11y']], ['sec', '보안 · 개인정보', ['sec', 'pii', 'crypto']], ['upload', '파일 · 에디터', ['upload', 'editor']], ['mig', '데이터 이관', ['mig', 'kocw']]];
  const GMORE = [['perf', '성능 · 부하 시험(기술 담당)'], ['manual', '영문 매뉴얼']];
  const gOf = id => GRP.find(g => g[2].includes(id)) || null;
  VIEWS.lmsp = LMP.guard(() => {
    const t0 = UI.lmspT || 'lang'; const G = gOf(t0); const adm = LMP.isAdm(); const U = LMP.ux;
    const alias = Object.fromEntries(GRP.flatMap(g => g[2].map(id => [id, g[0]])));
    const top = head('공통 설정', '화면 언어 · 접근성, 관리자 보안 · 개인정보 열람, 파일 · 에디터, 다른 시스템 자료 이관을 한곳에서 정합니다.') + (U ? U.tabs('lmspT', GRP.map(g => [g[0], g[1]]), GMORE, t0, alias) : tabs('lmspT', TABS, t0));
    const ids = G ? G[2] : [t0];
    return top + lmspTodo(G ? G[0] : t0, adm) + ids.map((id, i) => { const h = lmspPart(id, adm); return i && (id === 'crypto') ? U.fold('lmsp-' + id, '데이터 분류 · 암호화', h, '기술 담당자용 · 데이터 종류별 암호화 방식') : h; }).join('');
  });
  /* 지금 할 일(묶음별 한 줄) */
  function lmspTodo(g, adm) { const U = LMP.ux; if (!U) return '';
    if (g === 'lang') { const cl = LMP.load('p:cls', 'p', 'cls.langs', {}); const o = a11y(); const L = (cl && cl.items) || []; return U.todo([[(LG.find(x => x[0] === curLang().replace('zh-CN', 'zh')) || LG[0])[1], '화면 언어'], [L.filter(c => c.lang !== 'ko').length, '외국어 강의실'], [['hc', 'lg', 'rm'].filter(k => o[k]).length, '접근성 모드 켜짐']]); }
    if (g === 'sec') { const s = LMP.load('p:adm', 'p', 'admin.status', {}, true); const st = adm ? LMP.load('p:pii', 'p', 'pii.stats', {}) : null; return U.todo([[s && s.active ? '켜짐' : '꺼짐', '관리자 모드', s && s.active ? 'y' : ''], [((s && s.fails) || 0) + '/5', '연속 실패', s && s.fails ? 'r' : ''], [st ? st.total : 0, '개인정보 열람 기록']]); }
    if (g === 'upload') { const r = LMP.load('p:up', 'p', 'upload.recent', {}); return U.todo([[((r && r.items) || []).length, '최근 파일'], [UI.lmspDraftMsg ? '저장됨' : '자동', '임시저장']], '<label class="btn pri sm" for="lmspFile">파일 올리기</label>'); }
    if (g === 'mig') { const r = adm ? LMP.load('p:mig', 'p', 'mig.runs', {}) : null; const R2 = (r && r.items) || []; return U.todo([[R2.length, '이관 기록'], [R2.filter(x => !x.report.ok).length, '확인 필요', R2.some(x => !x.report.ok) ? 'y' : '']], UI.lmspMig ? '' : '<label class="btn pri sm" for="lmspMbz">무들 백업 파일 고르기</label>'); }
    if (g === 'perf') return U.todo([[PERF_RESULTS.length, '측정 기록'], [Math.min(...PERF_RESULTS.map(x => x.result.under_3s_pct)) + '%', '3초 이내 응답']]);
    return '';
  }
  function lmspPart(tb, adm) { let b = '';
    if (tb === 'lang') { const p = LMP.load('p:pref', 'p', 'pref.get', {}); const cl = LMP.load('p:cls', 'p', 'cls.langs', {}); const cur = curLang().replace('zh-CN', 'zh');
      b = `<div class="card"><div class="ch"><b>내 화면 언어</b><small>메뉴 · 화면 제목 · 공통 버튼(한 · 영 · 일 · 중). 상단 언어 선택과 같습니다</small></div><div class="lmp-langbtn" role="radiogroup" aria-label="화면 언어">${LG.map(([k, n]) => `<button role="radio" aria-checked="${cur === k}" class="btn sm ${cur === k ? 'on' : ''}" data-act="lmsp-lang" data-v="${k}" lang="${k}">${n}</button>`).join('')}</div><p class="mini">저장된 언어: ${esc((p && p.lang) || 'ko')} · 학습자는 학습자 포털에서 직접 고릅니다.</p></div>
        <div class="card"><div class="ch"><b>강의실 언어</b><small>외국인 유학생 · 영어 강의 분반 — 강의실 안내문 · 메뉴를 이 언어로 보여 줍니다</small></div>${table(['강의실', '언어', ''], ((cl && cl.items) || []).map(c => [esc(c.title), `<select data-chg="lmsp-cl" data-id="${esc(c.section_id)}" aria-label="${esc(c.title)} 언어">${LG.map(([k, n]) => `<option value="${k}" ${c.lang === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`, c.lang !== 'ko' ? tag(c.lang.toUpperCase()) : '']), '강의실이 없습니다.')}</div>`; }
    if (tb === 'a11y') { const o = a11y(); const ck = (k, l, d) => `<label class="ul-ck"><input type="checkbox" data-chg="lmsp-a11y" data-k="${k}" ${o[k] ? 'checked' : ''}> <b>${l}</b> <span class="mini">${d}</span></label>`;
      b = `<div class="card"><div class="ch"><b>접근성 · 유니버설 디자인</b><small>저시력 · 시각 · 청각 · 노인 사용자</small></div>${ck('hc', '고대비', '검정 · 흰색 대비 7:1 이상, 굵은 테두리 · 노란 포커스')}${ck('lg', '큰 글자', '본문 118% 확대, 작은 글씨 최소 14.5px')}${ck('rm', '움직임 줄이기', '애니메이션 · 전환 효과 끄기(OS 설정도 따름)')}
        <p class="mini">「본문 바로가기」 링크는 Tab 키를 처음 누르면 나타납니다. 모든 버튼은 키보드로 쓸 수 있고, 표에는 머리글, 입력 칸에는 라벨, 상태 변화는 화면낭독기 알림(aria-live)으로 전합니다.</p></div>
        <div class="card"><div class="ch"><b>점검 항목</b><small>KWCAG 2.2 · W3C 검증 · 브라우저 3종(Chrome · Edge · Safari)</small></div>${[['대체 텍스트 · 아이콘 라벨', '적용'], ['키보드 접근 · 포커스 표시', '적용'], ['색 대비 4.5:1(고대비 모드 7:1)', '적용'], ['화면 확대 200%에서 가로 넘침 없음(390px)', '적용'], ['동영상 자막(AI 자동 자막)', '적용'], ['W3C 마크업 검증 · 인증 심사', '구축 시 심사(연동 제외)']].map(([k, v]) => `<div class="row"><span>${k}</span>${tag(v, v === '적용' ? '' : 'y')}</div>`).join('')}</div>`; }
    if (tb === 'upload') { const r = LMP.load('p:up', 'p', 'upload.recent', {}); const u = UI.lmspUp;
      b = `<div class="card"><div class="ch"><b>파일 올리기</b><small>끌어다 놓기 · 여러 파일 · zip은 내용 목록을 미리 봅니다 · 100MB까지</small></div><div class="lmp-drop" id="lmspDrop" tabindex="0" role="button" aria-label="파일을 끌어다 놓거나 눌러서 고르기">여기에 파일을 끌어다 놓거나 <label class="btn sm">파일 고르기<input type="file" id="lmspFile" multiple hidden></label></div>
        ${u ? `<div class="card" aria-live="polite"><div class="ch"><b>${esc(u.name)}</b><small>${fmtB(u.size)} · ${u.done ? '완료' : '처리 중'}</small></div><div class="lmp-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${u.pct}"><i style="width:${u.pct}%"></i></div><p class="mini">${u.pct}% · 무결성 SHA-256 ${esc(u.sha ? u.sha.slice(0, 16) + '…' : '계산 중')}</p>${u.entries ? `<p class="mini"><b>zip 내용 ${u.entries.length}개</b></p>${table(['파일', '크기'], u.entries.slice(0, 15).map(e => [esc(e.name), fmtB(e.size)]))}${u.preview ? `<pre class="lmp-pre">${esc(u.preview)}</pre>` : ''}` : ''}</div>` : ''}
        <p class="mini">기관 전용 파일 저장소에 나눠 저장합니다. 실행 파일은 막고, 문서 · 이미지 · 음성 · 동영상 · 압축 파일만 100MB까지 올립니다. 클라우드 드라이브 연결은 연동 후 동작합니다.</p></div>
        <div class="card"><div class="ch"><b>최근 파일</b></div>${table(['이름', '크기', '올린 시각', ''], ((r && r.items) || []).map(x => [`${esc(x.name)}<small class="mini lmp-sub">${esc([x.mime, x.entries ? 'zip 안 ' + x.entries + '개' : ''].filter(Boolean).join(' · '))}</small>`, fmtB(x.size), esc(LMP.ts(x.at)), `<button class="btn sm" data-act="lmsp-dl" data-id="${esc(x.id)}">내려받기</button>`]), '아직 올린 파일이 없습니다. 위 칸에 파일을 끌어다 놓으세요.')}</div>`; }
    if (tb === 'editor') { const v = UI.lmspEd != null ? UI.lmspEd : '이차방정식의 근: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$\n\n$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$\n\n에너지: $E = mc^2$, 각도 $\\theta \\le \\pi$';
      b = `<div class="grid g2"><div class="card"><div class="ch"><b>글쓰기 에디터 · 수식</b><small>$…$ 사이에 수식을 쓰면 오른쪽에 바로 그려집니다 · 이미지 · 동영상은 위 「파일 올리기」</small></div><div class="bar2"><button class="btn sm" data-act="lmsp-ins" data-v="$\\frac{a}{b}$">분수</button><button class="btn sm" data-act="lmsp-ins" data-v="$\\sqrt{x}$">√</button><button class="btn sm" data-act="lmsp-ins" data-v="$x^{2}$">x²</button><button class="btn sm" data-act="lmsp-ins" data-v="$\\sum_{i=1}^{n}$">∑</button><button class="btn sm" data-act="lmsp-ins" data-v="$\\int_{a}^{b}$">∫</button></div>
        <textarea id="lmspEd" rows="10" aria-label="본문(LaTeX 수식 사용 가능)" style="width:100%">${esc(v)}</textarea><div class="bar2"><button class="btn sm" data-act="lmsp-draft">임시저장</button><button class="btn sm" data-act="lmsp-load">불러오기</button><span class="mini" id="lmspDraftMsg">${esc(UI.lmspDraftMsg || '30초마다 자동 임시저장')}</span></div></div>
        <div class="card"><div class="ch"><b>미리보기</b><small>학생에게 보이는 모양</small></div><div id="lmspPrev" class="lmp-texdoc">${texDoc(v)}</div></div></div>`; }
    if (tb === 'kocw') b = `<div class="card"><div class="ch"><b>KOCW 공개 강의 등록 파일</b><small>강의명 · 학수번호 · 학기 · 언어 · 주차별 차시를 KOCW 등록 양식으로 내보냅니다</small></div><div class="bar2"><input id="lmspTerm" placeholder="학기(예: 2026-2, 비우면 전체)" aria-label="학기"><button class="btn" data-act="lmsp-kocw" ${adm ? '' : 'disabled'}>등록 파일(XML) 내려받기</button></div><p class="mini">교수명은 학사 조회 값을 쓰며 디디쌤은 저장하지 않습니다. KOCW 자동 전송은 연동 후 동작합니다.</p></div>`;
    if (tb === 'sec') { const s = LMP.load('p:adm', 'p', 'admin.status', {}, true);
      b = `<div class="card"><div class="ch"><b>관리자 모드(한 번 더 확인)</b><small>관리 기능에 들어갈 때 비밀번호를 다시 묻습니다 · 5회 틀리면 10분 잠금 · 같은 계정 동시 접속 차단</small></div>${s && s.active ? `<div class="lmp-banner" role="status">${tag('관리자 모드')} ${esc(LMP.ts(s.expires_at))}까지 <button class="btn sm" data-act="lmsp-admout">나가기</button></div>` : `<div class="form2"><label>비밀번호 다시 입력<input type="password" id="lmspPw" autocomplete="current-password" maxlength="200"></label></div><div class="bar2"><button class="btn pri" data-act="lmsp-adm" ${adm ? '' : 'disabled'}>관리자 모드 들어가기</button></div>`}
        <div class="kpis">${kpi('최종 접속', s && s.last_login ? LMP.ts(s.last_login.at) : '—', s && s.last_login ? 'IP ' + s.last_login.ip : '')}${kpi('직전 접속', s && s.prev_login ? LMP.ts(s.prev_login.at) : '—', s && s.prev_login ? 'IP ' + s.prev_login.ip : '')}${kpi('연속 실패', ((s && s.fails) || 0) + '/5', s && s.locked ? '잠김' : '')}</div>
        <p class="mini">학교 기본 로그인(SSO)은 그대로 두고, 관리 기능에 들어갈 때 한 번 더 확인합니다. 다중 신분(학생 · 조교 · 직원) 선택과 개인정보 동의 갱신은 학내 SSO 연동 후 동작합니다.</p></div>`; }
    if (tb === 'pii') { const st = adm ? LMP.load('p:pii', 'p', 'pii.stats', {}) : null;
      b = `<div class="card"><div class="ch"><b>개인정보 열람</b><small>사유를 남겨야 열람할 수 있고, 모든 열람은 기록됩니다</small></div><div class="form2"><label>대상 학번<input id="lmspPiT" placeholder="20261001"></label><label>사유<select id="lmspPiR">${Object.entries(PIR).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label></div><label class="fl">사유 상세<input id="lmspPiX" maxlength="300" placeholder="기타일 때 5자 이상"></label>
        <fieldset class="lmp-fs"><legend>열람 항목</legend>${Object.entries(PIF).map(([k, v]) => `<label class="ul-ck in"><input type="checkbox" name="lmspPiF" value="${k}" ${k === 'name' ? 'checked' : ''}> ${v}</label>`).join('')}</fieldset><button class="btn" data-act="lmsp-pii">사유 남기고 열람</button>${UI.lmspPiiMsg ? `<p class="mini" role="status">${esc(UI.lmspPiiMsg)}</p>` : ''}</div>` +
        (st ? `<div class="kpis">${kpi('열람(30일)', st.total + '건')}${Object.entries(st.by_reason).slice(0, 3).map(([k, v]) => kpi(PIR[k] || k, v + '건')).join('')}</div><div class="grid g2"><div class="card"><div class="ch"><b>사유별 · 항목별</b></div>${Object.entries({ ...Object.fromEntries(Object.entries(st.by_reason).map(([k, v]) => [PIR[k] || k, v])), ...Object.fromEntries(Object.entries(st.by_field).map(([k, v]) => ['항목 ' + (PIF[k] || k), v])) }).map(([k, v]) => `<div class="row"><span>${esc(k)}</span><b>${v}</b></div>`).join('') || '<div class="empty">기록이 없습니다.</div>'}</div>
          <div class="card"><div class="ch"><b>열람자별</b></div>${(st.by_actor || []).map(a => `<div class="row"><span>${esc(a.actor)}</span><b>${a.n}</b></div>`).join('') || '<div class="empty">기록이 없습니다.</div>'}</div></div><div class="card"><div class="ch"><b>열람 이력</b></div>${table(['시각', '대상', '사유', '열람자'], (st.recent || []).map(x => [esc(LMP.ts(x.at)), `${esc(x.target)}<small class="mini lmp-sub">${esc((x.fields || []).map(f => PIF[f] || f).join(', '))}</small>`, `${esc(PIR[x.reason] || x.reason)}${x.text ? `<small class="mini lmp-sub">${esc(x.text)}</small>` : ''}`, esc(x.actor)]), '기록이 없습니다.')}</div>` : ''); }
    if (tb === 'crypto') { const c = adm ? LMP.load('p:cr', 'p', 'crypto.status', {}) : null; const a = c && c.adapter;
      b = c ? `<div class="card"><div class="ch"><b>암호화 모듈</b><small>기관이 쓰는 검증필 암호모듈(ARIA)을 끼우는 자리</small></div><div class="row"><span>현재 어댑터</span><span>${esc(a.id)} · ${esc(a.alg)} ${a.certified ? tag('검증필') : tag('임시(검증필 아님)', 'y')}</span></div><div class="row"><span>목표</span><span>${esc(a.target)}</span></div><div class="row"><span>키 · 자체 점검</span><span>${a.ready ? tag('키 준비') : tag('키 없음', 'r')} ${a.selftest ? tag('암 · 복호화 통과') : tag('점검 실패', 'r')}</span></div><p class="mini">구축 단계에서 기관의 검증필 ARIA 모듈로 바꿉니다(제품 구매는 연동 제외).</p></div>
        <div class="card"><div class="ch"><b>데이터 종류별 암호화 방식</b></div>${table(['데이터', '등급', '처리'], (c.classes || []).map(x => [`${esc(x.item)}<small class="mini lmp-sub">${esc(x.location)}</small>`, tag(GRN[x.grade] || x.grade, /pii|auth|sensitive/.test(x.grade) ? 'r' : ''), `${esc(MTH[x.method] || x.method)}${[x.module, x.note].filter(Boolean).length ? `<small class="mini lmp-sub">${esc([x.module, x.note].filter(Boolean).join(' · '))}</small>` : ''}`]))}</div>` : '<div class="empty">관리자만 볼 수 있습니다.</div>'; }
    if (tb === 'perf') { const d = LMP.load('p:perf', 'p', 'perf.list', {}); const L = ((d && d.items) || []).length ? d.items : PERF_RESULTS;
      b = `<div class="card"><div class="ch"><b>성능 기준</b><small>기술 담당자용</small></div>${[['응답 시간', '주요 화면 · API 3초 이내(95백분위)'], ['규모', '구성원 3만 명 · 출석 피크 동시 3,000명'], ['대량 조회', '로그 · 통계는 기간 · 쪽(100건) 단위 조회, 2년 넘는 범위는 막음'], ['무중단 · 자동 복구', '무상태 API 다중화 · DB 연결 재시도 · 헬스 체크(/api/health) 실패 시 재기동 — 학내 클라우드 이중화는 연동 제외']].map(([k, v]) => `<div class="row"><span>${k}</span><span class="mini">${v}</span></div>`).join('')}</div>
        <div class="card"><div class="ch"><b>출석이 몰릴 때 시험 결과</b><small>3,000명이 동시에 출석하는 상황</small></div>${table(['측정', '성공', '95% 응답', '3초 이내'], L.map(x => [`${esc(x.name)}<small class="mini lmp-sub">${esc((x.params && (x.params.scale || '')) || '')} · 중간 ${x.result.p50_ms}ms · 99% ${x.result.p99_ms}ms · 최대 ${x.result.max_ms}ms · 초당 ${x.result.rps}건</small>`, `${num(x.result.ok)} <small class="mini">DB ${num(x.result.recorded_in_db)}</small>`, x.result.p95_ms + 'ms', x.result.under_3s_pct + '%']))}<p class="mini">2코어 · 공유 장비(다른 작업과 함께)에서 잰 값입니다. 운영 장비(WEB/WAS 6vCore × 2) 기준 재측정은 구축 단계에서 합니다.</p></div>`; }
    if (tb === 'mig') { const r = adm ? LMP.load('p:mig', 'p', 'mig.runs', {}) : null; const v = adm ? LMP.load('p:vid', 'p', 'mig.videos', {}) : null; const pv = UI.lmspMig;
      b = `<div class="card"><div class="ch"><b>무들(Moodle) 백업 이관</b><small>예전 LMS 백업 파일(.mbz)로 강좌 · 교수 · 학생(학번만) · 수강 · 게시물 · 과제 · 자료를 옮깁니다</small></div><div class="bar2"><label class="btn">백업 파일(.mbz) 고르기<input type="file" id="lmspMbz" accept=".mbz,.tar.gz,.tgz" hidden></label><input id="lmspMigTerm" placeholder="학기(비우면 MIG-연도)" aria-label="이관 학기">${pv ? '<button class="btn pri" data-act="lmsp-migrun">이관 실행</button>' : ''}</div>
        ${pv ? `<div class="card"><div class="ch"><b>미리보기 — ${esc(pv.course.fullname)}</b><small>${esc(pv.file)}</small></div>${[['사용자', pv.users.length + `명 (학번 없음 ${pv.users.filter(u => !(u.idnumber || u.username)).length}명)`], ['수강 · 교수', pv.enrolments.length + '건'], ['게시판 · 게시물', pv.forums.length + '개 · ' + pv.forums.reduce((a, f) => a + f.posts.length, 0) + '건'], ['과제', pv.assignments.length + '개'], ['자료 · 동영상', pv.resources.length + '개 · ' + pv.resources.filter(x => /^video\//.test(x.mimetype)).length + '개']].map(([k, x]) => `<div class="row"><span>${k}</span><b>${x}</b></div>`).join('')}<p class="mini">이름 · 이메일은 읽지 않고 버립니다.</p></div>` : ''}
        <p class="mini">큰 백업 파일은 기술 담당자가 서버 도구(moodle-mbz.js)로 올립니다.</p></div>` +
        ((r && r.items) || []).slice(0, 5).map(x => { const c = x.report.counts || {}; return `<div class="card"><div class="ch"><b>검증 리포트 #${x.run_id} · ${esc((x.report.course || {}).title || '')}</b><small>${esc(LMP.ts(x.at))} · ${esc(x.file)}</small>${x.report.ok ? tag('일치') : tag('확인 필요', 'y')}</div>${table(['항목', '원본', '이관', '제외 · 비고'], [['사용자', c.users && c.users.source, c.users && c.users.imported, c.users && c.users.skipped], ['수강 · 교수', c.enrolments && c.enrolments.source, c.enrolments && c.enrolments.imported, c.enrolments && c.enrolments.skipped], ['게시물', c.posts && c.posts.source, c.posts && c.posts.imported, c.posts && c.posts.no_author ? '작성자 없음 ' + c.posts.no_author : ''], ['과제', c.assignments && c.assignments.source, c.assignments && c.assignments.imported, ''], ['자료(동영상)', c.resources && c.resources.source, c.resources && c.resources.imported, c.resources && c.resources.videos ? '동영상 ' + c.resources.videos : '']].map(rw => rw.map(z => esc(z == null ? '—' : z))))}${(x.report.issues || []).map(i => `<p class="mini">⚠ ${esc(i.issue)}</p>`).join('')}<p class="mini">저장 결과 다시 확인: 수강 ${esc((x.report.verify || {}).enrolled_in_db)}건 · 강의 게시판 글 ${esc((x.report.verify || {}).board_posts_in_db ?? '—')}건(묶음 D) · 과제 ${esc((x.report.verify || {}).assignments_in_db ?? '—')}건(묶음 E) · 이관 기록 ${esc((x.report.verify || {}).objects_in_db)}건</p></div>`; }).join('') +
        (v && (v.items || []).length ? `<div class="card"><div class="ch"><b>동영상 이관 목록</b><small>${esc(v.note || '')}</small></div>${table(['이관', '제목', '파일', '크기'], v.items.map(x => ['#' + x.run_id, esc(x.title), esc(x.filename), fmtB(+x.filesize || 0)]))}</div>` : ''); }
    if (tb === 'manual') b = `<div class="card" lang="en"><div class="ch"><b>DiDiSam LMS — Administrator Quick Manual</b><small>English</small></div>
      <p><b>1. Calendar.</b> <i>Talk › Unified calendar</i> shows academic, course and personal events. Use <i>iCal export</i> to subscribe from phone, Outlook or Google Calendar.</p>
      <p><b>2. Messages.</b> <i>Talk › Direct messages</i> supports 1:1, group and broadcast rooms with read receipts. Members are identified by student/staff number only.</p>
      <p><b>3. Notifications.</b> <i>Talk › Notification rules</i> sets triggers (new resource, Q&amp;A, n hours before due, analytics) and quiet hours. Push/SMS/KakaoTalk are delivered by an external sender reading the outbound queue.</p>
      <p><b>4. System admin.</b> <i>Ops › System admin</i>: users (number, department, status), audited time-limited user switching (max 30 min), access statistics, log search, pop-ups/banners by user type, server monitoring with thresholds.</p>
      <p><b>5. Common settings.</b> Language (ko/en/ja/zh) per user and per classroom, accessibility modes (high contrast, large text, reduced motion), uploads with zip listing, LaTeX editor, KOCW XML export, admin step-up login (5 failures → 10-minute lock, one admin session at a time), PII access reasons, data classification and encryption adapter (ARIA connection point), load-test results and Moodle backup import.</p>
      <p><b>6. Mobile attendance.</b> <i>Learn › App attendance</i>: the instructor opens a 6-digit code; students check in from the learner app. Offline check-ins are queued and synced later.</p></div>`;
    return b;
  }
  ACT.lmspT = el => { UI.lmspT = el.dataset.v; render(); };
  ACT['lmsp-lang'] = async el => { const v = el.dataset.v; if (typeof I18N === 'function') { S.settings = S.settings || {}; S.settings.i18n = { ...I18N(), ui: LGMAP[v] }; save(); } await LMP.run('p', 'pref.save', { lang: v, a11y: a11y() }, v === 'ko' ? '화면 언어를 한국어로 바꿨습니다.' : `UI language: ${v}`, 'p:pref'); };
  ACT['lmsp-cl'] = el => LMP.run('p', 'cls.lang', { section_id: el.dataset.id, lang: el.value }, '강의실 언어를 저장했습니다.', 'p:cls');
  ACT['lmsp-a11y'] = el => { const o = a11y(); o[el.dataset.k] = el.checked; try { localStorage.setItem(A11Y_KEY, JSON.stringify(o)); } catch (e) { } applyA11y(o); LMP.run('p', 'pref.save', { lang: curLang().replace('zh-CN', 'zh').replace(/^(?!ko|en|ja|zh).*/, 'ko'), a11y: o }, null, 'p:pref'); render(); };
  /* 업로드 */
  /* 파일 저장소(단일): 묶음 E lms_file — POST /api/lms/e/file(조각 2MB · base64). 데모 모드는 브라우저 메모리에 보관 */
  const CHUNK = 2 * 1024 * 1024, MAXF = 100 * 1024 * 1024;
  const BAD_EXT = /\.(exe|bat|cmd|com|scr|js|vbs|ps1|sh|msi|jar|dll|apk|app)$/i;
  const OK_MIME = /^(image\/|audio\/|video\/|text\/|application\/(pdf|zip|x-zip-compressed|gzip|x-gzip|x-tar|json|xml|octet-stream|msword|vnd\.|haansoft|x-hwp|hwp))/i;
  LMP.fileOk = (name, mime) => BAD_EXT.test(name) ? '실행 파일은 올릴 수 없습니다.' : !OK_MIME.test(mime || 'application/octet-stream') ? `허용하지 않는 파일 형식입니다(${mime}).` : null;
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  LMP.BLOBS = LMP.BLOBS || {};
  LMP.putBlob = async (blob, name, mime) => { if (!LMP.live()) { const id = LMP.uuid(); LMP.BLOBS[id] = blob; return { file_id: id, name, mime, size: blob.size }; } return api('POST', '/api/lms/e/file', { name, mime, b64: b64(new Uint8Array(await blob.arrayBuffer())) }); };
  LMP.getBlob = async (id, mime) => { if (!LMP.live()) return LMP.BLOBS[id] || new Blob([]); const r = await api('GET', '/api/lms/e/file?id=' + encodeURIComponent(id)); const bin = atob(r.b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime || r.mime }); };
  LMP.saveBlob = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
  async function handleFiles(files) {
    for (const f of [...files].slice(0, 10)) {
      const mime = f.type || 'application/octet-stream'; const bad = LMP.fileOk(f.name, mime);
      if (bad) { toast(`${f.name}: ${bad}`, 'warn'); continue; } if (f.size > MAXF) { toast(`${f.name}: 파일은 100MB까지 올릴 수 있습니다.`, 'warn'); continue; } if (!f.size) { toast(`${f.name}: 빈 파일입니다.`, 'warn'); continue; }
      const u = UI.lmspUp = { name: f.name, size: f.size, pct: 0, done: false }; render();
      if (/\.zip$/i.test(f.name)) { try { u.entries = await zipList(f); const t = u.entries.find(e => /\.(txt|md|csv|json|c|py|js|html)$/i.test(e.name)); if (t) u.preview = await zipPreview(f, t).catch(() => null); } catch (e) { toast('zip 목록을 읽지 못했습니다: ' + e.message, 'warn'); } }
      const ids = []; const n = Math.ceil(f.size / CHUNK);
      try {
        for (let k = 0; k < n; k++) { const r = await LMP.putBlob(f.slice(k * CHUNK, (k + 1) * CHUNK), n > 1 ? `${f.name}.part${k + 1}` : f.name, mime); ids.push(r.file_id); u.pct = Math.min(99, Math.round((k + 1) / n * 100)); const bar = $('.lmp-prog i'); if (bar) bar.style.width = u.pct + '%'; const pb = $('.lmp-prog'); if (pb) pb.setAttribute('aria-valuenow', u.pct); }
      } catch (e) { toast(`${f.name}: 올리지 못했습니다 — ${e.message}`, 'warn'); UI.lmspUp = null; render(); continue; }
      if (f.size <= 64 * 1048576 && crypto.subtle) u.sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()))].map(x => x.toString(16).padStart(2, '0')).join('');
      u.pct = 100; u.done = true;
      await LMP.run('p', 'upload.add', { name: f.name, size: f.size, mime, sha256: n === 1 ? (u.sha || '') : '', file_ids: ids, entries: (u.entries || []).map(e => ({ name: e.name, size: e.size })) }, `${f.name}을(를) 파일 저장소에 올렸습니다(조각 ${n}개).`, 'p:up');
    }
  }
  ACT['lmsp-dl'] = async el => { try { const r = await LMP.call('p', 'upload.get', { id: el.dataset.id }); const parts = []; for (const id of r.chunks) parts.push(await LMP.getBlob(id, r.mime)); LMP.saveBlob(new Blob(parts, { type: r.mime }), r.name); } catch (e) { toast(e.message, 'warn'); } };
  LMP.handleFiles = handleFiles;
  document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('#lmspDrop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('#lmspDrop'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('#lmspDrop'); if (d) { e.preventDefault(); d.classList.remove('over'); handleFiles(e.dataTransfer.files); } });
  document.addEventListener('change', e => { if (e.target.id === 'lmspFile') handleFiles(e.target.files); if (e.target.id === 'lmspMbz') mbzPick(e.target.files[0]); });
  document.addEventListener('input', e => { if (e.target.id === 'lmspEd') { UI.lmspEd = e.target.value; const p = $('#lmspPrev'); if (p) p.innerHTML = texDoc(e.target.value); } });
  /* 에디터 */
  ACT['lmsp-ins'] = el => { const t = $('#lmspEd'); if (!t) return; const s = t.selectionStart || t.value.length; t.value = t.value.slice(0, s) + ' ' + el.dataset.v + ' ' + t.value.slice(t.selectionEnd || s); t.dispatchEvent(new Event('input', { bubbles: true })); t.focus(); };
  const saveDraft = async auto => { const t = $('#lmspEd'); if (!t) return; try { const r = await LMP.call('p', 'draft.save', { doc_key: 'editor:demo', body: t.value }); UI.lmspDraftMsg = `${auto ? '자동 ' : ''}임시저장 ${new Date().toTimeString().slice(0, 8)} · ${r.chars}자`; const m = $('#lmspDraftMsg'); if (m) m.textContent = UI.lmspDraftMsg; } catch (e) { toast(e.message, 'warn'); } };
  ACT['lmsp-draft'] = () => saveDraft(false);
  ACT['lmsp-load'] = async () => { try { const r = await LMP.call('p', 'draft.get', { doc_key: 'editor:demo' }); if (r.draft) { UI.lmspEd = r.draft.body; render(); toast('임시저장본을 불러왔습니다.', 'ok'); } else toast('임시저장본이 없습니다.'); } catch (e) { toast(e.message, 'warn'); } };
  setInterval(() => { if (CUR && CUR.tab === 'lmsp' && UI.lmspT === 'editor' && UI.lmspEd != null) saveDraft(true); }, 30000);
  /* KOCW */
  ACT['lmsp-kocw'] = async () => { const term = ($('#lmspTerm') || {}).value || ''; if (LMP.live()) { const a = document.createElement('a'); a.href = '/api/lms/p/kocw?term_id=' + encodeURIComponent(term); a.download = 'kocw-metadata.xml'; document.body.appendChild(a); a.click(); a.remove(); return; }
    const r = await LMP.call('p', 'kocw', { term_id: term }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.xml], { type: 'application/xml' })); a.download = 'kocw-metadata.xml'; document.body.appendChild(a); a.click(); a.remove(); toast(`KOCW 메타데이터(${r.courses}개 강좌)를 내려받았습니다.`, 'ok'); };
  /* 관리자 2차 로그인 */
  const TOKK = 'didisam.lms.admtok';
  const tokGet = () => { try { return sessionStorage.getItem(TOKK) || ''; } catch (e) { return ''; } };
  LMP.hdr = (b, op) => (b === 'p' && /^admin\./.test(op) && tokGet() ? { 'x-lms-admin': tokGet() } : null);
  const admLogin = async force => { const pw = ($('#lmspPw') || {}).value || ''; try { const r = await LMP.call('p', 'admin.login', { password: pw, force }); try { sessionStorage.setItem(TOKK, r.token); } catch (e) { } LMP.drop('p:adm'); render(); toast(r.last_login ? `관리자 모드 · 최종 접속 ${LMP.ts(r.last_login.at)} (${r.last_login.ip})` : '관리자 모드에 들어왔습니다.', 'ok'); }
    catch (e) { if (e.code === 'concurrent' || /다른 곳에서/.test(e.message)) modal('동시 접속', `<p>${esc(e.message)}</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '이어서 들어가기', kind: 'pri', run: () => { admLogin(true); } }]); else { toast(e.message, 'warn'); LMP.drop('p:adm'); render(); } } };
  ACT['lmsp-adm'] = () => admLogin(false);
  ACT['lmsp-admout'] = async () => { await LMP.run('p', 'admin.logout', {}, '관리자 모드에서 나왔습니다.', 'p:adm'); try { sessionStorage.removeItem(TOKK); } catch (e) { } };
  /* 개인정보 열람 */
  ACT['lmsp-pii'] = async () => { const r = await LMP.run('p', 'pii.view', { target: $('#lmspPiT').value.trim(), reason_code: $('#lmspPiR').value, reason_text: $('#lmspPiX').value, fields: $$('[name=lmspPiF]:checked').map(x => x.value) }, '열람 사유를 기록했습니다.', 'p:pii'); if (r) { UI.lmspPiiMsg = r.source; render(); } };
  /* 무들 */
  async function mbzPick(f) { if (!f) return; try { const b = new Uint8Array(await f.slice(0, 2).arrayBuffer()); const raw = b[0] === 0x1f && b[1] === 0x8b ? await gunzip(f) : new Uint8Array(await f.arrayBuffer()); UI.lmspMig = mbzPayload(untar(raw), f.name); render(); } catch (e) { toast('백업을 읽지 못했습니다: ' + e.message, 'warn'); } }
  LMP.mbzPick = mbzPick;
  ACT['lmsp-migrun'] = async () => { const p = UI.lmspMig; if (!p) return; const term = ($('#lmspMigTerm') || {}).value || ''; const r = await LMP.run('p', 'mig.import', { ...p, term_id: term || undefined }, r => `이관 #${r.run_id} 완료 — ${r.report.ok ? '원본과 일치' : '확인 필요 ' + r.report.issues.length + '건'}`, 'p:'); if (r) { UI.lmspMig = null; render(); } };

  /* ═════════ 포털 대시보드(SFR-090 · 091 · 065) ═════════ */
  const WID = { today: '오늘 수업', courses: '내 강좌', due: '다가오는 마감', dm: '안 읽은 메시지', inbox: '내 알림함', attendance: '출석 현황', advisees: '지도학생', links: '바로가기' };
  VIEWS['lmsp-portal'] = LMP.guard(() => {
    const d = LMP.load('p:portal', 'p', 'portal', {}); if (!d) return head('포털 대시보드') + (LMP.err('p:portal') ? `<div class="warn">${esc(LMP.err('p:portal'))}</div>` : '<div class="empty">불러오는 중…</div>');
    const L = UI.lmspLay || d.layout; const edit = !!UI.lmspEdit;
    const at = d.attendance || { total: 0, ok: 0, absent: 0 }; const rate = at.total ? Math.round(at.ok / at.total * 1000) / 10 : 0;
    const W = { today: () => (d.today || []).map(x => `<div class="row"><span>${esc(x.title)}</span><span class="mini">${esc(LMP.ts(x.at).slice(11))}</span></div>`).join('') || '<div class="empty">오늘 수업이 없습니다.</div>',
      courses: () => (d.courses || []).map(c => `<div class="row"><span>${esc(c.title)}</span><span class="mini">${c.students}명</span></div>`).join('') || '<div class="empty">강좌가 없습니다.</div>',
      due: () => (d.due || []).map(x => `<div class="row"><span>${esc(x.title)}</span><span class="mini">${esc(LMP.ts(x.at))}</span></div>`).join('') || '<div class="empty">2주 안 마감이 없습니다.</div>',
      dm: () => `<div class="lmp-code" style="font-size:32px">${d.dm_unread || 0}</div><a href="#" data-act="go" data-v="lmsl-dm">DM 채팅 열기</a>`,
      inbox: () => (d.inbox || []).map(x => `<div class="row"><span>${esc(x.title)}</span></div>`).join('') || '<div class="empty">새 알림이 없습니다.</div>',
      attendance: () => `<div class="lmp-meter">${bar(rate)} <b>${rate}%</b></div><p class="mini">인정 ${num(at.ok)} · 결석 ${num(at.absent)} / ${num(at.total)}건</p><svg viewBox="0 0 120 120" width="110" height="110" role="img" aria-label="출석률 ${rate}%"><circle cx="60" cy="60" r="48" fill="none" stroke="var(--soft)" stroke-width="14"/><circle cx="60" cy="60" r="48" fill="none" stroke="var(--mag)" stroke-width="14" stroke-dasharray="${(rate / 100 * 301.6).toFixed(1)} 301.6" transform="rotate(-90 60 60)"/></svg>`,
      advisees: () => table(['학번', '학과', '결석'], (d.advisees || []).map(a => [esc(a.member_no), esc(a.unit_code || ''), a.absent >= 3 ? tag(a.absent + '회', 'r') : a.absent + '회']), '지도학생이 없습니다.'),
      links: () => [['lmsl-cal', '통합 달력'], ['lmsl-noti', '알림 규칙'], ['lmsp-app', '앱 출석'], ['attend', '출결']].map(([id, l]) => `<a class="btn sm" href="#" data-act="go" data-v="${id}">${esc(tr(l))}</a>`).join(' ') + '<p class="mini">교내 사이트 바로가기는 연동 후 동작합니다.</p>' };
    const U = LMP.ux; const late = (d.advisees || []).filter(a => a.absent >= 3).length;
    return head('포털 대시보드', '학생 · 교수자 포털 첫 화면에 보일 칸을 고르고 순서를 바꿉니다. 사용자마다 따로 저장됩니다.', `<button class="btn ${edit ? 'pri' : ''}" data-act="lmsp-wedit">${edit ? '편집 끝내기 · 저장' : '보이는 칸 고르기'}</button>`) +
      (U && !edit ? U.todo([[(d.today || []).length, '오늘 수업'], [(d.due || []).length, '다가오는 마감'], [d.dm_unread || 0, '안 읽은 메시지'], [late, '결석 3회 이상 지도학생', late ? 'r' : '']], `<button class="btn pri sm" data-act="go" data-v="lmsp-app">출석 코드 열기</button>`) : '') +
      (edit ? `<div class="card"><div class="ch"><b>보일 칸 고르기</b></div>${Object.entries(WID).map(([k, v]) => `<label class="ul-ck in"><input type="checkbox" data-chg="lmsp-wtg" data-k="${k}" ${L.includes(k) ? 'checked' : ''}> ${esc(tr(v))}</label>`).join('')}</div>` : '') +
      `<div class="lmp-wgrid">${L.filter(k => W[k]).map((k, i) => `<div class="card" data-w="${k}"><div class="ch"><b>${esc(tr(WID[k]))}</b>${edit ? `<span><button class="btn sm" data-act="lmsp-wmv" data-k="${k}" data-d="-1" aria-label="${esc(WID[k])} 앞으로" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn sm" data-act="lmsp-wmv" data-k="${k}" data-d="1" aria-label="${esc(WID[k])} 뒤로">↓</button></span>` : ''}</div>${W[k]()}</div>`).join('')}</div>`;
  });
  ACT['lmsp-wedit'] = async () => { if (UI.lmspEdit && UI.lmspLay) { await LMP.run('p', 'widget.save', { layout: UI.lmspLay }, '위젯 배치를 저장했습니다.', 'p:portal'); UI.lmspLay = null; } UI.lmspEdit = !UI.lmspEdit; render(); };
  const lay = () => (UI.lmspLay = UI.lmspLay || [...((LMP.cache['p:portal'] && LMP.cache['p:portal'].v && LMP.cache['p:portal'].v.layout) || Object.keys(WID))]);
  ACT['lmsp-wtg'] = el => { const L = lay(); const k = el.dataset.k; UI.lmspLay = el.checked ? [...new Set([...L, k])] : L.filter(x => x !== k); render(); };
  ACT['lmsp-wmv'] = el => { const L = lay(); const i = L.indexOf(el.dataset.k); const j = i + (+el.dataset.d); if (i < 0 || j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; render(); };

  /* ═════════ 앱 출석(PWA · SFR-009 · 069 · 088) — 출석 규칙 · 인증번호 · 회전 QR의 원본은 묶음 G(/api/lms/g/*) ═════════
     교수자: G 코드 발급 · QR(G 부호기 W3.drawQR, rotate_sec마다 /g/qr 갱신) · 출석부(G roster)
     학생: 카메라 QR 스캔(BarcodeDetector, 없으면 인증번호 직접 입력) → 운영: P /att/checkin(학습자 세션 → G checkin) · 데모: G 데모 checkin(학번 입력)
     오프라인: 출석부에 모았다가 연결되면 items[]로 한 번에 보낸다 */
  const QK = 'didisam.lms.attq';
  const qGet = () => { try { return JSON.parse(localStorage.getItem(QK) || '[]'); } catch (e) { return []; } };
  const qSet = v => { try { localStorage.setItem(QK, JSON.stringify(v.slice(0, 50))); } catch (e) { } };
  const W3ok = () => typeof window.W3 === 'object' && W3.call;
  const G = (k, m, p, b) => (W3ok() ? W3.get(k, m, p, b) : undefined);
  let qrT = 0, scanStream = null, scanT = 0;
  const stopQR = () => { if (qrT) { clearInterval(qrT); qrT = 0; } };
  const stopScan = () => { if (scanT) { clearInterval(scanT); scanT = 0; } if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; } };
  AFTER.push(cur => { if (cur.tab !== 'lmsp-app') { stopQR(); stopScan(); } else { const c = $('#lmspQR'); if (c && UI.lmspOpen && W3ok() && W3.drawQR) W3.drawQR(c, UI.lmspOpen.qr); } });
  VIEWS['lmsp-app'] = LMP.guard(() => {
    if (!W3ok()) return head('앱 출석') + '<div class="warn">출결(묶음 G) 화면 모듈이 없습니다.</div>';
    const secs = G('p:g:secs', 'GET', '/api/lms/g/sections', {}); const L = Array.isArray(secs) ? secs : [];
    /* 데모: 분반이 없으면 출결 데모 분반을 바로 만든다(막다른 안내 없음) */
    if (Array.isArray(secs) && !L.length && !LMP.live() && LMP.isAdm() && W3.call) { if (!UI.lmspSeeding) { UI.lmspSeeding = 1; W3.call('POST', '/api/lms/g/seed', {}).catch(e => toast(e.message, 'warn')).finally(() => { UI.lmspSeeding = 0; W3.drop('p:g:'); render(); }); } return head('앱 출석') + '<div class="card"><p class="mini">샘플 분반 · 차시 · 수강생을 준비하고 있습니다…</p></div>'; }
    const sec = UI.lmspSec && L.find(x => x.section_id === UI.lmspSec) ? UI.lmspSec : (L[0] || {}).section_id;
    const ses = sec ? G('p:g:ses:' + sec, 'GET', '/api/lms/g/sessions', { section_id: sec }) : null; const SL = Array.isArray(ses) ? ses : [];
    const nowT = Date.now(); const near = SL.slice().sort((a, b) => Math.abs(Date.parse(a.starts_at) - nowT) - Math.abs(Date.parse(b.starts_at) - nowT))[0];
    const sid = UI.lmspSes && SL.find(x => x.session_id === UI.lmspSes) ? UI.lmspSes : (near || {}).session_id;
    const op = UI.lmspOpen && UI.lmspOpen.session_id === sid ? UI.lmspOpen : null; const Q = qGet(); const staff = LMP.isAdm() || S.me.role === 'teacher';
    const ros = sec && staff ? G('p:g:ros:' + sec, 'GET', '/api/lms/g/roster', { section_id: sec }) : null;
    const scan = 'BarcodeDetector' in window; const ndef = 'NDEFReader' in window, ble = !!navigator.bluetooth;
    const rs = ros && !ros.__err ? ((ros.sessions || []).find(x => x.session_id === sid) || null) : null;
    const U = LMP.ux; const td = U && L.length ? U.todo([[near ? `${near.week_no}주 ${near.seq}차시` : '—', '가까운 차시'], [rs ? (rs.present || 0) : '—', '출석'], [rs ? (rs.absent || 0) : '—', '결석', rs && rs.absent ? 'r' : ''], [Q.length, '오프라인 대기', Q.length ? 'y' : '']], staff ? `<button class="btn pri sm" data-act="lmsp-open">출석 코드 · QR 열기(3분)</button>` : '') : '';
    return head('앱 출석', '교수자가 출석 코드 · QR을 열면 학생이 휴대폰 앱에서 QR을 찍거나 인증번호로 출석합니다. 출석 규칙 · 기록은 「출결」 화면과 같습니다.') + td +
      (!L.length ? `<div class="card"><div class="empty">출석할 분반이 없습니다.${LMP.isAdm() && !LMP.live() ? ' <button class="btn sm" data-act="lmsp-gseed">출결 데모 분반 만들기</button>' : ''}</div></div>` :
      `<div class="bar2"><select data-chg="lmsp-sec" aria-label="분반">${L.map(x => `<option value="${esc(x.section_id)}" ${x.section_id === sec ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select><select data-chg="lmsp-ses" aria-label="차시">${SL.map(x => `<option value="${esc(x.session_id)}" ${x.session_id === sid ? 'selected' : ''}>${x.week_no}주 ${x.seq}차시 · ${esc(LMP.ts(x.starts_at))}</option>`).join('')}</select></div>
      <div class="grid g2">${staff ? `<div class="card"><div class="ch"><b>교수자 · 출석 코드 · QR</b><small>QR은 ${op ? op.rotate_sec : 15}초마다 바뀝니다(캡처 공유 방지)</small></div>${op ? '' : '<p class="mini">위 「출석 코드 · QR 열기」를 누르면 여기 인증번호와 QR이 나타납니다.</p>'}
        ${op ? `<div class="lmp-code" aria-live="polite" aria-label="인증번호 ${op.code.split('').join(' ')}">${esc(op.code)}</div><div style="text-align:center"><canvas id="lmspQR" width="220" height="220" role="img" aria-label="출석 QR"></canvas></div><p class="mini" style="text-align:center">${esc(LMP.ts(op.expires_at))}까지</p>` : ''}
        ${rs ? `<div class="kpis">${kpi('출석', (rs.present || 0) + '명')}${kpi('지각', (rs.late || 0) + '명')}${kpi('결석', (rs.absent || 0) + '명')}${kpi('공결', (rs.excused || 0) + '명')}</div>` : ''}</div>` : ''}
      <div class="card" style="max-width:440px"><div class="ch"><b>학생 앱 화면</b><small>${LMP.live() ? '학습자 포털 로그인으로 출석' : '데모: 학번을 넣어 학생처럼 출석해 봅니다'}</small></div>
        ${LMP.live() ? '' : `<label class="fl">데모 학번<input id="lmspMno" value="${esc(UI.lmspMno || '20269001')}" maxlength="20"></label>`}
        <div class="bar2">${scan ? '<button class="btn" data-act="lmsp-scan">📷 QR 찍기</button>' : '<span class="mini">이 브라우저는 QR 인식을 지원하지 않아 인증번호로 출석합니다.</span>'}</div>
        <video id="lmspCam" playsinline muted style="width:100%;max-height:240px;display:${UI.lmspScanning ? 'block' : 'none'};border-radius:8px" aria-label="QR 촬영 화면"></video>
        <label class="fl">인증번호(6자리)<input id="lmspCode" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" placeholder="000000"></label>
        <div class="bar2"><button class="btn ${staff ? '' : 'pri'}" data-act="lmsp-ck">출석하기</button><button class="btn sm" data-act="lmsp-ckoff">오프라인으로 저장</button></div>
        ${UI.lmspCkMsg ? `<p class="mini" role="status">${esc(UI.lmspCkMsg)}</p>` : ''}
        <div class="row"><span>오프라인 출석부</span><span>${Q.length}건 ${Q.length ? '<button class="btn sm" data-act="lmsp-sync">지금 보내기</button>' : ''}</span></div>
        ${U ? U.fold('lmsp-app-dev', '이 기기에서 쓸 수 있는 출석 방법', `<div class="row"><span>NFC 태그 · 블루투스 비콘</span><span class="mini">${ndef ? 'NFC 지원 기기' : 'NFC 미지원'} · ${ble ? '블루투스 지원' : '블루투스 미지원'} — 「출결」 화면에서 태그 · 비콘 등록 후 동작</span></div>
        <div class="row"><span>푸시 알림</span><span class="mini">${'Notification' in window ? `알림 권한: ${Notification.permission}` : '미지원'} — 알림함으로 받습니다</span></div>
        <div class="row"><span>앱 스토어 등록</span><span class="mini">설치형 웹앱(PWA)으로 동작 — 스토어 등록은 연동 제외</span></div>`) : ''}</div></div>`);
  });
  ACT['lmsp-gseed'] = async () => { await W3.act(() => W3.call('POST', '/api/lms/g/seed', {}), '출결 데모 분반을 만들었습니다.'); W3.drop('p:g:'); render(); };
  ACT['lmsp-sec'] = el => { UI.lmspSec = el.value; UI.lmspSes = null; UI.lmspOpen = null; stopQR(); render(); };
  ACT['lmsp-ses'] = el => { UI.lmspSes = el.value; UI.lmspOpen = null; stopQR(); render(); };
  const curSes = () => { const sel = $('[data-chg=lmsp-ses]'); return sel ? sel.value : UI.lmspSes; };
  ACT['lmsp-open'] = async () => { const sid = curSes(); if (!sid) return; const r = await W3.act(() => W3.call('POST', '/api/lms/g/code', { session_id: sid, ttl_sec: 180, rotate_sec: 15 }), '출석 코드 · QR을 열었습니다.'); if (!r) return;
    UI.lmspOpen = { ...r, session_id: sid }; stopQR(); render();
    qrT = setInterval(async () => { try { const q = await W3.call('GET', '/api/lms/g/qr', { session_id: sid }); if (UI.lmspOpen && UI.lmspOpen.session_id === sid) { UI.lmspOpen.qr = q.qr; const c = $('#lmspQR'); if (c && W3.drawQR) W3.drawQR(c, q.qr); } } catch (e) { stopQR(); } }, (r.rotate_sec || 15) * 1000); };
  /* 학생 출석: 운영 = P /att/checkin(학습자 세션 → G), 데모 = G 데모 checkin(학번) */
  const doCheckin = async b => { if (LMP.live()) return LMP.call('p', 'att.checkin', b); const mno = ($('#lmspMno') || {}).value || UI.lmspMno || ''; UI.lmspMno = mno; return W3.call('POST', '/api/lms/g/checkin', { ...b, member_no: mno, method: b.qr ? 'qr' : 'code' }); };
  const ckMsg = r => r.status === 'late' ? '지각으로 출석했습니다.' : '출석했습니다.';
  const submit = async b => { try { const r = await doCheckin(b); UI.lmspCkMsg = ckMsg(r); toast(UI.lmspCkMsg, 'ok'); W3.drop('p:g:ros'); } catch (e) { UI.lmspCkMsg = e.message; toast(e.message, 'warn'); } render(); };
  ACT['lmsp-ck'] = async () => { const code = ($('#lmspCode') || {}).value || ''; const sid = curSes(); if (!navigator.onLine) { qSet([...qGet(), { session_id: sid, code, offline_at: new Date().toISOString() }]); toast('오프라인입니다. 출석부에 저장했다가 연결되면 보냅니다.', 'warn'); render(); return; } await submit({ session_id: sid, code }); };
  ACT['lmsp-ckoff'] = () => { qSet([...qGet(), { session_id: curSes(), code: ($('#lmspCode') || {}).value || '', offline_at: new Date().toISOString() }]); toast('오프라인 출석부에 저장했습니다.', 'ok'); render(); };
  ACT['lmsp-scan'] = async () => {
    if (!('BarcodeDetector' in window)) return toast('QR 인식을 지원하지 않는 브라우저입니다. 인증번호를 입력하세요.', 'warn');
    try { const det = new BarcodeDetector({ formats: ['qr_code'] }); scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); UI.lmspScanning = 1; render(); const v = $('#lmspCam'); v.srcObject = scanStream; await v.play();
      scanT = setInterval(async () => { try { const c = await det.detect(v); const t = c && c[0] && c[0].rawValue; if (t && /^DDATT1\./.test(t)) { stopScan(); UI.lmspScanning = 0; const sid = t.split('.')[1]; await submit({ session_id: sid, qr: t, method: 'qr' }); } } catch (e) { } }, 400);
    } catch (e) { stopScan(); UI.lmspScanning = 0; render(); toast('카메라를 열 수 없습니다. 인증번호로 출석하세요. (' + e.message + ')', 'warn'); } };
  const sync = async () => { const Q = qGet(); if (!Q.length) return; try { let ok = 0; if (LMP.live()) { const r = await LMP.call('p', 'att.checkin', { items: Q }); ok = r.items.filter(x => x.ok).length; } else { for (const x of Q) { try { await doCheckin(x); ok++; } catch (e) { } } }
    qSet([]); toast(`오프라인 출석 ${Q.length}건 전송 — 인정 ${ok}건`, ok ? 'ok' : 'warn'); W3.drop('p:g:ros'); render(); } catch (e) { toast(e.message, 'warn'); } };
  ACT['lmsp-sync'] = sync; window.addEventListener('online', sync);

  /* 강의실 언어 표시(기존 강의실 화면 감싸기) */
  if (VIEWS.class) { const base = VIEWS.class; VIEWS.class = () => { const h = base(); try { if (!window.ULMS || !ULMS() || !S.lms || !S.lms.p) return h; const c = S.classes && S.classes.find(x => x.id === UI.cls); const lg = c && S.lms.p.clsLang[c.id]; return lg && lg !== 'ko' ? `<div class="lmp-banner" lang="${lg}">${tag('강의실 언어 ' + lg.toUpperCase())} ${esc(LG.find(x => x[0] === lg)[1])}</div>` + h : h; } catch (e) { return h; } }; }
})();
