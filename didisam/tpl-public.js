/* v34.5 tpl-public — 유형 디자이너 TP: public(공무원 교육원 · 지자체 시민 교육 · 공공기관 직원 포털 · 공공 디지털 배움터) 템플릿 재배치
   지시: fix6/BRIEF5.md · RULES_B2 '공공 교육원' 뼈대(기관 띠 → 첫 화면 → 공지 · 알림 → 바로가기 → 바닥글: 접근성 · 대표번호)
   - 원본(tpl-d.js)의 t4-* 18종을 id로 찾아 덮어쓴다(원본 파일은 고치지 않음). types[0]이 public인 것만 손댄다(공유 템플릿은 그 유형 디자이너 몫).
   - 템플릿마다: layout(HPL 계열, 같은 계열 최대 2) · theme · palette(HPC, 서로 다름) · photos(HPSTOCK id, 첫 화면 사진 서로 다름) · hps(머리글 · 바닥글)
     · 계열 없는 템플릿은 S3 첫 화면 banner.data.hk(scrim · box · split · grid) · 신청 띠 data.ck(photo · panel · contact)
     · 섹션 순서(order): 업종에 맞게 다시 배치(공지를 위로 올리는 포털 · 게시판형, 신청 흐름이 먼저인 시민 교육형 등)
   - siteFromTpl 감싸기: 내 템플릿(types[0] === 'public' && tp.tpP)에만 layout · photos(→ site.img[slot], 샘플 표시 stock 유지) · hps를 넣는다.
   - 사실 원칙: 숫자 · 후기 · 연락처는 실제 데이터만(원본과 같음). 단계 이름이 '숫자 + 배…'로 읽혀 지어낸 숫자로 오인되는 것('1 배우기')은 이름을 바꾼다.
   - 원 · 링 장식 deco(t4-green의 원형 아이콘 등)는 걷어낸다. */
