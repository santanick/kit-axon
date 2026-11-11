'use strict';
/* v34 의도 실행형 AI SAM 측정 — Claude 키 없이(규칙 엔진) 유형 8개 × 의도 문장을 보내고
   ① 계획 카드(또는 설정 명령의 바로 처리)가 나오는지 ② [모두 실행] 뒤 데이터가 실제로 바뀌는지 ③ 오류 0 을 센다.
   빠진 값을 묻는 카드는 시트에 값을 넣고(명단은 붙여 넣기) 다시 만든 계획으로 실행한다. 금액 · 발송 확인 창은 [확인하고 실행]을 누른다.
   추가로 화면 추천 칩(화면당 3개)이 모두 답을 내는지 센다. 사용: node tests/ui/sam-intent.js [유형,...] */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
/* [문장, 기대] 기대: plan(계획 카드 → 실행 → 데이터 변경) · direct(설정 명령 — 바로 바뀜) */
const SET = {
  adult: [['다음 달 수강료 청구하고 미납자에게 안내해줘', 'plan'], ['엑셀 실무 4주 99,000원 강좌 만들고 홈페이지에 올리고 초대 링크 만들어줘', 'plan'], ['14일 미접속자에게 독려 메시지 보내줘', 'plan'], ['환불 신청 검토해줘', 'plan'], ['수료 기준 넘은 사람 수료증 발급', 'plan'], ['미답변 질문 답변 초안 만들어줘', 'plan'], ['배지 메뉴 켜줘', 'direct'], ['진도 30% 미만 수강생 독려하고 채점 대기 과제 AI 채점 초안 만들어줘', 'plan']],
  k12: [['다음 달 수강료 청구하고 미납자에게 안내해줘', 'plan'], ['오늘 결석생 보호자에게 알림', 'plan'], ['수업 2개 열고 홈페이지에 올려줘', 'plan'], ['미답변 질문 답변 초안 만들어줘', 'plan'], ['14일 미접속자에게 독려 메시지 보내줘', 'plan'], ['상담 메뉴 켜줘', 'direct'], ['기본 메뉴로', 'direct']],
  univ: [['이번 학기 강좌 3개 열고 수강생 엑셀로 등록해줘', 'plan'], ['AI 진단 안 한 학생에게 안내 보내줘', 'plan'], ['미답변 질문 답변 초안 만들어줘', 'plan'], ['채점 대기 과제 AI 채점 초안 만들고 진도 30% 미만 학생 독려해줘', 'plan'], ['수료 기준 넘은 사람 수료증 발급', 'plan'], ['14일 미접속 학생에게 독려 메시지 보내줘', 'plan'], ['배지 메뉴 켜줘', 'direct']],
  univ_lms: [['채점 대기 과제 AI 채점 초안 만들어줘', 'plan'], ['미답변 질문 답변 초안 만들어줘', 'plan'], ['14일 미접속 학생에게 독려 메시지 보내줘', 'plan'], ['데이터 분석 기초 강좌 만들고 초대 링크 만들어줘', 'plan'], ['수료 기준 넘은 사람 수료증 발급', 'plan'], ['진도 30% 미만 학생 독려하고 미답변 질문 답변 초안 만들어줘', 'plan']],
  corp: [['법정교육 미이수자에게 마감 안내 보내줘', 'plan'], ['수료 기준 넘은 사람 수료증 발급', 'plan'], ['신규 입사자 온보딩 과정 만들고 초대 링크 만들어줘', 'plan'], ['14일 미접속 임직원에게 독려 메시지 보내줘', 'plan'], ['리더십 과정 만들고 명단 엑셀로 등록해줘', 'plan'], ['법정교육 미이수자에게 마감 안내 보내고 수료증 발급해줘', 'plan'], ['자동 운영 미접속 복귀 안내 꺼줘', 'direct']],
  public: [['수료 기준 넘은 사람 수료증 발급', 'plan'], ['14일 미접속자에게 독려 메시지 보내줘', 'plan'], ['디지털 역량 기초 과정 만들고 홈페이지에 올려줘', 'plan'], ['미답변 질문 답변 초안 만들어줘', 'plan'], ['오늘 결석생에게 알림 보내줘', 'plan'], ['교육 일정 변경 공지 써줘', 'plan'], ['자동 운영 주간 리포트 꺼줘', 'direct']],
  lifelong: [['학습비 반환 신청 검토해줘', 'plan'], ['수료 기준 넘은 사람 수료증 발급', 'plan'], ['바리스타 2급 8주 120,000원 강좌 만들고 홈페이지에 올려줘', 'plan'], ['다음 달 학습비 청구하고 미납자에게 안내해줘', 'plan'], ['14일 미접속자에게 독려 메시지 보내줘', 'plan'], ['환불 신청 처리해줘', 'plan'], ['오늘 결석생에게 알림 보내줘', 'plan']],
  voc: [['출석률 80% 미만 훈련생에게 경고 보내줘', 'plan'], ['수료 기준 넘은 사람 수료증 발급', 'plan'], ['HRD 보고 준비하고 출석률 80% 미만 훈련생에게 경고 보내줘', 'plan'], ['오늘 결석생에게 알림 보내줘', 'plan'], ['웹개발 실무 과정 만들고 초대 링크 만들어줘', 'plan'], ['14일 미접속 훈련생에게 독려 메시지 보내줘', 'plan'], ['자동 운영 부정훈련 의심 꺼줘', 'direct']]
};
(async () => {
  const only = (process.argv[2] || '').split(',').filter(Boolean);
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(k => srv.listen(0, k)); const B = `http://127.0.0.1:${srv.address().port}`; const br = await chromium.launch();
  let claude = '', tot = 0, card = 0, changed = 0, errs = 0, chipN = 0, chipOk = 0; const bad = [];
  for (const ty of Object.keys(SET).filter(k => !only.length || only.includes(k))) {
    const p = await br.newPage({ viewport: { width: 1280, height: 900 } }); const pe = []; p.on('pageerror', e => pe.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.goto(B + '/index.html'); await p.waitForFunction(() => typeof createOrg === 'function');
    await p.evaluate(ty => { localStorage.clear(); localStorage.setItem('didisam.emptyStart', '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = false; const [t0, ed] = ty === 'univ_lms' ? ['univ', 'lms'] : [ty]; createOrg(t0, '측정기관', ed); }, ty); await p.waitForTimeout(700);
    /* 측정용 상황: 오늘 결석 1건 · 미답변 질문 1건 · 환불 신청 1건(없으면) */
    await p.evaluate(() => { try { if (S.org.type === 'k12' && ACT['crm-sample']) ACT['crm-sample'](); } catch (e) { }
      const c = S.classes.find(x => x.status === '운영중' && x.learners.length && W2.units(x).some(u => u.date === today())) || S.classes.find(x => x.status === '운영중' && x.learners.length);
      if (c) { let u = W2.units(c).find(x => x.date === today()); if (!u) { if (c.kind === 'episode') { c.sessions = c.sessions || []; c.sessions.push({ id: uid('ss'), n: c.sessions.length + 1, date: today(), from: '19:00', to: '21:00', title: '오늘 수업' }); } else c.curriculum.push({ id: uid('it'), type: 'offline', title: '오늘 실습', from: today() + 'T19:00', to: today() + 'T21:00' }); u = W2.units(c).find(x => x.date === today()); } if (u) { c.att = c.att || {}; c.attT = c.attT || {}; W2.set(c, u.id, c.learners[0], '결석', 'admin', true); } }
      if (!(S.posts || []).some(x => x.kind === '질문' && !x.replies)) (S.posts = S.posts || []).push({ id: uid('po'), kind: '질문', board: '질문', title: '과제 형식이 궁금합니다', who: (S.members[0] || {}).id, at: today(), likes: [], replies: 0 });
      if (S.classes[0] && S.members[0] && !(S.pays || []).some(x => x.status === '환불 신청')) (S.pays = S.pays || []).push({ id: uid('pay'), at: today(), who: S.classes[0].learners[0] || S.members[0].id, item: S.classes[0].name, amount: 99000, method: '카드', status: '환불 신청' });
      if (S.org.type === 'corp') S.classes.filter(x => x.legal).forEach(x => { const id = x.learners[0]; if (id) x.prog[id].p = 40; });
      S.classes.forEach(x => { const id = x.learners[1]; if (id) x.prog[id].p = 100; }); save(); });
    for (const [q, exp] of SET[ty]) { tot++; const e0 = pe.length;
      const fp = () => p.evaluate(() => { const o = {}; Object.keys(S).filter(k => !['chat', 'audit', 'ai', 'gsig'].includes(k)).forEach(k => { o[k] = S[k]; }); return JSON.stringify(o).length + ':' + JSON.stringify(o).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7); });
      const f0 = await fp();
      await p.evaluate(q => { UI.siN = S.chat.length; chatSend(q); }, q); await p.waitForFunction(() => S.chat.slice(UI.siN || 0).some(x => x && x.role === 'ai' && !x.typing && (x.plan || (x.btn && x.btn.act === 'si-fill') || !/단계를 마쳤습니다|빌드 단계|^「[^」]+」 단계/.test(String(x.text || '')))) && !S.chat.some(x => x && x.typing), null, { timeout: 5000 }).catch(() => { }); await p.waitForTimeout(60);
      /* FIXLIST 20: 보낸 뒤의 AI 답 중에서 고른다 — 화면을 다시 그릴 때 끼어드는 시작 가이드 '단계를 마쳤습니다' · 결제 연결 안내는 의도 답이 아니다 */
      const PICK = () => { const L = S.chat.slice(UI.siN || 0).filter(y => y.role === 'ai' && !y.typing); const isNoise = y => !y.plan && !(y.btn && y.btn.act === 'si-fill') && /단계를 마쳤습니다|빌드 단계|^「[^」]+」 단계/.test(String(y.text || ''));
        const x = L.find(y => y.plan) || L.find(y => y.btn && y.btn.act === 'si-fill') || L.filter(y => !isNoise(y)).pop() || L.pop() || {}; return { plan: x.plan || '', fill: x.btn && x.btn.act === 'si-fill' ? x.btn.v : '', title: x.title || x.text || '', si: !!x.si }; };
      let m = await p.evaluate(`(${PICK})()`);
      if (m.fill) { await p.evaluate(v => ACT['si-fill']({ dataset: { v } }), m.fill); await p.waitForTimeout(80);
        await p.evaluate(() => { const w = document.querySelector('#siForm'); w.querySelectorAll('textarea').forEach(t => { if (!t.value.trim()) t.value = S.org.type === 'univ' ? '학번,학과\n20269001,경영학과\n20269002,컴퓨터공학과' : '번호,이름,소속\nX9001,측정일,1반\nX9002,측정이,2반'; }); });
        await p.click('#slSheet [data-act="si-fill-ok"]'); await p.waitForTimeout(150);
        m = await p.evaluate(`(${PICK})()`); m.fill = ''; }
      let isCard = exp === 'direct' ? /메뉴|껐|켰|되돌/.test(m.title) : !!m.plan;
      if (exp === 'plan' && m.plan) { /* 화면에 보이는 [모두 실행] 버튼을 누른다(없으면 같은 동작을 직접) */
        await p.evaluate(v => { const b = [...document.querySelectorAll(`[data-act="plan-ok"][data-v="${v}"]`)].find(x => x.offsetParent); if (b) b.click(); else ACT['plan-ok']({ dataset: { v } }); }, m.plan);
        await p.waitForTimeout(120); if (await p.locator('#modal [data-mact="ok"]').count()) { await p.locator('#modal [data-mact="ok"]').click(); await p.waitForTimeout(150); } }
      const f1 = await fp(); const res = await p.evaluate(() => (S.chat.filter(y => y.role === 'ai').pop() || {}).text || '');
      const ch = f0 !== f1; const er = pe.length - e0 + (/실패/.test(res) ? 1 : 0);
      if (isCard) card++; if (ch) changed++; errs += er;
      if (!isCard || !ch || er) bad.push(`${ty} · ${q} → 카드 ${isCard ? 'O' : 'X'} · 변경 ${ch ? 'O' : 'X'} · 오류 ${er} | ${m.title.slice(0, 50)} | ${res.slice(0, 80)}`);
    }
    /* Claude 키가 있을 때: Claude가 run_intent 도구로 같은 엔진을 쓴다(호출을 흉내 냄 — 외부 요청 없음) */
    if (ty === 'adult') { const r = await p.evaluate(async () => { const on = CL.on, call = CL.call; let n = 0; CL.on = () => true;
        CL.call = async o => { n++; const u = { input_tokens: 1, output_tokens: 1 }; if (n === 1) return { tools: [{ id: 't1', name: 'run_intent', input: { command: '14일 미접속자에게 독려 메시지 보내고 미답변 질문 답변 초안 만들어줘' } }], content: [{ type: 'tool_use', id: 't1', name: 'run_intent', input: {} }], text: '', usage: u, model: 'mock' }; return { tools: [], content: [], text: '승인하시면 실행됩니다.', usage: u, model: 'mock' }; };
        try { await chatSend('미접속자 독려하고 질문 답변 초안도'); } finally { CL.on = on; CL.call = call; }
        const m = S.chat.filter(x => x.plan).pop(); return { tool: !!(AG_TOOLS || []).find(x => x.name === 'run_intent'), steps: m && m.si ? m.si.length : 0 }; });
      if (r.tool && r.steps === 2) claude = 'Claude 경로(run_intent) 계획 카드 확인'; else bad.push('adult · Claude run_intent ' + JSON.stringify(r)); }
    /* 화면 추천 칩: 홈 + 필수 메뉴 화면마다 3개, 모두 답을 내야 한다 */
    /* v38 학사 LMS: 화면 칩이 그 질문에 맞는 실제 데이터 답(키워드)과 바로 가기(btn: go 화면)를 내는지까지 본다 */
    const EXP = ty === 'univ_lms' ? { sis: [/마지막 동기화|동기화 · 업로드 기록/, /^(sis)$/], lmsb: [/강의실 \d+곳|빈 주차|이번 학기 강의실/, /^(lmsb|lmsa)$/], lmsc: [/토론|위키|팀/, /^lmsc$/], lmsi: [/진도|강의 영상/, /^(lmsi|lmsv)$/],
      lmse: [/과제/, /^lmse$/], lmsj: [/결석|수강생/, /^(lmsj|lmsa)$/], groups: [/학과/, /^groups$/], lmsd: [/공지|Q&A|게시판/, /^lmsd$/], 'lmsl-cal': [/일정/, /^lmsl-cal$/], 'lmsl-noti': [/알림 규칙/, /^lmsl-noti$/],
      admins: [/운영자 \d+명/, /^admins$/], lmsm: [/사용자/, /^(lmsm|enroll)$/], lmso: [/AI 참고 자료|강의자료/, /^lmso$/], aigov: [/AI 사용 \d+회/, /^aigov$/], lmsg: [/출결 분반|출결을 받을 분반/, /^(lmsg|lmsa)$/], grade: [/평가 항목/, /^grade$/] } : {};
    const cr = await p.evaluate(EXP0 => { const EXP = Object.fromEntries(Object.entries(EXP0).map(([k, [a, b]]) => [k, [new RegExp(a), new RegExp(b)]])); const out = { n: 0, ok: 0, bad: [], home: (typeof aihChips === 'function' ? aihChips() : []).length, chk: 0 };
      ['dash', ...slimEss()].forEach(k => { let L = []; try { CUR.ws = k === 'dash' ? 'dash' : (MENU[k] || {}).ws || CUR.ws; CUR.tab = k === 'dash' ? '' : k; L = scxChips(k).slice(0, 3); } catch (e) { out.bad.push(k + ' ERR'); }
        L.forEach(c => { out.n++; let r = null; try { r = c.run() || {}; } catch (e) { out.bad.push(`${k}:${c.l} 오류 ${e.message}`); return; } if (r.plan && PLANS[r.plan]) delete PLANS[r.plan];
          if (/이해하지 못했습니다|처리할 수 없는/.test(r.text || '')) out.bad.push(`${k}:${c.l}`); else out.ok++;
          if (EXP[k] && /^md-|알려줘|상태|보여줘|현황|나눠줘|추가해줘/.test(c.id + ' ' + c.l) && r.btn && r.btn.act === 'go') { out.chk++; if (!EXP[k][0].test(r.text || '') || !EXP[k][1].test(r.btn.v || '')) out.bad.push(`${k}:${c.l} 답 내용 「${String(r.text).slice(0, 40)}」 바로 가기 ${r.btn.v}`); } }); });
        return out; }, Object.fromEntries(Object.entries(EXP).map(([k, [a, b]]) => [k, [a.source, b.source]])));
    if (ty === 'univ_lms' && cr.chk < 14) bad.push(`univ_lms · 칩 답 내용 점검 ${cr.chk}건(14건 이상이어야 함)`);
    chipN += cr.n; chipOk += cr.ok; cr.bad.forEach(b => bad.push(`${ty} · 칩 ${b}`)); if (cr.home !== 3) bad.push(`${ty} · 홈 칩 ${cr.home}개(3개여야 함)`);
    await p.close();
  }
  await br.close(); srv.close();
  console.log(`의도 ${tot}개 · 계획 카드 ${card}/${tot} · 실행 후 데이터 변경 ${changed}/${tot} · 오류 ${errs} · 성공률 ${Math.round((tot - bad.filter(b => !/칩/.test(b)).length) / tot * 1000) / 10}%`);
  console.log(`화면 추천 칩 ${chipOk}/${chipN} 동작`); if (claude) console.log(claude);
  bad.forEach(b => console.log('✗ ' + b));
  const fail = bad.length; console.log(fail ? `실패 ${fail}` : '모두 통과'); process.exit(fail ? 1 : 0);
})();
