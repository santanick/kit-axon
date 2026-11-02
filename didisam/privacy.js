/* v23 privacy — 개인정보 최소 수집 · 분리(스튜디오 쪽). mem2.js 다음에 로드한다(감싸기만, mem2.js는 고치지 않음).
   - 가입 · 계정 설정: 본인인증(PASS) 정회원 조건 제거 → '선택 본인확인'(기관이 법적으로 필요할 때만: 고용보험 환급 · 성인 인증 · 학점 인정) · 페이스북 제외
   - 학습자 → 운영자 큐(LPX): 가입 · 프로필에 이메일 · 휴대폰 · 이름 · 비밀번호가 없어도 동작(가명 sid · 닉네임 · 가린 이메일만)
   - 탈퇴(acct-del): 회원 기록을 지우지 않고 '탈퇴 회원'으로 가명화(학습 기록 유지) · 가족 연결은 연결 코드로
   - 회원 목록 · 상세: 가린 이메일 · 알림톡 수신 여부만 표시, 원문은 '목적을 밝히고 열람'(기록 남음)
   운영: 개인정보 원문은 서버 pii 스키마에만 있다. 열람은 POST /api/learners/pii { learner_id, field, purpose }(정운영자 · 기록), 기록 조회는 GET /api/learners/pii-log. */
'use strict';
const PV_IDV = { refund: '고용보험 환급 과정(직업능력개발훈련)', adult: '성인 인증이 필요한 콘텐츠', credit: '학점 인정 과정' };
const PV_PURPOSE = { cert: '수료증 발급', refund: '결제 · 환불 처리', legal: '법령상 요청' };
const pvFam = sid => 'F' + mbHash('fam|' + sid).slice(0, 6).toUpperCase();
const pvVault = () => { try { const v = JSON.parse(localStorage.getItem('didisam.room.' + ((typeof DREG !== 'undefined' && DREG.cur && DREG.cur()) || '') + '.pii') || 'null'); return v && v.ids ? v : null; } catch (e) { return null; } };
const pvVaultSave = v => { try { localStorage.setItem('didisam.room.' + DREG.cur() + '.pii', JSON.stringify(v)); } catch (e) { } };

/* ── 데이터 보정: PASS 조건 끄기 · 선택 본인확인 기본값 · 준회원 해제 ── */
{ const base = mbEnsure; mbEnsure = (...a) => { base(...a); try { if (!S || !S.settings || !S.settings.acct) return; const A = S.settings.acct;
  A.verify = false; A.social = (A.social || []).filter(k => k !== 'facebook'); if (!A.idv || typeof A.idv !== 'object') A.idv = { on: false, reason: 'refund', note: '' };
  if (A.v23 !== 1) { A.v23 = 1; const n = (S.members || []).filter(m => m.grade === '준회원').length; if (n && typeof logAudit === 'function' && S.me) logAudit(`v23 간편가입 전환 — 본인인증 조건 해제, 준회원 ${n}명 정회원 전환`); }
  (S.members || []).forEach(m => { if (m.grade === '준회원') m.grade = '정회원'; }); } catch (e) { console.error(e); } }; }

/* ── 가입 · 계정 설정 모달: 본인인증 체크 제거 · 선택 본인확인 · 14세 미만 문구 ── */
{ const base = ACT['mb-acct']; ACT['mb-acct'] = el => { base(el); try { const w = $('#modal'); if (!w) return; const A = S.settings.acct; const U = mbUniv();
  w.querySelectorAll('[name=verify],[name=soc_facebook]').forEach(x => { const l = x.closest('label'); if (l) l.remove(); });
  const u14 = w.querySelector('[name=under14]'); if (u14 && u14.closest('label')) u14.closest('label').lastChild.textContent = ' 만 14세 미만 가입 허용(보호자 이메일 · 휴대폰으로 동의 링크 — 본인인증 없음)';
  const soc = w.querySelector('[name=soc_kakao]'); const note = soc && soc.closest('.fl') && soc.closest('.fl').querySelector('small'); if (note) note.textContent = '이메일(인증번호) 가입은 항상 제공합니다. SNS는 회원 식별자 · 닉네임만 받습니다(이메일 · 이름 · 전화 미요청). 운영: 각 SNS 개발자 콘솔에 앱 등록 후 OAuth 연동.';
  const anchor = (u14 && u14.closest('label')) || w.querySelector('[name=editAns]')?.closest('label');
  if (anchor && !U) anchor.insertAdjacentHTML('afterend', pvIdvBlock(A.idv));
  const okb = w.querySelector('[data-mact=ok]'); if (okb) okb.addEventListener('click', () => { if (!U) pvIdvRead(w, A); }); } catch (e) { console.error(e); } }; }
