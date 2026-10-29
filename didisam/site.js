/* 디디쌤 스튜디오 — AI 홈페이지 빌더
   프롬프트 한 줄 → 디디쌤 섹션 12종으로 페이지 구성 → 섹션 편집 · 순서 · AI 문구 다듬기 → 미리보기 → 게시 */
'use strict';
const SEC = {
  banner: { n: '배너', max: 99 }, slideBanner: { n: '슬라이드 배너', max: 4 }, text: { n: '텍스트', max: 99 }, image: { n: '이미지', max: 99 },
  slideImage: { n: '슬라이드 이미지', max: 20 }, classes: { n: '클래스', max: 12 }, video: { n: '동영상', max: 4 }, map: { n: '지도 · 연락처', max: 99 },
  notices: { n: '공지사항', max: 5 }, reviews: { n: '수강후기', max: 99 }, books: { n: '교재 · 교구', max: 12 }, code: { n: '코드 블럭', max: 99 }
};
const HERO = {
  corp: ['필요한 교육을, 필요한 때에', '직무 · 법정의무교육부터 리더십까지 한 곳에서 이수하고 기록합니다.', '교육과정 보기'],
  univ: ['AI 시대의 역량, 여기서 시작합니다', '교과 · 비교과 학습과 디지털 배지를 한 곳에서 관리하세요.', '학습 시작하기'],
  k12: ['우리 아이 성적, 데이터로 관리합니다', '반별 수업 · 출결 · 온라인 보강까지, 보호자 앱으로 매일 확인하세요.', '상담 신청하기'],
  adult: ['실무에 바로 쓰는 강좌', '현업 강사의 단계별 실습으로 오늘 배운 것을 내일 바로 씁니다.', '강좌 둘러보기'],
  lifelong: ['배움에는 끝이 없습니다', '지역과 함께하는 평생교육 강좌, 온라인과 오프라인으로 만나 보세요.', '강좌 신청하기'],
  voc: ['취업까지 이어지는 훈련', '국민내일배움카드 과정부터 사업주훈련까지, 수료 후 취업을 함께 준비합니다.', '훈련과정 보기']
};
const TONES = { 신뢰: { r: '6px', f: 700 }, 따뜻: { r: '20px', f: 600 }, 모던: { r: '0px', f: 800 }, 친근: { r: '16px', f: 600 } };
function SITEGEN(prompt = '') {
  const ty = S.org.type, h = HERO[ty]; const tone = Object.keys(TONES).find(k => prompt.includes(k)) || '신뢰';
  const color = /파랑|블루|blue/i.test(prompt) ? '#2563EB' : /보라|퍼플/.test(prompt) ? '#7C3AED' : /주황|오렌지/.test(prompt) ? '#EA580C' : /네이비|남색/.test(prompt) ? '#1E3A8A' : '#00C53B';
  const focus = (prompt.match(/([가-힣A-Za-z0-9 ]{2,20})\s*(을|를)?\s*(강조|중심|위주)/) || [])[1];
  const S2 = (type, data) => ({ id: uid('s'), type, data });
  const secs = [
    S2('banner', { title: focus ? `${focus.trim()}, ${S.org.name}에서` : h[0], sub: h[1], cta: h[2], style: 'hero' }),
    S2('text', { title: `${S.org.name}은(는) 이렇게 가르칩니다`, body: { corp: '직무별 맞춤 과정과 법정의무교육을 온라인으로 운영하고, 부서별 이수 현황을 자동으로 관리합니다.', univ: '수업과 비교과 활동의 학습 기록을 한 곳에 모으고, 이수한 역량은 디지털 배지로 증명합니다.', k12: '반별 맞춤 수업과 매 회차 출결 · 테스트 기록으로 성적 변화를 보호자와 함께 확인합니다.', adult: '짧은 강의와 실습 과제로 구성해, 바쁜 일정 속에서도 끝까지 완주할 수 있게 돕습니다.', lifelong: '누구나 배우고 나눌 수 있도록 생활 · 직업 · 인문 강좌를 지역 가까이에서 운영합니다.', voc: '현장 실무 중심의 훈련과 출결 · 평가 관리로 수료와 취업을 함께 준비합니다.' }[ty], cols: [['맞춤 커리큘럼', `${t('learner')} 수준에 맞춘 단계별 구성`], ['꼼꼼한 관리', '진도 · 출결 · 평가를 한눈에'], ['수료 후까지', ty === 'voc' ? '취업 연계 상담' : '수료증 · 배지 발급']] }),
    S2('classes', { title: `지금 모집 중인 ${t('cls')}`, ids: S.classes.filter(c => c.open === '전체').slice(0, 4).map(c => c.id), layout: 'grid' }),
    ...(S.books.length ? [S2('books', { title: '교재 · 교구', ids: S.books.map(b => b.id) })] : []),
    S2('reviews', { title: '수강후기', note: '수강후기 게시판의 실제 후기가 표시됩니다.' }),
    S2('notices', { title: '공지사항', n: 3 }),
    S2('map', { title: '오시는 길 · 문의', addr: S.settings.footer.addr || '주소를 입력하세요', tel: S.settings.footer.tel || '연락처를 입력하세요', hours: ty === 'k12' ? '평일 14:00 ~ 22:00' : '평일 09:00 ~ 18:00' })
  ];
  return { color, tone, prompt, sections: secs, menus: [['홈', true], ['클래스', true], ['교재/교구', ty !== 'corp' && ty !== 'univ'], ['커뮤니티', true], ['공지사항', true], ['게시판', ty !== 'corp']].map(([l, on]) => ({ l, on, access: S.settings.siteOpen === 'private' ? '지정 회원' : '공개' })), published: S.site?.published || false, at: nowStr() };
}
const site = () => S.site || (S.site = SITEGEN(''));
VIEWS.site = () => {
  const s = site(); const dev = UI.dev || 'pc';
  const warn = ['company', 'ceo', 'biz', 'mail', 'addr', 'tel'].filter(k => !S.settings.footer[k]);
  return head(`AI 홈페이지 빌더`, `${esc(t('site'))} · 섹션 12종 · 상단 메뉴 · 푸터 ${guideRef('features/homepage-design.md')}`, `<button class="btn" data-act="site-export">HTML 내보내기</button><button class="btn" data-act="site-open">새 창 미리보기</button><button class="btn pri" data-act="site-pub">${s.published ? '다시 게시' : '게시하기'}</button>`) +
    `<div class="builder"><div class="bpanel">
      <div class="card"><div class="ch"><b>✦ AI로 만들기</b></div><textarea id="sitePrompt" rows="3" maxlength="300" placeholder="예: 신뢰감 있는 분위기, 블루 톤, 겨울방학 특강을 강조">${esc(UI.sitePrompt || s.prompt || '')}</textarea><div class="bar2"><button class="btn pri sm" data-act="site-gen">페이지 생성</button><small class="mini">기존 섹션을 새 초안으로 바꿉니다</small></div></div>
      <div class="card"><div class="ch"><b>브랜드 컬러</b></div><div class="bar2"><input type="color" value="${esc(s.color)}" data-chg="site-color" aria-label="브랜드 컬러"><code>${esc(s.color)}</code><small class="mini">흰 글자 대비가 낮으면 자동으로 어두운 글자를 씁니다</small></div></div>
      <div class="card"><div class="ch"><b>상단 메뉴</b><small>기본 메뉴는 삭제 대신 숨김</small></div>${s.menus.map((m, i) => `<div class="row"><label class="ckl"><input type="checkbox" ${m.on ? 'checked' : ''} data-chg="site-menu" data-v="${i}"> ${esc(m.l)}</label><select data-chg="site-acc" data-v="${i}" aria-label="${esc(m.l)} 접근 권한">${['공개', '비공개', '지정 회원'].map(v => `<option ${m.access === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`).join('')}</div>
      <div class="card"><div class="ch"><b>섹션</b><select data-chg="site-add" aria-label="섹션 추가"><option value="">+ 섹션 추가</option>${Object.entries(SEC).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join('')}</select></div>
        <ul class="slist">${s.sections.map((x, i) => `<li><b>${esc(SEC[x.type].n)}</b><small>${esc((x.data.title || '').slice(0, 22))}</small><span class="sp"></span><button class="btn sm ghost ai" data-act="site-ai" data-v="${i}" title="AI 문구 다듬기">✦</button><button class="btn sm ghost" data-act="site-edit" data-v="${i}">편집</button><button class="btn sm ghost" data-act="site-mv" data-v="${i}" data-d="-1" aria-label="위로">↑</button><button class="btn sm ghost" data-act="site-mv" data-v="${i}" data-d="1" aria-label="아래로">↓</button><button class="btn sm ghost" data-act="site-del" data-v="${i}" aria-label="삭제">✕</button></li>`).join('')}</ul></div>
      ${warn.length ? `<div class="warn">푸터 사업자 정보 ${warn.length}개가 비어 있습니다. PG 심사 · 통신판매업 표시에 필요합니다. <a href="#" data-act="site-footer">입력하기</a></div>` : `<div class="okbox">푸터 사업자 정보 6종 입력 완료</div>`}
    </div>
    <div class="bprev"><div class="bar2"><div class="seg"><button class="${dev === 'pc' ? 'on' : ''}" data-act="dev" data-v="pc">PC</button><button class="${dev === 'mo' ? 'on' : ''}" data-act="dev" data-v="mo">모바일</button></div><small class="mini">${s.published ? `게시됨 · ${esc(S.org.domain)}` : '게시 전 초안'}</small></div>
      <iframe id="sitePv" class="${dev}" title="홈페이지 미리보기" sandbox="allow-same-origin"></iframe></div></div>`;
};
AFTER.push(cur => { if (cur !== 'site') return; const f = $('#sitePv'); if (f) f.srcdoc = siteHTML(site()); if (UI.sitePrompt && !UI.siteGenDone) { UI.siteGenDone = true; ACT['site-gen'](); } });
ACT.dev = el => { UI.dev = el.dataset.v; render(); };
ACT['site-gen'] = () => { const p = ($('#sitePrompt')?.value || UI.sitePrompt || '').trim(); const pub = S.site?.published; S.site = SITEGEN(p); S.site.published = pub; UI.sitePrompt = ''; UI.siteGenDone = false; S.ai.usage++; logAudit('AI 홈페이지 생성'); save(); render(); toast(`섹션 ${S.site.sections.length}개로 페이지를 만들었습니다.`, 'ok'); };
ACT['site-color'] = el => { site().color = el.value; save(); render(); };
ACT['site-menu'] = el => { site().menus[+el.dataset.v].on = el.checked; save(); render(); };
ACT['site-acc'] = el => { site().menus[+el.dataset.v].access = el.value; save(); render(); };
ACT['site-add'] = el => { const k = el.value; if (!k) return; const s = site(); const cnt = s.sections.filter(x => x.type === k).length; if (['slideBanner', 'video'].includes(k) && cnt >= 4) { toast(`${SEC[k].n}은(는) 최대 4개입니다.`, 'warn'); return; }
  const d = { banner: { title: '새 배너', sub: '설명을 입력하세요', cta: '자세히 보기' }, slideBanner: { title: '슬라이드 배너', slides: ['첫 번째 슬라이드', '두 번째 슬라이드'], sec: 5 }, text: { title: '제목', body: '내용을 입력하세요' }, image: { title: '이미지', alt: '이미지 설명' }, slideImage: { title: '슬라이드 이미지', count: 3 }, classes: { title: t('cls'), ids: S.classes.slice(0, 4).map(c => c.id), layout: 'grid' }, video: { title: '소개 영상', url: '' }, map: { title: '오시는 길', addr: S.settings.footer.addr, tel: S.settings.footer.tel, hours: '' }, notices: { title: '공지사항', n: 3 }, reviews: { title: '수강후기' }, books: { title: '교재 · 교구', ids: S.books.map(b => b.id) }, code: { title: '코드 블럭', html: '' } }[k];
  s.sections.push({ id: uid('s'), type: k, data: d }); save(); render(); };
ACT['site-mv'] = el => { const a = site().sections, i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(); render(); };
ACT['site-del'] = el => { site().sections.splice(+el.dataset.v, 1); save(); render(); };
ACT['site-ai'] = el => { const x = site().sections[+el.dataset.v]; modal('✦ AI 문구 다듬기', `<p class="mini">${esc(SEC[x.type].n)} — ${esc(x.data.title || '')}</p><p>어떤 방향으로 다듬을까요?</p>`, ['더 짧게', '신뢰감 있게', '친근하게', '숫자로 구체적으로', '행동 유도 강화'].map(s => ({ id: s, label: s, run: () => { rewrite(x, s); S.ai.usage++; save(); render(); toast(`「${s}」로 다듬었습니다.`, 'ok'); } }))); };
function rewrite(x, how) { const d = x.data; const short = s => (s || '').split(/[.,]/)[0].trim();
  if (how === '더 짧게') { d.title = short(d.title).slice(0, 18); if (d.sub) d.sub = short(d.sub) + '.'; if (typeof d.body === 'string') d.body = short(d.body) + '.'; }
  if (how === '신뢰감 있게') { if (d.sub) d.sub = d.sub.replace(/\.?$/, '') + ' — 체계적인 관리와 기록으로 결과를 확인하세요.'; d.title = (d.title || '').replace(/[!~]/g, ''); }
  if (how === '친근하게') { if (d.sub) d.sub = d.sub.replace(/합니다\.?$/, '해요.').replace(/하세요\.?$/, '해 보세요!'); if (typeof d.body === 'string') d.body = d.body.replace(/합니다\./g, '해요.'); }
  if (how === '숫자로 구체적으로') { const n = S.members.length, c = S.classes.length; if (d.sub) d.sub = `${c}개 ${t('cls')} · ${n}명의 ${t('learner')}이 함께합니다. ` + d.sub; }
  if (how === '행동 유도 강화') { d.cta = d.cta ? d.cta.replace(/보기|하기/, '') + ' 지금 시작하기' : '지금 시작하기'; } }
ACT['site-edit'] = el => { const i = +el.dataset.v, x = site().sections[i], d = x.data; const F = (k, l, ta) => ta ? `<label class="fl">${l}<textarea name="${k}" rows="4">${esc(d[k] || '')}</textarea></label>` : `<label class="fl">${l}<input name="${k}" value="${esc(d[k] || '')}" maxlength="120"></label>`;
  let body = F('title', '제목'); const k = x.type;
  if (['banner'].includes(k)) body += F('sub', '설명') + F('cta', '버튼 문구');
  if (k === 'text') body += `<label class="fl">내용<textarea name="body" rows="4">${esc(typeof d.body === 'string' ? d.body : '')}</textarea></label>`;
  if (k === 'slideBanner') body += `<label class="fl">슬라이드 문구(줄마다 1개, 최대 4개)<textarea name="slides" rows="4">${esc((d.slides || []).join('\n'))}</textarea></label><label class="fl">넘김 시간(초)<input name="sec" type="number" min="2" max="15" value="${d.sec || 5}"></label>`;
  if (['classes', 'books'].includes(k)) { const L = k === 'classes' ? S.classes.filter(c => c.open === '전체') : S.books.filter(b => b.open === '전체'); body += `<p class="mini">전체 회원에게 공개된 항목만 넣을 수 있습니다(고정형 4개 · 슬라이드형 12개).</p><div class="chk">${L.map(c => `<label><input type="checkbox" name="ids" value="${c.id}" ${(d.ids || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div>${k === 'classes' ? `<label class="fl">배치<select name="layout"><option value="grid">고정형</option><option value="slide" ${d.layout === 'slide' ? 'selected' : ''}>슬라이드형</option></select></label>` : ''}`; }
  if (k === 'video') body += F('url', 'YouTube · Vimeo 주소');
  if (k === 'map') body += F('addr', '주소') + F('tel', '연락처') + F('hours', '운영 시간');
  if (k === 'image' || k === 'slideImage') body += F('alt', '대체 텍스트(접근성)') + '<p class="mini">이미지는 실제 운영 시 업로드합니다(데모: 자리 표시).</p>';
  if (k === 'code') body += `<label class="fl">HTML (스크립트 · 이벤트 속성은 게시할 때 제거됩니다)<textarea name="html" rows="5">${esc(d.html || '')}</textarea></label>`;
  modal(`${SEC[k].n} 편집`, body, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { ['title', 'sub', 'cta', 'body', 'url', 'addr', 'tel', 'hours', 'alt', 'html', 'layout', 'sec'].forEach(f => { if (w.querySelector(`[name=${f}]`)) d[f] = fv(w, f); }); if (w.querySelector('[name=slides]')) d.slides = fv(w, 'slides').split('\n').filter(Boolean).slice(0, 4); if (w.querySelector('[name=ids]')) { const ids = $$('[name=ids]:checked', w).map(x => x.value); d.ids = ids.slice(0, d.layout === 'slide' ? 12 : 4); if (ids.length > d.ids.length) toast(`최대 ${d.ids.length}개까지 표시됩니다.`, 'warn'); } save(); render(); } }]); };
