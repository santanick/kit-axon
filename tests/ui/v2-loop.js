'use strict';
/* v46 D5: 학습 루프 템플릿 4종 · 개념 모델 · 채점 초안 + 승인 발송.
   꺼짐(기존 기관) 동작 불변 → 켜짐(S.aipol.on) 배치 · 수락 · 수정 · 되돌리기 · 직훈 차시 수 · 진도 불변 → 학습자 블록 · 잠금 · 미승인 숨김.
   사용: node tests/ui/v2-loop.js (필요: playwright) */
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/json' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('✓', m); } else { fail++; console.log('✗', m); } };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(o => srv.once('listening', o)); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const page = async (u) => { const ctx = await browser.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort()); await p.goto(base + u, { waitUntil: 'load' }); return { ctx, p, errs }; };
  try {
    /* ── 어드민 ── */
    const A = await page('/index.html');
    const r = await A.p.evaluate(async () => {
      const out = {}; const wait = ms => new Promise(o => setTimeout(o, ms));
      createOrg('univ', '루프 점검 대학', 'lite'); await wait(60); render();
      /* 채점 대기 3건 준비(루브릭 연결 과제) */
      { const g = CF.create({ name: '채점 점검 과정', weekPlan: [{ title: '보고서', goal: '' }], fillEmpty: true }); let it = g.curriculum.find(x => x.type === 'assign'); if (!it) { it = { id: 'asg1', type: 'assign', title: '보고서', week: 1 }; g.curriculum.push(it); } it.rubric = S.rubrics[0].id;
        for (let i = 1; i <= 3; i++) S.members.push({ id: 'mt' + i, name: '학습자' + i, sid: '2026000' + i, group: '', grade: '정회원', joined: today(), last: today(), extra: {} });
        S.members.slice(-3).forEach((m, i) => { g.prog[m.id] = { p: 50, assign: 'submitted', subAt: today(), sub: '문제 정의와 목표를 세우고 방법과 과정을 정리했습니다. 결과와 개선점, 근거 사례를 함께 적었습니다. '.repeat(i + 2) }; }); }

      /* 꺼짐: 기존과 같음 */
      out.offOn = LOOP2.on(); out.offIds = CF.stepIds().join(','); out.offIds0 = CF.steps.filter(s => s.id !== 'loop').map(s => s.id).slice(0, 5).join(',');
      const c0 = S.classes.find(c => Object.values(c.prog || {}).some(p => p.assign === 'submitted'));
      out.hasPend = !!c0; if (c0) { const id = Object.keys(c0.prog).find(k => c0.prog[k].assign === 'submitted'); ACT.grade({ dataset: { c: c0.id, v: id } }); out.offModal = !!document.querySelector('#modal .rg') && !document.querySelector('#modal .g2'); closeModal(); }
      go('assess'); render(); out.offAssess = !document.querySelector('.g2-box');
      const snap0 = lsSnapshot(); out.offSnap = !snap0.aipol && !(snap0.classes || []).some(x => x.loop);
      /* 켜짐 */
      S.aipol = { on: true, v: 1, lvl: 'L1', preset: { exam: 'L0', assign: 'L1' }, retain: 'term', evalNotice: true, train: false };
      out.onIds = CF.stepIds().join(',');
      const c = CF.create({ name: '데이터분석 기초', weekPlan: [{ title: '데이터와 변수', goal: '변수와 자료형을 이해한다. 자료를 표로 정리한다.' }, { title: '평균과 중앙값', goal: '' }, { title: '시각화 고르기', goal: '' }], fillEmpty: true }); c.open = '전체'; c.status = '운영중'; const nW = c.weekPlan.length, nI = c.curriculum.length, ids0 = c.curriculum.map(x => x.id).join();
      out.tpl = {}; for (const k of LOOP2.ORD) { LOOP2.apply(c, k); out.tpl[k] = c.weekPlan.every(w => w.loop && w.loop.steps.length === 4 && w.loop.st === 'draft') && c.weekPlan[0].loop.steps.map(s => s.k).join() === 'struggle,expand,reflect,check'; }
      out.concepts = (c.concepts || []).length >= nW && c.concepts.every(k => k.id && k.name && k.wk);
      S.aipol.max = 'L2'; LOOP2.apply(c, 'project'); out.capped = c.weekPlan.every(w => w.loop.steps.every(s => ['L0', 'L1', 'L2'].includes(s.lvl))); delete S.aipol.max;
      LOOP2.apply(c, 'concept'); const s1 = lsSnapshot(); out.draftHidden = !(s1.classes.find(x => x.id === c.id) || {}).loop;
      /* 과정 화면: 모두 수락 · 수정 · 루프 없이 · 되돌리기 */
      const w = ACT.loop2({ dataset: { v: c.id } }); out.modal = !!w.querySelector('.lp2-tp') && /템플릿을 고르면 모든/.test(w.textContent) && /기존 항목은 그대로 두고 단계만 추가합니다/.test(w.textContent);
      w.querySelector('[data-lp2tpl=practice]').click(); out.practice = c.loopTpl === 'practice' && c.weekPlan[0].loop.steps[1].lvl === 'L2';
      w.querySelector('[data-lp2off="2"]').click(); out.off2 = !!c.weekPlan[1].loop.off;
      w.querySelector('[data-lp2undo]').click(); out.undo = !c.weekPlan[1].loop.off;
      w.querySelector('[data-lp2edit="1"]').click(); const inp = w.querySelector('[data-lp2txt="1:0"]'); inp.value = '직접 쓴 씨름 질문입니다'; const ci = w.querySelector('[data-lp2cpt="1"]'); ci.value = '변수, 자료형'; w.querySelector('[data-lp2done="1"]').click();
      out.edited = c.weekPlan[0].loop.steps[0].txt === '직접 쓴 씨름 질문입니다' && c.concepts.filter(k => k.wk === 1).map(k => k.name).join() === '변수,자료형';
      LOOP2._fail = true; w.querySelector('[data-lp2tpl=practice]').click(); out.failMsg = /AI 초안을 만들지 못했습니다/.test(w.textContent) && c.weekPlan.every(w2 => w2.loop.steps.every(s => s.txt === '')); LOOP2._fail = false; w.querySelector('[data-lp2tpl=concept]').click();
      w.querySelector('[data-lp2all]').click(); out.accepted = c.weekPlan.every(x => x.loop.st === 'ok');
      out.kept = ids0.split(',').every(id => c.curriculum.some(x => x.id === id)); out.weeks = c.weekPlan.length === nW;
      out.checkMark = c.curriculum.filter(x => x.loop === 'check').length >= 1 && c.curriculum.filter(x => x.loop === 'check').every(x => x.cpt && x.type === 'quiz');
      closeModal(); const s2 = lsSnapshot(); const pc = s2.classes.find(x => x.id === c.id); out.pub = !!(pc && pc.loop && pc.loop.length === nW && s2.aipol && s2.aipol.on && pc.items.some(x => x.loop === 'check'));
      out.pubC = pc; out.added = c.curriculum.length - nI;
      /* 직훈: 차시 수 · 항목 수 · 진도 불변 */
      const v = { id: 'cv', name: '직훈', legal: true, weekPlan: [{ w: 1, title: '안전', goal: '안전 수칙을 이해한다.' }, { w: 2, title: '공구', goal: '' }], curriculum: [{ id: 'v1', type: 'video', week: 1 }, { id: 'v2', type: 'video', week: 2 }, { id: 'q2', type: 'quiz', week: 2, qs: [] }], prog: { m: { p: 50 } } };
      LOOP2.apply(v, 'practice'); LOOP2.accept(v); out.voc = v.curriculum.length === 3 && v.weekPlan.length === 2 && v.prog.m.p === 50 && v.curriculum[2].loop === 'check' && !v.weekPlan[0].loop.steps[3].item;
      /* 마법사 단계 */
      CF.open({ from: 'test' }); await wait(80); out.flowIds = CF.stepIds().join(','); CF.close(false);
      /* 채점 */
      go('assess'); render(); out.box = /AI 초안 — 확인 전에는 학습자에게 보이지 않습니다/.test(document.querySelector('#main').textContent);
      const P = pend(); out.pendN = P.length;
      if (P.length) { const { c: gc, id } = P[0]; const p = gc.prog[id]; const fb0 = p.fb, sc0 = p.score;
        out.draft = !!p.ai && p.fb === fb0 && p.score === sc0 && !p.fbSent;
        ACT['g2-send'](); out.noSendUnchecked = !p.fbSent;
        ACT.grade({ dataset: { c: gc.id, v: id } }); const m = document.querySelector('#modal'); out.g2modal = !!m.querySelector('.g2') && /점수는 교수자가 확정합니다/.test(m.textContent) && /확인 후 보내기/.test(m.textContent);
        m.querySelector('[name=g2res][value=graded]').checked = true; m.querySelector('[data-mact=ok]').click(); await wait(30);
        out.sent = !!p.fbSent && p.assign === 'graded' && p.score != null && p.aiTotal != null && !!p.fb;
        if (P[1]) { const q = P[1].c.prog[P[1].id]; q.ai.ok = true; q.ai.res = 'returned'; q.ai.fb = '근거를 보완하세요.'; const r2 = P[2] && P[2].c.prog[P[2].id]; ACT['g2-send'](); out.bulk = !!q.fbSent && q.assign === 'returned' && (!r2 || !r2.fbSent); }
        /* 다시 보내기 → 이력 · 알림 */
        const s0 = p.score; p.ai.ok = true; p.ai.fin = 10; p.ai.st = 'edit'; GRADE2.send(gc, id); out.resend = p.fbHist && p.fbHist[0].score === s0 && p.score === 10 && !!p.fbNew;
        /* 루브릭 없음 · 읽기 실패 */
        const it = asgItem(gc); const rb = it.rubric; delete it.rubric; out.noRb = await GRADE2.draft(gc, id).then(() => false, e => e.code === 'rubric'); it.rubric = rb;
        const sub = p.sub; p.sub = ' '; out.unread = await GRADE2.draft(gc, id).then(() => false, e => e.code === 'unread'); p.sub = sub; }
      return out; });
    ok(!r.offOn && r.offIds === r.offIds0 && !/loop/.test(r.offIds), `꺼짐: 과정 만들기 단계 그대로(${r.offIds})`);
    ok(r.hasPend && r.offModal, '꺼짐: 기존 채점 모달 그대로');
    ok(r.offAssess && r.offSnap, '꺼짐: 채점 화면 · 게시본 변화 없음');
    ok(/loop,open$/.test(r.onIds), `켜짐: 「학습 루프 템플릿」 단계(개설 앞) ${r.onIds}`);
    ok(Object.values(r.tpl).every(Boolean) && Object.keys(r.tpl).length === 4, '4종 템플릿 모든 차시 4단계 배치');
    ok(r.concepts, '개념 자동 생성(차시 목표 → 개념, 차시당 1~3)');
    ok(r.capped, '단계 레벨이 정책 최대 레벨을 넘지 않음');
    ok(r.draftHidden, '수락 전 초안은 학습자 게시본에 없음');
    ok(r.modal && r.practice && r.off2 && r.undo && r.edited, `과정 화면: 템플릿 · 루프 없이 · 되돌리기 · 차시 수정(개념 포함) ${JSON.stringify([r.modal, r.practice, r.off2, r.undo, r.edited])}`);
    ok(r.failMsg, 'AI 실패 시 빈 틀 + 안내 문구');
    ok(r.accepted && r.kept && r.weeks && r.checkMark, `모두 수락 · 기존 항목 삭제 0 · 차시 수 불변 · 숙달 확인 연결(추가 ${r.added})`);
    ok(r.pub, '수락 후 게시본에 루프 · aipol · 숙달 확인 표시');
    ok(r.voc, '직훈: 항목 추가 없음 · 차시 수 · 진도 불변 · 기존 퀴즈에 표시만');
    ok(/loop,open$/.test(r.flowIds), `마법사 단계 노출 ${r.flowIds}`);
    ok(r.box && r.pendN > 0, `채점 대기 초안 안내(${r.pendN}건)`);
    ok(r.draft && r.noSendUnchecked, '초안은 p.ai에만 · 확인 안 한 건은 발송 안 됨');
    ok(r.g2modal && r.sent, '확인 후 보내기 → 점수 · 피드백 · AI 총점 · 발송 기록');
    ok(r.bulk !== false, '일괄 발송은 확인 표시 건만');
    ok(r.resend, '다시 보내기 → 이전 점수 이력 · 학습자 알림');
    ok(r.noRb && r.unread, '루브릭 없음 · 제출물 읽기 실패 오류');
    ok(!A.errs.length, `어드민 스크립트 오류 없음 ${A.errs.slice(0, 2).join(' / ')}`);
    await A.ctx.close();

    /* ── 학습자 ── */
    const L = await page('/learner.html?demo=1#home'); await L.p.waitForTimeout(800);
    const l = await L.p.evaluate(pc => { const o = {}; const st = SITE(); if (!st) return { nosite: 1 };
      pc.id = 'lp2c'; st.classes.push(pc); st.aipol = { on: true }; LR.me = LR.me || { sid: '20260001', id: '20260001' }; LR.lp = LR.lp || {}; LR.lp.cls = LR.lp.cls || {};
      LR.mine = { badges: [], cls: { lp2c: { p: 0, st: 'submitted', fb: '초안 비밀 피드백', score: 77 } } };
      const chk = pc.items.find(x => x.loop === 'check'); const w1 = pc.items.find(x => +x.week === +chk.week && x.loop !== 'check') || chk;
      let h = viewCourse('lp2c', w1.id); o.panel = /1 씨름 → 2 AI 확장 → 3 성찰 → 4 숙달 확인/.test(h); o.hidden = !/초안 비밀 피드백/.test(h) && LR.mine.cls.lp2c.score == null;
      h = viewCourse('lp2c', chk.id); o.lock = /숙달 확인은 앞 단계를 마치면 열려요/.test(h) && !/<form id="qz"|data-a2/.test(h.slice(h.indexOf('lp2-lock')));
      LR.lp.cls.lp2c = LR.lp.cls.lp2c || { items: {} }; LR.lp.cls.lp2c.refl = { [chk.week]: { s: 'x'.repeat(25), x: 1, r: 'y'.repeat(35) } }; h = viewCourse('lp2c', chk.id); o.open = !/앞 단계를 마치면 열려요/.test(h);
      LR.mine.cls.lp2c = { p: 0, st: 'graded', fb: '잘했습니다', score: 90 }; h = viewCourse('lp2c', w1.id); o.arrived = /선생님 피드백이 도착했어요/.test(h);
      st.aipol = { on: false }; LR.lp.cls.lp2c.refl = {}; h = viewCourse('lp2c', chk.id); o.offSame = !/lp2l|lp2-lock|g2l/.test(h);
      return o; }, r.pubC);
    ok(!l.nosite && l.panel, '학습자: 차시에 4단계 진행 표시');
    ok(l.hidden, '학습자: 확정 전 점수 · 피드백 숨김');
    ok(l.lock && l.open, '학습자: 숙달 확인 잠금 → 앞 3단계 후 열림');
    ok(l.arrived, '학습자: 「선생님 피드백이 도착했어요」');
    ok(l.offSame, '학습자: 꺼짐이면 표시 없음');
    ok(!L.errs.length, `학습자 스크립트 오류 없음 ${L.errs.slice(0, 2).join(' / ')}`);
    await L.ctx.close();
  } catch (e) { fail++; console.log('✗ 실행 오류', e.message); }
  await browser.close(); srv.close();
  console.log(`\n${pass} 통과 · ${fail} 실패`); process.exit(fail ? 1 : 0);
})();
