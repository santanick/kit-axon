/* 디디쌤 스튜디오 v15 — 기관 유형별 맞춤(고객 관점 QA 2026-11-02 반영)
   ① 공공기관 유형 신설(지자체 · 공공기관 인재개발원): 용어 · 메뉴 · 샘플 · 자동화 · 문서 · 홈페이지 · 학습자 사이트
   ② 유형별 용어 층: 대학 기준으로 쓰인 문구(교수 스튜디오 · 교과목 · 학생 · 학기 말 · 전공)를 기관 용어로 바꿔 보여 준다
   ③ 학습자 사이트 메뉴 이름 · 첫 화면을 유형별로(기업 = 교육과정 · 수료, 공공 · 평생 · 훈련 = 진단 없이 과정 중심, 학원 = 수업 · 숙제)
   ④ 운영 홈: 빌드 안내가 남은 대화 정리 · 중복 칩 숨김 · 담당자 호칭 · 운영 서버에서는 Claude 연결 버튼 숨김
   ⑤ 교수(강사) 스튜디오: 운영자 공간(현황 · 운영) 숨김
   ⑥ 보고서 내려받기: 기업 = 부서별 이수 현황, 대학 = 사업단 운영 실적, 공공 = 결재용 교육 실적(한글 · Word에서 열림)
   ⑦ 공공 도입 점검 카드(현황) — 실제로 갖춘 것과 확인이 필요한 것을 구분해 표시 */
