/* v24 hpai — 「AI로 홈페이지 만들기」 · 「화면에서 바로 고치기」 · 메뉴 편성(상위 · 하위)
   대표님(2026-11-03): '홈페이지 구성하는 부분이 아직 너무 어려워. AI로 원하는 내용을 자세히 이야기하거나 벤치마크할 사이트를 넣으면,
   해당 부분을 분석해서 유사하게 만들어주는 기능을 만들어주고 만들어진 화면에서 바로 수정할 수 있게 해줘(클릭으로 글자 수정 등)'
   '홈페이지 메뉴의 경우에도 상위메뉴 하위메뉴를 구성해서 편성하게 해주고, AI가 이를 만들어 주고 사용자가 쉽게 수정할 수 있게 해줘'
   - 만들기: 설명 + (선택) 벤치마크 주소 → Claude가 기관 정보 · 공개 강좌에 맞춰 섹션 · 2단계 메뉴 · 색 · 분위기를 JSON으로 설계 → S.site 구조로 변환(기존 편집기에서 그대로 수정 가능)
     벤치마크 읽기: 데모 = Anthropic API 서버 도구 web_fetch(web_fetch_20250910) · 실패하면 설명만으로 + 페이지 글 붙여 넣기 / 운영 = POST /api/site/benchmark(서버가 안전하게 읽어 구조만 돌려줌)
     벤치마크의 글 · 이미지 · 로고 · 브랜드는 쓰지 않는다(구성과 분위기만 참고).
   - 고치기: 스튜디오 안 iframe(같은 출처)에서 글자를 눌러 바로 고치고, 이미지를 눌러 바꾸고, 섹션 도구(위로 · 아래로 · 숨기기 · 삭제 · AI로 다시 쓰기 · 복제) · '+ 섹션 추가'. 되돌리기 40단계(Ctrl+Z).
   - 메뉴 편성: 상위 · 하위 2단계 트리(끌어 옮기기 · ↑↓ · 들여쓰기/내어쓰기 · 이름 바로 고치기 · 연결: 새 페이지 / 학습 페이지 / 강좌 / 외부 주소 · 노출) + 'AI로 메뉴 짜기'.
   데이터: S.site.ai = { at, brief, url, by, summary, bench }, 섹션 x.hide(숨김), classes 섹션 data.auto(공개 강좌 자동 표시), 메뉴 link 'learn:<home|shop|comm|notice|textbooks|my>' */
