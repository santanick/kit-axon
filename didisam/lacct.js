/* v23 lacct — 학습자 계정: 간편가입(한 화면) · 로그인 · 계정 찾기 · 내 정보 · 가족 연결 · 알림함
   데이터 최소화(개인정보보호법 제3조 · 제16조): 가입 때는 로그인 수단(SNS 식별자 또는 이메일) + 닉네임만 받는다.
   실명 · 휴대폰 · 생년월일 · 성별은 받지 않는다. 휴대폰은 알림톡 신청 때, 이름은 수료증 · 결제/환불 때만 목적을 밝히고 받는다.
   본인인증(PASS)은 기본 흐름에서 뺐다. 법적으로 필요한 기관만 운영자가 '선택 본인확인'을 켠다(결과 여부만 저장).
   저장 분리(데모 = 이 브라우저 localStorage, 운영 = 서버 pii 스키마 · 학습 스키마):
     · didisam.room.<tid>.pii  — 신원 저장소(이메일 · 비밀번호 해시 · SNS 식별자 · 이름 · 휴대폰 · 보호자 연락처 · 동의 기록 · 열람 기록)
     · didisam.room.<tid>.acct — 계정 상태(가명 sid · 닉네임 · 등급 · 가입 수단)만. 학습 기록(.lp)도 가명 sid로만.
     · 운영자 큐(.lpx)에는 sid · 닉네임 · 가린 이메일만 보낸다(이메일 · 휴대폰 · 이름 · 비밀번호는 보내지 않음).
   운영: /api/pub/<tid>/otp · signup · login{via} · me · pii · withdraw · guardian · verify (service/server/pii.js). SNS OAuth · 이메일 발송 · 본인확인은 '운영:' 지점에서 연동. */
'use strict';
const LA_SOC = [['kakao', '카카오'], ['naver', '네이버'], ['google', '구글'], ['apple', '애플']];
const LA_SN = Object.fromEntries([['email', '이메일'], ['univ', '학번'], ['facebook', '페이스북'], ...LA_SOC]);
const LA = { j: null, f: null, dlg: null };
const laHash = s => { let a = 0x811c9dc5, b = 0x9e3779b1; for (const ch of String(s)) { const c = ch.codePointAt(0); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ (c + a), 2654435761) >>> 0; } return a.toString(36) + b.toString(36); };
const laPw = (id, pw) => 'h1:' + laHash('didisam|' + String(id).toLowerCase() + '|' + pw);
const laRand = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => (x % 36).toString(36)).join(''); };
const laNewSid = kind => (kind === 'parent' ? 'p' : 'u') + laRand(11); /* 가명 식별자: 이메일 · 전화번호에서 만들지 않는다(역추적 불가) */
const LA_PW_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[~!@#$%^&*])[A-Za-z\d~!@#$%^&*]{8,20}$/;
const LA_NICK_RE = /^[가-힣A-Za-z0-9_-]{2,20}$/;
const LA_PHONE_RE = /^01\d-?\d{3,4}-?\d{4}$/;
const LA_MAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const laPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : String(p || ''); };
const laUniv = () => ((SITE() && SITE().org) || {}).type === 'univ';
const laCanAcct = () => LR.mode === 'demo' && !!LR.tid && LR.tid !== 'sample';
let LA_RC = { at: 0, v: null };
const laRoom = () => { if (!laCanAcct()) return null; if (Date.now() - LA_RC.at < 300 && LA_RC.v) return LA_RC.v; LA_RC = { at: Date.now(), v: demoRoom() }; return LA_RC.v; };
const laFresh = () => { LA_RC.at = 0; };
/* v32.9: 승인 대기 계정 id를 기관별로 기억(새로 고침 뒤에도 '승인 대기' 표시, 개인정보 없음) */
function laPendKeep(sid) { try { localStorage.setItem('didisam.app.pend.' + (LR.tid || ''), sid); } catch (e) { } }
const laWa = w => { const c = String(w || '').slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '과' : '와'; };
function laCfg() { const r = laRoom(); const a = (r && r.settings && r.settings.acct) || (SITE() && SITE().acct) || null; const T = (r && r.settings && r.settings.terms) || (a && a.policy) || {};
  const iv = a && a.idv && a.idv.on ? { on: true, reason: a.idv.reason || 'refund', note: a.idv.note || '' } : { on: false };
  return { mode: (a && a.mode) || 'code', social: ((a && a.social) || []).filter(k => LA_SOC.some(([x]) => x === k)), approve: (a && a.approve) || 'auto', idv: iv, under14: !!(a && a.under14), parent: !!(a && a.parent) && !laUniv(), editAns: !!(a && a.editAns), extraQ: (a && a.extraQ) || [], tos: T.tos || '', privacy: T.privacy || '' }; }
const LA_IDV = { refund: '고용보험 환급 과정', adult: '성인 인증 콘텐츠', credit: '학점 인정' };

/* ── 신원 저장소(PII) — 운영: 서버 pii.identity(AES-256-GCM 암호화 · 블라인드 인덱스 · 별도 DB 역할) ── */
const laVK = () => 'didisam.room.' + LR.tid + '.pii';
function laV() { try { const v = JSON.parse(localStorage.getItem(laVK()) || 'null'); if (v && v.ids) return { idx: {}, inq: {}, log: [], ...v }; } catch (e) { } return { v: 23, ids: {}, idx: {}, inq: {}, log: [] }; }
const laVSave = v => { try { v.log = (v.log || []).slice(0, 300); localStorage.setItem(laVK(), JSON.stringify(v)); } catch (e) { } };
const laVLog = (v, action, sid, purpose, fields) => { v.log = v.log || []; v.log.unshift({ at: new Date().toISOString(), actor: 'self', action, sid, purpose, fields: fields || [] }); };
const laBidx = (kind, val) => kind + ':' + laHash('bidx|' + LR.tid + '|' + kind + '|' + String(val).trim().toLowerCase());
/* 계정 상태(학습 쪽, 가명) */
const laCK = () => 'didisam.room.' + LR.tid + '.acct';
const laCache = () => { try { return JSON.parse(localStorage.getItem(laCK()) || '{}') || {}; } catch (e) { return {}; } };
const laCacheSet = (sid, v) => { try { const c = laCache(); c[sid] = { ...(c[sid] || {}), ...v }; localStorage.setItem(laCK(), JSON.stringify(c)); } catch (e) { } };
const laMask = e => { const [a, b] = String(e || '').split('@'); if (!b) return ''; const [d, ...t] = b.split('.'); return `${a.slice(0, 2)}${'*'.repeat(Math.max(2, a.length - 2))}@${d.slice(0, 1)}${'*'.repeat(Math.max(2, d.length - 1))}${t.length ? '.' + t.join('.') : ''}`; };
const laFamCode = sid => 'F' + laHash('fam|' + sid).slice(0, 6).toUpperCase();

function laSidOf(id0) { const id = String(id0 || '').trim().toLowerCase(); if (!id) return ''; const V = laV();
  if (id.includes('@')) return V.idx[laBidx('email', id)] || '';
  if (id.startsWith('sns:')) { const [, p, ...s] = id.split(':'); return V.idx[laBidx('sub:' + p, s.join(':'))] || ''; }
  return id; }
function laFind(id0) { const id = String(id0 || '').trim().toLowerCase(); if (!id) return null; const r = laRoom() || {}; const C = laCache(); const V = laV(); let sid = laSidOf(id);
  let legacy = null; /* 운영자가 만든 계정(수동 · 일괄) 또는 v22 이전 계정: 운영자 데이터의 이메일 · 비밀번호 해시로 로그인 */
  if (!sid && id.includes('@')) { const m = (r.members || []).find(x => x.acct && (x.acct.email || '') === id); const p = !m && (r.pacct || []).find(x => x.email === id); legacy = m || p || null; if (legacy) sid = legacy.sid; }
  if (!sid) return null; const c = C[sid]; if (c && c.del) return null; const v = V.ids[sid] || null;
  const m = (r.members || []).find(x => x.acct && (x.sid === sid || (laUniv() && x.name === sid))); const p = !m && (r.pacct || []).find(x => x.sid === sid);
  if (!m && !p && !c && !v) return null;
  const base = m ? { kind: 'learner', grade: m.grade, nick: m.nick || m.name, login: m.acct.login || 'email', links: m.acct.links || [m.acct.login || 'email'], dept: (m.extra || {})['학과'] || '', reject: m.reject || '', mid: m.id, photo: m.acct.photo || '', nickLog: m.acct.nickLog || [], extra: m.extra || {}, idv: !!(m.acct.idv && m.acct.idv.ok), legacyPw: m.acct.pw || '', legacyMail: m.acct.email || '' }
    : p ? { kind: 'parent', grade: '정회원', nick: p.nick || p.name, login: p.login || 'email', links: p.links || [p.login || 'email'], pid: p.id, legacyPw: p.pw || '', legacyMail: p.email || '' } : {};
  const o = { kind: 'learner', grade: '정회원', login: 'email', links: [], nick: '', dept: '', status: 'active', ...(c || {}), ...base, id: sid, sid };
  if (c) { ['photo', 'links', 'idv'].forEach(k => { if (c[k] !== undefined) o[k] = c[k]; }); if (c.nick && c.nickAt) o.nick = c.nick; /* 이 기기에서 바꾼 닉네임이 운영자 반영보다 먼저 보이게 */ if (!m && !p) o.grade = c.grade || o.grade; if (c.status) o.status = c.status; }
  o.pw = (v && v.pw) || o.legacyPw || ''; o.emailMask = (v && v.emailMask) || laMask(o.legacyMail); o.hasEmail = !!((v && v.email) || o.legacyMail); o.pwKey = v && v.pw ? sid : (o.legacyMail || sid);
  o.named = !!(v && v.name); o.phoned = !!(v && v.phone); o.alimtalk = !!(v && v.phone);
  return o; }
const laMember = () => { const r = laRoom(); if (!r || !LR.me) return null; return (r.members || []).find(x => x.sid === LR.me.sid || (laUniv() && x.name === LR.me.sid)) || null; };
const laPacct = () => { const r = laRoom(); if (!r || !LR.me) return null; return (r.pacct || []).find(x => x.sid === LR.me.sid) || null; };
const laAcctUser = () => !!(LR.me && LR.me.acct && LR.me.acct !== 'code');
function laSetMe(acc) { LR.me = { sid: acc.sid, dept: acc.dept || '', acct: acc.login || 'email', id: acc.sid, nick: acc.nick || '', kind: acc.kind || 'learner', grade: acc.grade || '' };
  try { sessionStorage.setItem(SESS + LR.tid, JSON.stringify(LR.me)); sessionStorage.setItem('didisam.lg.' + (LR.tid || 'x'), '0'); } catch (e) { }
  try { LR.lp = { tut: {}, cls: {}, diag: {}, ...((JSON.parse(localStorage.getItem(demoLPKey()) || '{}'))[acc.sid] || {}) }; } catch (e) { }
  if (LR.mode === 'demo') LR.mine = demoMine(demoRoom()); }
function laRefreshMe() { if (!laAcctUser() || !laCanAcct()) return; const acc = laFind(LR.me.sid || LR.me.id);
  if (!acc || ['승인 대기', '거절'].includes(acc.grade) || acc.status === 'guardian_pending') { LR.me = null; try { sessionStorage.removeItem(SESS + LR.tid); } catch (e) { } return; }
  if (acc.grade !== LR.me.grade || acc.nick !== LR.me.nick) { LR.me.grade = acc.grade; LR.me.nick = acc.nick; try { sessionStorage.setItem(SESS + LR.tid, JSON.stringify(LR.me)); } catch (e) { } } }
const laGrade = (cfg, inv) => inv ? '정회원' : (cfg.mode === 'invite' || cfg.approve === 'manual') ? '승인 대기' : '정회원';
const laInv = tok => { const r = laRoom(); const iv = r && (r.invites || []).find(i => i.token === tok); return iv && iv.active ? iv : null; };
const laCode = () => String(Math.floor(100000 + Math.random() * 900000));
const laSec = (title, body, lead = '') => `<section class="sec la"><div class="in narrow"><h1>${esc(title)}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${body}</div></section>`;
const laGate = (title, body) => `<section class="sec la"><div class="in narrow"><div class="gate">${ico('lock', 28)}<h2>${esc(title)}</h2><p class="lead">${body}</p><div class="cta">${btn('로그인', '#login', 'pri')}${btn('홈으로', '#home', 'ghost')}</div></div></div></section>`;
const laSoc = (cfg, act, verb) => cfg.social.length ? `<div class="la-soc">${LA_SOC.filter(([k]) => cfg.social.includes(k)).map(([k, l]) => `<button type="button" class="la-sb ${k}" data-ac="${act}" data-v="${k}">${esc(l)}${verb || '로 계속하기'}</button>`).join('')}</div>` : '';
const laOtpBox = (pre, label) => { const s = LA[pre] || {}; return `<div class="la-vbox"><div class="la-row"><button type="button" class="lbtn sm" data-ac="otp" data-v="${pre}">${s.code ? '인증번호 다시 받기' : '인증번호 받기'}</button>${s.code ? `<span class="la-demo-code" title="데모 전용 — 운영에서는 이메일로 발송">데모 인증번호 <b>${esc(s.code)}</b></span>` : ''}</div>${s.code ? `<label class="fl">${esc(label || '이메일로 받은 인증번호 6자리')}<input name="vcode" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>` : ''}</div>`; };
/* 운영: POST /api/pub/<tid>/otp { email, purpose } — 서버가 이메일 발송(10분 유효 · 5회 제한). 데모는 화면에 인증번호 표시 */

/* ═════════ 개인정보 처리방침 요약 ═════════ */
function laPolicyRows(U) { return U ? [['필수', '학번 · 학과 · 닉네임 · 비밀번호(암호화)', '회원 식별 · 로그인 · 학습 서비스 제공', '탈퇴 시 즉시 파기'], ['자동 생성', '학습 기록(진도 · 제출물 · 출결)', '학습 관리 · 수료 판정', '탈퇴 후에는 개인을 알아볼 수 없는 가명 기록으로만 보관']]
  : [['필수', '로그인 수단 1개 — 이메일 주소 또는 SNS 회원 식별자(복원할 수 없는 값으로 변환) · 닉네임', '회원 식별 · 로그인 · 학습 서비스 제공', '탈퇴 시 즉시 파기'], ['선택', '비밀번호(암호화 · 이메일 가입자가 직접 설정할 때만)', '비밀번호 로그인', '탈퇴 · 삭제 시 즉시 파기'], ['만 14세 미만', '보호자 이메일 또는 휴대폰 번호', '법정대리인 동의 확인', '탈퇴 시 파기 · 7일 안에 동의가 없으면 가입 정보와 함께 자동 파기'], ['필요할 때만', '휴대폰 번호(알림톡 신청 시) · 이름(수료증 발급 · 결제/환불 시)', '알림톡 발송 · 수료증 표기 · 결제/환불 처리', '수신 해제 · 삭제 · 탈퇴 시 파기(결제 기록은 전자상거래법에 따라 5년)'], ['자동 생성', '학습 기록(진도 · 제출물 · 출결) · 동의 기록', '학습 관리 · 수료 판정 · 동의 증빙', '탈퇴 후에는 개인을 알아볼 수 없는 가명 기록으로만 보관']]; }
