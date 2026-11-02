/* 디디쌤 스튜디오 v23 — 외부 연결 허브 · 연결형 업무 자동화(Process) · AI SAM 연결 가이드
   대표님 요청(2026-11-03)
   ① "AI SAM에서 토큰 연결이라던가 필요한 절차를 가이드를 따라서 도와줄 수 있게 해 주고 단계에 포함시켜"
   ② "슬랙 연결, 구글 연결 등을 통해 업무 자동화와 Process를 금방금방 연결하고 자동화시킬 수 있게 해 줘"
   - 운영 › 외부 연결: Claude API 키 · MCP 키 · Slack · Google(Calendar · Sheets · Drive · Gmail) · 토스페이먼츠(읽기 전용) · 채널톡
     카드마다 상태(미연결 · 연결됨 · 점검 필요) · 단계별 안내 · 입력 칸 · [연결 테스트] · [연결 해제]
   - 비밀값(웹훅 주소 · 봇 토큰 · Google 토큰)은 Claude 키와 같은 방식으로 이 브라우저 저장소에만 둔다(S · 내보내기 · 백업에 포함하지 않음). 화면에는 가려서 표시.
   - 업무 자동화: 실행 단계 Slack 알림 · Sheets 행 추가 · Calendar 일정 · Gmail 발송 추가, 원클릭 Process 템플릿 8종, 단계별 실행 기록(데모)
   - AI SAM: connect_guide · create_automation 도구, 키를 대화에 붙여 넣으면 저장하지 않고 경고 후 카드 입력 칸으로 안내
   - 시작 가이드: '외부 연결' 단계(자동화 앞), 연결이 1개 이상 생기면 자동 완료
   실제 외부 호출 지점은 '운영:' 주석으로 표시한다. 데모는 형식 검증 · 상태 · 흐름까지 완성한다. */
'use strict';
if (!IC.plug) IC.plug = '<path d="M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v4"/>';
if (!IC.check) IC.check = '<path d="M5 12l5 5L20 7"/>';
if (!IC.arrow) IC.arrow = '<path d="M5 12h14M13 6l6 6-6 6"/>';