'use strict';
const HPE = { on: false, key: 'home', dev: 'pc', map: null, undo: [], redo: [], busy: false, sel: '', last: null };
(() => {
  const LIM = 200 * 1024;
  const VARS = ['features', 'stats', 'steps', 'timeline', 'roadmap', 'info', 'tiles', 'profiles', 'modules', 'cta', 'logos', 'story'];
  const LEARN = [['home', '홈'], ['shop', () => `${t('cls')} 목록`], ['comm', '커뮤니티'], ['notice', '공지사항'], ['textbooks', '교재 · 교구'], ['my', '내 학습']];
  const learnName = k => { const x = LEARN.find(l => l[0] === k); return x ? (typeof x[1] === 'function' ? x[1]() : x[1]) : k; };
  const LEARN2KIND = { home: 'home', shop: 'class', comm: 'community', notice: 'notice', textbooks: 'book' };
  const KIND2LEARN = { home: 'home', class: 'shop', community: 'comm', notice: 'notice', book: 'textbooks', board: 'comm' };
  const isLive = () => typeof LIVE !== 'undefined' && LIVE && LIVE.cfg && LIVE.cfg.live;
  const aiOn = () => typeof CL !== 'undefined' && CL.on('site');
  const N = () => (typeof spOrg === 'function' ? spOrg() : '') || S.org.name;
  const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
  const clone = o => JSON.parse(JSON.stringify(o));
  const pubList = () => { const L = (S.classes || []).filter(c => c.open === '전체' && c.status !== '종료'); const R = L.filter(c => c.status === '운영중'); return R.length ? R : L; };

  /* ── 기관 맥락(공개 정보만: 이름 · 유형 · 공개 강좌 · 주소) ── */
  function hpOrg() {
    const ft = (S.settings && S.settings.footer) || {};
    return { 기관명: S.org.name, 유형: TYPES[S.org.type].name, 용어: { 학습자: t('learner'), 강좌: t('cls') },
      공개강좌: pubList().slice(0, 12).map(c => ({ id: c.id, 이름: c.name, 수강료: +c.price ? won(c.price) : '무료', 기간: c.period && c.period.mode === 'days' ? `신청일부터 ${c.period.days}일` : [c.start, c.end].filter(Boolean).join(' ~ ') })),
      주소: ft.addr || '', 연락처: ft.tel || '' };
  }
  const SYS = () => `당신은 교육기관 홈페이지 기획자 겸 카피라이터입니다. 기관 정보와 요청(설명 · 벤치마크)을 보고 홈페이지 첫 화면과 2단계 메뉴를 JSON으로 설계합니다.
규칙:
- JSON 객체 하나만 출력합니다(코드블록 · 설명 금지).
- 벤치마크 사이트는 구성(섹션 순서 · 섹션 종류 · 메뉴 구조)과 분위기(톤 · 색감)만 참고합니다. 벤치마크의 문장 · 고유명사 · 브랜드명 · 로고 · 이미지 · 수치 · 슬로건은 그대로 쓰거나 살짝 바꿔 쓰지 않고, 이 기관의 글을 새로 씁니다.
- 기관명 · 강좌명 · 수강료는 주어진 값만 씁니다. 없는 수치(합격률 · 수강생 수 · 수상 · 후기 · 연혁)는 지어내지 않습니다.
- 한국어로, 요청한 분위기에 맞게 짧고 쉬운 문장으로 씁니다.
형식: {"look": "${Object.keys(LOOKS).join('|')}", "color": "#RRGGBB", "tone": "신뢰|따뜻|모던|친근", "summary": "어떻게 구성했는지 한 문장", "bench": "벤치마크에서 참고한 구성 · 분위기 한 문장(없으면 빈 문자열)", "seo": {"title": "", "desc": "", "kw": ""}, "sections": [...], "menus": [...]}
sections(4~8개, 첫 항목은 banner):
 {"type":"banner","eyebrow":"짧은 영문 라벨","title":"줄바꿈은 \\n","sub":"","cta":"","cta2":""}
 {"type":"text","variant":"features|stats|steps|timeline|roadmap|info|tiles|profiles|modules|cta|plain","eyebrow":"","title":"","body":"","cols":[["제목","설명"]],"cta":""}  (cols 최대 6)
 {"type":"classes","eyebrow":"","title":"","sub":""}  (공개 강좌 카드가 자동으로 채워집니다)
 {"type":"notices","title":""} {"type":"reviews","title":""} {"type":"map","title":"","hours":""} {"type":"image","title":"","alt":""} {"type":"video","title":""}
menus(상위 최대 6개, 하위 최대 6개씩, 첫 메뉴는 {"label":"홈","link":"learn:home"}):
 {"label":"","link":"page | learn:shop | learn:comm | learn:notice | learn:textbooks | learn:my | cls:<공개강좌 id> | url:https://...","subs":[{"label":"","link":"...","page":[...]}],"page":[...]}
 link가 page인 메뉴 · 하위 메뉴에는 그 페이지에 들어갈 섹션 1~2개(page, 위 sections 형식, 주로 text)를 넣습니다. 강좌 · 커뮤니티 · 공지는 learn: 링크를 씁니다.`;

  /* ── Claude 호출 ── */
  async function direct(body) {
    const c = CL.get(); const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 90000);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: c.model, ...body }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(r.status === 401 ? 'API 키가 올바르지 않습니다' : (j.error && j.error.message) || `오류 ${r.status}`); e.status = r.status; throw e; }
      const u = j.usage || {}; CL.set({ calls: (c.calls || 0) + 1, tin: (c.tin || 0) + (u.input_tokens || 0), tout: (c.tout || 0) + (u.output_tokens || 0), last: nowStr() }); return j;
    } catch (e) { if (e.name === 'AbortError') throw new Error('응답 시간이 초과되었습니다'); if (e instanceof TypeError) throw new Error('네트워크에 연결하지 못했습니다'); throw e; } finally { clearTimeout(to); }
  }
  const jsonOf = txt => { const s = String(txt || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('형식 오류'); return JSON.parse(s.slice(a, b + 1)); };
  /* 벤치마크 주소 확인: http(s) · 250자 · 내부 주소 금지 */
  function benchURL(u) { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; let x; try { x = new URL(u); } catch (e) { throw new Error('주소 형식을 확인해 주세요(예: https://example.com).'); }
    if (!/^https?:$/.test(x.protocol) || x.username || x.password || u.length > 250) throw new Error('http(s):// 로 시작하는 250자 이하 주소만 쓸 수 있습니다.');
    if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(x.hostname) || /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.hostname) || x.hostname.includes(':') || /^\[/.test(x.hostname)) throw new Error('내부 주소는 읽을 수 없습니다. 공개된 웹사이트 주소를 넣어 주세요.');
    return x.href; }
  /* 벤치마크 문장 그대로 쓰기 방지: 15자 이상 같은 문장은 지운다 */
  function noCopy(j, benchText) { if (!benchText) return 0; const B = String(benchText).replace(/\s+/g, ' '); let n = 0;
    const walk = o => { if (Array.isArray(o)) o.forEach((v, i) => { if (typeof v === 'string') { if (v.length >= 15 && B.includes(v.replace(/\s+/g, ' '))) { o[i] = ''; n++; } } else walk(v); });
      else if (o && typeof o === 'object') Object.keys(o).forEach(k => { const v = o[k]; if (typeof v === 'string') { if (!/^(type|variant|link|look|color|tone)$/.test(k) && v.length >= 15 && B.includes(v.replace(/\s+/g, ' '))) { o[k] = ''; n++; } } else walk(v); }); };
    walk(j); return n; }

  async function hpGenerate(o) {
    o = o || {}; const brief = str(o.brief, 1500); const tone = str(o.tone, 10); const must = (o.sections || []).map(x => str(x, 30)).filter(Boolean).slice(0, 10);
    let url = ''; const notes = []; try { url = benchURL(o.url); } catch (e) { notes.push(e.message); }
    if (!aiOn()) { const j = hpLocal(brief, { tone, must }); notes.push('Claude가 연결되지 않아 기본 설계로 만들었습니다. 설정 › 연동에서 Claude를 연결하면 설명 · 벤치마크를 분석해 만듭니다.'); if (url) notes.push('벤치마크 분석은 Claude 연결 후 쓸 수 있습니다.'); return { j, notes, via: '기본 설계', bench: null }; }
    let user = `요청 설명: ${brief || '(없음 — 기관 유형에 맞는 기본 구성)'}${tone ? `\n분위기: ${tone}` : ''}${must.length ? `\n꼭 넣을 섹션: ${must.join(', ')}` : ''}\n기관 정보: ${JSON.stringify(hpOrg())}`;
    let benchText = '', bench = null;
    if (url && isLive() && !o.pasted) { try { const b = await api('POST', '/api/site/benchmark', { url }); bench = { ok: true, title: b.title || '' }; benchText = [b.title, b.desc, ...(b.headings || []), ...(b.nav || []), ...(b.sections || []).map(x => `${x.heading || ''} ${x.text || ''}`)].join('\n');
      user += `\n벤치마크 분석(서버가 읽은 구조 · 구성과 분위기 참고용, 문장을 그대로 쓰지 말 것): ${JSON.stringify({ 제목: b.title, 메뉴: b.nav, 소제목: b.headings, 섹션: (b.sections || []).map(x => ({ 소제목: x.heading, 글자수: (x.text || '').length, 종류추정: x.kind })), 색: b.colors }).slice(0, 7000)}`; }
      catch (e) { bench = { ok: false, code: e.code || '' }; notes.push(`벤치마크 사이트를 읽지 못했습니다(${e.message}). 설명만으로 만들었습니다. 그 사이트의 글을 복사해 '페이지 글 붙여 넣기'에 넣으면 더 비슷하게 만들 수 있습니다.`); } }
    if (o.pasted) { benchText = str(o.pasted, 12000); user += `\n벤치마크 페이지 글(사용자가 붙여 넣음 — 구성 · 분위기만 참고, 문장을 그대로 쓰지 말 것):\n${benchText}`; bench = { ok: true, pasted: true }; }
    let text = '', model = '';
    if (url && !isLive() && !o.pasted) {
      user += `\n벤치마크 주소: ${url}\nweb_fetch 도구로 이 주소를 한 번 읽고, 구성과 분위기만 참고하세요.`;
      try { let msgs = [{ role: 'user', content: user }]; const T = [];
        for (let k = 0; k < 3; k++) { const j = await direct({ max_tokens: 6000, system: SYS(), messages: msgs, tools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 2, max_content_tokens: 30000 }] }); model = j.model || model;
          (j.content || []).forEach(b => { if (b.type === 'text') T.push(b.text); if (b.type === 'web_fetch_tool_result') { const c = b.content || {}; bench = c.type === 'web_fetch_tool_result_error' ? { ok: false, code: c.error_code || '' } : { ok: true, title: (c.content && c.content.title) || '', url: c.url || url };
            if (bench.ok && c.content && c.content.source && typeof c.content.source.data === 'string') benchText = c.content.source.data.slice(0, 200000); } });
          if (j.stop_reason !== 'pause_turn') break; msgs = [...msgs, { role: 'assistant', content: j.content }]; }
        text = T.join('\n');
        if (bench && !bench.ok) notes.push(`벤치마크 사이트를 읽지 못했습니다(${bench.code || '접근 불가'}). 설명만으로 만들었습니다. 그 사이트의 글을 복사해 '페이지 글 붙여 넣기'에 넣으면 더 비슷하게 만들 수 있습니다.`);
        if (!bench) notes.push('벤치마크 사이트를 확인하지 못해 설명 중심으로 만들었습니다.');
      } catch (e) { notes.push(`벤치마크 사이트를 읽지 못했습니다(${e.message}). 설명만으로 만들었습니다.`); bench = { ok: false }; text = ''; user = user.replace(/\n벤치마크 주소:[\s\S]*$/, ''); }
    }
    if (!text) { const r = await CL.call({ system: SYS(), messages: [{ role: 'user', content: user }], max: 6000 }); text = r.text; model = r.model; }
    let j; try { j = jsonOf(text); } catch (e) { throw new Error('AI 응답을 읽지 못했습니다'); }
    const cut = noCopy(j, benchText); if (cut) notes.push(`벤치마크와 같은 문장 ${cut}곳은 쓰지 않았습니다.`);
    return { j, notes, via: CL.label(model), bench };
  }

  /* ── JSON → S.site 구조 ── */
  const cols = v => (Array.isArray(v) ? v : []).slice(0, 6).map(r => Array.isArray(r) ? [str(r[0], 60), str(r[1], 140)] : [str(r && (r.title || r.t), 60), str(r && (r.desc || r.d), 140)]).filter(r => r[0]);
  function secFrom(o) {
    if (!o || typeof o !== 'object') return null; const ft = (S.settings && S.settings.footer) || {}; const ty = String(o.type || '');
    if (ty === 'banner') return S2('banner', { eyebrow: str(o.eyebrow, 40), title: str(o.title, 80) || N(), sub: str(o.sub, 200), cta: str(o.cta, 24), cta2: str(o.cta2, 24) });
    if (ty === 'text' || VARS.includes(ty) || ty === 'plain') { const v = VARS.includes(o.variant) ? o.variant : VARS.includes(ty) ? ty : ''; const d = { eyebrow: str(o.eyebrow, 40), title: str(o.title, 80), body: str(o.body, 400) }; const c = cols(o.cols); if (c.length) d.cols = c; if (v) d.variant = v; if (o.cta) d.cta = str(o.cta, 24); if (v && !c.length && v !== 'cta') delete d.variant; return S2('text', d); }
    if (ty === 'classes') return S2('classes', { eyebrow: str(o.eyebrow, 40), title: str(o.title, 60) || `지금 모집 중인 ${t('cls')}`, sub: str(o.sub, 140), ids: pubList().slice(0, 4).map(c => c.id), layout: 'grid', auto: true });
    if (ty === 'notices') return S2('notices', { title: str(o.title, 60) || '공지사항', n: 3 });
    if (ty === 'reviews') return S2('reviews', { title: str(o.title, 60) || '수강후기' });
    if (ty === 'map') return S2('map', { title: str(o.title, 60) || '오시는 길 · 문의', addr: ft.addr || '주소를 입력하세요', tel: ft.tel || '연락처를 입력하세요', hours: str(o.hours, 60) || str(ft.hours, 60) /* v34.2 지어낸 운영 시간을 넣지 않는다 — 설정값만 */ });
    if (ty === 'image') return S2('image', { title: str(o.title, 60), alt: str(o.alt, 80) || str(o.title, 60) });
    if (ty === 'video') return S2('video', { title: str(o.title, 60) || '소개 영상', url: '' });
    return null;
  }
  function linkNorm(v) { v = String(v || '').trim(); if (/^learn:/.test(v)) { const k = v.slice(6); return LEARN.some(l => l[0] === k) ? v : 'learn:home'; }
    if (/^cls:/.test(v)) return (S.classes || []).some(c => c.id === v.slice(4)) ? v : 'learn:shop'; if (/^url:https?:\/\/[^\s<>"']+$/i.test(v)) return v; return 'page'; }
  const pageSecs = (L, label) => { const out = (Array.isArray(L) ? L : []).slice(0, 3).map(secFrom).filter(Boolean); return out.length ? out : [S2('text', { title: label, body: `${S.org.name}의 ${label} 안내입니다. 「화면에서 바로 고치기」에서 글을 눌러 내용을 채워 주세요.` })]; };
  const newSub = (o) => { const l = str(o.label || o.l, 20) || '메뉴'; const lk = linkNorm(o.link); return { id: uid('sb'), l, on: true, access: '공개', targets: [], hide: false, link: lk === 'page' ? '' : lk, sections: lk === 'page' ? pageSecs(o.page, l) : [], seo: { title: '', desc: '', kw: '' } }; };
  function menusFrom(list, prev) {
    const base = {}; (prev.menus || []).forEach(m => { if (m.kind !== 'custom' && !base[m.kind]) base[m.kind] = m; });
    const used = new Set(); const out = []; let L = (Array.isArray(list) ? list : []).slice(0, 7);
    if (!L.length) return prev.menus;
    L.forEach((o, i) => { const l = str(o.label || o.l, 20); if (!l) return; let lk = linkNorm(o.link); if (i === 0 && lk !== 'learn:home' && !L.some(x => linkNorm(x.link) === 'learn:home')) out.push(Object.assign(clone(base.home || { id: 'home', kind: 'home', l: '홈', access: '공개' }), { on: true })), used.add('home');
      const kind = lk.startsWith('learn:') ? LEARN2KIND[lk.slice(6)] : null; let m;
      if (kind && !used.has(kind)) { used.add(kind); m = Object.assign(clone(base[kind] || { id: kind, kind, access: '공개', targets: [], seo: { title: '', desc: '', kw: '' } }), { l, on: true, link: '' }); }
      else m = { id: uid('m'), kind: 'custom', l, on: true, access: '공개', targets: [], hide: false, link: lk === 'page' ? '' : lk, sections: lk === 'page' ? pageSecs(o.page, l) : [], subs: [], subOn: false, seo: { title: '', desc: '', kw: '' } };
      const subs = (m.kind === 'home' ? [] : Array.isArray(o.subs) ? o.subs : []).slice(0, 6).filter(x => str(x && (x.label || x.l), 20)).map(newSub);
      m.subs = subs; m.subOn = subs.length > 0; out.push(m); });
    if (!used.has('home')) out.unshift(Object.assign(clone(base.home || { id: 'home', kind: 'home', l: '홈', access: '공개' }), { on: true }));
    else { const i = out.findIndex(m => m.kind === 'home'); if (i > 0) out.unshift(out.splice(i, 1)[0]); }
    Object.values(base).forEach(m => { if (!used.has(m.kind) && m.kind !== 'home') out.push(Object.assign(clone(m), { on: false })); });
    return out.slice(0, 14);
  }
  function hpMake(j, prev, meta) {
    prev = prev || site(); if (typeof s2norm === 'function') s2norm(prev); const ns = clone(prev); j = j || {};
    ns.look = LOOKS[j.look] ? j.look : (prev.look || lookOf(prev)); ns.color = /^#[0-9a-f]{6}$/i.test(j.color || '') ? j.color : prev.color; ns.tone = TONES[j.tone] ? j.tone : prev.tone;
    if (!ns.tpl) ns.tpl = ((typeof tplFor === 'function' && tplFor(S.org.type)[0]) || TPL[0]).id;
    let secs = (Array.isArray(j.sections) ? j.sections : []).slice(0, 10).map(secFrom).filter(Boolean); if (!secs.length) secs = clone(prev.sections);
    if (secs[0].type !== 'banner') secs.unshift(S2('banner', { title: N(), sub: '', cta: `${t('cls')} 둘러보기` }));
    ns.sections = secs; ns.menus = menusFrom(j.menus, prev); ns.prompt = (meta && meta.brief) || prev.prompt || ''; delete ns.tr; delete ns.blank;
    ns.ai = Object.assign({ at: nowStr(), brief: '', url: '', by: '', summary: str(j.summary, 200), bench: str(j.bench, 200) }, meta || {});
    if (j.seo && typeof j.seo === 'object') ns.aiSeo = { title: str(j.seo.title, 60), desc: str(j.seo.desc, 160), kw: str(j.seo.kw, 200) };
    if (typeof s2norm === 'function') s2norm(ns); return ns;
  }

  /* ── 기본 설계(Claude 없이): 기관 유형 · 이름 · 공개 강좌로 ── */
  const LTY = {
    corp: { look: 'corpPortal', color: '#1E3A8A', ey: 'LEARNING PORTAL', hero: n => [`${String(n || '').replace(/\s*교육$/, '')} 교육 포털`, '필요한 교육을 필요한 때에 이수하고 기록합니다.'], about: '교육 안내', feat: [['직무 교육', '부서 · 직급별 필수 과정'], ['리더십', '단계별 리더 과정'], ['법정의무교육', '마감 전 이수 · 이수증 발급'], ['AI · 디지털', '업무에 바로 쓰는 실습']], steps: [['과정 확인', '나에게 배정된 과정을 확인합니다'], ['학습', '영상 · 실습 · 퀴즈로 배웁니다'], ['이수', '기준을 채우면 이수증이 발급됩니다']] },
    univ: { look: 'campus', color: '#2A2B2B', ey: 'LEARNING CENTER', hero: n => [`${n}\n배움이 역량이 되는 곳`, '교과 · 비교과 학습과 디지털 배지를 한 곳에서 관리합니다.'], about: '센터 소개', feat: [['교과 연계', '수업과 이어지는 온라인 학습'], ['비교과', '특강 · 프로그램 신청'], ['디지털 배지', '이수한 역량을 증명'], ['학습 기록', '내 학습 이력 한눈에']], steps: [['로그인', '학번으로 로그인합니다'], ['신청', '원하는 과정을 신청합니다'], ['이수', '이수하면 배지를 받습니다']] },
    k12: { look: 'brandBold', color: '#2563EB', ey: 'ACADEMY', hero: n => [`${n}\n매일 관리하는 공부`, '반별 수업 · 출결 · 테스트를 보호자와 함께 확인합니다.'], about: '학원 소개', feat: [['반별 수업', '수준에 맞춘 소수 정예 수업'], ['매 회차 테스트', '배운 내용을 바로 확인'], ['보호자 소통', '출결 · 성적 알림'], ['온라인 보강', '빠진 수업도 영상으로']], steps: [['상담 신청', '전화나 온라인으로 신청합니다'], ['레벨 확인', '수준에 맞는 반을 정합니다'], ['수업 시작', '첫 수업부터 기록을 남깁니다']] },
    adult: { look: 'mintSoft', color: '#5C74F6', ey: 'ONLINE CLASS', hero: n => [`${n}\n실무에 바로 쓰는 강좌`, '짧은 강의와 실습으로 오늘 배운 것을 내일 바로 씁니다.'], about: '소개', feat: [['짧은 강의', '바쁜 일정에도 완주할 수 있게'], ['실습 과제', '손으로 익히는 실무'], ['질문 답변', '막히면 바로 물어보세요'], ['수료증', '완주하면 수료증 발급']], steps: [['강좌 고르기', '목표에 맞는 강좌를 고릅니다'], ['수강 신청', '가입하고 바로 신청합니다'], ['학습 · 수료', '끝까지 완주하면 수료증을 받습니다']] },
    lifelong: { look: 'senior', color: '#2F6FE4', ey: 'LIFELONG LEARNING', hero: n => [`${n}\n배움에는 끝이 없습니다`, '생활 · 직업 · 인문 강좌를 온라인과 오프라인으로 만나 보세요.'], about: '학습관 소개', feat: [['생활 강좌', '일상에 도움이 되는 배움'], ['직업 강좌', '새로운 일을 위한 준비'], ['인문 · 문화', '함께 읽고 나누는 시간'], ['큰 글씨 화면', '누구나 쉽게 신청']], steps: [['강좌 보기', '관심 있는 강좌를 찾습니다'], ['신청', '온라인이나 전화로 신청합니다'], ['참여', '정해진 날 함께 배웁니다']] },
    voc: { look: 'publicTiles', color: '#1E40AF', ey: 'TRAINING', hero: n => [`${n}\n취업까지 이어지는 훈련`, '훈련 과정부터 수료 후 취업 준비까지 함께합니다.'], about: '기관 소개', feat: [['국비 과정', '국민내일배움카드로 수강'], ['실무 훈련', '현장에서 쓰는 기술'], ['취업 지원', '이력서 · 면접 준비'], ['출결 관리', '훈련 기록을 정확하게']], steps: [['과정 상담', '나에게 맞는 과정을 찾습니다'], ['수강 신청', '카드 확인 후 신청합니다'], ['훈련 · 수료', '수료 후 취업을 준비합니다']] }
  };
  /* v38 대학 학사 LMS(전교생 메인 LMS): 배지 · 신청 중심의 사업단 문구 대신 수업 · 과제 · 출석 문구 */
  const LTY_ULMS = Object.assign({}, LTY.univ, { ey: 'LEARNING MANAGEMENT', hero: n => [`${n}\n수업과 학습을 한 곳에서`, '강의 자료 · 과제 · 시험 · 출석 · 공지를 학기 단위로 확인합니다.'], about: '이용 안내', feat: [['강의실', '주차별 수업 자료와 공지'], ['과제 · 시험', '제출 · 응시 · 피드백을 온라인으로'], ['출석', '인증번호 · QR로 출석하고 바로 확인'], ['성적', '항목별 점수와 피드백']], steps: [['로그인', '학번과 접근코드로 로그인합니다'], ['강의실 입장', '이번 학기 수강 분반이 바로 보입니다'], ['과제 · 시험', '마감 전에 제출하고 결과를 확인합니다']] });
  function hpLocal(brief, o) {
    o = o || {}; const ty = (S.org.type === 'univ' && S.org.ed === 'lms' ? LTY_ULMS : null) || LTY[S.org.type] || LTY.adult; const n = N(); const b = String(brief || '');
    const tone = TONES[o.tone] ? o.tone : (Object.keys(TONES).find(k => b.includes(k)) || '신뢰');
    const color = /파랑|블루|blue/i.test(b) ? '#2563EB' : /보라|퍼플/.test(b) ? '#5C74F6' : /주황|오렌지/.test(b) ? '#EA580C' : /네이비|남색/.test(b) ? '#1E3A8A' : /초록|그린|green/i.test(b) ? '#15803D' : ty.color;
    const focus = (b.match(/([가-힣A-Za-z0-9 ]{2,20})\s*(을|를)?\s*(강조|중심|위주)/) || [])[1];
    const [h1, h2] = ty.hero(n); const C = pubList();
    const must = [...(o.must || []), b].join(' ');
    const secs = [{ type: 'banner', eyebrow: ty.ey, title: focus ? `${focus.trim()},\n${n}에서` : h1, sub: h2, cta: `${t('cls')} 둘러보기`, cta2: '문의하기' },
      { type: 'text', variant: 'features', eyebrow: 'ABOUT', title: `${n}은(는) 이렇게 가르칩니다`, body: '', cols: ty.feat },
      { type: 'classes', eyebrow: 'CLASSES', title: C.length ? `지금 신청할 수 있는 ${t('cls')}` : `${t('cls')} 안내`, sub: C.length ? C.slice(0, 3).map(c => c.name).join(' · ') : `공개한 ${tj('cls', '이')} 이곳에 자동으로 표시됩니다.` },
      { type: 'text', variant: 'steps', eyebrow: 'HOW', title: '이렇게 시작합니다', cols: ty.steps }];
    if (/후기|리뷰/.test(must)) secs.push({ type: 'reviews', title: '수강후기' });
    if (/일정|스케줄/.test(must)) secs.push({ type: 'text', variant: 'timeline', title: '주요 일정', cols: [['모집', '상시 모집'], ['개강', '강좌별 안내'], ['수료', '기준 충족 시']] });
    secs.push({ type: 'notices', title: '공지사항' });
    secs.push(/오시는|지도|위치|주소/.test(must) || S.settings.footer?.addr ? { type: 'map', title: '오시는 길 · 문의' } : { type: 'text', variant: 'cta', title: '궁금한 점이 있으신가요?', body: `${n}에 편하게 문의해 주세요.`, cta: '문의하기', cols: ((S.settings && S.settings.footer && S.settings.footer.hours) ? [['운영 시간', S.settings.footer.hours]] : []) });
    const menus = [{ label: '홈', link: 'learn:home' },
      { label: ty.about, link: 'page', page: [{ type: 'text', variant: 'features', eyebrow: 'ABOUT', title: `${n} 소개`, body: `${n}${AI.j(n, '이')} 하는 일을 소개합니다.`, cols: ty.feat.slice(0, 3) }], subs: [{ label: '인사말', link: 'page', page: [{ type: 'text', title: '인사말', body: `${n}을(를) 찾아 주셔서 감사합니다. 배우는 모든 분이 끝까지 완주할 수 있도록 돕겠습니다.` }] }, { label: '오시는 길', link: 'page', page: [{ type: 'map', title: '오시는 길' }] }] },
      { label: t('cls'), link: 'learn:shop', subs: C.slice(0, 4).map(c => ({ label: c.name.slice(0, 20), link: 'cls:' + c.id })) },
      { label: '커뮤니티', link: 'learn:comm', subs: [{ label: '공지사항', link: 'learn:notice' }] },
      { label: '내 학습', link: 'learn:my' }];
    return { look: ty.look, color, tone, summary: `${TYPES[S.org.type].name} 기본 구성(소개 · ${t('cls')} · 시작 방법 · 공지)으로 만들었습니다.`, bench: '', sections: secs, menus };
  }

  /* ── 섹션 숨김 · 강좌 자동 · 편집 표시(proSec 감싸기) ── */
  { const base = proSec; proSec = (x, i, s, lk) => {
    if (x && x.hide && !HPE.map) return '';
    let y = x; if (x && x.type === 'classes' && x.data && x.data.auto) { const L = pubList().map(c => c.id); y = { ...x, data: { ...x.data, ids: L.slice(0, x.data.layout === 'slide' ? 12 : 4) } }; }
    let h = base(y, i, s, lk) || ''; const m = HPE.map && x ? HPE.map.get(x) : null;
    if (m) { h = h.replace(/<section\b/g, `<section data-hpe="${esc(m.key)}|${m.i}"${x.hide ? ' data-hpe-hid="1"' : ''}`); if (!/<section\b/.test(h)) h = `<section data-hpe="${esc(m.key)}|${m.i}">${h}</section>`; }
    return h; }; }

  /* ── 되돌리기 ── */
  function hpPush() { try { HPE.undo.push(JSON.stringify(S.site)); if (HPE.undo.length > 40) HPE.undo.shift(); HPE.redo = []; } catch (e) { } hpBar(); }
  function hpUndo() { if (!HPE.undo.length) { toast('되돌릴 변경이 없습니다.'); return; } HPE.redo.push(JSON.stringify(S.site)); S.site = JSON.parse(HPE.undo.pop()); save(); hpRefresh(); toast('되돌렸습니다.'); }
  function hpRedo() { if (!HPE.redo.length) return; HPE.undo.push(JSON.stringify(S.site)); S.site = JSON.parse(HPE.redo.pop()); save(); hpRefresh(); toast('다시 적용했습니다.'); }
  window.hpUndo = hpUndo; window.hpRedo = hpRedo; window.hpPush = hpPush;
  function hpRefresh() { if (HPE.on) hpPaint(); else render(); hpBar(); if ($('#hpmBox')) hpmPaint(); }
  function hpBar() { const u = $('#hpeUndo'); if (u) { u.disabled = !HPE.undo.length; u.querySelector('em') && (u.querySelector('em').textContent = HPE.undo.length || ''); } const r = $('#hpeRedo'); if (r) r.disabled = !HPE.redo.length; }

  /* ── 1) AI로 홈페이지 만들기: 입력 창 ── */
  function hpOpen(pre) {
    pre = pre || {}; const s = S.site || {}; const last = s.ai || {};
    const body = `<div class="hpai-in"><p class="hpai-lead">원하는 홈페이지를 말로 설명하거나, 비슷하게 만들고 싶은 사이트 주소를 넣어 주세요. ${esc(S.org.name)}의 이름 · 공개 ${esc(t('cls'))}에 맞춰 첫 화면과 메뉴를 만들어 드립니다.</p>
      <label class="fl">어떤 홈페이지를 원하세요?<textarea name="brief" rows="4" maxlength="1500" placeholder="예: 직장인 대상 엑셀 · AI 실무 학원입니다. 믿음직하고 깔끔하게, 강좌 소개 · 수강 방법 · 후기 · 오시는 길을 넣어 주세요.">${esc(pre.brief != null ? pre.brief : last.brief || '')}</textarea></label>
      <label class="fl">참고할 사이트 주소(선택)<input name="url" inputmode="url" maxlength="250" placeholder="https://참고할-사이트.com" value="${esc(pre.url != null ? pre.url : last.url || '')}"></label>
      <p class="hpai-note">${ic('check', 13)} 구성과 분위기만 참고하고 글 · 이미지는 새로 만듭니다. 다른 사이트의 글 · 로고 · 사진은 쓰지 않습니다.</p>
      <details class="hpai-more"><summary>더 자세히(선택)</summary>
        <div class="form2"><label>분위기<select name="tone"><option value="">AI가 정하기</option>${Object.keys(TONES).map(k => `<option ${pre.tone === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label><label>대표 색<span class="hpai-color"><input type="checkbox" name="colorOn" aria-label="대표 색 지정"><input type="color" name="color" value="${esc(s.color || '#5C74F6')}" aria-label="대표 색"></span></label></div>
        <div class="fl">로고(선택)<span class="hpai-logo"><label class="btn sm">로고 올리기<input type="file" accept="image/*" name="logoF" hidden></label><input type="hidden" name="logo" value=""><small class="mini" data-logo-msg>${s.gnb && s.gnb.logo ? '지금 로고를 그대로 씁니다' : '없으면 기관명이 표시됩니다'}</small></span></div>
        <label class="fl">참고 사이트 글 붙여 넣기(주소를 읽지 못할 때)<textarea name="pasted" rows="3" maxlength="12000" placeholder="참고 사이트에서 메뉴 · 제목 · 소개 글을 복사해 붙여 넣으면 구성을 더 비슷하게 맞춥니다.">${esc(pre.pasted || '')}</textarea></label>
      </details>
      ${aiOn() ? '' : `<p class="hpai-warn">Claude가 연결되지 않아 기관 유형 기본 설계로 만듭니다. <a href="#" data-act="ag-setup">Claude 연결하기</a></p>`}</div>`;
    const w = modal('AI로 홈페이지 만들기', body, [{ id: 'c', label: '취소' }, { id: 'ok', label: '만들기', kind: 'pri', run: w2 => { hpRunFrom(w2); return false; } }], true);
    w.classList.add('hpai-m');
    const f = w.querySelector('[name=logoF]'); if (f) f.addEventListener('change', () => imgFile(f.files[0], url => { w.querySelector('[name=logo]').value = url; w.querySelector('[data-logo-msg]').textContent = `로고를 올렸습니다(${Math.round(url.length / 1024)}KB)`; }));
    const ta = w.querySelector('[name=brief]'); if (ta) ta.focus();
  }
  window.hpOpen = hpOpen;
  function hpRunFrom(w) {
    const o = { brief: fv(w, 'brief'), url: fv(w, 'url'), tone: fv(w, 'tone'), pasted: fv(w, 'pasted'), color: fv(w, 'colorOn') ? fv(w, 'color') : '', logo: fv(w, 'logo') };
    if (!o.brief && !o.url && !o.pasted) { toast('원하는 내용을 한 줄이라도 적거나 참고할 사이트 주소를 넣어 주세요.', 'warn'); return; }
    if (o.url) { try { benchURL(o.url); } catch (e) { toast(e.message, 'warn'); return; } }
    hpRun(o);
  }
  async function hpRun(o, opt) {
    opt = opt || {}; if (HPE.busy) { toast('홈페이지를 만드는 중입니다. 잠시만 기다려 주세요.'); return; } HPE.busy = true; HPE.last = o;
    const w = modal('AI로 홈페이지 만들기', `<div class="hpai-wait" role="status" aria-live="polite"><span class="hpai-spin" aria-hidden="true"></span><b>${o.url ? '참고 사이트의 구성을 살펴보고' : '설명을 바탕으로'} ${esc(S.org.name)} 홈페이지를 만들고 있습니다…</b><small>보통 10~40초 걸립니다. 글 · 이미지는 새로 만듭니다.</small></div>`, [{ id: 'c', label: '닫기' }]);
    w.classList.add('hpai-m');
    let res; try { res = await hpGenerate(o); }
    catch (e) { res = { j: hpLocal(o.brief, o), notes: [`AI 연결에 실패해(${e.message}) 기본 설계로 만들었습니다.`], via: '기본 설계' }; }
    finally { HPE.busy = false; }
    const draft = hpMake(res.j, site(), { brief: str(o.brief, 1500), url: o.url ? (() => { try { return benchURL(o.url); } catch (e) { return ''; } })() : '', by: res.via });
    if (o.color && /^#[0-9a-f]{6}$/i.test(o.color)) draft.color = o.color; if (o.logo) draft.gnb = Object.assign({}, draft.gnb, { logo: o.logo });
    HPE.draft = { site: draft, notes: res.notes || [], via: res.via, bench: res.bench, o };
    if (opt.apply) { hpApply(); return; }
    if (!document.body.contains(w)) toast('홈페이지 초안이 준비되었습니다.', 'ok');
    hpPreview();
  }
  window.hpRun = hpRun;
  function hpPreview() {
    const D = HPE.draft; if (!D) return; const d = D.site; const sn = (x, i) => { const v = x.data || {}; const nm = x.type === 'text' && v.variant ? ({ features: '소개 카드', stats: '숫자 강조', steps: '단계 안내', timeline: '일정', roadmap: '로드맵', info: '안내표', tiles: '바로가기', profiles: '사람 소개', modules: '모듈', cta: '문의 · 신청', logos: '협력 기관', story: '이야기' })[v.variant] : (SEC[x.type] || {}).n || x.type; return `<li><span class="hpai-n">${i + 1}</span><div><b>${esc(nm)}</b><small>${esc(String(v.title || '').replace(/\n/g, ' ').slice(0, 40))}</small></div><button type="button" class="btn sm ghost" data-act="hpai-re" data-v="${i}">${ic('spark', 12)} 이 부분만 다시</button></li>`; };
    const mt = m => `<li><b>${esc(m.l)}</b>${(m.subs || []).length ? `<small>${m.subs.map(sb => esc(sb.l)).join(' · ')}</small>` : ''}</li>`;
    const body = `<div id="hpaiBox" class="hpai-pv">${D.notes.length ? `<div class="hpai-notes">${D.notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
      <p class="mini">${esc(d.ai.summary || '')}${d.ai.bench ? ` · 참고: ${esc(d.ai.bench)}` : ''} <span class="hpai-via">${esc(D.via || '')}</span></p>
      <div class="hpai-ba"><figure><figcaption>지금</figcaption><iframe title="지금 홈페이지" sandbox="allow-same-origin" data-hpai-pv="now"></iframe></figure><figure class="new"><figcaption>AI 제안</figcaption><iframe title="AI가 만든 홈페이지" sandbox="allow-same-origin" data-hpai-pv="new"></iframe></figure></div>
      <div class="hpai-cols"><div><b class="hpai-h">첫 화면 섹션 ${d.sections.length}개</b><ol class="hpai-sl">${d.sections.map(sn).join('')}</ol></div><div><b class="hpai-h">메뉴</b><ul class="hpai-ml">${d.menus.filter(m => m.on !== false).map(mt).join('')}</ul><p class="mini">적용한 뒤 「메뉴 편성」에서 바로 고칠 수 있습니다.</p></div></div>
      <p class="hpai-note">${ic('check', 13)} 구성과 분위기만 참고하고 글 · 이미지는 새로 만들었습니다. 적용해도 게시하기 전까지 ${esc(t('learner'))}에게는 보이지 않습니다.</p></div>`;
    const w = modal('AI가 만든 홈페이지', body, [{ id: 'again', label: '다시 만들기', run: () => { hpOpen(D.o); return false; } }, { id: 'c', label: '닫기' }, { id: 'ok', label: '적용', kind: 'pri', run: () => { hpApply(); } }], true);
    w.classList.add('hpai-m', 'hpai-wide'); paintPv(w);
  }
  function paintPv(w) { const D = HPE.draft; const set = (f, h) => { if (!f) return; f.srcdoc = h; f.addEventListener('load', () => { try { const sc = f.parentElement.clientWidth / 1280; f.style.transform = `scale(${sc})`; f.style.height = Math.round((f.parentElement.clientHeight || 420) / sc) + 'px'; } catch (e) { } }, { once: true }); };
    try { set(w.querySelector('[data-hpai-pv=now]'), siteHTML(site())); } catch (e) { } try { set(w.querySelector('[data-hpai-pv=new]'), siteHTML(D.site)); } catch (e) { console.error(e); } }
  ACT['hpai-re'] = async el => { const D = HPE.draft; if (!D) return; const i = +el.dataset.v; const x = D.site.sections[i]; if (!x) return; el.disabled = true; el.textContent = '다시 쓰는 중…';
    try { const nx = await hpReSection(x, D.o && D.o.brief); D.site.sections[i] = nx; } catch (e) { toast(`다시 쓰지 못했습니다(${e.message}).`, 'warn'); }
    if ($('#hpaiBox')) hpPreview(); };
  async function hpReSection(x, brief) {
    const d = x.data || {}; const plain = { type: x.type === 'text' ? 'text' : x.type, variant: d.variant, eyebrow: d.eyebrow, title: d.title, sub: d.sub, body: typeof d.body === 'string' ? d.body : undefined, cta: d.cta, cta2: d.cta2, cols: d.cols, hours: d.hours, alt: d.alt };
    if (!aiOn()) { const L = hpLocal(brief || ''); const same = L.sections.find(s => s.type === plain.type && (s.variant || '') === (plain.variant || '')) || L.sections.find(s => s.type === plain.type); if (!same) throw new Error('Claude 연결이 필요합니다'); const n = secFrom(same); n.id = x.id; return n; }
    const r = await CL.call({ system: SYS() + '\n지금은 섹션 하나만 다시 씁니다. 같은 type(텍스트면 같은 variant)의 섹션 JSON 객체 하나만 출력합니다. 앞의 글과 다른 표현으로 씁니다.', messages: [{ role: 'user', content: `요청 설명: ${brief || '(없음)'}\n기관 정보: ${JSON.stringify(hpOrg())}\n다시 쓸 섹션: ${JSON.stringify(plain)}` }], max: 1500 });
    const o = jsonOf(r.text); if (!o.type) o.type = plain.type; if (plain.variant && !o.variant) o.variant = plain.variant; const n = secFrom(o); if (!n) throw new Error('형식 오류');
    n.id = x.id; ['dstyle', 'bg', 'align', 'img', 'imgs', 'link', 'link2', 'auto', 'ids', 'layout', 'addr', 'tel'].forEach(k => { if (d[k] !== undefined && n.data[k] === undefined) n.data[k] = d[k]; }); if (x.hide) n.hide = true; return n; }
  function hpApply() {
    const D = HPE.draft; if (!D) return; const cur = site(); hpPush(); const ns = D.site; ns.published = !!cur.published; ns.at = cur.at;
    S.site = ns; seoSync(ns); /* v34.5 FZ(FIXLIST 19): 빈 칸에 한 번만 복사하던 것을 출처 표시(auto) 방식으로 — 아래 seoSync */
    S.ai.usage = (S.ai.usage || 0) + 1; logAudit(`AI 홈페이지 만들기${ns.ai.url ? ' — 참고 사이트 구성 참고' : ''}`); save(); HPE.draft = null; closeModal(); UI.smT = 'home'; UI.sitePage = 'home';
    if (CUR.tab !== 'site') go('site'); else render();
    toast('새 홈페이지를 적용했습니다. 글자를 눌러 바로 고치고, 마음에 들면 [게시하기]를 누르세요.', 'ok');
    setTimeout(() => hpEdit('home'), 60);
  }
  window.hpApply = hpApply;

  /* ── 이미지 파일 → 200KB 이하 dataURL ── */
  function imgFile(file, cb) {
    if (!file) return; if (!/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(file.type)) { toast('이미지 파일(PNG · JPG · GIF · WEBP · SVG)만 올릴 수 있습니다.', 'warn'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('10MB 이하 이미지만 올릴 수 있습니다.', 'warn'); return; }
    const rd = new FileReader(); rd.onload = () => { const url = String(rd.result); if (url.length <= LIM) return cb(url); if (/svg|gif/.test(file.type)) { toast('200KB 이하 파일로 줄여서 올려 주세요.', 'warn'); return; }
      const im = new Image(); im.onload = () => { let mx = 1600, q = .85, out = ''; for (let k = 0; k < 10; k++) { const r = Math.min(1, mx / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * r)); c.height = Math.max(1, Math.round(im.height * r)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', q); if (out.length <= LIM) break; q = Math.max(.5, q - .1); mx = Math.round(mx * .8); }
        if (out.length > LIM) { toast('이미지를 200KB 이하로 줄이지 못했습니다.', 'warn'); return; } cb(out); }; im.onerror = () => toast('이미지를 읽지 못했습니다.', 'bad'); im.src = url; };
    rd.readAsDataURL(file); /* 운영: 파일 서버(CDN) 업로드 후 URL 저장 */ }
  window.hpImgFile = imgFile;

  /* ── 2) 화면에서 바로 고치기 ── */
  const pagesOf = s => (typeof s2pages === 'function' ? s2pages(s) : [{ key: 'home', label: '홈', sections: s.sections }]).filter(p => Array.isArray(p.sections));
  const secList = key => { const p = pagesOf(site()).find(p => p.key === key); return p ? p.sections : site().sections; };
  const SKIP = /^(id|type|variant|style|dstyle|align|bg|link|link2|img|src|thumb|url|ids|layout|sec|n|html|allowScript|h|pin|list|cats|per|lat|lng|auto|showTitle|count)$/;
  function cands(d, base = [], out = []) {
    if (Array.isArray(d)) d.forEach((v, i) => { if (typeof v === 'string') { if (v.trim()) out.push([[...base, i], v]); } else if (v && typeof v === 'object') cands(v, [...base, i], out); });
    else if (d && typeof d === 'object') Object.keys(d).forEach(k => { if (SKIP.test(k)) return; const v = d[k]; if (typeof v === 'string') { if (v.trim()) out.push([[...base, k], v]); } else if (v && typeof v === 'object') cands(v, [...base, k], out); });
    return out; }
  const keyOf = s => String(s || '').replace(/[\s→“”"]/g, '');
  const getP = (o, p) => p.reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const last = p[p.length - 1]; const par = getP(o, p.slice(0, -1)); if (par != null) par[last] = v; };
  function textOf(el) { const c = el.cloneNode(true); c.querySelectorAll('br').forEach(b => b.replaceWith('\n')); c.querySelectorAll('.hpe-tb').forEach(b => b.remove()); return c.textContent.replace(/[ \t]+\n/g, '\n').replace(/ /g, ' ').replace(/\s*→\s*$/, '').replace(/^\s+|\s+$/g, ''); }
  function hpEditHTML(key) {
    const s = site(); if (typeof s2norm === 'function') s2norm(s); const map = new Map(); pagesOf(s).forEach(p => p.sections.forEach((x, i) => map.set(x, { key: p.key, i })));
    const keep = UI.sitePage; UI.sitePage = key; HPE.map = map; let h = '';
    try { h = siteHTML(s, false, 'ko'); } finally { HPE.map = null; UI.sitePage = keep; }
    const css = `[data-hpe]{position:relative}[data-hpe]:hover,[data-hpe].hpe-sel{outline:2px dashed rgba(92,116,246,.55);outline-offset:-3px}[data-hpe-hid]{opacity:.38}[data-hpe-hid]::before{content:'숨긴 섹션 — 게시된 사이트에는 보이지 않습니다';position:absolute;left:12px;top:12px;z-index:30;background:#8A5A00;color:#fff;font:700 12px/1.4 Pretendard,system-ui,sans-serif;padding:4px 10px;border-radius:99px}
[data-hpe-f]{cursor:text;border-radius:4px;transition:background .12s}[data-hpe-f]:hover{outline:2px solid #5C74F6;outline-offset:2px;background:rgba(92,116,246,.07)}[data-hpe-f][contenteditable]{outline:2px solid #5C74F6;outline-offset:2px;background:#fff!important;color:#14161F!important;-webkit-text-fill-color:#14161F;cursor:text}
[data-hpe-img]{cursor:pointer}[data-hpe-img]:hover{outline:3px solid #5C74F6;outline-offset:2px}
.hpe-tb{position:absolute;top:10px;right:10px;z-index:40;display:none;gap:2px;background:#2A2B2B;padding:4px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:600 12px/1 Pretendard,system-ui,sans-serif;flex-wrap:wrap;max-width:calc(100% - 20px)}[data-hpe]:hover>.hpe-tb,[data-hpe].hpe-sel>.hpe-tb,.hpe-tb:focus-within{display:flex}
.hpe-tb button{border:0;background:transparent;color:#fff;padding:7px 9px;border-radius:8px;cursor:pointer;font:inherit;white-space:nowrap}.hpe-tb button:hover,.hpe-tb button:focus-visible{background:rgba(255,255,255,.18);outline:none}.hpe-tb .ai{color:#C9C2FF}
.hpe-add{display:flex;justify-content:center;padding:6px 0;position:relative;z-index:35}.hpe-add button{border:1.5px dashed #9A93E8;background:#fff;color:#5C74F6;border-radius:99px;padding:6px 16px;font:700 13px Pretendard,system-ui,sans-serif;cursor:pointer;opacity:.55}.hpe-add button:hover,.hpe-add button:focus-visible{opacity:1}
a[href]{cursor:default}.s2chat,.s2pop{pointer-events:none}`;
    return h.replace('</style>', css + '</style>');
  }
  function hpEdit(key) {
    if (!S || !S.site) { toast('홈페이지가 아직 없습니다. 「AI로 홈페이지 만들기」로 먼저 만들어 주세요.', 'warn'); return; }
    closeModal(); HPE.on = true; HPE.key = key || HPE.key || 'home'; if (!pagesOf(site()).some(p => p.key === HPE.key)) HPE.key = 'home';
    let w = $('#hpe'); if (!w) { w = document.createElement('div'); w.id = 'hpe'; w.className = 'hpe'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', '화면에서 바로 고치기'); document.body.appendChild(w); }
    document.body.classList.add('hpe-open'); hpChrome(); hpPaint();
  }
  window.hpEdit = hpEdit; window.hpPaint = hpPaint; /* v34.5 hpimg: 스크롤을 지키며 다시 그리기 */
  function hpChrome() {
    const w = $('#hpe'); if (!w) return; const P = pagesOf(site());
    w.innerHTML = `<div class="hpe-bar"><div class="hpe-t"><b>화면에서 바로 고치기</b><small>글자를 누르면 바로 고칩니다 · Enter 저장 · Esc 취소 · 이미지를 누르면 바꿉니다</small></div>
      <label class="hpe-pg"><span class="sr">고칠 페이지</span><select id="hpePage" aria-label="고칠 페이지">${P.map(p => `<option value="${esc(p.key)}" ${p.key === HPE.key ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label>
      <div class="seg hpe-dev" role="group" aria-label="화면 크기"><button type="button" class="${HPE.dev === 'pc' ? 'on' : ''}" data-act="hpe-dev" data-v="pc" aria-pressed="${HPE.dev === 'pc'}">PC</button><button type="button" class="${HPE.dev === 'mo' ? 'on' : ''}" data-act="hpe-dev" data-v="mo" aria-pressed="${HPE.dev === 'mo'}">휴대폰</button></div>
      <span class="sp"></span>
      <button type="button" class="btn sm ghost" id="hpeUndo" data-act="hpe-undo" title="되돌리기(Ctrl+Z)" ${HPE.undo.length ? '' : 'disabled'}>↶ 되돌리기<em>${HPE.undo.length || ''}</em></button><button type="button" class="btn sm ghost" id="hpeRedo" data-act="hpe-redo" title="다시 적용(Ctrl+Shift+Z)" ${HPE.redo.length ? '' : 'disabled'} aria-label="다시 적용">↷</button>
      <button type="button" class="btn sm" data-act="hpm-open">메뉴 편성</button><button type="button" class="btn sm ai" data-act="hpai-open">${ic('spark', 13)} AI로 다시 만들기</button>
      <button type="button" class="btn sm pri" data-act="hpe-pub">${ic('check', 14)} ${typeof smIsPub === 'function' && smIsPub() ? '다시 게시' : '게시하기'}</button><button type="button" class="btn sm ghost hpe-x" data-act="hpe-close" aria-label="고치기 닫기">${ic('x', 16)}</button></div>
      <div class="hpe-stage ${HPE.dev}"><iframe id="hpeF" title="홈페이지 편집 화면 — 글자를 눌러 고치세요"></iframe></div><p class="hpe-foot mini">고친 내용은 자동으로 저장됩니다(초안). [게시하기]를 눌러야 ${esc(t('learner'))}에게 보입니다.</p>`;
    const sel = $('#hpePage'); if (sel) sel.addEventListener('change', () => { HPE.key = sel.value; hpPaint(); });
  }
  function hpPaint() {
    const f = $('#hpeF'); if (!f) return; let y = 0; try { y = f.contentWindow ? f.contentWindow.scrollY : 0; } catch (e) { }
    if (!pagesOf(site()).some(p => p.key === HPE.key)) HPE.key = 'home';
    const sel = $('#hpePage'); if (sel) { const P = pagesOf(site()); sel.innerHTML = P.map(p => `<option value="${esc(p.key)}" ${p.key === HPE.key ? 'selected' : ''}>${esc(p.label)}</option>`).join(''); }
    f.onload = () => { try { hpBind(f); if (y) f.contentWindow.scrollTo(0, y); } catch (e) { console.error('hpe bind', e); } };
    f.srcdoc = hpEditHTML(HPE.key); hpBar();
  }
  function hpBind(f) {
    const doc = f.contentDocument; if (!doc) return; const L = secList(HPE.key); const seen = new Set();
    doc.querySelectorAll('[data-hpe]').forEach(sec => { const [key, si] = sec.dataset.hpe.split('|'); const x = key === HPE.key ? L[+si] : null; if (!x) return;
      const first = !seen.has(si); seen.add(si);
      const C = cands(x.data || {}); const used = new Set();
      sec.querySelectorAll('h1,h2,h3,h4,p,b,strong,small,span,a,dt,dd,li,em,figcaption,blockquote,cite,time,label,div').forEach(el => {
        if (el.closest('[data-hpe-f]') || el.closest('.hpe-tb')) return; if ([...el.children].some(c => !/^(BR|EM|SMALL|STRONG)$/.test(c.tagName))) return;
        const k = keyOf(el.textContent); if (!k) return; const hit = C.findIndex(([p, v], ix) => !used.has(ix) && keyOf(v) === k); if (hit < 0) return; used.add(hit);
        el.setAttribute('data-hpe-f', `${si}|${JSON.stringify(C[hit][0])}`); el.setAttribute('tabindex', '0'); el.setAttribute('role', 'textbox'); el.setAttribute('aria-label', `글 고치기: ${C[hit][1].slice(0, 30)}`); });
      /* 이미지 · 자리 표시 */
      const imgs = [...sec.querySelectorAll('img, .ph, .s2ph0, .s2bimg span, .vph')].filter(e => !e.closest('.cc'));
      if (x.type === 'image' || x.type === 'slideImage') imgs.forEach((e, k) => { e.setAttribute('data-hpe-img', `${si}|imgs|${k}`); e.setAttribute('tabindex', '0'); e.setAttribute('aria-label', '이미지 바꾸기'); });
      if (x.type === 'banner') imgs.forEach(e => { e.setAttribute('data-hpe-img', `${si}|img|0`); e.setAttribute('tabindex', '0'); e.setAttribute('aria-label', '배너 이미지 바꾸기'); });
      if (first) sec.insertAdjacentHTML('afterbegin', `<div class="hpe-tb" role="toolbar" aria-label="섹션 도구"><button type="button" data-hpe-act="up" data-i="${si}" title="위로">↑ 위로</button><button type="button" data-hpe-act="down" data-i="${si}" title="아래로">↓ 아래로</button><button type="button" data-hpe-act="hide" data-i="${si}">${x.hide ? '보이기' : '숨기기'}</button><button type="button" data-hpe-act="ai" class="ai" data-i="${si}">✦ AI로 다시 쓰기</button><button type="button" data-hpe-act="dup" data-i="${si}">복제</button>${x.type === 'banner' ? `<button type="button" data-hpe-act="bimg" data-i="${si}">배경 이미지</button>` : ''}<button type="button" data-hpe-act="more" data-i="${si}">자세히</button><button type="button" data-hpe-act="del" data-i="${si}">삭제</button></div>`);
    });
    /* '+ 섹션 추가' 자리 */
    const main = doc.getElementById('p-' + HPE.key); if (main) { const bar = i => `<div class="hpe-add"><button type="button" data-hpe-act="add" data-i="${i}">+ 섹션 추가</button></div>`;
      const firstOf = {}, lastOf = {}; main.querySelectorAll('[data-hpe]').forEach(sec => { const si = sec.dataset.hpe.split('|')[1]; if (!(si in firstOf)) firstOf[si] = sec; lastOf[si] = sec; });
      const idx = Object.keys(lastOf).map(Number).sort((a, b) => a - b);
      if (!idx.length) main.insertAdjacentHTML('beforeend', bar(0)); else { firstOf[idx[0]].insertAdjacentHTML('beforebegin', bar(0)); idx.forEach(i => lastOf[i].insertAdjacentHTML('afterend', bar(i + 1))); } }
    doc.addEventListener('click', e => onClick(e, f), true);
    doc.addEventListener('keydown', e => onKey(e, f), true);
    doc.addEventListener('submit', e => e.preventDefault(), true);
  }
  function onClick(e, f) {
    const doc = f.contentDocument; const t = e.target; const tb = t.closest && t.closest('[data-hpe-act]');
    if (tb) { e.preventDefault(); e.stopPropagation(); secAct(tb.dataset.hpeAct, +tb.dataset.i); return; }
    const ed = t.closest && t.closest('[data-hpe-f]'); if (ed) { e.preventDefault(); e.stopPropagation(); if (!ed.isContentEditable) startEdit(ed); return; }
    const im = t.closest && t.closest('[data-hpe-img]'); if (im) { e.preventDefault(); e.stopPropagation(); const [si, fld, k] = im.dataset.hpeImg.split('|'); imgPick(+si, fld, +k); return; }
    const a = t.closest && t.closest('a[href]'); if (a) { e.preventDefault(); const h = a.getAttribute('href') || ''; const m = h.match(/^#p-(.+)$/); if (m && pagesOf(site()).some(p => p.key === m[1])) { HPE.key = m[1]; hpPaint(); } }
    const sec = t.closest && t.closest('[data-hpe]'); doc.querySelectorAll('.hpe-sel').forEach(x => x !== sec && x.classList.remove('hpe-sel')); if (sec) sec.classList.add('hpe-sel');
  }
  function onKey(e, f) { const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !(e.target && e.target.isContentEditable)) { e.preventDefault(); e.shiftKey ? hpRedo() : hpUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y' && !(e.target && e.target.isContentEditable)) { e.preventDefault(); hpRedo(); return; }
    const el = e.target; if (el && el.matches && el.matches('[data-hpe-f]') && !el.isContentEditable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startEdit(el); return; }
    if (el && el.matches && el.matches('[data-hpe-img]') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const [si, fld, kk] = el.dataset.hpeImg.split('|'); imgPick(+si, fld, +kk); }
    if (e.key === 'Escape' && !(el && el.isContentEditable)) { e.preventDefault(); hpClose(); } }
  function startEdit(el) {
    const doc = el.ownerDocument; doc.querySelectorAll('[contenteditable]').forEach(x => x !== el && x.blur());
    const orig = el.innerHTML; const [si, pj] = el.dataset.hpeF.split(/\|(.*)/s); const path = JSON.parse(pj); let done = false;
    try { el.contentEditable = 'plaintext-only'; } catch (er) { el.contentEditable = 'true'; } if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.focus(); try { const r = doc.createRange(); r.selectNodeContents(el); const sl = doc.getSelection(); sl.removeAllRanges(); sl.addRange(r); } catch (er) { }
    const finish = save2 => { if (done) return; done = true; el.removeEventListener('keydown', kd, true); el.removeEventListener('blur', bl);
      el.removeAttribute('contenteditable'); if (!save2) { el.innerHTML = orig; return; }
      const x = secList(HPE.key)[+si]; if (!x) return; const oldV = getP(x.data, path); let v = textOf(el); if (typeof oldV === 'string' && !/\n/.test(oldV) && path[path.length - 1] !== 'title') v = v.replace(/\n+/g, ' ');
      if (!v) { el.innerHTML = orig; toast('빈 글은 저장하지 않았습니다. 섹션을 지우려면 섹션 도구의 [삭제]를 쓰세요.', 'warn'); return; }
      if (v === oldV) { el.innerHTML = orig; return; } hpPush(); setP(x.data, path, v.slice(0, 600)); save(); hpPaint(); toast('고쳤습니다(자동 저장).', 'ok'); };
    const kd = ev => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); ev.stopPropagation(); finish(true); } else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); } };
    const bl = () => setTimeout(() => finish(true), 0);
    el.addEventListener('keydown', kd, true); el.addEventListener('blur', bl);
  }
  function secAct(act, i) {
    const L = secList(HPE.key); const x = L[i]; if (act === 'add') return addPick(i); if (!x) return;
    if (act === 'up' || act === 'down') { const j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= L.length) { toast(act === 'up' ? '맨 위 섹션입니다.' : '맨 아래 섹션입니다.'); return; } hpPush(); [L[i], L[j]] = [L[j], L[i]]; save(); hpPaint(); return; }
    if (act === 'hide') { hpPush(); x.hide = !x.hide; if (!x.hide) delete x.hide; save(); hpPaint(); toast(x.hide ? '섹션을 숨겼습니다. 게시된 사이트에는 보이지 않습니다.' : '섹션을 다시 보이게 했습니다.', 'ok'); return; }
    if (act === 'dup') { hpPush(); const c = clone(x); c.id = uid('s'); L.splice(i + 1, 0, c); save(); hpPaint(); toast('섹션을 복제했습니다.', 'ok'); return; }
    if (act === 'del') { modal('섹션 삭제', `<p>이 섹션을 지울까요? 지운 뒤에도 [되돌리기]로 살릴 수 있습니다.</p>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '삭제', kind: 'red', run: () => { hpPush(); L.splice(i, 1); save(); hpPaint(); toast('섹션을 지웠습니다.', 'ok'); } }]); return; }
    if (act === 'ai') { toast(`${aiOn() ? CL.label() : '기본 설계'}로 이 섹션 글을 다시 쓰고 있습니다…`); hpReSection(x, (site().ai || {}).brief || site().prompt).then(n => { hpPush(); const L2 = secList(HPE.key); const k = L2.indexOf(x); if (k >= 0) L2[k] = n; save(); hpPaint(); toast('섹션 글을 다시 썼습니다. 마음에 들지 않으면 [되돌리기]를 누르세요.', 'ok'); }).catch(e => toast(`다시 쓰지 못했습니다(${e.message}).`, 'warn')); return; }
    if (act === 'bimg') return imgPick(i, 'img', 0);
    if (act === 'more') { UI.sitePage = HPE.key; hpClose(true); if (CUR.tab !== 'site') go('site'); setTimeout(() => ACT['site-edit'] && ACT['site-edit']({ dataset: { v: String(i) } }), 80); }
  }
  const ADD = [['banner', '큰 배너'], ['features', '소개 카드'], ['stats', '숫자 강조'], ['steps', '단계 안내'], ['classes', `${'강좌'} 목록`], ['image', '이미지'], ['video', '동영상'], ['notices', '공지사항'], ['reviews', '수강후기'], ['map', '오시는 길'], ['cta', '문의 · 신청 버튼'], ['plain', '글 상자']];
  function addPick(at) {
    modal('섹션 추가', `<p class="mini">넣을 섹션을 고르세요. 넣은 뒤 글자를 눌러 바로 고칠 수 있습니다.</p><div class="hpe-addg">${ADD.map(([k, l]) => `<button type="button" class="btn" data-mact="${k}">${esc(k === 'classes' ? `${t('cls')} 목록` : l)}</button>`).join('')}</div>`, ADD.map(([k]) => ({ id: k, label: '', run: () => { addSec(k, at); } })).concat([{ id: 'c', label: '취소' }]));
    $$('#modal .mf [data-mact]').forEach(b => { if (!b.textContent.trim()) b.remove(); });
  }
  function addSec(k, at) {
    const n = N(); const D = { banner: { type: 'banner', title: n, sub: '한 문장 소개를 입력하세요.', cta: '자세히 보기' }, features: { type: 'text', variant: 'features', eyebrow: 'ABOUT', title: '이런 점이 좋습니다', cols: [['첫 번째 장점', '설명을 입력하세요'], ['두 번째 장점', '설명을 입력하세요'], ['세 번째 장점', '설명을 입력하세요']] },
      stats: { type: 'text', variant: 'stats', cols: [['숫자', '설명'], ['숫자', '설명'], ['숫자', '설명']] }, steps: { type: 'text', variant: 'steps', title: '이렇게 시작합니다', cols: [['1단계', '설명'], ['2단계', '설명'], ['3단계', '설명']] },
      classes: { type: 'classes', title: `지금 신청할 수 있는 ${t('cls')}` }, image: { type: 'image', title: '사진', alt: '사진 설명' }, video: { type: 'video', title: '소개 영상' }, notices: { type: 'notices', title: '공지사항' }, reviews: { type: 'reviews', title: '수강후기' }, map: { type: 'map', title: '오시는 길' },
      cta: { type: 'text', variant: 'cta', title: '궁금한 점이 있으신가요?', body: '편하게 문의해 주세요.', cta: '문의하기', cols: ((S.settings && S.settings.footer && S.settings.footer.hours) ? [['운영 시간', S.settings.footer.hours]] : []) }, plain: { type: 'text', title: '제목', body: '내용을 입력하세요.' } };
    const x = secFrom(D[k]); if (!x) return; if (k === 'stats') x.data.variant = 'stats'; const L = secList(HPE.key); hpPush(); L.splice(Math.min(at, L.length), 0, x); save(); hpPaint(); toast('섹션을 넣었습니다. 글자를 눌러 고치세요.', 'ok'); }
  function imgPick(si, fld, k) {
    const x = secList(HPE.key)[si]; if (!x) return;
    const w = modal('이미지 바꾸기', `<div class="hpe-imgw"><label class="btn pri">${ic('arrow', 14)} 내 컴퓨터에서 올리기<input type="file" accept="image/*" name="f" hidden></label><p class="mini">200KB 이하로 자동으로 줄여 저장합니다.</p><label class="fl">또는 이미지 주소(https://)<input name="u" inputmode="url" maxlength="400" placeholder="https://…/photo.jpg"></label><p class="mini">주소로 넣은 이미지는 게시된 사이트에서 보입니다(스튜디오 미리보기는 보안상 올린 파일만 표시).</p><label class="fl">이미지 설명(화면 읽기용)<input name="alt" maxlength="80" value="${esc((fld === 'imgs' ? ((x.data.imgs || [])[k] || {}).title : x.data.alt) || x.data.title || '')}"></label></div>`,
      [{ id: 'clr', label: '이미지 빼기', run: () => { hpPush(); setImg(x, fld, k, '', ''); save(); hpPaint(); } }, { id: 'c', label: '취소' }, { id: 'ok', label: '주소로 넣기', kind: 'pri', run: w2 => { const u = fv(w2, 'u'); if (!/^https:\/\/[^\s<>"']+$/i.test(u)) { toast('https:// 로 시작하는 이미지 주소를 넣거나 파일을 올려 주세요.', 'warn'); return false; } hpPush(); setImg(x, fld, k, u, fv(w2, 'alt')); save(); hpPaint(); toast('이미지를 바꿨습니다.', 'ok'); } }]);
    const inp = w.querySelector('[name=f]'); inp.addEventListener('change', () => imgFile(inp.files[0], url => { const alt = fv(w, 'alt'); closeModal(); hpPush(); setImg(x, fld, k, url, alt); save(); hpPaint(); toast('이미지를 바꿨습니다.', 'ok'); }));
  }
  function setImg(x, fld, k, url, alt) { const d = x.data = x.data || {};
    if (fld === 'img') { d.img = url; if (alt) d.alt = alt; if (url && !(+d.dstyle)) d.dstyle = 2; if (!url && +d.dstyle === 2) d.dstyle = 0; return; }
    d.imgs = Array.isArray(d.imgs) ? d.imgs : []; while (d.imgs.length <= k) d.imgs.push({ src: '', title: '', body: '' }); d.imgs[k].src = url; if (alt) d.imgs[k].title = d.imgs[k].title || ''; if (alt) d.alt = alt; }
  function hpClose(quiet) { HPE.on = false; const w = $('#hpe'); if (w) w.remove(); document.body.classList.remove('hpe-open'); if (!quiet) render(); }
  window.hpClose = hpClose;
  ACT['hpe-dev'] = el => { HPE.dev = el.dataset.v === 'mo' ? 'mo' : 'pc'; hpChrome(); hpPaint(); };
  ACT['hpe-undo'] = () => hpUndo(); ACT['hpe-redo'] = () => hpRedo();
  ACT['hpe-close'] = () => hpClose(); ACT['hpe-open'] = el => hpEdit((el && el.dataset && el.dataset.v) || UI.sitePage || 'home');
  ACT['hpe-pub'] = () => { if (typeof smPublish === 'function') smPublish(); else ACT['site-pub'](); if (HPE.on) { hpChrome(); hpPaint(); } };
  ACT['hpai-open'] = () => { if (HPE.on) hpClose(true); const pre = HPE.pre; HPE.pre = null; hpOpen(pre || undefined); };
  document.addEventListener('keydown', e => { if (!HPE.on) return; const k = e.key.toLowerCase(); const tg = e.target; const typing = tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName));
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !typing) { e.preventDefault(); e.shiftKey ? hpRedo() : hpUndo(); }
    else if ((e.ctrlKey || e.metaKey) && k === 'y' && !typing) { e.preventDefault(); hpRedo(); }
    else if (e.key === 'Escape' && !$('#modal') && !typing) hpClose(); });

  /* ── 3) 메뉴 편성(상위 · 하위 2단계) ── */
  const menuType = (m, isSub) => { const l = m.link || ''; if (l.startsWith('learn:')) return 'learn'; if (l.startsWith('url:')) return 'url'; if (l.startsWith('cls:')) return 'cls'; if (l.startsWith('page:')) return 'pagelink'; if (!isSub && m.kind !== 'custom') return 'base'; return 'page'; };
  function findItem(id) { const s = site(); for (const m of s.menus) { if (m.id === id) return { it: m, par: null, list: s.menus }; for (const sb of (m.subs || [])) if (sb.id === id) return { it: sb, par: m, list: m.subs }; } return null; }
  function hpMenus() {
    if (!S.site) { toast('홈페이지가 아직 없습니다.', 'warn'); return; } s2norm(site());
    const w = modal('메뉴 편성', `<div id="hpmBox"></div>`, [{ id: 'pv', label: '화면에서 확인', run: () => { hpEdit('home'); } }, { id: 'ok', label: '완료', kind: 'pri' }], true); w.classList.add('hpm-m'); hpmPaint();
  }
  window.hpMenus = hpMenus;
  /* v36 R3(2-2): 기본 메뉴 이름은 유형별 이름으로 보인다(대학 '클래스' → '교육과정' — 사이트에 보이는 이름과 같게). 칸을 고치면 고친 이름이 저장된다 */
  const hpmN = l => { try { return window.HPS && typeof HPS.menuName === 'function' ? HPS.menuName(l) : l; } catch (e) { return l; } };
  function hpmRow(m, par, i, n) {
    const isSub = !!par; const ty = menuType(m, isSub); const home = !isSub && m.kind === 'home'; const id = esc(m.id);
    const baseNm = !isSub && m.kind !== 'custom' ? ({ home: '홈', class: `${t('cls')} 목록`, book: '교재 · 교구', community: '커뮤니티', notice: '공지사항', board: '게시판' })[m.kind] || '기본' : '';
    const opts = [...(baseNm ? [['base', `기본 · ${baseNm}`]] : [['page', '새 페이지(직접 꾸미기)']]), ['learn', '학습 페이지'], ['cls', `${t('cls')} 하나`], ['url', '외부 주소']];
    const lv = (m.link || '').slice(m.link && m.link.indexOf(':') + 1);
    const second = ty === 'learn' ? `<select data-hpm="route" data-id="${id}" aria-label="${esc(m.l)} 연결할 학습 페이지">${LEARN.map(([k]) => `<option value="${k}" ${lv === k ? 'selected' : ''}>${esc(learnName(k))}</option>`).join('')}</select>`
      : ty === 'cls' ? `<select data-hpm="cls" data-id="${id}" aria-label="${esc(m.l)} 연결할 ${esc(t('cls'))}">${(S.classes || []).map(c => `<option value="${esc(c.id)}" ${lv === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('') || `<option value="">${esc(t('cls'))} 없음</option>`}</select>`
      : ty === 'url' ? `<input data-hpm="url" data-id="${id}" value="${esc(lv)}" placeholder="https://" maxlength="300" aria-label="${esc(m.l)} 외부 주소">` : '';
    const subs = !isSub ? (m.subs || []) : [];
    return `<li class="hpm-i${isSub ? ' sub' : ''}${m.on === false ? ' off' : ''}" data-id="${id}" ${home ? '' : 'draggable="true"'}>
      <div class="hpm-r"><span class="hpm-h" aria-hidden="true" title="끌어서 옮기기">⠿</span>
        <input class="hpm-n" data-hpm="name" data-id="${id}" value="${esc(isSub ? m.l : hpmN(m.l))}" maxlength="20" aria-label="${isSub ? '하위' : '상위'} 메뉴 이름">
        <select data-hpm="type" data-id="${id}" aria-label="${esc(m.l)} 연결 방식" ${home ? 'disabled' : ''}>${opts.map(([k, l]) => `<option value="${k}" ${ty === k || (ty === 'pagelink' && k === 'page') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${second}
        <span class="hpm-bt"><button type="button" class="btn sm ghost" data-hpm="eye" data-id="${id}" ${home ? 'disabled' : ''} aria-pressed="${m.on !== false}" aria-label="${esc(m.l)} ${m.on === false ? '숨김 — 눌러서 보이기' : '보임 — 눌러서 숨기기'}">${m.on === false ? '숨김' : '보임'}</button>
        <button type="button" class="btn sm ghost" data-hpm="up" data-id="${id}" ${home || i === 0 || (!isSub && i === 1 && site().menus[0].kind === 'home') ? 'disabled' : ''} aria-label="${esc(m.l)} 위로">↑</button><button type="button" class="btn sm ghost" data-hpm="down" data-id="${id}" ${home || i === n - 1 ? 'disabled' : ''} aria-label="${esc(m.l)} 아래로">↓</button>
        ${isSub ? `<button type="button" class="btn sm ghost" data-hpm="out" data-id="${id}" aria-label="${esc(m.l)} 상위 메뉴로 꺼내기" title="상위 메뉴로">← 꺼내기</button>` : `<button type="button" class="btn sm ghost" data-hpm="in" data-id="${id}" ${home || i === 0 || subs.length ? 'disabled' : ''} aria-label="${esc(m.l)} 위 메뉴의 하위 메뉴로 넣기" title="하위 메뉴로">→ 하위로</button>`}
        <button type="button" class="btn sm ghost" data-hpm="more" data-id="${id}" ${par ? `data-p="${esc(par.id)}"` : ''} aria-label="${esc(m.l)} 세부 설정(권한 · SEO · 헤더 이미지)">⋯</button>${(!isSub && m.kind !== 'custom') ? '' : `<button type="button" class="btn sm ghost red" data-hpm="del" data-id="${id}" aria-label="${esc(m.l)} 삭제">✕</button>`}</span></div>
      ${!isSub ? `<ol class="hpm-s" data-p="${id}">${subs.map((sb, j) => hpmRow(sb, m, j, subs.length)).join('')}${home ? '' : `<li class="hpm-dz" data-p="${id}"><button type="button" class="btn sm ghost" data-hpm="subadd" data-id="${id}">+ 「${esc(hpmN(m.l))}」 하위 메뉴</button><span class="mini">여기로 끌어 놓으면 하위 메뉴가 됩니다</span></li>`}</ol>` : ''}</li>`;
  }
  function hpmPaint() {
    const box = $('#hpmBox'); if (!box) return; const s = site(); const P = HPE.mprop;
    box.innerHTML = `<div class="hpm-top"><p class="mini">상위 메뉴 아래에 하위 메뉴를 둘 수 있습니다(2단계). ⠿를 끌어 옮기거나 ↑ ↓ · 「→ 하위로」 · 「← 꺼내기」 버튼을 쓰세요. 이름은 칸에서 바로 고칩니다. 바꾼 내용은 바로 저장되고 [게시하기]를 누르면 사이트에 반영됩니다.</p>
      <div class="hpm-ai"><input id="hpmQ" maxlength="300" placeholder="예: 기관 소개 · ${esc(t('cls'))} · 커뮤니티 중심으로, 하위 메뉴까지" aria-label="AI에게 메뉴 요청" value="${esc(HPE.mq || '')}"><button type="button" class="btn sm ai" data-hpm="ai">${ic('spark', 13)} AI로 메뉴 짜기</button><button type="button" class="btn sm ghost" data-hpm="undo" ${HPE.undo.length ? '' : 'disabled'}>↶ 되돌리기</button></div></div>
      ${P ? `<div class="hpm-prop"><b>AI가 제안한 메뉴</b><ol>${P.filter(m => m.on !== false).map(m => `<li>${esc(m.l)}${(m.subs || []).length ? `<ul>${m.subs.map(sb => `<li>${esc(sb.l)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ol><div class="bar2"><button type="button" class="btn sm pri" data-hpm="take">이대로 바꾸기</button><button type="button" class="btn sm ghost" data-hpm="drop">그대로 두기</button></div></div>` : ''}
      <ol class="hpm-l">${s.menus.map((m, i) => hpmRow(m, null, i, s.menus.length)).join('')}<li class="hpm-dz top" data-p=""><button type="button" class="btn sm" data-hpm="topadd">+ 상위 메뉴 추가</button></li></ol>`;
    box.querySelectorAll('[data-hpm]').forEach(el => { const ev = el.tagName === 'BUTTON' ? 'click' : 'change'; el.addEventListener(ev, e => { e.preventDefault(); hpmAct(el.dataset.hpm, el); }); });
    box.querySelectorAll('input.hpm-n').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }));
    dnd(box);
  }
  function toSub(m) { const lk = m.kind !== 'custom' && !m.link ? 'learn:' + (KIND2LEARN[m.kind] || 'home') : (m.link || ''); return { id: m.kind === 'custom' ? m.id : uid('sb'), l: m.l, on: m.on !== false, access: m.access || '공개', targets: m.targets || [], hide: !!m.hide, link: lk, himg: m.himg || '', sections: m.kind === 'custom' ? (m.sections || []) : [], seo: m.seo || { title: '', desc: '', kw: '' } }; }
  function toTop(sb) { return { id: sb.id.startsWith('m') ? sb.id : uid('m'), kind: 'custom', l: sb.l, on: sb.on !== false, access: sb.access || '공개', targets: sb.targets || [], hide: !!sb.hide, link: sb.link || '', himg: sb.himg || '', sections: sb.sections || [], subs: [], subOn: false, seo: sb.seo || { title: '', desc: '', kw: '' } }; }
  const fixSubOn = () => site().menus.forEach(m => { if (Array.isArray(m.subs) && m.subs.length) m.subOn = true; else if (m.kind !== 'custom') { m.subOn = false; } });
  function moveTo(id, parId, beforeId) {
    const s = site(); const src = findItem(id); if (!src) return false; const it = src.it; if (!src.par && it.kind === 'home') { toast('홈 메뉴는 맨 앞에 고정됩니다.', 'warn'); return false; }
    if (parId) { const par = s.menus.find(m => m.id === parId); if (!par || par === it) return false; if (!src.par && (it.subs || []).length) { toast('하위 메뉴가 있는 메뉴는 다른 메뉴 아래로 넣을 수 없습니다(2단계까지). 하위 메뉴를 먼저 꺼내 주세요.', 'warn'); return false; }
      if (par.kind === 'home') { toast('홈 아래에는 하위 메뉴를 둘 수 없습니다.', 'warn'); return false; }
      const mx = typeof s.gnb === 'object' && s.gnb.sub === 'wide' ? 24 : 12; par.subs = par.subs || []; if (src.par !== par && par.subs.length >= mx) { toast(`하위 메뉴는 최대 ${mx}개입니다.`, 'warn'); return false; }
      hpPush(); src.list.splice(src.list.indexOf(it), 1); const nb = src.par ? it : toSub(it); const bi = beforeId ? par.subs.findIndex(x => x.id === beforeId) : -1; par.subs.splice(bi < 0 ? par.subs.length : bi, 0, nb); }
    else { hpPush(); src.list.splice(src.list.indexOf(it), 1); const nt = src.par ? toTop(it) : it; let bi = beforeId ? s.menus.findIndex(x => x.id === beforeId) : -1; if (bi === 0 && s.menus[0].kind === 'home') bi = 1; s.menus.splice(bi < 0 ? s.menus.length : bi, 0, nt); }
    fixSubOn(); save(); return true;
  }
  function hpmAct(a, el) {
    const s = site(); const id = el.dataset.id; const F = id ? findItem(id) : null;
    if (a === 'name') { const v = el.value.trim().slice(0, 20); if (!F || !v || v === F.it.l) { el.value = F ? F.it.l : ''; return; } hpPush(); F.it.l = v; save(); toast('메뉴 이름을 바꿨습니다.', 'ok'); return; }
    if (a === 'type') { if (!F) return; hpPush(); const v = el.value; const it = F.it;
      if (v === 'base') it.link = ''; else if (v === 'page') { it.link = ''; if (!F.par && it.kind !== 'custom') { toast('기본 메뉴는 새 페이지로 바꿀 수 없습니다. 「+ 상위 메뉴 추가」로 새 페이지를 만드세요.', 'warn'); } if (F.par || it.kind === 'custom') { it.sections = it.sections || []; if (!it.sections.length) it.sections.push(S2('text', { title: it.l, body: `${it.l} 안내입니다. 「화면에서 바로 고치기」에서 글을 눌러 내용을 채워 주세요.` })); } }
      else if (v === 'learn') it.link = 'learn:' + (KIND2LEARN[it.kind] || 'shop'); else if (v === 'cls') it.link = (S.classes || [])[0] ? 'cls:' + S.classes[0].id : 'learn:shop'; else if (v === 'url') it.link = 'url:https://';
      save(); hpmPaint(); return; }
    if (a === 'route') { if (!F) return; hpPush(); F.it.link = 'learn:' + el.value; save(); return; }
    if (a === 'cls') { if (!F || !el.value) return; hpPush(); F.it.link = 'cls:' + el.value; save(); return; }
    if (a === 'url') { if (!F) return; const u = el.value.trim(); if (!/^https?:\/\/[^\s<>"']+\.[^\s<>"']+$/i.test(u)) { toast('http:// 또는 https:// 로 시작하는 주소를 넣어 주세요.', 'warn'); return; } hpPush(); F.it.link = 'url:' + u; save(); toast('외부 주소를 연결했습니다.', 'ok'); return; }
    if (a === 'eye') { if (!F) return; hpPush(); F.it.on = F.it.on === false; save(); hpmPaint(); return; }
    if (a === 'up' || a === 'down') { if (!F) return; const L = F.list; const i = L.indexOf(F.it); const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= L.length || (!F.par && L[j].kind === 'home')) return; hpPush(); [L[i], L[j]] = [L[j], L[i]]; save(); hpmPaint(); focusRow(id, a); return; }
    if (a === 'in') { if (!F || F.par) return; const i = s.menus.indexOf(F.it); const prev = s.menus[i - 1]; if (!prev) return; if (moveTo(id, prev.id)) { hpmPaint(); toast(`「${prev.l}」의 하위 메뉴로 넣었습니다.`, 'ok'); const nid = (findItem(id) || {}).it ? id : ((prev.subs || [])[prev.subs.length - 1] || {}).id; focusRow(nid, 'out'); } return; }
    if (a === 'out') { if (!F || !F.par) return; const pi = s.menus.indexOf(F.par); const next = s.menus[pi + 1]; if (moveTo(id, '', next ? next.id : '')) { hpmPaint(); toast('상위 메뉴로 꺼냈습니다.', 'ok'); } return; }
    if (a === 'del') { if (!F) return; if (!F.par && F.it.kind !== 'custom') return; hpPush(); F.list.splice(F.list.indexOf(F.it), 1); fixSubOn(); save(); hpmPaint(); toast(`「${F.it.l}」 메뉴를 지웠습니다. [되돌리기]로 살릴 수 있습니다.`, 'ok'); return; }
    if (a === 'more') { if (!F) return; closeModal(); UI.smT = 'home'; if (CUR.tab !== 'site') go('site'); setTimeout(() => ACT['s2-medit'] && ACT['s2-medit']({ dataset: F.par ? { m: F.par.id, s: F.it.id } : { m: F.it.id } }), 60); return; }
    if (a === 'subadd') { const par = s.menus.find(m => m.id === id); if (!par) return; hpPush(); par.subs = par.subs || []; const sb = { id: uid('sb'), l: '새 하위 메뉴', on: true, access: '공개', targets: [], hide: false, link: '', sections: [S2('text', { title: '새 하위 메뉴', body: '안내 글을 입력하세요.' })], seo: { title: '', desc: '', kw: '' } }; par.subs.push(sb); fixSubOn(); save(); hpmPaint(); const n = $(`#hpmBox .hpm-i[data-id="${sb.id}"] .hpm-n`); if (n) { n.focus(); n.select(); } return; }
    if (a === 'topadd') { hpPush(); const m = { id: uid('m'), kind: 'custom', l: '새 메뉴', on: true, access: '공개', targets: [], hide: false, link: '', sections: [S2('text', { title: '새 메뉴', body: '안내 글을 입력하세요.' })], subs: [], subOn: false, seo: { title: '', desc: '', kw: '' } }; s.menus.push(m); save(); hpmPaint(); const n = $(`#hpmBox .hpm-i[data-id="${m.id}"] .hpm-n`); if (n) { n.focus(); n.select(); } return; }
    if (a === 'undo') { hpUndo(); return; }
    if (a === 'ai') { HPE.mq = ($('#hpmQ') || {}).value || ''; el.disabled = true; el.textContent = '메뉴를 짜는 중…'; hpMenuAI(HPE.mq).then(L => { HPE.mprop = L; hpmPaint(); }).catch(e => { toast(`메뉴를 만들지 못했습니다(${e.message}).`, 'warn'); hpmPaint(); }); return; }
    if (a === 'take') { if (!HPE.mprop) return; hpPush(); s.menus = HPE.mprop; HPE.mprop = null; fixSubOn(); save(); hpmPaint(); toast('AI가 제안한 메뉴로 바꿨습니다. 마음에 들지 않으면 [되돌리기]를 누르세요.', 'ok'); return; }
    if (a === 'drop') { HPE.mprop = null; hpmPaint(); }
  }
  function focusRow(id, a) { const b = id && $(`#hpmBox .hpm-i[data-id="${id}"] [data-hpm="${a}"]`); if (b && !b.disabled) b.focus(); else { const n = id && $(`#hpmBox .hpm-i[data-id="${id}"] .hpm-n`); if (n) n.focus(); } }
  async function hpMenuAI(q) {
    const s = site(); const brief = [q, (s.ai || {}).brief].filter(Boolean).join('\n');
    if (!aiOn()) return menusFrom(hpLocal(brief).menus, s);
    const cur = s.menus.filter(m => m.on !== false).map(m => ({ label: m.l, subs: (m.subs || []).map(sb => sb.l) }));
    const r = await CL.call({ system: SYS() + '\n지금은 메뉴만 설계합니다. {"menus":[...]} 형식의 JSON 객체 하나만 출력합니다. 상위 메뉴 최대 6개, 하위 메뉴 최대 6개씩.', messages: [{ role: 'user', content: `요청: ${brief || '(없음 — 기관 유형에 맞는 기본 메뉴)'}\n지금 메뉴: ${JSON.stringify(cur)}\n기관 정보: ${JSON.stringify(hpOrg())}` }], max: 2500 });
    const j = jsonOf(r.text); const L = menusFrom(j.menus, s); if (!L.some(m => m.on !== false && m.kind !== 'home')) throw new Error('메뉴가 비었습니다'); return L;
  }
  window.hpMenuAI = hpMenuAI;
  function dnd(box) {
    let drag = null;
    box.querySelectorAll('.hpm-i[draggable="true"]').forEach(li => {
      li.addEventListener('dragstart', e => { if (e.target.closest('input,select')) { e.preventDefault(); return; } e.stopPropagation(); drag = li.dataset.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', drag); } catch (x) { } li.classList.add('drag'); });
      li.addEventListener('dragend', () => { li.classList.remove('drag'); box.querySelectorAll('.over').forEach(x => x.classList.remove('over')); });
    });
    box.querySelectorAll('.hpm-i, .hpm-dz').forEach(t => {
      t.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); box.querySelectorAll('.over').forEach(x => x !== t && x.classList.remove('over')); t.classList.add('over'); });
      t.addEventListener('dragleave', e => { e.stopPropagation(); t.classList.remove('over'); });
      t.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); t.classList.remove('over'); const id = drag || (e.dataTransfer && e.dataTransfer.getData('text/plain')); drag = null; if (!id || id === t.dataset.id) return;
        let ok; if (t.classList.contains('hpm-dz')) ok = moveTo(id, t.dataset.p || '', '');
        else { const T = findItem(t.dataset.id); if (!T) return; ok = moveTo(id, T.par ? T.par.id : '', t.dataset.id); }
        if (ok) { hpmPaint(); toast('메뉴를 옮겼습니다.', 'ok'); } });
    });
  }
  ACT['hpm-open'] = () => { if (HPE.on) hpClose(true); hpMenus(); };

  /* ── 사이트 화면: 첫 진입 버튼 · 빈 상태 안내 ── */
  AFTER.push(() => {
    try { if (CUR.tab !== 'site' || UI.smT === 'learn' || !S || !S.org) return; const bar = $('.sgm-bar'); if (!bar || $('.hpai-bar')) return;
      const s = S.site || {}; const fresh = !s.ai || s.blank;
      bar.insertAdjacentHTML('afterend', `<div class="hpai-bar${fresh ? ' fresh' : ''}"><div class="hpai-bt"><b>${fresh ? '우리 기관 홈페이지, AI로 바로 만드세요' : '홈페이지 고치기'}</b><p>${fresh ? `${s.blank ? '지금은 기본 문구가 들어 있습니다. ' : ''}원하는 내용을 말하거나 참고할 사이트 주소를 넣으면 ${esc(S.org.name)}에 맞는 첫 화면과 메뉴를 만들어 드립니다. 만든 화면에서 글자를 눌러 바로 고칠 수 있습니다.` : `AI로 만든 홈페이지${s.ai && s.ai.at ? ` · ${esc(s.ai.at)}` : ''}. 화면에서 글자를 눌러 바로 고치거나 메뉴를 편성하세요.`}</p></div>
        <div class="hpai-bb"><button type="button" class="btn ai${fresh ? ' pri2' : ''}" data-act="hpai-open">${ic('spark', 15)} AI로 홈페이지 만들기</button><button type="button" class="btn" data-act="hpe-open">화면에서 바로 고치기</button><button type="button" class="btn" data-act="hpm-open">메뉴 편성</button></div></div>`);
    } catch (e) { console.error('hpai bar', e); } });

  /* ── 빈 스튜디오: 다른 기관의 예시 문구 대신 우리 기관 기본 문구 ── */
  if (typeof emptyOut === 'function') { const base = emptyOut; emptyOut = (...a) => { const r = base(...a); try { if (S.site) { const ns = hpMake(hpLocal(''), S.site, { by: '기본 설계' }); ns.blank = true; delete ns.ai; ns.published = false; S.site = ns; save(); } } catch (e) { console.error('hpai empty', e); } return r; }; }

  /* v25.1 잔여 QA: 샘플 · 예전 기관의 홈페이지 첫 화면이 템플릿 예시 문구('PARTNER ACADEMY · 파트너 아카데미와 함께')로 남아 기관과 맞지 않던 문제
     — 사용자가 고치지 않은(템플릿과 같은) 첫 화면 문구만 우리 기관 기본 문구로 한 번 바꾼다. 고친 문구는 건드리지 않는다. */
  AFTER.unshift(() => { try { if (!S || !S.site || S.site.v251 || !Array.isArray(S.site.sections)) return; S.site.v251 = 1;
    const tp = (typeof TPL !== 'undefined' ? TPL : []).find(t => t.id === S.site.tpl); const def = tp && tp.build ? (tp.build() || []).find(x => x.type === 'banner') : null;
    const bn = S.site.sections.find(x => x.type === 'banner'); const SAMPLE = /파트너 아카데미|한진세이버|나이스평가정보|다산콜재단|PARTNER ACADEMY/;
    if (!bn || !bn.data || !((def && def.data && bn.data.title === def.data.title) || SAMPLE.test([bn.data.eyebrow, bn.data.title, bn.data.sub].join(' ')))) { save(); return; }
    const ns = hpMake(hpLocal(''), S.site, { by: '기본 설계' }); const nb = (ns.sections || []).find(x => x.type === 'banner'); if (!nb || !nb.data) { save(); return; }
    ['eyebrow', 'title', 'sub', 'cta', 'cta2'].forEach(k => { if (nb.data[k] !== undefined) bn.data[k] = nb.data[k]; }); save(); } catch (e) { console.error('hpai v251', e); } });

  /* ── 4) 시작 가이드: 사이트 게시 단계 → 「AI로 홈페이지 만들기」 ── */
  if (typeof BLD_STEPS !== 'undefined') { const st = BLD_STEPS.find(s => s.id === 'site'); if (st) { try { st.d = '「AI로 홈페이지 만들기」로 만들고 한 번에 게시'; } catch (e) { } } }
  if (typeof bQ === 'function') { const base = bQ; bQ = id => id === 'site' || id === 'lsite' ? ['AI로 홈페이지 만들어줘', '홈페이지 게시해줘'] : base(id); }
  if (typeof bGuideText === 'function') { const base = bGuideText; bGuideText = id => id === 'site' || id === 'lsite' ? `「AI로 홈페이지 만들기」를 누르고 원하는 내용을 말하거나 참고할 사이트 주소를 넣으면, 기관 이름 · 공개 ${t('cls')}에 맞춰 첫 화면과 메뉴(상위 · 하위)를 만들어 드립니다.\n만든 화면에서 글자를 눌러 바로 고친 뒤 "홈페이지 게시해줘"라고 하시거나 [게시하기]를 누르세요.` : base(id); }
  /* 가이드 카드의 '화면 열기'가 사이트 단계면 만들기 창도 함께 */
  if (typeof answer === 'function') { const base = answer; answer = (q, ...r) => { const s = String(q || '');
    const url = (s.match(/https?:\/\/[^\s"'<>]+/) || [''])[0]; const want = /(AI로\s*홈페이지|홈페이지.*(벤치마크|비슷하게|참고해)|(벤치마크|참고).*(홈페이지|사이트).*(만들|구성))/.test(s) || (url && /(홈페이지|사이트)/.test(s) && /(만들|비슷|참고|벤치마크)/.test(s));
    /* 대화에서 창을 저절로 띄우지 않고(사람이 누를 때만) 버튼으로 안내 — 사이트 화면으로 이동 */
    if (want && !/게시/.test(s)) { HPE.pre = { brief: s.replace(url, '').replace(/AI로\s*홈페이지\s*만들어\s*줘?/, '').trim(), url }; return { text: `사이트 화면을 열었습니다. 아래 [AI로 홈페이지 만들기]를 누르고 원하는 내용을 적거나 참고할 사이트 주소를 넣으면 ${S.org.name}에 맞는 첫 화면과 메뉴를 만들어 드립니다. 구성과 분위기만 참고하고 글 · 이미지는 새로 만듭니다.`, nav: 'site', html: `<div class="bqs"><button type="button" class="chip done" data-act="hpai-open">${ic('spark', 12)} AI로 홈페이지 만들기</button></div>` }; }
    if (/메뉴/.test(s) && /(짜|편성|구성|만들)/.test(s) && /(홈페이지|상위|하위|사이트)/.test(s)) return { text: '사이트 화면을 열었습니다. [메뉴 편성]을 누르고 「AI로 메뉴 짜기」를 누르면 상위 · 하위 메뉴를 제안해 드립니다.', nav: 'site', html: '<div class="bqs"><button type="button" class="chip done" data-act="hpm-open">메뉴 편성 열기</button></div>' };
    return base(q, ...r); }; }

  /* ── AI SAM 도구: build_homepage ── */
  if (typeof AG_TOOLS !== 'undefined') {
    AG_TOOLS.push({ name: 'build_homepage', description: 'AI로 홈페이지(첫 화면 섹션 · 상위/하위 2단계 메뉴 · 색 · 분위기)를 기관 이름 · 공개 강좌에 맞춰 새로 만듭니다. brief에는 사용자가 원하는 내용(대상 · 분위기 · 꼭 넣을 섹션)을, benchmark_url에는 참고할 사이트 주소를 넣습니다. 벤치마크는 구성과 분위기만 참고하고 글 · 이미지 · 로고는 새로 만듭니다. 계획 카드를 만들고, 승인하면 만들어 바로 적용(되돌리기 가능)한 뒤 「화면에서 바로 고치기」를 엽니다. 홈페이지 만들기 · 꾸미기 · 리뉴얼 · 벤치마크 · 메뉴 구성 요청은 run_studio_command 대신 이 도구를 쓰세요.', input_schema: { type: 'object', properties: { brief: { type: 'string', description: '원하는 홈페이지 설명(사용자 말 그대로 + 정리)' }, benchmark_url: { type: 'string', description: '참고할 사이트 주소(선택, https://)' }, tone: { type: 'string', description: '신뢰 · 따뜻 · 모던 · 친근(선택)' }, sections: { type: 'array', items: { type: 'string' }, description: '꼭 넣을 섹션(예: 강좌 소개, 수강 방법, 후기, 오시는 길)' } } } });
    const base = agRun; agRun = (name, x, ctx) => { if (name !== 'build_homepage') return base(name, x, ctx); x = x || {};
      let url = ''; try { url = benchURL(x.benchmark_url); } catch (e) { return { ok: false, 이유: e.message }; }
      const o = { brief: str(x.brief, 1500), url, tone: TONES[x.tone] ? x.tone : '', sections: Array.isArray(x.sections) ? x.sections.slice(0, 10) : [] };
      agCard(ctx, { title: 'AI로 홈페이지 만들기', text: `${S.org.name} 홈페이지 첫 화면과 메뉴(상위 · 하위)를 ${url ? `참고 사이트(${url})의 구성과 분위기를 살펴` : '말씀하신 내용으로'} 새로 만들겠습니다. 기관 이름 · 공개 ${t('cls')}에 맞춰 글을 새로 쓰고, 다른 사이트의 글 · 이미지 · 로고는 쓰지 않습니다. 승인하시면 만들어 적용하고(되돌리기 가능) 「화면에서 바로 고치기」를 엽니다. 게시는 확인하신 뒤에 합니다.`, steps: [o.brief ? `설명: ${o.brief.slice(0, 80)}` : '설명: 기관 유형 기본 구성', url ? `참고 사이트: ${url} (구성 · 분위기만)` : '참고 사이트: 없음', `${o.tone ? `분위기: ${o.tone} · ` : ''}섹션 4~8개 · 메뉴 2단계`], cta: '만들어 적용하기' },
        () => { setTimeout(() => { if (CUR.tab !== 'site') go('site'); hpRun(o, { apply: true }); }, 60); return '홈페이지를 만들고 있습니다. 잠시 후 적용되고 「화면에서 바로 고치기」가 열립니다.'; }, 'site');
      return { ok: true, 승인필요: true, 결과: '홈페이지 만들기 계획 카드를 만들었습니다' }; };
    const HP_RULE = '\n홈페이지: 홈페이지 만들기 · 꾸미기 · 리뉴얼 · 다른 사이트 참고(벤치마크) · 메뉴 구성 요청은 build_homepage로 계획 카드를 만듭니다(설명은 brief, 주소는 benchmark_url). 다른 사이트의 글 · 이미지는 쓰지 않고 구성과 분위기만 참고한다고 안내합니다. 이미 만든 홈페이지의 글자 수정은 사이트 화면의 「화면에서 바로 고치기」를 안내합니다.';
    const cb = CL.call; CL.call = function (o) { try { if (o && typeof o.system === 'string' && Array.isArray(o.tools) && o.tools.some(t2 => t2.name === 'build_homepage')) o = { ...o, system: o.system + HP_RULE }; } catch (e) { } return cb.call(CL, o); };
  }
  /* ── v34.5 FZ(FIXLIST 19 · 28): 검색 제목 · 설명 자동 갱신 ──
     자동으로 채운 값은 S.settings.seo.auto[k]에 그 값을 함께 적어 둔다(출처 표시). 지금 값이 auto와 같거나 비어 있으면 '자동'으로 보고,
     템플릿 · AI 만들기 · 시안 적용 · 말로 고치기로 사이트가 바뀔 때마다(저장 시점) 새 사이트 기준(s.aiSeo, 없으면 첫 화면 설명)으로 다시 맞춘다.
     운영자가 설정 · 메뉴 · AI 제안 [적용]으로 쓴 값은 auto와 달라지므로 그대로 둔다(그 칸의 auto 표시는 지운다). */
  function seoWant(s) { const a = (s && s.aiSeo) || {}; const bn = (Array.isArray(s && s.sections) ? s.sections : []).find(x => x && x.type === 'banner' && !x.hide);
    const sub = String((bn && bn.data && bn.data.sub) || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return { title: String(a.title || '').slice(0, 60), desc: String(a.desc || (sub.length >= 20 ? sub : '')).slice(0, 160), kw: String(a.kw || '').slice(0, 200) }; }
  function seoSync(s, st) { st = st || S; s = s || (st && st.site); if (!s || !st || !st.settings) return false; const se = st.settings.seo = st.settings.seo || {};
    const fresh = !(se.auto && typeof se.auto === 'object'); const au = se.auto = fresh ? {} : se.auto; const w = seoWant(s); let ch = false;
    /* 처음 한 번(이전 저장본): 지금 사이트의 aiSeo를 그대로 복사해 둔 값은 자동으로 본다 */
    if (fresh) ['title', 'desc', 'kw'].forEach(k => { if (se[k] && s.aiSeo && se[k] === s.aiSeo[k]) au[k] = se[k]; });
    ['title', 'desc', 'kw'].forEach(k => { const cur = String(se[k] || ''); if (cur && cur !== String(au[k] || '')) { if (k in au) { delete au[k]; ch = true; } return; }
      const v = w[k] || ''; if (cur !== v) { se[k] = v; ch = true; } if (v) { if (au[k] !== v) { au[k] = v; ch = true; } } else if (k in au) { delete au[k]; ch = true; } });
    return ch; }
  { const b0 = Store.set; Store.set = function (v) { try { if (v && v === S && v.site) seoSync(v.site, v); } catch (e) { console.error('seoSync', e); } return b0.apply(this, arguments); }; }
  window.HPSEO = { sync: seoSync, want: seoWant };
  window.hpLocal = hpLocal; window.hpMake = hpMake; window.hpGenerate = hpGenerate; window.hpBenchURL = benchURL;
  if (typeof COVER !== 'undefined') COVER.push(['[신규] AI로 홈페이지 만들기(설명 · 참고 사이트) · 화면에서 바로 고치기 · 메뉴 편성(상위 · 하위)', 'site', '']);
})();
