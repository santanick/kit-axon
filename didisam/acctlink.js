/* v38 acctlink — 운영자가 등록한 사람(원생 · 보호자 · 직원 · 학생)과 실제 가입 계정을 하나로 잇는다(QA K1~K6 · C2 · C3 · C12).
   ① 개인 초대 토큰: 아직 가입하지 않은 등록 행(회원 · 보호자)마다 itok을 둔다. #join/<itok>로 가입하면 새 행을 만들지 않고 그 행에 계정을 붙인다.
   ② 토큰이 없어도: 가입 이메일이 등록 회원 이메일과 같거나(증명 k = mbSid(이메일)), 만 14세 미만 보호자 연락처가 원생 등록의 보호자 연락처와 같으면 그 행에 붙인다.
   ③ 이미 생긴 중복은 회원 상세 · 원생 카드의 [같은 사람 합치기]로 정리한다(학습 · 출결 · 청구 · 알림 기록을 모두 옮김).
   ④ 보호자: 메시지 · 출결 알림을 보호자 계정 알림함으로, 보호자 계정이 원생 목록에 생기지 않게, 보호자 질문은 「○○ 보호자」로.
   개인정보는 늘리지 않는다 — 대학(학번 · 학과)은 대상이 아니고, 학습자 → 운영자 큐에는 토큰 · 증명값만 온다. 운영: 같은 이벤트를 /api/pub/<tid>/signup이 token과 함께 보낸다. */
