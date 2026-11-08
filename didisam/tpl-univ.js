/* v34.5 tpl-univ — 유형 디자이너 TU: univ(대학 · 교수학습센터 · 비교과 · 학과 LMS) 템플릿 재배치
   지시: fix6/BRIEF5.md · RULES_B2 '대학 · 학과' 뼈대(사진 첫 화면 → 공지 · 학사일정 → 소식 · 프로그램 → 일정 → 바닥글) · RULES_P(해외 대학 실측)
   - 대상: types[0]이 'univ'인 템플릿 16종(global.js univ-* 4 · tpl-b t2-univ-* 12). 원본 파일은 고치지 않고 id로 찾아 덮어쓴다.
     solo-creator(types[0] adult)는 TA 몫이라 손대지 않는다.
   - 템플릿마다 계열(HPL 12종을 한 번씩) 또는 S3 첫 화면(scrim · box · split · grid 한 번씩)을 써서 16종의 첫 화면 구조가 모두 다르다.
     팔레트 16개 · 첫 화면 사진 16장이 모두 다르고, 테마 8종을 고르게 나눴다.
   - 학과 LMS(S.org.ed === 'lms') 기관도 같은 'univ' 묶음에서 고른다(tplFor(S.org.type)). LMS에 맞는 템플릿은 tp.eds에 'lms'를 넣고
     검색어(장면)에 '학과 LMS'를 붙여 검색으로도 찾게 한다.
   - 사실 원칙: 숫자는 hpt:'facts'(실제 공개 강좌로 셈)만 쓴다. univ-extra의 '운영 프로그램 3'(최소 3으로 올려 잡은 숫자)은 실제 숫자 띠로 바꾼다.
     단계 이름이 '숫자 + 배…'로 읽혀 지어낸 숫자로 오인되는 것('3 배치 시험')은 이름을 바꾼다.
   - tpl-b의 템플릿 장식 CSS(원 · 띠 · 물결 밑줄 등)는 내 템플릿에서 걷어낸다(siteHTML 출력에서 해당 주석 블록만 제거). */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  const ft = () => (S && S.settings && S.settings.footer) || {};
  /* 섹션 열쇠: banner · classes · notices · reviews · map · slideImage · slideBanner · stats(실제 숫자) · <text variant> */
  const keyOf = x => !x ? '' : x.type === 'text' ? (x.data && (x.data.hpt === 'facts' || x.data.variant === 'stats') ? 'stats' : (x.data && x.data.variant) || 'plain') : x.type;
  const T = (variant, data) => ({ type: 'text', data: Object.assign({ variant }, data) });
  const FACTS = () => T('stats', { hpt: 'facts', title: '', cols: [] });
  const NOTICE = (title, eyebrow) => ({ type: 'notices', data: { title, n: 4, eyebrow: eyebrow || 'NOTICE' } });
  const MAP = title => ({ type: 'map', data: { title, eyebrow: 'LOCATION', addr: ft().addr || '', tel: ft().tel || '', hours: '' } });

  /* 템플릿별 설정
     L: 계열(없으면 S3 첫 화면 hk) · th: 테마 · pal: 팔레트 · ph: 사진 [hero, about, space, cta, gallery] · hd: [머리글, 바닥글, 휴대폰 메뉴]
     ck: 신청 띠 · ord: 섹션 순서(열쇠) · add: [[이 열쇠 앞에(없으면 끝), 섹션 함수]] · drop: 뺄 열쇠 · ren: [옛 글, 새 글] · eds: 맞는 대학 도입 형태 */
  const CFG = {
    /* 교수학습개발센터: 기관 포털(찾기 · 공지 패널 · 빠른 메뉴) — 국내 대학 센터 표준 */
    't2-univ-ctl': { L: 'portal', th: 'campus', pal: 'nuri', ph: ['lec-01', 'dsk-03', 'lib-03', 'lib-05', 'lec-02'], hd: ['notice', 'cols', 'full'], ck: 'contact',
      ord: ['banner', 'notices', 'tiles', 'features', 'classes', 'steps', 'cta'] },
    /* 학과 온라인 강의실(LMS): 왼쪽 고정 내비게이션 — 강의실 · 과제 · 출석으로 바로 */
    'univ-lms': { L: 'sidebar', th: 'official', pal: 'slate', ph: ['lap-05', 'dsk-01', 'cls-01', 'lib-02', 'stu-01'], hd: ['solid', 'min', 'drawer'], ck: 'panel', eds: ['lms'],
      ord: ['banner', 'notices', 'modules', 'classes', 'timeline', 'info', 'cta'],
      add: [['classes', () => NOTICE('수업 공지')], ['cta', () => T('info', { eyebrow: 'FAQ', title: '수강 전에 확인하세요', cols: [['출석 인정', '차시 영상을 끝까지 보고 확인 퀴즈를 풀면 출석으로 기록됩니다'], ['과제 제출', '마감 시각 전까지 강의실에서 파일로 냅니다'], ['시험 응시', '공지된 시간에 강의실 시험 메뉴에서 응시합니다'], ['질문', '교과목 게시판에 남기면 담당 교수 · 조교가 답합니다']] })]] },
    /* 학과 홈페이지: 게시판형 신문 배치(학과 공지 · 학사 일정 우선) */
    't2-univ-dept': { L: 'bulletin', th: 'official', pal: 'oxford', ph: ['cam-04', 'dsk-02', 'lec-03', 'cam-02', 'lib-03'], hd: ['notice', 'biz', 'full'], ck: 'contact', eds: ['lms', 'lite'],
      ord: ['banner', 'notices', 'tiles', 'timeline', 'classes', 'info', 'cta'] },
    /* 교원 교수법 아카데미: 매거진(명조 큰 제목 · 대강당) */
    't2-univ-faculty': { L: 'editorial', th: 'premium', pal: 'bordeaux', ph: ['lec-02', 'lib-06', 'sem-01', 'mus-07', 'lib-02'], hd: ['solid', 'mega', 'full'], ck: 'panel',
      ord: ['banner', 'features', 'timeline', 'classes', 'info', 'notices', 'cta'] },
    /* 학습지원 · 튜터링: 사진 모자이크(함께 공부하는 손 · 노트) */
    't2-univ-tutor': { L: 'mosaic', th: 'warm', pal: 'maple', ph: ['lib-03', 'stu-02', 'dsk-01', 'lib-05', 'dsk-03'], hd: ['float', 'cta', 'drawer'], ck: 'photo',
      ord: ['banner', 'features', 'classes', 'steps', 'reviews', 'notices', 'cta'] },
    /* 글쓰기 · 발표 클리닉: 큰 글자(먹과 종이 · 노트 사진 띠) */
    't2-univ-writing': { L: 'typo', th: 'clean', pal: 'inkpaper', ph: ['lap-04', 'dsk-02', 'lib-01', 'dsk-05', 'dsk-03'], hd: ['solid', 'min', 'full'], ck: 'panel',
      ord: ['banner', 'features', 'info', 'steps', 'classes', 'reviews', 'notices', 'cta'], add: [['cta', () => NOTICE('클리닉 공지')]] },
    /* 진로 · 취업: 좌우 분할(진한 판 + 회의 테이블 사진) */
    't2-univ-career': { L: 'splitscreen', th: 'clean', pal: 'glacier', ph: ['off-02', 'off-04', 'off-05', 'off-07', 'dsk-04'], hd: ['contact', 'cols', 'drawer'], ck: 'contact',
      ord: ['banner', 'timeline', 'stats', 'features', 'classes', 'reviews', 'notices', 'cta'] },
    /* 창업교육센터: 어두운 프리미엄(코드 화면) */
    't2-univ-startup': { L: 'noir', th: 'tech', pal: 'midnight', ph: ['cod-01', 'dsk-04', 'cod-03', 'cod-04', 'off-06'], hd: ['overlay', 'mega', 'full'], ck: 'photo',
      ord: ['banner', 'steps', 'features', 'classes', 'timeline', 'notices', 'cta'] },
    /* 공개강좌: S3 큰 제목 + 사진 3장 격자 */
    't2-univ-mooc': { th: 'clean', pal: 'cobalt', hk: 'grid', ph: ['lec-03', 'lap-02', 'lib-01', 'lib-06', 'stu-01'], hd: ['solid', 'cols', 'full'], ck: 'panel', eds: ['lms', 'lite'],
      ord: ['banner', 'stats', 'classes', 'features', 'steps', 'reviews', 'cta'], add: [['cta', () => NOTICE('강좌 소식', 'NEWS')]] },
    /* 교양 AI · SW: 벤토 격자(강좌 · 숫자 · 사진 칸) */
    't2-univ-ai': { L: 'bento', th: 'tech', pal: 'graphite', ph: ['cod-02', 'cod-03', 'lap-10', 'cod-04', 'dsk-04'], hd: ['float', 'mega', 'drawer'], ck: 'contact', eds: ['lms', 'lite'],
      ord: ['banner', 'stats', 'steps', 'classes', 'features', 'notices', 'cta'] },
    /* 한국어 교육원 · 국제교류: 이야기 · 단계형(입학 절차가 주인공) */
    't2-univ-intl': { L: 'story', th: 'campus', pal: 'sky', ph: ['cam-03', 'cam-01', 'lib-01', 'lib-05', 'nat-02'], hd: ['solid', 'cta', 'full'], ck: 'photo',
      ord: ['banner', 'steps', 'features', 'classes', 'timeline', 'reviews', 'notices', 'cta'], add: [['cta', () => NOTICE('입학 · 학사 공지')]],
      ren: [['배치 시험', '수준 진단']] },
    /* 지역혁신 사업단: 전체 화면 사진(캠퍼스 항공) */
    't2-univ-rise': { L: 'fullbleed', th: 'campus', pal: 'ivy', ph: ['cam-05', 'nat-02', 'lec-02', 'cam-02', 'arc-03'], hd: ['overlay', 'cols', 'full'], ck: 'photo',
      ord: ['banner', 'features', 'tiles', 'classes', 'timeline', 'notices', 'cta'] },
    /* 대학 부설 평생교육원 · 학점은행: S3 사진 + 겹친 글자 상자 */
    't2-univ-cll': { th: 'campus', pal: 'crimson', hk: 'box', ph: ['lib-01', 'lib-06', 'lec-01', 'mus-07', 'cam-01'], hd: ['notice', 'biz', 'full'], ck: 'contact',
      ord: ['banner', 'notices', 'features', 'classes', 'info', 'reviews', 'map'] },
    /* 대학 AI 교육센터: S3 전면 사진 + 스크림(수식 칠판) */
    'univ-aicenter': { th: 'premium', pal: 'harbor', hk: 'scrim', ph: ['brd-01', 'cod-03', 'lec-03', 'cod-04', 'lap-04'], hd: ['overlay', 'cta', 'drawer'], ck: 'photo',
      ord: ['banner', 'steps', 'features', 'notices', 'classes', 'map'],
      add: [['features', () => T('steps', { eyebrow: 'LEARNING JOURNEY', title: '진단에서 배지까지', cols: [['AI 진단', '내 활용 유형을 확인합니다'], ['맞춤 코스', '유형에 맞는 튜토리얼을 듣습니다'], ['실습 과제', '배운 도구로 과제를 냅니다'], ['디지털 배지', '이수 기록이 배지로 남습니다']] })]] },
    /* 비교과 · 역량 포털: 콜라주(모집 중 프로그램 스티커 카드) */
    'univ-extra': { L: 'collage', th: 'kids', pal: 'coral', ph: ['lap-02', 'stu-02', 'cls-02', 'lib-05', 'dsk-03'], hd: ['float', 'cta', 'drawer'], ck: 'photo',
      ord: ['banner', 'slideBanner', 'classes', 'stats', 'features', 'timeline', 'notices'],
      rep: { stats: () => FACTS() } },
    /* 대학 시민 강좌: S3 좌우 분할(정원 산책로 · 큰 글씨) */
    'univ-lifelong': { th: 'senior', pal: 'sage', hk: 'split', ph: ['nat-02', 'lib-01', 'lec-01', 'lib-02', 'cam-03'], hd: ['contact', 'cols', 'full'], ck: 'contact',
      ord: ['banner', 'features', 'classes', 'notices', 'reviews', 'map'], add: [['reviews', () => NOTICE('수강 안내 · 공지')]] }
  };

  const SLOT = ['hero', 'about', 'space', 'cta', 'gallery'];
  const MINE = new Set();
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'univ') return;
    const c = CFG[id]; const build0 = tp.build; MINE.add(id);
    tp.tpU = 1; tp.theme = c.th; tp.palette = c.pal; tp.eds = c.eds || ['lite'];
    if (c.hk) tp.hero = ({ scrim: 'bg', box: 'band', split: 'split', grid: 'center' })[c.hk] || tp.hero;
    if (c.L) tp.layout = c.L; else delete tp.layout;
    tp.photos = {}; c.ph.forEach((p, i) => { if (p) tp.photos[SLOT[i]] = p; });
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    if (tp.eds.includes('lms') && !/학과 LMS/.test(tp.scene || '')) tp.scene = (tp.scene ? tp.scene + ' · ' : '') + '학과 LMS';
    delete tp.deco;
    tp.build = () => {
      let L = A(build0());
      if (c.rep) L = L.map(x => { const f = c.rep[keyOf(x)]; if (!f) return x; const y = f(); y.id = x.id; return y; });
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner') { if (c.hk) d.hk = c.hk; else delete d.hk; }
        if (keyOf(x) === 'cta' && c.ck) d.ck = c.ck;
        if (c.ren && Array.isArray(d.cols)) d.cols = d.cols.map(r => Array.isArray(r) ? r.map(v => { let s = v; c.ren.forEach(([a, b]) => { if (s === a) s = b; }); return s; }) : r); });
      A(c.add).forEach(([at, mk]) => { const y = mk(); y.id = typeof uid === 'function' ? uid('s') : 'tpu' + Math.random().toString(36).slice(2, 8);
        const j = L.findIndex(x => keyOf(x) === at); if (j < 0) L.push(y); else L.splice(j, 0, y); });
      if (c.ord) { const rank = k => { const i = c.ord.indexOf(k); return i < 0 ? 99 : i; };
        L = L.map((x, i) => [x, i]).sort((p, q) => (rank(keyOf(p[0])) - rank(keyOf(q[0]))) || (p[1] - q[1])).map(p => p[0]); }
      return L; };
  });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos(→ site.img[slot]) · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpU && MINE.has(tp.id)) {
          if (tp.layout && window.HPL && typeof HPL.apply === 'function' && HPL.fam && HPL.fam[tp.layout]) HPL.apply(s, tp.layout); else delete s.layout;
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const it = (HPSTOCK.get && HPSTOCK.get(tp.photos[sl])) || A(HPSTOCK.list).find(y => y.id === tp.photos[sl]); const v = it ? HPSTOCK.slotImg(it, sl) : null; if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-univ siteFromTpl', e); }
      return s; };
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }

  /* ── tpl-b 장식 CSS 걷어내기(내 템플릿만): tpl-b는 '/ * tpl-b <id> * /<css></style>' 형태로 붙인다 ── */
  if (typeof siteHTML === 'function') { const base = siteHTML; siteHTML = (s, full, lang) => { const h = base(s, full, lang);
      try { if (s && MINE.has(s.tpl) && /^t2-/.test(s.tpl) && window.TPL_B && typeof TPL_B.css === 'function') { const c = TPL_B.css(s.tpl); if (c) return h.split(`/* tpl-b ${s.tpl} */${c}`).join(''); } } catch (e) { console.error('tpl-univ css', e); }
      return h; }; window.siteHTML = siteHTML; }

  window.TPL_UNIV = { ids: [...MINE], cfg: CFG };
})();