/* ═════════ 저장: 상태(S.settings.conn) · 비밀값(브라우저 저장소) ═════════ */
const cnLsKey = () => 'didisam.conn.' + ((S && S.org && S.org.room && S.org.room.tid) || (typeof DREG !== 'undefined' && DREG.cur && DREG.cur()) || 'local');
const CNS = {
  get() { try { const v = JSON.parse(localStorage.getItem(cnLsKey()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } },
  set(p) { try { localStorage.setItem(cnLsKey(), JSON.stringify({ ...this.get(), ...p })); return true; } catch (e) { toast('브라우저 저장 공간에 저장하지 못했습니다.', 'warn'); return false; } },
  del(...ks) { const v = this.get(); ks.forEach(k => delete v[k]); try { localStorage.setItem(cnLsKey(), JSON.stringify(v)); } catch (e) { } }
};
function cnEnsure() {
  if (!S || !S.settings) return {};
  const c = S.settings.conn = S.settings.conn && typeof S.settings.conn === 'object' ? S.settings.conn : {};
  c.slack = Object.assign({ st: '미연결', mode: 'webhook', ch: '', mask: '', at: '', test: '', err: '' }, c.slack || {});
  c.google = Object.assign({ st: '미연결', acct: '', svcs: { calendar: true, sheets: true, drive: false, gmail: true }, sheet: '', cal: 'primary', from: '', client: '', at: '', test: '', err: '' }, c.google || {});
  c.channeltalk = Object.assign({ at: '', test: '', err: '' }, c.channeltalk || {});
  c.claude = Object.assign({ test: '', err: '' }, c.claude || {});
  c.log = Array.isArray(c.log) ? c.log.slice(0, 60) : [];
  return c;
}
const cnMask = v => { v = String(v || ''); if (!v) return ''; if (v.length <= 10) return '••••' + v.slice(-2); return v.slice(0, 6) + '••••' + v.slice(-4); };
function cnLog(svc, msg, ok = true) { const c = cnEnsure(); c.log.unshift({ at: nowStr(), svc, msg: String(msg).slice(0, 160), ok }); c.log = c.log.slice(0, 60); }
const CN_ST = { off: '미연결', on: '연결됨', chk: '점검 필요' };
const cnTone = st => st === CN_ST.on ? 'g' : st === CN_ST.chk ? 'y' : '';

/* ═════════ 서비스 정의: 이름 · 쓰임 · 단계별 안내 ═════════ */
const CN_GSCOPE = {
  calendar: ['Google Calendar', 'https://www.googleapis.com/auth/calendar.events', '상담 · 수업 일정 만들기'],
  sheets: ['Google Sheets', 'https://www.googleapis.com/auth/spreadsheets', '가입 · 결제 · 수료 기록 행 추가'],
  drive: ['Google Drive', 'https://www.googleapis.com/auth/drive.file', '보고서 · 첨부 파일 저장(디디쌤이 만든 파일만)'],
  gmail: ['Gmail', 'https://www.googleapis.com/auth/gmail.send', '안내 · 영수 메일 보내기(발송 전용)']
};
const CN = {
  claude: { name: 'Claude API 키', logo: 'C', col: '#D97757', use: 'AI SAM 대화 · 문서 · 홈페이지 AI 수정', guide: 'cn-claude',
    steps: ['console.anthropic.com에 로그인한 뒤 [Settings] › [API Keys]에서 [Create Key]를 누릅니다.', '키 이름(예: 디디쌤 스튜디오)을 정하고 생성된 키(sk-ant-…)를 [Copy]로 복사합니다. 키는 이 창에서 한 번만 보입니다.', '아래 입력 칸에 붙여 넣고 [연결 테스트]를 누릅니다. 대화창에는 붙여 넣지 않습니다.', '[Billing]에서 결제 수단과 월 사용 한도를 정해 두면 과금 사고를 막을 수 있습니다.'] },
  mcp: { name: 'MCP 키(외부 AI 연결)', logo: 'M', col: '#4C77C5', use: 'Claude · ChatGPT · 사내 에이전트가 우리 데이터로 일하기', guide: 'mcp',
    steps: ['키 이름(어디에 쓰는지)과 권한(읽기 전용 · 읽기 + 쓰기)을 정하고 [키 발급]을 누릅니다.', '발급 창에서 키와 앱별 설정(Claude Code · 데스크톱 · 원격 MCP)을 복사합니다. 키는 한 번만 보입니다.', 'AI 앱 설정에 붙여 넣고 "디디쌤에서 이번 주 운영 현황 요약해줘"라고 지시해 연결을 확인합니다.'] },
  slack: { name: 'Slack', logo: 'S', col: '#4A154B', use: '가입 · 결제 · 상담 · 미접속 알림을 운영 채널로', guide: 'cn-slack',
    steps: ['api.slack.com/apps에서 [Create New App] › [From scratch]를 누르고 앱 이름(예: 디디쌤 알림)과 워크스페이스를 고릅니다.', '왼쪽 메뉴 [Incoming Webhooks]에서 [Activate Incoming Webhooks]를 켭니다.', '아래 [Add New Webhook to Workspace]를 누르고 알림을 받을 채널(예: #교육운영)을 고른 뒤 [허용]을 누릅니다.', '생성된 Webhook URL(https://hooks.slack.com/services/…)을 [Copy]로 복사해 아래 입력 칸에 붙여 넣습니다.', '[연결 테스트]를 누르면 채널로 테스트 메시지를 보냅니다.'],
    alt: '채널을 바꿔 가며 보내려면 봇 토큰 방식을 씁니다: [OAuth & Permissions] › Bot Token Scopes에 chat:write를 추가 → [Install to Workspace] → Bot User OAuth Token(xoxb-…) 복사 → 채널에서 /invite @앱이름.' },
  google: { name: 'Google Workspace', logo: 'G', col: '#1A73E8', use: 'Calendar 일정 · Sheets 기록 · Drive 저장 · Gmail 발송', guide: 'cn-google',
    steps: ['아래에서 쓸 서비스(Calendar · Sheets · Drive · Gmail)를 고릅니다. 고른 서비스의 권한만 요청합니다.', '[Google 계정으로 연결]을 누르고 기관 업무용 Google 계정을 고릅니다.', '동의 화면에서 요청 권한을 확인하고 [허용]을 누릅니다.', 'Sheets에 기록하려면 기록할 스프레드시트 주소(URL)를 붙여 넣습니다. 주소의 /d/ 뒤 ID만 저장합니다.', '[연결 테스트]로 서비스별 권한을 확인합니다.'],
    alt: '운영 서버 설정(관리자 1회): Google Cloud 콘솔 › API 및 서비스 › 사용자 인증 정보에서 OAuth 클라이언트 ID(웹 애플리케이션)를 만들고, 승인된 JavaScript 원본에 스튜디오 주소를 등록합니다. Calendar · Sheets · Drive · Gmail API를 사용 설정합니다. Workspace 관리자 콘솔에서 앱 액세스를 허용해야 할 수 있습니다.' },
  toss: { name: '토스페이먼츠', logo: 'T', col: '#0064FF', use: '클래스 · 교재 · 청구서 결제', guide: '',
    steps: ['매출 › PG 설정에서 [토스페이먼츠 가입하기]를 누르고 사업자 정보 · 정산 계좌를 입력합니다.', '토스페이먼츠 심사(최대 4주)가 끝나면 상점 ID(MID)가 발급됩니다.', '승인되면 이 카드가 자동으로 「연결됨」으로 바뀝니다. 결제 키는 디디쌤 서버에 보관되며 이 화면에서 입력하지 않습니다.'] },
  channeltalk: { name: '채널톡', logo: 'CH', col: '#6447F5', use: '홈페이지 상담 버튼 · 상담 요약', guide: '',
    steps: ['채널톡 데스크(desk.channel.io)에 로그인합니다.', '[채널 설정] › [버튼 설치 및 설정]에서 플러그인 키(Plugin Key)를 [복사]합니다.', '아래 입력 칸에 붙여 넣고 [연결 테스트]를 누르면 홈페이지 상담 버튼에 바로 적용됩니다.', '상담 내용 동기화(시크릿 키)는 소통 › 상담 설정에서 따로 연결합니다.'] }
};
const CN_IDS = ['claude', 'mcp', 'slack', 'google', 'toss', 'channeltalk'];
const cnAlias = s => { s = String(s || '').toLowerCase().trim(); if (/claude|클로드|anthropic|api\s*키/.test(s)) return 'claude'; if (/mcp|외부\s*ai/.test(s)) return 'mcp'; if (/slack|슬랙/.test(s)) return 'slack'; if (/google|구글|gmail|지메일|sheet|시트|calendar|캘린더|drive|드라이브|workspace/.test(s)) return 'google'; if (/toss|토스|pg|결제/.test(s)) return 'toss'; if (/channel|채널톡/.test(s)) return 'channeltalk'; return CN[s] ? s : ''; };

/* ═════════ 상태 판정 ═════════ */
function cnMcpActive() { const L = (typeof MCPX !== 'undefined' && MCPX.keys) || S.apikeys || []; return L.filter(k => !k.revoked_at).length; }
function cnStatus(id) {
  const c = cnEnsure(); const sec = CNS.get();
  if (id === 'claude') { const k = typeof CL !== 'undefined' && CL.get().key; return !k ? { st: CN_ST.off, note: 'API 키 없음 — 규칙 엔진으로 동작' } : c.claude.err ? { st: CN_ST.chk, note: c.claude.err } : { st: CN_ST.on, note: `${CL.label()} · 키 ${cnMask(k)}` }; }
  if (id === 'mcp') { const n = cnMcpActive(); return n ? { st: CN_ST.on, note: `사용 중인 키 ${n}개` } : { st: CN_ST.off, note: '발급한 키 없음' }; }
  if (id === 'slack') { const s = c.slack; if (s.st === CN_ST.off) return { st: CN_ST.off, note: '알림 채널 미설정' }; if (s.mode !== 'demo' && !sec.slackUrl && !sec.slackBot) return { st: CN_ST.chk, note: '이 브라우저에 연결 정보가 없습니다 — 다시 입력하세요' }; return { st: s.st, note: s.err || `${s.mode === 'demo' ? '데모 연결' : s.mode === 'bot' ? '봇 토큰' : '웹훅'} · ${s.ch || '기본 채널'}` }; }
  if (id === 'google') { const g = c.google; if (g.st === CN_ST.off) return { st: CN_ST.off, note: 'Google 계정 미연결' }; if (!sec.gTok) return { st: CN_ST.chk, note: '이 브라우저에 로그인 정보가 없습니다 — 다시 연결하세요' }; return { st: g.st, note: g.err || `${g.acct} · ${Object.keys(CN_GSCOPE).filter(k => g.svcs[k]).map(k => CN_GSCOPE[k][0].replace('Google ', '')).join(' · ')}` }; }
  if (id === 'toss') { const T = S.settings.toss || {}; const st = T.status || '미가입'; return st === '승인' ? { st: CN_ST.on, note: `상점 ID ${cnMask(T.mid)}` } : ['신청', '심사중'].includes(st) ? { st: CN_ST.chk, note: `심사 중 — ${st}` } : st === '반려' ? { st: CN_ST.chk, note: '심사 반려 — 사유 확인 필요' } : { st: CN_ST.off, note: '토스페이먼츠 미가입' }; }
  if (id === 'channeltalk') { const k = (S.settings.chatbot || {}).ctKey; return !k ? { st: CN_ST.off, note: '플러그인 키 없음' } : c.channeltalk.err ? { st: CN_ST.chk, note: c.channeltalk.err } : { st: CN_ST.on, note: `플러그인 키 ${cnMask(k)}` }; }
  return { st: CN_ST.off, note: '' };
}
const cnOn = id => cnStatus(id).st === CN_ST.on;
/* 시작 가이드 '외부 연결' 완료 판정: 허브에서 만든 연결(토스 심사 상태는 샘플 데이터라 제외) */
const cnMade = () => ['claude', 'mcp', 'slack', 'google', 'channeltalk'].filter(cnOn).length;

/* ═════════ 연결 동작 ═════════ */
const CN_RE = {
  claude: /^sk-ant-[\w-]{10,}$/,
  hook: /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]{12,}$/,
  bot: /^xoxb-[0-9A-Za-z-]{20,}$/,
  ch: /^(#[\w가-힣.-]{1,80}|[CG][A-Z0-9]{6,})$/,
  ct: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  sheet: /\/spreadsheets\/d\/([\w-]{20,})|^([\w-]{30,})$/
};
const cnVal = id => { const el = $('#' + id); return el ? el.value.trim() : ''; };
function cnSig(k) { if (typeof gdSig === 'function') gdSig(k); }
function cnDone(id, msg) { cnLog(id, msg, true); logAudit(`외부 연결 — ${CN[id].name} ${msg}`); save(); render(); cnSig('cn_' + id); }

/* Slack: 웹훅(기본) · 봇 토큰 · 데모 */
async function cnSlackTest(fromBtn) {
  const c = cnEnsure(); const s = c.slack; const url = cnVal('cnSlUrl'), bot = cnVal('cnSlBot'), ch = cnVal('cnSlCh') || s.ch;
  const mode = ($('[name=cnSlMode]:checked') || {}).value || s.mode || 'webhook';
  if (mode === 'webhook' && url) { if (!CN_RE.hook.test(url)) { toast('Slack Incoming Webhook 주소 형식(https://hooks.slack.com/services/…)이 아닙니다.', 'warn'); return; } CNS.set({ slackUrl: url }); CNS.del('slackBot'); }
  if (mode === 'bot' && bot) { if (!CN_RE.bot.test(bot)) { toast('봇 토큰 형식(xoxb-…)이 아닙니다.', 'warn'); return; } CNS.set({ slackBot: bot }); CNS.del('slackUrl'); }
  if (ch && !CN_RE.ch.test(ch)) { toast('채널은 #채널이름 또는 채널 ID(C…) 형식으로 입력하세요.', 'warn'); return; }
  const sec = CNS.get();
  if (mode === 'webhook' && !sec.slackUrl) { toast('Webhook URL을 입력하세요. 모르시면 위 단계 안내를 따라 하세요.', 'warn'); $('#cnSlUrl')?.focus(); return; }
  if (mode === 'bot' && !sec.slackBot) { toast('봇 토큰(xoxb-…)을 입력하세요.', 'warn'); $('#cnSlBot')?.focus(); return; }
  if (mode === 'bot' && !ch) { toast('봇 토큰 방식은 보낼 채널이 필요합니다.', 'warn'); $('#cnSlCh')?.focus(); return; }
  Object.assign(s, { mode, ch: ch || s.ch || '', mask: cnMask(mode === 'bot' ? sec.slackBot : sec.slackUrl), at: s.at || today() });
  if (fromBtn) { fromBtn.disabled = true; fromBtn.textContent = '테스트 중…'; }
  const text = `[${S.org.name}] 디디쌤 스튜디오 연결 테스트입니다. 이 채널로 자동화 알림이 옵니다.`;
  let note = '';
  if (mode === 'webhook') {
    /* 운영: 서버 큐(/api/hooks/slack)에서 전송 · 재시도. 데모는 실제 hooks.slack.com 주소일 때만 브라우저에서 한 번 보낸다(no-cors라 응답 본문은 확인 불가) */
    try { await fetch(sec.slackUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ text }) }); note = '테스트 메시지 전송 요청 완료 — 채널에서 도착을 확인하세요'; }
    catch (e) { note = '형식 확인 완료 · 이 화면의 보안 정책으로 브라우저 직접 전송이 막혀 운영 서버에서 전송합니다'; }
  } else note = '형식 확인 완료(데모) — 운영: chat.postMessage로 채널 전송'; /* 운영: POST https://slack.com/api/chat.postMessage (서버 프록시, Authorization: Bearer xoxb-…) */
  Object.assign(s, { st: CN_ST.on, test: `${nowStr()} · ${note}`, err: '' });
  toast(`Slack 연결 — ${note}`, 'ok'); cnDone('slack', `연결 테스트(${mode === 'bot' ? '봇 토큰' : '웹훅'})`);
}
function cnSlackDemo() { const s = cnEnsure().slack; Object.assign(s, { st: CN_ST.on, mode: 'demo', ch: s.ch || '#교육운영', mask: '', at: today(), test: `${nowStr()} · 데모 연결(실제 전송 없음)`, err: '' }); toast('Slack을 데모로 연결했습니다. 자동화 실행 시 전송 대신 기록만 남깁니다.', 'ok'); cnDone('slack', '데모 연결'); }