'use strict';
(function () {
  const dig = p => String(p || '').replace(/\D/g, '');
  const free = m => !!m && !m.withdrawn && m.src !== 'manual' && (!m.acct || !m.acct.consent); /* 일괄 등록 행은 acct가 있어도 가입(동의) 전이면 미연결 */
  const pfree = p => !!p && !p.acct && p.status !== '거절';
  const gk = s => 'g' + mbHash('gp|' + s).slice(0, 12);
  const url = tok => `${mbLURL()}#join/${tok}`;
  window.alFree = free;
  window.alURL = url;

  /* ── 데이터 보정: 개인 초대 토큰 · 연락처 하이픈(K16) ── */
  function ensure() { if (!S || !S.org || !Array.isArray(S.members) || mbUniv()) return 0; let n = 0;
    S.members.forEach(m => { if (free(m)) { if (!m.itok) { m.itok = mbTok(); n++; } } else if (m.itok) { delete m.itok; n++; }
      if (m.phone && /^\d{10,11}$/.test(String(m.phone))) { m.phone = mbPhone(m.phone); n++; } });
    (S.parents || []).forEach(p => { if (p.phone) { const f = mbPhone(p.phone); if (f !== p.phone) { p.phone = f; n++; } } if (pfree(p)) { if (!p.itok) { p.itok = mbTok(); n++; } } else if (p.itok) { delete p.itok; n++; } });
    return n; }
  { const base = mbEnsure; mbEnsure = (...a) => { base(...a); try { ensure(); } catch (e) { console.error(e); } }; }

  /* ── 같은 사람 합치기: drop을 가리키는 모든 기록을 keep으로 옮긴다 ── */
  function walk(o, a, b, seen) { if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
    if (Array.isArray(o)) { let ch = false; for (let i = 0; i < o.length; i++) { if (o[i] === b) { o[i] = a; ch = true; } else walk(o[i], a, b, seen); }
      if (ch && o.every(x => typeof x === 'string')) { const u = [...new Set(o)]; o.length = 0; o.push(...u); } return; }
    for (const k of Object.keys(o)) { const v = o[k];
      const nk = k === b ? a : k.startsWith(b + ':') ? a + k.slice(b.length) : k;
      if (v === b) o[k] = a; else walk(v, a, b, seen);
      if (nk !== k) { const cur = o[nk]; if (cur == null) o[nk] = o[k]; else if (Array.isArray(cur) && Array.isArray(o[k])) o[nk] = [...cur, ...o[k]]; else if (typeof cur === 'object' && typeof o[k] === 'object') { const x = o[k]; o[nk] = { ...x, ...cur }; if ('p' in x && 'p' in cur) o[nk].p = Math.max(+x.p || 0, +cur.p || 0); } delete o[k]; } } }
  function merge(keepId, dropId) { const K = M(keepId), D = M(dropId); if (!K || !D || K === D) return '합칠 회원을 찾지 못했습니다.';
    const ka = !free(K) && K.acct && K.acct.consent, da = !free(D) && D.acct && D.acct.consent; if (ka && da) return '두 회원 모두 가입한 계정이 있어 합칠 수 없습니다. 한쪽 계정을 탈퇴 처리한 뒤 합치세요.';
    const reg = K; /* 남는 행 = 운영자가 고른 행. 가입한 쪽의 계정 · 등록한 쪽의 정보를 모은다 */
    const seen = new Set([S.members]); Object.keys(S).forEach(k => { if (k !== 'members' && k !== 'chat' && k !== 'audit') walk(S[k], reg.id, D.id, seen); });
    if (da) { reg.sid = D.sid; reg.acct = { ...(D.acct || {}), linked: { by: 'merge', at: today() } }; if (D.nick) reg.nick = D.nick; if (D.last && (!reg.last || D.last > reg.last)) reg.last = D.last; }
    else if (ka) { reg.acct = { ...reg.acct, linked: { by: 'merge', at: today() } }; if (free(D)) { ['name', 'phone', 'email'].forEach(k => { if (D[k]) reg[k] = D[k]; }); if (D.crm) reg.crm = D.crm; if (D.group) reg.group = D.group; } }
    if (!reg.group && D.group) reg.group = D.group; reg.extra = { ...(D.extra || {}), ...(reg.extra || {}) }; if (D.grade === '정회원' || reg.grade === '정회원') reg.grade = '정회원';
    if (D.diag && !reg.diag) reg.diag = D.diag; delete reg.itok;
    S.members = S.members.filter(m => m !== D); (S.parents || []).forEach(p => { if (p.child === reg.id) mbParSync(reg.id); });
    if (S.inbox && S.inbox[reg.id]) S.inbox[reg.id] = S.inbox[reg.id].slice(0, 200);
    logAudit(`같은 사람 합치기 — ${reg.name || reg.sid} ← ${D.nick || D.name || D.sid}`); ensure(); return ''; }
  window.alMerge = merge;
  const core = s => String(s || '').replace(/^\[샘플\]\s*/, '').replace(/(님|이)$/, '').trim();
  /* 같은 사람으로 보이는 쌍: 가입 전 등록 행 R과 가입 계정 A의 이름이 같거나 A 닉네임이 R 이름 끝과 같음(민준이 ↔ 박민준) */
  function dupPairs() { const R = S.members.filter(free), A = S.members.filter(m => !free(m) && !m.withdrawn && m.acct && m.acct.consent && m.acct.linked == null && !m.acct.manual);
    const out = []; A.forEach(a => { const n = core(a.nick || a.name); if (n.length < 2) return; const r = R.filter(x => { const rn = core(x.name); return rn === n || (rn.length > n.length && rn.endsWith(n)); }); if (r.length === 1) out.push([r[0], a]); }); return out; }
  window.alDupPairs = dupPairs;

  ACT['al-merge'] = el => { mbEnsure(); const m = M(el.dataset.v); if (!m) return; const P = dupPairs().filter(([r, a]) => r === m || a === m).map(([r, a]) => r === m ? a : r);
    const L = S.members.filter(x => x !== m && !x.withdrawn).sort((x, y) => (P.includes(y) ? 1 : 0) - (P.includes(x) ? 1 : 0)).slice(0, 300);
    const lab = x => `${esc(x.name || x.sid)}${x.nick && x.nick !== x.name ? ` <small class="mini">${esc(x.nick)}</small>` : ''} <small class="mini">${free(x) ? '가입 전(등록만)' : '가입한 계정'}${x.joined ? ' · ' + esc(x.joined) : ''}</small>${P.includes(x) ? ' ' + tag('같은 사람 같음', 'y') : ''}`;
    modal('같은 사람 합치기', `<p class="mini"><b>${esc(m.name || m.sid)}</b>${free(m) ? '(가입 전 등록 행)' : '(가입한 계정)'}에 아래에서 고른 회원을 합칩니다. 등록 정보(이름 · 연락처 · 반 · 부서)는 이 회원 것을 남기고, 계정 · 수업 · 진도 · 출결 · 청구서 · 알림 · 보호자 연결은 하나로 모읍니다. 되돌릴 수 없습니다.</p><input type="search" id="mbAq" placeholder="이름 · 닉네임 검색" aria-label="검색"><div class="mb-pick al-pick">${L.map(x => `<label class="ckl" data-k="${esc(((x.name || '') + ' ' + (x.nick || '') + ' ' + (x.sid || '')).toLowerCase())}"><input type="radio" name="d" value="${x.id}" ${P[0] === x ? 'checked' : ''}> ${lab(x)}</label>`).join('') || '<div class="empty">합칠 회원이 없습니다.</div>'}</div>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '합치기', kind: 'pri', run: w => { const d = (w.querySelector('[name=d]:checked') || {}).value; if (!d) { toast('합칠 회원을 고르세요.', 'warn'); return false; } const e = merge(m.id, d); if (e) { toast(e, 'warn'); return false; } save(); render(); toast('같은 사람으로 합쳤습니다. 청구서 · 출결 · 학습 기록이 한 사람으로 모였습니다.', 'ok'); } }], true); };

  /* ── 개인 초대 링크 복사 · 보내기 ── */
  const copy = (u, msg) => (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast(msg || '초대 링크를 복사했습니다. 문자 · 카카오톡으로 보내 주세요.', 'ok'), () => { modal('초대 링크', `<label class="fl">링크<input readonly value="${esc(u)}" onfocus="this.select()"></label>`, [{ id: 'c', label: '닫기' }]); });
  ACT['al-inv'] = el => { mbEnsure(); const k = el.dataset.k || 'm'; const x = k === 'p' ? (S.parents || []).find(p => p.id === el.dataset.v) : M(el.dataset.v); if (!x || !x.itok) { toast('이미 가입해 연결된 사람입니다.', 'warn'); return; }
    S.inviteSent.unshift({ at: nowStr(), ch: '개인 초대 링크', kind: k === 'p' ? '보호자 초대' : '개인 초대', name: x.name || '', to: x.phone || x.email || '' }); logAudit(`개인 초대 링크 — ${x.name || ''}`); save(); copy(url(x.itok)); };
  ACT['al-invall'] = () => { mbEnsure(); const L = S.members.filter(free); if (!L.length) { toast('가입 전인 등록 회원이 없습니다.', 'warn'); return; }
    S.inviteSent.unshift({ at: nowStr(), ch: '알림톡 · 이메일', kind: '개인 초대 링크 일괄', n: L.length }); logAudit(`개인 초대 링크 일괄 발송 ${L.length}명`); save(); render();
    toast(`${L.length}명에게 각자의 초대 링크를 보냈습니다(데모 — 운영: 알림톡 · 이메일). 링크로 가입하면 등록한 정보에 바로 연결됩니다.`, 'ok'); };
  ACT['al-invxls'] = () => { mbEnsure(); const L = S.members.filter(free); downloadCSV(`개인초대링크_${today()}.csv`, ['이름', t('group'), '이메일', '연락처', '초대 링크'], L.map(m => [m.name || '', gn(m.group) || '', m.email || '', m.phone || '', url(m.itok)])); };

  /* ── 회원 상세: 가입 연결 카드 ── */
  { const base = memberDetail; memberDetail = m => { let h = base(m); try { if ((UI.memT || 'info') !== 'info' || !m || mbUniv()) return h; mbEnsure();
    const f = free(m); const card = `<div class="card mb-card al-card"><div class="ch"><b>가입 연결</b><small>${f ? '아직 가입하지 않았습니다 — 개인 초대 링크로 가입하면 이 정보에 바로 연결됩니다' : m.acct && m.acct.linked ? `가입 계정 연결됨 · ${esc({ invite: '개인 초대 링크', email: '같은 이메일', gphone: '보호자 연락처', merge: '같은 사람 합치기' }[m.acct.linked.by] || '')}` : '가입한 계정'}</small><span class="sp"></span>${f ? `<button class="btn sm pri" data-act="al-inv" data-v="${m.id}">개인 초대 링크 복사</button>` : ''}<button class="btn sm" data-act="al-merge" data-v="${m.id}">같은 사람 합치기</button></div></div>`;
    return h.includes('<div class="danger">') ? h.replace('<div class="danger">', card + '<div class="danger">') : h + card; } catch (e) { console.error(e); return h; } }; }

  /* ── 회원 목록: 가입 전 · 중복 안내, 일괄 등록 버튼 이름 통일(C12) ── */
  { const base = mbList; mbList = (...a) => { let h = base(...a); try { if (mbUniv()) return h; mbEnsure(); h = h.replace('<button class="btn" data-act="mem-bulk">일괄 가입</button>', '<button class="btn" data-act="mem-bulk">엑셀 일괄 등록</button>');
    const nf = S.members.filter(free).length, D = dupPairs();
    const note = (nf ? `<div class="mb-note al-note"><b>가입 전 ${nf}명</b> <span style="flex:1 1 240px;min-width:0;white-space:normal">등록만 하고 아직 가입하지 않았습니다. 각자의 초대 링크로 가입하면 등록한 정보(${esc(t('group'))} · 연락처)에 바로 연결됩니다.</span> <button class="btn sm pri" data-act="al-invall">개인 초대 링크 보내기</button><button class="btn sm" data-act="al-invxls">링크 목록 내려받기</button></div>` : '')
      + (D.length ? `<div class="mb-note y al-dup"><b>같은 사람으로 보이는 회원 ${D.length}쌍</b> <span style="flex:1 1 240px;min-width:0;white-space:normal">${D.slice(0, 3).map(([r, x]) => `${esc(r.name)} ↔ ${esc(x.nick || x.name)}`).join(', ')}${D.length > 3 ? ' …' : ''} — 합치면 계정 · 수업 · 기록이 한 사람으로 모입니다.</span> <button class="btn sm" data-act="al-merge" data-v="${D[0][0].id}">합치기</button></div>` : '');
    const i = h.indexOf('<div class="seg2" role="tablist">'); return note && i > 0 ? h.slice(0, i) + note + h.slice(i) : h + note; } catch (e) { console.error(e); return h; } }; }
  /* 학원 원생 목록(k12): 같은 원생이 둘로 나뉜 경우 안내 */
  if (VIEWS.crmstu) { const base = VIEWS.crmstu; VIEWS.crmstu = (...a) => { const h = base(...a); try { if (UI.crmId) return h; const D = dupPairs(); if (!D.length) return h;
    const note = `<div class="mb-note y al-dup"><b>같은 원생으로 보이는 기록 ${D.length}쌍</b> <span style="flex:1 1 240px;min-width:0;white-space:normal">${D.slice(0, 3).map(([r, x]) => `${esc(r.name)}(등록) ↔ ${esc(x.nick || x.name)}(가입)`).join(', ')} — 합치면 청구서 · 출결 · 학습 기록이 한 명으로 모입니다.</span> <button class="btn sm pri" data-act="al-merge" data-v="${D[0][0].id}">합치기</button></div>`;
    const i = h.indexOf('<div class="ph">'); const j = i >= 0 ? h.indexOf('</div></div>', i) : -1; return j > 0 ? h.slice(0, j + 12) + note + h.slice(j + 12) : note + h; } catch (e) { console.error(e); return h; } }; }
  /* 일괄 등록 직후: '초대 링크를 따로 보내세요' 대신 개인 초대 링크 보내기를 바로 */
  { const base = ACT['mb-bulkrun']; if (base) ACT['mb-bulkrun'] = el => { const n0 = S.members.length; let tries = 0; base(el); const wait = () => { if ((S.members.length === n0 || $('#modal .mbk')) && tries++ < 600) return setTimeout(wait, 120); if (S.members.length === n0) return; mbEnsure(); save();
    const n = S.members.filter(free).length; modal('등록 완료 — 로그인 안내', `<p>${(S.members.length - n0).toLocaleString()}명을 등록했습니다. 한 사람마다 개인 초대 링크가 만들어졌습니다. 링크로 가입하면 등록한 이메일 · ${esc(t('group'))}에 바로 연결되고, 따로 승인할 필요가 없습니다.</p><p class="mini">공용 초대 링크로 가입해도 등록한 이메일과 같으면 자동으로 연결됩니다.</p>`, [{ id: 'c', label: '나중에' }, { id: 'x', label: '링크 목록 내려받기', run: () => ACT['al-invxls']() }, { id: 'ok', label: `${n.toLocaleString()}명에게 보내기`, kind: 'pri', run: () => ACT['al-invall']() }]); }; setTimeout(wait, 120); }; }

  /* ── 초대 링크 생성 창: 기업 · 공공은 부서(소속) 지정(C3) ── */
  const grpOn = () => ['corp', 'public'].includes(S?.org?.type) && (UI.mbInvT || 'student') === 'student' && (S.groups || []).some(g => g.id === UI.mbInvG);
  { const base = mbInvite; mbInvite = (target, cls, role) => { if (target === 'student' && grpOn()) { let o = S.invites.find(i => i.active && i.target === 'student' && (i.cls || '') === (cls || '') && i.grp === UI.mbInvG); if (!o) { o = { id: uid('iv'), token: mbTok(), target: 'student', cls: cls || '', grp: UI.mbInvG, role: '', uses: 0, active: true, at: today() }; S.invites.push(o); save(); } return o; }
    const iv = S.invites.find(i => i.active && i.target === target && (i.cls || '') === (cls || '') && !i.grp && (target !== 'admin' || i.role === role)); if (iv) return iv; if (!S.invites.some(i => i.grp)) return base(target, cls, role); const n = { id: uid('iv'), token: mbTok(), target, cls: cls || '', role: target === 'admin' ? role || 'sub' : '', uses: 0, active: true, at: today() }; S.invites.push(n); save(); return n; }; }
  { const base = mbLinkPanel; mbLinkPanel = (...a) => { const h = base(...a); try { if (!['corp', 'public'].includes(S.org.type) || (UI.mbInvT || 'student') !== 'student' || !S.groups.length) return h; const g = grpOn() ? UI.mbInvG : '';
    return h.replace('</div>', `<label>가입과 함께 ${esc(t('group'))}(선택)<select data-chg="mb-invset" data-k="mbInvG"><option value="">지정 안 함</option>${S.groups.map(x => `<option value="${x.id}" ${g === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>`); } catch (e) { console.error(e); return h; } }; }

  /* ── 학습자 가입(LPX acct-join) — 등록 행에 계정을 붙인다 ── */
  function legal(m) { if (!['corp', 'public'].includes(S.org.type) || m.grade === '승인 대기') return; S.classes.filter(c => c.legal && c.status !== '종료').forEach(c => { if (c.learners.includes(m.id)) return; c.learners.push(m.id); c.prog = c.prog || {}; c.prog[m.id] = c.prog[m.id] || { p: 0, exam: null, assign: 'none', att: 0 }; if (c.enr) c.enr[m.id] = { at: today(), end: c.end || null, src: 'auto-legal', status: 'active', paid: null }; }); }
  function target(d) {
    if (d.token) { const m = S.members.find(x => x.itok === d.token && free(x)); if (m) return [m, 'invite']; }
    const L = d.link; if (L && L.mid) { const m = M(L.mid); if (free(m)) {
      if (L.by === 'email' && m.email && mbSid(String(m.email).toLowerCase()) === L.k) return [m, 'email'];
      if (L.by === 'gphone' && (S.parents || []).some(p => p.child === m.id && dig(p.phone) && gk(dig(p.phone)) === L.k)) return [m, 'gphone']; } }
    return null; }
  function parentJoin(x, base) { const d = x.data || {}; const prow = d.token ? (S.parents || []).find(p => p.itok === d.token && pfree(p)) : null;
    base(x); const pa = (S.pacct || []).find(p => p.sid === d.sid); if (!pa) return; const rows = [];
    if (prow) { rows.push(prow); const g = dig(prow.phone); if (g) S.parents.forEach(p => { if (p !== prow && pfree(p) && dig(p.phone) === g) rows.push(p); }); if (prow.name) pa.name = prow.name; }
    if (/^F[0-9A-Z]{6}$/.test(String(d.fam || ''))) { const ch = S.members.find(m => m.sid && !m.withdrawn && pvFam(m.sid) === d.fam);
      if (ch && !rows.some(p => p.child === ch.id) && !S.parents.some(p => p.child === ch.id && p.acct === pa.id)) { const r0 = S.parents.find(p => p.child === ch.id && pfree(p)); if (r0) rows.push(r0); else { const r = { id: uid('p'), child: ch.id, name: pa.nick || pa.name, phone: '', rel: ['모', '부', '조부모', '기타 보호자'].includes(d.rel) ? d.rel : '보호자', status: '연결 요청', by: 'guardian', at: today(), acct: '' }; S.parents.push(r); rows.push(r); } } }
    rows.forEach(p => { p.acct = pa.id; p.status = '연결 완료'; p.resAt = today(); delete p.itok; mbParSync(p.child); const cn = (M(p.child) || {}).name || '';
      mbInbox(p.child, '가족이 연결되었습니다', `${p.name || pa.nick}님과 연결되었습니다.`); mbInbox(pa.id, '가족이 연결되었습니다', `${cn}님과 연결되었습니다. 자녀의 수업 · 출결 · 청구서를 확인할 수 있습니다.`, { href: '#family', child: cn }); });
    if (rows.length) logAudit(`보호자 계정 연결 — ${pa.name} · 자녀 ${rows.length}명(${prow ? '개인 초대 링크' : '보호자 동의'})`); }
  { const base = LPX['acct-join']; LPX['acct-join'] = x => { mbEnsure(); const d = x.data || {};
    if (d.kind === 'parent') return parentJoin(x, base);
    const iv = d.token ? S.invites.find(i => i.token === d.token && i.active) : null;
    const T = !mbUniv() && target(d);
    if (!T) { base(x); const m = mbBySid(d.sid); if (m && iv && iv.grp && !m.group && S.groups.some(g => g.id === iv.grp)) m.group = iv.grp; ensure(); return; }
    const [R, by] = T; const prev = mbBySid(d.sid); if (prev && prev !== R && !(prev.acct && prev.acct.consent)) merge(R.id, prev.id); /* 학습 기록 동기화가 먼저 만든 회원 */
    const keep = { name: R.name, email: R.email, phone: R.phone, group: R.group, extra: { ...(R.extra || {}) }, joined: R.joined, src: R.src || 'admin', grade: R.grade, crm: R.crm };
    R.sid0 = R.sid; R.sid = d.sid; delete R.acct; base(x); /* mem2 · privacy 처리(같은 sid의 행을 채움) */
    Object.assign(R, { name: keep.name || R.name, email: keep.email || '', phone: keep.phone || '', group: keep.group || R.group || '', extra: { ...keep.extra, ...(R.extra || {}) }, joined: keep.joined || R.joined, src: keep.src });
    if (keep.crm) R.crm = keep.crm; R.acct = { ...(R.acct || {}), linked: { by, at: today() } }; delete R.itok;
    if (R.grade === '승인 대기' && keep.grade !== '승인 대기') { R.grade = '정회원'; const L = (S.inbox || {})[R.id] || []; if (L[0] && /접수되었습니다/.test(L[0].title)) { L[0].title = `${S.org.name}에 오신 것을 환영합니다`; L[0].body = '등록된 정보로 가입이 연결되었습니다. 지금 바로 학습을 시작하세요.'; } }
    legal(R); logAudit(`가입 연결 — ${keep.name || R.nick} ← ${R.nick || ''} (${{ invite: '개인 초대 링크', email: '같은 이메일', gphone: '보호자 연락처' }[by]})`); toast(`등록된 ${keep.name || ''} 회원에 가입 계정을 연결했습니다.`, 'ok'); }; }

  /* ── 보호자 계정이 원생 · 회원으로 생기지 않게(K5), 보호자 질문은 「○○ 보호자」로 ── */
  const paOf = sid => sid && (S.pacct || []).find(p => p.sid === sid);
  { const base = cmWho; cmWho = who => paOf(who) ? null : base(who); }
  { const base = LPX['msg-ask']; LPX['msg-ask'] = x => { const pa = paOf(x.who); if (!pa) return base(x); const d = x.data || {}; const body = samMask(String(d.body || '').trim().slice(0, 1000)).text; if (!body) return;
    if (typeof tqEnsure === 'function') tqEnsure(); S.tq = Array.isArray(S.tq) ? S.tq : []; const id = String(d.id || uid('qa')).slice(0, 24); if (S.tq.some(y => y.id === id)) return;
    const kids = (S.parents || []).filter(p => p.acct === pa.id && p.status === '연결 완료').map(p => (M(p.child) || {}).name).filter(Boolean);
    S.tq.unshift({ id, mid: '', pa: pa.id, sid: `${pa.name || pa.nick || ''} 보호자${kids.length ? `(${kids.join(' · ')})` : ''}`.trim(), q: body, cls: '', cid: '', item: '', where: '보호자 질문', src: '메시지', st: 'open', at: nowStr() });
    mbTnoti('', 'ask', '보호자 질문', body.slice(0, 120), { tq: id }); logAudit(`보호자 질문 접수 — ${pa.name || pa.nick}`); }; }
  { const base = ACT['tq-send']; if (base) ACT['tq-send'] = el => { const id = el.dataset.v || ''; base(el); try { const x = (S.tq || []).find(y => y.id === id); if (!x || !x.pa || x.st !== 'answered' || x.sentTo) return;
    mbInbox(x.pa, '[답변] 보낸 질문에 답했습니다', `Q. ${x.q}\n\nA. ${x.a}`, { from: S.org.name, ask: x.id }); x.sentTo = x.pa; save(); } catch (e) { console.error(e); } }; }
  { const base = lpApply; lpApply = (...a) => { const ps = new Set((S && S.pacct || []).map(p => p.sid)); const n = base(...a); try { if (ps.size) { const bad = S.members.filter(m => ps.has(m.sid) && !(m.acct && m.acct.consent)); if (bad.length) mbRemove(bad.map(m => m.id)); } } catch (e) { console.error(e); } return n; }; }

  /* ── 임시 비밀번호를 바꾸면 표시 해제(QA L14) ── */
  { const base = LPX['acct-pw']; LPX['acct-pw'] = x => { base(x); try { const d = x.data || {}; const m = S.members.find(y => y.sid === d.sid); if (m && m.acct && m.acct.pwTemp && (!x.who || x.who === d.sid)) delete m.acct.pwTemp; } catch (e) { console.error(e); } }; }
  /* ── 초대 링크에 강좌 권한: 유료 · 정원 경고, 가입 때 정원 검사(QA L10) ── */
  const capOf = c => +((c && c.recruit && c.recruit.cap) || (c && c.cap) || 0);
  const priceOf = c => { try { return typeof finalPrice === 'function' ? finalPrice(c) : +c.price || 0; } catch (e) { return +(c && c.price) || 0; } };
  window.alInvClsWarn = c => { if (!c) return ''; const W = []; const p = +c.price || 0; if (p > 0 && (typeof mbPayOn !== 'function' || mbPayOn())) W.push(`유료 ${esc(t('cls'))}(${Number(p).toLocaleString()}원)입니다 — 이 링크로 가입하면 결제 없이 수강 권한이 생깁니다.`); const cap = capOf(c), n = (c.learners || []).length; if (cap) W.push(n >= cap ? `정원 ${cap}명이 이미 찼습니다(${n}명) — 이 링크로 가입해도 수강 권한은 주지 않고 운영자에게 알립니다.` : `정원 ${cap}명 중 ${n}명 — 남은 ${cap - n}자리까지만 이 링크로 배정됩니다.`); return W.length ? `<p class="mb-note y al-clsw" role="status">${W.join('<br>')}</p>` : ''; };
  { const base = mbLinkPanel; mbLinkPanel = (...a) => { const h = base(...a); try { if ((UI.mbInvT || 'student') !== 'student' || !UI.mbInvC) return h; return h + window.alInvClsWarn(C(UI.mbInvC)); } catch (e) { console.error(e); return h; } }; }
  { const base = LPX['acct-join']; LPX['acct-join'] = x => { const d = x.data || {}; const iv = d.token ? S.invites.find(i => i.token === d.token && i.active && i.cls) : null; const c = iv && C(iv.cls); const cap = capOf(c); const full = !!(c && cap && (c.learners || []).length >= cap);
    base(x); if (!full) return; try { const m = mbBySid(d.sid); if (!m || !c.learners.includes(m.id)) return; c.learners = c.learners.filter(id => id !== m.id); if (c.prog) delete c.prog[m.id]; if (c.enr) delete c.enr[m.id];
      mbInbox(m.id, `「${c.name}」 정원이 찼습니다`, '가입은 완료되었습니다. 자리가 나면 운영자가 수강 권한을 드립니다.'); logAudit(`초대 링크 정원 초과 — ${c.name} · ${m.nick || m.name} 수강 권한 보류`); toast(`「${c.name}」 정원(${cap}명)이 차서 ${m.nick || m.name}님은 가입만 하고 수강 권한은 보류했습니다.`, 'warn'); } catch (e) { console.error(e); } }; }

  /* ── 메뉴 찾기 '가입'에서 가입 방식 설정을 바로(QA P14) ── */
  { const base = ACT['ux-find']; if (base) ACT['ux-find'] = (...a) => { const r = base(...a); try { const L = document.querySelector('#modal .uxfl'); if (L && !L.querySelector('[data-act="mb-acct"]') && S.me && S.me.role !== 'teacher') L.insertAdjacentHTML('afterbegin', `<button type="button" role="listitem" data-act="mb-acct" data-k="가입 방식 회원가입 가입 설정 초대 로그인 계정 간편가입"><b>가입 방식 · 계정 설정</b><small>${esc(t('learner'))} · 누구나 가입 / 초대받은 회원만 / 접근코드</small></button>`); } catch (e) { console.error(e); } return r; }; }

  /* ── 출결 · 수업 알림을 연결된 보호자 계정 알림함에도(K6) ── */
  if (typeof W2 === 'object' && W2.notify) { const base = W2.notify; W2.notify = (mids, title, body) => { const n = base(mids, title, body); try { [...new Set(mids)].forEach(mid => { const m = M(mid); if (!m) return; const txt = typeof body === 'function' ? body(m) : body;
    W2.parentsOf(mid).forEach(p => { if (p.acct) mbInbox(p.acct, title, txt, { child: m.name || m.nick || '' }); }); }); } catch (e) { console.error(e); } return n; }; }
})();
