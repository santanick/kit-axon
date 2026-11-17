/* v43.6 셀프러닝 노트 · AI 튜터(개발자 2, 시안 A2) — 대표님(2026-11-17) 「스스로 셀프러닝처럼 자기 노트 만들어가지고 관리하는 쪽으로 강화」
   이 파일(통합 명세 FINAL의 D2 몫) = S07 튜터 칩 · 답변 안 초안 카드(.ln-tdraft) → 「확인 · 고치기」는 st:'draft' 저장 후 개발자 1 편집 시트(초안 모드)로 ·
            S05 초안 모드 훅(LNOTE_AI.diffLines · orig · hint · suggestCards) · S08 퀴즈 결과 · 오답노트 자동 · S08b 오답노트 확인 ·
            S13 홈 「오늘의 셀프러닝」 · S20 영상으로 노트 만들기 시트. (#review 다시 라운드 · 끝 · 0장은 FINAL에서 개발자 1 몫)
   원칙
   - 데이터는 window.LNOTE API로만 쓴다(LR.lp.notes를 직접 고치지 않음). 튜터 · 자동 노트는 st:'draft'로 시작하고, 학습자가 한 줄 이상 고치고 「확인했어요」를 눌러야 ok.
   - 과제를 대신 써 주지 않는다: 「왜 틀렸을까요?」는 빈 칸으로 시작, 튜터 점검은 빠진 개념 · 다시 볼 시점만 짚는다.
   - 노트 · 카드에 이름 · 학번 · 연락처를 넣지 않는다. 대화는 저장하지 않으므로 칩으로만 초안을 만든다.
   - 연속 학습일 = LR.lp.days(LR.api.save가 저장할 때마다 오늘을 기록 — 복습 채점도 save를 부르므로 포함). 새 필드 없음.
   - 오답 중복 = 앞면(문제) 문장을 정규화해 같은 과정 오답노트의 문제 줄 · 카드 앞면과 비교(계약에 문항 id를 더하지 않음).
   운영: 튜터 서버(/api/pub/<tid>/tutor)는 바꾸지 않는다. 운영 모드에서는 기존 튜터(ltAI)에게 「목록 3~5줄 요약」을 묻고, 실패하면 아래 규칙 엔진(레슨 설명 · 챕터 · 퀴즈 · 내 진도)으로 만든다.
   learner.html에서 lnote.js 다음. */
