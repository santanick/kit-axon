/* 디디쌤 스튜디오 v7 — Claude 연결(데모: 이 브라우저에 키 저장 · 브라우저에서 직접 호출)
   대화(AI SAM) · 문서 AI 수정 · 홈페이지 AI 수정에 Claude를 쓴다. 실행이 필요한 지시는 Claude가 studio_action 도구로 넘기고,
   기존 규칙 엔진이 실행 계획 카드를 만들어 운영자 승인을 받는다(AI가 바로 실행하지 않음). 실패하면 규칙 엔진으로 처리한다.
   운영 모드: 키는 서버 함수(adminAssistant)로 옮기고 브라우저는 서버만 호출한다. 이름 대신 내부 ID · 집계만 보낸다. */
'use strict';
const CLM = [['claude-haiku-5-5', 'Claude Haiku 5.5', '빠르고 경제적 · 기본'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5', '균형 · 문서 · 설계'], ['claude-opus-5-5', 'Claude Opus 5.5', '최고 품질 · 복잡한 분석']];
const CL = {
  K: 'didisam.claude',
  get() { try { return { model: CLM[0][0], chat: true, docs: true, site: true, calls: 0, tin: 0, tout: 0, ...JSON.parse(localStorage.getItem(this.K) || '{}') }; } catch (e) { return { model: CLM[0][0], chat: true, docs: true, site: true, calls: 0, tin: 0, tout: 0 }; } },
  set(p) { try { localStorage.setItem(this.K, JSON.stringify({ ...this.get(), ...p })); } catch (e) { toast('브라우저 저장 공간에 저장하지 못했습니다.', 'warn'); } },
  on(f = 'chat') { const c = this.get(); return !!c.key && c[f] !== false; },
  label(m) { return (CLM.find(x => x[0] === (m || this.get().model)) || CLM[0])[1]; },
  async call({ system, messages, tools, max = 1200 }) {
    const c = this.get(); if (!c.key) throw new Error('키 없음');
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 60000);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: c.model, max_tokens: max, system, messages, ...(tools ? { tools } : {}) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 401 ? 'API 키가 올바르지 않습니다' : r.status === 404 ? `모델(${c.model})을 쓸 수 없습니다` : r.status === 429 ? '요청이 많아 잠시 후 다시 시도해 주세요' : (j.error?.message || `오류 ${r.status}`));
      const u = j.usage || {}; this.set({ calls: c.calls + 1, tin: c.tin + (u.input_tokens || 0), tout: c.tout + (u.output_tokens || 0), last: nowStr() });
      return { text: (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim(), tools: (j.content || []).filter(b => b.type === 'tool_use'), usage: u, model: j.model || c.model };
    } catch (e) { if (e.name === 'AbortError') throw new Error('응답 시간이 초과되었습니다'); if (e instanceof TypeError) throw new Error('네트워크에 연결하지 못했습니다'); throw e; } finally { clearTimeout(to); }
  }
};
/* 대화 맥락: 집계 · 그룹 · 과정만(개인 이름 없음) */
function clCtx() {
  const ms = S.members; const grp = S.groups.map(g => { const L = ms.filter(m => m.group === g.id); return { [t('group')]: g.name, 인원: L.length, 가입률: Math.round(L.filter(m => m.grade === '정회원').length / Math.max(1, L.length) * 100) + '%' }; }).slice(0, 12);
  const cls = S.classes.slice(0, 12).map(c => ({ [t('cls')]: c.name, 상태: c.status, 수강: c.learners.length, 평균진도: Math.round(avgP(c)) + '%', 기간: `${c.start}~${c.end}` }));
  return { 기관유형: TYPES[S.org.type].name, 기관명: S.org.name, 지금화면: CUR.ws === 'settings' ? '설정' : `${lab(WS[CUR.ws] || {})}${CUR.tab ? ' › ' + mlabel(CUR.tab) : ''}`, 오늘: today(),
    집계: { [t('learner')]: ms.length, 정회원: ms.filter(m => m.grade === '정회원').length, 승인대기: ms.filter(m => m.grade === '승인 대기').length, 미접속14일: ms.filter(m => daysAgo(m.last) >= 14).length, 검수대기: pend().length, 미답변질문: S.posts.filter(p => p.kind === '질문' && !p.replies).length, 미납청구: S.bills.filter(b => b.status === '미납').length, 켜진자동화: S.autos.filter(a => a.on).length, 표준문서: (S.docs || []).length, 배지발급: S.badges.reduce((a, b) => a + b.issued.filter(i => i.st === '유효').length, 0) }, 그룹: grp, 과정: cls, 켜진메뉴: Object.keys(MENU).filter(menuOn).map(mlabel) };
}
const CL_TOOL = [{ name: 'studio_action', description: '디디쌤 스튜디오에서 무언가를 실행·생성·변경·발송·이동할 때 반드시 이 도구를 쓴다. instruction에는 스튜디오 규칙 엔진이 이해하는 짧은 한국어 지시문을 넣는다(예: "14일 미접속 학습자에게 독려 메시지 보내줘", "생성형 AI 15주 과정 설계해줘", "교육 결과 보고서 만들어줘", "배지 열어줘", "매주 금요일 주간 보고서 보내는 자동화 만들어줘", "AI 리터러시 4주 과정 만들고 퀴즈와 공지까지 채워줘"). 도구는 실행 계획 카드를 만들고 운영자가 승인해야 실행된다.', input_schema: { type: 'object', properties: { instruction: { type: 'string', description: '규칙 엔진에 넘길 한국어 지시문(80자 이내)' } }, required: ['instruction'] } }];
const CL_SYS = () => `당신은 교육기관 운영 어드민 「디디쌤 스튜디오」의 AI 비서 AI SAM입니다. 사용자는 ${TYPES[S.org.type].name} 운영자입니다.
원칙:
- 한국어 합니다체로 짧고 정확하게 답합니다. 제공된 운영 데이터(JSON)에 있는 숫자만 쓰고, 없는 수치는 지어내지 않습니다.
- 메시지 발송 · 과정/퀴즈/문서/자동화 생성 · 승인 · 채점 · 화면 이동 등 실행이 필요한 요청은 직접 했다고 말하지 말고 studio_action 도구를 호출합니다. 도구 호출 전에 무엇을 하려는지 한두 문장으로 설명합니다. 여러 메뉴에 걸친 요청은 지시문 하나로 묶어 넘깁니다.
- 조회 · 분석 · 요약 · 글쓰기(공지 · 안내문 초안 등 단순 작성)는 데이터로 바로 답합니다.
- 개인 이름 · 연락처를 묻거나 추측하지 않습니다. 표가 필요하면 '- ' 목록을 씁니다. 굵게는 **…**만 씁니다.
운영 데이터: ${JSON.stringify(clCtx())}`;
/* 간단한 마크다운 → 안전한 HTML */
function mdHTML(s) {
  const inl = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = []; let list = null;
  String(s || '').split('\n').forEach(l => { const m = l.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/); const h = l.match(/^#{1,4}\s+(.*)$/);
    if (m) { const tg = /\d/.test(m[1]) ? 'ol' : 'ul'; if (list !== tg) { if (list) out.push(`</${list}>`); out.push(`<${tg}>`); list = tg; } out.push(`<li>${inl(m[2])}</li>`); return; }
    if (list) { out.push(`</${list}>`); list = null; }
    if (h) out.push(`<p class="mh">${inl(h[1])}</p>`); else if (l.trim()) out.push(`<p>${inl(l)}</p>`); });
  if (list) out.push(`</${list}>`); return out.join('');
}
/* ── 대화: Claude가 답하고, 실행은 규칙 엔진의 계획 카드로 ── */
{ const base = chatSend; chatSend = q => {
  q = String(q || '').trim().slice(0, 600); if (!q) return; if (!CL.on('chat')) return base(q);
  if (CUR.ws !== 'home' && !$('#drawer')) ACT['chat-open']();
  const hist = S.chat.filter(m => !m.typing && (m.text || m.md)).slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.md || m.text || '').slice(0, 1500) }));
  S.chat.push({ role: 'user', text: q }); const ph = { role: 'ai', typing: true, via: CL.label() }; S.chat.push(ph); renderThreads();
  const msgs = []; [...hist, { role: 'user', content: q }].forEach(m => { const l = msgs[msgs.length - 1]; if (l && l.role === m.role) l.content += '\n' + m.content; else msgs.push({ ...m }); }); while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  CL.call({ system: CL_SYS(), messages: msgs, tools: CL_TOOL, max: 1200 }).then(res => {
    let r = {}; const tu = res.tools[0];
    if (tu) { const ins = String(tu.input?.instruction || '').slice(0, 300); try { r = answer(ins); } catch (e) { console.error(e); r = {}; } if (/정확히 이해하지 못했습니다/.test(r.text || '')) r = { text: `「${ins}」은(는) 스튜디오에서 바로 처리할 수 없는 지시입니다. 화면에서 직접 진행하시거나 다르게 말씀해 주세요.` }; r.act = ins; }
    delete ph.typing; Object.assign(ph, r, { md: res.text, via: CL.label(res.model), tok: (res.usage.input_tokens || 0) + (res.usage.output_tokens || 0) });
    if (!res.text && !r.text) ph.text = '답변을 만들지 못했습니다. 다시 말씀해 주시겠어요?';
    S.ai.usage++; S.chat = S.chat.slice(-60); save(); renderThreads(); if (r.nav) setTimeout(() => go(r.nav, true), 350);
  }).catch(err => {
    let r; try { r = answer(q); } catch (e) { r = { text: '처리하는 중 문제가 생겼습니다.' }; }
    delete ph.typing; Object.assign(ph, r, { via: '규칙 엔진', note: `Claude 연결 실패(${err.message}) — 규칙 엔진으로 처리했습니다.` }); S.chat = S.chat.slice(-60); save(); renderThreads(); if (r.nav) setTimeout(() => go(r.nav, true), 350);
  });
}; }
{ const base = aiBody; aiBody = m => { let h = ''; if (m.note) h += `<p class="cnote2">${esc(m.note)}</p>`; if (m.md) h += `<div class="mdx">${mdHTML(m.md)}</div>`; if (m.act) h += `<p class="actline">${ic('spark', 12)} 실행 지시 → 「${esc(m.act)}」</p>`; h += base(m); if (m.via) h += `<div class="via">${m.via === '규칙 엔진' ? '' : '<i class="vdot"></i>'}${esc(m.via)}${m.tok ? ` · ${m.tok.toLocaleString()} tokens` : ''}</div>`; return h; }; }
/* ── 문서 AI 수정 ── */
{ const base = docEdit; docEdit = async (d, q, c) => {
  if (!CL.on('docs') || d._rules) return base(d, q, c);
  const review = /검토|점검|확인해/.test(q);
  try {
    const sys = `당신은 교육기관 업무 문서 편집자입니다. 문서 형식: '# 제목', '## 절', '- 항목', '| 표 | 셀 |', 빈 줄, 채울 칸은 {변수}. ${review ? '문서를 검토해 문제점만 "- " 목록으로 5개 이내로 답합니다(빈 칸 · 동의 거부권 · 수신/기안 · 민감 개인정보 · 어색한 문장 · 법적 표현).' : '지시대로 고친 문서 전체만 같은 형식으로 출력합니다. 설명 · 코드블록 · 머리말 없이 문서만. 지시하지 않은 부분과 {변수}는 그대로 둡니다. 주민번호 · 계좌번호 같은 민감 정보는 넣지 않습니다.'}`;
    const res = await CL.call({ system: sys, messages: [{ role: 'user', content: `지시: ${q}\n\n문서 이름: ${d.name}\n문서:\n${d.body}` }], max: review ? 800 : 6000 });
    if (review) { const L = res.text.split('\n').map(l => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean).slice(0, 6); return [...L.map(x => `검토(Claude): ${x}`), ...docCheck(d).filter(x => !/찾지 못/.test(x)).map(x => '검토: ' + x)]; }
    let b = res.text.replace(/^```\w*\n?|```$/g, '').trim(); if (b.length < Math.min(40, d.body.length * .2)) throw new Error('응답이 너무 짧습니다');
    if (c && /채워|채우|맞춰|맞춤/.test(q)) { const r = fillDoc(b, c); b = r.body; }
    const A = d.body.split('\n'), B = b.split('\n'); let n = 0; for (let i = 0; i < Math.max(A.length, B.length); i++) if ((A[i] || '') !== (B[i] || '')) n++;
    d.body = b.slice(0, 60000); return [`Claude 수정 ${n}줄 (${CL.label(res.model)})`];
  } catch (e) { const ch = await base(d, q, c); return [`Claude 연결 실패(${e.message}) — 규칙으로 처리`, ...ch]; }
}; }
/* ── 홈페이지 AI 수정: 구조(색 · 섹션 · 언어)는 규칙, 문구는 Claude ── */
{ const base = ACT['site-gen']; ACT['site-gen'] = () => { const q = ($('#sitePrompt')?.value || UI.sitePrompt || '').trim(); base();
  if (!q || !CL.on('site') || !S.site) return; const s = S.site; toast(`${CL.label()}가 문구를 다듬고 있습니다…`);
  const T = s.sections.map((x, i) => ({ i, type: x.type, eyebrow: x.data.eyebrow, title: x.data.title, sub: x.data.sub, body: typeof x.data.body === 'string' ? x.data.body : undefined, cta: x.data.cta, cols: x.data.cols }));
  CL.call({ system: `교육기관 홈페이지 카피라이터입니다. 입력 JSON 배열과 같은 길이 · 같은 i의 JSON 배열만 출력합니다(설명 금지). 지시에 맞게 eyebrow · title · sub · body · cta · cols(같은 개수의 [제목, 설명])의 문구만 고치고, 지시와 무관한 섹션은 그대로 둡니다. 없는 수치 · 수상 · 후기는 지어내지 않습니다. 기관: ${S.org.name}(${TYPES[S.org.type].name}).`, messages: [{ role: 'user', content: `지시: ${q}\n섹션: ${JSON.stringify(T)}` }], max: 3000 })
    .then(res => { const m = res.text.match(/\[[\s\S]*\]/); if (!m) throw new Error('형식 오류'); const R = JSON.parse(m[0]); let n = 0;
      R.forEach(o => { const x = s.sections[o.i]; if (!x) return; ['eyebrow', 'title', 'sub', 'body', 'cta'].forEach(k => { if (typeof o[k] === 'string' && x.data[k] !== undefined && o[k] !== x.data[k]) { x.data[k] = o[k].slice(0, 300); n++; } }); if (Array.isArray(o.cols) && Array.isArray(x.data.cols) && o.cols.length === x.data.cols.length) { const nc = o.cols.map(r => [String(r[0] || '').slice(0, 60), String(r[1] || '').slice(0, 120)]); if (JSON.stringify(nc) !== JSON.stringify(x.data.cols)) { x.data.cols = nc; n++; } } });
      if (s.log?.[0]) s.log[0].ch = [...s.log[0].ch.filter(c => c !== '변경 없음'), `Claude 문구 ${n}곳`]; save(); render(); toast(`${CL.label(res.model)}가 문구 ${n}곳을 고쳤습니다.`, 'ok'); })
    .catch(e => toast(`Claude 문구 수정 실패(${e.message}) — 규칙 수정만 적용했습니다.`, 'warn')); }; }