ACT['site-footer'] = () => { UI.settings = 'home'; go('settings'); };
ACT['site-pub'] = () => { const s = site(); s.published = true; s.at = nowStr(); logAudit('홈페이지 게시'); save(); render(); toast(`게시했습니다 — ${S.org.domain} (데모)`, 'ok'); };
ACT['site-open'] = () => { const u = URL.createObjectURL(new Blob([siteHTML(site(), true)], { type: 'text/html' })); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); };
ACT['site-export'] = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([siteHTML(site(), true)], { type: 'text/html' })); a.download = `${S.org.name}_homepage.html`; a.click(); };

/* 코드 블럭 정리: 스크립트 · 이벤트 속성 · javascript: 링크 제거 */
function cleanHTML(h) { const d = new DOMParser().parseFromString(`<div>${h || ''}</div>`, 'text/html'); d.querySelectorAll('script,iframe,object,embed,link,meta,style,form').forEach(n => n.remove()); d.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value) || a.name === 'srcdoc') n.removeAttribute(a.name); })); return d.body.firstChild.innerHTML; }
function lum(hex) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function siteHTML(s, full) {
  const tone = TONES[s.tone] || TONES.신뢰; const on = lum(s.color) > .35 ? '#1a1a1a' : '#fff'; const ft = S.settings.footer;
  const card = (title, sub, meta) => `<div class="cd"><div class="th"></div><b>${esc(title)}</b><small>${esc(sub)}</small>${meta ? `<em>${esc(meta)}</em>` : ''}</div>`;
  const ytId = u => (String(u).match(/(?:youtu\.be\/|v=)([\w-]{11})/) || [])[1];
  const sec = x => { const d = x.data; switch (x.type) {
    case 'banner': return `<section class="hero"><h1>${esc(d.title)}</h1><p>${esc(d.sub)}</p>${d.cta ? `<a class="cta" href="#">${esc(d.cta)}</a>` : ''}</section>`;
    case 'slideBanner': return `<section class="hero sl"><div class="track">${(d.slides || []).map(t => `<div><h2>${esc(t)}</h2></div>`).join('')}</div></section>`;
    case 'text': return `<section class="wrap"><h2>${esc(d.title)}</h2><p class="lead">${esc(typeof d.body === 'string' ? d.body : '')}</p>${d.cols ? `<div class="cols">${d.cols.map(([a, b]) => `<div><b>${esc(a)}</b><small>${esc(b)}</small></div>`).join('')}</div>` : ''}</section>`;
    case 'image': return `<section class="wrap"><h2>${esc(d.title)}</h2><div class="ph" role="img" aria-label="${esc(d.alt || '')}">이미지</div></section>`;
    case 'slideImage': return `<section class="wrap"><h2>${esc(d.title)}</h2><div class="row">${Array.from({ length: +d.count || 3 }, () => '<div class="ph sm">이미지</div>').join('')}</div></section>`;
    case 'classes': return `<section class="wrap"><h2>${esc(d.title)}</h2><div class="grid">${(d.ids || []).map(id => C(id)).filter(Boolean).map(c => card(c.name, `${KIND[c.kind]} · ${c.start} 개강`, c.price ? won(c.price) : '무료')).join('') || '<p class="mini">공개된 항목이 없습니다.</p>'}</div></section>`;
    case 'books': return `<section class="wrap"><h2>${esc(d.title)}</h2><div class="grid">${(d.ids || []).map(id => S.books.find(b => b.id === id)).filter(Boolean).map(b => card(b.name, b.kind, won(b.price))).join('')}</div></section>`;
    case 'video': { const id = ytId(d.url); return `<section class="wrap"><h2>${esc(d.title)}</h2>${id ? `<div class="vid"><img alt="${esc(d.title)}" src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg"><span>▶</span></div>` : '<div class="ph">영상 주소를 입력하세요</div>'}</section>`; }
    case 'map': return `<section class="wrap"><h2>${esc(d.title)}</h2><div class="cols"><div><b>주소</b><small>${esc(d.addr)}</small></div><div><b>연락처</b><small>${esc(d.tel)}</small></div><div><b>운영 시간</b><small>${esc(d.hours)}</small></div></div></section>`;
    case 'notices': return `<section class="wrap"><h2>${esc(d.title)}</h2><ul class="list">${[...(S.notices || []), ...S.classes.flatMap(c => c.notices)].slice(0, +d.n || 3).map(n => `<li><span>${esc(n.title)}</span><small>${esc(n.at)}</small></li>`).join('') || '<li>등록된 공지가 없습니다.</li>'}</ul></section>`;
    case 'reviews': { const R = S.posts.filter(p => p.board === '수강후기' && !p.hidden); return `<section class="wrap"><h2>${esc(d.title)}</h2><div class="grid">${R.map(p => `<div class="cd rv"><b>${esc(p.title)}</b><small>${esc((M(p.who)?.name || '')[0] || '')}○○ · ${esc(p.at)}</small></div>`).join('') || `<p class="mini">수강후기 게시판에 등록된 후기가 이곳에 표시됩니다.</p>`}</div></section>`; }
    case 'code': return `<section class="wrap">${cleanHTML(d.html)}</section>`;
  } return ''; };
  const css = `*{box-sizing:border-box}body{margin:0;font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#212121;background:#fff;line-height:1.6}
  header{display:flex;align-items:center;gap:20px;padding:14px 24px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;flex-wrap:wrap}header b{font-size:18px;color:${s.color === '#00C53B' ? '#007200' : s.color}}nav{display:flex;gap:16px;flex-wrap:wrap}nav a{color:#4c4c4c;text-decoration:none;font-size:14px}nav a i{font-style:normal;font-size:11px;color:#999}header .lg{margin-left:auto;padding:7px 14px;border-radius:${tone.r};border:1px solid #d9d9d9;font-size:13px;color:#212121;text-decoration:none}
  .hero{background:${s.color};color:${on};padding:72px 24px;text-align:center}.hero h1{font-size:clamp(26px,5vw,44px);margin:0 0 10px;font-weight:${tone.f};letter-spacing:-.02em}.hero p{opacity:.92;max-width:640px;margin:0 auto 22px}.cta{display:inline-block;background:${on};color:${on === '#fff' ? s.color : '#fff'};padding:12px 26px;border-radius:${tone.r};font-weight:700;text-decoration:none}
  .sl .track{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory}.sl .track>div{min-width:100%;scroll-snap-align:start}.sl h2{margin:0;font-size:28px}
  .wrap{max-width:1080px;margin:0 auto;padding:48px 24px}h2{font-size:24px;letter-spacing:-.02em;margin:0 0 16px}.lead{color:#4c4c4c;max-width:720px}.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:18px}.cols>div{background:#fbfbfb;border:1px solid #eee;border-radius:${tone.r};padding:18px}.cols b,.cd b{display:block}.cols small,.cd small{color:#4c4c4c}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}.cd{border:1px solid #eee;border-radius:${tone.r};overflow:hidden;padding:0 0 14px}.cd .th{height:120px;background:linear-gradient(135deg,${s.color}33,${s.color}11)}.cd b,.cd small,.cd em{padding:0 14px}.cd b{margin-top:12px}.cd em{display:block;font-style:normal;font-weight:700;color:#007200;margin-top:6px}.cd.rv{padding:16px}.cd.rv b,.cd.rv small{padding:0}
  .ph{background:#f2f2f2;border-radius:${tone.r};height:260px;display:grid;place-items:center;color:#999}.ph.sm{height:140px;flex:1}.row{display:flex;gap:12px}.vid{position:relative}.vid img{width:100%;border-radius:${tone.r}}.vid span{position:absolute;inset:0;display:grid;place-items:center;font-size:48px;color:#fff}
  .list{list-style:none;padding:0;margin:0}.list li{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:12px 0}.mini{color:#888;font-size:13px}
  footer{background:#fbfbfb;border-top:1px solid #eee;padding:28px 24px;font-size:12px;color:#4c4c4c}footer div{max-width:1080px;margin:0 auto}
  @media(max-width:640px){.hero{padding:48px 18px}.wrap{padding:32px 16px}header{padding:12px 16px}}`;
  const nav = s.menus.filter(m => m.on).map(m => `<a href="#">${esc(m.l)}${m.access !== '공개' ? ` <i>(${esc(m.access)})</i>` : ''}</a>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(S.settings.seo.title || S.org.name)}</title>${full ? `<meta name="description" content="${esc(S.settings.seo.desc)}">` : ''}<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://i.ytimg.com data:; style-src 'unsafe-inline'"><style>${css}</style></head><body>
  <header><b>${esc(S.org.name)}</b><nav>${nav}</nav><a class="lg" href="#">로그인</a></header>${s.sections.map(sec).join('')}
  <footer><div>${esc(ft.company || S.org.name)} · 대표 ${esc(ft.ceo || '—')} · 사업자등록번호 ${esc(ft.biz || '—')} · 통신판매업 ${esc(ft.mail || '—')}<br>${esc(ft.addr || '주소 미입력')} · ${esc(ft.tel || '연락처 미입력')}${ft.reg ? ' · ' + esc(ft.reg) : ''}<br>이용약관 · 개인정보처리방침 · Powered by 디디쌤</div></footer></body></html>`;
}
