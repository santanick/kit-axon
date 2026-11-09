/* v35 lcontent — 학습자 화면 교안 · AI 강의 영상 · 업로드 파일 · 디지털북 보기 (C8)
   운영자 콘텐츠 도구(crs-content.js)가 게시본 항목에 실어 보내는 내용을 학습자 화면(앱 화면 · 기존 화면 공통 viewCourse)에 그린다.
   - 교안 it.doc{goals,secs[{h,body,pts}],act,check[]} → 읽기 좋은 본문 + 글자 크기 조절(이 브라우저에 기억) + [다 읽었어요]
   - AI 강의 영상 it.src 'ai' + it.ai{scenes[{h,pts,say}],voice} → 슬라이드 + 브라우저 음성 합성 + 자막. '미리보기 품질'을 정직하게 표시.
     진도: 들은 문장 비율 → rec.w, 80% 이상이면 완료(YouTube 규칙 lrun2.js ytMount와 같음)
   - 업로드 it.src 'upload'|'library' + url('/api/media/f/<id>' 서버 · 'idb:loc_…' 데모 · 'media:<id>') + mime
     영상 · 음성 = 재생(서버 주소는 Range 스트리밍), 실제 재생 구간 80% 이상이면 완료 · pdf = 보기(휴대폰은 새 창) · 그 밖 = 내려받기
     데모 파일은 hpmedia.js(HPM.src)가 있을 때 IndexedDB에서 읽는다. 없거나 다른 기기면 '운영자가 올린 파일(데모)' 안내.
   - 디지털북 it.src 'book' + it.book(책 id) → lbook.js #bk/<id> 보기로 연결 + 교안 본문
   기존 화면 구조(lassess · lcomm 패널 · lles26 배치)는 그대로 두고 항목 본문 자리만 바꾼다. 학습자 문구는 ~해요체. */
