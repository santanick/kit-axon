/* 디디쌤 스튜디오 v10 — 학습자 사이트 빌더 화면(운영 › 학습자 사이트) · 튜토리얼 관리(학습 › 튜토리얼) */
'use strict';
const LSV = () => S.lsite;
const lsPage = () => LSV().pages.find(p => p.id === (UI.lsPage || 'home')) || LSV().pages[0];
const lsLearnerURL = () => { const tid = (typeof DREG !== 'undefined' && DREG.cur()) || ''; const base = location.pathname.replace(/[^/]*$/, ''); return `${location.origin}${base}learner.html?t=${encodeURIComponent(tid)}`; };
const lsLines = (arr, keys) => (arr || []).map(x => keys.map(k => x[k] ?? '').join(' | ')).join('\n');
const lsParse = (txt, keys) => String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20).map(l => { const p = l.split('|').map(s => s.trim()); return Object.fromEntries(keys.map((k, i) => [k, (p[i] || '').slice(0, 300)])); });
const ytOf = v => { const s = String(v || '').trim(); if (/^[\w-]{11}$/.test(s)) return s; return (typeof ytId === 'function' ? ytId(s) : '') || ''; };

VIEWS.lsite = () => {
  lsEnsure(); const L = LSV(); const tb = UI.lsT || 'build';
  const pubTag = L.pub ? tag(`게시됨 · ${L.pubAt}`, 'g') : tag('미게시', 'y');
  let body = '';
  if (tb === 'build') {
    const pg = lsPage(); const dev = UI.lsDev || 'pc';
    body = `<section class="lsb"><div class="card lspg"><div class="ch"><b>페이지</b><small>${L.pages.filter(p => p.on).length}/${L.pages.length}</small></div>
      ${L.pages.map(p => `<div class="lsrow ${p.id === pg.id ? 'on' : ''}"><button class="lsname" data-act="ls-page" data-v="${p.id}">${esc(p.name)}<small>${p.sections.length}개 섹션</small></button><label class="ckl" title="상단 메뉴에 표시"><input type="checkbox" data-chg="ls-pon" data-v="${p.id}" ${p.on ? 'checked' : ''} aria-label="${esc(p.name)} 표시"></label></div>`).join('')}
      <label class="fl">이 페이지 공개 범위<select data-chg="ls-acc" data-v="${pg.id}">${['공개', '로그인'].map(a => `<option ${pg.access === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      <label class="fl">메뉴 이름<input data-chg="ls-pname" data-v="${pg.id}" value="${esc(pg.name)}" maxlength="12"></label></div>
    <div class="card lssec"><div class="ch"><b>${esc(pg.name)} · 섹션</b><small>위에서부터 순서대로 보입니다</small></div>
      ${pg.sections.map((s, i) => `<div class="lsrow sec ${s.on ? '' : 'off'}"><span class="lsnum">${i + 1}</span><div class="lsname"><b>${esc(LS_SEC[s.type]?.n || s.type)}</b><small>${esc((s.data.title || LS_SEC[s.type]?.d || '').replace(/\n/g, ' ').slice(0, 40))}</small></div>
        <button class="btn sm ghost" data-act="ls-mv" data-k="${pg.id}" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="ls-mv" data-k="${pg.id}" data-v="${i}" data-d="1" aria-label="아래로">↓</button>
        <label class="ckl" title="표시"><input type="checkbox" data-chg="ls-son" data-v="${i}" ${s.on ? 'checked' : ''} aria-label="섹션 표시"></label><button class="btn sm" data-act="ls-edit" data-v="${i}">편집</button><button class="btn sm ghost redl" data-act="ls-del" data-v="${i}" aria-label="삭제">${ic('x', 14)}</button></div>`).join('') || '<div class="empty">섹션이 없습니다.</div>'}
      <div class="bar2"><select id="lsAdd" aria-label="추가할 섹션">${Object.entries(LS_SEC).map(([k, v]) => `<option value="${k}">${esc(v.n)} — ${esc(v.d)}</option>`).join('')}</select><button class="btn ink sm" data-act="ls-add">+ 섹션 추가</button></div>
      ${pg.id === 'my' ? `<div class="card in2"><div class="ch"><b>마이페이지 블록</b><small>로그인한 ${esc(t('learner'))}에게 보이는 영역 · 위아래 순서대로</small></div>${LSV().my.blocks.map(([k, on], i) => `<div class="lsrow ${on ? '' : 'off'}"><span class="lsnum">${i + 1}</span><div class="lsname"><b>${esc((LS_MYB.find(x => x[0] === k) || [k, k])[1])}</b></div><button class="btn sm ghost" data-act="ls-mymv" data-k="my" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="ls-mymv" data-k="my" data-v="${i}" data-d="1" aria-label="아래로">↓</button><label class="ckl"><input type="checkbox" data-chg="ls-myon" data-v="${i}" ${on ? 'checked' : ''} aria-label="표시"></label></div>`).join('')}</div>` : ''}
      <p class="mini">과정 · 진단 · 배지 · 공지 · 튜토리얼 섹션은 어드민 데이터로 자동으로 채워집니다. AI SAM에 “학습자 사이트 홈에 공지 섹션 위로 올려줘”처럼 말해도 됩니다.</p></div>
    <div class="card lspv"><div class="ch"><b>미리보기</b><span class="sp"></span><div class="seg2">${[['pc', 'PC'], ['mo', '모바일']].map(([k, l]) => `<button class="${dev === k ? 'on' : ''}" data-act="ls-dev" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="lsframe ${dev}"><iframe id="lsPv" title="학습자 화면 미리보기" src="learner.html?preview=1&r=${Date.now() % 1e6}#${pg.id}"></iframe></div><small class="mini">초안 미리보기 · 학습자에게는 [게시]한 내용만 보입니다.</small></div></section>`;
  } else if (tb === 'content') {
    const cellOpts = (cur) => `<option value="">— 비움 —</option>${S.classes.map(c => `<option value="${c.id}" ${cur === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`;
    body = `<section class="g2c"><div class="card"><div class="ch"><b>수준</b><small>배지 · 코스웨어 표 · 디지털북의 행</small></div>${table(['수준', '난이도', '색', '목표', ''], L.levels.map((l, i) => [`<b>${esc(l.name)}</b>`, esc(l.diff), `<span class="sw" style="background:${esc(l.color)}"></span>`, `<small>${esc(l.goal)}</small>`, `<button class="btn sm" data-act="ls-lv" data-v="${i}">편집</button>`]))}</div>
      <div class="card"><div class="ch"><b>유형 · 분야</b><small>진단 결과 · 코스웨어 표의 열</small></div>${table(['키', '이름', '색', '설명', ''], L.types.map((x, i) => [`<code>${esc(x.k)}</code>`, `<b>${esc(x.name)}</b>`, `<span class="sw" style="background:${esc(x.color)}"></span>`, esc(x.d), `<button class="btn sm" data-act="ls-ty" data-v="${i}">편집</button>`]))}</div></section>
    <div class="card"><div class="ch"><b>코스웨어 표</b><small>칸마다 ${esc(t('cls'))}을(를) 연결합니다 · 비우면 '준비 중'</small><span class="sp"></span><button class="btn sm" data-act="ls-gauto">과정 수준으로 자동 채우기</button></div>
      <div class="tw"><table class="tbl lsgrid"><thead><tr><th>수준 \\ 유형</th>${L.types.map(x => `<th>${esc(x.name)}</th>`).join('')}</tr></thead><tbody>${L.levels.map((l, i) => `<tr><th>${esc(l.name)}</th>${L.types.map(x => `<td><select data-chg="ls-grid" data-v="${i}:${x.k}" aria-label="${esc(l.name)} ${esc(x.name)}">${cellOpts(L.grid[i + ':' + x.k])}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
    <section class="g2c"><div class="card"><div class="ch"><b>코스 갈래(트랙)</b><span class="sp"></span><button class="btn sm" data-act="ls-tr" data-v="new">+ 트랙</button></div>${L.tracks.map((x, i) => `<div class="row"><span><span class="sw" style="background:${esc(x.color)}"></span> <b>${esc(x.name)}</b> <small class="mini">${esc(x.steps.join(' → '))}</small></span><span><button class="btn sm" data-act="ls-tr" data-v="${i}">편집</button><button class="btn sm ghost redl" data-act="ls-trdel" data-v="${i}" aria-label="삭제">${ic('x', 14)}</button></span></div>`).join('') || '<div class="empty">트랙이 없습니다.</div>'}</div>
      <div class="card"><div class="ch"><b>디지털북</b><span class="sp"></span><button class="btn sm" data-act="ls-bk" data-v="new">+ 디지털북</button></div>${L.dbooks.map((x, i) => `<div class="row"><span><b>${esc(x.title)}</b> <small class="mini">${esc(L.levels[x.level]?.name || '')} · ${x.units.length}단원${x.url ? ' · 뷰어 연결됨' : ''}</small></span><span><button class="btn sm" data-act="ls-bk" data-v="${i}">편집</button><button class="btn sm ghost redl" data-act="ls-bkdel" data-v="${i}" aria-label="삭제">${ic('x', 14)}</button></span></div>`).join('') || '<div class="empty">디지털북이 없습니다.</div>'}</div></section>
    <div class="card"><div class="ch"><b>브랜드 · 룩</b></div><div class="form2"><label class="fl">로고 약칭(영문 6자 이내)<input data-chg="ls-brand" value="${esc(L.brand.short || '')}" maxlength="8"></label><label class="fl">룩<select data-chg="ls-look">${[['kit', 'KIT 다크 히어로'], ['clean', '라이트 · 기본']].map(([k, n]) => `<option value="${k}" ${L.look === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div></div>`;
  } else {
    const LP = lpRead(); const n = Object.keys(LP).length;
    body = `<section class="g2c"><div class="card"><div class="ch"><b>게시</b>${pubTag}</div><p>학습자 화면은 마지막으로 게시한 내용을 보여 줍니다. 섹션 · 과정 · 튜토리얼 · 공지를 바꾼 뒤 [게시]를 누르세요.</p>
      <div class="bar2"><button class="btn pri" data-act="ls-pub">${ic('check', 16)} 지금 게시</button><a class="btn" href="${esc(lsLearnerURL())}" target="_blank" rel="noopener">학습자 화면 열기</a></div>
      <label class="fl">학습자 주소<input readonly value="${esc(lsLearnerURL())}"></label><p class="mini">로그인: ${esc(S.org.type === 'univ' ? '학번' : '학습자 번호')} + 접근코드(${esc(t('learner'))} › 등록 · 초대에서 발급). 학습자 정보는 ${S.org.type === 'univ' ? '학번 · 학과만' : '번호 · 소속만'} 저장합니다.</p></div>
      <div class="card"><div class="ch"><b>학습자 활동</b><small>${n}명</small><span class="sp"></span><button class="btn sm" data-act="ls-lpsync">활동 반영</button></div>${n ? table([S.org.type === 'univ' ? '학번' : '번호', '튜토리얼', '과정 항목', '진단', '최근'], Object.entries(LP).slice(0, 15).map(([sid, p]) => [esc(sid), Object.keys(p.tut || {}).length, Object.values(p.cls || {}).reduce((a, c) => a + Object.values(c.items || {}).filter(x => x && x.done).length, 0), Object.values(p.diag || {}).map(d => esc(d.out)).join(', ') || '—', esc(String(p.at || '').slice(0, 16))])) : '<div class="empty">아직 학습자 활동이 없습니다.</div>'}</div></section>`;
  }
  return head('', `학습자가 보는 사이트를 페이지 · 섹션으로 조립합니다. 과정 · 진단 · 배지 · 공지와 연결되어 자동으로 채워집니다. ${pubTag}`, `<a class="btn" href="${esc(lsLearnerURL())}" target="_blank" rel="noopener">학습자 화면</a><button class="btn pri" data-act="ls-pub">게시</button>`) +
    tabs('lsT', [['build', '페이지 · 섹션'], ['content', '콘텐츠 구성'], ['pub', '게시 · 활동']], tb) + body;
};

ACT['ls-page'] = el => { UI.lsPage = el.dataset.v; render(); };
ACT['ls-dev'] = el => { UI.lsDev = el.dataset.v; render(); };
ACT['ls-pon'] = el => { const p = LSV().pages.find(x => x.id === el.dataset.v); p.on = el.checked; save(); render(); };
ACT['ls-acc'] = el => { const p = LSV().pages.find(x => x.id === el.dataset.v); p.access = el.value; save(); render(); };
ACT['ls-pname'] = el => { const p = LSV().pages.find(x => x.id === el.dataset.v); p.name = el.value.trim().slice(0, 12) || p.name; save(); render(); };
ACT['ls-myon'] = el => { LSV().my.blocks[+el.dataset.v][1] = el.checked; save(); render(); };
ACT['ls-mymv'] = el => { const L = LSV().my.blocks; const i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; save(); render(); };
ACT['ls-son'] = el => { lsPage().sections[+el.dataset.v].on = el.checked; save(); render(); };
ACT['ls-mv'] = el => { const L = lsPage().sections; const i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; save(); render(); };
ACT['ls-del'] = el => { const pg = lsPage(); const s = pg.sections[+el.dataset.v]; modal('섹션 삭제', `<p>「${esc(LS_SEC[s.type]?.n || s.type)}」 섹션을 삭제합니다. 숨기기만 하려면 체크를 끄세요.</p>`, [{ id: 'x', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { pg.sections.splice(+el.dataset.v, 1); logAudit(`학습자 사이트 섹션 삭제 — ${pg.name}`); save(); render(); } }]); };
ACT['ls-add'] = () => { const ty = $('#lsAdd').value; const pg = lsPage(); const d = lsDefault(lsT()); const tpl = d.pages.flatMap(p => p.sections).find(s => s.type === ty); pg.sections.push(lsSec(ty, tpl ? JSON.parse(JSON.stringify(tpl.data)) : { title: LS_SEC[ty].n })); save(); render(); toast(`「${LS_SEC[ty].n}」 섹션을 추가했습니다. 편집에서 문구를 바꾸세요.`, 'ok'); };
ACT['ls-edit'] = el => {
  const s = lsPage().sections[+el.dataset.v]; const d = s.data; const ty = s.type;
  const F = (k, l, ta) => ta ? `<label class="fl">${l}<textarea name="${k}" rows="3" maxlength="400">${esc(d[k] || '')}</textarea></label>` : `<label class="fl">${l}<input name="${k}" value="${esc(d[k] || '')}" maxlength="120"></label>`;
  let b = (ty === 'progress' ? '' : F('eyebrow', '머리 글(영문 대문자 권장)')) + F('title', '제목(줄바꿈 가능)', true) + (ty === 'hero' || ty === 'steps' || ty === 'diag' ? '' : F('sub', '설명', true));
  if (ty === 'hero') b += F('sub', '설명', true) + `<div class="form2">${F('cta1', '첫 번째 버튼')}${F('cta2', '두 번째 버튼')}</div>`;
  if (ty === 'steps') b += `<label class="fl">단계(줄마다 '제목 | 설명 | 소요')<textarea name="items" rows="5">${esc(lsLines(d.items, ['h', 'd', 'tag']))}</textarea></label>`;
  if (ty === 'campus') b += `<label class="fl">거점(줄마다 '이름 | 설명')<textarea name="items" rows="5">${esc(lsLines(d.items, ['h', 'd']))}</textarea></label>`;
  if (ty === 'faq') b += `<label class="fl">질문(줄마다 '질문 | 답')<textarea name="items" rows="6">${esc(lsLines(d.items, ['q', 'a']))}</textarea></label>`;
  if (ty === 'text') b += `<label class="fl">본문<textarea name="body" rows="6" maxlength="3000">${esc(d.body || '')}</textarea></label>`;
  if (ty === 'cta') b += F('cta', '버튼');
  if (ty === 'tutorials' || ty === 'notices') b += `<label class="fl">보여 줄 개수<input name="n" type="number" min="1" max="99" value="${+d.n || 5}"></label>`;
  if (ty === 'tutorials') b += `<label class="ckl"><input type="checkbox" name="filter" ${d.filter ? 'checked' : ''}> 수준 · 유형 필터 표시</label>`;
  if (ty === 'diagtypes') b += `<label class="fl">연결할 진단<select name="diag"><option value="">진행 중인 첫 진단</option>${(S.diags || []).map(x => `<option value="${x.id}" ${d.diag === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`;
  if (['tracks', 'tutorials', 'diagtypes', 'badges', 'courseware', 'books', 'notices', 'progress'].includes(ty)) b += `<p class="mini">내용은 ${{ tracks: '콘텐츠 구성 › 트랙', tutorials: '학습 › 튜토리얼', diagtypes: '학습 › AI 진단', badges: '학습 › 배지', courseware: '콘텐츠 구성 › 코스웨어 표', books: '콘텐츠 구성 › 디지털북', notices: '소통 › 공지', progress: '학습자 활동(자동)' }[ty]}에서 가져옵니다.</p>`;
  modal(`섹션 편집 — ${LS_SEC[ty]?.n || ty}`, b, [{ id: 'x', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => {
    w.querySelectorAll('input[name],textarea[name],select[name]').forEach(i => { const k = i.name; if (k === 'items') d.items = lsParse(i.value, ty === 'steps' ? ['h', 'd', 'tag'] : ty === 'faq' ? ['q', 'a'] : ['h', 'd']); else if (i.type === 'checkbox') d[k] = i.checked; else if (i.type === 'number') d[k] = Math.max(1, Math.min(99, +i.value || 5)); else d[k] = i.value.slice(0, 3000); });
    save(); render(); toast('섹션을 저장했습니다.', 'ok'); } }], true);
};
const lsPick = (title, fields, obj, done) => modal(title, fields.map(([k, l, kind, opts]) => kind === 'ta' ? `<label class="fl">${l}<textarea name="${k}" rows="4">${esc(Array.isArray(obj[k]) ? obj[k].join('\n') : obj[k] || '')}</textarea></label>` : kind === 'sel' ? `<label class="fl">${l}<select name="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(obj[k]) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : `<label class="fl">${l}<input name="${k}" ${kind === 'color' ? 'type="color"' : ''} value="${esc(obj[k] ?? '')}" maxlength="200"></label>`).join(''),
  [{ id: 'x', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const o = {}; w.querySelectorAll('[name]').forEach(i => { o[i.name] = i.tagName === 'TEXTAREA' ? i.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 12) : i.value.trim().slice(0, 200); }); done(o); save(); render(); } }]);
ACT['ls-lv'] = el => { const l = LSV().levels[+el.dataset.v]; lsPick('수준 편집', [['name', '이름'], ['diff', '난이도'], ['color', '색', 'color'], ['goal', '목표']], l, o => Object.assign(l, o, { short: (o.name || l.name).toUpperCase() })); };
ACT['ls-ty'] = el => { const x = LSV().types[+el.dataset.v]; lsPick('유형 편집', [['name', '이름'], ['color', '색', 'color'], ['d', '설명']], x, o => Object.assign(x, o)); };
ACT['ls-tr'] = el => { const L = LSV(); const isNew = el.dataset.v === 'new'; const x = isNew ? { id: uid('tr'), name: '', eyebrow: 'TRACK', color: '#2563EB', desc: '', steps: [], cta: '시작하기' } : L.tracks[+el.dataset.v]; lsPick('트랙 편집', [['name', '이름'], ['eyebrow', '머리 글'], ['color', '색', 'color'], ['desc', '설명'], ['steps', '단계(줄마다)', 'ta'], ['cta', '버튼']], x, o => { Object.assign(x, o); if (isNew && x.name) L.tracks.push(x); }); };
ACT['ls-trdel'] = el => { LSV().tracks.splice(+el.dataset.v, 1); save(); render(); };
ACT['ls-bk'] = el => { const L = LSV(); const isNew = el.dataset.v === 'new'; const x = isNew ? { id: uid('bk'), title: '', level: 0, units: [], url: '', color: L.levels[0]?.color || '#4b3cff' } : L.dbooks[+el.dataset.v]; lsPick('디지털북 편집', [['title', '제목'], ['level', '수준', 'sel', L.levels.map((l, i) => [i, l.name])], ['units', '단원(줄마다)', 'ta'], ['url', '뷰어 주소(https://, 선택)'], ['color', '표지 색', 'color']], x, o => { if (o.url && !/^https:\/\//.test(o.url)) { toast('뷰어 주소는 https://로 시작해야 합니다.', 'warn'); o.url = ''; } Object.assign(x, o, { level: +o.level || 0 }); if (isNew && x.title) L.dbooks.push(x); }); };
ACT['ls-bkdel'] = el => { LSV().dbooks.splice(+el.dataset.v, 1); save(); render(); };
ACT['ls-grid'] = el => { const L = LSV(); const [lv, ty] = el.dataset.v.split(':'); if (el.value) { L.grid[el.dataset.v] = el.value; const c = C(el.value); if (c) { c.level = +lv; c.ctype = ty; } } else delete L.grid[el.dataset.v]; save(); toast('코스웨어 표를 저장했습니다.', 'ok'); };
ACT['ls-gauto'] = () => { LSV().grid = lsGridAuto(); save(); render(); toast('과정 수준 · 순서로 표를 채웠습니다.', 'ok'); };
ACT['ls-brand'] = el => { LSV().brand.short = el.value.trim().slice(0, 8); save(); };
ACT['ls-look'] = el => { LSV().look = el.value; save(); render(); };
ACT['ls-pub'] = () => { const L = LSV(); L.pub = lsSnapshot(); L.pubAt = nowStr(); logAudit('학습자 사이트 게시'); save(); render(); toast('학습자 사이트를 게시했습니다.', 'ok'); };
ACT['ls-lpsync'] = async () => { if (typeof LIVE !== 'undefined') { try { window.__LP = (await api('GET', '/api/learners/progress')).lp || {}; } catch (e) { toast(e.message, 'bad'); return; } } const n = lpApply(); save(); render(); toast(`학습자 활동 ${n}건을 회원 · 과정 · 진단에 반영했습니다.`, 'ok'); };

/* ── 학습 › 튜토리얼 ── */
VIEWS.tutorial = () => {
  lsEnsure(); const L = LSV(); const lv = UI.tuLv ?? 'all', ty = UI.tuTy || 'all';
  const T = S.tuts.filter(x => (lv === 'all' || String(x.level) === String(lv)) && (ty === 'all' || x.type === ty));
  const tyName = k => L.types.find(x => x.k === k)?.name || k;
  return head('', '왼쪽은 영상, 오른쪽은 따라 할 3단계. 학습자 사이트의 튜토리얼 섹션 · 메인 배너에 자동으로 실립니다.', `<button class="btn ink" data-act="tu-edit" data-v="new">+ 튜토리얼</button>`) +
    `<div class="bar2"><select data-chg="tu-f" data-k="tuLv" aria-label="수준"><option value="all">전체 수준</option>${L.levels.map((l, i) => `<option value="${i}" ${String(lv) === String(i) ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select><select data-chg="tu-f" data-k="tuTy" aria-label="유형"><option value="all">전체 유형</option>${L.types.map(x => `<option value="${x.k}" ${ty === x.k ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><small class="mini">${T.length}개 · 전체 ${S.tuts.length}개</small></div>` +
    `<div class="card">${T.length ? table(['', '제목', '수준', '유형', '툴', '완료', '게시', ''], T.map(x => [x.yt ? `<img class="tuth" src="https://i.ytimg.com/vi/${esc(x.yt)}/mqdefault.jpg" alt="" loading="lazy">` : '<span class="tuth none"></span>', `<b>${esc(x.title)}</b><br><small class="mini">${esc(x.mission || '')}</small>`, esc(L.levels[x.level]?.name || ''), esc(tyName(x.type)), esc(x.tool || ''), Object.values(x.stat || {}).filter(s => s.steps >= 3).length, `<label class="ckl"><input type="checkbox" data-chg="tu-on" data-v="${x.id}" ${x.on ? 'checked' : ''} aria-label="게시"></label>`, `<button class="btn sm" data-act="tu-edit" data-v="${x.id}">편집</button>`])) : '<div class="empty">튜토리얼이 없습니다. [+ 튜토리얼]로 추가하세요.</div>'}</div>`;
};
ACT['tu-f'] = el => { UI[el.dataset.k] = el.value; render(); };
ACT['tu-on'] = el => { const x = S.tuts.find(t => t.id === el.dataset.v); x.on = el.checked; save(); };
function tuAutoSteps(title, tool) { const k = (tool || title || '도구').split(/[ ·(]/)[0]; return [`${k}을(를) 열고 영상 속 예시와 같은 설정을 고릅니다`, `영상의 예시를 그대로 따라 해 첫 결과를 만듭니다`, `내 과제 · 전공 주제로 바꿔 결과물을 저장합니다`]; }
ACT['tu-edit'] = el => {
  const L = LSV(); const isNew = el.dataset.v === 'new'; const x = isNew ? { id: uid('tu'), title: '', ch: '', tool: '', level: 0, type: L.types[0].k, yt: '', steps: ['', '', ''], mission: '', badge: '', on: true, at: today() } : S.tuts.find(t => t.id === el.dataset.v);
  modal(isNew ? '튜토리얼 추가' : '튜토리얼 편집', `<label class="fl">제목<input name="title" value="${esc(x.title)}" maxlength="80" required></label>
    <div class="form2"><label class="fl">YouTube 주소 또는 ID<input name="yt" value="${esc(x.yt)}" placeholder="https://youtu.be/…"></label><label class="fl">채널<input name="ch" value="${esc(x.ch || '')}" maxlength="40"></label></div>
    <div class="form2"><label class="fl">수준<select name="level">${L.levels.map((l, i) => `<option value="${i}" ${x.level === i ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label><label class="fl">유형<select name="type">${L.types.map(t2 => `<option value="${t2.k}" ${x.type === t2.k ? 'selected' : ''}>${esc(t2.name)}</option>`).join('')}</select></label><label class="fl">툴<input name="tool" value="${esc(x.tool || '')}" maxlength="30"></label></div>
    ${[0, 1, 2].map(i => `<label class="fl">따라 하기 ${i + 1}단계<input name="s${i}" value="${esc(x.steps[i] || '')}" maxlength="140"></label>`).join('')}
    <div class="bar2"><button type="button" class="btn sm" data-act="tu-ai">${ic('spark', 14)} 제목으로 3단계 채우기</button></div>
    <label class="fl">미션(제출할 결과물)<input name="mission" value="${esc(x.mission || '')}" maxlength="80"></label>
    <label class="fl">연결 배지(선택)<select name="badge"><option value="">없음</option>${(S.badges || []).filter(b => !b.special).map(b => `<option value="${b.id}" ${x.badge === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>`,
  [{ id: 'x', label: '취소' }, ...(isNew ? [] : [{ id: 'del', label: '삭제', kind: 'red', run: () => { S.tuts = S.tuts.filter(t => t !== x); save(); render(); } }]), { id: 'ok', label: '저장', kind: 'pri', run: w => {
    const g = n => w.querySelector(`[name=${n}]`).value.trim(); const yt = ytOf(g('yt'));
    if (!g('title')) { toast('제목을 입력하세요.', 'warn'); return false; } if (g('yt') && !yt) { toast('YouTube 주소를 확인하세요.', 'warn'); return false; }
    Object.assign(x, { title: g('title').slice(0, 80), yt, ch: g('ch'), tool: g('tool'), level: +g('level'), type: g('type'), steps: [0, 1, 2].map(i => g('s' + i)), mission: g('mission'), badge: g('badge') });
    if (isNew) S.tuts.unshift(x); logAudit(`튜토리얼 ${isNew ? '추가' : '수정'} — ${x.title}`); save(); render(); toast('저장했습니다. 학습자 사이트에는 [게시] 후 반영됩니다.', 'ok'); } }], true);
};
ACT['tu-ai'] = () => { const w = $('#modal'); const st = tuAutoSteps(w.querySelector('[name=title]').value, w.querySelector('[name=tool]').value); st.forEach((s, i) => { const f = w.querySelector(`[name=s${i}]`); if (!f.value.trim()) f.value = s; }); };

/* ── 대화 · 기능 맵 · 언어팩 · 상단 바로가기 ── */
{ const base = answer; answer = q => { const s = String(q || '');
    if (/학습자\s*(사이트|화면|페이지|뷰)/.test(s) && !/(보내|발송)/.test(s)) { if (/게시/.test(s)) { ACT['ls-pub'](); return { text: '학습자 사이트를 게시했습니다. 운영 › 학습자 사이트 › 게시 · 활동에서 주소를 확인하세요.', go: 'lsite' }; } UI.lsT = 'build'; return { text: '운영 › 학습자 사이트에서 페이지 · 섹션을 조립하고 미리보기로 확인할 수 있습니다. 바꾼 뒤 [게시]하면 학습자에게 보입니다.', go: 'lsite' }; }
    if (/튜토리얼/.test(s) && /(추가|만들|등록|관리)/.test(s)) return { text: '학습 › 튜토리얼에서 YouTube 영상 + 따라 할 3단계 + 미션을 등록합니다.', go: 'tutorial' };
    return base(q); }; }
COVER.push(['[신규] 학습자 사이트 빌더: 페이지 · 섹션 · 미리보기 · 게시', 'lsite', ''], ['[신규] 튜토리얼: 영상 + 3단계 + 미션', 'tutorial', '']);
Object.assign(DICT, { '학습자 사이트': 'Learner site|学習者サイト|学员网站|學員網站|Trang học viên|เว็บไซต์ผู้เรียน|Situs pelajar|Sitio del alumno|Site apprenant', '튜토리얼': 'Tutorials|チュートリアル|教程|教學|Hướng dẫn|บทช่วยสอน|Tutorial|Tutoriales|Tutoriels', '페이지 · 섹션': 'Pages · Sections|ページ · セクション|页面 · 区块|頁面 · 區塊|Trang · Mục|หน้า · ส่วน|Halaman · Bagian|Páginas · Secciones|Pages · Sections', '콘텐츠 구성': 'Content|コンテンツ構成|内容配置|內容配置|Nội dung|เนื้อหา|Konten|Contenido|Contenu', '게시 · 활동': 'Publish · Activity|公開 · 活動|发布 · 活动|發布 · 活動|Xuất bản · Hoạt động|เผยแพร่ · กิจกรรม|Terbit · Aktivitas|Publicar · Actividad|Publier · Activité' });
AFTER.push(() => { const fr = $('.lsframe.pc'); const f = fr && fr.querySelector('iframe'); if (!f) return; const k = Math.min(1, fr.clientWidth / 1280); f.style.width = '1280px'; f.style.height = Math.round(640 / k) + 'px'; f.style.transform = `scale(${k})`; f.style.transformOrigin = '0 0'; fr.style.height = '640px'; });
AFTER.push(cur => { if (!S || $('#lsGo')) return; const top = $('.topr'); if (top) top.insertAdjacentHTML('afterbegin', `<a id="lsGo" class="btn sm ghost" href="${esc(lsLearnerURL())}" target="_blank" rel="noopener" title="학습자 화면 새 창">${ic('users', 14)} 학습자 화면</a>`); });