/* ── 설정 › 연동: Claude 카드 ── */
function claudeCard() { const c = CL.get();
  return `<div class="card clc"><div class="ch"><span class="orb sm">${ic('spark', 14)}</span><b>Claude AI 연결</b>${c.key ? tag('연결됨', 'g') : tag('미연결')}<span class="sp"></span><small>대화 · 문서 · 홈페이지 AI 수정</small></div>
    <div class="form2"><label class="fl">Anthropic API 키<input type="password" id="clKey" autocomplete="off" placeholder="${c.key ? '•••• 저장됨 — 바꾸려면 새 키 입력' : 'sk-ant-…'}"></label>
    <label class="fl">모델<select id="clModel" data-chg="cl-model">${CLM.map(([id, n, dd]) => `<option value="${id}" ${c.model === id ? 'selected' : ''}>${n} — ${dd}</option>`).join('')}</select></label></div>
    <div class="chips2">${[['chat', 'AI SAM 대화'], ['docs', '문서 AI 수정'], ['site', '홈페이지 AI 수정']].map(([k, l]) => `<label class="ckl"><input type="checkbox" data-chg="cl-use" data-v="${k}" ${c[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <div class="bar2"><button class="btn ink sm" data-act="cl-save">${ic('check', 14)} 저장 · 연결 테스트</button>${c.key ? `<button class="btn sm ghost" data-act="cl-off">연결 해제</button>` : ''}<small class="mini">호출 ${c.calls || 0}회 · 입력 ${(c.tin || 0).toLocaleString()} · 출력 ${(c.tout || 0).toLocaleString()} tokens${c.last ? ' · 최근 ' + esc(c.last) : ''}</small></div>
    <p class="mini">데모: 키는 이 브라우저에만 저장되고(내보내기 · 백업 JSON에 포함되지 않음) 브라우저에서 Anthropic API를 직접 호출합니다. 운영 모드는 키를 서버 함수로 옮깁니다. 이름 · 연락처는 보내지 않고 집계 · 과정명 · 문서 본문만 보냅니다. 실행이 필요한 지시는 항상 계획 카드 → 승인 후 실행됩니다. 요금은 Anthropic 콘솔에서 확인하세요.</p></div>`; }
{ const base = integrView; integrView = () => claudeCard() + base(); }
ACT['cl-model'] = el => { CL.set({ model: el.value }); toast(`${CL.label(el.value)}로 바꿨습니다.`, 'ok'); $$('[data-chg=cl-model]').forEach(s => s.value = el.value); $$('.eng.on').forEach(e => e.lastChild.textContent = CL.label()); };
ACT['cl-use'] = el => { CL.set({ [el.dataset.v]: el.checked }); };
ACT['cl-off'] = () => { CL.set({ key: '' }); render(); toast('Claude 연결을 해제했습니다. 규칙 엔진으로 동작합니다.'); };
ACT['cl-save'] = async el => { const k = $('#clKey')?.value.trim(); if (k) { if (!/^sk-ant-[\w-]{10,}$/.test(k)) { toast('Anthropic API 키 형식(sk-ant-…)이 아닙니다.', 'warn'); return; } CL.set({ key: k }); }
  if (!CL.get().key) { toast('API 키를 입력하세요.', 'warn'); return; } el.disabled = true; el.textContent = '연결 확인 중…';
  try { const r = await CL.call({ system: '한 단어로만 답하세요.', messages: [{ role: 'user', content: '연결 확인: "확인"이라고 답하세요.' }], max: 16 }); toast(`${CL.label(r.model)} 연결 확인 — 응답 「${r.text.slice(0, 20)}」`, 'ok'); } catch (e) { toast(`연결 실패: ${e.message}`, 'bad'); }
  render(); };
/* 대화창 머리: 엔진 · 모델 표시 */
function clBadge() { const c = CL.get(); return c.key && c.chat !== false ? `<span class="eng on"><i></i>${esc(CL.label())}</span><select class="msel" data-chg="cl-model" aria-label="AI 모델">${CLM.map(([id, n]) => `<option value="${id}" ${c.model === id ? 'selected' : ''}>${n.replace('Claude ', '')}</option>`).join('')}</select>` : `<button class="eng" data-act="cl-setup">${ic('spark', 12)} Claude 연결하기</button>`; }
ACT['cl-setup'] = () => { UI.settings = 'integr'; go('settings'); };
Object.assign(DICT, { 'Claude AI 연결': 'Claude AI connection|Claude AI 接続|Claude AI 连接|Claude AI 連接|Kết nối Claude AI|เชื่อมต่อ Claude AI|Koneksi Claude AI|Conexión Claude AI|Connexion Claude AI' });