/* Google: 데모 OAuth(동의 화면 체험) */
function cnGoogleConnect() {
  const g = cnEnsure().google; const sv = Object.keys(CN_GSCOPE).filter(k => g.svcs[k]);
  if (!sv.length) { toast('연결할 서비스를 하나 이상 고르세요.', 'warn'); return; }
  const client = cnVal('cnGClient') || g.client; if (client && !/\.apps\.googleusercontent\.com$/.test(client)) { toast('OAuth 클라이언트 ID 형식(…apps.googleusercontent.com)이 아닙니다.', 'warn'); return; }
  g.client = client || '';
  /* 운영: google.accounts.oauth2.initCodeClient({ client_id, scope: 'openid email ' + scopes, ux_mode: 'popup', access_type: 'offline', callback: r => POST /api/oauth/google { code } })
     → 서버가 code를 토큰으로 교환하고 refresh token을 암호화해 보관. 브라우저는 토큰을 저장하지 않는다. */
  modal('Google 계정 연결 — 동의 화면(데모)', `<div class="cn-oauth"><div class="cn-gacc"><span class="cn-logo" style="background:#1A73E8">G</span><div><b>디디쌤 스튜디오</b>에서 Google 계정 접근을 요청합니다<small>운영: 실제 Google 로그인 · 동의 화면이 새 창으로 열립니다</small></div></div>
    <label class="fl">연결할 Google 계정<input name="acct" type="email" maxlength="80" placeholder="ops@기관.kr" value="${esc(g.acct || '')}"></label>
    <p class="mini">요청 권한(고른 서비스만):</p><ul class="cn-scopes">${sv.map(k => `<li><b>${esc(CN_GSCOPE[k][0])}</b><span>${esc(CN_GSCOPE[k][2])}</span><code>${esc(CN_GSCOPE[k][1].replace('https://www.googleapis.com/auth/', ''))}</code></li>`).join('')}</ul>
    <p class="mini">로그인 정보(토큰)는 이 브라우저에만 보관되고 화면 · 내보내기 파일에는 나타나지 않습니다. 운영 모드에서는 서버가 암호화해 보관합니다.</p></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '허용', kind: 'pri', run: w => { const a = fv(w, 'acct'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)) { toast('Google 계정(이메일)을 입력하세요.', 'warn'); return false; }
      const b = new Uint8Array(18); crypto.getRandomValues(b); CNS.set({ gTok: 'demo.' + [...b].map(x => x.toString(16).padStart(2, '0')).join(''), gScopes: sv.map(k => CN_GSCOPE[k][1]) });
      Object.assign(g, { st: CN_ST.on, acct: a, from: g.from || a, at: today(), test: `${nowStr()} · 권한 허용(데모)`, err: '' }); toast(`Google 계정(${a})을 연결했습니다.`, 'ok'); cnDone('google', `계정 연결 — ${sv.map(k => CN_GSCOPE[k][0]).join(', ')}`); } }]);
}
function cnGoogleTest() {
  const g = cnEnsure().google; const sec = CNS.get(); const sh = cnVal('cnGSheet');
  if (sh) { const m = sh.match(CN_RE.sheet); if (!m) { toast('스프레드시트 주소(…/spreadsheets/d/ID/…) 또는 ID를 입력하세요.', 'warn'); return; } g.sheet = m[1] || m[2]; }
  const cal = cnVal('cnGCal'); if (cal) g.cal = cal.slice(0, 120);
  if (!sec.gTok) { toast('먼저 [Google 계정으로 연결]을 눌러 권한을 허용하세요.', 'warn'); return; }
  const sv = Object.keys(CN_GSCOPE).filter(k => g.svcs[k]); const granted = sec.gScopes || []; const miss = sv.filter(k => !granted.includes(CN_GSCOPE[k][1]));
  /* 운영: GET https://oauth2.googleapis.com/tokeninfo · Sheets spreadsheets.get · Calendar calendarList.get 으로 권한 확인 */
  if (miss.length) { Object.assign(g, { st: CN_ST.chk, err: `추가 권한 필요 — ${miss.map(k => CN_GSCOPE[k][0]).join(', ')}`, test: `${nowStr()} · 권한 부족` }); toast(`${miss.map(k => CN_GSCOPE[k][0]).join(', ')} 권한이 없습니다. [Google 계정으로 연결]을 다시 눌러 허용하세요.`, 'warn'); cnLog('google', g.err, false); save(); render(); return; }
  if (g.svcs.sheets && !g.sheet) { Object.assign(g, { st: CN_ST.chk, err: 'Sheets 기록용 스프레드시트를 지정하세요', test: `${nowStr()} · 스프레드시트 없음` }); toast('Sheets를 쓰려면 기록할 스프레드시트 주소를 입력하세요.', 'warn'); save(); render(); setTimeout(() => $('#cnGSheet')?.focus(), 60); return; }
  Object.assign(g, { st: CN_ST.on, err: '', test: `${nowStr()} · ${sv.map(k => CN_GSCOPE[k][0].replace('Google ', '')).join(' · ')} 권한 확인(데모)` });
  toast('Google 권한을 확인했습니다(데모).', 'ok'); cnDone('google', '연결 테스트');
}
/* 채널톡: 플러그인 키(공개값) → 홈페이지 상담 버튼에 반영 */
function cnCtTest() {
  const v = cnVal('cnCtKey'); const cb = S.settings.chatbot = Object.assign({ type: 'none', kakaoUrl: '', ctKey: '', label: '상담하기', pos: 'right' }, S.settings.chatbot || {});
  if (v) { if (!CN_RE.ct.test(v)) { toast('채널톡 플러그인 키 형식(8-4-4-4-12 영숫자)이 아닙니다.', 'warn'); return; } cb.ctKey = v; if (cb.type === 'none') cb.type = 'channeltalk'; }
  if (!cb.ctKey) { toast('플러그인 키를 입력하세요.', 'warn'); $('#cnCtKey')?.focus(); return; }
  /* 운영: 홈페이지에서 ChannelIO('boot', { pluginKey }) 응답으로 확인 */
  Object.assign(cnEnsure().channeltalk, { at: today(), test: `${nowStr()} · 플러그인 키 형식 확인 · 홈페이지 상담 버튼 적용`, err: '' });
  toast('채널톡을 연결했습니다. 홈페이지 상담 버튼에 적용됩니다.', 'ok'); cnDone('channeltalk', '플러그인 키 연결');
}
async function cnClaudeTest(btn) {
  const k = cnVal('cnClKey'); if (k) { if (!CN_RE.claude.test(k)) { toast('Anthropic API 키 형식(sk-ant-…)이 아닙니다.', 'warn'); return; } CL.set({ key: k }); }
  if (!CL.get().key) { toast('API 키를 입력하세요. 위 단계 안내를 따라 발급합니다.', 'warn'); $('#cnClKey')?.focus(); return; }
  const c = cnEnsure().claude; if (btn) { btn.disabled = true; btn.textContent = '연결 확인 중…'; }
  /* 운영: 키는 서버 함수(adminAssistant)로 옮기고 서버가 호출 */
  try { const r = await CL.call({ system: '한 단어로만 답하세요.', messages: [{ role: 'user', content: '연결 확인: "확인"이라고 답하세요.' }], max: 16 }); Object.assign(c, { test: `${nowStr()} · ${CL.label(r.model)} 응답 확인`, err: '' }); toast(`${CL.label(r.model)} 연결을 확인했습니다.`, 'ok'); cnDone('claude', '연결 테스트'); }
  catch (e) { Object.assign(c, { test: `${nowStr()} · 실패`, err: `연결 실패: ${e.message}` }); cnLog('claude', c.err, false); save(); render(); toast(c.err, 'bad'); }
}
function cnOff(id) {
  const c = cnEnsure(); const nm = CN[id].name;
  modal(`${nm} 연결 해제`, `<p>${esc(nm)} 연결을 해제합니다. 이 연결을 쓰는 자동화 단계는 「연결 필요」로 표시되고 실행 시 건너뜁니다.</p><p class="mini">발급처(Slack · Google · Anthropic 콘솔)에서도 키 · 앱 권한을 폐기하면 더 안전합니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '연결 해제', kind: 'red', run: () => {
    if (id === 'slack') { CNS.del('slackUrl', 'slackBot'); Object.assign(c.slack, { st: CN_ST.off, mask: '', test: '', err: '', mode: c.slack.mode === 'demo' ? 'webhook' : c.slack.mode }); }
    if (id === 'google') { /* 운영: POST https://oauth2.googleapis.com/revoke?token=… (서버) */ CNS.del('gTok', 'gScopes'); Object.assign(c.google, { st: CN_ST.off, test: '', err: '' }); }
    if (id === 'claude') { CL.set({ key: '' }); Object.assign(c.claude, { test: '', err: '' }); }
    if (id === 'channeltalk') { const cb = S.settings.chatbot; if (cb) { cb.ctKey = ''; if (cb.type === 'channeltalk') cb.type = 'none'; } Object.assign(c.channeltalk, { test: '', err: '' }); }
    cnLog(id, '연결 해제', true); logAudit(`외부 연결 해제 — ${nm}`); save(); render(); toast(`${nm} 연결을 해제했습니다.`); } }]);
}

/* ═════════ 화면: 연결 카드 ═════════ */
function cnGuideHTML(id, open) { const d = CN[id];
  return `<details class="cn-guide" ${open ? 'open' : ''}><summary>${ic('book', 14)} 단계별 연결 안내 ${d.steps.length}단계</summary><ol>${d.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${d.alt ? `<p class="mini cn-alt">${esc(d.alt)}</p>` : ''}</details>`; }
