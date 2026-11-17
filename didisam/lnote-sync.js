/* v43.6 셀프러닝 노트 — 연결 · 목표(개발자 3, 시안 A3) · 대표님(2026-11-17) 「자기 노트 만들어 관리 … 해당 키를 연결해서 서비스」
   이 파일 = 학습자 쪽 「밖으로 · 목표」:
   ① #notes/out 내보내기 · 연결 허브(앱 화면 · 웹 화면, 웹 #notes에서는 오른쪽 패널) — Notion · Google Docs 자동 보내기(기본 꺼짐) · .md · .csv 내려받기 · 보내는 것 / 보내지 않는 것
   ② Notion 연결 시트(3단계: 통합 만들기 → 키 넣기 → 페이지) · Google Docs 연결 시트(Google 계정, 데모)
      키는 이 기기 저장소(localStorage)에만, 화면에는 접두 + 끝 4자리만. LR.lp(서버 학습 기록)에는 넣지 않는다. AI 튜터는 키를 받지 않는다.
      운영: PUT /api/pub/<tid>/conn/notion — 서버가 AES-GCM으로 암호화 보관하고 응답은 끝 4자리만. 보내기는 POST /api/pub/<tid>/notes/sync(서버 프록시 → Notion pages.create · Google Docs API). 아직 서버 경로 없음(남은 일).
   ③ 수료증(#cert/<과정>) 「LinkedIn 프로필에 추가」 — linkedin.com/profile/add 주소만 연다(서버 호출 · 토큰 없음). 공식 버튼 이미지 대신 글자 타일 「L」 + 텍스트 버튼(통합 결정 ①).
   ④ 시험 목표 시트(국가자격 종목 검색 · 시험일 · 하루 시간) → LNOTE.goal · ⑤ #notes/goal 역산 계획(4단계) · 이번 주 할 일(LR.lp.tutor.plan) · 내 일정(lcal.js lcalAdd) · .ics
      시험 일정은 예시값. 운영: 공공데이터포털 한국산업인력공단 「국가자격 시험일정」 API — 서버 키로 프록시(학습자에게 키 노출 없음).
   기관 스위치: 게시본 SITE().lnote = { off(true면 노트 기능 숨김), sync(기본 true), tutor, file, yt, ytcap, goal, linkedin }(스튜디오 저장 S.settings.lnote)(스튜디오 「외부 연결 › 학습자가 쓰는 연결」, connx.js). 없으면 ytcap(자막 요약)만 꺼짐.
   데이터는 window.LNOTE(lnote.js) API로만 바꾼다. LNOTE가 없으면(단독 시험) 같은 계약의 최소 대체물을 쓴다.
   learner.html에서 lnote-ai.js(없으면 lnote.js) 다음. */