'use strict';
/* ── ① 공공기관 유형 ── */
IC.public = '<path d="M3 21h18M5 21V11M19 21V11M9.5 21v-6M14.5 21v-6M2 11l10-6 10 6z"/>';
TYPES.public = { name: '공공기관', icon: 'public', desc: '공무원 · 직원 법정의무 · 직무교육, 기수 운영 · 실적 보고', ex: '지자체 · 공공기관 인재개발원' };
TERMS.public = { learner: '교육생', cls: '교육과정', group: '소속', teacher: '강사', done: '수료', site: '교육포털', fee: '교육비' };
PRESET.public = JSON.parse(JSON.stringify(PRESET.corp));
PRESET.public.off = PRESET.public.off.filter(x => x !== 'attend'); if (!PRESET.public.on.includes('attend')) PRESET.public.on.splice(1, 0, 'attend');
SAMPLE.public = { cls: [['신규 임용자 기본교육', 'period'], ['4대 폭력예방 통합교육', 'period', 'legal'], ['개인정보보호 교육', 'period', 'legal'], ['청렴 · 반부패 교육', 'period', 'legal'], ['생성형 AI 행정 활용', 'period'], ['적극행정 · 민원응대 실무', 'episode', '기수반']], grp: ['기획조정실', '행정지원과', '디지털정책과', '민원봉사과'], lv: ['기본', '실무', '전문'] };
{ const base = seed; seed = type => { const D = base(type); if (type !== 'public') return D;
  D.members.forEach((m, i) => { m.extra = { 소속: (D.groups.find(g => g.id === m.group) || {}).name || '', 직급: ['주무관', '주무관', '팀장', '과장'][i % 4] }; });
  D.classes.forEach(c => { c.price = 0; c.open = '지정 회원'; if (c.status === '준비중') c.status = '운영중'; }); D.pays = [];
  D.orgs = [{ id: 'o0', name: '산하기관 교육 담당', mgr: '기관 담당자', n: 14, done: 9, job: 0 }];
  Object.assign(D.settings, { join: '운영자 초대만', siteOpen: 'private', extraQ: ['소속', '직급'] }); return D; }; }
{ const base = defaultAutos; defaultAutos = type => base(type === 'public' ? 'corp' : type).map(a => type === 'public' ? JSON.parse(JSON.stringify(a).replace(/부서장/g, '소속 부서장').replace(/신규 입사자/g, '신규 임용자').replace(/입사/g, '임용')) : a); }
EX.public = ['법정의무교육 미이수자에게 마감 안내 보내줘', '소속별 이번 달 수료 현황 요약해줘', '신규 임용자 기본교육 커리큘럼 만들어줘', '교육 실적 보고서 만들어줘'];
EXQ.public = ['생성형 AI 행정 활용 6차시 과정 설계해줘', '법정의무교육 미이수 소속 3곳', '교육 실적 결재용 보고서 만들어줘', '매주 금요일 소속 부서장에게 수료 현황 보내는 자동화 만들어줘'];
ONB.public = ONB.corp.map(([id, l, d]) => [id, l.replace('사내 교육포털', '교육포털').replace('교육과정 준비', '교육과정 · 기수 준비'), d.replace('부서·직급', '소속·직급').replace('부서', '소속')]);
HERO.public = ['공직 역량, 필요한 교육을 한 곳에서', '법정의무교육부터 직무 · AI 행정 교육까지 수강하고 수료 실적을 관리합니다.', '교육과정 보기'];
LS_LEVELS.public = [['기본', '기본', '#1D4ED8', '공직자 기본 소양과 법정의무교육을 마칩니다.'], ['실무', '실무', '#0F766E', '직무 · 민원 · AI 행정 실무를 익힙니다.'], ['전문', '전문', '#15173B', '정책 기획 · 데이터 활용 역량을 갖춥니다.']];
LS_TYPES.public = [['ADM', '행정 · 기획', '#1D4ED8', '문서 · 보고'], ['SVC', '민원 · 소통', '#0F766E', '응대 · 안내'], ['DATA', '데이터 · AI', '#7C3AED', '분석 · 자동화'], ['LAW', '법정 · 윤리', '#B45309', '청렴 · 폭력예방'], ['LEAD', '리더십', '#15173B', '조직 · 성과']];
LS_TRACKS.public = [['공직 기본 트랙', 'BASIC TRACK', '#1D4ED8', '법정의무교육과 신규 임용자 기본교육을 기한 안에 마칩니다.', ['기본 · 법정의무교육', '실무 · 직무 기본', '수료 · 실적 반영'], '교육과정 보기'], ['AI 행정 트랙', 'AX TRACK', '#7C3AED', '생성형 AI로 문서 · 민원 · 데이터 업무를 바꿉니다.', ['기본 · AI 이해', '실무 · 내 업무 적용', '전문 · 부서 확산'], '트랙 시작하기']];
ALLT.push('public'); DTPL.forEach(d => { if ((d.types.includes('corp') || d.types.includes('lifelong')) && !d.types.includes('public')) d.types.push('public'); });
TPL.forEach(x => { if (x && Array.isArray(x.types) && x.types.includes('corp') && !x.types.includes('public')) x.types.push('public'); });
{ const base = postSeed; postSeed = (...a) => { const r = base(...a); try { if (S.org.type === 'public' && S.site && Array.isArray(S.site.menus)) S.site.menus.forEach(m => { if (Array.isArray(m)) { if (/교재|게시판/.test(m[0])) m[1] = false; } else if (m && /교재|게시판/.test(m.l || '')) m.on = false; }); /* v22 메뉴가 객체 형식이라 숨김이 적용되지 않던 문제 */ } catch (e) { } return r; }; }
{ const base = BRIEF; BRIEF = () => { const L = base(); if (S.org.type === 'public') { L.unshift({ k: 'legal', label: '법정의무교육 미이수', n: new Set(legalUndone().map(x => x.id)).size, q: '법정의무교육 미이수자에게 마감 안내 보내줘', unit: '명' }); return L.slice(0, 4); } return L; }; }
{ const base = lsHeroText; lsHeroText = ty => ty === 'public' ? ['교육포털', '공직 역량을\n키우는\n15분 학습', `${S.org.name} 교육생을 위한 법정의무 · 직무 · AI 행정 교육. 수강부터 수료증까지 한 곳에서 관리합니다.`] : base(ty); }