'use strict';
(() => {
  if (typeof TPL === 'undefined' || typeof siteFromTpl !== 'function') return;
  const A = v => Array.isArray(v) ? v : [];
  /* 섹션 열쇠: banner · classes · notices · reviews · map · stats(실제 숫자) · features · steps · info · timeline · roadmap · cta … */
  const keyOf = x => !x ? '' : x.type === 'text' ? (x.data && x.data.hpt === 'facts' ? 'stats' : (x.data && x.data.variant) || 'plain') : x.type;

  /* 템플릿별 설정
     L: 계열(없으면 S3 첫 화면) · th: 테마 · pal: 팔레트 · ph: 사진 [hero, about, space, cta] · hd: [머리글, 바닥글, 휴대폰 메뉴]
     hk: S3 첫 화면 · ck: 신청 띠 · vmap: 글 섹션 변형 바꾸기(계열과 맞지 않는 변형) · add: [[이 열쇠 앞에, 섹션]] 끼워 넣기 · ord: 섹션 순서(열쇠 목록, 빠진 섹션은 뒤에 원래 순서대로) · ren: 글 바꾸기 [옛 글, 새 글] */
  const CFG = {
    /* 공무원 교육원: 포털(찾기 상자 · 공지 패널 · 빠른 메뉴) — 국내 교육원 표준 */
    't4-hrd-inst': { L: 'portal', th: 'official', pal: 'harbor', ph: ['lec-02', 'stu-02', 'lec-01', 'lib-05'], hd: ['contact', 'biz', 'full'], ck: 'contact', ord: ['banner', 'notices', 'features', 'classes', 'stats', 'steps', 'cta'] },
    /* 공공기관 직원 포털: 왼쪽 고정 내비게이션 */
    't4-agency': { L: 'sidebar', th: 'clean', pal: 'slate', ph: ['off-01', 'dsk-03', 'off-05', 'arc-02'], hd: ['solid', 'cols', 'drawer'], ck: 'panel', ord: ['banner', 'classes', 'features', 'notices', 'steps', 'stats', 'cta'] },
    /* 사이버 연수원: 벤토(나의 강의실 · 배정 과정 · 숫자 칸) */
    't4-cyber': { L: 'bento', th: 'tech', pal: 'graphite', ph: ['lap-08', 'cod-03', 'off-06', 'dsk-05'], hd: ['float', 'mega', 'drawer'], ck: 'contact', ord: ['banner', 'classes', 'steps', 'notices', 'features', 'stats', 'cta'],
      ren: [['배정 과정 확인', '내 과정 열기']],
      add: [['notices', { type: 'text', data: { variant: 'info', eyebrow: 'FAQ', title: '학습 중 자주 묻는 질문', cols: [['배정된 과정이 보이지 않아요?', '기관 계정으로 로그인했는지 확인하고, 그래도 없으면 교육 담당 부서에 배정을 요청하세요.'], ['영상이 끝까지 재생됐는데 이수가 안 돼요?', '퀴즈 · 설문까지 마쳐야 이수로 처리됩니다. 나의 강의실에서 남은 항목을 확인하세요.'], ['수료증은 어디서 받나요?', '이수한 과정은 교육이력에서 수료증을 바로 내려받을 수 있습니다.']] } }]] },
    /* 법정의무교육: 게시판형(KRDS 분위기 · 마감 공지 우선) */
    't4-legal': { L: 'bulletin', th: 'official', pal: 'nuri', ph: ['lec-01', 'dsk-01', 'sem-01', 'lib-02'], hd: ['notice', 'biz', 'full'], ck: 'panel', ord: ['banner', 'notices', 'features', 'info', 'classes', 'cta'] },
    /* 신규 임용자: 이야기 · 단계형(로드맵이 주인공) */
    't4-newhire': { L: 'story', th: 'campus', pal: 'ivy', ph: ['cls-01', 'dsk-02', 'cls-04', 'lib-06'], hd: ['solid', 'cta', 'full'], ck: 'photo', ord: ['banner', 'roadmap', 'features', 'classes', 'notices', 'cta'] },
    /* AI 행정: 어두운 프리미엄(코드 화면) */
    't4-ai-gov': { L: 'noir', th: 'tech', pal: 'circuit', vmap: { timeline: 'steps' }, ph: ['cod-01', 'cod-04', 'lec-03', 'cod-02'], hd: ['overlay', 'mega', 'full'], ck: 'photo', ord: ['banner', 'features', 'steps', 'classes', 'stats', 'notices', 'cta'] },
    /* 시민대학: 매거진형(명조 큰 제목 · 도서관 라운지) */
    't4-civic': { L: 'editorial', th: 'campus', pal: 'maple', ph: ['lib-01', 'lib-03', 'sem-01', 'lib-05'], hd: ['solid', 'min', 'full'], ck: 'panel', ord: ['banner', 'features', 'classes', 'reviews', 'info', 'notices', 'map'] },
    /* 시민 디지털 배움터: S3 좌우 분할 · 큰 글씨 */
    't4-digital': { th: 'senior', pal: 'bigblue', hk: 'split', ph: ['lap-02', 'lap-07', 'cls-02', 'lib-04'], hd: ['contact', 'cols', 'full'], ck: 'contact', ord: ['banner', 'features', 'steps', 'classes', 'notices', 'map'] },
    /* 찾아가는 교육: S3 전면 사진 + 스크림 */
    't4-outreach': { th: 'warm', pal: 'brick', hk: 'scrim', ph: ['sem-01', 'off-04', 'lec-03', 'mus-07'], hd: ['overlay', 'cta', 'drawer'], ck: 'photo', ord: ['banner', 'steps', 'features', 'reviews', 'classes', 'cta'] },
    /* 간부 리더십: 좌우 분할(어두운 판 + 사진) */
    't4-leader': { L: 'splitscreen', th: 'premium', pal: 'boardroom', ph: ['off-02', 'lib-06', 'off-04', 'off-07'], hd: ['solid', 'cols', 'drawer'], ck: 'panel', ord: ['banner', 'features', 'classes', 'timeline', 'notices', 'cta'] },
    /* 민원 응대: 전체 화면 사진(도서관 서가) */
    't4-service': { L: 'fullbleed', th: 'clean', pal: 'civic', ph: ['lib-03', 'off-05', 'lib-02', 'sen-03'], hd: ['overlay', 'cta', 'full'], ck: 'photo', ord: ['banner', 'features', 'steps', 'classes', 'reviews', 'notices', 'cta'] },
    /* 안전 · 재난: 좌우 분할(진한 판 + 항공 사진, 훈련 공지 우선) */
    't4-safety': { L: 'splitscreen', th: 'official', pal: 'dancheong', ph: ['cam-05', 'wrk-03', 'lec-02', 'arc-03'], hd: ['notice', 'cols', 'full'], ck: 'contact', ord: ['banner', 'notices', 'steps', 'features', 'classes', 'cta'] },
    /* 청렴 · 공직윤리: 큰 글자(사진 띠) */
    't4-integrity': { L: 'typo', th: 'campus', pal: 'press', ph: ['lib-02', 'lib-06', 'lib-03', 'mus-07'], hd: ['solid', 'mega', 'full'], ck: 'panel', ord: ['banner', 'info', 'features', 'classes', 'notices', 'cta'] },
    /* 청소년 진로: 콜라주(경쾌한 기울어진 카드) */
    't4-youth': { L: 'collage', th: 'kids', pal: 'berry', ph: ['lib-04', 'kid-02', 'cls-03', 'art-02'], hd: ['float', 'cta', 'drawer'], ck: 'photo', ord: ['banner', 'features', 'classes', 'steps', 'reviews', 'notices', 'cta'] },
    /* 가족 · 부모: 모자이크(사진 우선) */
    't4-family': { L: 'mosaic', th: 'warm', pal: 'rose', ph: ['nat-02', 'kid-05', 'sen-02', 'kid-03'], hd: ['float', 'mega', 'drawer'], ck: 'panel', ord: ['banner', 'features', 'classes', 'reviews', 'info', 'notices', 'map'] },
    /* 환경 · 탄소중립: 전체 화면 사진(정원) */
    't4-green': { L: 'fullbleed', th: 'campus', pal: 'bigforest', ph: ['nat-01', 'nat-03', 'off-03', 'wrk-06'], hd: ['overlay', 'cols', 'full'], ck: 'contact', ord: ['banner', 'steps', 'features', 'classes', 'notices', 'cta'],
      ren: [['배우기', '강의 듣기']], noDeco: 1 },
    /* 데이터 리터러시: S3 큰 제목 + 사진 3장 격자 */
    't4-data': { th: 'tech', pal: 'glacier', hk: 'grid', ph: ['lec-03', 'dsk-04', 'off-06', 'cod-04'], hd: ['solid', 'biz', 'full'], ck: 'panel', ord: ['banner', 'stats', 'timeline', 'features', 'classes', 'notices', 'cta'] },
    /* 외국인 주민: S3 사진 + 겹친 글자 상자(다국어) */
    't4-newcomer': { th: 'clean', pal: 'lagoon', hk: 'box', ph: ['cls-04', 'brd-02', 'cls-02', 'lib-05'], hd: ['notice', 'min', 'full'], ck: 'panel', ord: ['banner', 'notices', 'steps', 'features', 'classes', 'map'] }
  };

  /* ── 템플릿 덮어쓰기 ── */
  const SLOT = ['hero', 'about', 'space', 'cta'];
  Object.keys(CFG).forEach(id => {
    const tp = TPL.find(t => t && t.id === id); if (!tp || A(tp.types)[0] !== 'public') return;
    const c = CFG[id]; const build0 = tp.build;
    tp.tpP = 1; tp.theme = c.th; tp.palette = c.pal;
    if (c.L) tp.layout = c.L; else delete tp.layout;
    tp.photos = {}; c.ph.forEach((p, i) => { if (p) tp.photos[SLOT[i]] = p; });
    tp.hps = { head: c.hd[0], foot: c.hd[1], mm: c.hd[2] };
    if (c.noDeco || c.L) delete tp.deco; /* 계열이 있으면 템플릿 장식 CSS(원 · 테두리)는 걷어낸다 */
    tp.build = () => {
      let L = A(build0());
      L.forEach(x => { if (!x || !x.data) return; const d = x.data;
        if (x.type === 'banner' && c.hk) d.hk = c.hk;
        if (c.vmap && x.type === 'text' && c.vmap[d.variant]) d.variant = c.vmap[d.variant];
        if (keyOf(x) === 'cta' && c.ck) d.ck = c.ck;
        if (c.ren && Array.isArray(d.cols)) d.cols = d.cols.map(r => Array.isArray(r) ? r.map(v => { let s = v; c.ren.forEach(([a, b]) => { if (s === a) s = b; }); return s; }) : r); });
      A(c.add).forEach(([at, sec]) => { const j = L.findIndex(x => keyOf(x) === at); const y = JSON.parse(JSON.stringify(sec)); y.id = typeof uid === 'function' ? uid('s') : 'tpp' + Math.random().toString(36).slice(2, 8); if (j < 0) L.push(y); else L.splice(j, 0, y); });
      if (c.ord) { const rank = k => { const i = c.ord.indexOf(k); return i < 0 ? 99 : i; };
        L = L.map((x, i) => [x, i]).sort((p, q) => (rank(keyOf(p[0])) - rank(keyOf(q[0]))) || (p[1] - q[1])).map(p => p[0]); }
      return L; };
  });

  /* ── siteFromTpl 감싸기: 내 템플릿에만 layout · photos · hps ── */
  { const base = siteFromTpl; const f = tp => { const s = base(tp);
      try {
        if (s && tp && tp.tpP && A(tp.types)[0] === 'public') {
          if (tp.layout && window.HPL && typeof HPL.apply === 'function' && HPL.fam && HPL.fam[tp.layout]) HPL.apply(s, tp.layout); else delete s.layout;
          if (tp.photos && window.HPSTOCK && typeof HPSTOCK.slotImg === 'function') { s.photos = Object.assign({}, tp.photos); s.img = s.img || {};
            Object.keys(tp.photos).forEach(sl => { if (s.img[sl] && s.img[sl].src) return; const v = HPSTOCK.slotImg(tp.photos[sl], sl); if (v) s.img[sl] = v; }); }
          if (tp.hps) s.hps = Object.assign({}, s.hps || {}, tp.hps);
        }
      } catch (e) { console.error('tpl-public siteFromTpl', e); }
      return s; };
    /* hpcolor의 가장 바깥 감싸기 표시(hpc)는 그대로 넘긴다 */
    if (base.hpc) f.hpc = base.hpc;
    siteFromTpl = f; window.siteFromTpl = f; }
})();