function cnCard(id) {
  const d = CN[id]; const s = cnStatus(id); const c = cnEnsure(); const sec = CNS.get(); const open = UI.cnOpen === id || s.st !== CN_ST.on;
  const pw = (iid, ph, saved) => `<input type="password" id="${iid}" autocomplete="off" spellcheck="false" placeholder="${esc(saved ? `${saved} 저장됨 — 바꾸려면 새 값 입력` : ph)}">`;
  let body = '', acts = '';
  if (id === 'claude') { const k = CL.get().key;
    body = `<label class="fl">Anthropic API 키${pw('cnClKey', 'sk-ant-…', k ? cnMask(k) : '')}</label><label class="fl">모델<select data-chg="cl-model">${CLM.map(([m, n, dd]) => `<option value="${m}" ${CL.get().model === m ? 'selected' : ''}>${n} — ${dd}</option>`).join('')}</select></label>`;
    acts = `<button class="btn ink sm" data-act="cn-test" data-v="claude">${ic('check', 14)} 연결 테스트</button>${k ? `<button class="btn sm ghost" data-act="cn-off" data-v="claude">연결 해제</button>` : ''}`; }
  if (id === 'mcp') { const owner = S.me.role === 'owner';
    body = owner ? `<div class="form2 cn-f2"><label class="fl">키 이름<input id="mcpName" maxlength="40" placeholder="예: 교학팀 Claude 데스크톱"></label><label class="fl">권한<select id="mcpScope"><option value="read">읽기 전용</option><option value="write">읽기 + 쓰기</option></select></label></div>` : '<p class="mini">키 발급은 정운영자만 할 수 있습니다.</p>';
    acts = `${owner ? `<button class="btn ink sm" data-act="mcp-new">${ic('spark', 14)} 키 발급</button>` : ''}<button class="btn sm" data-act="cn-test" data-v="mcp">${ic('check', 14)} 연결 테스트</button><button class="btn sm ghost" data-act="cn-mcp">키 목록 · 폐기</button>`; }
  if (id === 'slack') { const S2 = c.slack; const m = S2.mode === 'bot' ? 'bot' : 'webhook';
    body = `<div class="seg2 cn-mode" role="radiogroup" aria-label="Slack 연결 방식"><label><input type="radio" name="cnSlMode" value="webhook" ${m === 'webhook' ? 'checked' : ''} data-chg="cn-slmode"> 웹훅(간단)</label><label><input type="radio" name="cnSlMode" value="bot" ${m === 'bot' ? 'checked' : ''} data-chg="cn-slmode"> 봇 토큰(채널 선택)</label></div>
      <label class="fl cn-only-webhook" ${m === 'bot' ? 'hidden' : ''}>Incoming Webhook URL${pw('cnSlUrl', 'https://hooks.slack.com/services/…', sec.slackUrl ? cnMask(sec.slackUrl) : '')}</label>
      <label class="fl cn-only-bot" ${m === 'bot' ? '' : 'hidden'}>Bot User OAuth Token${pw('cnSlBot', 'xoxb-…', sec.slackBot ? cnMask(sec.slackBot) : '')}</label>
      <label class="fl">기본 채널<input id="cnSlCh" maxlength="80" placeholder="#교육운영" value="${esc(S2.ch)}"></label>`;
    acts = `<button class="btn ink sm" data-act="cn-test" data-v="slack">${ic('send', 14)} 연결 테스트</button>${s.st === CN_ST.off ? `<button class="btn sm" data-act="cn-demo" data-v="slack">데모로 연결</button>` : `<button class="btn sm ghost" data-act="cn-off" data-v="slack">연결 해제</button>`}`; }
  if (id === 'google') { const g = c.google;
    body = `<div class="cn-svcs">${Object.entries(CN_GSCOPE).map(([k, v]) => `<label class="ckl" title="${esc(v[1])}"><input type="checkbox" data-chg="cn-gsvc" data-v="${k}" ${g.svcs[k] ? 'checked' : ''}> ${esc(v[0].replace('Google ', ''))}<small>${esc(v[2])}</small></label>`).join('')}</div>
      <details class="cn-scope"><summary>요청 권한(scope) 보기</summary><ul>${Object.entries(CN_GSCOPE).filter(([k]) => g.svcs[k]).map(([, v]) => `<li><code>${esc(v[1])}</code></li>`).join('') || '<li>고른 서비스가 없습니다.</li>'}</ul></details>
      <div class="form2 cn-f2"><label class="fl">Sheets 스프레드시트 주소<input id="cnGSheet" maxlength="300" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(g.sheet ? cnMask(g.sheet) : '')}"></label><label class="fl">캘린더 ID<input id="cnGCal" maxlength="120" placeholder="primary" value="${esc(g.cal || '')}"></label></div>
      <details class="cn-scope"><summary>운영 서버 설정(관리자) — OAuth 클라이언트 ID</summary><label class="fl">OAuth 클라이언트 ID(선택)<input id="cnGClient" maxlength="120" placeholder="xxxx.apps.googleusercontent.com" value="${esc(g.client || '')}"></label></details>`;
    acts = `<button class="btn ink sm" data-act="cn-gconnect">${ic('globe', 14)} ${s.st === CN_ST.off ? 'Google 계정으로 연결' : '권한 다시 허용'}</button><button class="btn sm" data-act="cn-test" data-v="google">${ic('check', 14)} 연결 테스트</button>${s.st !== CN_ST.off ? `<button class="btn sm ghost" data-act="cn-off" data-v="google">연결 해제</button>` : ''}`; }
  if (id === 'toss') { const T = S.settings.toss || {};
    body = `<dl class="cn-dl"><dt>상태</dt><dd>${esc(T.status || '미가입')}${T.reason ? ` — ${esc(T.reason)}` : ''}</dd><dt>상점 ID(MID)</dt><dd>${T.mid ? `<code>${esc(cnMask(T.mid))}</code>` : '발급 전'}</dd><dt>결제에 쓰는 PG</dt><dd>${esc(typeof sl2PayPG === 'function' ? ({ toss: '토스페이먼츠', nice: '디디쌤 연결 PG', none: '결제 준비 중' })[sl2PayPG()] || '—' : '—')}</dd></dl><p class="mini">읽기 전용입니다. 가입 · 심사 · 정산정보는 매출 › PG 설정에서 진행합니다.</p>`;
    acts = `<button class="btn ink sm" data-act="cn-toss">${ic('arrow', 14)} ${T.status === '승인' ? 'PG 설정 열기' : '토스페이먼츠 가입 · 심사 열기'}</button>`; }
  if (id === 'channeltalk') { const k = (S.settings.chatbot || {}).ctKey;
    body = `<label class="fl">플러그인 키(Plugin Key)${pw('cnCtKey', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', k ? cnMask(k) : '')}</label>`;
    acts = `<button class="btn ink sm" data-act="cn-test" data-v="channeltalk">${ic('check', 14)} 연결 테스트</button>${k ? `<button class="btn sm ghost" data-act="cn-off" data-v="channeltalk">연결 해제</button>` : ''}`; }
  const last = id === 'claude' ? c.claude.test : id === 'slack' ? c.slack.test : id === 'google' ? c.google.test : id === 'channeltalk' ? c.channeltalk.test : '';
  return `<div class="card cn-card ${UI.cnOpen === id ? 'cn-hl' : ''}" id="cnCard-${id}" data-st="${esc(s.st)}"><div class="cn-h"><span class="cn-logo" style="background:${d.col}">${esc(d.logo)}</span><div><b>${esc(d.name)}</b><small>${esc(d.use)}</small></div>${tag(s.st, cnTone(s.st))}</div>
    <p class="cn-note">${esc(s.note)}</p>${cnGuideHTML(id, open)}<div class="cn-body">${body}</div>
    <div class="bar2 cn-acts">${acts}${d.guide ? `<button class="btn sm ghost" data-act="gd-start" data-v="${d.guide}">${ic('spark', 13)} 따라하기</button>` : ''}</div>${last ? `<p class="mini cn-last">최근 확인: ${esc(last)}</p>` : ''}</div>`;
}