'use strict';
(() => {
  if (typeof window === 'undefined' || typeof lrender !== 'function' || typeof viewPage !== 'function' || typeof LR !== 'object') return;
  /* LNOTE가 없을 때(개발자 1 파일이 빠진 빌드) — 같은 계약의 임시 대체(이 기기 메모리만, 저장 안 함). 실제 lnote.js가 있으면 그것을 쓴다 */
  if (!window.LNOTE) { const M = { items: [], cards: [] }, L = new Set(); const pad = n => String(n).padStart(2, '0'); const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; const td = () => ds(new Date()); const addD = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return ds(x); }; const id = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const emit = (k, x) => L.forEach(f => f(k, x));
    window.LNOTE = { today: td, addD, LIM: { items: 120, cards: 300 }, all: () => M.items.slice(), get: i => M.items.find(x => x.id === i) || null, save(p) { const o = p.id && M.items.find(x => x.id === p.id); const y = { tags: [], cid: '', lid: '', src: 'me', st: 'draft', pin: false, at: new Date().toISOString(), ...(o || {}), ...p, id: o ? o.id : id('n'), up: new Date().toISOString() }; if (o) M.items[M.items.indexOf(o)] = y; else M.items.unshift(y); emit(o ? 'up' : 'add', y); return y; },
      del(i) { M.items = M.items.filter(x => x.id !== i); emit('del', { id: i }); return true; }, cards: () => M.cards.slice(), card: i => M.cards.find(x => x.id === i) || null, saveCard(c) { const o = c.id && M.cards.find(x => x.id === c.id); const y = { iv: 1, ef: 2.5, n: 0, due: td(), src: 'note', nid: '', k: '', ...(o || {}), ...c, id: o ? o.id : id('k') }; if (o) M.cards[M.cards.indexOf(o)] = y; else M.cards.push(y); emit('card-add', y); return y; },
      delCard(i) { M.cards = M.cards.filter(x => x.id !== i); emit('card-del', { id: i }); return true; }, due: d => M.cards.filter(c => c.due <= (d || td())), grade(i, q) { const c = M.cards.find(x => x.id === i); if (!c) return null; c.n++; c.iv = q === 0 ? 1 : q === 1 ? Math.max(1, c.iv + 1) : Math.round(c.iv * c.ef) || 1; c.due = addD(td(), c.iv); emit('grade', { id: i, q, card: c }); return c; },
      on(f) { L.add(f); return () => L.delete(f); }, open(i) { location.hash = i ? '#notes/' + i : '#notes'; }, md: n => `# ${n.t}\n\n${n.b}\n`, cName: () => '', iName: () => '' }; }
  const N = window.LNOTE;
  { const cs = document.currentScript; const v = cs && cs.src && (cs.src.match(/\?v=[^&#]+/) || [''])[0]; if (!document.getElementById('lnaCss')) { const l = document.createElement('link'); l.id = 'lnaCss'; l.rel = 'stylesheet'; l.href = 'lnote-ai.css' + (v || ''); (document.head || document.documentElement).appendChild(l); } }

  /* ── 공통 ── */
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const P = { spark: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z', redo: 'M9 14l-4-4 4-4M5 10h9a5 5 0 010 10h-2', flame: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 01-10 0c0-2.4 1.2-3.8 2.3-5 .2 1.6.9 2.6 1.9 3 0-3.1.3-5.6.8-8z', cards: 'M8 4h12v13H8zM4 8v12h12', pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4', notep: 'M6 3h9l4 4v14H6zM14 3v5h5M9 14h6M12 11v6', check: 'M5 12l5 5 9-10', x: 'M6 6l12 12M18 6L6 18', play: 'M8 5v14l11-7z', chev: 'M9 6l6 6-6 6', help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01', sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', back: 'M15 6l-6 6 6 6', yt: 'M3 6h18v12H3zM10 9l5 3-5 3z' };
  const I = (k, s = 18) => `<svg class="lna-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[k] || P.spark}"/></svg>`;
  const td = () => N.today(); const tmr = () => N.addD(td(), 1);
  const md2 = s => { const [, m, d] = String(s || '').split('-'); return m ? `${+m}월 ${+d}일` : ''; };
  const WD = '일월화수목금토';
  const wdOf = s => { const [y, m, d] = String(s).split('-').map(Number); return WD[new Date(y, m - 1, d).getDay()]; };
  const appOn = () => document.body.classList.contains('lapp');
  const okMe = () => !!(LR.me && LR.me.kind !== 'parent' && LR.lp);
  const rt = () => (typeof route === 'function' ? route() : { a: '', b: '' });
  const say = (m, k = 'ok') => { try { if (typeof toast === 'function') toast(m, k); } catch (e) { } };
  const norm = s => String(s || '').toLowerCase().replace(/^\s*(\d+[.)]\s*)/, '').replace(/[\s「」『』"'`?？!.,·:;()\[\]~-]+/g, '');
  const cls = () => { try { return (SITE() && SITE().classes) || []; } catch (e) { return []; } };
  const clsOf = id => cls().find(c => c.id === id) || null;
  const itOf = (c, id) => (c && (c.items || []).find(x => x.id === id)) || null;
  const stats = () => { try { return typeof myStats === 'function' ? myStats() : null; } catch (e) { return null; } };
  const photo = (k, s) => { try { return typeof lPhoto === 'function' ? lPhoto(k, s) : 'img/stock/dsk-03-800.webp'; } catch (e) { return 'img/stock/dsk-03-800.webp'; } };
  /* 연속 학습일(LR.lp.days — 한국 시각 날짜 키) */
  const kday = (n = 0) => new Date(Date.now() + 9 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
  const days = () => (LR.lp && LR.lp.days) || {};
  function streak() { const D = days(); let n = 0; for (let k = 0; k < 400; k++) { const d = kday(-k); if (D[d]) n++; else if (k > 0) break; } return n; }
  const week = () => Array.from({ length: 7 }, (_, i) => { const d = kday(i - 6); return { on: !!days()[d], t: i === 6 }; });
  const dots = (lt) => `<span class="ln-streak lna-dots${lt ? ' lt' : ''}" aria-hidden="true">${week().map(x => `<i class="${x.on ? 'd' : ''}${x.t && !x.on ? ' t' : ''}"></i>`).join('')}</span>`;
  /* 다음에 볼 레슨(내 진도 기준) */
  function nextLesson() { const st = stats(); if (!st) return null; const x = (st.courses || []).filter(y => !y.done && y.next).sort((a, b) => (b.p || 0) - (a.p || 0))[0]; if (!x) return null; const its = (x.c.items || []).filter(i => i.type !== 'chapter'); const k = its.indexOf(x.next); return { c: x.c, it: x.next, p: x.p || 0, no: k + 1, href: `#c/${x.c.id}/${x.next.id}` }; }
  const lesLab = L => `레슨 ${L.no} · ${L.it.title}`;
  const notesOff = () => { try { const o = SITE() && SITE().lnote; return !!(o && o.off === true); } catch (e) { return false; } }; /* 운영: 기관 설정(A3 스튜디오 토글)이 노트 기능을 끄면 카드 · 칩을 숨긴다 */

  /* ── 초안 만들기(규칙 엔진) ── */
  const split = (s, n = 3) => String(s || '').replace(/<[^>]+>/g, ' ').split(/(?<=[.!?。])\s+|\n+/).map(x => x.trim().replace(/^[-*•]\s*/, '')).filter(x => x.length > 4).slice(0, n);
  const chapsOf = it => (Array.isArray(it && it.chaps) ? it.chaps : []).filter(x => x && Number.isFinite(+x.t)).map(x => ({ t: Math.max(0, Math.floor(+x.t)), n: String(x.n || '').replace(/[\r\n]/g, ' ').slice(0, 40) })).filter(x => x.n).sort((a, b) => a.t - b.t);
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const ansOf = q => q.t === 'ox' ? String(q.a).toUpperCase() : (q.opts || [])[+q.a];
  /* 같은 과정 퀴즈 문항(객관식 · OX) — 카드 후보(질문 → 정답) */
  function quizOf(c, it) { const out = []; if (!c) return out; const its = (c.items || []).filter(i => i.type !== 'chapter'); const k = it ? its.indexOf(it) : -1; const near = k >= 0 ? its.slice(k, k + 3) : its; near.concat(its).forEach(i => { if (/quiz|exam/.test(i.type) && Array.isArray(i.qs)) i.qs.forEach(q => { if ((q.t === 'mc' || q.t === 'ox') && ansOf(q) != null && !out.some(o => o.q === q.q)) out.push(q); }); }); return out; }
  function ruleDraft(c, it) { const L = []; const desc = it ? (it.desc || it.body || it.sum || it.note || '') : (c && (c.desc || c.intro || '')) || ''; split(desc, 3).forEach(s => L.push(s.slice(0, 140)));
    const C = chapsOf(it); C.slice(0, 3).forEach(x => { if (L.length < 4) L.push(`「${x.n}」 구간(${mmss(x.t)})에서 다룬 내용을 기억해요`); });
    const Q = quizOf(c, it); Q.slice(0, 2).forEach(q => { if (L.length < 5) L.push(`확인할 것: ${String(q.q).replace(/^\d+[.)]\s*/, '').slice(0, 90)}`); });
    if (L.length < 3 && it) L.push(`「${it.title}」의 핵심 용어 하나를 내 말로 설명해 보세요`);
    const st = stats(); const me = st && c && (st.courses || []).find(x => x.c.id === c.id); if (me && L.length < 5) L.push(`내 진도 ${me.p || 0}%${me.next ? ` · 다음은 「${me.next.title}」` : ''}`);
    while (L.length < 3) L.push(['오늘 배운 것 중 가장 중요한 한 가지를 적어 보세요', '헷갈린 부분을 질문 한 줄로 남겨요', '실제로 써 볼 곳 하나를 적어요'][L.length]);
    const K = Q.slice(0, 2).map(q => ({ f: String(q.q).replace(/^\d+[.)]\s*/, '').slice(0, 120), k: String(ansOf(q)).slice(0, 240) }));
    return { lines: L.slice(0, 5), cards: K, refs: C.slice(0, 2).map(x => x.t) }; }
  /* 본문 → 복습 카드 후보: 「질문? 답」 줄, **굵게** 쓴 용어(최대 3장) */
  function suggest(b) { const out = []; String(b || '').split('\n').forEach(l0 => { const l = l0.replace(/^\s*[-*•]\s*/, '').trim(); if (!l || out.length >= 3) return; const q = /^(.{3,118}?[?？])\s*(.+)$/.exec(l); if (q) { out.push({ f: q[1].replace(/\*\*/g, ''), k: q[2].replace(/\*\*/g, '').slice(0, 240) }); return; }
    const m = /\*\*([^*]{1,40})\*\*/.exec(l); if (m) out.push({ f: `${m[1]}${/[가-힣]$/.test(m[1]) ? '' : ''}란 무엇인가요?`.slice(0, 120), k: l.replace(/\*\*/g, '').slice(0, 240) }); }); return out; }

  /* ── 초안 상태(아직 저장 전 · 저장 후) ── */
  const DR = {}; let DSEQ = 0;
  function mkDraft(o) { const k = 'd' + (++DSEQ); DR[k] = { k, nid: '', ...o }; return DR[k]; }
  const where = () => { try { return typeof ltWhere === 'function' ? ltWhere() : { k: '' }; } catch (e) { return { k: '' }; } };
  async function lessonDraft() { const w = where(); const c = w.c, it = w.it; const R = ruleDraft(c, it); let lines = R.lines, via = '규칙 엔진';
    /* 운영: 서버 튜터(Claude)에게 목록 요약을 묻는다 — /api 규격은 그대로(q 문장만). 실패 · 데모(키 없음)는 규칙 엔진 */
    if (LR.mode === 'live' && typeof ltAI === 'function') { try { const a = await ltAI(`「${it ? it.title : c ? c.name : ''}」 레슨의 핵심 개념을 3~5개의 짧은 목록(각 줄 "- "로 시작, 한 줄 60자 안)으로 정리해 주세요. 과제 · 서술형 답안은 쓰지 말고 개념만 적습니다.`); const L = String((a && a.t) || '').split('\n').map(x => x.trim()).filter(x => /^[-*•]|\d+[.)]/.test(x)).map(x => x.replace(/^([-*•]|\d+[.)])\s*/, '').slice(0, 140)).filter(Boolean); if (L.length >= 2) { lines = L.slice(0, 5); via = 'Claude'; } } catch (e) { } }
    return mkDraft({ src: 'tutor', t: (it ? `${it.no ? `레슨 ${it.no} · ` : ''}${it.title} 요약` : `${c ? c.name : '오늘'} 정리`).slice(0, 80), lines, cards: R.cards, refs: R.refs, cid: c ? c.id : '', lid: it ? it.id : '', tags: [], via }); }
  function todayDraft() { const st = stats(); const L = []; let cid = '', lid = ''; const D = days(); const todayN = D[kday()] || 0;
    ((st && st.courses) || []).forEach(x => { const r = ((LR.lp.cls || {})[x.c.id] || { items: {} }).items || {}; (x.c.items || []).forEach(i => { const v = r[i.id]; if (v && String(v.at || '').slice(0, 10) === kday() && L.length < 4) { L.push(`${i.title}${v.score != null ? ` · 확인 문제 ${v.score}점` : ''}`); cid = cid || x.c.id; lid = lid || i.id; } }); });
    if (!L.length) { const nl = nextLesson(); if (nl) { L.push(`이어 볼 레슨: ${nl.it.title} (진도 ${nl.p}%)`); cid = nl.c.id; } }
    L.push('오늘 새로 알게 된 것 한 줄을 적어요', '헷갈린 것은 질문 한 줄로 남겨요');
    return mkDraft({ src: 'tutor', t: `${md2(td())} 학습 정리`, lines: L.slice(0, 5), cards: [], refs: [], cid, lid, tags: [], via: todayN ? '오늘 학습 기록' : '진도' }); }
  function answerDraft(text, q) { const L = split(text, 5); return mkDraft({ src: 'tutor', t: (q ? `${q}`.replace(/[?？]$/, '') : '튜터 답변 정리').slice(0, 80), lines: L.length ? L : [String(text).slice(0, 140)], cards: q && L[0] ? [{ f: String(q).slice(0, 120), k: L[0].slice(0, 240) }] : [], refs: [], cid: (where().c || {}).id || '', lid: (where().it || {}).id || '', tags: [], via: '튜터 답변' }); }
  /* ── 튜터 대화 안 초안 카드(.ln-tdraft) ── */
  const inl = s => E(s).replace(/`([^`]{1,40})`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const refHTML = (d, it) => d.refs && d.refs.length ? `<p class="ln-ref">${I('play', 14)}근거 ${d.refs.map(t => `<button type="button" data-lna="seek" data-v="${t}" aria-label="영상 ${mmss(t)}로 이동">${mmss(t)}</button>`).join('')}</p>` : '';
  const tdraftHTML = d => `<div class="ln-tdraft" data-dk="${d.k}"><div class="dh"><span class="ln-src" data-s="${d.src === 'yt' ? 'yt' : 'tutor'}">${I(d.src === 'yt' ? 'yt' : 'spark', 14)}${d.src === 'yt' ? '영상' : '튜터 초안'}</span><span class="st-draft">확인 전</span></div>
    <h5>${E(d.t)}</h5><ul>${d.lines.map(l => `<li>${inl(l)}</li>`).join('')}</ul>${refHTML(d)}${d.yt ? '<p class="lna-honest">영상 내용은 아직 읽지 못해요. 적어 주신 제목 · 메모로만 틀을 만들었어요.</p>' : ''}
    <div class="ln-dact"><button type="button" class="lna-b s" data-lna="discard" data-v="${d.k}">${I('x', 16)}버리기</button><button type="button" class="lna-b p" data-lna="edit" data-v="${d.k}">확인 · 고치기</button></div></div>`;
  function pushTutor(me, d, t) { const page = !LT.open && !!document.querySelector('.lai-th'); if (!page && !LT.open && typeof ltOpen === 'function') ltOpen(); if (me) LT.msgs.push({ me: 1, t: me });
    LT.msgs.push({ t: t || '튜터가 만든 초안이에요. 내 말로 고쳐서 저장해 주세요.', h: tdraftHTML(d), src: `노트 초안 · ${d.via}`, lna: 1 }); LT.msgs = LT.msgs.slice(-30); if (typeof ltRender === 'function') ltRender(); syncHome(); }
  const syncHome = () => { try { const box = document.querySelector('.lai-res'); if (box && typeof LT === 'object') { const M = (LT.msgs || []).filter(m => !m.sys); box.hidden = !M.length; const th = box.querySelector('.lai-th'); if (th) { th.innerHTML = M.map(ltMsgHTML).join(''); th.scrollTop = th.scrollHeight; } } } catch (e) { } };

  function undoToast(b, s, undo) { document.querySelectorAll('.lna-toast').forEach(x => x.remove()); document.body.insertAdjacentHTML('beforeend', `<div class="lna-toast" role="status"><span class="ck">${I('check', 18)}</span><span class="tx"><b>${E(b)}</b><span>${E(s)}</span></span>${undo ? '<button type="button" data-lna="undo">되돌리기</button>' : ''}</div>`); UNDO = undo; clearTimeout(undoToast.t); undoToast.t = setTimeout(() => { document.querySelectorAll('.lna-toast').forEach(x => x.remove()); UNDO = null; }, 5000); }
  let UNDO = null;

  /* ── 초안 확인 모드 훅(FINAL S05 — 개발자 1 편집 시트의 「초안 모드」가 부른다. 별도 시트 없음) ──
     ORIG[nid] = 튜터가 건넨 원래 줄(이 세션). 시트는 LNOTE_AI.diffLines(LNOTE_AI.orig(nid), 지금 본문)으로 줄마다 ai/mine을 칠하고,
     mine ≥ 1 + 「확인했어요」 체크일 때만 「확인하고 저장」을 켠다. */
  const ORIG = {}, PRE = {};
  const lineOf = l => String(l || '').replace(/^\s*[-*•]\s*/, '').replace(/\*\*/g, '').replace(/ /g, ' ').trim();
  function diffLines(orig, now) { const O = new Set(String(orig || '').split('\n').map(lineOf).filter(Boolean)); const lines = String(now || '').split('\n').map(x => ({ t: x, k: lineOf(x) ? (O.has(lineOf(x)) ? 'ai' : 'mine') : '' })); return { lines, mine: lines.filter(x => x.k === 'mine').length, ai: lines.filter(x => x.k === 'ai').length }; }
  const origOf = nid => { if (ORIG[nid] != null) return ORIG[nid]; const n = N.get(nid); return n && n.st === 'draft' && ['tutor', 'yt'].includes(n.src) ? n.b : ''; };
  /* 튜터 점검: 빠진 개념(레슨 챕터 중 본문에 없는 것) + 다시 볼 시점만 — 정답 문장은 쓰지 않는다 */
  function hint(note, now) { const n = typeof note === 'string' ? N.get(note) : note; if (!n) return ''; const it = itOf(clsOf(n.cid), n.lid); const b = String(now == null ? n.b : now); const miss = chapsOf(it).filter(x => !b.includes(x.n)); const d = diffLines(origOf(n.id), b);
    return miss.length ? `「${miss[0].n}」 설명이 빠졌어요. 영상 ${mmss(miss[0].t)}을 다시 보고 직접 적어 보세요.` : d.mine ? '좋아요. 줄마다 예시를 하나씩 붙이면 더 오래 기억나요.' : '튜터 문장을 내 말로 바꾸거나, 기억할 것을 한 줄 더해 보세요.'; }
  /* 카드 제안(FINAL 0-2) — 「튜터에게 더 뽑아 달라기」. 튜터 초안이 미리 고른 카드(같은 과정 퀴즈의 질문 → 정답) + 본문 규칙. 운영: 튜터 서버 연동 시 서버가 뽑고 실패하면 이 규칙 */
  function suggestCards(note, now) { const n = typeof note === 'string' ? N.get(note) : note; const b = now != null ? now : n ? n.b : ''; const out = []; const add = c => { if (c && c.f && out.length < 3 && !out.some(x => norm(x.f) === norm(c.f)) && !N.cards().some(x => n && x.nid === n.id && norm(x.f) === norm(c.f))) out.push({ f: String(c.f).slice(0, 120), k: String(c.k || '').slice(0, 240) }); };
    ((n && PRE[n.id]) || []).forEach(add); suggest(b).forEach(add); if (n && out.length < 3) quizOf(clsOf(n.cid), itOf(clsOf(n.cid), n.lid)).forEach(q => add({ f: qText(q), k: String(ansOf(q)) }));
    if (out.length < 1) String(b).split('\n').map(lineOf).filter(l => l.length > 8 && !/^(핵심|질문|내 생각|영상):?$/.test(l)).slice(0, 2).forEach(l => { const m = /^(.{2,30}?)(은|는|이|가)\s+(.{4,})$/.exec(l); if (m) add({ f: `${m[1]}${m[2]} 무엇인가요?`.replace(/(은|는|이|가) 무엇/, m[2] === '은' || m[2] === '이' ? '은 무엇' : '는 무엇'), k: l }); }); return out; }
  /* 초안 열기: st:'draft'로 저장(아직 저장 전이면) → 개발자 1 편집 시트(초안 모드) */
  function openDraft(d) { if (!okMe()) { location.hash = '#login'; return; } if (!d.nid || !N.get(d.nid)) { const body = [d.head, ...d.lines.map(l => `- ${l}`)].filter(Boolean).join('\n'); const n = N.save({ t: d.t, b: body, cid: d.cid, lid: d.lid, tags: d.tags, src: d.src, st: 'draft' }); if (!n) return; d.nid = n.id; ORIG[n.id] = body; PRE[n.id] = d.cards || []; }
    if (typeof LT === 'object' && LT.open && innerWidth <= 760) { LT.open = false; document.body.classList.remove('lt-on'); try { ltRender(); } catch (e) { } } N.open(d.nid); }

  /* ── 오답노트 ── */
  const qText = q => String(q.q || '').replace(/^\d+[.)]\s*/, '').trim();
  function wrongNoteOf(cid, key) { return N.all().find(n => n.src === 'quiz' && (!cid || n.cid === cid) && (norm((/\*\*문제\*\*\s*(.+)/.exec(n.b) || [])[1]) === key || N.cards().some(c => c.nid === n.id && norm(c.f) === key))) || null; }
  /* 틀린 문항 → 오답노트 초안(src:'quiz', draft). 같은 문항을 또 틀리면 「다시 틀림 n회」만 고친다 */
  function recordWrong(c, it, q, mine) { const qt = qText(q); const key = norm(qt); if (!key) return null; const right = String(ansOf(q) == null ? '' : ansOf(q)); const myA = String(mine == null || mine === '' ? '(고르지 않음)' : mine);
    const old = wrongNoteOf(c ? c.id : '', key);
    if (old) { const m = /\*\*다시 틀림\*\*\s*(\d+)회/.exec(old.b); const k = m ? +m[1] + 1 : 2; const b = m ? old.b.replace(/\*\*다시 틀림\*\*\s*\d+회/, `**다시 틀림** ${k}회`) : old.b.replace(/(\*\*정답\*\*[^\n]*)/, `$1\n**다시 틀림** ${k}회`); const b2 = b.replace(/\*\*내 답\*\*[^\n]*/, `**내 답** ${myA.slice(0, 120)}`);
      const n = N.save({ id: old.id, b: b2 }); const K = N.cards().filter(x => x.nid === old.id); K.forEach(x => N.grade(x.id, 0)); if (!K.length) N.saveCard({ nid: old.id, f: qt.slice(0, 120), k: right.slice(0, 240), src: 'quiz', due: tmr(), iv: 1, ef: 2.5, n: 0 }); return n; }
    /* FINAL S08: 틀린 문항마다 초안 노트 + 카드(src:'quiz', 첫 복습 내일). 뒷면은 「왜 틀렸나」를 쓰면 덧붙는다 */
    const n = N.save({ src: 'quiz', st: 'draft', cid: c ? c.id : '', lid: it ? it.id : '', t: qt.slice(0, 80), tags: [], b: `**문제** ${qt.slice(0, 400)}\n**내 답** ${myA.slice(0, 200)}\n**정답** ${right.slice(0, 200)}${q.exp || q.ex ? `\n**해설** ${String(q.exp || q.ex).slice(0, 300)}` : ''}` });
    if (n) N.saveCard({ nid: n.id, f: qt.slice(0, 120), k: right.slice(0, 240), src: 'quiz', due: tmr(), iv: 1, ef: 2.5, n: 0 }); return n; }
  const pendWrong = (cid, lid) => N.all().filter(n => n.src === 'quiz' && n.st === 'draft' && (!cid || n.cid === cid) && (!lid || n.lid === lid));
  let LASTQ = null; /* 방금 제출한 퀴즈 결과(화면 상태만 — 저장 안 함) */
  const wrongboxHTML = (cid, lid, ok, tot, nobtn) => { const W = pendWrong(cid, lid); if (!W.length && tot && ok === tot) return `<div class="ln-wrongbox ok"><div class="h"><span class="ic">${I('check', 20)}</span><div><b>${tot}문제 모두 맞혔어요. 카드 간격이 늘어나요</b></div></div></div>`; if (!W.length) return '';
    return `<div class="ln-wrongbox"><div class="h"><span class="ic">${I('redo', 20)}</span><div><b>오답노트 초안 ${W.length}개가 생겼어요</b><p>왜 틀렸는지 한 줄씩만 쓰면 내 노트가 되고, 복습 카드로 다시 나와요.</p></div></div>${nobtn ? '' : `<button type="button" class="lna-b p" data-lna="wrong" data-c="${E(cid)}" data-l="${E(lid)}">오답노트 확인하기</button>`}</div>`; };

  /* 오답노트 확인 시트(한 문항씩) */
  let WQ = null; /* { ids, i, why, reason } */
  const REASONS = ['개념 헷갈림', '문제 잘못 읽음', '실수', '처음 봄'];
  const part = (b, k) => ((new RegExp(`\\*\\*${k}\\*\\*\\s*([^\\n]*)`)).exec(b || '') || [])[1] || '';
  function wrongHTML() { const n = N.get(WQ.ids[WQ.i]); if (!n) return ''; const c = clsOf(n.cid), it = itOf(c, n.lid); const last = WQ.i >= WQ.ids.length - 1; const q = part(n.b, '문제'), a = part(n.b, '내 답'), r = part(n.b, '정답'), rep = part(n.b, '다시 틀림');
    const kf = q.slice(0, 120), kk = `${r}${WQ.why ? ` — ${WQ.why}` : ''}`.slice(0, 240);
    return `<div class="lna-ov full${appOn() ? ' app' : ''}" id="lnaWrong"><div class="lna-sheet" role="dialog" aria-modal="true" aria-labelledby="lnaWT">
      <div class="shd"><button type="button" class="lna-ib" data-lna="wclose" aria-label="닫기 — 남은 초안은 그대로 둬요">${I('back', 20)}</button><b id="lnaWT">오답노트 확인<small>${WQ.i + 1} / ${WQ.ids.length}</small></b><span class="lna-ib" aria-hidden="true"></span></div>
      <div class="lna-sb">
        <p class="lna-meta"><span class="ln-src" data-s="quiz">${I('redo', 14)}오답</span><span class="st-draft">확인 전</span><span class="crs">${E([c && c.name, it && it.title].filter(Boolean).join(' › '))}</span></p>
        <div class="qbox"><p class="q">${E(q)}</p><div class="row2"><div class="mine"><small>내 답</small><s>${E(a)}</s></div><div class="ans"><small>정답</small><b>${E(r)}</b></div></div>${rep ? `<p class="rep">다시 틀림 ${E(rep)}</p>` : ''}${it ? `<a class="lna-lk" href="#c/${E(c.id)}/${E(it.id)}">${I('play', 14)}레슨 다시 보기 · ${E(it.title.slice(0, 24))}</a>` : ''}</div>
        <div class="why"><label for="lnaWhyT">왜 틀렸을까요? <em>내가 써요</em></label><textarea id="lnaWhyT" rows="3" maxlength="200" placeholder="예: 빈 칸이 있는 줄 몰랐어요. 다음엔 원본부터 확인할게요">${E(WQ.why)}</textarea>
          <div class="rchips" role="group" aria-label="틀린 이유">${REASONS.map(x => `<button type="button" class="lna-chip${WQ.reason === x ? ' on' : ''}" aria-pressed="${WQ.reason === x}" data-lna="reason" data-v="${E(x)}">${E(x)}</button>`).join('')}</div></div>
        <p class="lna-fl">복습 카드 1장 <small>확인하면 내일 나와요</small></p><div class="lna-kp"><div><small>앞면</small><b>${E(kf)}</b></div><div><small>뒷면</small><b id="lnaKk">${E(kk)}</b></div></div>
      </div><p class="lna-why" id="lnaWW" role="status"></p>
      <div class="sfoot"><button type="button" class="lna-b s" data-lna="wskip">건너뛰기</button><button type="button" class="lna-b p big" data-lna="wok">${last ? '확인하고 마치기' : '확인 · 다음 오답'}</button></div></div></div>`; }
  function paintWrong() { document.querySelectorAll('#lnaWrong').forEach(x => x.remove()); if (!WQ) { document.body.classList.remove('lna-on'); return; } const h = wrongHTML(); if (!h) { WQ = null; document.body.classList.remove('lna-on'); return; } document.body.insertAdjacentHTML('beforeend', h); document.body.classList.add('lna-on'); }
  function openWrong(cid, lid) { const ids = pendWrong(cid, lid).map(n => n.id).reverse(); if (!ids.length) { say('확인할 오답노트가 없어요.'); return; } WQ = { ids, i: 0, why: '', reason: '' }; if (typeof LT === 'object' && LT.open && innerWidth <= 760) { LT.open = false; document.body.classList.remove('lt-on'); ltRender(); } paintWrong(); }
  function wrongNext() { WQ.i++; WQ.why = ''; WQ.reason = ''; if (WQ.i >= WQ.ids.length) { WQ = null; paintWrong(); try { lrender(); } catch (e) { } return true; } paintWrong(); return false; }
  function wrongOk() { const why = (document.getElementById('lnaWhyT') || {}).value || ''; if (!why.trim()) { const w = document.getElementById('lnaWW'); if (w) w.textContent = '왜 틀렸는지 한 줄을 내 말로 적어 주세요.'; const t = document.getElementById('lnaWhyT'); if (t) t.focus(); return; }
    const n = N.get(WQ.ids[WQ.i]); if (!n) { wrongNext(); return; } const tag = WQ.reason ? WQ.reason.replace(/\s+/g, '') : ''; const b = n.b.replace(/\n\*\*왜 틀렸나\*\*[^\n]*/g, '') + `\n**왜 틀렸나** ${why.trim().slice(0, 200)}`;
    const s = N.save({ id: n.id, b: b.slice(0, 1500), tags: tag && !n.tags.includes(tag) ? [...n.tags, tag].slice(0, 5) : n.tags, st: 'ok' }); if (!s) return;
    const q = part(s.b, '문제'), r = part(s.b, '정답'); const k = `${r} — ${why.trim()}`.slice(0, 240); const K = N.cards().filter(c => c.nid === s.id); if (K.length) K.forEach(c => N.saveCard({ id: c.id, k })); else N.saveCard({ nid: s.id, f: q.slice(0, 120), k, src: 'quiz', due: tmr(), iv: 1, ef: 2.5, n: 0 });
    const end = wrongNext(); if (end) say('오답노트를 확인했어요. 복습 카드는 내일 나와요.'); }

  /* 퀴즈 채점 지점 감싸기 — 과정 퀴즈(#qz, lrun2.js)와 튜터 퀴즈(.lt-quiz, ltutor.js). 원래 처리기 다음에 돈다(같은 document · 뒤에 등록) */
  document.addEventListener('submit', e => { const f = e.target; if (!f || !okMe()) return;
    try {
      if (f.id === 'qz' || f.id === 'a2qz') { const c = clsOf(f.dataset.c); const it = itOf(c, f.dataset.i); if (!it || !Array.isArray(it.qs)) return; let ok = 0, tot = 0;
        /* a2qz(lassess.js): 이번 제출이 실제로 채점됐고(응시 제한에 막히지 않음) 점수 · 풀이를 지금 공개하는 시험만 — 정답 비공개 시험은 오답노트에 정답을 옮기지 않는다 */
        if (f.id === 'a2qz') { try { if (typeof a2lShow === 'function' && a2lShow(it) !== 'now') return; const T = (typeof a2lRec === 'function' ? a2lRec(c.id, it.id).tries : null) || []; const last = T[T.length - 1]; if (!last || Date.now() - Date.parse(last.at) > 5000) return; } catch (x) { return; } }
        const rows = []; it.qs.forEach((q, k) => { if (q.t !== 'mc' && q.t !== 'ox') return; tot++; const v = (f.querySelector(`[name=q${k}]:checked`) || {}).value; const right = q.t === 'mc' ? String(v) === String(q.a) : String(v || '').toUpperCase() === String(q.a).toUpperCase(); const mine = v == null ? '' : q.t === 'mc' ? (q.opts || [])[+v] : v; if (right) ok++; else recordWrong(c, it, q, mine); rows.push({ q: qText(q), ok: right, mine: mine == null ? '' : String(mine) }); });
        LASTQ = { cid: c.id, lid: it.id, ok, tot, rows }; setTimeout(decoQuiz, 0); return; }
      if (f.classList && f.classList.contains('lt-quiz')) { const Z = (LT.q || {})[f.dataset.qid] || []; let ok = 0; const w = where(); const W = [];
        Z.forEach((q, k) => { const v = (f.querySelector(`[name=z${k}]:checked`) || {}).value; const right = q.t === 'ox' ? String(v || '').toUpperCase() === String(q.a).toUpperCase() : String(v) === String(q.a); if (right) { ok++; if (q.kid) N.grade(q.kid, 2); return; } if (q.kid) { N.grade(q.kid, 0); return; }
          const from = String(q.from || ''); const c = cls().find(x => from.startsWith(x.name + ' · ')) || w.c || null; const it = c ? (c.items || []).find(i => from === `${c.name} · ${i.title}`) || null : null; const n = recordWrong(c, it, q, v == null ? '' : q.t === 'mc' ? (q.opts || [])[+v] : v); if (n) W.push(n.id); });
        const mm = [...LT.msgs].reverse().find(m => m.h && /lt-zr/.test(m.h) && !m.lnaW); const box = W.length ? `<div class="ln-wrongbox in-t"><div class="h"><span class="ic">${I('redo', 20)}</span><div><b>오답노트 초안 ${W.length}개를 남겨 뒀어요</b><p>왜 틀렸는지 한 줄씩 쓰면 내 노트가 되고 복습 카드로 다시 나와요.</p></div></div><button type="button" class="lna-b p" data-lna="wrong" data-c="" data-l="">오답노트 확인하기</button></div>` : Z.length && ok === Z.length ? `<div class="ln-wrongbox ok in-t"><div class="h"><span class="ic">${I('check', 20)}</span><div><b>${Z.length}문제 모두 맞혔어요. 카드 간격이 늘어나요</b></div></div></div>` : '';
        if (mm && box) { mm.h += box; mm.lnaW = 1; ltRender(); syncHome(); } }
    } catch (x) { console.error('lnote-ai quiz', x); } });
  /* FINAL S08 퀴즈 결과 — 과정 퀴즈를 제출한 레슨 화면의 점수(.qres) 아래: 결과 머리 카드(링 78) · 문항 줄 · .ln-wrongbox · 「다시 풀기」/「오답노트 확인하기」 · 요약 줄 */
  function quizResHTML(Q, hasSol) { const W = pendWrong(Q.cid, Q.lid); const R = 30, Lc = 2 * Math.PI * R, bad = Q.tot - Q.ok; const it = itOf(clsOf(Q.cid), Q.lid); const nN = N.all().filter(n => n.cid === Q.cid && n.lid === Q.lid).length, nK = N.cards().filter(c => { const n = c.nid && N.get(c.nid); return n && n.cid === Q.cid && n.lid === Q.lid; }).length;
    return `<section class="lna-qr" aria-label="확인 문제 결과"><div class="lna-qh"><span class="ring"><svg width="78" height="78" viewBox="0 0 78 78" aria-hidden="true"><circle cx="39" cy="39" r="${R}" fill="none" stroke-width="7" class="bg"/><circle cx="39" cy="39" r="${R}" fill="none" stroke-width="7" class="fg" stroke-dasharray="${(Lc * Q.ok / Math.max(1, Q.tot)).toFixed(1)} ${Lc.toFixed(1)}" transform="rotate(-90 39 39)"/></svg><b>${Q.ok}/${Q.tot}</b></span><span><b>${Q.ok ? `${Q.ok}문제 맞혔어요` : '이번엔 다시 볼 문제가 많아요'}</b><span>${bad ? `틀린 ${bad}문제는 오답노트 초안으로 남겨 뒀어요.` : '모두 맞혔어요. 카드 간격이 늘어나요.'}</span></span></div>
      ${hasSol ? '' : `<ul class="lna-ql">${(Q.rows || []).map(x => `<li class="${x.ok ? 'ok' : 'no'}"><span class="ic" aria-label="${x.ok ? '정답' : '오답'}">${I(x.ok ? 'check' : 'x', 16)}</span><span class="tx"><b>${E(x.q)}</b><small>${x.ok ? '정답' : `내 답: ${E(x.mine || '(고르지 않음)')}`}</small></span>${x.ok ? '' : '<span class="st-draft">확인 전</span>'}</li>`).join('')}</ul>`}
      ${wrongboxHTML(Q.cid, Q.lid, Q.ok, Q.tot, 1)}
      <p class="lna-qs2">${I('doc', 16)}${it ? `「${E(it.title.slice(0, 20))}」 ` : ''}노트 ${nN}개 · 복습 카드 ${nK}장</p>
      <div class="lna-qf"><button type="button" class="lna-b s" data-lna="qretry">다시 풀기</button>${W.length ? `<button type="button" class="lna-b p" data-lna="wrong" data-c="${E(Q.cid)}" data-l="${E(Q.lid)}">오답노트 확인하기</button>` : `<a class="lna-b p" href="#notes">내 노트 보기</a>`}</div></section>`; }
  function decoQuiz() { try { if (!LASTQ || rt().a !== 'c') return; const im = document.querySelector('#lm .imain') || document.getElementById('lm'); if (!im) return; const p = decodeURIComponent(location.hash.slice(1)).split('/'); if (p[1] !== LASTQ.cid || (p[2] && p[2] !== LASTQ.lid)) return;
    im.querySelectorAll('.lna-qr').forEach(x => x.remove()); const sol = im.querySelector('.a2lsol'); const h = quizResHTML(LASTQ, !!sol);
    if (sol) sol.querySelectorAll(':scope > li.ng').forEach(li => { if (!li.querySelector('.st-draft')) li.insertAdjacentHTML('beforeend', ' <span class="st-draft">확인 전</span>'); });
    const at = im.querySelector('.a2lres') || im.querySelector('.qres'); if (at) at.insertAdjacentHTML('afterend', h); else { const f = im.querySelector('#qz, #a2qz'); if (f) f.insertAdjacentHTML('beforebegin', h); } } catch (e) { console.error('lnote-ai deco quiz', e); } }

  /* 노트로 확인 문제(튜터 퀴즈 형식 재사용 — 카드 앞면 → 객관식, 보기는 이 노트 · 다른 카드의 뒷면) */
  function noteQuiz(nid) { const K = N.cards().filter(c => c.nid === nid && c.k); const pool = N.cards().filter(c => c.k).map(c => c.k); const Z = K.slice(0, 5).map(c => { const o = [c.k, ...[...new Set(pool.filter(k => k !== c.k))].sort(() => Math.random() - .5).slice(0, 3)]; if (o.length < 2) return null; const S = o.sort(() => Math.random() - .5); return { t: 'mc', q: c.f, opts: S, a: S.indexOf(c.k), from: (N.get(nid) || {}).t || '내 노트', kid: c.id }; }).filter(Boolean); return Z; }

  /* ── 튜터 칩(자리별 짙은 칩 1개 + 답변 아래 흰 칩) ── */
  const MK = { lesson: '이 레슨 노트로 정리', today: '오늘 배운 거 정리해 줘', wrong: '오답노트 확인하기', nquiz: '이 노트로 확인 문제 내줘', review: '오늘 복습 시작' };
  function mkChip() { if (!okMe() || notesOff()) return null; const r = rt(); const w = where();
    if (r.a === 'c' && w.it) { if (pendWrong(w.c && w.c.id, w.it.id).length) return { l: MK.wrong, q: MK.wrong }; return { l: MK.lesson, q: MK.lesson }; }
    if (r.a === 'notes' && r.b && N.get(decodeURIComponent(r.b))) return { l: MK.nquiz, q: MK.nquiz };
    if (['home', 'my', 'acct', 'notes', ''].includes(r.a)) { if (N.due().length) return { l: MK.review, q: MK.review }; return { l: MK.today, q: MK.today }; }
    return null; }
  if (typeof LSAM === 'object' && LSAM && typeof LSAM.screen === 'function') { const base = LSAM.screen; LSAM.screen = (...a) => { const s = base(...a); try { const m = mkChip(); if (m && s && Array.isArray(s.chips) && !s.chips.some(c => c.q === m.q)) s.chips = [{ ...m, lna: 1 }, ...s.chips].slice(0, 5); const r = rt(); if (okMe() && !notesOff() && r.a === 'notes' && !r.b && s && Array.isArray(s.chips) && !s.chips.some(c => c.q === YTC)) s.chips.splice(1, 0, { l: YTC, q: YTC }); } catch (e) { } return s; }; }
  else if (typeof ltChips === 'function') { const base = ltChips; ltChips = () => { const C = base(); const m = mkChip(); return m ? [m.q, ...C.filter(x => x !== m.q)].slice(0, 5) : C; }; } // eslint-disable-line no-global-assign
  const YTC = '영상으로 노트 만들기';
  const isMK = v => Object.values(MK).includes(v);
  /* 튜터 칩 꾸미기(짙은 칩 · 아이콘) + 보통 답변 아래 「노트로 남기기 · 카드 1장」 */
  function decoTutor() { document.querySelectorAll('.lt-chip[data-v]').forEach(b => { if (isMK(b.dataset.v) && !b.classList.contains('ln-mk')) { b.classList.add('ln-mk'); b.insertAdjacentHTML('afterbegin', I(b.dataset.v === MK.wrong ? 'redo' : b.dataset.v === MK.review ? 'cards' : 'notep', 16)); } }); }
  if (typeof ltRender === 'function') { const base = ltRender; ltRender = (...a) => { try { if (okMe() && !notesOff() && typeof LT === 'object') LT.msgs.forEach((m, i) => { if (m.me || m.sys || m.lna || m.lnaK || !m.t || String(m.t).length < 20 || (m.h && /lt-quiz|lt-zr|ln-tdraft/.test(m.h)) || /질문 전달|맡기기/.test(m.src || '')) return; m.lnaK = 'a' + i + Date.now().toString(36); m.h = (m.h || '') + `<div class="lt-qs lna-keep"><button type="button" class="lt-chip" data-lna="keep" data-v="${m.lnaK}">${I('notep', 16)}노트로 남기기</button><button type="button" class="lt-chip" data-lna="kcard" data-v="${m.lnaK}">${I('cards', 16)}카드 1장</button></div>`; }); } catch (e) { } const r = base(...a); try { decoTutor(); } catch (e) { } return r; }; }
  const msgOf = k => { const M = (LT.msgs || []); const i = M.findIndex(m => m.lnaK === k); if (i < 0) return null; const q = [...M.slice(0, i)].reverse().find(m => m.me); return { m: M[i], q: q ? q.t : '' }; };

  /* 칩 · 버튼 처리 — 튜터 칩은 원래 처리기보다 먼저(capture) 가로챈다 */
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-tact="q"][data-v]'); if (!el || !(isMK(el.dataset.v) || el.dataset.v === YTC) || !okMe()) return; e.preventDefault(); e.stopImmediatePropagation(); chipRun(el.dataset.v); }, true);
  async function chipRun(v) { const r = rt(); if (v === YTC) { openYt(); return; }
    if (v === MK.review) { location.hash = '#review'; if (typeof LT === 'object' && LT.open && innerWidth <= 760) { LT.open = false; document.body.classList.remove('lt-on'); ltRender(); } return; }
    if (v === MK.wrong) { const w = where(); openWrong(w.c && w.c.id, w.it && w.it.id); return; }
    if (v === MK.nquiz) { const id = decodeURIComponent(r.b || ''); const Z = noteQuiz(id); const page = !LT.open && !!document.querySelector('.lai-th'); if (!page && !LT.open) ltOpen(); LT.msgs.push({ me: 1, t: v });
      if (Z.length) { const qid = 'n' + Date.now().toString(36); LT.q[qid] = Z; LT.msgs.push({ t: `이 노트의 복습 카드로 ${Z.length}문제를 냈어요. 틀리면 오답노트 초안으로 남겨 둘게요.`, h: ltQuizHTML(Z, qid), src: '노트 확인 문제' }); }
      else LT.msgs.push({ t: '이 노트에는 확인 문제로 바꿀 복습 카드가 아직 없어요. 노트에서 「복습 카드 만들기」로 질문 한 줄, 답 한 줄을 먼저 남겨 보세요.', src: '노트 확인 문제' });
      ltRender(); syncHome(); return; }
    if (v === MK.lesson) { if (typeof LT === 'object') { LT.busy = LR.mode === 'live'; if (LT.busy) ltRender(); } const d = await lessonDraft(); if (typeof LT === 'object') LT.busy = false; pushTutor('이 레슨 핵심만 노트로 정리해 줘', d); return; }
    if (v === MK.today) { pushTutor('오늘 배운 거 정리해 줘', todayDraft()); return; } }

  /* ── FINAL S20 영상으로 노트 만들기 시트 — 영상 주소 + 제목 + 내 메모(필수)로 초안. 자막은 쓰지 않는다(0-13) ──
     운영: 자막 요약은 스튜디오 「자막 요약」을 켜고 서버 연동 후(지금은 영상 내용을 읽지 않음 · 내 YouTube 계정 · 시청 기록도 쓰지 않음) */
  const YT = /(https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,15})[^\s]*)/i;
  let YS = null; /* { url, t, memo, cid, lid, note, cards, err } */
  function ytLessons() { const st = stats(); const out = []; ((st && st.courses) || []).forEach(x => (x.c.items || []).filter(i => i.type !== 'chapter').forEach(i => out.push({ v: `${x.c.id}/${i.id}`, l: `${x.c.name} › ${i.title}` }))); return out.slice(0, 60); }
  function ytHTML() { const m = YT.exec(YS.url || ''); const vid = m ? m[2] : ''; const logo = typeof window.brandLogo === 'function' ? window.brandLogo('youtube', 48) : '<span class="lna-lt">Y</span>'; const L = ytLessons();
    return `<div class="lna-ov${appOn() ? ' app' : ''}" id="lnaYt"><button type="button" class="lna-dim" data-lna="ytx" tabindex="-1" aria-label="닫기"></button><div class="lna-sheet" role="dialog" aria-modal="true" aria-labelledby="lnaYtT">${appOn() ? '<span class="lna-grab" aria-hidden="true"></span>' : ''}
      <div class="shd yt">${logo}<b id="lnaYtT">영상으로 노트 만들기<small>영상 주소와 내 메모로 노트 초안을 만들어요</small></b><button type="button" class="lna-ib" data-lna="ytx" aria-label="닫기">${I('x', 20)}</button></div>
      <div class="lna-sb">
        <label class="lna-fl" for="lnaYu">영상 주소</label><input id="lnaYu" class="lna-in" inputmode="url" maxlength="200" placeholder="https://youtu.be/…" value="${E(YS.url)}"><p class="lna-err" id="lnaYe" role="alert">${E(YS.err || '')}</p>
        ${vid ? `<div class="lna-ytp"><span class="th" style="background-image:url('https://i.ytimg.com/vi/${E(vid)}/mqdefault.jpg')"></span><span class="st off">자막 안 씀</span></div>` : ''}
        <label class="lna-fl" for="lnaYtt">제목</label><input id="lnaYtt" class="lna-in" maxlength="80" placeholder="예: 피벗 테이블 기초" value="${E(YS.t)}">
        <label class="lna-fl" for="lnaYm">영상에서 기억할 것 <em>필수</em></label><textarea id="lnaYm" class="lna-in ta" rows="4" maxlength="600" placeholder="예: 값 필드는 기본이 합계예요. 원본을 고치면 새로 고침해야 해요.">${E(YS.memo)}</textarea>
        <label class="lna-fl" for="lnaYl">붙일 레슨</label><select id="lnaYl" class="lna-in"><option value="">붙이지 않음</option>${L.map(x => `<option value="${E(x.v)}"${YS.cl === x.v ? ' selected' : ''}>${E(x.l)}</option>`).join('')}</select>
        <div class="lna-swr"><div><b>요약 노트 초안</b><small>핵심 · 질문 · 내 생각 틀</small></div><button type="button" class="lna-sw${YS.note ? ' on' : ''}" role="switch" aria-checked="${YS.note}" data-lna="ysw" data-v="note" aria-label="요약 노트 초안"></button></div>
        <div class="lna-swr"><div><b>복습 카드 3장</b><small>내 메모로 만들어요 · 첫 복습 내일</small></div><button type="button" class="lna-sw${YS.cards ? ' on' : ''}" role="switch" aria-checked="${YS.cards}" data-lna="ysw" data-v="cards" aria-label="복습 카드 3장"></button></div>
        <p class="ln-why lna-honest">${I('help', 16)}영상 내용은 읽지 않아요. 제목과 내 메모로 초안을 만들어요. 내 YouTube 계정 · 시청 기록은 쓰지 않아요.</p>
      </div><div class="sfoot"><button type="button" class="lna-b p big" data-lna="ymk">노트 초안 만들기</button></div></div></div>`; }
  function paintYt() { document.querySelectorAll('#lnaYt').forEach(x => x.remove()); if (!YS) { document.body.classList.remove('lna-on'); return; } document.body.insertAdjacentHTML('beforeend', ytHTML()); document.body.classList.add('lna-on'); }
  function ytRead() { const g = id => (document.getElementById(id) || {}).value; if (!YS) return; YS.url = (g('lnaYu') || '').trim(); YS.t = g('lnaYtt') || ''; YS.memo = g('lnaYm') || ''; YS.cl = g('lnaYl') || ''; }
  function openYt(pre) { if (!okMe()) { location.hash = '#login'; return; } const w = where(); YS = { url: '', t: '', memo: '', cl: w.c && w.it ? `${w.c.id}/${w.it.id}` : '', note: true, cards: true, err: '', ...(pre || {}) }; if (typeof LT === 'object' && LT.open && innerWidth <= 760) { LT.open = false; document.body.classList.remove('lt-on'); ltRender(); } paintYt(); setTimeout(() => { const i = document.getElementById(YS && YS.url ? 'lnaYm' : 'lnaYu'); if (i) i.focus(); }, 40); }
  function ytMake() { ytRead(); const m = YT.exec(YS.url); if (!m) { YS.err = 'YouTube 영상 주소를 넣어 주세요'; paintYt(); document.getElementById('lnaYu').focus(); return; } if (!YS.memo.trim()) { YS.err = ''; paintYt(); const e = document.getElementById('lnaYe'); if (e) e.textContent = '영상에서 기억할 것을 한 줄 이상 적어 주세요'; document.getElementById('lnaYm').focus(); return; }
    if (!YS.note && !YS.cards) { const e = document.getElementById('lnaYe'); if (e) e.textContent = '노트 초안이나 복습 카드 중 하나는 켜 주세요'; return; }
    const [cid, lid] = (YS.cl || '/').split('/'); const tt = YS.t.trim() || '영상 노트'; const M = YS.memo.split(/\n|(?<=[.!?。])\s+/).map(x => x.trim()).filter(Boolean);
    const body = [`영상: ${m[1].slice(0, 200)}`, '**핵심**', ...M.slice(0, 6).map(x => `- ${x.slice(0, 200)}`), '**질문**', '- 영상을 보고 남은 궁금한 점', '**내 생각**', '- 내 공부 · 일에 써 볼 곳'].join('\n').slice(0, 1500);
    const n = N.save({ src: 'yt', st: 'draft', t: tt.slice(0, 80), b: body, cid: cid || '', lid: lid || '', tags: ['영상'] }); if (!n) return; ORIG[n.id] = body;
    /* 퀴즈 3개 = 내 메모 줄로 만든 카드(앞: 질문 · 뒤: 내 메모) */
    const K = M.slice(0, 3).map((x, i) => ({ f: (i === 0 ? `「${tt.slice(0, 40)}」에서 기억할 것 하나는?` : i === 1 ? `${x.slice(0, 24)}… 다음은 무엇이었나요?` : `이 내용을 내 말로 설명하면?`).slice(0, 120), k: x.slice(0, 240) })); while (K.length < 3 && M[0]) K.push({ f: ['이 영상의 핵심을 한 줄로 말하면?', '이 영상을 어디에 써 볼 수 있을까요?'][K.length - 1] || '이 영상의 핵심은?', k: M[0].slice(0, 240) });
    PRE[n.id] = K; if (YS.cards) K.forEach(c => N.saveCard({ nid: n.id, f: c.f, k: c.k, src: 'note', due: tmr(), iv: 1, ef: 2.5, n: 0 }));
    YS = null; paintYt(); say('영상 노트 초안을 만들었어요. 확인하고 저장해 주세요'); N.open(n.id); }
  /* 튜터 입력에 영상 주소를 붙이면 같은 시트를 주소 · 제목이 채워진 채로 연다 */
  document.addEventListener('submit', e => { const f = e.target; if (!f || !okMe() || notesOff()) return; const ta = f.id === 'ltf' || f.id === 'laiF' ? f.querySelector('textarea') : null; if (!ta) return; const m = YT.exec(ta.value || ''); if (!m) return;
    e.preventDefault(); e.stopImmediatePropagation(); const rest = ta.value.replace(m[1], '').trim(); ta.value = ''; openYt({ url: m[1].slice(0, 200), t: rest.split('\n')[0].slice(0, 80), memo: rest.split('\n').slice(1).join('\n') }); }, true);

  addEventListener('hashchange', () => { if (WQ) { WQ = null; paintWrong(); } if (YS) { YS = null; paintYt(); } if (rt().a !== 'c') LASTQ = null; });

  /* ── FINAL S13 홈 「오늘의 셀프러닝」 카드(.ln-today) — 앱 홈 오늘 목표 아래 · 웹 학습 허브 ── */
  function todayHTML() { const D = N.due(); const A = N.all(); const dr = A.filter(n => n.st === 'draft'); const st = streak(); const wk = A.filter(n => n.at && Date.now() - Date.parse(n.at) < 7 * 864e5).length; const qz = D.filter(c => c.src === 'quiz').length; const tm = N.due(tmr()).filter(c => c.due > td()).length; const L = nextLesson();
    const pill = st ? `<span class="pill g">${I('flame', 15)}${st}일째</span>` : '';
    if (!A.length && !N.cards().length) return `<section class="ln-today first" aria-labelledby="lnaTd"><div class="h">${I('spark', 20)}<b id="lnaTd">나만의 노트를 시작해요</b></div><div class="r"><span class="ic g">${I('notep', 22)}</span><span class="tx"><b>레슨을 보며 튜터에게 「노트로 정리」를 눌러 보세요</b><span>초안을 고쳐 저장하면 복습 카드가 내일 찾아와요</span></span></div><div class="ft"><a class="lna-b p big" href="${L ? E(L.href) : '#notes'}">${L ? '이어 보던 레슨에서 시작하기' : '내 노트 열기'}</a></div></section>`;
    const rows = []; if (D.length) rows.push(`<a class="r" href="#review"><span class="ic g">${I('cards', 22)}</span><span class="tx"><b>복습 카드 ${D.length}장</b><span>약 ${Math.max(1, Math.round(D.length * 20 / 60))}분${qz ? ` · 오답 카드 ${qz}장 포함` : ''}</span></span>${I('chev', 18)}</a>`);
    if (dr.length) { const t = dr.filter(n => n.src === 'tutor').length, q = dr.filter(n => n.src === 'quiz').length, o = dr.length - t - q; rows.push(`<a class="r" href="#notes?f=draft" data-lna="todrafts"><span class="ic c">${I('pen', 22)}</span><span class="tx"><b>확인할 초안 ${dr.length}개</b><span>${[t && `튜터 요약 ${t}`, q && `오답 ${q}`, o && `기타 ${o}`].filter(Boolean).join(' · ')}</span></span>${I('chev', 18)}</a>`); }
    if (A.length) rows.push(`<a class="r" href="#notes"><span class="ic n">${I('doc', 22)}</span><span class="tx"><b>내 노트 ${A.length}개</b><span>${wk ? `이번 주 ${wk}개 더 썼어요` : '이번 주에도 한 줄 남겨 볼까요?'}</span></span>${I('chev', 18)}</a>`);
    if (!D.length && !dr.length) rows.unshift(`<div class="r"><span class="ic g">${I('check', 22)}</span><span class="tx"><b>오늘 복습을 다 했어요</b><span>${tm ? `내일 ${tm}장이 기다려요` : '내일은 쉬어 가도 돼요'}</span></span></div>`);
    const btn = D.length ? `<a class="lna-b p big" href="#review">복습 ${D.length}장 시작하기</a>` : dr.length ? `<a class="lna-b p big" href="#notes?f=draft" data-lna="todrafts">초안 확인하기</a>` : `<a class="lna-b s big" href="${L ? E(L.href) : '#notes'}">레슨 보며 노트 더 만들기</a>`;
    return `<section class="ln-today" aria-labelledby="lnaTd"><div class="h">${I('spark', 20)}<b id="lnaTd">오늘의 셀프러닝</b>${pill}</div>${rows.join('')}<div class="ft">${btn}</div></section>`; }
  function decoHome() { if (rt().a !== 'home' || !okMe() || notesOff()) return; const lm = document.getElementById('lm'); if (!lm || lm.querySelector('.ln-today')) return; const h = todayHTML();
    const g = lm.querySelector('.tb-goal'); if (g) { g.insertAdjacentHTML('afterend', `<div class="lna-hubw app">${h}</div>`); const D = N.due().length; const s = g.querySelector('.tb-gl strong'); if (D && s && !g.classList.contains('done')) s.textContent = `복습 ${D}장이면 오늘 목표를 채워요`; return; }
    const sh = lm.querySelector('.lhb-in > .lhb-shelf'); if (sh) { sh.insertAdjacentHTML('beforebegin', `<div class="lna-hubw">${h}</div>`); return; }
    const lc = lm.querySelector('.lux-cont'); if (lc) { lc.insertAdjacentHTML('beforebegin', `<div class="lna-hubw in">${h}</div>`); return; }
    const lai = lm.querySelector('.lai'); if (lai) lai.insertAdjacentHTML('afterend', `<div class="lna-hubw in">${h}</div>`); }


  /* ── 추가 지시 1(11-17): 주간 돌아보기 · 「이번 주 정리 노트」 튜터 초안 · 질문 + 받은 답 → 노트 초안 ──
     데이터는 읽기만 한다(새 저장 필드 없음). 화면 자리(학습 기록 탭 맨 위 · 질문 상세)는 개발자 1 — 여기는 함수와 카드 HTML(weeklyHTML)을 준다. */
  const weekStart = () => { const d = new Date(Date.now() + 9 * 3600e3); const dow = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - dow * 864e5).toISOString().slice(0, 10); }; /* 이번 주 월요일(한국 시각) */
  const kOf = iso => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + 9 * 3600e3).toISOString().slice(0, 10) : String(iso || '').slice(0, 10); };
  /* 이번 주(월~오늘) 레슨 n · 노트 n · 복습 n장 · 질문 n + 날짜별 학습일 */
  function weekly() { const from = weekStart(), to = kday(); const inW = iso => { const d = kOf(iso); return d >= from && d <= to; }; const L = [];
    Object.entries((LR.lp && LR.lp.cls) || {}).forEach(([cid, r]) => { const c = clsOf(cid); Object.entries((r && r.items) || {}).forEach(([iid, v]) => { if (v && v.done && v.at && inW(v.at)) { const it = itOf(c, iid); L.push({ cid, lid: iid, t: it ? it.title : iid, c: c ? c.name : '', at: v.at, score: v.score }); } }); });
    L.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const notes = N.all().filter(n => inW(n.at)).length;
    /* 복습: 카드에 복습 날짜 필드가 없으므로 마지막 복습일 = due - iv(채점이 due를 오늘 + iv로 정함)로 센다 */
    const cards = N.cards().filter(c => c.n > 0 && (() => { const d = N.addD(c.due, -c.iv); return d >= from && d <= to; })()).length;
    const ask = ((LR.lp && LR.lp.tutor && LR.lp.tutor.ask) || []).filter(x => inW(x.at)).length;
    const D = days(); const on = Object.keys(D).filter(d => d >= from && d <= to).length;
    return { from, to, lessons: L.length, notes, cards, asks: ask, days: on, streak: streak(), list: L }; }
  const weeklyLine = W => [`레슨 ${W.lessons}개`, `노트 ${W.notes}개`, `복습 ${W.cards}장`, `질문 ${W.asks}개`].join(' · ');
  const wkTitle = W => { const [, m, d] = W.from.split('-').map(Number); return `${m}월 ${Math.ceil(d / 7)}주 정리`; };
  const weeklyNote = W => N.all().find(n => n.src === 'tutor' && n.tags.includes('주간정리') && n.t === wkTitle(W)) || null;
  /* FINAL S24 「기록」 탭 맨 위 .ln-week(.ln-hero 변형) — 개발자 1이 넣거나, 자리가 없으면 아래 감싸기가 #notes 허브에 붙인다 */
  function weeklyHTML() { const W = weekly(); const end = N.addD(W.from, 6); const D = days(); const ex = weeklyNote(W); const mx = Math.max(1, ...Array.from({ length: 7 }, (_, i) => +D[N.addD(W.from, i)] || 0));
    const bars = Array.from({ length: 7 }, (_, i) => { const d = N.addD(W.from, i); const v = +D[d] || 0; return `<span class="${d === W.to ? 't' : ''}${d > W.to ? ' f' : ''}"><i style="height:${v ? Math.max(10, Math.round(v / mx * 30)) : 6}px"></i>${'월화수목금토일'[i]}</span>`; }).join('');
    const tile = (v, l) => `<div><b>${v ? v : '아직'}</b><span>${l}</span></div>`;
    return `<section class="ln-week lna-week" data-ln-weekly aria-labelledby="lnaWkT"><p class="ey"><i aria-hidden="true"></i>이번 주 · ${md2(W.from)} ~ ${W.from.slice(5, 7) === end.slice(5, 7) ? `${+end.slice(8)}일` : md2(end)}</p>
      <h3 id="lnaWkT">${W.lessons ? `이번 주에 레슨 ${W.lessons}개를 끝냈어요` : W.notes || W.cards ? '이번 주도 노트 · 복습을 이어 가고 있어요' : '이번 주는 아직 끝낸 레슨이 없어요'}</h3>
      <div class="kp">${tile(W.lessons, '레슨')}${tile(W.notes, '노트')}${tile(W.cards, '복습 장')}${tile(W.asks, '질문')}</div>
      <div class="wk" aria-label="이번 주 학습일 ${W.days}일">${bars}</div>
      ${ex ? `<a class="lna-b w big" href="#notes/${E(ex.id)}">${I('doc', 18)}이번 주 정리 노트 보기</a>` : `<button type="button" class="lna-b w big" data-lna="weekly">${I('spark', 18)}이번 주 정리 노트 만들기</button>`}</section>`; }
  /* 「이번 주 정리 노트」 튜터 초안(FINAL S24): 제목 「11월 3주 정리」, 본문 = 끝낸 레슨 · 남긴 노트 제목 · 틀린 문제 요약 + 학습자가 채울 줄. 이번 주에 이미 있으면 그 노트 */
  function weeklyDraft(o) { const W = weekly(); const ex = weeklyNote(W); if (ex) { if (o && o.open) N.open(ex.id); return ex; }
    const inW = n => { const d = kOf(n.at); return d >= W.from && d <= W.to; }; const NT = N.all().filter(n => inW(n) && n.src !== 'quiz' && !n.tags.includes('주간정리')).slice(0, 4); const QZ = N.all().filter(n => inW(n) && n.src === 'quiz').slice(0, 3);
    const lines = [`이번 주: ${weeklyLine(W)}`, ...W.list.slice(-5).map(x => `끝낸 레슨: ${x.c ? `${x.c} · ` : ''}${x.t}${x.score != null ? ` (확인 문제 ${x.score}점)` : ''}`), ...NT.map(n => `남긴 노트: ${n.t}`), ...QZ.map(n => `틀린 문제: ${(part(n.b, '문제') || n.t).slice(0, 60)}`)];
    if (lines.length === 1) lines.push('끝낸 레슨: 이번 주는 아직 없어요');
    lines.push('배운 것: (내 말로 한 줄)', '헷갈린 것: (질문 한 줄)', '다음 주에 할 것: (한 가지)');
    const body = lines.map(l => `- ${l}`).join('\n').slice(0, 1500); const n = N.save({ t: wkTitle(W), b: body, cid: (W.list[W.list.length - 1] || {}).cid || '', lid: '', tags: ['주간정리'], src: 'tutor', st: 'draft' }); if (!n) return null; ORIG[n.id] = body; PRE[n.id] = [];
    if (o && o.open) { say('튜터가 이번 주 정리 초안을 만들었어요. 빈칸을 내 말로 채워 주세요.'); N.open(n.id); } return n; }
  /* 노트로 옮기기(FINAL 추가 1 공통): 본문 = 「**질문** …\n**답** …\n원래 자리: <이름>」, src 'me' · st 'draft' · 태그 질문|댓글|글. 이름 · 학번 · 다른 학습자 이름은 넣지 않는다 */
  function moveToNote(x, o) { if (!x || !String(x.q || '').trim()) return null; const kind = ['질문', '댓글', '글'].includes(x.kind) ? x.kind : '질문'; const q = String(x.q).trim(), a = String(x.a || '').trim();
    const old = N.all().find(n => n.src === 'me' && norm(part(n.b, kind === '질문' ? '질문' : kind)) === norm(q)); if (old) { if (a && !part(old.b, '답')) N.save({ id: old.id, b: old.b.replace(/\*\*답\*\*[^\n]*/, `**답** ${a.slice(0, 900)}`) }); if (o && o.open) N.open(old.id); return N.get(old.id); }
    const b = [`**${kind}** ${q.slice(0, 500)}`, kind === '질문' ? (a ? `**답** ${a.slice(0, 900)}` : '**답** (아직 답을 기다리고 있어요)') : '', x.where ? `원래 자리: ${String(x.where).slice(0, 80)}` : ''].filter(Boolean).join('\n').slice(0, 1500);
    const n = N.save({ src: 'me', st: 'draft', t: `${kind} · ${q.replace(/\s+/g, ' ').slice(0, 70)}`.slice(0, 80), b, cid: clsOf(x.cid) ? x.cid : '', lid: x.lid && itOf(clsOf(x.cid), x.lid) ? x.lid : '', tags: [kind] }); if (!n) return null; ORIG[n.id] = b; PRE[n.id] = a ? [{ f: q.slice(0, 120), k: a.slice(0, 240) }] : [];
    if (o && o.open) { say(`${kind}${kind === '질문' ? '을' : '을'} 노트로 옮겼어요. 내 말로 정리해 주세요`); N.open(n.id); } return n; }
  /* 질문 + 받은 답 → 노트 초안. askId = LR.lp.tutor.ask[].id(받은 답 LR.mine.qa[]와 같은 id) */
  const askOf = id => { const A = ((LR.lp && LR.lp.tutor && LR.lp.tutor.ask) || []).find(x => String(x.id) === id); const Q = ((LR.mine && Array.isArray(LR.mine.qa)) ? LR.mine.qa : []).find(x => String(x.id) === id); return A || Q ? { A, Q } : null; };
  function qaToNote(askId, o) { const id = String(askId || ''); const r = id && askOf(id); if (!r) return null; const { A, Q } = r; const cid = (A && A.cid) || (Q && Q.cid) || '';
    return moveToNote({ kind: '질문', q: (A && A.q) || (Q && Q.q) || '', a: (Q && Q.a) || '', cid, where: (A && A.where) ? `AI 튜터 · ${A.where}` : 'AI 튜터' }, o); }
  /* 이미 옮긴 질문이면 그 노트(S23 「옮긴 노트 보기」) */
  function qaNote(askId) { const r = askOf(String(askId || '')); if (!r) return null; const q = (r.A && r.A.q) || (r.Q && r.Q.q) || ''; return N.all().find(n => n.src === 'me' && norm(part(n.b, '질문')) === norm(q)) || null; }
  /* 화면 자리가 아직 없을 때: #notes 허브(학습 기록 탭이 있으면 그 맨 위)에 주간 카드를 붙이고, 질문 줄에 「노트로 옮기기」를 붙인다 */
  function decoNotes() { if (rt().a !== 'notes' || rt().b || !okMe() || notesOff()) return; const lm = document.getElementById('lm'); if (!lm || lm.querySelector('.ln-week, .lna-week, [data-ln-weekly]')) return;
    const tab = lm.querySelector('[data-ln-tab="log"], .ln-log, .ln-tl'); const hub = lm.querySelector('.ln-hub .in'); if (tab) tab.insertAdjacentHTML('afterbegin', weeklyHTML()); else if (hub) { const at = hub.querySelector('.ln-drafts') || hub.querySelector('.ln-hero'); if (at) at.insertAdjacentHTML('afterend', weeklyHTML()); }
    lm.querySelectorAll('[data-ask-id]:not([data-lna-qa])').forEach(el => { el.dataset.lnaQa = '1'; if (el.querySelector('[data-lna="qa"]')) return; el.insertAdjacentHTML('beforeend', `<button type="button" class="lna-b s" data-lna="qa" data-v="${E(el.dataset.askId)}">${I('notep', 16)}노트로 옮기기</button>`); }); }

  /* ── 렌더 연결 ── */
  /* ltube.js · lkeep.js가 이 파일 뒤에서 lrender를 한 번 더 감싸 홈을 다시 그리므로, 꾸미기는 렌더 호출이 다 끝난 뒤(마이크로태스크)에 한다 */
  function deco() { try { if (SITE() && SITE().org) { decoHome(); decoNotes(); if (rt().a === 'c') decoQuiz(); if (WQ && !document.getElementById('lnaWrong')) paintWrong(); if (YS && !document.getElementById('lnaYt')) paintYt(); decoTutor(); } } catch (e) { console.error('lnote-ai deco', e); } }
  { const base = lrender; lrender = (...a) => { const r = base(...a); Promise.resolve().then(deco); return r; }; }
  N.on(k => { if (k === 'grade') return; try { if (rt().a === 'home') { document.querySelectorAll('#lm .lna-hubw').forEach(x => x.remove()); decoHome(); } } catch (e) { } });

  /* ── 클릭 ── */
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-lna]'); if (!el) return; const k = el.dataset.lna; if (!k) return;
    if (k === 'todrafts') { try { sessionStorage.setItem('didisam.lnote.f', 'draft'); } catch (x) { } return; } /* 허브가 초안만 거르도록(개발자 1 #notes?f=draft) */
    e.preventDefault();
    if (k === 'edit') { const d = DR[el.dataset.v]; if (!d) { say('초안을 찾지 못했어요. 칩을 다시 눌러 주세요.', 'warn'); return; } openDraft(d); return; }
    if (k === 'discard') { const d = DR[el.dataset.v]; if (d && d.nid && N.get(d.nid) && N.get(d.nid).st === 'draft') N.del(d.nid); delete DR[el.dataset.v]; const m = (LT.msgs || []).find(x => x.h && x.h.includes(`data-dk="${el.dataset.v}"`)); if (m) { m.h = '<p class="lna-gone">초안을 버렸어요. 저장된 것은 없어요.</p>'; ltRender(); syncHome(); } return; }
    if (k === 'undo') { const u = UNDO; UNDO = null; document.querySelectorAll('.lna-toast').forEach(x => x.remove()); if (u) u(); return; }
    if (k === 'seek') { const t = +el.dataset.v; try { const p = typeof LW === 'object' && LW && LW.yp; if (p && typeof p.seekTo === 'function') p.seekTo(t, true); else { const v = document.querySelector('#lm video'); if (v) { v.currentTime = t; if (v.play) v.play().catch(() => { }); } } } catch (x) { } return; }
    if (k === 'wrong') { openWrong(el.dataset.c || '', el.dataset.l || ''); return; }
    if (k === 'wclose') { WQ = null; paintWrong(); say('남은 오답노트 초안은 「확인할 초안」에 있어요.'); return; }
    if (k === 'wskip') { wrongNext(); return; }
    if (k === 'wok') { WQ.why = (document.getElementById('lnaWhyT') || {}).value || ''; wrongOk(); return; }
    if (k === 'reason') { WQ.why = (document.getElementById('lnaWhyT') || {}).value || ''; WQ.reason = WQ.reason === el.dataset.v ? '' : el.dataset.v; paintWrong(); return; }
    if (k === 'qretry') { const f = document.getElementById('qz') || document.getElementById('a2qz'); if (f) { f.reset(); f.scrollIntoView({ block: 'start', behavior: 'smooth' }); const i = f.querySelector('input,textarea'); if (i) i.focus({ preventScroll: true }); } return; }
    if (k === 'keep' || k === 'kcard') { const x = msgOf(el.dataset.v); if (!x) return; if (k === 'keep') { openDraft(answerDraft(x.m.t, x.q)); return; }
      const f = (x.q || split(x.m.t, 1)[0] || '').slice(0, 120), kk = (split(x.m.t, 1)[0] || String(x.m.t)).slice(0, 240); const c = N.saveCard({ nid: '', f, k: kk, src: 'note', due: tmr(), iv: 1, ef: 2.5, n: 0 }); if (c) undoToast('복습 카드 1장을 만들었어요', '내일 복습에 나와요', () => { N.delCard(c.id); say('카드를 지웠어요.'); }); return; }
    if (k === 'ytx') { YS = null; paintYt(); return; }
    if (k === 'ysw') { ytRead(); YS[el.dataset.v] = !YS[el.dataset.v]; paintYt(); return; }
    if (k === 'ymk') { ytMake(); return; }
    if (k === 'yt') { openYt(); return; }
    if (k === 'weekly') { const n = weeklyDraft({ open: true }); if (!n) say('정리 노트를 만들지 못했어요. 노트 수를 확인해 주세요.', 'warn'); return; }
    if (k === 'qa') { const n = qaToNote(el.dataset.v, { open: true }); if (!n) say('질문을 찾지 못했어요.', 'warn'); return; } });
  document.addEventListener('input', e => { const t = e.target; if (!t) return; if (t.id === 'lnaWhyT' && WQ) { WQ.why = t.value; const kk = document.getElementById('lnaKk'); const n = N.get(WQ.ids[WQ.i]); if (kk && n) kk.textContent = `${part(n.b, '정답')}${t.value.trim() ? ` — ${t.value.trim()}` : ''}`.slice(0, 240); const w = document.getElementById('lnaWW'); if (w) w.textContent = ''; } if (t.id === 'lnaYu' && YS) { const was = !!YT.exec(YS.url); ytRead(); if (!!YT.exec(YS.url) !== was) { const p = t.selectionStart; paintYt(); const n = document.getElementById('lnaYu'); if (n) { n.focus(); n.setSelectionRange(p, p); } } } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && (WQ || YS)) { e.preventDefault(); e.stopImmediatePropagation(); if (YS) { YS = null; paintYt(); } else { WQ = null; paintWrong(); } } }, true);

  /* 개발자 1 · 3 화면이 부르는 훅(FINAL S04 · S05 · S20) */
  window.LNOTE_AI = { weekly, weeklyHTML, weeklyDraft, qaToNote, qaNote, moveToNote, diffLines, orig: origOf, hint, suggestCards, suggest, openYt, openWrong, openDraft, ruleDraft, recordWrong, lessonDraft, todayDraft, todayHTML, streak, norm, undoToast };
})();