/* ── ③ 학습자 사이트: 유형별 메뉴 이름 · 진단 사용 여부 ── */
const SEG_PAGES = {
  corp: { diag: '역량 진단', tutorials: '직무 튜토리얼', courses: '교육과정', badges: '수료 · 배지' },
  public: { diag: null, tutorials: '학습 영상', courses: '교육과정', badges: '수료증' },
  lifelong: { diag: null, tutorials: '학습 영상', courses: '강좌', badges: '수료증' },
  voc: { diag: null, tutorials: '실습 영상', courses: '훈련과정', badges: '수료증' },
  k12: { diag: '레벨 테스트', tutorials: '보강 영상', courses: '수업 · 숙제', badges: '성취 배지' },
  adult: { diag: '레벨 진단', tutorials: '실습 영상', courses: '강좌', badges: '수료 · 배지' }
};
function segSite(L, ty) { const P = SEG_PAGES[ty]; if (!P || !L || !L.pages) return L;
  L.pages.forEach(p => { if (!(p.id in P)) return; if (P[p.id] === null) p.on = false; else p.name = P[p.id]; });
  const home0 = L.pages.find(p => p.id === 'home'); ((home0 && home0.sections) || []).forEach(x => { if (x.type === 'hero' && x.data.cta2) x.data.cta2 = `${P.tutorials} 먼저 둘러보기`; });
  if (P.diag === null) { const home = L.pages.find(p => p.id === 'home'); (home && home.sections || []).forEach(s => { if (s.type === 'diagtypes') s.on = false; if (s.type === 'hero') { s.data.cta1 = ''; s.data.cta2 = `${P.tutorials} 둘러보기`; } if (s.type === 'cta') { s.data.title = fixJosa(`${(TERMS[ty] || {}).cls || '과정'}을(를) 고르고 오늘 바로 시작하세요.`); s.data.cta = `${P.courses} 보기`; } }); }
  L.segV = 1; return L; }
{ const base = lsDefault; lsDefault = ty => segSite(base(ty), ty); }
{ const base = upgradeState; upgradeState = (...a) => { const r = base(...a); try { if (S && S.lsite && !S.lsite.segV) { segSite(S.lsite, S.org.type); S.lsite.segV = 1; } } catch (e) { console.error(e); } return r; }; }
/* 게시본: 기관 용어 전체 · 필수(법정)교육 표시 */
{ const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); r.terms = { ...(TERMS[S.org.type] || {}), ...(r.terms || {}) }; (r.classes || []).forEach(x => { const c = C(x.id); if (c && c.legal) x.legal = true; }); return r; }; }

/* ── ② 기관 용어 층 ── */
const SEG_JOSA = '(을|를|이|가|은|는|과|와|으로|로)?';
function segRules() { const ty = S && S.org && S.org.type; if (!ty || ty === 'univ' || !TERMS[ty]) return null; if (segRules.ty === ty) return segRules.R;
  const T = TERMS[ty]; const job = ['corp', 'public'].includes(ty) ? '직무' : '실무';
  const R = [['교수 스튜디오', `${T.teacher} 스튜디오`], ['교수님', `${T.teacher}님`], ['교수자', T.teacher], ['교과목', T.cls], ['학생 AI 튜터', `${T.learner} AI 튜터`], ['학생 질문', `${T.learner} 질문`], ['학생', T.learner], ['다음 학기', '다음 기수'], ['학기 말', '과정 종료 후'], ['전공', job]]
    .filter(([a, b]) => a !== b).map(([a, b]) => [new RegExp(a + SEG_JOSA, 'g'), b]);
  segRules.ty = ty; segRules.R = R; return R; }