/* ═════════ 연결형 자동화(Process) ═════════ */
Object.assign(ACTION, { slack: 'Slack 알림 보내기', gsheet: 'Google Sheets 행 추가', gcal: 'Google Calendar 일정 만들기', gmail: 'Gmail 메일 보내기' });
if (!TRIG['ev:consultNew']) TRIG['ev:consultNew'] = '상담 접수 시';
const CN_ACT = { slack: ['slack', '', 'Slack'], gsheet: ['google', 'sheets', 'Google Sheets'], gcal: ['google', 'calendar', 'Google Calendar'], gmail: ['google', 'gmail', 'Gmail'] };
/* 단계에 필요한 연결이 준비됐는지 */
function cnNeed(act) { const x = CN_ACT[act]; if (!x) return ''; const [svc, sub, nm] = x; if (!cnOn(svc)) return svc === 'google' ? `Google(${nm.replace('Google ', '')})` : nm; if (sub && !cnEnsure().google.svcs[sub]) return `${nm} 권한`; return ''; }
const cnNeeds = acts => [...new Set((acts || []).map(cnNeed).filter(Boolean))];
const cnNeedSvc = acts => [...new Set((acts || []).filter(a => cnNeed(a)).map(a => CN_ACT[a][0]))];
const CN_TPL = [
  { k: 'join-notify', n: '신규 가입 → Slack 알림 + Sheets 기록', tr: 'ev:join', cond: '새로 가입한 회원', acts: ['slack', 'gsheet'], ap: false, d: '가입이 생기면 운영 채널에 알리고 회원 대장 시트에 한 줄을 추가합니다.' },
  { k: 'pay-receipt', n: '결제 완료 → Slack + Gmail 영수 안내', tr: 'ev:pay', cond: '결제 완료', acts: ['slack', 'gmail'], ap: false, d: '결제가 끝나면 매출 채널에 알리고 결제자에게 영수 안내 메일을 보냅니다.' },
  { k: 'inactive7', n: '미접속 7일 → Slack 담당자 알림', tr: 'sc:daily', cond: '7일 이상 미접속', acts: ['slack', 'manager'], ap: false, d: '매일 아침 7일 이상 접속하지 않은 대상을 모아 담당자에게 알립니다.' },
  { k: 'consult-cal', n: '상담 접수 → Calendar 일정 + Slack', tr: 'ev:consultNew', cond: '새 상담 접수', acts: ['gcal', 'slack'], ap: false, d: '상담이 접수되면 담당자 캘린더에 상담 일정을 잡고 채널에 알립니다.' },
  { k: 'weekly-report', n: '주간 리포트 → Sheets + Slack', tr: 'sc:fri', cond: '전체', acts: ['report', 'gsheet', 'slack'], ap: false, d: '매주 금요일 운영 지표를 시트에 쌓고 요약을 채널에 공유합니다.' },
  { k: 'done-cert', n: '수료 → Gmail 축하 + Sheets 수료 대장', tr: 'ev:done', cond: '수료 기준 충족', acts: ['gmail', 'gsheet'], ap: true, d: '수료 기준을 채우면 축하 메일을 보내고 수료 대장 시트에 기록합니다.' },
  { k: 'refund-alert', n: '환불 신청 → Slack 긴급 알림 + 할 일', tr: 'ev:refund', cond: '환불 · 반환 신청', acts: ['slack', 'task'], ap: false, d: '환불 신청이 들어오면 즉시 채널에 알리고 처리 기한이 있는 할 일을 만듭니다.' },
  { k: 'question-slack', n: '질문 등록 → Slack 알림 + AI 답변 초안', tr: 'ev:question', cond: '미답변 질문', acts: ['slack', 'draft'], ap: false, d: '학습자 질문이 올라오면 채널에 알리고 AI 답변 초안을 만들어 둡니다.' }
];
const cnTpl = k => CN_TPL.find(x => x.k === k);
function cnMake(k, o = {}) {
  const T = cnTpl(k); if (!T) return null; const key = 'cn-' + k;
  const ex = S.autos.find(a => a.key === key); if (ex && !o.dup) return { a: ex, dup: true };
  const miss = cnNeeds(T.acts); const a = A(key, o.name || T.n, T.tr, T.cond, T.acts.slice(), T.ap, !miss.length);
  a.proc = true; a.custom = true; a.cfg = { ch: o.ch || cnEnsure().slack.ch || '#교육운영' };
  S.autos.unshift(a); logAudit(`Process 생성 — ${a.name}${miss.length ? ` (연결 필요: ${miss.join(', ')})` : ''}`); return { a, miss };
}
function cnMakeCustom(name, tr, acts, ch) {
  const a = A('cn-custom', String(name || '새 Process').slice(0, 40), TRIG[tr] ? tr : 'sc:mon', '대화 · 화면에서 만든 Process', acts.filter(x => ACTION[x]).slice(0, 6), acts.includes('gmail'), !cnNeeds(acts).length);
  a.key = uid('cnp'); a.proc = true; a.custom = true; a.cfg = { ch: ch || cnEnsure().slack.ch || '#교육운영' }; S.autos.unshift(a); logAudit(`Process 생성 — ${a.name}`); return a;
}
function cnTplCard(T) { const miss = cnNeeds(T.acts); const svc = cnNeedSvc(T.acts); const have = S.autos.some(a => a.key === 'cn-' + T.k);
  return `<div class="cn-tpl ${miss.length ? 'need' : ''}" data-tpl="${T.k}"><div class="cn-tflow"><span class="tr">${esc(trigLabel(T.tr))}</span>${T.acts.map(a => `<span class="ac ${CN_ACT[a] ? 'cx' : ''} ${cnNeed(a) ? 'miss' : ''}">${esc(ACTION[a] || a)}</span>`).join('')}</div><b>${esc(T.n)}</b><p>${esc(T.d)}</p>
    ${miss.length ? `<div class="cn-need">${tag('연결 필요', 'y')} <span>${esc(miss.join(' · '))}</span>${svc.map(s => `<button class="btn sm" data-act="cn-open" data-v="${s}">${esc(CN[s].name)} 연결 안내</button>`).join('')}</div>` : ''}
    <div class="cn-tact">${have ? tag('만들어짐', 'g') : ''}<button class="btn sm ${miss.length ? '' : 'ink'}" data-act="cn-tpl" data-v="${T.k}">${have ? '하나 더 만들기' : miss.length ? '꺼진 상태로 만들기' : '원클릭 만들기'}</button></div></div>`; }
function cnTplHTML(lim) { return `<div class="cn-tpls">${CN_TPL.slice(0, lim || CN_TPL.length).map(cnTplCard).join('')}</div>`; }

/* 실행: 연결 단계를 순서대로(데모) — 각 단계 결과를 실행 기록에 남김 */
function cnExec(a, T) {
  const c = cnEnsure(); const sec = CNS.get(); const n = Math.max(1, T.length); const ch = (a.cfg && a.cfg.ch) || c.slack.ch || '#교육운영';
  return (a.actions || []).filter(x => CN_ACT[x]).map(x => {
    const need = cnNeed(x); if (need) { cnLog(CN_ACT[x][0], `${a.name} — ${ACTION[x]} 건너뜀(${need})`, false); return { act: x, ok: false, msg: `${need} — 건너뜀` }; }
    let msg = '';
    if (x === 'slack') { msg = `${ch}에 알림 1건(대상 ${T.length}건 요약)`;
      /* 운영: 서버 큐 → Slack(웹훅 · chat.postMessage), 실패 시 3회 재시도 */
      if (c.slack.mode === 'webhook' && sec.slackUrl && CN_RE.hook.test(sec.slackUrl)) { try { fetch(sec.slackUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ text: `[${S.org.name}] ${a.name} — 대상 ${T.length}건` }) }).catch(() => { }); msg += ' · 전송 요청'; } catch (e) { } } else msg += ' · 데모'; }
    if (x === 'gsheet') msg = `시트 ${c.google.sheet ? cnMask(c.google.sheet) : ''}에 ${n}행 추가 · 데모`; /* 운영: POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}:append?valueInputOption=USER_ENTERED */
    if (x === 'gcal') msg = `캘린더(${c.google.cal || 'primary'})에 일정 ${n}건 생성 · 데모`; /* 운영: POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events */
    if (x === 'gmail') msg = `${c.google.acct || '연결 계정'}에서 메일 ${n}통 발송 · 데모`; /* 운영: POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send (서버, 발송 한도 확인) */
    cnLog(CN_ACT[x][0], `${a.name} — ${msg}`, true); return { act: x, ok: true, msg };
  });
}
{ const base = targets; targets = a => { if (!a || !String(a.key || '').startsWith('cn-')) return base(a); const k = a.key.slice(3); const d7 = addDays(today(), -7);
  try { if (k === 'join-notify') return S.members.filter(m => (m.joined || '') >= d7).map(m => m.id);
    if (k === 'pay-receipt') return (S.pays || []).filter(p => p.status === '결제 완료' && String(p.at || '').slice(0, 10) >= d7).map(p => p.id);
    if (k === 'inactive7') return S.members.filter(m => m.last && daysAgo(m.last) >= 7).map(m => m.id);
    if (k === 'consult-cal') return (S.consults || []).slice(0, 3).map(x => x.id);
    if (k === 'weekly-report') return ['report'];
    if (k === 'done-cert') return [...new Set(S.classes.flatMap(c => Object.entries(c.prog || {}).filter(([, p]) => (p.p || 0) >= ((c.criteria || {}).threshold || 80)).map(([id]) => id)))];
    if (k === 'refund-alert') return (S.pays || []).filter(p => p.status === '환불 신청').map(p => p.id);
    if (k === 'question-slack') return S.posts.filter(p => p.kind === '질문' && !p.replies).map(p => p.id); } catch (e) { }
  return base(a); }; }
{ const base = runAuto; runAuto = (a, force) => { if (!a || !(a.actions || []).some(x => CN_ACT[x])) return base(a, force);
  const first = S.runs[0]; const res = base(a, force); const r = S.runs[0] !== first ? S.runs[0] : null; let T = []; try { T = targets(a); } catch (e) { }
  const steps = cnExec(a, T); const bad = steps.filter(s => !s.ok).length;
  if (r) { r.steps = steps; r.proc = true; r.st = !bad ? '완료' : bad === steps.length ? '연결 필요' : '일부 건너뜀'; }
  save(); return `${res}${bad ? ` · 연결 필요로 ${bad}단계 건너뜀` : ` · 연결 단계 ${steps.length}개 완료(데모)`}`; }; }
function cnRunsHTML(lim = 12) { const R = (S.runs || []).filter(r => r.steps).slice(0, lim);
  return table(['시각', 'Process', '단계별 결과', '상태'], R.map(r => [esc(r.at), esc(r.name), `<div class="cn-steps">${r.steps.map(s => `<span class="${s.ok ? 'ok' : 'no'}" title="${esc(s.msg)}">${s.ok ? '✓' : '!'} ${esc(ACTION[s.act] || s.act)}<small>${esc(s.msg)}</small></span>`).join('')}</div>`, tag(r.st, r.st === '완료' ? 'g' : 'y')]), '아직 Process 실행 기록이 없습니다. 템플릿을 만들고 [지금 실행]으로 확인하세요.'); }
