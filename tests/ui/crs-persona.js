'use strict';
/* v35 페르소나 사용성 시나리오(C7) — 단계별 PC 1280 · 휴대폰 390 화면을 찍어 모음 시트(HTML + PNG)를 만들고 막힘 지점을 기록한다.
   ① 50대 대학 교수(univ lite, PC 위주): '파워포인트만 씀' — 15주 교과목을 만들고 1주차에 PPT 파일을 올린다.
   ② 학원 강사(k12, 휴대폰 위주): 중2 수학 반을 휴대폰으로 만들고 1회차에 YouTube 링크 · 퀴즈를 넣는다.
   ③ 직업훈련 강사(voc, PC): '규정이 걱정' — 훈련과정을 만들며 심사코드 · 분량 · 인정 시간 안내를 확인한다.
   막힘 기준: 의미 모를 단어 · 버튼 찾기 어려움(첫 화면에 [다음]이 안 보임 · 48px 미만) · 되돌리기 불가([이전] 없음 · 넣은 콘텐츠 빼기 없음) · 예시/AI 채우기 없는 입력칸.
   사용: node tests/ui/crs-persona.js [출력 폴더]  (기본 scratchpad/crs/c7/sheets 가 아니면 ./crs-sheets) */
const path = require('node:path'); const fs = require('node:fs');
const { chromium } = require('playwright');
const F = require('./crs-flow.js');
const OUT = process.argv[2] || process.env.CRS_SHEETS || path.resolve('crs-sheets'); fs.mkdirSync(OUT, { recursive: true });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PERSONAS = [
  { id: 'prof', who: '50대 대학 교수', note: '파워포인트만 씀 · 디지털 용어에 약함', tc: ['univ', 'lite'], main: 'pc', name: '경영학원론', act: 'ppt',
    task: '15주 교과목을 만들고 1주차에 가지고 있던 PPT 강의자료를 올려 개설한다.' },
  { id: 'acad', who: '학원 강사', note: '휴대폰으로 주로 작업', tc: ['k12'], main: 'm', name: '중2 수학 A반', act: 'yt',
    task: '휴대폰에서 반을 만들고 1회차에 YouTube 링크와 확인 퀴즈를 넣어 개설한다.' },
  { id: 'voc', who: '직업훈련 강사', note: '규정이 걱정(심사 · 출결 · 분량)', tc: ['voc'], main: 'pc', name: '스마트공장 운영 실무', act: 'reg',
    task: '훈련과정을 만들며 규정 안내(심사코드 · 차시 인정 시간 · 분량)를 확인하고 개설한다.' }
];

/* 단계 화면 사용성 점검(사람 눈 기준을 규칙으로) */
const probe = (p, i) => p.evaluate(([i, sel]) => { const root = [...document.querySelectorAll(sel)].find(e => e.getClientRects().length) || document.querySelector('#modal') || document.querySelector('#main'); const B = [];
  const vis = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width && r.height && c.display !== 'none' && c.visibility !== 'hidden'; };
  const btns = [...root.querySelectorAll('button, [role=button], a.btn')].filter(vis);
  const nx = btns.filter(b => /^\s*(다음|개설하기|개설)/.test(b.innerText)).pop();
  if (!nx) B.push(['버튼', '[다음]/[개설하기] 버튼이 없음']); else { const r = nx.getBoundingClientRect(); if (r.bottom > innerHeight || r.top < 0) B.push(['버튼', `[${nx.innerText.trim()}]이 첫 화면에 안 보임(스크롤 필요, y=${Math.round(r.top)})`]); if (r.height < 48) B.push(['버튼', `[${nx.innerText.trim()}] 높이 ${Math.round(r.height)}px(<48)`]); }
  if (i > 0 && !btns.some(b => /이전|뒤로/.test(b.innerText))) B.push(['되돌리기', '[이전] 버튼 없음']);
  if (!btns.some(b => /나중에|이어서 하기|저장하고 닫기/.test(b.innerText))) B.push(['되돌리기', '[나중에 이어서 하기] 없음']);
  const words = root.innerText.match(/커리큘럼|편성|시수|루브릭|썸네일|카테고리|모듈|프롬프트|템플릿|LMS|차감반|메타데이터|파라미터|인코딩|심사코드|HRD-?Net|tracse|NCS|훈련과정 ID|DB|URL|업로드/g); if (words) B.push(['단어', '설명 없이 보이는 말: ' + [...new Set(words)].join(', ')]);
  const inputs = [...root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select')].filter(vis);
  const noEx = inputs.filter(x => { const box = x.closest('.cf-f, .ct-f, label, .fl') || x.parentElement; return !/예:|예시/.test(box ? box.innerText : ''); }); if (noEx.length) B.push(['예시', `입력칸 ${inputs.length}개 중 ${noEx.length}개 옆에 '예:' 문장 없음`]);
  if (inputs.length && !btns.some(b => /채워|AI SAM/.test(b.innerText))) B.push(['AI', '[AI SAM이 채워 주기] 버튼 없음']);
  const head = root.querySelector('h1, h2, h3, .crs-now, [data-now]'); const prog = /[①②③④⑤]|\b1\s*\/\s*[2-5]\b|단계/.test(root.innerText.slice(0, 300)); if (!prog) B.push(['진행', '위쪽에 진행 표시(①②③ · n/5) 못 찾음']);
  const small = [...root.querySelectorAll('p, label, li, span, div')].filter(e => vis(e) && !e.children.length && e.innerText.trim().length > 10 && parseFloat(getComputedStyle(e).fontSize) < 15 && !e.closest('small, .mini, .hint')).length; if (small > 3) B.push(['글자', `16px 미만 본문 ${small}곳`]);
  return { B, now: head ? head.innerText.trim().slice(0, 60) : '' }; }, [i, F.ROOTSEL]);