const pvIdvBlock = I => `<div class="fl pv-idv"><span>선택 본인확인 <small class="mini">(기본 꺼짐)</small></span><label class="ckl"><input type="checkbox" name="pv_idv" ${I && I.on ? 'checked' : ''}> 법령상 필요한 과정이 있어 본인확인(PASS · 간편인증)을 사용합니다</label>
  <select name="pv_idv_reason" aria-label="본인확인 사유">${Object.entries(PV_IDV).map(([k, l]) => `<option value="${k}" ${I && I.reason === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
  <small class="mini">일반 가입 · 수강에는 본인인증을 요구하지 않습니다. 켜도 해당 과정 수강 때만 학습자가 확인하고, 확인 결과(완료 여부)만 저장합니다.</small></div>`;
function pvIdvRead(w, A) { const on = !!fv(w, 'pv_idv'); const reason = fv(w, 'pv_idv_reason') || 'refund'; const was = !!(A.idv && A.idv.on); A.idv = { ...(A.idv || {}), on, reason }; if (was !== on) logAudit(`선택 본인확인 ${on ? '켬 — ' + PV_IDV[reason] : '끔'}`); }
ACT['pv-idv'] = () => { mbEnsure(); const A = S.settings.acct;
  modal('선택 본인확인', `<p class="mini">개인정보 최소 수집 원칙에 따라 가입 · 로그인 · 수강에는 본인인증을 쓰지 않습니다. 아래처럼 <b>법령상 본인확인이 필요한 경우에만</b> 켜세요.</p><ul class="mini"><li>고용보험 환급 과정(직업능력개발훈련 — 훈련생 본인 확인)</li><li>성인 인증이 필요한 콘텐츠(청소년 보호)</li><li>학점 인정 과정(학습자 본인 확인)</li></ul>${pvIdvBlock(A.idv)}`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { pvIdvRead(w, A); save(); render(); toast(`선택 본인확인을 ${A.idv.on ? '켰습니다' : '껐습니다'}.`, 'ok'); } }]); };

/* ── 설정 › 서비스: 개인정보 보호 카드 ── */
{ const base = VIEWS.settings; VIEWS.settings = () => { const h = base(); if ((UI.settings || 'menu') !== 'service' || !S.settings.acct) return h; const A = S.settings.acct; const U = mbUniv();
  return h + `<div class="card mb-card pv-card"><div class="ch"><b>개인정보 보호</b><small>최소 수집 · 분리 보관 · 열람 기록</small><span class="sp"></span>${U ? '' : `<button class="btn sm" data-act="pv-idv">선택 본인확인 ${A.idv && A.idv.on ? '켜짐' : '꺼짐'}</button>`}<button class="btn sm ghost" data-act="pv-log">처리 기록</button></div>
    <div class="mb-kv"><span><small>가입 때 받는 정보</small><b>${U ? '학번 · 학과 · 닉네임' : '로그인 수단(SNS 식별자 또는 이메일) · 닉네임'}</b></span><span><small>받지 않는 정보</small><b>${U ? '이름 · 연락처 · 이메일' : '실명 · 휴대폰 · 생년월일 · 성별'}</b></span><span><small>필요할 때만</small><b>${U ? '— (학교 SSO 연동 예정)' : '휴대폰(알림톡) · 이름(수료증 · 환불)'}</b></span><span><small>보관</small><b>학습 데이터와 분리 · 암호화</b></span><span><small>본인인증(PASS)</small><b>${A.idv && A.idv.on ? '선택 사용 — ' + esc(PV_IDV[A.idv.reason] || '') : '사용 안 함'}</b></span><span><small>탈퇴 시</small><b>개인정보 즉시 삭제 · 학습 기록 가명 보관</b></span></div>
    <p class="mini">운영자 화면에는 닉네임과 일부를 가린 이메일만 보입니다. 수료증 · 환불처럼 원문이 필요하면 회원 상세에서 목적을 고르고 열람하며, 그 기록이 남습니다.</p></div>`; }; }
ACT['pv-log'] = () => { const v = pvVault(); const nm = sid => { const m = S.members.find(x => x.sid === sid) || (S.pacct || []).find(x => x.sid === sid); return m ? (m.nick || m.name) : sid ? '탈퇴 · 미반영 회원' : '—'; };
  const A = { create: '수집', update: '입력 · 변경', view: '열람', erase: '삭제', delete: '완전 삭제', consent: '보호자 동의', idv: '본인확인', list_masked: '목록 조회' };
  const L = ((v && v.log) || []).slice(0, 100);
  modal('개인정보 처리 기록', `<p class="mini">수집 · 열람 · 삭제가 일어날 때마다 남는 기록입니다(값은 기록하지 않음). 운영: GET /api/learners/pii-log</p>${L.length ? `<div class="tblw"><table class="tbl"><thead><tr><th>일시</th><th>누가</th><th>처리</th><th>대상</th><th>목적</th><th>항목</th></tr></thead><tbody>${L.map(x => `<tr><td>${esc(String(x.at || '').slice(0, 16).replace('T', ' '))}</td><td>${esc(x.actor === 'self' ? '본인' : x.actor || '')}</td><td>${esc(A[x.action] || x.action)}</td><td>${esc(nm(x.sid))}</td><td>${esc(x.purpose || '')}</td><td>${esc((x.fields || []).join(', '))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">기록이 없습니다.</p>'}`, [{ id: 'c', label: '닫기' }], true); };

/* ── 회원 목록: 이메일 · 연락처 열 → 가린 이메일 · 알림톡 ── */
{ const base = mbList; mbList = (...a) => base(...a).replace('정회원 · 준회원(본인인증 전) · 승인 대기', '정회원 · 승인 대기 · 가입 때 실명 · 휴대폰 미수집').replace('<button class="btn sm" data-act="mb-vreq">본인인증 안내</button>', ''); }
AFTER.push(() => { try { if (!S || !S.members || mbUniv()) return; const tb = [...document.querySelectorAll('#main table')].find(t => [...t.querySelectorAll('th')].some(th => th.textContent === '이메일') && t.querySelector('a[data-act=mem-open]')); if (!tb) return;
  tb.querySelectorAll('th').forEach(th => { if (th.textContent === '이메일') th.textContent = '이메일(일부)'; if (th.textContent === '연락처') th.textContent = '알림톡'; });
  tb.querySelectorAll('tbody tr').forEach(tr => { const a = tr.querySelector('a[data-act=mem-open]'); const m = a && M(a.dataset.v); if (!m || !tr.children[3]) return; if (!m.email && m.acct && m.acct.emailMask) tr.children[2].textContent = m.acct.emailMask; if (!m.phone) tr.children[3].textContent = m.acct && m.acct.alimtalk ? '수신' : '—'; }); } catch (e) { console.error(e); } });

/* ── 회원 상세: 본인인증 → 선택 본인확인, 개인정보 카드(목적 열람) ── */
{ const base = memberDetail; memberDetail = m => { let h = base(m); if ((UI.memT || 'info') !== 'info' || !m) return h; const a = m.acct || {}; const U = mbUniv(); const A = S.settings.acct || {};
  h = h.replace(/<span><small>본인인증<\/small><b>[^<]*<\/b><\/span>/, A.idv && A.idv.on ? `<span><small>선택 본인확인</small><b>${a.idv && a.idv.ok ? '완료' : '미확인'}</b></span>` : '');
  if (!a.login || a.manual || U) return h;
  const card = `<div class="card mb-card pv-card"><div class="ch"><b>개인정보</b><small>운영자 화면에는 원문을 표시하지 않습니다</small><span class="sp"></span>${S.me && S.me.role === 'owner' ? `<button class="btn sm" data-act="pv-view" data-v="${m.id}">목적을 밝히고 열람</button>` : ''}</div>
    <div class="mb-kv"><span><small>이메일</small><b>${esc(m.email ? m.email : a.emailMask || (a.login && a.login !== 'email' ? MB_LOGIN[a.login] + ' 가입(이메일 없음)' : '—'))}</b></span><span><small>이름</small><b>${a.pii && a.pii.name ? '보관(수료증 · 환불용)' : m.email ? esc(m.name) : '수집 안 함'}</b></span><span><small>휴대폰</small><b>${a.alimtalk ? '알림톡 수신(번호 비공개)' : m.phone ? esc(m.phone) : '수집 안 함'}</b></span><span><small>보호자 동의</small><b>${a.minor ? '동의 완료(링크 동의)' : '해당 없음'}</b></span>${a.withdrawn ? `<span><small>탈퇴</small><b>${esc(a.withdrawn)} — 개인정보 삭제됨</b></span>` : ''}</div></div>`;
  return h.includes('<div class="danger">') ? h.replace('<div class="danger">', card + '<div class="danger">') : h + card; }; }
ACT['pv-view'] = el => { const m = M(el.dataset.v); if (!m) return; if (!S.me || S.me.role !== 'owner') { toast('정운영자만 개인정보를 열람할 수 있습니다.', 'warn'); return; }
  modal('개인정보 열람', `<p class="mini"><b>${esc(m.nick || m.name)}</b> 회원의 개인정보를 열람합니다. 목적과 항목을 고르면 열람 기록이 남고, 학습자 본인도 처리 기록에서 확인할 수 있습니다.</p><div class="form2"><label>항목<select name="f"><option value="name">이름</option><option value="email">이메일</option><option value="phone">휴대폰</option></select></label><label>목적<select name="p">${Object.entries(PV_PURPOSE).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label></div>`,
    [{ id: 'c', label: '취소' }, { id: 'ok', label: '열람', kind: 'pri', run: w => { const f = fv(w, 'f'), p = fv(w, 'p'); const v = pvVault(); const rec = v && v.ids[m.sid];
      /* 운영: const r = await api('POST', '/api/learners/pii', { learner_id, field: f, purpose: p }) */
      const val = rec ? rec[f] || '' : ''; if (v) { v.log = v.log || []; v.log.unshift({ at: new Date().toISOString(), actor: 'admin:' + (S.me.name || ''), action: 'view', sid: m.sid, purpose: p, fields: [f] }); pvVaultSave(v); }
      logAudit(`개인정보 열람 — ${m.nick || m.name} · ${({ name: '이름', email: '이메일', phone: '휴대폰' })[f]} · ${PV_PURPOSE[p]}`); save();
      setTimeout(() => modal('개인정보 열람 결과', `<p>${esc(({ name: '이름', email: '이메일', phone: '휴대폰' })[f])}: <b>${esc(val || '보관하지 않음')}</b></p><p class="mini">목적: ${esc(PV_PURPOSE[p])} · 목적 외 사용 · 저장 · 전달 금지. 데모는 이 브라우저의 분리 저장소에서 읽습니다.</p>`, [{ id: 'c', label: '닫기' }]), 0); } }]); };

/* ── 학습자 → 운영자 큐 ── */
{ const base = LPX['acct-join']; LPX['acct-join'] = x => { mbEnsure(); const d = { ...(x.data || {}) }; const U = mbUniv(); const iv = d.token ? S.invites.find(i => i.token === d.token && i.active) : null;
  ['email', 'phone', 'name', 'pw'].forEach(k => { if (d[k] && !d.legacy) delete d[k]; }); const g = d.guardian; delete d.guardian;
  if (d.kind === 'parent') { if (!d.sid || S.pacct.some(p => p.sid === d.sid)) return; const pa = { id: uid('pa'), sid: d.sid, name: String(d.nick || '').slice(0, 20), nick: String(d.nick || '').slice(0, 20), phone: '', email: '', emailMask: String(d.emailMask || '').slice(0, 80), login: d.login || 'email', pw: '', verified: false, joined: today(), links: [d.login || 'email'] }; S.pacct.push(pa);
    if (iv) iv.uses++; logAudit(`보호자 계정 가입 — ${pa.nick}`); toast(`보호자 계정 가입 1건 — ${pa.nick}`, 'ok'); return; }
  base({ ...x, data: d }); const m = mbBySid(d.sid); if (!m) return; m.acct = m.acct || {};
  if (!U) { m.email = ''; m.phone = ''; m.acct.email = ''; m.acct.phone = ''; m.name = String(d.nick || m.name || '').slice(0, 20); m.acct.emailMask = String(d.emailMask || '').slice(0, 80); }
  m.acct.pw = ''; m.acct.verified = false; m.acct.guardian = d.minor ? { consent: '보호자 링크 동의', at: (g && g.at) || x.at } : null; m.acct.pii = { name: false, phone: false }; m.acct.alimtalk = false; if (m.grade === '준회원') m.grade = '정회원'; }; }
{ const base = LPX['acct-profile']; LPX['acct-profile'] = x => { const d = x.data || {}; const m = mbBySid(d.sid || x.who); const p = !m && (S.pacct || []).find(y => y.sid === (d.sid || x.who));
  if (m) { m.acct = m.acct || {}; if (typeof d.alimtalk === 'boolean') { m.acct.alimtalk = d.alimtalk; logAudit(`알림톡 수신 ${d.alimtalk ? '등록' : '해제'} — ${m.nick || m.name}`); } if (d.piiHas) m.acct.pii = { ...(m.acct.pii || {}), ...d.piiHas }; if (d.pwSet) m.acct.pwSet = true; }
  if (p && typeof d.alimtalk === 'boolean') p.alimtalk = d.alimtalk;
  const rest = { ...d }; ['alimtalk', 'piiHas', 'pwSet', 'phone'].forEach(k => delete rest[k]); if (Object.keys(rest).some(k => k !== 'sid')) base({ ...x, data: rest }); }; }
LPX['acct-idv'] = x => { const d = x.data || {}; const m = mbBySid(d.sid || x.who); if (!m) return; m.acct = m.acct || {}; m.acct.idv = { ok: true, at: today(), reason: String(d.reason || '') }; logAudit(`선택 본인확인 완료 — ${m.nick || m.name}`); };
{ const base = LPX['acct-del']; LPX['acct-del'] = x => { const d = x.data || {}; const m = mbBySid(d.sid || x.who);
  if (!m) return base(x); /* 보호자 계정 등은 기존 처리(삭제) */
  const nick = m.nick || m.name; Object.assign(m, { name: mbUniv() ? m.name : '탈퇴 회원', nick: '탈퇴 회원', email: '', phone: '', extra: {}, withdrawn: today() }); m.acct = { login: (m.acct && m.acct.login) || 'email', withdrawn: today() };
  (S.parents || []).forEach(p => { if (p.child === m.id && p.status !== '거절') p.status = '거절'; }); if (S.inbox) delete S.inbox[m.id];
  logAudit(`회원 탈퇴 — ${nick}${d.reason ? ' · ' + d.reason : ''} (개인정보 삭제 · 학습 기록 가명 보관)`); toast(`회원 탈퇴 1건 — 학습 기록은 '탈퇴 회원'으로 보관합니다.`); }; }
{ const base = LPX['fam-req']; LPX['fam-req'] = x => { const d = x.data || {}; if (!d.code) return base(x); const code = String(d.code).toUpperCase();
  if (d.from === 'parent') { const pa = S.pacct.find(y => y.sid === (d.sid || x.who)); const ch = S.members.find(m => m.sid && !m.withdrawn && pvFam(m.sid) === code); if (!pa || !ch || S.parents.some(p => p.child === ch.id && p.acct === pa.id && p.status !== '거절')) return;
    S.parents.push({ id: uid('p'), child: ch.id, name: pa.nick || pa.name, phone: '', rel: d.rel || '보호자', status: '연결 요청', by: 'parent', at: today(), acct: pa.id }); mbInbox(ch.id, '가족 연결 요청', `${pa.nick || pa.name}님이 보호자로 연결을 요청했습니다. 가족 메뉴에서 수락하거나 거절하세요.`, { href: '#family' }); logAudit(`가족 연결 요청(보호자 · 연결 코드) — ${pa.nick || pa.name} → ${ch.nick || ch.name}`); return; }
  const ch = mbBySid(d.sid || x.who); const pa = S.pacct.find(y => y.sid && pvFam(y.sid) === code); if (!ch || !pa || S.parents.some(p => p.child === ch.id && p.acct === pa.id && p.status !== '거절')) return;
  S.parents.push({ id: uid('p'), child: ch.id, name: pa.nick || pa.name, phone: '', rel: d.rel || '보호자', status: '연결 요청', by: 'child', at: today(), acct: pa.id }); mbInbox(pa.id, '가족 연결 요청', `${ch.nick || ch.name}님이 가족 연결을 요청했습니다.`, { href: '#family' }); logAudit(`가족 연결 요청(${t('learner')} · 연결 코드) — ${ch.nick || ch.name}`); }; }

/* ── 학습자 스냅샷: 선택 본인확인 설정 공개(검증 조건은 내보내지 않음) ── */
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { if (r && r.acct && S.settings.acct) { const I = S.settings.acct.idv || {}; r.acct.verify = false; r.acct.social = (r.acct.social || []).filter(k => k !== 'facebook'); r.acct.idv = { on: !!I.on, reason: I.reason || 'refund' }; } } catch (e) { console.error(e); } return r; }; }