/* Process 직접 만들기: 트리거 → 단계 최대 5개(순서대로) */
function cnBuilder(pre) {
  const opt = sel => `<option value="">— 없음 —</option>${Object.entries(ACTION).map(([k, v]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${esc(v)}${CN_ACT[k] && cnNeed(k) ? ' (연결 필요)' : ''}</option>`).join('')}`;
  const P = pre || { n: '', tr: 'ev:join', acts: ['slack', 'gsheet'] };
  modal('Process 만들기 — 트리거 → 단계', `<label class="fl">이름<input name="n" maxlength="40" value="${esc(P.n)}" placeholder="예: 신규 가입 환영 Process"></label><label class="fl">트리거(언제)<select name="t">${Object.entries(TRIG).map(([k, v]) => `<option value="${k}" ${P.tr === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <div class="cn-bsteps">${[0, 1, 2, 3, 4].map(i => `<label class="fl"><span>단계 ${i + 1}</span><select name="s${i}">${opt(P.acts[i] || '')}</select></label>`).join('')}</div>
    <label class="fl">Slack 채널(선택)<input name="ch" maxlength="80" placeholder="${esc(cnEnsure().slack.ch || '#교육운영')}"></label><p class="mini">단계는 위에서부터 순서대로 실행됩니다. 연결이 없는 단계는 실행 시 건너뛰고 기록에 남깁니다.</p>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w => { const acts = [0, 1, 2, 3, 4].map(i => fv(w, 's' + i)).filter(Boolean); if (!acts.length) { toast('단계를 하나 이상 고르세요.', 'warn'); return false; }
      const ch = fv(w, 'ch'); if (ch && !CN_RE.ch.test(ch)) { toast('채널은 #채널이름 형식으로 입력하세요.', 'warn'); return false; }
      const a = cnMakeCustom(fv(w, 'n') || '새 Process', fv(w, 't'), [...new Set(acts)], ch); save(); render(); const miss = cnNeeds(a.actions); toast(miss.length ? `「${a.name}」을 꺼진 상태로 만들었습니다. 연결 필요: ${miss.join(', ')}` : `「${a.name}」을 만들었습니다.`, miss.length ? 'warn' : 'ok'); } }], true);
}

/* ═════════ 허브 화면 ═════════ */
MENU.conn = { label: '외부 연결', ws: 'ops', owner: true };
VIEWS.conn = () => {
  cnEnsure(); const St = CN_IDS.map(cnStatus); const on = St.filter(s => s.st === CN_ST.on).length, chk = St.filter(s => s.st === CN_ST.chk).length;
  const P = S.autos.filter(a => (a.actions || []).some(x => CN_ACT[x])); const L = cnEnsure().log;
  return head('외부 연결', '외부 서비스를 연결하면 AI SAM과 업무 자동화가 Slack · Google · 결제와 함께 일합니다. 키 · 토큰은 이 브라우저에만 저장되고 화면에는 가려서 표시합니다.', `<button class="btn ai" data-act="chat-q" data-v="Slack 연결 도와줘">${ic('spark', 14)} AI SAM에게 연결 맡기기</button><button class="btn" data-act="go" data-v="auto">업무 자동화</button>`) +
    `<section class="grid g4">${kpi('연결됨', `${on}/${CN_IDS.length}`, chk ? `점검 필요 ${chk}개` : '정상', on ? 'g' : '')}${kpi('연결형 Process', P.length + '개', `켜짐 ${P.filter(a => a.on).length}개`)}${kpi('연결 필요 Process', P.filter(a => cnNeeds(a.actions).length).length + '개', '연결하면 바로 실행')}${kpi('최근 연결 기록', L.length ? L[0].at.split(' ').slice(0, 3).join(' ') : '없음', L.length ? `${L.length}건` : '')}</section>
    <p class="mini cn-sec">${ic('lock' in IC ? 'lock' : 'gear', 13)} 키 · 토큰은 대화창(AI SAM)에 붙여 넣지 마세요. AI SAM은 단계를 안내하고 이 화면의 입력 칸을 열어 드립니다. 데모에서는 실제 외부 호출 대신 형식 확인 · 기록만 남깁니다(Slack 웹훅 제외).</p>
    <div class="cn-grid">${CN_IDS.map(cnCard).join('')}</div>
    <div class="ph cn-ph"><div class="phl"><h2>Process 템플릿</h2><p>트리거 하나에 여러 단계를 잇는 연결형 자동화입니다. 누르면 업무 자동화에 바로 추가됩니다.</p></div><div class="phr"><button class="btn" data-act="cn-build">+ Process 직접 만들기</button></div></div>${cnTplHTML()}
    <h2 class="h2">Process 실행 기록</h2>${cnRunsHTML(8)}
    <details class="cn-log"><summary>연결 기록 ${L.length}건</summary>${table(['시각', '서비스', '내용', '결과'], L.slice(0, 20).map(x => [esc(x.at), esc((CN[x.svc] || {}).name || x.svc), esc(x.msg), x.ok ? tag('정상', 'g') : tag('건너뜀', 'y')]), '기록이 없습니다.')}</details>`;
};
/* 업무 자동화 화면: 템플릿 · 연결 필요 표시 · 단계별 실행 기록 */
{ const base = VIEWS.auto; VIEWS.auto = () => { let h = base(); cnEnsure();
  const strip = `<div class="cn-astrip">${['slack', 'google'].map(id => { const s = cnStatus(id); return `<button class="cn-chip ${cnTone(s.st)}" data-act="cn-open" data-v="${id}"><i style="background:${CN[id].col}">${CN[id].logo}</i>${esc(CN[id].name)} ${esc(s.st)}</button>`; }).join('')}<span class="sp"></span><button class="btn sm" data-act="cn-build">+ Process 만들기</button><button class="btn sm ghost" data-act="go" data-v="conn">외부 연결 관리</button></div>`;
  const gal = `<details class="cn-agal" ${UI.cnGal === false ? '' : 'open'}><summary data-act="cn-gal"><b>Slack · Google Process 템플릿</b><small>원클릭으로 만들고, 연결이 없으면 안내로 바로 이동합니다</small></summary>${cnTplHTML()}</details>`;
  const i = h.indexOf('<div class="autos">'); h = i >= 0 ? h.slice(0, i) + strip + gal + h.slice(i) : h + strip + gal;
  return h + `<h2 class="h2">Process 단계별 실행 기록</h2>${cnRunsHTML(10)}`; }; }
AFTER.push(cur => { if (!S || !S.org || (cur && cur.tab !== 'auto')) return; (S.autos || []).forEach(a => { const miss = cnNeeds(a.actions); if (!miss.length) return; const b = document.querySelector(`.auto [data-act="auto-run"][data-v="${a.id}"]`); const box = b && b.closest('.auto'); if (!box || box.querySelector('.cn-need')) return;
  const svc = cnNeedSvc(a.actions); box.querySelector('.flow')?.insertAdjacentHTML('afterend', `<div class="cn-need">${tag('연결 필요', 'y')} <span>${esc(miss.join(' · '))}</span>${svc.map(s => `<button class="btn sm" data-act="cn-open" data-v="${s}">${esc(CN[s].name)} 연결 안내</button>`).join('')}</div>`); }); });

/* ═════════ 동작 ═════════ */
function cnFocus(id) { if (!CN[id]) return; if (S.me.role !== 'owner') { toast('외부 연결은 정운영자만 관리할 수 있습니다.', 'warn'); return; } UI.cnOpen = id; if (typeof bMenuOn === 'function') bMenuOn('conn'); closeModal(); go('conn');
  setTimeout(() => { const c = $('#cnCard-' + id); if (!c) return; c.scrollIntoView({ block: 'center', behavior: 'smooth' }); const d = c.querySelector('details.cn-guide'); if (d) d.open = true; const inp = c.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([hidden])'); if (inp && inp.offsetParent) inp.focus({ preventScroll: true }); }, 160); }
ACT['cn-open'] = el => cnFocus(el.dataset.v);
ACT['cn-test'] = el => { const v = el.dataset.v; if (v === 'slack') return cnSlackTest(el); if (v === 'google') return cnGoogleTest(); if (v === 'channeltalk') return cnCtTest(); if (v === 'claude') return cnClaudeTest(el);
  if (v === 'mcp') { const n = cnMcpActive(); if (n) { toast(`사용 중인 MCP 키 ${n}개를 확인했습니다. AI 앱에서 "디디쌤 운영 현황 요약해줘"로 연결을 확인하세요.`, 'ok'); cnLog('mcp', `키 확인 ${n}개`); save(); cnSig('cn_mcp'); } else { toast('발급한 키가 없습니다. 키 이름을 정하고 [키 발급]을 누르세요.', 'warn'); $('#mcpName')?.focus(); } } };
ACT['cn-off'] = el => cnOff(el.dataset.v);
ACT['cn-demo'] = el => { if (el.dataset.v === 'slack') cnSlackDemo(); };
ACT['cn-gconnect'] = () => cnGoogleConnect();
ACT['cn-gsvc'] = el => { const g = cnEnsure().google; g.svcs[el.dataset.v] = el.checked; if (g.st === CN_ST.on) { const gr = CNS.get().gScopes || []; if (el.checked && !gr.includes(CN_GSCOPE[el.dataset.v][1])) { g.st = CN_ST.chk; g.err = `추가 권한 필요 — ${CN_GSCOPE[el.dataset.v][0]}`; } } save(); render(); };
ACT['cn-slmode'] = el => { const m = el.value; $$('.cn-only-webhook').forEach(x => x.hidden = m !== 'webhook'); $$('.cn-only-bot').forEach(x => x.hidden = m !== 'bot'); };
ACT['cn-toss'] = () => { if (typeof bMenuOn === 'function') bMenuOn('sales'); save(); go('sales'); setTimeout(() => { if (ACT['sl2-pginfo']) ACT['sl2-pginfo'](); }, 220); };
ACT['cn-mcp'] = () => { UI.settings = 'integr'; go('settings'); setTimeout(() => { const n = $('#mcpCard'); n && n.scrollIntoView({ block: 'center' }); }, 160); };
ACT['cn-tpl'] = el => { const T = cnTpl(el.dataset.v); if (!T) return; const have = S.autos.some(a => a.key === 'cn-' + T.k); const r = cnMake(T.k, { dup: have }); if (!r) return;
  save(); render(); if (typeof renderThreads === 'function') renderThreads(); const miss = cnNeeds(T.acts);
  if (miss.length) { const svc = cnNeedSvc(T.acts)[0]; modal('Process를 꺼진 상태로 만들었습니다', `<p>「${esc(T.n)}」을 업무 자동화에 추가했습니다. 아래 연결이 끝나면 켜서 쓰세요.</p><div class="cn-need">${tag('연결 필요', 'y')} <span>${esc(miss.join(' · '))}</span></div>`, [{ id: 'c', label: '나중에' }, { id: 'ok', label: `${CN[svc].name} 연결 안내 열기`, kind: 'pri', run: () => { setTimeout(() => cnFocus(svc), 0); } }]); }
  else toast(`「${T.n}」을 만들어 켰습니다. 업무 자동화에서 [지금 실행]으로 확인하세요.`, 'ok'); };
ACT['cn-build'] = () => cnBuilder();
ACT['cn-gal'] = el => { setTimeout(() => { UI.cnGal = !!el.closest('details')?.open; }, 0); };
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.org && typeof navAdd === 'function') navAdd('conn', true); cnEnsure(); } catch (e) { console.error(e); } return r; }; }
{ const base = postSeed; postSeed = (...a) => { const r = base(...a); try { if (S && S.nav && typeof navAdd === 'function') navAdd('conn', true); } catch (e) { } return r; }; }

/* ═════════ 시작 가이드: '외부 연결' 단계 · 자동화 단계에 템플릿 안내 ═════════ */
if (!BLD_STEPS.some(s => s.id === 'conn')) { const i = BLD_STEPS.findIndex(s => s.id === 'auto'); BLD_STEPS.splice(i < 0 ? BLD_STEPS.length : i, 0, { id: 'conn', n: '외부 연결', d: 'Claude 키 · Slack · Google · 결제', view: 'conn', def: () => true }); }
{ const base = bQ; bQ = id => id === 'conn' ? ['Slack 연결 도와줘', 'Google 연결 도와줘', 'Claude API 키 연결 방법 알려줘'] : id === 'auto' ? ['Slack · Google 자동화 템플릿 보여줘', ...base(id)] : base(id); }
{ const base = bGuideText; bGuideText = id => id === 'conn' ? 'Claude 키 · Slack · Google · 결제(토스페이먼츠) · 채널톡을 연결합니다. 카드마다 어디서 무엇을 복사하는지 단계별로 안내합니다.\n키 · 토큰은 대화창에 붙여 넣지 말고 카드의 입력 칸에 넣으세요. "Slack 연결 도와줘"라고 말씀하시면 AI SAM이 단계를 하나씩 안내합니다.' : id === 'auto' ? base(id) + '\nSlack · Google을 연결했다면 「신규 가입 → Slack 알림 + Sheets 기록」 같은 Process 템플릿을 원클릭으로 만들 수 있습니다.' : base(id); }
AFTER.unshift(() => { if (!S || !S.org || !S.bld || !S.bld.steps) return; let ch = 0; const st = S.bld.steps.conn;
  if (!st) { S.bld.steps.conn = { on: true, done: false }; ch = 1; } else if (st.on && !st.done) { try { if (cnMade() >= 1) { st.done = true; ch = 1; } } catch (e) { } }
  if (S.nav && S.nav.tabs && typeof navAdd === 'function' && !Object.values(S.nav.tabs).some(L => L.some(x => x.id === 'conn'))) { navAdd('conn', true); ch = 1; }
  if (ch) save(); });

/* ═════════ 가이드 센터: 따라하기 3종 ═════════ */
if (typeof GUIDES !== 'undefined' && !GUIDES.some(g => g.id === 'cn-slack')) GUIDES.push(
  { id: 'cn-slack', cat: '외부 연결', role: 'admin', title: 'Slack 알림 연결', mins: 5, desc: '웹훅 하나로 가입 · 결제 · 상담 알림을 운영 채널에', steps: [
    { t: '외부 연결 화면 열기', d: '운영 › 외부 연결의 Slack 카드입니다. 정운영자만 연결할 수 있습니다.', go: 'conn', sel: '#cnCard-slack', done: { visit: 'conn' } },
    { t: 'Slack 앱 만들기', d: CN.slack.steps[0] + ' ' + CN.slack.steps[1], done: { manual: 1 } },
    { t: '채널 고르고 Webhook URL 복사', d: CN.slack.steps[2] + ' ' + CN.slack.steps[3], go: 'conn', sel: '#cnSlUrl', done: { manual: 1 } },
    { t: '연결 테스트', d: '카드의 [연결 테스트]를 누르면 채널로 테스트 메시지를 보냅니다. 연습만 하려면 [데모로 연결]을 누릅니다.', go: 'conn', sel: '#cnCard-slack [data-act="cn-test"]', done: { inc: 'cn_slack' } },
    { t: 'Process 템플릿 만들기', d: '「신규 가입 → Slack 알림 + Sheets 기록」 같은 템플릿을 원클릭으로 업무 자동화에 추가합니다.', go: 'auto', done: { inc: 'autos' } }] },
  { id: 'cn-google', cat: '외부 연결', role: 'admin', title: 'Google Workspace 연결', mins: 6, desc: 'Calendar · Sheets · Drive · Gmail 권한을 필요한 만큼만', steps: [
    { t: '쓸 서비스 고르기', d: CN.google.steps[0], go: 'conn', sel: '#cnCard-google .cn-svcs', done: { visit: 'conn' } },
    { t: 'Google 계정으로 연결', d: CN.google.steps[1] + ' ' + CN.google.steps[2], go: 'conn', sel: '#cnCard-google [data-act="cn-gconnect"]', done: { inc: 'cn_google' } },
    { t: '스프레드시트 지정 · 테스트', d: CN.google.steps[3] + ' ' + CN.google.steps[4], go: 'conn', sel: '#cnGSheet', done: { manual: 1 } },
    { t: 'Process 템플릿 만들기', d: '「상담 접수 → Calendar 일정 + Slack」 · 「수료 → Gmail 축하 + Sheets 수료 대장」을 만들어 봅니다.', go: 'auto', done: { inc: 'autos' } }] },
  { id: 'cn-claude', cat: '외부 연결', role: 'admin', title: 'Claude API 키 연결', mins: 4, desc: 'AI SAM 답변 품질을 높이는 Claude 연결', steps: [
    { t: 'API 키 발급', d: CN.claude.steps[0] + ' ' + CN.claude.steps[1], done: { manual: 1 } },
    { t: '입력 칸에 붙여 넣기 · 테스트', d: CN.claude.steps[2], go: 'conn', sel: '#cnClKey', done: { inc: 'cn_claude' } },
    { t: '사용 한도 정하기', d: CN.claude.steps[3], done: { manual: 1 } }] });

/* ═════════ AI SAM: 연결 가이드 · Process 만들기 도구 ═════════ */
function cnGuideMsg(id) { const d = CN[id]; const s = cnStatus(id);
  return { title: `${d.name} 연결 가이드`, text: `${d.name} 연결을 단계별로 안내합니다. 지금 상태: ${s.st}${s.note ? ` (${s.note})` : ''}.\n키 · 토큰 · 웹훅 주소는 대화창에 붙여 넣지 마시고, 아래 [연결 카드 열기]를 눌러 카드의 입력 칸에 넣어 주세요. 이 브라우저에만 가려서 저장됩니다.`,
    html: `<ol class="cn-mlist">${d.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>${d.alt ? `<p class="mini">${esc(d.alt)}</p>` : ''}<div class="bqs"><button type="button" class="chip done" data-act="cn-open" data-v="${id}">${esc(d.name)} 연결 카드 열기</button>${d.guide ? `<button type="button" class="chip" data-act="gd-start" data-v="${d.guide}">따라하기 시작</button>` : ''}</div>` }; }
function cnAutoPlan(x, push) {
  const tk = String(x.template || '').trim(); const T = cnTpl(tk) || CN_TPL.find(t => tk && (t.n.includes(tk) || tk.includes(t.k)));
  let acts, tr, nm;
  if (T) { acts = T.acts; tr = T.tr; nm = String(x.name || T.n).slice(0, 40); }
  else { acts = (Array.isArray(x.steps) ? x.steps : []).map(String).filter(k => ACTION[k]).slice(0, 5); tr = TRIG[x.trigger] ? x.trigger : 'sc:mon'; nm = String(x.name || '새 Process').slice(0, 40); if (!acts.length) return { ok: false, 이유: `template은 ${CN_TPL.map(t => t.k).join(' · ')} 중 하나이거나, steps에 ${Object.keys(ACTION).join(' · ')} 중 1개 이상이 필요합니다` }; }
  const ch = x.slack_channel && CN_RE.ch.test(String(x.slack_channel)) ? String(x.slack_channel) : '';
  const miss = cnNeeds(acts); const svc = cnNeedSvc(acts);
  const card = { title: `Process — ${nm}`, text: `트리거 「${trigLabel(tr)}」에서 아래 단계를 순서대로 실행하는 Process를 만듭니다.${miss.length ? `\n연결 필요: ${miss.join(', ')} — 승인하면 꺼진 상태로 만들고, 연결을 마치면 켤 수 있습니다.` : '\n승인하시면 켜진 상태로 업무 자동화에 추가됩니다.'}`,
    steps: [`트리거: ${trigLabel(tr)}`, ...acts.map((a, i) => `${i + 1}단계: ${ACTION[a]}${cnNeed(a) ? ' — 연결 필요' : ''}`)],
    html: svc.length ? `<div class="bqs">${svc.map(s => `<button type="button" class="chip" data-act="cn-open" data-v="${s}">${esc(CN[s].name)} 연결 안내</button>`).join('')}</div>` : '', cta: miss.length ? '꺼진 상태로 만들기' : 'Process 만들기' };
  const run = () => { const a = T ? cnMake(T.k, { name: nm, ch, dup: true }).a : cnMakeCustom(nm, tr, acts, ch); return `「${a.name}」 Process를 ${a.on ? '켜진' : '꺼진'} 상태로 만들었습니다.${a.on ? ' [지금 실행]으로 동작을 확인하세요.' : ` 연결 필요: ${cnNeeds(a.actions).join(', ')}`}`; };
  push(card, run); return { ok: true, 승인필요: true, 이름: nm, 단계: acts.map(a => ACTION[a]), 연결필요: miss };
}
AG_TOOLS.push(
  { name: 'connect_guide', description: '외부 서비스 연결 절차를 단계별 안내 카드로 대화에 띄우고, 외부 연결 화면의 해당 카드 입력 칸을 엽니다. service: claude(Claude API 키) · mcp(외부 AI 연결 키) · slack · google(Calendar · Sheets · Drive · Gmail) · toss(토스페이먼츠, 읽기 전용) · channeltalk(채널톡). 토큰 · API 키 · 웹훅 주소는 절대 대화로 받지 말고 이 도구로 카드 입력 칸을 안내하세요. 결과로 현재 연결 상태와 단계가 돌아옵니다.', input_schema: { type: 'object', properties: { service: { type: 'string', enum: CN_IDS } }, required: ['service'] } },
  { name: 'create_automation', description: `Slack · Google 연결을 쓰는 업무 자동화 Process(트리거 → 여러 단계)를 계획 카드로 만듭니다(승인 후 생성). template: ${CN_TPL.map(t => `${t.k}(${t.n})`).join(' · ')} — 맞는 템플릿이 없으면 template='custom'과 trigger(${Object.keys(TRIG).join(' · ')}) · steps(순서대로: slack · gsheet · gcal · gmail · msg · manager · report · draft · task 등)를 넣습니다. 필요한 연결이 없으면 카드에 '연결 필요'와 연결 안내 버튼이 붙습니다.`, input_schema: { type: 'object', properties: { template: { type: 'string' }, name: { type: 'string' }, trigger: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } }, slack_channel: { type: 'string', description: '#채널이름(선택)' } }, required: ['template'] } });
{ const base = agRun; agRun = (name, x, ctx) => { x = x || {};
  if (name === 'connect_guide') { const id = cnAlias(x.service) || String(x.service || ''); if (!CN[id]) return { ok: false, 이유: `service는 ${CN_IDS.join(' · ')} 중 하나입니다` }; const s = cnStatus(id); ctx.cards.push(cnGuideMsg(id)); ctx.after.push(() => cnFocus(id));
    return { ok: true, 서비스: CN[id].name, 상태: s.st, 상세: s.note, 단계: CN[id].steps, 안내: '연결 카드를 대화에 띄우고 입력 칸을 열었습니다. 키는 카드 입력 칸에서만 받습니다. 사용자에게 키를 대화로 보내 달라고 하지 마세요.' }; }
  if (name === 'create_automation') return cnAutoPlan(x, (card, run) => agCard(ctx, card, run, 'auto'));
  return base(name, x, ctx); }; }
/* AI SAM 지시문에 연결 규칙을 덧붙인다(AG_SYS는 const라 요청 직전에 추가) */
const CN_RULES = () => `\n외부 연결 · 연결형 자동화:\n- Slack · Google · Claude 키 · MCP · 토스페이먼츠 · 채널톡 연결이나 토큰 · 키 · 웹훅 절차를 물으면 connect_guide로 단계 카드를 띄웁니다. 키 · 토큰 · 웹훅 주소를 대화창에 붙여 넣으라고 절대 요청하지 않습니다. 입력은 항상 연결 카드의 입력 칸에서 합니다.\n- Slack 알림 · Sheets 기록 · Calendar 일정 · Gmail 발송이 들어간 자동화 · Process는 run_studio_command 대신 create_automation을 씁니다. 필요한 연결이 없으면 함께 connect_guide를 제안합니다.\n- 현재 연결: ${CN_IDS.map(id => `${CN[id].name}=${cnStatus(id).st}`).join(', ')}.`;
{ const base = CL.call; CL.call = function (o) { try { if (o && typeof o.system === 'string' && Array.isArray(o.tools) && o.tools.some(t => t.name === 'connect_guide')) o = { ...o, system: o.system + CN_RULES() }; } catch (e) { } return base.call(CL, o); }; }

/* 대화창에 키를 붙여 넣으면: 저장 · 전송하지 않고 가린 뒤 카드 입력 칸으로 안내 */
const CN_SECRET = [[/sk-ant-[\w-]{8,}/g, 'claude'], [/xox[abposr]-[\w-]{8,}/g, 'slack'], [/https?:\/\/hooks\.slack\.com\/services\/[^\s"'<>]+/g, 'slack'], [/GOCSPX-[\w-]{6,}|ya29\.[\w.-]{10,}|AIza[\w-]{20,}/g, 'google'], [/(?:test|live)_g?sk_[\w]{6,}/g, 'toss'], [/dds_[\w-]{16,}/g, 'mcp'], [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, '']];
function cnScrub(s) { let out = String(s || ''), svc = '', hit = false; CN_SECRET.forEach(([re, id]) => { out = out.replace(re, m => { hit = true; if (!svc && id) svc = id; return cnMask(m); }); }); return { hit, out, svc }; }
{ const base = chatSend; chatSend = (q, ...r) => { const x = cnScrub(q); if (!x.hit) return base(q, ...r);
  if (CUR.ws !== 'home' && !$('#drawer') && !document.body.classList.contains('mode-bld') && !(typeof fabOn === 'function' && fabOn())) ACT['chat-open'] && ACT['chat-open']();
  const id = x.svc || ''; S.chat.push({ role: 'user', text: x.out.slice(0, 800) });
  S.chat.push({ role: 'ai', via: '보안 안내', text: `대화창에 키 · 토큰으로 보이는 값이 있어 저장하거나 AI에게 보내지 않았습니다(화면에는 가려서 표시).\n키는 ${id ? `「${CN[id].name}」 ` : ''}연결 카드의 입력 칸에만 넣어 주세요. 이 브라우저에만 가려서 저장됩니다.\n이미 다른 곳에 노출되었을 수 있다면 발급처 콘솔에서 키를 폐기하고 새로 발급하시는 것이 안전합니다.`,
    html: `<div class="bqs">${id ? `<button type="button" class="chip done" data-act="cn-open" data-v="${id}">${esc(CN[id].name)} 입력 칸 열기</button>` : `<button type="button" class="chip done" data-act="go" data-v="conn">외부 연결 열기</button>`}</div>` });
  S.chat = S.chat.slice(-60); cnLog(id || 'claude', '대화창 키 입력 차단(저장 안 함)', false); save(); renderThreads(); toast('키는 대화창이 아니라 연결 카드에 넣어 주세요. 저장하지 않았습니다.', 'warn'); }; }
/* 규칙 엔진(Claude 미연결)에서도 같은 안내 */
{ const base = answer; answer = (q, ...r) => { const s = String(q || '');
  const wantConn = /(연결|연동|토큰|웹훅|webhook|키\s*(발급|등록|입력|넣)|api\s*키|가이드|도와)/i.test(s);
  const svcHit = /(슬랙|slack|구글|google|지메일|gmail|스프레드시트|sheets?|드라이브|drive|토스|toss|채널톡|channel\s*talk|claude|클로드|anthropic)/i.test(s);
  if (/(자동화|프로세스|process|워크플로)/i.test(s) && /(슬랙|slack|시트|sheets|gmail|지메일|메일|캘린더|calendar|템플릿)/i.test(s)) {
    const tk = /가입/.test(s) ? 'join-notify' : /결제|영수/.test(s) ? 'pay-receipt' : /미접속/.test(s) ? 'inactive7' : /상담/.test(s) ? 'consult-cal' : /주간|리포트|보고/.test(s) ? 'weekly-report' : /수료/.test(s) ? 'done-cert' : /환불/.test(s) ? 'refund-alert' : /질문/.test(s) ? 'question-slack' : '';
    if (tk && /(만들|추가|생성|켜|연결해|해줘|해 줘)/.test(s) && !/템플릿/.test(s)) { let out = null; const res = cnAutoPlan({ template: tk }, (card, run) => { const pid = uid('p'); PLANS[pid] = { run, go: 'auto' }; out = { ...card, plan: pid, state: 'pending' }; }); if (out && res.ok) return out; }
    return { title: 'Process 템플릿', text: `Slack · Google을 잇는 Process 템플릿 ${CN_TPL.length}종입니다. 누르면 업무 자동화에 바로 추가되고, 연결이 없으면 꺼진 상태로 만든 뒤 연결 안내를 엽니다.\n지금 연결: Slack ${cnStatus('slack').st} · Google ${cnStatus('google').st}`,
      html: `<div class="bqs cn-mtpl">${CN_TPL.map(t => `<button type="button" class="chip ${cnNeeds(t.acts).length ? '' : 'done'}" data-act="cn-tpl" data-v="${t.k}">${esc(t.n)}${cnNeeds(t.acts).length ? ' · 연결 필요' : ''}</button>`).join('')}</div>`, go: 'auto' }; }
  if (svcHit && wantConn && !/튜터/.test(s)) { const id = cnAlias(s.match(/(슬랙|slack|구글|google|지메일|gmail|스프레드시트|sheets?|드라이브|drive|토스|toss|채널톡|channel\s*talk|claude|클로드|anthropic)/i)[0]); if (id && CN[id]) { setTimeout(() => cnFocus(id), 60); return cnGuideMsg(id); } }
  return base(q, ...r); }; }
if (typeof COVER !== 'undefined') COVER.push(['[신규] 외부 연결 허브: Claude 키 · MCP · Slack · Google · 토스페이먼츠 · 채널톡(단계별 안내 · 연결 테스트) + Slack · Google Process 템플릿', 'conn', '']);