function laPolicyHTML(U, short) { const cfg = laCfg(); const rows = laPolicyRows(U);
  return `<table class="la-pol"><thead><tr><th>구분</th><th>수집 항목</th><th>목적</th><th>보유 기간</th></tr></thead><tbody>${rows.map(r => `<tr>${r.map((x, i) => `<td${i === 0 ? ' class="k"' : ''}>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <p class="mini">${U ? '이름 · 연락처 · 이메일 · 생년월일은 받지 않습니다. 필요하면 학교 SSO로 연동합니다.' : '가입할 때 실명 · 휴대폰 번호 · 생년월일 · 성별 · 주소는 받지 않습니다.'} 개인정보는 학습 데이터와 분리된 저장소에 암호화해 보관하고, 운영자 화면에는 닉네임과 일부를 가린 이메일만 표시합니다. 운영자가 목적(수료증 · 환불 등)을 밝혀 열람하면 그 기록이 남습니다.</p>
  ${!short && cfg.privacy ? `<details class="la-help"><summary>${esc(SITE().org.name)} 개인정보 처리방침 전문</summary><pre class="la-pre">${esc(cfg.privacy)}</pre></details>` : ''}`; }
const laPrivV = () => laSec('개인정보 처리방침 요약', laPolicyHTML(laUniv()) + `<p class="la-links"><a href="#acct">내 개인정보 확인 · 삭제</a> · <a href="#find/inq">문의</a></p>`, `${esc(SITE().org.name)} 학습 사이트가 받는 정보와 목적 · 보유 기간입니다.`);

/* ═════════ 로그인 화면 ═════════ */
{ const base = viewLogin; viewLogin = back => { const h = base(back); const cfg = laCfg(); const U = laUniv();
  const sso = U ? `<button type="button" class="lbtn ghost blk la-sso" data-ac="sso">${ico('home', 16)} 학교 SSO로 로그인 <small class="la-tag">준비 중</small></button>` : '';
  if (!laCanAcct() || cfg.mode === 'code') return h.replace(/(<p class="mini">접근코드를 모르면[^<]*<\/p>)/, `$1${sso}<p class="mini la-links"><a href="#find/code">접근코드 재발급 요청</a></p>`);
  const form = (h.match(/<form id="li"[\s\S]*?<\/form>/) || [''])[0]; const pwMode = U || LA.lmode === 'pw';
  const lgr = `<div class="lgr"><h2>로그인</h2>
    ${U ? `<p class="mini">학번과 비밀번호로 로그인하세요.</p>` : `${laSoc(cfg, 'soclogin')}${cfg.social.length ? '<p class="la-or"><span>또는 이메일로</span></p>' : ''}`}
    <form id="laLogin" data-back="${esc(back || 'my')}"><label class="fl">${U ? '학번' : '이메일'}<input name="lid" ${U ? 'inputmode="numeric"' : 'type="email"'} autocomplete="username" required maxlength="80" value="${esc((LA.lv && LA.lv.email) || '')}"></label>
      ${U ? '' : `<div class="la-seg sm">${[['otp', '인증번호로 로그인'], ['pw', '비밀번호로 로그인']].map(([k, l]) => `<button type="button" class="${(pwMode ? 'pw' : 'otp') === k ? 'on' : ''}" data-ac="lmode" data-v="${k}">${l}</button>`).join('')}</div>`}
      ${pwMode ? '<label class="fl">비밀번호<input name="pw" type="password" autocomplete="current-password" maxlength="20"></label>' : laOtpBox('lv')}
      <p class="err" id="laErr" role="alert"></p><button class="lbtn pri blk" type="submit">로그인 ${ico('arrow', 16)}</button></form>
    ${sso}<p class="la-links">${cfg.mode === 'open' ? '<a href="#join">회원가입</a> · ' : ''}<a href="#find/id">로그인 도움</a> · <a href="#find/inq">문의</a> · <a href="#privacy">개인정보 처리방침</a></p>${cfg.mode === 'invite' ? '<p class="mini">이 기관은 초대받은 회원만 가입할 수 있습니다. 받은 초대 링크로 접속해 가입하세요.</p>' : ''}
    ${form ? `<details class="la-code" ${(LR._codes || []).length ? 'open' : ''}><summary>${esc(lIdLabel())} · 접근코드로 로그인</summary>${form}<p class="mini"><a href="#find/code">접근코드 재발급 요청</a></p></details>` : ''}</div>`;
  let out = h.replace(/<div class="lgr">[\s\S]*<\/div><\/div><\/div><\/section>\s*$/, lgr + '</div></div></section>');
  out = out.replace(/<small>[^<]*이름 · 연락처 · 이메일은 받지 않습니다\.<\/small>/, `<small>${U ? '학번 · 학과 · 닉네임만 저장합니다. 이름 · 연락처 · 이메일은 받지 않습니다.' : '가입 때는 로그인 수단과 닉네임만 받습니다. 실명 · 휴대폰 번호는 받지 않습니다.'}</small>`);
  return out; }; }
async function laLogin(f) { laFresh(); const U = laUniv(); const id = String(f.elements.lid.value || '').trim().toLowerCase(); const back = decodeURIComponent(f.dataset.back || '');
  if (LR.mode === 'live') { /* 운영: await api('POST', `/api/pub/${LR.tid}/login`, U ? { via: 'univ', student_no, pw } : { via: 'email', email, code } | { via: 'email', email, pw }) */ throw new Error('운영 서버 로그인 연동 지점입니다.'); }
  const bad = U ? '학번 또는 비밀번호가 올바르지 않습니다.' : '이메일 또는 비밀번호가 올바르지 않습니다.';
  const pwEl = f.elements.pw; const acc = laFind(id);
  if (pwEl) { if (!acc || !acc.pw) throw new Error(acc && !acc.pw ? '비밀번호를 설정하지 않은 계정입니다. 이메일 인증번호로 로그인하세요.' : bad); if (acc.pw !== laPw(acc.pwKey, pwEl.value)) throw new Error(bad); return laAfterAuth(acc, back); }
  const s = LA.lv || {}; if (!s.code) throw new Error('먼저 인증번호를 받으세요.'); if (s.email !== id) throw new Error('인증번호를 받은 이메일과 다릅니다.'); if (String(f.elements.vcode && f.elements.vcode.value || '').trim() !== s.code) throw new Error('인증번호가 올바르지 않습니다.');
  if (!acc) throw new Error('이 이메일로 가입한 계정이 없습니다. 위의 [30초 간편가입]으로 바로 가입할 수 있어요.'); LA.lv = null; return laAfterAuth(acc, back); }
function laAfterAuth(acc, back) {
  if (acc.status === 'guardian_pending') throw new Error('보호자 동의를 기다리고 있습니다. 보호자에게 보낸 동의 링크를 확인해 주세요.');
  if (acc.grade === '승인 대기') { LA.pend = acc.sid; laPendKeep(acc.sid); location.hash = '#pending'; return; }
  if (acc.grade === '거절') throw new Error('가입이 승인되지 않았습니다.' + (acc.reject ? ' 사유: ' + acc.reject : '') + ' 운영자에게 문의하세요.');
  laSetMe(acc); toast(`${acc.nick || '회원'}님, 반갑습니다.`, 'ok'); location.hash = '#' + (acc.kind === 'parent' ? 'family' : (back || 'my')); lrender(); }
/* SNS 간편가입 · 로그인(데모 동의 화면). 운영: 공급자 OAuth 창 → 서버가 토큰 검증 → 회원 식별자(sub)만 받음(이메일 · 이름 · 전화 · 생일 미요청) */
function laSocDlg(prov, mode) { const n = LA_SN[prov] || prov; const J = LA.j || {};
  laDlg(`<h3>${esc(n)}로 ${mode === 'join' ? '간편가입' : '로그인'} <small class="la-tag">데모</small></h3>
    <p class="mini">운영에서는 ${esc(n)} 로그인 · 동의 창으로 이동합니다. 이 기관이 ${esc(n)}에서 받는 정보는 <b>회원 식별자(필수)</b>와 <b>닉네임(선택)</b>뿐입니다. 이메일 · 이름 · 전화번호 · 생일 · 성별은 요청하지 않습니다.</p>
    <form id="laSoc" data-v="${esc(prov)}" data-mode="${mode}"><label class="fl">데모 ${esc(n)} 계정 ID <small>(운영: ${esc(n)}가 전달하는 회원 번호)</small><input name="sub" required maxlength="60" value="${esc(`${prov}-demo-${laRand(5)}`)}"></label>
    ${mode === 'join' ? `<label class="fl">닉네임 <small>(${esc(n)} 프로필에서 가져옴 · 바꿀 수 있음)</small><input name="nick" required maxlength="20" value="${esc(J.nick || `${n}회원${laRand(3)}`)}"></label>` : ''}
    <p class="err" id="laSocErr"></p><button class="lbtn pri blk" type="submit">${mode === 'join' ? '동의하고 가입하기' : `${esc(n)}로 계속하기`}</button></form>`); }
function laDlg(html) { laDlgX(); const d = document.createElement('div'); d.className = 'la-ov'; d.id = 'laDlg'; d.innerHTML = `<div class="la-dlg" role="dialog" aria-modal="true"><button type="button" class="la-x" data-ac="dlgx" aria-label="닫기">${ico('x', 18)}</button>${html}</div>`; document.body.appendChild(d); const f = d.querySelector('input,button'); f && f.focus(); }
const laDlgX = () => { const d = $('#laDlg'); d && d.remove(); };

/* ═════════ 간편가입(#join · #join/<초대 토큰>) — 한 화면 ═════════ */
function laJoinState(tok, inv) { if (!LA.j || LA.j.tok !== tok) LA.j = { tok, inv: inv ? { target: inv.target, cls: inv.cls || '' } : null, kind: inv && inv.target === 'parent' ? 'parent' : 'learner', sns: null, done: null, keep: {} }; return LA.j; }
function laConsentHTML(J, U) { const k = J.keep || {}; const ck = n => k[n] ? 'checked' : '';
  return `<fieldset class="la-terms"><legend class="sr">약관 동의</legend><label class="ckl all"><input type="checkbox" data-ac="jall" ${k.tos && k.privacy && (U || k.mkt) ? 'checked' : ''}> <b>전체 동의</b> <small>(선택 항목 포함)</small></label>
    <label class="ckl"><input type="checkbox" name="tos" ${ck('tos')}> [필수] 이용약관 동의</label><details><summary>전문 보기</summary><pre>${esc(laCfg().tos || '이용약관은 기관 홈페이지 하단에서 확인할 수 있습니다.')}</pre></details>
    ${(() => { const P = (SITE().cpl || {}); return P.on && /^moel-/.test(String(P.profile || '')) ? `<label class="ckl"><input type="checkbox" name="third" ${ck('third')}> [필수] 개인정보 제3자 제공 동의</label><details open><summary>제공 대상: 고용노동부, 한국산업인력공단</summary><p class="mini">목적: 훈련 지원 · 모니터링 / 항목: 이름, 연락처, 학습 이력, 평가 결과 / 수강 확인 문자(ACS)가 발송될 수 있습니다.</p></details>` : ''; })()}
    <label class="ckl"><input type="checkbox" name="privacy" ${ck('privacy')}> [필수] 개인정보 수집 · 이용 동의</label><details><summary>받는 항목: 로그인 수단(이메일 또는 SNS 식별값) · 닉네임 / 목적: 회원 식별 · 학습 서비스 / 보유: 탈퇴 시 파기 <u>자세히</u></summary>${laPolicyHTML(U, true)}</details>
    ${U ? '' : `<label class="ckl"><input type="checkbox" name="mkt" ${ck('mkt')}> [선택] 마케팅 정보 수신 동의 <small>— 동의하지 않아도 가입할 수 있습니다</small></label>`}</fieldset>`; }
function laJoin(r) { const cfg = laCfg(); const tok = (r.b || '').replace(/[^\w-]/g, ''); const U = laUniv();
  if (LR.me && !(LA.j && LA.j.done)) return laSec('이미 로그인했습니다', `<div class="cta">${btn('마이페이지', '#my', 'pri')}</div>`);
  if (!laCanAcct()) return laGate('회원가입', LR.mode === 'preview' ? '미리보기에서는 가입할 수 없습니다. 게시한 학습자 사이트에서 가입해 보세요.' : '게시된 학습자 사이트에서 가입할 수 있습니다.');
  const inv = tok ? laInv(tok) : null;
  if (tok && !inv) return laGate('사용할 수 없는 초대 링크입니다', '링크가 재생성되었거나 만료되었습니다. 운영자에게 새 초대 링크를 요청하세요.');
  if (!inv && cfg.mode === 'code') return laGate('접근코드로 로그인하는 기관입니다', `이 기관은 회원가입 없이 기관에서 받은 ${esc(lIdLabel())}${laWa(lIdLabel())} 접근코드로 로그인합니다.${U ? ' 학교 SSO 연동은 준비 중입니다.' : ''}`);
  if (!inv && cfg.mode === 'invite') return laGate('초대받은 회원만 가입할 수 있습니다', '운영자에게 받은 초대 링크(알림톡 · 이메일 · 메신저)로 접속해 가입하세요.');
  const J = laJoinState(tok, inv);
  if (J.done) return laSec(J.kind === 'parent' ? '보호자 회원가입' : '회원가입', laJoinDone(J));
  const head = `${inv ? `<p class="la-inv">${ico('link', 15)} 초대 링크로 가입합니다 — 승인 없이 바로 가입됩니다${inv.target === 'parent' ? ' · 보호자 계정' : inv.target === 'admin' ? ' · 운영자 초대' : ''}.</p>` : cfg.approve === 'manual' ? '<p class="la-inv y">이 기관은 운영자 승인 후 이용할 수 있습니다.</p>' : ''}`;
  const kindSeg = cfg.parent && !inv ? `<div class="fl"><span>회원 유형</span><div class="la-seg">${[['learner', esc(lTerm('learner'))], ['parent', '보호자(가족 연결)']].map(([k, l]) => `<button type="button" class="${J.kind === k ? 'on' : ''}" data-ac="jkind" data-v="${k}">${l}</button>`).join('')}</div></div>` : '';
  const Q = J.kind === 'parent' ? [] : cfg.extraQ.filter(q => !(U && ['학번', '학과'].includes(q.q)));
  const xq = Q.length ? `<details class="la-q" ${Q.some(q => q.req) ? 'open' : ''}><summary>${esc(SITE().org.name)} 추가 질문 ${Q.some(q => q.req) ? '<b class="req">*</b>' : '<small>(선택)</small>'}</summary>${Q.map((q, i) => `<label class="fl">${esc(q.q)}${q.req ? ' <b class="req">*</b>' : ' <small>(선택)</small>'}${q.type === 'file' ? `<input type="file" name="xq${i}" accept=".pdf,.jpg,.jpeg,.png,.hwp,.hwpx,.doc,.docx,.zip">` : q.type === 'choice' ? `<select name="xq${i}"><option value="">선택하세요</option>${(q.opts || []).map(o => `<option>${esc(o)}</option>`).join('')}</select>` : `<input name="xq${i}" maxlength="100">`}</label>`).join('')}${Q.some(q => q.type === 'file') ? '<small class="mini">첨부 파일: PDF · 이미지 · 한글 · 워드 · ZIP, 10MB 이하</small>' : ''}<small class="mini">기관이 정한 질문입니다. 꼭 필요한 내용만 적어 주세요.</small></details>` : '';
  const k = J.keep || {};
  if (U) return laSec('회원가입', head + `<form id="laJoin" class="la-one">${laConsentHTML(J, true)}
    <div class="form2"><label class="fl">학번<input name="sid" inputmode="numeric" maxlength="10" required placeholder="예: 20260001" value="${esc(k.sid || '')}"></label><label class="fl">학과<input name="dept" maxlength="30" required value="${esc(k.dept || '')}"></label>
    <label class="fl">닉네임 <small>(선택)</small><input name="nick" maxlength="20" placeholder="비워 두면 학번 뒤 4자리" value="${esc(k.nick || '')}"></label><span></span>
    <label class="fl">비밀번호<input name="pw" type="password" maxlength="20" required autocomplete="new-password"></label><label class="fl">비밀번호 확인<input name="pw2" type="password" maxlength="20" required autocomplete="new-password"></label></div><small class="mini">영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자</small>
    ${xq}<p class="err" id="laJErr" role="alert"></p><button class="lbtn pri blk" type="submit">학번으로 가입하기 ${ico('arrow', 16)}</button></form>
    <button type="button" class="lbtn ghost blk la-sso" data-ac="sso">${ico('home', 16)} 학교 SSO로 로그인 <small class="la-tag">준비 중</small></button>
    <p class="mini">학번 · 학과 · 닉네임만 받습니다. 이름 · 연락처 · 이메일은 받지 않습니다.</p><p class="la-links">이미 계정이 있나요? <a href="#login">로그인</a></p>`);
  const age = `<div class="la-age"><label class="ckl"><input type="checkbox" name="age14" ${k.age14 !== false ? 'checked' : ''} data-ac="jage"> <b>만 14세 이상입니다</b></label>
    <div class="la-guard" ${k.age14 !== false ? 'hidden' : ''}>${cfg.under14 && J.kind !== 'parent' ? `<p class="mini">만 14세 미만은 <b>보호자(법정대리인) 동의</b>가 필요합니다. 보호자 이메일 또는 휴대폰 번호를 적으면 동의 링크를 보내 드립니다. 보호자가 동의하면 바로 이용할 수 있습니다.</p><label class="fl">보호자 이메일 또는 휴대폰 번호<input name="gcontact" maxlength="80" placeholder="parent@example.com 또는 010-0000-0000" value="${esc(k.gcontact || '')}"></label>` : '<p class="mini warn">이 기관은 만 14세 이상만 가입할 수 있습니다.</p>'}</div></div>`;
  const snsB = J.sns ? `<p class="la-inv">${ico('check', 15)} ${esc(LA_SN[J.sns.prov])} 계정을 확인했습니다. 아래 동의 후 가입을 마칩니다.</p>` : '';
  const emailBlk = J.sns ? `<input type="hidden" name="via" value="sns"><label class="fl">닉네임<input name="nick" maxlength="20" required value="${esc(k.nick || J.sns.nick || '')}"></label>`
    : `<input type="hidden" name="via" value="email"><label class="fl">이메일<input name="email" type="email" maxlength="80" value="${esc(k.email || (LA.jv && LA.jv.email) || '')}" autocomplete="email"></label>${laOtpBox('jv')}
      <label class="fl">닉네임<input name="nick" maxlength="20" placeholder="2~20자 한글 · 영문 · 숫자 · - _" value="${esc(k.nick || '')}"></label>
      <details class="la-pwopt"><summary>비밀번호도 만들기 <small>(선택 — 없어도 이메일 인증번호로 로그인)</small></summary><div class="form2"><label class="fl">비밀번호<input name="pw" type="password" maxlength="20" autocomplete="new-password"></label><label class="fl">비밀번호 확인<input name="pw2" type="password" maxlength="20" autocomplete="new-password"></label></div><small class="mini">영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자</small></details>`;
  return laSec(J.kind === 'parent' ? '보호자 간편가입' : '간편가입', head + kindSeg + snsB + `<form id="laJoin" class="la-one">${laConsentHTML(J, false)}${J.kind === 'parent' ? '<input type="hidden" name="age14" value="1">' : age}
    ${J.sns ? '' : `${laSoc(cfg, 'jsns', '로 간편가입')}${cfg.social.length ? '<p class="la-or"><span>또는 이메일로 가입</span></p>' : ''}`}${emailBlk}${xq}
    <p class="err" id="laJErr" role="alert"></p><button class="lbtn pri blk" type="submit">${J.sns ? `동의하고 ${esc(LA_SN[J.sns.prov])}로 가입` : '이메일로 가입하기'} ${ico('arrow', 16)}</button>${J.sns ? '<button type="button" class="lbtn ghost blk" data-ac="jsnsx">다른 방법으로 가입</button>' : ''}</form>
    <p class="mini">가입할 때 실명 · 휴대폰 번호 · 생년월일은 받지 않습니다. 수료증 · 환불 · 알림톡이 필요할 때만 목적을 밝히고 따로 요청합니다. <a href="#privacy">처리방침 요약</a></p><p class="la-links">이미 계정이 있나요? <a href="#login">로그인</a></p>`, J.kind === 'parent' ? '보호자 계정은 자녀의 출결 · 수업 알림을 받고 가족 연결에 씁니다.' : ''); }
function laJoinDone(J) { const d = J.done;
  if (d.status === 'guardian_pending') return `<div class="gate">${ico('clock', 28)}<h2>보호자 동의를 기다리고 있습니다</h2><p class="lead">보호자(${esc(d.gmask)})에게 동의 링크를 보냈습니다. 보호자가 동의하면 바로 로그인할 수 있습니다. 7일 안에 동의가 없으면 가입 정보는 자동으로 삭제됩니다.</p><div class="cta"><a class="lbtn ghost" href="#guardian/${esc(d.gtok)}" data-demo="1">보호자 동의 화면 열기(데모)</a>${btn('홈으로', '#home', 'ghost')}</div><p class="mini">운영: 보호자에게 이메일 또는 알림톡으로 learner.html?t=…#guardian/… 링크를 발송합니다.</p></div>`;
  if (d.grade === '승인 대기') return `<div class="gate">${ico('clock', 28)}<h2>가입 신청이 접수되었습니다</h2><p class="lead">운영자 승인 후 이용할 수 있습니다. 승인되면 알림으로 안내합니다.</p><div class="cta"><a class="lbtn pri" href="#pending">승인 상태 확인</a>${btn('홈으로', '#home', 'ghost')}</div></div>`;
  return `<div class="gate">${ico('check', 28)}<h2>가입이 완료되었습니다</h2><p class="lead">${esc(SITE().org.name)}에 오신 것을 환영합니다, <b>${esc(d.nick)}</b>님.</p><div class="cta">${btn(J.kind === 'parent' ? '가족 연결하기' : '학습 시작', J.kind === 'parent' ? '#family' : '#my', 'pri')}</div></div>`; }
function laJoinKeep(f) { const J = LA.j; if (!J || !f) return; const g = n => f.elements[n]; J.keep = { ...(J.keep || {}), ...Object.fromEntries(['tos', 'privacy', 'third', 'mkt'].filter(n => g(n)).map(n => [n, g(n).checked])), ...Object.fromEntries(['email', 'nick', 'gcontact', 'sid', 'dept'].filter(n => g(n)).map(n => [n, g(n).value])), ...(g('age14') && g('age14').type === 'checkbox' ? { age14: g('age14').checked } : {}) }; }
/* 동의 · 나이 확인(가입 버튼 · SNS 버튼 공통) */
function laJoinCheck(f, err) { const cfg = laCfg(); const J = LA.j; const U = laUniv(); const ck = n => !!(f.elements[n] && f.elements[n].checked);
  if (!ck('tos') || !ck('privacy')) return err('필수 약관(이용약관 · 개인정보 수집 · 이용)에 동의해 주세요.'); if (f.elements.third && !ck('third')) return err('개인정보 제3자 제공에 동의해 주세요.');
  if (U || J.kind === 'parent') return { age14: true, consent: { tos: true, privacy: true, ...(ck('third') ? { third: true } : {}), mkt: ck('mkt') } };
  const age14 = ck('age14'); let gc = '';
  if (!age14) { if (!cfg.under14) return err('이 기관은 만 14세 이상만 가입할 수 있습니다.'); gc = String(f.elements.gcontact && f.elements.gcontact.value || '').trim(); const ph = laPhone(gc); if (!LA_MAIL_RE.test(gc) && !LA_PHONE_RE.test(ph)) return err('보호자 이메일 또는 휴대폰 번호를 정확히 입력하세요.'); if (LA_PHONE_RE.test(ph)) gc = ph; }
  return { age14, gcontact: gc, consent: { tos: true, privacy: true, ...(ck('third') ? { third: true } : {}), mkt: ck('mkt') } }; }
function laExtra(f, err) { const cfg = laCfg(); const U = laUniv(); const J = LA.j; const Q = J.kind === 'parent' ? [] : cfg.extraQ.filter(q => !(U && ['학번', '학과'].includes(q.q))); const extra = {};
  for (let i = 0; i < Q.length; i++) { const q = Q[i]; const el = f.elements['xq' + i]; if (!el) continue;
    if (q.type === 'file') { const fl = el.files && el.files[0]; if (!fl) { if (q.req) return err(`「${q.q}」 파일을 첨부하세요.`); continue; } if (fl.size > 10 * 1024 * 1024) return err('첨부 파일은 10MB 이하만 올릴 수 있습니다.'); if (!/\.(pdf|jpe?g|png|hwpx?|docx?|zip)$/i.test(fl.name)) return err('첨부 파일 형식을 확인하세요(PDF · 이미지 · 한글 · 워드 · ZIP).'); extra[q.q] = { name: fl.name.slice(0, 120), size: fl.size, type: fl.type || '' }; /* 운영: 파일 서버 업로드 후 메타데이터만 저장 */ }
    else { const v = String(el.value || '').trim(); if (!v && q.req) return err(`「${q.q}」에 답해 주세요.`); if (v) extra[q.q] = v.slice(0, 100); } }
  return extra; }
/* 계정 만들기: 신원은 PII 저장소에만, 계정 상태 · 운영자 큐에는 가명 sid · 닉네임 · 가린 이메일만 */
function laCreate(o) { const cfg = laCfg(); const J = LA.j; const U = laUniv(); const inv = J.tok ? laInv(J.tok) : null; if (J.tok && !inv) throw new Error('초대 링크가 재생성되어 더 이상 쓸 수 없습니다.');
  const V = laV(); const sid = U ? o.stu : laNewSid(J.kind); const minor = !U && J.kind !== 'parent' && !o.age14; const login = U ? 'univ' : o.login;
  const keys = U ? [laBidx('univ', o.stu)] : [o.email ? laBidx('email', o.email) : '', o.sub ? laBidx('sub:' + o.login, o.sub) : ''].filter(Boolean);
  if (keys.some(k => V.idx[k] && V.ids[V.idx[k]])) throw new Error(U ? '이미 가입한 학번입니다. 로그인하거나 문의하세요.' : o.email ? '이미 가입한 이메일입니다. 로그인하세요.' : `이미 가입한 ${LA_SN[login]} 계정입니다. 로그인하세요.`);
  const gtok = minor ? laRand(24) : ''; const at = new Date().toISOString();
  V.ids[sid] = { prov: login, email: o.email || '', emailMask: o.email ? laMask(o.email) : '', pw: o.pw ? laPw(sid, o.pw) : '', name: '', phone: '', consent: { ...o.consent, ver: 'v23', at }, created: at, ...(minor ? { guardian: { contact: o.gcontact, token: gtok, status: 'pending', until: new Date(Date.now() + 7 * 864e5).toISOString() } } : {}) };
  keys.forEach(k => { V.idx[k] = sid; }); laVLog(V, 'create', sid, 'signup', [o.email ? 'email' : '', o.sub ? 'provider_sub' : '', o.pw ? 'pw' : '', minor ? 'guardian' : ''].filter(Boolean)); laVSave(V);
  const grade = J.kind === 'parent' ? '정회원' : laGrade(cfg, inv);
  laCacheSet(sid, { kind: J.kind, sid, login, links: [login], nick: o.nick, grade, status: minor ? 'guardian_pending' : 'active', minor, dept: o.dept || '', at, del: false });
  const pub = { kind: J.kind, login, sid, nick: o.nick, emailMask: o.email ? laMask(o.email) : '', dept: o.dept || '', verified: false, minor, consent: { ...o.consent, at }, extra: o.extra || {}, token: inv ? inv.token : '' };
  if (!minor) lpxPush('acct-join', pub); else laCacheSet(sid, { pendPub: pub }); /* 운영: await api('POST', `/api/pub/${LR.tid}/signup`, { via, email|provider+token|student_no, code, nickname, pw?, consent, age14, guardian }) */
  J.done = { sid, nick: o.nick, grade, status: minor ? 'guardian_pending' : 'active', gtok, gmask: minor ? (o.gcontact.includes('@') ? laMask(o.gcontact) : o.gcontact.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3')) : '' };
  if (!minor && grade !== '승인 대기') laSetMe({ kind: J.kind, sid, login, nick: o.nick, grade, dept: o.dept || '' }); else if (grade === '승인 대기') { LA.pend = sid; laPendKeep(sid); }
  lrender(); }
function laJoinSubmit(f) { const J = LA.j; const U = laUniv(); const err = m => { const e = $('#laJErr'); if (e) e.textContent = m; return false; }; const fd = n => (f.elements[n] && f.elements[n].value || '').trim();
  laJoinKeep(f); const c = laJoinCheck(f, err); if (!c) return; const X = () => laExtra(f, err); let extra;
  try {
    if (U) { const stu = fd('sid'), dept = fd('dept'); let nick = fd('nick'); if (!/^\d{6,10}$/.test(stu)) return err('학번은 숫자 6~10자리입니다.'); if (!dept) return err('학과를 입력하세요.'); if (!nick) nick = stu.slice(-4) + '학번'; if (!LA_NICK_RE.test(nick)) return err('닉네임은 2~20자 한글 · 영문 · 숫자 · - · _ 만 쓸 수 있습니다.');
      const r = laRoom() || {}; if ((r.members || []).some(m => m.sid === stu && m.acct)) return err('이미 가입한 학번입니다. 로그인하거나 문의하세요.');
      const p1 = f.elements.pw.value; if (!LA_PW_RE.test(p1)) return err('비밀번호는 영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자입니다.'); if (p1 !== f.elements.pw2.value) return err('비밀번호가 서로 다릅니다.');
      if (!(extra = X())) return; return laCreate({ stu, dept, nick, pw: p1, consent: c.consent, extra, age14: true }); }
    const nick = fd('nick').replace(/(.{2,})님$/, '$1'); /* v32.9: 호칭 '님'은 화면이 붙임 */ if (!LA_NICK_RE.test(nick)) return err('닉네임은 2~20자 한글 · 영문 · 숫자 · - · _ 만 쓸 수 있습니다.');
    if (J.sns) { if (!(extra = X())) return; return laCreate({ login: J.sns.prov, sub: J.sns.sub, nick, consent: c.consent, extra, age14: c.age14, gcontact: c.gcontact }); }
    const email = fd('email').toLowerCase(); if (!LA_MAIL_RE.test(email)) return err('이메일을 입력하세요. SNS로 가입하려면 위의 SNS 버튼을 누르세요.'); const s = LA.jv || {};
    if (!s.code || s.email !== email) return err('이메일 인증번호를 먼저 받으세요.'); if (fd('vcode') !== s.code) return err('인증번호가 올바르지 않습니다.');
    let pw = ''; const p1 = f.elements.pw ? f.elements.pw.value : ''; if (p1) { if (!LA_PW_RE.test(p1)) return err('비밀번호는 영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자입니다(선택 항목 — 비워 두어도 됩니다).'); if (p1 !== f.elements.pw2.value) return err('비밀번호가 서로 다릅니다.'); pw = p1; }
    if (!(extra = X())) return; LA.jv = null; return laCreate({ login: 'email', email, nick, pw, consent: c.consent, extra, age14: c.age14, gcontact: c.gcontact });
  } catch (x) { return err(x.message); } }

/* ═════════ 보호자 동의(#guardian/<토큰>) — 본인인증(PASS) 없이 링크 동의. 운영: POST /api/pub/<tid>/guardian { token, ok } ═════════ */
function laGuardV(r) { const tok = String(r.b || ''); const V = laV(); const sid = Object.keys(V.ids).find(k => V.ids[k].guardian && tok && (V.ids[k].guardian.token === tok || V.ids[k].guardian.used === tok)); /* v33 처리한 링크도 결과를 보여 준다(QA #57, R2) */
  if (!sid && tok && (LA.gNo || {})[tok]) return laSec('보호자 동의 거부', '<p class="lead">동의하지 않아 가입 정보를 삭제했습니다. 자녀가 다시 가입하려면 처음부터 다시 신청해야 합니다.</p>'); const g = sid && V.ids[sid].guardian; const c = sid ? laCache()[sid] || {} : {};
  if (!g) return laSec('보호자 동의', '<p class="lead">사용할 수 없는 동의 링크입니다. 만료되었거나 이미 처리했습니다.</p>');
  if (g.status === 'ok') { const man = laCfg().approve === 'manual'; return laSec('보호자 동의 완료', `<p class="lead">${esc(c.nick || '')} 회원의 가입에 동의하셨습니다. ${man ? '기관 운영자가 가입을 승인하면 로그인해 이용할 수 있습니다.' : '이제 로그인해 이용할 수 있습니다.'}</p><div class="cta">${btn(man ? '승인 후 로그인' : '로그인', '#login', 'pri')}</div>`); }
  return laSec('보호자(법정대리인) 동의', `<p class="lead">만 14세 미만 회원 <b>${esc(c.nick || '')}</b>이(가) ${esc(SITE().org.name)} 학습 사이트에 가입하려고 합니다. 아래 내용을 확인하고 동의 여부를 선택해 주세요.</p>${laPolicyHTML(false, true)}
    <p class="mini">동의하지 않으면 가입 정보는 즉시 삭제됩니다. 동의 후에도 자녀의 개인정보 열람 · 삭제를 언제든 요청할 수 있습니다.</p><div class="cta"><button class="lbtn pri" data-ac="gok" data-v="${esc(tok)}">동의합니다</button><button class="lbtn ghost" data-ac="gno" data-v="${esc(tok)}">동의하지 않습니다</button></div>`); }
function laGuardRes(tok, ok) { const V = laV(); const sid = Object.keys(V.ids).find(k => V.ids[k].guardian && V.ids[k].guardian.token === tok); if (!sid) return; const c = laCache()[sid] || {};
  if (ok) { V.ids[sid].guardian = { ...V.ids[sid].guardian, status: 'ok', at: new Date().toISOString(), token: '', used: tok }; laVLog(V, 'consent', sid, 'guardian_consent', []); laVSave(V); laCacheSet(sid, { status: 'active', pendPub: null });
    if (c.pendPub) lpxPush('acct-join', { ...c.pendPub, guardian: { ok: true, at: new Date().toISOString() } }); toast(laCfg().approve === 'manual' ? '동의를 완료했습니다. 운영자 승인 후 이용할 수 있습니다.' : '동의를 완료했습니다. 이제 로그인해 이용할 수 있습니다.', 'ok'); }
  else { LA.gNo = { ...(LA.gNo || {}), [tok]: 1 }; laVDelete(V, sid, 'guardian_refused'); laCacheSet(sid, { del: true, status: 'withdrawn', pendPub: null, nick: '' }); toast('동의하지 않아 가입 정보를 삭제했습니다.', 'ok'); }
  lrender(); }
function laVDelete(V, sid, purpose) { delete V.ids[sid]; Object.keys(V.idx).forEach(k => { if (V.idx[k] === sid) delete V.idx[k]; }); laVLog(V, 'delete', sid, purpose, ['all']); laVSave(V); }

function laPendV() { laFresh(); const id = LA.pend || ''; const acc = id ? laFind(id) : null;
  if (!acc) return laGate('가입 승인 대기', '로그인하면 승인 상태를 확인할 수 있습니다.');
  if (acc.grade === '거절') return laSec('가입이 승인되지 않았습니다', `<p class="lead">${esc(acc.reject || '자세한 내용은 운영자에게 문의하세요.')}</p><div class="cta">${btn('문의하기', '#find/inq', 'ghost')}</div>`);
  if (acc.grade !== '승인 대기') return laSec('가입이 승인되었습니다', `<p class="lead">이제 로그인해 이용할 수 있습니다.</p><div class="cta">${btn('로그인', '#login', 'pri')}</div>`);
  return laSec('운영자 승인을 기다리고 있습니다', `<div class="gate">${ico('clock', 28)}<p class="lead">${esc(acc.nick || '')}님의 가입 신청이 접수되었습니다. 운영자가 승인하면 바로 이용할 수 있습니다.</p><div class="cta"><button class="lbtn pri" data-ac="pendchk">승인 상태 다시 확인</button>${btn('홈으로', '#home', 'ghost')}</div></div>`); }

/* ═════════ 로그인 도움(이메일 인증번호 · SNS) · 비밀번호 재설정 · 문의 · 접근코드 재발급 — PASS 없음 ═════════ */
function laFindV(r) { const b = r.b || (laCfg().mode === 'code' ? 'code' : 'id'); const U = laUniv(); if (!LA.f || LA.f.b !== b) LA.f = { b, step: 1 }; const F = LA.f; const cfg = laCfg();
  const tabs = `<div class="la-seg">${[...(cfg.mode !== 'code' ? [['id', '로그인 도움'], ['pw', '비밀번호 재설정']] : []), ['code', '접근코드 재발급'], ['inq', '문의하기']].map(([k, l]) => `<a href="#find/${k}" class="${b === k ? 'on' : ''}">${l}</a>`).join('')}</div>`;
  let body = '';
  if (b === 'code') body = `<form id="laFC"><p class="mini">기관에서 받은 ${esc(lIdLabel())}${laWa(lIdLabel())} 접근코드로 로그인합니다. 코드를 잊었으면 재발급을 요청하세요. 운영자가 확인 후 새 코드를 알려 드립니다.</p><div class="form2"><label class="fl">${esc(lIdLabel())}<input name="sid" maxlength="20" required></label><label class="fl">${U ? '학과' : '소속 · 메모'}<input name="dept" maxlength="40"></label></div><button class="lbtn pri" type="submit">재발급 요청</button></form>`;
  if (b === 'inq') body = `<form id="laFQ"><p class="mini">로그인 수단을 모두 잃었거나 계정 삭제가 필요하면 남겨 주세요. 상담 가능 시간: 평일 오전 9시 ~ 오후 6시.</p><label class="fl">닉네임 또는 ${U ? '학번' : '가입 이메일'} <small>(기억나는 대로)</small><input name="lid" maxlength="60"></label>${U ? '' : '<label class="fl">회신받을 이메일 <small>(선택 — 운영자에게는 일부만 보이고, 답변은 시스템이 대신 보냅니다)</small><input name="reply" type="email" maxlength="80"></label>'}<label class="fl">문의 내용<textarea name="body" rows="3" maxlength="500" required></textarea></label><button class="lbtn pri" type="submit">문의 보내기</button></form>`;
  if (b === 'id') body = U ? `<p class="lead">대학 계정의 아이디는 학번입니다. 학번을 모르면 학과 사무실에 문의하세요.</p>` : F.step === 2 ? `<div class="la-res">${F.found ? `<p>이 이메일로 가입한 계정이 있습니다.</p><ul><li><b>${esc(F.found.nick || '')}</b> <small>${esc(LA_SN[F.found.login] || '이메일')} 가입 · ${esc(F.found.emailMask)}</small></li></ul><p class="mini">비밀번호 없이 이메일 인증번호로 로그인할 수 있습니다.</p><div class="cta">${btn('로그인', '#login', 'pri')}${btn('비밀번호 재설정', '#find/pw', 'ghost')}</div>` : '<p>이 이메일로 가입한 계정이 없습니다. SNS로 가입했다면 그 SNS 버튼으로 로그인하세요.</p><div class="cta">' + btn('로그인', '#login', 'pri') + btn('회원가입', '#join', 'ghost') + '</div>'}</div>`
    : `<p class="mini"><b>SNS로 가입했다면</b> 로그인 화면에서 같은 SNS 버튼을 누르면 됩니다(아이디 · 비밀번호가 없습니다).</p>${laSoc(cfg, 'soclogin')}<form id="laFI"><p class="mini"><b>이메일로 가입했다면</b> 가입한 이메일로 인증번호를 받아 계정을 확인합니다.</p><label class="fl">가입한 이메일<input name="lid" type="email" maxlength="80" required value="${esc((LA.fv && LA.fv.email) || '')}"></label>${laOtpBox('fv')}<p class="err" id="laFErr"></p><button class="lbtn pri" type="submit">계정 확인</button></form>`;
  if (b === 'pw') body = U ? `<p class="lead">학번 계정의 비밀번호는 <a href="#find/inq">문의</a>로 초기화를 요청하세요.</p>` : F.step === 2 ? `<form id="laFP2"><p class="mini"><b>${esc(laMask(F.id))}</b> 계정의 새 비밀번호를 정하세요. 직전 비밀번호는 다시 쓸 수 없습니다.</p><div class="form2"><label class="fl">새 비밀번호<input name="pw" type="password" maxlength="20" required autocomplete="new-password"></label><label class="fl">새 비밀번호 확인<input name="pw2" type="password" maxlength="20" required autocomplete="new-password"></label></div><small class="mini">영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자</small><p class="err" id="laFErr"></p><button class="lbtn pri" type="submit">비밀번호 재설정</button></form>`
    : `<form id="laFP"><p class="mini">가입한 이메일로 인증번호를 받아 새 비밀번호를 정합니다. 비밀번호 없이 인증번호로만 로그인해도 됩니다.</p><label class="fl">가입한 이메일<input name="lid" type="email" maxlength="80" required value="${esc((LA.fv && LA.fv.email) || F.id || '')}"></label>${laOtpBox('fv')}<p class="err" id="laFErr"></p><button class="lbtn pri" type="submit">다음</button></form>`;
  return laSec('계정 찾기', tabs + body); }
function laFindSubmit(f) { const F = LA.f; const fd = n => (f.elements[n] && f.elements[n].value || '').trim(); const err = m => { const e = $('#laFErr'); if (e) e.textContent = m; return false; }; const s = LA.fv || {};
  if (f.id === 'laFC') { if (!fd('sid')) return; lpxPush('code-req', { sid: fd('sid'), dept: fd('dept') }); toast('재발급 요청을 보냈습니다. 운영자가 확인 후 새 코드를 알려 드립니다.', 'ok'); f.reset(); return; }
  if (f.id === 'laFQ') { const rep = fd('reply').toLowerCase(); if (rep && !LA_MAIL_RE.test(rep)) { toast('회신 이메일 형식을 확인하세요.', 'warn'); return; } const ref = 'q' + laRand(8);
    if (rep) { const V = laV(); V.inq[ref] = { email: rep, at: new Date().toISOString() }; laVLog(V, 'create', '', 'inquiry_reply', ['email']); laVSave(V); }
    lpxPush('acct-inq', { kind: '계정 문의', id: fd('lid').slice(0, 60), body: fd('body') + (rep ? `\n[회신: ${laMask(rep)} · 문의번호 ${ref} — 운영: 답변은 서버가 대신 발송]` : ''), ref }); toast('문의를 보냈습니다. 평일 9~18시에 답변 드립니다.', 'ok'); f.reset(); return; }
  const id = fd('lid').toLowerCase(); if (!s.code || s.email !== id) return err('먼저 인증번호를 받으세요.'); if (fd('vcode') !== s.code) return err('인증번호를 확인하세요.');
  if (f.id === 'laFI') { const acc = laFind(id); F.found = acc ? { nick: acc.nick, login: acc.login, emailMask: acc.emailMask } : null; F.step = 2; LA.fv = null; lrender(); return; }
  if (f.id === 'laFP') { const acc = laFind(id); if (!acc) return err('이 이메일로 가입한 계정이 없습니다.'); F.id = id; F.step = 2; LA.fv = null; lrender(); return; }
  if (f.id === 'laFP2') { const acc = laFind(F.id); const p1 = f.elements.pw.value; if (!acc) return err('계정을 찾을 수 없습니다.'); if (!LA_PW_RE.test(p1)) return err('비밀번호는 영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자입니다.'); if (p1 !== f.elements.pw2.value) return err('비밀번호가 서로 다릅니다.'); const h = laPw(acc.pwKey, p1); if (h === acc.pw) return err('직전에 쓰던 비밀번호는 다시 쓸 수 없습니다.');
    laSetPw(acc, h, true); toast('비밀번호를 재설정했습니다. 새 비밀번호로 로그인하세요.', 'ok'); LA.f = null; location.hash = '#login'; } }
/* 비밀번호는 신원 저장소에만(운영자 큐로 보내지 않음). 운영자가 만든 이전 계정은 기존 방식(acct-pw) 유지 */
function laSetPw(acc, h, reset) { const V = laV(); if (V.ids[acc.sid]) { V.ids[acc.sid].prevPw = V.ids[acc.sid].pw || ''; V.ids[acc.sid].pw = h; laVLog(V, 'update', acc.sid, reset ? 'pw_reset' : 'pw_change', ['pw']); laVSave(V); lpxPush('acct-profile', { sid: acc.sid, pwSet: true }); }
  else lpxPush('acct-pw', { email: acc.legacyMail || '', sid: acc.sid, pw: h, reset: !!reset }); }

/* ═════════ 회원정보(#acct) — 내 개인정보 확인 · 필요할 때만 입력 · 삭제 ═════════ */
function laAcctV(r) { if (!LR.me) return needLogin('acct'); const cfg = laCfg(); const U = laUniv();
  if (!laAcctUser()) return laSec('회원정보', `<div class="mycard"><h3>${esc(lIdLabel())} · 접근코드 계정</h3><p class="mini">${esc(lIdLabel())} ${esc(LR.me.sid)} · 이 계정은 기관이 발급 · 관리합니다. 이름 · 연락처 · 이메일은 저장하지 않습니다.</p><button class="lbtn sm" data-ac="codechg">접근코드 변경 · 재발급 요청</button></div>`);
  const acc = laFind(LR.me.sid) || {}; const P = acc.kind === 'parent'; const V = laV(); const v = V.ids[acc.sid] || {}; const mon = new Date().toISOString().slice(0, 7); const nUsed = [...(acc.nickLog || []), ...((laCache()[acc.sid] || {}).nickLog || [])].filter((x, i, A) => String(x).startsWith(mon) && A.indexOf(x) === i).length;
  const idv = cfg.idv.on && !P ? `<div class="mycard wide la-hl" id="la-verify"><h3>본인확인 ${acc.idv ? tagL('완료', 'ok') : tagL('필요한 경우만', 'warn')}</h3><p class="mini">이 기관은 <b>${esc(LA_IDV[cfg.idv.reason] || '법령상 필요한 과정')}</b> 때문에 본인확인을 사용합니다. 해당 과정을 들을 때만 하면 됩니다. 확인 결과(완료 여부)만 저장하고 이름 · 생년월일 · 휴대폰 번호는 저장하지 않습니다.</p>${acc.idv ? '' : '<button class="lbtn pri sm" data-ac="idv">본인확인 하기</button>'}</div>` : '';
  const prof = U ? '' : `<div class="mycard"><h3>프로필</h3><form id="laProf"><div class="la-ava">${acc.photo ? `<img src="${esc(acc.photo)}" alt="">` : `<span>${esc(String(acc.nick || '?').slice(0, 1))}</span>`}<label class="lbtn sm ghost">사진 바꾸기<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" hidden></label>${acc.photo ? '<button type="button" class="lbtn sm ghost" data-ac="photodel">삭제</button>' : ''}</div><label class="fl">닉네임 <small>이번 달 ${nUsed}/5회 변경</small><input name="nick" maxlength="20" value="${esc(acc.nick || '')}"></label><small class="mini">2~20자 한글 · 영문 · 숫자 · - · _ (한 달에 5회까지)</small><p class="err" id="laPErr"></p><button class="lbtn sm pri" type="submit">저장</button></form></div>`;
  const idCard = `<div class="mycard"><h3>계정</h3><dl class="la-dl">${U ? `<dt>학번</dt><dd>${esc(acc.sid)} <small>변경 불가</small></dd><dt>학과</dt><dd>${esc(acc.dept || LR.me.dept || '')}</dd>` : `<dt>가입 수단</dt><dd>${esc(LA_SN[acc.login] || '이메일')}</dd>${acc.emailMask ? `<dt>이메일</dt><dd>${esc(acc.emailMask)}</dd>` : ''}<dt>등급</dt><dd>${esc(P ? '보호자' : acc.grade || '')}</dd>`}<dt>회원 번호</dt><dd><small>${esc(acc.sid)} (가명 번호)</small></dd></dl></div>`;
  const has = (x, purpose) => x ? `${tagL('보관 중', 'ok')} <small>${esc(purpose)}</small>` : tagL('수집 안 함');
  const pii = `<div class="mycard wide la-pii"><h3>내 개인정보</h3><p class="mini">이 기관이 보관 중인 개인정보입니다. 필요한 때에만 목적을 밝히고 받으며, 언제든 삭제할 수 있습니다. <a href="#privacy">처리방침 요약</a></p>
    <ul class="la-pl"><li><b>로그인 수단</b><span>${U ? `학번 ${esc(acc.sid)}` : acc.emailMask ? `이메일 ${esc(acc.emailMask)}` : `${esc(LA_SN[acc.login] || '')} 회원 식별자(복원 불가능한 값)`}</span></li><li><b>닉네임</b><span>${esc(acc.nick || '')}</span></li>
    ${U ? '<li><b>이름 · 연락처 · 이메일</b><span>' + tagL('수집 안 함') + ' <small>학교 SSO 연동 시에도 학번만 받습니다</small></span></li>' : `<li><b>이름</b><span>${has(v.name, '수료증 · 결제/환불용')}</span></li><li><b>휴대폰 번호</b><span>${has(v.phone, '알림톡 수신용')}</span></li><li><b>실명 · 생년월일 · 성별</b><span>${tagL('수집 안 함')}</span></li>`}</ul>
    <div class="la-row"><button type="button" class="lbtn sm ghost" data-ac="piiview">내 개인정보 전체 보기</button>${(V.log || []).some(x => x.sid === acc.sid) ? '<button type="button" class="lbtn sm ghost" data-ac="piilog">처리 기록</button>' : ''}</div>
    ${U ? '' : `<details ${r.b === 'name' ? 'open' : ''}><summary>이름 입력 · 삭제 <small>(수료증 발급 · 결제/환불 때만)</small></summary><form id="laName"><label class="fl">이름<input name="name" maxlength="30" value=""></label><label class="fl">사용 목적<select name="purpose"><option value="cert">수료증 발급(이름 표기)</option><option value="refund">결제 · 환불 처리</option></select></label><p class="mini">목적을 다 쓰면 삭제할 수 있습니다. 결제 기록은 전자상거래법에 따라 5년간 보관됩니다.</p><p class="err" id="laNErr"></p><div class="la-row"><button class="lbtn sm pri" type="submit">저장</button>${v.name ? '<button type="button" class="lbtn sm ghost" data-ac="piidel" data-v="name">이름 삭제</button>' : ''}</div></form></details>
    <details ${r.b === 'phone' ? 'open' : ''}><summary>알림톡 받기 <small>(휴대폰 번호 등록 · 해제)</small></summary><form id="laPhone"><label class="fl">휴대폰 번호<input name="phone" maxlength="13" placeholder="010-0000-0000"></label><label class="ckl"><input type="checkbox" name="agree"> [필수] 알림톡(수업 · 출결 · 결제 안내) 발송을 위해 휴대폰 번호 수집 · 이용에 동의합니다. 보유: 수신 해제 · 탈퇴 시까지.</label><p class="err" id="laHErr"></p><div class="la-row"><button class="lbtn sm pri" type="submit">등록</button>${v.phone ? '<button type="button" class="lbtn sm ghost" data-ac="piidel" data-v="phone">알림톡 해제 · 번호 삭제</button>' : ''}</div></form></details>`}</div>`;
  const canPw = U || acc.hasEmail || (LR.mode === 'live' && (LR.me.acct || {}).login === 'email'); const hasPw = LR.mode === 'live' ? !!LR.me.pwSet : !!acc.pw; const pw = canPw ? `<div class="mycard"><h3>${hasPw ? '비밀번호 변경' : '비밀번호 설정(선택)'}</h3><form id="laPw">${hasPw ? '<label class="fl">현재 비밀번호<input name="cur" type="password" maxlength="20" required autocomplete="current-password"></label>' : '<p class="mini">비밀번호 없이 이메일 인증번호로 로그인하고 있습니다. 비밀번호를 정하면 둘 다 쓸 수 있습니다.</p>'}<div class="form2"><label class="fl">새 비밀번호<input name="pw" type="password" maxlength="20" required autocomplete="new-password"></label><label class="fl">새 비밀번호 확인<input name="pw2" type="password" maxlength="20" required autocomplete="new-password"></label></div><small class="mini">영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자 · 직전 비밀번호 재사용 불가</small><p class="err" id="laWErr"></p><button class="lbtn sm pri" type="submit">${acc.pw ? '변경' : '설정'}</button></form></div>` : '';
  const links = acc.links || [acc.login]; const soc = U || !cfg.social.length ? '' : `<div class="mycard"><h3>SNS 연동</h3><p class="mini">로그인에 쓸 SNS 계정을 연동합니다. 회원 식별자만 받습니다.</p><ul class="la-socl">${LA_SOC.filter(([k]) => cfg.social.includes(k) || links.includes(k)).map(([k, l]) => `<li><span class="la-sb ${k} mini-dot"></span><b>${esc(l)}</b>${links.includes(k) ? `${tagL('연동됨', 'ok')}<button class="lbtn sm ghost" data-ac="socunlink" data-v="${k}">해제</button>` : `<button class="lbtn sm" data-ac="soclink" data-v="${k}">연동</button>`}</li>`).join('')}</ul></div>`;
  const Q = P ? [] : cfg.extraQ.filter(q => !(U && ['학번', '학과'].includes(q.q))); const ex = { ...(acc.extra || {}), ...((laCache()[acc.sid] || {}).extraEd || {}) };
  const ans = Q.length ? `<div class="mycard"><h3>${esc(SITE().org.name)} 추가 질문 답변</h3>${cfg.editAns ? `<form id="laAns">${Q.map((q, i) => { const v2 = ex[q.q]; return `<label class="fl">${esc(q.q)}${q.req ? ' *' : ''}${q.type === 'file' ? `<small>${v2 && v2.name ? esc(v2.name) : v2 && v2.file ? esc(v2.file.name) : '첨부 없음'}</small><input type="file" name="xq${i}">` : q.type === 'choice' ? `<select name="xq${i}"><option value="">선택</option>${(q.opts || []).map(o => `<option ${v2 === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input name="xq${i}" maxlength="100" value="${esc(typeof v2 === 'string' ? v2 : '')}">`}</label>`; }).join('')}<p class="err" id="laQErr"></p><button class="lbtn sm pri" type="submit">답변 저장</button></form>` : `<dl class="la-dl">${Q.map(q => { const v2 = ex[q.q]; return `<dt>${esc(q.q)}</dt><dd>${esc(v2 && typeof v2 === 'object' ? (v2.file ? v2.file.name : v2.name) : v2 || '미응답')}</dd>`; }).join('')}</dl><p class="mini">답변 수정은 운영자가 허용한 경우에만 할 수 있습니다.</p>`}</div>` : '';
  const out = `<div class="mycard wide la-danger"><h3>회원 탈퇴</h3><details><summary>탈퇴하고 개인정보 삭제</summary><form id="laDel"><p class="mini">탈퇴하면 이메일 · SNS 식별자 · 비밀번호 · 이름 · 휴대폰 등 개인정보를 <b>즉시 완전히 삭제</b>합니다. 학습 기록은 개인을 알아볼 수 없는 가명 기록으로만 남고, 결제 기록은 법령에 따라 보관됩니다.</p><label class="fl">탈퇴 사유<select name="why" required><option value="">선택하세요</option>${['더 이상 이용하지 않음', '다른 계정 사용', '개인정보 우려', '서비스 불만', '기타'].map(x => `<option>${x}</option>`).join('')}</select></label><label class="ckl"><input type="checkbox" name="a" required> 계정과 개인정보는 즉시 삭제되며 복구할 수 없습니다.</label><label class="ckl"><input type="checkbox" name="b" required> 결제한 유료 클래스는 자동으로 환불되지 않습니다(환불은 탈퇴 전에 신청).</label><label class="ckl"><input type="checkbox" name="c" required> 작성한 게시글은 자동으로 삭제되지 않습니다(작성자는 '탈퇴 회원'으로 표시).</label><button class="lbtn sm red" type="submit">탈퇴하기</button></form></details></div>`;
  const mk = laMktOn(acc.sid); const mkt = U || P ? '' : `<div class="mycard la-mkt"><h3>마케팅 정보 수신</h3><label class="ckl"><input type="checkbox" data-ac="mktask" ${mk ? 'checked' : ''}> 마케팅 정보 수신 동의 <small>(선택)</small></label><p class="mini">${esc(SITE().org.name)}의 새 클래스 · 이벤트 소식을 받습니다. 동의하지 않아도 학습에는 영향이 없습니다.</p></div>`;
  return `<section class="sec la mypage"><div class="in"><h1>회원정보</h1><div class="mygrid">${idv}${idCard}${prof}${pii}${mkt}${pw}${soc}${ans}${out}</div></div></section>`; }
/* v26.7 마케팅 수신 동의 변경(피그마 My Page › 나의 홈페이지: 체크 → 확인 창 → 토스트) */
const laMktOn = sid => { const c = laCache()[sid] || {}; if (c.mkt != null) return !!c.mkt; const v = laV().ids[sid] || {}; return !!((v.consent || {}).mkt); };
const tagL = (t, k) => `<span class="la-tag ${k || ''}">${esc(t)}</span>`;
async function laAcctSubmit(f) { const acc = laFind(LR.me.sid); if (!acc) return; const fd = n => (f.elements[n] && f.elements[n].value || '').trim(); const U = laUniv();
  const err = (id, m) => { const e = $('#' + id); if (e) e.textContent = m; return false; };
  if (f.id === 'laProf') { const nick = fd('nick'); const ph = f.elements.photo && f.elements.photo.files[0]; let photo;
    if (ph) { if (!/^image\/(png|jpeg|webp)$/.test(ph.type) || ph.size > 200 * 1024) return err('laPErr', '사진은 PNG · JPG · WEBP, 200KB 이하만 올릴 수 있습니다.'); photo = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(''); r.readAsDataURL(ph); }); }
    const data = { sid: acc.sid }; if (nick && nick !== acc.nick) { if (!LA_NICK_RE.test(nick)) return err('laPErr', '닉네임은 2~20자 한글 · 영문 · 숫자 · - · _ 만 쓸 수 있습니다.'); const mon = new Date().toISOString().slice(0, 7); const log = [...(acc.nickLog || []), ...((laCache()[acc.sid] || {}).nickLog || [])].filter((x, i, A) => String(x).startsWith(mon) && A.indexOf(x) === i); if (log.length >= 5) return err('laPErr', '닉네임은 한 달에 5회까지 바꿀 수 있습니다.'); data.nick = nick; laCacheSet(acc.sid, { nick, nickAt: Date.now(), nickLog: [...((laCache()[acc.sid] || {}).nickLog || []), new Date().toISOString()] }); LR.me.nick = nick; try { sessionStorage.setItem(SESS + LR.tid, JSON.stringify(LR.me)); } catch (e) { } }
    if (photo !== undefined) { data.photo = photo; laCacheSet(acc.sid, { photo }); }
    if (Object.keys(data).length < 2) { toast('바뀐 내용이 없습니다.'); return; } lpxPush('acct-profile', data); toast('저장했습니다.', 'ok'); lrender(); return; }
  if (f.id === 'laName') { const name = fd('name'); const purpose = fd('purpose'); if (!name || name.length > 30) return err('laNErr', '이름을 30자 이내로 입력하세요.'); const V = laV(); if (!V.ids[acc.sid]) return err('laNErr', '이 계정은 운영자가 관리합니다. 운영자에게 문의하세요.');
    V.ids[acc.sid].name = name; V.ids[acc.sid].namePurpose = purpose; laVLog(V, 'update', acc.sid, purpose, ['name']); laVSave(V); /* 운영: PUT /api/pub/<tid>/pii { field:'name', value, purpose } — 운영자 큐로 보내지 않음 */
    lpxPush('acct-profile', { sid: acc.sid, piiHas: { name: true } }); toast(`이름을 저장했습니다(${purpose === 'cert' ? '수료증 발급' : '결제 · 환불'}용).`, 'ok'); lrender(); return; }
  if (f.id === 'laPhone') { const p = laPhone(fd('phone')); if (!LA_PHONE_RE.test(p)) return err('laHErr', '휴대폰 번호를 확인하세요.'); if (!f.elements.agree.checked) return err('laHErr', '알림톡 발송을 위한 휴대폰 번호 수집 · 이용에 동의해 주세요.'); const V = laV(); if (!V.ids[acc.sid]) return err('laHErr', '이 계정은 운영자가 관리합니다. 운영자에게 문의하세요.');
    V.ids[acc.sid].phone = p; V.ids[acc.sid].phoneAt = new Date().toISOString(); laVLog(V, 'update', acc.sid, 'alimtalk', ['phone']); laVSave(V); /* 운영: PUT /api/pub/<tid>/pii { field:'phone', purpose:'alimtalk' } — 알림톡은 서버가 이 번호로 발송(운영자에게 번호 비노출) */
    lpxPush('acct-profile', { sid: acc.sid, alimtalk: true }); toast('알림톡 수신을 등록했습니다.', 'ok'); lrender(); return; }
  if (f.id === 'laPw' && LR.mode === 'live') { const p1 = f.elements.pw.value; if (p1 !== f.elements.pw2.value) return err('laWErr', '새 비밀번호가 서로 다릅니다.'); api('POST', `/api/pub/${encodeURIComponent(LR.tid)}/cpl`, { kind: 'pw-change', cur: f.elements.cur ? f.elements.cur.value : '', pw: p1 }).then(() => { const first = !LR.me.pwSet; LR.me.pwSet = true; toast(first ? '비밀번호를 설정했습니다. 이제 비밀번호로도 로그인할 수 있습니다.' : '비밀번호를 변경했습니다.', 'ok'); f.reset(); if (first) lrender(); }).catch(x => err('laWErr', x.message)); return; }
  if (f.id === 'laPw') { const p1 = f.elements.pw.value; if (acc.pw && laPw(acc.pwKey, f.elements.cur.value) !== acc.pw) return err('laWErr', '현재 비밀번호가 올바르지 않습니다.'); if (!LA_PW_RE.test(p1)) return err('laWErr', '비밀번호는 영문 · 숫자 · 특수문자(~!@#$%^&*) 조합 8~20자입니다.'); if (p1 !== f.elements.pw2.value) return err('laWErr', '새 비밀번호가 서로 다릅니다.'); const h = laPw(acc.pwKey, p1); const prev = (laV().ids[acc.sid] || {}).prevPw; if (h === acc.pw || h === prev) return err('laWErr', '직전에 쓰던 비밀번호는 다시 쓸 수 없습니다.');
    laSetPw(acc, h); toast(acc.pw ? '비밀번호를 바꿨습니다.' : '비밀번호를 설정했습니다.', 'ok'); lrender(); return; }
  if (f.id === 'laAns') { const cfg = laCfg(); const Q = cfg.extraQ.filter(q => !(U && ['학번', '학과'].includes(q.q))); const ex = {};
    for (let i = 0; i < Q.length; i++) { const q = Q[i], el = f.elements['xq' + i]; if (!el) continue; if (q.type === 'file') { const fl = el.files && el.files[0]; if (fl) { if (fl.size > 10 * 1024 * 1024) return err('laQErr', '첨부 파일은 10MB 이하만 올릴 수 있습니다.'); ex[q.q] = { name: fl.name.slice(0, 120), size: fl.size, type: fl.type || '' }; } } else { const v = String(el.value || '').trim(); if (!v && q.req) return err('laQErr', `「${q.q}」은 필수입니다.`); ex[q.q] = v; } }
    lpxPush('acct-profile', { sid: acc.sid, extra: ex }); laCacheSet(acc.sid, { extraEd: ex }); toast('답변을 저장했습니다.', 'ok'); return; }
  if (f.id === 'laDel') { const V = laV(); if (V.ids[acc.sid]) laVDelete(V, acc.sid, 'withdraw'); /* 운영: POST /api/pub/<tid>/withdraw — pii 행 완전 삭제 · 학습 기록 가명 유지 */
    laCacheSet(acc.sid, { del: true, status: 'withdrawn', nick: '', photo: '', extraEd: null, links: [] }); lpxPush('acct-del', { sid: acc.sid, reason: fd('why') }); await LR.api.logout(); toast('탈퇴했습니다. 개인정보를 모두 삭제했습니다.', 'ok'); location.hash = '#home'; lrender(); } }

/* ═════════ 가족 연결 · 자녀 관리(#family) — 휴대폰 번호 대신 '가족 연결 코드' ═════════ */
function laFamV() { if (!LR.me) return needLogin('family'); if (!laCanAcct()) return laSec('가족', '<p class="lead">게시된 학습자 사이트에서 이용할 수 있습니다.</p>'); const r = laRoom() || {}; const P = LR.me.kind === 'parent'; const PR = r.parents || [];
  const pa = P ? laPacct() : null; const me = P ? null : laMember(); const nm = id => { const m = (r.members || []).find(x => x.id === id); return m ? (m.nick || m.name) : '—'; };
  const byL = { admin: '운영자', parent: '보호자', child: esc(lTerm('learner')) };
  const mine = P ? PR.filter(p => pa && p.acct === pa.id) : PR.filter(p => me && p.child === me.id);
  const kids = P ? mine.filter(p => p.status === '연결 완료') : [];
  const recv = mine.filter(p => p.status === '연결 요청' && (P ? p.by !== 'parent' : p.by === 'parent'));
  const sent = mine.filter(p => p.status === '연결 요청' && (P ? p.by === 'parent' : p.by !== 'parent'));
  const done = mine.filter(p => p.status === '연결 완료');
  const reqRow = p => `<li><b>${esc(P ? nm(p.child) : p.name)}</b> <small>${esc(p.rel || '')} · ${byL[p.by] || ''} 요청 · ${esc(p.at || '')}</small><span class="sp"></span>${P || p.by === 'parent' ? `<button class="lbtn sm pri" data-ac="famok" data-v="${esc(p.id)}">수락</button>${p.by === 'admin' ? '<small class="mini">운영자가 보낸 요청은 거절할 수 없습니다</small>' : `<button class="lbtn sm ghost" data-ac="famno" data-v="${esc(p.id)}">거절</button>`}` : ''}</li>`;
  let kidPanel = ''; if (P) { const cur = kids.find(k => k.child === LA.kid) || kids[0]; if (cur) { LA.kid = cur.child; kidPanel = laKid(r, cur.child); } }
  const reqs = `<div class="mycard"><h3>받은 요청 <small>${recv.length}</small></h3>${recv.length ? `<ul class="la-req">${recv.map(reqRow).join('')}</ul>` : '<p class="empty">받은 연결 요청이 없습니다.</p>'}<h3>보낸 요청 <small>${sent.length}</small></h3>${sent.length ? `<ul class="la-req">${sent.map(p => `<li><b>${esc(P ? nm(p.child) : p.name)}</b> <small>${esc(p.rel || '')} · ${p.by === 'admin' ? '운영자 등록 · 보호자 수락 대기' : '상대 수락 대기'}</small></li>`).join('')}</ul>` : '<p class="empty">보낸 요청이 없습니다.</p>'}</div>`;
  const myCode = laFamCode(LR.me.sid);
  const form = `<div class="mycard"><h3>가족 연결</h3><div class="la-fcode"><small>내 가족 연결 코드</small><b id="laMyCode">${esc(myCode)}</b><button type="button" class="lbtn sm ghost" data-ac="famcopy" data-v="${esc(myCode)}">복사</button></div><p class="mini">휴대폰 번호 대신 연결 코드로 가족을 찾습니다. 가족에게 내 코드를 알려 주거나, 가족의 코드를 아래에 입력하세요.</p>
    <form id="laFam"><div class="form2"><label class="fl">관계<select name="rel">${(P ? ['자녀'] : ['모', '부', '조부모', '기타 보호자']).map(x => `<option>${x}</option>`).join('')}</select></label><label class="fl">${P ? '자녀' : '보호자'}의 연결 코드<input name="code" maxlength="8" required placeholder="F000000" autocapitalize="characters"></label></div><p class="mini">상대가 수락해야 연결이 완료됩니다.</p><p class="err" id="laFamErr"></p><div class="la-row"><button class="lbtn sm pri" type="submit">연결 요청</button><button type="button" class="lbtn sm ghost" data-ac="famshare" data-v="copy">가입 링크 복사</button><button type="button" class="lbtn sm ghost" data-ac="famshare" data-v="kakao">카카오톡 공유</button></div></form></div>`;
  const conn = !P ? `<div class="mycard"><h3>연결된 가족</h3>${done.length ? `<ul class="la-req">${done.map(p => `<li><b>${esc(p.name)}</b> <small>${esc(p.rel || '')} · 연결 완료</small></li>`).join('')}</ul>` : '<p class="empty">연결된 가족이 없습니다.</p>'}<p class="mini">연결된 보호자는 출결 · 청구서 · 수업 알림을 함께 받습니다. 연결 해제는 운영자에게 요청하세요.</p></div>` : '';
  const kidTabs = P ? (kids.length ? `<div class="la-seg kids">${kids.map(k => `<button type="button" class="${k.child === LA.kid ? 'on' : ''}" data-ac="kid" data-v="${esc(k.child)}">${esc(nm(k.child))}</button>`).join('')}</div>` : '<p class="lead">아직 연결된 자녀가 없습니다. 자녀의 가족 연결 코드를 입력해 요청하거나, 기관에서 보낸 요청을 수락하세요.</p>') : '';
  return `<section class="sec la mypage"><div class="in"><h1>${P ? '자녀 관리' : '가족 연결'}</h1>${kidTabs}${kidPanel}<div class="mygrid">${reqs}${conn}${form}</div></div></section>`; }
function laKid(r, cid) { const m = (r.members || []).find(x => x.id === cid); if (!m) return '<p class="empty">연결이 해제되었거나 조회할 수 없습니다.</p>'; const td = new Date().toISOString().slice(0, 10);
  const CL = (r.classes || []).filter(c => (c.learners || []).includes(cid)); const B = (r.bills || []).filter(b => b.who === cid || (b.to || []).some(x => x.who === cid));
  const card = c => { const pr = (c.prog || {})[cid] || {}; const ss = c.sessions || []; const att = Object.entries(c.att || {}).map(([sid, M]) => [sid, (M || {})[cid]]).filter(([, v]) => v); const cnt = k => att.filter(([, v]) => v === k || (v && v.st === k)).length; const tot = att.length; const rate = tot ? Math.round((cnt('출석') + cnt('지각')) / tot * 100) : null; const left = ss.filter(s => (s.date || '') >= td).length;
    return `<details class="mycard la-kc"><summary><b>${esc(c.name)}</b><small>${esc([c.start, c.end].filter(Boolean).join(' ~ ') || '')}</small>${rate != null ? tagL(`출석률 ${rate}%`, rate >= 80 ? 'ok' : 'warn') : tagL(`진도 ${Math.round(+pr.p || 0)}%`)}</summary><dl class="la-dl"><dt>진도</dt><dd>${Math.round(+pr.p || 0)}%</dd><dt>출석 · 결석</dt><dd>출석 ${cnt('출석')} · 지각 ${cnt('지각')} · 조퇴 ${cnt('조퇴')} · 결석 ${cnt('결석')}</dd>${ss.length ? `<dt>남은 회차</dt><dd>${left}회 / 전체 ${ss.length}회</dd>` : ''}</dl>${ss.length ? `<table class="la-tb"><thead><tr><th>회차</th><th>날짜</th><th>출결</th></tr></thead><tbody>${ss.slice(0, 40).map((s, i) => { const v = ((c.att || {})[s.id] || {})[cid]; const st = v && typeof v === 'object' ? v.st : v; const tm = ((c.attT || {})[s.id] || {})[cid]; return `<tr><td>${s.n || i + 1}</td><td>${esc(s.date || '')} ${esc(s.from || '')}</td><td>${esc(st || '—')}${tm && tm.by !== 'admin' && tm.in ? ` <small>${esc(tm.in)}${tm.out ? ' ~ ' + esc(tm.out) : ''}</small>` : ''}</td></tr>`; }).join('')}</tbody></table>` : ''}</details>`; };
  return `<div class="la-kid"><h2>${esc(m.nick || m.name)} <small>${esc(lTerm('learner'))}</small></h2>${CL.length ? CL.map(card).join('') : '<p class="empty">수강 중인 클래스가 없습니다.</p>'}${B.length ? `<div class="mycard"><h3>청구서</h3><ul class="la-req">${B.slice(0, 10).map(b => `<li><b>${esc(b.title || '청구서')}</b> <small>${esc(b.due ? '납부 기한 ' + b.due : '')}</small><span class="sp"></span>${tagL(b.status || '', /완료|납부$/.test(b.status || '') ? 'ok' : 'warn')}</li>`).join('')}</ul></div>` : ''}</div>`; }

/* ═════════ 알림함(#inbox) · 헤더 종 ═════════ */
function laInboxKey() { if (!LR.me) return ''; if (LR.me.kind === 'parent') { const p = laPacct(); return p ? p.id : ''; } const m = laMember(); return m ? m.id : ''; }
const laIK = k => 'didisam.room.' + LR.tid + '.inbox.' + k;
const laIS = k => { try { return JSON.parse(localStorage.getItem(laIK(k)) || '{"read":[],"del":[]}'); } catch (e) { return { read: [], del: [] }; } };
const laISet = (k, v) => { try { localStorage.setItem(laIK(k), JSON.stringify(v)); } catch (e) { } };
function laItems() { const k = laInboxKey(); const r = laRoom(); if (!k || !r) return { k, L: [] }; const st = laIS(k); const L = ((r.inbox || {})[k] || []).filter(n => !st.del.includes(n.id)).map(n => ({ ...n, read: n.read || st.read.includes(n.id) })); return { k, L }; }
const laYmd = at => { const m = String(at || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const laAt = at => { const m = String(at || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+?(?:(오전|오후)\s*)?(\d{1,2})(?::|시\s*)(\d{1,2})/); if (!m) return null; let h = +m[5]; if (m[4] === '오후' && h < 12) h += 12; if (m[4] === '오전' && h === 12) h = 0; return new Date(+m[1], +m[2] - 1, +m[3], h, +m[6]); };
const laAgo = at => { const d = laAt(at); if (!d) return esc(at || ''); const s = Math.max(0, (Date.now() - d) / 1e3); return s < 60 ? '방금 전' : s < 3600 ? Math.floor(s / 60) + '분 전' : s < 86400 ? Math.floor(s / 3600) + '시간 전' : s < 86400 * 7 ? Math.floor(s / 86400) + '일 전' : esc(at); };
/* v26.7 알림(피그마 My Page › 알림): 읽지 않은 알림 N개 · [읽은 알림 삭제] [전체 삭제] · 날짜별 묶음 · 안 읽음 점 · 상대 시각 · × 삭제 */
function laInboxV() { if (!LR.me) return needLogin('inbox'); const { L } = laItems(); const un = L.filter(n => !n.read).length; const rd = L.length - un;
  const W = ['일', '월', '화', '수', '목', '금', '토']; const G = []; L.forEach(n => { const d = laYmd(n.at); const k = d ? `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${W[d.getDay()]})` : '이전 알림'; const g = G.find(x => x.k === k); g ? g.L.push(n) : G.push({ k, L: [n] }); });
  const row = n => `<li class="${n.read ? '' : 'new'}"><i class="la-dot" aria-hidden="true"></i><span class="la-av" aria-hidden="true">${ico(n.child ? 'user' : 'bell', 16)}</span><button type="button" class="la-n" data-ac="nopen" data-v="${esc(n.id)}"><b>[${esc(n.title)}]</b>${n.child ? `<span class="la-tag">${esc(n.child)}</span>` : ''}<p>${nl(n.body || '')}</p>${(n.imgs || []).length ? `<small>첨부 ${n.imgs.length}개</small>` : ''}${n.read ? '' : '<span class="sr">읽지 않음</span>'}</button><small class="la-ago">${laAgo(n.at)}</small><button type="button" class="la-nx" data-ac="ndel" data-v="${esc(n.id)}" aria-label="알림 삭제">×</button></li>`;
  return `<section class="sec la la-inb"><div class="in narrow"><div class="la-ih"><h1>알림</h1></div>
    <div class="la-ib"><span>읽지 않은 알림 <b>${un}</b>개</span><span class="sp"></span>${un ? '<button class="lbtn sm ghost" data-ac="nall">모두 읽음</button>' : ''}<button class="lbtn sm ghost" data-ac="nrdel" ${rd ? '' : 'disabled'}>읽은 알림 삭제</button><button class="lbtn sm pri" data-ac="ndelask" ${L.length ? '' : 'disabled'}>전체 삭제</button></div>
    ${LR._ndelc && L.length ? `<div class="la-icf" role="alert"><span>알림 ${L.length}건을 모두 삭제할까요? 삭제한 알림은 되돌릴 수 없습니다.</span><button class="lbtn sm ghost" data-ac="ndelno">취소</button><button class="lbtn sm pri" data-ac="ndelall">삭제</button></div>` : ''}
    ${L.length ? G.map(g => `<h2 class="la-ig">${esc(g.k)}</h2><ul class="la-inbox">${g.L.map(row).join('')}</ul>`).join('') : `<p class="empty la-iem">${ico('bell', 18)} 새로운 알림이 없습니다.</p>`}<p class="mini">기관에서 보낸 메시지 · 공지 · 가입 · 가족 연결 알림입니다.</p></div></section>`; }
function laMark(ids, del) { const { k } = laItems(); if (!k) return; const st = laIS(k); ids.forEach(id => { if (del) { if (!st.del.includes(id)) st.del.push(id); } else if (!st.read.includes(id)) st.read.push(id); }); st.read = st.read.slice(-500); st.del = st.del.slice(-500); laISet(k, st); lpxPush(del ? 'inbox-del' : 'inbox-read', { key: k, ids }); }

/* 렌더 후 손질: 헤더 종 · 닉네임 · 계정 메뉴 · 가입 버튼 · 처리방침 링크 */
function laDecor() { const app = $('#lapp'); if (!app || !SITE()) return; const box = $('.lh .acct'); const cfg = laCfg();
  if (cfg.mode !== 'code' && !laUniv() && laCanAcct()) { const ft = $('.lf small'); if (ft && /이름 · 연/.test(ft.textContent)) ft.innerHTML = '가입 때는 로그인 수단(SNS 또는 이메일)과 닉네임만 받습니다. 실명 · 휴대폰 번호는 필요할 때만 목적을 밝히고 받습니다. <a href="#privacy">개인정보 처리방침</a>'; }
  else { const ft = $('.lf small'); if (ft && !ft.querySelector('a[href="#privacy"]') && laCanAcct()) ft.insertAdjacentHTML('beforeend', ' <a href="#privacy">개인정보 처리방침</a>'); }
  if (box && LR.me && !$('.la-bell')) { const { L } = laItems(); const un = L.filter(n => !n.read).length; const P = LR.me.kind === 'parent';
    box.insertAdjacentHTML('afterbegin', `<a class="la-bell" href="#inbox" aria-label="알림 ${un}건">${ico('bell', 19)}${un ? `<i>${un > 99 ? '99+' : un}</i>` : ''}</a>`);
    box.insertAdjacentHTML('beforeend', `<details class="la-acm"><summary aria-label="계정 메뉴">${ico('menu', 16)}</summary><div class="la-acp" role="menu">${P ? '<a href="#family" role="menuitem">자녀 관리</a>' : '<a href="#my" role="menuitem">마이페이지</a>'}<a href="#inbox" role="menuitem">알림${un ? ` (${un})` : ''}</a>${laAcctUser() ? '<a href="#acct" role="menuitem">회원정보 · 개인정보</a>' : '<a href="#acct" role="menuitem">계정</a>'}${(cfg.parent || P) && laAcctUser() ? `<a href="#family" role="menuitem">${P ? '가족 연결' : '가족'}</a>` : ''}<a href="#" data-lact="logout" role="menuitem">로그아웃</a></div></details>`);
    if (LR.me.nick) { const s = $('.lh .acct .me .sid'); if (s) s.textContent = LR.me.nick; const av = $('.lh .acct .me .av'); if (av) av.textContent = P ? '보' : String(LR.me.nick).slice(0, 1); } }
  if (box && !LR.me && laCanAcct() && cfg.mode === 'open' && !$('.la-join')) box.insertAdjacentHTML('afterbegin', '<a class="lbtn sm ghost la-join" href="#join">가입하기</a>');
  if (LR.me && cfg.idv.on && LR.me.grade === '준회원' && !$('.la-bar') && route().a !== 'acct') app.insertAdjacentHTML('afterbegin', `<div class="la-bar">이 기관의 일부 과정(${esc(LA_IDV[cfg.idv.reason] || '')})은 본인확인이 필요합니다. <a href="#acct/verify">본인확인 하기</a></div>`);
  if (LR.me && route().a === 'my' && !$('.la-myl')) { const t0 = app.querySelector('.mypage .in'); const { L } = laItems(); const un = L.filter(n => !n.read).length; if (t0) t0.insertAdjacentHTML('afterbegin', `<nav class="la-myl" aria-label="계정"><a href="#inbox">${ico('bell', 15)} 알림${un ? ` <b>${un}</b>` : ''}</a><a href="#acct">${ico('user', 15)} ${laAcctUser() ? '회원정보 · 개인정보' : '계정'}</a>${cfg.parent && laAcctUser() ? `<a href="#family">${ico('home', 15)} 가족</a>` : ''}</nav>`); } }
/* 다른 화면(수료증 · 환불)에서 쓰는 도우미: 필요할 때만 이름 요청 */
window.laNeedName = purpose => { const acc = LR.me && laFind(LR.me.sid); if (acc && acc.named) return true; location.hash = '#acct/name'; toast(`${purpose === 'refund' ? '결제 · 환불 처리' : '수료증 발급'}에 이름이 필요합니다. 이름을 입력해 주세요.`); return false; };
window.laIdvOK = () => { const cfg = laCfg(); if (!cfg.idv.on || !LR.me) return true; const acc = laFind(LR.me.sid); return !!(acc && acc.idv); };

const LA_R = { join: laJoin, find: laFindV, acct: laAcctV, family: laFamV, inbox: laInboxV, pending: laPendV, guardian: laGuardV, privacy: laPrivV };
{ const base = lrender; lrender = () => { if (!SITE()) return base(); try { laRefreshMe(); } catch (e) { console.error(e); } const r = route(); let a = r.a; if (LR.me && LR.me.kind === 'parent' && (a === 'my' || a === 'login')) a = 'family'; if (a !== 'join' && LA.j && LA.j.done) LA.j = null;
  if (LA_R[a]) { if (PLAYER && PLAYER.stop) PLAYER.stop(); PLAYER = null; if (typeof bkStop === 'function') bkStop(); let inner = ''; try { inner = LA_R[a](r); } catch (e) { console.error(e); inner = laSec('계정', '<p class="lead">화면을 그리지 못했습니다. 새로 고침해 주세요.</p>'); }
    document.body.className = 'look-' + (SITE().look || 'clean') + (LR.mode === 'preview' ? ' pv' : ''); $('#lapp').innerHTML = shell(inner, 'my'); document.title = `${SITE().org.name} · 계정`; }
  else base();
  try { laDecor(); } catch (e) { console.error(e); } }; }

/* ═════════ 이벤트 ═════════ */
function laRekeep(fid, fn) { const f = fid && $('#' + fid); const keep = f ? Object.fromEntries([...f.elements].filter(x => x.name && x.type !== 'file' && x.type !== 'password' && x.name !== 'vcode').map(x => [x.name, x.type === 'checkbox' ? x.checked : x.value])) : {}; fn(); const f2 = fid && $('#' + fid); if (f2) Object.entries(keep).forEach(([n, val]) => { const x = f2.elements[n]; if (x && x.type !== 'hidden') { if (x.type === 'checkbox') x.checked = val; else x.value = val; } }); }
document.addEventListener('click', async e => { const el = e.target.closest('[data-ac]'); if (!el) return; const k = el.dataset.ac, v = el.dataset.v; if (el.tagName !== 'INPUT') e.preventDefault(); const J = LA.j;
  if (k === 'dlgx') laDlgX();
  if (k === 'jkind' && J) { laJoinKeep($('#laJoin')); J.kind = v; lrender(); }
  if (k === 'jall') { const f = el.closest('form'); ['tos', 'privacy', 'third', 'mkt'].forEach(n => { if (f.elements[n]) f.elements[n].checked = el.checked; }); }
  if (k === 'jage') { const g = el.closest('form').querySelector('.la-guard'); if (g) g.hidden = el.checked; }
  if (k === 'jsnsx' && J) { J.sns = null; lrender(); }
  if (k === 'jsns' && J) { const f = el.closest('form'); const err = m => { const x = $('#laJErr'); if (x) x.textContent = m; return false; }; laJoinKeep(f); if (!laJoinCheck(f, err)) return; err(''); laSocDlg(v, 'join'); }
  if (k === 'sso') toast('학교 SSO(SAML · OIDC) 로그인은 학교와 연동 협의 후 열립니다. 지금은 학번으로 가입 · 로그인하세요.');
  if (k === 'lmode') { LA.lmode = v; laRekeep('laLogin', lrender); }
  if (k === 'otp') { const f = el.closest('form'); const say = m => { const x = f && f.querySelector('.err'); if (x) x.textContent = m; }; const em = String((f.elements.email || f.elements.lid || {}).value || '').trim().toLowerCase();
    if (!LA_MAIL_RE.test(em)) return say('이메일을 정확히 입력하세요.');
    if (v === 'jv' && laSidOf(em) && laV().ids[laSidOf(em)]) return say('이미 가입한 이메일입니다. 로그인 화면에서 인증번호로 로그인하세요.');
    LA[v] = { code: laCode(), at: Date.now(), email: em }; /* 운영: await api('POST', `/api/pub/${LR.tid}/otp`, { email, purpose }) — 서버가 이메일 발송 */
    if (v === 'jv') laJoinKeep(f); laRekeep(f.id, lrender); toast('인증번호를 보냈습니다(데모: 화면에 표시).'); }
  if (k === 'soclogin') laSocDlg(v, 'login');
  if (k === 'pendchk') { laFresh(); lrender(); }
  if (k === 'gok' || k === 'gno') laGuardRes(v, k === 'gok');
  if (k === 'codechg') { lpxPush('code-req', { sid: LR.me && LR.me.sid, body: '학습자 마이페이지 요청' }); toast('접근코드 변경 요청을 보냈습니다. 운영자가 새 코드를 알려 드립니다.', 'ok'); }
  if (k === 'photodel' && LR.me) { lpxPush('acct-profile', { sid: LR.me.sid, photo: '' }); laCacheSet(LR.me.sid, { photo: '' }); lrender(); }
  if (k === 'piiview' && LR.me) { const V = laV(); const p = V.ids[LR.me.sid] || {}; laVLog(V, 'view', LR.me.sid, 'self_access', ['email', 'name', 'phone']); laVSave(V); /* 운영: GET /api/pub/<tid>/pii(열람 기록) */
    const g = p.guardian; laDlg(`<h3>내 개인정보</h3><dl class="la-dl"><dt>로그인 수단</dt><dd>${esc(LA_SN[p.prov] || '운영자 등록 계정')}</dd>${p.email ? `<dt>이메일</dt><dd>${esc(p.email)}</dd>` : ''}${p.prov && p.prov !== 'email' && p.prov !== 'univ' ? '<dt>SNS 식별자</dt><dd>복원할 수 없는 값으로만 보관</dd>' : ''}<dt>비밀번호</dt><dd>${p.pw ? '설정함(암호화 보관)' : '없음'}</dd><dt>이름</dt><dd>${esc(p.name || '수집 안 함')}</dd><dt>휴대폰</dt><dd>${esc(p.phone || '수집 안 함')}</dd>${g ? `<dt>보호자 동의</dt><dd>${g.status === 'ok' ? '동의 완료' : '대기'}</dd>` : ''}<dt>동의</dt><dd>이용약관 · 개인정보 ${p.consent ? '동의' : '—'} · 마케팅 ${p.consent && p.consent.mkt ? '동의' : '미동의'} <small>${esc((p.consent && p.consent.at || '').slice(0, 10))}</small></dd></dl><p class="mini">운영자는 이 화면의 값을 볼 수 없습니다(닉네임 · 가린 이메일만).</p>`); }
  if (k === 'piilog' && LR.me) { const L = (laV().log || []).filter(x => x.sid === LR.me.sid).slice(0, 30); const A = { create: '수집', update: '입력 · 변경', view: '열람', erase: '삭제', delete: '삭제', consent: '동의', idv: '본인확인' };
    laDlg(`<h3>개인정보 처리 기록</h3><table class="la-tb"><thead><tr><th>일시</th><th>처리</th><th>목적</th><th>항목</th></tr></thead><tbody>${L.map(x => `<tr><td>${esc(x.at.slice(0, 16).replace('T', ' '))}</td><td>${esc(A[x.action] || x.action)}</td><td>${esc(x.purpose || '')}</td><td>${esc((x.fields || []).join(', '))}</td></tr>`).join('')}</tbody></table>`); }
  if (k === 'piidel' && LR.me) { const V = laV(); const p = V.ids[LR.me.sid]; if (!p) return; p[v] = ''; laVLog(V, 'erase', LR.me.sid, v === 'phone' ? 'alimtalk_off' : 'name_erase', [v]); laVSave(V); lpxPush('acct-profile', v === 'phone' ? { sid: LR.me.sid, alimtalk: false } : { sid: LR.me.sid, piiHas: { name: false } }); toast(v === 'phone' ? '알림톡 수신을 해제하고 번호를 삭제했습니다.' : '이름을 삭제했습니다.', 'ok'); lrender(); }
  if (k === 'idv' && LR.me) { const cfg = laCfg(); laDlg(`<h3>본인확인 <small class="la-tag">데모</small></h3><p class="mini">운영에서는 PASS(통신 3사) · 간편인증 창이 열립니다. 결과(확인 완료 여부)만 저장하고 이름 · 생년월일 · 휴대폰 번호 · CI는 저장하지 않습니다.</p><p class="mini">사유: ${esc(LA_IDV[cfg.idv.reason] || '')}</p><button class="lbtn pri blk" data-ac="idvok">본인확인 완료(데모)</button>`); }
  if (k === 'idvok' && LR.me) { /* 운영: POST /api/pub/<tid>/verify { token } — 본인확인 기관 결과를 서버가 검증 */ const V = laV(); laVLog(V, 'idv', LR.me.sid, laCfg().idv.reason, []); laVSave(V); laCacheSet(LR.me.sid, { idv: true }); lpxPush('acct-idv', { sid: LR.me.sid, reason: laCfg().idv.reason }); laDlgX(); toast('본인확인을 완료했습니다.', 'ok'); lrender(); }
  if ((k === 'soclink' || k === 'socunlink') && LR.me) { const acc = laFind(LR.me.sid); if (!acc) return; let links = [...new Set(acc.links || [acc.login])]; const V = laV();
    if (k === 'socunlink') { const rest = links.filter(x => x !== v); if (!rest.filter(x => x !== 'email').length && !acc.hasEmail) { toast('로그인 수단이 하나는 남아 있어야 합니다. 다른 SNS를 먼저 연동하세요.', 'warn'); return; } links = rest; Object.keys(V.idx).forEach(x => { if (x.startsWith('sub:' + v + ':') && V.idx[x] === acc.sid) delete V.idx[x]; }); }
    else { /* 운영: OAuth 연동 창 → 회원 식별자만 */ links.push(v); V.idx[laBidx('sub:' + v, `${v}-link-${acc.sid}`)] = acc.sid; }
    laVLog(V, k === 'soclink' ? 'update' : 'erase', acc.sid, 'sns_link', ['provider_sub']); laVSave(V); lpxPush('acct-profile', { sid: acc.sid, links }); laCacheSet(acc.sid, { links }); toast(k === 'soclink' ? `${LA_SN[v]} 계정을 연동했습니다(데모).` : `${LA_SN[v]} 연동을 해제했습니다.`, 'ok'); lrender(); }
  if (k === 'kid') { LA.kid = v; lrender(); }
  if ((k === 'famok' || k === 'famno') && LR.me) { const pa = laPacct(); lpxPush('fam-res', { pid: v, ok: k === 'famok', acct: pa ? pa.id : '' }); toast(k === 'famok' ? '연결 요청을 수락했습니다. 운영자 화면에 반영되면 연결이 완료됩니다.' : '연결 요청을 거절했습니다.', 'ok'); }
  if (k === 'famcopy') { (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('연결 코드를 복사했습니다.', 'ok'), () => toast(v)); }
  if (k === 'famshare') { const u = location.href.split('#')[0] + '#join'; if (v === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('가입 링크를 복사했습니다.', 'ok'), () => toast(u)); } else toast('카카오톡 공유 창을 엽니다(데모: 카카오 JavaScript 키 연동 후 동작).'); }
  if (k === 'nopen') { laMark([v]); const { L } = laItems(); const n = L.find(x => x.id === v); if (n && n.href && /^#[\w/-]+$/.test(n.href)) location.hash = n.href; else lrender(); }
  if (k === 'ndel') { laMark([v], true); lrender(); }
  if (k === 'mktask') { if (e && e.preventDefault) e.preventDefault(); const on = laMktOn(LR.me.sid); laDlg(`<h3>마케팅 수신 동의 ${on ? '해제' : ''} 확인</h3><p>${esc(SITE().org.name)}의 마케팅 정보 수신 동의를 ${on ? '해제' : ''}하시겠어요?</p><div class="la-row"><button type="button" class="lbtn ghost" data-ac="dlgx">취소</button><button type="button" class="lbtn pri" data-ac="mktset" data-v="${on ? 0 : 1}">확인</button></div>`); }
  if (k === 'mktset') { const sid = LR.me.sid; const on = v === '1'; const V = laV(); if (V.ids[sid]) { V.ids[sid].consent = { ...(V.ids[sid].consent || {}), mkt: on, mktAt: new Date().toISOString() }; laVLog(V, 'consent', sid, on ? 'mkt_on' : 'mkt_off', []); laVSave(V); } laCacheSet(sid, { mkt: on }); lpxPush('acct-profile', { sid, mkt: on }); laDlgX(); toast(on ? '마케팅 수신 동의가 완료되었습니다.' : '마케팅 수신 동의가 해제되었습니다.'); lrender(); }
  if (k === 'nrdel') { const { L } = laItems(); laMark(L.filter(n => n.read).map(n => n.id), true); lrender(); }
  if (k === 'ndelask') { LR._ndelc = true; lrender(); }
  if (k === 'ndelno') { LR._ndelc = false; lrender(); }
  if (k === 'ndelall') { LR._ndelc = false; const { L } = laItems(); laMark(L.map(n => n.id), true); lrender(); }
  if (k === 'nall') { const { L } = laItems(); laMark(L.filter(n => !n.read).map(n => n.id)); lrender(); }
});
const LA_FORMS = new Set(['laLogin', 'laSoc', 'laJoin', 'laFC', 'laFQ', 'laFI', 'laFP', 'laFP2', 'laFam', 'laProf', 'laName', 'laPhone', 'laPw', 'laAns', 'laDel']);
document.addEventListener('submit', async e => { const f = e.target; if (!f || !LA_FORMS.has(f.id)) return; e.preventDefault();
  try {
    if (f.id === 'laLogin') { const b = f.querySelector('button[type=submit]'); b.disabled = true; $('#laErr').textContent = ''; try { await laLogin(f); } catch (x) { $('#laErr').textContent = x.message; b.disabled = false; } return; }
    if (f.id === 'laSoc') { const prov = f.dataset.v; const sub = f.elements.sub.value.trim(); const er = $('#laSocErr'); if (!/^[\w.-]{3,60}$/.test(sub)) { er.textContent = '계정 ID를 확인하세요.'; return; }
      const acc = laFind(`sns:${prov}:${sub}`);
      if (f.dataset.mode === 'join') { if (acc) { er.textContent = `이미 가입한 ${LA_SN[prov]} 계정입니다. 로그인하세요.`; return; } const nick = f.elements.nick.value.trim().replace(/(.{2,})님$/, '$1'); if (!LA_NICK_RE.test(nick)) { er.textContent = '닉네임은 2~20자 한글 · 영문 · 숫자 · - · _ 만 쓸 수 있습니다.'; return; }
        const J = LA.j; const fj = $('#laJoin'); laJoinKeep(fj); const c = laJoinCheck(fj, m => { er.textContent = m; return false; }); if (!c) return; const extra = laExtra(fj, m => { er.textContent = m; return false; }); if (!extra) return;
        laDlgX(); J.sns = { prov, sub, nick }; try { laCreate({ login: prov, sub, nick, consent: c.consent, extra, age14: c.age14, gcontact: c.gcontact }); } catch (x) { J.sns = null; toast(x.message, 'warn'); lrender(); } return; }
      if (acc) { laDlgX(); try { laAfterAuth(acc, 'my'); } catch (x) { toast(x.message, 'warn'); } return; }
      laDlgX(); const cfg = laCfg(); if (cfg.mode !== 'open') { toast('가입된 계정이 없습니다. 초대받은 링크로 가입하세요.', 'warn'); return; }
      LA.j = { tok: '', inv: null, kind: 'learner', sns: { prov, sub, nick: `${LA_SN[prov]}회원${laRand(3)}` }, done: null, keep: {} }; toast(`${LA_SN[prov]} 계정으로 처음 오셨습니다. 약관 동의 후 가입을 마칩니다.`); location.hash = '#join'; lrender(); return; }
    if (f.id === 'laJoin') return laJoinSubmit(f);
    if (/^laF/.test(f.id) && f.id !== 'laFam') return laFindSubmit(f);
    if (f.id === 'laFam') { const code = f.elements.code.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); const er = $('#laFamErr'); const r = laRoom() || {}; const P = LR.me.kind === 'parent';
      if (!/^F[A-Z0-9]{6}$/.test(code)) { er.textContent = '연결 코드를 확인하세요(F로 시작하는 7자리).'; return; }
      const ok = P ? (r.members || []).some(m => m.sid && laFamCode(m.sid) === code) : (r.pacct || []).some(x => x.sid && laFamCode(x.sid) === code);
      if (!ok) { er.textContent = `이 코드로 가입한 ${P ? '자녀' : '보호자'}가 없습니다. 코드를 다시 확인하거나 가족에게 가입을 먼저 안내하세요.`; return; }
      lpxPush('fam-req', { from: P ? 'parent' : 'child', sid: LR.me.sid, code, rel: f.elements.rel.value }); f.reset(); toast('연결 요청을 보냈습니다. 상대가 수락하면 연결됩니다.', 'ok'); return; }
    if (['laProf', 'laName', 'laPhone', 'laPw', 'laAns', 'laDel'].includes(f.id)) return await laAcctSubmit(f);
  } catch (x) { console.error(x); toast('처리하지 못했습니다 — ' + x.message, 'bad'); } });
addEventListener('storage', e => { if (!e.key || !LR.tid || e.key !== 'didisam.room.' + LR.tid) return; laFresh(); const a = route().a; if (['inbox', 'family', 'pending', 'acct'].includes(a) && !(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) lrender(); else { const b = $('.la-bell'); if (b) { const { L } = laItems(); const un = L.filter(n => !n.read).length; b.innerHTML = ico('bell', 19) + (un ? `<i>${un > 99 ? '99+' : un}</i>` : ''); } } });