const SEG_P = { 을: ['을', '를'], 를: ['을', '를'], 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'], 으로: ['으로', '로'], 로: ['으로', '로'] };
const segSwap = (s, R) => R.reduce((v, [re, b]) => v.replace(re, (m, p) => { if (!p) return b; const [a, c] = SEG_P[p]; return b + (hasBatchim(b.slice(-1), p === '으로' || p === '로') ? a : c); }), s);
function segDOM(root) { const R = segRules(); if (!R || !root) return; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('textarea,input,script,style,[contenteditable="true"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); let n;
  while ((n = w.nextNode())) { const v = n.nodeValue; if (!/교수|교과목|학생|학기|전공/.test(v)) continue; const x = segSwap(v, R); if (x !== v) n.nodeValue = x; } }
AFTER.push(() => segDOM(document.querySelector('#app')));
{ let q = 0; new MutationObserver(() => { clearTimeout(q); q = setTimeout(() => { segDOM(document.querySelector('#app')); document.querySelectorAll('.mwrap,#drawer,#toasts').forEach(segDOM); }, 20); }).observe(document.body, { childList: true, subtree: true }); }

/* ── ④ 운영 홈 · ⑤ 교수(강사) 스튜디오 ── */
const SEG_TITLE = { corp: 'HRD 담당자', univ: '센터 담당자', public: '교육 담당자', k12: '원장', adult: '원장', lifelong: '운영 담당자', voc: '훈련 담당자' };
AFTER.push(cur => { if (!S || !S.org) return; const T = typeof scn === 'function' && scn() === 'teacher'; document.body.classList.toggle('scn-t', !!T);
  const h = $('.hero2 h1'); if (h && /관리자님/.test(h.textContent)) h.innerHTML = h.innerHTML.replace('관리자님', esc(SEG_TITLE[S.org.type] || '담당자') + '님');
  if (!T && typeof bOn === 'function' && !bOn() && Array.isArray(S.chat) && S.chat.length && S.chat.every(m => m.role === 'ai' && /STEP \d+ · /.test(m.text || ''))) { S.chat = []; save(); setTimeout(render, 0); return; }
  const last = [...document.querySelectorAll('.msg.a')].pop(); const inMsg = new Set([...(last ? last.querySelectorAll('button') : [])].map(b => b.textContent.replace(/[✦\s]/g, '')));
  document.querySelectorAll('.bchips button, .chips button, .qchips button').forEach(b => { if (!b.closest('.msg')) b.style.display = inMsg.has(b.textContent.replace(/[✦\s]/g, '')) ? 'none' : ''; });
  if (typeof LIVE !== 'undefined' && LIVE.user) document.querySelectorAll('[data-act="cl-setup"].eng').forEach(b => { b.outerHTML = '<span class="eng on"><i></i>디디쌤 AI</span>'; });
});

/* ── ⑥ 보고서 내려받기(한글 · Word에서 열리는 .doc) ── */
const SEG_REP = { corp: '부서별 교육 이수 현황 보고', univ: '사업단 교육 운영 실적 보고(비교과 · 진단 · 배지)', public: '교육 운영 실적 보고(결재용)' };
function segReport() {
  const ty = S.org.type; const L = S.classes.filter(c => c.learners.length); const done = c => c.learners.filter(id => (c.prog[id]?.p || 0) >= (c.criteria?.threshold || 80)).length;
  const all = L.reduce((a, c) => a + c.learners.length, 0), fin = L.reduce((a, c) => a + done(c), 0); const avg = all ? Math.round(L.reduce((a, c) => a + c.learners.reduce((x, id) => x + (c.prog[id]?.p || 0), 0), 0) / all) : 0;
  const lg = S.classes.filter(c => c.legal); const lgAll = lg.reduce((a, c) => a + c.learners.length, 0), lgFin = lg.reduce((a, c) => a + c.learners.filter(id => (c.prog[id]?.p || 0) >= 100).length, 0);
  const grp = S.groups.map(g => { const ids = new Set(S.members.filter(m => m.group === g.id).map(m => m.id)); let n = 0, f = 0, p = 0; L.forEach(c => c.learners.filter(id => ids.has(id)).forEach(id => { n++; p += c.prog[id]?.p || 0; if ((c.prog[id]?.p || 0) >= (c.criteria?.threshold || 80)) f++; })); return [g.name, ids.size, n ? Math.round(p / n) : 0, f, n ? Math.round(f / n * 100) : 0]; });
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0; const title = SEG_REP[ty] || '교육 운영 현황 보고';
  const kpi = [[`${t('learner')} 수`, S.members.length + '명'], [`운영 ${t('cls')}`, L.length + '개'], ['평균 진도', avg + '%'], [`${t('done')}율`, pct(fin, all) + '%'],
    ...(lg.length ? [['법정의무교육 이수율', pct(lgFin, lgAll) + '%']] : []), ...(ty === 'univ' ? [['디지털 배지 발급', (S.badges || []).reduce((a, b) => a + (b.issued || []).length, 0) + '건'], ['AI 진단 완료', S.members.filter(m => m.diag).length + '명']] : [])];
  const tb = (h, rows) => `<table><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${esc(String(x))}</td>`).join('')}</tr>`).join('')}</table>`;
  const sign = ty === 'public' ? '<table class="sg"><tr><th>담당</th><th>팀장</th><th>과장</th></tr><tr><td></td><td></td><td></td></tr></table>' : '';
  const html = `<html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:10.5pt;color:#111;margin:20mm}h1{font-size:17pt;border-bottom:3px solid #15173B;padding-bottom:6px;margin:0 0 4px}h2{font-size:12pt;border-left:5px solid #D6246E;padding-left:8px;margin:18px 0 6px}p.m{color:#555;margin:0 0 10px}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #999;padding:5px 7px;text-align:center}th{background:#EEF0F6}table.sg{width:auto;margin-left:auto}table.sg td{height:42px;width:70px}</style></head><body>
${sign}<h1>${esc(title)}</h1><p class="m">${esc(S.org.name)} · ${esc(TYPES[ty].name)} · 작성일 ${today()} · 디디쌤 스튜디오 자동 집계</p>
<h2>1. 요약</h2>${tb(['지표', '값'], kpi)}
<h2>2. ${esc(t('group'))}별 현황</h2>${tb([t('group'), '인원', '평균 진도(%)', `${t('done')} 인원`, `${t('done')}율(%)`], grp)}
<h2>3. ${esc(t('cls'))}별 현황</h2>${tb([t('cls'), '구분', '수강 인원', `${t('done')} 인원`, `${t('done')}율(%)`, '기간'], L.map(c => [c.name, c.legal ? '법정의무' : (c.kind === 'episode' ? '회차형' : '기간형'), c.learners.length, done(c), pct(done(c), c.learners.length), `${c.start} ~ ${c.end}`]))}
<h2>4. 특이사항 · 향후 계획</h2><p>${lg.length ? `법정의무교육 미이수 ${new Set(legalUndone().map(x => x.id)).size}명 — 마감 전 독려 안내 예정.<br>` : ''}진도 30% 미만 ${t('learner')}에게 독려 메시지를 발송하고, 다음 ${ty === 'univ' ? '학기' : '기수'} 운영에 반영합니다.</p>
<p class="m">※ 자동 집계 초안입니다. 담당자가 검토 후 제출합니다.</p></body></html>`;
  const blob = new Blob(['﻿' + html], { type: 'application/msword' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title.replace(/[()·\s]+/g, '_')}_${S.org.name}_${today()}.doc`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  logAudit(`보고서 내려받기 — ${title}`); toast(`「${title}」을 내려받았습니다. 한글 · Word에서 열 수 있습니다.`, 'ok'); }
ACT['seg-report'] = () => segReport();
AFTER.push(() => { const k = $('[data-act="kpi-csv"]'); if (k && !$('[data-act="seg-report"]')) k.insertAdjacentHTML('afterend', `<button class="btn" data-act="seg-report">${ic('book', 16)} ${esc((SEG_REP[S.org.type] || '교육 운영 현황 보고').replace(/\(.*\)/, ''))} 내려받기</button>`); });
{ const base = answer; answer = (q, ...r) => { if (/(실적|이수 현황|결재).*(보고서)|보고서.*(내려받|다운|결재)/.test(q) && !/주간/.test(q)) { setTimeout(segReport, 50); return { text: `${SEG_REP[S.org.type] || '교육 운영 현황 보고'}를 지금 집계해 내려받습니다(한글 · Word에서 열리는 문서). 요약 · ${t('group')}별 · ${t('cls')}별 현황과 특이사항이 들어 있습니다.${S.org.type === 'public' ? ' 결재란(담당 · 팀장 · 과장)이 포함되어 있습니다.' : ''}` }; } return base(q, ...r); }; }

/* ── ⑦ 공공 도입 점검(현황) ── */
AFTER.push(cur => { if (!S || S.org.type !== 'public' || cur.ws !== 'dash' || $('#segPub')) return; const v = $('.bview') || $('main#main'); if (!v) return;
  const L = [['ok', '기관별 데이터룸 분리', '기관마다 저장 공간 · 키를 분리합니다.'], ['ok', '개인정보 최소 수집', '교육생 번호 · 소속만 저장, 이름은 기관 SSO 연동 시에만 표시합니다.'], ['ok', '설치형 · 기관 클라우드 배포', '망분리 · 자체 서버 설치 키트를 제공합니다.'], ['ok', '교육 실적 결재용 보고서', '결재란이 있는 문서(한글 · Word)로 내려받습니다.'], ['wait', '웹 접근성(KWCAG 2.2) 자체 점검', '점검 결과서 준비 중'], ['wait', '클라우드 보안인증(CSAP)', '대상 여부 · 일정 확인 필요']];
  v.insertAdjacentHTML('beforeend', `<div class="card segpub" id="segPub"><div class="ch"><b>공공 도입 점검</b><small>조달 · 보안 심사에서 먼저 묻는 항목</small></div><ul>${L.map(([s, h, d]) => `<li class="${s}"><span>${s === 'ok' ? '갖춤' : '확인 필요'}</span><div><b>${h}</b><small>${d}</small></div></li>`).join('')}</ul></div>`); });