'use strict';
(() => {
  if (typeof viewPage !== 'function' || typeof LR !== 'object' || typeof lrender !== 'function') return;
  /* ── LNOTE(없으면 최소 대체 — 계약과 같은 모양) ── */
  const shim = (() => { const N = () => { LR.lp = LR.lp || {}; const o = LR.lp.notes = LR.lp.notes && typeof LR.lp.notes === 'object' ? LR.lp.notes : { v: 1, items: [], cards: [], goal: null, sync: {} }; o.items = o.items || []; o.cards = o.cards || []; o.sync = o.sync || {}; return o; };
    const sv = () => { try { LR.api.save(); } catch (e) { } }; const id = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return { all: () => N().items.slice(), get: i => N().items.find(x => x.id === i) || null, cards: () => N().cards.slice(), cName: () => '', iName: () => '', SRCN: {},
      save(p) { const L = N().items; const o = p.id && L.find(x => x.id === p.id); const t = new Date().toISOString(); if (o) Object.assign(o, p, { up: t }); else L.unshift({ id: id('n'), t: '', b: '', cid: '', lid: '', tags: [], src: 'me', st: 'draft', pin: false, at: t, up: t, ...p }); sv(); return o || L[0]; },
      goal(g) { const o = N(); if (g === undefined) return o.goal; o.goal = g; sv(); return g; }, sync(k, v) { const o = N(); if (k === undefined) return o.sync; if (v === null) delete o.sync[k]; else o.sync[k] = v; sv(); return o.sync[k] || null; },
      md: n => `# ${n.t}\n\n${n.b}\n`, on: () => () => { } }; })();
  const LN = () => (window.LNOTE && typeof window.LNOTE.save === 'function' ? window.LNOTE : shim);
  const lp = () => LR.lp || {};
  const S0 = () => { try { return SITE() || {}; } catch (e) { return {}; } };
  const ty = () => (S0().org || {}).type || 'adult';
  const U = () => /^univ/.test(ty());
  const F = k => { const o = S0().lnote; const d = { notes: true, tutor: true, sync: true, file: true, yt: true, ytcap: false, goal: true, linkedin: true }; if (!o || typeof o !== 'object') return d[k]; if ((o.off === true || o.notes === false) && k !== 'linkedin') return false; if (k === 'notes') return true; return typeof o[k] === 'boolean' ? o[k] : d[k]; };
  const app = () => document.body.classList.contains('lapp');
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const T = (m, k) => { try { toast(m, k || 'ok'); } catch (e) { } };
  const pad = n => String(n).padStart(2, '0');
  const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addD = (s, n) => { const d = dd(s); d.setDate(d.getDate() + n); return ds(d); };
  const td = () => ds(new Date());
  const WD = '일월화수목금토';
  const md = s => `${+s.slice(5, 7)}/${+s.slice(8)}`;
  const kday = s => `${s.slice(0, 4)}년 ${+s.slice(5, 7)}월 ${+s.slice(8)}일(${WD[dd(s).getDay()]})`;
  const dleft = s => Math.round((dd(s) - dd(td())) / 864e5);
  const who = () => `${LR.tid || 'x'}.${(LR.me && (LR.me.sid || LR.me.id)) || 'guest'}`;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
  const stamp = () => td().replace(/-/g, '');
  const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  /* 선 아이콘(24 그리드 · 1.75) */
  const P = { back: 'M15 5l-7 7 7 7', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12.5l4.5 4.5L19 7', plus: 'M12 5v14M5 12h14', down: 'M12 4v11M7 10l5 5 5-5M5 20h14', redo: 'M20 12a8 8 0 11-2.34-5.66M20 4v5h-5', lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3', eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z', shield: 'M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6zM9 12l2 2 4-4', doc: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5', star: 'M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z', flag: 'M6 21V4M6 4h11l-2 4 2 4H6', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z', link: 'M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1', img: 'M4 5h16v14H4zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM20 15l-5-5-9 9', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4', cal: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4', pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01', chev: 'M9 6l6 6-6 6', out: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6' };
  const I = (k, s = 20) => `<svg class="lns-i" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" focusable="false"><path d="${P[k] || P.info}"/></svg>`;
  const LG = (id, px) => typeof window.brandLogo === 'function' ? window.brandLogo(id, px) : `<span class="lns-lt" style="width:${px}px;height:${px}px">${E(String(id).slice(0, 1).toUpperCase())}</span>`;
  const LT = (ch, px) => `<span class="lns-lt" aria-hidden="true" style="width:${px}px;height:${px}px;font-size:${Math.round(px * .5)}px">${E(ch)}</span>`; /* brand.js에 없는 서비스 = 글자 타일(회사 로고 흉내 금지) */

  /* ── 노트 집계 ── */
  const okNotes = () => LN().all().filter(n => n.st === 'ok');
  const drafts = () => LN().all().filter(n => n.st === 'draft');
  const sync = () => LN().sync() || {};
  const onN = () => ['notion', 'gdocs'].filter(k => (sync()[k] || {}).on).length;
  const ago = iso => { const t = Date.parse(iso || ''); if (!t) return ''; const m = Math.max(0, Math.round((Date.now() - t) / 6e4)); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; };

  /* ── 비밀값: 이 기기에만 ── */
  const KEY = k => `didisam.note.key.${k}`; /* FINAL 0-11: 시연판 = localStorage['didisam.note.key.notion'](LR.lp에 넣지 않음) */
  const keyGet = k => ls.get(KEY(k)) || '';
  const mask = v => { v = String(v || ''); const m = v.match(/^(secret_|ntn_)/); return v ? `${m ? m[1] : ''}${'•'.repeat(m ? 8 : 4)}${v.slice(-4)}` : ''; };
  /* 보관 문구(FINAL S17): 서버 경로(PUT /api/pub/<tid>/conn/notion)가 생기기 전에는 운영 모드에서도 이 기기에 두므로 「이 기기에만」 문구를 쓴다.
     운영: 서버 암호화 보관이 연결되면 SERVER_KEY=true → 「키는 암호화해 보관하고 끝 4자리만 보여요. AI 튜터는 키를 묻지 않아요.」 */
  const SERVER_KEY = false;
  const KEEP_TXT = () => SERVER_KEY && LR.mode === 'live' ? '키는 암호화해 보관하고 끝 4자리만 보여요. AI 튜터는 키를 묻지 않아요.' : '키는 이 기기에만 저장돼요. AI 튜터는 키를 묻지 않아요.';
  const RE_N = /^(secret_|ntn_)[A-Za-z0-9]{20,}$/;

  /* ── 내보내기 파일 ── */
  function mdBundle(o) { o = o || {}; const L = LN().all().filter(n => (o.all || n.st === 'ok') && (!o.cid || n.cid === o.cid)); const by = new Map(); L.forEach(n => { const c = (LN().cName && LN().cName(n.cid)) || '과정 밖 노트'; if (!by.has(c)) by.set(c, []); by.get(c).push(n); });
    const out = [`# ${(S0().org || {}).name || '디디쌤'} 학습 노트`, '', `${new Date().toLocaleDateString('ko-KR')} 디디쌤에서 내보냈어요. ${o.all ? '노트' : '확인한 노트'} ${L.length}개${o.all && L.some(n => n.st === 'draft') ? '(확인 전 초안은 제목 뒤 「초안」 표시)' : ''}.`, ''];
    if (!L.length) out.push(o.cid ? '이 과정에 확인한 노트가 아직 없어요.' : '아직 확인한 노트가 없어요.', '');
    by.forEach((A, c) => { out.push(`## ${c}`, ''); A.forEach(n => out.push(String(LN().md(n) || '').replace(/^# /, '### ').replace(/\n#(?=\s)/g, '\n####'), '')); });
    const Pn = Array.isArray((lp().tutor || {}).plan) ? lp().tutor.plan : []; if (Pn.length && !o.cid) out.push('## AI 튜터와 세운 학습 계획', '', ...Pn.map(x => `- [ ] ${x.d || ''} · ${x.t || ''}${x.m ? ` (${x.m}분)` : ''}`), '');
    out.push('---', o.all ? '이름 · 연락처 · 학번은 넣지 않았어요. 튜터 대화 원문은 넣지 않았어요.' : '이름 · 연락처 · 학번은 넣지 않았어요. 확인 전 초안과 튜터 대화 원문도 넣지 않았어요.'); return out.join('\n').replace(/\n{3,}/g, '\n\n'); }
  function csvCards() { const C = LN().cards(); const e = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const src = c => { const n = c.nid && LN().get(c.nid); if (!n) return c.src === 'quiz' ? '오답' : ''; const a = LN().cName ? LN().cName(n.cid) : ''; const b = n.lid && LN().iName ? LN().iName(n.cid, n.lid) : ''; return [a, b].filter(Boolean).join(' › '); };
    return { n: C.length, text: '﻿' + ['앞면,뒷면,출처', ...C.map(c => [c.f, c.k, src(c)].map(e).join(','))].join('\r\n') }; }

  /* ── ① 내보내기 · 연결 허브 ── */
  function syncRow(k) { const s = sync()[k] || {}; const on = !!s.on; const n = okNotes().length;
    const nm = k === 'notion' ? 'Notion' : 'Google Docs';
    const d = k === 'notion' ? (on ? `「${s.page || '디디쌤 학습 노트'}」 · 노트 ${n}개${keyGet('notion') ? ` · 키 ${mask(keyGet('notion'))}` : ''}` : '확인한 노트가 내 Notion 페이지에 쌓여요') : (on ? `과정마다 문서 1개 · 노트 ${n}개` : '과정별 문서로 내 Drive에 모아요');
    return `<div class="lns-row" data-sync="${k}">${LG(k === 'notion' ? 'notion' : 'google', 44)}<span class="lns-tx"><b>${nm} <em class="lns-st ${on ? 'on' : 'off'}">${on ? '켜짐' : '꺼짐'}</em></b><small>${E(d)}</small></span>${on ? `${app() ? '' : `<button type="button" class="lns-b s sm" data-lns="off" data-v="${k}">끄기</button>`}<button type="button" class="lns-c on" data-lns="${k}" aria-label="${nm} 관리">${I('check', 20)}</button>` : `<button type="button" class="lns-c" data-lns="${k}" aria-label="${nm} 연결하기">${I('plus', 20)}</button>`}</div>`; }
  function outBody() { const S = sync(); const N = LN().all(); const C = LN().cards(); const ok = okNotes().length, dr = drafts().length, on = onN(); const err = ls.get(KEY('notion') + '.err');
    const last = ['notion', 'gdocs'].map(k => S[k]).filter(x => x && x.on && x.at).sort((a, b) => a.at < b.at ? 1 : -1)[0]; const lastK = last === S.notion ? 'Notion' : 'Google Docs';
    const ey = err ? `<p class="lns-ey bad"><i></i>Notion이 키를 거절했어요 — 키를 다시 넣어 주세요</p>` : `<p class="lns-ey"><i></i>${on ? (last ? `${lastK}에 ${ago(last.at)} 보냈어요` : '연결을 켰어요. 지금 보내 보세요') : '아직 켜 둔 연결이 없어요'}</p>`;
    const cta = !F('sync') ? (F('file') ? `<button type="button" class="lns-b w" data-lns="md">${I('down', 18)} 노트 전체 내려받기(.md)</button>` : '') : err ? `<button type="button" class="lns-b w" data-lns="notion">${I('lock', 18)} 키 다시 넣기</button>` : on ? `<button type="button" class="lns-b w" data-lns="send">${I('redo', 18)} 지금 다시 보내기</button>` : `<button type="button" class="lns-b w" data-lns="notion">${LG('notion', 24)} Notion 연결하기</button>`;
    const hero = `<section class="lns-hero">${ey}<h2>${N.length || C.length ? `노트 ${N.length}개와 복습 카드 ${C.length}장,` : '노트와 복습 카드를'}<br>내가 쓰는 앱에서도 이어 봐요</h2>
      <div class="lns-kpis"><div class="lns-kpi"><b>${on ? ok : '꺼짐'}</b><span>보낸 노트</span></div><div class="lns-kpi"><b>${dr || '초안 없음'}</b><span>확인 전 초안</span></div><div class="lns-kpi"><b>${on ? on + '곳' : '꺼짐'}</b><span>켜진 연결</span></div></div>${cta}</section>`;
    const auto = F('sync') ? `<section class="lns-grp"><div class="lns-gh"><b>자동으로 보내기</b><em>확인한 노트만</em></div>${syncRow('notion')}${syncRow('gdocs')}</section>` : `<p class="lns-off">${I('lock', 16)} 이 기관은 Notion · Google Docs 보내기를 쓰지 않아요. 파일로 내려받아 옮길 수 있어요.</p>`;
    const files = F('file') ? `<section class="lns-grp"><div class="lns-gh"><b>파일로 내려받기</b></div>
      <div class="lns-row"><span class="lns-ft">${I('doc', 20)}</span><span class="lns-tx"><b>노트 전체 (.md)</b><small>${ok ? `확인한 노트 ${ok}개 · Notion · Obsidian에서 바로 열려요` : '확인한 노트가 생기면 과정별로 묶어 드려요'}</small></span><button type="button" class="lns-c" data-lns="md" aria-label="노트 전체 내려받기">${I('down', 20)}</button></div>
      <div class="lns-row"><span class="lns-ft">${I('star', 20)}</span><span class="lns-tx"><b>${C.length ? `복습 카드 ${C.length}장 (.csv)` : '복습 카드 (.csv)'}</b><small>${C.length ? 'Anki · Quizlet 가져오기 형식이에요' : '아직 카드가 없어요'}</small></span>${C.length ? `<button type="button" class="lns-c" data-lns="csv" aria-label="복습 카드 내려받기">${I('down', 20)}</button>` : '<a class="lns-b s sm" href="#notes">노트에서 카드 만들기 ›</a>'}</div></section>` : '';
    const pv = `<section class="lns-pv"><div><h5>${I('check', 14)}보내는 것</h5><ul><li>제목 · 본문 · 태그</li><li>과정 · 레슨 이름</li><li>만든 · 고친 날짜</li></ul></div><div class="no"><h5>${I('lock', 14)}보내지 않는 것</h5><ul><li>이름 · 학번 · 연락처</li><li>확인 전 초안</li><li>튜터 대화 원문</li></ul></div></section>`;
    return `${hero}${auto}${files}${pv}`; }
  const topBar = title => `<h1 class="lns-sr">${E(title)}</h1>`; /* 앱 위 줄(lapp.js barHTML)이 이 제목을 읽어 뒤로 · 제목을 그린다 */
  const fade = () => '<div class="ln-fade lns-fade" aria-hidden="true"></div>'; /* FINAL 1절: 탭바 뒤 페이드(아래 내용 비침 방지) */
  function outPage() { if (!F('notes') || (!F('sync') && !F('file'))) return offPage('내보내기 · 연결');
    if (app()) return `<div class="lns lns-app">${topBar('내보내기 · 연결')}<div class="lns-sc">${outBody()}<button type="button" class="lns-a lns-help" data-lns="help">${I('info', 18)} 무엇을 보내고 무엇을 안 보내나요?</button></div>${fade()}</div>`;
    return `${typeof lPageHead === 'function' ? lPageHead({ key: 'notes', title: '내보내기 · 연결', eyebrow: '셀프러닝 노트', desc: '확인한 노트를 Notion · Google Docs로 보내거나 파일로 받아요. 키는 이 기기에만 저장돼요.', crumb: '<a href="#notes">내 노트</a> › 내보내기 · 연결', cta: null }) : ''}<section class="sec"><div class="in lns lns-web"><div class="lns-wcol">${outBody()}</div></div></section>`; }
  const offPage = t => `<section class="sec"><div class="in narrow lns"><h1>${E(t)}</h1><p class="lead">이 기관은 이 기능을 쓰지 않아요.</p><a class="lns-b s" href="#notes">내 노트로</a></div></section>`;

  /* ── 시트(앱 = 하단 시트, 웹 = 오른쪽 패널 480) ── */
  function sheet(html, kind) { close(); const w = document.createElement('div'); w.className = 'lns-dim'; w.id = 'lnsSheet'; const pn = !app() && innerWidth > 760;
    w.innerHTML = `<div class="${pn ? 'lns-panel' : 'lns-sheet'}" role="dialog" aria-modal="true" data-k="${E(kind || '')}">${pn ? '' : '<i class="lns-hn" aria-hidden="true"></i>'}${html}</div>`; document.body.appendChild(w);
    w.addEventListener('click', e => { if (e.target === w) close(); }); const f = w.querySelector('input:not([type=hidden]), button'); setTimeout(() => { try { (w.querySelector('[autofocus]') || f).focus({ preventScroll: true }); } catch (e) { } }, 30); return w; }
  function close() { const o = document.getElementById('lnsSheet'); if (o) o.remove(); }
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  const shHead = (logo, t, s) => `<div class="lns-shh">${logo}<span class="lns-t"><b>${E(t)}</b><span>${E(s)}</span></span><button type="button" class="lns-x" data-lns="close" aria-label="닫기">${I('x', 20)}</button></div>`;
  const why = R => `<div class="lns-why">${R.map(([a, b]) => `<div><b>${E(a)}</b><span>${E(b)}</span></div>`).join('')}</div>`;

  /* ② Notion 연결 시트 */
  function notionSheet(stepN) { const has = keyGet('notion'); const s = sync().notion || {}; const n = stepN || (has ? 3 : 2);
    const steps = [['통합 만들기'], ['키 넣기'], ['페이지 고르기']].map(([t], i) => `<div class="${i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''}"><i>${i + 1 < n ? '✓ ' : ''}${i + 1}</i><b>${t}</b></div>`).join('');
    sheet(`${shHead(LG('notion', 48), 'Notion으로 노트 보내기', '확인한 노트가 내 Notion 페이지에 쌓여요')}<div class="lns-steps">${steps}</div>
      <form class="lns-f" id="lnsNotion" novalidate autocomplete="off">
        <div class="lns-fl"><label for="lnsKey">Notion 통합 키 <button type="button" class="lns-a" data-lns="guide">따라 하기 ›</button></label>
          <div class="lns-inp">${I('lock', 20)}<input id="lnsKey" name="k" type="password" autocomplete="off" spellcheck="false" maxlength="120" placeholder="${has ? E(mask(has)) + ' — 바꾸려면 새 키' : 'secret_ 또는 ntn_으로 시작'}" aria-describedby="lnsKeyH"><button type="button" class="lns-ib" data-lns="peek" aria-label="3초만 보기">${I('eye', 20)}</button></div>
          <p class="lns-hint" id="lnsKeyH">Notion › 설정 › 연결 › 「통합 만들기」에서 내부 통합 시크릿을 복사해 붙여 넣어요.</p><div class="lns-guide" hidden><ol><li>notion.so/my-integrations에서 「새 통합」을 만들어요(유형: 내부).</li><li>「내부 통합 시크릿」을 복사해 위 칸에 붙여 넣어요.</li><li>노트를 받을 Notion 페이지에서 「⋯ › 연결 추가」로 이 통합을 허용해요.</li></ol></div></div>
        <div class="lns-fl"><label for="lnsPage">보낼 페이지</label><div class="lns-inp">${I('doc', 20)}<input id="lnsPage" name="p" maxlength="60" list="lnsPages" value="${E(s.page || '디디쌤 학습 노트')}" placeholder="Notion 페이지 이름"></div><datalist id="lnsPages"><option value="디디쌤 학습 노트"><option value="공부 기록"></datalist><p class="lns-hint">목록에 없으면 페이지에서 「⋯ › 연결 추가」로 통합을 허용해 주세요.</p></div>
        ${why([['무엇을', '확인한 노트의 제목 · 본문 · 태그 · 과정 이름'], ['왜', '내 Notion에서 노트를 이어 정리하려고요'], ['끄면', '이 기기에 둔 키를 바로 지워요. 이미 보낸 페이지는 Notion에 남아요.']])}
        <p class="lns-safe">${I('shield', 16)} ${KEEP_TXT()}</p><p class="lns-err" role="alert"></p>
        <div class="lns-acts"><button type="button" class="lns-b s" data-lns="close">나중에</button><button type="submit" class="lns-b p">${s.on ? '저장하고 다시 보내기' : '연결하고 1개 시험 보내기'}</button></div>
        ${s.on ? '<button type="button" class="lns-a lns-offb" data-lns="off" data-v="notion">연결 끄고 키 지우기</button>' : ''}</form>`, 'notion'); }
  function gdocsSheet() { const s = sync().gdocs || {};
    sheet(`${shHead(LG('google', 48), 'Google Docs로 노트 보내기', '과정마다 문서 1개 「디디쌤 노트 — 과정」를 만들어요')}<div class="lns-steps"><div class="done"><i>✓ 1</i><b>준비</b></div><div class="cur"><i>2</i><b>Google 계정</b></div><div><i>3</i><b>시험 보내기</b></div></div>
      ${why([['무엇을', '확인한 노트의 제목 · 본문 · 태그 · 과정 이름'], ['왜', '내 Google Drive에서 과정별 문서로 모아 보려고요'], ['끄면', '연결을 바로 끊어요. 이미 만든 문서는 Drive에 남아요.']])}
      <p class="lns-safe">${I('shield', 16)} 디디쌤이 만든 문서에만 접근해요(drive.file). 다른 파일은 보지 않아요.</p>
      <div class="lns-acts"><button type="button" class="lns-b s" data-lns="close">나중에</button><button type="button" class="lns-b p" data-lns="gdocs-on">${LG('google', 22)} ${s.on ? '다시 보내기' : 'Google 계정으로 연결'}</button></div>${s.on ? '<button type="button" class="lns-a lns-offb" data-lns="off" data-v="gdocs">연결 끊기</button>' : ''}`, 'gdocs'); }
  function sendNow(only) { const S = sync(); const K = (only ? [only] : ['notion', 'gdocs']).filter(k => (S[k] || {}).on); if (!K.length) return T('켜 둔 연결이 없어요. Notion이나 Google Docs를 먼저 연결해 주세요.', 'warn');
    if (K.includes('notion') && !keyGet('notion')) { notionSheet(2); return T('이 기기에 Notion 키가 없어요. 키를 다시 넣어 주세요.', 'warn'); }
    /* 운영: POST /api/pub/<tid>/notes/sync { to:['notion'|'gdocs'] } — 서버가 확인한 노트(st:'ok')만 보내고 결과 개수를 돌려준다. 시연판: 성공 기록 + .md 묶음 내려받기 */
    const at = new Date().toISOString(); K.forEach(k => LN().sync(k, Object.assign({}, S[k], { on: true, at }))); ls.del(KEY('notion') + '.err');
    dl(`didisam-notes-${stamp()}.md`, mdBundle(), 'text/markdown;charset=utf-8'); T(`확인한 노트 ${okNotes().length}개를 보냈어요(시연: .md 묶음도 내려받았어요).`); rer(); }
  function offSync(k) { const nm = k === 'notion' ? 'Notion' : 'Google Docs';
    if (!confirm(k === 'notion' ? '키를 지우고 보내기를 멈출까요?' : 'Google Docs 보내기를 멈출까요?')) return; if (k === 'notion') { ls.del(KEY('notion')); ls.del(KEY('notion') + '.err'); }
    /* 운영: DELETE /api/pub/<tid>/conn/<k> — 서버 보관 키 · 토큰 파기 */ LN().sync(k, { on: false, at: '', ...(k === 'notion' ? { page: '' } : {}) }); close(); T(`${nm} 보내기를 껐어요.${k === 'notion' ? ' 이 기기의 키도 지웠어요.' : ''}`); rer(); }
  const rer = () => { try { lrender(); } catch (e) { } const p = document.getElementById('lnsPanelOut'); if (p) p.querySelector('.lns-pbody').innerHTML = outBody(); };

  /* 웹 #notes: 오른쪽 패널로 열기(같은 화면 유지) */
  function outPanel() { sheet(`<div class="lns-shh"><span class="lns-t"><b>내보내기 · 연결</b><span>확인한 노트만 보내요</span></span><button type="button" class="lns-x" data-lns="close" aria-label="닫기">${I('x', 20)}</button></div><div class="lns-pbody">${outBody()}</div>`, 'out'); const p = document.querySelector('#lnsSheet .lns-panel, #lnsSheet .lns-sheet'); if (p) p.id = 'lnsPanelOut'; }

  /* ── S25 탈퇴 · 수료 전 내보내기 ── */
  const GOT = { md: false, csv: false, notion: false }; /* 이 화면에서 내려받았는지(탈퇴 확인 한 번 더) */
  const askN = () => { try { return Array.isArray((lp().tutor || {}).ask) ? lp().tutor.ask.length : 0; } catch (e) { return 0; } };
  function leaveHTML() { const nN = LN().all().length, nC = LN().cards().length, nQ = askN(); const nOn = !!(sync().notion || {}).on && F('sync');
    const bt = (k, lab, done, ic) => `<button type="button" class="lns-b ${done ? 'got' : 's'}" data-lns="${k}" data-leave="1">${I(done ? 'check' : ic, 18)}${done ? lab.replace(/^(.+?)( \.\w+)?$/, (m, a, b) => `${a}${b || ''} 받음`) : lab}</button>`;
    return `<div class="ln-leave lns-leave" role="note"><b class="lns-lh">${I('info', 20)} 탈퇴하면 노트도 지워져요</b><p>${nN || nC || nQ ? `노트 ${nN}개 · 복습 카드 ${nC}장 · 질문 ${nQ}개는 이 계정에만 있어요. 먼저 내 기기로 내보내 두세요.` : '노트 · 복습 카드 · 질문은 이 계정에만 있어요. 탈퇴하면 학습 기록과 함께 지워져요.'}</p>
      <div class="lns-lk"><div><b>${nN}</b><span>노트</span></div><div><b>${nC}</b><span>복습 카드</span></div><div><b>${nQ}</b><span>질문</span></div></div>
      ${nN || nC ? `<div class="lns-lb">${nN ? bt('mdall', '노트 .md', GOT.md, 'down') : ''}${nC ? bt('csv', '카드 .csv', GOT.csv, 'down') : ''}${nOn && nN ? `<button type="button" class="lns-b ${GOT.notion ? 'got' : 's'}" data-lns="send" data-leave="1">${I(GOT.notion ? 'check' : 'link', 18)}${GOT.notion ? 'Notion에 보냄' : 'Notion에 마지막으로 보내기'}</button>` : ''}</div>` : ''}</div>
      <a class="lns-row lns-quiet" href="#connect"><span class="lns-ft">${I('info', 20)}</span><span class="lns-tx"><b>탈퇴 대신 알림만 끌 수도 있어요</b><small>노트 · 기록은 그대로 남아요</small></span>${I('chev', 18)}</a>
      ${(nN || nC) && !(GOT.md || GOT.csv || GOT.notion) ? '<p class="lns-hint lns-c2 lns-lwarn">노트를 아직 내려받지 않았어요</p>' : ''}`; }
  const leaveRe = () => { const o = document.querySelector('#laDel .ln-leave'); if (!o) return; const tmp = document.createElement('div'); tmp.innerHTML = leaveHTML(); const f = o.parentElement; f.querySelectorAll('.ln-leave, .lns-quiet, .lns-lwarn').forEach(x => x.remove()); f.insertAdjacentHTML('afterbegin', tmp.innerHTML); };
  /* 내보내지 않고 탈퇴하면 한 번 더 묻는다(lacct.js 제출 처리보다 먼저 — 캡처) */
  document.addEventListener('submit', e => { const f = e.target; if (!f || f.id !== 'laDel' || !f.querySelector('.ln-leave')) return; if ((LN().all().length || LN().cards().length) && !(GOT.md || GOT.csv || GOT.notion) && !confirm('노트를 내보내지 않았어요. 탈퇴할까요?')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  /* 수료 축하 화면 변형 .ln-keep(그린 틴트) — 이 과정 노트 가져가기 */
  function keepHTML(cid) { if (!F('notes') || (!F('file') && !F('sync'))) return ''; const n = LN().all().filter(x => x.cid === cid && x.st === 'ok').length;
    return `<section class="ln-keep lns-keep noprint"><span class="lns-tx"><b>${n ? `이 과정 노트 ${n}개를 가져가세요` : '이 과정 노트를 가져갈 수 있어요'}</b><small>.md 한 파일로 과정 › 레슨 순서로 묶어요. 확인 전 초안은 빼요. 수강 기간이 끝나도 노트는 읽기 전용으로 남아요.</small></span><button type="button" class="lns-b p" data-lns="mdc" data-c="${E(cid)}">${I('down', 18)} 이 과정 노트 내보내기(.md)</button></section>`; }

  /* ── ③ 수료증 · LinkedIn ── */
  const verUrl = D => D && D.d && D.d.no ? `${location.href.split('#')[0]}#verify/${encodeURIComponent(D.d.no)}` : '';
  function liUrl(D) { const at = String(D.d.at || td()); const q = new URLSearchParams({ startTask: 'CERTIFICATION_NAME', name: `${D.d.cls} 수료`, organizationName: (S0().org || {}).name || '디디쌤', issueYear: at.slice(0, 4), issueMonth: String(+at.slice(5, 7) || 1) }); const u = verUrl(D); if (u) q.set('certUrl', u); if (D.d.no) q.set('certId', D.d.no);
    return 'https://www.linkedin.com/profile/add?' + q.toString(); }
  function liCard(cid) { if (typeof a2lCertData !== 'function') return ''; const D = a2lCertData(cid); if (!D) return ''; const org = (S0().org || {}).name || ''; const at = String(D.d.at || ''); const vu = verUrl(D);
    return `<section class="r4c noprint lns-li"><div class="r4h"><b>자격을 알려 보세요</b></div>${vu ? `<p class="lns-ver">${I('shield', 16)}<b>인증 주소로 누구나 확인</b><span>이름은 가려서 보여요</span></p>` : ''}
      ${F('linkedin') ? `<a class="lns-b k lns-lib" href="${E(liUrl(D))}" target="_blank" rel="noopener noreferrer" data-lns="li">${LT('L', 26)} LinkedIn 프로필에 추가</a>` : ''}
      <div class="lns-sh3"><button type="button" class="lns-sb" data-a2="certprint" data-c="${E(cid)}">${I('down', 20)}PDF 저장</button><button type="button" class="lns-sb" data-lns="certcopy" data-c="${E(cid)}">${I('link', 20)}${vu ? '인증 링크 복사' : '수료 정보 복사'}</button><button type="button" class="lns-sb" data-a2="certfile" data-c="${E(cid)}">${I('img', 20)}파일 저장</button></div>
      ${F('linkedin') ? `<p class="lns-cap">LinkedIn에 채워지는 칸</p>${why([['자격', `${D.d.cls} 수료`], ['기관', `${org}${at ? ` · ${at.slice(0, 4)}년 ${+at.slice(5, 7)}월` : ''}`], ['주소', vu ? `인증 주소 ${vu.replace(/^https?:\/\//, '').replace(/\?.*#/, '#')}` : '발급번호가 생기면 인증 주소가 채워져요']])}<p class="lns-hint">디디쌤은 LinkedIn에 로그인하거나 글을 올리지 않아요. 열린 화면에서 직접 저장해요.</p>` : ''}</section>`; }
  function shelf(cid) { if (app()) return ''; let L = []; try { L = myStats().courses.filter(x => x.done && x.c && x.c.id !== cid); } catch (e) { L = []; }
    return `<section class="sec noprint lns-shelfw"><div class="in"><div class="lns-shelf"><b class="lns-h3">다른 수료증</b>${L.length ? `<div class="lns-shr">${L.slice(0, 6).map(x => `<a class="lns-en" href="#cert/${E(x.c.id)}">${I('star', 20)}<span><b>${E(x.c.name)}</b><small>수료증 보기 · LinkedIn에 추가</small></span></a>`).join('')}</div>` : `<p class="lns-hint">다른 과정도 수료하면 여기에 모여요. 수료증마다 LinkedIn에 따로 추가할 수 있어요.</p><a class="lns-b s sm" href="#my">내 과정 보기</a>`}</div></div></section>`; }
  if (typeof viewCert === 'function') { const base = viewCert; viewCert = function (cid) { let h = base.apply(this, arguments); try { if (!LR.me || typeof h !== 'string' || !h.includes('a2lstage')) return h;
      /* 닉네임 수료증은 실명 입력 단계가 끝나기 전에는 인쇄 · 공유 버튼을 붙이지 않는다(원래 화면에 인쇄 버튼이 없으면 그대로 — done38 C10 · L5) */ if (!h.includes('data-a2="certprint"')) return h + shelf(cid);
      const card = liCard(cid); if (!card) return h;
      h = h.replace(/<section class="r4c noprint"><div class="r4h"><b>내려받기<\/b>[\s\S]*?<\/section>/, ''); const k = h.indexOf('<div class="noprint">', h.indexOf('a2lstage')); h = k >= 0 ? h.slice(0, k + 21) + keepHTML(cid) + card + h.slice(k + 21) : h + keepHTML(cid) + card; return h + shelf(cid); } catch (e) { console.error('lnote-sync cert', e); return h; } }; }
  /* 인증 주소 #verify/<발급번호> — 로그인 없이: 유효 여부 · 과정 · 기관 · 발급일 · 이름 첫 글자(대학은 이름 · 학번 숨김)
     운영: GET /api/pub/<tid>/cert/<코드> → { ok, cls, org, at, initial } — 서버 발급 대장에서 확인, 취소된 수료증은 ok:false. 아직 서버 경로 없음(남은 일).
     시연판: 이 기기에 로그인한 학습자 자신의 수료증만 확인한다. */
  function verifyPage(code) { code = String(code || '').slice(0, 40); let D = null; try { if (LR.me && typeof a2lCertData === 'function') for (const c of (S0().classes || [])) { const x = a2lCertData(c.id); if (x && x.d && x.d.no && x.d.no === code) { D = x; break; } } } catch (e) { D = null; }
    const org = (S0().org || {}).name || '';
    if (!D) return `<section class="sec"><div class="in narrow lns lns-verify"><p class="lns-ver bad">${I('info', 16)}<b>확인하지 못했어요</b></p><h1>수료증 확인</h1><p class="lead">인증번호 ${E(code) || '없음'}에 맞는 수료증을 찾지 못했어요. ${LR.mode === 'live' ? '주소를 다시 확인해 주세요.' : '시연판에서는 이 기기에 로그인한 내 수료증만 확인할 수 있어요.'}</p></div></section>`;
    const nm = U() || D.nick ? '' : String(D.d.name || '').trim(); const ini = nm ? nm.slice(0, 1) + '○○' : '';
    return `<section class="sec"><div class="in narrow lns lns-verify"><p class="lns-ver">${I('shield', 16)}<b>유효한 수료증</b></p><h1>${E(D.d.cls)}</h1>${why([['기관', org], ['발급일', String(D.d.at || '')], ['인증번호', code], ...(ini ? [['이름', ini]] : [])])}<p class="lns-hint">이 페이지는 수료 여부만 보여 줘요. 연락처 · 학번 같은 정보는 보이지 않아요.</p></div></section>`; }

  /* ── ④ 시험 목표 ── */
  /* 시연용 국가자격 목록 · 일정(예시값). 운영: 공공데이터포털 「한국산업인력공단 국가자격 시험일정 · 종목 정보」 API를 서버(키 보관)에서 불러와 이 목록을 대신한다 */
  const EXAMS = [['정보처리기사', 'gs'], ['정보처리산업기사', 'gs'], ['정보처리기능사', 'fn'], ['컴퓨터활용능력 1급', 'kc', '대한상공회의소'], ['컴퓨터활용능력 2급', 'kc', '대한상공회의소'], ['워드프로세서', 'kc', '대한상공회의소'], ['빅데이터분석기사', 'gs', '한국데이터산업진흥원'], ['정보보안기사', 'gs', '한국인터넷진흥원'], ['전기기사', 'gs'], ['전기산업기사', 'gs'], ['전기기능사', 'fn'], ['산업안전기사', 'gs'], ['건축기사', 'gs'], ['소방설비기사(전기)', 'gs'], ['위험물산업기사', 'gs'], ['지게차운전기능사', 'fn'], ['한식조리기능사', 'fn'], ['제과기능사', 'fn'], ['사회조사분석사 2급', 'gs'], ['직업상담사 2급', 'gs']]; /* 예시 20종(FINAL S19) */
  const SCH = { gs: [['필기', '2027-03-08'], ['필기', '2027-05-10']], fn: [['필기', '2027-01-24'], ['필기', '2027-03-21']], kc: [['상시', '2027-01-16'], ['상시', '2027-02-20']] };
  const exInfo = nm => { const x = EXAMS.find(e => e[0] === nm); return x ? { org: x[2] || '한국산업인력공단', kind: x[1] === 'gs' ? '필기 · 실기' : x[1] === 'kc' ? '필기 · 실기(상시)' : '필기 · 실기', sch: (SCH[x[1]] || []).filter(([, d]) => d > td()) } : { org: '', kind: '', sch: [] }; };
  const HKEY = () => `didisam.note.goalh.${who()}`; const DKEY = () => `didisam.note.goaldone.${who()}`;
  const G = { exam: '', date: '', h: 60 };
  function goalSheet() { const g = LN().goal() || {}; G.exam = g.exam || ''; G.date = g.date || ''; G.h = +ls.get(HKEY()) || 60; G.q = G.exam ? G.exam.slice(0, 4) : '';
    sheet(`${shHead(`<span class="lns-flag">${I('flag', 24)}</span>`, '어떤 시험을 준비하나요?', '시험일에 맞춰 튜터가 거꾸로 계획해요')}<div class="lns-gbody">${goalForm()}</div>`, 'goal'); }
  function goalForm() { const q = String(G.q || '').trim(); const L = (q ? EXAMS.filter(e => e[0].replace(/\s/g, '').includes(q.replace(/\s/g, ''))) : EXAMS.filter(e => ['정보처리기사', '컴퓨터활용능력 1급', '전기기능사'].includes(e[0]))).slice(0, 3);
    if (G.exam && !L.some(e => e[0] === G.exam)) L.unshift(EXAMS.find(e => e[0] === G.exam) || [G.exam]); const inf = exInfo(G.exam);
    return `<div class="lns-inp f">${I('search', 20)}<input id="lnsGq" type="search" inputmode="search" maxlength="40" value="${E(G.q || '')}" placeholder="종목 이름 (예: 정보처리)" aria-label="자격 종목 찾기"><button type="button" class="lns-ib" data-lns="gq-x" aria-label="지우기">${I('x', 18)}</button></div>
      <div class="lns-res" role="radiogroup" aria-label="자격 종목">${L.length ? L.slice(0, 3).map(e => { const on = e[0] === G.exam; const i2 = exInfo(e[0]); return `<button type="button" role="radio" aria-checked="${on}" class="lns-opt ${on ? 'on' : ''}" data-lns="gpick" data-v="${E(e[0])}"><span><b>${E(e[0])}</b><small>${E(i2.kind)} · ${E(i2.org)}</small></span><i class="lns-rd">${on ? I('check', 16) : ''}</i></button>`; }).join('') : `<p class="lns-hint">찾는 종목이 없어요. 이름을 그대로 쓰면 목표로 정할 수 있어요.</p><button type="button" class="lns-b s sm" data-lns="gpick" data-v="${E(q.slice(0, 40))}">「${E(q.slice(0, 40))}」로 정하기</button>`}</div>
      ${G.exam ? `<div class="lns-fl"><label>시험일 · <span>Q-Net 공개 일정(예시)</span></label><div class="lns-chips">${inf.sch.map(([k, d]) => `<button type="button" class="lns-chip ${G.date === d ? 'on' : ''}" data-lns="gdate" data-v="${d}">${k} ${+d.slice(5, 7)}월 ${+d.slice(8)}일(${WD[dd(d).getDay()]})${G.date === d ? ` <small>D-${dleft(d)}</small>` : ''}</button>`).join('')}<label class="lns-chip ${G.date && !inf.sch.some(x => x[1] === G.date) ? 'on' : ''}">${I('cal', 18)}<span>${G.date && !inf.sch.some(x => x[1] === G.date) ? `${md(G.date)} D-${dleft(G.date)}` : '직접 고르기'}</span><input type="date" id="lnsGd" min="${addD(td(), 7)}" max="${addD(td(), 730)}" value="${E(G.date)}" aria-label="시험일 직접 고르기"></label></div></div>
      <div class="lns-fl"><label>하루에 쓸 수 있는 시간</label><div class="lns-seg3">${[[30, '30분'], [60, '1시간'], [120, '2시간']].map(([v, l]) => `<button type="button" class="lns-chip ${G.h === v ? 'on' : ''}" data-lns="gh" data-v="${v}" aria-pressed="${G.h === v}">${l}</button>`).join('')}</div></div>` : ''}
      <p class="lns-hint">접수는 Q-Net에서 직접 해요. 목표는 언제든 바꾸거나 지울 수 있어요.</p><p class="lns-err" role="alert"></p>
      <button type="button" class="lns-b p lns-full" data-lns="gsave" ${G.exam && G.date ? '' : 'aria-disabled="true"'}>${I('spark', 18)} AI 튜터에게 계획 맡기기</button>`; }
  const gRe = () => { const b = document.querySelector('#lnsSheet .lns-gbody'); if (!b) return; const pos = document.activeElement && document.activeElement.id; b.innerHTML = goalForm(); if (pos === 'lnsGq') { const i = b.querySelector('#lnsGq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };

  /* 역산 계획: 남은 주 × 0.38 / 0.31 / 0.25 + 마지막 1주 고정, 남은 기간 4주 미만이면 2단계(기출 · 마무리) */
  function plan(g) { const days = Math.max(1, dleft(g.date)); const W = Math.max(1, Math.ceil(days / 7)); let ph;
    if (W < 4) ph = [['기출 1회독', Math.max(1, W - 1), '오답 → 카드'], ['마무리 · 약점', 1, '복습만']].filter(x => x[1] > 0);
    else { const r = W - 1; const a = Math.max(1, Math.round(r * .38)), b = Math.max(1, Math.round(r * .31)); const c = Math.max(1, r - a - b); ph = [['개념 다지기', a, ''], ['기출 1회독', b, '오답 → 카드'], ['실전 모의고사', c, '주 2회'], ['마무리 · 약점', 1, '복습만']]; }
    let s = td(); const out = ph.map(([t, w, m]) => { const e = addD(s, w * 7 - 1); const o = { t, w, m, s, e: e > g.date ? addD(g.date, -1) : e }; s = addD(e, 1); return o; }); out[out.length - 1].e = addD(g.date, -1);
    const now = out.findIndex(p => td() >= p.s && td() <= p.e); return { W, ph: out, now: now < 0 ? 0 : now }; }
  const TASKS = { '개념 다지기': ['핵심 개념 1단원 정리', '개념 노트 → 복습 카드 만들기', '핵심 개념 2단원 정리', '오늘 카드 복습', '주간 개념 요약 노트'], '기출 1회독': ['기출 1회 풀기', '오답 정리 → 카드', '기출 1회 풀기', '오답 카드 복습', '약점 단원 다시 보기'], '실전 모의고사': ['실전 모의고사(시간 재기)', '오답 분석 노트', '약점 단원 복습', '실전 모의고사(시간 재기)', '복습 카드 몰아 보기'], '마무리 · 약점': ['오답 카드 복습', '요약 노트 다시 보기', '오답 카드 복습', '컨디션 정리 · 가볍게', '시험 준비물 확인'] };
  function weekTasks(g) { const P0 = plan(g); const p = P0.ph[P0.now]; const L = TASKS[p.t] || TASKS['개념 다지기']; const h = +ls.get(HKEY()) || 60; const out = []; let d = td();
    for (let i = 0; out.length < 5 && i < 10; i++, d = addD(d, 1)) { const w = dd(d).getDay(); if (w === 0 || w === 6) continue; if (d >= g.date) break; out.push({ day: d, t: `${g.exam} · ${L[out.length]}`, m: h }); } return out; }
  function goalSave() { if (!G.exam || !G.date) { const er = document.querySelector('#lnsSheet .lns-err'); if (er) er.textContent = G.exam ? '시험일을 골라 주세요.' : '준비할 시험을 골라 주세요.'; return; }
    if (dleft(G.date) < 1) { const er = document.querySelector('#lnsSheet .lns-err'); if (er) er.textContent = '시험일은 내일 이후로 골라 주세요.'; return; }
    const g = LN().goal({ exam: G.exam, date: G.date }); if (!g) return T('목표를 저장하지 못했어요. 다시 시도해 주세요.', 'warn'); ls.set(HKEY(), String(G.h)); ls.del(DKEY());
    const P0 = plan(g); const W = weekTasks(g);
    /* 이번 주 할 일 → AI 튜터 계획(LR.lp.tutor.plan — 기존 튜터 「맡긴 이번 주 계획」 · .md 내보내기와 같은 곳) */
    try { LR.lp.tutor = LR.lp.tutor && typeof LR.lp.tutor === 'object' ? LR.lp.tutor : {}; LR.lp.tutor.plan = W.map(x => ({ d: `${md(x.day)}(${WD[dd(x.day).getDay()]})`, t: x.t.slice(0, 80), m: x.m, h: '#notes/goal' })); LR.lp.tutor.planAt = new Date().toISOString(); } catch (e) { }
    /* 요약은 시험 계획 노트 초안 1개(src:'exam', st:'draft') — 같은 시험이면 고친다. 운영: 튜터 서버(/api/pub/<tid>/tutor mode:'plan')가 진도 · 오답으로 다듬는다 */
    const bodyT = [`시험일 ${kday(g.date)} · 하루 ${G.h >= 60 ? G.h / 60 + '시간' : G.h + '분'} · ${P0.W}주 계획`, '', ...P0.ph.map((p, i) => `- **${i + 1}. ${p.t}** ${md(p.s)} ~ ${md(p.e)} · ${p.w}주${p.m ? ` · ${p.m}` : ''}`), '', '이번 주 할 일', ...W.map(x => `- ${md(x.day)} ${x.t.replace(g.exam + ' · ', '')}`), '', '튜터가 세운 초안이에요. 내 일정에 맞게 고쳐서 확정해 주세요.'].join('\n');
    const old = LN().all().find(n => n.src === 'exam' && n.t.indexOf(g.exam) === 0); LN().save({ ...(old ? { id: old.id } : {}), src: 'exam', st: 'draft', t: `${g.exam} — 역산 계획`.slice(0, 80), b: bodyT, tags: ['시험계획'] });
    try { LR.api.save(); } catch (e) { } close(); T('튜터가 거꾸로 세운 계획 초안이에요. 확인하고 캘린더에 넣어 보세요.'); if (location.hash === '#notes/goal') rer(); else location.hash = '#notes/goal'; }
  const examNote = g => g && LN().all().find(n => n.src === 'exam' && n.t.indexOf(g.exam) === 0);

  /* ⑤ #notes/goal */
  const ring = (pct, px) => { const r = px / 2 - 4, c = 2 * Math.PI * r; return `<span class="lns-ring" style="width:${px}px;height:${px}px"><svg viewBox="0 0 ${px} ${px}" width="${px}" height="${px}" aria-hidden="true"><circle cx="${px / 2}" cy="${px / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6"/><circle cx="${px / 2}" cy="${px / 2}" r="${r}" fill="none" stroke="#57F287" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${px / 2} ${px / 2})"/></svg><b>${pct}%</b></span>`; };
  const doneSet = () => { try { return new Set(JSON.parse(ls.get(DKEY()) || '[]')); } catch (e) { return new Set(); } };
  function goalBody() { const g = LN().goal(); if (!g) return `<section class="lns-empty"><div class="lns-ph" style="background-image:linear-gradient(180deg,rgba(6,42,19,0) 30%,rgba(6,42,19,.82)),url('img/stock/dsk-03-800.webp')"><p>시험일을 정하면<br>오늘 할 일이 정해져요</p></div><button type="button" class="lns-b p lns-full" data-lns="goal">${I('flag', 18)} 시험 목표 정하기</button></section>`;
    const left = dleft(g.date); if (left < 0) return `<section class="lns-grp lns-pad"><b class="lns-h3">시험 잘 보셨나요?</b><p class="lns-hint">${E(g.exam)} · ${kday(g.date)}가 지났어요. 다음 목표를 정하거나 목표를 지울 수 있어요.</p><div class="lns-acts"><button type="button" class="lns-b s" data-lns="gdel">목표 지우기</button><button type="button" class="lns-b p" data-lns="goal">다음 목표 정하기</button></div></section>`;
    const P0 = plan(g); const W = weekTasks(g); const D = doneSet(); const h = +ls.get(HKEY()) || 60; const n = examNote(g); const draft = !n || n.st === 'draft';
    const pct = Math.round(W.filter(x => D.has(x.day + x.t)).length / Math.max(1, W.length) * 100); const mins = W.reduce((a, x) => a + x.m, 0);
    const hero = `<section class="lns-hero"><div class="lns-hrow"><div><p class="lns-ey"><i></i>${E(g.exam)} · 하루 ${h >= 60 ? h / 60 + '시간' : h + '분'}</p><h2 class="lns-dd">${left ? `시험까지 ${left}일` : '오늘이 시험일이에요'}</h2><p>${kday(g.date)} · ${P0.W}주 계획</p></div>${ring(pct, 64)}</div>
      <div class="lns-kpis"><div class="lns-kpi"><b>${P0.ph.length}단계</b><span>역산 계획</span></div><div class="lns-kpi"><b>주 5일</b><span>학습일</span></div><div class="lns-kpi"><b>${LN().cards().length ? LN().cards().length + '장' : '카드 0'}</b><span>복습 카드</span></div></div>
      <button type="button" class="lns-b w" data-lns="calput">${LG('gcal', 24)} ${draft ? '확인하고 캘린더에 넣기' : '캘린더에 넣기'}</button></section>`;
    const band = draft ? `<div class="lns-draft"><span class="lns-ft g">${I('spark', 20)}</span><span class="lns-tx"><b>튜터가 세운 초안이에요.</b><small>내 일정에 맞게 고쳐서 확정해 주세요.</small></span><button type="button" class="lns-c" data-lns="gedit" aria-label="계획 고치기">${I('pen', 18)}</button></div>` : '';
    const phases = `<section class="lns-grp"><div class="lns-gh"><b>거꾸로 세운 ${P0.ph.length}단계</b><em>${P0.W}주</em></div>${P0.ph.map((p, i) => { const now = i === P0.now; const tot = dleft(p.e) - dleft(p.s) + 1; const gone = now ? Math.max(0, Math.min(tot, tot - dleft(p.e))) : i < P0.now ? tot : 0;
      return `<div class="lns-phase ${now ? 'now' : ''}"><em>${i + 1}</em><span><b>${E(p.t)}</b><span>${md(p.s)} – ${md(p.e)} · ${p.w}주</span></span><small>${now ? '지금' : E(p.m)}</small>${now ? `<span class="lns-bar"><i style="width:${Math.max(6, Math.round(gone / tot * 100))}%"></i></span>` : ''}</div>`; }).join('')}</section>`;
    const week = `<section class="lns-grp"><div class="lns-gh"><b>이번 주 할 일</b><em>${W.length}개 · ${Math.floor(mins / 60)}시간${mins % 60 ? ` ${mins % 60}분` : ''}</em></div>${W.length ? W.map(x => { const on = D.has(x.day + x.t); return `<div class="lns-wk ${on ? 'done' : ''}"><span class="lns-d ${x.day === td() ? 'td' : ''}"><small>${WD[dd(x.day).getDay()]}</small>${+x.day.slice(8)}</span><span class="lns-tx"><b>${E(x.t.replace(g.exam + ' · ', ''))}</b><small>${x.m >= 60 ? x.m / 60 + '시간' : x.m + '분'}</small></span><button type="button" class="lns-chk ${on ? 'on' : ''}" data-lns="gdone" data-v="${E(x.day + x.t)}" aria-pressed="${on}" aria-label="${on ? '한 일 취소' : '했어요'}">${on ? I('check', 16) : ''}</button></div>`; }).join('') : '<p class="lns-hint">이번 주는 남은 학습일이 없어요.</p>'}</section>`;
    const foot = `<div class="lns-gfoot"><button type="button" class="lns-b s sm" data-lns="goal">목표 바꾸기</button><button type="button" class="lns-b s sm" data-lns="gdel">목표 지우기</button></div><p class="lns-hint lns-c2">시험 일정은 예시예요. 접수와 최종 일정은 Q-Net에서 확인해 주세요.</p>`;
    return `${hero}${band}${phases}${week}${foot}`; }
  function goalPage() { if (!F('notes') || !F('goal')) return offPage('시험 목표');
    if (app()) return `<div class="lns lns-app">${topBar('시험 목표')}<div class="lns-sc">${goalBody()}</div>${fade()}</div>`;
    return `${typeof lPageHead === 'function' ? lPageHead({ key: 'notes', title: '시험 목표', eyebrow: '셀프러닝 노트', desc: '시험일에서 거꾸로 세운 계획과 이번 주 할 일을 봐요.', crumb: '<a href="#notes">내 노트</a> › 시험 목표', cta: null }) : ''}<section class="sec"><div class="in lns lns-web"><div class="lns-wcol">${goalBody()}</div></div></section>`; }
  function calSheet() { const g = LN().goal(); if (!g) return; const gc = !!((lp().conn || {}).gcal || {}).on;
    sheet(`${shHead(LG('gcal', 48), '캘린더에 넣기', '이번 주 할 일과 단계 시작일 · 시험일을 넣어요')}
      <div class="lns-grp lns-in"><div class="lns-row">${LG('gcal', 44)}<span class="lns-tx"><b>Google 캘린더 <em class="lns-st ${gc ? 'on' : 'off'}">${gc ? '연결됨' : '꺼짐'}</em></b><small>${gc ? '학습 캘린더 「내 일정」을 거쳐 내 Google 캘린더에 들어가요' : '연결하면 내 Google 캘린더에도 들어가요'}</small></span>${gc ? `<button type="button" class="lns-b p sm" data-lns="calgo">넣기</button>` : `<button type="button" class="lns-b s sm" data-lai="gcal">연결</button>`}</div>
      <div class="lns-row">${LG('apple', 44)}<span class="lns-tx"><b>캘린더 파일 (.ics)</b><small>Apple · Outlook 캘린더에서 열어요</small></span><button type="button" class="lns-c" data-lns="ics" aria-label="캘린더 파일 받기">${I('down', 20)}</button></div></div>
      <button type="button" class="lns-b p lns-full" data-lns="calgo">${I('cal', 18)} 학습 캘린더 「내 일정」에 넣기</button><p class="lns-hint">같은 일정을 다시 넣으면 새로 만들지 않고 고쳐요.</p>`, 'cal'); }
  function calItems(g) { const P0 = plan(g); const cid = ''; const L = weekTasks(g).map((x, i) => ({ id: `lg${x.day.replace(/-/g, '')}${i}`, date: x.day, title: x.t.slice(0, 80), memo: '셀프러닝 노트 · 시험 목표 이번 주 할 일', cls: cid }));
    P0.ph.forEach((p, i) => L.push({ id: `lgp${i}${p.s.replace(/-/g, '')}`, date: p.s, title: `${g.exam} · ${i + 1}단계 ${p.t} 시작`.slice(0, 80), memo: `${p.w}주 · ${md(p.s)} ~ ${md(p.e)}`, cls: cid }));
    for (let d = addD(td(), 7 - ((dd(td()).getDay() + 6) % 7)), k = 2; d < g.date; d = addD(d, 7), k++) L.push({ id: `lgw${d.replace(/-/g, '')}`, date: d, title: `${g.exam} · ${k}주차 계획 점검`.slice(0, 80), memo: '이번 주 할 일을 정하고 복습 카드를 넘겨요', cls: cid });
    L.push({ id: `lgx${g.date.replace(/-/g, '')}`, date: g.date, title: `${g.exam} 시험일`.slice(0, 80), memo: '접수 · 수험표는 Q-Net에서 확인', cls: cid }); return L; }
  function calGo() { const g = LN().goal(); if (!g) return; const n0 = examNote(g); if (n0 && n0.st === 'draft') LN().save({ id: n0.id, st: 'ok' });
    const n = typeof window.lcalAdd === 'function' ? window.lcalAdd(calItems(g)) : 0; close(); if (n) T(`할 일 ${n}개를 캘린더에 넣었어요.`); else T('캘린더에 넣지 못했어요. 캘린더 파일(.ics)로 받아 주세요.', 'warn'); rer(); }
  function icsGo() { const g = LN().goal(); if (!g) return; const n0 = examNote(g); if (n0 && n0.st === 'draft') LN().save({ id: n0.id, st: 'ok' }); const L = calItems(g); const z = s => s.replace(/-/g, ''); const ex = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const t = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//didisam//selfnote//KO', 'CALSCALE:GREGORIAN', ...L.flatMap(x => ['BEGIN:VEVENT', `UID:${x.id}@didisam`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${z(x.date)}`, `DTEND;VALUE=DATE:${z(addD(x.date, 1))}`, `SUMMARY:${ex(x.title)}`, `DESCRIPTION:${ex(x.memo)}`, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
    dl(`didisam-exam-plan-${stamp()}.ics`, t, 'text/calendar;charset=utf-8'); close(); T(`일정 ${L.length}개를 캘린더 파일로 받았어요.`); rer(); }

  /* ── 라우팅 · 진입점 ── */
  { const base = viewPage; viewPage = (id, ...a) => { if (id === 'verify') { try { return verifyPage(route().b); } catch (e) { console.error('lnote-sync verify', e); } } if (id === 'notes') { const b = route().b; if (b === 'out' || b === 'goal') { if (!LR.me) return needLogin('notes'); try { return b === 'out' ? outPage() : goalPage(); } catch (e) { console.error('lnote-sync', e); return '<section class="sec"><div class="in"><p class="empty">화면을 그리지 못했어요. 새로 고침해 주세요.</p></div></section>'; } } } return base(id, ...a); }; }
  function entry() { try { if (!LR.me) return; const r = route(); const lm = document.getElementById('lm'); if (!lm) return;
      if (F('notes') && r.a === 'notes' && !r.b && !lm.querySelector('.lns-ent')) { const g = LN().goal(); const left = g ? dleft(g.date) : null;
        const h = `<nav class="lns-ent" aria-label="노트 밖으로 · 목표">${F('sync') || F('file') ? `<a class="lns-en" href="#notes/out"${app() ? '' : ' data-lns="outpanel"'}>${I('out', 20)}<span><b>내보내기 · 연결</b><small>${onN() ? `${onN()}곳 켜짐 · 확인한 노트만` : 'Notion · Google Docs · 파일'}</small></span></a>` : ''}${F('goal') ? `<a class="lns-en" href="${g ? '#notes/goal' : '#notes'}"${g ? '' : ' data-lns="goal"'}>${I('flag', 20)}<span><b>${g && left >= 0 ? `${E(g.exam)} D-${left}` : '시험 목표 정하기'}</b><small>${g ? '거꾸로 세운 계획 · 이번 주 할 일' : '시험일에 맞춰 튜터가 계획해요'}</small></span></a>` : ''}</nav>`;
        const hero = lm.querySelector('.ln-hero'); if (hero) hero.insertAdjacentHTML('afterend', h); else (lm.querySelector('.ln-hub, .lnh, .in, .lc') || lm).insertAdjacentHTML('afterbegin', h); }
      /* S25 탈퇴 전 내보내기(추가 지시 1-4): lacct.js 탈퇴 폼(#laDel) 기존 확인 문구 위에 .ln-leave 카드 + 「탈퇴 대신 알림만 끌 수도 있어요」 줄 */
      const del = lm.querySelector('#laDel'); if (del && !del.querySelector('.ln-leave')) { del.insertAdjacentHTML('afterbegin', leaveHTML()); const sb = del.querySelector('button[type=submit]'); if (sb) { sb.classList.add('lns-leave-go'); sb.textContent = '그래도 탈퇴하기'; } }
      if (r.a === 'notes' && (r.b === 'out' || r.b === 'goal')) { const me = () => document.querySelectorAll('#lapp .ap-nav > a').forEach(x => { const k = /#acct$/.test(x.getAttribute('href') || ''); x.classList.toggle('on', k); if (k) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); me(); setTimeout(me, 0); } /* #notes 하위 화면은 「나」 탭이 켜짐(수석 기준) */
    } catch (e) { console.error('lnote-sync entry', e); } }
  { const base = lrender; lrender = function (...a) { const r = base.apply(this, a); entry(); return r; }; }
  addEventListener('hashchange', close);
  /* lconn.js 「노트 앱으로 내보내기」 줄은 lconn.js에서 이 허브(#notes/out)로 바로 연결한다(LNOTE_SYNC.F로 기관 스위치 확인) */

  /* ── 동작 ── */
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-lns]'); if (!el) return; const k = el.dataset.lns; if (k === 'li') return; /* LinkedIn = 새 창 링크 그대로 */
    if (!LR.me && k !== 'close') { location.hash = '#login'; return; } e.preventDefault();
    if (k === 'close') return close();
    if (k === 'help') return sheet(`${shHead(`<span class="lns-ft">${I('info', 22)}</span>`, '내보내기 · 연결 안내', '내 노트는 내 것이에요')}${why([['보내는 것', '확인한 노트의 제목 · 본문 · 태그 · 과정 이름'], ['안 보냄', '이름 · 학번 · 연락처, 확인 전 초안, 튜터 대화 원문'], ['키', '이 기기에만 저장되고 화면에는 끝 4자리만 보여요']])}<button type="button" class="lns-b p lns-full" data-lns="close">알겠어요</button>`, 'help');
    if (k === 'outpanel') return outPanel();
    if (k === 'notion') return F('sync') ? notionSheet() : null;
    if (k === 'gdocs') return F('sync') ? gdocsSheet() : null;
    if (k === 'guide') { const g = document.querySelector('#lnsSheet .lns-guide'); if (g) g.hidden = !g.hidden; return; }
    if (k === 'peek') { const i = document.getElementById('lnsKey'); if (!i) return; i.type = 'text'; clearTimeout(window.__lnsPeek); window.__lnsPeek = setTimeout(() => { i.type = 'password'; }, 3000); return; }
    if (k === 'off') return offSync(el.dataset.v);
    if (k === 'send') return sendNow();
    if (k === 'gdocs-on') { /* 운영: Google OAuth(범위 drive.file) → 서버가 refresh token 암호화 보관 · 과정마다 문서 1개 「디디쌤 노트 — {과정}」 덮어쓰기 */ const was = (sync().gdocs || {}).on; LN().sync('gdocs', { on: true, at: new Date().toISOString() }); close(); T(was ? `Google Docs로 노트 ${okNotes().length}개를 다시 보냈어요.` : 'Google Docs를 연결했어요(시연). 확인한 노트가 과정별 문서로 쌓여요.'); return rer(); }
    if (k === 'md') { if (!F('file') && !F('sync')) return; dl(`didisam-notes-${stamp()}.md`, mdBundle(), 'text/markdown;charset=utf-8'); return T(`확인한 노트 ${okNotes().length}개를 .md로 내려받았어요. Notion은 「가져오기 › Markdown」으로 넣어요.`); }
    if (k === 'mdc') { const cid = el.dataset.c; const n = LN().all().filter(x => x.cid === cid && x.st === 'ok').length; if (!n) return T('이 과정에 확인한 노트가 아직 없어요.', 'warn'); dl(`didisam-notes-${String(cid).replace(/[^\w-]/g, '')}-${stamp()}.md`, mdBundle({ cid }), 'text/markdown;charset=utf-8'); return T(`이 과정 노트 ${n}개를 .md로 내려받았어요.`); }
    if (el.dataset.leave) setTimeout(() => { if (k === 'mdall') GOT.md = true; if (k === 'csv') GOT.csv = true; if (k === 'send') GOT.notion = true; leaveRe(); }, 0);
    if (k === 'mdall') { dl(`didisam-notes-all-${stamp()}.md`, mdBundle({ all: true }), 'text/markdown;charset=utf-8'); return T(`노트 ${LN().all().length}개를 .md로 내려받았어요. 탈퇴 전에 보관해 두세요.`); }
    if (k === 'csv') { const c = csvCards(); if (!c.n) return T('아직 복습 카드가 없어요. 노트에서 카드를 만들어 보세요.', 'warn'); dl(`didisam-review-cards-${stamp()}.csv`, c.text, 'text/csv;charset=utf-8'); return T(`복습 카드 ${c.n}장을 내려받았어요. Anki는 「가져오기」, Quizlet은 「만들기 › 가져오기」에서 넣어요.`); }
    if (k === 'certcopy') { const D = typeof a2lCertData === 'function' && a2lCertData(el.dataset.c); if (!D) return; const vu = verUrl(D); const t = vu || `${D.d.cls} 수료 · ${(S0().org || {}).name || ''} · ${D.d.at}`; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => T(vu ? '인증 링크를 복사했어요. 누구나 이 주소로 수료 여부를 확인할 수 있어요.' : '수료 정보를 복사했어요(이름은 넣지 않았어요).'), () => T(t, 'ok')); return; }
    if (k === 'goal') return F('goal') ? goalSheet() : null;
    if (k === 'gq-x') { G.q = ''; return gRe(); }
    if (k === 'gpick') { G.exam = String(el.dataset.v || '').slice(0, 40); G.q = G.exam; const s = exInfo(G.exam).sch; if (!G.date || !s.some(x => x[1] === G.date)) G.date = s[0] ? s[0][1] : ''; return gRe(); }
    if (k === 'gdate') { G.date = el.dataset.v; return gRe(); }
    if (k === 'gh') { G.h = +el.dataset.v || 60; return gRe(); }
    if (k === 'gsave') return goalSave();
    if (k === 'gdel') { if (!confirm('시험 목표를 지울까요? 노트와 캘린더에 넣은 일정은 남아요.')) return; LN().goal(null); ls.del(DKEY()); T('시험 목표를 지웠어요.'); return location.hash === '#notes/goal' ? rer() : null; }
    if (k === 'gedit') { const n = examNote(LN().goal()); if (n) location.hash = '#notes/' + encodeURIComponent(n.id); return; }
    if (k === 'gdone') { const D = doneSet(); const v = el.dataset.v; if (D.has(v)) D.delete(v); else D.add(v); ls.set(DKEY(), JSON.stringify([...D].slice(-60))); return rer(); }
    if (k === 'calput') return calSheet();
    if (k === 'calgo') return calGo();
    if (k === 'ics') return icsGo(); });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'lnsGq') { G.q = e.target.value; gRe(); } });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'lnsGd') { const v = e.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { G.date = v; gRe(); } } });
  document.addEventListener('submit', e => { const f = e.target; if (!f || f.id !== 'lnsNotion') return; e.preventDefault(); const er = f.querySelector('.lns-err'); const k = String(f.k.value || '').trim(); const p = String(f.p.value || '').trim().replace(/[<>]/g, '').slice(0, 60);
    if (k && !RE_N.test(k)) { er.textContent = 'Notion 통합 키 형식이 아니에요. 「secret_」 또는 「ntn_」으로 시작해요.'; f.k.focus(); return; }
    if (!k && !keyGet('notion')) { er.textContent = 'Notion 통합 키를 붙여 넣어 주세요.'; f.k.focus(); return; }
    if (!p) { er.textContent = '노트를 받을 Notion 페이지 이름을 적어 주세요.'; f.p.focus(); return; }
    /* 시연: 이 기기 저장소에만. 운영: PUT /api/pub/<tid>/conn/notion { key, page } — 서버가 AES-GCM 암호화 보관, 응답은 끝 4자리만. 시험 보내기 실패 시 401 = 키 확인 · 404 = 페이지 허용 안 됨 */
    if (k && !ls.set(KEY('notion'), k)) { er.textContent = '이 기기에 키를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'; return; }
    f.k.value = ''; ls.del(KEY('notion') + '.err'); const was = (sync().notion || {}).on; LN().sync('notion', { on: true, at: new Date().toISOString(), page: p }); close();
    T(was ? `「${p}」에 확인한 노트 ${okNotes().length}개를 다시 보냈어요(시연).` : 'Notion에 노트 1개를 보냈어요(시연). 이제 확인한 노트가 자동으로 쌓여요.'); rer(); });

  /* ── 모양(토큰: dds.css 이름 그대로, 새 색 없음) ── */
  const st = document.createElement('style'); st.id = 'lnsCss';
  st.textContent = [
    '.lns{--hero:radial-gradient(600px 260px at 92% 0%,rgba(0,197,59,.55),transparent 60%),linear-gradient(135deg,#062A13 0%,#0A4A22 55%,#00862D 100%);color:var(--g900,#1A1814);text-align:left;font-variant-numeric:tabular-nums}',
    '.lns-i{fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;flex:none;display:block}',
    '.lns-app{background:var(--g100,#F6F3EE);min-height:100%}.lns-top{display:flex;align-items:center;gap:6px;padding:4px 12px 8px;min-height:56px}.lns-top>b{flex:1;font-size:18px;font-weight:900;letter-spacing:-.02em}',
    '.lns-ib{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:var(--g800,#3F3A33);flex:none;background:none;border:0;cursor:pointer;text-decoration:none}',
    '.lns-sc{padding:4px 16px 120px;display:flex;flex-direction:column;gap:12px}.lns-web .lns-wcol{max-width:720px;display:flex;flex-direction:column;gap:16px;margin:8px 0 40px}',
    '.lns-hero{position:relative;border-radius:24px;padding:18px;color:#fff;background:var(--hero);overflow:hidden}.lns-hero::after{content:"";position:absolute;right:-70px;bottom:-90px;width:240px;height:240px;border-radius:50%;border:40px solid rgba(255,255,255,.05);pointer-events:none}',
    '.lns-ey{font-size:13px;font-weight:700;opacity:.9;display:flex;gap:8px;align-items:center;margin:0}.lns-ey i{display:block;width:8px;height:8px;border-radius:50%;background:#57F287;box-shadow:0 0 0 4px rgba(87,242,135,.18);flex:none}.lns-ey.bad i{background:var(--co500,#FF6B2C);box-shadow:0 0 0 4px rgba(255,107,44,.25)}',
    '.lns-hero h2{color:#fff;font-size:18px;font-weight:900;letter-spacing:-.03em;margin:8px 0 4px;line-height:1.35}.lns-hero p{font-size:13.5px;opacity:.86;line-height:1.5;margin:0}.lns-hero h2.lns-dd{font-size:22px}.lns-hrow{display:flex;gap:12px;align-items:center;justify-content:space-between;position:relative;z-index:1}',
    '.lns-kpis{display:flex;gap:8px;margin:14px 0;position:relative;z-index:1}.lns-kpi{flex:1;min-width:0;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:10px 11px}.lns-kpi b{display:block;font-size:22px;font-weight:900;letter-spacing:-.03em;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lns-kpi span{font-size:13px;opacity:.85;white-space:nowrap}',
    '.lns-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 18px;border-radius:14px;font:inherit;font-weight:800;font-size:15px;white-space:nowrap;position:relative;z-index:1;border:0;cursor:pointer;text-decoration:none;box-sizing:border-box}.lns-b.sm{min-height:44px;font-size:14px;padding:0 14px}',
    '.lns-b.w{background:#fff;color:var(--gr950,#03271A);width:100%}.lns-b.p{background:var(--gr700,#00862D);color:#fff;box-shadow:0 6px 16px rgba(0,134,45,.25)}.lns-b.s{background:#fff;color:var(--g900,#1A1814);border:1px solid var(--g300,#E7E2D9)}.lns-b.k{background:var(--g900,#1A1814);color:#fff}.lns-b[aria-disabled=true]{opacity:.45}.lns-full{width:100%}',
    '.lns-grp{background:#fff;border:1px solid var(--g300,#E7E2D9);border-radius:20px;padding:14px 16px 4px;box-shadow:var(--sh1,0 1px 2px rgba(30,25,15,.04))}.lns-grp.lns-pad{padding:16px}.lns-gh{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}.lns-gh b,.lns-h3{font-size:17px;font-weight:900}.lns-gh em{font-style:normal;font-size:13px;color:var(--g600,#736B5F);font-weight:600}',
    '.lns-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--g200,#F3F0EA);min-height:68px}.lns-gh+.lns-row,.lns-in .lns-row:first-child{border-top:0}',
    '.lns-tx{flex:1;min-width:0}.lns-tx b{font-size:15.5px;font-weight:800;display:flex;gap:6px;align-items:center;flex-wrap:wrap;color:inherit}.lns-tx small{display:block;font-size:13px;color:var(--g600,#736B5F);margin-top:2px;line-height:1.45;overflow-wrap:anywhere}',
    '.lns-st{font-style:normal;font-size:13px;font-weight:800;padding:0 8px;height:22px;display:inline-flex;align-items:center;border-radius:999px;white-space:nowrap}.lns-st.on{background:var(--gr50,#ECFDF3);color:var(--gr700,#00862D)}.lns-st.off{background:var(--g200,#F3F0EA);color:var(--g700,#5C554B)}',
    '.lns-c{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--g400,#D6CFC2);display:grid;place-items:center;color:var(--g700,#5C554B);flex:none;background:#fff;cursor:pointer;padding:0}.lns-c.on{background:var(--gr700,#00862D);border-color:var(--gr700,#00862D);color:#fff;box-shadow:0 4px 10px rgba(0,134,45,.25)}',
    '.lns-ft{width:44px;height:44px;border-radius:13px;background:var(--g100,#F6F3EE);border:1px solid var(--g300,#E7E2D9);display:grid;place-items:center;color:var(--g800,#3F3A33);flex:none}.lns-ft.g{background:var(--gr50,#ECFDF3);border-color:var(--gr100,#D1FADF);color:var(--gr700,#00862D)}',
    '.lns-lt{display:inline-grid;place-items:center;flex:none;background:var(--g200,#F3F0EA);border:1px solid var(--g300,#E7E2D9);color:var(--g800,#3F3A33);font-weight:900;border-radius:22%;line-height:1}',
    '.lns-pv{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lns-pv>div{background:#fff;border:1px solid var(--g300,#E7E2D9);border-radius:18px;padding:12px}.lns-pv h5{font-size:13px;font-weight:900;display:flex;gap:6px;align-items:center;margin:0 0 6px}.lns-pv ul{margin:0;padding:0}.lns-pv li{list-style:none;font-size:13px;color:var(--g700,#5C554B);line-height:1.5;padding-left:14px;position:relative}.lns-pv li::before{content:"";position:absolute;left:2px;top:8px;width:5px;height:5px;border-radius:50%;background:var(--gr500,#00C53B)}.lns-pv .no li::before{background:var(--co500,#FF6B2C)}',
    '.lns-off{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--g700,#5C554B);background:var(--g50,#FAF8F5);border:1px solid var(--g300,#E7E2D9);border-radius:16px;padding:12px;margin:0}',
    '.lns-dim{position:fixed;inset:0;background:rgba(18,16,12,.38);z-index:9000;display:flex;align-items:flex-end;justify-content:center;animation:lnsF .2s}.lns-sheet{width:100%;max-width:520px;max-height:88vh;overflow:auto;background:#fff;border-radius:30px 30px 0 0;padding:12px 20px 34px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;color:var(--g900,#1A1814);animation:lnsU .26s cubic-bezier(.2,.8,.2,1);text-align:left}',
    '.lns-panel{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:100%;background:var(--g100,#F6F3EE);overflow:auto;padding:22px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;color:var(--g900,#1A1814);box-shadow:-10px 0 40px rgba(0,0,0,.18);text-align:left}.lns-dim:has(.lns-panel){background:rgba(18,16,12,.22)}.lns-panel .lns-shh .lns-t b{font-size:22px}',
    '@keyframes lnsU{from{transform:translateY(40px);opacity:.4}}@keyframes lnsF{from{opacity:0}}@media (prefers-reduced-motion:reduce){.lns-dim,.lns-sheet{animation:none}}',
    '.lns-hn{width:44px;height:5px;border-radius:3px;background:var(--g300,#E7E2D9);margin:0 auto 2px;flex:none;display:block}.lns-shh{display:flex;gap:12px;align-items:center}.lns-t{flex:1;min-width:0}.lns-t b{display:block;font-size:18px;font-weight:900;letter-spacing:-.02em}.lns-t span{display:block;font-size:13px;color:var(--g700,#5C554B);margin-top:2px;line-height:1.45}',
    '.lns-x{width:44px;height:44px;border-radius:50%;background:var(--g200,#F3F0EA);display:grid;place-items:center;color:var(--g800,#3F3A33);flex:none;border:0;cursor:pointer}.lns-flag{width:48px;height:48px;border-radius:14px;background:var(--y50,#FFF7DB);color:var(--y700,#8A6500);display:grid;place-items:center;flex:none}',
    '.lns-steps{display:flex;gap:6px}.lns-steps div{flex:1;min-width:0;border-radius:14px;padding:8px 10px;border:1px solid var(--g300,#E7E2D9);font-size:13px;color:var(--g600,#736B5F);min-height:52px;box-sizing:border-box}.lns-steps div b{display:block;font-size:13.5px;color:var(--g900,#1A1814);margin-top:1px}.lns-steps .done{background:var(--gr50,#ECFDF3);border-color:var(--gr100,#D1FADF)}.lns-steps .cur{border:2px solid var(--gr700,#00862D);box-shadow:0 0 0 4px var(--gr50,#ECFDF3)}.lns-steps i{font-style:normal;font-weight:900;color:var(--gr700,#00862D)}',
    '.lns-f{display:flex;flex-direction:column;gap:14px}.lns-fl>label{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-weight:800;margin-bottom:6px;gap:8px}.lns-fl>label span{font-weight:600;color:var(--g600,#736B5F)}.lns-a{background:none;border:0;color:var(--gr700,#00862D);font:inherit;font-size:13.5px;font-weight:800;cursor:pointer;min-height:44px;padding:0 4px}.lns-offb{align-self:center;color:var(--co700,#B53C0A)}',
    '.lns-inp{min-height:52px;border:1.5px solid var(--g300,#E7E2D9);border-radius:14px;display:flex;align-items:center;padding:0 4px 0 14px;gap:10px;background:#fff;color:var(--g700,#5C554B);box-sizing:border-box}.lns-inp:focus-within,.lns-inp.f{border-color:var(--gr700,#00862D);box-shadow:0 0 0 4px var(--gr50,#ECFDF3)}.lns-inp input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:15px;min-height:44px;color:var(--g900,#1A1814);padding:0}.lns-inp input[type=password]{font-family:ui-monospace,monospace;letter-spacing:.04em}',
    '.lns-hint{font-size:13px;color:var(--g600,#736B5F);line-height:1.5;margin:6px 0 0}.lns-err{font-size:13px;color:var(--co700,#B53C0A);margin:0;min-height:0}.lns-err:empty{display:none}.lns-guide ol{margin:8px 0 0;padding-left:20px;font-size:13px;line-height:1.6;color:var(--g700,#5C554B)}',
    '.lns-why{border-radius:16px;background:var(--g50,#FAF8F5);border:1px solid var(--g300,#E7E2D9);padding:4px 12px}.lns-why div{display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--g200,#F3F0EA);font-size:13px;line-height:1.5;color:var(--g700,#5C554B)}.lns-why div:first-child{border-top:0}.lns-why div>b{flex:none;width:52px;color:var(--g900,#1A1814);font-weight:900}',
    '.lns-safe{display:flex;gap:6px;align-items:center;font-size:13px;color:var(--g700,#5C554B);margin:0}.lns-safe svg{color:var(--gr700,#00862D)}.lns-acts{display:flex;gap:8px}.lns-acts .lns-b.s{flex:0 0 96px}.lns-acts .lns-b.p{flex:1}',
    '.lns-gbody{display:flex;flex-direction:column;gap:14px}.lns-res{display:flex;flex-direction:column;border:1px solid var(--g300,#E7E2D9);border-radius:16px;padding:0 12px}.lns-opt{display:flex;align-items:center;gap:10px;min-height:56px;background:none;border:0;border-top:1px solid var(--g200,#F3F0EA);text-align:left;font:inherit;color:inherit;cursor:pointer;padding:8px 0}.lns-opt:first-child{border-top:0}.lns-opt>span{flex:1;min-width:0}.lns-opt b{display:block;font-size:15px;font-weight:800}.lns-opt small{display:block;font-size:13px;color:var(--g600,#736B5F)}',
    '.lns-rd{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--g400,#D6CFC2);display:grid;place-items:center;flex:none}.lns-opt.on .lns-rd{background:var(--gr700,#00862D);border-color:var(--gr700,#00862D);color:#fff}',
    '.lns-chips{display:flex;flex-wrap:wrap;gap:8px}.lns-chip{min-height:44px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;border-radius:99px;border:1px solid var(--g300,#E7E2D9);background:#fff;font:inherit;font-size:14px;font-weight:700;white-space:nowrap;cursor:pointer;color:var(--g900,#1A1814);position:relative;box-sizing:border-box}.lns-chip.on{border:1.5px solid var(--gr500,#00C53B);background:var(--gr50,#ECFDF3);color:var(--gr700,#00862D)}.lns-chip small{font-size:13px;font-weight:800}.lns-chip input[type=date]{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}',
    '.lns-seg3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.lns-seg3 .lns-chip{justify-content:center}',
    '.lns-ring{position:relative;flex:none;display:inline-block}.lns-ring svg{display:block}.lns-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:15px;font-weight:900;color:#fff}',
    '.lns-draft{display:flex;align-items:center;gap:12px;border:1.5px dashed var(--gr500,#00C53B);border-radius:20px;background:#fff;padding:12px 12px 12px 14px}',
    '.lns-phase{display:grid;grid-template-columns:28px 1fr auto;gap:4px 10px;align-items:center;padding:10px 0;border-top:1px solid var(--g200,#F3F0EA)}.lns-gh+.lns-phase{border-top:0}.lns-phase>em{font-style:normal;width:28px;height:28px;border-radius:9px;background:var(--g200,#F3F0EA);color:var(--g700,#5C554B);font-weight:900;font-size:13px;display:grid;place-items:center}.lns-phase.now>em{background:var(--gr700,#00862D);color:#fff}',
    '.lns-phase b{font-size:15px;font-weight:800;display:block}.lns-phase span span{font-size:13px;color:var(--g600,#736B5F)}.lns-phase small{font-size:13px;font-weight:800;color:var(--g600,#736B5F)}.lns-phase.now small{color:var(--gr700,#00862D)}.lns-bar{grid-column:2/4;height:6px;border-radius:3px;background:var(--g200,#F3F0EA);overflow:hidden}.lns-bar i{display:block;height:100%;background:var(--gr500,#00C53B);border-radius:3px}',
    '.lns-wk{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--g200,#F3F0EA);min-height:56px}.lns-gh+.lns-wk{border-top:0}.lns-d{width:44px;height:44px;border-radius:14px;background:var(--g100,#F6F3EE);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:15px;line-height:1.05;flex:none}.lns-d small{font-size:13px;font-weight:700;color:var(--g600,#736B5F)}.lns-d.td{background:var(--gr700,#00862D);color:#fff}.lns-d.td small{color:#fff}',
    '.lns-wk.done .lns-tx b{text-decoration:line-through;color:var(--g600,#736B5F)}.lns-chk{width:44px;height:44px;border-radius:50%;border:0;background:none;display:grid;place-items:center;cursor:pointer;flex:none;padding:0;position:relative}.lns-chk::before{content:"";position:absolute;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--g400,#D6CFC2);box-sizing:border-box}.lns-chk.on::before{background:var(--gr700,#00862D);border-color:var(--gr700,#00862D)}.lns-chk svg{position:relative;color:#fff}',
    '.lns-gfoot{display:flex;gap:8px;justify-content:flex-end}.lns-c2{text-align:center}',
    '.lns-empty{display:flex;flex-direction:column;gap:12px}.lns-ph{height:260px;border-radius:20px;background-size:cover;background-position:center;display:flex;align-items:flex-end;padding:18px}.lns-ph p{color:#fff;font-size:18px;font-weight:900;line-height:1.35;margin:0}',
    '.lns-ent{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.lns-en{display:flex;align-items:center;gap:10px;min-height:64px;padding:10px 12px;border-radius:18px;background:#fff;border:1px solid var(--g300,#E7E2D9);color:var(--g900,#1A1814);text-decoration:none;box-sizing:border-box;min-width:0}.lns-en>svg{color:var(--gr700,#00862D)}.lns-en span{min-width:0}.lns-en b{display:block;font-size:14.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lns-en small{display:block;font-size:13px;color:var(--g600,#736B5F);line-height:1.35}',
    '@media (max-width:420px){.lns-ent{grid-template-columns:1fr}}',
    '.lns-li{display:flex;flex-direction:column;gap:12px}.lns-lib{width:100%;min-height:52px}.lns-lib .lns-lt{background:#fff;color:var(--g900,#1A1814)}.lns-sh3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.lns-sb{min-height:64px;border-radius:16px;border:1px solid var(--g300,#E7E2D9);background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:inherit;font-size:13px;font-weight:800;color:var(--g800,#3F3A33);cursor:pointer;padding:6px}',
    '.lns-leave{background:var(--co50,#FFF3EC);border:1px solid #FFD9C4;border-radius:20px;padding:16px;margin:4px 0 12px;text-align:left;display:flex;flex-direction:column;gap:10px}.lns-lh{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:900;color:var(--co700,#B53C0A)}.lns-leave p{margin:0;font-size:13.5px;line-height:1.55;color:var(--g700,#5C554B)}',
    '.lns-lk{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.lns-lk div{background:#fff;border-radius:14px;padding:10px 12px}.lns-lk b{display:block;font-size:19px;font-weight:900}.lns-lk span{font-size:13px;color:var(--g600,#736B5F)}',
    '.lns-lb{display:flex;flex-wrap:wrap;gap:8px}.lns-lb .lns-b{flex:1 1 120px;min-height:52px}.lns-b.got{background:var(--gr50,#ECFDF3);color:var(--gr700,#00862D);border:1px solid var(--gr100,#D1FADF)}',
    '.lns-quiet{background:#fff;border:1px solid var(--g300,#E7E2D9);border-radius:16px;padding:8px 12px;margin:0 0 12px;color:var(--g900,#1A1814);text-decoration:none;min-height:60px}.lns-leave-go{background:#fff!important;color:var(--co700,#B53C0A)!important;border:1.5px solid var(--co500,#FF6B2C)!important;min-height:48px}',
    '.lns-keep{display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:var(--gr50,#ECFDF3);border:1px solid var(--gr100,#D1FADF);border-radius:20px;padding:16px;margin:0 0 14px;text-align:left}.lns-keep .lns-tx{flex:1 1 220px}.lns-keep .lns-tx b{font-size:16px}.lns-keep .lns-b{flex:1 1 auto}',
    '.lns-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.lns-help{align-self:center}',
    '.lns-fade{position:fixed;left:0;right:0;bottom:0;height:130px;pointer-events:none;z-index:4;background:linear-gradient(180deg,rgba(246,243,238,0),rgba(246,243,238,.55) 55%,rgba(246,243,238,.92))}html[data-theme=dark] .lns-fade{background:linear-gradient(180deg,rgba(14,26,20,0),rgba(14,26,20,.55) 55%,rgba(14,26,20,.92))}body:not(.lapp) .lns-fade{display:none}',
    '.lns-ver{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0;font-size:13px;color:var(--g600,#736B5F)}.lns-ver b{display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border-radius:99px;background:var(--gr50,#ECFDF3);color:var(--gr700,#00862D);font-weight:800}.lns-ver svg{color:var(--gr700,#00862D)}.lns-ver.bad b{background:var(--co50,#FFF3EC);color:var(--co700,#B53C0A)}',
    '.lns-cap{margin:4px 0 -4px;font-size:15px;font-weight:900}.lns-verify h1{margin:12px 0}.lns-verify .lns-why{margin:12px 0}',
    '.lns-shelf{background:#fff;border:1px solid var(--g300,#E7E2D9);border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:12px;align-items:flex-start;margin-bottom:32px}.lns-shr{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;width:100%}',
    'html[data-theme=dark] .lns-grp,html[data-theme=dark] .lns-pv>div,html[data-theme=dark] .lns-en,html[data-theme=dark] .lns-sheet,html[data-theme=dark] .lns-draft,html[data-theme=dark] .lns-c,html[data-theme=dark] .lns-b.s,html[data-theme=dark] .lns-sb,html[data-theme=dark] .lns-chip,html[data-theme=dark] .lns-inp{background:var(--g200);border-color:rgba(255,255,255,.08);box-shadow:none}html[data-theme=dark] .lns-app,html[data-theme=dark] .lns-panel{background:var(--g100)}'
  ].join('');
  (document.head || document.documentElement).appendChild(st);
  window.LNOTE_SYNC = { plan, mask, liUrl, mdBundle, csvCards, F, entry };
})();
