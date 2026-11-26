'use strict';
/* v48 AI SAM 메뉴별 지원 시험(개발 6) — Claude 키 없이 규칙 엔진으로(외부 요청 차단, Claude 요청은 가로채 가짜 응답)
   ① 관리자 메뉴 75개(메뉴 73 + 운영자 홈 · 교수자 홈) 각각 화면 추천 칩 3개 이상, 대화창 카드에 3개, 모든 칩이 답을 냄(「이해하지 못했습니다」 · 오류 0)
   ② 「AI 지원 없음」이던 23개 메뉴: 첫 칩(현황 요약)이 지금 화면의 실제 숫자로 답함 · 칩 3개 중 조회 2 + 쓰기(계획 카드) 또는 안내 1
   ③ 대학(사업단 · 센터): 학사 LMS 계열 · AI 관리 · 기관 관리 · 학과 칩이 모두 답함
   ④ 위험 작업 자동 실행 없음: 칩을 눌러도(승인 전) 기관 데이터가 바뀌지 않음, 보안 · 권한 · 동기화 · 지급 마감 요청은 계획 카드 없이 안내만
   ⑤ 계획 카드 → 승인 → 실행(공지가 실제로 올라감) ⑥ Claude 경로: run_screen_action으로 같은 칩 실행(가짜 응답)
   사용: node tests/ui/sam-menu.js  (포트 9960) */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../didisam');
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const PORT = +(process.env.PORT || 9960);
const CASES = [['corp'], ['adult'], ['univ', 'lite'], ['univ', 'lms'], ['lifelong'], ['voc'], ['public', 'staff'], ['k12'], ['public', 'citizen'], ['public', 'facility']];
const FULL = ['lmsp-portal', 'lmsp-app', 'lmsb', 'lmsc', 'lmsg', 'lmsi', 'lmsn', 'lmsq', 'lmslive', 'lmsv', 'mileage', 'lmsl-cal', 'lmsl-dm', 'lmsl-noti', 'lmsd', 'mkops', 'security', 'lmsm', 'lmsp', 'mksell', 'mkcp', 'rfpmap', 'lmsk'];
const RISKY = { security: '2단계 인증 꺼줘', lmsm: '이 구성원 권한 운영자로 바꿔줘', lmsp: '보안 설정 바꿔줘', sis: '학사 동기화 실행해줘', mkops: '분기 지급 마감해줘', grade: '성적 확정해줘', mileage: '마일리지 정책 켜줘', aigov: '모델 연결 꺼줘' };
const key = c => c.join('/');
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(k => srv.listen(PORT, '127.0.0.1', k)); const B = `http://127.0.0.1:${PORT}`; const br = await chromium.launch();
  const bad = []; let claudeCalls = 0; const seen = new Map(); const RES = {};
  const open = async (c, o = {}) => {
    const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); const pe = []; p.on('pageerror', e => pe.push(e.message)); p.on('dialog', d => d.dismiss());
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, x => x.abort());
    await p.route(/^https:\/\/api\.anthropic\.com\//, async x => { claudeCalls++; if (x.request().method() === 'OPTIONS') return x.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } }); const b = JSON.parse(x.request().postData() || '{}'); const done = (b.messages || []).some(m => Array.isArray(m.content) && m.content.some(y => y.type === 'tool_result'));
      const body = done ? { id: 'm2', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: '지금 화면 기준으로 정리했습니다.' }], usage: { input_tokens: 10, output_tokens: 5 } }
        : { id: 'm1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu1', name: 'run_screen_action', input: { action: o.action || 'xg-sum' } }], usage: { input_tokens: 10, output_tokens: 5 } };
      x.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) }); });
    await p.goto(B + '/index.html'); await p.waitForFunction(() => typeof createOrg === 'function');
    await p.evaluate(([t, e, k]) => { localStorage.clear(); localStorage.setItem('didisam.theme', 'light'); localStorage.setItem('didisam.emptyStart', '0'); const x = document.querySelector('#suEmpty'); if (x) x.checked = false;
      if (k) localStorage.setItem('didisam.claude', JSON.stringify({ key: k, model: 'claude-haiku-5-5', chat: true, docs: true, site: true, mv: 2 })); createOrg(t, '디디 기관', e); }, [c[0], c[1], o.key || '']);
    await p.waitForFunction(() => !document.querySelector('#app .gen'), null, { timeout: 9000 }).catch(() => { }); await p.waitForTimeout(1000);
    await p.evaluate(k => { try { closeModal(); } catch (e) { } if (k) try { CL.set({ key: k, model: 'claude-haiku-5-5', chat: true, docs: true, site: true }); } catch (e) { } }, o.key || '');
    return { p, pe }; };
  /* 지문에서 S.lms는 뺀다: 학사 LMS 데모 저장소는 화면 · 조회가 처음 읽을 때 만들어진다(지연 생성). AI SAM 쓰기(공지 · 메시지)는 S.lms를 건드리지 않는다 */
  /* 메뉴 → 시험할 유형(운영자에게 켜진 첫 유형, 학사 LMS 계열은 학사 LMS) */
  const ON = {}, HAS = {};
  for (const c of CASES) { const { p } = await open(c); const r = await p.evaluate(() => { const v = new Set(), a = new Set(); for (const w of S.nav.ws) (S.nav.tabs[w] || []).forEach(x => { if (!MENU[x.id]) return; a.add(x.id); if (x.on !== false) v.add(x.id); }); return [[...v], [...a]]; }); ON[key(c)] = r[0]; HAS[key(c)] = r[1]; await p.close(); }
  const PICK = {}; const all = new Set(Object.values(HAS).flat());
  for (const id of all) { let ty = CASES.map(key).find(k => ON[k].includes(id)) || CASES.map(key).find(k => HAS[k].includes(id)); if (/^lms|^grade$|^sis$|^rfpmap$|^academic$/.test(id) && HAS['univ/lms'].includes(id)) ty = 'univ/lms'; (PICK[ty] = PICK[ty] || []).push(id); }
  /* ①②④ 유형별로 메뉴를 돌며 칩 실행 */
  (PICK.corp = PICK.corp || []).unshift('dash', 'settings');
  for (const c of CASES) { const ids = PICK[key(c)] || []; const lite = key(c) === 'univ/lite'; const extra = lite ? HAS['univ/lite'].filter(id => /^lms|^aigov$|^org$|^groups$/.test(id) && !ids.includes(id)) : [];
    if (!ids.length && !extra.length) continue; const { p, pe } = await open(c);
    const R = await p.evaluate(async ([ids, extra, FULL]) => { const sl = ms => new Promise(o => setTimeout(o, ms)); const out = [];
      const fp = () => { const o = {}; Object.keys(S).filter(k => !['chat', 'audit', 'ai', 'gsig', 'nav', 'v', 'lms'].includes(k)).forEach(k => { o[k] = S[k]; }); return JSON.stringify(o); };
      for (const id of [...ids, ...extra]) { const rec = { id, label: id === 'dash' ? '현황' : mlabel(id), only: !ids.includes(id), chips: [], card: 0, err: '' };
        const goK = () => { S.chat = []; CUR = id === 'dash' ? { ws: 'dash', tab: '' } : id === 'settings' ? { ws: 'settings', tab: '' } : { ws: MENU[id].ws, tab: id }; render(); };
        try { goK(); } catch (e) { rec.err = 'render ' + e.message; out.push(rec); continue; } await sl(350);
        if (scxKey() !== id) { await sl(500); goK(); await sl(300); } /* 앞 화면 칩의 늦은 화면 이동(연결 안내 등)이 끼어든 경우 */
        const mainTxt = (document.querySelector('#main') || {}).innerText || '';
        try { const h = scxHTML(); rec.card = (h.match(/data-act="scx-run"/g) || []).length; } catch (e) { rec.err = 'card ' + e.message; }
        let L = []; try { L = scxChips(id); } catch (e) { rec.err = 'chips ' + e.message; }
        rec.at = scxKey(); rec.changed = [];
        for (const ch of L) { const f0 = fp(); let r = null, er = ''; try { r = ch.run() || {}; } catch (e) { er = e.message; }
          if (fp() !== f0 && !(r && r.copy)) rec.changed.push(ch.l); /* 초대 링크(copy)는 대화에 바로 주는 결과라 예외 */
          r = r || {}; const tx = String(r.text || ''); const digits = (tx.match(/\d[\d,]*/g) || []).map(x => x.replace(/,/g, '')).filter(x => x.length && x !== '0');
          const real = digits.some(d => mainTxt.replace(/,/g, '').includes(d)) || !!(digits.length && r.btn && r.btn.act === 'go'); /* 화면 숫자 또는 학사 LMS 데이터 답(ULC, 기관 데이터 S.lms) */
          rec.chips.push({ id: ch.id, l: ch.l, kind: er ? 'error' : r.plan ? 'plan' : r.guide ? 'guide' : /이해하지 못했습니다|처리할 수 없는/.test(tx) ? 'miss' : (tx || r.html || r.steps) ? 'info' : 'none', er, real, tx: tx.slice(0, 90) });
          if (r.plan && PLANS[r.plan]) delete PLANS[r.plan]; }
        out.push(rec); }
      return out; }, [ids, extra, FULL]);
    /* ④ 위험 요청: 계획 카드 없이 안내만 · 데이터 그대로 */
    const RR = await p.evaluate(async RISKY => { const sl = ms => new Promise(o => setTimeout(o, ms)); const out = [];
      const fp = () => { const o = {}; Object.keys(S).filter(k => !['chat', 'audit', 'ai', 'gsig', 'nav', 'v', 'lms'].includes(k)).forEach(k => { o[k] = S[k]; }); return JSON.stringify(o); };
      for (const [id, q] of Object.entries(RISKY)) { if (!MENU[id] || !(S.nav.tabs[MENU[id].ws] || []).some(x => x.id === id)) continue; CUR = { ws: MENU[id].ws, tab: id }; render(); await sl(250); if (CUR.tab !== id) continue; const f0 = fp(); let r = {}; try { r = answer(q) || {}; } catch (e) { r = { text: 'ERR ' + e.message }; } out.push({ id, q, plan: !!r.plan, guide: !!r.guide, changed: fp() !== f0, tx: String(r.text || '').slice(0, 80) }); if (r.plan && PLANS[r.plan]) delete PLANS[r.plan]; }
      return out; }, RISKY);
    RES[key(c)] = { R, RR };
    for (const rec of R) { const tag = `${key(c)} · ${rec.id}(${rec.label})`;
      if (!rec.only) seen.set(rec.id, tag);
      if (rec.err) bad.push(`${tag} ${rec.err}`);
      const okN = rec.chips.filter(x => !['miss', 'error', 'none'].includes(x.kind)).length;
      if (!rec.only && rec.chips.length < 3) bad.push(`${tag} 칩 ${rec.chips.length}개(3개 이상이어야 함)`);
      if (!rec.only && rec.card !== 3) bad.push(`${tag} 대화창 카드 칩 ${rec.card}개(3개여야 함)`);
      rec.chips.filter(x => ['miss', 'error', 'none'].includes(x.kind)).forEach(x => bad.push(`${tag} 칩 「${x.l}」 ${x.kind} ${x.er || x.tx}`));
      if (rec.changed.length) bad.push(`${tag} 칩을 누르기만 했는데(승인 전) 데이터가 바뀜: ${rec.changed.join(', ')}`);
      if (rec.at !== rec.id) bad.push(`${tag} 화면이 열리지 않음(지금 ${rec.at})`);
      if (FULL.includes(rec.id) && !rec.only) { const f = rec.chips[0]; if (!f || !f.real) bad.push(`${tag} 첫 칩(현황 요약)이 화면의 실제 숫자로 답하지 않음 — 「${f && f.tx}」`);
        const top = rec.chips.slice(0, 3); if (top.filter(x => x.kind === 'info').length < 2 || top.filter(x => ['plan', 'guide'].includes(x.kind)).length < 1) bad.push(`${tag} 칩 3개 구성(조회 2 + 계획/안내 1) 아님: ${top.map(x => x.kind).join(',')}`); }
      if (okN < 3 && !rec.only) { /* 위에서 이미 기록 */ } }
    for (const x of RR) { if (x.plan || !x.guide || x.changed) bad.push(`${key(c)} · ${x.id} 위험 요청 「${x.q}」 → 계획 ${x.plan ? 'O' : 'X'} · 안내 ${x.guide ? 'O' : 'X'} · 변경 ${x.changed ? 'O' : 'X'} | ${x.tx}`); }
    if (pe.length) bad.push(`${key(c)} 페이지 오류 ${pe.slice(0, 2).join(' / ')}`);
    await p.close(); }
  /* 홈 2개(운영자 · 교수자) */
  { const { p } = await open(['corp']); const n = await p.evaluate(() => { CUR = { ws: 'home', tab: '' }; render(); return aihChips().length; }); if (n < 3) bad.push(`corp 운영자 홈 칩 ${n}개`); else seen.set('home@corp', 'corp 홈'); await p.close(); }
  { const { p } = await open(['univ', 'lms']); const n = await p.evaluate(() => { S.me.role = 'teacher'; CUR = { ws: 'home', tab: '' }; render(); return aihChips().length; }); if (n < 3) bad.push(`univ/lms 교수자 홈 칩 ${n}개`); else seen.set('home@teacher', 'univ/lms 교수자 홈'); await p.close(); }
  /* ⑤ 계획 카드 → 승인 → 실행: 학사 LMS 출결 화면에서 「출결 기준 안내 공지 올리기」 */
  { const { p } = await open(['univ', 'lms']); const r = await p.evaluate(async () => { const sl = ms => new Promise(o => setTimeout(o, ms)); CUR = { ws: MENU.lmsg.ws, tab: 'lmsg' }; render(); await sl(300); const n0 = (S.notices || []).length; S.chat = [];
      scxRun('xg-ntc'); await sl(600); const m = S.chat.filter(x => x.plan).pop(); if (!m) return { err: '계획 카드 없음', chat: S.chat.map(x => x.text).join('|').slice(0, 200) }; const n1 = (S.notices || []).length;
      ACT['plan-ok']({ dataset: { v: m.plan } }); await sl(300); const mm = document.querySelector('#modal [data-mact="ok"]'); if (mm) { mm.click(); await sl(200); }
      return { before: n0, pending: n1, after: (S.notices || []).length, title: (S.notices[0] || {}).title }; });
    if (r.err || r.pending !== r.before || r.after !== r.before + 1) bad.push('승인 흐름 ' + JSON.stringify(r)); else console.log(`✓ 계획 카드 → 승인 → 공지 「${r.title}」 올라감(승인 전 ${r.pending - r.before}건 변화)`); await p.close(); }
  /* ⑥ Claude 경로: 가짜 응답이 run_screen_action(xg-sum)을 부르면 같은 칩 결과 카드 */
  { const { p, pe } = await open(['univ', 'lms'], { key: 'sk-ant-DEMO-FAKE-not-a-real-key', action: 'xg-sum' }); const r = await p.evaluate(async () => { const sl = ms => new Promise(o => setTimeout(o, ms)); CUR = { ws: MENU.lmsg.ws, tab: 'lmsg' }; render(); await sl(300); S.chat = [];
      const ctx = typeof scxCtxText === 'function' ? scxCtxText() : ''; await chatSend('출결 상황 어때?'); for (let i = 0; i < 30 && S.chat.some(x => x.typing); i++) await sl(200);
      const last = S.chat.filter(x => x.role === 'ai').pop() || {}; return { ctx: /xg-sum/.test(ctx), via: String(last.via || ''), text: String(last.text || '').slice(0, 80), cards: (last.cards || []).length, tools: JSON.stringify(last.tools || last.tl || '').slice(0, 80) }; });
    if (!r.ctx) bad.push('Claude 화면 맥락에 xg-sum 없음'); if (!claudeCalls) bad.push('Claude 가짜 응답 호출 0회'); console.log(`✓ Claude 경로(가짜 응답 ${claudeCalls}회) — ${JSON.stringify(r).slice(0, 200)}`); if (pe.length) bad.push('Claude 경로 페이지 오류 ' + pe[0]); await p.close(); }
  await br.close(); srv.close();
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(RES, null, 1));
  const full = FULL.filter(id => seen.has(id)).length;
  console.log(`메뉴 ${seen.size}개 점검(목표 75) · 「AI 지원 없음」이던 메뉴 ${full}/23 · Claude 가짜 응답 ${claudeCalls}회`);
  if (seen.size < 75) bad.push(`점검한 메뉴 ${seen.size}개(75개여야 함)`); if (full < 23) bad.push(`23개 메뉴 중 ${full}개만 점검`);
  bad.forEach(b => console.log('✗ ' + b)); console.log(bad.length ? `실패 ${bad.length}` : '모두 통과'); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