(function () {
  'use strict';
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const IC = (n, s) => (typeof ico === 'function' ? ico(n, s) : '');
  try { if (typeof ICP === 'object' && ICP && !ICP.audio) ICP.audio = 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11'; } catch (e) { } /* 음성 아이콘(ICP 내용만 보탬) */
  try { if (typeof ITN === 'object' && ITN && !ITN.audio) ITN.audio = '음성'; if (typeof ITI === 'object' && ITI && !ITI.audio) ITI.audio = 'audio'; if (typeof BK_ITN === 'object' && BK_ITN && !BK_ITN.audio) BK_ITN.audio = '음성'; } catch (e) { } /* 음성 항목(type 'audio') 이름 · 아이콘 */
  const say = (m, k) => { try { toast(m, k || 'ok'); } catch (e) { } };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
  const FAST = () => !!(window.__LC_FAST || window.__REC_FAST);
  const phone = () => (window.innerWidth || 1024) <= 700;
  const sizeTx = b => !b ? '' : b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(1) + 'GB' : b >= 1024 ** 2 ? (b / 1024 ** 2).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB';
  const sentences = s => String(s || '').split(/(?<=[.!?。])\s+/).map(x => x.trim()).filter(Boolean);
  const secsFor = s => FAST() ? 0.3 : Math.min(22, Math.max(3.5, String(s || '').length / 7));

  /* ── 학습 기록(lrun2.js와 같은 자리: LR.lp.cls[과정].items[항목] {w, done, pos}) ── */
  const recOf = (cid, iid) => { const L = LR.lp.cls = LR.lp.cls || {}; const c = L[cid] = L[cid] || { items: {} }; c.items = c.items || {}; return (c.items[iid] = c.items[iid] || {}); };
  const peek = (cid, iid) => ((((LR.lp || {}).cls || {})[cid] || {}).items || {})[iid] || {};
  const save = () => { try { if (LR.me) LR.api.save(); } catch (e) { } };
  function progress(cid, iid, w, opt) { opt = opt || {}; const r = recOf(cid, iid); let changed = false;
    if (w > (r.w || 0)) { r.w = Math.round(Math.min(1, w) * 100) / 100; changed = true; }
    if (opt.pos != null) r.pos = Math.floor(opt.pos);
    if (r.w >= 0.8 && !r.done) { r.done = true; changed = true; say(opt.msg || '시청 완료로 기록했어요.'); }
    if (changed || opt.force) save(); paintBar(cid, iid); return r; }
  function paintBar(cid, iid) { const r = peek(cid, iid); const box = document.querySelector(`.lc[data-c="${CSS.escape(cid)}"][data-i="${CSS.escape(iid)}"]`); if (!box) return;
    const b = box.querySelector('.lc-bar i'); if (b) b.style.width = Math.round((r.w || 0) * 100) + '%';
    const t = box.querySelector('.lc-bart'); if (t) t.textContent = `${box.dataset.unit || '시청'} ${Math.round((r.w || 0) * 100)}%${r.done ? ' · 완료했어요' : ' · 80% 넘게 보면 완료돼요'}`; }

  /* ── 항목 종류 판단 ── */
  const realUrl = u => /^(\/api\/media\/f\/|idb:loc_|media:|https:\/\/)/.test(String(u || ''));
  const extOf = it => (String(it.file || it.name || it.title || '').match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '';
  function fileKind(it) { const m = String(it.mime || '').toLowerCase(); const x = extOf(it).toLowerCase();
    if (/^video\//.test(m) || /^(mp4|webm|mov|m4v)$/.test(x)) return 'video';
    if (/^audio\//.test(m) || /^(mp3|m4a|wav|ogg|aac)$/.test(x)) return 'audio';
    if (m === 'application/pdf' || x === 'pdf') return 'pdf';
    if (/^image\//.test(m) || /^(png|jpe?g|webp|gif)$/.test(x)) return 'image';
    return it.type === 'video' && !m && !x ? 'video' : 'file'; }
  function kindOf(it) { if (!it) return '';
    if (it.type === 'video' && it.src === 'ai' && it.ai && (it.ai.scenes || []).length) return 'ai';
    if ((it.src === 'upload' || it.src === 'library') && (it.type === 'video' || it.type === 'doc' || it.type === 'audio')) { if (realUrl(it.url)) return 'file'; if (it.type === 'doc' || it.type === 'audio') return 'file0'; return ''; } /* 이름만 있는 영상은 기존 데모 플레이어(lassess) */
    if (it.type === 'doc' && it.src === 'book') return 'book';
    if (it.type === 'doc' && it.doc && (it.doc.secs || []).length) return 'doc';
    return ''; }

  /* ── 교안 본문 ── */
  const FSK = 'didisam.lc.fs'; const FS = [16, 18, 20, 23, 26];
  const fsIdx = () => { const v = parseInt(lsGet(FSK), 10); return Number.isFinite(v) ? Math.max(0, Math.min(FS.length - 1, v)) : (phone() ? 1 : 1); };
  function docHTML(D) { if (!D) return ''; const goals = (D.goals || []).filter(Boolean), secs = D.secs || [], chk = (D.check || []).filter(Boolean);
    return `<div class="lc-doc" style="--lcfs:${FS[fsIdx()]}px">
      ${goals.length ? `<section class="lc-goal"><h3>${IC('target', 18)} 이 시간에 배울 것</h3><ul>${goals.map(g => `<li>${E(g)}</li>`).join('')}</ul></section>` : ''}
      ${secs.map((s, i) => `<section class="lc-sec"><h3><span class="lc-no">${i + 1}</span>${E(s.h || `내용 ${i + 1}`)}</h3>${s.body ? `<p>${E(s.body)}</p>` : ''}${(s.pts || []).length ? `<ul>${s.pts.map(p => `<li>${E(p)}</li>`).join('')}</ul>` : ''}</section>`).join('')}
      ${D.act ? `<section class="lc-act"><h3>${IC('edit', 18)} 직접 해 봐요</h3><p>${E(D.act)}</p></section>` : ''}
      ${chk.length ? `<section class="lc-chk"><h3>${IC('check', 18)} 스스로 확인해 봐요</h3><p class="lc-sub">답을 떠올려 본 뒤 다음으로 넘어가요.</p><ol>${chk.map(q => `<li>${E(q)}</li>`).join('')}</ol></section>` : ''}
    </div>`; }
  const fsTools = () => `<div class="lc-tools" role="group" aria-label="글자 크기"><span>글자 크기</span><button type="button" class="lc-fs" data-lcfs="-1" aria-label="글자 작게">가<small>−</small></button><button type="button" class="lc-fs" data-lcfs="1" aria-label="글자 크게">가<small>+</small></button></div>`;
  const doneBtn = (c, it, st, label) => `<div class="lc-done"><button class="lbtn ${st.done ? 'ghost' : 'pri'}" data-lact="done" data-c="${E(c.id)}" data-i="${E(it.id)}">${st.done ? `${IC('check', 16)} 완료했어요` : E(label || '다 읽었어요')}</button></div>`;
  const descHTML = it => it.desc ? `<div class="lc-desc">${typeof nl === 'function' ? nl(it.desc) : E(it.desc)}</div>` : '';

  /* ── AI 강의 영상(슬라이드 + 음성 합성) ── */
  function aiHTML(c, it, st) { const S2 = it.ai.scenes; const s0 = S2[0];
    return `<div class="lc-ai" data-lcai="1">
      <div class="lc-stage" aria-live="polite"><div class="lc-slide"><small class="lc-sn">장면 1 / ${S2.length}</small><h3>${E(s0.h)}</h3><ul>${(s0.pts || []).map(p => `<li>${E(p)}</li>`).join('')}</ul></div>
        <p class="lc-cap" aria-label="자막">재생을 누르면 AI 강사가 읽어 줘요.</p></div>
      <div class="lc-ctl"><button type="button" class="lbtn ghost lc-c" data-lcp="prev" aria-label="이전 장면">${IC('arrow', 16)}<span>이전</span></button><button type="button" class="lbtn pri lc-play" data-lcp="play">▶ 재생</button><button type="button" class="lbtn ghost lc-c" data-lcp="next" aria-label="다음 장면"><span>다음</span>${IC('arrow', 16)}</button><button type="button" class="lbtn ghost lc-c" data-lcp="mute" aria-pressed="false">${'speechSynthesis' in window ? '소리 끄기' : '소리 없음'}</button></div>
      <p class="lc-q"><b>미리보기 품질</b> 브라우저의 음성으로 읽어 주는 AI 강의예요. 목소리가 기계처럼 들릴 수 있고, 자막과 슬라이드로도 내용을 볼 수 있어요.</p>
      <div class="lc-bar"><i style="width:${Math.round((st.w || 0) * 100)}%"></i></div><small class="lc-bart">시청 ${Math.round((st.w || 0) * 100)}%${st.done ? ' · 완료했어요' : ' · 80% 넘게 보면 완료돼요'}</small>
      <details class="lc-script"><summary>강의 대본 전체 보기</summary>${S2.map((s, i) => `<p><b>${i + 1}. ${E(s.h)}</b><br>${E(s.say)}</p>`).join('')}</details>
    </div>`; }
  let AIP = null; /* 지금 화면의 AI 강의 플레이어 하나 */
  function aiStop() { if (!AIP) return; AIP.alive = false; clearTimeout(AIP.tm); clearTimeout(AIP.guard); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } AIP = null; }
  const SEEN = new WeakSet(); /* 붙인 요소(다른 화면 코드가 innerHTML로 옮겨 그려도 새 요소에 다시 붙인다) */
  function aiMount(box, c, it) { if (!box) return; const live = AIP && AIP.alive && AIP.iid === it.id; if (SEEN.has(box) && live) return; SEEN.add(box); if (live) { AIP.paint(); return; } aiStop();
    const scenes = it.ai.scenes; const plan = scenes.map(s => { const ss = sentences(s.say); return ss.length ? ss : [s.h || '']; }); const total = plan.reduce((a, x) => a + x.length, 0);
    const st0 = peek(c.id, it.id); let start = Math.min(total - 1, Math.max(0, +st0.pos || 0)); if (st0.done) start = 0;
    const at = n => { let i = 0; while (i < plan.length && n >= plan[i].length) { n -= plan[i].length; i++; } return [Math.min(i, plan.length - 1), n]; };
    const P = AIP = { alive: true, on: false, n: start, muted: !('speechSynthesis' in window), seen: new Set(), tm: 0, guard: 0, tok: 0, iid: it.id };
    const q = s => { const b = document.querySelector(`.lc[data-i="${CSS.escape(it.id)}"] .lc-ai`) || box; return b.querySelector(s); }; const syn = window.speechSynthesis;
    if (!('speechSynthesis' in window)) { const m = q('[data-lcp=mute]'); if (m) m.disabled = true; }
    const paint = () => { const [i, k] = at(P.n); const s = scenes[i]; const sl = q('.lc-slide');
      if (sl && sl.dataset.i !== String(i)) { sl.dataset.i = String(i); sl.innerHTML = `<small class="lc-sn">장면 ${i + 1} / ${scenes.length}</small><h3>${E(s.h)}</h3><ul>${(s.pts || []).map(p => `<li>${E(p)}</li>`).join('')}</ul>`; }
      const cap = q('.lc-cap'); if (cap) cap.textContent = P.on || P.n > 0 ? (plan[i][k] || '') : '재생을 누르면 AI 강사가 읽어 줘요.';
      const pb = q('.lc-play'); if (pb) pb.textContent = P.on ? '❚❚ 일시정지' : P.n >= total - 1 && P.seen.size ? '↺ 처음부터' : '▶ 재생'; };
    const mark = () => { P.seen.add(P.n); const base = peek(c.id, it.id).w || 0; const w = Math.max(base, P.seen.size / total); progress(c.id, it.id, w, { pos: P.n });
      if (P.n >= total - 1 && P.seen.size) { if (P.seen.size / total >= 0.8 || base >= 0.8) progress(c.id, it.id, 1, { pos: 0 }); } };
    const LG = String(it.ai.lang || 'ko-KR'); const pickVoice = () => { try { const vs = syn.getVoices().filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(LG.slice(0, 2).toLowerCase())); const want = (it.ai.voice || 'f') === 'm'; const nm = it.ai.vname && vs.find(v => v.name === it.ai.vname); if (nm) return nm; return vs.find(v => want ? /male|남|Minsu|InJoon/i.test(v.name) && !/female/i.test(v.name) : /female|여|Yuna|SunHi|Heami/i.test(v.name)) || vs[0] || null; } catch (e) { return null; } };
    const step = () => { if (!P.alive || AIP !== P) return; clearTimeout(P.tm); clearTimeout(P.guard); try { syn && syn.cancel(); } catch (e) { } paint(); if (!P.on) return;
      const my = ++P.tok; const [i, k] = at(P.n); const cap = plan[i][k] || ''; let fired = false;
      const nx = () => { if (fired || !P.alive || !P.on || my !== P.tok) return; fired = true; mark(); if (P.n >= total - 1) { P.on = false; paint(); if (typeof window.l26Ended === 'function') try { window.l26Ended(); } catch (e) { } return; } P.n++; step(); };
      const sec = secsFor(cap);
      if (syn && !P.muted && cap && !FAST()) { try { const u = new SpeechSynthesisUtterance(cap); u.lang = LG; u.rate = Math.min(2, Math.max(0.5, +it.ai.rate || 1)); const v = pickVoice(); if (v) u.voice = v; u.onend = nx; u.onerror = () => { P.tm = setTimeout(nx, sec * 1000); }; syn.speak(u); P.guard = setTimeout(nx, (sec * 2.2 + 3) * 1000); /* 음성이 끝 신호를 안 주는 브라우저 대비 */ } catch (e) { P.tm = setTimeout(nx, sec * 1000); } }
      else P.tm = setTimeout(nx, sec * 1000); };
    P.paint = () => { const sl = q('.lc-slide'); if (sl) delete sl.dataset.i; const m = q('[data-lcp=mute]'); if (m) m.textContent = P.muted ? '소리 켜기' : '소리 끄기'; paint(); };
    P.click = b => { if (AIP !== P) return; const k = b.dataset.lcp; const [i] = at(P.n);
      if (k === 'play') { if (!P.on && P.n >= total - 1 && P.seen.size) { P.n = 0; } P.on = !P.on; step(); }
      if (k === 'prev') { const t = Math.max(0, i - 1); P.n = plan.slice(0, t).reduce((a, x) => a + x.length, 0); step(); }
      if (k === 'next') { const t = Math.min(scenes.length - 1, i + 1); P.n = plan.slice(0, t).reduce((a, x) => a + x.length, 0); step(); }
      if (k === 'mute') { P.muted = !P.muted; b.textContent = P.muted ? '소리 켜기' : '소리 끄기'; b.setAttribute('aria-pressed', P.muted ? 'true' : 'false'); step(); } };
    paint(); }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.lc-ai [data-lcp]'); if (!b || !AIP || !AIP.click) return; e.preventDefault(); AIP.click(b); });

  /* ── 올린 파일(영상 · 음성 · 문서) ── */
  const FKN = { video: '영상', audio: '음성', pdf: '문서(PDF)', image: '그림', file: '파일' };
  function fileHTML(c, it, st, fk) { const name = it.file || it.name || it.title || '파일'; const meta = [FKN[fk], sizeTx(+it.size || 0)].filter(Boolean).join(' · ');
    const tools = `<div class="lc-ftools"><span class="lc-fn">${IC(fk === 'video' ? 'video' : fk === 'audio' ? 'audio' : 'book', 15)} <b>${E(name)}</b>${meta ? ` <small>${E(meta)}</small>` : ''}</span><span class="lc-fa">${fk === 'pdf' && !phone() ? `<button type="button" class="lbtn ghost sm" data-lcf="open">새 창에서 크게 보기</button>` : ''}<button type="button" class="lbtn ghost sm" data-lcf="down">내려받기</button></span></div>`;
    let body = '';
    if (fk === 'video') body = `<div class="lc-media"><video controls playsinline preload="metadata" controlslist="nodownload" data-lcm-media="1" aria-label="${E(it.title)} 영상"></video><p class="lc-wait">영상을 불러오고 있어요…</p></div>`;
    else if (fk === 'audio') body = `<div class="lc-media lc-aud"><span class="lc-audi">${IC('audio', 34)}</span><audio controls preload="metadata" data-lcm-media="1" aria-label="${E(it.title)} 음성"></audio><p class="lc-wait">음성을 불러오고 있어요…</p></div>`;
    else if (fk === 'pdf') body = phone() ? `<div class="lc-pdfm">${IC('book', 30)}<p>휴대폰에서는 문서를 새 창에서 크게 볼 수 있어요.</p><button type="button" class="lbtn pri" data-lcf="open">문서 열어 보기</button></div>` : `<div class="lc-media lc-pdfw"><iframe class="lc-pdf" title="${E(it.title)} 문서" data-lcm-media="1"></iframe><p class="lc-wait">문서를 불러오고 있어요…</p></div><p class="lc-hint">문서가 보이지 않으면 [새 창에서 크게 보기]나 [내려받기]를 눌러 주세요.</p>`;
    else if (fk === 'image') body = `<div class="lc-media"><img alt="${E(it.title)}" data-lcm-media="1"><p class="lc-wait">그림을 불러오고 있어요…</p></div>`;
    else body = `<div class="lc-pdfm">${IC('book', 30)}<p>이 파일은 내려받아서 열어요. 컴퓨터나 휴대폰에 있는 프로그램(한글 · 워드 · 파워포인트 등)으로 열 수 있어요.</p><button type="button" class="lbtn pri" data-lcf="down">파일 내려받기</button></div>`;
    const auto = fk === 'video' || fk === 'audio';
    return `<div class="lc-file" data-fk="${fk}">${fk === 'pdf' ? tools + body : body + tools}${auto ? `<div class="lc-bar"><i style="width:${Math.round((st.w || 0) * 100)}%"></i></div><small class="lc-bart">${fk === 'audio' ? '듣기' : '시청'} ${Math.round((st.w || 0) * 100)}%${st.done ? ' · 완료했어요' : ' · 80% 넘게 보면 완료돼요'}</small>` : ''}</div>${descHTML(it)}${auto ? '' : doneBtn(c, it, st, fk === 'pdf' ? '다 읽었어요' : '확인했어요')}`; }
  function file0HTML(c, it, st) { const name = it.file || it.name || String(it.url || '').replace(/^upload:/, '') || it.title;
    return `<div class="lc-file"><div class="lc-demo">${IC('book', 26)}<div><b>운영자가 올린 파일(데모)</b><p>「${E(name)}」 파일이 여기에 들어 있어요. 데모 화면에서는 파일 이름만 보여요. 실제 운영에서는 여기서 바로 열거나 내려받을 수 있어요.</p></div></div></div>${descHTML(it)}${doneBtn(c, it, st, '확인했어요')}`; }
  const demoNote = (why) => `<div class="lc-demo">${IC('book', 26)}<div><b>운영자가 올린 파일(데모)</b><p>${E(why || '데모에서 올린 파일은 운영자가 올린 같은 브라우저에서만 열려요. 실제 운영 서버에서는 어디서든 열 수 있어요.')}</p></div></div>`;
  /* 주소 만들기: 서버 파일은 그대로, 데모(IndexedDB) 파일은 HPM이 있을 때만 */
  const HP = () => window.HPM || (typeof HPM !== 'undefined' ? HPM : null); // eslint-disable-line no-undef
  async function srcOf(url) { const u = String(url || ''); if (/^(\/api\/media\/f\/|https:\/\/)/.test(u)) return u;
    const h = HP(); if (h && typeof h.src === 'function') return h.src(u);
    const m = /^media:(tn_[a-z0-9]{8,16}\.[a-f0-9]{40})$/.exec(u); if (m) return '/api/media/f/' + m[1];
    const e = new Error('demo'); e.code = 'media_demo'; throw e; }
  function fileMount(box, c, it, fk) { if (!box || SEEN.has(box)) return; SEEN.add(box);
    const el = box.querySelector('[data-lcm-media]'); const wait = box.querySelector('.lc-wait'); const name = it.file || it.name || it.title || 'file';
    const fail = why => { const w = el ? el.closest('.lc-media') : null; if (w) w.outerHTML = demoNote(why); else if (wait) wait.remove(); };
    FILE = { iid: it.id, act: async b => { try { if (b.dataset.lcf === 'down') { const h = HP(); if (h && typeof h.download === 'function' && !/^\/api\/media\/f\//.test(it.url)) { await h.download(it.url, name); return; } const u = await srcOf(it.url); const a = document.createElement('a'); a.href = u + (/^\/api\//.test(u) ? (u.includes('?') ? '&' : '?') + 'dl=1' : ''); a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); return; }
        if (b.dataset.lcf === 'open') { const u = await srcOf(it.url); const w = window.open(u, '_blank', 'noopener'); if (!w && !/^blob:/.test(u)) location.href = u; } }
      catch (x) { say(x.code === 'media_demo' || x.code === 'media_missing' ? '데모에서 올린 파일은 운영자가 올린 같은 브라우저에서만 열려요.' : (x.message || '파일을 열지 못했어요.'), 'warn'); } } };
    if (!el) return;
    srcOf(it.url).then(u => { if (!document.body.contains(el)) return; if (wait) wait.remove();
      if (fk === 'video' || fk === 'audio') { const seen = new Set(); let last = 0;
        el.addEventListener('error', () => fail('이 화면에서는 파일을 재생하지 못했어요. [내려받기]로 받아서 볼 수 있어요.'), { once: true });
        el.addEventListener('loadedmetadata', () => { const r = peek(c.id, it.id); if (r.pos && !r.done && r.pos < (el.duration || 0) - 3) try { el.currentTime = r.pos; } catch (e) { } });
        el.addEventListener('timeupdate', () => { if (!el.duration || !isFinite(el.duration) || el.paused || el.playbackRate > 2) return; seen.add(Math.floor(el.currentTime)); const now = Date.now(); if (now - last < 2500) return; last = now;
          const base = peek(c.id, it.id).w || 0; progress(c.id, it.id, Math.max(base, seen.size / Math.max(1, Math.floor(el.duration))), { pos: el.currentTime }); });
        el.addEventListener('ended', () => { const base = peek(c.id, it.id).w || 0; const w = Math.max(base, seen.size / Math.max(1, Math.floor(el.duration || 1))); progress(c.id, it.id, w >= 0.8 ? 1 : w, { pos: 0, force: true }); if (typeof window.l26Ended === 'function') try { window.l26Ended(); } catch (e) { } });
        el.src = u; }
      else if (fk === 'pdf') { el.src = u; }
      else if (fk === 'image') { el.addEventListener('error', () => fail('그림을 불러오지 못했어요.'), { once: true }); el.src = u; }
    }).catch(x => fail(x && x.code === 'media_missing' ? '이 파일은 운영자가 올린 브라우저에만 저장되어 있어요(데모). 실제 운영 서버에서는 어디서든 열 수 있어요.' : x && x.code === 'media_demo' ? '' : (x && x.message) || ''));
  }
  let FILE = null;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.lc [data-lcf]'); if (!b) return; e.preventDefault(); const box = b.closest('.lc'); if (FILE && box && box.dataset.i === FILE.iid) FILE.act(b); });
  /* 화면 보안 규칙(CSP)이 영상 · 문서 주소를 막은 경우 → 안내로 바꾼다 */
  document.addEventListener('securitypolicyviolation', e => { const u = String(e.blockedURI || ''); if (!/^(blob|data)|\/api\/media\/f\//.test(u)) return; document.querySelectorAll('.lc [data-lcm-media]').forEach(el => { const w = el.closest('.lc-media'); if (w && (/^blob/.test(u) ? /^blob:/.test(el.src || el.currentSrc || '') : true)) w.outerHTML = demoNote('이 화면에서는 파일을 바로 보여 줄 수 없어요. [내려받기]나 [새 창에서 크게 보기]를 눌러 주세요.'); }); });

  /* ── 디지털북 ── */
  function bookHTML(c, it, st) { let bk = null; try { bk = (SITE().dbooks || []).find(b => b.id === it.book && (b.on !== false || LR.mode === 'preview')); } catch (e) { }
    const has = bk && (bk.chs || []).some(ch => (ch.blocks || []).length);
    const card = bk ? `<a class="lc-book" href="${has ? '#bk/' + E(bk.id) : bk.url ? E(bk.url) : '#books'}" ${!has && bk.url ? 'target="_blank" rel="noopener"' : ''} style="--c:${E(bk.color || '#5C74F6')}"><span class="lc-bkc">${IC('book', 28)}</span><span class="lc-bkt"><small>디지털북</small><b>${E(bk.title || it.title)}</b><em>${(bk.units || (bk.chs || []).map(x => x.title) || []).length ? `${(bk.units || bk.chs).length}개 단원 · ` : ''}책장을 넘기며 읽어요</em></span><span class="lbtn pri sm">책 펼치기 ${IC('arrow', 14)}</span></a>`
      : `<div class="lc-demo">${IC('book', 26)}<div><b>디지털북 준비 중</b><p>운영자가 디지털북을 게시하면 여기서 바로 펼쳐 볼 수 있어요. 아래 내용을 먼저 읽어 보세요.</p></div></div>`;
    return card + (it.doc && (it.doc.secs || []).length ? `<div class="lc-hd2"><b>함께 읽을 내용</b>${fsTools()}</div>${docHTML(it.doc)}` : '') + doneBtn(c, it, st, '다 읽었어요'); }

  /* ── 항목 본문 ── */
  function bodyHTML(c, it, k) { const st = peek(c.id, it.id); let h = '';
    if (k === 'doc') h = `${fsTools()}${descHTML(it)}${docHTML(it.doc)}${doneBtn(c, it, st, '다 읽었어요')}`;
    else if (k === 'ai') h = `${aiHTML(c, it, st)}${descHTML(it)}`;
    else if (k === 'file') h = fileHTML(c, it, st, fileKind(it));
    else if (k === 'file0') h = file0HTML(c, it, st);
    else if (k === 'book') h = bookHTML(c, it, st);
    const unit = k === 'file' && fileKind(it) === 'audio' ? '듣기' : '시청';
    return `<div class="lc lc-k-${k}" data-lck="${k}" data-c="${E(c.id)}" data-i="${E(it.id)}" data-unit="${unit}">${h}</div>`; }
  const curItem = (c, itemId) => { const RI = ((LR.lp.cls || {})[c.id] || {}).items || {}; return (c.items || []).find(x => x.id === itemId) || (c.items || []).find(x => !(RI[x.id] || {}).done) || (c.items || [])[0]; };
  if (typeof viewCourse === 'function') { const base = viewCourse; viewCourse = function (id, itemId) { /* eslint-disable-line no-global-assign */
    let h = base(id, itemId); try { if (!LR.me || !SITE()) return h; const c = SITE().classes.find(x => x.id === id); if (!c) return h; const it = curItem(c, itemId); const k = kindOf(it); if (!k) return h;
      const m = h.indexOf('<div class="imain">'); if (m < 0) return h; const a0 = h.indexOf('</h2>', m); if (a0 < 0) return h; const a = a0 + 5;
      const ends = ['<div class="lcpanel"', '<p class="lcaskb">', '<div class="inav">'].map(s => h.indexOf(s, a)).filter(x => x > 0); if (!ends.length) return h; const e = Math.min(...ends);
      h = h.slice(0, a) + bodyHTML(c, it, k) + h.slice(e);
    } catch (x) { console.error('lcontent', x); } return h; }; }

  /* ── 화면을 그린 뒤 붙이기(lrender → bkMount 뒤) · 화면이 바뀌면 멈추기 ── */
  function mount() { const box = document.querySelector('.lc[data-lck]'); if (!box || !SITE()) { if (AIP && !document.querySelector('.lc-ai')) aiStop(); return; }
    const c = SITE().classes.find(x => x.id === box.dataset.c); const it = c && (c.items || []).find(x => x.id === box.dataset.i); if (!it) return; const k = box.dataset.lck;
    if (AIP && k !== 'ai') aiStop();
    if (k === 'ai') aiMount(box.querySelector('.lc-ai'), c, it);
    if (k === 'file') fileMount(box.querySelector('.lc-file'), c, it, fileKind(it)); }
  if (typeof bkMount === 'function') { const base = bkMount; bkMount = function (...a) { const r = base.apply(this, a); try { mount(); } catch (e) { console.error('lcontent mount', e); } return r; }; } /* eslint-disable-line no-global-assign */
  const fresh = () => { const b = document.querySelector('.lc[data-lck]'); if (!b) return false; const x = b.querySelector('.lc-ai, .lc-file'); return !!x && (!SEEN.has(x) || (x.classList.contains('lc-ai') && !(AIP && AIP.alive && AIP.iid === b.dataset.i))); };
  const mo = new MutationObserver(() => { if (fresh()) { try { mount(); } catch (e) { console.error('lcontent mount', e); } } else if (AIP && !document.querySelector('.lc-ai')) aiStop(); });
  const start = () => { try { mo.observe(document.getElementById('lapp') || document.body, { childList: true, subtree: true }); } catch (e) { } };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  window.addEventListener('hashchange', () => { setTimeout(() => { if (AIP && !document.querySelector(`.lc[data-i="${CSS.escape(AIP.iid)}"] .lc-ai`)) aiStop(); }, 0); }); /* 같은 항목을 다시 그린 경우는 이어서 재생 */
  window.addEventListener('pagehide', aiStop);

  /* 글자 크기 */
  document.addEventListener('click', e => { const b = e.target.closest('[data-lcfs]'); if (!b) return; e.preventDefault(); const i = Math.max(0, Math.min(FS.length - 1, fsIdx() + (+b.dataset.lcfs || 0))); lsSet(FSK, String(i));
    document.querySelectorAll('.lc-doc').forEach(d => d.style.setProperty('--lcfs', FS[i] + 'px')); document.querySelectorAll('[data-lcfs="-1"]').forEach(x => { x.disabled = i === 0; }); document.querySelectorAll('[data-lcfs="1"]').forEach(x => { x.disabled = i === FS.length - 1; }); });

  window.LCONTENT = { kindOf, fileKind, stop: aiStop, mount, _peek: peek };
})();