async function personaAct(p, act, log) { /* 차시 채우기 단계에서 페르소나 과제 */
  const C = []; const tryBtn = async (re, tag) => { const b = F.btnByText(p, re).first(); if (await b.count()) { await b.click({ timeout: 3000 }).catch(() => {}); C.push(tag); await p.waitForTimeout(500); return true; } C.push(tag + ' 못 찾음'); return false; };
  const pickCard = async (kind, re) => { const c = p.locator(`#crsFlow .ct-kind[data-k=${kind}]`).filter({ visible: true }).first(); if (await c.count()) { await c.click().catch(() => {}); C.push(kind); await p.waitForTimeout(500); return true; } return tryBtn(re, kind); };
  const confirm = async () => { const n = await F.ctConfirm(p, C); if (!n) C.push('확인 버튼 못 찾음'); };
  if (act === 'ppt') { if (await pickCard('upload', /올리기|업로드|파일/)) { const fi = p.locator('.ct-sh input[type=file]').first(); if (await fi.count()) { await fi.setInputFiles({ name: '1주차_경영학원론.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: Buffer.from('PK\u0003\u0004 demo pptx') }); C.push('PPT 선택'); await p.waitForTimeout(1200); } else C.push('파일 칸 없음'); await confirm(); } }
  if (act === 'yt') { if (await pickCard('youtube', /YouTube|유튜브|링크/)) { const u = p.locator('.ct-sh input:visible').first(); if (await u.count()) { await u.fill('https://youtu.be/dQw4w9WgXcQ'); C.push('링크 입력'); } await confirm(); }
    if (await pickCard('quiz', /퀴즈/)) await confirm(); }
  if (act === 'reg') { /* 규정 안내 확인만 */ }
  if (await p.locator('.ct-sh').filter({ visible: true }).count()) { C.push('CT 창이 안 닫힘 → 닫기'); await p.locator('.ct-sh [data-act=ct-close], .ct-sh [data-act=ct-pk-x]').filter({ visible: true }).first().click().catch(() => {}); await p.waitForTimeout(300); const yes = F.btnByText(p, /닫기|나가기|버리기/, '#modal').last(); if (await yes.count()) await yes.click().catch(() => {}); }
  log.push(...C); return C; }

(async () => {
  const { srv, base } = await F.serve(); const br = await chromium.launch(); const sheet = [];
  for (const P of PERSONAS) { const errs = []; const vp = P.main === 'm' ? { width: 390, height: 844 } : { width: 1280, height: 900 };
    const { ctx, p } = await F.openOrg(br, base, P.tc, { empty: true, vp, errs }); const rows = []; const actLog = [];
    const shoot = async tag => { const a = `${P.id}_${tag}_pc.png`, b = `${P.id}_${tag}_m.png`; const cur = p.viewportSize();
      await p.setViewportSize({ width: 1280, height: 900 }); await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, a) });
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, b) }); await p.setViewportSize(cur); await p.waitForTimeout(150); return [a, b]; };
    rows.push({ step: '시작', now: '강좌 · 교과목 화면', imgs: await shoot('0start'), B: [] });
    let r;
    try { r = await F.runFlow(p, { type: P.tc[0], ed: P.tc[1], name: P.name, content: false, onStep: async (sid, i) => {
        const pr = await probe(p, i); const extra = [];
        if (P.act === 'reg' && i === 0 && !/심사|HRD|훈련/.test((await F.rootInfo(p)).text)) extra.push(['규정', '1단계에 훈련과정 규정 안내 없음']);
        if (/fill|채우/.test(sid)) { const did = await personaAct(p, P.act, actLog); did.filter(x => /못 찾음|없음/.test(x)).forEach(x => extra.push(['버튼', '과제 막힘: ' + x]));
          const undo = await p.evaluate(sel => { const r = document.querySelector(sel.split(',')[0]) || document; return [...r.querySelectorAll('button, [role=button]')].some(b => /빼기|삭제|지우기|되돌리기|취소/.test(b.innerText) || /삭제|빼기/.test(b.getAttribute('aria-label') || '')); }, F.ROOTSEL); if (!undo) extra.push(['되돌리기', '넣은 콘텐츠를 빼는 버튼 없음']); }
        if (P.act === 'reg' && /setup|open|설정|미리/.test(sid) && !/심사|인정|분량|4시간|HRD/.test((await F.rootInfo(p)).text)) extra.push(['규정', `${sid} 단계에 규정 점검 결과 안 보임`]);
        rows.push({ step: `${i + 1}. ${sid}`, now: pr.now, imgs: await shoot(`${i + 1}${sid.replace(/[^\w-]/g, '')}`), B: [...pr.B, ...extra] }); } });
    } catch (e) { r = { fail: '예외 ' + e.message.split('\n')[0] }; }
    const endB = []; if (r.fail) endB.push(['흐름', r.fail]); if (r.created === null || r.created === undefined) endB.push(['흐름', '개설되지 않음']); (r.stuck || []).forEach(s => endB.push(['막힘', s])); if (errs.length) endB.push(['오류', [...new Set(errs)].slice(0, 2).join(' / ')]);
    rows.push({ step: '끝', now: r.created ? '개설 완료 화면' : '개설 실패', imgs: await shoot('9end'), B: endB });
    sheet.push({ P, rows, clicks: r.clicks, log: (r.log || []).concat(actLog) }); await ctx.close();
    console.log(`${P.who}: 단계 ${(r.steps || []).length} · 클릭 ${r.clicks ?? '-'} · 막힘 ${rows.reduce((a, x) => a + x.B.length, 0)}건`); rows.forEach(x => x.B.forEach(b => console.log(`   [${x.step}] ${b[0]}: ${b[1]}`)));
  }
  const html = `<!doctype html><meta charset="utf-8"><title>v35 과정 만들기 페르소나 시트</title><style>body{font:14px/1.5 system-ui,'Apple SD Gothic Neo',sans-serif;margin:24px;color:#222;background:#fff}h1{font-size:22px}h2{margin:32px 0 4px;font-size:18px}.row{display:grid;grid-template-columns:220px 1fr 200px;gap:12px;border-top:1px solid #ddd;padding:12px 0;align-items:start}.row img{border:1px solid #ccc;max-width:100%}.imgs{display:grid;grid-template-columns:3fr 1fr;gap:8px}.b{margin:0;padding-left:18px}.b li{margin:2px 0}.k{display:inline-block;min-width:52px;font-weight:700;color:#b42318}.ok{color:#067647}small{color:#666}</style>
<h1>v35 과정 만들기 — 페르소나 사용성 시트</h1><p>각 줄: 단계 · PC 1280 / 휴대폰 390 화면 · 막힘 지점(자동 규칙 + 과제 수행 결과). 생성 ${new Date().toISOString().slice(0, 16)}</p>
${sheet.map(s => `<h2>${esc(s.P.who)} — ${esc(s.P.note)}</h2><p><b>과제</b> ${esc(s.P.task)}<br><small>클릭 ${s.clicks ?? '-'}회 · 경로: ${esc(s.log.join(' › '))}</small></p>${s.rows.map(x => `<div class="row"><div><b>${esc(x.step)}</b><br><small>${esc(x.now)}</small></div><div class="imgs"><img src="${x.imgs[0]}"><img src="${x.imgs[1]}"></div><div>${x.B.length ? `<ul class="b">${x.B.map(b => `<li><span class="k">${esc(b[0])}</span> ${esc(b[1])}</li>`).join('')}</ul>` : '<span class="ok">막힘 없음</span>'}</div></div>`).join('')}`).join('')}`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  const pg = await (await br.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); await pg.goto('file://' + path.join(OUT, 'index.html')); await pg.waitForTimeout(500); await pg.screenshot({ path: path.join(OUT, 'sheet.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT, 'blocks.json'), JSON.stringify(sheet.map(s => ({ who: s.P.who, clicks: s.clicks, blocks: s.rows.flatMap(x => x.B.map(b => ({ step: x.step, kind: b[0], msg: b[1] }))) })), null, 1));
  await br.close(); srv.close(); console.log('시트:', path.join(OUT, 'index.html'));
})().catch(e => { console.error(e); process.exit(1); });
